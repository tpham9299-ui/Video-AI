"""v93 — Intro "3 giây móc câu", Outro "tóm tắt 3 bước" và cảnh đối chiếu "Hình động ↔ Đồ thị ngưỡng" cho khung 4 tầng.

chuanbi.py (khung_4_tang) gọi các hàm ở đây sau khi đã có mốc bước. Mọi trường của kịch bản đều TÙY CHỌN:
thiếu thì tự sinh (fallback) nên kịch bản v92 cũ vẫn dựng được, không gãy.
- moc_cau(): nhan_thi / tieu_de_intro / phu_de_intro / cau_hook / cta (cắt gọn để vừa bố cục, che số đáp án).
- tom_tat(): tom_tat_3_buoc hoặc rút từ các bước giải (tên chiến thuật + công thức cốt lõi, mỗi dòng 1 dòng).
- gan_doi_chieu(): gắn buoc[].doi_chieu cho bước khảo sát của bài tối ưu; chỉ khi hàm suy từ khuôn tính ra
  ĐÚNG số của đáp án (không khớp -> bỏ, tầng 2 giữ 3D). Remotion kiểm hợp lệ lần nữa (src/khung4tang/doi_chieu.ts).
Khóa luồng hình học thuần: khung_4_tang đã trả None trước khi tới đây.
"""
import hashlib
import math
import re

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
    "": ["MUỐN 9+ THI KÌ KHÔNG THỂ BỎ QUA!", "SAI 1 BƯỚC LÀ MẤT ĐIỂM!", "3 BƯỚC LÀ RA ĐÁP ÁN!"],
}
NHAN_CHUNG = re.compile(r"^(đề bài|đề|bước\s*\d+|kết luận|dựng hình|đáp số|đáp án|tóm tắt)$", re.I)
TOI_UU = re.compile(r"lớn nhất|nhỏ nhất|tối đa|tối thiểu|ít nhất|nhiều nhất|cao nhất|thấp nhất|gtln|gtnn|tiết kiệm", re.I)
NHO = re.compile(r"nhỏ nhất|tối thiểu|ít nhất|thấp nhất|gtnn|tiết kiệm", re.I)
BUOC_KHAO_SAT = re.compile(r"tối ưu|lớn nhất|nhỏ nhất|gtln|gtnn|cực trị|cực đại|cực tiểu|xét dấu|biến thiên|khảo sát|so sánh|đánh giá|\bmax\b|\bmin\b", re.I)


def chu_sach(s, toi_da=0, hoa=True):
    """Bỏ mã TeX ($, \\lệnh, {}, ^, _) -> chữ thường in hoa, gọn khoảng trắng; cắt ở ranh giới từ nếu quá dài."""
    x = str(s or "")
    # v96: đổi TeX -> Unicode GIỮ NGHĨA trước khi lọc (trước đây "\overline{A}: tích \not\vdots 4" thành "A: tích 4" ngược nghĩa,
    # "n(\Omega)" thành "n( )")
    try:
        import khung4tang_v96 as _v96
        x = _v96.tex_sang_chu(x)
    except Exception:   # noqa: BLE001
        pass
    x = re.sub(r"\\(?:text|mathrm|mathbf)\s*\{([^{}]*)\}", r"\1", x)
    x = re.sub(r"\\(times|cdot)", "×", x)
    x = re.sub(r"\\[a-zA-Z]+", " ", x)
    x = re.sub(r"[${}^_\\]", "", x)
    x = re.sub(r"\s+", " ", x).strip()
    if hoa:
        x = x.upper()
    return cat_tu(x, toi_da) if toi_da else x


def cat_tu(x, toi_da):
    if len(x) <= toi_da:
        return x
    # v96: cụm "không ⋮ 4" là MỘT ý — không bao giờ cắt còn "tích không" (mất nghĩa) hay "tích ⋮ 4" (ngược nghĩa):
    # bỏ bớt từ thường đứng ngay trước cụm cho tới khi vừa
    m = re.search(r"(?i)không\s*⋮\s*\d+", x)
    if m:
        dau, cum, sau = x[:m.start()].split(), m.group(0), x[m.end():]
        while dau and len(" ".join(dau + [cum]) + sau) > toi_da and not dau[-1].endswith(":"):
            dau.pop()
        y = (" ".join(dau + [cum]) + sau).strip()
        if len(y) <= toi_da:
            return y
    cat = x[:toi_da + 1].rsplit(" ", 1)[0].rstrip(" ,.;:·-")
    cat = re.sub(r"(?i)\s+không$", "", cat)   # không để "không" treo cuối (mất vế chia hết)
    if cat:
        return cat
    # v99.3: tuyệt đối không cắt thô giữa một từ (giữ trọn từ đầu tiên nếu không có khoảng trắng trong giới hạn)
    return x.split(" ", 1)[0].rstrip(" ,.;:·-")


def che_so(s, so_lo):
    for x in so_lo or []:
        s = re.sub(r"(?<![\d.,])" + re.escape(x) + r"(?![\d.,])", "?", s)
    return re.sub(r"\?(?:\s*[/:,.]\s*\?)+", "?", s)


def tieu_de_vua(s):
    """Tiêu đề intro tối đa 2 dòng: ≤ 44 ký tự, không từ nào quá dài (từ dài bị bỏ)."""
    x = " ".join(w for w in chu_sach(s).split(" ") if len(w) <= DAI_TU)
    return cat_tu(x, DAI_TIEU_DE)


def _nhan_thi(kb):
    lop = str(kb.get("lop") or "").strip()
    if lop == "9":
        return "ÔN THI VÀO 10"
    if lop == "12":
        return "ÔN THI THPT · LỚP 12"
    return "LUYỆN THI · LỚP %s" % lop if lop else "LUYỆN THI"


def moc_cau(kb, buoc, so_lo):
    """props.khung4tang.mocCau (luôn đủ 5 trường, đã cắt vừa bố cục, không lộ số đáp án)."""
    lop = str(kb.get("lop") or "").strip()
    nhan_thi = chu_sach(kb.get("nhan_thi"), 28) or _nhan_thi(kb)
    tieu_de = ""
    for nguon in (kb.get("tieu_de_intro"), kb.get("hook_chu"), kb.get("tieu_de_bia"), kb.get("tieu_de"), kb.get("chu_de")):
        tieu_de = tieu_de_vua(che_so(str(nguon or ""), so_lo))
        if len(tieu_de) >= 6:
            break
    phu = chu_sach(che_so(str(kb.get("phu_de_intro") or ""), so_lo), DAI_PHU_DE)
    if not phu:
        phan = []
        cd = chu_sach(kb.get("chu_de_ngan") or kb.get("chu_de") or "", 22)
        if cd:
            phan.append(cd)
        for b in buoc:
            n = chu_sach(b.get("nhan"), 14)
            if n and not NHAN_CHUNG.match(n.lower()) and n not in phan and not re.search(r"\?", n):
                phan.append(n)
        while phan and len(" · ".join(phan)) > DAI_PHU_DE:
            phan.pop()
        phu = " · ".join(phan[:3])
    hook = chu_sach(che_so(str(kb.get("cau_hook") or ""), so_lo), DAI_HOOK)
    if len(hook) < 6:
        ds = HOOK_THEO_LOP.get(lop) or HOOK_THEO_LOP[""]
        hook = ds[int(hashlib.md5(str(kb.get("id") or kb.get("de_bai") or "").encode("utf8")).hexdigest(), 16) % len(ds)]
    cta = chu_sach(kb.get("cta"), DAI_CTA) or CTA_MD
    return {"nhan_thi": nhan_thi, "tieu_de": tieu_de or "GIẢI NHANH BÀI TOÁN", "phu_de": phu, "cau_hook": hook, "cta": cta}


def cong_thuc_gon(tex):
    """Công thức cốt lõi một dòng: dài quá thì giữ 2 vế cuối (vế = phần giữa các dấu '='); v99.3: không cắt thô [:56] giữa lệnh LaTeX."""
    s = re.sub(r"\s+", " ", str(tex or "")).strip().strip("$")
    if len(s) <= DAI_CONG_THUC:
        return s
    ve = [v.strip() for v in s.split("=") if v.strip()]
    while len(ve) > 2:
        ve.pop(0)
    s = " = ".join(ve)
    return s if len(s) <= DAI_CONG_THUC else ve[-1]


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
    import khung4tang_v95 as v95
    ra = v95.bu_tom_tat(ra, buoc, kb, chu_sach, cong_thuc_gon, _cong_thuc_buoc, DAI_CHIEN_THUAT)
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
            dc = {"ham": str(ts["ham"]), "bien": "t", "ten_ham": str(ts.get("ten_ham") or "h")[:2], "mien": [a, b], "kieu": kieu, "hinh": "thanh"}
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
