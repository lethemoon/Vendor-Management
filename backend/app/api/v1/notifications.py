from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.notification import Notification, NotificationRead, NotificationType, NotificationPriority
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    MarkAsReadRequest
)
from app.services.notification_service import NotificationService
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def get_notifications(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    notification_type: Optional[NotificationType] = Query(None, description="通知类型"),
    priority: Optional[NotificationPriority] = Query(None, description="优先级"),
    unread_only: bool = Query(False, description="仅显示未读"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = NotificationService(db)
    result = service.get_user_notifications(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        notification_type=notification_type,
        priority=priority,
        unread_only=unread_only
    )
    
    items = []
    for item in result["items"]:
        response_data = {
            "id": item["id"],
            "title": item["title"],
            "content": item["content"],
            "type": item["type"],
            "priority": item["priority"],
            "sender_id": item.get("sender_id"),
            "recipient_id": item.get("recipient_id"),
            "related_type": item.get("related_type"),
            "related_id": item.get("related_id"),
            "action_url": item.get("action_url"),
            "is_broadcast": item.get("is_broadcast", False),
            "expires_at": item.get("expires_at"),
            "created_at": item["created_at"],
            "is_read": item["is_read"],
            "read_at": item["read_at"]
        }
        items.append(NotificationResponse(**response_data))
    
    return NotificationListResponse(
        items=items,
        total=result["total"],
        unread_count=result["unread_count"],
        page=result["page"],
        page_size=result["page_size"]
    )


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = NotificationService(db)
    count = service.get_unread_count(current_user.id)
    return {"unread_count": count}


@router.get("/{notification_id}", response_model=NotificationResponse)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = NotificationService(db)
    notification = service.get_notification_by_id(notification_id, current_user.id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    read_record = db.query(NotificationRead).filter(
        and_(
            NotificationRead.notification_id == notification_id,
            NotificationRead.user_id == current_user.id
        )
    ).first()
    
    is_read = read_record is not None
    read_at = read_record.read_at if read_record else None
    
    return NotificationResponse(
        id=notification.id,
        title=notification.title,
        content=notification.content,
        type=notification.type,
        priority=notification.priority,
        sender_id=notification.sender_id,
        recipient_id=notification.recipient_id,
        related_type=notification.related_type,
        related_id=notification.related_id,
        action_url=notification.action_url,
        is_broadcast=notification.is_broadcast,
        expires_at=notification.expires_at,
        created_at=notification.created_at,
        is_read=is_read,
        read_at=read_at
    )


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(
    notification_in: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RESEARCHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create notifications"
        )
    
    service = NotificationService(db)
    notification = service.send_notification(notification_in, sender_id=current_user.id)
    
    return NotificationResponse(
        id=notification.id,
        title=notification.title,
        content=notification.content,
        type=notification.type,
        priority=notification.priority,
        sender_id=notification.sender_id,
        recipient_id=notification.recipient_id,
        related_type=notification.related_type,
        related_id=notification.related_id,
        action_url=notification.action_url,
        is_broadcast=notification.is_broadcast,
        expires_at=notification.expires_at,
        created_at=notification.created_at,
        is_read=False,
        read_at=None
    )


@router.post("/mark-read")
def mark_as_read(
    request: MarkAsReadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not request.mark_all and not request.notification_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either notification_ids or mark_all must be provided"
        )
    
    service = NotificationService(db)
    marked_count = service.mark_as_read(
        user_id=current_user.id,
        notification_ids=request.notification_ids,
        mark_all=request.mark_all
    )
    
    return {"marked_count": marked_count}


@router.post("/mark-unread")
def mark_as_unread(
    notification_ids: list[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = NotificationService(db)
    unmarked_count = service.mark_as_unread(current_user.id, notification_ids)
    return {"unmarked_count": unmarked_count}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete notifications"
        )
    
    service = NotificationService(db)
    success = service.delete_notification(notification_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return None
