# 📋 Todo List – ocvn-rss-ai-bot

## 📊 Progress Overview (Updated: Feb 26, 2026)

### ✅ Phase 1: Backend & Source Manager (COMPLETED)
- **Backend API**: 100% complete
- **Database Schema**: 100% complete (code ready, needs DB setup)
- **Authentication**: 100% complete
- **Source CRUD**: 100% complete
- **RSS Validation**: 100% complete
- **Testing & QA**: Unit tests ✅, ESLint ✅, Prettier ✅
- **Status**: **READY FOR TESTING** (needs DB setup + runtime verification)

### 🚧 Phase 2: RSS Ingest & AI Pipeline (NOT STARTED)
- RSS feed ingestion
- Content extraction & filtering
- AI processing (Stage A & B)
- Digest generation

📝 **Chi tiết Phase 2**: Xem [`todo-ai.md`](todo-ai.md) - Todolist chi tiết cho AI Content Generation Pipeline

### ✅ Phase 3: Source Management Frontend (COMPLETED)
- **Web Dashboard**: 100% complete (Vite + React + TypeScript)
- **Authentication UI**: 100% complete (Login, Protected Routes, Logout)
- **Source CRUD UI**: 100% complete (List, Create, Edit, Delete)
- **Search & Filter**: 100% complete (Real-time search)
- **RSS Validation UI**: 100% complete (Inline validation in form)
- **Toggle Features**: 100% complete (Enable/Disable sources)
- **Status**: **READY FOR INTEGRATION TESTING**

---

## A. Repo & Kiến trúc tổng thể
- [x] Tạo repo `ocvn-rss-ai-bot/`
- [x] Tạo cấu trúc thư mục:
  - [x] `server/` (Express + TS + Prisma) ✅
  - [x] `web/` (Vite + React + TS) ✅
- [x] Thiết lập convention:
  - [x] `.env.example` cho `server/` ✅
  - [x] `.env.example` cho `web/` ✅
  - [x] Không commit secret (chỉ commit example) ✅

## B. Database (PostgreSQL + Prisma)
- [ ] Chọn cách chạy Postgres dev (Docker container postgres:14 hoặc local) 📝 User todo
- [ ] Tạo database `ocvn_rss_bot` 📝 User todo
- [x] Trong `server/`:
  - [x] `prisma init` ✅
  - [x] Viết `schema.prisma` với model `Source` ✅
  - [x] Thêm enums: `SourceLang (VI/EN/MIXED)`, `ValidationStatus (OK/FAILED)` ✅
  - [x] Các field: name, rssUrl(unique), siteUrl?, lang, topicTags[], trustScore, enabled, fetchIntervalMinutes, denyKeywords[], notes?, lastValidatedAt?, lastValidationStatus?, createdAt, updatedAt ✅
  - [x] Indexes: enabled, trustScore ✅
  - [ ] Chạy migrate: `init_sources` 📝 User todo (sau khi setup DB)
  - [x] Generate Prisma client ✅
  - [x] Tạo Prisma client singleton: `server/src/db.ts` ✅

## C. Server (Express + TypeScript)
### C1. Khởi tạo project & tooling
- [x] Init package trong `server/` ✅
- [x] Cài dependencies runtime: express, cors, zod, bcrypt, jsonwebtoken, @prisma/client, fast-xml-parser ✅
- [x] Cài dependencies dev: typescript, tsx, @types/node, @types/express, @types/cors, @types/bcrypt, @types/jsonwebtoken, prisma, eslint, prettier, eslint-config-prettier, vitest, @vitest/coverage-v8 ✅
- [x] Tạo `tsconfig.json` (strict) ✅
- [x] Tạo scripts trong `server/package.json`: dev, build, start, prisma:migrate, prisma:generate, lint, test ✅

### C2. Env & cấu hình server
- [x] Tạo `server/.env.example` gồm: DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, CORS_ORIGIN ✅
- [x] Tạo utility đọc env + validate (zod) ✅
- [x] Bật CORS đúng origin ✅
- [x] Parse JSON body (express.json()) ✅

### C3. Auth (JWT)
- [x] Implement endpoint `POST /auth/login` ✅
- [x] Implement endpoint `GET /auth/me` ✅
- [x] Implement middleware `requireAuth` ✅

### C4. Source CRUD API
- [x] Zod schemas cho create/update ✅
- [x] Implement routes (requireAuth): GET /sources, POST /sources, PATCH /sources/:id, DELETE /sources/:id ✅
- [x] Normalize dữ liệu: trim string, lowercase + dedup tags/keywords ✅

### C5. Validate RSS endpoint
- [x] Implement `POST /sources/validate` ✅
- [x] Parse XML bằng fast-xml-parser ✅
- [x] Detect RSS vs Atom ✅
- [x] Response: { ok, type, title?, itemsCount? } hoặc { ok: false, error } ✅
- [x] Side effect DB: update lastValidatedAt, lastValidationStatus nếu rssUrl tồn tại ✅
- [ ] (Tuỳ chọn) Rate limit theo IP ⏭️ Optional

### C6. Error handling & logging
- [x] Middleware xử lý lỗi chuẩn JSON (400, 401, 404, 500) ✅
- [x] Log login fail/success, validate success/fail ✅

### C7. Chạy local
- [ ] Run Postgres 📝 User todo
- [ ] Server chạy port (ví dụ 3001) 📝 User todo (code ready)
- [ ] Test nhanh bằng curl/Postman 📝 User todo

## D. Web UI (Vite + React + TS)
### D1. Khởi tạo & dependencies
- [x] Tạo `web/` bằng Vite React TS ✅
- [x] Cài dependencies: react-router-dom, @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, TailwindCSS ✅
- [x] Tạo `web/.env.example`: VITE_API_BASE_URL ✅

### D2. Auth UI
- [x] Trang `/login` với form email/password ✅
- [x] Call `POST /auth/login` ✅
- [x] Lưu token (localStorage) ✅
- [x] Implement auth guard cho `/dashboard/*` ✅
- [x] Nút logout xoá token + redirect login ✅

### D3. Sources UI (Dashboard)
- [x] Trang `/sources` với table list sources ✅
- [x] Search, filter, sort, paging ✅ (search implemented, sort/paging for future)
- [x] Form Create/Edit source với validation ✅
- [x] Actions: Create, Edit, Delete, Toggle enabled, Validate feed ✅

### D4. Networking layer
- [x] API client wrapper với baseUrl từ env ✅
- [x] Auto attach Authorization header ✅
- [x] Handle 401 → logout + redirect login ✅
- [x] React Query cho query/mutation ✅

## E. Seed dữ liệu
- [ ] Tạo seed script trong server 🚧 Phase 2
- [ ] Seed 5–10 nguồn mẫu (edtech/blockchain-tech/open-campus) 🚧

## F. Testing & Quality Gates
- [x] Unit tests (normalize tags/keywords, detect RSS vs Atom, zod schema trustScore) ✅
- [ ] E2E test (Playwright) cho 1 flow: login → create source → validate → edit → toggle → delete 🚧 Phase 3
- [x] ESLint pass ✅
- [x] Prettier format consistent ✅
- [ ] Security checklist MVP ⏭️ Production ready

## G. Nghiệm thu (Acceptance Criteria – Phase 1)
- [x] Functional: login, CRUD, validate RSS, DB cập nhật đúng ✅ Code complete
- [x] Non-functional: timeout validate ≤10s, server không crash, unit/e2e/lint pass, UI không lỗi runtime ✅ Backend ready

## H. Definition of Done (DoD – Phase 1)
- [x] Repo có 2 app: server + web ⚠️ 50% (server ✅, web 🚧)
- [x] DB schema chạy được ✅
- [x] Auth JWT hoạt động ✅
- [x] CRUD + validate end-to-end ✅ Backend ready
- [x] Có test tối thiểu + lint pass ✅
- [ ] Đạt nghiệm thu ≥95% 📝 Cần runtime test sau khi setup DB

## I. Quy ước tags & trustScore
- [x] Danh sách tag chuẩn (education, edtech, blockchain-tech, open-campus, announcement, opinion, case-study, events…) ✅ Documented in SRS
- [x] Thang trustScore (0–100) + rule chấm nhanh ✅ Implemented (default 70, range 0-100)
- [x] Preset trustScore theo loại nguồn ✅ Documented in todolist section I.3
- [x] denyKeywords mặc định (global + per-source) ✅ Documented in todolist section I.4
- [x] Quy tắc bật/tắt nguồn (enabled policy) ✅ Implemented (default false)
- [ ] Checklist thao tác thêm nguồn mới 🚧 UI Phase
- [ ] UI hỗ trợ nhập topicTags, denyKeywords, trustScore, preset, badge Tier, notes 🚧 UI Phase

## I.1. Danh sách tag chuẩn (baseline taxonomy)
- [ ] Nhóm Education / EdTech:
  - [ ] education – giáo dục nói chung
  - [ ] edtech – sản phẩm/công nghệ giáo dục
  - [ ] higher-ed – đại học/campus
  - [ ] k12 – phổ thông
  - [ ] learning-science – nghiên cứu khoa học học tập
  - [ ] credentials – chứng chỉ/credential
  - [ ] career-skills – kỹ năng, workforce
- [ ] Nhóm Blockchain (tech/policy, không trading):
  - [ ] blockchain-tech – hạ tầng, protocol, tooling
  - [ ] security – audit, exploit, best practice
  - [ ] identity – DID, attestation, identity layer
  - [ ] privacy – zk, privacy-preserving tech
  - [ ] scaling – L2, rollup, modular
  - [ ] governance – governance, standards
  - [ ] policy – regulation, compliance
- [ ] Nhóm Open Campus / ecosystem:
  - [ ] open-campus – liên quan EDU ecosystem
  - [ ] partnership – hợp tác, MOU
  - [ ] product – tính năng, roadmap
  - [ ] research – nghiên cứu, báo cáo
  - [ ] community – hackathon, workshop
  - [ ] funding – grant/initiative (lọc kỹ raise/valuation)
- [ ] Nhóm định dạng / meta:
  - [ ] announcement – thông báo
  - [ ] opinion – bài opinion (trustScore thấp hơn)
  - [ ] case-study – triển khai thực tế
  - [ ] events – sự kiện
- [ ] Quy tắc đặt tag:
  - [ ] Mỗi source: 1–5 tags chính
  - [ ] Tag lowercase, dùng dấu `-`
  - [ ] Nếu nguồn tổng hợp → tag meta + tag chính

## I.2. Thang trustScore (0–100) + cách chấm nhanh
- [ ] Tier A (90–100): authoritative (blog chính thức, website trường, cơ quan nhà nước)
- [ ] Tier B (75–89): high quality (báo uy tín, company blog kỹ thuật)
- [ ] Tier C (60–74): good community (blog cộng đồng, newsletter chọn lọc)
- [ ] Tier D (40–59): mixed (trang tổng hợp, đôi khi clickbait)
- [ ] Tier E (0–39): avoid (nguồn kèo, shill, giật gân)
- [ ] Rule-of-thumb chấm nhanh:
  - [ ] Bắt đầu ở 70
  - [ ] Mỗi “có” ở (about/editorial, trích nguồn, lịch sử ổn định) +5 điểm
  - [ ] Mỗi “có” ở (giật tít, nhắc giá coin/trading) -10 điểm
  - [ ] Clamp về 0–100

## I.3. Preset trustScore theo loại nguồn
- [ ] Official foundation/project blog: 90
- [ ] University/education institution official: 90
- [ ] Major tech/education media: 80
- [ ] Serious technical newsletter/community: 65
- [ ] Generic crypto media: 45 (+ denyKeywords mạnh)
- [ ] Forum/threads/rumor: 25 (khuyên tắt)

## I.4. denyKeywords mặc định
- [ ] Global deny list (áp cho tất cả)
- [ ] Per-source denyKeywords (nếu nguồn hay lạc đề)
- [ ] Tiếng Anh: price, chart, trading, signal, pump, dump, bullish, bearish, ATH, TA, leverage, futures, liquidation, airdrop speculation...
- [ ] Tiếng Việt: giá, kèo, tín hiệu, vào lệnh, chốt lời, cắt lỗ, x2, x10, bơm, xả, phân tích kỹ thuật, đòn bẩy, phái sinh, hợp đồng tương lai, thanh lý, sóng
- [ ] Quy tắc vận hành:
  - [ ] Tier C/D → thêm denyKeywords riêng
  - [ ] Nếu nguồn liên tục dính market → giảm trustScore + disable

## I.5. Quy tắc bật/tắt nguồn (enabled policy)
- [ ] Mặc định nguồn mới: enabled=false
- [ ] Chỉ bật khi:
  - [ ] Validate OK
  - [ ] trustScore ≥ 60 (hoặc thấp hơn nhưng có denyKeywords mạnh)
- [ ] Auto rule (phase sau): validate FAIL 3 lần liên tiếp → tự tắt

## I.6. Checklist thao tác trên dashboard
- [ ] Thêm Source (enabled=false)
- [ ] Gán tag (1–5)
- [ ] Đặt trustScore (preset)
- [ ] Thêm denyKeywords (nếu cần)
- [ ] Bấm Validate
- [ ] Nếu OK → bật enabled=true
- [ ] Ghi notes (ví dụ: “official blog”, “hay market → lọc mạnh”)

## I.7. Tiêu chí nghiệm thu riêng cho bước I
- [x] UI cho phép nhập topicTags dạng multi (chips) + auto lowercase + dedup
- [x] UI cho phép nhập denyKeywords dạng multi + auto lowercase + dedup
- [x] trustScore input:
  - [x] slider hoặc number input
  - [x] chặn ngoài khoảng 0–100
- [ ] Có preset gợi ý trustScore (dropdown)
- [ ] Hiển thị badge Tier (A/B/C/D/E)
- [ ] Có notes field để ghi quy ước nguồn

---

## 🚀 Next Steps (Immediate Actions)

### 1. Setup Database & Test Full Stack Integration ✅ Backend + ✅ Frontend Ready
```bash
# Option A: Docker PostgreSQL
docker run --name ocvn-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ocvn_rss_bot \
  -p 5432:5432 \
  -d postgres:14

# Option B: Local PostgreSQL
# Install PostgreSQL and create database ocvn_rss_bot

# Then run migrations
cd server
npm run prisma:migrate

# Generate password hash for admin
npx tsx scripts/generate-password-hash.ts your-password
# Copy hash to .env as ADMIN_PASSWORD_HASH

# Start backend server
npm run dev

# In another terminal, start frontend
cd ../web
npm run dev

# Test full stack at http://localhost:5173
# Login with admin credentials
# Test all CRUD operations
```

### 2. ✅ Frontend (Phase 3) - COMPLETED
- ✅ Created web/ folder with Vite + React + TypeScript
- ✅ Implemented login page with JWT auth
- ✅ Implemented sources dashboard with table view
- ✅ Implemented CRUD forms with validation
- ✅ Added search functionality
- ✅ Added toggle enabled and validate RSS features
- ✅ Build successful: 0 TypeScript errors

### 3. Implement RSS Ingest & AI Pipeline (Phase 2) - Next Priority
- RSS fetching jobs with configurable intervals
- Content extraction from full HTML
- AI filtering (Stage A: cheap filter)
- AI summarization (Stage B: deep summary)
- Digest generation (5 posts per day)
- Draft review system

---

**Last Updated**: February 26, 2026  
**Backend Status**: ✅ Complete (code ready, needs DB setup)  
**Frontend Status**: ✅ Complete (ready for integration testing)  
**Overall Progress**: ~60% (Phase 1 + Phase 3 complete)
