#!/usr/bin/env python3
"""
创建测试账号脚本
"""
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.config import get_settings
from app.database import Base
from app.models.user import User, UserRole
from app.security import get_password_hash

def create_test_user():
    """创建测试账号"""
    settings = get_settings()
    
    print(f"Connecting to database: {settings.DATABASE_URL}")
    
    # 创建数据库引擎
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        # 创建所有表结构
        print("Creating database tables if not exists...")
        Base.metadata.create_all(bind=engine)
        
        # 创建会话
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # 创建新的测试账号
            test_email = "user@example.com"
            existing_user = db.query(User).filter(User.email == test_email).first()
            
            if not existing_user:
                print(f"Creating test user: {test_email}")
                test_user = User(
                    email=test_email,
                    username="user",
                    hashed_password=get_password_hash("User123!"),
                    role=UserRole.RESEARCHER,
                    is_active=True
                )
                db.add(test_user)
                db.commit()
                print("Test user created successfully!")
            else:
                print(f"User {test_email} already exists, skipping creation")
                
            # 显示所有用户
            print("\nAll users:")
            users = db.query(User).all()
            for user in users:
                print(f"  Email: {user.email}, Username: {user.username}, Role: {user.role}")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error creating test user: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_test_user()
