
import uvicorn
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from core.config import settings
from api.chat import router as chat_router
from services.ollama_service import ollama_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    if await ollama_service.check_health():
        print("Ollama service is OK")
        
        print("Preloading LLaMA model...")
        try:
            preload_result = await ollama_service.generate_response("Hello", model=settings.OLLAMA_MODEL)
            if preload_result["success"]:
                print("Model OK")
            else:
                print(f"Model load errror: {preload_result.get('error', 'Unknown error')}")
        except Exception as e:
            print(f"Model loading failed: {str(e)}")
    else:
        print("Ollama mmodel is not available")
    yield

    print("Server cannot start without Ollama service")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="A full-stack AI chatbot powered by LLaMA via Ollama with real-time streaming",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.VERSION,
        "status": "running",
        "features": [
            "Real-time AI chat streaming",
            "Conversation memory",
            "Multiple model support",
            "Production-ready API"
        ],
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "chat": "/api/chat/send",
            "streaming": "/api/chat/stream",
            "test_stream": "/api/chat/stream/test"
        }
    }


@app.get("/health")
async def app_health():

    ollama_healthy = await ollama_service.check_health()
    models_info = await ollama_service.get_available_models()
    return {
        "status": "healthy" if ollama_healthy else "degraded",
        "services": {
            "api": True,
            "ollama": ollama_healthy,
            "streaming": True
        },
        "version": settings.VERSION,
        "current_model": settings.OLLAMA_MODEL,
        "available_models": models_info.get("models", []) if models_info.get("success") else [],
        "features": {
            "chat": True,
            "streaming": True,
            "conversation_memory": True,
            "multi_model": True
        }
    }


@app.get("/models")
async def get_models():
    models_info = await ollama_service.get_available_models()
    
    if models_info["success"]:
        return {
            "success": True,
            "current_model": settings.OLLAMA_MODEL,
            "available_models": models_info["models"],
            "count": len(models_info["models"])
        }
    else:
        raise HTTPException(
            status_code=503,
            detail=f"Could not fetch models: {models_info['error']}"
        )


@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "message": "The requested endpoint does not exist",
            "available_endpoints": [
                "/docs - API Documentation",
                "/health - Application health check",
                "/models - Available AI models",
                "/api/chat/send - Send chat message (complete response)",
                "/api/chat/stream - Send chat message (streaming response)",
                "/api/chat/stream/test - Test streaming functionality",
                "/api/chat/health - Chat service health check",
                "/api/chat/conversations - List conversations"
            ],
        },
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "support": "Check logs for more details"
        },
    )


@app.middleware("http")
async def log_requests(request, call_next):
    import time
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    if process_time > 1.0:
        print(f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s")
    
    return response


if __name__ == "__main__":
    uvicorn.run(
        "main:app",  
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
    )











