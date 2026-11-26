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

    from PIL import Image, ImageDraw
    text = Image.new("RGB", (360, 640))
    ve = ImageDraw.Draw(text)
    ve.rectangle((60, 170, 300, 230), outline="white", width=2)
    ve.text((100, 190), "x + y = 20", fill="white")
    tt = {**p, "mon": "THUC_TE", "boCuc": "4tang", "khung4tang": {"sanKhau": {"loai": "kinh_te_do_thi"}}}
    kiem(any(x["loai"] == "t2_trong" and x["nang"] for x in mt.kiem_tat_dinh(tt, [text]*9, 8)),
         "MP4 chỉ có hộp chữ sáng vẫn bị chặn dù props ghi có đồ thị")
    ve.line([(74, 295), (160, 188), (280, 308)], fill="yellow", width=4)
    kiem(mt.co_net_hinh(text), "nhận nét đồ thị trong ảnh T2")
    print("Lọc lỗi AI:")
    ds = mt.chuan_loi([{"o": 8, "loai": "lo_dap_an"}, {"o": 3, "loai": "lo_dap_an"}, {"o": 2, "loai": "abc"},
                       {"o": 5, "loai": "latex_tho", "nang": False}], 8)
    kiem([x["o"] for x in ds] == [3, 5], "bỏ lộ đáp án ở ô đáp án + loại lạ")
    kiem(ds[1]["nang"] is False, "giữ cờ nhẹ")

    print("v92 kiểm tất định (khung 4 tầng):")
    from PIL import Image, ImageDraw
    p4 = dict(props_gia(), boCuc="4tang", thuongHieu={"ten": "Tư duy Toán", "chuyenMuc": "toan", "logo": None})

    def o_anh(sang, lech=0):
        im = Image.new("RGB", (mt.O_RONG, mt.O_CAO), (14, 16, 20))
        if sang:
            d = ImageDraw.Draw(im)
            d.line([(60 + lech, 150), (300, 300 - lech)], fill=(56, 189, 248), width=4)
            d.rectangle([100 + lech, 180, 220 + lech, 280], outline=(250, 204, 21), width=3)
        return im
    trong = [o_anh(True)] + [o_anh(False)] * 7 + [o_anh(True)]
    kq = mt.kiem_tat_dinh(p4, trong, 8)
    kiem(any(x["loai"] == "t2_trong" and x["nang"] for x in kq), "tầng 2 đen ở các ô giải -> t2_trong (nặng)")
    im_lang = [o_anh(True)] * 9
    kiem(any(x["loai"] == "hinh_dung_im" for x in mt.kiem_tat_dinh(p4, im_lang, 8)), "hình 3D giống hệt mọi ô -> hinh_dung_im")
    dong = [o_anh(True, 12 * k) for k in range(9)]
    kiem(mt.kiem_tat_dinh(p4, dong, 8) == [], "hình đổi theo từng bước -> đạt")
    sai = dict(p4, thuongHieu={"ten": "Tư duy Xác suất", "chuyenMuc": "toan", "logo": "thuong_hieu/logo.png"})
    kiem(len([x for x in mt.kiem_tat_dinh(sai, dong, 8) if x["loai"] == "logo_sai"]) == 2, "bài Toán mang tên/logo Xác suất -> logo_sai")
    kiem(mt.kiem_tat_dinh(props_gia(), trong, 8) == [], "bố cục cũ (không 4 tầng) không áp kiểm tầng 2")
    kiem(all(k in mt.prompt_ai(p4, 8) for k in ("ma_tho", "logo_sai", "so_cat", "t2_trong", "hinh_dung_im", "Toán (không phải Xác suất)")), "prompt AI có 5 loại lỗi mới + chuyên mục")

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
