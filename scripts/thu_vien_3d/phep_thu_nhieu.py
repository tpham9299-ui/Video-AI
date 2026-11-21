"""Đặc tả cảnh xác suất nhiều vật -> props.canh[i].moiTruong {loai: "dac_ta"} cho src/CanhMoiTruong.tsx (Three.js).

Không còn giới hạn một vật (một hộp bi / một nhóm xu / một nhóm xúc xắc): mọi thực thể đồ chơi xác suất của đề
(bình/hộp/cốc chứa, bi, xúc xắc, đồng xu, thẻ, bóng) được dựng cùng lúc, đúng số lượng và màu từng bản sao;
quan hệ "trong" đặt vật vào vật chứa. Bố cục do Three.js tự tính (AI không ghi tọa độ).
"""

from .khop import DANH_MUC, khop_moi_truong, khop_vat
from .xep_cho import HIEN_TOI_DA, mau_ban, so_ban, tach_ref

KIEU_3JS = {"hop_bi": "binh", "coc": "coc", "hop": "hop", "bi": "bi", "xuc_xac": "xuc_xac",
            "dong_xu": "dong_xu", "the": "the", "bong": "bong", "qua": "bong"}
CHUA = {"binh", "coc", "hop"}
MAU_HEX = {"do": "#cf4131", "xanh_duong": "#2877b3", "xanh_la": "#3f9357", "vang": "#efbd44", "trang": "#f1eadb",
           "tim": "#8d5eb2", "cam": "#e48639", "den": "#303539", "hong": "#e57fa6", "nau": "#8a5a3b", "xam": "#9aa0a3",
           "kinh": "#a8dee8", "go": "#ad8054", "thep": "#8f9aa0", "la": "#4f8a45"}
DONG_TU_3JS = {"lay_ra", "bo_vao", "tung", "lan", "quay", "roi", "xep", "di_chuyen", "danh_dau_chon", "sang_len", "mo", "dong"}


def hex_mau(m, mac_dinh="#f1eadb"):
    m = str(m or "")
    return m if m.startswith("#") and len(m) == 7 else MAU_HEX.get(m, mac_dinh)


def lap_moi_truong_phep_thu(kb):
    """None nếu không phải bài xác suất có đặc tả cảnh dựng được bằng Three.js (vật chính không phải đồ chơi xác suất)."""
    spec = kb.get("dac_ta_canh")
    if not isinstance(spec, dict) or str(kb.get("luong") or "") == "hinh_hoc_thuan":
        return None
    if str(kb.get("mon") or "").upper() != "XAC_SUAT" and not spec.get("phep_thu"):
        return None
    vat, bo_qua, theo_the = [], [], {}
    for the in spec.get("thuc_the") or []:
        mau_tv = khop_vat(the)
        kieu = KIEU_3JS.get(mau_tv)
        if kieu is None:
            if the.get("vai_tro") == "chinh":
                return None          # vật chính là vật thật khác (xe, bể...): để Blender dựng
            bo_qua.append(the.get("ten"))
            continue
        n = min(so_ban(the), HIEN_TOI_DA)
        ten = str(the.get("ten") or "") + " " + str(the.get("tu_de") or "")
        danh_so = kieu == "the" and any(w in ten.casefold() for w in ("số", "đánh số", "ghi số"))
        ids = []
        for k in range(1, n + 1):
            ref = the["id"] if n == 1 else f"{the['id']}#{k}"
            ids.append(ref)
            v = {"id": ref, "the": the["id"], "ban": k, "kieu": kieu, "mau": hex_mau(mau_ban(the, k, mau_tv))}
            if danh_so:
                v["nhan"] = str(k)
            vat.append(v)
        theo_the[the["id"]] = ids
    if not any(v["kieu"] not in CHUA for v in vat):
        return None
    by_id = {v["id"]: v for v in vat}
    for r in spec.get("quan_he") or []:
        if r.get("kieu") not in ("trong", "tren"):
            continue
        a, ka = tach_ref(r.get("a"))
        b, kb_ = tach_ref(r.get("b"))
        if a not in theo_the or b not in theo_the:
            continue
        chua = theo_the[b] if kb_ is None else [f"{b}#{kb_}" if len(theo_the[b]) > 1 else b]
        con = theo_the[a] if ka is None else [x for x in theo_the[a] if x.endswith(f"#{ka}") or len(theo_the[a]) == 1]
        if not chua or by_id[chua[0]]["kieu"] not in CHUA:
            continue
        for j, x in enumerate(con):
            by_id[x]["trong"] = chua[j % len(chua)] if ka is None and len(chua) == len(con) else chua[0]
    boi = spec.get("boi_canh") or {}
    cau = kb.get("cau_chuyen") if isinstance(kb.get("cau_chuyen"), dict) else {}
    mau = boi.get("mau") if boi.get("mau") in DANH_MUC["moi_truong"] else khop_moi_truong(
        boi.get("tu_de"), boi.get("mo_ta"), cau.get("dia_diem"),
        ngoai_troi=None if "trong_nha" not in boi else not boi["trong_nha"]) or "ban_thi_nghiem"
    info = DANH_MUC["moi_truong"][mau]
    return {"loai": "dac_ta", "vat": vat, "boQua": [x for x in bo_qua if x],
            "boiCanh": {"mau": mau, "ngoaiTroi": bool(info.get("ngoai_troi")), "troi": info.get("troi", "#e8e2d6"),
                        "dat": hex_mau(info.get("dat"), "#ad8054"), "thoiGian": boi.get("thoi_gian", "sang")}}


def gan_cho_canh(kb, props, mt):
    """Gắn moiTruong cho các cảnh mở đầu (trước cảnh đề), cảnh đề nếu có quay riêng và mọi cảnh có hành động.
    Mỗi cảnh mang hành động của cảnh trước (xong=True) để trạng thái nối tiếp (bi đã lấy ra vẫn nằm ngoài)."""
    scenes = props.get("canh") or []
    shots = {q.get("canh"): q for q in (kb["dac_ta_canh"].get("quay") or []) if isinstance(q, dict)}
    ids = {v["id"] for v in mt["vat"]} | {v["the"] for v in mt["vat"]}
    transition = next((i for i, c in enumerate(scenes) if i and c.get("loai") == "de_bai"), 1)
    xong = []
    gan = []
    for i, c in enumerate(scenes):
        for f in ("moiTruong", "phaMinhHoa", "xeMoDau", "chuoi3D", "nhipXe", "nhipQuay"):
            c.pop(f, None)
        shot = shots.get(c.get("so", i + 1)) or {}
        pq = c.get("quay") or {}
        moc = {a.get("i"): a for a in pq.get("hanhDong") or []}
        acts = []
        for k, a in enumerate(shot.get("hanh_dong") or []):
            if a.get("dong_tu") not in DONG_TU_3JS or a.get("vat") not in ids:
                continue
            m = moc.get(k) or {}
            acts.append({"vat": a["vat"], "dongTu": a["dong_tu"], "so": a.get("so"), "thamSo": a.get("tham_so") or {},
                         "t": m.get("t"), "khiNoi": a.get("khi_noi", "")})
        if not (i < transition or (i == transition and shot) or acts):
            continue
        duration = c.get("soFrame", 150) / 30
        for k, a in enumerate(acts):
            if a["t"] is None:
                a["t"] = round(duration * (0.25 + 0.5 * k / max(1, len(acts))), 3)
        for k, a in enumerate(acts):
            nxt = acts[k + 1]["t"] if k + 1 < len(acts) else duration
            a["d"] = round(max(0.5, min(1.5, nxt - a["t"] - 0.05)), 3)
        c["moiTruong"] = dict(mt, quay={"gocMay": shot.get("goc_may") or "toan_canh",
                                        "chuyenMay": shot.get("chuyen_may") or "luot_vao",
                                        "tieuDiem": [r for r in shot.get("tieu_diem") or [] if r in ids],
                                        "hanhDong": [dict(a, xong=True) for a in xong] + acts})
        xong.extend(acts)
        gan.append(i)
    return gan
