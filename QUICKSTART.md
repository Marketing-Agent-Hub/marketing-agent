# ⚡ Quick Start - Deploy trong 15 phút

> **TL;DR**: Push code → GitHub build tự động → Deploy lên VPS → Done!

## 📋 Cần có gì?

- ✅ VPS Ubuntu (2GB RAM, 20GB disk)
- ✅ GitHub account (code đã push)
- ✅ OpenAI API key ([platform.openai.com](https://platform.openai.com))

## 🚀 Bước 1: GitHub (2 phút)

### 1.1. Push code

```bash
cd ocNewsBot
git push origin main
```

### 1.2. Public Docker images

Sau khi GitHub Actions build xong (~5 phút):

1. Vào GitHub repo → **Packages** (bên phải)
2. Click `ocnewsbot-server` → **Package settings**
3. **Change visibility** → **Public**
4. Lặp lại cho `ocnewsbot-web`

**Tại sao?** Images public thì VPS pull được miễn phí, không cần authentication.

## 🖥️ Bước 2: Setup VPS (5 phút)

### 2.1. SSH vào VPS

```bash
ssh root@your-vps-ip
```

### 2.2. Cài Docker (1 lệnh)

```bash
curl -fsSL https://get.docker.com | sh && \
sudo usermod -aG docker $USER && \
newgrp docker
```

### 2.3. Clone repo

```bash
cd /opt && \
sudo git clone https://github.com/your-username/ocNewsBot.git && \
sudo chown -R $USER:$USER ocNewsBot && \
cd ocNewsBot
```

### 2.4. Tạo file .env

```bash
cp .env.production.example .env
nano .env
```

**Chỉ cần đổi 4 dòng này:**

```bash
GITHUB_USERNAME=your-github-username          # GitHub username
POSTGRES_PASSWORD=your-secure-password-123    # Password DB
JWT_SECRET=$(openssl rand -base64 32)         # Chạy lệnh này rồi paste
OPENAI_API_KEY=sk-your-openai-key            # OpenAI key
CORS_ORIGIN=http://your-vps-ip               # IP VPS
```

**Tạo JWT_SECRET:**
```bash
openssl rand -base64 32
```

Copy kết quả → Paste vào `JWT_SECRET`.

**Lưu:** `Ctrl+X` → `Y` → `Enter`

## 🎯 Bước 3: Deploy (2 phút)

```bash
chmod +x deploy.sh
./deploy.sh latest
```

Đợi ~3 phút. Script sẽ:
- Pull images từ GitHub
- Start database
- Run migrations
- Start backend + frontend

## ✅ Bước 4: Kiểm tra

```bash
# Xem status
docker compose ps

# Test API
curl http://localhost:3001/api/health

# Xem logs
docker compose logs -f
```

**Mở trình duyệt:**
```
http://your-vps-ip
```

🎉 **Done!** Ứng dụng đã chạy!

---

## 🔄 Deploy lần sau

Khi có code mới:

```bash
cd /opt/ocNewsBot
git pull origin main
./deploy.sh latest
```

---

## 🤖 Setup Auto Deploy (Optional - 5 phút)

Để VPS tự động deploy khi push code:

### 1. Cài webhook

```bash
sudo apt install webhook -y
```

### 2. Copy config

```bash
sudo cp webhook.conf.example /etc/webhook.conf
sudo cp webhook-deploy.sh /opt/ocNewsBot/
sudo chmod +x /opt/ocNewsBot/webhook-deploy.sh
```

### 3. Tạo systemd service

```bash
cat << 'EOF' | sudo tee /etc/systemd/system/webhook.service
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
EOF
```

### 4. Start service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now webhook
sudo ufw allow 9000/tcp  # Mở port
```

### 5. Setup GitHub Webhook

1. GitHub repo → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL**: `http://your-vps-ip:9000/hooks/deploy-ocnewsbot`
3. **Content type**: `application/json`
4. **Events**: `Just the push event`
5. **Active**: ✅
6. **Add webhook**

### 6. Test

```bash
git commit --allow-empty -m "test webhook"
git push origin main
```

Xem logs trên VPS:
```bash
sudo tail -f /var/log/ocnewsbot-deploy.log
```

✅ **Giờ chỉ cần `git push`, tự động deploy!**

---

## 🛠️ Commands hay dùng

```bash
# Xem logs
docker compose logs -f server

# Restart
docker compose restart

# Stop
docker compose down

# Start
docker compose up -d

# Xem status
docker compose ps

# Backup DB
docker compose exec postgres pg_dump -U postgres rss_bot > backup.sql
```

---

## 🐛 Troubleshooting

### Container không start?

```bash
docker compose logs server
```

### Lỗi "No space left"?

```bash
docker system prune -a -f
```

### Pull images lỗi "unauthorized"?

→ Chưa public images, xem [Bước 1.2](#12-public-docker-images)

### Port 80 đang dùng?

```bash
sudo systemctl stop apache2
sudo systemctl stop nginx
```

### Webhook không chạy?

```bash
sudo systemctl status webhook
sudo journalctl -u webhook -f
```

---

## 📚 Muốn hiểu rõ hơn?

Đọc [DEPLOYMENT.md](DEPLOYMENT.md) để biết:
- CI/CD hoạt động thế nào
- Deploy với private images
- Setup HTTPS với domain
- Monitoring và backup chi tiết
- Troubleshooting đầy đủ

---

## 🆘 Cần help?

1. Kiểm tra logs: `docker compose logs -f`
2. Xem GitHub Actions: Tab **Actions** trên repo
3. Test health: `curl http://localhost:3001/api/health`
4. Đọc [DEPLOYMENT.md](DEPLOYMENT.md) phần "Xử lý sự cố"

Chúc bạn deploy thành công! 🚀
