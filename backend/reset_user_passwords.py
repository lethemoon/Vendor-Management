#!/usr/bin/env python3
"""
重置用户密码脚本
"""
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.config import get_settings
from app.database import Base
from app.models.user import User
from app.security import get_password_hash, verify_password

def reset_passwords():
    """重置用户密码"""
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
            print(f"Found {len(users)} users")
            
            # 重置密码
            test_passwords = {
                "admin@example.com": "Admin123!",
                "test@example.com": "Test123!",
                "user@example.com": "User123!",
                "newuser@example.com": "Test123!"
            }
            
            for user in users:
                if user.email in test_passwords:
                    new_password = test_passwords[user.email]
                    hashed_password = get_password_hash(new_password)
                    user.hashed_password = hashed_password
                    print(f"Reset password for {user.email} to {new_password}")
                    
                    # 验证密码
                    is_valid = verify_password(new_password, hashed_password)
                    print(f"Password verification: {'✓' if is_valid else '✗'}")
            
            db.commit()
            print("Passwords reset successfully!")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error resetting passwords: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reset_passwords()
