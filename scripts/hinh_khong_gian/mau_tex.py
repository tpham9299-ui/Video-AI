"""v98 - KHỚP MÀU KaTeX <-> 3D (Semantic Color Sync): đối tượng trên hình mang màu nào thì tên đoạn / điểm tương ứng trong
công thức tầng 3 tô đúng màu đó (`\\textcolor{#hex}{AM}`).

Chỉ tô KÝ HIỆU HÌNH HỌC đứng riêng trong chế độ toán: tên viết hoa (+ chỉ số `_1` / `_{12}`, dấu phẩy trên `'`) trùng ĐÚNG khóa
`bangMau` (AM, MB', A_1B'...). Không tô bên trong lệnh TeX (\\text{...}, \\sqrt, \\frac tên lệnh), không tô chữ thường / số, không
tô lặp (đã có \\textcolor). Khóa dài khớp trước (MB' trước MB, AB' trước A).
"""
import re

RE_LENH_CHU = re.compile(r"\\(?:text|mathrm|operatorname|textbf|mbox)\s*\{[^{}]*\}")


def _mau_hex(m):
    m = str(m or "").strip()
    return m if re.fullmatch(r"#[0-9A-Fa-f]{6}", m) else None


def to_mau_dong(tex, bang):
    """Một dòng TeX -> (dòng đã tô, số chỗ tô)."""
    s = str(tex or "")
    if not s or not bang or "\\textcolor" in s:
        return s, 0
    khoa = sorted([k for k in bang if _mau_hex(bang[k]) and re.fullmatch(r"[A-Z](?:_\{?\d+\}?)?'*(?:[A-Z](?:_\{?\d+\}?)?'*)?", k)], key=len, reverse=True)
    if not khoa:
        return s, 0
    # che các khối chữ \text{...} để không tô nhầm chữ tiếng Việt in hoa
    giu = []

    def che(m):
        giu.append(m.group(0))
        return "\x00%d\x00" % (len(giu) - 1)
    s2 = RE_LENH_CHU.sub(che, s)
    mau_khoa = "|".join(re.escape(k) for k in khoa)
    # biên: không đứng sau chữ / \ / _ / ^, không đứng trước chữ cái / chỉ số / phẩy trên (tránh tô "M" trong "MB")
    re_k = re.compile(r"(?<![A-Za-z\\_^{])(" + mau_khoa + r")(?![A-Za-z0-9_'])")
    n = [0]

    def to(m):
        n[0] += 1
        return "\\textcolor{%s}{%s}" % (bang[m.group(1)], m.group(1))
    s3 = re_k.sub(to, s2)
    s3 = re.sub(r"\x00(\d+)\x00", lambda m: giu[int(m.group(1))], s3)
    return s3, n[0]


def khop_mau_buoc(buoc, bang):
    """Tô màu các dòng công thức của mọi thẻ (props.khung4tang.buoc) -> số dòng đã tô."""
    dem = 0
    for b in buoc or []:
        for th in b.get("the") or []:
            if th.get("loai") != "cong_thuc":
                continue
            moi = []
            for d in th.get("dong") or []:
                x, n = to_mau_dong(d, bang)
                moi.append(x)
                dem += 1 if n else 0
            th["dong"] = moi
    return dem
