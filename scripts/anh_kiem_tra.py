#!/usr/bin/env python3
"""Sau khi dựng: tạo 2 ảnh từ video bằng ffmpeg.
  <id>_kt.jpg  : ẢNH KIỂM TRA - lưới khung hình, MỖI CẢNH MỘT KHUNG, để Gemini kiểm duyệt
  (ảnh bìa <id>_bia.jpg do Remotion dựng riêng: composition AnhBia, xem workflow)
Cách dùng: python3 scripts/anh_kiem_tra.py public/props.json out/ID.mp4 out/
"""
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor


def main():
    props_tep, video, ra = sys.argv[1], sys.argv[2], sys.argv[3]
    with open(props_tep, encoding="utf8") as fp:
        p = json.load(fp)
    fps = p.get("fps", 30)
    canh = p.get("canh") or []
    id_ = p.get("id") or os.path.splitext(os.path.basename(video))[0]
    # MỖI CẢNH MỘT KHUNG (lúc hình + công thức đã hiện đủ, 85% cảnh) để AI kiểm duyệt KHÔNG BỎ SÓT cảnh nào
    # (trước đây chỉ 7 khung/7 phần: lỗi ở các cảnh khác như vật bị vẽ lặp có thể lọt qua). Tối đa 24 cảnh.
    chon = [(c, 0.85) for c in canh]
    if len(chon) > 24:
        buoc = len(chon) / 24.0
        chon = [chon[int(k * buoc)] for k in range(24)]
    try:
        dai = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], capture_output=True, text=True).stdout.strip())
    except ValueError:
        dai = 1e9
    moc = [min((c["batDau"] + c["soFrame"] * ti) / fps + (1 / fps if p.get("anhBiaDau") else 0), max(0.0, dai - 0.3)) for c, ti in chon]

    def chup_mot_khung(item):
        k, t = item
        f = os.path.join(ra, "_kt%d.jpg" % k)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "%.2f" % t, "-i", video, "-frames:v", "1", "-vf", "scale=324:576", f])
        return f if os.path.exists(f) else None

    with ThreadPoolExecutor(max_workers=min(4, max(1, len(moc)))) as ex:
        tam = [f for f in ex.map(chup_mot_khung, enumerate(moc)) if f]
    if not tam:
        sys.exit("Không lấy được khung hình nào")
    kt = os.path.join(ra, "%s_kt.jpg" % id_)
    try:
        # ghép ngang bằng Pillow: máy ghép video chỉ có ffmpeg rút gọn của Remotion (không có bộ lọc hstack)
        from PIL import Image
        ds = [Image.open(f).convert("RGB") for f in tam]
        cot = min(6, len(ds))
        hang = (len(ds) + cot - 1) // cot
        w, h = ds[0].width, ds[0].height
        tong = Image.new("RGB", (w * cot, h * hang), (8, 12, 14))
        for k, a in enumerate(ds):
            tong.paste(a, ((k % cot) * w, (k // cot) * h))
        tong.save(kt, quality=82)
    except ImportError:
        lenh = ["ffmpeg", "-y", "-loglevel", "error"]
        for f in tam:
            lenh += ["-i", f]
        if len(tam) > 1:
            cot = min(6, len(tam))
            hang = (len(tam) + cot - 1) // cot
            if hang > 1:
                vi_tri = "|".join("%d_%d" % ((k % cot) * 324, (k // cot) * 576) for k in range(len(tam)))
                lenh += ["-filter_complex", "xstack=inputs=%d:layout=%s:fill=0x080c0e" % (len(tam), vi_tri)]
            else:
                lenh += ["-filter_complex", "hstack=inputs=%d" % len(tam)]
        lenh += ["-q:v", "4", kt]
        subprocess.run(lenh, check=True)
    for f in tam:
        os.remove(f)
    print("Đã tạo", kt, "| cảnh:", [c.get("so") for c, _ in chon])


if __name__ == "__main__":
    main()
