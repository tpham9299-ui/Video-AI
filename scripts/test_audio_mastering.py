#!/usr/bin/env python3
"""Unit test cho Đợt 1 Phần B — Từ điển đọc Toán TTS, Auto-ducking nhạc nền & Chuẩn hóa -14 LUFS.

Chạy: python -X utf8 scripts/test_audio_mastering.py
"""
import os
import re
import subprocess
import sys
import tempfile

import numpy as np

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(GOC, "scripts"))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import chuanbi as cb  # noqa: E402
import nhac_nen_v98 as nhac  # noqa: E402
import tu_dien_doc_toan as td  # noqa: E402

dat = 0
hong = 0


def kiem(dk, ten, chi_tiet=""):
    global dat, hong
    if dk:
        dat += 1
        print("  ✓ " + ten)
    else:
        hong += 1
        print("  ✗ " + ten + (" — " + str(chi_tiet) if chi_tiet else ""))


print("1. Từ điển đọc ký hiệu Toán tiếng Việt tự nhiên (>= 12 ca)")
CA_DOC_TOAN = [
    ("Khoảng cách điểm-mặt d(M, (SBD))", "d(M, (SBD))", "khoảng cách từ điểm M đến mặt phẳng S B D"),
    ("Khoảng cách điểm-mặt d(A, (SBC))", "d(A, (SBC))", "khoảng cách từ điểm A đến mặt phẳng S B C"),
    ("Khoảng cách điểm-đường d(M, SB)", "d(M, SB)", "khoảng cách từ điểm M đến đường thẳng S B"),
    ("Phân số chứa căn LaTeX \\frac{a\\sqrt{6}}{3}", r"\frac{a\sqrt{6}}{3}", "a căn 6 trên 3"),
    ("Phân số chứa căn Unicode a√6/3", "a√6/3", "a căn 6 trên 3"),
    ("Phân số chứa căn hệ số \\dfrac{2a\\sqrt{3}}{3}", r"\dfrac{2a\sqrt{3}}{3}", "2 a căn 3 trên 3"),
    ("Quan hệ vuông góc \\perp", r"BD \perp (SAC)", "vuông góc với mặt phẳng S A C"),
    ("Quan hệ song song \\parallel", r"AB \parallel CD", "song song với"),
    ("Góc 3 đỉnh \\widehat{SCA}", r"\widehat{SCA}", "góc S C A"),
    ("Góc đường-mặt (SC, (ABCD))", "(SC, (ABCD))", "góc giữa đường thẳng S C và mặt phẳng A B C D"),
    ("Tam giác \\triangle ABC", r"\triangle ABC", "tam giác A B C"),
    ("Tổ hợp C_n^k", "C_n^k", "tổ hợp chập k của n"),
    ("Xác suất điều kiện P(A|B)", "P(A|B)", "xác suất của A với điều kiện B"),
    ("Biến cố đối \\overline{A}", r"\overline{A}", "biến cố đối A ngang"),
    ("So sánh nhỏ hơn hoặc bằng \\leq", r"x \leq 5", "nhỏ hơn hoặc bằng 5"),
    ("So sánh lớn hơn hoặc bằng \\geq", r"x \geq 0", "lớn hơn hoặc bằng"),
    ("So sánh khác \\neq", r"a \neq 0", "a khác"),
]

# Khóa trạng thái mặc định DOC_CHU_CAI = False khi kiểm chuỗi đọc tự nhiên
cb.DOC_CHU_CAI["bat"] = False
for ten, vao, mong in CA_DOC_TOAN:
    ra_td = td.doc_toan_tu_nhien(vao)
    ra_cb = cb.chuan_hoa_doc(vao)
    kiem(mong in ra_td and "\\" not in ra_td, f"tu_dien: {ten}", f"nhận='{ra_td}' | mong chứa='{mong}'")
    kiem(mong in ra_cb and "\\" not in ra_cb, f"chuan_hoa_doc: {ten}", f"nhận='{ra_cb}' | mong chứa='{mong}'")

# Ca ghép phức hợp: không bị hỏng tên mặt phẳng đứng trước dấu '='
cau_ghep = cb.chuan_hoa_doc(r"d(M, (SBD)) = \frac{a\sqrt{6}}{3}")
kiem(
    "khoảng cách từ điểm M đến mặt phẳng S B D bằng a căn 6 trên 3" == cau_ghep,
    "chuan_hoa_doc câu ghép khoảng cách + phân số căn không làm hỏng chữ 'D'",
    cau_ghep,
)

# Bảo toàn phụ đề hiển thị: hien_phu_de KHÔNG đổi ký hiệu sang lời TTS
for goc in ("d(M, (SBD))", "a√6/3", "P(A|B)"):
    pd = cb.hien_phu_de(goc)
    kiem("khoảng cách từ điểm" not in pd and "với điều kiện" not in pd and "trên" not in pd, f"phụ đề giữ nguyên ký hiệu: {goc}", pd)

# Giữ tương thích ngược các ca cũ (tổ hợp, phân số nguyên, hàm số)
kiem("40 phần 120" in cb.chuan_hoa_doc(r"P(\overline{A}) = 40/120"), "tương thích cũ: phân số nguyên 40/120 -> 40 phần 120")
kiem("vê phẩy ích bằng không" in cb.chuan_hoa_doc("V'(x) = 0"), "tương thích cũ: V'(x) = 0 -> vê phẩy ích bằng không")

print("\n2. Auto-ducking nhạc nền (-16 dB đến -18 dB dưới giọng đọc)")
kiem(-18.0 <= nhac.DUCKING_DB_MAC_DINH <= -16.0, f"mức ducking mặc định {nhac.DUCKING_DB_MAC_DINH} dB nằm trong [-18, -16] dB")

muc = nhac.tinh_muc_ducking(db_giong=-15.0, db_nhac=-12.0)
kiem(
    muc["duoi"] < muc["nghi"] and muc["duoi"] < muc["outro"] and -18.0 <= muc["duoiDb"] <= -16.0,
    "tinh_muc_ducking: có giọng thấp hơn khoảng nghỉ & Outro",
    muc,
)

# Kiểm chứng trực tiếp đường bao auto-ducking trên sóng tổng hợp 6 giây
sr = nhac.SR
t_song = np.arange(sr * 2) / float(sr)
nhac_mau = (0.5 * np.sin(2 * np.pi * 220 * t_song)).astype(np.float32)
du_duck = nhac.ap_ducking_nhac(nhac_mau, khoang_noi=[(0.8, 3.0)], tong_giay=6.0, sr=sr, outro_bat_dau=4.5)
rms_goc = float(np.sqrt(np.mean(nhac_mau ** 2)))
rms_noi = float(np.sqrt(np.mean(du_duck[int(1.4 * sr):int(2.8 * sr)] ** 2)))
rms_nghi = float(np.sqrt(np.mean(du_duck[int(3.8 * sr):int(4.4 * sr)] ** 2)))
rms_outro = float(np.sqrt(np.mean(du_duck[int(4.7 * sr):int(5.2 * sr)] ** 2)))
db_ha = 20.0 * np.log10((rms_noi + 1e-12) / (rms_goc + 1e-12))
kiem(-18.2 <= db_ha <= -15.8, f"đoạn có giọng đọc bị hạ {db_ha:.2f} dB (mục tiêu -16..-18 dB)")
kiem(rms_nghi > rms_noi * 1.4, f"khoảng nghỉ nhích lên rõ hơn đoạn nói ({rms_nghi:.4f} > {rms_noi:.4f})")
kiem(rms_outro > rms_noi * 1.35, f"Outro nhích lên rõ hơn đoạn nói ({rms_outro:.4f} > {rms_noi:.4f})")
kiem(np.isfinite(du_duck).all() and float(np.max(np.abs(du_duck))) <= 1.0, "âm thanh sau ducking sạch, không NaN, không vỡ tiếng")

print("\n3. Hậu kỳ ffmpeg loudnorm (-14 LUFS) & Fallback an toàn")
with tempfile.TemporaryDirectory() as tmp:
    # 3a. Video có audio thật (mức nhỏ -28 dB) -> loudnorm đẩy chuẩn lên gần -14 LUFS
    mp4_that = os.path.join(tmp, "co_audio.mp4")
    mp4_ra = os.path.join(tmp, "co_audio_lufs.mp4")
    r_mk = subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", "color=c=0x07142B:s=320x180:d=2.0:r=15",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=2.0",
            "-af", "volume=-28dB",
            "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            mp4_that,
        ],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    kiem(r_mk.returncode == 0 and os.path.isfile(mp4_that), "tạo MP4 mẫu có audio thật", r_mk.stderr[-160:])
    if os.path.isfile(mp4_that):
        kq_lufs = nhac.chuan_hoa_lufs_video(mp4_that, mp4_ra, gia_lap=False)
        kiem(kq_lufs["ok"] and kq_lufs["da_chuan_hoa"] and "I=-14:TP=-1.5:LRA=11" in kq_lufs["filter"], "chuan_hoa_lufs_video chuẩn hóa thành công", kq_lufs)
        vd = subprocess.run(
            ["ffmpeg", "-hide_banner", "-nostats", "-i", mp4_ra, "-af", "volumedetect", "-f", "null", "-"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf8", errors="replace",
        )
        m_db = re.search(r"mean_volume:\s*(-?[\d.]+)\s*dB", vd.stderr)
        db_sau = float(m_db.group(1)) if m_db else -99.0
        kiem(-20.0 <= db_sau <= -10.0, f"độ lớn sau loudnorm ổn định ở mức chuẩn ({db_sau:.1f} dB, từ -28 dB)", vd.stderr[-160:])

        # 3b. Chế độ --gia-lap -> fallback an toàn không lỗi
        mp4_gl = os.path.join(tmp, "gia_lap.mp4")
        kq_gl = nhac.chuan_hoa_lufs_video(mp4_that, mp4_gl, gia_lap=True)
        kiem(kq_gl["ok"] and not kq_gl["da_chuan_hoa"] and os.path.isfile(mp4_gl), "chế độ --gia-lap fallback an toàn", kq_gl)

    # 3c. Video KHÔNG có luồng audio -> fallback an toàn không crash
    mp4_cam = os.path.join(tmp, "khong_audio.mp4")
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", "color=c=0x07142B:s=320x180:d=1.0:r=15",
            "-an", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
            mp4_cam,
        ],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    kq_cam = nhac.chuan_hoa_lufs_video(mp4_cam, gia_lap=False)
    kiem(kq_cam["ok"] and not kq_cam["da_chuan_hoa"], "video không có audio fallback an toàn không crash", kq_cam)

# 3d. Kiểm tra tích hợp workflow dung-video.yml
wf_txt = open(os.path.join(GOC, ".github", "workflows", "dung-video.yml"), encoding="utf8").read()
kiem("nhac_nen_v98.py --chuan-hoa-lufs" in wf_txt, "dung-video.yml đã tích hợp bước hậu kỳ --chuan-hoa-lufs")

print(f"\nAUDIO MASTERING TEST: {dat} đạt, {hong} hỏng")
sys.exit(1 if hong else 0)
