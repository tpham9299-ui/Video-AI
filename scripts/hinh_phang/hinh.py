"""Hình học phẳng cơ sở + bộ GIẢI PHÉP DỰNG của đặc tả hinh_phang_chuan (Python thuần).

Đầu vào: danh sách `phep_dung` theo đúng thứ tự đề + bộ tham số tự do (góc tam giác, vị trí điểm tự do) do bo_cuc.py lấy mẫu.
Đầu ra: HinhDung { P: điểm -> (x, y), C: khóa đường tròn -> (cx, cy, r), net: nét vẽ theo từng phép dựng }.
Không có bước nào để AI ghi tọa độ: mọi điểm phụ (chân đường cao, giao điểm, đối xứng...) do máy tính.
"""
import math
import re

EPS = 1e-9
TEN_DIEM = r"[A-Z](?:'+|_\{\d+\}|_?\d+)?"
RE_TEN = re.compile(TEN_DIEM)


class LoiDung(Exception):
    """Phép dựng không thực hiện được (thiếu điểm, hai đường không cắt, tham số sai...)."""

    def __init__(self, ma, chi_tiet, id_buoc=""):
        super().__init__(chi_tiet)
        self.ma, self.chi_tiet, self.id_buoc = ma, chi_tiet, id_buoc


# ---------------- tên điểm ----------------
def chuan_ten(t):
    t = str(t or "").strip()
    m = re.fullmatch(r"([A-Z])_\{(\d+)\}", t)
    if m:
        return m.group(1) + "_" + m.group(2)
    m = re.fullmatch(r"([A-Z])(\d+)", t)
    if m:
        return m.group(1) + "_" + m.group(2)
    return t


def tach_diem(s):
    """"BEDC" -> [B, E, D, C]; "A'B" -> [A', B]; "H_1K" -> [H_1, K]. Bỏ \\triangle, \\angle, dấu cách, ngoặc."""
    s = re.sub(r"\\(triangle|angle|widehat|Delta)\b", "", str(s or ""))
    s = s.replace("{", "").replace("}", "") if "_{" not in s else s
    return [chuan_ten(x) for x in RE_TEN.findall(s.replace(" ", ""))]


def khoa_duong_tron(ref):
    """"(O)" -> "O"; "(BC)" -> "BC"; "O" -> "O"."""
    s = str(ref or "").strip()
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1]
    return "".join(tach_diem(s))


def la_duong_tron(ref):
    s = str(ref or "").strip()
    return s.startswith("(") and s.endswith(")")


# ---------------- vector ----------------
def cong(a, b):
    return (a[0] + b[0], a[1] + b[1])


def tru(a, b):
    return (a[0] - b[0], a[1] - b[1])


def nhan(a, k):
    return (a[0] * k, a[1] * k)


def cham(a, b):
    return a[0] * b[0] + a[1] * b[1]


def cheo(a, b):
    return a[0] * b[1] - a[1] * b[0]


def dai(a):
    return math.hypot(a[0], a[1])


def kc(a, b):
    return dai(tru(a, b))


def don_vi(a):
    d = dai(a)
    if d < EPS:
        raise LoiDung("HP_DUNG_LOI", "véc tơ suy biến (hai điểm trùng nhau)")
    return (a[0] / d, a[1] / d)


def trung(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def goc_do(a, o, b):
    """Số đo góc aOb (độ, 0..180)."""
    u, v = tru(a, o), tru(b, o)
    du, dv = dai(u), dai(v)
    if du < EPS or dv < EPS:
        raise LoiDung("HP_DUNG_LOI", "góc suy biến (đỉnh trùng một đầu)")
    c = max(-1.0, min(1.0, cham(u, v) / (du * dv)))
    return math.degrees(math.acos(c))


def chan_vuong_goc(p, a, b):
    d = tru(b, a)
    L = cham(d, d)
    if L < EPS:
        raise LoiDung("HP_DUNG_LOI", "đường thẳng suy biến")
    t = cham(tru(p, a), d) / L
    return cong(a, nhan(d, t)), t


def giao_dt_dt(a, b, c, d):
    r, s = tru(b, a), tru(d, c)
    den = cheo(r, s)
    if abs(den) < 1e-12:
        raise LoiDung("HP_DUNG_LOI", "hai đường thẳng song song, không cắt nhau")
    t = cheo(tru(c, a), s) / den
    return cong(a, nhan(r, t))


def giao_dt_tron(a, b, tron):
    cx, cy, r = tron
    d = tru(b, a)
    f = tru(a, (cx, cy))
    A = cham(d, d)
    B = 2 * cham(f, d)
    C = cham(f, f) - r * r
    D = B * B - 4 * A * C
    if A < EPS or D < -1e-10:
        raise LoiDung("HP_DUNG_LOI", "đường thẳng không cắt đường tròn")
    D = math.sqrt(max(0.0, D))
    return [cong(a, nhan(d, (-B - D) / (2 * A))), cong(a, nhan(d, (-B + D) / (2 * A)))]


def giao_tron_tron(c1, c2):
    x1, y1, r1 = c1
    x2, y2, r2 = c2
    d = math.hypot(x2 - x1, y2 - y1)
    if d < EPS or d > r1 + r2 + 1e-9 or d < abs(r1 - r2) - 1e-9:
        raise LoiDung("HP_DUNG_LOI", "hai đường tròn không cắt nhau")
    a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(max(0.0, r1 * r1 - a * a))
    mx, my = x1 + a * (x2 - x1) / d, y1 + a * (y2 - y1) / d
    return [(mx + h * (y2 - y1) / d, my - h * (x2 - x1) / d), (mx - h * (y2 - y1) / d, my + h * (x2 - x1) / d)]


def tam_ngoai_tiep(a, b, c):
    d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]))
    if abs(d) < 1e-12:
        raise LoiDung("HP_DUNG_LOI", "ba điểm thẳng hàng, không có đường tròn ngoại tiếp")
    ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d
    uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d
    return (ux, uy)


def tren_doan(p, a, b, tol=1e-7):
    """p nằm trên đoạn ab (kể cả đầu mút)."""
    L = kc(a, b)
    return L > EPS and abs(cheo(tru(b, a), tru(p, a))) / L < tol and -tol <= cham(tru(p, a), tru(b, a)) / (L * L) <= 1 + tol


# ---------------- bộ giải ----------------
LOAI_TU_DO = ("tam_giac", "tam_giac_noi_tiep", "tu_giac", "duong_tron", "diem_tren", "diem_ngoai")
LOAI_DUNG = LOAI_TU_DO + ("chan_duong_cao", "duong_kinh", "trung_diem", "giao_diem", "duong_tron_ngoai_tiep",
                          "duong_tron_duong_kinh", "tiep_tuyen", "phan_giac", "doi_xung", "song_song", "vuong_goc", "doan_noi")


class HinhDung:
    def __init__(self):
        self.P = {}        # tên điểm -> (x, y)
        self.C = {}        # khóa đường tròn -> (cx, cy, r)
        self.C_tam = {}    # khóa đường tròn -> tên tâm (nếu có)
        self.net = []      # [{id, loai: diem|doan|tron|vuong|keo, ...}] theo thứ tự dựng
        self.goc_tam_giac = {}   # tên tam giác -> góc tham số (để kiểm điều kiện)

    # ---- tiện ích ----
    def d(self, ten, id_buoc=""):
        t = chuan_ten(ten)
        if t not in self.P:
            raise LoiDung("HP_DIEM_KHONG_TON_TAI", "điểm %s chưa được dựng trước bước này" % t, id_buoc)
        return self.P[t]

    def hai_diem(self, ref, id_buoc=""):
        ds = tach_diem(ref)
        if len(ds) != 2:
            raise LoiDung("HP_DUNG_LOI", "'%s' không phải đường thẳng / đoạn thẳng qua 2 điểm" % ref, id_buoc)
        return self.d(ds[0], id_buoc), self.d(ds[1], id_buoc), ds

    def tron(self, ref, id_buoc=""):
        k = khoa_duong_tron(ref)
        if k in self.C:
            return self.C[k], k
        raise LoiDung("HP_DIEM_KHONG_TON_TAI", "đường tròn (%s) chưa được dựng" % k, id_buoc)

    def them_diem(self, ten, p, id_buoc, hien=True):
        t = chuan_ten(ten)
        if not t:
            raise LoiDung("HP_DUNG_LOI", "phép dựng thiếu tên điểm", id_buoc)
        if not (math.isfinite(p[0]) and math.isfinite(p[1])):
            raise LoiDung("HP_DUNG_LOI", "tọa độ %s không hữu hạn" % t, id_buoc)
        self.P[t] = (float(p[0]), float(p[1]))
        if hien:
            self.net.append({"id": id_buoc, "loai": "diem", "ten": t})
        return t

    def them_doan(self, a, b, id_buoc, vai="chinh"):
        a, b = chuan_ten(a), chuan_ten(b)
        if a == b:
            return
        for n in self.net:
            if n["loai"] == "doan" and {n["a"], n["b"]} == {a, b}:
                return
        self.net.append({"id": id_buoc, "loai": "doan", "a": a, "b": b, "vai": vai})

    def them_tron(self, khoa, tam, r, id_buoc, ten_tam="", vai="chinh"):
        self.C[khoa] = (tam[0], tam[1], r)
        if ten_tam:
            self.C_tam[khoa] = ten_tam
        self.net.append({"id": id_buoc, "loai": "tron", "khoa": khoa, "vai": vai})

    def them_vuong(self, dinh, a, b, id_buoc):
        self.net.append({"id": id_buoc, "loai": "vuong", "dinh": dinh, "a": a, "b": b})

    def keo_neu_ngoai(self, p_ten, a_ten, b_ten, id_buoc):
        """Điểm nằm ngoài đoạn ab -> kẻ thêm đoạn kéo dài nét đứt từ đầu mút gần nhất."""
        p, a, b = self.P[p_ten], self.P[a_ten], self.P[b_ten]
        if tren_doan(p, a, b, 1e-6):
            return
        gan = a_ten if kc(p, a) < kc(p, b) else b_ten
        self.net.append({"id": id_buoc, "loai": "keo", "a": gan, "b": p_ten})

    def doan_da_ve(self):
        return [(n["a"], n["b"]) for n in self.net if n["loai"] in ("doan", "keo")]


def _chon(ds, b, H, id_buoc):
    """Chọn 1 nghiệm giao theo khac / gan / xa / thu_tu; mặc định bỏ nghiệm trùng điểm đã có."""
    khac = [chuan_ten(x) for x in (b.get("khac") if isinstance(b.get("khac"), list) else [b.get("khac")] if b.get("khac") else [])]
    if khac:
        con = [p for p in ds if all(kc(p, H.d(k, id_buoc)) > 1e-6 for k in khac)]
    else:
        con = [p for p in ds if all(kc(p, q) > 1e-6 for q in H.P.values())] or ds
    if not con:
        raise LoiDung("HP_DUNG_LOI", "giao điểm trùng điểm đã có, không có nghiệm mới", id_buoc)
    if b.get("gan"):
        q = H.d(b["gan"], id_buoc)
        return min(con, key=lambda p: kc(p, q))
    if b.get("xa"):
        q = H.d(b["xa"], id_buoc)
        return max(con, key=lambda p: kc(p, q))
    # nghiệm "trên" (y lớn) trước như sách giáo khoa khi đề không nói
    return sorted(con, key=lambda p: (-round(p[1], 9), p[0]))[0] if b.get("thu_tu") != "duoi" else sorted(con, key=lambda p: (round(p[1], 9), p[0]))[0]


def _duong(ref, H, id_buoc):
    """ref -> ('dt', a, b) hoặc ('tron', (cx,cy,r))."""
    if la_duong_tron(ref) or khoa_duong_tron(ref) in H.C and len(tach_diem(ref)) == 1:
        c, _ = H.tron(ref, id_buoc)
        return ("tron", c)
    a, b, _ = H.hai_diem(ref, id_buoc)
    return ("dt", a, b)


def _giao(r1, r2, b, H, id_buoc):
    x, y = _duong(r1, H, id_buoc), _duong(r2, H, id_buoc)
    if x[0] == "dt" and y[0] == "dt":
        return giao_dt_dt(x[1], x[2], y[1], y[2])
    if x[0] == "tron" and y[0] == "tron":
        return _chon(giao_tron_tron(x[1], y[1]), b, H, id_buoc)
    dt, tr = (x, y) if x[0] == "dt" else (y, x)
    return _chon(giao_dt_tron(dt[1], dt[2], tr[1]), b, H, id_buoc)


def _dat_tam_giac(ten3, goc, R=1.0):
    """Tam giác nội tiếp đường tròn bán kính R tâm gốc, đỉnh ten3[0] ở trên, cạnh đối nằm ngang phía dưới.
    goc = (α tại đỉnh trên, β tại đỉnh trái-dưới ten3[1], γ tại đỉnh phải-dưới ten3[2])."""
    a, b, c = [math.radians(x) for x in goc]
    pB = math.radians(270) - a
    pC = math.radians(-90) + a
    pA = math.radians(-90) + a + 2 * b
    return {ten3[1]: (R * math.cos(pB), R * math.sin(pB)),
            ten3[2]: (R * math.cos(pC), R * math.sin(pC)),
            ten3[0]: (R * math.cos(pA), R * math.sin(pA))}


def thu_tu_tam_giac(dinh, dieu_kien):
    """Đỉnh đặc biệt (vuông / cân / tù tại X) đặt lên trên; còn lại giữ thứ tự đề (đỉnh trái, đỉnh phải)."""
    dinh = [chuan_ten(x) for x in dinh]
    tg = "".join(sorted(dinh))
    for dk in dieu_kien or []:
        if not isinstance(dk, dict) or "".join(sorted(tach_diem(dk.get("tg", "")))) != tg:
            continue
        if dk.get("loai") in ("tam_giac_vuong", "tam_giac_can", "tam_giac_tu") and chuan_ten(dk.get("tai")) in dinh:
            x = chuan_ten(dk.get("tai"))
            con = [d for d in dinh if d != x]
            return [x] + con
    return dinh


def dung_hinh(phep_dung, tham, dieu_kien=None):
    """Chạy toàn bộ phép dựng với bộ tham số tự do `tham` (khóa = id bước). Trả HinhDung hoặc ném LoiDung."""
    H = HinhDung()
    for i, b in enumerate(phep_dung):
        if not isinstance(b, dict):
            continue
        idb = str(b.get("id") or "d%d" % (i + 1))
        loai = str(b.get("loai") or "")
        th = tham.get(idb) or {}
        if loai not in LOAI_DUNG:
            raise LoiDung("HP_DUNG_LOI", "loại phép dựng '%s' không hỗ trợ" % loai, idb)
        if loai in ("tam_giac", "tam_giac_noi_tiep"):
            dinh = tach_diem("".join(b.get("dinh") or [])) if isinstance(b.get("dinh"), list) else tach_diem(b.get("dinh"))
            if len(dinh) != 3:
                raise LoiDung("HP_DUNG_LOI", "tam giác cần đúng 3 đỉnh", idb)
            thu_tu = thu_tu_tam_giac(dinh, dieu_kien)
            toa = _dat_tam_giac(thu_tu, th.get("goc") or (60, 60, 60))
            H.goc_tam_giac["".join(dinh)] = th.get("goc")
            if loai == "tam_giac_noi_tiep":
                tam = chuan_ten(b.get("tam") or "O")
                H.them_tron(tam, (0.0, 0.0), 1.0, idb, ten_tam=tam)
                H.C["".join(dinh)] = H.C[tam]
                H.them_diem(tam, (0.0, 0.0), idb)
            for x in dinh:
                H.P[x] = toa[x]
            for x, y in ((dinh[0], dinh[1]), (dinh[1], dinh[2]), (dinh[2], dinh[0])):
                H.them_doan(x, y, idb)
            for x in dinh:
                H.net.append({"id": idb, "loai": "diem", "ten": x})
        elif loai == "tu_giac":
            dinh = tach_diem("".join(b.get("dinh") or []) if isinstance(b.get("dinh"), list) else b.get("dinh"))
            if len(dinh) != 4:
                raise LoiDung("HP_DUNG_LOI", "tứ giác cần đúng 4 đỉnh", idb)
            kieu = str(b.get("kieu") or "tu_giac")
            k = float(th.get("ti_le") or 1.5)
            lech = float(th.get("lech") or 0.45)
            if kieu == "hinh_vuong":
                toa = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
            elif kieu == "hinh_chu_nhat":
                toa = [(-k, -1), (k, -1), (k, 1), (-k, 1)]
            elif kieu == "hinh_binh_hanh":
                toa = [(-k - lech, -1), (k - lech, -1), (k + lech, 1), (-k + lech, 1)]
            elif kieu == "hinh_thoi":
                toa = [(0, -1.25), (k, 0), (0, 1.25), (-k, 0)]
            elif kieu == "hinh_thang":
                toa = [(-k, -1), (k, -1), (k * 0.45 + lech, 1), (-k * 0.55 + lech, 1)]
            else:
                toa = [(-k, -1), (k * 0.9, -1.15), (k * 0.7 + lech, 1), (-k * 0.6, 0.85)]
            for t, p in zip(dinh, toa):
                H.P[t] = (float(p[0]), float(p[1]))
            for j in range(4):
                H.them_doan(dinh[j], dinh[(j + 1) % 4], idb)
            for t in dinh:
                H.net.append({"id": idb, "loai": "diem", "ten": t})
        elif loai == "duong_tron":
            tam = chuan_ten(b.get("tam") or "O")
            H.them_tron(tam, (0.0, 0.0), 1.0, idb, ten_tam=tam)
            H.them_diem(tam, (0.0, 0.0), idb)
        elif loai == "diem_tren":
            tren = b.get("tren")
            if la_duong_tron(tren):
                (cx, cy, r), _ = H.tron(tren, idb)
                g = math.radians(float(th.get("goc", 30)))
                H.them_diem(b.get("ten"), (cx + r * math.cos(g), cy + r * math.sin(g)), idb)
            else:
                a, c, _ = H.hai_diem(tren, idb)
                t = float(th.get("t", 0.4))
                H.them_diem(b.get("ten"), cong(a, nhan(tru(c, a), t)), idb)
        elif loai == "diem_ngoai":
            (cx, cy, r), _ = H.tron(b.get("duong_tron") or "(O)", idb)
            g = math.radians(float(th.get("goc", 0)))
            dd = float(th.get("kc", 2.1)) * r
            H.them_diem(b.get("ten"), (cx + dd * math.cos(g), cy + dd * math.sin(g)), idb)
        elif loai == "chan_duong_cao":
            p = H.d(b.get("tu"), idb)
            a, c, ab = H.hai_diem(b.get("xuong"), idb)
            f, _ = chan_vuong_goc(p, a, c)
            t = H.them_diem(b.get("ten"), f, idb)
            H.them_doan(chuan_ten(b.get("tu")), t, idb, vai="cao")
            H.keo_neu_ngoai(t, ab[0], ab[1], idb)
            xa = ab[0] if kc(f, a) >= kc(f, c) else ab[1]
            H.them_vuong(t, chuan_ten(b.get("tu")), xa, idb)
        elif loai == "duong_kinh":
            (cx, cy, r), k = H.tron(b.get("duong_tron") or "(O)", idb)
            a = H.d(b.get("tu"), idb)
            if abs(kc(a, (cx, cy)) - r) > 1e-6:
                raise LoiDung("HP_DUNG_LOI", "%s không nằm trên đường tròn (%s) nên không kẻ được đường kính" % (b.get("tu"), k), idb)
            t = H.them_diem(b.get("ten"), (2 * cx - a[0], 2 * cy - a[1]), idb)
            H.them_doan(chuan_ten(b.get("tu")), t, idb, vai="phu")
        elif loai == "trung_diem":
            a, c, _ = H.hai_diem(b.get("doan"), idb)
            H.them_diem(b.get("ten"), trung(a, c), idb)
        elif loai == "giao_diem":
            p = _giao(b.get("a"), b.get("b"), b, H, idb)
            t = H.them_diem(b.get("ten"), p, idb)
            for ref in (b.get("a"), b.get("b")):
                if not la_duong_tron(ref) and len(tach_diem(ref)) == 2:
                    x, y = tach_diem(ref)
                    H.keo_neu_ngoai(t, x, y, idb)
        elif loai == "duong_tron_ngoai_tiep":
            ds = tach_diem(b.get("tg"))
            if len(ds) != 3:
                raise LoiDung("HP_DUNG_LOI", "đường tròn ngoại tiếp cần tam giác 3 đỉnh", idb)
            o = tam_ngoai_tiep(*[H.d(x, idb) for x in ds])
            tam = chuan_ten(b.get("tam") or "O")
            H.them_tron(tam, o, kc(o, H.d(ds[0], idb)), idb, ten_tam=tam)
            H.C["".join(ds)] = H.C[tam]
            H.them_diem(tam, o, idb)
        elif loai == "duong_tron_duong_kinh":
            a, c, ds = H.hai_diem(b.get("doan"), idb)
            o = trung(a, c)
            khoa = "".join(ds)
            H.them_tron(khoa, o, kc(a, c) / 2, idb, ten_tam=chuan_ten(b.get("tam") or ""), vai=b.get("vai") or "chinh")
            if b.get("tam"):
                H.C[chuan_ten(b["tam"])] = H.C[khoa]
                H.them_diem(b["tam"], o, idb)
        elif loai == "tiep_tuyen":
            (cx, cy, r), _ = H.tron(b.get("duong_tron") or "(O)", idb)
            if b.get("tai"):
                T = H.d(b["tai"], idb)
                huong = (-(T[1] - cy), T[0] - cx)
                Q = cong(T, huong)
                if b.get("cat"):
                    p = _giao_tt(T, Q, b.get("cat"), b, H, idb)
                    t = H.them_diem(b.get("ten"), p, idb)
                    H.them_doan(chuan_ten(b["tai"]), t, idb)
                else:
                    raise LoiDung("HP_DUNG_LOI", "tiếp tuyến tại %s cần 'cat' (đường cắt để có điểm vẽ)" % b["tai"], idb)
            elif b.get("tu"):
                M = H.d(b["tu"], idb)
                d0 = kc(M, (cx, cy))
                if d0 <= r + 1e-9:
                    raise LoiDung("HP_DUNG_LOI", "%s không nằm ngoài đường tròn nên không kẻ được tiếp tuyến" % b["tu"], idb)
                L = math.sqrt(d0 * d0 - r * r)
                ds = giao_tron_tron((cx, cy, r), (M[0], M[1], L))
                ds = sorted(ds, key=lambda p: -p[1])
                ten = b.get("ten_tiep_diem") or []
                ten = ten if isinstance(ten, list) else [ten]
                for k2, nm in enumerate(ten[:2]):
                    t = H.them_diem(nm, ds[k2], idb)
                    H.them_doan(chuan_ten(b["tu"]), t, idb)
            else:
                raise LoiDung("HP_DUNG_LOI", "tiếp tuyến cần 'tai' (tiếp điểm) hoặc 'tu' (điểm ngoài)", idb)
        elif loai == "phan_giac":
            ds = tach_diem(b.get("goc"))
            if len(ds) != 3:
                raise LoiDung("HP_DUNG_LOI", "phân giác cần góc 3 điểm", idb)
            A, O, B = [H.d(x, idb) for x in ds]
            huong = cong(don_vi(tru(A, O)), don_vi(tru(B, O)))
            Q = cong(O, huong)
            p = _giao_tt(O, Q, b.get("cat"), b, H, idb, bo=ds[1])
            t = H.them_diem(b.get("ten"), p, idb)
            H.them_doan(ds[1], t, idb)
        elif loai == "doi_xung":
            p = H.d(b.get("diem"), idb)
            qua = b.get("qua")
            if len(tach_diem(qua)) == 1:
                q = H.d(qua, idb)
                kq = (2 * q[0] - p[0], 2 * q[1] - p[1])
            else:
                a, c, _ = H.hai_diem(qua, idb)
                f, _ = chan_vuong_goc(p, a, c)
                kq = (2 * f[0] - p[0], 2 * f[1] - p[1])
            H.them_diem(b.get("ten"), kq, idb)
        elif loai in ("song_song", "vuong_goc"):
            P0 = H.d(b.get("qua"), idb)
            a, c, ab = H.hai_diem(b.get("voi"), idb)
            d = tru(c, a)
            huong = d if loai == "song_song" else (-d[1], d[0])
            Q = cong(P0, huong)
            if b.get("cat"):
                p = _giao_tt(P0, Q, b.get("cat"), b, H, idb)
            elif loai == "vuong_goc":
                p, _ = chan_vuong_goc(P0, a, c)
            else:
                raise LoiDung("HP_DUNG_LOI", "song song cần 'cat' để có điểm vẽ", idb)
            t = H.them_diem(b.get("ten"), p, idb)
            H.them_doan(chuan_ten(b.get("qua")), t, idb)
            if loai == "vuong_goc" and not b.get("cat"):
                H.keo_neu_ngoai(t, ab[0], ab[1], idb)
                H.them_vuong(t, chuan_ten(b.get("qua")), ab[0] if kc(p, a) >= kc(p, c) else ab[1], idb)
        elif loai == "doan_noi":
            ds_doan = b.get("doan") if isinstance(b.get("doan"), list) else [b.get("doan")]
            for s in ds_doan:
                ds = tach_diem(s)
                if len(ds) < 2:
                    raise LoiDung("HP_DUNG_LOI", "đoạn nối '%s' cần 2 điểm" % s, idb)
                for x in ds:
                    H.d(x, idb)
                for j in range(len(ds) - 1):
                    H.them_doan(ds[j], ds[j + 1], idb, vai=b.get("vai") or "chinh")
    return H


def _giao_tt(P0, Q, cat, b, H, idb, bo=None):
    """Giao của đường thẳng P0Q với 'cat' (đường thẳng hoặc đường tròn)."""
    x = _duong(cat, H, idb)
    if x[0] == "dt":
        return giao_dt_dt(P0, Q, x[1], x[2])
    ds = giao_dt_tron(P0, Q, x[1])
    if bo:
        o = H.d(bo, idb)
        ds = [p for p in ds if kc(p, o) > 1e-6] or ds
    return _chon(ds, b, H, idb)
