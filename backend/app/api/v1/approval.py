from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_active_user
from app.services.approval_service import ApprovalService
from app.schemas.approval import (
    ApprovalCreate,
    ApprovalUpdate,
    ApprovalResponse,
    ApprovalWithStepsResponse,
    ApprovalFlowTemplateCreate,
    ApprovalFlowTemplateUpdate,
    ApprovalFlowTemplateResponse,
    ApprovalActionRequest
)

router = APIRouter(prefix="/api/v1/approvals", tags=["approvals"])


@router.post("", response_model=ApprovalResponse, status_code=status.HTTP_201_CREATED)
def create_approval(
    approval_in: ApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        service = ApprovalService(db)
        approval = service.create_approval(
            title=approval_in.title,
            description=approval_in.description,
            flow_template_id=approval_in.flow_template_id,
            related_type=approval_in.related_type,
            related_id=approval_in.related_id,
            metadata=approval_in.metadata,
            created_by_id=current_user.id,
            steps=[step.model_dump() for step in approval_in.steps] if approval_in.steps else None
        )
        return approval
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create approval: {str(e)}"
        )


@router.post("/from-template/{template_id}", response_model=ApprovalResponse, status_code=status.HTTP_201_CREATED)
def create_approval_from_template(
    template_id: int,
    approval_in: ApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        service = ApprovalService(db)
        approval = service.create_approval_from_template(
            template_id=template_id,
            title=approval_in.title,
            description=approval_in.description,
            related_type=approval_in.related_type,
            related_id=approval_in.related_id,
            metadata=approval_in.metadata,
            created_by_id=current_user.id
        )
        return approval
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create approval from template: {str(e)}"
        )


@router.get("", response_model=List[ApprovalResponse])
def list_approvals(
    status: Optional[str] = Query(None),
    related_type: Optional[str] = Query(None),
    related_id: Optional[int] = Query(None),
    skip: int = Query(0),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ApprovalService(db)
    approvals = service.list_approvals(
        created_by_id=current_user.id,
        status=status,
        related_type=related_type,
        related_id=related_id,
        skip=skip,
        limit=limit
    )
    return approvals


@router.get("/{approval_id}", response_model=ApprovalWithStepsResponse)
def get_approval(
    approval_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ApprovalService(db)
    approval = service.get_approval(approval_id)
    
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval not found"
        )
    
    return approval


@router.post("/{approval_id}/submit", response_model=ApprovalResponse)
def submit_approval(
    approval_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        service = ApprovalService(db)
        approval = service.submit_approval(approval_id)
        return approval
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit approval: {str(e)}"
        )


@router.post("/{approval_id}/steps/{step_id}/action")
def process_step_action(
    approval_id: int,
    step_id: int,
    action_in: ApprovalActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        service = ApprovalService(db)
        step = service.process_step_action(
            approval_id=approval_id,
            step_id=step_id,
            action=action_in.action,
            comment=action_in.comment,
            user_id=current_user.id
        )
        return {"message": "Step action processed successfully", "step_id": step.id, "status": step.status}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process step action: {str(e)}"
        )


@router.post("/{approval_id}/cancel", response_model=ApprovalResponse)
def cancel_approval(
    approval_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        service = ApprovalService(db)
        approval = service.cancel_approval(approval_id)
        return approval
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel approval: {str(e)}"
        )


@router.post("/templates", response_model=ApprovalFlowTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_flow_template(
    template_in: ApprovalFlowTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        service = ApprovalService(db)
        template = service.create_flow_template(
            name=template_in.name,
            description=template_in.description,
            flow_type=template_in.flow_type,
            steps_config=template_in.steps_config,
            created_by_id=current_user.id
        )
        return template
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create flow template: {str(e)}"
        )


@router.get("/templates", response_model=List[ApprovalFlowTemplateResponse])
def list_flow_templates(
    flow_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ApprovalService(db)
    templates = service.list_flow_templates(
        flow_type=flow_type,
        is_active=is_active,
        skip=skip,
        limit=limit
    )
    return templates
