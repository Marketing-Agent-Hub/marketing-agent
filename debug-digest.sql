-- Debug script to check why items are not creating DailyPost
-- Run these queries in your database to investigate

-- 1. Count items by status
SELECT status, COUNT(*) as count
FROM items
GROUP BY status
ORDER BY count DESC;

-- 2. Check items at AI_STAGE_B_DONE
SELECT 
    i.id,
    i.title,
    i.status,
    i."createdAt",
    COUNT(DISTINCT CASE WHEN ar.stage = 'A' THEN ar.id END) as stage_a_count,
    COUNT(DISTINCT CASE WHEN ar.stage = 'B' THEN ar.id END) as stage_b_count
FROM items i
LEFT JOIN ai_results ar ON ar."itemId" = i.id
WHERE i.status = 'AI_STAGE_B_DONE'
GROUP BY i.id, i.title, i.status, i."createdAt"
ORDER BY i."createdAt" DESC
LIMIT 20;

-- 3. Check AI Results completeness for Stage B
SELECT 
    ar.id,
    ar."itemId",
    ar.stage,
    ar.summary IS NOT NULL as has_summary,
    CASE 
        WHEN ar.summary IS NOT NULL THEN LENGTH(ar.summary)
        ELSE 0
    END as summary_length,
    CASE 
        WHEN ar.bullets IS NOT NULL THEN jsonb_array_length(ar.bullets::jsonb)
        ELSE 0
    END as bullets_count,
    ar."createdAt"
FROM ai_results ar
WHERE ar.stage = 'B'
AND ar."itemId" IN (
    SELECT id FROM items WHERE status = 'AI_STAGE_B_DONE' LIMIT 20
)
ORDER BY ar."createdAt" DESC;

-- 4. Check specific item details (replace 123 with actual item ID)
SELECT 
    i.id,
    i.title,
    i.status,
    ar.stage,
    ar."isAllowed",
    ar."importanceScore",
    ar.summary,
    ar.bullets
FROM items i
LEFT JOIN ai_results ar ON ar."itemId" = i.id
WHERE i.id = 123  -- Replace with actual item ID
ORDER BY ar.stage;

-- 5. Check if DailyPost already exist for tomorrow
SELECT 
    dp.id,
    dp."targetDate",
    dp."timeSlot",
    dp.title,
    COUNT(pi.id) as item_count
FROM daily_posts dp
LEFT JOIN post_items pi ON pi."postId" = dp.id
WHERE dp."targetDate" >= CURRENT_DATE
GROUP BY dp.id, dp."targetDate", dp."timeSlot", dp.title
ORDER BY dp."targetDate", dp."timeSlot";

-- 6. Find items with missing summary or empty bullets
SELECT 
    i.id,
    i.title,
    i.status,
    arb.summary IS NULL as missing_summary,
    arb.bullets,
    CASE 
        WHEN arb.bullets IS NOT NULL THEN jsonb_array_length(arb.bullets::jsonb)
        ELSE 0
    END as bullets_count
FROM items i
INNER JOIN ai_results arb ON arb."itemId" = i.id AND arb.stage = 'B'
WHERE i.status = 'AI_STAGE_B_DONE'
AND (
    arb.summary IS NULL 
    OR arb.summary = ''
    OR arb.bullets IS NULL
    OR jsonb_array_length(arb.bullets::jsonb) = 0
)
ORDER BY i."createdAt" DESC
LIMIT 20;
