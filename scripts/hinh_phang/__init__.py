"""Gói hình học phẳng chuẩn v94 (luồng hinh_hoc_thuan, đặc tả kb.hinh_phang_chuan).

Lớp 2 của kiến trúc 3 lớp chặn: AI chỉ khai báo PHÉP DỰNG (không tọa độ, không mã Manim) ->
  hinh.py      : giải phép dựng thành tọa độ thật (Python thuần, không numpy)
  bo_cuc.py    : lấy mẫu cấu hình (Auto-Layout), co vừa khung (Auto-Fit), đặt nhãn (Smart Placement)
  kiem_chung.py: kiểm chứng mọi mệnh đề trên tọa độ số của MỌI cấu hình hợp lệ, khóa màu, đồng bộ cạnh
  gdpt2018.py  : khóa khung chương trình GDPT 2018 theo cấp lớp (lỗi cứng kèm gợi ý cách chứng minh thay thế)
scripts/giai_hinh_phang.py là cửa vào dòng lệnh; scripts/manim/HinhPhangChuan.py dựng Manim từ kết quả.
"""
