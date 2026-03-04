# AI RSS Bot

Automated system for RSS content curation → AI analysis → Vietnamese digests → Facebook publishing.

## Status

- ✅ **Phase 1: Backend API** - Express + PostgreSQL + JWT + Source CRUD
- ✅ **Phase 2: AI Pipeline** - RSS ingestion + Content extraction + AI processing (2-stage) + Digest generation
- ✅ **Phase 3: Frontend Dashboard** - React admin UI for source management
- 🚧 **Phase 4: Draft Review & Facebook Publishing** - Coming next

## Quick Start

### 🚀 Production Deploy (VPS)

**Deploy lên VPS trong 15 phút:**

```bash
# 1. Push code lên GitHub
git push origin main

# 2. Setup trên VPS
ssh root@your-vps
curl -fsSL https://get.docker.com | sh
cd /opt && git clone https://github.com/your-username/ocNewsBot.git
cd ocNewsBot && cp .env.production.example .env

# 3. Chỉnh sửa .env (GitHub username, passwords, API keys)
nano .env

# 4. Deploy
chmod +x deploy.sh && ./deploy.sh latest
```

Xem [QUICKSTART.md](QUICKSTART.md) để biết chi tiết.

### 💻 Local Development

```bash
# Backend
cd server && npm install && npm run prisma:migrate && npm run dev

# Frontend (new terminal)
cd web && npm install && npm run dev
```

Xem [DEV_GUIDE.md](DEV_GUIDE.md) để biết chi tiết.

## Documentation

### 🎯 Deployment Guides
- **[QUICKSTART.md](QUICKSTART.md)** - ⚡ Deploy VPS trong 15 phút (Recommended)
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 📖 Hướng dẫn CI/CD chi tiết cho người mới
- **[README.Docker.md](README.Docker.md)** - 🐳 Docker local development

### 👨‍💻 Developer Docs
- **[DEV_GUIDE.md](DEV_GUIDE.md)** - Setup local, API docs, testing
- **[AI_CONTEXT.md](AI_CONTEXT.md)** - Project context for AI agents
- **[srs.md](srs.md)** - Software Requirements Specification

### 📚 Additional Docs
- **[DIGEST.md](DIGEST.md)** - Digest generation service
- **[AI_SETUP.md](AI_SETUP.md)** - OpenAI configuration
- **[TESTING.md](TESTING.md)** - Pipeline testing

## Tech Stack

**Backend:** Express + TypeScript + PostgreSQL + Prisma + JWT + OpenAI  
**Frontend:** Vite + React 18 + TypeScript + TanStack Query + TailwindCSS v4  
**AI:** GPT-4o-mini (Stage A filter) + GPT-4o (Stage B Vietnamese summaries)

## Pipeline Architecture

```
RSS Sources (enabled)
  → [15min] Ingest → NEW
  → [5min] Extract → EXTRACTED
  → [3min] Filter → READY_FOR_AI (ban trading content)
  → [10min] AI Stage A (gpt-4o-mini) → AI_STAGE_A_DONE (isAllowed, topicTags, score)
  → [15min] AI Stage B (gpt-4o) → AI_STAGE_B_DONE (Vietnamese summaries)
  → [daily 00:30] Digest → DRAFT (5 posts/day)
  → [human review] Approve/Reject
  → [scheduled] Facebook publish → POSTED
```

## Project Goals

- Auto-curate quality content about Education, EdTech, Blockchain Tech, Web3
- Vietnamese output with builder vibe (educational, no hype)
- Strict ban on trading/price/investment content
- Cost-efficient AI (2-stage filter + caching)
- Human approval required before publishing

## License

MIT