import pytest
from fastapi.testclient import TestClient


def get_auth_token(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "Test123!",
            "role": "researcher"
        }
    )
    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "test@example.com",
            "password": "Test123!"
        }
    )
    return login_response.json()["access_token"]


def test_create_confirmation(client: TestClient):
    """测试创建确认"""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/confirmations",
        json={
            "project_id": 1,
            "type": "项目立项确认"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "项目立项确认"
    assert data["status"] == "pending"


def test_list_confirmations(client: TestClient):
    """测试获取确认列表"""
    token = get_auth_token(client)
    
    # 先创建一个确认
    client.post(
        "/api/v1/confirmations",
        json={
            "project_id": 1,
            "type": "阶段流转确认"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    response = client.get(
        "/api/v1/confirmations",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_submit_confirmation_action(client: TestClient):
    """测试提交确认操作"""
    token = get_auth_token(client)
    
    # 先创建一个确认
    create_response = client.post(
        "/api/v1/confirmations",
        json={
            "project_id": 1,
            "type": "供应商入围确认"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    confirmation_id = create_response.json()["id"]
    
    # 提交确认操作
    response = client.post(
        f"/api/v1/confirmations/{confirmation_id}/action",
        json={
            "action": "approve",
            "comment": "同意此确认"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"
