# MarketGenius AI v5.4 — Tinh gọn giao diện (nâng từ v5.3)

## Thay đổi
- Gỡ khối **“Minh bạch về AI và dữ liệu”** trên trang chủ.
- Gỡ khối **“Giải thích thuật ngữ Marketing thường gặp”** phía trên kết quả chiến dịch.
- Gỡ banner màu cam **“NỘI DUNG MẪU / Nội dung MẪU – chưa xác minh”** trong form chọn template. **Quan trọng:** `data-template-draft` và `verifiedBriefText` vẫn có hiệu lực, nghĩa là giá trị mẫu chưa chỉnh sửa KHÔNG bị gửi sang Gemini như dữ kiện đã xác nhận.
- Không còn hiển thị dải trạng thái thành công **“Đã bổ sung N ảnh/video cho 5 chiến dịch”**; ảnh và video vẫn cập nhật trực tiếp trong các thẻ chiến dịch. Lúc đang tìm hoặc gặp lỗi, thông báo trạng thái vẫn xuất hiện để người dùng biết.
- Gỡ hoàn toàn trang **“Nguồn hình ảnh”** trong giao diện và menu. Truy cập link cũ `#sources` sẽ về trang chủ.
- Giữ API tìm nguồn trên máy chủ: **Serper Google Images, YouTube, Pixabay và Pinterest (nếu đã có quyền)**. Các biến môi trường trên Tenten được giữ nguyên.

## Cài đặt qua cPanel Tenten
1. Đảm bảo website đang chạy **v5.3**. Sao lưu thư mục `marketgenius-ai` hoặc ít nhất những file sẽ bị ghi đè.
2. Upload file `MG_GD4_UI_Cleanup_5_4_Update_Tenten.zip` vào thư mục `marketgenius-ai` (Application root trong Setup Node.js App).
3. Click ZIP, chọn **Extract** ngay tại `marketgenius-ai`, xác nhận ghi đè các file có cùng tên. **Không** giải nén vào thư mục con.
4. Có thể xóa thủ công 2 file **`source-settings.js`** và **`source-settings.css`** còn sót trên hosting. Dù chưa xóa, bản v5.4 cũng không tải chúng và máy chủ sẽ trả 404 cho các đường dẫn đó.
5. Vào **Setup Node.js App → Restart**; mở website và nhấn `Ctrl + F5`.
6. Kiểm tra trang chủ, tạo Demo đủ 5 chiến dịch, xem nguồn ảnh/video và lịch sử. Link `/#sources` sẽ quay về trang chủ.

## Không thay đổi
- Không thay Gemini API key, Turnstile hay các API key Google Images / YouTube / Pixabay / Pinterest.
- Không sửa endpoint tạo chiến dịch, cách tìm nguồn hoặc dữ liệu đang lưu trong trình duyệt.
- Không thêm thư viện npm, không cần `npm install`.

## Kết quả kiểm thử
- `npm run check`: PASS.
- `npm test`: PASS **16/16** nhóm kiểm thử Node, bao gồm bài test hồi quy giao diện v5.4.
- Chromium offline 1366 / 768 / 390 px: tạo 5 chiến dịch Demo, điều hướng, không tràn ngang/không lỗi JavaScript: PASS.
- Chromium offline 1366 / 390 px: chọn template, không còn cảnh báo cam, nhưng cờ draft vẫn giữ: PASS.
- Node HTTP: trang chủ 200, asset trang nguồn đã gỡ 404, API trạng thái nguồn vẫn 200.

**Chưa kiểm thử với API thật ngay trên hosting Tenten của bạn.**
