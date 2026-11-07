# MarketGenius AI — Cập nhật Giai đoạn 3 (bản trung gian)

1. Sao lưu thư mục `marketgenius-ai` trên Tenten.
2. Nếu thực sự cần kiểm tra bản giữa các giai đoạn: upload `MG_GD3_Update_Tenten.zip` vào thư mục ứng dụng, giải nén và ghi đè các file trùng.
3. Kiểm tra `saas-design.css` cùng cấp với `index.html`; `server.js` phải là bản Giai đoạn 3 vì đã thêm route cho CSS này.
4. Vào cPanel → Setup Node.js App → Restart. Mở trình duyệt Ctrl+Shift+R.
5. Test `#create` → Demo → Shortlist/Lịch sử trước khi thử API thật.

**Khuyến nghị:** Chỉ triển khai production khi hoàn thành Giai đoạn 4 để tránh thay đổi nhiều lần và nhầm version.

Không nhập lại các biến môi trường: `GUEST_GEMINI_API_KEY`, `GUEST_GEMINI_MODEL`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `GUEST_IP_DAILY_LIMIT`, `GUEST_DAILY_LIMIT`, `MEDIA_RESEARCH_ENABLED`, `MEDIA_GEMINI_IMAGE_SEARCH`, `IMAGE_PROXY_SECRET`.
