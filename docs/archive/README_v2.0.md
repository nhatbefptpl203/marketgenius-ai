# MarketGenius AI v2.0 — Smart Quick Templates

Phiên bản nâng cấp từ MarketGenius AI v1.9.1 chạy trên Node.js 22 / Tenten cPanel.

**Tính năng mới:** Nhập tên sản phẩm → chọn template Marketing theo ngành hàng → chuyển sang form Chuyên sâu đã được điền sẵn các đề xuất → chỉnh sửa → tạo 5 chiến dịch như trước. Hỗ trợ lưu template riêng (chỉ thông tin brief trên trình duyệt) và cảnh báo khi đổi template có thể ghi đè bản đã chỉnh sửa.

**Tương thích:** Giữ nguyên backend Node.js và API Gemini/OpenAI (`netlify/functions/ai.js` không bị thay đổi); giữ Shortlist, Lịch sử, Smart Planner, xuất PDF, Turnstile và favicon.

**Bộ mẫu chạy cục bộ:** Không tạo thêm lượt gọi AI khi đang nhập tên sản phẩm. Các mẫu không phải khẳng định về giá bán, chính sách hay đặc tính của doanh nghiệp. Người dùng phải xác minh dữ liệu trước khi nhấn tạo.

**Cài đặt:** Xem `HUONG_DAN_CAP_NHAT_TEMPLATE_v2.0.md`.
