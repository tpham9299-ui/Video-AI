#!/usr/bin/env python3
"""
manim_hinh.py - DỰNG VIDEO HÌNH HỌC 100% BẰNG MANIM (theo phong cách các video hình học mẫu).

Cách dùng (sau scripts/chuanbi.py, đã có public/props.json + giọng đọc):
    python manim_hinh.py public/props.json kich_ban.json out/ [--public public]
Ra: out/<ID>.mp4 (video + giọng + nhạc), out/<ID>_bia.jpg (ảnh bìa, đồng thời là khung hình đầu).

Phong cách (bám video mẫu):
- nền #111, tiêu đề vàng chữ có chân ở trên cùng, hình ở nửa trên, công thức ở dưới;
- MỖI ĐẠI LƯỢNG MỘT MÀU: đoạn thẳng / góc / tam giác / mặt phẳng được nhắc tới mang màu riêng, và trong công thức
  đúng đại lượng đó cũng được tô cùng màu (nhìn công thức là biết nó nằm ở đâu trên hình);
- vẽ dần (Create) cạnh, điểm, nhãn theo thứ tự đề bài; đường kẻ thêm nét đứt;
- MỖI BƯỚC CHỈ LÀM NỔI phần đang xét: cạnh/góc/tam giác được nhắc trong bước sáng và dày lên, phần còn lại mờ đi;
  mỗi dòng công thức hiện ra thì các cạnh trong dòng đó lóe sáng chạy dọc theo cạnh;
- công thức biến đổi từng bước (TransformMatchingShapes), dòng cũ mờ đi; \\hl{...} trong công thức = khung vàng quanh
  phần đang xét; dòng kết luận đóng khung vàng;
- tam giác được so sánh (\\triangle ABC \\sim / = \\triangle DEF) được tách ra đặt cạnh nhau, tô màu;
- thời lượng mỗi bước = đúng thời lượng giọng đọc của cảnh (props.json), dòng công thức hiện theo từng câu nói.
Biến môi trường: MANIM_GIONG=0 -> chỉ nhạc (như video mẫu), mặc định có giọng đọc + nhạc nền nhỏ.
                 MANIM_CHAT_LUONG=thap -> 540x960 (chạy thử nhanh).
"""
import json
import math
import os
import re
import shutil
import subprocess
import sys

import numpy as np
from manim import (DOWN, LEFT, ORIGIN, RIGHT, UP, Arc, Circle, Circumscribe, Create, DashedLine, Dot, FadeIn, FadeOut,
                   Flash, GrowFromCenter, Line, MathTex, Polygon, Scene, ShowPassingFlash, SurroundingRectangle, TexTemplate,
                   Text, TransformMatchingShapes, VGroup, VMobject, Write, config, tempconfig)

NEN = "#111111"
VANG = "#FFD43B"
TRANG = "#E8E8E8"
XAM = "#9AA0A6"
NET_DUT = "#FFE066"
TRON = "#74C0FC"
BANG_MAU = ["#FF6B6B", "#4ECDC4", "#FFA94D", "#B197FC", "#69DB7C", "#74C0FC", "#F783AC", "#E599F7", "#63E6BE", "#FF8787"]
MAU_MIEN = ["#4ECDC4", "#FFA94D", "#B197FC", "#69DB7C", "#F783AC", "#74C0FC"]
PHONG = "Noto Serif"

TEX = TexTemplate(
    tex_compiler="xelatex", output_format=".xdv",
    preamble=r"\usepackage{amsmath}\usepackage{amssymb}\usepackage{xcolor}\usepackage{fontspec}\setmainfont{Noto Serif}"
             r"\newcommand{\hl}[1]{\fcolorbox[HTML]{FFD43B}{111111}{$\displaystyle #1$}}"
             r"\newcommand{\dpcm}{\text{(đpcm)}}")

# ---------- BỐ CỤC (khung 9 x 16 đơn vị, dọc 1080x1920) ----------
W, H = 9.0, 16.0
Y_TIEU_DE = 7.25
Y_BUOC = 6.35
HINH_TREN, HINH_DUOI, HINH_RONG = 5.8, -1.3, 8.4
CT_TREN, CT_DUOI, CT_RONG = -1.75, -7.2, 8.4
CO_CT = 54

# ---------- NHẬN DIỆN ĐẠI LƯỢNG trong chữ / công thức ----------
CHU_VIET = "A-Za-zÀ-ỹđĐ"
TEN_DIEM = r"[A-Z](?:'|_\{?\d\}?)?"
RE_GOC = re.compile(r"(?:\\angle|\\widehat\{|(?i:góc)\s+)\s*(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")\}?")
RE_TAM_GIAC = re.compile(r"(?:\\triangle|\\Delta|(?i:tam giác))\s*(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")(?![A-Za-z])")
RE_MAT = re.compile(r"(?:mp\s*|(?i:mặt phẳng)\s*)?\((" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")?\)")
RE_DOAN = re.compile(r"(?<![" + CHU_VIET + r"\\'_])(" + TEN_DIEM + r")(" + TEN_DIEM + r")(?![" + CHU_VIET + r"'])")
RE_DIEM_DON = re.compile(r"(?<![" + CHU_VIET + r"\\'_])([A-Z](?:'|_\{?\d\}?)?)(?![" + CHU_VIET + r"'_])")


def ten_chuan(t):
    return re.sub(r"_\{?(\d)\}?", r"_\1", t)


def khoa_doan(a, b):
    a, b = ten_chuan(a), ten_chuan(b)
    return tuple(sorted((a, b)))


def khoa_goc(a, o, b):
    a, o, b = ten_chuan(a), ten_chuan(o), ten_chuan(b)
    return (min(a, b), o, max(a, b))


def khoa_da_giac(ds):
    ds = [ten_chuan(x) for x in ds]
    return tuple(sorted(ds))


def tex_ten(t):
    """Tên điểm -> TeX (A' / H_1)."""
    return t.replace("_", "_{") + "}" if "_" in t else t


def la_dap_an(c):
    return bool(re.search(r"dap_an|ket_qua|ket_luan", str(c.get("loai") or "").lower()))


# ============================================================
# 1) ĐỌC KỊCH BẢN -> MỘT HÌNH XUYÊN SUỐT + DIỄN BIẾN TỪNG CẢNH
# ============================================================
class MoHinh:
    def __init__(self, props, kb):
        self.props = props
        self.fps = props.get("fps", 30)
        self.canh_p = props["canh"]
        kb_canh = kb.get("canh") or []
        self.canh_k = [kb_canh[i] if i < len(kb_canh) else {} for i in range(len(self.canh_p))]
        self.de_bai = str(kb.get("de_bai") or "")
        self.diem = {}
        self.pt = []   # phần tử: dict(kieu, khoa, canh, ...)
        self.chi_so = {}
        self._doc_hinh()
        self._doc_nhac_toi()
        self.mau = {}
        self._gan_mau()

    # ---- hình hinh_hoc trong cảnh i ----
    def vat_hinh(self, i):
        mh = self.canh_p[i].get("minhHoa") or {}
        du = mh.get("duLieu") or {}
        for v in (du.get("vat") or []) if isinstance(du, dict) else []:
            if isinstance(v, dict) and v.get("loai") == "hinh_hoc" and isinstance(v.get("diem"), dict):
                return v
        return None

    def them(self, kieu, khoa, i, **kw):
        k = (kieu, khoa)
        if k in self.chi_so:
            p = self.pt[self.chi_so[k]]
            for a, b in kw.items():
                if a == "kieu_net" and b == "khuat":
                    p[a] = b
                elif a not in p or p[a] in ("", None):
                    p[a] = b
            return p
        p = dict(kieu=kieu, khoa=khoa, canh=i, **kw)
        self.chi_so[k] = len(self.pt)
        self.pt.append(p)
        return p

    def _doc_hinh(self):
        for i in range(len(self.canh_p)):
            v = self.vat_hinh(i)
            if not v:
                continue
            for k, p in v["diem"].items():
                if isinstance(p, (list, tuple)) and len(p) >= 2:
                    try:
                        self.diem[ten_chuan(k)] = (float(p[0]), float(p[1]))
                    except (TypeError, ValueError):
                        pass
        co = lambda *ds: all(ten_chuan(x) in self.diem for x in ds)
        for i in range(len(self.canh_p)):
            v = self.vat_hinh(i)
            if not v:
                continue
            for c in v.get("to") or []:
                if isinstance(c, list) and len(c) >= 3 and co(*c):
                    self.them("mien", khoa_da_giac(c), i, dinh=[ten_chuan(x) for x in c])
            for ds, kn in ((v.get("canh"), "canh"), (v.get("khuat"), "khuat"), (v.get("phu"), "phu")):
                for c in ds or []:
                    if isinstance(c, list) and len(c) >= 2 and co(c[0], c[1]) and ten_chuan(c[0]) != ten_chuan(c[1]):
                        nhan = str(c[2]).strip() if kn == "canh" and len(c) > 2 and c[2] not in (None, "") else ""
                        self.them("doan", khoa_doan(c[0], c[1]), i, kieu_net=kn, nhan=nhan)
            for c in v.get("tron") or []:
                if isinstance(c, list) and len(c) in (2, 3) and co(*c):
                    self.them("tron", tuple(ten_chuan(x) for x in c), i)
            for c in v.get("vuong") or []:
                if isinstance(c, list) and len(c) >= 3 and co(*c[:3]):
                    self.them("vuong", self.kgoc(*c[:3]), i, ba=[ten_chuan(x) for x in c[:3]])
            for c in v.get("goc") or []:
                if isinstance(c, list) and len(c) >= 3 and co(*c[:3]):
                    self.them("goc", self.kgoc(*c[:3]), i, ba=[ten_chuan(x) for x in c[:3]], nhan=str(c[3]) if len(c) > 3 and c[3] else "")
            for c in v.get("bang") or []:
                if isinstance(c, list) and len(c) >= 2 and co(c[0], c[1]):
                    try:
                        n = max(1, min(3, int(c[2]))) if len(c) > 2 else 1
                    except (TypeError, ValueError):
                        n = 1
                    self.them("bang", khoa_doan(c[0], c[1]), i, so=n)

    # ---- chữ của cảnh i: công thức (TeX gốc từ kịch bản), lời thoại, tiêu đề cảnh, nhấn mạnh do kịch bản chỉ định ----
    def cong_thuc(self, i):
        ds = self.canh_k[i].get("noi_dung_man_hinh")
        if not isinstance(ds, list) or not ds:
            ds = self.canh_p[i].get("noiDung") or []
        return [str(x).strip() for x in ds if str(x).strip()][:6]

    def chu_canh(self, i):
        c = self.canh_k[i]
        nm = c.get("nhan_manh_hinh") or []
        return " ; ".join([str(c.get("loi_thoai") or ""), str(c.get("tieu_de_canh") or "")] + self.cong_thuc(i) +
                          [str(x) for x in (nm if isinstance(nm, list) else [nm])])

    def nhac_toi(self, chu):
        """Các đại lượng được nhắc tới trong một đoạn chữ / công thức."""
        co = lambda *ds: all(ten_chuan(x) in self.diem for x in ds)
        kq = {"goc": [], "tam_giac": [], "mat": [], "doan": [], "diem": [], "tron": False}
        chu = re.sub(r"\\(?:text|mathrm)\{", " {", chu)
        bo = []
        for m in RE_GOC.finditer(chu):
            if co(*m.groups()):
                kq["goc"].append(self.kgoc(*m.groups()))
                bo.append(m.span())
        for m in RE_TAM_GIAC.finditer(chu):
            if co(*m.groups()):
                kq["tam_giac"].append(tuple(ten_chuan(x) for x in m.groups()))
                bo.append(m.span())
        for m in RE_MAT.finditer(chu):
            g = [x for x in m.groups() if x]
            if co(*g):
                kq["mat"].append(tuple(ten_chuan(x) for x in g))
                bo.append(m.span())
        sach = list(chu)
        for a, b in bo:
            for j in range(a, b):
                sach[j] = " "
        sach = "".join(sach)
        for m in RE_DOAN.finditer(sach):
            a, b = m.groups()
            if co(a, b) and ten_chuan(a) != ten_chuan(b):
                kq["doan"].append(khoa_doan(a, b))
        for m in RE_DIEM_DON.finditer(re.sub(RE_DOAN, " ", sach)):
            if co(m.group(1)):
                kq["diem"].append(ten_chuan(m.group(1)))
        if re.search(r"(?i:đường tròn)|\\odot|nội tiếp|ngoại tiếp", chu):
            kq["tron"] = True
        for k in ("goc", "tam_giac", "mat", "doan", "diem"):
            kq[k] = list(dict.fromkeys(kq[k]))
        return kq

    def _doc_nhac_toi(self):
        self.nhac = [self.nhac_toi(self.chu_canh(i)) for i in range(len(self.canh_p))]
        # đoạn thẳng được nhắc tới nhưng chưa có trên hình (vd đường cao AH) -> kẻ thêm nét đứt từ cảnh đó
        for i, nt in enumerate(self.nhac):
            for d in nt["doan"]:
                if ("doan", d) not in self.chi_so:
                    # nằm trên một cạnh có sẵn (vd MB là một nửa BC) -> đoạn con, chỉ hiện khi được tô màu; còn lại kẻ thêm nét đứt
                    self.them("doan", d, i, kieu_net="con" if self.nam_tren_canh(d) else "phu", nhan="")
        # điểm xuất hiện khi phần tử đầu tiên chứa nó xuất hiện, hoặc khi được nhắc tên
        self.diem_canh = {}
        for p in self.pt:
            for x in self.dinh_cua(p):
                self.diem_canh[x] = min(self.diem_canh.get(x, 99), p["canh"])
        for i, nt in enumerate(self.nhac):
            for x in nt["diem"]:
                self.diem_canh[x] = min(self.diem_canh.get(x, 99), i)

    def kgoc(self, a, o, b):
        """Khóa của một góc theo HÌNH (đỉnh + hướng hai tia): \\angle EAB và \\angle CAF (E thuộc AC, F thuộc AB)
        là cùng một góc -> cùng màu, cùng cung."""
        a, o, b = ten_chuan(a), ten_chuan(o), ten_chuan(b)
        if not hasattr(self, "goc_ba"):
            self.goc_ba = {}
        if not all(x in self.diem for x in (a, o, b)):
            return khoa_goc(a, o, b)
        P = lambda n: np.array([self.diem[n][0] * 8.8, -self.diem[n][1] * 6.0])
        huong = lambda n: int(round(math.degrees(math.atan2(*(P(n) - P(o))[::-1])) / 3.0)) % 120
        k = (o,) + tuple(sorted((huong(a), huong(b))))
        self.goc_ba.setdefault(k, [a, o, b])
        return k

    def nam_tren_canh(self, d):
        a, b = (np.array(self.diem[x]) for x in d)
        for p in self.pt:
            if p["kieu"] != "doan" or p.get("kieu_net") == "con":
                continue
            u, v = (np.array(self.diem[x]) for x in p["khoa"])
            dai = np.linalg.norm(v - u)
            if dai < 1e-6:
                continue

            def tren(q):
                t = np.dot(q - u, v - u) / dai ** 2
                w_, z_ = v - u, q - u
                kc = abs(w_[0] * z_[1] - w_[1] * z_[0]) / dai
                return -0.01 <= t <= 1.01 and kc < 0.012 * dai + 0.15
            if tren(a) and tren(b):
                return True
        return False

    def dinh_cua(self, p):
        k = p["khoa"]
        if p["kieu"] in ("doan", "bang"):
            return list(k)
        if p["kieu"] in ("vuong", "goc"):
            return p["ba"]
        if p["kieu"] == "mien":
            return p["dinh"]
        if p["kieu"] == "tron":
            return list(k)
        return []

    def _gan_mau(self):
        """Mỗi đại lượng được nhắc tới (theo thứ tự xuất hiện) một màu riêng, giữ nguyên suốt video."""
        j = 0
        jm = 0
        for i, nt in enumerate(self.nhac):
            for d in nt["doan"]:
                if ("doan", d) not in self.mau:
                    self.mau[("doan", d)] = BANG_MAU[j % len(BANG_MAU)]
                    j += 1
            for g in nt["goc"]:
                if ("goc", g) not in self.mau:
                    self.mau[("goc", g)] = BANG_MAU[(j + 3) % len(BANG_MAU)]
                    j += 1
            for t in nt["tam_giac"] + nt["mat"]:
                k = ("mien", khoa_da_giac(t))
                if k not in self.mau:
                    self.mau[k] = MAU_MIEN[jm % len(MAU_MIEN)]
                    jm += 1

    # ---- tô màu công thức: đại lượng nào mang đúng màu của nó trên hình ----
    def to_mau_tex(self, s):
        def mau_cua(k):
            return self.mau.get(k)

        def thay_goc(m):
            if not all(ten_chuan(x) in self.diem for x in m.groups()):
                return m.group(0)
            c = mau_cua(("goc", self.kgoc(*m.groups())))
            return r"\textcolor[HTML]{%s}{%s}" % (c[1:], m.group(0)) if c else m.group(0)

        def thay_mien(m):
            g = [x for x in m.groups() if x]
            c = mau_cua(("mien", khoa_da_giac(g)))
            return r"\textcolor[HTML]{%s}{%s}" % (c[1:], m.group(0)) if c else m.group(0)

        # thay theo từng đoạn để không tô lồng nhau
        phan = re.split(r"(\\textcolor\[HTML\]\{[0-9A-Fa-f]{6}\}\{[^{}]*\})", s)
        out = []
        for ph in phan:
            if ph.startswith(r"\textcolor"):
                out.append(ph)
                continue
            ph = RE_GOC.sub(thay_goc, ph) if "\\angle" in ph or "\\widehat" in ph else ph
            ph = RE_TAM_GIAC.sub(thay_mien, ph)
            ph = re.sub(r"\((" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")?\)", thay_mien, ph)
            out.append(ph)
        s = "".join(out)
        phan = re.split(r"(\\textcolor\[HTML\]\{[0-9A-Fa-f]{6}\}\{(?:[^{}]|\{[^{}]*\})*\})", s)
        out = []
        for ph in phan:
            if ph.startswith(r"\textcolor"):
                out.append(ph)
                continue

            def thay_doan(m):
                a, b = m.groups()
                c = mau_cua(("doan", khoa_doan(a, b)))
                return r"\textcolor[HTML]{%s}{%s}" % (c[1:], m.group(0)) if c else m.group(0)
            out.append(RE_DOAN.sub(thay_doan, ph))
        return "".join(out)


# ============================================================
# 2) CHUẨN HÓA TeX (ký tự Unicode trong công thức, chữ Việt ngoài \text) + PHƯƠNG ÁN DỰ PHÒNG
# ============================================================
THAY_UNICODE = {"≈": r"\approx ", "⊥": r"\perp ", "∠": r"\angle ", "·": r"\cdot ", "×": r"\times ", "°": r"^\circ ",
                "≤": r"\le ", "≥": r"\ge ", "≠": r"\ne ", "∈": r"\in ", "∥": r"\parallel ", "//": r"\parallel ",
                "△": r"\triangle ", "Δ": r"\Delta ", "π": r"\pi ", "α": r"\alpha ", "β": r"\beta ", "γ": r"\gamma ",
                "⇒": r"\Rightarrow ", "⇔": r"\Leftrightarrow ", "→": r"\to ", "∽": r"\sim ", "∼": r"\sim ", "√": r"\sqrt ",
                "−": "-", "∞": r"\infty ", "∩": r"\cap ", "∪": r"\cup ", "■": r"\blacksquare ", "✓": r"\checkmark ",
                "…": r"\ldots "}


def chuan_tex(s):
    s = str(s)
    for a, b in THAY_UNICODE.items():
        s = s.replace(a, b)
    s = s.replace(r"\tfrac", r"\frac").replace(r"\dfrac", r"\frac")
    s = s.replace("{,}", "{,}")
    # chữ Việt nằm ngoài \text{...} -> bọc vào \text{} (AI hay viết "ME = MB (vì cùng bằng nửa BC)")
    ra, i = [], 0
    while i < len(s):
        m = re.match(r"\\(?:text|mathrm|textbf|textit)\{", s[i:])
        if m:
            sau = s[i + m.end():]
            sau_dong, sau_mo = 1, 0
            for j, ch in enumerate(sau):
                if ch == "{":
                    sau_dong += 1
                elif ch == "}":
                    sau_dong -= 1
                    if sau_dong == 0:
                        sau_mo = j
                        break
            else:
                sau_mo = len(sau)
            ra.append(s[i:i + m.end() + sau_mo + 1])
            i += m.end() + sau_mo + 1
            continue
        m = re.match(r"(?:[A-Za-zÀ-ỹđĐ]*[À-ỹđĐ][A-Za-zÀ-ỹđĐ]*)(?:[ ,]+[a-zà-ỹđ]+)*", s[i:])
        if m and m.group(0) and (i == 0 or s[i - 1] != "\\"):
            ra.append(r"\text{%s}" % m.group(0))
            i += m.end()
            continue
        m = re.match(r"\b(vì|do|nên|và|là|có|ta|suy ra|hay|cùng|tại|với|tương tự|mà|thì|của)\b", s[i:])
        if m and (i == 0 or not re.match(r"[A-Za-z\\]", s[i - 1])):
            ra.append(r"\text{%s}" % m.group(0))
            i += m.end()
            continue
        ra.append(s[i])
        i += 1
    s = "".join(ra)
    s = re.sub(r"\\text\{([^{}]*)\}\s*\\text\{([^{}]*)\}", r"\\text{\1 \2}", s)
    return s


def bo_tex(s):
    """TeX -> chữ thường (dùng khi TeX hỏng)."""
    t = str(s)
    for a, b in ((r"\perp", "⊥"), (r"\angle", "∠"), (r"\triangle", "△"), (r"\approx", "≈"), (r"\cdot", "·"), (r"\times", "×"),
                 (r"\Rightarrow", "⇒"), (r"\parallel", "∥"), (r"\sim", "∽"), (r"\blacksquare", "■"), (r"\circ", "°"),
                 (r"\le", "≤"), (r"\ge", "≥"), (r"\ne", "≠"), (r"\in", "∈"), (r"\pi", "π"), (r"\alpha", "α"), (r"\beta", "β"),
                 (r"\dpcm", "(đpcm)"), (r"\checkmark", "✓"), (r"\,", " "), (r"\;", " "), (r"\quad", "  ")):
        t = t.replace(a, b)
    t = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"(\1)/(\2)", t)
    t = re.sub(r"\\sqrt\{([^{}]*)\}", r"√(\1)", t)
    t = re.sub(r"\\textcolor\[HTML\]\{[0-9A-Fa-f]{6}\}", "", t)
    t = re.sub(r"\\[a-zA-Z]+", "", t)
    t = t.replace("^", "").replace("_", "").replace("{", "").replace("}", "")
    return re.sub(r"\s+", " ", t).strip()


def tao_cong_thuc(tex, co=40):
    try:
        return MathTex(tex, tex_template=TEX, font_size=co)
    except Exception as e:  # noqa: BLE001
        print("  TeX lỗi (%s) -> dùng chữ thường: %s" % (str(e)[:80], tex[:80]))
        try:
            return MathTex(chuan_tex(bo_tex(tex)), tex_template=TEX, font_size=co)
        except Exception:  # noqa: BLE001
            return Text(bo_tex(tex), font=PHONG, font_size=co * 0.8, color=TRANG)


def khoi_chu(chu, co, rong, cao, mau=TRANG):
    """Đoạn chữ tiếng Việt tự xuống dòng, vừa khung rộng x cao."""
    tu = chu.split()
    mau_do = Text(chu[:60], font=PHONG, font_size=co)
    so_ky_tu = max(12, int(rong * 0.97 / (mau_do.width / max(1, len(chu[:60])))))
    dong, hien = [], ""
    for w in tu:
        if hien and len(hien) + 1 + len(w) > so_ky_tu:
            dong.append(hien)
            hien = w
        else:
            hien = (hien + " " + w).strip()
    if hien:
        dong.append(hien)
    t = VGroup(*[Text(d, font=PHONG, font_size=co, color=mau) for d in dong[:9]]).arrange(DOWN, buff=co * 0.006)
    if t.width > rong:
        t.scale_to_fit_width(rong)
    if t.height > cao:
        t.scale_to_fit_height(cao)
    return t


def vua_rong(m, rong):
    if m.width > rong:
        m.scale_to_fit_width(rong)
    return m


# ============================================================
# 3) CẢNH MANIM
# ============================================================
class VideoHinh(Scene):
    mo = None          # MoHinh
    bia = False        # True: chỉ dựng ảnh bìa

    def setup(self):
        self.camera.background_color = NEN

    # ---------- tọa độ ----------
    def chuan_bi_toa_do(self):
        mo = self.mo
        ds = [(x * 8.8, -y * 6.0) for (x, y) in mo.diem.values()]
        xs = [p[0] for p in ds]
        ys = [p[1] for p in ds]
        for p in mo.pt:
            if p["kieu"] == "tron":
                c, r = self.tam_ban_kinh_tho(p["khoa"])
                if c is not None:
                    xs += [c[0] - r, c[0] + r]
                    ys += [c[1] - r, c[1] + r]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        k = min(HINH_RONG * 0.86 / max(1e-6, x1 - x0), (HINH_TREN - HINH_DUOI) * 0.82 / max(1e-6, y1 - y0))
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        ty = (HINH_TREN + HINH_DUOI) / 2
        self.P = {n: np.array([(x * 8.8 - cx) * k, (-y * 6.0 - cy) * k + ty, 0.0]) for n, (x, y) in mo.diem.items()}
        self.ti_le = k
        self.tam = np.mean(list(self.P.values()), axis=0)

    def tam_ban_kinh_tho(self, khoa):
        mo = self.mo
        q = lambda n: np.array([mo.diem[n][0] * 8.8, -mo.diem[n][1] * 6.0])
        if len(khoa) == 2:
            return q(khoa[0]), float(np.linalg.norm(q(khoa[1]) - q(khoa[0])))
        a, b, c = (q(n) for n in khoa)
        d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]))
        if abs(d) < 1e-9:
            return None, 0
        ux = ((a @ a) * (b[1] - c[1]) + (b @ b) * (c[1] - a[1]) + (c @ c) * (a[1] - b[1])) / d
        uy = ((a @ a) * (c[0] - b[0]) + (b @ b) * (a[0] - c[0]) + (c @ c) * (b[0] - a[0])) / d
        o = np.array([ux, uy])
        return o, float(np.linalg.norm(a - o))

    def tam_ban_kinh(self, khoa):
        if len(khoa) == 2:
            return self.P[khoa[0]], float(np.linalg.norm(self.P[khoa[1]] - self.P[khoa[0]]))
        a, b, c = (self.P[n][:2] for n in khoa)
        d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]))
        if abs(d) < 1e-9:
            return None, 0
        ux = ((a @ a) * (b[1] - c[1]) + (b @ b) * (c[1] - a[1]) + (c @ c) * (a[1] - b[1])) / d
        uy = ((a @ a) * (c[0] - b[0]) + (b @ b) * (a[0] - c[0]) + (c @ c) * (b[0] - a[0])) / d
        o = np.array([ux, uy, 0.0])
        return o, float(np.linalg.norm(self.P[khoa[0]] - o))

    # ---------- dựng từng phần tử ----------
    def huong_nhan(self, n):
        """Hướng đặt nhãn điểm: ngược với các cạnh nối vào điểm (chỗ trống nhất)."""
        p = self.P[n]
        v = np.zeros(3)
        for q in self.mo.pt:
            if q["kieu"] == "doan" and n in q["khoa"]:
                m = q["khoa"][1] if q["khoa"][0] == n else q["khoa"][0]
                d = self.P[m] - p
                if np.linalg.norm(d) > 1e-6:
                    v -= d / np.linalg.norm(d)
        if np.linalg.norm(v) < 0.3:
            v = p - self.tam
        if np.linalg.norm(v) < 1e-6:
            v = UP
        return v / np.linalg.norm(v)

    def dung_phan_tu(self):
        mo = self.mo
        self.hinh = {}       # (kieu, khoa) -> mobject
        self.nhan_diem = {}
        self.cham = {}
        for p in mo.pt:
            k = (p["kieu"], p["khoa"])
            m = None
            if p["kieu"] == "doan":
                a, b = (self.P[x] for x in p["khoa"])
                if p["kieu_net"] in ("khuat", "phu"):
                    m = DashedLine(a, b, dash_length=0.12, dashed_ratio=0.55, stroke_width=3.2,
                                   color=NET_DUT if p["kieu_net"] == "phu" else XAM)
                else:
                    m = Line(a, b, stroke_width=4, color=TRANG)
                    if p["kieu_net"] == "con":
                        m.set_stroke(opacity=0)
                if p.get("nhan"):
                    huong = np.cross(b - a, [0, 0, 1])
                    huong = huong / max(1e-6, np.linalg.norm(huong))
                    if np.dot((a + b) / 2 + huong - self.tam, huong) < np.dot((a + b) / 2 - self.tam, huong):
                        huong = -huong
                    t = tao_cong_thuc(chuan_tex(p["nhan"]), 30).move_to((a + b) / 2 + huong * 0.32)
                    m = VGroup(m, t)
                    m.la_co_nhan = True
            elif p["kieu"] == "tron":
                o, r = self.tam_ban_kinh(p["khoa"])
                if o is None:
                    continue
                m = Circle(radius=r, color=TRON, stroke_width=3).move_to(o)
            elif p["kieu"] == "mien":
                m = Polygon(*[self.P[x] for x in p["dinh"]], stroke_width=0, fill_color=mo.mau.get(k, MAU_MIEN[0]), fill_opacity=0.22)
            elif p["kieu"] == "vuong":
                a, o, b = (self.P[x] for x in p["ba"])
                s = 0.26
                u = (a - o) / max(1e-6, np.linalg.norm(a - o)) * s
                w = (b - o) / max(1e-6, np.linalg.norm(b - o)) * s
                m = VMobject(stroke_width=2.6, color=TRANG).set_points_as_corners([o + u, o + u + w, o + w])
            elif p["kieu"] == "goc":
                m = self.cung_goc(p["ba"], mo.mau.get(k, VANG), p.get("nhan"))
            elif p["kieu"] == "bang":
                a, b = (self.P[x] for x in p["khoa"])
                m = self.vach_bang(a, b, p["so"])
            if m is not None:
                self.hinh[k] = m
        for n, p in self.P.items():
            self.cham[n] = Dot(p, radius=0.06, color=TRANG)
            self.nhan_diem[n] = MathTex(tex_ten(n), font_size=36, color=TRANG).move_to(p + self.huong_nhan(n) * 0.36)

    def cung_goc(self, ba, mau, nhan=""):
        a, o, b = (self.P[x] for x in ba)
        t1 = math.atan2(*(a - o)[1::-1])
        t2 = math.atan2(*(b - o)[1::-1])
        d = (t2 - t1) % (2 * math.pi)
        if d > math.pi:
            t1, d = t2, 2 * math.pi - d
        r = 0.42
        cung = Arc(radius=r, start_angle=t1, angle=d, arc_center=o, color=mau, stroke_width=4)
        g = VGroup(cung)
        if nhan:
            gm = t1 + d / 2
            g.add(tao_cong_thuc(chuan_tex(nhan), 28).set_color(mau).move_to(o + np.array([math.cos(gm), math.sin(gm), 0]) * (r + 0.3)))
        return g

    def vach_bang(self, a, b, n):
        m = (a + b) / 2
        d = (b - a) / max(1e-6, np.linalg.norm(b - a))
        p = np.array([-d[1], d[0], 0])
        g = VGroup()
        for j in range(n):
            c = m + d * (j - (n - 1) / 2) * 0.09
            g.add(Line(c - p * 0.13, c + p * 0.13, stroke_width=3, color=TRANG))
        return g

    # ---------- thời gian ----------
    def choi(self, *anim, run_time=1.0):
        anim = [a for a in anim if a is not None]
        if not anim:
            return
        run_time = max(0.15, run_time)
        self.play(*anim, run_time=run_time)
        self.da += run_time

    def doi_toi(self, t):
        if t - self.da > 0.02:
            self.wait(t - self.da)
            self.da = t

    # ---------- màu / làm nổi ----------
    def net_chinh(self, m):
        return m[0] if isinstance(m, VGroup) and getattr(m, "la_co_nhan", False) else m

    def ap_trang_thai(self, i, dong=None):
        """Trả về các animation đưa hình về trạng thái 'cảnh i': phần được nhắc sáng + màu riêng + dày, phần khác mờ."""
        mo = self.mo
        nt = mo.nhac[i] if dong is None else dong
        sang = set()
        for d in nt["doan"]:
            sang.add(("doan", d))
        for g in nt["goc"]:
            sang.add(("vuong", g) if ("vuong", g) in self.hinh else ("goc", g))
        for t in nt["tam_giac"] + nt["mat"]:
            km = ("mien", khoa_da_giac(t))
            if km not in self.hinh:   # tam giác / mặt phẳng được nhắc tới: tạo vùng tô màu riêng của nó
                mau_m = mo.mau.get(km, MAU_MIEN[0])
                self.hinh[km] = Polygon(*[self.P[x] for x in t], stroke_width=0, fill_color=mau_m, fill_opacity=0.38)
            sang.add(km)
            for j in range(len(t)):
                sang.add(("doan", khoa_doan(t[j], t[(j + 1) % len(t)])))
        if nt["tron"]:
            for k in self.hinh:
                if k[0] == "tron":
                    sang.add(k)
        co_tap_trung = bool(sang)
        anim = []
        for k, m in self.hinh.items():
            if m not in self.tren_man:
                continue
            duoc = k in sang
            mo_do = 1.0 if (duoc or not co_tap_trung) else 0.28
            net = self.net_chinh(m)
            if k[0] == "doan":
                mau = mo.mau.get(k, TRANG) if (k in self.da_to or duoc) else (NET_DUT if isinstance(net, DashedLine) and mo.pt[mo.chi_so[k]]["kieu_net"] == "phu" else (XAM if isinstance(net, DashedLine) else TRANG))
                if duoc:
                    self.da_to.add(k)
                rong = 7 if duoc and co_tap_trung else (3.2 if isinstance(net, DashedLine) else 4)
                if mo.pt[mo.chi_so[k]]["kieu_net"] == "con":
                    if k not in self.da_to:
                        mo_do = 0
                    rong += 1.5     # đoạn con nằm đè lên cạnh mẹ: dày hơn chút để thấy màu riêng
                anim.append(net.animate.set_stroke(color=mau, width=rong, opacity=mo_do))
                if net is not m:
                    anim.append(m[1].animate.set_opacity(mo_do).set_color(mo.mau.get(k, TRANG) if k in self.da_to else TRANG))
            elif k[0] == "mien":
                anim.append(m.animate.set_fill(opacity=0.38 if duoc else (0.0 if co_tap_trung else 0.16)))
            elif k[0] == "tron":
                anim.append(m.animate.set_stroke(opacity=mo_do, width=5 if duoc and co_tap_trung else 3))
            elif k[0] == "vuong" and duoc:
                anim.append(m.animate.set_stroke(color=mo.mau.get(("goc", k[1]), VANG), width=4, opacity=1))
            else:
                anim.append(m.animate.set_opacity(mo_do))
        dang_xet = set(nt["diem"])
        for k in sang:
            if k[0] in ("doan",):
                dang_xet.update(k[1])
            elif k[0] in ("goc", "vuong"):
                dang_xet.update(mo.goc_ba.get(k[1], []))
            elif k[0] == "mien":
                dang_xet.update(k[1])
        for n, nh in self.nhan_diem.items():
            if nh in self.tren_man:
                op = 1.0 if (not co_tap_trung or n in dang_xet) else 0.35
                anim.append(nh.animate.set_opacity(op))
                anim.append(self.cham[n].animate.set_opacity(op))
        return anim, sang

    # ---------- công thức ----------
    def dong_tex(self, s):
        return self.mo.to_mau_tex(chuan_tex(s))

    def tach_tam_giac(self, ds):
        """Hai tam giác được so sánh: sao chép, tô màu, đặt cạnh nhau phía trên vùng công thức."""
        g = VGroup()
        for t in ds[:2]:
            mau = self.mo.mau.get(("mien", khoa_da_giac(t)), MAU_MIEN[len(g)])
            pts = [self.P[x] for x in t]
            tg = Polygon(*pts, color=mau, stroke_width=4, fill_color=mau, fill_opacity=0.3)
            nh = VGroup(*[MathTex(tex_ten(x), font_size=30, color=TRANG).move_to(self.P[x] + (self.P[x] - np.mean(pts, axis=0)) / max(1e-6, np.linalg.norm(self.P[x] - np.mean(pts, axis=0))) * 0.3) for x in t])
            g.add(VGroup(tg, nh))
        return g

    # ---------- dựng cả video ----------
    def construct(self):
        mo = self.mo
        self.chuan_bi_toa_do()
        self.dung_phan_tu()
        self.tren_man = set()
        self.da_to = set()
        tieu_de = Text(str(mo.props.get("tieuDe") or "").upper()[:48], font=PHONG, weight="BOLD", color=VANG, font_size=40)
        vua_rong(tieu_de, 8.3).move_to([0, Y_TIEU_DE, 0])
        th = mo.props.get("thuongHieu") or {}
        ky = str(th.get("ten") or th.get("handle") or "").strip()
        if self.bia:
            return self.dung_bia(tieu_de)
        self.da = 0.0
        tong = 0.0
        self.add(tieu_de)
        if ky:
            self.add(Text("Video by: " + ky, font=PHONG, font_size=24, color="#FFFFFF").set_opacity(0.18).move_to([0, HINH_DUOI - 0.15, 0]))
        buoc = None
        cu = VGroup()     # công thức đang trên màn
        tach = None
        fps = mo.fps
        for i, cp in enumerate(mo.canh_p):
            D = cp["soFrame"] / fps
            self.da = 0.0
            ck = mo.canh_k[i]
            # 1) dọn bước trước, tiêu đề bước mới
            ra = [FadeOut(cu, shift=UP * 0.3)] if len(cu) else []
            if tach is not None:
                ra.append(FadeOut(tach))
                tach = None
            tdb = str(cp.get("tieuDeCanh") or ck.get("tieu_de_canh") or "").strip()
            moi_buoc = None
            if tdb:
                moi_buoc = vua_rong(Text(tdb[:60], font=PHONG, slant="ITALIC", color="#CFD8DC", font_size=30), 8.4).move_to([0, Y_BUOC, 0])
                ra.append(FadeOut(buoc) if buoc is not None else None)
                ra.append(FadeIn(moi_buoc, shift=DOWN * 0.15))
            self.choi(*ra, run_time=0.45 if i else 0.3)
            if moi_buoc is not None:
                buoc = moi_buoc
            cu = VGroup()
            if not mo.cong_thuc(i):
                # cảnh không có công thức: mở đầu -> câu hỏi lớn; đề bài -> chữ đề bài (để người xem đọc theo)
                chu = ""
                if i == 0 or str(cp.get("loai")) in ("mo_dau", "hook"):
                    chu, co_chu = str(mo.props.get("hookChu") or mo.props.get("hook") or "").strip(), 50
                if str(cp.get("loai")) == "de_bai" or (not chu and i <= 1):
                    chu, co_chu = str(mo.de_bai or "").strip(), 36
                if chu:
                    the = khoi_chu(chu, co_chu, 8.2, CT_TREN - CT_DUOI - 0.6)
                    the.move_to([0, CT_TREN - 0.35 - the.height / 2, 0])
                    self.choi(Write(the) if co_chu > 40 else FadeIn(the, shift=UP * 0.2), run_time=min(1.0, D * 0.2))
                    cu.add(the)
            # 2) vẽ phần hình mới của cảnh này (theo thứ tự trong kịch bản: cạnh -> đường tròn -> góc -> vùng tô)
            moi = [p for p in mo.pt if p["canh"] == i and (p["kieu"], p["khoa"]) in self.hinh]
            moi_doan = [p for p in moi if p["kieu"] == "doan"]
            diem_moi = [n for n, c in mo.diem_canh.items() if c == i and n in self.P]
            ngan_sach = min(D * 0.45, 0.5 + 0.45 * (len(moi_doan) + len(moi)))
            buoc_ve = []
            for p in moi_doan:
                m = self.hinh[("doan", p["khoa"])]
                pts = [x for x in p["khoa"] if x in diem_moi]
                g = [Create(self.net_chinh(m))]
                for x in pts:
                    g += [GrowFromCenter(self.cham[x]), Write(self.nhan_diem[x])]
                    diem_moi.remove(x)
                    self.tren_man.update([self.cham[x], self.nhan_diem[x]])
                if m is not self.net_chinh(m):
                    g.append(Write(m[1]))
                buoc_ve.append(g)
                self.tren_man.add(m)
            le = []
            for x in diem_moi:
                le += [GrowFromCenter(self.cham[x]), Write(self.nhan_diem[x])]
                self.tren_man.update([self.cham[x], self.nhan_diem[x]])
            if le:
                buoc_ve.insert(0, le)
            for p in moi:
                if p["kieu"] == "doan":
                    continue
                m = self.hinh[(p["kieu"], p["khoa"])]
                if p["kieu"] == "mien":
                    buoc_ve.append([FadeIn(m)])
                else:
                    buoc_ve.append([Create(m)])
                self.tren_man.add(m)
            if buoc_ve:
                rt = max(0.35, min(0.9, ngan_sach / len(buoc_ve)))
                for g in buoc_ve:
                    self.choi(*g, run_time=rt)
            # vùng tô/miền phải nằm dưới cạnh
            for p in moi:
                if p["kieu"] == "mien":
                    self.bring_to_back(self.hinh[(p["kieu"], p["khoa"])])
            # 3) làm nổi phần đang xét
            anim, sang = self.ap_trang_thai(i)
            moi_hien = []
            for k in sang:
                # chỉ hiện sớm phần do lời giảng tạo ra (góc, tam giác được nhắc); phần của hình (đường tròn, đường phụ...)
                # vẫn chờ đúng cảnh kịch bản đưa vào
                p_k = mo.pt[mo.chi_so[k]] if k in mo.chi_so else None
                if p_k is not None and p_k["canh"] > i and k[0] != "mien":
                    continue
                if k in self.hinh and self.hinh[k] not in self.tren_man:
                    moi_hien.append(FadeIn(self.hinh[k]) if k[0] == "mien" else Create(self.hinh[k]))
                    self.tren_man.add(self.hinh[k])
            if anim or moi_hien:
                self.choi(*(anim + moi_hien), run_time=0.6)
                for k in sang:
                    if k[0] == "mien" and k in self.hinh:
                        self.bring_to_back(self.hinh[k])
            # 4) công thức: mỗi dòng hiện theo câu nói tương ứng; cạnh trong dòng lóe sáng
            dong = mo.cong_thuc(i)
            cau = cp.get("cau") or []
            dap_an = la_dap_an(cp)
            bien_doi = str(cp.get("trinhBay") or "") == "bien_doi" and len(dong) >= 2
            ds_tg = []
            for s in dong:
                if re.search(r"\\sim|\\cong|=", s):
                    tg = mo.nhac_toi(s)["tam_giac"]
                    if len(tg) >= 2:
                        ds_tg = tg
                        break
            if ck.get("tach"):
                ds_tg = [tuple(ten_chuan(x) for x in re.findall(TEN_DIEM, str(t)))[:3] for t in ck.get("tach")][:2]
                ds_tg = [t for t in ds_tg if len(t) == 3 and all(x in self.P for x in t)]
            y_ct = CT_TREN
            if len(ds_tg) >= 2:
                tach = self.tach_tam_giac(ds_tg)
                for j, gt in enumerate(tach):
                    gt.generate_target()
                    f_t = min(3.8 / max(0.01, gt.width), 2.5 / max(0.01, gt.height))
                    gt.target.scale(f_t)
                    for nh_t in gt.target[1]:
                        nh_t.scale(1 / f_t)     # nhãn đỉnh giữ cỡ chữ dễ đọc
                    gt.target.move_to([(-2.2 if j == 0 else 2.2), CT_TREN - 1.35, 0])
                from manim import MoveToTarget
                self.choi(*[MoveToTarget(gt) for gt in tach], run_time=0.9)
                y_ct = CT_TREN - 2.75
            mob = [vua_rong(tao_cong_thuc(self.dong_tex(s), CO_CT), CT_RONG) for s in dong]
            if mob:
                if True:
                    g = VGroup(*mob).arrange(DOWN, buff=0.38)
                    cao = y_ct - CT_DUOI - 0.2
                    if g.height > cao:
                        g.scale_to_fit_height(cao)
                    g.next_to([0, y_ct, 0], DOWN, buff=0.25)
                    g.set_x(0)
            t_con = D - self.da - (1.4 if dap_an else 0.4)
            nc = len(cau)
            for j, m in enumerate(mob):
                # mốc hiện dòng j: đầu câu tương ứng (giọng đọc), không sớm hơn lúc vẽ xong
                if nc:
                    jc = min(nc - 1, int(j * nc / len(mob)))
                    moc = float(cau[jc].get("bat", 0)) + (0.15 if j else 0)
                else:
                    moc = self.da + j * max(0.8, t_con / max(1, len(mob)))
                self.doi_toi(min(max(moc, self.da), D - 1.0))
                con = D - self.da - 0.3
                rt = max(0.4, min(1.3, con * 0.5))
                dong_nt = mo.nhac_toi(dong[j])
                loe = []
                for d in dong_nt["doan"]:
                    m_d = self.hinh.get(("doan", d))
                    if m_d is not None and m_d in self.tren_man:
                        loe.append(ShowPassingFlash(Line(*(self.P[x] for x in d)).set_stroke(VANG, width=12), time_width=0.6))
                for gk in dong_nt["goc"]:
                    if ("vuong", gk) in self.hinh:     # góc vuông đã có ký hiệu: tô màu ký hiệu, không vẽ thêm cung
                        loe.append(self.hinh[("vuong", gk)].animate.set_stroke(color=mo.mau.get(("goc", gk), VANG), width=4, opacity=1))
                        continue
                    if ("goc", gk) not in self.hinh:
                        mau = mo.mau.get(("goc", gk), VANG)
                        a, o, b = mo.goc_ba.get(gk, list(gk))
                        cg = self.cung_goc([a, o, b], mau)
                        self.hinh[("goc", gk)] = cg
                    if self.hinh[("goc", gk)] not in self.tren_man:
                        loe.append(Create(self.hinh[("goc", gk)]))
                        self.tren_man.add(self.hinh[("goc", gk)])
                if bien_doi and j > 0:
                    truoc = mob[j - 1]
                    # dòng trước thu nhỏ, mờ, đẩy lên; dòng mới biến hình ra từ bản sao dòng trước
                    # dòng mới biến hình ra từ bản sao dòng trước (thấy rõ từng phần đi đâu), các dòng cũ mờ đi
                    self.choi(TransformMatchingShapes(truoc.copy(), m), *[x.animate.set_opacity(0.4) for x in mob[:j]], *loe, run_time=rt)
                    cu.add(m)
                else:
                    trc = [x.animate.set_opacity(0.5) for x in mob[:j] if not bien_doi]
                    self.choi(Write(m), *trc, *loe, run_time=rt)
                    cu.add(m)
            if bien_doi and mob:
                # dọn các dòng cũ của biến đổi khỏi danh sách để FadeOut cùng lúc ở cảnh sau
                for m in mob[:-1]:
                    if m not in cu:
                        cu.add(m)
            if mob and not bien_doi and len(mob) > 1:
                self.choi(*[x.animate.set_opacity(1) for x in mob], run_time=0.3)
            # 5) đáp án: khung vàng quanh dòng kết luận
            if dap_an and mob:
                khung = SurroundingRectangle(mob[-1], color=VANG, buff=0.18, stroke_width=3.5)
                self.doi_toi(max(self.da, min(D - 1.4, D * 0.6)))
                self.choi(Create(khung), run_time=0.7)
                self.choi(Circumscribe(mob[-1], color=VANG, buff=0.22), run_time=0.7)
                cu.add(khung)
            self.doi_toi(D - 0.02)
            tong += D
        du = mo.props.get("tongFrame", 0) / fps - tong
        if du > 0.05:
            self.wait(du)

    def dung_bia(self, tieu_de):
        """Ảnh bìa: tiêu đề to + hình đầy đủ (đại lượng tô màu) + câu hỏi / kết luận đóng khung."""
        mo = self.mo
        tieu_de.scale(1.25).move_to([0, Y_TIEU_DE - 0.2, 0])
        vua_rong(tieu_de, 8.6)
        self.add(tieu_de)
        for k, m in self.hinh.items():
            if k[0] == "goc" and k not in mo.mau:
                continue
            net = self.net_chinh(m)
            if k[0] == "doan" and k in mo.mau:
                net.set_stroke(color=mo.mau[k], width=6, opacity=1)
            if k[0] == "mien":
                m.set_fill(opacity=0.25)
            self.add(m)
        for n in self.P:
            self.add(self.cham[n], self.nhan_diem[n])
        cau = str(mo.props.get("hookChu") or mo.props.get("hook") or "").strip()
        if cau:
            t = vua_rong(Text(cau[:70], font=PHONG, weight="BOLD", color=TRANG, font_size=50), 7.8)
            t.move_to([0, -3.2, 0])
            k = SurroundingRectangle(t, color=VANG, buff=0.3, stroke_width=5)
            self.add(t, k)


# ============================================================
# 4) RÁP TIẾNG (giọng + nhạc) VÀ ẢNH BÌA
# ============================================================
def ffmpeg():
    return shutil.which("ffmpeg") or "ffmpeg"


def ghep_am_thanh(props, public, vid, ra):
    fps = props.get("fps", 30)
    tong = props.get("tongFrame", 0) / fps
    co_giong = os.environ.get("MANIM_GIONG", "1") != "0"
    vao = ["-i", vid]
    loc = []
    nhan = []
    k = 1
    if co_giong:
        for c in props["canh"]:
            a = os.path.join(public, c.get("audio") or "")
            if c.get("audio") and os.path.exists(a):
                vao += ["-i", a]
                tre = int(round((c["batDau"] + c.get("leadFrame", 0)) / fps * 1000))
                loc.append("[%d:a]aresample=48000,adelay=%d|%d[g%d]" % (k, tre, tre, k))
                nhan.append("[g%d]" % k)
                k += 1
    nhac = props.get("nhac")
    co_nhac = bool(nhac) and os.path.exists(os.path.join(public, nhac))
    if co_nhac:
        vao += ["-stream_loop", "-1", "-i", os.path.join(public, nhac)]
        km = k
        k += 1
    am = float(props.get("amLuongNhac") or 0.16)
    if nhan and co_nhac:
        loc.append("%samix=inputs=%d:normalize=0:dropout_transition=0,asplit=2[giong][sc]" % ("".join(nhan), len(nhan)))
        loc.append("[%d:a]aresample=48000,volume=%.3f,afade=t=in:d=0.8,afade=t=out:st=%.2f:d=1.5[nh]" % (km, am * 2.2, max(0, tong - 1.5)))
        loc.append("[nh][sc]sidechaincompress=threshold=0.02:ratio=5:attack=30:release=500[nhd]")
        loc.append("[giong][nhd]amix=inputs=2:normalize=0:duration=longest,atrim=0:%.3f[a]" % tong)
    elif nhan:
        loc.append("%samix=inputs=%d:normalize=0,atrim=0:%.3f[a]" % ("".join(nhan), len(nhan), tong))
    elif co_nhac:
        loc.append("[%d:a]aresample=48000,volume=%.3f,afade=t=in:d=1,afade=t=out:st=%.2f:d=2,atrim=0:%.3f[a]" % (km, 0.85, max(0, tong - 2), tong))
    else:
        shutil.copy(vid, ra)
        return
    lenh = [ffmpeg(), "-y", "-loglevel", "error"] + vao + ["-filter_complex", ";".join(loc), "-map", "0:v", "-map", "[a]",
                                                         "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-t", "%.3f" % tong, ra]
    subprocess.run(lenh, check=True)


def chen_bia_khung_dau(vid, bia, ra, rong, cao):
    """Khung hình đầu = ảnh bìa (nền tảng lấy khung đầu làm ảnh đại diện), 1/30 giây nên mắt không thấy."""
    lenh = [ffmpeg(), "-y", "-loglevel", "error", "-i", vid, "-i", bia, "-filter_complex",
            "[1:v]scale=%d:%d[b];[0:v][b]overlay=0:0:enable='eq(n,0)'[v]" % (rong, cao),
            "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "copy", "-movflags", "+faststart", ra]
    subprocess.run(lenh, check=True)


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("props")
    ap.add_argument("kich_ban")
    ap.add_argument("ra", nargs="?", default="out")
    ap.add_argument("--public", default="public")
    a = ap.parse_args()
    props = json.load(open(a.props, encoding="utf8"))
    kb = json.load(open(a.kich_ban, encoding="utf8"))
    mo = MoHinh(props, kb)
    if len(mo.diem) < 2:
        print("Kịch bản không có hình hinh_hoc -> không dựng bằng Manim")
        sys.exit(3)
    os.makedirs(a.ra, exist_ok=True)
    id_ = props.get("id") or "video"
    thap = os.environ.get("MANIM_CHAT_LUONG") == "thap"
    rong, cao = (540, 960) if thap else (1080, 1920)
    tam = os.path.abspath(os.path.join(a.ra, "_manim"))
    cfg = {"pixel_width": rong, "pixel_height": cao, "frame_width": W, "frame_height": H, "frame_rate": props.get("fps", 30),
           "media_dir": tam, "disable_caching": True, "verbosity": "WARNING", "progress_bar": "none"}
    print("Màu đại lượng:", {"%s %s" % (k[0], "".join(map(str, k[1]))): v for k, v in mo.mau.items()})
    # ảnh bìa
    with tempconfig(dict(cfg, save_last_frame=True, write_to_movie=False, output_file="bia")):
        VideoHinh.mo, VideoHinh.bia = mo, True
        sc = VideoHinh()
        sc.render()
        anh = sc.renderer.file_writer.image_file_path
    bia = os.path.join(a.ra, "%s_bia.jpg" % id_)
    subprocess.run([ffmpeg(), "-y", "-loglevel", "error", "-i", str(anh), "-q:v", "3", bia], check=True)
    # video
    with tempconfig(dict(cfg, output_file="hinh")):
        VideoHinh.mo, VideoHinh.bia = mo, False
        sc = VideoHinh()
        sc.render()
        vid = str(sc.renderer.file_writer.movie_file_path)
    co_tieng = os.path.join(tam, "co_tieng.mp4")
    ghep_am_thanh(props, a.public, vid, co_tieng)
    ra = os.path.join(a.ra, "%s.mp4" % id_)
    chen_bia_khung_dau(co_tieng, bia, ra, rong, cao)
    shutil.rmtree(tam, ignore_errors=True)
    print("Xong:", ra, bia)


if __name__ == "__main__":
    main()
