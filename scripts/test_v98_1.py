#!/usr/bin/env python3
"""v98.1 — dữ liệu "cây dòng chảy" Bayes + đáp án phân số trên ô ghim ĐỀ (không gọi API, không dựng hình).
  python scripts/test_v98_1.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import khung4tang_v96 as v  # noqa: E402
from khung4tang_v95 import phan_dap_an, de_ghim_doi  # noqa: E402
from khung4tang_v98 import _so_dap, che_dap_an_ghim  # noqa: E402

DAT, HONG = 0, 0


def kiem(dk, ten):
    global DAT, HONG
    if dk:
        DAT += 1
    else:
        HONG += 1
        print("  HỎNG:", ten)


TS = {"tang": ["Chọn hộp", "Lấy 2 bi"], "goc": {"con": [
    {"nhan": "Hộp 1", "p": "1/2", "con": [{"nhan": "2 đỏ", "p": "3/10"}, {"nhan": "Khác"}]},
    {"nhan": "Hộp 2", "p": "1/2", "con": [{"nhan": "2 đỏ", "p": "1/15"}, {"nhan": "Khác", "p": "14/15"}]}]},
    "duong": [[0, 0]], "mau": [[0, 0], [1, 0]], "hoi": "dieu_kien"}

sua = []
cay = v.dung_so_do_cay(TS, {"dap_an_cuoi": "P = 9/11"}, sua, "12")
kiem(cay and cay.get("bayes") is True, "cây Bayes lớp 12 có cờ bayes")
kiem(cay.get("p_so") and abs(cay["p_so"] - 9 / 11) < 1e-9, "P(H1|D) = 9/11")
kiem(cay.get("khop_dap_an") is True, "khớp đáp án phân số")
mau = [n["nhan"] for n in cay["nut"] if n.get("mau")]
kiem(mau == ["Hộp 1", "2 đỏ", "Hộp 2", "2 đỏ"], "nút mẫu số = 2 đường dẫn tới 2 đỏ (%s)" % mau)
kiem([n["nhan"] for n in cay["nut"] if n["sang"]] == ["Hộp 1", "2 đỏ"], "tử số chỉ đường hộp 1")
kiem(all(not n.get("mau") for n in cay["nut"] if n["nhan"] == "Khác"), "nhánh Khác không thuộc mẫu số")
kiem("11}{60}" in cay.get("bt_mau", ""), "bt_mau cộng ra 11/60 (%s)" % cay.get("bt_mau"))

cay11 = v.dung_so_do_cay(TS, {"dap_an_cuoi": "P = 3/20"}, [], "11")
kiem(cay11 and not cay11.get("bayes") and all("mau" not in n for n in cay11["nut"]), "lớp 11 không có Bayes (GDPT 2018)")


# pha mặc định khi kịch bản không ghi pha: thêm toan_phan, bayes trước ket
def tim_moc(cum, ct, t_tu=0):
    return None


kb = {"mon": "XAC_SUAT", "lop": "12", "de_bai": "Hộp 1 ... sơ đồ cây", "dap_an_cuoi": "P = 9/11",
      "khung4tang": {"san_khau": {"loai": "so_do_cay", "tham_so": TS}}}
sk, _, _ = v.gan_san_khau(kb, kb["khung4tang"], [], [5, 10, 15, 20], 4, 40, tim_moc)
ten = [p["ten"] for p in sk["pha"]] if sk else []
kiem(sk and sk["loai"] == "so_do_cay", "định tuyến giữ sơ đồ cây khi kịch bản ghi rõ")
kiem(ten[-3:] == ["toan_phan", "bayes", "ket"], "pha mặc định thêm toàn phần + Bayes (%s)" % ten)
kiem(all(ten and sk["pha"][k]["t"] < sk["pha"][k + 1]["t"] for k in range(len(ten) - 1)), "pha tăng dần")

# đáp án phân số trên ô ghim
kiem(phan_dap_an("P = 9/11").get("P") == ("9/11", ""), "phan_dap_an giữ cả phân số 9/11")
kiem(phan_dap_an("x = 2 cm, V lớn nhất = 144 cm³") == {"x": ("2", "cm"), "V": ("144", "cm³")}, "phan_dap_an cũ không đổi")
g = de_ghim_doi([{"id": "q", "nhan": "P(H_1 \\mid D) = ?"}], "P = 9/11", 30)
kiem(g[0]["doi"]["nhan"] == "P(H_1 \\mid D) = \\tfrac{9}{11}", "ô ghim đổi ra \\tfrac{9}{11} (%s)" % g[0]["doi"]["nhan"])
kiem(abs(float(_so_dap("P = 9/11")["P"][0]) - 9 / 11) < 1e-6, "v98 so đáp án phân số dạng số")
che = che_dap_an_ghim([{"id": "q", "nhan": "P = 0,8182"}], "P = 9/11")
kiem("?" in str(che[0]), "che ô ghim AI ghi sẵn 0,8182 khi đáp án 9/11 (%s)" % (che,))

print("KẾT QUẢ: %d đạt, %d hỏng" % (DAT, HONG))
sys.exit(1 if HONG else 0)
