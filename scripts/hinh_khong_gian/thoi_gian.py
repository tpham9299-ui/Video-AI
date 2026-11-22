"""v97 - MỐC THỜI GIAN cho động cơ hình không gian: cú xoay camera (`moc_xoay`), hiện dần, nhấn mạnh, bung mặt, điểm trượt.

Đồng bộ giọng nói <-> xoay camera:
  - `moc_xoay` (cụm 3-5 từ mở đầu ý chứng minh) đối chiếu trên CHỮ GỐC lời thoại (trước phiên âm TTS; đã bỏ ngoặc / ký hiệu
    toán). Mốc từng từ gốc lấy từ chuanbi.can_tu_tho (WordBoundary edge-tts ánh xạ ngược về từ gốc) -> giây thật.
  - Chỉ tìm TIẾN, trong đúng cảnh `canh` của bước; khớp đúng -> khớp gần (>= 80 %) -> Auto-fix: cụm con >= 3 từ liền nhau.
    KHÔNG BAO GIỜ lùi về đầu cảnh / 0,0 s: không tìm được mốc sát lời -> lỗi cứng CAM_MAT_MOC.
  - Nhịp: giữ góc cũ tới (mốc - 0,15 s) -> xoay 0,9-1,2 s (mặc định 1,05 s) -> khóa. Chồng giờ với cú trước: rút cú trước
    xuống 0,9 s; vẫn chồng -> lỗi cứng CAM_DE_GIO.
"""
import difflib
import re

TRUOC_MOC = 0.15
THOI_XOAY = 1.05
THOI_XOAY_MIN = 0.9
KHE_XOAY = 0.05   # tối thiểu giữa hai cú xoay


def tok(s):
    """Chữ gốc đã chuẩn hóa: bỏ ngoặc, dấu chấm trong S.ABCD, ký hiệu toán; giữ chữ + số, chữ thường."""
    s = str(s or "")
    s = re.sub(r"\\[A-Za-z]+", " ", s)
    s = re.sub(r"[()\[\]{}$^_\\=+\-*/<>|⊥∥∩∪∈⊂°'’′.,;:!?\"“”…–—]", " ", s)
    return re.findall(r"\w+", s.casefold())


def phang_tu(canh_props, fps):
    """[(token, giây bắt đầu, số cảnh)] theo thứ tự đọc + phạm vi chỉ số của từng cảnh."""
    ds, pham_vi = [], {}
    for c in canh_props:
        goc = c["batDau"] / float(fps)
        i0 = len(ds)
        tu = c.get("tu")
        if not tu:   # giả lập / không có mốc từ: ước lượng từ câu phụ đề
            tu = []
            for cau in c.get("cau") or []:
                w = str(cau.get("text") or "").split()
                if w:
                    b = (cau["ket"] - cau["bat"]) / len(w)
                    tu += [{"w": x, "bat": cau["bat"] + k * b} for k, x in enumerate(w)]
        for w in tu:
            for t in tok(w["w"]):
                ds.append((t, round(goc + float(w["bat"]), 3), int(c["so"])))
        pham_vi[int(c["so"])] = (i0, len(ds))
    return ds, pham_vi


def tim_cum(cum, ds, lo, hi, cho_phep_con=True):
    """-> (chỉ số đầu, chỉ số sau cụm, kiểu khớp) trong [lo, hi) hoặc None. Không bao giờ trả vị trí 'đầu cảnh' mặc định."""
    can = tok(cum)
    if not can or lo >= hi:
        return None
    vung = [x[0] for x in ds[lo:hi]]
    n = len(can)
    for i in range(len(vung) - n + 1):
        if vung[i:i + n] == can:
            return lo + i, lo + i + n, "dung"
    tot = None
    for i in range(max(0, len(vung) - n + 1)):
        r = difflib.SequenceMatcher(None, can, vung[i:i + n], autojunk=False).ratio()
        if r >= 0.8 and (tot is None or r > tot[0] + 1e-9):
            tot = (r, i)
    if tot:
        return lo + tot[1], lo + tot[1] + n, "gan"
    if cho_phep_con and n >= 3:
        # Auto-fix: cụm con >= 3 từ liền nhau của moc_xoay (dài trước), vẫn bám đúng vị trí ý chứng minh trong câu
        for m in range(n - 1, 2, -1):
            for k in range(0, n - m + 1):
                con = can[k:k + m]
                for i in range(len(vung) - m + 1):
                    if vung[i:i + m] == con:
                        return lo + i, lo + i + m, "con"
    return None


def lich_khong_gian(hkg, dung, canh_props, fps, t_buoc, tong):
    """-> (lịch cho props.khung4tang.khongGian, danh sách lỗi cứng, thống kê)."""
    ds, pham_vi = phang_tu(canh_props, fps)
    loi, xoay, tk = [], [], {"xoay": 0, "khop": 0, "auto_fix": 0}
    buoc = [b for b in hkg.get("buoc") or [] if isinstance(b, dict)]
    con_tro = 0

    def pham_vi_buoc(b):
        try:
            so = int(b.get("canh"))
        except (TypeError, ValueError):
            so = None
        if so in pham_vi:
            return so, pham_vi[so]
        return so, (0, len(ds))

    for j, b in enumerate(buoc):
        so, (lo, hi) = pham_vi_buoc(b)
        for x in b.get("xoay") or []:
            if not isinstance(x, dict):
                continue
            g = str(x.get("goc_nhin") or x.get("che_do") or "toan_canh")
            doi = [str(y) for y in (x.get("doi_tuong") or [])]
            cum = str(x.get("moc_xoay") or "").strip()
            if j == 0 and not cum:   # góc mở đề: đặt ngay từ giây 0 (không phải cú xoay)
                xoay.append({"t": 0.0, "d": 0.0, "goc_nhin": g, "doi_tuong": doi})
                continue
            tk["xoay"] += 1
            if not cum:
                loi.append({"ma": "CAM_MAT_MOC", "chi_tiet": "bước %d: cú xoay '%s' thiếu moc_xoay" % (j + 1, g),
                            "goi_y": "ghi moc_xoay = cụm 3-5 từ NGUYÊN VĂN lời đọc mở đầu ý chứng minh"})
                continue
            kq = tim_cum(cum, ds, max(lo, con_tro), hi)
            if kq is None:
                loi.append({"ma": "CAM_MAT_MOC", "chi_tiet": "bước %d (cảnh %s): moc_xoay \"%s\" không có trong lời đọc (sau mốc trước)" % (j + 1, so, cum),
                            "goi_y": "chép đúng cụm trong loi_thoai của cảnh đó; không tự dời cú xoay về đầu cảnh"})
                continue
            if kq[2] == "con":
                tk["auto_fix"] += 1
            tk["khop"] += 1
            con_tro = kq[1]
            moc = ds[kq[0]][1]
            xoay.append({"t": round(max(0.0, moc - TRUOC_MOC), 3), "d": THOI_XOAY, "goc_nhin": g, "doi_tuong": doi,
                         "moc": round(moc, 3), "khi_noi": cum, "khop": kq[2], "canh": so})
    # chống chồng giờ: rút cú trước xuống 0,9 s; vẫn chồng -> CAM_DE_GIO (không bỏ cú nào)
    that = [x for x in xoay if x["d"] > 0]
    for a, b in zip(that, that[1:]):
        if a["t"] + a["d"] + KHE_XOAY > b["t"]:
            a["d"] = max(THOI_XOAY_MIN, round(b["t"] - KHE_XOAY - a["t"], 3))
            if a["t"] + a["d"] + KHE_XOAY > b["t"] + 1e-9:
                loi.append({"ma": "CAM_DE_GIO", "chi_tiet": "cú xoay '%s' (%.2fs) chồng cú '%s' (%.2fs)" % (a["goc_nhin"], a["t"], b["goc_nhin"], b["t"]),
                            "goi_y": "hai ý chứng minh cần cách nhau >= 1 s lời đọc; tách câu hoặc gộp thành một cú xoay"})
    # ---- hiện dần / nhấn mạnh / bung mặt ----
    hien, nhan_manh, hanh_dong = {}, [], []
    for j, b in enumerate(buoc):
        so, (lo, hi) = pham_vi_buoc(b)
        tb = t_buoc[j] if j < len(t_buoc) else 0.0
        i_tb = next((k for k, x in enumerate(ds) if x[1] >= tb - 0.05), len(ds))
        ct = max(lo, i_tb) if j else 0
        for h in b.get("hien") or []:
            hid, cum = (h.get("id"), h.get("khi_noi")) if isinstance(h, dict) else (h, None)
            hid = str(hid or "")
            if not hid or j == 0 and hid in dung["khoi"]["dinh"]:
                continue
            t = tb + 0.25 if j else 0.0
            if cum:
                kq = tim_cum(cum, ds, ct, hi)
                if kq:
                    t = ds[kq[0]][1]
            if hid not in hien:
                hien[hid] = round(max(0.0, t), 3)
        if b.get("nhan_manh"):
            nhan_manh.append({"t": round(tb, 3), "ids": [str(x) for x in b["nhan_manh"]]})
        for h in b.get("hanh_dong") or []:
            if isinstance(h, dict) and h.get("loai") == "bung_mat":
                t = tb + 0.6
                if h.get("khi_noi"):
                    kq = tim_cum(h["khi_noi"], ds, ct, hi)
                    if kq:
                        t = ds[kq[0]][1]
                hanh_dong.append({"loai": "bung_mat", "id": str(h.get("id") or ""), "t": round(t, 3), "d": 1.6})
                kid = str(h.get("id") or "")
                hien[kid] = min(hien.get(kid, t), round(t, 3))
    # đoạn / mặt / góc chưa khai báo thời điểm: hiện cùng điểm muộn nhất của nó (điểm dựng chưa hiện thì đoạn cũng chưa)
    dinh = set(dung["khoi"]["dinh"])
    def t_diem(p):
        return 0.0 if p in dinh else hien.get(p, 0.0)
    for d in dung["doan"]:
        if d["id"] not in hien and d["vai"] != "khoi" and not any(k in hien for k in (d["a"] + d["b"], d["b"] + d["a"])):
            t = max(t_diem(d["a"]), t_diem(d["b"]))
            if t > 0:
                hien[d["id"]] = t
    for k in dung["kinh"]:
        if k["id"] not in hien:
            t = max(t_diem(p) for p in k["diem"])
            if t > 0:
                hien[k["id"]] = t
    for g in dung["goc"]:
        if g["id"] not in hien:
            t = max(t_diem(p) for p in (g["dinh"], g["a"], g["b"]))
            if t > 0:
                hien[g["id"]] = t
    ra = {"phienBan": 1, "dung": dung, "xoay": [{k: v for k, v in x.items() if k not in ("khop", "canh")} for x in xoay],
          "hien": hien, "nhanManh": nhan_manh, "hanhDong": hanh_dong, "tongGiay": round(float(tong), 3)}
    if dung.get("truot"):
        ra["truotGio"] = {"t": 0.25, "d": 1.75}   # hook 2 s đầu: điểm "bất kỳ" trượt nhẹ trên cạnh
    return ra, loi, {**tk, "chi_tiet": xoay}
