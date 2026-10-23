# MarketGenius AI — Vibe Coding 2026, Đề 09

Website gợi ý 5 ý tưởng chiến dịch Marketing, mỗi chiến dịch kèm kênh triển khai, nội dung chính, KPI, timeline 4 tuần. Lưu / xóa / xem / sao chép ý tưởng ở Shortlist.

## Có gì trong dự án?

- `index.html` — giao diện website, form và ô **người dùng tự nhập API Key**
- `styles.css` — giao diện responsive, màu xanh/tím
- `app.js` — tương tác, shortlist, chế độ demo, danh sách model có sẵn + tải danh sách model theo API Key
- `netlify/functions/ai.js` — serverless function trung gian kết nối **Gemini hoặc OpenAI**
- `netlify.toml` — cấu hình Netlify và đường dẫn `/api/ai`

## 1) Thử ngay khi chưa có API

Mở `index.html` bằng Chrome hoặc Edge → bấm **Thử demo**. Website tự điền ví dụ nếu form trống, sinh 5 ý tưởng DEMO và cho phép sử dụng đầy đủ lưu / xóa / copy / xem timeline. Đây là nội dung mẫu, **không phải** kết quả từ AI thật.

## 2) Chạy trên máy với Gemini/OpenAI thật

Cần Node.js 18+ và Netlify CLI.

```bash
npm install -g netlify-cli
cd marketgenius-ai
netlify dev
```

Vào đường dẫn localhost do `netlify dev` cung cấp (thường là http://localhost:8888).

Nếu CLI yêu cầu tạo/liên kết site Netlify, làm theo hướng dẫn terminal. Không cần cài package khác cho dự án.

Trên giao diện:

1. Chọn `Google Gemini` (mặc định) hoặc `OpenAI`.
2. Dán API Key **của chính bạn** vào ô API Key ở bên trái.
3. **Chọn model từ menu thả xuống** (có sẵn nhiều model Gemini và OpenAI, chia theo nhóm, có gợi ý mức ưu tiên). Không cần nhập thủ công.
4. Có thể bấm **Lấy model từ API Key** để gọi API danh sách model, bổ sung những model nhà cung cấp trả về (lọc sơ bộ những model văn bản). Chỉ cần nhập key trước khi bấm. Các model được trả về **chưa đảm bảo** có quyền tạo nội dung hoặc còn quota.
5. Nhấn **Kiểm tra kết nối** để kiểm tra key/model. Bước này kiểm tra model tồn tại / truy cập được, **chưa đảm bảo** yêu cầu tạo nội dung sẽ chạy được.
6. Nhập brief và nhấn **Tạo 5 ý tưởng** để gọi AI thật.
7. Chỉ khi không tìm thấy model cần dùng, chọn **Model khác (nhập ID nâng cao)** để nhập ID thủ công.

Gemini API Key: https://aistudio.google.com/apikey
OpenAI API Key: https://platform.openai.com/api-keys

> Nếu nhập đúng key nhưng API báo lỗi 403/404/429: kiểm tra quyền truy cập model, quota, tính năng billing và thay đổi model trong ô Model.

## 3) Đưa website lên Netlify

**Khuyến nghị**: đẩy cả thư mục dự án lên GitHub, trong Netlify chọn `Add new project` → `Import an existing project` → chọn repository. Netlify sẽ tự đọc `netlify.toml`, xuất bản website và function.

**Hoặc qua CLI**:

```bash
netlify login
cd marketgenius-ai
netlify init
netlify deploy --prod
```

Cần triển khai cả Netlify Function để gọi AI thật. **Chỉ tải `index.html` lên hosting tĩnh hoặc mở bằng file:// thì tính năng AI thật sẽ không hoạt động; chế độ demo vẫn chạy.**

## 4) Quyền riêng tư & lưu ý bảo mật

- API Key được nhập trên trang, gửi qua HTTPS đến Netlify Function của website khi người dùng nhấn Kiểm tra kết nối / Tạo ý tưởng, sau đó Function gửi tiếp đến nhà cung cấp AI. Key **không** được ghi vào `localStorage`, cookie hay code nguồn; cũng không ghi log bằng code của dự án.
- Vì Function nhận key trong yêu cầu, **chủ website/đơn vị hosting có khả năng truy cập key và dữ liệu yêu cầu**, ngay cả khi phần mềm này không lưu chúng. Chỉ nhập API Key trên deployment do bạn tự quản lý hoặc tin tưởng. Sử dụng API Key riêng, giới hạn ngân sách/quota và thu hồi ngay khi nghi ngờ lộ key.
- Cần phục vụ trang và Function qua HTTPS khi chạy thực tế; trên máy có thể dùng localhost.
- Shortlist được lưu **chỉ trong trình duyệt hiện tại** bằng `localStorage`. Không đồng bộ giữa thiết bị.
- Các tính năng AI có thể phát sinh chi phí theo chính sách nhà cung cấp và quota của tài khoản nhập API.

## 5) Tự kiểm thử

1. Nhấn Thử demo → có 5 ý tưởng.
2. Nhấn Xem chi tiết bất kỳ → có timeline đủ 4 tuần, KPI, ngân sách.
3. Nhấn Lưu shortlist → vào mục Shortlist, tải lại trang vẫn giữ.
4. Nhấn Copy tóm tắt / Copy tất cả → dán vào Zalo hoặc Notepad.
5. Nhấn Xóa → số lượng shortlist giảm; nút lưu tại trang chính trở về trạng thái chưa lưu.
6. Nhập API Key thật tại deployment Netlify → Kiểm tra kết nối → Tạo 5 ý tưởng thật.

Không đưa API Key vào repository, URL hay ảnh chụp màn hình.

## 6) Cập nhật v1.1: Danh sách lựa chọn model

- Chuyển ô nhập model thành **dropdown** cho cả Gemini và OpenAI, tự đổi danh sách khi thay nhà cung cấp.
- Tùy chọn **Lấy model từ API Key** dùng Netlify Function gọi `GET /v1beta/models` (Gemini) hoặc `GET /v1/models` (OpenAI) để đồng bộ. Có lọc sơ bộ các model không chuyên tạo văn bản, nhưng không thể đảm bảo mọi model lấy về đều dùng được với trang này.
- API Key không được lưu vào localStorage; khi chuyển nhà cung cấp, ô API Key được xóa để tránh vô tình gửi sang nền tảng khác.
- Các model hiện đại có thể khác nhau về tính năng, billing hoặc định dạng kết quả; nếu model báo lỗi, chọn model gợi ý khác rồi thử lại.
- Chế độ Demo và tất cả chức năng shortlist không thay đổi.
