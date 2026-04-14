#!/usr/bin/env python3
"""
检查数据库中的用户
"""
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.config import get_settings
from app.models.user import User

def check_users():
    """检查数据库中的用户"""
    settings = get_settings()
    
    print(f"Connecting to database: {settings.DATABASE_URL}")
    
    # 创建数据库引擎
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        # 创建会话
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # 获取所有用户
            users = db.query(User).all()
            print(f"Found {len(users)} users:")
            
            for user in users:
                print(f"- Email: {user.email}")
                print(f"  Username: {user.username}")
                print(f"  Role: {user.role}")
                print(f"  Active: {user.is_active}")
                print()
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error checking users: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_users()
