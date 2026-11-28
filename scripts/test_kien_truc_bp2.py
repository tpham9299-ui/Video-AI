"""v102.1 — Kiểm thử hồi quy KIẾN TRÚC BP2 phía Python (0 gọi API):
  1. du_phong_t2: đề "3 trạm phát tín hiệu A, B, C" KHÔNG rơi vào hop_bi_mau -> mảnh trung tính so_do_diem_ket_noi
     (qua hộp cát tu_sinh_svg 0 lỗi, mỗi bước đổi hình); đề có bi thật vẫn hop_bi_mau.
  2. khu_lap_van_ban (dao_dien_2b.py) khớp khuLapVanBan_ (KiemTraHinh.gs): khử câu / n-gram / mục lặp, giữ 0,8.
  3. schema thu_lai: kịch bản 2 pha thiếu thu_lai -> lỗi schema; kịch bản cũ có cảnh thử lại -> tương thích ngược.
  4. Bộ giải hình phẳng: tia "Ax" sau tiếp tuyến tại A -> giải được, kẻ đoạn AC; "Ax" không gắn đường -> HP_DUNG_LOI tường minh.
  5. Lịch camera hình không gian: moc_xoay sai -> rơi về toan_canh (không lỗi cứng); rut_mau không gán bi cho đề không có bi.
Chạy: python -X utf8 scripts/test_kien_truc_bp2.py
"""
import os
import sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(GOC, "scripts"))

import dao_dien_2b  # noqa: E402
import du_phong_t2  # noqa: E402
import tu_sinh_svg  # noqa: E402
from hinh_phang.hinh import LoiDung, dung_hinh  # noqa: E402
from hinh_khong_gian.thoi_gian import lich_khong_gian  # noqa: E402
from khung4tang import san_khau as sk  # noqa: E402

DAT, HONG = 0, []


def thu(ten, fn):
    global DAT
    try:
        fn()
        DAT += 1
        print("  ✓", ten)
    except Exception as e:  # noqa: BLE001
        HONG.append(ten)
        print("  ✗", ten, "—", repr(e)[:200])


def kb_mau(de, mon="XAC_SUAT", so_buoc=4):
    return {"mon": mon, "de_bai": de, "dap_an_cuoi": "0,994", "canh": [{"so": i + 1, "loai": "tinh_toan", "loi_thoai": "Bước %d ta tính xác suất" % (i + 1)} for i in range(so_buoc)],
            "khung4tang": {"buoc": [{"canh": i + 1, "khi_noi": "Bước %d ta" % (i + 1), "nhan": "Bước %d" % (i + 1), "tieu_de": "Phân tích %d" % (i + 1)} for i in range(so_buoc)]}}


DE_TRAM = "Ba trạm phát tín hiệu A, B, C hoạt động độc lập với xác suất phát thành công lần lượt 0,8; 0,7; 0,9. Tính xác suất có ít nhất một trạm phát thành công."

print("1. Minh họa trung tính (không mặc định hop_bi)")


def t_tram():
    kb = kb_mau(DE_TRAM)
    chon = du_phong_t2.chon_manh_du_phong(kb)
    assert chon["manh"] != "hop_bi_mau", chon
    assert chon["manh"] == "so_do_diem_ket_noi", chon
    assert chon["doi_tuong"] == ["A", "B", "C"], chon
    kq = du_phong_t2.cuu_kb_t2(kb)
    assert kq["ok"] and kq["manh"] == "so_do_diem_ket_noi"
    lop = tu_sinh_svg.dung(kb["khung4tang"]["tu_sinh"]["ma"], 4, tham_my=True, can_hinh=True, can_vat=True)
    assert len(lop) == 4, len(lop)
    assert tu_sinh_svg.co_hinh_t2([lop[0]], can_vat=True), "bước 0 thiếu hình T2"
    assert len({x["svg"] for x in lop}) == 4, "có bước trùng hình (hinh_dung_im)"
    assert all('data-manh="so_do_diem_ket_noi"' in x["svg"] for x in lop)
    assert "hop_bi" not in "".join(x["svg"] for x in lop)


thu('đề "3 trạm phát tín hiệu A, B, C" -> so_do_diem_ket_noi qua hộp cát 0 lỗi, KHÔNG hop_bi_mau', t_tram)


def t_bi_that():
    assert du_phong_t2.chon_manh_du_phong(kb_mau("Hộp kín chứa 4 viên bi đỏ và 5 viên bi xanh, chọn ngẫu nhiên 2 bi."))["manh"] == "hop_bi_mau"
    assert du_phong_t2.chon_manh_du_phong(kb_mau("Hộp kín chứa 10 tấm thẻ đánh số từ 1 đến 10, rút 2 thẻ."))["manh"] == "la_bai_the_so"
    assert du_phong_t2.chon_manh_du_phong(kb_mau("Mạch điện có 3 bóng đèn mắc nối tiếp, mỗi bóng hỏng độc lập."))["manh"] != "hop_bi_mau"
    assert du_phong_t2.la_de_co_bi("bốc thăm trong hộp") and not du_phong_t2.la_de_co_bi("ba trạm phát sóng")


thu("đề có bi thật vẫn hop_bi_mau; hộp kín chứa thẻ -> la_bai_the_so; bóng đèn KHÔNG phải bi", t_bi_that)


def t_rut_mau():
    sua = []
    kq = sk.dung_rut_mau({"vat": "bi", "nhom": [{"nhan": "đỏ", "so": 3}]}, {"de_bai": DE_TRAM}, sua)
    assert (kq or {}).get("vat") != "bi", kq
    assert any("đề không có bi" in x for x in sua), sua


thu("rut_mau: AI ghi vat=bi cho đề trạm phát sóng -> bỏ bi (khớp SanKhau.gs)", t_rut_mau)

print("2. Vệ sinh tĩnh 0-API")


def t_khu_lap():
    rac = "Ba trạm phát sóng A, B, C. Ba trạm phát sóng A, B, C. Sân khấu gồm the, the, the, xuất hiện xuất hiện lần lượt theo lời thoại."
    s = dao_dien_2b.khu_lap_van_ban(rac, 220)
    assert s.count("Ba trạm phát sóng") == 1 and "the, the" not in s and "xuất hiện xuất hiện" not in s, s
    assert dao_dien_2b.khu_lap_van_ban("Xác suất 0,8; 0,7 và 0,9.") == "Xác suất 0,8; 0,7 và 0,9."
    assert len(dao_dien_2b.khu_lap_van_ban(" ".join("chi tiết %d" % i for i in range(80)), 220)) <= 221


thu("khu_lap_van_ban: khử lặp, giữ số thập phân, cắt <= 220 ký tự", t_khu_lap)


def t_dong_goi():
    kb = {"tieu_de": "x", "dap_an_cuoi": "1", "hook": "h", "y_tuong_chinh": "y", "bai_hoc_rut_ra": ["b"], "binh_luan_ghim": "g",
          "tom_tat_3_buoc": [{"chien_thuat": "a", "cong_thuc": "b"}] * 3,
          "canh": [{"so": 1, "loai": "de_bai", "tieu_de_canh": "Đề", "loi_thoai": "Đề", "noi_dung_man_hinh": [],
                    "mo_ta_minh_hoa": " ".join(["Hộp trong suốt chứa bi đỏ."] * 25)}]}
    kq = dao_dien_2b.dong_goi_pha_2b(kb, {"mon": "XAC_SUAT", "de_bai": "Hộp có 3 bi đỏ"})
    assert kq["kb"]["canh"][0]["mo_ta_minh_hoa"] == "Hộp trong suốt chứa bi đỏ.", kq["kb"]["canh"][0]["mo_ta_minh_hoa"]


thu("Pha 2B đóng gói: mo_ta_minh_hoa lặp 25 lần -> 1 câu sạch", t_dong_goi)

print("3. Khóa thu_lai tại schema (tương thích ngược)")


def t_schema():
    goc = {"pha_bp2": "2_pha", "tieu_de": "x", "dap_an_cuoi": "1", "hook": "h", "bai_hoc_rut_ra": ["b"], "binh_luan_ghim": "g",
           "canh": [{"so": 1, "loai": "de_bai"}, {"so": 2, "loai": "dap_an"}]}
    assert any(x.startswith("SCHEMA_THIEU_THU_LAI") for x in dao_dien_2b.kiem_tra_schema_bp2(dict(goc), "pha_2b"))
    co_canh = dict(goc, canh=goc["canh"] + [{"so": 3, "loai": "thu_lai"}])
    assert not any(x.startswith("SCHEMA_THIEU_THU_LAI") for x in dao_dien_2b.kiem_tra_schema_bp2(co_canh, "pha_2b"))
    co_truong = dict(goc, thu_lai={"phep_thu": "2 + 2 = 4", "loi_doc": "hai cộng hai bằng bốn"})
    assert not any(x.startswith("SCHEMA_THIEU_THU_LAI") for x in dao_dien_2b.kiem_tra_schema_bp2(co_truong, "pha_2b"))
    cu = {k: v for k, v in goc.items() if k != "pha_bp2"}   # kịch bản 1 pha cũ: không kiểm required
    assert not any(x.startswith("SCHEMA_THIEU") for x in dao_dien_2b.kiem_tra_schema_bp2(cu, "pha_2b"))


thu("thiếu thu_lai -> SCHEMA_THIEU_THU_LAI; có cảnh thử lại / trường thu_lai / kịch bản cũ -> hợp lệ", t_schema)

print("4. Hình phẳng: chuẩn hóa tia 'Ax' tại biên")
PD = [{"id": "d1", "loai": "duong_tron", "tam": "O"}, {"id": "d2", "loai": "diem_tren", "ten": "A", "tren": "(O)"},
      {"id": "d3", "loai": "diem_tren", "ten": "B", "tren": "(O)"}, {"id": "d4", "loai": "diem_tren", "ten": "M", "tren": "(O)"},
      {"id": "d5", "loai": "tiep_tuyen", "tai": "A", "duong_tron": "(O)", "ten_duong": "Ax"},
      {"id": "d6", "loai": "giao_diem", "ten": "C", "a": "Ax", "b": "BM"}]
THAM = {"d2": {"goc": 90}, "d3": {"goc": 200}, "d4": {"goc": 300}}


def t_tia():
    H = dung_hinh(PD, THAM)
    assert "C" in H.P, H.P
    import math
    A, C, O = H.P["A"], H.P["C"], H.P["O"]
    assert abs((C[0] - A[0]) * (A[0] - O[0]) + (C[1] - A[1]) * (A[1] - O[1])) < 1e-6, "C phải nằm trên tiếp tuyến tại A"
    assert ("A", "C") in H.doan_da_ve() or ("C", "A") in H.doan_da_ve()
    assert math.isfinite(C[0])
    pd2 = [dict(b) for b in PD]
    del pd2[4]["ten_duong"]
    assert "C" in dung_hinh(pd2, THAM).P, "suy tia theo điểm gốc A"


thu('"Ax" sau tiếp tuyến tại A -> giải được tọa độ, C nằm trên tiếp tuyến, kẻ đoạn AC', t_tia)


def t_tia_loi():
    pd = [dict(b) for b in PD if b["id"] != "d5"]
    try:
        dung_hinh(pd, THAM)
    except LoiDung as e:
        assert e.ma == "HP_DUNG_LOI" and "ký hiệu tia 'Ax' chưa gắn với đường nào" in e.chi_tiet and "2 điểm chữ hoa" in e.chi_tiet, e.chi_tiet
        return
    raise AssertionError("phải báo lỗi")


thu('"Ax" không gắn đường nào -> HP_DUNG_LOI tường minh (không crash, không lặp sửa mù)', t_tia_loi)

print("5. Hình không gian: hạ cánh mềm camera")


def t_camera():
    import json
    from giai_hinh_khong_gian import giai as giai_kg
    G = giai_kg(json.load(open(os.path.join(GOC, "mau", "v97", "giao_diem_mnp.json"), encoding="utf8")))
    C = [{"so": 1, "batDau": 0, "cau": [{"text": "Đây là đề bài hình chóp", "bat": 0, "ket": 2}]},
         {"so": 2, "batDau": 120, "cau": [{"text": "Ta xét mặt đáy ABCD rồi kéo dài", "bat": 0, "ket": 3}]}]
    hkg = {"buoc": [{"canh": 1, "xoay": [{"goc_nhin": "toan_canh"}]}, {"canh": 2, "xoay": [{"goc_nhin": "nhin_day", "moc_xoay": "điểm Q không tồn tại"}]}]}
    L, loi, tk = lich_khong_gian(hkg, G["dung"], C, 30, [0, 4.0], 10)
    assert not loi, loi
    assert [x["ma"] for x in tk["canh_bao"]] == ["CAM_MAT_MOC"]
    dp = [x for x in L["xoay"] if x.get("du_phong")]
    assert len(dp) == 1 and dp[0]["goc_nhin"] == "toan_canh" and abs(dp[0]["t"] - 4.0) < 1e-6, dp


thu("moc_xoay tham chiếu mốc không tồn tại -> rơi về toan_canh ở đầu bước, 0 lỗi cứng", t_camera)

print("test_kien_truc_bp2.py: %d đạt, %d hỏng" % (DAT, len(HONG)))
sys.exit(1 if HONG else 0)
