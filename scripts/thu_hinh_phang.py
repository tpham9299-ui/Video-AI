#!/usr/bin/env python3
"""Dựng thử cục bộ hình phẳng chuẩn v94 (không render MP4 Remotion):
    python scripts/thu_hinh_phang.py mau/hinh_phang/am_vuong_de.json [--bo-qua-manim]
-> out/v94/<tên>/: giai.json, props.json (chuanbi --gia-lap), <ID>_manim.mov (540x960 @15), moc_*.png + luoi_moc.png
5 ảnh mốc: dựng hình xong | cuối trang 1 | dòng có khung bắc cầu | dòng đồng dạng | chốt kết luận.
"""
import json
import os
import subprocess
import sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def chay(lenh, **kw):
    print(">", " ".join(lenh))
    r = subprocess.run(lenh, cwd=GOC, **kw)
    if r.returncode:
        sys.exit(r.returncode)


def main():
    kb_duong = sys.argv[1] if len(sys.argv) > 1 else "mau/hinh_phang/am_vuong_de.json"
    ten = os.path.splitext(os.path.basename(kb_duong))[0]
    ra = os.path.join("out", "v94", ten)
    os.makedirs(os.path.join(GOC, ra), exist_ok=True)
    env = dict(os.environ, PYTHONIOENCODING="utf8", MANIM_CHAT_LUONG="thap")
    env.setdefault("MANIM_TEX_DIR", os.path.join(GOC, "out", "_tex"))
    chay([sys.executable, "scripts/giai_hinh_phang.py", kb_duong, "--ra", os.path.join(ra, "giai.json")], env=env)
    props = os.path.join(ra, "props.json")
    chay([sys.executable, "scripts/chuanbi.py", kb_duong, "--gia-lap", "--props-ra", props], env=env, stdout=subprocess.DEVNULL)
    p = json.load(open(os.path.join(GOC, props), encoding="utf8"))
    mov = os.path.join(GOC, ra, "%s_manim.mov" % p["id"])
    if "--bo-qua-manim" not in sys.argv or not os.path.exists(mov):
        chay([sys.executable, "scripts/manim/HinhPhangChuan.py", props, kb_duong, ra, "--public", "public"], env=env)
    nk = json.load(open(os.path.join(GOC, ra, "%s_manim_nhat_ky.json" % p["id"]), encoding="utf8"))
    kb = json.load(open(os.path.join(GOC, kb_duong), encoding="utf8"))
    trang = kb["hinh_phang_chuan"]["trang_chung_minh"]
    dong = [x for x in nk["ve"] if x["kieu"] == "dong"]
    dung = [x for x in nk["ve"] if x["kieu"] == "dung"]
    moc = nk["moc"]

    def that(ti, di):
        for x in dong:
            if x["trang"] == ti and x["dong"] == di:
                return x["that"]
        return None

    def tim_dong(dk):
        for ti, t in enumerate(trang):
            for di, d in enumerate(t["dong"]):
                if dk(d):
                    return ti, di
        return None

    ds = []
    if dung:
        ds.append(("1_dung_hinh_xong", max(x["that"] for x in dung) + 1.4))
    t1 = that(0, len(trang[0]["dong"]) - 1)
    if t1 is not None:
        ds.append(("2_trang1_cuoi", t1 + 1.1))
    bc = tim_dong(lambda d: any(h.get("loai") == "khung_bac_cau" for h in d.get("hanh_dong_hinh") or []))
    if bc and that(*bc) is not None:
        ds.append(("3_khung_bac_cau", that(*bc) + 1.0))
    dd = tim_dong(lambda d: "\\sim" in d.get("tex", ""))
    if dd and that(*dd) is not None:
        ds.append(("4_dong_dang", that(*dd) + 1.1))
    kl = tim_dong(lambda d: any(h.get("loai") == "ket_luan" for h in d.get("hanh_dong_hinh") or []))
    if kl and that(*kl) is not None:
        ds.append(("5_ket_luan", min(moc["ket"] - 0.7, that(*kl) + 2.2)))
    anh = []
    for ten_m, t in ds:
        f = os.path.join(GOC, ra, "moc_%s.png" % ten_m)
        tam = f[:-4] + "_rgba.png"      # cắt khung RGBA trước rồi mới ghép nền (tua + overlay cùng lúc ra khung trống)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "%.2f" % t, "-i", mov, "-frames:v", "1", tam], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x121214:s=540x960", "-i", tam,
                        "-filter_complex", "[0:v][1:v]overlay=0:0", "-frames:v", "1", f], check=True)
        os.remove(tam)
        anh.append(f)
        print("Ảnh mốc %-18s t=%.2fs -> %s" % (ten_m, t, os.path.relpath(f, GOC)))
    if anh:
        vao = sum([["-i", x] for x in anh], [])
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *vao, "-filter_complex",
                        "".join("[%d:v]" % k for k in range(len(anh))) + "hstack=inputs=%d" % len(anh), os.path.join(GOC, ra, "luoi_moc.png")], check=True)
        print("Lưới ảnh mốc:", os.path.join(ra, "luoi_moc.png"))


if __name__ == "__main__":
    main()
