import logging
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer
import faiss

from app.models.vector import DocumentChunk
from app.models.knowledge import KnowledgeBase, KnowledgeAttachment

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self, db: Session):
        self.db = db
        self.embedding_model = None
        self.index = None
        self.chunk_ids = []
        self._initialize_model()

    def _initialize_model(self):
        try:
            self.embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")

    def _chunk_text(self, text: str, chunk_size: int = 500, chunk_overlap: int = 100) -> List[str]:
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = min(start + chunk_size, text_length)
            
            if end < text_length:
                last_period = text.rfind('.', start, end)
                last_newline = text.rfind('\n', start, end)
                split_pos = max(last_period, last_newline)
                if split_pos > start:
                    end = split_pos + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - chunk_overlap
        
        return chunks

    def embed_document(
        self, 
        document_id: Optional[int] = None,
        knowledge_base_id: Optional[int] = None,
        text: str = "",
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[DocumentChunk]:
        if not self.embedding_model:
            raise RuntimeError("Embedding model not initialized")
        
        chunks = self._chunk_text(text)
        document_chunks = []
        
        for idx, chunk_text in enumerate(chunks):
            embedding = self.embedding_model.encode(chunk_text).tolist()
            
            chunk = DocumentChunk(
                document_id=document_id,
                knowledge_base_id=knowledge_base_id,
                chunk_text=chunk_text,
                chunk_index=idx,
                embedding=embedding,
                chunk_metadata=metadata or {}
            )
            
            self.db.add(chunk)
            document_chunks.append(chunk)
        
        self.db.commit()
        logger.info(f"Embedded {len(document_chunks)} chunks for document")
        
        return document_chunks

    def embed_knowledge_base(self, knowledge_base_id: int) -> int:
        knowledge_base = self.db.query(KnowledgeBase).filter(
            KnowledgeBase.id == knowledge_base_id
        ).first()
        
        if not knowledge_base:
            raise ValueError("Knowledge base not found")
        
        total_chunks = 0
        
        if knowledge_base.content:
            chunks = self.embed_document(
                knowledge_base_id=knowledge_base_id,
                text=knowledge_base.content,
                metadata={"type": "knowledge_base", "title": knowledge_base.title}
            )
            total_chunks += len(chunks)
        
        attachments = self.db.query(KnowledgeAttachment).filter(
            KnowledgeAttachment.knowledge_base_id == knowledge_base_id
        ).all()
        
        for attachment in attachments:
            try:
                chunks = self.embed_document(
                    document_id=attachment.id,
                    knowledge_base_id=knowledge_base_id,
                    text=attachment.file_url or "",
                    metadata={"type": "attachment", "filename": attachment.filename}
                )
                total_chunks += len(chunks)
            except Exception as e:
                logger.error(f"Failed to embed attachment {attachment.id}: {e}")
        
        return total_chunks

    def search_similar(
        self, 
        query: str, 
        top_k: int = 5,
        knowledge_base_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        if not self.embedding_model:
            raise RuntimeError("Embedding model not initialized")
        
        query_embedding = self.embedding_model.encode(query)
        
        query_db = self.db.query(DocumentChunk)
        if knowledge_base_id:
            query_db = query_db.filter(
                DocumentChunk.knowledge_base_id == knowledge_base_id
            )
        
        all_chunks = query_db.all()
        
        if not all_chunks:
            return []
        
        embeddings = np.array([chunk.embedding for chunk in all_chunks if chunk.embedding])
        
        if len(embeddings) == 0:
            return []
        
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatIP(dimension)
        faiss.normalize_L2(embeddings)
        index.add(embeddings)
        
        query_embedding = query_embedding.reshape(1, -1)
        faiss.normalize_L2(query_embedding)
        
        scores, indices = index.search(query_embedding, min(top_k, len(all_chunks)))
        
        results = []
        for i, idx in enumerate(indices[0]):
            chunk = all_chunks[idx]
            results.append({
                "chunk_id": chunk.id,
                "text": chunk.chunk_text,
                "score": float(scores[0][i]),
                "document_id": chunk.document_id,
                "knowledge_base_id": chunk.knowledge_base_id,
                "metadata": chunk.chunk_metadata
            })
        
        return results

    def generate_answer_with_context(
        self,
        query: str,
        top_k: int = 5,
        knowledge_base_id: Optional[int] = None
    ) -> Dict[str, Any]:
        similar_chunks = self.search_similar(query, top_k, knowledge_base_id)
        
        context = "\n\n".join([
            f"[相关文档 {i+1}]:\n{chunk['text']}"
            for i, chunk in enumerate(similar_chunks)
        ])
        
        return {
            "query": query,
            "context": context,
            "sources": similar_chunks,
            "answer_prompt": self._build_answer_prompt(query, context)
        }

    def _build_answer_prompt(self, query: str, context: str) -> str:
        return f"""你是一位专业的顾问，请根据以下相关文档内容回答用户的问题。

相关文档内容：
{context}

用户问题：{query}

请基于提供的相关文档内容，给出专业、准确的回答。如果相关文档中没有足够信息来回答问题，请说明这一点。"""

    def delete_chunks_by_document(self, document_id: int) -> int:
        deleted = self.db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document_id
        ).delete()
        self.db.commit()
        return deleted

    def delete_chunks_by_knowledge_base(self, knowledge_base_id: int) -> int:
        deleted = self.db.query(DocumentChunk).filter(
            DocumentChunk.knowledge_base_id == knowledge_base_id
        ).delete()
        self.db.commit()
        return deleted
