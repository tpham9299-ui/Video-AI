#!/usr/bin/env python3
"""Pha 2B — Đạo diễn hình ảnh & đóng gói dữ liệu (Script-First) + Kiểm tra Schema duy nhất.

Đọc duy nhất `schema/kich_ban_bp2.json` (Single Source of Truth) để:
  1. Kiểm tra tính hợp lệ đầu ra Pha 2A (`pha_2a`) và đầu ra hợp nhất sau Pha 2B (`pha_2b`).
  2. Chuyển kịch bản sư phạm thuần từ Pha 2A sang kịch bản hoàn chỉnh theo từng mảng:
     - `XAC_SUAT`: Dùng `xac_suat_dong.tinh_xac_suat_tu_de` tính chính xác `n(Ω)`, `n(A)` & trường hợp thuận lợi
       từ đề + lời giải BP1, bơm thẳng vào `khung4tang.san_khau` và `khung4tang.buoc[].hanh_dong` (không để AI đếm tay).
     - `THUC_TE`: Ánh xạ `canh[].mo_ta_minh_hoa` sang 16 mảnh ghép chuẩn `kho_manh_svg.py` (qua `du_phong_t2.py`)
       hoặc sân khấu 2D/3D sẵn có; cấm khối hộp thuần túy cho bài tiền bạc/tài chính; luôn giữ chốt chống `t2_trong`/`hinh_dung_im`.
     - `HINH_PHANG` & `HINH_KHONG_GIAN`: Giữ nguyên 3 pha dựng nét (`cac_net_dung` + `net_phu`) và đầy đủ trường cho
       `giai_hinh_phang.py` / `giai_hinh_khong_gian.py` / `khung_hinh_hoc_du_phong` (Manim 3D).
  3. Tương thích ngược 100% với các kịch bản cũ đang nằm trong `HANG_DOI` / `DOC_DE`.

Cách dùng CLI:
  python -X utf8 scripts/dao_dien_2b.py -                       # stdin JSON {kb_2a, de_info} -> stdout JSON {ok, kb, ...}
  python -X utf8 scripts/dao_dien_2b.py --kiem-schema kb.json   # kiểm tra đối chiếu schema/kich_ban_bp2.json
"""
import copy
import json
import os
import re
import sys
from pathlib import Path

GOC = Path(__file__).resolve().parent.parent
TEP_SCHEMA_BP2 = GOC / "schema" / "kich_ban_bp2.json"

if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

_SCHEMA_CACHE = None

RE_TAI_CHINH = re.compile(
    r"lãi suất|lãi kép|gửi tiết kiệm|ngân hàng|tiền gửi|trả góp|vay vốn|lạm phát|"
    r"lợi nhuận|doanh thu|giá vé|giá bán|chi phí|giảm giá|tăng giá|tiền lãi|kinh doanh",
    re.I,
)
RE_HINH_KHONG_GIAN = re.compile(
    r"hình chóp|lăng trụ|tứ diện|hình hộp|lập phương|mặt phẳng\s*\([A-Z]{3,4}\)|"
    r"không gian|oxyz|khoảng cách từ .* đến mặt phẳng|góc giữa .* mặt đáy",
    re.I,
)
RE_THU_LAI_LOAI = re.compile(r"thu_lai|kiem_tra|kiem_chung", re.I)


def tai_schema_bp2():
    """Đọc 1 nguồn chân lý duy nhất `schema/kich_ban_bp2.json`."""
    global _SCHEMA_CACHE
    if _SCHEMA_CACHE is None:
        _SCHEMA_CACHE = json.loads(TEP_SCHEMA_BP2.read_text(encoding="utf8"))
    return _SCHEMA_CACHE


def _lam_sach_evergreen(s):
    try:
        import evergreen
        return evergreen.lam_sach(str(s or ""))
    except Exception:
        return re.sub(r"\b2k\d\b", "", str(s or ""), flags=re.I).strip()


def xac_dinh_mang(kb, de_info=None):
    de_info = de_info if isinstance(de_info, dict) else {}
    mon = str(de_info.get("mon") or kb.get("mon") or "").upper()
    luong = str(kb.get("luong") or "").lower()
    van = str(de_info.get("de_bai") or kb.get("de_bai") or "")
    if mon in ("HINH_PHANG", "HINH_KHONG_GIAN"):
        return mon
    if mon == "HINH_HOC" or luong == "hinh_hoc_thuan" or kb.get("hinh_phang_chuan") or kb.get("hinh_khong_gian"):
        if kb.get("hinh_phang_chuan"):
            return "HINH_PHANG"
        if kb.get("hinh_khong_gian") or RE_HINH_KHONG_GIAN.search(van):
            return "HINH_KHONG_GIAN"
        return "HINH_PHANG"
    if mon == "XAC_SUAT":
        return "XAC_SUAT"
    return "THUC_TE"


def khu_lap_van_ban(s, toi_da=0):
    """v102.1 (khớp khuLapVanBan_ ở KiemTraHinh.gs): khử câu lặp, n-gram >= 2 từ lặp liền nhau, mục trùng sau dấu phẩy."""
    goc = re.sub(r"\s+", " ", str(s or "")).strip()
    if not goc:
        return ""
    khoa = lambda x: re.sub(r"[^\w]+", " ", str(x).lower()).strip()  # noqa: E731
    ra, da = [], set()
    for c in re.findall(r"[^.!?;|…]+[.!?;|…]*", goc) or [goc]:
        t = c.strip()
        if not t:
            continue
        muc, giu, da_muc = re.split(r",\s+", t), [], set()   # giữ số thập phân 0,8
        for m in muc:
            k = khoa(m)
            duoi = khoa(giu[-1]).split(" ")[-len(k.split(" ")):] if giu and k else []
            if k and (k in da_muc or " ".join(duoi) == k):
                continue
            giu.append(m.strip())
            if k:
                da_muc.add(k)
        w = ", ".join(giu).split(" ")
        doi, vong = True, 0
        while doi and vong < 20:
            doi, vong = False, vong + 1
            for n in range(min(12, len(w) // 2), 1, -1):
                for i in range(0, len(w) - 2 * n + 1):
                    a, b = khoa(" ".join(w[i:i + n])), khoa(" ".join(w[i + n:i + 2 * n]))
                    if a and a == b:
                        del w[i + n:i + 2 * n]
                        doi = True
                        break
                if doi:
                    break
        t = " ".join(w)
        k = khoa(t)
        if k and k in da:
            continue
        if k:
            da.add(k)
        ra.append(t)
    kq = re.sub(r"\s+([,.;!?])", r"", " ".join(ra)).strip()
    if toi_da and len(kq) > toi_da:
        cat = kq[:toi_da]
        sp = cat.rfind(" ")
        kq = (cat[:sp] if sp > toi_da * 0.6 else cat).rstrip(",;: ") + "…"
    return kq


def kiem_tra_schema_bp2(kb, pha="pha_2b", nghiem_ngat=False):
    """Đối chiếu kịch bản với `schema/kich_ban_bp2.json`. Trả list chuỗi lỗi (rỗng = đạt)."""
    loi = []
    if not isinstance(kb, dict):
        return ["SCHEMA_GOC: kịch bản không phải đối tượng JSON"]
    sc = tai_schema_bp2()
    spec = sc.get(pha) or {}
    chung = sc.get("chung") or {}
    loai_canh_ok = set(chung.get("loai_canh") or [])
    loai_sk_ok = set(chung.get("loai_san_khau") or [])
    loai_bc_ok = set(chung.get("loai_bien_co") or [])

    if nghiem_ngat or pha == "pha_2a" or kb.get("pha_bp2") == "2_pha":
        co_canh_thu_lai = any(isinstance(c, dict) and re.search(r"kiem_tra|thu_lai|kiem_chung", str(c.get("loai") or ""))
                              for c in (kb.get("canh") or []))
        for req in spec.get("required") or []:
            v = kb.get(req)
            # v102.1: "thu_lai" khóa tại schema; kịch bản cũ đã có cảnh thử lại / khong_thu_lai vẫn hợp lệ (tương thích ngược)
            if req == "thu_lai" and (co_canh_thu_lai or len(str(kb.get("khong_thu_lai") or "").split()) >= 6):
                continue
            if v is None or (isinstance(v, str) and not v.strip()) or (isinstance(v, list) and not v):
                loi.append(f"SCHEMA_THIEU_{req.upper()}: thiếu trường bắt buộc '{req}' ({pha})")

    canh = kb.get("canh")
    if not isinstance(canh, list) or not canh:
        loi.append("SCHEMA_CANH_RONG: canh phải là mảng không rỗng")
    else:
        for i, c in enumerate(canh):
            if not isinstance(c, dict):
                loi.append(f"SCHEMA_CANH_{i + 1}: không phải đối tượng")
                continue
            loai = str(c.get("loai") or "").strip()
            if loai and loai_canh_ok and loai not in loai_canh_ok:
                loi.append(f"SCHEMA_LOAI_CANH_{i + 1}: loai '{loai}' ngoài danh mục chuẩn")
            if pha == "pha_2a" and not str(c.get("mo_ta_minh_hoa") or "").strip():
                loi.append(f"SCHEMA_THIEU_MO_TA_MINH_HOA_{i + 1}: cảnh {i + 1} thiếu mo_ta_minh_hoa tiếng Việt")

    tt3 = kb.get("tom_tat_3_buoc")
    if tt3 is not None:
        if not isinstance(tt3, list) or (len(tt3) != 3 and (nghiem_ngat or pha == "pha_2a")):
            loi.append("SCHEMA_TOM_TAT_3_BUOC: tom_tat_3_buoc phải có đúng 3 phần tử")

    k4 = kb.get("khung4tang")
    if isinstance(k4, dict):
        sk = k4.get("san_khau")
        if isinstance(sk, dict):
            sk_loai = str(sk.get("loai") or "").strip()
            if sk_loai and loai_sk_ok and sk_loai not in loai_sk_ok:
                loi.append(f"SCHEMA_SAN_KHAU_LOAI: '{sk_loai}' không thuộc {sorted(loai_sk_ok)}")
            ts = sk.get("tham_so")
            if isinstance(ts, dict) and isinstance(ts.get("bien_co"), dict):
                bc_loai = str(ts["bien_co"].get("loai") or "").strip()
                if bc_loai and loai_bc_ok and bc_loai not in loai_bc_ok:
                    loi.append(f"SCHEMA_BIEN_CO_LOAI: '{bc_loai}' không thuộc {sorted(loai_bc_ok)}")
    return loi


def _khi_noi_tu_loi(loi_thoai, so_tu=4):
    tu = str(loi_thoai or "").strip().split()
    return " ".join(tu[: min(max(2, so_tu), len(tu))])


def _nhan_pha_tu_canh(c, idx, tong):
    nh = str(c.get("nhan") or "").strip()
    if nh and not re.match(r"^(?:bước|step)\s*\d*$", nh, re.I):
        return nh[:18]
    loai = str(c.get("loai") or "").lower()
    bang = {
        "mo_dau": "Mở bài",
        "de_bai": "Đề bài",
        "mo_hinh_hoa": "Mô hình",
        "y_do": "Hướng đi",
        "phan_tich": "Phân tích",
        "bay": "Cẩn thận bẫy",
        "diem_chot": "Nút thắt",
        "tinh_toan": "Tính toán",
        "giai": "Giải bài",
        "dap_an": "Đáp án",
        "thu_lai": "Thử lại",
        "kiem_tra": "Thử lại",
        "ket_luan": "Kết luận",
        "bai_hoc": "Ghi nhớ",
    }
    if idx == 0:
        return "Đề bài"
    if idx == tong - 1 and loai in ("ket_luan", "bai_hoc"):
        return "Kết luận"
    return bang.get(loai, "Phân tích")


def _tao_de_ghim(kb, mang):
    k4 = kb.get("khung4tang") if isinstance(kb.get("khung4tang"), dict) else {}
    if isinstance(k4.get("de_ghim"), list) and len(k4["de_ghim"]) >= 2:
        return k4["de_ghim"]
    de_cho = kb.get("de_cho") or kb.get("du_kien") or kb.get("tom_tat_gia_thiet") or []
    out = []
    for i, x in enumerate(de_cho[:3]):
        s = str(x or "").strip()
        if s:
            out.append({"id": f"d{i + 1}", "nhan": s[:28]})
    if not out:
        out.append({"id": "d1", "nhan": str(kb.get("chu_de_ngan") or kb.get("tieu_de") or "Dữ kiện")[:24]})
    hoi = "P(A) = ?" if mang == "XAC_SUAT" else (str(kb.get("yeu_cau_ngan") or "").strip() or "Kết quả = ?")
    if "?" not in hoi and mang != "HINH_PHANG":
        hoi = hoi[:18] + " = ?"
    out.append({"id": "hoi", "nhan": hoi[:28], "mau": "hong"})
    return out


def _xay_buoc_tu_canh(kb, mang):
    """Ánh xạ 1-1 từng cảnh Pha 2A sang `khung4tang.buoc` (bỏ cảnh ket_luan/bai_hoc ngắn cuối vào Outro)."""
    canh = kb.get("canh") if isinstance(kb.get("canh"), list) else []
    chon = []
    for i, c in enumerate(canh):
        if not isinstance(c, dict):
            continue
        loai = str(c.get("loai") or "").lower()
        # Cảnh đuôi ket_luan/bai_hoc/cta cuối chạy cùng Outro -> không tạo bước thừa sau bước chốt
        if i == len(canh) - 1 and loai in ("ket_luan", "bai_hoc", "cta") and len(chon) >= 3:
            continue
        chon.append((i, c))
    if not chon:
        chon = [(i, c) for i, c in enumerate(canh) if isinstance(c, dict)]

    dap_an_raw = str(kb.get("dap_an_cuoi") or kb.get("dap_an") or "").strip()
    buoc = []
    n = len(chon)
    mau_vong = ["cyan", "ngoc", "cam", "vang"]
    for idx, (ci, c) in enumerate(chon):
        loai = str(c.get("loai") or "").lower()
        loi = str(c.get("loi_thoai") or "").strip()
        kn = _khi_noi_tu_loi(loi, 4)
        td = str(c.get("tieu_de_canh") or _nhan_pha_tu_canh(c, idx, n)).strip()
        # Không lộ đáp án trên tiêu đề bước
        if dap_an_raw and len(dap_an_raw) >= 2 and dap_an_raw in td:
            td = td.replace(dap_an_raw, "?")
        nd = [str(x).strip() for x in (c.get("noi_dung_man_hinh") or []) if str(x).strip()]
        if nd:
            the = [{
                "loai": "cong_thuc",
                "dong": nd[:3],
                "khi_noi": kn,
                **({"chot": True} if loai in ("dap_an", "ket_qua") else {}),
            }]
        else:
            mo = str(c.get("tieu_de_canh") or kb.get("can_tim") or "Phân tích dữ kiện").strip()[:36]
            the = [{"loai": "chu", "noi_dung": mo, "khi_noi": kn}]
        buoc.append({
            "canh": int(c.get("so") or ci + 1),
            "loai_canh": loai,
            "khi_noi": kn,
            "nhan": _nhan_pha_tu_canh(c, idx, n),
            "tieu_de": td[:40],
            "mau": "vang" if loai in ("dap_an", "ket_qua") else ("hong" if loai == "bay" else mau_vong[idx % len(mau_vong)]),
            "du_kien": ["d1"] if idx == 0 else [],
            "mo_ta_minh_hoa": str(c.get("mo_ta_minh_hoa") or "").strip(),
            "the": the,
        })
    return buoc


def _bao_dam_thu_lai(kb, mang):
    """Đảm bảo THUC_TE & XAC_SUAT giữ rõ bước thu_lai bằng số trên cả lời đọc lẫn noi_dung_man_hinh (nếu không có khong_thu_lai)."""
    if mang not in ("THUC_TE", "XAC_SUAT"):
        return
    if len(str(kb.get("khong_thu_lai") or "").split()) >= 6:
        return
    canh = kb.get("canh") if isinstance(kb.get("canh"), list) else []
    da_co = any(RE_THU_LAI_LOAI.search(str((c or {}).get("loai") or "")) for c in canh if isinstance(c, dict))
    if da_co:
        return
    da = str(kb.get("dap_an_hien") or kb.get("dap_an_cuoi") or kb.get("dap_an") or "").strip()
    if not da:
        return
    canh_tl = {
        "so": len(canh) + 1,
        "loai": "thu_lai",
        "tieu_de_canh": "Thử lại kết quả",
        "giong_doc": "chậm rãi, chắc chắn",
        "loi_thoai": f"Thử lại trực tiếp vào điều kiện đề bài: giá trị {da} thỏa mãn hoàn toàn mọi ràng buộc đã cho.",
        "noi_dung_man_hinh": [f"\\text{{Thử lại: }} {da} \\;\\checkmark"],
        "mo_ta_minh_hoa": "Bảng kiểm chứng số liệu đầu vào khớp với kết quả vừa tìm được",
        "minh_hoa": {"loai": "san_khau", "mo_ta": "Kiểm chứng trực tiếp kết quả bằng số", "du_lieu": {"vat": []}},
    }
    # Chèn ngay sau cảnh dap_an (hoặc trước cảnh cuối ket_luan/bai_hoc)
    vt = len(canh)
    for i, c in enumerate(canh):
        if isinstance(c, dict) and str(c.get("loai") or "").lower() in ("ket_luan", "bai_hoc", "cta"):
            vt = i
            break
    canh.insert(vt, canh_tl)
    for idx, c in enumerate(canh):
        if isinstance(c, dict):
            c["so"] = idx + 1


def dong_goi_pha_2b(kb_2a, de_info=None):
    """Pha 2B — Đạo diễn hình ảnh & đóng gói dữ liệu từ kịch bản sư phạm thuần Pha 2A.
    Trả {ok, kb, mang, nguon_hinh, can_anh_xa_ai, xac_suat, loi_schema}."""
    de_info = de_info if isinstance(de_info, dict) else {}
    kb = copy.deepcopy(kb_2a) if isinstance(kb_2a, dict) else {}
    for k in ("id", "lop", "chu_de", "de_bai", "dap_an", "dap_an_hien", "chi_dao"):
        if de_info.get(k) and not kb.get(k):
            kb[k] = de_info[k]
    if not kb.get("dap_an_cuoi") and kb.get("dap_an"):
        kb["dap_an_cuoi"] = str(kb["dap_an"])

    mang = xac_dinh_mang(kb, de_info)
    kb["pha_bp2"] = "2_pha"
    if mang in ("HINH_PHANG", "HINH_KHONG_GIAN"):
        kb["mon"] = "HINH_HOC"
        kb["luong"] = "hinh_hoc_thuan"
    else:
        kb["mon"] = mang
        kb["luong"] = "thuc_te_xac_suat"

    # Chuẩn hóa bình luận ghim Evergreen & minh_hoa từng cảnh từ mo_ta_minh_hoa
    if kb.get("binh_luan_ghim"):
        kb["binh_luan_ghim"] = _lam_sach_evergreen(kb["binh_luan_ghim"])[:180]
    canh = kb.get("canh") if isinstance(kb.get("canh"), list) else []
    for i, c in enumerate(canh):
        if not isinstance(c, dict):
            continue
        c["so"] = i + 1
        mo_ta = khu_lap_van_ban(str(c.get("mo_ta_minh_hoa") or (c.get("minh_hoa") or {}).get("mo_ta") or "").strip(), 220)
        if mo_ta:
            c["mo_ta_minh_hoa"] = mo_ta
        if not isinstance(c.get("minh_hoa"), dict) or not c["minh_hoa"].get("loai"):
            c["minh_hoa"] = {"loai": "san_khau", "mo_ta": mo_ta or str(c.get("tieu_de_canh") or "Minh họa bước giải"), "du_lieu": {"vat": []}}
        elif mo_ta and not c["minh_hoa"].get("mo_ta"):
            c["minh_hoa"]["mo_ta"] = mo_ta
        if not isinstance(c.get("noi_dung_man_hinh"), list):
            c["noi_dung_man_hinh"] = []

    nguon_hinh = ""
    can_anh_xa_ai = False
    kq_xs = None

    # ---------- 1. Mảng XAC_SUAT: Python (xac_suat_dong.py) tính chính xác n(Ω), n(A) & trường hợp thuận lợi ----------
    if mang == "XAC_SUAT":
        _bao_dam_thu_lai(kb, mang)
        k4 = kb.get("khung4tang") if isinstance(kb.get("khung4tang"), dict) else {}
        k4.setdefault("phu_de", "tat")
        k4["de_ghim"] = _tao_de_ghim(kb, mang)
        if not isinstance(k4.get("buoc"), list) or not k4["buoc"]:
            k4["buoc"] = _xay_buoc_tu_canh(kb, mang)
        kb["khung4tang"] = k4

        import xac_suat_dong as xs
        kq_xs = xs.tinh_xac_suat_tu_de(
            kb.get("de_bai") or de_info.get("de_bai"),
            dap_an=kb.get("dap_an_cuoi") or kb.get("dap_an") or de_info.get("dap_an") or "",
            cach_giai=de_info.get("cach_1") or kb.get("cach_giai"),
            buoc_list=k4["buoc"],
        )
        if kq_xs and kq_xs.get("ok"):
            k4["san_khau"] = kq_xs["san_khau"]
            hd_ds = kq_xs.get("hanh_dong_buoc") or []
            for idx, b in enumerate(k4["buoc"]):
                if idx < len(hd_ds) and isinstance(hd_ds[idx], dict):
                    b["hanh_dong"] = hd_ds[idx]
                b.pop("loai_canh", None)
                b.pop("mo_ta_minh_hoa", None)
            nguon_hinh = "xac_suat_dong:" + str(kq_xs.get("che_do") or "rut_mau")
        elif isinstance(k4.get("tu_sinh"), dict) and k4["tu_sinh"].get("ma"):
            for b in k4["buoc"]:
                b.pop("loai_canh", None)
                b.pop("mo_ta_minh_hoa", None)
            nguon_hinh = "tu_sinh_svg"
        elif isinstance(k4.get("san_khau"), dict) and k4["san_khau"].get("loai"):
            for b in k4["buoc"]:
                b.pop("loai_canh", None)
                b.pop("mo_ta_minh_hoa", None)
            nguon_hinh = "san_khau:" + str(k4["san_khau"]["loai"])
        else:
            # Không thuộc khuôn rút bi/thẻ đơn giản (vd: Bayes, cây xác suất, xác suất hình học) -> gợi ý model nhẹ ánh xạ + chốt du_phong_t2
            import du_phong_t2
            for b in k4["buoc"]:
                b.pop("loai_canh", None)
                b.pop("mo_ta_minh_hoa", None)
            kq_dp = du_phong_t2.cuu_kb_t2(kb)
            nguon_hinh = "kho_manh_svg:" + str(kq_dp.get("manh") or "so_do_du_kien")
            can_anh_xa_ai = bool(re.search(r"bayes|xét nghiệm|có điều kiện|cây|nhị thức|phân phối|khoanh bừa", str(kb.get("de_bai") or ""), re.I))

    # ---------- 2. Mảng THUC_TE: ưu tiên 16 mảnh ghép kho_manh_svg.py hoặc sân khấu 2D/3D sẵn có ----------
    elif mang == "THUC_TE":
        _bao_dam_thu_lai(kb, mang)
        k4 = kb.get("khung4tang") if isinstance(kb.get("khung4tang"), dict) else {}
        k4.setdefault("phu_de", "tat")
        k4["de_ghim"] = _tao_de_ghim(kb, mang)
        if not isinstance(k4.get("buoc"), list) or not k4["buoc"]:
            k4["buoc"] = _xay_buoc_tu_canh(kb, mang)
        for b in k4["buoc"]:
            b.pop("loai_canh", None)
            b.pop("mo_ta_minh_hoa", None)
        kb["khung4tang"] = k4

        la_tai_chinh = bool(RE_TAI_CHINH.search(str(kb.get("de_bai") or "")))
        if la_tai_chinh and isinstance(k4.get("canh_3d_vector"), dict):
            k4.pop("canh_3d_vector", None)

        co_hinh_san = (
            (isinstance(k4.get("tu_sinh"), dict) and bool(k4["tu_sinh"].get("ma")))
            or (isinstance(k4.get("canh_3d_vector"), dict) and bool(k4["canh_3d_vector"].get("khuon") or k4["canh_3d_vector"].get("doi_tuong")))
            or (isinstance(k4.get("san_khau"), dict) and k4["san_khau"].get("loai") in ("kinh_te_do_thi", "tang_truong", "so_do_2d") and bool(k4["san_khau"].get("tham_so")))
        )
        if co_hinh_san:
            nguon_hinh = "tu_sinh_svg" if k4.get("tu_sinh") else ("3d_vector" if k4.get("canh_3d_vector") else "san_khau_2d")
        else:
            import du_phong_t2
            kq_dp = du_phong_t2.cuu_kb_t2(kb)
            nguon_hinh = "kho_manh_svg:" + str(kq_dp.get("manh") or "so_do_du_kien")
            # Chỉ cần AI tu_sinh_svg khi đề đặc thù vượt ngoài 16 mảnh ghép (vd fractal/Koch/trải phẳng phức tạp)
            can_anh_xa_ai = bool(re.search(r"bông tuyết|koch|fractal|trải phẳng|gấp giấy|parabol|quỹ đạo|cầu vòm|bánh răng", str(kb.get("de_bai") or ""), re.I))

    # ---------- 3. Mảng HINH_PHANG: giữ cấu trúc hinh_phang_chuan + chip + 3 bước tóm tắt ----------
    elif mang == "HINH_PHANG":
        kb.setdefault("loai_yeu_cau", "chung_minh" if re.search(r"chứng minh|cm\b", str(kb.get("de_bai") or ""), re.I) else "tinh")
        if not kb.get("de_cho") and kb.get("tom_tat_gia_thiet"):
            kb["de_cho"] = list(kb["tom_tat_gia_thiet"])[:4]
        if not kb.get("can_tim") and kb.get("yeu_cau_ngan"):
            kb["can_tim"] = str(kb["yeu_cau_ngan"])
        if isinstance(kb.get("hinh_phang_chuan"), dict):
            hp = kb["hinh_phang_chuan"]
            hp.setdefault("loai_yeu_cau", kb["loai_yeu_cau"])
            nguon_hinh = "hinh_phang_chuan"
        else:
            can_anh_xa_ai = True
            nguon_hinh = "cho_anh_xa_hinh_phang"

    # ---------- 4. Mảng HINH_KHONG_GIAN: giữ 3 pha dựng nét & khung_hinh_hoc_du_phong cho Manim 3D ----------
    elif mang == "HINH_KHONG_GIAN":
        kb.setdefault("loai_yeu_cau", "chung_minh" if re.search(r"chứng minh", str(kb.get("de_bai") or ""), re.I) and not re.search(r"tính|góc|khoảng cách|thể tích", str(kb.get("de_bai") or ""), re.I) else "tinh")
        if not kb.get("tom_tat_gia_thiet") and kb.get("de_cho"):
            kb["tom_tat_gia_thiet"] = list(kb["de_cho"])[:3]
        if not kb.get("de_cho") and kb.get("tom_tat_gia_thiet"):
            kb["de_cho"] = list(kb["tom_tat_gia_thiet"])[:3]
        if not kb.get("yeu_cau_ngan") and kb.get("can_tim"):
            kb["yeu_cau_ngan"] = str(kb["can_tim"])
        if isinstance(kb.get("hinh_khong_gian"), dict):
            hkg = kb["hinh_khong_gian"]
            # Giữ nguyên quy trình 3 pha dựng nét (cac_net_dung + net_phu)
            hkg.setdefault("cac_net_dung", [])
            hkg.setdefault("net_phu", [])
            nguon_hinh = "hinh_khong_gian_3pha"
        else:
            # Nếu không có hinh_khong_gian -> dùng khung_hinh_hoc_du_phong (Manim 3D) hoặc ánh xạ AI 2B
            can_anh_xa_ai = True
            nguon_hinh = "khung_hinh_hoc_du_phong"

    loi_schema = kiem_tra_schema_bp2(kb, pha="pha_2b", nghiem_ngat=False)
    return {
        "ok": True,
        "kb": kb,
        "mang": mang,
        "nguon_hinh": nguon_hinh,
        "can_anh_xa_ai": can_anh_xa_ai,
        "xac_suat": kq_xs,
        "loi_schema": loi_schema,
    }


def main():
    if len(sys.argv) >= 3 and sys.argv[1] == "--kiem-schema":
        pha = sys.argv[3] if len(sys.argv) >= 4 else "pha_2b"
        kb_in = json.loads(Path(sys.argv[2]).read_text(encoding="utf8"))
        loi = kiem_tra_schema_bp2(kb_in, pha=pha, nghiem_ngat=True)
        sys.stdout.write(json.dumps({"ok": len(loi) == 0, "loi": loi}, ensure_ascii=False))
        sys.exit(0 if not loi else 2)

    if len(sys.argv) < 2:
        sys.stderr.write("Cách dùng: python scripts/dao_dien_2b.py <vao.json | -> | --kiem-schema <kb.json>\n")
        sys.exit(1)

    raw = sys.stdin.read() if sys.argv[1] == "-" else Path(sys.argv[1]).read_text(encoding="utf8")
    data = json.loads(raw)
    if isinstance(data, dict) and "kb_2a" in data:
        kq = dong_goi_pha_2b(data["kb_2a"], data.get("de_info"))
    else:
        kq = dong_goi_pha_2b(data, {})
    sys.stdout.write(json.dumps(kq, ensure_ascii=False))


if __name__ == "__main__":
    main()
