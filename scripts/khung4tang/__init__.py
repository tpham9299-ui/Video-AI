"""Gói chuẩn scripts/khung4tang: gom gọn khung4tang_v93..v99 theo 3 nhóm chức năng chính.

- moc_thoi_gian: Intro/Outro, sắp thẻ, đối chiếu tối ưu, đồng bộ Hình-Tiếng 1-1, khóa đáp án, theme.
- san_khau: định tuyến & dựng sân khấu 2D/3D, xác suất động, lịch pha, phiên âm TTS toán.
- kiem_tra: chuẩn hóa/vá cú pháp TeX, Cửa 1 tĩnh (cong_loc_som), che đáp án ô ghim, kiểm kịch bản.
"""
from . import kiem_tra, moc_thoi_gian, san_khau

__all__ = ["moc_thoi_gian", "san_khau", "kiem_tra"]
