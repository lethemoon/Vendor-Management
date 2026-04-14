# 供应商调研知识库管理系统 API 文档

## 概述

本系统提供完整的RESTful API接口，用于管理供应商信息、调研问卷和知识库内容。

- **Base URL**: `http://localhost:8000`
- **API版本**: v1
- **认证方式**: OAuth2 JWT Bearer Token

## 快速开始

### 1. 注册用户

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "Password123!",
  "role": "admin"
}
```

**角色说明**:
- `admin`: 管理员，拥有所有权限
- `researcher`: 研究员，可以创建和管理内容
- `reviewer`: 审核者，可以审核内容
- `viewer`: 查看者，只能查看内容

### 2. 登录获取Token

```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=Password123!
```

**响应**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 3. 使用Token访问API

在请求头中添加:
```
Authorization: Bearer <your_access_token>
```

## API端点

### 认证模块

#### 注册用户
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "string",
  "username": "string",
  "password": "string",
  "role": "admin|researcher|reviewer|viewer",
  "full_name": "string (可选)"
}
```

#### 登录
```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=string&password=string
```

#### 获取当前用户信息
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### 供应商管理模块

#### 获取供应商列表
```http
GET /api/v1/suppliers
Authorization: Bearer <token>

查询参数:
- skip: number (跳过数量，默认0)
- limit: number (返回数量，默认100)
- status: string (状态过滤: active|pending|blacklisted)
- search: string (搜索关键词)
```

#### 创建供应商
```http
POST /api/v1/suppliers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "contact_person": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "website": "string (可选)",
  "industry": "string (可选)",
  "description": "string (可选)"
}
```

#### 获取供应商详情
```http
GET /api/v1/suppliers/{supplier_id}
Authorization: Bearer <token>
```

#### 更新供应商
```http
PUT /api/v1/suppliers/{supplier_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string (可选)",
  "contact_person": "string (可选)",
  "email": "string (可选)",
  "phone": "string (可选)",
  "address": "string (可选)",
  "website": "string (可选)",
  "industry": "string (可选)",
  "description": "string (可选)",
  "status": "active|pending|blacklisted (可选)"
}
```

#### 删除供应商
```http
DELETE /api/v1/suppliers/{supplier_id}
Authorization: Bearer <token>
```

### 调研问卷模块

#### 获取问卷列表
```http
GET /api/v1/surveys
Authorization: Bearer <token>

查询参数:
- skip: number (跳过数量，默认0)
- limit: number (返回数量，默认100)
- status: string (状态过滤: draft|published|closed|archived)
- search: string (搜索关键词)
```

#### 创建问卷
```http
POST /api/v1/surveys
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "status": "draft (可选)",
  "supplier_id": number (可选),
  "questions": [
    {
      "order": number,
      "question_text": "string",
      "question_type": "text|single_choice|multiple_choice|rating|date|number",
      "is_required": boolean,
      "options": ["string"] (可选，用于选择题)
    }
  ]
}
```

#### 获取问卷详情
```http
GET /api/v1/surveys/{survey_id}
Authorization: Bearer <token>
```

#### 更新问卷
```http
PUT /api/v1/surveys/{survey_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "string (可选)",
  "description": "string (可选)",
  "status": "draft|published|closed|archived (可选)"
}
```

#### 发布问卷
```http
POST /api/v1/surveys/{survey_id}/publish
Authorization: Bearer <token>
```

#### 删除问卷
```http
DELETE /api/v1/surveys/{survey_id}
Authorization: Bearer <token>
```

### 知识库模块

#### 分类管理

##### 获取分类列表
```http
GET /api/v1/knowledge/categories
Authorization: Bearer <token>

查询参数:
- skip: number (跳过数量，默认0)
- limit: number (返回数量，默认100)
- is_active: boolean (是否激活，可选)
```

##### 创建分类
```http
POST /api/v1/knowledge/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string (可选)",
  "parent_id": number (可选，父分类ID)
}
```

##### 获取分类详情
```http
GET /api/v1/knowledge/categories/{category_id}
Authorization: Bearer <token>
```

##### 更新分类
```http
PUT /api/v1/knowledge/categories/{category_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string (可选)",
  "description": "string (可选)",
  "parent_id": number (可选),
  "is_active": boolean (可选)
}
```

##### 删除分类
```http
DELETE /api/v1/knowledge/categories/{category_id}
Authorization: Bearer <token>
```

#### 标签管理

##### 获取标签列表
```http
GET /api/v1/knowledge/tags
Authorization: Bearer <token>

查询参数:
- skip: number (跳过数量，默认0)
- limit: number (返回数量，默认100)
- is_active: boolean (是否激活，可选)
```

##### 创建标签
```http
POST /api/v1/knowledge/tags
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string"
}
```

##### 获取标签详情
```http
GET /api/v1/knowledge/tags/{tag_id}
Authorization: Bearer <token>
```

##### 更新标签
```http
PUT /api/v1/knowledge/tags/{tag_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string (可选)",
  "is_active": boolean (可选)
}
```

##### 删除标签
```http
DELETE /api/v1/knowledge/tags/{tag_id}
Authorization: Bearer <token>
```

#### 知识库内容管理

##### 获取知识库列表
```http
GET /api/v1/knowledge
Authorization: Bearer <token>

查询参数:
- skip: number (跳过数量，默认0)
- limit: number (返回数量，默认100)
- status: string (状态过滤: draft|published|archived)
- type: string (类型过滤: article|document|faq|guideline)
- category_id: number (分类ID过滤)
- supplier_id: number (供应商ID过滤)
- survey_id: number (问卷ID过滤)
- is_featured: boolean (是否推荐过滤)
- search: string (搜索关键词)
```

##### 创建知识库
```http
POST /api/v1/knowledge
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "string",
  "content": "string",
  "summary": "string",
  "type": "article|document|faq|guideline",
  "status": "draft (可选)",
  "category_id": number (可选),
  "supplier_id": number (可选),
  "survey_id": number (可选),
  "tag_ids": [number] (可选，标签ID列表),
  "is_featured": boolean (可选，是否推荐),
  "meta_data": object (可选，元数据)
}
```

##### 获取知识库详情
```http
GET /api/v1/knowledge/{knowledge_id}
Authorization: Bearer <token>
```

##### 更新知识库
```http
PUT /api/v1/knowledge/{knowledge_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "string (可选)",
  "content": "string (可选)",
  "summary": "string (可选)",
  "type": "article|document|faq|guideline (可选)",
  "status": "draft|published|archived (可选)",
  "category_id": number (可选),
  "tag_ids": [number] (可选),
  "is_featured": boolean (可选),
  "is_active": boolean (可选)
}
```

##### 发布知识库
```http
POST /api/v1/knowledge/{knowledge_id}/publish
Authorization: Bearer <token>
```

##### 删除知识库
```http
DELETE /api/v1/knowledge/{knowledge_id}
Authorization: Bearer <token>
```

#### 附件管理

##### 获取附件列表
```http
GET /api/v1/knowledge/{knowledge_id}/attachments
Authorization: Bearer <token>
```

##### 添加附件
```http
POST /api/v1/knowledge/{knowledge_id}/attachments
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "file_path": "string",
  "file_size": number (可选),
  "mime_type": "string (可选)"
}
```

##### 上传附件文件
```http
POST /api/v1/knowledge/{knowledge_id}/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form data:
- file: <file>
```

**支持的文件类型**:
- Excel: .xlsx, .xls
- Markdown: .md
- PPT: .ppt, .pptx
- PDF: .pdf
- Word: .doc, .docx
- XMind: .xmind

**文件大小限制**: 100MB

**响应**:
```json
{
  "id": number,
  "knowledge_id": number,
  "name": "string",
  "file_path": "string",
  "file_size": number,
  "mime_type": "string",
  "uploaded_by_id": number,
  "is_active": boolean,
  "created_at": "string",
  "uploaded_by": {
    "id": number,
    "email": "string",
    "username": "string",
    "full_name": "string",
    "role": "string"
  }
}
```

##### 删除附件
```http
DELETE /api/v1/knowledge/{knowledge_id}/attachments/{attachment_id}
Authorization: Bearer <token>
```

## 错误码说明

| HTTP状态码 | 说明 |
|-----------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 204 | 删除成功 |
| 400 | 请求参数错误 |
| 401 | 未授权，需要登录 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 422 | 数据验证失败 |
| 500 | 服务器内部错误 |

## 使用示例

### Python示例 (使用requests)

```python
import requests

BASE_URL = "http://localhost:8000"

# 1. 注册用户
register_data = {
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!",
    "role": "admin"
}
response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=register_data)

# 2. 登录
login_data = {
    "username": "test@example.com",
    "password": "Test123!"
}
response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
token = response.json()["access_token"]

# 3. 使用token访问API
headers = {"Authorization": f"Bearer {token}"}

# 创建知识库分类
category_data = {
    "name": "供应商管理",
    "description": "关于供应商管理的文档"
}
response = requests.post(
    f"{BASE_URL}/api/v1/knowledge/categories",
    json=category_data,
    headers=headers
)
category_id = response.json()["id"]

# 创建知识库
knowledge_data = {
    "title": "供应商评估指南",
    "content": "这是供应商评估的详细指南...",
    "summary": "供应商评估流程和标准",
    "type": "guideline",
    "status": "published",
    "category_id": category_id
}
response = requests.post(
    f"{BASE_URL}/api/v1/knowledge",
    json=knowledge_data,
    headers=headers
)
print("知识库创建成功:", response.json())
```

### JavaScript示例 (使用axios)

```javascript
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

// 1. 注册用户
async function registerUser(email, username, password, role) {
  const response = await axios.post(`${API_BASE}/api/v1/auth/register`, {
    email,
    username,
    password,
    role
  });
  return response.data;
}

// 2. 登录
async function login(email, password) {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);
  
  const response = await axios.post(`${API_BASE}/api/v1/auth/login`, formData);
  return response.data.access_token;
}

// 3. 创建API客户端
function createApiClient(token) {
  return axios.create({
    baseURL: API_BASE,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

// 使用示例
async function main() {
  await registerUser('test@example.com', 'testuser', 'Test123!', 'admin');
  const token = await login('test@example.com', 'Test123!');
  const api = createApiClient(token);
  
  // 创建分类
  const category = await api.post('/api/v1/knowledge/categories', {
    name: '供应商管理',
    description: '供应商管理文档'
  });
  
  // 创建知识库
  const knowledge = await api.post('/api/v1/knowledge', {
    title: '供应商评估指南',
    content: '详细内容...',
    summary: '摘要',
    type: 'guideline',
    status: 'published',
    category_id: category.data.id
  });
  
  console.log('知识库创建成功:', knowledge.data);
}

main();
```

## 自动生成的API文档

FastAPI自动提供交互式API文档:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

可以在这些页面中直接测试API接口。

## 注意事项

1. 所有需要认证的接口都需要在请求头中包含有效的JWT token
2. Token有效期为30分钟，过期后需要重新登录
3. 密码长度至少8位，必须包含大小写字母和数字
4. 建议在生产环境中修改SECRET_KEY配置
