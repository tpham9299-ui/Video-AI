"""AUTO-LAYOUT + AUTO-FIT + ĐẶT NHÃN cho hình phẳng chuẩn.

- lay_mau(): lấy ~48 bộ tham số tự do thỏa giả thiết (nhọn/tù/vuông/cân, AB < AC, không gần cân nếu đề không cho cân, số đo
  góc / độ dài đề cho), hạt giống cố định theo mã bài -> luôn tái lập.
- cham_diem(): ưu tiên khoảng cách nhỏ nhất giữa 2 điểm (chia đường kính hình) LỚN NHẤT, trừ điểm khi điểm sát cạnh không
  liên quan, góc cần tô quá hẹp, giao điểm sát đầu mút.
- vua_khung(): co giãn + căn giữa vừa 82% vùng sân khấu nửa trên khung 9:16 (đơn vị Manim, khung 9 x 16).
- dat_nhan(): chỉ nhãn trong danh sách trắng; thử 16 hướng, chọn hướng ít đè nét / cung góc / đường tròn / nhãn khác,
  ưu tiên hướng ra ngoài tâm đường tròn chính hoặc trọng tâm.
"""
import math
import random

from .hinh import LoiDung, chuan_ten, cong, dai, dinh_hinh_goc, dung_hinh, kc, nhan, tach_diem, tru, thu_tu_tam_giac, goc_do

# ---- khung 9:16 (đơn vị Manim, gốc giữa khung) ----
W, H = 9.0, 16.0
VUNG_HINH = {"x0": -4.2, "x1": 4.2, "y0": -0.75, "y1": 5.05}
TI_LE_LAP = 0.82
KC_NHAN = 0.40
CAO_NHAN = 0.36

SO_MAU = 48


def _rang_buoc_tam_giac(dinh, dieu_kien):
    dinh = [chuan_ten(x) for x in dinh]
    tap = set(dinh)
    rb = {"nhon": False, "tu": None, "vuong": None, "can": None, "deu": False, "co_khong_can": False, "goc": {}, "canh": {}}
    for dk in dieu_kien or []:
        if not isinstance(dk, dict):
            continue
        l = dk.get("loai")
        if l in ("tam_giac_nhon", "tam_giac_tu", "tam_giac_vuong", "tam_giac_can", "tam_giac_deu", "khong_can"):
            if set(tach_diem(dk.get("tg", ""))) != tap:
                continue
        if l == "tam_giac_nhon":
            rb["nhon"] = True
        elif l == "tam_giac_tu":
            rb["tu"] = chuan_ten(dk.get("tai"))
        elif l == "tam_giac_vuong":
            rb["vuong"] = chuan_ten(dk.get("tai"))
        elif l == "tam_giac_can":
            rb["can"] = chuan_ten(dk.get("tai"))
        elif l == "tam_giac_deu":
            rb["deu"] = True
        elif l == "khong_can":
            rb["co_khong_can"] = True
        elif l == "so_do_goc":
            ds = tach_diem(dk.get("goc"))
            if len(ds) == 3 and set(ds) == tap:
                rb["goc"][ds[1]] = float(dk.get("do"))
        elif l == "do_dai":
            ds = tach_diem(dk.get("doan"))
            if len(ds) == 2 and set(ds) <= tap:
                rb["canh"][frozenset(ds)] = float(dk.get("gia_tri"))
    return rb


def _goc_tu_canh(dinh, canh, goc_dinh, rng):
    """Suy 3 góc khi đề cho độ dài cạnh (3 cạnh; 2 cạnh + góc xen giữa; 2 cạnh -> lấy mẫu góc xen giữa)."""
    A, B, C = dinh
    def L(x, y):
        return canh.get(frozenset((x, y)))
    a, b, c = L(B, C), L(A, C), L(A, B)
    if a and b and c:
        try:
            gA = math.degrees(math.acos((b * b + c * c - a * a) / (2 * b * c)))
            gB = math.degrees(math.acos((a * a + c * c - b * b) / (2 * a * c)))
        except ValueError:
            raise LoiDung("HP_DUNG_LOI", "ba độ dài cạnh không tạo thành tam giác")
        return {A: gA, B: gB, C: 180 - gA - gB}
    hai = [(v, x, y) for v, x, y in ((A, B, C), (B, A, C), (C, A, B)) if L(v, x) and L(v, y)]
    if hai:
        v, x, y = hai[0]
        p, q = L(v, x), L(v, y)
        g = goc_dinh.get(v) or rng.uniform(45, 105)
        r = math.sqrt(p * p + q * q - 2 * p * q * math.cos(math.radians(g)))
        gx = math.degrees(math.acos(max(-1, min(1, (p * p + r * r - q * q) / (2 * p * r)))))
        return {v: g, x: gx, y: 180 - g - gx}
    return None


def _mau_goc_tam_giac(dinh, dieu_kien, rng):
    rb = _rang_buoc_tam_giac(dinh, dieu_kien)
    thu_tu = thu_tu_tam_giac(dinh, dieu_kien)
    if rb["deu"]:
        return {x: 60.0 for x in dinh}, rb
    if rb["vuong"]:
        rb["goc"].setdefault(rb["vuong"], 90.0)
    goc = _goc_tu_canh([chuan_ten(x) for x in dinh], rb["canh"], rb["goc"], rng) if rb["canh"] else None
    if goc:
        return goc, rb
    for _ in range(400):
        g = {}
        tren, trai, phai = thu_tu
        if rb["vuong"]:
            g[rb["vuong"]] = 90.0
        if rb["can"]:
            g[rb["can"]] = rb["goc"].get(rb["can"]) or rng.uniform(38 if not rb["nhon"] else 40, 84 if rb["nhon"] else 110)
        g.update({k: v for k, v in rb["goc"].items()})
        con = [x for x in thu_tu if x not in g]
        du = 180 - sum(g.values())
        if rb["can"] and con:
            for x in con:
                g[x] = du / len(con)
        elif len(con) == 1:
            g[con[0]] = du
        elif len(con) >= 2:
            lo, hi = (36, 80) if rb["nhon"] else (28, 112)
            if rb["tu"] and rb["tu"] in con:
                g[rb["tu"]] = rng.uniform(100, 124)
                con = [x for x in con if x != rb["tu"]]
                du = 180 - sum(g.values())
                lo, hi = 20, du - 20
            if len(con) == 1:
                g[con[0]] = du
            else:
                rest = con[:]
                for j, x in enumerate(rest[:-1]):
                    n_con = len(rest) - j - 1
                    g[x] = rng.uniform(max(lo, du - hi * n_con), min(hi, du - lo * n_con))
                    du -= g[x]
                g[rest[-1]] = du
                if not lo - 1e-9 <= g[rest[-1]] <= hi + 1e-9:
                    continue
        if any(v <= 12 for v in g.values()) or abs(sum(g.values()) - 180) > 1e-6:
            continue
        if rb["nhon"] and max(g.values()) >= 88:
            continue
        if rb["tu"] and g.get(rb["tu"], 0) <= 92:
            continue
        if not rb["can"] and not rb["vuong"]:
            v = sorted(g.values())
            if min(v[1] - v[0], v[2] - v[1]) < 7:      # không gần cân khi đề không cho cân
                continue
        elif rb["vuong"] and not rb["can"]:
            con2 = [v for k, v in g.items() if k != rb["vuong"]]
            if abs(con2[0] - con2[1]) < 8:
                continue
        return g, rb
    raise LoiDung("HP_DUNG_LOI", "không tìm được tam giác thỏa các điều kiện đề cho")


def _loc(H, dieu_kien):
    """Điều kiện chỉ kiểm được sau khi dựng: nho_hon / lon_hon (rõ ràng >= 8%), độ dài theo tỉ lệ."""
    for dk in dieu_kien or []:
        if not isinstance(dk, dict):
            continue
        if dk.get("loai") in ("nho_hon", "lon_hon"):
            a, b = tach_diem(dk.get("a")), tach_diem(dk.get("b"))
            if len(a) != 2 or len(b) != 2 or not all(x in H.P for x in a + b):
                continue
            la, lb = kc(H.P[a[0]], H.P[a[1]]), kc(H.P[b[0]], H.P[b[1]])
            if dk["loai"] == "nho_hon" and not la * 1.08 < lb:
                return False
            if dk["loai"] == "lon_hon" and not la > lb * 1.08:
                return False
    return True


def ti_le_that(H, dieu_kien):
    """Đề cho độ dài -> tỉ lệ (độ dài thật / đơn vị hình). Mâu thuẫn -> LoiDung."""
    ti = None
    for dk in dieu_kien or []:
        if isinstance(dk, dict) and dk.get("loai") == "do_dai":
            ds = tach_diem(dk.get("doan"))
            if len(ds) != 2 or not all(x in H.P for x in ds):
                continue
            L = kc(H.P[ds[0]], H.P[ds[1]])
            t = float(dk.get("gia_tri")) / max(L, 1e-12)
            if ti is None:
                ti = t
            elif abs(t - ti) / ti > 1e-4:
                raise LoiDung("HP_DUNG_LOI", "độ dài %s = %s không khớp các dữ kiện độ dài khác (hình chưa dựng đúng dữ kiện)" % (dk.get("doan"), dk.get("gia_tri")))
    return ti


def mau_tham(phep_dung, dieu_kien, rng):
    th = {}
    for i, b in enumerate(phep_dung):
        if not isinstance(b, dict):
            continue
        idb = str(b.get("id") or "d%d" % (i + 1))
        l = b.get("loai")
        if l in ("tam_giac", "tam_giac_noi_tiep"):
            dinh = dinh_hinh_goc(b, 3, idb)
            g, _ = _mau_goc_tam_giac(dinh, dieu_kien, rng)
            tt = thu_tu_tam_giac(dinh, dieu_kien)
            th[idb] = {"goc": (g[tt[0]], g[tt[1]], g[tt[2]])}
        elif l == "tu_giac":
            th[idb] = {"ti_le": rng.uniform(1.25, 1.7), "lech": rng.uniform(0.3, 0.6)}
        elif l == "diem_tren":
            kh = b.get("khoang")
            if str(b.get("tren", "")).startswith("("):
                lo, hi = (kh if isinstance(kh, list) and len(kh) == 2 else (0, 360))
                th[idb] = {"goc": rng.uniform(float(lo), float(hi))}
            else:
                lo, hi = (kh if isinstance(kh, list) and len(kh) == 2 else (0.28, 0.72))
                th[idb] = {"t": rng.uniform(float(lo), float(hi))}
        elif l == "diem_ngoai":
            th[idb] = {"kc": rng.uniform(1.8, 2.5), "goc": rng.uniform(-25, 25)}
    return th


def lay_mau(phep_dung, dieu_kien, hat=0, so=SO_MAU, toi_da_thu=1500):
    """-> [(tham, HinhDung)] các cấu hình hợp lệ; lỗi dựng xuyên suốt -> ném LoiDung đầu tiên."""
    rng = random.Random(hat)
    kq, loi_dau = [], None
    for _ in range(toi_da_thu):
        if len(kq) >= so:
            break
        try:
            th = mau_tham(phep_dung, dieu_kien, rng)
            Hd = dung_hinh(phep_dung, th, dieu_kien)
        except LoiDung as e:
            loi_dau = loi_dau or e
            if e.ma == "HP_DIEM_KHONG_TON_TAI" or "không hỗ trợ" in e.chi_tiet or "không tìm được tam giác" in e.chi_tiet:
                raise
            continue
        if not _loc(Hd, dieu_kien):
            continue
        Hd.ti_le = ti_le_that(Hd, dieu_kien)
        kq.append((th, Hd))
        if not any(isinstance(b, dict) and b.get("loai") in ("tam_giac", "tam_giac_noi_tiep", "tu_giac", "diem_tren", "diem_ngoai") for b in phep_dung):
            break   # không có tham số tự do -> 1 cấu hình
    if not kq:
        raise loi_dau or LoiDung("HP_DUNG_LOI", "không có cấu hình nào thỏa giả thiết")
    return kq


# ---------------- chấm điểm bố cục ----------------
def _kc_doan(p, a, b):
    d = tru(b, a)
    L = d[0] * d[0] + d[1] * d[1]
    if L < 1e-18:
        return kc(p, a)
    t = max(0.0, min(1.0, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L))
    return kc(p, (a[0] + d[0] * t, a[1] + d[1] * t))


def hop_bao(Hd, chi_diem=False):
    xs, ys = [], []
    for p in Hd.P.values():
        xs.append(p[0])
        ys.append(p[1])
    if not chi_diem:
        for n in Hd.net:
            if n["loai"] == "tron":
                cx, cy, r = Hd.C[n["khoa"]]
                xs += [cx - r, cx + r]
                ys += [cy - r, cy + r]
    return min(xs), min(ys), max(xs), max(ys)


def cham_diem(Hd, goc_to=()):
    x0, y0, x1, y1 = hop_bao(Hd)
    duong_kinh = max(math.hypot(x1 - x0, y1 - y0), 1e-9)
    ten = list(Hd.P)
    min_kc = min((kc(Hd.P[a], Hd.P[b]) for i, a in enumerate(ten) for b in ten[i + 1:]), default=duong_kinh) / duong_kinh
    phat = 0.0
    doan = Hd.doan_da_ve()
    for t in ten:
        p = Hd.P[t]
        for a, b in doan:
            if t in (a, b) or a not in Hd.P or b not in Hd.P:
                continue
            d = _kc_doan(p, Hd.P[a], Hd.P[b]) / duong_kinh
            if 1e-7 < d < 0.04:
                phat += (0.04 - d) * 6
    for g in goc_to:
        ds = tach_diem(g)
        if len(ds) == 3 and all(x in Hd.P for x in ds):
            try:
                v = goc_do(Hd.P[ds[0]], Hd.P[ds[1]], Hd.P[ds[2]])
            except LoiDung:
                continue
            if v < 22:
                phat += (22 - v) / 22 * 0.05
    # hình quá dẹt (tỉ lệ khung dọc) cũng trừ điểm nhẹ: vùng hình 8,4 x 5,8
    rong, cao = x1 - x0, y1 - y0
    lech_khung = abs(math.log(max(rong, 1e-9) / max(cao, 1e-9)) - math.log(8.4 / 5.8))
    return min_kc - phat - 0.012 * lech_khung, {"min_kc": round(min_kc, 4), "phat": round(phat, 4)}


# ---------------- co vừa khung ----------------
def vua_khung(Hd, vung=VUNG_HINH, ti_le=TI_LE_LAP):
    x0, y0, x1, y1 = hop_bao(Hd)
    rw, rh = vung["x1"] - vung["x0"], vung["y1"] - vung["y0"]
    s = min(ti_le * rw / max(x1 - x0, 1e-9), ti_le * rh / max(y1 - y0, 1e-9))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    tx, ty = (vung["x0"] + vung["x1"]) / 2, (vung["y0"] + vung["y1"]) / 2
    f = lambda p: ((p[0] - cx) * s + tx, (p[1] - cy) * s + ty)
    P = {k: f(v) for k, v in Hd.P.items()}
    C = {k: (f((v[0], v[1]))[0], f((v[0], v[1]))[1], v[2] * s) for k, v in Hd.C.items()}
    bx0, by0, bx1, by1 = (x0 - cx) * s + tx, (y0 - cy) * s + ty, (x1 - cx) * s + tx, (y1 - cy) * s + ty
    lap = max((bx1 - bx0) / rw, (by1 - by0) / rh)
    return P, C, s, {"hop": [round(bx0, 3), round(by0, 3), round(bx1, 3), round(by1, 3)], "ty_le_lap": round(lap, 3)}


# ---------------- đặt nhãn ----------------
def _hop_nhan(c, ten):
    rong = 0.30 + 0.16 * max(0, len(ten.replace("_", "")) - 1)
    return (c[0] - rong / 2, c[1] - CAO_NHAN / 2, c[0] + rong / 2, c[1] + CAO_NHAN / 2)


def _chong(h1, h2):
    dx = min(h1[2], h2[2]) - max(h1[0], h2[0])
    dy = min(h1[3], h2[3]) - max(h1[1], h2[1])
    return max(0.0, dx) * max(0.0, dy)


def dat_nhan(P, C, doan, tron_ve, ds_nhan, cung_goc=(), tam_chinh=None, vung=VUNG_HINH):
    """P, C sau co khung. doan: [(a,b)] mọi nét sẽ có; cung_goc: [(đỉnh, a, b)] góc sẽ tô (né cung); -> ({tên: [x,y]}, số va chạm)."""
    if not ds_nhan:
        return {}, 0
    trong_tam = (sum(p[0] for p in P.values()) / len(P), sum(p[1] for p in P.values()) / len(P))
    ve_doan = [(P[a], P[b]) for a, b in doan if a in P and b in P]
    vong = [C[k] for k in tron_ve if k in C]
    huong = [(math.cos(2 * math.pi * k / 16), math.sin(2 * math.pi * k / 16)) for k in range(16)]
    da_dat, kq, va_cham = [], {}, 0
    # đặt nhãn điểm "chật" trước (nhiều nét tới)
    def bac(t):
        return sum(1 for a, b in doan if t in (a, b))
    for t in sorted(ds_nhan, key=lambda t: -bac(t)):
        if t not in P:
            continue
        p = P[t]
        tam = tam_chinh if tam_chinh and kc(p, tam_chinh[:2]) <= tam_chinh[2] * 1.05 else None
        goc_ra = tru(p, tam[:2] if tam else trong_tam)
        ra = (goc_ra[0] / max(dai(goc_ra), 1e-9), goc_ra[1] / max(dai(goc_ra), 1e-9)) if dai(goc_ra) > 1e-6 else (0, 1)
        cam = []
        for o, a, b in cung_goc:
            if o == t and a in P and b in P:
                u, v = tru(P[a], p), tru(P[b], p)
                cam.append((u, v))
        tot, tot_c = None, 1e18
        # T13 kiểm toán phiên 3: thêm vòng đẩy xa 1,35x (phạt nhẹ) cho điểm "chật" như I kẹp giữa ED và AI
        for h, kx in [(h, kx) for kx in (1.0, 1.35) for h in huong]:
            c = cong(p, nhan(h, KC_NHAN * kx))
            hop = _hop_nhan(c, t)
            chi = 0.35 * (1 - (h[0] * ra[0] + h[1] * ra[1])) + (kx - 1.0) * 0.9
            for a, b in ve_doan:
                d = _kc_doan(c, a, b)
                if d < 0.30:
                    chi += (0.30 - d) * 12
            for cx, cy, r in vong:
                d = abs(math.hypot(c[0] - cx, c[1] - cy) - r)
                if d < 0.24:
                    chi += (0.24 - d) * 10
            for t2, q in P.items():
                if t2 != t and kc(c, q) < 0.34:
                    chi += (0.34 - kc(c, q)) * 14
            for h2 in da_dat:
                chi += _chong(hop, h2) * 80
            for u, v in cam:      # hướng nằm trong góc sẽ tô -> đè cung
                cu = (u[0] * h[1] - u[1] * h[0]) * (u[0] * v[1] - u[1] * v[0])
                cv = (h[0] * v[1] - h[1] * v[0]) * (u[0] * v[1] - u[1] * v[0])
                if cu >= 0 and cv >= 0:
                    chi += 3.0
            if hop[0] < vung["x0"] - 0.25 or hop[2] > vung["x1"] + 0.25 or hop[1] < vung["y0"] - 0.35 or hop[3] > vung["y1"] + 0.3:
                chi += 4.0
            if chi < tot_c:
                tot, tot_c = c, chi
        if tot_c > 1.6:
            va_cham += 1
        kq[t] = [round(tot[0], 4), round(tot[1], 4)]
        da_dat.append(_hop_nhan(tot, t))
    return kq, va_cham
