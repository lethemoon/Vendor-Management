from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_NAME: str = "supplier_kb"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    ES_HOST: str = "localhost"
    ES_PORT: int = 9200

    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ROOT_USER: str = "minioadmin"
    MINIO_ROOT_PASSWORD: str = "minioadmin"

    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    @property
    def DATABASE_URL(self) -> str:
        return "sqlite:///./test.db"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
