"""Dựng mẫu hữu hạn từ dữ kiện đề và hành động ở từng bước."""
import re
from fractions import Fraction
from math import comb
from khung4tang_v96 import khop_dap_an


def ngan(kb):
    return (kb.get("mon") or kb.get("luong")) == "XAC_SUAT" and kb.get("kieu_video") != "DAI_10_PHUT" and not str(kb.get("id")).upper().endswith("-10P")


def sua_phan_bu(value):
    """Sửa đúng đẳng thức tự trừ đã mất dấu ngang, kể cả thẻ tóm tắt."""
    if isinstance(value, str):
        return re.sub(r"(P\s*\(\s*([A-Z])\s*\)\s*=\s*1\s*[-−]\s*P\s*\(\s*)\2(\s*\))",
                      lambda m: m[1] + r"\overline{" + m[2] + "}" + m[3], value)
    if isinstance(value, list):
        return [sua_phan_bu(x) for x in value]
    if isinstance(value, dict):
        return {k: sua_phan_bu(v) for k, v in value.items()}
    return value


def mo_phong(kb, nguon, buoc, loi_tai, tong):
    if not ngan(kb):
        return None
    de = str(kb.get("de_bai") or "").lower()
    def so(mau):
        m = re.search(mau, de)
        return int(m[1]) if m else 0
    ts = ((kb.get("khung4tang") or {}).get("san_khau") or {}).get("tham_so") or {}
    if not isinstance(ts, dict) or ts.get("co_hoan_lai"):
        return None
    color = r"(\d+)\s*(?:viên\s*)?(?:bi\s*)?(?:màu\s*)?"
    do, xanh = so(color+"đỏ"), so(color+"xanh")
    k = so(r"(?:chọn|rút|bốc|lấy)\s*(?:(?:ra|ngẫu nhiên|đồng thời|cùng lúc)\s+)*(\d+)")
    if not k and type(ts.get("k")) is int:
        k = ts["k"]
    nhan = []
    n = do + xanh
    if re.search(r"\ban\b", de) and "bình" in de and re.search(r"ít nhất\s+(?:một|1)", de) and k:
        n = so(r"(\d+)\s*(?:bạn|học sinh)")
        if not k <= n-2 or not 3 <= n <= 30:
            return None
        mode = "phan_bu"
        nhan = ["An", "Bình"] + list(map(str, range(1, n-1)))
        omega = comb(n, k)
        a = omega - comb(n-2, k)
    elif do and xanh and n <= 24 and re.search(r"lần lượt|từng viên|từng bi", de):
        giu = so(r"còn\s*(?:lại\s*)?(?:đúng\s*)?(\d+)\s*(?:viên\s*)?(?:bi\s*)?xanh")
        if not 0 < giu <= xanh or not re.search(r"dừng|hết.*đỏ|cuối.*đỏ", de):
            return None
        mode, k = "lan_luot", n-giu
        omega, a = comb(n, do), comb(k-1, do-1)
    elif do and xanh and 0 < k <= n <= 24:
        mode = "chia_th"
        omega, a = comb(n, k), 0
    else:
        return None
    pha, cases = [], {}
    for j, (b, raw) in enumerate(zip(buoc, nguon)):
        speech = loi_tai(b["t"], buoc[j+1]["t"] if j+1 < len(buoc) else tong)
        title = str(raw.get("tieu_de", "")).lower()
        action = raw.get("hanh_dong")
        action = action if isinstance(action, dict) else {}
        ten = action.get("pha") or raw.get("pha")
        if not isinstance(ten, str):
            ten = None
        van = (title + " " + speech + " " + str(raw.get("the", ""))).lower()
        if not ten:
            if j == 0:
                ten = "hien"
            elif re.search(r"biểu đồ|kết luận|kiểm chứng|chốt đáp|xác suất cần tìm", van):
                ten = "ti_le"
            elif mode == "chia_th" and re.search(r"th\s*[12]|trường hợp|(\d+)\s*(bi )?đỏ", van):
                ten = "truong_hop"
            elif mode == "lan_luot" and re.search(r"khóa|cuối|đỏ thứ|đếm", van):
                ten = "khoa"
            elif mode == "phan_bu" and re.search("đối|loại|còn lại", van):
                ten = "loai"
            elif re.search("bẫy|chỉnh hợp|thứ tự|dừng", van):
                ten = "dieu_kien"
            else:
                ten = "mau"
        if ten == "loai" and pha and pha[-1]["ten"] == "loai":
            ten = "dem"
        if ten not in {"hien", "mau", "dieu_kien", "truong_hop", "loai", "dem", "khoa", "ti_le"}:
            return None
        chosen, badge = [], ""
        if mode == "chia_th" and ten == "truong_hop":
            m = re.search(r"(\d+)\s*(?:viên\s*)?(?:bi\s*)?đỏ", van)
            red = action.get("do", int(m[1]) if m else None)
            if type(red) is not int or not 0 <= red <= min(k, do) or k-red > xanh:
                if action:
                    raise ValueError("XS_PHA: thiếu số bi đỏ hợp lệ")
                ten = "mau"
            else:
                ways = comb(do, red)*comb(xanh, k-red)
                cases[red] = ways
                chosen = list(range(red)) + list(range(do, do+k-red))
                badge = f"TH{list(cases).index(red)+1}: {ways} cách"
        if mode == "lan_luot":
            chosen = list(range(do-1)) + list(range(do, k)) + [do-1]
            if ten == "mau":
                chosen += list(range(k, n))
        elif mode == "phan_bu" and ten in ("loai", "dem"):
            chosen = list(range(2, 2+k))
            badge = "Loại An và Bình" if ten == "loai" else f"C({n-2},{k}) = {omega-a}"
        if mode == "chia_th" and ten in ("mau", "dieu_kien"):
            # Cùng một bộ mẫu ở bước hoán vị để thấy rõ tổ hợp không xét thứ tự.
            chosen = sorted(range(n), key=lambda i: (i % max(1, do), i))[:k]
        if not chosen and ten != "hien":
            chosen = list(range(k))
        pha.append(dict(ten=ten, t=b["t"], chon=chosen, kl=badge))
    if mode == "chia_th":
        if not cases:
            return None
        a = sum(cases.values())
    p = Fraction(a, omega)
    ans = str(kb.get("dap_an_cuoi") or kb.get("dap_an") or "")
    if khop_dap_an(p, ans) is not True:
        if any(b.get("hanh_dong") for b in nguon):
            raise ValueError(f"XS_SAI_DAP_SO: {a}/{omega} khác {ans}")
        return None
    return dict(loai="rut_mau", mode=mode, vat="the" if nhan else "bi", k=k, do=do,
                phan_tu=[dict(nhan=nhan[i] if nhan else str(i+1), gia_tri=i+1, nhom=int(i >= (2 if nhan else do))) for i in range(n)],
                nhom=[], n_omega=omega, n_a=a, p=str(p), p_doi=str(1-p), bien_co="A", pha=pha)
