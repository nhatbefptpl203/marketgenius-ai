# MarketGenius AI — Giai đoạn 4.9: Ảnh tự tìm cho từng chiến dịch

**Bản gốc:** `MG_GD4_Full_Source(1).zip` → Giai đoạn 4.7 tiến trình → 4.8 ảnh/nguồn → **4.9**.

## Đã thay đổi

1. Bỏ dòng “Phần trăm dựa trên thời gian chờ...” khỏi `#progressDetail` và `studio.js`, kể cả câu nhắc lại sau 60 giây. **Nhãn `ước tính` cạnh số % vẫn giữ** vì API không cung cấp tiến độ thật. Thanh vẫn chạy 1 → tối đa 95% → 100% khi có kết quả.
2. Không bắt người dùng tải ảnh lên: gỡ các nút **+ Thêm ảnh / nguồn** khỏi thẻ và màn chi tiết. Trình chỉnh sửa thủ công cũ được ẩn để tránh làm mất dữ liệu lưu trước đây.
3. Server tạo **truy vấn ảnh riêng cho mỗi trong năm chiến dịch** dựa trên tên sản phẩm + góc triển khai (review, hướng dẫn, khuyến mãi, lifestyle, so sánh, ra mắt,...). Nguồn tự động: ảnh sản phẩm tra cứu trước đó + Openverse + Wikimedia Commons; **Serper Images** nếu chủ sở hữu đã cấu hình `SERPER_API_KEY`. Image grounding Gemini vẫn là tùy chọn theo `MEDIA_GEMINI_IMAGE_SEARCH`.
4. Chỉ nhận URL HTTPS công khai, có trang nguồn và tiêu đề phù hợp sản phẩm (kiểm tra mã đời/biến thể khi có); không tự tạo URL hay cố lấy ảnh khác sản phẩm để lấp chỗ trống. Mỗi ảnh URL chỉ được dùng tối đa một lần trong một bộ 5 chiến dịch.
5. Lưu `resources.image` và `resources.images` **riêng theo từng chiến dịch** trong lịch sử; không còn dồn ảnh của năm chiến dịch thành bộ ảnh dùng chung khi tải lại.

## Cập nhật lên Tenten

1. Sao lưu file và biến môi trường của ứng dụng đang chạy.
2. Nếu website đang chạy đúng **Giai đoạn 4.8**, upload `MG_GD4_Auto_Images_4_9_Update_Tenten.zip` tại thư mục ứng dụng Node.js, giải nén ghi đè đúng cấu trúc.
3. Nếu đã trộn nhiều bản cũ, dùng `MG_GD4_Auto_Images_4_9_Full_Source.zip` thay thế sau khi sao lưu.
4. Trong cPanel → **Setup Node.js App → Restart**. Mở web và bấm Ctrl+F5.
5. **Tạo một bộ chiến dịch AI mới** để hệ thống tự tìm ảnh. Lịch sử cũ không tự tra cứu lại nhằm tránh tiêu tốn các lượt gọi API ngoài ý muốn.

## Cấu hình / giới hạn

- `MEDIA_RESEARCH_ENABLED=true` (mặc định) bật tự tìm nguồn.
- **Không bắt buộc** thêm API key để dùng Openverse/Wikimedia Commons, nhưng những kho ảnh này có thể không có ảnh của thương hiệu nhỏ hoặc sản phẩm quá mới.
- Để tìm rộng hơn bằng công cụ tra cứu ảnh chuyên dụng, chủ website có thể cấu hình `SERPER_API_KEY` trong biến môi trường **trên máy chủ**, không bao giờ trong HTML/JS. Đây là dịch vụ bên ngoài, có quota và có thể phát sinh chi phí. Không có key vẫn tạo được 5 chiến dịch.
- `MEDIA_GEMINI_IMAGE_SEARCH=true` là tùy chọn riêng có thể phát sinh phí và phụ thuộc quyền truy cập model; không tự bật trong bản này.
- Không có nhà cung cấp công khai nào bảo đảm **cả 5 ảnh luôn có sẵn hoặc được phép sử dụng thương mại**. Nếu chỉ tìm được hai ảnh đúng sản phẩm, website hiện hai ảnh, còn ba chiến dịch hiện trạng thái rõ ràng — **không gắn nhầm ảnh hoặc nhân bản ảnh**.
- Các kết quả tìm kiếm là ảnh tham khảo có liên kết trang nguồn, không phải tác phẩm được cấp phép thương mại mặc nhiên. Hãy kiểm tra bản quyền trước khi đăng quảng cáo.
- Các chiến dịch Demo không gọi dịch vụ ảnh bên ngoài; chức năng tự tìm ảnh chỉ áp dụng cho luồng AI thật.

## Kiểm thử cục bộ

- `npm run check`: PASS
- `npm test`: PASS, có bài `test-auto-campaign-images.js`
- `python tests/ui-auto-campaign-images.py`: PASS ở 1366px và 390px
- Kiểm thử mô phỏng ảnh khác nhau theo 5 chủ đề, loại ảnh sai, không trùng URL, giữ ảnh riêng khi lưu lịch sử, xóa dòng nhắc phần trăm và không còn nút tải ảnh.
- **Chưa kiểm thử với khóa Gemini/Serper thật trên hosting Tenten**; kết quả thu được thực tế phụ thuộc nguồn và kết nối mạng.
