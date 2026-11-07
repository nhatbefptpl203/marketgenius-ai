# MarketGenius AI v2.2 — Ảnh sản phẩm, TikTok, bài viết có nguồn

## Cập nhật trên cPanel Tenten

1. **Sao lưu** thư mục `marketgenius-ai` (hoặc ít nhất các file sẽ ghi đè).
2. Vào **cPanel → File Manager → marketgenius-ai**.
3. Upload `MG_v22_Update_Tenten.zip` trực tiếp vào **thư mục gốc ứng dụng**, nhấn **Extract** rồi cho phép **ghi đè file cũ**.
4. Kiểm tra vị trí các file:
   - `index.html` — giao diện
   - `app.js` — nhận và giữ lại liên kết đã được tra cứu
   - `studio.js` — ảnh, video, bài viết trong card/chi tiết/PDF
   - `research-media.css` — giao diện nguồn tham khảo (MỚI)
   - `server.js` — cho phép tải CSS mới
   - `netlify/functions/ai.js` — kích hoạt tìm nguồn trong cùng lần tạo
   - `netlify/functions/media-research.js` — truy vấn Gemini Google Search và kiểm tra URL (MỚI)
   - `package.json` — nâng version / script kiểm tra
5. Vào **Setup Node.js App → Restart**. Không thay đổi Node.js 22, startup file `server.js` hay Application Root.
6. Mở `https://smartgear.website` và **Ctrl + Shift + R** để xóa cache.
7. Chọn **AI có sẵn**, nhập brief, xác minh Turnstile và tạo 5 chiến dịch **mới**. Trong từng card sẽ xuất hiện mục **Hình ảnh & nguồn tham khảo**. Nhấn **Xem chi tiết** để xem các liên kết và phần ghi chú.

**Không nhập lại API Key**: tính năng sử dụng `GUEST_GEMINI_API_KEY` và `GUEST_GEMINI_MODEL` đã lưu trên hosting. Không có API Key nào được đóng gói trong ZIP.

## Tính năng

- Trong cùng một lần tạo chiến dịch, backend gọi Gemini có Google Search grounding để tìm nguồn về **đúng tên sản phẩm**.
- Một nguồn ảnh có thể đến từ kết quả Image Search metadata (khi model hỗ trợ) hoặc ảnh `og:image` của trang sản phẩm/bài viết liên quan đã tìm thấy. Ảnh dẫn về trang nguồn và có ghi chú bản quyền.
- Link video TikTok có URL dạng `/@.../video/ID`, ưu tiên URL Google Search trả về. Máy chủ thử kiểm tra TikTok oEmbed để bổ sung xác nhận khi khả dụng.
- Bài viết/bài báo lấy từ metadata tìm kiếm, không dùng URL do AI tự viết ra nếu chưa kiểm chứng.
- Nếu không có ảnh/video/bài báo phù hợp, hệ thống **không bịa nguồn**: ghi rõ chưa tìm được và dẫn người dùng đến trang tìm kiếm tương ứng.
- Mỗi chiến dịch hiển thị nguồn trong card, phần chi tiết, Shortlist và PDF (khi lưu chiến dịch mới).
- 5 chiến dịch cùng một sản phẩm **có thể dùng chung nguồn tham khảo sản phẩm**. Không ngụ ý đó là ví dụ chứng minh hiệu quả của từng chiến thuật.

## Giới hạn cần biết

- **Không bảo đảm có ảnh hoặc video cụ thể** cho mọi sản phẩm, đặc biệt với sản phẩm mới, chưa công bố hoặc tên rất mơ hồ.
- **“Viral” chưa xác nhận**: API công khai TikTok oEmbed không cung cấp số lượt xem trong dữ liệu đang khai thác; hệ thống không ghi nhãn viral hay bịa view.
- Ảnh từ trang báo/trang sản phẩm chỉ là **ảnh tham khảo có nguồn**, không được mặc nhiên xem là ảnh chính chủ của cửa hàng hoặc có quyền sử dụng cho quảng cáo. Cần kiểm tra phiên bản và quyền sử dụng ảnh.
- Một số nguồn chặn tải ảnh trực tiếp; website sẽ báo không hiển thị được ảnh và vẫn cung cấp đường dẫn trang nguồn.
- Nguồn Google có thể thay đổi, bị xóa hoặc không trả về video TikTok do khả năng lập chỉ mục.
- Google Search grounding là yêu cầu AI bổ sung (thường **2 lượt tra cứu** cho mỗi lần tạo bộ 5 chiến dịch). Có thể phát sinh chi phí/hạn mức nhà cung cấp. Máy chủ cache các kết quả tìm được theo tên sản phẩm trong khoảng 20 phút để tiết kiệm lượt tìm.
- Có thể tạm ngừng tính năng tra cứu bằng cách thêm biến môi trường `MEDIA_RESEARCH_ENABLED=false` trong Setup Node.js App và Restart; các chức năng tạo 5 chiến dịch vẫn hoạt động.
- Chiến dịch **đã lưu từ các phiên bản cũ** không tự tải thêm nguồn. Hãy tạo mới để có dữ liệu.

## Nếu không thấy nguồn

1. Mở đúng kết quả vừa tạo, không mở bản cũ trong Lịch sử.
2. Dùng AI có sẵn và nhập tên sản phẩm rõ (thương hiệu + dòng sản phẩm + phiên bản).
3. Kiểm tra hosting có thể ra Internet đến `generativelanguage.googleapis.com`.
4. Kiểm tra `GUEST_GEMINI_MODEL` có hỗ trợ `google_search` grounding. Không phải model nào cũng hỗ trợ. Nếu không, 5 chiến dịch vẫn được tạo và có ghi chú nguồn chưa tìm được.
5. Kiểm tra hạn mức và billing Gemini trong Google AI Studio/Cloud Console. Không chia sẻ API Key hoặc Turnstile Secret qua ảnh chụp.
6. Các URL `google.com/search` và `tiktok.com/search` trong giao diện chỉ là **trang tìm kiếm thêm**, không được trình bày như video/bài báo xác thực.

## Kiểm thử đã thực hiện

- `npm run check`: kiểm tra cú pháp JavaScript.
- `node tests/test-media-research.js`: kiểm thử trích nguồn, lọc liên kết, tránh lẫn phiên bản và phương án dự phòng.
- `node tests/test-full-ai-flow.js`: mô phỏng Gemini + Turnstile trên backend, xác nhận 5 chiến dịch nhận thông tin nguồn mà không lộ API Key.
- `curl -I http://localhost:<PORT>/research-media.css`: kiểm tra Node.js phục vụ CSS mới.
- **Chưa kiểm chứng bằng API Key thực trên hosting Tenten**; chưa xác minh ảnh/video thật cho sản phẩm cụ thể trên production. Trình duyệt kiểm thử trong môi trường này bị chính sách chặn điều hướng URL, nên không tuyên bố đã kiểm thử giao diện bằng Chromium.
