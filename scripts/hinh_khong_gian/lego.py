"""v98 - ĐỘNG CƠ LEGO 6 KHỐI NGUYÊN THỦY (Oxyz lớp 12 + Toán thực tế 3D) cho kb.hinh_khong_gian phien_ban 2.

AI (Gemini, có responseSchema enum) chỉ KHAI BÁO: điểm dữ kiện của đề (`toa_do` chỉ khi đề cho số / tọa độ) + QUAN HỆ suy diễn
(doi_xung_mat, tinh_tien, quay, trung_diem, tren_doan, giao_duong_mat, chan_vuong_goc, toi_uu_tong) + 6 khối:
    khoi (hop | lang_tru | chop | tru | non | cau) | doan (thang | vector | tia | gion) | duong_cong (tron | cung | parabol |
    elip | quy_dao) | mat (san_oxy | mat_phang | da_giac) | diem (tĩnh / chuyển động theo doan, duong_cong) | he_truc (oxy | oxyz)
Máy tính MỌI tọa độ suy diễn + kiểm mệnh đề / số đo. Khối `trang_tri: true` lỗi tham số hoặc làm co lõi toán (quá xa) -> bỏ
riêng khối đó (cảnh báo), lõi toán vẫn chạy; lỗi ở lõi -> lỗi cứng KG_* (BP2 cho Gemini tự vá 1 lần).
Đầu ra cùng khuôn `dung` của v97 (diem/khoi/doan/kinh/goc/nhan) + trường mở rộng (khoiDs, nhanTu, nhanTen, mauDiem, chuyen,
bienHinh, bangMau) cho src/khonggian (SVG 3D, nét liền/đứt giải tích nhiều khối).
"""
import math

from .hinh import LoiDung, cham, cheo, chuan, cong, dai, giao_duong_mat, kc, nhan, noi, tru

LOAI_KHOI = ("khoi", "doan", "duong_cong", "mat", "diem", "he_truc")
HINH_KHOI = ("hop", "lang_tru", "chop", "tru", "non", "cau")
DONG_TAC = ("tinh_tien", "doi_xung_mat", "quay", "co_lap", "truot_toi_uu")
QUAN_HE = ("toa_do", "trung_diem", "tren_doan", "doi_xung_mat", "doi_xung_diem", "tinh_tien", "quay", "giao_duong_mat",
           "chan_vuong_goc", "toi_uu_tong")
MAU = {"cyan": "#38BDF8", "vang": "#FACC15", "hong": "#FB7185", "ngoc": "#34D399", "trang": "#E6EDF5", "xam": "#7C8696",
       "cam": "#FB923C", "tim": "#A78BFA", "la": "#4ADE80"}
N_TRU = 36
N_CAU = (20, 10)
N_CONG = 48


def _loi(ma, chi_tiet, goi_y=""):
    return {"ma": ma, "chi_tiet": chi_tiet, "goi_y": goi_y}


def _so(x, ten="giá trị"):
    try:
        return float(str(x).replace(",", "."))
    except (TypeError, ValueError):
        raise LoiDung("KG_THIEU_DAC_TA", "%s không phải số: %r" % (ten, x))


def _v3(x, ten="tọa độ"):
    if not isinstance(x, (list, tuple)) or len(x) != 3:
        raise LoiDung("KG_THIEU_DAC_TA", "%s phải là [x, y, z]: %r" % (ten, x))
    return tuple(_so(c, ten) for c in x)


MAT_TRUC = {"oxy": ((0, 0, 1), (0, 0, 0)), "oyz": ((1, 0, 0), (0, 0, 0)), "oxz": ((0, 1, 0), (0, 0, 0))}


class Lego:
    def __init__(self, hkg):
        self.hkg = hkg
        self.D = {}          # tên -> tọa độ thật (đơn vị đề)
        self.nguon = {}      # tên -> loại quan hệ
        self.loi, self.canh_bao = [], []

    # ---------------- điểm ----------------
    def P(self, ten, ngu=""):
        t = str(ten or "").strip()
        if t in self.D:
            return self.D[t]
        if isinstance(ten, (list, tuple)):
            return _v3(ten)
        raise LoiDung("KG_DIEM_KHONG_TON_TAI", "%s nhắc điểm '%s' chưa khai báo / chưa dựng" % (ngu or "đặc tả", t),
                      "khai báo điểm trong `diem` (toa_do chỉ khi đề cho số) hoặc dựng bằng quan hệ trước khi dùng")

    def mat(self, m, ngu=""):
        """'Oxy' | 'mat_Oxy' | [A, B, C] -> (pháp tuyến đơn vị, điểm)."""
        if isinstance(m, str):
            k = m.lower().replace("mat_", "").replace("(", "").replace(")", "").strip()
            if k in MAT_TRUC:
                return MAT_TRUC[k]
            ds = [x for x in _tach(m) if x in self.D]
            if len(ds) >= 3:
                m = ds
        if isinstance(m, (list, tuple)) and len(m) >= 3:
            a, b, c = (self.P(x, ngu) for x in m[:3])
            n = cheo(tru(b, a), tru(c, a))
            if dai(n) < 1e-12:
                raise LoiDung("KG_DUNG_LOI", "%s: 3 điểm mặt phẳng thẳng hàng" % ngu)
            return chuan(n), a
        raise LoiDung("KG_THIEU_DAC_TA", "%s: mặt phẳng '%s' không đọc được" % (ngu, m), "dùng 'Oxy' / 'Oyz' / 'Oxz' hoặc 3 tên điểm")

    def duong(self, s, ngu=""):
        ds = _tach(s) if isinstance(s, str) else list(s or [])
        if len(ds) != 2:
            raise LoiDung("KG_THIEU_DAC_TA", "%s: đường '%s' cần đúng 2 điểm" % (ngu, s))
        return self.P(ds[0], ngu), self.P(ds[1], ngu)

    def dung_diem(self, d):
        ten = str(d.get("ten") or "").strip()
        if not ten:
            raise LoiDung("KG_THIEU_DAC_TA", "điểm thiếu tên: %r" % d)
        if ten in self.D:
            raise LoiDung("KG_DUNG_LOI", "điểm %s được dựng hai lần" % ten)
        l = str(d.get("loai") or ("toa_do" if d.get("toa_do") is not None else "")).strip()
        ngu = "điểm %s" % ten
        if l == "toa_do":
            X = _v3(d.get("toa_do"), ngu)
        elif l == "trung_diem":
            a, b = self.duong(d.get("doan") or [d.get("a"), d.get("b")], ngu)
            X = noi(a, b, 0.5)
        elif l == "tren_doan":
            a, b = self.duong(d.get("doan") or [d.get("a"), d.get("b")], ngu)
            X = noi(a, b, _so(d.get("ti_le", 0.5), ngu + ".ti_le"))
        elif l == "doi_xung_mat":
            n, o = self.mat(d.get("mat") or "Oxy", ngu)
            S = self.P(d.get("nguon"), ngu)
            X = tru(S, nhan(n, 2 * cham(n, tru(S, o))))
        elif l == "doi_xung_diem":
            S, I = self.P(d.get("nguon"), ngu), self.P(d.get("tam"), ngu)
            X = tru(nhan(I, 2), S)
        elif l == "tinh_tien":
            S = self.P(d.get("nguon"), ngu)
            X = cong(S, self.vec(d.get("vec"), ngu))
        elif l == "quay":
            S = self.P(d.get("nguon"), ngu)
            o, v = self.duong(d.get("truc"), ngu)
            X = _quay(S, o, tru(v, o), math.radians(_so(d.get("goc"), ngu + ".goc")))
        elif l == "giao_duong_mat":
            p, q = self.duong(d.get("duong"), ngu)
            n, o = self.mat(d.get("mat"), ngu)
            X = noi(p, q, giao_duong_mat(p, q, n, o))
        elif l == "chan_vuong_goc":
            S = self.P(d.get("tu"), ngu)
            if d.get("mat") is not None:
                n, o = self.mat(d.get("mat"), ngu)
                X = tru(S, nhan(n, cham(n, tru(S, o))))
            else:
                p, q = self.duong(d.get("duong"), ngu)
                u = tru(q, p)
                X = cong(p, nhan(u, cham(tru(S, p), u) / max(1e-12, cham(u, u))))
        elif l == "toi_uu_tong":
            X = self.toi_uu(d, ngu)[0]
        else:
            raise LoiDung("KG_THIEU_DAC_TA", "%s: quan hệ '%s' lạ" % (ngu, l), "chọn " + " | ".join(QUAN_HE))
        self.D[ten] = tuple(float(c) for c in X)
        self.nguon[ten] = l
        return ten

    def vec(self, v, ngu):
        if isinstance(v, str):
            a, b = self.duong(v.replace("vec_", "").replace("vec", ""), ngu)
            return tru(b, a)
        if isinstance(v, (list, tuple)) and len(v) == 2 and all(isinstance(x, str) for x in v):
            a, b = self.duong(v, ngu)
            return tru(b, a)
        return _v3(v, ngu + ".vec")

    def duong_truot(self, tren, toi, ngu):
        """Đường trượt cho điểm tối ưu: 'Ox'/'Oy'/'AB' (đường) hoặc mặt -> đoạn nối hình chiếu 2 điểm đích lên mặt (chứa cực trị)."""
        if isinstance(tren, str) and tren.lower() in ("ox", "oy", "oz"):
            k = "xyz".index(tren.lower()[1])
            ps = [self.P(x, ngu) for x in toi]
            lo = min(p[k] for p in ps) - 0.25 * (abs(ps[0][k] - ps[-1][k]) + 1)
            hi = max(p[k] for p in ps) + 0.25 * (abs(ps[0][k] - ps[-1][k]) + 1)
            a, b = [0.0] * 3, [0.0] * 3
            a[k], b[k] = lo, hi
            return tuple(a), tuple(b)
        ds = _tach(tren) if isinstance(tren, str) else list(tren or [])
        if len(ds) == 2 and all(x in self.D for x in ds):
            return self.D[ds[0]], self.D[ds[1]]
        n, o = self.mat(tren, ngu)
        ch = [tru(self.P(x, ngu), nhan(n, cham(n, tru(self.P(x, ngu), o)))) for x in toi]
        if kc(ch[0], ch[1]) < 1e-9:
            return ch[0], cong(ch[0], (1e-3, 0, 0))
        u = tru(ch[1], ch[0])
        return tru(ch[0], nhan(u, 0.2)), cong(ch[1], nhan(u, 0.2))

    def toi_uu(self, d, ngu):
        """Tìm M trên đường trượt làm tổng (hoặc hiệu) khoảng cách tới các điểm đích nhỏ nhất -> (M, a, b, u*)."""
        toi = list(d.get("toi") or [])
        if len(toi) < 2:
            raise LoiDung("KG_THIEU_DAC_TA", "%s: toi_uu_tong cần 'toi': [A, B]" % ngu)
        a, b = self.duong_truot(d.get("tren") or "Oxy", toi, ngu)
        ps = [self.P(x, ngu) for x in toi]
        f = lambda u: sum(kc(noi(a, b, u), p) for p in ps)  # noqa: E731
        lo, hi = 0.0, 1.0
        for _ in range(80):   # hàm lồi theo u (tổng khoảng cách) -> chia ba
            m1, m2 = lo + (hi - lo) / 3, hi - (hi - lo) / 3
            if f(m1) < f(m2):
                hi = m2
            else:
                lo = m1
        u = (lo + hi) / 2
        return noi(a, b, u), a, b, u


def _tach(s):
    import re
    return re.findall(r"[A-Z](?:_?\d+)?'*", str(s or ""))


def _quay(p, o, v, g):
    k = chuan(v)
    r = tru(p, o)
    c, s = math.cos(g), math.sin(g)
    r2 = cong(cong(nhan(r, c), nhan(cheo(k, r), s)), nhan(k, cham(k, r) * (1 - c)))
    return cong(o, r2)


def _vuong_goc(n):
    a = (1, 0, 0) if abs(n[0]) < 0.9 else (0, 1, 0)
    u = chuan(cheo(n, a))
    return u, cheo(n, u)


# ======================================================================================================================
def giai_lego(kb, chi_kiem=False):
    """kb.hinh_khong_gian phien_ban 2 -> cùng khuôn kết quả giai() của v97 (dat, loi, canh_bao, so_do, dung...)."""
    from . import kiem
    hkg = kb["hinh_khong_gian"]
    L = Lego(hkg)
    lop = kb.get("lop")
    try:
        lop_so = int(str(lop or "12").strip()[:2])
    except ValueError:
        lop_so = 12
    ht = hkg.get("he_truc") if isinstance(hkg.get("he_truc"), dict) else ({"loai": hkg["he_truc"]} if isinstance(hkg.get("he_truc"), str) else {})
    ds_obj = [o for o in hkg.get("doi_tuong") or [] if isinstance(o, dict)]
    for o in ds_obj:
        if o.get("loai") == "he_truc" and not ht:
            ht = o
    if str(ht.get("loai") or "").lower() == "oxyz" and lop_so < 12:
        L.loi.append(_loi("KG_VUOT_CHUONG_TRINH", "hệ trục Oxyz chỉ dùng ở lớp 12", "lớp 10-11: bỏ he_truc oxyz, mô tả bằng khoảng cách / độ cao"))
    for ma, ct, gy in kiem.kiem_gdpt({k: v for k, v in hkg.items() if k != "he_truc"}, lop):
        L.loi.append(_loi(ma, ct, gy))
    # ---- điểm: dữ kiện + quan hệ (theo thứ tự) ----
    diem_tt = set()
    for d in hkg.get("diem") or []:
        if not isinstance(d, dict):
            continue
        if d.get("trang_tri"):
            diem_tt.add(str(d.get("ten") or ""))
        try:
            L.dung_diem(d)
        except LoiDung as e:
            if d.get("trang_tri"):
                L.canh_bao.append("bỏ điểm trang trí %s: %s" % (d.get("ten"), e.chi_tiet))
            else:
                L.loi.append(_loi(e.ma, e.chi_tiet, e.goi_y))
    if not L.D and not ds_obj:
        L.loi.append(_loi("KG_THIEU_DAC_TA", "hinh_khong_gian v2 không có điểm / khối nào"))
    # ---- 6 khối: dựng hình học thật (đơn vị đề) ----
    dung = {"khoiDs": [], "doan": [], "kinh": [], "cong": [], "nhanTu": [], "diemVe": {}, "chuyen": [], "loi_khoi": []}
    core_pts, decor = [], []
    tam_gion = []
    for o in ds_obj:
        loai = str(o.get("loai") or "")
        oid = str(o.get("id") or "%s_%d" % (loai, len(dung["khoiDs"]) + len(dung["doan"])))
        try:
            if loai not in LOAI_KHOI:
                raise LoiDung("KG_THIEU_DAC_TA", "khối '%s' loại lạ '%s'" % (oid, loai), "chọn " + " | ".join(LOAI_KHOI))
            ra = _dung_obj(L, o, oid, loai, ht)
        except LoiDung as e:
            if o.get("trang_tri"):
                L.canh_bao.append("bỏ khối trang trí %s: %s" % (oid, e.chi_tiet))
                continue
            L.loi.append(_loi(e.ma, "%s: %s" % (oid, e.chi_tiet), e.goi_y))
            continue
        ra["_trang_tri"] = bool(o.get("trang_tri"))
        (decor if o.get("trang_tri") else core_pts).append(ra)
    # ---- Lớp 3: khối trang trí làm lõi co lại (quá xa tâm lõi) -> bỏ riêng ----
    lo_pts = [p for r in core_pts for p in r.get("pts", [])] + [L.D[t] for t in L.D if t not in diem_tt]
    if lo_pts:
        g = tuple(sum(p[i] for p in lo_pts) / len(lo_pts) for i in range(3))
        R0 = max(1e-6, max(kc(p, g) for p in lo_pts))
        giu = []
        for r in decor:
            Rk = max([kc(p, g) for p in r.get("pts", [])] or [0])
            if Rk > 1.6 * R0:
                for t in list(L.D):   # điểm trang trí chỉ phục vụ khối bị bỏ -> bỏ theo (không kéo khung hình ra xa)
                    if t in diem_tt and any(kc(L.D[t], q) < 1e-9 for q in r.get("pts", [])) or (t in diem_tt and kc(L.D[t], g) > 1.6 * R0):
                        L.D.pop(t, None)
                L.canh_bao.append("bỏ khối trang trí %s: tràn khung (xa %.1f lần lõi toán) -> giữ lõi toán rõ trong vùng an toàn" % (r["id"], Rk / R0))
            else:
                giu.append(r)
        decor = giu
    tat = core_pts + decor
    # ---- mệnh đề + số đo (trên tọa độ thật) ----
    ds_md = [m for m in (hkg.get("menh_de") or []) if isinstance(m, dict)]
    for b in hkg.get("buoc") or []:
        if isinstance(b, dict):
            ds_md += [m for m in (b.get("menh_de") or []) if isinstance(m, dict)]
    for md in ds_md:
        try:
            ok = _kiem_md_lego(L, md)
            if ok is None:
                ok = kiem.kiem_menh_de(md, L.D)[0]
        except LoiDung as e:
            L.loi.append(_loi(e.ma, e.chi_tiet, e.goi_y))
            continue
        if not ok:
            L.loi.append(_loi("KG_MENH_DE_SAI", "mệnh đề %s SAI trên tọa độ máy tính" % _gon(md), "kiểm lại dữ kiện / quan hệ dựng"))
    so_do = []
    for dl in [x for x in (hkg.get("so_do") or []) if isinstance(x, dict)]:
        try:
            v = _so_do_lego(L, dl)
            if v is None:
                v = kiem.tinh_so_do(dl, L.D)
        except LoiDung as e:
            L.loi.append(_loi(e.ma, e.chi_tiet, e.goi_y))
            continue
        ky = kiem.doc_gia_tri(dl.get("gia_tri"))
        so_do.append({**dl, "may_tinh": round(v, 6)})
        if ky is not None and abs(v - ky) > max(1e-3 * max(1.0, abs(ky)), 0.5 * 10 ** (-_so_le(dl.get("gia_tri")))):
            L.loi.append(_loi("KG_SAI_SO_DO", "%s: máy tính %.4f, kịch bản ghi %s" % (dl.get("loai"), v, dl.get("gia_tri")),
                              "kiểm lại phép tính (đơn vị theo đề)"))
    ra = {"dat": not L.loi, "loi": L.loi, "canh_bao": L.canh_bao, "phien_ban": 2,
          "cau_hinh": {"ty_le_bat_ky": {}, "so_mau": 1, "kich_thuoc_that": True, "lego": True}, "so_do": so_do}
    if chi_kiem or L.loi:
        return ra
    ra["dung"] = _xuat(L, tat, hkg, ht)
    return ra


def _so_le(s):
    import re
    m = re.search(r"[.,](\d+)", str(s or ""))
    return len(m.group(1)) if m else 0


def _gon(x):
    import json
    return json.dumps(x, ensure_ascii=False)[:160]


def _kiem_md_lego(L, md):
    l = str(md.get("loai") or "")
    if l in ("thuoc_mat", "diem_thuoc_mat"):
        n, o = L.mat(md.get("mat"), "mệnh đề")
        return abs(cham(n, tru(L.P(md.get("diem"), "mệnh đề"), o))) < 1e-6 * (1 + dai(L.P(md.get("diem"))))
    if l == "thang_hang":
        a, b, c = (L.P(x, "mệnh đề") for x in _tach(md.get("diem")) [:3])
        return dai(cheo(tru(b, a), tru(c, a))) < 1e-6 * (1 + kc(a, b) * kc(a, c))
    if l == "cung_phia_mat":
        n, o = L.mat(md.get("mat"), "mệnh đề")
        s = [cham(n, tru(L.P(x), o)) for x in _tach(md.get("diem"))]
        return all(v > 0 for v in s) or all(v < 0 for v in s)
    if l == "toi_uu":
        # M (điểm dựng bằng quan hệ / đề) trùng điểm cực tiểu máy tính tìm trên đường trượt
        M = L.P(md.get("diem"), "mệnh đề")
        X = L.toi_uu(md, "mệnh đề")[0]
        return kc(M, X) < 1e-3 * (1 + dai(M))
    return None


def _so_do_lego(L, dl):
    l = str(dl.get("loai") or "")
    if l in ("tong_do_dai", "tong_kc"):
        return sum(kc(*L.duong(s, "số đo")) for s in dl.get("doan") or [])
    if l in ("do_dai", "khoang_cach_diem"):
        d = dl.get("doan")
        if isinstance(d, list) and len(d) == 1:   # schema: doan là mảng ["AM"]
            d = d[0]
        return kc(*L.duong(d, "số đo"))
    if l == "toa_do":
        P = L.P(dl.get("diem"), "số đo")
        return P["xyz".index(str(dl.get("truc") or "x")[-1].lower())]
    return None


# ---------------- dựng từng khối ----------------
def _mau(o, md):
    m = str(o.get("mau") or md)
    return MAU.get(m, m if m.startswith("#") else MAU.get(md, "#E6EDF5"))


def _dung_obj(L, o, oid, loai, ht):
    if loai == "khoi":
        return _khoi(L, o, oid)
    if loai == "doan":
        a, b = L.duong(o.get("doan") or [o.get("a"), o.get("b")], oid)
        kieu = str(o.get("kieu") or "thang")
        if kieu == "tia":
            b = cong(a, nhan(tru(b, a), float(o.get("keo_dai") or 1.8)))
        r = {"id": oid, "kind": "doan", "a": a, "b": b, "ten": _tach(o.get("doan") or "") or [o.get("a"), o.get("b")], "kieu": kieu,
             "mau": _mau(o, "vang" if kieu == "gion" else "cyan" if kieu == "vector" else "trang"), "nhan": str(o.get("nhan") or ""),
             "lech": o.get("lech"), "pts": [a, b]}
        return r
    if loai == "duong_cong":
        return _cong(L, o, oid)
    if loai == "mat":
        return _mat(L, o, oid)
    if loai == "diem":
        ten = str(o.get("diem") or oid)
        P = L.P(ten, oid)
        cd = o.get("chuyen_dong") if isinstance(o.get("chuyen_dong"), dict) else None
        return {"id": oid, "kind": "diem", "ten": ten, "nhan": str(o.get("nhan") or ten), "mau": _mau(o, "vang"), "cd": cd, "pts": [P]}
    if loai == "he_truc":
        return {"id": oid, "kind": "he_truc", "pts": []}
    raise LoiDung("KG_THIEU_DAC_TA", "loại khối lạ")


def _khoi(L, o, oid):
    h = str(o.get("hinh") or "")
    if h not in HINH_KHOI:
        raise LoiDung("KG_KHOI_LOI", "hình khối '%s' lạ" % h, "chọn " + " | ".join(HINH_KHOI))
    truc = chuan(_v3(o["truc"])) if o.get("truc") else (0.0, 0.0, 1.0)
    u, v = _vuong_goc(truc)
    mat, canh, vien, pts, ten = [], [], [], [], []
    if h in ("tru", "non", "cau"):
        tam = L.P(o.get("tam") or o.get("day_tam"), oid) if (o.get("tam") or o.get("day_tam")) else (0.0, 0.0, 0.0)
        r = _so(o.get("ban_kinh"), oid + ".ban_kinh")
        if r <= 0:
            raise LoiDung("KG_KHOI_LOI", "bán kính phải > 0")
    if h == "tru" or h == "non":
        cao = _so(o.get("cao"), oid + ".cao")
        n = N_TRU
        day = [cong(tam, cong(nhan(u, r * math.cos(2 * math.pi * k / n)), nhan(v, r * math.sin(2 * math.pi * k / n)))) for k in range(n)]
        pts += day
        if h == "tru":
            tren = [cong(p, nhan(truc, cao)) for p in day]
            pts += tren
            for k in range(n):
                mat.append(("d%d" % k, "d%d" % ((k + 1) % n), "t%d" % ((k + 1) % n), "t%d" % k))
            mat.append(tuple("d%d" % k for k in range(n))[::-1])
            mat.append(tuple("t%d" % k for k in range(n)))
            for k in range(n):
                canh.append(("d%d" % k, "d%d" % ((k + 1) % n)))
                canh.append(("t%d" % k, "t%d" % ((k + 1) % n)))
                vien.append(("d%d" % k, "t%d" % k, (k - 1) % n, k))
            ten = ["d%d" % k for k in range(n)] + ["t%d" % k for k in range(n)]
        else:
            S = cong(tam, nhan(truc, cao))
            pts.append(S)
            for k in range(n):
                mat.append(("d%d" % k, "d%d" % ((k + 1) % n), "S"))
            mat.append(tuple("d%d" % k for k in range(n))[::-1])
            for k in range(n):
                canh.append(("d%d" % k, "d%d" % ((k + 1) % n)))
                vien.append(("d%d" % k, "S", (k - 1) % n, k))
            ten = ["d%d" % k for k in range(n)] + ["S"]
    elif h == "cau":
        nk, nv = N_CAU
        ten, pts = [], []
        for i in range(1, nv):
            phi = math.pi * i / nv
            for k in range(nk):
                th = 2 * math.pi * k / nk
                ten.append("v%d_%d" % (i, k))
                pts.append(cong(tam, cong(nhan(truc, r * math.cos(phi)), cong(nhan(u, r * math.sin(phi) * math.cos(th)), nhan(v, r * math.sin(phi) * math.sin(th))))))
        ten += ["N", "S"]
        pts += [cong(tam, nhan(truc, r)), cong(tam, nhan(truc, -r))]
        chi = {}
        for k in range(nk):
            mat.append(("N", "v1_%d" % ((k + 1) % nk), "v1_%d" % k))
            chi[("N", "v1_%d" % k)] = len(mat) - 1
        for i in range(1, nv - 1):
            for k in range(nk):
                mat.append(("v%d_%d" % (i, k), "v%d_%d" % (i, (k + 1) % nk), "v%d_%d" % (i + 1, (k + 1) % nk), "v%d_%d" % (i + 1, k)))
        for k in range(nk):
            mat.append(("S", "v%d_%d" % (nv - 1, k), "v%d_%d" % (nv - 1, (k + 1) % nk)))
        # cạnh viền: mọi cạnh lưới kèm 2 mặt kề (đường viền = cạnh giữa mặt trước / mặt sau)
        ke = {}
        for fi, f in enumerate(mat):
            for j in range(len(f)):
                e = tuple(sorted((f[j], f[(j + 1) % len(f)])))
                ke.setdefault(e, []).append(fi)
        for e, fs in ke.items():
            if len(fs) == 2:
                vien.append((e[0], e[1], fs[0], fs[1]))
        if o.get("luoi"):
            xich = nv // 2
            for k in range(nk):
                canh.append(("v%d_%d" % (xich, k), "v%d_%d" % (xich, (k + 1) % nk)))
            for k0 in (0, nk // 4):
                ds = ["N"] + ["v%d_%d" % (i, k0) for i in range(1, nv)] + ["S"] + ["v%d_%d" % (i, k0 + nk // 2) for i in range(nv - 1, 0, -1)]
                canh += [(ds[j], ds[(j + 1) % len(ds)]) for j in range(len(ds))]
    else:  # hop | lang_tru | chop (đa diện)
        if h == "hop":
            g = L.P(o.get("goc"), oid) if o.get("goc") else (0.0, 0.0, 0.0)
            kt = o.get("kich_thuoc") or [1, 1, 1]
            dx, dy, dz = (_so(x, oid + ".kich_thuoc") for x in kt)
            day = [g, cong(g, (dx, 0, 0)), cong(g, (dx, dy, 0)), cong(g, (0, dy, 0))]
            vec = (0.0, 0.0, dz)
        else:
            day = [L.P(x, oid) for x in (o.get("day") or [])]
            if len(day) < 3:
                raise LoiDung("KG_KHOI_LOI", "%s cần 'day' >= 3 điểm" % h)
            if h == "lang_tru":
                vec = L.vec(o.get("vec"), oid) if o.get("vec") else nhan(truc, _so(o.get("cao"), oid + ".cao"))
        n = len(day)
        pts += day
        ten = ["d%d" % k for k in range(n)]
        if h == "chop":
            S = L.P(o.get("dinh"), oid) if o.get("dinh") else cong(tuple(sum(p[i] for p in day) / n for i in range(3)), nhan(truc, _so(o.get("cao"), oid + ".cao")))
            pts.append(S)
            ten.append("S")
            mat.append(tuple(ten[:n])[::-1])
            for k in range(n):
                mat.append(("d%d" % k, "d%d" % ((k + 1) % n), "S"))
                canh += [("d%d" % k, "d%d" % ((k + 1) % n)), ("d%d" % k, "S")]
        else:
            tren = [cong(p, vec) for p in day]
            pts += tren
            ten += ["t%d" % k for k in range(n)]
            mat.append(tuple("d%d" % k for k in range(n))[::-1])
            mat.append(tuple("t%d" % k for k in range(n)))
            for k in range(n):
                mat.append(("d%d" % k, "d%d" % ((k + 1) % n), "t%d" % ((k + 1) % n), "t%d" % k))
                canh += [("d%d" % k, "d%d" % ((k + 1) % n)), ("t%d" % k, "t%d" % ((k + 1) % n)), ("d%d" % k, "t%d" % k)]
    # tên đỉnh hiển thị (đa diện) — `dinh_ten`: ["A","B","C","D","A'",...] theo thứ tự đáy rồi nắp / đỉnh chóp
    dinh_ten = [str(x) for x in (o.get("dinh_ten") or [])]
    return {"id": oid, "kind": "khoi", "hinh": h, "ten": ten, "pts": pts, "mat": mat, "canh": canh, "vien": vien,
            "dinh_ten": dinh_ten, "mau": _mau(o, "trang"), "to": bool(o.get("to", h in ("tru", "non", "cau")))}


def _cong(L, o, oid):
    h = str(o.get("hinh") or "")
    n = N_CONG
    if h in ("tron", "cung", "elip"):
        tam = L.P(o.get("tam"), oid) if o.get("tam") else (0.0, 0.0, 0.0)
        ph = chuan(_v3(o["phap"])) if o.get("phap") else (0.0, 0.0, 1.0)
        u, v = _vuong_goc(ph)
        a = _so(o.get("ban_kinh") or o.get("a"), oid + ".ban_kinh")
        b = _so(o.get("b"), oid + ".b") if h == "elip" else a
        g0, g1 = (math.radians(_so(o.get("goc_dau", 0))), math.radians(_so(o.get("goc_cuoi", 180)))) if h == "cung" else (0.0, 2 * math.pi)
        kin = h != "cung"
        m = n if kin else n // 2 + 1
        pts = [cong(tam, cong(nhan(u, a * math.cos(g0 + (g1 - g0) * k / (m if kin else m - 1))), nhan(v, b * math.sin(g0 + (g1 - g0) * k / (m if kin else m - 1))))) for k in range(m)]
    elif h in ("parabol", "quy_dao"):
        A, B = L.P(o.get("tu"), oid), L.P(o.get("den"), oid)
        cao = _so(o.get("cao", 0.3 * kc(A, B)), oid + ".cao")
        up = chuan(_v3(o["len"])) if o.get("len") else (0.0, 0.0, 1.0)
        pts = [cong(noi(A, B, k / (n - 1)), nhan(up, 4 * cao * (k / (n - 1)) * (1 - k / (n - 1)))) for k in range(n)]
        kin = False
    else:
        raise LoiDung("KG_THIEU_DAC_TA", "đường cong '%s' lạ" % h, "chọn tron | cung | parabol | elip | quy_dao")
    return {"id": oid, "kind": "cong", "pts": pts, "kin": kin, "mau": _mau(o, "ngoc"), "nhan": str(o.get("nhan") or "")}


def _mat(L, o, oid):
    h = str(o.get("hinh") or "da_giac")
    if h == "san_oxy":
        return {"id": oid, "kind": "mat", "san": True, "mau": _mau(o, "cyan"), "pts": [], "z": _so(o.get("z", 0))}
    if h in ("da_giac", "mat_phang"):
        ds = [L.P(x, oid) for x in (_tach(o.get("diem")) if isinstance(o.get("diem"), str) else o.get("diem") or [])]
        if len(ds) < 3:
            raise LoiDung("KG_THIEU_DAC_TA", "mặt cần >= 3 điểm")
        if h == "mat_phang":   # tứ giác lớn trong mặt phẳng qua 3 điểm (giãn 1,35 lần quanh trọng tâm)
            g = tuple(sum(p[i] for p in ds) / len(ds) for i in range(3))
            n = chuan(cheo(tru(ds[1], ds[0]), tru(ds[2], ds[0])))
            u, v = _vuong_goc(n)
            R = 1.35 * max(kc(p, g) for p in ds)
            ds = [cong(g, cong(nhan(u, R * sx), nhan(v, R * sy))) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        return {"id": oid, "kind": "mat", "san": False, "mau": _mau(o, "vang"), "pts": ds, "ten": _tach(o.get("diem")) if isinstance(o.get("diem"), str) else []}
    raise LoiDung("KG_THIEU_DAC_TA", "mặt '%s' lạ" % h, "chọn san_oxy | mat_phang | da_giac")


# ---------------- xuất cảnh (đơn vị cảnh: đường chéo khung ~ 4) ----------------
def _xuat(L, tat, hkg, ht):
    pts = [p for r in tat for p in r.get("pts", [])] + list(L.D.values())
    co_truc = str(ht.get("loai") or "").lower() in ("oxyz", "oxy")
    if co_truc:
        pts.append((0.0, 0.0, 0.0))
    xs = [[p[i] for p in pts] for i in range(3)]
    lo = [min(x) for x in xs]
    hi = [max(x) for x in xs]
    cheo_ = max(1e-6, math.sqrt(sum((hi[i] - lo[i]) ** 2 for i in range(3))))
    S = 4.0 / cheo_
    sc = lambda p: [round(c * S, 6) for c in p]  # noqa: E731
    diem, doan, kinh, khoiDs, nhanTu, chuyen = {}, [], [], [], [], []
    mauDiem, nhanTen, bangMau = {}, {}, {}
    for t, p in L.D.items():
        diem[t] = sc(p)
    nhan_ds = [t for t in L.D if not t.startswith("_")]
    da_doan = set()

    nhom_nay = [None]

    def doan_add(a, b, vai, id_, mau=None, mui=None, dut=False):
        k = (min(a, b), max(a, b), vai)
        if a == b or k in da_doan:
            return
        da_doan.add(k)
        x = {"id": id_, "a": a, "b": b, "vai": vai}
        if nhom_nay[0]:
            x["nhom"] = nhom_nay[0]
        if mau:
            x["mau"] = mau
        if mui:
            x["mui"] = mui
        if dut:
            x["dut"] = True
        doan.append(x)
    R_canh = 0.06 * 4.0
    for r in tat:
        k = r["kind"]
        nhom_nay[0] = r["id"]
        if k == "khoi":
            loai_cong = r["hinh"] in ("tru", "non", "cau")
            ten_map = {}
            for j, (t, p) in enumerate(zip(r["ten"], r["pts"])):
                nt = r["dinh_ten"][j] if j < len(r["dinh_ten"]) and r["dinh_ten"][j] else "_%s_%s" % (r["id"], t)
                diem[nt] = sc(p)
                ten_map[t] = nt
                if not nt.startswith("_") and nt not in nhan_ds:
                    nhan_ds.append(nt)
            mat = [[ten_map[x] for x in f] for f in r["mat"]]
            canh = [[ten_map[a], ten_map[b]] for a, b in r["canh"]]
            vien = [[ten_map[a], ten_map[b], fi, fj] for a, b, fi, fj in r["vien"]]
            khoiDs.append({"id": r["id"], "loai": r["hinh"], "dinh": [ten_map[t] for t in r["ten"]], "mat": mat, "canh": canh,
                           "vien": vien, "cong": loai_cong, "mau": r["mau"], "to": r["to"]})
            for a, b in canh:
                doan_add(a, b, "luoi" if r["hinh"] == "cau" else "khoi", "%s:%s%s" % (r["id"], a, b), mau=r["mau"])
            if r["id"] and _tach(r["id"]) == [r["id"]]:
                bangMau[r["id"]] = r["mau"]
        elif k == "doan":
            ta, tb = _ten_hoac_moi(diem, L, r["a"], r["ten"][0] if r["ten"] else None, sc, r["id"] + "_a"), _ten_hoac_moi(diem, L, r["b"], r["ten"][1] if len(r["ten"]) > 1 and r["kieu"] != "tia" else None, sc, r["id"] + "_b")
            if r["kieu"] == "gion":
                # đường gióng kích thước: lệch song song ra ngoài + 2 đường dóng mảnh + nhãn số đo ở giữa
                d = tru(r["b"], r["a"])
                if r.get("lech"):
                    lech = chuan(_v3(r["lech"]))
                else:
                    lech = chuan(cheo(d, (0, 0, 1))) if dai(cheo(d, (0, 0, 1))) > 1e-9 else (1.0, 0.0, 0.0)
                    gt = tuple(sum(p[i] for p in pts) / len(pts) for i in range(3))
                    if cham(lech, tru(noi(r["a"], r["b"], 0.5), gt)) < 0:
                        lech = nhan(lech, -1)
                kc_l = 0.09 * cheo_
                ga, gb = cong(r["a"], nhan(lech, kc_l)), cong(r["b"], nhan(lech, kc_l))
                na, nb = "_%s_ga" % r["id"], "_%s_gb" % r["id"]
                diem[na], diem[nb] = sc(ga), sc(gb)
                doan_add(ta, na, "gion_phu", r["id"] + "#da", mau=r["mau"])
                doan_add(tb, nb, "gion_phu", r["id"] + "#db", mau=r["mau"])
                doan_add(na, nb, "gion", r["id"], mau=r["mau"], mui="hai")
                if r["nhan"]:
                    nhanTu.append({"id": r["id"] + "#n", "tex": r["nhan"], "p": sc(cong(noi(ga, gb, 0.5), nhan(lech, 0.05 * cheo_))), "mau": r["mau"], "hien": r["id"]})
            else:
                vai = {"vector": "vector", "tia": "phu"}.get(r["kieu"], "dich" if r["mau"] != MAU["trang"] else "phu")
                doan_add(ta, tb, vai, r["id"], mau=r["mau"], mui="cuoi" if r["kieu"] in ("vector", "tia") else None)
                if r["nhan"]:
                    nhanTu.append({"id": r["id"] + "#n", "tex": r["nhan"], "p": sc(noi(r["a"], r["b"], 0.5)), "mau": r["mau"], "hien": r["id"]})
            if r["ten"] and len(r["ten"]) == 2 and r["kieu"] != "gion":   # đường gióng chỉ là số đo, không khóa màu tên đoạn
                bangMau["".join(r["ten"])] = r["mau"]
        elif k == "cong":
            ten = []
            for j, p in enumerate(r["pts"]):
                t = "_%s_%d" % (r["id"], j)
                diem[t] = sc(p)
                ten.append(t)
            m = len(ten)
            for j in range(m if r["kin"] else m - 1):
                doan_add(ten[j], ten[(j + 1) % m], "cong", "%s#%d" % (r["id"], j), mau=r["mau"])
            if r["nhan"]:
                nhanTu.append({"id": r["id"] + "#n", "tex": r["nhan"], "p": sc(r["pts"][m // 3]), "mau": r["mau"], "hien": r["id"]})
        elif k == "mat":
            if r["san"]:
                xs2 = [p[0] for p in pts] + [0.0]
                ys2 = [p[1] for p in pts] + [0.0]
                mx, Mx, my, My = min(xs2), max(xs2), min(ys2), max(ys2)
                # sàn gần vuông quanh hình (cảnh nằm trong một mặt đứng vẫn có chiều sâu sàn), lề 12 %
                rong = max(Mx - mx, My - my, 1e-6)
                ex, ey = 0.12 * rong + (rong - (Mx - mx)) / 2, 0.12 * rong + (rong - (My - my)) / 2
                z = r["z"]
                kinh.append({"id": r["id"], "ten": "(Oxy)", "diem": [], "da_giac": [sc((mx - ex, my - ey, z)), sc((Mx + ex, my - ey, z)), sc((Mx + ex, My + ey, z)), sc((mx - ex, My + ey, z))],
                             "bung": None, "mau": r["mau"], "san": True})
            else:
                kinh.append({"id": r["id"], "ten": r["id"], "diem": r.get("ten") or [], "da_giac": [sc(p) for p in r["pts"]], "bung": None, "mau": r["mau"]})
        elif k == "diem":
            t = r["ten"]
            if t not in nhan_ds:
                nhan_ds.append(t)
            mauDiem[t] = r["mau"]
            if r["nhan"] and r["nhan"] != t:
                nhanTen[t] = r["nhan"]
            if not r.get("_trang_tri"):
                bangMau[t] = r["mau"]
            cd = r.get("cd")
            if cd:
                theo = str(cd.get("theo") or "")
                duong = _duong_theo(L, tat, theo, sc)
                if duong:
                    chuyen.append({"diem": t, "duong": duong, "giay": float(cd.get("giay") or 3.2), "khi_noi": str(cd.get("khi_noi") or ""), "id": r["id"]})
    # ---- hệ trục ----
    nhom_truc = next((r["id"] for r in tat if r["kind"] == "he_truc"), "truc")
    nhom_nay[0] = nhom_truc
    if co_truc:
        dv = str(ht.get("don_vi") or "")
        O = (0.0, 0.0, 0.0)
        diem.setdefault("O", sc(O))
        if "O" not in nhan_ds:
            nhan_ds.append("O")
        dai_truc = []
        m_max = max(max(hi[i], 0) for i in range(3)) * 1.22 + 0.06 * cheo_
        diem_ten = [p for t, p in L.D.items() if not t.startswith("_")]
        for i, ten_t in enumerate("xyz"):
            if ten_t == "z" and str(ht.get("loai")).lower() == "oxy":
                continue
            m = max(max(hi[i], 0) * 1.22 + 0.06 * cheo_, 0.3 * m_max)   # trục ngắn (cảnh nằm trong một mặt) vẫn đủ dài để đọc
            dai_truc.append(m)
            tip = [0.0, 0.0, 0.0]
            tip[i] = m
            nt = "_truc_%s" % ten_t
            diem[nt] = sc(tip)
            doan_add("O", nt, "truc", "truc_" + ten_t, mui="cuoi")
            nhanTu.append({"id": "nhan_truc_" + ten_t, "tex": ten_t, "p": sc([c * 1.07 for c in tip]), "mau": "#C9D2DE", "co": 30})
            vach = float(ht.get("vach") or 0)
            if vach > 0 and m / vach <= 12:
                k2 = 1
                while k2 * vach < m * 0.94:
                    a1, a2 = [0.0] * 3, [0.0] * 3
                    a1[i] = a2[i] = k2 * vach
                    j2 = 2 if i < 2 else 0
                    a1[j2], a2[j2] = -0.012 * cheo_, 0.012 * cheo_
                    n1, n2 = "_v%s%d_1" % (ten_t, k2), "_v%s%d_2" % (ten_t, k2)
                    diem[n1], diem[n2] = sc(a1), sc(a2)
                    doan_add(n1, n2, "truc_vach", "vach_%s%d" % (ten_t, k2))
                    p_vach = [0.0] * 3
                    p_vach[i] = k2 * vach
                    trung = any(kc(p_vach, q) < 1e-6 * (1 + cheo_) for q in diem_ten)   # vạch trùng điểm có tên (H, A) -> không ghi số đè nhãn
                    co_so = any(abs(q[i]) > 1e-9 for q in diem_ten)   # trục không có điểm dữ kiện nào lệch theo nó -> không ghi số
                    if co_so and not trung and k2 % max(1, int(math.ceil((m / vach) / 4))) == 0:
                        p = [0.0] * 3
                        p[i] = k2 * vach
                        p[j2] = -0.045 * cheo_
                        nhanTu.append({"id": "so_%s%d" % (ten_t, k2), "tex": _so_gon(k2 * vach), "p": sc(p), "mau": "#8A94A6", "co": 22})
                    k2 += 1
        if ht.get("huong"):
            m = max(dai_truc or [1]) * 0.86
            for tex, p in (("B", (0, m, 0)), ("N", (0, -m * 0.55, 0)), ("Đ", (m, 0, 0)), ("T", (-m * 0.55, 0, 0))):
                nhanTu.append({"id": "huong_" + tex, "tex": {"B": "Bắc", "N": "Nam", "Đ": "Đông", "T": "Tây"}[tex], "p": sc(p), "mau": "#7C8696", "co": 22, "chu": True})
    nhom_nay[0] = None
    for x in nhanTu:
        if x["id"].startswith(("nhan_truc_", "so_", "huong_", "don_vi")):
            x.setdefault("hien", nhom_truc)
    goc = []
    for g in hkg.get("goc") or []:
        if isinstance(g, dict) and all(x in diem for x in [g.get("dinh")] + _tach(g.get("canh"))[:2]):
            hai = _tach(g.get("canh"))
            goc.append({"id": str(g.get("id") or "goc_" + g["dinh"] + "".join(hai)), "dinh": g["dinh"], "a": hai[0], "b": hai[1], "vuong": bool(g.get("vuong")), "nhan": str(g.get("nhan") or "")})
    for d in hkg.get("doan") or []:   # đoạn phụ khai báo kiểu v97 ("AB'", {"doan": "MB", "vai": "dich"})
        xy = _tach(d.get("doan") if isinstance(d, dict) else d)
        if len(xy) == 2 and all(x in diem for x in xy):
            doan_add(xy[0], xy[1], str(d.get("vai") or "phu") if isinstance(d, dict) else "phu", (d.get("id") if isinstance(d, dict) else None) or "".join(xy),
                     mau=_mau(d, "trang") if isinstance(d, dict) and d.get("mau") else None)
    khoi0 = khoiDs[0] if khoiDs and not khoiDs[0]["cong"] else None
    ra = {"diem": diem, "khoi": {"loai": khoi0["loai"] if khoi0 else "lego", "dinh": khoi0["dinh"] if khoi0 else [], "mat": khoi0["mat"] if khoi0 else [],
                                 "canh": khoi0["canh"] if khoi0 else []},
          "doan": doan, "kinh": kinh, "goc": goc, "truot": None, "nhan": [t for t in nhan_ds if t in diem],
          "lego": True, "khoiDs": khoiDs, "nhanTu": nhanTu, "nhanTen": nhanTen, "mauDiem": mauDiem, "chuyenDs": chuyen,
          "bangMau": bangMau, "tiLe": round(1.0 / S, 9), "heTruc": str(ht.get("loai") or "") if co_truc else ""}
    return ra


def _so_gon(x):
    return ("%d" % x) if abs(x - round(x)) < 1e-9 else ("%.2f" % x).rstrip("0").replace(".", "{,}")


def _ten_hoac_moi(diem, L, p, ten, sc, moi):
    if ten and ten in diem:
        return ten
    diem["_" + moi] = sc(p)
    return "_" + moi


def _duong_theo(L, tat, theo, sc):
    for r in tat:
        if r["id"] == theo:
            if r["kind"] == "cong":
                return [sc(p) for p in r["pts"]]
            if r["kind"] == "doan":
                return [sc(r["a"]), sc(r["b"])]
    ds = _tach(theo)
    if len(ds) == 2 and all(x in L.D for x in ds):
        return [sc(L.D[ds[0]]), sc(L.D[ds[1]])]
    return None
