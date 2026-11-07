# MarketGenius AI v5.9.3 — Sửa model dự phòng và log chẩn đoán quota

## Sửa đổi
- Đổi tên model fallback cuối từ `gemini-3-flash` (không phải model ID chính thức) thành `gemini-3-flash-preview`.
- Khi mỗi model lỗi, máy chủ chỉ ghi tên model, HTTP status và mã lỗi đã lọc vào log; không ghi API key, brief hoặc nội dung phản hồi riêng tư.
- Giữ nguyên JSON schema đầu ra, API, HTML/CSS/JavaScript giao diện, logic LocalStorage, Shortlist, PDF, và cơ chế Turnstile.
- Không thêm package.

## Cập nhật trên cPanel Tenten
1. Sao lưu `marketgenius-ai/netlify/functions/ai.js`.
2. Giải nén ZIP Update ngay trong thư mục `marketgenius-ai`, ghi đè `netlify/functions/ai.js`.
3. Trong **Setup Node.js App**, nhấn **Restart**.
4. Thử tạo 4 Smart Template. Nếu vẫn 429, mở log lỗi ứng dụng Node.js (ví dụ `stderr.log`) và tìm các dòng `[MarketGenius] Gemini model unavailable:`. Chụp tên model và HTTP status, **che khóa bí mật**.
5. Kiểm tra [Google AI Studio rate limits](https://aistudio.google.com/usage?timeRange=last-1-day) trong **đúng project** gắn với key Tenten. Hạn mức 429 là từ Google và không thể bỏ bằng sửa JavaScript.

## Cách đọc log
- `429`: model bị hạn mức (RPM/RPD/TPM hoặc chi tiêu).
- `404`: model ID không tồn tại, hoặc project/key không truy cập được model này.
- `503`: model tạm quá tải.
- `403`: không có quyền; hệ thống dừng fallback để tránh lặp lại.

Quy định rate limits: Gemini áp dụng hạn mức theo project, không theo API key; RPD reset lúc 00:00 giờ Pacific theo tài liệu của Google.

## Kiểm thử
- `npm run check`
- `npm test`
- Chưa thể chạy Gemini thật vì không có API key, và không thể xác minh quota của project người dùng tại đây.
