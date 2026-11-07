# MarketGenius AI v2.1 — AI Quick Templates

Bản nâng cấp từ v2.0.1; thêm một endpoint `action: "guest-templates"` dùng Gemini có sẵn trên server để đề xuất 4 template Marketing từ tên sản phẩm, áp dụng vào form Chuyên sâu để người dùng chỉnh sửa. Cơ chế kiểm soát Turnstile/giới hạn lượt được giữ ở backend Node.js trên Tenten. Có fallback mẫu cơ bản khi AI không sẵn sàng.

**Cập nhật**: Xem `HUONG_DAN_CAP_NHAT_v2.1_AI_TEMPLATE.md`.

**File thay**: `index.html`, `smart-templates.js`, `smart-templates.css`, `server.js`, `netlify/functions/ai.js`.

**Bảo mật**: Không lưu GUEST_GEMINI_API_KEY trong file client, không cho chọn model backend từ request. Không coi dữ liệu AI suy luận là dữ kiện đã xác minh.
