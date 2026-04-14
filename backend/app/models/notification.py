from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class NotificationType(str, enum.Enum):
    SYSTEM = "system"
    PROJECT = "project"
    CONFIRMATION = "confirmation"
    APPROVAL = "approval"


class NotificationPriority(str, enum.Enum):
    NORMAL = "normal"
    IMPORTANT = "important"
    URGENT = "urgent"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(Enum(NotificationType), nullable=False, default=NotificationType.SYSTEM)
    priority = Column(Enum(NotificationPriority), nullable=False, default=NotificationPriority.NORMAL)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    related_type = Column(String(100), nullable=True)
    related_id = Column(Integer, nullable=True)
    action_url = Column(String(500), nullable=True)
    is_broadcast = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User", foreign_keys=[sender_id], backref="sent_notifications")
    recipient = relationship("User", foreign_keys=[recipient_id], backref="notifications")
    reads = relationship("NotificationRead", back_populates="notification", cascade="all, delete-orphan")


class NotificationRead(Base):
    __tablename__ = "notification_reads"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    read_at = Column(DateTime(timezone=True), server_default=func.now())

    notification = relationship("Notification", back_populates="reads")
    user = relationship("User", backref="notification_reads")
