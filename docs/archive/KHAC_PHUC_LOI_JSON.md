# MarketGenius AI v1.4.2.1 — Bản chẩn đoán lỗi JSON

- Mã nguồn dựa trên v1.4.2, giữ Smart Planner, 2 chế độ AI và Netlify/Turnstile.
- Sửa cách đọc HTTP phản hồi trên cả AI có sẵn và AI cá nhân. Nếu Netlify trả HTML 404/502/504 hoặc không phải JSON, website cho biết mã HTTP và nơi kiểm tra log thay vì báo thiếu Netlify Functions chung chung.
- Yêu cầu Gemini trả JSON súc tích hơn nhằm giảm nguy cơ nội dung bị cắt dở. Không bảo đảm khắc phục lỗi 429, 503, hết quota hay lỗi hosting.
- Khi AI báo 429, kiểm tra hạn mức của key/model; khi 502/504 kiểm tra Netlify → Logs → Functions → ai; khi 403 xác minh Turnstile, hostname và key.
- **Bảo mật:** Nếu Turnstile Secret đã xuất hiện trong ảnh, hãy xoay vòng (rotate) và chỉ lưu Secret mới tại Netlify; tuyệt đối không lưu key trong GitHub.
- Triển khai: cập nhật app.js, studio.js, netlify/functions/ai.js lên GitHub; Netlify tự deploy khi kết nối. Mã nguồn Full đi kèm chỉ dùng khi cần khôi phục một bộ hoàn chỉnh.
- Sau khi deploy, mở Chrome DevTools → Network → Fetch/XHR → yêu cầu `ai`, xem **Status** và Response. Không gửi API Key hoặc request body.
