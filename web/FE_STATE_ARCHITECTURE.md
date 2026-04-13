# Kiến Trúc Quản Lý Trạng Thái & Luồng Dữ Liệu (Frontend State Management)

Tài liệu này định nghĩa cách thức ứng dụng Frontend quản lý dữ liệu, đồng bộ với Backend và xử lý các trạng thái phức tạp (AI, Multi-tenant) để đảm bảo hiệu suất và trải nghiệm mượt mà.

---

## 1. Phân Loại Trạng Thái (State Categories)

Ứng dụng sẽ chia làm 3 tầng quản lý trạng thái tách biệt:

### 1.1 Server State (Trạng thái từ Máy chủ)
*   **Dữ liệu:** Workspaces, Brands, Review Queue, Strategies, Logs, v.v.
*   **Công cụ đề xuất:** **TanStack Query (React Query)**.
*   **Lý do:** Tự động hóa việc Caching, tự động Refetch khi mất mạng, quản lý trạng thái `isLoading`, `isError` một cách khai báo (declarative).

### 1.2 Global Client State (Trạng thái Toàn cục)
*   **Dữ liệu:** Thông tin User hiện tại, danh sách Workspace IDs của user, Trạng thái Sidebar (đóng/mở), Theme (Dark/Light).
*   **Công cụ đề xuất:** **Zustand**.
*   **Lý do:** Cực nhẹ, dễ học, không cần Boilerplate rườm rà như Redux.

### 1.3 Local State (Trạng thái tại chỗ)
*   **Dữ liệu:** Nội dung input trong form, trạng thái đóng mở của Modal/Popover, nội dung đang chỉnh sửa của 1 Draft cụ thể.
*   **Công cụ đề xuất:** `useState`, `useReducer` của React.

---

## 2. Quản Lý Ngữ Cảnh Đa Thương Hiệu (Multi-tenant Context)

Đây là phần quan trọng nhất của hệ thống này.

*   **URL làm "Nguồn chân lý" (Source of Truth):** `workspaceId` và `brandId` PHẢI được lấy trực tiếp từ URL (thông qua React Router params).
*   **Cơ chế Luồng:**
    1.  User truy cập `/b/123/dashboard`.
    2.  Frontend dùng `useParams()` lấy ra `brandId = 123`.
    3.  Tất cả các Hook `useQuery` (ví dụ: `useBrandSources(brandId)`) sẽ lấy ID này làm **Query Key**.
    4.  Khi User dùng Context Switcher đổi sang Brand `456`, URL đổi -> Query Key đổi -> React Query tự động Fetch lại dữ liệu của Brand 456 và xóa Cache cũ nếu cần.

---

## 3. Quy Trình Đồng Bộ & Vô Hiệu Hóa Dữ Liệu (Cache Invalidation)

Để đảm bảo UI luôn phản ánh đúng dữ liệu mới nhất sau các hành động của AI hoặc User:

*   **Mutations:** Sử dụng `useMutation` từ React Query cho các hành động `Approve`, `Reject`, `Generate`.
*   **Invalidation Logic:**
    *   Sau khi `POST /drafts/:id/approve` thành công -> Gọi `queryClient.invalidateQueries(['review-queue', brandId])`.
    *   Sau khi `POST /strategies/:id/activate` thành công -> Gọi `queryClient.invalidateQueries(['strategy', brandId])`.
*   **Optimistic Updates (Cập nhật lạc quan):** Với hành động sửa Draft, FE có thể cập nhật UI ngay lập tức trước khi Backend phản hồi để tạo cảm giác "không độ trễ".

---

## 4. Kiến Trúc Xử Lý Tác Vụ AI (Long-running Tasks)

Backend xử lý các tác vụ AI (Stage B, Onboarding Analysis) qua cơ chế Job chạy ngầm. Frontend cần xử lý luồng này:

1.  **Trigger:** User nhấn "Generate". Gọi API thành công (Backend trả về 202 hoặc 201).
2.  **Polling:** FE bắt đầu một vòng lặp `GET` (ví dụ 3 giây/lần) để kiểm tra trạng thái của Item/Brand.
3.  **UI Feedback:** Hiển thị Skeleton hoặc Progress Bar với thông điệp: "AI đang suy nghĩ, quá trình này có thể mất 30-60 giây...".
4.  **Completion:** Khi dữ liệu trả về có status `WRITER_DONE` hoặc `BrandProfile` đã tồn tại -> Dừng Polling và thông báo Toast thành công.

---

## 5. Middleware & Interceptors (Bộ lọc dữ liệu)

Sử dụng **Axios Interceptors** để xử lý tập trung:

*   **Request Interceptor:** Tự động gắn `Authorization: Bearer <token>` vào mọi request nếu có token trong store.
*   **Response Interceptor:**
    *   Nếu nhận lỗi `401` (Unauthorized) -> Xóa token và đá User về `/login`.
    *   Nếu nhận lỗi `422` hoặc các lỗi nghiệp vụ -> Tự động ném ra một Toast Cảnh báo với `error.message` từ Backend mà không cần viết code xử lý lỗi ở từng Component.

---

## 6. Cấu Trúc Thư Mục Dữ Liệu Đề Xuất (Folder Structure)

```text
src/
  ├── api/                # Các Axios instance và cấu hình chung
  ├── hooks/              # Chứa các Custom Hooks cho Server State
  │     ├── useAuth.ts
  │     ├── useBrands.ts
  │     └── useReviewQueue.ts
  ├── store/              # Chứa các Zustand stores (current user, UI state)
  │     ├── useUserStore.ts
  │     └── useUIStore.ts
  └── types/              # Định nghĩa TypeScript interface từ Prisma schema
```

---

## 7. Xử Lý Phân Quyền Trên Frontend (Role-based Access Control)

Dựa vào role (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`) trả về từ API `GET /workspaces`:

*   **HOC/Components Bảo vệ:** Tạo component `<PermissionGuard roles={['ADMIN', 'OWNER']}>` để bao bọc các nút nhạy cảm như "Tạo Brand" hay "AI Settings". Nếu user không đủ quyền, component này sẽ ẩn nội dung hoặc disable nút bấm.
*   **Route Guard:** Chặn ở cấp Router nếu User cố tình gõ URL vào các trang Admin mà không có quyền.
