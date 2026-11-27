#!/usr/bin/env python3
"""Gói khung4tang.moc_thoi_gian — Nguồn chính duy nhất cho Intro/Outro, thẻ bước, đối chiếu tối ưu, khóa mốc đáp án & theme."""
import hashlib
import json
import math
import re

# ==================== PHẦN 1: Intro móc câu, Outro tóm tắt, Đối chiếu tối ưu (v93) ====================
DAI_TIEU_DE = 44      # tối đa 2 dòng × ~22 ký tự ở cỡ chữ nhỏ nhất (56 px) trong 952 px
DAI_TU = 22           # một từ dài hơn sẽ không vừa nửa dòng
DAI_PHU_DE = 36
DAI_HOOK = 40
DAI_CTA = 18
DAI_CHIEN_THUAT = 18
DAI_CONG_THUC = 56

CTA_MD = "LƯU NGAY VIDEO!"
HOOK_THEO_LOP = {
    "12": ["MUỐN 9+ THI THPT KHÔNG THỂ BỎ QUA!", "SAI 1 BƯỚC LÀ MẤT ĐIỂM!", "DẠNG HAY GẶP TRONG ĐỀ THI!"],
    "9": ["MUỐN ĐỖ VÀO 10 PHẢI NẮM DẠNG NÀY!", "SAI 1 BƯỚC LÀ MẤT ĐIỂM!", "3 BƯỚC LÀ RA ĐÁP ÁN!"],
    "": ["MUỐN 9+ THI HỌC KÌ KHÔNG THỂ BỎ QUA!", "SAI 1 BƯỚC LÀ MẤT ĐIỂM!", "3 BƯỚC LÀ RA ĐÁP ÁN!"],
}
NHAN_CHUNG = re.compile(r"^(đề bài|đề|bước\s*\d+|kết luận|dựng hình|đáp số|đáp án|tóm tắt)$", re.I)
TOI_UU = re.compile(r"lớn nhất|nhỏ nhất|tối đa|tối thiểu|ít nhất|nhiều nhất|cao nhất|thấp nhất|gtln|gtnn|tiết kiệm", re.I)
NHO = re.compile(r"nhỏ nhất|tối thiểu|ít nhất|thấp nhất|gtnn|tiết kiệm", re.I)
BUOC_KHAO_SAT = re.compile(r"tối ưu|lớn nhất|nhỏ nhất|gtln|gtnn|cực trị|cực đại|cực tiểu|xét dấu|biến thiên|khảo sát|so sánh|đánh giá|\bmax\b|\bmin\b", re.I)


def chu_sach(s, toi_da=0, hoa=True):
    """Bỏ mã TeX ($, \\lệnh, {}, ^, _) -> chữ thường Unicode, gọn khoảng trắng; cắt ở ranh giới từ nếu quá dài."""
    x = str(s or "")
    # v96: đổi TeX -> Unicode GIỮ NGHĨA trước khi lọc (trước đây "\overline{A}: tích \not\vdots 4" thành "A: tích 4" ngược nghĩa,
    # "n(\Omega)" thành "n( )")
    try:
        from . import kiem_tra as _v96
        x = _v96.tex_sang_chu(x)
    except Exception:   # noqa: BLE001
        x = re.sub(r"\\textcolor\s*\{[^{}]*\}\s*\{([^{}]*)\}", r"\1", x)
        x = re.sub(r"\{\s*\\color\s*\{[^{}]*\}\s*([^{}]*)\}", r"\1", x)
        x = re.sub(r"\\(?:text|textrm|mathrm|mathbf|textbf|textit)\s*\{([^{}]*)\}", r"\1", x)
        x = re.sub(r"\\(times|cdot)", "×", x)
        x = re.sub(r"\\[a-zA-Z]+", " ", x)
        x = re.sub(r"[${}^_\\]", "", x)
    x = re.sub(r"\s+", " ", x).strip()
    if hoa:
        x = x.upper()
    return cat_tu(x, toi_da) if toi_da else x


def cat_nhan(x, toi_da, giu_tex=True):
    """Giữ trọn công thức KaTeX hợp lệ; tự vá lệnh TeX cụt trước khi kiểm; vẫn lỗi thì bóc TeX -> Unicode rồi cắt theo biên từ."""
    s = re.sub(r"\s+", " ", str(x or "")).strip()
    if not s:
        return ""
    if re.search(r"[\\{}^_$]", s):
        if giu_tex:
            try:
                from . import kiem_tra as _v96
                s = _v96.va_cu_phap_tex(s)
                if not re.search(r"[\\{}^_$]", s):
                    return cat_tu(s, toi_da)
                if _v96.kiem_tra_tex_hop_le(s):
                    return s
            except Exception:   # noqa: BLE001
                return s
        return chu_sach(s, toi_da, hoa=False)
    return cat_tu(s, toi_da)


def cat_tu(x, toi_da):
    x = re.sub(r"\s+", " ", str(x or "")).strip()
    if not toi_da or len(x) <= toi_da:
        return x
    if re.search(r"[\\{}^_$]", x):
        return chu_sach(x, toi_da, hoa=False)
    # v96: cụm "không ⋮ 4" là MỘT ý — không bao giờ cắt còn "tích không" (mất nghĩa) hay "tích ⋮ 4" (ngược nghĩa):
    # bỏ bớt từ thường đứng trước cụm cho tới khi vừa
    m = re.search(r"(?i)không\s*⋮\s*\d+", x)
    if m:
        dau, cum, sau = x[:m.start()].split(), m.group(0), x[m.end():]
        while dau and len(" ".join(dau + [cum]) + sau) > toi_da and not dau[-1].endswith(":"):
            dau.pop()
        y = (" ".join(dau + [cum]) + sau).strip()
        if len(y) <= toi_da:
            return y
    tu = x.split(" ")
    ra = ""
    for w in tu:
        thu = (ra + " " + w) if ra else w
        if len(thu) > toi_da:
            if not ra:
                ra = w
            break
        ra = thu
    # Cấm cắt hở ngoặc đơn/nhọn hoặc lệnh \ ở cuối
    ra = re.sub(r"\\[A-Za-z]*\s*$", "", ra).strip()
    while ra and (ra.count("(") > ra.count(")") or ra.count("{") > ra.count("}")):
        idx = max(
            ra.rfind("(") if ra.count("(") > ra.count(")") else -1,
            ra.rfind("{") if ra.count("{") > ra.count("}") else -1,
        )
        if idx <= 0:
            break
        ra = ra[:idx].strip()
    cat = ra.rstrip(" ,.;:·-")
    cat = re.sub(r"(?i)\s+không$", "", cat)   # không để "không" treo cuối (mất vế chia hết)
    return cat or tu[0]


def che_so(s, so_lo):
    for x in so_lo or []:
        s = re.sub(r"(?<![\d.,])" + re.escape(x) + r"(?![\d.,])", "?", s)
    return re.sub(r"\?(?:\s*[/:,.]\s*\?)+", "?", s)


def tieu_de_vua(s):
    return chu_sach(s)


def _nhan_thi(kb):
    lop = str(kb.get("lop") or "").strip()
    if lop == "9":
        return "ÔN THI VÀO 10"
    if lop == "12":
        return "ÔN THI THPT · LỚP 12"
    return "LUYỆN THI · LỚP %s" % lop if lop else "LUYỆN THI"


def _khu_trung_tag(phan):
    """Khử trùng lặp tag trên phụ đề Intro (VD 'QUAN HỆ VUÔNG GÓC · VUÔNG GÓC · GÓC' -> 'QUAN HỆ VUÔNG GÓC')."""
    def _chuan(s):
        return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", str(s or "").casefold())).strip()
    giu = []
    for tag in phan:
        t = str(tag or "").strip()
        nt = _chuan(t)
        if not nt:
            continue
        if any(ng == nt or (" " + nt + " ") in (" " + ng + " ") for ng in (_chuan(g) for g in giu)):
            continue
        thay = next((idx for idx, g in enumerate(giu) if (" " + _chuan(g) + " ") in (" " + nt + " ")), -1)
        if thay >= 0:
            giu[thay] = t
        else:
            giu.append(t)
    return giu


def moc_cau(kb, buoc, so_lo):
    """props.khung4tang.mocCau (luôn đủ 5 trường, đã cắt vừa bố cục, không lộ số đáp án)."""
    lop = str(kb.get("lop") or "").strip()
    nhan_thi = chu_sach(kb.get("nhan_thi"), 28) or _nhan_thi(kb)
    tieu_de = ""
    for nguon in (kb.get("tieu_de_intro"), kb.get("hook_chu"), kb.get("tieu_de_bia"), kb.get("tieu_de"), kb.get("chu_de")):
        tieu_de = tieu_de_vua(che_so(str(nguon or ""), so_lo))
        if len(tieu_de) >= 6:
            break
    phu = chu_sach(che_so(str(kb.get("phu_de_intro") or ""), so_lo))
    if "phu_de_intro" not in kb:
        phan = []
        cd = chu_sach(kb.get("chu_de_ngan") or kb.get("chu_de") or "", 22)
        if cd:
            phan.append(cd)
        for b in buoc:
            n = chu_sach(b.get("nhan"), 14)
            if n and not NHAN_CHUNG.match(n.lower()) and not re.search(r"\?", n):
                phan.append(n)
        phan = _khu_trung_tag(phan)
        while len(phan) > 1 and len(" · ".join(phan)) > DAI_PHU_DE:
            phan.pop()
        phu = " · ".join(phan[:3])
    elif phu:
        phu = " · ".join(_khu_trung_tag(re.split(r"\s*[·•|]\s*", phu)))
    hook = chu_sach(che_so(str(kb.get("cau_hook") or ""), so_lo), DAI_HOOK)
    if len(hook) < 6:
        ds = HOOK_THEO_LOP.get(lop) or HOOK_THEO_LOP[""]
        hook = ds[int(hashlib.md5(str(kb.get("id") or kb.get("de_bai") or "").encode("utf8")).hexdigest(), 16) % len(ds)]
    cta = chu_sach(kb.get("cta"), DAI_CTA) or CTA_MD
    return {"nhan_thi": nhan_thi, "tieu_de": tieu_de or "GIẢI NHANH BÀI TOÁN", "phu_de": phu, "cau_hook": hook, "cta": cta}


def cong_thuc_gon(tex):
    """Công thức cốt lõi một dòng: dài quá thì giữ 2 vế cuối (vế = phần giữa các dấu '='); không cắt giữa lệnh \\ hay ngoặc."""
    s = re.sub(r"\s+", " ", str(tex or "")).strip().strip("$")
    if len(s) <= DAI_CONG_THUC or re.search(r"[\\{}^_]", s):
        return s
    ve = [v.strip() for v in s.split("=") if v.strip()]
    while len(ve) > 2:
        ve.pop(0)
    s = " = ".join(ve)
    return s if len(s) <= DAI_CONG_THUC else cat_tu(ve[-1], DAI_CONG_THUC)


def _cong_thuc_buoc(b):
    for th in reversed(b.get("the") or []):
        if th.get("loai") == "cong_thuc" and th.get("dong"):
            return str(th["dong"][-1])
        if th.get("loai") == "casio" and th.get("ket_qua"):
            return str(th["ket_qua"])
    return ""


def tom_tat(kb, buoc):
    """props.khung4tang.tomTat: 3 dòng {chien_thuat, cong_thuc, mau}; < 2 dòng dùng được -> None (màn kết v92)."""
    ra = []
    for d in kb.get("tom_tat_3_buoc") or []:
        if isinstance(d, dict):
            ct = chu_sach(d.get("chien_thuat"), DAI_CHIEN_THUAT, hoa=False)
            if ct:
                ra.append({"chien_thuat": ct, "cong_thuc": cong_thuc_gon(d.get("cong_thuc"))})
        elif isinstance(d, str) and d.strip():
            ra.append({"chien_thuat": chu_sach(d, DAI_CHIEN_THUAT, hoa=False), "cong_thuc": ""})
    if not ra:   # v95: có >= 1 dòng AI viết thì GIỮ, chỉ bù thêm (bu_tom_tat)
        ung = buoc[1:] if len(buoc) >= 4 else list(buoc)
        co = [b for b in ung if _cong_thuc_buoc(b)]
        # ưu tiên bước có công thức; bước kết luận (đáp số) để cuối vì đáp án đã ở trên cùng outro
        if len(co) > 3 and re.search(r"kết luận|đáp", str(co[-1].get("nhan") or ""), re.I):
            co = co[:-1]
        if len(co) > 3:
            co = [co[0], co[len(co) // 2], co[-1]]
        chon = co + [b for b in ung if b not in co]
        chon = sorted(chon[:3], key=lambda b: b.get("t", 0))
        ra = [{"chien_thuat": chu_sach(b.get("nhan") or b.get("tieu_de"), DAI_CHIEN_THUAT, hoa=False),
               "cong_thuc": cong_thuc_gon(_cong_thuc_buoc(b)), "mau": b.get("mau")} for b in chon]
        ra = [d for d in ra if d["chien_thuat"]]
    # v95: LUÔN đủ 3 dòng cân đối (Outro không bao giờ hổng một khoảng trống lớn)
    ra = bu_tom_tat(ra, buoc, kb, chu_sach, cong_thuc_gon, _cong_thuc_buoc, DAI_CHIEN_THUAT)
    for d in ra:
        if not d.get("mau"):
            d.pop("mau", None)
    return ra[:3]


# ---------------- đối chiếu Hình động ↔ Đồ thị ----------------
def ham_an_toan(bt, bien="x"):
    """Biểu thức một biến -> hàm Python (lọc ký tự trước khi eval; sai -> None)."""
    s = str(bt or "").replace(" ", "").replace(",", ".").replace("π", "pi").replace("^", "**").replace("×", "*").replace("·", "*")
    if bien != "x":
        s = re.sub(r"(?<![a-z])" + re.escape(bien) + r"(?![a-z])", "x", s)
    s = re.sub(r"(\d)(x|pi|\()", r"\1*\2", s)
    s = re.sub(r"(x|\))(\(|x|\d|pi)", r"\1*\2", s)
    s = s.replace("pi", "P")
    if not s or not re.fullmatch(r"[-+*/().0-9xP]+", s) or len(s) > 120:
        return None
    try:
        f = eval("lambda x: " + s, {"__builtins__": {}, "P": math.pi})   # noqa: S307 - đã lọc ký tự
        f(1.234)
        return f
    except Exception:   # noqa: BLE001
        return None


def toi_uu_so(f, a, b, kieu):
    """Điểm tối ưu trên (a, b) bằng lấy mẫu + tam phân. None nếu hàm không xác định trên phần lớn miền."""
    ep = (b - a) * 1e-4
    mau = []
    for i in range(161):
        x = min(b - ep, max(a + ep, a + (b - a) * i / 160))
        try:
            y = f(x)
        except Exception:   # noqa: BLE001
            continue
        if isinstance(y, (int, float)) and math.isfinite(y):
            mau.append((x, y))
    if len(mau) < 145:
        return None
    k = max(range(len(mau)), key=lambda i: mau[i][1] if kieu == "max" else -mau[i][1])
    lo, hi = mau[max(0, k - 1)][0], mau[min(len(mau) - 1, k + 1)][0]
    for _ in range(60):
        m1, m2 = lo + (hi - lo) / 3, hi - (hi - lo) / 3
        if (f(m1) > f(m2)) == (kieu == "max"):
            hi = m2
        else:
            lo = m1
    x = (lo + hi) / 2
    return x, f(x)


def _khop_dap_an(x, y, dap_an):
    so = [float(s.replace(",", ".")) for s in re.findall(r"\d+(?:[.,]\d+)?", str(dap_an or ""))]
    gan = lambda u, v: abs(u - v) <= max(0.05, 0.02 * abs(v))   # noqa: E731
    return any(gan(x, s) or gan(y, s) for s in so)


def suy_doi_chieu(kb, c3):
    """Bài tối ưu + khuôn có công thức chuẩn -> {ham, bien, ten_ham, mien, kieu, hinh, tham_so}; None nếu không chắc."""
    de = " ".join(str(kb.get(k) or "") for k in ("de_bai", "can_tim"))
    if not TOI_UU.search(de) or not isinstance(c3, dict):
        return None
    k = c3 if c3.get("khuon") else (c3.get("khuon_du_phong") or {})
    khuon, ts = str(k.get("khuon") or ""), (k.get("tham_so") or {})
    kieu = "min" if NHO.search(de) else "max"
    so = lambda v: float(str(v).replace(",", ".")) if re.fullmatch(r"-?\d+(?:[.,]\d+)?", str(v).strip()) else None   # noqa: E731
    dc = None
    if khuon == "tam_bia_gap_hop" and kieu == "max":
        a = so(ts.get("a", ""))
        b = so(ts.get("b", ts.get("a", "")))
        if a and b and a > 0 and b > 0:
            g = lambda v: ("%g" % v)   # noqa: E731
            dc = {"ham": "x*(%s-2*x)*(%s-2*x)" % (g(a), g(b)), "bien": str(ts.get("ten_x") or "x")[:1], "ten_ham": "V",
                  "mien": [0, min(a, b) / 2], "kieu": "max", "hinh": "tam_bia", "tham_so": {"a": a, "b": b}}
    elif khuon == "tru_non_toi_uu" and kieu == "min" and str(ts.get("loai") or "tru") == "tru":
        V = so(ts.get("V", ts.get("the_tich", "")))
        if V and V > 0:
            ho = re.search(r"không nắp|không có nắp|hở|không nắp", de, re.I)
            r0 = (V / math.pi) ** (1 / 3) if ho else (V / (2 * math.pi)) ** (1 / 3)
            dc = {"ham": ("pi*x^2+2*%g/x" if ho else "2*pi*x^2+2*%g/x") % V, "bien": "r", "ten_ham": "S",
                  "mien": [round(0.3 * r0, 4), round(2.2 * r0, 4)], "kieu": "min", "hinh": "mat_cat_tru", "tham_so": {"V": V}}
    elif khuon == "parabol_quy_dao" and ts.get("ham") and isinstance(ts.get("t"), list) and len(ts["t"]) == 2:
        a, b = so(ts["t"][0]), so(ts["t"][1])
        if a is not None and b is not None and b > a:
            dc = {"ham": str(ts["ham"]), "bien": "t", "ten_ham": cat_nhan(str(ts.get("ten_ham") or "h"), 2), "mien": [a, b], "kieu": kieu, "hinh": "thanh"}
    return dc


def kiem_doi_chieu(dc, dap_an=None):
    """Kiểm hợp lệ (giống doi_chieu.ts): hàm, miền, ngưỡng, điểm tối ưu; dap_an != None -> tối ưu phải khớp số đáp án."""
    if not isinstance(dc, dict):
        return None
    bien = str(dc.get("bien") or "x")
    f = ham_an_toan(dc.get("ham"), bien)
    m = dc.get("mien")
    if not f or not isinstance(m, list) or len(m) != 2:
        return None
    try:
        a, b = float(m[0]), float(m[1])
    except (TypeError, ValueError):
        return None
    if not (math.isfinite(a) and math.isfinite(b) and b - a > 1e-6):
        return None
    kieu = "min" if dc.get("kieu") == "min" else "max"
    tot = toi_uu_so(f, a, b, kieu)
    if not tot or not all(math.isfinite(v) for v in tot):
        return None
    if dc.get("toi_uu") is not None:
        try:
            if abs(float(dc["toi_uu"]) - tot[0]) > 0.02 * (b - a):
                return None
        except (TypeError, ValueError):
            return None
    ng = dc.get("nguong")
    if ng is not None:
        try:
            gv = float(ng.get("gia_tri"))
        except (TypeError, ValueError, AttributeError):
            return None
        if ng.get("kieu") not in ("<=", ">=") or not math.isfinite(gv):
            return None
        dat = (lambda y: y <= gv + 1e-9) if ng["kieu"] == "<=" else (lambda y: y >= gv - 1e-9)
        if not dat(tot[1]) or all(dat(f(a + (b - a) * i / 40)) for i in range(1, 40)):
            return None
    if dap_an is not None and not _khop_dap_an(tot[0], tot[1], dap_an):
        return None
    out = dict(dc, bien=bien, kieu=kieu, mien=[a, b])
    out.pop("khi_noi", None)
    return out


def gan_doi_chieu(kb, buoc_vao, buoc, c3, t_dap):
    """Gắn buoc[j]['doi_chieu'] (tối đa 1 bước). Ưu tiên AI ghi ở bước; không có thì suy từ khuôn + đề tối ưu."""
    dap_an = str(kb.get("dap_an_cuoi") or kb.get("dap_an") or "")
    j_chon, dc = None, None
    for j, b in enumerate(buoc_vao):
        if j < len(buoc) and isinstance(b.get("doi_chieu"), dict):
            dc = kiem_doi_chieu(b["doi_chieu"])
            if dc:
                j_chon = j
                break
            print("Đối chiếu bước %d không hợp lệ -> giữ sân khấu 3D" % (j + 1))
    if j_chon is None:
        dc = kiem_doi_chieu(suy_doi_chieu(kb, c3), dap_an)
        if dc:
            for j, b in enumerate(buoc[1:], 1):
                if BUOC_KHAO_SAT.search(" ".join(str(b.get(k) or "") for k in ("nhan", "tieu_de"))):
                    j_chon = j
                    break
            if j_chon is None:
                ung = [j for j, b in enumerate(buoc) if j > 0 and j < len(buoc) - 1 and any(th.get("loai") in ("bang_bien_thien", "casio") for th in b.get("the") or [])]
                j_chon = ung[0] if ung else None
    if j_chon is None or not dc:
        return None
    dc["hien_so"] = bool(t_dap is not None and buoc[j_chon]["t"] >= t_dap - 0.05)
    buoc[j_chon]["doi_chieu"] = dc
    return j_chon


# ==================== PHẦN 2: Sắp thẻ logic, CTA theo lời, Ô ghim đổi đáp án (v95) ====================
GOI_Y_PHA = {
    "tam_bia_gap_hop": {
        "to_goc": ["cắt bốn góc", "cắt góc", "cắt đi", "cắt"],
        "an_goc": ["bỏ bốn góc", "bỏ đi"],
        "gap": ["gập", "gấp"],
        "nhan_canh": ["trừ ích", "chiều dài đáy", "cạnh đáy", "chiều dài", "chiều rộng"],
        "the_tich": ["thể tích hộp", "thể tích bằng", "vê ích bằng"],
    },
    "tru_non_toi_uu": {"mat_cat": ["diện tích đáy", "mặt đáy"], "phoi": ["trải", "diện tích toàn phần"]},
    "chop_lang_tru": {"chieu_cao": ["chiều cao"], "day": ["diện tích đáy"]},
}

# hạng logic của thẻ (nhỏ -> trước). None = không phân loại (giữ chỗ cũ)
HANG_THE = [
    (0, re.compile(r"đặt\s*ẩn|gọi\s+[a-z]\b|điều\s*kiện|đk\b|miền\s*xác\s*định|tập\s*xác\s*định", re.I)),
    (1, re.compile(r"kích\s*thước|các\s*cạnh|cạnh\s*đáy|chiều\s*(dài|rộng|cao)", re.I)),
    (2, re.compile(r"^(?!.*đạo).*(hàm|thể\s*tích|diện\s*tích|biểu\s*thức|lập\s*hàm)", re.I)),
    (3, re.compile(r"đạo\s*hàm|[A-Za-z]'\s*\(", re.I)),
    (4, re.compile(r"giải|nghiệm|=\s*0\b|cho\s+[A-Za-z]'", re.I)),
    (5, re.compile(r"bảng\s*biến\s*thiên|xét\s*dấu|đổi\s*dấu|so\s*sánh", re.I)),
    (6, re.compile(r"kết\s*luận|đáp\s*số|đáp\s*án|lớn\s*nhất|nhỏ\s*nhất|max|min", re.I)),
]


def hang_the(th):
    nhan = str(th.get("nhan") or "")
    if th.get("loai") == "bang_bien_thien":
        return 5
    for h, re_ in sorted(HANG_THE, key=lambda x: UU_TIEN.index(x[0])):
        if nhan and re_.search(nhan):
            return h
    return None


UU_TIEN = [6, 5, 4, 3, 0, 1, 2]   # 'Kết luận thể tích max' là kết luận (6) chứ không phải lập hàm (2)


def sap_the_logic(ds):
    """Sắp ổn định các thẻ CÓ hạng vào đúng các vị trí của chúng; thẻ không hạng giữ nguyên chỗ."""
    ds = list(ds)
    vi_tri = [i for i, th in enumerate(ds) if hang_the(th) is not None]
    co_hang = sorted((ds[i] for i in vi_tri), key=hang_the)   # sorted ổn định
    for i, th in zip(vi_tri, co_hang):
        ds[i] = th
    return ds


def chuan_dong(x):
    x = re.sub(r"([_^])\{(\w)\}", r"\1\2", str(x))
    x = re.sub(r"_(\d)", lambda m: "₀₁₂₃₄₅₆₇₈₉"[int(m[1])], x)
    x = re.sub(r"\\sqrt\{(\d)\}", r"√\1", x)
    return re.sub(r"\\[,;:! ]|\\left|\\right|\s+", "", str(x).replace("{,}", ",")).replace("\\dfrac", "\\frac")


def khu_trung_ranh_gioi(the_truoc, the_nay):
    """Thẻ đầu bước này lặp y hệt dòng của THẺ CUỐI bước trước -> bỏ dòng trùng (bỏ cả thẻ nếu không còn dòng)."""
    if not the_truoc or not the_nay:
        return the_nay
    cuoi = the_truoc[-1]
    da = {chuan_dong(d) for d in (cuoi.get("dong") or [])} | ({chuan_dong(cuoi.get("noi_dung"))} if cuoi.get("noi_dung") else set())
    da.discard("")
    ra = []
    for k, th in enumerate(the_nay):
        if k == 0 and th.get("loai") == "cong_thuc" and da:
            con = [d for d in th.get("dong") or [] if chuan_dong(d) not in da]
            if not con:
                continue
            if len(con) != len(th["dong"]):
                th = dict(th, dong=con)
                th.pop("khi_noi_dong", None)
        ra.append(th)
    return ra or the_nay


def _dong_the(th):
    return [chuan_dong(d) for d in (th.get("dong") or ([th.get("noi_dung")] if th.get("noi_dung") else [])) if chuan_dong(d)]


def chuan_the_cac_buoc(ds_the):
    """Chuẩn hóa thẻ của MỌI bước trước khi gán mốc:
    (1) thẻ cuối bước trước trùng y hệt thẻ đầu bước sau -> GIỮ ở bước sau (bước có tiêu đề nói về nó, vd 'Đạo hàm'),
        bỏ ở bước trước (trước đây thẻ hiện chưa tới 1 s rồi biến mất khi đổi bước); bước trước chỉ còn thẻ đó thì bỏ ở bước sau;
    (2) bước không thẻ nào có khi_noi -> sắp theo trình tự toán học (sap_the_logic)."""
    ra = [[dict(x) for x in (ds or []) if isinstance(x, dict)] for ds in ds_the]
    for j in range(1, len(ra)):
        truoc, nay = ra[j - 1], ra[j]
        if not truoc or not nay:
            continue
        a, b = _dong_the(truoc[-1]), _dong_the(nay[0])
        if a and a == b:
            if len(truoc) > 1:
                truoc.pop()
            elif len(nay) > 1:
                nay.pop(0)
    for j, ds in enumerate(ra):
        if not any(x.get("khi_noi") for x in ds):
            ra[j] = sap_the_logic(ds)
    for j, ds in enumerate(ra):
        kept = []
        for card in ds:
            if kept and card.get("loai") in ("cong_thuc", "chu") and _dong_the(card) and _dong_the(card) == _dong_the(kept[-1]):
                if card.get("chot"):
                    kept[-1] = card
                continue
            kept.append(card)
        ra[j] = kept
    return ra


def dong_khai_bao(ds_the):
    """Tập dòng công thức AI đã khai báo cho từng bước (để thẻ lấp chỗ của bước này không 'mượn' thẻ của bước khác)."""
    return [{d for th in ds for d in _dong_the(th)} for ds in ds_the]


def phan_dap_an(dap_an):
    """'x = 2 cm, V lớn nhất = 144 cm³' -> {'x': ('2', 'cm'), 'V': ('144', 'cm³')} (chữ cái đầu của vế trái)."""
    ra = {}
    for phan in re.split(r",(?!\d)|;|\bvà\b|\bhoặc\b", str(dap_an or "")):   # v96: "≈ 0,1667" không bị chẻ ở dấu phẩy thập phân
        m = re.search(r"([A-Za-z])[^=≈]*[=≈]\s*(-?\d+(?:[.,]\d+)?(?:/\d+)?)\s*([a-zA-Zµ]*[²³]?(?:\^\{?[23]\}?)?)", phan)
        if m and m.group(1) not in ra:
            ra[m.group(1)] = (m.group(2), m.group(3))
        elif m and m.group(2) not in ra[m.group(1)][0].split(";\\ "):
            # v96: nhiều nghiệm của CÙNG ẩn ("x = 0 hoặc x = 1") -> giữ đủ "0; 1" (trước đây chỉ còn nghiệm đầu)
            ra[m.group(1)] = (ra[m.group(1)][0] + ";\\ " + m.group(2), ra[m.group(1)][1] or m.group(3))
    return ra


CTA_NGHIA = [
    (re.compile(r"đăng\s*ký|subscribe", re.I), "ĐĂNG KÝ KÊNH!"),
    (re.compile(r"lưu(?!\s*ý)\s*(lại|video|ngay|bí\s*quyết|mẹo)?|bấm\s*lưu|save", re.I), "LƯU LẠI NGAY!"),
    (re.compile(r"bình\s*luận|comment|để\s*lại\s*(đáp|câu|ý)|viết\s*đáp\s*án", re.I), "BÌNH LUẬN NGAY!"),
    (re.compile(r"chia\s*sẻ|gửi\s*cho\s*bạn|share", re.I), "CHIA SẺ NGAY!"),
    (re.compile(r"theo\s*dõi|follow", re.I), "THEO DÕI KÊNH!"),
    (re.compile(r"thả\s*tim|(?:bấm|nhấn)\s*thích|\blike\b", re.I), "THẢ TIM NHÉ!"),
]


def cta_tu_loi(loi, md=None):
    """Nhãn nút CTA: lấy LỜI ĐỌC làm chuẩn -> ánh xạ ngữ nghĩa sang nhãn 2-4 từ (không cắt thô câu nói).
    Nhiều lời kêu gọi -> lấy lời XUẤT HIỆN CUỐI (câu giọng đọc dứt điểm). Không có -> md (nếu ngắn) hoặc 'LƯU LẠI NGAY!'."""
    loi = str(loi or "")
    tot, vi = None, -1
    for re_, nhan in CTA_NGHIA:
        for m in re_.finditer(loi):
            if m.start() > vi:
                tot, vi = nhan, m.start()
    if tot:
        return tot
    md = str(md or "").strip()
    if md and len(md.split()) <= 4 and len(md) <= 22:
        return md.upper()
    return "LƯU LẠI NGAY!"


def _so_trong(x):
    return [float(s.replace(",", ".")) for s in re.findall(r"(?<![\w^])\d+(?:[.,]\d+)?", str(x or ""))]


def _gan(a, b):
    return abs(a - b) <= max(0.02, 0.01 * abs(b))


def moc_giai_doi_chieu(buoc_j, x_tot, y_tot, bien="x", t_dap=None):
    """(t_giai, t_chot): mốc dòng công thức đầu tiên trong bước có `bien = x*` (nghiệm) / có y* (giá trị tối ưu).
    Không tìm thấy -> t_giai = mốc thẻ cuối của bước (hoặc t_dap), t_chot = t_giai + 0,8."""
    t_giai = t_chot = None
    re_bien = re.compile(r"(?<![A-Za-z])" + re.escape(bien) + r"\s*(?:=|_0\s*=|\^\{?\*\}?\s*=)\s*([\d.,]+)")
    for th in buoc_j.get("the") or []:
        dong = th.get("dong") or ([th.get("noi_dung")] if th.get("noi_dung") else []) or ([th.get("ket_qua")] if th.get("ket_qua") else [])
        moc = th.get("moc") or [th.get("t")] * len(dong)
        for k, d in enumerate(dong):
            tk = moc[k] if k < len(moc) and moc[k] is not None else th.get("t")
            if tk is None:
                continue
            s = str(d)
            if t_giai is None and any(_gan(float(m.replace(",", ".")), x_tot) for m in re_bien.findall(s) if re.fullmatch(r"[\d]+(?:[.,]\d+)?", m)):
                t_giai = tk
            if t_chot is None and t_giai is not None and any(_gan(v, y_tot) for v in _so_trong(s)):
                t_chot = tk
    if t_giai is None:
        cac = [th.get("t") for th in buoc_j.get("the") or [] if th.get("t") is not None]
        t_giai = cac[-1] if cac else (t_dap if t_dap is not None else buoc_j.get("t", 0) + 3)
    if t_chot is None or t_chot < t_giai:
        t_chot = t_giai + 0.8
    return round(t_giai, 3), round(t_chot, 3)


def kieu_badge(dc):
    if dc.get("nguong"):
        return "nguong"
    return "cuc_tieu" if dc.get("kieu") == "min" else "cuc_dai"


def so_viet(x):
    r = round(float(x), 2)
    s = ("%d" % r) if abs(r - round(r)) < 1e-9 else ("%g" % r)
    return s.replace(".", "{,}")


def _tex_so_dv(so, dv):
    ph = re.fullmatch(r"(-?\d+)/(\d+)", str(so))   # v98.1: đáp án phân số "9/11" -> \tfrac{9}{11} (trước đây chỉ còn "9")
    if ph and not dv:
        return r"\tfrac{%s}{%s}" % (ph.group(1), ph.group(2))
    so = str(so).replace(".", "{,}").replace(",", "{,}")
    dv = str(dv or "").replace("³", "^3").replace("²", "^2")
    if not dv:
        return so
    goc, mu = re.sub(r"\^.*", "", dv), re.search(r"\^\{?(\d)", dv)
    return so + r"\,\mathrm{%s}" % goc + ("^%s" % mu.group(1) if mu else "")


def de_ghim_doi(de_ghim, dap_an, t_chot, moc_theo_bien=None, gia_tri_theo_bien=None):
    """Ô ghim có '?' -> {doi: {nhan, t}}: '?' thay bằng ĐÚNG giá trị của đại lượng ở vế trái ô ('x = ?' -> x, 'V_{max} = ?' -> V),
    lấy từ dap_an ('x = 2 cm, V lớn nhất = 144 cm³') hoặc gia_tri_theo_bien (máy tính); mốc đổi theo đại lượng (moc_theo_bien),
    thiếu thì t_chot. Không xác định được đại lượng -> không đổi (không bao giờ ghi nhầm số của đại lượng khác)."""
    if t_chot is None:
        return de_ghim
    pda = phan_dap_an(dap_an)
    for k, v in (gia_tri_theo_bien or {}).items():
        if k not in pda:
            pda[k] = v
    ra = []
    for d in de_ghim:
        d = dict(d)
        nhan = str(d.get("nhan") or "")
        m = re.match(r"\s*\\?([A-Za-z])", nhan)
        if "?" in nhan and not d.get("doi") and m and m.group(1) in pda:
            so, dv = pda[m.group(1)]
            t = (moc_theo_bien or {}).get(m.group(1), t_chot)
            d["doi"] = {"nhan": nhan.replace("?", _tex_so_dv(so, dv), 1), "t": round(float(t), 3)}
        ra.append(d)
    return ra


def tieu_de_intro_dung(kb, tieu_de):
    """Tiêu đề intro đúng bản chất: bài hộp gập từ tấm bìa (4 góc cắt NHƯ NHAU) cấm hỏi 'cắt góc nào'."""
    s = str(tieu_de or "")
    c3 = ((kb.get("khung4tang") or {}).get("canh_3d_vector") or {}) if isinstance(kb.get("khung4tang"), dict) else {}
    bai_hop = str(c3.get("khuon") or "") == "tam_bia_gap_hop" or re.search(r"cắt\s*(bỏ\s*)?(ở\s*)?bốn\s*góc|4\s*góc", str(kb.get("de_bai") or ""), re.I)
    if bai_hop and re.search(r"góc\s*nào", s, re.I):
        lon = "LỚN NHẤT" if not re.search(r"nhỏ\s*nhất", str(kb.get("de_bai") or ""), re.I) else "NHỎ NHẤT"
        return "CẮT CẠNH BAO NHIÊU ĐỂ HỘP %s?" % lon
    return s


def bu_tom_tat(ra, buoc, kb, chu_sach, cong_thuc_gon, cong_thuc_buoc, dai):
    """Đủ 3 dòng: thêm từ các bước chưa dùng (ưu tiên có công thức), rồi dòng đáp số, rồi dòng 'kiểm tra miền'."""
    ra = [d for d in ra if d.get("chien_thuat")][:3]
    dung = [d["chien_thuat"].lower() for d in ra]
    da_ct = {chuan_dong(d.get("cong_thuc")) for d in ra if d.get("cong_thuc")}

    def trung(ct):   # "Lập hàm" trùng nghĩa "Lập hàm thể tích" -> bỏ
        c = ct.lower()
        return any(c in x or x in c for x in dung)
    # ưu tiên bước GIỮA có công thức mới (đạo hàm / xét dấu), bỏ bước đề bài và kết luận (đáp số đã ở đầu Outro)
    ung = [b for b in buoc[1:] if not re.search(r"kết\s*luận|đáp|đề\s*bài", str(b.get("nhan") or ""), re.I)]
    ung = sorted(ung, key=lambda b: 0 if cong_thuc_buoc(b) and chuan_dong(cong_thuc_gon(cong_thuc_buoc(b))) not in da_ct else 1)
    for b in ung:
        if len(ra) >= 3:
            break
        ct = chu_sach(b.get("nhan") or b.get("tieu_de"), dai, hoa=False)
        if ct and not trung(ct) and "?" not in ct:
            ra.append({"chien_thuat": ct, "cong_thuc": cong_thuc_gon(cong_thuc_buoc(b)), **({"mau": b["mau"]} if b.get("mau") else {}), "_t": b.get("t", 0)})
            dung.append(ct.lower())
    dap = str(kb.get("dap_an_cuoi") or kb.get("dap_an") or "").strip()
    if len(ra) < 3 and dap:
        ra.append({"chien_thuat": "Chốt đáp số", "cong_thuc": cong_thuc_gon(dap)})
    while len(ra) < 3:
        ra.append({"chien_thuat": ["Đặt ẩn, tìm điều kiện", "Lập hàm cần tối ưu", "Xét dấu, chốt cực trị"][len(ra)], "cong_thuc": ""})
    for d in ra:
        d.pop("_t", None)
    return ra[:3]


def json_gon(x):
    return json.dumps(x, ensure_ascii=False)


# ==================== PHẦN 3: Đồng bộ Hình-Tiếng 1-1, chống đứng hình, theme, nhãn bước (v99) ====================
# ---------------------------------------------------------------- phụ đề: trả phiên âm về ký hiệu
_X = r"(?:ít[\s-]?sờ|ích[\s-]?xì|ếch[\s-]?xì|ích[\s-]?sì)"
_TEN_HAM = {"vê": "V", "ve": "V", "ép": "f", "ếp": "f", "gờ": "g", "ét": "S", "hát": "h", "pê": "P", "lờ": "L"}
_RE_HAM = re.compile(r"(?<![\wÀ-ỹ])(" + "|".join(sorted(_TEN_HAM, key=len, reverse=True)) + r")(\s+phẩy)?\s+(?:tại\s+)?"
                     r"(\d+(?:[.,]\d+)?|x|ích|" + _X + r")(?![\wÀ-ỹ])", re.I)
_NGU_CANH_ICH = r"(?:bằng|trừ|cộng|nhân|chia|bình phương|lập phương|lớn hơn|nhỏ hơn|thuộc|=|<|>|≤|≥|\+|−|-)"
_TRUOC_KHONG_DOI = re.compile(r"(lợi|hữu|tiện|bổ|vô|ích)\s*$", re.I)


def tra_ky_hieu(text):
    s = str(text or "")
    if not s:
        return s
    s = giu_ky_hieu_giao(s)   # v102: \cap / ∩ không bao giờ thành chữ "n"
    s = re.sub(r"(?<![\wÀ-ỹ])" + _X + r"(?![\wÀ-ỹ])", "x", s, flags=re.I)

    def _ham(m):
        f = _TEN_HAM[m.group(1).lower()]
        arg = m.group(3)
        arg = "x" if re.fullmatch(r"ích|x|" + _X, arg, re.I) else arg
        # "vê tại 2" / "vê ích" / "vê phẩy ích": chỉ đổi khi chắc là ký hiệu hàm (có 'tại' hoặc 'phẩy' hoặc đối số là x)
        if not (m.group(2) or "tại" in m.group(0).lower() or arg == "x"):
            return m.group(0)
        return f + ("'" if m.group(2) else "") + "(" + arg + ")"
    s = _RE_HAM.sub(_ham, s)
    s = re.sub(r"(\d)\s+ích(?![\wÀ-ỹ])", r"\1x", s)                         # "2 ích" -> "2x"

    def _ich(m):
        truoc = s[:m.start()]
        if _TRUOC_KHONG_DOI.search(truoc):
            return m.group(0)
        return "x"
    # "ích" đứng riêng chỉ đổi khi kề phép toán ("ích bằng 2", "trừ ích") - "lợi ích" giữ nguyên
    s = re.sub(r"(?<=" + "bằng " + r")ích(?![\wÀ-ỹ])|(?<=trừ )ích(?![\wÀ-ỹ])|(?<=cộng )ích(?![\wÀ-ỹ])|(?<=nhân )ích(?![\wÀ-ỹ])", _ich, s)
    s = re.sub(r"(?<![\wÀ-ỹ])ích(?=\s+" + _NGU_CANH_ICH + r"(?![\wÀ-ỹ]))", _ich, s)
    return s


# ---------------------------------------------------------------- v102: số mũ chỉ sau biến / biểu thức toán, ký hiệu giao, số thập phân, tham số của đáp án
_MU_TOAN_HANG = r"(?:(?<![\wÀ-ỹ'])(?:[A-Za-z]|[A-Z]{2,4}|\d+(?:[.,]\d+)?|π)'?|\))"
_RE_BINH_PHUONG = re.compile(r"(" + _MU_TOAN_HANG + r")\s+bình phương(?![\wÀ-ỹ])")
_RE_LAP_PHUONG = re.compile(r"(" + _MU_TOAN_HANG + r")\s+lập phương(?![\wÀ-ỹ])")


def ky_hieu_mu(text):
    """"x bình phương" -> "x²", "(a + b) bình phương" -> "(a + b)²", "AB bình phương" -> "AB²", "2 lập phương" -> "2³" — NHƯNG
    từ tiếng Việt thông thường đứng trước ("tổng bình phương", "hiệu lập phương", "diện tích hình vuông bình phương") GIỮ NGUYÊN:
    trước đây luật "mọi ký tự + bình phương" biến "tổng bình phương" thành "tổng²"."""
    s = str(text or "")
    s = _RE_BINH_PHUONG.sub(lambda m: m.group(1) + "²", s)
    return _RE_LAP_PHUONG.sub(lambda m: m.group(1) + "³", s)


_RE_CAP = re.compile(r"\\{1,2}cap(?![A-Za-z])")
_RE_TRONG_NGOAC_XS = re.compile(r"((?<![A-Za-zÀ-ỹ])[Pn]\s*\()([^()]*)(\))")
_RE_N_GIUA = re.compile(r"(?<=[\wÀ-ỹ)}])\s+n\s+(?=[A-ZÀ-Ỵ\\(])")


def giu_ky_hieu_giao(text):
    """Bảo toàn ký hiệu giao: "\\cap" (cả bản thừa gạch chéo "\\\\cap") -> "∩"; và trong P(...) / n(...) một chữ "n" thường lạc giữa hai
    toán hạng ("P(Bệnh n Dương)") -> "P(Bệnh ∩ Dương)". Giữ nguyên "∩" có sẵn."""
    s = _RE_CAP.sub("∩", str(text or ""))
    return _RE_TRONG_NGOAC_XS.sub(lambda m: m.group(1) + _RE_N_GIUA.sub(" ∩ ", m.group(2)) + m.group(3), s)


_CHU_SO_VN = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
_RE_THAP_PHAN_0 = re.compile(r"(?<![\d.,])(?:(\d+)\s*(?:\{,\}|,)|(0)\.)\s*(0\d*)(?!\d)")


def doc_thap_phan_viet(text):
    """Số thập phân có số 0 ngay sau dấu phẩy ("0,0095", "0{,}05", "0.0095") -> đọc HOÀN TOÀN tiếng Việt từng chữ số phần thập phân:
    "không phẩy không không chín năm" (giọng AI hay rơi ra "zero point ..."). "1,000" kiểu nghìn của Anh (phần lẻ đúng 3 số 0) giữ nguyên."""
    def thay(m):
        a = m.group(1) if m.group(1) is not None else m.group(2)
        b = m.group(3)
        if a != "0" and len(b) == 3 and set(b) == {"0"}:
            return m.group(0)
        return "%s phẩy %s" % ("không" if a == "0" else a, " ".join(_CHU_SO_VN[int(c)] for c in b))
    return _RE_THAP_PHAN_0.sub(thay, str(text or ""))


def co_tham_so(dap):
    """Đáp án có tham số chữ (a, m...) ngoài lệnh LaTeX? "\\frac{2a}{\\sqrt{11}}" / "0,603a" / "a\\sqrt{3}" -> True; "0,603" -> False."""
    s = re.sub(r"\\[A-Za-z]+", " ", str(dap or ""))
    return bool(re.search(r"(?<![A-Za-zÀ-ỹ])[A-Za-z](?![A-Za-zÀ-ỹ])", re.sub(r"[{}^_$]", " ", s)))


def kiem_ngay_dap_an(kb):
    for key in ("dap_an", "dap_an_cuoi", "dap_an_hien", "dap_an_chinh_xac", "dap_an_tex"):
        if re.search(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", str(kb.get(key) or "")):
            raise ValueError("DAP_AN_NGAY: kiểm tra lại phân số gốc ở " + key)


def dinh_dang_dap_an(text, kb):
    # Chỉ thêm đơn vị khi đáp án khác xác nhận hoặc đề hỏi diện tích có một đơn vị dài.
    unit = r"(?:km|cm|mm|dm|m)(?:[²³]|\^\{?[23]\}?)?"
    display = re.sub(r"\\(?:text|mathrm)\s*\{(" + unit + r")\}", r"\1", text).replace(r"\,", " ").replace(r"\ ", " ")
    match = re.fullmatch(r"\s*([+-]?\d+(?:[.,]\d+)?)\s*(" + unit + r")?\s*", display)
    if not match:
        return text
    number = match[1].replace(".", ",")
    suffix = match[2]
    if not suffix:
        for key in ("dap_an_hien", "dap_an_cuoi", "dap_an", "dap_an_chinh_xac"):
            other = str(kb.get(key) or "").replace(".", ",")
            m = re.search(r"(?<![\d,])" + re.escape(number) + r"\s*(" + unit + r")(?!\w)", other)
            if m:
                suffix = m[1]
                break
    de = str(kb.get("de_bai") or "")
    if not suffix:
        requested = re.search(r"(?:theo\s+(?:đơn vị\s+)?|đơn vị\s+|bao nhiêu\s+)\(?(" + unit + r")\)?(?!\w)", de, re.I)
        if requested:
            suffix = requested[1]
    if not suffix and re.search(r"(?:tính|tìm|hỏi)\s+(?:tổng\s+)?diện tích|diện tích[^?.!]{0,100}bao nhiêu", de, re.I):
        units = set(re.findall(r"\d\s*(km|cm|mm|dm|m)(?:[²³]|\^\{?[23]\}?)?(?!\w)", de))
        if len(units) == 1:
            suffix = units.pop() + "²"
    suffix = re.sub(r"\^\{?([23])\}?", lambda m: "²" if m[1] == "2" else "³", suffix or "")
    return number + (" " + suffix if suffix else "")


def chon_dap_an_hien(kb):
    """Chuỗi đáp án hiển thị (ô đáp án + Outro). Giữ NGUYÊN dạng có tham số `a` ("\\frac{2a}{\\sqrt{11}}", "0,603a") khi bất kỳ trường đáp án
    nào của kịch bản còn giữ nó — không cắt cụt thành số trần "0,603"."""
    kb = kb or {}
    kiem_ngay_dap_an(kb)
    cac = [str(kb.get(k) or "") for k in ("dap_an_cuoi", "dap_an", "dap_an_hien", "dap_an_chinh_xac", "dap_an_tex")]
    chinh = next((x for x in cac if x.strip()), "")
    if co_tham_so(chinh):
        return dinh_dang_dap_an(chinh, kb)
    # đáp án chính là số trần: tìm bản có tham số mà phần số khớp (vd "0,603" ~ "0,603a" / "2a/\\sqrt{11}" ≈ 0,603a)
    so = re.findall(r"\d+(?:[.,]\d+)?", chinh)
    for x in cac:
        if x.strip() and co_tham_so(x):
            if not so or any(t in x.replace("{,}", ",") for t in so) or re.search(r"\\sqrt|\\frac|/", x):
                return dinh_dang_dap_an(x, kb)
    return dinh_dang_dap_an(chinh, kb)


# ---------------------------------------------------------------- không đọc lặp "bằng X bằng X"
_RE_BANG = re.compile(r"\s*(?:bằng|=)\s+")


_RE_DV = re.compile(r"\s*(?:cm|mm|m|km|kg|g|đồng|triệu|nghìn|ngàn|m²|m³|cm²|cm³|mét(?: vuông| khối)?|%)$", re.I)


def _tach_don_vi(cum):
    c = re.sub(r"[.!?…;:]+$", "", str(cum).strip()).strip()
    dv = ""
    while True:
        m = _RE_DV.search(c)
        if not m or m.start() == 0:
            break
        dv = c[m.start():] + dv
        c = c[:m.start()].strip()
    return c, dv


def _gia_tri(cum, doi_so):
    c, _ = _tach_don_vi(cum)
    if doi_so:
        c = doi_so(c)
    c = re.sub(r"\s*phần\s*", "/", c).replace(" ", "")
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", c):
        c = c.replace(".", "")
    m = re.fullmatch(r"(\d+(?:[.,]\d+)?)(?:/(\d+))?", c)
    if not m:
        return None
    v = float(m.group(1).replace(",", "."))
    return v / float(m.group(2)) if m.group(2) else v


_RE_VE = re.compile(r"(\s*(?:bằng|=)\s+)(.+?)(?=\s*(?:bằng|=)\s+|,(?!\d)|[;!?…]|\.(?!\d)|$)")


def bo_lap_bang(text, doi_so=None):
    """Bỏ vế "bằng <B>" nối ngay sau vế "bằng <A>" cùng GIÁ TRỊ (chữ hay số: "một trăm bốn mươi tư" = 144)."""
    s = str(text or "")
    ra, cuoi, truoc, het_truoc = [], 0, None, None
    for m in _RE_VE.finditer(s):
        v = _gia_tri(m.group(2), doi_so)
        if v is not None and truoc is not None and het_truoc == m.start() and abs(v - truoc) < 1e-9 * max(1.0, abs(v)):
            ra.append(s[cuoi:m.start()])
            dv = _tach_don_vi(m.group(2))[1]
            if dv and dv.strip().lower() not in s[cuoi:m.start()].lower()[-24:]:
                ra.append(dv)   # giữ đơn vị chỉ vế lặp mới ghi ("= 144 bằng 144 cm³" -> "= 144 cm³")
            cuoi = het_truoc = m.end()
            continue
        truoc, het_truoc = v, m.end()
    ra.append(s[cuoi:])
    return _bo_lap_sau_so("".join(ra), doi_so)


_RE_SAU_SO = re.compile(r"([\d][\d.,/]*(?:\s+[^\s\d,.;!?]+){0,3}?)\s+bằng\s+([^;!?…]+?)(?=,(?!\d)|[;!?…]|\.(?!\d)|$)")


def _bo_lap_sau_so(s, doi_so):
    """'33,8 triệu đồng bằng 33,8 triệu.' -> '33,8 triệu đồng.' (số đứng trước 'bằng' trùng giá trị vế sau)."""
    def thay(m):
        a, b = _gia_tri(m.group(1), doi_so), _gia_tri(m.group(2), doi_so)
        return m.group(1) if a is not None and b is not None and abs(a - b) < 1e-9 * max(1.0, abs(a)) else m.group(0)
    return _RE_SAU_SO.sub(thay, s)


# ---------------------------------------------------------------- mốc bước theo CẢNH (không chia đều thời gian)
def _tu(s):
    return re.findall(r"[a-zà-ỹđ]+", str(s or "").lower())


def suy_canh_buoc(ds_buoc, cac_canh):
    """Danh sách số cảnh (1-based) cho từng bước. Bước có `canh` hợp lệ giữ nguyên; thiếu -> cảnh (chỉ tiến) có lời thoại
    chung nhiều từ nhất với khi_noi + tiêu đề; không khớp gì -> cảnh kế tiếp sau cảnh của bước trước (theo THỨ TỰ cảnh)."""
    n = len(cac_canh)
    tu_canh = [set(_tu(c.get("loi_thoai"))) for c in cac_canh]
    ra, cuoi = [], 1
    for j, b in enumerate(ds_buoc):
        try:
            c = int(b.get("canh")) if b.get("canh") is not None else None
        except (TypeError, ValueError):
            c = None
        if c is not None and 1 <= c <= n:
            ra.append(c)
            cuoi = max(cuoi, c)
            continue
        if j == 0:
            ra.append(1)
            continue
        can = set(_tu(b.get("khi_noi"))) | set(_tu(b.get("tieu_de")))
        tot, diem = None, 0.0
        for k in range(cuoi, n + 1):
            chung = len(can & tu_canh[k - 1])
            d = chung / max(1, len(can))
            if chung >= 2 and d > diem + 1e-9:
                tot, diem = k, d
        if tot is None:
            con = n - cuoi
            tot = min(n, cuoi + (1 if con > len(ds_buoc) - j - 1 else 0)) if j else 1
        ra.append(tot)
        cuoi = max(cuoi, tot)
    return ra


LA_KET_LUAN = re.compile(r"kết\s*luận|đáp\s*(?:số|án)|chốt", re.I)


def moc_cong_bo(tu_all, canh_props, fps, so_dap, doi_so=None):
    """Giây giọng đọc công bố đáp án: từ đầu tiên (trong cảnh dap_an / ket_qua / chot) mang số đáp án (so khớp GIÁ TRỊ,
    kể cả số đọc bằng chữ); không thấy -> đầu cảnh đáp án; không có cảnh đáp án -> None."""
    moc_cong_bo.uoc_luong = False   # v101.5: True khi KHÔNG dò được mốc thật, phải ước lượng = đầu cảnh đáp án
    canh = [c for c in canh_props if re.search(r"dap_an|ket_qua|chot", str(c.get("loai") or ""))]
    if not canh:
        return None
    c = canh[0]
    dich = []
    for x in so_dap or []:
        s = str(x).strip()
        try:
            dich.append(float(s.replace(".", "").replace(",", ".") if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", s) else s.replace(",", ".")))
        except ValueError:
            m = re.fullmatch(r"(\d+)\s*/\s*(\d+)", s)   # phân số a/b
            if m and int(m.group(2)):
                dich.append(int(m.group(1)) / float(int(m.group(2))))
    # cảnh dò: cảnh đáp án trước; không có số trực tiếp -> lùi sang cảnh tinh_toan / chot liền kề trước đó
    ds_canh = [c]
    try:
        i0 = [k for k, x in enumerate(canh_props) if x is c][0]
        if i0 > 0 and re.search(r"tinh_toan|tinh|chot|ket_qua", str(canh_props[i0 - 1].get("loai") or "")):
            ds_canh.append(canh_props[i0 - 1])
    except IndexError:
        pass
    for cc in ds_canh:
        t0 = cc["batDau"] / float(fps)
        t1 = t0 + cc["soFrame"] / float(fps)
        tu = [w for w in tu_all if t0 - 0.05 <= w["bat"] < t1]
        for i in range(len(tu)):
            if _cum_la_dap_an([w["w"] for w in tu[i:i + 8]], dich, doi_so):
                return round(tu[i]["bat"], 3)
    moc_cong_bo.uoc_luong = True
    t0 = c["batDau"] / float(fps)
    return round(t0 + c.get("leadFrame", 0) / float(fps), 3)


_CHU_SO_DON = {"không": 0, "linh": 0, "lẻ": 0, "một": 1, "mốt": 1, "hai": 2, "ba": 3, "bốn": 4, "tư": 4, "năm": 5, "lăm": 5,
               "sáu": 6, "bảy": 7, "bẩy": 7, "tám": 8, "chín": 9}
_RE_TRONG = re.compile(r"\s*(?:phần|trên|chia)\s*")


def _doc_chu_so(ws, doi_so):
    """Dãy từ -> số: 'ba mươi hai' (qua doi_so) hoặc đọc từng chữ số 'ba hai' / 'chín lăm' (mọi từ là 1 chữ số)."""
    ws = [w for w in ws if w]
    if not ws:
        return None
    if all(re.fullmatch(r"\d+", w) for w in ws):
        return float("".join(ws))
    v = _gia_tri(" ".join(ws), doi_so)
    if v is not None:
        return v
    if len(ws) >= 2 and all(w in _CHU_SO_DON for w in ws):
        return float("".join(str(_CHU_SO_DON[w]) for w in ws))
    return _so_tu_chu(ws)


def _so_tu_chu(ws):
    """Dự phòng khi không có bộ đổi số của chuanbi: 'ba mươi hai' -> 32, 'một trăm linh năm' -> 105, 'mười lăm' -> 15."""
    tong = tram = 0
    chuc = dv = None
    thay = False
    for w in ws:
        if w == "trăm":
            tram, dv, thay = (dv if dv is not None else 1) * 100, None, True
        elif w == "mười":
            chuc, thay = 1, True
        elif w == "mươi":
            if dv is None:
                return None
            chuc, dv, thay = dv, None, True
        elif w in ("linh", "lẻ"):
            thay = True
        elif w in _CHU_SO_DON and w not in ("linh", "lẻ"):
            if dv is not None:
                return None
            dv, thay = _CHU_SO_DON[w], True
        else:
            return None
    if not thay:
        return None
    tong = tram + (chuc * 10 if chuc is not None else 0) + (dv or 0)
    return float(tong)


def _cum_la_dap_an(ws, dich, doi_so):
    """Cụm từ ĐẦU `ws` (thử độ dài 1..8) có đọc ra một giá trị trong `dich` không? Hỗ trợ: số / "a/b" / "a phần b" /
    "a trên b" / chữ đầy đủ hoặc đọc từng chữ số / "gấp đôi" "bằng hai" (2) / "một nửa" (1/2). Đặt `_cum_la_dap_an.n` = số từ khớp."""
    _cum_la_dap_an.n = 0
    ws = [re.sub(r"[^\w,./%À-ỹ]", "", str(w)).lower().rstrip(".,") for w in ws]
    ws = [w for w in ws if w]
    if not ws or not dich:
        return False

    def khop(v):
        return v is not None and any(abs(v - d) < 1e-6 * max(1, abs(d)) for d in dich)
    chuoi = " ".join(ws)
    if any(abs(d - 2) < 1e-9 for d in dich) and re.match(r"gấp đôi|bằng hai\b|gấp hai\b", chuoi):
        _cum_la_dap_an.n = 2
        return True
    if any(abs(d - 0.5) < 1e-9 for d in dich) and re.match(r"một nửa|nửa\b|phân nửa", chuoi):
        _cum_la_dap_an.n = 2 if chuoi.startswith("một") else 1
        return True
    for n in range(1, min(len(ws), 8) + 1):
        cum = ws[:n]
        # nhánh phân số: tách theo phần / trên / chia
        t = _RE_TRONG.split(" ".join(cum), maxsplit=1)
        if len(t) == 2 and t[0].strip() and t[1].strip():
            tu_, mau_ = _doc_chu_so(t[0].split(), doi_so), _doc_chu_so(t[1].split(), doi_so)
            if tu_ is not None and mau_:
                if khop(tu_ / mau_):
                    _cum_la_dap_an.n = n
                    return True
                continue
        v = _gia_tri(" ".join(cum), doi_so)
        if v is None and n >= 2:
            v = _doc_chu_so(cum, doi_so)
        if khop(v):
            _cum_la_dap_an.n = n
            return True
    return False


def khoa_dap_an(out, t_cb, so_dap=()):
    """Không thứ gì công bố đáp án hiện trước t_cb. Trả danh sách sửa (để in nhật ký / test)."""
    if t_cb is None or not out:
        return []
    sua = []
    lech_max = 0.0
    if out.get("sanKhau"):
        out["sanKhau"]["mocCongBo"] = t_cb
    buoc = out.get("buoc") or []
    for j, b in enumerate(buoc):
        if j and LA_KET_LUAN.search(str(b.get("nhan") or "") + " " + str(b.get("tieu_de") or "")) and b["t"] < t_cb - 0.05:
            lech = t_cb - b["t"]
            lech_max = max(lech_max, lech)
            b["t"] = round(t_cb, 3)
            for th in b.get("the") or []:
                th["t"] = round(max(th.get("t", 0) + lech, t_cb + 0.45), 3)
                if th.get("moc"):
                    th["moc"] = [round(max(x + lech, th["t"]), 3) for x in th["moc"]]
            sua.append("bước '%s' dời tới %.2f s" % (b.get("nhan"), t_cb))
    for j in range(len(buoc) - 2, -1, -1):   # bước sau luôn sau bước trước
        if buoc[j]["t"] >= buoc[j + 1]["t"] - 0.6 and j:
            buoc[j]["t"] = round(buoc[j + 1]["t"] - 0.6, 3)
    for b in buoc:
        for th in b.get("the") or []:
            if th.get("loai") == "cong_thuc":
                # Một dòng cũ có thể gộp nghiệm và đáp số: tách hai lần hiện.
                dong, moc = [], []
                for index, line in enumerate(th.get("dong") or []):
                    times = th.get("moc") or []
                    at = times[index] if index < len(times) else th.get("t", b["t"]) + 0.45 * index
                    parts = re.split(r"\s*(?:⇒|=>|\\(?:Rightarrow|implies))\s*(?=[A-Za-z].*?(?:max|min))", line, maxsplit=1)
                    for part in parts:
                        dong.append(part)
                        final = re.search(r"(?:max|min)\s*\}?\s*=\s*[-+]?\d", part)
                        moc.append(max(at, t_cb) if final else at)
                if dong and (dong != th.get("dong") or any(re.search(r"(?:max|min)\s*\}?\s*=", d) for d in dong)):
                    th.update(dong=dong, moc=moc)
            if th.get("chot") and th.get("t", 0) < t_cb:
                lech = t_cb - th["t"]
                lech_max = max(lech_max, lech)
                th["t"] = round(t_cb, 3)
                if th.get("moc"):
                    th["moc"] = [round(x + lech, 3) for x in th["moc"]]
                sua.append("thẻ chốt -> %.2f s" % t_cb)
        dc = b.get("doi_chieu")
        if isinstance(dc, dict):
            dc["t_huy_hieu"] = round(max(t_cb, dc.get("t_chot") or 0), 3)
    for d in out.get("deGhim") or []:
        doi = d.get("doi")
        if isinstance(doi, dict) and doi.get("t") is not None and doi["t"] < t_cb:
            gt = str(doi.get("nhan") or doi.get("gia_tri") or "")
            if not so_dap or any(sd in gt for sd in so_dap):
                doi["t"] = round(t_cb, 3)
                sua.append("ô ghim '%s' -> %.2f s" % (d.get("nhan"), t_cb))
    kl = {j for j, b in enumerate(buoc) if j and LA_KET_LUAN.search(str(b.get("nhan") or "") + " " + str(b.get("tieu_de") or ""))}
    for l in (out.get("tuSinh") or {}).get("lop") or []:   # lớp kết quả của sân khấu tự sinh cũng không lộ trước câu chốt
        if l.get("buoc") in kl and l["t"] < t_cb:
            l["t"] = round(t_cb, 3)
            sua.append("lớp tự sinh '%s' -> %.2f s" % (l.get("nhan") or l.get("id"), t_cb))
    if out.get("tuSinh"):
        out["tuSinh"]["lop"].sort(key=lambda l: l["t"])
    if out.get("tChot") is not None and out["tChot"] < t_cb:
        out["tChot"] = round(t_cb, 3)
    out["tCongBo"] = round(t_cb, 3)
    khoa_dap_an.lech_max = lech_max
    return sua


NGUONG_LECH_PHA = 3.0


def canh_bao_dong_bo(out, t_cb, sua, tu_all=(), canh_props=(), fps=30, so_dap=(), doi_so=None):
    """v99.2 — cờ LỆCH PHA hình - tiếng (props.khung4tang.canhBaoDongBo -> Mắt thần lỗi cứng `lech_pha` -> Auto-Heal):
    (1) kịch bản đặt bước kết luận / thẻ chốt TRƯỚC giây giọng công bố đáp án >= 3 s (đã bị khóa dời lại, nhưng lời và hình
        lệch nhịp rõ - phải sửa kịch bản); (2) có cảnh đáp án + có số đáp án nhưng giọng KHÔNG đọc ra số đó (mốc phải đoán)."""
    ra = []
    canh_bao_dong_bo.nhe = []   # v101.5: cảnh báo NHẸ (ước lượng mốc = đầu cảnh) - KHÔNG chặn đăng, KHÔNG kích Auto-Heal
    if t_cb is None or not out:
        return ra
    lech = getattr(khoa_dap_an, "lech_max", 0.0) if sua else 0.0
    if lech >= NGUONG_LECH_PHA:
        ra.append("mốc đáp án trên hình sớm hơn giọng công bố %.1f s (bước kết luận / thẻ chốt bị kéo trước tCongBo)" % lech)
    if so_dap and canh_props:
        canh = [c for c in canh_props if re.search(r"dap_an|ket_qua|chot", str(c.get("loai") or ""))]
        if canh:
            c = canh[0]
            t0 = c["batDau"] / float(fps)
            dau = round(t0 + c.get("leadFrame", 0) / float(fps), 3)
            co_tu = any(t0 - 0.05 <= w["bat"] < t0 + c["soFrame"] / float(fps) for w in tu_all or [])
            if co_tu and abs(t_cb - dau) < 1e-6:
                canh_bao_dong_bo.nhe.append("giọng cảnh đáp án không dò được số %s (mốc công bố ước lượng = đầu cảnh)" % ", ".join(str(x) for x in list(so_dap)[:2]))
    return ra


# v101.5: sân khấu chuyên dụng thay thế hộp cát tự sinh -> KHÔNG báo tuSinhHong
SAN_KHAU_CHUYEN_DUNG = ("rut_mau", "so_do_cay", "luoi_bayes", "cot_phan_phoi", "kinh_te_do_thi", "so_do_2d", "tang_truong")


def tu_sinh_hong_that(hong, out, kb=None):
    """Giữ cờ `tuSinhHong` (chuỗi) CHỈ khi video không có sân khấu chuyên dụng / 3D / không gian nào dựng thay; ngược lại ''."""
    if not hong:
        return ""
    out = out or {}
    sk = out.get("sanKhau") or {}
    if str(sk.get("loai") or "") in SAN_KHAU_CHUYEN_DUNG:
        return ""
    if out.get("canh3dv") or out.get("canh3DVector") or out.get("khongGian"):
        return ""
    k4 = (kb or {}).get("khung4tang") or {}
    if str((k4.get("san_khau") or {}).get("loai") or "") in SAN_KHAU_CHUYEN_DUNG and not out.get("tuSinh") and sk:
        return ""
    return hong


# ---------------------------------------------------------------- chống đứng hình > 6 s ở T2
def moc_doi_hinh(out):
    """Mọi mốc T2 đổi hình đã biết: đầu bước, thẻ, pha sân khấu 2D / 3D / tự sinh, nhịp cũ."""
    m = [0.0]
    for b in out.get("buoc") or []:
        m.append(b.get("t", 0))
        dc = b.get("doi_chieu") or {}
        for k in ("t_giai", "t_chot"):
            if dc.get(k) is not None:
                m.append(dc[k])
    sk = out.get("sanKhau") or {}
    m += [p.get("t", 0) for p in sk.get("pha") or [] if isinstance(p, dict)]
    m += [x for x in sk.get("nhip") or [] if isinstance(x, (int, float))]
    c3 = out.get("canh3dv") or {}
    m += [p.get("t", 0) for p in c3.get("pha") or [] if isinstance(p, dict) and p.get("t") is not None]
    m += [b.get("t", 0) for b in c3.get("buoc") or [] if isinstance(b, dict)]
    ts = out.get("tuSinh") or {}
    m += [l.get("t", 0) for l in ts.get("lop") or [] if isinstance(l, dict)]
    return sorted(set(round(float(x), 3) for x in m if x is not None))


def nhip_chong_dung(out, moc_cau, tong, tran=6.0):
    """Mốc nhịp (giây) cho các khoảng > `tran` giây không đổi hình: mỗi câu thoại bắt đầu trong khoảng đó một nhịp
    (sáng viền / zoom nhẹ / quét sáng trong T2); thiếu câu thì chèn đều 3,5 s."""
    moc = moc_doi_hinh(out) + [tong]
    cau = sorted(float(x) for x in moc_cau or [])
    nhip = []
    for a, b in zip(moc, moc[1:]):
        if b - a <= tran:
            continue
        trong = [x for x in cau if a + 1.2 < x < b - 0.8]
        cur = a
        for x in trong:
            if x - cur >= 2.0:
                nhip.append(round(x, 3))
                cur = x
        while True:   # câu quá dài: chèn đều để không khoảng nào > 4 s
            pts = [a] + sorted(x for x in nhip if a < x < b) + [b]
            lo = max(zip(pts, pts[1:]), key=lambda p: p[1] - p[0])
            if lo[1] - lo[0] <= 4.0:
                break
            nhip.append(round((lo[0] + lo[1]) / 2, 3))
    return sorted(set(nhip))


# ---------------------------------------------------------------- Outro đủ 3 dòng có công thức
def du_cong_thuc_tom_tat(ra, buoc, kb, cong_thuc_gon, cong_thuc_buoc):
    dap = str(kb.get("dap_an_cuoi") or kb.get("dap_an") or "").strip()
    da = {str(d.get("cong_thuc") or "") for d in ra if d.get("cong_thuc")}
    du_tru = [cong_thuc_gon(cong_thuc_buoc(b)) for b in buoc if cong_thuc_buoc(b)]
    for d in ra:
        if str(d.get("cong_thuc") or "").strip():
            continue
        ct = d.get("chien_thuat") or ""
        cand = ""
        tu = set(_tu(ct))
        for b in buoc:   # bước có nhãn / tiêu đề gần nghĩa nhất
            if tu and len(tu & set(_tu(str(b.get("nhan") or "") + " " + str(b.get("tieu_de") or "")))) >= max(1, len(tu) // 2):
                cand = cong_thuc_gon(cong_thuc_buoc(b))
                if cand:
                    break
        if not cand and LA_KET_LUAN.search(ct) and dap:
            cand = cong_thuc_gon(dap)
        if not cand:
            cand = next((x for x in du_tru if x not in da), "") or (cong_thuc_gon(dap) if dap else "")
        if cand:
            d["cong_thuc"] = cand
            da.add(cand)
    for d in ra:   # nhãn trơn "Bước 3" -> tiêu đề của bước đó (Outro đọc được chiến thuật)
        m = re.fullmatch(r"\s*bước\s*(\d+)\s*", str(d.get("chien_thuat") or ""), re.I)
        b = next((x for x in buoc if re.fullmatch(r"\s*bước\s*%s\s*" % (m.group(1) if m else "-"), str(x.get("nhan") or ""), re.I)), None) if m else None
        if b and str(b.get("tieu_de") or "").strip() and "?" not in str(b.get("tieu_de")):
            d["chien_thuat"] = cat_nhan(str(b["tieu_de"]).strip(), 28)
    return ra


# ---------------------------------------------------------------- 5 theme nền khí quyển
THEMES = ("deep_ocean", "cosmic_indigo", "emerald_studio", "warm_slate", "blueprint")
_RE_THEME = [
    ("blueprint", r"hình không gian|hình chóp|lăng trụ|tứ diện|oxyz|kiến trúc|tòa nhà|cầu vòm|mặt phẳng"),
    ("cosmic_indigo", r"xác suất|tổ hợp|chỉnh hợp|hoán vị|bi |xúc xắc|đồng xu|rút thẻ|bayes|biến cố"),
    ("emerald_studio", r"lợi nhuận|doanh thu|giá vé|giá bán|chi phí|tối ưu|lớn nhất|nhỏ nhất|kinh tế|parabol|hàm số"),
    ("deep_ocean", r"đảo|biển|sông|hồ|bông tuyết|koch|thuyền|cảng|bờ biển|ao"),
    ("warm_slate", r"dãy số|cấp số|đại số|phương trình|bất phương trình|chia hết|đa thức"),
]


def chon_theme(kb):
    """Theme theo dạng toán (đề + chỉ đạo); kịch bản ghi sẵn `khung4tang.theme` thắng; không rõ -> hash mã đề."""
    k4 = kb.get("khung4tang") if isinstance(kb.get("khung4tang"), dict) else {}
    ep = str(k4.get("theme") or kb.get("theme") or "").strip().lower()
    if ep in THEMES:
        return ep
    van = " ".join(str(kb.get(k) or "") for k in ("de_bai", "chi_dao", "tieu_de")).lower()
    for ten, mau in _RE_THEME:
        if re.search(mau, van):
            return ten
    h = int(hashlib.md5(str(kb.get("id") or van).encode("utf8")).hexdigest(), 16)
    return THEMES[h % len(THEMES)]


# ---------------------------------------------------------------- v99.2: nhãn phụ bước không lặp "BƯỚC n"
# T1 (src/khung4tang/TangTieuDe.tsx) luôn vẽ viên thuốc "BƯỚC n" rồi mới tới nhãn phụ -> kịch bản ghi nhan = "Bước 1" gây
# "BƯỚC 2 | BƯỚC 1". Bản đôi: src/khung4tang/nhan_buoc.ts nhanPhuBuoc + KiemTraHinh.gs nhanPhuBuoc_ (test so khớp).
RE_TIEN_TO_BUOC = re.compile(r"^\s*(?:bước|buoc|step)\s*\d*\s*[:.\-–—·|/]*\s*", re.I)


def nhan_phu_buoc(nhan, j=0, n=0):
    """Nhãn phụ sau viên thuốc "BƯỚC n": bỏ tiền tố "Bước n" (kể cả "Bước 2: Lập hàm" -> "Lập hàm"); rỗng -> tên pha ngắn
    (bước đầu "Đề bài", bước cuối "Kết luận", giữa để trống). Không bao giờ còn chữ "Bước" đứng đầu."""
    s = str(nhan or "").strip()
    if not re.match(r"^(?:bước|buoc|step)\s*(?:\d|[:.\-–—·|/]|$)", s, re.I):   # "Bước ngoặt" là cụm có nghĩa -> giữ
        return s
    s = RE_TIEN_TO_BUOC.sub("", s).strip()
    if s:
        return s[0].upper() + s[1:]
    if n and j == 0:
        return "Đề bài"
    if n and j == n - 1:
        return "Kết luận"
    return ""


def chuan_nhan_buoc(out):
    """Áp nhan_phu_buoc cho props.khung4tang.buoc. Trả số bước đã sửa."""
    buoc = (out or {}).get("buoc") or []
    dem = 0
    for j, b in enumerate(buoc):
        if not isinstance(b, dict):
            continue
        moi = nhan_phu_buoc(b.get("nhan"), j, len(buoc))
        if moi != str(b.get("nhan") or "").strip():
            b["nhan"] = moi
            dem += 1
    return dem
