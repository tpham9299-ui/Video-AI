"""Nâng cấp kế hoạch Blender định dạng cũ (lap_ghep, vat, vuon, cap_bo, can_ho, cua, phep_thu) lên cùng đường dựng mới.

Kịch bản cũ không có dac_ta_canh vẫn dựng được; phần được nâng cấp là BỐI CẢNH: chọn mẫu môi trường theo
địa điểm của câu chuyện / đề (cau_chuyen.dia_diem, boi_canh) thay cho đoán "ngoài trời / nhà xưởng / trong phòng".
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from thu_vien_3d.khop import khop_moi_truong  # noqa: E402

KIEU_CU = ("lap_ghep", "vat", "vuon", "cap_bo", "can_ho", "cua", "phep_thu")
MAC_DINH = {"vuon": "nong_trai", "cap_bo": "bo_song", "can_ho": "duong_pho", "phep_thu": "ban_thi_nghiem", "cua": "phong"}


def gan_moi_truong(plan, kb):
    """Thêm plan['moi_truong'] = {mau} cho kế hoạch cũ chưa có; trả plan (bản sao nếu đổi)."""
    if not isinstance(plan, dict) or plan.get("loai") not in KIEU_CU or plan.get("moi_truong"):
        return plan
    cau = kb.get("cau_chuyen") if isinstance(kb.get("cau_chuyen"), dict) else {}
    mau = khop_moi_truong(cau.get("dia_diem"), kb.get("de_bai")) or MAC_DINH.get(plan["loai"])
    if not mau:
        return plan
    return dict(plan, moi_truong={"mau": mau})
