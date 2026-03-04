# 📦 Files Summary

Sau khi chuyển sang GitHub Container Registry (GHCR), các files sau đã được tạo/cập nhật:

## ✅ CI/CD Files

### `.github/workflows/deploy.yml`
GitHub Actions workflow tự động build và push Docker images lên GHCR.
- Trigger: Push vào `main` hoặc `develop`
- Build: `server` và `web` images
- Registry: `ghcr.io`
- Authentication: Tự động dùng `GITHUB_TOKEN`

## 🐳 Docker Files

### `docker-compose.yml`
Cập nhật để pull images từ GHCR:
```yaml
image: ${DOCKER_REGISTRY:-ghcr.io}/${GITHUB_USERNAME}/ocnewsbot-server:${IMAGE_TAG:-latest}
```

### `.env.production.example`
Template cho production config, bao gồm:
- `GITHUB_USERNAME`: GitHub username
- `DOCKER_REGISTRY`: ghcr.io
- Database, JWT, OpenAI configs

## 🚀 Deploy Scripts

### `deploy.sh` (Linux/Mac)
Script tự động deploy:
- Load environment variables
- Pull latest images từ GHCR
- Stop containers cũ
- Run migrations
- Start containers mới
- Health checks

### `deploy.ps1` (Windows PowerShell)
Tương tự `deploy.sh` nhưng cho Windows.

### `deploy-help.sh`
Quick reference cho các lệnh thường dùng.

## 🔗 Webhook Files (Optional Auto-Deploy)

### `webhook.conf.example`
Config webhook service trên VPS để tự động deploy khi GitHub có push.

### `webhook-deploy.sh`
Script được webhook service gọi để pull code và deploy.

## 📖 Documentation

### `QUICKSTART.md` - ⚡ Deploy nhanh
Hướng dẫn ngắn gọn deploy trong 15 phút:
- Setup GitHub
- Setup VPS
- Deploy lần đầu
- Setup auto-deploy (optional)

### `DEPLOYMENT.md` - 📖 Hướng dẫn chi tiết
Tài liệu đầy đủ cho người mới:
- Giải thích CI/CD là gì
- Tại sao dùng GHCR
- Setup từng bước chi tiết
- Webhook auto-deploy
- HTTPS với Let's Encrypt
- Monitoring và backup
- Troubleshooting đầy đủ

### `README.md`
Trang chủ dự án, link đến các docs khác.

## 🗑️ Đã xóa

- ❌ `.github/workflows/docker-build-push.yml` - Workflow Docker Hub cũ
- ❌ `.github/workflows/docker-build-push-ghcr.yml` - Duplicate
- ❌ `TROUBLESHOOTING-ACTIONS.md` - Merged vào DEPLOYMENT.md
- ❌ `DEPLOY_VPS.md` - Replaced by DEPLOYMENT.md

## 🎯 Luồng CI/CD

```
┌──────────────────┐
│  1. Developer    │
│  git push main   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  2. GitHub       │
│     Actions      │
│  - Build images  │
│  - Push to GHCR  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  3. GHCR         │
│  Store images    │
│  (public/private)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  4. VPS          │
│  - Pull images   │
│  - Deploy        │
│  (manual/webhook)│
└──────────────────┘
```

## 💡 Key Differences từ version cũ

### Docker Hub → GHCR
- ❌ Cần: `DOCKER_USERNAME`, `DOCKER_PASSWORD` secrets
- ✅ Dùng: `GITHUB_TOKEN` tự động
- ❌ Giới hạn: 200 pulls/6h
- ✅ Không giới hạn cho public repos

### Workflow
- ❌ `IMAGE_PREFIX` environment variable
- ✅ Dùng `github.repository_owner` trực tiếp
- ✅ Cache type `gha` (GitHub Actions cache)

### .env file
- ❌ `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- ✅ `GITHUB_USERNAME` (cho pull images)
- ✅ Không cần login nếu images là public

## 🚀 Quick Commands

```bash
# Local: Push code
git push origin main

# VPS: Deploy
cd /opt/ocNewsBot
./deploy.sh latest

# VPS: Xem logs
docker compose logs -f

# VPS: Restart
docker compose restart
```

## 📞 Support

- [QUICKSTART.md](QUICKSTART.md) - Bắt đầu nhanh
- [DEPLOYMENT.md](DEPLOYMENT.md) - Hướng dẫn chi tiết
- GitHub Issues - Report bugs
