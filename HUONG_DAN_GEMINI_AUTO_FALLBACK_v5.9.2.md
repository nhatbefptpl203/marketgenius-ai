# MarketGenius AI v5.9.2 — Hướng dẫn cập nhật Gemini Auto-Fallback

## Mục đích

Sửa trực tiếp từ **v5.9.1** trên cPanel Tenten. Không thay đổi HTML/CSS/JavaScript giao diện, JSON schema đầu ra, Shortlist, Lịch sử, PDF, ảnh/video hay LocalStorage.

Lượt tạo 5 chiến dịch và lượt tạo 4 Smart Template đều có cơ chế tự chuyển model. Khi model trước gặp `429 RESOURCE_EXHAUSTED` (hết quota/nghẽn), `503` (quá tải tạm thời) hoặc `404` (model không được tài khoản hỗ trợ), máy chủ sẽ gọi model tiếp theo **ngay, không chờ 20 giây**. Lỗi xác thực 401/403, lỗi cấu trúc JSON và lỗi kết nối mạng không kích hoạt chuyển model. JSON lỗi gửi về frontend vẫn theo định dạng cũ.

Thứ tự cố định:

1. `gemini-3.5-flash-lite`
2. `gemini-3.1-flash-lite`
3. `gemini-3.6-flash`
4. `gemini-3.8-flash`
5. `gemini-3-flash` (đúng theo yêu cầu; Google hiện liệt kê `gemini-3-flash-preview`, vì thế mã cuối có thể 404 và tự báo lỗi theo quy tắc)

### Nâng cấp bản Update (website đang chạy v5.9.1)

1. Vào **cPanel → File Manager → marketgenius-ai**. Sao lưu `netlify/functions/ai.js` và `package.json` cùng thư mục `tests` trước khi ghi đè.
2. Upload `MG_v592_Gemini_AutoFallback_Update_Tenten.zip` rồi **Extract** ngay trong thư mục `marketgenius-ai`. Bảo đảm sau giải nén có **`marketgenius-ai/netlify/functions/ai.js`**, không có thư mục lồng `marketgenius-ai/marketgenius-ai`.
3. Trong **Setup Node.js App**, kiểm tra `Application root = marketgenius-ai`, `Startup file = server.js` (vẫn giữ nguyên).
4. **Environment variables**: chỉ cần giữ `GUEST_GEMINI_API_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. Biến `GUEST_GEMINI_MODEL` cũ nếu còn cũng **không chi phối** danh sách ưu tiên, có thể giữ nguyên. Không ghi API key vào mã nguồn hoặc chia sẻ ảnh chứa key.
5. Bấm **SAVE** nếu có thay đổi rồi **RESTART** ứng dụng.
6. Mở `https://smartgear.website/api/ai`: `guestModel` sẽ là `gemini-3.5-flash-lite` và `guestAvailable` phải `true` khi đã đủ key/Turnstile. Đây chỉ là kiểm tra cấu hình, không chứng minh tài khoản có quota.
7. Tạo một bộ mẫu và 5 chiến dịch bằng Gemini thật. Nếu toàn bộ model hết quota, hệ thống vẫn báo lỗi 429; không vượt được quota Google.

Không cần `npm install` hay kết nối thêm dịch vụ; bản Update không chứa khóa API. Muốn tự kiểm chứng mã nguồn trên máy chủ có Terminal: `npm run check` và `npm test`.

### Các giới hạn cần hiểu

- RPD/RPM/TPM được Google áp dụng theo **project/tier**, không phải do website tự tăng được. Một project bị khóa chi tiêu, billing hoặc quota chung có thể khiến tất cả model trả 429. Không thể đảm bảo mỗi tài khoản có 500 RPD; xem hạn mức tại Google AI Studio.
- Mỗi lần chuyển model tạo thêm **một lượt gọi API**; nếu có phí, có thể làm tăng chi phí. Không dùng nhiều API key để né chính sách hạn mức.
- Khi tất cả model hết quota, không thể tạo nội dung thật; Demo vẫn không cần Gemini.
- `gemini-3.8-flash` không nhận `temperature` kiểu cũ; bản này chủ động bỏ trường đó với riêng model 3.8.
- 5 model được thử **tối đa một lượt cho mỗi model** (riêng kết quả JSON lỗi có quy trình retry một lần của bản gốc). Trường hợp lỗi kết nối kéo dài có thể vẫn chạm giới hạn thời gian của hosting.

### Kiểm thử đã thực hiện

- `npm run check`: PASS
- `npm test`: 17 nhóm PASS, kể cả thử bằng phản hồi HTTP giả lập: 429 → model kế tiếp; 503 → model kế tiếp; 404 → model kế tiếp; 401/403 không fallback; 4 Smart Template; 5 chiến dịch, giữ schema; 429 toàn bộ; giữ bí mật key.
- HTTP nội bộ `GET /api/ai`: đúng 4 trường cũ và `guestModel = gemini-3.5-flash-lite`.
- Chưa thể kiểm thử bằng **API key thật và quota của tài khoản bạn** trên Tenten. Không có key thật nào được đưa vào file ZIP.
