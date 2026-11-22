#!/usr/bin/env python3
"""v97: ghép dải ảnh đổi nét giữa cú xoay (k_000 / k_035 / k_070 / k_100.png) thành 1 ảnh ngang + chú thích cạnh đổi nét.
python scripts/ghep_xoay_v97.py out/v97/xoay_frame"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

thu = sys.argv[1] if len(sys.argv) > 1 else "out/v97/xoay_frame"
tt = json.load(open(os.path.join(thu, "trang_thai.json"), encoding="utf8"))
ten = ["k_000.png", "k_035.png", "k_070.png", "k_100.png"]
anh = [Image.open(os.path.join(thu, t)).convert("RGB") for t in ten]
# vùng tầng 2 tối giản (sân khấu hình) trong khung 1080x1920: y 307..1190, x 0..950
cat = [a.crop((0, 300, 960, 1196)) for a in anh]
w, h = cat[0].size
s = 0.5
cat = [c.resize((int(w * s), int(h * s))) for c in cat]
w, h = cat[0].size
doi = [(k, v) for k, v in tt["canh"].items() if len(v) == 4 and all(v) and v[0] != v[3]]
cao_chu = 46 + 26 * min(6, len(doi))
nen = Image.new("RGB", (w * 4 + 50, h + 70 + cao_chu), (14, 16, 20))
ve = ImageDraw.Draw(nen)
try:
    ft = ImageFont.truetype("arial.ttf", 26)
    fn = ImageFont.truetype("arial.ttf", 19)
except OSError:
    ft = fn = ImageFont.load_default()
for i, c in enumerate(cat):
    x = 10 + i * (w + 10)
    nen.paste(c, (x, 52))
    ve.text((x + 8, 14), "%d%%  (khung %d)" % (round(tt["moc"][i] * 100), tt["khung"][i]), fill=(250, 204, 21), font=ft)
y = h + 64
ve.text((12, y), "Cú xoay %s %s: %.2f-%.2f s  |  L = liền, D = đứt (20 mẫu dọc cạnh, từ đầu tới cuối)" % (
    tt["cu_xoay"], "".join(tt["doi"]), tt["t0"], tt["t1"]), fill=(230, 237, 245), font=fn)
for j, (k, v) in enumerate(doi[:6]):
    ve.text((12, y + 28 + 26 * j), "%-14s %s" % (k, "  ->  ".join(v)), fill=(140, 200, 255), font=fn)
nen.save(os.path.join(thu, "dai_xoay.png"))
print("dai_xoay:", os.path.join(thu, "dai_xoay.png"), "| cạnh đổi nét:", len(doi))
