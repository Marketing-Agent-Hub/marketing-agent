---
title: "Getting Started"
order: 2
---

# Getting Started Guide

This guide will help you set up and start using the OCVN AI RSS Bot.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 20+ installed
- **PostgreSQL** 14+ running
- **OpenAI API Key** from [platform.openai.com](https://platform.openai.com)
- Basic knowledge of command line

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ocNewsBot.git
cd ocNewsBot
```

### 2. Setup Backend

```bash
cd server
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/rss_bot?schema=public"

# Authentication
JWT_SECRET="your-random-secret-key-min-32-chars"
ADMIN_EMAIL="admin@opencampus.vn"
ADMIN_PASSWORD_HASH="$2b$10$..." # Generate with script

# OpenAI
OPENAI_API_KEY="sk-proj-your-key"

# Server
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

**Generate Password Hash:**

```bash
npx tsx scripts/generate-password-hash.ts yourpassword
# Copy output to ADMIN_PASSWORD_HASH
```

### 3. Run Database Migrations

```bash
npm run prisma:migrate
npm run prisma:generate
```

### 4. Start Backend Server

```bash
npm run dev
```

Server should start at `http://localhost:3001`

### 5. Setup Frontend

Open a new terminal:

```bash
cd web
npm install

# Copy environment template
cp .env.example .env

# Edit if needed (default should work)
nano .env
```

**Frontend .env:**

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### 6. Start Frontend

```bash
npm run dev
```

Web app should open at `http://localhost:5173`

## First Login

1. Navigate to `http://localhost:5173`
2. You'll be redirected to login page
3. Enter credentials:
   - Email: (your `ADMIN_EMAIL`)
   - Password: (password you generated hash for)
4. Click "Sign in"

## Add Your First RSS Source

1. Click "Nguồn RSS" in navigation
2. Click "➕ Add Source" button
3. Fill in the form:
   - **Name**: "Example Blog"
   - **RSS URL**: `https://example.com/feed`
   - **Site URL**: `https://example.com`
   - **Language**: Select appropriate language
   - **Trust Score**: 70-100 (higher = more important)
   - **Topic Tags**: Add relevant tags like "education", "tech"
4. Click "Validate RSS" to test
5. Click "Add Source"

## Monitor the Pipeline

1. Click "Dashboard" in navigation
2. Watch the pipeline flow:
   - Items will be ingested every 15 minutes
   - Watch counters increase: NEW → EXTRACTED → READY_FOR_AI
   - AI processing happens automatically

3. **Manual Triggers** (for testing):
   - Click "📥 Ingest" - Fetch RSS now
   - Click "📄 Extract" - Extract articles
   - Click "🔍 Filter" - Apply filters
   - Click "✨ AI Stage A" - Run AI filter
   - Click "💎 AI Stage B" - Generate summaries

## Review Generated Drafts

1. Wait for digest generation (daily at 00:30) or trigger manually
2. Click "Bài viết" in navigation
3. You'll see generated posts
4. Click "✏️ Chỉnh sửa" to review a draft:
   - **Preview tab**: See final output
   - **Hook/Bullets/CTA tabs**: Edit content
5. Actions:
   - **💾 Save**: Save changes
   - **✅ Approve**: Mark ready for publishing
   - **❌ Reject**: Reject with reason
   - **Close**: Exit without changes

## Check System Health

1. Click "Monitoring" in navigation
2. Tabs available:
   - **Overview**: System health status
   - **Logs**: Application logs
   - **Metrics**: Performance metrics
   - **Health**: Service health checks
   - **Traces**: Request traces

## Next Steps

Now that you're up and running:

- [Add more RSS sources](/docs/guides/adding-sources)
- [Learn about content filtering](/docs/guides/custom-filters)
- [Deploy to production](/docs/guides/deployment)
- [Read API documentation](/docs/api)

## Troubleshooting

**Server won't start:**
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Check port 3001 is not in use

**Frontend can't connect:**
- Ensure backend is running
- Check CORS_ORIGIN matches frontend URL
- Verify VITE_API_BASE_URL is correct

**No items being ingested:**
- Check RSS sources are enabled
- Verify RSS URLs are valid
- Check server logs for errors

For more help, see [Troubleshooting Guide](/docs/guides/troubleshooting).
