"""Sinh 3 hiệu ứng âm thanh ngắn (whoosh / pop / ding) vào public/sfx/ - chỉ dùng thư viện chuẩn.
Chạy: python scripts/tao_sfx.py
"""
import math
import os
import random
import struct
import wave

SR = 44100
RA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'sfx')


def vien(n, vao, ra):
    """Bao biên fade-in / fade-out hình sin (giây) -> không tiếng tách."""
    nv, nr = max(1, int(vao * SR)), max(1, int(ra * SR))
    out = []
    for i in range(n):
        a = 1.0
        if i < nv:
            a = math.sin(0.5 * math.pi * i / nv)
        if i > n - nr:
            a = min(a, math.sin(0.5 * math.pi * (n - i) / nr))
        out.append(max(0.0, a))
    return out


def ghi(ten, mau, bien=0.8):
    dinh = max(1e-9, max(abs(x) for x in mau))
    os.makedirs(RA, exist_ok=True)
    with wave.open(os.path.join(RA, ten), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(32767 * bien * x / dinh)) for x in mau))


def whoosh():
    n = int(0.22 * SR)
    rnd = random.Random(7)
    env, bo, lp = vien(n, 0.06, 0.10), [], 0.0
    for i in range(n):
        u = i / n
        he_so = 0.03 + 0.10 * math.sin(math.pi * u)  # lọc thông thấp mở rồi khép -> gió trầm mềm
        lp += he_so * (rnd.uniform(-1, 1) - lp)
        bo.append(lp * env[i] * math.sin(math.pi * u) ** 0.5)
    return bo


def pop():
    n = int(0.07 * SR)
    env = vien(n, 0.004, 0.03)
    out = []
    for i in range(n):
        u = i / n
        f = 520 - 300 * u  # tần số rơi nhanh -> "pop" gọn
        out.append(math.sin(2 * math.pi * f * i / SR) * math.exp(-5 * u) * env[i])
    return out


def ding():
    n = int(0.35 * SR)
    env = vien(n, 0.008, 0.12)
    out = []
    for i in range(n):
        u = i / n
        t = i / SR
        s = 0.0
        for f, a in ((784.0, 1.0), (987.77, 0.7), (1318.5, 0.5)):  # G5 - B5 - E6: hợp âm Mi thứ êm
            s += a * math.sin(2 * math.pi * f * t) * math.exp(-4.5 * u)
        out.append(s * env[i])
    return out


if __name__ == '__main__':
    ghi('whoosh.wav', whoosh(), 0.7)
    ghi('pop.wav', pop(), 0.8)
    ghi('ding.wav', ding(), 0.75)
    print('Đã tạo whoosh.wav, pop.wav, ding.wav trong', os.path.normpath(RA))
