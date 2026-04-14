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


def test_create_notification(client: TestClient):
    """测试创建通知"""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/notifications",
        json={
            "title": "测试通知",
            "type": "system",
            "priority": "normal",
            "content": "这是一条测试通知消息",
            "recipient_id": 1
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "测试通知"
    assert data["type"] == "system"
    assert data["priority"] == "normal"


def test_list_notifications(client: TestClient):
    """测试获取通知列表"""
    token = get_auth_token(client)
    
    # 先创建一个通知
    client.post(
        "/api/v1/notifications",
        json={
            "title": "另一条测试通知",
            "type": "project",
            "priority": "important",
            "content": "这是一条高优先级通知",
            "recipient_id": 1
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    response = client.get(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


def test_mark_notification_read(client: TestClient):
    """测试标记通知为已读"""
    token = get_auth_token(client)
    
    # 先创建一个通知
    create_response = client.post(
        "/api/v1/notifications",
        json={
            "title": "待读通知",
            "type": "confirmation",
            "priority": "urgent",
            "content": "这条通知会被标记为已读",
            "recipient_id": 1
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    notification_id = create_response.json()["id"]
    
    # 标记为已读
    response = client.post(
        "/api/v1/notifications/mark-read",
        json={
            "notification_ids": [notification_id]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "marked_count" in data


def test_get_unread_count(client: TestClient):
    """测试获取未读通知数量"""
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/notifications/unread-count",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "unread_count" in data
    assert isinstance(data["unread_count"], int)
