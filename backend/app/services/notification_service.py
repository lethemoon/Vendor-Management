from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import Optional, List
from datetime import datetime

from app.models.notification import (
    Notification, NotificationRead, NotificationType, NotificationPriority
)
from app.models.user import User
from app.schemas.notification import NotificationCreate


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def send_notification(
        self,
        notification_data: NotificationCreate,
        sender_id: Optional[int] = None
    ) -> Notification:
        db_notification = Notification(
            **notification_data.model_dump(),
            sender_id=sender_id
        )
        self.db.add(db_notification)
        self.db.commit()
        self.db.refresh(db_notification)
        return db_notification

    def send_notification_to_user(
        self,
        recipient_id: int,
        title: str,
        content: str,
        notification_type: NotificationType = NotificationType.SYSTEM,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        sender_id: Optional[int] = None,
        related_type: Optional[str] = None,
        related_id: Optional[int] = None,
        action_url: Optional[str] = None
    ) -> Notification:
        notification_data = NotificationCreate(
            title=title,
            content=content,
            type=notification_type,
            priority=priority,
            recipient_id=recipient_id,
            related_type=related_type,
            related_id=related_id,
            action_url=action_url,
            is_broadcast=False
        )
        return self.send_notification(notification_data, sender_id)

    def broadcast_notification(
        self,
        title: str,
        content: str,
        notification_type: NotificationType = NotificationType.SYSTEM,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        sender_id: Optional[int] = None,
        related_type: Optional[str] = None,
        related_id: Optional[int] = None,
        action_url: Optional[str] = None,
        expires_at: Optional[datetime] = None
    ) -> Notification:
        notification_data = NotificationCreate(
            title=title,
            content=content,
            type=notification_type,
            priority=priority,
            related_type=related_type,
            related_id=related_id,
            action_url=action_url,
            expires_at=expires_at,
            is_broadcast=True
        )
        return self.send_notification(notification_data, sender_id)

    def get_user_notifications(
        self,
        user_id: int,
        page: int = 1,
        page_size: int = 20,
        notification_type: Optional[NotificationType] = None,
        priority: Optional[NotificationPriority] = None,
        unread_only: bool = False
    ):
        query = self.db.query(Notification).filter(
            or_(
                Notification.recipient_id == user_id,
                Notification.is_broadcast == True
            )
        )

        if notification_type:
            query = query.filter(Notification.type == notification_type)
        if priority:
            query = query.filter(Notification.priority == priority)

        query = query.order_by(desc(Notification.created_at))

        total = query.count()

        offset = (page - 1) * page_size
        notifications = query.offset(offset).limit(page_size).all()

        read_notification_ids = {
            read.notification_id
            for read in self.db.query(NotificationRead).filter(
                NotificationRead.user_id == user_id
            ).all()
        }

        notification_responses = []
        for notification in notifications:
            is_read = notification.id in read_notification_ids
            read_at = None
            if is_read:
                read_record = self.db.query(NotificationRead).filter(
                    and_(
                        NotificationRead.notification_id == notification.id,
                        NotificationRead.user_id == user_id
                    )
                ).first()
                if read_record:
                    read_at = read_record.read_at

            resp = {
                **notification.__dict__,
                "is_read": is_read,
                "read_at": read_at
            }
            notification_responses.append(resp)

        unread_count = self.get_unread_count(user_id)

        return {
            "items": notification_responses,
            "total": total,
            "unread_count": unread_count,
            "page": page,
            "page_size": page_size
        }

    def get_unread_count(self, user_id: int) -> int:
        notifications_query = self.db.query(Notification).filter(
            or_(
                Notification.recipient_id == user_id,
                Notification.is_broadcast == True
            )
        )
        notification_ids = {n.id for n in notifications_query.all()}

        if not notification_ids:
            return 0

        read_ids = {
            read.notification_id
            for read in self.db.query(NotificationRead).filter(
                and_(
                    NotificationRead.user_id == user_id,
                    NotificationRead.notification_id.in_(notification_ids)
                )
            ).all()
        }

        return len(notification_ids) - len(read_ids)

    def mark_as_read(
        self,
        user_id: int,
        notification_ids: Optional[List[int]] = None,
        mark_all: bool = False
    ) -> int:
        marked_count = 0

        if mark_all:
            notifications = self.db.query(Notification).filter(
                or_(
                    Notification.recipient_id == user_id,
                    Notification.is_broadcast == True
                )
            ).all()
            notification_ids = [n.id for n in notifications]

        if notification_ids:
            existing_reads = self.db.query(NotificationRead).filter(
                and_(
                    NotificationRead.user_id == user_id,
                    NotificationRead.notification_id.in_(notification_ids)
                )
            ).all()
            existing_ids = {read.notification_id for read in existing_reads}

            new_notification_ids = [nid for nid in notification_ids if nid not in existing_ids]

            for nid in new_notification_ids:
                read = NotificationRead(
                    notification_id=nid,
                    user_id=user_id
                )
                self.db.add(read)
                marked_count += 1

            self.db.commit()

        return marked_count

    def mark_as_unread(
        self,
        user_id: int,
        notification_ids: List[int]
    ) -> int:
        deleted = self.db.query(NotificationRead).filter(
            and_(
                NotificationRead.user_id == user_id,
                NotificationRead.notification_id.in_(notification_ids)
            )
        ).delete(synchronize_session=False)
        self.db.commit()
        return deleted

    def get_notification_by_id(
        self,
        notification_id: int,
        user_id: int
    ) -> Optional[Notification]:
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id
        ).first()

        if not notification:
            return None

        if notification.recipient_id != user_id and not notification.is_broadcast:
            return None

        return notification

    def delete_notification(self, notification_id: int) -> bool:
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id
        ).first()

        if notification:
            self.db.delete(notification)
            self.db.commit()
            return True

        return False
