

import logging
import uuid
from typing import List, Dict, Any, Optional
import json
from sentence_transformers import SentenceTransformer
import numpy as np

from app.models.response import DocumentChunk
from app.core.config import settings

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self):
        self.embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        self.document_store: Dict[str, Dict[str, Any]] = {} 
        
    async def process_document(self, content: str, document_type: str, source: str, metadata: Dict[str, str]) -> Dict[str, Any]:
        try:
            document_id = str(uuid.uuid4())
            
            chunks = self._split_document(content)
            
            chunk_data = []
            for i, chunk in enumerate(chunks):
                chunk_id = f"{document_id}_chunk_{i}"
                embedding = self.embedding_model.encode(chunk)
                
                chunk_info = {
                    "id": chunk_id,
                    "content": chunk,
                    "source": source,
                    "document_id": document_id,
                    "document_type": document_type,
                    "embedding": embedding.tolist(),
                    "metadata": metadata,
                    "chunk_index": i
                }
                
                self.document_store[chunk_id] = chunk_info
                chunk_data.append(chunk_info)
            
            return {
                "document_id": document_id,
                "chunks_created": len(chunks)
            }
            
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            raise e

    async def search_relevant_documents(self, query: str, limit: int = 5, similarity_threshold: float = 0.7) -> List[DocumentChunk]:
        try:
            if not self.document_store:
                return []
                
            query_embedding = self.embedding_model.encode(query)
            
            similarities = []
            for chunk_id, chunk_data in self.document_store.items():
                chunk_embedding = np.array(chunk_data["embedding"])
                similarity = self._cosine_similarity(query_embedding, chunk_embedding)
                
                if similarity >= similarity_threshold:
                    similarities.append({
                        "chunk_id": chunk_id,
                        "similarity": similarity,
                        "chunk_data": chunk_data
                    })
            
            similarities.sort(key=lambda x: x["similarity"], reverse=True)
            similarities = similarities[:limit]
            
            result_chunks = []
            for sim in similarities:
                chunk_data = sim["chunk_data"]
                result_chunks.append(DocumentChunk(
                    id=chunk_data["id"],
                    content=chunk_data["content"],
                    source=chunk_data["source"],
                    relevance_score=sim["similarity"],
                    metadata=chunk_data["metadata"]
                ))
            
            return result_chunks
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []

    async def get_relevant_context(self, query: str) -> str:
        documents = await self.search_relevant_documents(query, limit=3)
        if not documents:
            return ""
        
        context_parts = []
        for doc in documents:
            context_parts.append(f"Source: {doc.source}\nContent: {doc.content}")
        
        return "\n\n".join(context_parts)

    def _split_document(self, content: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        if len(content) <= chunk_size:
            return [content]
        
        chunks = []
        start = 0
        
        while start < len(content):
            end = min(start + chunk_size, len(content))
            
            # Try to break at sentence boundary
            if end < len(content):
                last_period = content.rfind('.', start, end)
                if last_period > start:
                    end = last_period + 1
            
            chunk = content[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start position with overlap
            start = max(start + chunk_size - overlap, end)
            
            if start >= len(content):
                break
        
        return chunks

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
