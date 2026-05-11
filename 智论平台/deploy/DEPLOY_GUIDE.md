# 智论AI平台 - 腾讯云部署指南

## 服务器信息

| 项目 | 值 |
|------|-----|
| 云服务商 | 腾讯云轻量应用服务器 |
| IP | 140.143.208.22 |
| 系统 | Ubuntu (2核4G) |
| SSH密钥 | test.pem |

---

## 一、开放防火墙（必须先做！）

当前服务器从外部无法访问，需要在**腾讯云控制台**开放端口：

### 方法1：轻量应用服务器防火墙（推荐）

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/lighthouse/instance/detail?lkins-nkgggjb6)
2. 点击左侧 **「防火墙」** 标签页
3. 添加以下规则：

| 应用 | 协议 | 端口 | 来源 |
|------|------|------|------|
| SSH | TCP | **22** | 0.0.0.0/0 |
| HTTP | TCP | **80** | 0.0.0.0/0 |
| HTTPS | TCP | **443** | 0.0.0.0/0 |

> ⚠️ 如果后续需要直接调试，可临时开放 3000(前端) 和 5001(后端)，生产环境建议只开80/443由Nginx转发

### 方法2：使用 OrcaTerm Web终端

如果不想开放SSH端口，可以直接在控制台点击 **「OrcaTerm」** 或 **「登录」** → **「OrcaTerm免密登录」**，在网页终端中执行部署命令。

---

## 二、一键初始化环境

### 方式A：通过 SSH 连接执行（推荐）

```bash
# 本地终端执行
chmod 400 /path/to/test.pem
ssh -i /path/to/test.pem ubuntu@140.143.208.22
```

连接成功后在服务器上执行：

```bash
# 1. 先把脚本传到服务器上（在本地终端执行）
scp -i /path/to/test.pem /workspace/智论平台/deploy/init-server.sh ubuntu@140.143.208.22:~/
scp -i /path/to/test.pem /workspace/智论平台/deploy/deploy-app.sh ubuntu@140.143.208.22:~/

# 2. SSH进入服务器后执行初始化
ssh -i /path/to/test.pem ubuntu@140.143.208.22
bash ~/init-server.sh
```

### 方式B：通过 OrcaTerm 执行

在腾讯云控制台的 OrcaTerm 网页终端中粘贴以下内容：

```bash
# 创建部署脚本
cat > ~/init-server.sh << 'SCRIPT_EOF'
(此处为 init-server.sh 的完整内容，见下方)
SCRIPT_EOF
bash ~/init-server.sh
```

---

## 三、Git 推送代码到服务器

### 3.1 初始化 Git 仓库（首次）

```bash
# 在本地项目目录
cd /workspace/智论平台
git init
git add .
git commit -m "feat: 智论AI平台 P1完整版 - AIGC检测+知识库引用+图表生成"
```

### 3.2 推送到远程仓库

选择一个 Git 托管平台：

#### 选项A：Gitee（国内推荐，速度快）

1. 在 https://gitee.com 创建新仓库 `zhilun-platform`
2. 关联并推送：
```bash
git remote add origin git@gitee.com:你的用户名/zhilun-platform.git
git push -u origin main
```

#### 选项B：GitHub

```bash
git remote add origin git@github.com:你的用户名/zhilun-platform.git
git push -u origin main
```

### 3.3 在服务器克隆代码

```bash
cd /home/ubuntu/apps
git clone git@gitee.com:你的用户名/zhilun-platform.git zhilun-platform
```

> 如需配置SSH key：`ssh-keygen -t ed25519 && cat ~/.ssh/id_ed25519.pub` 复制到 Gitee/GitHub

---

## 四、部署应用

```bash
# 1. 进入项目目录
cd /home/ubuntu/apps/zhilun-platform/backend

# 2. 配置生产环境变量
cp ../deploy/.env.production.template .env
nano .env   # 修改 JWT_SECRET 为强随机字符串！

# 3. 执行应用部署
bash ~/deploy-app.sh
```

---

## 五、验证部署结果

```bash
# 检查进程状态
pm2 status

# 查看日志
pm2 logs --lines 50

# 测试API
curl http://localhost:5001/
curl http://localhost:3000

# 外网访问
# 前端: http://140.143.208.22/
# API:  http://140.143.208.22/api/v1/
```

---

## 六、日常运维命令

| 操作 | 命令 |
|------|------|
| 查看服务状态 | `pm2 status` |
| 查看实时日志 | `pm2 logs` |
| 重启所有服务 | `pm2 restart all` |
| 重启单个服务 | `pm2 restart zhilun-backend` |
| 监控面板 | `pm2 monit` |
| 数据库同步 | `cd backend && npx prisma db push` |
| 重载Nginx | `sudo nginx -t && sudo systemctl reload nginx` |
| 更新代码 | `cd ~/apps/zhilun-platform && git pull && bash ~/deploy-app.sh` |

---

## 七、安全建议清单

- [ ] 修改 `.env` 中 `JWT_SECRET` 为随机生成的强密码 (`openssl rand -base64 32`)
- [ ] 修改 PostgreSQL 默认密码（`ZhilunApp2026!` → 改为你自己的）
- [ ] 修改 Redis 默认密码（`ZhilunRedis2026!` → 改为你自己的）
- [ ] 腾讯云控制台关闭 OrcaTerm 免密登录（生产环境不推荐长期开启）
- [ ] 配置 SSL 证书（Let's Encrypt + Certbot）:
  ```bash
  sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx -d 你的域名.com
  ```
- [ ] 定期备份数据库:
  ```bash
  # 创建备份脚本
  sudo -u postgres pg_dump zhilun_prod > backup_$(date +%Y%m%d).sql
  ```
