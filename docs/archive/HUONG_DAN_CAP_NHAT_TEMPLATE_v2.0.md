# MarketGenius AI v2.0 — Gợi ý nhanh thông minh

## Những gì mới

- Nhập **tên sản phẩm** trong **Gợi ý nhanh** để hiện 4 mẫu Marketing liên quan đến ngành hàng được nhận diện.
- Mỗi mẫu có định hướng khác nhau: **Tăng doanh số**, **Ra mắt sản phẩm**, **Xây dựng thương hiệu**, **Marketing tiết kiệm**.
- Nhấn **Chọn & điền form**: hệ thống tự chuyển sang **Chuyên sâu** và gợi ý ngành hàng, mục tiêu, ngân sách VNĐ, khách hàng mục tiêu và KPI **thử nghiệm**. Có thể sửa hết những trường này.
- Nếu đổi mẫu sau khi sửa, hệ thống hỏi trước khi ghi đè.
- Có thể đặt tên và **lưu mẫu riêng** trong trình duyệt rồi sử dụng lại.
- Nếu tên sản phẩm không được nhận diện, vẫn gợi ý 4 mẫu Marketing tổng quát. Tính năng này dùng từ khóa/ngành hàng trên trình duyệt, **không gọi AI**, không tốn lượt API.

**Chú ý:** Mẫu không khẳng định giá bán, ưu đãi, hiệu quả Marketing hoặc kênh doanh nghiệp sở hữu. Các trường đã xác minh như giá bán, chứng cứ USP, dữ liệu nền, quyền liên hệ khách cũ, nhân sự và chính sách giảm giá không bị tự bịa. Người dùng phải kiểm tra nội dung trước khi tạo chiến dịch.

## Cập nhật trên Tenten cPanel

**Nên dùng bản Update**, không phải bản Full, vì website đang chạy bình thường.

1. Mở **cPanel → File Manager → `marketgenius-ai`** (Application root đã khai báo khi tạo Node.js App).
2. Tải lên `MG_v20_Smart_Templates_Update_Tenten.zip`.
3. Chọn ZIP → **Extract** ngay trong thư mục `marketgenius-ai`, cho phép ghi đè các file trùng tên.
4. Kiểm tra **5 file này** nằm trực tiếp trong `marketgenius-ai`:
   - `index.html` *(ghi đè)*
   - `app.js` *(ghi đè)*
   - `server.js` *(ghi đè: thêm đường dẫn cho 2 file mới, không đổi API)*
   - `smart-templates.js` *(file mới)*
   - `smart-templates.css` *(file mới)*
5. Quay lại **Setup Node.js App** → kiểm tra Application startup file vẫn là `server.js` → **Restart**.
6. Mở `https://smartgear.website`, nhấn `Ctrl + Shift + R`. Trên điện thoại, mở tab ẩn danh để kiểm tra bản mới.

**Không xóa** các file `studio.js`, `planner.js`, `studio-layout.js`, `netlify/functions/ai.js`; không đổi API Key hoặc Cloudflare Turnstile. Không upload ZIP vào `public_html` hoặc vào một thư mục lồng thêm.

## Kiểm thử sau khi cập nhật

- Vào Tạo chiến dịch → Gợi ý nhanh → nhập `Son môi`.
- Kiểm tra 4 template xuất hiện ngay dưới tên sản phẩm.
- Chọn “Tăng doanh số”: form chuyển sang Chuyên sâu, ngành hàng là Mỹ phẩm, ngân sách hiển thị `5.000.000`, mục tiêu và khách hàng là gợi ý có thể sửa.
- Sửa ngân sách thành `7.500.000` → nhấn **Đổi mẫu** → chọn mẫu khác. Cần có cảnh báo trước khi ghi đè.
- Sửa form theo thông tin thực tế, nhập tên mẫu rồi nhấn **Lưu mẫu của tôi**; quay lại Gợi ý nhanh để thấy mẫu riêng.
- Chọn Thử demo để xác nhận vẫn tạo đủ 5 chiến dịch và timeline 4 tuần.
- Thử một lần với **AI có sẵn** để kiểm tra backend hoạt động sau khi Restart; bài test cục bộ chưa xác thực API Key trên Tenten thật.

## Giới hạn hiện tại

- Bộ gợi ý dựa trên các nhóm ngành và từ khóa thường gặp, không phải công cụ tra cứu dữ liệu thị trường hay chứng thực sản phẩm.
- Mẫu riêng được lưu bằng `localStorage` trên thiết bị/trình duyệt đang dùng; xóa dữ liệu trình duyệt sẽ mất mẫu riêng. Không lưu API Key trong mẫu.
- Chưa bổ sung upload ảnh sản phẩm và tìm video TikTok/bài viết tham khảo trong bản v2.0 này. Đó là một chức năng độc lập cần kiểm chứng liên kết thật và xử lý ảnh an toàn.
