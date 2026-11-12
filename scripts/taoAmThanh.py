#!/usr/bin/env python3
"""Sinh toàn bộ âm thanh cho video bằng thuật toán (KHÔNG lấy từ bài hát nào nên không bao giờ dính bản quyền
trên TikTok / YouTube Shorts):
  - public/nhac/nen.wav : nhạc nền sôi động 120 BPM (kick, clap, hi-hat, bass, arpeggio, pad có "pumping"), 32 giây lặp liền mạch
  - public/sfx/*.wav    : bộ hiệu ứng: whoosh, swoosh, pop, click, ting, ding, sai, sting, boom, riser, zoom, tang,
                          lac (xúc xắc), xu (đồng xu), quay (vòng quay), tich (đồng hồ), mo (mở quà), cua (mở cửa), lat (lật bài)
Chạy: pip install numpy scipy && python3 scripts/taoAmThanh.py
Muốn dùng nhạc khác: bỏ tệp mp3 vào thư mục Drive VIDEO_XACSUAT/nhac (xem README, mục "Âm thanh").
"""
import os
import wave

import numpy as np
from scipy import signal

SR = 32000
rng = np.random.default_rng(7)


def luu(ten, x, sr=SR):
    x = np.asarray(x, dtype=np.float64)
    x = x / max(1e-9, np.max(np.abs(x))) * 0.92
    os.makedirs(os.path.dirname(ten), exist_ok=True)
    with wave.open(ten, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def moc(giay):
    return np.arange(int(SR * giay)) / SR


def loc(x, lo=None, hi=None, bac=2):
    if lo and hi:
        b, a = signal.butter(bac, [lo / (SR / 2), hi / (SR / 2)], "band")
    elif lo:
        b, a = signal.butter(bac, lo / (SR / 2), "high")
    else:
        b, a = signal.butter(bac, hi / (SR / 2), "low")
    return signal.lfilter(b, a, x)


def nhieu(n):
    return rng.standard_normal(n)


def quet(f0, f1, giay, cong=1.0):
    t = moc(giay)
    f = f0 + (f1 - f0) * (t / giay) ** cong
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ---------------- HIỆU ỨNG ----------------
def whoosh(giay=0.55):
    t = moc(giay)
    x = loc(nhieu(len(t)), 400, 5000)
    env = np.sin(np.pi * np.clip(t / giay, 0, 1)) ** 2
    return x / np.max(np.abs(x)) * env + 0.2 * quet(300, 1400, giay) * env


def swoosh():
    t = moc(0.35)
    x = loc(nhieu(len(t)), 1500, 9000)
    env = np.exp(-((t - 0.12) ** 2) / 0.004)
    return x / np.max(np.abs(x)) * env


def pop():
    t = moc(0.13)
    f = 380 + 900 * np.exp(-t * 45)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)


def click():
    t = moc(0.06)
    return (np.sin(2 * np.pi * 2200 * t) * 0.6 + loc(nhieu(len(t)), 2000, 8000) * 0.3) * np.exp(-t * 90)


def chuong(fs, giay=0.9, tat=4.5):
    t = moc(giay)
    x = sum(a * np.sin(2 * np.pi * f * t) for f, a in fs)
    return x * np.exp(-t * tat) * np.minimum(1, t * 400)


def ting():
    return chuong([(1318.5, 1), (1975.5, 0.5), (2637, 0.25)])


def ding():
    a = chuong([(880, 1), (1760, 0.3)], 0.5, 7)
    b = chuong([(1318.5, 1), (2637, 0.3)], 0.7, 5)
    x = np.zeros(int(SR * 0.85))
    x[: len(a)] += a
    k = int(SR * 0.09)
    x[k : k + len(b)] += b
    return x


def sai():
    t = moc(0.38)
    x = signal.sawtooth(2 * np.pi * 150 * t) + signal.sawtooth(2 * np.pi * 158 * t)
    return loc(x, hi=1800) * (np.exp(-t * 6) * (1 - np.exp(-t * 200)))


def sting():
    t = moc(0.7)
    tram = np.sin(2 * np.pi * (90 * np.exp(-t * 6) + 40) * t) * np.exp(-t * 7)
    vut = np.sin(2 * np.pi * (400 + 2600 * t) * t) * np.exp(-t * 9) * 0.35
    return tram + vut + nhieu(len(t)) * np.exp(-t * 30) * 0.25


def boom():
    t = moc(1.2)
    tram = np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-t * 8)) / SR) * np.exp(-t * 3.2)
    va = loc(nhieu(len(t)), hi=1200) * np.exp(-t * 9) * 0.6
    lap = chuong([(1046.5, 0.4), (1568, 0.3), (2093, 0.2)], 1.2, 3) * 0.5
    return tram + va + lap


def riser():
    g = 1.2
    t = moc(g)
    x = loc(nhieu(len(t)), 800, 7000) * (t / g) ** 2
    return x / np.max(np.abs(x)) * 0.6 + quet(200, 1600, g, 2) * (t / g) ** 2 * 0.5


def zoom():
    t = moc(0.45)
    return loc(nhieu(len(t)), 150, 1500) * np.sin(np.pi * t / 0.45) ** 2 + 0.4 * quet(500, 120, 0.45) * np.exp(-t * 4)


def tang():
    out = np.zeros(int(SR * 0.6))
    for i, f in enumerate([523, 659, 784, 1046]):
        n = chuong([(f, 1), (f * 2, 0.2)], 0.25, 18)
        k = int(SR * 0.07 * i)
        out[k : k + len(n)] += n
    return out


def lac():  # xúc xắc lắc rồi lăn
    out = np.zeros(int(SR * 1.3))
    for i in range(16):
        tt = 0.04 + i * 0.075 * (1 + i / 20)
        if tt > 1.2:
            break
        n = loc(nhieu(int(SR * 0.03)), 1500, 6000) * np.exp(-np.arange(int(SR * 0.03)) / SR * 140) * (1 - i / 18)
        k = int(SR * tt)
        out[k : k + len(n)] += n
    return out


def xu():  # đồng xu: tiếng búng + leng keng
    out = np.zeros(int(SR * 1.3))
    b = chuong([(2800, 1), (4100, 0.6)], 0.2, 25)
    out[: len(b)] += b
    for i, tt in enumerate([0.95, 1.05, 1.12]):
        n = chuong([(3200 - i * 150, 1), (5200, 0.4)], 0.18, 30) * (0.8 - i * 0.2)
        k = int(SR * tt)
        out[k : k + len(n)] += n[: len(out) - k]
    return out


def quay():  # vòng quay: tiếng tách thưa dần
    g = 2.9
    out = np.zeros(int(SR * g))
    tt, kc = 0.0, 0.035
    while tt < 2.6:
        n = click() * 0.8
        k = int(SR * tt)
        out[k : k + len(n)] += n[: len(out) - k]
        tt += kc
        kc *= 1.065
    d = ding()
    k = int(SR * 2.65)
    out[k:] += d[: len(out) - k] * 0.6
    return out


def tich():
    out = np.zeros(int(SR * 1.8))
    for i in range(14):
        n = click() * (0.9 if i % 2 == 0 else 0.6)
        k = int(SR * i * 0.12)
        out[k : k + len(n)] += n[: len(out) - k]
    return out


def mo():  # mở hộp quà: vút + lấp lánh
    out = np.zeros(int(SR * 1.1))
    w = swoosh()
    out[: len(w)] += w * 0.6
    for i, f in enumerate([1568, 2093, 2637, 3136, 2637, 3520]):
        n = chuong([(f, 1)], 0.35, 12) * 0.45
        k = int(SR * (0.12 + i * 0.07))
        out[k : k + len(n)] += n[: len(out) - k]
    return out


def cua():
    t = moc(0.7)
    keo = loc(nhieu(len(t)), 200, 900) * np.sin(np.pi * t / 0.7) * 0.5
    return keo + 0.4 * quet(180, 90, 0.7) * np.exp(-t * 3)


def lat():
    t = moc(0.22)
    return loc(nhieu(len(t)), 2500, 9000) * np.exp(-((t - 0.05) ** 2) / 0.0008)


# ---------------- NHẠC NỀN ----------------
NOT = {"A2": 110.0, "F2": 87.31, "C3": 130.81, "G2": 98.0, "A3": 220.0, "C4": 261.63, "E4": 329.63, "F3": 174.61,
       "A4": 440.0, "G3": 196.0, "B3": 246.94, "D4": 293.66, "C5": 523.25, "E5": 659.25, "G4": 392.0, "D5": 587.33}


def nhac_nen():
    bpm = 120
    phach = 60 / bpm
    o_nhip = 4 * phach            # 2 giây
    so_o = 16                     # 32 giây
    dai = so_o * o_nhip
    n = int(SR * dai)
    t = np.arange(n) / SR
    out = np.zeros(n)
    bass = np.zeros(n)
    pad = np.zeros(n)
    hop_am = [("A2", ["A3", "C4", "E4"], ["A4", "C5", "E5", "C5"]),
              ("F2", ["F3", "A3", "C4"], ["A4", "C5", "F3", "C5"]),
              ("C3", ["G3", "C4", "E4"], ["G4", "C5", "E5", "C5"]),
              ("G2", ["G3", "B3", "D4"], ["G4", "B3", "D5", "B3"])]

    def dat(dst, x, giay):
        k = int(SR * giay)
        if k >= n:
            return
        m = min(len(x), n - k)
        dst[k : k + m] += x[:m]

    kick = np.sin(2 * np.pi * np.cumsum(45 + 95 * np.exp(-moc(0.35) * 30)) / SR) * np.exp(-moc(0.35) * 9)
    clap = loc(nhieu(int(SR * 0.18)), 900, 5000) * np.exp(-moc(0.18) * 28)
    hat = loc(nhieu(int(SR * 0.05)), 7000, None) * np.exp(-moc(0.05) * 90)

    for o in range(so_o):
        goc, ha, arp = hop_am[o % 4]
        t0 = o * o_nhip
        full = o >= 2                      # 2 ô nhịp đầu nhẹ nhàng
        for b in range(4):
            tb = t0 + b * phach
            if full:
                dat(out, kick * 0.9, tb)
                if b in (1, 3):
                    dat(out, clap * 0.45, tb)
            for h in range(2):
                dat(out, hat * (0.22 if h else 0.12), tb + h * phach / 2)
            # bass móc theo nốt móc đơn
            for h in range(2):
                g = moc(phach / 2 * 0.9)
                f = NOT[goc] * (2 if h == 1 and b % 2 else 1)
                x = signal.sawtooth(2 * np.pi * f * g) * np.exp(-g * 5)
                dat(bass, x * (0.55 if full else 0.3), tb + h * phach / 2)
        # arpeggio nốt móc kép
        for k in range(16):
            ten = arp[k % 4]
            g = moc(phach / 4 * 1.8)
            f = NOT[ten]
            x = (np.sin(2 * np.pi * f * g) + 0.3 * np.sin(2 * np.pi * 2 * f * g) + 0.1 * np.sin(2 * np.pi * 3 * f * g)) * np.exp(-g * 14)
            dat(out, x * (0.16 if k % 4 == 0 else 0.11), t0 + k * phach / 4)
        # pad
        g = moc(o_nhip)
        x = sum(np.sin(2 * np.pi * NOT[nn] * g) + np.sin(2 * np.pi * NOT[nn] * 1.004 * g) for nn in ha)
        env = np.minimum(1, g / 0.15) * np.minimum(1, (o_nhip - g) / 0.15)
        dat(pad, x * env * 0.05, t0)
    # "pumping" theo kick (sidechain) cho pad và bass: nghe hiện đại, có nhịp
    pha = (t % phach) / phach
    bom = np.where(t >= 2 * o_nhip, 0.35 + 0.65 * np.minimum(1, pha / 0.45), 1.0)
    out += loc(bass, hi=900) * bom + loc(pad, hi=3000) * bom
    out = np.tanh(out * 1.3)
    return out


if __name__ == "__main__":
    goc = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
    ds = {"whoosh": whoosh(), "swoosh": swoosh(), "pop": pop(), "click": click(), "ting": ting(), "ding": ding(),
          "sai": sai(), "sting": sting(), "boom": boom(), "riser": riser(), "zoom": zoom(), "tang": tang(), "lac": lac(),
          "xu": xu(), "quay": quay(), "tich": tich(), "mo": mo(), "cua": cua(), "lat": lat()}
    for ten, x in ds.items():
        luu(os.path.join(goc, "sfx", ten + ".wav"), x)
    luu(os.path.join(goc, "nhac", "nen.wav"), nhac_nen())
    print("Đã tạo %d hiệu ứng trong public/sfx và nhạc nền public/nhac/nen.wav" % len(ds))
