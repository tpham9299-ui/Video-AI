---
name: blender-canh-3d-dep
description: >
  Dựng cảnh 3D thực tế và xác suất bằng Blender 5.3 Python (`bpy`) với ánh sáng studio/điện ảnh,
  vật liệu PBR tinh tế, bố cục tiếp đất chính xác và góc quay động. BẮT BUỘC kích hoạt khi tạo
  hoặc chỉnh sửa `ve_blender.py`, `canh_3d.py`, `scripts/thu_vien_3d/*` hoặc bất kỳ script
  Blender nào. TUYỆT ĐỐI KHÔNG dùng cho luồng Hình học thuần túy (`hinh_hoc_thuan`).
---

# Quy chuẩn Blender 5.3 (`bpy`) Dựng cảnh Thực tế & Xác suất Đẹp mắt

## 1. Phạm vi & Tương thích kỹ thuật
- **Khóa luồng:** Chỉ áp dụng cho luồng Thực tế & Xác suất; giữ nguyên cơ chế chặn ở `hinh_hoc_thuan`.
- **Chuẩn Blender 5.3:** Viết đúng API Blender 5.3 hiện có trên máy và GitHub Actions, tránh thuộc tính đã bị loại bỏ từ Blender 3.x.
- **Bám đề tuyệt đối:** Dựng cảnh từ `dac_ta_canh` và thư viện `scripts/thu_vien_3d/` (đúng loại vật, đủ số lượng, đúng màu sắc, đúng bối cảnh). CẤM dựng cảnh nền chung chung hoặc chèn khối 3D thừa không liên quan đến đề.

## 2. Hình khối tinh xảo & Tiếp đất tuyệt đối
- **Không để vật bay lơ lửng:** Sau khi dựng/scale bất kỳ vật thể nào, tính `world bounding box` (`matrix_world @ Vector(corner)`) để đặt `min_z` bám khít bề mặt đỡ (`surface_z + 0.001`), trừ khi hành động yêu cầu bay/rơi/tung.
- **Bắt sáng cạnh:** Mọi khối hình học cứng (bàn, hộp, thẻ bài, bể, khối hộp) đều thêm modifier `BEVEL` nhẹ (`width=0.003–0.015`, `segments=2–3`) kết hợp làm mượt pháp tuyến ở mặt cong để cạnh bắt ánh sáng tự nhiên.
- **Mặt nền liền mạch:** Không kéo giãn vân gỗ/vật liệu phẳng thô. Dùng phông studio cong vô cực (cyclorama) cho cảnh bàn/hộp, hoặc bố trí đủ 3 lớp tiền cảnh – trung cảnh – hậu cảnh cho cảnh ngoài trời/công trình.

## 3. Ánh sáng Điện ảnh & Vật liệu PBR
- **Quản lý màu sắc:** Sử dụng `AgX` (`AgX - Medium High Contrast`) để ánh sáng trong, màu sâu, không bị bạc hoặc cháy sáng.
- **Ánh sáng HDRI + 3 điểm (Three-Point Lighting):**
  - Nạp HDRI từ `assets/hdri/` (cường độ `0.45–0.85`, xoay góc Z cho hướng bóng đẹp).
  - **Key Light (`AREA`):** ấm nhẹ (`5200K–5600K`), đặt chéo 45° trên-trước, kích thước đèn đủ lớn để bóng đổ mềm mại.
  - **Fill Light (`AREA`):** mát nhẹ (`6500K–7200K`), công suất ~25%–35% Key Light.
  - **Rim Light (`AREA`):** đặt phía sau-trên để tách viền sáng nổi bật chủ thể khỏi hậu cảnh.
- **Vật liệu PBR tự nhiên:** Dùng `Principled BSDF` có biến thiên độ nhám (`Roughness` qua Noise Texture + Map Range) và `Bump` tinh tế (`Strength 0.02–0.07`).

## 4. Camera điện ảnh, DoF & Chuyển động
- **Tiêu cự & Khung hình:** Ống kính `50mm–85mm` cho cảnh cận/trung, `35mm` cho toàn cảnh. Căn chủ thể theo quy tắc 1/3, chừa khoảng trống sạch phía trên và dưới cho tiêu đề/phụ đề Remotion.
- **Độ sâu trường ảnh (DoF):** Bật `use_dof = True`, khóa tiêu điểm vào cụm vật thể chính, khẩu độ `f/2.8–f/5.6`.
- **Chuyển động mượt & Chống lộ đáp án:** Dùng nội suy `BEZIER` êm ái theo `quay`/`khi_noi`, không để vật chính trôi khỏi khung hình. Cảnh mở bài (hook) tuyệt đối không hiển thị đáp án.

## 5. Kiểm chứng hình ảnh
- Luôn dựng ảnh xem trước nhỏ (preview) kiểm tra đủ 4 yếu tố: đủ số lượng vật theo đề, vật tiếp đất có bóng đổ thật, ánh sáng/màu sắc hài hòa, và không bị cắt mép.
