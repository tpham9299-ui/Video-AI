#!/usr/bin/env python3
"""v98 — BỘ TỔNG HỢP NHẠC NỀN 3 PHONG CÁCH (Procedural Synth, thuần numpy/scipy, 0 % mẫu âm thanh ngoài -> không Content ID).

  chillhop_upbeat (118 BPM) : Đại số & Xác suất   — piano điện ấm (FM 2 toán tử) + trống nảy swing nhẹ + bass đi nốt
  cyber_study     (122 BPM) : Hình không gian & Oxyz — bass synth mềm (saw lọc) + arpeggio công nghệ 16 nốt, lọc quét chậm
  marimba_tech    (120 BPM) : Toán thực tế 2D–3D  — marimba/pluck tươi sáng (bội âm 1 : 3,9 : 9,2) + shaker + bass tròn

Mỗi bản 16 ô nhịp, đuôi nốt QUẤN về đầu vòng -> lặp liền mạch không vết nối (Remotion <Audio loop>). Tất định (hạt giống cố định).
Giai điệu viết riêng (motif 2 ô nhịp + biến tấu câu trả lời), tránh vòng hợp âm "bài hit" quen tai.
Chạy thử: python scripts/nhac_nen_v98.py [preset] -> public/nhac/v98_<preset>.wav
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

import numpy as np
try:
    from scipy import signal
except ImportError:  # job ghep trên CI chỉ cài pillow + numpy khi gọi --chuan-hoa-lufs
    signal = None

SR = 32000
PHIEN_BAN = "v98"
DUCKING_DB_MAC_DINH = -17.0   # Tự động nén/hạ nhạc nền dưới giọng đọc trong khoảng -16 dB .. -18 dB
DUCKING_NGHI_TANG_DB = 5.0    # Nhích nhẹ lên ở khoảng nghỉ giữa các câu/cảnh
DUCKING_OUTRO_TANG_DB = 4.5   # Nhích nhẹ lên ở Intro / Outro
LOUDNORM_TARGET = "I=-14:TP=-1.5:LRA=11"
PRESET = {
    "chillhop_upbeat": {"bpm": 118},
    "cyber_study": {"bpm": 122},
    "marimba_tech": {"bpm": 120},
}
TEN_NOT = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def hz(ten):
    return 440.0 * 2 ** ((TEN_NOT[ten[:-1]] + 12 * (int(ten[-1]) + 1) - 69) / 12)


def moc(giay):
    return np.arange(max(1, int(SR * giay))) / SR


def loc(x, lo=None, hi=None, bac=2):
    if lo and hi:
        b, a = signal.butter(bac, [lo / (SR / 2), hi / (SR / 2)], "band")
    elif lo:
        b, a = signal.butter(bac, lo / (SR / 2), "high")
    else:
        b, a = signal.butter(bac, hi / (SR / 2), "low")
    return signal.lfilter(b, a, x)


def loc_v(x, lo=None, hi=None, bac=2):
    """Lọc TUẦN HOÀN cho cả vòng lặp: lọc 2 vòng nối nhau, lấy vòng sau (trạng thái bộ lọc đã ổn định) -> đầu và cuối khớp nhau."""
    return loc(np.concatenate([x, x]), lo, hi, bac)[len(x):]


class Vong:
    """Bộ đệm một vòng lặp: đặt âm thanh tại giây t, phần tràn quấn về đầu (vòng lặp liền mạch)."""

    def __init__(self, bpm, so_o=16):
        self.phach = 60.0 / bpm
        self.o = 4 * self.phach
        self.n = int(round(SR * so_o * self.o))
        self.so_o = so_o

    def moi(self):
        return np.zeros(self.n)

    def dat(self, dst, x, giay):
        k = int(round(SR * giay)) % self.n
        mm = min(len(x), self.n - k)
        dst[k:k + mm] += x[:mm]
        du = x[mm:]
        while len(du):
            c = min(len(du), self.n)
            dst[:c] += du[:c]
            du = du[c:]


def _trong(v, r, kieu):
    """Trống chung: kick tròn, snare/clap, hat; kieu quyết định nhịp."""
    kick = np.sin(2 * np.pi * np.cumsum(46 + 85 * np.exp(-moc(0.38) * 28)) / SR) * np.exp(-moc(0.38) * 8.5)
    kick = loc(kick, hi=1200)
    snare = loc(r.standard_normal(int(SR * 0.2)), 1200, 7000) * np.exp(-moc(0.2) * 22) * 0.7 \
        + 0.45 * np.sin(2 * np.pi * 190 * moc(0.2)) * np.exp(-moc(0.2) * 30)
    clap = sum(loc(r.standard_normal(int(SR * 0.16)), 900, 5200) * np.exp(-moc(0.16) * 26) * (0.6 if k else 1.0) for k in range(1))
    hat = loc(r.standard_normal(int(SR * 0.05)), 6500, None) * np.exp(-moc(0.05) * 85)
    hat_mo = loc(r.standard_normal(int(SR * 0.28)), 6000, None) * np.exp(-moc(0.28) * 11)
    shaker = loc(r.standard_normal(int(SR * 0.07)), 4000, 9000) * (np.sin(np.pi * moc(0.07) / 0.07) ** 2)
    d = v.moi()
    p = v.phach
    for o in range(v.so_o):
        t0 = o * v.o
        lap = o % 4 == 3            # ô nhịp thứ 4 của câu: fill nhẹ
        for b in range(4):
            tb = t0 + b * p
            if kieu == "chillhop":
                sw = p * 0.54
                if b == 0 or b == 2 or (b == 1 and o % 2 == 1):
                    v.dat(d, kick * (1.0 if b != 1 else 0.6), tb if b != 1 else tb + sw)
                if b in (1, 3):
                    v.dat(d, snare * 0.62, tb)
                for h, l in enumerate((0, sw)):
                    v.dat(d, hat * (0.26 if h == 0 else 0.17) * (0.85 + 0.3 * r.random()), tb + l)
                if b == 3 and lap:
                    v.dat(d, hat_mo * 0.16, tb + sw)
            elif kieu == "cyber":
                v.dat(d, kick * 0.9, tb)                                  # bốn phách đều, kick mềm
                if b in (1, 3):
                    v.dat(d, clap * 0.42, tb)
                for h in range(4):
                    v.dat(d, hat * (0.15 if h % 2 else 0.08) * (0.9 + 0.2 * r.random()), tb + h * p / 4)
                if b == 3 and lap:
                    for h in range(4):
                        v.dat(d, snare * 0.12 * (h + 1) / 4, tb + h * p / 4)
            else:  # marimba
                if b in (0, 2) or (b == 3 and o % 2):
                    v.dat(d, kick * (0.85 if b != 3 else 0.45), tb if b != 3 else tb + p / 2)
                if b in (1, 3):
                    v.dat(d, snare * 0.4, tb)
                for h in range(4):
                    v.dat(d, shaker * (0.2 if h % 2 else 0.12) * (0.85 + 0.3 * r.random()), tb + h * p / 4)
    return d, kick


def _bom(v, sau=0.62, giu=0.45):
    """Sidechain theo phách (độ "nảy")."""
    t = np.arange(v.n) / SR
    pha = (t % v.phach) / v.phach
    return sau + (1 - sau) * np.minimum(1, pha / giu)


# ---------------- 1. CHILLHOP UPBEAT ----------------
VONG_CHILL = [("D2", ["F3", "A3", "C4", "E4"]), ("G2", ["F3", "B3", "E4", "A4"]),
              ("C3", ["E3", "G3", "B3", "D4"]), ("A2", ["G3", "C4", "E4", "G4"])]          # Dm9 · G13 · Cmaj9 · Am7
MOTIF_CHILL = [  # (nốt, phách bắt đầu trong 2 ô nhịp, độ dài phách) — motif hỏi / đáp
    [("A4", 0.5, 0.5), ("C5", 1.0, 0.5), ("D5", 1.5, 1.0), ("E5", 3.0, 0.5), ("D5", 3.5, 0.5), ("C5", 4.5, 1.0), ("A4", 6.0, 1.5)],
    [("A4", 0.5, 0.5), ("C5", 1.0, 0.5), ("D5", 1.5, 1.0), ("G5", 3.0, 0.5), ("E5", 3.5, 1.0), ("D5", 5.0, 0.5), ("C5", 5.5, 2.0)],
]


def _ep(f, giay, luc):
    """Piano điện FM: sóng mang f, điều chế 1:1 tắt dần (ấm) + 'tine' sáng lúc gõ."""
    g = moc(giay)
    chi_so = 1.4 * np.exp(-g * 5) + 0.25
    x = np.sin(2 * np.pi * f * g + chi_so * np.sin(2 * np.pi * f * g))
    tine = 0.18 * np.sin(2 * np.pi * f * 14 * g) * np.exp(-g * 30)
    env = np.exp(-g * 1.3) * np.minimum(1, g / 0.008) * np.minimum(1, (giay - g) / 0.05 + 0.0001)
    return (x + tine) * env * luc * (1 + 0.12 * np.sin(2 * np.pi * 5.0 * g))


def chillhop_upbeat():
    v = Vong(PRESET["chillhop_upbeat"]["bpm"])
    r = np.random.default_rng(118)
    d, _ = _trong(v, r, "chillhop")
    keys, bass, mel = v.moi(), v.moi(), v.moi()
    p = v.phach
    sw = p * 0.54
    for o in range(v.so_o):
        goc, ha = VONG_CHILL[o % 4]
        t0 = o * v.o
        for tg, luc in ((0.0, 0.2), (p + sw, 0.13), (3 * p, 0.1)):
            for k, nn in enumerate(ha):
                v.dat(keys, _ep(hz(nn), p * 1.5, luc), t0 + tg + 0.01 * k)
        for b, (bo, dai) in enumerate(((0, 0.9), (1.5, 0.45), (2, 0.8), (3.5, 0.45))):
            g = moc(p * dai)
            f = hz(goc) * (2 if b == 1 else 1)
            x = (np.sin(2 * np.pi * f * g) + 0.25 * np.sin(4 * np.pi * f * g)) * np.exp(-g * 2.2) * np.minimum(1, g / 0.01)
            v.dat(bass, x * 0.75, t0 + bo * p)
        if o % 2 == 0 and o >= 2:     # giai điệu từ ô 3 (để 4 s đầu thoáng cho hook giọng đọc)
            for nn, bd, dl in MOTIF_CHILL[(o // 2) % 2]:
                v.dat(mel, _ep(hz(nn), p * dl * 1.2, 0.17), t0 + bd * p + (sw - p / 2 if (bd * 2) % 2 == 1 else 0))
    bom = _bom(v, 0.7)
    am = loc_v(keys, hi=3200) * bom + loc_v(mel, hi=4200) + loc_v(bass, hi=380) * bom + d * 0.85
    return am


# ---------------- 2. CYBER STUDY ----------------
VONG_CYBER = [("A1", ["A3", "C4", "E4"], ["A4", "E5", "C5", "E5"]), ("F1", ["F3", "A3", "C4"], ["F4", "C5", "A4", "C5"]),
              ("C2", ["G3", "C4", "E4"], ["G4", "E5", "C5", "G5"]), ("E1", ["G#3", "B3", "E4"], ["E4", "B4", "G#4", "B4"])]


def cyber_study():
    v = Vong(PRESET["cyber_study"]["bpm"])
    r = np.random.default_rng(122)
    d, _ = _trong(v, r, "cyber")
    bass, arp, pad = v.moi(), v.moi(), v.moi()
    p = v.phach
    for o in range(v.so_o):
        goc, ha, nc = VONG_CYBER[o % 4]
        t0 = o * v.o
        for h in range(8):                                               # bass móc đơn, nốt lệch quãng 8 ở móc sau
            g = moc(p / 2 * 0.92)
            f = hz(goc) * (2 if h % 2 else 1)
            x = signal.sawtooth(2 * np.pi * f * g, 0.5) * 0.6 + np.sin(2 * np.pi * f * g)
            v.dat(bass, x * np.exp(-g * 3) * np.minimum(1, g / 0.006) * 0.55, t0 + h * p / 2)
        for k in range(16):
            nn = nc[k % 4]
            f = hz(nn) * (2 if k % 8 >= 6 else 1)
            g = moc(p / 4 * 1.6)
            x = signal.square(2 * np.pi * f * g, 0.32) * 0.35 + np.sin(2 * np.pi * f * g)
            v.dat(arp, x * np.exp(-g * 16) * (0.15 if k % 4 == 0 else 0.1), t0 + k * p / 4)
        g = moc(v.o)
        x = sum(signal.sawtooth(2 * np.pi * hz(nn) * g) + signal.sawtooth(2 * np.pi * hz(nn) * 1.006 * g) for nn in ha)
        v.dat(pad, x * np.minimum(1, g / 0.4) * np.minimum(1, (v.o - g) / 0.4) * 0.025, t0)
    # lọc quét chậm trên arpeggio (chu kỳ 8 ô nhịp = nửa vòng, quấn đúng vòng): 1,2 kHz <-> 4,5 kHz, xử lý theo khối
    t = np.arange(v.n) / SR
    cat = 2850 + 1650 * np.sin(2 * np.pi * t / (8 * v.o))
    khoi = SR // 20
    arp2 = np.zeros(v.n)
    zi = np.zeros(2)
    for vong in range(2):                     # chạy 2 vòng, giữ vòng sau -> lặp liền mạch
        for a in range(0, v.n, khoi):
            b_, a_ = signal.butter(2, cat[a] / (SR / 2), "low")
            y, zi = signal.lfilter(b_, a_, arp[a:a + khoi], zi=zi)
            if vong:
                arp2[a:a + khoi] = y
    bom = _bom(v, 0.45, 0.5)
    am = loc_v(bass, hi=520) * bom * 0.9 + arp2 + loc_v(pad, 200, 2600) * bom + d * 0.8
    return am


# ---------------- 3. MARIMBA TECH ----------------
VONG_MAR = [("C2", ["C4", "E4", "G4"]), ("B1", ["D4", "G4", "B4"]), ("A1", ["C4", "E4", "A4"]), ("F1", ["C4", "F4", "A4"])]
GIAI_MAR = [  # 8 nốt móc đơn mỗi ô nhịp (None = nghỉ), đảo phách tươi
    ["E5", None, "G5", "E5", None, "C5", "D5", None], ["D5", None, "G5", "D5", None, "B4", "D5", "G5"],
    ["C5", None, "E5", "A5", None, "E5", "C5", None], ["C5", "F5", None, "A5", "G5", None, "F5", "E5"],
]


def _marimba(f, giay, luc):
    g = moc(giay)
    x = np.sin(2 * np.pi * f * g) * np.exp(-g * 6) + 0.35 * np.sin(2 * np.pi * f * 3.93 * g) * np.exp(-g * 22) \
        + 0.12 * np.sin(2 * np.pi * f * 9.2 * g) * np.exp(-g * 45)
    return x * np.minimum(1, g / 0.002) * luc


def marimba_tech():
    v = Vong(PRESET["marimba_tech"]["bpm"])
    r = np.random.default_rng(120)
    d, _ = _trong(v, r, "marimba")
    mar, bass, nen = v.moi(), v.moi(), v.moi()
    p = v.phach
    for o in range(v.so_o):
        goc, ha = VONG_MAR[o % 4]
        t0 = o * v.o
        for k, nn in enumerate(GIAI_MAR[o % 4]):
            if nn and (o >= 1 or k % 2 == 0):
                v.dat(mar, _marimba(hz(nn), p * 0.9, 0.22 if k % 2 == 0 else 0.16), t0 + k * p / 2)
        for b in range(4):                                                    # hợp âm pluck nhẹ ở phách 2 & 4
            if b in (1, 3):
                for j, nn in enumerate(ha):
                    v.dat(nen, _marimba(hz(nn), p * 0.6, 0.07), t0 + b * p + 0.006 * j)
        for bo in (0, 1.5, 2.5):
            g = moc(p * 0.8)
            v.dat(bass, np.sin(2 * np.pi * hz(goc) * 2 * g) * np.exp(-g * 3) * np.minimum(1, g / 0.01) * 0.7, t0 + bo * p)
    bom = _bom(v, 0.78)
    am = loc_v(mar, hi=7000) + loc_v(nen, hi=5000) + loc_v(bass, hi=400) * bom + d * 0.75
    return am


HAM = {"chillhop_upbeat": chillhop_upbeat, "cyber_study": cyber_study, "marimba_tech": marimba_tech}


def tron_cuoi(am):
    """Cắt dải siêu trầm, nén mềm, chuẩn hóa đỉnh 0,9 (độ to cuối do chuanbi.muc_tron_nhac đo thật)."""
    am = loc_v(am, lo=32, bac=2)
    am = np.tanh(am / max(1e-9, np.percentile(np.abs(am), 99.5)) * 0.9)
    return am / max(1e-9, np.max(np.abs(am))) * 0.9


def tao(preset):
    if preset not in HAM:
        raise ValueError("preset nhạc lạ: %s (chọn %s)" % (preset, " | ".join(HAM)))
    return tron_cuoi(HAM[preset]())


def chon_preset(k4=None, kb=None):
    """Chọn phong cách theo luồng: env NHAC_PRESET thắng; hình không gian / Oxyz / Lego -> cyber_study;
    xác suất + sơ đồ tư duy đại số -> chillhop_upbeat; thực tế 2D–3D (kinh tế, sơ đồ 2D, tăng trưởng, khuôn 3D) -> marimba_tech."""
    ep = str(os.environ.get("NHAC_PRESET") or "").strip()
    if ep in HAM:
        return ep
    k4 = k4 or {}
    if k4.get("khongGian"):
        return "cyber_study"
    sk = (k4.get("sanKhau") or {}).get("loai")
    if sk in ("rut_mau", "so_do_cay", "luoi_bayes", "cot_phan_phoi", "tu_duy_dai_so"):
        return "chillhop_upbeat"
    if sk in ("kinh_te_do_thi", "so_do_2d", "tang_truong"):
        return "marimba_tech"
    c3 = k4.get("canh3dv") or {}
    if isinstance(c3, dict) and c3.get("khuon") == "hai_mat_cau_oxyz":
        return "cyber_study"
    if isinstance(c3, dict) and c3.get("khuon") == "luoi_the_bi_xac_suat":
        return "chillhop_upbeat"
    return "marimba_tech" if c3 else "chillhop_upbeat"


def luu(ten, x):
    import wave
    os.makedirs(os.path.dirname(ten), exist_ok=True)
    with wave.open(ten, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def dam_bao(public, preset):
    """Sinh (nếu chưa có) public/nhac/v98_<preset>.wav -> đường dẫn tương đối 'nhac/v98_<preset>.wav'."""
    rel = "nhac/%s_%s.wav" % (PHIEN_BAN, preset)
    tep = os.path.join(public, rel)
    if not os.path.exists(tep):
        luu(tep, tao(preset))
    return rel


# ---------------- AUDIO MASTERING: AUTO-DUCKING & CHUẨN HÓA -14 LUFS ----------------
def tinh_muc_ducking(db_giong, db_nhac, duoi_db=DUCKING_DB_MAC_DINH):
    """Tính gain tuyến tính cho Remotion <Audio volume> từ độ lớn thật (dB) của giọng đọc và nhạc nền.
    Mặc định hạ nhạc nền dưới giọng -17 dB (trong dải -16..-18 dB), nhích lên +5 dB ở khoảng nghỉ và +4.5 dB ở Outro."""
    g = 10.0 ** ((float(db_giong) + float(duoi_db) - float(db_nhac)) / 20.0)
    g = max(0.01, min(0.6, g))
    return {
        "duoi": round(g, 4),
        "nghi": round(min(0.8, g * (10.0 ** (DUCKING_NGHI_TANG_DB / 20.0))), 4),
        "dauCuoi": round(min(0.8, g * (10.0 ** (4.0 / 20.0))), 4),
        "outro": round(min(0.8, g * (10.0 ** (DUCKING_OUTRO_TANG_DB / 20.0))), 4),
        "dbGiong": round(float(db_giong), 1),
        "dbNhac": round(float(db_nhac), 1),
        "duoiDb": round(float(duoi_db), 1),
    }


def tao_duong_bao_ducking(
    tong_mau,
    khoang_noi,
    sr=SR,
    duck_db=DUCKING_DB_MAC_DINH,
    nghi_tang_db=DUCKING_NGHI_TANG_DB,
    outro_tang_db=DUCKING_OUTRO_TANG_DB,
    outro_bat_dau=None,
    attack_s=0.12,
    release_s=0.45,
):
    """Tạo đường bao auto-ducking mượt (không phập phồng):
    - Đoạn có giọng đọc: hạ nhạc xuống mức `duck_db` (mặc định -17 dB, nằm trong -16..-18 dB).
    - Khoảng nghỉ: nhích mượt lên +`nghi_tang_db` dB.
    - Outro (khi không còn giọng): nhích lên +`outro_tang_db` dB rồi fade-out 0.6 s cuối.
    """
    n = max(1, int(tong_mau))
    g_noi = float(10.0 ** (float(duck_db) / 20.0))
    g_nghi = min(1.0, g_noi * float(10.0 ** (float(nghi_tang_db) / 20.0)))
    g_outro = min(1.0, g_noi * float(10.0 ** (float(outro_tang_db) / 20.0)))

    muc_tieu = np.full(n, g_nghi, dtype=np.float32)
    if outro_bat_dau is not None:
        i_out = max(0, min(n, int(round(float(outro_bat_dau) * sr))))
        muc_tieu[i_out:] = g_outro

    for a, b in khoang_noi or []:
        i0 = max(0, min(n, int(round(float(a) * sr))))
        i1 = max(i0, min(n, int(round(float(b) * sr))))
        if i1 > i0:
            muc_tieu[i0:i1] = g_noi

    # Làm mượt theo từng khối 10 ms (nhanh, tất định, không cần scipy)
    buoc = max(1, int(round(sr * 0.01)))
    m_block = (n + buoc - 1) // buoc
    a_atk = 1.0 - float(np.exp(-0.01 / max(0.01, float(attack_s))))
    a_rel = 1.0 - float(np.exp(-0.01 / max(0.01, float(release_s))))
    env_b = np.empty(m_block, dtype=np.float32)
    cur = float(muc_tieu[0])
    for k in range(m_block):
        lo = k * buoc
        hi = min(n, lo + buoc)
        # Trong khung có tiếng nói -> lấy giá trị nhỏ nhất để nén kịp trước âm đầu
        tgt = float(np.min(muc_tieu[lo:hi]))
        alpha = a_atk if tgt < cur else a_rel
        cur += (tgt - cur) * alpha
        env_b[k] = cur

    env = np.repeat(env_b, buoc)[:n]
    # Fade-out dịu 0.6 s cuối video
    fade = min(n // 4, int(round(0.6 * sr)))
    if fade > 1:
        env[-fade:] *= np.linspace(1.0, 0.0, fade, dtype=np.float32)
    return env


def ap_ducking_nhac(am_nhac, khoang_noi, tong_giay, sr=SR, duck_db=DUCKING_DB_MAC_DINH, outro_bat_dau=None):
    """Lặp nhạc nền đủ `tong_giay` rồi áp đường bao auto-ducking theo các khoảng có giọng đọc."""
    x = np.asarray(am_nhac, dtype=np.float32)
    if x.size == 0:
        return np.zeros(max(1, int(round(float(tong_giay) * sr))), dtype=np.float32)
    n = max(1, int(round(float(tong_giay) * sr)))
    so_lap = (n + x.size - 1) // x.size
    dai = np.tile(x, so_lap)[:n]
    env = tao_duong_bao_ducking(n, khoang_noi, sr=sr, duck_db=duck_db, outro_bat_dau=outro_bat_dau)
    return np.clip(dai * env, -1.0, 1.0)


def _doc_ten_thuong_hieu():
    goc = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "phong_cach.json")
    try:
        with open(goc, encoding="utf8") as f:
            return str((json.load(f).get("thuongHieu") or {}).get("ten") or "Story Math")
    except Exception:  # noqa: BLE001
        return "Story Math"


def kiem_tra_co_audio_that(video_path, timeout=45):
    """Kiểm tra tệp video có luồng âm thanh thực sự (không rỗng / không câm hoàn toàn) bằng ffprobe + volumedetect."""
    if not video_path or not os.path.isfile(video_path):
        return False, "không tìm thấy tệp video"
    try:
        pr = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "csv=p=0", video_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf8", errors="replace", timeout=timeout,
        )
        if pr.returncode != 0 or not pr.stdout.strip():
            return False, "video không có luồng âm thanh"
        vd = subprocess.run(
            ["ffmpeg", "-hide_banner", "-nostats", "-i", video_path, "-af", "volumedetect", "-f", "null", "-"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf8", errors="replace", timeout=timeout,
        )
        m = re.search(r"mean_volume:\s*(-?[\d.]+)\s*dB", vd.stderr)
        if not m:
            return False, "không đo được mean_volume"
        db = float(m.group(1))
        if db <= -85.0:
            return False, "luồng âm thanh câm (%.1f dB)" % db
        return True, "mean_volume=%.1f dB" % db
    except Exception as e:  # noqa: BLE001
        return False, "lỗi kiểm tra audio: %s" % str(e)[:120]


def chuan_hoa_lufs_video(video_vao, video_ra=None, gia_lap=False, metadata=None, timeout=180):
    """Hậu kỳ chuẩn hóa độ lớn đầu ra video bằng ffmpeg loudnorm (I=-14:TP=-1.5:LRA=11), copy nguyên luồng hình.
    Fallback an toàn: khi `gia_lap=True`, không có audio thật, hoặc ffmpeg báo lỗi -> giữ nguyên video gốc không làm gãy dây chuyền.
    """
    vao = os.path.abspath(video_vao)
    ra = os.path.abspath(video_ra) if video_ra else vao
    ghi_de = os.path.normcase(vao) == os.path.normcase(ra)

    def _fallback(ly_do):
        if not ghi_de and os.path.isfile(vao):
            os.makedirs(os.path.dirname(ra), exist_ok=True)
            shutil.copyfile(vao, ra)
        return {"ok": True, "da_chuan_hoa": False, "ly_do": ly_do, "filter": "loudnorm=" + LOUDNORM_TARGET, "tep": ra}

    if gia_lap:
        return _fallback("chế độ --gia-lap (bỏ qua loudnorm)")
    if not os.path.isfile(vao):
        return {"ok": False, "da_chuan_hoa": False, "ly_do": "không thấy tệp vào: " + vao, "filter": "loudnorm=" + LOUDNORM_TARGET, "tep": ra}

    co_am, ghi_chu = kiem_tra_co_audio_that(vao, timeout=min(60, timeout))
    if not co_am:
        return _fallback("fallback an toàn: " + ghi_chu)

    ten_th = _doc_ten_thuong_hieu()
    meta = {"artist": ten_th, "copyright": ten_th, "comment": ten_th}
    if isinstance(metadata, dict):
        meta.update({k: str(v) for k, v in metadata.items() if v})

    os.makedirs(os.path.dirname(ra), exist_ok=True)
    fd, tam = tempfile.mkstemp(prefix="lufs_", suffix=".mp4", dir=os.path.dirname(ra))
    os.close(fd)
    try:
        lenh = [
            "ffmpeg", "-y", "-loglevel", "error", "-i", vao,
            "-c:v", "copy",
            "-af", "loudnorm=" + LOUDNORM_TARGET,
            "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
            "-metadata", "artist=" + meta["artist"],
            "-metadata", "copyright=" + meta["copyright"],
            "-metadata", "comment=" + meta["comment"],
            "-movflags", "+faststart",
            tam,
        ]
        kq = subprocess.run(lenh, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf8", errors="replace", timeout=timeout)
        if kq.returncode != 0 or not os.path.isfile(tam) or os.path.getsize(tam) < 1000:
            if os.path.exists(tam):
                os.remove(tam)
            return _fallback("ffmpeg loudnorm thất bại: " + (kq.stderr or "")[-180:].strip())
        os.replace(tam, ra)
        return {"ok": True, "da_chuan_hoa": True, "ly_do": ghi_chu, "filter": "loudnorm=" + LOUDNORM_TARGET, "tep": ra}
    except Exception as e:  # noqa: BLE001
        if os.path.exists(tam):
            try:
                os.remove(tam)
            except OSError:
                pass
        return _fallback("ngoại lệ loudnorm: " + str(e)[:120])


if __name__ == "__main__":
    if "--chuan-hoa-lufs" in sys.argv:
        import argparse
        ap = argparse.ArgumentParser(description="Audio Mastering -14 LUFS cho video MP4")
        ap.add_argument("--chuan-hoa-lufs", required=True, help="Đường dẫn tệp MP4 đầu vào")
        ap.add_argument("--ra", default=None, help="Đường dẫn tệp MP4 đầu ra (mặc định ghi đè tệp vào)")
        ap.add_argument("--gia-lap", action="store_true", help="Fallback an toàn cho chế độ giả lập")
        a = ap.parse_args()
        kq = chuan_hoa_lufs_video(a.chuan_hoa_lufs, a.ra, gia_lap=a.gia_lap)
        print("Audio Mastering (%s): %s (%s)" % (kq["filter"], "ĐÃ CHUẨN HÓA -14 LUFS" if kq["da_chuan_hoa"] else "FALLBACK AN TOÀN", kq["ly_do"]))
        sys.exit(0 if kq["ok"] else 1)
    goc = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
    for ps in (sys.argv[1:] or list(HAM)):
        x = tao(ps)
        luu(os.path.join(goc, "nhac", "%s_%s.wav" % (PHIEN_BAN, ps)), x)
        print("Đã tạo public/nhac/%s_%s.wav (%d BPM, %.1f s)" % (PHIEN_BAN, ps, PRESET[ps]["bpm"], len(x) / SR))
