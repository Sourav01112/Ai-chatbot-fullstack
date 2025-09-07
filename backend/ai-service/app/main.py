from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import threading
import logging

from app.core.config import settings
from app.core.logging import setup_logging
from app.grpc.server import serve_grpc
from app.api.v1.router import api_router

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Service",
    description="AI Service for Chat Application",
    version="1.0.0",
    debug=settings.DEBUG
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}

@app.on_event("startup")
async def startup_event():
    logger.info("Starting AI Service...")
    
    grpc_thread = threading.Thread(target=lambda: asyncio.run(serve_grpc()))
    grpc_thread.daemon = True
    grpc_thread.start()
    
    logger.info(f"AI Service started on port {settings.PORT}")
    logger.info(f"gRPC server started on port {settings.GRPC_PORT}")