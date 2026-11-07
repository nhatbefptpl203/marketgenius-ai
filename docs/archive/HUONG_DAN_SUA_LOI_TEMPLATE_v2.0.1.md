# MarketGenius AI v2.0.1 — Sửa lỗi Template chưa điền đủ

## Những gì đã sửa

- Chọn Template: điền ngành hàng, mục tiêu, ngân sách mẫu, khách hàng gợi ý, KPI thử nghiệm, vùng triển khai ví dụ, gợi ý USP cần xác minh và trạng thái số liệu nền.
- Các mục chưa thể biết từ tên sản phẩm (giá bán, quyền sử dụng tệp khách, kênh sở hữu, ưu đãi, nhân sự thật) được đánh dấu rõ; KHÔNG tự bịa.
- Kênh gợi ý có nút **Tôi có thể triển khai các kênh này**. Chỉ sau khi người dùng đồng ý mới tích chọn.
- Các ô vàng **NỘI DUNG MẪU** không được gửi như dữ kiện thật cho AI cho đến khi người dùng sửa.
- Nguồn lực mặc định **Chưa xác định** thay vì ngầm hiểu 1 nhân sự.
- Cách tính ngân sách và 5 ý tưởng / 4 tuần / Shortlist / Smart Planner giữ nguyên.

## Cập nhật trên Tenten

1. Dùng file `MG_v201_Fix_Templates_Update.zip`.
2. Vào `cPanel > File Manager > marketgenius-ai`. Sao lưu file cũ nếu có thay đổi riêng.
3. Upload file ZIP, Extract vào đúng thư mục; ghi đè các tệp trong ZIP. Không giải nén vào thư mục con.
4. Các tệp thay đổi: `smart-templates.js`, `smart-templates.css`, `app.js`, `index.html`, `netlify/functions/ai.js`.
5. Vào `Setup Node.js App` và nhấn Restart. Không thay đổi API key/Turnstile.
6. Mở website, nhấn `Ctrl + Shift + R` để tải bản mới.

## Lưu ý

- Website chưa thể biết giá bán thật hoặc số đơn sẵn có chỉ từ tên sản phẩm. Không thể tự điền chính xác các mục đó mà không kết nối nguồn dữ liệu hoặc hỏi người dùng.
- Các trường nháp để hướng dẫn nên được sửa trước khi tạo chiến dịch.
- Đây là bản sửa mã nguồn, không tự ghi đè lên website đang chạy trên hosting.
