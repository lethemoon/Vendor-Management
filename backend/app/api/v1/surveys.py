from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.survey import Survey, SurveyStatus, QuestionType, SurveyQuestion, SurveyResponse, SurveyAnswer
from app.models.user import User
from app.schemas.survey import (
    SurveyCreate,
    SurveyUpdate,
    SurveyResponse as SurveyResponseSchema,
    SurveyWithQuestions,
    SurveyQuestionCreate,
    SurveyQuestionUpdate,
    SurveyQuestionResponse,
    SurveyResponseCreate,
    SurveyResponseUpdate,
    SurveyResponseResponse,
    SurveyResponseWithAnswers,
)
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/api/v1/surveys", tags=["surveys"])


@router.get("", response_model=List[SurveyResponseSchema])
def list_surveys(
    skip: int = 0,
    limit: int = 100,
    status: Optional[SurveyStatus] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Survey)
    
    if status is not None:
        query = query.filter(Survey.status == status)
    if is_active is not None:
        query = query.filter(Survey.is_active == is_active)
    
    surveys = query.offset(skip).limit(limit).all()
    return surveys


@router.post("", response_model=SurveyResponseSchema, status_code=status.HTTP_201_CREATED)
def create_survey(
    survey_in: SurveyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey_data = survey_in.model_dump(exclude={"questions"})
    survey = Survey(**survey_data, created_by_id=current_user.id)
    db.add(survey)
    db.flush()
    
    if survey_in.questions:
        for question_data in survey_in.questions:
            question = SurveyQuestion(
                **question_data.model_dump(),
                survey_id=survey.id
            )
            db.add(question)
    
    db.commit()
    db.refresh(survey)
    return survey


@router.get("/{survey_id}", response_model=SurveyWithQuestions)
def get_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    return survey


@router.put("/{survey_id}", response_model=SurveyResponseSchema)
def update_survey(
    survey_id: int,
    survey_in: SurveyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    update_data = survey_in.model_dump(exclude_unset=True)
    update_data["updated_by_id"] = current_user.id
    
    for field, value in update_data.items():
        setattr(survey, field, value)
    
    db.commit()
    db.refresh(survey)
    return survey


@router.delete("/{survey_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    db.delete(survey)
    db.commit()
    return None


@router.post("/{survey_id}/publish", response_model=SurveyResponseSchema)
def publish_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    if survey.status != SurveyStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft surveys can be published"
        )
    
    survey.status = SurveyStatus.PUBLISHED
    survey.published_at = datetime.now(timezone.utc)
    survey.updated_by_id = current_user.id
    
    db.commit()
    db.refresh(survey)
    return survey


@router.get("/{survey_id}/questions", response_model=List[SurveyQuestionResponse])
def list_survey_questions(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    questions = db.query(SurveyQuestion).filter(
        SurveyQuestion.survey_id == survey_id
    ).order_by(SurveyQuestion.order).all()
    return questions


@router.post("/{survey_id}/questions", response_model=SurveyQuestionResponse, status_code=status.HTTP_201_CREATED)
def add_survey_question(
    survey_id: int,
    question_in: SurveyQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    if survey.status != SurveyStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only add questions to draft surveys"
        )
    
    question = SurveyQuestion(
        **question_in.model_dump(),
        survey_id=survey_id
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.put("/{survey_id}/questions/{question_id}", response_model=SurveyQuestionResponse)
def update_survey_question(
    survey_id: int,
    question_id: int,
    question_in: SurveyQuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    if survey.status != SurveyStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update questions in draft surveys"
        )
    
    question = db.query(SurveyQuestion).filter(
        SurveyQuestion.id == question_id,
        SurveyQuestion.survey_id == survey_id
    ).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    update_data = question_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(question, field, value)
    
    db.commit()
    db.refresh(question)
    return question


@router.delete("/{survey_id}/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_survey_question(
    survey_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    if survey.status != SurveyStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete questions from draft surveys"
        )
    
    question = db.query(SurveyQuestion).filter(
        SurveyQuestion.id == question_id,
        SurveyQuestion.survey_id == survey_id
    ).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    db.delete(question)
    db.commit()
    return None


@router.get("/{survey_id}/responses", response_model=List[SurveyResponseResponse])
def list_survey_responses(
    survey_id: int,
    supplier_id: Optional[int] = None,
    is_complete: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    query = db.query(SurveyResponse).filter(SurveyResponse.survey_id == survey_id)
    
    if supplier_id is not None:
        query = query.filter(SurveyResponse.supplier_id == supplier_id)
    if is_complete is not None:
        query = query.filter(SurveyResponse.is_complete == is_complete)
    
    responses = query.all()
    return responses


@router.post("/{survey_id}/responses", response_model=SurveyResponseWithAnswers, status_code=status.HTTP_201_CREATED)
def submit_survey_response(
    survey_id: int,
    response_in: SurveyResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    if survey.status != SurveyStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only submit responses to published surveys"
        )
    
    survey_response = SurveyResponse(
        survey_id=survey_id,
        supplier_id=response_in.supplier_id,
        submitted_by_id=current_user.id,
        is_complete=True,
        notes=response_in.notes
    )
    db.add(survey_response)
    db.flush()
    
    for answer_data in response_in.answers:
        answer = SurveyAnswer(
            response_id=survey_response.id,
            question_id=answer_data.question_id,
            value=answer_data.value
        )
        db.add(answer)
    
    db.commit()
    db.refresh(survey_response)
    return survey_response


@router.get("/{survey_id}/responses/{response_id}", response_model=SurveyResponseWithAnswers)
def get_survey_response(
    survey_id: int,
    response_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    survey_response = db.query(SurveyResponse).filter(
        SurveyResponse.id == response_id,
        SurveyResponse.survey_id == survey_id
    ).first()
    if not survey_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Response not found"
        )
    return survey_response


@router.put("/{survey_id}/responses/{response_id}", response_model=SurveyResponseResponse)
def update_survey_response(
    survey_id: int,
    response_id: int,
    response_in: SurveyResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    survey_response = db.query(SurveyResponse).filter(
        SurveyResponse.id == response_id,
        SurveyResponse.survey_id == survey_id
    ).first()
    if not survey_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Response not found"
        )
    
    update_data = response_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(survey_response, field, value)
    
    db.commit()
    db.refresh(survey_response)
    return survey_response
