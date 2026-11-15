# SỬA CODE LẦN 38: Hình to hơn, chữ trên hình tinh tế hơn, "đạo diễn sáng tạo" tự học từ việc bạn duyệt / bỏ

## 1. Hình minh họa to, rõ (src/sankhau/trangthai.ts)
- Trước: bộ xếp sân khấu chỉ THU NHỎ khi tràn; hình chiếm ít chỗ thì để nguyên -> hình nhỏ, sân khấu trống.
- Nay:
  - vật hình (cửa, chai, ảnh sản phẩm, người, vật thật...) tự **phóng to tới 1,6 lần** cho gần kín sân khấu;
  - chữ, số đếm, thẻ, danh sách, biểu đồ giữ cỡ;
  - các vật vẫn tách rời, không đè nhau.
- Có **lề an toàn** quanh sân khấu, vật không bao giờ sát hay bị cắt ở mép màn hình.
- Kiểm duyệt khung hình:
  - mới: hình chiếm dưới 22% vùng sân khấu ở ≥ 2 khung -> lỗi nặng `HINH_NHO`;
  - mới: hình (không chỉ chữ) tràn mép -> lỗi nặng.
- Số lăn: chữ số "1" không còn để khoảng trống ("1 2.000" -> "12.000").

## 2. Chữ trên hình tinh tế, dễ đọc
- **Nhãn mới**:
  - không nghiêng;
  - viền mảnh;
  - phát sáng nhẹ;
  - nền tối mờ kiểu kính;
  - bóng đổ mềm, đọc rõ trên mọi nền hình.
- Kiểm duyệt chữ đè chữ chặt hơn: chồng từ 12% (trước 22%) là lỗi.
- Kiểm tra kịch bản:
  - quá 3 nhãn chữ trên một cảnh -> lỗi nặng;
  - nhãn dài như câu văn -> lưu ý;
  - hình tự do quá 6 dòng chữ -> lưu ý.
- Lời nhắc:
  - tối đa 3 nhãn ngắn (≤ 5 chữ), đặt ở vùng trống quanh hình, hiện lần lượt theo lời thoại;
  - câu dài đưa vào khung công thức;
  - một hình chính lớn thay vì nhiều vật nhỏ.

## 3. Đạo diễn sáng tạo: tự đổi mới và tự học (NangCao.gs, SanPham.gs)
- Mỗi video được chọn 3 thứ:
  - **phong cách lời** (6 kiểu);
  - **cách dàn cảnh** (8 kiểu gốc: một hình biến đổi, so sánh song song, toàn cảnh - cận cảnh, hành trình, thử thách đếm ngược, lật thẻ manh mối, thử và sai, bắt đầu từ kết quả);
  - **gói edit** (4 kiểu).
- **Học từ bạn**: `/duyet` = phong cách đó tốt; `/bo` hoặc video không đạt kiểm duyệt = chưa tốt.
  - Hệ thống chọn theo tỉ lệ được duyệt (thuật toán UCB): hay duyệt thì dùng nhiều hơn, vẫn chừa chỗ thử cái mới.
  - Không bao giờ lặp đúng phong cách của video liền trước.
  - Cách dàn cảnh dùng ≥ 6 lần mà được duyệt < 25% thì tự ngừng dùng.
- **Đổi mới liên tục**: mỗi tuần (trong báo cáo ngày) Gemini sáng tác 1 cách dàn cảnh mới, dựa trên:
  - thống kê duyệt/bỏ;
  - các quy tắc bạn đã dạy;
  - bài học edit từ video nổi bật.
  Cách mới vào vòng thử, tốt thì ở lại, kém thì tự bị loại.
- **Lệnh mới `/phongcach`**: xem tỉ lệ duyệt của từng phong cách. Báo cáo ngày có thêm tỉ lệ duyệt 7 ngày qua.
- Mô phỏng 60 video:
  - phong cách được duyệt 80% được chọn 24/60 lần;
  - phong cách bị bỏ 95% chỉ thử 3 lần rồi gần như không dùng nữa.

## Cần dán lại
`NangCao.gs`, `SanPham.gs`, `KiemTraHinh.gs`, `PromptKichBan.gs`, `BoPhan1.gs`, `ZaloDeBai.gs`, rồi Triển khai > Quản lý > Phiên bản mới.
Phần dựng video (GitHub) tự cập nhật.
