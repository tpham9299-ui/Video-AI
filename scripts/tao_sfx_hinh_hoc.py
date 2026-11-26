#!/usr/bin/env python3
"""Tổng hợp 5 tệp SFX sạch, êm tai (không chói, không bản quyền) vào public/sfx/:
  - draw.wav   : vẽ nét phụ (mềm, ấm, tựa tiếng bút lướt nhẹ)
  - pop.wav    : nhảy chip kết quả trung gian (êm, gọn)
  - whoosh.wav : chuyển pha / vào Outro (gió trầm mượt, không rít cao)
  - trap.wav   : cảnh báo bẫy (2 nốt gỗ trầm ấm rõ ý, không chói)
  - ding.wav   : công bố đáp án (chuông sáng dịu hài hòa)
Chỉ dùng thư viện chuẩn Python (wave, math, struct, random) -> chạy ổn định trên mọi máy & CI.
"""
import math
import os
import random
import struct
import wave

SR = 32000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "sfx")


def _lowpass(samples, cutoff_hz, sr=SR):
    rc = 1.0 / (2.0 * math.pi * cutoff_hz)
    dt = 1.0 / sr
    alpha = dt / (rc + dt)
    out = []
    y = 0.0
    for x in samples:
        y = y + alpha * (x - y)
        out.append(y)
    return out


def _highpass(samples, cutoff_hz, sr=SR):
    rc = 1.0 / (2.0 * math.pi * cutoff_hz)
    dt = 1.0 / sr
    alpha = rc / (rc + dt)
    out = []
    y = 0.0
    prev_x = 0.0
    for x in samples:
        y = alpha * (y + x - prev_x)
        prev_x = x
        out.append(y)
    return out


def _fade(samples, fade_in_s=0.008, fade_out_s=0.02, sr=SR):
    n = len(samples)
    ni = min(n, max(1, int(fade_in_s * sr)))
    no = min(n, max(1, int(fade_out_s * sr)))
    out = list(samples)
    for i in range(ni):
        out[i] *= 0.5 * (1.0 - math.cos(math.pi * i / ni))
    for i in range(no):
        out[n - 1 - i] *= 0.5 * (1.0 - math.cos(math.pi * i / no))
    return out


def _save_wav(path, samples, peak=0.78, sr=SR):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    m = max((abs(x) for x in samples), default=1.0)
    scale = (peak / m) if m > 1e-9 else 1.0
    frames = bytearray()
    for x in samples:
        v = max(-1.0, min(1.0, x * scale))
        frames.extend(struct.pack("<h", int(round(v * 32767))))
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(bytes(frames))


def gen_draw():
    """Tiếng vẽ nét phụ mềm: gió bút lọc dải giữa + hài âm ấm nhẹ."""
    dur = 0.28
    n = int(SR * dur)
    rng = random.Random(42)
    noise = [rng.gauss(0.0, 1.0) for _ in range(n)]
    # Lọc băng thông êm 500..2200 Hz để tựa tiếng bút lướt trên bảng
    band = _lowpass(_highpass(noise, 480.0), 2200.0)
    band = _lowpass(band, 2000.0)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SR
        u = t / dur
        env = math.sin(math.pi * u) ** 1.4
        freq = 360.0 + 380.0 * (u ** 0.85)
        phase += 2.0 * math.pi * freq / SR
        tone = 0.28 * math.sin(phase) * math.exp(-t * 8.0)
        out.append((0.75 * band[i] + tone) * env)
    return _fade(out, 0.015, 0.04)


def gen_pop():
    """Tiếng nhảy chip kết quả trung gian: ấm, tròn, gọn 0.14s."""
    dur = 0.14
    n = int(SR * dur)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SR
        freq = 360.0 + 460.0 * math.exp(-t * 38.0)
        phase += 2.0 * math.pi * freq / SR
        env = (1.0 - math.exp(-t * 220.0)) * math.exp(-t * 26.0)
        sig = math.sin(phase) + 0.18 * math.sin(2.0 * phase)
        out.append(sig * env)
    return _fade(out, 0.005, 0.02)


def gen_whoosh():
    """Tiếng chuyển pha / vào Outro: lướt gió trầm ấm, không rít."""
    dur = 0.36
    n = int(SR * dur)
    rng = random.Random(108)
    noise = [rng.gauss(0.0, 1.0) for _ in range(n)]
    air = _lowpass(_highpass(noise, 240.0), 1450.0)
    air = _lowpass(air, 1300.0)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SR
        u = t / dur
        env = math.sin(math.pi * u) ** 1.8
        freq = 210.0 + 420.0 * math.sin(math.pi * u)
        phase += 2.0 * math.pi * freq / SR
        body = 0.25 * math.sin(phase)
        out.append((air[i] * 0.9 + body) * env)
    return _fade(out, 0.02, 0.05)


def gen_trap():
    """Tiếng cảnh báo bẫy: 2 nốt marimba/gỗ hạ nhẹ (D5 -> G4), rõ ràng mà không chói."""
    dur = 0.34
    n = int(SR * dur)
    out = [0.0] * n
    notes = [(0.0, 587.33, 0.15, 1.0), (0.11, 392.00, 0.22, 0.92)]
    for start_s, freq, ndur, amp in notes:
        i0 = int(start_s * SR)
        m = min(n - i0, int(ndur * SR))
        for k in range(m):
            t = k / SR
            env = (1.0 - math.exp(-t * 240.0)) * math.exp(-t * 14.0)
            sig = math.sin(2.0 * math.pi * freq * t) + 0.22 * math.sin(2.0 * math.pi * freq * 2.0 * t) * math.exp(-t * 22.0)
            out[i0 + k] += amp * sig * env
    return _fade(_lowpass(out, 2400.0), 0.005, 0.03)


def gen_ding():
    """Tiếng công bố đáp án: chuông ấm 2 nốt mở (A5 -> E6), dịu tai."""
    dur = 0.62
    n = int(SR * dur)
    out = [0.0] * n
    notes = [
        (0.0, [(880.0, 1.0), (1760.0, 0.22)], 0.42, 6.5, 0.85),
        (0.085, [(1318.51, 1.0), (2637.02, 0.18)], 0.52, 5.2, 1.0),
    ]
    for start_s, partials, ndur, decay, amp in notes:
        i0 = int(start_s * SR)
        m = min(n - i0, int(ndur * SR))
        for k in range(m):
            t = k / SR
            env = (1.0 - math.exp(-t * 260.0)) * math.exp(-t * decay)
            val = sum(a * math.sin(2.0 * math.pi * f * t) for f, a in partials)
            out[i0 + k] += amp * val * env
    return _fade(_lowpass(out, 3600.0), 0.006, 0.05)


def tao_tat_ca(thu_muc=OUT_DIR):
    ds = {
        "draw.wav": gen_draw(),
        "pop.wav": gen_pop(),
        "whoosh.wav": gen_whoosh(),
        "trap.wav": gen_trap(),
        "ding.wav": gen_ding(),
    }
    for ten, mau in ds.items():
        _save_wav(os.path.join(thu_muc, ten), mau)
    return list(ds.keys())


if __name__ == "__main__":
    cac_tep = tao_tat_ca()
    print("Đã tổng hợp 5 tệp SFX sạch vào public/sfx/:", ", ".join(cac_tep))
