import pytest
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

@pytest.fixture(scope="function", autouse=True)
def mock_database():
    import app.database
    from app.database import Base as OriginalBase
    from main import app as fastapi_app
    
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
    
    test_engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    
    original_engine = app.database.engine
    original_get_db = app.database.get_db
    
    app.database.engine = test_engine
    
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()
    
    fastapi_app.dependency_overrides[original_get_db] = override_get_db
    
    OriginalBase.metadata.create_all(bind=test_engine)
    
    yield
    
    OriginalBase.metadata.drop_all(bind=test_engine)
    app.database.engine = original_engine
    fastapi_app.dependency_overrides.pop(original_get_db, None)
    test_engine.dispose()


@pytest.fixture(scope="function")
def client():
    from main import app
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def db(mock_database):
    from app.database import get_db
    return next(get_db())


@pytest.fixture(scope="function")
def test_user(db):
    from app.models.user import User, UserRole
    from app.security import get_password_hash
    
    # 创建测试用户
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpassword"),
        full_name="Test User",
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 生成访问令牌
    from jose import jwt
    from app.config import get_settings
    settings = get_settings()
    
    access_token = jwt.encode(
        {"sub": str(user.id)}, 
        settings.JWT_SECRET_KEY, 
        algorithm=settings.JWT_ALGORITHM
    )
    user.access_token = access_token
    
    yield user
