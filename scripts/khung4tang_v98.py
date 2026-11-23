#!/usr/bin/env python3
"""v98 — vá lỗi thực chiến khung 4 tầng (thuần Python, không gọi mạng; test: scripts/test_v98.py).

- che_dap_an_ghim(): thanh ĐỀ / hộp dữ kiện KHÔNG BAO GIỜ lộ nghiệm trước bước chốt. Lỗi thật: AI ghi luôn `x = 6,07` vào
  `de_ghim` (không có '?') -> de_ghim_doi (v95) bỏ qua -> thanh ĐỀ hiện đáp số từ giây đầu; dung_tu_duy (v96) còn chép sang
  hộp dữ kiện T2. Ô nào có vế trái là ĐẠI LƯỢNG CỦA ĐÁP ÁN và vế phải trùng số đáp án -> ép về `x = ?` (de_ghim_doi sẽ đổi lại
  sang đáp số đúng mốc chốt nghiệm).
"""
import re

RE_SO = re.compile(r"-?\d+(?:[.,]\d+)?")


def _so(s):
    try:
        return float(str(s).replace("{,}", ".").replace(",", "."))
    except ValueError:
        return None


def _le(s):
    m = re.search(r"[.,](\d+)", str(s).replace("{,}", ","))
    return len(m.group(1)) if m else 0


def so_bang(a, b):
    """'6,07' ~ '6,0711' (so tới số chữ số thập phân ngắn hơn); '6' ~ '6,0' ; '6' !~ '6,07'."""
    x, y = _so(a), _so(b)
    if x is None or y is None:
        return False
    d = min(_le(a), _le(b))
    return abs(x - y) <= 0.5 * 10 ** (-d) + 1e-9


def _so_dap(dap_an, gia_tri_theo_bien=None):
    """{đại lượng: [số...]} từ chuỗi đáp án + giá trị máy tính."""
    from khung4tang_v95 import phan_dap_an
    ra = {}
    for k, (so, _dv) in phan_dap_an(dap_an).items():
        ra.setdefault(k, []).extend(x for x in re.split(r";\\?\s*", str(so)) if x.strip())
    for k, v in (gia_tri_theo_bien or {}).items():
        so = v[0] if isinstance(v, (list, tuple)) else v
        ra.setdefault(str(k)[:1], []).append(str(so))
    return ra


RE_O = re.compile(r"^\s*(\\?[A-Za-z][A-Za-z_{}\\^]*(?:\([^)]*\))?)\s*(=|\\approx|≈)\s*(.+?)\s*$")


def che_mot(nhan, so_dap):
    """'x = 6,07' -> 'x = ?' khi x là đại lượng đáp án và 6,07 là số đáp án; còn lại giữ nguyên. Trả (nhãn mới, đã che?)."""
    s = str(nhan or "")
    if "?" in s:
        return s, False
    m = RE_O.match(s)
    if not m:
        return s, False
    ve_trai, ve_phai = m.group(1), m.group(3)
    chu = re.sub(r"^\\", "", ve_trai)[:1]
    if chu not in so_dap:
        return s, False
    so_phai = RE_SO.findall(ve_phai.replace("{,}", ","))
    if not so_phai or not any(so_bang(a, b) for a in so_phai for b in so_dap[chu]):
        return s, False
    return "%s = ?" % ve_trai, True


def che_dap_an_ghim(de_ghim, dap_an, gia_tri_theo_bien=None):
    """Danh sách ô ghim -> (danh sách đã che, số ô đã che). Ô đã có `doi` giữ nguyên."""
    so_dap = _so_dap(dap_an, gia_tri_theo_bien)
    if not so_dap:
        return list(de_ghim or []), 0
    ra, n = [], 0
    for d in de_ghim or []:
        if not isinstance(d, dict) or d.get("doi"):
            ra.append(d)
            continue
        moi, che = che_mot(d.get("nhan"), so_dap)
        if che:
            d = dict(d, nhan=moi)
            n += 1
        ra.append(d)
    return ra, n


def che_dap_an_chuoi(ds, dap_an):
    """Danh sách chuỗi TeX (dữ kiện sơ đồ tư duy) -> bản đã che."""
    so_dap = _so_dap(dap_an)
    return [che_mot(x, so_dap)[0] if so_dap else x for x in ds or []]
