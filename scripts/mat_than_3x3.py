#!/usr/bin/env python3
"""v91 — "MẮT THẦN AI": chốt kiểm lỗi nặng trên MP4 vừa ghép, chạy TRƯỚC khi tải lên Drive / vào hàng đăng.

  1. ffmpeg trích 9 khung mốc (hook, đề, 5 mốc giải - 2 mốc sát trước đáp án, đáp án, màn kết) -> lưới 3×3
     <id>_3x3.jpg (1080×1920, mỗi ô có số 1..9). Ghép bằng Pillow vì máy ghép chỉ có ffmpeg rút gọn của Remotion.
  2. Gửi DUY NHẤT ảnh lưới qua Gemini Flash (tái dùng GEMINI_KEYS / GEMINI_API_KEY + scripts/bophan1/goi_gemini.js:
     xoay key, né 404/429, tự đổi model) để tìm 4 lỗi nặng: cat_chu (chữ bị cắt/tràn khung), chong_chu (nhãn/chữ đè nhau),
     latex_tho (mã LaTeX thô như \\frac, $, ^{ }), lo_dap_an (đáp số hiện ở ô TRƯỚC ô đáp án).
  3. Ghi <ra>/mat_than.json: {dat, chay, loi:[{o, loai, mo_ta, nang}], ly_do, anh, o_dap_an}.

Không chặn khi chính Mắt thần không chạy được (thiếu key, hết hạn mức, lỗi mạng): ghi chay=false, dat=true + cảnh báo,
vì BP4 (kiem-tra-video.yml) vẫn chấm lưới trước khi video được DA_DUYET.

Cách dùng: python3 scripts/mat_than_3x3.py public/props.json out/ID.mp4 out/
Thử không gọi API: MAT_THAN_GIA_LAP=dat | loi  (loi = giả lập một lỗi nặng "lo_dap_an" ở ô 6)

v92 — thêm kiểm TẤT ĐỊNH (đo điểm ảnh, không cần API, chạy cả khi hết key) cho video khung 4 tầng:
  t2_trong (tầng 2 sân khấu 3D trống đen ở >= 2 ô giải), hinh_dung_im (hình 3D giống hệt nhau ở mọi ô giải),
  logo_sai (bài Toán mà tên/logo kênh là "Xác suất"). AI chấm thêm ma_tho (_, Omega, C(n,k), \\frac thô ở tiêu đề/thẻ),
  logo_sai, so_cat (con số bị cắt / tách đôi). Mọi loại trên đều là LỖI NẶNG.
"""
import base64
import json
import os
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
O_RONG, O_CAO = 360, 640
LOAI_LOI = ("cat_chu", "chong_chu", "latex_tho", "lo_dap_an", "ma_tho", "logo_sai", "so_cat", "t2_trong", "hinh_dung_im", "hinh_nho", "tran_day", "nhan_de")
TEN_LOI = {"hinh_nho": "Hình học quá nhỏ trong khung", "tran_day": "Chữ tràn xuống đáy (vùng an toàn)", "nhan_de": "Nhãn điểm đè nhau / đè nét",
           "cat_chu": "Cắt chữ / tràn khung", "chong_chu": "Chồng nhãn / chồng chữ", "latex_tho": "Mã LaTeX thô", "lo_dap_an": "Lộ đáp án sớm",
           "ma_tho": "Mã thô ở tiêu đề/thẻ", "logo_sai": "Logo/tên kênh sai chuyên mục", "so_cat": "Con số bị cắt lỗi",
           "t2_trong": "Tầng 2 trống đen (không có hình 3D)", "hinh_dung_im": "Hình 3D đứng im ở mọi khung"}
# Khung 4 tầng (src/khung4tang/vung.ts, an toàn TikTok): tầng 2 = y 288..1036 trên 1920 -> tỉ lệ trong ô lưới
T2_TREN, T2_DUOI = 398 / 1920.0, 1046 / 1920.0   # v96: bố cục an toàn TikTok 4 cạnh (src/khung4tang/vung.ts)
# v93: vùng mô hình 3D lúc Intro móc câu (src/khung4tang/IntroMocCau.tsx INTRO_SAN = y 540, cao 748)
INTRO_TREN, INTRO_DUOI = 560 / 1920.0, 1208 / 1920.0   # v96: INTRO_SAN = y 560, cao 648
# v94: hình phẳng chuẩn (scripts/manim/HinhPhangChuan.py, khung 9 x 16 đơn vị): vùng hình y 5,05..-0,75 -> tỉ lệ từ mép trên;
# đáy an toàn 14% (TikTok) không được có chữ
HP_HINH_TREN, HP_HINH_DUOI = (8 - 5.05) / 16.0, (8 + 0.75) / 16.0
HP_DAY = 0.86


def co_intro_moc_cau(p):
    """v93: video khung 4 tầng có Intro móc câu -> giây đại diện của intro (tính trong phần nội dung); không có -> None."""
    k4 = p.get("khung4tang") or {}
    if p.get("boCuc") != "4tang" or not k4.get("mocCau"):
        return None
    fps = float(p.get("fps") or 30)
    tong = float(k4.get("tongFrame") or p.get("tongFrame") or 0) / fps
    G = max(3.6, min(float(k4["mocCau"].get("giay") or 5), 5.0, tong * 0.4))
    return min(1.8, G * 0.4)


def lech_dau(p):
    fps = float(p.get("fps") or 30)
    return ((1 if p.get("anhBiaDau") else 0) + int((p.get("intro") or {}).get("lech") or 0)) / fps


def chon_moc(p, dai_video):
    """9 mốc (giây trong tệp MP4, nhãn). Ô 8 luôn là cảnh đáp án; ô 6, 7 là hai cảnh ngay trước đáp án (bắt lộ đáp án sớm)."""
    fps = float(p.get("fps") or 30)
    canh = p.get("canh") or []
    lech = lech_dau(p)
    gioi_han = max(0.0, dai_video - 0.3)

    def t_canh(c, ti):
        return min(lech + (c["batDau"] + c["soFrame"] * ti) / fps, gioi_han)

    if not canh:
        return [(gioi_han * (k + 0.5) / 9, "khung %d" % (k + 1)) for k in range(9)], 8
    i_da = next((i for i, c in enumerate(canh) if re.search(r"dap_an|ket_qua", str(c.get("loai") or ""))), len(canh) - 1)
    i_de = next((i for i, c in enumerate(canh) if str(c.get("loai") or "") == "de_bai"), min(1, len(canh) - 1))
    moc = [(t_canh(canh[0], 0.6), "hook"), (t_canh(canh[i_de], 0.85), "đề bài")]
    t_intro = co_intro_moc_cau(p)
    if t_intro is not None:   # v93: ô 1 = khung đại diện Intro móc câu (~1,8 s), KHÔNG bỏ trống những giây đầu
        moc[0] = (min(lech + t_intro, gioi_han), "intro móc câu")
    giua = list(range(i_de + 1, i_da)) or [i_de]
    # 5 mốc giải: 3 rải đều phần đầu + 2 cảnh sát trước đáp án; thiếu cảnh thì lấy nhiều thời điểm trong cùng cảnh
    sat = giua[-2:] if len(giua) >= 2 else giua * 2
    dau = giua[:-2] if len(giua) > 2 else giua
    chon = [dau[int(k * len(dau) / 3)] for k in range(3)] + sat
    ti_lap = {}
    for j in chon:
        ti_lap[j] = ti_lap.get(j, 0) + 1
    dem = {}
    for k, j in enumerate(chon):
        dem[j] = dem.get(j, 0) + 1
        ti = 0.85 if ti_lap[j] == 1 else 0.3 + 0.55 * (dem[j] - 1) / max(1, ti_lap[j] - 1)
        moc.append((t_canh(canh[j], ti), "giải %d" % (k + 1)))
    moc.append((t_canh(canh[i_da], 0.85), "đáp án"))
    o = p.get("outro")
    if o and o.get("batDau") is not None:
        moc.append((min(lech + (o["batDau"] + o["soFrame"] * 0.6) / fps, gioi_han), "màn kết"))
    else:
        moc.append((t_canh(canh[-1], 0.95), "cuối"))
    return moc[:9], 8


def do_dai(video):
    try:
        return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video],
                                    capture_output=True, text=True).stdout.strip())
    except (ValueError, FileNotFoundError, OSError):
        return 1e9


def tao_luoi(video, moc, dich):
    from PIL import Image, ImageDraw, ImageFont
    tam = tempfile.mkdtemp()

    def chup(item):
        k, (t, _) = item
        f = os.path.join(tam, "o%d.jpg" % k)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "%.3f" % t, "-i", video, "-frames:v", "1",
                        "-vf", "scale=%d:%d" % (O_RONG, O_CAO), "-threads", "1", f], check=True)
        return f

    with ThreadPoolExecutor(max_workers=4) as ex:
        tep = list(ex.map(chup, enumerate(moc)))
    anh_o = []
    luoi = Image.new("RGB", (O_RONG * 3, O_CAO * 3), (8, 12, 14))
    ve = ImageDraw.Draw(luoi)
    try:
        phong = ImageFont.truetype(os.path.join(GOC, "public", "fonts", "BeVietnamPro-Bold.ttf"), 26)
    except OSError:
        phong = ImageFont.load_default()
    for k, f in enumerate(tep):
        x, y = (k % 3) * O_RONG, (k // 3) * O_CAO
        if os.path.exists(f) and os.path.getsize(f) > 0:
            o = Image.open(f).convert("RGB").resize((O_RONG, O_CAO))
            anh_o.append(o)
            luoi.paste(o, (x, y))
        else:
            anh_o.append(None)
        # số ô + nhãn mốc (để AI và người xem chỉ đúng ô lỗi)
        ve.rectangle([x, y, x + 150, y + 38], fill=(0, 0, 0))
        ve.text((x + 8, y + 4), "%d · %s" % (k + 1, moc[k][1]), fill=(255, 214, 10), font=phong)
        ve.rectangle([x, y, x + O_RONG - 1, y + O_CAO - 1], outline=(60, 70, 80), width=2)
    luoi.save(dich, quality=84)
    for f in tep:
        try:
            os.remove(f)
        except OSError:
            pass
    tao_luoi.anh_o = anh_o   # ảnh từng ô (360×640) cho kiểm tất định
    return dich


def kiem_tat_dinh(p, anh_o, o_da):
    """v92: lỗi nặng đo được bằng điểm ảnh / props (không cần AI). Chỉ áp dụng video khung 4 tầng."""
    loi = []
    th = p.get("thuongHieu") or {}
    ten = str(th.get("ten") or "")
    if th.get("chuyenMuc") == "toan" and re.search(r"xác suất", ten, re.I):
        loi.append({"o": 1, "loai": "logo_sai", "mo_ta": "bài Toán nhưng tên kênh là \"%s\"" % ten, "nang": True})
    if th.get("chuyenMuc") == "toan" and re.search(r"(^|/)logo\.(png|webp|jpe?g)$", str(th.get("logo") or "")):
        loi.append({"o": 1, "loai": "logo_sai", "mo_ta": "bài Toán dùng logo.png (logo Xác suất), cần logo_toan.png hoặc logo chữ", "nang": True})
    if p.get("boCuc") == "hinh_phang" and anh_o:
        return loi + kiem_hinh_phang(p, anh_o, o_da)
    if p.get("boCuc") != "4tang" or not anh_o:
        return loi
    from PIL import ImageChops, ImageStat
    # v93: ô 1 là Intro móc câu -> vùng mô hình giữa màn hình không được đen (intro phải có hình 3D ngay từ giây 0)
    if co_intro_moc_cau(p) is not None and anh_o[0] is not None:
        im = anh_o[0].crop((0, int(O_CAO * INTRO_TREN), O_RONG, int(O_CAO * INTRO_DUOI))).convert("L")
        hist = im.histogram()
        if sum(hist[70:]) / float(max(1, sum(hist))) < 0.003:
            loi.append({"o": 1, "loai": "t2_trong", "mo_ta": "Intro móc câu không có hình 3D (vùng giữa màn hình đen)", "nang": True})
    y0, y1 = int(O_CAO * T2_TREN), int(O_CAO * T2_DUOI)
    giai = [k for k in range(1, min(o_da - 1, len(anh_o))) if anh_o[k] is not None]   # ô 2 .. ô trước đáp án (0-based)
    cat = {k: anh_o[k].crop((0, y0, O_RONG, y1)).convert("L") for k in giai}
    trong = []
    for k, im in cat.items():
        hist = im.histogram()
        sang = sum(hist[70:]) / float(max(1, sum(hist)))
        if sang < 0.003:
            trong.append(k)
    if len(trong) >= 2:
        loi.append({"o": trong[0] + 1, "loai": "t2_trong", "mo_ta": "tầng sân khấu 3D gần như đen ở ô %s" % ", ".join(str(k + 1) for k in trong), "nang": True})
    ds = [cat[k] for k in giai[1:]]   # bỏ ô đề bài, xét các ô giải
    if len(ds) >= 3 and len(trong) < len(giai):
        lech = [ImageStat.Stat(ImageChops.difference(a, b)).mean[0] for a, b in zip(ds, ds[1:])]
        if max(lech) < 1.2:
            loi.append({"o": giai[1] + 1, "loai": "hinh_dung_im", "mo_ta": "hình 3D giống hệt nhau ở mọi ô giải (lệch lớn nhất %.2f)" % max(lech), "nang": True})
    return loi


def kiem_hinh_phang(p, anh_o, o_da):
    """v94: luồng hình phẳng chuẩn - hình nhỏ (hộp sáng < 45% vùng hình ở >= 2 ô giải), chữ tràn đáy 14%, nhãn đè (bộ giải báo)."""
    loi = []
    giai = [k for k in range(1, min(o_da, len(anh_o))) if anh_o[k] is not None]
    nho, day = [], []
    for k in giai:
        im = anh_o[k].convert("L")
        y0, y1 = int(O_CAO * HP_HINH_TREN), int(O_CAO * HP_HINH_DUOI)
        hop = im.crop((0, y0, O_RONG, y1)).point(lambda v: 255 if v > 70 else 0).getbbox()
        if hop is None or ((hop[2] - hop[0]) / float(O_RONG) < 0.45 and (hop[3] - hop[1]) / float(y1 - y0) < 0.45):
            nho.append(k)
        dd = im.crop((0, int(O_CAO * HP_DAY), O_RONG, O_CAO)).histogram()
        if sum(dd[70:]) / float(max(1, sum(dd))) > 0.004:
            day.append(k)
    if len(nho) >= 2:
        loi.append({"o": nho[0] + 1, "loai": "hinh_nho", "mo_ta": "hình chiếm dưới 45%% vùng sân khấu ở ô %s" % ", ".join(str(k + 1) for k in nho), "nang": True})
    if day:
        loi.append({"o": day[0] + 1, "loai": "tran_day", "mo_ta": "có chữ/nét trong 14%% đáy ở ô %s" % ", ".join(str(k + 1) for k in day), "nang": True})
    vc = int((p.get("hinhPhangBoCuc") or {}).get("va_cham_nhan") or 0)
    if vc:
        loi.append({"o": 2, "loai": "nhan_de", "mo_ta": "bộ đặt nhãn báo %d nhãn chưa có chỗ trống" % vc, "nang": vc >= 2})
    return loi


def prompt_ai(p, o_da):
    dap = str(p.get("dapAn") or "").strip()
    chuyen = "Xác suất" if (p.get("thuongHieu") or {}).get("chuyenMuc") == "xac_suat" else "Toán (không phải Xác suất)"
    # v93: ô 1 là khung Intro móc câu -> chỉ bắt lỗi hiển thị, không bắt thiếu thẻ giải / thanh ĐỀ / nhãn BƯỚC
    ghi_chu_intro = (
        "Ô 1 là khung INTRO MÓC CÂU (viên thuốc kỳ thi, tiêu đề vàng lớn, dòng phụ, mô hình 3D giữa màn hình; có thể có câu hook và nút LƯU NGAY VIDEO). "
        "Ở ô 1 CHỈ bắt: cat_chu, chong_chu, latex_tho, ma_tho, lo_dap_an, và t2_trong khi vùng giữa màn hình đen không có hình 3D. "
        "KHÔNG báo lỗi ô 1 vì thiếu thẻ giải, thiếu thanh ĐỀ hay thiếu nhãn BƯỚC (intro không có các phần đó).\n"
    ) if co_intro_moc_cau(p) is not None else ""
    if p.get("boCuc") == "hinh_phang":
        ghi_chu_intro += (
            "Video HÌNH HỌC PHẲNG nền tối: header (TOÁN 9 / HÌNH HỌC) trên cùng, hình vẽ ở nửa trên, các dòng chứng minh bên dưới. "
            "KHÔNG có hình 3D: bỏ qua t2_trong và hinh_dung_im. Bắt thêm:\n"
            "- hinh_nho: hình vẽ (đường tròn, tam giác) quá nhỏ, chiếm dưới một nửa bề ngang vùng hình.\n"
            "- tran_day: dòng chứng minh tràn xuống sát đáy khung (14% dưới cùng) hoặc bị cắt ở đáy.\n"
            "- nhan_de: nhãn tên điểm (A, B, C...) đè lên nhau, đè lên nét vẽ hoặc cung góc tới mức khó đọc.\n")
    return ghi_chu_intro + (
        "Bạn là người kiểm duyệt cuối của video toán dọc 9:16. Ảnh là lưới 3×3 gồm 9 khung hình theo thứ tự thời gian, "
        "mỗi ô có số 1..9 ở góc trên trái (dải nhãn đen-vàng đó là của người kiểm duyệt, KHÔNG phải lỗi video). "
        "Ô %d là cảnh đáp án, ô 9 là màn kết. Đáp số của bài: \"%s\".\n"
        "Chỉ tìm các loại LỖI NẶNG sau, bỏ qua mọi góp ý thẩm mỹ:\n"
        "- cat_chu: chữ/công thức bị cắt mất một phần ở mép khung hoặc mép hộp, tràn ra ngoài khung hình.\n"
        "- chong_chu: hai nhãn/dòng chữ/công thức đè lên nhau đến mức khó đọc.\n"
        "- latex_tho: hiện nguyên mã LaTeX như \\\\frac, \\\\sqrt, \\\\cdot, $...$, ^{...}, _{...}, \\\\text thay vì công thức đã dựng.\n"
        "- lo_dap_an: đáp số cuối (%s) hiện rõ ở một ô TRƯỚC ô %d (hook, đề bài, các bước giải). Ô %d và ô 9 được phép có đáp số.\n"
        "- ma_tho: tiêu đề bước / tiêu đề thẻ / nhãn hiện chữ thô thay vì ký hiệu đã dựng: dấu gạch dưới (S_A, S_1), chữ Omega/Delta/alpha, C(12,3) thay cho tổ hợp, \\\\frac.\n"
        "- logo_sai: logo hoặc tên kênh (intro, góc trên, màn kết) ghi chuyên mục SAI: bài này thuộc chuyên mục \"" + chuyen + "\".\n"
        "- so_cat: con số bị cắt cụt hoặc tách đôi giữa hai dòng/khung (1024 thành 1000 | 24), dấu so sánh chèn sai vào câu chữ.\n"
        "- t2_trong: video bố cục 4 tầng mà vùng sân khấu giữa (dưới tiêu đề, trên thẻ giải) trống đen ở ô giải.\n"
        "- hinh_dung_im: hình 3D giữa màn hình y hệt nhau ở mọi ô giải (không đổi góc, không có chi tiết mới).\n"
        "Chỉ báo khi thấy rõ. nang=true khi người xem chắc chắn nhận ra lỗi. "
        "Trả JSON đúng mẫu: {\"loi\":[{\"o\":số ô,\"loai\":\"cat_chu|chong_chu|latex_tho|lo_dap_an|ma_tho|logo_sai|so_cat|t2_trong|hinh_dung_im|hinh_nho|tran_day|nhan_de\",\"mo_ta\":\"ngắn gọn tiếng Việt\",\"nang\":true}]} ; "
        "không có lỗi thì {\"loi\":[]}."
    ) % (o_da, dap or "không rõ", dap or "không rõ", o_da, o_da)


def goi_gemini(anh, p, o_da):
    keys = [k for k in re.split(r"[\s,;]+", os.environ.get("GEMINI_KEYS") or os.environ.get("GEMINI_API_KEY") or "") if k]
    if not keys:
        return None, "THIEU_GEMINI_KEYS"
    body = {
        "contents": [{"role": "user", "parts": [
            {"text": prompt_ai(p, o_da)},
            {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(open(anh, "rb").read()).decode()}},
        ]}],
        "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json", "maxOutputTokens": 1024,
                             "thinkingConfig": {"thinkingBudget": 0}},
    }
    model = os.environ.get("MAT_THAN_MODEL") or "gemini-2.5-flash"
    tep = os.path.join(tempfile.gettempdir(), "mat_than_%d.json" % os.getpid())
    with open(tep, "w", encoding="utf8") as f:
        json.dump({"model": model, "models": [model, "gemini-flash-latest", "gemini-2.0-flash"], "bodies": [body], "keys": keys,
                   "gioiHanGiay": 120}, f)
    try:
        r = subprocess.run(["node", os.path.join(GOC, "scripts", "bophan1", "goi_gemini.js"), tep],
                           capture_output=True, text=True, encoding="utf8", timeout=180)
        kq = json.loads(r.stdout or "[]")[0]
    except Exception as e:   # noqa: BLE001 - mọi lỗi tiến trình -> Mắt thần không chạy, không chặn
        return None, "LOI_GOI: %s" % str(e)[:160]
    finally:
        try:
            os.remove(tep)
        except OSError:
            pass
    if not kq.get("ok"):
        return None, "GEMINI_%s: %s" % (kq.get("code"), str(kq.get("raw") or "")[:160])
    try:
        d = json.loads(kq["raw"])
        chu = "".join(x.get("text", "") for x in d["candidates"][0]["content"]["parts"])
        m = re.search(r"\{.*\}", chu, re.S)
        return json.loads(m.group(0) if m else chu), ""
    except Exception as e:   # noqa: BLE001
        return None, "KHONG_DOC_DUOC_JSON: %s" % str(e)[:120]


def chuan_loi(ds, o_da):
    kq = []
    for x in ds if isinstance(ds, list) else []:
        if not isinstance(x, dict) or x.get("loai") not in LOAI_LOI:
            continue
        try:
            o = int(x.get("o"))
        except (TypeError, ValueError):
            o = 0
        if x["loai"] == "lo_dap_an" and (o >= o_da or o <= 0):
            continue   # ô đáp án / màn kết được phép có đáp số
        kq.append({"o": o, "loai": x["loai"], "mo_ta": str(x.get("mo_ta") or "")[:160], "nang": x.get("nang") is not False})
    return kq


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    props_tep, video, ra = sys.argv[1:4]
    p = json.load(open(props_tep, encoding="utf8"))
    id_ = p.get("id") or os.path.splitext(os.path.basename(video))[0]
    os.makedirs(ra, exist_ok=True)
    moc, o_da = chon_moc(p, do_dai(video))
    anh = tao_luoi(video, moc, os.path.join(ra, "%s_3x3.jpg" % id_))
    print("Mắt thần: đã tạo lưới 3×3", anh, "| mốc:", ", ".join("%d=%s@%.1fs" % (k + 1, n, t) for k, (t, n) in enumerate(moc)))

    gia_lap = os.environ.get("MAT_THAN_GIA_LAP", "").strip()
    if gia_lap:
        tho = {"loi": [{"o": 6, "loai": "lo_dap_an", "mo_ta": "Giả lập: đáp số hiện ở bước giải", "nang": True}]} if gia_lap == "loi" else {"loi": []}
        canh_bao = ""
    else:
        tho, canh_bao = goi_gemini(anh, p, o_da)
    tat_dinh = kiem_tat_dinh(p, getattr(tao_luoi, "anh_o", []), o_da)
    for x in tat_dinh:
        print("Mắt thần (đo điểm ảnh): ô %d %s - %s" % (x["o"], TEN_LOI[x["loai"]], x["mo_ta"]))
    if tho is None and not tat_dinh:
        kq = {"dat": True, "chay": False, "loi": [], "ly_do": "", "canh_bao": "Mắt thần chưa chạy (%s), để BP4 kiểm duyệt" % canh_bao}
    else:
        loi = tat_dinh + chuan_loi((tho or {}).get("loi"), o_da)
        nang = [x for x in loi if x["nang"]]
        ly_do = "; ".join("ô %d %s%s" % (x["o"], TEN_LOI[x["loai"]], (": " + x["mo_ta"]) if x["mo_ta"] else "") for x in nang)
        kq = {"dat": not nang, "chay": True, "loi": loi, "ly_do": ("Mắt thần 3×3: " + ly_do) if nang else ""}
    kq.update({"anh": os.path.basename(anh), "o_dap_an": o_da, "moc": [{"o": k + 1, "nhan": n, "giay": round(t, 2)} for k, (t, n) in enumerate(moc)]})
    with open(os.path.join(ra, "mat_than.json"), "w", encoding="utf8") as f:
        json.dump(kq, f, ensure_ascii=False, indent=1)
    if not kq["chay"]:
        print("::warning::" + kq["canh_bao"])
    elif kq["dat"]:
        print("Mắt thần: ĐẠT (không có lỗi nặng)%s" % ("" if not kq["loi"] else ", %d lưu ý nhẹ" % len(kq["loi"])))
    else:
        print("::error::" + kq["ly_do"])


if __name__ == "__main__":
    main()
