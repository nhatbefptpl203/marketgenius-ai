# MarketGenius AI — Cuộc thi Vibe Coding 2026

## 1. Thông tin chung

| Hạng mục | Nội dung |
|---|---|
| Tên sản phẩm | MarketGenius AI — Trợ lý gợi ý ý tưởng và lập kế hoạch chiến dịch Marketing |
| Phiên bản | 1.4.1 — Smart Campaign Planner |
| Tên đội thi | Nhất Be |
| Bảng thi | Bảng B – Kinh tế |
| Đề bài bốc thăm | Đề số 09 — AI gợi ý ý tưởng chiến dịch Marketing |
| Demo online | https://ph67401.netlify.app/ |
| Mã nguồn GitHub | https://github.com/nhatbefptpl203/marketgenius-ai |
| Video demo (≤ 02 phút) | https://youtu.be/lpPmRCChvp0 |
| Source ZIP | https://drive.google.com/drive/folders/1Iq9A_Ag0ADJoX_9tCy1usCgqoNE3jdyO?usp=sharing |
| Minh chứng dùng AI | https://drive.google.com/drive/folders/1a6qlcuqww7-1W7o8R0GgHDh8GZLZxIJ-?usp=sharing |
| Bảng kiểm thử | Mục 11 của README này |

## 2. Tính năng chính

1. **Nhập thông tin chiến dịch:** Chọn ngành hàng, nhập tên sản phẩm/dịch vụ, mức ngân sách và mục tiêu chiến dịch; bổ sung khách hàng mục tiêu, ngân sách thực tế và điểm nổi bật của sản phẩm.
2. **AI đề xuất 05 ý tưởng:** Tạo 05 chiến dịch Marketing, mỗi chiến dịch có tên, kênh triển khai và nội dung chính phù hợp với thông tin đầu vào.
3. **Timeline triển khai 04 tuần:** Mỗi ý tưởng có kế hoạch thực hiện theo 04 tuần, hỗ trợ hiển thị theo bảng và đánh dấu tiến độ công việc.
4. **Lưu ý tưởng vào Shortlist:** Người dùng lựa chọn và lưu các chiến dịch yêu thích.
5. **Quản lý Shortlist:** Xem lại, xóa, sao chép nội dung và xuất kế hoạch sang PDF thông qua chức năng in của trình duyệt.

Các chức năng mở rộng gồm: lịch sử tạo chiến dịch, chỉnh sửa nội dung và KPI, phân bổ ngân sách, so sánh 02–03 chiến dịch, xuất báo cáo PDF, hướng dẫn lấy API Key và xác minh model AI trước khi lựa chọn. **Smart Campaign Planner** cho phép chọn các chiến dịch trong Shortlist, tổng hợp công việc theo 04 tuần, theo dõi tiến độ, lọc theo mức ngân sách của brief, sao chép Text/Markdown và mở Zalo/Telegram để chia sẻ. Giao diện so sánh trên điện thoại được tối ưu thành các thẻ dọc.

## 3. Công nghệ sử dụng

| Lớp | Công nghệ |
|---|---|
| Giao diện | HTML5, CSS3, JavaScript thuần; thiết kế responsive |
| Thư viện, tài nguyên giao diện | Google Fonts; biểu tượng SVG nhúng trực tiếp |
| Lưu trữ | localStorage trên trình duyệt |
| Tích hợp AI | Google Gemini API và OpenAI API |
| Backend | Netlify Functions (JavaScript) |
| Triển khai | GitHub và Netlify |
| Xuất báo cáo | HTML/CSS dành cho in và chức năng Save as PDF của trình duyệt |

## 4. Tích hợp AI

- **Chế độ hỗ trợ:** API thật qua Google Gemini hoặc OpenAI; đồng thời có chế độ DEMO sử dụng dữ liệu mô phỏng.
- **Chế độ sử dụng trong video nộp:** để Nhất điền
- **Model sử dụng trong video nộp:** để Nhất điền
- **Mục đích:** Phân tích ngành hàng, sản phẩm, khách hàng mục tiêu, ngân sách và mục tiêu Marketing; đề xuất 05 chiến dịch cùng nội dung, kênh triển khai, KPI và timeline 04 tuần.
- **Cách kết nối:** Người dùng nhập API Key của nhà cung cấp, hệ thống lấy danh sách model ứng viên và hỗ trợ xác minh model bằng yêu cầu thử trước khi sử dụng. Website gửi yêu cầu qua Netlify Functions để kết nối API của nhà cung cấp AI.
- **Bảo mật API Key:** API Key do người dùng nhập tại giao diện, không được ghi cố định vào mã nguồn hay lưu trong localStorage. Yêu cầu API được chuyển tiếp qua Netlify Functions.
- **Chế độ DEMO:** Nội dung mô phỏng được phân biệt với kết quả từ API thật.

## 5. Cài đặt và chạy local

**Yêu cầu:** Trình duyệt web hiện đại; Netlify CLI nếu sử dụng API thật tại máy cá nhân.

**Chạy chế độ DEMO:** Giải nén mã nguồn và mở `index.html` trên trình duyệt hoặc dùng máy chủ tĩnh.

**Chạy với Netlify Functions:**

```bash
npm install -g netlify-cli
netlify dev
```

Sau khi chạy, truy cập địa chỉ local do Netlify CLI cung cấp. Ứng dụng online được triển khai tại https://ph67401.netlify.app/.

## 6. Cấu trúc thư mục

```text
marketgenius-ai/
├── index.html
├── styles.css
├── app.js
├── studio.js
├── planner.js
├── netlify.toml
├── netlify/
│   └── functions/
│       └── ai.js
└── README.md
```

## 7. Truy cập và phân quyền

- Website không yêu cầu tạo tài khoản hoặc đăng nhập.
- Người dùng có thể tạo ý tưởng bằng chế độ DEMO hoặc kết nối API Key cá nhân để sử dụng AI thật.
- Người dùng quản lý Shortlist và lịch sử tạo chiến dịch trên trình duyệt của mình.
- Hệ thống chưa có tài khoản quản trị hoặc chức năng phân quyền nhiều người dùng.

## 8. Giới hạn hiện tại

- Shortlist và lịch sử được lưu cục bộ bằng localStorage, không tự đồng bộ giữa các thiết bị hoặc trình duyệt. Lựa chọn chiến dịch trong Smart Planner được thiết lập trong phiên làm việc hiện tại.
- Chưa có hệ thống tài khoản, cơ sở dữ liệu máy chủ và tính năng cộng tác nhóm.
- Tính năng xuất PDF thực hiện thông qua hộp thoại in của trình duyệt; người dùng chọn Save as PDF. Chia sẻ Zalo/Telegram yêu cầu tự chọn người nhận và dán nội dung đã sao chép, không tự động gửi tin nhắn.
- Chế độ DEMO sử dụng dữ liệu mô phỏng, không phải kết quả AI thật.
- API thật phụ thuộc quyền truy cập model, hạn mức và tình trạng hoạt động của Google Gemini/OpenAI. Việc xác minh model có thể sử dụng hạn mức hoặc phát sinh chi phí API.

## 9. Nguồn tham khảo

- Đề số 09 — AI gợi ý ý tưởng chiến dịch Marketing, Cuộc thi Vibe Coding 2026.
- Google Gemini API: https://ai.google.dev/gemini-api/docs
- OpenAI API: https://platform.openai.com/docs
- Netlify Functions: https://docs.netlify.com/build/functions/overview/
- Google Fonts: https://fonts.google.com/

## 10. Minh chứng dùng AI để xây dựng sản phẩm

**Mục tiêu:** Xây dựng công cụ hỗ trợ lên ý tưởng và lập kế hoạch chiến dịch Marketing đáp ứng 05 yêu cầu của Đề số 09.

**Quá trình thực hiện:** Sử dụng AI hỗ trợ xây dựng giao diện, viết mã nguồn HTML/CSS/JavaScript và Netlify Functions; triển khai lên GitHub, Netlify; thử nghiệm chức năng kết nối API và tạo chiến dịch.

**Vấn đề phát hiện khi thử nghiệm:** Lỗi giới hạn API (429), lỗi quá tải AI (503), tình trạng danh sách model hiển thị cả model không sử dụng được, cùng nhu cầu mở rộng chức năng quản lý chiến dịch.

**Cải tiến:** Bổ sung xử lý lỗi API, xác minh model Gemini/OpenAI, quản lý lịch sử, chỉnh sửa chiến dịch, phân bổ ngân sách, so sánh ý tưởng và xuất PDF.

**Ảnh hoặc liên kết minh chứng:** https://drive.google.com/drive/folders/1a6qlcuqww7-1W7o8R0GgHDh8GZLZxIJ-?usp=sharing

## 11. Bảng kiểm thử

https://docs.google.com/spreadsheets/d/1iCeeIeK1ZO3ySjoWLrN2zCm3Hb5caDt-fxjwuMzIvtU/edit?usp=sharing

## 12. Hồ sơ bàn giao

| Thành phần | Thông tin |
|---|---|
| Mã nguồn sản phẩm | MarketGenius AI phiên bản 1.4.1 |
| Source ZIP nộp bài | để Nhất điền |
| README | `README.md` |
| Video demo (≤ 02 phút) | để Nhất điền |
| Minh chứng sử dụng AI | để Nhất điền |
| Bảng kiểm thử | Mục 11 của README này |
| Tài khoản demo | Không yêu cầu đăng nhập |
| Dữ liệu DEMO | Có sẵn trong website |
