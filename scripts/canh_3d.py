"""Chọn bối cảnh từ dữ kiện của bài; chuyển danh sách hình khối sang Blender một lần mỗi video."""

import argparse
import hashlib
import json
import math
import re
from pathlib import Path
import subprocess
import tempfile


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
    if kb.get("mo_hinh_3d"):
        raise ValueError("Mô hình 3D không khớp dữ kiện đề hoặc có chi tiết không hợp lệ")
    if any(isinstance(v, dict) and v.get("loai") in ("do_thi", "hinh_hoc") for v in vat):
        return None
    simple = canh_mot_vat(de)
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


MET = {"km": 1000, "m": 1, "mét": 1, "cm": 0.01, "mm": 0.001}
DO_DAI = r"(\d+(?:[.,]\d+)?)\s*(km|cm|mm|mét|m)"


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


def mo_hinh_tu_de(kb):
    # Mô hình tự do gồm các chi tiết ghép chung một hệ tọa độ. Chỉ nhận dữ liệu khai báo.
    mo = kb.get("mo_hinh_3d")
    if not isinstance(mo, dict):
        return None
    parts = mo.get("chi_tiet")
    if not isinstance(parts, list) or not 1 <= len(parts) <= 80:
        return None
    de = " ".join(str(kb.get("de_bai") or "").casefold().split())
    for item in parts:
        if not isinstance(item, dict):
            return None
        source = " ".join(str(item.get("tu_de") or "").casefold().split())
        if (
            len(source) < 2
            or source not in de
            or item.get("hinh")
            not in ("hop", "tru", "cau", "non", "thuyen", "bang_chuyen", "lang_tru", "khoi_tiet_dien")
            or (item["hinh"] == "khoi_tiet_dien" and not tang_hop_le(item.get("tang")))
            or (item["hinh"] == "lang_tru" and not bien_dang_loi(item.get("day")))
            or (item["hinh"] == "thuyen" and not re.search("thuyền|tàu|ca nô|xuồng", source))
            or (item["hinh"] == "bang_chuyen" and not re.search("băng (?:chuyền|tải)", source))
            or not bo_ba(item.get("dich_chuyen", [0, 0, 0]))
            or not bo_ba(item.get("tam"))
            or not bo_ba(item.get("co"))
            or min(item["co"]) <= 0
            or not isinstance(item.get("vat_lieu", "da"), str)
            or not bo_ba(item.get("xoay", [0, 0, 0]))
        ):
            return None
    if re.search(r"bể.{0,80}hình hộp.{0,40}không (?:có )?nắp", de):
        if not be_khong_nap(parts, de):
            return None
    lines = mo.get("doan_toan", [])
    if not isinstance(lines, list) or len(lines) > 12:
        return None
    centers = {}
    for part in parts:
        if "id" in part:
            name = part["id"]
            if not isinstance(name, str) or not name or name in centers:
                return None
            centers[name] = [a + b for a, b in zip(part["tam"], part.get("dich_chuyen", [0, 0, 0]))]
    segments = []
    for raw in lines:
        if not isinstance(raw, dict):
            return None
        line = dict(raw)
        for key in ("a", "b"):
            pt = line.get(key)
            if isinstance(pt, dict):
                name = pt.get("vat")
                offset = pt.get("lech", [0, 0, 0])
                if not isinstance(name, str) or name not in centers or not bo_ba(offset):
                    return None
                line[key] = [a + b for a, b in zip(centers[name], offset)]
            if not bo_ba(line.get(key)):
                return None
        segments.append(line)
        quote = " ".join(str(line.get("tu_de") or "").casefold().split())
        length = math.dist(line["a"], line["b"])
        if len(quote) < 2 or quote not in de or length < 1e-6:
            return None
        if "do_dai" in line:
            m = re.fullmatch(DO_DAI, str(line["do_dai"]).casefold())
            if not m or not re.search(r"(?<![\d.,])" + re.escape(m[0]) + r"(?!\w)", quote):
                return None
            meters = float(m[1].replace(",", ".")) * MET[m[2]]
            if not math.isclose(length, meters, rel_tol=0.002):
                return None
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


def ke_hoach(kb, props):
    from xe_3d import CAR
    de = str(kb.get("de_bai") or "")
    car_problem = CAR.search(de) and not re.search(r"hai (?:chiếc )?xe|hai (?:chiếc )?ô tô|xe thứ hai|ngược chiều nhau",de,re.I)
    practical = kb.get("mon") == "THUC_TE" or (not kb.get("mon") and str(kb.get("id", "")).startswith("TT"))
    if kb.get("mon") == "HINH_HOC":
        return {}
    physical_kinds = set("nguoi the the_bai xuc_xac dong_xu hop_bi tui hop_qua dong_ho dien_thoai bong_bay vong_quay cua banh ban_tron khoi_hop tru non cau toa_nha xe cay thang canh_that".split())
    ds = {}
    scenes = props.get("canh", [])
    for i, c in enumerate(scenes):
        local = c.get("moHinh3D")
        mh = c.get("minhHoa") or {}
        data = mh.get("duLieu")
        objects = data.get("vat") or [] if isinstance(data,dict) else []
        kinds = {v.get("loai") for v in objects if isinstance(v,dict)}
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
        if c.get("giuSanKhau") and i-1 in ds and local is None:
            actions = data.get("hanh_dong") if isinstance(data,dict) else []
            if not objects and not actions and ds[i-1]["loai"] == "phep_thu":
                ds[i] = ds[i-1]
                continue
            if not physical:
                raise ValueError(f"Cảnh {i + 1}: khai báo mo_hinh_3d cho trạng thái tiếp theo của vật được giữ")

        if local is None:
            native = phep_thu_3d(c)
            if native:
                ds[i] = native
                continue
            if not physical and not (opening and (practical or kb.get("mo_hinh_3d"))):
                continue
        if local is not None:
            plan = mo_hinh_tu_de(dict(kb, mo_hinh_3d=local))
            if not plan:
                raise ValueError(f"Mô hình riêng của cảnh {i + 1} sai dữ kiện hoặc kích thước")
        else:
            plan = canh_tu_kich_ban(kb, mh)
        if plan and plan["loai"] == "lap_ghep" and not plan.get("doan_toan"):
            plan["giu_vat"] = True
        if plan and (local is not None or physical or plan not in ds.values()):
            ds[i] = plan
        elif physical and not plan:
            raise ValueError(f"Cảnh {i + 1}: cần mo_hinh_3d theo đề để dựng vật {', '.join(sorted(kinds))}")
    return ds


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kb", type=Path)
    ap.add_argument("props", type=Path)
    ap.add_argument("--manim-python", default="/tmp/mv/bin/python")
    ap.add_argument("--dem", action="store_true")
    args = ap.parse_args()
    props = json.loads(args.props.read_text())
    ds = ke_hoach(json.loads(args.kb.read_text()), props)
    if args.dem:
        print(len(ds))
        return
    if not ds:
        return
    folder = args.props.resolve().parent / "canh_3d"
    folder.mkdir(exist_ok=True)
    jobs = {}
    renderer = Path(__file__).with_name("ve_blender.py").resolve()
    groups = {}
    for i, scene in ds.items():
        key = hashlib.sha256(
            renderer.read_bytes() + json.dumps(scene, sort_keys=True).encode()
        ).hexdigest()[:20]
        clip = folder / key
        clip.mkdir(exist_ok=True)
        path = clip / "projection.json"
        assets = ["xe.png","duong.png"] if scene["loai"]=="xe_duong" else [f"orbit-{j}.png" for j in range(16)]
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
