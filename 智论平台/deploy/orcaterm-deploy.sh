#!/bin/bash
# ============================================================
#  智论AI平台 - 腾讯云一键部署 (OrcaTerm 粘贴版)
#  在腾讯云控制台 OrcaTerm 终端中一次性粘贴执行
# ============================================================
set -e
export DEBIAN_FRONTEND=noninteractive

echo "============================================"
echo " 智论AI平台 - 腾讯云环境初始化"
echo "============================================"

# ---- Step 1: 系统更新 + 基础工具 ----
echo "[1/7] 系统更新 & 安装基础工具..."
apt-get update -y > /dev/null 2>&1
apt-get install -y curl wget git unzip jq ufw software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release build-essential \
    python3 python3-pip > /dev/null 2>&1
echo "  ✅ 基础工具安装完成"

# ---- Step 2: Node.js 20 LTS + PM2 ----
echo "[2/7] 安装 Node.js 20 LTS..."
if ! command -v node &>/dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
fi
npm install -g pm2 > /dev/null 2>&1
pm2 startup systemd -u ubuntu --hp /home/ubuntu > /dev/null 2>&1 || true
echo "  ✅ Node.js $(node -v) + PM2 安装完成"

# ---- Step 3: PostgreSQL 16 ----
echo "[3/7] 安装 PostgreSQL 16..."
if ! command -v psql &>/dev/null; then
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - > /dev/null 2>&1
    apt-get update -y > /dev/null 2>&1
    apt-get install -y postgresql-16 postgresql-client-16 > /dev/null 2>&1
    
    su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'Zhilun2026@Prod';\"" 
    su - postgres -c "psql -c \"CREATE DATABASE zhilun_prod ENCODING 'UTF8';\"" 2>/dev/null || true
    su - postgres -c "psql -c \"CREATE USER zhilun_app WITH PASSWORD 'ZhilunApp2026!';\"" 2>/dev/null || true
    su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE zhilun_prod TO zhilun_app;\"" 2>/dev/null || true
    
    PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
    sed -i 's/scram-sha-256/md5/g' "$PG_HBA" 2>/dev/null || true
    sed -i 's/local   all             peer/local   all             md5/g' "$PG_HBA" 2>/dev/null || true
    sed -i 's/host    all             127.0.0.1\/32            scram-sha-256/host    all             127.0.0.1\/32            md5/g' "$PG_HBA" 2>/dev/null || true
    sed -i 's/host    all             ::1\/128                 scram-sha-256/host    all             ::1\/128                 md5/g' "$PG_HBA" 2>/dev/null || true
    systemctl restart postgresql
    echo "  ✅ PostgreSQL 16 已安装 (DB: zhilun_prod)"
else
    echo "  ⚠️ PostgreSQL 已存在"
fi

# ---- Step 4: Redis ----
echo "[4/7] 安装 Redis..."
if ! command -v redis-server &>/dev/null; then
    apt-get install -y redis-server > /dev/null 2>&1
    REDIS_CONF="/etc/redis/redis.conf"
    sed -i 's/^# requirepass foobared/requirepass ZhilunRedis2026!/' "$REDIS_CONF"
    sed -i 's/^bind 127.0.0.1 ::1/bind 127.0.0.1/' "$REDIS_CONF"
    sed -i 's/^maxmemory <bytes>/maxmemory 256mb/' "$REDIS_CONF"
    sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' "$REDIS_CONF"
    sed -i 's/^appendonly no/appendonly yes/' "$REDIS_CONF"
    systemctl enable redis-server > /dev/null 2>&1
    systemctl restart redis-server
    echo "  ✅ Redis 已安装 (密码保护已开启)"
else
    echo "  ⚠️ Redis 已存在"
fi

# ---- Step 5: Nginx 反向代理 ----
echo "[5/7] 安装配置 Nginx..."
if ! command -v nginx &>/dev/null; then
    apt-get install -y nginx > /dev/null 2>&1
    cat > /etc/nginx/sites-available/zhilun.conf << 'EOF'
upstream backend_zhilun { server 127.0.0.1:5001; keepalive 64; }
upstream frontend_zhilun { server 127.0.0.1:3000; keepalive 32; }
server {
    listen 80;
    server_name _;
    gzip on; gzip_vary on; gzip_proxied any; gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
    location / {
        proxy_pass http://frontend_zhilun; proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme; proxy_cache_bypass $http_upgrade;
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d; add_header Cache-Control "public, immutable";
            proxy_pass http://frontend_zhilun;
        }
    }
    location /api/ {
        proxy_pass http://backend_zhilun; proxy_http_version 1.1;
        proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        proxy_connect_timeout 60s; proxy_send_timeout 120s; proxy_read_timeout 120s;
    }
    location /health { proxy_pass http://backend_zhilun; access_log off; }
}
EOF
    ln -sf /etc/nginx/sites-available/zhilun.conf /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t > /dev/null 2>&1 && systemctl reload nginx
    echo "  ✅ Nginx 已配置 (前端:3000 → 后端:5001)"
else
    echo "  ⚠️ Nginx 已存在"
fi

# ---- Step 6: 防火墙 UFW ----
echo "[6/7] 配置防火墙..."
ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1
ufw allow 22/tcp comment 'SSH' > /dev/null 2>&1
ufw allow 80/tcp comment 'HTTP' > /dev/null 2>&1
ufw allow 443/tcp comment 'HTTPS' > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
echo "  ✅ UFW 已启用 (22/80/443)"

# ---- Step 7: 目录结构 ----
echo "[7/7] 创建项目目录..."
mkdir -p /home/ubuntu/apps /home/ubuntu/logs /home/ubuntu/.ssh
echo "  ✅ 目录就绪: /home/ubuntu/apps"

# ---- 完成! ----
echo ""
echo "============================================================"
echo "  🎉 腾讯云环境初始化完成!"
echo "============================================================"
echo ""
echo "  组件版本:"
echo "    Node.js: $(node -v 2>/dev/null || echo '?')"
echo "    npm:     $(npm -v 2>/dev/null || echo '?')"
echo "    PM2:     $(pm2 -v 2>/dev/null | head -1 || echo '?')"
echo "    PG:      $(psql --version 2>/dev/null || echo '?')"
echo "    Redis:   $(redis-server --version 2>/dev/null | awk '{print $3}' || echo '?')"
echo "    Nginx:   $(nginx -v 2>&1 | cut -d'/' -f2)"
echo ""
echo "  数据库连接:"
echo "    URL: postgresql://zhilun_app:ZhilunApp2026!@127.0.0.1:5432/zhilun_prod"
echo "    Redis: redis://:ZhilunRedis2026!@127.0.0.1:6379/0"
echo ""
echo "  下一步:"
echo "    ① 本地推送代码到 Git 仓库 (Gitee/GitHub)"
echo "    ② 服务器克隆: cd ~/apps && git clone <仓库地址> zhilun-platform"
echo "    ③ 配置环境变量: cd ~/apps/zhilun-platform/backend && nano .env"
echo "    ④ 执行应用部署: bash ~/apps/zhilun-platform/deploy/deploy-app.sh"
echo "============================================================"
