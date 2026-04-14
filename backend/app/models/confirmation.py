from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class ConfirmationType(str, enum.Enum):
    PROJECT_INITIATION = "项目立项确认"
    PHASE_TRANSITION = "阶段流转确认"
    SUPPLIER_SHORTLIST = "供应商入围确认"
    BID_WIN = "中标确认"
    ACCEPTANCE = "验收确认"


class ConfirmationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Confirmation(Base):
    __tablename__ = "confirmations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer)
    phase_id = Column(Integer, nullable=True)
    supplier_id = Column(Integer, nullable=True)
    type = Column(Enum(ConfirmationType), nullable=False)
    status = Column(Enum(ConfirmationStatus), default=ConfirmationStatus.PENDING, nullable=False)
    created_by_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    records = relationship("ConfirmationRecord", back_populates="confirmation", cascade="all, delete-orphan")


class ConfirmationRecord(Base):
    __tablename__ = "confirmation_records"

    id = Column(Integer, primary_key=True, index=True)
    confirmation_id = Column(Integer, ForeignKey("confirmations.id"), nullable=False)
    user_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)
    comment = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    confirmation = relationship("Confirmation", back_populates="records")
