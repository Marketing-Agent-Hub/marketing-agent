# Docker Deployment Guide

## Quick Start

### 1. Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

### 2. Setup Environment Variables

```bash
# Copy and edit environment file
cp .env.docker.example .env.docker

# Edit .env.docker with your actual values:
```

**REQUIRED variables:**

1. **JWT_SECRET**: Strong secret key (min 32 chars)
   ```bash
   # Generate random secret
   openssl rand -base64 32
   ```

2. **OPENAI_API_KEY**: Your OpenAI API key
   - Get from: https://platform.openai.com/api-keys

3. **ADMIN_EMAIL**: Admin user email for first login
   ```
   ADMIN_EMAIL=admin@yourdomain.com
   ```

4. **ADMIN_PASSWORD_HASH**: Bcrypt hash of admin password
   ```bash
   # Generate hash (Windows)
   .\generate-password-hash.ps1 "your-secure-password"
   
   # Generate hash (Linux/Mac)
   ./generate-password-hash.sh "your-secure-password"
   
   # Or manually with Node.js
   node -e "console.log(require('bcrypt').hashSync('your-password', 10))"
   ```

**OPTIONAL variables** (have defaults):
- `AI_STAGE_A_MODEL`: Default is `gpt-4o-mini`
- `AI_STAGE_B_MODEL`: Default is `gpt-4o`
- `CORS_ORIGIN`: Default is `http://localhost`

**NOTE**: `DATABASE_URL`, `PORT`, `NODE_ENV` are already configured in docker-compose.yml.

### 3. Build and Run

```bash
# Build and start all services
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Check specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. Access Services

- **Frontend UI**: http://localhost
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432

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

### 1. PostgreSQL (postgres)
- **Image**: postgres:16
- **Port**: 5432
- **Volume**: postgres_data
- **Health Check**: Automatic

### 2. Backend (backend)
- **Build**: ./server/Dockerfile
- **Port**: 3000
- **Dependencies**: Waits for postgres health
- **Features**:
  - Auto migration on startup
  - Health check endpoint
  - Log persistence

### 3. Frontend (frontend)
- **Build**: ./web/Dockerfile
- **Port**: 80
- **Server**: Nginx
- **Features**:
  - API proxy to backend
  - SPA routing support
  - Static asset caching
  - Gzip compression

## Management Commands

### Start/Stop
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Logs
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Rebuild
```bash
# Rebuild specific service
docker-compose up -d --build backend
docker-compose up -d --build frontend

# Rebuild all
docker-compose up -d --build
```

### Database Operations
```bash
# Access PostgreSQL CLI
docker exec -it rss_postgres psql -U postgres -d rss_bot

# Run Prisma migrations
docker exec -it rss_backend npx prisma migrate deploy

# Access Prisma Studio
docker exec -it rss_backend npx prisma studio
```

### Shell Access
```bash
# Backend container
docker exec -it rss_backend sh

# Frontend container
docker exec -it rss_frontend sh

# PostgreSQL container
docker exec -it rss_postgres bash
```

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Database not ready -> Wait for postgres health check
# 2. Migration failed -> Check DATABASE_URL
# 3. Missing env vars -> Check .env.docker
```

### Frontend shows errors
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
# Check postgres is running
docker-compose ps postgres

# Test connection
docker exec -it rss_postgres pg_isready -U postgres

# Check DATABASE_URL in backend
docker exec -it rss_backend env | grep DATABASE_URL
```

### Reset everything
```bash
# Stop and remove all containers, networks, volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

## Production Checklist

- [ ] Generate strong `JWT_SECRET`: `openssl rand -base64 32`
- [ ] Set valid `OPENAI_API_KEY` from platform.openai.com
- [ ] Configure `ADMIN_EMAIL` with your email
- [ ] Generate secure `ADMIN_PASSWORD_HASH` (don't use default!)
  ```bash
  # Windows
  .\generate-password-hash.ps1 "YourSecurePassword123!"
  
  # Linux/Mac
  ./generate-password-hash.sh "YourSecurePassword123!"
  ```
- [ ] Change PostgreSQL password in docker-compose.yml (line 9 & 29)
- [ ] Review AI model settings (`AI_STAGE_A_MODEL`, `AI_STAGE_B_MODEL`)
- [ ] Configure `CORS_ORIGIN` if using custom domain
- [ ] Set up backup strategy for postgres_data volume
- [ ] Configure firewall (expose only port 80/443)
- [ ] Use reverse proxy (nginx/caddy) with SSL for HTTPS
- [ ] Monitor logs: `docker-compose logs -f`
- [ ] Set up log rotation for ./server/logs
- [ ] Enable Docker restart policies (already configured)
- [ ] Test admin login at http://your-domain/login

## Performance Tuning

### PostgreSQL
Edit docker-compose.yml postgres environment:
```yaml
environment:
  POSTGRES_SHARED_BUFFERS: 256MB
  POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
  POSTGRES_MAX_CONNECTIONS: 100
```

### Backend
Edit docker-compose.yml backend environment:
```yaml
environment:
  NODE_OPTIONS: --max-old-space-size=2048
```

### Nginx Cache
Frontend already configured with:
- Gzip compression
- Static asset caching (1 year)
- Browser caching headers

## Backup & Restore

### Backup Database
```bash
# Create backup
docker exec rss_postgres pg_dump -U postgres rss_bot > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use docker volume backup
docker run --rm -v ocnewsbot_postgres_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/postgres_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### Restore Database
```bash
# From SQL dump
cat backup.sql | docker exec -i rss_postgres psql -U postgres rss_bot

# From volume backup
docker run --rm -v ocnewsbot_postgres_data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/postgres_backup.tar.gz -C /
```

## Updates

### Pull latest code and rebuild
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Update single service
```bash
# Backend
git pull origin main
docker-compose up -d --build backend

# Frontend
git pull origin main
docker-compose up -d --build frontend
```

## Monitoring

### Health Checks
```bash
# Check all services health
docker-compose ps

# Backend health
curl http://localhost:3000/api/health

# Frontend health
curl http://localhost/
```

### Resource Usage
```bash
# Check resource usage
docker stats

# Specific container
docker stats rss_backend
```

### Logs Location
- Backend logs: `./server/logs/` (persisted)
- Frontend logs: `docker-compose logs frontend`
- PostgreSQL logs: `docker-compose logs postgres`
