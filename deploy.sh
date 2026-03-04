#!/bin/bash

# Script deploy tự động trên VPS
# Chạy: ./deploy.sh [tag] (default: latest)

set -e  # Dừng lại khi có lỗi

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

IMAGE_TAG=${1:-latest}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Bắt đầu deploy ocNewsBot${NC}"
echo -e "${GREEN}  Image tag: ${IMAGE_TAG}${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. Load biến môi trường
if [ -f .env ]; then
    echo -e "${YELLOW}→ Load biến môi trường...${NC}"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}✗ Không tìm thấy file .env!${NC}"
    exit 1
fi

# 2. Pull images mới nhất
echo -e "${YELLOW}→ Đang pull images mới...${NC}"
export IMAGE_TAG=${IMAGE_TAG}
docker compose pull

# 3. Dừng và xóa containers cũ (giữ lại volumes)
echo -e "${YELLOW}→ Dừng containers cũ...${NC}"
docker compose down

# 4. Chạy migrations (nếu cần)
echo -e "${YELLOW}→ Chạy database migrations...${NC}"
docker compose run --rm server npx prisma migrate deploy

# 5. Khởi động containers mới
echo -e "${YELLOW}→ Khởi động containers mới...${NC}"
docker compose up -d

# 6. Kiểm tra health
echo -e "${YELLOW}→ Kiểm tra health status...${NC}"
sleep 10

# Kiểm tra server
MAX_RETRIES=30
RETRY_COUNT=0
echo -e "${YELLOW}→ Đang kiểm tra server health...${NC}"
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose ps server | grep -q "healthy"; then
        echo -e "${GREEN}✓ Server đã sẵn sàng!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT+1))
    echo -e "  Chờ server khởi động... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}✗ Server không healthy sau $MAX_RETRIES lần thử!${NC}"
    docker compose logs server
    exit 1
fi

# Kiểm tra web
if docker compose ps web | grep -q "healthy"; then
    echo -e "${GREEN}✓ Web đã sẵn sàng!${NC}"
else
    echo -e "${YELLOW}⚠ Web chưa healthy, kiểm tra logs...${NC}"
fi

# 7. Dọn dẹp images cũ
echo -e "${YELLOW}→ Dọn dẹp images cũ...${NC}"
docker image prune -f

# 8. Hiển thị trạng thái
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deploy hoàn tất!${NC}"
echo -e "${GREEN}========================================${NC}"
docker compose ps

echo ""
echo -e "${GREEN}Logs realtime:${NC} docker compose logs -f"
echo -e "${GREEN}Stop services:${NC} docker compose down"
echo -e "${GREEN}Restart:${NC} docker compose restart"
