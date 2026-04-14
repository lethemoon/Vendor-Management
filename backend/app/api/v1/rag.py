from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_active_user
from app.services.rag_service import RAGService
from app.schemas.vector import (
    EmbedDocumentRequest,
    SearchRequest,
    SearchResult,
    RAGAnswerRequest,
    RAGAnswerResponse,
    DocumentChunkResponse
)

router = APIRouter(prefix="/api/v1/rag", tags=["rag"])


@router.post("/embed", response_model=List[DocumentChunkResponse])
def embed_document(
    request: EmbedDocumentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        rag_service = RAGService(db)
        chunks = rag_service.embed_document(
            document_id=request.document_id,
            knowledge_base_id=request.knowledge_base_id,
            text=request.text,
            metadata=request.metadata
        )
        return chunks
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to embed document: {str(e)}"
        )


@router.post("/embed/knowledge-base/{knowledge_base_id}")
def embed_knowledge_base(
    knowledge_base_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        rag_service = RAGService(db)
        total_chunks = rag_service.embed_knowledge_base(knowledge_base_id)
        return {"message": "Knowledge base embedded successfully", "total_chunks": total_chunks}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to embed knowledge base: {str(e)}"
        )


@router.post("/search", response_model=List[SearchResult])
def search_similar(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        rag_service = RAGService(db)
        results = rag_service.search_similar(
            query=request.query,
            top_k=request.top_k,
            knowledge_base_id=request.knowledge_base_id
        )
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.post("/answer", response_model=RAGAnswerResponse)
def generate_answer(
    request: RAGAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        rag_service = RAGService(db)
        answer_data = rag_service.generate_answer_with_context(
            query=request.query,
            top_k=request.top_k,
            knowledge_base_id=request.knowledge_base_id
        )
        return RAGAnswerResponse(**answer_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate answer: {str(e)}"
        )


@router.delete("/chunks/document/{document_id}")
def delete_document_chunks(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        rag_service = RAGService(db)
        deleted_count = rag_service.delete_chunks_by_document(document_id)
        return {"message": "Chunks deleted successfully", "deleted_count": deleted_count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete chunks: {str(e)}"
        )


@router.delete("/chunks/knowledge-base/{knowledge_base_id}")
def delete_knowledge_base_chunks(
    knowledge_base_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        rag_service = RAGService(db)
        deleted_count = rag_service.delete_chunks_by_knowledge_base(knowledge_base_id)
        return {"message": "Chunks deleted successfully", "deleted_count": deleted_count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete chunks: {str(e)}"
        )
