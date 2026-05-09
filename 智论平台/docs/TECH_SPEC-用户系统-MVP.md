# 用户系统 MVP版本 技术规格

> 版本：1.0.0  
> 日期：2026-05-09  
> 负责人：ArchitectAgent  
> 状态：待批准

---

## 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     前端层 (Next.js)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 注册页面  │  │ 登录页面  │  │ 个人中心  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/HTTPS
┌────────────────────▼────────────────────────────────────┐
│                   API层 (Fastify)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 认证路由  │  │ 用户路由  │  │ 中间件    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   服务层 (Services)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 认证服务  │  │ 用户服务  │  │ 邮件服务  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 数据层 (PostgreSQL + Redis)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ User表   │  │ Token缓存 │  │ 限流计数  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

---

## 数据库设计

### Prisma Schema

```prisma
// 用户表（已在schema.prisma中定义）
model User {
  id            String    @id @default(uuid())
  email         String?   @unique
  phone         String?   @unique
  password      String
  name          String
  avatar        String?
  role          UserRole  @default(Student)
  status        UserStatus @default(Active)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([email])
  @@index([phone])
  @@index([createdAt])
  @@map("users")
}

// 密码重置令牌表（新增）
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@index([userId])
  @@map("password_reset_tokens")
}

// 登录日志表（新增）
model LoginLog {
  id        String   @id @default(uuid())
  userId    String
  ip        String
  userAgent String?
  success   Boolean
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([createdAt])
  @@map("login_logs")
}
```

### 数据库索引设计

| 表名 | 索引字段 | 类型 | 用途 |
|-----|---------|------|------|
| users | email | UNIQUE | 邮箱唯一性检查 |
| users | phone | UNIQUE | 手机号唯一性检查 |
| users | createdAt | INDEX | 按时间查询用户 |
| password_reset_tokens | token | UNIQUE | 重置令牌查询 |
| password_reset_tokens | userId | INDEX | 用户重置记录查询 |
| login_logs | userId | INDEX | 用户登录记录查询 |
| login_logs | createdAt | INDEX | 按时间查询日志 |

---

## API接口定义

### 1. 用户注册

**接口：** `POST /api/v1/auth/register`

**请求参数：**
```typescript
{
  email?: string;        // 邮箱（邮箱注册时必填）
  phone?: string;        // 手机号（手机号注册时必填）
  password: string;      // 密码（8-32位，包含字母和数字）
  name: string;          // 用户姓名（2-50位）
}
```

**响应结构：**
```typescript
{
  success: boolean;
  data: {
    user: {
      id: string;
      email?: string;
      phone?: string;
      name: string;
      role: string;
      createdAt: string;
    };
    token: string;  // JWT Token
  };
  message: string;
}
```

**错误码：**
- `400` - 参数校验失败
- `409` - 邮箱/手机号已存在
- `500` - 服务器错误

**验证规则：**
```typescript
const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/).optional(),
  password: z.string()
    .min(8, '密码至少8位')
    .max(32, '密码最多32位')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]+$/, '密码必须包含字母和数字'),
  name: z.string().min(2).max(50),
}).refine(data => data.email || data.phone, {
  message: '邮箱或手机号至少填写一个',
});
```

---

### 2. 用户登录

**接口：** `POST /api/v1/auth/login`

**请求参数：**
```typescript
{
  email?: string;     // 邮箱（邮箱登录时必填）
  phone?: string;     // 手机号（手机号登录时必填）
  password: string;   // 密码
}
```

**响应结构：**
```typescript
{
  success: boolean;
  data: {
    user: {
      id: string;
      email?: string;
      phone?: string;
      name: string;
      role: string;
      avatar?: string;
    };
    token: string;  // JWT Token
  };
  message: string;
}
```

**错误码：**
- `400` - 参数校验失败
- `401` - 账号或密码错误
- `403` - 账号已被锁定
- `429` - 登录失败次数过多，请15分钟后重试

**限流策略：**
- 同一IP：10次/分钟
- 同一账号：5次/15分钟（失败后锁定）

---

### 3. 用户登出

**接口：** `POST /api/v1/auth/logout`

**请求头：**
```
Authorization: Bearer <token>
```

**响应结构：**
```typescript
{
  success: boolean;
  message: string;
}
```

---

### 4. 忘记密码

**接口：** `POST /api/v1/auth/forgot-password`

**请求参数：**
```typescript
{
  email: string;  // 邮箱
}
```

**响应结构：**
```typescript
{
  success: boolean;
  message: string;  // "重置链接已发送到您的邮箱"
}
```

**流程：**
1. 验证邮箱是否存在
2. 生成重置令牌（UUID）
3. 保存到password_reset_tokens表
4. 发送重置邮件
5. 返回成功消息（无论邮箱是否存在，都返回相同消息，防止枚举攻击）

---

### 5. 重置密码

**接口：** `POST /api/v1/auth/reset-password`

**请求参数：**
```typescript
{
  token: string;      // 重置令牌
  password: string;   // 新密码
}
```

**响应结构：**
```typescript
{
  success: boolean;
  data: {
    user: {
      id: string;
      email?: string;
      name: string;
    };
    token: string;  // 自动登录Token
  };
  message: string;
}
```

**错误码：**
- `400` - 参数校验失败
- `404` - 令牌不存在或已过期
- `410` - 令牌已使用

---

### 6. 获取个人信息

**接口：** `GET /api/v1/user/profile`

**请求头：**
```
Authorization: Bearer <token>
```

**响应结构：**
```typescript
{
  success: boolean;
  data: {
    id: string;
    email?: string;
    phone?: string;
    name: string;
    avatar?: string;
    role: string;
    status: string;
    createdAt: string;
    usageStats: {
      totalPapers: number;
      totalWords: number;
      lastActiveAt: string;
    };
  };
}
```

---

### 7. 更新个人信息

**接口：** `PUT /api/v1/user/profile`

**请求头：**
```
Authorization: Bearer <token>
```

**请求参数：**
```typescript
{
  name?: string;    // 用户姓名
  avatar?: string;  // 头像URL
}
```

**响应结构：**
```typescript
{
  success: boolean;
  data: {
    id: string;
    name: string;
    avatar?: string;
    updatedAt: string;
  };
  message: string;
}
```

---

### 8. 修改密码

**接口：** `PUT /api/v1/user/password`

**请求头：**
```
Authorization: Bearer <token>
```

**请求参数：**
```typescript
{
  oldPassword: string;  // 旧密码
  newPassword: string;  // 新密码
}
```

**响应结构：**
```typescript
{
  success: boolean;
  message: string;
}
```

**错误码：**
- `400` - 参数校验失败
- `401` - 旧密码错误

---

## 前端组件设计

### 组件树

```
App
├── AuthProvider (Context)
│   ├── LoginPage
│   │   ├── EmailLoginForm
│   │   ├── PhoneLoginForm
│   │   └── SocialLoginButtons
│   │
│   ├── RegisterPage
│   │   ├── EmailRegisterForm
│   │   ├── PhoneRegisterForm
│   │   └── TermsCheckbox
│   │
│   ├── ForgotPasswordPage
│   │   └── ForgotPasswordForm
│   │
│   ├── ResetPasswordPage
│   │   └── ResetPasswordForm
│   │
│   └── ProfilePage
│       ├── ProfileHeader
│       ├── ProfileForm
│       ├── PasswordChangeForm
│       └── UsageStats
│
└── ProtectedRoute (HOC)
```

### 数据流

```
用户操作 → React Hook → API Client → 后端API
    ↓
状态更新 ← Zustand Store ← 响应数据
    ↓
UI更新
```

### 状态管理

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}
```

---

## 安全性设计

### 1. 密码安全

**加密算法：** bcrypt
- Salt轮数：12
- 密码长度：8-32位
- 强度要求：必须包含字母和数字

**实现：**
```typescript
import bcrypt from 'bcryptjs';

const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

---

### 2. JWT Token设计

**Token结构：**
```typescript
{
  userId: string;
  email?: string;
  phone?: string;
  role: string;
  iat: number;  // 签发时间
  exp: number;  // 过期时间（7天）
}
```

**Token刷新策略：**
- Token有效期：7天
- 自动刷新：剩余时间 < 1天时自动刷新
- Redis黑名单：登出时将Token加入黑名单

**实现：**
```typescript
import jwt from '@fastify/jwt';

const generateToken = (user: User): string => {
  return fastify.jwt.sign({
    userId: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
  }, {
    expiresIn: '7d',
  });
};
```

---

### 3. 限流策略

**实现：** @fastify/rate-limit + Redis

**配置：**
```typescript
await fastify.register(rateLimit, {
  max: 100,  // 全局：100次/15分钟
  timeWindow: '15 minutes',
  redis: redisClient,
  keyGenerator: (request) => {
    return request.ip;  // 按IP限流
  },
});

// 登录接口特殊限流
fastify.post('/api/v1/auth/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes',
      keyGenerator: (request) => {
        const { email, phone } = request.body;
        return `login:${email || phone}`;
      },
    },
  },
}, loginHandler);
```

---

### 4. 参数校验

**实现：** Zod + fastify-type-provider-zod

**示例：**
```typescript
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/).optional(),
  password: z.string()
    .min(8)
    .max(32)
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/),
  name: z.string().min(2).max(50),
});

fastify.post('/api/v1/auth/register', {
  schema: {
    body: registerSchema,
  },
}, registerHandler);
```

---

### 5. SQL注入防护

**实现：** Prisma参数化查询

**示例：**
```typescript
// ✅ 安全：使用Prisma参数化查询
const user = await prisma.user.findUnique({
  where: { email },
});

// ❌ 危险：直接拼接SQL（不要这样做）
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`;
```

---

### 6. XSS防护

**实现：** 
1. 前端：React自动转义
2. 后端：输入验证 + 输出编码
3. HTTP头：Content-Security-Policy

**配置：**
```typescript
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
});
```

---

## 性能优化

### 1. 缓存策略

**Redis缓存：**
- JWT Token黑名单
- 用户基本信息缓存（1小时）
- 登录失败计数（15分钟）

**实现：**
```typescript
// 缓存用户信息
const cacheUser = async (userId: string, user: User) => {
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
};

// 获取缓存的用户信息
const getCachedUser = async (userId: string): Promise<User | null> => {
  const cached = await redis.get(`user:${userId}`);
  return cached ? JSON.parse(cached) : null;
};
```

---

### 2. 数据库优化

**索引优化：**
- 已在数据库设计中定义

**查询优化：**
```typescript
// ✅ 好的做法：只查询需要的字段
const user = await prisma.user.findUnique({
  where: { email },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
  },
});

// ❌ 避免：查询所有字段（包括不需要的）
const user = await prisma.user.findUnique({
  where: { email },
});
```

---

### 3. API响应优化

**响应时间目标：**
- 注册：< 1秒
- 登录：< 500ms
- 个人中心：< 2秒

**优化措施：**
1. 使用Redis缓存
2. 数据库索引优化
3. 异步发送邮件（不阻塞响应）
4. CDN加速静态资源

---

## 扩展性设计

### 1. 第三方登录扩展

**预留接口：**
```typescript
interface OAuthProvider {
  name: string;
  authenticate: (code: string) => Promise<OAuthUser>;
  linkAccount: (userId: string, oauthId: string) => Promise<void>;
}

// 未来实现
const providers: Record<string, OAuthProvider> = {
  wechat: new WechatProvider(),
  github: new GitHubProvider(),
  google: new GoogleProvider(),
};
```

---

### 2. 会员系统扩展

**预留字段：**
```prisma
model User {
  // ... 现有字段
  subscriptionPlan  SubscriptionPlan?  // 会员等级
  subscriptionExpiry DateTime?         // 会员到期时间
}
```

---

## 错误处理

### 统一错误格式

```typescript
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// 错误码定义
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

---

## 测试策略

### 单元测试

```typescript
describe('AuthService', () => {
  it('should hash password correctly', async () => {
    const password = 'Test1234';
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });
  
  it('should generate valid JWT token', () => {
    const user = { id: '123', email: 'test@example.com', role: 'Student' };
    const token = generateToken(user);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(user.id);
  });
});
```

### 集成测试

```typescript
describe('Auth API', () => {
  it('should register user successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'Test1234',
        name: 'Test User',
      },
    });
    
    expect(response.statusCode).toBe(201);
    expect(response.json().success).toBe(true);
  });
});
```

---

## 用户体验影响评估请求

**@ProductAgent** 请从用户体验角度评估此技术方案：

1. **注册流程**：邮箱注册流程是否简洁？是否需要调整？
2. **登录体验**：登录失败次数限制是否合理？是否影响用户体验？
3. **密码找回**：邮件重置流程是否清晰？是否需要短信验证作为备选？
4. **个人中心**：页面加载时间 < 2秒是否满足用户期望？
5. **错误提示**：错误消息是否友好？是否需要优化文案？

---

*ArchitectAgent 技术规格输出完成，等待总监批准*
