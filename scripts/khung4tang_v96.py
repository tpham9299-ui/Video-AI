#!/usr/bin/env python3
"""v96 — SÂN KHẤU 2D cho khung 4 tầng (thuần Python, không gọi mạng; test: scripts/test_v96.py).

Bản Python của SanKhau.gs (Apps Script) — hai bản phải khớp nhau (test_v96_gs.cjs so khớp kết quả).
  - Bộ định tuyến chon_san_khau(): hình phẳng v94 (không đụng) -> khuôn 3D vật thể thật -> 4 mô-đun Xác suất
    (rut_mau | so_do_cay | luoi_bayes | cot_phan_phoi) -> nhánh 2D thực tế (kinh_te_do_thi | so_do_2d | tang_truong)
    -> đường lui tu_duy_dai_so. Ghi chú đạo diễn (chi_dao) được ưu tiên nhưng không vượt GDPT 2018.
  - Máy TỰ TÍNH phần xác suất: liệt kê tổ hợp khi n(Ω) <= 100 000 (lớn hơn -> lấy mẫu có hạt giống cố định), nhóm thẻ
    THEO GIÁ TRỊ phần tử (không bao giờ theo chỉ số ô), chọn bộ minh họa đúng biến cố đang giảng (Ā khi giảng biến cố
    đối, A khi chốt P(A)), đối chiếu đáp án.
  - Ký hiệu: "không chia hết" = `\\text{ không } \\vdots` trong công thức, "không ⋮" ở chữ thường (cấm \\not\\vdots / \\nmid).
  - Quét mã TeX thô ở trường chữ thường (Intro, Outro, nút CTA) -> đổi sang chữ Unicode đúng nghĩa.
  - Phiên âm Tổ hợp – Xác suất cho TTS (doc_toan_v96), dạng đọc số tiếng Việt (cac_dang_doc_so) cho kiểm câu cụt.
"""
import itertools
import json
import math
import random
if __package__:
    from .khung4tang_v93 import cat_nhan
else:
    from khung4tang_v93 import cat_nhan
import re
from fractions import Fraction

TRAN_VET_CAN = 100000          # n(Ω) <= ngưỡng này: liệt kê toàn bộ; lớn hơn: lấy mẫu
SO_MAU_UOC_LUONG = 20000
LOAI_XS = ("rut_mau", "so_do_cay", "luoi_bayes", "cot_phan_phoi")
LOAI_2D_TT = ("kinh_te_do_thi", "so_do_2d", "tang_truong")
LOAI_SAN_KHAU = LOAI_XS + LOAI_2D_TT + ("tu_duy_dai_so",)
MAU = ("cyan", "vang", "hong", "ngoc", "trang", "xam")
MAU_GAN = {"xanh": "cyan", "xanh_duong": "cyan", "lam": "cyan", "blue": "cyan", "vàng": "vang", "yellow": "vang", "cam": "vang",
           "do": "hong", "đỏ": "hong", "red": "hong", "tim": "hong", "hồng": "hong", "pink": "hong", "xanh_la": "ngoc", "green": "ngoc",
           "lá": "ngoc", "white": "trang", "trắng": "trang", "gray": "xam", "grey": "xam", "xám": "xam", "đen": "xam"}
# màu bi trong đề -> màu sân khấu (bi đỏ phải ra màu hồng-đỏ, không phải cyan)
MAU_BI = [("đỏ", "hong"), ("hồng", "hong"), ("xanh lá", "ngoc"), ("xanh lục", "ngoc"), ("xanh", "cyan"), ("vàng", "vang"),
          ("cam", "vang"), ("trắng", "trang"), ("đen", "xam"), ("tím", "hong"), ("nâu", "xam")]


def mau_chuan(m, md="cyan"):
    k = str(m or "").strip().lower().replace(" ", "_")
    k = MAU_GAN.get(k, k)
    return k if k in MAU else md


# ====================================================================================================================
# 1. SỐ & PHÂN SỐ
# ====================================================================================================================
def doc_ti_le(x):
    """'7/12', '\\frac{7}{12}', '0,8', '80%', 0.8 -> Fraction (None nếu không đọc được)."""
    if isinstance(x, bool) or x is None:
        return None
    if isinstance(x, (int, float)):
        return Fraction(x).limit_denominator(10 ** 6) if math.isfinite(x) else None
    s = str(x).strip().replace("{,}", ",").replace(" ", "").replace("$", "")
    m = re.fullmatch(r"\\[dt]?frac\{(-?\d+)\}\{(\d+)\}", s) or re.fullmatch(r"(-?\d+)/(\d+)", s)
    if m:
        return Fraction(int(m.group(1)), int(m.group(2))) if int(m.group(2)) else None
    m = re.fullmatch(r"(-?\d+(?:[.,]\d+)?)%", s)
    if m:
        return Fraction(m.group(1).replace(",", ".")) / 100
    m = re.fullmatch(r"-?\d+(?:[.,]\d+)?", s)
    return Fraction(s.replace(",", ".")) if m else None


def gia_tri_dap_an(dap):
    """Giá trị xác suất trong chuỗi đáp án -> (Fraction, sai_so_cho_phép) | None. Ưu tiên phân số, rồi thập phân/%."""
    s = str(dap or "").replace("{,}", ",")
    m = re.search(r"\\[dt]?frac\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}", s) or re.search(r"(?<![\d.,])(\d+)\s*/\s*(\d+)(?![\d.,])", s)
    if m and int(m.group(2)):
        return Fraction(int(m.group(1)), int(m.group(2))), Fraction(1, 10 ** 9)
    m = re.search(r"(?<![\d.,])(\d+(?:[.,](\d+))?)\s*%", s)
    if m:
        le = len(m.group(2) or "")
        return Fraction(m.group(1).replace(",", ".")) / 100, Fraction(5, 10 ** (le + 3))
    m = re.search(r"(?<![\d.,])(0[.,](\d+)|1(?:[.,]0+)?)(?![\d])", s)
    if m:
        le = len(m.group(2) or "")
        return Fraction(m.group(1).replace(",", ".")), Fraction(5, 10 ** (le + 1)) if le else Fraction(1, 10 ** 9)
    return None


def khop_dap_an(p, dap):
    """True/False khi đọc được đáp án; None khi không đọc được (không kết luận)."""
    g = gia_tri_dap_an(dap)
    if g is None or p is None:
        return None
    return abs(Fraction(p) - g[0]) <= g[1]


def so_tex(x, so_le=4):
    """Fraction/float -> chuỗi TeX kiểu Việt: 5/6 -> \\dfrac{5}{6}; 0,72 -> 0{,}72; 3 -> 3."""
    if isinstance(x, Fraction):
        if x.denominator == 1:
            return str(x.numerator)
        d = x.denominator
        while d % 2 == 0:
            d //= 2
        while d % 5 == 0:
            d //= 5
        if d == 1 and len(repr(float(x)).split(".")[-1]) <= max(so_le, 4):   # thập phân hữu hạn ngắn (0,0099; 0,0495) -> số thập phân
            return so_viet(float(x), max(so_le, 4))
        return "\\dfrac{%d}{%d}" % (x.numerator, x.denominator)
    return so_viet(float(x), so_le)


def so_viet(x, so_le=4):
    s = ("%." + str(so_le) + "f") % float(x)
    s = s.rstrip("0").rstrip(".") if "." in s else s
    return s.replace(".", "{,}") if s not in ("-0",) else "0"


# ---------- đọc số tiếng Việt (cho kiểm câu cụt công thức: 120 ↔ "một trăm hai mươi") ----------
CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]


def doc_nguyen(n):
    n = int(n)
    if n < 0:
        return "âm " + doc_nguyen(-n)
    if n < 10:
        return CHU_SO[n]
    if n < 20:
        return "mười" + ("" if n == 10 else " " + ("lăm" if n % 10 == 5 else CHU_SO[n % 10]))
    if n < 100:
        c, d = divmod(n, 10)
        return CHU_SO[c] + " mươi" + ("" if d == 0 else " " + ("mốt" if d == 1 else "tư" if d == 4 else "lăm" if d == 5 else CHU_SO[d]))
    if n < 1000:
        t, r = divmod(n, 100)
        s = CHU_SO[t] + " trăm"
        return s if r == 0 else s + (" linh " + CHU_SO[r] if r < 10 else " " + doc_nguyen(r))
    if n < 10 ** 6:
        ng, r = divmod(n, 1000)
        s = doc_nguyen(ng) + " nghìn"
        if r == 0:
            return s
        return s + (" không trăm linh " + CHU_SO[r] if r < 10 else " không trăm " + doc_nguyen(r) if r < 100 else " " + doc_nguyen(r))
    tr, r = divmod(n, 10 ** 6)
    return doc_nguyen(tr) + " triệu" + ("" if r == 0 else " " + doc_nguyen(r))


def cac_dang_doc_so(s):
    """'2/3' -> ['2/3', '2 phần 3', 'hai phần ba']; '0,5' -> ['0,5', 'không phẩy năm']; '120' -> ['120', 'một trăm hai mươi']."""
    s = str(s or "").strip().replace("{,}", ",").replace("\\dfrac", "\\frac")
    m = re.fullmatch(r"\\frac\{(\d+)\}\{(\d+)\}", s) or re.fullmatch(r"(\d+)\s*/\s*(\d+)", s)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        return ["%d/%d" % (a, b), "%d phần %d" % (a, b), "%s phần %s" % (doc_nguyen(a), doc_nguyen(b))]
    m = re.fullmatch(r"(\d+)[.,](\d+)", s)
    if m:
        a, b = m.group(1), m.group(2)
        doc_b = doc_nguyen(int(b)) if not b.startswith("0") else " ".join(CHU_SO[int(c)] for c in b)
        return ["%s,%s" % (a, b), "%s.%s" % (a, b), "%s phẩy %s" % (doc_nguyen(int(a)), doc_b),
                "%s phẩy %s" % (doc_nguyen(int(a)), " ".join(CHU_SO[int(c)] for c in b))]
    m = re.fullmatch(r"(\d+)\s*%", s)
    if m:
        return [s, "%s phần trăm" % m.group(1), "%s phần trăm" % doc_nguyen(int(m.group(1)))]
    m = re.fullmatch(r"\d+", s)
    if m:
        n = int(s)
        ra = [s, doc_nguyen(n)]
        if n >= 1000:
            ra.append("%s.%03d" % (n // 1000, n % 1000))
        return ra
    return [s]


# ====================================================================================================================
# 2. KÝ HIỆU & MÃ TeX THÔ
# ====================================================================================================================
RE_KHONG_CHIA_HET = re.compile(r"\\not\s*\\vdots|\\nmid|∤|\\not\s*⋮|(?<![\wÀ-ỹ])not\s*⋮")
MACRON = {"A": "Ā", "E": "Ē", "I": "Ī", "O": "Ō", "U": "Ū", "a": "ā", "e": "ē", "i": "ī", "o": "ō", "u": "ū"}


def chuan_khong_chia_het(s, kieu="tex"):
    """kieu='tex' (công thức KaTeX) -> \\text{ không } \\vdots ; 'tron' (ChuTron tách theo khoảng trắng) -> không \\vdots ;
    'chu' (chữ thường không KaTeX) -> không ⋮."""
    thay = {"tex": r"\\text{ không } \\vdots ", "tron": r"không \\vdots ", "chu": "không ⋮ "}[kieu]
    x = RE_KHONG_CHIA_HET.sub(thay, str(s or ""))
    return re.sub(r"[ \t]{2,}", " ", x).strip()


SO_TREN = str.maketrans("0123456789+-n", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ")
SO_DUOI = str.maketrans("0123456789+-nk", "₀₁₂₃₄₅₆₇₈₉₊₋ₙₖ")
LENH_CHU = {"cdot": "·", "times": "×", "le": "≤", "leq": "≤", "ge": "≥", "geq": "≥", "ne": "≠", "neq": "≠", "approx": "≈",
            "Omega": "Ω", "omega": "ω", "cap": "∩", "cup": "∪", "in": "∈", "pi": "π", "vdots": "⋮", "Rightarrow": "⇒", "to": "→",
            "alpha": "α", "beta": "β", "Delta": "Δ", "infty": "∞", "emptyset": "∅", "mid": "|", "max": "max", "min": "min"}


def tex_sang_chu(s):
    """Mã TeX -> chữ Unicode GIỮ NGHĨA (khác chu_sach cũ xóa trắng lệnh làm '\\overline{A}' thành 'A', '\\not\\vdots' biến mất):
    \\overline{A} -> Ā, \\not\\vdots -> không ⋮, \\Omega -> Ω, C_{10}^{3} -> C₁₀³, \\frac{a}{b} -> a/b, Omega -> Ω."""
    x = chuan_khong_chia_het(str(s or ""), "chu").replace("$", "")
    x = re.sub(r"\\\\(?=[A-Za-z])", r"\\", x)
    for _ in range(4):
        x0 = x
        x = re.sub(r"\\(?:overline|bar)\s*\{\s*([A-Za-z])\s*\}|\\bar\s+([A-Za-z])",
                   lambda m: MACRON.get(m.group(1) or m.group(2), (m.group(1) or m.group(2)) + "\u0304"), x)
        x = re.sub(r"\\(?:overline|bar)\s*\{([^{}]*)\}", lambda m: "".join(c + "\u0304" for c in m.group(1)), x)
        x = re.sub(r"\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", lambda m: "%s/%s" % (m.group(1), m.group(2)), x)
        x = re.sub(r"\\binom\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"C(\1,\2)", x)
        x = re.sub(r"\\(?:text|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}", r"\1", x)
        x = re.sub(r"\\sqrt\s*\{([^{}]*)\}", r"√(\1)", x)
        if x == x0:
            break
    x = re.sub(r"_\{([0-9+\-nk]+)\}|_([0-9nk])", lambda m: (m.group(1) or m.group(2)).translate(SO_DUOI), x)
    x = re.sub(r"\^\{([0-9+\-n]+)\}|\^([0-9n])", lambda m: (m.group(1) or m.group(2)).translate(SO_TREN), x)
    x = re.sub(r"\\([A-Za-z]+)", lambda m: LENH_CHU.get(m.group(1), ""), x)
    x = re.sub(r"(?<![A-Za-z\\])Omega(?![A-Za-z])", "Ω", x)
    x = re.sub(r"\{,\}", ",", x)
    x = re.sub(r"[{}]", "", x).replace("\\", "")
    return re.sub(r"\s+", " ", x).strip()


RE_MA_THO = re.compile(r"\\[A-Za-z]+|\\\\|[_^]\{|(?<![A-Za-z])Omega(?![A-Za-z])|\bC_\d|(?<![A-Za-z])not\s*⋮")


def co_ma_tho(s):
    return bool(RE_MA_THO.search(str(s or "")))


def sua_ma_tho_props(k4):
    """Trường CHỮ THƯỜNG của props.khung4tang (Intro, Outro, CTA) -> Unicode giữ nghĩa; trường KaTeX/ChuTron -> chuẩn ký hiệu
    'không chia hết'. Trả danh sách chỗ đã sửa."""
    sua = []
    mc = k4.get("mocCau") or {}
    for k in ("nhan_thi", "tieu_de", "phu_de", "cau_hook", "cta"):
        if isinstance(mc.get(k), str) and (co_ma_tho(mc[k]) or RE_KHONG_CHIA_HET.search(mc[k])):
            mc[k] = tex_sang_chu(mc[k])
            sua.append("mocCau." + k)
    if isinstance(k4.get("cta"), str) and co_ma_tho(k4["cta"]):
        k4["cta"] = tex_sang_chu(k4["cta"])
        sua.append("cta")
    for d in k4.get("tomTat") or []:
        if isinstance(d, dict):
            if RE_KHONG_CHIA_HET.search(str(d.get("chien_thuat") or "")):
                d["chien_thuat"] = chuan_khong_chia_het(d["chien_thuat"], "tron")
                sua.append("tomTat.chien_thuat")
            if RE_KHONG_CHIA_HET.search(str(d.get("cong_thuc") or "")):
                d["cong_thuc"] = chuan_khong_chia_het(d["cong_thuc"], "tex")
                sua.append("tomTat.cong_thuc")
    for b in k4.get("buoc") or []:
        for k in ("tieu_de", "nhan"):
            if RE_KHONG_CHIA_HET.search(str(b.get(k) or "")):
                b[k] = chuan_khong_chia_het(b[k], "tron")
                sua.append("buoc." + k)
        for th in b.get("the") or []:
            if th.get("loai") == "cong_thuc":
                moi = [chuan_khong_chia_het(d, "tex") for d in th.get("dong") or []]
                if moi != th.get("dong"):
                    th["dong"] = moi
                    sua.append("the.dong")
            for k in ("noi_dung", "nhan", "ket_qua"):
                if RE_KHONG_CHIA_HET.search(str(th.get(k) or "")):
                    th[k] = chuan_khong_chia_het(th[k], "tron")
                    sua.append("the." + k)
    for d in k4.get("deGhim") or []:
        if RE_KHONG_CHIA_HET.search(str(d.get("nhan") or "")):
            d["nhan"] = chuan_khong_chia_het(d["nhan"], "tex")
            sua.append("deGhim")
    return sua


# ====================================================================================================================
# 3. PHIÊN ÂM TTS TỔ HỢP – XÁC SUẤT (chạy TRƯỚC doc_toan_v95 / sua_chinh_ta vì các bước đó xóa lệnh TeX và ngoặc)
# ====================================================================================================================
def _bien_co_doc(x):
    x = x.strip()
    m = re.fullmatch(r"\\(?:overline|bar)\s*\{?\s*([A-Za-z])\s*\}?|([ĀĒĪŌŪ])|([A-Za-z])\u0304", x)
    if m:
        c = m.group(1) or {"Ā": "A", "Ē": "E", "Ī": "I", "Ō": "O", "Ū": "U"}.get(m.group(2) or "", "") or m.group(3)
        return "biến cố đối %s ngang" % c, True
    x = re.sub(r"\\cap|∩", " giao ", x)
    x = re.sub(r"\\cup|∪", " hợp ", x)
    return re.sub(r"\s+", " ", x).strip(), False


def doc_toan_v96(s):
    r"""C_{10}^{3} / C(10,3) / \binom{10}{3} -> "tổ hợp chập 3 của 10"; A_{n}^{k} -> "chỉnh hợp chập k của n";
    n(\Omega) -> "số phần tử không gian mẫu"; P(A) -> "xác suất của A"; P(\overline{A}) / P(Ā) -> "xác suất biến cố đối A ngang";
    P(A|B) -> "xác suất của A với điều kiện B"; ⋮ -> "chia hết cho"; ∤ / \not\vdots / không ⋮ -> "không chia hết cho"."""
    s = str(s or "").replace("{,}", ",")
    s = re.sub(r"\\[dt]?binom\s*\{\s*(\w+)\s*\}\s*\{\s*(\w+)\s*\}", r" tổ hợp chập \2 của \1 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])C\s*_\s*\{?\s*(\w+?)\s*\}?\s*\^\s*\{?\s*(\w+)\s*\}?(?![\w])", r" tổ hợp chập \2 của \1 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])C\s*\^\s*\{?\s*(\w+?)\s*\}?\s*_\s*\{?\s*(\w+)\s*\}?(?![\w])", r" tổ hợp chập \1 của \2 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])C\s*\(\s*(\d+|[nk])\s*[,;]\s*(\d+|[nk])\s*\)", r" tổ hợp chập \2 của \1 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])C(\d+)(?=\s*=)", lambda m: m.group(0), s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])A\s*_\s*\{?\s*(\w+?)\s*\}?\s*\^\s*\{?\s*(\w+)\s*\}?(?![\w])", r" chỉnh hợp chập \2 của \1 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])A\s*\(\s*(\d+|n)\s*[,;]\s*(\d+|k)\s*\)", r" chỉnh hợp chập \2 của \1 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])n\s*\(\s*(?:\\Omega|Ω|Omega)\s*\)|\|\s*(?:\\Omega|Ω)\s*\|", " số phần tử không gian mẫu ", s)

    def _n(m):
        x, doi = _bien_co_doc(m.group(1))
        return " số phần tử của " + (x.replace("biến cố đối ", "") if doi else x) + " "
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])n\s*\(\s*((?:\\overline\s*\{\s*[A-Za-z]\s*\}|\\bar\s*\{?[A-Za-z]\}?|[ĀĒĪŌŪ]|[A-Z]\u0304?)(?:\s*(?:\\cap|∩|\\cup|∪)\s*[A-Z])?)\s*\)", _n, s)

    def _p(m):
        a, doi = _bien_co_doc(m.group(1))
        if m.group(2):
            b, _ = _bien_co_doc(m.group(2))
            return " xác suất của %s với điều kiện %s " % (a.replace("biến cố đối ", ""), b.replace("biến cố đối ", ""))
        return " xác suất %s " % (a if doi else "của " + a)
    bc = r"(?:\\overline\s*\{\s*[A-Za-z]\s*\}|\\bar\s*\{?[A-Za-z]\}?|[ĀĒĪŌŪ]|[A-Z]\u0304?)(?:\s*(?:\\cap|∩|\\cup|∪)\s*(?:\\overline\s*\{\s*[A-Za-z]\s*\}|[A-Z]))?"
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])P\s*\(\s*(" + bc + r")\s*(?:(?:\\mid|\||∣)\s*(" + bc + r"))?\s*\)", _p, s)
    s = RE_KHONG_CHIA_HET.sub(" không chia hết cho ", s)
    s = re.sub(r"\\text\s*\{\s*không\s*\}\s*(?:\\vdots|⋮)", " không chia hết cho ", s)
    s = re.sub(r"\\vdots|⋮", " chia hết cho ", s)
    s = re.sub(r"không\s+không chia hết cho", "không chia hết cho", s)
    s = re.sub(r"\\Omega|(?<![A-Za-z])Ω", " ô mê ga ", s)
    s = re.sub(r"[ \t]+", " ", s)
    return re.sub(r" +([,.;:!?])", r"\1", s).strip()


# ====================================================================================================================
# 4. MÔ-ĐUN RÚT MẪU (thẻ số / bi màu / xúc xắc) — nhóm theo GIÁ TRỊ, biến cố bằng vị từ
# ====================================================================================================================
def _v2(n):
    n = abs(int(n))
    if n == 0:
        return 99
    k = 0
    while n % 2 == 0:
        n //= 2
        k += 1
    return k


def _la_nguyen_to(n):
    n = int(n)
    return n >= 2 and all(n % d for d in range(2, int(n ** 0.5) + 1))


def vi_tu_nhan(nhan):
    """Nhãn nhóm bằng lời -> hàm (gia_tri -> bool) | None. Hiểu: chẵn, lẻ, chia hết cho k, không chia hết cho k (⋮ / ∤ /
    \\not\\vdots / \\text{ không } \\vdots), số nguyên tố, lớn hơn / nhỏ hơn k. Nhiều điều kiện trong một nhãn = VÀ."""
    s = chuan_khong_chia_het(str(nhan or ""), "chu").lower()
    s = re.sub(r"\\text\s*\{\s*không\s*\}\s*(?:\\vdots|⋮)", " không ⋮ ", s)
    s = s.replace("\\vdots", "⋮").replace("$", "")
    dk = []
    for m in re.finditer(r"(không\s*(?:chia hết cho|⋮)|chia hết cho|⋮)\s*(\d+)", s):
        k = int(m.group(2))
        if k:
            dk.append((lambda v, k=k, phu=m.group(1).startswith("không"): (v % k != 0) if phu else (v % k == 0)))
    s2 = re.sub(r"(không\s*(?:chia hết cho|⋮)|chia hết cho|⋮)\s*\d+", " ", s)
    if re.search(r"\bchẵn\b", s2):
        dk.append(lambda v: v % 2 == 0)
    if re.search(r"\blẻ\b", s2):
        dk.append(lambda v: v % 2 == 1)
    if re.search(r"nguyên tố", s2):
        dk.append((lambda v: not _la_nguyen_to(v)) if re.search(r"không\s+(?:là\s+)?(?:số\s+)?nguyên tố", s2) else _la_nguyen_to)
    for m in re.finditer(r"(lớn hơn|>|nhỏ hơn|<|không quá|≤|ít nhất|≥)\s*(\d+)", s2):
        k, op = int(m.group(2)), m.group(1)
        dk.append({"lớn hơn": lambda v, k=k: v > k, ">": lambda v, k=k: v > k, "nhỏ hơn": lambda v, k=k: v < k, "<": lambda v, k=k: v < k,
                   "không quá": lambda v, k=k: v <= k, "≤": lambda v, k=k: v <= k, "ít nhất": lambda v, k=k: v >= k, "≥": lambda v, k=k: v >= k}[op])
    if not dk:
        return None
    return lambda v: all(f(v) for f in dk)


def nhom_tu_bien_co(gia_tri, bc):
    """Nhóm mặc định đúng bản chất toán của biến cố (khi AI không ghi nhóm dùng được)."""
    loai, k = bc.get("loai"), int(bc.get("so") or 0)
    if loai == "tich_chia_het" and k == 4:
        return [{"nhan": "\\vdots 4", "mau": "vang", "phan_tu": [v for v in gia_tri if _v2(v) >= 2]},
                {"nhan": "\\text{chẵn, không } \\vdots 4", "mau": "cyan", "phan_tu": [v for v in gia_tri if _v2(v) == 1]},
                {"nhan": "\\text{lẻ}", "mau": "xam", "phan_tu": [v for v in gia_tri if v % 2]}]
    if loai == "tich_chia_het" and k == 8:
        return [{"nhan": "\\vdots 8", "mau": "vang", "phan_tu": [v for v in gia_tri if _v2(v) >= 3]},
                {"nhan": "\\vdots 4\\text{, không } \\vdots 8", "mau": "ngoc", "phan_tu": [v for v in gia_tri if _v2(v) == 2]},
                {"nhan": "\\text{chẵn, không } \\vdots 4", "mau": "cyan", "phan_tu": [v for v in gia_tri if _v2(v) == 1]},
                {"nhan": "\\text{lẻ}", "mau": "xam", "phan_tu": [v for v in gia_tri if v % 2]}]
    if loai == "tich_chia_het" and k >= 2:
        return [{"nhan": "\\vdots %d" % k, "mau": "vang", "phan_tu": [v for v in gia_tri if v % k == 0]},
                {"nhan": "\\text{không } \\vdots %d" % k, "mau": "xam", "phan_tu": [v for v in gia_tri if v % k]}]
    if loai in ("tong_chia_het",) and k in (3, 5):
        ten = {0: "\\vdots %d" % k}
        return [{"nhan": ten.get(r, "\\text{chia %d dư %d}" % (k, r)), "mau": MAU[r % 4], "phan_tu": [v for v in gia_tri if v % k == r]} for r in range(k)]
    if loai in ("tong_chia_het", "tong_bang", "tong_lon_hon", "tong_nho_hon", "tich_chia_het"):
        return [{"nhan": "\\text{chẵn}", "mau": "cyan", "phan_tu": [v for v in gia_tri if v % 2 == 0]},
                {"nhan": "\\text{lẻ}", "mau": "hong", "phan_tu": [v for v in gia_tri if v % 2]}]
    return []


def thoa_bien_co(bo, bc, nhom_cua):
    """bo = các phần tử (dict có gia_tri, nhom). bc = vị từ. nhom_cua = chỉ số nhóm theo tên nhóm."""
    loai = bc.get("loai")
    gt = [p.get("gia_tri") for p in bo]
    so = bc.get("so")
    ok = None
    if loai in ("tich_chia_het", "tong_chia_het", "tong_bang", "tong_lon_hon", "tong_nho_hon", "tong_it_nhat", "tong_toi_da"):
        if any(not isinstance(v, (int, float)) for v in gt):
            return None
        tich, tong = 1, 0
        for v in gt:
            tich *= v
            tong += v
        k = int(so or 0)
        ok = {"tich_chia_het": k and tich % k == 0, "tong_chia_het": k and tong % k == 0, "tong_bang": tong == so,
              "tong_lon_hon": tong > so, "tong_nho_hon": tong < so, "tong_it_nhat": tong >= so, "tong_toi_da": tong <= so}[loai]
    elif loai in ("it_nhat_mot", "dung", "khong_co"):
        g = nhom_cua(bc.get("nhom"))
        if g is None:
            return None
        d = sum(1 for p in bo if p.get("nhom") == g)
        ok = d >= 1 if loai == "it_nhat_mot" else d == 0 if loai == "khong_co" else d == int(bc.get("so_luong") or 0)
    elif loai == "cung_nhom":
        ok = len({p.get("nhom") for p in bo}) == 1
    elif loai == "khac_nhom":
        ok = len({p.get("nhom") for p in bo}) == len(bo)
    else:
        return None
    ok = bool(ok)
    return (not ok) if bc.get("phu_dinh") else ok


def suy_bien_co(van):
    """Biến cố từ lời đề (khi AI không ghi bien_co)."""
    t = str(van or "").lower()
    m = re.search(r"tích[^.;?]{0,40}?(?:chia hết cho|⋮|\\vdots)\s*(\d+)", t)
    if m:
        return {"loai": "tich_chia_het", "so": int(m.group(1)), "phu_dinh": bool(re.search(r"tích[^.;?]{0,30}?không\s*(?:chia hết|⋮)", t))}
    if re.search(r"tích[^.;?]{0,30}?(?:là\s*)?(?:một\s*)?số chẵn", t):
        return {"loai": "tich_chia_het", "so": 2}
    if re.search(r"tích[^.;?]{0,30}?(?:là\s*)?(?:một\s*)?số lẻ", t):
        return {"loai": "tich_chia_het", "so": 2, "phu_dinh": True}
    m = re.search(r"tổng[^.;?]{0,40}?(?:chia hết cho|⋮|\\vdots)\s*(\d+)", t)
    if m:
        return {"loai": "tong_chia_het", "so": int(m.group(1)), "phu_dinh": bool(re.search(r"tổng[^.;?]{0,30}?không\s*(?:chia hết|⋮)", t))}
    if re.search(r"tổng[^.;?]{0,30}?(?:là\s*)?(?:một\s*)?số chẵn", t):
        return {"loai": "tong_chia_het", "so": 2}
    if re.search(r"tổng[^.;?]{0,30}?(?:là\s*)?(?:một\s*)?số lẻ", t):
        return {"loai": "tong_chia_het", "so": 2, "phu_dinh": True}
    m = re.search(r"tổng[^.;?]{0,30}?(bằng|lớn hơn|nhỏ hơn|không nhỏ hơn|không vượt quá|ít nhất là)\s*(\d+)", t)
    if m:
        return {"loai": {"bằng": "tong_bang", "lớn hơn": "tong_lon_hon", "nhỏ hơn": "tong_nho_hon", "không nhỏ hơn": "tong_it_nhat",
                         "ít nhất là": "tong_it_nhat", "không vượt quá": "tong_toi_da"}[m.group(1)], "so": int(m.group(2))}
    m = re.search(r"ít nhất (?:một|1)\s*(?:viên|quả|thẻ|bạn|người)?\s*(?:bi\s*)?(?:màu\s*)?(đỏ|xanh lá|xanh|vàng|trắng|đen|nữ|nam)", t)
    if m:
        return {"loai": "it_nhat_mot", "nhom": m.group(1)}
    m = re.search(r"(?:đúng|có)\s*(\d+|hai|ba|một)\s*(?:viên|quả|thẻ|bạn|người)?\s*(?:bi\s*)?(?:màu\s*)?(đỏ|xanh lá|xanh|vàng|trắng|đen|nữ|nam)", t)
    if m:
        sl = {"một": 1, "hai": 2, "ba": 3}.get(m.group(1), None) or int(m.group(1))
        return {"loai": "dung", "nhom": m.group(2), "so_luong": sl}
    if re.search(r"cùng màu", t):
        return {"loai": "cung_nhom"}
    if re.search(r"khác màu|đủ (?:ba|3) màu|ba màu khác nhau", t):
        return {"loai": "khac_nhom"}
    return None


def mo_ta_bien_co(bc, k):
    """TeX ngắn của biến cố A cho sân khấu."""
    loai, so = bc.get("loai"), bc.get("so")
    phu = bc.get("phu_dinh")
    if loai == "tich_chia_het":
        return ("\\text{Tích không } \\vdots %s" if phu else "\\text{Tích } \\vdots %s") % so
    if loai == "tong_chia_het":
        return ("\\text{Tổng không } \\vdots %s" if phu else "\\text{Tổng } \\vdots %s") % so
    if loai in ("tong_bang", "tong_lon_hon", "tong_nho_hon", "tong_it_nhat", "tong_toi_da"):
        return "\\text{Tổng } %s %s" % ({"tong_bang": "=", "tong_lon_hon": ">", "tong_nho_hon": "<", "tong_it_nhat": "\\ge", "tong_toi_da": "\\le"}[loai], so)
    if loai == "it_nhat_mot":
        return "\\text{Ít nhất 1 %s}" % bc.get("nhom")
    if loai == "dung":
        return "\\text{Đúng %s %s}" % (bc.get("so_luong"), bc.get("nhom"))
    if loai == "cung_nhom":
        return "\\text{Cùng màu}"
    if loai == "khac_nhom":
        return "\\text{Khác màu}"
    return "A"


def bieu_thuc_kiem(bo, bc):
    """Biểu thức kiểm chứng bộ mẫu: '2 \\times 3 \\times 4 = 24' + kết luận '\\vdots 4' / '\\text{ không } \\vdots 4'."""
    loai, so = bc.get("loai"), bc.get("so")
    gt = [p.get("gia_tri") for p in bo]
    if loai == "tich_chia_het" and all(isinstance(v, (int, float)) for v in gt):
        tich = 1
        for v in gt:
            tich *= v
        ok = tich % int(so) == 0
        return " \\times ".join(str(v) for v in gt) + " = %d" % tich, ("\\vdots %s" % so) if ok else ("\\text{ không } \\vdots %s" % so)
    if loai and loai.startswith("tong") and all(isinstance(v, (int, float)) for v in gt):
        tong = sum(gt)
        if loai == "tong_chia_het":
            return " + ".join(str(v) for v in gt) + " = %d" % tong, ("\\vdots %s" % so) if tong % int(so) == 0 else ("\\text{ không } \\vdots %s" % so)
        return " + ".join(str(v) for v in gt) + " = %d" % tong, ""
    return "", ""


def nhom_theo_du(van, gia_tri):
    """v99.3: đề 'chia cho d dư r' (+ 'chia hết cho m') -> lưới thẻ tô theo số dư mod d, bội của m nổi bật (vàng).
    Nhóm cụ thể hơn thắng khi chồng lấn (bội của m lấy trước). Chỉ dùng khi AI / biến cố không cho nhóm dùng được."""
    t = str(van or "").lower()
    ds = [v for v in gia_tri if isinstance(v, int)]
    m = re.search(r"chia\s*(?:cho\s*)?(\d+)\s*(?:thì\s*)?dư\s*(\d+)", t)
    if not ds or not m:
        return []
    d = int(m.group(1))
    if d < 2 or d > 4:
        return []
    r0 = int(m.group(2))
    nhom = []
    bm = [x for x in re.findall(r"(?:chia hết cho|⋮|\\vdots)\s*(\d+)", t) if int(x) != d]
    if bm:
        k = int(bm[0])
        nhom.append({"nhan": "\\vdots %d" % k, "mau": "vang", "phan_tu": [v for v in ds if v % k == 0]})
    mau_du = ["cyan", "hong", "ngoc", "xam"]
    thu_tu = [r0 % d] + [r for r in range(d) if r != r0 % d]
    for i, r in enumerate(thu_tu):
        nhom.append({"nhan": "\\text{chia %d dư %d}" % (d, r), "mau": mau_du[i], "phan_tu": [v for v in ds if v % d == r]})
    return nhom


def _nhom_ten(nhom):
    def tim(x):
        if isinstance(x, int) and 0 <= x < len(nhom):
            return x
        s = str(x or "").strip().lower()
        for i, g in enumerate(nhom):
            n = tex_sang_chu(g.get("nhan")).lower()
            if s and (s == n or s in n.split() or ("màu " + s) in n or n.endswith(" " + s) or n == "bi " + s):
                return i
        for i, g in enumerate(nhom):
            if s and s in tex_sang_chu(g.get("nhan")).lower():
                return i
        return None
    return tim


def dung_rut_mau(ts, kb, sua):
    """tham_so thô -> sân khấu rut_mau đã TÍNH SẴN (phần tử + nhóm theo giá trị + n(Ω), n(A), P(A) + đối chiếu đáp án)."""
    ts = dict(ts or {})
    de = " ".join(str(kb.get(k) or "") for k in ("de_bai", "can_tim"))
    vat = str(ts.get("vat") or "").lower()
    if vat not in ("the", "bi", "xuc_xac"):
        vat = "xuc_xac" if re.search(r"xúc xắc|con súc sắc", de, re.I) else "bi" if re.search(r"viên bi|\bbi\b|quả cầu|quả bóng", de, re.I) else "the"
    nhom_ai = [g for g in ts.get("nhom") or [] if isinstance(g, dict)]
    phan_tu, nhom = [], []
    hoan_lai = bool(ts.get("co_hoan_lai")) or vat == "xuc_xac"
    if vat == "bi":
        # bi cùng màu không phân biệt số -> nhóm theo SỐ LƯỢNG là đúng bản chất (khác thẻ đánh số)
        for g in nhom_ai[:5]:
            so = int(g.get("so") or len(g.get("phan_tu") or []) or 0)
            nhan = str(g.get("nhan") or g.get("mau") or "")
            mau = mau_chuan(g.get("mau"), "")
            if not mau:
                mau = next((mm for ten, mm in MAU_BI if ten in nhan.lower()), MAU[len(nhom) % 4])
            nhom.append({"nhan": nhan if co_ma_tho(nhan) or "\\" in nhan else "\\text{%s}" % (nhan or "nhóm %d" % (len(nhom) + 1)), "mau": mau})
            phan_tu += [{"nhan": "", "gia_tri": None, "nhom": len(nhom) - 1} for _ in range(max(0, min(so, 20)))]
        if not phan_tu:
            for ten, mm in MAU_BI:
                m = re.search(r"(\d+)\s*(?:viên\s*)?bi\s*(?:màu\s*)?" + ten + r"(?!\s*lá)", de, re.I)
                if m:
                    nhom.append({"nhan": "\\text{%s}" % ten, "mau": mm})
                    phan_tu += [{"nhan": "", "gia_tri": None, "nhom": len(nhom) - 1} for _ in range(min(int(m.group(1)), 20))]
    else:
        if isinstance(ts.get("phan_tu"), list) and ts["phan_tu"]:
            gia_tri = [int(x) if isinstance(x, (int, float)) or re.fullmatch(r"-?\d+", str(x)) else x for x in ts["phan_tu"]][:40]
        else:
            if vat == "xuc_xac":
                tu, den = 1, 6
            else:
                tu = int(ts.get("tu") or 1)
                den = ts.get("den") or ts.get("N")
                if den is None:
                    m = re.search(r"(?:từ|đánh số)\s*(\d+)\s*(?:đến|tới|-)\s*(\d+)", de)
                    if m:
                        tu, den = int(m.group(1)), int(m.group(2))
                    else:
                        m = re.search(r"(\d+)\s*(?:tấm\s*)?thẻ", de)
                        den = int(m.group(1)) if m else 10
                den = int(den)
            gia_tri = list(range(tu, min(den, tu + 39) + 1))
        so_ok = all(isinstance(v, int) for v in gia_tri)
        phan_tu = [{"nhan": str(v), "gia_tri": v, "nhom": -1} for v in gia_tri]
    N = len(phan_tu)
    k = ts.get("k")
    if k is None:
        m = re.search(r"(?:lấy|chọn|rút|bốc)\s*(?:ra\s*)?(?:ngẫu nhiên\s*)?(?:đồng thời\s*|cùng lúc\s*|liên tiếp\s*)?(\d+|hai|ba|bốn)", de, re.I)
        m2 = re.search(r"(?:gieo|tung)\s*(?:một\s*con\s*xúc xắc\s*)?(\d+|hai|ba)\s*lần", de, re.I)
        tu_so = {"hai": 2, "ba": 3, "bốn": 4}
        k = (tu_so.get(m2.group(1)) or int(m2.group(1))) if m2 else (tu_so.get(m.group(1).lower()) or int(m.group(1))) if m else 2
    k = max(1, min(int(k), max(1, N if not hoan_lai else 6)))
    # ---- biến cố ----
    bc = ts.get("bien_co") if isinstance(ts.get("bien_co"), dict) else None
    if not bc or not bc.get("loai"):
        bc = suy_bien_co(de + " " + str(kb.get("can_tim") or ""))
        if bc:
            sua.append("rut_mau: suy biến cố từ đề (%s)" % bc["loai"])
    bc = bc or {}
    # ---- nhóm THEO GIÁ TRỊ (thẻ / xúc xắc). Cấm tô theo chỉ số ô. ----
    if vat != "bi":
        gt = [p["gia_tri"] for p in phan_tu]
        hop_le = []
        for g in nhom_ai[:5]:
            pt = g.get("phan_tu")
            if isinstance(pt, list) and pt:
                ds = [int(x) for x in pt if re.fullmatch(r"-?\d+", str(x)) and int(x) in gt]
                if len(ds) != len(pt):
                    sua.append("rut_mau: nhóm '%s' có phần tử ngoài tập -> bỏ" % tex_sang_chu(g.get("nhan")))
            else:
                f = vi_tu_nhan(g.get("nhan"))
                ds = [v for v in gt if isinstance(v, int) and f(v)] if f else None
                if ds is not None:
                    sua.append("rut_mau: nhóm '%s' ghi số lượng -> tô theo giá trị %s" % (tex_sang_chu(g.get("nhan")), ds))
            if ds is None:
                hop_le = None
                break
            hop_le.append({"nhan": str(g.get("nhan") or ""), "mau": mau_chuan(g.get("mau"), ("vang", "cyan", "hong", "ngoc", "trang")[len(hop_le) % 5]), "phan_tu": ds})
        # chồng lấn -> nhóm cụ thể hơn (ít phần tử hơn) thắng; nhóm rỗng bỏ
        if hop_le:
            da = set()
            for g in sorted(hop_le, key=lambda g: len(g["phan_tu"])):
                g["phan_tu"] = [v for v in g["phan_tu"] if v not in da]
                da |= set(g["phan_tu"])
            hop_le = [g for g in hop_le if g["phan_tu"]]
        if not hop_le and bc:
            hop_le = [g for g in nhom_tu_bien_co([v for v in gt if isinstance(v, int)], bc) if g["phan_tu"]]
            if hop_le:
                sua.append("rut_mau: dựng nhóm từ bản chất biến cố")
        if not hop_le and vat == "the":
            hop_le = [g for g in nhom_theo_du(de, gt) if g["phan_tu"]]
            if hop_le:
                sua.append("rut_mau: dựng lưới thẻ tô theo số dư (mod)")
        if hop_le and nhom_ai and any(isinstance(g.get("so"), (int, float)) for g in nhom_ai):
            cu = [int(g.get("so") or 0) for g in nhom_ai]
            moi = [len(g["phan_tu"]) for g in hop_le]
            if cu != moi:
                sua.append("rut_mau: số lượng nhóm AI ghi %s khác giá trị thật %s" % (cu, moi))
        nhom = []
        for g in hop_le or []:
            nhan = g["nhan"]
            if not nhan:
                nhan = "\\text{nhóm %d}" % (len(nhom) + 1)
            elif not co_ma_tho(nhan) and "\\" not in nhan and not re.search(r"[⋮∤]", nhan):
                nhan = "\\text{%s}" % nhan
            nhom.append({"nhan": chuan_khong_chia_het(nhan.replace("⋮", "\\vdots "), "tex"), "mau": g["mau"], "phan_tu": g["phan_tu"]})
        for p in phan_tu:
            p["nhom"] = next((i for i, g in enumerate(nhom) if p["gia_tri"] in g["phan_tu"]), -1)
    tim = _nhom_ten(nhom)
    # ---- đếm ----
    if hoan_lai:
        n_omega = N ** k
    else:
        n_omega = math.comb(N, k)
    n_a, vet_can = None, n_omega <= TRAN_VET_CAN
    mau_A, mau_doi = [], []
    if bc:
        if vet_can:
            it = itertools.product(range(N), repeat=k) if hoan_lai else itertools.combinations(range(N), k)
            dem = 0
            for c in it:
                r = thoa_bien_co([phan_tu[i] for i in c], bc, tim)
                if r is None:
                    dem = None
                    break
                if r:
                    dem += 1
                    if len(mau_A) < 400:
                        mau_A.append(list(c))
                elif len(mau_doi) < 400:
                    mau_doi.append(list(c))
            n_a = dem
        else:
            rd = random.Random(96)
            dem, lan = 0, SO_MAU_UOC_LUONG
            for _ in range(lan):
                c = [rd.randrange(N) for _ in range(k)] if hoan_lai else sorted(rd.sample(range(N), k))
                r = thoa_bien_co([phan_tu[i] for i in c], bc, tim)
                if r is None:
                    dem = None
                    break
                if r:
                    dem += 1
                    if len(mau_A) < 400:
                        mau_A.append(c)
                elif len(mau_doi) < 400:
                    mau_doi.append(c)
            n_a = None if dem is None else round(dem / lan * n_omega)
    p_a = Fraction(n_a, n_omega) if n_a is not None and n_omega else None
    kq = {"loai": "rut_mau", "vat": vat, "k": k, "co_hoan_lai": hoan_lai, "phan_tu": phan_tu, "nhom": [{"nhan": g["nhan"], "mau": g["mau"]} for g in nhom],
          "n_omega": n_omega, "vet_can": vet_can, "bien_co": mo_ta_bien_co(bc, k) if bc else "A", "_bc": bc}
    if n_a is not None:
        kq.update({"n_a": n_a, "n_doi": n_omega - n_a, "p": so_tex(p_a), "p_so": float(p_a)})
        dung = khop_dap_an(p_a, kb.get("dap_an_cuoi") or kb.get("dap_an"))
        kq["khop_dap_an"] = dung
        if dung is False:
            sua.append("XS_SAI_DAP_SO: máy đếm P(A) = %s (n(A) = %d, n(Ω) = %d) khác đáp án '%s'%s" % (
                p_a, n_a, n_omega, kb.get("dap_an_cuoi") or kb.get("dap_an"), "" if vet_can else " (ước lượng lấy mẫu)"))
    kq["_mau_A"], kq["_mau_doi"] = _dep(mau_A, phan_tu), _dep(mau_doi, phan_tu)
    kq["omega_tex"] = ("%d^{%d}" % (N, k)) if hoan_lai else ("C_{%d}^{%d}" % (N, k))
    return kq


def _dep(ds, phan_tu):
    """Sắp bộ mẫu 'đẹp' trước: trộn nhiều nhóm, giá trị nhỏ dễ nhẩm."""
    return sorted(ds, key=lambda c: (-len({phan_tu[i]["nhom"] for i in c}), sum(i for i in c)))[:60]


def bo_trong_loi(loi, k):
    """'Thử rút 2, 3 và 4: tích 24' -> [2, 3, 4] (k số đầu tiên đứng sau động từ rút/bốc/chọn/lấy), không có -> None."""
    m = re.search(r"(?:rút|bốc|chọn|lấy|lật)\s*(?:được|ra|thẻ|các thẻ|số)?\s*((?:\d+\s*(?:,|và|;)?\s*){%d})" % k, str(loi or "").lower())
    if not m:
        return None
    so = [int(x) for x in re.findall(r"\d+", m.group(1))][:k]
    return so if len(so) == k and len(set(so)) == k else None


def gan_bo_mau_rut(sk, pha_ds, buoc, loi_tai=None):
    """Mỗi pha 'thu' (thử rút) / 'doi' / 'ket' nhận ĐÚNG bộ mẫu của biến cố đang giảng: bước nói biến cố đối -> bộ Ā;
    pha 'ket' (chốt P(A)) LUÔN là bộ thỏa A. Bộ AI ghi (chon = giá trị) được giữ nếu đúng loại, sai -> thay."""
    phan_tu, bc = sk["phan_tu"], sk.get("_bc") or {}
    tim = _nhom_ten(sk.get("nhom") or [])
    gia_tri = {str(p["gia_tri"]): i for i, p in enumerate(phan_tu) if p.get("gia_tri") is not None}
    dung = {"A": list(sk.get("_mau_A") or []), "doi": list(sk.get("_mau_doi") or [])}
    sua, da_dung = [], set()

    def buoc_tai(t):
        b = None
        for x in buoc:
            if x["t"] <= t + 1e-6:
                b = x
        return b

    def giang_doi(t):
        b = buoc_tai(t)
        if not b:
            return False
        van = json.dumps([b.get("tieu_de"), b.get("nhan"), [th.get("dong") or th.get("noi_dung") for th in b.get("the") or []][:1]], ensure_ascii=False)
        return bool(re.search(r"overline|biến cố đối|\\\\bar|Ā|ngược lại|không chia hết|không \\\\vdots|không ⋮", van))
    for ph in pha_ds:
        ten = ph.get("ten")
        if ten not in ("thu", "doi", "ket"):
            continue
        muc = "A" if ten == "ket" else "doi" if ten == "doi" else (ph.get("muc_tieu") if ph.get("muc_tieu") in ("A", "doi") else ("doi" if giang_doi(ph.get("t", 0)) else "A"))
        if ten == "ket" and ph.get("muc_tieu") == "doi":
            sua.append("rut_mau: pha chốt P(A) không được nhấc bộ biến cố đối -> đổi sang bộ thỏa A")
        ph["muc_tieu"] = muc
        chon = None
        if isinstance(ph.get("chon"), list) and ph["chon"]:
            if all(str(x) in gia_tri for x in ph["chon"]) and len(ph["chon"]) == sk["k"]:
                c = [gia_tri[str(x)] for x in ph["chon"]]
                r = thoa_bien_co([phan_tu[i] for i in c], bc, tim) if bc else None
                if r is None or r == (muc == "A"):
                    chon = c
                else:
                    sua.append("rut_mau: bộ %s không thuộc %s -> thay" % (ph["chon"], "A" if muc == "A" else "Ā"))
        if chon is None and loi_tai:   # bộ mẫu chính lời đọc nhắc ("thử rút 2, 3, 4") nếu đúng loại biến cố
            so = bo_trong_loi(loi_tai(ph.get("t", 0) - 0.5, ph.get("t", 0) + 6.0), sk["k"])
            if so and all(str(x) in gia_tri for x in so):
                c = [gia_tri[str(x)] for x in so]
                r = thoa_bien_co([phan_tu[i] for i in c], bc, tim) if bc else None
                if r is None or r == (muc == "A"):
                    chon = c
        if chon is None and dung[muc]:
            chon = next((c for c in dung[muc] if tuple(c) not in da_dung), dung[muc][0])
        if chon is None:
            continue
        da_dung.add(tuple(chon))
        ph["chon"] = chon   # chỉ số phần tử (máy dùng), giá trị nằm ở phan_tu[i].nhan
        r = thoa_bien_co([phan_tu[i] for i in chon], bc, tim) if bc else None
        ph["thoa"] = r
        bt, kl = bieu_thuc_kiem([phan_tu[i] for i in chon], bc)
        ph["bt"], ph["kl"] = bt, kl
    return sua


# ====================================================================================================================
# 5. SƠ ĐỒ CÂY / LƯỚI BAYES / CỘT PHÂN PHỐI
# ====================================================================================================================
# v98.3: chữ màu viết tắt trong ô ghim ĐỀ ("H_1: 3Đ\,2X") -> "3 đỏ 2 xanh" (chấm màu bi dưới nút tầng 1 của cây mờ)
_MAU_TAT = {"đ": "đỏ", "x": "xanh", "v": "vàng", "t": "trắng", "đe": "đen"}


def bi_tu_ghim(nhan):
    s = re.sub(r"\[,;:! ]|\text\{([^}]*)\}", lambda m: " " + (m.group(1) or ""), str(nhan or ""))
    s = s.split(":", 1)[1] if ":" in s else s
    ra = []
    for so, chu in re.findall(r"(\d+)\s*(đỏ|xanh|vàng|trắng|đen|Đ|X|V|T)(?![a-zà-ỹ])", s, flags=re.I):
        ra.append("%s %s" % (so, _MAU_TAT.get(chu.lower(), chu.lower())))
    return " ".join(ra)


def kieu_so_cay(ps, kb):
    """v98.3: MỘT cách viết số cho cả cây + thẻ T3: 'phan_so' khi có giá trị không ra thập phân hữu hạn ngắn hoặc thẻ / màn hình
    của kịch bản viết phân số (\frac, a/b); ngược lại 'thap_phan'. Tránh trộn 0,15 trên nhánh với 3/20 ở thẻ T3."""
    for x in ps:
        if isinstance(x, Fraction) and x.denominator > 1 and "frac" in so_tex(x):
            return "phan_so"
    van = json.dumps(((kb or {}).get("khung4tang") or {}).get("buoc") or [], ensure_ascii=False)
    if re.search(r"\\[dt]?frac|\d\s*/\s*\d", van):
        return "phan_so"
    return "thap_phan"


def so_cay(x, kieu):
    if kieu == "phan_so" and isinstance(x, Fraction) and x.denominator > 1:
        return r"\dfrac{%d}{%d}" % (x.numerator, x.denominator)
    return so_tex(x)


def dung_so_do_cay(ts, kb, sua, lop):
    """ts = {tang:[nhãn tầng], goc:{con:[{nhan, p, bi?, con:[...]}]}, duong:[[i,j,...],...], hoi:'tong'|'dieu_kien', tu:[...], mau:[...]}.
    Máy: đọc xác suất từng nhánh, bù nhánh còn thiếu (1 - tổng), kiểm tổng = 1, nhân theo đường, cộng các đường tô sáng.
    v98.3: một kiểu số cho cả cây (kieu_so_cay), nút tầng 1 có `bi` (thành phần hộp, từ con[].bi hoặc ô ghim ĐỀ)."""
    goc = ts.get("goc") if isinstance(ts.get("goc"), dict) else {"con": ts.get("nhanh") or ts.get("con") or []}
    nut, canh = [], []

    def duyet(n, cha, sau, duong, p_tich):
        con = [c for c in (n.get("con") or []) if isinstance(c, dict)][:4]
        ps = [doc_ti_le(c.get("p")) for c in con]
        if con and sum(1 for p in ps if p is None) == 1:
            thieu = ps.index(None)
            ps[thieu] = 1 - sum(p for p in ps if p is not None)
            sua.append("so_do_cay: bù xác suất nhánh '%s' = %s" % (tex_sang_chu(con[thieu].get("nhan")), ps[thieu]))
        if con and all(p is not None for p in ps) and abs(sum(ps) - 1) > Fraction(1, 1000):
            sua.append("SO_DO_CAY_TONG_KHAC_1: các nhánh dưới '%s' cộng lại %s" % (tex_sang_chu(n.get("nhan") or "gốc"), float(sum(ps))))
        for j, (c, p) in enumerate(zip(con, ps)):
            i = len(nut)
            tich = None if p is None or p_tich is None else p_tich * p
            nut.append({"id": i, "nhan": str(c.get("nhan") or ""), "tang": sau, "cha": cha, "duong": duong + [j],
                        "_p": p, "_p_tho": str(c.get("p") or "?"), "_tich": tich, "la": not c.get("con"),
                        "_bi": str(c.get("bi") or "")})
            canh.append({"tu": cha, "den": i})
            if sau < 3:
                duyet(c, i, sau + 1, duong + [j], tich)
    duyet(goc, -1, 1, [], Fraction(1))
    duong_sang = [list(d) for d in (ts.get("duong") or []) if isinstance(d, list)]
    la_sang = [n for n in nut if n["la"] and any(n["duong"] == d for d in duong_sang)]
    for n in nut:
        n["sang"] = any(n["duong"] == d[:len(n["duong"])] for d in duong_sang)
    tong = sum((n["_tich"] for n in la_sang if n["_tich"] is not None), Fraction(0)) if la_sang else None
    p = tong
    mau_s, la_mau = None, []
    if ts.get("hoi") == "dieu_kien" and tong is not None:
        mau_d = [list(d) for d in (ts.get("mau") or []) if isinstance(d, list)]
        la_mau = [n for n in nut if n["la"] and any(n["duong"] == d for d in mau_d)]
        mau_s = sum((n["_tich"] for n in la_mau if n["_tich"] is not None), Fraction(0))
        if str(lop) != "12":
            sua.append("so_do_cay: lớp %s chưa học xác suất có điều kiện -> chỉ cộng các nhánh" % lop)
            mau_s = None
        elif mau_s:
            p = tong / mau_s
            for n in nut:
                n["mau"] = any(n["duong"] == d[:len(n["duong"])] for d in mau_d)
        else:
            mau_s = None
    ks = kieu_so_cay([n["_p"] for n in nut] + [n["_tich"] for n in nut if n["la"]] + [tong, mau_s, p], kb)
    f = lambda x: so_cay(x, ks)
    tang1 = [n for n in nut if n["tang"] == 1]
    ghim = [g for g in (((kb or {}).get("khung4tang") or {}).get("de_ghim") or []) if isinstance(g, dict) and bi_tu_ghim(g.get("nhan"))]
    for k, n in enumerate(tang1):
        bi = n["_bi"] or (bi_tu_ghim(ghim[k].get("nhan")) if len(ghim) == len(tang1) else "")
        if bi:
            n["bi"] = bi
    for n in nut:
        n["p"] = f(n["_p"]) if n["_p"] is not None else n["_p_tho"]
        n["tich"] = f(n["_tich"]) if n["_tich"] is not None and n["la"] else None
    kq = {"loai": "so_do_cay", "tang": [str(x) for x in (ts.get("tang") or [])][:3], "nut": nut, "canh": canh, "kieu_so": ks}
    if mau_s:
        kq["mau_so"] = f(mau_s)
        # v98.1: Remotion "cây dòng chảy" cần biết nút nào thuộc MẪU SỐ (bước toàn phần) và nút nào thuộc TỬ SỐ (sang)
        kq["bayes"] = True
        kq["bt_mau"] = " + ".join(n["tich"] for n in la_mau if n["tich"]) + " = " + f(mau_s)
    if tong is not None:
        kq["tong"] = f(tong)
        kq["bt_tong"] = " + ".join(n["tich"] for n in la_sang if n["tich"]) + " = " + f(tong)
    if p is not None:
        kq["p"], kq["p_so"] = f(p), float(p)
        dung = khop_dap_an(p, kb.get("dap_an_cuoi") or kb.get("dap_an"))
        kq["khop_dap_an"] = dung
        if dung is False:
            sua.append("XS_SAI_DAP_SO: sơ đồ cây cho %s khác đáp án '%s'" % (p, kb.get("dap_an_cuoi") or kb.get("dap_an")))
    for n in nut:
        for k in ("_tich", "_p", "_p_tho", "_bi"):
            n.pop(k, None)
    return kq if nut else None


def _chu_kb(kb):
    """Gom chữ của kịch bản (đề + thẻ giải + lời đọc) theo thứ tự xuất hiện — để đọc ký hiệu biến cố / số người."""
    kb = kb or {}
    k4 = kb.get("khung4tang") or {}
    parts = [str(kb.get("de_bai") or "")]
    for g in (k4.get("de_ghim") or []):
        if isinstance(g, dict):
            parts.append(str(g.get("nhan") or "") + " " + str(g.get("gia_tri") or ""))
    for b in (k4.get("buoc") or []):
        if not isinstance(b, dict):
            continue
        parts.append(str(b.get("khi_noi") or ""))
        for th in (b.get("the") or []):
            if isinstance(th, dict):
                parts.append(" ".join(str(x) for x in (th.get("dong") or [])) if isinstance(th.get("dong"), list) else str(th.get("dong") or ""))
                parts.append(str(th.get("noi_dung") or ""))
    return " ".join(parts)


_RE_PXY = re.compile(r"P\s*\(\s*([A-Za-z])\s*(?:\\mid|\\vert|\||∣)\s*(?:\\overline\{|\\bar\{)?\s*([A-Za-z])\s*\}?\s*\)")


def ky_hieu_bayes(ts, A, B, kb):
    """v102: ký hiệu biến cố ĐÚNG như đề / thẻ giải (vd B = bệnh, K = dương tính) thay vì gán cứng A, B.
    Ưu tiên tham số rõ (ky_hieu_A / ky_hieu_B hoặc A.ky_hieu / B.ky_hieu); không có thì lấy mệnh đề P(X | Y) ĐẦU TIÊN trong chữ
    (đề thường cho P(chứng cứ | nguyên nhân) trước): B(sân khấu) = X (chứng cứ), A(sân khấu) = Y (nguyên nhân)."""
    def mot(x):
        x = str(x or "").strip()
        return x if re.fullmatch(r"[A-Za-z]", x) else None
    ka = mot(ts.get("ky_hieu_A")) or mot(A.get("ky_hieu")) or mot(ts.get("ky_A"))
    kb_ = mot(ts.get("ky_hieu_B")) or mot(B.get("ky_hieu")) or mot(ts.get("ky_B"))
    if ka and kb_ and ka != kb_:
        return ka, kb_
    for m in _RE_PXY.finditer(_chu_kb(kb)):
        x, y = m.group(1), m.group(2)
        if x != y:
            return (ka or y), (kb_ or x)
    return (ka or "A"), (kb_ or "B")


def _so_nguyen_vn(n):
    return "{:,}".format(int(n)).replace(",", ".")


def tan_so_bayes(ts, kb, pa, pab, pnab, pb):
    """v102: cách giải "tần số tự nhiên" — dân số mẫu N (vd 10.000 người) -> số ca A∩B, Ā∩B thật. N lấy từ ts (tan_so / tong / N)
    hoặc tự nhận từ chữ khi N·P(A∩B) và N·P(Ā∩B) ĐỀU xấp xỉ số nguyên (vd 10.000 -> 95 và 198)."""
    N, don_vi = None, "người"
    for k in ("tan_so", "tong", "N", "so_nguoi"):
        v = ts.get(k)
        if isinstance(v, dict):
            v = v.get("n") or v.get("tong")
        if isinstance(v, (int, float)) and not isinstance(v, bool) and v >= 10:
            N = int(v)
            break
        if isinstance(v, str) and re.fullmatch(r"[\d.\s]+", v.strip() or "x"):
            N = int(re.sub(r"\D", "", v))
            break
    chu = _chu_kb(kb)
    if N is None:
        for m in re.finditer(r"(\d{1,3}(?:[.\s]\d{3})+|\d{3,7})\s*(người|ca|sản phẩm|chiếc|học sinh|bệnh nhân)", chu):
            n = int(re.sub(r"\D", "", m.group(1)))
            if n >= 100 and abs(n * pab - round(n * pab)) < 0.05 and abs(n * pnab - round(n * pnab)) < 0.05 and round(n * pab) >= 1:
                N, don_vi = n, m.group(2)
                break
    if N is None:
        return None
    ab, nab = N * pab, N * pnab
    if abs(ab - round(ab)) > 0.05 or abs(nab - round(nab)) > 0.05:
        return None
    ab, nab = int(round(ab)), int(round(nab))
    return {"n": _so_nguyen_vn(N), "a": _so_nguyen_vn(round(N * pa)), "na": _so_nguyen_vn(N - round(N * pa)),
            "ab": _so_nguyen_vn(ab), "nab": _so_nguyen_vn(nab), "b": _so_nguyen_vn(ab + nab), "don_vi": don_vi}


def dung_luoi_bayes(ts, kb, sua):
    """ts = {A:{nhan, p}, B:{nhan}, p_B_A, p_B_khong_A, hoi:'A|B'}: hình vuông đơn vị cắt dọc theo P(A), cắt ngang theo P(B|A)
    và P(B|Ā); hậu nghiệm P(A|B) = P(A∩B) / P(B)."""
    A = ts.get("A") if isinstance(ts.get("A"), dict) else {"p": ts.get("p_A"), "nhan": ts.get("nhan_A")}
    B = ts.get("B") if isinstance(ts.get("B"), dict) else {"nhan": ts.get("nhan_B")}
    pa, pba, pbna = doc_ti_le(A.get("p")), doc_ti_le(ts.get("p_B_A")), doc_ti_le(ts.get("p_B_khong_A"))
    if None in (pa, pba, pbna) or not (0 < pa < 1) or not (0 <= pba <= 1) or not (0 <= pbna <= 1):
        sua.append("luoi_bayes: thiếu/sai P(A), P(B|A), P(B|Ā) -> bỏ sân khấu")
        return None
    pab, pnab = pa * pba, (1 - pa) * pbna
    pb = pab + pnab
    p = pab / pb if pb else None
    ky_a, ky_b = ky_hieu_bayes(ts, A, B, kb)
    tan_so = tan_so_bayes(ts, kb, pa, pab, pnab, pb)
    kq = {"loai": "luoi_bayes", "nhan_a": str(A.get("nhan") or "A"), "nhan_b": str(B.get("nhan") or "B"),
          "pa": float(pa), "pba": float(pba), "pbna": float(pbna),
          "tex": {"pa": so_tex(pa), "pna": so_tex(1 - pa), "pba": so_tex(pba), "pbna": so_tex(pbna), "pab": so_tex(pab), "pnab": so_tex(pnab), "pb": so_tex(pb)}}
    if ky_a != "A" or ky_b != "B":
        kq["ky_a"], kq["ky_b"] = ky_a, ky_b
    if tan_so:
        kq["tan_so"] = tan_so
    if p is not None:
        kq["p"], kq["p_so"] = so_viet(float(p), 4), float(p)   # hậu nghiệm ghi thập phân 0,1667 (khớp cách đọc), không 1/6
        dung = khop_dap_an(p, kb.get("dap_an_cuoi") or kb.get("dap_an"))
        if ts.get("hoi") in ("B", "toan_phan"):
            dung = khop_dap_an(pb, kb.get("dap_an_cuoi") or kb.get("dap_an"))
            kq["hoi"] = "B"
        kq["khop_dap_an"] = dung
        if dung is False:
            sua.append("XS_SAI_DAP_SO: lưới Bayes cho P(A|B) = %.4f, P(B) = %.4f khác đáp án '%s'" % (float(p), float(pb), kb.get("dap_an_cuoi") or kb.get("dap_an")))
    return kq


def dung_cot_phan_phoi(ts, kb, sua):
    """ts = {cot:[{nhan, p}]} hoặc {nhi_thuc:{n, p}}; dich = chỉ số cột đích (cộng dồn). Máy tính p nhị thức, kiểm tổng = 1."""
    cot = []
    nt = ts.get("nhi_thuc") if isinstance(ts.get("nhi_thuc"), dict) else None
    if nt and doc_ti_le(nt.get("p")) is not None and str(nt.get("n") or "").isdigit():
        n, p = int(nt["n"]), doc_ti_le(nt["p"])
        n = min(n, 12)
        cot = [{"nhan": str(i), "_p": Fraction(math.comb(n, i)) * p ** i * (1 - p) ** (n - i)} for i in range(n + 1)]
    else:
        for c in ts.get("cot") or []:
            if isinstance(c, dict) and doc_ti_le(c.get("p")) is not None:
                cot.append({"nhan": str(c.get("nhan") or ""), "_p": doc_ti_le(c.get("p"))})
    cot = cot[:13]
    if len(cot) < 2:
        sua.append("cot_phan_phoi: < 2 cột hợp lệ -> bỏ sân khấu")
        return None
    tong = sum(c["_p"] for c in cot)
    if not nt and abs(tong - 1) > Fraction(1, 100) and ts.get("phan_phoi", True) is not False:
        sua.append("COT_PHAN_PHOI_TONG_KHAC_1: tổng các cột = %.4f" % float(tong))
    dich = [int(i) for i in ts.get("dich") or [] if str(i).lstrip("-").isdigit() and 0 <= int(i) < len(cot)]
    s = sum((cot[i]["_p"] for i in dich), Fraction(0))
    kq = {"loai": "cot_phan_phoi", "cot": [{"nhan": c["nhan"], "p": so_tex(c["_p"], 3), "gia_tri": float(c["_p"])} for c in cot], "dich": dich,
          "truc_x": str(ts.get("truc_x") or ""), "nhan_x": str(ts.get("nhan_x") or "")}
    if dich:
        kq["p"], kq["p_so"] = so_tex(s, 4), float(s)
        kq["bt_tong"] = " + ".join(kq["cot"][i]["p"] for i in dich) + " = " + so_tex(s, 4) if len(dich) > 1 else ""
        dung = khop_dap_an(s, kb.get("dap_an_cuoi") or kb.get("dap_an"))
        kq["khop_dap_an"] = dung
        if dung is False and ts.get("kiem_dap_an", True):
            sua.append("XS_SAI_DAP_SO: tổng cột đích %.4f khác đáp án '%s'" % (float(s), kb.get("dap_an_cuoi") or kb.get("dap_an")))
    return kq


# ====================================================================================================================
# 6. NHÁNH 2D THỰC TẾ + TƯ DUY ĐẠI SỐ (Đợt B / C)
# ====================================================================================================================
TEN_AN_TOAN = {"sqrt": math.sqrt, "exp": math.exp, "ln": math.log, "log": math.log10, "abs": abs, "pi": math.pi, "e": math.e}


def ham_an_toan(bt, bien="x"):
    """Biểu thức một biến (có sqrt, exp, ln, log, abs, ^, nhân ngầm, phần trăm thập phân) -> hàm Python | None. Lọc ký tự trước eval."""
    s = str(bt or "").replace(" ", "").replace("{,}", ".").replace("π", "pi").replace("×", "*").replace("·", "*").replace("−", "-")
    s = re.sub(r"\\cdot|\\times", "*", s)
    s = re.sub(r"\\sqrt\{([^{}]*)\}", r"sqrt(\1)", s)
    s = re.sub(r"\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}", r"((\1)/(\2))", s)
    s = re.sub(r"\\(left|right)", "", s).replace("{", "(").replace("}", ")")
    s = re.sub(r"(\d),(\d)", r"\1.\2", s).replace("^", "**")
    if bien != "x":
        s = re.sub(r"(?<![a-z])" + re.escape(bien) + r"(?![a-z])", "x", s)
    s = re.sub(r"(\d|\))(x|pi|sqrt|exp|ln|log|abs|e(?![a-z])|\()", r"\1*\2", s)
    s = re.sub(r"(x)(\(|\d|x|pi|sqrt|exp|ln)", r"\1*\2", s)
    toks = re.findall(r"[a-z]+", s)
    if not s or len(s) > 160 or any(t not in TEN_AN_TOAN and t != "x" for t in toks) or not re.fullmatch(r"[-+*/().0-9a-z]+", s):
        return None
    try:
        f = eval("lambda x: " + s, dict(TEN_AN_TOAN, __builtins__={}))  # noqa: S307 - đã lọc ký tự & tên (tên hàm nằm ở globals của lambda)
        f(1.234)
        return f
    except Exception:   # noqa: BLE001
        return None


def toi_uu(f, a, b, kieu="max"):
    mau = []
    for i in range(401):
        x = a + (b - a) * i / 400
        try:
            y = f(x)
        except Exception:   # noqa: BLE001
            continue
        if isinstance(y, (int, float)) and math.isfinite(y):
            mau.append((x, y))
    if len(mau) < 300:
        return None
    x0, _ = (max if kieu == "max" else min)(mau, key=lambda p: p[1])
    lo, hi = max(a, x0 - (b - a) / 400), min(b, x0 + (b - a) / 400)
    for _ in range(80):
        m1, m2 = lo + (hi - lo) / 3, hi - (hi - lo) / 3
        if (f(m1) < f(m2)) == (kieu == "max"):
            lo = m1
        else:
            hi = m2
    x = (lo + hi) / 2
    return x, f(x)


def _so_dap(kb):
    return [float(x.replace(",", ".")) for x in re.findall(r"-?\d+(?:[.,]\d+)?", str(kb.get("dap_an_cuoi") or kb.get("dap_an") or "").replace(".000", "000"))]


def dung_kinh_te(ts, kb, sua):
    """ts = {ham:'(50-x)(200+20x)', bien:'x', mien:[0,50], kieu:'max', ten_ham:'L', nhan_bien:'giảm giá (nghìn đồng)', nhan_ham:'lợi nhuận',
    phu:[{ten:'Giá bán', ham:'50-x', don_vi:'k'}, {ten:'Số khách', ham:'200+20x'}], don_vi:'nghìn đồng'}"""
    bien = cat_nhan(str(ts.get("bien") or "x"), 2)
    f = ham_an_toan(ts.get("ham"), bien)
    mien = ts.get("mien") if isinstance(ts.get("mien"), list) and len(ts["mien"]) == 2 else None
    if not f or not mien:
        sua.append("kinh_te_do_thi: thiếu/sai hàm hoặc miền -> bỏ sân khấu")
        return None
    a, b = float(doc_ti_le(mien[0]) or 0), float(doc_ti_le(mien[1]) or 0)
    if not b > a:
        return None
    kieu = "min" if str(ts.get("kieu") or "").lower() in ("min", "nho_nhat") else "max"
    tot = toi_uu(f, a, b, kieu)
    if not tot:
        return None
    phu = []
    for c in ts.get("phu") or []:
        if isinstance(c, dict) and ham_an_toan(c.get("ham"), bien):
            phu.append({"ten": cat_nhan(str(c.get("ten") or ""), 18), "ham": str(c["ham"]), "don_vi": cat_nhan(str(c.get("don_vi") or ""), 10)})
    kq = {"loai": "kinh_te_do_thi", "ham": str(ts["ham"]), "bien": bien, "mien": [a, b], "kieu": kieu,
          "ten_ham": cat_nhan(str(ts.get("ten_ham") or "L"), 3), "nhan_bien": cat_nhan(str(ts.get("nhan_bien") or bien), 28),
          "nhan_ham": cat_nhan(str(ts.get("nhan_ham") or ""), 28), "don_vi": cat_nhan(str(ts.get("don_vi") or ""), 14), "phu": phu[:3],
          "x_tot": round(tot[0], 4), "y_tot": round(tot[1], 4)}
    so = _so_dap(kb)
    kq["khop_dap_an"] = (any(abs(v - tot[0]) <= 0.02 * max(1, abs(tot[0])) or abs(v - tot[1]) <= 0.01 * max(1, abs(tot[1])) for v in so)) if so else None
    if kq["khop_dap_an"] is False:
        sua.append("SAN_KHAU_LECH_DAP_AN: điểm tối ưu máy tính (%.3g; %.4g) không trùng số nào của đáp án -> lùi sơ đồ tư duy" % tot)
        return None
    return kq


MAU_SO_DO_2D = ("song_bo", "day_cap", "cong_parabol", "rao_tuong", "thang_tuong")


def dung_so_do_2d(ts, kb, sua):
    """ts = {mau:'song_bo', tham_so:{rong, dai, v_nuoc, v_bo}, bien:'x', mien:[0, dai], ham:'tổng thời gian/độ dài theo x', kieu:'min'}"""
    mau = str(ts.get("mau") or "")
    if mau not in MAU_SO_DO_2D:
        sua.append("so_do_2d: mẫu '%s' không có -> bỏ sân khấu" % mau)
        return None
    tham = {k: float(doc_ti_le(v)) for k, v in (ts.get("tham_so") or {}).items() if doc_ti_le(v) is not None}
    bien = cat_nhan(str(ts.get("bien") or "x"), 2)
    f = ham_an_toan(ts.get("ham"), bien) if ts.get("ham") else None
    mien = ts.get("mien") if isinstance(ts.get("mien"), list) and len(ts["mien"]) == 2 else None
    kq = {"loai": "so_do_2d", "mau": mau, "tham_so": tham, "bien": bien, "nhan": {k: cat_nhan(str(v), 16) for k, v in (ts.get("nhan") or {}).items()},
          "ten_ham": cat_nhan(str(ts.get("ten_ham") or "f"), 3), "don_vi": cat_nhan(str(ts.get("don_vi") or ""), 8)}
    if f and mien:
        a, b = float(doc_ti_le(mien[0]) or 0), float(doc_ti_le(mien[1]) or 0)
        tot = toi_uu(f, a, b, "max" if str(ts.get("kieu")).lower() == "max" else "min") if b > a else None
        if tot:
            kq.update({"ham": str(ts["ham"]), "mien": [a, b], "x_tot": round(tot[0], 4), "y_tot": round(tot[1], 4), "kieu": "max" if str(ts.get("kieu")).lower() == "max" else "min"})
            so = _so_dap(kb)
            if so and not any(abs(v - tot[0]) <= 0.02 * max(1, abs(tot[0])) or abs(v - tot[1]) <= 0.01 * max(1, abs(tot[1])) for v in so):
                sua.append("SAN_KHAU_LECH_DAP_AN: sơ đồ 2D tối ưu (%.3g; %.4g) không khớp đáp án -> bỏ đồ thị mini" % tot)
                for k in ("ham", "mien", "x_tot", "y_tot"):
                    kq.pop(k, None)
    return kq


def dung_tang_truong(ts, kb, sua):
    """ts = {ham:'100*(1+0.06)^t', bien:'t', mien:[0,10], moc:[0,10], ten_ham:'T', don_vi:'triệu', nguong?:200}"""
    bien = cat_nhan(str(ts.get("bien") or "t"), 2)
    f = ham_an_toan(ts.get("ham"), bien)
    mien = ts.get("mien") if isinstance(ts.get("mien"), list) and len(ts["mien"]) == 2 else None
    if not f or not mien:
        sua.append("tang_truong: thiếu/sai hàm hoặc miền -> bỏ sân khấu")
        return None
    a, b = float(doc_ti_le(mien[0]) or 0), float(doc_ti_le(mien[1]) or 0)
    if not b > a:
        return None
    try:
        ys = [f(a + (b - a) * i / 60) for i in range(61)]
    except Exception:   # noqa: BLE001
        return None
    if not all(isinstance(y, (int, float)) and math.isfinite(y) for y in ys):
        return None
    moc = [float(doc_ti_le(x)) for x in (ts.get("moc") or [a, b]) if doc_ti_le(x) is not None and a <= float(doc_ti_le(x)) <= b][:3] or [a, b]
    kq = {"loai": "tang_truong", "ham": str(ts["ham"]), "bien": bien, "mien": [a, b], "ten_ham": cat_nhan(str(ts.get("ten_ham") or "y"), 3),
          "don_vi": cat_nhan(str(ts.get("don_vi") or ""), 10), "nhan_bien": cat_nhan(str(ts.get("nhan_bien") or bien), 20),
          "moc": [{"x": x, "y": round(f(x), 4)} for x in moc]}
    ng = doc_ti_le(ts.get("nguong"))
    if ng is not None:
        kq["nguong"] = float(ng)
    so = _so_dap(kb)
    if so and not any(any(abs(v - m[k]) <= 0.01 * max(1, abs(m[k])) for k in ("x", "y")) for v in so for m in kq["moc"]):
        sua.append("tang_truong: mốc đích không trùng số nào của đáp án (chỉ cảnh báo)")
    return kq


def dung_tu_duy(kb, k4, buoc=None):
    """Đường lui vạn năng: hộp dữ kiện (từ de_ghim) -> chuỗi suy luận (tiêu đề từng bước) -> dòng biến đổi chính khóa màu
    (dòng công thức đầu của mỗi bước) + đồ thị mini nếu đề có hàm số một biến đọc được."""
    du = [str(d.get("nhan") or "") for d in (k4.get("de_ghim") or k4.get("deGhim") or []) if isinstance(d, dict) and d.get("nhan")][:4]
    try:   # v98: hộp dữ kiện không chép nghiệm AI ghi sẵn trong de_ghim ('x = 6,07' -> 'x = ?')
        import khung4tang_v98 as v98_k4
        du = v98_k4.che_dap_an_chuoi(du, kb.get("dap_an_cuoi") or kb.get("dap_an"))
    except ImportError:
        pass
    ds = buoc if buoc is not None else [b for b in (k4.get("buoc") or []) if isinstance(b, dict)]
    nut = []
    for j, b in enumerate(ds[:5]):
        dong = ""
        for th in b.get("the") or []:
            if th.get("loai") == "cong_thuc" and th.get("dong"):
                dong = str(th["dong"][0])
                break
        nut.append({"nhan": cat_nhan(str(b.get("nhan") or "Bước %d" % (j + 1)), 22), "tieu_de": cat_nhan(str(b.get("tieu_de") or ""), 60), "dong": cat_nhan(dong, 90),
                    "mau": mau_chuan(b.get("mau"), MAU[j % 4])})
    kq = {"loai": "tu_duy_dai_so", "du_kien": du, "nut": nut}
    m = re.search(r"\b([fgyhP])\s*\(\s*([x])\s*\)\s*=\s*([-+*/^().0-9x ]{3,60})", str(kb.get("de_bai") or ""))
    if m and ham_an_toan(m.group(3), "x"):
        kq["do_thi"] = {"ham": m.group(3).strip(), "ten": m.group(1)}
    return kq if nut else None


# ====================================================================================================================
# 7. BỘ ĐỊNH TUYẾN SÂN KHẤU (bản Python của chonSanKhau_ trong SanKhau.gs)
# ====================================================================================================================
KHUON_VAT_THE = ("tam_bia_gap_hop", "tru_non_toi_uu", "hai_mat_cau_oxyz", "khung_day_cap", "mat_phang_cat_khoi", "chop_lang_tru", "parabol_quy_dao")
TU_CHI_DAO = [
    (r"bayes|lưới diện tích|hình vuông đơn vị|mosaic", "luoi_bayes"),
    (r"sơ đồ cây|cây xác suất|tree", "so_do_cay"),
    (r"biểu đồ cột|cột phân phối|phân phối", "cot_phan_phoi"),
    (r"rút (?:thẻ|mẫu)|bốc (?:thẻ|bi)|lật thẻ|thẻ số|rút mẫu", "rut_mau"),
    (r"đồ thị lợi nhuận|doanh thu|kinh tế|giá bán|thanh gạt", "kinh_te_do_thi"),
    (r"sơ đồ 2d|qua sông|dây cáp|bờ sông|chuyển động 2d|khoảng cách", "so_do_2d"),
    (r"tăng trưởng|lãi suất|lãi kép|hàm mũ|logarit", "tang_truong"),
    (r"sơ đồ tư duy|tư duy|biến đổi đại số|khóa màu", "tu_duy_dai_so"),
    (r"3d|khối|hình hộp|gập hộp|hình trụ", "3d_vector"),
]


def doc_chi_dao(s):
    """'[chidao: dùng lưới Bayes] Bài ...' / cột chi_dao -> (loai | None, lời chỉ đạo)."""
    s = str(s or "").strip()
    m = re.search(r"\[\s*chi\s*_?dao\s*:\s*([^\]]+)\]", s, re.I)
    loi = (m.group(1) if m else s).strip()
    if not loi:
        return None, ""
    for re_, loai in TU_CHI_DAO:
        if re.search(re_, loi, re.I):
            return loai, loi[:200]
    return None, loi[:200]


def tach_chi_dao(de):
    """Tách thẻ [chidao: ...] khỏi đề gửi Zalo -> (đề sạch, lời chỉ đạo)."""
    s = str(de or "")
    m = re.search(r"\[\s*chi\s*_?dao\s*:\s*([^\]]+)\]", s, re.I)
    if not m:
        return s, ""
    return (s[:m.start()] + s[m.end():]).strip(), m.group(1).strip()


def loai_xac_suat(van, lop):
    t = str(van or "").lower()
    if re.search(r"bayes|xét nghiệm|dương tính|âm tính|xác suất có điều kiện|biết rằng|với điều kiện|p\(\s*\w\s*\|", t):
        return "luoi_bayes" if str(lop) == "12" and re.search(r"xét nghiệm|dương tính|bayes|tỉ lệ (?:mắc|nhiễm|lỗi|phế phẩm)|nhà máy|phân xưởng|máy\s*[ab12]", t) else "so_do_cay"
    if re.search(r"lần lượt|liên tiếp|lần thứ (?:nhất|hai)|bắn|thi đấu|độc lập|vòng (?:1|một)|ván|trận|mỗi lần", t) and not re.search(r"thẻ đánh số|tấm thẻ", t):
        # ít phép thử (<= 3 lần) -> sơ đồ cây rõ hơn; nhiều lần / khoanh bừa / phân phối -> biểu đồ cột
        so_lan = max([int(x) for x in re.findall(r"(\d+)\s*(?:lần|lượt|câu|ván|trận)", t)] or [0])
        if so_lan >= 4 and re.search(r"đúng\s*\d+\s*lần|ít nhất\s*\d+\s*lần|bao nhiêu lần|số lần|phân phối|khoanh (?:bừa|ngẫu nhiên)|trắc nghiệm", t):
            return "cot_phan_phoi"
        return "so_do_cay"
    if re.search(r"khoanh (?:bừa|ngẫu nhiên)|đúng\s*\d+\s*câu|ít nhất\s*\d+\s*câu|phân phối|so sánh hai phương án|phương án nào", t):
        return "cot_phan_phoi"
    return "rut_mau"


def cho_do_thi_thuan(van):
    return bool(re.search(r"giá vé|giá bán|lợi nhuận|doanh thu|giảm giá|tăng giá|chiết khấu|tiền lãi|lãi suất|lãi kép|gửi tiết kiệm|lạm phát|dân số|tăng trưởng", van, re.I) and not re.search(r"mét|(?:^|[^a-zà-ỹ])(?:km|dm|cm|mm|m)(?:[²³23]|(?=$|[^a-zà-ỹ]))|diện tích|thể tích|chu vi|kích thước|chiều (?:dài|rộng|cao)|bán kính|đất|vườn|ruộng|hộp|rào|lối đi|tường|góc|quãng đường|vận tốc|tốc độ chuyển động|cắt|gấp (?:giấy|hình)|gập|máng|vòm|sông|thuyền|bìa|quỹ đạo|bể|hình trụ|hình nón|khối|đường ống|dây cáp|mặt cầu|thang dựa|bánh răng|vi khuẩn", van, re.I) and not RE_VAT_THE.search(van))


def loai_thuc_te(van, khuon_suy):
    t = str(van or "").lower()
    # vật thể khối thật (hộp, lon, chóp, mặt cầu...) hoặc đặc tả 3D tự do AI đã dựng được -> giữ sân khấu 3D
    # (khuôn AI ghi chỉ được tin khi đề THẬT SỰ nói tới vật thể — đề đại số mà AI gắn "tam_bia_gap_hop" -> không nhận)
    if (khuon_suy == "__tu_do__" or (khuon_suy in KHUON_VAT_THE and khuon_suy != "parabol_quy_dao")) and RE_VAT_THE.search(t):
        return "3d_vector"
    if re.search(r"giá vé|chiết khấu|giá bán|lợi nhuận|doanh thu|chi phí|giảm giá|tăng giá|tiền lãi thu|bán được|khách hàng", t):
        return "kinh_te_do_thi"
    if re.search(r"lãi suất|lãi kép|gửi tiết kiệm|tăng trưởng|dân số|vi khuẩn|phân rã|chu kì bán rã|logarit|\blog\b|hàm mũ|lạm phát", t):
        return "tang_truong"
    if re.search(r"bờ sông|qua sông|chèo thuyền|bơi qua|kéo dây điện|dây cáp từ|đường ống từ|sát tường|rào.*(?:tường|bờ)|cổng (?:hình )?parabol|thang dựa", t):
        return "so_do_2d"
    if khuon_suy == "parabol_quy_dao" and re.search(r"vận tốc|quãng đường|ném|quỹ đạo|tích phân|parabol|chuyển động|phanh", t):
        return "3d_vector"
    return None


RE_VAT_THE = re.compile(r"hộp|bìa|tấm|lon|hình trụ|hình nón|phễu|cốc|mặt cầu|quả cầu|hình chóp|lăng trụ|tứ diện|dây cáp|sợi dây|treo|"
                        r"mặt phẳng|thiết diện|khối|bể|bồn|thùng|oxyz|tòa nhà|cột|kim tự tháp", re.I)


def thuc_te_ngan(kb):
    mon = kb.get("mon") or ("THUC_TE" if re.match(r"^T[TI]\d", str(kb.get("id") or ""), re.I) else "")
    return (str(mon).upper() == "THUC_TE" and kb.get("kieu_video") != "DAI_10_PHUT"
            and not str(kb.get("id") or "").upper().endswith("-10P"))


def chon_san_khau(kb, r=None, khuon_suy=None):
    """-> {'loai': ..., 'nguon': 'chi_dao'|'ai'|'suy'|'lui', 'chi_dao': str}. Không bao giờ trả khuôn 3D cho đề không có vật thể."""
    r = r or {}
    mon = str(kb.get("mon") or r.get("mon") or "").upper()
    lop = str(kb.get("lop") or r.get("lop") or "")
    hkg = kb.get("hinh_khong_gian")   # v98: đặc tả Lego (phien_ban 2) thắng mọi sân khấu — bản đôi SanKhau.gs chonSanKhau_
    if isinstance(hkg, dict) and (str(hkg.get("phien_ban") or "") == "2" or isinstance(hkg.get("doi_tuong"), list)):
        return {"loai": "lego_3d", "nguon": "lego", "chi_dao": ""}
    if str(kb.get("luong") or "") == "hinh_hoc_thuan" or mon == "HINH_HOC":
        return {"loai": "hinh_hoc", "nguon": "khoa_luong", "chi_dao": ""}
    van = " ".join(str(x or "") for x in (kb.get("de_bai"), r.get("de_bai"), kb.get("can_tim"), kb.get("chu_de")))
    cd = str(kb.get("chi_dao") or r.get("chi_dao") or "")
    loai_cd, loi_cd = doc_chi_dao(cd)
    bat_buoc = thuc_te_ngan({**r, **kb})
    k4 = kb.get("khung4tang") if isinstance(kb.get("khung4tang"), dict) else {}
    sk = k4.get("san_khau") if isinstance(k4.get("san_khau"), dict) else {}
    if bat_buoc and (kb.get("san_khau_dich") == "tu_sinh_svg" or k4.get("tu_sinh") or sk.get("loai") == "tu_sinh_svg"):
        return {"loai": "tu_sinh_svg", "nguon": "hop_dong", "chi_dao": loi_cd}
    loai_tt = LOAI_2D_TT if cho_do_thi_thuan(van) else ("so_do_2d",)
    if bat_buoc and re.search(r"lối đi", van, re.I) and not k4.get("canh_3d_vector"):
        return {"loai": "tu_sinh_svg", "nguon": "suy", "chi_dao": loi_cd}
    if loai_cd and (not bat_buoc or loai_cd in (*loai_tt, "3d_vector")):
        if loai_cd == "luoi_bayes" and lop != "12":
            loai_cd = "so_do_cay"   # chỉ đạo không vượt GDPT 2018 (Bayes chỉ có ở lớp 12)
        if loai_cd in LOAI_XS and mon != "XAC_SUAT" and not re.search(r"xác suất|ngẫu nhiên", van, re.I):
            loai_cd = loai_cd   # người dùng chỉ định rõ -> vẫn tôn trọng
        return {"loai": loai_cd, "nguon": "chi_dao", "chi_dao": loi_cd}
    if not bat_buoc and str(kb.get("san_khau_dich") or "") == "cay_bayes":   # v99.2: hợp đồng hình BP0 (bản đôi SanKhau.gs chonSanKhau_)
        return {"loai": "so_do_cay", "nguon": "hop_dong", "chi_dao": loi_cd}
    if sk.get("loai") in (loai_tt if bat_buoc else LOAI_SAN_KHAU):
        loai = sk["loai"]
        if loai == "luoi_bayes" and lop != "12":
            loai = "so_do_cay"
        return {"loai": loai, "nguon": "ai", "chi_dao": loi_cd}
    c3 = k4.get("canh_3d_vector") if isinstance(k4.get("canh_3d_vector"), dict) else {}
    if mon == "XAC_SUAT" or not bat_buoc and re.search(r"tính xác suất|xác suất để", van, re.I):
        return {"loai": loai_xac_suat(van, lop), "nguon": "suy", "chi_dao": loi_cd}
    khuon = (c3.get("khuon") if c3.get("khuon") != "luoi_the_bi_xac_suat" else None) or ("__tu_do__" if c3.get("doi_tuong") else khuon_suy)
    if not khuon and re.search(r"gập|hộp|hình trụ|\blon\b|hình nón|phễu|hình chóp|lăng trụ|mặt cầu|dây cáp|thiết diện|bồn|bể", van, re.I):
        khuon = "__tu_do__"   # bản rút gọn của suyKhuon_ (Apps Script) khi chuanbi chưa truyền khuôn suy từ đề
    loai = loai_thuc_te(van, khuon)
    if bat_buoc and loai in ("kinh_te_do_thi", "tang_truong") and not cho_do_thi_thuan(van):
        loai = None
    if loai:
        return {"loai": loai, "nguon": "suy", "chi_dao": loi_cd}
    if c3.get("khuon") in KHUON_VAT_THE and RE_VAT_THE.search(van):
        return {"loai": "3d_vector", "nguon": "ai", "chi_dao": loi_cd}
    return {"loai": "tu_sinh_svg" if bat_buoc else "tu_duy_dai_so", "nguon": "lui", "chi_dao": loi_cd}


def bat_buoc_vat_the(kb):
    van = " ".join(str(kb.get(k) or "") for k in ("de_bai", "can_tim", "chu_de"))
    return thuc_te_ngan(kb) and not cho_do_thi_thuan(van)


def loi_thu_tu_toi_uu(kb):
    if not re.search(r"tối ưu|cực trị|lớn nhất|nhỏ nhất|cực đại|cực tiểu", str(kb.get("de_bai") or ""), re.I):
        return ""
    # Chỉ nhận câu mô tả thao tác của bước, bỏ qua hook/đề bài nhắc trước mục tiêu.
    nhom = [r"(?:gọi|đặt|chọn) (?:ẩn|biến|[xtrh](?!\w))",
            r"lập (?:hàm|biểu thức)|xây dựng hàm|thiết lập hàm",
            r"tìm (?:đỉnh|cực trị)|xét (?:đỉnh|đạo hàm)|tính đạo hàm",
            r"chốt (?:đáp án|kết quả)|kết luận"]
    def lui(cac_cau):
        pha = -1
        for cau in cac_cau:
            for hit in re.finditer("|".join("(" + expr + ")" for expr in nhom), cau, re.I):
                bac = hit.lastindex - 1
                if bac < pha:
                    return True
                pha = bac
        return False
    buoc = (kb.get("khung4tang") or {}).get("buoc") or []
    tieu_de = [str(b.get("tieu_de") or b.get("nhan") or "") for b in buoc if isinstance(b, dict)]
    loi = [str(c.get("loi_thoai") or "") for c in kb.get("canh") or [] if isinstance(c, dict)
           and c.get("loai") not in ("hook", "de_bai", "mo_dau", "cta", "bai_hoc")]
    if lui(tieu_de) or lui(loi):
        return "Sắp lại lời và thẻ: gọi ẩn trên hình, lập hàm, tìm cực trị, chốt đáp án."
    return ""


def loi_truoc_tts(kb, khuon_suy=None):
    k4 = kb.get("khung4tang") or {}
    route = chon_san_khau(kb, khuon_suy=khuon_suy)["loai"]
    sk = k4.get("san_khau") or {}
    if not k4 or not k4.get("buoc"):
        if route != "lego_3d":
            return "Thiếu khung và các bước minh họa của đề thực tế."
    if bat_buoc_vat_the(kb):
        from khung4tang_v93 import kiem_doi_chieu
        for i, step in enumerate(k4.get("buoc") or []):
            if not isinstance(step, dict) or not step.get("doi_chieu"):
                continue
            d = kiem_doi_chieu(step["doi_chieu"])
            if not d:
                return "Đối chiếu bước %d thiếu hàm hoặc miền hợp lệ bên phải." % (i+1)
            lo, hi = d["mien"]
            ts = d.get("tham_so") or {}
            a = doc_ti_le(ts.get("a")) or 0
            b = doc_ti_le(ts.get("b", a)) or 0
            hinh = d.get("hinh")
            if lo < 0 or not ((hinh == "tam_bia" and hi <= min(a, b)/2 + 1e-6)
                              or (hinh == "mat_cat_tru" and (doc_ti_le(ts.get("V")) or 0) > 0)
                              or (hinh == "tam_giac_luc" and hi <= 89)):
                return "Đối chiếu bước %d thiếu vật thể co giãn bên trái. BP2 sinh sơ đồ đúng đề." % (i+1)
    if route == "tu_sinh_svg":
        svg = k4.get("tu_sinh") or (sk if sk.get("loai") == route else {})
        if not (svg.get("ma") or (svg.get("tham_so") or {}).get("ma")):
            return "Thiếu hình vật thể. BP2 sinh các lớp ve25d theo đề và từng bước."
    if route == "so_do_2d" and (sk.get("tham_so") or {}).get("mau") not in MAU_SO_DO_2D:
        return "Thiếu mẫu sơ đồ vật thể. BP2 sinh hình ve25d đúng kích thước đề."
    if route == "3d_vector" and not (khuon_suy or k4.get("canh_3d_vector")):
        return "Thiếu đặc tả vật thể 3D; BP2 sinh hình bằng ve25d."
    if route in ("kinh_te_do_thi", "tang_truong"):
        if not dung_san_khau(route, sk.get("tham_so") or {}, kb, k4, [], []):
            return "Thiếu hàm hoặc miền hợp lệ cho đồ thị."
        if any(re.search(r"nhìn (?:vào )?hình vẽ", str(c.get("loi_thoai") or ""), re.I) for c in kb.get("canh") or [] if isinstance(c, dict)):
            return "Sân khấu là đồ thị; sửa lời dẫn 'nhìn vào hình vẽ' cho khớp."
    return loi_thu_tu_toi_uu(kb)


# ====================================================================================================================
# 8. GHÉP VÀO PROPS (gọi từ chuanbi.khung_4_tang): dựng + gán mốc pha + đảm bảo hook 2 s và không đứng hình > 4 s
# ====================================================================================================================
PHA_MAC_DINH = {
    "rut_mau": ["hien", "nhom", "khong_gian_mau", "thu", "doi", "ket"],
    "so_do_cay": ["goc", "tang_1", "tang_2", "duong", "tich", "ket"],
    "luoi_bayes": ["vuong", "cat_doc", "cat_ngang", "giao", "ket"],
    "cot_phan_phoi": ["truc", "cot", "dich", "cong", "ket"],
    "kinh_te_do_thi": ["truc", "ve", "keo", "toi_uu", "ket"],
    "so_do_2d": ["hinh", "bien", "keo", "toi_uu", "ket"],
    "tang_truong": ["truc", "ve", "moc", "so_sanh", "ket"],
    "tu_duy_dai_so": ["du_kien", "suy_luan", "bien_doi", "ket"],
}
GOI_Y_PHA_2D = {
    "rut_mau": {"nhom": ["chia các số", "chia thành", "nhóm", "chia làm"], "khong_gian_mau": ["không gian mẫu", "số cách chọn", "số cách rút", "tổ hợp chập"],
                "thu": ["thử rút", "thử bốc", "ví dụ", "chẳng hạn", "giả sử rút"], "doi": ["biến cố đối", "ngược lại", "không chia hết"],
                "ket": ["vậy xác suất", "xác suất cần tìm", "xác suất bằng", "xác suất của a"]},
    "so_do_cay": {"tang_1": ["lần thứ nhất", "lần đầu", "đầu tiên"], "tang_2": ["lần thứ hai", "tiếp theo", "sau đó"], "duong": ["đường đi", "nhánh", "trường hợp"],
                  "tich": ["nhân", "nhân các xác suất"], "ket": ["cộng lại", "vậy xác suất"],
                  "toan_phan": ["xác suất toàn phần", "toàn phần", "tổng các nhánh dẫn"], "bayes": ["công thức bay", "định lý bay", "bay-ét", "bayes", "biết rằng"]},
    "luoi_bayes": {"cat_doc": ["tỉ lệ", "mắc bệnh", "phần trăm"], "cat_ngang": ["dương tính", "trong số"], "giao": ["vừa", "cả hai", "giao"], "ket": ["vậy xác suất", "chỉ khoảng"]},
    "cot_phan_phoi": {"cot": ["mỗi giá trị", "phân phối", "lần lượt"], "dich": ["đúng", "ít nhất"], "cong": ["cộng", "tổng"], "ket": ["vậy xác suất"]},
    "kinh_te_do_thi": {"ve": ["hàm lợi nhuận", "lợi nhuận bằng", "doanh thu bằng"], "keo": ["nếu giảm", "nếu tăng", "khi giá"], "toi_uu": ["lớn nhất", "cực đại", "đỉnh"]},
    "so_do_2d": {"bien": ["gọi x", "đặt x"], "keo": ["nếu", "khi x"], "toi_uu": ["nhỏ nhất", "ngắn nhất", "nhanh nhất", "lớn nhất"]},
    "tang_truong": {"ve": ["sau mỗi", "mỗi năm", "mỗi tháng"], "moc": ["sau", "năm thứ"], "so_sanh": ["gấp", "so với", "vượt"]},
    "tu_duy_dai_so": {"suy_luan": ["suy ra", "nên", "ta có"], "bien_doi": ["biến đổi", "đưa về", "thay vào"], "ket": ["vậy", "kết luận"]},
}


def dung_san_khau(loai, ts, kb, k4, buoc, sua):
    lop = str(kb.get("lop") or "")
    if loai == "rut_mau":
        return dung_rut_mau(ts, kb, sua)
    if loai == "so_do_cay":
        return dung_so_do_cay(ts, kb, sua, lop)
    if loai == "luoi_bayes":
        if lop != "12":
            sua.append("luoi_bayes chỉ dùng cho lớp 12 -> bỏ")
            return None
        return dung_luoi_bayes(ts, kb, sua)
    if loai == "cot_phan_phoi":
        return dung_cot_phan_phoi(ts, kb, sua)
    if loai == "kinh_te_do_thi":
        return dung_kinh_te(ts, kb, sua)
    if loai == "so_do_2d":
        return dung_so_do_2d(ts, kb, sua)
    if loai == "tang_truong":
        return dung_tang_truong(ts, kb, sua)
    if loai == "tu_duy_dai_so":
        return dung_tu_duy(kb, k4, buoc)
    return None


def trai_pha(ds_pha, t_buoc, t_het_de, tong):
    """Pha chưa có mốc -> trải theo mốc các bước giải (pha 0 ở 0,3 s cho hook 2 s đầu; pha 1 ngay sau phần đọc đề);
    bảo đảm pha tăng dần, cách nhau >= 0,6 s, và KHÔNG có khoảng lặng > 4 s không có pha mới (chèn pha 'nhip')."""
    n = len(ds_pha)
    if not n:
        return ds_pha
    nb = max(1, len(t_buoc))
    if ds_pha[0].get("t") is None:
        ds_pha[0]["t"] = 0.3
    moc_buoc = [max(t_het_de, x) for x in t_buoc] or [t_het_de]
    for k in range(1, n):
        if ds_pha[k].get("t") is None:
            u = (k - 1) * nb / max(1, n - 1)
            j = min(nb - 1, int(u))
            a = moc_buoc[j]
            b = moc_buoc[j + 1] if j + 1 < nb else tong
            ds_pha[k]["t"] = round(a + 0.6 + (u - j) * max(0, b - a - 0.6), 3)
    for k in range(1, n):
        ds_pha[k]["t"] = round(max(ds_pha[k]["t"], ds_pha[k - 1]["t"] + 0.6), 3)
    return ds_pha


def nhip_chong_dung(ds_pha, tong, tran=4.0):
    """Mốc vi chuyển động (giây) cho mọi khoảng > tran giây giữa hai pha -> props.sanKhau.nhip (TS nhấn nhá tại các mốc)."""
    moc = [p["t"] for p in ds_pha] + [tong]
    nhip = []
    for a, b in zip(moc, moc[1:]):
        x = a + tran * 0.75
        while x < b - 0.8:
            nhip.append(round(x, 3))
            x += tran * 0.75
    return nhip


def gan_san_khau(kb, k4, buoc, t_buoc, t_het_de, tong, tim_moc, r=None, khuon_suy=None, loi_tai=None):
    """Toàn bộ: định tuyến -> dựng -> mốc pha (khi_noi -> giây, chỉ tiến; thiếu thì cụm gợi ý; thiếu nữa thì trải theo bước) ->
    bộ mẫu theo biến cố đang giảng -> nhịp chống đứng hình. Trả (san_khau | None, nhật ký sửa, quyết định định tuyến)."""
    sua = []
    quyet = chon_san_khau(kb, r, khuon_suy)
    loai = quyet["loai"]
    from xac_suat_dong import mo_phong, ngan
    if ngan(kb) and buoc and loai not in ("lego_3d", "hinh_hoc"):
        raw = [b for b in k4.get("buoc", []) if isinstance(b, dict)]
        dong = mo_phong(kb, raw, buoc, loi_tai or (lambda a, b: ""), tong)
        if dong:
            return dong, [], {"loai": "rut_mau", "nguon": "buoc"}
    if loai in ("hinh_hoc", "3d_vector", "lego_3d", "tu_sinh_svg"):
        return None, sua, quyet
    sk_ai = k4.get("san_khau") if isinstance(k4.get("san_khau"), dict) else {}
    ts = sk_ai.get("tham_so") if isinstance(sk_ai.get("tham_so"), dict) and sk_ai.get("loai") == loai else {}
    c3_ai = k4.get("canh_3d_vector") if isinstance(k4.get("canh_3d_vector"), dict) else {}
    if loai == "rut_mau" and not ts and c3_ai.get("khuon") == "luoi_the_bi_xac_suat" and isinstance(c3_ai.get("tham_so"), dict):
        ts = dict(c3_ai["tham_so"])   # kịch bản cũ ghi lưới thẻ 3D: dùng lại tham số (nhóm sẽ được tô lại THEO GIÁ TRỊ)
        ts.pop("chon", None)
        sua.append("rut_mau: nhận tham số từ khuôn 3D cũ luoi_the_bi_xac_suat")
    sk = dung_san_khau(loai, ts, kb, k4, buoc, sua)
    if sk is None and thuc_te_ngan(kb):
        return None, sua, quyet
    if sk is None and loai != "tu_duy_dai_so":
        sua.append("sân khấu %s không dựng được -> sơ đồ tư duy" % loai)
        quyet = dict(quyet, loai="tu_duy_dai_so", nguon="lui")
        sk = dung_tu_duy(kb, k4, buoc)
    if sk is None:
        return None, sua, quyet
    loai = sk["loai"]
    pha_ai = [dict(p) for p in (sk_ai.get("pha") or []) if isinstance(p, dict) and p.get("ten")] if sk_ai.get("loai") == loai else []
    ten_md = PHA_MAC_DINH[loai]
    if loai == "rut_mau":
        ten_md = [x for x in ten_md if x != "doi" or _co_bien_co_doi(kb)]
    if loai == "so_do_cay" and not any(n.get("tang") == 2 for n in sk.get("nut") or []):
        ten_md = [x for x in ten_md if x != "tang_2"]
    if loai == "so_do_cay" and sk.get("bayes"):   # v98.1: cây Bayes -> thêm bước toàn phần P(D) và bước Bayes P(H|D) trước pha chốt
        ten_md = [x for x in ten_md if x != "ket"] + ["toan_phan", "bayes", "ket"]
    ds = pha_ai or [{"ten": x} for x in ten_md]
    if loai == "tu_duy_dai_so":   # mỗi nút suy luận bật đúng lúc bước giải tương ứng bắt đầu
        ds = [{"ten": "du_kien", "t": 0.3}] + [{"ten": "nut_%d" % j, "t": round(max(t_het_de, t_buoc[j] if j < len(t_buoc) else tong) + 0.5, 3)}
                                              for j in range(len(sk.get("nut") or []))]
    goi_y = GOI_Y_PHA_2D.get(loai, {})
    if not pha_ai and loai != "tu_duy_dai_so":
        # pha mặc định: dò cụm gợi ý ĐỘC LẬP (từ sau phần đọc đề) rồi sắp theo lời đọc — lời giảng có thể đếm n(Ω) trước khi chia nhóm
        for k, ph in enumerate(ds):
            if k == 0:
                continue
            for cum in goi_y.get(ph["ten"], []):
                kq = tim_moc(cum, 0, t_tu=t_het_de)
                if kq:
                    ph["t"] = kq[2]
                    break
        if loai == "rut_mau":   # pha chốt luôn sau cùng, pha đối luôn sau pha thử
            co = [p for p in ds[1:] if p.get("t") is not None]
            if len(co) >= 2:
                dau = ds[0]
                ds = [dau] + sorted(ds[1:], key=lambda p: (p.get("t") if p.get("t") is not None else 1e9, ten_md.index(p["ten"])))
    ct = 0
    for ph in ds:
        kq = tim_moc(str(ph.get("khi_noi") or ""), ct) if ph.get("khi_noi") else None
        if kq is None and ph.get("t") is None and pha_ai and ph.get("ten") in goi_y and ds.index(ph) > 0:
            for cum in goi_y[ph["ten"]]:
                kq = tim_moc(cum, ct, t_tu=t_het_de)
                if kq:
                    break
        if kq:
            ct = kq[1]
            ph["t"] = kq[2]
        ph.pop("khi_noi", None)
    if ngan(kb) and t_buoc and loai in ("so_do_cay", "luoi_bayes", "cot_phan_phoi"):
        # Mỗi pha bắt buộc xuất hiện đúng một lần. Giữ mốc bước khai báo,
        # nội suy các pha còn thiếu giữa hai bước thay vì bỏ toàn bộ liên kết.
        anchors = {0: 0.0, len(ten_md)-1: t_buoc[-1]}
        for i, raw in enumerate((k4.get("buoc") or [])[:len(t_buoc)]):
            if not isinstance(raw, dict):
                continue
            action = raw.get("hanh_dong")
            phase = (action.get("pha") if isinstance(action, dict) else None) or raw.get("pha")
            if phase in ten_md[1:-1]:
                anchors.setdefault(ten_md.index(phase), t_buoc[i])
        anchors[1] = 0.4  # nhánh cấp một / cắt dọc / cột nền hiện ngay khi giới thiệu
        for ph in ds:
            if ph.get("t") is None or ph["ten"] not in ten_md[2:-1]:
                continue
            j = ten_md.index(ph["ten"])
            left = max(k for k in anchors if k < j)
            right = min(k for k in anchors if k > j)
            if anchors[left] <= ph["t"] <= anchors[right]:
                anchors.setdefault(j, ph["t"])
        times = sorted(anchors)
        ds = []
        for j, name in enumerate(ten_md):
            if j in anchors:
                at = anchors[j]
            else:
                left = max(k for k in times if k < j)
                right = min(k for k in times if k > j)
                frac = (j-left)/(right-left)
                near = round(frac*(len(t_buoc)-1))
                candidate = t_buoc[near]
                at = candidate if anchors[left] < candidate < anchors[right] else anchors[left] + frac*(anchors[right]-anchors[left])
            ds.append({"ten": name, "t": at})
        sk["moc_buoc"] = list(t_buoc)
        labels = ([n["nhan"] for n in sk["nut"] if n["tang"] == 1] if loai == "so_do_cay"
                  else [c["nhan"] for c in sk["cot"]] if loai == "cot_phan_phoi"
                  else [sk["nhan_a"], "không " + sk["nhan_a"]])
        sk["nhanh_buoc"] = []
        for i, raw in enumerate(k4.get("buoc") or []):
            action = raw.get("hanh_dong") if isinstance(raw, dict) else None
            selected = action.get("nhanh") if isinstance(action, dict) else None
            if type(selected) is not int or not 0 <= selected < len(labels):
                title = " ".join(str(raw.get(key) or "") for key in ("tieu_de", "khi_noi")).casefold() if isinstance(raw, dict) else ""
                matches = [j for j, label in enumerate(labels) if label and re.search(r"(?<!\w)" + re.escape(label.casefold()) + r"(?!\w)", title)]
                selected = max(matches, key=lambda j: len(labels[j])) if matches else i % max(1, len(labels))
            sk["nhanh_buoc"].append(selected)
    elif ngan(kb) and loai in LOAI_XS:
        linked = []
        for i, raw in enumerate(k4.get("buoc") or []):
            if not isinstance(raw, dict) or i >= len(t_buoc):
                break
            action = raw.get("hanh_dong") or {}
            ten = action.get("pha") if isinstance(action, dict) else None
            ten = ten or raw.get("pha")
            if ten not in ten_md:
                break
            ph = {"ten": ten, "t": t_buoc[i]}
            selected = raw.get("mau_chon") or (action.get("mau_chon") if isinstance(action, dict) else None)
            if isinstance(selected, list):
                ph["chon"] = selected
            linked.append(ph)
        if linked and len(linked) == len(t_buoc):
            ds = linked
    if thuc_te_ngan(kb) and loai in LOAI_2D_TT:
        # Dựng hình của đề trước khi mở các pha giải.
        base = ["hinh"] if loai == "so_do_2d" else ["truc", "ve"]
        ds = [{"ten": name, "t": 0.6 * i} for i, name in enumerate(base)] + [ph for ph in ds if ph["ten"] not in base]
    trai_pha(ds, t_buoc, t_het_de, tong)
    if loai == "rut_mau":
        sua += gan_bo_mau_rut(sk, ds, buoc, loi_tai)
        for k in ("_mau_A", "_mau_doi", "_bc"):
            sk.pop(k, None)
    sk["pha"] = [{k: v for k, v in p.items() if k in ("ten", "t", "chon", "thoa", "bt", "kl", "muc_tieu")} for p in ds]
    sk["nhip"] = nhip_chong_dung(sk["pha"], tong)
    sk["nguon"] = quyet["nguon"]
    if quyet.get("chi_dao"):
        sk["chi_dao"] = quyet["chi_dao"]
    return sk, sua, quyet


def _co_bien_co_doi(kb):
    van = json.dumps([kb.get("khung4tang"), [c.get("loi_thoai") for c in kb.get("canh") or [] if isinstance(c, dict)]], ensure_ascii=False)
    return bool(re.search(r"biến cố đối|overline|\\\\bar|Ā|P\(\s*\\\\overline", van))


# ====================================================================================================================
# 9. KIỂM KỊCH BẢN: đọc lặp đề / cụt công thức (bản Python của SanKhau.gs; chuanbi chỉ ghi cảnh báo, chặn ở Apps Script)
# ====================================================================================================================
def _ngram(s, n=3):
    w = re.findall(r"[0-9a-zà-ỹđ]+", str(s or "").lower())
    return {" ".join(w[i:i + n]) for i in range(len(w) - n + 1)}


def canh_lap_de(kb, nguong=0.6):
    """Chỉ số các cảnh đọc lại >= 60% cụm 3 từ của đề (cảnh đầu tiên đọc đề được giữ, các cảnh sau là lặp)."""
    de = _ngram(kb.get("de_bai"))
    if len(de) < 6:
        return []
    doc = []
    for i, c in enumerate(kb.get("canh") or []):
        if isinstance(c, dict):
            g = _ngram(c.get("loi_thoai"))
            if g and len(g & de) / max(1, min(len(de), len(g))) >= nguong and len(g & de) >= 5:
                doc.append(i)
    return doc[1:]


def so_ket_qua_dong(d):
    """Dòng công thức 'n(Ω) = C_{10}^3 = 120' -> '120' (vế phải cuối nếu là số / phân số)."""
    s = str(d or "").replace("{,}", ",").replace("\\dfrac", "\\frac")
    if "=" not in s:
        return None
    ve = s.rsplit("=", 1)[1].strip().rstrip(".")
    ve = re.sub(r"\\(?:text|mathrm)\{[^{}]*\}", "", ve).strip()
    m = re.fullmatch(r"\\frac\{(\d+)\}\{(\d+)\}|(\d+)\s*/\s*(\d+)|(\d+(?:[.,]\d+)?)\s*%?", ve)
    return ve if m else None


def loi_noi_so(loi, so):
    """Lời thoại đã đọc ra số `so` (chữ số hoặc dạng đọc tiếng Việt)?"""
    l = " " + re.sub(r"\s+", " ", str(loi or "").lower().replace("{,}", ",")) + " "
    for d in cac_dang_doc_so(so):
        d = d.lower()
        if re.search(r"(?<![\d.,/])" + re.escape(d) + r"(?![\d/]|[.,]\d)", l):
            return True
    return False
