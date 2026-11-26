#!/usr/bin/env python3
"""Hệ thống Tự học 2 tầng cho Video-AI:
  - Tầng 1 (Ngân hàng Kịch bản Vàng — mau_vang/): lưu mẫu kịch bản đạt chuẩn & bốc đúng 1 mẫu cùng chuyên mục làm few-shot.
  - Tầng 2 (Sổ tay bài học cô đặc — bai_hoc_edit.json): nén mọi lỗi Mắt thần / Pre-flight Gate thành tối đa 8 luật/chuyên mục
    theo khuôn `[Tránh] ... -> [Làm thay] ...`, đánh dấu `can_khoa_bang_code: true` khi `so_lan_tai_pham >= 3`,
    và tự động xóa luật quá 14 ngày không tái phạm để prompt không bao giờ phình to.

Cách dùng:
  python -X utf8 scripts/tu_hoc_edit.py --kiem-tra
  python -X utf8 scripts/tu_hoc_edit.py --don
  python -X utf8 scripts/tu_hoc_edit.py --nhap-loi HINH_KHONG_GIAN out/mat_than.json
  python -X utf8 scripts/tu_hoc_edit.py --luu-vang kich_ban.json HINH_PHANG
"""
import argparse
import copy
import datetime
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SO_TAY_MD = os.path.join(ROOT, "bai_hoc_edit.json")
MAU_VANG_MD = os.path.join(ROOT, "mau_vang")
CHUYEN_MUC_HOP_LE = ("HINH_PHANG", "HINH_KHONG_GIAN", "THUC_TE", "XAC_SUAT")
GIOI_HAN_MOI_CM = 8
HAN_DUNG_NGAY = 14
NGUONG_KHOA_CODE = 3

KHUON_LUAT_RE = re.compile(r"^\[Tránh\]\s+.+\s+->\s+\[Làm thay\]\s+.+$")

# Ánh xạ mã lỗi Mắt thần / Pre-flight Gate -> cặp (Tránh, Làm thay) cô đặc
BANG_NEN_LOI = {
    "cat_chu": ("Viết tiêu đề hoặc thẻ quá dài gây cắt chữ mép SAFE_ZONE_TIKTOK", "Rút gọn <= 36 ký tự, tách thành 2 dòng ngắn rõ ý"),
    "chong_chu": ("Dồn quá 3 dòng công thức hoặc nhãn dài đè nhau trên cùng vùng", "Giữ tối đa 2-3 dòng suy luận ngắn mỗi bước và bỏ nhãn thừa"),
    "latex_tho": ("Để sót ngoặc vỡ, $ hoặc lệnh TeX sai làm lộ mã thô trên màn hình", "Dùng KaTeX chuẩn đã cân ngoặc, chữ Việt viết thẳng tách khỏi ký hiệu toán"),
    "ma_tho": ("Lộ mã JSON/TeX/biến kỹ thuật ra giao diện hiển thị", "Chỉ xuất công thức toán chuẩn và văn bản tiếng Việt sạch"),
    "so_cat": ("Để phân số dài hoặc số đo lớn bị cắt mất chữ số cuối", "Dùng \\dfrac ngắn gọn và rút gọn thừa số trung gian"),
    "lo_dap_an": ("Lộ đáp số cuối ở hook, tiêu đề hoặc thẻ đề trước mốc công bố", "Giữ dấu ? cho đại lượng cần tìm cho tới đúng mốc lời chốt đáp án"),
    "t2_trong": ("Để trống Tầng 2 hoặc thiếu đối tượng minh họa theo đề", "Khai báo đủ phép dựng / sân khấu 2D-3D khớp đúng dữ kiện đề"),
    "hinh_dung_im": ("Giữ hình Tầng 2 đứng im nhiều bước liên tiếp", "Thêm bước dựng nét phụ / xoay camera / hành động đổi trạng thái ở mỗi cảnh"),
    "lech_pha": ("Đặt khi_noi/moc_xoay lệch lời thoại khiến hình đi trước tiếng", "Trích nguyên văn cụm 3-5 từ đúng câu mở đầu ý trong loi_thoai"),
    "tu_sinh_hong": ("Viết mã tu_sinh_svg lỗi cú pháp hoặc thiếu nét vẽ", "Kiểm tra đủ đối tượng đề và giới hạn tọa độ trong vùng an toàn"),
    "kg_thieu_gia_thiet": ("Để trống tom_tat_gia_thiet làm mất dòng Cho: ở Tầng 1", "Ghi đủ 2-3 cụm giả thiết ngắn (khối, đáy, vuông góc, số đo) trong tom_tat_gia_thiet"),
}


def hom_nay_str(ngay=None):
    if isinstance(ngay, datetime.date):
        return ngay.isoformat()
    if isinstance(ngay, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", ngay.strip()):
        return ngay.strip()
    return datetime.date.today().isoformat()


def _parse_date(s):
    try:
        return datetime.date.fromisoformat(str(s or "").strip()[:10])
    except ValueError:
        return None


def chuan_hoa_luat(tranh, lam_thay):
    t = re.sub(r"\s+", " ", str(tranh or "").replace("[Tránh]", "")).strip(" .->")
    l = re.sub(r"\s+", " ", str(lam_thay or "").replace("[Làm thay]", "")).strip(" .->")
    return f"[Tránh] {t} -> [Làm thay] {l}"


def nap_so_tay(tep=SO_TAY_MD):
    if os.path.exists(tep):
        with open(tep, encoding="utf8") as f:
            data = json.load(f)
    else:
        data = {}
    data.setdefault("phien_ban", 1)
    data.setdefault("ngay_cap_nhat", hom_nay_str())
    data["gioi_han_moi_chuyen_muc"] = GIOI_HAN_MOI_CM
    data["han_dung_ngay"] = HAN_DUNG_NGAY
    data["nguong_khoa_code"] = NGUONG_KHOA_CODE
    cm = data.setdefault("chuyen_muc", {})
    for k in CHUYEN_MUC_HOP_LE:
        if not isinstance(cm.get(k), list):
            cm[k] = []
    return data


def luu_so_tay(data, tep=SO_TAY_MD):
    os.makedirs(os.path.dirname(os.path.abspath(tep)), exist_ok=True)
    with open(tep, "w", encoding="utf8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def don_han_dung(data, hom_nay=None):
    """Xóa luật quá 14 ngày không tái phạm, giữ tối đa 8 luật/chuyên mục, đánh dấu can_khoa_bang_code khi >= 3 lần."""
    ngay_str = hom_nay_str(hom_nay)
    ref = _parse_date(ngay_str) or datetime.date.today()
    da_xoa = 0
    can_khoa = []
    cm = data.setdefault("chuyen_muc", {})
    for k in CHUYEN_MUC_HOP_LE:
        ds = cm.get(k) if isinstance(cm.get(k), list) else []
        giu = []
        for muc in ds:
            if not isinstance(muc, dict):
                continue
            d = _parse_date(muc.get("ngay_cap_nhat"))
            if d is None or (ref - d).days > HAN_DUNG_NGAY:
                da_xoa += 1
                continue
            so_lan = max(1, int(muc.get("so_lan_tai_pham") or 1))
            muc["so_lan_tai_pham"] = so_lan
            muc["can_khoa_bang_code"] = so_lan >= NGUONG_KHOA_CODE
            if muc["can_khoa_bang_code"]:
                can_khoa.append({"chuyen_muc": k, "ma": muc.get("ma", ""), "luat": muc.get("luat", ""), "so_lan_tai_pham": so_lan})
            giu.append(muc)
        # Ưu tiên giữ luật tái phạm nhiều nhất & mới nhất, tối đa 8 luật / chuyên mục
        giu.sort(key=lambda x: (int(x.get("so_lan_tai_pham") or 1), str(x.get("ngay_cap_nhat") or "")), reverse=True)
        if len(giu) > GIOI_HAN_MOI_CM:
            da_xoa += len(giu) - GIOI_HAN_MOI_CM
            giu = giu[:GIOI_HAN_MOI_CM]
        cm[k] = giu
    data["ngay_cap_nhat"] = ngay_str
    return {"da_xoa": da_xoa, "can_khoa_bang_code": can_khoa}


def ghi_nhan_loi(data, chuyen_muc, ma, tranh, lam_thay, hom_nay=None):
    """Nén 1 lỗi vào sổ tay cô đặc theo khuôn [Tránh] ... -> [Làm thay] ..."""
    cm_key = str(chuyen_muc or "").upper().strip()
    if cm_key not in CHUYEN_MUC_HOP_LE:
        raise ValueError(f"Chuyên mục không hợp lệ: {chuyen_muc}")
    ma_sach = re.sub(r"[^A-Z0-9_]", "_", str(ma or "LOI_CHUNG").upper()).strip("_") or "LOI_CHUNG"
    ngay_str = hom_nay_str(hom_nay)
    luat = chuan_hoa_luat(tranh, lam_thay)
    ds = data.setdefault("chuyen_muc", {}).setdefault(cm_key, [])
    cu = next((x for x in ds if str(x.get("ma") or "").upper() == ma_sach), None)
    if cu:
        cu["luat"] = luat
        cu["so_lan_tai_pham"] = int(cu.get("so_lan_tai_pham") or 1) + 1
        cu["ngay_cap_nhat"] = ngay_str
        cu["can_khoa_bang_code"] = cu["so_lan_tai_pham"] >= NGUONG_KHOA_CODE
    else:
        ds.append({
            "ma": ma_sach,
            "luat": luat,
            "so_lan_tai_pham": 1,
            "ngay_cap_nhat": ngay_str,
            "can_khoa_bang_code": False,
        })
    return don_han_dung(data, ngay_str)


def nen_tu_ket_qua_loi(data, chuyen_muc, ds_loi, hom_nay=None):
    """Nén danh sách lỗi từ Mắt thần / Pre-flight Gate vào bai_hoc_edit.json."""
    kq = {"da_xoa": 0, "can_khoa_bang_code": []}
    for item in ds_loi or []:
        if isinstance(item, dict):
            ma = str(item.get("loai") or item.get("ma") or "LOI_CHUNG").strip()
            mo_ta = str(item.get("mo_ta") or item.get("chi_tiet") or "").strip()
            goi_y = str(item.get("goi_y") or "").strip()
        else:
            raw = str(item or "").strip()
            ma, _, mo_ta = raw.partition(":")
            ma, mo_ta, goi_y = ma.strip(), mo_ta.strip(), ""
        key = ma.lower()
        if key in BANG_NEN_LOI:
            tranh, lam_thay = BANG_NEN_LOI[key]
        else:
            tranh = mo_ta[:110] if mo_ta else f"Tái diễn lỗi {ma}"
            lam_thay = goi_y[:110] if goi_y else "Kiểm tra lại bố cục, công thức KaTeX và mốc đồng bộ trước khi xuất JSON"
        kq = ghi_nhan_loi(data, chuyen_muc, ma, tranh, lam_thay, hom_nay)
    return kq


def boc_mau_vang(chuyen_muc, thu_muc=MAU_VANG_MD):
    """Bốc ĐÚNG 1 mẫu vàng cùng chuyên mục từ mau_vang/index.json để làm few-shot cho BP2."""
    idx_path = os.path.join(thu_muc, "index.json")
    if not os.path.exists(idx_path):
        return None
    with open(idx_path, encoding="utf8") as f:
        idx = json.load(f)
    cm = str(chuyen_muc or "").upper().strip()
    ds = [m for m in (idx.get("mau") or []) if str(m.get("chuyen_muc") or "").upper() == cm]
    if not ds:
        return None
    chon = ds[-1]
    tep = os.path.join(thu_muc, str(chon.get("tep") or ""))
    if not os.path.exists(tep):
        return None
    with open(tep, encoding="utf8") as f:
        noi_dung = json.load(f)
    return {"meta": chon, "mau": noi_dung}


def luu_mau_vang(kb, chuyen_muc, ten="", diem_manh="", thu_muc=MAU_VANG_MD, hom_nay=None):
    """Lưu bản cô đặc của 1 kịch bản đạt chuẩn vào ngân hàng mau_vang/ và cập nhật mau_vang/index.json."""
    cm = str(chuyen_muc or "").upper().strip()
    if cm not in CHUYEN_MUC_HOP_LE:
        raise ValueError(f"Chuyên mục không hợp lệ: {chuyen_muc}")
    os.makedirs(thu_muc, exist_ok=True)
    idx_path = os.path.join(thu_muc, "index.json")
    if os.path.exists(idx_path):
        with open(idx_path, encoding="utf8") as f:
            idx = json.load(f)
    else:
        idx = {"phien_ban": 1, "ngay_cap_nhat": hom_nay_str(hom_nay), "mau": []}
    kb_id = re.sub(r"[^A-Za-z0-9_-]", "_", str(kb.get("id") or f"MV-{cm}")).strip("_")
    slug = f"{cm.lower()}_{kb_id.lower()}.json"
    co_dac = {
        "id": kb_id,
        "chuyen_muc": cm,
        "lop": str(kb.get("lop") or ""),
        "mon": str(kb.get("mon") or ""),
        "luong": str(kb.get("luong") or ""),
        "tieu_de": str(kb.get("tieu_de") or ten or kb_id),
        "hook": str(kb.get("hook") or ""),
        "tom_tat_gia_thiet": list(kb.get("de_cho") or (kb.get("hinh_phang_chuan") or {}).get("tom_tat_gia_thiet") or [])[:3],
        "yeu_cau_ngan": str(kb.get("can_tim") or ""),
        "tom_tat_3_buoc": list(kb.get("tom_tat_3_buoc") or [])[:3],
    }
    with open(os.path.join(thu_muc, slug), "w", encoding="utf8") as f:
        json.dump(co_dac, f, ensure_ascii=False, indent=2)
        f.write("\n")
    ngay = hom_nay_str(hom_nay)
    muc_moi = {
        "id": kb_id,
        "chuyen_muc": cm,
        "ten": ten or co_dac["tieu_de"],
        "tep": slug,
        "ngay_luu": ngay,
        "diem_manh": diem_manh or "Kịch bản đạt chuẩn do chủ kênh đánh dấu /hay",
    }
    ds = [m for m in (idx.get("mau") or []) if m.get("id") != kb_id]
    ds.append(muc_moi)
    idx["mau"] = ds
    idx["ngay_cap_nhat"] = ngay
    with open(idx_path, "w", encoding="utf8") as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return muc_moi


def kiem_tra_tat_ca():
    """Tự kiểm thử toàn bộ hệ thống tự học 2 tầng (--kiem-tra)."""
    dat, hong = 0, []

    def kiem(ten, dk):
        nonlocal dat
        if dk:
            dat += 1
            print(f"  ✓ {ten}")
        else:
            hong.append(ten)
            print(f"  ✗ {ten}")

    print("1. Kiểm tra Tầng 1 — Ngân hàng Kịch bản Vàng (mau_vang/)")
    idx_path = os.path.join(MAU_VANG_MD, "index.json")
    kiem("tồn tại mau_vang/index.json", os.path.exists(idx_path))
    if os.path.exists(idx_path):
        idx = json.load(open(idx_path, encoding="utf8"))
        kiem("index.json có trường mau là mảng >= 2", isinstance(idx.get("mau"), list) and len(idx["mau"]) >= 2)
        hp = boc_mau_vang("HINH_PHANG")
        kg = boc_mau_vang("HINH_KHONG_GIAN")
        kiem("bốc đúng 1 mẫu vàng HINH_PHANG hợp lệ", bool(hp and hp["mau"].get("chuyen_muc") == "HINH_PHANG"))
        kiem("bốc đúng 1 mẫu vàng HINH_KHONG_GIAN chuẩn 3 pha", bool(kg and kg["mau"].get("chuyen_muc") == "HINH_KHONG_GIAN" and "quy_trinh_3_pha" in kg["mau"]))

    print("2. Kiểm tra Tầng 2 — Sổ tay bài học cô đặc (bai_hoc_edit.json)")
    kiem("tồn tại bai_hoc_edit.json", os.path.exists(SO_TAY_MD))
    st = nap_so_tay(SO_TAY_MD)
    kiem("đủ 4 chuyên mục và mỗi chuyên mục <= 8 luật", all(len(st["chuyen_muc"][k]) <= GIOI_HAN_MOI_CM for k in CHUYEN_MUC_HOP_LE))
    tat_ca_luat = [m for k in CHUYEN_MUC_HOP_LE for m in st["chuyen_muc"][k]]
    kiem("mọi luật đúng khuôn [Tránh] ... -> [Làm thay] ...", len(tat_ca_luat) > 0 and all(KHUON_LUAT_RE.match(str(m.get("luat") or "")) for m in tat_ca_luat))
    kiem("mọi luật có so_lan_tai_pham & ngay_cap_nhat hợp lệ", all(isinstance(m.get("so_lan_tai_pham"), int) and _parse_date(m.get("ngay_cap_nhat")) is not None for m in tat_ca_luat))

    print("3. Kiểm tra cơ chế nén <= 8 luật, cờ can_khoa_bang_code >= 3 lần, và hết hạn > 14 ngày")
    tam = copy.deepcopy(st)
    for idx_i in range(12):
        ghi_nhan_loi(tam, "HINH_PHANG", f"TEST_{idx_i}", f"Lỗi giả {idx_i}", f"Cách sửa {idx_i}", hom_nay="2026-11-26")
    kiem("nén giới hạn cứng <= 8 luật / chuyên mục", len(tam["chuyen_muc"]["HINH_PHANG"]) == GIOI_HAN_MOI_CM)

    # Tái phạm 3 lần -> bật can_khoa_bang_code
    ghi_nhan_loi(tam, "HINH_KHONG_GIAN", "LAP_3_LAN", "Lặp tag Intro", "Khử trùng tag trước khi dựng", hom_nay="2026-11-24")
    ghi_nhan_loi(tam, "HINH_KHONG_GIAN", "LAP_3_LAN", "Lặp tag Intro", "Khử trùng tag trước khi dựng", hom_nay="2026-11-25")
    kq3 = ghi_nhan_loi(tam, "HINH_KHONG_GIAN", "LAP_3_LAN", "Lặp tag Intro", "Khử trùng tag trước khi dựng", hom_nay="2026-11-26")
    luat3 = next((x for x in tam["chuyen_muc"]["HINH_KHONG_GIAN"] if x["ma"] == "LAP_3_LAN"), None)
    kiem("tái phạm >= 3 lần tự bật can_khoa_bang_code: true", bool(luat3 and luat3["so_lan_tai_pham"] == 3 and luat3["can_khoa_bang_code"] is True))
    kiem("trả về danh sách luật cần báo Zalo khóa bằng code", any(x["ma"] == "LAP_3_LAN" for x in kq3["can_khoa_bang_code"]))

    # Quá 14 ngày không tái phạm -> tự động xóa
    tam["chuyen_muc"]["THUC_TE"].append({
        "ma": "LUAT_HET_HAN",
        "luat": "[Tránh] Lỗi cũ -> [Làm thay] Cách cũ",
        "so_lan_tai_pham": 2,
        "ngay_cap_nhat": "2026-11-01",
        "can_khoa_bang_code": False,
    })
    kq_don = don_han_dung(tam, hom_nay="2026-11-26")
    kiem("tự động xóa luật quá 14 ngày không tái phạm", kq_don["da_xoa"] >= 1 and all(x["ma"] != "LUAT_HET_HAN" for x in tam["chuyen_muc"]["THUC_TE"]))

    # Kiểm nén trực tiếp từ kết quả lỗi Mắt thần
    kq_mt = nen_tu_ket_qua_loi(tam, "XAC_SUAT", [{"loai": "latex_tho", "mo_ta": "Lộ \\frac"}], hom_nay="2026-11-26")
    luat_mt = next((x for x in tam["chuyen_muc"]["XAC_SUAT"] if x["ma"] == "LATEX_THO"), None)
    kiem("nén lỗi Mắt thần chuẩn khuôn [Tránh] -> [Làm thay]", bool(luat_mt and KHUON_LUAT_RE.match(luat_mt["luat"])))

    print(f"\nKết quả tu_hoc_edit: {dat} đạt, {len(hong)} hỏng")
    return 0 if not hong else 1


def main():
    ap = argparse.ArgumentParser(description="Hệ thống tự học 2 tầng (mau_vang/ + bai_hoc_edit.json)")
    ap.add_argument("--kiem-tra", action="store_true", help="Chạy bộ tự kiểm thử đầy đủ")
    ap.add_argument("--don", action="store_true", help="Dọn luật quá 14 ngày và giới hạn 8 luật/chuyên mục")
    ap.add_argument("--nhap-loi", nargs=2, metavar=("CHUYEN_MUC", "TEP_LOI_JSON"), help="Nén lỗi từ tệp JSON Mắt thần / Pre-flight")
    ap.add_argument("--luu-vang", nargs=2, metavar=("TEP_KB_JSON", "CHUYEN_MUC"), help="Lưu kịch bản đạt chuẩn vào mau_vang/")
    args = ap.parse_args()

    if args.kiem_tra:
        sys.exit(kiem_tra_tat_ca())
    if args.don:
        st = nap_so_tay()
        kq = don_han_dung(st)
        luu_so_tay(st)
        print(json.dumps(kq, ensure_ascii=False))
        return
    if args.nhap_loi:
        cm, tep_loi = args.nhap_loi
        raw = json.load(open(tep_loi, encoding="utf8"))
        ds = raw.get("loi") if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])
        st = nap_so_tay()
        kq = nen_tu_ket_qua_loi(st, cm, ds)
        luu_so_tay(st)
        print(json.dumps(kq, ensure_ascii=False))
        return
    if args.luu_vang:
        tep_kb, cm = args.luu_vang
        kb = json.load(open(tep_kb, encoding="utf8"))
        muc = luu_mau_vang(kb, cm)
        print(json.dumps(muc, ensure_ascii=False))
        return
    ap.print_help()


if __name__ == "__main__":
    main()
