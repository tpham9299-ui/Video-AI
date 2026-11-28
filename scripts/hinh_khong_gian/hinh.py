"""v97 - Dựng hình không gian từ mô tả cấu trúc (không tọa độ AI). Đơn vị: a = 1 (cạnh đáy đặc trưng). Trục z hướng lên,
đáy nằm trên mặt z = 0 (khớp quy ước máy quay src/khonggian: góc ngang 0 nhìn từ phía -y)."""
import math
import re

EPS = 1e-9
# tên điểm: A, B', A1, M_2, S... (chữ hoa + chỉ số tùy chọn + phẩy)
TEN_DIEM = r"[A-Z](?:_?\d)?'*"


class LoiDung(Exception):
    def __init__(self, ma, chi_tiet, goi_y=""):
        super().__init__(chi_tiet)
        self.ma, self.chi_tiet, self.goi_y = ma, chi_tiet, goi_y


# ---------------- vector ----------------
def cong(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])
def tru(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def nhan(a, k): return (a[0] * k, a[1] * k, a[2] * k)
def cham(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def cheo(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def dai(a): return math.sqrt(cham(a, a))
def kc(a, b): return dai(tru(a, b))
def noi(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)


def chuan(a):
    l = dai(a)
    if l < EPS:
        raise LoiDung("KG_DUNG_LOI", "vector suy biến (độ dài 0)")
    return nhan(a, 1.0 / l)


def tb(ds):
    n = float(len(ds))
    return (sum(p[0] for p in ds) / n, sum(p[1] for p in ds) / n, sum(p[2] for p in ds) / n)


def tach_ten(s):
    """'SA' -> ['S','A'], "A'B'" -> ["A'","B'"], 'M_1N' -> ['M_1','N']; danh sách giữ nguyên."""
    if isinstance(s, (list, tuple)):
        return [chuan_ten(x) for x in s]
    s = re.sub(r"[()\s\[\]{}]", "", str(s or ""))
    ds = re.findall(TEN_DIEM, s)
    if "".join(ds) != s:
        raise LoiDung("KG_DIEM_KHONG_TON_TAI", "không đọc được tên '%s' (dùng chữ in hoa: SA, A'B', MNP)" % s)
    return ds


def chuan_ten(x):
    return re.sub(r"[\s$]", "", str(x)).replace("’", "'").replace("′", "'")


# ---------------- mặt phẳng / đường ----------------
def phap_tuyen(ps):
    """Pháp tuyến Newell (bền với đa giác gần suy biến)."""
    n = [0.0, 0.0, 0.0]
    for i in range(len(ps)):
        a, b = ps[i], ps[(i + 1) % len(ps)]
        n[0] += (a[1] - b[1]) * (a[2] + b[2])
        n[1] += (a[2] - b[2]) * (a[0] + b[0])
        n[2] += (a[0] - b[0]) * (a[1] + b[1])
    return chuan(tuple(n))


def mat_qua(p, q, r):
    n = cheo(tru(q, p), tru(r, p))
    if dai(n) < 1e-7:
        raise LoiDung("KG_DUNG_LOI", "ba điểm thẳng hàng, không xác định mặt phẳng")
    return chuan(n), p


def giao_duong_mat(p, q, n, o):
    """Tham số t của giao điểm đường PQ với mặt (n, o): X = P + t(Q - P)."""
    d = tru(q, p)
    den = cham(n, d)
    if abs(den) < 1e-9 * max(1.0, dai(d)):
        raise LoiDung("KG_DUNG_LOI", "đường thẳng song song (hoặc nằm trong) mặt phẳng: không có giao điểm duy nhất")
    return cham(n, tru(o, p)) / den


def giao_hai_duong(p1, q1, p2, q2):
    """(t, s) với P1 + t d1 = P2 + s d2; lỗi nếu hai đường chéo nhau / song song."""
    d1, d2, w = tru(q1, p1), tru(q2, p2), tru(p1, p2)
    a, b, c, d, e = cham(d1, d1), cham(d1, d2), cham(d2, d2), cham(d1, w), cham(d2, w)
    den = a * c - b * b
    if abs(den) < 1e-10 * a * c:
        raise LoiDung("KG_DUNG_LOI", "hai đường thẳng song song, không cắt nhau")
    t = (b * e - c * d) / den
    s = (a * e - b * d) / den
    if kc(noi(p1, q1, t), noi(p2, q2, s)) > 1e-6 * (1 + dai(d1) + dai(d2)):
        raise LoiDung("KG_DUNG_LOI", "hai đường thẳng chéo nhau (không đồng phẳng), không có giao điểm",
                      "chỉ lấy giao của hai đường CÙNG nằm trong một mặt phẳng (vd hai đường trong mặt đáy, hoặc trong (SCD))")
    return t, s


def chan_tren_duong(x, p, q):
    d = tru(q, p)
    return cham(tru(x, p), d) / cham(d, d)


# ---------------- khối ----------------
def _ty(kt, khoa, md):
    v = kt.get(khoa) if isinstance(kt, dict) else None
    return float(v) if isinstance(v, (int, float)) and v > 0 else md


def day_tu_giac(kieu, kt, ten):
    """4 đỉnh đáy (z=0) theo kiểu, cạnh AB = a = 1 (hoặc kích thước đề cho)."""
    a = _ty(kt, ten[0] + ten[1], 1.0)
    if kieu == "vuong":
        b = a
        ds = [(-a / 2, -b / 2), (a / 2, -b / 2), (a / 2, b / 2), (-a / 2, b / 2)]
    elif kieu == "chu_nhat":
        b = _ty(kt, ten[0] + ten[3], 1.35 * a)
        ds = [(-a / 2, -b / 2), (a / 2, -b / 2), (a / 2, b / 2), (-a / 2, b / 2)]
    elif kieu == "binh_hanh":
        b = _ty(kt, ten[0] + ten[3], 1.0 * a)
        lech = 0.42 * a
        ds = [(-a / 2 - lech / 2, -b / 2), (a / 2 - lech / 2, -b / 2), (a / 2 + lech / 2, b / 2), (-a / 2 + lech / 2, b / 2)]
    elif kieu == "thoi":
        ds = [(-0.62 * a, 0), (0, -0.42 * a), (0.62 * a, 0), (0, 0.42 * a)]
        s = a / math.hypot(0.62, 0.42)
        ds = [(x * s / a, y * s / a) for x, y in ds]
    elif kieu in ("thang", "thang_can"):
        # đáy lớn AB = a, đáy nhỏ CD = a/2 (hoặc theo đề), cao 0,8a
        c = _ty(kt, ten[2] + ten[3], 0.5 * a)
        h = 0.8 * a
        ds = [(-a / 2, -h / 2), (a / 2, -h / 2), (c / 2, h / 2), (-c / 2, h / 2)]
    elif kieu == "thang_vuong":   # vuông tại A và D, đáy lớn AB
        c = _ty(kt, ten[2] + ten[3], 0.5 * a)
        h = _ty(kt, ten[0] + ten[3], 0.8 * a)
        ds = [(-a / 2, -h / 2), (a / 2, -h / 2), (-a / 2 + c, h / 2), (-a / 2, h / 2)]
    else:
        raise LoiDung("KG_KHOI_LOI", "kiểu đáy tứ giác '%s' chưa hỗ trợ" % kieu,
                      "dùng vuong | chu_nhat | binh_hanh | thoi | thang | thang_vuong")
    return [(x, y, 0.0) for x, y in ds]


def day_tam_giac(kieu, kt, ten, vuong_tai=None):
    a = _ty(kt, ten[0] + ten[1], 1.0)
    if kieu == "deu":
        R = a / math.sqrt(3)
        ds = [(R * math.cos(math.radians(g)), R * math.sin(math.radians(g))) for g in (210, 330, 90)]
    elif kieu in ("vuong", "vuong_can"):
        # vuông tại vuong_tai (mặc định B); hai cạnh góc vuông a và b
        b = a if kieu == "vuong_can" else 1.3 * a
        goc = ten.index(vuong_tai) if vuong_tai in ten else 1
        V = (-0.45 * a, -0.4 * b)
        P = (V[0] + a, V[1])
        Q = (V[0], V[1] + b)
        sap = {0: [V, P, Q], 1: [Q, V, P], 2: [P, Q, V]}[goc]
        ds = sap
    elif kieu == "can":   # cân tại đỉnh thứ 3 (C)
        ds = [(-a / 2, -0.45 * a), (a / 2, -0.45 * a), (0, 0.65 * a)]
    else:   # tùy ý: nhọn, không cân
        ds = [(-0.55 * a, -0.42 * a), (0.6 * a, -0.5 * a), (0.12 * a, 0.62 * a)]
    return [(x, y, 0.0) for x, y in ds]


H_A_MAC_DINH = 1.28   # tỷ lệ vàng chiều cao / cạnh đáy trong [1,10; 1,45]


def dung_khoi(k):
    """k = kb.hinh_khong_gian.khoi -> {diem, dinh, mat, canh, day, loai}."""
    if not isinstance(k, dict):
        raise LoiDung("KG_THIEU_DAC_TA", "thiếu 'khoi'")
    loai = str(k.get("loai") or "").strip()
    kt = k.get("kich_thuoc") if isinstance(k.get("kich_thuoc"), dict) else {}
    kt = {chuan_ten(x).replace("'", "'"): v for x, v in kt.items()}
    D = {}
    if loai in ("chop_tu_giac", "chop_tam_giac", "tu_dien"):
        tg = loai != "chop_tu_giac"
        ten_day = tach_ten(k.get("day") or ("ABC" if tg else "ABCD"))
        if len(ten_day) != (3 if tg else 4):
            raise LoiDung("KG_KHOI_LOI", "đáy '%s' không đúng số đỉnh của %s" % ("".join(ten_day), loai))
        S = chuan_ten(k.get("dinh") or ("D" if loai == "tu_dien" else "S"))
        kieu = str(k.get("day_kieu") or ("deu" if loai == "tu_dien" else "tuy_y" if tg else "vuong"))
        day = day_tam_giac(kieu, kt, ten_day, chuan_ten(k.get("vuong_tai") or "")) if tg else day_tu_giac(kieu, kt, ten_day)
        for t, p in zip(ten_day, day):
            D[t] = p
        a = kc(day[0], day[1])
        chan = str(k.get("chan_duong_cao") or ("tam" if kieu in ("deu", "vuong") and k.get("deu") else "tuy_y")).strip()
        if chan in D:
            F = D[chan]
        elif chan.startswith("trung_diem"):
            ab = tach_ten(chan.split(":", 1)[1] if ":" in chan else "AB")
            if len(ab) != 2 or not all(x in D for x in ab):
                raise LoiDung("KG_KHOI_LOI", "chan_duong_cao '%s' cần trung điểm của 2 đỉnh đáy đã có" % chan)
            F = noi(D[ab[0]], D[ab[1]], 0.5)
        elif chan == "tam":
            if tg:
                F = tb(day)
            else:
                t, _ = giao_hai_duong(day[0], day[2], day[1], day[3])
                F = noi(day[0], day[2], t)
        else:   # tùy ý: lệch chuẩn hóa khỏi tâm để hai cạnh bên không vô tình chiếu trùng nhau
            F = cong(tb(day), (0.13 * a, 0.09 * a, 0.0))
        h = None
        for khoa in (S + chan if chan in D else None, "h", S + "O", S + "H", "chieu_cao"):
            if khoa and khoa in kt and isinstance(kt[khoa], (int, float)) and kt[khoa] > 0:
                h = float(kt[khoa])
                break
        if h is None and isinstance(kt.get("goc_canh_ben_day"), (int, float)) and chan in ("tam",):
            h = kc(F, day[0]) * math.tan(math.radians(float(kt["goc_canh_ben_day"])))
        if h is None:
            h = H_A_MAC_DINH * a
        D[S] = (F[0], F[1], h)
        mat = [list(reversed(ten_day))] + [[ten_day[i], ten_day[(i + 1) % len(ten_day)], S] for i in range(len(ten_day))]
        canh = [[ten_day[i], ten_day[(i + 1) % len(ten_day)]] for i in range(len(ten_day))] + [[x, S] for x in ten_day]
        return {"loai": loai, "diem": D, "dinh": ten_day + [S], "mat": mat, "canh": canh, "day": ten_day, "a": a,
                "chan": F, "chieu_cao": h, "dinh_chop": S}
    if loai in ("lang_tru_tam_giac", "lang_tru_tu_giac", "hinh_hop", "hop_chu_nhat", "lap_phuong"):
        tg = loai == "lang_tru_tam_giac"
        ten = tach_ten(k.get("day") or ("ABC" if tg else "ABCD"))
        ten2 = tach_ten(k.get("day_tren")) if k.get("day_tren") else [x + "'" for x in ten]
        if loai == "lap_phuong":
            kieu = "vuong"
        elif loai == "hop_chu_nhat":
            kieu = "chu_nhat"
        else:
            kieu = str(k.get("day_kieu") or ("deu" if tg else "binh_hanh" if loai == "hinh_hop" else "vuong"))
        day = day_tam_giac(kieu, kt, ten, chuan_ten(k.get("vuong_tai") or "")) if tg else day_tu_giac(kieu, kt, ten)
        a = kc(day[0], day[1])
        h = None
        for khoa in (ten[0] + ten2[0], "h", "chieu_cao"):
            if khoa in kt and isinstance(kt[khoa], (int, float)) and kt[khoa] > 0:
                h = float(kt[khoa])
                break
        if h is None:
            h = a if loai == "lap_phuong" else H_A_MAC_DINH * a if tg else 1.1 * a
        lech = (0.0, 0.0)
        if k.get("xien"):
            lech = (0.3 * a, 0.22 * a)
        for t, p in zip(ten, day):
            D[t] = p
        for t, p in zip(ten2, day):
            D[t] = (p[0] + lech[0], p[1] + lech[1], h)
        n = len(ten)
        mat = [list(reversed(ten)), list(ten2)] + [[ten[i], ten[(i + 1) % n], ten2[(i + 1) % n], ten2[i]] for i in range(n)]
        canh = [[ten[i], ten[(i + 1) % n]] for i in range(n)] + [[ten2[i], ten2[(i + 1) % n]] for i in range(n)] + \
            [[ten[i], ten2[i]] for i in range(n)]
        return {"loai": loai, "diem": D, "dinh": ten + ten2, "mat": mat, "canh": canh, "day": ten, "a": a, "chieu_cao": h}
    raise LoiDung("KG_KHOI_LOI", "loại khối '%s' chưa hỗ trợ" % loai,
                  "dùng chop_tu_giac | chop_tam_giac | tu_dien | lang_tru_tam_giac | lang_tru_tu_giac | hinh_hop | hop_chu_nhat | lap_phuong")


# ---------------- phép dựng điểm ----------------
TY_LE_VANG = [0.36, 0.64, 0.33, 0.67, 0.40, 0.60, 0.31, 0.69]   # "bất kỳ trên cạnh": tránh 0, 0,5, 1


def doc_ty_le(v):
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v or "").strip()
    m = re.fullmatch(r"(-?\d+(?:[.,]\d+)?)\s*/\s*(\d+(?:[.,]\d+)?)", s)
    if m:
        return float(m.group(1).replace(",", ".")) / float(m.group(2).replace(",", "."))
    m = re.fullmatch(r"-?\d+(?:[.,]\d+)?", s)
    if m:
        return float(s.replace(",", "."))
    return None


def _lay(D, ten, nguon):
    if ten not in D:
        raise LoiDung("KG_DIEM_KHONG_TON_TAI", "%s: điểm %s chưa được dựng" % (nguon, ten),
                      "khai báo điểm trong 'diem' theo đúng thứ tự (điểm phải dựng trước khi dùng)")
    return D[ten]


def _duong(D, s, nguon):
    ds = tach_ten(s)
    if len(ds) != 2:
        raise LoiDung("KG_DUNG_LOI", "%s: đường '%s' phải gồm đúng 2 điểm" % (nguon, s))
    return _lay(D, ds[0], nguon), _lay(D, ds[1], nguon), ds


def _mat(D, s, nguon):
    ds = tach_ten(s)
    if len(ds) < 3:
        raise LoiDung("KG_DUNG_LOI", "%s: mặt phẳng '%s' cần ít nhất 3 điểm" % (nguon, s))
    ps = [_lay(D, x, nguon) for x in ds]
    n, o = mat_qua(ps[0], ps[1], ps[2])
    for p in ps[3:]:
        if abs(cham(n, tru(p, o))) > 1e-6:
            raise LoiDung("KG_DUNG_LOI", "%s: các điểm %s không đồng phẳng" % (nguon, "".join(ds)))
    return n, o, ds


def dung_diem(D, d, t_bat_ky):
    """Dựng một điểm. t_bat_ky: tham số đang thử cho điểm 'bất kỳ'. Trả (tên, tọa độ, thông tin tham số)."""
    ten = chuan_ten(d.get("ten") or "")
    if not re.fullmatch(TEN_DIEM, ten):
        raise LoiDung("KG_DUNG_LOI", "tên điểm không hợp lệ '%s'" % ten)
    loai = str(d.get("loai") or "")
    ng = "điểm " + ten
    info = {}
    if loai == "trung_diem":
        p, q, ds = _duong(D, d.get("doan") or d.get("canh"), ng)
        X = noi(p, q, 0.5)
        info = {"tren": ds, "t": 0.5}
    elif loai in ("tren_canh", "tren_duong"):
        p, q, ds = _duong(D, d.get("canh") or d.get("duong"), ng)
        t = doc_ty_le(d.get("ty_le"))
        if t is None:
            t = t_bat_ky
            info["bat_ky"] = True
        X = noi(p, q, t)
        info.update({"tren": ds, "t": t})
    elif loai == "giao":
        l = d.get("duong") or []
        if len(l) != 2:
            raise LoiDung("KG_DUNG_LOI", "%s: 'giao' cần 2 đường" % ng)
        p1, q1, d1 = _duong(D, l[0], ng)
        p2, q2, d2 = _duong(D, l[1], ng)
        t, s = giao_hai_duong(p1, q1, p2, q2)
        X = noi(p1, q1, t)
        info = {"tren": d1, "t": t, "tren2": d2, "s": s}
    elif loai == "giao_duong_mat":
        p, q, ds = _duong(D, d.get("duong"), ng)
        n, o, dm = _mat(D, d.get("mat"), ng)
        t = giao_duong_mat(p, q, n, o)
        X = noi(p, q, t)
        info = {"tren": ds, "t": t, "mat": dm}
    elif loai in ("chan_vuong_goc", "hinh_chieu"):
        A = _lay(D, chuan_ten(d.get("tu") or ""), ng)
        if d.get("mat"):
            n, o, dm = _mat(D, d.get("mat"), ng)
            X = tru(A, nhan(n, cham(n, tru(A, o))))
            info = {"mat": dm}
        else:
            p, q, ds = _duong(D, d.get("xuong") or d.get("duong"), ng)
            t = chan_tren_duong(A, p, q)
            X = noi(p, q, t)
            info = {"tren": ds, "t": t}
    elif loai == "trong_tam":
        ds = tach_ten(d.get("tam_giac"))
        if len(ds) != 3:
            raise LoiDung("KG_DUNG_LOI", "%s: 'trong_tam' cần 'tam_giac' gồm đúng 3 điểm, nhận '%s'" % (ng, d.get("tam_giac")))
        X = tb([_lay(D, x, ng) for x in ds])
    elif loai == "giao_song_song":   # đường qua M song song AB cắt đường CD tại X
        M = _lay(D, chuan_ten(d.get("qua") or ""), ng)
        a1, b1, _ = _duong(D, d.get("song_song"), ng)
        p, q, ds = _duong(D, d.get("cat"), ng)
        t, s = giao_hai_duong(p, q, M, cong(M, tru(b1, a1)))
        X = noi(p, q, t)
        info = {"tren": ds, "t": t}
    elif loai == "doi_xung":   # đối xứng của điểm qua điểm
        A = _lay(D, chuan_ten(d.get("diem") or ""), ng)
        O = _lay(D, chuan_ten(d.get("qua") or ""), ng)
        X = tru(nhan(O, 2), A)
    else:
        raise LoiDung("KG_DUNG_LOI", "%s: loại phép dựng '%s' chưa hỗ trợ" % (ng, loai),
                      "dùng trung_diem | tren_canh | tren_duong | giao | giao_duong_mat | chan_vuong_goc | trong_tam | giao_song_song | doi_xung")
    return ten, X, info


def thiet_dien(khoi, D, n, o):
    """Đa giác giao của mặt (n, o) với khối lồi (thứ tự quanh trọng tâm) + giao tuyến trên từng mặt vỏ."""
    ds = []
    for a, b in khoi["canh"]:
        pa, pb = D[a], D[b]
        da, db = cham(n, tru(pa, o)), cham(n, tru(pb, o))
        if abs(da) < 1e-9:
            ds.append(pa)
        if abs(db) < 1e-9:
            ds.append(pb)
        if da * db < -1e-18:
            ds.append(noi(pa, pb, da / (da - db)))
    gon = []
    for p in ds:
        if all(kc(p, q) > 1e-7 for q in gon):
            gon.append(p)
    if len(gon) < 3:
        return []
    g = tb(gon)
    u = chuan(tru(gon[0], g))
    v = cheo(n, u)
    gon.sort(key=lambda p: math.atan2(cham(tru(p, g), v), cham(tru(p, g), u)))
    return gon


def mat_bung(da_giac, n, he_so=1.55):
    """Hình chữ nhật trong mặt phẳng bao đa giác thiết diện, phóng he_so quanh tâm -> 'mặt phẳng cắt xuyên khối'."""
    g = tb(da_giac)
    u = chuan(tru(da_giac[0], g))
    v = cheo(n, u)
    xs = [cham(tru(p, g), u) for p in da_giac]
    ys = [cham(tru(p, g), v) for p in da_giac]
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    w, h = (max(xs) - min(xs)) / 2 * he_so, (max(ys) - min(ys)) / 2 * he_so
    return [cong(g, cong(nhan(u, cx + sx * w), nhan(v, cy + sy * h))) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
