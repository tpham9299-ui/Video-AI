"""v99.1 — Sân khấu tự sinh 2.5D (`tu_sinh_svg`) cho tầng 2 Khung 4 tầng.

BP2 (Gemini) viết kèm kịch bản một đoạn Python NGẮN, thuần toán học:

    kb.khung4tang.tu_sinh = {"ma": "<mã Python>", "mo_ta": "..."}
    # mã định nghĩa  def ve():  trả list lớp  [{"buoc": 0, "svg": "<g>...</g>", "hieu_ung": "moc|no|sang|ve",
    #                                          "khi_noi": "cụm lời (tùy chọn)", "nhan": "tên lớp"}]

Hộp cát 3 lớp (mã do AI viết KHÔNG bao giờ được tin):
  1. Lọc cú pháp (AST): chỉ `import math` / `from math import ...`; cấm thuộc tính / tên bắt đầu bằng "_", cấm
     open / eval / exec / compile / getattr / globals / type / object..., cấm global / nonlocal / with / async / try-finally ẩn.
  2. Chạy trong tiến trình con `python -I -S` (không site, không biến môi trường người dùng), builtins rút gọn, `__import__`
     chỉ trả `math`, timeout 5 s, Linux thêm giới hạn CPU 5 s / bộ nhớ 512 MB / không ghi tệp (RLIMIT_FSIZE = 0).
  3. Kiểm đầu ra: <= 14 lớp, tổng SVG <= 220 KB, phần tử trong danh sách trắng (g path polygon polyline line circle ellipse
     rect text tspan defs linearGradient radialGradient stop), không thuộc tính on*, không href / url() ngoài, path chỉ lệnh
     TUYỆT ĐỐI (M L H V C S Q T A Z), MỌI tọa độ trong viewBox 0 0 800 540 (dung sai 2 px).
Lỗi -> nhờ Gemini sửa đúng 1 lần (khi có GEMINI_KEYS, không chạy ở chế độ giả lập) -> vẫn lỗi: trả None (chuanbi giữ sân
khấu 2D / 3D dự phòng).

v99.2:
  * mã được `import ve25d` (thư viện vẽ 2.5D dựng sẵn, scripts/ve25d.py - chạy cùng builtins rút gọn trong hộp cát);
  * kiểm THẨM MỸ cứng (`kiem_tham_my`): chữ >= 22 px (TS_CHU_NHO), màu chỉ thuộc họ màu theme (TS_MAU_LA), nhãn không
    đè nét / đỉnh của mọi lớp cùng hiện (TS_NHAN_DE_NET);
  * `doi_mau_theme`: xoay họ màu nhấn cyan của lớp SVG theo theme nền của video (chuanbi gọi sau chon_theme);
  * hợp đồng BP0 `kb.san_khau_dich = tu_sinh_svg`: vá tối đa 2 lần (kèm nhật ký lỗi); vẫn hỏng -> `tu_sinh_hong` (chuanbi ghi
    props.khung4tang.tuSinhHong -> Mắt thần lỗi cứng `tu_sinh_hong`), KHÔNG âm thầm rơi về sân khấu chữ.
"""
import ast
import json
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIEWBOX = (800.0, 540.0)
DUNG_SAI = 2.0
TIMEOUT = 5.0
TOI_DA_LOP = 14
TOI_DA_SVG = 220_000

TEN_CAM = {"open", "eval", "exec", "compile", "getattr", "setattr", "delattr", "globals", "locals", "vars", "input",
           "breakpoint", "help", "exit", "quit", "memoryview", "type", "object", "super", "classmethod", "staticmethod",
           "property", "__import__", "__builtins__", "dir", "id", "hash", "iter", "next", "bytearray", "bytes"}
NUT_CAM = (ast.Global, ast.Nonlocal, ast.With, ast.AsyncWith, ast.AsyncFunctionDef, ast.AsyncFor, ast.Await,
           ast.ClassDef, ast.Yield, ast.YieldFrom, ast.Delete)
THE_SVG = {"g", "path", "polygon", "polyline", "line", "circle", "ellipse", "rect", "text", "tspan", "defs",
           "linearGradient", "radialGradient", "stop"}
MO_DUN = ("math", "ve25d")
TEP_VE25D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ve25d.py")
CO_CHU_SAN = 22.0
THUOC_TINH_X = {"x", "cx", "x1", "x2", "fx"}
THUOC_TINH_Y = {"y", "cy", "y1", "y2", "fy"}

# mã chạy trong tiến trình con: đọc {"ma"} từ stdin, in JSON kết quả ra stdout
_CHAY = r'''
import json, math, sys
try:
    import resource
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_FSIZE, (0, 0))
    resource.setrlimit(resource.RLIMIT_NOFILE, (8, 8))
except Exception:
    pass
vao = json.loads(sys.stdin.buffer.read().decode("utf8"))
ma = vao["ma"]
_mod = {}
def _nhap(ten, *a, **k):
    if ten == "math":
        return math
    if ten == "ve25d" and "ve25d" in _mod:
        return _mod["ve25d"]
    raise ImportError("chi duoc import math / ve25d")
an_toan = {k: __builtins__[k] if isinstance(__builtins__, dict) else getattr(__builtins__, k) for k in (
    "abs", "all", "any", "bool", "dict", "enumerate", "filter", "float", "format", "int", "isinstance", "len", "list",
    "map", "max", "min", "pow", "range", "reversed", "round", "set", "sorted", "str", "sum", "tuple", "zip", "divmod",
    "ValueError", "ZeroDivisionError", "IndexError", "KeyError", "TypeError", "Exception", "True", "False", "None")
    if (k in __builtins__ if isinstance(__builtins__, dict) else hasattr(__builtins__, k))}
an_toan["__import__"] = _nhap
if vao.get("ve25d"):
    class _M(object):
        pass
    _g = {"__builtins__": an_toan, "__name__": "ve25d"}
    exec(compile(vao["ve25d"], "<ve25d>", "exec"), _g)
    _m = _M()
    for _k, _v in _g.items():
        if not _k.startswith("_"):
            setattr(_m, _k, _v)
    _mod["ve25d"] = _m
g = {"__builtins__": an_toan, "math": math, "__name__": "tu_sinh"}
exec(compile(ma, "<tu_sinh>", "exec"), g)
if "ve" not in g:
    raise SystemExit("THIEU_HAM_VE")
kq = g["ve"]()
sys.stdout.write(json.dumps(kq, ensure_ascii=True))
'''


class LoiTuSinh(Exception):
    pass


# ---------------------------------------------------------------- lớp 1: lọc cú pháp
def kiem_ast(ma):
    if not isinstance(ma, str) or not ma.strip():
        raise LoiTuSinh("TS_THIEU_MA: không có mã Python")
    if len(ma) > 20_000:
        raise LoiTuSinh("TS_MA_DAI: mã > 20 000 ký tự")
    try:
        cay = ast.parse(ma)
    except SyntaxError as e:
        raise LoiTuSinh("TS_CU_PHAP: dòng %s: %s" % (e.lineno, e.msg))
    co_ve = False
    for n in ast.walk(cay):
        if isinstance(n, NUT_CAM):
            raise LoiTuSinh("TS_CAM: không dùng %s" % type(n).__name__)
        if isinstance(n, ast.Import):
            if any(a.name not in MO_DUN for a in n.names):
                raise LoiTuSinh("TS_IMPORT: chỉ được import math / ve25d")
        if isinstance(n, ast.ImportFrom):
            if n.module not in MO_DUN or n.level:
                raise LoiTuSinh("TS_IMPORT: chỉ được from math / ve25d import ...")
        if isinstance(n, ast.Attribute) and n.attr.startswith("_"):
            raise LoiTuSinh("TS_CAM: thuộc tính ẩn .%s" % n.attr)
        if isinstance(n, ast.Name) and (n.id in TEN_CAM or n.id.startswith("__")):
            raise LoiTuSinh("TS_CAM: tên %s" % n.id)
        if isinstance(n, ast.FunctionDef) and n.name == "ve":
            co_ve = True
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and "__" in n.value:
            raise LoiTuSinh("TS_CAM: chuỗi chứa '__' (chặn thoát qua str.format)")
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and re.search(r"<\s*script|javascript:|xlink:href|\bhref\s*=", n.value, re.I):
            raise LoiTuSinh("TS_SVG_CAM: chuỗi chứa script / href")
    if not co_ve:
        raise LoiTuSinh("TS_THIEU_HAM_VE: cần def ve(): return [ {buoc, svg, hieu_ung} ]")
    return True


# ---------------------------------------------------------------- lớp 2: tiến trình con
def chay_hop_cat(ma, timeout=TIMEOUT):
    kiem_ast(ma)
    env = {"PATH": os.environ.get("PATH", ""), "PYTHONIOENCODING": "utf8", "SYSTEMROOT": os.environ.get("SYSTEMROOT", "")}
    thu_muc = tempfile.mkdtemp(prefix="tu_sinh_")
    try:
        v25 = open(TEP_VE25D, encoding="utf8").read() if "ve25d" in ma and os.path.isfile(TEP_VE25D) else ""
        r = subprocess.run([sys.executable, "-I", "-S", "-c", _CHAY], input=json.dumps({"ma": ma, "ve25d": v25}), capture_output=True,
                           text=True, encoding="utf8", timeout=timeout, cwd=thu_muc, env=env)
    except subprocess.TimeoutExpired:
        raise LoiTuSinh("TS_QUA_GIO: mã chạy quá %.0f s" % timeout)
    finally:
        try:
            os.rmdir(thu_muc)
        except OSError:
            pass
    if r.returncode != 0:
        dong = [d for d in (r.stderr or "").strip().splitlines() if d.strip()]
        raise LoiTuSinh("TS_LOI_CHAY: %s" % (dong[-1][:200] if dong else "mã thoát %d" % r.returncode))
    if len(r.stdout) > TOI_DA_SVG * 1.5:
        raise LoiTuSinh("TS_QUA_LON: đầu ra quá lớn")
    try:
        return json.loads(r.stdout)
    except ValueError:
        raise LoiTuSinh("TS_KHONG_JSON: ve() phải trả list dict")


# ---------------------------------------------------------------- lớp 3: kiểm SVG
def _so(s):
    return [float(x) for x in re.findall(r"-?\d*\.?\d+(?:e-?\d+)?", str(s))]


def _trong(x, y):
    return -DUNG_SAI <= x <= VIEWBOX[0] + DUNG_SAI and -DUNG_SAI <= y <= VIEWBOX[1] + DUNG_SAI


def _kiem_path(d):
    lenh = re.findall(r"[A-Za-z]", d)
    if any(c.islower() for c in lenh):
        raise LoiTuSinh("TS_PATH_TUONG_DOI: path chỉ dùng lệnh TUYỆT ĐỐI (M L H V C S Q T A Z)")
    if any(c not in "MLHVCSQTAZ" for c in lenh):
        raise LoiTuSinh("TS_PATH_LENH: lệnh path lạ")
    for m in re.finditer(r"([MLHVCSQTAZ])([^MLHVCSQTAZ]*)", d):
        c, so = m.group(1), _so(m.group(2))
        if c == "Z":
            continue
        if c == "H":
            pts = [(x, 0) for x in so]
        elif c == "V":
            pts = [(0, y) for y in so]
        elif c == "A":
            pts = [(so[k + 5], so[k + 6]) for k in range(0, len(so) - 6, 7)]
        else:
            pts = list(zip(so[0::2], so[1::2]))
        for x, y in pts:
            if not _trong(x, y):
                raise LoiTuSinh("TS_TRAN_VIEWBOX: điểm (%.0f, %.0f) ngoài 0 0 800 540" % (x, y))


def kiem_svg(svg):
    if not isinstance(svg, str) or not svg.strip():
        raise LoiTuSinh("TS_SVG_RONG")
    if re.search(r"<\s*script|javascript:|href\s*=|<!ENTITY|<!DOCTYPE|foreignObject|<\s*image", svg, re.I):
        raise LoiTuSinh("TS_SVG_CAM: script / href / ảnh ngoài / foreignObject")
    try:
        goc = ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">' + svg + "</svg>")
    except ET.ParseError as e:
        raise LoiTuSinh("TS_SVG_HONG: %s" % str(e)[:120])
    for el in goc.iter():
        ten = el.tag.split("}")[-1]
        if el is goc:
            continue
        if ten not in THE_SVG:
            raise LoiTuSinh("TS_SVG_THE: thẻ <%s> không được phép" % ten)
        for k, v in el.attrib.items():
            k = k.split("}")[-1]
            if k.lower().startswith("on"):
                raise LoiTuSinh("TS_SVG_CAM: thuộc tính %s" % k)
            if "url(" in v and not re.fullmatch(r"\s*url\(#[\w-]+\)\s*", v) and k != "style":
                raise LoiTuSinh("TS_SVG_CAM: url ngoài ở %s" % k)
            if k == "style" and re.search(r"url\((?!#)", v):
                raise LoiTuSinh("TS_SVG_CAM: url ngoài trong style")
            if k == "filter":
                raise LoiTuSinh("TS_SVG_FILTER: không dùng filter (bóng mềm = bản sao lệch mờ)")
            if k == "d":
                _kiem_path(v)
            elif k == "points":
                so = _so(v)
                for x, y in zip(so[0::2], so[1::2]):
                    if not _trong(x, y):
                        raise LoiTuSinh("TS_TRAN_VIEWBOX: điểm (%.0f, %.0f) ngoài 0 0 800 540" % (x, y))
            elif k in THUOC_TINH_X and ten not in ("linearGradient", "radialGradient", "stop"):
                if any(not _trong(x, 0) for x in _so(v)):
                    raise LoiTuSinh("TS_TRAN_VIEWBOX: %s=%s" % (k, v))
            elif k in THUOC_TINH_Y and ten not in ("linearGradient", "radialGradient", "stop"):
                if any(not _trong(0, y) for y in _so(v)):
                    raise LoiTuSinh("TS_TRAN_VIEWBOX: %s=%s" % (k, v))
            elif k == "r" and any(x > 400 for x in _so(v)):
                raise LoiTuSinh("TS_TRAN_VIEWBOX: bán kính quá lớn")
            elif k == "transform" and re.search(r"(scale|rotate|matrix|skew)", v):
                raise LoiTuSinh("TS_TRANSFORM: chỉ translate (tọa độ tính sẵn trong Python)")
            elif k == "transform":
                for dx, dy in zip(*[iter(_so(v) + [0])] * 2):
                    if abs(dx) > 40 or abs(dy) > 40:
                        raise LoiTuSinh("TS_TRANSFORM: translate > 40 px (tính thẳng tọa độ)")
    return True


def chuan_lop(kq, so_buoc):
    if not isinstance(kq, list) or not kq:
        raise LoiTuSinh("TS_KHONG_LOP: ve() trả list rỗng")
    if len(kq) > TOI_DA_LOP:
        raise LoiTuSinh("TS_NHIEU_LOP: > %d lớp" % TOI_DA_LOP)
    tong = 0
    ra = []
    for k, l in enumerate(kq):
        if not isinstance(l, dict):
            raise LoiTuSinh("TS_LOP_HONG: lớp %d không phải dict" % k)
        svg = l.get("svg")
        kiem_svg(svg)
        tong += len(svg)
        try:
            b = int(l.get("buoc", 0))
        except (TypeError, ValueError):
            raise LoiTuSinh("TS_LOP_HONG: lớp %d thiếu buoc số" % k)
        svg = re.sub(r'\s+font-family="[^"]*"', "", svg)   # chữ thừa kế phông Be Vietnam (VietNoi) của sân khấu
        hu = str(l.get("hieu_ung") or "moc")
        ra.append({"id": "l%d" % k, "buoc": max(0, min(so_buoc - 1, b)), "svg": svg,
                   "hieu_ung": hu if hu in ("moc", "no", "sang", "ve") else "moc",
                   **({"khi_noi": str(l["khi_noi"])[:80]} if l.get("khi_noi") else {}),
                   **({"nhan": str(l["nhan"])[:40]} if l.get("nhan") else {}),
                   # nhom: lớp cùng nhóm THAY nhau (nhãn tiêu đề / số giữa hình) - lớp mới hiện thì lớp cũ cùng nhóm mờ đi
                   **({"nhom": re.sub(r"[^\w-]", "", str(l["nhom"]))[:24]} if l.get("nhom") else {})})
    if tong > TOI_DA_SVG:
        raise LoiTuSinh("TS_QUA_LON: tổng SVG %d > %d byte" % (tong, TOI_DA_SVG))
    if len({l["buoc"] for l in ra}) < min(3, so_buoc):
        raise LoiTuSinh("TS_DUNG_IM: lớp phải gắn ít nhất %d bước khác nhau (mỗi bước đổi hình)" % min(3, so_buoc))
    return ra


def dung(ma, so_buoc, tham_my=True):
    """Chạy + kiểm. Trả list lớp đã chuẩn hóa hoặc ném LoiTuSinh."""
    ra = chuan_lop(chay_hop_cat(ma), so_buoc)
    if tham_my:
        kiem_tham_my(ra)
    return ra


# ---------------------------------------------------------------- v99.2: kiểm thẩm mỹ (chữ / màu / nhãn đè nét)
def _hex_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[k:k + 2], 16) / 255.0 for k in (0, 2, 4))


def _hsl(rgb):
    r, g, b = rgb
    mx, mn = max(rgb), min(rgb)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        h = (g - b) / d + (6 if g < b else 0)
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60.0, s, l


def _rgb_hex(r, g, b):
    return "#%02X%02X%02X" % tuple(max(0, min(255, int(round(x * 255)))) for x in (r, g, b))


def _hsl_rgb(h, s, l):
    def f(n):
        k = (n + h / 30.0) % 12
        a = s * min(l, 1 - l)
        return l - a * max(-1, min(k - 3, 9 - k, 1))
    return f(0), f(8), f(4)


def _do_sang(rgb):
    def c(x):
        return x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4
    r, g, b = (c(x) for x in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


# họ màu được phép: cyan nhấn (~185°), hổ phách (~37°), ✓ xanh lá (~137°), ✕ đỏ (~0°); xám (bão hòa < 0,16) và màu TỐI (độ sáng < 0,08) luôn được
HO_MAU = ((185.0, 22.0), (37.0, 16.0), (137.0, 14.0), (0.0, 12.0))


def _mau_token():
    try:
        sys.path.insert(0, os.path.dirname(TEP_VE25D))
        import ve25d
        return {v.upper() for v in ve25d.MAU.values() if v.startswith("#")}
    except Exception:   # noqa: BLE001
        return set()


MAU_TOKEN = _mau_token()


def mau_hop_le(hexm):
    if hexm.upper() in MAU_TOKEN:
        return True
    rgb = _hex_rgb(hexm)
    h, s, l = _hsl(rgb)
    if s < 0.16 or _do_sang(rgb) < 0.08:
        return True
    return any(min(abs(h - c), 360 - abs(h - c)) <= w for c, w in HO_MAU)


def _so_co(v):
    m = re.search(r"(\d+(?:\.\d+)?)", str(v or ""))
    return float(m.group(1)) if m else None


def _phan_tu(lop):
    """Duyệt (thẻ, thuộc tính, cỡ chữ thừa kế, độ đục tích lũy) của mọi phần tử trong lớp."""
    goc = ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">' + lop["svg"] + "</svg>")
    ra = []

    def di(el, co, mo):
        ten = el.tag.split("}")[-1]
        a = {k.split("}")[-1]: v for k, v in el.attrib.items()}
        st = dict(x.split(":", 1) for x in str(a.get("style") or "").split(";") if ":" in x)
        st = {k.strip(): v.strip() for k, v in st.items()}
        c = _so_co(a.get("font-size") or st.get("font-size"))
        co = c if c is not None else co
        for k in ("opacity",):
            try:
                mo *= float(a.get(k) or st.get(k) or 1)
            except ValueError:
                pass
        ra.append((ten, a, st, co, mo, el))
        for con in el:
            di(con, co, mo)
    di(goc, None, 1.0)
    return ra[1:]


def _diem_doan(ten, a, mo):
    """Đỉnh + đoạn thẳng của một phần tử hình (bỏ rect: hộp nền nhãn; bỏ nét mờ trang trí)."""
    def so(k, mac=0.0):
        try:
            return float(a.get(k) or mac)
        except ValueError:
            return mac
    try:
        mo_net = float(a.get("stroke-opacity") or 1)
    except ValueError:
        mo_net = 1.0
    co_to = str(a.get("fill") or "") not in ("", "none")
    mo_vien = mo * (mo_net if a.get("stroke") not in (None, "none") else (0.0 if not co_to else 1.0))
    if ten == "rect" or (mo_vien < 0.3 and not co_to):
        return [], []
    dinh, doan = [], []
    if ten in ("polygon", "polyline"):
        v = _so(a.get("points"))
        pts = list(zip(v[0::2], v[1::2]))
        dinh += pts
        doan += list(zip(pts, pts[1:])) + ([(pts[-1], pts[0])] if ten == "polygon" and len(pts) > 2 else [])
    elif ten == "line":
        p, q = (so("x1"), so("y1")), (so("x2"), so("y2"))
        dinh += [p, q]
        doan.append((p, q))
    elif ten == "circle" and so("r") <= 12:
        dinh.append((so("cx"), so("cy")))
    elif ten == "path":
        cur, dau = None, None
        for mm in re.finditer(r"([MLHVCSQTAZ])([^MLHVCSQTAZ]*)", str(a.get("d") or "")):
            c, v = mm.group(1), _so(mm.group(2))
            if c == "Z":
                if cur and dau:
                    doan.append((cur, dau))
                cur = dau
                continue
            if c == "H":
                pts = [(x, cur[1] if cur else 0) for x in v]
            elif c == "V":
                pts = [(cur[0] if cur else 0, y) for y in v]
            elif c == "A":
                pts = [(v[k + 5], v[k + 6]) for k in range(0, len(v) - 6, 7)]
            elif c in "CS":
                n = 6 if c == "C" else 4
                pts = []
                for k in range(0, len(v) - n + 1, n):
                    p0 = cur or (v[k], v[k + 1])
                    if c == "C":
                        c1, c2, p3 = (v[k], v[k + 1]), (v[k + 2], v[k + 3]), (v[k + 4], v[k + 5])
                    else:
                        c1, c2, p3 = p0, (v[k], v[k + 1]), (v[k + 2], v[k + 3])
                    for t in (0.25, 0.5, 0.75):
                        u = 1 - t
                        pts.append((u ** 3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * p3[0],
                                    u ** 3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * p3[1]))
                    pts.append(p3)
                    cur = p3
                pts_cuoi = pts
                for q in pts_cuoi:
                    pass
            else:
                pts = list(zip(v[0::2], v[1::2]))
            for k, q in enumerate(pts):
                if c == "M" and k == 0:
                    dau = q
                elif cur is not None and c != "A":
                    doan.append((cur, q))
                cur = q
            if pts:
                dinh.append(pts[-1] if c not in "ML" else pts[0])
                if c in "ML":
                    dinh += pts[1:]
    return dinh, doan


def _cat_hop(p, q, x0, y0, x1, y1):
    """Đoạn pq có đi qua hộp (x0, y0, x1, y1) không (Liang-Barsky)."""
    dx, dy = q[0] - p[0], q[1] - p[1]
    t0, t1 = 0.0, 1.0
    for pp, qq in ((-dx, p[0] - x0), (dx, x1 - p[0]), (-dy, p[1] - y0), (dy, y1 - p[1])):
        if pp == 0:
            if qq < 0:
                return False
        else:
            t = qq / pp
            if pp < 0:
                t0 = max(t0, t)
            else:
                t1 = min(t1, t)
            if t0 > t1:
                return False
    return True


def kiem_tham_my(ds):
    """Ném LoiTuSinh nếu: chữ < 22 px, màu ngoài họ màu theme, hộp chữ chứa đỉnh / cắt nét của lớp cùng hiện."""
    hinh, chu, hop = [], [], []
    # khoảng hiện (theo chỉ số bước) của từng lớp: từ bước của nó tới lớp KẾ TIẾP cùng nhóm (lớp đó thay nó); không nhóm -> tới hết
    het = []
    for li, l in enumerate(ds):
        sau = [ds[k]["buoc"] for k in range(li + 1, len(ds)) if l.get("nhom") and ds[k].get("nhom") == l.get("nhom")]
        het.append(min(sau) if sau else 10 ** 6)

    def cung_hien(i, j):
        if i == j:
            return True
        if ds[i].get("nhom") and ds[i].get("nhom") == ds[j].get("nhom"):
            return False
        return max(ds[i]["buoc"], ds[j]["buoc"]) < min(het[i], het[j])
    for li, l in enumerate(ds):
        for ten, a, st, co, mo, el in _phan_tu(l):
            if ten == "rect" and str(a.get("fill") or "none") != "none":
                try:
                    if mo * float(a.get("fill-opacity") or 1) >= 0.6:
                        rx, ry = float(a.get("x") or 0), float(a.get("y") or 0)
                        hop.append((li, (rx, ry, rx + float(a.get("width") or 0), ry + float(a.get("height") or 0))))
                except ValueError:
                    pass
            for k in ("fill", "stroke", "stop-color"):
                v = str(a.get(k) or st.get(k) or "")
                for h in re.findall(r"#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b", v):
                    if not mau_hop_le(h):
                        raise LoiTuSinh("TS_MAU_LA: màu %s ở lớp '%s' ngoài họ màu theme (dùng ve25d.MAU: nhan / ket / cu / chu / mat...)" % (h, l.get("nhan") or l["id"]))
            if ten in ("text", "tspan"):
                noi = "".join(el.itertext()).strip()
                if not noi:
                    continue
                if co is None:
                    raise LoiTuSinh("TS_CHU_NHO: chữ '%s' thiếu font-size (cần >= %d px; dùng ve25d.chu / ve25d.nhan)" % (noi[:20], CO_CHU_SAN))
                if co < CO_CHU_SAN:
                    raise LoiTuSinh("TS_CHU_NHO: chữ '%s' cỡ %g px < %d px (màn hình dọc không đọc được)" % (noi[:20], co, CO_CHU_SAN))
                if ten == "tspan" or mo < 0.3:
                    continue
                try:
                    x, y = float(a.get("x") or 0), float(a.get("y") or 0)
                except ValueError:
                    continue
                w = 0.52 * co * len(noi)
                neo = a.get("text-anchor") or st.get("text-anchor") or "start"
                x0 = x - w / 2 if neo == "middle" else (x - w if neo == "end" else x)
                chu.append((li, noi, (x0 + 3, y - 0.72 * co + 3, x0 + w - 3, y + 0.18 * co - 3)))
            else:
                dinh, doan = _diem_doan(ten, a, mo)
                if dinh or doan:
                    hinh.append((li, dinh, doan))
    # chữ đè chữ giữa các lớp CÙNG HIỆN (lớp cùng nhóm thay nhau thì bỏ qua) - lớp cũ chỉ dịu 82 %, không biến mất
    for a_ in range(len(chu)):
        la, na, ba = chu[a_]
        for b_ in range(a_ + 1, len(chu)):
            lb, nb, bb = chu[b_]
            if not cung_hien(la, lb):
                continue
            if min(ba[2], bb[2]) - max(ba[0], bb[0]) > 1 and min(ba[3], bb[3]) - max(ba[1], bb[1]) > 1:
                raise LoiTuSinh("TS_CHONG_CHU: chữ '%s' chồng chữ '%s' (lớp cũ vẫn hiện) - dời nhãn hoặc cho 2 lớp cùng 'nhom' để thay nhau" % (na[:20], nb[:20]))
    for li, noi, (x0, y0, x1, y1) in chu:
        if any(lk == li and h[0] - 2 <= x0 and h[1] - 2 <= y0 and x1 <= h[2] + 2 and y1 <= h[3] + 2 for lk, h in hop):
            continue   # chữ nằm trọn trong hộp nền đặc của chính lớp đó (hộp nền che nét phía sau) - được phép
        nhom = ds[li].get("nhom")
        for lj, dinh, doan in hinh:
            if not cung_hien(li, lj):
                continue   # hai lớp không cùng lúc trên màn hình (lớp cùng nhóm thay nhau)
            for px, py in dinh:
                if x0 <= px <= x1 and y0 <= py <= y1:
                    raise LoiTuSinh("TS_NHAN_DE_NET: chữ '%s' đè lên đỉnh (%.0f, %.0f) - đặt nhãn ngoài hình (ve25d.nhan có đường gióng)" % (noi[:24], px, py))
            for p, q in doan:
                if _cat_hop(p, q, x0, y0, x1, y1):
                    raise LoiTuSinh("TS_NHAN_DE_NET: chữ '%s' cắt nét (%.0f,%.0f)-(%.0f,%.0f) - đặt nhãn ngoài hình hoặc trong hộp nền (ve25d.nhan)" % (noi[:24], p[0], p[1], q[0], q[1]))
    return True


# ---------------------------------------------------------------- v99.2: họ màu nhấn theo theme nền
MAU_NHAN_THEME = {"deep_ocean": 184.0, "cosmic_indigo": 250.0, "emerald_studio": 158.0, "warm_slate": 186.0, "blueprint": 212.0}


def doi_mau_theme(ts, theme):
    """Xoay mọi màu thuộc họ cyan nhấn (165°..205°, không tối, không xám) sang sắc độ nhấn của theme (giữ độ bão hòa / sáng).
    Hổ phách / ✓ / ✕ / xám / tối giữ nguyên. Trả số màu đã đổi."""
    if not ts or theme not in MAU_NHAN_THEME:
        return 0
    dich = MAU_NHAN_THEME[theme]
    dem = [0]

    def doi(mm):
        rgb = _hex_rgb(mm.group(0))
        h, s, l = _hsl(rgb)
        if s < 0.16 or _do_sang(rgb) < 0.08 or not (165.0 <= h <= 205.0) or abs(dich - 185.0) < 3:
            return mm.group(0)
        dem[0] += 1
        return _rgb_hex(*_hsl_rgb(dich + (h - 185.0), s, l))
    for l in ts.get("lop") or []:
        l["svg"] = re.sub(r"#[0-9A-Fa-f]{6}\b", doi, l["svg"])
    ts["theme"] = theme
    return dem[0]


# ---------------------------------------------------------------- tự sửa 1 lần bằng Gemini
def nho_gemini_sua(ma, loi, de, so_buoc):
    keys = [k for k in re.split(r"[\s,;]+", os.environ.get("GEMINI_KEYS") or os.environ.get("GEMINI_API_KEY") or "") if k]
    if not keys or os.environ.get("VIDEO_AI_GIA_LAP") == "1":
        return None
    yc = ("Sửa đoạn mã Python sinh SVG cho video toán (KHÔNG giải thích, chỉ trả JSON {\"ma\": \"...\"}).\n"
          "Quy tắc: chỉ import math; định nghĩa def ve() trả list [{\"buoc\": 0..%d, \"svg\": \"<g>...</g>\", \"hieu_ung\": "
          "\"moc|no|sang|ve\", \"khi_noi\": \"cụm lời\"}]; mọi tọa độ trong viewBox 0 0 800 540; path chỉ lệnh tuyệt đối "
          "M L C Q A Z; không filter, không transform ngoài translate nhỏ; thẻ: g path polygon polyline line circle ellipse rect "
          "text defs linearGradient radialGradient stop; phong cách 2.5D (mặt bên tối hơn lệch 6-10 px, bóng mềm = bản sao "
          "rgba(0,0,0,.25) lệch xuống). Được `import ve25d as v` (v.MAU[...] màu theo theme, v.chu cỡ >= 24, v.nhan(x, y, chữ, tranh=[điểm]) "
          "tự đặt nhãn ngoài hình có đường gióng, v.hop / v.tru / v.trai_phang_2mat / v.he_truc / v.do_thi / v.cua / v.mien_to / v.lop). "
          "Chữ >= 22 px, nhãn không đè nét / đỉnh, chỉ màu họ cyan / hổ phách / xám / tối.\nĐề: %s\nLỗi: %s\nMã:\n%s") % (so_buoc - 1, str(de)[:600], loi, ma[:12000])
    body = {"contents": [{"role": "user", "parts": [{"text": yc}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json", "maxOutputTokens": 8192}}
    tep = os.path.join(tempfile.gettempdir(), "tu_sinh_%d.json" % os.getpid())
    with open(tep, "w", encoding="utf8") as f:
        json.dump({"model": "", "models": [], "bodies": [body], "keys": keys, "gioiHanGiay": 90, "cheDo": "nhe"}, f)
    try:
        r = subprocess.run(["node", os.path.join(GOC, "scripts", "bophan1", "goi_gemini.js"), tep],
                           capture_output=True, text=True, encoding="utf8", timeout=120)
        kq = json.loads(r.stdout or "[]")[0]
        if not kq.get("ok"):
            return None
        d = json.loads(kq["raw"])
        chu = "".join(x.get("text", "") for x in d["candidates"][0]["content"]["parts"])
        m = re.search(r"\{.*\}", chu, re.S)
        moi = json.loads(m.group(0) if m else chu).get("ma")
        return moi if isinstance(moi, str) and moi.strip() else None
    except Exception:   # noqa: BLE001 - mọi lỗi gọi -> coi như không sửa được
        return None
    finally:
        try:
            os.remove(tep)
        except OSError:
            pass


# ---------------------------------------------------------------- gắn mốc từng lớp theo bước / lời đọc
def gan_tu_sinh(kb, k4, buoc, tim_moc, t_het_de, tong):
    """(props.khung4tang.tuSinh | None, ghi chú). Lớp gắn bước `buoc` (mốc bước = mốc lời đọc), lớp có khi_noi khớp lời ->
    đúng giây đọc cụm đó (chỉ tiến, trong khung bước); không khớp -> lần lượt 1,1 s sau đầu bước."""
    sk = k4.get("san_khau") if isinstance(k4.get("san_khau"), dict) else {}
    spec = k4.get("tu_sinh") if isinstance(k4.get("tu_sinh"), dict) else (sk if sk.get("loai") == "tu_sinh_svg" else None)
    if not spec or not buoc:
        return None, ""
    ma = spec.get("ma") or (spec.get("tham_so") or {}).get("ma")
    n = len(buoc)
    so_va = 2 if str(kb.get("san_khau_dich") or "") == "tu_sinh_svg" else 1   # v99.2: hợp đồng BP0 -> vá tối đa 2 lần
    nhat_ky, lop, ghi = [], None, ""
    for lan in range(so_va + 1):
        try:
            lop = dung(ma, n)
            ghi = ("đã tự sửa %d lần (%s)" % (lan, "; ".join(x.split(":")[0] for x in nhat_ky))) if lan else ""
            break
        except LoiTuSinh as e:
            nhat_ky.append(str(e))
            if lan == so_va:
                return None, "; ".join(nhat_ky)
            moi = nho_gemini_sua(str(ma or ""), "\n".join("lần %d: %s" % (k + 1, x) for k, x in enumerate(nhat_ky)), kb.get("de_bai"), n)
            if not moi:
                return None, "; ".join(nhat_ky)
            ma = moi
    dem, con_tro, t_truoc = {}, 0, -1.0
    for l in lop:
        j = l.pop("buoc")
        t0 = buoc[j]["t"]
        t1 = buoc[j + 1]["t"] if j + 1 < n else tong
        k = dem.get(j, 0)
        dem[j] = k + 1
        t = None
        if l.get("khi_noi"):   # chỉ TIẾN: lớp sau dò từ sau cụm của lớp trước (cụm chỉ khác số -> không trùng mốc)
            kq = tim_moc(l["khi_noi"], con_tro, max(t0 - 0.3, t_het_de if j else 0))
            if kq and kq[2] < t1:
                t, con_tro = kq[2], kq[1]
        if t is None:
            t = t0 + (0.0 if j == 0 and k == 0 else 0.5 + 1.1 * k)
        if t <= t_truoc + 0.3 and k:   # hai lớp cùng bước không bật cùng một khung
            t = t_truoc + 1.0
        t_truoc = t
        l["t"] = round(min(max(t, t0), max(t0, t1 - 0.4)), 3)
        l["buoc"] = j
        l.pop("khi_noi", None)
    lop.sort(key=lambda l: l["t"])
    return {"viewBox": "0 0 800 540", "lop": lop, **({"mo_ta": str(spec["mo_ta"])[:120]} if spec.get("mo_ta") else {})}, ghi


def tu_sinh_hong(kb, ts, ghi):
    """Cảnh báo (chuỗi) khi kịch bản CÓ hợp đồng tu_sinh_svg mà không dựng được sân khấu tự sinh - '' nếu ổn / không hợp đồng."""
    if ts or str(kb.get("san_khau_dich") or "") != "tu_sinh_svg":
        return ""
    return ("Sân khấu tự sinh hỏng: " + (ghi or str(kb.get("tu_sinh_hong") or "kịch bản không có mã tu_sinh")))[:300]


if __name__ == "__main__":
    # python scripts/tu_sinh_svg.py kich_ban.json           -> in OK / LỖI
    # python scripts/tu_sinh_svg.py - --chi-kiem < kb.json  -> JSON {ok, loi, so_lop}; thoát 2 khi lỗi (BP2: kiemTuSinhMay_)
    nguon = sys.stdin.read() if sys.argv[1] == "-" else open(sys.argv[1], encoding="utf8").read()
    kb = json.loads(nguon)
    k4 = kb.get("khung4tang") or {}
    sp = k4.get("tu_sinh") or {}
    nb = len(k4.get("buoc") or []) or 4
    try:
        ds = dung(sp.get("ma"), nb)
        kq = {"ok": True, "loi": "", "so_lop": len(ds)}
    except LoiTuSinh as e:
        kq = {"ok": False, "loi": str(e), "so_lop": 0}
    if "--chi-kiem" in sys.argv:
        sys.stdout.write(json.dumps(kq, ensure_ascii=False))
    else:
        print(("OK %d lớp" % kq["so_lop"]) if kq["ok"] else "LỖI " + kq["loi"])
    sys.exit(0 if kq["ok"] else 2)
