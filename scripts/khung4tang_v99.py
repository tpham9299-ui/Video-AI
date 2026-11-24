"""v99.1 — khóa đồng bộ Hình ↔ Tiếng 1-1, chống đứng hình, phụ đề không phiên âm, không đọc lặp số, Outro đủ 3 dòng,
chọn nền khí quyển theo chủ đề (chỉ khung 4 tầng).

Hàm thuần (không gọi mạng / không đọc tệp) để test được độc lập:
- tra_ky_hieu(text): phiên âm AI lỡ viết trong loi_thoai ("ít-sờ", "vê tại 2", "2 ích") -> ký hiệu chuẩn ("x", "V(2)", "2x").
  Chạy TRƯỚC khi tách giọng / phụ đề: giọng đọc vẫn đọc "ích" (chuan_hoa_doc), phụ đề hiện "x".
- bo_lap_bang(text, doi_so): "… bằng một trăm bốn mươi tư bằng 144" -> "… bằng một trăm bốn mươi tư" (cùng giá trị).
- suy_canh_buoc(ds_buoc, cac_canh): bước thiếu `canh` -> cảnh có lời chứa khi_noi / tiêu đề (chỉ tiến), KHÔNG chia đều thời gian.
- moc_cong_bo(...): giây giọng đọc thật sự đọc ra đáp số (từ đầu tiên chứa số đáp án trong cảnh đáp án) - fallback đầu cảnh đáp án.
- khoa_dap_an(out, t_cb): bước "Kết luận", thẻ chốt, huy hiệu ★ CỰC ĐẠI, ô đổi đáp số, tChot đều >= t_cb.
- nhip_chong_dung(out, moc_cau, tong): mốc nhịp T2 cho mọi khoảng > 6 s không đổi hình (mỗi câu thoại 1 nhịp).
- du_cong_thuc_tom_tat(ra, buoc, kb): 3 dòng Outro luôn có công thức / kết quả bên phải.
- chon_theme(kb): 1 trong 5 theme nền (deep_ocean | cosmic_indigo | emerald_studio | warm_slate | blueprint).
"""
import hashlib
import re

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
    canh = [c for c in canh_props if re.search(r"dap_an|ket_qua|chot", str(c.get("loai") or ""))]
    if not canh:
        return None
    c = canh[0]
    t0 = c["batDau"] / float(fps)
    t1 = t0 + c["soFrame"] / float(fps)
    dich = []
    for x in so_dap or []:
        try:
            dich.append(float(str(x).replace(".", "").replace(",", ".") if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", str(x)) else str(x).replace(",", ".")))
        except ValueError:
            pass
    tu = [w for w in tu_all if t0 - 0.05 <= w["bat"] < t1]
    for i in range(len(tu)):
        for n in (1, 2, 3, 4, 5, 6):
            cum = " ".join(w["w"] for w in tu[i:i + n])
            v = _gia_tri(re.sub(r"[^\w\s,./%À-ỹ]", "", cum), doi_so)
            if v is not None and any(abs(v - d) < 1e-6 * max(1, abs(d)) for d in dich):
                return round(tu[i]["bat"], 3)
    return round(t0 + c.get("leadFrame", 0) / float(fps), 3)


def khoa_dap_an(out, t_cb, so_dap=()):
    """Không thứ gì công bố đáp án hiện trước t_cb. Trả danh sách sửa (để in nhật ký / test)."""
    if t_cb is None or not out:
        return []
    sua = []
    lech_max = 0.0
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
                ra.append("giọng cảnh đáp án không đọc ra số %s (mốc công bố phải đoán = đầu cảnh)" % ", ".join(str(x) for x in list(so_dap)[:2]))
    return ra


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
            td_s = str(b["tieu_de"]).strip()
            d["chien_thuat"] = td_s if len(td_s) <= 24 else (td_s[:25].rsplit(" ", 1)[0].rstrip(" ,.;:·-") or td_s.split(" ", 1)[0])
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
