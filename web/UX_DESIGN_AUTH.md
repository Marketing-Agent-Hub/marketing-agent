# Chi Tiết Thiết Kế UX/UI: Module Auth & Các Route Cấp Nhất (Public)

Tài liệu này mô tả chi tiết ngôn ngữ thiết kế, luồng tương tác và trạng thái giao diện cho khu vực đăng nhập, đăng ký của người dùng cuối (B2B Marketing Team) và cổng đăng nhập của quản trị viên hệ thống (System Admin).

---

## 1. Phong Cách & Cảm Hứng Thiết Kế Nhìn Chung (Aesthetics)

Dự án OC News Bot là một công cụ AI tiên tiến. Vì vậy, ấn tượng đầu tiên tại màn hình Auth phải mang lại cảm giác **"Premium, AI-driven, và Hiện đại"**.

*   **Chủ đề (Theme):** Bố cục Màn đêm (Dark Mode) làm chủ đạo với các dải màu Gradient Glowing (như Xanh ngọc bích `#00F2FE` phối Tím vô cực `#4FACFE`) để tạo điểm nhấn thị giác.
*   **Vật liệu:** Áp dụng phong cách **Glassmorphism** (kính mờ) cho các vùng chứa Form, giúp các khối nổi bật trên nền động phía sau mà không bị thô cứng.
*   **Typography:** Google Font `Inter` (cho văn bản rành mạch) kết hợp `Outfit` (cho các Tiêu đề/Heading để mang lại nét sắc sảo, tự tin).
*   **Hiệu ứng (Micro-animations):** 
    *   Các thành phần (Nút bấm, form) phải có chuyển động mượt mà (Ease-in-out) từ 0.2s - 0.3s.
    *   Nền tảng phía sau (Background mesh) nên là một dải màu gradient từ từ chuyển động vòng quanh hoặc một hình khối 3D trôi nhẹ theo thời gian (ambient movement) khiến trang không bao giờ trông bị "chết".

---

## 2. Layout Chuẩn Cho Các Trang Auth (Product App)

Màn hình `/login` và `/register` sẽ dùng chung một cấu trúc Layout dạng **Splitscreen (Chẻ đôi màn hình) theo tỉ lệ 5.5 : 4.5**.

### Nửa Màn Hình Trái: Khu Khơi Gợi Giá Trị (Value Proposition Area)
*   **Thành phần:** Một Carousel hoặc khối tĩnh mờ hiển thị các Key Visuals (Hình ảnh minh họa UI của Dashboard ảo, luồng sơ đồ AI tự động viết bài).
*   **UX Cốt lõi:** Thay vì để trống, khu vực này trình diễn các lợi ích "Auto Curate, Gen-AI Writing, Safe Posting", xoay vòng với hiệu ứng Fade-in nhẹ nhàng. Giữa khu vực nên có biểu tượng Robot hoặc Logo ứng dụng nổi bật.
*   **Màu sắc:** Phủ một lớp màu gradient bóng mờ để nội dung hòa lẫn vào background động.

### Nửa Màn Hình Phải: Khu Vực Tương Tác (The Action Area)
*   Nền xám đậm hoặc trong suốt kính mờ (Backdrop filter blur: 15px).
*   Giao diện Form tập trung ở giữa, canh lề hoàn hảo (Pixel perfect), thoáng đãng để user tập trung duy nhất vào việc điền thông tin.

---

## 3. UI/UX Chi Tiết Từng Màn Hình

### A. Giao diện Đăng Nhập (`/login`)

**Thành phần hiển thị:**
*   **Heading:** "Chào mừng trở lại" kèm một sub-text nhỏ "Đăng nhập để điều khiển hệ thống nội dung AI của bạn".
*   **Input Email & Password:** 
    *   *UX Tương tác:* Trạng thái mặc định viền nhạt. Khi user click (Focus), viền Input đổi sang phát sáng nhẹ (Glow) màu primary, label text trượt lên trên (Floating Label).
    *   *Mật khẩu:* Bắt buộc có biểu tượng Mắt (Conceal/Reveal). Khi bấm, các bóng tròn (bullet) chuyển thành chữ với hiệu ứng cuộn text.
*   **Link quên mật khẩu:** Nằm đối diện nút "Lưu phiên đăng nhập", hover hiện gạch ngang tinh tế.
*   **Nút Submit (Đăng Nhập):**
    *   Kích thước lớn, tràn ngang (Full-width), màu nền Gradient hoặc xanh dạ quang nổi bật so với phần kính mờ.
    *   *UX Xử lý (Loading):* Khi nhấn đăng nhập (Call API `/api/accounts/login`), nút KHÔNG thể nhấn lần 2 (Disable state). Chữ "Đăng nhập" sụt mờ đi, xuất hiện vòng xoay (Spinner) hoặc các chấm lẩy bẩy (Bounce dots).
*   **Điều hướng phụ:** "Bạn chưa có tài khoản? Đăng ký ngay".

**Kịch bản Xử lý Lỗi (Error Handling):**
*   Nếu sai thông tin: Form bị Rung nhẹ (Shake Animation - cảm quan vật lý quen thuộc) → Báo lỗi Text màu Đỏ Neon dưới Input Password (VD: "Tài khoản hoặc mật khẩu không chính xác").
*   Nếu lỗi mạng (500 Error): Toast Notification xổ xuống từ góc trên-phải, cảnh báo "Không thể kết nối máy chủ, đang thử lại".

---

### B. Giao diện Đăng Ký (`/register`)

**Thành phần hiển thị:**
*   Kế thừa Layout và Vibe từ trang Đăng nhập nhưng Form sẽ dài hơn 1 Input.
*   **Các Input:** Tên hiển thị (Name), Email, Password.
*   **Tính năng đặc biệt (Password Strength Indicator):**
    *   Khi người dùng đang gõ password, ngay bên dưới Input sẽ mọc ra một thanh đo lường sức mạnh (Một dải màu kéo dài chia làm 3 vạch).
    *   *Luồng:* Nhập yếu -> vạch 1 màu Đỏ. Trung bình -> vạch 2 màu Vàng. Mạnh -> Full vạch màu Xanh Lục Neon. Giúp User tự tin tạo mật khẩu đạt tiêu chuẩn.
*   **Nút Submit (Tạo Tài Khoản):** Hiệu ứng bấm tương đương nút Login.

**Kịch bản Thành Công (Success Transition):**
*   Khi API Register trả về JWT Token và User Info thành công. Giao diện không bị chớp hay giật sang trang Workspaces ngay.
*   *Trải nghiệm chuyển tiếp (Seamless Experience):* Nút bấm hiện dấu Check-mark ✅ -> Một màng lưới mờ dần bao phủ màn hình Auth -> Chuyển hướng sang màn `/workspaces` bằng một hiệu ứng trượt hoặc mở mờ (Skeleton loading khu vực Workspace xuất hiện êm ái).

---

### C. Giao diện Đăng Nhập Của System Admin (`/admin/login`)

Do Admin Panel dùng luồng token riêng (API: `/api/internal/auth/login`) và dành cho kỹ sư kĩ thuật, giao diện này phải "chủ ý" trông khác hẳn Product App để không gây nhầm lẫn.

*   **Vibe (Không gian):** Trông giống một công cụ Monitor hoặc Terminal tàng hình (Stealth/Hacker Mode). Nền đen sâu (Pure Black `#000000`).
*   **Typography:** Ưu tiên font Monospace (như Roboto Mono hoặc JetBrains Mono) màu Đỏ/Cam hoặc Xanh Lục.
*   **Layout:** Form trung tâm, đóng khung viền cam cảnh báo mỏng (Border: 1px solid #FF5500). Ghi chú to rõ "TRICTLY RESTRICTED - INTERNAL SYSTEM DASHBOARD".
*   **UX Interactions:** Đơn giản hóa, không Glassmorphism. Chỉ tập trung vào gõ nhanh và Enter để vào Console.
*   **Cảnh báo lỗi an ninh:** Nếu nhập sai, không rung nhấp nháy dễ thương mà hiện một dòng text terminal kiểu: `[AUTH INCORRECT] Denied count: 1...`.

---

## 4. Xử Lý Các Trạng Thái Vòng Đời Phiên Người Dùng (Session Lifecycle)

Ngoài trang tĩnh, trải nghiệm UX còn được định đoạt bởi cách Auth tương tác ở background:

1.  **Tính năng Tự Đăng Nhập (Auto-Redirect):** 
    *   Nếu User vẫn còn JWT Token trên trình duyệt (trong Cookies/Local Storage) và có bản ghi ở Cache. Khi User truy cập `/login` hoặc Website root `/`, ngay lập tức hiển thị một Logo Loader ở giữa màn hình (trong 0.5 giây) và Redirect thẳng vào `/w/[workspaceId]/brands` gần nhất. Không được nháy qua trang Login rồi mới chuyển sang trong chớp mắt (tránh lỗi Flash of Login Page).
2.  **Thông Báo Khi Bị Kích Xuất (Token Expired):**
    *   Nếu hệ thống kiểm tra JWT chết/expired hoặc lỗi phân quyền `401 / 403` trong lúc đang lướt nội dung, ứng dụng sẽ đẩy User về thẳng trang `/login`. 
    *   Lúc này trang Login cần hiện một Toast cực mượt (Slide từ phía dưới lên hoặc góc trên xuống) với nội dung: *"Phiên làm việc đã hết hạn vì lý do bảo mật. Vui lòng đăng nhập lại."*
3.  **Lưu Intent URL:**
    *   Nếu một Editor nhận được link bài Brief cần review (`/b/1/content/review/5`) từ email, nhưng chưa login. Trang đẩy về Login, sau khi gõ đúng Email/Pass thì đẩy ngược về chính Link Detail kia, chứ không đẩy về Homepage gây cụt hứng.
