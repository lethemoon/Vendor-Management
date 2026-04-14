from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ConfirmationType(str, Enum):
    PROJECT_START = "project_start"
    PHASE_TRANSITION = "phase_transition"
    SUPPLIER_SHORTLIST = "supplier_shortlist"
    AWARD_DECISION = "award_decision"
    ACCEPTANCE = "acceptance"


class ConfirmationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class WeChatLoginRequest(BaseModel):
    code: str


class WeChatUserInfo(BaseModel):
    userid: str
    name: Optional[str] = None
    avatar: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    email: Optional[str] = None


class ConfirmationStepCreate(BaseModel):
    step_order: int
    title: str
    assignee_id: int


class TeamConfirmationCreate(BaseModel):
    type: ConfirmationType
    title: str
    description: Optional[str] = None
    related_id: Optional[int] = None
    related_type: Optional[str] = None
    steps: List[ConfirmationStepCreate]


class ConfirmationStepResponse(BaseModel):
    id: int
    confirmation_id: int
    step_order: int
    title: str
    assignee_id: int
    status: ConfirmationStatus
    comment: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TeamConfirmationResponse(BaseModel):
    id: int
    type: ConfirmationType
    title: str
    description: Optional[str] = None
    status: ConfirmationStatus
    related_id: Optional[int] = None
    related_type: Optional[str] = None
    initiator_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    steps: List[ConfirmationStepResponse]

    class Config:
        from_attributes = True


class ConfirmationStepUpdate(BaseModel):
    status: ConfirmationStatus
    comment: Optional[str] = None


class WeChatMessageRequest(BaseModel):
    to_user: str
    content: str


class WeChatNewsArticle(BaseModel):
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    picurl: Optional[str] = None


class WeChatNewsMessageRequest(BaseModel):
    to_user: str
    articles: List[WeChatNewsArticle]


class AIChatRequest(BaseModel):
    question: str
    context: Optional[str] = None


class AIReportRequest(BaseModel):
    project_name: str
    supplier_name: str
    phase: str
    data: Dict[str, Any]


class AIResponse(BaseModel):
    success: bool
    content: Optional[str] = None
    error: Optional[str] = None
    usage: Optional[Dict[str, Any]] = None
