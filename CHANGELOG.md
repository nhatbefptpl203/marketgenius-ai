## v5.9.2 — Gemini quota auto-fallback (2026-11-07)
- Server-owned ordered models: 3.5 Flash-Lite, 3.1 Flash-Lite, 3.6 Flash, 3.8 Flash, 3 Flash.
- 429/RESOURCE_EXHAUSTED, temporary 503 and missing-model 404 advance to the next model for campaign generation and Smart Templates.
- Stop on non-quota errors; preserve existing JSON response/error fields, Turnstile, Google image research, LocalStorage and all frontend.
- Do not send unsupported `temperature` option to Gemini 3.8 Flash.
- Add simulated fallback tests and adjust legacy 429 test; no dependencies.

## MarketGenius AI v5.9 — Menu & Share

- Làm nổi bật nút Thao tác của Idea Card (fix icon trống).
- Gửi tóm tắt chiến dịch riêng lẻ qua Telegram Share; Zalo native share hoặc clipboard + Zalo Web.
- Bổ sung Zalo/Telegram ở Modal chi tiết. Không đổi API, dữ liệu hay logic lưu.

## v5.5 — Auto templates per product; remove site-owned daily Gemini limits (2026-11-07)
- Removing the site-imposed per-IP daily cap, site-wide daily cap, and 20-second cooldown in `server.js` (not merely hiding the red message).
- `GET /api/ai` availability no longer turns off after reaching site counters. Turnstile remains mandatory for every real Gemini request.
- Entering a new product name automatically requests 4 new AI templates once the Turnstile verification is valid. Returning to an old product uses the browser cache (also after refresh); unchanged name never auto-calls AI again.
- Debounces rapid typing, avoids stale suggestions after product changes, and handles A->B while request A is still in flight.
- Provider-side Gemini rate limits/charges are unaffected; cloud budget controls remain the owner's responsibility.

# Changelog

## 2.3.0 (Giai đoạn 4/4, 2026-11-07)
- Hero trang chủ thay minh họa 3D bằng chiến dịch mẫu phẳng, không biểu thị số liệu thực.
- Builder có bản xem trước skeleton rõ ràng là mẫu.
- Timeline mỗi ý tưởng tóm tắt nhiệm vụ từng tuần, thể hiện trạng thái hoàn thành.
- Menu ⋮ cho chỉnh sửa/PDF/sao chép/xóa; giữ nguyên `data-action`/`data-id`.
- Lịch sử thành danh sách phẳng; giữ restore/PDF/delete và tương thích nguồn cũ.
- Turnstile light, lazy-load, ẩn widget sau xác minh và hiện lại khi reset/hết hạn.
- Server: gzip/brotli, cache theo version, CSP, HTML 404, robots/sitemap/manifest.
- Biểu tượng WebP nhỏ hơn; chuẩn hóa version tài nguyên CSS/JS.
- Dọn tài liệu lịch sử vào `docs/archive`; thêm kiểm thử stage 4.

## 2.3.0-stage3
- SaaS tokens, trang sáng, không gradient; thống nhất font Be Vietnam Pro; icon nghiệp vụ.

## 2.3.0-stage2
- Điều hướng hash, menu mobile, kiểm thử route.

## 2.3.0-stage1
- Gỡ UI và endpoint AI cá nhân; chỉ AI có sẵn + Demo; sửa hạn mức/cooldown và test.

## 5.1 — Browser Use Cloud API v4, máy chủ Tenten
- Có thêm `browser-use-cloud.js` và `browser-use-client.js` (không cần npm).
- Tích hợp API v4 `POST /runs`, `GET /runs/{id}/status`, `GET /runs/{id}`, `POST /runs/{id}/cancel`.
- Kết quả Gemini hiển thị trước; Browser Use tìm ảnh/video/bài viết cho 5 chiến dịch sau đó.
- Lọc URL an toàn; bảo toàn nguồn theo từng chiến dịch trong lịch sử/shortlist.
- API key chỉ ở biến môi trường server, có vé một lần sau Turnstile + Gemini và giới hạn ngân sách/lượt.
- Có nút dừng và thông báo nguồn Cloud; nếu tắt, website giữ nguyên chức năng 4.9.

## 5.2 — Pixabay + YouTube Free Media (2026-11-07)

- Tự tìm ảnh và video minh họa theo 5 hướng chiến dịch qua Pixabay; tìm video review/hướng dẫn có URL thật qua YouTube Data API v3.
- Khóa API cấu hình qua cPanel (server-only), có status endpoint không trả key; vé một lần sau Gemini + giới hạn lượt mỗi ngày/IP.
- Ảnh Pixabay được tải về bộ nhớ đĩa của ứng dụng và phục vụ bằng URL cùng miền; cache JSON Pixabay 24h, giới hạn tổng dung lượng ảnh có thể cấu hình.
- Cập nhật nguồn vào 5 thẻ chiến dịch, shortlist và lịch sử; không cần tải ảnh lên thủ công.
- Giữ Browser Use Cloud 5.1 là tùy chọn nhưng ưu tiên Pixabay/YouTube khi có key miễn phí. Khuyên tắt Browser Use để tránh phí.
- Thêm hướng dẫn `HUONG_DAN_PIXABAY_YOUTUBE_API_5_2.md` và các bài test mock/hỗ trợ Chromium.

## v5.4 — Tinh gọn giao diện (7/11/2026)
- Ẩn các banner/khối giải thích mà chủ website yêu cầu bỏ.
- Gỡ trang Nguồn hình ảnh và menu truy cập; giữ backend tích hợp nguồn tự động.
- Giữ bảo vệ trường template chưa xác minh, loại khỏi brief gửi AI.
- Bộ kiểm thử giao diện v5.4 cho sự thay đổi này.
