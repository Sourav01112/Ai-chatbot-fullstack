
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator
import json
import logging

from app.models.request import GenerateResponseRequest, ProcessDocumentRequest, SearchDocumentsRequest
from app.models.response import GenerateResponseResponse
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)
router = APIRouter()

# @router.post("/generate", response_model=GenerateResponseResponse)
# async def generate_response(request: GenerateResponseRequest):
#     """Generate AI response (non-streaming)"""
#     try:
#         ai_service = AIService()
#         response = await ai_service.generate_response(request)
#         return response
#     except Exception as e:
#         logger.error(f"Error in generate endpoint: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate/stream")
async def generate_stream_response(request: GenerateResponseRequest):
    """Generate streaming AI response"""
    try:
        ai_service = AIService()
        
        async def generate_stream():
            async for chunk in ai_service.generate_stream_response(request):
                yield f"data: {json.dumps(chunk.dict())}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain"
        )
    except Exception as e:
        logger.error(f"Error in stream endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# @router.post("/documents/process")
# async def process_document(request: ProcessDocumentRequest):
#     """Process document for RAG indexing"""
#     try:
#         ai_service = AIService()
#         response = await ai_service.process_document(request)
#         return response
#     except Exception as e:
#         logger.error(f"Error processing document: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/documents/search")
# async def search_documents(request: SearchDocumentsRequest):
#     """Search documents for RAG"""
#     try:
#         ai_service = AIService()
#         response = await ai_service.search_documents(request)
#         return response
#     except Exception as e:
#         logger.error(f"Error searching documents: {e}")
#         raise HTTPException(status_code=500, detail=str(e))
