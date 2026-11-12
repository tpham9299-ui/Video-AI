#!/usr/bin/env python3
"""Sinh âm thanh mẫu (không cần tải gì): whoosh, pop, ting và nhạc nền nhẹ lặp được.
Muốn hay hơn: thay các tệp trong public/sfx và public/nhac bằng tệp miễn phí bản quyền cùng tên
(YouTube Audio Library, Pixabay...). Chạy: python3 scripts/taoAmThanh.py"""
import os
import wave
import numpy as np
from scipy import signal

SR = 22050
rng = np.random.default_rng(7)


def luu(ten, x):
    x = np.clip(x, -1, 1)
    os.makedirs(os.path.dirname(ten), exist_ok=True)
    with wave.open(ten, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def moc(giay):
    return np.arange(int(SR * giay)) / SR


def whoosh():
    t = moc(0.55)
    nhieu = rng.standard_normal(len(t))
    b, a = signal.butter(2, [500 / (SR / 2), 4500 / (SR / 2)], "band")
    x = signal.lfilter(b, a, nhieu)
    env = np.sin(np.pi * np.clip(t / 0.55, 0, 1)) ** 2
    quet = 0.25 * np.sin(2 * np.pi * (300 * t + 900 * t * t))
    return 0.55 * (x / np.max(np.abs(x))) * env + 0.15 * quet * env


def pop():
    t = moc(0.14)
    f = 500 + 500 * np.exp(-t * 40)
    return 0.7 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28)


def ting():
    t = moc(0.9)
    x = np.sin(2 * np.pi * 1318.5 * t) + 0.5 * np.sin(2 * np.pi * 1975.5 * t) + 0.25 * np.sin(2 * np.pi * 2637 * t)
    return 0.45 * x / 1.75 * np.exp(-t * 4.5) * np.minimum(1, t * 400)


def sting():
    """Tiếng "tách" gây chú ý ở khung hình đầu: cú đập trầm + tiếng vút lên."""
    t = moc(0.7)
    tram = np.sin(2 * np.pi * (90 * np.exp(-t * 6) + 40) * t) * np.exp(-t * 7)
    vut = np.sin(2 * np.pi * (400 + 2600 * t) * t) * np.exp(-t * 9) * 0.35
    nhieu = rng.standard_normal(len(t)) * np.exp(-t * 30) * 0.25
    x = tram + vut + nhieu
    return 0.85 * x / np.max(np.abs(x))


def nhac_nen():
    """24 giây: Am - F - C - G, mỗi hợp âm 6 giây, có chấm nhẹ kiểu đàn marimba. Hai đầu mờ dần để lặp liền mạch."""
    dai = 24.0
    t = moc(dai)
    x = np.zeros_like(t)
    hop_am = [
        [220.0, 261.63, 329.63],   # Am
        [174.61, 220.0, 261.63],   # F
        [261.63, 329.63, 392.0],   # C
        [196.0, 246.94, 293.66],   # G
    ]
    for k, notes in enumerate(hop_am):
        t0, t1 = k * 6.0, (k + 1) * 6.0
        m = (t >= t0 - 0.6) & (t < t1 + 0.6)
        tt = t[m]
        env = np.clip((tt - (t0 - 0.6)) / 0.9, 0, 1) * np.clip(((t1 + 0.6) - tt) / 0.9, 0, 1)
        for n in notes:
            x[m] += env * (np.sin(2 * np.pi * n * tt) + np.sin(2 * np.pi * n * 1.003 * tt)) * 0.12
        # chấm nhẹ
        for j in range(8):
            tj = t0 + j * 0.75
            nt = notes[j % 3] * 2
            mm = (t >= tj) & (t < tj + 0.7)
            ts = t[mm] - tj
            x[mm] += 0.10 * np.sin(2 * np.pi * nt * ts) * np.exp(-ts * 7)
    x *= np.minimum(1, np.minimum(t / 0.8, (dai - t) / 0.8))
    return 0.8 * x / np.max(np.abs(x))


if __name__ == "__main__":
    goc = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
    luu(os.path.join(goc, "sfx", "whoosh.wav"), whoosh())
    luu(os.path.join(goc, "sfx", "pop.wav"), pop())
    luu(os.path.join(goc, "sfx", "ting.wav"), ting())
    luu(os.path.join(goc, "sfx", "sting.wav"), sting())
    luu(os.path.join(goc, "nhac", "nen.wav"), nhac_nen())
    print("Đã tạo âm thanh mẫu trong public/sfx và public/nhac")
