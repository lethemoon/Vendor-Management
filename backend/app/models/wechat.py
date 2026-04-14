from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base
from app.models.user import User


class ConfirmationType(str, enum.Enum):
    PROJECT_START = "project_start"
    PHASE_TRANSITION = "phase_transition"
    SUPPLIER_SHORTLIST = "supplier_shortlist"
    AWARD_DECISION = "award_decision"
    ACCEPTANCE = "acceptance"


class ConfirmationStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class TeamConfirmation(Base):
    __tablename__ = "team_confirmations"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(ConfirmationType), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(Enum(ConfirmationStatus), default=ConfirmationStatus.PENDING, nullable=False)
    
    related_id = Column(Integer)
    related_type = Column(String(100))
    
    initiator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    initiator = relationship("User", foreign_keys=[initiator_id])


class ConfirmationStep(Base):
    __tablename__ = "confirmation_steps"

    id = Column(Integer, primary_key=True, index=True)
    confirmation_id = Column(Integer, ForeignKey("team_confirmations.id"), nullable=False)
    step_order = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ConfirmationStatus), default=ConfirmationStatus.PENDING, nullable=False)
    comment = Column(Text)
    confirmed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    confirmation = relationship("TeamConfirmation", back_populates="steps")
    assignee = relationship("User", foreign_keys=[assignee_id])


TeamConfirmation.steps = relationship("ConfirmationStep", back_populates="confirmation", order_by="ConfirmationStep.step_order", cascade="all, delete-orphan")


class WeChatUser(Base):
    __tablename__ = "wechat_users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    wechat_userid = Column(String(100), unique=True, index=True, nullable=False)
    wechat_name = Column(String(200))
    wechat_avatar = Column(String(500))
    department = Column(String(200))
    position = Column(String(200))
    is_active = Column(Boolean, default=True)
    last_sync_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="wechat_profile")


class WeChatMessage(Base):
    __tablename__ = "wechat_messages"

    id = Column(Integer, primary_key=True, index=True)
    to_user = Column(String(100), nullable=False)
    msg_type = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    message_id = Column(String(100))
    status = Column(String(50), default="sent")
    error_message = Column(Text)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    
    related_confirmation_id = Column(Integer, ForeignKey("team_confirmations.id"))
    related_confirmation = relationship("TeamConfirmation")
