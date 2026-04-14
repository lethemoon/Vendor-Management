import pytest
from fastapi.testclient import TestClient


def get_test_token(client: TestClient):
    """获取测试用的访问令牌"""
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "Test123!",
            "role": "admin"
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


def test_list_knowledge_categories(client: TestClient):
    """测试获取知识库分类列表"""
    token = get_test_token(client)
    response = client.get("/api/v1/knowledge/categories", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_knowledge_category(client: TestClient):
    """测试创建知识库分类"""
    token = get_test_token(client)
    category_data = {
        "name": "新分类",
        "description": "新分类描述",
        "is_active": True
    }
    response = client.post("/api/v1/knowledge/categories", json=category_data, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 201
    assert response.json()["name"] == category_data["name"]


def test_list_knowledge_tags(client: TestClient):
    """测试获取知识库标签列表"""
    token = get_test_token(client)
    response = client.get("/api/v1/knowledge/tags", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_knowledge_tag(client: TestClient):
    """测试创建知识库标签"""
    token = get_test_token(client)
    tag_data = {
        "name": "新标签",
        "is_active": True
    }
    response = client.post("/api/v1/knowledge/tags", json=tag_data, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 201
    assert response.json()["name"] == tag_data["name"]


def test_list_knowledge_bases(client: TestClient):
    """测试获取知识库列表"""
    token = get_test_token(client)
    response = client.get("/api/v1/knowledge", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_knowledge_base(client: TestClient):
    """测试创建知识库"""
    token = get_test_token(client)

    category_response = client.post(
        "/api/v1/knowledge/categories",
        json={"name": "测试分类", "description": "测试", "is_active": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    category_id = category_response.json()["id"]

    tag_response = client.post(
        "/api/v1/knowledge/tags",
        json={"name": "测试标签", "is_active": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    tag_id = tag_response.json()["id"]

    knowledge_data = {
        "title": "新知识库",
        "content": "新知识库内容",
        "summary": "新知识库摘要",
        "status": "draft",
        "type": "article",
        "category_id": category_id,
        "tag_ids": [tag_id],
        "is_featured": False,
        "is_active": True
    }
    response = client.post("/api/v1/knowledge", json=knowledge_data, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 201
    assert response.json()["title"] == knowledge_data["title"]


def test_update_knowledge_base(client: TestClient):
    """测试更新知识库"""
    token = get_test_token(client)

    category_response = client.post(
        "/api/v1/knowledge/categories",
        json={"name": "测试分类", "description": "测试", "is_active": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    category_id = category_response.json()["id"]

    knowledge_data = {
        "title": "测试知识库",
        "content": "初始内容",
        "summary": "初始摘要",
        "status": "draft",
        "type": "article",
        "category_id": category_id
    }
    create_response = client.post("/api/v1/knowledge", json=knowledge_data, headers={"Authorization": f"Bearer {token}"})
    knowledge_id = create_response.json()["id"]

    update_data = {
        "title": "更新后的知识库",
        "content": "更新后的内容",
        "status": "published"
    }
    update_response = client.put(f"/api/v1/knowledge/{knowledge_id}", json=update_data, headers={"Authorization": f"Bearer {token}"})
    assert update_response.status_code == 200
    assert update_response.json()["title"] == update_data["title"]
    assert update_response.json()["content"] == update_data["content"]


def test_publish_knowledge_base(client: TestClient):
    """测试发布知识库"""
    token = get_test_token(client)

    category_response = client.post(
        "/api/v1/knowledge/categories",
        json={"name": "测试分类", "description": "测试", "is_active": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    category_id = category_response.json()["id"]

    knowledge_data = {
        "title": "测试知识库",
        "content": "测试内容",
        "summary": "测试摘要",
        "status": "draft",
        "type": "article",
        "category_id": category_id
    }
    create_response = client.post("/api/v1/knowledge", json=knowledge_data, headers={"Authorization": f"Bearer {token}"})
    knowledge_id = create_response.json()["id"]

    publish_response = client.post(f"/api/v1/knowledge/{knowledge_id}/publish", headers={"Authorization": f"Bearer {token}"})
    assert publish_response.status_code == 200
    assert publish_response.json()["status"] == "published"


def test_delete_knowledge_base(client: TestClient):
    """测试删除知识库"""
    token = get_test_token(client)

    category_response = client.post(
        "/api/v1/knowledge/categories",
        json={"name": "测试分类", "description": "测试", "is_active": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    category_id = category_response.json()["id"]

    knowledge_data = {
        "title": "测试知识库",
        "content": "测试内容",
        "summary": "测试摘要",
        "status": "draft",
        "type": "article",
        "category_id": category_id
    }
    create_response = client.post("/api/v1/knowledge", json=knowledge_data, headers={"Authorization": f"Bearer {token}"})
    knowledge_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/v1/knowledge/{knowledge_id}", headers={"Authorization": f"Bearer {token}"})
    assert delete_response.status_code == 204


def test_search_knowledge_bases(client: TestClient):
    """测试搜索知识库"""
    token = get_test_token(client)

    category_response = client.post(
        "/api/v1/knowledge/categories",
        json={"name": "测试分类", "description": "测试", "is_active": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    category_id = category_response.json()["id"]

    # 创建多个知识库
    knowledge_data1 = {
        "title": "Python编程指南",
        "content": "Python是一种强大的编程语言",
        "summary": "Python编程入门",
        "status": "published",
        "type": "article",
        "category_id": category_id
    }
    knowledge_data2 = {
        "title": "JavaScript开发",
        "content": "JavaScript是前端开发的核心",
        "summary": "JavaScript基础",
        "status": "published",
        "type": "article",
        "category_id": category_id
    }
    client.post("/api/v1/knowledge", json=knowledge_data1, headers={"Authorization": f"Bearer {token}"})
    client.post("/api/v1/knowledge", json=knowledge_data2, headers={"Authorization": f"Bearer {token}"})

    # 搜索Python相关内容
    search_response = client.get("/api/v1/knowledge?search=Python", headers={"Authorization": f"Bearer {token}"})
    assert search_response.status_code == 200
    results = search_response.json()
    assert len(results) > 0
    assert any("Python" in result["title"] for result in results)


def test_add_knowledge_attachment(client: TestClient):
    """测试添加知识库附件"""
    token = get_test_token(client)

    category_response = client.post(
        "/api/v1/knowledge/categories",
        json={"name": "测试分类", "description": "测试", "is_active": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    category_id = category_response.json()["id"]

    knowledge_data = {
        "title": "测试知识库",
        "content": "测试内容",
        "summary": "测试摘要",
        "status": "draft",
        "type": "article",
        "category_id": category_id
    }
    create_response = client.post("/api/v1/knowledge", json=knowledge_data, headers={"Authorization": f"Bearer {token}"})
    knowledge_id = create_response.json()["id"]

    attachment_data = {
        "name": "测试附件.pdf",
        "file_path": "/path/to/attachment.pdf",
        "file_size": 1024,
        "mime_type": "application/pdf"
    }
    attachment_response = client.post(
        f"/api/v1/knowledge/{knowledge_id}/attachments",
        json=attachment_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert attachment_response.status_code == 201
    assert attachment_response.json()["name"] == attachment_data["name"]


def test_list_knowledge_attachments(client: TestClient):
    """测试获取知识库附件列表"""
    token = get_test_token(client)

    category_response = client.post(
        "/api/v1/knowledge/categories",
        json={"name": "测试分类", "description": "测试", "is_active": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    category_id = category_response.json()["id"]

    knowledge_data = {
        "title": "测试知识库",
        "content": "测试内容",
        "summary": "测试摘要",
        "status": "draft",
        "type": "article",
        "category_id": category_id
    }
    create_response = client.post("/api/v1/knowledge", json=knowledge_data, headers={"Authorization": f"Bearer {token}"})
    knowledge_id = create_response.json()["id"]

    # 添加附件
    attachment_data = {
        "name": "测试附件.pdf",
        "file_path": "/path/to/attachment.pdf",
        "file_size": 1024,
        "mime_type": "application/pdf"
    }
    client.post(
        f"/api/v1/knowledge/{knowledge_id}/attachments",
        json=attachment_data,
        headers={"Authorization": f"Bearer {token}"}
    )

    # 获取附件列表
    attachments_response = client.get(
        f"/api/v1/knowledge/{knowledge_id}/attachments",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert attachments_response.status_code == 200
    attachments = attachments_response.json()
    assert isinstance(attachments, list)
    assert len(attachments) > 0


def test_edge_case_empty_title(client: TestClient):
    """测试边缘情况：空标题"""
    token = get_test_token(client)

    category_response = client.post(
        "/api/v1/knowledge/categories",
        json={"name": "测试分类", "description": "测试", "is_active": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    category_id = category_response.json()["id"]

    # 空标题应该返回422
    knowledge_data = {
        "title": "",
        "content": "测试内容",
        "summary": "测试摘要",
        "status": "draft",
        "type": "article",
        "category_id": category_id
    }
    response = client.post("/api/v1/knowledge", json=knowledge_data, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 422


def test_edge_case_invalid_status(client: TestClient):
    """测试边缘情况：无效状态"""
    token = get_test_token(client)

    category_response = client.post(
        "/api/v1/knowledge/categories",
        json={"name": "测试分类", "description": "测试", "is_active": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    category_id = category_response.json()["id"]

    # 无效状态应该返回422
    knowledge_data = {
        "title": "测试知识库",
        "content": "测试内容",
        "summary": "测试摘要",
        "status": "invalid_status",
        "type": "article",
        "category_id": category_id
    }
    response = client.post("/api/v1/knowledge", json=knowledge_data, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 422
