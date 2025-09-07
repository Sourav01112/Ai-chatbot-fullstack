import asyncio
import logging
from typing import AsyncGenerator
import json
import httpx

from app.core.config import settings
from app.models.request import AISettings

logger = logging.getLogger(__name__)


print(settings.DEFAULT_MODEL)
class OllamaService:
    def __init__(self):
        self.base_url = settings.OLLAMA_HOST
        self.client = httpx.AsyncClient(timeout=60.0)

    async def generate_response(self, user_message: str, context: str, settings: AISettings) -> str:
        """Generate complete response from Ollama"""
        try:
            prompt = self._build_prompt(user_message, context, settings)
            
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": settings.ai_persona or settings.DEFAULT_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": settings.temperature,
                        "num_predict": settings.max_tokens,
                    }
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "Sorry, I couldn't generate a response.")
            else:
                logger.error(f"Ollama API error: {response.status_code}")
                return "Sorry, I'm having trouble connecting to the AI service."
                
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"

    async def generate_stream_response(self, user_message: str, context: str, settings: AISettings) -> AsyncGenerator[str, None]:
        """Generate streaming response from Ollama"""
        try:
            prompt = self._build_prompt(user_message, context, settings)
            print("settingg____________-",prompt )

            model_map = {
                "assistant": {
                    "model": "mistral:7b-instruct-v0.2-q4_K_M",
                    "temperature": 0.7,
                },
                "coding": {
                    "model": "codellama:7b-instruct", 
                    "temperature": 0.1, 
                },
                "creative": {
                    "model": "mistral:7b-instruct-v0.2-q4_K_M",
                    "temperature": 0.9,  
                }
            }
           

            model_config = model_map.get(settings.ai_persona)
            model_name = model_config["model"] if model_config else "mistral:7b-instruct-v0.2-q4_K_M"

            print("modellellelelelelle>>>>>>>>>>>", model_name)

            payload = {
                        "model": model_name,
                        "prompt": prompt,
                        "stream": True,
                        "options": {
                            "temperature": settings.temperature,
                            "num_predict": settings.max_tokens,
                        }
                    }       


            print("payloadd>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", payload)   
            
            async with self.client.stream(
                        "POST",
                        f"{self.base_url}/api/generate",
                        json=payload
                    ) as response:
                        if response.status_code == 200:
                            async for line in response.aiter_lines():
                                if line:
                                    try:
                                        chunk_data = json.loads(line)
                                        if "response" in chunk_data:
                                            yield chunk_data["response"]
                                        if chunk_data.get("done", False):
                                            break
                                    except json.JSONDecodeError:
                                        continue
                        else:
                            yield "Sorry, I'm having trouble connecting to the AI service."
                    
        except Exception as e:
            logger.error(f"Error in streaming response: {e}")
            yield f"I apologize, but I encountered an error: {str(e)}"



    def _build_prompt(self, user_message: str, context: str, settings: AISettings) -> str:
        """Build the prompt for Ollama"""
        prompt_parts = []
        
        if context:
            prompt_parts.append(f"Context:\n{context}\n")
        
        # Add persona instructions
        persona_instructions = self._get_persona_instructions(settings.ai_persona)
        if persona_instructions:
            prompt_parts.append(f"Instructions: {persona_instructions}\n")
        
        prompt_parts.append(f"User: {user_message}\n")
        prompt_parts.append("Assistant:")
        
        return "\n".join(prompt_parts)
    
    

    def _get_persona_instructions(self, persona: str) -> str:
        """Get instructions based on AI persona"""
        personas = {
            "assistant": "You are a helpful AI assistant. Provide clear, accurate, and helpful responses.",
            "creative": "You are a creative AI assistant. Be imaginative and think outside the box while being helpful.",
            "analytical": "You are an analytical AI assistant. Provide detailed, logical, and well-reasoned responses.",
            "friendly": "You are a friendly AI assistant. Be warm, approachable, and conversational in your responses.",
            "professional": "You are a professional AI assistant. Provide formal, precise, and business-appropriate responses."
        }
        return personas.get(persona, personas["assistant"])

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
