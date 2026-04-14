from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime, timezone
import os
import tempfile
import logging
from app.services.file_service import file_service

# 日志配置
logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.knowledge import (
    KnowledgeBase, KnowledgeStatus, KnowledgeType, KnowledgeCategory, 
    KnowledgeTag, KnowledgeAttachment, Project, Phase, PermissionLevel
)
from app.models.user import User, UserRole
from app.schemas.knowledge import (
    KnowledgeCategoryCreate,
    KnowledgeCategoryUpdate,
    KnowledgeCategoryResponse,
    KnowledgeCategoryWithChildren,
    KnowledgeTagCreate,
    KnowledgeTagUpdate,
    KnowledgeTagResponse,
    KnowledgeBaseCreate,
    KnowledgeBaseUpdate,
    KnowledgeBaseResponse,
    KnowledgeBaseWithRelations,
    KnowledgeAttachmentCreate,
    KnowledgeAttachmentResponse,
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectWithPhases,
    PhaseCreate,
    PhaseUpdate,
    PhaseResponse,
    DirectoryNode,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    DocumentPreviewResponse,
)
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge"])


# ==================== 分类管理 ====================

@router.get("/categories", response_model=List[KnowledgeCategoryResponse])
def list_knowledge_categories(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(KnowledgeCategory)
    
    if is_active is not None:
        query = query.filter(KnowledgeCategory.is_active == is_active)
    
    categories = query.offset(skip).limit(limit).all()
    return categories


@router.post("/categories", response_model=KnowledgeCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_knowledge_category(
    category_in: KnowledgeCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    existing_category = db.query(KnowledgeCategory).filter(
        KnowledgeCategory.name == category_in.name
    ).first()
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
    
    category = KnowledgeCategory(**category_in.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/categories/{category_id}", response_model=KnowledgeCategoryWithChildren)
def get_knowledge_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    category = db.query(KnowledgeCategory).filter(KnowledgeCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category


@router.put("/categories/{category_id}", response_model=KnowledgeCategoryResponse)
def update_knowledge_category(
    category_id: int,
    category_in: KnowledgeCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    category = db.query(KnowledgeCategory).filter(KnowledgeCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    if category_in.name and category_in.name != category.name:
        existing_category = db.query(KnowledgeCategory).filter(
            KnowledgeCategory.name == category_in.name
        ).first()
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists"
            )
    
    update_data = category_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    category = db.query(KnowledgeCategory).filter(KnowledgeCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # 检查是否有子分类
    child_count = db.query(KnowledgeCategory).filter(
        KnowledgeCategory.parent_id == category_id
    ).count()
    if child_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with children"
        )
    
    # 检查是否有关联的知识库
    knowledge_count = db.query(KnowledgeBase).filter(
        KnowledgeBase.category_id == category_id
    ).count()
    if knowledge_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with associated knowledge"
        )
    
    db.delete(category)
    db.commit()
    return None


# ==================== 标签管理 ====================

@router.get("/tags", response_model=List[KnowledgeTagResponse])
def list_knowledge_tags(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(KnowledgeTag)
    
    if is_active is not None:
        query = query.filter(KnowledgeTag.is_active == is_active)
    
    tags = query.offset(skip).limit(limit).all()
    return tags


@router.post("/tags", response_model=KnowledgeTagResponse, status_code=status.HTTP_201_CREATED)
def create_knowledge_tag(
    tag_in: KnowledgeTagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    existing_tag = db.query(KnowledgeTag).filter(
        KnowledgeTag.name == tag_in.name
    ).first()
    if existing_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag with this name already exists"
        )
    
    tag = KnowledgeTag(**tag_in.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.get("/tags/{tag_id}", response_model=KnowledgeTagResponse)
def get_knowledge_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    tag = db.query(KnowledgeTag).filter(KnowledgeTag.id == tag_id).first()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    return tag


@router.put("/tags/{tag_id}", response_model=KnowledgeTagResponse)
def update_knowledge_tag(
    tag_id: int,
    tag_in: KnowledgeTagUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    tag = db.query(KnowledgeTag).filter(KnowledgeTag.id == tag_id).first()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    
    if tag_in.name and tag_in.name != tag.name:
        existing_tag = db.query(KnowledgeTag).filter(
            KnowledgeTag.name == tag_in.name
        ).first()
        if existing_tag:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tag with this name already exists"
            )
    
    update_data = tag_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tag, field, value)
    
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    tag = db.query(KnowledgeTag).filter(KnowledgeTag.id == tag_id).first()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    
    db.delete(tag)
    db.commit()
    return None


# ==================== 知识库管理 ====================

@router.get("", response_model=List[KnowledgeBaseResponse])
def list_knowledge_bases(
    skip: int = 0,
    limit: int = 100,
    status: Optional[KnowledgeStatus] = None,
    type: Optional[KnowledgeType] = None,
    category_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    survey_id: Optional[int] = None,
    is_featured: Optional[bool] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(KnowledgeBase)
    
    if status is not None:
        query = query.filter(KnowledgeBase.status == status)
    if type is not None:
        query = query.filter(KnowledgeBase.type == type)
    if category_id is not None:
        query = query.filter(KnowledgeBase.category_id == category_id)
    if supplier_id is not None:
        query = query.filter(KnowledgeBase.supplier_id == supplier_id)
    if survey_id is not None:
        query = query.filter(KnowledgeBase.survey_id == survey_id)
    if is_featured is not None:
        query = query.filter(KnowledgeBase.is_featured == is_featured)
    if is_active is not None:
        query = query.filter(KnowledgeBase.is_active == is_active)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (KnowledgeBase.title.ilike(search_term)) |
            (KnowledgeBase.content.ilike(search_term)) |
            (KnowledgeBase.summary.ilike(search_term))
        )
    
    knowledge_bases = query.offset(skip).limit(limit).all()
    return knowledge_bases


@router.post("", response_model=KnowledgeBaseResponse, status_code=status.HTTP_201_CREATED)
def create_knowledge_base(
    knowledge_in: KnowledgeBaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    knowledge_data = knowledge_in.model_dump(exclude={"tag_ids"})
    knowledge = KnowledgeBase(
        **knowledge_data,
        author_id=current_user.id
    )
    
    if knowledge_in.tag_ids:
        tags = db.query(KnowledgeTag).filter(
            KnowledgeTag.id.in_(knowledge_in.tag_ids)
        ).all()
        knowledge.tags = tags
    
    db.add(knowledge)
    db.commit()
    db.refresh(knowledge)
    return knowledge


@router.get("/{knowledge_id}", response_model=KnowledgeBaseWithRelations)
def get_knowledge_base(
    knowledge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    knowledge = db.query(KnowledgeBase).filter(KnowledgeBase.id == knowledge_id).first()
    if not knowledge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge not found"
        )
    
    # 增加浏览次数
    knowledge.view_count += 1
    db.commit()
    db.refresh(knowledge)
    
    return knowledge


@router.put("/{knowledge_id}", response_model=KnowledgeBaseResponse)
def update_knowledge_base(
    knowledge_id: int,
    knowledge_in: KnowledgeBaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    knowledge = db.query(KnowledgeBase).filter(KnowledgeBase.id == knowledge_id).first()
    if not knowledge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge not found"
        )
    
    update_data = knowledge_in.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)
    
    for field, value in update_data.items():
        setattr(knowledge, field, value)
    
    if tag_ids is not None:
        tags = db.query(KnowledgeTag).filter(
            KnowledgeTag.id.in_(tag_ids)
        ).all()
        knowledge.tags = tags
    
    db.commit()
    db.refresh(knowledge)
    return knowledge


@router.delete("/{knowledge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_base(
    knowledge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    knowledge = db.query(KnowledgeBase).filter(KnowledgeBase.id == knowledge_id).first()
    if not knowledge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge not found"
        )
    
    db.delete(knowledge)
    db.commit()
    return None


@router.post("/{knowledge_id}/publish", response_model=KnowledgeBaseResponse)
def publish_knowledge_base(
    knowledge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    knowledge = db.query(KnowledgeBase).filter(KnowledgeBase.id == knowledge_id).first()
    if not knowledge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge not found"
        )
    
    if knowledge.status != KnowledgeStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft knowledge can be published"
        )
    
    knowledge.status = KnowledgeStatus.PUBLISHED
    knowledge.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(knowledge)
    return knowledge


# ==================== 附件管理 ====================

@router.get("/{knowledge_id}/attachments", response_model=List[KnowledgeAttachmentResponse])
def list_knowledge_attachments(
    knowledge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    knowledge = db.query(KnowledgeBase).filter(KnowledgeBase.id == knowledge_id).first()
    if not knowledge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge not found"
        )
    
    attachments = db.query(KnowledgeAttachment).filter(
        KnowledgeAttachment.knowledge_id == knowledge_id
    ).all()
    return attachments


@router.post("/{knowledge_id}/attachments", response_model=KnowledgeAttachmentResponse, status_code=status.HTTP_201_CREATED)
def add_knowledge_attachment(
    knowledge_id: int,
    attachment_in: KnowledgeAttachmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    knowledge = db.query(KnowledgeBase).filter(KnowledgeBase.id == knowledge_id).first()
    if not knowledge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge not found"
        )
    
    attachment = KnowledgeAttachment(
        **attachment_in.model_dump(),
        knowledge_id=knowledge_id,
        uploaded_by_id=current_user.id
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.delete("/{knowledge_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_attachment(
    knowledge_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    attachment = db.query(KnowledgeAttachment).filter(
        KnowledgeAttachment.id == attachment_id,
        KnowledgeAttachment.knowledge_id == knowledge_id
    ).first()
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )
    
    db.delete(attachment)
    db.commit()
    return None


@router.post("/{knowledge_id}/upload", response_model=KnowledgeAttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_attachment(
    knowledge_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """上传知识库附件"""
    logger.info(f"Received file upload request for knowledge {knowledge_id}: {file.filename}, size: {file.size}, content-type: {file.content_type}")
    
    # 检查知识库是否存在
    knowledge = db.query(KnowledgeBase).filter(KnowledgeBase.id == knowledge_id).first()
    if not knowledge:
        logger.warning(f"Knowledge not found: {knowledge_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge not found"
        )
    
    # 检查文件类型
    allowed_extensions = {'.xlsx', '.xls', '.md', '.ppt', '.pptx', '.pdf', '.doc', '.docx', '.xmind'}
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        logger.warning(f"Invalid file type: {file.filename}, extension: {file_extension}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed. Allowed types: Excel, Markdown, PPT, PDF, Word, XMind"
        )
    
    # 检查文件大小（限制为100MB）
    max_file_size = 100 * 1024 * 1024  # 100MB
    content = await file.read()
    file_size = len(content)
    if file_size > max_file_size:
        logger.warning(f"File too large: {file.filename}, size: {file_size}, max: {max_file_size}")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size: 100MB"
        )
    
    temp_file_path = None
    try:
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        logger.info(f"Created temporary file: {temp_file_path}")
        
        # 上传文件到 MinIO 或本地存储
        file_url = file_service.upload_file(temp_file_path, f"knowledge/{knowledge_id}/{file.filename}")
        if not file_url:
            logger.error(f"Failed to upload file: {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file"
            )
        
        logger.info(f"File uploaded successfully: {file.filename}, url: {file_url}")
        
        # 创建附件记录
        attachment = KnowledgeAttachment(
            knowledge_id=knowledge_id,
            name=file.filename,
            file_path=file_url,
            file_size=file_size,
            mime_type=file.content_type or "application/octet-stream",
            uploaded_by_id=current_user.id
        )
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
        
        logger.info(f"Attachment created successfully: {attachment.id}")
        return attachment
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Error uploading file: {file.filename}, error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )
    finally:
        # 清理临时文件
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.info(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                logger.error(f"Error cleaning up temp file: {e}")


# ==================== 项目管理 ====================

@router.get("/projects", response_model=List[ProjectResponse])
def list_projects(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Project)
    if is_active is not None:
        query = query.filter(Project.is_active == is_active)
    projects = query.offset(skip).limit(limit).all()
    return projects


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RESEARCHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create projects"
        )
    
    existing_project = db.query(Project).filter(Project.code == project_in.code).first()
    if existing_project:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project with this code already exists"
        )
    
    project = Project(**project_in.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/{project_id}", response_model=ProjectWithPhases)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project


@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RESEARCHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update projects"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    if project_in.code and project_in.code != project.code:
        existing_project = db.query(Project).filter(Project.code == project_in.code).first()
        if existing_project:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project with this code already exists"
            )
    
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete projects"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    db.delete(project)
    db.commit()
    return None


# ==================== 阶段管理 ====================

@router.get("/projects/{project_id}/phases", response_model=List[PhaseResponse])
def list_phases(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    phases = db.query(Phase).filter(Phase.project_id == project_id).order_by(Phase.order).all()
    return phases


@router.post("/projects/{project_id}/phases", response_model=PhaseResponse, status_code=status.HTTP_201_CREATED)
def create_phase(
    project_id: int,
    phase_in: PhaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RESEARCHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create phases"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    phase = Phase(**phase_in.model_dump(), project_id=project_id)
    db.add(phase)
    db.commit()
    db.refresh(phase)
    return phase


@router.put("/phases/{phase_id}", response_model=PhaseResponse)
def update_phase(
    phase_id: int,
    phase_in: PhaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RESEARCHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update phases"
        )
    
    phase = db.query(Phase).filter(Phase.id == phase_id).first()
    if not phase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phase not found"
        )
    
    update_data = phase_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(phase, field, value)
    
    db.commit()
    db.refresh(phase)
    return phase


@router.delete("/phases/{phase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_phase(
    phase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete phases"
        )
    
    phase = db.query(Phase).filter(Phase.id == phase_id).first()
    if not phase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phase not found"
        )
    
    db.delete(phase)
    db.commit()
    return None


# ==================== 文档目录结构 ====================

@router.get("/directory", response_model=List[DirectoryNode])
def get_directory_structure(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取按项目/阶段/供应商组织的文档目录结构"""
    root_nodes = []
    
    # 获取所有活跃项目
    projects = db.query(Project).filter(Project.is_active == True).all()
    
    for project in projects:
        project_node = DirectoryNode(
            type="project",
            id=project.id,
            name=project.name,
            code=project.code,
            children=[],
            knowledge_count=0
        )
        
        # 获取项目的阶段
        phases = db.query(Phase).filter(
            Phase.project_id == project.id,
            Phase.is_active == True
        ).order_by(Phase.order).all()
        
        for phase in phases:
            phase_node = DirectoryNode(
                type="phase",
                id=phase.id,
                name=phase.name,
                children=[],
                knowledge_count=0
            )
            
            # 获取该阶段的知识库文档（按供应商分组）
            knowledges = db.query(KnowledgeBase).filter(
                KnowledgeBase.project_id == project.id,
                KnowledgeBase.phase_id == phase.id,
                KnowledgeBase.is_active == True
            ).options(joinedload(KnowledgeBase.supplier)).all()
            
            # 按供应商分组
            supplier_groups = {}
            for knowledge in knowledges:
                # 检查权限
                if not file_service.check_permission(current_user, knowledge, "view"):
                    continue
                
                supplier_key = knowledge.supplier_id or "no_supplier"
                if supplier_key not in supplier_groups:
                    supplier_name = knowledge.supplier.name if knowledge.supplier else "未分类供应商"
                    supplier_groups[supplier_key] = DirectoryNode(
                        type="supplier",
                        id=knowledge.supplier_id,
                        name=supplier_name,
                        children=[],
                        knowledge_count=0
                    )
                
                # 添加知识节点
                knowledge_node = DirectoryNode(
                    type="knowledge",
                    id=knowledge.id,
                    name=knowledge.title,
                    children=[]
                )
                supplier_groups[supplier_key].children.append(knowledge_node)
                supplier_groups[supplier_key].knowledge_count += 1
                phase_node.knowledge_count += 1
                project_node.knowledge_count += 1
            
            # 添加供应商组到阶段节点
            phase_node.children.extend(supplier_groups.values())
            project_node.children.append(phase_node)
        
        root_nodes.append(project_node)
    
    return root_nodes


# ==================== 文档搜索 ====================

@router.get("/search", response_model=KnowledgeSearchResponse)
def search_knowledge(
    query: str = Query(..., min_length=1, description="搜索关键词"),
    tag_ids: Optional[List[int]] = Query(None, description="标签ID列表"),
    project_id: Optional[int] = Query(None, description="项目ID"),
    phase_id: Optional[int] = Query(None, description="阶段ID"),
    supplier_id: Optional[int] = Query(None, description="供应商ID"),
    type: Optional[KnowledgeType] = Query(None, description="文档类型"),
    status: Optional[KnowledgeStatus] = Query(None, description="文档状态"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """搜索知识库文档（按文件名、标签）"""
    search_term = f"%{query}%"
    
    # 构建查询
    base_query = db.query(KnowledgeBase).filter(
        or_(
            KnowledgeBase.title.ilike(search_term),
            KnowledgeBase.content.ilike(search_term),
            KnowledgeBase.summary.ilike(search_term)
        )
    )
    
    # 添加过滤条件
    if project_id:
        base_query = base_query.filter(KnowledgeBase.project_id == project_id)
    if phase_id:
        base_query = base_query.filter(KnowledgeBase.phase_id == phase_id)
    if supplier_id:
        base_query = base_query.filter(KnowledgeBase.supplier_id == supplier_id)
    if type:
        base_query = base_query.filter(KnowledgeBase.type == type)
    if status:
        base_query = base_query.filter(KnowledgeBase.status == status)
    
    # 获取结果并检查权限
    all_knowledges = base_query.options(
        joinedload(KnowledgeBase.category),
        joinedload(KnowledgeBase.project),
        joinedload(KnowledgeBase.phase),
        joinedload(KnowledgeBase.tags),
        joinedload(KnowledgeBase.attachments)
    ).all()
    
    # 过滤有权限的文档
    filtered_knowledges = [
        k for k in all_knowledges 
        if file_service.check_permission(current_user, k, "view")
    ]
    
    # 如果有标签过滤，再进行标签过滤
    if tag_ids:
        filtered_knowledges = [
            k for k in filtered_knowledges 
            if any(tag.id in tag_ids for tag in k.tags)
        ]
    
    # 分页
    total = len(filtered_knowledges)
    results = filtered_knowledges[skip:skip + limit]
    
    return KnowledgeSearchResponse(
        total=total,
        results=results
    )


# ==================== 文档预览 ====================

@router.get("/attachments/{attachment_id}/preview", response_model=DocumentPreviewResponse)
def preview_document(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取文档预览信息"""
    attachment = db.query(KnowledgeAttachment).filter(
        KnowledgeAttachment.id == attachment_id
    ).first()
    
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )
    
    # 检查知识库文档权限
    knowledge = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == attachment.knowledge_id
    ).first()
    
    if not knowledge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge not found"
        )
    
    if not file_service.check_permission(current_user, knowledge, "view"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this document"
        )
    
    # 从文件路径中提取对象名
    object_name = None
    if attachment.file_path.startswith("http"):
        # 从 MinIO URL 中提取对象名
        parts = attachment.file_path.split("/")
        if len(parts) >= 4:
            object_name = "/".join(parts[4:])
    elif attachment.file_path.startswith("file://"):
        # 从本地文件路径中提取对象名
        local_path = attachment.file_path[7:]  # 移除 file://
        if file_service.local_storage_dir in local_path:
            object_name = local_path[len(file_service.local_storage_dir) + 1:]
    
    if not object_name:
        # 尝试从 file_path 中解析
        object_name = attachment.file_path.split("/")[-1]
    
    # 获取预览 URL
    preview_url = file_service.get_file_url_for_preview(object_name)
    
    # 判断是否可以预览
    can_preview = False
    preview_content = None
    
    # 文本和常见文档类型可以预览
    previewable_types = [
        "text/plain", "text/markdown", "application/pdf", 
        "image/png", "image/jpeg", "image/gif"
    ]
    
    if attachment.mime_type in previewable_types:
        can_preview = True
    
    # 对于文本文件，直接读取内容
    if attachment.mime_type in ["text/plain", "text/markdown"]:
        content = file_service.get_file_content(object_name)
        if content:
            try:
                preview_content = content.decode("utf-8")
            except:
                preview_content = None
    
    return DocumentPreviewResponse(
        file_name=attachment.name,
        mime_type=attachment.mime_type or "application/octet-stream",
        file_size=attachment.file_size or 0,
        preview_url=preview_url,
        content=preview_content,
        can_preview=can_preview
    )


@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """下载附件"""
    attachment = db.query(KnowledgeAttachment).filter(
        KnowledgeAttachment.id == attachment_id
    ).first()
    
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )
    
    # 检查知识库文档权限
    knowledge = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == attachment.knowledge_id
    ).first()
    
    if not knowledge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge not found"
        )
    
    if not file_service.check_permission(current_user, knowledge, "view"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to download this document"
        )
    
    # 从文件路径中提取对象名
    object_name = None
    if attachment.file_path.startswith("http"):
        parts = attachment.file_path.split("/")
        if len(parts) >= 4:
            object_name = "/".join(parts[4:])
    elif attachment.file_path.startswith("file://"):
        local_path = attachment.file_path[7:]
        if file_service.local_storage_dir in local_path:
            object_name = local_path[len(file_service.local_storage_dir) + 1:]
    
    if not object_name:
        object_name = attachment.file_path.split("/")[-1]
    
    # 获取文件内容
    content = file_service.get_file_content(object_name)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File content not found"
        )
    
    # 返回文件流
    return StreamingResponse(
        iter([content]),
        media_type=attachment.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={attachment.name}"
        }
    )
