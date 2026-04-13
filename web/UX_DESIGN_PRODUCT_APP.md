# Chi Tiết Thiết Kế UX/UI: Product App (B2B Marketing Team)

Tài liệu này đi sâu vào chi tiết trải nghiệm người dùng (UX) và thiết kế giao diện (UI) cho nhóm chức năng trọng tâm nhất của hệ thống: **Product App**. Đây là không gian làm việc hằng ngày của các nhà quản lý, biên tập viên nội dung để kiểm soát AI và phát hành bài viết.

---

## 1. Global Shell & Navigation (Bộ Khung Layout Khắp Ứng Dụng)

Layout của Product App dựa trên cấu trúc **Sidebar Navigation kết hợp Topbar (Header)** phổ biến trong các SaaS hiện đại, nhưng mang ngôn ngữ thiết kế "AI-first" bóng bẩy.

### A. Sidebar (Cột Điều Hướng Bên Trái)
*   **Trình chuyển đổi Ngữ Cảnh (Context Switcher):** Ở đỉnh Sidebar là một khối Combobox hiển thị Logo và Tên Brand hiện tại (VD: *Acme Corp*), ngay bên dưới là tên Workspace. Khi bấm vào, một Dropdown Popover xuất hiện cho phép chuyển đổi nhanh sang Brand khác hoặc tìm kiếm Workspace khác mà không cần lùi về trang ngoài cùng.
*   **Menu Items:** Thiết kế dạng danh sách đứng. Hover có hiệu ứng đổi nền (Background hover) nhẹ nhàng kết hợp thay đổi độ đậm của Font tĩnh. 
    *   Các mục ưu tiên có thông báo đính kèm "Badge" chấm đỏ hoặc đếm số ở đuôi. VD: `Review Queue [5]` (tức là có 5 bài đang đợi duyệt).
    *   Icon menu dùng hệ thống Linear icons (nét mảnh, bo tròn) để giảm độ rối rắm.
*   **Khả năng thu gọn (Collapse):** Sidebar có thể trượt mờ và thu gọn lại thành dạng chỉ Icon, kéo dãn diện tích tối đa cho màn hình soạn thảo.

### B. Header (Thanh Điều Hướng Trên)
*   **Breadcrumbs:** Nằm ở rài trái, chỉ ra rõ vị trí (`Acme Corp > Content > Review Queue`), giúp User không bị lạc.
*   **Khu Cảnh Báo (Recommendations / Trends):** Biểu tượng hình tia sét báo hiệu AI vừa phát hiện ra Trend Signal mới. Click mở khung Sidebar bên phải (Right-drawer) liệt kê các tin tức nóng.
*   **Hồ sơ User:** Nằm góc phải, click để xem role và thoát (Logout).

---

## 2. Giao diện Cốt Lõi (Các Màn Hình Chính)

### A. AI Onboarding Chat (`/b/[brandId]/onboarding`)
*Khởi tạo "Linh Hồn" cho Brand thông qua trò chuyện.*
*   **Vibe:** Không gian này mô phỏng giao diện của ChatGPT hoặc Claude nhưng tập trung 100% vào ngữ cảnh setup Brand. Rộng rãi, sạch sẽ.
*   **Animation typing (Gõ chữ):** Các câu hỏi từ AI Bot nhảy chữ tuần tự (typewriter effect) trên màn hình thay vì xuất hiện bùm một phát, giúp tạo cảm giác 'AI đang suy nghĩ và phản hồi tự nhiên'.
*   **Input Text:** Một khung Chat nổi (Floating Chatbox) nằm sát cạnh dưới màn hình, gõ phím Enter để gửi. Có báo hiệu `Generating...` trong lúc backend chờ phân tích transcript.
*   **Hiệu ứng Hoàn thành:** Sau khi Chat đi tới bước cuối cùng (API Complete kích hoạt OnboardingAnalysisJob), hệ thống bừng sáng, icon tia chớp lóe lên và một Skeleton Card của mảng `Brand Profile` (với Target Audience, Tone) đang thành hình hiện ra. 

### B. Màn hình Chiến Lược (Content Strategy Calendar - `/strategy`)
*Lên kế hoạch và thả nội dung theo dạng Lịch.*
*   **Giao diện Grid:** Hiển thị 30 ô vuông tương đương 30 ngày (hoặc dạng List tuần).
*   **Badges Màu Sắc (Chips):** Mỗi `StrategySlot` (bài viết dự kiến) hiển thị dưới dạng một dính dán nhỏ (Chip). Ví dụ: Chip Xanh Dương là `FACEBOOK`, Chip Tím là `LINKEDIN`. 
*   **Hành động Trigger AI (Generate Strategy):** Nút "Tạo Kế Hoạch 30 Ngày" nằm trên cùng. Bấm vào mở Modal nhập cấu hình (Độ phủ, số lượng...).
*   **UX Tạo Mới (Waterfall Loading):** Khi API đang generate, Lịch không bị khóa quay mòng mòng (block UI). Trái lại, các chip Skeleton mờ ảo rơi dần vào các ngày một cách ngẫu nhiên (hiệu ứng thác đổ) để biểu thị việc AI phân bổ thời gian bài viết lên lịch. 

### C. Trạm Duyệt Bài (Review Queue - `/review-queue`)
*ĐÂY LÀ KHU VỰC QUAN TRỌNG NHẤT – Nơi biên tập viên dành >80% thời gian.*
Màn hình này sử dụng bố cục **Split-screen chuyên nghiệp** (Giống các môi trường lập trình IDE) để đối chiếu thông tin. Không cuộn dài, dùng toàn bộ chiều cao Viewport.

*   **Bảng Điều Khiển Trái (Content Context - Thay đổi độ rộng):**
    *   Chứa `Brief` (Kim chỉ nam của bài viết do AI Stage A lên).
    *   Chứa nút trượt mở `Source Article` (Toàn văn bài báo gốc) bên trong một Scroll View nhỏ để crosscheck độ chính xác.
    *   Chứa thẻ nháy `Trend Signal` (nếu bài nháp được AI lồng ghép trend thời sự).
*   **Bảng Điều Khiển Phải (Draft Editor & Action):**
    *   **Editing Box:** Ô văn bản cực lớn để đọc Draft từ Stage B. Font chữ to, giãn dòng 1.6 (Line-height) giúp chống mỏi mắt. Cung cấp sẵn một nút "Copy toàn bộ" và "Live Preview" (Mở một cửa sổ điện thoại ảo mô phỏng bài này khi đăng lên Facebook/LinkedIn nó sẽ tụt dòng, hiển thị ảnh như nào).
    *   **Thanh Hành Động Dưới Cùng (Sticky Footer Action):**
        *   **[Approve] Button:** Cực to, xanh lá cây gradient. Nhấn mượt, nếu API thành công bắn một chút pháo hoa siêu nhỏ (Micro-confetti) báo hiệu năng suất làm việc, sau đó tự trượt (Slide-out) load bài nháp tiếp theo lập tức (`Next item automatically`).
        *   **[Reject] Button:** Nút ma (Ghost button) chữ đỏ. Khi nhấn, Popover mở lên với khung TextArea để Editor gõ bình luận (Reason). Gõ xong nhấn "Từ chối và Nhờ AI viết lại".
    *   *Chi tiết nhỏ:* Nếu user sửa text trực tiếp trong ô Draft, xuất hiện nhãn "Edited by human" để đánh dấu.

### D. Màn hình Xuất Bản (Publishing Jobs - `/publishing`)
*   **Vibe:** Dashboard dữ liệu khô khan bám sát tính chính xác nhưng vẫn gọn gàng.
*   **Bảng Data (Data Table):** Cột thông tin rõ ràng (Ngày lịch trình, Thumbnail nhỏ, Kênh xuất bản, Trạng thái).
*   **State indicators (Dấu hiệu Nhận biết):** 
    *   Chỉ sử dụng Biểu tượng màu thay cho Text để dễ lướt mắt (VD: Dấu Check Tròn xanh lá cho `PUBLISHED`, Đồng hồ Vàng cho `SCHEDULED`, Tam giác báo cảnh báo Đỏ cho `FAILED`).
*   **UX Sửa Lỗi (Error Handling):** Dòng `FAILED` sẽ nổi nền đỏ nhạt. Nhấp vào sẽ xổ xuống chi tiết `errorMessage` (VD: "Mạng rớt", "Hết hạn token Facebok"). Có một action button "Retry" kế bên ngay lúc đó kèm theo vòng quay tròn.

### E. Màn hình Nguồn Tin (Sources & Filters - `/sources`)
*   **Khu Vực "Master Input":** Cấu hình dòng chảy vào của nội dung.
*   **Cards giao diện RSS:** Mỗi Feed thể hiện bằng một Thẻ (Card). Chứa Favicon của trang báo đó, kèm đồ thị sóng (Moc-up Mini Chart) báo hiệu "Vẫn Đang Bơm Data Đều" (lastFetchedAt thành công/thất bại).
*   **Bộ Lọc Profile (Filter Settings Slider):** Sử dụng dạng Slider (thanh trượt kéo qua kéo lại từ 0.0 - 1.0) cho `similarityThreshold` thay vì bắt gõ số thô thiển. Kéo lên vùng 0.9 màu chuyển đỏ (Báo hiệu "Lọc Cực Dày - Rất Ít Bài Qua Lọt"), kéo về 0.4 màu chuyển xanh dương ("Bộ Lọc Dễ Quá Nhiều Bài"). UI như cách một kĩ sư âm thanh điều chỉnh EQ. 

---

## 3. Tương tác Thống nhất Xuyên Suốt Ứng Dụng (Global UX Patterns)

1.  **Nhất Quán Chế Độ Phản Hồi (Feedback Loop):** Hệ thống này chạy các workflow AI ẩn phía sau khá chậm (Có job đợi vài chục giây). Vì vậy, Toast Notification và Skeleton UI là bắt buộc. Cấm sử dụng những chiếc Spinner Toàn Màn Hình bít kín hành động của người viết. Bạn gọi API chốt Job, hãy nói "Tiến trình AI đã được xếp hàng. Bạn có thể làm việc khác" và cho họ gõ tiếp.
2.  **Khóa Tác Vụ Rủi Ro (Dangerous Actions):** Các thao tác làm `Reset` lại Draft, Update/Đổi Filter nguồn báo đều yêu cầu một Form xác nhận rủi ro viền đỏ (Destructive Modal) hoặc Double Confirm.
3.  **Shortcut Bàn Phím (Keyboard Shortcuts):**
    *   Với Màn hình Duyệt Bài (Queue), cho phép Editor dùng phím `Ctrl + Enter` (hoặc `Cmd + Enter`) để Bấm Approve tự động. `Esc` để Reject. Giúp tiết kiệm cực kỳ lớn thời gian cho một marketer một ngày duyệt 50 bài. 

---
*Văn bản mô tả thiết kế chức năng này nhắm mục tiêu tiết kiệm công sức cho kỹ sư FE, chỉ ra triết lý trải nghiệm mà dự án hướng tới.*
