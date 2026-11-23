"""Chọn bối cảnh từ dữ kiện của bài; chuyển danh sách hình khối sang Blender một lần mỗi video."""

import argparse
import hashlib
import json
import math
import re
from pathlib import Path
import subprocess
import tempfile
import sys
import unicodedata


def so(v):
    return type(v) in (int, float) and math.isfinite(v) and abs(v) <= 1e6


def bo_ba(v):
    return isinstance(v, list) and len(v) == 3 and all(so(n) for n in v)


def canh_tu_kich_ban(kb, mh):
    de = str(kb.get("de_bai") or "").casefold()
    # Ưu tiên dữ kiện định lượng đã chuẩn hóa ở bước chuẩn bị.
    du = mh.get("duLieu")
    if not isinstance(du, dict):
        du = {}
    if mh.get("loai") == "thuc_te_theo_de":
        if du.get("loai") == "cap_bo" and all(so(du.get(k)) and du[k] > 0 for k in ("ah", "hb")):
            return du
        total, vacant = du.get("tong"), du.get("trong")
        if du.get("loai") == "can_ho" and type(total) is int and 1 <= total <= 200:
            if vacant is None or type(vacant) is int and 0 <= vacant <= total:
                return du
    vat = du.get("vat") or []
    if not isinstance(vat, list):
        return None
    if any(v.get("loai") == "anh_that" for v in vat if isinstance(v, dict)):
        return None
    model = mo_hinh_tu_de(kb)
    if model:
        return model
    # Nếu bản vẽ gốc không hợp lệ, tiếp tục dò dữ kiện sân khấu/đề đã kiểm tra.
    if any(isinstance(v, dict) and v.get("loai") in ("do_thi", "hinh_hoc") for v in vat):
        return None
    simple = lang_tru_tu_de(de) or canh_mot_vat(de)
    if simple:
        return mo_hinh_tu_de(dict(kb, mo_hinh_3d=simple))
    bv = next((v for v in vat if isinstance(v, dict) and v.get("loai") == "canh_that"), None)
    if bv and isinstance(bv.get("vat") or [], list):
        objs = [v for v in bv.get("vat") or [] if isinstance(v, dict) and v.get("ten") != "mat_troi"]
        regions = bv.get("vung") or []
        kinds = {
            "nguoi": r"người|học sinh|bạn|anh|chị|bác",
            "cot_co": r"cột cờ",
            "cay": r"cây",
            "toa_nha": r"(?:tòa|toà|ngôi|căn) nhà|cao ốc|chung cư",
        }
        if (
            0 < len(objs) <= 20
            and not regions
            and all(
                isinstance(v.get("ten"), str)
                and v["ten"] in kinds
                and re.search(kinds[v["ten"]], de)
                and so(v.get("cao"))
                and v["cao"] > 0
                and ("rong" not in v or so(v["rong"]) and v["rong"] > 0)
                and so(v.get("x"))
                and not v.get("tren")
                and so(v.get("y", 0))
                for v in objs
            )
        ):
            return {"loai": "vat", "vat": objs}
        if isinstance(regions, list) and len(regions) == 1 and isinstance(regions[0], dict) and not objs:
            r = regions[0]
            sides = ("tren", "duoi", "trai", "phai")
            if (
                r.get("ten") in ("vuon", "ruong")
                and re.search(r"vườn|ruộng", de)
                and so(r.get("rong"))
                and so(r.get("dai"))
                and min(r["rong"], r["dai"]) > 0
                and r.get("tuong", "") in (*sides, "")
            ):
                fence = r.get("hang_rao", False)
                if isinstance(fence, bool) or isinstance(fence, list) and all(s in sides for s in fence):
                    if "tường" in de and not r.get("tuong"):
                        raise ValueError("Vườn thiếu cạnh tựa tường nêu trong đề")
                    # Đối chiếu tổng mét lưới đã cho với các cạnh thực sự được rào.
                    luoi = re.search(r"(\d+(?:[.,]\d+)?)\s*m\s+lưới", de)
                    if luoi:
                        edges = [
                            side
                            for side in sides
                            if side != r.get("tuong") and (fence is True or side in (fence or []))
                        ]
                        length = sum(r["rong"] if side in ("tren", "duoi") else r["dai"] for side in edges)
                        if not math.isclose(length, float(luoi[1].replace(",", ".")), rel_tol=0.001):
                            raise ValueError(f"Tổng cạnh thực sự được rào ({length:g} m) khác dữ kiện đề")
                    return {
                        "loai": "vuon",
                        "rong": r["rong"],
                        "dai": r["dai"],
                        "tuong": r.get("tuong"),
                        "rao": fence,
                    }
    return None


MET = {"km": 1000, "m": 1, "mét": 1, "dm": 0.1, "cm": 0.01, "mm": 0.001}
DO_DAI = r"(\d+(?:[.,]\d+)?)\s*(km|cm|mm|mét|m)"


def lang_tru_tu_de(de):
    """Lắp khối theo tiết diện và kích thước đã cho, độc lập với tên đồ vật."""
    if len(re.findall(r"lăng trụ đứng", de)) != 1 or re.search(r"rỗng|khoét|ghép|hai lăng trụ", de):
        return None
    length = r"\d+(?:[.,]\d+)?\s*(?:km|cm|mm|mét|m)\b"
    base = re.search(
        r"lăng trụ đứng[^.;!?]{0,70}?tam giác vuông[^.;!?]{0,48}?hai cạnh góc vuông "
        r"(?:lần lượt )?(?:dài |là )?(" + length + r")\s*(?:và|,)\s*(" + length + ")", de)
    height = re.findall(r"(?:chiều cao (?:của )?(?:khối |lăng trụ )?(?:là )?|lăng trụ cao )(" + length + ")", de)
    if not base or len(height) != 1:
        return None
    labels = [base[1], base[2], height[0]]
    sizes = []
    for label in labels:
        number, unit = re.fullmatch(DO_DAI, label).groups()
        sizes.append(float(number.replace(",", ".")) * MET[unit])
    if min(sizes) <= 0:
        return None
    w, d, h = sizes
    a = [-w/2,-d/2,0]
    ends = [[w/2,-d/2,0],[-w/2,d/2,0],[-w/2,-d/2,h]]
    return {"chi_tiet":[{"hinh":"lang_tru","day":[[0,0],[1,0],[0,1]],
                         "tam":[0,0,h/2],"co":sizes,"tu_de":base[0]}],
            "doan_toan":[{"a":a,"b":b,"tu_de":label,"do_dai":label} for b,label in zip(ends,labels)]}


def canh_mot_vat(de):
    """Nhận hai quan hệ đơn giản trong đề cũ thiếu bản vẽ. Đề phức hợp dùng bản vẽ của biên kịch."""
    measure = "(?P<length>" + DO_DAI + r")\b"
    boat = re.search(
        r"(?P<obj>thuyền|tàu|xuồng)(?: [a-z])? (?:đang )?cách (?P<bank>bờ sông) " + measure, de
    )
    belt = re.search(r"(?P<obj>băng chuyền|băng tải)(?: thẳng)? dài " + measure, de)
    if bool(boat) == bool(belt) or re.search(
        r"hai (?:chiếc|băng)|nghiêng|góc nghiêng|thứ hai|song song|hợp với|ngược chiều|bờ đối diện", de
    ):
        return None
    m = boat or belt
    num, unit = re.fullmatch(DO_DAI, m["length"]).groups()
    d = float(num.replace(",", ".")) * MET[unit]
    if not 1e-4 <= d <= 1e5:
        return None

    def part(shape, quote, center, size, material):
        return dict(
            hinh=shape,
            tu_de=quote,
            tam=[v * d for v in center],
            co=[v * d for v in size],
            vat_lieu=material,
        )

    if boat:
        parts = [
            part("hop", "sông", (0, 0.75, -0.035), (2, 1.5, 0.065), "nuoc"),
            part("hop", m["bank"], (0, -0.075, -0.02), (2, 0.15, 0.04), "dat"),
            part("thuyen", m["obj"], (0, 1, 0.035), (0.37, 0.13, 0.085), "do"),
        ]
        start, end = [0, d, 0], [0, 0, 0]
    else:
        parts = [part("bang_chuyen", m["obj"], (0, 0, 0.075), (1, 0.18, 0.15), "vang")]
        if "kiện hàng" in de:
            parcel = part("hop", "kiện hàng", (-0.45, 0, 0.195), (0.1, 0.085, 0.09), "go")
            if re.search(r"từ đầu (?:đến|tới) cuối", de):
                parcel["dich_chuyen"] = [0.90 * d, 0, 0]
            parts.append(parcel)
        start, end = [-0.5 * d, 0, 0.15 * d], [0.5 * d, 0, 0.15 * d]
    return dict(chi_tiet=parts, doan_toan=[dict(a=start, b=end, tu_de=m[0], do_dai=m["length"])])


def bien_dang_loi(points):
    if not isinstance(points, list) or not 3 <= len(points) <= 24:
        return False
    if not all(isinstance(p, list) and len(p) == 2 and all(so(x) for x in p) for p in points):
        return False
    # Mọi đỉnh còn lại phải cùng phía mỗi cạnh (loại nét tự cắt và cạnh suy biến).
    signs = []
    for i, (x, y) in enumerate(points):
        u, v = points[(i + 1) % len(points)]
        for j, (a, b) in enumerate(points):
            if j not in (i, (i + 1) % len(points)):
                signs.append((u - x) * (b - y) - (v - y) * (a - x))
    return min(signs) > 1e-8 or max(signs) < -1e-8


def tang_hop_le(rows):
    # Mỗi tiết diện elip: cao độ, lệch tâm x/y, hai bán kính.
    return (
        isinstance(rows, list)
        and 2 <= len(rows) <= 16
        and all(
            isinstance(row, list) and len(row) == 5 and all(so(x) for x in row) and min(row[3:]) > 0
            for row in rows
        )
        and all(a[0] < b[0] for a, b in zip(rows, rows[1:]))
    )


def luoi_hop_le(part):
    vertices, faces = part.get("dinh"), part.get("mat")
    if not isinstance(vertices, list) or not 3 <= len(vertices) <= 256 or not all(map(bo_ba, vertices)):
        return False
    if not isinstance(faces, list) or not 1 <= len(faces) <= 512:
        return False
    used = set()
    for face in faces:
        if not isinstance(face, list) or len(face) != 3 or not all(
            type(i) is int and 0 <= i < len(vertices) for i in face
        ):
            return False
        a, b, c = (vertices[i] for i in face)
        u = [x-y for x,y in zip(b,a)]
        v = [x-y for x,y in zip(c,a)]
        if not any(abs(u[i-1]*v[i]-v[i-1]*u[i]) > 1e-12 for i in range(3)):
            return False
        used.update(face)
    return len(used) == len(vertices)


def chuan_trich_dan(text):
    return " ".join(unicodedata.normalize("NFC", str(text or "")).casefold().split())


# --- Khớp tu_de "mềm câu chữ, chặt số liệu" ---------------------------------
_DON_VI_KHOP = [
    (r"ki\s*-?\s*lô\s*-?\s*mét|kilô\s*mét|kilomet|kilômét", "km"),
    (r"xăng\s*-?\s*ti\s*-?\s*mét|xen\s*-?\s*ti\s*-?\s*mét|centimet|xentimét|centimét", "cm"),
    (r"mi\s*-?\s*li\s*-?\s*mét|milimét|milimet", "mm"),
    (r"đề\s*-?\s*xi\s*-?\s*mét|đêximét|decimet", "dm"),
    (r"mét|met", "m"),
]
NGUONG_KHOP_TU_DE = 0.8


def chuan_khop(text):
    """Chuẩn hóa để so khớp mềm: hoa/thường, khoảng trắng, dấu câu, $...$ / lệnh LaTeX, 2,5 = 2.5, mét = m."""
    t = unicodedata.normalize("NFC", str(text or "")).casefold()
    t = re.sub(r"\\(?:text|mathrm|mbox|textbf|textit|operatorname)\s*\{([^{}]*)\}", r" \1 ", t)
    t = t.replace("{,}", ",").replace("{.}", ".")
    t = re.sub(r"\\[a-z]+|\\.", " ", t)
    t = re.sub(r"(\d)\s*[,.]\s*(?=\d)", r"\1.", t)  # dấu thập phân: 2,5 | 2{,}5 | 2.5 -> 2.5
    for pattern, unit in _DON_VI_KHOP:
        t = re.sub(r"(?<!\w)(?:" + pattern + r")(?!\w)", unit, t)
    t = re.sub(r"(\d)(?=[^\W\d_])", r"\1 ", t)  # 2,5m -> 2.5 m
    t = re.sub(r"(?<!\d)\.|\.(?!\d)", " ", t)
    t = re.sub(r"[^\w.]+|_", " ", t)
    return " ".join(t.split())


def so_trong(text):
    """Tập số (float) xuất hiện trong văn bản đã chuẩn hóa."""
    return {float(x) for x in re.findall(r"\d+(?:\.\d+)?", chuan_khop(text))}


def khop_tu_de(quote, de_goc):
    """Trả đoạn NGUYÊN VĂN đề khớp mờ với quote (>= NGUONG_KHOP_TU_DE) và chứa đủ mọi số của quote, không khớp -> None."""
    import difflib
    q = chuan_khop(quote)
    if len(q) < 2:
        return None
    de_goc = unicodedata.normalize("NFC", str(de_goc or ""))
    toks = [(n, m.start(), m.end()) for m in re.finditer(r"\S+", de_goc) for n in [chuan_khop(m[0])] if n]
    if not toks:
        return None
    nq = len(q.split())
    so_q = so_trong(quote)
    best = (0.0, None)
    for i in range(len(toks)):
        for size in range(max(1, nq - 3), nq + 4):
            if i + size > len(toks):
                break
            cand = " ".join(t[0] for t in toks[i:i + size])
            ratio = difflib.SequenceMatcher(None, q, cand, autojunk=False).ratio()
            if ratio > best[0] and so_q <= so_trong(cand):
                best = (ratio, (toks[i][1], toks[i + size - 1][2]))
                if ratio == 1.0:
                    break
        if best[0] == 1.0:
            break
    if best[0] < NGUONG_KHOP_TU_DE:
        return None
    span = de_goc[best[1][0]:best[1][1]].strip(" ,;:!?()[]\"'“”")
    if span.count("$") % 2:
        span = span.strip("$").strip()
    return span or None


TRUONG_SO_LIEU = ("nhan", "ten", "mo_ta", "chu", "do_dai", "so_lieu", "gia_tri", "so_luong")


def so_bia(item, de_goc):
    """Số trong các trường dữ kiện / hiển thị của chi tiết không có trong đề.
    tam/co/xoay/dich_chuyen là tọa độ dựng (mét, tỉ lệ mỹ thuật) và id/the là mã nội bộ: không xét."""
    so_de = so_trong(de_goc)
    bia = set()
    for key in TRUONG_SO_LIEU:
        value = item.get(key)
        if isinstance(value, (str, int, float)) and not isinstance(value, bool):
            bia |= so_trong(str(value)) - so_de
    return sorted(bia)


def canh_bao_mo_hinh(message):
    print(f"WARN mo_hinh_3d: {message}", file=sys.stderr)


def mo_hinh_tu_de(kb, loi=None):
    # Mô hình tự do gồm các chi tiết ghép chung một hệ tọa độ. Chỉ nhận dữ liệu khai báo.
    def invalid(message):
        if loi is not None:
            loi.append(message)
        return None

    mo = kb.get("mo_hinh_3d")
    if not isinstance(mo, dict):
        return invalid("mo_hinh_3d phải là đối tượng")
    parts = mo.get("chi_tiet")
    if not isinstance(parts, list) or not 1 <= len(parts) <= 80:
        return invalid("chi_tiet cần từ 1 đến 80 phần")
    de_goc = str(kb.get("de_bai") or "")
    de = chuan_trich_dan(de_goc)
    lines = mo.get("doan_toan", [])
    # Chi tiết cốt lõi: được đoạn đo tham chiếu, hoặc khai báo vai_tro chinh/cot_loi.
    cot_loi = {
        pt.get("vat") for raw in (lines if isinstance(lines, list) else []) if isinstance(raw, dict)
        for pt in (raw.get("a"), raw.get("b")) if isinstance(pt, dict)
    }
    kept = []
    for index, item in enumerate(parts, 1):
        if not isinstance(item, dict):
            return invalid(f"chi_tiet[{index}] phải là đối tượng")
        if not bo_ba(item.get("tam")) or not bo_ba(item.get("co")) or min(item["co"]) <= 0:
            return invalid(f"chi_tiet[{index}] cần tam và co gồm ba số, kích thước co phải dương")
        # Mềm câu chữ: tu_de khớp mờ với đề -> gán lại nguyên văn đề. Chặt số liệu: số bịa -> không khớp.
        span = khop_tu_de(item.get("tu_de"), de_goc)
        bia = so_bia(item, de_goc)
        if span is None or bia:
            ly_do = (f"số {', '.join(f'{x:g}' for x in bia)} không có trong đề" if bia and span is not None
                     else f"tu_de '{item.get('tu_de')}' không khớp đề")
            core = item.get("vai_tro") in ("chinh", "cot_loi") or item.get("id") in cot_loi
            if core:
                return invalid(f"chi_tiet[{index}] là dữ kiện cốt lõi nhưng {ly_do}")
            canh_bao_mo_hinh(f"bỏ chi_tiet[{index}] ({item.get('id') or item.get('hinh')}): {ly_do} - không vẽ chi tiết bịa")
            continue
        if span != item.get("tu_de"):
            item = dict(item, tu_de=span)
        kept.append(item)
        source = chuan_trich_dan(span)
        if (
            item.get("hinh")
            not in ("hop", "tru", "cau", "non", "lon", "bon_vom", "thuyen", "bang_chuyen", "lang_tru", "khoi_tiet_dien", "luoi_tam_giac")
            or (item["hinh"] == "luoi_tam_giac" and not luoi_hop_le(item))
            or (item["hinh"] == "khoi_tiet_dien" and not tang_hop_le(item.get("tang")))
            or (item["hinh"] == "lang_tru" and not bien_dang_loi(item.get("day")))
            or (item["hinh"] == "thuyen" and not re.search("thuyền|tàu|ca nô|xuồng", source))
            or (item["hinh"] == "bang_chuyen" and not re.search("băng (?:chuyền|tải)", source))
            or not bo_ba(item.get("dich_chuyen", [0, 0, 0]))
            or not isinstance(item.get("vat_lieu", "da"), str)
            or not bo_ba(item.get("xoay", [0, 0, 0]))
        ):
            return invalid(f"chi_tiet[{index}] sai hình, thuộc tính hoặc chuyển động")
    parts = kept
    if not parts:
        return invalid("thiếu dữ kiện cốt lõi: không còn chi_tiet nào bám đề sau khi bỏ chi tiết bịa")
    if re.search(r"bể.{0,80}hình hộp.{0,40}không (?:có )?nắp", de):
        if not be_khong_nap(parts, de):
            return invalid("Bể không nắp cần đáy và bốn vách bao đúng thể tích trong đề")
    if not isinstance(lines, list) or len(lines) > 12:
        return invalid("doan_toan cần danh sách tối đa 12 đoạn")
    centers = {}
    for part in parts:
        if "id" in part:
            name = part["id"]
            if not isinstance(name, str) or not name or name in centers:
                return invalid("id chi tiết phải là chuỗi riêng biệt")
            centers[name] = [a + b for a, b in zip(part["tam"], part.get("dich_chuyen", [0, 0, 0]))]
    segments = []
    for index, raw in enumerate(lines, 1):
        if not isinstance(raw, dict):
            return invalid(f"doan_toan[{index}] phải là đối tượng")
        line = dict(raw)
        for key in ("a", "b"):
            pt = line.get(key)
            if isinstance(pt, dict):
                name = pt.get("vat")
                offset = pt.get("lech", [0, 0, 0])
                if not isinstance(name, str) or name not in centers or not bo_ba(offset):
                    return invalid(f"doan_toan[{index}].{key} sai tham chiếu vật hoặc độ lệch")
                line[key] = [a + b for a, b in zip(centers[name], offset)]
            if not bo_ba(line.get(key)):
                return invalid(f"doan_toan[{index}].{key} cần ba tọa độ")
        length = math.dist(line["a"], line["b"])
        if length < 1e-6:
            return invalid(f"doan_toan[{index}] có hai đầu trùng nhau")
        span = khop_tu_de(line.get("tu_de"), de_goc)
        if span is None:
            canh_bao_mo_hinh(f"bỏ doan_toan[{index}]: tu_de '{line.get('tu_de')}' không khớp đề - không vẽ đoạn đo bịa")
            continue
        line["tu_de"] = span
        if "do_dai" in line:
            m = re.fullmatch(r"(\d+(?:\.\d+)?) (km|dm|cm|mm|m)", chuan_khop(line["do_dai"]))
            if not m:
                return invalid(f"doan_toan[{index}].do_dai cần dạng số + đơn vị (km, m, dm, cm, mm)")
            if not re.search(r"(?<![\d.])" + re.escape(m[0]) + r"(?!\w)", chuan_khop(span)):
                # Số đo không có trong câu đề được trích -> số bịa, không vẽ.
                canh_bao_mo_hinh(f"bỏ doan_toan[{index}]: do_dai '{line['do_dai']}' không có trong '{span}'")
                continue
            meters = float(m[1]) * MET[m[2]]
            if not math.isclose(length, meters, rel_tol=0.002):
                return invalid(f"doan_toan[{index}] dài {length:g} m theo tọa độ, dữ kiện ghi {meters:g} m")
        segments.append(line)
    return {"loai": "lap_ghep", "chi_tiet": parts, "doan_toan": segments}


def be_khong_nap(parts, de):
    """Đo lòng bể trực tiếp giữa bốn mặt trong của các vách."""
    if len(parts) != 5 or any(p["hinh"] != "hop" or any(p.get("xoay", [])) for p in parts):
        return False
    axes = [[], [], []]
    for p in parts:
        axis = min(range(3), key=p["co"].__getitem__)
        axes[axis].append(tuple((c - s / 2, c + s / 2) for c, s in zip(p["tam"], p["co"])))
    if list(map(len, axes)) != [2, 2, 1]:
        return False
    base = axes[2][0]
    inner = []
    for axis in (0, 1):
        a, b = sorted(axes[axis], key=lambda box: box[axis][0])
        inner.append((a[axis][1], b[axis][0]))
    walls = axes[0] + axes[1]
    height = walls[0][2][1] - base[2][1]
    eps = max(p["co"][2] for p in parts) * 1e-5
    for i, pair in enumerate(axes[:2]):
        low, high = inner[1 - i]
        if any(w[1 - i][0] > low + eps or w[1 - i][1] < high - eps for w in pair):
            return False
    if any(abs(w[2][0] - base[2][1]) > eps or abs(w[2][1] - walls[0][2][1]) > eps for w in walls):
        return False
    if any(base[i][0] > a + eps or base[i][1] < b - eps for i, (a, b) in enumerate(inner)):
        return False
    width, depth = (b - a for a, b in inner)
    if min(width, depth, height) <= 0 or ("đáy là hình vuông" in de and abs(width - depth) > eps):
        return False
    volume = re.search(r"thể tích(?: là| bằng)?\s*([0-9]+(?:[.,][0-9]+)?)\s*m(?:³|3|\^3)", de)
    return not volume or math.isclose(
        width * depth * height, float(volume[1].replace(",", ".")), rel_tol=0.002
    )


def phep_thu_3d(c):
    mh = c.get("minhHoa") or {}
    du = mh.get("duLieu")
    if mh.get("loai") == "bi_hop" and isinstance(du,dict):
        colors = {"đỏ":"do","xanh dương":"xanh_duong","xanh lá":"xanh_la","vàng":"vang",
                  "trắng":"trang","tím":"tim","cam":"cam","đen":"den"}
        def group(g):
            label = str(g.get("ten","")).casefold().removeprefix("bi ").strip()
            return {"mau":colors.get(label), "so":g.get("so")}
        groups, selected = du.get("nhom") or [], du.get("chon") or []
        if not isinstance(groups,list) or not isinstance(selected,list) or len(selected)>1 or not all(isinstance(g,dict) for g in groups+selected):
            return None
        obj = dict(id="bi",loai="hop_bi",nhom=[group(g) for g in groups])
        actions = [dict(kieu="lay_ra",vat="bi",**group(selected[0]))] if selected else []
        du = dict(vat=[obj],hanh_dong=actions)
        mh = dict(loai="san_khau")
    if mh.get("loai") != "san_khau" or not isinstance(du, dict) or c.get("giuSanKhau"):
        return None
    objects = du.get("vat")
    if not isinstance(objects, list) or len(objects) != 1 or not isinstance(objects[0], dict):
        return None
    obj = objects[0]
    kind = obj.get("loai")
    if kind not in ("hop_bi", "xuc_xac", "dong_xu") or obj.get("nhan") or obj.get("noi_dung"):
        return None
    actions = du.get("hanh_dong") or []
    if not isinstance(actions, list) or any(not isinstance(a, dict) for a in actions):
        return None
    actions = [a for a in actions if a.get("kieu") != "goc_3d"]
    if len(actions) > 1 or any(a.get("vat") != obj.get("id") for a in actions):
        return None
    action = actions[0] if actions else {}
    if kind == "hop_bi":
        palette = ("do", "xanh_duong", "xanh_la", "vang", "trang", "tim", "cam", "den")
        groups = obj.get("nhom")
        if (
            not isinstance(groups, list)
            or not groups
            or any(
                not isinstance(g, dict)
                or g.get("mau") not in palette
                or type(g.get("so")) is not int
                or not 1 <= g["so"] <= 20
                for g in groups
            )
        ):
            return None
        if sum(g["so"] for g in groups) > 20:
            return None
        values = [g["mau"] for g in groups for _ in range(g["so"])]
        if action and (
            action.get("kieu") != "lay_ra"
            or type(action.get("so", 1)) is not int
            or not 1 <= action.get("so", 1) <= values.count(action.get("mau"))
        ):
            return None
    else:
        values = obj.get("ket_qua" if kind == "xuc_xac" else "ds")
        if not isinstance(values, list) or not 1 <= len(values) <= (3 if kind == "xuc_xac" else 4):
            return None
        if obj.get("so_luong", len(values)) != len(values) or (action and action.get("kieu") != "quay"):
            return None
        if kind == "xuc_xac" and any(type(x) is not int or not 1 <= x <= 6 for x in values):
            return None
        if kind == "dong_xu" and any(x not in ("S", "N") for x in values):
            return None
    return dict(
        loai="phep_thu",
        vat=kind,
        gia_tri=values,
        dong=bool(action),
        so_rut=action.get("so", 1) if kind == "hop_bi" and action else 0,
        mau_rut=action.get("mau"),
    )


def ke_hoach_dac_ta(kb, so_canh=1, kiem=True):
    """Đường dựng mới: dac_ta_canh -> kiểm bám đề -> bộ xếp chỗ. None nếu kịch bản không có đặc tả.

    Lỗi bám đề (số lượng, màu, kích thước, trích dẫn sai) là lỗi nặng: dừng để Apps Script sửa kịch bản.
    Thực thể chính chưa có mẫu (và chưa được --tu-tao sinh bản ghép) thì quay về đường dựng cũ.
    so_canh: lấy góc máy / hành động của quay[] cảnh này (giai đoạn D: mỗi cảnh một kế hoạch Blender riêng).
    """
    if not isinstance(kb.get("dac_ta_canh"), dict):
        return None
    from kiem_bam_de import kiem_dac_ta_tu_sua
    from thu_vien_3d.xep_cho import LoiDacTa, ThieuMau, lap_ke_hoach_dac_ta
    if kiem:
        errors, warnings = kiem_dac_ta_tu_sua(kb)   # v91: tự sửa lỗi bám đề sửa được rồi mới kiểm
        for w in warnings:
            print("Đặc tả cảnh:", w, file=sys.stderr)
        if errors:
            raise ValueError("Đặc tả cảnh chưa bám đề: " + "; ".join(errors[:4]))
    shots = (kb["dac_ta_canh"].get("quay") or [])
    first = next((q for q in shots if q.get("canh") == so_canh), None)
    if first is None and so_canh != 1:
        return None
    try:
        plan = lap_ke_hoach_dac_ta(kb, first)
    except ThieuMau as e:
        print(f"Đặc tả cảnh: {e}; dùng đường dựng cũ", file=sys.stderr)
        return None
    except LoiDacTa as e:
        raise ValueError(f"Đặc tả cảnh: {e}") from e
    for w in plan.pop("canh_bao", []):
        print("Đặc tả cảnh:", w, file=sys.stderr)
    return plan


class ThieuMoHinh(ValueError):
    def __init__(self, index, reason):
        self.index = index
        position = "Mô hình chung" if index is None else f"Cảnh {index+1}"
        super().__init__(f"{position}: {reason}")


def ke_hoach(kb, props):
    from xe_3d import CAR
    de = str(kb.get("de_bai") or "")
    car_problem = CAR.search(de) and not re.search(r"hai (?:chiếc )?xe|hai (?:chiếc )?ô tô|xe thứ hai|ngược chiều nhau",de,re.I)
    fold = re.search(r"bìa|tấm giấy", de, re.I) and re.search(r"(?:bốn|4) góc|góc.*hình vuông", de, re.I) and re.search(r"hộp|gấp", de, re.I)
    if kb.get("mon") == "HINH_HOC":
        return {}
    spec_plan = ke_hoach_dac_ta(kb)
    if spec_plan and car_problem:
        # Có đặc tả cảnh: chỉ giữ đường "xe chạy trên đường" (Three.js) khi đề thật sự có luật chuyển động.
        from xe_3d import luat_van_toc
        car_problem = luat_van_toc(de) is not None
    physical_kinds = set("nguoi the the_bai xuc_xac dong_xu hop_bi tui hop_qua dong_ho dien_thoai bong_bay vong_quay cua banh ban_tron khoi_hop tru non cau toa_nha xe cay thang canh_that".split())
    ds = {}
    scenes = props.get("canh", [])
    mo_dau_het = next((i for i, c in enumerate(scenes) if i and c.get("loai") == "de_bai"), 1)
    for i, c in enumerate(scenes):
        local = c.get("moHinh3D")
        mh = c.get("minhHoa") or {}
        data = mh.get("duLieu")
        objects = data.get("vat") or [] if isinstance(data,dict) else []
        if not isinstance(objects, list) or not all(isinstance(v, dict) for v in objects):
            raise ValueError(f"Cảnh {i+1}: vat phải là một danh sách vật thể")
        kinds = {v["loai"] for v in objects if isinstance(v,dict) and isinstance(v.get("loai"), str)}
        # Các cảnh giải có bản vẽ Manim riêng hoặc số liệu Manim biết dựng.
        if i > 0 and c.get("loai") != "de_bai" and not local and (c.get("netToan") or
                (kinds and kinds <= {"do_thi", "bieu_do_cot", "thanh", "dong_ho_do",
                                     "danh_sach", "the", "nhan", "chu", "banh", "khoi_hop"})):
            continue
        if i > 0 and c.get("loai") == "de_bai" and 0 in ds and not local:
            continue
        voice = " ".join(cue["text"] for cue in c.get("cau",[]))
        car_only = kinds <= {"xe", "chu", "nhan", "mui_ten", "so_dem"}
        car_scene = "xe" in kinds or c.get("loai") in ("mo_dau", "hook", "de_bai") or CAR.search(voice)
        car_scene = car_scene or re.search(r"dừng đột ngột|dừng hẳn|hãm phanh", voice, re.I)
        if car_problem and car_only and car_scene and (local is None or kinds == {"xe"}):
            ds[i] = {"loai": "xe_duong"}
            continue
        physical = bool(kinds & physical_kinds) or mh.get("loai") in ("thuc_te_theo_de","bi_hop","bang_phan_cong") or any(
            isinstance(n,dict) and n.get("kieu") in ("bi","xuc_xac","the_bai","dong_xu","vat")
            for n in (data.get("phan_tu") or [] if isinstance(data,dict) else [])
        ) or any(
            isinstance(n, dict) and n.get("kieu") == "vat"
            for obj in objects if isinstance(obj, dict) for n in (obj["hinh"] if isinstance(obj.get("hinh"),list) else [])
        )
        opening = c.get("loai") in ("mo_dau", "hook", "de_bai", "mo_hinh_hoa")
        if "anh_that" in kinds and not physical:
            continue
        native = phep_thu_3d(c)
        if spec_plan and i < mo_dau_het and not native:
            # Các cảnh mở đầu (trước cảnh đề) dựng theo đặc tả (vật + bối cảnh của đề); phép thử bi/xu/xúc xắc có chuyển động giữ đường riêng.
            ds[i] = spec_plan
            continue
        if native:
            ds[i] = native
            continue
        if c.get("giuSanKhau") and i-1 in ds and not objects and not (data.get("hanh_dong") if isinstance(data,dict) else None):
            if ds[i-1]["loai"] == "phep_thu":
                ds[i] = ds[i-1]
                continue
        errors = []
        plan = mo_hinh_tu_de(dict(kb, mo_hinh_3d=local), errors) if local is not None else None
        if not plan and (physical or opening or local):
            if local:
                print(f"Cảnh {i+1}: bản vẽ riêng không hợp lệ, đối chiếu mô hình từ dữ kiện đề.", file=sys.stderr)
            plan = canh_tu_kich_ban(kb, mh)
        if not plan and car_problem and car_only and car_scene:
            plan = {"loai": "xe_duong"}
        # Các cảnh có nhiều vật và hành động nối tiếp cần giữ nguyên sân khấu.
        # Áp dụng cho các loại có bộ vẽ cụ thể trong src/sankhau/vat.tsx.
        if not plan and fold and (i == 0 or c.get("loai") in ("de_bai","mo_hinh_hoa") or re.search(r"bao bì|kiến trúc", voice, re.I)):
            continue  # BiaGap dựng bốn mép quay quanh đáy theo lời giảng.
        if not plan and mh.get("loai") == "bang_phan_cong":
            continue
        if not plan and mh.get("loai") == "san_khau" and kinds and all(
            isinstance(v, dict) and v.get("id") for v in objects
        ):
            diagrams = {"cua", "banh", "the", "nhan", "chu", "so_dem", "mui_ten", "danh_sach"}
            if kinds <= diagrams:
                continue
            trial_stage = {"hop_bi", "tui", "hop_qua", "xuc_xac", "dong_xu", "nguoi", "the_bai",
                           "dong_ho", "vong_quay", "bong_bay", "bieu_tuong", "thanh", "luoi_o"}
            if not local and kinds <= diagrams | trial_stage and kb.get("mon") in ("XAC_SUAT", "", None):
                # Một phép thử đơn với dữ liệu sai vẫn cần được sửa. Với cảnh
                # kết hợp, giữ đủ nhãn và hành động do sân khấu gốc đã mô tả.
                single_trial = len(objects) == 1 and kinds <= {"hop_bi", "dong_xu", "xuc_xac"}
                if not single_trial:
                    continue
        if not plan and not physical and not local:
            continue
        if plan and plan["loai"] == "lap_ghep" and not plan.get("doan_toan"):
            plan["giu_vat"] = True
        if plan and (local is not None or physical or plan not in ds.values()):
            ds[i] = plan
        elif (physical or local) and not plan:
            if not errors and kb.get("mo_hinh_3d") is not None:
                mo_hinh_tu_de(kb, errors)
            reason = errors[0] if errors else "thiếu mô hình cho " + (", ".join(sorted(kinds)) or "vật trong đề")
            if errors or local or kinds in ({"hop_bi"}, {"xuc_xac"}, {"dong_xu"}) or mh.get("loai") == "bi_hop":
                raise ValueError(f"Cảnh {i + 1}: {reason}")
            raise ThieuMoHinh(i, reason)
    return ds


def phan_vai(ds, props, kb):
    """Giữ một góc chiếu khi chuyển từ cảnh mở đầu sang bài giải."""
    scenes = props["canh"]
    if kb.get("mon") == "HINH_HOC" or not scenes:
        return ds
    if 0 not in ds:
        first = scenes[0].get("minhHoa") or {}
        du = first.get("duLieu") or {}
        objects = du.get("vat", []) if isinstance(du, dict) else []
        physical = [v for v in objects if v.get("loai") not in ("nhan", "chu")]
        doors = [v for v in physical if v.get("loai") == "cua"]
        if len(physical) == len(doors) == 1 and type(doors[0].get("so_luong")) is int and 1 <= doors[0]["so_luong"] <= 12:
            ds[0] = {"loai":"cua", "so":doors[0]["so_luong"]}
        else:
            trial = dict(du, vat=physical) if isinstance(du, dict) else {}
            plan = phep_thu_3d({"minhHoa":dict(first, duLieu=trial)}) or canh_tu_kich_ban(kb, first)
            if plan is None and len(scenes)>1 and scenes[1].get("loai") == "de_bai":
                plan = ds.get(1)
            if plan is None:
                raise ThieuMoHinh(0, "thiếu bản vẽ Blender cho vật chính của đề")
            ds[0] = plan
    transition = next((i for i, c in enumerate(scenes) if i and c.get("loai") == "de_bai"), 1)
    current = ds[0]
    for i, c in enumerate(scenes):
        c.pop("moiTruong", None)
        if i > transition and i in ds:
            current = ds[i]
        layers = c.get("netToan")
        if layers is None:
            authored = kb.get("canh") or []
            layers = authored[i].get("net_toan") if i < len(authored) else None
        if layers is not None:
            if not isinstance(layers, list) or len(layers) > 32:
                raise ValueError(f"Cảnh {i+1}: net_toan cần danh sách tối đa 32 nét")
            for line in layers:
                points = line.get("diem") if isinstance(line, dict) else None
                if not isinstance(points,list) or not 1 <= len(points) <= 120 or not all(
                    isinstance(q,list) and len(q)==2 and all(so(x) and 0<=x<=1 for x in q) for q in points
                ) or not isinstance(line.get("nhan",""),str):
                    raise ValueError(f"Cảnh {i+1}: net_toan cần điểm [x,y] chuẩn hóa từ 0 đến 1 và nhãn chữ")
            c["netToan"] = layers
        ds[i] = current
        c["xeMoDau"] = i < transition and current["loai"] == "xe_duong"
        c["phaMinhHoa"] = "thuc" if i < transition else "chuyen" if i == transition else "toan"
    quay_theo_canh(kb, props, ds, transition)
    return ds


def quay_theo_canh(kb, props, ds, transition):
    """Giai đoạn D: cảnh mở đầu / cảnh đề có quay[] riêng -> kế hoạch Blender riêng (góc máy, chuyển máy, hành động)
    và props.nhipQuay = mốc khi_noi của từng hành động (src/CanhBlender.tsx đặt khung Blender theo mốc này).
    Cảnh giải (pha 'toan') giữ góc máy cảnh 1 để nét toán chiếu không đổi."""
    if not ds or ds[0].get("loai") != "dac_ta":
        return
    scenes = props["canh"]
    for i, c in enumerate(scenes):
        c.pop("nhipQuay", None)
        if i > transition:
            continue
        plan = ds[0] if i == 0 else ke_hoach_dac_ta(kb, c.get("so", i + 1), kiem=False)
        if plan is None or not plan.get("quay"):
            continue
        ds[i] = plan
        pq = {a.get("i"): a for a in (c.get("quay") or {}).get("hanhDong") or []}
        duration = c.get("soFrame", 150) / 30
        acts = plan["quay"]["hanh_dong"]
        moc = []
        for k, a in enumerate(acts):
            t = (pq.get(a["i"]) or {}).get("t")
            moc.append(t if isinstance(t, (int, float)) else duration * (0.3 + 0.45 * k / max(1, len(acts))))
        # mốc phải tăng dần (mỗi hành động một đoạn khung Blender nối tiếp)
        for k in range(1, len(moc)):
            moc[k] = max(moc[k], moc[k - 1] + 0.4)
        c["nhipQuay"] = {"dan": 0.25, "gocMay": plan["quay"]["goc_may"], "chuyenMay": plan["quay"]["chuyen_may"],
                         "moc": [{"t": round(t, 3), "d": round(max(0.45, min(1.4, (moc[k + 1] if k + 1 < len(moc) else duration) - t - 0.05)), 3),
                                  "dongTu": a["dong_tu"], "vat": a["vat"]} for k, (t, a) in enumerate(zip(moc, acts))]}


def kiem_kich_ban(kb):
    """Chạy bộ chọn mô hình trên bản viết, trước khi tạo bất cứ tệp âm thanh nào."""
    if not isinstance(kb.get("canh"), list) or not kb["canh"]:
        raise ValueError("Kịch bản thiếu danh sách cảnh")
    props = {"canh": []}
    for i, scene in enumerate(kb["canh"]):
        if not isinstance(scene, dict) or not isinstance(scene.get("minh_hoa") or {}, dict):
            raise ValueError(f"Cảnh {i+1}: sai cấu trúc cảnh hoặc minh_hoa")
        mh = scene.get("minh_hoa") or {}
        props["canh"].append({
            "loai": scene.get("loai"), "moHinh3D": scene.get("mo_hinh_3d"),
            "minhHoa": {"loai": mh.get("loai"), "duLieu": mh.get("du_lieu")},
            "giuSanKhau": bool(scene.get("giu_san_khau")) and i > 0,
            "netToan": scene.get("net_toan"),
            "cau": [{"text": scene.get("loi_thoai") or ""}],
        })
    from thu_vien_3d.phep_thu_nhieu import lap_moi_truong_phep_thu
    if lap_moi_truong_phep_thu(kb):
        from kiem_bam_de import kiem_dac_ta_tu_sua
        errors, _ = kiem_dac_ta_tu_sua(kb)
        if errors:
            raise ValueError("Đặc tả cảnh chưa bám đề: " + "; ".join(errors[:4]))
        return {}
    for index, source in [(None, kb), *enumerate(kb["canh"])]:
        if "mo_hinh_3d" in source:
            errors = []
            if not mo_hinh_tu_de(dict(kb, mo_hinh_3d=source["mo_hinh_3d"]), errors):
                raise ThieuMoHinh(index, errors[0])
    return phan_vai(ke_hoach(kb, props), props, kb)


def anh_xem_truoc(clip):
    """Ghép lớp vật (khung cuối) lên nền dọc: ảnh gần đúng như người xem thấy, để AI nhìn hình."""
    from PIL import Image
    frames = sorted(clip.glob("orbit-*.png"), key=lambda f: int(f.stem.split("-")[1]))
    bg = Image.open(clip / "moi-truong.jpg").convert("RGBA")
    fg = Image.open(frames[-1]).convert("RGBA")
    fg = fg.resize((bg.width, round(fg.height * bg.width / fg.width)))
    bg.alpha_composite(fg, (0, (bg.height - fg.height) // 2))
    out = clip / "xem-truoc.png"
    bg.convert("RGB").save(out)
    return out


def kiem_anh_sau_dung(clip, kb):
    """AI nhìn ảnh dựng xong: thiếu thực thể chính hoặc sai bối cảnh -> dừng (không đưa ảnh lạc đề vào video)."""
    import os
    preview = anh_xem_truoc(clip)
    if (clip / "kiem-anh.json").exists():
        return   # ảnh trong cache đã được AI duyệt đạt
    if os.getenv("KIEM_ANH_3D", "1") == "0" or not (os.getenv("GEMINI_KEYS") or os.getenv("GEMINI_API_KEY")):
        print(f"Bỏ qua AI nhìn hình ({preview}): chưa có khóa hoặc KIEM_ANH_3D=0", file=sys.stderr)
        return
    from kiem_bam_de import kiem_anh
    from tao_mo_hinh import hoi_json
    try:
        ok, report = kiem_anh(preview, kb, hoi_json)
    except ValueError as e:
        print(f"AI nhìn hình lỗi ({e}); giữ ảnh, cần duyệt tay", file=sys.stderr)
        return
    (clip / "kiem-anh.json").write_text(json.dumps(report, ensure_ascii=False), encoding="utf8")
    if not ok:
        raise ValueError("Ảnh 3D chưa bám đề: thiếu " + ", ".join(report.get("thieu_chinh") or []) +
                         ("" if report.get("boi_canh_khop") is not False else "; bối cảnh sai") +
                         f". {report.get('nhan_xet', '')}")
    for x in report.get("thieu_phu") or []:
        print("AI nhìn hình: chưa rõ", x, file=sys.stderr)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kb", type=Path)
    ap.add_argument("props", type=Path, nargs="?")
    ap.add_argument("--kiem-kich-ban", action="store_true")
    ap.add_argument("--tu-tao", action="store_true", help="Tạo bản vẽ cho cảnh thiếu mô hình")
    ap.add_argument("--manim-python", default="/tmp/mv/bin/python")
    ap.add_argument("--chuan-bi", action="store_true", help="Ghi môi trường Remotion và đếm các cảnh cần Blender")
    ap.add_argument("--dem", action="store_true")
    args = ap.parse_args()
    if not args.kiem_kich_ban and args.props is None:
        ap.error("Thiếu đường dẫn props")
    try:
        kb = json.loads(args.kb.read_text(encoding="utf8"))
        # v86 KHÓA LUỒNG: bài hình học thuần tuyệt đối không đi Blender / Three.js
        if str(kb.get("luong") or "") == "hinh_hoc_thuan" or str(kb.get("mon") or "").upper() == "HINH_HOC":
            if args.chuan_bi or args.dem:
                print(0)
                return
            if args.kiem_kich_ban:
                print("Luồng hình học thuần: bỏ qua lập cảnh 3D", file=sys.stderr)
                return
            sys.exit("Luồng hình học thuần (kb.luong = hinh_hoc_thuan) không được dựng cảnh Blender / Three.js")
        if args.kiem_kich_ban:
            if args.tu_tao:
                from tao_mo_hinh import bo_sung_dac_ta, bo_sung_mo_hinh
                doi_dac_ta = bo_sung_dac_ta(kb)
                if bo_sung_mo_hinh(kb, kiem_kich_ban, ThieuMoHinh) or doi_dac_ta:
                    with tempfile.NamedTemporaryFile(dir=args.kb.parent, mode="w", delete=False, encoding="utf8") as tmp:
                        json.dump(kb, tmp, ensure_ascii=False)
                    Path(tmp.name).replace(args.kb)
            else:
                kiem_kich_ban(kb)
            return
        props = json.loads(args.props.read_text(encoding="utf8"))
        from thu_vien_3d.phep_thu_nhieu import gan_cho_canh, lap_moi_truong_phep_thu
        mt = lap_moi_truong_phep_thu(kb)
        if mt:
            # Bài xác suất nhiều vật: Three.js dựng toàn khung theo đặc tả (không cần Blender / Manim).
            print(f"Phép thử nhiều vật (Three.js): {len(mt['vat'])} vật, bối cảnh {mt['boiCanh']['mau']}, cảnh",
                  [props['canh'][i].get('so') for i in gan_cho_canh(kb, props, mt)], file=sys.stderr)
            ds = {}
        else:
            ds = phan_vai(ke_hoach(kb, props), props, kb)
    except ValueError as exc:
        if args.chuan_bi or args.kiem_kich_ban:
            report = Path("out/loi_mo_hinh.json")
            report.parent.mkdir(exist_ok=True)
            report.write_text(json.dumps({"nang":[str(exc) + ". Khai báo chi_tiet đúng kiểu, trích nguyên văn đề ở tu_de; kiểm tra tam/co và đoạn đo đúng đơn vị."]},ensure_ascii=False), encoding="utf8")
        raise
    if not args.dem:
        args.props.write_text(json.dumps(props, ensure_ascii=False), encoding="utf8")
    if args.dem or args.chuan_bi:
        print(len(ds))
        return
    if not ds:
        return
    folder = args.props.resolve().parent / "canh_3d"
    folder.mkdir(exist_ok=True)
    jobs = {}
    renderer = Path(__file__).with_name("ve_blender.py").resolve()
    from nang_cap_dinh_dang import gan_moi_truong
    # Mã thư viện vật/bối cảnh cũng quyết định ảnh: đưa vào khóa cache.
    library = b"".join(f.read_bytes() for f in sorted(renderer.with_name("thu_vien_3d").glob("*.py")))
    library += renderer.with_name("thu_vien_3d").joinpath("danh_muc.json").read_bytes()
    groups = {}
    plans = {}
    for i, scene in ds.items():
        scene = gan_moi_truong(scene, kb)
        if props.get("phongCanh") and not scene.get("moi_truong"):
            scene = dict(scene, phong_canh=props["phongCanh"])
        key = hashlib.sha256(
            renderer.read_bytes() + library + json.dumps(scene, sort_keys=True).encode()
        ).hexdigest()[:20]
        plans[key] = scene
        clip = folder / key
        clip.mkdir(exist_ok=True)
        path = clip / "projection.json"
        assets = ["moi-truong.jpg", "nen-0.jpg"] + [f"orbit-{j}.png" for j in range(16)]
        if not path.exists() or not all((clip / asset).exists() for asset in assets):
            jobs[str(path)] = scene
        groups.setdefault("canh_3d/" + key, []).append(i)
    if jobs:
        with tempfile.TemporaryDirectory() as td:
            batch = Path(td) / "batch.json"
            batch.write_text(json.dumps(jobs))
            subprocess.run(
                [
                    "blender",
                    "-b",
                    "--factory-startup",
                    "-t",
                    "4",
                    "--python-exit-code",
                    "1",
                    "-P",
                    str(renderer),
                    "--",
                    str(batch),
                ],
                check=True,
            )
    for key, scene in plans.items():
        if scene.get("loai") == "dac_ta":
            kiem_anh_sau_dung(folder / key, kb)
    with tempfile.TemporaryDirectory() as td:
        manifest = Path(td) / "manifest.json"
        manifest.write_text(json.dumps(groups))
        subprocess.run(
            [
                args.manim_python,
                str(renderer.with_name("manim_thuc_te.py")),
                str(manifest),
                str(args.props.resolve()),
            ],
            check=True,
        )


if __name__ == "__main__":
    main()
