#!/usr/bin/env python3
"""v98 — test bộ tổng hợp nhạc nền 3 phong cách (không gọi mạng). python scripts/test_nhac_v98.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhac_nen_v98 as N  # noqa: E402

dat = hong = 0


def thu(ten, dk, them=""):
    global dat, hong
    if dk:
        dat += 1
    else:
        hong += 1
    print(("ĐẠT  " if dk else "HỎNG ") + ten + ("" if dk or not them else " — " + str(them)))


am = {}
for ps, cfg in N.PRESET.items():
    x = N.tao(ps)
    am[ps] = x
    bpm = cfg["bpm"]
    thu(f"{ps}: {bpm} BPM nằm trong 116–124", 116 <= bpm <= 124)
    dai = 16 * 4 * 60 / bpm
    thu(f"{ps}: đúng 16 ô nhịp ({dai:.2f} s)", abs(len(x) / N.SR - dai) < 0.01, len(x) / N.SR)
    thu(f"{ps}: không NaN / không vỡ tiếng (đỉnh <= 0,9)", np.isfinite(x).all() and np.max(np.abs(x)) <= 0.9001)
    d = np.abs(np.diff(x))
    noi = abs(x[0] - (2 * x[-1] - x[-2]))
    thu(f"{ps}: điểm nối vòng lặp liền mạch (bước nối <= p99,5 bước thường)", noi <= np.percentile(d, 99.5), f"{noi:.4f}")
    # năng lượng đều theo từng giây (không có đoạn lặng / hụt hơi trong vòng)
    r = [np.sqrt(np.mean(x[i:i + N.SR] ** 2)) for i in range(0, len(x) - N.SR, N.SR)]
    db = 20 * np.log10(np.array(r) + 1e-9)
    thu(f"{ps}: độ to từng giây đều (dao động <= 4 dB)", db.max() - db.min() <= 4, f"{db.min():.1f}..{db.max():.1f}")
    # nhịp trống thật: khởi âm (tăng log năng lượng, khung 5 ms) tự tương quan có đỉnh ở chu kỳ phách / ô nhịp,
    # cao hơn hẳn ở độ trễ lệch nhịp (0,37 phách)
    H = 160
    y = x[: N.SR * 16]
    fr = np.sqrt(np.mean(y[: len(y) // H * H].reshape(-1, H) ** 2, 1))
    on = np.maximum(0, np.diff(np.log(fr + 1e-4)))
    on -= on.mean()
    ac = np.correlate(on, on, "full")[len(on) - 1:] / (on @ on)
    ph = 60 / bpm * N.SR / H
    lay = lambda l: float(ac[int(round(l)) - 1:int(round(l)) + 2].max())  # noqa: E731
    dinh, lech = max(lay(ph), lay(4 * ph)), abs(lay(0.37 * ph)) + 0.01
    thu(f"{ps}: nhịp phách rõ (tự tương quan {dinh:.2f} > 0,15 và > 5× lệch nhịp)", dinh > 0.15 and dinh > 5 * lech)
    # tất định
    thu(f"{ps}: tất định (sinh lại giống hệt)", np.array_equal(x, N.tao(ps)))

ks = list(am)
for i in range(3):
    for j in range(i + 1, 3):
        n = min(len(am[ks[i]]), len(am[ks[j]]))
        c = abs(np.corrcoef(am[ks[i]][:n], am[ks[j]][:n])[0, 1])
        thu(f"{ks[i]} ≠ {ks[j]} (tương quan {c:.2f} < 0,3)", c < 0.3)

os.environ.pop("NHAC_PRESET", None)
thu("chọn: hình không gian -> cyber_study", N.chon_preset({"khongGian": {"phienBan": 1}}) == "cyber_study")
thu("chọn: rút mẫu -> chillhop_upbeat", N.chon_preset({"sanKhau": {"loai": "rut_mau"}}) == "chillhop_upbeat")
thu("chọn: tư duy đại số -> chillhop_upbeat", N.chon_preset({"sanKhau": {"loai": "tu_duy_dai_so"}}) == "chillhop_upbeat")
thu("chọn: kinh tế đồ thị -> marimba_tech", N.chon_preset({"sanKhau": {"loai": "kinh_te_do_thi"}}) == "marimba_tech")
thu("chọn: khuôn 3D gập hộp -> marimba_tech", N.chon_preset({"canh3dv": {"khuon": "tam_bia_gap_hop"}}) == "marimba_tech")
thu("chọn: Oxyz hai mặt cầu -> cyber_study", N.chon_preset({"canh3dv": {"khuon": "hai_mat_cau_oxyz"}}) == "cyber_study")
os.environ["NHAC_PRESET"] = "marimba_tech"
thu("chọn: env NHAC_PRESET thắng", N.chon_preset({"khongGian": {}}) == "marimba_tech")
os.environ.pop("NHAC_PRESET", None)

src = open(os.path.join(os.path.dirname(__file__), "chuanbi.py"), encoding="utf-8").read()
thu("chuanbi: dưới giọng mặc định -19 dB", 'NHAC_DUOI_GIONG_DB") or -19' in src)
thu("chuanbi: gọi nhac_nen_v98.chon_preset sau khi có khung 4 tầng", "nhac_nen_v98.chon_preset(k4, kb)" in src)

print(f"\nKẾT QUẢ: {dat} đạt, {hong} hỏng")
sys.exit(1 if hong else 0)
