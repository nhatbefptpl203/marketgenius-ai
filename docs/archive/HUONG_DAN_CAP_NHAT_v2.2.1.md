# MarketGenius AI v2.2.1 — Ảnh sản phẩm hiển thị trực tiếp

## Có gì mới?

- Giảm bộ lọc nguồn quá chặt của v2.2 khiến nhiều chiến dịch chỉ hiện ô "Chưa có ảnh đáng tin cậy".
- Lấy ảnh theo thứ tự: **ảnh trực tiếp trong kết quả tìm kiếm Gemini/Google → ảnh `og:image` từ trang sản phẩm/bài viết → Openverse/Wikimedia Commons** (nguồn ảnh công khai, không cần API Key mới).
- Ảnh được hiển thị trực tiếp bằng thẻ hình trong **5 chiến dịch**, Shortlist và phần chi tiết/PDF; nếu URL ảnh đầu bị chặn thì thử URL dự phòng tự động.
- Chỉ hiển thị ảnh từ URL HTTPS; ảnh ngoài website có thể bị chặn hotlink. Không bịa URL hoặc mặc định dùng ảnh của mẫu máy khác.
- Giữ nguyên các link TikTok và bài viết tìm được. **Không khẳng định video viral nếu không có số liệu**.
- Giữ nguyên phần sửa tiêu đề “CÁCH SỬ DỤNG NGÂN SÁCH” của v2.2.
- Không thay `server.js`, không thay API Key, không thay Turnstile, không thay cách lưu lịch sử.

## Cài trên Tenten cPanel

1. Sao lưu thư mục `marketgenius-ai` trước khi cập nhật.
2. Vào File Manager → `marketgenius-ai`.
3. Upload `MG_v221_Update_Tenten.zip` → **Extract** và ghi đè file trùng.
4. Kiểm tra có `netlify/functions/media-research.js` đúng đường dẫn (không được đưa lên thư mục gốc).
5. Vào **Setup Node.js App → Restart** vì file tìm ảnh trên backend đã được sửa.
6. Vào website và **Ctrl + Shift + R**. Tạo 5 chiến dịch **mới** bằng AI có sẵn.

## Giới hạn cần biết

- Chưa thể bảo đảm ảnh cho **mọi** sản phẩm (đặc biệt sản phẩm ít phổ biến, tên không rõ, hoặc ảnh bị website nguồn chặn). Nếu không có ảnh phù hợp, website sẽ thông báo thay vì gắn nhầm ảnh sản phẩm khác.
- Hình lấy qua Openverse/Wikimedia có thể mang giấy phép riêng; chủ website phải xem quyền sử dụng trước khi tái sử dụng cho quảng cáo hoặc đăng lại.
- Không yêu cầu nhập API Key mới, nhưng hosting phải cho phép kết nối ra Internet tới Google/Gemini, các trang sản phẩm và API công khai.
- Chiến dịch cũ trong Lịch sử/Shortlist không tự truy tìm thêm ảnh; cần tạo chiến dịch mới.
- Bài thử tự động đã đạt với phản hồi mô phỏng; chưa chạy yêu cầu thật trên hosting Tenten hoặc xác nhận hiển thị ảnh từ iPhone 18 Pro Max trên website production.
