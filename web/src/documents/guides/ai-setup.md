---
title: "AI Pipeline Setup"
description: "Configure OpenAI and test the AI content processing pipeline"
order: 4
---

# AI Pipeline Setup Guide

## OpenAI Configuration

### 1. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-...`)

### 2. Update Environment Variables

Edit `server/.env` and add:

```env
# OpenAI API
OPENAI_API_KEY="sk-proj-your-actual-key-here"
AI_STAGE_A_MODEL="gpt-4o-mini"
AI_STAGE_B_MODEL="gpt-4o"
```

**Models Explained:**
- **Stage A (gpt-4o-mini)**: Fast, cheap ($0.15/1M tokens) - filters content, extracts tags
- **Stage B (gpt-4o)**: Powerful, pricier ($2.50/1M tokens) - creates Vietnamese summaries

### 3. Verify Configuration

Start the server:

```bash
cd server
npm run dev
```

You should see:
```
✅ OpenAI configured:
   Stage A Model: gpt-4o-mini
   Stage B Model: gpt-4o
🚀 Starting background jobs...
[IngestJob] Started - running every 15 minutes
[ExtractionJob] Started - running every 5 minutes
[FilteringJob] Started - running every 3 minutes
[AI Stage A Job] Started - running every 10 minutes
[AI Stage B Job] Started - running every 15 minutes
```

---

## Pipeline Flow with AI

```
RSS Sources (enabled=true)
    ↓ [Every 15 min]
[1. Ingest] → items (status: NEW)
    ↓ [Every 5 min]
[2. Extract] → articles (status: EXTRACTED)
    ↓ [Every 3 min]
[3. Filter] → (status: READY_FOR_AI or FILTERED_OUT)
    ↓ [Every 10 min]
[4. AI Stage A - GPT-4o-mini] → (status: AI_STAGE_A_DONE)
    ├─ Output: isAllowed, topicTags, importanceScore, oneLineSummary
    └─ If rejected → FILTERED_OUT
    ↓ [Every 15 min, if allowed]
[5. AI Stage B - GPT-4o] → (status: AI_STAGE_B_DONE)
    └─ Output: summary (VN), bullets (VN), whyItMatters (VN), hashtags
```

---

## Testing AI Pipeline

### Option 1: Automatic Test (Production-like)

Just start the server and let cron jobs run:

```bash
cd server
npm run dev
```

Jobs will process items automatically at scheduled intervals.

### Option 2: Manual Triggers (Faster Testing)

#### Step 1: Get Auth Token

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@opencampus.vn","password":"admin123"}'
```

Save the returned `token`.

#### Step 2: Trigger Full Pipeline

```bash
# 1. Ingest RSS
curl -X POST http://localhost:3001/api/admin/ingest/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"

# Wait 10 seconds for processing...

# 2. Extract content
curl -X POST http://localhost:3001/api/admin/extraction/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"limit": 5}'

# Wait 10 seconds...

# 3. Filter content
curl -X POST http://localhost:3001/api/admin/filtering/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"limit": 10}'

# Wait 5 seconds...

# 4. AI Stage A (filter + tag)
curl -X POST http://localhost:3001/api/admin/ai/stage-a/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"limit": 5}'

# Wait 30 seconds for OpenAI API calls...

# 5. AI Stage B (Vietnamese summary)
curl -X POST http://localhost:3001/api/admin/ai/stage-b/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"limit": 3}'

# Wait 60 seconds for GPT-4o processing...
```

### Option 3: Prisma Studio (Visual Inspection)

View processed data:

```bash
cd server
npm run prisma:studio
```

Navigate to `http://localhost:5555`:

1. **items** table - Check status progression
2. **articles** table - View extracted content
3. **ai_results** table - See AI outputs

**Check for:**
- Items with `status = AI_STAGE_B_DONE`
- AI results with Vietnamese content in `summary` and `bullets`

---

## Expected AI Outputs

### AI Stage A (GPT-4o-mini)

```json
{
  "isAllowed": true,
  "topicTags": ["education", "edtech", "blockchain-tech"],
  "importanceScore": 75,
  "oneLineSummary": "Web3 learning platform launches certification program",
  "reason": "Relevant educational blockchain content"
}
```

### AI Stage B (GPT-4o)

```json
{
  "summary": "Open Campus ra mắt chương trình chứng chỉ Web3 giúp sinh viên học blockchain qua các khóa học thực hành. Chương trình hợp tác với các trường đại học hàng đầu.",
  "bullets": [
    "Chứng chỉ Web3 được công nhận bởi 50+ trường đại học quốc tế",
    "Học viên được thực hành trên testnet với smart contracts thực tế",
    "Miễn phí cho sinh viên Việt Nam trong 6 tháng đầu",
    "Hỗ trợ tiếng Việt đầy đủ từ video đến tài liệu"
  ],
  "whyItMatters": "Đây là cơ hội lớn cho sinh viên Việt Nam tiếp cận giáo dục blockchain chất lượng cao mà không cần chi phí ban đầu. Chứng chỉ có thể giúp tăng cơ hội việc làm trong ngành Web3.",
  "riskFlags": [],
  "suggestedHashtags": ["education", "web3", "blockchain", "opencampus", "certification"]
}
```

---

## Verifying AI Processing

### SQL Queries

```sql
-- Check AI Stage A results
SELECT 
  i.id, 
  i.title, 
  i.status,
  ar.is_allowed,
  ar.importance_score,
  ar.topic_tags
FROM items i
JOIN ai_results ar ON ar.item_id = i.id
WHERE ar.stage = 'A'
ORDER BY i.created_at DESC
LIMIT 10;

-- Check AI Stage B results (Vietnamese content)
SELECT 
  i.id,
  i.title,
  ar.summary,
  ar.bullets,
  ar.why_it_matters,
  ar.suggested_hashtags
FROM items i
JOIN ai_results ar ON ar.item_id = i.id
WHERE ar.stage = 'B'
ORDER BY i.created_at DESC
LIMIT 5;

-- Check status distribution
SELECT status, COUNT(*) 
FROM items 
GROUP BY status;
```

---

## Cost Optimization Features

### 1. Content Hash Caching (Stage B)

Stage B checks if identical content (by `contentHash`) was already processed. If yes, reuses the Vietnamese summary instead of calling OpenAI again.

```
Item A (hash: abc123) → AI Stage B → Creates summary
Item B (hash: abc123) → AI Stage B → Reuses summary from Item A (FREE!)
```

### 2. Two-Stage Filtering

**Why two stages?**
- Stage A (cheap): Filters out 70%+ of content quickly
- Stage B (expensive): Only processes approved content

**Cost savings:**
- Without filtering: 100 items × $0.10 = $10
- With filtering: 100 items × $0.01 + 30 items × $0.10 = $4 (60% savings)

### 3. Rate Limiting

- Stage A: 500ms delay between requests
- Stage B: 1000ms delay between requests

Prevents hitting OpenAI rate limits and spreading costs over time.

---

## Troubleshooting

### Error: "OpenAI API key is required"

**Solution**: Set `OPENAI_API_KEY` in `.env`:
```env
OPENAI_API_KEY="sk-proj-..."
```

Restart the server.

### Error: "Rate limit exceeded"

**Solution**: You're hitting OpenAI's rate limit. Wait 60 seconds and try again.

For production, upgrade to a paid tier: https://platform.openai.com/settings/organization/billing

### AI Stage A rejects everything

**Check**: Review rejection reasons in database:
```sql
SELECT filter_reason, COUNT(*) 
FROM items 
WHERE status = 'FILTERED_OUT' 
GROUP BY filter_reason;
```

If it's rejecting valid content, the prompt may need tuning.

### AI Stage B not generating Vietnamese

**Check**: 
1. Verify `AI_STAGE_B_MODEL` is `gpt-4o` (not mini)
2. Check prompt explicitly requests Vietnamese
3. Review model temperature (0.7 for creative output)

### Items stuck in AI_STAGE_A_DONE

**Cause**: Stage A rejected (isAllowed=false) OR Stage B hasn't run yet

**Check**:
```sql
SELECT COUNT(*) FROM ai_results 
WHERE stage = 'A' AND is_allowed = true;
```

If > 0, Stage B should pick them up on next run.

---

## Next Steps

After successful AI testing:

1. ✅ **Pipeline Complete**: RSS → Extract → Filter → AI A → AI B ✓
2. 🚧 **Next**: Digest Generation
   - Select 6-10 items per post
   - Generate 5 posts/day at specific times (08:00×2, 12:00, 18:30×2)
   - Format with Hook + Bullets + OCVN Take + CTA + Hashtags
   - Create drafts for human approval
3. 🚧 **Final**: Facebook Publishing
   - Web UI for draft review
   - Approve/Edit/Reject flow
   - Auto-post to Facebook Page after approval

---

## API Endpoints Summary

### Admin Triggers (All require JWT auth)

```bash
POST /api/admin/ingest/trigger
POST /api/admin/extraction/trigger
POST /api/admin/filtering/trigger
POST /api/admin/ai/stage-a/trigger
POST /api/admin/ai/stage-b/trigger
```

All endpoints accept optional `limit` parameter:
```json
{
  "limit": 10
}
```

---

## Monitoring AI Usage

Track token usage in `ai_results` table:

```sql
-- Total tokens used
SELECT 
  stage,
  SUM(prompt_tokens) as total_prompt,
  SUM(completion_tokens) as total_completion,
  SUM(total_tokens) as total_all
FROM ai_results
GROUP BY stage;

-- Estimated cost
SELECT 
  'Stage A' as stage,
  SUM(total_tokens) / 1000000.0 * 0.15 as cost_usd
FROM ai_results 
WHERE stage = 'A'
UNION ALL
SELECT 
  'Stage B' as stage,
  SUM(total_tokens) / 1000000.0 * 2.50 as cost_usd
FROM ai_results 
WHERE stage = 'B';
```

**Note**: Token counts are not currently saved (add in future update).

---

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify OpenAI API key is valid: https://platform.openai.com/api-keys
3. Check API usage limits: https://platform.openai.com/usage
4. Test with a single item first before batch processing
