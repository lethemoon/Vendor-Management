import pytest
from fastapi.testclient import TestClient


def get_auth_token(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test_survey@example.com",
            "username": "test_survey_user",
            "password": "Test123!",
            "role": "researcher"
        }
    )
    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "test_survey@example.com",
            "password": "Test123!"
        }
    )
    return login_response.json()["access_token"]


def create_test_supplier(client: TestClient, token: str):
    response = client.post(
        "/api/v1/suppliers",
        json={
            "name": "问卷测试供应商",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json()["id"]


def test_create_survey(client: TestClient):
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/surveys",
        json={
            "title": "供应商满意度调研",
            "description": "这是一个测试调研问卷",
            "version": 1,
            "questions": [
                {
                    "title": "您对我们的服务满意吗？",
                    "type": "single_choice",
                    "options": ["非常满意", "满意", "一般", "不满意"],
                    "is_required": True,
                    "order": 1
                },
                {
                    "title": "请提供您的建议",
                    "type": "text",
                    "is_required": False,
                    "order": 2
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "供应商满意度调研"
    assert data["description"] == "这是一个测试调研问卷"
    assert data["status"] == "draft"
    assert "id" in data


def test_list_surveys(client: TestClient):
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/surveys",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_survey(client: TestClient):
    token = get_auth_token(client)
    
    create_response = client.post(
        "/api/v1/surveys",
        json={
            "title": "获取测试调研",
            "description": "用于测试获取详情的调研"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = create_response.json()["id"]
    
    response = client.get(
        f"/api/v1/surveys/{survey_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "获取测试调研"
    assert data["description"] == "用于测试获取详情的调研"
    assert "questions" in data


def test_update_survey(client: TestClient):
    token = get_auth_token(client)
    
    create_response = client.post(
        "/api/v1/surveys",
        json={
            "title": "更新测试调研",
            "description": "原描述"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = create_response.json()["id"]
    
    response = client.put(
        f"/api/v1/surveys/{survey_id}",
        json={
            "title": "更新测试调研-已修改",
            "description": "新描述"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "更新测试调研-已修改"
    assert data["description"] == "新描述"


def test_publish_survey(client: TestClient):
    token = get_auth_token(client)
    
    create_response = client.post(
        "/api/v1/surveys",
        json={
            "title": "发布测试调研",
            "questions": [
                {
                    "title": "测试问题",
                    "type": "text",
                    "order": 1
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = create_response.json()["id"]
    
    response = client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "published"
    assert "published_at" in data


def test_add_survey_question(client: TestClient):
    token = get_auth_token(client)
    
    create_response = client.post(
        "/api/v1/surveys",
        json={
            "title": "添加问题测试调研"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = create_response.json()["id"]
    
    response = client.post(
        f"/api/v1/surveys/{survey_id}/questions",
        json={
            "title": "新添加的问题",
            "type": "rating",
            "is_required": True,
            "order": 1
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "新添加的问题"
    assert data["type"] == "rating"


def test_list_survey_questions(client: TestClient):
    token = get_auth_token(client)
    
    create_response = client.post(
        "/api/v1/surveys",
        json={
            "title": "列出问题测试调研",
            "questions": [
                {
                    "title": "问题1",
                    "type": "text",
                    "order": 1
                },
                {
                    "title": "问题2",
                    "type": "text",
                    "order": 2
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = create_response.json()["id"]
    
    response = client.get(
        f"/api/v1/surveys/{survey_id}/questions",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    questions = response.json()
    assert len(questions) == 2


def test_submit_survey_response(client: TestClient):
    token = get_auth_token(client)
    supplier_id = create_test_supplier(client, token)
    
    create_response = client.post(
        "/api/v1/surveys",
        json={
            "title": "提交响应测试调研",
            "questions": [
                {
                    "title": "满意度",
                    "type": "single_choice",
                    "options": ["好", "中", "差"],
                    "order": 1
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = create_response.json()["id"]
    
    client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    get_survey_response = client.get(
        f"/api/v1/surveys/{survey_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    question_id = get_survey_response.json()["questions"][0]["id"]
    
    response = client.post(
        f"/api/v1/surveys/{survey_id}/responses",
        json={
            "supplier_id": supplier_id,
            "notes": "测试响应",
            "answers": [
                {
                    "question_id": question_id,
                    "value": "好"
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["supplier_id"] == supplier_id
    assert data["is_complete"] == True
    assert len(data["answers"]) == 1


def test_list_survey_responses(client: TestClient):
    token = get_auth_token(client)
    
    create_response = client.post(
        "/api/v1/surveys",
        json={
            "title": "列出响应测试调研",
            "questions": [
                {
                    "title": "测试问题",
                    "type": "text",
                    "order": 1
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = create_response.json()["id"]
    
    client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    response = client.get(
        f"/api/v1/surveys/{survey_id}/responses",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_delete_survey(client: TestClient):
    token = get_auth_token(client)
    
    create_response = client.post(
        "/api/v1/surveys",
        json={
            "title": "删除测试调研"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = create_response.json()["id"]
    
    response = client.delete(
        f"/api/v1/surveys/{survey_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 204
    
    get_response = client.get(
        f"/api/v1/surveys/{survey_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert get_response.status_code == 404


def test_unauthorized_access(client: TestClient):
    response = client.get("/api/v1/surveys")
    assert response.status_code == 401


def test_list_surveys_with_status_filter(client: TestClient):
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/surveys",
        json={
            "title": "状态过滤测试调研"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = response.json()["id"]
    
    client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    response = client.get(
        "/api/v1/surveys?status=published",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200


def test_list_surveys_with_active_filter(client: TestClient):
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/surveys?is_active=true",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200


def test_update_survey_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.put(
        "/api/v1/surveys/99999",
        json={"title": "不存在的调研"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_publish_survey_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/surveys/99999/publish",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_publish_survey_already_published(client: TestClient):
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/surveys",
        json={
            "title": "重复发布测试调研",
            "questions": [
                {
                    "title": "测试问题",
                    "type": "text",
                    "order": 1
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = response.json()["id"]
    
    client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    response = client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Only draft surveys can be published" in response.json()["detail"]


def test_add_survey_question_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/surveys/99999/questions",
        json={
            "title": "测试问题",
            "type": "text",
            "order": 1
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_add_survey_question_to_published_survey(client: TestClient):
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/surveys",
        json={
            "title": "已发布调研",
            "questions": [
                {
                    "title": "问题1",
                    "type": "text",
                    "order": 1
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = response.json()["id"]
    
    client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    response = client.post(
        f"/api/v1/surveys/{survey_id}/questions",
        json={
            "title": "新问题",
            "type": "text",
            "order": 2
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Can only add questions to draft surveys" in response.json()["detail"]


def test_update_survey_question_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.put(
        "/api/v1/surveys/1/questions/99999",
        json={"title": "更新问题"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_update_survey_question_in_published_survey(client: TestClient):
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/surveys",
        json={
            "title": "测试调研",
            "questions": [
                {
                    "title": "原始问题",
                    "type": "text",
                    "order": 1
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = response.json()["id"]
    
    # 获取问卷详情以获取问题ID
    get_response = client.get(
        f"/api/v1/surveys/{survey_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    question_id = get_response.json()["questions"][0]["id"]
    
    client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    response = client.put(
        f"/api/v1/surveys/{survey_id}/questions/{question_id}",
        json={"title": "更新的问题"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Can only update questions in draft surveys" in response.json()["detail"]


def test_delete_survey_question_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.delete(
        "/api/v1/surveys/1/questions/99999",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_delete_survey_question_from_published_survey(client: TestClient):
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/surveys",
        json={
            "title": "测试调研",
            "questions": [
                {
                    "title": "测试问题",
                    "type": "text",
                    "order": 1
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = response.json()["id"]
    
    # 获取问卷详情以获取问题ID
    get_response = client.get(
        f"/api/v1/surveys/{survey_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    question_id = get_response.json()["questions"][0]["id"]
    
    client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    response = client.delete(
        f"/api/v1/surveys/{survey_id}/questions/{question_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Can only delete questions from draft surveys" in response.json()["detail"]


def test_submit_survey_response_not_found(client: TestClient):
    token = get_auth_token(client)
    supplier_id = create_test_supplier(client, token)
    
    response = client.post(
        "/api/v1/surveys/99999/responses",
        json={
            "supplier_id": supplier_id,
            "answers": []
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_submit_survey_response_to_draft_survey(client: TestClient):
    token = get_auth_token(client)
    supplier_id = create_test_supplier(client, token)
    
    response = client.post(
        "/api/v1/surveys",
        json={
            "title": "草稿调研",
            "questions": [
                {
                    "title": "测试问题",
                    "type": "text",
                    "order": 1
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    survey_id = response.json()["id"]
    
    # 获取问卷详情以获取问题ID
    get_response = client.get(
        f"/api/v1/surveys/{survey_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    question_id = get_response.json()["questions"][0]["id"]
    
    response = client.post(
        f"/api/v1/surveys/{survey_id}/responses",
        json={
            "supplier_id": supplier_id,
            "answers": [
                {
                    "question_id": question_id,
                    "value": "测试回答"
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Can only submit responses to published surveys" in response.json()["detail"]


def test_get_survey_response_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/surveys/1/responses/99999",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_update_survey_response_not_found(client: TestClient):
    token = get_auth_token(client)
    
    response = client.put(
        "/api/v1/surveys/1/responses/99999",
        json={"is_complete": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404
