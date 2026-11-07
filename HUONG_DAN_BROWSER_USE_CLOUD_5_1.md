# MARKETGENIUS AI — Browser Use Cloud API v4 (bản 5.1)

**Đã tích hợp code vào bản 4.9 có thanh tiến trình và tự tìm ảnh.** Để kích hoạt, quản trị viên chỉ thêm API key trong **cPanel Setup Node.js App**. Không cần cài Python, Chromium, npm package hoặc thêm API key vào giao diện công khai.

## 1. Chuẩn bị API key

1. Mở https://cloud.browser-use.com/ và đăng nhập/đăng ký.
2. Vào https://cloud.browser-use.com/new-api-key để tạo API key. **Đừng gửi key qua chat hoặc chụp ảnh key.**
3. Xem số dư/tín dụng và thiết lập **giới hạn chi tiêu tại Browser Use Cloud** nếu dịch vụ của bạn hỗ trợ. API này có chi phí; tự động tìm nguồn trên mỗi lần tạo AI sẽ dùng tín dụng.

Nguồn tài liệu: https://docs.browser-use.com/cloud/api-v4 và https://docs.browser-use.com/cloud/openapi/v4.json

## 2. Cập nhật source vào Tenten

- Nếu website đang ở **bản 4.9**: sao lưu toàn bộ thư mục ứng dụng, upload `MG_GD4_BrowserUse_5_1_Update_Tenten.zip` vào **application root** rồi giải nén ghi đè các file, giữ nguyên các thư mục (`netlify/functions`, `tests` nếu có).
- Nếu website đang ở bản cũ hơn hoặc từng chép nhiều bản sửa: sao lưu và triển khai `MG_GD4_BrowserUse_5_1_Full_Source.zip` vào một **thư mục app sạch**. Giữ lại các biến môi trường Gemini + Turnstile hiện đang dùng.
- **Không dùng lại file** `browser-use-main.zip` ở hosting Tenten: đó là thư viện chạy Python cục bộ, không phải Cloud REST API.
- Website dùng Node.js >=20, không cần chạy `npm install`.

## 3. Cấu hình cPanel

Mở **cPanel → Setup Node.js App → chọn ứng dụng MarketGenius AI → Environment variables → Add Variable** rồi nhập:

| Tên biến | Giá trị ví dụ | Ý nghĩa |
| --- | --- | --- |
| `BROWSER_USE_ENABLED` | `true` | Bật tìm nguồn Cloud sau khi Gemini tạo xong 5 chiến dịch |
| `BROWSER_USE_API_KEY` | **key riêng của bạn** | **Chỉ nhập ở server**, không đưa lên GitHub hay file index.html |
| `BROWSER_USE_MAX_COST_USD` | `0.50` | Giới hạn **model/search** USD cho **mỗi lượt**; browser/proxy có thể tính riêng |
| `BROWSER_USE_DAILY_LIMIT` | `8` | Tối đa 8 lượt tìm nguồn/ngày trên tiến trình Node |
| `BROWSER_USE_IP_DAILY_LIMIT` | `2` | Tối đa 2 lượt tìm nguồn/IP/ngày |
| `BROWSER_USE_CONCURRENCY` | `1` | Chỉ một lượt tìm nguồn chạy đồng thời |
| `BROWSER_USE_TIMEOUT_SECONDS` | `240` | Đợi tối đa 4 phút rồi gửi yêu cầu hủy Cloud |

**Quan trọng:** Để giới hạn hóa đơn thực sự, đặt ngưỡng chi tiêu ngay trên tài khoản Browser Use. Các giới hạn tại app được lưu trong bộ nhớ tiến trình, không phải hạn mức bền vững nếu bạn chạy nhiều worker/restart. `BROWSER_USE_MAX_COST_USD` hạn chế phí model/search của Cloud Run, không bảo đảm giới hạn tất cả chi phí browser/proxy.

Giữ nguyên cấu hình `GUEST_GEMINI_API_KEY`, `GUEST_GEMINI_MODEL`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` đã chạy ổn. Tránh ghi API key vào file nguồn.

**Save** biến môi trường → **Restart** ứng dụng Node.js. Mở website và nhấn `Ctrl + F5`.

## 4. Cách sử dụng

1. Điền brief sản phẩm, xác minh Turnstile, nhấn **Tạo 5 ý tưởng**.
2. Khi Gemini trả về 5 chiến dịch, chúng hiện ngay. Phía dưới tiêu đề kết quả xuất hiện trạng thái **Browser Use đang duyệt web ...**.
3. Trong khi bạn vẫn có thể đọc, lưu, xuất PDF các chiến dịch, máy chủ tạo **1 lượt Cloud** tìm tối đa **5 ảnh + 5 video + 5 bài viết**, mỗi bộ theo góc nội dung của một chiến dịch.
4. Khi Cloud trả kết quả hợp lệ, ảnh/video/bài viết được ghép vào các thẻ theo từng chiến dịch, cùng nguồn. Kết quả được cập nhật trong **Lịch sử trên trình duyệt**.
5. Nếu không tìm thấy ảnh sản phẩm chính xác, hình có thể là **ảnh minh họa**. Hãy kiểm tra quyền sử dụng và độ chính xác trước khi đăng quảng cáo.
6. Nhấn **Dừng tìm nguồn** để gửi yêu cầu hủy phần tìm kiếm; 5 chiến dịch Gemini vẫn giữ nguyên.

### Bài thử nghiệm sau triển khai

- `GET https://tenmiencuaban/healthz` phải trả `ok:true`. Tên miền cụ thể của bạn thay vào URL.
- Mở DevTools → Network, sau khi Gemini thành công sẽ có `POST /api/browser-use/start` và `POST /api/browser-use/status` (mỗi ~4 giây). **Không có API key trong Request Payload/Response**.
- Nếu `start` báo 503: kiểm tra `BROWSER_USE_ENABLED`, `BROWSER_USE_API_KEY` và restart.
- Nếu 401/403: key không hợp lệ/không có quyền Cloud v4; kiểm tra trang quản lý API key.
- Nếu 402: số dư hoặc giới hạn chi tiêu Cloud đã hết.
- Nếu 429: đạt giới hạn cục bộ hoặc nhà cung cấp đang hạn chế.
- Nếu trả về 0 hình/video: công cụ không tìm được **nguồn thực đủ tin cậy** hoặc ngân sách Cloud chưa đủ; hãy tăng nhẹ ngân sách và kiểm tra thông tin nguồn, không tự giả URL.
- Khi Cloud lỗi, Gemini vẫn trả đủ 5 chiến dịch và chức năng Demo không dùng Cloud.

## 5. Bảo mật và phạm vi

- Mỗi yêu cầu trả phí bắt buộc có vé **dùng một lần** sinh ra sau một lượt Gemini + xác minh Turnstile thành công. Vé ràng buộc IP, có hạn 10 phút.
- Server dùng `X-Browser-Use-API-Key`, gửi trực tiếp tới `https://api.browser-use.com/api/v4/`. Không cho phép người dùng yêu cầu Cloud tự do hoặc nhập task bất kỳ.
- URL ảnh/video/bài viết được lọc để tránh link không công khai, link địa chỉ nội bộ và đường dẫn trang tìm kiếm giả nguồn. Ảnh nếu không phải chính sản phẩm được ghi **ảnh minh họa**.
- Trạng thái Cloud xử lý bất đồng bộ. Browser Use có thể tốn vài phút; **không tính thành % thật của AI** và không chặn phần tạo chiến dịch Gemini.
- Trên shared hosting, tiến trình Node restart sẽ làm mất trạng thái các lượt tìm nguồn đang chạy. Với quy mô lớn cần Redis/PostgreSQL để lưu job/giới hạn bền vững và webhook Cloud.
- Ảnh và video từ bên thứ ba **không tự do sử dụng thương mại** chỉ vì công cụ tìm được. Cần xem điều kiện cấp phép, nguồn và quyền tác giả.

## 6. Hủy tích hợp (rollback)

Chuyển `BROWSER_USE_ENABLED=false`, **Restart Node.js**. Website tiếp tục hoạt động như bản 4.9: Gemini + nguồn ảnh miễn phí mặc định, không tạo thêm Cloud Run mới.
