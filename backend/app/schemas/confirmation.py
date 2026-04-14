from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List
from app.models.confirmation import ConfirmationType, ConfirmationStatus


class ConfirmationRecordBase(BaseModel):
    confirmation_id: int
    user_id: int
    action: str
    comment: Optional[str] = None


class ConfirmationRecordCreate(ConfirmationRecordBase):
    pass


class ConfirmationRecordResponse(ConfirmationRecordBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConfirmationBase(BaseModel):
    project_id: int
    phase_id: Optional[int] = None
    supplier_id: Optional[int] = None
    type: ConfirmationType


class ConfirmationCreate(ConfirmationBase):
    pass


class ConfirmationUpdate(BaseModel):
    status: Optional[ConfirmationStatus] = None


class ConfirmationResponse(ConfirmationBase):
    id: int
    status: ConfirmationStatus
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ConfirmationWithRecords(ConfirmationResponse):
    records: List[ConfirmationRecordResponse] = []


class ConfirmationActionRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$", description="操作类型: approve 或 reject")
    comment: Optional[str] = Field(None, max_length=500, description="操作备注")
