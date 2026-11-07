# MarketGenius AI v2.2 — Product Research & Reference Media

Nâng cấp từ v2.1 AI Quick Templates, phục vụ Tenten cPanel Node.js 22, không cần thêm npm package.

Giữ nguyên: AI có sẵn (Gemini server-side), AI cá nhân, Smart Templates, 5 chiến dịch / timeline 4 tuần, form Chuyên sâu, Shortlist, Lịch sử, sửa chiến dịch, Smart Planner, in PDF, Cloudflare Turnstile.

**Tính năng mới:** sau khi tạo AI, nguồn tham khảo sẽ được tra cứu song song qua Gemini Google Search grounding. Từng card/chi tiết chiến dịch có khung ảnh sản phẩm (nếu tìm được ảnh có nguồn), liên kết review TikTok, bài viết/bài báo và truy vấn để tìm thêm. Tài liệu được kèm nguồn và cảnh báo tránh hiểu nhầm thành dữ liệu đã xác minh, đặc biệt với số lượt xem viral.

**Bảo mật:** Chỉ backend truy cập Google Search từ API Key đang lưu trong environment; các liên kết từ bên ngoài được lọc HTTPS. Backend chỉ kiểm tra OpenGraph trên một danh sách domain uy tín, tránh trở thành open proxy tùy ý. Nếu nguồn không có thật hoặc không tra cứu được, website để trạng thái thiếu nguồn thay vì tạo link giả.

**Chi phí:** Tính năng bổ sung tối đa 2 lượt Gemini grounded searches cho một lần tạo bộ 5 chiến dịch (trong trường hợp chưa có cache). Nên kiểm tra chi phí Gemini và hạn mức hosting. Cấu hình optional: `MEDIA_RESEARCH_ENABLED=false` để tắt phần tra cứu.

Xem `HUONG_DAN_CAP_NHAT_v2.2.md` để triển khai và xem các giới hạn kỹ thuật.
