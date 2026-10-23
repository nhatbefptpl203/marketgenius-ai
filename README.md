# MarketGenius AI — Campaign Studio v1.3

Website dự thi **Vibe Coding 2026 — Đề 09: AI gợi ý ý tưởng chiến dịch Marketing**. Giữ nguyên năm chức năng gốc, đồng thời bổ sung khả năng quản lý, chỉnh sửa và xuất kế hoạch.

## Thành phần dự án

```text
marketgenius-ai/
├── index.html               Giao diện chính, hướng dẫn lấy API Key
├── styles.css               CSS responsive, bảng/biểu mẫu và bản in A4
├── app.js                   Gemini/OpenAI, chế độ Demo, Shortlist
├── studio.js                MỚI v1.3: lịch sử, chỉnh sửa, so sánh, PDF, xử lý lỗi
├── netlify.toml             Cấu hình publish và đường dẫn API
├── netlify/
│   └── functions/
│       └── ai.js            API proxy Netlify Functions
└── README.md
```

**Quan trọng:** File mới `studio.js` phải được đặt cùng cấp với `index.html` và `app.js` khi upload lên GitHub.

## Chức năng bắt buộc từ đề bài

1. Nhập **ngành hàng, tên sản phẩm, ngân sách thấp/trung bình/cao và mục tiêu chiến dịch**; thêm khách hàng mục tiêu, ngân sách VNĐ, điểm nổi bật nếu có.
2. Gemini/OpenAI đề xuất **đúng 5 ý tưởng** gồm tên, kênh, nội dung. Có chế độ DEMO rõ ràng khi không dùng API.
3. Mỗi ý tưởng có timeline **4 tuần riêng**.
4. Lưu/bỏ lưu từng ý tưởng vào Shortlist.
5. Shortlist có xem, xóa, sao chép và xuất PDF.

## 7 nâng cấp trong bản 1.3

- **Xử lý lỗi AI:** lỗi 429 có giải thích về rate limit/quota; lỗi 503 được thử lại tối đa **một lần** sau khi chờ ngắn. Có nút hủy phía trình duyệt, bảng hướng dẫn và liên kết kiểm tra giới hạn tương ứng Gemini/OpenAI. Khi hủy phía trình duyệt, tác vụ AI được gửi đến nhà cung cấp trước đó có thể vẫn chạy và phát sinh chi phí.
- **Lịch sử:** tự lưu tối đa 18 lần tạo, mỗi lần 5 chiến dịch; xem lại, mở lại, xóa hoặc xuất PDF. Chỉ lưu trong `localStorage` của trình duyệt hiện tại, không đồng bộ thiết bị.
- **Chỉnh sửa:** tên, kênh, nội dung, khách hàng, hook, KPI, 4 nhiệm vụ tuần, tổng ngân sách và tỷ trọng chi phí.
- **Phân bổ ngân sách:** bảng 5 hạng mục tỷ lệ **tổng 100%**. Nếu người dùng nhập tiền VNĐ thì tự tính số tiền cho từng hạng mục; nếu không, chỉ hiển thị tỷ lệ tham khảo. Các tỷ lệ mẫu là giả định công cụ, không phải báo giá thị trường.
- **Timeline tương tác:** xem dạng bảng, đánh dấu công việc của từng tuần đã hoàn thành; trạng thái được lưu khi chỉnh sửa chiến dịch.
- **So sánh:** tích chọn 2–3 chiến dịch, đối chiếu kênh, mục tiêu, nội dung, ngân sách, KPI, 4 tuần và tiến độ.
- **Xuất PDF:** tại chiến dịch, kết quả 5 chiến dịch, Shortlist, lịch sử hoặc trang so sánh; bản in A4 sử dụng font Unicode để chữ tiếng Việt hiển thị đúng.

### Cách xuất PDF

Nhấn **Xuất PDF** → trình duyệt mở cửa sổ In → trong mục **Destination / Máy in**, chọn **Save as PDF / Lưu dưới dạng PDF** → **Save/Lưu**. Không cần cài thư viện bên ngoài, không gửi dữ liệu đến máy chủ để xuất PDF.

## Dùng nhanh (không cần API)

1. Mở file `index.html` bằng Chrome hoặc Edge.
2. Nhấn **Thử demo** để sinh 5 ý tưởng mẫu (được đánh dấu DEMO, không gọi AI).
3. Nhấn **Chỉnh sửa**, **Xem chi tiết**, **Lưu shortlist**, **Lịch sử**, chọn **So sánh** và **Xuất PDF** để thử toàn bộ tính năng.

*Lưu ý:* Chức năng Demo có nội dung mẫu cố định theo ngành/sản phẩm, còn AI thật yêu cầu có Netlify Function và API Key hợp lệ.

## Dùng Gemini hoặc OpenAI thật

1. Triển khai **cả thư mục** lên Netlify thông qua GitHub, không chỉ `index.html`.
2. Chọn **Google Gemini** hoặc **OpenAI** trong thanh bên. Xem hướng dẫn lấy API Key có sẵn, kèm liên kết chính thức:
   - Gemini: https://aistudio.google.com/apikey
   - OpenAI: https://platform.openai.com/api-keys
3. Dán **API Key cá nhân**. Website tự lấy các ID model tạo văn bản mà nhà cung cấp liệt kê, không có danh sách model cố định khi chưa nhập key.
4. Chọn model → nhấn **Kiểm tra kết nối** → nhập brief và nhấn **Tạo 5 ý tưởng**.
5. Model được liệt kê và kết nối thành công **chưa đảm bảo còn quota, tương thích 100% với định dạng JSON hoặc đủ quyền tạo nội dung**. Nếu gặp lỗi, xem lời giải thích trên website.

### Giải thích lỗi phổ biến

- **429:** có thể bị giới hạn lượt gọi/token ngắn hạn (RPM/TPM), hết quota ngày hoặc hết hạn mức chi tiêu. Kiểm tra trang Rate Limits/Billing; website không tự spam retry 429 vì không thể biết chắc khi nào quota mở lại.
- **503:** nhà cung cấp quá tải tạm thời. Website tự thử lại một lần trong yêu cầu tạo chiến dịch, sau đó yêu cầu người dùng chủ động thử lại hoặc đổi model.
- **401/403:** kiểm tra key, quyền dự án và model.
- **404/400:** tải lại model từ API Key, chọn model văn bản phù hợp.

## Triển khai/cập nhật Netlify từ GitHub

1. Giải nén ZIP. Mở thư mục `marketgenius-ai`.
2. Đảm bảo toàn bộ file trong thư mục dự án được đẩy lên repository, nhất là file mới `studio.js` và đường dẫn `netlify/functions/ai.js`.
3. Trong GitHub, cập nhật file cũ và thêm file mới vào nhánh `main`, rồi Commit changes. Có thể dùng GitHub Desktop để đồng bộ toàn bộ thư mục dễ dàng hơn khi thay nhiều file.
4. Netlify đang liên kết repository sẽ tự redeploy khi nhận commit mới (nếu tính năng deploy tự động đang bật).
5. Trong Netlify, cấu hình: **Build command** trống; **Publish directory** `.`; **Functions directory** `netlify/functions` (đã thiết lập trong `netlify.toml`).
6. Mở https://ph67401.netlify.app/ và nhấn **Ctrl + Shift + R** để lấy bản mới. Kiểm tra thanh bên có mục **Lịch sử tạo** và góc dưới có `v1.3`.

### Chạy trên máy bằng Netlify CLI (AI thật)

```bash
npm install -g netlify-cli
cd marketgenius-ai
netlify dev
```

Không cần npm dependencies trong mã nguồn ứng dụng. Chế độ Demo có thể chạy bằng cách mở file HTML trực tiếp.

## Quyền riêng tư

- API Key chỉ lưu **trong bộ nhớ của tab** và gửi theo HTTPS tới Netlify Function rồi tới dịch vụ AI tương ứng; không lưu vào cookie hoặc `localStorage`, không ghi vào code nguồn của dự án.
- Shortlist và lịch sử sẽ lưu **nội dung chiến dịch/brief** trong `localStorage` thiết bị hiện tại. Không sử dụng để lưu thông tin khách hàng nhạy cảm.
- Chủ website/host vẫn có khả năng truy cập key trong request (dù mã nguồn không chủ động lưu). Chỉ nhập key vào website đáng tin cậy, nên giới hạn quyền/quota và xóa/thu hồi khi nghi ngờ rò rỉ.
- Chế độ Demo, các thao tác chỉnh sửa và xuất PDF không tiêu tốn token AI. AI thật có thể mất phí theo model và dự án của người dùng.
- Website chưa có tài khoản, đồng bộ dữ liệu hay hệ thống phân quyền làm việc nhóm.

## Kiểm thử trước khi nộp bài

- [ ] Demo tạo đủ 5 ý tưởng, mỗi ý tưởng đủ 4 tuần.
- [ ] Chỉnh sửa nội dung và ngân sách, tỷ lệ tổng phải đúng 100%.
- [ ] Lưu và xóa Shortlist, tải lại trình duyệt vẫn còn dữ liệu đã lưu.
- [ ] Lịch sử có lần tạo vừa rồi và nút mở lại hoạt động.
- [ ] So sánh 2–3 chiến dịch; trường hợp 4 chiến dịch phải bị giới hạn.
- [ ] Xuất PDF giữ đúng tiếng Việt và định dạng bảng A4.
- [ ] Nhập API Key thật trên Netlify: danh sách model tải được và gọi AI có nội dung thật (cần quota).
- [ ] Giới hạn 429/503 thông báo rõ, giữ nguyên brief đã nhập.

> Bản 1.3 đã được kiểm thử UI trong trình duyệt bằng dữ liệu DEMO và bằng phản hồi 429/503 mô phỏng. Đã kiểm thử bản in A4 với PDF có thể chọn và sao chép chữ tiếng Việt. Chưa thử API Key thật của người dùng.
