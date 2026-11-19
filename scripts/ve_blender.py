"""Bộ dựng ảnh minh họa 3D tĩnh bằng Blender Cycles, chạy trên CPU."""

import json
import math
import random
from pathlib import Path
import sys

import bpy
from mathutils import Euler, Vector


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
}


def vat(hinh, tam, co, mau, xoay=(0, 0, 0)):
    pos = dict(location=tam)
    if hinh == "hop":
        bpy.ops.mesh.primitive_cube_add(size=1, **pos)
    elif hinh == "tru":
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, **pos)
    elif hinh == "non":
        bpy.ops.mesh.primitive_cone_add(vertices=32, **pos)
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, **pos)
    ob = bpy.context.object
    ob.dimensions = co
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.rotation_euler = tuple(map(math.radians, xoay))
    if hinh in ("hop", "tru"):
        bevel = ob.modifiers.new("Bo mép", "BEVEL")
        bevel.width = min(co) * 0.045
        bevel.segments = 2
        ob.modifiers.new("Pháp tuyến", "WEIGHTED_NORMAL")
    if hinh == "cau":
        for face in ob.data.polygons:
            face.use_smooth = True
    ob.data.materials.append(MATS.get(mau, MATS["da"]))
    return ob


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
    ob.data.materials.append(MATS.get(mat, MATS["go"]))
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
    # Chuẩn hóa quanh tâm trước khi đặt vật vào hệ tọa độ chung của đề.
    lo = list(map(min, zip(*verts)))
    hi = list(map(max, zip(*verts)))
    verts = [[((v - lo[j]) / (hi[j] - lo[j]) - 0.5) * p["co"][j] for j, v in enumerate(pt)] for pt in verts]
    mesh = bpy.data.meshes.new("Tiết diện")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for face in list(mesh.polygons)[2:]:
        face.use_smooth = True
    ob = bpy.data.objects.new("Khối theo tiết diện", mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(MATS.get(p.get("vat_lieu"), MATS["da"]))
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
                    ob = vat("cau", pos, (0.21, 0.21, 0.045), "toi")
                    ob.rotation_euler = (basis @ n).to_track_quat("Z", "Y").to_euler()
                    pieces.append(ob)
        if s["dong"]:
            for ob in pieces:
                ob["pivot"] = list(center)


def chi_tiet(p):
    w, d, h = p["co"]
    shape = p["hinh"]
    material = p.get("vat_lieu", "da")
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
    elif shape == "khoi_tiet_dien":
        pieces = [khoi_tiet_dien(p)]
    elif shape == "lang_tru":
        pieces = [vo_khoi(p["day"], p["co"], 1, material)]
    else:
        pieces = [vat(shape, (0, 0, 0), p["co"], material)]
    for ob in pieces:
        ob.location = center + rot @ ob.location
        ob.rotation_euler = (rot @ ob.rotation_euler.to_matrix()).to_euler()
        if any(p.get("dich_chuyen", [])):
            ob["dich"] = p["dich_chuyen"]


def dung(s):
    if s["loai"] == "phep_thu":
        phep_thu(s)
    elif s["loai"] == "vuon":
        vuon(s)
    elif s["loai"] == "lap_ghep":
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


def render(plan, dest):
    global MATS
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    MATS = {}
    for name, rgb in COLORS.items():
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (*rgb, 1)
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (*rgb, 1)
        shader.inputs["Roughness"].default_value = 0.26 if name in ("kinh", "nuoc", "thep") else 0.72
        shader.inputs["Metallic"].default_value = 0.75 if name == "thep" else 0.04
        if name in ("gach", "dat", "co", "go", "nuoc"):
            tree = mat.node_tree
            noise = tree.nodes.new("ShaderNodeTexNoise")
            noise.inputs["Scale"].default_value = 36
            ramp = tree.nodes.new("ShaderNodeValToRGB")
            for elem, gain in zip(ramp.color_ramp.elements, (0.56, 1.18)):
                elem.color = (*[min(1, v * gain) for v in rgb], 1)
            tree.links.new(noise.outputs["Fac"], ramp.inputs[0])
            tree.links.new(ramp.outputs[0], shader.inputs["Base Color"])
            bump = tree.nodes.new("ShaderNodeBump")
            bump.inputs["Strength"].default_value = 0.19
            bump.inputs["Distance"].default_value = 0.045
            tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
            tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])
        MATS[name] = mat
    dung(plan)
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in scene.objects for c in o.bound_box]
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
    direction = Vector((0.64, -1.45, 1.04)).normalized()
    bpy.ops.object.camera_add(location=center + direction * span * 2)
    cam = bpy.context.object
    cam.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    cam.data.type = "ORTHO"
    rot = cam.rotation_euler.to_matrix().transposed()
    view = [rot @ (p - center) for p in pts]
    cam.data.ortho_scale = 1.12 * max(
        2 * max(abs(p.x) for p in view), 2 * max(abs(p.y) for p in view) * 1.6
    )
    cam.data.clip_start = span * 0.0001
    cam.data.clip_end = span * 80
    scene.camera = cam
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    bpy.ops.object.light_add(type="AREA", location=center + Vector((-1, -1, 2)) * span)
    lamp = bpy.context.object
    lamp.rotation_euler = (center - lamp.location).to_track_quat("-Z", "Y").to_euler()
    lamp.data.energy = span**2 * 160
    lamp.data.shape = "DISK"
    lamp.data.size = span * 1.15
    scene.world = bpy.data.worlds.new("Ánh sáng trời")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.76, 0.86, 1, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.38
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 20
    scene.cycles.use_denoising = False
    scene.render.resolution_x, scene.render.resolution_y = 960, 600
    scene.render.resolution_percentage = 100
    # Lấy cả quỹ đạo trong cùng khung trực giao, dừng ở góc dùng để chiếu nét Manim.
    from mathutils import Matrix
    from bpy_extras.object_utils import world_to_camera_view

    scene.cycles.samples = 12
    for i in range(16):
        t = i / 15
        angle = math.radians(-7 * (1 - t * t * (3 - 2 * t)))
        for ob, origin, delta in moving:
            ob.location = origin + delta * t * t * (3 - 2 * t)
            ob.location.z += ob.get("nhac", 0) * math.sin(t * math.pi)
        for ob, origin, rotation, pivot in spinning:
            turn = Matrix.Rotation(1.5 * math.pi * (1 - t * t * (3 - 2 * t)), 3, "X")
            ob.location = pivot + turn @ (origin - pivot) + Vector((0, 0, 0.45 * math.sin(math.pi * t)))
            ob.rotation_euler = (turn @ rotation).to_euler()
        axis = Matrix.Rotation(angle, 3, "Z") @ direction
        cam.location = center + axis * span * 2
        cam.rotation_euler = (-axis).to_track_quat("-Z", "Y").to_euler()
        bpy.context.view_layer.update()
        scene.render.filepath = str(dest.parent / f"orbit-{i}.png")
        bpy.ops.render.render(write_still=True)

    def project(pt):
        uv = world_to_camera_view(scene, cam, Vector(pt))
        return [float(uv.x), float(uv.y)]

    lines = []

    def edge(a, b, color="#7EE9DB", flat=False):
        lines.append(
            dict(a=project(a), b=project(b), color=color, flat=[list(a[:2]), list(b[:2])] if flat else None)
        )

    kind = plan["loai"]
    if kind == "phep_thu" or plan.get("giu_vat"):
        dest.write_text(json.dumps({"phepThu": True}))
        return
    if plan.get("doan_toan"):
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
            if ob.type != "MESH":
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
