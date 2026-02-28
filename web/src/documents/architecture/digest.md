---
title: "Digest Generation"
description: "Daily post generation and selection algorithm"
order: 3
---

# Digest Generation Service

## Overview

The Digest Generation Service is the final component of the Phase 2 AI Content Pipeline. It selects top items that have completed AI processing and formats them into daily Facebook posts with Vietnamese content.

---

## Flow

```
AI_STAGE_B_DONE items
  → [Selection Algorithm] → 6-10 top items
  → [Format Generation] → 5 daily posts (DRAFT status)
  → [Human Review] → Approve/Reject
  → [Facebook Publishing] → Post to page
```

---

## Architecture

### Selection Algorithm

The service uses a sophisticated scoring system to select the best items:

1. **Base Score**: Importance score from AI Stage A (0-100)
2. **Trust Multiplier**: Source trust score (70-100 → 0.7x-1.0x multiplier)
3. **Diversity Penalty**: 
   - 10% penalty per repeated topic tag
   - 15% penalty per repeated source
4. **Final Selection**: Top 6-10 items by final score

This ensures:
- High-quality content (importance score)
- Trusted sources (trust score multiplier)
- Topic diversity (no single topic dominates)
- Source diversity (no single source dominates)

### Post Distribution

The service generates **5 posts per day** at specific time slots:

| Time Slot   | Time  | Description           |
|-------------|-------|-----------------------|
| MORNING_1   | 08:00 | First morning post    |
| MORNING_2   | 08:00 | Second morning post   |
| NOON        | 12:00 | Lunch time post       |
| EVENING_1   | 18:30 | First evening post    |
| EVENING_2   | 18:30 | Second evening post   |

Items are distributed evenly across the 5 posts. For example:
- 10 items → 2 items per post
- 9 items → 2-2-2-2-1 distribution
- 7 items → 2-2-1-1-1 distribution

### Post Format

Each post contains:

#### 1. Hook (Vietnamese)
Attention-grabbing introduction with date
```
📚 Tin tức nóng hổi từ thế giới Blockchain & EdTech - Thứ Sáu, 27 tháng 2, 2026
```

#### 2. Bullets (Vietnamese summaries with links)
6-10 bullet points with:
- Emoji prefix (🎯, 💎, 🔔, etc.)
- Source name
- Vietnamese summary from AI Stage B
- Link to original article
```
🎯 **Open Campus Blog**: Giới thiệu tính năng mới cho phép giảng viên tạo NFT chứng chỉ tự động khi học viên hoàn thành khóa học.
👉 Đọc thêm: https://...
```

#### 3. OCVN Take (Community perspective in Vietnamese)
Context-specific comment based on post topics:
```
💼 **OCVN Take**: Giáo dục đang chuyển mình với công nghệ blockchain - cơ hội lớn cho những builder trong cộng đồng chúng ta. Hãy cùng nhau học hỏi và xây dựng!
```

#### 4. CTA (Call to action in Vietnamese)
Invitation to join/discuss in community:
```
💬 Bạn nghĩ gì về những tin tức này? Chia sẻ ý kiến của bạn trong nhóm OCVN nhé!
🔗 Tham gia: [Link to OCVN Community]
```

#### 5. Hashtags
3-10 relevant hashtags:
- Always includes: `#ocvn #opencampus #educampus`
- Plus 4-7 trending hashtags from AI suggestions
```
#ocvn #opencampus #educampus #blockchain #edtech #web3 #nft
```

### Item Status Updates

When items are used in posts:
- Item status: `AI_STAGE_B_DONE` → `USED_IN_POST`
- This prevents reusing the same items in future digests

---

## Cron Schedule

**Daily at 00:30** (0 30 0 * * *)

Generates posts for **tomorrow** automatically. This gives time for:
1. Morning review and edits before first post (08:00)
2. Last-minute changes or rejection
3. Manual regeneration if needed

---

## Manual Trigger

### API Endpoint

```
POST /api/admin/digest/trigger
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "date": "2026-02-28"  // Optional, defaults to tomorrow
}
```

### Using curl

```bash
# Generate posts for tomorrow (default)
curl -X POST http://localhost:3000/api/admin/digest/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Generate posts for specific date
curl -X POST http://localhost:3000/api/admin/digest/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-03-01"}'
```

---

## Testing

### Prerequisites

1. **Database with completed pipeline items**:
   - At least 6 items with status `AI_STAGE_B_DONE`
   - Items have both Stage A and Stage B AI results
   - Stage A has `isAllowed: true`

2. **Server running**:
   ```bash
   cd server
   npm run dev
   ```

### Automated Test Method

1. **Check available items**:
   ```sql
   SELECT COUNT(*) 
   FROM items 
   WHERE status = 'AI_STAGE_B_DONE';
   ```
   Should return at least 6.

2. **Trigger digest generation**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/digest/trigger \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"date": "2026-02-28"}'
   ```

3. **Check server logs** for:
   ```
   [Digest] Generating posts for 2026-02-28
   [Digest] Found X items ready for digest
   [Digest] Selected Y items for posts
   [Digest] Created post 1/5 (MORNING_1) with Z items
   ...
   [Digest] Successfully generated 5 posts for 2026-02-28
   ```

4. **Verify in database**:
   ```sql
   -- Check posts created
   SELECT id, target_date, time_slot, status, 
          array_length(hashtags, 1) as hashtag_count
   FROM daily_posts
   WHERE target_date = '2026-02-28'
   ORDER BY time_slot;

   -- Check items used
   SELECT COUNT(*) 
   FROM items 
   WHERE status = 'USED_IN_POST';

   -- Check post-item relations
   SELECT dp.time_slot, COUNT(pi.item_id) as item_count
   FROM daily_posts dp
   LEFT JOIN post_items pi ON dp.id = pi.post_id
   WHERE dp.target_date = '2026-02-28'
   GROUP BY dp.time_slot
   ORDER BY dp.time_slot;
   ```

### Manual Testing with Prisma Studio

1. **Start Prisma Studio**:
   ```bash
   cd server
   npx prisma studio
   ```

2. **Check DailyPost table**:
   - 5 posts created for target date
   - All have status `DRAFT`
   - Each has `content`, `hookText`, `bulletsText`, `ocvnTakeText`, `ctaText`, `hashtags`

3. **Check PostItem table**:
   - Links between posts and items
   - Verify each post has 1-3 items

4. **Check Item table**:
   - Used items have status `USED_IN_POST`
   - Unused items still have `AI_STAGE_B_DONE`

### Inspect Generated Content

View a complete post:

```sql
SELECT 
  time_slot,
  content,
  hashtags
FROM daily_posts
WHERE target_date = '2026-02-28'
ORDER BY time_slot;
```

---

## Expected Output Example

```
📚 Tin tức nóng hổi từ thế giới Blockchain & EdTech - Thứ Sáu, 28 tháng 2, 2026

🎯 **Open Campus Blog**: Công nghệ AI đang được tích hợp vào các nền tảng giáo dục phi tập trung để cá nhân hóa trải nghiệm học tập cho từng học viên.
👉 Đọc thêm: https://opencampus.example/ai-personalized-learning

💎 **CoinDesk**: Ngân hàng trung ương Singapore thử nghiệm stablecoin cho thanh toán xuyên biên giới trong giáo dục quốc tế.
👉 Đọc thêm: https://coindesk.example/singapore-stablecoin-education

🔔 **The Block**: Ethereum Foundation công bố quỹ tài trợ 10 triệu đô cho các dự án giáo dục Web3 tại châu Á.
👉 Đọc thêm: https://theblock.example/ethereum-education-grant-asia

💼 **OCVN Take**: Những phát triển mới trong hạ tầng blockchain và Web3 mở ra nhiều khả năng cho ecosystem giáo dục. Đây là thời điểm tốt để builder như chúng ta thử nghiệm và đổi mới!

💬 Bạn nghĩ gì về những tin tức này? Chia sẻ ý kiến của bạn trong nhóm OCVN nhé!
🔗 Tham gia: [Link to OCVN Community]

#ocvn #opencampus #educampus #blockchain #edtech #web3 #ai #defi
```

---

## Troubleshooting

### No Posts Generated

**Problem**: Digest trigger returns success but no posts created

**Check**:
1. Enough items available?
   ```sql
   SELECT COUNT(*) FROM items WHERE status = 'AI_STAGE_B_DONE';
   ```
   Need at least 6 items.

2. Posts already exist for date?
   ```sql
   SELECT * FROM daily_posts WHERE target_date = '2026-02-28';
   ```
   Service won't regenerate if posts exist.

3. Check server logs for warnings.

### Not Enough Items

**Problem**: "Not enough items (need 6, have X)"

**Solution**: Run full pipeline to generate more items:
1. RSS Ingest: `POST /admin/ingest/trigger`
2. Content Extraction: `POST /admin/extraction/trigger`
3. Content Filtering: `POST /admin/filtering/trigger`
4. AI Stage A: `POST /admin/ai/stage-a/trigger`
5. AI Stage B: `POST /admin/ai/stage-b/trigger`
6. Wait for items to reach `AI_STAGE_B_DONE` status
7. Retry digest generation

### Missing Vietnamese Content

**Problem**: Posts have English content or empty summaries

**Check AI Stage B Results**:
```sql
SELECT 
  i.id,
  i.status,
  ar.summary,
  ar.bullets
FROM items i
JOIN ai_results ar ON i.id = ar.item_id
WHERE ar.stage = 'B'
  AND i.status = 'AI_STAGE_B_DONE'
LIMIT 5;
```

**Solution**: 
- Verify AI Stage B service is working
- Check OpenAI API key configuration
- Re-run AI Stage B for affected items

### Duplicate Posts

**Problem**: Same items appearing in multiple posts

**This shouldn't happen** because items are marked `USED_IN_POST` after use.

**If it happens**:
1. Check PostItem table for duplicates
2. Verify status updates are working
3. Check for concurrent cron runs (race condition)

---

## Monitoring Queries

### Daily Posts Status

```sql
SELECT 
  target_date,
  COUNT(*) as total_posts,
  SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as drafts,
  SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
  SUM(CASE WHEN status = 'POSTED' THEN 1 ELSE 0 END) as posted
FROM daily_posts
GROUP BY target_date
ORDER BY target_date DESC;
```

### Items Ready for Next Digest

```sql
SELECT COUNT(*) as ready_items
FROM items
WHERE status = 'AI_STAGE_B_DONE';
```

### Average Items Per Post

```sql
SELECT 
  AVG(item_count) as avg_items_per_post
FROM (
  SELECT dp.id, COUNT(pi.item_id) as item_count
  FROM daily_posts dp
  LEFT JOIN post_items pi ON dp.id = pi.post_id
  GROUP BY dp.id
) subquery;
```

### Topic Distribution in Posts

```sql
SELECT 
  unnest(ar.topic_tags) as topic,
  COUNT(*) as usage_count
FROM daily_posts dp
JOIN post_items pi ON dp.id = pi.post_id
JOIN items i ON pi.item_id = i.id
JOIN ai_results ar ON i.id = ar.item_id
WHERE ar.stage = 'A'
  AND dp.created_at > NOW() - INTERVAL '7 days'
GROUP BY topic
ORDER BY usage_count DESC;
```

---

## Next Steps

After digest generation is working:

1. **Phase 2 Component 9: Draft Review Backend API**
   - GET /api/drafts - List drafts with filters
   - GET /api/drafts/:id - Get single draft with items
   - PATCH /api/drafts/:id - Edit draft content
   - POST /api/drafts/:id/approve - Approve draft
   - POST /api/drafts/:id/reject - Reject draft

2. **Phase 2 Component 10: Draft Review Frontend UI**
   - DraftsPage showing all drafts
   - DraftEditor for editing content
   - Approve/Reject workflows
   - Preview before publishing

3. **Phase 2 Component 11: Facebook Publishing Service**
   - Setup Facebook App & Page Access Token
   - Graph API integration for posting
   - Automatic posting at scheduled times
   - Track posted URLs and IDs
   - Retry logic for failures

---

## Cost Considerations

Digest generation has **NO additional API costs** - it only uses data already processed by AI stages. The main costs are:

- Database queries (minimal)
- CPU for selection algorithm (negligible)
- Storage for generated posts (~1-2KB per post)

Average: **$0.00 per digest run** 🎉
