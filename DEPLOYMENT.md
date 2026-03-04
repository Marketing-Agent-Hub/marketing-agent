# 🚀 Hướng dẫn Deploy với GitHub Container Registry

> **Dành cho người mới bắt đầu** - Hướng dẫn chi tiết từng bước để deploy dự án lên VPS với CI/CD tự động.

## 📖 Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Chuẩn bị](#chuẩn-bị)
3. [Bước 1: Setup GitHub](#bước-1-setup-github)
4. [Bước 2: Setup VPS](#bước-2-setup-vps)
5. [Bước 3: Deploy lần đầu](#bước-3-deploy-lần-đầu)
6. [Bước 4: Deploy tự động](#bước-4-deploy-tự-động)
7. [Quản lý và Monitoring](#quản-lý-và-monitoring)
8. [Xử lý sự cố](#xử-lý-sự-cố)

---

## Giới thiệu

### CI/CD là gì?

**CI/CD** (Continuous Integration/Continuous Deployment) là quy trình tự động:
- **CI**: Tự động build và test code mỗi khi bạn push
- **CD**: Tự động deploy lên server khi build thành công

### Luồng hoạt động

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│ 1. Push code│────▶│ 2. GitHub    │────▶│ 3. Build &  │────▶│ 4. Deploy│
│   lên GitHub│     │    Actions   │     │    Push GHCR│     │   on VPS │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────┘
```

**Giải thích:**
1. Bạn viết code và `git push` lên GitHub
2. GitHub Actions tự động chạy workflow
3. Build Docker images và push lên GitHub Container Registry (GHCR)
4. VPS pull images mới và restart services

### Tại sao dùng GHCR?

✅ **Ưu điểm:**
- Miễn phí, không giới hạn storage cho public repos
- Tích hợp sẵn với GitHub, không cần đăng ký thêm
- Không cần setup secrets phức tạp
- Tốc độ nhanh, bandwidth cao

❌ **So với Docker Hub:**
- Docker Hub: Cần tài khoản riêng, giới hạn 200 pulls/6h
- GHCR: Không cần account thêm, không giới hạn

---

## Chuẩn bị

### ✅ Yêu cầu

#### 1. VPS (Máy chủ ảo)
- **Hệ điều hành**: Ubuntu 20.04+ hoặc Debian 11+
- **RAM**: Tối thiểu 2GB (khuyến nghị 4GB)
- **Disk**: Tối thiểu 20GB
- **CPU**: 1 core (khuyến nghị 2 cores)

**Nhà cung cấp VPS phổ biến:**
- DigitalOcean (từ $6/tháng)
- Vultr (từ $5/tháng)
- Linode (từ $5/tháng)
- AWS EC2, Google Cloud (có free tier)
- VPS Việt Nam: INET, Viettel IDC...

#### 2. Domain (Không bắt buộc)
- Có thể dùng IP VPS để truy cập
- Domain giúp dễ nhớ và cài HTTPS

#### 3. Tài khoản GitHub
- Repository đã có code
- Quyền push lên repo

#### 4. API Keys
- **OpenAI API Key**: Để chạy AI ([platform.openai.com](https://platform.openai.com))
- Hoặc dùng Anthropic/Groq

---

## Bước 1: Setup GitHub

### 1.1. Push code lên GitHub

```bash
# Trên máy local
cd ocNewsBot

# Đảm bảo đã commit tất cả thay đổi
git add .
git commit -m "setup: CI/CD with GHCR"
git push origin main
```

### 1.2. Kiểm tra GitHub Actions

Mặc định dự án đã có workflow file tại:
```
.github/workflows/deploy.yml
```

**Không cần setup gì thêm!** Workflow sẽ:
- Tự động chạy khi push lên `main` hoặc `develop`
- Dùng `GITHUB_TOKEN` có sẵn (không cần tạo secrets)
- Build 2 Docker images: `server` và `web`
- Push lên GHCR với tag `latest` (cho main branch)

### 1.3. Xem kết quả build

1. Vào repository trên GitHub
2. Click tab **Actions**
3. Xem workflow run (màu xanh = thành công)
4. Click vào run để xem chi tiết logs

**First time build sẽ mất ~5-10 phút** (các lần sau nhanh hơn nhờ cache).

### 1.4. Xem Docker images

Sau khi build xong:
1. Vào **Packages** (phía bên phải trang repo)
2. Sẽ thấy 2 packages:
   - `ocnewsbot-server`
   - `ocnewsbot-web`

**Image URLs:**
```
ghcr.io/your-github-username/ocnewsbot-server:latest
ghcr.io/your-github-username/ocnewsbot-web:latest
```

---

## Bước 2: Setup VPS

### 2.1. SSH vào VPS

```bash
# Thay your-vps-ip bằng IP của VPS
ssh root@your-vps-ip

# Hoặc nếu dùng user khác
ssh username@your-vps-ip
```

**Lưu ý:** Các lệnh dưới đây chạy trên VPS, không phải máy local.

### 2.2. Cập nhật hệ thống

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y
```

### 2.3. Cài Docker và Docker Compose

```bash
# Cài Docker (script tự động)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cho phép user hiện tại chạy docker không cần sudo
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Kiểm tra cài đặt
docker --version
docker compose version
```

**Kết quả mong đợi:**
```
Docker version 24.0.x
Docker Compose version v2.x.x
```

### 2.4. Clone repository

```bash
# Tạo thư mục cho app
sudo mkdir -p /opt
cd /opt

# Clone repository (thay your-username và ocNewsBot)
sudo git clone https://github.com/your-username/ocNewsBot.git

# Đổi owner
sudo chown -R $USER:$USER ocNewsBot

# Vào thư mục
cd ocNewsBot
```

### 2.5. Tạo file cấu hình .env

```bash
# Copy từ template
cp .env.production.example .env

# Chỉnh sửa
nano .env
```

**Nội dung file `.env` cần điền:**

```bash
# ========================================
# GitHub Container Registry
# ========================================
DOCKER_REGISTRY=ghcr.io
GITHUB_USERNAME=your-github-username    # Thay bằng GitHub username của bạn
IMAGE_TAG=latest

# ========================================
# Database
# ========================================
DATABASE_URL=postgresql://postgres:my-secure-password-123@postgres:5432/rss_bot
POSTGRES_USER=postgres
POSTGRES_PASSWORD=my-secure-password-123    # Đổi password mạnh
POSTGRES_DB=rss_bot

# ========================================
# Application
# ========================================
NODE_ENV=production
PORT=3001

# ========================================
# JWT Secret
# ========================================
JWT_SECRET=your-random-jwt-secret-here    # Tạo random string bên dưới
JWT_EXPIRES_IN=7d

# ========================================
# AI Configuration
# ========================================
OPENAI_API_KEY=sk-your-openai-api-key-here    # Lấy từ platform.openai.com
OPENAI_MODEL=gpt-4o-mini
AI_PROVIDER=openai

# ========================================
# Security
# ========================================
CORS_ORIGIN=http://your-vps-ip    # Thay bằng IP hoặc domain
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ========================================
# RSS Configuration
# ========================================
INGEST_INTERVAL_MINUTES=60
FILTER_INTERVAL_MINUTES=5
EXTRACTION_INTERVAL_MINUTES=5
AI_STAGE_A_INTERVAL_MINUTES=10
AI_STAGE_B_INTERVAL_MINUTES=10

# ========================================
# Monitoring
# ========================================
LOG_LEVEL=info
ENABLE_TELEMETRY=true

# ========================================
# Admin (sẽ tạo hash sau)
# ========================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=
```

**Tạo JWT_SECRET random:**
```bash
openssl rand -base64 32
```
Copy kết quả và paste vào `JWT_SECRET`.

**Lưu file:**
- Nhấn `Ctrl + X`
- Nhấn `Y`
- Nhấn `Enter`

### 2.6. Tạo thư mục logs

```bash
mkdir -p server/logs
chmod 755 server/logs
```

---

## Bước 3: Deploy lần đầu

### 3.1. Public images (quan trọng!)

Mặc định images trên GHCR là **private**. Cần public để VPS pull được không cần authentication.

**Cách public images:**

1. Vào GitHub → **Packages** (bên phải trang repo)
2. Click vào package `ocnewsbot-server`
3. Click **Package settings** (góc phải)
4. Kéo xuống **Danger Zone** → **Change visibility**
5. Chọn **Public** → Confirm
6. Lặp lại cho `ocnewsbot-web`

**Lưu ý:** Public images có thể tải miễn phí bởi bất kỳ ai. Nếu muốn private, xem phần [Deploy với Private Repository](#deploy-với-private-repository).

### 3.2. Chạy deploy script

```bash
# Cho phép thực thi script
chmod +x deploy.sh

# Deploy!
./deploy.sh latest
```

**Script sẽ:**
1. ✅ Load biến môi trường từ `.env`
2. ✅ Pull Docker images từ GHCR
3. ✅ Stop containers cũ (nếu có)
4. ✅ Chạy database migrations
5. ✅ Start containers mới
6. ✅ Kiểm tra health status

**Thời gian:** ~3-5 phút cho lần đầu (download images).

### 3.3. Kiểm tra trạng thái

```bash
# Xem containers đang chạy
docker compose ps
```

**Kết quả mong đợi:**
```
NAME          IMAGE                                          STATUS
rss_postgres  postgres:16                                    Up (healthy)
rss_server    ghcr.io/.../ocnewsbot-server:latest           Up (healthy)
rss_web       ghcr.io/.../ocnewsbot-web:latest              Up (healthy)
```

### 3.4. Test ứng dụng

```bash
# Test API backend
curl http://localhost:3001/api/health

# Test frontend
curl http://localhost/
```

**Từ máy local:**
```bash
# Thay your-vps-ip
curl http://your-vps-ip:3001/api/health
```

**Mở trình duyệt:**
```
http://your-vps-ip
```

Bạn sẽ thấy giao diện web của ứng dụng! 🎉

### 3.5. Tạo admin password

```bash
# Generate password hash
docker compose exec server node -e "
const bcrypt = require('bcryptjs');
const password = 'your-admin-password-here';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
"
```

Copy hash và thêm vào `.env`:
```bash
nano .env
# Tìm dòng ADMIN_PASSWORD_HASH và paste hash vào
# Lưu: Ctrl+X → Y → Enter
```

Restart server:
```bash
docker compose restart server
```

---

## Bước 4: Deploy tự động

Hiện tại bạn đã có CI/CD cơ bản:
1. Push code → GitHub Actions build → Images lên GHCR
2. SSH vào VPS và chạy `./deploy.sh latest`

Để **hoàn toàn tự động** (không cần SSH), có 2 options:

### Option A: Webhook (Khuyến nghị)

VPS tự động deploy khi GitHub có push mới.

#### A.1. Cài webhook service

```bash
# Cài webhook
sudo apt install webhook -y
```

#### A.2. Tạo deploy script

```bash
# Tạo script
sudo nano /opt/ocNewsBot/webhook-deploy.sh
```

**Nội dung:**
```bash
#!/bin/bash
set -e

LOG_FILE="/var/log/ocnewsbot-deploy.log"

echo "=====================================" | tee -a $LOG_FILE
echo "Deploy triggered at $(date)" | tee -a $LOG_FILE
echo "=====================================" | tee -a $LOG_FILE

cd /opt/ocNewsBot

# Pull latest code
git pull origin main 2>&1 | tee -a $LOG_FILE

# Deploy
./deploy.sh latest 2>&1 | tee -a $LOG_FILE

echo "✓ Deploy completed at $(date)" | tee -a $LOG_FILE
```

```bash
# Cho phép thực thi
sudo chmod +x /opt/ocNewsBot/webhook-deploy.sh
```

#### A.3. Cấu hình webhook

```bash
# Tạo file config
sudo nano /etc/webhook.conf
```

**Nội dung:**
```json
[
  {
    "id": "deploy-ocnewsbot",
    "execute-command": "/opt/ocNewsBot/webhook-deploy.sh",
    "command-working-directory": "/opt/ocNewsBot",
    "response-message": "Deployment started",
    "trigger-rule": {
      "match": {
        "type": "value",
        "value": "refs/heads/main",
        "parameter": {
          "source": "payload",
          "name": "ref"
        }
      }
    }
  }
]
```

**Giải thích:**
- `id`: Tên webhook (sẽ dùng trong URL)
- `execute-command`: Script chạy khi có trigger
- `trigger-rule`: Chỉ chạy khi push vào branch `main`

#### A.4. Tạo systemd service

```bash
sudo nano /etc/systemd/system/webhook.service
```

**Nội dung:**
```ini
[Unit]
Description=Webhook Service for Auto Deployment
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/webhook -hooks /etc/webhook.conf -verbose -port 9000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (tự khởi động khi reboot)
sudo systemctl enable webhook

# Start service
sudo systemctl start webhook

# Kiểm tra status
sudo systemctl status webhook
```

**Kết quả mong đợi:**
```
● webhook.service - Webhook Service for Auto Deployment
   Loaded: loaded
   Active: active (running)
```

#### A.5. Mở port firewall

```bash
# Nếu dùng UFW
sudo ufw allow 9000/tcp
sudo ufw reload

# Nếu dùng iptables
sudo iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
sudo iptables-save
```

#### A.6. Setup GitHub Webhook

1. Vào repository trên GitHub
2. **Settings** → **Webhooks** → **Add webhook**
3. Điền thông tin:
   - **Payload URL**: `http://your-vps-ip:9000/hooks/deploy-ocnewsbot`
   - **Content type**: `application/json`
   - **Secret**: Để trống (hoặc thêm bảo mật nếu muốn)
   - **Which events**: Chọn **Just the push event**
   - **Active**: ✅ Tick
4. Click **Add webhook**

#### A.7. Test webhook

```bash
# Push code bất kỳ
git commit --allow-empty -m "test: webhook"
git push origin main
```

**Kiểm tra:**
1. GitHub Actions sẽ build (~5 phút)
2. Sau khi build xong, webhook trigger
3. VPS tự động pull và deploy
4. Xem logs: `sudo tail -f /var/log/ocnewsbot-deploy.log`

✅ **Hoàn tất!** Giờ chỉ cần `git push`, mọi thứ tự động!

---

### Option B: GitHub Actions SSH

Deploy trực tiếp từ GitHub Actions vào VPS qua SSH.

#### B.1. Tạo SSH key trên VPS

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions -N ""

# Add public key vào authorized_keys
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys

# Hiển thị private key (copy toàn bộ)
cat ~/.ssh/github-actions
```

Copy **toàn bộ** output (từ `-----BEGIN` đến `-----END`).

#### B.2. Thêm secrets vào GitHub

Vào repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Thêm 3 secrets:

| Secret Name | Value | Mô tả |
|------------|-------|-------|
| `VPS_HOST` | `your-vps-ip` | IP hoặc domain của VPS |
| `VPS_USERNAME` | `root` hoặc `username` | SSH username |
| `VPS_SSH_KEY` | Private key đã copy | Toàn bộ private key |

#### B.3. Cập nhật workflow

```bash
# Trên máy local
nano .github/workflows/deploy.yml
```

Thêm job `deploy` vào cuối file:

```yaml
  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/ocNewsBot
            git pull origin main
            ./deploy.sh latest
```

```bash
# Commit và push
git add .github/workflows/deploy.yml
git commit -m "feat: add auto deploy via SSH"
git push origin main
```

✅ **Xong!** Deploy tự động qua SSH.

---

## Quản lý và Monitoring

### Xem logs

```bash
# Logs tất cả services
docker compose logs -f

# Logs service cụ thể
docker compose logs -f server
docker compose logs -f web
docker compose logs -f postgres

# Logs 100 dòng cuối
docker compose logs --tail=100 server
```

### Kiểm tra trạng thái

```bash
# Container status
docker compose ps

# Resource usage
docker stats

# Disk usage
df -h
docker system df
```

### Restart services

```bash
# Restart tất cả
docker compose restart

# Restart service cụ thể
docker compose restart server
docker compose restart web
```

### Xem environment variables

```bash
docker compose exec server printenv | grep -E 'NODE_ENV|DATABASE_URL|OPENAI'
```

### Pull updates manual

```bash
cd /opt/ocNewsBot

# Pull code mới
git pull origin main

# Deploy
./deploy.sh latest
```

### Backup database

```bash
# Backup
docker compose exec postgres pg_dump -U postgres rss_bot > backup_$(date +%Y%m%d_%H%M%S).sql

# Hoặc với compression
docker compose exec postgres pg_dump -U postgres rss_bot | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore database

```bash
# Stop containers
docker compose down

# Start only postgres
docker compose up -d postgres

# Wait for postgres ready
sleep 5

# Restore
cat backup_20260304_100000.sql | docker compose exec -T postgres psql -U postgres rss_bot

# Start all services
docker compose up -d
```

### Cleanup

```bash
# Xóa images cũ
docker image prune -a -f

# Xóa containers stopped
docker container prune -f

# Xóa volumes không dùng (CẨNH THẬN!)
docker volume prune -f

# Xóa tất cả (NGUY HIỂM!)
docker system prune -a -f
```

---

## Xử lý sự cố

### Container không start

```bash
# Xem logs
docker compose logs server

# Xem lỗi chi tiết
docker compose up server

# Kiểm tra config
docker compose config
```

**Nguyên nhân thường gặp:**
- Thiếu biến môi trường trong `.env`
- Port đã được dùng
- Disk đầy
- RAM không đủ

### Lỗi "No space left on device"

```bash
# Kiểm tra disk
df -h

# Xóa images cũ
docker system prune -a -f

# Xóa logs cũ
sudo journalctl --vacuum-time=3d
```

### Container unhealthy

```bash
# Xem health check logs
docker inspect rss_server | grep -A 10 Health

# Test health endpoint
docker compose exec server curl http://localhost:3001/api/health

# Restart
docker compose restart server
```

### Database connection failed

```bash
# Kiểm tra postgres
docker compose ps postgres

# Xem logs
docker compose logs postgres

# Test connection
docker compose exec server npx prisma db pull
```

### Pull images lỗi "unauthorized"

**Nguyên nhân:** Images là private.

**Giải pháp:** Public images (xem [Bước 3.1](#31-public-images-quan-trọng)) hoặc setup authentication.

### GitHub Actions build failed

1. Vào **Actions** tab
2. Click vào failed run
3. Xem logs từng step
4. Fix lỗi và push lại

**Lỗi thường gặp:**
- Syntax error trong code
- Dependencies missing trong `package.json`
- Dockerfile sai cú pháp

### Port 80 đã được dùng

```bash
# Kiểm tra process nào đang dùng port 80
sudo lsof -i :80

# Stop apache/nginx nếu có
sudo systemctl stop apache2
sudo systemctl stop nginx

# Hoặc đổi port trong docker-compose.yml
ports:
  - "8080:80"  # Đổi 80 thành 8080
```

### Webhook không chạy

```bash
# Kiểm tra webhook service
sudo systemctl status webhook

# Xem logs
sudo journalctl -u webhook -f

# Test manual
curl -X POST http://localhost:9000/hooks/deploy-ocnewsbot \
  -H "Content-Type: application/json" \
  -d '{"ref":"refs/heads/main"}'
```

---

## Deploy với Private Repository

Nếu muốn images private (không public):

### 1. Tạo GitHub Personal Access Token

1. GitHub → **Settings** (avatar menu) → **Developer settings**
2. **Personal access tokens** → **Tokens (classic)** → **Generate new token**
3. Note: `VPS Docker Pull`
4. Expiration: **No expiration**
5. Scopes: Chọn `read:packages`
6. **Generate token** → Copy token

### 2. Login GHCR trên VPS

```bash
# Thêm vào .env
nano .env
```

Thêm dòng:
```bash
GITHUB_TOKEN=ghp_your_personal_access_token_here
```

### 3. Cập nhật deploy script

```bash
nano deploy.sh
```

Thêm login command sau phần load env:
```bash
# Login GHCR
echo "${GITHUB_TOKEN}" | docker login ghcr.io -u ${GITHUB_USERNAME} --password-stdin
```

Lưu và chạy lại deploy.

---

## Nâng cao: HTTPS với Let's Encrypt

### 1. Cài Nginx

```bash
sudo apt install nginx -y
```

### 2. Cấu hình Nginx

```bash
sudo nano /etc/nginx/sites-available/ocnewsbot
```

**Nội dung:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ocnewsbot /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### 3. Cài SSL Certificate

```bash
# Cài Certbot
sudo apt install certbot python3-certbot-nginx -y

# Tạo certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot sẽ tự động:
# - Verify domain
# - Generate SSL certificate
# - Update Nginx config
# - Setup auto-renewal
```

### 4. Cập nhật CORS_ORIGIN

```bash
nano .env
```

Đổi:
```bash
CORS_ORIGIN=https://your-domain.com
```

Restart:
```bash
docker compose restart server
```

✅ **Xong!** Truy cập `https://your-domain.com`

---

## Tóm tắt Commands

### Deploy thường dùng

```bash
# Deploy update
cd /opt/ocNewsBot
git pull origin main
./deploy.sh latest

# Xem logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Start
docker compose up -d
```

### Backup

```bash
# Backup database
docker compose exec postgres pg_dump -U postgres rss_bot > backup.sql

# Backup .env
cp .env .env.backup

# Backup toàn bộ
tar -czf ocnewsbot-backup-$(date +%Y%m%d).tar.gz /opt/ocNewsBot
```

### Monitoring

```bash
# Container status
docker compose ps

# Resources
docker stats

# Disk
df -h

# Logs
docker compose logs --tail=50 -f server
```

---

## Kết luận

Bạn đã setup thành công CI/CD pipeline với:
- ✅ GitHub Actions tự động build
- ✅ GitHub Container Registry lưu trữ images
- ✅ VPS deploy tự động (webhook hoặc SSH)
- ✅ Monitoring và backup

**Quy trình làm việc:**
1. Viết code trên máy local
2. `git push origin main`
3. Tự động: Build → Test → Deploy
4. Kiểm tra trên VPS: `docker compose logs -f`

**Next steps:**
- Setup domain và HTTPS
- Configure monitoring (Grafana, Prometheus)
- Setup backup tự động (cron jobs)
- Scale với load balancer (nếu cần)

Chúc bạn deploy thành công! 🚀
