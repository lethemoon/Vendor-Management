from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class ApprovalStepBase(BaseModel):
    step_order: int
    step_name: str
    step_type: str
    approver_type: str
    approver_id: Optional[int] = None
    approver_role: Optional[str] = None


class ApprovalStepCreate(ApprovalStepBase):
    pass


class ApprovalStepResponse(ApprovalStepBase):
    id: int
    status: str
    comment: Optional[str] = None
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApprovalBase(BaseModel):
    title: str
    description: Optional[str] = None
    flow_template_id: Optional[int] = None
    related_type: Optional[str] = None
    related_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = Field(None, alias="approval_metadata")


class ApprovalCreate(ApprovalBase):
    steps: Optional[List[ApprovalStepCreate]] = None


class ApprovalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ApprovalResponse(ApprovalBase):
    id: int
    status: str
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ApprovalWithStepsResponse(ApprovalResponse):
    steps: List[ApprovalStepResponse] = []


class ApprovalFlowTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    flow_type: str
    steps_config: List[Dict[str, Any]]


class ApprovalFlowTemplateCreate(ApprovalFlowTemplateBase):
    pass


class ApprovalFlowTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps_config: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None


class ApprovalFlowTemplateResponse(ApprovalFlowTemplateBase):
    id: int
    is_active: bool
    is_system: bool
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApprovalActionRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|cancel)$")
    comment: Optional[str] = Field(None, max_length=500)
