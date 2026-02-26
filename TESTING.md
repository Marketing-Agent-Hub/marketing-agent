# Pipeline Testing Guide

## Prerequisites

Before testing the pipeline, ensure you have:

### 1. Database Setup

Make sure PostgreSQL is running and configured.

**Option A: Using Docker**
```bash
docker run --name ocvn-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=rss_bot \
  -p 5432:5432 \
  -d postgres:14
```

**Option B: Local PostgreSQL**
- Install PostgreSQL 14+
- Create database: `CREATE DATABASE rss_bot;`

### 2. Environment Variables

Create `server/.env` file:

```bash
cd server
cp .env.example .env
```

Edit `.env` and update:
```env
# Database (update if needed)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rss_bot?schema=public"

# JWT (keep as is for testing)
JWT_SECRET="test-secret-key-change-in-production"

# Admin credentials
ADMIN_EMAIL="admin@opencampus.vn"
ADMIN_PASSWORD_HASH="$2b$10$KqH8Z5J1Z5J1Z5J1Z5J1Z.8xQ8xQ8xQ8xQ8xQ8xQ8xQ8xQ8xQ8xQ8"  # password: admin123

# CORS
CORS_ORIGIN="http://localhost:5173"

# Server
PORT=3001
NODE_ENV="development"
```

### 3. Generate Admin Password Hash (if needed)

```bash
cd server
npx tsx scripts/generate-password-hash.ts your-password
```

Copy the output hash to `ADMIN_PASSWORD_HASH` in `.env`.

### 4. Run Migrations

```bash
cd server
npm run prisma:migrate
```

This will create all necessary tables (including new Phase 2 models).

---

## Running the Pipeline Test

### Automated Test Script (Recommended)

Run the complete pipeline test:

```bash
cd server
npm run test:pipeline
```

This script will:
1. ✅ Check database connection
2. 📰 Create/find a test RSS source (Open Campus Blog)
3. 📥 Ingest RSS items (fetch, parse, deduplicate)
4. 📄 Extract full content from articles
5. 🔍 Filter content (remove trading/market content)
6. 📊 Show status summary

Expected output:
```
🧪 Starting Pipeline Test...

📡 Step 1: Checking database connection...
✅ Database connected

📰 Step 2: Setting up test source...
✅ Using existing source: Open Campus Blog (Test) (ID: 1)

📥 Step 3: Triggering RSS ingest...
✅ Ingest complete:
   - Success: true
   - New items: 15
   - Duplicates: 0

📊 Items with status NEW: 15

📄 Step 4: Triggering content extraction...
✅ Extraction complete:
   - Processed: 5
   - Errors: 0

📊 Items with status EXTRACTED: 5

🔍 Step 5: Triggering content filtering...
✅ Filtering complete:
   - Passed: 5
   - Rejected: 0

📊 Items with status READY_FOR_AI: 5

📈 Pipeline Test Summary:
   - NEW: 10 items
   - EXTRACTED: 0 items
   - READY_FOR_AI: 5 items

✅ Pipeline test completed successfully!
```

---

## Manual Testing

If you prefer to test each step manually:

### Step 1: Start the Server

```bash
cd server
npm run dev
```

The server will:
- Start on `http://localhost:3001`
- Auto-start 3 cron jobs:
  - Ingest Job (every 15 minutes)
  - Extraction Job (every 5 minutes)
  - Filtering Job (every 3 minutes)

### Step 2: Login to Get JWT Token

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@opencampus.vn","password":"admin123"}'
```

Save the returned token.

### Step 3: Create a Test Source

```bash
curl -X POST http://localhost:3001/api/sources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Open Campus Blog",
    "rssUrl": "https://www.opencampus.xyz/blog/rss.xml",
    "siteUrl": "https://www.opencampus.xyz",
    "lang": "EN",
    "topicTags": ["education", "edtech", "blockchain-tech"],
    "trustScore": 90,
    "enabled": true,
    "fetchIntervalMinutes": 60
  }'
```

### Step 4: Trigger Ingest Manually

```bash
curl -X POST http://localhost:3001/api/admin/ingest/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Check server logs to see items being created.

### Step 5: Trigger Extraction Manually

```bash
curl -X POST http://localhost:3001/api/admin/extraction/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"limit": 10}'
```

### Step 6: Trigger Filtering Manually

```bash
curl -X POST http://localhost:3001/api/admin/filtering/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"limit": 10}'
```

### Step 7: Inspect Database

Open Prisma Studio to view data:

```bash
cd server
npm run prisma:studio
```

Navigate to `http://localhost:5555` to view:
- **sources** - Your RSS sources
- **items** - RSS items with status tracking
- **articles** - Extracted content
- Status distribution (NEW → EXTRACTED → READY_FOR_AI)

---

## Verifying Pipeline Success

### Check Item Status Flow

Items should progress through these statuses:

```
NEW → EXTRACTED → READY_FOR_AI
                ↘ FILTERED_OUT (if contains trading content)
```

### Expected Results

1. **Ingest**: Items created with `status = NEW`
2. **Extraction**: Articles created, items updated to `status = EXTRACTED`
3. **Filtering**: 
   - Clean items → `status = READY_FOR_AI`
   - Trading content → `status = FILTERED_OUT` with `filterReason`

### Verification Queries

```sql
-- Check status distribution
SELECT status, COUNT(*) FROM items GROUP BY status;

-- Check filtered out items
SELECT id, title, filter_reason FROM items WHERE status = 'FILTERED_OUT';

-- Check items ready for AI
SELECT id, title FROM items WHERE status = 'READY_FOR_AI';

-- Check if articles were created
SELECT COUNT(*) FROM articles;
```

---

## Troubleshooting

### Database Connection Error

```
Error: Can't reach database server at `localhost:5432`
```

**Solution**: Make sure PostgreSQL is running.
```bash
# Check if running (Docker)
docker ps | grep postgres

# Start PostgreSQL (Docker)
docker start ocvn-postgres
```

### No Items Created

**Possible causes**:
1. RSS feed is invalid or unreachable
2. Feed has no new items (all duplicates)

**Solution**: Check server logs for errors, try a different RSS feed.

### Items Stuck in NEW Status

**Possible causes**:
1. Extraction job not running
2. Errors fetching article HTML

**Solution**: 
- Check server logs
- Trigger extraction manually: `POST /admin/extraction/trigger`

### All Items Filtered Out

**Possible causes**:
1. Content contains trading keywords (price, trading, etc.)
2. Source deny keywords too broad

**Solution**: Review `filterReason` in database, adjust deny keywords if needed.

---

## Next Steps

After successful pipeline test:

1. ✅ **Phase 1-2 Complete**: RSS → Extract → Filter working
2. 🚧 **Next**: Setup AI Provider (OpenAI)
   - Install `openai` package
   - Configure API keys
   - Create AI Stage A service (cheap filter)
   - Create AI Stage B service (deep summary in Vietnamese)
3. 🚧 **Next**: Digest Generation
   - Selection algorithm (diversity, trust score)
   - Format posts (5 posts/day at specific times)
   - Create drafts for human approval
4. 🚧 **Final**: Facebook Publishing
   - Setup Graph API
   - Implement auto-posting after approval

---

## Test Data Recommendations

Good RSS sources for testing:

1. **Open Campus Blog** (Education + Blockchain)
   - URL: `https://www.opencampus.xyz/blog/rss.xml`
   - Clean content, no trading

2. **EdSurge** (Education Technology)
   - URL: `https://www.edsurge.com/news.rss`
   - Pure education content

3. **CoinDesk** (Test filtering)
   - URL: `https://www.coindesk.com/arc/outboundfeeds/rss/`
   - Should be FILTERED_OUT (contains trading content)

---

## Support

If you encounter issues:
1. Check server logs: `npm run dev` output
2. Check database: `npm run prisma:studio`
3. Review error messages in console
4. Verify `.env` configuration is correct
