"""v99.2 — kiểm thử phía Python (không gọi mạng): python scripts/test_v99_2.py
  1. ve25d: chữ >= 24 px, nhan() không đè đỉnh / ra ngoài viewBox, mọi khối dựng qua hộp cát + kiểm thẩm mỹ;
  2. hộp cát --chi-kiem chặn: chữ nhỏ (TS_CHU_NHO), màu lạ (TS_MAU_LA), nhãn đè đỉnh / cắt nét (TS_NHAN_DE_NET), chữ chồng chữ
     (TS_CHONG_CHU); cho phép chữ trong hộp nền đặc và lớp cùng nhóm thay nhau; import ve25d trong hộp cát, vẫn cấm import khác;
  3. đổi họ màu nhấn theo theme; vá tối đa 2 lần khi hợp đồng tu_sinh_svg -> vẫn hỏng: tuSinhHong;
  4. cờ lệch pha hình - tiếng canhBaoDongBo; Mắt thần thêm lỗi cứng lech_pha / tu_sinh_hong;
  5. Evergreen bản Python; định tuyến cay_bayes; 2 mẫu mau/v99_2 chạy chuanbi --gia-lap (tự sinh, theme, không cờ hỏng).
"""
import colorsys
import json
import os
import subprocess
import sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(GOC, "scripts"))

import evergreen  # noqa: E402
import khung4tang_v96 as v96  # noqa: E402
import khung4tang_v99 as v99  # noqa: E402
import mat_than_3x3 as mt  # noqa: E402
import tu_sinh_svg as ts  # noqa: E402
import ve25d as v  # noqa: E402

dat = loi = 0


def t(ten, fn):
    global dat, loi
    try:
        fn()
        dat += 1
        print("  ✓", ten)
    except Exception as e:   # noqa: BLE001
        loi += 1
        print("  ✗", ten, "—", str(e).split("\n")[0][:200])


def lop(buoc, svg, **k):
    d = {"buoc": buoc, "svg": "<g>" + svg + "</g>", "hieu_ung": "moc"}
    d.update(k)
    return d


def ma_ve(ds):
    return "import math\nimport ve25d as v\n\ndef ve():\n    return " + json.dumps(ds, ensure_ascii=False) + "\n"


def phai_loi(ma_loi, ds, so_buoc=4):
    try:
        ts.dung(ma_ve(ds), so_buoc)
    except ts.LoiTuSinh as e:
        assert str(e).startswith(ma_loi), str(e)
        return
    raise AssertionError("không bắt được " + ma_loi)


NEN3 = [lop(0, v.chu(100, 100, "A", 26)), lop(1, v.chu(300, 100, "B", 26)), lop(2, v.chu(500, 100, "C", 26))]

print("1. Thư viện ve25d")


def assert_true(x, msg=""):
    if not x:
        raise AssertionError(msg or "sai")
    return True


def _nhan_sach():
    import re
    svg, P = v.hop(260, 380, 220, 120, 110)
    s = v.nhan(P["G"][0], P["G"][1], "G (mồi)", tranh=list(P.values()), co=26)
    x, y, w, h = (float(n) for n in re.search(r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"', s).groups())
    for px, py in P.values():
        assert_true(not (x <= px <= x + w and y <= py <= y + h), "hộp nhãn chứa đỉnh (%.0f, %.0f)" % (px, py))
    return 0 <= x and x + w <= 800 and 0 <= y and y + h <= 540


t("chu() luôn >= 24 px, nhan() tránh đỉnh + nằm trong viewBox", lambda: (assert_true('font-size="24"' in v.chu(10, 10, "x", co=12)), assert_true(_nhan_sach())))


def _moi_khoi():
    ma = ("import math\nimport ve25d as v\n\ndef ve():\n"
          "    s1, P = v.hop(120, 300, 160, 100, 80)\n"
          "    s2, Q = v.tru(560, 300, 60, 120)\n"
          "    s3, R = v.trai_phang_2mat(330, 60, 120, 60, 150, nhan_mat=('bên', 'trên'))\n"
          "    k, f = v.he_truc(90, 360, 240, 140, 10, 10, vach=(5, 10))\n"
          "    g, ff, PP = v.do_thi(470, 380, 260, 120, lambda x: -(x - 3) ** 2 + 9, 0, 6, cuc_tri=3)\n"
          "    c = v.cua(640, 40, 90, 150, 2) + v.cua(520, 40, 90, 150, 3, mo=True, ben_trong='Xe')\n"
          "    return [v.lop(0, s1 + v.nhan(P['G'][0], P['G'][1], 'G', tranh=list(P.values())), 'no', nhom='a'),\n"
          "            v.lop(1, s2 + s3, 'moc', nhom='a'), v.lop(2, k + g, 've', nhom='a'), v.lop(3, c + v.ban_co(40, 40, 20, 4, to=[(0, 0), (1, 1)]), 'sang', nhom='a')]\n")
    ds = ts.dung(ma, 4)
    assert_true(len(ds) == 4)


t("mọi khối ve25d (hộp / trụ / trải phẳng / hệ trục / đồ thị / cửa / bàn cờ) qua hộp cát + kiểm thẩm mỹ", _moi_khoi)
def _cam_import():
    try:
        ts.kiem_ast("import os\ndef ve():\n    return []\n")
    except ts.LoiTuSinh as e:
        assert_true(str(e).startswith("TS_IMPORT"))
        ts.kiem_ast("import ve25d\nfrom ve25d import nhan\ndef ve():\n    return []\n")
        return
    raise AssertionError("không chặn import os")


def _thoat():
    try:
        ts.chay_hop_cat("import ve25d\ndef ve():\n    return [{'buoc': 0, 'svg': str(ve25d.open)}]\n")
    except ts.LoiTuSinh:
        return
    raise AssertionError("ve25d.open phải không tồn tại")


t("hộp cát vẫn cấm import khác ve25d / math", _cam_import)
t("ve25d chạy với builtins rút gọn trong tiến trình -I -S (không lộ open / __builtins__ đầy đủ)", _thoat)


print("2. Kiểm thẩm mỹ cứng (--chi-kiem)")
t("TS_CHU_NHO: chữ 18 px / thiếu font-size bị chặn", lambda: (
    phai_loi("TS_CHU_NHO", NEN3 + [lop(3, '<text x="400" y="300" font-size="18" fill="#E9EEF5">nhỏ</text>')]),
    phai_loi("TS_CHU_NHO", NEN3 + [lop(3, '<text x="400" y="300" fill="#E9EEF5">thiếu cỡ</text>')])))
t("TS_MAU_LA: màu hồng ngoài họ theme bị chặn; tông tối / xám / token MAU được phép", lambda: (
    phai_loi("TS_MAU_LA", NEN3 + [lop(3, '<circle cx="400" cy="300" r="40" fill="#FF33CC"/>')]),
    ts.dung(ma_ve(NEN3 + [lop(3, '<rect x="10" y="10" width="40" height="40" fill="#0C1E2E" stroke="#7C8DA6"/>' + v.cham(400, 300))]), 4)))
t("TS_NHAN_DE_NET: chữ đè đỉnh / bị nét cắt qua", lambda: (
    phai_loi("TS_NHAN_DE_NET", NEN3 + [lop(3, '<polygon points="380,300 600,300 500,200" fill="none" stroke="#5CE1E6"/>' + v.chu(390, 308, "đè đỉnh", 26))]),
    phai_loi("TS_NHAN_DE_NET", NEN3 + [lop(3, '<line x1="300" y1="250" x2="700" y2="250" stroke="#5CE1E6" stroke-width="3"/>' + v.chu(500, 258, "bị cắt", 26))])))
t("chữ trong hộp nền đặc của chính lớp đó được phép (che nét phía sau)", lambda: ts.dung(ma_ve(NEN3 + [lop(3,
    '<line x1="300" y1="250" x2="700" y2="250" stroke="#5CE1E6" stroke-width="3"/>' + '<rect x="420" y="225" width="160" height="44" fill="#0B1A26"/>' + v.chu(500, 258, "trong hộp", 26))]), 4))
t("TS_CHONG_CHU: chữ 2 lớp cùng hiện chồng nhau; lớp cùng nhóm thay nhau thì không", lambda: (
    phai_loi("TS_CHONG_CHU", NEN3 + [lop(3, v.chu(100, 100, "chồng A", 26))]),
    ts.dung(ma_ve([lop(0, v.chu(400, 200, "nhãn 1", 26), nhom="n"), lop(1, v.chu(400, 200, "nhãn 2", 26), nhom="n"), lop(2, v.chu(100, 400, "C", 26))]), 3)))
t("lớp đã bị lớp cùng nhóm thay thế không còn 'cùng hiện' với lớp sau (không báo nhầm)", lambda: ts.dung(ma_ve([
    lop(0, v.chu(400, 200, "hộp", 26), nhom="hinh"), lop(1, v.chu(100, 450, "lưới", 26), nhom="hinh"), lop(2, v.chu(400, 200, "cột", 26), nhom="cot")]), 3))
t("2 mẫu v99.1 + 2 mẫu v99.2 đều qua hộp cát mới", lambda: [ts.dung(json.load(open(os.path.join(GOC, "mau", d, f + ".json"), encoding="utf8"))["khung4tang"]["tu_sinh"]["ma"], 5)
                                                              for d, f in (("v99_1", "koch_dao"), ("v99_1", "gia_ve_parabol"), ("v99_2", "gap_nhau_xs"), ("v99_2", "kien_bo_hop"))])

print("3. Theme + vá 2 lần")


def _hue(h):
    r, g, b = (int(h[k:k + 2], 16) / 255 for k in (1, 3, 5))
    return colorsys.rgb_to_hls(r, g, b)[0] * 360


def _theme():
    s = {"lop": [{"svg": '<g><rect fill="#5CE1E6"/><rect fill="#FFB547"/><rect fill="#0C1E2E"/></g>'}]}
    n = ts.doi_mau_theme(s, "cosmic_indigo")
    import re
    mau = re.findall(r"#[0-9A-F]{6}", s["lop"][0]["svg"])
    assert_true(n == 1 and abs(_hue(mau[0]) - 247) < 8, str(mau))
    assert_true(mau[1] == "#FFB547" and mau[2] == "#0C1E2E")
    s2 = {"lop": [{"svg": '<g><rect fill="#5CE1E6"/></g>'}]}
    assert_true(ts.doi_mau_theme(s2, "deep_ocean") == 0)


t("doi_mau_theme: cyan -> tím indigo, hổ phách / tối giữ nguyên, deep_ocean không đổi", _theme)

MA_HONG = "def ve():\n    return [{'buoc': 0, 'svg': '<g><text x=\"10\" y=\"40\" font-size=\"12\" fill=\"#E9EEF5\">nho</text></g>'}]\n"
MA_TOT = ma_ve([lop(0, v.chu(120, 100, "A", 26)), lop(1, v.chu(400, 100, "B", 26)), lop(2, v.chu(650, 100, "C", 26))])
BUOC = [{"t": 0.0}, {"t": 3.0}, {"t": 6.0}]


def _va(ep, kq_sua, mong):
    goc = ts.nho_gemini_sua
    dem = []

    def gia(ma, loi_, de, n):
        dem.append(loi_)
        return kq_sua.pop(0) if kq_sua else None
    ts.nho_gemini_sua = gia
    try:
        kb = {"de_bai": "x", "khung4tang": {"tu_sinh": {"ma": MA_HONG}}}
        if ep:
            kb["san_khau_dich"] = "tu_sinh_svg"
        out, ghi = ts.gan_tu_sinh(kb, kb["khung4tang"], BUOC, lambda *a: None, 0.0, 9.0)
        mong(out, ghi, dem, kb)
    finally:
        ts.nho_gemini_sua = goc


t("hợp đồng tu_sinh_svg: hỏng -> vá lần 1 vẫn hỏng -> vá lần 2 đạt (nhật ký lỗi gửi kèm)", lambda: _va(True, [MA_HONG, MA_TOT], lambda o, g, d, kb: (
    assert_true(o and len(o["lop"]) == 3, g), assert_true(len(d) == 2 and "lần 2" in d[1], str(d)), assert_true("2 lần" in g))))
t("hợp đồng tu_sinh_svg: vá 2 lần vẫn hỏng -> tu_sinh_hong có lý do", lambda: _va(True, [MA_HONG, MA_HONG], lambda o, g, d, kb: (
    assert_true(o is None and len(d) == 2), assert_true(ts.tu_sinh_hong(kb, o, g).startswith("Sân khấu tự sinh hỏng")))))
t("không hợp đồng: vá 1 lần như v99.1, không cờ hỏng", lambda: _va(False, [MA_HONG, MA_TOT], lambda o, g, d, kb: (
    assert_true(o is None and len(d) == 1), assert_true(ts.tu_sinh_hong(kb, o, g) == ""))))
t("hợp đồng tu_sinh_svg mà kịch bản không có mã -> vẫn báo hỏng (không âm thầm)", lambda: assert_true(
    ts.tu_sinh_hong({"san_khau_dich": "tu_sinh_svg", "tu_sinh_hong": "mã vẫn lỗi"}, None, "") != ""))

print("4. Lệch pha hình - tiếng + Mắt thần")


def _lech():
    out = {"buoc": [{"t": 0.0, "nhan": "Đề bài"}, {"t": 5.0, "nhan": "Bước 1"}, {"t": 10.0, "nhan": "Kết luận", "the": [{"t": 10.2, "chot": True}]}]}
    sua = v99.khoa_dap_an(out, 15.0, ["7/16"])
    cb = v99.canh_bao_dong_bo(out, 15.0, sua)
    assert_true(cb and "sớm hơn giọng" in cb[0], str(cb))
    out2 = {"buoc": [{"t": 0.0, "nhan": "Đề bài"}, {"t": 13.5, "nhan": "Kết luận"}]}
    assert_true(v99.canh_bao_dong_bo(out2, 15.0, v99.khoa_dap_an(out2, 15.0)) == [])
    canh = [{"loai": "dap_an", "batDau": 300, "soFrame": 150, "leadFrame": 0}]
    tu = [{"w": "vậy", "bat": 10.2}, {"w": "là", "bat": 10.6}]
    out3 = {"buoc": [{"t": 0.0, "nhan": "Đề bài"}, {"t": 10.0, "nhan": "Kết luận"}]}
    t_cb = v99.moc_cong_bo(tu, canh, 30, ["7/16"])
    cb3 = v99.canh_bao_dong_bo(out3, t_cb, v99.khoa_dap_an(out3, t_cb), tu, canh, 30, ["7/16"])
    assert_true(any("không đọc ra số" in x for x in cb3), str(cb3))


t("canhBaoDongBo: kết luận sớm >= 3 s bị cờ, lệch nhỏ không cờ, giọng không đọc đáp số bị cờ", _lech)
t("Mắt thần: canhBaoDongBo -> lech_pha, tuSinhHong -> tu_sinh_hong (lỗi NẶNG, có tên)", lambda: (
    assert_true({x["loai"] for x in mt.kiem_tat_dinh({"khung4tang": {"canhBaoDongBo": ["sớm 4 s"], "tuSinhHong": "hỏng"}}, [], 7) if x["nang"]} >= {"lech_pha", "tu_sinh_hong"}),
    assert_true("lech_pha" in mt.TEN_LOI and "tu_sinh_hong" in mt.LOAI_LOI)))

print("5. Evergreen + định tuyến + 2 mẫu")
t("evergreen: 2k9 / Học sinh 2009 / #2k8 / THPT 2027 (giữ 'Năm 2025 dân số')", lambda: (
    assert_true(evergreen.ve_sinh_nam_sinh("2k9 ơi, bài này khó lắm!") == "Bạn ơi, bài này khó lắm!"),
    assert_true(evergreen.ve_sinh_nam_sinh("Học sinh 2009 cần biết", "12") == "Học sinh lớp 12 cần biết"),
    assert_true(evergreen.ve_sinh_nam_sinh("#2k8 #toanhoc") == "#toanhoc"),
    assert_true(evergreen.ve_sinh_nam_sinh("Đề thi THPT 2027") == "Đề thi THPT"),
    assert_true(evergreen.ve_sinh_nam_sinh("Năm 2025 dân số tăng") == "Năm 2025 dân số tăng"),
    assert_true(evergreen.ve_sinh_meta({"tieu_de": "Cho 2k10", "the": ["2k10", "thpt2027", "toanhoc"]}, "10")["the"] == ["toanhoc", "thpt"])))
t("chon_san_khau: hợp đồng cay_bayes -> so_do_cay", lambda: assert_true(v96.chon_san_khau({"mon": "XAC_SUAT", "lop": "11", "san_khau_dich": "cay_bayes", "de_bai": "x"})["loai"] == "so_do_cay"))


def _mau(ten, thoi_min=20):
    ra = os.path.join(GOC, "out", "v99_2", ten, "props.json")
    r = subprocess.run([sys.executable, "-X", "utf8", os.path.join(GOC, "scripts", "chuanbi.py"), os.path.join(GOC, "mau", "v99_2", ten + ".json"), "--gia-lap", "--props-ra", ra],
                       capture_output=True, text=True, encoding="utf8", cwd=GOC, timeout=600)
    assert_true(r.returncode == 0, (r.stderr or r.stdout)[-300:])
    p = json.load(open(ra, encoding="utf8"))
    k4 = p.get("khung4tang") or {}
    assert_true(k4.get("tuSinh") and len(k4["tuSinh"]["lop"]) >= 5, "thiếu tuSinh")
    assert_true(not k4.get("tuSinhHong") and not k4.get("canhBaoDongBo"), str(k4.get("canhBaoDongBo") or k4.get("tuSinhHong")))
    assert_true(k4.get("theme") in v99.THEMES)
    assert_true(k4.get("tCongBo") and all(l["t"] >= k4["tCongBo"] - 1e-6 for l in k4["tuSinh"]["lop"] if l.get("buoc") == len(k4["buoc"]) - 1))
    return p


t("mẫu gap_nhau_xs (xác suất + tự sinh + theme indigo đổi màu nhấn)", lambda: assert_true(_mau("gap_nhau_xs")["khung4tang"]["theme"] == "cosmic_indigo"))
t("mẫu kien_bo_hop (thực tế + tự sinh, lớp kết quả không trước giọng công bố)", lambda: _mau("kien_bo_hop"))

print("\nKẾT QUẢ: %d đạt, %d hỏng" % (dat, loi))
sys.exit(1 if loi else 0)
