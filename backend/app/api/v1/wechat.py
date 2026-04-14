from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.config import get_settings
from app.database import get_db
from app.models.user import User, UserRole
from app.models.wechat import (
    TeamConfirmation,
    ConfirmationStep,
    ConfirmationType,
    ConfirmationStatus,
    WeChatUser,
    WeChatMessage,
)
from app.schemas.wechat import (
    WeChatLoginRequest,
    WeChatUserInfo,
    TeamConfirmationCreate,
    TeamConfirmationResponse,
    ConfirmationStepUpdate,
    WeChatMessageRequest,
    WeChatNewsMessageRequest,
    AIChatRequest,
    AIReportRequest,
    AIResponse,
)
from app.schemas.user import Token, UserResponse
from app.security import create_access_token
from app.dependencies import get_current_active_user
from app.services.wechat_service import wechat_service
from app.services.ai_gateway_service import ai_gateway_service
from app.models import user as user_models

router = APIRouter(prefix="/api/v1/wechat", tags=["wechat"])
settings = get_settings()


@router.post("/login", response_model=Token)
def wechat_login(login_data: WeChatLoginRequest, db: Session = Depends(get_db)):
    try:
        user_info = wechat_service.get_user_info(login_data.code)
        wechat_userid = user_info.get("UserId")
        
        if not wechat_userid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get WeChat user ID"
            )
        
        wechat_profile = db.query(WeChatUser).filter(
            WeChatUser.wechat_userid == wechat_userid
        ).first()
        
        if wechat_profile:
            user = wechat_profile.user
        else:
            user_detail = wechat_service.get_user_detail(wechat_userid)
            
            email = user_detail.get("email", f"{wechat_userid}@wechat.local")
            username = user_detail.get("name", wechat_userid)
            
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                user = existing_user
            else:
                user = User(
                    email=email,
                    username=username,
                    full_name=user_detail.get("name"),
                    role=UserRole.VIEWER,
                    is_active=True,
                )
                db.add(user)
                db.flush()
            
            wechat_profile = WeChatUser(
                user_id=user.id,
                wechat_userid=wechat_userid,
                wechat_name=user_detail.get("name"),
                wechat_avatar=user_detail.get("avatar"),
                department=user_detail.get("department"),
                position=user_detail.get("position"),
            )
            db.add(wechat_profile)
            db.commit()
        
        access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"WeChat login failed: {str(e)}"
        )


@router.post("/confirmations", response_model=TeamConfirmationResponse, status_code=status.HTTP_201_CREATED)
def create_confirmation(
    confirmation_in: TeamConfirmationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    confirmation = TeamConfirmation(
        type=confirmation_in.type,
        title=confirmation_in.title,
        description=confirmation_in.description,
        related_id=confirmation_in.related_id,
        related_type=confirmation_in.related_type,
        initiator_id=current_user.id,
        status=ConfirmationStatus.PENDING,
    )
    db.add(confirmation)
    db.flush()
    
    for step_in in confirmation_in.steps:
        step = ConfirmationStep(
            confirmation_id=confirmation.id,
            step_order=step_in.step_order,
            title=step_in.title,
            assignee_id=step_in.assignee_id,
            status=ConfirmationStatus.PENDING,
        )
        db.add(step)
        
        try:
            assignee = db.query(User).filter(User.id == step_in.assignee_id).first()
            if assignee and assignee.wechat_profile:
                wechat_service.send_text_message(
                    assignee.wechat_profile.wechat_userid,
                    f"您有一个新的确认任务：{confirmation_in.title}\n\n{confirmation_in.description or ''}"
                )
        except Exception as e:
            print(f"Failed to send WeChat message: {e}")
    
    db.commit()
    db.refresh(confirmation)
    return confirmation


@router.get("/confirmations", response_model=List[TeamConfirmationResponse])
def list_confirmations(
    status: Optional[ConfirmationStatus] = None,
    type: Optional[ConfirmationType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(TeamConfirmation)
    
    if current_user.role != UserRole.ADMIN:
        query = query.filter(
            (TeamConfirmation.initiator_id == current_user.id) |
            (TeamConfirmation.steps.any(ConfirmationStep.assignee_id == current_user.id))
        )
    
    if status:
        query = query.filter(TeamConfirmation.status == status)
    if type:
        query = query.filter(TeamConfirmation.type == type)
    
    return query.order_by(TeamConfirmation.created_at.desc()).all()


@router.get("/confirmations/{confirmation_id}", response_model=TeamConfirmationResponse)
def get_confirmation(
    confirmation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    confirmation = db.query(TeamConfirmation).filter(TeamConfirmation.id == confirmation_id).first()
    if not confirmation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Confirmation not found"
        )
    
    if current_user.role != UserRole.ADMIN:
        is_authorized = (
            confirmation.initiator_id == current_user.id or
            any(step.assignee_id == current_user.id for step in confirmation.steps)
        )
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this confirmation"
            )
    
    return confirmation


@router.put("/confirmations/{confirmation_id}/steps/{step_id}", response_model=TeamConfirmationResponse)
def update_confirmation_step(
    confirmation_id: int,
    step_id: int,
    step_update: ConfirmationStepUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    step = db.query(ConfirmationStep).filter(
        ConfirmationStep.id == step_id,
        ConfirmationStep.confirmation_id == confirmation_id
    ).first()
    
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Confirmation step not found"
        )
    
    if step.assignee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this step"
        )
    
    step.status = step_update.status
    step.comment = step_update.comment
    if step_update.status == ConfirmationStatus.CONFIRMED:
        from sqlalchemy.sql import func
        step.confirmed_at = func.now()
    
    confirmation = step.confirmation
    
    all_confirmed = all(s.status == ConfirmationStatus.CONFIRMED for s in confirmation.steps)
    any_rejected = any(s.status == ConfirmationStatus.REJECTED for s in confirmation.steps)
    
    if any_rejected:
        confirmation.status = ConfirmationStatus.REJECTED
    elif all_confirmed:
        confirmation.status = ConfirmationStatus.CONFIRMED
        
        try:
            if confirmation.initiator.wechat_profile:
                wechat_service.send_text_message(
                    confirmation.initiator.wechat_profile.wechat_userid,
                    f"确认流程已完成：{confirmation.title}"
                )
        except Exception as e:
            print(f"Failed to send completion message: {e}")
    
    db.commit()
    db.refresh(confirmation)
    return confirmation


@router.post("/messages/text")
def send_text_message(
    message_in: WeChatMessageRequest,
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RESEARCHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to send messages"
        )
    
    try:
        result = wechat_service.send_text_message(message_in.to_user, message_in.content)
        
        db_message = WeChatMessage(
            to_user=message_in.to_user,
            msg_type="text",
            content=message_in.content,
            message_id=result.get("msgid"),
        )
        from app.database import SessionLocal
        db = SessionLocal()
        db.add(db_message)
        db.commit()
        db.close()
        
        return {"success": True, "message_id": result.get("msgid")}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )


@router.post("/messages/news")
def send_news_message(
    message_in: WeChatNewsMessageRequest,
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RESEARCHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to send messages"
        )
    
    try:
        articles = [
            {
                "title": a.title,
                "description": a.description,
                "url": a.url,
                "picurl": a.picurl,
            }
            for a in message_in.articles
        ]
        
        result = wechat_service.send_news_message(message_in.to_user, articles)
        return {"success": True, "message_id": result.get("msgid")}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send news message: {str(e)}"
        )


@router.post("/ai/chat", response_model=AIResponse)
def ai_chat(
    request: AIChatRequest,
    current_user: User = Depends(get_current_active_user),
):
    result = ai_gateway_service.answer_question(request.question, request.context)
    return AIResponse(**result)


@router.post("/ai/report", response_model=AIResponse)
def generate_report(
    request: AIReportRequest,
    current_user: User = Depends(get_current_active_user),
):
    result = ai_gateway_service.generate_survey_report(
        request.project_name,
        request.supplier_name,
        request.phase,
        request.data
    )
    return AIResponse(**result)
