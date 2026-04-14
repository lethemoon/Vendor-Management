from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from app.models.notification import NotificationType, NotificationPriority


class NotificationBase(BaseModel):
    title: str = Field(..., max_length=200)
    content: str
    type: NotificationType = NotificationType.SYSTEM
    priority: NotificationPriority = NotificationPriority.NORMAL
    related_type: Optional[str] = Field(None, max_length=100)
    related_id: Optional[int] = None
    action_url: Optional[str] = Field(None, max_length=500)
    expires_at: Optional[datetime] = None


class NotificationCreate(NotificationBase):
    recipient_id: Optional[int] = None
    is_broadcast: bool = False


class NotificationUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    is_read: Optional[bool] = None


class NotificationReadResponse(BaseModel):
    id: int
    user_id: int
    read_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationResponse(NotificationBase):
    id: int
    sender_id: Optional[int] = None
    recipient_id: Optional[int] = None
    is_broadcast: bool
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int


class MarkAsReadRequest(BaseModel):
    notification_ids: Optional[list[int]] = None
    mark_all: bool = False
