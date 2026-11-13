#!/usr/bin/env python3
"""Sau khi dựng: tạo 2 ảnh từ video bằng ffmpeg.
  <id>_kt.jpg  : ẢNH KIỂM TRA - 4 khung hình ghép ngang (giữa cảnh 1, 2, 3 và cảnh đáp án) để Gemini so với đề bài
  (ảnh bìa <id>_bia.jpg do Remotion dựng riêng: composition AnhBia, xem workflow)
Cách dùng: python3 scripts/anh_kiem_tra.py public/props.json out/ID.mp4 out/
"""
import json
import os
import re
import subprocess
import sys


def main():
    props_tep, video, ra = sys.argv[1], sys.argv[2], sys.argv[3]
    p = json.load(open(props_tep, encoding="utf8"))
    fps = p.get("fps", 30)
    canh = p.get("canh") or []
    id_ = p.get("id") or os.path.splitext(os.path.basename(video))[0]
    chon = []
    for i in range(min(3, len(canh))):
        chon.append(canh[i])
    da = [c for c in canh if re.search(r"dap_an|ket_qua", str(c.get("loai") or ""))]
    if da and da[-1] not in chon:
        chon.append(da[-1])
    elif len(canh) > 3:
        chon.append(canh[-2])
    try:
        dai = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], capture_output=True, text=True).stdout.strip())
    except ValueError:
        dai = 1e9
    moc = [min((c["batDau"] + c["soFrame"] * 0.62) / fps, max(0.0, dai - 0.3)) for c in chon]
    tam = []
    for k, t in enumerate(moc):
        f = os.path.join(ra, "_kt%d.jpg" % k)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "%.2f" % t, "-i", video, "-frames:v", "1", "-vf", "scale=432:768", f])
        if os.path.exists(f):
            tam.append(f)
    if not tam:
        sys.exit("Không lấy được khung hình nào")
    kt = os.path.join(ra, "%s_kt.jpg" % id_)
    try:
        # ghép ngang bằng Pillow: máy ghép video chỉ có ffmpeg rút gọn của Remotion (không có bộ lọc hstack)
        from PIL import Image
        ds = [Image.open(f).convert("RGB") for f in tam]
        tong = Image.new("RGB", (sum(a.width for a in ds), max(a.height for a in ds)))
        x = 0
        for a in ds:
            tong.paste(a, (x, 0))
            x += a.width
        tong.save(kt, quality=82)
    except ImportError:
        lenh = ["ffmpeg", "-y", "-loglevel", "error"]
        for f in tam:
            lenh += ["-i", f]
        lenh += (["-filter_complex", "hstack=inputs=%d" % len(tam)] if len(tam) > 1 else []) + ["-q:v", "4", kt]
        subprocess.run(lenh, check=True)
    for f in tam:
        os.remove(f)
    print("Đã tạo", kt, "| cảnh:", [c.get("so") for c in chon])


if __name__ == "__main__":
    main()
