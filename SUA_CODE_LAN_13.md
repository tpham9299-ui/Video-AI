# Cập nhật lần 13: không gian 3D + chịu được nhiều dạng đề khác nhau

## 1. Không gian 3D
- **Camera 3D cho sân khấu:**
  - Hành động mới `goc_3d {nghieng, xoay}` nghiêng sàn (nhìn chéo xuống như bàn cờ) và xoay camera đi vòng quanh sân khấu, chuyển góc mượt trong 1,2 giây.
  - `"goc_nhin": "ban"` (hoặc `{"nghieng": 45, "xoay": -20}`) trong `du_lieu` cho cảnh mở ra ngay ở góc 3D.
  - Các cảnh nối tiếp (`giu_san_khau`) giữ góc camera của cảnh trước, không bị giật.
- **Sàn 3D:** mặt lưới phát sáng mờ dần ra xa, chỉ hiện khi camera nghiêng.
- **Vật đứng trên sàn:** vật luôn quay mặt về camera, có bóng đổ dưới chân nên trông như đặt trên bàn thật.
- **Vật 3D thật:**
  - Xúc xắc là **khối lập phương 3D** 6 mặt, lăn lộn trên 2 trục, nảy, dừng đúng mặt kết quả và hơi nghiêng để thấy rõ khối.
  - Đồng xu là **đĩa 3D** có viền dày, lật nhiều vòng.
  - Lá bài lật quanh trục dọc có phối cảnh.
- **Chuyển cảnh `lat_3d`:** khối nội dung xoay vào như lật trang. Máy tự xoay vòng 4 kiểu chuyển cảnh, có cả kiểu này.
- **Lời nhắc kịch bản:** hướng dẫn AI dùng góc 3D cho 2-4 cảnh có vật thật đặt trên bàn/sàn. Cảnh có công thức, biểu đồ, danh sách thì giữ nhìn thẳng.

## 2. Chịu được nhiều dạng đề
Đã thử với một kịch bản "khó" gồm nhiều dạng bài: tung 2 xúc xắc, không gian mẫu 36 ô, đồng xu, Bayes xét nghiệm (mô hình diện tích), chọn ban cán sự 12 bạn. Kịch bản cố ý có các lỗi AI hay mắc. Tệp: `mau/kich_ban_thu_kho.json`.

| Tình huống | Cách xử lý mới |
|---|---|
| AI đặt các vật chồng lên nhau | **Tự xếp**: ước lượng kích thước từng loại vật, đẩy các vật chồng lấn ra xa (nhãn nhỏ thì chỉ dời nhãn), giữ trong khung; quá nhiều vật lớn thì thu nhỏ đều. Không đụng tới bố cục không bị chồng lấn |
| Nhãn quá dài | Tự co cỡ chữ cho vừa sân khấu |
| Dòng trong thẻ danh sách dài | Cho phép tới 52 ký tự, tự xuống dòng |
| Dữ liệu hình hỏng (sai định dạng) | Sân khấu dự phòng: nhãn neon lớn ghi tiêu đề cảnh, không để trống, không làm hỏng video |
| Cảnh không có hình lẫn công thức | Tự hiện nhãn dự phòng |
| Bước chuẩn bị giọng đọc gặp dữ liệu hình hỏng | Đã sửa lỗi làm dừng cả lần dựng |
| Mẫu hình cũ (sơ đồ cây, mô hình diện tích, Venn...) | Vẫn hiển thị trong khung sân khấu như trước |

## Việc cần làm trên Apps Script
Thay `PromptKichBan.gs` và `KiemTraHinh.gs`. Hai tệp này nhận thêm `goc_3d`, `goc_nhin` và kiểu chuyển cảnh `lat_3d`.
