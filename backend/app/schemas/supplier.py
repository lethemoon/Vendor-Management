from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional, List
from app.models.supplier import SupplierStatus


class SupplierBase(BaseModel):
    name: str
    legal_name: Optional[str] = None
    tax_id: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    address: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    category: Optional[str] = None
    status: SupplierStatus = SupplierStatus.PENDING
    credit_rating: Optional[str] = None
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    tax_id: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    address: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    category: Optional[str] = None
    status: Optional[SupplierStatus] = None
    credit_rating: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(SupplierBase):
    id: int
    is_active: bool
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SupplierDocumentBase(BaseModel):
    name: str
    type: Optional[str] = None
    file_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None


class SupplierDocumentCreate(SupplierDocumentBase):
    pass


class SupplierDocumentResponse(SupplierDocumentBase):
    id: int
    supplier_id: int
    uploaded_by_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupplierWithDocuments(SupplierResponse):
    documents: List[SupplierDocumentResponse] = []
