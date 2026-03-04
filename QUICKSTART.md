# 🚀 Quick Start - CI/CD Deployment

Hướng dẫn nhanh để deploy lần đầu trong 10 phút.

## ✅ Prerequisites

- [ ] VPS với Ubuntu 20.04+ (tối thiểu 2GB RAM)
- [ ] Domain (optional, có thể dùng IP)
- [ ] Tài khoản Docker Hub
- [ ] Tài khoản GitHub (repository đã push)

## 📋 Checklist Deploy

### 1️⃣ Setup GitHub (2 phút)

```bash
# Trên máy local
cd ocNewsBot

# Đảm bảo đã push code
git add .
git commit -m "setup: CI/CD deployment"
git push origin main
```

**Thêm GitHub Secrets:**
1. Vào `Settings` → `Secrets and variables` → `Actions`
2. Click `New repository secret`
3. Thêm 2 secrets:
   - `DOCKER_USERNAME`: username Docker Hub
   - `DOCKER_PASSWORD`: Docker Hub access token

### 2️⃣ Setup VPS (5 phút)

```bash
# SSH vào VPS
ssh root@your-vps-ip

# 1. Cài Docker (1 phút)
curl -fsSL https://get.docker.com | sh
docker --version

# 2. Clone repository (30 giây)
cd /opt
git clone https://github.com/your-username/ocNewsBot.git
cd ocNewsBot

# 3. Tạo .env (1 phút)
cp .env.production.example .env
nano .env
```

**Chỉnh sửa .env - CHỈ CẦN ĐỔI NHỮNG DÒNG SAU:**
```bash
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-token
JWT_SECRET=your-random-secret-here
OPENAI_API_KEY=sk-your-openai-key
CORS_ORIGIN=http://your-vps-ip
```

Tạo JWT secret:
```bash
openssl rand -base64 32
```

### 3️⃣ Deploy lần đầu (2 phút)

```bash
# Cho phép chạy script
chmod +x deploy.sh

# Deploy!
./deploy.sh latest
```

Đợi ~2 phút để:
- Pull images từ Docker Hub
- Khởi động containers
- Run migrations

### 4️⃣ Kiểm tra (30 giây)

```bash
# Xem trạng thái
docker compose ps

# Kiểm tra health
curl http://localhost:3001/api/health
curl http://localhost/

# Xem logs
docker compose logs -f
```

✅ **Xong!** Truy cập: `http://your-vps-ip`

## 🔄 Deploy lần sau (10 giây)

Khi có update:
```bash
# Local
git push origin main

# VPS (hoặc setup webhook để tự động)
cd /opt/ocNewsBot
./deploy.sh latest
```

## 🤖 Setup Auto Deploy (Optional - 5 phút)

Để VPS tự động deploy khi push:

```bash
# 1. Cài webhook
sudo apt install webhook -y

# 2. Copy config
sudo cp webhook.conf.example /etc/webhook.conf
sudo nano /etc/webhook.conf
# Đổi secret thành random string

# 3. Tạo systemd service
sudo nano /etc/systemd/system/webhook.service
```

Copy nội dung sau:
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
# 4. Enable service
sudo systemctl daemon-reload
sudo systemctl enable --now webhook

# 5. Mở port 9000 (nếu có firewall)
sudo ufw allow 9000
```

**Setup GitHub Webhook:**
1. Vào GitHub repo → `Settings` → `Webhooks` → `Add webhook`
2. Payload URL: `http://your-vps-ip:9000/hooks/deploy-ocnewsbot`
3. Content type: `application/json`
4. Secret: (copy từ webhook.conf)
5. Events: `Just the push event`
6. Active: ✅

✅ **Done!** Giờ chỉ cần `git push`, VPS tự động deploy!

## 🐛 Troubleshooting

### Lỗi "Cannot connect to Docker daemon"
```bash
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker
```

### Container không healthy
```bash
docker compose logs server
# Thường là thiếu biến môi trường trong .env
```

### Port 80 đã dùng
```bash
sudo systemctl stop apache2  # hoặc nginx
```

### Out of memory
```bash
# Tạo swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📚 Tài liệu đầy đủ

Xem [DEPLOYMENT.md](DEPLOYMENT.md) để biết chi tiết về:
- Các options Docker Registry khác (ghcr.io, self-hosted)
- Setup HTTPS với Let's Encrypt
- Monitoring và backup
- Advanced deployment strategies

## 🆘 Cần help?

1. Logs: `docker compose logs -f`
2. Status: `docker compose ps`
3. Restart: `docker compose restart`
4. Full reset: `docker compose down && ./deploy.sh latest`
