# Sửa code lần 18: kịch bản ít bị từ chối, lỗi được sửa ngay

**Trước đây:** bộ kiểm tra dừng ở lỗi ĐẦU TIÊN và bắt Gemini viết lại cả kịch bản. Lỗi vặt (tiêu đề hơi dài, thiếu từ khóa, mô tả ngắn, tên vật lạ...) cũng làm kịch bản bị từ chối. Hết thời gian thì chờ lần chạy sau và viết lại từ đầu, nên rất dễ hỏng.

## 1. Máy tự sửa lỗi vặt (không cần gọi Gemini)
- **Lời thoại:** đọc ký hiệu toán thành chữ (`\frac{128}{x}` → "128 phần x", `x^2` → "x bình phương"); bỏ câu mở máy móc ("Tiếp theo,", "Bước tiếp theo..."); bỏ lời chào ở hook; hook quá dài thì rút gọn ở ranh giới câu.
- **Hình:**
  - Vật hoặc hành động hỏng thì **bỏ riêng vật/hành động đó**, không từ chối cả kịch bản. Mũi tên nối tới vật không tồn tại cũng bị bỏ.
  - Cảnh có vật mà không có hành động thì tự thêm hiệu ứng sáng. Mô tả hình quá ngắn thì tự bổ sung.
  - **Tên vật/hành động AI tự chế** được đổi về loại có sẵn:
    - Vật: `tam_giac`, `hinh_vuong`, `hinh_tron`, `bong_tuyet` → hình tự do; `be_nuoc` → bể; `lon` → trụ.
    - Hành động: `xoay` → quay; `zoom` → phóng to; `tang` → đặt giá trị.
- **Các trường khác:** thiếu tiêu đề cảnh thì lấy từ ý đầu lời thoại; tiêu đề quá dài thì rút gọn; kiểu trình bày lạ thì đổi về `xep`; tự đặt `hook_chu`, `nhan_manh`, `hook_ung_vien`, `y_tuong_chinh`, `bai_hoc_rut_ra`; thiếu cảnh bài học cuối thì tự thêm.
- **Đáp số đã làm tròn** trên màn hình (ví dụ `138 548,44` cho `138548.4383`) được nhận là đúng.

## 2. Lỗi chia hai mức
- **Nặng** (làm sai video): sai số cảnh, thiếu lời thoại, sai đáp án, không vẽ hình của đề, quá dài nhiều, lọt câu thông báo của AI. Nhóm này **bắt buộc sửa**.
- **Nhẹ** (chỉ chưa đẹp): nhờ Gemini sửa một lần; nếu vẫn còn thì **vẫn dùng kịch bản** và ghi "lưu ý" vào nhật ký.

## 3. Sửa ngay trong cùng lần chạy, sửa triệt để
- Còn lỗi thì gọi Gemini **sửa ngay** (tối đa 3 lượt trong một lần chạy). Gemini nhận **toàn bộ danh sách lỗi một lần**, kèm đủ quy tắc đã thống nhất và kịch bản hiện tại. Yêu cầu là chỉ sửa đúng chỗ lỗi và giữ nguyên phần đã đúng; không viết lại từ đầu.
- Sau mỗi lượt sửa, máy tự sửa và kiểm tra lại.
- Hết thời gian giữa chừng: **lưu bản nháp** (`nhap_<mã>.json` trong thư mục kịch bản) và **không tính là lỗi**. Lần chạy sau sửa tiếp từ bản nháp.
- Nhật ký mới: `KICH_BAN_TU_SUA` (máy đã tự sửa gì), `KICH_BAN_SUA` (nhờ Gemini sửa những lỗi nào), `KICH_BAN_LUU_Y` (lỗi nhẹ còn lại nhưng vẫn dùng).

## Cài đặt
Thay `BoPhan1.gs` và `KiemTraHinh.gs`, rồi **Triển khai > Phiên bản mới**.
