# MarketGenius AI — Cài đặt trên SSD Hosting Tenten / cPanel

**Phiên bản:** v1.5 (thêm brief chuyên sâu và trang Giới thiệu) chạy trên Node.js 22.
**Tên miền đích:** `https://smartgear.website`.

## 1. Tải file lên ứng dụng Node.js

1. Trong cPanel, mở **Setup Node.js App**. Ứng dụng đã tạo cần có:
   - Node.js: `22.x`; Mode: `Production`.
   - Application root: `marketgenius-ai` (thư mục trong home cPanel, **không** phải `public_html`).
   - Application URL: `smartgear.website`, ô đường dẫn để trống.
   - Startup file: `server.js` (không phải `sever.js`).
2. Vào **File Manager → Home → marketgenius-ai**. Upload `MarketGenius_AI_Tenten_Node22_Full.zip` vào thư mục này.
3. Chuột phải ZIP → **Extract** ngay tại `marketgenius-ai`.
4. Kiểm tra các file `server.js`, `package.json`, `index.html`, `app.js`, `studio.js`, `planner.js`, `styles.css` và thư mục `netlify/functions/ai.js` nằm **cùng cấp trực tiếp** trong `marketgenius-ai`, không bị bọc thêm trong một thư mục khác.
5. Trở lại **Setup Node.js App**, nếu có nút **Run NPM Install**, bạn có thể chạy; bản này không dùng thư viện npm bên ngoài. Nhấn **Restart** để áp dụng mã nguồn mới.

## 2. Khai báo biến môi trường trong cPanel

Trong **Setup Node.js App → ứng dụng MarketGenius AI → Environment variables**, lần lượt thêm:

| Key | Value |
|---|---|
| `GUEST_GEMINI_API_KEY` | Gemini API Key của chủ website (GIỮ BÍ MẬT) |
| `GUEST_GEMINI_MODEL` | ID model có quota hợp lệ, ví dụ `gemini-2.5-flash` nếu key hỗ trợ |
| `TURNSTILE_SITE_KEY` | Site Key Cloudflare Turnstile (công khai) |
| `TURNSTILE_SECRET_KEY` | Secret Key Cloudflare Turnstile (GIỮ BÍ MẬT) |
| `GUEST_IP_DAILY_LIMIT` | Tùy chọn, mặc định `10` lượt thành công/IP/ngày |
| `GUEST_DAILY_LIMIT` | Tùy chọn, mặc định `80` lượt thành công/toàn website/ngày |

**Không** đưa khóa vào `server.js`, `index.html`, GitHub, README hoặc ảnh chụp. Sau khi thêm hoặc sửa biến, nhấn **Restart** trong cPanel. Giới hạn lượt là **trong bộ nhớ**, có thể reset khi app khởi động lại và không thay thế hạn mức/cảnh báo chi phí ở Google.

### Rất quan trọng: Cloudflare Turnstile

Widget trước đó đăng ký cho `ph67401.netlify.app`. Khi chuyển sang hosting mới, phải vào **Cloudflare Dashboard → Turnstile → widget → Hostnames**, thêm `smartgear.website` (và `www.smartgear.website` nếu sử dụng). Nếu hostname mới chưa được cho phép, chế độ AI có sẵn sẽ xác minh không thành công. **Giữ nguyên Site Key/Secret Key của widget đã cập nhật host hoặc tạo widget mới** và thay bộ khóa ở cPanel. Nếu secret từng lộ trong ảnh, hãy rotate secret rồi cập nhật.

## 3. Kiểm tra sau khi Restart

- Mở `https://smartgear.website/healthz`: phải có JSON `{"ok":true,...}`.
- Mở `https://smartgear.website/api/ai` trên trình duyệt: phải có JSON với `guestAvailable` `true` khi đủ 4 biến (nếu `false`, kiểm tra biến môi trường và tên model).
- Mở trang chủ `https://smartgear.website/`: kiểm tra hiển thị CSS, nút Demo, Shortlist, Planner.
- Kiểm tra **AI cá nhân** với API Key cá nhân còn quota.
- Kiểm tra **AI có sẵn** sau khi Cloudflare Turnstile xác minh thành công.
- Thử tạo 5 ý tưởng, lưu, xem timeline, copy và PDF.

## 4. Nếu lỗi

- `404`: kiểm tra URL ứng dụng có đặt tại root tên miền, đúng Application root và file.
- `502`/`503`: kiểm tra app đang chạy trong Setup Node.js App, file startup `server.js`, mục logs và giới hạn tài nguyên hosting.
- `JSON`/`504`: mở DevTools → Network → POST `/api/ai`, xem status; nếu Gemini trả lời chậm, cần thử model nhanh hơn hoặc liên hệ Tenten về thời gian proxy timeout. Hosting chia sẻ có thể có giới hạn xử lý riêng.
- `Turnstile 403`: xác nhận hostname `smartgear.website`, Site Key/Secret Key và hoàn tất xác minh mới.
- `429`: xem quota Google, giới hạn theo IP/ngày của ứng dụng; hai loại lỗi 429 có nguyên nhân khác nhau.
- Nếu `smartgear.website` vẫn hiện WordPress, kiểm tra ứng dụng đã gắn đúng tên miền gốc và không còn cấu hình rewrite WordPress cũ tại document root. Chỉ sửa sau khi xác định đúng file.

## 5. Ghi chú

- Phần xử lý Gemini/OpenAI được giữ từ `netlify/functions/ai.js` và dùng lại bên trong `server.js`; bạn không cần deploy Netlify.
- Để nâng cấp trong tương lai, tải mã nguồn lên đúng thư mục, rồi **Restart** ứng dụng trong cPanel. Không có quy trình tự cập nhật từ GitHub theo mặc định.
- Không xóa tên miền, email, tài khoản cPanel hay dữ liệu MySQL của ứng dụng khác.
- Dữ liệu Shortlist/lịch sử lưu bằng localStorage theo tên miền. Khi đổi từ `ph67401.netlify.app` sang `smartgear.website`, dữ liệu cũ không tự chuyển qua.
- `netlify.toml` là cấu hình dự phòng cho Netlify, cPanel không sử dụng nó.
