#!/usr/bin/env python3
"""KIỂM TRA CHÉO BẮT BUỘC cho luồng HÌNH HỌC THUẦN (v86) - dừng workflow (exit 1) nếu không đạt.

  --truoc (sau chuanbi.py, TRƯỚC khi Manim dựng):
     1. Khóa luồng: kịch bản / props không còn dấu vết cảnh thật, Blender, Three.js, phong cảnh.
     2. Số cảnh: props.canh khớp 100% kb.canh (đúng thứ tự, không rơi cảnh nào).
     3. Hình: mọi điểm đề bài nêu và mọi điểm lời thoại / công thức nhắc tới đều có trên hình;
        quan hệ của đề (vuông góc, song song, trung điểm, thuộc, bằng nhau, vuông góc mặt phẳng) đúng trên tọa độ gốc;
        cạnh khuất (nét đứt) không bị vẽ thành cạnh liền.
     4. Đồng bộ: mọi cảnh có mốc TỪ THẬT (dongBo = tu_that); mọi "buoc_ve" neo được vào lời đọc.
  --sau (SAU khi Manim dựng): số cảnh Manim đã dựng = số cảnh props; mỗi nét / dòng có mốc lời đọc
     phải bắt đầu lệch không quá NGUONG_LECH giây so với lúc giọng đọc nói tới nó.

Dùng:  python3 scripts/kiem_hinh_hoc.py kich_ban.json public/props.json --truoc [--bao out/kiem_hinh_hoc.json]
       python3 scripts/kiem_hinh_hoc.py kich_ban.json public/props.json --sau
"""
import argparse
import json
import math
import re
import sys

NGUONG_LECH = 0.25          # giây: nét vẽ bắt đầu lệch tối đa so với lời đọc
NGUONG_GOC = 0.02           # |cos| cho vuông góc, |sin| cho song song
NGUONG_DO_DAI = 2e-3        # tỉ lệ theo đường chéo hình
KHOA_3D = ("mo_hinh_3d", "ban_ve", "moi_truong", "moiTruong", "chuoi_3d", "chuoi3D", "anh_canh_3d", "net_toan")
KHOA_3D_PROPS = ("moHinh3D", "moiTruong", "chuoi3D", "anhCanh3D", "netToan", "phaMinhHoa")
VAT_DUOC = ("hinh_hoc",)
VIET_TAT = re.compile(r"^(CM|SGK|OK|TH|ĐPCM|THCS|THPT|GTLN|GTNN|PT|HS|V|P|R)\d*$")
CHU_VIET = "A-Za-zÀ-ỹĐđ'"


def ten_diem(s):
    """Tên điểm (A, B', H_1...) trong một đoạn chữ / LaTeX - cùng quy tắc với tenDiemTrong của HinhHoc.gs."""
    s = re.sub(r"\\[a-zA-Z]+", " ", str(s or ""))
    ra = []
    for m in re.finditer(r"(?:^|(?<=[^%s]))([A-Z](?:'|_?\d)?(?:[A-Z](?:'|_?\d)?){0,4})(?=$|[^%s_(])" % (CHU_VIET, CHU_VIET), s):
        t = m.group(1)
        if VIET_TAT.match(t):
            continue
        for p in re.findall(r"[A-Z](?:'|_?\d)?", t):
            p = p.replace("_", "")
            if p not in ra:
                ra.append(p)
    return ra


def la_hinh_hoc(kb):
    return str(kb.get("luong") or "") == "hinh_hoc_thuan" or str(kb.get("mon") or "").upper() == "HINH_HOC"


def vat_hinh(c, k_du="du_lieu", k_mh="minh_hoa"):
    du = (c.get(k_mh) or {}).get(k_du) if isinstance(c.get(k_mh), dict) else None
    return [v for v in (du.get("vat") or []) if isinstance(v, dict)] if isinstance(du, dict) else []


def _v(a, b):
    return [y - x for x, y in zip(a, b)]


def _dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def _norm(a):
    return math.sqrt(_dot(a, a))


def _cross(a, b):
    a = (list(a) + [0, 0, 0])[:3]
    b = (list(b) + [0, 0, 0])[:3]
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def kiem_quan_he(q, P, thang_do):
    """Trả lỗi (chuỗi) nếu quan hệ q sai trên tọa độ P; None nếu đúng hoặc không kiểm được."""
    def lay(*ten):
        if not all(t in P for t in ten):
            raise KeyError(",".join(t for t in ten if t not in P))
        return [P[t] for t in ten]
    loai = str(q.get("loai") or "")
    try:
        if loai in ("vuong_goc", "song_song", "bang"):
            A, B = lay(*q["a"][:2])
            C, D = lay(*q["b"][:2])
            u, v = _v(A, B), _v(C, D)
            if _norm(u) < 1e-9 or _norm(v) < 1e-9:
                return "đoạn suy biến"
            if loai == "vuong_goc":
                e = abs(_dot(u, v)) / (_norm(u) * _norm(v))
                return None if e < NGUONG_GOC else "cos góc = %.3f (không vuông góc)" % e
            if loai == "song_song":
                e = _norm(_cross(u, v)) / (_norm(u) * _norm(v))
                return None if e < NGUONG_GOC else "sin góc = %.3f (không song song)" % e
            e = abs(_norm(u) - _norm(v)) / thang_do
            return None if e < NGUONG_DO_DAI else "hai đoạn lệch %.4f" % e
        if loai in ("trung_diem", "thuoc"):
            M, = lay(q["diem"])
            B, C = lay(*q["a"][:2])
            if loai == "trung_diem":
                I = [(x + y) / 2 for x, y in zip(B, C)]
                e = _norm(_v(I, M)) / thang_do
                return None if e < NGUONG_DO_DAI else "cách trung điểm %.4f" % e
            u = _v(B, C)
            e = _norm(_cross(_v(B, M), u)) / max(1e-9, _norm(u)) / thang_do
            return None if e < NGUONG_DO_DAI else "cách đường thẳng %.4f" % e
        if loai == "vuong_goc_mat":
            A, B = lay(*q["a"][:2])
            X, Y, Z = lay(*q["mat"][:3])
            n = _cross(_v(X, Y), _v(X, Z))
            u = _v(A, B)
            if _norm(n) < 1e-9 or _norm(u) < 1e-9:
                return "mặt phẳng / đoạn suy biến"
            e = _norm(_cross(u, n)) / (_norm(u) * _norm(n))
            return None if e < NGUONG_GOC else "lệch pháp tuyến sin = %.3f" % e
    except KeyError as e:
        return "thiếu điểm %s" % e
    except (TypeError, ValueError, IndexError):
        return "quan hệ ghi sai cấu trúc"
    return None


def kiem_truoc(kb, props):
    loi, luu_y = [], []
    canh_k, canh_p = kb.get("canh") or [], props.get("canh") or []
    # 1) khóa luồng
    for k in KHOA_3D:
        if k in kb:
            loi.append("LUONG: kịch bản hình học còn '%s'" % k)
    if isinstance(kb.get("cau_chuyen"), dict) and kb["cau_chuyen"].get("phong_canh"):
        loi.append("LUONG: kịch bản hình học còn phong cảnh 3D (cau_chuyen.phong_canh)")
    for k in ("phongCanh", "nenBlender"):
        if props.get(k):
            loi.append("LUONG: props còn '%s'" % k)
    for i, c in enumerate(canh_k):
        for k in KHOA_3D:
            if k in c:
                loi.append("LUONG: cảnh %d còn '%s'" % (i + 1, k))
        for v in vat_hinh(c):
            if v.get("loai") not in VAT_DUOC:
                loi.append("LUONG: cảnh %d có vật không thuần toán '%s'" % (i + 1, v.get("loai")))
    for i, c in enumerate(canh_p):
        for k in KHOA_3D_PROPS:
            if c.get(k):
                loi.append("LUONG: props cảnh %d còn '%s'" % (i + 1, k))
    # 2) số cảnh
    if len(canh_p) != len(canh_k):
        loi.append("SO_CANH: kịch bản %d cảnh nhưng props %d cảnh" % (len(canh_k), len(canh_p)))
    for i, c in enumerate(canh_p):
        if int(c.get("so") or 0) != int((canh_k[i] if i < len(canh_k) else {}).get("so") or i + 1):
            loi.append("SO_CANH: cảnh thứ %d của props có số %s, lệch thứ tự kịch bản" % (i + 1, c.get("so")))
    # 3) hình
    co = set()
    hc = kb.get("hinh_chuan") if isinstance(kb.get("hinh_chuan"), dict) else {}
    co.update((hc.get("diem") or {}).keys())
    ve_lien, ve_dut = set(), set()
    for c in canh_k:
        for v in vat_hinh(c):
            if v.get("loai") == "hinh_hoc" and isinstance(v.get("diem"), dict):
                co.update(v["diem"].keys())
                ve_lien.update(frozenset(x[:2]) for x in v.get("canh") or [] if isinstance(x, list) and len(x) >= 2)
                ve_dut.update(frozenset(x[:2]) for x in v.get("khuat") or [] if isinstance(x, list) and len(x) >= 2)
    if len(co) < 2:
        loi.append("HINH: không có tọa độ hình hinh_hoc (Manim không dựng được hình đúng tỉ lệ)")
    else:
        thieu = [p for p in ten_diem(kb.get("de_bai")) if p not in co]
        if thieu:
            loi.append("HINH: đề bài nêu điểm %s nhưng hình không có" % ", ".join(thieu))
        for i, c in enumerate(canh_k):
            thieu = [p for p in ten_diem(str(c.get("loi_thoai") or "") + " " + " ".join(map(str, c.get("noi_dung_man_hinh") or []))) if p not in co]
            if thieu:
                loi.append("HINH: cảnh %d nhắc %s nhưng hình không có" % (i + 1, ", ".join(thieu)))
    for k in hc.get("khuat") or []:
        if isinstance(k, list) and frozenset(k[:2]) in ve_lien:
            loi.append("HINH: cạnh khuất %s bị vẽ nét liền" % "".join(k[:2]))
    P = {k: [float(x) for x in v] for k, v in (hc.get("diem_goc") or {}).items() if isinstance(v, list) and len(v) >= 2}
    if P:
        xs = list(zip(*[(p + [0.0])[:3] for p in P.values()]))
        thang_do = max(1e-9, math.sqrt(sum((max(a) - min(a)) ** 2 for a in xs)))
        P = {k: (v + [0.0])[:3] for k, v in P.items()}
        for q in hc.get("quan_he") or []:
            if isinstance(q, dict):
                e = kiem_quan_he(q, P, thang_do)
                if e:
                    loi.append("QUAN_HE: %s %s -> %s" % (q.get("loai"), json.dumps({k: q[k] for k in q if k != "loai"}, ensure_ascii=False), e))
        if not hc.get("quan_he"):
            luu_y.append("QUAN_HE: hình chuẩn chưa kèm quan_he của đề (mã dựng hình cũ) - chỉ kiểm được tên điểm")
    else:
        luu_y.append("QUAN_HE: kịch bản chưa có hinh_chuan.diem_goc - bỏ qua kiểm quan hệ trên tọa độ gốc")
    # 4) đồng bộ hình - tiếng
    for i, c in enumerate(canh_p):
        if c.get("dongBo") != "tu_that":
            loi.append("DONG_BO: cảnh %d không có mốc từ thật của giọng đọc (dongBo=%s)" % (i + 1, c.get("dongBo")))
        for m in c.get("mocVe") or []:
            if not m.get("khop"):
                loi.append("DONG_BO: cảnh %d buoc_ve '%s' không neo được vào lời đọc (khi_noi='%s')" % (i + 1, m.get("ve"), m.get("khi_noi")))
        k = canh_k[i] if i < len(canh_k) else {}
        if k.get("moc_loi") and len(k.get("moc_loi") or []) == len(c.get("noiDung") or []) and not c.get("mocCongThuc"):
            luu_y.append("DONG_BO: cảnh %d có moc_loi nhưng không khớp nguyên văn lời đọc -> dòng công thức hiện theo ước lượng" % (i + 1))
        if not k.get("buoc_ve"):
            luu_y.append("DONG_BO: cảnh %d chưa có buoc_ve -> nét vẽ neo theo lần đầu được nhắc trong lời đọc" % (i + 1))
    return loi, luu_y


def kiem_sau(props, kb=None):
    loi, luu_y = [], []
    nk = props.get("manimNhatKy")
    if not isinstance(nk, dict):
        return ["SAU: props thiếu manimNhatKy (Manim chưa chạy hoặc bản cũ)"], []
    if nk.get("so_canh") != len(props.get("canh") or []):
        loi.append("SAU: Manim dựng %s cảnh, props có %d cảnh" % (nk.get("so_canh"), len(props.get("canh") or [])))
    lech_max = 0.0
    for e in nk.get("ve") or []:
        if e.get("nguon") not in ("buoc_ve", "tu", "moc_loi"):
            continue
        lech = float(e.get("lech") or 0)
        lech_max = max(lech_max, abs(lech))
        if abs(lech) > NGUONG_LECH:
            loi.append("SAU: cảnh %s '%s' bắt đầu %+.2f s so với lời đọc (ngưỡng %.2f s)" % (e.get("canh"), e.get("doi_tuong"), lech, NGUONG_LECH))
    # nét liền / nét đứt Manim thực vẽ phải khớp phân loại 3D đã kiểm chứng (kb.hinh_chuan.khuat / canh)
    hc = kb.get("hinh_chuan") if isinstance(kb, dict) and isinstance(kb.get("hinh_chuan"), dict) else {}
    if hc.get("khong_gian") and "khuat" in nk:
        chuan_khuat = {"".join(sorted(x[:2])) for x in hc.get("khuat") or [] if isinstance(x, list) and len(x) >= 2}
        chuan_lien = {"".join(sorted(x[:2])) for x in hc.get("canh") or [] if isinstance(x, list) and len(x) >= 2}
        thuc_khuat, thuc_lien = set(nk.get("khuat") or []), set(nk.get("canh_lien") or [])
        for k in sorted(chuan_khuat & thuc_lien):
            loi.append("SAU: cạnh khuất %s bị Manim vẽ nét liền" % k)
        for k in sorted(chuan_lien & thuc_khuat):
            loi.append("SAU: cạnh nhìn thấy %s bị Manim vẽ nét đứt" % k)
    # mọi nét khai báo trong buoc_ve của cảnh i phải được vẽ ở cảnh i (hoặc đã có từ cảnh trước), không thiếu, không dời sang cảnh sau
    da_ve = {}
    for e in nk.get("ve") or []:
        da_ve.setdefault(str(e.get("doi_tuong")), int(e.get("canh") or 0))
    for i, c in enumerate(props.get("canh") or []):
        for m in c.get("mocVe") or []:
            ve = str(m.get("ve") or "")
            ten = re.findall(r"[A-Z]'*", ve)
            if ve.startswith("\\perp") or ve.startswith("\\angle") or not ten:
                continue
            if ve.startswith("\\triangle") or (ve.startswith("(") and len(ten) >= 3):
                khoa = "mien " + "".join(sorted(ten))
            elif len(ten) == 2:
                khoa = "doan " + "".join(sorted(ten))
            elif len(ten) == 1:
                khoa = "diem " + ten[0]
            else:
                continue
            canh_ve = da_ve.get(khoa)
            if canh_ve is None:
                loi.append("SAU: cảnh %d khai báo vẽ '%s' nhưng Manim không vẽ nét này" % (i + 1, ve))
            elif canh_ve > i + 1:
                loi.append("SAU: '%s' khai báo ở cảnh %d nhưng Manim vẽ ở cảnh %d" % (ve, i + 1, canh_ve))
    dem = {}
    for e in nk.get("ve") or []:
        dem[e.get("nguon")] = dem.get(e.get("nguon"), 0) + 1
    luu_y.append("SAU: %d nét/dòng, lệch lớn nhất %.3f s, nguồn mốc %s" % (len(nk.get("ve") or []), lech_max, json.dumps(dem, ensure_ascii=False)))
    for cb in props.get("manimCanhBao") or []:
        luu_y.append("MANIM: " + cb)
    return loi, luu_y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kich_ban")
    ap.add_argument("props")
    ap.add_argument("--truoc", action="store_true")
    ap.add_argument("--sau", action="store_true")
    ap.add_argument("--bao", default="")
    a = ap.parse_args()
    with open(a.kich_ban, encoding="utf8") as f:
        kb = json.load(f)
    with open(a.props, encoding="utf8") as f:
        props = json.load(f)
    if not la_hinh_hoc(kb):
        print("Không phải luồng hình học thuần -> bỏ qua kiểm tra hình học")
        return 0
    loi, luu_y = kiem_sau(props, kb) if a.sau else kiem_truoc(kb, props)
    for x in luu_y:
        print("Lưu ý:", x)
    for x in loi:
        print("LỖI:", x)
    if a.bao:
        with open(a.bao, "w", encoding="utf8") as f:
            json.dump({"buoc": "sau" if a.sau else "truoc", "loi": loi, "luu_y": luu_y}, f, ensure_ascii=False, indent=1)
    print("Kiểm tra hình học %s: %s" % ("sau dựng" if a.sau else "trước dựng", "ĐẠT" if not loi else "KHÔNG ĐẠT (%d lỗi)" % len(loi)))
    return 1 if loi else 0


if __name__ == "__main__":
    sys.exit(main())
