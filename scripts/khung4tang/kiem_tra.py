#!/usr/bin/env python3
"""Gói khung4tang.kiem_tra — Nguồn chính duy nhất kiểm tra TeX, Cửa 1 (cong_loc_som), che đáp án (v98) và kiểm kịch bản."""
import re

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


SO_TREN = str.maketrans("0123456789+-=()nikx", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱᵏˣ")
SO_DUOI = str.maketrans("0123456789+-=()aehijklmnoprstuvx", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ")
LENH_CHU = {"cdot": "·", "times": "×", "div": "÷", "pm": "±", "mp": "∓", "le": "≤", "leq": "≤", "ge": "≥", "geq": "≥", "ne": "≠", "neq": "≠",
            "approx": "≈", "equiv": "≡", "Omega": "Ω", "omega": "ω", "cap": "∩", "cup": "∪", "in": "∈", "notin": "∉", "subset": "⊂",
            "pi": "π", "vdots": "⋮", "Rightarrow": "⇒", "rightarrow": "→", "to": "→", "Leftrightarrow": "⇔", "iff": "⇔",
            "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "Delta": "Δ", "theta": "θ", "lambda": "λ", "mu": "μ",
            "sigma": "σ", "Sigma": "Σ", "varphi": "φ", "phi": "φ", "infty": "∞", "emptyset": "∅", "varnothing": "∅",
            "angle": "∠", "circ": "°", "degree": "°", "perp": "⊥", "parallel": "∥", "triangle": "△", "ldots": "…", "cdots": "⋯", "dots": "…",
            "mid": "|", "sim": "~", "percent": "%", "quad": " ", "qquad": " ",
            "sin": "sin", "cos": "cos", "tan": "tan", "cot": "cot", "log": "log", "ln": "ln", "lg": "lg", "max": "max", "min": "min", "lim": "lim"}
LENH_KATEX_HOP_LE = set(LENH_CHU.keys()) | {
    "frac", "dfrac", "tfrac", "binom", "dbinom", "tbinom", "sqrt", "overline", "bar", "widehat", "vec", "overrightarrow",
    "text", "textrm", "textbf", "textit", "mathrm", "mathbf", "mathit", "boldsymbol", "operatorname", "mbox",
    "color", "textcolor", "colorbox", "hl", "mvang", "mdo", "mngoc", "mcam", "mla",
    "left", "right", "displaystyle", "limits", "begin", "end", "not", "nmid", "cong", "implies", "Longrightarrow",
    "big", "Big", "bigg", "Bigg", "setminus", "forall", "exists", "dpcm", "exp", "det", "mod", "gcd",
}


def kiem_tra_tex_hop_le(s):
    """Kiểm cân bằng {} và cú pháp lệnh TeX cho ô chạy KaTeX (chặn lệnh cụt như \\te, \\color thiếu ngoặc)."""
    x = str(s or "").strip()
    if not x:
        return True
    if "$" in x or re.search(r"\\\\[A-Za-z]|\\$", x):
        return False
    sau = 0
    i = 0
    while i < len(x):
        ch = x[i]
        if ch == "\\" and i + 1 < len(x):
            i += 2
            continue
        if ch == "{":
            sau += 1
        elif ch == "}":
            sau -= 1
            if sau < 0:
                return False
        i += 1
    if sau != 0:
        return False
    if re.search(r"\\(?:text|textrm|textbf|textit|mathrm|mathbf|overline|bar|sqrt|color|[dt]?frac|[dt]?binom)\s*(?:\{\s*\}|$)", x):
        return False
    if re.search(r"\\(?:[dt]?frac|[dt]?binom|textcolor)\s*\{[^{}]*\}\s*(?:$|[^\{\s])", x):
        return False
    for m in re.finditer(r"\\([A-Za-z]+)", x):
        if m.group(1) not in LENH_KATEX_HOP_LE:
            return False
    return True


def va_cu_phap_tex(s):
    """Tiền xử lý vá lỗi TeX thuần code chạy TRƯỚC kiểm duyệt TEX_LENH_CUT (bản đôi suaCuPhapTex_ trong KiemTraHinh.gs):
      - Cân bằng ngoặc { } cho các lệnh phổ biến (\\text{, \\textbf{, \\mathrm{, \\overline{...)
      - Xóa/dọn các đuôi lệnh cắt vỡ ở cuối chuỗi (\\te, \\text{ rỗng, cụm vỡ |\\color{#...}...)
      - Bóc vỏ \\text{...} khi bên trong chỉ chứa câu chữ tiếng Việt thuần không có toán phức tạp.
    """
    if not isinstance(s, str):
        return s
    t = re.sub(r"\\\\([A-Za-z]+)", r"\\\1", s.replace("$", ""))
    # 1) Dọn cụm vỡ kiểu "|\color{#FACC15}t|\te" hoặc "\color{#...}" cắt dở
    t = re.sub(
        r"\|\s*\\color\s*\{#[0-9A-Fa-f]{3,8}\}\s*([^|{}\\]*?)\|\s*(?:\\[A-Za-z]*)?$",
        lambda m: (" | " + m.group(1).strip()) if m.group(1).strip() else "",
        t,
    )
    t = re.sub(
        r"\|\s*\\color\s*\{#[0-9A-Fa-f]{3,8}\}\s*([^|{}\\]*?)(?=\||$)",
        lambda m: (" | " + m.group(1).strip()) if m.group(1).strip() else "",
        t,
    )
    t = re.sub(r"\\color\s*\{[^}]*$", "", t).strip()
    # 2) Gỡ lệnh cắt cụt ở cuối chuỗi (\te, \co, \) và lệnh mở ngoặc rỗng ở cuối (2\text{)
    for _ in range(3):
        t0 = t
        t = re.sub(
            r"\|?\s*\\([A-Za-z]+)\s*$",
            lambda m: m.group(0) if m.group(1) in LENH_KATEX_HOP_LE else "",
            t,
        )
        t = re.sub(r"\|?\s*\\\s*$", "", t).strip()
        t = re.sub(
            r"\\(?:text|textrm|textbf|textit|mathrm|mathbf|overline|bar|sqrt|color|textcolor|[dt]?frac|[dt]?binom)\s*\{\s*$",
            "",
            t,
        ).strip()
        t = re.sub(r"\\textcolor\s*\{[^{}]*\}\s*$", "", t).strip()
        t = re.sub(r"\\[dt]?frac\s*\{([^{}]*)\}\s*$", r"\1", t).strip()
        if t == t0:
            break
    # 3) Cân bằng { / }
    mo = 0
    out_chars = []
    i = 0
    while i < len(t):
        ch = t[i]
        if ch == "\\" and i + 1 < len(t):
            out_chars.append(ch + t[i + 1])
            i += 2
            continue
        if ch == "{":
            mo += 1
            out_chars.append(ch)
        elif ch == "}":
            if mo > 0:
                mo -= 1
                out_chars.append(ch)
        else:
            out_chars.append(ch)
        i += 1
    out = "".join(out_chars) + ("}" * mo)
    # 4) Bỏ vỏ lệnh rỗng & lệnh lạ không nằm trong danh sách KaTeX hợp lệ
    out = re.sub(r"\\(?:text|textrm|textbf|textit|mathrm|mathbf|overline|bar|sqrt|color)\s*\{\s*\}", "", out)
    out = re.sub(r"\\([A-Za-z]+)", lambda m: m.group(0) if m.group(1) in LENH_KATEX_HOP_LE else "", out)
    out = re.sub(r"\s+", " ", out).strip()
    # 5) Bóc vỏ \text{...} nếu chỉ chứa chữ tiếng Việt thuần không có toán phức tạp
    if re.search(r"\\(?:text|textrm|textbf)\s*\{", out):
        thu_boc = re.sub(r"\\(?:text|textrm|textbf)\s*\{([^{}\\]*)\}", r"\1", out)
        thu_boc = re.sub(r"\s+", " ", thu_boc).strip()
        if not re.search(r"[\\^_{}]", thu_boc):
            out = thu_boc
    return out


def va_cu_phap_tex_kb(kb):
    """Tiền xử lý vá TeX trên mọi ô hiển thị / KaTeX của kịch bản trước bước kiểm duyệt."""
    if not isinstance(kb, dict):
        return kb

    def sua(obj, key):
        if isinstance(obj, dict) and isinstance(obj.get(key), str) and re.search(r"[\\{}^_$]", obj[key]):
            obj[key] = va_cu_phap_tex(obj[key])

    def sua_mang(arr):
        if not isinstance(arr, list):
            return arr
        return [va_cu_phap_tex(x) if isinstance(x, str) and re.search(r"[\\{}^_$]", x) else x for x in arr]

    for c in kb.get("canh") or []:
        if not isinstance(c, dict):
            continue
        sua(c, "tieu_de_canh")
        if isinstance(c.get("noi_dung_man_hinh"), list):
            c["noi_dung_man_hinh"] = sua_mang(c["noi_dung_man_hinh"])
        if isinstance(c.get("chu_thich"), list):
            c["chu_thich"] = sua_mang(c["chu_thich"])
    if isinstance(kb.get("de_cho"), list):
        kb["de_cho"] = sua_mang(kb["de_cho"])
    sua(kb, "can_tim")
    for d in kb.get("tom_tat_3_buoc") or []:
        if isinstance(d, dict):
            sua(d, "chien_thuat")
            sua(d, "cong_thuc")
    k4 = kb.get("khung4tang") if isinstance(kb.get("khung4tang"), dict) else {}
    for d in k4.get("de_ghim") or []:
        if isinstance(d, dict):
            sua(d, "nhan")
    for b in k4.get("buoc") or []:
        if not isinstance(b, dict):
            continue
        sua(b, "nhan")
        sua(b, "tieu_de")
        for th in b.get("the") or []:
            if not isinstance(th, dict):
                continue
            sua(th, "nhan")
            sua(th, "noi_dung")
            if isinstance(th.get("dong"), list):
                th["dong"] = sua_mang(th["dong"])
    sk_ts = (k4.get("san_khau") or {}).get("tham_so") if isinstance(k4.get("san_khau"), dict) else None
    if isinstance(sk_ts, dict):
        for k in ("nhan_bien", "nhan_ham", "don_vi"):
            sua(sk_ts, k)
        if isinstance(sk_ts.get("nhan"), dict):
            for nk in list(sk_ts["nhan"].keys()):
                sua(sk_ts["nhan"], nk)
        for g in sk_ts.get("nhom") or []:
            if isinstance(g, dict):
                sua(g, "nhan")
    return kb


def _chua_dap_so_chinh_xac(text, num_val):
    t = str(text or "").replace("{,}", ",")
    t = re.sub(r"\\,|\\ |~", "", t)
    t = re.sub(r"(\d)\s+(?=\d{3}(?:\D|$))", r"\1", t)
    tol = max(1e-6, 1e-6 * abs(num_val))
    for m in re.findall(r"-?\d+(?:[.,]\d+)?", t):
        try:
            v = float(m.replace(",", "."))
            if abs(v - num_val) <= tol:
                return True
        except ValueError:
            pass
    return False


def dong_bo_dap_so_canh_dap_an(kb):
    """Tự đồng bộ đáp số chốt của kịch bản/BP1 vào `noi_dung_man_hinh` cảnh `dap_an` (và thẻ bước khung4tang tương ứng)."""
    if not isinstance(kb, dict):
        return False
    canh = kb.get("canh")
    if not isinstance(canh, list) or not canh:
        return False
    goc = str(kb.get("dap_an") or kb.get("dap_an_cuoi") or "").strip()
    if not re.fullmatch(r"-?\d+(?:[.,]\d+)?", goc):
        return False
    dap_norm = goc.replace(",", ".")
    try:
        num_val = float(dap_norm)
    except ValueError:
        return False
    so_tex = dap_norm.replace(".", "{,}")
    hien = str(kb.get("dap_an_hien") or "").strip()
    if hien and _chua_dap_so_chinh_xac(hien, num_val) and len(hien) <= 40:
        dong_bo_sung = "\\text{%s}" % re.sub(r"[{}\\]", "", hien)
    else:
        dong_bo_sung = "\\text{Đáp số: } " + so_tex

    ds_da = [(i, c) for i, c in enumerate(canh) if isinstance(c, dict) and re.search(r"dap_an|ket_qua", str(c.get("loai") or ""), re.I)]
    if not ds_da:
        return False
    da_sua = False
    for _, c in ds_da:
        nd = c.get("noi_dung_man_hinh")
        if not isinstance(nd, list):
            nd = [str(nd)] if nd else []
            c["noi_dung_man_hinh"] = nd
        if not any(_chua_dap_so_chinh_xac(line, num_val) for line in nd):
            c["noi_dung_man_hinh"] = nd[:3] + [dong_bo_sung]
            da_sua = True

    k4 = kb.get("khung4tang")
    if isinstance(k4, dict) and isinstance(k4.get("buoc"), list) and k4["buoc"]:
        so_canh_da = {int(c.get("so") or (i + 1)) for i, c in ds_da}
        b_chon = None
        for b in k4["buoc"]:
            if isinstance(b, dict) and b.get("canh") is not None:
                try:
                    if int(b["canh"]) in so_canh_da:
                        b_chon = b
                except (TypeError, ValueError):
                    pass
        if b_chon is None and isinstance(k4["buoc"][-1], dict):
            b_chon = k4["buoc"][-1]
        if isinstance(b_chon, dict):
            the = b_chon.get("the")
            if not isinstance(the, list):
                the = []
                b_chon["the"] = the
            co_the = any(
                isinstance(th, dict) and (
                    _chua_dap_so_chinh_xac(th.get("noi_dung"), num_val)
                    or any(_chua_dap_so_chinh_xac(d, num_val) for d in (th.get("dong") or []))
                )
                for th in the
            )
            if not co_the:
                the.append({"loai": "cong_thuc", "dong": [dong_bo_sung]})
                da_sua = True
    return da_sua


def tex_sang_chu(s):
    """Mã TeX -> chữ Unicode GIỮ NGHĨA (đồng bộ .gs <-> Python <-> TS):
    bóc \\text{}, {\\color{...}...}, \\textcolor{}{}, \\textbf{}; đổi S_0->S₀, u_1->u₁, x^2->x², \\sqrt{3}->√3, \\frac{1}{3}->1/3."""
    x = chuan_khong_chia_het(str(s or ""), "chu").replace("$", "")
    x = re.sub(r"\\\(|\\\)|\\\[|\\\]", " ", x)
    x = re.sub(r"\\\\(?=[A-Za-z])", r"\\", x)
    for _ in range(6):
        x0 = x
        x = re.sub(r"\\textcolor\s*\{[^{}]*\}\s*\{([^{}]*)\}", r"\1", x)
        x = re.sub(r"\{\s*\\color\s*\{[^{}]*\}\s*([^{}]*)\}", r"\1", x)
        x = re.sub(r"\\color\s*\{[^{}]*\}", "", x)
        x = re.sub(r"\\(?:overline|bar)\s*\{\s*([A-Za-z])\s*\}|\\bar\s+([A-Za-z])",
                   lambda m: MACRON.get(m.group(1) or m.group(2), (m.group(1) or m.group(2)) + "\u0304"), x)
        x = re.sub(r"\\(?:overline|bar)\s*\{([^{}]*)\}", lambda m: "".join(c + "\u0304" for c in m.group(1)), x)
        x = re.sub(r"\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}",
                   lambda m: "%s/%s" % (m.group(1) if re.fullmatch(r"[\w.,]+", m.group(1)) else "(%s)" % m.group(1),
                                        m.group(2) if re.fullmatch(r"[\w.,]+", m.group(2)) else "(%s)" % m.group(2)), x)
        x = re.sub(r"\\[dt]?binom\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"C(\1,\2)", x)
        x = re.sub(r"\\(?:text|textrm|mathrm|mathbf|textbf|textit|operatorname|mathit|boldsymbol|mbox|hl)\s*\{([^{}]*)\}", r"\1", x)
        x = re.sub(r"\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}",
                   lambda m: "%s√%s" % (m.group(1).translate(SO_TREN), m.group(2) if len(m.group(2)) <= 1 else "(%s)" % m.group(2)), x)
        x = re.sub(r"\\sqrt\s*\{([^{}]*)\}", lambda m: "√%s" % (m.group(1) if len(m.group(1)) <= 1 else "(%s)" % m.group(1)), x)
        if x == x0:
            break
    x = re.sub(r"_\{([0-9+\-=()aehijklmnoprstuvx]+)\}|_([0-9aehijklmnoprstuvx])(?![A-Za-z])",
               lambda m: (m.group(1) or m.group(2)).translate(SO_DUOI), x)
    x = re.sub(r"\^\{([0-9+\-=()nikx]+)\}|\^([0-9nikx])(?![A-Za-z])",
               lambda m: (m.group(1) or m.group(2)).translate(SO_TREN), x)
    x = re.sub(r"\\(?:left|right|displaystyle|limits)\b", "", x)
    x = re.sub(r"\\[,;:!> ]", " ", x).replace(r"\%", "%")
    x = re.sub(r"\\([A-Za-z]+)", lambda m: LENH_CHU.get(m.group(1), ""), x)
    x = re.sub(r"(?<![A-Za-z\\])Omega(?![A-Za-z])", "Ω", x)
    x = re.sub(r"\{,\}", ",", x)
    x = re.sub(r"[{}]", "", x).replace("\\", "")
    return re.sub(r"\s+", " ", x).strip()


def cat_bien_tu(s, toi_da=0):
    """Bóc sạch TeX -> Unicode rồi cắt gọn theo biên từ (cấm cắt ngang giữa lệnh \\ hoặc cặp ngoặc {...} / (...))."""
    x = tex_sang_chu(s)
    if not toi_da or len(x) <= toi_da:
        return x
    tu = x.split(" ")
    ra = ""
    for w in tu:
        thu = (ra + " " + w) if ra else w
        if len(thu) > toi_da:
            if not ra:
                ra = w
            break
        ra = thu
    ra = re.sub(r"\\[A-Za-z]*\s*$", "", ra).strip()
    while ra and (ra.count("(") > ra.count(")") or ra.count("{") > ra.count("}")):
        idx = max(
            ra.rfind("(") if ra.count("(") > ra.count(")") else -1,
            ra.rfind("{") if ra.count("{") > ra.count("}") else -1,
        )
        if idx <= 0:
            break
        ra = ra[:idx].strip()
    return ra.rstrip(" ,.;:·-") or tu[0]


RE_MA_THO = re.compile(r"\\[A-Za-z]+|\\\\|[_^]\{|(?<![A-Za-z])Omega(?![A-Za-z])|\bC_\d|(?<![A-Za-z])not\s*⋮")


def co_ma_tho(s):
    return bool(RE_MA_THO.search(str(s or "")))


def sua_ma_tho_props(k4):
    """Trường CHỮ THƯỜNG của props.khung4tang (Intro, Outro, CTA, nhãn 2D) -> Unicode giữ nghĩa; trường KaTeX/ChuTron -> chuẩn
    ký hiệu 'không chia hết' và kiểm cân bằng {} / cú pháp lệnh TeX. Trả danh sách chỗ đã sửa."""
    sua = []
    mc = k4.get("mocCau") or {}
    for k in ("nhan_thi", "tieu_de", "phu_de", "cau_hook", "cta"):
        if isinstance(mc.get(k), str) and (co_ma_tho(mc[k]) or RE_KHONG_CHIA_HET.search(mc[k]) or "{" in mc[k]):
            mc[k] = tex_sang_chu(mc[k])
            sua.append("mocCau." + k)
    if isinstance(k4.get("cta"), str) and (co_ma_tho(k4["cta"]) or "{" in k4["cta"]):
        k4["cta"] = tex_sang_chu(k4["cta"])
        sua.append("cta")
    for d in k4.get("tomTat") or []:
        if isinstance(d, dict):
            if RE_KHONG_CHIA_HET.search(str(d.get("chien_thuat") or "")):
                d["chien_thuat"] = chuan_khong_chia_het(d["chien_thuat"], "tron")
                sua.append("tomTat.chien_thuat")
            elif isinstance(d.get("chien_thuat"), str) and not kiem_tra_tex_hop_le(d["chien_thuat"]):
                d["chien_thuat"] = tex_sang_chu(d["chien_thuat"])
                sua.append("tomTat.chien_thuat")
            if RE_KHONG_CHIA_HET.search(str(d.get("cong_thuc") or "")):
                d["cong_thuc"] = chuan_khong_chia_het(d["cong_thuc"], "tex")
                sua.append("tomTat.cong_thuc")
            elif isinstance(d.get("cong_thuc"), str) and not kiem_tra_tex_hop_le(d["cong_thuc"]):
                d["cong_thuc"] = tex_sang_chu(d["cong_thuc"])
                sua.append("tomTat.cong_thuc")
    for b in k4.get("buoc") or []:
        for k in ("tieu_de", "nhan"):
            if RE_KHONG_CHIA_HET.search(str(b.get(k) or "")):
                b[k] = chuan_khong_chia_het(b[k], "tron")
                sua.append("buoc." + k)
            elif isinstance(b.get(k), str) and not kiem_tra_tex_hop_le(b[k]):
                b[k] = tex_sang_chu(b[k])
                sua.append("buoc." + k)
        for th in b.get("the") or []:
            if th.get("loai") == "cong_thuc":
                moi = [chuan_khong_chia_het(d, "tex") for d in th.get("dong") or []]
                moi = [d if kiem_tra_tex_hop_le(d) else tex_sang_chu(d) for d in moi]
                if moi != th.get("dong"):
                    th["dong"] = moi
                    sua.append("the.dong")
            for k in ("noi_dung", "nhan", "ket_qua"):
                if RE_KHONG_CHIA_HET.search(str(th.get(k) or "")):
                    th[k] = chuan_khong_chia_het(th[k], "tron")
                    sua.append("the." + k)
                elif isinstance(th.get(k), str) and not kiem_tra_tex_hop_le(th[k]):
                    th[k] = tex_sang_chu(th[k])
                    sua.append("the." + k)
    for d in k4.get("deGhim") or []:
        if RE_KHONG_CHIA_HET.search(str(d.get("nhan") or "")):
            d["nhan"] = chuan_khong_chia_het(d["nhan"], "tex")
            sua.append("deGhim")
        elif isinstance(d.get("nhan"), str) and not kiem_tra_tex_hop_le(d["nhan"]):
            d["nhan"] = tex_sang_chu(d["nhan"])
            sua.append("deGhim")
    sk = k4.get("sanKhau") or k4.get("san_khau")
    if isinstance(sk, dict):
        for k in ("nhan_bien", "nhan_ham", "don_vi"):
            if isinstance(sk.get(k), str) and (co_ma_tho(sk[k]) or "{" in sk[k]):
                sk[k] = tex_sang_chu(sk[k])
                sua.append("sanKhau." + k)
        if isinstance(sk.get("nhan"), dict):
            for nk, nv in list(sk["nhan"].items()):
                if isinstance(nv, str) and (co_ma_tho(nv) or "{" in nv):
                    sk["nhan"][nk] = tex_sang_chu(nv)
                    sua.append("sanKhau.nhan." + nk)
        for n in sk.get("nut") or []:
            if isinstance(n, dict):
                if isinstance(n.get("nhan"), str) and (co_ma_tho(n["nhan"]) or "{" in n["nhan"]):
                    n["nhan"] = tex_sang_chu(n["nhan"])
                    sua.append("sanKhau.nut.nhan")
                if isinstance(n.get("dong"), str) and not kiem_tra_tex_hop_le(n["dong"]):
                    n["dong"] = tex_sang_chu(n["dong"])
                    sua.append("sanKhau.nut.dong")
    return sua




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


def _la_ngan_k4_loc_som(kb):
    from .san_khau import thuc_te_ngan
    """Chỉ bật Cổng lọc sớm cho bài ngắn Khung4Tang (THUC_TE / XAC_SUAT); bỏ qua HINH_PHANG, HINH_KHONG_GIAN và -10P."""
    if not isinstance(kb, dict):
        return False
    id_ = str(kb.get("id") or "")
    if str(kb.get("kieu_video") or "") == "DAI_10_PHUT" or id_.upper().endswith("-10P"):
        return False
    mon = str(kb.get("mon") or "").upper()
    if str(kb.get("luong") or "") == "hinh_hoc_thuan" or mon.startswith("HINH_"):
        return False
    if kb.get("hinh_phang_chuan") or kb.get("hinh_khong_gian"):
        return False
    return thuc_te_ngan(kb) or mon == "XAC_SUAT" or isinstance(kb.get("khung4tang"), dict)


def _tap_so_dap_an(s):
    """Tập giá trị số/phân số đọc được trong chuỗi đáp án (phục vụ đối chiếu dap_an <-> dap_an_cuoi)."""
    t = str(s or "").replace("{,}", ",").replace(".000", "000")
    ra = []
    for a, b in re.findall(r"\\[dt]?frac\s*\{\s*(-?\d+)\s*\}\s*\{\s*(\d+)\s*\}", t):
        if int(b):
            ra.append(int(a) / int(b))
    for a, b in re.findall(r"(?<![\d.,])(-?\d+)\s*/\s*(\d+)(?![\d.,])", t):
        if int(b):
            ra.append(int(a) / int(b))
    for x in re.findall(r"-?\d+(?:[.,]\d+)?", t):
        try:
            ra.append(float(x.replace(",", ".")))
        except ValueError:
            pass
    return ra


def cong_loc_som(kb, khuon_suy=None):
    from .san_khau import thuc_te_ngan, chon_san_khau
    """Cổng lọc sớm (Pre-flight Gate) ngay đầu chuanbi.py (trước TTS / bundle / render) cho bài ngắn Khung4Tang:
    (1) cân bằng {} & cú pháp lệnh TeX, (2) không lộ mã TeX ở ô text thường, (3) không thiếu hình Tầng 2 (giữ Allowlist THUC_TE),
    (4) khớp đáp án. Trả chuỗi lỗi đầu tiên ('' nếu đạt)."""
    if not _la_ngan_k4_loc_som(kb):
        return ""
    # 0) Tiền xử lý thuần code TRƯỚC khi chấm lỗi: tự vá TEX_LENH_CUT / ngoặc hở và đồng bộ đáp số cảnh cuối dap_an
    va_cu_phap_tex_kb(kb)
    dong_bo_dap_so_canh_dap_an(kb)
    k4 = kb.get("khung4tang") if isinstance(kb.get("khung4tang"), dict) else {}
    # 1) Kiểm cân bằng {} & cú pháp lệnh TeX ở các ô KaTeX / ChuTron
    o_tex = []
    for i, c in enumerate(kb.get("canh") or []):
        if isinstance(c, dict):
            for d in c.get("noi_dung_man_hinh") or []:
                o_tex.append(("noi_dung_man_hinh cảnh %d" % (i + 1), d))
    for d in k4.get("de_ghim") or []:
        if isinstance(d, dict):
            o_tex.append(("de_ghim", d.get("nhan")))
    for i, b in enumerate(k4.get("buoc") or []):
        if isinstance(b, dict):
            o_tex.append(("buoc %d tieu_de" % (i + 1), b.get("tieu_de")))
            o_tex.append(("buoc %d nhan" % (i + 1), b.get("nhan")))
            for th in b.get("the") or []:
                if isinstance(th, dict):
                    for d in th.get("dong") or []:
                        o_tex.append(("buoc %d the.dong" % (i + 1), d))
                    o_tex.append(("buoc %d the.noi_dung" % (i + 1), th.get("noi_dung")))
    for d in kb.get("tom_tat_3_buoc") or []:
        if isinstance(d, dict):
            o_tex.append(("tom_tat.cong_thuc", d.get("cong_thuc")))
    for noi, val in o_tex:
        if isinstance(val, str) and re.search(r"[\\{}^_$]", val) and not kiem_tra_tex_hop_le(val):
            return "[PREFLIGHT/TEX_LOI] Lỗi cú pháp hoặc ngoặc LaTeX ở %s: %s" % (noi, val[:60])
    # 2) Không lộ mã TeX thô ở ô văn bản thường (không chạy KaTeX)
    re_tho_thuong = re.compile(r"\\[A-Za-z]+|\{[^{}]*\}|\\\\")
    for k in ("tieu_de_intro", "phu_de_intro", "cau_hook", "cta", "nhan_thi"):
        if isinstance(kb.get(k), str) and re_tho_thuong.search(kb[k]):
            return "[PREFLIGHT/MA_THO] Lộ mã TeX thô ở ô chữ thường %s: %s" % (k, kb[k][:60])
    for i, c in enumerate(kb.get("canh") or []):
        if isinstance(c, dict):
            if re.search(r"y_do|bay|loi_sai", str(c.get("loai") or ""), re.I) and isinstance(c.get("tieu_de_canh"), str) and re_tho_thuong.search(c["tieu_de_canh"]):
                return "[PREFLIGHT/MA_THO] Lộ mã TeX thô ở tiêu đề cảnh %d (%s): %s" % (i + 1, c.get("loai"), c["tieu_de_canh"][:60])
            for ct in (c.get("chu_thich") if isinstance(c.get("chu_thich"), list) else []):
                if isinstance(ct, str) and re_tho_thuong.search(ct):
                    return "[PREFLIGHT/MA_THO] Lộ mã TeX thô ở chu_thich cảnh %d: %s" % (i + 1, ct[:60])
    sk_ts = (k4.get("san_khau") or {}).get("tham_so") if isinstance(k4.get("san_khau"), dict) else None
    if isinstance(sk_ts, dict):
        for k in ("nhan_bien", "nhan_ham", "don_vi"):
            if isinstance(sk_ts.get(k), str) and re_tho_thuong.search(sk_ts[k]):
                return "[PREFLIGHT/MA_THO] Lộ mã TeX thô ở nhãn 2D %s: %s" % (k, sk_ts[k][:60])
        if isinstance(sk_ts.get("nhan"), dict):
            for nk, nv in sk_ts["nhan"].items():
                if isinstance(nv, str) and re_tho_thuong.search(nv):
                    return "[PREFLIGHT/MA_THO] Lộ mã TeX thô ở so_do_2d.nhan.%s: %s" % (nk, nv[:60])
    # 3) Không thiếu hình Tầng 2 (giữ nguyên Allowlist THUC_TE + sân khấu XAC_SUAT)
    if thuc_te_ngan(kb):
        loi_tt = loi_truoc_tts(kb, "" if khuon_suy is None else khuon_suy)
        if loi_tt:
            return loi_tt
    elif str(kb.get("mon") or "").upper() == "XAC_SUAT":
        if not k4 or not k4.get("buoc"):
            return "Thiếu khung4tang.buoc của bài XAC_SUAT."
        route_xs = chon_san_khau(kb, khuon_suy=khuon_suy)["loai"]
        if route_xs == "tu_sinh_svg":
            svg = k4.get("tu_sinh") or (k4.get("san_khau") if (k4.get("san_khau") or {}).get("loai") == "tu_sinh_svg" else {})
            if not (svg.get("ma") or (svg.get("tham_so") or {}).get("ma")):
                return "Thiếu mã tu_sinh_svg cho bài XAC_SUAT."
    # 4) Khớp đáp án (chặn ISO date, chặn lệch dap_an <-> dap_an_cuoi)
    da1, da2 = str(kb.get("dap_an") or "").strip(), str(kb.get("dap_an_cuoi") or "").strip()
    if re.search(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", da1) or re.search(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", da2):
        return "[PREFLIGHT/DAP_AN_NGAY] Đáp án bị chuyển thành ngày ISO, kiểm tra lại phân số gốc."
    if da1 and da2:
        s1, s2 = _tap_so_dap_an(da1), _tap_so_dap_an(da2)
        if s1 and s2 and not any(abs(a - b) <= max(0.02, 0.015 * max(abs(a), abs(b))) for a in s1 for b in s2):
            return "[PREFLIGHT/DAP_AN_LECH] dap_an ('%s') không khớp dap_an_cuoi ('%s')." % (da1[:40], da2[:40])
    return ""


def loi_truoc_tts(kb, khuon_suy=None):
    from .san_khau import chon_san_khau, bat_buoc_vat_the, doc_ti_le, MAU_SO_DO_2D, dung_san_khau
    k4 = kb.get("khung4tang") or {}
    route = chon_san_khau(kb, khuon_suy=khuon_suy)["loai"]
    sk = k4.get("san_khau") or {}
    if not k4 or not k4.get("buoc"):
        if route != "lego_3d":
            return "Thiếu khung và các bước minh họa của đề thực tế."
    if bat_buoc_vat_the(kb):
        from .moc_thoi_gian import kiem_doi_chieu
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
    from .san_khau import cac_dang_doc_so
    """Lời thoại đã đọc ra số `so` (chữ số hoặc dạng đọc tiếng Việt)?"""
    l = " " + re.sub(r"\s+", " ", str(loi or "").lower().replace("{,}", ",")) + " "
    for d in cac_dang_doc_so(so):
        d = d.lower()
        if re.search(r"(?<![\d.,/])" + re.escape(d) + r"(?![\d/]|[.,]\d)", l):
            return True
    return False


# --- Che đáp án ở ô ghim / sơ đồ tư duy (nguồn gốc v98) ---
RE_SO = re.compile(r"-?\d+(?:[.,]\d+)?")


def _so(s):
    try:
        return float(str(s).replace("{,}", ".").replace(",", "."))
    except ValueError:
        return None


def _le(s):
    m = re.search(r"[.,](\d+)", str(s).replace("{,}", ","))
    return len(m.group(1)) if m else 0


def so_bang(a, b):
    """'6,07' ~ '6,0711' (so tới số chữ số thập phân ngắn hơn); '6' ~ '6,0' ; '6' !~ '6,07'."""
    x, y = _so(a), _so(b)
    if x is None or y is None:
        return False
    d = min(_le(a), _le(b))
    return abs(x - y) <= 0.5 * 10 ** (-d) + 1e-9


def _ps(x):
    """v98.1: "9/11" -> "0.818182" để so số như mọi đáp án thập phân."""
    m = re.fullmatch(r"\s*(-?\d+)/(\d+)\s*", str(x))
    return ("%.6f" % (int(m.group(1)) / int(m.group(2)))) if m and int(m.group(2)) else x


def _so_dap(dap_an, gia_tri_theo_bien=None):
    """{đại lượng: [số...]} từ chuỗi đáp án + giá trị máy tính."""
    from .moc_thoi_gian import phan_dap_an
    ra = {}
    for k, (so, _dv) in phan_dap_an(dap_an).items():
        ra.setdefault(k, []).extend(_ps(x) for x in re.split(r";\\?\s*", str(so)) if x.strip())
    for k, v in (gia_tri_theo_bien or {}).items():
        so = v[0] if isinstance(v, (list, tuple)) else v
        ra.setdefault(str(k)[:1], []).append(str(so))
    return ra


RE_O = re.compile(r"^\s*(\\?[A-Za-z][A-Za-z_{}\\^]*(?:\([^)]*\))?)\s*(=|\\approx|≈)\s*(.+?)\s*$")


def che_mot(nhan, so_dap):
    """'x = 6,07' -> 'x = ?' khi x là đại lượng đáp án và 6,07 là số đáp án; còn lại giữ nguyên. Trả (nhãn mới, đã che?)."""
    s = str(nhan or "")
    if "?" in s:
        return s, False
    m = RE_O.match(s)
    if not m:
        return s, False
    ve_trai, ve_phai = m.group(1), m.group(3)
    chu = re.sub(r"^\\", "", ve_trai)[:1]
    if chu not in so_dap:
        return s, False
    so_phai = RE_SO.findall(ve_phai.replace("{,}", ","))
    if not so_phai or not any(so_bang(a, b) for a in so_phai for b in so_dap[chu]):
        return s, False
    return "%s = ?" % ve_trai, True


def che_dap_an_ghim(de_ghim, dap_an, gia_tri_theo_bien=None):
    """Danh sách ô ghim -> (danh sách đã che, số ô đã che). Ô đã có `doi` giữ nguyên."""
    so_dap = _so_dap(dap_an, gia_tri_theo_bien)
    if not so_dap:
        return list(de_ghim or []), 0
    ra, n = [], 0
    for d in de_ghim or []:
        if not isinstance(d, dict) or d.get("doi"):
            ra.append(d)
            continue
        moi, che = che_mot(d.get("nhan"), so_dap)
        if che:
            d = dict(d, nhan=moi)
            n += 1
        ra.append(d)
    return ra, n


def che_dap_an_chuoi(ds, dap_an):
    """Danh sách chuỗi TeX (dữ kiện sơ đồ tư duy) -> bản đã che."""
    so_dap = _so_dap(dap_an)
    return [che_mot(x, so_dap)[0] if so_dap else x for x in ds or []]
