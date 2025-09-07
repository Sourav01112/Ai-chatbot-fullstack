from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

class MessageMetadata(BaseModel):
    source_citations: Dict[str, str] = Field(default_factory=dict)
    relevance_score: float = 0.0
    tags: List[str] = Field(default_factory=list)
    model_used: str = ""
    token_count: int = 0
    response_time_ms: float = 0.0
    processing_steps: List[str] = Field(default_factory=list)

class ConversationMessage(BaseModel):
    id: str
    content: str
    type: str  # user, assistant, system
    metadata: MessageMetadata
    created_at: datetime

class AISettings(BaseModel):
    ai_persona: str = "assistant"
    temperature: float = 0.7
    max_tokens: int = 2048
    enable_rag: bool = True
    document_sources: List[str] = Field(default_factory=list)
    system_prompt: str = ""

class GenerateResponseRequest(BaseModel):
    session_id: str
    user_id: str
    user_message: str
    conversation_history: List[ConversationMessage] = Field(default_factory=list)
    settings: AISettings = Field(default_factory=AISettings)















    

class ProcessDocumentRequest(BaseModel):
    document_content: str
    document_type: str
    document_source: str
    metadata: Dict[str, str] = Field(default_factory=dict)

class SearchDocumentsRequest(BaseModel):
    query: str
    limit: int = 5
    similarity_threshold: float = 0.7