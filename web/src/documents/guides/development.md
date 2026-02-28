---
title: "Development Guide"
description: "Complete guide for setting up and running the development environment"
order: 3
---

# Developer Guide - ocNewsBot

Complete guide for setting up and running the Open Campus Vietnam RSS Bot.

## Quick Start

```bash
# 1. Clone and install
git clone <repository>
cd ocNewsBot

# 2. Setup backend
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
npm run prisma:migrate
npm run dev  # Runs on :3001

# 3. Setup frontend (new terminal)
cd ../web
npm install
cp .env.example .env
npm run dev  # Runs on :5173
```

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 14+
- **OpenAI API Key** (for AI features)

## Backend Setup

### 1. Database

**Option A - Docker:**
```bash
docker run --name ocvn-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=rss_bot \
  -p 5432:5432 \
  -d postgres:14
```

**Option B - Local PostgreSQL:**
```sql
CREATE DATABASE rss_bot;
```

### 2. Environment Variables

Edit `server/.env`:
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rss_bot?schema=public"

# JWT
JWT_SECRET="change-this-in-production"

# Admin credentials
ADMIN_EMAIL="admin@opencampus.vn"
ADMIN_PASSWORD_HASH="$2b$10$..." # Generate with: npx tsx scripts/generate-password-hash.ts yourpassword

# OpenAI (for AI pipeline)
OPENAI_API_KEY="sk-proj-..."
AI_STAGE_A_MODEL="gpt-4o-mini"
AI_STAGE_B_MODEL="gpt-4o"

# Server
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

### 3. Run Migrations

```bash
cd server
npm run prisma:migrate
npm run prisma:generate
```

### 4. Start Server

```bash
npm run dev  # Development with hot reload
npm run build && npm start  # Production
```

Server runs at `http://localhost:3001`

## Frontend Setup

### 1. Environment Variables

Edit `web/.env`:
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### 2. Start Frontend

```bash
cd web
npm run dev  # Development
npm run build  # Production build (output: dist/)
```

Web app runs at `http://localhost:5173`

## Testing the Pipeline

### Automated Test

```bash
cd server
npm run test:pipeline
```

This tests the full pipeline: Ingest → Extract → Filter → Status report

### Manual Testing

```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@opencampus.vn","password":"admin123"}'

# Save token, then trigger pipeline steps:

# 2. Ingest RSS
curl -X POST http://localhost:3001/api/admin/ingest/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Extract content
curl -X POST http://localhost:3001/api/admin/extraction/trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# 4. Filter content
curl -X POST http://localhost:3001/api/admin/filtering/trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# 5. AI Stage A (requires OPENAI_API_KEY)
curl -X POST http://localhost:3001/api/admin/ai/stage-a/trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'

# 6. AI Stage B
curl -X POST http://localhost:3001/api/admin/ai/stage-b/trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 3}'

# 7. Digest generation
curl -X POST http://localhost:3001/api/admin/digest/trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-02-28"}'
```

### Inspect Database

```bash
cd server
npm run prisma:studio  # Opens http://localhost:5555
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login (returns JWT token)
- `GET /api/auth/me` - Get current user

### Sources (requires JWT)
- `GET /api/sources` - List all sources
- `POST /api/sources` - Create source
- `PATCH /api/sources/:id` - Update source
- `DELETE /api/sources/:id` - Delete source
- `POST /api/sources/validate` - Validate RSS URL

### Admin Triggers (requires JWT)
- `POST /api/admin/ingest/trigger` - Trigger RSS ingest
- `POST /api/admin/extraction/trigger` - Trigger content extraction
- `POST /api/admin/filtering/trigger` - Trigger content filtering
- `POST /api/admin/ai/stage-a/trigger` - Trigger AI Stage A
- `POST /api/admin/ai/stage-b/trigger` - Trigger AI Stage B
- `POST /api/admin/digest/trigger` - Trigger digest generation

## Development Workflow

### Backend

```bash
cd server

# Development
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm test             # Run tests
npm run lint         # Check code style
npm run format       # Format code

# Database
npm run prisma:migrate    # Run migrations
npm run prisma:generate   # Generate Prisma client
npm run prisma:studio     # Open database GUI
npm run prisma:reset      # Reset database (WARNING: deletes data)
```

### Frontend

```bash
cd web

# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Check code style
```

## Background Jobs

When server starts, these cron jobs run automatically:

1. **Ingest Job** - Every 15 minutes - Fetches RSS feeds
2. **Extraction Job** - Every 5 minutes - Extracts full content
3. **Filtering Job** - Every 3 minutes - Filters trading content
4. **AI Stage A Job** - Every 10 minutes - AI filtering (batch: 5)
5. **AI Stage B Job** - Every 15 minutes - AI summarization (batch: 3)
6. **Digest Job** - Daily at 00:30 - Generates 5 posts for tomorrow

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps  # If using Docker

# Test connection
psql postgresql://postgres:postgres@localhost:5432/rss_bot

# Reset database
cd server
npm run prisma:reset
```

### OpenAI API Errors

```bash
# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check server logs for detailed errors
```

### No Items in Pipeline

```bash
# 1. Check sources are enabled
SELECT id, name, enabled FROM sources;

# 2. Manually trigger ingest
curl -X POST http://localhost:3001/api/admin/ingest/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Check server logs for errors
```

### Port Already in Use

```bash
# Change port in .env files
# server/.env: PORT=3002
# web/.env: VITE_API_BASE_URL=http://localhost:3002/api
```

## Production Deployment

### Backend

```bash
cd server

# Build
npm run build

# Set production env
export NODE_ENV=production
export DATABASE_URL="postgresql://..."
export JWT_SECRET="strong-random-secret"
export OPENAI_API_KEY="sk-proj-..."

# Start
npm start
```

### Frontend

```bash
cd web

# Build
npm run build

# Deploy dist/ folder to static hosting (Vercel, Netlify, etc.)
```

## Useful SQL Queries

```sql
-- Check pipeline status
SELECT status, COUNT(*) as count
FROM items
GROUP BY status
ORDER BY status;

-- View recent posts
SELECT target_date, time_slot, status
FROM daily_posts
ORDER BY target_date DESC
LIMIT 10;

-- Check AI results
SELECT 
  i.title,
  ar.stage,
  ar.is_allowed,
  ar.importance_score
FROM items i
JOIN ai_results ar ON i.id = ar.item_id
WHERE ar.stage = 'A'
ORDER BY i.created_at DESC
LIMIT 10;

-- Items ready for digest
SELECT COUNT(*)
FROM items
WHERE status = 'AI_STAGE_B_DONE';
```

## Tech Stack Reference

**Backend:**
- Express.js + TypeScript (strict)
- PostgreSQL + Prisma ORM
- JWT + bcrypt
- Zod validation
- node-cron (background jobs)
- OpenAI SDK
- fast-xml-parser (RSS)
- @mozilla/readability (content extraction)

**Frontend:**
- Vite 7 + React 18
- TypeScript (strict)
- React Router v7
- TanStack Query v5
- React Hook Form + Zod
- TailwindCSS v4

## Additional Documentation

- `AI_CONTEXT.md` - Project context for AI agents
- `srs.md` - Software Requirements Specification
- Full API docs: `server/API.md`
