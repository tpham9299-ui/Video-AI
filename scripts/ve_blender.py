"""Bộ dựng ảnh minh họa 3D tĩnh bằng Blender Cycles, chạy trên CPU."""

import json
import math
import random
from pathlib import Path
import sys

import bpy
from mathutils import Vector


COLORS = {
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


def dung(s):
    if s["loai"] == "vuon":
        vuon(s)
    elif s["loai"] == "lap_ghep":
        for p in s["chi_tiet"]:
            vat(p["hinh"], p["tam"], p["co"], p.get("vat_lieu", "da"), p.get("xoay", (0, 0, 0)))
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
    vat("hop", (center.x, center.y, lo.z - span * 0.016), (span * 50, span * 50, span * 0.03), "co")
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
    tmp = dest.with_suffix(".tmp.png")
    scene.render.filepath = str(tmp)
    bpy.ops.render.render(write_still=True)
    tmp.replace(dest)


if __name__ == "__main__":
    batch = Path(sys.argv[sys.argv.index("--") + 1])
    for path, spec in json.loads(batch.read_text()).items():
        render(spec, Path(path))
