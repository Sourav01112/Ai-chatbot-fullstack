
import asyncio
import logging
import time
from typing import AsyncGenerator
import uuid

from app.models.request import GenerateResponseRequest, ProcessDocumentRequest, SearchDocumentsRequest
from app.models.response import GenerateResponseResponse, ResponseMetadata, ProcessDocumentResponse, SearchDocumentsResponse
from app.services.ollama_service import OllamaService
from app.services.rag_service import RAGService
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.ollama_service = OllamaService()
        self.rag_service = RAGService()

    async def generate_response(self, request: GenerateResponseRequest) -> GenerateResponseResponse:
        try:
            start_time = time.time()
            
            context = await self._prepare_context(request)
            
            response_text = await self.ollama_service.generate_response(
                user_message=request.user_message,
                context=context,
                settings=request.settings
            )
            
            end_time = time.time()
            metadata = ResponseMetadata(
                model_used=request.settings.ai_persona or settings.DEFAULT_MODEL,
                token_count=len(response_text.split()), 
                response_time_ms=(end_time - start_time) * 1000,
                relevance_score=0.85,  
                tags=["generated"],
                processing_steps=["context_preparation", "response_generation"]
            )
            
            if request.settings.enable_rag:
                rag_results = await self.rag_service.search_relevant_documents(
                    query=request.user_message,
                    limit=3
                )
                if rag_results:
                    metadata.source_citations = {
                        doc.id: doc.source for doc in rag_results
                    }
                    metadata.processing_steps.append("rag_retrieval")
            
            return GenerateResponseResponse(
                success=True,
                response=response_text,
                metadata=metadata,
                is_final=True
            )
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return GenerateResponseResponse(
                success=False,
                error=str(e),
                is_final=True
            )

    async def generate_stream_response(self, request: GenerateResponseRequest) -> AsyncGenerator[GenerateResponseResponse, None]:
        try:
            start_time = time.time()
            
            context = await self._prepare_context(request)

            
            
            accumulated_response = ""
            async for chunk in self.ollama_service.generate_stream_response(
                user_message=request.user_message,
                context=context,
                settings=request.settings
            ):
                accumulated_response += chunk
                
                yield GenerateResponseResponse(
                    success=True,
                    response=chunk,
                    is_final=False
                )
            
            end_time = time.time()
            metadata = ResponseMetadata(
                model_used=request.settings.ai_persona or settings.DEFAULT_MODEL,
                token_count=len(accumulated_response.split()),
                response_time_ms=(end_time - start_time) * 1000,
                relevance_score=0.85,
                tags=["streamed"],
                processing_steps=["context_preparation", "streaming_generation"]
            )
            
            yield GenerateResponseResponse(
                success=True,
                response="",  
                metadata=metadata,
                is_final=True
            )
            
        except Exception as e:
            logger.error(f"Error in streaming response: {e}")
            yield GenerateResponseResponse(
                success=False,
                error=str(e),
                is_final=True
            )

    async def process_document(self, request: ProcessDocumentRequest) -> ProcessDocumentResponse:
        try:
            result = await self.rag_service.process_document(
                content=request.document_content,
                document_type=request.document_type,
                source=request.document_source,
                metadata=request.metadata
            )
            
            return ProcessDocumentResponse(
                success=True,
                document_id=result["document_id"],
                chunks_created=result["chunks_created"]
            )
            
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            return ProcessDocumentResponse(
                success=False,
                error=str(e)
            )

    async def search_documents(self, request: SearchDocumentsRequest) -> SearchDocumentsResponse:
        try:
            documents = await self.rag_service.search_relevant_documents(
                query=request.query,
                limit=request.limit,
                similarity_threshold=request.similarity_threshold
            )
            
            return SearchDocumentsResponse(
                success=True,
                documents=documents
            )
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return SearchDocumentsResponse(
                success=False,
                error=str(e)
            )

    async def _prepare_context(self, request: GenerateResponseRequest) -> str:
        context_parts = []
        
        if request.settings.system_prompt:
            context_parts.append(f"System: {request.settings.system_prompt}")
        
        for message in request.conversation_history[-10:]:  
            role = "User" if message.type == "user" else "Assistant"
            context_parts.append(f"{role}: {message.content}")
        
        if request.settings.enable_rag:
            rag_context = await self.rag_service.get_relevant_context(request.user_message)
            if rag_context:
                context_parts.append(f"Relevant Information: {rag_context}")
        
        return "\n\n".join(context_parts)