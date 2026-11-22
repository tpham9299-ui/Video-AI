#!/usr/bin/env python3
"""giai_hinh_phang.py - LỚP 2 (v94): BỘ GIẢI TỌA ĐỘ + TỐI ƯU HÌNH ĐẸP + KIỂM CHỨNG GDPT 2018 cho kb.hinh_phang_chuan.

Cách dùng:
    python scripts/giai_hinh_phang.py kich_ban.json [--ra out/hinh_phang_giai.json]
    python scripts/giai_hinh_phang.py - --chi-kiem < kich_ban.json        # BP2 (chay_bp1.js) kiểm nhanh, in JSON ra stdout
Mã thoát: 0 đạt; 2 có lỗi cứng (HP_*); 3 kịch bản không có hinh_phang_chuan.

Chuỗi xử lý: GDPT 2018 -> lấy mẫu ~48 cấu hình -> kiểm chứng mọi mệnh đề trên MỌI cấu hình -> chọn cấu hình đẹp nhất ->
khóa màu + đồng bộ cạnh -> co vừa 82% vùng hình -> đặt nhãn (danh sách trắng) -> JSON cho scripts/manim/HinhPhangChuan.py.
"""
import json
import math
import os
import re
import sys
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hinh_phang import bo_cuc, gdpt2018, kiem_chung  # noqa: E402
from hinh_phang.hinh import LoiDung, chuan_ten, kc, khoa_duong_tron, tach_diem, tam_ngoai_tiep, TEN_DIEM  # noqa: E402

PHIEN_BAN = 1


def _loi(ma, chi_tiet, goi_y="", nguon=""):
    return {"ma": ma, "chi_tiet": chi_tiet, "goi_y": goi_y, "nguon": nguon}


GOI_Y_DUNG = {
    "HP_DUNG_LOI": "Kiểm lại phép dựng: đúng tên điểm, đúng thứ tự (điểm phải được dựng trước khi dùng), giao điểm chọn đúng nghiệm (khac/gan), điều kiện đề (nhọn, AB<AC...) khai báo trong dieu_kien.",
    "HP_DIEM_KHONG_TON_TAI": "Mọi điểm nhắc trong chứng minh phải có trong phep_dung (thêm trung_diem / giao_diem / chan_duong_cao... đúng thứ tự đề).",
}


def ten_trong_tex(s):
    s = kiem_chung.bo_macro(s)
    s = re.sub(r"\\[A-Za-z]+", " ", s)
    return {chuan_ten(x) for x in re.findall(TEN_DIEM, s)}


def menh_de_cua(hp):
    """[(nguồn, mệnh đề)] gồm mục tiêu + khai báo từng dòng + đọc từ LaTeX (trừ dòng kiem=false)."""
    ds = []
    mt = hp.get("muc_tieu") if isinstance(hp.get("muc_tieu"), dict) else {}
    for md in (mt.get("menh_de") if isinstance(mt.get("menh_de"), list) else [mt.get("menh_de")] if mt.get("menh_de") else []):
        if isinstance(md, dict):
            ds.append(("mục tiêu", md))
    if mt.get("tex"):
        ds += [("mục tiêu (chữ)", m) for m in kiem_chung.menh_de_tu_tex(mt["tex"])]
    for ti, t in enumerate(hp.get("trang_chung_minh") or []):
        for di, d in enumerate(t.get("dong") or []):
            if not isinstance(d, dict) or d.get("kiem") is False:
                continue
            ng = "trang %d dòng %d" % (ti + 1, di + 1)
            for md in d.get("menh_de") or []:
                if isinstance(md, dict):
                    ds.append((ng, md))
            ds += [(ng + " (chữ)", m) for m in kiem_chung.menh_de_tu_tex(d.get("tex"))]
    return ds


def kiem_menh_de_moi_mau(ds_md, mau):
    loi, bang = [], []
    for ng, md in ds_md:
        sai, lech_max, ghi, loi_d, so_duoc = 0, 0.0, "", None, False
        for _, Hd in mau:
            try:
                ok, lech, g = kiem_chung.kiem_menh_de(md, Hd)
                so_duoc = so_duoc or g != "khong_so"
            except LoiDung as e:
                loi_d = e
                break
            except (ZeroDivisionError, ValueError, KeyError, TypeError) as e:
                loi_d = LoiDung("HP_DUNG_LOI", "mệnh đề không đọc được: %s" % e)
                break
            if not ok:
                sai += 1
                if lech >= lech_max:
                    lech_max, ghi = lech, g
        mo_ta = kiem_chung.mo_ta_menh_de(md)
        if not loi_d and not so_duoc:
            continue          # đẳng thức trong chữ không có 2 vế hình học so được -> không tính
        if loi_d:
            if md.get("nguon") == "tex" and loi_d.ma != "HP_DIEM_KHONG_TON_TAI":
                continue
            loi.append(_loi(loi_d.ma, "%s: %s (%s)" % (ng, loi_d.chi_tiet, mo_ta), GOI_Y_DUNG.get(loi_d.ma, ""), ng))
            continue
        bang.append({"nguon": ng, "menh_de": mo_ta, "dat": sai == 0, "sai_o": sai, "so_mau": len(mau), "lech": round(lech_max, 6)})
        if sai:
            if md.get("loai") == "dong_dang":
                dung = kiem_chung.thu_tu_dung(md, mau[0][1])
                if dung:
                    loi.append(_loi("HP_DONG_DANG_SAI_THU_TU", "%s: △%s ∼ △%s sai thứ tự đỉnh" % (ng, md["tg1"], md["tg2"]),
                                    "Viết đúng thứ tự đỉnh tương ứng: △%s ∼ △%s (đỉnh cùng vị trí có góc bằng nhau)." % (md["tg1"], dung), ng))
                    continue
            loi.append(_loi("HP_MENH_DE_SAI", "%s: '%s' sai trên %d/%d cấu hình thỏa đề (%s)" % (ng, mo_ta, sai, len(mau), ghi),
                            "Mệnh đề không đúng với hình của đề: kiểm lại tên điểm/góc, thứ tự đỉnh, hoặc giả thiết còn thiếu trong dieu_kien.", ng))
    return loi, bang


def giai(kb, hat=None, chi_kiem=False):
    hp = kb.get("hinh_phang_chuan") if isinstance(kb, dict) else None
    if not isinstance(hp, dict):
        return None
    kq = {"phien_ban": PHIEN_BAN, "loi": [], "canh_bao": [], "sua": []}
    cap = gdpt2018.chuan_cap_lop(hp.get("cap_lop"), kb.get("lop"))
    kq["cap_lop"] = cap
    pd = [b for b in (hp.get("phep_dung") or []) if isinstance(b, dict)]
    for i, b in enumerate(pd):
        b.setdefault("id", "d%d" % (i + 1))
    dk = [x for x in (hp.get("dieu_kien") or []) if isinstance(x, dict)]
    if not pd:
        kq["loi"].append(_loi("HP_DUNG_LOI", "hinh_phang_chuan thiếu phep_dung", GOI_Y_DUNG["HP_DUNG_LOI"]))
    # 1) GDPT 2018
    cung, cb = gdpt2018.kiem_gdpt(kb, cap)
    for x in cung:
        kq["loi"].append(_loi("HP_VUOT_CHUONG_TRINH", "%s: dùng '%s' (%s) - ngoài chương trình %s" % (x["nguon"], x["cum"], x["ten"], cap), x["goi_y"], x["nguon"]))
    for x in cb:
        kq["canh_bao"].append(_loi("HP_CHUONG_TRINH_CANH_BAO", "%s: '%s' (%s)" % (x["nguon"], x["cum"], x["ten"]), x["goi_y"], x["nguon"]))
    # 2) trang chứng minh
    trang, cb2 = kiem_chung.chuan_trang(hp.get("trang_chung_minh"))
    kq["canh_bao"] += cb2
    if not trang:
        kq["loi"].append(_loi("HP_DUNG_LOI", "hinh_phang_chuan thiếu trang_chung_minh (mỗi trang ≤ 5 dòng có tex + khi_noi)"))
    if not pd:
        return kq
    # 3) lấy mẫu cấu hình
    hat = zlib.crc32(str(kb.get("id") or kb.get("de_bai") or "hinh").encode("utf8")) if hat is None else hat
    try:
        mau = bo_cuc.lay_mau(pd, dk, hat=hat)
    except LoiDung as e:
        kq["loi"].append(_loi(e.ma, "phép dựng %s: %s" % (e.id_buoc or "?", e.chi_tiet), GOI_Y_DUNG.get(e.ma, ""), e.id_buoc))
        return kq
    kq["so_mau"] = len(mau)
    # 4) kiểm chứng toán học trên MỌI cấu hình
    hp_kiem = dict(hp, trang_chung_minh=trang)
    loi_md, bang = kiem_menh_de_moi_mau(menh_de_cua(hp_kiem), mau)
    kq["loi"] += loi_md
    kq["menh_de"] = bang
    # 5) chọn cấu hình đẹp nhất
    goc_to = [h.get("goc") for t in trang for d in t["dong"] for h in (d.get("hanh_dong_hinh") or []) if isinstance(h, dict) and h.get("loai") == "to_goc"]
    diem_tot, chon, chi_tiet = -1e18, None, None
    for th, Hd in mau:
        s, ct = bo_cuc.cham_diem(Hd, goc_to)
        if s > diem_tot:
            diem_tot, chon, chi_tiet = s, (th, Hd), ct
    th, Hd = chon
    # 6) khóa màu + đồng bộ cạnh
    kq["sua"] += kiem_chung.khoa_mau(trang, set(Hd.C))
    them, thieu = kiem_chung.dong_bo_canh(trang, Hd)
    if them:
        kq["sua"].append({"ma": "HP_CANH_TU_THEM", "chi_tiet": "tự bổ sung nét: " + ", ".join(them[:12])})
    for x in thieu:
        kq["loi"].append(_loi("HP_DIEM_KHONG_TON_TAI", "chứng minh nhắc điểm %s nhưng phép dựng không có" % x, GOI_Y_DUNG["HP_DIEM_KHONG_TON_TAI"]))
    if chi_kiem:
        kq["dat"] = not kq["loi"]
        return kq
    # 7) co vừa khung
    P, C, s, bc = bo_cuc.vua_khung(Hd)
    # 8) danh sách trắng nhãn
    chu = [x.get("tex", "") for x in (hp.get("de_rut_gon") or []) if isinstance(x, dict)]
    chu += [str(x) for x in (hp.get("de_rut_gon") or []) if isinstance(x, str)]
    chu.append(str((hp.get("muc_tieu") or {}).get("tex") or ""))
    chu += [d.get("tex", "") for t in trang for d in t["dong"]]
    trang_ten = set().union(*[ten_trong_tex(x) for x in chu]) if chu else set()
    an = {chuan_ten(b.get("ten")) for b in pd if b.get("an_nhan")}
    hien = [t for t in P if (t in trang_ten or any(t in tach_diem("".join(b.get("dinh") or []) if isinstance(b.get("dinh"), list) else b.get("dinh") or "") for b in pd)) and t not in an]
    # 9) hình học cho hành động trên hình (đường tròn phụ) + nét cuối cùng để né khi đặt nhãn
    doan_cuoi = list(Hd.doan_da_ve()) + [tuple(x) for t in trang for d in t["dong"] for x in d.get("bo_sung") or []]
    tron_ve = [n["khoa"] for n in Hd.net if n["loai"] == "tron"]
    C_phu = {}
    for t in trang:
        for d in t["dong"]:
            for h in d.get("hanh_dong_hinh") or []:
                if h.get("loai") != "duong_tron_phu":
                    continue
                tr = None
                if h.get("duong_kinh"):
                    a, b2 = tach_diem(h["duong_kinh"])[:2]
                    if a in P and b2 in P:
                        tr = ((P[a][0] + P[b2][0]) / 2, (P[a][1] + P[b2][1]) / 2, kc(P[a], P[b2]) / 2)
                elif h.get("qua"):
                    ds = tach_diem("".join(h["qua"]) if isinstance(h["qua"], list) else h["qua"])
                    if len(ds) >= 3 and all(x in P for x in ds):
                        o = tam_ngoai_tiep(P[ds[0]], P[ds[1]], P[ds[2]])
                        tr = (o[0], o[1], kc(o, P[ds[0]]))
                elif h.get("khoa") or h.get("tam"):
                    k = khoa_duong_tron(h.get("khoa") or h.get("tam"))
                    tr = C.get(k)
                if tr:
                    h["_tron"] = [round(tr[0], 4), round(tr[1], 4), round(tr[2], 4)]
                    C_phu["phu%d" % len(C_phu)] = tr
                else:
                    kq["canh_bao"].append(_loi("HP_DUNG_LOI", "đường tròn phụ không xác định được: %s" % json.dumps(h, ensure_ascii=False)))
    cung_goc = []
    for t in trang:
        for d in t["dong"]:
            for h in d.get("hanh_dong_hinh") or []:
                if h.get("loai") in ("to_goc", "ky_hieu_vuong", "ket_luan") and len(tach_diem(h.get("goc"))) == 3:
                    a, o, b2 = tach_diem(h["goc"])
                    cung_goc.append((o, a, b2))
    tam_chinh = None
    for n in Hd.net:
        if n["loai"] == "tron":
            tam_chinh = C[n["khoa"]]
            break
    nhan, va_cham = bo_cuc.dat_nhan(P, dict(C, **C_phu), doan_cuoi, tron_ve + list(C_phu), hien, cung_goc, tam_chinh)
    ten = list(P)
    min_kc = min((kc(P[a], P[b]) for i, a in enumerate(ten) for b in ten[i + 1:]), default=9)
    bc.update({"min_kc_don_vi": round(min_kc, 3), "va_cham_nhan": va_cham, "diem_so": round(diem_tot, 4), **chi_tiet, "ti_le_co": round(s, 4)})
    if min_kc < 0.32:
        kq["canh_bao"].append(_loi("HP_DIEM_DINH", "hai điểm cách nhau %.2f đơn vị (< 0,32) dù đã tối ưu bố cục" % min_kc))
    if va_cham:
        kq["canh_bao"].append(_loi("HP_NHAN_DE", "%d nhãn chưa tìm được chỗ trống hoàn toàn" % va_cham))
    kq.update({
        "dat": not kq["loi"],
        "tham": th,
        "diem": {k: [round(v[0], 4), round(v[1], 4)] for k, v in P.items()},
        "tron": {k: [round(v[0], 4), round(v[1], 4), round(v[2], 4)] for k, v in C.items()},
        "tam_tron": Hd.C_tam,
        "net": Hd.net,
        "nhan": nhan,
        "diem_an": sorted(set(P) - set(hien)),
        "trang": trang,
        "de_rut_gon": [x if isinstance(x, dict) else {"tex": str(x)} for x in (hp.get("de_rut_gon") or [])],
        "muc_tieu": hp.get("muc_tieu") or {},
        "phep_dung": pd,
        "header": {"nhan_lop": str(hp.get("nhan_lop") or {"lop_8": "TOÁN 8", "lop_9": "TOÁN 9"}.get(cap, "TOÁN THPT")),
                   "chuyen_muc": str(hp.get("chuyen_muc") or "HÌNH HỌC"),
                   "phu_de": str(hp.get("phu_de") or ("Ôn thi Tuyển sinh 10" if cap == "lop_9" else "Hình học phẳng"))},
        "bo_cuc": bc,
        "ti_le_that": Hd.ti_le,
    })
    return kq


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("kich_ban", help="kich_ban.json hoặc - (stdin)")
    ap.add_argument("--ra", default="")
    ap.add_argument("--chi-kiem", action="store_true")
    ap.add_argument("--hat", type=int, default=None)
    a = ap.parse_args()
    if a.kich_ban == "-":
        kb = json.loads(sys.stdin.buffer.read().decode("utf8"))
    else:
        with open(a.kich_ban, encoding="utf8") as f:
            kb = json.load(f)
    kq = giai(kb, hat=a.hat, chi_kiem=a.chi_kiem)
    if kq is None:
        print(json.dumps({"dat": True, "bo_qua": "không có hinh_phang_chuan"}, ensure_ascii=False))
        sys.exit(3)
    if a.chi_kiem and a.kich_ban == "-":
        sys.stdout.buffer.write(json.dumps({k: kq.get(k) for k in ("dat", "loi", "canh_bao", "sua", "cap_lop", "so_mau", "menh_de")}, ensure_ascii=False).encode("utf8"))
        sys.exit(0 if kq["dat"] else 2)
    if a.ra:
        os.makedirs(os.path.dirname(os.path.abspath(a.ra)), exist_ok=True)
        with open(a.ra, "w", encoding="utf8") as f:
            json.dump(kq, f, ensure_ascii=False, indent=1)
    print("Hình phẳng chuẩn: cấp %s, %s cấu hình, %d mệnh đề kiểm" % (kq.get("cap_lop"), kq.get("so_mau", 0), len(kq.get("menh_de") or [])))
    for x in kq["loi"]:
        print("LỖI CỨNG [%s] %s%s" % (x["ma"], x["chi_tiet"], (" -> Gợi ý: " + x["goi_y"]) if x.get("goi_y") else ""))
    for x in kq["canh_bao"]:
        print("Cảnh báo [%s] %s" % (x["ma"], x["chi_tiet"]))
    for x in kq["sua"]:
        print("Tự sửa [%s] %s" % (x["ma"], x["chi_tiet"]))
    if kq.get("bo_cuc"):
        print("Bố cục:", json.dumps(kq["bo_cuc"], ensure_ascii=False))
    sys.exit(0 if kq["dat"] else 2)


if __name__ == "__main__":
    main()
