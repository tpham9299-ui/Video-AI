#!/usr/bin/env python3
"""Kiểm thử nhanh v94: bộ giải tọa độ, tối ưu bố cục, kiểm chứng mệnh đề, khóa GDPT 2018 (không gọi API, không Manim).
    python scripts/test_giai_hinh_phang.py
"""
import copy
import json
import os
import subprocess
import sys

GOC = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, GOC)

from giai_hinh_phang import giai  # noqa: E402
from hinh_phang import bo_cuc, gdpt2018, hinh, kiem_chung  # noqa: E402

MAU = os.path.join(GOC, "..", "mau", "hinh_phang", "am_vuong_de.json")
KB0 = json.load(open(MAU, encoding="utf8"))
DAT, HONG = 0, []


def kiem(ten, dk):
    global DAT
    if dk:
        DAT += 1
        print("  ✓", ten)
    else:
        HONG.append(ten)
        print("  ✗", ten)


def kb_moi():
    return copy.deepcopy(KB0)


def ma_loi(kq):
    return [x["ma"] for x in kq["loi"]]


def them_dong(kb, tex, trang=0, **kw):
    kb["hinh_phang_chuan"]["trang_chung_minh"][trang]["dong"].append(dict({"khi_noi": "x", "tex": tex}, **kw))
    return kb


print("1. Bài nghiệm thu AM ⊥ DE")
kq = giai(kb_moi())
kiem("đạt, không lỗi cứng", kq["dat"] and not kq["loi"])
kiem(">= 40 cấu hình hợp lệ", kq["so_mau"] >= 40)
kiem("mọi mệnh đề đạt trên mọi cấu hình", all(m["dat"] and m["sai_o"] == 0 for m in kq["menh_de"]) and len(kq["menh_de"]) >= 15)
kiem("cấp lớp lop_9 + header TOÁN 9", kq["cap_lop"] == "lop_9" and kq["header"]["nhan_lop"] == "TOÁN 9")
P = kq["diem"]
L = lambda a, b: hinh.kc(P[a], P[b])
kiem("AB < AC rõ ràng", L("A", "B") * 1.08 < L("A", "C"))
goc = sorted(kq["tham"]["d1"]["goc"])
kiem("tam giác nhọn, không gần cân", max(goc) < 88 and min(goc[1] - goc[0], goc[2] - goc[1]) >= 7)
kiem("AM ⊥ DE trên tọa độ đã co khung", abs(hinh.cham(hinh.tru(P["M"], P["A"]), hinh.tru(P["E"], P["D"]))) < 1e-3)

print("2. Auto-Fit + Auto-Layout")
bc = kq["bo_cuc"]
v = bo_cuc.VUNG_HINH
kiem("lấp 82% vùng hình", abs(bc["ty_le_lap"] - 0.82) < 0.005)
x0, y0, x1, y1 = bc["hop"]
kiem("hộp bao nằm trong vùng sân khấu nửa trên", x0 >= v["x0"] and x1 <= v["x1"] and y0 >= v["y0"] and y1 <= v["y1"])
kiem("điểm gần nhất cách >= 0,45 đơn vị", bc["min_kc_don_vi"] >= 0.45)
mau = bo_cuc.lay_mau(KB0["hinh_phang_chuan"]["phep_dung"], KB0["hinh_phang_chuan"]["dieu_kien"], hat=7)
diem = sorted(bo_cuc.cham_diem(H)[1]["min_kc"] for _, H in mau)
kq7 = giai(kb_moi(), hat=7)
kiem("cấu hình chọn có khoảng cách nhỏ nhất >= trung vị các mẫu", kq7["bo_cuc"]["min_kc"] >= diem[len(diem) // 2])
kiem("cùng hạt giống -> cùng tọa độ (tái lập)", giai(kb_moi(), hat=7)["diem"] == kq7["diem"])

print("3. Nhãn (danh sách trắng + chống đè)")
kiem("đủ nhãn A B C D E M O I", set(kq["nhan"]) == set("ABCDEMOI"))
kb = kb_moi()
kb["hinh_phang_chuan"]["phep_dung"].append({"id": "d7", "loai": "trung_diem", "ten": "K", "doan": "BC", "an_nhan": True})
kq_k = giai(kb)
kiem("điểm phụ K ẩn nhãn", "K" in kq_k["diem_an"] and "K" not in kq_k["nhan"])
kb = kb_moi()
kb["hinh_phang_chuan"]["phep_dung"].append({"id": "d7", "loai": "trung_diem", "ten": "N", "doan": "BC"})
kiem("điểm không nhắc trong đề/lời giải -> ẩn", "N" in giai(kb)["diem_an"])
hop = {t: bo_cuc._hop_nhan(c, t) for t, c in kq["nhan"].items()}
kiem("không có 2 nhãn chồng nhau", all(bo_cuc._chong(hop[a], hop[b]) < 1e-9 for a in hop for b in hop if a < b))
ve = [(n["a"], n["b"]) for n in kq["net"] if n["loai"] in ("doan", "keo")]
gan = min(bo_cuc._kc_doan(kq["nhan"][t], P[a], P[b]) for t in kq["nhan"] for a, b in ve if t not in (a, b))
kiem("nhãn cách nét không liên quan >= 0,2 (%.2f)" % gan, gan >= 0.2)
kiem("không báo va chạm nhãn", bc["va_cham_nhan"] == 0)

print("4. Edge Auto-Sync + khóa màu + chia trang")
bs = [tuple(sorted(x)) for t in kq["trang"] for d in t["dong"] for x in d.get("bo_sung") or []]
kiem("tự bổ sung cạnh CM (quên khai báo) đúng dòng nhắc tới", ("C", "M") in bs and kq["trang"][2]["dong"][0]["bo_sung"])
kb = kb_moi()
kb["hinh_phang_chuan"]["trang_chung_minh"][1]["dong"][0]["hanh_dong_hinh"][0]["mau"] = "la"
kq_m = giai(kb)
kiem("màu hình lệch chữ -> theo chữ (cam)", kq_m["trang"][1]["dong"][0]["hanh_dong_hinh"][0]["mau"] == "cam" and any(x["ma"] == "HP_MAU_LECH" for x in kq_m["sua"]))
kiem("đối tượng tô màu trong chữ tự có hành động trên hình", any(h.get("tu_dong") and h["loai"] == "nhan_manh_doan" for h in kq["trang"][0]["dong"][1]["hanh_dong_hinh"]))
kb = kb_moi()
for _ in range(5):
    them_dong(kb, "\\angle BEC = 90^\\circ")
kq_t = giai(kb)
kiem("trang 7 dòng tự chia thành 2 trang", len(kq_t["trang"]) == 6 and any(x["ma"] == "HP_TRANG_QUA_DAI" for x in kq_t["canh_bao"]))

print("5. Kiểm chứng mệnh đề bằng tọa độ")
kb = kb_moi()
kb["hinh_phang_chuan"]["trang_chung_minh"][3]["dong"][2]["menh_de"][0]["tg2"] = "AMC"
kb["hinh_phang_chuan"]["trang_chung_minh"][3]["dong"][2]["tex"] = "\\Rightarrow \\mvang{\\triangle AID} \\sim \\mla{\\triangle AMC}"
kq_d = giai(kb)
loi_dd = [x for x in kq_d["loi"] if x["ma"] == "HP_DONG_DANG_SAI_THU_TU"]
kiem("△AID ∼ △AMC -> HP_DONG_DANG_SAI_THU_TU, gợi ý △ACM", loi_dd and "ACM" in loi_dd[0]["goi_y"])
kq_s = giai(them_dong(kb_moi(), "AM \\perp BC"))
kiem("AM ⊥ BC (sai) -> HP_MENH_DE_SAI", "HP_MENH_DE_SAI" in ma_loi(kq_s))
kq_s = giai(them_dong(kb_moi(), "\\angle ABC = 60^\\circ"))
kiem("∠ABC = 60° (chỉ là số đo tình cờ) -> sai trên cấu hình khác", "HP_MENH_DE_SAI" in ma_loi(kq_s))
kq_s = giai(them_dong(kb_moi(), "AE \\cdot AB = AD \\cdot AC"))
kiem("AE·AB = AD·AC (đúng) đạt", kq_s["dat"])
kq_s = giai(them_dong(kb_moi(), "AE \\cdot AC = AD \\cdot AB"))
kiem("AE·AC = AD·AB (sai) bị bắt", "HP_MENH_DE_SAI" in ma_loi(kq_s))
kq_s = giai(them_dong(kb_moi(), "\\mvang{\\angle AKD} = 90^\\circ"))
kiem("điểm K không có trong phép dựng -> HP_DIEM_KHONG_TON_TAI", "HP_DIEM_KHONG_TON_TAI" in ma_loi(kq_s))
kq_s = giai(them_dong(kb_moi(), "x", menh_de=[{"loai": "song_song", "a": "DE", "b": "BC"}]))
kiem("DE // BC (khai báo, sai) bị bắt", "HP_MENH_DE_SAI" in ma_loi(kq_s))
kb = kb_moi()
kb["hinh_phang_chuan"]["muc_tieu"]["menh_de"] = {"loai": "vuong_goc", "a": "AM", "b": "BC"}
kiem("mục tiêu sai bị bắt", "HP_MENH_DE_SAI" in ma_loi(giai(kb)))
kiem("mệnh đề có kiem:false bị bỏ qua", giai(them_dong(kb_moi(), "AM \\perp BC", kiem=False))["dat"])

print("6. Tam giác vuông có số đo (tỉ lệ thật)")
kb_v = {"id": "v", "lop": "9", "hinh_phang_chuan": {"cap_lop": "lop_9", "dieu_kien": [
    {"loai": "tam_giac_vuong", "tg": "ABC", "tai": "A"}, {"loai": "do_dai", "doan": "AB", "gia_tri": 3}, {"loai": "do_dai", "doan": "AC", "gia_tri": 4}],
    "phep_dung": [{"id": "d1", "loai": "tam_giac", "dinh": ["A", "B", "C"]}, {"id": "d2", "loai": "chan_duong_cao", "ten": "H", "tu": "A", "xuong": "BC"}],
    "trang_chung_minh": [{"tieu_de": "t", "dong": [{"khi_noi": "x", "tex": "BC = 5"}, {"khi_noi": "y", "tex": "AH = \\frac{12}{5}"}]}]}}
kiem("BC = 5, AH = 12/5 đạt (đúng tỉ lệ thật)", giai(kb_v)["dat"])
kb_v["hinh_phang_chuan"]["trang_chung_minh"][0]["dong"][0]["tex"] = "BC = 6"
kiem("BC = 6 bị bắt", "HP_MENH_DE_SAI" in ma_loi(giai(kb_v)))

print("7. Phép dựng lỗi")
kb = kb_moi()
kb["hinh_phang_chuan"]["phep_dung"].append({"id": "d9", "loai": "giao_diem", "ten": "Z", "a": "BC", "b": "BC"})
kiem("giao 2 đường trùng/song song -> HP_DUNG_LOI", "HP_DUNG_LOI" in ma_loi(giai(kb)))
kb = kb_moi()
kb["hinh_phang_chuan"]["phep_dung"].insert(1, {"id": "d0", "loai": "trung_diem", "ten": "N", "doan": "DE"})
kiem("dùng điểm trước khi dựng -> HP_DIEM_KHONG_TON_TAI", "HP_DIEM_KHONG_TON_TAI" in ma_loi(giai(kb)))
kiem("hình học cơ sở: chân đường cao", hinh.chan_vuong_goc((0, 2), (-1, 0), (3, 0))[0] == (0.0, 0.0))
kiem("hình học cơ sở: tâm ngoại tiếp", all(abs(x) < 1e-12 for x in hinh.tam_ngoai_tiep((1, 0), (-1, 0), (0, 1))))

print("8. Khóa GDPT 2018")
def gd(cap, chu):
    c, w = gdpt2018.kiem_gdpt({"canh": [{"so": 1, "loi_thoai": chu}]}, cap)
    return [x["ma"] for x in c], [x["ma"] for x in w], c
c, w, ds = gd("lop_9", "Vì E, D cùng nhìn BC dưới một góc vuông nên BEDC nội tiếp.")
kiem("lớp 9: 'cùng nhìn BC dưới góc' -> lỗi cứng + gợi ý cạnh huyền BC", "CUNG_NHIN_CANH" in c and "cạnh huyền BC" in ds[0]["goi_y"])
c, w, _ = gd("lop_9", "Theo quỹ tích cung chứa góc, điểm I chạy trên cung.")
kiem("lớp 9: 'cung chứa góc' -> lỗi cứng", "CUNG_CHUA_GOC" in c)
c, w, _ = gd("lop_9", "Tứ giác có hai đỉnh kề cùng nhìn cạnh nối hai đỉnh còn lại.")
kiem("lớp 9: 'hai đỉnh kề cùng nhìn' -> lỗi cứng", "HAI_DINH_KE" in c)
c, w, _ = gd("lop_9", "Ta có sin B bằng AC trên BC, tan C, cos 30 độ; \\sin B = \\frac{AC}{BC}, \\cos C = \\frac{AC}{BC}")
kiem("lớp 9: tỉ số lượng giác sin/cos/tan KHÔNG bị chặn oan", not c and not w)
c, w, _ = gd("lop_9", "Áp dụng định lý cosin trong tam giác ABC.")
kiem("lớp 9: 'định lý cosin' -> lỗi cứng", "DINH_LY_COS" in c)
c, w, _ = gd("lop_9", "a^2 = b^2 + c^2 - 2bc\\cos A")
kiem("lớp 9: công thức cosin -> lỗi cứng", "DINH_LY_COS" in c)
c, w, _ = gd("lop_9", "Theo định lí sin, \\frac{BC}{\\sin A} = 2R")
kiem("lớp 9: định lí sin -> lỗi cứng", "DINH_LY_SIN" in c)
c, w, _ = gd("lop_9", "Xét tích vô hướng của hai véc tơ AM và DE.")
kiem("lớp 9: vectơ / tích vô hướng -> lỗi cứng", "VECTO" in c)
c, w, _ = gd("thpt", "Theo định lý sin và tích vô hướng vectơ.")
kiem("THPT: định lý sin, vectơ được phép", not c)
c, w, _ = gd("lop_8", "Góc nội tiếp chắn nửa đường tròn, \\sin B")
kiem("lớp 8: góc nội tiếp, sin -> lỗi cứng", "LOP8_DUONG_TRON" in c)
c, w, _ = gd("lop_9", "Góc tạo bởi tia tiếp tuyến và dây cung bằng nửa số đo cung.")
kiem("lớp 9: ⚠ góc tạo bởi tiếp tuyến và dây -> chỉ cảnh báo", not c and "GOC_TIEP_TUYEN_DAY" in w)
c, w, _ = gd("lop_9", "Theo phương tích của điểm A.")
kiem("lớp 9: phương tích -> lỗi cứng có gợi ý đồng dạng", "PHUONG_TICH" in c)
c, w, _ = gd("lop_9", "Nhìn hình, tam giác BEC đang tô màu, cùng nhìn vào đường tròn nhé.")
kiem("lời giảng 'nhìn hình / cùng nhìn vào' không bị chặn oan", not c)
kb = kb_moi()
kb["hinh_phang_chuan"]["trang_chung_minh"][0]["dong"][1]["tex"] = "\\Rightarrow \\mngoc{BEDC} \\text{ nội tiếp (cung chứa góc)}"
kq_g = giai(kb)
loi_g = [x for x in kq_g["loi"] if x["ma"] == "HP_VUOT_CHUONG_TRINH"]
kiem("bộ giải trả HP_VUOT_CHUONG_TRINH kèm gợi ý thay thế", loi_g and "180°" in loi_g[0]["goi_y"])
kb = kb_moi()
kb["hinh_phang_chuan"]["trang_chung_minh"][0]["dong"] = [{"khi_noi": "x", "tex": "BEDC \\text{ là tứ giác nội tiếp}"}]
kb["hinh_phang_chuan"]["trang_chung_minh"][0]["tieu_de"] = "Tứ giác"
kiem("tứ giác nội tiếp không nêu căn cứ -> cảnh báo", any("NOI_TIEP_THIEU_CAN_CU" in x["chi_tiet"] or x["ma"] == "HP_CHUONG_TRINH_CANH_BAO" for x in giai(kb)["canh_bao"]))
kiem("cấp lớp suy từ kb.lop", gdpt2018.chuan_cap_lop("", "8") == "lop_8" and gdpt2018.chuan_cap_lop(None, "11") == "thpt" and gdpt2018.chuan_cap_lop("lop_9") == "lop_9")

print("9. Cửa vào dòng lệnh (BP2 kiểm nhanh qua stdin)")
lenh_kiem = [sys.executable, os.path.join(GOC, "giai_hinh_phang.py"), "-", "--chi-kiem"]
r = subprocess.run(lenh_kiem, input=json.dumps(KB0).encode("utf8"), capture_output=True)
kiem("--chi-kiem - : mã 0 + JSON dat=true", r.returncode == 0 and json.loads(r.stdout.decode("utf8"))["dat"] is True)
r = subprocess.run(lenh_kiem, input=json.dumps(them_dong(kb_moi(), "AM \\perp BC")).encode("utf8"), capture_output=True)
kiem("--chi-kiem - : lỗi -> mã 2", r.returncode == 2 and json.loads(r.stdout.decode("utf8"))["loi"])

kb = kb_moi()
pd = kb["hinh_phang_chuan"]["phep_dung"]
pd[0] = {"id": "d1", "loai": "duong_tron", "tam": "O"}
pd[1] = {"id": "d2", "loai": "chan_duong_cao", "ten": "H", "tu": "A", "xuong": "BC"}
r = subprocess.run(lenh_kiem, input=json.dumps(kb).encode("utf8"), capture_output=True)
loi_d2 = "phép dựng 2/d2: điểm A chưa được dựng trước bước này"
kiem("bước 1 chỉ dựng (O), bước 2 dùng A -> BP2 nhận mã 2 và HP_DIEM_KHONG_TON_TAI",
     r.returncode == 2 and not r.stderr and json.loads(r.stdout)["dat"] is False
     and any(x["ma"] == "HP_DIEM_KHONG_TON_TAI" and x["chi_tiet"] == loi_d2 for x in json.loads(r.stdout)["loi"]))
kb = kb_moi()
dinh = kb["hinh_phang_chuan"]["phep_dung"][0]
dinh["dinh"] = "ABC"
kiem("dinh dạng chuỗi vẫn nạp cùng bộ đỉnh với mảng", giai(kb)["diem"] == P)
del dinh["dinh"]
G = giai(kb, chi_kiem=True)
kiem("tam giác bước 1 thiếu trường dinh -> lỗi cứng", not G["dat"] and "HP_DUNG_LOI" in ma_loi(G))

print("9b. Phiên 1/3: thiếu đỉnh gốc A ở bước 1 + đặc tả rác không crash + cửa chặn trước TTS")
kb = kb_moi()
pd = kb["hinh_phang_chuan"]["phep_dung"]
pd[0] = {k: v for k, v in pd[0].items() if k != "loai"}   # bước 1 mất "loai" -> đỉnh A, B, C không được nạp
G = giai(kb, chi_kiem=True)
kiem("bước 1 thiếu loai (A chưa nạp) -> lỗi cứng, không crash", not G["dat"] and bool(set(ma_loi(G)) & {"HP_DUNG_LOI", "HP_DIEM_KHONG_TON_TAI"}))
for rac in ({"phep_dung": [{"id": "d1", "loai": "tam_giac", "dinh": 123}]},
            {"phep_dung": [{"id": "d1", "loai": "tam_giac", "dinh": ["A", None, 3]}]},
            {"phep_dung": "[]"},
            {"phep_dung": [{"id": "d1", "loai": "tam_giac", "dinh": "ABC"}], "dieu_kien": [{"loai": "so_do_goc", "goc": "BAC", "do": "nhọn"}]},
            {"phep_dung": [{"id": "d1", "loai": "tam_giac", "dinh": "ABC"}, {"id": "d2", "loai": "trung_diem", "ten": "M", "doan": None}]}):
    kb = {"lop": "9", "canh": [], "hinh_phang_chuan": dict(rac, trang_chung_minh=[{"tieu_de": "x", "dong": [{"tex": "AB = AC", "khi_noi": "x"}]}])}
    try:
        G = giai(kb, chi_kiem=True)
        ok_rac = isinstance(G, dict) and G["dat"] is False and all(str(x["ma"]).startswith("HP_") for x in G["loi"])
    except Exception as e:   # noqa: BLE001
        ok_rac = False
        print("    crash:", type(e).__name__, e)
    kiem("đặc tả rác %s -> lỗi HP_*, không crash" % json.dumps(rac, ensure_ascii=False)[:70], ok_rac)
sys.path.insert(0, os.path.dirname(GOC))
from scripts import kiem_hinh_truoc_tts as truoc_tts  # noqa: E402
kb = kb_moi()
pd = kb["hinh_phang_chuan"]["phep_dung"]
pd[0] = {"id": "d1", "loai": "duong_tron", "tam": "O"}
pd[1] = {"id": "d2", "loai": "chan_duong_cao", "ten": "H", "tu": "A", "xuong": "BC"}
L = truoc_tts.kiem(kb, True, env={})
kiem("trước TTS: bước 1 chỉ (O), bước 2 dùng A -> chặn HP_DIEM_KHONG_TON_TAI",
     any(x["ma"] == "HP_DIEM_KHONG_TON_TAI" and "điểm A" in x["chi_tiet"] for x in L))
kiem("trước TTS: bài chuẩn -> đạt", truoc_tts.kiem(kb_moi(), True, env={}) == [])
kiem("trước TTS: không phải luồng hình học -> bỏ qua", truoc_tts.kiem(kb, False, env={}) == [])
duong_kb = os.path.join(GOC, "..", "out", "test_truoc_tts", "kb.json")
os.makedirs(os.path.dirname(duong_kb), exist_ok=True)
json.dump(kb, open(duong_kb, "w", encoding="utf8"), ensure_ascii=False)
duong_ra = os.path.join(os.path.dirname(duong_kb), "loi.json")
r = subprocess.run([sys.executable, "-X", "utf8", os.path.join(GOC, "kiem_hinh_truoc_tts.py"), duong_kb, duong_ra],
                   capture_output=True, env=dict(os.environ, HINH_HOC="1"))
kiem("CLI trước TTS: mã 2 + JSON nang có HP_DIEM_KHONG_TON_TAI",
     r.returncode == 2 and any(x.startswith("HP_DIEM_KHONG_TON_TAI:") for x in json.load(open(duong_ra, encoding="utf8"))["nang"]))

print("10. Bản JS (KiemTraHinh.gs kiemGdpt2018_) khớp bản Python")
js = os.path.join(GOC, "test_gdpt_js.cjs")
if os.path.exists(js):
    CAU = [("lop_9", "Vì E, D cùng nhìn BC dưới một góc vuông"), ("lop_9", "cung chứa góc"), ("lop_9", "\\sin B = \\frac{AC}{BC}, tan C"),
           ("lop_9", "định lý cosin"), ("lop_9", "a^2 = b^2 + c^2 - 2bc\\cos A"), ("lop_9", "\\frac{BC}{\\sin A} = 2R"), ("lop_9", "tích vô hướng"),
           ("thpt", "định lý sin, vectơ"), ("lop_8", "góc nội tiếp"), ("lop_9", "góc tạo bởi tia tiếp tuyến và dây cung"), ("lop_9", "phương tích"),
           ("lop_9", "Nhìn hình, cùng nhìn vào đường tròn"), ("lop_9", "hai đỉnh kề cùng nhìn"), ("lop_9", "véc tơ AM")]
    r = subprocess.run(["node", js], input=json.dumps(CAU).encode("utf8"), capture_output=True)
    ra_js = json.loads(r.stdout.decode("utf8") or "[]")
    py = [sorted(x["ma"] + ":" + x["muc"] for x in gdpt2018.kiem_van_ban(s, cap)) for cap, s in CAU]
    kiem("JS == Python trên %d câu mẫu" % len(CAU), ra_js == py)
    if ra_js != py:
        for (cap, s), a, b in zip(CAU, py, ra_js):
            if a != b:
                print("     ", cap, s, "PY", a, "JS", b)

print("11. Mắt thần 3×3 luồng hình phẳng (đo điểm ảnh, không gọi API)")
try:
    from PIL import Image, ImageDraw
    import mat_than_3x3 as mt
    def o(hinh_rong=0.8, chu_day=False):
        im = Image.new("RGB", (mt.O_RONG, mt.O_CAO), (18, 18, 20))
        d = ImageDraw.Draw(im)
        y0, y1 = int(mt.O_CAO * mt.HP_HINH_TREN), int(mt.O_CAO * mt.HP_HINH_DUOI)
        w = int(mt.O_RONG * hinh_rong)
        d.ellipse(((mt.O_RONG - w) // 2, y0 + 5, (mt.O_RONG + w) // 2, y0 + 5 + int((y1 - y0) * hinh_rong)), outline=(240, 240, 240), width=2)
        if chu_day:
            d.rectangle((40, int(mt.O_CAO * 0.9), 300, int(mt.O_CAO * 0.93)), fill=(240, 240, 240))
        return im
    p_hp = {"boCuc": "hinh_phang", "hinhPhangBoCuc": {"va_cham_nhan": 0}}
    tot = [o() for _ in range(9)]
    kiem("hình đủ lớn, đáy sạch -> không lỗi", mt.kiem_hinh_phang(p_hp, tot, 7) == [])
    nho = [o(0.3) for _ in range(9)]
    kiem("hình nhỏ ở các ô giải -> hinh_nho (nặng)", any(x["loai"] == "hinh_nho" and x["nang"] for x in mt.kiem_hinh_phang(p_hp, nho, 7)))
    day = [o() for _ in range(9)]
    day[4] = o(chu_day=True)
    kiem("chữ trong 14% đáy -> tran_day (nặng)", any(x["loai"] == "tran_day" and x["o"] == 5 for x in mt.kiem_hinh_phang(p_hp, day, 7)))
    kiem("bộ giải báo 2 nhãn va chạm -> nhan_de (nặng)", any(x["loai"] == "nhan_de" and x["nang"] for x in mt.kiem_hinh_phang(dict(p_hp, hinhPhangBoCuc={"va_cham_nhan": 2}), tot, 7)))
    kiem("prompt AI luồng hình phẳng có hinh_nho / tran_day / nhan_de", all(k in mt.prompt_ai(p_hp, 7) for k in ("hinh_nho", "tran_day", "nhan_de")))
except ImportError as e:
    print("  (bỏ qua: thiếu PIL - %s)" % e)

print("\nKết quả: %d đạt, %d hỏng" % (DAT, len(HONG)))
sys.exit(1 if HONG else 0)
