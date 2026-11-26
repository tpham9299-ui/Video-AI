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
import subprocess
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

# ---------------- bảng màu (khóa tuyệt đối với LaTeX, không dùng nền đen đặc) ----------------
TRANG = "#F8FAFC"
CHU_PHU = "#CBD5E1"
TRON_CHINH = "#38BDF8"
MAU = {"vang": "#FACC15", "do": "#FB7185", "ngoc": "#34D399", "cam": "#FB923C", "la": "#4ADE80", "cyan": "#38BDF8"}
PHONG = "Be Vietnam Pro"

W, H = 9.0, 16.0
# Tầng 2 của KhungHinhHoc trong SAFE_ZONE_TIKTOK (px x: 130..950, y: 398..1046) quy về khung 9x16
VUNG_T2 = {"x0": -3.35, "x1": 3.35, "y0": -0.65, "y1": 4.60}
_V_GOC = bo_cuc.VUNG_HINH
_S_T2 = min(
    (VUNG_T2["x1"] - VUNG_T2["x0"]) / max(_V_GOC["x1"] - _V_GOC["x0"], 1e-9),
    (VUNG_T2["y1"] - VUNG_T2["y0"]) / max(_V_GOC["y1"] - _V_GOC["y0"], 1e-9),
)
_CX_GOC = (_V_GOC["x0"] + _V_GOC["x1"]) / 2.0
_CY_GOC = (_V_GOC["y0"] + _V_GOC["y1"]) / 2.0
_CX_T2 = (VUNG_T2["x0"] + VUNG_T2["x1"]) / 2.0
_CY_T2 = (VUNG_T2["y0"] + VUNG_T2["y1"]) / 2.0
CO_NHAN = 38
CO_SO_DO = 30

TEX = None


def _t2_p3(p):
    """Ánh xạ đồng dạng (giữ nguyên góc vuông & đường tròn) từ bo_cuc.VUNG_HINH vào Tầng 2."""
    x = (float(p[0]) - _CX_GOC) * _S_T2 + _CX_T2
    y = (float(p[1]) - _CY_GOC) * _S_T2 + _CY_T2
    return np.array([x, y, 0.0])


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
        rt = run_time if toi_da is None else max(1 / self.camera.frame_rate, min(run_time, toi_da))
        self.play(*anim, run_time=rt, rate_func=rate_functions.ease_in_out_cubic)

    # ---------- dựng đối tượng (khớp Tầng 2) ----------
    def P(self, t):
        return _t2_p3(self.G["diem"][t])

    def net_doan(self, a, b, vai="chinh"):
        w = {"chinh": 4.2, "cao": 2.8, "phu": 2.4, "bo_sung": 2.4}.get(vai, 2.8)
        mau = TRANG if vai == "chinh" else "#E2E8F0"
        ln = Line(self.P(a), self.P(b), color=mau, stroke_width=w)
        ln.set_z_index(2)
        return ln

    def net_keo(self, a, b):
        ln = DashedLine(self.P(a), self.P(b), color=CHU_PHU, stroke_width=2.2, dash_length=0.14, dashed_ratio=0.55)
        ln.set_stroke(opacity=0.65)
        ln.set_z_index(2)
        return ln

    def net_tron(self, khoa, mau=TRON_CHINH, w=3.2, dut=False):
        cx, cy, r = self.G["tron"][khoa] if isinstance(khoa, str) else khoa
        c = Circle(radius=r * _S_T2, color=mau, stroke_width=w).move_to(_t2_p3((cx, cy)))
        if dut:
            c = DashedVMobject(c, num_dashes=max(36, int(r * _S_T2 * 34)), dashed_ratio=0.55)
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
        m.move_to(_t2_p3(self.G["nhan"][t]))
        m.set_z_index(6)
        return m

    def so_do_hinh(self):
        """Nhãn số đo độ dài / góc (từ dieu_kien) gắn trực tiếp lên hình, đẩy ra ngoài trọng tâm chống đè nét."""
        dk_list = self.G.get("dieu_kien") or []
        if not dk_list or not self.G.get("diem"):
            return VGroup()
        pts = [self.P(k) for k in self.G["diem"]]
        tam = sum(pts) / max(1, len(pts))
        nhom = VGroup()
        for dk in dk_list:
            if not isinstance(dk, dict):
                continue
            l = dk.get("loai")
            if l == "do_dai":
                ds = tach_diem(dk.get("doan"))
                val = dk.get("nhan") or dk.get("gia_tri")
                if len(ds) != 2 or val is None or not all(x in self.G["diem"] for x in ds):
                    continue
                pa, pb = self.P(ds[0]), self.P(ds[1])
                mid = (pa + pb) / 2.0
                v = pb - pa
                nv = np.linalg.norm(v)
                if nv < 1e-6:
                    continue
                perp = np.array([-v[1], v[0], 0.0]) / nv
                if np.dot(mid + perp * 0.25 - tam, mid - tam) < np.dot(mid - perp * 0.25 - tam, mid - tam):
                    perp = -perp
                s_val = str(val).rstrip("0").rstrip(".") if isinstance(val, float) else str(val)
                lb = MathTex(chuan_so(s_val), font_size=CO_SO_DO, color=MAU["cyan"], tex_template=TEX)
                lb.move_to(mid + perp * 0.28)
                lb.set_z_index(6)
                nhom.add(lb)
            elif l == "so_do_goc":
                ds = tach_diem(dk.get("goc"))
                do = dk.get("do")
                if len(ds) != 3 or do is None or abs(float(do) - 90.0) < 1e-3 or not all(x in self.G["diem"] for x in ds):
                    continue
                O = self.P(ds[1])
                u, v = self.P(ds[0]) - O, self.P(ds[2]) - O
                nu, nv = np.linalg.norm(u), np.linalg.norm(v)
                if nu < 1e-6 or nv < 1e-6:
                    continue
                bis = u / nu + v / nv
                nb = np.linalg.norm(bis)
                if nb < 1e-6:
                    continue
                s_do = str(int(do)) if float(do).is_integer() else str(do)
                lb = MathTex(chuan_so(s_do + "^\\circ"), font_size=CO_SO_DO - 2, color=MAU["vang"], tex_template=TEX)
                lb.move_to(O + (bis / nb) * 0.56)
                lb.set_z_index(6)
                nhom.add(lb)
        return nhom

    def cham(self, t):
        d = Dot(self.P(t), radius=0.065, color=TRANG)
        d.set_z_index(5)
        return d

    def sang(self, mob, mau, w):
        """Bản sao phát sáng bên dưới (stroke ×3, độ mờ 0,18)."""
        g = mob.copy().set_stroke(mau, width=w * 3, opacity=0.18)
        g.set_z_index(mob.z_index - 0.5 if hasattr(mob, "z_index") else 0)
        return g

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

    # ---------- pha 2: hành động trên hình (chữ bước giải do KhungHinhHoc dựng) ----------
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
            sd = self.so_do_hinh()
            if len(sd):
                self.hinh.add(sd)
            self.add(self.hinh)
            self.wait(1 / 30)
            return
        ket = float(M["ket"])
        # Chỉ vẽ lớp hình học thuần (không nền đen, không header, không đề bài, không chữ bước giải — đã do KhungHinhHoc dựng)
        su = [(M["dung"][str(b["id"])], 1, ("dung", b["id"])) for b in G["phep_dung"]]
        if su:
            dung_xong = max(e[0] for e in su)
            dau_buoc = next((row[0] for row in M["trang"] if row), ket)
            if dung_xong + 0.9 < dau_buoc:
                su.append((max(dung_xong + 0.1, min(dung_xong + 0.9, M["muc_tieu"])), 2, ("to_do",)))
        for ti, t in enumerate(G["trang"]):
            tm = M["trang"][ti] if ti < len(M["trang"]) else []
            for di, d in enumerate(t["dong"]):
                td = tm[di] if di < len(tm) else ket - 2
                if di == 0:
                    su.append((td, 4, ("trang", ti)))
                su.append((td, 5, ("dong", ti, di)))
        su.append((ket - 0.4, 9, ("het",)))
        su.sort(key=lambda x: (x[0], x[1]))
        do_muc = VGroup()
        lop_trang = VGroup()
        sd_da_hien = False
        for i, (t, _, ev) in enumerate(su):
            sau = su[i + 1][0] if i + 1 < len(su) else ket
            self.den(t)
            con = max(1 / fps, sau - self.bay_gio())
            kieu = ev[0]
            if kieu == "dung":
                anim = self.ve_buoc(ev[1])
                if not sd_da_hien and ev[1] == G["phep_dung"][-1]["id"]:
                    sd = self.so_do_hinh()
                    if len(sd):
                        self.hinh.add(sd)
                        anim.append(FadeIn(sd))
                    sd_da_hien = True
                self.nhat_ky.append({"kieu": "dung", "id": ev[1], "moc": round(t, 3), "that": round(self.bay_gio(), 3)})
                if anim:
                    self.choi(LaggedStart(*anim, lag_ratio=0.15), run_time=0.9, toi_da=con)
            elif kieu == "to_do":
                do_muc = self.to_muc_tieu()
                if len(do_muc):
                    self.choi(Create(do_muc), run_time=0.6, toi_da=con)
                    if sau - self.bay_gio() >= 1 / fps:
                        self.choi(Indicate(do_muc, color=MAU["do"], scale_factor=1.04), run_time=0.5, toi_da=sau - self.bay_gio())
            elif kieu == "trang":
                ti = ev[1]
                if len(lop_trang):
                    self.remove(*lop_trang)
                if ti == 0 and len(do_muc):
                    self.remove(do_muc)
                lop_trang = VGroup()
                self.nhat_ky.append({"kieu": "buoc", "trang": ti, "moc": round(t, 3), "that": round(self.bay_gio(), 3)})
            elif kieu == "dong":
                ti, di = ev[1], ev[2]
                d = G["trang"][ti]["dong"][di]
                anim = []
                for a, b2 in d.get("bo_sung") or []:
                    ln = self.net_doan(a, b2, "bo_sung")
                    self.hinh.add(ln)
                    anim.append(Create(ln))
                sau_dong = []
                for h in d.get("hanh_dong_hinh") or []:
                    if h.get("loai") == "khung_bac_cau":
                        # Chỉ vẽ cung góc trên hình (không vẽ khung chữ trong Manim)
                        s = h.get("doan_tex") if isinstance(h.get("doan_tex"), str) else (h.get("doan_tex") or [""])[0]
                        ds = tach_diem(s)
                        if len(ds) == 3 and all(x in self.G["diem"] for x in ds):
                            cg = self.cung(ds[0], ds[1], ds[2], MAU["cyan"], 1, r0=None)
                            lop_trang.add(cg)
                            anim.append(Create(cg))
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
                if anim:
                    self.choi(*anim, run_time=0.35, toi_da=con)
                for h in sau_dong:
                    self.ket_luan(h, max(1 / fps, sau - self.bay_gio()))
            elif kieu == "het":
                ra = [FadeOut(x) for x in (self.hinh, lop_trang) if len(x)]
                if ra:
                    self.choi(*ra, run_time=0.35, toi_da=con)
        du = ket - self.bay_gio()
        if du > 1 / 60:
            self.wait(du)

    def ket_luan(self, h, con):
        ds = tach_diem(h.get("goc"))
        anim = []
        if len(ds) == 3 and all(x in self.G["diem"] for x in ds):
            # góc vuông chốt bài: vàng nổi bật + quầng sáng (stroke ×3, độ mờ 0,18)
            q = self.vuong(ds[1], ds[0], ds[2], mau=MAU["vang"], w=3.6, canh=0.30, to=0.30)
            g = VGroup(self.sang(q, MAU["vang"], 3.6), q)
            self.hinh.add(g)
            anim += [Create(g), Flash(self.P(ds[1]), color=MAU["vang"], line_length=0.24, num_lines=10, flash_radius=0.38)]
        self.su_kien.append({"f": int(round(self.bay_gio() * 30)), "kieu": "khung"})
        if anim:
            self.choi(*anim, run_time=0.75, toi_da=con)


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
    if G:
        G["tinh"] = thoi_gian.la_bai_tinh(kb)
        G["dieu_kien"] = (kb.get("hinh_phang_chuan") or {}).get("dieu_kien") or []
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
    ra_webm = os.path.join(a.ra, "%s_manim.webm" % id_)
    if shutil.which("ffmpeg"):
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", ra, "-c:v", "libvpx-vp9",
                 "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-b:v", "0", "-crf", "30", ra_webm],
                check=True,
            )
            shutil.copy(ra_webm, os.path.join(a.public, "manim", "%s.webm" % id_))
            props.setdefault("hinhPhang", {})["video"] = "manim/%s.webm" % id_
        except Exception as e:  # noqa: BLE001
            print("Cảnh báo: không xuất được webm VP9 yuva420p:", e)
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
