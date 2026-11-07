# MarketGenius AI v5.9.1 — Fix khung Bản kế hoạch mẫu trên điện thoại

## Lỗi được sửa
- `.studio-home-visual` cố định chiều cao 315px (điện thoại) hoặc 350px (máy tính bảng), trong khi `.mg-sample-card` cao hơn thực tế. Vì `.studio-home-hero` dùng `overflow:hidden`, phần Tuần 3–4 bị cắt.
- Bản vá đặt chiều cao tự động cho `.studio-home-visual` tại màn hình <=1023px, tự bao trọn chiều cao của bốn ô tuần và không ảnh hưởng desktop >=1024px.

## File được cập nhật
- `saas-design.css`: chỉ bổ sung CSS responsive ở cuối file.
- `index.html`: chỉ đổi query phiên bản của CSS `saas-design.css` từ `share59` thành `mobile591` để tránh cache cũ.
- **Không thay đổi JavaScript, API, schema, LocalStorage hay markup.**

## Cài trên cPanel Tenten
1. Sao lưu `index.html` và `saas-design.css` trong thư mục `marketgenius-ai`.
2. Upload `MG_v591_Mobile_Hero_Fix_Update_Tenten.zip` tới thư mục `marketgenius-ai` (đúng Application root trong Setup Node.js App).
3. Chọn ZIP > **Extract** tại thư mục này; ghi đè `index.html` và `saas-design.css`.
4. Mở Setup Node.js App > **RESTART**.
5. Mở website từ điện thoại bằng tab riêng tư hoặc tải lại trang. Kéo tới BẢN KẾ HOẠCH MẪU, xem đủ **Tuần 1–4** và thẻ kết thúc trước phần CHỌN CÁCH BẮT ĐẦU.

## Nếu vẫn thấy giao diện cũ
- Kiểm tra `Application root` là `marketgenius-ai`, tệp CSS nằm ngay trong thư mục đó (không lồng thêm thư mục sau Extract).
- Tại trang web, mở View Source và kiểm tra có `saas-design.css?v=mobile591`.
- Xóa cache trình duyệt/cPanel/CDN nếu cần, thử tab ẩn danh.
- Ảnh lỗi trước đây còn dòng “Ví dụ minh họa — không phải dữ liệu đo lường” và chữ “KPI tham khảo”; bản v5.9 hiện đã bỏ các chữ đó. Nếu chúng vẫn xuất hiện, website đang tải HTML cũ hoặc bản không đúng v5.9.

## Kiểm thử
- `npm run check`: PASS.
- `npm test`: 16 bộ kiểm thử Node PASS.
- Chromium widths 320,360,375,390,414,430,600,768,850,851,900,950,990,991,1000,1023,1024,1366: PASS, không cắt Tuần 4 và không tràn ngang.
- Chưa kiểm chứng trực tiếp trên hosting Tenten.
