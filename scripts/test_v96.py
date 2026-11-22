#!/usr/bin/env python3
"""v96 — Kiểm thử Python (không gọi API): rút mẫu nhóm THEO GIÁ TRỊ, trần vét cạn, bộ mẫu đúng biến cố đang giảng (Ā khi giảng
biến cố đối, A khi chốt), sơ đồ cây / Bayes / cột phân phối tính đúng, nhánh 2D thực tế, định tuyến + chỉ đạo, quét mã thô
Intro/Outro, cắt chữ không chẻ "không ⋮ 4", nhịp chống đứng hình <= 4 s, hook 2 s, 4 mẫu --gia-lap (thời lượng + sân khấu).
Chạy: python scripts/test_v96.py"""
import json
import os
import subprocess
import sys
import time

GOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8")
import khung4tang_v93 as v93  # noqa: E402
import khung4tang_v96 as v  # noqa: E402

dat = hong = 0


def kiem(dk, ten, them=""):
    global dat, hong
    if dk:
        dat += 1
    else:
        hong += 1
    print(("ĐẠT  " if dk else "HỎNG ") + ten + ("" if dk or not them else " — " + str(them)))


KB = {"de_bai": "Rút ngẫu nhiên 3 thẻ từ 10 thẻ đánh số từ 1 đến 10. Tính xác suất để tích 3 số chia hết cho 4.", "dap_an": "2/3"}

print("— Rút mẫu: nhóm theo giá trị")
s = []
sk = v.dung_rut_mau({"nhom": [{"nhan": "Chia hết cho 4", "so": 2}, {"nhan": "Chẵn không chia hết cho 4", "so": 3}, {"nhan": "Lẻ", "so": 5}]}, KB, s)
nhom_cua = {p["gia_tri"]: p["nhom"] for p in sk["phan_tu"]}
kiem([v for v in range(1, 11) if nhom_cua[v] == 0] == [4, 8], "nhóm 0 = {4, 8} (không phải {1, 2})", nhom_cua)
kiem([v for v in range(1, 11) if nhom_cua[v] == 1] == [2, 6, 10], "nhóm 1 = {2, 6, 10} (không phải {3, 4, 5})")
kiem([v for v in range(1, 11) if nhom_cua[v] == 2] == [1, 3, 5, 7, 9], "nhóm 2 = số lẻ (không phải {6..10})")
kiem(sk["n_omega"] == 120 and sk["n_a"] == 80 and sk["p"] == "\\dfrac{2}{3}" and sk["khop_dap_an"] is True, "n(Ω)=120, n(A)=80, P=2/3 khớp đáp án")
kiem(any("tô theo giá trị" in x for x in s), "nhật ký ghi rõ đã đổi số lượng -> giá trị", s)
sk_md = v.dung_rut_mau({}, KB, [])
kiem([g["nhan"] for g in sk_md["nhom"]] == ["\\vdots 4", "\\text{chẵn, không } \\vdots 4", "\\text{lẻ}"], "không có nhóm -> dựng từ bản chất biến cố (v2)")
s2 = []
v.dung_rut_mau({}, dict(KB, dap_an="1/2"), s2)
kiem(any(x.startswith("XS_SAI_DAP_SO") for x in s2), "đáp án sai -> XS_SAI_DAP_SO", s2)
t0 = time.time()
lon = v.dung_rut_mau({"den": 40, "k": 6, "bien_co": {"loai": "tong_chia_het", "so": 3}}, {"de_bai": "", "dap_an": "1/3"}, [])
kiem(time.time() - t0 < 5 and lon["vet_can"] is False and abs(lon["p_so"] - 1 / 3) < 0.02, "trần vét cạn 100 000: C(40,6) lấy mẫu, nhanh, gần đúng", (round(time.time() - t0, 2), lon.get("p_so")))
xx = v.dung_rut_mau({}, {"de_bai": "Gieo một con xúc xắc 2 lần. Tính xác suất tổng chia hết cho 3.", "dap_an": "1/3"}, [])
kiem(xx["vat"] == "xuc_xac" and xx["n_omega"] == 36 and xx["n_a"] == 12, "xúc xắc gieo 2 lần: n(Ω)=36, n(A)=12", (xx["n_omega"], xx.get("n_a")))

print("— Bộ mẫu đúng biến cố đang giảng")
buoc = [{"t": 0, "tieu_de": "Đề"}, {"t": 10, "tieu_de": "\\overline{A}: tích không \\vdots 4"}, {"t": 20, "tieu_de": "P(A) = ?"}]
pha = [{"ten": "thu", "t": 12}, {"ten": "ket", "t": 22, "muc_tieu": "doi"}, {"ten": "thu", "t": 3}]
sk2 = v.dung_rut_mau({}, KB, [])
sua = v.gan_bo_mau_rut(sk2, pha, buoc, lambda a, b: "thử rút 2, 3 và 4" if a > 20 else "")
kiem(pha[0]["muc_tieu"] == "doi" and pha[0]["thoa"] is False and "không" in pha[0]["kl"], "giảng biến cố đối -> nhấc bộ thuộc Ā, kết luận 'không ⋮ 4'", pha[0])
kiem(pha[1]["muc_tieu"] == "A" and pha[1]["thoa"] is True, "pha chốt P(A) luôn nhấc bộ THỎA A (sửa muc_tieu sai)", pha[1])
kiem([sk2["phan_tu"][i]["gia_tri"] for i in pha[1]["chon"]] == [2, 3, 4] and pha[1]["bt"] == "2 \\times 3 \\times 4 = 24", "bộ chốt lấy đúng bộ lời đọc nhắc (2, 3, 4 -> 24 ⋮ 4)", pha[1])
kiem(pha[2]["muc_tieu"] == "A" and pha[2]["thoa"] is True, "thử rút ngoài đoạn biến cố đối -> bộ thỏa A")

print("— Sơ đồ cây / Bayes / cột phân phối")
cay = v.dung_so_do_cay({"tang": ["Lần 1", "Lần 2"], "goc": {"con": [{"nhan": "Trúng", "p": "0,8", "con": [{"nhan": "Trúng", "p": "0,8"}, {"nhan": "Trượt"}]},
                                                                   {"nhan": "Trượt", "p": "0,2", "con": [{"nhan": "Trúng", "p": "0,8"}, {"nhan": "Trượt", "p": "0,2"}]}]},
                        "duong": [[0, 1], [1, 0]]}, {"dap_an": "0,32"}, s3 := [], "11")
kiem(cay and cay["tong"] == "0{,}32" and cay["khop_dap_an"] is True, "cây 2 tầng: 0,8·0,2 + 0,2·0,8 = 0,32", cay and cay.get("bt_tong"))
kiem(any("bù xác suất" in x for x in s3), "nhánh thiếu p tự bù 1 - tổng")
bz = v.dung_luoi_bayes({"A": {"p": "1%"}, "p_B_A": "99%", "p_B_khong_A": "5%"}, {"dap_an": "≈ 0,1667"}, [])
kiem(bz and abs(bz["p_so"] - 0.16667) < 1e-3 and bz["khop_dap_an"] is True and bz["tex"]["pab"] == "0{,}0099", "Bayes xét nghiệm: P(A|B) ≈ 0,1667, số thập phân gọn", bz and bz["tex"])
kiem(v.dung_san_khau("luoi_bayes", {"A": {"p": "1%"}, "p_B_A": "99%", "p_B_khong_A": "5%"}, {"lop": "11"}, {}, [], []) is None, "luoi_bayes bị từ chối ở lớp 11 (GDPT 2018)")
cot = v.dung_cot_phan_phoi({"nhi_thuc": {"n": 4, "p": "0,5"}, "dich": [3, 4]}, {"dap_an": "5/16"}, [])
kiem(cot and len(cot["cot"]) == 5 and cot["khop_dap_an"] is True, "nhị thức n=4, p=0,5: P(X>=3) = 5/16", cot and cot.get("p"))

print("— Nhánh 2D thực tế")
kt = v.dung_kinh_te({"ham": "(20-x)(200+20x)", "bien": "x", "mien": [0, 20], "kieu": "max"}, {"dap_an": "x = 5, L = 4500"}, [])
kiem(kt and abs(kt["x_tot"] - 5) < 1e-3 and abs(kt["y_tot"] - 4500) < 0.1, "kinh tế: tối ưu x=5, L=4500", kt and (kt["x_tot"], kt["y_tot"]))
kiem(v.dung_kinh_te({"ham": "(20-x)(200+20x)", "bien": "x", "mien": [0, 20]}, {"dap_an": "x = 7"}, []) is None, "kinh tế lệch đáp án -> bỏ (lùi sơ đồ tư duy)")
s2d = v.dung_so_do_2d({"mau": "song_bo", "tham_so": {"rong": 3, "dai": 8}, "bien": "x", "mien": [0, 8], "ham": "sqrt(9+x^2)/3+(8-x)/5", "kieu": "min"}, {"dap_an": "x = 2,25"}, [])
kiem(s2d and abs(s2d["x_tot"] - 2.25) < 0.01, "qua sông: tối ưu x = 2,25 (hàm có căn)", s2d and s2d.get("x_tot"))
tt = v.dung_tang_truong({"ham": "100*(1+0.06)^t", "bien": "t", "mien": [0, 12], "moc": [0, 12]}, {"dap_an": "201,2"}, [])
kiem(tt and abs(tt["moc"][1]["y"] - 201.22) < 0.05, "tăng trưởng lãi kép 6 %, 12 năm ≈ 201,2", tt and tt["moc"])
kiem(v.ham_an_toan("__import__('os')") is None and v.ham_an_toan("exp(x)+ln(x)") is not None, "hàm an toàn: chặn mã lạ, nhận exp/ln")

print("— Định tuyến + chỉ đạo")
kiem(v.chon_san_khau({"mon": "THUC_TE", "lop": "12", "de_bai": "Giải phương trình 4^x - 3.2^x + 2 = 0", "khung4tang": {"canh_3d_vector": {"khuon": "tam_bia_gap_hop"}}})["loai"] == "tu_duy_dai_so",
     "đề đại số + AI gắn nhầm khuôn hộp -> tu_duy_dai_so (không nhét hình hộp)")
kiem(v.chon_san_khau({"mon": "THUC_TE", "lop": "12", "de_bai": "x", "chi_dao": "[chidao: vẽ đồ thị lợi nhuận]"})["loai"] == "kinh_te_do_thi", "chỉ đạo ưu tiên tuyệt đối")
kiem(v.chon_san_khau({"mon": "XAC_SUAT", "lop": "11", "chi_dao": "dùng lưới Bayes"})["loai"] == "so_do_cay", "chỉ đạo không vượt GDPT (Bayes lớp 11 -> cây)")
kiem(v.tach_chi_dao("[chidao: dùng sơ đồ cây] Bắn 2 lần") == ("Bắn 2 lần", "dùng sơ đồ cây"), "tách thẻ chỉ đạo khỏi đề")

print("— Mã thô / ký hiệu / cắt chữ")
kiem(v.tex_sang_chu(r"\overline{A}: Tích 3 số \not\vdots 4") == "Ā: Tích 3 số không ⋮ 4", "TeX -> chữ giữ nghĩa (không ra 'Tích 3 số ⋮ 4')")
kiem(v93.chu_sach(r"Xét \overline{A}: tích \not\vdots 4", 18, hoa=False) == "Xét Ā: không ⋮ 4", "cắt 18 ký tự không chẻ 'không ⋮ 4'", v93.chu_sach(r"Xét \overline{A}: tích \not\vdots 4", 18, hoa=False))
kiem(v93.chu_sach(r"Đếm n(\Omega)", 18, hoa=False) == "Đếm n(Ω)", "n(\\Omega) -> n(Ω) (trước đây 'n( )')")
props = {"mocCau": {"tieu_de": r"P(\overline{A}) = ?", "cau_hook": "Omega C_{10}^3"}, "tomTat": [{"chien_thuat": "tích ∤ 4", "cong_thuc": r"15 \not\vdots 4"}], "buoc": [], "deGhim": []}
v.sua_ma_tho_props(props)
kiem(not v.co_ma_tho(props["mocCau"]["tieu_de"]) and not v.co_ma_tho(props["mocCau"]["cau_hook"]), "Intro: mã thô -> Unicode", props["mocCau"])
kiem(props["tomTat"][0]["cong_thuc"] == r"15 \text{ không } \vdots 4" and props["tomTat"][0]["chien_thuat"] == r"tích không \vdots 4", "Outro: ∤ / \\not\\vdots chuẩn hóa")

print("— Nhịp: hook 2 s + chống đứng hình <= 4 s")
ds = v.trai_pha([{"ten": "hien"}, {"ten": "nhom"}, {"ten": "ket"}], [0, 10, 30], 6, 40)
kiem(ds[0]["t"] <= 0.5, "pha đầu bật trong 0,5 s (hook 2 giây đầu)", ds)
nh = v.nhip_chong_dung(ds, 40)
moc = sorted([p["t"] for p in ds] + nh + [40])
kiem(max(b - a for a, b in zip(moc, moc[1:])) <= 4.0, "không khoảng nào > 4 s thiếu nhấn nhá", moc)

print("— 4 mẫu --gia-lap (thời lượng + sân khấu)")
MAU = [("out/v96/vd_153504/kb_sua.json", "rut_mau"), ("mau/v96/bayes_xet_nghiem.json", "luoi_bayes"),
       ("mau/v96/loi_nhuan_tra_sua.json", "kinh_te_do_thi"), ("mau/v96/dai_so_chi_dao.json", "tu_duy_dai_so")]
if not os.path.exists(os.path.join(GOC, MAU[0][0])):
    subprocess.run(["node", "scripts/test_v96_gs.cjs"], cwd=GOC, capture_output=True)
for tep, loai in MAU:
    ten = os.path.basename(os.path.dirname(tep)) if tep.endswith("kb_sua.json") else os.path.splitext(os.path.basename(tep))[0]
    ra = os.path.join(GOC, "out", "v96", ten, "props.json")
    r = subprocess.run([sys.executable, "scripts/chuanbi.py", tep, "--gia-lap", "--props-ra", ra], cwd=GOC, capture_output=True, text=True, encoding="utf-8",
                       env=dict(os.environ, PYTHONIOENCODING="utf-8"))
    if r.returncode:
        kiem(False, "chuanbi %s" % tep, r.stderr[-400:])
        continue
    p = json.load(open(ra, encoding="utf-8"))
    k4 = p.get("khung4tang") or {}
    sk = k4.get("sanKhau") or {}
    kiem(sk.get("loai") == loai and not k4.get("canh3dv"), "%s: sân khấu %s, không còn khuôn 3D" % (ten, loai), sk.get("loai"))
    kiem(sk.get("pha") and sk["pha"][0]["t"] <= 0.5, "%s: hook 2 s (pha đầu %.1f s)" % (ten, sk["pha"][0]["t"] if sk.get("pha") else -1))
    if ten in ("vd_153504", "bayes_xet_nghiem", "loi_nhuan_tra_sua"):
        tong = p["tongFrame"] / 30.0
        kiem(55 <= tong <= 70, "%s: thời lượng %.1f s trong 55-70 s" % (ten, tong))
    van = json.dumps(k4, ensure_ascii=False)
    kiem(not any(v.co_ma_tho(x) for x in [json.dumps(k4.get("mocCau"), ensure_ascii=False)]) and "\\\\not" not in van, "%s: không lộ mã thô ở Intro, không còn \\not" % ten)
print("\nKẾT QUẢ: %d đạt, %d hỏng" % (dat, hong))
sys.exit(1 if hong else 0)
