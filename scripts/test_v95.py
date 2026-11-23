#!/usr/bin/env python3
"""v95 — kiểm thử nhanh (không gọi API, không render):
  1. Bộ phiên âm Toán -> tiếng Việt trước TTS (V(x), V'(x), f(x), S(x), V_max, cm³, nhân ngầm, cộng/trừ, π).
  2. Thẻ khung 4 tầng: thứ tự theo lời đọc, thẻ lặp ở ranh giới giữ ở bước sau, sắp logic khi không có khi_noi.
  3. CTA theo ngữ nghĩa lời đọc, ô ghim '?' đổi đúng đại lượng, tiêu đề intro bài hộp, tóm tắt đủ 3 dòng, badge.
  4. Hai bài mẫu (hộp 16×10 không ngưỡng, lon S ≤ 400) chạy chuanbi.py --gia-lap: tổng 55-70 s, Outro bật đúng đầu cảnh
     kết (cùng giọng, dư ~1 s), đối chiếu chốt theo mốc giải, badge đúng loại, thẻ chốt, phụ đề bật, nhạc lo-fi.
  5. Nhạc lo-fi 112 BPM: đúng độ dài 16 ô nhịp, lặp liền mạch, dịu tai (ít năng lượng dải cao).
Chạy: python scripts/test_v95.py   (cần đã chạy: node scripts/test_v95_gs.cjs -> out/v95/*/kb_sua.json)
"""
import json
import os
import subprocess
import sys
import wave

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(GOC, "scripts"))
import chuanbi as cb  # noqa: E402
import khung4tang_v95 as v95  # noqa: E402

DAT, LOI = 0, 0


def kiem(dk, ten, chi_tiet=""):
    global DAT, LOI
    if dk:
        DAT += 1
        print("  ✓", ten)
    else:
        LOI += 1
        print("  ✗", ten, "—", chi_tiet)


print("1. Phiên âm Toán -> tiếng Việt (TTS)")
BANG = [
    ("V(x) = x(16 - 2x)(10 - 2x)", "vê ích bằng ích nhân 16 trừ 2 ích nhân 10 trừ 2 ích"),
    ("V'(x) = 0", "vê phẩy ích bằng không"),
    ("f(x) = 3x - 5", "ép ích bằng 3 ích trừ 5"),
    ("f'(x) đổi dấu", "ép phẩy ích đổi dấu"),
    ("S(x) = 2x^2 + 4x", "ét ích bằng 2 ích bình phương cộng 4 ích"),
    ("$V_{\\max} = 144$ cm³", "vê mắc bằng 144 xăng-ti-mét khối"),
    ("V_max = 144 cm^3", "vê mắc bằng 144 xăng-ti-mét khối"),
    ("Vmax đạt khi x = 2", "vê mắc đạt khi ích bằng 2"),
    ("S_min = 354", "ét min bằng 354"),
    ("Chiều dài đáy 16 − 2x", "Chiều dài đáy 16 trừ 2 ích"),
    ("S = 2πr^2 + 2πrh", "ét bằng 2 pi rờ bình phương cộng 2 pi rờ hát"),
    ("V = 144 cm³", "vê bằng 144 xăng-ti-mét khối"),
    ("cạnh x xăng-ti-mét", "cạnh ích xăng-ti-mét"),
]
for vao, mong in BANG:
    ra = cb.chuan_hoa_doc(vao)
    kiem(mong in ra, "%s -> %s" % (vao, mong), ra)
for vao, cam in [("Ta có V(x) = ...", "vế"), ("hàm V(x)", "vờ ích"), ("V'(x) = 0", "V(")]:
    kiem(cam not in cb.chuan_hoa_doc(vao), "%s: không còn '%s'" % (vao, cam), cb.chuan_hoa_doc(vao))
kiem("xăng-ti-mét" in cb.chuan_hoa_doc("dài 5 cm"), "gạch nối 'xăng-ti-mét' không bị đọc thành 'trừ'")

print("2. Thẻ khung 4 tầng")
the = v95.chuan_the_cac_buoc([
    [{"loai": "chu", "noi_dung": "Đề"}, {"loai": "cong_thuc", "dong": ["V'(x) = 12x^2 - 104x + 160"]}],
    [{"loai": "cong_thuc", "dong": ["V'(x) = 12x^2-104x+160"]}, {"loai": "cong_thuc", "dong": ["x = 2"]}],
])
kiem(len(the[0]) == 1 and len(the[1]) == 2, "thẻ lặp ở ranh giới: giữ ở bước sau, bỏ ở bước trước", json.dumps(the, ensure_ascii=False))
logic = v95.sap_the_logic([{"nhan": "Hàm thể tích"}, {"nhan": "Đặt ẩn"}, {"nhan": "Kết luận thể tích max"}, {"nhan": "Đạo hàm"}])
kiem([x["nhan"] for x in logic] == ["Đặt ẩn", "Hàm thể tích", "Đạo hàm", "Kết luận thể tích max"], "không có khi_noi: sắp đặt ẩn -> hàm -> đạo hàm -> kết luận",
     [x["nhan"] for x in logic])

print("3. CTA / ô ghim / tiêu đề / tóm tắt / badge")
for loi, nhan in [("Đăng ký kênh để học mẹo mới nhé!", "ĐĂNG KÝ KÊNH!"), ("Nhớ lưu lại để ôn nhé", "LƯU LẠI NGAY!"),
                  ("Bình luận đáp án nhé", "BÌNH LUẬN NGAY!"), ("Lưu ý x > 0. Theo dõi kênh nhé", "THEO DÕI KÊNH!"), ("Giải thích xong.", "LƯU LẠI NGAY!")]:
    kiem(v95.cta_tu_loi(loi) == nhan, "CTA '%s' -> %s" % (loi, nhan), v95.cta_tu_loi(loi))
dg = v95.de_ghim_doi([{"id": "x", "nhan": "x = ?"}, {"id": "V", "nhan": "V_{max} = ?"}, {"id": "a", "nhan": "16 \\times 10"}],
                     "x = 2 cm, V lớn nhất = 144 cm³", 41.5, {"x": 37.0})
kiem(dg[0]["doi"]["nhan"].startswith("x = 2") and dg[0]["doi"]["t"] == 37.0, "ô 'x = ?' -> x = 2 cm lúc đồ thị chốt nghiệm", dg[0])
kiem("144" in dg[1]["doi"]["nhan"] and "cm}^3" in dg[1]["doi"]["nhan"] and dg[1]["doi"]["t"] == 41.5, "ô 'V_max = ?' -> 144 cm³ lúc thẻ đáp số", dg[1])
kiem("doi" not in dg[2], "ô không có '?' giữ nguyên")
kiem(v95.de_ghim_doi([{"id": "P", "nhan": "P = ?"}], "x = 2", 3)[0].get("doi") is None, "không xác định được đại lượng -> KHÔNG ghi nhầm số")
kb_hop = {"de_bai": "cắt bỏ ở bốn góc bốn hình vuông", "khung4tang": {"canh_3d_vector": {"khuon": "tam_bia_gap_hop"}}}
kiem(v95.tieu_de_intro_dung(kb_hop, "CẮT GÓC NÀO ĐỂ HỘP LỚN NHẤT?") == "CẮT CẠNH BAO NHIÊU ĐỂ HỘP LỚN NHẤT?", "tiêu đề intro bài hộp sửa đúng nghĩa")
kiem(v95.tieu_de_intro_dung(kb_hop, "LON NƯỚC TỐN ÍT NHÔM NHẤT") == "LON NƯỚC TỐN ÍT NHÔM NHẤT", "tiêu đề đúng giữ nguyên")
kiem(v95.kieu_badge({"kieu": "max"}) == "cuc_dai" and v95.kieu_badge({"kieu": "min"}) == "cuc_tieu" and v95.kieu_badge({"nguong": {"gia_tri": 1}}) == "nguong",
     "badge: ★ CỰC ĐẠI / ★ CỰC TIỂU khi không ngưỡng, ✓/✕ khi có ngưỡng")
import khung4tang_v93 as v93  # noqa: E402
tt = v93.tom_tat({"tom_tat_3_buoc": [{"chien_thuat": "Lập hàm thể tích", "cong_thuc": "V = x(16-2x)(10-2x)"}]},
                 [{"nhan": "Đề bài", "the": []}, {"nhan": "Lập hàm", "the": []}, {"nhan": "Đạo hàm", "the": [{"loai": "cong_thuc", "dong": ["V' = 0"]}]}, {"nhan": "Kết luận", "the": []}])
kiem(len(tt) == 3 and "Lập hàm" not in [d["chien_thuat"] for d in tt[1:]], "tóm tắt luôn 3 dòng, không trùng nghĩa ('Lập hàm' ~ 'Lập hàm thể tích')", tt)

print("4. Hai bài mẫu qua chuanbi.py --gia-lap")
moi_truong = dict(os.environ, PYTHONIOENCODING="utf-8")
for ten, nguong in (("hop", False), ("lon", True)):
    kb_p = os.path.join(GOC, "out", "v95", ten, "kb_sua.json")
    if not os.path.exists(kb_p):
        kiem(False, ten + ": thiếu out/v95/%s/kb_sua.json (chạy node scripts/test_v95_gs.cjs trước)" % ten)
        continue
    props_p = os.path.join(GOC, "out", "v95", ten, "props.json")
    kq = subprocess.run([sys.executable, os.path.join(GOC, "scripts", "chuanbi.py"), kb_p, "--gia-lap", "--props-ra", props_p],
                        capture_output=True, text=True, encoding="utf8", errors="replace", env=moi_truong, cwd=GOC)
    if kq.returncode != 0:
        kiem(False, ten + ": chuanbi.py chạy lỗi", kq.stderr[-400:])
        continue
    p = json.load(open(props_p, encoding="utf8"))
    k = p["khung4tang"]
    tong = p["tongFrame"] / 30.0
    kiem(55 <= tong <= 70, "%s: tổng thời lượng %.1f s trong 55-70 s" % (ten, tong))
    o = p["outro"]
    c_ket = next(c for c in p["canh"] if c["batDau"] == o["batDau"])
    kiem(o.get("giongCung") and cb.LOAI_OUTRO_4TANG.search(c_ket["loai"]) and not cb.LOAI_CHOT_4TANG.search(c_ket["loai"]),
         "%s: Outro bật NGAY đầu cảnh '%s' (cùng giọng tóm tắt/CTA)" % (ten, c_ket["loai"]))
    du = (o["batDau"] + o["soFrame"]) / 30.0 - cb.het_giong_canh(p["canh"][-1], 30)
    kiem(0.8 <= du <= 1.25 or o["soFrame"] == round(3.5 * 30), "%s: chỉ dư %.2f s đuôi nhạc sau câu cuối" % (ten, du))
    kiem(p["nhac"] in ("nhac/lofi.wav", "nhac/v98_marimba_tech.wav"), "%s: nhạc nền tự tổng hợp (v98: marimba_tech cho khuôn 3D thực tế)" % ten, p["nhac"])
    kiem(k["boCuc"]["phuDe"] == "gon", "%s: phụ đề gọn 1 dòng mặc định bật" % ten)
    kiem(len(k["tomTat"]) == 3, "%s: Outro đủ 3 dòng tóm tắt" % ten)
    kiem(k.get("cta") in [x[1] for x in v95.CTA_NGHIA], "%s: nhãn CTA ngữ nghĩa '%s'" % (ten, k.get("cta")))
    dcs = [b for b in k["buoc"] if b.get("doi_chieu")]
    kiem(len(dcs) == 1, "%s: có đúng 1 bước đối chiếu" % ten)
    if dcs:
        dc, b = dcs[0]["doi_chieu"], dcs[0]
        kiem(dc.get("t_giai", 0) >= b["t"] + 2.4, "%s: đồ thị chốt cực trị theo mốc giải (t_giai %.1f s, bước bắt đầu %.1f s)" % (ten, dc.get("t_giai", 0), b["t"]))
        kiem(dc.get("badge") == ("nguong" if nguong else "cuc_dai"), "%s: badge %s" % (ten, dc.get("badge")))
    chot = [th for th in k["buoc"][-1]["the"] if th.get("chot")]
    kiem(len(chot) == 1, "%s: đúng 1 thẻ chốt đáp án nổi bật" % ten)
    for b in k["buoc"]:
        ts = [th["t"] for th in b["the"]]
        if ts != sorted(ts) or any(t < b["t"] for t in ts):
            kiem(False, "%s: thẻ bước '%s' không tăng dần / trước mốc bước" % (ten, b["nhan"]), ts)
            break
    else:
        kiem(True, "%s: thẻ mọi bước hiện tăng dần, không trước mốc bước" % ten)
    if ten == "hop":
        nh = [th.get("nhan") for th in k["buoc"][1]["the"]]
        kiem(nh == ["Đặt ẩn", "Kích thước đáy", "Hàm thể tích"], "hop: bước 2 đúng thứ tự Đặt ẩn -> Kích thước -> Hàm", nh)
        doi = {d["id"]: d.get("doi") for d in k["deGhim"]}
        kiem(doi.get("V") and "144" in doi["V"]["nhan"], "hop: thanh đáy đổi V_max = ? -> 144 cm³", doi.get("V"))
        pha = {x.get("ten"): x.get("t") for x in k["canh3dv"]["pha"]}
        kiem(all(pha.get(n) is not None for n in ("to_goc", "gap", "nhan_canh")), "hop: pha 3D cắt góc / gập / nhãn cạnh khớp lời đọc", pha)
        kiem(k["mocCau"]["tieu_de"] == "CẮT CẠNH BAO NHIÊU ĐỂ HỘP LỚN NHẤT?", "hop: tiêu đề intro đúng nghĩa", k["mocCau"]["tieu_de"])

print("5. Nhạc lo-fi")
tep = os.path.join(GOC, "public", "nhac", "lofi.wav")
if not os.path.exists(tep):
    import taoAmThanh
    taoAmThanh.luu(tep, taoAmThanh.nhac_lofi())
with wave.open(tep) as w:
    n, sr = w.getnframes(), w.getframerate()
    import numpy as np
    x = np.frombuffer(w.readframes(n), "<i2").astype(float) / 32767
kiem(abs(n / sr - 16 * 4 * 60 / 112) < 0.01, "16 ô nhịp 112 BPM = %.2f s" % (n / sr))
pho = np.abs(np.fft.rfft(x))
tan = np.fft.rfftfreq(len(x), 1 / sr)
kiem(pho[tan > 4000].sum() / pho.sum() < 0.12, "dịu tai: năng lượng > 4 kHz < 12 %% (%.3f)" % (pho[tan > 4000].sum() / pho.sum()))
kiem(abs(x[-1] - x[0]) < 0.25, "điểm nối vòng lặp liền (|cuối - đầu| = %.3f)" % abs(x[-1] - x[0]))

print("\n%d đạt, %d lỗi" % (DAT, LOI))
sys.exit(1 if LOI else 0)
