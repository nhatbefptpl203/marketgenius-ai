# MarketGenius AI — Báo cáo Giai đoạn 3/4

**Cơ sở:** `2.3.0-stage2`. **Bản sau thiết kế:** `2.3.0-stage3`. Không có npm dependency hoặc CDN script mới, không thay Gemini, Turnstile, JSON schema, `data-action`, `data-history-action`, hoặc key localStorage.

## 3.1 — Design tokens: XONG
- Một **`:root` duy nhất** trong `styles.css`, định nghĩa `--bg:#FAF9F6`, `--surface:#FFFFFF`, `--primary:#0F172A`, `--accent:#EA580C`, `--accent-hover:#C2410C`, `--text:#0F172A`, `--text-2:#475569`, `--text-3:#64748B`, `--border:#E2E8F0`, `--border-soft:#F1F5F9`, các token radius và bóng.
- Tất cả màu literal trong các module CSS được chuyển về token này. Tất cả khai báo gradient trong 5 module CSS đã được loại bỏ. CSS hiện không còn hex Indigo/Violet, glow/orb, gradient tím.
- Bo góc thẻ/khung/nút tối đa 12px; các chấm tròn giữ `border-radius:50%` để đúng hình dạng. Shadow thường `0 1px 2px` và dialog được phép shadow trung bình.
- Focus ring rõ ràng 2px, hover và active có phản hồi, và tắt animation qua `prefers-reduced-motion`.
- **Cách thực hiện:** giữ selectors/IDs gốc trong các module để tránh phá JS, thêm `saas-design.css` sau cùng làm lớp giao diện Sass-like nhưng CSS thuần, không dùng preprocess. `server.js` thêm path CSS mới vào static allowlist.

## 3.2 — Bớt 'AI template look': XONG cho lớp ngôn ngữ/kiểu dáng; còn phần cấu trúc nội dung trong Giai đoạn 4
- Giao diện sáng, phẳng, ít shadow và biên độ bo góc nhỏ. Trợ lý AI và form được chuyển sang thẻ trắng, chia nhóm bằng đường kẻ thay vì thẻ nền đen.
- CTA quan trọng Trang chủ màu cam; CTA điều hướng/nút chính màu Slate. Chữ tiêu đề toàn bộ một màu `--text`.
- Ẩn pseudo glow; bỏ gradient nền chữ; làm phẳng mockup cũ. Còn cấu trúc 05/04/01 và ảnh preview trang chủ là **công việc thay nội dung của Giai đoạn 4**.
- Loại bỏ emoji lấp lánh `✦ ✧ ✨` trong HTML và JS giao diện, thay bằng icon nghiệp vụ SVG nhúng sprite (`Target`, `BarChart`, `Calendar`, `Layers`, `FileText`, `MoreVertical`); sửa các eyebrow tiếng Anh thành tiếng Việt.
- Chỉ tải Google Font **Be Vietnam Pro**, các weight 400/500/600/700. Không dùng Inter.
- Sửa lỗi toast thành công bị nền xanh kín trong lần thử hình ảnh: hiện là nền trắng, viền trạng thái xanh.
- Các chip tuần sử dụng một tông trung tính, không còn mỗi tuần một màu.

## Kiểm thử
- `npm run check`: **PASS**.
- `npm test`: **PASS** (8 bộ test Node kế thừa).
- `python tests/ui-stage1-smoke.py`: **PASS** 1366/768/390px — Demo 5 ý tưởng, lịch sử cũ, Shortlist, so sánh, chi tiết, Planner, print.
- `python tests/ui-stage2-routes.py`: **PASS** 1366/768/390px — điều hướng hash, Back/Forward, menu Mobile, `#about` cũ.
- `python tests/ui-stage3-design.py`: **PASS** 1366/768/390px — màu token đúng, trang không có gradient nền, Demo → Shortlist → Lịch sử, không tràn ngang hoặc lỗi JS.
- HTTP Node trực tiếp: `/healthz`, `/`, `/styles.css`, `/studio-layout.css`, `/saas-design.css` trả **200**.
- Đã kiểm tra CSS: chỉ **1 `:root`**, **0 gradient**, **0 màu literal ngoài `:root`**, **0 emoji ✦ ✧ ✨ ở HTML/JS**.
- Screenshot trình duyệt Chromium **dùng nguồn HTML/CSS/JS cục bộ**; không kiểm thử Gemini/Turnstile thật tại Tenten.

## Chưa làm (theo phạm vi Giai đoạn 4)
- Thay mockup 3D/counter 05/04/01 bằng một kế hoạch mẫu phẳng thực tế; sửa trạng thái trống Builder.
- Thiết kế lại thẻ chiến dịch có 4 công việc tuần và menu ⋮; Lịch sử dạng danh sách phẳng; rút gọn các nút.
- Cải thiện HTML meta/SEO/CSP, gzip/brotli/static cache, WebP icon, lazy-load Turnstile, tài liệu gộp README/CHANGELOG và thêm manifest/robots/sitemap.
- Full 4-phase visual QA trên hosting production và kiểm thử khóa Gemini thật.

## Các file mã nguồn có thay đổi
`index.html`, `styles.css`, `startup-theme.css`, `studio-layout.css`, `smart-templates.css`, `research-media.css`, `saas-design.css` (mới), `app.js`, `smart-templates.js`, `server.js` (chỉ thêm static allowlist), `package.json`. Thêm `tests/ui-stage3-design.py`, cập nhật 2 Python UI test để nạp CSS mới.

## TODO(Nhất)
- Xác nhận model Gemini thật và giới hạn chi tiêu Google trước khi triển khai.
- Kiểm thử Turnstile tại `smartgear.website`.
- Video demo và thông tin model cần điền trong README cũ: `TODO(Nhất): ...` ở Giai đoạn 4.

**Không triển khai bản trung gian này lên production nếu muốn nhận một bản cập nhật đầy đủ sau Giai đoạn 4.**
