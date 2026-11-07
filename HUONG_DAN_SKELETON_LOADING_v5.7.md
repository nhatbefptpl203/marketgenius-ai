# MarketGenius AI v5.7 — Skeleton Loading + Dynamic AI Status

## Nền tảng và phạm vi

Nâng cấp trực tiếp từ bản `MG_v56_Bright_Palette_Full_Source.zip` v5.6. Giữ nguyên **cấu trúc HTML** (không thêm/xóa thẻ tĩnh), luồng API, định dạng JSON, LocalStorage, Shortlist, Lịch sử, Smart Planner và xuất PDF. Chỉ thay đổi **03 file runtime**:

- `app.js`: thay 4 ô skeleton mặc định bằng 2 thẻ chi tiết và trạng thái động; xử lý vòng đời timer.
- `startup-theme.css`: shimmer và thẻ preview, hỗ trợ giảm chuyển động.
- `index.html`: **chỉ đổi hai chuỗi query cache** `app.js?v=skeleton57` và `startup-theme.css?v=skeleton57`; không thay thẻ hoặc bố cục.

File `studio.js`, `server.js`, `smart-templates.js`, `free-media-*.js`, `browser-use-*.js`, `planner.js` và mọi file API không sửa.

## Trải nghiệm chờ

- Một dòng trạng thái nổi bật trên cột xem trước gồm chấm cam nhấp nháy và 4 câu quay vòng **2,5 giây/lần**.
- Hai thẻ mô phỏng bản kế hoạch: chỉ số nhỏ/badge, tiêu đề 22px (rộng 65%), hai dòng mô tả 14px (rộng 90% và 75%), điểm nhấn cao 56px, bốn ô tuần cao 68px (2 cột).
- Hiệu ứng shimmer `1.5s ease infinite` chỉ chạy khi người dùng không bật `prefers-reduced-motion`.
- **Thành công:** timer dừng trước khi `renderResults()` hiển thị 5 chiến dịch thật. **Demo:** tương tự, sau 450ms có sẵn.
- **Lỗi:** timer dừng trong `finally`, khôi phục kết quả cũ hoặc ẩn phần kết quả như bản trước.
- **Hủy:** dừng timer và dọn skeleton ngay, vẫn sử dụng AbortController sẵn có của `studio.js`.
- **Bấm tạo liên tiếp:** `state.loading` cũ chặn yêu cầu trùng; khi bắt đầu lượt mới chỉ tạo một timer.

## Cập nhật trên cPanel Tenten

1. Sao lưu mã nguồn website và các file quan trọng trong thư mục ứng dụng hiện tại.
2. Vào **cPanel → File Manager → `marketgenius-ai`** (thư mục chứa `server.js` và `package.json`).
3. Upload `MG_v57_Skeleton_Loading_Update_Tenten.zip` vào **chính thư mục `marketgenius-ai`**.
4. Chọn ZIP → **Extract** tại `marketgenius-ai`; **ghi đè 3 file** `app.js`, `startup-theme.css`, `index.html`. Không giải nén sang thư mục con.
5. Trong **Setup Node.js App → Restart**.
6. Mở `https://smartgear.website/` và tải lại. Query `?v=skeleton57` giúp trình duyệt nhận CSS/JS mới dù máy chủ lưu cache một năm cho URL có phiên bản.

**Không cần `npm install`, đổi API key hoặc sửa biến môi trường.**

## Cách tự kiểm tra

1. Vào **Tạo chiến dịch**, nhập brief rồi bấm **Thử demo**: nhìn thấy 2 thẻ skeleton trong thời gian ngắn, sau đó 5 kết quả Demo.
2. Chọn **Tạo 5 ý tưởng**: nếu Gemini phản hồi chậm, xem dòng trạng thái tự đổi theo chu kỳ 2,5s; khi xong, skeleton biến mất và 5 chiến dịch thật xuất hiện.
3. Nếu cần, nhấn **Hủy yêu cầu**: skeleton và thông báo dừng. Chạy lại phải bắt đầu từ trạng thái thứ nhất.
4. Thử trên điện thoại: không có tràn ngang; skeleton hai cột tuần nằm trong card.
5. Nếu hiệu ứng không xuất hiện: xem Network trong DevTools để chắc chắn `app.js?v=skeleton57` và `startup-theme.css?v=skeleton57` đều HTTP 200.

## Kiểm thử trước bàn giao

- `npm run check`, `npm test` (16 nhóm), `node tests/test-skeleton-loading-v57.js`: PASS.
- Playwright + Chromium ở 1366px và 390px: Demo, 5 kết quả; trình duyệt 1366px: AI giả lập chậm hơn 2,5s, lỗi mạng, hủy giữa chừng, chặn bấm tạo trùng: PASS.
- `prefers-reduced-motion: reduce`: shimmer tắt, nội dung vẫn hiển thị: PASS.
- HTTP Node cục bộ: trang và các file JS/CSS được yêu cầu trả HTTP 200.

**Giới hạn kiểm thử:** Chưa triển khai và thử với Gemini thật trên hosting Tenten. Hiệu ứng trạng thái là **trình bày theo thời gian**, không phải thông báo tiến độ thực tế của mô hình AI.
