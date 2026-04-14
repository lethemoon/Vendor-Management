#!/usr/bin/env python3
"""
创建管理员用户
"""
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.config import get_settings
from app.models.user import User
from app.security import get_password_hash

def create_admin():
    """创建管理员用户"""
    settings = get_settings()
    
    print(f"Connecting to database: {settings.DATABASE_URL}")
    
    # 创建数据库引擎
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        # 创建会话
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # 检查是否已存在admin用户
            admin_user = db.query(User).filter(User.email == "admin@example.com").first()
            if not admin_user:
                print("Creating admin user...")
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
                db.commit()
                print("Admin user created successfully!")
            else:
                print("Admin user already exists")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error creating admin user: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_admin()
