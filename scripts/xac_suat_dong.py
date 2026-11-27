"""Dựng mẫu hữu hạn từ dữ kiện đề và hành động ở từng bước."""
from fractions import Fraction
from itertools import combinations, product
from math import comb
import re
from khung4tang_v96 import khop_dap_an

TRAN_DEM_DONG = 100_000


def ngan(kb):
    return (kb.get("mon") or kb.get("luong")) == "XAC_SUAT" and kb.get("kieu_video") != "DAI_10_PHUT" and not str(kb.get("id")).upper().endswith("-10P")


def _so_trong(van, mau):
    m = re.search(mau, van)
    return int(m[1]) if m else 0


def _tinh_to_hop_the(tu, den, k, co_hoan_lai, pred):
    vals = list(range(tu, den + 1))
    tong_uoc = (len(vals) ** k) if co_hoan_lai else comb(len(vals), k)
    if tong_uoc <= 0 or tong_uoc > TRAN_DEM_DONG:
        return None
    it = product(vals, repeat=k) if co_hoan_lai else combinations(vals, k)
    n_omega = 0
    n_a = 0
    thuan_loi_mau = []
    for c in it:
        n_omega += 1
        if pred(c):
            n_a += 1
            if len(thuan_loi_mau) < 8:
                thuan_loi_mau.append(list(c))
    return n_omega, n_a, thuan_loi_mau


def tinh_xac_suat_tu_de(de_bai, dap_an="", cach_giai=None, buoc_list=None):
    """Pha 2B XAC_SUAT (Python tất định): tự tính n(Ω), n(A), trường hợp thuận lợi và tham_so rut_mau / hanh_dong
    từ đề bài + đáp án đã kiểm chứng BP1 (không để AI gõ tay bảng đếm gây XS_SAI_DAP_SO: n(A)=0).
    Trả dict {ok, che_do, n_omega, n_a, p, p_doi, khop, san_khau, hanh_dong_buoc, truong_hop} hoặc None nếu không tự suy được."""
    de_goc = str(de_bai or "")
    de = de_goc.lower()
    ans = str(dap_an or "").strip()
    buoc_list = buoc_list if isinstance(buoc_list, list) else []
    co_hoan_lai = bool(re.search(r"có hoàn lại|trả lại|gieo\s*\d+\s*(?:lần|con)\s*xúc xắc|tung\s*\d+\s*(?:lần|đồng)\s*xu", de))

    # 1) Bài An và Bình (phần bù)
    k = _so_trong(de, r"(?:chọn|rút|bốc|lấy)\s*(?:(?:ra|ngẫu nhiên|đồng thời|cùng lúc)\s+)*(\d+)")
    if re.search(r"\ban\b", de) and "bình" in de and re.search(r"ít nhất\s+(?:một|1)", de) and k:
        n = _so_trong(de, r"(\d+)\s*(?:bạn|học sinh|người)")
        if 3 <= n <= 30 and k <= n - 2:
            omega = comb(n, k)
            n_a = omega - comb(n - 2, k)
            p = Fraction(n_a, omega)
            khop = khop_dap_an(p, ans) if ans else True
            if khop is True and n_a > 0:
                hd = _gan_hanh_dong_buoc_xs("phan_bu", buoc_list, [])
                return {
                    "ok": True, "che_do": "phan_bu", "n_omega": omega, "n_a": n_a,
                    "p": str(p), "p_doi": str(1 - p), "khop": True,
                    "san_khau": {
                        "loai": "rut_mau",
                        "tham_so": {
                            "vat": "the", "tu": 1, "den": n, "N": n, "k": k, "co_hoan_lai": False,
                            "nhom": [
                                {"nhan": "An, Bình", "mau": "hong", "phan_tu": [1, 2]},
                                {"nhan": "Còn lại", "mau": "xam", "phan_tu": list(range(3, n + 1))},
                            ],
                            "bien_co": {"loai": "it_nhat_mot", "nhom": "An, Bình", "phu_dinh": False},
                        },
                    },
                    "hanh_dong_buoc": hd,
                    "truong_hop": [{"nhan": "Biến cố đối (không có An, Bình)", "so_cach": omega - n_a}],
                }

    # 2) Bài rút bi đỏ / xanh (chia trường hợp hoặc lần lượt dừng)
    color = r"(\d+)\s*(?:viên\s*)?(?:bi\s*)?(?:màu\s*)?"
    do, xanh = _so_trong(de, color + "đỏ"), _so_trong(de, color + "xanh")
    n_bi = do + xanh
    if do > 0 and xanh > 0 and n_bi <= 24 and not co_hoan_lai:
        if re.search(r"lần lượt|từng viên|từng bi", de):
            giu = _so_trong(de, r"còn\s*(?:lại\s*)?(?:đúng\s*)?(\d+)\s*(?:viên\s*)?(?:bi\s*)?xanh")
            if 0 < giu <= xanh and re.search(r"dừng|hết.*đỏ|cuối.*đỏ", de):
                k_lan = n_bi - giu
                omega, n_a = comb(n_bi, do), comb(k_lan - 1, do - 1)
                p = Fraction(n_a, omega)
                if (not ans or khop_dap_an(p, ans) is True) and n_a > 0:
                    return {
                        "ok": True, "che_do": "lan_luot", "n_omega": omega, "n_a": n_a,
                        "p": str(p), "p_doi": str(1 - p), "khop": True,
                        "san_khau": {
                            "loai": "rut_mau",
                            "tham_so": {
                                "vat": "bi", "tu": 1, "den": n_bi, "N": n_bi, "k": k_lan, "co_hoan_lai": False,
                                "nhom": [
                                    {"nhan": "Đỏ", "mau": "hong", "so": do, "phan_tu": list(range(1, do + 1))},
                                    {"nhan": "Xanh", "mau": "cyan", "so": xanh, "phan_tu": list(range(do + 1, n_bi + 1))},
                                ],
                                "bien_co": {"loai": "dung", "nhom": "Đỏ", "so_luong": do, "phu_dinh": False},
                            },
                        },
                        "hanh_dong_buoc": _gan_hanh_dong_buoc_xs("lan_luot", buoc_list, []),
                        "truong_hop": [{"nhan": f"Viên cuối là đỏ thứ {do}", "so_cach": n_a}],
                    }
        if 0 < k <= n_bi:
            omega = comb(n_bi, k)
            ds_do_hop = [r for r in range(0, min(k, do) + 1) if 0 <= k - r <= xanh]
            ung_vien = []
            m_it = re.search(r"ít nhất\s*(\d+|một)\s*(?:viên\s*)?(?:bi\s*)?(?:màu\s*)?đỏ", de)
            m_dung = re.search(r"(?:đúng|có)\s*(\d+)\s*(?:viên\s*)?(?:bi\s*)?(?:màu\s*)?đỏ", de)
            m_nhieu = re.search(r"(?:không quá|nhiều nhất|tối đa)\s*(\d+)\s*(?:viên\s*)?(?:bi\s*)?(?:màu\s*)?đỏ", de)
            if re.search(r"cùng màu", de):
                ung_vien.append(([r for r in ds_do_hop if r == k or r == 0], {"loai": "cung_nhom", "phu_dinh": False}))
            if re.search(r"khác màu|đủ cả hai màu|có cả hai màu", de):
                ung_vien.append(([r for r in ds_do_hop if 0 < r < k], {"loai": "khac_nhom", "phu_dinh": False}))
            if m_it:
                r0 = 1 if m_it.group(1) == "một" else int(m_it.group(1))
                ung_vien.append(([r for r in ds_do_hop if r >= r0], {"loai": "it_nhat_mot" if r0 == 1 else "dung", "nhom": "Đỏ", "so_luong": r0, "phu_dinh": False}))
            if m_nhieu:
                r0 = int(m_nhieu.group(1))
                ung_vien.append(([r for r in ds_do_hop if r <= r0], {"loai": "dung", "nhom": "Đỏ", "so_luong": r0, "phu_dinh": False}))
            if m_dung:
                r0 = int(m_dung.group(1))
                ung_vien.append(([r for r in ds_do_hop if r == r0], {"loai": "dung", "nhom": "Đỏ", "so_luong": r0, "phu_dinh": False}))
            # Fallback: thử tập hợp đỏ khớp với đáp án BP1 (khi đề mô tả bằng từ khác)
            if not ung_vien:
                ung_vien.append(([r for r in ds_do_hop if r >= 1], {"loai": "it_nhat_mot", "nhom": "Đỏ", "phu_dinh": False}))
                ung_vien.append(([r for r in ds_do_hop if r == k or r == 0], {"loai": "cung_nhom", "phu_dinh": False}))
            for red_list, bc_obj in ung_vien:
                if not red_list:
                    continue
                th = [{"do": r, "xanh": k - r, "so_cach": comb(do, r) * comb(xanh, k - r)} for r in red_list]
                n_a = sum(x["so_cach"] for x in th)
                if n_a <= 0:
                    continue
                p = Fraction(n_a, omega)
                if not ans or khop_dap_an(p, ans) is True:
                    return {
                        "ok": True, "che_do": "chia_th", "n_omega": omega, "n_a": n_a,
                        "p": str(p), "p_doi": str(1 - p), "khop": True,
                        "san_khau": {
                            "loai": "rut_mau",
                            "tham_so": {
                                "vat": "bi", "tu": 1, "den": n_bi, "N": n_bi, "k": k, "co_hoan_lai": False,
                                "nhom": [
                                    {"nhan": "Đỏ", "mau": "hong", "so": do, "phan_tu": list(range(1, do + 1))},
                                    {"nhan": "Xanh", "mau": "cyan", "so": xanh, "phan_tu": list(range(do + 1, n_bi + 1))},
                                ],
                                "bien_co": bc_obj,
                            },
                        },
                        "hanh_dong_buoc": _gan_hanh_dong_buoc_xs("chia_th", buoc_list, red_list),
                        "truong_hop": th,
                    }

    # 3) Bài rút thẻ đánh số từ a đến b / gieo xúc xắc
    tu, den = 1, 0
    m_range = re.search(r"từ\s*(\d+)\s*(?:đến|tới|-|–|\.\.)\s*(\d+)", de)
    if m_range:
        tu, den = int(m_range.group(1)), int(m_range.group(2))
    elif re.search(r"xúc xắc|súc sắc", de):
        tu, den = 1, 6
        co_hoan_lai = True
        if not k:
            k = _so_trong(de, r"gieo\s*(?:ngẫu nhiên\s*)?(\d+)\s*(?:lần|con)") or 2
    if den > tu and 1 <= k <= (den - tu + 1):
        vat = "xuc_xac" if re.search(r"xúc xắc|súc sắc", de) else "the"
        preds = []
        m_tich = re.search(r"tích[^.;?]{0,35}?(?:chia hết cho|⋮)\s*(\d+)", de)
        m_tong_ch = re.search(r"tổng[^.;?]{0,35}?(?:chia hết cho|⋮)\s*(\d+)", de)
        m_tong_in = re.search(r"tổng[^.;?]{0,35}?(?:không nhỏ hơn|lớn hơn hoặc bằng|ít nhất|>=|≥)\s*(\d+)", de)
        m_tong_td = re.search(r"tổng[^.;?]{0,35}?(?:không lớn hơn|nhỏ hơn hoặc bằng|tối đa|<=|≤)\s*(\d+)", de)
        m_tong_lh = re.search(r"tổng[^.;?]{0,35}?(?:lớn hơn|>)\s*(\d+)", de)
        m_tong_nh = re.search(r"tổng[^.;?]{0,35}?(?:nhỏ hơn|<)\s*(\d+)", de)
        m_tong_bg = re.search(r"tổng[^.;?]{0,35}?(?:bằng|=)\s*(\d+)", de)
        if m_tich:
            d = int(m_tich.group(1))
            nhom = []
            if d == 4:
                nhom = [
                    {"nhan": "⋮ 4", "mau": "vang", "phan_tu": [x for x in range(tu, den + 1) if x % 4 == 0]},
                    {"nhan": "chẵn không ⋮ 4", "mau": "cyan", "phan_tu": [x for x in range(tu, den + 1) if x % 2 == 0 and x % 4 != 0]},
                    {"nhan": "lẻ", "mau": "xam", "phan_tu": [x for x in range(tu, den + 1) if x % 2 != 0]},
                ]
            else:
                nhom = [
                    {"nhan": f"⋮ {d}", "mau": "vang", "phan_tu": [x for x in range(tu, den + 1) if x % d == 0]},
                    {"nhan": f"không ⋮ {d}", "mau": "xam", "phan_tu": [x for x in range(tu, den + 1) if x % d != 0]},
                ]
            preds.append((lambda c, d=d: (_tich(c) % d == 0), {"loai": "tich_chia_het", "so": d, "phu_dinh": False}, nhom))
        if m_tong_ch:
            d = int(m_tong_ch.group(1))
            preds.append((lambda c, d=d: (sum(c) % d == 0), {"loai": "tong_chia_het", "so": d, "phu_dinh": False}, []))
        if m_tong_in:
            s0 = int(m_tong_in.group(1))
            preds.append((lambda c, s0=s0: (sum(c) >= s0), {"loai": "tong_it_nhat", "so": s0, "phu_dinh": False}, []))
        if m_tong_td:
            s0 = int(m_tong_td.group(1))
            preds.append((lambda c, s0=s0: (sum(c) <= s0), {"loai": "tong_toi_da", "so": s0, "phu_dinh": False}, []))
        if m_tong_lh and not m_tong_in:
            s0 = int(m_tong_lh.group(1))
            preds.append((lambda c, s0=s0: (sum(c) > s0), {"loai": "tong_lon_hon", "so": s0, "phu_dinh": False}, []))
        if m_tong_nh and not m_tong_td:
            s0 = int(m_tong_nh.group(1))
            preds.append((lambda c, s0=s0: (sum(c) < s0), {"loai": "tong_nho_hon", "so": s0, "phu_dinh": False}, []))
        if m_tong_bg:
            s0 = int(m_tong_bg.group(1))
            preds.append((lambda c, s0=s0: (sum(c) == s0), {"loai": "tong_bang", "so": s0, "phu_dinh": False}, []))
        if re.search(r"ít nhất\s*(?:1|một)\s*(?:thẻ|số)?\s*chẵn", de):
            chan = [x for x in range(tu, den + 1) if x % 2 == 0]
            le = [x for x in range(tu, den + 1) if x % 2 != 0]
            nhom = [{"nhan": "chẵn", "mau": "vang", "phan_tu": chan}, {"nhan": "lẻ", "mau": "xam", "phan_tu": le}]
            preds.append((lambda c, ch=set(chan): any(x in ch for x in c), {"loai": "it_nhat_mot", "nhom": "chẵn", "phu_dinh": False}, nhom))
        if re.search(r"ít nhất\s*(?:1|một)\s*(?:thẻ|số)?\s*lẻ", de):
            chan = [x for x in range(tu, den + 1) if x % 2 == 0]
            le = [x for x in range(tu, den + 1) if x % 2 != 0]
            nhom = [{"nhan": "lẻ", "mau": "vang", "phan_tu": le}, {"nhan": "chẵn", "mau": "xam", "phan_tu": chan}]
            preds.append((lambda c, s_le=set(le): any(x in s_le for x in c), {"loai": "it_nhat_mot", "nhom": "lẻ", "phu_dinh": False}, nhom))
        for fn, bc_obj, nhom in preds:
            kq_t = _tinh_to_hop_the(tu, den, k, co_hoan_lai, fn)
            if not kq_t:
                continue
            omega, n_a, mau_tl = kq_t
            if n_a <= 0:
                continue
            p = Fraction(n_a, omega)
            if not ans or khop_dap_an(p, ans) is True:
                return {
                    "ok": True, "che_do": "rut_mau", "n_omega": omega, "n_a": n_a,
                    "p": str(p), "p_doi": str(1 - p), "khop": True,
                    "san_khau": {
                        "loai": "rut_mau",
                        "tham_so": {
                            "vat": vat, "tu": tu, "den": den, "N": den - tu + 1, "k": k, "co_hoan_lai": co_hoan_lai,
                            **({"nhom": nhom} if nhom else {}),
                            "bien_co": bc_obj,
                        },
                    },
                    "hanh_dong_buoc": _gan_hanh_dong_buoc_xs("rut_mau", buoc_list, []),
                    "truong_hop": [{"mau": m} for m in mau_tl],
                }
    return None


def _tich(vals):
    r = 1
    for x in vals:
        r *= x
    return r


def _gan_hanh_dong_buoc_xs(che_do, buoc_list, red_list):
    """Ánh xạ 1-1 mỗi bước giảng từ Pha 2A sang hanh_dong {pha, do?} hợp lệ cho xac_suat_dong."""
    n = max(1, len(buoc_list))
    out = []
    th_idx = 0
    for i in range(n):
        b = buoc_list[i] if i < len(buoc_list) and isinstance(buoc_list[i], dict) else {}
        van = (str(b.get("nhan") or "") + " " + str(b.get("tieu_de") or "") + " " + str(b.get("mo_ta_minh_hoa") or "")).lower()
        loai_c = str(b.get("loai_canh") or "").lower()
        if i == 0:
            out.append({"pha": "hien"})
        elif i == n - 1 or loai_c in ("dap_an", "ket_luan", "bai_hoc", "thu_lai", "kiem_tra") or re.search(r"kết luận|đáp án|tỉ lệ|xác suất cần tìm|thử lại", van):
            out.append({"pha": "ti_le"})
        elif che_do == "chia_th":
            if re.search(r"bẫy|thứ tự|chỉnh hợp|không gian mẫu", van) and i == 1:
                out.append({"pha": "dieu_kien" if "bẫy" in van else "mau"})
            elif th_idx < len(red_list):
                out.append({"pha": "truong_hop", "do": int(red_list[th_idx])})
                th_idx += 1
            else:
                out.append({"pha": "mau"})
        elif che_do == "phan_bu":
            if re.search(r"đối|loại|không có", van):
                out.append({"pha": "loai" if not any(x.get("pha") == "loai" for x in out) else "dem"})
            elif re.search(r"bẫy|điều kiện", van):
                out.append({"pha": "dieu_kien"})
            else:
                out.append({"pha": "mau"})
        elif che_do == "lan_luot":
            if re.search(r"khóa|cuối|dừng|đỏ thứ", van):
                out.append({"pha": "khoa"})
            elif re.search(r"bẫy|điều kiện", van):
                out.append({"pha": "dieu_kien"})
            else:
                out.append({"pha": "mau"})
        else:
            if re.search(r"bẫy|điều kiện", van):
                out.append({"pha": "dieu_kien"})
            else:
                out.append({"pha": "mau"})
    # Bảo đảm chia_th có đầy đủ mọi trường hợp đỏ để tổng n(A) khớp 100% đáp án
    if che_do == "chia_th" and th_idx < len(red_list):
        con_th = red_list[th_idx:]
        for r_val in con_th:
            for j in range(1, max(1, n - 1)):
                if out[j].get("pha") != "truong_hop":
                    out[j] = {"pha": "truong_hop", "do": int(r_val)}
                    break
    return out


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
