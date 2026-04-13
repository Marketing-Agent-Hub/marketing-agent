# Kế hoạch & Kiến trúc Giao diện Người dùng (UI Frontend Plan)

Dựa trên tài liệu hệ thống Backend API (server/docs), dưới đây là bản thiết kế kiến trúc và kế hoạch xây dựng giao diện ứng dụng Web cho dự án **OC News Bot** (B2B Marketing Automation).

---

## 1. Phân Tích Tổng Quan

Ứng dụng phục vụ hai nhóm đối tượng chính với hệ thống Authentication và luồng nghiệp vụ hoàn toàn tách biệt:
1. **Product App (Client-facing)**: Dành cho các Marketing Teams quản lý chiến lược, nội dung và đăng bài của các "Tier/Brands" trực thuộc "Workspaces". Yêu cầu phân quyền nội bộ (OWNER, ADMIN, EDITOR, VIEWER).
2. **Internal Admin Panel (System Admin)**: Dành cho kỹ thuật viên và quản trị viên hệ thống để monitor sức khỏe hệ thống, quản lý cấu hình AI, quản lý danh sách RSS Feed chuẩn.

---

## 2. Bản Đồ Ứng Dụng (Sitemap & Routing)

### A. Auth & Public Routes
*   `/login` - Đăng nhập tài khoản Product.
*   `/register` - Tạo tài khoản mới.

### B. Product App (Dành cho Marketing Teams)
Giao diện này chủ yếu lấy **Brand làm trung tâm**. Sau khi chọn Workspace, người dùng làm việc trong ngữ cảnh của một Brand cụ thể.

*   `/workspaces` - Màn hình chọn Workspace hoặc tạo mới Workspace.
*   `/w/[workspaceId]/brands` - Dashboard liệt kê các Thương hiệu (Brands) đang quản lý.
*   `/b/[brandId]/onboarding` - **Trợ lý Thiết lập Brand:** Giao diện chat dạng Q&A với AI để tự động tạo `BrandProfile` (từ transcript).
*   `/b/[brandId]/dashboard` - Bảng điều khiển chính của Brand (Analytics, Trạng thái chiến lược, Việc cần làm).
*   `/b/[brandId]/strategy` - **Chiến lược Nội dung (Content Calendar):** 
    *   Hiển thị dạng lịch `StrategyPlan` và các `StrategySlots`.
    *   Nút "Generate Strategy" tạo kế hoạch 30 ngày.
    *   Gắn kèm các Trend Snippets để tham khảo tin tức realtime.
*   `/b/[brandId]/review-queue` - **Duyệt bài (Content Review):** Khu vực quan trọng nhất. Danh sách các bài nháp (`IN_REVIEW`). Editor có thể xem Content Brief, so sánh Trend, Sửa bài, Approve (Duyệt) hoặc Reject (Từ chối kèm bình luận).
*   `/b/[brandId]/publishing` - Lịch sử và lịch đăng bài lên Social (`PublishJobs` và `PublishedPost`). Xem trạng thái Failed/Completed.
*   `/b/[brandId]/sources` - Quản lý nguồn RSS, kết nối nguồn mới và tùy chỉnh Filter Profile.
*   `/b/[brandId]/knowledge` - Upload và quản lý tài liệu tham khảo cho AI (Text/FAQs).
*   `/b/[brandId]/settings` - Cài đặt chung của Brand, kết nối Social Accounts (Facebook, X, LinkedIn, v.v.).

### C. Internal Admin Panel (Dành cho System Admin)
*   `/admin/login` - Cổng đăng nhập System Admin.
*   `/admin/dashboard` - Bảng điều khiển hệ thống, hiển thị metrics, uptime, health checks.
*   `/admin/sources` - Quản lý Master Sources: Thêm/sửa/xóa nguồn, validate chuẩn RSS, trigger ingest thủ công.
*   `/admin/source-discovery` - Chờ duyệt (`PendingSource`) các nguồn RSS mới do AI tự động lùng sục hàng tuần.
*   `/admin/ai-settings` - Bảng điều khiển cấu hình OpenAI/Model cho từng stage (Stage A, Stage B, ...).
*   `/admin/monitoring` - Visualize logs, System Metrics, Tracking hiệu suất (Traces latency).

---

## 3. Kiến Trúc Dữ Liệu (State Management & Fetching)

*   **Tách biệt Token:** Do hệ thống dùng 2 loại token độc lập (`Product JWT` và `Internal JWT`), state storage (như LocalStorage hoặc Cookies) cần quản lý khóa riêng biệt (ví dụ: `app_token`, `admin_token`) và cấu hình 2 Axios Clients khác nhau.
*   **Server State (React Query / SWR):** Rất phù hợp vì kiến trúc Backend có nhiều resource CRUD (Workspaces, Brands, Sources) và cần trigger refetch (ví dụ sau khi Submit Duyệt bài, refresh danh sách Review Queue).
*   **Xử lý Form (React Hook Form + Zod):** Cực kỳ cần thiết cho ứng dụng này (đặc biệt khi tạo StrategyPlan) vì API yêu cầu data structure khá phức tạp và cần validate chặt chẽ dựa trên các config.

---

## 4. Các UI Component / Trải nghiệm Đặc thù (Core UX)

1. **Onboarding Chatbot Interface:** Không phải form bình thường mà là UI nhắn tin. Ở background mỗi send/receive gọi API append message. Khi user nói xong nhấn "Lưu", gọi API Complete chờ AI Generate `BrandProfile`.
2. **Strategy Calendar:** Một Component lịch kết hợp drag-drop để hình dung rõ việc rải bài theo phễu (funnel stage) và Content Pillars. Cần thiết kế giao diện nhìn lịch dễ dàng thấy các trạng thái PLANNED, BRIEF_READY, DRAFT_READY...
3. **Split-Screen Editor (Review Workflow):** Khi kiểm duyệt draft, màn hình nên chia đôi:
    *   Trái: Content Brief, Nguồn Article (Tin tức gốc đã trích xuất), Trend Signal.
    *   Phải: Draft nội dung từ AI Stage B, Textarea để sửa thủ công nếu cần, Nhập Reject Comment, Buttons [Approve] / [Reject].
4. **Monitoring Tables:** Bảng Log / Metric Admin Panel cần có tính năng Pagination, Date Range Pickers, Live filtering.

---

## 5. Lộ Trình Triển Khai (Phased Roadmap)

*   **Phase 1: Nền tảng (Foundation) & Authentication**
    *   Setup cấu trúc dự án (Vite/Next.js tùy chọn, TailwindCSS).
    *   Xây dựng Luồng đăng nhập Product, Quản lý Token.
    *   Xây dựng Layout chính, Sidebar theo ngữ cảnh Workspace.
*   **Phase 2: Quản lý Hình Ảnh & Thương Hiệu (Brand & Workspace Setup)**
    *   CRUD Workspaces, Brands.
    *   Xây dựng hệ thống UI Onboarding/Chat Q&A tạo Brand Profile.
    *   Settings và Knowledge Base UI.
*   **Phase 3: Cỗ máy Chiến lược & Kiểm duyệt (Strategy & Review - Trái tim của App)**
    *   Calendar View lấy dữ liệu StrategyPlan.
    *   Màn hình xử lý Hàng đợi (Review Queue).
    *   Tính năng Approve/Reject API Integration.
*   **Phase 4: Xuất bản và Nguồn tin (Publishing & Sources)**
    *   UI cho Settings API Connectors (Social Accounts).
    *   Quản lý Brand Sources & Filter Profile.
*   **Phase 5: Internal Admin App**
    *   Layout Admin riêng tách biệt.
    *   Dashboard Monitoring & Health.
    *   Tích hợp AI Settings & Master Sources Panel.
