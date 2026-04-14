import pytest
from fastapi.testclient import TestClient


def test_simple_knowledge_category(client: TestClient):
    """简单测试创建分类"""
    # 先注册用户
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "Test123!",
            "role": "admin"
        }
    )
    
    # 登录获取令牌
    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "test@example.com",
            "password": "Test123!"
        }
    )
    token = login_response.json()["access_token"]
    
    # 创建分类
    category_data = {
        "name": "测试分类",
        "description": "测试分类描述",
        "is_active": True
    }
    response = client.post(
        "/api/v1/knowledge/categories",
        json=category_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    assert response.json()["name"] == category_data["name"]
