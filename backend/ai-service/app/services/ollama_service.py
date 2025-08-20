import aiohttp
import asyncio
import json
import psutil
from typing import Dict, Any, Optional, AsyncGenerator
from app.core.config import settings

class OllamaService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
    
    async def stream_response_in_realtime(
        self, prompt: str, context: Optional[str] = None, model: Optional[str] = None, max_retries: int = 3
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream response with automatic retry on socket timeouts"""
        
        for attempt in range(max_retries):
            try:
                async for chunk in self.stream_main_func(prompt, context, model):
                    yield chunk
                    # If we get a complete response, break out of retry loop
                    if chunk.get("done", False):
                        return
                        
            except Exception as e:
                error_str = str(e)
                is_socket_timeout = (
                    "Timeout on reading data from socket" in error_str or
                    "timeout" in error_str.lower() or
                    "connection" in error_str.lower()
                )
                
                if is_socket_timeout and attempt < max_retries - 1:
                    print(f"Socket timeout on attempt {attempt + 1}, retrying in 2 seconds...")
                    yield {
                        "type": "retry",
                        "content": f"Connection timeout, retrying... (attempt {attempt + 2}/{max_retries})",
                        "done": False
                    }
                    await asyncio.sleep(2)
                    continue
                else:
                    # If it's not a socket timeout or we've exhausted retries
                    yield {
                        "type": "error",
                        "content": f"Failed after {attempt + 1} attempts: {error_str}",
                        "done": True
                    }
                    return
    
    async def stream_main_func(
        self, prompt: str, context: Optional[str] = None, model: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:

        try:
            full_prompt = prompt
            if context:
                full_prompt = f"Context: {context}\n\nUser: {prompt}\n\nAssistant:"

            model_to_use = model or self.model

            payload = {
                "model": model_to_use,
                "prompt": full_prompt,
                "stream": True,
                "keep_alive": "10m",
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_ctx": 4096,  # Increase context window
                    "num_predict": 256,  # Reduce max tokens to prevent memory issues
                    "num_thread": 4,  # Limit CPU threads
                    "num_gpu_layers": -1,  # If you have a GPU
                },
            }

            print(f"Starting streaming for: {prompt[:50]}...")
            
            # Monitor memory usage
            try:
                process = psutil.Process()
                initial_memory = process.memory_info().rss / 1024 / 1024
                print(f"Memory usage before streaming: {initial_memory:.1f} MB")
            except:
                print("Could not get memory info")

            # Create session with custom connector for better connection handling
            connector = aiohttp.TCPConnector(
                limit=10,
                limit_per_host=5,
                ttl_dns_cache=300,
                use_dns_cache=True,
                keepalive_timeout=300,  # Keep connections alive longer
                enable_cleanup_closed=True,
                force_close=False,  # Don't force close connections
                # tcp_nodelay=True,  # Disable Nagle's algorithm for faster streaming
            )

            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(
                        total=600,  # Much higher total timeout
                        sock_read=60,  # Longer socket read timeout
                        sock_connect=30  # Longer connection timeout
                    ),
                    headers={
                        'Connection': 'keep-alive',
                        'Keep-Alive': 'timeout=300, max=1000'
                    },
                ) as response:

                    if response.status != 200:
                        error_text = await response.text()
                        print(f"HTTP Error {response.status}: {error_text}")
                        yield {
                            "type": "error",
                            "content": f"Ollama API error: {response.status}",
                            "details": error_text,
                            "done": True,
                        }
                        return

                    full_response = ""
                    token_count = 0
                    buffer = ""  # Buffer for incomplete JSON lines
                    last_activity = asyncio.get_event_loop().time()
                    
                    try:
                        # Use chunked reading with smaller chunks for better stability
                        chunk_size = 512  # Smaller chunks
                        read_timeout = 45  # Timeout for each chunk read
                        
                        async for chunk in response.content.iter_chunked(chunk_size):
                            if chunk:
                                current_time = asyncio.get_event_loop().time()
                                last_activity = current_time
                                
                                try:
                                    # Decode chunk and add to buffer
                                    chunk_text = chunk.decode('utf-8')
                                    buffer += chunk_text
                                    
                                    # Split buffer into lines
                                    lines = buffer.split('\n')
                                    # Keep the last (potentially incomplete) line in buffer
                                    buffer = lines[-1] if lines else ""
                                    
                                    # Process complete lines
                                    for line in lines[:-1]:
                                        line = line.strip()
                                        if line:
                                            try:
                                                chunk_data = json.loads(line)
                                                
                                                # Handle error in chunk
                                                if 'error' in chunk_data:
                                                    print(f"Ollama error: {chunk_data['error']}")
                                                    yield {
                                                        "type": "error",
                                                        "content": f"Ollama error: {chunk_data['error']}",
                                                        "done": True,
                                                    }
                                                    return

                                                # Handle token response
                                                if "response" in chunk_data and chunk_data["response"]:
                                                    token = chunk_data["response"]
                                                    full_response += token
                                                    token_count += 1

                                                    print(f"Token {token_count}: '{token}'")

                                                    yield {
                                                        "type": "token",
                                                        "content": token,
                                                        "full_response": full_response,
                                                        "token_count": token_count,
                                                        "done": False,
                                                    }
                                                    
                                                    # Add small delay every 25 tokens to prevent overwhelming
                                                    if token_count % 25 == 0:
                                                        await asyncio.sleep(0.02)  # Slightly longer delay
                                                        
                                                        # Check memory usage periodically
                                                        try:
                                                            current_memory = process.memory_info().rss / 1024 / 1024
                                                            if current_memory > initial_memory + 500:  # If memory increased by 500MB
                                                                print(f"High memory usage detected: {current_memory:.1f} MB")
                                                        except:
                                                            pass

                                                # Handle completion
                                                if chunk_data.get("done", False):
                                                    print(f"Stream complete! Generated {token_count} tokens")
                                                    
                                                    # Final memory check
                                                    try:
                                                        final_memory = process.memory_info().rss / 1024 / 1024
                                                        print(f"Final memory usage: {final_memory:.1f} MB")
                                                    except:
                                                        pass
                                                    
                                                    yield {
                                                        "type": "complete",
                                                        "content": full_response,
                                                        "token_count": token_count,
                                                        "done": True,
                                                        "metadata": {
                                                            "model": model_to_use,
                                                            "total_duration": chunk_data.get("total_duration", 0),
                                                            "eval_count": chunk_data.get("eval_count", 0),
                                                            "prompt_eval_count": chunk_data.get("prompt_eval_count", 0),
                                                            "eval_duration": chunk_data.get("eval_duration", 0),
                                                        },
                                                    }
                                                    return

                                            except json.JSONDecodeError as je:
                                                print(f"JSON decode error: {je} for line: {line[:100]}...")
                                                continue
                                            except KeyError as ke:
                                                print(f"Key error in chunk: {ke}")
                                                continue

                                except UnicodeDecodeError as ue:
                                    print(f"Unicode decode error: {ue}")
                                    continue
                                except Exception as e:
                                    print(f"Error processing chunk: {e}")
                                    continue
                                
                            # Check for timeout (no activity for too long)
                            current_time = asyncio.get_event_loop().time()
                            if current_time - last_activity > 60:  # 60 seconds without activity
                                print("No activity for 60 seconds, considering timeout")
                                yield {
                                    "type": "error",
                                    "content": "Stream timeout: no activity for 60 seconds",
                                    "done": True,
                                }
                                return
                    
                    except asyncio.CancelledError:
                        print("Stream was cancelled")
                        yield {
                            "type": "error",
                            "content": "Stream was cancelled",
                            "done": True,
                        }
                        return
                    except Exception as e:
                        print(f"Error in streaming loop: {e}")
                        yield {
                            "type": "error",
                            "content": f"Streaming loop error: {str(e)}",
                            "done": True,
                        }
                        return

        except asyncio.TimeoutError:
            print("Request timed out")
            yield {
                "type": "error",
                "content": "Request timed out - try reducing num_predict or increasing timeout",
                "done": True,
            }
        except aiohttp.ClientError as ce:
            print(f"Client error: {ce}")
            yield {
                "type": "error",
                "content": f"Connection error: {str(ce)}",
                "done": True,
            }
        except ConnectionError as ce:
            print(f"Connection error: {ce}")
            yield {
                "type": "error",
                "content": "Could not connect to Ollama server - is it running?",
                "done": True,
            }
        except Exception as e:
            print(f"Unexpected streaming error: {e}")
            yield {
                "type": "error",
                "content": f"Unexpected error: {str(e)}",
                "done": True,
            }
        finally:
            print("Stream processing completed")

    async def generate_response(
        self, prompt: str, context: Optional[str] = None, model: Optional[str] = None
    ) -> Dict[str, Any]:

        try:
            full_prompt = prompt
            if context:
                full_prompt = f"Context: {context}\n\nUser: {prompt}\n\nAssistant:"

            model_to_use = model or self.model

            payload = {
                "model": model_to_use,
                "prompt": full_prompt,
                "stream": False,  # Complete response
                "keep_alive": "10m",
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_ctx": 2048,
                    "num_predict": 512,
                },
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120),
                ) as response:

                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "response": result.get("response", ""),
                            "model": model_to_use,
                            "total_duration": result.get("total_duration", 0),
                            "eval_count": result.get("eval_count", 0),
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Ollama API error: {response.status}",
                            "details": error_text,
                        }

        except Exception as e:
            return {"success": False, "error": "Unexpected error", "details": str(e)}

    async def check_health(self) -> bool:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/tags", timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    return response.status == 200
        except Exception:
            return False

    async def get_available_models(self) -> Dict[str, Any]:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/tags", timeout=aiohttp.ClientTimeout(total=10)
                ) as response:

                    if response.status == 200:
                        result = await response.json()
                        return {"success": True, "models": result.get("models", [])}
                    else:
                        return {"success": False, "error": "Failed to fetch models"}
        except Exception as e:
            return {"success": False, "error": str(e)}


ollama_service = OllamaService()
