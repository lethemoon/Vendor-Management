from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import os

# 导入日志配置
import app.config.logging
# 导入监控中间件
from app.middleware.monitoring import MonitoringMiddleware

from app.config import get_settings
from app.api.v1.auth import router as auth_router
from app.api.v1.suppliers import router as suppliers_router
from app.api.v1.surveys import router as surveys_router
from app.api.v1.knowledge import router as knowledge_router
from app.database import Base, engine

# 导入所有模型，确保它们被注册到Base.metadata
from app.models import user, supplier, survey, knowledge

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        # 显式导入所有模型，确保它们被注册到Base.metadata
        from app.models.user import User
        from app.models.supplier import Supplier, SupplierDocument
        from app.models.survey import Survey, SurveyQuestion, SurveyResponse, SurveyAnswer
        from app.models.knowledge import KnowledgeBase, KnowledgeCategory, KnowledgeTag, KnowledgeAttachment
        
        # 创建所有表结构
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        import traceback
        traceback.print_exc()
    yield
    # Shutdown


app = FastAPI(
    title="供应商调研知识库管理系统 API",
    description="供应商信息管理、调研问卷管理、知识库管理系统",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加监控中间件
app.add_middleware(MonitoringMiddleware)

app.include_router(auth_router)
app.include_router(suppliers_router)
app.include_router(surveys_router)
app.include_router(knowledge_router)

# 确保dist目录存在
frontend_dist = "/workspace/frontend/dist"
if os.path.exists(frontend_dist):
    # 配置静态文件服务，处理客户端路由
    from fastapi.responses import FileResponse
    
    # 挂载静态文件
    app.mount("/assets", StaticFiles(directory=f"{frontend_dist}/assets"), name="assets")
    
    # 处理所有其他路由，返回index.html以支持客户端路由
    @app.get("/{path:path}")
    async def serve_spa(path: str):
        return FileResponse(f"{frontend_dist}/index.html")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}





if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True,
    )
