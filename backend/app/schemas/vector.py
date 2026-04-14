from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class DocumentChunkBase(BaseModel):
    document_id: Optional[int] = None
    knowledge_base_id: Optional[int] = None
    chunk_text: str
    chunk_index: int
    metadata: Optional[Dict[str, Any]] = None


class DocumentChunkCreate(DocumentChunkBase):
    pass


class DocumentChunkResponse(DocumentChunkBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EmbedDocumentRequest(BaseModel):
    document_id: Optional[int] = None
    knowledge_base_id: Optional[int] = None
    text: str
    metadata: Optional[Dict[str, Any]] = None


class SearchRequest(BaseModel):
    query: str
    top_k: int = Field(5)
    knowledge_base_id: Optional[int] = None


class SearchResult(BaseModel):
    chunk_id: int
    text: str
    score: float
    document_id: Optional[int] = None
    knowledge_base_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class RAGAnswerRequest(BaseModel):
    query: str
    top_k: int = Field(5)
    knowledge_base_id: Optional[int] = None


class RAGAnswerResponse(BaseModel):
    query: str
    context: str
    sources: List[SearchResult]
    answer_prompt: str
