# API Interaction Mapping: Frontend ↔ Backend

Tài liệu này ánh xạ (map) các thành phần giao diện đã thiết kế trong các file UX/UI sang các Endpoint API cụ thể của Backend. Đây là cẩm nang để lập trình viên Frontend biết chính xác cần gọi gì và xử lý dữ liệu trả về như thế nào.

---

## 1. Module A: Auth & Account Setup

### 1.1 Màn hình Đăng nhập (`/login`)
*   **Hành động:** User nhấn "Đăng nhập".
    *   **API:** `POST /api/accounts/login`
    *   **Payload:** `{ email, password }`
    *   **Xử lý:** Lưu `token` vào LocalStorage/Cookie. Lưu thông tin `user` vào Global State. Điều hướng sang `/workspaces`.

### 1.2 Màn hình Đăng ký (`/register`)
*   **Hành động:** User nhấn "Tạo tài khoản".
    *   **API:** `POST /api/accounts/register`
    *   **Payload:** `{ email, password, name }`
    *   **Xử lý:** Tương tự login, nhận token và tự động đăng nhập.

### 1.3 Màn hình Chọn Workspace (`/workspaces`)
*   **Hành động:** Load màn hình.
    *   **API:** `GET /api/workspaces`
    *   **Xử lý:** Hiển thị danh sách thẻ (Cards) các Workspace. Nếu không có cái nào, hiện nút "Tạo mới".
*   **Hành động:** Nhấn "Tạo Workspace".
    *   **API:** `POST /api/workspaces`
    *   **Payload:** `{ name, slug }`

---

## 2. Module B: Brand & Onboarding (Chế độ thiết lập)

### 2.1 Màn hình Danh sách Brand (`/w/[id]/brands`)
*   **Hành động:** Load màn hình.
    *   **API:** `GET /api/workspaces/:workspaceId/brands`
*   **Hành động:** Nhấn "Thêm Brand mới".
    *   **API:** `POST /api/workspaces/:workspaceId/brands`
    *   **Payload:** `{ name, websiteUrl, industry, timezone, defaultLanguage }`

### 2.2 Luồng AI Onboarding Chat (`/b/[id]/onboarding`)
*   **Hành động:** Vào màn hình lần đầu.
    *   **API:** `POST /api/brands/:brandId/onboarding/sessions` (Tạo session mới).
*   **Hành động:** User gửi tin nhắn chat.
    *   **API:** `POST /api/brands/:brandId/onboarding/sessions/:sessionId/messages`
    *   **Payload:** `{ role: 'user', content: '...' }`
*   **Hành động:** Nhấn "Lưu & Phân tích profile".
    *   **API:** `POST /api/brands/:brandId/onboarding/sessions/:sessionId/complete`
    *   **Xử lý:** Chuyển trạng thái UI sang "Đang xử lý". Polling `GET /api/brands/:brandId` để kiểm tra khi nào `BrandProfile` xuất hiện.

---

## 3. Module C: Chiến lược nội dung (Strategy)

### 3.1 Màn hình Calendar Chiến lược (`/strategy`)
*   **Hành động:** Load màn hình.
    *   **API:** `GET /api/brands/:brandId/strategies`
    *   **Xử lý:** Render danh sách các chiến lược. Nếu có chiến lược `ACTIVE`, load `GET /api/strategies/:id`.
*   **Hành động:** Generate chiến lược mới.
    *   **API:** `POST /api/brands/:brandId/strategies/generate`
    *   **Payload:** `{ durationDays, postsPerWeek, channels }`
*   **Hành động:** Nhấn "Kích hoạt chiến lược" (Activate).
    *   **API:** `POST /api/strategies/:strategyId/activate`

---

## 4. Module D: Review Queue (Trạm kiểm duyệt - TRỌNG TÂM)

### 4.1 Danh sách bài chờ duyệt (`/review-queue`)
*   **Hành động:** Load danh sách.
    *   **API:** `GET /api/brands/:brandId/review-queue`
    *   **Response:** Trả về danh sách Draft kèm theo thông tin Brief và Trend Signals.

### 4.2 Chi tiết 1 bài nháp bài (Split-screen View)
*   **Hành động:** User chọn 1 bài từ danh sách.
    *   *Dữ liệu cần thiết (Thường đã có trong nốt `GET /review-queue` hoặc gọi lẻ):*
    *   `GET /api/briefs/:briefId` (Lấy hướng dẫn AI).
    *   Backend tự động trả kèm Article gốc trong object Draft/Brief để FE hiển thị.
*   **Hành động:** Sửa nội dung bài viết trực tiếp.
    *   **API:** `PATCH /api/drafts/:draftId`
    *   **Payload:** `{ hook, body, cta, hashtags }`
*   **Hành động:** Nhấn **Approve** (Duyệt).
    *   **API:** `POST /api/drafts/:draftId/approve`
*   **Hành động:** Nhấn **Reject** (Từ chối).
    *   **API:** `POST /api/drafts/:draftId/reject`
    *   **Payload:** `{ comment: 'Lý do từ chối...' }`
*   **Hành động:** Yêu cầu AI viết lại (Regenerate).
    *   **API:** `POST /api/briefs/:briefId/drafts/regenerate`

---

## 5. Module E: Xuất bản & Nguồn tin (Publishing & Sources)

### 5.1 Publishing Status (`/publishing`)
*   **Hành động:** Xem danh sách việc đã làm.
    *   **API:** `GET /api/brands/:brandId/publish-jobs`
*   **Hành động:** Thử lại bài bị lỗi.
    *   **API:** `POST /api/publish-jobs/:id/retry`

### 5.2 Quản lý Nguồn RSS của Brand (`/sources`)
*   **Hành động:** Load nguồn của brand.
    *   **API:** `GET /api/brands/:brandId/sources`
*   **Hành động:** Gắn nguồn mới từ danh sách hệ thống.
    *   **API:** `POST /api/brands/:brandId/sources`
    *   **Payload:** `{ sourceId }`
*   **Hành động:** Chỉnh sửa Filter Profile.
    *   **API:** `PATCH /api/brands/:brandId/filter-profile`
    *   **Payload:** `{ mode, similarityThreshold, topicTags }`

---

## 6. Module Internal Admin (Dành cho Kỹ thuật)

### 6.1 Authentication Admin
*   **API:** `POST /api/internal/auth/login`

### 6.2 Monitoring Dashboard
*   **API:** `GET /api/internal/monitor/overview`
*   **API:** `GET /api/internal/monitor/health` (Kiểm tra 🟢/🔴 của DB, AI)

### 6.3 Quản lý Master Sources
*   **API:** `GET /api/internal/sources`
*   **API:** `POST /api/internal/sources/:id/validate` (Ép hệ thống kiểm tra URL RSS ngay lập tức)

### 6.4 Duyệt nguồn mới (Discovery)
*   **API:** `GET /api/internal/source-discovery/pending`
*   **API:** `POST /api/internal/source-discovery/pending/:id/approve`

---

## 7. Quy tắc chung cho Frontend (Data Handling)

1.  **Authorization Header:** Tất cả các request (ngoại trừ login/register) PHẢI kèm theo:
    `Authorization: Bearer <JWT_TOKEN>`
2.  **Xử lý lỗi 422 (Business Logic Error):** Khi gọi `POST generate`, nếu Backend trả về 422, FE cần đọc `error.message` để hiển thị Toast thông báo (VD: "Chưa hoàn thành Onboarding").
3.  **Loading States:** 
    *   Các Action "Generate" (AI) nên có trạng thái `isPending` để Disable nút bấm.
    *   Sử dụng Skeleton Screens cho các nốt `GET` danh sách.
4.  **Multi-tenant Context:** Luôn đảm bảo lấy `workspaceId` và `brandId` từ URL (@route params) thay vì fix cứng trong code.
