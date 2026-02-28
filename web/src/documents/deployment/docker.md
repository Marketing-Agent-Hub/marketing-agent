---
title: Docker Deployment
description: Complete Docker setup guide with docker-compose
order: 3
---

# Docker Deployment Guide

Deploy the entire stack using Docker and Docker Compose.

## Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

### Setup Steps

1. **Copy environment template**
```bash
cp .env.docker.example .env.docker
```

2. **Configure required variables** in `.env.docker`:
   - `JWT_SECRET` - Generate with: `openssl rand -base64 32`
   - `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
   - `ADMIN_EMAIL` - Your admin email
   - `ADMIN_PASSWORD_HASH` - Generate with provided script

3. **Build and start**
```bash
docker-compose up -d --build
```

4. **Access application**
   - Frontend: http://localhost
   - Backend: http://localhost:3000

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (Nginx:80)     │
│  React SPA      │
└────────┬────────┘
         │ /api/* proxy
         ↓
┌─────────────────┐
│   Backend       │
│  (Node:3000)    │
│  Express API    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   PostgreSQL    │
│   (Port 5432)   │
└─────────────────┘
```

## Services

### PostgreSQL
- Image: postgres:16
- Port: 5432
- Volume: postgres_data (persistent)
- Health check: Automatic

### Backend
- Build: ./server/Dockerfile
- Port: 3000
- Features:
  - Auto migration on startup
  - Health check endpoint
  - Log persistence to ./server/logs

### Frontend
- Build: ./web/Dockerfile
- Port: 80
- Server: Nginx
- Features:
  - API proxy to backend
  - SPA routing support
  - Static asset caching
  - Gzip compression

## Management Commands

### Start/Stop

```bash
# Start all
docker-compose up -d

# Stop all
docker-compose down

# Stop and remove volumes (deletes data!)
docker-compose down -v
```

### View Logs

```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Rebuild Services

```bash
# Rebuild all
docker-compose up -d --build

# Rebuild specific
docker-compose up -d --build backend
```

### Database Operations

```bash
# PostgreSQL CLI
docker exec -it rss_postgres psql -U postgres -d rss_bot

# Prisma migrations
docker exec -it rss_backend npx prisma migrate deploy

# Prisma Studio
docker exec -it rss_backend npx prisma studio
```

### Shell Access

```bash
# Backend
docker exec -it rss_backend sh

# Frontend
docker exec -it rss_frontend sh

# PostgreSQL
docker exec -it rss_postgres bash
```

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database not ready → Wait for health check
# - Migration failed → Check DATABASE_URL
# - Missing env vars → Check .env.docker
```

### Frontend errors
```bash
# Check nginx logs
docker-compose logs frontend

# Verify backend is running
curl http://localhost:3000/api/health

# Check API proxy
curl http://localhost/api/health
```

### Database connection failed
```bash
# Check postgres status
docker-compose ps postgres

# Test connection
docker exec -it rss_postgres pg_isready -U postgres

# Check DATABASE_URL
docker exec -it rss_backend env | grep DATABASE_URL
```

### Reset everything
```bash
# Nuclear option - removes all data!
docker-compose down -v
docker-compose down --rmi all
docker-compose up -d --build
```

## Production Configuration

### Security Checklist

- [ ] **JWT Secret**: Generate strong secret
  ```bash
  openssl rand -base64 32
  ```

- [ ] **Admin Password**: Don't use default!
  ```bash
  ./generate-password-hash.sh "YourSecurePassword123!"
  ```

- [ ] **Database Password**: Change in docker-compose.yml (lines 9 & 29)

- [ ] **CORS Origin**: Set to your domain
  ```bash
  CORS_ORIGIN=https://yourdomain.com
  ```

- [ ] **Firewall**: Expose only ports 80/443

- [ ] **HTTPS**: Use reverse proxy (nginx/caddy)

- [ ] **Backups**: Set up database backup strategy

### Performance Tuning

#### PostgreSQL
Edit `docker-compose.yml`:
```yaml
postgres:
  environment:
    POSTGRES_SHARED_BUFFERS: 256MB
    POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
    POSTGRES_MAX_CONNECTIONS: 100
```

#### Backend
```yaml
backend:
  environment:
    NODE_OPTIONS: --max-old-space-size=2048
```

## Backup & Restore

### Backup Database

```bash
# SQL dump
docker exec rss_postgres pg_dump -U postgres rss_bot > backup_$(date +%Y%m%d_%H%M%S).sql

# Volume backup
docker run --rm \
  -v ocnewsbot_postgres_data:/data \
  -v $(pwd):/backup alpine \
  tar czf /backup/postgres_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### Restore Database

```bash
# From SQL dump
cat backup.sql | docker exec -i rss_postgres psql -U postgres rss_bot

# From volume backup
docker run --rm \
  -v ocnewsbot_postgres_data:/data \
  -v $(pwd):/backup alpine \
  tar xzf /backup/postgres_backup.tar.gz -C /
```

### Schedule Automatic Backups

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * cd /path/to/ocNewsBot && docker exec rss_postgres pg_dump -U postgres rss_bot > backups/backup_$(date +\%Y\%m\%d).sql
```

## Updates

### Update application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Update single service

```bash
# Backend only
git pull origin main
docker-compose up -d --build backend

# Frontend only
docker-compose up -d --build frontend
```

## Monitoring

### Health Checks

```bash
# All services
docker-compose ps

# Backend health
curl http://localhost:3000/api/health

# Frontend
curl http://localhost/
```

### Resource Usage

```bash
# All containers
docker stats

# Specific container
docker stats rss_backend
```

### Log Files

- Backend logs: `./server/logs/` (persisted to host)
- Frontend logs: `docker-compose logs frontend`
- PostgreSQL logs: `docker-compose logs postgres`

## Environment Variables

See [Environment Variables Reference](./environment) for complete configuration guide.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| JWT_SECRET | JWT signing key | Generated with openssl |
| OPENAI_API_KEY | OpenAI API key | sk-proj-... |
| ADMIN_EMAIL | Admin login email | admin@yourdomain.com |
| ADMIN_PASSWORD_HASH | Bcrypt password hash | Generated with script |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| AI_STAGE_A_MODEL | gpt-4o-mini | Cheap filter model |
| AI_STAGE_B_MODEL | gpt-4o | Quality summary model |
| CORS_ORIGIN | http://localhost | Frontend URL |

## Next Steps

- Setup HTTPS: See [VPS Deployment Guide](./vps#step-7-setup-https)
- Configure monitoring: See [Monitoring Guide](../monitoring/index)
- Setup backups: See backup section above
