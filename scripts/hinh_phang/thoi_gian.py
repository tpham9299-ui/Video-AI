"""MỐC THỜI GIAN cho hình phẳng chuẩn: khớp `khi_noi` với mốc TỪNG TỪ thật của giọng đọc (edge-tts WordBoundary).

Toàn bộ lời thoại các cảnh nối thành một dòng từ có giây tuyệt đối (props.canh[i].batDau/fps + tu.bat). Khớp CHỈ TIẾN:
  - chuỗi phép dựng (đề) và chuỗi câu đề rút gọn chạy từ đầu video;
  - mục tiêu sau phép dựng cuối; các dòng chứng minh nối tiếp sau mục tiêu.
Khớp đúng cụm trước; không có thì cửa sổ có >= 70% từ của cụm theo thứ tự; vẫn không thấy -> nội suy đều giữa hai mốc kề.
"""
import re

_TU_SO = {"không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín", "mười", "mươi", "trăm", "nghìn", "lăm", "mốt", "tư", "linh", "lẻ"}


def la_bai_tinh(kb):
    hp = kb.get("hinh_phang_chuan") or {}
    loai = hp.get("loai_yeu_cau")
    if loai in ("tinh", "chung_minh"):
        return loai == "tinh"
    for field in ("can_tim", "de_bai", "tieu_de"):
        text = str(kb.get(field) or "")
        if re.search(r"chứng minh", text, re.I):
            return False
        if re.search(r"\btính\b|bao nhiêu|tìm độ (?:dài|lớn)", text, re.I):
            return True
    return bool(re.search(r"=\s*[-+]?\d", str((hp.get("muc_tieu") or {}).get("tex") or "")))


def tok(s):
    return re.findall(r"\w+", str(s or "").casefold())


def dong_tu(canh_props, fps):
    """[(từ đã chuẩn, giây tuyệt đối)] của mọi cảnh (mốc từ thật, không có thì ước lượng đều theo câu)."""
    ds = []
    for cp in canh_props or []:
        t0 = float(cp.get("batDau") or 0) / fps
        tu = cp.get("tu") or []
        if not tu:
            for c in cp.get("cau") or []:
                w = str(c.get("text") or "").split()
                if not w:
                    continue
                b = (float(c["ket"]) - float(c["bat"])) / len(w)
                tu += [{"w": x, "bat": float(c["bat"]) + k * b} for k, x in enumerate(w)]
        for x in tu:
            for t in tok(x.get("w")):
                ds.append((t, t0 + float(x.get("bat") or 0)))
    return ds


def tim(cum, ds, bat):
    """-> (chỉ số đầu, chỉ số sau cụm) hoặc None."""
    can = tok(cum)
    if not can:
        return None
    n = len(can)
    for i in range(bat, len(ds) - n + 1):
        if [ds[i + k][0] for k in range(n)] == can:
            return i, i + n
    # gần đúng: cửa sổ dài n+2 chứa >= 70% từ của cụm theo thứ tự (lời đọc đổi số / thêm hư từ)
    if n >= 2:
        for i in range(bat, len(ds)):
            if ds[i][0] != can[0] and (n < 3 or ds[i][0] != can[1]):
                continue
            j, k, khop = i, 0, 0
            while j < min(len(ds), i + n + 2) and k < n:
                if ds[j][0] == can[k]:
                    khop += 1
                    k += 1
                    j += 1
                elif k + 1 < n and ds[j][0] == can[k + 1]:
                    k += 1
                else:
                    j += 1
            if khop >= max(2, round(0.7 * n)):
                return i, j
    return None


def _chuoi(cum_list, ds, bat):
    """Khớp nối tiếp một chuỗi cụm; -> (ds giây hoặc None, vị trí cuối)."""
    kq, vt = [], bat
    for c in cum_list:
        r = tim(c, ds, vt) if c else None
        if r:
            kq.append(ds[r[0]][1])
            vt = r[1]
        else:
            kq.append(None)
    return kq, vt


def _lap(ds_t, lo, hi):
    """Điền mốc None bằng nội suy đều giữa hai mốc kề (biên lo/hi); giữ tăng dần."""
    ra = list(ds_t)
    n = len(ra)
    i = 0
    while i < n:
        if ra[i] is not None:
            i += 1
            continue
        j = i
        while j < n and ra[j] is None:
            j += 1
        a = ra[i - 1] if i > 0 else lo
        b = ra[j] if j < n else hi
        for k in range(i, j):
            ra[k] = a + (b - a) * (k - i + 1) / (j - i + 1)
        i = j
    for k in range(1, n):
        ra[k] = max(ra[k], ra[k - 1] + 0.05)
    return ra


def moc_hinh_phang(hp, canh_props, fps, tong_giay):
    """hp: kết quả bộ giải (có trang đã chuẩn hóa) hoặc đặc tả gốc. -> dict mốc (giây tuyệt đối từ đầu phần nội dung)."""
    ds = dong_tu(canh_props, fps)
    pd = hp.get("phep_dung") or []
    de = [x if isinstance(x, dict) else {"tex": str(x)} for x in (hp.get("de_rut_gon") or [])]
    trang = hp.get("trang") or hp.get("trang_chung_minh") or []
    mt = hp.get("muc_tieu") or {}
    # đầu cảnh đề bài (cảnh 2 nếu có) làm biên dưới của phép dựng
    bat_de = 0.0
    for cp in canh_props or []:
        if "de_bai" in str(cp.get("loai") or ""):
            bat_de = float(cp.get("batDau") or 0) / fps
            break
    giai = [cp for cp in canh_props if cp.get("loai") in ("tinh_toan", "dap_an")]
    canh_tinh = [cp for cp in giai if cp.get("loai") == "tinh_toan"]
    if len(canh_tinh) == len(trang):
        giai = canh_tinh
    dau_giai = giai[0]["batDau"] / fps if giai else tong_giay
    ds_de = [x for x in ds if x[1] < dau_giai]
    t_dung, vt_dung = _chuoi([b.get("khi_noi") for b in pd], ds_de, 0)
    t_de, _ = _chuoi([x.get("khi_noi") for x in de], ds_de, 0)
    r_mt = tim(mt.get("khi_noi"), ds_de, 0) if mt.get("khi_noi") else None
    t_mt = ds[r_mt[0]][1] if r_mt else None
    vt = r_mt[1] if r_mt else vt_dung
    dong = [d.get("khi_noi") for t in trang for d in t.get("dong") or []]
    t_dong, _ = _chuoi(dong, ds, len(ds_de) if giai else vt)
    so_khop = sum(x is not None for x in t_dong)
    if len(giai) == len(trang):
        so_khop = 0
        t_dong = []
        for page, cp in zip(trang, giai):
            words = dong_tu([cp], fps)
            times, _ = _chuoi([d.get("khi_noi") for d in page["dong"]], words, 0)
            so_khop += sum(x is not None for x in times)
            if times and words:
                times[0] = words[0][1]
            t_dong.extend(_lap(times, cp["batDau"] / fps, (cp["batDau"] + cp["soFrame"]) / fps))

    khop = {"dung": sum(x is not None for x in t_dung), "de": sum(x is not None for x in t_de),
            "dong": so_khop, "muc_tieu": t_mt is not None,
            "tong": {"dung": len(t_dung), "de": len(t_de), "dong": len(t_dong)}}
    # biên: phép dựng nằm trong [bat_de, mục tiêu]; dòng chứng minh trong [mục tiêu + 1, cuối - 1]
    t_dau_dong = next((x for x in t_dong if x is not None), None)
    if t_mt is None:
        t_mt = (t_dau_dong - 2.0) if t_dau_dong is not None else tong_giay * 0.3
    t_dung = _lap(t_dung, max(0.3, bat_de), max(bat_de + 0.5, t_mt - 0.6))
    if t_dung:
        t_dung[0] = 0.0
    t_de = _lap(t_de, max(0.2, bat_de), max(bat_de + 0.5, t_mt - 0.8))
    if t_dong and giai and t_dong[0] is None:
        words = dong_tu([giai[0]], fps)
        t_dong[0] = words[0][1] if words else dau_giai
    t_dong = _lap(t_dong, dau_giai if giai else t_mt + 1.2, tong_giay - 0.5)
    kq_trang, k = [], 0
    for t in trang:
        n = len(t.get("dong") or [])
        kq_trang.append([round(x, 3) for x in t_dong[k:k + n]])
        k += n
    return {"dung": {str(b.get("id")): round(t, 3) for b, t in zip(pd, t_dung)}, "de": [round(x, 3) for x in t_de],
            "muc_tieu": round(t_mt, 3), "trang": kq_trang, "ket": round(tong_giay, 3), "khop": khop}
