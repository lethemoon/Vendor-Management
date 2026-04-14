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


def test_create_supplier(client: TestClient):
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "supplier_test@example.com",
            "username": "supplier_test",
            "password": "Test123!",
            "role": "researcher"
        }
    )
    
    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "supplier_test@example.com",
            "password": "Test123!"
        }
    )
    test_token = login_response.json()["access_token"]
    
    response = client.post(
        "/api/v1/suppliers",
        json={
            "name": "测试供应商",
            "legal_name": "测试供应商有限公司",
            "tax_id": "911100001234567890",
            "contact_person": "张三",
            "contact_phone": "13800138000",
            "contact_email": "zhangsan@example.com",
            "address": "北京市朝阳区",
            "website": "https://example.com",
            "industry": "制造业",
            "category": "电子设备",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "测试供应商"
    assert data["legal_name"] == "测试供应商有限公司"
    assert data["tax_id"] == "911100001234567890"
    assert data["contact_person"] == "张三"
    assert data["status"] == "active"
    assert "id" in data


def test_list_suppliers(client: TestClient):
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/suppliers",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_suppliers_with_filters(client: TestClient):
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/suppliers?status=active",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    
    response = client.get(
        "/api/v1/suppliers?category=电子设备",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200


def test_get_supplier(client: TestClient):
    token = get_auth_token(client)
    
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "get_supplier_test@example.com",
            "username": "get_supplier_test",
            "password": "Test123!",
            "role": "researcher"
        }
    )
    
    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "get_supplier_test@example.com",
            "password": "Test123!"
        }
    )
    test_token = login_response.json()["access_token"]
    
    create_response = client.post(
        "/api/v1/suppliers",
        json={
            "name": "获取测试供应商",
            "status": "pending"
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    supplier_id = create_response.json()["id"]
    
    response = client.get(
        f"/api/v1/suppliers/{supplier_id}",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "获取测试供应商"
    assert data["status"] == "pending"


def test_get_nonexistent_supplier(client: TestClient):
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/suppliers/99999",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_update_supplier(client: TestClient):
    token = get_auth_token(client)
    
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "update_supplier_test@example.com",
            "username": "update_supplier_test",
            "password": "Test123!",
            "role": "researcher"
        }
    )
    
    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "update_supplier_test@example.com",
            "password": "Test123!"
        }
    )
    test_token = login_response.json()["access_token"]
    
    create_response = client.post(
        "/api/v1/suppliers",
        json={
            "name": "更新测试供应商",
            "status": "pending"
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    supplier_id = create_response.json()["id"]
    
    response = client.put(
        f"/api/v1/suppliers/{supplier_id}",
        json={
            "name": "更新测试供应商-已修改",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "更新测试供应商-已修改"
    assert data["status"] == "active"


def test_delete_supplier(client: TestClient):
    token = get_auth_token(client)
    
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "delete_supplier_test@example.com",
            "username": "delete_supplier_test",
            "password": "Test123!",
            "role": "researcher"
        }
    )
    
    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "delete_supplier_test@example.com",
            "password": "Test123!"
        }
    )
    test_token = login_response.json()["access_token"]
    
    create_response = client.post(
        "/api/v1/suppliers",
        json={
            "name": "删除测试供应商"
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    supplier_id = create_response.json()["id"]
    
    response = client.delete(
        f"/api/v1/suppliers/{supplier_id}",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert response.status_code == 204
    
    get_response = client.get(
        f"/api/v1/suppliers/{supplier_id}",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    assert get_response.status_code == 404


def test_unauthorized_access(client: TestClient):
    response = client.get("/api/v1/suppliers")
    assert response.status_code == 401


def test_create_supplier_duplicate_tax_id(client: TestClient):
    token = get_auth_token(client)
    
    client.post(
        "/api/v1/suppliers",
        json={
            "name": "供应商1",
            "tax_id": "1234567890",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    response = client.post(
        "/api/v1/suppliers",
        json={
            "name": "供应商2",
            "tax_id": "1234567890",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Supplier with this tax ID already exists" in response.json()["detail"]


def test_list_suppliers_with_industry_filter(client: TestClient):
    token = get_auth_token(client)
    
    client.post(
        "/api/v1/suppliers",
        json={
            "name": "测试供应商",
            "industry": "制造业",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    response = client.get(
        "/api/v1/suppliers?industry=制造业",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200


def test_update_supplier_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.put(
        "/api/v1/suppliers/99999",
        json={"name": "不存在的供应商"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_update_supplier_duplicate_tax_id(client: TestClient):
    token = get_auth_token(client)
    
    client.post(
        "/api/v1/suppliers",
        json={
            "name": "供应商A",
            "tax_id": "9876543210",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    create_response = client.post(
        "/api/v1/suppliers",
        json={
            "name": "供应商B",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    supplier_id = create_response.json()["id"]
    
    response = client.put(
        f"/api/v1/suppliers/{supplier_id}",
        json={"tax_id": "9876543210"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Supplier with this tax ID already exists" in response.json()["detail"]


def test_delete_supplier_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.delete(
        "/api/v1/suppliers/99999",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_list_supplier_documents_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/suppliers/99999/documents",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_add_supplier_document_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/suppliers/99999/documents",
        json={
            "name": "测试文档",
            "file_path": "/path/to/doc"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_delete_supplier_document_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.delete(
        "/api/v1/suppliers/1/documents/99999",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404
