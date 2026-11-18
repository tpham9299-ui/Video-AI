#!/usr/bin/env python3
"""
manim_hinh.py - PHẦN TOÁN CỦA VIDEO HÌNH HỌC DỰNG 100% BẰNG MANIM (hình, công thức, chuyển động, hiệu ứng thị giác).

Cách dùng (sau scripts/chuanbi.py, đã có public/props.json + giọng đọc):
    python manim_hinh.py public/props.json kich_ban.json out/ [--public public]
Ra:
- out/<ID>_manim.mov : lớp trong suốt (hình + công thức + thẻ kiến thức) đúng vùng nội dung của khung video;
- public/manim/bia.png : hình đầy đủ cho ảnh bìa;
- public/props.json thêm manimLop / anhManimBia / suKienManim.
Remotion dựng PHẦN VỎ CHUNG của mọi video (nền tự tạo, tiêu đề, thanh bước, phụ đề, giọng đọc, nhạc nền, tiếng hiệu ứng)
rồi máy ghép đè lớp Manim lên -> video hình học thống nhất phong cách với video xác suất / thực tế.

Hiệu ứng (theo video hình học mẫu):
- MỖI ĐẠI LƯỢNG MỘT MÀU: đoạn thẳng / góc / tam giác / mặt phẳng được nhắc tới mang màu riêng, công thức tô cùng màu;
- vẽ dần (Create) cạnh, điểm, nhãn; đường kẻ thêm nét đứt;
- MỖI BƯỚC CHỈ LÀM NỔI phần đang xét (sáng, dày, tô màu), phần còn lại mờ đi; dòng công thức hiện ra thì cạnh trong
  dòng lóe sáng chạy dọc theo cạnh;
- thẻ KIẾN THỨC (định lý / tính chất dùng ở bước đó); công thức biến đổi từng bước; \\hl{...} khung vàng phần đang xét;
  dòng kết luận đóng khung vàng; hai tam giác so sánh được tách ra đặt cạnh nhau;
- thời lượng mỗi bước = đúng giọng đọc của cảnh, dòng công thức hiện theo từng câu nói.
MANIM_CHAT_LUONG=thap -> 540x960 (chạy thử nhanh).
"""
import json
import math
import os
import re
import shutil
import sys
import tempfile

import numpy as np
from manim import (DOWN, UP, Arc, Circle, Circumscribe, Create, DashedLine, Dot, FadeIn, FadeOut,
                   GrowFromCenter, Line, MathTex, MoveToTarget, Polygon, RoundedRectangle, Scene, ShowPassingFlash,
                   SurroundingRectangle, TexTemplate, Text, TransformMatchingShapes, UpdateFromAlphaFunc, VGroup, VMobject, Write, tempconfig)

NEN = "#111111"
VANG = "#FFD43B"
TRANG = "#EAF2F4"
NHAN = "#4FC3F7"      # màu nhấn của loại "Hình học" (MAU_LOAI trong src/theme.ts), như viền thẻ ở các video khác
NEN_THE = "#06141B"
XAM = "#9AA0A6"
NET_DUT = "#FFE066"
TRON = "#74C0FC"
BANG_MAU = ["#FF6B6B", "#4ECDC4", "#FFA94D", "#B197FC", "#69DB7C", "#74C0FC", "#F783AC", "#E599F7", "#63E6BE", "#FF8787"]
MAU_MIEN = ["#4ECDC4", "#FFA94D", "#B197FC", "#69DB7C", "#F783AC", "#74C0FC"]
PHONG = "Montserrat"   # Montserrat ExtraBold: phông chữ đậm của mọi video (tiêu đề, phụ đề, thẻ đề, công thức)

TEX = TexTemplate(
    tex_compiler="xelatex", output_format=".xdv",
    preamble=r"\usepackage{amsmath}\usepackage{amssymb}\usepackage{xcolor}\usepackage{fontspec}\setmainfont{Noto Serif}"
             r"\newcommand{\hl}[1]{\fcolorbox[HTML]{FFD43B}{111111}{$\displaystyle #1$}}"
             r"\newcommand{\dpcm}{\text{(đpcm)}}")

# ---------- BỐ CỤC (khung 9 x 16 đơn vị, dọc 1080x1920) ----------
W, H = 9.0, 16.0
Y_TIEU_DE = 7.25
Y_BUOC = 6.35
# vùng của Manim = vùng nội dung của video Remotion (dưới tiêu đề bước, trên phụ đề)
# Mở rộng tối đa vùng hình học ở chính giữa màn hình (không hiện thẻ ĐỀ BÀI chữ dài)
HINH_TREN, HINH_DUOI, HINH_RONG = 4.45, -1.60, 8.85
CT_TREN, CT_DUOI, CT_RONG = -1.75, -4.20, 8.4
CO_CT = 46

# ---------- NHẬN DIỆN ĐẠI LƯỢNG trong chữ / công thức ----------
CHU_VIET = r"A-Za-zÀ-ÖØ-öø-ɏḀ-ỹ"
TEN_DIEM = r"[A-Z](?:'|_\{?\d\}?)?"
RE_GOC = re.compile(r"(?:\\angle|\\widehat\{|(?i:góc)\s+)\s*(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")\}?")
RE_TAM_GIAC = re.compile(r"(?:\\triangle|\\Delta|(?i:tam\s+giác))\s*(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")(?![A-Za-z])")
RE_MAT = re.compile(r"(?:mp\s*|(?i:mặt\s+phẳng)\s*)?\((" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")?\)")
RE_CHOP = re.compile(r"(?<![" + CHU_VIET + r"\\'_])(" + TEN_DIEM + r")\.(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")?(?![" + CHU_VIET + r"'])")
RE_DA_GIAC = re.compile(r"(?<![" + CHU_VIET + r"\\'_])(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")?(?![" + CHU_VIET + r"'])")
RE_DOAN = re.compile(r"(?<![" + CHU_VIET + r"\\'_])(" + TEN_DIEM + r")(" + TEN_DIEM + r")(?![" + CHU_VIET + r"'])")
# số đo trong công thức -> ghi ngay trên hình (như video mẫu ghi a, b, c, α, β cạnh hình): "\\angle ABC = 60^\\circ", "AB = 5"
GIA_TRI = r"(\d+(?:\{,\}\d+|[.,]\d+)?(?:\s*\\sqrt\{[^{}]+\})?|\\sqrt\{[^{}]+\}|\\frac\{[^{}]+\}\{[^{}]+\})"
RE_SO_GOC = re.compile(r"(?:\\angle|\\widehat\{)\s*(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")\}?\s*=\s*" + GIA_TRI + r"\s*(?:\^\s*\{?\\circ\}?|°)")
RE_SO_DOAN = re.compile(r"(?<![A-Za-z\\'_{])(" + TEN_DIEM + r")(" + TEN_DIEM + r")\s*=\s*" + GIA_TRI + r"\s*(?:\\,?\s*\\text\{\s*(?:cm|m|dm|mm)\s*\})?\s*(?=$|[,;)]|\\[;,!]|\\quad|\\text|\\Rightarrow)")
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
        self.diem_3d = {}
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

    def _bo_sung_diem_phu(self):
        """Tự động tính tọa độ các điểm phụ (trung điểm, trọng tâm, chân đường vuông góc/đường cao, giao điểm)
        được nhắc trong lời giải / công thức / đề bài mà kịch bản chưa khai báo tọa độ trong v['diem']."""
        tat_ca_chu = self.de_bai + " ; " + " ; ".join(
            self.chu_canh(i) + " ; " + str(self.canh_k[i].get("kien_thuc") or "")
            for i in range(len(self.canh_p))
        )
        # 1) Trung điểm: "M là trung điểm (của) AB", "trung điểm M của BC"
        for m in re.finditer(
            r"(?:(" + TEN_DIEM + r")\s+là\s+trung\s+điểm\s+(?:của\s+)?(?:đoạn\s+|cạnh\s+)?(" + TEN_DIEM + r")(" + TEN_DIEM + r")"
            r"|trung\s+điểm\s+(" + TEN_DIEM + r")\s+của\s+(?:đoạn\s+|cạnh\s+)?(" + TEN_DIEM + r")(" + TEN_DIEM + r"))",
            tat_ca_chu
        ):
            p, a, b = (m.group(1), m.group(2), m.group(3)) if m.group(1) else (m.group(4), m.group(5), m.group(6))
            p, a, b = ten_chuan(p), ten_chuan(a), ten_chuan(b)
            if p not in self.diem and a in self.diem and b in self.diem:
                pa, pb = self.diem[a], self.diem[b]
                self.diem[p] = ((pa[0] + pb[0]) / 2.0, (pa[1] + pb[1]) / 2.0)

        # 2) Trọng tâm: "G là trọng tâm tam giác ABC", "trọng tâm G của tam giác ABC"
        for m in re.finditer(
            r"(?:(" + TEN_DIEM + r")\s+là\s+trọng\s+tâm\s+(?:của\s+)?(?:\\triangle|tam\s+giác)\s*(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r")"
            r"|trọng\s+tâm\s+(" + TEN_DIEM + r")\s+của\s+(?:\\triangle|tam\s+giác)\s*(" + TEN_DIEM + r")(" + TEN_DIEM + r")(" + TEN_DIEM + r"))",
            tat_ca_chu
        ):
            g, a, b, c = (m.group(1), m.group(2), m.group(3), m.group(4)) if m.group(1) else (m.group(5), m.group(6), m.group(7), m.group(8))
            g, a, b, c = ten_chuan(g), ten_chuan(a), ten_chuan(b), ten_chuan(c)
            if g not in self.diem and all(x in self.diem for x in (a, b, c)):
                pa, pb, pc = self.diem[a], self.diem[b], self.diem[c]
                self.diem[g] = ((pa[0] + pb[0] + pc[0]) / 3.0, (pa[1] + pb[1] + pc[1]) / 3.0)

        # 3) Chân đường cao / hình chiếu vuông góc: "kẻ AH vuông góc (với) BC tại H", "đường cao AH của tam giác ABC", "hình chiếu H của A lên BC"
        def chieu_vuong_goc(a_pt, b_pt, c_pt):
            ax, ay = a_pt
            bx, by = b_pt
            cx, cy = c_pt
            dx, dy = cx - bx, cy - by
            d2 = dx * dx + dy * dy
            if d2 < 1e-9:
                return ((bx + cx) / 2.0, (by + cy) / 2.0)
            t = ((ax - bx) * dx + (ay - by) * dy) / d2
            t = max(0.05, min(0.95, t))
            return (bx + t * dx, by + t * dy)

        for m in re.finditer(
            r"(?:kẻ\s+|dựng\s+|đường\s+cao\s+)?(" + TEN_DIEM + r")(" + TEN_DIEM + r")\s*(?:\\perp|⊥|vuông\s+góc\s+(?:với\s+)?)\s*(" + TEN_DIEM + r")(" + TEN_DIEM + r")(?:\s+tại\s+(" + TEN_DIEM + r"))?",
            tat_ca_chu
        ):
            u, h, b, c, tai = [ten_chuan(x) if x else "" for x in m.groups()]
            if tai and tai in (u, h):
                 dinh, chan = (u, h) if tai == h else (h, u)
            else:
                dinh, chan = (u, h) if u in self.diem and h not in self.diem else ((h, u) if h in self.diem and u not in self.diem else ("", ""))
            if chan and chan not in self.diem and dinh in self.diem and b in self.diem and c in self.diem:
                self.diem[chan] = chieu_vuong_goc(self.diem[dinh], self.diem[b], self.diem[c])

        # 4) Giao điểm 2 đường thẳng: "I là giao điểm của AB và CD", "AB cắt CD tại I"
        for m in re.finditer(
            r"(?:(" + TEN_DIEM + r")\s+là\s+giao\s+điểm\s+của\s+(" + TEN_DIEM + r")(" + TEN_DIEM + r")\s+và\s+(" + TEN_DIEM + r")(" + TEN_DIEM + r")"
            r"|(" + TEN_DIEM + r")(" + TEN_DIEM + r")\s+cắt\s+(" + TEN_DIEM + r")(" + TEN_DIEM + r")\s+tại\s+(" + TEN_DIEM + r"))",
            tat_ca_chu
        ):
            if m.group(1):
                pt_i, a, b, c, d = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
            else:
                a, b, c, d, pt_i = m.group(6), m.group(7), m.group(8), m.group(9), m.group(10)
            pt_i, a, b, c, d = ten_chuan(pt_i), ten_chuan(a), ten_chuan(b), ten_chuan(c), ten_chuan(d)
            if pt_i not in self.diem and all(x in self.diem for x in (a, b, c, d)):
                x1, y1 = self.diem[a]
                x2, y2 = self.diem[b]
                x3, y3 = self.diem[c]
                x4, y4 = self.diem[d]
                den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
                if abs(den) > 1e-6:
                    px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den
                    py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / den
                    if 0.0 <= px <= 100.0 and 0.0 <= py <= 100.0:
                        self.diem[pt_i] = (px, py)

    def _chuan_hoa_khong_gian(self):
        """Đảm bảo quy tắc cơ bản của hình học không gian:
        - Mọi cạnh nằm trên đường bao lồi ngoài cùng (2D Convex Hull) của khối đa diện BẮT BUỘC là nét liền ('canh').
        - Các cạnh bị khuất phía sau hoặc đi xuyên qua lòng khối đa diện BẮT BUỘC là nét đứt ('khuat' hoặc 'phu')."""
        co_khuat = any(p["kieu"] == "doan" and p.get("kieu_net") == "khuat" for p in self.pt)
        la_kg = co_khuat or bool(re.search(r"(?i:hình\s+chóp|lăng\s+trụ|tứ\s+diện|hình\s+hộp|mặt\s+phẳng|không\s+gian)", self.de_bai))
        self.la_khong_gian = la_kg
        if not la_kg:
            return
        doan_chinh = [p for p in self.pt if p["kieu"] == "doan" and p.get("kieu_net") in ("canh", "khuat")]
        dinh_chinh = sorted({x for p in doan_chinh for x in p["khoa"] if x in self.diem})
        if len(dinh_chinh) < 4:
            return

        def la_canh_bao_loi(a, b):
            ax, ay = self.diem[a]
            bx, by = self.diem[b]
            dx, dy = bx - ax, by - ay
            L = math.hypot(dx, dy)
            if L < 1e-6:
                return False
            duong, am = 0, 0
            for k in dinh_chinh:
                if k in (a, b):
                    continue
                px, py = self.diem[k]
                cr = (dx * (py - ay) - dy * (px - ax)) / L
                if cr > 0.15:
                    duong += 1
                elif cr < -0.15:
                    am += 1
                if duong > 0 and am > 0:
                    return False
            return True

        # 1) Cạnh nằm trên đường viền bao ngoài cùng của khối: bắt buộc là cạnh nhìn thấy (nét liền)
        dinh_tren_bao = set()
        for p in doan_chinh:
            a, b = p["khoa"]
            if la_canh_bao_loi(a, b):
                dinh_tren_bao.update((a, b))
                if p.get("kieu_net") == "khuat":
                    p["kieu_net"] = "canh"

        # 2) Nếu bài không gian chưa có cạnh khuất nào (do kịch bản cũ quên đánh dấu khuat):
        # Đỉnh nằm hẳn bên trong bao lồi (góc khuất phía sau của đáy chóp/lăng trụ, thường có y nhỏ hơn = cao hơn trên màn hình) -> các cạnh nối tới nó là cạnh khuất!
        if not any(p.get("kieu_net") == "khuat" for p in doan_chinh):
            dinh_trong = [k for k in dinh_chinh if k not in dinh_tren_bao]
            if dinh_trong:
                for p in doan_chinh:
                    a, b = p["khoa"]
                    if (a in dinh_trong or b in dinh_trong) and not la_canh_bao_loi(a, b):
                        p["kieu_net"] = "khuat"

    def _tu_sinh_hinh_tu_de(self):
        """Phương án dự phòng tự sinh hình chuẩn xác từ đề bài và lời giải khi kịch bản thiếu tọa độ v['diem'],
        đảm bảo 100% bài Hình học luôn được dựng bằng Manim (tuyệt đối không rơi về Remotion)."""
        vb = self.de_bai + " ; " + " ; ".join(
            str(c.get("loi_thoai") or "") + " ; " + " ; ".join(str(x) for x in (c.get("noi_dung_man_hinh") or []))
            for c in self.canh_k
        )
        canh, khuat, tron, vuong = [], [], [], []
        if re.search(r"S\.ABCD\b", vb):
            self.diem = {"S": (0.36, 0.14), "A": (0.32, 0.56), "B": (0.16, 0.82), "C": (0.66, 0.82), "D": (0.82, 0.56), "O": (0.49, 0.69)}
            canh = [["S", "B"], ["S", "C"], ["S", "D"], ["B", "C"], ["C", "D"]]
            khuat = [["S", "A"], ["A", "B"], ["A", "D"], ["A", "C"], ["B", "D"], ["S", "O"]]
        elif re.search(r"S\.ABC\b", vb):
            self.diem = {"S": (0.34, 0.14), "A": (0.20, 0.66), "B": (0.54, 0.86), "C": (0.84, 0.62)}
            canh = [["S", "A"], ["S", "B"], ["S", "C"], ["A", "B"], ["B", "C"]]
            khuat = [["A", "C"]]
        elif re.search(r"ABC\.A'B'C'", vb):
            self.diem = {"A'": (0.24, 0.20), "B'": (0.54, 0.34), "C'": (0.80, 0.20), "A": (0.20, 0.68), "B": (0.50, 0.82), "C": (0.76, 0.68)}
            canh = [["A'", "B'"], ["B'", "C'"], ["A'", "C'"], ["A", "A'"], ["B", "B'"], ["C", "C'"], ["A", "B"], ["B", "C"]]
            khuat = [["A", "C"]]
        elif re.search(r"(?i:đường\s+tròn)", vb):
            self.diem = {"O": (0.50, 0.54), "A": (0.50, 0.22), "B": (0.22, 0.70), "C": (0.78, 0.70)}
            canh = [["A", "B"], ["B", "C"], ["C", "A"]]
            tron = [["O", "A"]]
        elif re.search(r"(?i:hình\s+vuông|hình\s+chữ\s+nhật|hình\s+bình\s+hành|hình\s+thang|tứ\s+giác)\s*ABCD", vb):
            self.diem = {"A": (0.24, 0.26), "B": (0.76, 0.26), "C": (0.76, 0.76), "D": (0.24, 0.76), "O": (0.50, 0.51)}
            canh = [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"]]
        else:
            vuong_a = bool(re.search(r"(?i:vuông\s+tại\s+A)", vb))
            if vuong_a:
                self.diem = {"A": (0.24, 0.76), "B": (0.24, 0.24), "C": (0.80, 0.76)}
                vuong = [["B", "A", "C"]]
            else:
                self.diem = {"A": (0.44, 0.20), "B": (0.18, 0.78), "C": (0.82, 0.78)}
            canh = [["A", "B"], ["B", "C"], ["C", "A"]]
        return {"diem": self.diem, "canh": canh, "khuat": khuat, "tron": tron, "vuong": vuong}

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
            if isinstance(v.get("diem_3d"), dict):
                for k, p3 in v["diem_3d"].items():
                    if isinstance(p3, (list, tuple)) and len(p3) >= 3:
                        try:
                            self.diem_3d[ten_chuan(k)] = (float(p3[0]), float(p3[1]), float(p3[2]))
                        except (TypeError, ValueError):
                            pass
        v_du_phong = self._tu_sinh_hinh_tu_de() if len(self.diem) < 2 else None
        self._bo_sung_diem_phu()
        co = lambda *ds: all(ten_chuan(x) in self.diem for x in ds)
        ds_nguon = [(i, self.vat_hinh(i)) for i in range(len(self.canh_p))]
        if v_du_phong:
            ds_nguon = [(0, v_du_phong)]
        for i, v in ds_nguon:
            if not v:
                continue
            for c in v.get("to") or []:
                if isinstance(c, list) and len(c) >= 3 and co(*c):
                    self.them("mien", khoa_da_giac(c), i, dinh=[ten_chuan(x) for x in c])
            for ds, kn in ((v.get("canh"), "canh"), (v.get("khuat"), "khuat"), (v.get("phu"), "phu"), (v.get("duong_phu"), "phu")):
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
        self._chuan_hoa_khong_gian()

    # ---- chữ của cảnh i: công thức (TeX gốc từ kịch bản), lời thoại, tiêu đề cảnh, nhấn mạnh do kịch bản chỉ định ----
    def cong_thuc(self, i):
        # Cảnh mở đầu / đề bài trong video Hình học: KHÔNG hiện chữ đề bài lên màn hình (đề bài do giọng đọc đảm nhận,
        # dành toàn bộ chính giữa màn hình cho hình vẽ thật to và rõ nét)
        loai = str(self.canh_p[i].get("loai") or self.canh_k[i].get("loai") or "").lower()
        if re.search(r"mo_dau|de_bai|hook", loai):
            return []
        ds = self.canh_k[i].get("noi_dung_man_hinh")
        if not isinstance(ds, list) or not ds:
            ds = self.canh_p[i].get("noiDung") or []
        return [str(x).strip() for x in ds if str(x).strip()][:6]

    def chu_canh(self, i):
        c = self.canh_k[i]
        nm = c.get("nhan_manh_hinh") or []
        nd = c.get("noi_dung_man_hinh") or self.canh_p[i].get("noiDung") or []
        return " ; ".join([str(c.get("loi_thoai") or ""), str(c.get("tieu_de_canh") or "")] +
                          [str(x) for x in (nd if isinstance(nd, list) else [nd])] +
                          [str(x) for x in (nm if isinstance(nm, list) else [nm])])

    def nhac_toi(self, chu):
        """Các đại lượng được nhắc tới trong một đoạn chữ / công thức (giữ nguyên thứ tự xuất hiện theo giọng đọc)."""
        co = lambda *ds: all(ten_chuan(x) in self.diem for x in ds)
        kq = {"goc": [], "tam_giac": [], "mat": [], "doan": [], "diem": [], "tron": False}
        chu = re.sub(r"\\(?:text|mathrm)\{", " {", str(chu))
        bo = []
        # 1) Hình chóp S.ABCD / S.ABC
        for m in RE_CHOP.finditer(chu):
            g = [ten_chuan(x) for x in m.groups() if x]
            if len(g) >= 4 and co(*g):
                s_dinh, day = g[0], g[1:]
                kq["diem"].extend(g)
                if len(day) == 3:
                    kq["tam_giac"].append(tuple(day))
                else:
                    kq["mat"].append(tuple(day))
                for j in range(len(day)):
                    kq["doan"].append(khoa_doan(day[j], day[(j + 1) % len(day)]))
                for d_x in day:
                    kq["doan"].append(khoa_doan(s_dinh, d_x))
                bo.append(m.span())
        for m in RE_GOC.finditer(chu):
            if co(*m.groups()):
                kq["goc"].append(self.kgoc(*m.groups()))
                kq["diem"].extend(ten_chuan(x) for x in m.groups())
                bo.append(m.span())
        for m in RE_TAM_GIAC.finditer(chu):
            if co(*m.groups()):
                pts = tuple(ten_chuan(x) for x in m.groups())
                kq["tam_giac"].append(pts)
                kq["diem"].extend(pts)
                for j in range(3):
                    kq["doan"].append(khoa_doan(pts[j], pts[(j + 1) % 3]))
                bo.append(m.span())
        for m in RE_MAT.finditer(chu):
            g = [ten_chuan(x) for x in m.groups() if x]
            if co(*g):
                kq["mat"].append(tuple(g))
                kq["diem"].extend(g)
                for j in range(len(g)):
                    kq["doan"].append(khoa_doan(g[j], g[(j + 1) % len(g)]))
                bo.append(m.span())
        sach = list(chu)
        for a, b in bo:
            for j in range(a, b):
                sach[j] = " "
        sach = "".join(sach)
        # 2) Đa giác 3-4 đỉnh viết liền không ngoặc (ví dụ: đáy ABCD, hình vuông ABCD, tam giác ABC)
        bo_dg = []
        for m in RE_DA_GIAC.finditer(sach):
            g = [ten_chuan(x) for x in m.groups() if x]
            if len(g) >= 3 and len(set(g)) == len(g) and co(*g):
                if len(g) == 3:
                    kq["tam_giac"].append(tuple(g))
                else:
                    kq["mat"].append(tuple(g))
                kq["diem"].extend(g)
                for j in range(len(g)):
                    kq["doan"].append(khoa_doan(g[j], g[(j + 1) % len(g)]))
                bo_dg.append(m.span())
        sach_dg = list(sach)
        for a, b in bo_dg:
            for j in range(a, b):
                sach_dg[j] = " "
        sach = "".join(sach_dg)
        for m in RE_DOAN.finditer(sach):
            a, b = m.groups()
            if co(a, b) and ten_chuan(a) != ten_chuan(b):
                kq["doan"].append(khoa_doan(a, b))
                kq["diem"].extend((ten_chuan(a), ten_chuan(b)))
        for m in RE_DIEM_DON.finditer(re.sub(RE_DOAN, " ", sach)):
            if co(m.group(1)):
                kq["diem"].append(ten_chuan(m.group(1)))
        if re.search(r"(?i:đường\s+tròn)|\\odot|nội\s+tiếp|ngoại\s+tiếp", chu):
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
        # Đồng bộ tiến độ xuất hiện của đường kẻ phụ / ký hiệu góc / điểm phụ theo đúng cảnh giọng đọc nhắc tới đầu tiên:
        canh_dau_doan = {}
        canh_dau_diem = {}
        for i, nt in enumerate(self.nhac):
            for d in nt["doan"]:
                canh_dau_doan.setdefault(d, i)
            for x in nt["diem"]:
                canh_dau_diem.setdefault(x, i)
        # Các đỉnh thuộc hình cơ bản (nét liền 'canh', nét khuất 'khuat', đường tròn 'tron')
        dinh_co_ban = set()
        for p in self.pt:
            if p["kieu"] == "doan" and p.get("kieu_net") in ("canh", "khuat"):
                dinh_co_ban.update(p["khoa"])
            elif p["kieu"] == "tron":
                dinh_co_ban.update(p["khoa"])
        # Đường kẻ phụ ('phu') hoặc ký hiệu vuông góc/bằng nhau: nếu giọng đọc mới giới thiệu ở cảnh i_nhac > p["canh"],
        # dời lịch vẽ sang đúng cảnh i_nhac để không vẽ đường phụ trước khi giọng đọc nhắc tới!
        for p in self.pt:
            if p["kieu"] == "doan" and p.get("kieu_net") == "phu":
                d = p["khoa"]
                if d in canh_dau_doan:
                    p["canh"] = canh_dau_doan[d]
                else:
                    # Nếu đoạn phụ nối tới điểm phụ chỉ xuất hiện ở cảnh sau
                    c_max = max((canh_dau_diem.get(x, p["canh"]) for x in d), default=p["canh"])
                    p["canh"] = max(p["canh"], c_max)
            elif p["kieu"] in ("vuong", "goc", "bang"):
                ds_x = self.dinh_cua(p)
                if any(x not in dinh_co_ban for x in ds_x):
                    c_max = max((canh_dau_diem.get(x, p["canh"]) for x in ds_x), default=p["canh"])
                    p["canh"] = max(p["canh"], c_max)
        # Điểm xuất hiện khi phần tử đầu tiên chứa nó xuất hiện, hoặc khi được giọng đọc nhắc tên
        self.diem_canh = {}
        for x in self.diem:
            if x not in dinh_co_ban and x in canh_dau_diem:
                self.diem_canh[x] = canh_dau_diem[x]
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

RE_CHU_VIET_CO_DAU = re.compile(r"(?:[A-Za-zÀ-ÖØ-öø-ɏḀ-ỹ]*[À-ÖØ-öø-ɏḀ-ỹ][A-Za-zÀ-ÖØ-öø-ɏḀ-ỹ]*)(?:[ ,]+[a-zà-öø-ɏḀ-ỹ]+)*")
RE_TU_VIET_KHONG_DAU = re.compile(
    r"(?i)\b(vì|do|nên|và|là|có|ta|suy\s+ra|suy|ra|cho|khi|theo|hay|cùng|tại|với|tương\s+tự|mà|thì|của|gọi|xét|vậy|từ|thay|trong|đặt|với\s+mọi)\b"
)


def chuan_tex(s):
    s = str(s)
    for a, b in THAY_UNICODE.items():
        s = s.replace(a, b)
    s = s.replace(r"\tfrac", r"\frac").replace(r"\dfrac", r"\frac")
    s = s.replace("{,}", "{,}")
    # chữ Việt nằm ngoài \text{...} -> bọc vào \text{} (giữ nguyên khoảng trắng hai đầu để không dính chữ với biến toán học)
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
        m = RE_CHU_VIET_CO_DAU.match(s[i:])
        if m and m.group(0) and (i == 0 or s[i - 1] != "\\"):
            ra.append(r"\text{%s}" % m.group(0))
            i += m.end()
            continue
        m = RE_TU_VIET_KHONG_DAU.match(s[i:])
        if m and (i == 0 or not re.match(r"[A-Za-z\\]", s[i - 1])):
            ra.append(r"\text{%s}" % m.group(0))
            i += m.end()
            continue
        ra.append(s[i])
        i += 1
    s = "".join(ra)
    # Gộp các \text{...} liền nhau và giữ khoảng trắng giữa \text{...} với ký hiệu toán liền trước/sau
    while re.search(r"\\text\{([^{}]*)\}\s*\\text\{([^{}]*)\}", s):
        s = re.sub(r"\\text\{([^{}]*)\}\s*\\text\{([^{}]*)\}", r"\\text{\1 \2}", s)
    s = re.sub(r"([A-Za-z0-9)\]}])\s+\\text\{(?![\s])", r"\1\\text{ ", s)
    s = re.sub(r"(?<![\s])\}\s+([A-Za-z0-9(\\[\\{]|\\[a-zA-Z]+)", r" } \1", s)
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


PHONG_CHU_SO = False   # True khi công thức dùng phông chữ của video (nap_phong): chữ số, dấu = + · ° cũng phải theo phông đó


def phong_hoa(tex):
    """mathastext chỉ đổi phông chữ cái; chữ số và dấu = + · ° vẫn là phông LaTeX có chân -> bọc chúng bằng phông chữ của
    video (\\mathrm / \\text) để cả dòng công thức đồng nhất như video xác suất / thực tế. Bỏ qua mã màu, tên lệnh, \\text{}."""
    out, i, n = [], 0, len(tex)
    while i < n:
        m = re.match(r"\\textcolor\[HTML\]\{[0-9A-Fa-f]{6}\}", tex[i:])
        if m:
            out.append(m.group(0)); i += m.end(); continue
        m = re.match(r"\\(?:text|mathrm|textbf|textit)\{", tex[i:])
        if m:
            sau, mo, j = tex[i + m.end():], 1, 0
            while j < len(sau) and mo:
                mo += {"{": 1, "}": -1}.get(sau[j], 0)
                j += 1
            out.append(tex[i:i + m.end() + j]); i += m.end() + j; continue
        m = re.match(r"\\cdot(?![a-zA-Z])", tex[i:])
        if m:
            out.append(r"\mathbin{\text{·}}"); i += m.end(); continue
        m = re.match(r"\^\s*\{?\\circ\}?", tex[i:])
        if m:
            out.append(r"\text{°}"); i += m.end(); continue
        m = re.match(r"\\[a-zA-Z]+", tex[i:])
        if m:
            out.append(m.group(0)); i += m.end(); continue
        m = re.match(r"\d+(?:\{,\}\d+|[.,]\d+)?", tex[i:])
        if m:
            out.append(r"{\mathrm{%s}}" % m.group(0).replace("{,}", ",").replace(",", "{,}")); i += m.end(); continue
        ch = tex[i]
        if ch == "=":
            out.append(r"\mathrel{\text{=}}")
        elif ch == "+":
            out.append(r"\mathbin{\text{+}}")
        else:
            out.append(ch)
        i += 1
    return "".join(out)


def tao_cong_thuc(tex, co=40):
    try:
        return MathTex(phong_hoa(tex) if PHONG_CHU_SO else tex, tex_template=TEX, font_size=co)
    except Exception as e:  # noqa: BLE001
        print("  TeX lỗi (%s) -> dùng chữ thường: %s" % (str(e)[:80], tex[:80]))
        try:
            return MathTex(chuan_tex(bo_tex(tex)), tex_template=TEX, font_size=co)
        except Exception:  # noqa: BLE001
            return Text(bo_tex(tex), font=PHONG, weight="ULTRABOLD", font_size=co * 0.8, color=TRANG)


def khoi_chu(chu, co, rong, cao, mau=TRANG):
    """Đoạn chữ tiếng Việt tự xuống dòng, vừa khung rộng x cao."""
    tu = chu.split()
    mau_do = Text(chu[:60], font=PHONG, weight="ULTRABOLD", font_size=co)
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
    t = VGroup(*[Text(d, font=PHONG, weight="ULTRABOLD", font_size=co, color=mau) for d in dong[:9]]).arrange(DOWN, buff=co * 0.006)
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
        # Phóng to hình vẽ ở chính giữa màn hình, chừa biên vừa đủ (~0.62 đơn vị) cho nhãn đỉnh không chạm mép
        k = min((HINH_RONG - 1.25) / max(1e-6, x1 - x0), (HINH_TREN - HINH_DUOI - 1.05) / max(1e-6, y1 - y0))
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        ty = (HINH_TREN + HINH_DUOI) / 2
        self.P = {n: np.array([(x * 8.8 - cx) * k, (-y * 6.0 - cy) * k + ty, 0.0]) for n, (x, y) in mo.diem.items()}
        self.P0 = {n: p.copy() for n, p in self.P.items()}
        self.ti_le = k
        self.tam = np.mean(list(self.P.values()), axis=0)
        self._chuan_bi_chieu_sau_3d()
        self.goc_doc = 0.0
        if mo.la_khong_gian:
            canh = [p["khoa"] for p in mo.pt if p.get("kieu_net") in ("canh", "khuat")]
            # Ưu tiên góc gốc khi điểm như nhau. Chấm cả đỉnh sát lòng cạnh khác
            # (hai đoạn chiếu gần trùng) lẫn đoạn bị co ngắn.
            def diem_che(goc):
                h = self.chieu_dinh(goc)
                phat = 0.0
                for a, b in canh:
                    ab = h[b] - h[a]
                    dai2 = float(ab @ ab)
                    phat += max(0, 0.45 - math.sqrt(dai2))
                    for n, q in h.items():
                        if n in (a, b):
                            continue
                        t = float((q - h[a]) @ ab) / max(1e-9, dai2)
                        if 0 <= t <= 1:
                            phat += max(0, 0.22 - np.linalg.norm(q - h[a] - t * ab))
                return phat + abs(goc) * 0.08
            self.goc_doc = min(map(math.radians, [0, 6, -6, 12, -12]), key=diem_che)
            self.P = self.chieu_dinh(self.goc_doc)

    def _chuan_bi_chieu_sau_3d(self):
        """Khởi tạo độ sâu 3D (Z_sau) cho từng đỉnh của khối đa diện không gian để phục vụ xoay 3D trực quan,
        đảm bảo các điểm thẳng hàng / trung điểm / chân đường cao luôn giữ nguyên tính thẳng hàng ở mọi góc xoay."""
        mo = self.mo
        self.Z_sau = {n: 0.0 for n in self.P0}
        if not getattr(mo, "la_khong_gian", False) or len(self.P0) < 4:
            return
        xs0 = [float(p[0]) for p in self.P0.values()]
        ys0 = [float(p[1]) for p in self.P0.values()]
        rx = max(0.8, (max(xs0) - min(xs0)) * 0.42)
        y_tb = sum(ys0) / len(ys0)
        if mo.diem_3d and len(mo.diem_3d) >= 3:
            ys_3d = [float(v[1]) for v in mo.diem_3d.values()]
            y3_tb = sum(ys_3d) / len(ys_3d)
            span_y3 = max(1e-4, max(ys_3d) - min(ys_3d))
            for n in self.P0:
                if n in mo.diem_3d:
                    self.Z_sau[n] = ((float(mo.diem_3d[n][1]) - y3_tb) / span_y3) * rx * 1.15
        else:
            # Khôi phục độ sâu 3D từ cấu trúc cạnh khuất (nằm phía sau: Z_sau > 0) và cạnh nhìn thấy (phía trước: Z_sau < 0)
            dinh_khuat = set()
            dem_khuat = {n: 0 for n in self.P0}
            dem_canh = {n: 0 for n in self.P0}
            for p in mo.pt:
                if p["kieu"] == "doan":
                    a, b = p["khoa"]
                    if p.get("kieu_net") == "khuat":
                        dinh_khuat.update((a, b))
                        dem_khuat[a] = dem_khuat.get(a, 0) + 1
                        dem_khuat[b] = dem_khuat.get(b, 0) + 1
                    elif p.get("kieu_net") == "canh":
                        dem_canh[a] = dem_canh.get(a, 0) + 1
                        dem_canh[b] = dem_canh.get(b, 0) + 1
            y_max = max(ys0)
            y_min = min(ys0)
            span_y = max(1e-4, y_max - y_min)
            for n, p0 in self.P0.items():
                # Đỉnh chóp cao nhất ở gần trục tâm (Z_sau ~ 0); các đỉnh đáy phía sau có Z_sau > 0, phía trước Z_sau < 0
                if p0[1] >= y_max - span_y * 0.15:
                    self.Z_sau[n] = 0.05 * rx
                elif dem_khuat.get(n, 0) >= 2 or (n in dinh_khuat and p0[1] > y_tb):
                    self.Z_sau[n] = 0.55 * rx
                elif p0[1] <= y_min + span_y * 0.22:
                    self.Z_sau[n] = -0.52 * rx
                else:
                    self.Z_sau[n] = ((float(p0[1]) - y_tb) / span_y) * 0.45 * rx
        # Nội suy tuyến tính Z_sau cho mọi điểm phụ nằm trên đoạn thẳng nối 2 đỉnh chính (giữ thẳng hàng 100% khi xoay 3D)
        doan_chinh = [p["khoa"] for p in mo.pt if p["kieu"] == "doan" and p.get("kieu_net") in ("canh", "khuat")]
        for n, p0 in self.P0.items():
            for a, b in doan_chinh:
                if n in (a, b) or n in (mo.diem_3d or {}):
                    continue
                pa, pb = self.P0[a][:2], self.P0[b][:2]
                ab = pb - pa
                d2 = float(np.dot(ab, ab))
                if d2 < 1e-6:
                    continue
                t = float(np.dot(p0[:2] - pa, ab)) / d2
                if 0.02 <= t <= 0.98:
                    kc = float(np.linalg.norm(p0[:2] - (pa + t * ab)))
                    if kc < 0.08:
                        self.Z_sau[n] = (1.0 - t) * self.Z_sau[a] + t * self.Z_sau[b]
                        break

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

    def vi_tri_nhan(self, n, da_dat):
        """Chỗ đặt nhãn điểm: thử 36 hướng x 4 bán kính quanh điểm, kiểm tra toàn bộ khung bao chữ (bounding box 4 góc + tâm)
        với mọi đoạn thẳng, đường tròn, nhãn cạnh, các đỉnh khác và các nhãn đã đặt, đồng thời tránh khe góc nhọn ->
        tên điểm tuyệt đối không chồng chéo lên nhau hoặc đè lên cạnh trừ khi bất khả kháng."""
        p = self.P[n][:2]
        goc = self.huong_nhan(n)[:2]
        doan = [(self.P[q["khoa"][0]][:2], self.P[q["khoa"][1]][:2]) for q in self.mo.pt if q["kieu"] == "doan" and q.get("kieu_net") != "con"]
        tia_ke = []
        for q in self.mo.pt:
            if q["kieu"] == "doan" and q.get("kieu_net") != "con" and n in q["khoa"]:
                m_ke = q["khoa"][1] if q["khoa"][0] == n else q["khoa"][0]
                v_ke = self.P[m_ke][:2] - p
                norm_ke = float(np.linalg.norm(v_ke))
                if norm_ke > 1e-6:
                    tia_ke.append(v_ke / norm_ke)
        tron = []
        for q in self.mo.pt:
            if q["kieu"] == "tron":
                o, r = self.tam_ban_kinh(q["khoa"])
                if o is not None:
                    tron.append((o[:2], r))
        diem = [self.P[m][:2] for m in self.P if m != n]

        def kc_doan(c, a, b):
            ab = b - a
            d2 = float(np.dot(ab, ab))
            t = 0.0 if d2 < 1e-9 else max(0.0, min(1.0, float(np.dot(c - a, ab) / d2)))
            return float(np.linalg.norm(c - (a + t * ab)))

        rx = 0.28 if ("'" in n or "_" in n) else 0.22
        ry = 0.22
        mau_kiem = [
            np.array([0.0, 0.0]),
            np.array([-rx, -ry]), np.array([rx, -ry]),
            np.array([-rx, ry]), np.array([rx, ry]),
            np.array([0.0, -ry]), np.array([0.0, ry]),
            np.array([-rx, 0.0]), np.array([rx, 0.0]),
        ]

        def kc_hop_doan(c, a, b):
            return min(kc_doan(c + dv, a, b) for dv in mau_kiem)

        tot, chon = -1e9, p + goc * 0.44
        lech = [0.0] + [d * j * math.pi / 18 for j in range(1, 19) for d in (1, -1)][:35]
        for dg in lech:
            g = math.atan2(goc[1], goc[0]) + dg
            u = np.array([math.cos(g), math.sin(g)])
            cos_max = max((float(np.dot(u, tk)) for tk in tia_ke), default=-1.0)
            phat_tia = 3.5 * max(0.0, cos_max - 0.80)
            for r in (0.44, 0.54, 0.66, 0.78):
                c = p + u * r
                kc_canh = min([kc_hop_doan(c, a, b) for a, b in doan] + [abs(float(np.linalg.norm(c - o)) - rr) - rx * 0.6 for o, rr in tron] + [9.0])
                kc_diem = min([float(np.linalg.norm(c - d)) - rx * 0.7 for d in diem] + [9.0])
                kc_nhan = min([float(np.linalg.norm(c - d)) - rx * 1.45 for d in da_dat] + [9.0])
                kc = min(kc_canh, kc_diem, kc_nhan)
                phat_de = 0.0
                if kc_canh < 0.08:
                    phat_de += (0.08 - kc_canh) * 28.0
                if kc_nhan < 0.10:
                    phat_de += (0.10 - kc_nhan) * 35.0
                if kc_diem < 0.12:
                    phat_de += (0.12 - kc_diem) * 25.0
                phat_bien = 0.0
                if abs(c[0]) > HINH_RONG / 2 - 0.25:
                    phat_bien += (abs(c[0]) - (HINH_RONG / 2 - 0.25)) * 12.0
                if c[1] > HINH_TREN - 0.20:
                    phat_bien += (c[1] - (HINH_TREN - 0.20)) * 12.0
                if c[1] < HINH_DUOI + 0.20:
                    phat_bien += ((HINH_DUOI + 0.20) - c[1]) * 12.0
                diem_so = min(kc, 0.36) * 14.0 - 0.55 * (1.0 - float(np.dot(u, goc))) - (r - 0.44) * 2.2 - phat_tia - phat_de - phat_bien
                if diem_so > tot:
                    tot, chon = diem_so, c
        return np.array([chon[0], chon[1], 0.0])

    def dung_phan_tu(self):
        mo = self.mo
        self.hinh = {}       # (kieu, khoa) -> mobject
        self.nhan_diem = {}
        self.cham = {}
        da_dat_canh = []
        for p in mo.pt:
            k = (p["kieu"], p["khoa"])
            m = None
            if p["kieu"] == "doan":
                a, b = (self.P[x] for x in p["khoa"])
                if p["kieu_net"] in ("khuat", "phu"):
                    # Cạnh khuất (không gian 3D) và đường thẳng phụ kẻ thêm: vẽ bằng nét đứt rõ ràng (dash_length=0.18, dashed_ratio=0.56)
                    m = DashedLine(a, b, dash_length=0.18, dashed_ratio=0.56, stroke_width=3.5,
                                   color=NET_DUT if p["kieu_net"] == "phu" else XAM)
                else:
                    m = Line(a, b, stroke_width=4.2, color=TRANG)
                    if p["kieu_net"] == "con":
                        m.set_stroke(opacity=0)
                if p.get("nhan"):
                    huong = np.cross(b - a, [0, 0, 1])
                    huong = huong / max(1e-6, np.linalg.norm(huong))
                    if np.dot((a + b) / 2 + huong - self.tam, huong) < np.dot((a + b) / 2 - self.tam, huong):
                        huong = -huong
                    vt_nhan_c = (a + b) / 2 + huong * 0.34
                    t = tao_cong_thuc(chuan_tex(p["nhan"]), 30).move_to(vt_nhan_c)
                    da_dat_canh.append(vt_nhan_c[:2])
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
        # Đặt nhãn đỉnh qua 2 lượt tối ưu (relaxation) để các nhãn đỉnh kế cận tự tránh nhau hoàn toàn
        vt_tam = {}
        ds_dinh = list(self.P.keys())
        for luot in range(2):
            for n in ds_dinh:
                da_dat = list(da_dat_canh) + [vt_tam[m][:2] for m in ds_dinh if m != n and m in vt_tam]
                vt_tam[n] = self.vi_tri_nhan(n, da_dat)
        self.lech_nhan = {}
        for n, p in self.P.items():
            self.cham[n] = Dot(p, radius=0.065, color=TRANG)
            vt = vt_tam[n]
            self.lech_nhan[n] = vt - p
            self.nhan_diem[n] = MathTex(tex_ten(n), tex_template=TEX, font_size=36, color=TRANG).move_to(vt)

    def chieu_dinh(self, goc_rad):
        """Chiếu tọa độ 3D của khối đa diện tại góc xoay goc_rad (radian) quanh trục thẳng đứng đi qua tâm khối."""
        cx, cy = float(self.tam[0]), float(self.tam[1])
        c_th, s_th = math.cos(goc_rad), math.sin(goc_rad)
        kappa = 0.25  # độ nghiêng phối cảnh trục đứng khi xoay 3D
        diem = {}
        for n, p0 in self.P0.items():
            dx = float(p0[0]) - cx
            dy = float(p0[1]) - cy
            dz = float(self.Z_sau.get(n, 0.0))
            nx = cx + dx * c_th + dz * s_th
            ny = cy + dy + kappa * (dx * s_th + dz * (c_th - 1.0))
            diem[n] = np.array([nx, ny, 0.0])
        return diem

    def cap_nhat_goc_3d(self, goc_rad):
        self.P = self.chieu_dinh(self.goc_doc + goc_rad)

        for p in self.mo.pt:
            k = (p["kieu"], p["khoa"])
            m = self.hinh.get(k)
            if m is None or m not in self.tren_man:
                continue
            if p["kieu"] == "doan":
                a, b = (self.P[x] for x in p["khoa"])
                if np.linalg.norm(b - a) < 1e-4:
                    continue
                net = self.net_chinh(m)
                net.put_start_and_end_on(a, b)
                if m is not net and len(m) > 1:
                    huong = np.cross(b - a, [0, 0, 1])
                    huong = huong / max(1e-6, np.linalg.norm(huong))
                    if np.dot((a + b) / 2 + huong - self.tam, huong) < np.dot((a + b) / 2 - self.tam, huong):
                        huong = -huong
                    m[1].move_to((a + b) / 2 + huong * 0.32)
            elif p["kieu"] == "mien":
                pts = [self.P[x] for x in p["dinh"]]
                if len(pts) >= 3:
                    m.set_points_as_corners(pts + [pts[0]])
            elif p["kieu"] == "vuong":
                a, o, b = (self.P[x] for x in p["ba"])
                s = 0.26
                u = (a - o) / max(1e-6, np.linalg.norm(a - o)) * s
                w = (b - o) / max(1e-6, np.linalg.norm(b - o)) * s
                m.set_points_as_corners([o + u, o + u + w, o + w])

        for k, m in list(self.hinh.items()):
            if k[0] == "mien" and m in self.tren_man and k not in self.mo.chi_so:
                pts = [self.P[x] for x in k[1] if x in self.P]
                if len(pts) >= 3:
                    m.set_points_as_corners(pts + [pts[0]])

        for n in self.P:
            if self.cham[n] in self.tren_man:
                self.cham[n].move_to(self.P[n])
            if self.nhan_diem[n] in self.tren_man:
                self.nhan_diem[n].move_to(self.P[n] + self.lech_nhan.get(n, np.array([0.0, 0.36, 0.0])))

    def xoay_3d(self, ds_goc_do, run_time=1.8):
        """Xoay 3D mượt mà khối đa diện qua chuỗi các góc độ (độ) để học sinh quan sát trực quan hình không gian."""
        if not getattr(self.mo, "la_khong_gian", False) or len(ds_goc_do) < 2:
            return
        moc_rad = [math.radians(float(g)) for g in ds_goc_do]
        n_doan = len(moc_rad) - 1
        khung_ao = Dot(self.tam, radius=0.001, fill_opacity=0, stroke_opacity=0)
        self.add(khung_ao)

        def _cap_nhat(_mob, alpha):
            pos = max(0.0, min(float(n_doan), float(alpha) * n_doan))
            idx = min(n_doan - 1, int(pos))
            t_con = pos - idx
            # Nội suy mượt cosine (smoothstep) giữa hai góc
            t_muot = 0.5 - 0.5 * math.cos(t_con * math.pi)
            goc = moc_rad[idx] + (moc_rad[idx + 1] - moc_rad[idx]) * t_muot
            self.cap_nhat_goc_3d(goc)

        self.choi(UpdateFromAlphaFunc(khung_ao, _cap_nhat), run_time=run_time)
        self.cap_nhat_goc_3d(moc_rad[-1])
        self.remove(khung_ao)

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
    # Đồng hồ chuẩn = số khung hình đã ghi (renderer.time). Mọi động tác của một cảnh bị ép nằm trong đúng khoảng thời gian
    # giọng đọc của cảnh đó (t0 .. t0 + D): cảnh ngắn mà nhiều thứ phải vẽ thì động tác chạy nhanh lại, KHÔNG BAO GIỜ tràn
    # sang cảnh sau -> lớp Manim luôn khớp từng khung với phụ đề / giọng của phần vỏ Remotion.
    def _bay_gio(self):
        return self.renderer.time - self.t0

    def choi(self, *anim, run_time=1.0):
        anim = [a for a in anim if a is not None]
        if not anim:
            return
        con = self.D - 1.0 / self.mo.fps - self._bay_gio()
        rt = max(1.05 / self.mo.fps, min(max(0.15, run_time), con))
        if rt < run_time * 0.6:
            self.canh_bao.add("Cảnh %d chật thời gian: động tác bị nén" % (self.i_canh + 1))
        self.play(*anim, run_time=rt)
        self.da = self._bay_gio()

    def doi_toi(self, t):
        w = t - self._bay_gio()
        if w > 0.5 / self.mo.fps:
            self.wait(w)
        self.da = self._bay_gio()

    # ---------- màu / làm nổi ----------
    def net_chinh(self, m):
        return m[0] if isinstance(m, VGroup) and getattr(m, "la_co_nhan", False) else m

    def ap_trang_thai(self, i, dong=None):
        """Trả về các animation đưa hình về trạng thái 'cảnh i':
        TUYỆT ĐỐI KHÔNG LÀM MỜ các cạnh/đỉnh xung quanh (giữ toàn bộ hình rõ nét 100%, mo_do = 1.0).
        Làm nổi bật phần đang xét bằng màu sắc rực rỡ của Manim, tăng độ dày nét vẽ, tô miền trong suốt và nhấn sáng đỉnh."""
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
                self.hinh[km] = Polygon(*[self.P[x] for x in t], stroke_width=0, fill_color=mau_m, fill_opacity=0.34)
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
            mo_do = 1.0  # Không bao giờ làm mờ các nét xung quanh
            net = self.net_chinh(m)
            if k[0] == "doan":
                kieu_net = mo.pt[mo.chi_so[k]]["kieu_net"] if k in mo.chi_so else "canh"
                mau_mac_dinh = NET_DUT if (isinstance(net, DashedLine) and kieu_net == "phu") else (XAM if isinstance(net, DashedLine) else TRANG)
                mau = mo.mau.get(k, VANG) if duoc else (mo.mau.get(k, TRANG) if k in self.da_to else mau_mac_dinh)
                if duoc:
                    self.da_to.add(k)
                # Cạnh đang xét: dày nổi bật (8.5 cho nét liền, 5.8 cho nét đứt); cạnh không xét: giữ nguyên độ rõ 100% ở nét chuẩn
                rong = (5.8 if isinstance(net, DashedLine) else 8.5) if (duoc and co_tap_trung) else (3.5 if isinstance(net, DashedLine) else 4.2)
                if kieu_net == "con":
                    if k not in self.da_to and not duoc:
                        mo_do = 0.0
                    rong += 1.8     # đoạn con nằm đè lên cạnh mẹ: dày hơn để nổi bật màu riêng
                anim.append(net.animate.set_stroke(color=mau, width=rong, opacity=mo_do))
                if net is not m:
                    anim.append(m[1].animate.set_opacity(1.0).set_color(VANG if duoc else (mo.mau.get(k, TRANG) if k in self.da_to else TRANG)))
            elif k[0] == "mien":
                anim.append(m.animate.set_fill(opacity=0.36 if duoc else 0.12))
            elif k[0] == "tron":
                anim.append(m.animate.set_stroke(color=VANG if duoc else TRON, opacity=1.0, width=5.5 if (duoc and co_tap_trung) else 3.2))
            elif k[0] == "vuong" and duoc:
                anim.append(m.animate.set_stroke(color=mo.mau.get(("goc", k[1]), VANG), width=4.5, opacity=1.0))
            else:
                anim.append(m.animate.set_opacity(1.0))
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
                # Nhãn điểm và chấm đỉnh luôn rõ nét 100% (op = 1.0); đỉnh đang xét rực sáng màu vàng và phóng nhẹ chấm đỉnh
                la_dinh_xet = co_tap_trung and (n in dang_xet)
                anim.append(nh.animate.set_opacity(1.0).set_color(VANG if la_dinh_xet else TRANG))
                anim.append(self.cham[n].animate.set_opacity(1.0).set_color(VANG if la_dinh_xet else TRANG))
        return anim, sang

    # ---------- công thức ----------
    def dong_tex(self, s):
        return self.mo.to_mau_tex(chuan_tex(s))

    def tao_dong(self, s):
        """Một dòng công thức. Dài quá (phải thu nhỏ dưới ~80%) thì tách phần lý do / hệ quả xuống dòng thứ hai
        (tại "\\;\\text{(vì ...)}", "\\Rightarrow", "\\quad"), giữ chữ to dễ đọc."""
        rong = CT_RONG - 0.4
        m = tao_cong_thuc(self.dong_tex(s), CO_CT)
        if m.width <= rong * 1.25:
            return vua_rong(m, rong)
        for mau_tach in (r"\\[;,]?\s*\\text\{\s*\(", r"\s*\\Rightarrow\s*", r"\s*\\quad\s*", r"\s*\\text\{\s*(?:vì|do|nên)\b"):
            k = re.search(mau_tach, s)
            if k and 3 < k.start() < len(s) - 3:
                dau, sau = s[:k.start()], s[k.start():].lstrip()
                sau = re.sub(r"^\\[;,]\s*", "", sau)
                m1 = vua_rong(tao_cong_thuc(self.dong_tex(dau), CO_CT), rong)
                m2 = vua_rong(tao_cong_thuc(self.dong_tex(sau), CO_CT * 0.86), rong)
                return VGroup(m1, m2).arrange(DOWN, buff=0.12)
        return vua_rong(m, rong)

    def tach_tam_giac(self, ds):
        """Hai tam giác được so sánh: sao chép, tô màu, đặt cạnh nhau phía trên vùng công thức."""
        g = VGroup()
        for t in ds[:2]:
            mau = self.mo.mau.get(("mien", khoa_da_giac(t)), MAU_MIEN[len(g)])
            pts = [self.P[x] for x in t]
            tg = Polygon(*pts, color=mau, stroke_width=4, fill_color=mau, fill_opacity=0.3)
            nh = VGroup(*[MathTex(tex_ten(x), tex_template=TEX, font_size=30, color=TRANG).move_to(self.P[x] + (self.P[x] - np.mean(pts, axis=0)) / max(1e-6, np.linalg.norm(self.P[x] - np.mean(pts, axis=0))) * 0.3) for x in t])
            g.add(VGroup(tg, nh))
        return g

    # ---------- thẻ (khung chữ) cùng kiểu thẻ của video xác suất / thực tế ----------
    def the_khung(self, noi_dung, nhan="", rong=CT_RONG + 0.3, dem=0.24):
        """Khung bo góc nền tối trong mờ, viền màu nhấn; nhãn viên thuốc (vd KIẾN THỨC) ở góc trên trái,
        nội dung nằm NGAY DƯỚI nhãn (không đè)."""
        pill = None
        if nhan:
            chu = Text(nhan, font="Montserrat", weight="ULTRABOLD", font_size=22, color=NEN_THE)
            vien = RoundedRectangle(width=chu.width + 0.34, height=chu.height + 0.18, corner_radius=0.13, stroke_width=0,
                                    fill_color=NHAN, fill_opacity=1)
            chu.move_to(vien)
            pill = VGroup(vien, chu)
        cao = noi_dung.height + 2 * dem + (pill.height + 0.1 if pill else 0)
        khung = RoundedRectangle(width=rong, height=cao, corner_radius=0.22, stroke_color=NHAN, stroke_width=2.2,
                                 stroke_opacity=0.55, fill_color=NEN_THE, fill_opacity=0.72)
        g = VGroup(khung)
        tren = khung.get_top()[1] - dem * 0.7
        if pill:
            pill.move_to([khung.get_left()[0] + 0.25 + pill.width / 2, tren - pill.height / 2, 0])
            g.add(pill)
            tren -= pill.height + 0.1
        noi_dung.move_to([0, tren - noi_dung.height / 2, 0])
        g.add(noi_dung)
        return g

    # ---------- dựng cả video ----------
    def construct(self):
        mo = self.mo
        self.chuan_bi_toa_do()
        self.dung_phan_tu()
        self.tren_man = set()
        self.da_to = set()
        if self.bia:
            return self.dung_bia()
        self.t0, self.D, self.i_canh = 0.0, 1e9, 0
        self.da = 0.0
        self.canh_bao = set()
        self.su_kien = []
        tong = 0.0
        cu = VGroup()     # thẻ / công thức đang trên màn
        tach = None
        fps = mo.fps
        for i, cp in enumerate(mo.canh_p):
            D = cp["soFrame"] / fps
            self.t0 = cp["batDau"] / fps
            self.D = D
            self.i_canh = i
            self.da = self._bay_gio()
            ck = mo.canh_k[i]
            cau = cp.get("cau") or []
            # 1) dọn bước trước (tiêu đề bước, thanh bước, phụ đề do phần vỏ chung của Remotion lo)
            # Lưu ý: KHÔNG hiện thẻ ĐỀ BÀI lên màn hình — đề bài do giọng đọc đảm nhận và hình vẽ hiển thị thật to ở giữa màn hình
            ra = [FadeOut(cu, shift=UP * 0.25)] if len(cu) else []
            if tach is not None:
                ra.append(FadeOut(tach))
                tach = None
            if ra:
                self.choi(*ra, run_time=0.35)
            cu = VGroup()

            # 2) Vẽ các điểm và nét mới của cảnh này ĐỒNG BỘ THEO TIẾN ĐỘ GIỌNG NÓI (cau):
            # Giọng đọc nhắc tới đỉnh/cạnh nào ở câu nào thì vẽ điểm và cạnh đó ngay đúng mốc thời gian câu nói đó!
            moi = [p for p in mo.pt if p["canh"] == i and (p["kieu"], p["khoa"]) in self.hinh]
            moi_doan = [p for p in moi if p["kieu"] == "doan"]
            moi_khac = [p for p in moi if p["kieu"] != "doan"]
            diem_moi = [n for n, c in mo.diem_canh.items() if c == i and n in self.P]

            # Ánh xạ từng điểm mới và đoạn mới vào mốc thời gian câu nói đầu tiên nhắc tới nó trong cảnh i
            moc_diem = {}
            moc_doan = {}
            if cau:
                for idx_c, c in enumerate(cau):
                    c_text = str(c.get("text") or c.get("chu") or c.get("cau") or "")
                    t_bat = float(c.get("bat", 0))
                    c_nt = mo.nhac_toi(c_text)
                    for x in c_nt["diem"]:
                        if x in diem_moi and x not in moc_diem:
                            moc_diem[x] = t_bat
                    for d in c_nt["doan"]:
                        if d not in moc_doan:
                            moc_doan[d] = t_bat

            # Sắp xếp thứ tự vẽ các đoạn và điểm mới theo tiến độ giọng nói (t_bat tăng dần)
            def _moc_cua_doan(p):
                d = p["khoa"]
                if d in moc_doan:
                    return moc_doan[d]
                return min((moc_diem.get(x, 0.0) for x in d), default=0.0)

            moi_doan_sx = sorted(moi_doan, key=_moc_cua_doan)
            buoc_ve = []  # list of (t_bat_mong_muon, list_animations)
            # Điểm lẻ được giọng đọc gọi tên sớm trước khi nối đoạn
            for x in list(diem_moi):
                t_x = moc_diem.get(x, 0.0)
                co_doan_cung_cau = any(x in p["khoa"] and abs(_moc_cua_doan(p) - t_x) <= 0.35 for p in moi_doan_sx)
                if not co_doan_cung_cau and x in moc_diem:
                    buoc_ve.append((t_x, [GrowFromCenter(self.cham[x]), Write(self.nhan_diem[x])]))
                    diem_moi.remove(x)
                    self.tren_man.update([self.cham[x], self.nhan_diem[x]])

            for p in moi_doan_sx:
                t_p = _moc_cua_doan(p)
                m = self.hinh[("doan", p["khoa"])]
                pts = [x for x in p["khoa"] if x in diem_moi]
                g = []
                for x in pts:
                    g += [GrowFromCenter(self.cham[x]), Write(self.nhan_diem[x])]
                    diem_moi.remove(x)
                    self.tren_man.update([self.cham[x], self.nhan_diem[x]])
                g.append(Create(self.net_chinh(m)))
                if m is not self.net_chinh(m):
                    g.append(Write(m[1]))
                buoc_ve.append((t_p, g))
                self.tren_man.add(m)

            if diem_moi:
                le = []
                for x in list(diem_moi):
                    le += [GrowFromCenter(self.cham[x]), Write(self.nhan_diem[x])]
                    self.tren_man.update([self.cham[x], self.nhan_diem[x]])
                buoc_ve.insert(0, (0.0, le))

            for p in moi_khac:
                m = self.hinh[(p["kieu"], p["khoa"])]
                t_k = min((moc_diem.get(x, 0.0) for x in mo.dinh_cua(p)), default=0.0)
                buoc_ve.append((t_k, [FadeIn(m)] if p["kieu"] == "mien" else [Create(m)]))
                self.tren_man.add(m)

            buoc_ve.sort(key=lambda item: item[0])
            if buoc_ve:
                ngan_sach = min(D * 0.52, 0.55 + 0.42 * len(buoc_ve))
                rt = max(0.30, min(0.80, ngan_sach / len(buoc_ve)))
                for t_muc, g in buoc_ve:
                    if t_muc > self.da + 0.08 and t_muc < D * 0.60:
                        self.doi_toi(min(t_muc, D * 0.58))
                    self.choi(*g, run_time=rt)
            for p in moi:
                if p["kieu"] == "mien":
                    self.bring_to_back(self.hinh[(p["kieu"], p["khoa"])])

            # 3) Làm nổi bật phần đang xét bằng hiệu ứng Manim (KHÔNG làm mờ các phần xung quanh)
            anim, sang = self.ap_trang_thai(i)
            moi_hien = []
            for k in sang:
                p_k = mo.pt[mo.chi_so[k]] if k in mo.chi_so else None
                if p_k is not None and p_k["canh"] > i and k[0] != "mien":
                    continue
                if k in self.hinh and self.hinh[k] not in self.tren_man:
                    moi_hien.append(FadeIn(self.hinh[k]) if k[0] == "mien" else Create(self.hinh[k]))
                    self.tren_man.add(self.hinh[k])
            if anim or moi_hien:
                self.choi(*(anim + moi_hien), run_time=0.55)
                for k in sang:
                    if k[0] == "mien" and k in self.hinh:
                        self.bring_to_back(self.hinh[k])

            # 3.5) HÌNH HỌC KHÔNG GIAN 3D: xoay 3D trực quan khối đa diện để học sinh quan sát rõ cấu trúc không gian
            if getattr(mo, "la_khong_gian", False) and len(self.tren_man) >= 4:
                con_3d = D - self._bay_gio()
                if i == 1 and con_3d >= 4.5:
                    self.xoay_3d([0, 6, 0], run_time=1.8)

            # 4) Đồng bộ giọng đọc từng câu (cau) & hiện công thức biến đổi bên dưới:
            # Khi giọng đọc nhắc tới điểm/cạnh/góc/tam giác/mặt phẳng nào, Manim phóng tia sáng ShowPassingFlash
            # dọc theo cạnh, tô sáng đỉnh và miền đa giác đúng tiến độ giọng nói (tuyệt đối không làm mờ phần khác)
            dong = mo.cong_thuc(i)
            dap_an = la_dap_an(cp)
            bien_doi = str(cp.get("trinhBay") or "") == "bien_doi" and len(dong) >= 2

            if cau and not dong:
                for c in cau:
                    c_text = str(c.get("text") or c.get("chu") or c.get("cau") or "")
                    t_bat = float(c.get("bat", 0))
                    if not c_text or t_bat <= self.da - 0.15:
                        continue
                    c_nt = mo.nhac_toi(c_text)
                    if any(c_nt[k] for k in ("doan", "goc", "tam_giac", "mat", "diem")):
                        self.doi_toi(min(max(t_bat, self.da), D - 0.35))
                        cau_loe = []
                        for d in c_nt["doan"]:
                            m_d = self.hinh.get(("doan", d))
                            if m_d is not None and m_d in self.tren_man:
                                net_d = self.net_chinh(m_d)
                                mau_d = mo.mau.get(("doan", d), VANG)
                                tia_c = (
                                    DashedLine(*(self.P[x] for x in d), dash_length=0.18, dashed_ratio=0.56).set_stroke(VANG, width=11)
                                    if isinstance(net_d, DashedLine)
                                    else Line(*(self.P[x] for x in d)).set_stroke(VANG, width=14)
                                )
                                cau_loe.append(ShowPassingFlash(tia_c, time_width=0.80))
                                cau_loe.append(net_d.animate.set_stroke(color=mau_d, width=(6.0 if isinstance(net_d, DashedLine) else 9.0), opacity=1.0))
                        for gk in c_nt["goc"]:
                            if ("vuong", gk) in self.hinh and self.hinh[("vuong", gk)] in self.tren_man:
                                cau_loe.append(self.hinh[("vuong", gk)].animate.set_stroke(color=mo.mau.get(("goc", gk), VANG), width=4.5, opacity=1.0))
                        for tg in c_nt["tam_giac"] + c_nt["mat"]:
                            km_t = ("mien", khoa_da_giac(tg))
                            if km_t in self.hinh and self.hinh[km_t] in self.tren_man:
                                cau_loe.append(self.hinh[km_t].animate.set_fill(color=mo.mau.get(km_t, VANG), opacity=0.36))
                        for dx in c_nt["diem"]:
                            if dx in self.nhan_diem and self.nhan_diem[dx] in self.tren_man:
                                cau_loe.append(self.nhan_diem[dx].animate.set_color(VANG).set_opacity(1.0))
                                cau_loe.append(self.cham[dx].animate.set_color(VANG).set_opacity(1.0))
                        if cau_loe:
                            self.choi(*cau_loe, run_time=min(0.75, max(0.35, D - self.da - 0.2)))

            y_ct = CT_TREN
            mob = [self.tao_dong(s_) for s_ in dong]
            if mob:
                g = VGroup(*mob).arrange(DOWN, buff=0.28)
                cao = max(0.4, y_ct - CT_DUOI - 0.45)   # luôn dương (cao âm sẽ lật ngược công thức)
                if g.height > cao:
                    g.scale_to_fit_height(cao)
                nen_ct = RoundedRectangle(width=CT_RONG + 0.3, height=g.height + 0.46, corner_radius=0.22, stroke_color=VANG if dap_an else NHAN,
                                          stroke_width=2.5 if dap_an else 2.2, stroke_opacity=0.68, fill_color=NEN_THE, fill_opacity=0.80)
                nen_ct.move_to([0, y_ct - 0.05 - nen_ct.height / 2, 0])
                vien_sang = Line(
                    nen_ct.get_top() + np.array([-(CT_RONG * 0.42), 0.0, 0.0]),
                    nen_ct.get_top() + np.array([CT_RONG * 0.42, 0.0, 0.0]),
                    stroke_color=VANG if dap_an else NHAN, stroke_width=3.2, stroke_opacity=0.85,
                )
                g.move_to(nen_ct)
                self.choi(FadeIn(nen_ct), FadeIn(vien_sang), run_time=0.28)
                cu.add(nen_ct, vien_sang)
            t_con = D - self.da - (1.4 if dap_an else 0.4)
            nc = len(cau)
            for j, m in enumerate(mob):
                # mốc hiện dòng j: đầu câu tương ứng (giọng đọc), không sớm hơn lúc vẽ xong
                c_text_j = ""
                if nc:
                    jc = min(nc - 1, int(j * nc / len(mob)))
                    moc = float(cau[jc].get("bat", 0)) + (0.12 if j else 0)
                    moc_loi = cp.get("mocCongThuc") or []
                    if len(moc_loi) == len(mob):
                        moc = moc_loi[j]
                        jc = next((k for k, c in enumerate(cau) if c["bat"] <= moc < c["ket"]), jc)
                    c_text_j = str(cau[jc].get("text") or cau[jc].get("chu") or cau[jc].get("cau") or "")
                else:
                    moc = self.da + j * max(0.8, t_con / max(1, len(mob)))
                self.doi_toi(min(max(moc, self.da), D - 1.0))
                con = D - self.da - 0.3
                rt = max(0.4, min(1.25, con * 0.5))
                dong_nt = mo.nhac_toi(dong[j] + (" ; " + c_text_j if c_text_j else ""))
                loe = []
                for d in dong_nt["doan"]:
                    m_d = self.hinh.get(("doan", d))
                    if m_d is not None and m_d in self.tren_man:
                        net_d = self.net_chinh(m_d)
                        mau_d = mo.mau.get(("doan", d), VANG)
                        tia_loe = (
                            DashedLine(*(self.P[x] for x in d), dash_length=0.18, dashed_ratio=0.56).set_stroke(VANG, width=10)
                            if isinstance(net_d, DashedLine)
                            else Line(*(self.P[x] for x in d)).set_stroke(VANG, width=13)
                        )
                        loe.append(ShowPassingFlash(tia_loe, time_width=0.65))
                        loe.append(net_d.animate.set_stroke(color=mau_d, width=(6.0 if isinstance(net_d, DashedLine) else 8.8), opacity=1.0))
                for gk in dong_nt["goc"]:
                    if ("vuong", gk) in self.hinh:     # góc vuông đã có ký hiệu: tô màu ký hiệu, không vẽ thêm cung
                        loe.append(self.hinh[("vuong", gk)].animate.set_stroke(color=mo.mau.get(("goc", gk), VANG), width=4.2, opacity=1.0))
                        continue
                    if ("goc", gk) not in self.hinh:
                        a, o, b = mo.goc_ba.get(gk, list(gk))
                        self.hinh[("goc", gk)] = self.cung_goc([a, o, b], mo.mau.get(("goc", gk), VANG))
                    if self.hinh[("goc", gk)] not in self.tren_man:
                        loe.append(Create(self.hinh[("goc", gk)]))
                        self.tren_man.add(self.hinh[("goc", gk)])
                for dx in dong_nt["diem"]:
                    if dx in self.nhan_diem and self.nhan_diem[dx] in self.tren_man:
                        loe.append(self.nhan_diem[dx].animate.set_color(VANG).set_opacity(1.0))
                        loe.append(self.cham[dx].animate.set_color(VANG).set_opacity(1.0))
                loe += self.so_do_tren_hinh(dong[j])
                self.ghi_su_kien("dong")
                if bien_doi and j > 0:
                    # dòng mới biến hình ra từ bản sao dòng trước (giữ rõ các dòng công thức 100%)
                    self.choi(TransformMatchingShapes(mob[j - 1].copy(), m), *loe, run_time=rt)
                else:
                    self.choi(Write(m), *loe, run_time=rt)
                cu.add(m)
            # 5) đáp án: khung vàng quanh dòng kết luận
            if dap_an and mob:
                khung = SurroundingRectangle(mob[-1], color=VANG, buff=0.14, stroke_width=4, corner_radius=0.1)
                self.doi_toi(max(self.da, min(D - 1.4, D * 0.6)))
                self.ghi_su_kien("khung")
                self.choi(Create(khung), run_time=0.7)
                self.choi(Circumscribe(mob[-1], color=VANG, buff=0.2), run_time=0.7)
                cu.add(khung)
            self.doi_toi(D)
            tong += D
        du = mo.props.get("tongFrame", 0) / fps - self.renderer.time
        if du > 0.5 / fps:
            self.wait(du)

    def so_do_tren_hinh(self, dong_goc):
        """Số đo nêu trong dòng công thức (góc, độ dài) -> nhãn nhỏ cùng màu đặt ngay cạnh góc / đoạn trên hình (giữ đến hết
        video, như các video mẫu). Trả về các animation hiện nhãn mới."""
        mo = self.mo
        s = chuan_tex(dong_goc)
        anim = []
        da_dat = [m.get_center()[:2] for m in self.nhan_diem.values()] + [
            m.get_center()[:2] for k, m in self.hinh.items() if isinstance(k, tuple) and k[0] == "so"
        ]

        def chon_vi_tri_thoang(cac_diem_3d):
            if not da_dat:
                return cac_diem_3d[0]
            return max(cac_diem_3d, key=lambda p: min(float(np.linalg.norm(p[:2] - q)) for q in da_dat))

        for m in RE_SO_GOC.finditer(s):
            a, o, b, v = m.groups()
            if not all(ten_chuan(x) in self.P for x in (a, o, b)):
                continue
            gk = mo.kgoc(a, o, b)
            khoa = ("so", ("goc",) + gk)
            if khoa in self.hinh or (("vuong", gk) in self.hinh and v.strip() == "90"):
                continue
            A, O, B = (self.P[ten_chuan(x)] for x in (a, o, b))
            u = (A - O) / max(1e-6, np.linalg.norm(A - O)) + (B - O) / max(1e-6, np.linalg.norm(B - O))
            u = u / max(1e-6, np.linalg.norm(u))
            pos = chon_vi_tri_thoang([O + u * r_ for r_ in (0.85, 1.12, 0.65)])
            nhan = tao_cong_thuc(v + r"^\circ", 30).set_color(mo.mau.get(("goc", gk), VANG)).move_to(pos)
            self.hinh[khoa] = nhan
            self.tren_man.add(nhan)
            da_dat.append(pos[:2])
            anim.append(FadeIn(nhan, scale=1.4))
        for m in RE_SO_DOAN.finditer(s):
            a, b, v = m.groups()
            if not all(ten_chuan(x) in self.P for x in (a, b)) or ten_chuan(a) == ten_chuan(b):
                continue
            d = khoa_doan(a, b)
            khoa = ("so", ("doan",) + d)
            if khoa in self.hinh:
                continue
            A, B = self.P[d[0]], self.P[d[1]]
            ph = np.array([-(B - A)[1], (B - A)[0], 0.0])
            ph = ph / max(1e-6, np.linalg.norm(ph))
            if np.dot((A + B) / 2 - self.tam, ph) < 0:
                ph = -ph
            giua = (A + B) / 2
            pos = chon_vi_tri_thoang([giua + ph * 0.42, giua - ph * 0.42, giua + ph * 0.68])
            nhan = tao_cong_thuc(v, 30).set_color(mo.mau.get(("doan", d), VANG)).move_to(pos)
            self.hinh[khoa] = nhan
            self.tren_man.add(nhan)
            da_dat.append(pos[:2])
            anim.append(FadeIn(nhan, scale=1.4))
        return anim

    def ghi_su_kien(self, kieu):
        self.su_kien.append({"f": int(round((self.t0 + self.da) * self.mo.fps)), "kieu": kieu})

    def dung_bia(self):
        """Hình cho ảnh bìa (nền trong suốt): hình đầy đủ, đại lượng tô màu. Phần còn lại của ảnh bìa do Remotion (AnhBia)
        làm như mọi video khác."""
        mo = self.mo
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


# ============================================================
# 4) CHẠY: phông chung + video lớp trong suốt + ảnh hình cho bìa + mốc tiếng
# ============================================================
def nap_phong(public, kieu_toan="dam"):  # noqa: C901
    """Dùng ĐÚNG phông của các video khác: công thức, tên điểm, số đo = Montserrat ExtraBold (kiểu công thức "dam",
    mặc định của mọi video) hoặc Be Vietnam Pro Bold (gói edit "dong_nhat"); chữ trong thẻ = Be Vietnam Pro.
    mathastext: chữ cái, chữ số, dấu = trong công thức cũng dùng phông đó (không còn phông LaTeX có chân)."""
    global TEX
    thu_muc = os.path.abspath(os.path.join(public, "fonts"))
    try:
        import manimpango
        for f in sorted(os.listdir(thu_muc)):
            if (f.startswith("BeVietnamPro") or f.startswith("Montserrat-ExtraBold")) and f.endswith(".ttf"):
                manimpango.register_font(os.path.join(thu_muc, f))
    except Exception as e:  # noqa: BLE001
        print("Không nạp được phông:", e)
    if kieu_toan == "dong_nhat" and os.path.exists(os.path.join(thu_muc, "BeVietnamPro-Bold.ttf")):
        phong = "BeVietnamPro-Bold.ttf}[Path=" + thu_muc + "/, ItalicFont=BeVietnamPro-BoldItalic.ttf, BoldFont=BeVietnamPro-ExtraBold.ttf"
    elif os.path.exists(os.path.join(thu_muc, "Montserrat-ExtraBold.ttf")):
        phong = "Montserrat-ExtraBold.ttf}[Path=" + thu_muc + "/, ItalicFont=Montserrat-ExtraBoldItalic.ttf, BoldFont=Montserrat-ExtraBold.ttf"
    else:
        return
    global PHONG_CHU_SO
    PHONG_CHU_SO = True
    TEX = TexTemplate(
        tex_compiler="xelatex", output_format=".xdv",
        preamble=r"\usepackage{amsmath}\usepackage{amssymb}\usepackage{xcolor}\usepackage{fontspec}"
                 r"\setmainfont{" + phong + r"]\usepackage[italic]{mathastext}"
                 r"\newcommand{\hl}[1]{\fcolorbox[HTML]{FFD43B}{0B1A22}{$\displaystyle #1$}}"
                 r"\newcommand{\dpcm}{\text{(đpcm)}}")


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("props")
    ap.add_argument("kich_ban")
    ap.add_argument("ra", nargs="?", default="out")
    ap.add_argument("--public", default="public")
    a = ap.parse_args()
    with open(a.props, encoding="utf8") as f:
        props = json.load(f)
    with open(a.kich_ban, encoding="utf8") as f:
        kb = json.load(f)
    nap_phong(a.public, str((props.get("phongCach") or {}).get("kieuToan") or "dam"))
    mo = MoHinh(props, kb)
    if len(mo.diem) < 2:
        print("Kịch bản không có hình hinh_hoc -> không dựng bằng Manim")
        sys.exit(3)
    os.makedirs(a.ra, exist_ok=True)
    id_ = props.get("id") or "video"
    thap = os.environ.get("MANIM_CHAT_LUONG") == "thap"
    rong, cao = (540, 960) if thap else (1080, 1920)
    tam = os.path.abspath(os.path.join(a.ra, "_manim"))
    tex_cache = os.path.abspath(os.environ.get("MANIM_TEX_DIR") or os.path.join(tempfile.gettempdir(), "manim_tex_cache"))
    os.makedirs(tex_cache, exist_ok=True)
    cfg = {"pixel_width": rong, "pixel_height": cao, "frame_width": W, "frame_height": H, "frame_rate": props.get("fps", 30),
           "media_dir": tam, "tex_dir": tex_cache, "disable_caching": True, "verbosity": "WARNING", "progress_bar": "none", "transparent": True}
    print("Màu đại lượng:", {"%s %s" % (k[0], "".join(map(str, k[1]))): v for k, v in mo.mau.items()})
    # hình cho ảnh bìa (PNG trong suốt) -> public/manim/bia.png, AnhBia của Remotion đặt vào ô hình
    with tempconfig(dict(cfg, save_last_frame=True, write_to_movie=False, output_file="bia")):
        VideoHinh.mo, VideoHinh.bia = mo, True
        sc = VideoHinh()
        sc.render()
        anh = str(sc.renderer.file_writer.image_file_path)
    os.makedirs(os.path.join(a.public, "manim"), exist_ok=True)
    shutil.copy(anh, os.path.join(a.public, "manim", "bia.png"))
    # video lớp hình + công thức, nền trong suốt (.mov qtrle có kênh alpha) -> ghép đè lên video Remotion
    with tempconfig(dict(cfg, output_file="lop", movie_file_extension=".mov")):
        VideoHinh.mo, VideoHinh.bia = mo, False
        sc = VideoHinh()
        sc.render()
        vid = str(sc.renderer.file_writer.movie_file_path)
    ra = os.path.join(a.ra, "%s_manim.mov" % id_)
    shutil.move(vid, ra)
    shutil.rmtree(tam, ignore_errors=True)
    # báo cho Remotion: chỉ dựng phần vỏ chung + tiếng "tách"/"ting" đúng lúc Manim hiện dòng / đóng khung
    props["manimLop"] = True
    props["anhManimBia"] = "manim/bia.png"
    props["suKienManim"] = sc.su_kien
    props["manimCanhBao"] = sorted(sc.canh_bao)
    for cb in sorted(sc.canh_bao):
        print("Cảnh báo Manim:", cb)
    with open(a.props, "w", encoding="utf8") as f:
        json.dump(props, f, ensure_ascii=False)
    print("Xong:", ra, "| %d mốc tiếng" % len(sc.su_kien))


if __name__ == "__main__":
    main()
