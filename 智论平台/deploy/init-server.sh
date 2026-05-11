#!/bin/bash
# ============================================================
#  智论AI平台 - 腾讯云轻量服务器 一键部署脚本
#  目标系统: Ubuntu 22.04/24.04 (2核4G)
#  用法: bash deploy.sh
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[OK]${NC}   $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "============================================"
log_info " 智论AI平台 - 腾讯云环境初始化部署"
log_info "============================================"
echo ""

# ==================== Step 1: 系统更新 + 基础工具 ====================
log_info "[Step 1/7] 系统更新 & 安装基础工具..."
sudo apt-get update -y
sudo apt-get install -y \
    curl wget git unzip jq ufw software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release \
    build-essential python3 python3-pip
log_ok "基础工具安装完成"

# ==================== Step 2: Node.js 20 LTS ====================
log_info "[Step 2/7] 安装 Node.js 20 LTS..."
if ! command -v node &>/dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
log_ok "Node.js $(node -v) 安装完成"

# 全局安装 PM2
sudo npm install -g pm2
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
log_ok "PM2 进程管理器安装完成"

# ==================== Step 3: PostgreSQL 16 ====================
log_info "[Step 3/7] 安装 PostgreSQL 16..."
if ! command -v psql &>/dev/null; then
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
    sudo apt-get update -y
    sudo apt-get install -y postgresql-16 postgresql-client-16

    # 设置 postgres 密码
    sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'Zhilun2026@Prod';"
    log_ok "PostgreSQL 16 已安装, postgres密码已设置"

    # 创建应用数据库
    sudo -u postgres psql -c "CREATE DATABASE zhilun_prod ENCODING 'UTF8';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE USER zhilun_app WITH PASSWORD 'ZhilunApp2026!';" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE zhilun_prod TO zhilun_app;" 2>/dev/null || true
    log_ok "数据库 zhilun_prod + 用户 zhilun_app 创建完成"

    # 允许密码连接（修改 pg_hba.conf）
    PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
    if grep -q "scram-sha-256" "$PG_HBA"; then
        sudo sed -i 's/scram-sha-256/md5/g' "$PG_HBA" 2>/dev/null || true
        sudo sed -i 's/local   all             peer/local   all             md5/g' "$PG_HBA" 2>/dev/null || true
        sudo sed -i 's/host    all             127.0.0.1\/32            scram-sha-256/host    all             127.0.0.1\/32            md5/g' "$PG_HBA" 2>/dev/null || true
        sudo sed -i 's/host    all             ::1\/128                 scram-sha-256/host    all             ::1\/128                 md5/g' "$PG_HBA" 2>/dev/null || true
    fi
    sudo systemctl restart postgresql
    log_ok "PostgreSQL 已配置允许密码认证"
else
    log_warn "PostgreSQL 已存在: $(psql --version)"
fi

# ==================== Step 4: Redis ====================
log_info "[Step 4/7] 安装 Redis..."
if ! command -v redis-server &>/dev/null; then
    sudo apt-get install -y redis-server

    # 配置 Redis（设置密码 + 内存限制）
    REDIS_CONF="/etc/redis/redis.conf"
    sudo sed -i 's/^# requirepass foobared/requirepass ZhilunRedis2026!/' "$REDIS_CONF"
    sudo sed -i 's/^bind 127.0.0.1 ::1/bind 127.0.0.1/' "$REDIS_CONF"
    sudo sed -i 's/^maxmemory <bytes>/maxmemory 256mb/' "$REDIS_CONF"
    sudo sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' "$REDIS_CONF"
    
    # 开启持久化（AOF模式，每秒同步）
    sudo sed -i 's/^appendonly no/appendonly yes/' "$REDIS_CONF"
    sudo sed -i 's/^appendfsync everysec/appendfsync everysec/' "$REDIS_CONF"

    sudo systemctl enable redis-server
    sudo systemctl restart redis-server
    log_ok "Redis 已安装并配置密码保护"
else
    log_warn "Redis 已存在: redis-server --version"
fi

# ==================== Step 5: Nginx 反向代理 ====================
log_info "[Step 5/7] 安装配置 Nginx..."
if ! command -v nginx &>/dev/null; then
    sudo apt-get install -y nginx
    
    # 创建智论平台 Nginx 配置
    sudo tee /etc/nginx/sites-available/zhilun.conf > /dev/null << 'NGINX_CONF'
# 智论AI平台 - Nginx反向代理配置
upstream backend_zhilun {
    server 127.0.0.1:5001;
    keepalive 64;
}

upstream frontend_zhilun {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name _;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 1000;

    # 前端静态资源
    location / {
        proxy_pass http://frontend_zhilun;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
            proxy_pass http://frontend_zhilun;
        }
    }

    # 后端API
    location /api/ {
        proxy_pass http://backend_zhilun;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # API请求不缓存
        add_header Cache-Control "no-store, no-cache, must-revalidate";

        # 超时设置（AI检测可能耗时较长）
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # 健康检查
    location /health {
        proxy_pass http://backend_zhilun;
        access_log off;
    }
}
NGINX_CONF

    sudo ln -sf /etc/nginx/sites-available/zhilun.conf /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
    log_ok "Nginx 已配置完成 (前端:3000 + 后端:5001)"
else
    log_warn "Nginx 已存在"
fi

# ==================== Step 6: 防火墙配置 ====================
log_info "[Step 6/7] 配置防火墙 UFW..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     comment 'SSH'
sudo ufw allow 80/tcp     comment 'HTTP'
sudo ufw allow 443/tcp    comment 'HTTPS'
sudo ufw --force enable
log_ok "UFW防火墙已启用 (开放: 22/80/443)"

# ==================== Step 7: 项目目录 + Git ====================
log_info "[Step 7/7] 创建项目目录结构..."
mkdir -p /home/ubuntu/apps
mkdir -p /home/ubuntu/logs
mkdir -p /home/ubuntu/.ssh
log_ok "项目目录创建完成: /home/ubuntu/apps"

# ==================== 环境信息汇总 ====================
echo ""
echo "============================================================"
log_ok "🎉 腾讯云环境初始化完成！"
echo "============================================================"
echo ""
echo "${GREEN}已安装软件版本:${NC}"
echo "  ┌─────────────────┬────────────────────┐"
echo "  │ 组件            │ 版本                │"
echo "  ├─────────────────┼────────────────────┤"
printf "  │ %-15s │ %-19s │\n" "Node.js" "$(node -v 2>/dev/null || echo '未安装')"
printf "  │ %-15s │ %-19s │\n" "npm" "$(npm -v 2>/dev/null || echo '未安装')"
printf "  │ %-15s │ %-19s │\n" "PM2" "$(pm2 -v 2>/dev/null | head -1 || echo '未安装')"
printf "  │ %-15s │ %-19s │\n" "PostgreSQL" "$(psql --version 2>/dev/null || echo '未安装')"
printf "  │ %-15s │ %-19s │\n" "Redis" "$(redis-server --version 2>/dev/null | awk '{print $3}' || echo '未安装')"
printf "  │ %-15s │ %-19s │\n" "Nginx" "$(nginx -v 2>&1 | cut -d'/' -f2 || echo '未安装')"
echo "  └─────────────────┴────────────────────┘"
echo ""
echo "${GREEN}数据库连接信息:${NC}"
echo "  Host: 127.0.0.1:5432"
echo "  Database: zhilun_prod"
echo "  User: zhilun_app"
echo "  Password: ZhilunApp2026!"
echo ""
echo "${GREEN}Redis连接信息:${NC}"
echo "  Host: 127.0.0.1:6379"
echo "  Password: ZhilunRedis2026!"
echo ""
echo "${YELLOW}下一步操作:${NC}"
echo "  1. 将项目代码推送到Git仓库(Gitee/GitHub)"
echo "  2. 在服务器上克隆: cd /home/ubuntu/apps && git clone <repo-url>"
echo "  3. 复制 .env.production 并填入真实密钥"
echo "  4. 运行部署脚本: bash scripts/deploy-app.sh"
echo ""
echo "============================================================"
