#!/usr/bin/env python3
"""v98.3 — kiểm thử nhanh (không gọi mạng): python scripts/test_v98_3.py
  1. Từ điển phiên âm TTS: chuỗi đọc đổi (Bây-ét, Ô-ích-i-dét, véc-tơ, pa-ra-bôn, ê-líp, cốt), PHỤ ĐỀ giữ nguyên chữ gốc.
  2. Cắt lặng + tăng tốc: tệp sóng tổng hợp (lặng đầu 0,5 s / câu 1 / lặng 0,9 s / câu 2 / lặng đuôi 0,6 s) qua đúng bộ lọc
     loc_giong_gemini + cat_lang: khoảng lặng giữa còn 0,15-0,22 s, thời lượng ĐO LẠI khớp, mốc chia câu (chia_moc_theo_lang)
     rơi đúng khoảng lặng thật của tệp ĐÃ xử lý (sai lệch <= 0,08 s), tổng các đoạn = thời lượng đo.
  3. Nghỉ quanh cảnh khung 4 tầng (NHIP_GON): giữa cảnh <= 0,2 s, trước đáp án ~0,34 s; tắt thì về nhịp cũ.
  4. Sơ đồ cây: một kiểu số cho cả cây (phân số khi có 1/15...; thập phân khi toàn số đẹp), thành phần bi tầng 1 từ ô ghim ĐỀ.
"""
import math
import os
import struct
import sys
import tempfile
import wave
from fractions import Fraction

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chuanbi as cb  # noqa: E402
import khung4tang_v96 as v96  # noqa: E402

DAT, HONG = [], []


def kiem(dk, ten):
    (DAT if dk else HONG).append(ten)
    print(("ĐẠT  " if dk else "HỎNG ") + ten)


print("— Phiên âm TTS (chỉ chuỗi đọc)")
CAP = [("Công thức Bayes cho P(H|D)", "Bây-ét"), ("Trong hệ Oxyz", "Ô-ích-i-dét"), ("vectơ AB", "véc-tơ"), ("Vector u", "Véc-tơ"),
       ("Parabol đi qua gốc", "Pa-ra-bôn"), ("đường elip", "ê-líp"), ("cos 60°", "cốt"), ("\\cos x", "cốt"), ("mặt phẳng Oxy", "Ô-ích-i")]
for goc, mong in CAP:
    doc = cb.chuan_hoa_doc(goc)
    kiem(mong in doc, "đọc '%s' -> chứa '%s' (%s)" % (goc, mong, doc))
    kiem(mong not in cb.hien_phu_de(goc), "phụ đề '%s' giữ chữ gốc" % goc)
kiem(cb.hien_phu_de("Công thức Bayes trong Oxyz") == "Công thức Bayes trong Oxyz", "phụ đề không đổi một ký tự")
kiem("Bây" not in cb.chuan_hoa_doc("Bay qua cầu") and "cốt" not in cb.chuan_hoa_doc("cosplay"), "chỉ khớp nguyên từ (không đụng 'Bay', 'cosplay')")

print("— Cắt lặng + tăng tốc + đo lại mốc")
tam = tempfile.mkdtemp()
SR = 44100


def ghi_song(tep, doan):
    with wave.open(tep, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        buf = bytearray()
        for loai, giay in doan:
            for i in range(int(giay * SR)):
                v = 0.0 if loai == "lang" else 0.45 * math.sin(2 * math.pi * 220 * i / SR) * (1 + 0.3 * math.sin(2 * math.pi * 3 * i / SR))
                buf += struct.pack("<h", int(v * 32767))
        w.writeframes(bytes(buf))


tho = os.path.join(tam, "tho.wav")
ghi_song(tho, [("lang", 0.5), ("tieng", 1.6), ("lang", 0.9), ("tieng", 1.0), ("lang", 0.6)])
loc = cb.loc_giong_gemini("1.14")
nhanh = os.path.join(tam, "nhanh.wav")
cb.chay(["ffmpeg", "-y", "-loglevel", "error", "-i", tho, "-af", loc, "-c:a", "pcm_s16le", nhanh])
gon = os.path.join(tam, "gon.wav")
cb.cat_lang(nhanh, gon)
D = cb.do_thoi_luong(gon)
lang = cb.tim_khoang_lang(gon, nguong_db=-40, toi_thieu=0.05)
giua = [(b, e) for b, e in lang if 0.2 < b < D - 0.2]
kiem(len(giua) == 1, "còn đúng 1 khoảng lặng giữa câu (%s)" % giua)
if giua:
    dai = giua[0][1] - giua[0][0]
    kiem(0.12 <= dai <= 0.24, "khoảng lặng giữa câu %.3f s trong 0,15-0,22 s (± sai số đo)" % dai)
ky_vong = (1.6 + 1.0) / 1.14 + 0.18 / 1.14
kiem(abs(D - ky_vong) <= 0.2, "thời lượng đo lại %.2f s ≈ %.2f s (tăng tốc 1,14, đã cắt lặng đầu/cuối)" % (D, ky_vong))
kiem(not [x for x in lang if x[0] < 0.05 or x[1] > D - 0.05 and x[1] - x[0] > 0.1], "không còn lặng dài ở đầu / cuối")
do_dai = cb.chia_moc_theo_lang(gon, [30, 30], D)   # tỉ lệ ký tự LỆCH (50/50) so với giọng thật (62/38)
kiem(abs(sum(do_dai) - D) < 1e-3, "tổng các đoạn = thời lượng đo (%.3f)" % sum(do_dai))
if giua:
    tam_lang = (giua[0][0] + giua[0][1]) / 2
    kiem(abs(do_dai[0] - tam_lang) <= 0.08, "mốc đổi câu %.2f s rơi đúng khoảng lặng thật %.2f s" % (do_dai[0], tam_lang))
kiem(cb.chia_moc_theo_lang(gon, [10], D) == [D], "một câu -> nguyên thời lượng")
im_lang = os.path.join(tam, "khong_lang.wav")
ghi_song(im_lang, [("tieng", 2.0)])
dd = cb.chia_moc_theo_lang(im_lang, [1, 3], 2.0)
kiem(abs(dd[0] - 0.5) < 1e-6, "không có khoảng lặng -> giữ mốc tỉ lệ ký tự")

print("— Nghỉ quanh cảnh khung 4 tầng")
canh = [{"loai": "de_bai"}, {"loai": "tinh_toan"}, {"loai": "tinh_toan"}, {"loai": "dap_an"}, {"loai": "ket_luan"}]
cb.NHIP_GON["bat"] = True
l1, t1 = cb.nghi_canh(canh, 1)
l2, _ = cb.nghi_canh(canh, 2)
kiem(t1 + l2 <= 0.2, "giữa 2 cảnh giải: %.2f s <= 0,2 s" % (t1 + l2))
_, t2 = cb.nghi_canh(canh, 2)
l3, _ = cb.nghi_canh(canh, 3)
kiem(0.3 <= t2 + l3 <= 0.4, "trước đáp án giữ 1 nhịp %.2f s" % (t2 + l3))
cb.NHIP_GON["bat"] = False
_, t_cu = cb.nghi_canh(canh, 1)
kiem(t_cu == cb.TAIL, "tắt NHIP_GON -> nhịp cũ")
kiem("TikTok" in cb.PHONG_CACH_GIONG_4TANG and "năng lượng" in cb.PHONG_CACH_GIONG_4TANG, "chỉ dẫn giọng năng lượng kiểu Shorts")

print("— Sơ đồ cây: đồng nhất đơn vị + bi tầng 1")
TS = {"tang": ["Chọn hộp", "Lấy 2 bi"], "goc": {"con": [
    {"nhan": "Hộp 1", "p": "1/2", "con": [{"nhan": "2 đỏ", "p": "3/10"}, {"nhan": "Khác"}]},
    {"nhan": "Hộp 2", "p": "1/2", "con": [{"nhan": "2 đỏ", "p": "1/15"}, {"nhan": "Khác"}]}]},
    "duong": [[0, 0]], "mau": [[0, 0], [1, 0]], "hoi": "dieu_kien"}
kb = {"dap_an_cuoi": "P = 9/11", "khung4tang": {"de_ghim": [{"nhan": "H_1: 3Đ\\,2X"}, {"nhan": "H_2: 2Đ\\,4X"}, {"nhan": "P(H_1 \\mid D) = ?"}]}}
cay = v96.dung_so_do_cay(TS, kb, [], "12")
kiem(cay["kieu_so"] == "phan_so", "có 1/15 -> cả cây viết phân số")
kiem(all("frac" in n["p"] for n in cay["nut"]), "mọi nhãn nhánh là phân số (không trộn 0,5 / 0,3)")
kiem(cay["nut"][1]["tich"] == "\\dfrac{3}{20}" and "0{,}15" not in cay["bt_mau"], "tích nhánh 3/20 (không 0,15) = thẻ T3")
kiem(cay["nut"][0].get("bi") == "3 đỏ 2 xanh" and cay["nut"][3].get("bi") == "2 đỏ 4 xanh", "bi tầng 1 suy từ ô ghim ĐỀ")
kiem(cay["p"] == "\\dfrac{9}{11}" and cay["khop_dap_an"] is True, "đáp số 9/11 khớp")
TS2 = {"tang": ["Lần 1", "Lần 2"], "goc": {"con": [{"nhan": "Trúng", "p": "0,8", "con": [{"nhan": "Trúng", "p": "0,8"}, {"nhan": "Trượt"}]},
                                                   {"nhan": "Trượt", "con": [{"nhan": "Trúng", "p": "0,8"}, {"nhan": "Trượt"}]}]}, "duong": [[0, 0]]}
cay2 = v96.dung_so_do_cay(TS2, {"dap_an_cuoi": "0,64"}, [], "11")
kiem(cay2["kieu_so"] == "thap_phan" and cay2["p"] == "0{,}64", "toàn số thập phân đẹp -> giữ thập phân")
TS3 = {"goc": {"con": [{"nhan": "H%d" % k, "p": "1/3", "bi": "%d đỏ" % k, "con": [{"nhan": "đỏ", "p": "1/2"}, {"nhan": "xanh"}]} for k in (1, 2, 3)]}, "duong": [[2, 0]]}
cay3 = v96.dung_so_do_cay(TS3, {}, [], "11")
kiem([n.get("bi") for n in cay3["nut"] if n["tang"] == 1] == ["1 đỏ", "2 đỏ", "3 đỏ"], "trường bi khai báo thắng ô ghim")
kiem(Fraction(1, 2) and v96.bi_tu_ghim("H_3: 4Đ\\,1X") == "4 đỏ 1 xanh", "bi_tu_ghim đọc chữ tắt Đ / X")

print("\nKẾT QUẢ: %d đạt, %d hỏng" % (len(DAT), len(HONG)))
sys.exit(1 if HONG else 0)
