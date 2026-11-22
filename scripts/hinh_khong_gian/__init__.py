"""Gói hình học KHÔNG GIAN chuẩn v97 (luồng hinh_hoc_thuan, đặc tả kb.hinh_khong_gian).

AI chỉ mô tả CẤU TRÚC (khối, điểm chia, trung điểm, chân đường vuông góc, giao điểm, thiết diện, góc, khoảng cách) - KHÔNG tọa độ:
  hinh.py      : toán vector + dựng khối (chóp / lăng trụ / hộp / tứ diện) + phép dựng điểm + thiết diện (Python thuần)
  kiem.py      : kiểm mệnh đề (thuộc, vuông góc, song song...) trên MỌI cấu hình của điểm "bất kỳ", số đo, GDPT 2018
  thoi_gian.py : mốc camera `moc_xoay` (đối chiếu chữ gốc -> giây), lỗi cứng CAM_MAT_MOC / CAM_DE_GIO
scripts/giai_hinh_khong_gian.py là cửa vào dòng lệnh; src/khonggian/ (Remotion) dựng hình + nét khuất giải tích từng khung.
"""
