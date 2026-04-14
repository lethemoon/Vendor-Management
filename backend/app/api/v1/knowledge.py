from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import os
import tempfile
import logging
from app.services.file_service import file_service

# 日志配置
logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.knowledge import KnowledgeBase, KnowledgeStatus, KnowledgeType, KnowledgeCategory, KnowledgeTag, KnowledgeAttachment
from app.models.user import User
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
