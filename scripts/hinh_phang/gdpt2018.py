"""KHÓA KHUNG CHƯƠNG TRÌNH GDPT 2018 cho hình học phẳng (Kết nối tri thức / Chân trời sáng tạo).

Mỗi quy tắc bắt ĐÚNG CỤM ĐỊNH LÝ / CỤM PHƯƠNG PHÁP (không chặn từ đơn sin/cos/tan của tỉ số lượng giác lớp 9) và luôn trả
kèm GỢI Ý cách chứng minh thay thế đúng chuẩn để AI sửa trúng ngay ở lượt retry.
  muc = "cung"     -> lỗi cứng HP_VUOT_CHUONG_TRINH (chặn kịch bản)
  muc = "canh_bao" -> quy tắc chưa chắc theo SGK (⚠), chỉ cảnh báo
Bản JS song song: kiemGdpt2018_ trong KiemTraHinh.gs (test_giai_hinh_phang.py so khớp hai bản trên cùng bộ câu mẫu).
"""
import re

CAP_LOP = ("lop_8", "lop_9", "thpt")
THCS = ("lop_8", "lop_9")

GOI_Y_NOI_TIEP = ("Chứng minh tứ giác nội tiếp theo GDPT 2018: (1) hai tam giác vuông chung cạnh huyền {xy} -> 4 điểm cách đều "
                  "trung điểm của {xy}, cùng thuộc đường tròn đường kính {xy}; hoặc (2) chỉ ra 4 đỉnh cách đều một điểm; hoặc "
                  "(3) tổng hai góc đối bằng 180°.")
GOI_Y_VECTO = ("Lớp 8/9 chưa học vectơ/tích vô hướng: chứng minh vuông góc bằng góc (góc nội tiếp chắn nửa đường tròn, tổng hai góc "
               "nhọn của tam giác vuông bằng 90°, tam giác đồng dạng có góc tương ứng 90°) hoặc định lý Pythagore đảo.")
GOI_Y_SIN_COS = ("Lớp 8/9 không dùng định lý sin/cosin: kẻ thêm đường cao để có tam giác vuông rồi dùng tỉ số lượng giác của góc nhọn "
                 "(lớp 9), hệ thức về cạnh và góc trong tam giác vuông, định lý Pythagore hoặc tam giác đồng dạng.")
GOI_Y_PHUONG_TICH = ("Không dùng phương tích: chứng minh đẳng thức tích MA·MB = MC·MD bằng hai tam giác đồng dạng (vd △MAC ∼ △MDB "
                     "theo trường hợp góc - góc nhờ góc nội tiếp cùng chắn một cung) rồi suy ra tỉ số.")
GOI_Y_LOP8 = ("Lớp 8 chưa học đường tròn và tỉ số lượng giác (lớp 9): dùng tam giác đồng dạng, định lý Thalès, tính chất đường phân "
              "giác, đường trung bình, định lý Pythagore, tính chất các tứ giác đặc biệt.")
GOI_Y_SO_PHUC = "Không dùng số phức ở mọi lớp: giải bằng hình học tổng hợp hoặc biến đổi đại số thực."

# (mã, mức theo cấp lớp, regex (không phân biệt hoa thường), nhóm tên phải viết HOA hoặc 0, tên người đọc, gợi ý)
QUY_TAC = [
    ("CUNG_CHUA_GOC", {"lop_8": "cung", "lop_9": "cung"},
     r"cung\s+ch[ứu]a\s+g[óo]c", 0, "cung chứa góc (chương trình 2006)", GOI_Y_NOI_TIEP),
    ("CUNG_NHIN_CANH", {"lop_8": "cung", "lop_9": "cung"},
     r"(?:c[ùu]ng\s+nh[ìi]n|nh[ìi]n)\s+(?:c[ạa]nh\s+|đo[ạa]n\s+(?:th[ẳa]ng\s+)?|d[âa]y\s+)?([A-Z]{2})\s+(?:d[ưu][ớo]i|theo)\s+(?:m[ộo]t\s+|hai\s+|c[áa]c\s+)?g[óo]c",
     1, "hai đỉnh cùng nhìn một cạnh dưới các góc bằng nhau (chương trình 2006)", GOI_Y_NOI_TIEP),
    ("HAI_DINH_KE", {"lop_8": "cung", "lop_9": "cung"},
     r"hai\s+đ[ỉi]nh\s+k[ềe]\s+(?:c[ùu]ng\s+)?nh[ìi]n", 0, "hai đỉnh kề cùng nhìn một cạnh (chương trình 2006)", GOI_Y_NOI_TIEP),
    ("VECTO", {"lop_8": "cung", "lop_9": "cung"},
     r"vect[ơo]\b|v[ée]c\s*t[ơo]\b|\\vec\s*\{|\\overrightarrow|t[íi]ch\s+v[ôo]\s+h[ưu][ớo]ng", 0, "vectơ / tích vô hướng", GOI_Y_VECTO),
    ("DINH_LY_SIN", {"lop_8": "cung", "lop_9": "cung"},
     r"đ[ịi]nh\s+l[ýíiy]\s+(?:h[àa]m\s+(?:s[ốo]\s+)?)?sin(?:e)?\b|\\frac\s*\{[^{}]*\}\s*\{\s*\\sin", 0, "định lý sin", GOI_Y_SIN_COS),
    ("DINH_LY_COS", {"lop_8": "cung", "lop_9": "cung"},
     r"đ[ịi]nh\s+l[ýíiy]\s+(?:h[àa]m\s+(?:s[ốo]\s+)?)?c[ôo]sin|đ[ịi]nh\s+l[ýíiy]\s+cos\b|-\s*2\s*(?:\\cdot\s*)?[A-Za-z]{1,2}\s*(?:\\cdot\s*)?[A-Za-z]{1,2}\s*(?:\\cdot\s*)?\\cos",
     0, "định lý cosin", GOI_Y_SIN_COS),
    ("PHUONG_TICH", {"lop_8": "cung", "lop_9": "cung", "thpt": "canh_bao"},
     r"ph[ưu][ơo]ng\s+t[íi]ch|tr[ụu]c\s+đ[ẳa]ng\s+ph[ưu][ơo]ng", 0, "phương tích / trục đẳng phương", GOI_Y_PHUONG_TICH),
    ("LOP8_DUONG_TRON", {"lop_8": "cung"},
     r"g[óo]c\s+n[ộo]i\s+ti[ếe]p|t[ứu]\s+gi[áa]c\s+n[ộo]i\s+ti[ếe]p|ti[ếe]p\s+tuy[ếe]n|g[óo]c\s+[ởo]\s+t[âa]m|\\(?:sin|cos|tan|cot)\b|t[ỉi]\s+s[ốo]\s+l[ưu][ợo]ng\s+gi[áa]c",
     0, "kiến thức đường tròn / tỉ số lượng giác của lớp 9", GOI_Y_LOP8),
    ("SO_PHUC", {"lop_8": "cung", "lop_9": "cung", "thpt": "cung"},
     r"s[ốo]\s+ph[ứu]c|\bi\s*\^\s*2\s*=\s*-\s*1", 0, "số phức", GOI_Y_SO_PHUC),
    # ---- ⚠ chưa chắc theo SGK -> cảnh báo ----
    ("TOA_DO", {"lop_8": "canh_bao", "lop_9": "canh_bao"},
     r"h[ệe]\s+tr[ụu]c\s+t[ọo]a\s+đ[ộo]|ph[ưu][ơo]ng\s+ph[áa]p\s+t[ọo]a\s+đ[ộo]|g[ắa]n\s+(?:h[ệe]\s+)?t[ọo]a\s+đ[ộo]", 0,
     "phương pháp tọa độ trong chứng minh hình", "Ưu tiên chứng minh tổng hợp (góc, tam giác đồng dạng, tính chất đường tròn)."),
    ("GOC_TIEP_TUYEN_DAY", {"lop_9": "canh_bao"},
     r"g[óo]c\s+t[ạa]o\s+b[ởo]i\s+(?:tia\s+)?ti[ếe]p\s+tuy[ếe]n\s+v[àa]\s+d[âa]y", 0, "góc tạo bởi tia tiếp tuyến và dây cung (⚠ cần đối chiếu SGK)",
     "Có thể thay bằng: bán kính vuông góc tiếp tuyến + góc nội tiếp chắn nửa đường tròn, hoặc tam giác cân tạo bởi hai bán kính."),
    ("GOC_DINH_TRONG_NGOAI", {"lop_9": "canh_bao"},
     r"g[óo]c\s+c[óo]\s+đ[ỉi]nh\s+(?:[ởo]\s+)?(?:b[êe]n\s+)?(?:trong|ngo[àa]i)\s+đ[ưu][ờo]ng\s+tr[òo]n", 0,
     "góc có đỉnh ở bên trong / bên ngoài đường tròn (⚠ cần đối chiếu SGK)",
     "Có thể thay bằng: góc ngoài tam giác bằng tổng hai góc trong không kề + góc nội tiếp."),
    ("GOC_NGOAI_TU_GIAC", {"lop_9": "canh_bao"},
     r"g[óo]c\s+ngo[àa]i\s+(?:t[ạa]i\s+(?:m[ộo]t\s+)?đ[ỉi]nh\s+)?b[ằa]ng\s+g[óo]c\s+trong\s+(?:c[ủu]a\s+)?(?:đ[ỉi]nh\s+)?đ[ốo]i", 0,
     "góc ngoài bằng góc trong đối (⚠ cần đối chiếu SGK)", "Thay bằng: tổng hai góc đối bằng 180° rồi dùng hai góc kề bù."),
]
_RE = [(ma, muc, re.compile(p, re.IGNORECASE), nhom, ten, goi_y) for ma, muc, p, nhom, ten, goi_y in QUY_TAC]
CO_SO_NOI_TIEP = re.compile(r"c[áa]ch\s+đ[ềe]u|c[ạa]nh\s+huy[ềe]n|đ[ưu][ờo]ng\s+k[íi]nh|180|b[ùu]\s+nhau|trung\s+đi[ểe]m|chung\s+c[ạa]nh", re.IGNORECASE)
RE_NOI_TIEP = re.compile(r"t[ứu]\s+gi[áa]c\s+([A-Z]{4})\s+n[ộo]i\s+ti[ếe]p|([A-Z]{4})\s+(?:l[àa]\s+)?(?:t[ứu]\s+gi[áa]c\s+)?n[ộo]i\s+ti[ếe]p", re.IGNORECASE)


def chuan_cap_lop(x, lop=None):
    s = str(x or "").strip().lower().replace(" ", "_")
    if s in CAP_LOP:
        return s
    m = re.search(r"\d+", s or str(lop or ""))
    n = int(m.group(0)) if m else 9
    return "lop_8" if n <= 8 else "lop_9" if n == 9 else "thpt"


def kiem_van_ban(van_ban, cap_lop, nguon=""):
    """Một đoạn chữ -> [{ma, muc, cum, nguon, ten, goi_y}]."""
    kq = []
    s = str(van_ban or "")
    for ma, muc_lop, rx, nhom, ten, goi_y in _RE:
        muc = muc_lop.get(cap_lop)
        if not muc:
            continue
        for m in rx.finditer(s):
            if nhom and not m.group(nhom).isupper():
                continue
            xy = m.group(nhom) if nhom else ""
            if not xy:
                mm = re.search(r"\b([A-Z]{2})\b", s[max(0, m.start() - 40):m.end() + 40])
                xy = mm.group(1) if mm else "XY"
            kq.append({"ma": ma, "muc": muc, "cum": m.group(0)[:60], "nguon": nguon, "ten": ten, "goi_y": goi_y.replace("{xy}", xy)})
            break
    return kq


def van_ban_kich_ban(kb):
    """Mọi chữ AI viết có thể chứa phương pháp: hinh_phang_chuan (tex, khi_noi, tiêu đề) + lời thoại / kiến thức / màn hình."""
    ds = []
    hp = kb.get("hinh_phang_chuan") if isinstance(kb.get("hinh_phang_chuan"), dict) else {}
    for ti, t in enumerate(hp.get("trang_chung_minh") or []):
        if not isinstance(t, dict):
            continue
        ds.append(("trang %d tiêu đề" % (ti + 1), str(t.get("tieu_de") or "")))
        for di, d in enumerate(t.get("dong") or []):
            if isinstance(d, dict):
                ds.append(("trang %d dòng %d" % (ti + 1, di + 1), " ".join(str(d.get(k) or "") for k in ("tex", "khi_noi", "ly_do"))))
    for i, c in enumerate(kb.get("canh") or []):
        if not isinstance(c, dict):
            continue
        ds.append(("cảnh %s lời thoại" % c.get("so", i + 1), str(c.get("loi_thoai") or "")))
        ds.append(("cảnh %s kiến thức" % c.get("so", i + 1), str(c.get("kien_thuc") or "")))
        ds.append(("cảnh %s màn hình" % c.get("so", i + 1), " ".join(str(x) for x in (c.get("noi_dung_man_hinh") or []))))
    return ds


def kiem_gdpt(kb, cap_lop=None):
    """-> (lỗi cứng, cảnh báo). Mỗi mục có gợi ý cách chứng minh thay thế."""
    hp = kb.get("hinh_phang_chuan") if isinstance(kb.get("hinh_phang_chuan"), dict) else {}
    cap = chuan_cap_lop(cap_lop or hp.get("cap_lop"), kb.get("lop"))
    cung, cb, da = [], [], set()
    for nguon, s in van_ban_kich_ban(kb):
        for x in kiem_van_ban(s, cap, nguon):
            k = (x["ma"], x["nguon"])
            if k in da:
                continue
            da.add(k)
            (cung if x["muc"] == "cung" else cb).append(x)
    # G08 (cảnh báo): khẳng định tứ giác nội tiếp mà trang đó không nêu căn cứ chuẩn 2018
    if cap in THCS:
        for ti, t in enumerate(hp.get("trang_chung_minh") or []):
            if not isinstance(t, dict):
                continue
            chu = " ".join(" ".join(str(d.get(k) or "") for k in ("tex", "khi_noi", "ly_do")) for d in t.get("dong") or [] if isinstance(d, dict))
            chu_all = re.sub(r"\\text\s*\{([^{}]*)\}", r" \1 ", str(t.get("tieu_de") or "") + " " + chu)
            chu_all = re.sub(r"\\m(?:vang|do|ngoc|cam|la)\s*\{([^{}]*)\}", r" \1 ", chu_all)
            chu_all = re.sub(r"\s+", " ", chu_all)
            m = RE_NOI_TIEP.search(chu_all)
            if m and not CO_SO_NOI_TIEP.search(chu_all):
                cb.append({"ma": "NOI_TIEP_THIEU_CAN_CU", "muc": "canh_bao", "cum": m.group(0)[:60], "nguon": "trang %d" % (ti + 1),
                           "ten": "tứ giác nội tiếp chưa nêu căn cứ", "goi_y": GOI_Y_NOI_TIEP.replace("{xy}", "XY")})
    return cung, cb


def thong_diep(x):
    return "[HP_VUOT_CHUONG_TRINH] %s: dùng '%s' (%s). Sửa: %s" % (x["nguon"], x["cum"], x["ten"], x["goi_y"])
