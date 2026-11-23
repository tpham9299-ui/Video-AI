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
ma = json.loads(sys.stdin.buffer.read().decode("utf8"))["ma"]
def _nhap(ten, *a, **k):
    if ten != "math":
        raise ImportError("chi duoc import math")
    return math
an_toan = {k: __builtins__[k] if isinstance(__builtins__, dict) else getattr(__builtins__, k) for k in (
    "abs", "all", "any", "bool", "dict", "enumerate", "filter", "float", "format", "int", "isinstance", "len", "list",
    "map", "max", "min", "pow", "range", "reversed", "round", "set", "sorted", "str", "sum", "tuple", "zip", "divmod",
    "ValueError", "ZeroDivisionError", "IndexError", "KeyError", "TypeError", "Exception", "True", "False", "None")
    if (k in __builtins__ if isinstance(__builtins__, dict) else hasattr(__builtins__, k))}
an_toan["__import__"] = _nhap
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
            if any(a.name != "math" for a in n.names):
                raise LoiTuSinh("TS_IMPORT: chỉ được import math")
        if isinstance(n, ast.ImportFrom):
            if n.module != "math" or n.level:
                raise LoiTuSinh("TS_IMPORT: chỉ được from math import ...")
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
        r = subprocess.run([sys.executable, "-I", "-S", "-c", _CHAY], input=json.dumps({"ma": ma}), capture_output=True,
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


def dung(ma, so_buoc):
    """Chạy + kiểm. Trả list lớp đã chuẩn hóa hoặc ném LoiTuSinh."""
    return chuan_lop(chay_hop_cat(ma), so_buoc)


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
          "rgba(0,0,0,.25) lệch xuống).\nĐề: %s\nLỗi: %s\nMã:\n%s") % (so_buoc - 1, str(de)[:600], loi, ma[:12000])
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
    try:
        lop = dung(ma, n)
        ghi = ""
    except LoiTuSinh as e:
        moi = nho_gemini_sua(str(ma or ""), str(e), kb.get("de_bai"), n)
        if not moi:
            return None, str(e)
        try:
            lop = dung(moi, n)
            ghi = "đã tự sửa 1 lần (%s)" % str(e).split(":")[0]
        except LoiTuSinh as e2:
            return None, "%s; sau tự sửa: %s" % (e, e2)
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
