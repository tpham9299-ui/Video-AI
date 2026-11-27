"""Bộ dựng hình Tầng 2 dự phòng tất định (0 tốn API Gemini) cho THUC_TE & XAC_SUAT.

Vai trò (Lớp 3 — chốt cuối chống thiếu hình Tầng 2 / chống đứng im / chống đốt quota key):
  - Khi gặp `KHUNG4TANG_3D_RONG`, `t2_trong`, `hinh_dung_im` hoặc lỗi hộp cát sau tối đa 1 lần gọi AI sửa,
    module này sinh mã Python 100% thuần, dùng trực tiếp `scripts/kho_manh_svg.py` (0 gọi mạng)
    và vượt qua hộp cát `scripts/tu_sinh_svg.py` với 0 lỗi bảo mật và 0 lỗi thẩm mỹ.
  - Chọn đúng mảnh ghép mô hình theo từ khóa đề bài; nếu không khớp từ khóa nào thì dựng khung
    sơ đồ dữ kiện (`so_do_du_kien`) kết hợp nhân vật người que Story Math.
  - Bắt buộc có hình hợp lệ trong vùng an toàn T2 ngay từ cảnh 2 (`de_bai`, `buoc: 0`), và mỗi bước
    tiếp theo thay đổi rõ ít nhất 2 yếu tố trực quan (biểu cảm người que `nguoi_que_gai_dau` ->
    `nguoi_que_chi_bang` -> `nguoi_que_aha` -> `nguoi_que_hoan_ho` kèm đổi nhãn/số liệu/trạng thái mô hình)
    để tuyệt đối không bị `hinh_dung_im`.
  - Gắn cờ `tu_cuu_t2: True` để nhật ký BP2 và `scripts/chuanbi.py` theo dõi rõ.
"""
import json
import os
import re
import sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.path.dirname(os.path.abspath(__file__)) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

MANH_THUC_TE = (
    "bieu_do_loi_nhuan",
    "be_nuoc_muc_chat_long",
    "xe_di_chuyen",
    "tui_tien_lai_suat",
    "hop_chu_nhat_3d",
    "dong_ho_thoi_gian",
)
MANH_XAC_SUAT = (
    "hop_bi_mau",
    "xuc_xac_1_6",
    "dong_xu",
    "la_bai_the_so",
    "nut_cay_xac_suat",
)

_MACRON = {"A": "Ā", "E": "Ē", "I": "Ī", "O": "Ō", "U": "Ū"}


def _lam_sach_chu(s, toi_da=16):
    t = str(s or "").replace("$", "").replace("\\\\", "\\")
    t = re.sub(r"\\(?:overline|bar)\s*\{\s*([A-Za-z])\s*\}", lambda m: _MACRON.get(m.group(1), m.group(1)), t)
    t = re.sub(r"\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"\1/\2", t)
    t = re.sub(r"\\(?:text|mathrm|mathbf|textbf|operatorname)\s*\{([^{}]*)\}", r"\1", t)
    t = re.sub(r"\\(?:Omega)\b", "Ω", t)
    t = re.sub(r"\\(?:cdot|times)\b", "×", t)
    t = re.sub(r"\\[A-Za-z]+", "", t)
    t = re.sub(r"[{}\\_^\"'`<>&]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) <= toi_da:
        return t
    cat = t[:toi_da].rsplit(" ", 1)[0].strip()
    if not cat or len(cat) < 4:
        cat = t[:toi_da].strip()
    if cat.count("(") > cat.count(")"):
        cat = cat.rsplit("(", 1)[0].strip()
    return cat


def _tap_so_dap_an(kb):
    de = str(kb.get("de_bai") or "")
    da = str(kb.get("dap_an_cuoi") or kb.get("dap_an") or "")
    so = []
    for x in re.findall(r"\d+(?:[.,]\d+)?(?:/\d+)?", da):
        if x and x not in de and x not in so:
            so.append(x)
    return so


def _che_dap_an_nhan(nhan, so_da):
    s = str(nhan or "")
    for x in so_da:
        if len(x) >= 2 and x in s:
            s = s.replace(x, "?")
    return s


def _trich_bi_mau(van):
    """Trích số lượng bi các màu từ đề bài Xác suất (trả dict truyền thẳng cho hop_bi_mau)."""
    t = str(van or "").lower()
    bang = [
        ("do", r"(\d+)\s*(?:viên\s*)?(?:bi|bóng|quả(?:\s*cầu)?)\s*(?:màu\s*)?đỏ"),
        ("nhan", r"(\d+)\s*(?:viên\s*)?(?:bi|bóng|quả(?:\s*cầu)?)\s*(?:màu\s*)?xanh(?:\s*dương|\s*lam)?"),
        ("ket", r"(\d+)\s*(?:viên\s*)?(?:bi|bóng|quả(?:\s*cầu)?)\s*(?:màu\s*)?vàng"),
        ("la", r"(\d+)\s*(?:viên\s*)?(?:bi|bóng|quả(?:\s*cầu)?)\s*(?:màu\s*)?(?:xanh\s*lá|lục)"),
        ("cam", r"(\d+)\s*(?:viên\s*)?(?:bi|bóng|quả(?:\s*cầu)?)\s*(?:màu\s*)?cam"),
        ("chu", r"(\d+)\s*(?:viên\s*)?(?:bi|bóng|quả(?:\s*cầu)?)\s*(?:màu\s*)?trắng"),
    ]
    kq = {}
    for k, pat in bang:
        m = re.search(pat, t)
        if m:
            n = max(1, min(6, int(m.group(1))))
            kq[k] = n
    if not kq:
        return {"do": 3, "nhan": 3, "ket": 3}
    tong = sum(kq.values())
    if tong > 9:
        scale = 9.0 / tong
        kq = {k: max(1, int(round(v * scale))) for k, v in kq.items()}
    return kq


def _trich_so_lieu(van):
    """Trích tối đa 6 số dương tiêu biểu từ đề để làm dữ liệu động cho mô hình."""
    ds = []
    for m in re.findall(r"\d+(?:[.,]\d+)?", str(van or "")):
        try:
            v = float(m.replace(",", "."))
            if v > 0:
                ds.append((m, v))
        except ValueError:
            pass
    return ds[:6]


def _trich_cong_thuc_chinh(kb, so_da):
    """Đọc công thức chính từ `khung4tang.buoc[].the[].dong` và `canh[].noi_dung_man_hinh` (che đáp án)."""
    ra = []
    k4 = kb.get("khung4tang") if isinstance(kb.get("khung4tang"), dict) else {}
    for d in k4.get("de_ghim") or []:
        if isinstance(d, dict) and d.get("nhan"):
            s = _che_dap_an_nhan(_lam_sach_chu(d["nhan"], 18), so_da)
            if s and s not in ra:
                ra.append(s)
    for b in k4.get("buoc") or []:
        if not isinstance(b, dict):
            continue
        for th in b.get("the") or []:
            if isinstance(th, dict) and isinstance(th.get("dong"), list):
                for line in th["dong"]:
                    s = _che_dap_an_nhan(_lam_sach_chu(line, 18), so_da)
                    if s and s not in ra:
                        ra.append(s)
    for c in kb.get("canh") or []:
        if not isinstance(c, dict):
            continue
        if re.search(r"dap_an|ket_qua", str(c.get("loai") or ""), re.I):
            continue
        for line in c.get("noi_dung_man_hinh") or []:
            s = _che_dap_an_nhan(_lam_sach_chu(line, 18), so_da)
            if s and s not in ra:
                ra.append(s)
    return ra[:4]


def chon_manh_du_phong(kb):
    """Chọn mảnh ghép chính xác nhất trong `kho_manh_svg.py` theo từ khóa đề bài, `mo_ta_minh_hoa` từng cảnh & chuyên mục.
    Nếu không khớp từ khóa nào thì trả `so_do_du_kien` (khung sơ đồ dữ kiện + người que)."""
    kb = kb if isinstance(kb, dict) else {}
    mon = str(kb.get("mon") or "").upper()
    mo_ta_canh = " ".join(
        str(c.get("mo_ta_minh_hoa") or (c.get("minh_hoa") or {}).get("mo_ta") or "")
        for c in (kb.get("canh") or []) if isinstance(c, dict)
    )
    van = " ".join(str(kb.get(k) or "") for k in ("de_bai", "chu_de", "tieu_de", "can_tim")).strip()
    van_day_du = (van + " " + mo_ta_canh).strip()
    t = van_day_du.lower()
    t_de = van.lower()
    la_xs = mon == "XAC_SUAT" or (
        mon != "THUC_TE" and bool(re.search(r"xác suất|ngẫu nhiên|biến cố|không gian mẫu", t_de))
    )
    so_da = _tap_so_dap_an(kb)
    cong_thuc = _trich_cong_thuc_chinh(kb, so_da)

    if la_xs:
        if re.search(r"xúc xắc|súc sắc|con xúc xắc", t):
            manh = "xuc_xac_1_6"
        elif re.search(r"đồng xu|tung xu|gieo xu|sấp|ngửa", t):
            manh = "dong_xu"
        elif re.search(r"\bbi\b|viên bi|quả bóng|quả cầu|hộp kín|túi kín", t):
            manh = "hop_bi_mau"
        elif re.search(r"bayes|xét nghiệm|dương tính|âm tính|có điều kiện|lần lượt|liên tiếp|độc lập|bắn|thi đấu|cây xác suất|sơ đồ cây|nhà máy|phân xưởng", t):
            manh = "nut_cay_xac_suat"
        elif re.search(r"thẻ|lá bài|bộ bài|đánh số|phiếu|rút", t):
            manh = "la_bai_the_so"
        else:
            manh = "so_do_du_kien"
        return {"manh": manh, "mon": "XAC_SUAT", "bi": _trich_bi_mau(van_day_du), "so": _trich_so_lieu(van), "cong_thuc": cong_thuc}

    # Toán thực tế (THUC_TE): bài tiền bạc / tài chính TUYỆT ĐỐI không rơi về hop_chu_nhat_3d
    la_tai_chinh = bool(re.search(r"lãi suất|lãi kép|gửi tiết kiệm|ngân hàng|tiền gửi|trả góp|vay vốn|lạm phát|lợi nhuận|doanh thu|giá vé|giá bán|chi phí|giảm giá|tăng giá|tiền lãi|kinh doanh", t_de))
    if re.search(r"lãi suất|lãi kép|gửi tiết kiệm|ngân hàng|tiền gửi|trả góp|vay vốn|lạm phát", t_de):
        manh = "tui_tien_lai_suat"
    elif re.search(r"lợi nhuận|doanh thu|giá vé|giá bán|chi phí|giảm giá|tăng giá|kinh doanh|bán được|khách hàng|cửa hàng|quán", t_de):
        manh = "bieu_do_loi_nhuan"
    elif re.search(r"bể|nước|chất lỏng|vòi|chảy|dung dịch|bồn nước|lít|thể tích nước|mực nước", t):
        manh = "be_nuoc_muc_chat_long"
    elif re.search(r"ô tô|xe máy|xe hơi|tàu|chuyển động|vận tốc|quãng đường|phanh|hãm|km/h|m/s|xuất phát|đi từ", t):
        manh = "xe_di_chuyen"
    elif re.search(r"đồng hồ|kim giờ|kim phút|thời gian|chu kì|bao nhiêu phút|sau bao lâu", t):
        manh = "dong_ho_thoi_gian"
    elif not la_tai_chinh and re.search(r"hộp|bìa|thùng|lập phương|lăng trụ|khối|mảnh đất|khu vườn|hàng rào|lối đi|bức tường|diện tích|thể tích|cắt góc|gập", t):
        manh = "hop_chu_nhat_3d"
    elif la_tai_chinh:
        manh = "tui_tien_lai_suat"
    else:
        manh = "so_do_du_kien"
    return {"manh": manh, "mon": "THUC_TE", "bi": {}, "so": _trich_so_lieu(van), "cong_thuc": cong_thuc}


def _nhan_vat_theo_buoc(buoc_list, n_eff):
    """Đổi biểu cảm nhân vật người que theo tiến trình bước:
    gai_dau -> chi_bang -> (canh_bao nếu bước bẫy/biến cố đối) -> aha -> hoan_ho.
    """
    ra = []
    for i in range(n_eff):
        b = buoc_list[i] if i < len(buoc_list) and isinstance(buoc_list[i], dict) else {}
        txt = (str(b.get("nhan") or "") + " " + str(b.get("tieu_de") or "")).lower()
        if i == 0:
            ra.append(("nguoi_que_gai_dau", "ket"))
        elif i == n_eff - 1:
            ra.append(("nguoi_que_hoan_ho", "la"))
        elif re.search(r"bẫy|lưu ý|sai|cẩn thận|biến cố đối|loại|trừ", txt):
            ra.append(("nguoi_que_canh_bao", "do"))
        elif i == n_eff - 2 and n_eff >= 4:
            ra.append(("nguoi_que_aha", "ket"))
        elif i == 1:
            ra.append(("nguoi_que_chi_bang", "nhan"))
        else:
            ra.append(("nguoi_que_aha", "ket"))
    return ra


def _cum_khi_noi(kb, buoc_list, idx, n_eff):
    """Lấy cụm khi_noi nguyên văn từ bước hoặc cảnh tương ứng (để khớp mốc lời đọc)."""
    if idx < len(buoc_list) and isinstance(buoc_list[idx], dict):
        kn = str(buoc_list[idx].get("khi_noi") or "").strip()
        if kn:
            return kn
    canh = kb.get("canh") or []
    if canh:
        ci = min(len(canh) - 1, max(0, round(idx * (len(canh) - 1) / max(1, n_eff - 1))))
        loi = str((canh[ci] or {}).get("loi_thoai") or "").strip()
        tu = loi.split()
        if len(tu) >= 3:
            return " ".join(tu[:4])
    return ""


def _gia_tri_mo_hinh_buoc(chon, idx, n, nhan_buoc, so_da):
    """Trả (gia_tri, mau_mo_hinh, nhan_duoi) thay đổi rõ rệt qua từng bước."""
    manh = chon["manh"]
    mau_chuoi = ["nhan", "la", "cam", "ket"]
    mau = "ket" if idx == n - 1 else mau_chuoi[idx % len(mau_chuoi)]
    nhan_sach = _lam_sach_chu(nhan_buoc, 15)
    if idx < n - 1:
        nhan_sach = _che_dap_an_nhan(nhan_sach, so_da)
    if not nhan_sach:
        nhan_sach = ("Phân tích đề", "Thiết lập", "Tính toán", "Chốt kết quả")[min(idx, 3)]

    if manh == "bieu_do_loi_nhuan":
        ds_cot = [
            [32, 48, 62, 54],
            [38, 64, 78, 60],
            [44, 72, 96, 74],
            [48, 76, 100, 78],
        ]
        return ds_cot[min(idx, len(ds_cot) - 1)], mau, nhan_sach

    if manh == "be_nuoc_muc_chat_long":
        muc = [0.32, 0.54, 0.74, 0.86][min(idx, 3)]
        return {"muc": muc, "nhan": "Mức %d%%" % int(round(muc * 100))}, mau, nhan_sach

    if manh == "xe_di_chuyen":
        so = chon.get("so") or []
        gt = ("Bước %d" % (idx + 1)) if not so else (so[min(idx, len(so) - 1)][0] if idx < n - 1 else "Đích")
        return gt, mau, nhan_sach

    if manh == "tui_tien_lai_suat":
        gt = ("Kỳ %d" % (idx + 1)) if idx < n - 1 else "Tối ưu"
        return gt, mau, nhan_sach

    if manh == "hop_chu_nhat_3d":
        so = [x[0] for x in (chon.get("so") or [])[:3]]
        gt = (" × ".join(so[:2]) if len(so) >= 2 else ("Biến x" if idx < n - 1 else "Kích thước"))
        if idx < n - 1:
            gt = _che_dap_an_nhan(gt, so_da)
        return gt, mau, nhan_sach

    if manh == "dong_ho_thoi_gian":
        gio_phut = [(9, 15), (10, 30), (11, 45), (12, 5)][min(idx, 3)]
        return gio_phut, mau, nhan_sach

    if manh == "hop_bi_mau":
        bi = dict(chon.get("bi") or {"do": 3, "nhan": 3, "ket": 3})
        if idx == 0:
            return bi, "nhan", nhan_sach
        if idx == n - 1:
            return bi, "ket", nhan_sach
        keys = list(bi.keys())
        if len(keys) >= 2 and idx == 1:
            bi_sub = {keys[0]: bi[keys[0]], keys[1]: max(1, bi[keys[1]] - 1)}
            return bi_sub, "la", nhan_sach
        return bi, mau, nhan_sach

    if manh == "xuc_xac_1_6":
        mat = [2, 4, 5, 6][min(idx, 3)]
        return mat, mau, nhan_sach

    if manh == "dong_xu":
        mat = ["S", "N", "S/N", "N"][min(idx, 3)]
        return mat, mau, nhan_sach

    if manh == "la_bai_the_so":
        so = [x[0] for x in (chon.get("so") or []) if len(x[0]) <= 4]
        mac = ["1", "2", "A", "OK"]
        gt = so[idx] if idx < len(so) and idx < n - 1 else mac[min(idx, 3)]
        if idx < n - 1:
            gt = _che_dap_an_nhan(gt, so_da)
        return gt, mau, nhan_sach

    if manh == "nut_cay_xac_suat":
        nhanh_ds = [
            [("p1", "la"), ("p2", "cam")],
            [("TH 1", "nhan"), ("TH 2", "ket")],
            [("P(A)", "la"), ("P(Ā)", "cam")],
            [("Đạt", "la"), ("Loại", "cu")],
        ]
        return nhanh_ds[min(idx, 3)], mau, nhan_sach

    # Khung sơ đồ dữ kiện (khi không khớp từ khóa mô hình nào)
    ct = chon.get("cong_thuc") or []
    so = [x[0] for x in (chon.get("so") or [])[:3]]
    dong1 = ct[0] if len(ct) >= 1 else ("Dữ kiện: " + ", ".join(so[:2]) if so else "Dữ kiện đề")
    dong2 = ct[1] if len(ct) >= 2 else ("Biến đổi bước %d" % (idx + 1))
    dong3 = "Chốt kết quả" if idx == n - 1 else ("Mục tiêu: ?")
    return [dong1[:18], dong2[:18], dong3[:18]], mau, nhan_sach


def _ham_so_do_du_kien_py():
    """Hàm vẽ khung sơ đồ dữ kiện 2.5D chạy sạch trong hộp cát `tu_sinh_svg.py` (dùng màu km.MAU)."""
    return [
        "def ve_so_do_du_kien(muc_ds, buoc_idx, mau_key, nhan_duoi):",
        "    mc = km.MAU.get(mau_key, km.MAU['nhan'])",
        "    nen = km.MAU['nen']",
        "    mat = km.MAU['mat']",
        "    cu = km.MAU['cu']",
        "    chu = km.MAU['chu']",
        "    ket = km.MAU['ket']",
        "    parts = []",
        "    parts.append('<rect x=\"424\" y=\"96\" width=\"336\" height=\"328\" rx=\"16\" fill=\"%s\" fill-opacity=\"0.86\" stroke=\"%s\" stroke-width=\"2.6\"/>' % (mat, mc))",
        "    parts.append('<line x1=\"464\" y1=\"162\" x2=\"464\" y2=\"352\" stroke=\"%s\" stroke-width=\"3\" stroke-dasharray=\"6 6\"/>' % cu)",
        "    ys = [162, 256, 350]",
        "    for k in range(3):",
        "        dang = (k == min(buoc_idx, 2))",
        "        col = ket if (k == 2 and buoc_idx >= 2) else (mc if dang else cu)",
        "        r_c = 22 if dang else 18",
        "        parts.append('<circle cx=\"464\" cy=\"%d\" r=\"%d\" fill=\"%s\" stroke=\"%s\" stroke-width=\"2.6\"/>' % (ys[k], r_c, nen, col))",
        "        parts.append('<line x1=\"486\" y1=\"%d\" x2=\"510\" y2=\"%d\" stroke=\"%s\" stroke-width=\"2.6\"/>' % (ys[k], ys[k], col))",
        "        txt = str(muc_ds[k]) if k < len(muc_ds) else ('Bước %d' % (k + 1))",
        "        parts.append('<rect x=\"512\" y=\"%d\" width=\"232\" height=\"44\" rx=\"10\" fill=\"%s\" fill-opacity=\"0.94\" stroke=\"%s\" stroke-width=\"2\"/>' % (ys[k] - 22, nen, col))",
        "        parts.append('<text x=\"628\" y=\"%d\" fill=\"%s\" font-size=\"22\" font-weight=\"700\" text-anchor=\"middle\">%s</text>' % (ys[k] + 8, chu, txt))",
        "    parts.append('<rect x=\"472\" y=\"444\" width=\"240\" height=\"40\" rx=\"12\" fill=\"%s\" fill-opacity=\"0.94\" stroke=\"%s\" stroke-width=\"2\"/>' % (nen, mc))",
        "    parts.append('<text x=\"592\" y=\"472\" fill=\"%s\" font-size=\"22\" font-weight=\"700\" text-anchor=\"middle\">%s</text>' % (chu, nhan_duoi))",
        "    return '<g data-manh=\"so_do_du_kien\">' + ''.join(parts) + '</g>'",
    ]


def sinh_ma_du_phong(kb):
    """Sinh mã Python thuần dùng `kho_manh_svg` cho `tu_sinh_svg.py` (không dùng API).
    Mỗi bước gom trọn [người que + vạch chia + mô hình/sơ đồ dữ kiện] vào 1 lớp `nhom='t2_du_phong'`
    nên: (a) bước 0 hiện đầy đủ ngay từ cảnh 2 (`de_bai`, `t=0`), (b) số lớp luôn <= 14,
    (c) mỗi bước thay đổi rõ >= 2 yếu tố trực quan (người que + mô hình/nhãn/màu)."""
    k4 = kb.get("khung4tang") if isinstance(kb.get("khung4tang"), dict) else {}
    buoc_list = k4.get("buoc") if isinstance(k4.get("buoc"), list) else []
    n = max(3, min(14, len(buoc_list)))
    chon = chon_manh_du_phong(kb)
    manh = chon["manh"]
    nv_list = _nhan_vat_theo_buoc(buoc_list, n)
    so_da = _tap_so_dap_an(kb)

    dong = ["import kho_manh_svg as km", ""]
    if manh == "so_do_du_kien":
        dong.extend(_ham_so_do_du_kien_py())
        dong.append("")

    dong.extend([
        "def ve():",
        "    lop = []",
        '    vach = \'<line x1="392" y1="84" x2="392" y2="456" stroke="#3A4A60" stroke-width="2" stroke-dasharray="8 8" stroke-opacity="0.55"/>\'',
    ])

    for i in range(n):
        b = buoc_list[i] if i < len(buoc_list) and isinstance(buoc_list[i], dict) else {}
        ten_b = str(b.get("nhan") or b.get("tieu_de") or "").strip()
        kn = _cum_khi_noi(kb, buoc_list, i, n)
        nv_fn, nv_mau = nv_list[i]
        nv_nhan = ("Đọc đề", "Lập hướng", "Giải nhanh", "Chốt đáp án")[min(i, 3)]
        if nv_fn == "nguoi_que_aha":
            nv_nhan = "Bứt phá!"
        elif nv_fn == "nguoi_que_canh_bao":
            nv_nhan = "Cẩn thận bẫy!"
        elif nv_fn == "nguoi_que_hoan_ho":
            nv_nhan = "Xong rồi!"

        gt_mh, mau_mh, nhan_mh = _gia_tri_mo_hinh_buoc(chon, i, n, ten_b, so_da)
        hu = "moc" if i == 0 else ("sang" if i == n - 1 else ("no" if i % 2 == 1 else "ve"))

        dong.append(
            "    nv_%d = km.%s(210, 272, scale=1.24, nhan=%r, mau=%r)"
            % (i, nv_fn, nv_nhan, nv_mau)
        )
        if manh == "so_do_du_kien":
            dong.append(
                "    mh_%d = ve_so_do_du_kien(%r, %d, %r, %r)"
                % (i, gt_mh, i, mau_mh, nhan_mh)
            )
        else:
            dong.append(
                "    mh_%d = km.%s(585, 272, scale=1.26, nhan=%r, gia_tri=%r, mau=%r)"
                % (i, manh, nhan_mh, gt_mh, mau_mh)
            )
        dong.append(
            "    svg_%d = '<g data-du-phong=\"buoc_%d\">' + vach + nv_%d + mh_%d + '</g>'"
            % (i, i + 1, i, i)
        )
        dong.append(
            '    lop.append({"buoc": %d, "svg": svg_%d, "hieu_ung": %r, "khi_noi": %r, "nhan": %r, "nhom": "t2_du_phong"})'
            % (i, i, hu, kn, "t2_b%d" % (i + 1))
        )

    dong.append("    return lop")
    return "\n".join(dong) + "\n", chon


def tao_tu_sinh_du_phong(kb, kiem_tra=True):
    """Sinh + xác nhận hộp cát `tu_sinh_svg.py` 0 lỗi. Trả dict {ok, tu_sinh, so_lop, manh, tu_cuu_t2}."""
    ma, chon = sinh_ma_du_phong(kb)
    k4 = kb.get("khung4tang") if isinstance(kb.get("khung4tang"), dict) else {}
    n = max(3, min(14, len(k4.get("buoc") or [])))
    mo_ta = "Tự cứu Tầng 2 tất định (%s + người que Story Math)" % chon["manh"]
    so_lop = n
    if kiem_tra:
        import tu_sinh_svg
        ds = tu_sinh_svg.dung(ma, n, tham_my=True, can_hinh=True, can_vat=True)
        so_lop = len(ds)
    return {
        "ok": True,
        "tu_sinh": {"ma": ma, "mo_ta": mo_ta, "tu_cuu_t2": True},
        "so_lop": so_lop,
        "manh": chon["manh"],
        "mon": chon["mon"],
        "tu_cuu_t2": True,
    }


def cuu_kb_t2(kb):
    """Gắn sân khấu dự phòng tất định trực tiếp vào kịch bản `kb`, xóa lỗi thiếu hình / đứng im Tầng 2."""
    if not isinstance(kb, dict):
        return {"ok": False, "loi": "kb không hợp lệ"}
    k4 = kb.get("khung4tang")
    if not isinstance(k4, dict):
        k4 = {}
        kb["khung4tang"] = k4
    if not isinstance(k4.get("buoc"), list) or len(k4["buoc"]) < 3:
        canh = kb.get("canh") if isinstance(kb.get("canh"), list) else []
        buoc_moi = []
        cac_nhan = ["PHÂN TÍCH ĐỀ", "THIẾT LẬP", "TÍNH TOÁN", "KẾT LUẬN"]
        so_b = max(3, min(4, len(canh) or 3))
        for i in range(so_b):
            c = canh[min(i, len(canh) - 1)] if canh else {}
            loi = str((c or {}).get("loi_thoai") or "").strip()
            td = str((c or {}).get("tieu_de_canh") or cac_nhan[i]).strip()
            buoc_moi.append({
                "nhan": cac_nhan[i],
                "tieu_de": td[:40],
                "khi_noi": " ".join(loi.split()[:4]),
                "canh": min(i + 1, max(1, len(canh))),
                "the": [],
            })
        k4["buoc"] = buoc_moi

    kq = tao_tu_sinh_du_phong(kb, kiem_tra=True)
    kb["san_khau_dich"] = "tu_sinh_svg"
    k4.pop("canh_3d_vector", None)
    if isinstance(k4.get("san_khau"), dict) and k4["san_khau"].get("loai") != "tu_sinh_svg":
        k4.pop("san_khau", None)
    k4["tu_sinh"] = kq["tu_sinh"]
    kb["tu_cuu_t2"] = True
    kb.pop("tu_sinh_hong", None)
    return kq


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write("Cách dùng: python scripts/du_phong_t2.py <kich_ban.json | ->\n")
        sys.exit(1)
    nguon = sys.stdin.read() if sys.argv[1] == "-" else open(sys.argv[1], encoding="utf8").read()
    kb_in = json.loads(nguon)
    kq = tao_tu_sinh_du_phong(kb_in, kiem_tra=True)
    sys.stdout.write(json.dumps(kq, ensure_ascii=False))
