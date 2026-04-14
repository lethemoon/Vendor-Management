from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class ApprovalStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ApprovalStepStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"
    SKIPPED = "skipped"


class ApprovalFlowTemplate(Base):
    __tablename__ = "approval_flow_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    flow_type = Column(String(50), nullable=False)
    steps_config = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    created_by = relationship("User", backref="approval_flow_templates")
    approvals = relationship("Approval", back_populates="flow_template")


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    flow_template_id = Column(Integer, ForeignKey("approval_flow_templates.id"), nullable=True)
    status = Column(String(50), nullable=False, default=ApprovalStatus.DRAFT)
    related_type = Column(String(100), nullable=True)
    related_id = Column(Integer, nullable=True)
    approval_metadata = Column(JSON, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    flow_template = relationship("ApprovalFlowTemplate", back_populates="approvals")
    created_by = relationship("User", backref="created_approvals")
    steps = relationship("ApprovalStep", back_populates="approval", cascade="all, delete-orphan")


class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("approvals.id"), nullable=False)
    step_order = Column(Integer, nullable=False)
    step_name = Column(String(200), nullable=False)
    step_type = Column(String(50), nullable=False)
    approver_type = Column(String(50), nullable=False)
    approver_id = Column(Integer, nullable=True)
    approver_role = Column(String(50), nullable=True)
    status = Column(String(50), nullable=False, default=ApprovalStepStatus.PENDING)
    comment = Column(Text, nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    approval = relationship("Approval", back_populates="steps")
    approved_by = relationship("User", foreign_keys=[approved_by_id])
