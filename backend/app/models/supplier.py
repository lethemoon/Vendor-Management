from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base
from app.models.user import User


class SupplierStatus(str, enum.Enum):
    ACTIVE = "active"
    PENDING = "pending"
    BLACKLISTED = "blacklisted"


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    legal_name = Column(String(255))
    tax_id = Column(String(100), unique=True, index=True)
    contact_person = Column(String(100))
    contact_phone = Column(String(50))
    contact_email = Column(String(255))
    address = Column(Text)
    website = Column(String(500))
    industry = Column(String(100))
    category = Column(String(100))
    status = Column(Enum(SupplierStatus), default=SupplierStatus.PENDING, nullable=False)
    credit_rating = Column(String(50))
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    updated_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])


class SupplierDocument(Base):
    __tablename__ = "supplier_documents"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(100))
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    supplier = relationship("Supplier", back_populates="documents")
    uploaded_by = relationship("User")


Supplier.documents = relationship("SupplierDocument", back_populates="supplier", cascade="all, delete-orphan")
