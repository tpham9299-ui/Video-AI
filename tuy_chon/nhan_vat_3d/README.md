# Tùy chọn: nhân vật 3D (VRM)

Đã thử và **không dùng** trong bản chính (chọn nhân vật 2D vì video dạy học cần nhân vật hỗ trợ bài giảng, không chiếm khung hình).
Mã được giữ lại ở đây để dùng sau nếu muốn. Muốn bật lại:
1. Chép `src/avatar` và `src/ThuNhanVat.tsx` vào `src/`, `workflows/thu-nhan-vat.yml` vào `.github/workflows/`.
2. Thêm vào `package.json`: `@remotion/three`, `@react-three/fiber@8.17.10`, `@pixiv/three-vrm`, `three@0.169.0`, `@types/three@0.169.0`.
3. Nối `Avatar3D` vào `Video.tsx` và dựng với cờ `--gl=swangle --timeout=120000` (xem `HUONG_DAN_NHAN_VAT_3D.md`).
