"""Kho 16 mảnh ghép SVG chuẩn Story Math cho Toán thực tế (THUC_TE) & Xác suất (XAC_SUAT).

Thiết kế tương thích 100% với hộp cát `scripts/tu_sinh_svg.py`:
  - Toàn bộ tọa độ tính tuyệt đối theo (x, y, scale) trong viewBox 0 0 800 540 (KHÔNG dùng transform).
  - Path chỉ dùng lệnh tuyệt đối viết hoa (M L H V C S Q T A Z), không filter / script / href.
  - Màu đồng bộ từ `phong_cach.json` (tải qua pathlib ở ngoài hộp cát, truyền dict màu vào trong sandbox).
  - Mọi nhãn text có font-size >= 22 px và nằm trong viên thuốc nền tối đặc (không vi phạm TS_CHU_NHO / TS_NHAN_DE_NET).
"""
import math

W, H = 800.0, 540.0
LE = 6.0
CO_CHU_SAN = 22

# Host (`tu_sinh_svg.py`) có thể tiêm sẵn dict đọc từ phong_cach.json để tránh đụng OS/file trong sandbox.
MAU_PHONG_CACH_NGOAI = None


def _tai_phong_cach():
    if isinstance(MAU_PHONG_CACH_NGOAI, dict):
        return MAU_PHONG_CACH_NGOAI
    try:
        import json
        from pathlib import Path

        tep = Path(__file__).resolve().parent.parent / "phong_cach.json"
        if tep.is_file():
            return json.loads(tep.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _xay_bang_mau():
    pc = _tai_phong_cach()
    intro = pc.get("intro") if isinstance(pc.get("intro"), dict) else {}
    ghi_de = pc.get("mau") if isinstance(pc.get("mau"), dict) else {}

    def _hex(val, mac_dinh):
        s = str(val or "").strip()
        if len(s) in (4, 7) and s.startswith("#"):
            return s.upper()
        return mac_dinh

    bang = {
        "nhan": _hex(ghi_de.get("nhan"), "#5CE1E6"),
        "nhan_dam": "#2B97A6",
        "nhan_toi": "#1F6F80",
        "la": _hex(intro.get("mauNhan"), "#3BF29A"),
        "la_toi": "#146B47",
        "cam": _hex(intro.get("mauPhu"), "#FF8A3D"),
        "ket": _hex(ghi_de.get("vang"), "#FFB547"),
        "ket_toi": "#8A5A16",
        "do": _hex(ghi_de.get("do"), "#FF6B6B"),
        "do_toi": "#7A232B",
        "cu": "#7C8DA6",
        "cu_toi": "#3A4A60",
        "chu": "#E9EEF5",
        "chu_mo": "#B8C4D6",
        "mat": "#16324A",
        "mat_toi": "#0C1E2E",
        "nen": "#0B1A26",
        "nen_intro": _hex(intro.get("mauNen"), "#071513"),
        "dung": "#6BE38C",
        "sai": "#FF6B6B",
        "bong": "rgba(0,0,0,0.28)",
    }
    return bang


MAU = _xay_bang_mau()

_TOI_MAP = {
    "nhan": "nhan_toi",
    "nhan_dam": "nhan_toi",
    "la": "la_toi",
    "cam": "ket_toi",
    "ket": "ket_toi",
    "do": "do_toi",
    "sai": "do_toi",
    "dung": "la_toi",
    "cu": "cu_toi",
    "mat": "mat_toi",
    "chu": "cu",
}


def _m(ten, mac_dinh="nhan"):
    if not ten:
        return MAU[mac_dinh]
    s = str(ten).strip()
    if s in MAU:
        return MAU[s]
    if s.startswith("#") and len(s) in (4, 7):
        return s.upper()
    return MAU[mac_dinh]


def _toi(ten, mac_dinh="nhan"):
    k = str(ten or mac_dinh).strip()
    if k in _TOI_MAP:
        return MAU[_TOI_MAP[k]]
    return MAU["mat_toi"]


def _f(v):
    return "%.1f" % float(v)


def _kep_x(v):
    return min(max(float(v), LE), W - LE)


def _kep_y(v):
    return min(max(float(v), LE), H - LE)


def _pt(cx, cy, dx, dy, s):
    return _kep_x(cx + dx * s), _kep_y(cy + dy * s)


def _pts_str(pts):
    return " ".join("%s,%s" % (_f(px), _f(py)) for px, py in pts)


def _thoat(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _lam_sach_nhan(s, toi_da=28):
    t = " ".join(str(s or "").replace("$", "").replace("\\", "").replace("_", " ").replace("^", "").split())
    if len(t) > toi_da:
        t = t[: toi_da - 1].rstrip() + "…"
    return t


def _pill(cx, cy, van, scale=1.0, vien="nhan", co_goc=22, mau_chu="chu", toi_da=28):
    txt = _lam_sach_nhan(van, toi_da)
    if not txt:
        return ""
    co = max(CO_CHU_SAN, int(round(co_goc * max(0.85, min(scale, 1.35)))))
    w = max(co * 1.6, 0.60 * co * len(txt) + 30.0)
    h = co + 14.0
    x0 = min(max(float(cx) - w / 2.0, LE), W - LE - w)
    y0 = min(max(float(cy) - h / 2.0, LE), H - LE - h)
    rx = min(12.0, h / 2.0)
    return (
        '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s" fill-opacity="0.94" stroke="%s" stroke-width="2"/>'
        % (_f(x0), _f(y0), _f(w), _f(h), _f(rx), MAU["nen"], _m(vien))
        + '<text x="%s" y="%s" fill="%s" font-size="%d" font-weight="700" text-anchor="middle">%s</text>'
        % (_f(x0 + w / 2.0), _f(y0 + h / 2.0 + co * 0.34), _m(mau_chu, "chu"), co, _thoat(txt))
    )


def _line(p1, p2, mau, w=3.0, dut=False, mo=1.0):
    extra = ' stroke-dasharray="7 5"' if dut else ""
    if mo < 1.0:
        extra += ' stroke-opacity="%.2f"' % mo
    return '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s" stroke-linecap="round"%s/>' % (
        _f(p1[0]), _f(p1[1]), _f(p2[0]), _f(p2[1]), mau, _f(w), extra
    )


def _poly(pts, fill, stroke="none", w=2.0, fo=1.0, so=1.0):
    ex = (' fill-opacity="%.2f"' % fo) if fo < 1.0 else ""
    if stroke != "none":
        ex += ' stroke="%s" stroke-width="%s" stroke-linejoin="round"' % (stroke, _f(w))
        if so < 1.0:
            ex += ' stroke-opacity="%.2f"' % so
    return '<polygon points="%s" fill="%s"%s/>' % (_pts_str(pts), fill, ex)


def _circle(p, r, fill, stroke="none", w=2.0, fo=1.0):
    rr = max(1.5, min(float(r), 380.0))
    ex = (' fill-opacity="%.2f"' % fo) if fo < 1.0 else ""
    if stroke != "none":
        ex += ' stroke="%s" stroke-width="%s"' % (stroke, _f(w))
    return '<circle cx="%s" cy="%s" r="%s" fill="%s"%s/>' % (_f(p[0]), _f(p[1]), _f(rr), fill, ex)


def _ellipse(p, rx, ry, fill, stroke="none", w=2.0, fo=1.0):
    ex = (' fill-opacity="%.2f"' % fo) if fo < 1.0 else ""
    if stroke != "none":
        ex += ' stroke="%s" stroke-width="%s"' % (stroke, _f(w))
    return '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"%s/>' % (
        _f(p[0]), _f(p[1]), _f(max(1.0, rx)), _f(max(1.0, ry)), fill, ex
    )


def _rect(p0, w, h, fill, stroke="none", sw=2.0, rx=0.0, fo=1.0):
    x0, y0 = _kep_x(p0[0]), _kep_y(p0[1])
    w = max(2.0, min(float(w), W - LE - x0))
    h = max(2.0, min(float(h), H - LE - y0))
    ex = (' rx="%s"' % _f(rx)) if rx > 0 else ""
    if fo < 1.0:
        ex += ' fill-opacity="%.2f"' % fo
    if stroke != "none":
        ex += ' stroke="%s" stroke-width="%s"' % (stroke, _f(sw))
    return '<rect x="%s" y="%s" width="%s" height="%s" fill="%s"%s/>' % (_f(x0), _f(y0), _f(w), _f(h), fill, ex)


def _mui_ten(p1, p2, mau, w=2.8, dau=10.0):
    goc = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
    a = (_kep_x(p2[0] - dau * math.cos(goc - 0.45)), _kep_y(p2[1] - dau * math.sin(goc - 0.45)))
    b = (_kep_x(p2[0] - dau * math.cos(goc + 0.45)), _kep_y(p2[1] - dau * math.sin(goc + 0.45)))
    pe = (_kep_x(p2[0] - 0.72 * dau * math.cos(goc)), _kep_y(p2[1] - 0.72 * dau * math.sin(goc)))
    return _line(p1, pe, mau, w) + _poly([p2, a, b], mau)


def _ve_nguoi_que(x, y, s, mau_net, dau=(0, -40), co=(0, -21), hong=(0, 14),
                  tay_l=((-18, -6), (-26, 12)), tay_r=((18, -6), (26, 12)),
                  chan_l=((-10, 32), (-16, 52)), chan_r=((10, 32), (16, 52)),
                  bieu_cam="cuoi", khan="cam"):
    """Khung người que Story Math thống nhất: đầu nét sáng trên nền tối, khăn cổ nhấn màu, dáng mềm mại."""
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    sw = max(2.2, 3.6 * s)
    out = _ellipse(p(hong[0], 56), 28 * s, 7 * s, MAU["bong"])
    # Thân và hai chân gộp thành một đường path liên tục (tọa độ tuyệt đối M/L) để nét gọn và luôn đạt diện tích hình T2
    p_co, p_hong = p(*co), p(*hong)
    p_cl0, p_cl1 = p(*chan_l[0]), p(*chan_l[1])
    p_cr0, p_cr1 = p(*chan_r[0]), p(*chan_r[1])
    d_than = "M %s %s L %s %s L %s %s L %s %s M %s %s L %s %s L %s %s" % (
        _f(p_co[0]), _f(p_co[1]), _f(p_hong[0]), _f(p_hong[1]),
        _f(p_cl0[0]), _f(p_cl0[1]), _f(p_cl1[0]), _f(p_cl1[1]),
        _f(p_hong[0]), _f(p_hong[1]), _f(p_cr0[0]), _f(p_cr0[1]), _f(p_cr1[0]), _f(p_cr1[1]),
    )
    out += '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (
        d_than, mau_net, _f(sw),
    )
    out += _line(p(co[0], co[1] + 5), p(*tay_l[0]), mau_net, sw) + _line(p(*tay_l[0]), p(*tay_l[1]), mau_net, sw)
    out += _line(p(co[0], co[1] + 5), p(*tay_r[0]), mau_net, sw) + _line(p(*tay_r[0]), p(*tay_r[1]), mau_net, sw)
    # Điểm nhấn cổ áo / khăn Story Math
    out += _circle(p(co[0], co[1] + 5), 4.2 * s, _m(khan, "cam"), MAU["nen"], max(1.0, 1.4 * s))
    # Đầu + biểu cảm
    h_pt = p(*dau)
    r_dau = 16.5 * s
    out += _circle(h_pt, r_dau, MAU["nen"], mau_net, sw)
    eye_l = p(dau[0] - 5.2, dau[1] - 2.5)
    eye_r = p(dau[0] + 5.2, dau[1] - 2.5)
    if bieu_cam == "hoan_ho":
        # Mắt cười hình chữ ^
        for ex, ey in (eye_l, eye_r):
            out += '<path d="M %s %s Q %s %s %s %s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (
                _f(ex - 3 * s), _f(ey + 1 * s), _f(ex), _f(ey - 4 * s), _f(ex + 3 * s), _f(ey + 1 * s), mau_net, _f(max(1.6, 2.2 * s))
            )
        m1, mc, m2 = p(dau[0] - 6, dau[1] + 4), p(dau[0], dau[1] + 12), p(dau[0] + 6, dau[1] + 4)
        out += '<path d="M %s %s Q %s %s %s %s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (
            _f(m1[0]), _f(m1[1]), _f(mc[0]), _f(mc[1]), _f(m2[0]), _f(m2[1]), _m("la"), _f(max(1.8, 2.4 * s))
        )
    elif bieu_cam == "gai_dau":
        out += _circle(eye_l, 2.1 * s, mau_net) + _circle(eye_r, 2.1 * s, mau_net)
        # Miệng phân vân lượn sóng
        m1, m2 = p(dau[0] - 5, dau[1] + 6), p(dau[0] + 5, dau[1] + 4)
        out += _line(m1, m2, MAU["ket"], max(1.6, 2.2 * s))
    elif bieu_cam == "canh_bao":
        out += _circle(eye_l, 2.4 * s, MAU["do"]) + _circle(eye_r, 2.4 * s, MAU["do"])
        out += _ellipse(p(dau[0], dau[1] + 6.5), 3.6 * s, 4.4 * s, MAU["nen"], MAU["do"], max(1.6, 2.0 * s))
    elif bieu_cam == "aha":
        out += _circle(eye_l, 2.4 * s, MAU["ket"]) + _circle(eye_r, 2.4 * s, MAU["ket"])
        m1, mc, m2 = p(dau[0] - 5.5, dau[1] + 4.5), p(dau[0], dau[1] + 10.5), p(dau[0] + 5.5, dau[1] + 4.5)
        out += '<path d="M %s %s Q %s %s %s %s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (
            _f(m1[0]), _f(m1[1]), _f(mc[0]), _f(mc[1]), _f(m2[0]), _f(m2[1]), MAU["ket"], _f(max(1.8, 2.3 * s))
        )
    else:
        out += _circle(eye_l, 2.1 * s, mau_net) + _circle(eye_r, 2.1 * s, mau_net)
        m1, mc, m2 = p(dau[0] - 5, dau[1] + 4.5), p(dau[0], dau[1] + 9.5), p(dau[0] + 5, dau[1] + 4.5)
        out += '<path d="M %s %s Q %s %s %s %s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (
            _f(m1[0]), _f(m1[1]), _f(mc[0]), _f(mc[1]), _f(m2[0]), _f(m2[1]), mau_net, _f(max(1.6, 2.2 * s))
        )
    return out


# ==============================================================================
# NHÓM 1: 5 NHÂN VẬT NGƯỜI QUE STORY MATH
# ==============================================================================

def nguoi_que_chi_bang(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Người que cầm que chỉ lên bảng phấn mini (giảng đề / chốt công thức)."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "nhan")
    out = ""
    # Bảng mini bên phải có chiều sâu 2.5D
    out += _rect(p(4, -50), 72 * s, 54 * s, MAU["bong"], rx=6 * s)
    out += _rect(p(0, -54), 72 * s, 54 * s, MAU["nen_intro"], mc, max(1.8, 2.6 * s), rx=6 * s)
    # Thanh phấn đáy bảng
    out += _rect(p(-2, 0), 76 * s, 6 * s, MAU["ket_toi"], MAU["ket"], max(1.2, 1.6 * s), rx=2 * s)
    # Các dòng phấn đồ họa trên bảng
    out += _line(p(10, -38), p(56, -38), MAU["la"], max(1.8, 2.6 * s))
    out += _line(p(10, -25), p(44, -25), MAU["chu_mo"], max(1.6, 2.2 * s))
    out += _line(p(10, -13), p(60, -13), MAU["ket"], max(1.8, 2.6 * s))
    out += _circle(p(58, -25), 5 * s, MAU["nhan_toi"], mc, max(1.4, 2.0 * s))
    # Người que bên trái + que chỉ chéo lên bảng
    out += _ve_nguoi_que(
        x - 42 * s, y, s, MAU["chu"],
        dau=(0, -38), co=(0, -19), hong=(0, 15),
        tay_l=((-15, -2), (-20, 14)),
        tay_r=((18, -10), (34, -20)),
        chan_l=((-9, 34), (-14, 53)),
        chan_r=((9, 34), (15, 53)),
        bieu_cam="cuoi", khan=mau or "la",
    )
    out += _line(p(-8, -20), p(24, -36), MAU["ket"], max(1.8, 2.4 * s))
    out += _circle(p(24, -36), 3.0 * s, MAU["ket"])
    if gia_tri is not None and str(gia_tri).strip():
        out += _pill(x + 36 * s, y - 72 * s, gia_tri, s, vien=mau or "la", toi_da=16)
    if nhan:
        out += _pill(x, y + 74 * s, nhan, s, vien=mau or "nhan")
    return '<g data-manh="nguoi_que_chi_bang">' + out + "</g>"


def nguoi_que_gai_dau(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Người que gãi đầu suy nghĩ kèm bong bóng dấu hỏi hổ phách."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "ket")
    out = _ve_nguoi_que(
        x - 10 * s, y + 6 * s, s, MAU["chu"],
        dau=(-3, -38), co=(0, -19), hong=(2, 15),
        tay_l=((-16, 0), (-10, 16)),
        tay_r=((22, -26), (12, -46)),
        chan_l=((-9, 34), (-13, 52)),
        chan_r=((11, 34), (17, 52)),
        bieu_cam="gai_dau", khan=mau or "ket",
    )
    # Chuỗi chấm suy nghĩ dẫn tới dấu hỏi
    out += _circle(p(22, -40), 3.2 * s, mc)
    out += _circle(p(32, -49), 4.6 * s, mc)
    # Đám mây/vòng tròn hỏi lớn (vẽ dấu ? bằng vector path để luôn sắc nét mọi scale)
    qb = p(46, -54)
    out += _circle(qb, 18 * s, MAU["nen"], mc, max(2.0, 2.8 * s))
    if gia_tri is not None and str(gia_tri).strip():
        out += _pill(qb[0], qb[1], gia_tri, s, vien=mau or "ket", mau_chu="ket", toi_da=10)
    else:
        q1, q2, q3, q4 = p(40, -60), p(46, -68), p(53, -59), p(46, -50)
        out += '<path d="M %s %s C %s %s %s %s %s %s L %s %s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (
            _f(q1[0]), _f(q1[1]), _f(q2[0]), _f(q2[1]), _f(q3[0]), _f(q3[1]), _f(q4[0]), _f(q4[1]),
            _f(q4[0]), _f(q4[1] + 3 * s), mc, _f(max(2.2, 3.2 * s))
        )
        out += _circle(p(46, -42), 2.3 * s, mc)
    if nhan:
        out += _pill(x, y + 76 * s, nhan, s, vien=mau or "ket")
    return '<g data-manh="nguoi_que_gai_dau">' + out + "</g>"


def nguoi_que_aha(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Người que bừng sáng ý tưởng (Aha!) với bóng đèn phát tia phía trên."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "ket")
    # Vầng sáng & tia bóng đèn
    lb = p(28, -56)
    out = _circle(lb, 21 * s, mc, "none", fo=0.18)
    for ang in (-145, -110, -70, -35, 10, 170):
        rad = math.radians(ang)
        r1, r2 = 17.0 * s, 26.0 * s
        out += _line(
            (_kep_x(lb[0] + r1 * math.cos(rad)), _kep_y(lb[1] + r1 * math.sin(rad))),
            (_kep_x(lb[0] + r2 * math.cos(rad)), _kep_y(lb[1] + r2 * math.sin(rad))),
            mc, max(1.8, 2.5 * s),
        )
    # Thân bóng đèn + đui đèn
    out += _circle(lb, 12.5 * s, MAU["ket"], MAU["chu"], max(1.6, 2.2 * s), fo=0.92)
    out += _rect((lb[0] - 5 * s, lb[1] + 10.5 * s), 10 * s, 6.5 * s, MAU["cu"], MAU["chu_mo"], max(1.2, 1.6 * s), rx=2 * s)
    out += _line((lb[0] - 3 * s, lb[1] + 3 * s), (lb[0] + 3 * s, lb[1] + 3 * s), MAU["nen"], max(1.5, 2.0 * s))
    # Người que giơ tay chỉ lên hào hứng
    out += _ve_nguoi_que(
        x - 14 * s, y + 10 * s, s, MAU["chu"],
        dau=(0, -36), co=(0, -17), hong=(0, 16),
        tay_l=((-18, -4), (-22, 12)),
        tay_r=((18, -16), (26, -34)),
        chan_l=((-10, 34), (-16, 52)),
        chan_r=((10, 34), (16, 52)),
        bieu_cam="aha", khan=mau or "ket",
    )
    if gia_tri is not None and str(gia_tri).strip():
        out += _pill(x + 28 * s, y - 96 * s, gia_tri, s, vien=mau or "ket", mau_chu="ket", toi_da=16)
    if nhan:
        out += _pill(x, y + 78 * s, nhan, s, vien=mau or "ket")
    return '<g data-manh="nguoi_que_aha">' + out + "</g>"


def nguoi_que_canh_bao(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Người que cảnh báo cái bẫy kèm biển tam giác chấm than màu đỏ san hô."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "do")
    out = _ve_nguoi_que(
        x - 32 * s, y + 6 * s, s, MAU["chu"],
        dau=(-4, -36), co=(-2, -17), hong=(2, 16),
        tay_l=((-18, -18), (-22, -32)),
        tay_r=((16, -16), (22, -28)),
        chan_l=((-10, 34), (-16, 52)),
        chan_r=((12, 34), (18, 52)),
        bieu_cam="canh_bao", khan=mau or "do",
    )
    # Biển cảnh báo tam giác 2.5D bên phải
    tri_sh = [p(38, -40), p(68, 12), p(8, 12)]
    tri = [p(34, -44), p(64, 8), p(4, 8)]
    out += _poly(tri_sh, MAU["bong"])
    out += _poly(tri, MAU["do_toi"], mc, max(2.2, 3.2 * s), fo=0.92)
    # Dấu chấm than vector trong tam giác
    out += _line(p(34, -28), p(34, -9), MAU["chu"], max(2.8, 4.4 * s))
    out += _circle(p(34, -1), 3.0 * s, MAU["chu"])
    if gia_tri is not None and str(gia_tri).strip():
        out += _pill(x + 34 * s, y - 62 * s, gia_tri, s, vien=mau or "do", mau_chu="do", toi_da=16)
    if nhan:
        out += _pill(x, y + 76 * s, nhan, s, vien=mau or "do")
    return '<g data-manh="nguoi_que_canh_bao">' + out + "</g>"


def nguoi_que_hoan_ho(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Người que giơ hai tay chữ V ăn mừng chiến thắng kèm pháo sáng xanh mint."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "la")
    out = ""
    # Pháo giấy & tia chúc mừng
    for dx, dy, r, col in (
        (-48, -44, 4.0, mc), (48, -42, 4.0, MAU["ket"]),
        (-36, -60, 3.2, MAU["nhan"]), (36, -60, 3.2, mc),
        (0, -68, 4.5, MAU["ket"]),
    ):
        out += _circle(p(dx, dy), r * s, col)
    # Dấu tích hoàn thành nổi ở góc trên phải
    badge = p(44, -18)
    out += _circle(badge, 14 * s, MAU["la_toi"], mc, max(1.8, 2.6 * s))
    out += '<path d="M %s %s L %s %s L %s %s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (
        _f(badge[0] - 6 * s), _f(badge[1]), _f(badge[0] - 1.5 * s), _f(badge[1] + 5 * s),
        _f(badge[0] + 7 * s), _f(badge[1] - 5 * s), MAU["chu"], _f(max(2.0, 3.0 * s))
    )
    # Người que nhảy ăn mừng
    out += _ve_nguoi_que(
        x - 6 * s, y + 4 * s, s, MAU["chu"],
        dau=(0, -38), co=(0, -19), hong=(0, 12),
        tay_l=((-18, -24), (-32, -44)),
        tay_r=((18, -24), (32, -44)),
        chan_l=((-14, 30), (-24, 46)),
        chan_r=((14, 30), (24, 46)),
        bieu_cam="hoan_ho", khan=mau or "la",
    )
    if gia_tri is not None and str(gia_tri).strip():
        out += _pill(x, y - 78 * s, gia_tri, s, vien=mau or "la", mau_chu="la", toi_da=16)
    if nhan:
        out += _pill(x, y + 76 * s, nhan, s, vien=mau or "la")
    return '<g data-manh="nguoi_que_hoan_ho">' + out + "</g>"


# ==============================================================================
# NHÓM 2: 6 MÔ HÌNH TOÁN THỰC TẾ (THUC_TE)
# ==============================================================================

def be_nuoc_muc_chat_long(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Bể kính 2.5D có mực chất lỏng thay đổi theo `gia_tri` (0..1 hoặc phần trăm)."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "nhan")
    mc_toi = _toi(mau, "nhan")
    muc = 0.62
    phu_chu = ""
    if isinstance(gia_tri, dict):
        muc = float(gia_tri.get("muc", 0.62))
        phu_chu = str(gia_tri.get("nhan") or gia_tri.get("don_vi") or "")
    elif isinstance(gia_tri, (int, float)):
        val = float(gia_tri)
        muc = val / 100.0 if val > 1.0 else val
    elif isinstance(gia_tri, str) and gia_tri.strip():
        phu_chu = gia_tri.strip()
    muc = max(0.10, min(0.92, muc))

    # Tọa độ bể 2.5D (mặt trước [-52..26, -34..46], chiều sâu +28, -20)
    dx_d, dy_d = 28.0, -20.0
    A, B = p(-52, 46), p(26, 46)
    C, D = p(26 + dx_d, 46 + dy_d), p(-52 + dx_d, 46 + dy_d)
    E, F = p(-52, -34), p(26, -34)
    G, Hh = p(26 + dx_d, -34 + dy_d), p(-52 + dx_d, -34 + dy_d)

    out = _poly([p(-44, 54), p(34, 54), p(62, 34), p(-16, 34)], MAU["bong"])
    # Nét khuất đáy & cạnh sau bể
    out += _line(D, A, MAU["chu_mo"], max(1.2, 1.6 * s), dut=True, mo=0.55)
    out += _line(D, C, MAU["chu_mo"], max(1.2, 1.6 * s), dut=True, mo=0.55)
    out += _line(D, Hh, MAU["chu_mo"], max(1.2, 1.6 * s), dut=True, mo=0.55)
    # Khối chất lỏng theo mực `muc`
    y_mat = 46.0 - 80.0 * muc
    W1, W2 = p(-50, y_mat), p(24, y_mat)
    W3, W4 = p(24 + dx_d, y_mat + dy_d), p(-50 + dx_d, y_mat + dy_d)
    B1, B2, B3 = p(-50, 45), p(24, 45), p(24 + dx_d, 45 + dy_d)
    out += _poly([B2, B3, W3, W2], mc_toi, "none", fo=0.88)
    out += _poly([B1, B2, W2, W1], mc, "none", fo=0.52)
    out += _poly([W1, W2, W3, W4], mc, MAU["chu"], max(1.2, 1.6 * s), fo=0.78, so=0.65)
    # Thành kính bể
    out += _poly([B, C, G, F], MAU["mat"], MAU["chu"], max(1.6, 2.2 * s), fo=0.22)
    out += _poly([A, B, F, E], MAU["mat"], MAU["chu"], max(1.6, 2.2 * s), fo=0.14)
    out += _poly([E, F, G, Hh], "none", MAU["chu"], max(1.6, 2.2 * s))
    # Vạch chia mực trên thành trước
    for k in (1, 2, 3):
        yk = 46.0 - 20.0 * k
        out += _line(p(-52, yk), p(-42, yk), MAU["chu_mo"], max(1.4, 1.8 * s), mo=0.85)
    if phu_chu:
        out += _pill(x + 2 * s, y - 76 * s, phu_chu, s, vien=mau or "nhan", toi_da=16)
    if nhan:
        out += _pill(x, y + 74 * s, nhan, s, vien=mau or "nhan")
    return '<g data-manh="be_nuoc_muc_chat_long">' + out + "</g>"


def xe_di_chuyen(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Mô hình xe ô tô di chuyển kèm vệt gió, mặt đường nét đứt và mũi tên vận tốc."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "cam")
    mc_toi = _toi(mau, "cam")
    out = ""
    # Mặt đường & vạch kẻ
    out += _line(p(-74, 34), p(74, 34), MAU["cu"], max(2.0, 2.8 * s))
    out += _line(p(-64, 42), p(64, 42), MAU["chu_mo"], max(1.4, 2.0 * s), dut=True, mo=0.65)
    # Bóng dưới gầm
    out += _ellipse(p(4, 33), 50 * s, 6 * s, MAU["bong"])
    # Vệt gió phía sau xe
    out += _line(p(-72, -4), p(-52, -4), MAU["nhan"], max(1.8, 2.4 * s), mo=0.8)
    out += _line(p(-66, 8), p(-50, 8), MAU["nhan"], max(1.6, 2.0 * s), mo=0.6)
    # Thân xe 2.5D
    than = [p(-46, 20), p(-46, -2), p(-28, -4), p(-14, -24), p(20, -24), p(38, -4), p(56, 2), p(58, 20)]
    out += _poly(than, mc, MAU["chu"], max(1.8, 2.4 * s))
    # Dải gầm tối
    out += _poly([p(-46, 20), p(58, 20), p(56, 12), p(-46, 12)], mc_toi, "none", fo=0.85)
    # Kính lái & cửa sổ
    kinh = [p(-22, -4), p(-11, -19), p(17, -19), p(30, -4)]
    out += _poly(kinh, MAU["mat_toi"], MAU["nhan"], max(1.4, 2.0 * s))
    out += _line(p(3, -19), p(3, -4), MAU["chu_mo"], max(1.4, 1.8 * s))
    # Đèn pha sáng
    out += _circle(p(54, 6), 4.0 * s, MAU["ket"])
    # Hai bánh xe
    for bx in (-24, 32):
        out += _circle(p(bx, 22), 12.5 * s, MAU["nen"], MAU["chu"], max(2.0, 2.8 * s))
        out += _circle(p(bx, 22), 5.0 * s, MAU["nhan"])
    # Mũi tên vận tốc phía trên
    out += _mui_ten(p(-26, -42), p(44, -42), MAU["la"], max(2.0, 2.8 * s), 10 * s)
    if gia_tri is not None and str(gia_tri).strip():
        out += _pill(x + 6 * s, y - 64 * s, gia_tri, s, vien="la", mau_chu="la", toi_da=16)
    if nhan:
        out += _pill(x, y + 70 * s, nhan, s, vien=mau or "cam")
    return '<g data-manh="xe_di_chuyen">' + out + "</g>"


def dong_ho_thoi_gian(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Đồng hồ hình học có cung quét khoảng thời gian (hỗ trợ gia_tri=(giờ, phút) hoặc phút)."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "nhan")
    gio, phut = 10.0, 15.0
    if isinstance(gia_tri, (tuple, list)) and len(gia_tri) >= 2:
        gio, phut = float(gia_tri[0]), float(gia_tri[1])
    elif isinstance(gia_tri, (int, float)):
        phut = float(gia_tri) % 60.0
        gio = 12.0 + float(gia_tri) / 60.0
    r = 46.0 * s
    c = p(0, -4)
    # Bóng & vỏ đồng hồ
    out = _circle(p(6, 4), r, MAU["bong"])
    out += _circle(c, r + 5 * s, MAU["mat_toi"], mc, max(2.0, 3.0 * s))
    out += _circle(c, r, MAU["nen"], MAU["cu"], max(1.2, 1.6 * s))
    # Cung quét thời gian từ 12h tới kim phút
    a_min = -90.0 + (phut % 60.0) * 6.0
    span = (a_min - (-90.0)) % 360.0
    if span < 15.0:
        span = 90.0
        a_min = 0.0
    rq = r * 0.78
    x0, y0 = _kep_x(c[0]), _kep_y(c[1] - rq)
    x1 = _kep_x(c[0] + rq * math.cos(math.radians(a_min)))
    y1 = _kep_y(c[1] + rq * math.sin(math.radians(a_min)))
    lon = 1 if span > 180.0 else 0
    out += '<path d="M %s %s L %s %s A %s %s 0 %d 1 %s %s Z" fill="%s" fill-opacity="0.30" stroke="%s" stroke-width="%s"/>' % (
        _f(c[0]), _f(c[1]), _f(x0), _f(y0), _f(rq), _f(rq), lon, _f(x1), _f(y1),
        MAU["ket"], MAU["ket"], _f(max(1.2, 1.6 * s)),
    )
    # 12 vạch giờ
    for k in range(12):
        ang = math.radians(-90.0 + k * 30.0)
        r_in = r * (0.76 if k % 3 == 0 else 0.85)
        r_out = r * 0.93
        out += _line(
            (_kep_x(c[0] + r_in * math.cos(ang)), _kep_y(c[1] + r_in * math.sin(ang))),
            (_kep_x(c[0] + r_out * math.cos(ang)), _kep_y(c[1] + r_out * math.sin(ang))),
            MAU["chu"] if k % 3 == 0 else MAU["cu"], max(1.4, (2.6 if k % 3 == 0 else 1.6) * s),
        )
    # Kim giờ & kim phút
    a_h = math.radians(-90.0 + ((gio % 12.0) + phut / 60.0) * 30.0)
    a_m = math.radians(a_min)
    out += _line(c, (_kep_x(c[0] + r * 0.48 * math.cos(a_h)), _kep_y(c[1] + r * 0.48 * math.sin(a_h))), MAU["chu"], max(2.4, 3.6 * s))
    out += _line(c, (_kep_x(c[0] + r * 0.72 * math.cos(a_m)), _kep_y(c[1] + r * 0.72 * math.sin(a_m))), MAU["ket"], max(1.8, 2.6 * s))
    out += _circle(c, 4.5 * s, MAU["ket"], MAU["nen"], max(1.0, 1.5 * s))
    if isinstance(gia_tri, str) and gia_tri.strip():
        out += _pill(x, y - 70 * s, gia_tri, s, vien="ket", mau_chu="ket", toi_da=16)
    if nhan:
        out += _pill(x, y + 72 * s, nhan, s, vien=mau or "nhan")
    return '<g data-manh="dong_ho_thoi_gian">' + out + "</g>"


def bieu_do_loi_nhuan(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Biểu đồ cột lợi nhuận kết hợp đường xu hướng tăng và chấm cực đại."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "la")
    vals = [34.0, 56.0, 74.0, 94.0]
    if isinstance(gia_tri, (list, tuple)) and len(gia_tri) >= 2:
        vals = [max(1.0, float(v)) for v in gia_tri[:5]]
    vmax = max(vals) or 1.0
    # Nền thẻ biểu đồ
    out = _rect(p(-64, -48), 128 * s, 96 * s, MAU["nen"], MAU["cu_toi"], max(1.4, 1.8 * s), rx=10 * s, fo=0.88)
    # Lưới ngang mờ
    for gy in (-24, -4, 16):
        out += _line(p(-50, gy), p(54, gy), MAU["cu_toi"], max(1.0, 1.2 * s), mo=0.6)
    # Hai trục tọa độ
    out += _mui_ten(p(-50, 36), p(58, 36), MAU["chu_mo"], max(1.6, 2.2 * s), 8 * s)
    out += _mui_ten(p(-50, 36), p(-50, -40), MAU["chu_mo"], max(1.6, 2.2 * s), 8 * s)
    # Cột dữ liệu
    n = len(vals)
    step = 94.0 / n
    bw = min(18.0, step * 0.58)
    peaks = []
    idx_max = vals.index(max(vals))
    for i, v in enumerate(vals):
        h_bar = 62.0 * (v / vmax)
        bx = -42.0 + i * step + (step - bw) / 2.0
        by = 36.0 - h_bar
        col = MAU["ket"] if i == idx_max else mc
        out += _rect(p(bx, by), bw * s, h_bar * s, col, MAU["chu"], max(1.0, 1.4 * s), rx=3 * s, fo=0.84)
        peaks.append(p(bx + bw / 2.0, by - 6.0))
    # Đường xu hướng nối đỉnh
    d_path = "M " + " L ".join("%s %s" % (_f(pt[0]), _f(pt[1])) for pt in peaks)
    out += '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (
        d_path, MAU["ket"], _f(max(2.0, 2.8 * s))
    )
    for i, pt in enumerate(peaks):
        out += _circle(pt, (4.8 if i == idx_max else 3.2) * s, MAU["ket"] if i == idx_max else MAU["chu"], MAU["nen"], max(1.0, 1.4 * s))
    if isinstance(gia_tri, str) and gia_tri.strip():
        out += _pill(x, y - 66 * s, gia_tri, s, vien="ket", mau_chu="ket", toi_da=16)
    if nhan:
        out += _pill(x, y + 72 * s, nhan, s, vien=mau or "la")
    return '<g data-manh="bieu_do_loi_nhuan">' + out + "</g>"


def hop_chu_nhat_3d(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Hình hộp chữ nhật 2.5D có cạnh khuất nét đứt, mặt sáng/tối và vạch đo."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "nhan")
    mc_toi = _toi(mau, "nhan")
    dx_d, dy_d = 30.0, -22.0
    A, B = p(-52, 40), p(28, 40)
    C, D = p(28 + dx_d, 40 + dy_d), p(-52 + dx_d, 40 + dy_d)
    E, F = p(-52, -26), p(28, -26)
    G, Hh = p(28 + dx_d, -26 + dy_d), p(-52 + dx_d, -26 + dy_d)

    out = _poly([p(-44, 49), p(36, 49), p(66, 27), p(-14, 27)], MAU["bong"])
    # Nét khuất
    out += _line(D, A, MAU["chu_mo"], max(1.4, 1.8 * s), dut=True, mo=0.7)
    out += _line(D, C, MAU["chu_mo"], max(1.4, 1.8 * s), dut=True, mo=0.7)
    out += _line(D, Hh, MAU["chu_mo"], max(1.4, 1.8 * s), dut=True, mo=0.7)
    # Ba mặt thấy (phải tối, trên sáng, trước bán trong suốt)
    out += _poly([B, C, G, F], mc_toi, MAU["chu"], max(1.8, 2.2 * s))
    out += _poly([E, F, G, Hh], mc, MAU["chu"], max(1.8, 2.2 * s), fo=0.88)
    out += _poly([A, B, F, E], mc, MAU["chu"], max(1.8, 2.2 * s), fo=0.48)
    # Vạch gióng kích thước ngắn (dài / cao)
    out += _mui_ten(p(-52, 50), p(28, 50), MAU["ket"], max(1.4, 2.0 * s), 7 * s)
    out += _mui_ten(p(-62, 40), p(-62, -26), MAU["la"], max(1.4, 2.0 * s), 7 * s)
    if gia_tri is not None:
        if isinstance(gia_tri, (list, tuple)):
            gt_s = " × ".join(str(v) for v in gia_tri[:3])
        else:
            gt_s = str(gia_tri)
        if gt_s.strip():
            out += _pill(x + 4 * s, y - 74 * s, gt_s, s, vien="ket", mau_chu="ket", toi_da=18)
    if nhan:
        out += _pill(x, y + 74 * s, nhan, s, vien=mau or "nhan")
    return '<g data-manh="hop_chu_nhat_3d">' + out + "</g>"


def tui_tien_lai_suat(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Túi tiền lãi suất 2.5D kèm chồng xu vàng, ký hiệu % và mũi tên tăng trưởng."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "ket")
    mc_toi = _toi(mau, "ket")
    # Bóng nền
    out = _ellipse(p(-4, 46), 44 * s, 9 * s, MAU["bong"])
    # Phần miệng túi xòe phía trên
    mieng = [p(-26, -42), p(-10, -48), p(4, -42), p(-6, -24), p(-18, -24)]
    out += _poly(mieng, mc_toi, MAU["chu"], max(1.6, 2.2 * s))
    # Thân túi bầu bĩnh (path lệnh tuyệt đối C)
    p_top_l, p_top_r = p(-22, -24), p(-2, -24)
    p_bot_l, p_bot_r = p(-48, 42), p(24, 42)
    c1, c2 = p(-52, -4), p(-54, 34)
    c3, c4 = p(28, 34), p(26, -4)
    d_tui = "M %s %s C %s %s %s %s %s %s Q %s %s %s %s C %s %s %s %s %s %s Z" % (
        _f(p_top_l[0]), _f(p_top_l[1]),
        _f(c1[0]), _f(c1[1]), _f(c2[0]), _f(c2[1]), _f(p_bot_l[0]), _f(p_bot_l[1]),
        _f(p(-12, 52)[0]), _f(p(-12, 52)[1]), _f(p_bot_r[0]), _f(p_bot_r[1]),
        _f(c3[0]), _f(c3[1]), _f(c4[0]), _f(c4[1]), _f(p_top_r[0]), _f(p_top_r[1]),
    )
    out += '<path d="%s" fill="%s" fill-opacity="0.90" stroke="%s" stroke-width="%s" stroke-linejoin="round"/>' % (
        d_tui, mc, MAU["chu"], _f(max(1.8, 2.4 * s))
    )
    # Dây thắt cổ túi
    out += _rect(p(-25, -26), 26 * s, 7 * s, MAU["cam"], MAU["nen"], max(1.2, 1.6 * s), rx=3 * s)
    # Biểu tượng % vector rõ nét trên bụng túi
    out += _circle(p(-20, 4), 5.2 * s, MAU["nen"], MAU["chu"], max(1.4, 2.0 * s))
    out += _circle(p(-4, 24), 5.2 * s, MAU["nen"], MAU["chu"], max(1.4, 2.0 * s))
    out += _line(p(-24, 26), p(0, 2), MAU["nen"], max(2.2, 3.2 * s))
    # Chồng 3 đồng xu 2.5D bên phải
    for i in range(3):
        cy_c = 38 - i * 10
        out += _ellipse(p(42, cy_c + 4), 16 * s, 5.5 * s, mc_toi, MAU["chu"], max(1.2, 1.5 * s))
        out += _ellipse(p(42, cy_c), 16 * s, 5.5 * s, MAU["ket"], MAU["chu"], max(1.2, 1.5 * s))
    # Mũi tên lãi kép tăng lên
    out += _mui_ten(p(24, -10), p(56, -40), MAU["la"], max(2.0, 2.8 * s), 9 * s)
    if gia_tri is not None and str(gia_tri).strip():
        gt = ("+%s%%" % gia_tri) if isinstance(gia_tri, (int, float)) else str(gia_tri)
        out += _pill(x + 20 * s, y - 72 * s, gt, s, vien="la", mau_chu="la", toi_da=16)
    if nhan:
        out += _pill(x, y + 74 * s, nhan, s, vien=mau or "ket")
    return '<g data-manh="tui_tien_lai_suat">' + out + "</g>"


# ==============================================================================
# NHÓM 3: 5 MÔ HÌNH XÁC SUẤT (XAC_SUAT)
# ==============================================================================

_CHAM_XUC_XAC = {
    1: [(0, 0)],
    2: [(-1, -1), (1, 1)],
    3: [(-1, -1), (0, 0), (1, 1)],
    4: [(-1, -1), (1, -1), (-1, 1), (1, 1)],
    5: [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)],
    6: [(-1, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (1, 1)],
}


def xuc_xac_1_6(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Xúc xắc 2.5D hiển thị đúng mặt 1..6 chấm theo `gia_tri` (mặc định mặt 5)."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "nhan")
    mc_toi = _toi(mau, "nhan")
    try:
        mat = int(gia_tri) if gia_tri is not None else 5
    except (TypeError, ValueError):
        mat = 5
    mat = max(1, min(6, mat))

    dx_d, dy_d = 20.0, -16.0
    out = _poly([p(-38, 46), p(34, 46), p(54, 30), p(-18, 30)], MAU["bong"])
    # Mặt trên & mặt bên phải tạo khối lập phương 2.5D
    out += _poly([p(-42, -32), p(28, -32), p(28 + dx_d, -32 + dy_d), p(-42 + dx_d, -32 + dy_d)], mc, MAU["chu"], max(1.6, 2.2 * s), fo=0.82)
    out += _poly([p(28, -32), p(28 + dx_d, -32 + dy_d), p(28 + dx_d, 38 + dy_d), p(28, 38)], mc_toi, MAU["chu"], max(1.6, 2.2 * s))
    # Chấm phụ mặt trên (gợi khối 3D)
    out += _ellipse(p(3, -40), 5 * s, 2.6 * s, MAU["nen"])
    # Mặt trước chính (nền tối sắc nét)
    out += _rect(p(-42, -32), 70 * s, 70 * s, MAU["mat_toi"], MAU["chu"], max(2.0, 2.6 * s), rx=10 * s)
    # Vẽ đúng chấm mặt 1..6
    r_dot = (8.0 if mat == 1 else 6.0) * s
    for ix, iy in _CHAM_XUC_XAC[mat]:
        col = MAU["do"] if (mat in (1, 4) or (ix == 0 and iy == 0)) else MAU["ket"]
        out += _circle(p(-7 + ix * 19.0, 3 + iy * 19.0), r_dot, col, MAU["chu"], max(1.0, 1.3 * s))
    if nhan:
        out += _pill(x, y + 72 * s, nhan, s, vien=mau or "nhan")
    return '<g data-manh="xuc_xac_1_6">' + out + "</g>"


def dong_xu(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Đồng xu 2.5D ánh kim với mặt Sấp (S) / Ngửa (N) rõ nét."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "ket")
    mc_toi = _toi(mau, "ket")
    mat_chu = str(gia_tri).strip() if gia_tri is not None and str(gia_tri).strip() else "N"
    r = 42.0 * s
    out = _ellipse(p(6, 48), 38 * s, 8 * s, MAU["bong"])
    # Độ dày viền xu 2.5D
    out += _circle(p(7, 4), r, mc_toi, MAU["chu_mo"], max(1.4, 2.0 * s))
    # Mặt xu chính
    c = p(-2, -2)
    out += _circle(c, r, mc, MAU["chu"], max(2.0, 2.8 * s))
    # Vòng khắc chìm bên trong
    out += _circle(c, r * 0.78, MAU["nen"], MAU["ket"], max(1.6, 2.2 * s))
    # Vệt ánh kim
    out += _line(p(-22, -26), p(-8, -32), MAU["chu"], max(1.8, 2.4 * s), mo=0.7)
    # Chữ mặt đồng xu nằm trong hộp tối tâm xu (an toàn tuyệt đối cho kiem_tham_my)
    out += _pill(c[0], c[1], mat_chu, s, vien=mau or "ket", co_goc=26, mau_chu="ket", toi_da=6)
    if nhan:
        out += _pill(x, y + 72 * s, nhan, s, vien=mau or "ket")
    return '<g data-manh="dong_xu">' + out + "</g>"


def _path_bo_goc(x0, y0, w, h, r):
    x0, y0 = _kep_x(x0), _kep_y(y0)
    x1, y1 = _kep_x(x0 + w), _kep_y(y0 + h)
    rr = min(float(r), (x1 - x0) / 2.0, (y1 - y0) / 2.0)
    return (
        "M %s %s L %s %s Q %s %s %s %s L %s %s Q %s %s %s %s L %s %s Q %s %s %s %s L %s %s Q %s %s %s %s Z"
        % (
            _f(x0 + rr), _f(y0), _f(x1 - rr), _f(y0), _f(x1), _f(y0), _f(x1), _f(y0 + rr),
            _f(x1), _f(y1 - rr), _f(x1), _f(y1), _f(x1 - rr), _f(y1),
            _f(x0 + rr), _f(y1), _f(x0), _f(y1), _f(x0), _f(y1 - rr),
            _f(x0), _f(y0 + rr), _f(x0), _f(y0), _f(x0 + rr), _f(y0),
        )
    )


def la_bai_the_so(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Lá bài / thẻ đánh số 2.5D nền tối viền neon cho bài toán rút thẻ & bộ bài."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "nhan")
    so_the = str(gia_tri).strip() if gia_tri is not None and str(gia_tri).strip() else "7"
    # Bóng & lá phụ lấp ló phía sau
    p_sh = p(-28, -42)
    out = '<path d="%s" fill="%s"/>' % (_path_bo_goc(p_sh[0], p_sh[1], 70 * s, 96 * s, 10 * s), MAU["bong"])
    p_bk = p(-22, -48)
    out += '<path d="%s" fill="%s" fill-opacity="0.85" stroke="%s" stroke-width="%s"/>' % (
        _path_bo_goc(p_bk[0], p_bk[1], 66 * s, 92 * s, 10 * s), MAU["mat"], MAU["cu"], _f(max(1.4, 1.8 * s))
    )
    # Lá bài chính (path bo góc tuyệt đối)
    p_fr = p(-38, -44)
    out += '<path d="%s" fill="%s" stroke="%s" stroke-width="%s"/>' % (
        _path_bo_goc(p_fr[0], p_fr[1], 68 * s, 94 * s, 10 * s), MAU["nen"], mc, _f(max(2.2, 3.0 * s))
    )
    out += _rect(p(-32, -38), 56 * s, 82 * s, MAU["mat_toi"], mc, max(1.0, 1.4 * s), rx=6 * s, fo=0.65)
    # Hình thoi trang trí hai góc đối diện
    for gx, gy in ((-22, -28), (14, 34)):
        out += _poly([p(gx, gy - 5), p(gx + 4.5, gy), p(gx, gy + 5), p(gx - 4.5, gy)], MAU["ket"])
    # Giá trị thẻ lớn ở giữa
    out += _pill(x - 4 * s, y + 3 * s, so_the, s, vien=mau or "nhan", co_goc=28, mau_chu="chu", toi_da=8)
    if nhan:
        out += _pill(x, y + 74 * s, nhan, s, vien=mau or "nhan")
    return '<g data-manh="la_bai_the_so">' + out + "</g>"


def hop_bi_mau(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Hộp kính mở nắp chứa các viên bi nhiều màu theo `gia_tri` (vd {'do':3, 'nhan':2, 'ket':1})."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "nhan")
    # Chuẩn hóa danh sách màu bi
    bi_mau = []
    map_ten = {"do": "do", "xanh": "nhan", "xanh_duong": "nhan", "cyan": "nhan", "la": "la", "xanh_la": "la", "vang": "ket", "cam": "cam", "trang": "chu"}
    if isinstance(gia_tri, dict):
        for k, v in gia_tri.items():
            try:
                bi_mau.extend([map_ten.get(str(k).lower(), str(k))] * max(0, int(v)))
            except (TypeError, ValueError):
                pass
    elif isinstance(gia_tri, (list, tuple)):
        for it in gia_tri:
            if isinstance(it, (list, tuple)) and len(it) >= 2:
                bi_mau.extend([map_ten.get(str(it[0]).lower(), str(it[0]))] * max(0, int(it[1])))
            elif isinstance(it, str):
                bi_mau.append(map_ten.get(it.lower(), it))
    if not bi_mau:
        bi_mau = ["do", "do", "do", "nhan", "nhan", "ket"]
    bi_mau = bi_mau[:9]

    dx_d, dy_d = 20.0, -14.0
    out = _poly([p(-44, 48), p(36, 48), p(56, 34), p(-24, 34)], MAU["bong"])
    # Mặt sau & đáy hộp
    out += _poly([p(-48 + dx_d, -26 + dy_d), p(32 + dx_d, -26 + dy_d), p(32 + dx_d, 42 + dy_d), p(-48 + dx_d, 42 + dy_d)], MAU["mat_toi"], MAU["cu"], max(1.4, 1.8 * s), fo=0.75)
    out += _poly([p(-48, 42), p(32, 42), p(32 + dx_d, 42 + dy_d), p(-48 + dx_d, 42 + dy_d)], MAU["mat"], MAU["cu"], max(1.4, 1.8 * s), fo=0.85)
    # Xếp các viên bi theo tầng từ dưới lên (tối đa 3 bi/hàng)
    r_bi = 11.2 * s
    for idx, col_k in enumerate(bi_mau):
        hang = idx // 3
        cot = idx % 3
        bx = -28.0 + cot * 23.0 + (6.0 if hang % 2 else 0.0)
        by = 28.0 - hang * 20.0
        bp = p(bx, by)
        out += _circle(bp, r_bi, _m(col_k, "do"), MAU["nen"], max(1.2, 1.6 * s))
        # Đốm phản quang trên viên bi
        out += _circle(p(bx - 3.5, by - 3.8), 3.0 * s, MAU["chu"], "none", fo=0.75)
    # Thành kính trước & mặt bên phải bán trong suốt
    out += _poly([p(32, -26), p(32 + dx_d, -26 + dy_d), p(32 + dx_d, 42 + dy_d), p(32, 42)], mc, MAU["chu"], max(1.6, 2.2 * s), fo=0.22)
    out += _poly([p(-48, -26), p(32, -26), p(32, 42), p(-48, 42)], mc, MAU["chu"], max(1.8, 2.4 * s), fo=0.14)
    # Miệng hộp sáng
    out += _poly([p(-48, -26), p(32, -26), p(32 + dx_d, -26 + dy_d), p(-48 + dx_d, -26 + dy_d)], "none", mc, max(1.8, 2.4 * s))
    if nhan:
        out += _pill(x, y + 72 * s, nhan, s, vien=mau or "nhan")
    return '<g data-manh="hop_bi_mau">' + out + "</g>"


def nut_cay_xac_suat(x, y, scale=1.0, nhan="", gia_tri=None, mau=None):
    """Nút sơ đồ cây xác suất phân nhánh (2 hoặc 3 nhánh) có trọng số xác suất."""
    s = float(scale or 1.0)
    p = lambda dx, dy: _pt(x, y, dx, dy, s)
    mc = _m(mau, "nhan")
    nhanh = [("2/5", "la"), ("3/5", "cam")]
    if isinstance(gia_tri, (list, tuple)) and len(gia_tri) >= 2:
        mau_mac = ["la", "cam", "ket"]
        nhanh = []
        for idx, it in enumerate(gia_tri[:3]):
            if isinstance(it, (list, tuple)) and len(it) >= 2:
                nhanh.append((str(it[0]), str(it[1])))
            else:
                nhanh.append((str(it), mau_mac[idx % len(mau_mac)]))

    goc = p(-54, 0)
    n_br = len(nhanh)
    ys_la = [-34.0, 34.0] if n_br == 2 else [-42.0, 0.0, 42.0]
    out = ""
    # Vẽ nhánh cong mềm mượt (path C tuyệt đối)
    for (xs_txt, col_k), ly in zip(nhanh, ys_la):
        la_pt = p(48, ly)
        c1, c2 = p(-14, 0), p(4, ly)
        out += '<path d="M %s %s C %s %s %s %s %s %s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (
            _f(goc[0]), _f(goc[1]), _f(c1[0]), _f(c1[1]), _f(c2[0]), _f(c2[1]), _f(la_pt[0]), _f(la_pt[1]),
            _m(col_k, "la"), _f(max(2.0, 3.0 * s)),
        )
        out += _circle(la_pt, 10.5 * s, MAU["nen"], _m(col_k, "la"), max(2.0, 2.8 * s))
        out += _circle(la_pt, 4.2 * s, _m(col_k, "la"))
        # Viên thuốc xác suất nằm gọn giữa nhánh
        mid = p(2, ly)
        out += _pill(mid[0], mid[1], xs_txt, s * 0.92, vien=col_k, co_goc=22, mau_chu=col_k, toi_da=10)
    # Nút gốc phát sáng
    out += _circle(goc, 16 * s, mc, "none", fo=0.22)
    out += _circle(goc, 11.5 * s, MAU["nen"], mc, max(2.2, 3.0 * s))
    out += _circle(goc, 4.8 * s, mc)
    if nhan:
        out += _pill(x, y + 74 * s, nhan, s, vien=mau or "nhan")
    return '<g data-manh="nut_cay_xac_suat">' + out + "</g>"


# ==============================================================================
# DANH MỤC 16 MẢNH GHÉP (EXPORT AN TOÀN CHO SANDBOX & KIỂM THỬ)
# ==============================================================================

DANH_SACH_MANH = (
    # 5 nhân vật người que Story Math
    "nguoi_que_chi_bang",
    "nguoi_que_gai_dau",
    "nguoi_que_aha",
    "nguoi_que_canh_bao",
    "nguoi_que_hoan_ho",
    # 6 mô hình Toán thực tế (THUC_TE)
    "be_nuoc_muc_chat_long",
    "xe_di_chuyen",
    "dong_ho_thoi_gian",
    "bieu_do_loi_nhuan",
    "hop_chu_nhat_3d",
    "tui_tien_lai_suat",
    # 5 mô hình Xác suất (XAC_SUAT)
    "xuc_xac_1_6",
    "dong_xu",
    "la_bai_the_so",
    "hop_bi_mau",
    "nut_cay_xac_suat",
)

KHO_MANH = {
    "nguoi_que_chi_bang": nguoi_que_chi_bang,
    "nguoi_que_gai_dau": nguoi_que_gai_dau,
    "nguoi_que_aha": nguoi_que_aha,
    "nguoi_que_canh_bao": nguoi_que_canh_bao,
    "nguoi_que_hoan_ho": nguoi_que_hoan_ho,
    "be_nuoc_muc_chat_long": be_nuoc_muc_chat_long,
    "xe_di_chuyen": xe_di_chuyen,
    "dong_ho_thoi_gian": dong_ho_thoi_gian,
    "bieu_do_loi_nhuan": bieu_do_loi_nhuan,
    "hop_chu_nhat_3d": hop_chu_nhat_3d,
    "tui_tien_lai_suat": tui_tien_lai_suat,
    "xuc_xac_1_6": xuc_xac_1_6,
    "dong_xu": dong_xu,
    "la_bai_the_so": la_bai_the_so,
    "hop_bi_mau": hop_bi_mau,
    "nut_cay_xac_suat": nut_cay_xac_suat,
}
