"""Thư viện vật thể tham số (thuần Python, không cần bpy).

Mỗi hàm dựng nhận (w, d, h, mau, ts) = kích thước thật theo mét (ngang x, sâu y, cao z),
màu chính và tham số trạng thái; trả danh sách bộ phận trong KHUNG RIÊNG của vật:
gốc ở tâm mặt đáy, z hướng lên. Bộ phận dùng các hình ve_blender.py đã dựng được
(hop, tru, cau, non, lon, bon_vom, thuyen, bang_chuyen, lang_tru, khoi_tiet_dien, luoi_tam_giac).
"""

import math


def bp(hinh, tam, co, vat_lieu, xoay=None, **them):
    p = {"hinh": hinh, "tam": [float(v) for v in tam], "co": [max(float(v), 1e-4) for v in co], "vat_lieu": vat_lieu}
    if xoay:
        p["xoay"] = [float(v) for v in xoay]
    p.update(them)
    return p


def hop(w, d, h, mau, ts):
    return [bp("hop", (0, 0, h / 2), (w, d, h), mau)]


def _ong(h_long, n=48):
    """Lưới ống rỗng có đáy (thành mỏng), chuẩn hóa: bán kính ngoài 1, cao 1. Trả (dinh, mat)."""
    r_in, z_day = 1 - h_long, 0.05
    rings = [(1, 0), (1, 1), (r_in, 1), (r_in, z_day)]
    dinh = [[r * math.cos(i * math.tau / n), r * math.sin(i * math.tau / n), z] for r, z in rings for i in range(n)]
    mat = []
    for k in range(3):
        a, b = k * n, (k + 1) * n
        for i in range(n):
            j = (i + 1) % n
            mat += [[a + i, a + j, b + j], [a + i, b + j, b + i]]
    for i in range(1, n - 1):
        mat.append([0, i + 1, i][::-1])          # đáy ngoài (nhìn từ dưới)
        mat.append([3 * n, 3 * n + i, 3 * n + i + 1])  # sàn trong
    return dinh, mat


def be_tru(w, d, h, mau, ts):
    # Thành bể rỗng (thấy được mặt nước bên trong) + vành miệng kim loại + nước theo muc_nuoc.
    day = 0.04
    dinh, mat = _ong(day)
    parts = [bp("luoi_tam_giac", (0, 0, h / 2), (w, d, h), mau, dinh=dinh, mat=mat)]
    muc = float(ts.get("muc_nuoc", 0.7))
    if muc > 0:
        cao = h * (1 - 0.05) * muc
        parts.append(bp("tru", (0, 0, h * 0.05 + cao / 2), (w * 0.95, d * 0.95, cao), "nuoc"))
    return parts


def be_hop(w, d, h, mau, ts):
    t = max(min(w, d) * 0.025, 0.006)
    vach = "kinh" if mau in ("kinh", None) else mau
    parts = [bp("hop", (0, 0, t / 2), (w, d, t), "toi")]
    for s in (-1, 1):
        parts.append(bp("hop", (s * (w - t) / 2, 0, h / 2), (t, d, h), vach))
        parts.append(bp("hop", (0, s * (d - t) / 2, h / 2), (w - 2 * t, t, h), vach))
    muc = float(ts.get("muc_nuoc", 0.7))
    if muc > 0:
        cao = (h - t) * muc
        parts.append(bp("hop", (0, 0, t + cao / 2), (w - 2.2 * t, d - 2.2 * t, cao), "nuoc"))
    return parts


def lon(w, d, h, mau, ts):
    return [bp("lon", (0, 0, h / 2), (w, d, h), mau)]


def bon_vom(w, d, h, mau, ts):
    return [bp("bon_vom", (0, 0, h / 2), (w, d, h), mau)]


def chai(w, d, h, mau, ts):
    return [bp("tru", (0, 0, h * 0.31), (w, d, h * 0.62), mau),
            bp("khoi_tiet_dien", (0, 0, h * 0.72), (w, d, h * 0.2), mau,
               tang=[[0, 0, 0, w / 2, d / 2], [h * 0.1, 0, 0, w * 0.36, d * 0.36], [h * 0.2, 0, 0, w * 0.17, d * 0.17]]),
            bp("tru", (0, 0, h * 0.88), (w * 0.34, d * 0.34, h * 0.12), mau),
            bp("tru", (0, 0, h * 0.97), (w * 0.4, d * 0.4, h * 0.06), "do")]


def coc(w, d, h, mau, ts):
    return [bp("khoi_tiet_dien", (0, 0, h / 2), (w, d, h), mau,
               tang=[[0, 0, 0, w * 0.38, d * 0.38], [h, 0, 0, w / 2, d / 2]])]


def ban(w, d, h, mau, ts):
    t = h * 0.06
    parts = [bp("hop", (0, 0, h - t / 2), (w, d, t), mau)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(bp("hop", (sx * (w / 2 - w * 0.06), sy * (d / 2 - d * 0.08), (h - t) / 2),
                            (min(w, d) * 0.06, min(w, d) * 0.06, h - t), mau))
    return parts


def ghe(w, d, h, mau, ts):
    seat = h * 0.5
    parts = [bp("hop", (0, 0, seat), (w, d, h * 0.05), mau),
             bp("hop", (0, d * 0.45, seat + h * 0.25), (w, d * 0.08, h * 0.45), mau)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(bp("hop", (sx * w * 0.42, sy * d * 0.42, seat / 2), (w * 0.08, d * 0.08, seat), mau))
    return parts


def ke(w, d, h, mau, ts):
    t = min(w, d) * 0.05
    parts = [bp("hop", (s * (w - t) / 2, 0, h / 2), (t, d, h), mau) for s in (-1, 1)]
    parts.append(bp("hop", (0, d / 2 - t / 2, h / 2), (w, t, h), mau))
    tang = max(2, int(ts.get("so_tang", 4)))
    for i in range(tang):
        z = t / 2 + (h - t) * i / (tang - 1)
        parts.append(bp("hop", (0, 0, z), (w - 2 * t, d, t), mau))
    return parts


def _banh(x, y, r, rong, h_tam):
    return [bp("tru", (x, y, h_tam), (2 * r, 2 * r, rong), "toi", (90, 0, 0)),
            bp("tru", (x, y * 1.02, h_tam), (r, r, rong * 1.08), "thep", (90, 0, 0))]


def o_to(w, d, h, mau, ts):
    r = h * 0.22
    parts = [bp("hop", (0, 0, r + h * 0.2), (w, d, h * 0.4), mau),
             bp("hop", (-w * 0.05, 0, h * 0.78), (w * 0.52, d * 0.9, h * 0.36), "kinh"),
             bp("hop", (-w * 0.05, 0, h * 0.97), (w * 0.5, d * 0.92, h * 0.05), mau),
             bp("hop", (w * 0.495, 0, r + h * 0.22), (0.02, d * 0.7, h * 0.08), "trang")]
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts += _banh(sx * w * 0.31, sy * d * 0.45, r, d * 0.12, r)
    return parts


def xe_tai(w, d, h, mau, ts):
    r = h * 0.15
    cab = w * 0.25
    parts = [bp("hop", (w / 2 - cab / 2, 0, r + h * 0.33), (cab, d, h * 0.62), mau),
             bp("hop", (w / 2 - cab * 0.45, 0, r + h * 0.5), (cab * 0.92, d * 1.01, h * 0.22), "kinh"),
             bp("hop", (-cab / 2, 0, r + h * 0.42), (w - cab * 1.05, d, h * 0.72), "trang"),
             bp("hop", (0, 0, r * 1.1), (w, d * 0.8, r * 0.5), "toi")]
    for x in (w * 0.36, -w * 0.12, -w * 0.33):
        for sy in (-1, 1):
            parts += _banh(x, sy * d * 0.44, r, d * 0.14, r)
    return parts


def xe_dap(w, d, h, mau, ts):
    r = h * 0.33
    parts = []
    for x in (-w * 0.32, w * 0.32):
        parts.append(bp("tru", (x, 0, r), (2 * r, 2 * r, d * 0.06), "toi", (90, 0, 0)))
    parts += [bp("hop", (0, 0, r * 1.25), (w * 0.62, d * 0.07, h * 0.05), mau, (0, -18, 0)),
              bp("hop", (-w * 0.12, 0, h * 0.68), (w * 0.05, d * 0.07, h * 0.6), mau, (0, 12, 0)),
              bp("hop", (-w * 0.14, 0, h * 0.97), (w * 0.17, d * 0.16, h * 0.05), "den"),
              bp("hop", (w * 0.26, 0, h * 0.95), (w * 0.04, d * 0.9, h * 0.04), "thep")]
    return parts


def xe_may(w, d, h, mau, ts):
    r = h * 0.24
    parts = []
    for x in (-w * 0.33, w * 0.33):
        parts.append(bp("tru", (x, 0, r), (2 * r, 2 * r, d * 0.16), "toi", (90, 0, 0)))
    parts += [bp("hop", (0, 0, r * 1.6), (w * 0.62, d * 0.45, h * 0.3), mau),
              bp("hop", (-w * 0.12, 0, h * 0.72), (w * 0.4, d * 0.5, h * 0.1), "den"),
              bp("hop", (w * 0.36, 0, h * 0.78), (w * 0.06, d * 0.12, h * 0.45), mau, (0, -15, 0)),
              bp("hop", (w * 0.4, 0, h * 0.97), (w * 0.04, d, h * 0.04), "thep")]
    return parts


def thuyen(w, d, h, mau, ts):
    return [bp("thuyen", (0, 0, h / 2), (w, d, h), mau)]


def bang_chuyen(w, d, h, mau, ts):
    return [bp("bang_chuyen", (0, 0, h / 2), (w, d, h), mau)]


def nguoi(w, d, h, mau, ts):
    # Tỉ lệ cơ thể theo chiều cao h; áo theo màu chính.
    s = h
    parts = []
    for side in (-1, 1):
        parts.append(bp("tru", (side * 0.07 * s, 0, 0.22 * s), (0.1 * s, 0.11 * s, 0.44 * s), "toi"))
        parts.append(bp("cau", (side * 0.17 * s, 0, 0.6 * s), (0.08 * s, 0.09 * s, 0.32 * s), mau))
    parts.append(bp("cau", (0, 0, 0.62 * s), (0.3 * s, 0.19 * s, 0.42 * s), mau))
    parts.append(bp("cau", (0, 0, 0.9 * s), (0.17 * s, 0.17 * s, 0.19 * s), "da_nguoi"))
    parts.append(bp("cau", (0, 0.01 * s, 0.95 * s), (0.18 * s, 0.18 * s, 0.11 * s), "toi"))
    return parts


def cay(w, d, h, mau, ts):
    return [bp("tru", (0, 0, h * 0.26), (w * 0.09, d * 0.09, h * 0.52), "go"),
            bp("cau", (0, 0, h * 0.66), (w, d, h * 0.62), mau if mau not in (None, "la") else "la"),
            bp("cau", (w * 0.18, -d * 0.1, h * 0.8), (w * 0.6, d * 0.6, h * 0.36), "la")]


def cay_nho(w, d, h, mau, ts):
    return [bp("khoi_tiet_dien", (0, 0, h * 0.2), (w * 0.7, d * 0.7, h * 0.4), "gach",
               tang=[[0, 0, 0, w * 0.26, d * 0.26], [h * 0.4, 0, 0, w * 0.35, d * 0.35]]),
            bp("cau", (0, 0, h * 0.62), (w, d, h * 0.55), "la")]


def nha(w, d, h, mau, ts):
    than = h * 0.68
    parts = [bp("hop", (0, 0, than / 2), (w, d, than), mau),
             bp("lang_tru", (0, 0, than + (h - than) / 2), (d * 1.1, h - than, w * 1.08), "gach",
                (90, 0, 90), day=[[-0.5, 0], [0.5, 0], [0, 1]]),
             bp("hop", (0, -d / 2 - 0.01, than * 0.3), (w * 0.14, 0.04, than * 0.6), "go")]
    for sx in (-0.3, 0.3):
        parts.append(bp("hop", (sx * w, -d / 2 - 0.01, than * 0.6), (w * 0.14, 0.04, than * 0.24), "cua_so"))
    return parts


def cot(w, d, h, mau, ts):
    parts = [bp("tru", (0, 0, h / 2), (w, d, h), mau), bp("tru", (0, 0, w * 0.4), (w * 1.5, d * 1.5, w * 0.8), "da")]
    if ts.get("co"):
        parts.append(bp("hop", (h * 0.13, 0, h * 0.9), (h * 0.24, 0.01, h * 0.15), "do"))
    return parts


def hang_rao(w, d, h, mau, ts):
    n = max(2, int(w / 1.2) + 1)
    parts = [bp("hop", ((i / (n - 1) - 0.5) * w, 0, h / 2), (min(0.08, w / 20), max(d, 0.06), h), mau) for i in range(n)]
    for z in (0.35, 0.8):
        parts.append(bp("hop", (0, 0, h * z), (w, max(d, 0.06) * 0.6, h * 0.07), mau))
    return parts


def cua(w, d, h, mau, ts):
    return [bp("hop", (0, 0, h / 2), (w, d, h), mau), bp("cau", (w * 0.36, -d * 0.7, h * 0.48), (0.06, 0.06, 0.06), "vang")]


def thang(w, d, h, mau, ts):
    parts = [bp("hop", (s * w * 0.45, 0, h / 2), (w * 0.1, d, h), mau) for s in (-1, 1)]
    n = max(3, int(h / 0.3))
    for i in range(1, n):
        parts.append(bp("tru", (0, 0, h * i / n), (d * 0.6, d * 0.6, w * 0.9), mau, (0, 90, 0)))
    return parts


def bong(w, d, h, mau, ts):
    return [bp("cau", (0, 0, h / 2), (w, d, h), mau)]


def qua(w, d, h, mau, ts):
    return [bp("cau", (0, 0, h / 2), (w, d, h * 0.92), mau),
            bp("tru", (0, 0, h * 0.98), (w * 0.06, d * 0.06, h * 0.16), "go"),
            bp("cau", (w * 0.12, 0, h * 1.02), (w * 0.28, d * 0.12, h * 0.08), "la")]


def hop_bi(w, d, h, mau, ts):
    t = max(min(w, d) * 0.03, 0.003)
    vach = "kinh" if mau in ("kinh", None) else mau
    parts = [bp("hop", (0, 0, t / 2), (w, d, t), "toi")]
    for s in (-1, 1):
        parts.append(bp("hop", (s * (w - t) / 2, 0, h / 2), (t, d, h), vach))
        parts.append(bp("hop", (0, s * (d - t) / 2, h / 2), (w - 2 * t, t, h), vach))
    return parts


def bi(w, d, h, mau, ts):
    return [bp("cau", (0, 0, h / 2), (w, d, h), mau)]


def xuc_xac(w, d, h, mau, ts):
    parts = [bp("hop", (0, 0, h / 2), (w, d, h), mau)]
    mat = int(ts.get("mat", 5))
    pips = {1: [(0, 0)], 2: [(-1, -1), (1, 1)], 3: [(-1, -1), (0, 0), (1, 1)], 4: [(-1, -1), (-1, 1), (1, -1), (1, 1)],
            5: [(-1, -1), (-1, 1), (0, 0), (1, -1), (1, 1)], 6: [(-1, -1), (-1, 0), (-1, 1), (1, -1), (1, 0), (1, 1)]}
    for u, v in pips.get(mat, pips[5]):
        parts.append(bp("cau", (u * w * 0.26, v * d * 0.26, h), (w * 0.16, d * 0.16, h * 0.05), "den"))
    return parts


def dong_xu(w, d, h, mau, ts):
    return [bp("tru", (0, 0, h / 2), (w, d, h), mau)]


def the(w, d, h, mau, ts):
    return [bp("hop", (0, 0, h / 2), (w, d, h), mau),
            bp("hop", (0, -d * 0.6, h * 0.5), (w * 0.7, d * 0.2, h * 0.7), "trang" if mau != "trang" else "do")]


def ca(w, d, h, mau, ts):
    return [bp("cau", (0, 0, h / 2), (w * 0.75, d, h), mau),
            bp("non", (-w * 0.42, 0, h / 2), (w * 0.3, d * 0.4, h * 0.9), mau, (0, 90, 0)),
            bp("cau", (w * 0.26, -d * 0.35, h * 0.62), (w * 0.06, d * 0.2, h * 0.14), "den")]


def dong_vat(w, d, h, mau, ts):
    leg = h * 0.45
    parts = [bp("cau", (0, 0, leg + (h - leg) * 0.45), (w * 0.8, d, (h - leg) * 0.9), mau),
             bp("cau", (w * 0.42, 0, h * 0.85), (w * 0.3, d * 0.7, h * 0.3), mau)]
    for sx in (-0.25, 0.25):
        for sy in (-0.3, 0.3):
            parts.append(bp("tru", (sx * w, sy * d, leg / 2), (w * 0.08, w * 0.08, leg), "toi" if mau == "trang" else mau))
    return parts


DUNG = {name: fn for name, fn in globals().items()
        if callable(fn) and not name.startswith("_") and name != "bp"}


def dung_vat(mau_tv, co, mau, ts=None):
    """Trả bộ phận của mẫu thư viện ở kích thước thật co=[w,d,h]."""
    fn = DUNG.get(mau_tv)
    if fn is None:
        raise KeyError(mau_tv)
    w, d, h = co
    return fn(w, d, h, mau, ts or {})


def dung_tu_bo_phan(bo_phan, co, mau):
    """Vật AI sinh: bộ phận trong khung chuẩn [-.5,.5]x[-.5,.5]x[0,1] -> co thật."""
    w, d, h = co
    out = []
    for p in bo_phan:
        q = dict(p)
        q["tam"] = [p["tam"][0] * w, p["tam"][1] * d, p["tam"][2] * h]
        q["co"] = [p["co"][0] * w, p["co"][1] * d, p["co"][2] * h]
        if p.get("hinh") == "khoi_tiet_dien":
            q["tang"] = [[r[0] * h, r[1] * w, r[2] * d, r[3] * w, r[4] * d] for r in p["tang"]]
        if not q.get("vat_lieu") or q["vat_lieu"] == "chinh":
            q["vat_lieu"] = mau
        out.append(q)
    return out


def ma_tran_xoay(xoay):
    """Euler XYZ (độ) -> ma trận 3x3 giống mathutils.Euler.to_matrix()."""
    ax, ay, az = (math.radians(v) for v in (xoay or (0, 0, 0)))
    cx, sx, cy, sy, cz, sz = math.cos(ax), math.sin(ax), math.cos(ay), math.sin(ay), math.cos(az), math.sin(az)
    return [[cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz],
            [cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz],
            [-sy, sx * cy, cx * cy]]


def dat_vao(parts, goc, xoay_z=0.0):
    """Đưa bộ phận từ khung riêng vào thế giới: xoay quanh trục đứng rồi tịnh tiến tới goc."""
    c, s = math.cos(math.radians(xoay_z)), math.sin(math.radians(xoay_z))
    out = []
    for p in parts:
        q = dict(p)
        x, y, z = p["tam"]
        q["tam"] = [goc[0] + c * x - s * y, goc[1] + s * x + c * y, goc[2] + z]
        if xoay_z:
            r = list(p.get("xoay") or (0, 0, 0))
            r[2] += xoay_z
            q["xoay"] = r
        out.append(q)
    return out


def hop_bao(parts):
    """Hộp bao (lo, hi) theo thế giới của danh sách bộ phận (tính cả xoay)."""
    lo, hi = [math.inf] * 3, [-math.inf] * 3
    for p in parts:
        m = ma_tran_xoay(p.get("xoay"))
        half = [sum(abs(m[i][j]) * p["co"][j] / 2 for j in range(3)) for i in range(3)]
        for i in range(3):
            lo[i] = min(lo[i], p["tam"][i] - half[i])
            hi[i] = max(hi[i], p["tam"][i] + half[i])
    return lo, hi
