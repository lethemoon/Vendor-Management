#!/usr/bin/env python3
"""
生产环境数据库初始化脚本
"""
import sys
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.config import get_settings
from app.database import Base

# 导入所有模型，确保它们被注册到Base.metadata
from app.models.user import User
from app.models.supplier import Supplier, SupplierDocument
from app.models.survey import Survey, SurveyQuestion, SurveyResponse, SurveyAnswer
from app.models.knowledge import KnowledgeBase, KnowledgeCategory, KnowledgeTag, KnowledgeAttachment

def init_database():
    """初始化数据库"""
    settings = get_settings()
    
    print(f"Connecting to database: {settings.DATABASE_URL}")
    
    # 创建数据库引擎
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        # 创建所有表结构
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        
        # 创建会话
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # 检查是否已有用户
            existing_user = db.query(User).first()
            if not existing_user:
                print("Creating admin user...")
                from app.security import get_password_hash
                from app.models.user import UserRole
                
                # 创建管理员用户
                admin_user = User(
                    email="admin@example.com",
                    username="admin",
                    hashed_password=get_password_hash("Admin123!"),
                    role=UserRole.ADMIN,
                    is_active=True
                )
                db.add(admin_user)
                
                # 创建测试用户
                test_user = User(
                    email="test@example.com",
                    username="testuser",
                    hashed_password=get_password_hash("Test123!"),
                    role=UserRole.RESEARCHER,
                    is_active=True
                )
                db.add(test_user)
                
                db.commit()
                print("Admin and test users created successfully!")
            else:
                print("Users already exist, skipping user creation")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    init_database()
