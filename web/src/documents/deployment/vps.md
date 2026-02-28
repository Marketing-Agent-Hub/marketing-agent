---
title: VPS Deployment
description: Step-by-step guide for deploying to VPS with Docker
order: 2
---

# VPS Deployment Guide

Complete guide for deploying Open Campus Vietnam RSS Bot to a VPS server.

## Prerequisites

- VPS with Ubuntu 20.04+ / Debian 11+
- Root or sudo access
- Domain name (optional, for HTTPS)

## Step 1: Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group (optional)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

## Step 2: Clone Repository

```bash
# Clone from GitHub
git clone https://github.com/your-username/ocNewsBot.git
cd ocNewsBot

# Or upload files via SFTP/SCP
```

## Step 3: Configure Environment

```bash
# Copy template
cp .env.docker.example .env.docker

# Edit configuration
nano .env.docker
```

### Required Configuration

#### 3.1. Generate JWT Secret
```bash
openssl rand -base64 32
```
Copy output to `JWT_SECRET=...`

#### 3.2. OpenAI API Key
- Go to https://platform.openai.com/api-keys
- Create new key
- Copy to `OPENAI_API_KEY=sk-...`

#### 3.3. Admin Credentials
```bash
ADMIN_EMAIL=admin@yourdomain.com
```

#### 3.4. Generate Password Hash
```bash
chmod +x generate-password-hash.sh
./generate-password-hash.sh "YourSecurePassword123!"
```
Copy output to `ADMIN_PASSWORD_HASH=...`

#### 3.5. CORS Origin
```bash
CORS_ORIGIN=https://yourdomain.com
```

## Step 4: Secure Database Password

Edit `docker-compose.yml`:
```bash
nano docker-compose.yml
```

Change password in **TWO places**:
- Line 9: `POSTGRES_PASSWORD: your-new-secure-password`
- Line 29: `DATABASE_URL: postgresql://postgres:your-new-secure-password@postgres:5432/rss_bot?schema=public`

## Step 5: Build & Start Services

```bash
# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Wait 30-60 seconds for startup
# You should see: "✅ Server started on port 3000"
```

## Step 6: Verify Deployment

```bash
# Check services
docker-compose ps

# Test backend
curl http://localhost:3000/api/health

# Test frontend
curl http://localhost/
```

## Step 7: Setup HTTPS

### Option 1: Caddy (Recommended - Auto SSL)

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Configure
sudo nano /etc/caddy/Caddyfile
```

Add:
```
yourdomain.com {
    reverse_proxy localhost:80
}
```

```bash
sudo systemctl restart caddy
```

### Option 2: Nginx + Certbot

```bash
# Install
sudo apt install nginx certbot python3-certbot-nginx -y

# Configure
sudo nano /etc/nginx/sites-available/ocnewsbot
```

Add:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ocnewsbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

## Maintenance

### View Logs
```bash
docker-compose logs -f
docker-compose logs -f backend
```

### Restart Services
```bash
docker-compose restart
docker-compose restart backend
```

### Update Application
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Backup Database
```bash
# Create backup
docker exec rss_postgres pg_dump -U postgres rss_bot > backup_$(date +%Y%m%d_%H%M%S).sql

# Schedule daily backups
crontab -e
# Add: 0 2 * * * cd /path/to/ocNewsBot && docker exec rss_postgres pg_dump -U postgres rss_bot > backups/backup_$(date +\%Y\%m\%d).sql
```

### Monitor Resources
```bash
docker stats
df -h
du -sh server/logs/
```

## Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

## Troubleshooting

### Services won't start
```bash
docker-compose logs
sudo netstat -tulpn | grep :80
```

### Database errors
```bash
docker-compose ps postgres
cat .env.docker | grep PASSWORD
```

### Cannot login
```bash
cat .env.docker | grep ADMIN
./generate-password-hash.sh "your-password"
```

### Out of disk space
```bash
docker system prune -a
docker volume prune
rm server/logs/*.log.old
```

## Security Checklist

- [ ] Changed database password
- [ ] Generated strong JWT secret
- [ ] Set secure admin password
- [ ] Configured firewall
- [ ] Setup HTTPS
- [ ] Scheduled backups
- [ ] Monitor disk space

## Access Application

- **Frontend**: https://yourdomain.com
- **Login**: Use your configured ADMIN_EMAIL and password
