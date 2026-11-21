"""Kiểm đặc tả cảnh (dac_ta_canh) bám sát đề TRƯỚC khi dựng; và nhờ AI nhìn ảnh SAU khi dựng.

kiem_dac_ta(kb) -> (loi, canh_bao): loi nặng thì không được dựng cảnh 3D theo đặc tả.
"""

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from thu_vien_3d.khop import DANH_MUC, chuan, co_cum, khop_mau_sac, khop_vat  # noqa: E402

SCHEMA = json.loads((Path(__file__).parent / "thu_vien_3d/schema_dac_ta.json").read_text(encoding="utf8"))
SO_CHU = {"một": 1, "hai": 2, "ba": 3, "bốn": 4, "tư": 4, "năm": 5, "sáu": 6, "bảy": 7, "tám": 8, "chín": 9,
          "mười": 10, "mười một": 11, "mười hai": 12, "mười lăm": 15, "hai mươi": 20}
LUONG_TU = r"(?:chiếc|cái|con|quả|viên|hòn|tấm|lá|bể|bồn|thùng|hộp|cây|người|bạn|em|học sinh|chai|lon|cốc|ly|xe|ngôi|căn|đồng|tờ|cuốn|bao|túi|gói|kiện|phần|suất)?"
DONG_TU = set(SCHEMA["properties"]["quay"]["items"]["properties"]["hanh_dong"]["items"]["properties"]["dong_tu"]["enum"])


def _schema_loi(spec):
    try:
        import jsonschema
    except ImportError:
        return ["thiếu gói jsonschema (pip install jsonschema)"]
    v = jsonschema.Draft202012Validator(SCHEMA)
    return [f"{'/'.join(map(str, e.absolute_path)) or 'gốc'}: {e.message}" for e in sorted(v.iter_errors(spec), key=str)[:8]]


def _so_trong_de(de, ten):
    """Các số đếm đứng ngay trước tên vật trong đề: '3 bể cá', 'ba chiếc xe đỏ'."""
    ten = chuan(ten)
    head = re.escape(ten)
    out = set()
    so = r"(\d+|" + "|".join(sorted(map(re.escape, SO_CHU), key=len, reverse=True)) + r")"
    for m in re.finditer(r"(?<![\w,.])" + so + r"\s+" + LUONG_TU + r"\s*" + head + r"(?![\w])", de):
        t = m[1]
        out.add(int(t) if t.isdigit() else SO_CHU[t])
    return out


def _gt_trong_de(de, v):
    gt = ("%g" % v["gt"])
    variants = {gt, gt.replace(".", ",")}
    return any(re.search(r"(?<![\d.,])" + re.escape(x) + r"\s*" + re.escape(v["dv"]) + r"(?![\w])", de) for x in variants)


def _mau_gan_ten(de, ten):
    """Màu viết ngay sau tên vật trong đề ('bi đỏ', 'xe màu trắng')."""
    mau = set()
    for m in re.finditer(r"(?<![\w])" + re.escape(chuan(ten)) + r"(?:\s+màu)?\s+([^\s,.;]+(?:\s+[^\s,.;]+)?)", de):
        for cand in (m[1], m[1].split()[0]):
            key = khop_mau_sac(cand)
            if key and chuan(cand) in [chuan(x) for x in DANH_MUC["mau_sac"][key]]:
                mau.add(key)
                break
    return mau


def kiem_dac_ta(kb):
    spec = kb.get("dac_ta_canh")
    loi, canh_bao = [], []
    if not isinstance(spec, dict):
        return ["dac_ta_canh phải là đối tượng"], []
    loi += _schema_loi(spec)
    if loi:
        return loi, canh_bao
    de = chuan(kb.get("de_bai"))
    cau = kb.get("cau_chuyen") if isinstance(kb.get("cau_chuyen"), dict) else {}
    nguon = de + " " + chuan(cau.get("dia_diem")) + " " + chuan(cau.get("nguoi_ke"))
    things = spec["thuc_the"]
    ids = [t["id"] for t in things]
    if len(set(ids)) != len(ids):
        loi.append("thuc_the có id trùng nhau")
    counts = {t["id"]: (t["so_luong"] if isinstance(t["so_luong"], int) else 99) for t in things}
    if not any(t["vai_tro"] == "chinh" for t in things):
        loi.append("cần ít nhất một thực thể vai_tro = chinh (vật mang số liệu của đề)")

    def ref_ok(ref, cho_phep_so=True):
        m = re.fullmatch(r"([a-z][a-z0-9_]*)(?:#(\d+))?", str(ref or ""))
        if not m or m[1] not in counts:
            return False
        return m[2] is None or (cho_phep_so and 1 <= int(m[2]) <= counts[m[1]])

    for t in things:
        name = t["ten"]
        if t.get("tu_de") and chuan(t["tu_de"]) not in nguon:
            loi.append(f"{t['id']}.tu_de '{t['tu_de']}' không phải nguyên văn đề")
        if t["vai_tro"] != "trang_tri" and not t.get("tu_de") and not co_cum(chuan(name), nguon):
            canh_bao.append(f"{t['id']}: tên '{name}' không xuất hiện trong đề (nên có tu_de)")
        # Trích dẫn cụ thể (tu_de) được ưu tiên: '3 chiếc ô tô màu trắng' chỉ đối chiếu với 3 và trắng.
        quote = chuan(t.get("tu_de"))
        nums = (_so_trong_de(quote, name) | _so_trong_de(de, quote)) if quote else _so_trong_de(de, name)
        if isinstance(t["so_luong"], int) and nums and t["so_luong"] not in nums and sum(nums) != t["so_luong"]:
            loi.append(f"{t['id']}: so_luong {t['so_luong']} khác đề ({', '.join(map(str, sorted(nums)))} {name})")
        for key, v in (t.get("kich_thuoc") or {}).items():
            if v.get("nguon", "de") == "de" and not _gt_trong_de(de, v):
                loi.append(f"{t['id']}.kich_thuoc.{key} = {v['gt']:g} {v['dv']} không có trong đề (đặt nguon='uoc_luong' nếu tự ước lượng)")
        if quote:
            de_mau = {k for k, names in DANH_MUC["mau_sac"].items() if any(co_cum(chuan(n), quote) for n in names)}
            de_mau |= _mau_gan_ten(de, quote)
        else:
            de_mau = _mau_gan_ten(de, name)
        mine = t.get("mau_sac")
        mine = {khop_mau_sac(x) for x in (mine if isinstance(mine, list) else [mine] if mine else [])} - {None}
        if de_mau and mine and not (de_mau & mine):
            loi.append(f"{t['id']}: màu {sorted(mine)} khác màu đề nêu {sorted(de_mau)}")
        if de_mau and not mine:
            canh_bao.append(f"{t['id']}: đề nêu màu {sorted(de_mau)} nhưng đặc tả chưa ghi mau_sac")
        if t.get("mau_tv") and t["mau_tv"] not in DANH_MUC["vat"]:
            canh_bao.append(f"{t['id']}: mau_tv '{t['mau_tv']}' chưa có trong thư viện, sẽ khớp theo tên")
        if t["vai_tro"] == "chinh" and not t.get("bo_phan") and khop_vat(t) is None:
            canh_bao.append(f"{t['id']}: '{name}' chưa có mẫu -> cần sinh bản ghép (--tu-tao)")

    # Đề nhắc vật có trong thư viện mà đặc tả bỏ sót.
    named = " ".join(chuan(t["ten"]) + " " + chuan(t.get("tu_de")) for t in things)
    used = {khop_vat(t) for t in things}
    for key, info in DANH_MUC["vat"].items():
        if key in used or key in ("nguoi",):
            continue
        hit = next((n for n in info["ten"] if len(n) > 2 and co_cum(chuan(n), de) and not co_cum(chuan(n), named)), None)
        if hit:
            canh_bao.append(f"đề nhắc '{hit}' nhưng đặc tả chưa có thực thể tương ứng")

    for r in spec.get("quan_he") or []:
        for k in ("vat", "a", "b"):
            if k in r and not ref_ok(r[k]):
                loi.append(f"quan_he {r['kieu']}: '{r[k]}' không phải thực thể")
        if r["kieu"] in ("trong", "tren", "canh", "cach", "dua_vao") and not ("a" in r and "b" in r):
            loi.append(f"quan_he {r['kieu']} cần a và b")
        if r["kieu"] in ("xep_hang", "luoi") and "vat" not in r:
            loi.append(f"quan_he {r['kieu']} cần vat")
        kc = r.get("khoang_cach")
        if kc and kc.get("tu_de") is not None and not _gt_trong_de(de, kc):
            loi.append(f"quan_he {r['kieu']}: khoảng cách {kc['gt']:g} {kc['dv']} không có trong đề")
    for s in spec.get("so_lieu") or []:
        refs = s["gan"].split(":", 1)[1].split(",") if s["gan"].startswith("khoang_cach:") else [s["gan"].rsplit(".", 1)[0]]
        if not all(ref_ok(x) for x in refs):
            loi.append(f"so_lieu '{s['gan']}' tham chiếu thực thể không có")
        if s.get("tu_de") and chuan(s["tu_de"]) not in de:
            loi.append(f"so_lieu '{s['gan']}': tu_de không phải nguyên văn đề")
    pt = spec.get("phep_thu")
    if pt:
        if not all(ref_ok(x, False) for x in pt["khong_gian"]):
            loi.append("phep_thu.khong_gian chứa thực thể không có")
        elif pt["chon"] > sum(counts[x] for x in pt["khong_gian"]):
            loi.append("phep_thu.chon lớn hơn số phần tử của không gian mẫu")
    n_canh = len(kb.get("canh") or [])
    for q in spec.get("quay") or []:
        if n_canh and q["canh"] > n_canh:
            loi.append(f"quay: cảnh {q['canh']} vượt số cảnh ({n_canh})")
        for x in q.get("tieu_diem") or []:
            if not ref_ok(x):
                loi.append(f"quay cảnh {q['canh']}: tiêu điểm '{x}' không phải thực thể")
        for a in q.get("hanh_dong") or []:
            if not ref_ok(a["vat"]):
                loi.append(f"quay cảnh {q['canh']}: hành động trên '{a['vat']}' không phải thực thể")
            if a.get("khi_noi") and kb.get("canh") and q["canh"] <= n_canh:
                loi_thoai = chuan((kb["canh"][q["canh"] - 1] or {}).get("loi_thoai"))
                if loi_thoai and chuan(a["khi_noi"]) not in loi_thoai:
                    loi.append(f"quay cảnh {q['canh']}: khi_noi '{a['khi_noi']}' không có nguyên văn trong lời thoại")
    boi = spec["boi_canh"]
    if boi.get("mau") and boi["mau"] not in DANH_MUC["moi_truong"]:
        canh_bao.append(f"boi_canh.mau '{boi['mau']}' chưa có mẫu, sẽ khớp theo tên địa điểm")
    if boi.get("tu_de") and chuan(boi["tu_de"]) not in nguon:
        loi.append("boi_canh.tu_de không phải nguyên văn đề / địa điểm câu chuyện")
    return loi, canh_bao


PROMPT_ANH = ("Ảnh là cảnh 3D dựng cho đề toán dưới đây. Kiểm tra từng thực thể trong danh sách có NHẬN RA ĐƯỢC "
              "trong ảnh không (đúng loại vật, số lượng gần đúng, màu), và bối cảnh có khớp địa điểm của đề không. "
              'Trả JSON {"thieu_chinh":[id thực thể CHÍNH không nhận ra],"thieu_phu":[id khác],'
              '"boi_canh_khop":true|false,"nhan_xet":"ngắn gọn"}.')


def kiem_anh(anh, kb, hoi):
    """Nhờ AI nhìn ảnh dựng thử. hoi(prompt, anh) -> dict. Trả (dat, bao_cao)."""
    spec = kb["dac_ta_canh"]
    ds = [{"id": t["id"], "ten": t["ten"], "so_luong": t["so_luong"], "mau": t.get("mau_sac"), "vai_tro": t["vai_tro"]}
          for t in spec["thuc_the"]]
    context = json.dumps({"de": kb.get("de_bai"), "boi_canh": spec.get("boi_canh"), "thuc_the": ds}, ensure_ascii=False)
    kq = hoi(PROMPT_ANH + "\n" + context, anh)
    if not isinstance(kq, dict):
        return False, {"nhan_xet": "AI không trả JSON"}
    return not kq.get("thieu_chinh") and kq.get("boi_canh_khop") is not False, kq


if __name__ == "__main__":
    kb = json.loads(Path(sys.argv[1]).read_text(encoding="utf8"))
    errors, warnings = kiem_dac_ta(kb)
    for w in warnings:
        print("Cảnh báo:", w)
    for e in errors:
        print("LỖI:", e)
    sys.exit(1 if errors else 0)
