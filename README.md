# Marketing Agent

Automated system for RSS content curation â†’ AI analysis â†’ Vietnamese digests â†’ Facebook publishing.

## Status

- âœ… **Phase 1: Backend API** - Express + PostgreSQL + JWT + Source CRUD
- âœ… **Phase 2: AI Pipeline** - RSS ingestion + Content extraction + AI processing (2-stage) + Digest generation
- âœ… **Phase 3: Frontend Dashboard** - React admin UI for source management
- ðŸš§ **Phase 4: Draft Review & Facebook Publishing** - Coming next

## Quick Start

### ðŸš€ Production Deploy (VPS)

**Deploy lÃªn VPS trong 15 phÃºt:**

```bash
# 1. Push code lÃªn GitHub
git push origin main

# 2. Setup trÃªn VPS
ssh root@your-vps
curl -fsSL https://get.docker.com | sh
cd /opt && git clone https://github.com/your-username/MarketingAgent.git
cd MarketingAgent && cp .env.production.example .env

# 3. Chá»‰nh sá»­a .env (GitHub username, passwords, API keys)
nano .env

# 4. Deploy
chmod +x infra/prod/compute/deploy/deploy.sh && ./infra/prod/compute/deploy/deploy.sh latest

# or run directly
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

Xem [QUICKSTART.md](QUICKSTART.md) Ä‘á»ƒ biáº¿t chi tiáº¿t.

### ðŸ’» Local Development

```bash
# Backend
cd server && npm install && npm run prisma:migrate && npm run dev

# Frontend (new terminal)
cd web && npm install && npm run dev
```

Xem [DEV_GUIDE.md](DEV_GUIDE.md) Ä‘á»ƒ biáº¿t chi tiáº¿t.

## Documentation

### ðŸŽ¯ Deployment Guides
- **[QUICKSTART.md](QUICKSTART.md)** - âš¡ Deploy VPS trong 15 phÃºt (Recommended)
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - ðŸ“– HÆ°á»›ng dáº«n CI/CD chi tiáº¿t cho ngÆ°á»i má»›i
- **[README.Docker.md](README.Docker.md)** - ðŸ³ Docker local development

### ðŸ‘¨â€ðŸ’» Developer Docs
- **[DEV_GUIDE.md](DEV_GUIDE.md)** - Setup local, API docs, testing
- **[AI_CONTEXT.md](AI_CONTEXT.md)** - Project context for AI agents
- **[srs.md](srs.md)** - Software Requirements Specification

### ðŸ“š Additional Docs
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
  â†’ [15min] Ingest â†’ NEW
  â†’ [5min] Extract â†’ EXTRACTED
  â†’ [3min] Filter â†’ READY_FOR_AI (ban trading content)
  â†’ [10min] AI Stage A (gpt-4o-mini) â†’ AI_STAGE_A_DONE (isAllowed, topicTags, score)
  â†’ [15min] AI Stage B (gpt-4o) â†’ AI_STAGE_B_DONE (Vietnamese summaries)
  â†’ [daily 00:30] Digest â†’ DRAFT (5 posts/day)
  â†’ [human review] Approve/Reject
  â†’ [scheduled] Facebook publish â†’ POSTED
```

## Project Goals

- Auto-curate quality content about Education, EdTech, Blockchain Tech, Web3
- Vietnamese output with builder vibe (educational, no hype)
- Strict ban on trading/price/investment content
- Cost-efficient AI (2-stage filter + caching)
- Human approval required before publishing

## License

MIT

