# Hướng dẫn Auto-Deploy tự động

## Quy trình hiện tại vs Quy trình tự động

### ❌ Trước (Thủ công)
```bash
# Mỗi lần update phải SSH vào VPS
ssh root@x0gengar.space
cd /root/oc-news-bot
git pull origin main          # Pull code (không cần thiết nếu chỉ đổi server/web code)
docker compose pull           # Pull images
docker compose up -d          # Restart
```

### ✅ Sau (Tự động 100%)
```bash
# Trên máy local - chỉ cần push code
git push origin main

# GitHub Actions tự động:
# 1. Build Docker images
# 2. Push lên GHCR
# 3. SSH vào VPS
# 4. Pull images mới
# 5. Restart containers
# 6. Kiểm tra health
```

---

## Setup Auto-Deploy (1 lần duy nhất)

### Bước 1: Tạo SSH Key trên VPS

```bash
# SSH vào VPS
ssh root@x0gengar.space

# Tạo dedicated SSH key cho GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-actions

# Cho phép key này truy cập
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Copy PRIVATE KEY (giữ bí mật!)
cat ~/.ssh/github-actions
```

**Output sẽ giống:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW...
(nhiều dòng)
-----END OPENSSH PRIVATE KEY-----
```

**Copy toàn bộ nội dung từ BEGIN đến END!**

---

### Bước 2: Thêm Secrets vào GitHub

1. **Truy cập GitHub repo:** https://github.com/Menh1505/oc-news-bot

2. **Vào Settings → Secrets and variables → Actions**

3. **Click "New repository secret" và thêm 3 secrets:**

   **Secret 1: VPS_HOST**
   ```
   Name: VPS_HOST
   Value: x0gengar.space
   ```
   *(hoặc dùng IP: 123.45.67.89)*

   **Secret 2: VPS_USER**
   ```
   Name: VPS_USER
   Value: root
   ```

   **Secret 3: VPS_SSH_KEY**
   ```
   Name: VPS_SSH_KEY
   Value: (paste private key từ bước 1)
   ```
   ⚠️ Paste toàn bộ từ `-----BEGIN` đến `-----END-----`

4. **Click "Add secret"** cho từng secret

---

### Bước 3: Test Auto-Deploy

```bash
# Trên máy local - tạo commit test
echo "# Test auto-deploy" >> README.md
git add README.md
git commit -m "test: auto-deploy workflow"
git push origin main
```

**Xem kết quả:**
1. Vào GitHub repo → Actions tab
2. Sẽ thấy 2 workflows chạy:
   - ✅ "Build and Deploy Docker Images" (build image)
   - ✅ "Deploy to VPS" (deploy tự động)

3. Sau ~5-10 phút, check VPS:
```bash
docker compose ps  # Thấy containers restart với image mới
docker compose logs -f server web
```

---

## Cách hoạt động

```mermaid
graph LR
    A[Push code] --> B[GitHub Actions: Build]
    B --> C[Push images to GHCR]
    C --> D[Trigger Deploy Workflow]
    D --> E[SSH vào VPS]
    E --> F[Pull images mới]
    F --> G[Restart containers]
    G --> H[Health check]
    H --> I[✅ Done]
```

**Timeline:**
- Build images: ~3-5 phút
- Deploy to VPS: ~1 phút
- **Tổng: ~5-6 phút tự động hoàn toàn**

---

## Khi nào cần Pull Code?

### ❌ KHÔNG cần pull code khi:
- Sửa code server (TypeScript, controllers, services...)
- Sửa code web (React, components...)
- Thêm/sửa dependencies (package.json)
- **→ Chỉ cần push code, GitHub Actions tự động deploy**

### ✅ CẦN pull code khi:
- Sửa `docker-compose.yml`
- Sửa `nginx/default.conf`
- Sửa script `.sh` / `.ps1`
- Thêm file config mới

**Lý do:** Những file này KHÔNG nằm trong Docker image, nằm trên VPS filesystem.

**Pull code thủ công:**
```bash
ssh root@x0gengar.space
cd /root/oc-news-bot
git pull origin main
docker compose up -d  # Restart để apply config mới
```

---

## Xử lý lỗi

### Lỗi: SSH connection failed
**Nguyên nhân:** Private key sai hoặc VPS chặn GitHub IPs

**Fix:**
```bash
# Trên VPS - cho phép SSH từ mọi IP
sudo ufw allow 22/tcp
sudo systemctl restart ssh

# Test SSH key từ máy local
ssh -i ~/.ssh/github-actions root@x0gengar.space
```

### Lỗi: docker compose command not found
**Nguyên nhân:** Docker không trong PATH của SSH non-interactive shell

**Fix - thêm vào workflow:**
```yaml
script: |
  export PATH=/usr/local/bin:/usr/bin:/bin
  cd /root/oc-news-bot
  /usr/local/bin/docker compose pull
```

### Lỗi: Permission denied accessing .env
**Nguyên nhân:** File .env không có quyền đọc

**Fix:**
```bash
chmod 644 /root/oc-news-bot/.env
```

---

## Giám sát Deployment

### Xem logs GitHub Actions:
https://github.com/Menh1505/oc-news-bot/actions

### Xem logs trên VPS:
```bash
# Real-time logs
docker compose logs -f server web

# Logs 100 dòng cuối
docker compose logs --tail=100 server web

# Check container status
docker compose ps
```

### Rollback nếu có lỗi:
```bash
# Pull image version cũ
export IMAGE_TAG=<commit-sha>  # VD: 973f3d8
docker compose pull
docker compose up -d

# Hoặc rollback về latest trước đó
docker compose down
docker system prune -f
docker compose up -d
```

---

## Bonus: Watchtower (Alternative)

Nếu không muốn dùng GitHub Actions, có thể dùng **Watchtower** để tự động pull image mới:

**Thêm vào docker-compose.yml:**
```yaml
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=300  # Check mỗi 5 phút
      - WATCHTOWER_LABEL_ENABLE=true
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
```

**Tag containers cần auto-update:**
```yaml
  server:
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
  web:
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

**Ưu/Nhược điểm:**
- ✅ Đơn giản, không cần SSH key
- ✅ Tự động check và pull image mới
- ❌ Không chạy migrations tự động
- ❌ Không có log deployment trên GitHub

---

## Khuyến nghị

**Cho Production:** GitHub Actions auto-deploy (workflow vừa tạo)
- ✅ Có log deployment đầy đủ
- ✅ Chạy migrations tự động
- ✅ Zero-downtime restart
- ✅ Có thể thêm testing, notifications, rollback...

**Cho Development/Testing:** Watchtower hoặc manual
- Nhanh, đơn giản
- Dễ rollback

---

## Tóm tắt

Sau khi setup xong, quy trình deploy chỉ còn:

```bash
# Sửa code thoải mái
git add .
git commit -m "feat: new feature"
git push origin main

# Đợi 5 phút → Xong!
# Không cần SSH vào VPS
# Không cần pull code/image thủ công
```

**VPS tự động:**
1. ✅ Pull images mới từ GHCR
2. ✅ Restart containers
3. ✅ Health check
4. ✅ Cleanup images cũ
