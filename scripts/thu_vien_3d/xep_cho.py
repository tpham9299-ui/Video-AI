"""Bộ xếp chỗ tất định: dac_ta_canh (ngữ nghĩa) -> kế hoạch Blender {loai:"dac_ta", chi_tiet, doan_toan, ...}.

AI không bao giờ đưa tọa độ: kích thước lấy từ đề hoặc kích thước thật của mẫu,
vị trí suy từ quan hệ (xep_hang, luoi, tren, trong, canh, cach, dua_vao).
"""

import json
import math
import re
from pathlib import Path

from .khop import DANH_MUC, bo_dau, chuan, khop_mau_sac, khop_moi_truong, khop_vat, mau_theo_lop
from .vat import dat_vao, dung_tu_bo_phan, dung_vat, hop_bao

DV = {"km": 1000.0, "m": 1.0, "dm": 0.1, "cm": 0.01, "mm": 0.001}
HIEN_TOI_DA = 30          # số bản sao dựng tối đa cho mỗi thực thể (số thật vẫn giữ trong lời đọc)
THU_MUC_SINH = Path(__file__).with_name("sinh")
HUONG_MAY = {"toan_canh": [0.64, -1.45, 1.04], "trung": [0.6, -1.5, 0.85], "can": [0.55, -1.55, 0.7],
             "tu_tren": [0.25, -0.6, 1.7], "ngang": [0.45, -1.6, 0.32], "theo_vat": [0.64, -1.45, 1.04]}
HINH_AI = ("hop", "tru", "cau", "non", "lang_tru", "khoi_tiet_dien")


class LoiDacTa(ValueError):
    pass


class ThieuMau(LoiDacTa):
    def __init__(self, the):
        self.the = the
        super().__init__(f"Thực thể chính '{the.get('ten')}' ({the.get('id')}) chưa có mẫu 3D trong thư viện")


def met(v):
    return float(v["gt"]) * DV[v["dv"]]


def khoa_sinh(the):
    return re.sub(r"[^a-z0-9]+", "_", bo_dau(the.get("ten") or the.get("id"))).strip("_")[:60] or "vat"


def doc_sinh(the):
    path = THU_MUC_SINH / (khoa_sinh(the) + ".json")
    if path.exists():
        try:
            asset = json.loads(path.read_text(encoding="utf8"))
            if bo_phan_hop_le(asset.get("bo_phan")) is None:
                return asset
        except (OSError, ValueError):
            pass
    return None


def bo_phan_hop_le(parts):
    """Kiểm bản ghép AI trong khung chuẩn [-.5,.5]x[-.5,.5]x[0,1]. Trả None nếu hợp lệ, ngược lại là lỗi."""
    def so(v):
        return type(v) in (int, float) and math.isfinite(v)

    def ba(v):
        return isinstance(v, list) and len(v) == 3 and all(map(so, v))

    if not isinstance(parts, list) or not 1 <= len(parts) <= 40:
        return "bo_phan cần 1–40 phần"
    lo, hi = [9.0] * 3, [-9.0] * 3
    for i, p in enumerate(parts, 1):
        if not isinstance(p, dict) or p.get("hinh") not in HINH_AI:
            return f"bo_phan[{i}] sai hình (chỉ {', '.join(HINH_AI)})"
        if not ba(p.get("tam")) or not ba(p.get("co")) or min(p["co"]) <= 0 or max(p["co"]) > 1.2:
            return f"bo_phan[{i}] cần tam/co ba số, co trong (0; 1,2]"
        if not ba(p.get("xoay", [0, 0, 0])) or not isinstance(p.get("vat_lieu", "chinh"), str):
            return f"bo_phan[{i}] sai xoay/vat_lieu"
        if p["hinh"] == "khoi_tiet_dien":
            t = p.get("tang")
            if not (isinstance(t, list) and 2 <= len(t) <= 16 and all(isinstance(r, list) and len(r) == 5 and all(map(so, r)) and min(r[3:]) > 0 for r in t)
                    and all(a[0] < b[0] for a, b in zip(t, t[1:]))):
                return f"bo_phan[{i}].tang sai"
        if p["hinh"] == "lang_tru":
            d = p.get("day")
            if not (isinstance(d, list) and 3 <= len(d) <= 24 and all(isinstance(q, list) and len(q) == 2 and all(map(so, q)) for q in d)):
                return f"bo_phan[{i}].day sai"
        for k in range(3):
            lo[k] = min(lo[k], p["tam"][k] - p["co"][k] / 2)
            hi[k] = max(hi[k], p["tam"][k] + p["co"][k] / 2)
    if min(lo[:2]) < -0.65 or max(hi[:2]) > 0.65 or lo[2] < -0.1 or hi[2] > 1.1:
        return "bo_phan vượt khung chuẩn"
    if any(hi[k] - lo[k] < 0.55 for k in range(3)):
        return "bo_phan không phủ đủ khung vật (vật rời rạc / quá nhỏ)"
    # Mỗi phần phải chạm ít nhất một phần khác (không có mảnh lơ lửng).
    if len(parts) > 1:
        boxes = [[(p["tam"][k] - p["co"][k] / 2 - 0.03, p["tam"][k] + p["co"][k] / 2 + 0.03) for k in range(3)] for p in parts]
        for i, a in enumerate(boxes):
            if not any(j != i and all(a[k][0] <= b[k][1] and b[k][0] <= a[k][1] for k in range(3)) for j, b in enumerate(boxes)):
                return f"bo_phan[{i+1}] lơ lửng, không nối với phần nào"
    return None


class BanSao:
    def __init__(self, ten_id, the, k, mau_tv, co, mau, ts, bo_phan):
        self.ten_id, self.the, self.k = ten_id, the, k
        self.mau_tv, self.co, self.mau, self.ts, self.bo_phan = mau_tv, co, mau, ts, bo_phan
        self.vi_tri = [0.0, 0.0, 0.0]   # tâm đáy
        self.xoay = 0.0

    def bao_danh_nghia(self):
        """Hộp bao theo kích thước của đề (đo số liệu, lòng vật chứa) -- không tính phần thò ra như van, tay người."""
        w, d, h = self.co
        if abs(math.sin(math.radians(self.xoay))) > 0.7:
            w, d = d, w
        x, y, z = self.vi_tri
        return [x - w / 2, y - d / 2, z], [x + w / 2, y + d / 2, z + h]

    def _local(self):
        key = (tuple(self.co), self.mau)
        if getattr(self, "_khoa", None) != key:
            self._khoa = key
            self._bp = (dung_tu_bo_phan(self.bo_phan, self.co, self.mau) if self.bo_phan
                        else dung_vat(self.mau_tv, self.co, self.mau, self.ts))
        return self._bp

    def bao(self):
        """Hộp bao THẾ GIỚI từ mọi bộ phận thật (tính cả xoay): tay người, van bồn, vạt bìa đều được kể."""
        lo, hi = hop_bao(dat_vao(self._local(), self.vi_tri, self.xoay))
        lo2, hi2 = self.bao_danh_nghia()
        return [min(lo[k], lo2[k]) for k in range(3)], [max(hi[k], hi2[k]) for k in range(3)]

    def la_nguoi(self):
        return self.mau_tv == "nguoi" or self.the.get("lop") == "nguoi"

    def bo_phan_the_gioi(self):
        out = dat_vao(self._local(), self.vi_tri, self.xoay)
        for p in out:
            p["the"] = self.the["id"]
            p["vai_tro"] = self.the.get("vai_tro", "phu")
            p["ban"] = self.k
        return out


def co_that(the, mau_tv, co_chuan):
    base = list(co_chuan)
    kt = the.get("kich_thuoc") or {}
    given = {}
    for key, v in kt.items():
        m = met(v)
        if key == "dai":
            given[0] = m
        elif key == "rong":
            given[1] = m
        elif key == "cao":
            given[2] = m
        elif key in ("duong_kinh", "ban_kinh"):
            given[0] = given[1] = m * (2 if key == "ban_kinh" else 1)
        elif key == "day":
            given[min(range(3), key=base.__getitem__)] = m
    if not given:
        return base
    ratios = [given[i] / base[i] for i in given if base[i] > 0]
    f = math.exp(sum(map(math.log, ratios)) / len(ratios))
    return [given.get(i, base[i] * f) for i in range(3)]


def so_ban(the):
    n = the.get("so_luong", 1)
    if n == "nhieu":
        n = 4 if the.get("vai_tro") == "trang_tri" else 6
    return int(n)


def mau_ban(the, k, mau_tv):
    m = the.get("mau_sac")
    if isinstance(m, list) and m:
        m = m[(k - 1) % len(m)]
    m = khop_mau_sac(m) if isinstance(m, str) else None
    return m or DANH_MUC["vat"].get(mau_tv, {}).get("mau", "da")


def tach_ref(ref):
    m = re.fullmatch(r"([a-z][a-z0-9_]*)(?:#(\d+))?", str(ref or ""))
    return (m[1], int(m[2]) if m[2] else None) if m else (None, None)


def xep_cum(items, kieu, so_cot=None, khoang=None, huong="ngang"):
    """Xếp các bản sao của một thực thể quanh gốc (0,0): hàng ngang, hàng dọc (theo chiều sâu) hoặc lưới."""
    if not items:
        return
    for it in items:
        # Xe đỗ thành hàng: đặt song song nhau (đầu xe hướng về máy), không nối đuôi nhau.
        if it.the.get("lop") == "phuong_tien" and huong != "doc" and it.co[0] > it.co[1] * 1.6:
            it.xoay = 90.0
    sizes = [(lambda b: (b[1][0] - b[0][0], b[1][1] - b[0][1]))(i.bao()) for i in items]
    w = max(x for x, _ in sizes)
    d = max(y for _, y in sizes)
    gap = khoang if khoang is not None else max(0.25 * min(w, d), 0.02)
    n = len(items)
    if huong == "doc" and kieu != "luoi":
        cols = 1
    elif kieu == "luoi" or (kieu is None and n > 8):
        cols = min(n, so_cot or math.ceil(math.sqrt(n * 1.6)))
    else:
        cols = n
    rows = math.ceil(n / cols)
    for idx, it in enumerate(items):
        r, c = divmod(idx, cols)
        it.vi_tri = [(c - (cols - 1) / 2) * (w + gap), ((rows - 1) / 2 - r) * (d + gap), 0.0]


def dich(items, dx, dy, dz=0.0):
    for it in items:
        it.vi_tri = [it.vi_tri[0] + dx, it.vi_tri[1] + dy, it.vi_tri[2] + dz]


def bao_nhom(items):
    b = [i.bao() for i in items]
    return ([min(x[0][k] for x in b) for k in range(3)], [max(x[1][k] for x in b) for k in range(3)])


def dat_ben_trong(con, cha, troi_noi):
    """Đặt các bản sao `con` vào lòng các bản sao `cha` (chia đều), thu nhỏ nếu không vừa."""
    canh_bao = []
    for j, parent in enumerate(cha):
        group = con[j::len(cha)]
        if not group:
            continue
        lo, hi = parent.bao_danh_nghia()
        iw, idp, ih = (hi[0] - lo[0]) * 0.78, (hi[1] - lo[1]) * 0.78, (hi[2] - lo[2]) * 0.85
        w, d, h = (max(i.co[k] for i in group) for k in range(3))
        per_row = max(1, int(iw // (w * 1.08)))
        per_col = max(1, int(idp // (d * 1.08)))
        layers = math.ceil(len(group) / (per_row * per_col))
        f = 1.0
        if layers * h > ih and not troi_noi:
            f = min(1.0, (ih / (layers * h)) ** (1 / 3))
        if f < 0.999:
            canh_bao.append(f"thu nhỏ '{group[0].the['ten']}' {f:.2f} lần để vừa trong '{parent.the['ten']}'")
            for i in group:
                i.co = [c * f for c in i.co]
            w, d, h = w * f, d * f, h * f
            per_row = max(1, int(iw // (w * 1.08)))
            per_col = max(1, int(idp // (d * 1.08)))
        cx, cy = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2
        base = lo[2] + (hi[2] - lo[2]) * 0.06
        for idx, it in enumerate(group):
            layer, rest = divmod(idx, per_row * per_col)
            r, c = divmod(rest, per_row)
            cols = min(per_row, len(group))
            rows_here = min(per_col, math.ceil(len(group) / per_row))
            x = cx + (c - (cols - 1) / 2) * w * 1.08
            y = cy + (r - (rows_here - 1) / 2) * d * 1.08
            if troi_noi:
                z = base + (hi[2] - lo[2]) * (0.2 + 0.45 * ((idx * 0.618) % 1))
                x += (((idx * 0.37) % 1) - 0.5) * w * 0.4
            else:
                z = base + layer * h
            it.vi_tri = [x, y, z]
            it.xoay = (idx * 47) % 360 if troi_noi else 0.0
    return canh_bao


def dat_tren(con, cha):
    for j, parent in enumerate(cha):
        group = con[j::len(cha)]
        if not group:
            continue
        lo, hi = parent.bao()
        cx, cy = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2
        xep_cum(group, None, khoang=None)
        glo, ghi = bao_nhom(group)
        dich(group, cx - (glo[0] + ghi[0]) / 2, cy - (glo[1] + ghi[1]) / 2, hi[2])


HANG = {"chinh": 0, "phu": 1, "trang_tri": 2}


def khoang_an_toan(a, b):
    """Khoảng trống tối thiểu giữa hai cụm theo X/Y: 10% cạnh ngang nhỏ hơn, có người thì >= 0,15 m."""
    def ngang(items):
        lo, hi = bao_nhom(items)
        return min(hi[0] - lo[0], hi[1] - lo[1])
    gap = max(0.1 * min(ngang(a), ngang(b)), 0.01)
    if any(i.la_nguoi() for i in a + b):
        gap = max(gap, 0.15)
    return gap


def giao_nhau(a, b):
    """Độ xuyên (X, Y) giữa hai cụm, đã cộng khoảng an toàn; số dương ở cả hai trục = va chạm."""
    gap = khoang_an_toan(a, b)
    alo, ahi = bao_nhom(a)
    blo, bhi = bao_nhom(b)
    return [min(ahi[k], bhi[k]) + gap - max(alo[k], blo[k]) for k in range(2)]


def tach_va_cham(cum, canh_bao, so_vong=40):
    """Đẩy các cụm đứng trên đất ra xa nhau cho tới khi hộp bao X/Y (cộng khoảng an toàn) không giao nhau.
    Cụm ưu tiên thấp hơn (phụ < chính) bị đẩy; hướng đẩy = trục xuyên ít nhất, ra phía ngoài cụm kia."""
    da_bao = set()
    for _ in range(so_vong):
        doi = False
        for i in range(len(cum)):
            for j in range(i + 1, len(cum)):
                (ta, a), (tb, b) = cum[i], cum[j]
                pen = giao_nhau(a, b)
                if min(pen) <= 1e-9:
                    continue
                dong, dung = (b, a) if HANG[tb["vai_tro"]] >= HANG[ta["vai_tro"]] else (a, b)
                k = 0 if pen[0] <= pen[1] * 1.5 else 1   # ưu tiên tách ngang (máy nhìn từ phía trước)
                dlo, dhi = bao_nhom(dong)
                slo, shi = bao_nhom(dung)
                huong = 1 if (dlo[k] + dhi[k]) >= (slo[k] + shi[k]) else -1
                d = pen[k] + 1e-6
                dich(dong, d * huong if k == 0 else 0.0, d * huong if k == 1 else 0.0)
                key = tuple(sorted((ta["id"], tb["id"])))
                if key not in da_bao:
                    da_bao.add(key)
                    canh_bao.append(f"tách va chạm '{ta['ten']}' / '{tb['ten']}' ({d:.2f} m theo {'X' if k == 0 else 'Y'})")
                doi = True
        if not doi:
            return
    canh_bao.append(f"tách va chạm: chưa hội tụ sau {so_vong} vòng")


def nguoi_thua(kb, spec, the):
    """Nhân vật không đóng vai trò trực quan: không phải vật chính, không có hành động / tiêu điểm / số liệu, và
    (đề không nhắc tới người đó HOẶC vật chính là đồ nhỏ trên bàn như tấm bìa, thẻ -> người chỉ chen vào khung).
    Bỏ để máy tập trung vào vật chính (bài bồn hóa chất, cắt tấm bìa) thay vì nhét thêm người gây vướng."""
    if the.get("vai_tro") == "chinh" or (the.get("lop") != "nguoi" and khop_vat(the) != "nguoi"):
        return False
    de = chuan(kb.get("de_bai"))
    nhac = any(chuan(x) and chuan(x) in de for x in (the.get("tu_de"), the.get("ten")))
    chinh = [t for t in spec["thuc_the"] if t.get("vai_tro") == "chinh"]
    def cao(t):
        tv = khop_vat(t)
        co = DANH_MUC["vat"][tv]["co"] if tv in DANH_MUC["vat"] else [1, 1, 1]
        kt = t.get("kich_thuoc") or {}
        return max([met(v) for k, v in kt.items() if k in ("cao", "dai", "rong", "duong_kinh")] or [max(co)])
    nho = bool(chinh) and max(map(cao, chinh)) < 0.5
    if nhac and not nho:
        return False
    tid = the["id"]
    for q in spec.get("quay") or []:
        for a in q.get("hanh_dong") or []:
            if a.get("dong_tu") != "dung_yen" and tid in (tach_ref(a.get("vat"))[0], tach_ref((a.get("tham_so") or {}).get("den"))[0]):
                return False
        if any(tach_ref(r)[0] == tid for r in q.get("tieu_diem") or []):
            return False
    if any(re.search(r"(?<![a-z0-9_])" + re.escape(tid) + r"(?![a-z0-9_])", s.get("gan", "")) for s in spec.get("so_lieu") or []):
        return False
    return True


def lap_ke_hoach_dac_ta(kb, quay_canh=None):
    """dac_ta_canh -> kế hoạch Blender. Ném LoiDacTa nếu thực thể chính không dựng được."""
    spec = kb["dac_ta_canh"]
    canh_bao = []
    groups = {}
    order = []
    for the in spec["thuc_the"]:
        if nguoi_thua(kb, spec, the):
            canh_bao.append(f"bỏ nhân vật '{the['ten']}' (không có hành động / vai trò trực quan) -> máy tập trung vật chính")
            continue
        mau_tv = khop_vat(the)
        bo_phan = the.get("bo_phan")
        co_chuan = the.get("co_chuan")
        if bo_phan is not None:
            err = bo_phan_hop_le(bo_phan)
            if err:
                canh_bao.append(f"{the['id']}: bản ghép AI bị loại ({err})")
                bo_phan = None
        if bo_phan is None and mau_tv is None:
            asset = doc_sinh(the)
            if asset:
                bo_phan, co_chuan = asset["bo_phan"], asset.get("co_chuan")
        if bo_phan is None and mau_tv is None:
            if the["vai_tro"] == "chinh":
                raise ThieuMau(the)
            mau_tv = mau_theo_lop(the.get("lop")) if the["vai_tro"] == "phu" else None
            if mau_tv is None:
                canh_bao.append(f"bỏ '{the['ten']}' (chưa có mẫu, vai trò {the['vai_tro']})")
                continue
            canh_bao.append(f"'{the['ten']}' dùng mẫu chung '{mau_tv}' theo lớp {the.get('lop')}")
        if bo_phan is not None:
            co_chuan = co_chuan or [1.0, 1.0, 1.0]
            mau_tv = None
        co = co_that(the, mau_tv, co_chuan if bo_phan is not None else DANH_MUC["vat"][mau_tv]["co"])
        n = so_ban(the)
        if n > HIEN_TOI_DA:
            canh_bao.append(f"'{the['ten']}': dựng {HIEN_TOI_DA}/{n} bản sao (số thật giữ trong lời đọc)")
        ts = dict(the.get("trang_thai") or {})
        items = [BanSao(the["id"] if n == 1 else f"{the['id']}#{k}", the, k, mau_tv, list(co), mau_ban(the, k, mau_tv), ts, bo_phan)
                 for k in range(1, min(n, HIEN_TOI_DA) + 1)]
        groups[the["id"]] = items
        order.append(the)

    def ban_sao(ref):
        tid, k = tach_ref(ref)
        if tid not in groups:
            return None
        items = groups[tid]
        if k is None:
            return items
        return [items[k - 1]] if 1 <= k <= len(items) else None

    rels = []
    for r in spec.get("quan_he") or []:
        b = ban_sao(r.get("b")) if r.get("b") else None
        a = groups.get(tach_ref(r.get("a"))[0])
        # vật không bao giờ đặt trên / trong người (trước đây "người cầm hộp" -> hộp chụp lên đầu người),
        # người không đứng trong vật chứa
        if r["kieu"] in ("trong", "tren") and ((b and b[0].la_nguoi()) or (r["kieu"] == "trong" and a and a[0].la_nguoi())):
            canh_bao.append(f"quan hệ '{r['kieu']}' {r.get('a')} -> {r.get('b')} có người, đổi thành 'canh'")
            r = dict(r, kieu="canh", phia=r.get("phia") or "phai")
        rels.append(r)
    attached = {}
    for r in rels:
        if r["kieu"] in ("trong", "tren") and tach_ref(r.get("a"))[0] in groups and ban_sao(r.get("b")):
            attached[tach_ref(r["a"])[0]] = r

    # 1) xếp từng cụm trên mặt đất
    for the in order:
        tid = the["id"]
        rule = next((r for r in rels if r["kieu"] in ("xep_hang", "luoi") and r.get("vat") == tid), None)
        gap = met(rule["khoang_cach"]) if rule and rule.get("khoang_cach") else None
        xep_cum(groups[tid], rule["kieu"] if rule else None, rule.get("so_cot") if rule else None, gap,
                rule.get("huong", "ngang") if rule else "ngang")

    # 2) đặt các cụm đứng trên đất cạnh nhau: chính ở giữa, phụ hai bên, trang trí phía sau
    placed = []   # (lo, hi)
    do_mep = set()   # cặp thực thể có khoảng cách đo giữa hai mép (không phải tâm)
    ground = [t for t in order if t["id"] not in attached]
    ground.sort(key=lambda t: {"chinh": 0, "phu": 1, "trang_tri": 2}[t["vai_tro"]])
    side = 1
    for the in ground:
        items = groups[the["id"]]
        lo, hi = bao_nhom(items)
        w = hi[0] - lo[0]
        rel_canh = next((r for r in rels if r["kieu"] == "canh" and tach_ref(r.get("a"))[0] == the["id"] and ban_sao(r.get("b"))), None)
        rel_cach = next((r for r in rels if r["kieu"] == "cach" and tach_ref(r.get("a"))[0] == the["id"] and ban_sao(r.get("b"))
                         and r.get("khoang_cach")), None)
        gap = max(0.3 * min(w, hi[1] - lo[1]), 0.08)
        if not placed:
            dich(items, -(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2)
        elif rel_cach:
            ref = ban_sao(rel_cach["b"])
            rlo, rhi = bao_nhom(ref)
            dist = met(rel_cach["khoang_cach"])
            cx = (rlo[0] + rhi[0]) / 2 + dist
            # tâm cách tâm mà hai vật chồng nhau -> đề muốn khoảng cách giữa hai MÉP (người "cách bồn 1 m")
            if cx - (hi[0] - lo[0]) / 2 < rhi[0] + khoang_an_toan(items, ref):
                cx = rhi[0] + dist + (hi[0] - lo[0]) / 2
                do_mep.add(tuple(sorted((the["id"], tach_ref(rel_cach["b"])[0]))))
                canh_bao.append(f"'cach' {the['id']} - {rel_cach['b']}: đo giữa hai mép để không chồng vật")
            dich(items, cx - (lo[0] + hi[0]) / 2, (rlo[1] + rhi[1]) / 2 - (lo[1] + hi[1]) / 2)
        elif rel_canh:
            ref = ban_sao(rel_canh["b"])
            rlo, rhi = bao_nhom(ref)
            phia = rel_canh.get("phia", "phai")
            if phia in ("trai", "phai"):
                s = 1 if phia == "phai" else -1
                x = (rhi[0] + gap - lo[0]) if s > 0 else (rlo[0] - gap - hi[0])
                dich(items, x, (rlo[1] + rhi[1]) / 2 - (lo[1] + hi[1]) / 2)
            else:
                s = 1 if phia == "sau" else -1
                y = (rhi[1] + gap - lo[1]) if s > 0 else (rlo[1] - gap - hi[1])
                dich(items, (rlo[0] + rhi[0]) / 2 - (lo[0] + hi[0]) / 2, y)
        elif the["vai_tro"] == "trang_tri":
            plo = [min(p[0][k] for p in placed) for k in range(2)]
            phi = [max(p[1][k] for p in placed) for k in range(2)]
            dich(items, (plo[0] + phi[0]) / 2 - (lo[0] + hi[0]) / 2, phi[1] + gap * 2 - lo[1])
        else:
            plo = [min(p[0][k] for p in placed) for k in range(2)]
            phi = [max(p[1][k] for p in placed) for k in range(2)]
            x = (phi[0] + gap - lo[0]) if side > 0 else (plo[0] - gap - hi[0])
            dich(items, x, (plo[1] + phi[1]) / 2 - (lo[1] + hi[1]) / 2)
            side = -side
        placed.append(bao_nhom(items))

    # 3) vật nằm trong / trên vật khác
    for the in order:
        r = attached.get(the["id"])
        if not r:
            continue
        con, cha = groups[the["id"]], ban_sao(r["b"])
        if r["kieu"] == "trong":
            troi = the.get("lop") == "dong_vat" and any(c.mau_tv in ("be_tru", "be_hop") for c in cha)
            canh_bao += dat_ben_trong(con, cha, troi)
        else:
            dat_tren(con, cha)

    # 4) dựa vào (thang dựa tường...)
    for r in rels:
        if r["kieu"] != "dua_vao":
            continue
        a, b = ban_sao(r.get("a")), ban_sao(r.get("b"))
        if a and b:
            blo, bhi = bao_nhom(b)
            for it in a:
                it.vi_tri = [0.0, 0.0, 0.0]
                ihi = it.bao()[1]
                it.vi_tri = [blo[0] - ihi[0] - 0.02, (blo[1] + bhi[1]) / 2, 0.0]
            canh_bao.append("dua_vao: đặt sát vật tựa (độ nghiêng dựng ở giai đoạn D)")

    # 4b) kiểm va chạm cuối giữa các cụm đứng trên đất; cụm gắn trong/trên vật khác đi theo vật đỡ
    con_cua = {}
    for tid, r in attached.items():
        con_cua.setdefault(tach_ref(r["b"])[0], []).append(tid)

    def ca_cum(tid, seen=()):
        out = list(groups[tid])
        for c in con_cua.get(tid, []):
            if c not in seen:
                out += ca_cum(c, seen + (tid,))
        return out
    tua = {tach_ref(r["a"])[0] for r in rels if r["kieu"] == "dua_vao"}
    tach_va_cham([(t, ca_cum(t["id"])) for t in ground if t["id"] not in tua], canh_bao)

    every = [i for t in order for i in groups[t["id"]]]
    lo, hi = bao_nhom(every)
    dx, dy = -(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2
    dich(every, dx, dy, -lo[2])
    parts = [p for i in every for p in i.bo_phan_the_gioi()]

    # 5) số liệu -> đoạn đo đặt theo hộp bao danh nghĩa (đúng kích thước của đề)
    doan = []
    for s in spec.get("so_lieu") or []:
        gan = s["gan"]
        if gan.startswith("khoang_cach:"):
            ra, rb = gan.split(":", 1)[1].split(",")
            A, B = ban_sao(ra), ban_sao(rb)
            if not A or not B:
                raise LoiDacTa(f"so_lieu '{gan}' tham chiếu thực thể không có")
            (alo, ahi), (blo, bhi) = A[0].bao_danh_nghia(), B[0].bao_danh_nghia()
            a = [(alo[0] + ahi[0]) / 2, (alo[1] + ahi[1]) / 2, alo[2]]
            b = [(blo[0] + bhi[0]) / 2, (blo[1] + bhi[1]) / 2, blo[2]]
            if tuple(sorted((tach_ref(ra)[0], tach_ref(rb)[0]))) in do_mep:
                a[0], b[0] = (ahi[0], blo[0]) if a[0] <= b[0] else (alo[0], bhi[0])   # đo giữa hai mép đối diện
                b[1] = a[1]
        else:
            ref, dim = gan.rsplit(".", 1)
            A = ban_sao(ref)
            if not A:
                raise LoiDacTa(f"so_lieu '{gan}' tham chiếu thực thể không có")
            blo, bhi = A[0].bao_danh_nghia()
            off = 0.08 * max(bhi[k] - blo[k] for k in range(3))
            if dim == "cao":
                a, b = [bhi[0] + off, blo[1], blo[2]], [bhi[0] + off, blo[1], bhi[2]]
            elif dim == "dai":
                a, b = [blo[0], blo[1] - off, blo[2]], [bhi[0], blo[1] - off, blo[2]]
            elif dim == "rong":
                a, b = [bhi[0] + off, blo[1], blo[2]], [bhi[0] + off, bhi[1], blo[2]]
            else:
                cy = (blo[1] + bhi[1]) / 2
                a, b = [blo[0], cy, bhi[2] + off * 0.3], [bhi[0], cy, bhi[2] + off * 0.3]
        line = {"a": a, "b": b, "do_dai": s["nhan"], "tu_de": s.get("tu_de", "")}
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*(km|dm|cm|mm|m)\b", chuan(s["nhan"]))
        if m:
            want = float(m[1].replace(",", ".")) * DV[m[2]]
            got = math.dist(a, b)
            if not math.isclose(want, got, rel_tol=0.02):
                raise LoiDacTa(f"so_lieu '{gan}' ghi {s['nhan']} nhưng kích thước dựng là {got:g} m")
        doan.append(line)

    boi = spec.get("boi_canh") or {}
    cau = kb.get("cau_chuyen") if isinstance(kb.get("cau_chuyen"), dict) else {}
    moi = boi.get("mau") if boi.get("mau") in DANH_MUC["moi_truong"] else khop_moi_truong(
        boi.get("tu_de"), boi.get("mo_ta"), cau.get("dia_diem"), kb.get("de_bai"),
        ngoai_troi=None if "trong_nha" not in boi else not boi["trong_nha"])
    if boi.get("mau") and boi["mau"] not in DANH_MUC["moi_truong"]:
        canh_bao.append(f"bối cảnh '{boi['mau']}' chưa có mẫu, dùng '{moi}'")
    q = quay_canh or {}
    plan = {"loai": "dac_ta", "chi_tiet": parts, "doan_toan": doan,
            "moi_truong": {"mau": moi or "phong", "thoi_gian": boi.get("thoi_gian", "sang")},
            "huong_may": HUONG_MAY.get(q.get("goc_may"), HUONG_MAY["toan_canh"]),
            "tieu_diem": q.get("tieu_diem") or [t["id"] for t in order if t["vai_tro"] == "chinh"],
            "canh_bao": canh_bao}
    if q:
        # Giai đoạn D: góc máy / chuyển máy / hành động của cảnh. Chỉ giữ hành động trỏ tới bản sao có dựng;
        # "i" là chỉ số gốc trong quay[].hanh_dong để canh_3d.py ghép đúng mốc khi_noi (props.quay) cho Remotion.
        hd = []
        for i, a in enumerate(q.get("hanh_dong") or []):
            if a.get("dong_tu") == "dung_yen":
                continue
            if not ban_sao(a.get("vat")):
                canh_bao.append(f"cảnh {q.get('canh')}: hành động '{a.get('dong_tu')}' trỏ tới '{a.get('vat')}' không có, bỏ qua")
                continue
            hd.append({"i": i, "vat": a["vat"], "dong_tu": a["dong_tu"], "so": a.get("so"), "tham_so": a.get("tham_so") or {}})
        plan["tieu_diem"] = [r for r in plan["tieu_diem"] if ban_sao(r)] or [t["id"] for t in order if t["vai_tro"] == "chinh"]
        plan["quay"] = {"canh": q.get("canh"), "goc_may": q.get("goc_may") or "toan_canh",
                        "chuyen_may": q.get("chuyen_may") or "luot_vao", "hanh_dong": hd}
    if not doan:
        plan["giu_vat"] = True
    return plan
