from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime
from app.services.ollama_service import ollama_service
from core.config import settings
from fastapi.responses import StreamingResponse
import json
import asyncio



router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = datetime.now()

class ChatRequest(BaseModel):
    model : str
    stream : bool 
    message: str
    conversation_id: Optional[str] = None
    context: Optional[str] = None

class ChatResponse(BaseModel):
    success: bool
    conversation_id: str
    response: str
    model_info: Optional[dict] = None
    error: Optional[str] = None

class ConversationHistory(BaseModel):
    conversation_id: str
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime

# laterr will be replaced with a proper database, with redis cachingg
conversations_store = {}

# @router.post("/send", response_model=ChatResponse)
# async def send_message(request: ChatRequest):
#     try:
#         print(f"Received message: {request}")
#         conversation_id = request.conversation_id or str(uuid.uuid4())
        
#         if conversation_id not in conversations_store:
#             conversations_store[conversation_id] = {
#                 "messages": [],
#                 "created_at": datetime.now(),
#                 "updated_at": datetime.now()
#             }
        
#         conversation = conversations_store[conversation_id]
        
#         user_message = ChatMessage(role="user", content=request.message)
#         conversation["messages"].append(user_message)
        
#         context = ""
#         if len(conversation["messages"]) > 1:
#             recent_messages = conversation["messages"][-5:]  # 5 messages for context
#             context = "\n".join([
#                 f"{msg.role}: {msg.content}" 
#                 for msg in recent_messages[:-1]  
#             ])
        
#         ai_result = await ollama_service.generate_response(
#             prompt=request.message,
#             context=context or request.context,
#             model=request.model if request.model else settings.OLLAMA_MODEL
#         )
        
#         if not ai_result["success"]:
#             raise HTTPException(
#                 status_code=500,
#                 detail=f"AI service error: {ai_result['error']}"
#             )
        
#         ai_message = ChatMessage(
#             role="assistant", 
#             content=ai_result["response"]
#         )
#         conversation["messages"].append(ai_message)
#         conversation["updated_at"] = datetime.now()
        
#         return ChatResponse(
#             success=True,
#             conversation_id=conversation_id,
#             response=ai_result["response"],
#             model_info={
#                 "model": ai_result.get("model"),
#                 "total_duration": ai_result.get("total_duration", 0),
#                 "eval_count": ai_result.get("eval_count", 0)
#             }
#         )
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Unexpected error: {str(e)}"
#         )

@router.get("/conversations/{conversation_id}", response_model=ConversationHistory)
async def get_conversation(conversation_id: str):

    if conversation_id not in conversations_store:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )
    
    conversation = conversations_store[conversation_id]
    return ConversationHistory(
        conversation_id=conversation_id,
        messages=conversation["messages"],
        created_at=conversation["created_at"],
        updated_at=conversation["updated_at"]
    )

@router.get("/conversations")
async def list_conversations():

    return {
        "conversations": [
            {
                "conversation_id": conv_id,
                "message_count": len(conv["messages"]),
                "created_at": conv["created_at"],
                "updated_at": conv["updated_at"],
                "last_message": conv["messages"][-1].content if conv["messages"] else None
            }
            for conv_id, conv in conversations_store.items()
        ]
    }

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):

    if conversation_id not in conversations_store:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )
    
    del conversations_store[conversation_id]
    return {"success": True, "message": "Conversation deleted"}

@router.get("/health")
async def health_check():

    ollama_healthy = await ollama_service.check_health()
    
    return {
        "status": "healthy" if ollama_healthy else "unhealthy",
        "ollama_service": ollama_healthy,
        "active_conversations": len(conversations_store),
        "timestamp": datetime.now()
    }

@router.post("/stream")
async def stream_chat_real(request: ChatRequest):

    async def generate_real_stream():
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        start_event = {
            "type": "start",
            "conversation_id": conversation_id,
            "message": "Starting AI streaming...",
            "timestamp": datetime.now().isoformat()
        }
        yield f"data: {json.dumps(start_event)}\n\n"
        
        try:
            async for chunk in ollama_service.stream_response_in_realtime(
                prompt=request.message,
                context=request.context,
                model=request.model
            ):
                chunk["conversation_id"] = conversation_id
                chunk["timestamp"] = datetime.now().isoformat()
                
                yield f"data: {json.dumps(chunk)}\n\n"
                
                if chunk.get("done", False):
                    break
                    
        except Exception as e:
            error_event = {
                "type": "error",
                "content": f"Real streaming error: {str(e)}",
                "conversation_id": conversation_id,
                "done": True,
                "timestamp": datetime.now().isoformat()
            }
            yield f"data: {json.dumps(error_event)}\n\n"
    
    return StreamingResponse(
        generate_real_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "X-Accel-Buffering": "no"
        }
    )

