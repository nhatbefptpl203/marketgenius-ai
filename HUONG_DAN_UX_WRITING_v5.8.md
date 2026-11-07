# MarketGenius AI v5.8 — UX Writing & Modal Compact

## Phạm vi

Nâng cấp từ v5.7 (Skeleton Loading). Chỉ sửa giao diện trình bày và các chuỗi chữ trong 4 file `index.html`, `app.js`, `studio.js`, `studio-layout.css`. Không sửa backend, API, cấu trúc JSON, LocalStorage, planner, Smart Template, hay khóa cấu hình.

## Các thay đổi

1. **Trang chủ:** thay hero bằng câu ngắn gọn, 3 số KPI minh họa (không phải số đo thật), bỏ nhãn lặp và section 4 bước.
2. **Cột tạo chiến dịch:** bỏ mô tả phụ, ẩn ghi chú form, giữ nguyên ID được JS cập nhật; tóm gọn banner mẫu, ẩn hộp xác minh trùng lặp (các giá trị đang có vẫn nằm trong input). Giữ nguyên Turnstile, radio ngân sách, chọn kênh và cách xử lý dữ liệu.
3. **Card và Shortlist:** chỉ giữ nội dung điểm nhấn, bỏ đầu đề timeline; không dựng khu vực ảnh nếu không có ảnh khả dụng; đếm Shortlist dạng “Đang lưu X ý tưởng”.
4. **Lịch sử:** chỉ có số lượng ở thanh công cụ, một hàng tên và một hàng metadata; không có badge nguồn lặp lại.
5. **Modal chi tiết:** ảnh cao tối đa 150px, lưới tự dàn, không hiện bài báo rỗng, bỏ ghi chú lặp, thu gọn dữ liệu/giả định bằng `details` mặc định đóng; hai ô lý do/rủi ro nằm cạnh nhau trên desktop; tiêu đề KPI ngắn.

**Xuất PDF:** nguồn dữ liệu/giả định vẫn được xuất, và `details` được mở sẵn khi tạo nội dung in để không mất dữ liệu.

## Cài đặt Tenten

1. Sao lưu các file `index.html`, `app.js`, `studio.js`, `studio-layout.css` đang có trong thư mục `marketgenius-ai`.
2. Upload `MG_v58_UX_Writing_Update_Tenten.zip` vào đúng thư mục Application root (`marketgenius-ai`).
3. Chọn file ZIP → **Extract** ngay vào `marketgenius-ai`, kiểm tra không có thư mục `marketgenius-ai` lồng bên trong.
4. Vào **Setup Node.js App → RESTART**. Dùng `Ctrl + Shift + R` để tải tài nguyên mới (trong HTML đã đổi `?v=ux58`).
5. Kiểm tra Trang chủ, tạo Demo 5 ý tưởng, chọn/lưu/bỏ lưu, mở modal, tick Tuần 1, xem lịch sử, thử PDF.

Không cần thay các biến môi trường Gemini, Serper, YouTube, Pixabay, Pinterest.

## Kiểm thử

- `npm run check` — PASS.
- `npm test` — 16/16 nhóm PASS (bài snapshot cũ về câu “Ví dụ minh họa” được cập nhật theo yêu cầu v5.8).
- `node tests/test-ux-writing-v58.js` — PASS.
- Chromium 1366px và 390px: Demo 5 ý tưởng, modal chi tiết, lưới ảnh, thu gọn thông tin và tick tuần PASS; không phát hiện lỗi JS hoặc tràn ngang.

Chưa kiểm tra Gemini/Pixabay/Serper trên hosting thật; bản này không sửa các API.
