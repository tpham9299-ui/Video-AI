#!/usr/bin/env python3
"""v97: test ĐỒNG BỘ GIỌNG NÓI <-> XOAY CAMERA (moc_xoay). python scripts/test_dong_bo_camera.py
- 100 % cú xoay khai báo đều có mặt trong props (không rơi), bắt đầu đúng mốc lời - 0,15 s (lệch <= 0,2 s), không xoay trước mốc;
- mốc lời đối chiếu độc lập trên chữ gốc của cảnh; không chồng giờ; xoay 0,9-1,2 s;
- lỗi cứng: thiếu cụm / cụm nằm ở cảnh trước / chỉ khớp 2 từ -> CAM_MAT_MOC (KHÔNG dời về đầu cảnh); hai cú quá sát -> CAM_DE_GIO;
- Auto-fix cụm con >= 3 từ giữ đúng vị trí giữa câu; chuanbi.py dừng (mã lỗi) khi có CAM_*."""
import json
import os
import subprocess
import sys
import tempfile

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(GOC, "scripts"))
from hinh_khong_gian.thoi_gian import lich_khong_gian, tok, phang_tu  # noqa: E402
from giai_hinh_khong_gian import giai  # noqa: E402

DAT, HONG = 0, []


def ok(dk, ten):
    global DAT
    if dk:
        DAT += 1
    else:
        HONG.append(ten)
        print("  ✗", ten)


ENV = dict(os.environ, PYTHONIOENCODING="utf-8")


def chay_chuanbi(kb_tep, ra):
    r = subprocess.run([sys.executable, os.path.join(GOC, "scripts", "chuanbi.py"), kb_tep, "--gia-lap", "--props-ra", ra], cwd=GOC,
                       capture_output=True, env=ENV)
    return r.returncode, r.stdout.decode("utf8", "replace") + r.stderr.decode("utf8", "replace")


for ten in ("giao_diem_mnp", "vuong_goc_sa"):
    tep = os.path.join(GOC, "mau", "v97", ten + ".json")
    kb = json.load(open(tep, encoding="utf8"))
    ra = os.path.join(tempfile.gettempdir(), "v97_%s_props.json" % ten)
    ma, log = chay_chuanbi(tep, ra)
    ok(ma == 0, "%s: chuanbi --gia-lap chạy sạch" % ten)
    if ma:
        print(log[-1500:])
        continue
    ok("câu cụt công thức" not in log and "đọc lặp đề" not in log, "%s: không cảnh báo câu cụt / đọc lặp (v96)" % ten)
    P = json.load(open(ra, encoding="utf8"))
    k4 = P.get("khung4tang") or {}
    kg = k4.get("khongGian")
    ok(P.get("boCuc") == "4tang" and kg, "%s: props.boCuc = 4tang + khongGian" % ten)
    ok(P.get("luong") == "hinh_hoc_thuan" and not k4.get("canh3dv") and not k4.get("sanKhau"), "%s: giữ khóa luồng, không khuôn 3D / sân khấu 2D" % ten)
    tong_gio = P["tongFrame"] / P["fps"]
    ok(50 <= tong_gio <= 68, "%s: dài %.1f s trong 50-68 s" % (ten, tong_gio))
    khai = [x for b in kb["hinh_khong_gian"]["buoc"] for x in b.get("xoay") or [] if x.get("moc_xoay")]
    xs = [x for x in kg["xoay"] if x["d"] > 0]
    ok(len(xs) == len(khai), "%s: 100 %% cú xoay có mặt (%d/%d)" % (ten, len(xs), len(khai)))
    ds, pv = phang_tu(P["canh"], P["fps"])
    for x, k in zip(xs, khai):
        b = next(bb for bb in kb["hinh_khong_gian"]["buoc"] if k in (bb.get("xoay") or []))
        lo, hi = pv[int(b["canh"])]
        can = tok(k["moc_xoay"])
        i = next((i for i in range(lo, hi - len(can) + 1) if [y[0] for y in ds[i:i + len(can)]] == can), None)
        ok(i is not None, "%s: '%s' có trong chữ gốc cảnh %s" % (ten, k["moc_xoay"], b["canh"]))
        if i is None:
            continue
        moc = ds[i][1]
        ok(abs(x["moc"] - moc) <= 0.2 and abs(x["t"] - (moc - 0.15)) <= 0.2, "%s: '%s' lệch %.3f s (<= 0,2)" % (ten, k["moc_xoay"], x["t"] - (moc - 0.15)))
        ok(x["t"] >= moc - 0.2, "%s: '%s' không xoay trước mốc lời" % (ten, k["moc_xoay"]))
        dau_canh = next(c["batDau"] / P["fps"] for c in P["canh"] if int(c["so"]) == int(b["canh"]))
        ok(i == lo or x["t"] > dau_canh + 0.3, "%s: '%s' không bị dời về đầu cảnh" % (ten, k["moc_xoay"]))
        ok(0.9 <= x["d"] <= 1.2, "%s: thời lượng xoay %.2f s trong 0,9-1,2" % (ten, x["d"]))
    ok(all(a["t"] + a["d"] <= b["t"] + 1e-6 for a, b in zip(xs, xs[1:])), "%s: không chồng giờ" % ten)
    if ten == "giao_diem_mnp":
        ok(kg.get("truotGio") and kg["truotGio"]["t"] + kg["truotGio"]["d"] <= 2.05, "điểm M trượt trong hook 2 s đầu")
        ok(any(h["loai"] == "bung_mat" for h in kg["hanhDong"]), "có hành động bung mặt (MNP)")
        ok(kg["hien"].get("K", 0) > 20 and kg["hien"].get("E", 0) > kg["hien"]["K"], "K, E hiện đúng lúc lời nhắc (sau đề)")
        bung = next(h for h in kg["hanhDong"] if h["loai"] == "bung_mat")
        ep = next(x for x in xs if x["goc_nhin"] == "ep_mep_mat")
        ok(bung["t"] < ep["t"], "bung mặt trước rồi mới ép mép (đúng thứ tự lời)")

# ---- đơn vị: lich_khong_gian với lời giả lập ----
G = giai(json.load(open(os.path.join(GOC, "mau", "v97", "giao_diem_mnp.json"), encoding="utf8")))
dung = G["dung"]


W = 0.33


def canh_gia(cau_list):
    """cảnh giả: mỗi từ 0,33 s."""
    ds, t = [], 0.0
    for so, cau in enumerate(cau_list, 1):
        w = cau.split()
        ds.append({"so": so, "batDau": int(round(t * 30)), "soFrame": int(round((len(w) * W + 0.5) * 30)),
                   "tu": [{"w": x, "bat": round(k * W, 3), "ket": round(k * W + 0.3, 3)} for k, x in enumerate(w)]})
        t += len(w) * W + 0.5
    return ds


C = canh_gia(["Đây là đề bài hình chóp S.ABCD rất quen thuộc với mọi người",
              "Ta có nhận xét quan trọng: trước hết xét mặt đáy (ABCD) rồi kéo dài NP cắt CD tại K"])
dau2 = C[1]["batDau"] / 30.0


def hk(xoay, canh=2):
    return {"buoc": [{"canh": 1, "xoay": [{"goc_nhin": "toan_canh"}]}, {"canh": canh, "xoay": xoay}]}


def chay(xoay):
    L, loi, tk = lich_khong_gian(hk(xoay), dung, C, 30, [0, 3.8], 12)
    return [y for y in L["xoay"] if y["d"] > 0], [e["ma"] for e in loi], tk


def canh_bao(tk):
    return [e["ma"] for e in tk.get("canh_bao") or []]


def du_phong(x):
    return [y for y in x if y.get("du_phong")]


x, loi, tk = chay([{"goc_nhin": "nhin_day", "moc_xoay": "xét mặt đáy ABCD"}])
ok(not loi and len(x) == 1, "cụm giữa câu (có ngoặc trong lời) khớp")
ok(x and abs(x[0]["moc"] - (dau2 + 8 * W)) < 1e-6, "mốc đúng từ 'xét' giữa câu (không phải đầu cảnh)")
ok(x and abs(x[0]["t"] - (x[0]["moc"] - 0.15)) < 1e-6, "bắt đầu xoay = mốc - 0,15 s")
x, loi, tk = chay([{"goc_nhin": "nhin_day", "moc_xoay": "nhìn từ phía dưới lên"}])
ok(not loi and canh_bao(tk) == ["CAM_MAT_MOC"] and len(du_phong(x)) == 1 and du_phong(x)[0]["goc_nhin"] == "toan_canh" and abs(du_phong(x)[0]["t"] - 3.8) < 1e-6,
   "v102.1 cụm không có trong lời -> cảnh báo CAM_MAT_MOC + rơi về toan_canh ở đầu bước (không chặn)")
x, loi, tk = chay([{"goc_nhin": "nhin_day", "moc_xoay": "hình chóp S.ABCD rất quen"}])
ok(not loi and canh_bao(tk) == ["CAM_MAT_MOC"] and len(du_phong(x)) == 1, "cụm chỉ có ở cảnh trước -> vẫn chỉ tìm tiến, rơi về toan_canh (cảnh báo)")
x, loi, tk = chay([{"goc_nhin": "nhin_day", "moc_xoay": "giờ hãy xét mặt đáy ABCD nào"}])
ok(not loi and tk["auto_fix"] == 1 and x and abs(x[0]["moc"] - (dau2 + 8 * W)) < 1e-6, "Auto-fix cụm con >= 3 từ giữ vị trí giữa câu")
x, loi, tk = chay([{"goc_nhin": "nhin_day", "moc_xoay": "mặt đáy"}])
ok(not loi, "cụm 2 từ khớp đúng nguyên văn vẫn nhận")
x, loi, tk = chay([{"goc_nhin": "nhin_day", "moc_xoay": "vậy mặt đáy kia"}])
ok(not loi and canh_bao(tk) == ["CAM_MAT_MOC"], "chỉ trùng 2 từ (không đủ cụm con 3 từ) -> cảnh báo CAM_MAT_MOC, góc dự phòng")
x, loi, tk = chay([{"goc_nhin": "nhin_day"}])
ok(not loi and canh_bao(tk) == ["CAM_MAT_MOC"] and du_phong(x), "cú xoay thiếu moc_xoay -> góc toan_canh dự phòng (cảnh báo)")
x, loi, tk = chay([{"goc_nhin": "nhin_day", "moc_xoay": "có nhận"}, {"goc_nhin": "ep_mep_mat", "doi_tuong": ["M", "N", "P"], "moc_xoay": "xét quan trọng"}])
ok(not loi and canh_bao(tk) == ["CAM_DE_GIO"] and len(x) == 1, "hai cú xoay cách 0,66 s -> bỏ cú sau, cảnh báo CAM_DE_GIO (không chặn)")
x, loi, tk = chay([{"goc_nhin": "nhin_day", "moc_xoay": "trước hết xét"}, {"goc_nhin": "ep_mep_mat", "doi_tuong": ["M", "N", "P"], "moc_xoay": "mặt đáy"}])
ok(not loi and len(x) == 2 and abs(x[0]["d"] - (x[1]["t"] - 0.05 - x[0]["t"])) < 1e-6 and 0.9 <= x[0]["d"] < 1.05,
   "hai cú cách 0,99 s: rút cú trước còn >= 0,9 s, không bỏ cú nào")
ok(tok("(SCD)") == tok("SCD") and tok("S.ABCD") == ["s", "abcd"], "chuẩn hóa chữ gốc bỏ ngoặc / dấu chấm")

# v102.1: chuanbi KHÔNG dừng khi CAM_MAT_MOC -> rơi về góc toan_canh, in cảnh báo
kb = json.load(open(os.path.join(GOC, "mau", "v97", "giao_diem_mnp.json"), encoding="utf8"))
kb["hinh_khong_gian"]["buoc"][2]["xoay"][0]["moc_xoay"] = "câu này không có trong lời"
tep = os.path.join(tempfile.gettempdir(), "v97_loi_moc.json")
json.dump(kb, open(tep, "w", encoding="utf8"), ensure_ascii=False)
ma, log = chay_chuanbi(tep, os.path.join(tempfile.gettempdir(), "v97_loi_moc_props.json"))
ok(ma == 0 and "CẢNH BÁO [CAM_MAT_MOC]" in log, "chuanbi.py dựng tiếp, chỉ cảnh báo CAM_MAT_MOC (hạ cánh mềm)")

print("test_dong_bo_camera: %d đạt, %d hỏng" % (DAT, len(HONG)))
sys.exit(1 if HONG else 0)
