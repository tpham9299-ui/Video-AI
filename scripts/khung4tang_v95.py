#!/usr/bin/env python3
"""v95 — bổ trợ khung 4 tầng (thuần Python, không gọi mạng, test được riêng: scripts/test_v95.py).

- GOI_Y_PHA: cụm lời gợi ý theo tên pha của khuôn 3D -> hành động 3D trùng lời đọc khi AI không ghi khi_noi.
- sap_the_logic(): sắp thẻ trong một bước theo trình tự toán học hiển nhiên (đặt ẩn -> hàm -> đạo hàm -> nghiệm ->
  xét dấu -> kết luận), giữ nguyên thứ tự các thẻ không phân loại được.
- khu_trung_ranh_gioi(): bỏ dòng công thức lặp y hệt ở ranh giới hai bước (thẻ cuối bước trước = thẻ đầu bước sau).
- cta_tu_loi(): nhãn nút CTA gọn 2-4 từ khớp NGỮ NGHĨA lời đọc (đăng ký / lưu / bình luận / chia sẻ / theo dõi).
- moc_giai_doi_chieu(): mốc giọng đọc ra nghiệm (t_giai) và chốt giá trị tối ưu (t_chot) cho đồ thị đối chiếu.
- kieu_badge(): 'nguong' (đề có điều kiện thật) | 'cuc_dai' | 'cuc_tieu'.
- de_ghim_doi(): ô ghim đề có '?' (V_max = ?) -> đổi sang giá trị đáp án đúng mốc chốt.
- tieu_de_intro_dung(): sửa tiêu đề intro sai bản chất (bài hộp "cắt góc nào" -> "cắt cạnh bao nhiêu").
- bu_tom_tat(): luôn đủ 3 dòng tóm tắt (bù từ bước / công thức / đáp số).
"""
import json
import re

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
    return re.sub(r"\\[,;:! ]|\\left|\\right|\s+|\{,\}", "", str(x)).replace("\\dfrac", "\\frac")


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
    return ra


def dong_khai_bao(ds_the):
    """Tập dòng công thức AI đã khai báo cho từng bước (để thẻ lấp chỗ của bước này không 'mượn' thẻ của bước khác)."""
    return [{d for th in ds for d in _dong_the(th)} for ds in ds_the]


def phan_dap_an(dap_an):
    """'x = 2 cm, V lớn nhất = 144 cm³' -> {'x': ('2', 'cm'), 'V': ('144', 'cm³')} (chữ cái đầu của vế trái)."""
    ra = {}
    for phan in re.split(r",(?!\d)|;|\bvà\b|\bhoặc\b", str(dap_an or "")):   # v96: "≈ 0,1667" không bị chẻ ở dấu phẩy thập phân
        m = re.search(r"([A-Za-z])[^=≈]*[=≈]\s*(-?\d+(?:[.,]\d+)?)\s*([a-zA-Zµ]*[²³]?(?:\^\{?[23]\}?)?)", phan)
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
