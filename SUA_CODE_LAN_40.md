# SỬA CODE LẦN 40: Giọng đọc video hình học bị rè

## Nguyên nhân
- Lời thoại hình học có nhiều ký hiệu và tên điểm: ⊥, ∥, ∠, △, °, √, "(SAC)", "BD", "A'"...
- Bộ chuẩn hóa chỉ đổi "=", "×", "%" nên các ký hiệu này được gửi nguyên cho giọng Gemini. Gặp chúng, mô hình đọc lạc: sinh tiếng rè/ồ, hoặc bỏ sót chữ.
- Hệ thống chỉ kiểm tra giọng "quá ngắn", không kiểm tra tạp âm, nên đoạn rè vẫn lọt vào video.

## Sửa (scripts/chuanbi.py, chạy trên GitHub, không cần dán gì)
1. **Đọc ký hiệu thành lời**:
   - ⊥ -> "vuông góc với", ∥ -> "song song với", ∠ -> "góc", △ -> "tam giác", ° -> "độ", √ -> "căn";
   - "(SAC)" -> "mặt phẳng SAC", "6%/năm" -> "6 phần trăm mỗi năm";
   - mã TeX lọt vào lời bị bỏ.
2. **Video hình học đánh vần tên điểm kiểu Việt**:
   - "BD" -> "bê đê", "SAC" -> "ét a xê", "A'" -> "a phẩy";
   - "BD ⊥ (SAC)" -> "bê đê vuông góc với mặt phẳng ét a xê".
3. **Máy đo tạp âm**: đo từng 0,25 giây.
   - Tiếng "xì" kéo dài liên tục ≥ 0,5 giây (âm s/x thật chỉ ~0,1-0,2 giây nên không bị tính nhầm), hoặc vỡ tiếng (chạm trần) -> coi là rè.
   - Đọc dài bất thường cũng coi là lạc giọng.
4. **Kiểm tra đọc thiếu chữ**: cảnh nào đọc nhanh bất thường (> 4,6 từ/giây) nghĩa là Gemini đã bỏ sót chữ -> đọc lại.
5. **Thứ tự xử lý khi lỗi**:
   - đọc lại cả bài (2 lần);
   - không được thì đọc từng cảnh (đoạn ngắn ít lạc), mỗi cảnh vẫn kiểm rè + thiếu chữ;
   - vẫn lỗi thì cả video dùng giọng dự phòng cùng giới tính (không bao giờ ra video rè).

## Đã thử
- Âm thanh giả lập:
  - tín hiệu sạch -> "sạch";
  - chèn nhiễu xì -> "RÈ" (62,5% khung);
  - vỡ tiếng -> "RÈ".
- Dựng thật trên GitHub 2 video hình học mẫu (THU-hinhhoc1, THU-khonggian1 trên Drive VIDEO_XACSUAT/video) với giọng Gemini:
  - đo được tạp âm 0%, không vỡ tiếng (không báo nhầm giọng sạch);
  - phát hiện thêm một cảnh đọc 21 từ trong 4,1 giây (thiếu chữ) -> đã thêm kiểm tra đọc thiếu chữ ở bước 4.
