from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List, Any, Dict
from app.models.knowledge import KnowledgeStatus, KnowledgeType


class KnowledgeCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: bool = True


class KnowledgeCategoryCreate(KnowledgeCategoryBase):
    pass


class KnowledgeCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None


class KnowledgeCategoryResponse(KnowledgeCategoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class KnowledgeCategoryWithChildren(KnowledgeCategoryResponse):
    children: List['KnowledgeCategoryResponse'] = []


class KnowledgeTagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    is_active: bool = True


class KnowledgeTagCreate(KnowledgeTagBase):
    pass


class KnowledgeTagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None


class KnowledgeTagResponse(KnowledgeTagBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class KnowledgeAttachmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    file_path: str = Field(..., min_length=1, max_length=500)
    file_size: Optional[int] = None
    mime_type: Optional[str] = None


class KnowledgeAttachmentCreate(KnowledgeAttachmentBase):
    pass


class KnowledgeAttachmentResponse(KnowledgeAttachmentBase):
    id: int
    knowledge_id: int
    uploaded_by_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KnowledgeBaseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: Optional[str] = None
    summary: Optional[str] = None
    type: KnowledgeType = KnowledgeType.ARTICLE
    status: KnowledgeStatus = KnowledgeStatus.DRAFT
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    survey_id: Optional[int] = None
    is_featured: bool = False
    is_active: bool = True
    meta_data: Optional[Dict[str, Any]] = None


class KnowledgeBaseCreate(KnowledgeBaseBase):
    tag_ids: Optional[List[int]] = None


class KnowledgeBaseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    summary: Optional[str] = None
    type: Optional[KnowledgeType] = None
    status: Optional[KnowledgeStatus] = None
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    survey_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    meta_data: Optional[Dict[str, Any]] = None


class KnowledgeBaseResponse(KnowledgeBaseBase):
    id: int
    author_id: Optional[int] = None
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class KnowledgeBaseWithRelations(KnowledgeBaseResponse):
    category: Optional[KnowledgeCategoryResponse] = None
    tags: List[KnowledgeTagResponse] = []
    attachments: List[KnowledgeAttachmentResponse] = []


# 循环引用解决
KnowledgeCategoryWithChildren.model_rebuild()
