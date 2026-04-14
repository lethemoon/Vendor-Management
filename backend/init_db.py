#!/usr/bin/env python3
"""
数据库初始化脚本
"""

from app.database import Base, engine

# 导入所有模型
from app.models.user import User
from app.models.supplier import Supplier, SupplierDocument
from app.models.survey import Survey, SurveyQuestion, SurveyResponse, SurveyAnswer
from app.models.knowledge import KnowledgeBase, KnowledgeCategory, KnowledgeTag, KnowledgeAttachment

print("Creating database tables...")
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
except Exception as e:
    print(f"Error creating database tables: {e}")
    import traceback
    traceback.print_exc()
