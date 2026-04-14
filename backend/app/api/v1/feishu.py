from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import json

from app.config import get_settings
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import Token, UserResponse
from app.security import create_access_token
from app.dependencies import get_current_active_user
from app.services.feishu_service import feishu_service

router = APIRouter(prefix="/api/v1/feishu", tags=["feishu"])
settings = get_settings()


@router.post("/login", response_model=Token)
def feishu_login(code: str, db: Session = Depends(get_db)):
    try:
        user_info = feishu_service.get_user_info(code)
        feishu_user_id = user_info.get("data", {}).get("user_id")
        name = user_info.get("data", {}).get("name")
        email = user_info.get("data", {}).get("email")
        
        if not feishu_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get Feishu user ID"
            )
        
        existing_user = db.query(User).filter(
            (User.email == email) | (User.username == feishu_user_id)
        ).first()
        
        if existing_user:
            user = existing_user
        else:
            user = User(
                email=email or f"{feishu_user_id}@feishu.local",
                username=feishu_user_id,
                full_name=name,
                role=UserRole.VIEWER,
                is_active=True,
                hashed_password="feishu_authorized"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Feishu login failed: {str(e)}"
        )


@router.post("/messages/text")
def send_text_message(
    receive_id_type: str,
    receive_id: str,
    text: str,
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RESEARCHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to send messages"
        )
    
    try:
        result = feishu_service.send_text_message(receive_id_type, receive_id, text)
        return {"success": True, "message_id": result.get("data", {}).get("message_id")}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )


@router.post("/messages/post")
def send_post_message(
    receive_id_type: str,
    receive_id: str,
    title: str,
    content: List[Dict[str, Any]],
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RESEARCHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to send messages"
        )
    
    try:
        result = feishu_service.send_post_message(receive_id_type, receive_id, title, content)
        return {"success": True, "message_id": result.get("data", {}).get("message_id")}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send post message: {str(e)}"
        )


@router.post("/wiki/spaces")
def create_wiki_space(
    name: str,
    description: str,
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RESEARCHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create wiki spaces"
        )
    
    try:
        result = feishu_service.create_wiki_space(name, description)
        return {"success": True, "space_id": result.get("data", {}).get("space_id")}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create wiki space: {str(e)}"
        )


@router.post("/bitable/apps")
def create_bitable_app(
    name: str,
    description: str,
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RESEARCHER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create bitable apps"
        )
    
    try:
        result = feishu_service.create_bitable_app(name, description)
        return {"success": True, "app_token": result.get("data", {}).get("app_token")}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create bitable app: {str(e)}"
        )


@router.post("/webhook")
async def webhook_handler(request: Request):
    try:
        body = await request.body()
        body_str = body.decode("utf-8")
        
        timestamp = request.headers.get("X-Lark-Request-Timestamp")
        nonce = request.headers.get("X-Lark-Request-Nonce")
        signature = request.headers.get("X-Lark-Signature")
        
        if not feishu_service.verify_signature(timestamp, nonce, signature, body_str):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature"
            )
        
        event_data = json.loads(body_str)
        
        # 处理飞书事件
        event_type = event_data.get("header", {}).get("event_type")
        
        if event_type == "im.message.receive_v1":
            # 处理消息接收事件
            pass
        elif event_type == "bitable.record.created":
            # 处理多维表格记录创建事件
            pass
        elif event_type == "wiki.node.created":
            # 处理知识库节点创建事件
            pass
        
        return {"challenge": event_data.get("challenge")}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook handler failed: {str(e)}"
        )
