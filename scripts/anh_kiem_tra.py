#!/usr/bin/env python3
"""Sau khi dựng: tạo 2 ảnh từ video bằng ffmpeg.
  <id>_kt.jpg  : ẢNH KIỂM TRA - lưới khung hình, mỗi phần của quy trình một khung, để Gemini kiểm duyệt
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
    # MỘT khung cho mỗi phần của quy trình (đề bài, mô phỏng, lỗi sai, giải, đáp án, thử lại, chốt) để AI kiểm duyệt đủ cả video
    mau = [(r"de_bai", 0.92), (r"mo_hinh|mo_phong|y_do|thu_nho", 0.7), (r"bay", 0.7), (r"tinh", 0.85), (r"dap_an|ket_qua", 0.8), (r"kiem_tra|thu_lai", 0.8), (r"bai_hoc|chot", 0.8)]
    chon = []
    for re_, ti in mau:
        ds = [c for c in canh if re.search(re_, str(c.get("loai") or ""))]
        c = ds[-1] if re_ == r"tinh" and ds else (ds[0] if ds else None)
        if c is not None and all(c is not x for x, _ in chon):
            chon.append((c, ti))
    if len(chon) < 3:
        chon = [(c, 0.62) for c in canh[:4]]
    try:
        dai = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], capture_output=True, text=True).stdout.strip())
    except ValueError:
        dai = 1e9
    moc = [min((c["batDau"] + c["soFrame"] * ti) / fps + (1 / fps if p.get("anhBiaDau") else 0), max(0.0, dai - 0.3)) for c, ti in chon]
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
        cot = min(4, len(ds))
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
        lenh += (["-filter_complex", "hstack=inputs=%d" % len(tam)] if len(tam) > 1 else []) + ["-q:v", "4", kt]
        subprocess.run(lenh, check=True)
    for f in tam:
        os.remove(f)
    print("Đã tạo", kt, "| cảnh:", [c.get("so") for c, _ in chon])


if __name__ == "__main__":
    main()
