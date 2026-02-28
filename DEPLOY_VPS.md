# Quick Deployment Guide for VPS

## Prerequisites
- VPS with Ubuntu 20.04+ / Debian 11+
- Root or sudo access
- Domain name (optional, for HTTPS)

## Step-by-Step Deployment

### 1. Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group (optional, to run docker without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

### 2. Clone Repository

```bash
# Clone from GitHub
git clone https://github.com/your-username/ocNewsBot.git
cd ocNewsBot

# Or upload files via SFTP/SCP
```

### 3. Configure Environment Variables

```bash
# Copy template
cp .env.docker.example .env.docker

# Edit configuration
nano .env.docker  # or use vim, vi
```

**Fill in these REQUIRED values:**

#### 3.1. Generate JWT Secret
```bash
# On VPS
openssl rand -base64 32
```
Copy output to `JWT_SECRET=...`

#### 3.2. OpenAI API Key
- Go to https://platform.openai.com/api-keys
- Create new key
- Copy to `OPENAI_API_KEY=sk-...`

#### 3.3. Admin Credentials
Set your admin email:
```bash
ADMIN_EMAIL=admin@yourdomain.com
```

#### 3.4. Generate Password Hash
```bash
# Make script executable
chmod +x generate-password-hash.sh

# Generate hash (replace with your secure password)
./generate-password-hash.sh "YourSecurePassword123!"
```
Copy output to `ADMIN_PASSWORD_HASH=...`

#### 3.5. CORS Origin (Optional)
If using custom domain, set:
```bash
CORS_ORIGIN=https://yourdomain.com
```

### 4. Change Database Password (IMPORTANT!)

Edit `docker-compose.yml`:
```bash
nano docker-compose.yml
```

Change password in TWO places:
- Line 9: `POSTGRES_PASSWORD: your-new-secure-password`
- Line 29: `DATABASE_URL: postgresql://postgres:your-new-secure-password@postgres:5432/rss_bot?schema=public`

### 5. Build & Start Services

```bash
# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Wait for services to be ready (30-60 seconds)
# You should see: "✅ Server started on port 3000"
```

### 6. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Test backend health
curl http://localhost:3000/api/health

# Test frontend
curl http://localhost/
```

### 7. Access Application

- **Frontend**: http://your-vps-ip
- **Login**: Use ADMIN_EMAIL and password you set

## Setup HTTPS (Production)

### Option 1: Using Caddy (Recommended - Auto SSL)

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Configure Caddy
sudo nano /etc/caddy/Caddyfile
```

Add this configuration:
```
yourdomain.com {
    reverse_proxy localhost:80
}
```

```bash
# Restart Caddy
sudo systemctl restart caddy
```

### Option 2: Using Nginx + Certbot

```bash
# Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# Configure Nginx
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

## Maintenance Commands

### View Logs
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Backup Database
```bash
# Create backup
docker exec rss_postgres pg_dump -U postgres rss_bot > backup_$(date +%Y%m%d_%H%M%S).sql

# Schedule daily backups (crontab)
crontab -e
# Add: 0 2 * * * cd /path/to/ocNewsBot && docker exec rss_postgres pg_dump -U postgres rss_bot > backups/backup_$(date +\%Y\%m\%d).sql
```

### Monitor Resources
```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Check logs size
du -sh server/logs/
```

## Firewall Configuration

```bash
# Allow SSH (if not already)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Check if ports are in use
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5432

# Stop conflicting services
sudo systemctl stop apache2  # if using Apache
```

### Database connection errors
```bash
# Check postgres is running
docker-compose ps postgres

# Check DATABASE_URL matches POSTGRES_PASSWORD
cat .env.docker | grep PASSWORD
grep POSTGRES_PASSWORD docker-compose.yml
```

### Cannot login
```bash
# Check admin credentials
cat .env.docker | grep ADMIN

# Verify password hash is correct
# Re-generate if needed:
./generate-password-hash.sh "your-password"
```

### Out of disk space
```bash
# Clean Docker
docker system prune -a
docker volume prune

# Clean old logs
rm server/logs/*.log.old
```

## Security Checklist

- [ ] Changed DATABASE_URL password in docker-compose.yml
- [ ] Generated strong JWT_SECRET (32+ chars)
- [ ] Set secure ADMIN_PASSWORD_HASH (not default)
- [ ] Configured firewall (ufw)
- [ ] Setup HTTPS with valid SSL certificate
- [ ] Regular backups scheduled
- [ ] Monitor disk space usage
- [ ] Keep Docker and system updated
- [ ] Review logs regularly for errors

## Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment: `cat .env.docker`
3. Check health: `curl http://localhost:3000/api/health`
4. Review [README.Docker.md](README.Docker.md) for detailed docs
