
from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class ResponseMetadata(BaseModel):
    source_citations: Dict[str, str] = Field(default_factory=dict)
    model_used: str = ""
    token_count: int = 0
    response_time_ms: float = 0.0
    relevance_score: float = 0.0
    tags: List[str] = Field(default_factory=list)
    processing_steps: List[str] = Field(default_factory=list)

class GenerateResponseResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    response: Optional[str] = None
    metadata: Optional[ResponseMetadata] = None
    is_final: bool = True

class DocumentChunk(BaseModel):
    id: str
    content: str
    source: str
    relevance_score: float
    metadata: Dict[str, str] = Field(default_factory=dict)

class ProcessDocumentResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    document_id: Optional[str] = None
    chunks_created: int = 0

class SearchDocumentsResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    documents: List[DocumentChunk] = Field(default_factory=list)