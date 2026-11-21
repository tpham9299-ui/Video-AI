"""Bối cảnh tham số (thuần Python). dung_moi_truong(mau, lo, hi) trả bộ phận thế giới quanh hộp bao vật chính.

Đạo cụ ở kích thước thật, đặt NGOÀI vùng vật chính (phía sau / hai bên) để không che số liệu;
máy quay khung theo vật chính, đạo cụ phía sau được xóa phông ở lớp nền.
"""

import json
import random
from pathlib import Path

from .vat import dung_vat, dat_vao

DANH_MUC = json.loads((Path(__file__).with_name("danh_muc.json")).read_text(encoding="utf8"))


class KhungCanh:
    def __init__(self, lo, hi, seed):
        self.lo, self.hi = lo, hi
        self.cx, self.cy = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2
        self.rx, self.ry = (hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2
        self.span = max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2], 0.05)
        self.m = max(0.35 * self.span, 0.4)
        self.parts = []
        self.rng = random.Random(seed)
        self.z0 = lo[2]
        self.ban = False

    def dat(self, mau_tv, co, x, y, mau=None, xoay=0.0, ts=None, z=None):
        mau = mau or DANH_MUC["vat"].get(mau_tv, {}).get("mau", "da")
        self.parts += dat_vao(dung_vat(mau_tv, co, mau, ts), (x, y, self.z0 if z is None else z), xoay)

    def khoi(self, hinh, tam, co, vat_lieu, xoay=None):
        p = {"hinh": hinh, "tam": list(tam), "co": list(co), "vat_lieu": vat_lieu}
        if xoay:
            p["xoay"] = list(xoay)
        self.parts.append(p)

    # ---- các mảnh dùng chung ----
    def san(self, vat_lieu, rong=None):
        r = rong or max(self.span * 14, 40)
        self.khoi("hop", (self.cx, self.cy, self.z0 - 0.05), (r, r, 0.1), vat_lieu)

    def mat_ban(self):
        """Vật nhỏ (xúc xắc, bi, lon...) đặt trên mặt bàn thật; sàn phòng hạ xuống 0,76 m."""
        w = max(self.rx * 2 + self.m * 2, 1.0)
        d = max(self.ry * 2 + self.m * 2, 0.6)
        self.dat("ban", (w, d, 0.76), self.cx, self.cy + d * 0.15, "go", z=self.z0 - 0.76)
        self.z0 -= 0.76
        self.ban = True

    def tuong_sau(self, vat_lieu="trang", cao=3.0, cua_so=True, khoang=None):
        y = self.hi[1] + (khoang if khoang is not None else self.m + 0.6)
        rong = max(self.span * 10, 14)
        self.khoi("hop", (self.cx, y, self.z0 + cao / 2), (rong, 0.12, cao), vat_lieu)
        self.khoi("hop", (self.cx, y - 0.07, self.z0 + 0.05), (rong, 0.02, 0.1), "go")
        if cua_so:
            for i in range(-6, 7):
                self.khoi("hop", (self.cx + i * 1.6, y - 0.07, self.z0 + cao * 0.55), (1.0, 0.03, cao * 0.38), "cua_so")
        return y

    def hang_cay(self, y, so=7, cao=(3.5, 6)):
        for i in range(so):
            x = self.cx + (i - (so - 1) / 2) * max(self.span * 0.55, 3.2) + self.rng.uniform(-0.5, 0.5)
            h = self.rng.uniform(*cao)
            self.dat("cay", (h * 0.6, h * 0.6, h), x, y + self.rng.uniform(-0.6, 0.6))

    def hai_ben(self, mau_tv, co, mau=None, khoang=0.0):
        for s in (-1, 1):
            self.dat(mau_tv, co, self.cx + s * (self.rx + self.m + co[0] / 2 + khoang), self.cy + self.ry * 0.5, mau)


def _nho(k):
    return k.span < 0.6 and (k.hi[2] - k.lo[2]) < 0.6


def trai_ca(k):
    k.san("dat")
    yb = k.hi[1] + k.m + 1.2
    k.dat("hang_rao", (max(k.span * 3, 12), 0.06, 1.3), k.cx, yb, "go")
    k.dat("nha", (6, 4, 3.6), k.cx - k.rx - k.m - 4, yb + 3.5, "trang")
    k.khoi("hop", (k.cx + k.rx + k.m + 4, k.cy, k.z0 - 0.02), (6, 5, 0.06), "nuoc")
    k.hang_cay(yb + 6, 6)


def nong_trai(k):
    k.san("co")
    yb = k.hi[1] + k.m + 1.5
    k.dat("hang_rao", (max(k.span * 3, 14), 0.06, 1.1), k.cx, yb, "go")
    k.dat("nha", (8, 6, 5.5), k.cx + k.rx + k.m + 5, yb + 4, "do")
    for i in range(5):
        k.dat("cay_nho", (0.5, 0.5, 0.5), k.cx - k.rx - k.m - 1 - i * 0.9, k.cy - 0.6)
    k.hang_cay(yb + 8, 7)


def san_truong(k):
    k.san("da")
    yb = k.hi[1] + k.m + 6
    k.dat("nha", (max(k.span * 3, 24), 8, 9), k.cx, yb + 4, "vang")
    k.dat("cot", (0.12, 0.12, 9), k.cx + k.rx + k.m + 3, k.cy + 2, "thep", ts={"co": True})
    k.hang_cay(yb - 2, 5)


def lop_hoc(k):
    if _nho(k):
        k.mat_ban()
    k.san("go")
    y = k.tuong_sau("trang", 3.2)
    k.khoi("hop", (k.cx, y - 0.08, k.z0 + 1.6), (3.6, 0.04, 1.2), "bang")
    for i in (-1, 1):
        k.dat("ban", (1.2, 0.6, 0.75), k.cx + i * (k.rx + k.m + 1.0), k.cy + 0.8)
        k.dat("ghe", (0.42, 0.42, 0.85), k.cx + i * (k.rx + k.m + 1.0), k.cy + 1.4, xoay=180)


def nha_xuong(k):
    if _nho(k):
        k.mat_ban()
    k.san("da")
    y = k.tuong_sau("da", 6, khoang=k.m + 2.5)
    for i in range(-4, 5):
        k.khoi("hop", (k.cx + i * 3, y - 0.2, k.z0 + 3), (0.25, 0.25, 6), "thep")
    for s in (-1, 1):
        k.dat("ke", (2.4, 0.6, 2.4), k.cx + s * (k.rx + k.m + 1.6), y - 1.0, "thep")
        for j in range(3):
            k.dat("hop", (0.5, 0.4, 0.4), k.cx + s * (k.rx + k.m + 1.6) + (j - 1) * 0.65, y - 1.0, "go", z=k.z0 + 0.06)
    for dy in (-k.ry - 0.6, k.ry + 0.6):
        k.khoi("hop", (k.cx, k.cy + dy, k.z0 + 0.003), (max(k.span * 4, 12), 0.1, 0.006), "vang")


def duong_pho(k):
    k.san("da")
    w = max(k.span * 6, 30)
    k.khoi("hop", (k.cx, k.cy, k.z0 - 0.004), (w, max(k.ry * 2 + 3, 7), 0.02), "toi")
    for i in range(-8, 9):
        k.khoi("hop", (k.cx + i * 3, k.cy, k.z0 + 0.008), (1.5, 0.12, 0.005), "trang")
    yb = k.cy + max(k.ry + 1.5, 3.5) + 2
    for i in range(-3, 4):
        h = 8 + (i * 37 % 9)
        k.dat("nha", (7, 6, h), k.cx + i * 8, yb + 4, ["trang", "vang", "gach", "xam"][i % 4])
    for i in range(-2, 3):
        k.dat("cot", (0.15, 0.15, 6), k.cx + i * 7, yb - 1.2, "thep")


def bai_do_xe(k):
    k.san("toi")
    w = max(k.rx * 2 + 8, 16)
    for i in range(-int(w / 2.8), int(w / 2.8) + 1):
        for dy in (-k.ry - 1.0, k.ry + 1.0):
            k.khoi("hop", (k.cx + i * 2.8, k.cy + dy, k.z0 + 0.003), (0.1, 1.6, 0.006), "trang")
    yb = k.hi[1] + k.m + 4
    k.dat("nha", (max(w, 20), 10, 7), k.cx, yb + 5, "trang")
    for s in (-1, 1):
        k.dat("cot", (0.15, 0.15, 6), k.cx + s * (k.rx + 3), k.cy + k.ry + 2.2, "thep")
    k.hang_cay(yb - 1.5, 4, (3, 4.5))


def bo_song(k):
    k.san("co")
    k.khoi("hop", (k.cx, k.hi[1] + k.m + 25, k.z0 - 0.15), (max(k.span * 14, 80), 48, 0.1), "nuoc")
    k.hang_cay(k.lo[1] - k.m - 4, 6)


def cua_hang(k):
    if _nho(k):
        k.mat_ban()
    k.san("trang")
    y = k.tuong_sau("vang", 3.2, cua_so=False)
    for i in range(-3, 4):
        k.dat("ke", (1.6, 0.5, 2.0), k.cx + i * 1.8, y - 0.4, "trang")
        for j in range(4):
            k.dat("hop", (0.25, 0.25, 0.25), k.cx + i * 1.8 + (j - 1.5) * 0.35, y - 0.4,
                  ["do", "xanh_duong", "vang", "xanh_la"][(i + j) % 4], z=k.z0 + 1.02)


def bep(k):
    if _nho(k):
        k.mat_ban()
    k.san("go")
    y = k.tuong_sau("trang", 3.0, cua_so=True)
    k.khoi("hop", (k.cx, y - 0.4, k.z0 + 0.45), (max(k.span * 3, 5), 0.6, 0.9), "trang")
    k.khoi("hop", (k.cx, y - 0.4, k.z0 + 0.92), (max(k.span * 3, 5), 0.64, 0.04), "da")


def cong_vien(k):
    k.san("co")
    k.khoi("hop", (k.cx, k.cy - k.ry - k.m - 1, k.z0 + 0.003), (max(k.span * 6, 20), 2, 0.006), "da")
    for i in range(10):
        a = k.rng.uniform(0.15, 0.85) * 3.1416
        r = k.span + k.m + k.rng.uniform(3, 9)
        import math as _m
        h = k.rng.uniform(3.5, 6.5)
        k.dat("cay", (h * 0.6, h * 0.6, h), k.cx + r * _m.cos(a), k.cy + r * _m.sin(a))
    k.dat("ghe", (1.4, 0.5, 0.85), k.cx + k.rx + k.m + 1.4, k.cy + 1, "go")


def cong_truong(k):
    k.san("dat")
    yb = k.hi[1] + k.m + 2
    k.dat("hang_rao", (max(k.span * 3, 14), 0.06, 1.8), k.cx, yb, "thep")
    for i in range(3):
        k.dat("hop", (1.2, 1.0, 0.8), k.cx - k.rx - k.m - 2, k.cy + i * 0.2, "gach", z=k.z0 + i * 0.8)
    k.dat("cot", (0.4, 0.4, 14), k.cx + k.rx + k.m + 5, yb + 3, "vang")


def ban_thi_nghiem(k):
    if k.span < 1.5:
        k.mat_ban()
    k.san("go")
    k.tuong_sau("trang", 3.0)


def phong(k):
    if _nho(k):
        k.mat_ban()
    k.san("go")
    y = k.tuong_sau("trang", 3.0)
    k.dat("cay_nho", (0.5, 0.5, 1.0), k.cx + k.rx + k.m + 0.9, y - 0.6)


def ngoai_troi(k):
    k.san("co")
    k.hang_cay(k.hi[1] + k.m + 4, 7)


DUNG = {"trai_ca": trai_ca, "nong_trai": nong_trai, "san_truong": san_truong, "lop_hoc": lop_hoc,
        "nha_xuong": nha_xuong, "duong_pho": duong_pho, "bai_do_xe": bai_do_xe, "bo_song": bo_song,
        "cua_hang": cua_hang, "bep": bep, "cong_vien": cong_vien, "cong_truong": cong_truong,
        "ban_thi_nghiem": ban_thi_nghiem, "phong": phong, "ngoai_troi": ngoai_troi}


def dung_moi_truong(mau, lo, hi, seed=5):
    """Trả {chi_tiet, troi, hdri, ngoai_troi, z_san} cho bối cảnh `mau` quanh hộp bao [lo, hi]."""
    info = DANH_MUC["moi_truong"].get(mau)
    if info is None or mau not in DUNG:
        raise KeyError(mau)
    k = KhungCanh(list(lo), list(hi), seed)
    DUNG[mau](k)
    return {"chi_tiet": k.parts, "troi": info["troi"], "hdri": info.get("hdri"),
            "ngoai_troi": info["ngoai_troi"], "tren_ban": k.ban}
