# Hướng dẫn CI/CD với Docker Registry

Hướng dẫn này sẽ giúp bạn thiết lập CI/CD tự động để deploy dự án ocNewsBot lên VPS với Docker Registry.

## 📋 Tổng quan

**Luồng CI/CD:**
1. Push code lên GitHub (branch `main` hoặc `develop`)
2. GitHub Actions tự động build Docker images
3. Push images lên Docker Hub (hoặc registry khác)
4. VPS pull images mới và tự động deploy

## 🚀 Bước 1: Setup Docker Registry

### Option 1: Docker Hub (Khuyến nghị cho mục đích học tập)

1. Đăng ký tài khoản tại [https://hub.docker.com](https://hub.docker.com)
2. Tạo Access Token:
   - Vào **Account Settings** → **Security** → **New Access Token**
   - Tên: `github-actions`
   - Permissions: **Read, Write, Delete**
   - Copy token (chỉ hiện 1 lần)

### Option 2: GitHub Container Registry (ghcr.io)

Miễn phí với GitHub, không cần đăng ký riêng. Chỉ cần cập nhật file workflow:
```yaml
env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ${{ github.repository_owner }}
```

### Option 3: Self-hosted Registry

Nếu muốn tự host registry trên VPS:
```bash
docker run -d -p 5000:5000 --restart=always --name registry \
  -v /opt/registry:/var/lib/registry \
  registry:2
```

## 🔐 Bước 2: Cấu hình GitHub Secrets

Vào GitHub Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Thêm các secrets sau:

| Secret Name | Giá trị | Mô tả |
|------------|---------|-------|
| `DOCKER_USERNAME` | username của bạn | Docker Hub username hoặc GitHub username |
| `DOCKER_PASSWORD` | access token | Docker Hub token hoặc GitHub PAT |

### Tạo GitHub Personal Access Token (nếu dùng ghcr.io):
1. Vào **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token** với quyền: `write:packages`, `read:packages`, `delete:packages`

## ⚙️ Bước 3: Setup trên VPS

### 3.1. Cài đặt Docker và Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm user vào docker group
sudo usermod -aG docker $USER
newgrp docker

# Cài Docker Compose (nếu chưa có)
sudo apt install docker-compose-plugin -y

# Kiểm tra
docker --version
docker compose version
```

### 3.2. Clone repository và cấu hình

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/your-username/ocNewsBot.git
cd ocNewsBot

# Tạo file .env từ template
cp .env.production.example .env
nano .env
```

**Chỉnh sửa file `.env`:**
```bash
# Thông tin Docker Registry
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password-or-token
IMAGE_TAG=latest

# Database (giữ nguyên hoặc đổi password)
POSTGRES_PASSWORD=your-secure-password

# JWT Secret (tạo random string)
JWT_SECRET=$(openssl rand -base64 32)

# AI API Keys
OPENAI_API_KEY=your-openai-key

# CORS (thay domain của bạn)
CORS_ORIGIN=http://your-vps-ip-or-domain.com
```

### 3.3. Tạo thư mục logs

```bash
mkdir -p server/logs
chmod 755 server/logs
```

### 3.4. Chạy lần đầu

```bash
# Login Docker Registry
echo $DOCKER_PASSWORD | docker login docker.io -u $DOCKER_USERNAME --password-stdin

# Pull images
docker compose pull

# Khởi động
docker compose up -d

# Kiểm tra logs
docker compose logs -f
```

### 3.5. Chạy database migrations

```bash
docker compose exec server npx prisma migrate deploy
```

## 🔄 Bước 4: Deploy tự động

### Option A: Sử dụng script deploy

Script đã được tạo sẵn trong project:

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh latest
```

**Windows (PowerShell):**
```powershell
.\deploy.ps1 -ImageTag latest
```

### Option B: Webhook tự động (Khuyến nghị)

Cài đặt webhook để VPS tự động deploy khi có push mới:

#### 4.1. Cài webhook runner

```bash
# Cài webhook
sudo apt install webhook -y

# Tạo script webhook
sudo nano /opt/ocNewsBot/webhook-deploy.sh
```

**Nội dung `webhook-deploy.sh`:**
```bash
#!/bin/bash
cd /opt/ocNewsBot
git pull origin main
./deploy.sh main
```

```bash
chmod +x /opt/ocNewsBot/webhook-deploy.sh
```

#### 4.2. Cấu hình webhook

```bash
sudo nano /etc/webhook.conf
```

**Nội dung:**
```json
[
  {
    "id": "deploy-ocnewsbot",
    "execute-command": "/opt/ocNewsBot/webhook-deploy.sh",
    "command-working-directory": "/opt/ocNewsBot",
    "pass-arguments-to-command": [],
    "response-message": "Deploy started",
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hash-sha256",
            "secret": "your-webhook-secret-here",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature-256"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/main",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  }
]
```

#### 4.3. Chạy webhook service

```bash
# Tạo systemd service
sudo nano /etc/systemd/system/webhook.service
```

**Nội dung:**
```ini
[Unit]
Description=Webhook Service
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/webhook -hooks /etc/webhook.conf -verbose -port 9000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Enable và start service
sudo systemctl daemon-reload
sudo systemctl enable webhook
sudo systemctl start webhook
sudo systemctl status webhook
```

#### 4.4. Cấu hình GitHub Webhook

1. Vào GitHub Repository → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL**: `http://your-vps-ip:9000/hooks/deploy-ocnewsbot`
3. **Content type**: `application/json`
4. **Secret**: Nhập secret từ `/etc/webhook.conf`
5. **Events**: Chọn **Just the push event**
6. **Active**: ✅
7. Click **Add webhook**

### Option C: GitHub Actions với SSH (Deploy từ CI)

Thêm job deploy vào workflow:

```yaml
# Thêm vào .github/workflows/docker-build-push.yml

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to VPS
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

**Thêm secrets vào GitHub:**
- `VPS_HOST`: IP hoặc domain VPS
- `VPS_USERNAME`: Username SSH (thường là `root` hoặc `ubuntu`)
- `VPS_SSH_KEY`: Private SSH key

## 🔒 Bước 5: Cấu hình Nginx Reverse Proxy (Optional)

Nếu muốn sử dụng domain với HTTPS:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

**Tạo Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/ocnewsbot
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ocnewsbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Cài SSL certificate
sudo certbot --nginx -d your-domain.com
```

## 📊 Bước 6: Monitoring và Maintenance

### Xem logs

```bash
# Tất cả services
docker compose logs -f

# Specific service
docker compose logs -f server
docker compose logs -f web
docker compose logs -f postgres
```

### Kiểm tra trạng thái

```bash
docker compose ps
```

### Restart services

```bash
# Restart tất cả
docker compose restart

# Restart specific service
docker compose restart server
```

### Backup database

```bash
# Tạo backup
docker compose exec postgres pg_dump -U postgres rss_bot > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
cat backup_file.sql | docker compose exec -T postgres psql -U postgres rss_bot
```

### Dọn dẹp

```bash
# Xóa images cũ
docker image prune -a -f

# Xóa volumes không dùng
docker volume prune -f

# Xóa containers stopped
docker container prune -f
```

## 🎯 Quy trình Deploy hàng ngày

1. **Development:**
   ```bash
   git add .
   git commit -m "feat: new feature"
   git push origin develop
   ```

2. **CI/CD tự động:**
   - GitHub Actions build images với tag `develop-{sha}`
   - Push lên Docker Registry

3. **Test trên VPS:**
   ```bash
   ./deploy.sh develop-abc123
   ```

4. **Merge vào main:**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

5. **Production deploy tự động:**
   - GitHub Actions build với tag `latest`
   - Webhook trigger deploy trên VPS
   - Hoặc chạy manual: `./deploy.sh latest`

## 🐛 Troubleshooting

### Lỗi "permission denied" khi chạy deploy.sh

```bash
chmod +x deploy.sh
```

### Container không healthy

```bash
docker compose logs server
docker compose exec server npm run prisma:migrate
```

### Images không pull được

```bash
# Kiểm tra login
docker login docker.io -u your-username

# Pull manual
docker pull your-username/ocnewsbot-server:latest
```

### Port 80 đã được sử dụng

```bash
# Kiểm tra process nào đang dùng
sudo lsof -i :80

# Stop nginx nếu có
sudo systemctl stop nginx
```

## 📚 Tài liệu tham khảo

- [Docker Hub](https://hub.docker.com)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Docker Compose](https://docs.docker.com/compose/)
- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

## 🆘 Support

Nếu gặp vấn đề, kiểm tra:
1. Logs: `docker compose logs -f`
2. Container status: `docker compose ps`
3. Network: `docker network ls`
4. Disk space: `df -h`
5. Memory: `free -h`
