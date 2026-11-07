# MarketGenius AI v2.1 — Gợi ý nhanh bằng AI có sẵn (Tenten)

## Những thay đổi

- Người dùng nhập tên sản phẩm (tối thiểu 3 ký tự) trong **Gợi ý nhanh**.
- Một lượt gọi Gemini bằng **API Key đã cài phía máy chủ** sẽ tạo **4 template Marketing cá nhân hóa**, thay vì chỉ đối chiếu từ khóa cố định.
- Trong trường hợp xác minh Turnstile hoàn thành và tên sản phẩm ổn định, trang tự yêu cầu AI tạo mẫu; người dùng cũng có nút **Tạo 4 template bằng AI** để thực hiện lại.
- Chọn một mẫu để điền form **Chuyên sâu**: ngành hàng, mục tiêu, mức ngân sách, số tiền tham khảo, nhóm khách hàng mục tiêu, khu vực gợi ý, nội dung/điểm nổi bật cần kiểm chứng và mục tiêu 4 tuần thử nghiệm. Tất cả đều có thể chỉnh sửa.
- Không AI nào có thể biết từ tên sản phẩm: giá bán thật, doanh thu đã có, nhân sự thực tế, quyền tiếp thị tệp khách hay mức giảm giá được phép. Các trường đó **không được tự giả định**.
- AI đề xuất kênh Marketing, nhưng không tự tích ô “Kênh đang có”; người dùng phải xác nhận.
- Nếu AI có sẵn chưa cấu hình / hết hạn mức / trả lỗi, website hiện thông báo rõ và cho chọn **mẫu cơ bản không dùng AI**.
- Dùng chung giới hạn lượt khách của AI có sẵn trên Tenten; token Turnstile cho việc tạo template dùng hành động `guest_templates` riêng, không tái sử dụng token một lần của chức năng tạo 5 chiến dịch.
- Giữ nguyên khả năng tạo 5 chiến dịch, timeline 4 tuần, Shortlist, Lịch sử, Smart Planner, xuất PDF, AI cá nhân và AI có sẵn.

## Cập nhật từ v2.0.1 trên Tenten

1. Trước khi cập nhật, vào **cPanel → File Manager → `marketgenius-ai`** và sao lưu 5 file dưới đây.
2. Giải nén ZIP `MG_v21_AI_Templates_Update_Tenten.zip` vào **bên trong chính thư mục `marketgenius-ai`**, cho phép ghi đè file trùng tên. Cấu trúc sau giải nén:

   ```
   marketgenius-ai/
   ├── index.html
   ├── smart-templates.js
   ├── smart-templates.css
   ├── server.js
   └── netlify/
       └── functions/
           └── ai.js
   ```

3. Vào **Setup Node.js App → Restart**.
4. Mở trang `https://smartgear.website`, nhấn **Ctrl + Shift + R** (hoặc mở cửa sổ ẩn danh).
5. Thử **Gợi ý nhanh → iPhone 18 Pro Max 256GB → chờ xác minh → 4 template → chọn Ra mắt sản phẩm**. Kiểm tra các trường Chuyên sâu.
6. Chạy thử một chiến dịch bằng nút **Tạo 5 ý tưởng** để kiểm tra quyền AI có sẵn tiếp tục hoạt động.

## Cấu hình API

**Không cần nhập lại API Key** nếu v2.0.1 đã dùng AI có sẵn. Bản mới dùng các biến môi trường cũ của Setup Node.js App:

- `GUEST_GEMINI_API_KEY`
- `GUEST_GEMINI_MODEL`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Giữ chúng ở **cPanel**, không điền vào JS/HTML. Turnstile token được kiểm tra phía server, dùng một lần, có kiểm tra action và hostname.

## Giới hạn và chi phí

- Tạo 4 template bằng AI có sẵn là **một yêu cầu Gemini thật** và có thể tốn quota/chi phí API của chủ website. Gọi tạo 5 chiến dịch là yêu cầu thứ hai.
- Hệ thống dùng giới hạn `GUEST_IP_DAILY_LIMIT` (mặc định 10/ngày/IP) và `GUEST_DAILY_LIMIT` (mặc định 80/ngày) của backend. Đây là bảo vệ cơ bản theo tiến trình, **không phải** hạn mức phân tán hoặc cứng cho nhiều worker.
- Không tự truy cập internet để xác minh thông số sản phẩm, giá hay link TikTok. Template là **gợi ý AI**, không phải dữ liệu thị trường đã kiểm chứng.
- Trước khi triển khai thực tế, người dùng phải kiểm tra mẫu, ngân sách, nguồn lực và nội dung chưa xác minh.

## Nếu không thấy 4 template AI

- Xác nhận đang chọn **Gợi ý nhanh** và đã nhập tên sản phẩm đủ 3 ký tự.
- Kiểm tra Turnstile có hoàn tất hay không. Nếu chưa, làm theo yêu cầu xác minh.
- Nhấn **Tạo 4 template bằng AI** để yêu cầu lại.
- Nếu báo 429/hết hạn mức, chờ ngày mới hoặc điều chỉnh hạn mức/chi phí theo khả năng website.
- Kiểm tra **Setup Node.js App → Restart** và logs trong cPanel khi báo 502/503.
- Nếu vẫn dùng bản cũ, hãy xóa cache trình duyệt; `index.html` mới gọi `smart-templates.js?v=21`.

## Kiểm thử đã thực hiện

- `node --check` cho `server.js`, `netlify/functions/ai.js`, `smart-templates.js`.
- Unit test backend giả lập API Gemini và Siteverify: trả 4 mẫu, trần ngân sách, validation tên sản phẩm và action Turnstile.
- Thử giao diện trên Chromium với kết quả AI/Turnstile **mô phỏng**: chọn template điền form Chuyên sâu, dữ liệu chưa xác nhận không tự đặt; PC 1440px và Mobile 390px không có lỗi JavaScript và không bị tràn ngang trong màn hình đã thử.
- **Chưa kiểm thử bằng khóa Gemini thật trên môi trường hosting Tenten của người dùng**. Không tuyên bố đã deploy hay gọi Gemini production thành công.
