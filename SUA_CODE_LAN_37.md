# SỬA CODE LẦN 37: Bài lãi suất / lãi kép không còn hình khối không liên quan

## Nguyên nhân
- Lời nhắc viết kịch bản toán thực tế yêu cầu "dựng lại cảnh thật bằng vật 3D (hộp, trụ, nón...)".
- Bộ kiểm tra còn nhắc "nên có ít nhất 2 cảnh vật 3D".
- Bài lãi suất không có vật hình khối nào, nên AI tự chèn khối hộp, khối trụ, quả cầu cho đủ yêu cầu.

## Sửa
1. **Nhận diện bài tài chính**: lãi suất, lãi kép/đơn, gửi tiết kiệm, vay, trả góp, kỳ hạn, tăng trưởng, dân số tăng, lạm phát...
2. **Lời nhắc riêng** (PromptKichBan.gs): thay cho yêu cầu dựng cảnh 3D.
   - Cấm khối hộp, trụ, nón, cầu, hình học, xúc xắc... mà đề không nhắc.
   - Hình đúng:
     - ngân hàng + người + tiền + heo đất;
     - **biểu đồ cột số tiền sau từng kỳ** (hình chính để mô hình hóa);
     - đồ thị hàm mũ;
     - dòng thời gian các kỳ;
     - số đếm số tiền.
3. **Kiểm tra** (KiemTraHinh.gs):
   - cảnh nào vẽ hình khối / vật đề không nhắc -> lỗi nặng `HINH_KHONG_LIEN_QUAN_CANH_n`;
   - thiếu biểu đồ/đồ thị số tiền -> lưu ý;
   - bỏ yêu cầu "2 cảnh vật 3D" với bài tài chính.
   - Vật được đề nhắc thì vẫn vẽ được (ví dụ đề "vay tiền mua xe" thì vẽ xe).
4. **Máy tự gỡ** trước khi nhờ Gemini sửa: bỏ hình khối lạ (kèm mũi tên, hành động gắn với chúng). Cảnh mất hết hình thì thay bằng cảnh người + ngân hàng + heo đất.
5. **Bộ phận kiểm duyệt** (NangCao.gs): tiêu chí "hình bám đề" ghi rõ bài lãi suất không được có hình khối / hình học mà đề không nhắc.
- Đã thử: kịch bản lãi kép có khối hộp, trụ, cầu, tòa nhà bị bắt đủ 3 cảnh, tự gỡ xong còn 0 lỗi. Bài bể nước (hình hộp) không bị ảnh hưởng.

## Cần dán lại
`KiemTraHinh.gs`, `PromptKichBan.gs`, `BoPhan1.gs`, `NangCao.gs`, rồi Triển khai > Quản lý > Phiên bản mới.
