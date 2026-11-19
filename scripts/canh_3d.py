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
            or item.get("hinh") not in ("hop", "tru", "cau", "non")
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
    return {"loai": "lap_ghep", "chi_tiet": parts}


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


def ke_hoach(kb, props):
    if kb.get("mon") != "THUC_TE" and not (not kb.get("mon") and str(kb.get("id", "")).startswith("TT")):
        return {}
    ds = {}
    for i, c in enumerate(props.get("canh", [])):
        if c.get("loai") not in ("mo_dau", "hook", "de_bai", "mo_hinh_hoa"):
            continue
        plan = canh_tu_kich_ban(kb, c.get("minhHoa") or {})
        if plan and plan not in ds.values():
            ds[i] = plan
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
        if not path.exists() or not all((clip / f"orbit-{j}.png").exists() for j in range(16)):
            jobs[str(path)] = scene
        groups["canh_3d/" + key] = [i]
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
