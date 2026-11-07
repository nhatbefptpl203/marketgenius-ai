# MarketGenius AI — hướng dẫn cập nhật nguồn hình ảnh & video v5.3

## 1. Bản nào nên tải?

- **Update Tenten 5.3**: chỉ cài lên website đang chạy **v5.2** (Free Media).
- **Full Source 5.3**: dùng nếu muốn triển khai sạch, hoặc không chắc các phiên bản trung gian đã được cài đầy đủ.

Trước khi giải nén, **sao lưu** thư mục ứng dụng và ghi lại cấu hình biến môi trường (không chụp ảnh lộ key). Đừng giải nén zip vào `public_html` khi Application root đang là `marketgenius-ai`.

## 2. Cập nhật trên cPanel Tenten

1. cPanel → **File Manager** → vào thư mục `marketgenius-ai` (cũng là Application root trong Setup Node.js App).
2. Tạo bản backup. Tải lên `MG_GD4_Multi_Source_5_3_Update_Tenten.zip`.
3. Chọn ZIP → **Extract** → kiểm tra đường dẫn đích là `/home/<user>/marketgenius-ai/` → Extract Files. Các tệp `server.js`, `app.js`, `index.html`, `free-media-service.js`, ... phải nằm ngay trong `marketgenius-ai`, không phải một thư mục lồng mới.
4. Chọn **Overwrite/ghi đè** cho các file thay đổi. Không xóa dữ liệu trong `.media-cache`.
5. Setup Node.js App → chọn ứng dụng root `marketgenius-ai`, startup `server.js` → **Restart**.
6. Trên website nhấn **Ctrl + F5**. Mở `https://smartgear.website/#sources` (thay bằng domain của bạn nếu khác).

## 3. Biến môi trường

Cài tại cPanel → Setup Node.js App → Environment variables. **Không đưa key vào `index.html` hoặc file JS gửi đến trình duyệt.**

```env
FREE_MEDIA_ENABLED=true
GOOGLE_IMAGES_ENABLED=true
SERPER_API_KEY=key_tu_serper_dev
YOUTUBE_API_KEY=key_youtube_data_api_v3_hien_co
PIXABAY_API_KEY=key_pixabay_hien_co
PINTEREST_ENABLED=false
BROWSER_USE_ENABLED=false
```

**Google Images:** vào https://serper.dev/ lấy API key Serper. **Không dùng YouTube API key hoặc Gemini API key** cho `SERPER_API_KEY`: đây là dịch vụ tìm kiếm của bên thứ ba, có hạn mức/chi phí riêng. Việc có kết quả Google Images không chứng minh có quyền dùng ảnh quảng cáo.

**YouTube:** giữ key bạn đã tạo trong Google Cloud. Chỉ dùng YouTube Data API v3, không yêu cầu OAuth khi tìm video công khai.

**Pixabay:** giữ key hiện tại để tìm ảnh/video tư liệu; kết quả tra cứu được cache 24 giờ. Ảnh tư liệu không phải ảnh đúng sản phẩm.

**Pinterest (tùy chọn):** sau khi đăng ký và được Pinterest duyệt API, cần OAuth access token có quyền đọc Pin (`pins:read`, trong một số ngữ cảnh thêm `boards:read`). Sau đó thêm:

```env
PINTEREST_ENABLED=true
PINTEREST_ACCESS_TOKEN=access_token_pinterest_duoc_cap_quyen
```

Lưu ý endpoint Pinterest API v5 `/search/pins` tìm **Pin thuộc tài khoản đã cấp quyền**, không tìm toàn bộ Pinterest công khai. Token có thể hết hạn và cần refresh từ nguồn Pinterest. Chỉ ghi link nguồn, không mặc nhiên có giấy phép tái sử dụng.

## 4. Kiểm tra sau cài đặt

Mở `https://smartgear.website/api/media-sources/status`. Ví dụ khi có Serper, YouTube, Pixabay, chưa dùng Pinterest:

```json
{
  "ok": true,
  "enabled": true,
  "providers": {
    "google": { "configured": true },
    "youtube": { "configured": true },
    "pinterest": { "configured": false },
    "pixabay": { "configured": true }
  }
}
```

Phản hồi thực tế còn có `service`, `scope`, `message`. Giá trị `configured: true` **chỉ xác nhận có biến môi trường**, không xác nhận key hợp lệ, tài khoản có tín dụng hay hạn mức còn dư. Kiểm tra thực tế bằng cách tạo một **bộ 5 chiến dịch AI mới**. Demo không gọi API tìm kiếm.

Kết quả ưu tiên nguồn ảnh đúng tên sản phẩm từ Google Images/Pin đã cấp quyền; dùng Pixabay làm tư liệu dự phòng. YouTube cho video liên quan từng hướng chiến dịch. Mỗi kết quả có link nguồn, và bộ lọc cố gắng loại trùng, loại sai mẫu. Nếu một nguồn không trả kết quả, hệ thống vẫn giữ nguyên 5 chiến dịch Gemini.

## 5. Khi ảnh vẫn trống

- Vào `/#sources`, kiểm tra trạng thái. Nếu `google.configured=false`, nhập đúng key Serper trong `SERPER_API_KEY`, bật `GOOGLE_IMAGES_ENABLED=true`, Restart.
- Nếu `configured=true` nhưng không có ảnh: có thể key bị từ chối, hết hạn mức hoặc kết quả không đúng sản phẩm nên bị lọc. Kiểm tra cảnh báo tìm nguồn trên giao diện; xem Network → `/api/free-media/search` → **Response** (ẩn key, token trước khi chia sẻ).
- Nếu YouTube có video mà ảnh vẫn trống: key YouTube **không phải** key Google Images.
- Nếu Google/Pinterest trả hình nhưng ảnh bị lỗi: nguồn gốc có thể ngăn tải ảnh từ bên thứ ba; không phải hình nào cũng hiển thị hoặc được phép dùng lại.
- Lịch sử cũ không tự được điền thêm ảnh. Cần tạo chiến dịch mới.

## 6. Hoàn nguyên

Dừng ứng dụng, khôi phục backup `marketgenius-ai` trước khi cài v5.3, Restart. Giữ nguyên các biến môi trường cũ nếu vẫn sử dụng.

## 7. Giới hạn kiểm thử

Mã nguồn và mock API đã được kiểm thử cục bộ. Trình duyệt Chromium trong môi trường kiểm tra bị chặn mở HTTP/file URLs trực tiếp; giao diện nguồn được thử bằng tài nguyên nội bộ (render `#sourcesView`, CSS, JS, phản hồi trạng thái giả lập), tại 1366px và 390px. **Chưa xác nhận kết nối Serper/Pinterest/YouTube/Pixabay thực tế trên Tenten, cũng chưa xác nhận mọi loại sản phẩm có ảnh phù hợp.**
