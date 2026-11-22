#!/usr/bin/env python3
"""v96 — Kiểm thử phiên âm TTS toán (không gọi API): bảng Tổ hợp – Xác suất mới (doc_toan_v96) + đường đọc đầy đủ chuan_hoa_doc,
bảo đảm không phá phiên âm hàm số của v95 (V(x), V'(x), V_max). Chạy: python scripts/test_tts_toan.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8")
import chuanbi  # noqa: E402
import khung4tang_v96 as v96  # noqa: E402

dat = hong = 0


def kiem(dk, ten, them=""):
    global dat, hong
    if dk:
        dat += 1
    else:
        hong += 1
    print(("ĐẠT  " if dk else "HỎNG ") + ten + ("" if dk or not them else " — " + str(them)))


CA = [
    (r"C_{10}^{3}", "tổ hợp chập 3 của 10"), (r"C_{10}^3", "tổ hợp chập 3 của 10"), ("C(10,3)", "tổ hợp chập 3 của 10"),
    ("C(10, 3)", "tổ hợp chập 3 của 10"), (r"\binom{10}{3}", "tổ hợp chập 3 của 10"), (r"C^3_{10}", "tổ hợp chập 3 của 10"),
    (r"A_{n}^{k}", "chỉnh hợp chập k của n"), (r"A_5^2", "chỉnh hợp chập 2 của 5"),
    (r"n(\Omega)", "số phần tử không gian mẫu"), ("n(Ω)", "số phần tử không gian mẫu"),
    ("P(A)", "xác suất của A"), (r"P(\overline{A})", "xác suất biến cố đối A ngang"), ("P(Ā)", "xác suất biến cố đối A ngang"),
    ("P(A|B)", "xác suất của A với điều kiện B"), (r"P(A \mid B)", "xác suất của A với điều kiện B"),
    ("24 ⋮ 4", "24 chia hết cho 4"), (r"24 \vdots 4", "24 chia hết cho 4"), ("15 ∤ 4", "15 không chia hết cho 4"),
    (r"15 \not\vdots 4", "15 không chia hết cho 4"), (r"15 \text{ không } \vdots 4", "15 không chia hết cho 4"), ("15 không ⋮ 4", "15 không chia hết cho 4"),
]
for vao, mong in CA:
    ra = v96.doc_toan_v96(vao)
    kiem(mong in ra and "\\" not in ra, "doc_toan_v96: %s -> %s" % (vao, mong), ra)

# đường đọc đầy đủ (giọng đọc thật nhận chuỗi này)
day = chuanbi.chuan_hoa_doc(r"Ta có n(\Omega) = C_{10}^{3} = 120, vậy P(\overline{A}) = 40/120.")
kiem("số phần tử không gian mẫu" in day and "tổ hợp chập 3 của 10" in day and "120" in day and "\\" not in day, "chuan_hoa_doc câu không gian mẫu đầy đủ", day)
kiem("biến cố đối A ngang" in day and "40 phần 120" in day, "chuan_hoa_doc biến cố đối + phân số", day)
day2 = chuanbi.chuan_hoa_doc("Tích 1 × 3 × 5 = 15 không ⋮ 4.")
kiem("không chia hết cho 4" in day2 and "không không" not in day2, "chuan_hoa_doc 'không ⋮' không lặp chữ 'không'", day2)
# giữ v95
day3 = chuanbi.chuan_hoa_doc("V(x) = x(16 - 2x)(10 - 2x), V_max = 144 cm³")
kiem("vê" in day3 and "mắc" in day3 and "xăng-ti-mét khối" in day3, "v95: V(x), V_max, cm³ vẫn đọc như cũ", day3)
kiem("tổ hợp" not in chuanbi.chuan_hoa_doc("Cạnh C(3) của hình"), "không nhầm điểm C thành tổ hợp")
kiem(chuanbi.hien_phu_de("Vậy giảm 5 nghìn đồng") == "Vậy giảm 5 nghìn đồng", "phụ đề: '5 nghìn đồng' không thành '5 1000 đồng'", chuanbi.hien_phu_de("Vậy giảm 5 nghìn đồng"))
print("\nKẾT QUẢ: %d đạt, %d hỏng" % (dat, hong))
sys.exit(1 if hong else 0)
