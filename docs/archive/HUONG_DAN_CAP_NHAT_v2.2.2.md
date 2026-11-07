# MarketGenius AI v2.2.2 — Sửa lỗi ảnh sản phẩm không hiện

## Tại sao v2.2.1 vẫn không có ảnh?

Bản v2.2.1 gọi **Google Search văn bản** qua Gemini, nhận các trang bài viết, rồi thử lấy `og:image`. Google Search văn bản không trả các kết quả Google Images chuyên dụng. Kho Openverse/Wikimedia Commons cũng thiếu nhiều hình sản phẩm thương mại mới. Hơn nữa, `app.js` đã vô tình bỏ một ảnh nếu thiếu `sourceUrl` dù có `url` ảnh hợp lệ, và trình duyệt có thể bị trang nguồn chặn nhúng ảnh (hotlink).

## Bản sửa v2.2.2 làm gì?

1. Thêm **Google Image Search grounding** qua model `gemini-3.1-flash-image`, dùng **chính API key Gemini có sẵn trên Tenten** khi model được cấp quyền. Mỗi sản phẩm được tra cứu một lần, rồi gắn ảnh vào cả 5 chiến dịch (kết quả được lưu tạm trong RAM 20 phút). Có thể phát sinh phí API; xem `MEDIA_GEMINI_IMAGE_SEARCH` bên dưới.
2. Hỗ trợ tùy chọn **Serper Images API** qua `SERPER_API_KEY` do CHỦ WEBSITE cấu hình trên Tenten (không hiển thị với khách). Đây là phương án có thể dùng nếu khóa Gemini chưa được cấp quyền Image Search. Không bắt buộc để chạy website.
3. Sửa cách đọc ảnh từ website thật: theo redirect, đọc `og:image`, Twitter Image, JSON-LD Product và thẻ ảnh có tên sản phẩm. Có giới hạn kích thước, thời gian và DNS để tránh truy xuất địa chỉ nội bộ.
4. Bỏ lỗi loại ảnh chỉ vì thiếu `sourceUrl`. Ảnh vẫn hiển thị trên thẻ chiến dịch; khi có trang nguồn, bấm ảnh để mở nguồn.
5. Thêm dự phòng **ảnh cùng nguồn thông qua Tenten**: URL ảnh bên ngoài bị chặn sẽ được thử qua `/api/image` với chữ ký HMAC và thời hạn; không phải proxy công khai. Có kiểm tra DNS/IP, loại MIME và giới hạn tệp 3 MB.
6. Khi dịch vụ tìm ảnh từ chối yêu cầu (thiếu quyền API, hết hạn mức, model không hỗ trợ), hiện thông tin tương ứng, không giấu lỗi hoặc tự ghép ảnh sai sản phẩm.

## Cập nhật trên Tenten (nên dùng bản UPDATE)

1. **Sao lưu** các file đang chạy trong `marketgenius-ai` hoặc tải lại ZIP bản cũ trước khi ghi đè.
2. Trong cPanel → File Manager → `marketgenius-ai`, upload `MG_v222_Update_Tenten.zip`.
3. Nhấn **Extract**, ghi đè các file trùng. Sau khi giải nén, kiểm tra:
   - `index.html`
   - `app.js`
   - `studio.js`
   - `server.js`
   - `image-proxy.js` (**file mới**, nằm cùng cấp với `server.js`)
   - `netlify/functions/media-research.js`
4. Vào **Setup Node.js App → Restart** (bắt buộc vì sửa `server.js` và mã backend).
5. Mở trang bằng Ctrl + Shift + R. **Tạo một chiến dịch mới** bằng AI có sẵn để kiểm tra; ảnh trong kết quả/lịch sử cũ không tự được thêm lại.

**Không cần nhập lại GUEST_GEMINI_API_KEY hoặc TURNSTILE_SECRET_KEY.** Không cần `npm install` vì không dùng thư viện ngoài Node.js.

## Cấu hình TÙY CHỌN (chỉ chủ website)

| Biến môi trường | Mặc định | Công dụng |
|---|---|---|
| `MEDIA_GEMINI_IMAGE_SEARCH` | `true` | Bật/tắt 1 lần tìm ảnh có thể tính phí theo sản phẩm |
| `MEDIA_GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image` | Model hỗ trợ image-search grounding; chỉ đổi nếu chắc chắn model khác hỗ trợ |
| `SERPER_API_KEY` | Không có | Nếu có, tìm ảnh qua Google Images API độc lập với quyền Image Search của Gemini |
| `IMAGE_PROXY_SECRET` | Tự dùng khóa server có sẵn | Khóa ký URL dự phòng; không cần khai báo |
| `MEDIA_RESEARCH_ENABLED` | `true` | Bật/tắt toàn bộ phần tìm ảnh, TikTok, bài viết |

**Chi phí:** Google Image Search grounding là tính năng riêng và có thể yêu cầu tài khoản trả phí, quota hoặc model được cho phép. Bản cập nhật tự thử bằng cùng key rồi bỏ qua nếu API từ chối; không có gì bảo đảm model này được bật trên tài khoản của bạn. Nếu không muốn thêm lượt gọi model ảnh, đặt `MEDIA_GEMINI_IMAGE_SEARCH=false` và dùng ảnh từ trang sản phẩm/Serper hoặc nhập ảnh thủ công khi cần.

**Độ chính xác:** Ảnh được tìm tự động có thể khác màu/dung lượng. Kiểm tra trước khi dùng cho quảng cáo. Hình sản phẩm thực tế có quyền tác giả/giới hạn tái sử dụng; xem giấy phép hoặc xin phép nếu cần.

## Nếu vẫn trống

- Nếu ô ảnh ghi **“Tìm ảnh AI: tài khoản chưa được cấp quyền”**, khóa Gemini trên Tenten bị từ chối ở model ảnh; cần cấp quyền model đó hoặc chọn dịch vụ tìm ảnh riêng (ví dụ Serper qua biến môi trường của máy chủ).
- Nếu ô ảnh ghi **“đã hết hạn mức”**, kiểm tra quota/thanh toán Gemini.
- Nếu ô ảnh ghi **“model không hỗ trợ”**, xác nhận `MEDIA_GEMINI_IMAGE_MODEL` theo tài liệu Google.
- Nếu có URL ảnh nhưng hiện **“Không thể tải ảnh từ website bên ngoài”**, website nguồn có thể chặn nhúng hoặc chặn request từ Tenten; khi đó hãy bấm ảnh/link nguồn để kiểm tra.
- Nếu nhập một mẫu sản phẩm mới, hiếm hoặc tên không đúng, nguồn thật có thể không có ảnh. Website không dùng ảnh sai mẫu chỉ để lấp ô trống.

## Phạm vi kiểm thử

- Đã kiểm tra cú pháp Node.js và cả 4 bài thử backend tự động (Google Image Search trả ảnh, phân tích ảnh từ trang sản phẩm, HMAC/SSRF cho proxy, 5 chiến dịch).
- **Chưa thử được với Gemini key thật và website Tenten production.** Môi trường kiểm thử không truy cập được các trang bên ngoài, nên không thể cam kết ảnh thật đã hiện trên `smartgear.website`. Cần thử một chiến dịch mới sau triển khai.
