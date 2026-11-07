# MarketGenius AI 5.2 — Tự động tìm ảnh/video bằng Pixabay + YouTube API

**Nền tảng:** cPanel Tenten, Node.js 20+, HTML/CSS/JS thuần, không npm dependency mới.

**Các chức năng giữ nguyên:** Gemini tạo 5 chiến dịch + timeline 4 tuần, thanh % ước tính, Demo, lịch sử, shortlist, PDF, các tính năng bản 4.9 và Browser Use 5.1 (nếu được bật).

## 1) Chọn file để cài

- Nếu website hiện tại là **Browser Use v5.1**, tải `MG_GD4_Free_Media_5_2_Update_Tenten.zip`, giải nén đè đúng cấu trúc vào thư mục chứa `server.js`.
- Nếu website còn là **4.9 hoặc cũ hơn**, dùng `MG_GD4_Free_Media_5_2_Full_Source.zip` và **sao lưu trước**; không dùng Update 5.2 đè lên mã 4.9 vì Update không chứa các file có từ 5.1.
- Cả hai: **không** xóa file chứa cấu hình riêng, và không ghi key trực tiếp vào JavaScript công khai.

## 2) Lấy PIXABAY_API_KEY miễn phí

1. Mở https://pixabay.com/api/docs/ và đăng nhập/đăng ký Pixabay.
2. Trên trang tài liệu khi đã đăng nhập, xem mục `key` (khóa gắn với tài khoản Pixabay).
3. Copy key. **Không gửi key qua tin nhắn/chat, không đưa vào HTML hoặc GitHub.**
4. API hỗ trợ cả ảnh và video tư liệu; mặc định giới hạn 100 yêu cầu trong 60 giây và yêu cầu cache kết quả 24 giờ.

## 3) Lấy YOUTUBE_API_KEY (đề xuất, để tìm review/hướng dẫn đúng tên sản phẩm)

1. Mở https://console.cloud.google.com/ và tạo/chọn Google Cloud project.
2. `APIs & Services` → `Library` → tìm **YouTube Data API v3** → `Enable`.
3. `APIs & Services` → `Credentials` → `Create credentials` → `API key`.
4. Trong phần hạn chế khóa, đặt **API restrictions = YouTube Data API v3**. Khóa dùng **từ máy chủ Node**, không phải khóa ứng dụng web chạy trong trình duyệt. Nếu Tenten có IP ra ngoài cố định, có thể đặt Application restrictions là IP addresses; nếu không có IP cố định thì bảo vệ khóa bằng bí mật trên server + quota/budget Google Cloud, và kiểm tra restrictions phù hợp. Đừng đặt HTTP referrer restriction cho khóa dùng từ Node.
5. Copy key vào cPanel (không gửi trong chat).
6. Giới hạn tìm kiếm mặc định `search.list` hiện được Google công bố là 100 lượt/ngày (có thể thay đổi). Một bộ 5 chiến dịch thường cần **tối đa 5 lượt YouTube search**, sau đó kết quả được cache trong bộ nhớ 20 phút.

## 4) Cấu hình trên cPanel Tenten

Mở **Setup Node.js App → ứng dụng MarketGenius → Environment variables** (tên giao diện có thể hơi khác). Thêm:

| Key | Value |
| --- | --- |
| `FREE_MEDIA_ENABLED` | `true` |
| `PIXABAY_API_KEY` | `<key Pixabay của bạn>` |
| `YOUTUBE_API_KEY` | `<key YouTube của bạn>` |
| `FREE_MEDIA_DAILY_LIMIT` | `15` |
| `FREE_MEDIA_IP_DAILY_LIMIT` | `3` |
| `FREE_MEDIA_CONCURRENCY` | `1` |
| `FREE_MEDIA_IMAGE_CACHE_MB` | `150` |
| `BROWSER_USE_ENABLED` | `false` (nếu muốn tránh Cloud tính phí) |

Có thể chỉ cấu hình Pixabay (ảnh + video stock) hoặc chỉ YouTube (video), nhưng muốn đủ hai nguồn thì cần cả hai key. Không cấu hình key thì việc tạo chiến dịch vẫn hoạt động.

**Quan trọng về cache:** Ứng dụng tự tạo thư mục ẩn `.media-cache/pixabay` (JSON lưu tối thiểu 24h) và `.media-cache/images` (tệp ảnh đã tải về trên máy chủ). Thư mục ứng dụng Node.js **phải có quyền ghi**. Hãy giữ thư mục này khi cập nhật. Không giải nén ZIP vào thư mục public web khác; `server.js` chỉ cho phép file tĩnh định trước, không công khai cache.

Bấm **Save → Restart** ứng dụng, sau đó làm mới website bằng `Ctrl + F5`.

## 5) Kiểm tra đã kết nối chưa (không lộ key)

Mở: `https://TEN-MIEN-CUA-BAN/api/free-media/status`

Nếu cấu hình đủ hai key và ứng dụng đã Restart, bạn sẽ thấy:

```json
{"ok":true,"enabled":true,"pixabay":true,"youtube":true}
```

Nếu một dịch vụ có `false`, hãy kiểm tra tên biến, key và Restart. `status` chỉ xác nhận **đã cấu hình** key, chưa kiểm tra được tính hợp lệ thực tế.

## 6) Tạo thử chiến dịch

1. Mở MarketGenius → **Tạo chiến dịch** → nhập tên sản phẩm, ngành, đối tượng, ngân sách và mục tiêu.
2. Chọn **AI có sẵn**, hoàn thành Turnstile và bấm Tạo.
3. Gemini trả **5 chiến dịch** trước. Sau đó một dòng trạng thái hiển thị **“Đang tìm ảnh Pixabay và video YouTube/Pixabay riêng cho 5 chiến dịch…”**.
4. Tìm xong, ảnh/video tự điền cho từng chiến dịch nếu API có kết quả phù hợp. Lịch sử cũng được cập nhật.
5. Vào từng chiến dịch để xem liên kết nguồn/ảnh. Nguồn có thể thiếu nếu nhà cung cấp không có kết quả đúng chủ đề.

Lỗi thường gặp:

- **HTTP 401/403:** key sai, API chưa Enable, hạn chế key sai, hoặc dịch vụ từ chối; giao diện sẽ hiển thị không lấy được nguồn, chiến dịch Gemini vẫn giữ nguyên.
- **HTTP 429:** đã chạm hạn mức từ Pixabay/Google; hệ thống không dùng đường dẫn giả để lấp chỗ trống.
- **Không có ảnh:** sản phẩm ít phổ biến hoặc không có stock đúng thương hiệu. Pixabay chủ yếu là **tư liệu minh họa**, không có cam kết đúng mẫu sản phẩm.
- **Ảnh mất sau khi lâu ngày:** kiểm tra quyền ghi và giới hạn `FREE_MEDIA_IMAGE_CACHE_MB`; không xóa `.media-cache/images` nếu vẫn cần dùng ảnh trong lịch sử.
- **Mất nguồn sau reload:** trình duyệt phải cho phép `localStorage`; lưu lịch sử trên đúng thiết bị/website.
- **Vẫn thấy Browser Use:** kiểm tra `BROWSER_USE_ENABLED=false` và chắc chắn đã Restart.

## 7) Quyền sử dụng và bảo mật

- Ảnh Pixabay là tư liệu theo Pixabay Content License. Kiểm tra hạn chế thương hiệu, người xuất hiện, việc sử dụng trong quảng cáo; liên kết ảnh có nguồn Pixabay và tác giả.
- Video YouTube chỉ là liên kết tham khảo, **không có quyền tải lại/reupload video của người khác**.
- Ảnh trả từ Pixabay được lưu vào thư mục không public trực tiếp, và phát cho website từ URL nội bộ `/api/free-media/image/<hash>` để tránh hotlink vĩnh viễn.
- Hệ thống không cho khách nhập tùy ý URL tìm kiếm vào API; chỉ cung cấp vé dùng một lần sau **Gemini tạo thành công 5 chiến dịch**. Có hạn mức tổng và theo IP để chống lạm dụng. Giới hạn trong RAM được reset khi Node restart; hạn mức nhà cung cấp vẫn áp dụng.
- Không đẩy key, thư mục `.media-cache`, bản backup `.env` lên GitHub.

**Chưa kiểm tra trực tiếp** Pixabay và YouTube API bằng key của bạn hoặc mạng hosting Tenten. Bộ test đi kèm dùng mock để kiểm tra đúng endpoint, dữ liệu và bảo vệ key.
