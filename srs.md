# Open Campus Vietnam – AI RSS Bot
## Software Requirements Specification (SRS)
Version: 1.0  
Status: Draft – Phase 1 Complete (Source Manager)  
Owner: Open Campus Vietnam  

---

# 1. Giới thiệu

## 1.1. Mục tiêu dự án

Xây dựng một hệ thống tự động:

1. Theo dõi các nguồn RSS liên quan đến:
   - Giáo dục (Education / EdTech)
   - Blockchain (thiên về tech, research, policy – không trading)
   - Open Campus ecosystem
2. Phân tích và tổng hợp nội dung bằng AI.
3. Tạo nhiều bài post mỗi ngày (digest nhiều tin).
4. Đưa vào web dashboard để duyệt thủ công.
5. Sau khi duyệt, đăng lên Facebook Page Open Campus Vietnam.

Mục tiêu dài hạn:
- Tạo dòng nội dung ổn định, chất lượng cao.
- Xây dựng hình ảnh builder vibe cho Open Campus Vietnam.
- Tối ưu chi phí AI.
- Tạo giá trị thực để hỗ trợ chi phí vận hành (bao gồm ChatGPT Plus).

---

# 2. Phạm vi hệ thống

## 2.1. In Scope

- Quản lý nguồn RSS (Source Manager)
- Ingest RSS
- Validate RSS feed
- Deduplicate bài viết
- Lọc nội dung trading/giá coin
- Phân tích & tóm tắt bằng AI
- Tạo nhiều bài digest mỗi ngày
- Web dashboard duyệt bài
- Đăng lên Facebook Page (Meta Graph API)
- Logging & basic monitoring

## 2.2. Out of Scope

- Hệ thống trading / phân tích giá coin
- Hệ thống đầu tư / khuyến nghị tài chính
- Social listening (Twitter scraping, v.v.)
- Multi-user role phức tạp (MVP chỉ 1 admin)

---

# 3. Tổng quan kiến trúc

## 3.1. Kiến trúc tổng thể
             ┌────────────────────┐
             │     Vite Web UI     │
             │  (Dashboard + CRUD) │
             └─────────▲───────────┘
                       │ REST API
                       ▼
             ┌────────────────────┐
             │  Express Server     │
             │  - Source Manager   │
             │  - RSS Validate     │
             │  - Ingest (Phase 2) │
             │  - AI Pipeline      │
             └─────────▲───────────┘
                       │
                       ▼
               ┌──────────────┐
               │ PostgreSQL   │
               └──────────────┘

## 3.2. Thành phần chính

### 1) Web (Vite + React)
- Login admin
- Quản lý nguồn RSS
- Xem & duyệt draft
- Quản lý cấu hình

### 2) Server (Node.js + Express)
- Auth (JWT)
- CRUD sources
- RSS validation
- Ingest pipeline
- AI processing
- Digest generation
- Facebook posting

### 3) Database (PostgreSQL + Prisma)
- sources
- items
- articles
- ai_results
- daily_posts
- post_items

---

# 4. Yêu cầu chức năng (Functional Requirements)

## 4.1. Source Manager

Hệ thống phải cho phép:
- Tạo nguồn RSS
- Chỉnh sửa nguồn
- Xóa nguồn
- Bật/tắt nguồn
- Gán tag chủ đề
- Gán trustScore (0–100)
- Gán denyKeywords
- Validate RSS feed (phát hiện RSS/Atom)
- Lưu trạng thái validate

---

## 4.2. RSS Ingest (Phase 2)

- Fetch RSS theo interval
- Parse items
- Chuẩn hóa URL
- Deduplicate theo GUID/link/hash
- Lưu raw items

---

## 4.3. Content Extraction

- Nếu RSS chỉ có excerpt → fetch full HTML
- Extract main content
- Loại bỏ script/nav/footer
- Cắt độ dài tối đa (token optimization)

---

## 4.4. Content Filtering (Bắt buộc)

Hệ thống phải:

- Loại bỏ bài liên quan:
  - Giá coin
  - Trading
  - Kèo
  - Technical analysis
  - Futures / leverage
- Áp dụng denyKeywords global + per-source
- Cho phép rule-based filter + AI-based filter

---

## 4.5. AI Processing

Pipeline 2 tầng:

### Stage A – Cheap filter
Input:
- Title
- Snippet
- Source
- Date

Output JSON:
- isAllowed
- topicTags
- importanceScore (0–100)
- oneLineSummary

### Stage B – Deep summary
Input:
- Full content
- Metadata

Output JSON:
- summary (2–3 câu)
- bullets (3–5 ý)
- why_it_matters_for_OCVN
- riskFlags
- suggestedHashtags

---

## 4.6. Digest Generation

Mỗi ngày tạo 5 post theo 3 mốc giờ:
- 08:00 (2 post)
- 12:00 (1 post)
- 18:30 (2 post)

Mỗi post:
- Hook
- 6–10 bullets tin
- OCVN take (builder vibe)
- CTA
- Hashtags

Ngôn ngữ:
- 100% tiếng Việt
- Giữ nguyên thuật ngữ chuyên ngành

Phong cách:
- Trẻ trung
- Builder vibe
- Không giật gân
- Không đầu tư

---

## 4.7. Human Approval

- Tất cả post phải ở trạng thái `draft`
- Admin phải:
  - Approve
  - Edit
  - Reject
- Chỉ post khi được approve

---

## 4.8. Facebook Integration

- Đăng bài lên Facebook Page
- Lưu fbPostId
- Retry nếu lỗi
- Không auto-post nếu chưa approve

---

# 5. Yêu cầu phi chức năng (Non-functional Requirements)

## 5.1. Performance
- Validate RSS < 10s
- Ingest không block main thread
- Hệ thống xử lý được > 100 nguồn RSS

## 5.2. Reliability
- Không crash nếu RSS lỗi
- Timeout khi fetch
- Retry logic cơ bản

## 5.3. Security
- JWT auth
- Không log password/token
- CORS hạn chế origin
- Validate input với zod
- Không lưu secrets trong repo

## 5.4. Maintainability
- Code TypeScript strict
- Tách module rõ ràng
- Có unit tests tối thiểu

---

# 6. Data Model (High Level)

## 6.1. sources
Quản lý nguồn RSS.

## 6.2. items
Raw RSS entries.

## 6.3. articles
Full content đã extract.

## 6.4. ai_results
Output Stage A + Stage B.

## 6.5. daily_posts
Draft / Approved / Posted.

## 6.6. post_items
Mapping bài post ↔ items.

---

# 7. Business Rules

1. Cấm hoàn toàn nội dung trading / giá coin.
2. Mọi post phải có nguồn link.
3. Luôn paraphrase, không copy nguyên văn dài.
4. Builder vibe, không sensationalism.
5. TrustScore ảnh hưởng đến selection.
6. Nguồn trustScore < 40 không được enable mặc định.

---

# 8. Assumptions

- Có 1 admin duy nhất.
- Lượng nguồn RSS ban đầu < 50.
- Facebook Page đã có quyền API.
- Server chạy trên VPS hoặc cloud instance.

---

# 9. Future Enhancements

- Auto-disable nguồn fail nhiều lần.
- Học từ reject/edit để cải thiện prompt.
- Metrics dashboard (approve rate, token usage).
- Slack/Telegram notify khi có draft mới.
- Multi-language expansion (future).

---

# 10. AI Agent Context Notes (Quan trọng)

Khi AI agent làm việc với repo này, cần hiểu:

- Đây là hệ thống production content, không phải toy project.
- Nội dung phải an toàn pháp lý (không financial advice).
- Tránh market talk.
- Luôn output structured JSON khi được yêu cầu.
- Ưu tiên tối ưu token usage.
- Code phải maintainable, không hacky.

AI agent phải:
- Không tự động thêm tính năng ngoài scope.
- Không thay đổi data model nếu chưa được yêu cầu.
- Không phá vỡ rule cấm trading.
- Giữ đúng kiến trúc Express server + Vite UI.

---

# 11. Definition of Success

Dự án thành công khi:

- Mỗi ngày tạo được 5 post chất lượng cao.
- Tỉ lệ approve > 80%.
- Không có post dính trading.
- Vận hành ổn định ≥ 30 ngày.
- Nội dung giúp tăng engagement cho Open Campus Vietnam.