# MarketGenius AI v5.5 — Tự tạo template theo sản phẩm, bỏ hạn mức AI nội bộ

## Cập nhật trên Tenten
1. Sao lưu thư mục `marketgenius-ai` và Environment variables.
2. Upload `MG_GD4_Auto_Template_5_5_Update_Tenten.zip` vào `marketgenius-ai`, Extract và ghi đè đúng các file.
3. Setup Node.js App: startup file `server.js` → Restart.
4. Nhấn Ctrl+F5 trên trang, sau đó thử sản phẩm A, đổi B, nhập lại A.
5. Không cần đổi API key. Hai biến `GUEST_IP_DAILY_LIMIT` và `GUEST_DAILY_LIMIT` cũ không còn tác dụng trong v5.5; có thể xóa khỏi cPanel.

## Hành vi mới
- Tên sản phẩm mới -> sau khi dừng nhập, website tự yêu cầu 4 template AI (với Turnstile hợp lệ).
- Tên cũ -> dùng lại cache trong localStorage, kể cả F5; tên được so khớp không phân biệt chữ hoa/thường, bỏ khoảng trắng thừa.
- Gõ A rồi đổi B khi A đang chạy -> không lấy nhầm mẫu A làm mẫu B; sau khi A hoàn tất, B được xử lý khi có token mới.
- Lỗi nhà cung cấp -> không tự lặp vô tận; có thể nhấn **Tạo 4 mẫu bằng AI** để thử lại.
- Đã gỡ giới hạn 5 lượt/ngày/IP, 60 lượt/ngày toàn site, 20 giây giữa các lượt trong `server.js`. Website vẫn yêu cầu Cloudflare Turnstile để hạn chế lạm dụng.
- Không thể loại bỏ giới hạn quota/rate limit từ Google Gemini, và việc bỏ giới hạn nội bộ có thể khiến chi phí tăng nhanh. Nên thiết lập kiểm soát ngân sách/quota ở Google, bảo vệ domain và theo dõi sử dụng.
- Giới hạn của chức năng tìm nguồn (Pixabay/YouTube/Browser Use) là chức năng riêng, không bị thay đổi.

## Kiểm tra
- `npm run check`
- `npm test`
- Trên trình duyệt thật, cần xác minh Turnstile với domain đã đăng ký. Không có API key thật được đính kèm trong ZIP.
