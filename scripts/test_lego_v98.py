#!/usr/bin/env python3
"""v98 — test bộ giải Lego 6 khối (scripts/hinh_khong_gian/lego.py) + khớp màu KaTeX + lịch động tác. python scripts/test_lego_v98.py"""
import copy
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from giai_hinh_khong_gian import giai  # noqa: E402
from hinh_khong_gian.mau_tex import to_mau_dong  # noqa: E402
from hinh_khong_gian.lego import DONG_TAC, HINH_KHOI, LOAI_KHOI  # noqa: E402

dat = hong = 0


def thu(ten, dk, them=""):
    global dat, hong
    if dk:
        dat += 1
    else:
        hong += 1
    print(("ĐẠT  " if dk else "HỎNG ") + ten + ("" if dk or not them else " — " + str(them)))


GOC = json.load(open(os.path.join(os.path.dirname(__file__), "..", "mau", "v98", "thap_flycam_oxyz.json"), encoding="utf-8"))


def kb_voi(sua):
    kb = copy.deepcopy(GOC)
    sua(kb["hinh_khong_gian"], kb)
    return kb


def ma_loi(G):
    return [x["ma"] for x in G.get("loi") or []]


thu("đúng 6 khối nguyên thủy + 5 động tác + 6 hình khối", len(LOAI_KHOI) == 6 and len(DONG_TAC) == 5 and set(HINH_KHOI) == {"hop", "lang_tru", "chop", "tru", "non", "cau"})
G = giai(GOC)
thu("mẫu tháp flycam: ĐẠT", G["dat"], ma_loi(G))
sd = {x["loai"]: x["may_tinh"] for x in G["so_do"]}
thu("số đo AM + MB = √610000 ≈ 781,02 (máy tính)", abs(sd["tong_do_dai"] - math.sqrt(610000)) < 1e-6)
thu("M = giao AB' với Oxy có hoành độ 240", abs(sd["toa_do"] - 240) < 1e-9)
d = G["dung"]
S = 1 / d["tiLe"]
thu("B' = đối xứng B qua Oxy (600; 0; -300)", all(abs(a - b * S) < 1e-5 for a, b in zip(d["diem"]["B'"], (600, 0, -300))))
thu("A₁ = tịnh tiến A theo OH (600; 0; 200)", all(abs(a - b * S) < 1e-5 for a, b in zip(d["diem"]["A_1"], (600, 0, 200))))
thu("trụ: 36 mặt bên + 2 nắp, 36 cạnh viền (đường sinh biên)", all(len(k["mat"]) == 38 and len(k["vien"]) == 36 for k in d["khoiDs"]))
thu("đường gióng: đoạn chính 2 mũi tên + 2 đường dóng + nhãn số đo", any(x["vai"] == "gion" and x.get("mui") == "hai" for x in d["doan"]) and
    sum(1 for x in d["doan"] if x["vai"] == "gion_phu") == 6 and any(x["id"] == "g600#n" for x in d["nhanTu"]))
thu("hệ trục Oxyz: 3 trục có mũi tên + vạch chia", sum(1 for x in d["doan"] if x["vai"] == "truc" and x.get("mui") == "cuoi") == 3 and any(x["vai"] == "truc_vach" for x in d["doan"]))
thu("vạch số không đè nhãn điểm (không ghi '600' tại H, '200' tại A)", not any(x["id"] in ("so_x6", "so_z2") for x in d["nhanTu"]))
thu("sàn Oxy bán trong suốt", any(k.get("san") for k in d["kinh"]))
thu("vật chuyển động Flycam theo quỹ đạo (48 điểm)", any(c["diem"] == "F" and len(c["duong"]) == 48 for c in d["chuyenDs"]) and d["nhanTen"].get("F") == "Flycam")
thu("bảng màu đối tượng: AM vàng, MB = MB' cùng màu", d["bangMau"].get("AM") == "#FACC15" and d["bangMau"].get("MB") == d["bangMau"].get("MB'"))

# ---- lỗi lõi toán -> lỗi cứng ----
G2 = giai(kb_voi(lambda h, kb: kb.__setitem__("lop", "11")))
thu("Oxyz ở lớp 11 -> KG_VUOT_CHUONG_TRINH", "KG_VUOT_CHUONG_TRINH" in ma_loi(G2))
G3 = giai(kb_voi(lambda h, kb: h["so_do"][0].__setitem__("gia_tri", "800")))
thu("số đo ghi sai (800) -> KG_SAI_SO_DO", "KG_SAI_SO_DO" in ma_loi(G3))
G4 = giai(kb_voi(lambda h, kb: h["diem"].append({"ten": "X", "loai": "trung_diem", "doan": "AZ"})))
thu("quan hệ nhắc điểm chưa có -> KG_DIEM_KHONG_TON_TAI", "KG_DIEM_KHONG_TON_TAI" in ma_loi(G4))
G5 = giai(kb_voi(lambda h, kb: h["doi_tuong"].append({"id": "k", "loai": "khoi", "hinh": "kim_tu_thap"})))
thu("hình khối ngoài enum -> KG_KHOI_LOI", "KG_KHOI_LOI" in ma_loi(G5))
G6 = giai(kb_voi(lambda h, kb: h["menh_de"].append({"loai": "toi_uu", "diem": "H", "tren": "Oxy", "toi": ["A", "B"]})))
thu("mệnh đề 'H là điểm tối ưu' SAI -> KG_MENH_DE_SAI", "KG_MENH_DE_SAI" in ma_loi(G6))
G7 = giai(kb_voi(lambda h, kb: h["doi_tuong"].append({"id": "lv", "loai": "doan_xoan"})))
thu("loại khối lạ -> KG_THIEU_DAC_TA", "KG_THIEU_DAC_TA" in ma_loi(G7))

# ---- Lớp 3: khối trang trí lỗi / tràn khung -> bỏ riêng, lõi vẫn ĐẠT ----
G8 = giai(kb_voi(lambda h, kb: h["doi_tuong"].append({"id": "cay", "loai": "khoi", "hinh": "non", "tam": "KHONG_CO", "ban_kinh": 5, "cao": 20, "trang_tri": True})))
thu("trang trí lỗi tham số -> bỏ riêng, lõi ĐẠT", G8["dat"] and any("cay" in c for c in G8["canh_bao"]), G8["canh_bao"])
G9 = giai(kb_voi(lambda h, kb: (h["diem"].append({"ten": "Z", "toa_do": [9000, 9000, 0], "trang_tri": True}),
                                 h["doi_tuong"].append({"id": "nui", "loai": "khoi", "hinh": "non", "tam": "Z", "ban_kinh": 300, "cao": 900, "trang_tri": True}))))
thu("trang trí quá xa (làm co lõi) -> bỏ, không vào khoiDs", G9["dat"] and not any(k["id"] == "nui" for k in G9["dung"]["khoiDs"]), G9["canh_bao"])

# ---- đủ 6 hình khối dựng được ----
def them_khoi(o):
    return giai(kb_voi(lambda h, kb: h["doi_tuong"].append(o)))
for o, ten in [({"id": "n1", "loai": "khoi", "hinh": "non", "tam": "O", "ban_kinh": 40, "cao": 120}, "nón"),
               ({"id": "c1", "loai": "khoi", "hinh": "cau", "tam": "H", "ban_kinh": 40, "luoi": True}, "cầu + lưới"),
               ({"id": "h1", "loai": "khoi", "hinh": "hop", "goc": "O", "kich_thuoc": [100, 60, 80]}, "hộp"),
               ({"id": "l1", "loai": "khoi", "hinh": "lang_tru", "day": ["O", "H", "M"], "cao": 50}, "lăng trụ"),
               ({"id": "p1", "loai": "khoi", "hinh": "chop", "day": ["O", "H", "M"], "dinh": "A"}, "chóp")]:
    Gk = them_khoi(o)
    k = next((x for x in (Gk.get("dung") or {}).get("khoiDs") or [] if x["id"] == o["id"]), None)
    thu("khối %s dựng được (mặt kín, pháp tuyến hợp lệ)" % ten, Gk["dat"] and k is not None and len(k["mat"]) >= 4, ma_loi(Gk))
Gc = them_khoi({"id": "c1", "loai": "khoi", "hinh": "cau", "tam": "H", "ban_kinh": 40, "luoi": True})
kc_ = next(x for x in Gc["dung"]["khoiDs"] if x["id"] == "c1")
thu("cầu: mọi cạnh lưới có 2 mặt kề (đường viền tính được)", all(len(v) == 4 for v in kc_["vien"]) and len(kc_["vien"]) > 300)
for o, ten in [({"id": "tr", "loai": "duong_cong", "hinh": "tron", "tam": "O", "ban_kinh": 100}, "đường tròn"),
               ({"id": "cg", "loai": "duong_cong", "hinh": "cung", "tam": "O", "ban_kinh": 100, "goc_dau": 0, "goc_cuoi": 90}, "cung"),
               ({"id": "el", "loai": "duong_cong", "hinh": "elip", "tam": "O", "a": 120, "b": 60}, "elip"),
               ({"id": "pb", "loai": "duong_cong", "hinh": "parabol", "tu": "A", "den": "B", "cao": 80}, "parabol"),
               ({"id": "mp", "loai": "mat", "hinh": "mat_phang", "diem": ["A", "B", "M"]}, "mặt phẳng"),
               ({"id": "vt", "loai": "doan", "kieu": "tia", "doan": "AM"}, "tia")]:
    Gk = them_khoi(o)
    thu("%s dựng được" % ten, Gk["dat"], ma_loi(Gk))

# ---- khớp màu KaTeX ----
bang = {"AM": "#FACC15", "MB": "#34D399", "MB'": "#34D399", "A_1B'": "#FB7185"}
x, n = to_mau_dong(r"AM + MB = AM + MB' \ge AB'", bang)
thu("tô màu: AM, MB, MB' (dài khớp trước), không tô AB'", n == 4 and r"\textcolor{#34D399}{MB'}" in x and "AB'" in x.replace(r"\textcolor", ""), x)
x2, n2 = to_mau_dong(r"\text{AM là đoạn} = 5", bang)
thu("không tô bên trong \\text{...}", n2 == 0, x2)
x3, n3 = to_mau_dong(r"\frac{AM}{MB}", bang)
thu("không tô đối số ngay sau '{' của lệnh (tránh vỡ cú pháp) — giữ nguyên", n3 == 0 or "\\textcolor" in x3)
x4, _ = to_mau_dong(r"A_1B' = 500", bang)
thu("tô tên có chỉ số + phẩy trên (A_1B')", r"\textcolor{#FB7185}{A_1B'}" in x4, x4)

print(f"\nKẾT QUẢ: {dat} đạt, {hong} hỏng")
sys.exit(1 if hong else 0)
