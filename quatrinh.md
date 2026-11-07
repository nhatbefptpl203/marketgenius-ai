# MarketGenius AI v2.3.0 — cPanel Tenten

MarketGenius AI là công cụ tạo 5 ý tưởng marketing từ brief, kèm 4 tuần triển khai, Shortlist, Lịch sử, Smart Planner và xuất PDF qua trình duyệt. Có hai chế độ: **AI có sẵn (Gemini của chủ website)** và **Demo không gọi AI**. Dữ liệu lưu cục bộ trong trình duyệt; không phải dịch vụ lưu trữ tài khoản. Không yêu cầu khách nhập API key.

## Yêu cầu
- Hosting Tenten cPanel hỗ trợ Node.js phiên bản >=20 (ưu tiên Node.js 22).
- Mã nguồn HTML/CSS/JavaScript thuần, Node.js built-in; **không có npm dependencies**.
- Node app startup file `server.js`. Không đẩy biến bí mật vào mã nguồn/web công khai.

## Cập nhật website hiện có
1. Sao lưu toàn bộ thư mục ứng dụng trên Tenten và cấu hình Environment variables trước khi ghi đè.
2. Giải nén **MG_GD4_Update_Tenten.zip** lên đúng thư mục app đang chạy, ghi đè file tương ứng. File ZIP update không chứa `.env`.
3. Trong **Setup Node.js App**, xác nhận Application startup file: `server.js`; sau đó **Restart**.
4. Vào website, Ctrl+F5 để xóa cache HTML cũ. Test trang chủ, Demo, Shortlist, Lịch sử và Smart Planner.
5. Kiểm tra `/healthz`, `/robots.txt`, `/sitemap.xml`. Kiểm tra Turnstile và AI thật trên domain HTTPS. Không sử dụng ZIP Full ghi đè cấu hình môi trường khi website đang vận hành.

## Cài đặt mới
1. Giải nén `MG_GD4_Full_Source.zip` vào ứng dụng Node.js tại cPanel.
2. Trỏ domain đúng vào ứng dụng, chọn `server.js` là startup file.
3. Đặt biến môi trường trong cPanel; restart ứng dụng.
4. Chạy kiểm tra cục bộ khi cần: `npm run check`, `npm test`, `node server.js`. Không cần chạy `npm install`.

## Biến môi trường
| Biến | Chức năng |
|---|---|
| `GUEST_GEMINI_API_KEY` | **Bí mật** Gemini API do Nhất Be sở hữu. Không đưa lên frontend. |
| `GUEST_GEMINI_MODEL` | Tùy chọn cũ, không còn dùng để khóa một model. Bản v5.9.2 ưu tiên chuỗi fallback tích hợp sẵn; không cần xóa biến đang có. |
| `TURNSTILE_SITE_KEY` | Public site key Cloudflare Turnstile, domain đúng. |
| `TURNSTILE_SECRET_KEY` | **Bí mật** Turnstile cho xác minh server. |
| `MEDIA_RESEARCH_ENABLED` | Bật/tắt nghiên cứu tham khảo media. |
| `MEDIA_GEMINI_IMAGE_SEARCH` | Cấu hình image search của Gemini. |
| `IMAGE_PROXY_SECRET` | **Bí mật** để ký URL proxy hình ảnh. |

**v5.5 đã gỡ hoàn toàn giới hạn lượt AI theo IP/ngày, toàn website/ngày và cooldown 20 giây do ứng dụng tự đặt.** Turnstile vẫn bắt buộc. Hạn mức thực tế, giá và rate limit của Gemini vẫn áp dụng; cần cấu hình ngân sách và cảnh báo chi phí tại nhà cung cấp trước khi mở AI công khai. Các giới hạn tìm nguồn ảnh/video riêng vẫn giữ để kiểm soát các dịch vụ đó.

## API và tương thích
- `GET /api/ai`: trả cấu hình guest và trạng thái khả dụng.
- `POST /api/ai` chỉ nhận các action guest được backend cho phép, từ chối action của AI cá nhân cũ.
- `GET /api/image`: proxy có chữ ký cho ảnh nghiên cứu; hoạt động trên `server.js`.
- Dữ liệu localStorage và JSON ideas cũ được giữ nguyên để mở lịch sử từ những bản trước.
- `netlify.toml` là di sản, chưa khai báo `/api/image`; **triển khai chính thức qua Node.js Tenten**, không giả định Netlify tương thích đầy đủ.
- Turnstile chỉ tải khi truy cập trang tạo chiến dịch; riêng gợi ý mẫu được tải khi UI mẫu được mở.

## Kiểm thử / xử lý lỗi
- `npm run check` kiểm tra cú pháp Node/JS; `npm test` kiểm tra dữ liệu guest và tương thích backend.
- Lỗi tải Turnstile: kiểm tra HTTPS, domain đăng ký site key, CSP, ad blocker và console.
- `AI chưa khả dụng`: kiểm tra `GUEST_GEMINI_API_KEY`, model, quota, `TURNSTILE_SECRET_KEY`, log Node.
- `404` cho đường dẫn ngoài các route chính là chủ ý.
- Font Google cần kết nối Internet; khi không tải được sẽ dùng system-ui.

## TODO(Nhất)
- Xác nhận tên chính xác model Gemini dùng trên website và ghi trong video demo.
- Xác nhận ngân sách/giới hạn chi tiêu phía Google.
- Test Turnstile/AI thật trên domain `smartgear.website` và kiểm tra kết quả 5 ý tưởng.
- Nếu triển khai lên domain/subpath khác, sửa canonical/OG/sitemap theo URL đó.

### Browser Use Cloud API v4 (tùy chọn, bản 5.1)

Nếu muốn tự tìm **ảnh + video + bài viết** cho riêng 5 chiến dịch sau khi Gemini hoàn thành, xem [HUONG_DAN_BROWSER_USE_CLOUD_5_1.md](HUONG_DAN_BROWSER_USE_CLOUD_5_1.md). Chỉ cần biến môi trường `BROWSER_USE_ENABLED=true` và `BROWSER_USE_API_KEY` tại cPanel; **không** cài thư viện Python từ GitHub. Tính năng có thể phát sinh phí, có giới hạn chi phí mỗi lượt và tự tắt khi chưa cấu hình.

### Pixabay + YouTube API (v5.2)

**Xem** [`HUONG_DAN_PIXABAY_YOUTUBE_API_5_2.md`](./HUONG_DAN_PIXABAY_YOUTUBE_API_5_2.md) để cấu hình miễn phí trên Tenten. Sau khi tạo 5 chiến dịch Gemini, trình duyệt sẽ yêu cầu máy chủ tự tìm ảnh stock Pixabay (lưu ảnh cục bộ) và video YouTube/Pixabay phù hợp từng chiến dịch. Không bắt buộc thêm npm dependency; không dùng Browser Use Cloud có phí nếu không bật biến môi trường tương ứng.

### Cập nhật v5.4 — giao diện tinh gọn
Không còn khối giải thích thuật ngữ, khối “Minh bạch về AI và dữ liệu”, banner “NỘI DUNG MẪU”, thông báo đã bổ sung ảnh/video, hoặc trang “Nguồn hình ảnh”. Backend tìm nguồn vẫn hoạt động; xem `HUONG_DAN_GIAO_DIEN_GON_5_4.md` để nâng từ v5.3.

### v5.5 — tự tạo template theo tên sản phẩm
Sau khi xác minh Turnstile, khi tên sản phẩm mới được nhập (dừng gõ khoảng 850ms), AI tự tạo 4 template. Đổi sản phẩm sẽ tạo bộ mới; nhập lại tên cũ sẽ dùng cache trình duyệt, kể cả sau F5. Nút tạo AI cho phép thử lại khi lỗi. Cache nằm trong localStorage, tối đa 24 sản phẩm. Không tự coi các thông tin AI suy đoán là dữ liệu thật.


### v5.9.2 — Gemini tự động chuyển model khi 429

- Thứ tự cố định ở máy chủ: `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` → `gemini-3.6-flash` → `gemini-3.8-flash` → `gemini-3-flash` (mã cuối theo yêu cầu; tài liệu Google ghi `gemini-3-flash-preview`).
- Nếu model hiện tại báo `429 RESOURCE_EXHAUSTED`, `503` hoặc `404` thì thử model tiếp theo; `401`, `403`, các lỗi JSON và lỗi mạng không kích hoạt đổi model.
- Dùng chung cho tạo 5 chiến dịch và tạo 4 Smart Template. JSON trả về, API, LocalStorage, CSS/HTML/JS không đổi.
- Biến `GUEST_GEMINI_MODEL` trước đây không còn quyết định ưu tiên. API key / Turnstile vẫn phải cài như trước.
- Không thể tự bảo đảm quota hoặc nâng quota dự án Google. Xem `HUONG_DAN_GEMINI_AUTO_FALLBACK_v5.9.2.md`.
