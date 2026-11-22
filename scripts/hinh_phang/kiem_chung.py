"""KIỂM CHỨNG TOÁN HỌC bằng tọa độ số thật + khóa màu Hình <-> Chữ + đồng bộ cạnh (Edge Auto-Sync).

- Mệnh đề lấy từ 2 nguồn: `menh_de` AI khai báo trên từng dòng VÀ mệnh đề máy tự đọc từ chính LaTeX hiện trên màn hình
  (⊥, //, ∼, =, \\in). Mọi mệnh đề phải đúng trên MỌI cấu hình hợp lệ đã lấy mẫu (không chỉ hình được chọn) -> mệnh đề chỉ
  đúng tình cờ ở một hình vẫn bị bắt.
- Ngưỡng: vuông góc / song song |cos|,|sin| < 1e-5; góc bằng nhau lệch < 0,05°; cùng đường tròn lệch bán kính < 1e-5;
  đồng dạng ĐÚNG THỨ TỰ ĐỈNH (sai thứ tự -> HP_DONG_DANG_SAI_THU_TU kèm thứ tự đúng).
"""
import itertools
import math
import re

from .hinh import EPS, LoiDung, cham, cheo, chuan_ten, dai, goc_do, kc, khoa_duong_tron, tach_diem, tren_doan, tru, TEN_DIEM

TOL_GOC = 0.05
TOL_COS = 1e-5
TOL_DAI = 1e-5

MAU_HOP_LE = {"vang": "#FACC15", "do": "#F87171", "ngoc": "#2DD4BF", "cam": "#FB923C", "la": "#4ADE80"}
MAU_CYAN = "#22D3EE"
RE_MACRO_MAU = re.compile(r"\\m(vang|do|ngoc|cam|la)\s*\{")


# ---------------- tiện ích LaTeX ----------------
def _ngoac(s, i):
    """s[i] == '{' -> chỉ số sau '}' khớp."""
    sau = 0
    for j in range(i, len(s)):
        if s[j] == "{":
            sau += 1
        elif s[j] == "}":
            sau -= 1
            if sau == 0:
                return j + 1
    return len(s)


def doan_mau(tex):
    """[(màu, nội dung, vị trí bắt đầu, vị trí kết thúc)] của các macro \\mvang{...}... trong dòng."""
    kq = []
    for m in RE_MACRO_MAU.finditer(tex):
        j = _ngoac(tex, m.end() - 1)
        kq.append((m.group(1), tex[m.end():j - 1], m.start(), j))
    return kq


def bo_macro(tex):
    """Gỡ macro màu, \\hl, \\text{...} -> chuỗi thuần để đọc mệnh đề."""
    s = str(tex or "")
    for _ in range(6):
        m = RE_MACRO_MAU.search(s) or re.search(r"\\(hl|boxed|mathbf|mathrm|displaystyle)\s*\{", s)
        if not m:
            break
        j = _ngoac(s, m.end() - 1)
        s = s[:m.start()] + " " + s[m.end():j - 1] + " " + s[j:]
    s = re.sub(r"\\text\s*\{[^{}]*\}", " ; ", s)
    s = re.sub(r"\\(left|right|displaystyle|,|;|!|quad|qquad|dpcm|blacksquare|square)", " ", s)
    s = s.replace("~", " ")
    s = re.sub(r"\\\s", " ", s)
    s = re.sub(r"\\widehat\s*\{\s*([^{}]*)\}", r"\\angle \1", s)
    s = re.sub(r"\\hat\s*\{\s*([^{}]*)\}", r"\\angle \1", s)
    s = re.sub(r"\^\s*\{?\s*\\circ\s*\}?|°", " DEG ", s)
    s = s.replace("{,}", ".")
    return s


# ---------------- đối tượng & khóa ----------------
def khoa_goc(ten3):
    a, o, b = ten3
    return ("goc", o, frozenset((a, b)))


def khoa_doan(a, b):
    return ("doan", frozenset((a, b)))


def khoa_da_giac(ds):
    return ("da_giac", frozenset(ds))


def doi_tuong_tex(noi_dung):
    """Nội dung trong macro màu -> danh sách khóa đối tượng hình (góc, tam giác, đoạn, đường tròn)."""
    s = bo_macro(noi_dung)
    kq = []
    for m in re.finditer(r"\\angle\s*((?:" + TEN_DIEM + r"\s*){3})", s):
        ds = tach_diem(m.group(1))
        if len(ds) == 3:
            kq.append(khoa_goc(ds))
    s2 = re.sub(r"\\angle\s*((?:" + TEN_DIEM + r"\s*){3})", " ", s)
    for m in re.finditer(r"\\(?:triangle|Delta)\s*((?:" + TEN_DIEM + r"\s*){3})", s2):
        kq.append(khoa_da_giac(tach_diem(m.group(1))))
    s2 = re.sub(r"\\(?:triangle|Delta)\s*((?:" + TEN_DIEM + r"\s*){3})", " ", s2)
    for m in re.finditer(r"\(\s*((?:" + TEN_DIEM + r"){1,2})\s*\)", s2):
        kq.append(("tron", "".join(tach_diem(m.group(1)))))
    s2 = re.sub(r"\(\s*((?:" + TEN_DIEM + r"){1,2})\s*\)", " ", s2)
    for m in re.finditer(r"(?<![A-Za-z\\'_])((?:" + TEN_DIEM + r"){2,5})(?![A-Za-z'_])", s2):
        ds = tach_diem(m.group(1))
        if len(ds) == 2:
            kq.append(khoa_doan(*ds))
        elif len(ds) >= 3:
            kq.append(khoa_da_giac(ds))
    return kq


def khoa_hanh_dong(h):
    l = h.get("loai")
    if l in ("to_goc", "ky_hieu_vuong"):
        ds = tach_diem(h.get("goc"))
        return khoa_goc(ds) if len(ds) == 3 else None
    if l == "to_da_giac":
        ds = tach_diem("".join(h.get("dinh")) if isinstance(h.get("dinh"), list) else h.get("dinh"))
        return khoa_da_giac(ds) if len(ds) >= 3 else None
    if l == "nhan_manh_doan":
        ds = tach_diem(h.get("doan"))
        return khoa_doan(*ds) if len(ds) == 2 else None
    if l == "duong_tron_phu":
        k = khoa_duong_tron(h.get("duong_kinh") or h.get("khoa") or "".join(h.get("qua") or []) or h.get("tam") or "")
        return ("tron", k) if k else None
    return None


# ---------------- giá trị số ----------------
def _goc(H, ten3):
    ds = tach_diem(ten3) if isinstance(ten3, str) else [chuan_ten(x) for x in ten3]
    if len(ds) != 3:
        raise LoiDung("HP_DUNG_LOI", "góc '%s' phải gồm 3 điểm" % ten3)
    return goc_do(H.d(ds[0]), H.d(ds[1]), H.d(ds[2]))


def _vec(H, ref):
    ds = tach_diem(ref)
    if len(ds) != 2:
        raise LoiDung("HP_DUNG_LOI", "'%s' không phải đường thẳng 2 điểm" % ref)
    return tru(H.d(ds[1]), H.d(ds[0]))


def _do_dai(H, ref):
    ds = tach_diem(ref)
    if len(ds) != 2:
        raise LoiDung("HP_DUNG_LOI", "'%s' không phải đoạn thẳng 2 điểm" % ref)
    return kc(H.d(ds[0]), H.d(ds[1]))


def _cos(u, v):
    du, dv = dai(u), dai(v)
    if du < EPS or dv < EPS:
        raise LoiDung("HP_DUNG_LOI", "đường thẳng suy biến (hai điểm trùng)")
    return cham(u, v) / (du * dv), cheo(u, v) / (du * dv)


def _goc_tg(H, ds, k):
    return goc_do(H.d(ds[(k + 1) % 3]), H.d(ds[k]), H.d(ds[(k + 2) % 3]))


def _khop_dong_dang(H, t1, t2, can_canh=False):
    lech = max(abs(_goc_tg(H, t1, k) - _goc_tg(H, t2, k)) for k in range(3))
    if can_canh:
        lech_c = max(abs(kc(H.d(t1[k]), H.d(t1[(k + 1) % 3])) - kc(H.d(t2[k]), H.d(t2[(k + 1) % 3]))) for k in range(3))
        return lech, lech_c
    return lech, 0.0


def mo_ta_menh_de(md):
    l = md.get("loai")
    f = {
        "vuong_goc": lambda: "%s ⊥ %s" % (md.get("a"), md.get("b")),
        "song_song": lambda: "%s // %s" % (md.get("a"), md.get("b")),
        "goc_bang": lambda: "∠%s = ∠%s" % (md.get("g1"), md.get("g2")),
        "goc_so_do": lambda: "∠%s = %s°" % (md.get("goc"), md.get("do")),
        "tong_goc": lambda: " + ".join("∠" + g for g in md.get("goc") or []) + " = %s°" % md.get("bang", 180),
        "bang_doan": lambda: "%s = %s" % (md.get("a"), md.get("b")),
        "tich_bang": lambda: "%s·%s = %s·%s" % tuple((md.get("ve_trai") or ["?", "?"])[:2] + (md.get("ve_phai") or ["?", "?"])[:2]),
        "dong_vien": lambda: "%s cùng thuộc một đường tròn" % ", ".join(md.get("diem") or []),
        "thang_hang": lambda: "%s thẳng hàng" % ", ".join(md.get("diem") or []),
        "thuoc": lambda: "%s ∈ %s" % (md.get("diem"), md.get("a")),
        "dong_dang": lambda: "△%s ∼ △%s" % (md.get("tg1"), md.get("tg2")),
        "bang_nhau": lambda: "△%s = △%s" % (md.get("tg1"), md.get("tg2")),
        "trung_diem": lambda: "%s là trung điểm %s" % (md.get("diem"), md.get("doan")),
        "bieu_thuc": lambda: md.get("mo_ta") or "đẳng thức",
    }.get(l)
    return f() if f else str(md)


def kiem_menh_de(md, H):
    """-> (đạt, sai_lệch, ghi chú). Ném LoiDung khi mệnh đề nhắc điểm không có."""
    l = md.get("loai")
    if l == "vuong_goc":
        c, _ = _cos(_vec(H, md["a"]), _vec(H, md["b"]))
        return abs(c) < TOL_COS, abs(c), ""
    if l == "song_song":
        _, s = _cos(_vec(H, md["a"]), _vec(H, md["b"]))
        return abs(s) < TOL_COS, abs(s), ""
    if l == "goc_bang":
        ds = [md.get("g1"), md.get("g2")] + list(md.get("them") or [])
        v = [_goc(H, g) for g in ds if g]
        lech = max(v) - min(v)
        return lech < TOL_GOC, lech, "các góc ≈ " + ", ".join("%.2f°" % x for x in v)
    if l == "goc_so_do":
        v = _goc(H, md["goc"])
        lech = abs(v - float(md.get("do")))
        return lech < TOL_GOC, lech, "đo được %.2f°" % v
    if l == "tong_goc":
        v = sum(_goc(H, g) for g in md.get("goc") or [])
        lech = abs(v - float(md.get("bang", 180)))
        return lech < TOL_GOC, lech, "tổng đo được %.2f°" % v
    if l == "bang_doan":
        a, b = _do_dai(H, md["a"]), _do_dai(H, md["b"])
        lech = abs(a - b) / max(a, b, EPS)
        return lech < TOL_DAI, lech, "%.4f vs %.4f" % (a, b)
    if l == "tich_bang":
        t = _do_dai(H, md["ve_trai"][0]) * _do_dai(H, md["ve_trai"][1])
        p = _do_dai(H, md["ve_phai"][0]) * _do_dai(H, md["ve_phai"][1])
        lech = abs(t - p) / max(t, p, EPS)
        return lech < TOL_DAI, lech, "%.4f vs %.4f" % (t, p)
    if l == "dong_vien":
        ds = [chuan_ten(x) for x in md.get("diem") or []]
        if len(ds) < 4:
            return True, 0.0, "dưới 4 điểm luôn cùng đường tròn"
        from .hinh import tam_ngoai_tiep
        o = tam_ngoai_tiep(H.d(ds[0]), H.d(ds[1]), H.d(ds[2]))
        r = kc(o, H.d(ds[0]))
        lech = max(abs(kc(o, H.d(x)) - r) for x in ds[3:]) / max(r, EPS)
        return lech < TOL_DAI, lech, ""
    if l == "thang_hang":
        ds = [H.d(x) for x in md.get("diem") or []]
        lech = max([abs(cheo(tru(ds[1], ds[0]), tru(p, ds[0]))) / max(dai(tru(ds[1], ds[0])) * max(dai(tru(p, ds[0])), EPS), EPS) for p in ds[2:]] or [0])
        return lech < TOL_COS, lech, ""
    if l == "thuoc":
        p = H.d(md["diem"])
        ref = str(md.get("a") or "")
        if ref.startswith("("):
            k = khoa_duong_tron(ref)
            ds = tach_diem(k)
            if k not in H.C and len(ds) == 2:      # "(BC)" chưa dựng -> hiểu là đường tròn đường kính BC
                a, b = H.d(ds[0]), H.d(ds[1])
                c = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, kc(a, b) / 2)
            else:
                c, _ = H.tron(ref)
            lech = abs(kc(p, c[:2]) - c[2]) / max(c[2], EPS)
            return lech < TOL_DAI, lech, ""
        a, b, _ = H.hai_diem(ref)
        lech = abs(cheo(tru(b, a), tru(p, a))) / max(kc(a, b) ** 2, EPS)
        return lech < TOL_COS, lech, ""
    if l in ("dong_dang", "bang_nhau"):
        t1, t2 = tach_diem(md["tg1"]), tach_diem(md["tg2"])
        if len(t1) != 3 or len(t2) != 3:
            raise LoiDung("HP_DUNG_LOI", "tam giác phải có 3 đỉnh: %s, %s" % (md["tg1"], md["tg2"]))
        lech, lech_c = _khop_dong_dang(H, t1, t2, l == "bang_nhau")
        ok = lech < TOL_GOC and (l != "bang_nhau" or lech_c < TOL_DAI * 10)
        return ok, lech, ""
    if l == "trung_diem":
        a, b, _ = H.hai_diem(md["doan"])
        p = H.d(md["diem"])
        lech = kc(p, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) / max(kc(a, b), EPS)
        return lech < TOL_DAI, lech, ""
    if l == "bieu_thuc":
        v = [danh_gia(x, H) for x in md.get("ve") or []]
        v = [x for x in v if x is not None]
        if len(v) < 2:
            return True, 0.0, "khong_so"
        ok, lech, ghi = so_sanh(v, getattr(H, "ti_le", None))
        return ok, lech, ghi or "khong_so"
    raise LoiDung("HP_DUNG_LOI", "loại mệnh đề '%s' không hỗ trợ" % l)


def thu_tu_dung(md, H):
    """Đồng dạng sai thứ tự -> hoán vị đỉnh tam giác 2 khiến mệnh đề đúng (hoặc None)."""
    t1, t2 = tach_diem(md["tg1"]), tach_diem(md["tg2"])
    for hv in itertools.permutations(t2):
        if list(hv) == t2:
            continue
        lech, _ = _khop_dong_dang(H, t1, list(hv))
        if lech < TOL_GOC:
            return "".join(hv)
    return None


# ---------------- đọc mệnh đề từ LaTeX ----------------
TOKEN = re.compile(r"\s*(\\angle\s*(?:" + TEN_DIEM + r"\s*){3}|\\frac|\\sqrt|\\cdot|\\times|DEG|\d+(?:\.\d+)?|(?:" + TEN_DIEM + r")+|[+\-*/()^{}])")


class _Doc:
    """Bộ đọc biểu thức nhỏ: góc (độ), đoạn thẳng (độ dài), số, + - · /, \\frac, \\sqrt, ^2. Không đọc được -> None."""

    def __init__(self, s, H):
        self.t, self.i, self.H, self.hinh = [], 0, H, False
        pos = 0
        s = s.strip()
        while pos < len(s):
            m = TOKEN.match(s, pos)
            if not m or m.end() == pos:
                raise ValueError("ký hiệu lạ")
            self.t.append(m.group(1).strip())
            pos = m.end()

    def nhin(self):
        return self.t[self.i] if self.i < len(self.t) else None

    def an(self, x=None):
        v = self.nhin()
        if x is not None and v != x:
            raise ValueError("thiếu " + x)
        self.i += 1
        return v

    def bieu_thuc(self):
        v = self.hang()
        while self.nhin() in ("+", "-"):
            op = self.an()
            w = self.hang()
            if v[1] != w[1]:
                raise ValueError("khác đơn vị")
            v = (v[0] + w[0] if op == "+" else v[0] - w[0], v[1])
        return v

    def hang(self):
        v = self.thua()
        while self.nhin() in ("\\cdot", "\\times", "*", "/") or (self.nhin() and (self.nhin()[0].isalnum() or self.nhin() in ("\\frac", "\\sqrt", "(") or self.nhin().startswith("\\angle"))):
            op = self.nhin()
            if op in ("\\cdot", "\\times", "*", "/"):
                self.an()
            w = self.thua()
            if op == "/":
                if abs(w[0]) < EPS:
                    raise ValueError("chia 0")
                v = (v[0] / w[0], (v[1][0] - w[1][0], v[1][1] - w[1][1]))
            else:
                v = (v[0] * w[0], (v[1][0] + w[1][0], v[1][1] + w[1][1]))
        return v

    def thua(self):
        v = self.nguyen_to()
        if self.nhin() == "^":
            self.an()
            if self.nhin() == "{":
                self.an()
                e = float(self.an())
                self.an("}")
            else:
                e = float(self.an())
            v = (v[0] ** e, (v[1][0] * e, v[1][1] * e))
        return v

    def nguyen_to(self):
        x = self.an()
        if x is None:
            raise ValueError("hết")
        if x == "-":
            v = self.nguyen_to()
            return (-v[0], v[1])
        if x in ("(", "{"):
            v = self.bieu_thuc()
            self.an(")" if x == "(" else "}")
            return v
        if x == "\\frac":
            self.an("{")
            a = self.bieu_thuc()
            self.an("}")
            self.an("{")
            b = self.bieu_thuc()
            self.an("}")
            if abs(b[0]) < EPS:
                raise ValueError("chia 0")
            return (a[0] / b[0], (a[1][0] - b[1][0], a[1][1] - b[1][1]))
        if x == "\\sqrt":
            self.an("{")
            a = self.bieu_thuc()
            self.an("}")
            return (math.sqrt(max(0, a[0])), (a[1][0] / 2, a[1][1] / 2))
        if x.startswith("\\angle"):
            ds = tach_diem(x[6:])
            self.hinh = True
            v = goc_do(self.H.d(ds[0]), self.H.d(ds[1]), self.H.d(ds[2]))
            return (v, (1, 0))
        if re.fullmatch(r"\d+(?:\.\d+)?", x):
            v = float(x)
            if self.nhin() == "DEG":
                self.an()
                return (v, (1, 0))
            return (v, (0, 0))
        ds = tach_diem(x)
        if len(ds) == 2 and "".join(ds).replace("_", "") == x.replace("_", "") and all(d in self.H.P for d in ds):
            self.hinh = True
            return (kc(self.H.d(ds[0]), self.H.d(ds[1])), (0, 1))
        raise ValueError("không đọc được " + x)


def danh_gia(s, H):
    """Chuỗi biểu thức -> (giá trị, (mũ độ, mũ dài), có_hình) hoặc None."""
    try:
        d = _Doc(s, H)
        v = d.bieu_thuc()
        if d.nhin() is not None:
            return None
        return (v[0], v[1], d.hinh)
    except (ValueError, LoiDung, IndexError, OverflowError):
        return None


def so_sanh(vs, ti_le=None):
    """Các vế cùng đơn vị phải bằng nhau. Vế độ dài thuần số chỉ so khi biết tỉ lệ thật (ti_le)."""
    nhom = {}
    so_thuan = [v for v, u, hinh in vs if not hinh and u == (0, 0)]
    for v, u, hinh in vs:
        if not hinh and u == (0, 0):
            continue
        nhom.setdefault(u, []).append((v, hinh))
    # vế chỉ là số ("BC = 5") -> so với vế độ dài khi đã biết tỉ lệ thật; với vế không thứ nguyên (tỉ số) thì so luôn
    for u in list(nhom):
        if (u[1] == 0 or ti_le) and u[0] == 0:
            nhom[u] += [(v, False) for v in so_thuan]
    lech_max, ok, ghi = 0.0, True, []
    for u, ds in nhom.items():
        if len(ds) < 2 or not any(h for _, h in ds):
            continue
        if u[1] != 0 and not ti_le:
            ds = [x for x in ds if x[1]]    # độ dài so với số -> chưa biết tỉ lệ thật: chỉ so vế có hình với nhau
            if len(ds) < 2:
                continue
        # quy về độ dài thật: vế hình nhân tỉ lệ^mũ, vế số giữ nguyên
        gt = [v * (ti_le ** u[1] if (ti_le and u[1] and h) else 1) for v, h in ds]
        if u == (1, 0) or u[1] == 0:
            lech = max(gt) - min(gt) if u == (1, 0) else (max(gt) - min(gt)) / max(abs(max(gt)), 1e-9)
            dat = lech < (TOL_GOC if u == (1, 0) else TOL_DAI * 10)
        else:
            lech = (max(gt) - min(gt)) / max(abs(max(gt)), 1e-9)
            dat = lech < TOL_DAI * 10
        lech_max = max(lech_max, lech)
        ok = ok and dat
        ghi.append(", ".join(("%.2f°" % g) if u == (1, 0) else ("%.4f" % g) for g in gt))
    return ok, lech_max, "; ".join(ghi)


def menh_de_tu_tex(tex):
    """Đọc mệnh đề từ dòng LaTeX: [{loai, ...}] (đẳng thức giữ dạng chuỗi để đánh giá trên từng cấu hình)."""
    s = bo_macro(tex)
    kq = []
    # thuộc đường tròn: "E, D \in (BC)"
    for m in re.finditer(r"((?:" + TEN_DIEM + r")(?:\s*,\s*(?:" + TEN_DIEM + r"))*)\s*\\in\s*\(\s*((?:" + TEN_DIEM + r"){1,3})\s*\)", s):
        for d in tach_diem(m.group(1)):
            kq.append({"loai": "thuoc", "diem": d, "a": "(" + "".join(tach_diem(m.group(2))) + ")", "nguon": "tex"})
    s = re.sub(r"((?:" + TEN_DIEM + r")(?:\s*,\s*(?:" + TEN_DIEM + r"))*)\s*\\in\s*\([^)]*\)", " ; ", s)
    cum = re.split(r"\\Rightarrow|\\Leftrightarrow|\\iff|\\implies|\\to|;|,|\\text|\\quad|\\(?:Longrightarrow|therefore|because)", s)
    for c in cum:
        # chú thích "(kề bù)", "(BEDC nội tiếp)" bị \text cắt đôi -> bỏ phần ngoặc hở ở hai đầu cụm
        c = re.sub(r"\([^()]*$", "", c.strip())
        c = re.sub(r"^[^()]*\)", "", c).strip()
        if not c:
            continue
        m = re.fullmatch(r"\\(?:triangle|Delta)\s*((?:" + TEN_DIEM + r"\s*){3})\\sim\s*\\(?:triangle|Delta)\s*((?:" + TEN_DIEM + r"\s*){3})(?:\s*\(.*\))?", c)
        if m:
            kq.append({"loai": "dong_dang", "tg1": "".join(tach_diem(m.group(1))), "tg2": "".join(tach_diem(m.group(2))), "nguon": "tex"})
            continue
        m = re.fullmatch(r"\\(?:triangle|Delta)\s*((?:" + TEN_DIEM + r"\s*){3})=\s*\\(?:triangle|Delta)\s*((?:" + TEN_DIEM + r"\s*){3})(?:\s*\(.*\))?", c)
        if m:
            kq.append({"loai": "bang_nhau", "tg1": "".join(tach_diem(m.group(1))), "tg2": "".join(tach_diem(m.group(2))), "nguon": "tex"})
            continue
        m = re.fullmatch(r"((?:" + TEN_DIEM + r"){2})\s*\\perp\s*((?:" + TEN_DIEM + r"){2})(?:\s+.*)?", c)
        if m:
            kq.append({"loai": "vuong_goc", "a": m.group(1), "b": m.group(2), "nguon": "tex"})
            continue
        m = re.fullmatch(r"((?:" + TEN_DIEM + r"){2})\s*(?:\\parallel|//|\\,?/\\!/)\s*((?:" + TEN_DIEM + r"){2})(?:\s+.*)?", c)
        if m:
            kq.append({"loai": "song_song", "a": m.group(1), "b": m.group(2), "nguon": "tex"})
            continue
        if "=" in c and "\\sim" not in c and "\\triangle" not in c:
            ve = [x.strip() for x in re.split(r"=|\\approx", c) if x.strip()]
            if len(ve) >= 2 and ("\\approx" not in c):
                kq.append({"loai": "bieu_thuc", "ve": ve, "mo_ta": c[:80], "nguon": "tex"})
    return kq


# ---------------- trang chứng minh: chuẩn hóa, khóa màu, đồng bộ cạnh ----------------
def chuan_trang(trang, toi_da=5):
    """Chia trang quá 5 dòng; trả (trang mới, cảnh báo)."""
    kq, cb = [], []
    for t in trang or []:
        if not isinstance(t, dict):
            continue
        dong = [d for d in (t.get("dong") or []) if isinstance(d, dict) and str(d.get("tex") or "").strip()]
        if not dong:
            continue
        if len(dong) > toi_da:
            cb.append({"ma": "HP_TRANG_QUA_DAI", "chi_tiet": "trang '%s' có %d dòng -> tự chia trang" % (t.get("tieu_de", ""), len(dong))})
        for k in range(0, len(dong), toi_da):
            kq.append(dict(t, dong=dong[k:k + toi_da], tieu_de=str(t.get("tieu_de") or "") + (" (tiếp)" if k else "")))
    return kq, cb


def khoa_mau(trang, C_khoa):
    """Khóa màu tuyệt đối giữa LaTeX và hình trên từng trang. Sửa tại chỗ; trả danh sách sửa/cảnh báo."""
    sua = []
    for t in trang:
        mau_tex = {}
        for d in t["dong"]:
            for mau, nd, _, _ in doan_mau(d["tex"]):
                for k in doi_tuong_tex(nd):
                    if k in mau_tex and mau_tex[k] != mau:
                        sua.append({"ma": "HP_MAU_LECH", "chi_tiet": "một đối tượng tô 2 màu trong cùng trang '%s'" % t.get("tieu_de", "")})
                    mau_tex.setdefault(k, mau)
        da_co = set()
        for d in t["dong"]:
            hd = [h for h in (d.get("hanh_dong_hinh") or []) if isinstance(h, dict)]
            for h in hd:
                k = khoa_hanh_dong(h)
                if h.get("loai") == "khung_bac_cau" or h.get("loai") == "ket_luan":
                    continue
                if h.get("mau") not in MAU_HOP_LE:
                    h["mau"] = mau_tex.get(k, "vang")
                    sua.append({"ma": "HP_MAU_LECH", "chi_tiet": "màu không hợp lệ -> %s" % h["mau"]})
                if k in mau_tex and mau_tex[k] != h["mau"]:
                    sua.append({"ma": "HP_MAU_LECH", "chi_tiet": "%s: hình %s ≠ chữ %s -> theo chữ" % (h.get("loai"), h["mau"], mau_tex[k])})
                    h["mau"] = mau_tex[k]
                if k:
                    da_co.add(k)
            d["hanh_dong_hinh"] = hd
        # đối tượng có màu trong chữ mà chưa có hành động trên hình -> tự thêm ở dòng đầu tiên tô nó
        for d in t["dong"]:
            for mau, nd, _, _ in doan_mau(d["tex"]):
                for k in doi_tuong_tex(nd):
                    if k in da_co:
                        continue
                    h = None
                    if k[0] == "goc":
                        a, b = sorted(k[2])
                        h = {"loai": "to_goc", "goc": a + k[1] + b, "mau": mau, "so_cung": 1, "tu_dong": True}
                    elif k[0] == "da_giac":
                        h = None  # thứ tự đỉnh không suy được từ tập -> cần khai báo; chỉ cảnh báo
                        sua.append({"ma": "HP_MAU_LECH", "chi_tiet": "đa giác tô màu trong chữ nhưng không có to_da_giac trên hình"})
                    elif k[0] == "doan":
                        a, b = sorted(k[1])
                        h = {"loai": "nhan_manh_doan", "doan": a + b, "mau": mau, "tu_dong": True}
                    elif k[0] == "tron" and k[1] in C_khoa:
                        h = {"loai": "duong_tron_phu", "khoa": k[1], "mau": mau, "tu_dong": True}
                    if h:
                        d["hanh_dong_hinh"].append(h)
                        da_co.add(k)
                        sua.append({"ma": "HP_MAU_TU_THEM", "chi_tiet": "tự thêm %s màu %s" % (h["loai"], mau)})
    return sua


def doan_can(d):
    """Các đoạn thẳng mà dòng chứng minh (chữ + hành động) cần có trên hình."""
    can = []
    s = bo_macro(d.get("tex"))
    for m in re.finditer(r"\\angle\s*((?:" + TEN_DIEM + r"\s*){3})", s):
        a, o, b = tach_diem(m.group(1))
        can += [(o, a), (o, b)]
    for m in re.finditer(r"\\(?:triangle|Delta)\s*((?:" + TEN_DIEM + r"\s*){3})", s):
        ds = tach_diem(m.group(1))
        can += [(ds[k], ds[(k + 1) % 3]) for k in range(3)]
    for m in re.finditer(r"((?:" + TEN_DIEM + r"){2})\s*(?:\\perp|\\parallel|//)\s*((?:" + TEN_DIEM + r"){2})", s):
        can += [tuple(tach_diem(m.group(1))), tuple(tach_diem(m.group(2)))]
    for h in d.get("hanh_dong_hinh") or []:
        l = h.get("loai")
        if l in ("to_goc", "ky_hieu_vuong") and len(tach_diem(h.get("goc"))) == 3:
            a, o, b = tach_diem(h["goc"])
            can += [(o, a), (o, b)]
        elif l == "to_da_giac":
            ds = tach_diem("".join(h.get("dinh")) if isinstance(h.get("dinh"), list) else h.get("dinh"))
            can += [(ds[k], ds[(k + 1) % len(ds)]) for k in range(len(ds))]
        elif l == "nhan_manh_doan" and len(tach_diem(h.get("doan"))) == 2:
            can.append(tuple(tach_diem(h["doan"])))
    return can


def da_phu(a, b, ve, P):
    """Đoạn ab đã nằm trọn trên một nét đã vẽ."""
    if a not in P or b not in P:
        return True
    for x, y in ve:
        if x in P and y in P and tren_doan(P[a], P[x], P[y], 1e-6) and tren_doan(P[b], P[x], P[y], 1e-6):
            return True
    return False


def dong_bo_canh(trang, H):
    """Edge Auto-Sync: cạnh nhắc trong chứng minh mà phép dựng quên -> nét bổ sung ĐÚNG dòng đầu tiên nhắc tới."""
    ve = list(H.doan_da_ve())
    them, thieu_diem = [], set()
    for ti, t in enumerate(trang):
        for di, d in enumerate(t["dong"]):
            d["bo_sung"] = []
            for a, b in doan_can(d):
                a, b = chuan_ten(a), chuan_ten(b)
                for x in (a, b):
                    if x not in H.P:
                        thieu_diem.add(x)
                if a == b or a not in H.P or b not in H.P or da_phu(a, b, ve, H.P):
                    continue
                d["bo_sung"].append([a, b])
                ve.append((a, b))
                them.append("%s%s (trang %d dòng %d)" % (a, b, ti + 1, di + 1))
    return them, sorted(thieu_diem)
