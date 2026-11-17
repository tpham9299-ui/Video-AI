# Sửa code lần 21: ảnh bìa thiết kế, loại câu hỏi, danh sách phát theo lớp

## 1. Ảnh bìa thiết kế riêng cho từng video
GitHub dựng ảnh bìa 1080x1920 bằng Remotion (composition `AnhBia`) **trước khi** dựng video. Ảnh gồm:
- **Trên cùng:** logo kênh · `LỚP n` · **LOẠI CÂU HỎI** (mỗi loại một màu) · `TẬP n` của series.
- **Tiêu đề chữ khối cực lớn** (`tieu_de_bia` do AI viết, 3-7 từ; thiếu thì dùng câu móc). Cụm từ khóa nằm trên nền màu của loại câu hỏi.
- **Giữa:** ô kính viền neon chứa **hình minh họa thật của đề**, lấy từ chính video (bông tuyết, bể nước, đồ thị...) ở lúc đã vẽ xong. Nền là cảnh đó phóng to, làm mờ.
- **Dưới:** câu mời gọi theo loại ("BẠN ĐOÁN ĐÚNG KHÔNG?", "CÁCH TIẾT KIỆM NHẤT?", "NHÌN HÌNH LÀ HIỂU"...) và "ĐÁP ÁN: ???".

Ảnh bìa được dùng ở 2 nơi:
- **YouTube:** đặt làm ảnh bìa qua API. Kênh phải **xác minh số điện thoại** (youtube.com/verify). Với Shorts, YouTube có thể vẫn hiện khung hình tự chọn trong luồng Shorts; ảnh bìa riêng hiện ở trang kênh, kết quả tìm kiếm và danh sách phát.
- **TikTok:** TikTok không cho tải ảnh bìa riêng qua API, chỉ cho chọn một khung hình. Vì vậy ảnh bìa được đặt làm **khung hình đầu tiên của video** (1/30 giây, mắt không nhận ra) và TikTok lấy khung đó làm ảnh bìa.

Không dựng được ảnh bìa thì video vẫn dựng bình thường.

## 2. Loại câu hỏi (màu)
| Loại | Màu | Nhận biết |
|---|---|---|
| Xác suất | tím | đề xác suất |
| Hình học | xanh dương | fractal, tam giác, đường tròn, đa giác, hình vẽ |
| Tối ưu | xanh lá | lớn nhất / nhỏ nhất / tốn ít nhất |
| Toán tiền bạc | vàng | lãi suất, tiết kiệm, lợi nhuận, giá bán |
| Đo đạc | hồng | chiều cao, khoảng cách, góc nâng, thang |
| Toán đi chợ | cam | bài có sản phẩm |
| Toán thực tế | ngọc | còn lại |

Loại câu hỏi còn được thêm vào thẻ (hashtag) khi đăng.

## 3. Danh sách phát YouTube theo lớp
Mỗi video tự vào (tạo danh sách nếu chưa có, không thêm trùng):
- **"Toán lớp 10" / "Toán lớp 11" / "Toán lớp 12"**
- **"Lớp 12 · Xác suất"**, "Lớp 11 · Hình học"... (lớp + loại câu hỏi)

Cấu hình CAU_HINH > `PLAYLIST_THEO` (mặc định `lop,lop_loai`); thêm `,series` nếu muốn cả danh sách phát theo series.
**Video đã đăng trước đây:** chạy hàm `xepPlaylistVideoCu` một lần để xếp vào danh sách phát.

## Cài đặt
1. Thay toàn bộ các tệp: `NangCao.gs`, `BoPhan1.gs`, `DangVideo.gs`, `PromptKichBan.gs`.
2. **Triển khai > Phiên bản mới.**
3. Chạy `caiDatNangCao` (thêm dòng `PLAYLIST_THEO`) và `xepPlaylistVideoCu` (xếp video cũ) mỗi hàm một lần.
