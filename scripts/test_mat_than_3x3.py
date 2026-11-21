#!/usr/bin/env python3
"""Test nhanh Mắt thần 3×3 (không gọi API): python scripts/test_mat_than_3x3.py
Tạo MP4 giả bằng ffmpeg testsrc, props giả 7 cảnh + màn kết, kiểm lưới 1080×1920 / 9 mốc / nhánh đạt - không đạt."""
import json
import os
import shutil
import subprocess
import sys
import tempfile

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(GOC, "scripts"))
import mat_than_3x3 as mt  # noqa: E402

DAT = 0
LOI = []


def kiem(dk, ten):
    global DAT
    if dk:
        DAT += 1
        print("  ✓", ten)
    else:
        LOI.append(ten)
        print("  ✗", ten)


def props_gia(so_canh=7, outro=True):
    loai = ["mo_dau", "de_bai"] + ["tinh_toan"] * (so_canh - 3) + ["dap_an"]
    canh, bd = [], 0
    for i, l in enumerate(loai[:so_canh]):
        canh.append({"so": i + 1, "loai": l, "batDau": bd, "soFrame": 60})
        bd += 60
    p = {"id": "THU-MT", "fps": 30, "dapAn": "15588", "intro": {"lech": 30}, "anhBiaDau": None, "canh": canh}
    if outro:
        p["outro"] = {"batDau": bd, "soFrame": 60}
    return p


def main():
    print("Mốc 9 ô:")
    p = props_gia()
    moc, o_da = mt.chon_moc(p, 1e9)
    kiem(len(moc) == 9 and o_da == 8, "đủ 9 mốc, ô 8 là đáp án")
    kiem([n for _, n in moc][7] == "đáp án" and moc[8][1] == "màn kết", "ô 8 đáp án, ô 9 màn kết")
    kiem(all(moc[k][0] <= moc[k + 1][0] + 1e-6 for k in range(8)), "mốc tăng dần theo thời gian")
    kiem(abs(moc[0][0] - (1 + 36 / 30)) < 0.01, "mốc tính cả intro.lech")
    m4, _ = mt.chon_moc(props_gia(4, outro=False), 1e9)
    kiem(len(m4) == 9 and m4[8][1] == "cuối", "video ít cảnh vẫn đủ 9 ô")

    print("Lọc lỗi AI:")
    ds = mt.chuan_loi([{"o": 8, "loai": "lo_dap_an"}, {"o": 3, "loai": "lo_dap_an"}, {"o": 2, "loai": "abc"},
                       {"o": 5, "loai": "latex_tho", "nang": False}], 8)
    kiem([x["o"] for x in ds] == [3, 5], "bỏ lộ đáp án ở ô đáp án + loại lạ")
    kiem(ds[1]["nang"] is False, "giữ cờ nhẹ")

    if not shutil.which("ffmpeg"):
        print("Bỏ qua phần MP4 (máy không có ffmpeg)")
    else:
        print("Lưới từ MP4 giả:")
        tam = tempfile.mkdtemp()
        mp4 = os.path.join(tam, "THU-MT.mp4")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=1080x1920:rate=30:duration=16",
                        "-pix_fmt", "yuv420p", mp4], check=True)
        pt = os.path.join(tam, "props.json")
        json.dump(p, open(pt, "w", encoding="utf8"))
        for che_do, dat in (("dat", True), ("loi", False)):
            env = dict(os.environ, MAT_THAN_GIA_LAP=che_do, PYTHONIOENCODING="utf8")
            subprocess.run([sys.executable, os.path.join(GOC, "scripts", "mat_than_3x3.py"), pt, mp4, tam], check=True, env=env,
                           capture_output=True)
            kq = json.load(open(os.path.join(tam, "mat_than.json"), encoding="utf8"))
            kiem(kq["dat"] is dat and kq["chay"], "giả lập '%s' -> dat=%s" % (che_do, dat))
            if not dat:
                kiem("Mắt thần 3×3" in kq["ly_do"] and "Lộ đáp án" in kq["ly_do"], "lý do có tên lỗi + số ô")
        from PIL import Image
        im = Image.open(os.path.join(tam, "THU-MT_3x3.jpg"))
        kiem(im.size == (1080, 1920), "ảnh lưới 1080×1920")
        env = {k: v for k, v in os.environ.items() if k not in ("GEMINI_KEYS", "GEMINI_API_KEY", "MAT_THAN_GIA_LAP")}
        subprocess.run([sys.executable, os.path.join(GOC, "scripts", "mat_than_3x3.py"), pt, mp4, tam], check=True,
                       env=dict(env, PYTHONIOENCODING="utf8"), capture_output=True)
        kq = json.load(open(os.path.join(tam, "mat_than.json"), encoding="utf8"))
        kiem(kq["chay"] is False and kq["dat"] is True, "thiếu key -> không chặn, ghi cảnh báo")
        shutil.copy(os.path.join(tam, "THU-MT_3x3.jpg"), os.path.join(GOC, "out", "thu_mat_than_3x3.jpg")) if os.path.isdir(os.path.join(GOC, "out")) else None
        shutil.rmtree(tam, ignore_errors=True)
    print("\n%d đạt, %d lỗi" % (DAT, len(LOI)))
    sys.exit(1 if LOI else 0)


if __name__ == "__main__":
    main()
