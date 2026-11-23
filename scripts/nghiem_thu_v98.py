#!/usr/bin/env python3
"""v98 — chụp lưới ảnh nghiệm thu có VẠCH KIỂM CĂN GIỮA (không render MP4).

  python scripts/nghiem_thu_v98.py out/v98/<mau>/props.json [...]
Mỗi props: chọn khung Intro + 1 khung giữa mỗi bước (sau khi thẻ hiện) + Outro -> node scripts/chupKhung.mjs ->
luoi.png (3 cột) vẽ chồng: trục giữa x = 540 (vàng nét đứt), lề đối xứng 12 % x = 130 / 950 (xanh), đáy 18 % y = 1574 (hồng),
nhãn giây mỗi ô. Kèm bao_cao.json: lệch tâm đo được của nội dung từng khung (cột sáng trái nhất / phải nhất trong T1–T3).
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

GOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def chon_khung(p):
    k = p.get("khung4tang") or {}
    fps = k.get("fps") or p.get("fps") or 30
    tong = k.get("tongFrame") or p.get("tongFrame")
    ds = [int(1.5 * fps)]
    buoc = sorted(k.get("buoc") or [], key=lambda b: b["t"])
    for j, b in enumerate(buoc):
        t1 = buoc[j + 1]["t"] if j + 1 < len(buoc) else tong / fps
        if t1 - b["t"] < 1.2:
            continue
        ds.append(int(min(b["t"] + 0.72 * (t1 - b["t"]), t1 - 0.3) * fps))
    outro = p.get("outro") or {}
    if outro.get("batDau"):
        ds.append(int(outro["batDau"] + min(outro.get("soFrame", 60) - 5, 2.2 * fps)))
    tf = int(p.get("tongFrame") or tong)
    ds = sorted({max(0, min(tf - 1, x)) for x in ds})
    return ds[:12], fps


def do_lech(im):
    """Lệch tâm nội dung (px khung 1080, + là lệch phải) trong dải y 212..1574: cột trái / phải nhất có điểm ảnh sáng khác nền."""
    k = im.width / 1080.0
    g = im.convert("L").crop((0, int(212 * k), im.width, int(1574 * k))).resize((1080, int(1362)))
    w, h = g.size
    px = g.load()
    cot = []
    for x in range(0, w, 2):
        sang = sum(1 for y in range(0, h, 6) if px[x, y] > 70)
        cot.append(sang)
    nguong = 3
    ds = [i * 2 for i, c in enumerate(cot) if c >= nguong]
    if not ds:
        return None
    return round((ds[0] + ds[-1]) / 2 - 540, 1)


def luoi(thu_muc, khung, fps):
    anh = [Image.open(os.path.join(thu_muc, "k%05d.png" % f)).convert("RGB") for f in khung]
    W, H = anh[0].size
    bao = []
    for f, a in zip(khung, anh):
        bao.append({"khung": f, "giay": round(f / fps, 2), "lech_tam_px": do_lech(a)})
        d = ImageDraw.Draw(a, "RGBA")
        k = W / 1080.0   # chupKhung xuất 540x960 (một nửa khung 1080x1920)
        for y in range(0, H, 14):
            d.line([(540 * k, y), (540 * k, y + 7)], fill=(250, 204, 21, 160), width=1)
        for x in (130, 950):
            d.line([(x * k, 0), (x * k, H)], fill=(56, 189, 248, 120), width=1)
        d.line([(0, 1574 * k), (W, 1574 * k)], fill=(251, 113, 133, 110), width=1)
        d.line([(0, 212 * k), (W, 212 * k)], fill=(251, 113, 133, 110), width=1)
        try:
            ft = ImageFont.truetype("arial.ttf", 22)
        except OSError:
            ft = ImageFont.load_default()
        d.rectangle([(0, 0), (92, 30)], fill=(0, 0, 0, 170))
        d.text((8, 4), "%.1f s" % (f / fps), fill=(255, 255, 255, 255), font=ft)
    cot = 3
    hang = (len(anh) + cot - 1) // cot
    o = Image.new("RGB", (W * cot, H * hang), (14, 16, 20))
    for i, a in enumerate(anh):
        o.paste(a, ((i % cot) * W, (i // cot) * H))
    o.save(os.path.join(thu_muc, "luoi.png"))
    json.dump(bao, open(os.path.join(thu_muc, "bao_cao.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return bao


def main():
    for tep in sys.argv[1:]:
        p = json.load(open(tep, encoding="utf-8"))
        thu_muc = os.path.dirname(tep)
        for f in os.listdir(thu_muc):
            if f.startswith("k") and f.endswith(".png"):
                os.remove(os.path.join(thu_muc, f))
        khung, fps = chon_khung(p)
        subprocess.run(["node", os.path.join(GOC, "scripts", "chupKhung.mjs"), tep, thu_muc, ",".join(map(str, khung))], check=True,
                       stdout=subprocess.DEVNULL)
        bao = luoi(thu_muc, khung, fps)
        lech = [b["lech_tam_px"] for b in bao if b["lech_tam_px"] is not None]
        print("%s: %d khung -> %s/luoi.png | lệch tâm nội dung: %s px" % (tep, len(khung), thu_muc, ", ".join("%+.0f" % x for x in lech)))


if __name__ == "__main__":
    main()
