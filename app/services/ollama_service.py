import aiohttp
import asyncio
import json
from typing import Dict, Any, Optional, AsyncGenerator
from app.core.config import settings

class OllamaService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
    
    async def stream_response_in_realtime(self, prompt: str, context: Optional[str] = None, model: Optional[str] = None) -> AsyncGenerator[Dict[str, Any], None]:

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
                    "num_ctx": 2048,
                    "num_predict": 512
                }
            }
            
            print(f"Starting streaming for: {prompt[:50]}...")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        yield {
                            "type": "error",
                            "content": f"Ollama API error: {response.status}",
                            "details": error_text,
                            "done": True
                        }
                        return
                    
                    full_response = ""
                    token_count = 0
                    
                    async for line in response.content:
                        if line:
                            try:
                                line_text = line.decode('utf-8').strip()
                                if line_text:
                                    chunk = json.loads(line_text)
                                    
                                    if 'response' in chunk and chunk['response']:
                                        token = chunk['response']
                                        full_response += token
                                        token_count += 1
                                        
                                        print(f"Token {token_count}: '{token}'")  
                                        
                                        yield {
                                            "type": "token",
                                            "content": token,
                                            "full_response": full_response,
                                            "token_count": token_count,
                                            "done": False
                                        }
                                        
                                    if chunk.get('done', False):
                                        print(f"Stream complete! Generated {token_count} tokens")
                                        yield {
                                            "type": "complete",
                                            "content": full_response,
                                            "token_count": token_count,
                                            "done": True,
                                            "metadata": {
                                                "model": model_to_use,
                                                "total_duration": chunk.get('total_duration', 0),
                                                "eval_count": chunk.get('eval_count', 0)
                                            }
                                        }
                                        break
                                        
                            except json.JSONDecodeError:
                                continue 
                            except Exception as e:
                                print(f"Error processing chunk: {e}")
                                continue
                
        except Exception as e:
            print(f"Streaming error: {e}")
            yield {
                "type": "error",
                "content": f"Streaming error: {str(e)}",
                "done": True
            }
   
    
    async def generate_response(self, prompt: str, context: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:

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
                    "num_predict": 512
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "response": result.get("response", ""),
                            "model": model_to_use,
                            "total_duration": result.get("total_duration", 0),
                            "eval_count": result.get("eval_count", 0)
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Ollama API error: {response.status}",
                            "details": error_text
                        }
                
        except Exception as e:
            return {
                "success": False,
                "error": "Unexpected error",
                "details": str(e)
            }
    
    
    async def check_health(self) -> bool:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/tags", 
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    return response.status == 200
        except Exception:
            return False
    
    
    async def get_available_models(self) -> Dict[str, Any]:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/tags",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "models": result.get("models", [])
                        }
                    else:
                        return {
                            "success": False,
                            "error": "Failed to fetch models"
                        }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }




ollama_service = OllamaService()




