"""Chiếu lại các cạnh Blender bằng Manim và dựng từng dòng lời giải theo kịch bản."""

import hashlib
import json
from pathlib import Path
import sys
import re

import numpy as np
from PIL import Image
from manim import Camera, Dot, Line, Text, tempconfig
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


def stage_diagram(stage):
    """Dựng số liệu từ sân khấu kịch bản cũ trên mặt phẳng Manim."""
    import ast
    import operator
    from manim import VGroup, Rectangle, Circle
    groups = []
    def caption(value):
        return Text(str(value), font="Be Vietnam Pro").scale_to_fit_height(.48)
    for obj in stage.get("vat", []):
        kind = obj.get("loai")
        data = obj.get("ds") or []
        group = VGroup()
        if kind == "khoi_hop":
            sizes = obj.get("kich_thuoc")
            if not isinstance(sizes,list) or len(sizes)!=3 or not all(isinstance(v,(int,float)) and v>0 for v in sizes):
                continue
            w,d,h = np.array(sizes) / max(sizes) * 5
            u,v,z = np.array([w,0,0]),np.array([.55*d,.42*d,0]),np.array([0,h,0])
            base = [np.zeros(3),u,u+v,v]
            from manim import DashedLine
            for i,a in enumerate(base):
                b = base[(i+1)%4]
                group.add((DashedLine if i in (2,3) else Line)(a,b),Line(a+z,b+z),
                          (DashedLine if i==3 else Line)(a,a+z))
            for label,pos in zip(obj.get("nhan_kich_thuoc",[]), (u/2+[0,-.4,0],u+v/2+[.8,0,0],z/2+[-.8,0,0])):
                if label:
                    group.add(caption(label).move_to(pos))
        elif kind == "do_thi":
            xmin, xmax, ymin, ymax = (obj.get(k) for k in ("x_tu","x_den","y_tu","y_den"))
            if None in (xmin,xmax,ymin,ymax) or xmax <= xmin or ymax <= ymin:
                continue
            ops = {ast.Add:operator.add, ast.Sub:operator.sub, ast.Mult:operator.mul, ast.Div:operator.truediv, ast.Pow:operator.pow}
            def value(node, x):
                if isinstance(node,ast.Constant) and type(node.value) in (int,float):
                    return float(node.value)
                if isinstance(node,ast.Name) and node.id == "x":
                    return x
                if isinstance(node,ast.UnaryOp) and isinstance(node.op,ast.USub):
                    return -value(node.operand,x)
                if isinstance(node,ast.BinOp) and type(node.op) in ops:
                    return ops[type(node.op)](value(node.left,x),value(node.right,x))
                raise ValueError("Hàm chưa hỗ trợ")
            try:
                tree = ast.parse(obj["ham"].replace("^","**"),mode="eval").body
            except (SyntaxError, KeyError):
                continue
            prev = None
            for x in np.linspace(xmin,xmax,160):
                try:
                    y = value(tree,float(x))
                    point = [(x-xmin)/(xmax-xmin)*12-6,(y-ymin)/(ymax-ymin)*6-3,0] if ymin <= y <= ymax else None
                except (ArithmeticError,TypeError,ValueError):
                    point = None
                if point is not None and prev is not None:
                    group.add(Line(prev,point,color="#62DEC9"))
                prev = point
            if not group:
                continue
            group.add(Line([-6,-3,0],[6,-3,0]),Line([-6,-3,0],[-6,3,0]))
            for title,pos in zip(obj.get("nhan_truc",[]),([6,-3.45,0],[-6,3.5,0])):
                group.add(caption(title).move_to(pos))
        elif kind == "banh" and 0 < obj.get("so_luong",0) <= 20:
            count = obj["so_luong"]
            group.add(Circle(radius=2.8))
            for i in range(count):
                angle = i*2*np.pi/count
                group.add(Line([0,0,0],[2.8*np.cos(angle),2.8*np.sin(angle),0]))
                if i < len(data) and data[i]:
                    mid = angle+np.pi/count
                    group.add(caption(data[i]).move_to([1.8*np.cos(mid),1.8*np.sin(mid),0]))
        elif kind in ("thanh","dong_ho_do","bieu_do_cot"):
            vals = obj.get("ds_so",[]) if kind=="bieu_do_cot" else [obj.get("gia_tri")]
            if not vals or not all(isinstance(v,(int,float)) and v>=0 for v in vals):
                continue
            names = data if kind=="bieu_do_cot" else [obj.get("nhan","")]
            maximum = max(1,*vals)
            for i,v in enumerate(vals):
                label = names[i] if i<len(names) else ""
                shown = obj.get("gia_tri_chu",v) if kind!="bieu_do_cot" else v
                bar = Rectangle(width=max(.012,8*v/maximum),height=.32,color="#62DEC9",fill_opacity=.8)
                group.add(VGroup(caption(f"{label}   {shown}"),bar).arrange([0,-1,0],aligned_edge=[-1,0,0]))
            group.arrange([0,-1,0],buff=.5,aligned_edge=[-1,0,0])
        elif kind in ("danh_sach","the","nhan","chu"):
            for label in [obj.get("noi_dung"),*data,obj.get("gia_tri_chu")]:
                if label:
                    group.add(caption(label))
            group.arrange([0,-1,0],buff=.28)
        if len(group):
            groups.append(group)
    if not groups:
        return []
    layout = VGroup(*groups).arrange([0,-1,0],buff=.6)
    layout.scale(min(2.1,14/max(.01,layout.width),8/max(.01,layout.height)))
    return [layout]


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
        for key, indexes in json.loads(manifest.read_text()).items():
            folder = root / key
            projection = json.loads((folder / "projection.json").read_text())
            frames = len(list(folder.glob("orbit-*.png")))
            for i in range(frames):
                with Image.open(folder / f"orbit-{i}.png") as image:
                    if image.mode != "RGBA" or image.getchannel("A").getextrema() != (0, 255):
                        raise ValueError(f"Khung Blender {key}/{i} thiếu vật hoặc thiếu nền trong suốt")
            if isinstance(projection, dict):
                palette = {"do":"#fa6868","xanh_duong":"#47a9ff","xanh_la":"#60cf83","vang":"#ffd057",
                           "trang":"#ffffff","tim":"#be8bff","cam":"#ffa040","den":"#556070"}
                objects = []
                for mark in projection["marks"]:
                    pos = [*( (np.array(mark["xy"])-.5) * [16,10]),0]
                    value = mark["value"]
                    if projection["vat"] == "hop_bi":
                        objects.append(Dot(pos, radius=.24, color=palette[value]))
                    else:
                        objects.append(Text(value, font="Be Vietnam Pro", weight="BOLD").scale_to_fit_height(.60).move_to(pos))
                if not objects:
                    raise ValueError(f"Phép thử {key} thiếu điểm kết quả")
                camera_image(cam,objects).save(folder / "net-0.png")
                last = 0
            else:
                last, edges = diagram(cam, folder)
            garden_labels = None
            for index in indexes:
                c = props["canh"][index]
                c["chuoi3D"] = dict(thuMuc=key, khungThat=frames, netCuoi=last, nenDung=key+"/moi-truong.jpg")
                if c.get("phaMinhHoa") != "toan":
                    continue
                stage = (c.get("minhHoa") or {}).get("duLieu") or {}
                objects = []
                if c.get("netToan"):
                    for line in c["netToan"]:
                        coords = [[(x-.5)*14,(.5-y)*8,0] for x,y in line["diem"]]
                        if len(coords)==1:
                            objects.append(Dot(coords[0],color="#7EE9DB"))
                        objects.extend(Line(a,b,color="#7EE9DB") for a,b in zip(coords,coords[1:]) if a!=b)
                        if line.get("nhan"):
                            label = Text(line["nhan"],font="Be Vietnam Pro").scale_to_fit_height(.48)
                            label.move_to(np.array(coords[-1])+[0,.42,0])
                            objects.append(label)
                elif isinstance(stage, dict):
                    objects = stage_diagram(stage)
                if objects:
                    file = key + f"/bai-{index}.png"
                    camera_image(cam,objects).save(root/file)
                    c["chuoi3D"]["hinhGiai"] = file
                elif isinstance(projection,list):
                    for cue in c.get("cau", []):
                        match = re.search(r"\b([a-z]) là cạnh song song.{0,35}\b([a-z]) là (?:hai )?cạnh vuông góc",cue["text"].casefold())
                        if match:
                            labels = label_garden(folder,edges,match.groups())
                            if labels:
                                garden_labels = key + "/nhan-" + "".join(match.groups()) + ".png"
                                camera_image(cam,labels).save(root/garden_labels)
                                c["mocNhanNet"] = cue["bat"]
                    if garden_labels:
                        c["nhanNet"] = garden_labels
        nhip_xe(props, [i for i,c in enumerate(props["canh"]) if c.get("xeMoDau")])
        for c in props["canh"]:
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
