#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phiên 2/3 — hồi quy Giọng đọc ↔ Phụ đề ↔ Mốc hình (0 API).

  1. Phụ đề không còn dấu phẩy treo trước "=" ("1 − 2025/3600, = 7/16" -> "1 − 2025/3600 = 7/16").
  2. TTS đọc cặp biến "x, y" / "x và y" đồng bộ "ích, i" (không để chữ Latin "y" rời).
  3. nhip_chong_dung: mọi khoảng T2 không đổi hình <= 4 s (trước đây chỉ vá khoảng > 6 s).
  4. Bảng đối chiếu 4 mẫu đại diện (kien_bo_hop, gap_nhau_xs, am_vuong_de, giao_diem_mnp) qua chuanbi.py --gia-lap:
     0 lỗi TTS_KY_HIEU / TTS_LAP / PD_TEX / PD_DAU_CAU / T2_DUNG / LO_DAP_AN; mỗi mẫu có cảnh đáp án và thời lượng hợp lệ.
"""
import json
import os
import subprocess
import sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(GOC, "scripts"))
os.chdir(GOC)
import chuanbi  # noqa: E402
import bang_doi_chieu_tts as bang  # noqa: E402
from khung4tang import moc_thoi_gian as mtg  # noqa: E402

dat = hong = 0


def kiem(dk, ten):
    global dat, hong
    if dk:
        dat += 1
        print("  ✓", ten)
    else:
        hong += 1
        print("  ✗", ten)


print("— Phụ đề & TTS")
pd = chuanbi.hien_phu_de("Vậy xác suất gặp nhau bằng 1 trừ 2025 phần 3600, bằng 7 phần 16.").replace(" ", " ")
kiem(pd == "Vậy xác suất gặp nhau bằng 1 − 2025/3600 = 7/16.", "phụ đề bỏ dấu phẩy treo trước '=' (%s)" % pd)
kiem("," in chuanbi.hien_phu_de("Ta có x, bằng nhau thì sao"), "câu văn 'x, bằng nhau' (không có toán hạng phải) giữ nguyên dấu phẩy")
doc = chuanbi.chuan_hoa_doc("Gọi x, y là số phút. Với x và y dương.")
kiem("ích, i là" in doc and "ích và i dương" in doc, "TTS đọc cặp biến 'ích, i' / 'ích và i' (%s)" % doc)
kiem("y tá" in chuanbi.chuan_hoa_doc("Cô y tá đo nhiệt"), "từ tiếng Việt 'y tá' không bị đổi")
kiem(" = " not in chuanbi.chuan_hoa_doc("V = 144") and "bằng" in chuanbi.chuan_hoa_doc("V = 144"), "TTS không còn ký hiệu '='")

print("— Nhịp chống đứng hình T2 <= 4 s")
out = {"buoc": [{"t": 0.0}, {"t": 5.3}, {"t": 10.8}, {"t": 20.0}]}
nhip = mtg.nhip_chong_dung(out, [1.5, 3.0, 6.5, 8.6, 12.0, 14.5, 17.0], 22.0)
moc = sorted(set(mtg.moc_doi_hinh(out) + nhip + [22.0]))
ho = max(b - a for a, b in zip(moc, moc[1:]))
kiem(ho <= 4.0001, "khoảng 4–6 s cũng được chèn nhịp (dài nhất %.2f s)" % ho)
kiem(mtg.nhip_chong_dung({"buoc": [{"t": 0.0}, {"t": 3.0}, {"t": 6.5}]}, [1, 4], 9.5) == [], "khoảng <= 4 s không chèn nhịp thừa")

print("— Bảng đối chiếu 4 mẫu (chuanbi.py --gia-lap)")
MAU = ["mau/v99_2/kien_bo_hop.json", "mau/v99_2/gap_nhau_xs.json", "mau/hinh_phang/am_vuong_de.json", "mau/v97/giao_diem_mnp.json"]
env = dict(os.environ, PYTHONIOENCODING="utf-8")
cap = []
for m in MAU:
    n = os.path.splitext(os.path.basename(m))[0]
    thu = os.path.join("out", "phien2_tts", n)
    props = os.path.join(thu, "props.json")
    kq = subprocess.run([sys.executable, "-X", "utf8", "scripts/chuanbi.py", m, "--gia-lap", "--public", os.path.join(thu, "pub"),
                         "--out-dir", thu, "--props-ra", props], env=env, capture_output=True, text=True, encoding="utf-8")
    kiem(kq.returncode == 0 and os.path.exists(props), "%s: chuanbi.py --gia-lap chạy xong" % n)
    if kq.returncode != 0:
        print((kq.stdout or "")[-800:], (kq.stderr or "")[-800:])
        continue
    dong, loi, tom = bang.bang(m, props)
    kiem(not loi, "%s: 0 lỗi đọc/phụ đề/T2/lộ đáp án (%s)%s" % (n, tom, "" if not loi else "\n      " + "\n      ".join(loi)))
    p = json.load(open(props, encoding="utf-8"))
    kiem(any(c.get("loai") == "dap_an" for c in p.get("canh") or []), "%s: có cảnh đáp án" % n)
    cap += [m, props]
if len(cap) == 2 * len(MAU):
    bang.sys.argv = ["bang"] + cap + ["--md", "out/phien2_tts/bang_doi_chieu.md"]
    import contextlib
    import io
    with contextlib.redirect_stdout(io.StringIO()):
        ma = bang.main()
    kiem(ma == 0 and os.path.exists("out/phien2_tts/bang_doi_chieu.md"), "xuất out/phien2_tts/bang_doi_chieu.md")

print("\nTEST PHIÊN 2 TTS: %d đạt, %d hỏng" % (dat, hong))
sys.exit(1 if hong else 0)
