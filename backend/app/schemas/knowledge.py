from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List, Any, Dict
from app.models.knowledge import KnowledgeStatus, KnowledgeType, PermissionLevel


# ==================== 项目相关 Schema ====================

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: bool = True


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProjectWithPhases(ProjectResponse):
    phases: List['PhaseResponse'] = []


# ==================== 阶段相关 Schema ====================

class PhaseBase(BaseModel):
    project_id: int
    name: str = Field(..., min_length=1, max_length=255)
    order: int = 0
    description: Optional[str] = None
    is_active: bool = True


class PhaseCreate(PhaseBase):
    pass


class PhaseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    order: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PhaseResponse(PhaseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== 分类相关 Schema ====================

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


# ==================== 标签相关 Schema ====================

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


# ==================== 附件相关 Schema ====================

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


# ==================== 知识库相关 Schema ====================

class KnowledgeBaseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: Optional[str] = None
    summary: Optional[str] = None
    type: KnowledgeType = KnowledgeType.ARTICLE
    status: KnowledgeStatus = KnowledgeStatus.DRAFT
    permission_level: PermissionLevel = PermissionLevel.INTERNAL
    category_id: Optional[int] = None
    project_id: Optional[int] = None
    phase_id: Optional[int] = None
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
    permission_level: Optional[PermissionLevel] = None
    category_id: Optional[int] = None
    project_id: Optional[int] = None
    phase_id: Optional[int] = None
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
    project: Optional[ProjectResponse] = None
    phase: Optional[PhaseResponse] = None
    tags: List[KnowledgeTagResponse] = []
    attachments: List[KnowledgeAttachmentResponse] = []


# ==================== 文档目录结构 Schema ====================

class DirectoryNode(BaseModel):
    """目录节点，用于展示按项目/阶段/供应商组织的文档结构"""
    type: str  # "project", "phase", "supplier", "knowledge"
    id: Optional[int] = None
    name: str
    code: Optional[str] = None
    children: List['DirectoryNode'] = []
    knowledge_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== 搜索相关 Schema ====================

class KnowledgeSearchRequest(BaseModel):
    """知识库搜索请求"""
    query: str = Field(..., min_length=1, description="搜索关键词")
    tag_ids: Optional[List[int]] = Field(None, description="标签ID列表")
    project_id: Optional[int] = Field(None, description="项目ID")
    phase_id: Optional[int] = Field(None, description="阶段ID")
    supplier_id: Optional[int] = Field(None, description="供应商ID")
    type: Optional[KnowledgeType] = Field(None, description="文档类型")
    status: Optional[KnowledgeStatus] = Field(None, description="文档状态")


class KnowledgeSearchResponse(BaseModel):
    """知识库搜索响应"""
    total: int
    results: List[KnowledgeBaseWithRelations]


# ==================== 预览相关 Schema ====================

class DocumentPreviewResponse(BaseModel):
    """文档预览响应"""
    file_name: str
    mime_type: str
    file_size: int
    preview_url: Optional[str] = None
    content: Optional[str] = None  # 对于文本文件，直接返回内容
    can_preview: bool


# 循环引用解决
KnowledgeCategoryWithChildren.model_rebuild()
ProjectWithPhases.model_rebuild()
DirectoryNode.model_rebuild()
