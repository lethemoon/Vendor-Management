from fastapi import APIRouter
from app.api.v1 import auth, knowledge, suppliers, surveys, confirmation

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(knowledge.router)
api_router.include_router(suppliers.router)
api_router.include_router(surveys.router)
api_router.include_router(confirmation.router)
