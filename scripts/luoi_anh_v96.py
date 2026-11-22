#!/usr/bin/env python3
"""Ghép các khung k*.png trong một thư mục thành luoi.png (3 cột). python scripts/luoi_anh_v96.py out/v96/<mau>"""
import glob
import os
import sys

from PIL import Image

for thu_muc in sys.argv[1:]:
    ds = sorted(glob.glob(os.path.join(thu_muc, "k*.png")))
    if not ds:
        continue
    im = [Image.open(f).convert("RGB") for f in ds]
    w, h = im[0].size
    cot = 3
    hang = (len(im) + cot - 1) // cot
    o = Image.new("RGB", (w * cot, h * hang), (14, 16, 20))
    for i, x in enumerate(im):
        o.paste(x, ((i % cot) * w, (i // cot) * h))
    o.resize((o.width * 2 // 3, o.height * 2 // 3)).save(os.path.join(thu_muc, "luoi.png"))
    print("luoi:", thu_muc, len(im), "khung")
