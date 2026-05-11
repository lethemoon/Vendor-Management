#!/bin/bash
# ============================================================
#  智论AI平台 - 应用部署脚本 (init-server.sh 之后执行)
#  用法: bash deploy-app.sh
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/home/ubuntu/apps/zhilun-platform"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
LOG_DIR="/home/ubuntu/logs"

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[OK]${NC}   $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

if [ ! -d "$BACKEND_DIR" ]; then
    log_error "后端目录不存在: $BACKEND_DIR"
    log_error "请先执行: cd /home/ubuntu/apps && git clone <你的仓库地址>"
    exit 1
fi

log_info "============================================"
log_info " 智论AI平台 - 应用部署"
log_info "============================================"
echo ""

# ==================== Step 1: 后端依赖 + 构建 ====================
log_info "[Step 1/4] 安装后端依赖 & 构建..."
cd "$BACKEND_DIR"
npm install --production=false
npx prisma generate
npx tsc --noEmit && npx tsc
log_ok "后端编译完成"

# ==================== Step 2: 数据库初始化 ====================
log_info "[Step 2/4] 数据库初始化 (Prisma DB Push)..."
cd "$BACKEND_DIR"
# 先检查 .env 是否存在
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        log_warn ".env 不存在，已从 .env.example 复制，请手动修改配置！"
    else
        log_error ".env 和 .env.example 都不存在！"
        exit 1
    fi
fi
npx prisma db push --accept-data-loss
log_ok "数据库表结构同步完成"

# ==================== Step 3: 前端构建 ====================
log_info "[Step 3/4] 前端依赖安装 & 构建..."
cd "$FRONTEND_DIR"
npm install
npm run build
log_ok "前端构建完成 (output: .next)"

# ==================== Step 4: PM2 启动服务 ====================
log_info "[Step 4/4] PM2 启动服务..."

# 停止旧进程（如果有）
pm2 delete zhilun-backend 2>/dev/null || true
pm2 delete zhilun-frontend 2>/dev/null || true

# 启动后端
cd "$BACKEND_DIR"
pm2 start dist/index.js \
    --name "zhilun-backend" \
    -i 1 \
    --max-memory-restart 500M \
    --log "$LOG_DIR/backend.log" \
    --error "$LOG_DIR/backend-error.log" \
    --merge-logs

# 启动前端
cd "$FRONTEND_DIR"
pm2 start node_modules/.bin/next \
    --name "zhilun-frontend" \
    -- start \
    -p 3000 \
    --max-memory-restart 500M \
    --log "$LOG_DIR/frontend.log" \
    --error "$LOG_DIR/frontend-error.log" \
    --merge-logs

pm2 save
log_ok "PM2 进程已启动"

echo ""
echo "============================================================"
log_ok "🚀 智论AI平台部署完成！"
echo "============================================================"
echo ""
echo "${GREEN}服务状态:${NC}"
pm2 status
echo ""
echo "${GREEN}访问地址:${NC}"
echo "  前端: http://140.143.208.22/"
echo "  API:  http://140.143.208.22/api/v1/"
echo ""
echo "${GREEN}常用管理命令:${NC}"
echo "  pm2 logs              # 查看日志"
echo "  pm2 restart all       # 重启所有服务"
echo "  pm2 monit             # 监控面板"
echo "  sudo nginx -t && sudo systemctl reload nginx  # 重载Nginx"
echo "============================================================"
