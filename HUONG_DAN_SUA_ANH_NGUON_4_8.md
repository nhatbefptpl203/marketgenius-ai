# MarketGenius AI — Bản sửa Giai đoạn 4.8 (Ảnh và nguồn tham khảo)

**Nền mã nguồn:** `MG_GD4_Progress_1_100_Full_Source.zip` — xuất phát từ `MG_GD4_Full_Source(1).zip` (v2.3.0), giữ nguyên thanh tiến trình 1–95–100%. Không dựa vào v2.3.1/v2.3.2.

## 1. Tại sao trước đây hiện “Chưa nhận được URL ảnh trực tiếp”?

- Google Search grounding có thể không trả `groundingChunks` / URL hình ảnh, hoặc sản phẩm quá mới / nguồn chặn truy cập.
- `MEDIA_GEMINI_IMAGE_SEARCH` mặc định tắt vì đây có thể là một lần gọi model ảnh riêng phát sinh chi phí và không phải tài khoản nào cũng được phép sử dụng.
- Serper chỉ có kết quả khi người quản trị tự cấu hình `SERPER_API_KEY` (dịch vụ riêng). Openverse/Wikimedia miễn phí thường không có ảnh sản phẩm thương mại nhỏ hoặc sản phẩm mới.
- Không có API nguồn nào bảo đảm có đủ ảnh, TikTok và bài báo cho mọi sản phẩm. **Bản này không tạo ảnh, URL, đánh giá hoặc video giả.**

## 2. Bản sửa này làm gì?

1. Vẫn sử dụng Google Search grounding, kết quả ảnh nguồn công khai, Openverse/Wikimedia và Serper khi có cấu hình.
2. Nếu Gemini ghi URL bài viết trong văn bản nhưng metadata rỗng, máy chủ chỉ chấp nhận URL sau khi thực sự truy cập được trang HTML, kiểm tra tiêu đề khớp sản phẩm, loại tên mẫu sai và địa chỉ mạng nội bộ.
3. Lọc ảnh từ Serper theo tiêu đề phù hợp sản phẩm và URL trang nguồn để hạn chế ảnh sai mẫu.
4. Mỗi thẻ chiến dịch và màn hình chi tiết có nút **+ Thêm ảnh / nguồn**. Có thể:
   - Chọn JPG/PNG/WebP từ máy (không quá 8 MB; được thu nhỏ JPEG ở trình duyệt, không upload lên server).
   - Dán link HTTPS trực tiếp tới ảnh và trang nguồn.
   - Dán link video TikTok hoặc bài viết, được ghi rõ **do bạn cung cấp / chưa xác minh**.
   - Chọn áp dụng đồng thời cho 5 chiến dịch đang mở, hoặc chỉ 1 chiến dịch.
5. Lưu dữ liệu thủ công vào LocalStorage của trình duyệt, gồm shortlist và lịch sử. Ảnh dùng chung được ghi một lần trong mỗi mục lịch sử để tiết kiệm dung lượng.
6. Giữ nguyên API `/api/ai`, xác minh Turnstile, hạn mức và kịch bản tạo 5 chiến dịch, thanh phần trăm chờ; không cài thêm thư viện.

## 3. Cập nhật Tenten/cPanel

1. **Sao lưu** website và các biến môi trường hiện có. Không đổi API key.
2. Dùng `MG_GD4_Media_4_8_Update_Tenten.zip` khi website đang chạy đúng bản `MG_GD4_Progress_1_100` gần nhất.
3. Vào thư mục ứng dụng Node.js; tải ZIP lên và giải nén **đúng cấu trúc thư mục**, ghi đè `index.html`, `studio.js`, `research-media.css`, `netlify/functions/media-research.js`, `package.json`.
4. Vào **Setup Node.js App → Restart**; sau đó mở website và bấm **Ctrl + F5**.
5. Mở lịch sử cũ hoặc tạo 5 chiến dịch mới, ở mỗi card nhấn **+ Thêm ảnh / nguồn**. Chọn ảnh sản phẩm và tích “Dùng cùng nguồn cho cả 5 chiến dịch đang mở”, rồi **Lưu nguồn**.

Nếu trước đó từng cập nhật nhầm các phiên bản trung gian (2.3.1/2.3.2), hãy sao lưu và dùng **bản Full Source** thay vì chỉ Update để tránh mã nguồn trộn.

## 4. Cấu hình nguồn (không bắt buộc)

- `MEDIA_RESEARCH_ENABLED=true` để bật tra cứu nguồn tự động (nếu chưa có).
- `MEDIA_GEMINI_IMAGE_SEARCH=false` là mặc định tiết kiệm chi phí. Đặt `true` chỉ khi bạn hiểu quota/tính phí và model Gemini có hỗ trợ.
- `SERPER_API_KEY` chỉ dùng khi bạn chủ động kết nối dịch vụ Serper; không bắt buộc, không có key vẫn tạo chiến dịch.
- Tất cả API key chỉ lưu ở server/cPanel, tuyệt đối không thêm vào file HTML hoặc JS phía trình duyệt.

## 5. Giới hạn quan trọng

- Không bảo đảm tự tìm được đúng ảnh/video/bài viết cho mọi sản phẩm. Khi không có kết quả, sẽ hiển thị trạng thái rõ ràng và nút bổ sung nguồn.
- Nguồn do người dùng nhập **không được xác minh tự động**; nên kiểm tra quyền sử dụng ảnh và độ tin cậy của bài/video.
- Ảnh tải lên được lưu **trên trình duyệt hiện tại**, không đồng bộ giữa thiết bị, có thể mất khi xoá dữ liệu trình duyệt. Trình duyệt có giới hạn dung lượng lưu trữ. Dùng nguồn URL HTTPS là lựa chọn tốt khi bạn cần lưu nhiều chiến dịch.
- Chưa thể kiểm chứng Gemini, nguồn ảnh và TikTok thật từ cPanel Tenten trong môi trường kiểm thử cục bộ.

## 6. Kiểm thử đã thực hiện

- `npm run check` và `npm test`: PASS (bao gồm kiểm thử mới về URL được xác minh, ảnh đúng mẫu, SSRF).
- `python tests/test-media-editor-ui.py`: PASS với Chromium 1366px & 390px — upload ảnh, áp dụng 5 chiến dịch, chỉnh riêng 1 chiến dịch, lưu lịch sử, từ chối URL HTTP, không có lỗi JS.
- `python tests/ui-stage4-smoke.py`: PASS 1366px, 768px, 390px — Demo, shortlist, lịch sử, không tràn ngang.
- GET `/healthz`, `/index.html`, `/studio.js`, `/research-media.css`, `/api/ai`: HTTP 200 trên Node.js local.
