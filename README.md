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
| `GUEST_GEMINI_MODEL` | Tên model Gemini được cấp quyền sử dụng. |
| `TURNSTILE_SITE_KEY` | Public site key Cloudflare Turnstile, domain đúng. |
| `TURNSTILE_SECRET_KEY` | **Bí mật** Turnstile cho xác minh server. |
| `GUEST_IP_DAILY_LIMIT` | Số lượt dùng AI mỗi IP/ngày (mặc định 5). |
| `GUEST_DAILY_LIMIT` | Tổng số lượt dùng AI toàn website/ngày (mặc định 60). |
| `MEDIA_RESEARCH_ENABLED` | Bật/tắt nghiên cứu tham khảo media. |
| `MEDIA_GEMINI_IMAGE_SEARCH` | Cấu hình image search của Gemini. |
| `IMAGE_PROXY_SECRET` | **Bí mật** để ký URL proxy hình ảnh. |

**Cần đặt quota/budget/giới hạn chi tiêu từ phía Google trước khi bật Gemini thật.** Bộ đếm hạn mức theo ngày trong `server.js` nằm trong RAM; restart hoặc đa worker sẽ reset/không đồng bộ. Đây không phải giới hạn chi phí cứng.

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
