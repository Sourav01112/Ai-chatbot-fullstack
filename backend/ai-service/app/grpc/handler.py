
import logging
import time
from typing import AsyncGenerator

from app.proto.generated import ai_service_pb2_grpc, ai_service_pb2
from app.services.ai_service import AIService
from app.models.request import GenerateResponseRequest, ProcessDocumentRequest, SearchDocumentsRequest
from app.models.response import GenerateResponseResponse

logger = logging.getLogger(__name__)

class AIServiceHandler(ai_service_pb2_grpc.AIServiceServicer):
    def __init__(self):
        self.ai_service = AIService()

    async def GenerateResponse(self, request, context):
        """Handle non-streaming response generation"""
        try:
            start_time = time.time()
            
            # Convert gRPC request to Pydantic model
            generate_request = self._convert_grpc_to_request(request)
            
            # Generate response
            response = await self.ai_service.generate_response(generate_request)
            
            # Convert back to gRPC response
            grpc_response = self._convert_response_to_grpc(response)
            
            logger.info(f"Generated response in {(time.time() - start_time) * 1000:.2f}ms")
            return grpc_response
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return ai_service_pb2.GenerateResponseResponse(
                success=False,
                error=str(e),
                is_final=True
            )

    async def GenerateStreamResponse(self, request, context):
        """Handle streaming response generation"""
        try:
            generate_request = self._convert_grpc_to_request(request)
            
            async for response_chunk in self.ai_service.generate_stream_response(generate_request):
                grpc_response = self._convert_response_to_grpc(response_chunk)
                yield grpc_response
                
        except Exception as e:
            logger.error(f"Error in streaming response: {e}")
            yield ai_service_pb2.GenerateResponseResponse(
                success=False,
                error=str(e),
                is_final=True
            )

    async def ProcessDocument(self, request, context):
        """Handle document processing for RAG"""
        try:
            process_request = ProcessDocumentRequest(
                document_content=request.document_content,
                document_type=request.document_type,
                document_source=request.document_source,
                metadata=dict(request.metadata)
            )
            
            response = await self.ai_service.process_document(process_request)
            
            return ai_service_pb2.ProcessDocumentResponse(
                success=response.success,
                error=response.error or "",
                document_id=response.document_id or "",
                chunks_created=response.chunks_created
            )
            
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            return ai_service_pb2.ProcessDocumentResponse(
                success=False,
                error=str(e)
            )

    async def SearchDocuments(self, request, context):
        """Handle document search for RAG"""
        try:
            search_request = SearchDocumentsRequest(
                query=request.query,
                limit=request.limit,
                similarity_threshold=request.similarity_threshold
            )
            
            response = await self.ai_service.search_documents(search_request)
            
            documents = []
            for doc in response.documents:
                documents.append(ai_service_pb2.DocumentChunk(
                    id=doc.id,
                    content=doc.content,
                    source=doc.source,
                    relevance_score=doc.relevance_score,
                    metadata=doc.metadata
                ))
            
            return ai_service_pb2.SearchDocumentsResponse(
                success=response.success,
                error=response.error or "",
                documents=documents
            )
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return ai_service_pb2.SearchDocumentsResponse(
                success=False,
                error=str(e)
            )

    def _convert_grpc_to_request(self, grpc_request) -> GenerateResponseRequest:
        """Convert gRPC request to Pydantic model"""
        from app.models.request import ConversationMessage, MessageMetadata, AISettings
        from datetime import datetime
        
        conversation_history = []
        for msg in grpc_request.conversation_history:
            metadata = MessageMetadata(
                source_citations=dict(msg.metadata.source_citations),
                relevance_score=msg.metadata.relevance_score,
                tags=list(msg.metadata.tags),
                model_used=msg.metadata.model_used,
                token_count=msg.metadata.token_count,
                response_time_ms=msg.metadata.response_time_ms,
                processing_steps=list(msg.metadata.processing_steps)
            )
            
            conversation_history.append(ConversationMessage(
                id=msg.id,
                content=msg.content,
                type=msg.type,
                metadata=metadata,
                created_at=datetime.fromisoformat(msg.created_at.replace('Z', '+00:00'))
            ))
        
        settings = AISettings(
            ai_persona=grpc_request.settings.ai_persona,
            temperature=grpc_request.settings.temperature,
            max_tokens=grpc_request.settings.max_tokens,
            enable_rag=grpc_request.settings.enable_rag,
            document_sources=list(grpc_request.settings.document_sources),
            system_prompt=grpc_request.settings.system_prompt
        )
        
        return GenerateResponseRequest(
            session_id=grpc_request.session_id,
            user_id=grpc_request.user_id,
            user_message=grpc_request.user_message,
            conversation_history=conversation_history,
            settings=settings
        )

    def _convert_response_to_grpc(self, response: GenerateResponseResponse):
        """Convert Pydantic response to gRPC"""
        metadata = None
        if response.metadata:
            metadata = ai_service_pb2.ResponseMetadata(
                source_citations=response.metadata.source_citations,
                model_used=response.metadata.model_used,
                token_count=response.metadata.token_count,
                response_time_ms=response.metadata.response_time_ms,
                relevance_score=response.metadata.relevance_score,
                tags=response.metadata.tags,
                processing_steps=response.metadata.processing_steps
            )
        
        return ai_service_pb2.GenerateResponseResponse(
            success=response.success,
            error=response.error or "",
            response=response.response or "",
            metadata=metadata,
            is_final=response.is_final
        )
