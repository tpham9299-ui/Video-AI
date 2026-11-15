# SỬA CODE LẦN 36: Đăng video với ĐÚNG ảnh bìa thiết kế (thumbnail)

## Vì sao trước đây ra ảnh bất kỳ
- Ảnh bìa thiết kế (lớp, loại câu hỏi, tiêu đề, hình của đề) vẫn được dựng ở mọi video và là khung hình đầu tiên. Nhưng lúc đăng:
  - YouTube đăng qua GitHub: không đặt ảnh bìa;
  - YouTube đăng qua Apps Script: có đặt, nhưng dùng bản chưa có "TẬP N"; lỗi (kênh chưa xác minh số điện thoại) thì im lặng bỏ qua;
  - Facebook: không đặt ảnh bìa, Facebook tự chọn một khung.

## Sửa (scripts/dang_video.py, DangVideo.gs)
- **Ảnh bìa đăng** = khung đầu của bản đăng (ảnh bìa thiết kế) có in **TẬP N**.
  - Trên khung ảnh bìa, chữ TẬP nằm ở khoảng trống dưới hàng nhãn, không đè chữ.
  - Các khung còn lại giữ chữ TẬP ở góc phải trên như cũ.
- **YouTube** (cả hai cách đăng): đặt ảnh bìa này bằng API.
  - Không đặt được (thường do kênh chưa xác minh số điện thoại) thì **bot Zalo báo bạn**, kèm cách sửa: youtube.com/verify.
- **Facebook**:
  - Reels: đăng xong đặt ảnh bìa ưu tiên (thumbnails, is_preferred);
  - video thường: gửi kèm ảnh bìa lúc đăng.
- **TikTok**: chọn khung 0 (chính là ảnh bìa thiết kế + TẬP) làm ảnh bìa.
  - Nếu TikTok đang ở chế độ gửi vào hộp nháp thì API không đặt được ảnh bìa: khi bấm đăng trong ứng dụng, chọn khung đầu tiên.

## Cần làm
- Dán lại `DangVideo.gs` vào Apps Script, rồi Triển khai > Quản lý > Phiên bản mới.
- Phần GitHub đã tự cập nhật.
- Nếu kênh YouTube chưa xác minh số điện thoại: vào youtube.com/verify.

## Duyệt hàng loạt qua bot Zalo (SanPham.gs, ZaloDeBai.gs)
- **Mỗi dòng một lệnh** trong cùng một tin, ví dụ:
  ```
  duyệt TT261115-100000-0
  /sua VD261115-110000-0 cảnh 2 vẽ to hơn
  thêm: giọng chậm lại ở đáp số        <- dòng không phải lệnh được nối vào lệnh ngay trên
  - bỏ HH261115-120000-0 hình sai đề
  ```
- **Một lệnh nhiều mã**: `/duyet A B C` hoặc `/bo A, B <lý do chung>`.
- `/duyet tatca` duyệt mọi video đã đạt kiểm duyệt đang chờ (video cũ trước, nên số tập theo đúng thứ tự).
- Viết "duyệt / sửa / bỏ" không có dấu "/" cũng hiểu, gạch đầu dòng hay số thứ tự "1." đều được.
  Chỉ nhận là lệnh khi theo sau là mã video, nên đề toán gửi bình thường không bị nhầm.
- Làm **lần lượt đúng thứ tự** các dòng (thứ tự duyệt = thứ tự số tập), tối đa 40 lệnh/tin, rồi trả **một tin tổng hợp** kết quả từng dòng.
