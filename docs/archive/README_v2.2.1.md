# MarketGenius AI v2.2.1 — Product Photos

Sửa bộ tìm ảnh v2.2: nới lọc kết quả web, tìm `og:image` trực tiếp từ trang có dẫn link, bổ sung Openverse và Wikimedia Commons nếu Gemini Google Search không có ảnh. Gắn tối đa 5 URL ảnh ứng viên vào mỗi chiến dịch để tự đổi ảnh khi hotlink lỗi. Không thêm dịch vụ trả phí hoặc API Key. Không thay backend chính `server.js`.

## Tests

```bash
node tests/test-media-research.js
node tests/test-direct-images.js
node tests/test-full-ai-flow.js
```

Các ảnh tham khảo của sản phẩm thật chỉ được hiển thị khi có URL ảnh thực tế từ kết quả tìm kiếm hoặc kho ảnh công khai. Không phải mọi sản phẩm đều có ảnh tìm được; không thay thế bằng ảnh máy khác hay URL bịa.
