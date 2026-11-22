#!/usr/bin/env python3
"""HinhPhangChuan.py - LỚP 3 (v94): ĐỘNG CƠ MANIM CHUẨN cho hình học phẳng (kb.hinh_phang_chuan).

Cách dùng (sau scripts/chuanbi.py; tọa độ do scripts/giai_hinh_phang.py tính, KHÔNG đọc tọa độ AI):
    python scripts/manim/HinhPhangChuan.py public/props.json kich_ban.json out/ [--public public]
Ra: out/<ID>_manim.mov (lớp trong suốt 1080x1920, ghép đè lên nền #121214 + giọng của Remotion), public/manim/bia.png,
    out/<ID>_manim_nhat_ky.json; props.json thêm manimLop / anhManimBia / suKienManim / hinhPhangBoCuc.
MANIM_CHAT_LUONG=thap -> 540x960 @15 hình/giây (chạy thử nhanh).

Khung 9 x 16 đơn vị (gốc giữa): header y 7,5..6,3 | đề / mục tiêu 6,15..5,15 | HÌNH 5,05..-0,75 (82%) |
trang chứng minh -1,0..-5,65 (tối đa 5 dòng) | đáy an toàn 14% cho TikTok.
Pha 1: câu đề hiện gọn phía trên + từng phép dựng vẽ đúng mốc lời đọc; cuối đề tô đỏ đối tượng cần chứng minh.
Pha 2: ẩn đề, ghim 1 dòng mục tiêu gạch chân; mỗi trang <= 5 dòng; sang trang: fade-out sạch chữ + lớp tô của trang cũ.
Khóa màu: \\mvang \\mdo \\mngoc \\mcam \\mla trong LaTeX trùng tuyệt đối màu tô mặt / đường tròn phụ / cung góc trên hình.
"""
import json
import math
import os
import re
import shutil
import sys
import tempfile

GOC_SCRIPTS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if GOC_SCRIPTS not in sys.path:
    sys.path.append(GOC_SCRIPTS)

import numpy as np  # noqa: E402
from manim import (BOLD, DOWN, LEFT, ORIGIN, RIGHT, UP, AnimationGroup, Circle, Circumscribe, Create, DashedLine,  # noqa: E402
                   DashedVMobject, Dot, FadeIn, FadeOut, Flash, Indicate, LaggedStart, Line, MathTex, Polygon, Rectangle,
                   RoundedRectangle, Scene, SurroundingRectangle, TexTemplate, Text, VGroup, VMobject, Write, rate_functions,
                   tempconfig)

from manim.scene.scene_file_writer import SceneFileWriter  # noqa: E402

from giai_hinh_phang import giai  # noqa: E402


def _alpha_thang(px):
    """Cairo trả RGBA PREMULTIPLIED (màu đã nhân alpha) nhưng ffmpeg overlay / PNG hiểu là alpha thường -> lớp tô bán trong
    suốt bị tối ~5 lần (tô 22% chỉ còn ~4%). Chia lại RGB cho alpha trước khi ghi khung / ảnh."""
    if not isinstance(px, np.ndarray) or px.ndim != 3 or px.shape[2] != 4:
        return px
    a = px[..., 3:4].astype(np.uint16)
    if a.min() == 255:
        return px
    rgb = (px[..., :3].astype(np.uint16) * 255 + a // 2) // np.maximum(a, 1)
    ra = np.empty_like(px)
    ra[..., :3] = np.where(a > 0, np.minimum(rgb, 255), 0).astype(np.uint8)
    ra[..., 3] = px[..., 3]
    return np.ascontiguousarray(ra)


_ghi_khung_goc, _luu_anh_goc = SceneFileWriter.write_frame, SceneFileWriter.save_image
SceneFileWriter.write_frame = lambda self, pixels, *a, **k: _ghi_khung_goc(self, _alpha_thang(pixels), *a, **k)
SceneFileWriter.save_image = lambda self, pixels: _luu_anh_goc(self, _alpha_thang(pixels))
from hinh_phang import bo_cuc, thoi_gian  # noqa: E402
from hinh_phang.hinh import tach_diem  # noqa: E402

# ---------------- bảng màu (khóa tuyệt đối với LaTeX) ----------------
NEN = "#121214"
TRANG = "#F1F5F9"
CHU_PHU = "#CBD5E1"
TRON_CHINH = "#38BDF8"
MAU = {"vang": "#FACC15", "do": "#F87171", "ngoc": "#2DD4BF", "cam": "#FB923C", "la": "#4ADE80", "cyan": "#22D3EE"}
PHONG = "Be Vietnam Pro"

W, H = 9.0, 16.0
Y_PILL, Y_PHU_DE = 7.05, 6.52
Y_DE_TREN = 6.12
Y_MUC_TIEU = 5.72
Y_TRANG_TIEU_DE = -1.12
Y_DONG_TREN = -1.62
Y_DAY = -5.65
RONG_CHU = 8.2
CO_DONG = 44
CO_NHAN = 40
CO_DE = 32

TEX = None


def nap_phong(public):
    """Be Vietnam Pro cho cả Pango (header, tiêu đề trang) và xelatex (\\text + chữ số trong công thức)."""
    global TEX
    thu_muc = os.path.abspath(os.path.join(public, "fonts")).replace("\\", "/")
    try:
        import manimpango
        for f in sorted(os.listdir(thu_muc)):
            if (f.startswith("BeVietnamPro") or f.startswith("DejaVuSans")) and f.endswith(".ttf"):
                manimpango.register_font(os.path.join(thu_muc, f))
    except Exception as e:  # noqa: BLE001
        print("Không nạp được phông Pango:", e)
    mau = "".join(r"\newcommand{\m%s}[1]{{\color[HTML]{%s}#1}}" % (k, v[1:]) for k, v in MAU.items() if k != "cyan")
    if os.path.exists(os.path.join(thu_muc, "BeVietnamPro-Bold.ttf")):
        phong = (r"\setmainfont{BeVietnamPro-Medium.ttf}[Path=" + thu_muc + r"/, BoldFont=BeVietnamPro-Bold.ttf, ItalicFont=BeVietnamPro-BoldItalic.ttf]"
                 r"\usepackage[italic]{mathastext}")
    else:
        phong = r"\setmainfont{Noto Serif}"
    TEX = TexTemplate(tex_compiler="xelatex", output_format=".xdv",
                      preamble=r"\usepackage{amsmath}\usepackage{amssymb}\usepackage{xcolor}\usepackage{fontspec}" + phong + mau)


def p3(p):
    return np.array([float(p[0]), float(p[1]), 0.0])


def tex_ten(t):
    m = re.fullmatch(r"([A-Z])_(\d+)", t)
    return m.group(1) + "_{" + m.group(2) + "}" if m else t


RE_SO = re.compile(r"(?<![\\A-Za-z0-9_.])(\d+(?:[.,]\d+|\{,\}\d+)?)")


def _so_text(m):
    return r"\text{" + m.group(1).replace("{,}", ",") + "}"


def chuan_so(tex):
    """Chữ số trong công thức -> \text{...} để cùng phông Be Vietnam với chữ (mathastext chỉ đổi chữ cái)."""
    ra, i = [], 0
    for m in re.finditer(r"\\text\s*\{[^{}]*\}", tex):
        ra.append(RE_SO.sub(_so_text, tex[i:m.start()]))
        ra.append(m.group(0))
        i = m.end()
    ra.append(RE_SO.sub(_so_text, tex[i:]))
    return "".join(ra)


TOAN_UNI = {"△": r"\triangle ", "∠": r"\angle ", "∼": r"\sim ", "⊥": r"\perp ", "∥": r"\parallel ", "≅": r"\cong ", "⇒": r"\Rightarrow "}
THOAT_TEX = {"\\": r"\textbackslash{}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}"}


def tieu_de_tex(s):
    """Tiêu đề chữ thường + ký hiệu toán unicode -> \textbf{...$\triangle AID$...} (Pango thiếu glyph △ ∼)."""
    s = re.sub(r"([\\&%#_{}~^$])", lambda m: THOAT_TEX.get(m.group(1), "\\" + m.group(1)), str(s or ""))
    s = re.sub(r"([△∠∼⊥∥≅⇒])\s*([A-Z]{1,4}(?:'|_\d)?)?", lambda m: "$" + TOAN_UNI[m.group(1)] + (m.group(2) or "") + "$", s)
    s = s.replace("$$", " ")      # hai cụm toán liền nhau -> một cụm (tránh $$ hiển thị)
    return r"\textbf{" + s + "}"


def tach_phan(tex, dich):
    """Tách dòng LaTeX thành các phần cấp ngoài cùng sao cho `dich` (hoặc macro màu bao nó) là một phần riêng.
    -> (danh sách phần, chỉ số phần đích) hoặc (None, None)."""
    i = tex.find(dich)
    if i < 0:
        return None, None
    # tìm cấp ngoặc tại i; nếu nằm trong \mxxx{...} thì lấy cả macro
    sau, mo = 0, []
    for k, ch in enumerate(tex[:i]):
        if ch == "{":
            mo.append(k)
        elif ch == "}" and mo:
            mo.pop()
    if not mo:
        a, b = i, i + len(dich)
    else:
        k0 = mo[0]
        m = re.search(r"\\m(?:vang|do|ngoc|cam|la)\s*$", tex[:k0])
        if not m:
            return None, None
        a = m.start()
        d = 0
        for b in range(k0, len(tex)):
            if tex[b] == "{":
                d += 1
            elif tex[b] == "}":
                d -= 1
                if d == 0:
                    b += 1
                    break
    phan = [x for x in (tex[:a], tex[a:b], tex[b:]) if x.strip()]
    idx = [k for k, x in enumerate(phan) if x == tex[a:b]]
    return (phan, idx[0]) if idx else (None, None)


class HinhPhang(Scene):
    G = None          # kết quả bộ giải
    MOC = None        # mốc thời gian
    BIA = False

    # ---------- tiện ích thời gian ----------
    def bay_gio(self):
        return self.renderer.time

    def den(self, t):
        d = t - self.bay_gio()
        if d > 1.0 / 60:
            self.wait(d)

    def choi(self, *anim, run_time=0.8, toi_da=None):
        anim = [a for a in anim if a is not None]
        if not anim:
            return
        rt = run_time if toi_da is None else max(0.2, min(run_time, toi_da))
        self.play(*anim, run_time=rt)

    # ---------- dựng đối tượng ----------
    def P(self, t):
        return p3(self.G["diem"][t])

    def net_doan(self, a, b, vai="chinh"):
        w = {"chinh": 4.0, "cao": 3.2, "phu": 3.2, "bo_sung": 2.8}.get(vai, 3.2)
        mau = TRANG if vai == "chinh" else "#E2E8F0"
        ln = Line(self.P(a), self.P(b), color=mau, stroke_width=w)
        ln.set_z_index(2)
        return ln

    def net_keo(self, a, b):
        ln = DashedLine(self.P(a), self.P(b), color=CHU_PHU, stroke_width=2.2, dash_length=0.14, dashed_ratio=0.55)
        ln.set_stroke(opacity=0.7)
        ln.set_z_index(2)
        return ln

    def net_tron(self, khoa, mau=TRON_CHINH, w=3.2, dut=False):
        cx, cy, r = self.G["tron"][khoa] if isinstance(khoa, str) else khoa
        c = Circle(radius=r, color=mau, stroke_width=w).move_to(p3((cx, cy)))
        if dut:
            c = DashedVMobject(c, num_dashes=max(36, int(r * 34)), dashed_ratio=0.55)
        c.set_z_index(1)
        return c

    def vuong(self, o, a, b, mau=TRANG, w=2.2, canh=0.22, to=0.0):
        O = self.P(o)
        u = self.P(a) - O
        v = self.P(b) - O
        u, v = u / max(np.linalg.norm(u), 1e-9) * canh, v / max(np.linalg.norm(v), 1e-9) * canh
        sq = Polygon(O + u, O + u + v, O + v, O, color=mau, stroke_width=w)
        sq.set_fill(mau, opacity=to)
        sq.set_z_index(3)
        return sq

    def cung(self, a, o, b, mau, so_cung=1, r0=None):
        O = self.P(o)
        u, v = self.P(a) - O, self.P(b) - O
        lu, lv = np.linalg.norm(u), np.linalg.norm(v)
        # bán kính 0,28..0,5: góc ở đoạn ngắn (vd ∠ADI với DI ngắn) vẫn đủ lớn để thấy rõ
        r = r0 or max(0.28, min(0.5, 0.34 * min(lu, lv)))
        g1 = math.atan2(u[1], u[0])
        dg = math.atan2(v[1], v[0]) - g1
        while dg > math.pi:
            dg -= 2 * math.pi
        while dg < -math.pi:
            dg += 2 * math.pi
        n = 28
        diem = [O] + [O + r * np.array([math.cos(g1 + dg * k / n), math.sin(g1 + dg * k / n), 0]) for k in range(n + 1)]
        quat = Polygon(*diem, stroke_width=0).set_fill(mau, opacity=0.22)
        nhom = VGroup(quat)
        for j in range(so_cung):
            rr = r + 0.085 * j
            cung = VMobject(color=mau, stroke_width=3.2)
            cung.set_points_smoothly([O + rr * np.array([math.cos(g1 + dg * k / n), math.sin(g1 + dg * k / n), 0]) for k in range(n + 1)])
            nhom.add(cung)
        nhom.set_z_index(1)
        return nhom

    def la_goc_vuong(self, ds):
        O = self.P(ds[1])
        u, v = self.P(ds[0]) - O, self.P(ds[2]) - O
        c = float(np.dot(u, v)) / max(float(np.linalg.norm(u) * np.linalg.norm(v)), 1e-9)
        return abs(c) < 1e-3

    def nhan_diem(self, t):
        if t not in self.G["nhan"]:
            return None
        m = MathTex(tex_ten(t), font_size=CO_NHAN, color=TRANG, tex_template=TEX)
        m.move_to(p3(self.G["nhan"][t]))
        m.set_z_index(6)
        return m

    def cham(self, t):
        d = Dot(self.P(t), radius=0.065, color=TRANG)
        d.set_z_index(5)
        return d

    def sang(self, mob, mau, w):
        """Bản sao phát sáng bên dưới (stroke ×3, độ mờ 0,18)."""
        g = mob.copy().set_stroke(mau, width=w * 3, opacity=0.18)
        g.set_z_index(mob.z_index - 0.5 if hasattr(mob, "z_index") else 0)
        return g

    def dong_tex(self, tex, co=CO_DONG, mau=TRANG):
        m = MathTex(chuan_so(tex), font_size=co, color=mau, tex_template=TEX)
        if m.width > RONG_CHU:
            m.scale_to_fit_width(RONG_CHU)
        return m

    # ---------- pha 1: dựng hình ----------
    def ve_buoc(self, idb):
        anim, moi = [], []
        for n in self.G["net"]:
            if n["id"] != idb:
                continue
            if n["loai"] == "tron":
                m = self.net_tron(n["khoa"], w=3.2 if n.get("vai") != "phu" else 2.4, dut=n.get("vai") == "phu")
                anim.append(Create(m))
            elif n["loai"] == "doan":
                m = self.net_doan(n["a"], n["b"], n.get("vai", "chinh"))
                anim.append(Create(m))
            elif n["loai"] == "keo":
                m = self.net_keo(n["a"], n["b"])
                anim.append(Create(m))
            elif n["loai"] == "vuong":
                if not all(x in self.G["diem"] for x in (n["dinh"], n["a"], n["b"])):
                    continue
                m = self.vuong(n["dinh"], n["a"], n["b"])
                anim.append(Create(m))
            elif n["loai"] == "diem":
                t = n["ten"]
                if t in self.da_diem or t in self.G["diem_an"]:
                    continue
                self.da_diem.add(t)
                m = VGroup(self.cham(t))
                lb = self.nhan_diem(t)
                if lb is not None:
                    m.add(lb)
                anim.append(FadeIn(m, scale=0.6))
            else:
                continue
            moi.append(m)
            self.hinh.add(m)
        return anim

    def cham_de(self):
        """Câu đề rút gọn: tối đa 3 dòng phía trên, hiện theo mốc."""
        ds = []
        for x in self.G["de_rut_gon"]:
            tex = str(x.get("tex") or "")
            if not tex.strip():
                continue
            ds.append(self.dong_tex(tex, co=CO_DE, mau=CHU_PHU))
        if not ds:
            return VGroup()
        g = VGroup(*ds).arrange(DOWN, buff=0.14, aligned_edge=ORIGIN)
        if g.height > 1.08:
            g.scale_to_fit_height(1.08)
        if g.width > RONG_CHU:
            g.scale_to_fit_width(RONG_CHU)
        g.move_to(p3((0, Y_DE_TREN - g.height / 2)))
        return g

    def header(self):
        h = self.G["header"]
        t1 = Text(h["nhan_lop"], font=PHONG, weight=BOLD, font_size=30, color=NEN)
        v1 = RoundedRectangle(corner_radius=0.24, width=t1.width + 0.55, height=0.52, stroke_width=0).set_fill(MAU["vang"], 1)
        p1 = VGroup(v1, t1.move_to(v1))
        t2 = Text(h["chuyen_muc"], font=PHONG, weight=BOLD, font_size=30, color=MAU["cyan"])
        v2 = RoundedRectangle(corner_radius=0.24, width=t2.width + 0.55, height=0.52, color=MAU["cyan"], stroke_width=2.2)
        p2 = VGroup(v2, t2.move_to(v2))
        hang = VGroup(p1, p2).arrange(RIGHT, buff=0.22).move_to(p3((0, Y_PILL)))
        pd = Text(h["phu_de"], font=PHONG, font_size=27, color=CHU_PHU).move_to(p3((0, Y_PHU_DE)))
        gach = Line(pd.get_corner(DOWN + LEFT) + DOWN * 0.09, pd.get_corner(DOWN + RIGHT) + DOWN * 0.09, color=MAU["cyan"], stroke_width=1.6)
        gach.set_stroke(opacity=0.8)
        return VGroup(hang, pd, gach)

    def to_muc_tieu(self):
        """Cuối đề: tô đỏ nổi bật đối tượng cần chứng minh (đoạn + điểm)."""
        g = VGroup()
        for x in (self.G["muc_tieu"].get("to_do") or []):
            ds = tach_diem(x)
            if len(ds) == 2 and all(d in self.G["diem"] for d in ds):
                ln = Line(self.P(ds[0]), self.P(ds[1]), color=MAU["do"], stroke_width=5.0)
                ln.set_z_index(3)
                g.add(self.sang(ln, MAU["do"], 5.0), ln)
            elif len(ds) == 1 and ds[0] in self.G["diem"]:
                d = Dot(self.P(ds[0]), radius=0.1, color=MAU["do"])
                d.set_z_index(5)
                g.add(d)
        return g

    def dong_muc_tieu(self, mau=TRANG):
        tex = str(self.G["muc_tieu"].get("tex") or "").strip()
        if not tex:
            return None
        nhan = Text("Chứng minh:", font=PHONG, weight=BOLD, font_size=30, color=MAU["cyan"])
        bt = MathTex(chuan_so(tex), font_size=40, color=mau, tex_template=TEX)
        hang = VGroup(nhan, bt).arrange(RIGHT, buff=0.22)
        if hang.width > RONG_CHU:
            hang.scale_to_fit_width(RONG_CHU)
        hang.move_to(p3((0, Y_MUC_TIEU)))
        gach = Line(hang.get_corner(DOWN + LEFT) + DOWN * 0.1, hang.get_corner(DOWN + RIGHT) + DOWN * 0.1, color=MAU["vang"], stroke_width=2.0)
        return VGroup(hang, gach)

    # ---------- pha 2: trang chứng minh ----------
    def dung_trang(self, ti, t):
        so = Text("BƯỚC %d" % (ti + 1), font=PHONG, weight=BOLD, font_size=24, color=NEN)
        vien = RoundedRectangle(corner_radius=0.18, width=so.width + 0.36, height=0.4, stroke_width=0).set_fill(MAU["cyan"], 1)
        pill = VGroup(vien, so.move_to(vien))
        td = MathTex(tieu_de_tex(str(t.get("tieu_de") or "")[:48]), font_size=36, color=TRANG, tex_template=TEX)
        tieu = VGroup(pill, td).arrange(RIGHT, buff=0.2)
        if tieu.width > RONG_CHU:
            tieu.scale_to_fit_width(RONG_CHU)
        tieu.move_to(p3((0, Y_TRANG_TIEU_DE)))
        dong, phan = [], []
        for d in t["dong"]:
            # khung bắc cầu cần tách phần LaTeX -> dựng dòng có tách sẵn các chuỗi được dòng sau tham chiếu
            dich = self._dich_bac_cau(t, d)
            m, idx = None, None
            for s in dich:
                ps, k = tach_phan(d["tex"], s)
                if ps:
                    try:
                        m = MathTex(*[chuan_so(x) for x in ps], font_size=CO_DONG, color=TRANG, tex_template=TEX)
                        idx = (s, k)
                        break
                    except Exception:  # noqa: BLE001
                        m = None
            if m is None:
                m = MathTex(chuan_so(d["tex"]), font_size=CO_DONG, color=TRANG, tex_template=TEX)
            if m.width > RONG_CHU:
                m.scale_to_fit_width(RONG_CHU)
            dong.append(m)
            phan.append(idx)
        g = VGroup(*dong).arrange(DOWN, buff=0.34, aligned_edge=LEFT)
        cao_toi_da = Y_DONG_TREN - Y_DAY
        if g.height > cao_toi_da:
            g.scale_to_fit_height(cao_toi_da)
        if g.width > RONG_CHU:
            g.scale_to_fit_width(RONG_CHU)
        g.move_to(p3((0, Y_DONG_TREN - g.height / 2)))
        return tieu, dong, phan

    def _dich_bac_cau(self, t, d):
        k = t["dong"].index(d) + 1
        ds = []
        for d2 in t["dong"]:
            for h in d2.get("hanh_dong_hinh") or []:
                if h.get("loai") == "khung_bac_cau" and (not h.get("dong") or k in h["dong"]):
                    s = h.get("doan_tex") if isinstance(h.get("doan_tex"), str) else (h.get("doan_tex") or [""])[0]
                    if s and s in d["tex"]:
                        ds.append(s)
        return ds

    def lop_hanh_dong(self, h):
        l = h.get("loai")
        mau = MAU.get(h.get("mau"), MAU["vang"])
        G = self.G["diem"]
        if l == "to_da_giac":
            ds = tach_diem("".join(h.get("dinh")) if isinstance(h.get("dinh"), list) else h.get("dinh"))
            if len(ds) < 3 or not all(x in G for x in ds):
                return None
            pg = Polygon(*[self.P(x) for x in ds], color=mau, stroke_width=2.6).set_fill(mau, opacity=0.20)
            pg.set_z_index(0)
            return pg, FadeIn(pg)
        if l == "duong_tron_phu" and h.get("_tron"):
            c = self.net_tron(tuple(h["_tron"]), mau=mau, w=2.6, dut=True)
            return c, Create(c)
        if l == "to_goc":
            ds = tach_diem(h.get("goc"))
            if len(ds) != 3 or not all(x in G for x in ds):
                return None
            if self.la_goc_vuong(ds):     # mọi góc 90° -> ký hiệu góc vuông sắc nét, không vẽ cung tròn
                q = self.vuong(ds[1], ds[0], ds[2], mau=mau, w=3.0, canh=0.26, to=0.25)
                return q, Create(q)
            c = self.cung(ds[0], ds[1], ds[2], mau, int(h.get("so_cung") or 1))
            return c, Create(c)
        if l == "ky_hieu_vuong":
            ds = tach_diem(h.get("goc"))
            if len(ds) != 3 or not all(x in G for x in ds):
                return None
            q = self.vuong(ds[1], ds[0], ds[2], mau=mau, w=3.0, canh=0.26, to=0.25)
            return q, Create(q)
        if l == "nhan_manh_doan":
            ds = tach_diem(h.get("doan"))
            if len(ds) != 2 or not all(x in G for x in ds):
                return None
            ln = Line(self.P(ds[0]), self.P(ds[1]), color=mau, stroke_width=5.5)
            ln.set_z_index(3)
            g = VGroup(self.sang(ln, mau, 5.5), ln)
            return g, Create(g)
        return None

    def construct(self):
        G, M = self.G, self.MOC
        self.hinh = VGroup()
        self.da_diem = set()
        self.su_kien, self.nhat_ky = [], []
        fps = self.camera.frame_rate if hasattr(self.camera, "frame_rate") else 30
        if self.BIA:
            for b in G["phep_dung"]:
                for a in self.ve_buoc(b["id"]):
                    pass
            for t in G["trang"]:
                for d in t["dong"]:
                    for a, b2 in d.get("bo_sung") or []:
                        self.hinh.add(self.net_doan(a, b2, "bo_sung"))
            self.add(self.hinh)
            self.wait(1 / 30)
            return
        ket = float(M["ket"])
        # header
        hd = self.header()
        self.choi(FadeIn(hd, shift=DOWN * 0.15), run_time=0.6)
        # lịch pha 1
        de = self.cham_de()
        su = []
        for k, t in enumerate(M["de"]):
            if k < len(de):
                su.append((t, 0, ("de", k)))
        for b in G["phep_dung"]:
            su.append((M["dung"].get(str(b["id"]), 0.5), 1, ("dung", b["id"])))
        t_mt = float(M["muc_tieu"])
        t_dung_cuoi = max([x[0] for x in su if x[2][0] == "dung"] or [0.5])
        su.append((max(t_dung_cuoi + 1.1, t_mt - 0.9), 2, ("to_do",)))
        su.append((max(t_dung_cuoi + 1.9, t_mt), 3, ("ghim",)))
        trang_mob = []
        for ti, t in enumerate(G["trang"]):
            tm = M["trang"][ti] if ti < len(M["trang"]) else []
            for di, d in enumerate(t["dong"]):
                td = tm[di] if di < len(tm) else ket - 2
                if di == 0:
                    su.append((td - 0.55, 4, ("trang", ti)))
                su.append((td, 5, ("dong", ti, di)))
        su.append((ket - 0.5, 9, ("het",)))
        su.sort(key=lambda x: (x[0], x[1]))
        do_muc = VGroup()
        ghim = None
        lop_trang, chu_trang = VGroup(), VGroup()
        cur = None
        for i, (t, _, ev) in enumerate(su):
            sau = su[i + 1][0] if i + 1 < len(su) else ket
            self.den(t)
            con = max(0.2, sau - self.bay_gio())
            kieu = ev[0]
            if kieu == "de":
                self.choi(FadeIn(de[ev[1]], shift=UP * 0.1), run_time=0.6, toi_da=con)
            elif kieu == "dung":
                anim = self.ve_buoc(ev[1])
                self.nhat_ky.append({"kieu": "dung", "id": ev[1], "moc": round(t, 3), "that": round(self.bay_gio(), 3)})
                if anim:
                    self.choi(LaggedStart(*anim, lag_ratio=0.15), run_time=1.1, toi_da=con)
            elif kieu == "to_do":
                do_muc = self.to_muc_tieu()
                if len(do_muc):
                    self.choi(Create(do_muc), run_time=0.7, toi_da=con)
                    self.choi(Indicate(do_muc, color=MAU["do"], scale_factor=1.04), run_time=0.6, toi_da=max(0.2, con - 0.7))
            elif kieu == "ghim":
                ghim = self.dong_muc_tieu()
                anim = [FadeOut(de, shift=UP * 0.15)] if len(de) else []
                if ghim is not None:
                    anim.append(FadeIn(ghim, shift=UP * 0.1))
                self.choi(*anim, run_time=0.6, toi_da=con)
            elif kieu == "trang":
                ti = ev[1]
                ra = []
                if len(chu_trang):
                    ra.append(FadeOut(chu_trang, shift=UP * 0.2))
                if len(lop_trang):
                    ra.append(FadeOut(lop_trang))
                if ti == 0 and len(do_muc):
                    ra.append(FadeOut(do_muc))
                if ra:
                    self.choi(*ra, run_time=0.35, toi_da=con)
                lop_trang, chu_trang = VGroup(), VGroup()
                tieu, dong, phan = self.dung_trang(ti, G["trang"][ti])
                cur = {"tieu": tieu, "dong": dong, "phan": phan}
                chu_trang.add(tieu)
                self.choi(FadeIn(tieu, shift=RIGHT * 0.15), run_time=0.35, toi_da=max(0.2, sau - self.bay_gio()))
            elif kieu == "dong":
                ti, di = ev[1], ev[2]
                d = G["trang"][ti]["dong"][di]
                mob = cur["dong"][di]
                chu_trang.add(mob)
                anim = [Write(mob)]
                for a, b2 in d.get("bo_sung") or []:
                    ln = self.net_doan(a, b2, "bo_sung")
                    self.hinh.add(ln)
                    anim.append(Create(ln))
                sau_dong, khung_bc = [], VGroup()
                for h in d.get("hanh_dong_hinh") or []:
                    if h.get("loai") == "khung_bac_cau":
                        # khung bắc cầu hiện CÙNG LÚC dòng kết luận (lời đọc thường sang trang ngay sau đó)
                        k = self.khung_bac_cau(h, cur, di)
                        if len(k):
                            khung_bc.add(k)
                            lop_trang.add(k)
                            anim.append(Create(k))
                        continue
                    if h.get("loai") == "ket_luan":
                        sau_dong.append(h)
                        continue
                    r = self.lop_hanh_dong(h)
                    if r:
                        (lop_trang if not h.get("giu") else self.hinh).add(r[0])
                        anim.append(r[1])
                self.su_kien.append({"f": int(round(self.bay_gio() * 30)), "kieu": "dong"})
                self.nhat_ky.append({"kieu": "dong", "trang": ti, "dong": di, "moc": round(t, 3), "that": round(self.bay_gio(), 3)})
                self.choi(*anim, run_time=0.9, toi_da=con)
                hcn = [r for k in khung_bc for r in k if isinstance(r, Rectangle)]
                if hcn and sau - self.bay_gio() > 0.45:
                    self.choi(*[Circumscribe(r, color=MAU["cyan"], buff=0.03, stroke_width=2) for r in hcn], run_time=0.6,
                              toi_da=sau - self.bay_gio() - 0.15)
                for h in sau_dong:
                    self.ket_luan(h, ghim, max(0.2, sau - self.bay_gio()))
            elif kieu == "het":
                ra = [FadeOut(x) for x in (self.hinh, chu_trang, lop_trang, hd) if len(x)]
                if ghim is not None:
                    ra.append(FadeOut(ghim))
                self.choi(*ra, run_time=0.4, toi_da=con)
        du = ket - self.bay_gio()
        if du > 1 / 60:
            self.wait(du)

    def khung_bac_cau(self, h, cur, di):
        """Khung chữ nhật cyan mảnh quanh góc trung gian ở các dòng được bắc cầu + cung cyan trên hình."""
        s = h.get("doan_tex") if isinstance(h.get("doan_tex"), str) else (h.get("doan_tex") or [""])[0]
        dong = h.get("dong") or [k + 1 for k in range(di)]
        g = VGroup()
        for k in dong:
            j = k - 1
            if j < 0 or j >= len(cur["dong"]):
                continue
            ph = cur["phan"][j]
            mob = cur["dong"][j]
            dich = mob[ph[1]] if ph and ph[0] == s else mob
            g.add(SurroundingRectangle(dich, color=MAU["cyan"], buff=0.06, stroke_width=2.0, corner_radius=0.04))
        ds = tach_diem(s)
        if len(ds) == 3 and all(x in self.G["diem"] for x in ds):
            g.add(self.cung(ds[0], ds[1], ds[2], MAU["cyan"], 1, r0=None))
        return g

    def ket_luan(self, h, ghim, con):
        ds = tach_diem(h.get("goc"))
        anim = []
        if len(ds) == 3 and all(x in self.G["diem"] for x in ds):
            # góc vuông chốt bài: vàng nổi bật, cạnh 0,32, tô 30% + quầng sáng (stroke ×3, độ mờ 0,18)
            q = self.vuong(ds[1], ds[0], ds[2], mau=MAU["vang"], w=3.6, canh=0.32, to=0.30)
            g = VGroup(self.sang(q, MAU["vang"], 3.6), q)
            self.hinh.add(g)
            anim += [Create(g), Flash(self.P(ds[1]), color=MAU["vang"], line_length=0.25, num_lines=10, flash_radius=0.42)]
        if ghim is not None:
            xanh = self.dong_muc_tieu(MAU["la"])
            dau = MathTex(r"\checkmark", font_size=44, color=MAU["la"], tex_template=TEX).next_to(xanh[0], RIGHT, buff=0.18)
            anim.append(AnimationGroup(ghim.animate.set_color(MAU["la"]), FadeIn(dau, scale=1.6)))
            self.hinh.add(dau)
        self.su_kien.append({"f": int(round(self.bay_gio() * 30)), "kieu": "khung"})
        if anim:
            self.choi(*anim, run_time=0.9, toi_da=con)


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
    G = giai(kb)
    if G is None:
        print("Kịch bản không có hinh_phang_chuan -> dùng manim_hinh.py")
        sys.exit(3)
    if not G.get("dat"):
        for x in G["loi"]:
            print("LỖI CỨNG [%s] %s" % (x["ma"], x["chi_tiet"]))
        sys.exit(2)
    fps = int(props.get("fps", 30))
    outro = props.get("outro") or {}
    lech = int((props.get("intro") or {}).get("lech") or 0)
    ket_frame = int(outro.get("batDau")) if outro.get("batDau") else int(props.get("tongFrame", 0)) - lech
    ket = ket_frame / fps
    M = (props.get("hinhPhang") or {}).get("moc") or thoi_gian.moc_hinh_phang(G, props.get("canh") or [], fps, ket)
    M["ket"] = ket
    nap_phong(a.public)
    os.makedirs(a.ra, exist_ok=True)
    id_ = props.get("id") or "video"
    thap = os.environ.get("MANIM_CHAT_LUONG") == "thap"
    rong, cao = (540, 960) if thap else (1080, 1920)
    tam = os.path.abspath(os.path.join(a.ra, "_manim_hp"))
    tam_tex = os.path.join(tempfile.gettempdir(), "manim_tex_cache")
    if " " in tam_tex:      # xelatex trên Windows hỏng khi đường dẫn có dấu cách -> dùng thư mục trong out/
        tam_tex = os.path.join(a.ra, "..", "_tex")
    tex_cache = os.path.abspath(os.environ.get("MANIM_TEX_DIR") or tam_tex)
    os.makedirs(tex_cache, exist_ok=True)
    cfg = {"pixel_width": rong, "pixel_height": cao, "frame_width": W, "frame_height": H, "frame_rate": 15 if thap else fps,
           "media_dir": tam, "tex_dir": tex_cache, "disable_caching": True, "verbosity": "WARNING", "progress_bar": "none", "transparent": True}
    HinhPhang.G, HinhPhang.MOC = G, M
    with tempconfig(dict(cfg, save_last_frame=True, write_to_movie=False, output_file="bia")):
        HinhPhang.BIA = True
        sc = HinhPhang()
        sc.render()
        anh = str(sc.renderer.file_writer.image_file_path)
    os.makedirs(os.path.join(a.public, "manim"), exist_ok=True)
    shutil.copy(anh, os.path.join(a.public, "manim", "bia.png"))
    with tempconfig(dict(cfg, output_file="lop", movie_file_extension=".mov")):
        HinhPhang.BIA = False
        sc = HinhPhang()
        sc.render()
        vid = str(sc.renderer.file_writer.movie_file_path)
    ra = os.path.join(a.ra, "%s_manim.mov" % id_)
    shutil.move(vid, ra)
    shutil.rmtree(tam, ignore_errors=True)
    props["manimLop"] = True
    props["anhManimBia"] = "manim/bia.png"
    props["suKienManim"] = sc.su_kien
    props["hinhPhangBoCuc"] = dict(G["bo_cuc"], canh_bao=[x["ma"] for x in G["canh_bao"]])
    nk = {"dong_co": "HinhPhangChuan", "ve": sc.nhat_ky, "moc": M, "bo_cuc": G["bo_cuc"], "sua": G["sua"], "canh_bao": G["canh_bao"],
          "menh_de": G["menh_de"]}
    props["manimNhatKy"] = {"dong_co": "HinhPhangChuan", "ve": sc.nhat_ky, "khop": M.get("khop")}
    with open(os.path.join(a.ra, "%s_manim_nhat_ky.json" % id_), "w", encoding="utf8") as f:
        json.dump(nk, f, ensure_ascii=False, indent=1)
    with open(a.props, "w", encoding="utf8") as f:
        json.dump(props, f, ensure_ascii=False)
    print("Xong:", ra, "| %d mốc tiếng | khớp khi_noi %s" % (len(sc.su_kien), json.dumps(M.get("khop"), ensure_ascii=False)))


if __name__ == "__main__":
    main()
