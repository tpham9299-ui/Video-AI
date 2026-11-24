"""v99.2 — ve25d: thư viện vẽ 2.5D dùng sẵn cho sân khấu tự sinh (`tu_sinh_svg`).

Mã Python do BP2 (Gemini) viết chạy trong hộp cát scripts/tu_sinh_svg.py được phép `import ve25d` (cùng `math`).
Mọi hàm trả CHUỖI SVG (tọa độ tuyệt đối trong viewBox 0 0 800 540) hoặc (svg, dữ liệu điểm) - thuần toán học, tất định.

Luật thẩm mỹ được dựng sẵn (hộp cát --chi-kiem cũng kiểm lại):
  * chữ >= CO_CHU_MIN (24 px; sàn cứng của hộp cát = 22 px), phông kế thừa Be Vietnam Pro của sân khấu;
  * màu CHỈ qua MAU[...] (token theo theme: chuanbi.py đổi họ màu nhấn theo theme của video - tu_sinh_svg.doi_mau_theme);
  * nhãn KHÔNG đè nét / đỉnh: `nhan()` thử 8 hướng quanh điểm neo, tránh danh sách điểm `tranh`, kẻ đường gióng mảnh
    + hộp nền mờ; mặt bên 2.5D đậm hơn lệch xuống, bóng mềm = bản sao rgba(0,0,0,.28) (không filter / blur).

Ví dụ (trong ve() của mã tự sinh):
    import ve25d as v
    svg, P = v.hop(260, 330, 220, 120, 110, mau="nhan")
    nhan = v.nhan(P["A"][0], P["A"][1], "A", tranh=list(P.values()))
    return [v.lop(0, svg + nhan, "no", khi_noi="hộp quà")]
"""
import math

W, H = 800.0, 540.0
LE = 24.0
CO_CHU_MIN = 24

# token màu (giá trị gốc = theme deep_ocean; chuanbi.py xoay họ màu nhấn theo theme của video)
MAU = {
    "nhan": "#5CE1E6", "nhan_dam": "#2B97A6", "nhan_toi": "#1F6F80",      # cyan: bước / dữ kiện / nhánh đang giảng
    "ket": "#FFB547", "ket_toi": "#8A5A16",                                # hổ phách: kết quả / mục tiêu (chỉ bước chốt)
    "cu": "#7C8DA6", "cu_toi": "#3A4A60",                                  # xám xanh: lớp cũ / loại trừ
    "chu": "#E9EEF5", "chu_mo": "#B8C4D6",                                 # chữ
    "mat": "#16324A", "mat_toi": "#0C1E2E", "nen": "#0B1A26",             # mặt khối trung tính / nền hộp nhãn
    "dung": "#6BE38C", "sai": "#FF6B6B",                                   # ✓ / ✕ (màu dữ liệu)
    "bong": "rgba(0,0,0,0.28)",
}
TOI = {"nhan": "nhan_toi", "nhan_dam": "nhan_toi", "ket": "ket_toi", "cu": "cu_toi", "mat": "mat_toi", "chu": "cu", "dung": "mat_toi", "sai": "mat_toi"}


def m(ten):
    """Token -> mã màu (chuỗi khác token giữ nguyên, ví dụ 'none')."""
    return MAU.get(ten, ten)


def toi(ten):
    return m(TOI.get(ten, "mat_toi"))


def _f(x):
    return "%.1f" % x


def kep(x, y, le=2.0):
    return min(max(x, le), W - le), min(max(y, le), H - le)


def diem(pts, dx=0.0, dy=0.0):
    return " ".join("%s,%s" % (_f(x + dx), _f(y + dy)) for x, y in pts)


def thoat(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def rong_chu(s, co):
    """Bề rộng ước lượng của dòng chữ (Be Vietnam Pro đậm ~0,56 em / ký tự)."""
    return 0.56 * co * len(str(s))


def chu(x, y, s, co=28, mau="chu", dam=700, neo="middle"):
    co = max(int(co), CO_CHU_MIN)
    x, y = kep(x, y, 4)
    return '<text x="%s" y="%s" fill="%s" font-size="%d" font-weight="%d" text-anchor="%s">%s</text>' % (_f(x), _f(y), m(mau), co, dam, neo, thoat(s))


def da_giac(pts, mau="nhan", vien=None, day=7.0, bong=True, w=2.2, mo=1.0):
    """Mảng phẳng nổi 2.5D: bóng mềm + mặt bên (đậm hơn, lệch xuống `day`) + mặt chính viền sáng."""
    s = ""
    if bong:
        s += '<polygon points="%s" fill="%s"/>' % (diem(pts, 9, 11), MAU["bong"])
    if day:
        s += '<polygon points="%s" fill="%s"/>' % (diem(pts, 0, day), toi(mau))
    s += '<polygon points="%s" fill="%s" fill-opacity="%.2f" stroke="%s" stroke-width="%.1f" stroke-linejoin="round"/>' % (
        diem(pts), m(mau), mo, m(vien or "chu"), w)
    return s


def duong(pts, mau="nhan", w=3.0, net_dut=False, mo=1.0):
    d = "M " + " L ".join("%s %s" % (_f(x), _f(y)) for x, y in pts)
    return '<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" stroke-linecap="round" stroke-linejoin="round"%s%s/>' % (
        d, m(mau), w, ' stroke-dasharray="9 7"' if net_dut else "", (' stroke-opacity="%.2f"' % mo) if mo < 1 else "")


def mui_ten(x1, y1, x2, y2, mau="chu", w=2.5, dau=13.0):
    goc = math.atan2(y2 - y1, x2 - x1)
    a = (x2 - dau * math.cos(goc - 0.42), y2 - dau * math.sin(goc - 0.42))
    b = (x2 - dau * math.cos(goc + 0.42), y2 - dau * math.sin(goc + 0.42))
    xe, ye = x2 - 0.8 * dau * math.cos(goc), y2 - 0.8 * dau * math.sin(goc)
    return ('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%.1f" stroke-linecap="round"/>' % (_f(x1), _f(y1), _f(xe), _f(ye), m(mau), w) +
            '<polygon points="%s" fill="%s"/>' % (diem([(x2, y2), a, b]), m(mau)))


def cung(cx, cy, r, a0, a1, mau="nhan", w=3.0, to=None, mo=0.3):
    """Cung tròn từ góc a0 tới a1 (độ, chiều dương = theo kim đồng hồ trên màn hình). to=token -> tô hình quạt."""
    x0, y0 = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
    x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
    lon = 1 if abs(a1 - a0) % 360 > 180 else 0
    if to:
        return '<path d="M %s %s L %s %s A %s %s 0 %d 1 %s %s Z" fill="%s" fill-opacity="%.2f" stroke="%s" stroke-width="%.1f"/>' % (
            _f(cx), _f(cy), _f(x0), _f(y0), _f(r), _f(r), lon, _f(x1), _f(y1), m(to), mo, m(mau), w)
    return '<path d="M %s %s A %s %s 0 %d 1 %s %s" fill="none" stroke="%s" stroke-width="%.1f" stroke-linecap="round"/>' % (
        _f(x0), _f(y0), _f(r), _f(r), lon, _f(x1), _f(y1), m(mau), w)


def mien_to(pts, mau="nhan", mo=0.35, vien=None, w=2.0):
    return '<polygon points="%s" fill="%s" fill-opacity="%.2f"%s/>' % (
        diem(pts), m(mau), mo, (' stroke="%s" stroke-width="%.1f"' % (m(vien), w)) if vien else "")


def cham(x, y, r=7.0, mau="ket"):
    return '<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-width="2"/>' % (_f(x), _f(y), _f(r), m(mau), m("nen"))


# ---------------------------------------------------------------- khối 2.5D
def hop(x, y, a, b, c, mau="nhan", k=0.5, goc=32.0, khuat=True):
    """Hình hộp chiếu xiên: mặt trước = chữ nhật a x c, góc dưới trái (x, y); chiều sâu b vẽ theo `goc` hệ số k.
    Đỉnh: A B C D (đáy: trước trái, trước phải, sau phải, sau trái), E F G H ở trên A B C D. Trả (svg, P)."""
    dx, dy = b * k * math.cos(math.radians(goc)), -b * k * math.sin(math.radians(goc))
    A, B = (x, y), (x + a, y)
    C, D = (x + a + dx, y + dy), (x + dx, y + dy)
    E, F, G, Hh = (x, y - c), (x + a, y - c), (x + a + dx, y + dy - c), (x + dx, y + dy - c)
    P = {"A": A, "B": B, "C": C, "D": D, "E": E, "F": F, "G": G, "H": Hh}
    s = '<polygon points="%s" fill="%s"/>' % (diem([A, B, C, G, Hh, E], 10, 12), MAU["bong"])
    if khuat:
        s += "".join('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="2" stroke-dasharray="8 7" stroke-opacity="0.7"/>' % (
            _f(p[0]), _f(p[1]), _f(q[0]), _f(q[1]), m("chu_mo")) for p, q in ((D, A), (D, C), (D, Hh)))
    s += '<polygon points="%s" fill="%s" stroke="%s" stroke-width="2.2" stroke-linejoin="round"/>' % (diem([B, C, G, F]), toi(mau), m("chu"))
    s += '<polygon points="%s" fill="%s" fill-opacity="0.92" stroke="%s" stroke-width="2.2" stroke-linejoin="round"/>' % (diem([E, F, G, Hh]), m(mau), m("chu"))
    s += '<polygon points="%s" fill="%s" fill-opacity="0.55" stroke="%s" stroke-width="2.2" stroke-linejoin="round"/>' % (diem([A, B, F, E]), m(mau), m("chu"))
    return s, P


def tru(cx, cy, r, h, mau="nhan", k=0.32):
    """Hình trụ đứng: tâm đáy (cx, cy), bán kính r, cao h. Trả (svg, P) với P = {'day', 'nap', 'trai', 'phai'}."""
    ry = r * k
    s = '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (_f(cx + 10), _f(cy + 12), _f(r), _f(ry), MAU["bong"])
    s += '<path d="M %s %s L %s %s A %s %s 0 0 0 %s %s L %s %s A %s %s 0 0 0 %s %s Z" fill="%s" stroke="%s" stroke-width="2.2"/>' % (
        _f(cx - r), _f(cy - h), _f(cx - r), _f(cy), _f(r), _f(ry), _f(cx + r), _f(cy), _f(cx + r), _f(cy - h), _f(r), _f(ry), _f(cx - r), _f(cy - h),
        toi(mau), m("chu"))
    s += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" stroke="%s" stroke-width="2.2"/>' % (_f(cx), _f(cy - h), _f(r), _f(ry), m(mau), m("chu"))
    return s, {"day": (cx, cy), "nap": (cx, cy - h), "trai": (cx - r, cy), "phai": (cx + r, cy)}


def trai_phang_2mat(x, y, rong1, rong2, cao, mau1="nhan", mau2="nhan_dam", nhan_mat=("", "")):
    """Hai mặt kề nhau của hộp trải phẳng thành một hình chữ nhật (rong1 + rong2) x cao (kiến bò đường ngắn nhất).
    (x, y) = góc TRÊN trái. Trả (svg, P): P['A'] = góc dưới trái, P['G'] = góc trên phải, P['gap'] = 2 đầu nếp gấp."""
    s = da_giac([(x, y), (x + rong1, y), (x + rong1, y + cao), (x, y + cao)], mau1, day=6)
    s += da_giac([(x + rong1, y), (x + rong1 + rong2, y), (x + rong1 + rong2, y + cao), (x + rong1, y + cao)], mau2, day=6, bong=False)
    s += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="2" stroke-dasharray="6 6"/>' % (
        _f(x + rong1), _f(y), _f(x + rong1), _f(y + cao), m("chu"))
    for k, (cx, ten) in enumerate(((x + rong1 / 2, nhan_mat[0]), (x + rong1 + rong2 / 2, nhan_mat[1]))):
        if ten:   # tên mặt đặt NGOÀI hình (trên mép), không để đường chéo cắt qua
            s += chu(cx, y - 14, ten, co=24, mau="chu_mo", dam=600)
    return s, {"A": (x, y + cao), "G": (x + rong1 + rong2, y), "gap": ((x + rong1, y), (x + rong1, y + cao))}


# ---------------------------------------------------------------- lưới / bàn cờ / hệ trục / đồ thị
def luoi(x, y, w, h, nx, ny, mau="chu", mo=0.14):
    s = ""
    for i in range(nx + 1):
        xi = x + w * i / nx
        s += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-opacity="%.2f" stroke-width="1.2"/>' % (_f(xi), _f(y), _f(xi), _f(y + h), m(mau), mo)
    for j in range(ny + 1):
        yj = y + h * j / ny
        s += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-opacity="%.2f" stroke-width="1.2"/>' % (_f(x), _f(yj), _f(x + w), _f(yj), m(mau), mo)
    return s


def ban_co(x, y, o, n, to=(), mau_to="ket"):
    """Bàn cờ n x n ô cạnh o; to = các ô (i, j) được tô (hạt thóc / bèo...)."""
    s = '<rect x="%s" y="%s" width="%s" height="%s" fill="%s" stroke="%s" stroke-width="2"/>' % (_f(x), _f(y), _f(o * n), _f(o * n), m("mat"), m("cu"))
    for i in range(n):
        for j in range(n):
            if (i + j) % 2:
                s += '<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>' % (_f(x + i * o), _f(y + j * o), _f(o), _f(o), m("mat_toi"))
    for i, j in to:
        s += '<rect x="%s" y="%s" width="%s" height="%s" fill="%s" fill-opacity="0.85"/>' % (_f(x + i * o + 2), _f(y + j * o + 2), _f(o - 4), _f(o - 4), m(mau_to))
    return s


def he_truc(x, y, w, h, u_max=1.0, v_max=1.0, nhan_x="", nhan_y="", vach=(), co=24):
    """Hệ trục góc dưới trái (x, y + h). Trả (svg, f) với f(u, v) -> (px, py). vach = các giá trị đánh dấu trên 2 trục."""
    def f(u, v):
        return x + w * u / u_max, y + h - h * v / v_max
    s = mui_ten(x, y + h, x + w + 22, y + h, "chu_mo", 2.2) + mui_ten(x, y + h, x, y - 22, "chu_mo", 2.2)
    for t in vach:
        px, _ = f(t, 0)
        _, py = f(0, t)
        s += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="2"/>' % (_f(px), _f(y + h - 6), _f(px), _f(y + h + 6), m("chu_mo"))
        s += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="2"/>' % (_f(x - 6), _f(py), _f(x + 6), _f(py), m("chu_mo"))
        s += chu(px, y + h + 10 + co, ("%g" % t), co=co, mau="chu_mo", dam=600)
        s += chu(x - 12, py + co * 0.35, ("%g" % t), co=co, mau="chu_mo", dam=600, neo="end")
    if nhan_x:
        s += chu(x + w + 24, y + h + co + 10, nhan_x, co=co, mau="chu_mo", dam=600, neo="end")
    if nhan_y:
        s += chu(x + 14, y - 26, nhan_y, co=co, mau="chu_mo", dam=600, neo="start")
    return s, f


def do_thi(x, y, w, h, ham, a, b, mau="nhan", n=64, y_min=None, y_max=None, cuc_tri=None, w_net=3.4):
    """Đồ thị y = ham(t), t thuộc [a, b] trong khung (x, y, w, h). cuc_tri = t* -> chấm hổ phách. Trả (svg, f, P)."""
    ts = [a + (b - a) * i / n for i in range(n + 1)]
    ys = [ham(t) for t in ts]
    lo = min(ys) if y_min is None else y_min
    hi = max(ys) if y_max is None else y_max
    if hi - lo < 1e-12:
        hi = lo + 1.0

    def f(t, v):
        return x + w * (t - a) / (b - a), y + h - h * (v - lo) / (hi - lo)
    s = duong([f(t, v) for t, v in zip(ts, ys)], mau, w_net)
    P = {}
    if cuc_tri is not None:
        px, py = f(cuc_tri, ham(cuc_tri))
        s += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1.8" stroke-dasharray="6 6"/>' % (_f(px), _f(py), _f(px), _f(y + h), m("ket"))
        s += cham(px, py, 9, "ket")
        P["cuc_tri"] = (px, py)
    return s, f, P


# ---------------------------------------------------------------- vật xác suất
def cua(x, y, w, h, so, mo=False, mau="cu", ben_trong="", mau_trong="ket"):
    """Cánh cửa Monty Hall: khung + cánh; mo=True -> cánh hé (hình thang) lộ `ben_trong`."""
    s = '<rect x="%s" y="%s" width="%s" height="%s" rx="6" fill="%s" stroke="%s" stroke-width="2.4"/>' % (_f(x), _f(y), _f(w), _f(h), m("mat_toi"), m("chu_mo"))
    if mo:
        if ben_trong:
            s += chu(x + w / 2, y + h / 2 + 10, ben_trong, co=30, mau=mau_trong)
        s += '<polygon points="%s" fill="%s" stroke="%s" stroke-width="2.2"/>' % (diem([(x, y), (x + w * 0.28, y + h * 0.08), (x + w * 0.28, y + h * 0.92), (x, y + h)]), m(mau), m("chu"))
    else:
        s += '<rect x="%s" y="%s" width="%s" height="%s" rx="5" fill="%s" stroke="%s" stroke-width="2.2"/>' % (_f(x + 6), _f(y + 6), _f(w - 12), _f(h - 12), m(mau), m("chu"))
        s += '<circle cx="%s" cy="%s" r="5" fill="%s"/>' % (_f(x + w - 20), _f(y + h * 0.55), m("ket"))
        s += chu(x + w / 2, y + h * 0.36, str(so), co=34, mau="chu")
    return s


def the_bai(x, y, w, h, chu_the, mau="nhan"):
    return (da_giac([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], mau, day=6) + chu(x + w / 2, y + h / 2 + 10, chu_the, co=30, mau="nen"))


# ---------------------------------------------------------------- nhãn tự tránh nét
HUONG = [(1, 0), (1, -1), (0, -1), (-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1)]


def _phang(tranh):
    ra = []
    for p in tranh or ():
        if isinstance(p, (list, tuple)) and len(p) == 2 and all(isinstance(q, (int, float)) for q in p):
            ra.append((float(p[0]), float(p[1])))
        elif isinstance(p, (list, tuple, dict)):
            ra += _phang(list(p.values()) if isinstance(p, dict) else p)
    return ra


def hop_nhan(ax, ay, s, co=26, huong=(1, -1), kc=30.0, dem=8.0):
    """Hộp nhãn (x0, y0, x1, y1) đặt theo hướng `huong` cách điểm neo `kc` px."""
    co = max(int(co), CO_CHU_MIN)
    w, h = rong_chu(s, co) + 2 * dem, co + 2 * dem * 0.75
    hx, hy = huong
    n = math.hypot(hx, hy) or 1.0
    cx = ax + hx / n * (kc + w / 2 * abs(hx / n))
    cy = ay + hy / n * (kc + h / 2 * abs(hy / n))
    return cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2


def nhan(ax, ay, s, tranh=(), co=26, mau="chu", nen=True, kc=30.0, uu_tien=None, giong=True):
    """Nhãn KHÔNG đè nét / đỉnh: thử 8 hướng quanh (ax, ay) (ưu tiên `uu_tien` nếu có), bỏ hướng làm hộp ra khỏi
    viewBox hoặc chứa điểm trong `tranh` (điểm / list điểm / dict điểm); không hướng nào sạch -> hướng xa điểm gần nhất nhất.
    Vẽ đường gióng mảnh (neo -> mép hộp) + hộp nền mờ + chữ căn giữa."""
    co = max(int(co), CO_CHU_MIN)
    pts = [p for p in _phang(tranh) if math.hypot(p[0] - ax, p[1] - ay) > 1.0]
    thu = list(HUONG)
    if uu_tien:
        thu = [tuple(uu_tien)] + [d for d in thu if d != tuple(uu_tien)]
    tot, bd = None, -1.0
    for d in thu:
        x0, y0, x1, y1 = hop_nhan(ax, ay, s, co, d, kc)
        if x0 < LE / 2 or y0 < LE / 2 or x1 > W - LE / 2 or y1 > H - LE / 2:
            continue
        gan = min([math.hypot(max(x0 - px, 0, px - x1), max(y0 - py, 0, py - y1)) for px, py in pts] or [99.0])
        if gan >= 6.0:
            tot = (x0, y0, x1, y1)
            break
        if gan > bd:
            bd, tot = gan, (x0, y0, x1, y1)
    if tot is None:
        x0, y0, x1, y1 = hop_nhan(ax, ay, s, co, (1, -1), kc)
        dx = max(0, LE / 2 - x0) - max(0, x1 - (W - LE / 2))
        dy = max(0, LE / 2 - y0) - max(0, y1 - (H - LE / 2))
        tot = (x0 + dx, y0 + dy, x1 + dx, y1 + dy)
    x0, y0, x1, y1 = tot
    out = ""
    if giong and kc > 4:
        mx, my = min(max(ax, x0), x1), min(max(ay, y0), y1)
        out += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1.4" stroke-opacity="0.75"/>' % (_f(ax), _f(ay), _f(mx), _f(my), m("chu_mo"))
    if nen:
        out += '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s" fill-opacity="0.78" stroke="%s" stroke-opacity="0.35" stroke-width="1.2"/>' % (
            _f(x0), _f(y0), _f(x1 - x0), _f(y1 - y0), _f(min(12, (y1 - y0) / 2)), m("nen"), m("chu"))
    out += chu((x0 + x1) / 2, (y0 + y1) / 2 + co * 0.36, s, co=co, mau=mau)
    return out


# ---------------------------------------------------------------- v101.3: bộ lắp ghép chuẩn chống đè chữ
# Mọi hàm dưới đây: tọa độ kẹp trong viewBox, chữ >= 24 px, chữ gần nét luôn nằm trong hộp nền tối ĐẶC của chính lớp (qua kiểm
# thẩm mỹ TS_CHU_NHO / TS_MAU_LA / TS_NHAN_DE_NET / TS_CHONG_CHU), màu chỉ qua token MAU. Chỉ dùng builtins được hộp cát cho phép.
def _dinh_deu(cx, cy, r, n, goc):
    return [(cx + r * math.cos(math.radians(goc + 360.0 * k / n)), cy + r * math.sin(math.radians(goc + 360.0 * k / n))) for k in range(n)]


def _trong_khung(pts, le=None):
    le = LE / 2 if le is None else le
    return all(le <= px <= W - le and le <= py <= H - le for px, py in pts)


def _don_vi(dx, dy):
    n = math.hypot(dx, dy) or 1.0
    return dx / n, dy / n


def _kich_pill(s, co):
    return rong_chu(s, co) + 26.0, co + 14.0


def tam_nhan(x, y, text, mau=None, co=24):
    """Nhãn viên thuốc: hộp nền tối đặc viền màu theme, rộng theo độ dài chữ (không bao giờ bị nét cắt). (x, y) = tâm hộp."""
    co = max(int(co), CO_CHU_MIN)
    s = str(text)
    toi_da = max(1, int((W - LE - 26.0) / (0.56 * co)))
    s = s[:toi_da]
    w, h = _kich_pill(s, co)
    x0 = min(max(x - w / 2, LE / 2), W - LE / 2 - w)
    y0 = min(max(y - h / 2, LE / 2), H - LE / 2 - h)
    out = '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s" fill-opacity="0.96" stroke="%s" stroke-width="2.2"/>' % (
        _f(x0), _f(y0), _f(w), _f(h), _f(h / 2), m("nen"), m(mau or "nhan"))
    return out + chu(x0 + w / 2, y0 + h / 2 + co * 0.36, s, co=co, mau="chu")


def da_giac_deu(cx, cy, r, so_canh, goc_bd=-90, mau=None, to_nen=False):
    """Đa giác đều (3..12 cạnh) tâm (cx, cy), đỉnh đầu ở góc `goc_bd` độ. Tự co bán kính cho vừa viewBox.
    Trả (svg, danh_sach_dinh) - các lớp sau dùng ĐÚNG tọa độ đỉnh này (nối đỉnh, gắn nhãn, cung góc)."""
    n = max(3, min(int(so_canh), 12))
    rr = float(r)
    pts = _dinh_deu(cx, cy, rr, n, goc_bd)
    for _ in range(60):
        if _trong_khung(pts):
            break
        rr *= 0.95
        pts = _dinh_deu(cx, cy, rr, n, goc_bd)
    pts = [kep(px, py, LE / 2) for px, py in pts]
    mc = mau or "nhan"
    if to_nen:
        s = '<polygon points="%s" fill="%s" fill-opacity="0.38" stroke="%s" stroke-width="2.4" stroke-linejoin="round"/>' % (diem(pts), m(mc), m("chu"))
    else:
        s = '<polygon points="%s" fill="none" stroke="%s" stroke-width="3.2" stroke-linejoin="round"/>' % (diem(pts), m(mc))
    return s, pts


def mui_ten_kich_thuoc(x1, y1, x2, y2, text, lech=26, mau=None):
    """Đoạn đo kích thước: 2 đường gióng mảnh + đường đo song song cách `lech` px, 2 đầu mũi tên, nhãn viên thuốc ở giữa.
    Tự đẩy sang PHÍA THOÁNG (còn đủ lề trong viewBox; ưu tiên phía dấu của `lech`)."""
    mc = mau or "chu_mo"
    ux, uy = _don_vi(x2 - x1, y2 - y1)
    pnx, pny = -uy, ux
    d0 = abs(float(lech)) or 26.0
    s_txt = str(text)
    w, h = _kich_pill(s_txt[:max(1, int((W - LE - 26.0) / (0.56 * CO_CHU_MIN)))], CO_CHU_MIN) if s_txt else (0.0, 0.0)
    dai = math.hypot(x2 - x1, y2 - y1)
    xa = h / 2 + 10.0 if (s_txt and dai < w + 70.0) else 0.0
    uu = 1.0 if float(lech) >= 0 else -1.0

    def hinh(sg):
        a = (x1 + pnx * sg * d0, y1 + pny * sg * d0)
        b = (x2 + pnx * sg * d0, y2 + pny * sg * d0)
        c = ((a[0] + b[0]) / 2 + pnx * sg * xa, (a[1] + b[1]) / 2 + pny * sg * xa)
        le = min([min(px - LE / 2, W - LE / 2 - px, py - LE / 2, H - LE / 2 - py) for px, py in (a, b, c)])
        return a, b, c, le
    h1, h2 = hinh(uu), hinh(-uu)
    sg = uu
    kq = h1
    if h1[3] < 0 and h2[3] > h1[3]:
        sg, kq = -uu, h2
    a, b, c, _ = kq
    a, b = kep(a[0], a[1], LE / 2), kep(b[0], b[1], LE / 2)
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    out = ""
    for (px, py), (qx, qy) in (((x1, y1), a), ((x2, y2), b)):
        out += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1.6" stroke-opacity="0.8"/>' % (
            _f(px + pnx * sg * 6), _f(py + pny * sg * 6), _f(qx + pnx * sg * 8), _f(qy + pny * sg * 8), m(mc))
    out += mui_ten(mx, my, a[0], a[1], mc, 2.4, 12.0) + mui_ten(mx, my, b[0], b[1], mc, 2.4, 12.0)
    if s_txt:
        out += tam_nhan(c[0], c[1], s_txt, mc)
    return out


def cung_goc(ox, oy, x1, y1, x2, y2, r=36, text="", mau=None):
    """Cung góc tại đỉnh (ox, oy) giữa tia tới (x1, y1) và tia tới (x2, y2) (góc <= 180°); ~90° -> ký hiệu góc vuông.
    `text` -> nhãn góc viên thuốc đặt ngoài cung theo phân giác."""
    mc = mau or "ket"
    a0 = math.degrees(math.atan2(y1 - oy, x1 - ox))
    a1 = math.degrees(math.atan2(y2 - oy, x2 - ox))
    dl = (a1 - a0 + 180.0) % 360.0 - 180.0
    lo = a0 if dl >= 0 else a1
    ang = abs(dl)
    rr = max(18.0, min(float(r), 90.0))
    if abs(ang - 90.0) <= 4.0:
        k = 0.75 * min(rr, 40.0)
        ux, uy = _don_vi(x1 - ox, y1 - oy)
        vx, vy = _don_vi(x2 - ox, y2 - oy)
        s = duong([(ox + ux * k, oy + uy * k), (ox + (ux + vx) * k, oy + (uy + vy) * k), (ox + vx * k, oy + vy * k)], mc, 3.0)
        trong = k * 1.4142
    else:
        s = cung(ox, oy, rr, lo, lo + ang, mc, 3.2)
        trong = rr
    if text:
        gm = math.radians(lo + ang / 2)
        dx, dy = math.cos(gm), math.sin(gm)
        w, h = _kich_pill(str(text), CO_CHU_MIN)
        kc = trong + 16.0 + 0.5 * w * abs(dx) + 0.5 * h * abs(dy)
        s += tam_nhan(ox + dx * kc, oy + dy * kc, text, mc)
    return s


def truc_so(x1, x2, y, cac_moc, mien_to=None, mau=None):
    """Trục số nằm ngang từ x1 tới x2 tại độ cao y. cac_moc = [giá_trị | (giá_trị, 'nhãn'), ...] (vạch + nhãn dưới trục, nhãn
    chồng nhau tự bỏ). mien_to = (a, b) -> dải tô khoảng nghiệm / tỉ lệ (a hoặc b = None: kéo tới đầu trục), kèm chấm đầu mút."""
    mc = mau or "ket"
    xa, xb = min(float(x1), float(x2)), max(float(x1), float(x2))
    xa, xb = max(xa, LE), min(xb, W - LE)
    yy = min(max(float(y), 40.0), H - 70.0)
    ds = []
    for it in cac_moc or ():
        if isinstance(it, (list, tuple)) and len(it) >= 2:
            ds.append((float(it[0]), str(it[1])))
        else:
            ds.append((float(it), "%g" % float(it)))
    if len(ds) < 2:
        ds = ds + [(ds[0][0] + 1.0, "%g" % (ds[0][0] + 1.0))] if ds else [(0.0, "0"), (1.0, "1")]
    ds = sorted(ds, key=lambda p: p[0])
    lo, hi = ds[0][0], ds[-1][0]
    if hi - lo < 1e-12:
        hi = lo + 1.0

    def px(v):
        return xa + 30.0 + (xb - xa - 60.0) * (v - lo) / (hi - lo)
    out = ""
    if mien_to:
        a, b = mien_to[0], mien_to[1]
        xl = px(float(a)) if a is not None else xa + 8.0
        xr = px(float(b)) if b is not None else xb - 16.0
        xl, xr = min(xl, xr), max(xl, xr)
        out += '<polygon points="%s" fill="%s" fill-opacity="0.55"/>' % (diem([(xl, yy - 8), (xr, yy - 8), (xr, yy + 8), (xl, yy + 8)]), m(mc))
    out += mui_ten(xa, yy, xb, yy, "chu_mo", 2.6)
    cuoi = -1e9
    for v, ten in ds:
        p = px(v)
        out += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="2.4"/>' % (_f(p), _f(yy - 9), _f(p), _f(yy + 9), m("chu"))
        nua = 0.56 * CO_CHU_MIN * len(ten) / 2
        if ten and p - nua >= cuoi + 6.0:
            out += chu(p, yy + 40, ten, co=CO_CHU_MIN, mau="chu", dam=600)
            cuoi = p + nua
    if mien_to:
        for e in (mien_to[0], mien_to[1]):
            if e is not None:
                out += cham(px(float(e)), yy, 7, mc)
    return out


def luoi_o(x, y, cot, hang, kich_thuoc=56, o_to=None, nhan_o=None):
    """Lưới cot x hang ô vuông, góc trên trái (x, y). o_to = {(i, j): 'token'} | [(i, j[, 'token'])] (i = cột, j = hàng, từ 0);
    nhan_o = {(i, j): 'chữ'} | [(i, j, 'chữ')] căn giữa ô (chữ dài hơn ô tự cắt). Ô tự co để lưới nằm trong viewBox."""
    cot, hang = max(1, min(int(cot), 20)), max(1, min(int(hang), 14))
    x = min(max(float(x), LE / 2), W - LE / 2 - 24.0 * cot)
    y = min(max(float(y), LE / 2), H - LE / 2 - 24.0 * hang)
    k = max(24.0, min(float(kich_thuoc), (W - LE / 2 - x) / cot, (H - LE / 2 - y) / hang))
    to, nh = {}, {}
    if isinstance(o_to, dict):
        for kk, vv in o_to.items():
            to[(int(kk[0]), int(kk[1]))] = vv if isinstance(vv, str) and vv else "ket"
    else:
        for it in o_to or ():
            to[(int(it[0]), int(it[1]))] = it[2] if len(it) > 2 and it[2] else "ket"
    if isinstance(nhan_o, dict):
        for kk, vv in nhan_o.items():
            nh[(int(kk[0]), int(kk[1]))] = str(vv)
    else:
        for it in nhan_o or ():
            nh[(int(it[0]), int(it[1]))] = str(it[2])
    out = ""
    for j in range(hang):
        for i in range(cot):
            out += '<rect x="%s" y="%s" width="%s" height="%s" fill="%s" stroke="%s" stroke-width="1.6"/>' % (
                _f(x + i * k), _f(y + j * k), _f(k), _f(k), m("mat"), m("chu_mo"))
    for (i, j), tk in to.items():
        if 0 <= i < cot and 0 <= j < hang:
            out += '<rect x="%s" y="%s" width="%s" height="%s" fill="%s" fill-opacity="0.85" stroke="%s" stroke-width="1.6"/>' % (
                _f(x + i * k + 2), _f(y + j * k + 2), _f(k - 4), _f(k - 4), m(tk), m("chu_mo"))
    toi_da = max(1, int((k - 6.0) / (0.56 * CO_CHU_MIN)))
    for (i, j), ten in nh.items():
        if 0 <= i < cot and 0 <= j < hang and ten:
            out += chu(x + i * k + k / 2, y + j * k + k / 2 + CO_CHU_MIN * 0.36, ten[:toi_da], co=CO_CHU_MIN, mau="nen" if (i, j) in to else "chu")
    return out


def so_do_venn(cac_tap, nhan_giao="", cx=400, cy=270, r=115):
    """Sơ đồ Venn 2 hoặc 3 tập: vòng tròn bán trong suốt, tên tập (viên thuốc) ngoài vòng, nhãn phần chỉ-thuộc-một-tập (tùy chọn)
    và `nhan_giao` ở giao chung. cac_tap = ['A', 'B'] hoặc [('A', '12'), ('B', '9')] (phần tử 2 = nhãn phần chỉ thuộc tập đó)."""
    tap = []
    for it in list(cac_tap)[:3]:
        if isinstance(it, (list, tuple)):
            tap.append((str(it[0]), str(it[1]) if len(it) > 1 and it[1] is not None else ""))
        else:
            tap.append((str(it), ""))
    while len(tap) < 2:
        tap.append(("B", ""))
    n = len(tap)
    mau = ("nhan", "ket", "dung")
    huong = [(-0.8, -0.6), (0.8, -0.6)] if n == 2 else [(0.0, -1.0), (0.866, 0.5), (-0.866, 0.5)]
    cx, cy = float(cx), float(cy)

    def hinh(rr):
        if n == 2:
            ct = [(cx - 0.55 * rr, cy), (cx + 0.55 * rr, cy)]
            vung = [(ct[0][0] - 0.45 * rr, cy), (ct[1][0] + 0.45 * rr, cy)]
        else:
            ct = [(cx + 0.58 * rr * hx, cy + 0.58 * rr * hy) for hx, hy in huong]
            vung = [(ct[k][0] + huong[k][0] * 0.82 * rr, ct[k][1] + huong[k][1] * 0.82 * rr) for k in range(3)]
        hop_ = []
        for k in range(n):
            w, h = _kich_pill(tap[k][0], CO_CHU_MIN)
            dx, dy = _don_vi(huong[k][0], huong[k][1])
            kc = rr + 16.0 + 0.5 * w * abs(dx) + 0.5 * h * abs(dy)
            px, py = ct[k][0] + dx * kc, ct[k][1] + dy * kc
            hop_.append((px, py, w, h))
        return ct, vung, hop_
    rr = float(r)
    ct, vung, hop_ = hinh(rr)
    for _ in range(40):
        diemx = [(c[0] - rr, c[1] - rr) for c in ct] + [(c[0] + rr, c[1] + rr) for c in ct] + \
                [(px - w / 2, py - h / 2) for px, py, w, h in hop_] + [(px + w / 2, py + h / 2) for px, py, w, h in hop_]
        if _trong_khung(diemx):
            break
        rr *= 0.94
        ct, vung, hop_ = hinh(rr)
    out = ""
    for k in range(n):
        out += '<circle cx="%s" cy="%s" r="%s" fill="%s" fill-opacity="0.26" stroke="%s" stroke-width="3.2"/>' % (
            _f(ct[k][0]), _f(ct[k][1]), _f(rr), m(mau[k]), m(mau[k]))
    for k in range(n):
        if tap[k][1]:
            out += chu(vung[k][0], vung[k][1] + 9, tap[k][1], co=26, mau="chu")
    if nhan_giao:
        out += chu(cx, cy + 9, str(nhan_giao), co=26, mau="chu")
    for k in range(n):
        out += tam_nhan(hop_[k][0], hop_[k][1], tap[k][0], mau[k])
    return out


def phan_nhanh_de_quy(cx, cy, r, bac=1, kieu="koch", mau=None):
    """Hình đệ quy chuẩn theo bậc bac = 0..3: 'koch' (bông tuyết 3 cạnh đối xứng), 'tam_giac_chia' (Sierpinski), 'cay_nhi_phan'.
    Gọi lại với bac tăng dần ở từng bước để hình biến đổi; cùng (cx, cy, r) -> các bậc khớp nhau."""
    bac = max(0, min(int(bac), 3))
    mc = mau or "nhan"
    cx, cy, r = float(cx), float(cy), float(r)
    if kieu == "koch":
        rr = max(20.0, min(r, cx - LE / 2 - 2, W - LE / 2 - 2 - cx, cy - LE / 2 - 2, H - LE / 2 - 2 - cy))
        goc = _dinh_deu(cx, cy, rr, 3, -90)

        def koch(p, q, sg, n):
            if n == 0:
                return [p]
            dx, dy = q[0] - p[0], q[1] - p[1]
            b1 = (p[0] + dx / 3, p[1] + dy / 3)
            b2 = (p[0] + 2 * dx / 3, p[1] + 2 * dy / 3)
            dinh = (p[0] + dx / 2 - sg * dy * 0.28868, p[1] + dy / 2 + sg * dx * 0.28868)
            return koch(p, b1, sg, n - 1) + koch(b1, dinh, sg, n - 1) + koch(dinh, b2, sg, n - 1) + koch(b2, q, sg, n - 1)
        pts = []
        for k in range(3):
            p, q = goc[k], goc[(k + 1) % 3]
            mid = ((p[0] + q[0]) / 2 - cx, (p[1] + q[1]) / 2 - cy)
            sg = 1.0 if (-(q[1] - p[1]) * mid[0] + (q[0] - p[0]) * mid[1]) > 0 else -1.0
            pts += koch(p, q, sg, bac)
        pts = [kep(px, py, LE / 2) for px, py in pts]
        return '<polygon points="%s" fill="%s" fill-opacity="0.30" stroke="%s" stroke-width="%.1f" stroke-linejoin="round"/>' % (
            diem(pts), m(mc), m(mc), max(1.6, 3.6 - 0.6 * bac))
    if kieu == "tam_giac_chia":
        rr = max(20.0, min(r, (cx - LE / 2 - 2) / 0.866, (W - LE / 2 - 2 - cx) / 0.866, cy - LE / 2 - 2, (H - LE / 2 - 2 - cy) * 2.0))
        a, b, c = _dinh_deu(cx, cy, rr, 3, -90)

        def chia(a_, b_, c_, n):
            if n == 0:
                return [(a_, b_, c_)]
            ab = ((a_[0] + b_[0]) / 2, (a_[1] + b_[1]) / 2)
            ac = ((a_[0] + c_[0]) / 2, (a_[1] + c_[1]) / 2)
            bc = ((b_[0] + c_[0]) / 2, (b_[1] + c_[1]) / 2)
            return chia(a_, ab, ac, n - 1) + chia(ab, b_, bc, n - 1) + chia(ac, bc, c_, n - 1)
        out = ""
        if bac:
            out += '<polygon points="%s" fill="none" stroke="%s" stroke-width="1.8" stroke-opacity="0.7"/>' % (diem([a, b, c]), m("cu"))
        for t in chia(a, b, c, bac):
            out += '<polygon points="%s" fill="%s" fill-opacity="0.82" stroke="%s" stroke-width="1.4" stroke-linejoin="round"/>' % (diem(t), m(mc), m("nen"))
        return out
    if kieu == "cay_nhi_phan":
        ds = []

        def nhanh(px, py, g, dai, sau):
            qx, qy = px + dai * math.cos(math.radians(g)), py + dai * math.sin(math.radians(g))
            ds.append((px, py, qx, qy, sau))
            if sau < bac:
                nhanh(qx, qy, g - 28.0, dai * 0.72, sau + 1)
                nhanh(qx, qy, g + 28.0, dai * 0.72, sau + 1)
        nhanh(cx, cy + 0.7 * r, -90.0, 0.62 * r, 0)
        xs = [p for d in ds for p in (d[0], d[2])]
        ys = [p for d in ds for p in (d[1], d[3])]
        kk = 1.0
        for lim, v, c0 in ((W - LE / 2 - 4, max(xs), cx), (LE / 2 + 4, min(xs), cx), (H - LE / 2 - 4, max(ys), cy), (LE / 2 + 4, min(ys), cy)):
            if abs(v - c0) > 1e-9 and (v - c0) * (lim - c0) > 0 and abs(v - c0) > abs(lim - c0):
                kk = min(kk, abs(lim - c0) / abs(v - c0))
        out = ""
        for px, py, qx, qy, sau in ds:
            ax, ay = kep(cx + kk * (px - cx), cy + kk * (py - cy), LE / 2)
            bx, by = kep(cx + kk * (qx - cx), cy + kk * (qy - cy), LE / 2)
            out += '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%.1f" stroke-linecap="round"/>' % (
                _f(ax), _f(ay), _f(bx), _f(by), m(mc), max(2.0, 4.6 - 0.9 * sau))
            if sau == bac:
                out += cham(bx, by, 6, "ket")
        return out
    raise ValueError("kieu phai la koch / tam_giac_chia / cay_nhi_phan")


def lop(buoc, svg, hieu_ung="moc", khi_noi=None, nhan_lop=None, nhom=None):
    d = {"buoc": int(buoc), "svg": "<g>" + svg + "</g>", "hieu_ung": hieu_ung}
    if khi_noi:
        d["khi_noi"] = khi_noi
    if nhan_lop:
        d["nhan"] = nhan_lop
    if nhom:
        d["nhom"] = nhom
    return d
