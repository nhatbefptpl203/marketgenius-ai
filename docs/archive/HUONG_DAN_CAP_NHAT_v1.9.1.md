# Cập nhật MarketGenius AI v1.9.1 — Hiển thị dấu chấm số tiền

## Các ô được nâng cấp

- Ngân sách dự kiến (VNĐ): `8000000` → `8.000.000`.
- Giá bán một sản phẩm (VNĐ): `35000000` → `35.000.000`.
- Giới hạn ưu đãi khi chọn **Được giảm trực tiếp bằng VNĐ**: `500000` → `500.000`.
- Cửa sổ **Chỉnh sửa chiến dịch → Tổng ngân sách**: `12500000` → `12.500.000`.

Sử dụng dấu chấm theo cách viết tiền Việt Nam. Có thể dán `8,000,000` hoặc `8000000` và ứng dụng sẽ chuẩn hóa hiển thị thành `8.000.000`.

**Lưu ý:** Dấu phân cách chỉ để hiển thị. Dữ liệu lưu và gửi AI vẫn là số nguyên. Những ô **giảm theo %**, số lượng khách hàng, KPI không bị đổi thành ô tiền.

## Cập nhật trên Tenten (đang dùng v1.9)

1. Vào **cPanel → File Manager → marketgenius-ai**.
2. Có thể tải bản sao 3 file cũ `index.html`, `app.js`, `studio.js` về máy trước khi cập nhật.
3. Upload **MG_v191_Update_Tenten.zip** và chọn **Extract** ngay tại thư mục `marketgenius-ai`.
4. Xác nhận **ghi đè** 3 file cũ. Không lồng thêm thư mục bên trong.
5. Vào **Setup Node.js App → ứng dụng smartgear.website → Restart**.
6. Mở trang bằng `https://smartgear.website` và nhấn **Ctrl + Shift + R** (hoặc mở tab ẩn danh).
7. Vào **Lập kế hoạch chuyên sâu**, thử nhập `8000000`, kiểm tra hiển thị `8.000.000` và tạo 5 ý tưởng Demo.
8. Thử **Chỉnh sửa chiến dịch** để đảm bảo ngân sách cũng có dấu phân cách.

## Không cần thay đổi

- Không phải nhập lại Gemini API Key hoặc Turnstile trên cPanel.
- Không phải thay `server.js` hoặc `netlify/functions/ai.js`.
- Lịch sử, Shortlist, dữ liệu đã lưu trong trình duyệt được giữ nguyên.

## Phạm vi kiểm thử

Đã kiểm thử cục bộ bằng Chromium: nhập/dán số tiền, định dạng theo thời gian thực, chuyển giữa ưu đãi VNĐ và %, tạo 5 ý tưởng Demo, sửa ngân sách, khôi phục lịch sử, Mobile 390px. **Chưa kiểm thử với API Gemini/OpenAI thật trên Tenten.**
