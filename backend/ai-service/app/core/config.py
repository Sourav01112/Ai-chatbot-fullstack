import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Ai-chatbot"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    SECRET_KEY: str = "blah-blah-blah"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    OLLAMA_BASE_URL: str = "http://192.168.1.6:11434"
    OLLAMA_MODEL: str = "qwen3:14b"
    # OLLAMA_MODEL: str = "llama2:13b"
    
    
    DATABASE_URL: str = ""
    
    REDIS_URL: str = "redis://localhost:6379"
    
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()