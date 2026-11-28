#!/usr/bin/env python3
"""Cửa chặn sớm BP3 (dung-video.yml, TRƯỚC TTS): kiểm phép dựng + mệnh đề hình học bằng đúng bộ giải BP2 dùng.

Điều kiện chạy khớp chotHinhHocTruocLuu_ (HinhHoc.gs):
  - hinh_phang_chuan  : khi luồng hình học thuần (HINH_HOC=1) và HINH_PHANG_CHUAN != TAT
  - hinh_khong_gian   : khi luồng hình học thuần hoặc đặc tả Lego, và HINH_KHONG_GIAN_CHUAN != TAT
Mọi ngoại lệ Python (đặc tả sai định dạng) được đổi thành lỗi cứng HP_DUNG_LOI / KG_DUNG_LOI, không crash.

Dùng:  python3 scripts/kiem_hinh_truoc_tts.py kich_ban.json [out/loi_hinh_truoc_tts.json]
Mã thoát: 0 đạt | 2 có lỗi cứng (đã ghi JSON {"nang": [...], "loi": [...]}).
"""
import json
import os
import sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if GOC not in sys.path:
    sys.path.insert(0, GOC)


def _chay(giai, kb, ma_du_phong):
    try:
        kq = giai(kb, chi_kiem=True)
    except Exception as e:   # noqa: BLE001 - lưới an toàn cuối: không để runner crash vô danh
        return [{"ma": ma_du_phong, "chi_tiet": "bộ giải dừng bất thường (%s: %s)" % (type(e).__name__, str(e)[:160])}]
    if kq is None or kq.get("dat") is not False:
        return []
    return [x for x in (kq.get("loi") or []) if isinstance(x, dict)] or [{"ma": ma_du_phong, "chi_tiet": "bộ giải báo không đạt"}]


def kiem(kb, hinh_hoc, env=None):
    env = os.environ if env is None else env
    from scripts.giai_hinh_phang import giai as giai_phang
    from scripts.giai_hinh_khong_gian import giai as giai_khong_gian
    kg = kb.get("hinh_khong_gian") if isinstance(kb, dict) else None
    lego = isinstance(kg, dict) and (str(kg.get("phien_ban") or "") == "2" or isinstance(kg.get("doi_tuong"), list))
    loi = []
    if hinh_hoc and str(env.get("HINH_PHANG_CHUAN", "")).upper() != "TAT":
        loi += _chay(giai_phang, kb, "HP_DUNG_LOI")
    if (hinh_hoc or lego) and str(env.get("HINH_KHONG_GIAN_CHUAN", "")).upper() != "TAT":
        loi += _chay(giai_khong_gian, kb, "KG_DUNG_LOI")
    return loi


def main():
    duong = sys.argv[1] if len(sys.argv) > 1 else "kich_ban.json"
    ra = sys.argv[2] if len(sys.argv) > 2 else "out/loi_hinh_truoc_tts.json"
    with open(duong, encoding="utf8") as f:
        kb = json.load(f)
    loi = kiem(kb, os.environ.get("HINH_HOC", "") == "1")
    for x in loi:
        print("::error::%s: %s" % (x.get("ma"), x.get("chi_tiet")))
    if not loi:
        print("Kiểm hình trước TTS: ĐẠT")
        return 0
    nang = ["%s: %s%s" % (x.get("ma"), x.get("chi_tiet"), (" | Gợi ý: " + x["goi_y"]) if x.get("goi_y") else "") for x in loi]
    os.makedirs(os.path.dirname(os.path.abspath(ra)), exist_ok=True)
    with open(ra, "w", encoding="utf8") as f:
        json.dump({"nang": nang, "loi": loi}, f, ensure_ascii=False)
    return 2


if __name__ == "__main__":
    sys.exit(main())
