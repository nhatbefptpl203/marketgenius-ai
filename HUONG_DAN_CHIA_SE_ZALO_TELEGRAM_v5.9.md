# MarketGenius AI v5.9 — Menu thao tác & chia sẻ nhanh

## Nâng cấp từ v5.8

Giữ nguyên JSON chiến dịch, API Gemini, Smart Template, Shortlist, Lịch sử, LocalStorage, Planner, so sánh, chỉnh sửa và xuất PDF.

### Đã sửa

- Sửa nguyên nhân nút `...` bị trống: `icon('more')` chưa được khai báo trong registry. Dùng trực tiếp biểu tượng `#i-more` có sẵn trong SVG HTML và nhãn **Thao tác**.
- Nút chuyển thành gradient cam san hô, dễ nhận biết trên desktop/mobile, với trạng thái hover và focus.
- Menu phân nhóm rõ: quản lý (Chỉnh sửa, Xuất PDF, Sao chép, Xóa khỏi Shortlist nếu đang xem Shortlist) và chia sẻ (Zalo, Telegram).
- Hai lựa chọn Zalo/Telegram có ngay trong modal Xem chi tiết.
- Chia sẻ **nội dung của đúng chiến dịch được chọn**, gồm tên, kênh, ý tưởng, điểm nhấn, KPI và kế hoạch bốn tuần. Không gửi dữ liệu lên máy chủ MarketGenius và không cần API key mạng xã hội.

### Cách chia sẻ

**Telegram:** Nhấn Thao tác → Gửi qua Telegram. Trình duyệt mở công cụ chia sẻ của Telegram với nội dung tóm tắt chiến dịch và liên kết trang MarketGenius. Người dùng tự chọn nhóm/người nhận, kiểm tra nội dung và xác nhận Gửi. Lưu ý liên kết website chỉ dẫn tới trang chủ; **nội dung chiến dịch nằm trong phần văn bản chia sẻ**, không phải một trang chiến dịch công khai.

**Zalo trên điện thoại:** Nhấn Thao tác → Gửi qua Zalo. Nếu trình duyệt hỗ trợ chức năng Chia sẻ của thiết bị, chọn Zalo trong danh sách ứng dụng, sau đó chọn người nhận và xác nhận Gửi.

**Zalo trên máy tính / trình duyệt không hỗ trợ:** Website sao chép tóm tắt chiến dịch và mở https://chat.zalo.me/ trong tab mới. Đăng nhập nếu cần, chọn cuộc trò chuyện, nhấn Ctrl+V rồi tự nhấn Gửi. Zalo không có URL công khai được tài liệu hóa để tự động điền tin nhắn vào bất kỳ cuộc trò chuyện cá nhân nào, vì vậy đây là luồng thao tác thủ công có hỗ trợ sao chép, **không phải tính năng tự gửi tin**.

**Không nên gửi các dữ liệu brief nhạy cảm:** Hãy kiểm tra nội dung trước khi chọn người nhận. Website chỉ chia sẻ khi người dùng bấm nút tương ứng.

### Cập nhật trên cPanel Tenten

1. Sao lưu `marketgenius-ai/index.html`, `marketgenius-ai/studio.js`, `marketgenius-ai/saas-design.css`.
2. Upload `MG_v59_Share_Update_Tenten.zip` vào đúng thư mục `marketgenius-ai` (Application root), chọn Extract tại chính thư mục này, chấp nhận ghi đè 3 file.
3. Vào **Setup Node.js App → Restart**.
4. Mở website, nhấn `Ctrl+Shift+R` nếu còn cache cũ.
5. Tạo 5 ý tưởng bằng Demo, mở nút **Thao tác** trên mỗi thẻ, thử hai tùy chọn; lưu một ý tưởng rồi thử lại trong **Ý tưởng đã lưu**. Mở **Xem chi tiết** để kiểm tra nút chia sẻ trong modal.

Không cần thêm API key, thư viện npm, hoặc biến môi trường. Cũng không cần thay `server.js`.

### Kiểm thử

- `npm run check`: PASS.
- `npm test`: 16/16 nhóm test tích hợp cũ PASS.
- `node tests/test-share-v59.js`: PASS.
- Bài thử DOM/JS trên Chromium 1366px và 390px: PASS cho menu, Telegram URL, native share Zalo giả lập, Zalo clipboard fallback giả lập, modal và Shortlist; không ghi nhận lỗi JavaScript.
- **Chưa kiểm tra gửi thật** trên tài khoản Zalo/Telegram của người dùng hoặc hosting Tenten.

### Tài liệu API

- Telegram Share: https://core.telegram.org/widgets/share
- Zalo Share Plugin (nếu sau này có Official Account / plugin chính thức): https://docs.zaloplatforms.com/docs/Social/social-plugin/nut-chia-se
