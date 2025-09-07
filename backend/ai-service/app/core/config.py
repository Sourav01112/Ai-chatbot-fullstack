
from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PORT: int = 8000
    GRPC_PORT: int = 50053
    DEBUG: bool = True
    SERVICE_NAME: str = "ai-service"
    
    CORS_ORIGINS: List[str] = ["*"]
    
    OLLAMA_HOST: str = "http://localhost:11434"
    DEFAULT_MODEL: str = "llama2"
    DEFAULT_TEMPERATURE: float = 0.7
    DEFAULT_MAX_TOKENS: int = 2048
    
    ENABLE_RAG: bool = True
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    VECTOR_DIMENSION: int = 384
    
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL: int = 3600  # 1 hour
    
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    ELASTICSEARCH_INDEX: str = "chat_documents"
    
    LOG_LEVEL: str = "DEBUG"
    class Config:
        env_file = ".env"

settings = Settings()