# MarketGenius AI — Giai đoạn 4 (bản gốc 2.3.0) + thanh tiến trình 4.7

## Phạm vi chỉnh sửa

Mã nguồn nền: `MG_GD4_Full_Source(1).zip`, SHA-256:
`afe5d3fa5dbe2c9c1fab836329f3a040fd945e42e5433cdcc707599fb7ab8e6b`.

- Thanh tiến trình **ước tính** từ 1% lên tối đa 95% trong khi AI xử lý, theo `95 × (1 − exp(−t / 20))` với `t` tính bằng giây từ `performance.now()`.
- Sau 60 giây thanh giữ 95%, có thông báo AI chậm hơn thông thường.
- Chỉ đạt 100% khi nhận dữ liệu thành công; hiệu ứng lên 100% ~300ms, giữ chữ "Hoàn tất" ~400ms trước khi ẩn.
- Khi hủy, lỗi mạng, lỗi máy chủ hoặc thử lại, bộ hẹn giờ được giải phóng; lượt mới luôn reset về 1%.
- Demo không mở thanh tiến trình, chạy trong ~450ms như trước.
- Nền panel trắng, viền mảnh, thanh cao 6px màu cam, panel mobile cố định dưới màn hình.
- `aria-valuenow` được cập nhật theo bước ~5%, nhãn giai đoạn `aria-live="polite"`, hỗ trợ `prefers-reduced-motion`.
- Không tạo thêm tập tin JavaScript mới. Logic nằm trong `studio.js`; **không cần thêm file vào allowlist của `server.js`**.
- Không thay đổi API `/api/ai`, khóa Gemini, model, quyền truy cập hoặc database.

## Các file sửa

- `index.html`: markup panel, nhãn, % ước tính, thanh tiến trình và cache-busting cho asset sửa.
- `styles.css`: tạo giao diện desktop/mobile.
- `studio.js`: đồng hồ tiến trình, dừng, hoàn thành và hủy.
- `app.js`: gọi hoàn thành tiến trình sau kết quả thực, cleanup trong `finally`.
- `package.json`: nhãn phiên bản `2.3.0-progress-4.7` + test mới.
- `tests/test-progress-estimate.js`: mô phỏng 8 giây, 70 giây, hủy, lỗi, thành công, lặp lượt.

## Hướng dẫn cài trên Tenten

1. Sao lưu toàn bộ mã nguồn + `.env`/biến môi trường đang dùng.
2. Nếu server đang chạy **bản Giai đoạn 4 gốc**: giải nén bản **Update Tenten** vào **thư mục gốc Node.js app**, cho phép ghi đè các file đã sửa.
3. Nếu server có thể đã bị trộn với bản 2.3.1/2.3.2: sao lưu rồi triển khai bản **Full Source** sạch, chỉ mang sang biến môi trường cấu hình hợp lệ. Không ghi đè secret lên file công khai.
4. Vào **Setup Node.js App** > Restart, mở web bằng `Ctrl + F5` (hoặc cửa sổ riêng tư).
5. Chọn "Tạo chiến dịch AI": kiểm tra % ước tính từ 1% đến tối đa 95% khi chờ; khi có kết quả thật mới đạt 100%. Kiểm tra nút Hủy và Demo.

**Lưu ý:** Phần trăm chỉ đo thời gian trôi, không làm Gemini nhanh hơn hay khắc phục lỗi upstream. Nếu % đứng 95% và không tạo được kết quả thì cần kiểm tra status/response của `/api/ai` và server logs (không cung cấp API key).

## Kết quả kiểm tra

- `npm run check` thành công.
- `npm test` thành công, bao gồm test mới cho thanh tiến trình.
- Chromium: kiểm tra giao diện 1366px và 390px, panel không tràn ngang, nút Hủy khả dụng; Demo hiển thị đủ 5 chiến dịch.
- Chromium: thử fetch giả lập đang chờ, hủy, bắt đầu lại, trả đủ 5 chiến dịch và lỗi mạng thành công.
- **Chưa kết nối Gemini/Turnstile thật trên hosting Tenten** trong môi trường thử nghiệm này.
