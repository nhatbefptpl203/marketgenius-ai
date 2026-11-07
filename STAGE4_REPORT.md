# Giai đoạn 4/4 — MarketGenius AI

## Thay đổi
- [XONG] Trang chủ: minh họa phẳng kèm KPI tham khảo và công việc 4 tuần, bỏ nhóm 3 thống kê.
- [XONG] Trang Tạo chiến dịch: Turnstile light/lazy, trạng thái rỗng skeleton, câu hướng dẫn nhanh.
- [XONG] Thẻ ý tưởng: tóm tắt `timeline.task`, menu ⋮, phím Escape/mũi tên, các action cũ.
- [XONG] Trang Lịch sử: danh sách phẳng, không số thứ tự, nguồn demo/guest/legacy.
- [LÀM MỘT PHẦN] Planner/dialog/PDF kế thừa bộ tokens stage 3, không thay toàn bộ cấu trúc để bảo vệ tương thích.
- [XONG] Server: br/gzip, cache có version, CSP cơ bản, WebP, robots/sitemap/manifest, HTML 404.
- [XONG] README/CHANGELOG, archive tài liệu cũ, bài test stage4.

## Test
- `npm run check`: PASS.
- `npm test`: PASS (9 test Node, bao gồm Stage4 static).
- Stage3 Chromium browser smoke 1366/768/390: PASS.
- HTTP localhost: healthz/index/robots/sitemap/manifest 200, /missing 404 HTML, br/immutable cache PASS.
- `POST /api/ai` action `generate` cũ từ chối.

## Chưa xác minh
- Gemini thật, Turnstile domain production và CSP trên Tenten (cần key và hosting đang chạy).
- PDF print preview thực tế/thiết bị in của người dùng.
- Giao diện của tất cả tình huống dữ liệu AI thật.
