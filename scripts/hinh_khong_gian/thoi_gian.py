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
    la_thuan = not dung.get("lego") and not dung.get("khoiDs") and str(hkg.get("phien_ban") or "") != "2"
    # Pha 3: hỗ trợ trường mới `net_phu[]` (bắt buộc hiện đường phụ / điểm mới / góc / mặt phụ đúng lúc lời giải nhắc < 0,25 s)
    for np_item in hkg.get("net_phu") or []:
        if not isinstance(np_item, dict):
            continue
        nid = str(np_item.get("id") or np_item.get("doan") or np_item.get("diem") or np_item.get("mat") or np_item.get("goc") or "").strip()
        cum = str(np_item.get("khi_noi") or "").strip()
        if not nid:
            continue
        lo_n, hi_n = pham_vi.get(int(np_item["canh"]), (0, len(ds))) if str(np_item.get("canh") or "").isdigit() else (0, len(ds))
        kq = tim_cum(cum, ds, lo_n, hi_n) if cum else None
        if kq:
            hien[nid] = round(max(0.0, ds[kq[0]][1]), 3)
    for j, b in enumerate(buoc):
        so, (lo, hi) = pham_vi_buoc(b)
        tb = t_buoc[j] if j < len(t_buoc) else 0.0
        i_tb = next((k for k, x in enumerate(ds) if x[1] >= tb - 0.05), len(ds))
        ct = max(lo, i_tb) if j else 0
        for h in b.get("hien") or []:
            hid, cum = (h.get("id"), h.get("khi_noi")) if isinstance(h, dict) else (h, None)
            hid = str(hid or "")
            if not hid or (j == 0 and hid in dung["khoi"]["dinh"] and not cum):
                continue
            t = tb + 0.15 if j else 0.0
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

    # Quy trình 3 pha cho HINH_KHONG_GIAN thuần (phienBan == 1, không đụng lich_lego của THUC_TE):
    # Pha 1 (0..t_p1): lưới sạch + mặt đáy mờ; Pha 2 (t_p1..t_p2): dựng từng nét (đáy -> đường chéo & O -> đường cao SA + góc vuông -> cạnh bên -> điểm M).
    # Tương thích ngược 100%: đọc `cac_net_dung[]` nếu có, không có thì tự sinh trình tự mặc định; hoàn tất trước t = 3,3 s để test_hinh_3d_chat_luong luôn đủ đỉnh ở t=4s.
    if la_thuan and dung.get("khoi") and dung["khoi"].get("dinh"):
        t_buoc1 = t_buoc[1] if len(t_buoc) > 1 and t_buoc[1] > 1.2 else min(4.0, float(tong) * 0.25)
        t_p1 = 0.35
        t_p2_cuoi = min(3.15, max(1.6, t_buoc1 - 0.55))
        cac_net = [x for x in (hkg.get("cac_net_dung") or []) if isinstance(x, (dict, str))]
        if cac_net:
            ct_d = 0
            for idx_n, item in enumerate(cac_net):
                nid = str(item.get("id") or item.get("doan") or item.get("diem") or "").strip() if isinstance(item, dict) else str(item).strip()
                cum = str(item.get("khi_noi") or "").strip() if isinstance(item, dict) else ""
                if not nid or nid in hien:
                    continue
                kq = tim_cum(cum, ds, ct_d, len(ds)) if cum else None
                if kq:
                    ct_d = kq[1]
                    hien[nid] = round(max(t_p1, ds[kq[0]][1]), 3)
                else:
                    hien[nid] = round(t_p1 + (t_p2_cuoi - t_p1) * idx_n / max(1, len(cac_net)), 3)
        # Tự sinh trình tự dựng từng nét mặc định cho các cạnh khối chưa khai báo (tương thích ngược kịch bản cũ)
        P_all = dung.get("diem") or {}
        khoi_dinh = list(dung["khoi"].get("dinh") or [])
        zs = [P_all[p][2] for p in khoi_dinh if p in P_all]
        z_day = min(zs) if zs else 0.0
        dinh_day = [p for p in khoi_dinh if p in P_all and abs(P_all[p][2] - z_day) < 1e-4]
        dinh_tren = [p for p in khoi_dinh if p not in dinh_day]
        chan = str((hkg.get("khoi") or {}).get("chan_duong_cao") or "").strip()
        canh_day, canh_cao, canh_ben = [], [], []
        for d in dung.get("doan") or []:
            if d.get("vai") != "khoi":
                continue
            a, b2 = d["a"], d["b"]
            if a in dinh_day and b2 in dinh_day:
                canh_day.append(d)
            elif (a == chan and b2 in dinh_tren) or (b2 == chan and a in dinh_tren) or (
                a in P_all and b2 in P_all and abs(P_all[a][0] - P_all[b2][0]) < 1e-4 and abs(P_all[a][1] - P_all[b2][1]) < 1e-4
            ):
                canh_cao.append(d)
            else:
                canh_ben.append(d)
        nhom_pha2 = []
        if canh_day:
            nhom_pha2.append(("day", canh_day))
        if canh_cao:
            nhom_pha2.append(("cao", canh_cao))
        if canh_ben:
            nhom_pha2.append(("ben", canh_ben))
        if nhom_pha2:
            dt_nhom = (t_p2_cuoi - t_p1) / max(1, len(nhom_pha2))
            for gi, (_, ds_c) in enumerate(nhom_pha2):
                t_g0 = t_p1 + gi * dt_nhom
                for ci, d in enumerate(ds_c):
                    key_c = d["a"] + d["b"]
                    if d["id"] not in hien and key_c not in hien and (d["b"] + d["a"]) not in hien:
                        t_c = round(t_g0 + (dt_nhom * 0.72) * ci / max(1, len(ds_c)), 3)
                        hien[d["id"]] = t_c
                        for pt in (d["a"], d["b"]):
                            if pt not in hien or t_c < hien[pt]:
                                hien[pt] = t_c
        # Đảm bảo điểm đặc biệt khai báo ở đề (vd điểm trượt M) xuất hiện cuối Pha 2 nếu chưa có mốc
        tr_diem = (dung.get("truot") or {}).get("diem")
        if tr_diem and tr_diem not in hien:
            hien[tr_diem] = round(min(t_p2_cuoi, 0.25 if dung.get("truot") else t_p2_cuoi), 3)

    # đoạn / mặt / góc chưa khai báo thời điểm: hiện cùng điểm muộn nhất của nó (điểm dựng chưa hiện thì đoạn cũng chưa)
    dinh = set(dung["khoi"]["dinh"])
    def t_diem(p):
        return hien.get(p, 0.0) if p in hien else 0.0
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
    # v102: ĐIỂM dựng thêm (H, I, O, chân vuông góc, giao điểm phụ) KHÔNG hiện sẵn ở giây 0 — hiện đúng lúc đoạn / mặt / góc đầu tiên
    # chứa nó xuất hiện (cùng quy tắc với src/khonggian/canh.ts `hienDiemPhu`). Đỉnh khối, điểm khối Lego, điểm trượt hook, điểm chuyển động giữ nguyên.
    giu_tu_dau = set(dinh)
    for kl in dung.get("khoiDs") or []:
        giu_tu_dau.update(kl.get("dinh") or [])
    if (dung.get("truot") or {}).get("diem"):
        giu_tu_dau.add(dung["truot"]["diem"])
    for d in dung["doan"]:
        if d["vai"] == "khoi":
            giu_tu_dau.update((d["a"], d["b"]))
    for p in dung.get("nhan") or []:
        if p in giu_tu_dau or p in hien:
            continue
        ts_ = []
        for d in dung["doan"]:
            if p in (d["a"], d["b"]):
                v = hien.get(d["id"])
                if v is None:
                    v = next((hien[k] for k in (d["a"] + d["b"], d["b"] + d["a"]) if k in hien), None)
                if v is not None:
                    ts_.append(v)
        for k in dung["kinh"]:
            if p in k["diem"] and k["id"] in hien:
                ts_.append(hien[k["id"]])
        for g in dung["goc"]:
            if p in (g["dinh"], g["a"], g["b"]) and g["id"] in hien:
                ts_.append(hien[g["id"]])
        if ts_ and min(ts_) > 0:
            hien[p] = round(min(ts_), 3)
    ra = {"phienBan": 1, "dung": dung, "xoay": [{k: v for k, v in x.items() if k not in ("khop", "canh")} for x in xoay],
          "hien": hien, "nhanManh": nhan_manh, "hanhDong": hanh_dong, "tongGiay": round(float(tong), 3)}
    if dung.get("truot"):
        ra["truotGio"] = {"t": 0.25, "d": 1.75}   # hook 2 s đầu: điểm "bất kỳ" trượt nhẹ trên cạnh
    return ra, loi, {**tk, "chi_tiet": xoay}


# ======================================================================================================================
# v98 — LEGO: 5 phép biến hình đồng bộ giọng (moc_hanh_dong) + vật chuyển động + cô lập
# ======================================================================================================================
DONG_TAC = ("tinh_tien", "doi_xung_mat", "quay", "co_lap", "truot_toi_uu")
THOI_BIEN = 1.4


def lich_lego(hkg, dung, canh_props, fps, t_buoc, tong, L=None):
    """lich_khong_gian (xoay / hiện / nhấn mạnh) + bienHinh / chuyen / co_lap theo moc_hanh_dong -> (lịch, lỗi, thống kê)."""
    from .lego import Lego
    import math as _m
    ra, loi, tk = lich_khong_gian(hkg, dung, canh_props, fps, t_buoc, tong)
    ds, pham_vi = phang_tu(canh_props, fps)
    if L is None:
        L = Lego(hkg)
        for d in hkg.get("diem") or []:
            if isinstance(d, dict):
                try:
                    L.dung_diem(d)
                except Exception:   # noqa: BLE001 - bộ giải đã báo lỗi trước đó
                    pass
    S = 1.0 / float(dung.get("tiLe") or 1.0)
    sc = lambda p: [round(c * S, 6) for c in p]  # noqa: E731
    nguon = {str(d.get("ten")): d for d in hkg.get("diem") or [] if isinstance(d, dict)}
    hien = ra["hien"]
    bien, chuyen, nm = [], [], ra["nhanManh"]
    buoc = [b for b in hkg.get("buoc") or [] if isinstance(b, dict)]
    tk["hanh_dong"] = 0
    for j, b in enumerate(buoc):
        try:
            so = int(b.get("canh"))
        except (TypeError, ValueError):
            so = None
        lo, hi = pham_vi.get(so, (0, len(ds)))
        tb = t_buoc[j] if j < len(t_buoc) else 0.0
        t_sau = t_buoc[j + 1] if j + 1 < len(t_buoc) else tong
        i_tb = next((k for k, x in enumerate(ds) if x[1] >= tb - 0.05), len(ds))
        ct = max(lo, i_tb) if j else lo
        for h in b.get("hanh_dong") or []:
            if not isinstance(h, dict) or h.get("loai") not in DONG_TAC:
                continue
            tk["hanh_dong"] += 1
            cum = str(h.get("moc_hanh_dong") or h.get("khi_noi") or "").strip()
            t = tb + 0.6
            if cum:
                kq = tim_cum(cum, ds, ct, hi)
                if kq is None:
                    loi.append({"ma": "CAM_MAT_MOC", "chi_tiet": "bước %d: moc_hanh_dong \"%s\" (%s) không có trong lời đọc cảnh %s" % (j + 1, cum, h["loai"], so),
                                "goi_y": "chép đúng cụm 3-5 từ NGUYÊN VĂN lời đọc lúc động tác bắt đầu"})
                    continue
                t = ds[kq[0]][1] - TRUOC_MOC
                ct = kq[1]
            t = round(max(0.0, t), 3)
            l = h["loai"]
            ids = [str(x) for x in (h.get("doi_tuong") or [])]
            if l == "co_lap":
                nm.append({"t": t, "ids": ids, "coLap": True})
                het = round(max(t + 1.5, t_sau - 0.05), 3)   # cô lập kết thúc ở hết bước (trừ khi bước có nhấn mạnh riêng sớm hơn)
                if not any(t < x["t"] <= het for x in nm[:-1]):
                    nm.append({"t": het, "ids": []})
                continue
            if l == "truot_toi_uu":
                ten = str(h.get("diem") or (ids[0] if ids else ""))
                d0 = dict(nguon.get(ten) or {}, **{k: v for k, v in h.items() if k in ("tren", "toi")})
                try:
                    M, a, bb, u = L.toi_uu(d0, "truot_toi_uu")
                except Exception as e:   # noqa: BLE001
                    loi.append({"ma": "KG_THIEU_DAC_TA", "chi_tiet": "truot_toi_uu %s: %s" % (ten, getattr(e, "chi_tiet", e))})
                    continue
                u0, u1 = (0.12, 0.88) if u > 0.5 else (0.88, 0.12)
                chuyen.append({"diem": ten, "duong": [sc(a), sc(bb)],
                               "moc": [{"t": t, "u": u0}, {"t": round(t + 1.3, 3), "u": u1}, {"t": round(t + 2.6, 3), "u": round(u, 6)}],
                               "doc": {"ds": [str(x) for x in d0.get("toi") or []], "heSo": float(dung.get("tiLe") or 1.0),
                                       "dv": str(h.get("don_vi") or (hkg["he_truc"].get("don_vi") if isinstance(hkg.get("he_truc"), dict) else "") or "")}})
                hien[ten] = min(hien.get(ten, t), t) if ten in hien else t
                continue
            cap = []
            for dst in ids:
                nd = nguon.get(dst) or {}
                src = str(nd.get("nguon") or h.get("nguon") or "")
                if not src or src not in dung["diem"] or dst not in dung["diem"]:
                    loi.append({"ma": "KG_DIEM_KHONG_TON_TAI", "chi_tiet": "%s: %s cần là ảnh của một điểm (quan hệ %s, nguon)" % (l, dst, l)})
                    continue
                cap.append([src, dst])
                hien[dst] = t
                if l == "doi_xung_mat":
                    did = "dx_%s_%s" % (src, dst)
                    dung["doan"].append({"id": did, "a": src, "b": dst, "vai": "phu", "dut": True})
                    hien[did] = t
            if not cap:
                continue
            x = {"loai": l, "t": t, "d": float(h.get("giay") or THOI_BIEN), "cap": cap}
            if l == "quay":
                nd = nguon.get(cap[0][1]) or {}
                try:
                    o, v = L.duong(nd.get("truc") or h.get("truc"), "quay")
                    x["truc"] = {"o": sc(o), "v": [v[i] - o[i] for i in range(3)], "goc": _m.radians(float(nd.get("goc") or h.get("goc") or 90))}
                except Exception:   # noqa: BLE001
                    x["loai"] = "tinh_tien"
            bien.append(x)
    # vật chuyển động khai báo trong doi_tuong.diem.chuyen_dong (Flycam, Tàu A...)
    for c in dung.get("chuyenDs") or []:
        t0 = hien.get(c["diem"], hien.get(c["id"], None))
        if c.get("khi_noi"):
            kq = tim_cum(c["khi_noi"], ds, 0, len(ds))
            if kq:
                t0 = ds[kq[0]][1]
        if t0 is None:
            t0 = t_buoc[1] if len(t_buoc) > 1 else 1.0
        chuyen.append({"diem": c["diem"], "duong": c["duong"], "moc": [{"t": round(t0, 3), "u": 0.0}, {"t": round(t0 + c["giay"], 3), "u": 1.0}]})
    # mảnh của một khối (cạnh trụ, đường dóng, vạch trục) hiện CÙNG khối của nó (lich_khong_gian chỉ biết điểm đầu mút)
    for d in dung["doan"]:
        if d.get("nhom") and hien.get(d["nhom"], 0) > 0:
            hien[d["id"]] = hien[d["nhom"]]
        elif d.get("nhom") and d["id"] in hien and d["nhom"] not in hien and not d["id"].startswith("dx_"):
            hien.pop(d["id"], None)
    ra["nhanManh"] = sorted(nm, key=lambda x: x["t"])
    ra["bienHinh"] = bien
    ra["chuyen"] = chuyen
    ra["phienBan"] = 2
    return ra, loi, tk
