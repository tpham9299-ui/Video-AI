#!/usr/bin/env python3
"""giai_hinh_khong_gian.py - v97: BỘ GIẢI TỌA ĐỘ HÌNH HỌC KHÔNG GIAN cho kb.hinh_khong_gian (AI không đoán tọa độ 3D).

Cách dùng:
    python scripts/giai_hinh_khong_gian.py kich_ban.json [--ra out/hinh_khong_gian_giai.json]
    python scripts/giai_hinh_khong_gian.py - --chi-kiem < kich_ban.json      # BP2 (chay_bp1.js) kiểm nhanh, JSON ra stdout
Mã thoát: 0 đạt; 2 có lỗi cứng (KG_*); 3 kịch bản không có hinh_khong_gian.

Chuỗi xử lý: GDPT 2018 -> dựng khối (tỷ lệ vàng h/a = 1,28 khi đề không cho) -> thử các tỷ lệ "bất kỳ" trong
[0,30; 0,42] ∪ [0,58; 0,70], chọn cấu hình xa điểm nhất -> kiểm MỌI mệnh đề trên mọi cấu hình (kể cả tỷ lệ 0,25 / 0,5 / 0,75)
-> số đo đối chiếu đáp án -> thiết diện + mặt bung + đoạn kéo dài -> JSON cho src/khonggian (Remotion).
"""
import itertools
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hinh_khong_gian.hinh import (LoiDung, TY_LE_VANG, chuan_ten, dung_diem, dung_khoi, kc, mat_bung, mat_qua,  # noqa: E402
                                  tach_ten, thiet_dien, noi)
from hinh_khong_gian import kiem  # noqa: E402

PHIEN_BAN = 1
MAU_KIEM_THEM = [0.25, 0.5, 0.75, 0.15, 0.85]   # mệnh đề với điểm "bất kỳ" phải đúng ở MỌI vị trí


def _loi(ma, chi_tiet, goi_y=""):
    return {"ma": ma, "chi_tiet": chi_tiet, "goi_y": goi_y}


def _dung_tat_ca(khoi, ds_diem, ty_bat_ky):
    """Dựng mọi điểm theo thứ tự với bộ tham số 'bất kỳ' cho trước -> (D, info từng điểm)."""
    D = dict(khoi["diem"])
    info = {}
    k = 0
    for d in ds_diem:
        loai = str(d.get("loai") or "")
        bk = loai in ("tren_canh", "tren_duong") and kiem_bat_ky(d)
        t = ty_bat_ky[k] if bk else None
        if bk:
            k += 1
        ten, X, inf = dung_diem(D, d, t)
        if ten in D:
            raise LoiDung("KG_DUNG_LOI", "điểm %s được dựng hai lần" % ten)
        if d.get("trong_doan") and inf.get("t") is not None and not (-1e-9 <= inf["t"] <= 1 + 1e-9):
            raise LoiDung("KG_DUNG_LOI", "điểm %s nằm ngoài đoạn %s (trong_doan)" % (ten, "".join(inf.get("tren") or [])))
        D[ten] = X
        info[ten] = inf
    return D, info


def kiem_bat_ky(d):
    return _ty(d.get("ty_le")) is None


def _ty(v):
    from hinh_khong_gian.hinh import doc_ty_le
    return doc_ty_le(v)


def _diem_ten(hkg):
    return [d for d in (hkg.get("diem") or []) if isinstance(d, dict)]


def _do_xa(D):
    ten = list(D)
    return min((kc(D[a], D[b]) for a, b in itertools.combinations(ten, 2)), default=1.0)


def giai(kb, chi_kiem=False):
    """Lưới an toàn: đặc tả sai định dạng không được làm crash BP2/BP3 -> trả lỗi cứng KG_DUNG_LOI rõ ràng."""
    try:
        return _giai(kb, chi_kiem=chi_kiem)
    except LoiDung as e:
        return {"dat": False, "loi": [_loi(e.ma, e.chi_tiet, getattr(e, "goi_y", ""))], "canh_bao": []}
    except (ValueError, TypeError, ZeroDivisionError, IndexError, KeyError, AttributeError) as e:
        return {"dat": False, "loi": [_loi("KG_DUNG_LOI", "hinh_khong_gian sai định dạng (%s: %s)" % (type(e).__name__, str(e)[:160]),
                                            "ghi đủ tên điểm đã dựng cho mọi trường (đường 2 điểm, mặt >= 3 điểm, góc 3 điểm)")],
                "canh_bao": []}


def _giai(kb, chi_kiem=False):
    hkg = kb.get("hinh_khong_gian") if isinstance(kb, dict) else None
    if not isinstance(hkg, dict):
        return None
    # v98: động cơ Lego 6 khối (Oxyz lớp 12 / thực tế 3D) — phien_ban 2 hoặc có doi_tuong
    if str(hkg.get("phien_ban") or "") == "2" or isinstance(hkg.get("doi_tuong"), list):
        from hinh_khong_gian.lego import giai_lego
        return giai_lego(kb, chi_kiem=chi_kiem)
    loi, canh_bao = [], []
    for ma, ct, gy in kiem.kiem_gdpt(hkg, kb.get("lop")):
        loi.append(_loi(ma, ct, gy))
    try:
        khoi = dung_khoi(hkg.get("khoi"))
    except LoiDung as e:
        return {"dat": False, "loi": loi + [_loi(e.ma, e.chi_tiet, e.goi_y)], "canh_bao": []}
    a = khoi["a"]
    ds_diem = _diem_ten(hkg)
    so_bk = sum(1 for d in ds_diem if str(d.get("loai") or "") in ("tren_canh", "tren_duong") and _ty(d.get("ty_le")) is None)
    # ---- chọn cấu hình: tỷ lệ vàng cho các điểm "bất kỳ" ----
    ung = list(itertools.islice(itertools.product(TY_LE_VANG, repeat=so_bk), 64)) if so_bk else [()]
    tot, loi_dung = None, None
    hop_le = []
    for bo in ung:
        try:
            D, info = _dung_tat_ca(khoi, ds_diem, bo)
        except LoiDung as e:
            loi_dung = loi_dung or e
            continue
        diem = _do_xa(D)
        hop_le.append((bo, D))
        if tot is None or diem > tot[0] + 1e-9:
            tot = (diem, bo, D, info)
    if tot is None:
        e = loi_dung
        return {"dat": False, "loi": loi + [_loi(e.ma, e.chi_tiet, e.goi_y)], "canh_bao": canh_bao}
    _, bo_chon, D, info = tot
    # ---- mệnh đề: đúng trên MỌI cấu hình hợp lệ (gồm cả các tỷ lệ kiểm thêm) ----
    mau = list(hop_le)
    for t in MAU_KIEM_THEM if so_bk else []:
        try:
            mau.append(((t,) * so_bk, _dung_tat_ca(khoi, ds_diem, (t,) * so_bk)[0]))
        except LoiDung:
            pass
    ds_md = [m for m in (hkg.get("menh_de") or []) if isinstance(m, dict)]
    for b in hkg.get("buoc") or []:
        if isinstance(b, dict):
            ds_md += [m for m in (b.get("menh_de") or []) if isinstance(m, dict)]
    for md in ds_md:
        try:
            sai = [bo for bo, Dm in mau if not kiem.kiem_menh_de(md, Dm)[0]]
        except LoiDung as e:
            loi.append(_loi(e.ma, e.chi_tiet, e.goi_y))
            continue
        if sai:
            loi.append(_loi("KG_MENH_DE_SAI", "mệnh đề %s SAI trên %d/%d cấu hình (vd tỷ lệ %s)" % (
                json.dumps(md, ensure_ascii=False), len(sai), len(mau), ", ".join("%.2f" % x for x in sai[0]) or "cố định"),
                "kiểm lại giả thiết / phép dựng; mệnh đề phải đúng với MỌI vị trí của điểm bất kỳ"))
    # ---- số đo ----
    that = bool((hkg.get("khoi") or {}).get("kich_thuoc")) or khoi["loai"] == "lap_phuong"
    so_do = []
    for dl in [x for x in (hkg.get("so_do") or []) if isinstance(x, dict)]:
        try:
            v = kiem.tinh_so_do(dl, D)
        except LoiDung as e:
            loi.append(_loi(e.ma, e.chi_tiet, e.goi_y))
            continue
        ky = kiem.doc_gia_tri(dl.get("gia_tri"))
        so_do.append({**dl, "may_tinh": round(v, 6)})
        if ky is None:
            continue
        if that and abs(v - ky) > 1e-3 * max(1.0, abs(ky)):
            loi.append(_loi("KG_SAI_SO_DO", "%s: máy tính %.4f, kịch bản ghi %s (= %.4f)" % (dl.get("loai"), v, dl.get("gia_tri"), ky),
                            "kiểm lại phép tính hoặc kich_thuoc của khối (đơn vị a = cạnh AB)"))
        elif not that:
            canh_bao.append("số đo %s không kiểm được (khối chưa ghi kich_thuoc từ đề)" % dl.get("loai"))
    # ---- đối tượng vẽ ----
    ten_dung = [chuan_ten(d.get("ten")) for d in ds_diem]
    for ma, ct, gy in kiem.kiem_hien_dien(D, khoi["dinh"] + ten_dung, a):
        loi.append(_loi(ma, ct, gy))
    S = 2.0 / a   # cạnh AB = 2 đơn vị cảnh
    toa = {t: [round(x * S, 6) for x in p] for t, p in D.items()}
    canh_khoi = {frozenset(c) for c in khoi["canh"]}
    doan, da = [], set()

    def them(x, y, vai, id_=None):
        k = frozenset((x, y))
        if x == y or k in da:
            return
        if k in canh_khoi and vai != "khoi":
            return
        da.add(k)
        doan.append({"id": id_ or x + y, "a": x, "b": y, "vai": vai})
    for x, y in khoi["canh"]:
        them(x, y, "khoi")
    for d in hkg.get("doan") or []:
        try:
            if isinstance(d, dict):
                xy = tach_ten(d.get("doan") or [d.get("a"), d.get("b")])
                vai = str(d.get("vai") or "phu")
            else:
                xy, vai = tach_ten(d), "phu"
            if len(xy) == 2 and all(t in D for t in xy):
                them(xy[0], xy[1], vai if vai in ("phu", "dich", "keo_dai") else "phu", d.get("id") if isinstance(d, dict) else None)
            else:
                loi.append(_loi("KG_DIEM_KHONG_TON_TAI", "đoạn %s nhắc điểm chưa dựng" % json.dumps(d, ensure_ascii=False)))
        except LoiDung as e:
            loi.append(_loi(e.ma, e.chi_tiet, e.goi_y))
    for d in ds_diem:   # đoạn dùng trong phép dựng + phần kéo dài tới giao điểm nằm ngoài đoạn
        ten, l, inf = chuan_ten(d.get("ten")), str(d.get("loai") or ""), info.get(chuan_ten(d.get("ten")), {})
        if l == "giao":
            for s in d.get("duong") or []:
                p = tach_ten(s)
                if len(p) == 2 and all(t in D for t in p):
                    them(p[0], p[1], "phu")
        if l in ("chan_vuong_goc", "hinh_chieu"):
            them(chuan_ten(d.get("tu")), ten, "phu")
        if l == "giao_song_song":
            them(chuan_ten(d.get("qua")), ten, "phu")
        for x, y in kiem.tham_so_ngoai(inf, ten):
            them(x, y, "keo_dai")
    kinh = []
    for m in hkg.get("mat_cat") or []:
        if not isinstance(m, dict):
            continue
        try:
            ds = tach_ten(m.get("mat"))
            if len(ds) < 3:
                raise LoiDung("KG_DUNG_LOI", "mặt cắt cần ít nhất 3 điểm")
            n, o = mat_qua(D[ds[0]], D[ds[1]], D[ds[2]])
        except (LoiDung, KeyError) as e:
            loi.append(_loi("KG_DUNG_LOI", "mặt cắt %s: %s" % (m.get("mat"), getattr(e, "chi_tiet", e))))
            continue
        td = thiet_dien(khoi, D, n, o)
        if len(td) < 3:
            loi.append(_loi("KG_DUNG_LOI", "mặt (%s) không cắt khối thành thiết diện" % "".join(ds)))
            continue
        kinh.append({"id": "(" + "".join(ds) + ")", "ten": "(" + "".join(ds) + ")", "diem": ds,
                     "da_giac": [[round(x * S, 6) for x in p] for p in td],
                     "bung": [[round(x * S, 6) for x in p] for p in mat_bung(td, n, float(m.get("he_so_bung") or 1.55))] if m.get("bung", True) else None,
                     "mau": str(m.get("mau") or "vang")})
    goc = []
    for g in hkg.get("goc") or []:
        if not isinstance(g, dict):
            continue
        try:
            dinh = chuan_ten(g.get("dinh"))
            hai = tach_ten(g.get("canh")) if g.get("canh") else [chuan_ten(g.get("a")), chuan_ten(g.get("b"))]
            if len(hai) != 2:
                raise LoiDung("KG_DUNG_LOI", "ký hiệu góc tại %s cần đúng 2 điểm trên hai cạnh" % dinh)
            if not all(t in D for t in [dinh] + hai):
                raise LoiDung("KG_DIEM_KHONG_TON_TAI", "góc tại %s nhắc điểm chưa dựng" % dinh)
            goc.append({"id": str(g.get("id") or "goc_" + dinh + "".join(hai)), "dinh": dinh, "a": hai[0], "b": hai[1],
                        "vuong": bool(g.get("vuong")), "nhan": str(g.get("nhan") or "")})
            if g.get("vuong"):
                u = [D[hai[0]][i] - D[dinh][i] for i in range(3)]
                v = [D[hai[1]][i] - D[dinh][i] for i in range(3)]
                c = abs(sum(u[i] * v[i] for i in range(3))) / max(1e-12, (sum(x * x for x in u) * sum(x * x for x in v)) ** 0.5)
                if c > 1e-5:
                    loi.append(_loi("KG_MENH_DE_SAI", "ký hiệu góc vuông tại %s nhưng góc %s%s%s không vuông (cos = %.4f)" % (
                        dinh, hai[0], dinh, hai[1], c)))
        except LoiDung as e:
            loi.append(_loi(e.ma, e.chi_tiet, e.goi_y))
    # ---- điểm trượt (hook 2 s đầu): mẫu các vị trí của điểm "bất kỳ" + mọi điểm phụ thuộc ----
    truot = None
    tr = hkg.get("truot") if isinstance(hkg.get("truot"), dict) else None
    ten_tr = chuan_ten(tr.get("diem")) if tr else ""
    vi_tri_bk = [chuan_ten(d.get("ten")) for d in ds_diem if str(d.get("loai") or "") in ("tren_canh", "tren_duong") and _ty(d.get("ty_le")) is None]
    if ten_tr and ten_tr in vi_tri_bk:
        k = vi_tri_bk.index(ten_tr)
        t1 = bo_chon[k]
        t0 = max(0.12, min(0.88, t1 - 0.24 if t1 > 0.5 else t1 + 0.24))
        khung = []
        for i in range(9):
            t = t0 + (t1 - t0) * i / 8.0
            bo = list(bo_chon)
            bo[k] = t
            try:
                Dm, _ = _dung_tat_ca(khoi, ds_diem, tuple(bo))
            except LoiDung:
                continue
            khung.append({"u": round(i / 8.0, 4), "diem": {x: [round(c * S, 6) for c in Dm[x]] for x in Dm if Dm[x] != khoi["diem"].get(x)}})
        if len(khung) >= 3:
            truot = {"diem": ten_tr, "tren": info[ten_tr].get("tren"), "khung": khung}
    elif ten_tr:
        canh_bao.append("truot: %s không phải điểm 'bất kỳ' trên cạnh -> bỏ hiệu ứng trượt" % ten_tr)
    ra = {"dat": not loi, "loi": loi, "canh_bao": canh_bao, "phien_ban": PHIEN_BAN,
          "cau_hinh": {"ty_le_bat_ky": dict(zip(vi_tri_bk, [round(x, 3) for x in bo_chon])), "so_mau": len(mau),
                       "h_a": round(khoi.get("chieu_cao", 0) / a, 3), "kich_thuoc_that": that},
          "so_do": so_do}
    if chi_kiem:
        return ra
    ra["dung"] = {"diem": toa, "khoi": {"loai": khoi["loai"], "dinh": khoi["dinh"], "mat": khoi["mat"], "canh": khoi["canh"]},
                  "doan": doan, "kinh": kinh, "goc": goc, "truot": truot,
                  "nhan": [t for t in toa if t in set(khoi["dinh"]) | set(ten_dung)]}
    return ra


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("kich_ban")
    ap.add_argument("--ra")
    ap.add_argument("--chi-kiem", action="store_true")
    a = ap.parse_args()
    kb = json.load(sys.stdin if a.kich_ban == "-" else open(a.kich_ban, encoding="utf8"))
    G = giai(kb, chi_kiem=a.chi_kiem)
    if G is None:
        print(json.dumps({"dat": None, "loi": [], "ly_do": "không có hinh_khong_gian"}, ensure_ascii=False))
        sys.exit(3)
    if a.ra:
        os.makedirs(os.path.dirname(os.path.abspath(a.ra)), exist_ok=True)
        json.dump(G, open(a.ra, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    if a.chi_kiem or not a.ra:
        sys.stdout.write(json.dumps(G, ensure_ascii=False))
    else:
        for x in G["loi"]:
            print("LỖI CỨNG [%s] %s%s" % (x["ma"], x["chi_tiet"], (" -> " + x["goi_y"]) if x.get("goi_y") else ""))
        print("Hình không gian: %s, %d điểm, %d đoạn, %d mặt cắt, cấu hình %s" % (
            "ĐẠT" if G["dat"] else "LỖI", len(G["dung"]["diem"]), len(G["dung"]["doan"]), len(G["dung"]["kinh"]),
            json.dumps(G["cau_hinh"]["ty_le_bat_ky"])))
    sys.exit(0 if G["dat"] else 2)


if __name__ == "__main__":
    main()
