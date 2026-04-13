# Chi Tiết Thiết Kế UX/UI: System Admin Panel (Internal)

Khác với Product App hướng tới tính thẩm mỹ thương mại cho đội Marketing, khu vực **Internal Admin Panel** được dành riêng cho các Kỹ sư Hệ thống (System Engineers), Kỹ thuật viên AI và Quản trị viên dự án. 

Thiết kế tại đây ưu tiên **mật độ dữ liệu cao (High Data-Density), tính thực thi công cụ nhanh chóng và khả năng giám sát tài nguyên (Observability)**.

---

## 1. Ngôn Ngữ Thiết Kế (Vibe & Aesthetics)

*   **Chủ đề (Theme):** "Mission Control" / "Stealth Mode". Toàn bộ nền ưu tiên màu Đen tuyền (Pure Black `#000000`) hoặc Xám Đậm (`#111111`) tối đa để tạo tương phản cực mạnh với các màu sắc Cảnh báo (Alerts).
*   **Màu Cảnh Báo Chuẩn (Traffic Light Indicators):** 
    *   Tự động hóa rất cần chỉ dấu trạng thái: 🟢 Xanh Lục (Khỏe mạnh / Pass), 🟡 Vàng (Chậm chạp / Degraded), 🔴 Đỏ (Lỗi / Fatal), 🔵 Xanh Lam (Đang chạy Job).
*   **Typography:** Sử dụng Font chữ *Monospace* (VD: `JetBrains Mono` hoặc `Fira Code`) cho TẤT CẢ các con số, ID, cấu hình IP, và Logs. Đặc biệt là dùng cho các khối hiển thị JSON.
*   **Mật Độ Thao Tác (Density):** Thu hẹp khoảng cách padding/margin (Compact mode). Admin cần nhìn thấy 50 dòng log trên cùng một màn hình thay vì phải cuộn nhiều do thiết kế quá "rộng rãi" như Product App.

---

## 2. Global Layout (Bố Cục Toàn Nghịch)

*   **Left Sidebar (Thanh Công Cụ Kỹ Thuật):** Tối giản và chia thành 3 phân khu:
    1.  *Core Status:* Dashboard
    2.  *Pipeline Config:* Master Sources, Discovery, AI Settings.
    3.  *Observability:* System Logs, Metrics, Performance Traces.
*   **Top Header (Live Health Bar):** Thay vì để khoảng trống lớn, góc Header phải luôn ghim 3 biểu tượng chấm trạng thái Real-time (Ví dụ: `DB: 🟢 | AI API: 🟡 | Server: 🟢`). Hệ thống ping 10 giây/lần.

---

## 3. Các Phân Khu Chức Năng Cốt Lõi (Core Screens)

### A. Bảng Giám Sát Sức Khỏe (Dashboard - `/admin/dashboard`)
*Nơi nắm bắt tổng quan dự án khi vừa đăng nhập.*

*   **Top Stats (Thực Thể Sống):** 4 thẻ (Cards) hiển thị số liệu 24h qua: `Total API Calls`, `Errors Rate (%)`, `Ingestion Run Count`, `Pipeline Items Processed`. Xu hướng (Up/Down) sẽ kèm theo Sparklines (biểu đồ đường line siêu nhỏ).
*   **Node Graph (Cụm Dịch Vụ):** Thiết kế dạng ô mạng lưới. Hiển thị kết nối từ `Server <-> MongoDB / Postgres` và `Server <-> OpenRouter API`. Khi Job chạy, các đường nối sáng lên. Nếu API OpenRouter bị *Rate Limit* (429), đường node sẽ nhấp nháy đỏ liên tục báo động cấp độ cao.

### B. Quản Trị Hệ Thống Trí Tuệ Nhân Tạo (AI Settings - `/admin/ai-settings`)
*Kiểm soát trung tâm não bộ.*

*   **Toggles & Selectors:** 
    *   Giao diện gồm các Nút Gạt (Toggles) để bật/tắt thần tốc các Giai đoạn Pipeline (Ví dụ: Khi server quá tải, Admin gạt tắt nút "Stage B AI" đi để hệ thống tạm xả tải).
    *   Dropdown lists cho từng luồng: Bộ chọn loại mô hình (Model Select) liệt kê rõ ràng: `gpt-4o`, `gpt-4o-mini`, `claude-3-opus`.
*   **Phân Khu Variables:** Form input cung cấp khả năng điều chỉnh thông số System Prompt Parameters (như `similarityThreshold: 0.7`) và có hỗ trợ Validation ngay tại trường nhập. Mọi nút "Save" sau khi thành công sẽ có Toast Log nhỏ mọc lên (VD: *Successfully updated stage B to claude-3-haiku*).

### C. Quản Lý Nguồn Tin "Khai Phá" (Source Discovery - `/admin/source-discovery`)
*Nơi Admin làm nhiệm vụ "Tinder" với các Báo/Feed tìm được mới mỗi tuần.*

*   Hệ thống có tự động lùng sục Feed mới. Thay vì list table nhàm chán, khu vực này mang trải nghiệm thiết kế **"Card Swipe / Phê duyệt Nhanh"**.
*   **Giao diện "Feed Card":**
    *   Một dòng chứa *Tên Trang Web*, *Đường Dẫn Root*, và khoảng *3 Tiêu Đề Bài Viết Gần Nhất (Samples)*. 
    *   Ben cạnh là Score độ liên quan AI chấm điểm (Relevance Score từ 1 - 100).
*   **Hành Động:** Hai nút cực to: `[X] Reject` (Kèm hotkey `N`) và `[V] Approve` (Kèm hotkey `Y`). 
*   **Ý Đồ UX:** Dành cho việc một buổi sáng thứ 2, Admin chỉ cần tì tay vào bàn phím gõ phím tắt `Y` `N` để duyệt tan 100 nguồn RSS tự động thu thập từ tuần trước trong vòng 2 phút.

### D. Bảng Máy Chủ & Điểm Báo Trung Tâm Logs (System Monitoring - `/admin/monitoring`)
*Trung tâm Chẩn đoán Khám Bệnh - Giao diện cốt lõi của Devops.*

*   **Terminal Interface (Cửa sổ dòng lệnh lai):** Thiết kế mô phỏng Log Viewer chuyên nghiệp giống (DataDog, Kibana).
*   **Khối Control Bar (Trên cùng):**
    *   Lọc nhanh: Các nút check boxes bật/tắt nhanh Log Mức Độ `[ ] INFO` `[ ] DEBUG` `[ ] ERROR` (Nút Error luôn là nền đỏ báo động nếu có log chết).
    *   Thanh Tìm kiếm (Search Box): Áp dụng Regex hoặc cú pháp query.
    *   Nút Tự Cuộn (Auto-tail Switch): Công tắc bật "Luôn cuộn xuống dòng mới cập nhật".
*   **The Log Grid (Bảng dữ liệu):**
    *   Cột thời gian chi tiết tới mili-giây (`14:59:01.245`).
    *   Cột Service (Màu sắc chia riêng cho các module: Auth/Brand/Pipeline để phân biệt nhanh).
    *   **Thao Tác Nhấn (Expandable JSON):** 80% Log là JSON Payload. Thay vì in nhoe nhoét ra màn, Payload bị giấu sau nút mũi tên dải băng (`► [Payload...]`). Khi nhấp vào, thả xuống nội dung JSON được định dạng cú pháp (Syntax Highlight) hoàn chỉnh, có nút COPY TO CLIPBOARD tiện lợi bên góc.

### E. Máy Nén Trạng Thái Công Việc (Manual Pipeline Triggers)
*Quyền năng của ngón tay.*

Do Admin có khả năng điều khiển các Pipeline theo kiểu "Bấm nút bắt chúng chạy ngay lập tức", nên có một phân khu chứa các nút **"Run Job Manually"**. Mỗi nút (`[Force Ingest]`, `[Force Filter]`) yêu cầu một *Modal Double-Confirm*: "Hành động này có nguy cơ tiêu tốn 100K token OpenRouter 1 lúc. Bạn chắc chứ?" để dẹp bỏ tính vội vàng.

---

### UX Điểm Mấu Chốt 
*(Sự khác biệt giữa làm "ứng dụng thường" và làm "ứng dụng kĩ thuật")*

1.  **Hotkey Tối Đa:** Giao diện Kỹ thuật không dùng chuột nhiều. Đủ Shortcut cho màn hình Logs (`/` để search, `G` xuống cuối file) hoặc màn hình Source.
2.  **Toàn Trí Trực Quan Dữ Liệu Lỗi (Observability over aesthetics):** Dấu vết thất bại Pipeline không được giấu trong hộp thoại, nó phải được in đậm hoặc gạch dưới cảnh cáo thẳng trong các Data Tables, giúp người xem khoanh vùng vấn đề hệ thống trong vòng 5 giây tiếp cận.
