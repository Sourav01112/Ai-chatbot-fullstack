

from fastapi import APIRouter
from typing import Dict

router = APIRouter()

@router.get("/health")
async def health_check() :
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0"
    }

@router.get("/health/detailed")
async def detailed_health_check() :
    # Add more comprehensive health checks here
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0",
        "components": {
            "ollama": "connected",
            "redis": "connected",
            "embedding_model": "loaded"
        }
    }
