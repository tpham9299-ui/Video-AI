"""Chiếu lại các cạnh Blender bằng Manim và dựng từng dòng lời giải theo kịch bản."""

import hashlib
import json
from pathlib import Path
import sys
import re

import numpy as np
from PIL import Image
from manim import Camera, Line, Text, tempconfig
from manimpango import register_font
from manim_hinh import chuan_tex, tao_cong_thuc, nap_phong


def camera_image(cam, objects):
    cam.reset()
    cam.capture_mobjects(objects)
    return cam.get_image()


def diagram(cam, folder):
    lines = json.loads((folder / "projection.json").read_text())
    if not lines:
        raise ValueError("Bản vẽ toán không có cạnh nhìn thấy")
    target = [p for line in lines if line["flat"] for p in line["flat"]]
    rotate = target and np.ptp(target, axis=0)[1] > np.ptp(target, axis=0)[0]

    def oriented(pt):
        return np.array([pt[1], -pt[0]] if rotate else pt)

    if target:
        target = [oriented(p) for p in target]
        lo, hi = np.min(target, axis=0), np.max(target, axis=0)
        center = (lo + hi) / 2
        scale = 0.82 * min(v / max(d, 1e-9) for v, d in zip((16, 10), hi - lo))
    for i in range(16 if target else 1):
        t = i / 15
        progress = t * t * (3 - 2 * t)
        objects = []
        for line in lines:
            ends = []
            for j, key in enumerate(("a", "b")):
                start = (np.array(line[key]) - 0.5) * [16, 10]
                end = (oriented(line["flat"][j]) - center) * scale if line["flat"] else start
                ends.append([*(start + progress * (end - start)), 0])
            objects.append(Line(*ends, color=line["color"], stroke_width=10))
        labels = []
        for segment, edge in zip(lines, objects):
            if not segment.get("nhan"):
                continue
            text = Text(
                segment["nhan"], font="Be Vietnam Pro", weight="BOLD", color="#FFF2B5"
            ).scale_to_fit_height(0.56)
            vec = edge.get_vector()
            normal = np.array([-vec[1], vec[0], 0]) / max(0.001, np.linalg.norm(vec))
            if normal[1] < 0:
                normal *= -1
            for shift in (0.65, -0.65, 1.25, -1.25):
                pos = edge.get_center() + shift * normal
                pos[0] = np.clip(pos[0], -7.8 + text.width / 2, 7.8 - text.width / 2)
                pos[1] = np.clip(pos[1], -4.6, 4.6)
                text.move_to(pos)
                if all(
                    abs(pos[0] - other.get_x()) > (text.width + other.width) / 2 + 0.1
                    or abs(pos[1] - other.get_y()) > 0.68
                    for other in labels
                ):
                    labels.append(text)
                    break
        camera_image(cam, objects + labels).save(folder / f"net-{i}.png")
    return (15 if target else 0), objects


def label_garden(folder, lines, symbols):
    # Cạnh màu cam là tường. Đặt nhãn ngoài ba cạnh rào.
    edge_data = json.loads((folder / "projection.json").read_text())
    wall = [i for i, l in enumerate(edge_data) if l["color"] == "#FFB968"]
    if len(lines) != 4 or len(wall) != 1 or not all(l["flat"] for l in edge_data):
        return []
    center = np.mean([edge.get_center() for edge in lines], axis=0)
    labels = []
    for i, edge in enumerate(lines):
        if i == wall[0]:
            continue
        direction = edge.get_center() - center
        symbol = symbols[0 if (i - wall[0]) % 2 == 0 else 1]
        label = tao_cong_thuc(symbol).set_color("#FFE9A0").scale_to_fit_height(0.58)
        label.move_to(edge.get_center() + direction / np.linalg.norm(direction) * 0.50)
        labels.append(label)
    return labels


def main():
    manifest = Path(sys.argv[1])
    props_path = Path(sys.argv[2])
    props = json.loads(props_path.read_text())
    register_font(str(Path(__file__).resolve().parents[1] / "public/fonts/BeVietnamPro-Bold.ttf"))
    nap_phong(str(Path(__file__).resolve().parents[1] / "public"))
    root = props_path.parent
    for c in props["canh"]:
        for field in ("nhipXe", "chuoi3D", "nhanNet", "mocNhanNet", "anhCanh3D", "congThucManim"):
            c.pop(field, None)
    with tempconfig(
        dict(
            pixel_width=960,
            pixel_height=600,
            frame_width=16,
            frame_height=10,
            background_opacity=0,
            media_dir=str(manifest.parent / "media"),
        )
    ):
        cam = Camera()
        (manifest.parent / "media" / "Tex").mkdir(parents=True, exist_ok=True)
        from xe_3d import nhip_xe
        car_indexes = []
        diagram_lines = {}
        for key, indexes in json.loads(manifest.read_text()).items():
            folder = root / key
            projection = json.loads((folder / "projection.json").read_text())
            car = isinstance(projection,dict) and "xeDuong" in projection
            images = ["xe.png","duong.png"] if car else [f"orbit-{j}.png" for j in range(16)]
            for name in images:
                with Image.open(folder/name) as img:
                    if img.mode != "RGBA" or img.getchannel("A").getextrema() != (0, 255):
                        raise ValueError(f"Khung Blender {key}/{name} thiếu vật hoặc thiếu nền trong suốt")
            if car:
                for i in indexes:
                    props["canh"][i]["chuoi3D"]=dict(thuMuc=key,netCuoi=0,xeDuong=projection["xeDuong"])
                car_indexes.extend(indexes)
                continue
            if isinstance(projection, dict) and projection.get("phepThu"):
                for index in indexes:
                    c = props["canh"][index]
                    hold = c.get("giuSanKhau") and not c.get("moHinh3D") and index-1 in indexes
                    c["chuoi3D"] = dict(thuMuc=key, netCuoi=0, phepThu=True, giuVatCuoi=bool(hold))
                continue
            last, diagram_lines[key] = diagram(cam, folder)
            for index in indexes:
                props["canh"][index]["chuoi3D"] = dict(
                    thuMuc=key,
                    netCuoi=last,
                    coThuoc=any(
                        x.get("nhan") for x in json.loads((folder / "projection.json").read_text())
                    ),
                )
        nhip_xe(props,car_indexes)
        carry = None
        label_file = None
        for c in props["canh"]:
            if c.get("nhipXe") or (c.get("chuoi3D") or {}).get("phepThu"):
                carry = None
                label_file = None
            elif c.get("chuoi3D"):
                carry = c["chuoi3D"]
                label_file = None
            elif carry:
                mh = c.get("minhHoa") or {}
                du = mh.get("duLieu") or {}
                if (
                    c["loai"] in ("de_bai", "mo_hinh_hoa", "y_do", "tinh_toan")
                    and mh.get("loai") in ("san_khau", "khong", "")
                    and isinstance(du, dict)
                    and not du.get("vat")
                ):
                    c["chuoi3D"] = dict(carry, giuNet=True)
                else:
                    carry = None
            if carry and c.get("chuoi3D"):
                key = carry["thuMuc"]
                for cue in c.get("cau", []):
                    match = re.search(
                        r"\b([a-z]) là cạnh song song.{0,35}\b([a-z]) là (?:hai )?cạnh vuông góc",
                        cue["text"].casefold(),
                    )
                    if match:
                        labels = label_garden(root / key, diagram_lines[key], match.groups())
                        if labels:
                            label_file = key + "/nhan-" + "".join(match.groups()) + ".png"
                            camera_image(cam, labels).save(root / label_file)
                            c["mocNhanNet"] = cue["bat"]
                            break
                if label_file:
                    c["nhanNet"] = label_file
            if not c.get("noiDung") or c["loai"] in ("mo_dau", "hook", "de_bai"):
                continue
            assets = []
            for tex in c["noiDung"]:
                name = "canh_3d/ct-" + hashlib.sha256(("be-v81:" + tex).encode()).hexdigest()[:20] + ".png"
                path = root / name
                if not path.exists():
                    obj = tao_cong_thuc(chuan_tex(tex)).set_color("#FFD43B")
                    obj.scale(min(14.8 / max(obj.width, 0.01), 2 / max(obj.height, 0.01)))
                    img = camera_image(cam, [obj])
                    img.crop(img.getchannel("A").getbbox()).save(path)
                assets.append(name)
            c["congThucManim"] = assets
    props_path.write_text(json.dumps(props, ensure_ascii=False))


if __name__ == "__main__":
    main()
