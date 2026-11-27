#!/usr/bin/env python3
"""Kiểm thử Đợt 2: Kho 16 mảnh ghép SVG + hộp cát tu_sinh_svg + Auto Cover Frame + Bình luận ghim biến thể.

Chạy kiểm thử:
    python -X utf8 scripts/test_kho_manh_svg.py

Xuất ảnh bảng tổng hợp 4x4 (out/san-pham-mau/manh_ghep_svg_preview.png):
    python -X utf8 scripts/test_kho_manh_svg.py --xuat-preview
"""
import html
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import chuanbi as cb  # noqa: E402
import dang_video as dv  # noqa: E402
import kho_manh_svg as km  # noqa: E402
import tu_sinh_svg as ts  # noqa: E402

MANH_BAT_BUOC = (
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

DEMO_THAM_SO = {
    "nguoi_que_chi_bang": {"nhom": "Người que", "nhan": "Chỉ bảng", "gia_tri": "V = x²h", "mau": "nhan"},
    "nguoi_que_gai_dau": {"nhom": "Người que", "nhan": "Gãi đầu", "gia_tri": None, "mau": "ket"},
    "nguoi_que_aha": {"nhom": "Người que", "nhan": "Ý tưởng Aha!", "gia_tri": "Mẹo hay", "mau": "ket"},
    "nguoi_que_canh_bao": {"nhom": "Người que", "nhan": "Cảnh báo bẫy", "gia_tri": "Coi chừng!", "mau": "do"},
    "nguoi_que_hoan_ho": {"nhom": "Người que", "nhan": "Hoan hô!", "gia_tri": "Chính xác", "mau": "la"},
    "be_nuoc_muc_chat_long": {"nhom": "THUC_TE", "nhan": "Bể chất lỏng", "gia_tri": {"muc": 0.65, "nhan": "65% đầy"}, "mau": "nhan"},
    "xe_di_chuyen": {"nhom": "THUC_TE", "nhan": "Xe di chuyển", "gia_tri": "v = 60 km/h", "mau": "cam"},
    "dong_ho_thoi_gian": {"nhom": "THUC_TE", "nhan": "Đồng hồ", "gia_tri": (10, 20), "mau": "nhan"},
    "bieu_do_loi_nhuan": {"nhom": "THUC_TE", "nhan": "Biểu đồ lợi nhuận", "gia_tri": [30, 52, 74, 96], "mau": "la"},
    "hop_chu_nhat_3d": {"nhom": "THUC_TE", "nhan": "Hộp chữ nhật 3D", "gia_tri": ("a", "b", "h"), "mau": "nhan"},
    "tui_tien_lai_suat": {"nhom": "THUC_TE", "nhan": "Túi tiền lãi suất", "gia_tri": "+8%/năm", "mau": "ket"},
    "xuc_xac_1_6": {"nhom": "XAC_SUAT", "nhan": "Xúc xắc 1–6", "gia_tri": 5, "mau": "nhan"},
    "dong_xu": {"nhom": "XAC_SUAT", "nhan": "Đồng xu S/N", "gia_tri": "N", "mau": "ket"},
    "la_bai_the_so": {"nhom": "XAC_SUAT", "nhan": "Lá bài / Thẻ số", "gia_tri": "A♠", "mau": "nhan"},
    "hop_bi_mau": {"nhom": "XAC_SUAT", "nhan": "Hộp bi màu", "gia_tri": {"do": 3, "nhan": 2, "ket": 1}, "mau": "nhan"},
    "nut_cay_xac_suat": {"nhom": "XAC_SUAT", "nhan": "Nút cây xác suất", "gia_tri": [("2/5", "la"), ("3/5", "cam")], "mau": "nhan"},
}


def _tim_chromium():
    goc_rem = ROOT / "node_modules" / ".remotion"
    if goc_rem.is_dir():
        for pat in ("**/chrome.exe", "**/chrome-headless-shell.exe", "**/chrome", "**/chrome-headless-shell"):
            for p in goc_rem.glob(pat):
                if p.is_file():
                    return p
    for ten in ("chromium", "chromium-browser", "google-chrome", "msedge"):
        found = shutil.which(ten)
        if found:
            return Path(found)
    for p_win in (
        Path("C:/Program Files/Google/Chrome/Application/chrome.exe"),
        Path("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"),
    ):
        if p_win.is_file():
            return p_win
    return None


def xuat_bang_preview(tep_ra=None):
    """Xuất ảnh bảng tổng hợp lưới 4x4 hiển thị rõ tên và hình của cả 16 mảnh ghép SVG."""
    dich = Path(tep_ra) if tep_ra else (ROOT / "out" / "san-pham-mau" / "manh_ghep_svg_preview.png")
    dich.parent.mkdir(parents=True, exist_ok=True)

    mau_nhom = {
        "Người que": ("#3BF29A", "#146B47"),
        "THUC_TE": ("#5CE1E6", "#1F6F80"),
        "XAC_SUAT": ("#FFB547", "#8A5A16"),
    }
    cards = []
    for idx, ten in enumerate(MANH_BAT_BUOC):
        cfg = DEMO_THAM_SO[ten]
        ham = getattr(km, ten)
        # Render mảnh ở giữa viewBox 800x540 -> cắt khung 320x250 quanh tâm (400, 270)
        svg_manh = ham(400, 276, scale=1.18, nhan="", gia_tri=cfg["gia_tri"], mau=cfg["mau"])
        badge_col, badge_bg = mau_nhom[cfg["nhom"]]
        cards.append(
            f"""
            <div class="card">
              <div class="card-head">
                <span class="idx">{idx + 1:02d}</span>
                <span class="badge" style="color:{badge_col};border-color:{badge_col}55;background:{badge_bg}44">{html.escape(cfg['nhom'])}</span>
              </div>
              <div class="stage">
                <svg viewBox="235 145 330 245" width="310" height="230" xmlns="http://www.w3.org/2000/svg">
                  {svg_manh}
                </svg>
              </div>
              <div class="card-foot">
                <div class="fn-name">{html.escape(ten)}</div>
                <div class="fn-sub">{html.escape(cfg['nhan'])}</div>
              </div>
            </div>
            """
        )

    pc_path = ROOT / "phong_cach.json"
    ten_th = "Story Math"
    if pc_path.is_file():
        try:
            ten_th = json.loads(pc_path.read_text(encoding="utf-8")).get("thuongHieu", {}).get("ten") or ten_th
        except Exception:
            pass

    font_path = (ROOT / "public" / "fonts" / "BeVietnamPro-Bold.ttf").resolve()
    font_face = ""
    if font_path.is_file():
        font_face = f"@font-face {{ font-family: 'Be Vietnam Pro'; src: url('{font_path.as_uri()}'); font-weight: 700; }}"

    html_doc = f"""<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<style>
  {font_face}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1680px;
    height: 1560px;
    background: radial-gradient(circle at 18% 8%, #102B3A 0%, #071513 55%, #061019 100%);
    color: #E9EEF5;
    font-family: 'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif;
    padding: 36px 40px 32px;
    overflow: hidden;
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1.5px solid rgba(92, 225, 230, 0.28);
  }}
  .title {{
    font-size: 34px;
    font-weight: 800;
    letter-spacing: -0.4px;
    color: #E9EEF5;
  }}
  .title span {{ color: #3BF29A; }}
  .subtitle {{
    font-size: 16px;
    color: #B8C4D6;
    margin-top: 6px;
  }}
  .legend {{
    display: flex;
    gap: 12px;
    font-size: 14px;
    font-weight: 700;
  }}
  .legend-item {{
    padding: 6px 14px;
    border-radius: 999px;
    border: 1.5px solid rgba(255,255,255,0.16);
    background: rgba(11, 26, 38, 0.86);
  }}
  .grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }}
  .card {{
    background: linear-gradient(180deg, rgba(22, 50, 74, 0.52) 0%, rgba(11, 26, 38, 0.94) 100%);
    border: 1.5px solid rgba(92, 225, 230, 0.24);
    border-radius: 16px;
    padding: 14px 16px 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 332px;
  }}
  .card-head {{
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .idx {{
    font-size: 14px;
    font-weight: 800;
    color: #7C8DA6;
    font-variant-numeric: tabular-nums;
  }}
  .badge {{
    font-size: 12px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid;
  }}
  .stage {{
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 50% 52%, rgba(92, 225, 230, 0.08), rgba(7, 21, 19, 0.35));
    border-radius: 12px;
    margin: 10px 0;
  }}
  .card-foot {{
    text-align: center;
  }}
  .fn-name {{
    font-family: Consolas, 'Cascadia Mono', monospace;
    font-size: 16px;
    font-weight: 700;
    color: #5CE1E6;
  }}
  .fn-sub {{
    font-size: 13px;
    color: #B8C4D6;
    margin-top: 2px;
  }}
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title"><span>{html.escape(ten_th)}</span> · Kho 16 mảnh ghép SVG (Đợt 2)</div>
      <div class="subtitle">scripts/kho_manh_svg.py — Chuẩn hộp cát tu_sinh_svg · Tọa độ tuyệt đối · Đồng bộ bảng màu phong_cach.json</div>
    </div>
    <div class="legend">
      <span class="legend-item" style="color:#3BF29A;border-color:#3BF29A66">Người que (5)</span>
      <span class="legend-item" style="color:#5CE1E6;border-color:#5CE1E666">THUC_TE (6)</span>
      <span class="legend-item" style="color:#FFB547;border-color:#FFB54766">XAC_SUAT (5)</span>
    </div>
  </div>
  <div class="grid">
    {''.join(cards)}
  </div>
</body>
</html>
"""

    with tempfile.TemporaryDirectory(prefix="preview_svg_") as td:
        html_tep = Path(td) / "preview.html"
        html_tep.write_text(html_doc, encoding="utf-8")
        chup_js = Path(td) / "chup.mjs"
        chup_js.write_text(
            "import fs from 'node:fs';\n"
            "import {pathToFileURL} from 'node:url';\n"
            "const {openBrowser} = await import(pathToFileURL(process.argv[4]).href);\n"
            "const b = await openBrowser('chrome');\n"
            "try {\n"
            "  const p = await b.newPage({context: null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: () => {}, onLog: () => {}});\n"
            "  const c = p._client();\n"
            "  await c.send('Page.enable');\n"
            "  await c.send('Emulation.setDeviceMetricsOverride', {width: 1680, height: 1560, deviceScaleFactor: 1, mobile: false});\n"
            "  await c.send('Page.navigate', {url: process.argv[2]});\n"
            "  await p.bringToFront();\n"
            "  await new Promise((r) => setTimeout(r, 800));\n"
            "  const res = await c.send('Page.captureScreenshot', {\n"
            "    format: 'png',\n"
            "    fromSurface: true,\n"
            "    clip: {x: 0, y: 0, width: 1680, height: 1560, scale: 1},\n"
            "  });\n"
            "  const b64 = (res && res.value && res.value.data) || (res && res.data) || '';\n"
            "  if (!b64) throw new Error('Empty screenshot payload');\n"
            "  fs.writeFileSync(process.argv[3], Buffer.from(b64, 'base64'));\n"
            "} finally {\n"
            "  await b.close({silent: true});\n"
            "}\n",
            encoding="utf-8",
        )
        renderer_mjs = ROOT / "node_modules" / "@remotion" / "renderer" / "dist" / "esm" / "index.mjs"
        node_bin = shutil.which("node")
        if node_bin and renderer_mjs.is_file():
            r = subprocess.run(
                [node_bin, str(chup_js), html_tep.resolve().as_uri(), str(dich.resolve()), str(renderer_mjs.resolve())],
                cwd=str(ROOT), capture_output=True, text=True, timeout=45,
            )
            if r.returncode != 0 or not dich.is_file() or dich.stat().st_size == 0:
                raise RuntimeError("Remotion Chromium chụp preview lỗi: %s" % (r.stderr or r.stdout)[-300:])
        else:
            chrome = _tim_chromium()
            if not chrome:
                raise RuntimeError("Không tìm thấy trình duyệt Chromium để xuất ảnh PNG preview")
            cmd = [str(chrome), "--headless=new", "--disable-gpu", "--no-sandbox", "--window-size=1680,1560",
                   f"--screenshot={dich.resolve()}", html_tep.resolve().as_uri()]
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if r.returncode != 0 or not dich.is_file() or dich.stat().st_size == 0:
                raise RuntimeError("Chromium chụp preview lỗi: %s" % (r.stderr or r.stdout)[-300:])
    print("Đã xuất ảnh bảng 4x4 16 mảnh ghép SVG ->", dich.as_posix())
    return dich


def chay_kiem_thu():
    dat = 0
    hong = 0

    def kiem(ten, fn):
        nonlocal dat, hong
        try:
            fn()
            dat += 1
            print("  ✓", ten)
        except Exception as e:
            hong += 1
            print("  ✗", ten, "—", str(e).split("\n")[0][:220])

    print("1. Kiểm tra đủ 16 mảnh ghép SVG & cú pháp SVG hợp lệ")

    def _du_16_manh():
        assert len(km.DANH_SACH_MANH) == 16, f"có {len(km.DANH_SACH_MANH)} mảnh"
        assert tuple(km.DANH_SACH_MANH) == MANH_BAT_BUOC, "danh sách mảnh không khớp"
        for ten in MANH_BAT_BUOC:
            ham = getattr(km, ten, None)
            assert callable(ham), f"thiếu hàm {ten}"
            # Gọi mặc định
            s0 = ham(400, 270)
            assert isinstance(s0, str) and s0.startswith("<g") and s0.endswith("</g>"), f"{ten}: không trả <g>...</g>"
            ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">' + s0 + "</svg>")
            ts.kiem_svg(s0)
            # Gọi đầy đủ tham số (x, y, scale, nhan, gia_tri, mau)
            cfg = DEMO_THAM_SO[ten]
            s1 = ham(400, 270, scale=0.95, nhan=cfg["nhan"], gia_tri=cfg["gia_tri"], mau=cfg["mau"])
            ts.kiem_svg(s1)

    kiem("đủ 16 mảnh ghép SVG render chuỗi hợp lệ (mặc định + đủ tham số)", _du_16_manh)

    print("2. Chạy cả 16 mảnh ghép TRONG hộp cát tu_sinh_svg.py (namespace trực tiếp + import)")

    def _hop_cat_truc_tiep():
        # Chia 16 mảnh thành 4 kịch bản x 4 bước để mỗi mảnh đều qua kiểm thẩm mỹ + can_hinh=True
        for nhom_i in range(0, 16, 4):
            bon = MANH_BAT_BUOC[nhom_i : nhom_i + 4]
            dong = []
            for b_i, ten in enumerate(bon):
                cfg = DEMO_THAM_SO[ten]
                gt_repr = repr(cfg["gia_tri"])
                dong.append(
                    f"        {{'buoc': {b_i}, 'svg': {ten}(400, 270, scale=1.0, nhan={cfg['nhan']!r}, gia_tri={gt_repr}, mau={cfg['mau']!r}), 'hieu_ung': 'moc', 'nhom': 'm'}},"
                )
            ma = "def ve():\n    return [\n" + "\n".join(dong) + "\n    ]\n"
            ds = ts.dung(ma, 4, tham_my=True, can_hinh=True)
            assert len(ds) == 4, f"nhóm {nhom_i}: chỉ ra {len(ds)} lớp"

    def _hop_cat_import_va_bao_mat():
        ma_imp = (
            "import kho_manh_svg as km\n"
            "def ve():\n"
            "    return [\n"
            "        {'buoc': 0, 'svg': km.nguoi_que_chi_bang(240, 270, 1.0, 'Đề bài'), 'hieu_ung': 'moc', 'nhom': 'a'},\n"
            "        {'buoc': 1, 'svg': km.be_nuoc_muc_chat_long(520, 270, 1.0, 'Bể nước', 0.7), 'hieu_ung': 'no', 'nhom': 'a'},\n"
            "        {'buoc': 2, 'svg': km.xuc_xac_1_6(400, 270, 1.0, 'Mặt 6', 6), 'hieu_ung': 'sang', 'nhom': 'a'},\n"
            "    ]\n"
        )
        ds = ts.dung(ma_imp, 3, tham_my=True, can_hinh=True)
        assert len(ds) == 3

        # Kiểm tra giữ nguyên 4 luật chặn bảo mật cốt lõi: TS_IMPORT, TS_CAM, TS_QUA_GIO, TS_SVG_CAM
        def _phai_chan(ma_doc, tien_to, timeout=1.0):
            try:
                ts.dung(ma_doc, 3) if timeout >= 5 else ts.chay_hop_cat(ma_doc, timeout=timeout)
            except ts.LoiTuSinh as e:
                assert str(e).startswith(tien_to), f"mong {tien_to}, nhận: {e}"
                return
            raise AssertionError(f"không chặn được {tien_to}")

        _phai_chan("import os\ndef ve(): return []", "TS_IMPORT")
        _phai_chan("def ve():\n    open('x', 'w')\n    return []", "TS_CAM")
        _phai_chan("def ve():\n    while True:\n        pass\n", "TS_QUA_GIO", timeout=1.0)
        _phai_chan("def ve():\n    return [{'buoc': 0, 'svg': '<g><script>alert(1)</script></g>'}]", "TS_SVG_CAM")
        # kho_manh_svg không làm lộ open/os trong sandbox
        try:
            ts.chay_hop_cat("import kho_manh_svg as km\ndef ve():\n    return [{'buoc': 0, 'svg': str(km.open)}]\n")
            raise AssertionError("kho_manh_svg.open không được tồn tại trong sandbox")
        except ts.LoiTuSinh:
            pass

    kiem("16 mảnh ghép gọi trực tiếp trong hộp cát qua đủ kiem_svg + kiem_tham_my + can_hinh", _hop_cat_truc_tiep)
    kiem("import kho_manh_svg hợp lệ & giữ nguyên 100% luật chặn TS_IMPORT / TS_CAM / TS_QUA_GIO / TS_SVG_CAM", _hop_cat_import_va_bao_mat)

    print("3. Kiểm tra Auto Cover Frame (non-blocking)")

    def _auto_cover():
        props_mau = {
            "id": "TT-DEMO-01",
            "fps": 30,
            "tongFrame": 1500,  # 50s
            "anhBiaDau": "bia/TT.png",
            "khung4tang": {"mocCau": {"tieuDe": "TEST"}, "tChot": 36.5, "buoc": [{"t": 3.5}, {"t": 18.0}, {"t": 36.5}]},
            "outro": {"batDau": 1350, "soFrame": 150},
        }
        moc = cb.chon_moc_cover(props_mau)
        assert 3.5 < moc < 44.8, f"mốc cover không tránh Intro/Outro: {moc}"
        # Chế độ --gia-lap -> bỏ qua an toàn, không lỗi
        assert cb.trich_anh_bia_tu_dong("khong_ton_tai.mp4", props_mau, "out", gia_lap=True) is None
        # Thiếu tệp video -> ghi cảnh báo non-blocking, trả None
        assert cb.trich_anh_bia_tu_dong("khong_ton_tai_12345.mp4", props_mau, "out", gia_lap=False) is None
        # Video thật ngắn tạo bằng ffmpeg -> trích thành công cover_<ID>.png
        if shutil.which("ffmpeg"):
            with tempfile.TemporaryDirectory(prefix="cover_test_") as td:
                vid = Path(td) / "TT-DEMO-01.mp4"
                r = subprocess.run(
                    ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x0B1A26:s=360x640:d=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(vid)],
                    capture_output=True, text=True, timeout=30,
                )
                assert r.returncode == 0 and vid.is_file()
                ra = cb.trich_anh_bia_tu_dong(vid, {"id": "TT-DEMO-01", "fps": 30, "tongFrame": 60}, td, gia_lap=False)
                assert ra is not None and Path(ra).name == "cover_TT-DEMO-01.png" and Path(ra).stat().st_size > 0

    kiem("chon_moc_cover né Intro/Outro & trich_anh_bia_tu_dong non-blocking (gia-lap / lỗi / ffmpeg thật)", _auto_cover)

    print("4. Kiểm tra bình luận ghim biến thể (lọc sạch <= 180 ký tự, rỗng an toàn, non-blocking API)")

    def _binh_luan_ghim():
        # Chuỗi rỗng / None -> ""
        assert dv.lam_sach_binh_luan_ghim("") == ""
        assert dv.lam_sach_binh_luan_ghim(None) == ""
        assert dv.lam_sach_binh_luan_ghim("   \n\t  ") == ""
        # Lọc ký tự lỗi + Evergreen năm sinh/năm thi
        sach = dv.lam_sach_binh_luan_ghim("Đố 2k9 ôn THPT 2027:\nNếu $V = 64\\,m^3$ thì `x` bằng bao nhiêu?\x00", lop="12")
        assert len(sach) <= 180
        assert "2k9" not in sach.lower() and "2027" not in sach
        assert "$" not in sach and "`" not in sach and "\n" not in sach and "\x00" not in sach
        # Cắt gọn <= 180 ký tự khi vượt dài
        dai = "Thử sức bài biến thể cho các bạn vừa xem xong video: " + "nếu thay thể tích bể nước thành 64 mét khối và giữ nguyên đáy hình vuông thì cạnh đáy tối ưu bằng bao nhiêu mét và tổng diện tích xung quanh là bao nhiêu? Bình luận đáp số của bạn bên dưới nhé!"
        assert len(dai) > 180
        gon = dv.lam_sach_binh_luan_ghim(dai, lop="12")
        assert 0 < len(gon) <= 180, f"độ dài sau cắt: {len(gon)}"
        # Bình luận rỗng -> không gọi API
        assert dv.dang_binh_luan_youtube({"Authorization": "Bearer x"}, "VID123", "") == ""
        # Giả lập API 403 & ngoại lệ mạng -> non-blocking tuyệt đối
        goc_req = dv.requests
        try:
            class _FakeRes:
                status_code = 403
                text = "insufficientPermissions"

            class _FakeReq403:
                @staticmethod
                def post(*a, **k):
                    return _FakeRes()

            dv.requests = _FakeReq403()
            gc1 = dv.dang_binh_luan_youtube({"Authorization": "Bearer x"}, "VID123", "Đố bạn đổi số 32 thành 64 thì x = ?")
            assert "403" in gc1

            class _FakeReqBoom:
                @staticmethod
                def post(*a, **k):
                    raise RuntimeError("network down")

            dv.requests = _FakeReqBoom()
            gc2 = dv.dang_binh_luan_youtube({"Authorization": "Bearer x"}, "VID123", "Đố bạn đổi số 32 thành 64 thì x = ?")
            assert "bỏ qua" in gc2
        finally:
            dv.requests = goc_req

    kiem("lam_sach_binh_luan_ghim (<= 180 ký tự, Evergreen, rỗng) & dang_binh_luan_youtube non-blocking", _binh_luan_ghim)

    print(f"\nTEST KHO MANH SVG (ĐỢT 2): {dat} đạt, {hong} hỏng")
    return 0 if hong == 0 else 1


if __name__ == "__main__":
    if "--xuat-preview" in sys.argv:
        xuat_bang_preview()
        sys.exit(0)
    sys.exit(chay_kiem_thu())
