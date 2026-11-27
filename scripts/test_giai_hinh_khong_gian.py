#!/usr/bin/env python3
"""v97: test bộ giải hình học không gian (scripts/giai_hinh_khong_gian.py) - không gọi mạng, < 2 s.
python scripts/test_giai_hinh_khong_gian.py"""
import copy
import json
import os
import sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(GOC, "scripts"))
from giai_hinh_khong_gian import giai  # noqa: E402
from hinh_khong_gian.hinh import cham, cheo, dai, kc, mat_qua, tru  # noqa: E402

DAT, HONG = 0, []


def ok(dk, ten):
    global DAT
    if dk:
        DAT += 1
    else:
        HONG.append(ten)
        print("  ✗", ten)


def doc(t):
    return json.load(open(os.path.join(GOC, "mau", "v97", t), encoding="utf8"))


def ma_loi(G):
    return {x["ma"] for x in (G or {}).get("loi") or []}


def tren_mat(p, ps):
    n, o = mat_qua(*ps[:3])
    return abs(cham(n, tru(p, o))) < 1e-6


# ---- Mẫu 1: giao điểm + thiết diện ----
kb1 = doc("giao_diem_mnp.json")
G1 = giai(kb1)
ok(G1 and G1["dat"], "mẫu 1 đạt (%s)" % (G1 or {}).get("loi"))
d = G1["dung"]
P = {k: tuple(v) for k, v in d["diem"].items()}
t_m = G1["cau_hinh"]["ty_le_bat_ky"]["M"]
ok(0.30 <= t_m <= 0.42 or 0.58 <= t_m <= 0.70, "M bất kỳ khóa trong [0,30;0,42] ∪ [0,58;0,70] (%.2f)" % t_m)
ok(1.10 <= G1["cau_hinh"]["h_a"] <= 1.45, "h/a trong [1,10; 1,45]")
ok(G1["cau_hinh"]["so_mau"] >= 10, "mệnh đề kiểm trên >= 10 cấu hình")
ok(abs(kc(P["S"], P["E"]) + kc(P["E"], P["D"]) - kc(P["S"], P["D"])) < 1e-6, "E nằm trên đoạn SD")
ok(tren_mat(P["E"], [P["M"], P["N"], P["P"]]), "E thuộc (MNP)")
ok(abs(P["K"][2]) < 1e-9 and kc(P["K"], P["D"]) > 0.3, "K ở đáy, trên phần kéo dài của CD")
vai = {x["id"]: x["vai"] for x in d["doan"]}
ok(vai.get("DK") == "keo_dai" and vai.get("PK") == "keo_dai", "tự thêm đoạn kéo dài D->K, P->K")
ok(vai.get("KM") == "dich" and vai.get("NP") == "phu", "vai đoạn: KM đích, NP phụ")
ok(sum(1 for x in d["doan"] if x["vai"] == "khoi") == 8, "8 cạnh khối chóp tứ giác")
k = d["kinh"][0]
ok(k["id"] == "(MNP)" and len(k["da_giac"]) == 5, "thiết diện (MNP) là ngũ giác")
ok(all(tren_mat(tuple(p), [P["M"], P["N"], P["P"]]) for p in k["da_giac"] + k["bung"]), "thiết diện + mặt bung nằm trên (MNP)")
gb = [sum(p[i] for p in k["bung"]) / 4 for i in range(3)]
ok(max(kc(tuple(p), tuple(gb)) for p in k["bung"]) > max(kc(tuple(p), tuple(gb)) for p in k["da_giac"]), "mặt bung rộng hơn thiết diện")
tr = d["truot"]
ok(tr and tr["diem"] == "M" and len(tr["khung"]) == 9, "điểm trượt M: 9 khung")
ok(all(abs(kc(P["S"], tuple(f["diem"]["M"])) + kc(tuple(f["diem"]["M"]), P["C"]) - kc(P["S"], P["C"])) < 1e-6 for f in tr["khung"]), "M trượt luôn trên SC")
ok(all(abs(kc(P["S"], tuple(f["diem"]["E"])) + kc(tuple(f["diem"]["E"]), P["D"]) - kc(P["S"], P["D"])) < 1e-6 for f in tr["khung"]), "E (phụ thuộc M) luôn trên SD khi M trượt")
ok(tr["khung"][-1]["diem"]["M"] == d["diem"]["M"], "khung trượt cuối = cấu hình chọn")
ok(set(d["nhan"]) >= {"S", "A", "B", "C", "D", "M", "N", "P", "K", "E"}, "nhãn đủ đỉnh + điểm dựng")

# ---- Mẫu 2: vuông góc / góc / khoảng cách (kích thước thật) ----
G2 = giai(doc("vuong_goc_sa.json"))
ok(G2 and G2["dat"], "mẫu 2 đạt (%s)" % (G2 or {}).get("loi"))
ok(G2["cau_hinh"]["kich_thuoc_that"], "mẫu 2 kiểm số đo bằng kích thước thật")
sd = {x["loai"]: x["may_tinh"] for x in G2["so_do"]}
ok(abs(sd["goc_duong_mat"] - 45) < 1e-6 and abs(sd["khoang_cach_diem_mat"] - 6 ** 0.5 / 3) < 1e-6, "góc 45°, d = a√6/3")
P2 = {k: tuple(v) for k, v in G2["dung"]["diem"].items()}
ok(abs(cham(tru(P2["H"], P2["A"]), tru(P2["B"], P2["S"]))) < 1e-5, "H là chân vuông góc từ A xuống SB")
ok(len(G2["dung"]["goc"]) == 4 and sum(g["vuong"] for g in G2["dung"]["goc"]) == 3, "3 ký hiệu góc vuông + 1 cung góc")

# ---- lỗi cứng ----
kb = copy.deepcopy(kb1)
kb["hinh_khong_gian"]["menh_de"].append({"loai": "vuong_goc", "a": "NP", "b": "CD"})
ok("KG_MENH_DE_SAI" in ma_loi(giai(kb)), "mệnh đề sai -> KG_MENH_DE_SAI")
kb = copy.deepcopy(kb1)
kb["hinh_khong_gian"]["diem"].append({"ten": "I", "loai": "trung_diem", "doan": "SD"})
kb["hinh_khong_gian"]["menh_de"] = [{"loai": "song_song", "a": "IM", "b": "CD"}]
G = giai(kb)
ok("KG_MENH_DE_SAI" in ma_loi(G), "mệnh đề chỉ đúng khi M là trung điểm -> sai với điểm bất kỳ")
kb = copy.deepcopy(doc("vuong_goc_sa.json"))
kb["hinh_khong_gian"]["so_do"][0]["gia_tri"] = "60°"
ok("KG_SAI_SO_DO" in ma_loi(giai(kb)), "số đo lệch đáp án -> KG_SAI_SO_DO")
kb = doc("vuong_goc_sa.json")
kb["hinh_khong_gian"]["so_do"].append({"loai": "goc_ba_diem", "gia_tri": "45°"})
G = giai(kb, chi_kiem=True)
ok(not G["dat"] and ma_loi(G) == {"KG_DUNG_LOI"} and all(dl["loai"] != "goc_ba_diem" for dl in G["so_do"]),
   "số đo góc ba điểm thiếu 'goc' -> KG_DUNG_LOI")
kb = copy.deepcopy(kb1)
kb["lop"] = "10"
ok("KG_VUOT_CHUONG_TRINH" in ma_loi(giai(kb)), "lớp 10 -> KG_VUOT_CHUONG_TRINH")
kb = copy.deepcopy(kb1)
kb["hinh_khong_gian"]["he_truc"] = "oxyz"
ok("KG_VUOT_CHUONG_TRINH" in ma_loi(giai(kb)), "Oxyz ở lớp 11 -> KG_VUOT_CHUONG_TRINH")
kb["lop"] = "12"
ok("KG_VUOT_CHUONG_TRINH" not in ma_loi(giai(kb)), "Oxyz lớp 12: cửa mở (không lỗi)")
kb = copy.deepcopy(kb1)
kb["hinh_khong_gian"]["buoc"][2]["the"].append({"loai": "chu", "noi_dung": "dùng vectơ pháp tuyến của (MNP)"})
ok("KG_VUOT_CHUONG_TRINH" in ma_loi(giai(kb)), "vectơ pháp tuyến ở lớp 11 -> KG_VUOT_CHUONG_TRINH")
kb = copy.deepcopy(kb1)
kb["hinh_khong_gian"]["diem"][3] = {"ten": "K", "loai": "giao", "duong": ["NQ", "CD"]}
ok("KG_DIEM_KHONG_TON_TAI" in ma_loi(giai(kb)), "điểm chưa dựng -> KG_DIEM_KHONG_TON_TAI")
kb = copy.deepcopy(kb1)
kb["hinh_khong_gian"]["diem"][3] = {"ten": "K", "loai": "giao", "duong": ["SA", "CD"]}
ok("KG_DUNG_LOI" in ma_loi(giai(kb)), "giao hai đường chéo nhau -> KG_DUNG_LOI")
kb = copy.deepcopy(kb1)
kb["hinh_khong_gian"]["diem"][2]["ty_le"] = 0.02
ok("KG_DINH_CHUM" in ma_loi(giai(kb)), "điểm sát đỉnh (tỷ lệ 0,02) -> KG_DINH_CHUM")
kb = copy.deepcopy(kb1)
kb["hinh_khong_gian"]["khoi"]["loai"] = "chop_ngu_giac"
ok("KG_KHOI_LOI" in ma_loi(giai(kb)), "khối chưa hỗ trợ -> KG_KHOI_LOI")
ok(giai({"canh": []}) is None, "không có hinh_khong_gian -> None")

# ---- các khối khác ----
for loai, n_dinh, n_canh in (("lang_tru_tam_giac", 6, 9), ("lap_phuong", 8, 12), ("hop_chu_nhat", 8, 12), ("chop_tam_giac", 4, 6), ("tu_dien", 4, 6)):
    G = giai({"lop": "11", "hinh_khong_gian": {"khoi": {"loai": loai}, "diem": [], "buoc": []}})
    ok(G and G["dat"] and len(G["dung"]["khoi"]["dinh"]) == n_dinh and len(G["dung"]["khoi"]["canh"]) == n_canh, "dựng %s" % loai)
G = giai({"lop": "11", "hinh_khong_gian": {"khoi": {"loai": "lap_phuong"}, "diem": [], "buoc": []}})
Q = {k: tuple(v) for k, v in G["dung"]["diem"].items()}
ok(abs(kc(Q["A"], Q["A'"]) - kc(Q["A"], Q["B"])) < 1e-9, "lập phương: AA' = AB")
G = giai({"lop": "11", "hinh_khong_gian": {"khoi": {"loai": "chop_tu_giac", "day_kieu": "vuong", "deu": True}, "diem": [], "buoc": [],
                                            "menh_de": [{"loai": "vuong_goc_mat", "duong": "SB", "mat": "ABCD"}]}})
ok("KG_MENH_DE_SAI" in ma_loi(G), "chóp đều: SB không vuông góc đáy")
G = giai({"lop": "11", "hinh_khong_gian": {"khoi": {"loai": "chop_tu_giac", "day_kieu": "vuong", "deu": True}, "diem": [
    {"ten": "O", "loai": "giao", "duong": ["AC", "BD"]}], "buoc": [], "menh_de": [{"loai": "vuong_goc_mat", "duong": "SO", "mat": "ABCD"}]}})
ok(G["dat"], "chóp đều: SO vuông góc đáy")
G = giai({"lop": "11", "hinh_khong_gian": {"khoi": {"loai": "chop_tam_giac", "day_kieu": "vuong", "vuong_tai": "B", "chan_duong_cao": "A"},
                                            "diem": [], "buoc": [], "menh_de": [{"loai": "vuong_goc_mat", "duong": "BC", "mat": "SAB"}]}})
ok(G["dat"], "chóp tam giác vuông tại B, SA ⊥ đáy: BC ⊥ (SAB)")
# CLI --chi-kiem (BP2)
import subprocess  # noqa: E402
r = subprocess.run([sys.executable, os.path.join(GOC, "scripts", "giai_hinh_khong_gian.py"), "-", "--chi-kiem"], input=json.dumps(kb1).encode("utf8"),
                   capture_output=True)
ok(r.returncode == 0 and json.loads(r.stdout.decode("utf8"))["dat"] is True, "CLI --chi-kiem trả JSON, mã 0")
r = subprocess.run([sys.executable, os.path.join(GOC, "scripts", "giai_hinh_khong_gian.py"), "-", "--chi-kiem"], input=b'{"canh":[]}', capture_output=True)
ok(r.returncode == 3, "CLI: không có hinh_khong_gian -> mã 3")

print("test_giai_hinh_khong_gian: %d đạt, %d hỏng" % (DAT, len(HONG)))
sys.exit(1 if HONG else 0)
