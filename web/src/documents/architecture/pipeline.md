---
title: "Content Pipeline"
order: 2
---

# Content Processing Pipeline

## Pipeline Stages

The content pipeline processes RSS items through multiple stages with increasing complexity and cost.

### Stage 1: Ingest (NEW)

**Frequency:** Every 15 minutes  
**Input:** RSS feed URLs  
**Output:** `Item` records with status `NEW`

**Process:**
1. Fetch all enabled RSS sources
2. Parse XML/Atom feeds
3. Extract basic metadata (title, link, date, snippet)
4. Deduplicate by GUID or link hash
5. Store in database

**Key Logic:**
```typescript
// Deduplication
const existingItem = await db.item.findFirst({
  where: {
    OR: [
      { guid: item.guid },
      { link: item.link },
      { contentHash: computeHash(item.title + item.snippet) }
    ]
  }
});
```

### Stage 2: Extract (EXTRACTED)

**Frequency:** Every 5 minutes  
**Input:** Items with status `NEW` (limit 10)  
**Output:** `Article` records, status → `EXTRACTED`

**Process:**
1. Fetch full HTML from item.link
2. Use @mozilla/readability to extract main content
3. Remove scripts, ads, navigation
4. Truncate to 10,000 chars (token optimization)
5. Store in `Article` table

**Performance:**
- Timeout: 10 seconds per article
- Retry: 2 attempts with exponential backoff
- User-Agent: Custom bot identifier

### Stage 3: Filter (READY_FOR_AI / FILTERED_OUT)

**Frequency:** Every 3 minutes  
**Input:** Items with status `EXTRACTED` (limit 10)  
**Output:** Status → `READY_FOR_AI` or `FILTERED_OUT`

**Filtering Rules:**

1. **Global Deny Keywords** (38 total)
   - EN: price, trading, pump, dump, moon, lambo, ATH, buy, sell, etc.
   - VI: giá, giao dịch, tăng giá, đầu tư, mua, bán, etc.

2. **Per-Source Keywords**
   - Custom deny list per RSS source
   - Exact match or regex support

3. **Content Requirements**
   - Minimum length: 100 chars
   - Maximum length: 50,000 chars
   - Must have article content (not just snippet)

**Example:**
```typescript
const denyKeywords = [
  'price prediction', 'trading signal', 'buy now',
  'giá coin', 'tín hiệu giao dịch', 'mua ngay'
];

const isFiltered = denyKeywords.some(keyword => 
  content.toLowerCase().includes(keyword.toLowerCase())
);
```

### Stage 4: AI Stage A (AI_STAGE_A_DONE)

**Frequency:** Every 10 minutes  
**Input:** Items with status `READY_FOR_AI` (limit 5)  
**Output:** `AiResult` record (stage=A), status → `AI_STAGE_A_DONE`

**Model:** gpt-4o-mini ($0.15/1M tokens)

**Prompt Purpose:**
- Quick filter (80% rejection rate)
- Topic classification
- Importance scoring

**Output Schema:**
```json
{
  "isAllowed": true,
  "reason": "Educational content about blockchain in education",
  "topicTags": ["education", "blockchain", "edtech"],
  "importanceScore": 85,
  "oneLineSummary": "New blockchain certification system for online courses"
}
```

**Cost:** ~$0.0015 per item (avg 1000 tokens)

### Stage 5: AI Stage B (AI_STAGE_B_DONE)

**Frequency:** Every 15 minutes  
**Input:** Items where Stage A `isAllowed=true` (limit 3)  
**Output:** `AiResult` record (stage=B), status → `AI_STAGE_B_DONE`

**Model:** gpt-4o ($2.50/1M tokens)

**Prompt Purpose:**
- Vietnamese summary (2-3 sentences)
- Bullet points (3-5 items)
- Why it matters (OCVN perspective)
- Hashtag suggestions

**Output Schema:**
```json
{
  "summary": "Nền tảng giáo dục trực tuyến mới...",
  "bullets": [
    "Hệ thống chứng chỉ NFT tự động",
    "Tích hợp với Open Campus Protocol",
    "Miễn phí cho giảng viên"
  ],
  "whyItMatters": "Đây là bước tiến quan trọng...",
  "hashtags": ["#edtech", "#blockchain", "#nft"]
}
```

**Caching:** Results cached by `contentHash` (30 days)

**Cost:** ~$0.025 per item (avg 10,000 tokens)

### Stage 6: Digest Generation (USED_IN_POST)

**Frequency:** Daily at 00:30 AM  
**Input:** Items with status `AI_STAGE_B_DONE`  
**Output:** `DailyPost` records (5 posts), items → `USED_IN_POST`

**Selection Algorithm:**

1. **Score Calculation:**
   ```
   finalScore = importanceScore × trustMultiplier × diversityPenalty
   
   where:
   - trustMultiplier = sourceScore / 100
   - diversityPenalty = 1.0 - (topicRepeat × 0.10) - (sourceRepeat × 0.15)
   ```

2. **Top Selection:**
   - Select 6-10 highest scoring items
   - Ensure topic diversity
   - Ensure source diversity

3. **Post Distribution:**
   - 5 time slots: MORNING_1, MORNING_2, NOON, EVENING_1, EVENING_2
   - Distribute items evenly across slots

**Post Format:**
```markdown
📚 Tin tức từ Blockchain & EdTech - [Date]

✨ [Source]: [Vietnamese Summary]
👉 Đọc thêm: [Link]

✨ [Source]: [Vietnamese Summary]
👉 Đọc thêm: [Link]

💡 OCVN góc nhìn: [Community perspective]

💬 Tham gia thảo luận: [OCVN Link]

#ocvn #opencampus #educampus #edtech #blockchain
```

## Performance Optimization

### Token Limits
- Stage A input: ~1,000 tokens (title + snippet)
- Stage B input: ~2,500 tokens (truncated article)
- Total AI cost/item: ~$0.027

### Caching Strategy
- Stage B results cached by contentHash
- Hit rate: ~30% (similar articles)
- Savings: ~$0.008 per cached item

### Rate Limiting
- Stage A: 500ms delay between items
- Stage B: 1000ms delay between items
- Prevents OpenAI rate limit errors

## Error Handling

Each stage has:
- **Retry logic**: 2 attempts with exponential backoff
- **Error logging**: Structured logs with context
- **Status persistence**: Errors don't block next items
- **Manual retry**: Admin can re-trigger failed items

## Monitoring

Track metrics:
- Items processed per stage
- Success/failure rates
- Processing time per stage
- AI token usage
- Cost per item
- Queue depth per status

Dashboard shows:
- Pipeline health
- Bottleneck detection
- Cost trends
- Quality metrics (approval rate)
