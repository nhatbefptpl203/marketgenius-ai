# CẤU HÌNH AI CÓ SẴN – MARKETGENIUS AI v1.4.2

Website có 2 chế độ sử dụng AI thật và 1 chế độ DEMO:

- **AI có sẵn:** khách dùng AI Gemini do Nhất Be cấu hình, không cần nhập key. Hệ thống yêu cầu xác minh Cloudflare Turnstile để giảm lạm dụng.
- **AI cá nhân:** khách nhập Gemini hoặc OpenAI API Key của họ, tải/xác minh model như bản v1.4.1.
- **Thử demo:** mô phỏng chiến dịch mà không gọi AI.

## 1. Chuẩn bị khóa và model

Truy cập https://aistudio.google.com/apikey, chọn một API Key Gemini có hạn mức. Kiểm tra model hoạt động thực tế trên trang (chẳng hạn `gemini-2.5-flash` **nếu tài khoản được hỗ trợ**). **Không gửi API Key vào chat, GitHub, README hoặc hình ảnh.** Nếu đã lỡ chia sẻ, hãy thu hồi và tạo khóa mới.

## 2. Tạo xác minh chống bot (Cloudflare Turnstile)

Truy cập https://dash.cloudflare.com/ → Turnstile → Add widget. Điền hostname `ph67401.netlify.app` (và tên miền riêng nếu có), sao chép Sitekey và Secret key. Cloudflare yêu cầu xác minh token phía máy chủ, mã nguồn đã thực hiện việc này.

## 3. Cấu hình 4 biến trên Netlify

Vào Netlify → dự án `ph67401` → **Project configuration → Environment variables → Add variable**. Thêm:

| Tên biến | Giá trị bạn tự điền | Có phải bí mật? |
|---|---|---|
| `GUEST_GEMINI_API_KEY` | API Key Gemini của **chủ website** | **Có** |
| `GUEST_GEMINI_MODEL` | ID model đã thử thành công, ví dụ `gemini-2.5-flash` | Không |
| `TURNSTILE_SITE_KEY` | Sitekey Cloudflare cho domain website | Không |
| `TURNSTILE_SECRET_KEY` | Secret Cloudflare Turnstile | **Có** |

Giữ biến ở phạm vi **Functions** hoặc **All**, không ghi biến bí mật vào `netlify.toml`. Sau khi lưu biến, vào Deploys → **Trigger deploy → Deploy project** (hoặc cập nhật commit) để Netlify nhận biến mới.

## 4. Cập nhật GitHub

Tải gói cập nhật, giữ cấu trúc thư mục đúng. Các file cần thay là:

- `index.html`
- `styles.css`
- `app.js`
- `studio.js`
- `netlify/functions/ai.js`
- `README.md` (đã đồng bộ phiên bản v1.4.2)

**Không xóa** `planner.js` và `netlify.toml`. Trên GitHub, tải file đúng cấu trúc, Commit changes, Netlify tự triển khai nếu đã kết nối.

## 5. Kiểm tra lần cuối

1. Mở website: mặc định **AI có sẵn**. Nếu thiếu một trong 4 biến, giao diện hiển thị "chưa cấu hình" và không thể dùng key của chủ website.
2. Xác minh Turnstile, điền brief và nhấn **Tạo 5 ý tưởng**. Kết quả phải gắn nhãn **AI CÓ SẴN · GEMINI**.
3. Đổi sang **AI cá nhân**; thử nhập key riêng, tải và xác minh model, tạo ý tưởng như cũ.
4. Nhấn **Thử demo** để kiểm tra không gọi API.
5. Thử Shortlist, Smart Planner, lịch sử và xuất PDF.

## 6. Quản lý rủi ro phí và hạn mức

**Cực kỳ quan trọng:** mọi lần khách dùng **AI có sẵn** sẽ tiêu thụ quota/chi phí của chủ website. Turnstile chỉ hạn chế bot, **không phải** giới hạn số lượt mỗi người. Trước khi công khai, hãy đặt hạn mức/budget Google, theo dõi việc sử dụng và bổ sung giới hạn số lượt theo IP/tài khoản bằng dữ liệu lưu bền (KV, DB hoặc WAF). Khi chưa đủ biện pháp, có thể tạm **xóa `GUEST_GEMINI_API_KEY` khỏi Netlify và redeploy** để tắt AI có sẵn; hai chế độ còn lại vẫn hoạt động.

Key của người dùng vẫn chỉ được giữ trong bộ nhớ tab; key của chủ site chỉ nằm ở server Netlify. Không đặt các khóa bí mật ở JS phía trình duyệt.
