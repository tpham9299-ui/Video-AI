---
name: manim-toan-dep
description: >
  Thiết kế và lập trình hoạt ảnh Manim Community đẹp mắt, chuẩn mực cho video Toán THPT Việt Nam
  (hình học thuần túy, đồ thị, công thức, mô phỏng toán học). BẮT BUỘC kích hoạt khi tạo, sửa
  hoặc tối ưu bất kỳ tệp Python nào dùng Manim (`manim_*.py`, vẽ hình học, biến đổi công thức,
  đồng bộ hình với giọng đọc).
---

# Quy chuẩn Manim Toán học Thẩm mỹ & Chính xác

## 1. Thẩm mỹ thị giác & Bảng màu
- **Nền có chiều sâu:** Không dùng nền đen đặc `#000000` thô. Giữ nền đồng bộ với `phong_cach.json` (tông xanh đen sâu `#0B1020` – `#0F172A`), có thể thêm lưới tọa độ hoặc họa tiết toán siêu mờ (`stroke_opacity <= 0.08`) khi phù hợp.
- **Hệ màu phân cấp rõ vai trò (tối đa 4 màu nhấn/cảnh):**
  - Nét chính & chữ nội dung: trắng dịu `#F8FAFC`.
  - Giả thiết / đối tượng đang xét: xanh lam sáng `#38BDF8`.
  - Điểm nhấn / bước biến đổi quan trọng: vàng hổ phách `#FACC15` hoặc san hô `#FB7185`.
  - Kết quả / kết luận đúng: xanh ngọc `#34D399`.
- **Trọng lượng đường nét & Hiệu ứng phát sáng (Glow):**
  - Cạnh chính: `stroke_width=3.8–4.5`; đường phụ/đường cao: `stroke_width=2.2`; nét khuất hình không gian: `DashedLine(dash_length=0.14, dashed_ratio=0.55, stroke_opacity=0.65)`.
  - Khi nhấn mạnh cạnh, góc hoặc quỹ tích đang giảng: đặt thêm 1 bản sao phát sáng bên dưới (`stroke_width` gấp 2.8–3.2 lần, `stroke_opacity=0.18`).
- **Tách luồng Hình học thuần túy (`hinh_hoc_thuan`):** 100% thuần toán học — tuyệt đối không chèn cảnh/ảnh đời sống hay Blender minh họa thừa thãi.

## 2. Typography & Chuẩn ký hiệu Toán Việt Nam
- **Không lệch font:** Không đẩy chữ số nằm trong câu văn tiếng Việt sang font TeX serif mảnh/nghiêng. Dùng font sans-serif tiếng Việt đồng bộ với `phong_cach.json` cho văn bản; căn cỡ chữ và độ đậm của `MathTex` hài hòa với chữ xung quanh.
- **Ký hiệu bắt buộc theo SGK Việt Nam:**
  - Tổ hợp: luôn viết `C_{n}^{k}` (CẤM dùng `\binom{n}{k}` hay `C(n, k)`).
  - Chỉnh hợp: `A_{n}^{k}`; phép nhân dùng `\cdot`; khoảng cách sau dấu hai chấm rõ ràng.
- **Chống lộ đáp án (Anti-Spoiler):** Chỉ hiện kết quả cuối, số đo vừa tính hoặc màu kết luận SAU KHI lời giảng đi tới bước đó.

## 3. Bố cục an toàn & Độ chính xác hình học
- **Vùng an toàn (Safe Area):** Chừa tối thiểu 12% mép trên (thanh tiêu đề Remotion) và 18% mép dưới (phụ đề). Luôn căn giữa và co giãn nhóm đối tượng bằng `scale_to_fit_width` / `scale_to_fit_height` có biên đệm.
- **Đặt nhãn điểm chống đè nét:** Tính vector đẩy nhãn hướng ra ngoài tâm đa giác (`normalize(point - centroid) * 0.35`), tuyệt đối không gán cứng `UP`/`DOWN` dễ đè lên cạnh hoặc góc.
- **Đúng dữ kiện 100%:** Kiểm tra chéo đủ tên điểm, đúng tỷ lệ, đủ ký hiệu góc vuông (`RightAngle`), trung điểm, song song và đủ 100% số cảnh theo kịch bản.

## 4. Hoạt ảnh mượt & Đồng bộ cứng theo giọng đọc
- **Chuyển động có nhịp điệu:** Ưu tiên `Create`, `DrawBorderThenFill`, `TransformMatchingTex`, `ReplacementTransform`, `Indicate`, `Circumscribe` và `LaggedStart(..., lag_ratio=0.12–0.18)` với `rate_func=rate_functions.ease_in_out_cubic`.
- **Khóa thời gian thực tế:** Tính `run_time` và `self.wait()` dựa trên mốc timestamp thực tế (`WordBoundary` / `SentenceBoundary` từ `edge-tts` hoặc thời lượng đo bằng `ffprobe`). CẤM tự ước lượng `wait(1)`.

## 5. Kiểm chứng trước khi hoàn tất
- Render nhanh các khung hình mốc chính (`-ql -s`) để kiểm tra trực quan: không đè nhãn, không cắt chữ, đúng quan hệ hình học trước khi báo xong.
