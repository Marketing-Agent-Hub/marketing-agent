# Open Campus Vietnam – AI RSS Bot

Automated system for RSS content curation → AI analysis → Vietnamese digests → Facebook publishing.

## Status

- ✅ **Phase 1: Backend API** - Express + PostgreSQL + JWT + Source CRUD
- ✅ **Phase 2: AI Pipeline** - RSS ingestion + Content extraction + AI processing (2-stage) + Digest generation
- ✅ **Phase 3: Frontend Dashboard** - React admin UI for source management
- 🚧 **Phase 4: Draft Review & Facebook Publishing** - Coming next

## Quick Start

### Local Development
```bash
# Backend
cd server && npm install && npm run prisma:migrate && npm run dev

# Frontend (new terminal)
cd web && npm install && npm run dev
```

### Docker Deployment (Recommended for Production)
```bash
# Windows
.\docker-start.ps1

# Linux/Mac
./docker-start.sh

# Or manually
cp .env.docker.example .env.docker
# Edit .env.docker with your JWT_SECRET and OPENAI_API_KEY
docker-compose up -d --build
```

See **[README.Docker.md](README.Docker.md)** for complete Docker guide.

See **[DEV_GUIDE.md](DEV_GUIDE.md)** for complete setup instructions.

## Documentation

### Quick Start
- **[DEPLOY_VPS.md](DEPLOY_VPS.md)** - 🚀 Step-by-step VPS deployment guide
- **[README.Docker.md](README.Docker.md)** - 🐳 Docker deployment guide (production-ready)
- **[DEV_GUIDE.md](DEV_GUIDE.md)** - Complete local development setup

### For Developers
- **[DEV_GUIDE.md](DEV_GUIDE.md)** - Complete setup, testing, API reference, troubleshooting
- **[srs.md](srs.md)** - Software Requirements Specification (reference)

### For AI Agents
- **[AI_CONTEXT.md](AI_CONTEXT.md)** - Token-efficient project context, schema, rules, patterns

### Additional Docs
- **[DIGEST.md](DIGEST.md)** - Digest generation service details
- **[AI_SETUP.md](AI_SETUP.md)** - OpenAI configuration guide
- **[TESTING.md](TESTING.md)** - Pipeline testing instructions

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