# Sửa code lần 19: duyệt video qua Zalo + sản phẩm trong bài toán (minh bạch)

## 1. Duyệt video trước khi đăng
Video dựng xong, bot Zalo gửi link kèm lệnh. **Chỉ video đã duyệt mới được đăng theo lịch** (sheet CAU_HINH > `DUYET_TRUOC_KHI_DANG` = `BAT`, mặc định bật; đổi `TAT` để đăng không cần duyệt).

| Lệnh | Tác dụng |
|---|---|
| `/cho` | xem các video đang chờ duyệt (mã + link) |
| `/duyet <mã>` | cho đăng ở khung giờ tới |
| `/sua <mã> <góp ý>` | AI sửa kịch bản ĐÚNG theo góp ý (giữ phần đã đúng), dựng lại, rồi gửi video mới để duyệt; được ưu tiên như đề Zalo |
| `/bo <mã>` | không đăng video này |

Chỉ có 1 video chờ thì không cần ghi mã. Có từ 2 video chờ trở lên mà thiếu mã thì bot gửi danh sách và hỏi lại, để không duyệt nhầm.

## 2. Sản phẩm trong bài toán
1. Nhắn `/sanpham <tên sản phẩm hoặc link> [ghi chú]`. Có thể gửi **ảnh sản phẩm** với chú thích `/sanpham`; khi chỉ có ảnh, hệ thống tự nhận diện tên sản phẩm.
2. Hệ thống dùng Gemini + Google Search (khoảng 1-3 phút) để tìm thông tin, **mỗi mục đều có nguồn**:
   - giá ở nhiều nơi bán (kèm ngày lấy);
   - thông số;
   - các nơi bán thường nhấn mạnh điều gì (chỉ rút ý, không chép);
   - lời quảng cáo không kiểm chứng được;
   - tên đối thủ.

   Thông số chỉ được coi là **đã xác minh** khi có ≥ 2 nguồn khác trang hoặc nguồn chính hãng. Thông số 1 nguồn **không được dùng** trong video.
3. Bot gửi tóm tắt hồ sơ. Đúng thì trả lời `/xacnhan <mã> <giá bạn bán>` (ví dụ `/xacnhan SP261114-101500 249000`); không dùng thì `/huysp <mã>`.
4. Hệ thống sáng tác 2 bài toán **hữu ích** lấy sản phẩm làm bối cảnh (chi tiêu thông minh, so sánh phương án, chi phí dùng lâu dài, tối ưu, xác suất khuyến mãi...), chỉ dùng số liệu đã xác minh. Sau đó giải, kiểm chứng, viết kịch bản, dựng video như đề ưu tiên, rồi gửi để bạn duyệt.
5. Hồ sơ sản phẩm lưu ở sheet mới **SAN_PHAM** (tự tạo).

### Minh bạch (không phải quảng cáo trá hình)
- **Trong video:** máy **tự gắn** nhãn nhỏ "🛍 Có sản phẩm do kênh bán" suốt video và dòng "Sản phẩm trong bài: ..." ở 4 giây cuối. Nhãn không phụ thuộc AI có nhớ viết hay không.
- **Lời nhắc:** bài toán là chính; sản phẩm chỉ là bối cảnh; chỉ một câu nhắc trung thực ở cảnh cuối.
- **Bộ kiểm tra:** kịch bản có lời quảng cáo quá đà ("tốt nhất", "rẻ nhất", "số 1", "duy nhất", "cam kết", "100%", "mua ngay", "chốt đơn"...) hoặc **nhắc tên đối thủ** là **lỗi nặng**; AI phải sửa ngay.
- **Khi đăng:**
  - Mô tả mở đầu bằng dòng "📢 Video có giới thiệu sản phẩm do kênh bán..." và thêm thẻ `#quangcao`.
  - YouTube được khai báo "có quảng bá sản phẩm" (paid product placement).
  - TikTok bật nhãn quảng bá doanh nghiệp của bạn (`brand_organic_toggle`).
- **Lưu ý:** gắn sản phẩm vào giỏ hàng TikTok Shop vẫn phải làm trong ứng dụng TikTok; API đăng video không hỗ trợ việc này.

## Cài đặt
1. Thêm tệp mới **SanPham.gs**.
2. Thay toàn bộ các tệp: `BoPhan1.gs`, `BoPhan2.gs`, `PromptKichBan.gs`, `KiemTraHinh.gs`, `DangVideo.gs`; dán `ZaloDeBai.gs` đè lên `Zalo.gs`.
3. **Triển khai > Phiên bản mới.**
4. Chạy lại `caiDatDangVideo` một lần để thêm dòng `DUYET_TRUOC_KHI_DANG` vào sheet CAU_HINH. Không chạy thì hệ thống vẫn mặc định BẬT duyệt.

Video "Có video" làm từ trước bản này chưa được duyệt, nên sẽ không tự đăng. Nhắn `/cho` để xem và `/duyet <mã>` từng video muốn đăng.
