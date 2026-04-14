from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Any, Dict
from app.models.survey import SurveyStatus, QuestionType


class SurveyQuestionBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: QuestionType = QuestionType.TEXT
    options: Optional[List[str]] = None
    is_required: bool = True
    order: int = 0


class SurveyQuestionCreate(SurveyQuestionBase):
    pass


class SurveyQuestionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[QuestionType] = None
    options: Optional[List[str]] = None
    is_required: Optional[bool] = None
    order: Optional[int] = None


class SurveyQuestionResponse(SurveyQuestionBase):
    id: int
    survey_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SurveyBase(BaseModel):
    title: str
    description: Optional[str] = None
    version: int = 1
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_supplier_ids: Optional[List[int]] = None


class SurveyCreate(SurveyBase):
    questions: Optional[List[SurveyQuestionCreate]] = None


class SurveyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[SurveyStatus] = None
    version: Optional[int] = None
    is_active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_supplier_ids: Optional[List[int]] = None


class SurveyResponse(SurveyBase):
    id: int
    status: SurveyStatus
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SurveyWithQuestions(SurveyResponse):
    questions: List[SurveyQuestionResponse] = []


class SurveyAnswerBase(BaseModel):
    question_id: int
    value: Any


class SurveyAnswerCreate(SurveyAnswerBase):
    pass


class SurveyAnswerResponse(SurveyAnswerBase):
    id: int
    response_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SurveyResponseBase(BaseModel):
    supplier_id: int
    notes: Optional[str] = None


class SurveyResponseCreate(SurveyResponseBase):
    answers: List[SurveyAnswerCreate]


class SurveyResponseUpdate(BaseModel):
    is_complete: Optional[bool] = None
    notes: Optional[str] = None


class SurveyResponseResponse(SurveyResponseBase):
    id: int
    survey_id: int
    submitted_by_id: Optional[int] = None
    submitted_at: datetime
    is_complete: bool

    model_config = ConfigDict(from_attributes=True)


class SurveyResponseWithAnswers(SurveyResponseResponse):
    answers: List[SurveyAnswerResponse] = []
