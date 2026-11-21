"""Bộ dựng ảnh minh họa 3D tĩnh bằng Blender Cycles, chạy trên CPU."""

import json
import math
import os
import random
import re
from pathlib import Path
import sys

import bpy
from mathutils import Euler, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from thu_vien_3d.moi_truong import dung_moi_truong  # noqa: E402  (thuần Python, dùng chung với bộ xếp chỗ)

HDRI = Path(__file__).resolve().parents[1] / "assets" / "hdri"


COLORS = {
    "xanh_duong": (0.035, 0.31, 0.88),
    "xanh_la": (0.07, 0.63, 0.22),
    "cam": (0.96, 0.31, 0.05),
    "tim": (0.54, 0.17, 0.82),
    "den": (0.022, 0.027, 0.03),
    "go": (0.43, 0.22, 0.095),
    "la": (0.23, 0.46, 0.17),
    "co": (0.34, 0.48, 0.21),
    "dat": (0.29, 0.17, 0.085),
    "gach": (0.61, 0.25, 0.13),
    "da": (0.55, 0.55, 0.49),
    "thep": (0.38, 0.47, 0.49),
    "nuoc": (0.045, 0.35, 0.47),
    "kinh": (0.085, 0.26, 0.34),
    "vang": (0.96, 0.67, 0.16),
    "trang": (0.89, 0.87, 0.75),
    "do": (0.73, 0.085, 0.045),
    "toi": (0.075, 0.11, 0.14),
    "nhom": (0.80, 0.81, 0.83),
    "hong": (0.92, 0.36, 0.55),
    "nau": (0.30, 0.16, 0.07),
    "xam": (0.33, 0.35, 0.37),
    "bang": (0.03, 0.12, 0.08),
    "da_nguoi": (0.80, 0.53, 0.38),
}

# Kiểu bề mặt của từng vật liệu: (độ nhám, kim loại, lớp phủ bóng). Vật liệu không có ở đây là sơn/nhựa mờ.
BE_MAT = {
    "thep": (0.30, 1.0, 0.0), "nhom": (0.22, 1.0, 0.0), "vang": (0.34, 0.0, 0.35),
    "kinh": (0.03, 0.0, 0.0), "nuoc": (0.04, 0.0, 0.0), "trang": (0.42, 0.0, 0.25),
    "do": (0.36, 0.0, 0.45), "xanh_duong": (0.36, 0.0, 0.45), "xanh_la": (0.38, 0.0, 0.35),
    "cam": (0.36, 0.0, 0.40), "tim": (0.36, 0.0, 0.40), "den": (0.45, 0.0, 0.2),
    "go": (0.62, 0.0, 0.0), "da": (0.78, 0.0, 0.0), "gach": (0.85, 0.0, 0.0),
    "dat": (0.95, 0.0, 0.0), "co": (0.9, 0.0, 0.0), "la": (0.6, 0.0, 0.0), "toi": (0.5, 0.0, 0.1),
}


def dat_dau_vao(shader, ten, gia_tri):
    sock = shader.inputs.get(ten)
    if sock is not None:
        sock.default_value = gia_tri


def tao_vat_lieu(name, rgb):
    """Vật liệu PBR: nhám thay đổi nhẹ theo vết bẩn/vân, kính và nước truyền sáng, kim loại phản chiếu, sơn có lớp bóng."""
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    tree = mat.node_tree
    shader = tree.nodes.get("Principled BSDF")
    rough, metal, coat = BE_MAT.get(name, (0.5, 0.0, 0.2))
    dat_dau_vao(shader, "Base Color", (*rgb, 1))
    dat_dau_vao(shader, "Metallic", metal)
    dat_dau_vao(shader, "Coat Weight", coat)
    dat_dau_vao(shader, "Coat Roughness", 0.12)
    if name in ("kinh", "nuoc"):
        dat_dau_vao(shader, "Transmission Weight", 0.92 if name == "kinh" else 0.85)
        dat_dau_vao(shader, "IOR", 1.45 if name == "kinh" else 1.33)
        dat_dau_vao(shader, "Roughness", rough)
        return mat
    # Vết nhám ngẫu nhiên: bề mặt thật không bao giờ đều tuyệt đối (đây là khác biệt lớn nhất giữa "đồ chơi" và "ảnh thật").
    noise = tree.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 9
    noise.inputs["Detail"].default_value = 6
    rmap = tree.nodes.new("ShaderNodeMapRange")
    rmap.inputs["To Min"].default_value = rough * 0.75
    rmap.inputs["To Max"].default_value = min(1, rough * 1.3 + 0.04)
    tree.links.new(noise.outputs["Fac"], rmap.inputs["Value"])
    tree.links.new(rmap.outputs["Result"], shader.inputs["Roughness"])
    if name in ("gach", "dat", "co", "go", "nuoc", "da", "la"):
        detail = tree.nodes.new("ShaderNodeTexWave" if name == "go" else "ShaderNodeTexNoise")
        if name == "go":
            detail.wave_type = "BANDS"
            detail.inputs["Scale"].default_value = 7
            detail.inputs["Distortion"].default_value = 2.5
            detail.inputs["Detail"].default_value = 4
        else:
            detail.inputs["Scale"].default_value = 38
            detail.inputs["Detail"].default_value = 8
        ramp = tree.nodes.new("ShaderNodeValToRGB")
        for elem, gain in zip(ramp.color_ramp.elements, (0.86, 1.06) if name == "go" else (0.62, 1.15)):
            elem.color = (*[min(1, v * gain) for v in rgb], 1)
        tree.links.new(detail.outputs["Fac"], ramp.inputs[0])
        tree.links.new(ramp.outputs[0], shader.inputs["Base Color"])
        bump = tree.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.02 if name == "go" else 0.22
        bump.inputs["Distance"].default_value = 0.03
        tree.links.new(detail.outputs["Fac"], bump.inputs["Height"])
        tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    return mat


def vat(hinh, tam, co, mau, xoay=(0, 0, 0)):
    pos = dict(location=tam)
    if hinh == "hop":
        bpy.ops.mesh.primitive_cube_add(size=1, **pos)
    elif hinh == "tru":
        bpy.ops.mesh.primitive_cylinder_add(vertices=64, **pos)
    elif hinh == "non":
        bpy.ops.mesh.primitive_cone_add(vertices=64, **pos)
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, **pos)
    ob = bpy.context.object
    ob.dimensions = co
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.rotation_euler = tuple(map(math.radians, xoay))
    # Bề mặt cong phải mượt (trước đây trụ/nón hiện rõ từng mặt phẳng, trông như mô hình giấy).
    # Mép được bo nhẹ để bắt sáng; WEIGHTED_NORMAL giữ mặt phẳng phẳng, mép tròn tròn.
    for face in ob.data.polygons:
        face.use_smooth = True
    if hinh in ("hop", "tru", "non"):
        bevel = ob.modifiers.new("Bo mép", "BEVEL")
        bevel.width = min(co) * (0.03 if hinh == "hop" else 0.02)
        bevel.segments = 3
        bevel.limit_method = "ANGLE"
        bevel.harden_normals = True
        wn = ob.modifiers.new("Pháp tuyến", "WEIGHTED_NORMAL")
        wn.keep_sharp = True
    ob.data.materials.append(vat_lieu(mau))
    return ob


def vat_lieu(ten):
    """Vật liệu theo tên danh mục hoặc mã màu #RRGGBB (màu đề nêu / màu bối cảnh)."""
    if ten in MATS:
        return MATS[ten]
    if isinstance(ten, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", ten):
        MATS[ten] = tao_vat_lieu(ten, tuple((int(ten[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5)))
        return MATS[ten]
    return MATS["da"]


def nguoi(x, y, h):
    def part(shape, xx, zz, sx, sy, sz, mat):
        vat(shape, (x + xx * h, y, zz * h), (sx * h, sy * h, sz * h), mat)

    for side in [-1, 1]:
        part("tru", side * 0.068, 0.22, 0.105, 0.12, 0.44, "toi")
        part("cau", side * 0.16, 0.59, 0.08, 0.11, 0.32, "vang")
    part("cau", 0, 0.62, 0.31, 0.2, 0.43, "vang")
    part("cau", 0, 0.905, 0.175, 0.175, 0.19, "go")


def nha(x, y, w, d, h, tong=None, trong=None):
    vat("hop", (x, y, h / 2), (w, d, h), "trang")
    vat("hop", (x, y, h * 0.98), (w * 1.05, d * 1.05, 0.04 * h), "da")
    cot = math.ceil(math.sqrt(tong * 1.4)) if tong else 4
    rows = math.ceil(tong / cot) if tong else 7
    for i in range(tong or cot * rows):
        cx = x + w * ((i % cot + 0.5) / cot - 0.5) * 0.93
        cz = h * (0.12 + 0.8 * (i // cot + 0.5) / rows)
        mau = "kinh" if trong is None or i >= tong - trong else "vang"
        vat("hop", (cx, y - d * 0.507, cz), (w * 0.60 / cot, d * 0.035, h * 0.51 / rows), mau)


def vuon(s):
    w, d = s["rong"], s["dai"]
    u = min(w, d)
    vat("hop", (w / 2, d / 2, -u * 0.017), (w, d, u * 0.034), "dat")
    # Bản sao dùng chung lưới lá; các luống rau làm rõ hướng dài của mảnh đất.
    rng = random.Random(17)
    leaf = vat("cau", (0, 0, 0), (1, 1, 1), "la")
    for col in range(8):
        for row in range(14):
            cx, cy = w * (col + 0.5) / 8, d * (row + 0.5) / 14
            radius = min(w / 8, d / 14) * 0.34
            for j in range(5):
                a = j * math.tau / 5 + rng.uniform(-0.22, 0.22)
                ob = leaf.copy()
                bpy.context.collection.objects.link(ob)
                ob.location = (
                    cx + math.cos(a) * radius * 0.4,
                    cy + math.sin(a) * radius * 0.4,
                    radius * 0.24,
                )
                ob.rotation_euler = (0, -0.42, a)
                ob.scale = (radius * 1.2, radius * 0.56, radius * 0.27)
    bpy.data.objects.remove(leaf, do_unlink=True)
    edges = {
        "trai": ((0, 0), (0, d)),
        "phai": ((w, 0), (w, d)),
        "tren": ((0, d), (w, d)),
        "duoi": ((0, 0), (w, 0)),
    }
    for name, (a, b) in edges.items():
        dx, dy = b[0] - a[0], b[1] - a[1]
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        if name == s["tuong"]:
            vat("hop", (*mid, u * 0.09), (dx or u * 0.025, dy or u * 0.025, u * 0.18), "gach")
        elif s["rao"] is True or name in (s["rao"] or []):
            for i in range(9):
                vat(
                    "tru",
                    (a[0] + dx * i / 8, a[1] + dy * i / 8, u * 0.047),
                    (u * 0.012, u * 0.012, u * 0.094),
                    "thep",
                )
            for i in range(1, 5):
                vat("hop", (*mid, u * i * 0.018), (dx or u * 0.004, dy or u * 0.004, u * 0.004), "thep")


def vo_khoi(profile, size, taper, mat):
    # Hai vành có cùng thứ tự đỉnh, đáy tàu được thu nhỏ theo phương ngang.
    x, y, z = size
    xs, ys = zip(*profile)

    def coord(a, lo, hi):
        return (a - lo) / (hi - lo) - 0.5

    outline = [(coord(a, min(xs), max(xs)) * x, coord(b, min(ys), max(ys)) * y) for a, b in profile]
    if sum(a * d - b * c for (a, b), (c, d) in zip(outline, outline[1:] + outline[:1])) < 0:
        outline.reverse()
    n = len(outline)
    vertices = [(a * k, b * k, h * z) for k, h in ((taper, -0.5), (1, 0.5)) for a, b in outline]
    faces = [list(reversed(range(n))), list(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    mesh = bpy.data.meshes.new("Vỏ")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    ob = bpy.data.objects.new("Vỏ", mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(vat_lieu(mat) if mat in MATS or str(mat).startswith("#") else MATS["go"])
    return ob


def khoi_tiet_dien(p):
    n = 32
    verts = [
        (cx + rx * math.cos(i * math.tau / n), cy + ry * math.sin(i * math.tau / n), z)
        for z, cx, cy, rx, ry in p["tang"]
        for i in range(n)
    ]
    base = len(verts) - n
    faces = [tuple(reversed(range(n))), tuple(range(base, base + n))]
    for k in range(0, base, n):
        faces.extend((k + i, k + (i + 1) % n, k + n + (i + 1) % n, k + n + i) for i in range(n))
    return tao_luoi(p, verts, faces, tiet_dien=True)


def tao_luoi(p, verts, faces, tiet_dien=False):
    # Chuẩn hóa quanh tâm trước khi đặt vật vào hệ tọa độ chung của đề.
    lo = list(map(min, zip(*verts)))
    hi = list(map(max, zip(*verts)))
    verts = [[((v - lo[j]) / (hi[j] - lo[j]) - 0.5) * p["co"][j] if hi[j] > lo[j] else 0 for j, v in enumerate(pt)] for pt in verts]
    mesh = bpy.data.meshes.new("Tiết diện")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    if tiet_dien:
        for face in list(mesh.polygons)[2:]:
            face.use_smooth = True
    ob = bpy.data.objects.new("Khối theo tiết diện", mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(vat_lieu(p.get("vat_lieu")))
    return ob


def phep_thu(s):
    values = s["gia_tri"]
    if s["vat"] == "hop_bi":
        cols = math.ceil(math.sqrt(len(values)))
        rows = math.ceil(len(values) / cols)
        radius = math.hypot(cols - 1, rows - 1) * 0.52 + 0.66
        vat("tru", (0, 0, -0.1), (2 * radius, 2 * radius, 0.2), "thep")
        for z in (0, 0.98):
            bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=0.047, location=(0, 0, z))
            bpy.context.object.data.materials.append(MATS["thep"])
        for i in range(10):
            phi = i * math.tau / 10
            vat("tru", (radius * math.cos(phi), radius * math.sin(phi), 0.49), (0.044, 0.044, 0.98), "thep")
        taken = 0
        for i, color in enumerate(values):
            x = (i % cols - (cols - 1) / 2) * 1.04
            y = (i // cols - (rows - 1) / 2) * 1.04
            ob = vat("cau", (x, y, 0.48), (0.93, 0.93, 0.93), color)
            ob["ket_qua"] = color
            if color == s["mau_rut"] and taken < s["so_rut"]:
                dest = Vector((radius + 1.1 + (taken % 3) * 1.03, (taken // 3) * 1.03, 0.48))
                ob["dich"] = list(dest - ob.location)
                ob["nhac"] = 1.65
                taken += 1
        return
    for i, value in enumerate(values):
        x = (i - (len(values) - 1) / 2) * 1.75
        center = Vector((x, 0, 0))
        if s["vat"] == "dong_xu":
            pieces = [vat("tru", center, (1.45, 1.45, 0.15), "vang")]
            for sign, letter in ((1, value), (-1, "S" if value == "N" else "N")):
                bpy.ops.object.text_add(
                    location=(x, 0, sign * 0.08), rotation=(0 if sign == 1 else math.pi, 0, 0)
                )
                ob = bpy.context.object
                ob.data.body = letter
                ob.data.font = bpy.data.fonts.load(
                    str(Path(__file__).resolve().parents[1] / "public/fonts/BeVietnamPro-Bold.ttf"),
                    check_existing=True,
                )
                ob.data.align_x = ob.data.align_y = "CENTER"
                ob.data.size = 0.83
                ob.data.materials.append(MATS["toi"])
                pieces.append(ob)
        else:
            pieces = [vat("hop", center, (1.32, 1.32, 1.32), "trang")]
            # Các cặp đối diện có tổng bằng bảy. Xoay cả khối để mặt kết quả hướng lên.
            orient = {
                1: (0, 0, 0),
                6: (180, 0, 0),
                2: (-90, 0, 0),
                5: (90, 0, 0),
                3: (0, -90, 0),
                4: (0, 90, 0),
            }
            basis = Euler(tuple(map(math.radians, orient[value]))).to_matrix()
            for face, normal in enumerate(
                ((0, 0, 1), (0, -1, 0), (1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, 0, -1)), 1
            ):
                n = Vector(normal)
                u = Vector((1, 0, 0) if not n.x else (0, 1, 0))
                v = n.cross(u)
                dots = [] if face % 2 == 0 else [(0, 0)]
                if face >= 2:
                    dots.extend([(-1, -1), (1, 1)])
                if face >= 4:
                    dots.extend([(-1, 1), (1, -1)])
                if face == 6:
                    dots.extend([(-1, 0), (1, 0)])
                for a, b in dots:
                    pos = center + basis @ (n * 0.665 + 0.32 * (a * u + b * v))
                    ob = vat("cau", pos, (0.21, 0.21, 0.045), "den")
                    ob.rotation_euler = (basis @ n).to_track_quat("Z", "Y").to_euler()
                    pieces.append(ob)
        pieces[0]["ket_qua"] = str(value)
        if s["dong"]:
            for ob in pieces:
                ob["pivot"] = list(center)


def tru_cut(z, r1, r2, depth, mat, n=64):
    """Thân nón cụt (cổ lon, vành bồn) đặt tâm đáy giữa ở cao độ z."""
    bpy.ops.mesh.primitive_cone_add(vertices=n, radius1=r1, radius2=r2, depth=depth, location=(0, 0, z + depth / 2))
    ob = bpy.context.object
    for face in ob.data.polygons:
        face.use_smooth = True
    ob.data.materials.append(MATS.get(mat, MATS["da"]))
    return ob


def vanh(z, r, day, mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=day, major_segments=72, minor_segments=12, location=(0, 0, z))
    ob = bpy.context.object
    for face in ob.data.polygons:
        face.use_smooth = True
    ob.data.materials.append(MATS.get(mat, MATS["thep"]))
    return ob


def vom(z, r, cao, mat):
    """Vòm bán cầu (mái bồn chứa): nửa trên của mặt cầu, co giãn theo chiều cao vòm."""
    import bmesh
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1, location=(0, 0, 0))
    ob = bpy.context.object
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context="VERTS")
    bm.to_mesh(ob.data)
    bm.free()
    ob.scale = (r, r, cao)
    ob.location = (0, 0, z)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for face in ob.data.polygons:
        face.use_smooth = True
    ob.data.materials.append(MATS.get(mat, MATS["trang"]))
    return ob


def lon(w, h, mat):
    """Lon nước giống thật: thân sơn bóng, cổ thắt hai đầu, vành cuộn và nắp nhôm có khoen."""
    r = w / 2
    co = h * 0.07
    than = vat("tru", (0, 0, 0), (w, w, h - 2 * co), mat)
    parts = [than,
             tru_cut(-h / 2, r * 0.86, r, co, "nhom"),
             tru_cut(h / 2 - co, r, r * 0.84, co, "nhom"),
             vanh(h / 2, r * 0.84, r * 0.035, "nhom"),
             vanh(-h / 2 + r * 0.02, r * 0.84, r * 0.03, "nhom"),
             vat("tru", (0, 0, h / 2 - r * 0.03), (r * 1.62, r * 1.62, r * 0.02), "nhom"),
             vat("hop", (0, r * 0.28, h / 2 + r * 0.005), (r * 0.42, r * 0.62, r * 0.02), "thep")]
    return parts


def bon_vom(w, h, mat):
    """Bồn chứa: thân trụ đứng, mái vòm bán cầu, vành nối và bốn chân đế thép."""
    r = w / 2
    cao_vom = min(r, h * 0.45)
    chan = h * 0.08
    than_cao = h - cao_vom - chan
    z0 = -h / 2 + chan
    than = vat("tru", (0, 0, z0 + than_cao / 2), (w, w, than_cao), mat)
    parts = [than, vom(z0 + than_cao, r, cao_vom, mat),
             vanh(z0 + than_cao, r * 1.005, r * 0.025, "thep"),
             vanh(z0 + r * 0.03, r * 1.005, r * 0.03, "thep"),
             vat("tru", (0, 0, z0 + than_cao + cao_vom * 0.97), (r * 0.32, r * 0.32, r * 0.1), "thep")]
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        parts.append(vat("hop", (r * 0.78 * math.cos(a), r * 0.78 * math.sin(a), -h / 2 + chan / 2), (r * 0.12, r * 0.12, chan), "thep"))
    return parts


def chi_tiet(p):
    w, d, h = p["co"]
    shape = p["hinh"]
    material = p.get("vat_lieu", "da")
    nguon = str(p.get("tu_de") or "").casefold()
    # Biên kịch thường mô tả lon / bồn bằng một khối trụ trơn: tự nâng thành vật thật có chi tiết.
    if shape == "tru" and abs(w - d) < 1e-6 * max(w, d, 1) and not any(p.get("xoay", [])):
        if "lon" in nguon.split() or "vỏ lon" in nguon:
            shape = "lon"
        elif re.search(r"bồn|bể|téc|bình chứa", nguon) and re.search(r"bán cầu|vòm|chỏm cầu", nguon):
            shape = "bon_vom"
    if shape in ("lon", "bon_vom") and material in ("da", "toi"):
        material = "do" if shape == "lon" else "trang"
    center = Vector(p["tam"])
    rot = Euler(tuple(map(math.radians, p.get("xoay", [0, 0, 0])))).to_matrix()
    if shape == "bang_chuyen":
        pieces = [vat("hop", (0, 0, 0.32 * h), (w, d, 0.24 * h), "toi")]
        for sign in (-1, 1):
            pieces.append(vat("hop", (0, sign * 0.46 * d, 0.22 * h), (w, 0.08 * d, 0.3 * h), material))
            for end in (-1, 1):
                pieces.append(
                    vat(
                        "hop",
                        (end * 0.4 * w, sign * 0.4 * d, -0.14 * h),
                        (0.045 * w, 0.09 * d, 0.72 * h),
                        "thep",
                    )
                )
        for i in range(12):
            pieces.append(
                vat(
                    "tru",
                    ((i / 11 - 0.5) * w * 0.95, 0, 0.40 * h),
                    (0.2 * h, 0.2 * h, d * 0.89),
                    "thep",
                    (90, 0, 0),
                )
            )
    elif shape == "thuyen":
        hull = vo_khoi(
            [(-1, -0.62), (0.36, -1), (1, 0), (0.36, 1), (-1, 0.62)], (w, d, h * 0.6), 0.70, material
        )
        hull.location.z = -0.2 * h
        pieces = [
            hull,
            vat("hop", (-0.13 * w, 0, 0.25 * h), (0.37 * w, 0.59 * d, 0.3 * h), "kinh"),
            vat("hop", (-0.13 * w, 0, 0.45 * h), (0.43 * w, 0.68 * d, 0.1 * h), "trang"),
        ]
    elif shape == "luoi_tam_giac":
        pieces = [tao_luoi(p, p["dinh"], p["mat"])]
    elif shape == "khoi_tiet_dien":
        pieces = [khoi_tiet_dien(p)]
    elif shape == "lang_tru":
        pieces = [vo_khoi(p["day"], p["co"], 1, material)]
    elif shape == "lon":
        pieces = lon(w, h, material)
    elif shape == "bon_vom":
        pieces = bon_vom(w, h, material)
    else:
        pieces = [vat(shape, (0, 0, 0), p["co"], material)]
    for ob in pieces:
        ob.location = center + rot @ ob.location
        ob.rotation_euler = (rot @ ob.rotation_euler.to_matrix()).to_euler()
        if any(p.get("dich_chuyen", [])):
            ob["dich"] = p["dich_chuyen"]
        if p.get("vai_tro"):
            ob["vai_tro"] = p["vai_tro"]
        # nhãn thực thể / bản sao để hành động của đặc tả cảnh ("be#3", "bi") tìm đúng vật
        if p.get("the"):
            ob["the"] = p["the"]
            ob["ban"] = int(p.get("ban") or 1)
        ob["vat_lieu"] = material
    return pieces


def dung(s):
    if s["loai"] == "xe_duong":
        vat("hop",(0,0,-.14),(16,3.75,.28),"toi")
        for i in range(-4,5):
            vat("hop",(i*1.75,.52,.005),(.9,.045,.02),"trang")
        for y in (-1.76,1.76):
            vat("hop",(0,y,.005),(15.9,.035,.02),"trang")
        road = set(bpy.context.scene.objects)
        x,y = -5.7,-.62
        vat("hop",(x,y,.48),(3.35,1.27,.57),"do")
        vat("hop",(x-.23,y,.93),(1.83,1.11,.53),"kinh")
        vat("hop",(x-.25,y,1.21),(1.68,1.16,.08),"do")
        for side in (-1,1):
            vat("hop",(x+.03,y+side*.556,.98),(.10,.04,.45),"toi")
            for end in (-1,1):
                vat("tru",(x+end*1.03,y+side*.63,.33),(.65,.65,.20),"toi",(90,0,0))
                vat("tru",(x+end*1.03,y+side*.738,.33),(.34,.34,.025),"thep",(90,0,0))
            vat("hop",(x+1.68,y+side*.42,.54),(.04,.25,.14),"trang")
        for obj in set(bpy.context.scene.objects)-road:
            obj["dich"] = [11.4, 0, 0]
        return
    if s["loai"] == "cua":
        for i in range(s["so"]):
            x = (i - (s["so"] - 1) / 2) * 1.4
            door = vat("hop", (x,0,1), (1.22,.14,2), "go")
            door["ket_qua"] = str(i+1)
            vat("cau",(x+.38,-.1,1),(.1,.1,.1),"vang")
    elif s["loai"] == "phep_thu":
        phep_thu(s)
    elif s["loai"] == "vuon":
        vuon(s)
    elif s["loai"] in ("lap_ghep", "dac_ta"):
        for p in s["chi_tiet"]:
            chi_tiet(p)
    elif s["loai"] == "can_ho":
        nha(0, 0, 9, 3, 6, s["tong"], s.get("trong"))
    elif s["loai"] == "cap_bo":
        # Dùng một tỉ lệ chung cho AH và HB. Tàu và nhà trạm là ký hiệu không theo tỷ lệ.
        a, b = s["ah"], s["hb"]
        u = max(a, b)
        vat("hop", (b / 2, a * 0.72, -u * 0.026), (b + 0.45 * u, a * 1.44, u * 0.05), "nuoc")
        vat("hop", (b / 2, -u * 0.12, -u * 0.018), (b + 0.45 * u, u * 0.24, u * 0.036), "dat")
        vat("cau", (0, a, u * 0.012), (u * 0.13, u * 0.048, u * 0.035), "do")
        vat("hop", (0, a, u * 0.032), (u * 0.055, u * 0.033, u * 0.028), "trang")
        vat("hop", (b, -u * 0.035, u * 0.035), (u * 0.10, u * 0.07, u * 0.07), "trang")
        vat("hop", (b, -u * 0.035, u * 0.073), (u * 0.113, u * 0.083, u * 0.01), "gach")
    else:
        for v in s["vat"]:
            x, y, h = v["x"], v.get("y", 0), v["cao"]
            if v["ten"] == "nguoi":
                nguoi(x, y, h)
            elif v["ten"] == "toa_nha":
                w = v.get("rong") or h * 0.55
                nha(x, y, w, w * 0.68, h)
            elif v["ten"] == "cot_co":
                vat("tru", (x, y, h / 2), (0.015 * h, 0.015 * h, h), "thep")
                vat("hop", (x + h * 0.13, y, h * 0.916), (0.26 * h, 0.008 * h, 0.16 * h), "do")
            elif v["ten"] == "cay":
                vat("tru", (x, y, h * 0.26), (h * 0.09, h * 0.09, h * 0.52), "go")
                vat("cau", (x, y, h * 0.67), (h * 0.55, h * 0.53, h * 0.66), "la")


def tao_moi_truong(scene, plan, center, span, ground):
    """Dựng bối cảnh quanh vật (sàn, tường, cây...). Trả danh sách vật bối cảnh để bật/tắt khi chụp từng lớp."""
    before = set(scene.objects)
    parts = plan.get("chi_tiet", [])
    warehouse = any(p["hinh"] == "bang_chuyen" for p in parts)
    outside = plan["loai"] in ("vuon", "vat", "cap_bo", "can_ho", "xe_duong") or any(
        p["hinh"] == "thuyen" or p.get("vat_lieu") in ("co", "dat", "nuoc") for p in parts)
    x, y = center.x, center.y
    def prop(shape, dx, dy, z, size, surface):
        return vat(shape, (x+span*dx, y+span*dy, ground+span*z),
                   tuple(span*s for s in size), surface)

    preset = (plan.get("moi_truong") or {}).get("mau")
    story = plan.get("phong_canh")
    if preset:
        lo = (center.x - span / 2, center.y - span / 2, ground)
        objs = [o for o in before if o.type == "MESH" and not o.is_shadow_catcher]
        if objs:
            pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
            lo = tuple(min(p[i] for p in pts) for i in range(3))
            hi = tuple(max(p[i] for p in pts) for i in range(3))
        else:
            hi = (center.x + span / 2, center.y + span / 2, ground + span)
        env = dung_moi_truong(preset, lo, hi)
        for part in env["chi_tiet"]:
            chi_tiet(part)
        dat_troi(scene, env)
    elif story:
        def story_material(color):
            if color not in MATS:
                rgb = tuple((int(color[i:i+2], 16)/255)**2.2 for i in (1, 3, 5))
                MATS[color] = tao_vat_lieu(color, rgb)
            return color
        prop("hop", 0, 0, -.055, (20, 20, .10), story_material(story["dat"]))
        for part in story["vat"]:
            px, py, pz = part["tam"]
            w, h, d = part["co"]
            prop(part["hinh"], px*.22, -pz*.22, py*.22, (w*.22, d*.22, h*.22), story_material(part["mau"]))
        scene.world.node_tree.nodes["Background"].inputs[0].default_value = MATS[story_material(story["troi"])].diffuse_color
    else:
        prop("hop", 0, 0, -.055, (20, 20, .10), "co" if outside else "da" if warehouse else "go")
        if outside:
            rng = random.Random(5)
            for i in range(11):
                dx, dy = i*.53-3 + rng.uniform(-.08, .08), 1.8+(i % 3)*.22
                s = rng.uniform(.8, 1.2)
                prop("tru", dx, dy, .19*s, (.035, .035, .38*s), "go")
                prop("cau", dx, dy, .47*s, (.30*s, .31*s, .47*s), "la")
        else:
            wall_y = 1.05
            prop("hop", 0, wall_y, 1.4, (12, .09, 2.8), "da" if warehouse else "trang")
            # chân tường: chi tiết nhỏ giúp mắt đọc được tỉ lệ căn phòng
            prop("hop", 0, wall_y-.05, .04, (12, .02, .08), "go")
            if warehouse:
                for dy in (-.34, .38):
                    prop("hop", 0, dy, -.003, (7, .018, .006), "vang")
                for i in range(-5, 6):
                    prop("hop", i*.62, 0, -.004, (.005, 4, .004), "toi")
            for i in range(-6, 7):
                prop("hop", i*.68, wall_y-.06, .57, (.59, .035, .84), "cua_so")
                prop("hop", i*.68, wall_y-.08, .57, (.012, .02, .84), "trang")   # song cửa
                prop("hop", i*.68, wall_y-.08, .15, (.62, .045, .03), "trang")   # bậu cửa
                if warehouse:
                    prop("hop", i*.68, wall_y-.12, 1.33, (.045, .075, 2.66), "thep")
    return list(set(scene.objects) - before)


def dat_troi(scene, env):
    """Trời/ánh sáng môi trường: HDRI CC0 (assets/hdri) nếu có, ngược lại màu trời của mẫu."""
    tree = scene.world.node_tree
    bg = tree.nodes["Background"]
    path = HDRI / f"{env.get('hdri')}_1k.hdr" if env.get("hdri") else None
    if path and path.exists():
        tex = tree.nodes.new("ShaderNodeTexEnvironment")
        tex.image = bpy.data.images.load(str(path), check_existing=True)
        mapping = tree.nodes.new("ShaderNodeMapping")
        coord = tree.nodes.new("ShaderNodeTexCoord")
        tree.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
        tree.links.new(mapping.outputs["Vector"], tex.inputs["Vector"])
        tree.links.new(tex.outputs["Color"], bg.inputs["Color"])
        bg.inputs["Strength"].default_value = 0.5 if env.get("ngoai_troi") else 0.4
    else:
        h = env.get("troi", "#9cc3e6")
        bg.inputs["Color"].default_value = (*[(int(h[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5)], 1)
        bg.inputs["Strength"].default_value = 0.4


def dat_mau_sac(scene):
    # AgX + tương phản vừa: màu bão hòa tự nhiên, vùng sáng không cháy trắng như ảnh chụp thật.
    try:
        scene.view_settings.view_transform = "AgX"
    except TypeError:
        return
    for look in ("AgX - Punchy", "Punchy", "AgX - Medium High Contrast", "Medium High Contrast"):
        try:
            scene.view_settings.look = look
            return
        except TypeError:
            continue


def den(scene, kieu, vi_tri, nhin, nang_luong, co, mau, bong=True):
    bpy.ops.object.light_add(type=kieu, location=vi_tri)
    lamp = bpy.context.object
    lamp.rotation_euler = (nhin - lamp.location).to_track_quat("-Z", "Y").to_euler()
    lamp.data.energy = nang_luong
    lamp.data.color = mau
    if not bong:
        lamp.data.use_shadow = False   # đèn phụ/viền chỉ tạo ánh, không vẽ thêm bóng (bóng thật chỉ có một hướng chính)
    if kieu == "AREA":
        lamp.data.shape = "DISK"
        lamp.data.size = co
    return lamp


# ---------- Giai đoạn D: hành động của vật theo từng cảnh (đặc tả cảnh "quay[].hanh_dong") ----------
# Dòng thời gian chuẩn hóa t ∈ [0, 1] của một cảnh: [0, DAN] máy quay vào cảnh, rồi mỗi hành động một đoạn bằng nhau.
# src/CanhBlender.tsx dùng đúng hằng số này (props.nhipQuay.dan) để đặt mỗi đoạn vào mốc khi_noi của lời đọc.
DAN = 0.25


def _kep(x):
    return max(0.0, min(1.0, x))


def _muot(x):
    return x * x * (3 - 2 * x)


def chon_nhom(scene, ref):
    """'be' -> mọi bản sao [[obj...], ...] theo thứ tự bản; 'be#3' -> chỉ bản 3."""
    tid, _, k = str(ref or "").partition("#")
    out = {}
    for ob in scene.objects:
        if ob.get("the") == tid and (not k or str(ob.get("ban")) == k):
            out.setdefault(int(ob.get("ban", 1)), []).append(ob)
    return [out[b] for b in sorted(out)]


def hop_bao(obs):
    pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
    return (Vector(tuple(min(p[i] for p in pts) for i in range(3))),
            Vector(tuple(max(p[i] for p in pts) for i in range(3))))


def _T(v):
    from mathutils import Matrix
    return Matrix.Translation(Vector(v))


def _quanh(pivot, M3):
    """Ma trận 4x4: biến đổi 3x3 M3 quanh điểm pivot."""
    return _T(pivot) @ M3.to_4x4() @ _T(-Vector(pivot))


def _phat_sang(obs):
    """Tách vật liệu riêng cho nhóm vật để tăng độ phát sáng mà không đổi màu vật khác dùng chung vật liệu."""
    nodes = []
    for ob in obs:
        for slot in ob.material_slots:
            if not slot.material or not slot.material.use_nodes:
                continue
            m = slot.material.copy()
            slot.material = m
            sh = m.node_tree.nodes.get("Principled BSDF")
            if sh:
                mau = sh.inputs["Base Color"].default_value[:]
                dat_dau_vao(sh, "Emission Color", mau)
                nodes.append(sh)
    def dat(a):
        for sh in nodes:
            dat_dau_vao(sh, "Emission Strength", 1.4 * a)
    return dat


def lap_hanh_dong(scene, plan, lo_all, hi_all):
    """Trả (dat_trang_thai(t), so_hanh_dong). dat_trang_thai đặt mọi vật về tư thế gốc rồi áp các hành động tới thời điểm t."""
    from mathutils import Matrix
    acts = (plan.get("quay") or {}).get("hanh_dong") or []
    base = {ob: ob.matrix_world.copy() for ob in scene.objects if ob.type in ("MESH", "FONT")}
    span_all = max(hi_all - lo_all)
    ben_phai = [0.0]   # vật đã lấy ra xếp thành hàng bên phải cụm vật
    steps = []
    for a in acts:
        groups = chon_nhom(scene, a["vat"])
        ts = a.get("tham_so") or {}
        if ts.get("mau"):
            hop = [g for g in groups if any(o.get("vat_lieu") == ts["mau"] for o in g)]
            groups = hop or groups
        if a.get("so"):
            groups = groups[: int(a["so"])]
        if not groups:
            steps.append(None)
            continue
        boxes = [hop_bao(g) for g in groups]
        kind = a["dong_tu"]
        fns = []
        for j, (g, (lo, hi)) in enumerate(zip(groups, boxes)):
            c = (lo + hi) / 2
            size = max(hi - lo)
            h = hi.z - lo.z

            def apply(M, g=g):
                for ob in g:
                    ob.matrix_world = M @ ob.matrix_world

            if kind in ("lay_ra", "bo_vao"):
                w = hi.x - lo.x
                dest = Vector((hi_all.x + span_all * 0.12 + ben_phai[0] + w / 2, (lo_all.y + hi_all.y) / 2, lo_all.z))
                ben_phai[0] += w * 1.35
                delta = dest - Vector((c.x, c.y, lo.z))
                lift = max(h * 2.2, (hi_all.z - lo_all.z) * 0.9)
                ra = kind == "lay_ra"
                fns.append(lambda x, apply=apply, delta=delta, lift=lift, ra=ra:
                           apply(_T(delta * (x if ra else 1 - x) + Vector((0, 0, lift * math.sin(math.pi * x))))))
            elif kind == "roi":
                H = float(ts.get("do_cao") or 0) or max(1.5 * h, 0.35 * span_all)
                fns.append(lambda x, apply=apply, H=H: apply(_T((0, 0, H * (1 - x * x)))))
            elif kind == "tung":
                lift = max(size * 3, 0.25 * span_all)
                fns.append(lambda x, apply=apply, c=c, lift=lift, j=j: apply(
                    _T((0, 0, lift * math.sin(math.pi * x))) @ _quanh(c, Matrix.Rotation(4 * math.pi * (1 - x), 3, "X" if j % 2 == 0 else "Y"))))
            elif kind == "lan":
                dist = float(ts.get("quang_duong") or 0) or 4 * size
                r = max(h / 2, 1e-3)
                fns.append(lambda x, apply=apply, c=c, dist=dist, r=r: apply(
                    _T((-(1 - x) * dist, 0, 0)) @ _quanh(c, Matrix.Rotation(-(1 - x) * dist / r, 3, "Y"))))
            elif kind == "quay":
                goc = math.radians(float(ts.get("goc") or 360))
                fns.append(lambda x, apply=apply, c=c, goc=goc: apply(_quanh(c, Matrix.Rotation(goc * x, 3, "Z"))))
            elif kind == "di_chuyen":
                den = chon_nhom(scene, ts["den"]) if ts.get("den") else []
                if den:
                    tlo, thi = hop_bao([o for gg in den for o in gg])
                    d = ((tlo + thi) / 2 - c)
                    d.z = 0
                    L = d.length
                    stop = max(0.0, L - (size + max(thi - tlo)) / 2 * 1.05)
                    delta = d.normalized() * stop if L > 1e-6 else Vector()
                    fns.append(lambda x, apply=apply, delta=delta: apply(_T(delta * x)))
                else:
                    huong = {"trai": (-1, 0, 0), "phai": (1, 0, 0), "truoc": (0, -1, 0), "sau": (0, 1, 0)}
                    v = Vector(huong.get(ts.get("huong"), (-1, 0, 0)))
                    dist = float(ts.get("quang_duong") or 0) or 3 * size
                    fns.append(lambda x, apply=apply, v=v, dist=dist: apply(_T(v * dist * (1 - x))))
            elif kind == "rot_day":
                nuoc = [o for o in g if o.get("vat_lieu") == "nuoc"]
                for o in nuoc:
                    olo, _ = hop_bao([o])
                    fns.append(lambda x, o=o, p=Vector((o.matrix_world.translation.x, o.matrix_world.translation.y, olo.z)):
                               setattr(o, "matrix_world", _quanh(p, Matrix.Diagonal((1, 1, max(0.02, x)))) @ o.matrix_world))
            elif kind in ("mo", "dong"):
                nap = max(g, key=lambda o: hop_bao([o])[1].z)
                nlo, nhi = hop_bao([nap])
                p = Vector(((nlo.x + nhi.x) / 2, nhi.y, nlo.z))
                mo = kind == "mo"
                fns.append(lambda x, nap=nap, p=p, mo=mo: setattr(nap, "matrix_world",
                           _quanh(p, Matrix.Rotation(-1.8 * (x if mo else 1 - x), 3, "X")) @ nap.matrix_world))
            elif kind == "xep":
                goc = j * 2.399
                r = 1.6 * size
                fns.append(lambda x, apply=apply, goc=goc, r=r, h=h: apply(
                    _T((math.cos(goc) * r * (1 - x), math.sin(goc) * r * (1 - x), 0.6 * h * math.sin(math.pi * x)))))
            elif kind in ("danh_dau_chon", "sang_len"):
                sang = _phat_sang(g)
                nhac = kind == "danh_dau_chon"
                fns.append(lambda x, apply=apply, c=c, h=h, sang=sang, nhac=nhac: (
                    sang(x), nhac and apply(_T((0, 0, 0.25 * h * x)) @ _quanh(c, Matrix.Diagonal((1, 1, 1)) * (1 + 0.12 * x)))))
        steps.append(fns)
    n = len(steps)

    def dat_trang_thai(t):
        for ob, m in base.items():
            ob.matrix_world = m.copy()
        for k, fns in enumerate(steps):
            if not fns:
                continue
            seg = (1 - DAN) / n
            x = _muot(_kep((t - DAN - k * seg) / seg))
            for fn in fns:
                fn(x)
    return dat_trang_thai, n


def render(plan, dest):
    global MATS
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    MATS = {name: tao_vat_lieu(name, rgb) for name, rgb in COLORS.items()}
    # Ô cửa sổ của bối cảnh: phát sáng như trời ban ngày ngoài cửa (thay cho tấm kính tối trông như ô gạch ốp).
    cua_so = bpy.data.materials.new("cua_so")
    cua_so.use_nodes = True
    sh = cua_so.node_tree.nodes.get("Principled BSDF")
    dat_dau_vao(sh, "Base Color", (0.86, 0.93, 1.0, 1))
    dat_dau_vao(sh, "Emission Color", (0.86, 0.93, 1.0, 1))
    dat_dau_vao(sh, "Emission Strength", 2.2)
    MATS["cua_so"] = cua_so
    dung(plan)
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in scene.objects for c in o.bound_box]
    quay = plan.get("quay") if plan.get("loai") == "dac_ta" else None
    dat_trang_thai, so_hd = None, 0
    pts_tieu = []
    if quay:
        lo0 = Vector(tuple(min(p[i] for p in pts) for i in range(3)))
        hi0 = Vector(tuple(max(p[i] for p in pts) for i in range(3)))
        dat_trang_thai, so_hd = lap_hanh_dong(scene, plan, lo0, hi0)
        tieu = [o for ref in plan.get("tieu_diem") or [] for g in chon_nhom(scene, ref) for o in g]
        # khung máy phải chứa vật ở MỌI thời điểm của hành động (vật bay lên, lấy ra bên cạnh...)
        for t in [k / 8 for k in range(9)]:
            dat_trang_thai(t)
            bpy.context.view_layer.update()
            pts.extend(o.matrix_world @ Vector(c) for o in scene.objects if o.type in ("MESH", "FONT") for c in o.bound_box)
            pts_tieu.extend(o.matrix_world @ Vector(c) for o in tieu for c in o.bound_box)
        dat_trang_thai(1.0)
        bpy.context.view_layer.update()
    moving = [(ob, ob.location.copy(), Vector(ob["dich"])) for ob in scene.objects if "dich" in ob]
    pts.extend(ob.matrix_world @ Vector(c) + delta for ob, _, delta in moving for c in ob.bound_box)
    for segment in plan.get("doan_toan", []):
        pts.extend(Vector(segment[k]) for k in ("a", "b"))
    spinning = [
        (ob, ob.location.copy(), ob.rotation_euler.to_matrix(), Vector(ob["pivot"]))
        for ob in scene.objects
        if "pivot" in ob
    ]
    if spinning or any(ob.get("nhac") for ob, _, _ in moving):
        pts.extend(pt + Vector((0, 0, 1.7)) for pt in list(pts))
    lo = Vector(tuple(min(p[i] for p in pts) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in pts) for i in range(3)))
    center = (lo + hi) / 2
    span = max(hi - lo)
    direction = Vector(plan.get("huong_may") or (0.64, -1.45, 1.04)).normalized()
    from mathutils import Matrix
    from bpy_extras.object_utils import world_to_camera_view

    # Máy quay PHỐI CẢNH ống 50 mm (trước đây trực giao -> trông như bản vẽ kỹ thuật, không như ảnh chụp).
    # Khớp khung theo chiều ngang: lớp vật 960x600 và lớp nền dọc 720x1280 có cùng góc nhìn ngang.
    bpy.ops.object.camera_add()
    cam = bpy.context.object
    cam.data.type = "PERSP"
    cam.data.lens = 50
    cam.data.sensor_fit = "HORIZONTAL"
    cam.data.sensor_width = 36
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = 960, 600
    scene.render.resolution_percentage = 100
    tan_x = math.tan(cam.data.angle_x / 2) / 1.12
    tan_y = tan_x * 600 / 960

    # Góc máy theo cảnh (giai đoạn D): "trung" / "can" / "theo_vat" vừa khung theo vật tiêu điểm thay vì cả cụm.
    goc = (quay or {}).get("goc_may")
    pts_khung = pts_tieu if goc in ("trung", "can", "theo_vat") and pts_tieu else pts
    tam = center
    if pts_khung is pts_tieu:
        tlo = Vector(tuple(min(p[i] for p in pts_tieu) for i in range(3)))
        thi = Vector(tuple(max(p[i] for p in pts_tieu) for i in range(3)))
        tam = (tlo + thi) / 2
    he_so = {"trung": 1.35, "can": 1.04, "theo_vat": 1.25}.get(goc, 1.0) if pts_khung is pts_tieu else 1.0

    def dat_may(axis, dist, lech=None, tam_may=None):
        goc_nhin = (tam_may or tam) + (lech or Vector())
        cam.location = goc_nhin + axis * dist
        cam.rotation_euler = (-axis).to_track_quat("-Z", "Y").to_euler()

    def vua_khung(axis):
        rot = (-axis).to_track_quat("-Z", "Y").to_matrix().transposed()
        lo_d, hi_d = span * 0.2, span * 60
        for _ in range(48):
            mid = (lo_d + hi_d) / 2
            eye = tam + axis * mid
            ok = True
            for pt in pts_khung:
                v = rot @ (pt - eye)
                if v.z >= -1e-6 or abs(v.x) > tan_x * -v.z or abs(v.y) > tan_y * -v.z:
                    ok = False
                    break
            lo_d, hi_d = (lo_d, mid) if ok else (mid, hi_d)
        return hi_d

    dist = vua_khung(direction) * he_so
    cam.data.clip_start = span * 0.002
    cam.data.clip_end = span * 120
    dat_may(direction, dist)

    # Ánh sáng ba điểm kiểu studio: đèn chính ấm mềm, đèn phụ lạnh dịu bóng, đèn viền tách vật khỏi nền.
    side = Vector((-direction.y, direction.x, 0)).normalized()
    up = Vector((0, 0, 1))
    k = span**2
    den(scene, "AREA", center + (side * -1.3 + direction * 1.1 + up * 1.9) * span, center, k * 150, span * 1.4, (1.0, 0.93, 0.84))
    den(scene, "AREA", center + (side * 1.6 + direction * 0.9 + up * 0.7) * span, center, k * 38, span * 2.2, (0.82, 0.9, 1.0), bong=False)
    # đèn viền đặt cao và rộng: bóng của nó ngắn, không kéo dài về phía máy quay
    den(scene, "AREA", center + (side * 0.6 - direction * 1.2 + up * 2.6) * span, center, k * 55, span * 1.8, (1.0, 0.97, 0.92), bong=False)
    scene.world = bpy.data.worlds.new("Ánh sáng trời")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.62, 0.70, 0.80, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.3

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.03
    scene.cycles.max_bounces = 6
    scene.cycles.transparent_max_bounces = 6
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except TypeError:
        pass
    scene.render.use_persistent_data = True
    dat_mau_sac(scene)

    # Sàn hứng bóng: lớp vật trong suốt vẫn mang bóng đổ + bóng tiếp xúc, vật "đứng" trên nền thay vì dán đè.
    bpy.ops.mesh.primitive_plane_add(size=span * 30, location=(center.x, center.y, lo.z - span * 0.0008))
    catcher = bpy.context.object
    catcher.is_shadow_catcher = True
    vat_the = [o for o in scene.objects if o.type in ("MESH", "FONT") and o is not catcher]
    boi_canh = tao_moi_truong(scene, plan, center, span, lo.z)

    def che_do(nen, rong=960, cao=600, mau=24, tep="PNG"):
        for o in boi_canh:
            o.hide_render = not nen
        for o in vat_the + [catcher]:
            o.hide_render = nen
        scene.render.film_transparent = not nen
        scene.render.resolution_x, scene.render.resolution_y = rong, cao
        scene.cycles.samples = mau
        scene.render.image_settings.file_format = tep
        scene.render.image_settings.color_mode = "RGB" if tep == "JPEG" else "RGBA"
        # Nền chụp với độ sâu trường ảnh (xóa phông): đạo cụ phía sau mềm đi, mắt tập trung vào vật chính.
        cam.data.dof.use_dof = nen
        cam.data.dof.focus_distance = (cam.location - tam).length
        cam.data.dof.aperture_fstop = max(0.1, min(16.0, 2.2 / max(1e-3, cam.data.dof.focus_distance)))

    static_cam = bool(moving or spinning)
    frames = 36 if static_cam else 16
    chuyen = (quay or {}).get("chuyen_may")
    if quay:
        # 16 khung cho máy + 6 khung mỗi hành động (tối đa 34) -> chuyển động vật vẫn mượt khi Remotion hòa khung kề nhau.
        frames = min(34, 16 + 6 * so_hd)
        static_cam = chuyen == "dung" and goc != "theo_vat"
    side_may = Vector((-direction.y, direction.x, 0)).normalized()
    tieu_obs = [o for ref in plan.get("tieu_diem") or [] for g in chon_nhom(scene, ref) for o in g] if goc == "theo_vat" else []
    # VE_XEM_TRUOC=1: chỉ dựng khung cuối + nền (kiểm bố cục nhanh tại máy, không dùng cho video).
    # VE_KHUNG="0,8,15": chỉ dựng các khung này (thử nhanh góc máy / hành động tại máy).
    xem_truoc = os.getenv("VE_XEM_TRUOC") == "1"
    chi_khung = [int(x) for x in os.getenv("VE_KHUNG", "").split(",") if x.strip().isdigit()]
    ds_khung = [k for k in chi_khung if k < frames] if chi_khung else [frames - 1] if xem_truoc else range(frames)
    for i in ds_khung:
        t = i / (frames - 1)
        e = t * t * (3 - 2 * t)
        # Máy vừa lượn 9° vừa đẩy vào 12%: chuyển động có thị sai thật giữa vật và nền (khung cuối là góc chiếu nét toán).
        angle = 0 if static_cam else math.radians(-9 * (1 - e))
        if quay:
            dat_trang_thai(t)
            bpy.context.view_layer.update()
            # chuyển máy theo đặc tả; khung cuối (e = 1) luôn về đúng góc đã vừa khung -> nét toán chiếu khớp.
            xa, lech, tam_may = 1.0, None, None
            if chuyen == "dung":
                angle = 0
            elif chuyen == "luot_ngang":
                angle, lech = 0, side_may * span * 0.32 * (1 - e)
            elif chuyen == "xoay_quanh":
                angle = math.radians(-38 * (1 - e))
            else:   # luot_vao
                angle, xa = math.radians(-4 * (1 - e)), 1 + 0.22 * (1 - e)
            if tieu_obs:
                tlo, thi = hop_bao(tieu_obs)
                tam_may = (tlo + thi) / 2
            dat_may(Matrix.Rotation(angle, 3, "Z") @ direction, dist * xa, lech, tam_may)
            bpy.context.view_layer.update()
            che_do(False)
            scene.render.filepath = str(dest.parent / f"orbit-{i}.png")
            bpy.ops.render.render(write_still=True)
            if not static_cam or i == 0 or xem_truoc or chi_khung:
                che_do(True, 540, 960, 10, "JPEG")
                scene.render.filepath = str(dest.parent / f"nen-{i}.jpg")
                bpy.ops.render.render(write_still=True)
            continue
        for ob, origin, delta in moving:
            ob.location = origin + delta * (t if plan["loai"] == "xe_duong" else e)
            ob.location.z += ob.get("nhac", 0) * math.sin(t * math.pi)
        for ob, origin, rotation, pivot in spinning:
            turn = Matrix.Rotation(1.5 * math.pi * (1 - e), 3, "X")
            ob.location = pivot + turn @ (origin - pivot) + Vector((0, 0, 0.45 * math.sin(math.pi * t)))
            ob.rotation_euler = (turn @ rotation).to_euler()
        dat_may(Matrix.Rotation(angle, 3, "Z") @ direction, dist * (1 if static_cam else 1 + 0.12 * (1 - e)))
        bpy.context.view_layer.update()
        che_do(False)
        scene.render.filepath = str(dest.parent / f"orbit-{i}.png")
        bpy.ops.render.render(write_still=True)
        if not static_cam or i == 0 or xem_truoc:
            che_do(True, 540, 960, 10, "JPEG")
            scene.render.filepath = str(dest.parent / f"nen-{i}.jpg")
            bpy.ops.render.render(write_still=True)
    if quay:
        # trạng thái + góc máy cuối (dù chỉ dựng vài khung): nền chung và tọa độ chiếu nét toán lấy từ đây
        dat_trang_thai(1.0)
        if tieu_obs:
            tlo, thi = hop_bao(tieu_obs)
            dat_may(direction, dist, None, (tlo + thi) / 2)
        else:
            dat_may(direction, dist)
        bpy.context.view_layer.update()
    # nền tĩnh độ phân giải cao ở góc cuối (dùng cho lớp nền chung và màn chuyển cảnh)
    che_do(True, 720, 1280, 20, "JPEG")
    scene.render.filepath = str(dest.parent / "moi-truong.jpg")
    bpy.ops.render.render(write_still=True)
    che_do(False)
    for ob in boi_canh + [catcher]:
        bpy.data.objects.remove(ob, do_unlink=True)
    bpy.context.view_layer.update()

    def project(pt):
        uv = world_to_camera_view(scene, cam, Vector(pt))
        return [float(uv.x), float(uv.y)]

    lines = []

    def edge(a, b, color="#7EE9DB", flat=False):
        lines.append(
            dict(a=project(a), b=project(b), color=color, flat=[list(a[:2]), list(b[:2])] if flat else None)
        )

    kind = plan["loai"]
    if kind in ("phep_thu", "cua"):
        marks = [{"xy":project(ob.location), "value":ob["ket_qua"]} for ob in scene.objects if "ket_qua" in ob]
        dest.write_text(json.dumps({"marks":marks, "vat":plan.get("vat", "cua")}))
        return
    if kind == "xe_duong":
        edge((-5.7,-.62,0), (5.7,-.62,0), flat=True)
    elif plan.get("doan_toan"):
        for segment in plan["doan_toan"]:
            edge(segment["a"], segment["b"])
            if segment.get("do_dai"):
                lines[-1]["nhan"] = segment["do_dai"]
    elif kind == "vuon":
        w, d = plan["rong"], plan["dai"]
        corners = [(0, 0, 0), (w, 0, 0), (w, d, 0), (0, d, 0)]
        for i, side in enumerate(("duoi", "phai", "tren", "trai")):
            edge(corners[i], corners[(i + 1) % 4], "#FFB968" if side == plan["tuong"] else "#7EE9DB", True)
    elif kind == "cap_bo":
        a, b = plan["ah"], plan["hb"]
        edge((0, a, 0), (0, 0, 0), flat=True)
        edge((0, 0, 0), (b, 0, 0), "#FFB968", True)
    elif kind == "vat":
        for obj in plan["vat"]:
            x, y = obj["x"], obj.get("y", 0)
            edge((x, y, 0), (x, y, obj["cao"]))
    else:
        # Chiếu đường bao và các cạnh sắc nhìn thấy từ góc máy cuối.
        graph = bpy.context.evaluated_depsgraph_get()
        for ob in scene.objects:
            if ob.type != "MESH" or (kind == "dac_ta" and ob.get("vai_tro") != "chinh"):
                continue
            mesh = ob.data
            normals = {}
            for poly in mesh.polygons:
                n = ob.matrix_world.to_quaternion() @ poly.normal
                for key in poly.edge_keys:
                    normals.setdefault(key, []).append(n)
            for (i, j), ns in normals.items():
                facing = [n.dot(direction) for n in ns]
                if max(facing) <= 0 or (min(facing) > 0 and len(ns) == 2 and ns[0].dot(ns[1]) > 0.8):
                    continue
                a, b = (ob.matrix_world @ mesh.vertices[k].co for k in (i, j))
                mid = (a + b) * 0.5
                hit, loc, *_ = scene.ray_cast(graph, mid + direction * span * 3, -direction)
                if not hit or (loc - mid).length < span * 0.003:
                    edge(a, b)
    dest.write_text(json.dumps(lines))


if __name__ == "__main__":
    batch = Path(sys.argv[sys.argv.index("--") + 1])
    for path, spec in json.loads(batch.read_text()).items():
        render(spec, Path(path))
