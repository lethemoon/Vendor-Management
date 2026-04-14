from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import logging

from app.database import get_db
from app.models.confirmation import Confirmation, ConfirmationRecord, ConfirmationStatus, ConfirmationType
from app.models.user import User, UserRole
from app.schemas.confirmation import (
    ConfirmationCreate,
    ConfirmationResponse,
    ConfirmationWithRecords,
    ConfirmationActionRequest,
    ConfirmationRecordResponse
)
from app.dependencies import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/confirmations", tags=["confirmations"])


@router.post("", response_model=ConfirmationResponse, status_code=status.HTTP_201_CREATED)
def create_confirmation(
    confirmation_in: ConfirmationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    confirmation = Confirmation(
        **confirmation_in.model_dump(),
        created_by_id=current_user.id,
        status=ConfirmationStatus.PENDING
    )
    db.add(confirmation)
    db.commit()
    db.refresh(confirmation)
    
    record = ConfirmationRecord(
        confirmation_id=confirmation.id,
        user_id=current_user.id,
        action="create",
        comment="创建确认请求"
    )
    db.add(record)
    db.commit()
    
    return confirmation


@router.get("", response_model=List[ConfirmationResponse])
def list_confirmations(
    project_id: Optional[int] = None,
    status: Optional[ConfirmationStatus] = None,
    type: Optional[ConfirmationType] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Confirmation)
    
    if project_id is not None:
        query = query.filter(Confirmation.project_id == project_id)
    if status is not None:
        query = query.filter(Confirmation.status == status)
    if type is not None:
        query = query.filter(Confirmation.type == type)
    
    confirmations = query.order_by(Confirmation.created_at.desc()).offset(skip).limit(limit).all()
    return confirmations


@router.get("/{confirmation_id}", response_model=ConfirmationWithRecords)
def get_confirmation(
    confirmation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    confirmation = db.query(Confirmation).options(
        joinedload(Confirmation.records)
    ).filter(Confirmation.id == confirmation_id).first()
    
    if not confirmation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Confirmation not found"
        )
    
    return confirmation


@router.post("/{confirmation_id}/action", response_model=ConfirmationResponse)
def perform_confirmation_action(
    confirmation_id: int,
    action_in: ConfirmationActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    confirmation = db.query(Confirmation).filter(Confirmation.id == confirmation_id).first()
    
    if not confirmation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Confirmation not found"
        )
    
    if confirmation.status != ConfirmationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending confirmations can be acted on"
        )
    
    if action_in.action == "approve":
        confirmation.status = ConfirmationStatus.APPROVED
        record_action = "approve"
    elif action_in.action == "reject":
        confirmation.status = ConfirmationStatus.REJECTED
        record_action = "reject"
    
    record = ConfirmationRecord(
        confirmation_id=confirmation.id,
        user_id=current_user.id,
        action=record_action,
        comment=action_in.comment
    )
    db.add(record)
    db.commit()
    db.refresh(confirmation)
    
    return confirmation


@router.get("/{confirmation_id}/records", response_model=List[ConfirmationRecordResponse])
def get_confirmation_records(
    confirmation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    confirmation = db.query(Confirmation).filter(Confirmation.id == confirmation_id).first()
    
    if not confirmation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Confirmation not found"
        )
    
    records = db.query(ConfirmationRecord).filter(
        ConfirmationRecord.confirmation_id == confirmation_id
    ).order_by(ConfirmationRecord.created_at.desc()).all()
    
    return records
