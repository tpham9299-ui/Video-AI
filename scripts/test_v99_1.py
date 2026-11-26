"""v99.1 — kiểm thử Python (không gọi mạng): python scripts/test_v99_1.py
  1. Phụ đề không rò phiên âm ("ít-sờ", "ích-xì", "vê tại 2") + giữ "lợi ích".
  2. Không đọc lặp "bằng X bằng X" (chữ / số / phân số / nhóm nghìn), giữ câu đúng.
  3. Mốc bước gắn cảnh (không chia đều thời gian); "Kết luận" / thẻ chốt / huy hiệu / ô đổi đáp số không trước câu chốt.
  4. Nhịp chống đứng hình: không khoảng nào > 6 s trong T2; Outro đủ 3 dòng có công thức.
  5. Hộp cát sân khấu tự sinh: mã mẫu chạy sạch; mã độc / tràn viewBox / quá giờ bị chặn.
  6. 2 mẫu mau/v99_1 (nếu đã chạy chuanbi --gia-lap -> out/v99_1/*/props.json): theme đúng, có tuSinh, không rò / lặp, mốc đáp án.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chuanbi as cb  # noqa: E402
import khung4tang_v99 as v99  # noqa: E402
import tu_sinh_svg as ts  # noqa: E402

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dat = hong = 0


def kiem(dk, ten):
    global dat, hong
    if dk:
        dat += 1
    else:
        hong += 1
    print(("ĐẠT  " if dk else "HỎNG ") + ten)


PHIEN_AM = re.compile(r"ít[\s-]?sờ|ích[\s-]?xì|ếch[\s-]?xì|(?<![\wÀ-ỹ])v[eê] tại|(?<=\d )ích(?![\wÀ-ỹ])", re.I)
LAP = re.compile(r"(?:bằng|=)\s+([\d.,/]+)\s*(?:[^\s\d]{0,8}\s*)?(?:bằng|=)\s+\1(?![\d])")


def phu_de(s):   # phụ đề dùng dấu cách không ngắt quanh phép toán -> so bằng dấu cách thường
    return cb.hien_phu_de(v99.bo_lap_bang(v99.tra_ky_hieu(s), cb.so_chu_sang_so)).replace(" ", " ")


print("1. Phụ đề không rò phiên âm")
for vao, ra in [("Gọi ít-sờ là số lần giảm", "Gọi x là số lần giảm"), ("Giá còn 100 trừ 5 ích", "Giá còn 100 − 5x"),
                ("Thay vào ta có vê tại 2 bằng 144", "Thay vào ta có V(2) = 144"), ("vê phẩy ích bằng 0", "V'(x) = 0"),
                ("ép ích-xì bằng ích-xì bình phương", "f(x) = x²"), ("lờ tại 3 là 33800", "L(3) là 33.800")]:
    kiem(phu_de(vao) == ra, "'%s' -> '%s' (được '%s')" % (vao, ra, phu_de(vao)))
kiem(phu_de("lợi ích bằng 5 triệu") == "lợi ích bằng 5 triệu", "giữ 'lợi ích' (không thành 'lợi x')")
kiem(phu_de("Ve sầu kêu") == "Ve sầu kêu", "giữ chữ thường 've sầu'")
kiem(not PHIEN_AM.search(phu_de("Gọi ít-sờ, đáy 16 trừ 2 ích, vê tại 2 bằng 144")), "chuỗi hỗn hợp không còn phiên âm")

for cau, dung in [
    ("Biến cố đối là không có cả 2 bạn", "Biến cố đối là không có cả 2 bạn"),
    ("x bằng không", "x = 0"), ("x lớn hơn không", "x > 0"),
    ("không phẩy năm", "0,5"), ("trừ b trên hai a", "-b/2a"),
]:
    kiem(phu_de(cau) == dung, cau + " -> " + dung)

print("2. Không đọc lặp số")
for vao, ra in [("Thể tích lớn nhất bằng một trăm bốn mươi tư bằng 144.", "Thể tích lớn nhất bằng một trăm bốn mươi tư."),
                ("V(2) = 144 bằng 144 cm³.", "V(2) = 144 cm³."), ("x bằng 2 bằng 2 bằng 2.", "x bằng 2."),
                ("Lợi nhuận bằng 4.500 bằng 4500 nghìn đồng.", "Lợi nhuận bằng 4.500 nghìn đồng."),
                ("P bằng 2/3 bằng hai phần ba.", "P bằng 2/3."),
                ("Vậy 16 nhân 9 bằng 144.", "Vậy 16 nhân 9 bằng 144."), ("a bằng 2, b bằng 2.", "a bằng 2, b bằng 2."),
                ("S bằng 3 cộng 4 bằng 7.", "S bằng 3 cộng 4 bằng 7."),
                ("lợi nhuận lớn nhất 33,8 triệu đồng bằng 33,8 triệu.", "lợi nhuận lớn nhất 33,8 triệu đồng."),
                ("x bằng 2,5 bằng 2,5.", "x bằng 2,5."), ("Vậy 16 nhân 9 bằng 144, rồi 144 chia 2.", "Vậy 16 nhân 9 bằng 144, rồi 144 chia 2.")]:
    kiem(v99.bo_lap_bang(vao, cb.so_chu_sang_so) == ra, "'%s' -> '%s' (được '%s')" % (vao, ra, v99.bo_lap_bang(vao, cb.so_chu_sang_so)))

print("3. Mốc gắn cảnh + khóa mốc đáp án")
cac_canh = [{"loi_thoai": "Đề bài hỏi gì"}, {"loi_thoai": "Gọi x là số lần giảm giá"}, {"loi_thoai": "Lập hàm lợi nhuận bậc hai"},
            {"loi_thoai": "Thử nhanh vài giá trị nhỏ"}, {"loi_thoai": "Đỉnh của parabol cho lợi nhuận lớn nhất"}, {"loi_thoai": "Vậy giá vé tối ưu"}]
buoc = [{"canh": 1}, {"canh": 2}, {"khi_noi": "lập hàm lợi nhuận"}, {"khi_noi": "thử nhanh"}, {"tieu_de": "Đỉnh parabol"}, {"nhan": "Kết luận"}]
cs = v99.suy_canh_buoc(buoc, cac_canh)
kiem(cs[:5] == [1, 2, 3, 4, 5], "bước thiếu `canh` suy đúng cảnh theo lời (%s)" % cs)
kiem(all(b >= a for a, b in zip(cs, cs[1:])), "số cảnh suy ra chỉ tiến")
out = {"buoc": [{"t": 0.0, "nhan": "Đề", "the": []}, {"t": 10.0, "nhan": "Bước 1", "the": [{"t": 10.5}]},
                {"t": 20.0, "nhan": "Kết luận", "tieu_de": "Đáp số", "the": [{"t": 20.4, "chot": True, "moc": [20.6]}],
                 "doi_chieu": {"t_giai": 19.0, "t_chot": 19.5}}],
       "deGhim": [{"nhan": "x = ?", "doi": {"nhan": "x = 3", "t": 18.0}}], "tChot": 20.4}
v99.khoa_dap_an(out, 35.0, ["3"])
kl = out["buoc"][2]
kiem(kl["t"] >= 35.0 and all(th["t"] >= 35.0 for th in kl["the"]), "bước 'Kết luận' + thẻ không bật trước câu chốt (35 s)")
kiem(kl["doi_chieu"]["t_huy_hieu"] >= 35.0, "huy hiệu ★ CỰC ĐẠI chỉ từ câu chốt")
kiem(out["deGhim"][0]["doi"]["t"] >= 35.0 and out["tChot"] >= 35.0, "ô đổi đáp số + tChot không trước câu chốt")
kiem(out["buoc"][1]["t"] < out["buoc"][2]["t"], "thứ tự bước giữ nguyên")
tu = [{"w": w, "bat": 30 + 0.4 * k} for k, w in enumerate("vậy giá vé tối ưu là 85 nghìn lợi nhuận 33,8 triệu".split())]
cp = [{"loai": "tinh_toan", "batDau": 0, "soFrame": 900}, {"loai": "dap_an", "batDau": 900, "soFrame": 300}]
kiem(abs(v99.moc_cong_bo(tu, cp, 30, ["85", "33,8"]) - 32.4) < 1e-6, "mốc công bố = từ đầu tiên mang số đáp án (32,4 s)")
tu2 = [{"w": w, "bat": 30 + 0.4 * k} for k, w in enumerate("vậy là một trăm bốn mươi tư".split())]
kiem(abs(v99.moc_cong_bo(tu2, cp, 30, ["144"], cb.so_chu_sang_so) - 30.8) < 1e-6, "đáp án đọc bằng chữ vẫn bắt đúng mốc")

print("4. Chống đứng hình + Outro")
o2 = {"buoc": [{"t": 0}, {"t": 4}, {"t": 30}], "sanKhau": None}
nhip = v99.nhip_chong_dung(o2, [5, 9, 13, 16, 21, 25], 40)
o2["nhipT2"] = nhip
moc = v99.moc_doi_hinh(o2) + nhip + [40]
moc = sorted(set(moc))
kiem(max(b - a for a, b in zip(moc, moc[1:])) <= 6.0, "không khoảng nào > 6 s (max %.1f s)" % max(b - a for a, b in zip(moc, moc[1:])))
kiem(any(abs(x - 9) < 1e-6 for x in nhip), "nhịp đặt đúng đầu câu thoại")
ra = v99.du_cong_thuc_tom_tat([{"chien_thuat": "Đặt ẩn", "cong_thuc": "x"}, {"chien_thuat": "Lập hàm", "cong_thuc": ""}, {"chien_thuat": "Kết luận", "cong_thuc": ""}],
                              [{"nhan": "Lập hàm lợi nhuận", "the": [{"loai": "cong_thuc", "dong": ["L(x) = -200x^2"]}]}],
                              {"dap_an_cuoi": "Giá vé 85 nghìn"}, lambda s: str(s or ""),
                              lambda b: next((th["dong"][-1] for th in b.get("the") or [] if th.get("dong")), ""))
kiem(all(d["cong_thuc"] for d in ra), "Outro: cả 3 dòng có công thức (%s)" % [d["cong_thuc"] for d in ra])
kiem(ra[2]["cong_thuc"] == "Giá vé 85 nghìn", "dòng 'Kết luận' = đáp số")

print("5. Hộp cát sân khấu tự sinh")


def bi_chan(ma, ma_loi, so_buoc=4):
    try:
        ts.dung(ma, so_buoc)
        return False
    except ts.LoiTuSinh as e:
        return str(e).startswith(ma_loi)


TOT = 'import math\ndef ve():\n    return [{"buoc": k, "svg": \'<circle cx="%d" cy="200" r="20" fill="#5CE1E6"/>\' % (100 + 100 * k)} for k in range(4)]\n'
kiem(len(ts.dung(TOT, 4)) == 4, "mã hợp lệ chạy sạch (4 lớp)")
for ma, loi, ten in [
    ("import os\ndef ve(): return []", "TS_IMPORT", "import os"),
    ("def ve():\n    open('x','w')\n    return []", "TS_CAM", "open()"),
    ("def ve():\n    return ().__class__", "TS_CAM", "thuộc tính ẩn __class__"),
    ("def ve():\n    return '{0.__class__}'.format(1)", "TS_CAM", "thoát qua str.format"),
    ("def ve():\n    return __import__('os')", "TS_CAM", "__import__"),
    ("def ve():\n    while True: pass", "TS_QUA_GIO", "vòng lặp vô hạn (timeout 5 s)"),
    ("def ve():\n    return [{'buoc': k, 'svg': '<circle cx=\"900\" cy=\"10\" r=\"5\"/>'} for k in range(4)]", "TS_TRAN_VIEWBOX", "tràn viewBox"),
    ("def ve():\n    return [{'buoc': k, 'svg': '<path d=\"m 10 10 l 5 5\"/>'} for k in range(4)]", "TS_PATH_TUONG_DOI", "path tương đối"),
    ("def ve():\n    return [{'buoc': k, 'svg': '<script>alert(1)</script>'} for k in range(4)]", "TS_SVG_CAM", "chuỗi script"),
    ("def ve():\n    return [{'buoc': k, 'svg': '<image x=\"1\" y=\"1\"/>'} for k in range(4)]", "TS_SVG_CAM", "thẻ image"),
    ("def ve():\n    return [{'buoc': k, 'svg': '<rect x=\"1\" y=\"1\" width=\"5\" height=\"5\" filter=\"url(#a)\"/>'} for k in range(4)]", "TS_SVG_FILTER", "filter"),
    ("def ve():\n    return [{'buoc': 0, 'svg': '<rect x=\"1\" y=\"1\" width=\"5\" height=\"5\"/>'}]", "TS_DUNG_IM", "đứng im (1 bước)"),
    ("def khac(): return []", "TS_THIEU_HAM_VE", "thiếu ve()"),
]:
    kiem(bi_chan(ma, loi), "chặn %s (%s)" % (ten, loi))

print("6. Hai mẫu v99.1")
for ten, theme in (("koch_dao", "deep_ocean"), ("gia_ve_parabol", "emerald_studio")):
    kb = json.load(open(os.path.join(GOC, "mau", "v99_1", ten + ".json"), encoding="utf8"))
    kiem(v99.chon_theme(kb) == theme, "%s: theme %s" % (ten, theme))
    kiem(len(ts.dung(kb["khung4tang"]["tu_sinh"]["ma"], len(kb["khung4tang"]["buoc"]))) >= 5, "%s: mã tự sinh chạy sạch trong hộp cát" % ten)
    p = os.path.join(GOC, "out", "v99_1", ten, "props.json")
    if not os.path.exists(p):
        print("  (bỏ qua props %s - chạy chuanbi.py --gia-lap trước)" % ten)
        continue
    pr = json.load(open(p, encoding="utf8"))
    k4 = pr.get("khung4tang") or {}
    cau = [c["text"] for c in (k4.get("cau") or [])] + [x["text"] for c in pr.get("canh") or [] for x in c.get("cau") or []]
    kiem(cau and not any(PHIEN_AM.search(c) for c in cau), "%s: phụ đề không rò phiên âm" % ten)
    kiem(not any(LAP.search(c) for c in cau), "%s: phụ đề không lặp 'bằng X bằng X'" % ten)
    kiem(k4.get("theme") == theme and (k4.get("tuSinh") or {}).get("lop"), "%s: props có theme + tuSinh" % ten)
    tcb = k4.get("tCongBo")
    kl = [b for b in k4.get("buoc") or [] if re.search(r"kết\s*luận", b.get("nhan", ""), re.I)]
    kiem(tcb is not None and kl and all(b["t"] >= tcb - 0.05 for b in kl), "%s: 'Kết luận' (%.1f s) không trước câu chốt (%.1f s)" % (ten, kl[0]["t"] if kl else -1, tcb or -1))
    moc = sorted(set(v99.moc_doi_hinh(k4) + (k4.get("nhipT2") or []) + [k4.get("tongFrame", 0) / 30.0]))
    kiem(max(b - a for a, b in zip(moc, moc[1:])) <= 6.05, "%s: T2 không đứng > 6 s (max %.1f s)" % (ten, max(b - a for a, b in zip(moc, moc[1:]))))
    tt = k4.get("tomTat") or []
    kiem(len(tt) == 3 and all(str(d.get("cong_thuc") or "").strip() for d in tt), "%s: Outro 3 dòng đủ công thức" % ten)

print("\nKẾT QUẢ: %d đạt, %d hỏng" % (dat, hong))
sys.exit(1 if hong else 0)
