# Debug Guide: Items Not Creating DailyPost

## Vấn đề
Items đã vào trạng thái `AI_STAGE_B_DONE` nhưng không tạo ra `DailyPost`.

## Các bước kiểm tra

### 1. Kiểm tra Database
Chạy các SQL queries trong file `debug-digest.sql`:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database -f debug-digest.sql
```

**Hoặc dùng GUI tool (pgAdmin, DBeaver, etc.)** và copy-paste từng query.

Key queries:
- Query #1: Đếm items theo status
- Query #3: Kiểm tra AI results có đủ summary và bullets không
- Query #6: Tìm items bị thiếu summary hoặc bullets rỗng

### 2. Trigger Manual Digest

Dùng API endpoint để trigger digest generation manually và xem logs:

```bash
curl -X POST http://localhost:3000/api/admin/digest/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{}'
```

**Hoặc dùng frontend:** Có thể thêm button trigger digest ở admin page.

### 3. Check Server Logs

Sau khi trigger, check console logs để thấy:

**Logs mới được thêm:**
```
[Digest] Fetched X items with status AI_STAGE_B_DONE from database
[Digest Debug] Item 123 skipped: missing AI results { ... }
[Digest Debug] Item 456 skipped: Stage A not allowed { ... }
[Digest Debug] Item 789 skipped: incomplete Stage B { ... }
[Digest] Found X items ready for digest
[Digest] Selected X items for individual posts
```

**Các trường hợp items bị filter out:**

1. **Missing AI results:**
   - Không có Stage A result
   - Không có Stage B result
   - ImportanceScore = null

2. **Stage A not allowed:**
   - `isAllowed !== true`
   - (Đã được force = true rồi, nên không nên thấy case này)

3. **Incomplete Stage B:**
   - `summary` là NULL hoặc empty string
   - `bullets` là NULL hoặc empty array `[]`
   - Đây là nguyên nhân phổ biến nhất!

### 4. Kiểm tra AI Stage B Service

Nếu thấy nhiều items bị "incomplete Stage B", check:

**File:** `server/src/services/ai-stage-b.service.ts`

- Xem logs `[AI Stage B] Processing: ...`
- Xem logs `[AI Stage B] Generated Vietnamese summary (X bullets)`
- Check có errors khi call OpenAI không

**Common issues:**
- OpenAI API key hết quota
- OpenAI response không đúng format
- Network timeout khi call OpenAI
- JSON parsing error

### 5. Check System Logs Table

```sql
SELECT * FROM system_logs 
WHERE category = 'AI_STAGE_B' 
  AND level IN ('ERROR', 'WARN')
ORDER BY "createdAt" DESC 
LIMIT 50;
```

## Các điều kiện để tạo DailyPost

**Items phải đáp ứng tất cả:**
1. Status = `AI_STAGE_B_DONE`
2. Có AI Result Stage A với `isAllowed = true`
3. Có AI Result Stage A với `importanceScore` không null
4. Có AI Result Stage B với `summary` không null/empty
5. Có AI Result Stage B với `bullets` array có ít nhất 1 item

**Constraints:**
- Digest job chỉ chạy nếu có >= 15 items đủ điều kiện
- Mỗi ngày tối đa 5 posts (5 time slots)
- Unique constraint: (targetDate, timeSlot) - không tạo duplicate

## Quick Fix

Nếu thấy nhiều items có Stage B result nhưng thiếu summary/bullets:

**Option 1: Re-run Stage B cho items đó**
```sql
-- Reset items về AI_STAGE_A_DONE để chạy lại Stage B
UPDATE items 
SET status = 'AI_STAGE_A_DONE'
WHERE status = 'AI_STAGE_B_DONE'
  AND id IN (
    SELECT i.id FROM items i
    INNER JOIN ai_results arb ON arb."itemId" = i.id AND arb.stage = 'B'
    WHERE i.status = 'AI_STAGE_B_DONE'
    AND (arb.summary IS NULL OR jsonb_array_length(arb.bullets::jsonb) = 0)
  );
```

**Option 2: Xóa AI Result Stage B lỗi và chạy lại**
```sql
-- Delete corrupted Stage B results
DELETE FROM ai_results
WHERE stage = 'B'
  AND (summary IS NULL OR jsonb_array_length(bullets::jsonb) = 0);

-- Reset items
UPDATE items 
SET status = 'AI_STAGE_A_DONE'
WHERE status = 'AI_STAGE_B_DONE'
  AND id NOT IN (SELECT "itemId" FROM ai_results WHERE stage = 'B');
```

## Test Sequence

1. ✅ Check database với debug-digest.sql
2. ✅ Trigger manual digest: `POST /admin/digest/trigger`
3. ✅ Check server console logs
4. ✅ Kiểm tra SystemLog table
5. ✅ Nếu cần, reset items và chạy lại Stage B job

## Expected Behavior

**Khi digest chạy thành công:**
```
[Digest] Generating posts for 2024-01-15
[Digest] Fetched 25 items with status AI_STAGE_B_DONE from database
[Digest] Found 20 items ready for digest
[Digest] Selected 15 items for individual posts
[Digest] Created post 1/15 (MORNING_1): Article title...
[Digest] Created post 2/15 (MORNING_1): Article title...
...
[Digest] ✅ Created 15 posts for 2024-01-15
```

**Khi không đủ items:**
```
[Digest] Generating posts for 2024-01-15
[Digest] Fetched 8 items with status AI_STAGE_B_DONE from database
[Digest Debug] Item 123 skipped: incomplete Stage B { ... }
[Digest Debug] Item 456 skipped: incomplete Stage B { ... }
[Digest] Found 5 items ready for digest
[Digest] Not enough items (need 15, have 5). Skipping generation.
```
