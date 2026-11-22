"""v97 - Kiểm chứng trên tọa độ: mệnh đề quan hệ (thuộc, vuông góc, song song...), số đo (góc / khoảng cách / độ dài /
thể tích) và khung chương trình GDPT 2018 cho hình không gian."""
import math
import re

from .hinh import LoiDung, cham, cheo, chuan, dai, kc, mat_qua, noi, tach_ten, tru, nhan, chuan_ten

TOL_GOC = 1e-5


def _p(D, x):
    x = chuan_ten(x)
    if x not in D:
        raise LoiDung("KG_DIEM_KHONG_TON_TAI", "mệnh đề nhắc điểm %s chưa được dựng" % x)
    return D[x]


def _dg(D, s):
    ds = tach_ten(s)
    if len(ds) != 2:
        raise LoiDung("KG_DUNG_LOI", "đường '%s' phải gồm 2 điểm" % s)
    return _p(D, ds[0]), _p(D, ds[1])


def _mp(D, s):
    ds = tach_ten(s)
    if len(ds) < 3:
        raise LoiDung("KG_DUNG_LOI", "mặt '%s' cần >= 3 điểm" % s)
    ps = [_p(D, x) for x in ds]
    n, o = mat_qua(ps[0], ps[1], ps[2])
    return n, o, ps


def _cos(u, v):
    return abs(cham(u, v)) / max(1e-12, dai(u) * dai(v))


def kiem_menh_de(md, D):
    """-> (đúng?, độ lệch). Loại: thuoc | vuong_goc | vuong_goc_mat | mat_vuong_goc | song_song | song_song_mat | thang_hang | dong_phang."""
    l = str(md.get("loai") or "")
    if l == "thuoc":
        X = _p(D, md.get("diem"))
        if md.get("mat"):
            n, o, _ = _mp(D, md["mat"])
            e = abs(cham(n, tru(X, o)))
        else:
            p, q = _dg(D, md.get("duong"))
            e = dai(cheo(tru(q, p), tru(X, p))) / max(1e-12, dai(tru(q, p)))
        return e < 1e-6, e
    if l == "vuong_goc":
        p, q = _dg(D, md.get("a"))
        r, s = _dg(D, md.get("b"))
        e = _cos(tru(q, p), tru(s, r))
        return e < TOL_GOC, e
    if l == "vuong_goc_mat":
        p, q = _dg(D, md.get("duong"))
        n, _, _ = _mp(D, md.get("mat"))
        e = dai(cheo(chuan(tru(q, p)), n))
        return e < TOL_GOC, e
    if l == "mat_vuong_goc":
        n1, _, _ = _mp(D, md.get("mat1") or md.get("a"))
        n2, _, _ = _mp(D, md.get("mat2") or md.get("b"))
        e = abs(cham(n1, n2))
        return e < TOL_GOC, e
    if l == "song_song":
        p, q = _dg(D, md.get("a"))
        r, s = _dg(D, md.get("b"))
        e = dai(cheo(chuan(tru(q, p)), chuan(tru(s, r))))
        return e < TOL_GOC, e
    if l == "song_song_mat":
        p, q = _dg(D, md.get("duong"))
        n, o, _ = _mp(D, md.get("mat"))
        e = abs(cham(chuan(tru(q, p)), n))
        trong = abs(cham(n, tru(p, o))) < 1e-6
        return e < TOL_GOC and not trong, e
    if l in ("thang_hang", "dong_phang"):
        ps = [_p(D, x) for x in (md.get("diem") if isinstance(md.get("diem"), list) else tach_ten(md.get("diem")))]
        if l == "thang_hang":
            e = max(dai(cheo(tru(ps[1], ps[0]), tru(x, ps[0]))) / max(1e-12, dai(tru(ps[1], ps[0]))) for x in ps[2:])
        else:
            n, o = mat_qua(ps[0], ps[1], ps[2])
            e = max([abs(cham(n, tru(x, o))) for x in ps[3:]] or [0.0])
        return e < 1e-6, e
    raise LoiDung("KG_DUNG_LOI", "loại mệnh đề '%s' chưa hỗ trợ" % l,
                  "dùng thuoc | vuong_goc | vuong_goc_mat | mat_vuong_goc | song_song | song_song_mat | thang_hang | dong_phang")


# ---------------- số đo ----------------
def tinh_so_do(dl, D):
    l = str(dl.get("loai") or "")
    if l == "do_dai":
        p, q = _dg(D, dl.get("doan"))
        return kc(p, q)
    if l == "goc_duong_mat":
        p, q = _dg(D, dl.get("duong"))
        n, _, _ = _mp(D, dl.get("mat"))
        return math.degrees(math.asin(min(1.0, _cos(tru(q, p), n))))
    if l == "goc_hai_duong":
        p, q = _dg(D, dl.get("a"))
        r, s = _dg(D, dl.get("b"))
        return math.degrees(math.acos(min(1.0, _cos(tru(q, p), tru(s, r)))))
    if l == "goc_hai_mat":
        n1, _, _ = _mp(D, dl.get("mat1") or dl.get("a"))
        n2, _, _ = _mp(D, dl.get("mat2") or dl.get("b"))
        return math.degrees(math.acos(min(1.0, abs(cham(n1, n2)))))
    if l == "goc_ba_diem":   # góc XYZ tại Y
        x, y, z = [_p(D, t) for t in tach_ten(dl.get("goc"))]
        u, v = tru(x, y), tru(z, y)
        return math.degrees(math.acos(max(-1.0, min(1.0, cham(u, v) / (dai(u) * dai(v))))))
    if l == "khoang_cach_diem_mat":
        X = _p(D, dl.get("diem"))
        n, o, _ = _mp(D, dl.get("mat"))
        return abs(cham(n, tru(X, o)))
    if l == "khoang_cach_diem_duong":
        X = _p(D, dl.get("diem"))
        p, q = _dg(D, dl.get("duong"))
        return dai(cheo(tru(q, p), tru(X, p))) / dai(tru(q, p))
    if l == "khoang_cach_hai_duong":
        p, q = _dg(D, dl.get("a"))
        r, s = _dg(D, dl.get("b"))
        n = cheo(tru(q, p), tru(s, r))
        if dai(n) < 1e-9:   # song song
            return dai(cheo(tru(q, p), tru(r, p))) / dai(tru(q, p))
        return abs(cham(chuan(n), tru(r, p)))
    if l == "the_tich":
        ds = tach_ten(dl.get("khoi") or "")
        if len(ds) == 4:
            a, b, c, d = [_p(D, x) for x in ds]
            return abs(cham(cheo(tru(b, a), tru(c, a)), tru(d, a))) / 6.0
        raise LoiDung("KG_DUNG_LOI", "the_tich: chỉ hỗ trợ tứ diện 4 đỉnh (khối chóp đa giác: tách thành tứ diện)")
    raise LoiDung("KG_DUNG_LOI", "loại số đo '%s' chưa hỗ trợ" % l)


def doc_gia_tri(s):
    """'60°' | 'a\\sqrt{3}/2' | '\\dfrac{a\\sqrt{6}}{3}' | 0.5 -> số (a = 1). None nếu không đọc được."""
    if isinstance(s, (int, float)):
        return float(s)
    x = str(s or "").strip().replace("$", "")
    if not x:
        return None
    x = re.sub(r"\^\s*\{?\\circ\}?|°|\\degree|độ", "", x)
    x = re.sub(r"\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"((\1)/(\2))", x)
    for _ in range(3):
        x = re.sub(r"\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"((\1)/(\2))", x)
    x = re.sub(r"\\sqrt\s*\[(\d+)\]\s*\{([^{}]*)\}", r"((\2)**(1/\1))", x)
    x = re.sub(r"\\sqrt\s*\{([^{}]*)\}", r"((\1)**0.5)", x)
    x = re.sub(r"\\sqrt\s*(\d+)", r"((\1)**0.5)", x)
    x = x.replace("\\cdot", "*").replace("\\times", "*").replace("×", "*").replace("·", "*").replace("\\pi", "pi")
    x = x.replace("^", "**").replace("{", "(").replace("}", ")").replace(",", ".").replace("\\left", "").replace("\\right", "")
    x = re.sub(r"\s+", "", x)
    x = re.sub(r"(?<=[\d)a])(?=[a(p])", "*", x)
    if not re.fullmatch(r"[\d.a*/+\-()pi]+", x):
        return None
    try:
        return float(eval(x, {"__builtins__": {}}, {"a": 1.0, "pi": math.pi}))   # noqa: S307 - chuỗi đã lọc ký tự
    except Exception:   # noqa: BLE001
        return None


# ---------------- GDPT 2018 ----------------
CAM_LOP_11 = [
    (r"\bO\s*xyz\b|hệ tọa độ|tọa độ (?:điểm|vectơ)|phương trình mặt phẳng|phương trình đường thẳng", "tọa độ Oxyz (lớp 12)"),
    (r"tích vô hướng|tích có hướng|vect[ơo] pháp tuyến|vect[ơo] chỉ phương", "vectơ trong không gian (lớp 12)"),
    (r"đạo hàm|y'\s*=\s*0|bảng biến thiên|tích phân|nguyên hàm", "đạo hàm / tích phân (lớp 11 không dùng để tìm cực trị)"),
]


def kiem_gdpt(hkg, lop):
    """Lỗi cứng KG_VUOT_CHUONG_TRINH (không gian lớp <= 10, Oxyz / vectơ trước lớp 12)."""
    loi = []
    try:
        lop = int(str(lop or "11").strip()[:2])
    except ValueError:
        lop = 11
    if lop <= 10 and lop != 8:
        loi.append(("KG_VUOT_CHUONG_TRINH", "hình học không gian không thuộc chương trình lớp %d (GDPT 2018)" % lop,
                    "lớp 10 chỉ hình phẳng; quan hệ song song / vuông góc trong không gian bắt đầu từ lớp 11"))
    if str(hkg.get("he_truc") or "") == "oxyz" and lop < 12:
        loi.append(("KG_VUOT_CHUONG_TRINH", "tọa độ Oxyz chỉ dùng ở lớp 12", "lớp 11: chứng minh tổng hợp (quan hệ song song / vuông góc)"))
    if lop < 12:
        import json
        van = json.dumps([b.get("the") for b in hkg.get("buoc") or [] if isinstance(b, dict)] +
                         [b.get("tieu_de") for b in hkg.get("buoc") or [] if isinstance(b, dict)], ensure_ascii=False)
        for re_, ten in CAM_LOP_11:
            m = re.search(re_, van, re.I)
            if m:
                loi.append(("KG_VUOT_CHUONG_TRINH", "lớp %d dùng %s: '%s'" % (lop, ten, m.group(0)),
                            "dùng định lí ba đường vuông góc, quan hệ đường - mặt, hệ thức lượng trong tam giác vuông"))
    return loi


def kiem_hien_dien(D, ds_ten, a):
    """Hai điểm phân biệt quá sát nhau trong không gian (< 0,1 a) -> KG_DINH_CHUM (dù xoay góc nào cũng dính)."""
    loi = []
    for i in range(len(ds_ten)):
        for j in range(i + 1, len(ds_ten)):
            p, q = D[ds_ten[i]], D[ds_ten[j]]
            if kc(p, q) < 0.1 * a:
                loi.append(("KG_DINH_CHUM", "điểm %s và %s cách nhau %.3f a (< 0,1 a)" % (ds_ten[i], ds_ten[j], kc(p, q) / a),
                            "đổi tỷ lệ điểm chia (bất kỳ -> để máy chọn) hoặc kiểm lại phép dựng"))
    return loi


def tham_so_ngoai(info, ten):
    """Điểm dựng nằm NGOÀI đoạn (giao trên phần kéo dài) -> trả đoạn kéo dài cần vẽ (đầu mút gần nhất -> điểm)."""
    ra = []
    for k_t, k_d in (("t", "tren"), ("s", "tren2")):
        t, ds = info.get(k_t), info.get(k_d)
        if t is None or not ds:
            continue
        if t > 1 + 1e-6:
            ra.append([ds[1], ten])
        elif t < -1e-6:
            ra.append([ds[0], ten])
    return ra


def noi_ten(D, a, b, t):
    return noi(D[a], D[b], t)


__all__ = ["kiem_menh_de", "tinh_so_do", "doc_gia_tri", "kiem_gdpt", "kiem_hien_dien", "tham_so_ngoai", "nhan"]
