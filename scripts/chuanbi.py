#!/usr/bin/env python3
"""
chuanbi.py - Kịch bản JSON (từ Bộ phận 1) -> giọng đọc + file props.json cho Remotion.

Mỗi cảnh:  lời thoại -> chia thành các đoạn ngắn -> đọc từng đoạn bằng edge-tts (miễn phí)
           -> ghép thành 1 file mp3 -> đo thời lượng thật -> tính mốc thời gian cho phụ đề và hiệu ứng.

Chạy:
    python3 scripts/chuanbi.py kich_ban.json                 # dùng giọng thật (cần: pip install edge-tts)
    python3 scripts/chuanbi.py kich_ban.json --gia-lap       # giọng giả (tiếng bíp) để thử máy, không cần mạng
"""
import argparse
import asyncio
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import hashlib

FPS = 30
LEAD = 0.22      # giây im lặng đầu cảnh trước khi đọc
TAIL = 0.35      # giây im lặng cuối cảnh
GAP = 0.09       # khoảng nghỉ giữa các câu
TOI_DA_KY_TU = 72  # độ dài tối đa của một đoạn phụ đề (ký tự)
TOC_DO_GIA_LAP = 4.7  # từ/giây khi dùng giọng giả


def chay(lenh):
    kq = subprocess.run(lenh, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if kq.returncode != 0:
        raise RuntimeError("Lệnh lỗi: %s\n%s" % (" ".join(lenh[:6]), kq.stderr[-800:]))
    return kq.stdout


def do_thoi_luong(tep):
    out = chay(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", tep])
    return float(out.strip())


# ---------- Chuẩn hóa văn bản để giọng đọc không đọc sai ----------
def chuan_hoa_doc(text):
    s = str(text)
    s = re.sub(r"(\d+)\s*/\s*(\d+)", r"\1 phần \2", s)       # 3/5 -> "3 phần 5"
    s = re.sub(r"(\d)\s*%", r"\1 phần trăm", s)
    s = s.replace("×", " nhân ").replace("÷", " chia ").replace("=", " bằng ")
    s = re.sub(r"(?<=\s)\+(?=\s)", "cộng", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def tach_cau(text):
    """Tách lời thoại thành các câu. Mỗi câu được đọc trọn một lần để ngữ điệu tự nhiên."""
    text = re.sub(r"\s+", " ", str(text)).strip()
    return [c.strip() for c in re.split(r"(?<=[.!?…])\s+", text) if c.strip()]


def chia_phu_de(cau, toi_da=TOI_DA_KY_TU):
    """Câu dài chia thành các đoạn phụ đề cân nhau (ưu tiên ngắt sau dấu phẩy), mỗi đoạn tối đa ~3 dòng."""
    if len(cau) <= toi_da:
        return [cau]
    k = math.ceil(len(cau) / toi_da)
    tu = cau.split(" ")
    phan, cur, con_lai = [], [], len(cau)
    for w in tu:
        cur.append(w)
        dai = len(" ".join(cur))
        con_phan = k - len(phan)
        if con_phan <= 1:
            continue
        muc_tieu = con_lai / con_phan
        if dai >= muc_tieu or (w[-1:] in ",;:" and dai >= 0.7 * muc_tieu):
            phan.append(" ".join(cur))
            con_lai -= dai + 1
            cur = []
    if cur:
        phan.append(" ".join(cur))
    return phan


# ---------- Tạo giọng ----------
async def _tts(text, tep, giong, toc_do, cao_do):
    import edge_tts
    loi = None
    for lan in range(4):
        try:
            c = edge_tts.Communicate(text, giong, rate=toc_do, pitch=cao_do)
            await c.save(tep)
            if os.path.exists(tep) and os.path.getsize(tep) > 800:
                return
            loi = "tệp âm thanh rỗng"
        except Exception as e:  # mạng chập chờn, dịch vụ bận...
            loi = str(e)
        await asyncio.sleep(2 * (lan + 1))
    raise RuntimeError("edge-tts thất bại: %s | đoạn: %s" % (loi, text[:60]))


def _gia_lap(text, tep):
    tu = max(1, len(text.split()))
    giay = max(0.8, tu / TOC_DO_GIA_LAP)
    chay(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i",
          "sine=frequency=220:duration=%.2f" % giay, "-af", "volume=0.15",
          "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", tep])


def _gtts(text, tep, toc):
    """Giọng dự phòng: Google Translate TTS (miễn phí). Đọc chậm hơn nên tăng tốc bằng ffmpeg cho khớp nhịp."""
    from gtts import gTTS
    tho = tep + ".g.mp3"
    gTTS(text, lang="vi").save(tho)
    chay(["ffmpeg", "-y", "-loglevel", "error", "-i", tho, "-af", "atempo=%.2f" % toc, "-c:a", "libmp3lame", "-b:a", "96k", tep])
    os.remove(tho)


THONG_KE_GIONG = {"edge": 0, "gtts": 0, "gemini": 0}

PHONG_CACH_GIONG_MAC_DINH = ("Đọc đoạn sau bằng tiếng Việt chuẩn, giọng miền Bắc, như một thầy giáo trẻ đang nói chuyện trực tiếp với một bạn học sinh "
                             "trong video TikTok dạy toán: tự nhiên như trò chuyện chứ không đọc văn bản, giọng ấm, có nụ cười trong giọng nói, "
                             "lên xuống giọng rõ ràng, ngừng rất ngắn trước con số hoặc ý quan trọng rồi nhấn vào nó, câu hỏi thì lên giọng cuối câu, "
                             "tốc độ hơi nhanh nhưng mọi chữ đều rõ. Chỉ đọc đúng nội dung, không thêm bớt chữ nào.")

# Sắc thái giọng theo loại cảnh (kịch bản có thể ghi đè bằng trường "giong_doc" của từng cảnh).
SAC_THAI_THEO_LOAI = [
    (r"mo_dau|hook|cau_hoi", "hào hứng, gây tò mò, như đang thách đố người nghe, nhấn mạnh từ khóa"),
    (r"de_bai", "rõ ràng, nhịp vừa phải như kể một câu chuyện ngắn, đọc chậm và rõ từng con số của đề"),
    (r"nhac_lai|kien_thuc", "ấm áp, giải thích nhẹ nhàng như nhắc lại cho bạn mình"),
    (r"mo_hinh", "tập trung, mạch lạc, như đang vẽ phác thảo cho người nghe cùng nhìn"),
    (r"y_do|thu_nho", "tò mò, suy ngẫm, như đang cùng người nghe đặt câu hỏi"),
    (r"bay", "hạ giọng một chút, cảnh báo nghiêm túc, hơi bí ẩn như sắp tiết lộ sai lầm"),
    (r"diem_chot|y_tuong", "sáng lên như vừa phát hiện ra điều thú vị, kiểu 'à, ra là thế'"),
    (r"tinh|giai", "tự tin, nhịp đều và chắc, nhấn vào từng kết quả trung gian"),
    (r"kiem_tra", "cẩn thận, chắc chắn, như đang soát lại cho yên tâm"),
    (r"dap_an|ket_qua", "phấn khích, rõ ràng, đọc đáp số chậm lại một nhịp để người nghe nhớ"),
    (r"bai_hoc|ket_luan|chot", "thân thiện, chậm lại, đọng lại, như lời dặn cuối buổi học"),
]


def sac_thai_canh(c):
    rieng = str(c.get("giong_doc") or "").strip()
    if rieng:
        return rieng[:160]
    loai = str(c.get("loai") or "").lower()
    for re_, mo_ta in SAC_THAI_THEO_LOAI:
        if re.search(re_, loai):
            return mo_ta
    return ""


def nghi_canh(canh, i):
    """Nhịp nghỉ tự nhiên quanh mỗi cảnh (giây): cảnh nối tiếp cùng sân khấu thì liền mạch, trước cái bẫy / đáp án thì
    lặng thêm một nhịp để tạo kịch tính, cảnh cuối để đọng lại. Thay cho khoảng lặng cố định giữa mọi cảnh (nghe máy móc)."""
    c = canh[i]
    loai = str(c.get("loai") or "").lower()
    sau = canh[i + 1] if i + 1 < len(canh) else None
    if i == 0:
        lead = LEAD
    elif c.get("giu_san_khau"):
        lead = 0.12
    elif re.search(r"bay|dap_an|ket_qua", loai):
        lead = 0.34
    else:
        lead = LEAD
    if sau is None:
        tail = 0.85
    elif sau.get("giu_san_khau"):
        tail = 0.16
    elif re.search(r"bay|dap_an|ket_qua", str(sau.get("loai") or "").lower()):
        tail = 0.5
    else:
        tail = TAIL
    return lead, tail


# ---------- Kho key Gemini (xoay vòng như Bộ phận 1) ----------
# Hết hạn mức NGÀY -> bỏ key đó, sang key kế. Giới hạn THEO PHÚT -> chờ retryDelay rồi thử lại. Key LỖI THẬT -> ghi
# /tmp/gemini_key_hong.json để báo Zalo người dùng gỡ key.
KEY_HET_NGAY = set()
KEY_HONG = set()
TEP_KEY_HONG_JSON = os.path.join(tempfile.gettempdir(), "gemini_key_hong.json")


def ds_key_gemini():
    ds = []
    for nguon in (os.environ.get("GEMINI_KEYS", ""), os.environ.get("GEMINI_API_KEY", "")):
        for k in re.split(r"[\s,;]+", nguon):
            if k and k not in ds:
                ds.append(k)
    return ds


def ghi_key_hong(k, code, noi):
    if k in KEY_HONG:
        return
    KEY_HONG.add(k)
    ds_goc = [x for x in re.split(r"[\s,;]+", os.environ.get("GEMINI_KEYS", "")) if x]
    so = ds_goc.index(k) + 1 if k in ds_goc else 0
    m = re.search(r'"message":\s*"([^"]{0,160})', noi)
    ly = "HTTP %d: %s" % (code, re.sub(r"\s+", " ", m.group(1) if m else noi)[:160])
    try:
        ds = json.load(open(TEP_KEY_HONG_JSON, encoding="utf8")) if os.path.exists(TEP_KEY_HONG_JSON) else []
        ma = k[:6] + "_" + k[-4:]
        if not any(x.get("dau") == ma for x in ds):
            ds.append({"so": so, "dau": ma, "ly_do": ly})
        json.dump(ds, open(TEP_KEY_HONG_JSON, "w", encoding="utf8"))
    except Exception:
        pass
    print("KEY_HONG: key thứ %s (%s) lỗi thật: %s -> bỏ qua, sẽ báo Zalo" % (so or "?", k[:6] + "_" + k[-4:], ly))


def gemini_tts(text, tep_wav, giong, model, phong_cach):
    """Giọng Gemini TTS (Google): một lần gọi cho cả lời thoại của cảnh. Trả về tệp WAV 24 kHz.
    Dùng mọi key trong GEMINI_KEYS / GEMINI_API_KEY (GitHub Secret), xoay vòng khi key hết hạn mức ngày hoặc hỏng."""
    import base64
    import urllib.error
    import urllib.request
    import time
    keys = ds_key_gemini()
    if not keys:
        raise RuntimeError("chưa có GEMINI_API_KEY")
    than = {
        "contents": [{"parts": [{"text": phong_cach + "\n" + text}]}],
        "generationConfig": {"responseModalities": ["AUDIO"],
                             "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": giong}}}},
    }
    url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % model
    loi = None
    for vong in range(4):
        dung = [k for k in keys if k not in KEY_HONG and k not in KEY_HET_NGAY]
        if not dung:
            break
        cho_min = 0
        for key in dung:
            req = urllib.request.Request(url, data=json.dumps(than).encode("utf8"), method="POST",
                                         headers={"Content-Type": "application/json", "x-goog-api-key": key})
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    d = json.loads(r.read().decode("utf8"))
                phan = d["candidates"][0]["content"]["parts"]
                b64 = next(p["inlineData"]["data"] for p in phan if "inlineData" in p)
                pcm = tep_wav + ".pcm"
                with open(pcm, "wb") as f:
                    f.write(base64.b64decode(b64))
                chay(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcm, tep_wav])
                os.remove(pcm)
                return
            except urllib.error.HTTPError as e:
                noi = e.read().decode("utf8", "ignore")[:4000]
                loi = "HTTP %d %s" % (e.code, noi[:300])
                if e.code == 429 and re.search(r"PerDay|per day|daily", noi, re.I):
                    KEY_HET_NGAY.add(key)   # hết hạn mức NGÀY: sang key kế, không gọi lại key này
                    print("Gemini TTS: key %s… hết hạn mức ngày, chuyển key khác" % key[:6])
                    continue
                if e.code == 401 or (e.code in (400, 403) and re.search(r"API_KEY_INVALID|API key not valid|API key expired|SERVICE_DISABLED|has not been used|is disabled|suspended|PERMISSION_DENIED|billing", noi, re.I)):
                    # bị model giọng đọc từ chối: key có thể vẫn tốt với model chữ (key dạng "AQ.") -> chỉ bỏ key cho giọng đọc, không báo hỏng
                    KEY_HONG.add(key)
                    print("Gemini TTS: key %s bị model giọng từ chối (HTTP %d), bỏ key này cho giọng đọc" % (key[:6] + "_" + key[-4:], e.code))
                    continue
                if e.code in (429, 500, 503):
                    m = re.search(r'"retryDelay":\s*"(\d+)', noi)
                    cho = min(60, int(m.group(1)) + 2) if m else 10 * (vong + 1)
                    cho_min = min(cho_min, cho) if cho_min else cho
                    continue
                raise RuntimeError("Gemini TTS lỗi: %s" % loi)
            except Exception as e:
                loi = str(e)
        if not cho_min:
            break
        print("Gemini TTS: mọi key đang bận/giới hạn theo phút, chờ %d giây rồi thử lại" % cho_min)
        time.sleep(cho_min)
    raise RuntimeError("Gemini TTS lỗi: %s" % loi)


def tao_giong_gemini(canh, thu_muc, args):
    """Tạo trước giọng Gemini cho TẤT CẢ cảnh. Lỗi ở bất kỳ cảnh nào -> trả None để cả video dùng edge-tts
    (không trộn hai giọng khác nhau trong một video)."""
    kq = {}
    for i, c in enumerate(canh):
        van = chuan_hoa_doc(str(c.get("loi_thoai") or "").strip())
        if not van:
            continue
        wav = os.path.join(thu_muc, "gem_%d.wav" % i)
        # CÙNG MỘT chỉ dẫn giọng cho mọi cảnh: trước đây mỗi cảnh một sắc thái ("hào hứng", "cảnh báo"...) làm chất giọng đổi liên tục
        phong_cach = args.phong_cach_giong + " Giữ NGUYÊN một chất giọng, cao độ và tốc độ như các đoạn khác của cùng video.\nĐoạn cần đọc:"
        try:
            gemini_tts(van, wav, args.giong_gemini, args.tts_model, phong_cach)
        except Exception as e:
            print("Cảnh báo: %s -> cả video chuyển sang edge-tts" % str(e)[:200])
            THONG_KE_GIONG["gemini"] = 0   # bỏ hết phần Gemini đã tạo: cả video một giọng
            return None
        nhanh = os.path.join(thu_muc, "gem_%d.mp3" % i)
        tempo = float(args.toc_do_gemini or 1.0)
        loc = ("atempo=%.3f," % tempo if abs(tempo - 1) > 0.01 else "") + "aresample=44100"
        chay(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", loc, "-c:a", "libmp3lame", "-b:a", "128k", nhanh])
        kq[i] = nhanh
        THONG_KE_GIONG["gemini"] += 1
    return kq


async def tao_cac_doan(cac_doan, thu_muc, args):
    cac_tep = []
    sem = asyncio.Semaphore(3)

    async def mot(i, d):
        tep = os.path.join(thu_muc, "d%03d.mp3" % i)
        if args.gia_lap:
            _gia_lap(d, tep)
            return tep
        van = chuan_hoa_doc(d)
        async with sem:
            # edge-tts đôi khi trả "No audio was received" với MỘT câu cụ thể (thường câu ngắn, không dấu kết):
            # thử lại với chữ hơi khác (thêm dấu chấm / dấu phẩy mở đầu) để cả video giữ MỘT giọng (không bao giờ đổi sang giọng khác)
            bien_the = [van, van.rstrip(" .,!?") + ".", "À, " + van[0].lower() + van[1:] if van else van]
            for k, v in enumerate(bien_the):
                try:
                    await _tts(v, tep, args.giong, args.toc_do, args.cao_do)
                    THONG_KE_GIONG["edge"] += 1
                    if k:
                        print("edge-tts đọc được sau khi chỉnh chữ (cách %d): %s" % (k, v[:60]))
                    return tep
                except Exception as e:
                    print("Cảnh báo: edge-tts lỗi (%s)%s" % (str(e)[:120], ", thử chỉnh chữ" if k < len(bien_the) - 1 else ", chờ rồi thử lại"))
        # KHÔNG dùng giọng Google dự phòng (giọng khác hẳn -> video lẫn giọng). Chờ rồi thử lại edge-tts thêm vài vòng;
        # vẫn lỗi thì dừng dựng (GitHub báo lỗi, hệ thống tự dựng lại sau) thay vì ra video lẫn giọng.
        loi = None
        for lan in range(3):
            await asyncio.sleep(15 * (lan + 1))
            for v in bien_the:
                try:
                    async with sem:
                        await _tts(v, tep, args.giong, args.toc_do, args.cao_do)
                    THONG_KE_GIONG["edge"] += 1
                    print("edge-tts đọc được sau khi chờ thử lại (vòng %d)" % (lan + 1))
                    return tep
                except Exception as e:
                    loi = e
        raise RuntimeError("edge-tts không đọc được đoạn này sau nhiều lần thử (không dùng giọng khác để tránh lẫn giọng): %s | đoạn: %s" % (loi, d[:60]))

    cac_tep = await asyncio.gather(*[mot(i, d) for i, d in enumerate(cac_doan)])
    return list(cac_tep)


def cat_lang(tep_vao, tep_ra):
    """Cắt khoảng lặng đầu và cuối của một câu (giọng đọc thường chừa ~0.2-0.4 giây mỗi đầu), giữ lại 0.03 giây."""
    loc = ("aresample=44100,aformat=channel_layouts=mono,"
           "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.03,areverse,"
           "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.03,areverse")
    chay(["ffmpeg", "-y", "-loglevel", "error", "-i", tep_vao, "-af", loc, "-c:a", "libmp3lame", "-b:a", "96k", tep_ra])


def ghep(cac_tep, dich):
    """Ghép các đoạn thành một tệp, chèn GAP giây im lặng sau mỗi đoạn."""
    lenh = ["ffmpeg", "-y", "-loglevel", "error"]
    for t in cac_tep:
        lenh += ["-i", t]
    loc = []
    for i in range(len(cac_tep)):
        loc.append("[%d:a]aresample=44100,aformat=channel_layouts=mono,apad=pad_dur=%.3f[a%d]" % (i, GAP, i))
    ghep_ten = "".join("[a%d]" % i for i in range(len(cac_tep)))
    loc.append("%sconcat=n=%d:v=0:a=1[out]" % (ghep_ten, len(cac_tep)))
    lenh += ["-filter_complex", ";".join(loc), "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "96k", dich]
    chay(lenh)


PHONG_CACH_MAC_DINH = {"kieuPhuDe": "hop", "mauPhuDe": "#FF6B2C", "soNenToiDa": 3, "lopNeonTrenNen": False, "doMoNen": 0.35, "kyHieuTroi": False, "quangSang": True, "kieuNen": "toi", "kieuToan": "dam",
                       "kieuHinh": "manim", "thanhTienDo": False, "phuDe": True, "mau": {}}
THUONG_HIEU_MAC_DINH = {"ten": "", "khauHieu": "", "handle": "", "markNuoc": True, "outroGiay": 5, "outroTuTao": True, "loiMoi": "Theo dõi để học mẹo xác suất"}
DUOI_ANH = (".jpg", ".jpeg", ".png", ".webp")
DUOI_VIDEO = (".mp4", ".mov", ".webm", ".m4v")


def doc_phong_cach(tep):
    pc = dict(PHONG_CACH_MAC_DINH)
    th = dict(THUONG_HIEU_MAC_DINH)
    co_dinh = ""
    if tep and os.path.exists(tep):
        try:
            d = json.load(open(tep, encoding="utf8"))
            for k in ("doMoNen", "kyHieuTroi", "quangSang", "kieuNen", "kieuToan", "kieuHinh", "thanhTienDo", "phuDe", "mau"):
                if k in d:
                    pc[k] = d[k]
            co_dinh = str(d.get("nen_co_dinh") or "").strip()
            for k in ("soNenToiDa", "lopNeonTrenNen", "kieuPhuDe", "mauPhuDe", "lopQuet", "butChi", "thanhBuoc", "tieuDeInHoa", "khungSanKhau", "loiMoiGiuaVideo", "chuyenDong"):
                if k in d:
                    pc[k] = d[k]
            if isinstance(d.get("thuongHieu"), dict):
                th.update(d["thuongHieu"])
        except Exception as e:
            print("Cảnh báo: không đọc được %s (%s), dùng phong cách mặc định" % (tep, e))
    return pc, co_dinh, th


def chon_nen(public, id_, co_dinh, so_toi_da=3):
    """Chọn tối đa so_toi_da ảnh/video nền trong public/nen/ (workflow chép từ Drive VIDEO_XACSUAT/nen) để đổi nền theo nhóm cảnh.
    Thứ tự xáo theo mã video: cùng video luôn ra cùng bộ nền, các video khác nhau dùng bộ nền và thứ tự khác nhau.
    nen_co_dinh (phong_cach.json) = luôn dùng đúng một nền đó."""
    for f in os.listdir(public):
        if f.startswith("nen_chon"):
            os.remove(os.path.join(public, f))
    thu_muc = os.path.join(public, "nen")
    if not os.path.isdir(thu_muc):
        return []
    ds = sorted(f for f in os.listdir(thu_muc) if f.lower().endswith(DUOI_ANH + DUOI_VIDEO))
    if not ds:
        return []
    if co_dinh and co_dinh in ds:
        chon = [co_dinh]
    else:
        hat = int(hashlib.md5(id_.encode("utf8")).hexdigest(), 16)
        xao = sorted(ds, key=lambda f: hashlib.md5((str(hat) + f).encode("utf8")).hexdigest())
        chon = xao[: max(1, int(so_toi_da))]
    kq = []
    for k, ten in enumerate(chon):
        duoi = os.path.splitext(ten)[1].lower()
        dich = "nen_chon_%d%s" % (k, duoi)
        shutil.copyfile(os.path.join(thu_muc, ten), os.path.join(public, dich))
        if duoi in DUOI_VIDEO:
            try:
                so_frame = max(30, int(round(do_thoi_luong(os.path.join(public, dich)) * FPS)))
            except Exception:
                so_frame = 30 * FPS
            kq.append({"tep": dich, "loai": "video", "soFrame": so_frame})
        else:
            kq.append({"tep": dich, "loai": "anh", "soFrame": 0})
        print("Nền %d: %s" % (k + 1, ten))
    return kq


def trinh_bay(c, noi_dung):
    """Cách hiện công thức: 'bien_doi' (biến hình nối tiếp kiểu Manim) hoặc 'xep' (xếp chồng). AI chọn; không chọn thì cảnh tính toán/đáp án/điểm mấu chốt có từ 2 dòng tự dùng biến hình."""
    tb = str(c.get("trinh_bay") or "").strip()
    if tb in ("bien_doi", "cong_don", "xep"):
        return tb
    loai = str(c.get("loai") or "").lower()
    if len(noi_dung) >= 2 and re.search(r"tinh|dap_an|ket_qua|diem_chot|huong", loai):
        return "cong_don"
    return "xep"


def so_buoc_san_khau(du):
    """Số bước của sân khấu (để kéo dài cảnh cho kịp diễn hết)."""
    if not isinstance(du, dict):
        return 0, False
    buoc = [1]
    ds_vat = du.get("vat") if isinstance(du.get("vat"), list) else []
    ds_hd = du.get("hanh_dong") if isinstance(du.get("hanh_dong"), list) else []
    du = {"vat": ds_vat, "hanh_dong": ds_hd}
    for x in ds_vat + ds_hd:
        if isinstance(x, dict):
            try:
                buoc.append(int(float(x.get("buoc") or 1)))
            except (TypeError, ValueError):
                pass
    vq = {str(v.get("id")) for v in (du.get("vat") or []) if isinstance(v, dict) and v.get("loai") == "vong_quay"}
    co_quay = any(isinstance(h, dict) and h.get("kieu") == "quay" and str(h.get("vat")) in vq for h in (du.get("hanh_dong") or []))
    return min(8, max(buoc)), co_quay


def chon_nhac(public, id_):
    """Nhạc nền: nếu thư mục public/nhac có tệp nhạc của bạn (workflow chép từ Drive VIDEO_XACSUAT/nhac) thì chọn một bài
    theo mã video (xoay vòng giữa các video); không có thì dùng nhạc tự tạo nhac/nen.wav (không bản quyền vì do máy sinh ra)."""
    thu_muc = os.path.join(public, "nhac")
    if not os.path.isdir(thu_muc):
        return None
    rieng = sorted(f for f in os.listdir(thu_muc) if f.lower().endswith((".mp3", ".m4a", ".wav", ".ogg")) and not f.startswith("nen."))
    if rieng:
        ten = rieng[int(hashlib.md5(id_.encode("utf8")).hexdigest(), 16) % len(rieng)]
        print("Nhạc nền: %s" % ten)
        return "nhac/" + ten
    return "nhac/nen.wav" if os.path.exists(os.path.join(thu_muc, "nen.wav")) else None


TAM_TRANG_THEO_LOAI = [
    (r"mo_dau|hook|cau_hoi", "chinh"), (r"de_bai|nhac_lai|kien_thuc|y_do|thu_nho", "nhe"), (r"bay", "cang"),
    (r"dap_an|ket_qua", "bung"), (r"bai_hoc|ket_luan|chot", "nhe"), (r"mo_hinh|diem_chot|y_tuong|tinh|giai|kiem_tra", "chinh"),
]


def tam_trang_canh(c):
    rieng = str(c.get("nhac") or "").strip().lower()
    if rieng in ("nhe", "chinh", "cang", "bung"):
        return rieng
    loai = str(c.get("loai") or "").lower()
    for re_, tt in TAM_TRANG_THEO_LOAI:
        if re.search(re_, loai):
            return tt
    return "chinh"


def tron_nhac_theo_canh(public, id_, canh_kb, canh_props):
    """Ghép 4 bản nhạc tự tạo (nhe / chinh / cang / bung, cùng 120 BPM) theo diễn biến bài: mỗi cảnh một tâm trạng,
    đổi bản đúng ranh giới ô nhịp gần đầu cảnh nhất và hòa chéo 0,6 giây, nên nghe như một bản nhạc có cao trào chứ
    không phải một vòng lặp đều đều suốt video. Trả về đường dẫn tương đối trong public, hoặc None nếu thiếu tệp/thư viện."""
    try:
        import numpy as np
        import wave
    except Exception:
        return None
    tep = {"chinh": os.path.join(public, "nhac", "nen.wav")}
    for k in ("nhe", "cang", "bung"):
        tep[k] = os.path.join(public, "nhac", "tam_trang", k + ".wav")
    if not all(os.path.exists(v) for v in tep.values()):
        return None
    du = {}
    sr = None
    for k, v in tep.items():
        with wave.open(v, "rb") as w:
            sr = w.getframerate()
            du[k] = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768.0
    gain = {"nhe": 0.85, "chinh": 1.0, "cang": 0.95, "bung": 1.0}
    o = 2.0                                       # một ô nhịp = 2 giây (120 BPM, 4/4)
    tong_giay = (canh_props[-1]["batDau"] + canh_props[-1]["soFrame"]) / FPS + 1.0
    so_o = int(np.ceil(tong_giay / o))
    # tâm trạng của từng ô nhịp: theo cảnh đang chạy ở giữa ô đó (đổi bản ở ranh giới ô gần đầu cảnh nhất)
    moc = [(c["batDau"] / FPS, tam_trang_canh(ckb)) for c, ckb in zip(canh_props, canh_kb)]
    def tam_trang_luc(t):
        tt = moc[0][1]
        for bd, k in moc:
            if bd <= t + o / 2:
                tt = k
        return tt
    n_o = int(sr * o)
    dai_vong = len(du["chinh"])
    ra = np.zeros(so_o * n_o + int(sr * 0.6), dtype=np.float32)
    hoa = int(sr * 0.6)
    for i in range(so_o):
        k = tam_trang_luc(i * o)
        a = (i * n_o) % dai_vong                 # giữ đúng vị trí trong vòng hợp âm dù đổi bản
        doan = np.take(du[k], np.arange(a, a + n_o + hoa) % dai_vong) * gain[k]
        env = np.ones(len(doan), dtype=np.float32)
        truoc = tam_trang_luc((i - 1) * o) if i else k
        sau = tam_trang_luc((i + 1) * o)
        if i and truoc != k:
            env[:hoa] = np.sin(np.linspace(0, np.pi / 2, hoa)) ** 2      # vào mềm khi vừa đổi tâm trạng
        if sau != k:
            env[n_o:] = np.cos(np.linspace(0, np.pi / 2, hoa)) ** 2      # phần dư hòa vào ô sau
        else:
            env[n_o:] = 0
        ra[i * n_o : i * n_o + len(doan)] += doan * env
    ra = np.clip(ra, -1, 1)
    ten = "nhac/tron_%s.wav" % id_
    with wave.open(os.path.join(public, ten), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((ra * 32767).astype("<i2").tobytes())
    print("Nhạc nền theo cảnh: " + " ".join("%d:%s" % (c["so"], tam_trang_canh(ckb)) for c, ckb in zip(canh_props, canh_kb)))
    return ten


LOAI_THEO_SERIES = {"Xác suất không như bạn nghĩ": "Xác suất", "Hình học kỳ diệu": "Hình học", "Toán và tiền bạc": "Toán tiền bạc",
                    "Tối ưu đời thường": "Tối ưu", "Đo đạc thực tế": "Đo đạc", "Toán đi chợ": "Toán đi chợ", "Toán quanh ta": "Toán thực tế"}


def tao_bia(kb, canh_kb, canh_props):
    """Thông tin ảnh bìa: loại câu hỏi (màu riêng), tiêu đề ngắn, khung hình có hình minh họa rõ nhất (cảnh 1-3 có vật/hình)."""
    loai = str(kb.get("loai_cau_hoi") or "").strip()
    if not loai:
        se = kb.get("series") if isinstance(kb.get("series"), dict) else {}
        loai = LOAI_THEO_SERIES.get(str(se.get("ten") or ""), "")
    if not loai:
        loai = "Toán đi chợ" if kb.get("san_pham") else ("Xác suất" if str(kb.get("mon") or "").upper() == "XAC_SUAT" else "Toán thực tế")
    tieu_de = str(kb.get("tieu_de_bia") or kb.get("hook_chu") or kb.get("tieu_de") or "").strip()
    chon = 1 if len(canh_props) > 1 else 0
    for i in range(min(3, len(canh_props))):
        du = ((canh_kb[i].get("minh_hoa") or {}).get("du_lieu") or {}) if isinstance(canh_kb[i].get("minh_hoa"), dict) else {}
        vat = du.get("vat") if isinstance(du, dict) else None
        if isinstance(vat, list) and any(isinstance(v, dict) and v.get("loai") not in ("nhan", "chu", "so_dem", "danh_sach", "mui_ten") for v in vat):
            chon = i
            break
    c = canh_props[chon]
    return {"loai": loai, "tieuDe": tieu_de[:80], "khung": int(c["batDau"] + c["soFrame"] * 0.96)}   # lúc hình đã vẽ xong


def tim_tep(thu_muc, ten, duoi):
    for d in duoi:
        f = os.path.join(thu_muc, ten + d)
        if os.path.exists(f):
            return f
    return None


def tim_thuong_hieu(public, th):
    """Logo (public/thuong_hieu/logo.png|jpg|webp) và màn kết (outro.png|jpg|mp4|mov) do workflow chép từ Drive."""
    thu_muc = os.path.join(public, "thuong_hieu")
    logo = tim_tep(thu_muc, "logo", (".png", ".webp", ".jpg", ".jpeg"))
    out = tim_tep(thu_muc, "outro", (".mp4", ".mov", ".webm", ".png", ".jpg", ".jpeg", ".webp"))
    hien = dict(th)
    hien.pop("outroGiay", None)
    hien.pop("outroTuTao", None)
    hien.pop("dungOutroRieng", None)
    hien.pop("coManKet", None)
    hien["logo"] = "thuong_hieu/" + os.path.basename(logo) if logo else None
    outro = None
    if out:
        ten = os.path.basename(out)
        video = ten.lower().endswith((".mp4", ".mov", ".webm"))
        giay = float(th.get("outroGiay") or 5)
        if video:
            try:
                giay = min(max(do_thoi_luong(out), 2.0), 12.0)
            except Exception:
                pass
        outro = {"tep": "thuong_hieu/" + ten, "loai": "video" if video else "anh", "soFrame": int(round(giay * FPS))}
    return hien, outro


def chon_man_ket(outro_tep, th, bai_hoc):
    """Màn kết: mặc định dùng màn kết tự tạo chuyên nghiệp (tóm tắt bài học + kênh + nút Theo dõi).
    Chỉ dùng tệp outro của bạn khi phong_cach.json đặt "thuongHieu": {"dungOutroRieng": true}."""
    if outro_tep and th.get("dungOutroRieng"):
        return outro_tep
    if not th.get("outroTuTao", True):
        return outro_tep
    if bai_hoc or th.get("ten") or th.get("handle") or th.get("logo"):
        giay = 6.0 if bai_hoc else 3.5
        return {"tep": "", "loai": "tu_tao", "soFrame": int(round(giay * FPS))}
    return outro_tep


LA_CHO = re.compile(r"^\s*(đề\s*cho|cho\s*biết|dữ\s*kiện|biết)\s*[:：-]\s*", re.I)
LA_TIM = re.compile(r"^\s*(cần\s*tìm|đề\s*hỏi|hỏi|tìm|yêu\s*cầu)\s*[:：-]\s*", re.I)


def the_de_bai(kb):
    """Thẻ ĐỀ BÀI: {cho: [...], tim: "..."} lấy từ de_cho / can_tim của kịch bản; thiếu thì lấy từ danh_sach "Đề cho/Cần tìm"
    ở cảnh de_bai, rồi tới du_kien. Đồng thời BỎ danh_sach trùng lặp đó khỏi sân khấu (thẻ đã nêu)."""
    cho = [str(x).strip() for x in (kb.get("de_cho") or []) if str(x).strip()]
    tim = str(kb.get("can_tim") or "").strip()
    for c in kb.get("canh") or []:
        if str(c.get("loai")) != "de_bai":
            continue
        du = (c.get("minh_hoa") or {}).get("du_lieu") or {}
        vat = du.get("vat") if isinstance(du, dict) else None
        if not isinstance(vat, list):
            continue
        giu = []
        for v in vat:
            ds = [str(x) for x in (v.get("ds") or [])] if isinstance(v, dict) and v.get("loai") == "danh_sach" else []
            trung = [x for x in ds if LA_CHO.match(x) or LA_TIM.match(x)]
            if ds and len(trung) * 2 >= len(ds):
                for x in ds:
                    if LA_TIM.match(x) and not tim:
                        tim = LA_TIM.sub("", x).strip()
                    elif LA_CHO.match(x) and len(cho) < 5 and not kb.get("de_cho"):   # đã có de_cho thì không thêm trùng
                        cho.append(LA_CHO.sub("", x).strip())
                    elif not LA_TIM.match(x) and not kb.get("de_cho") and len(cho) < 5:
                        cho.append(x.strip())
                continue   # bỏ danh_sách trùng với thẻ đề bài
            giu.append(v)
        if (cho or tim) and len(giu) < len(vat):
            du["vat"] = giu
            ids = {v.get("id") for v in giu if isinstance(v, dict)}
            if isinstance(du.get("hanh_dong"), list):
                du["hanh_dong"] = [h for h in du["hanh_dong"] if not isinstance(h, dict) or not h.get("vat") or h.get("vat") in ids]
    if not cho:
        cho = [str(x).strip() for x in (kb.get("du_kien") or []) if str(x).strip()][:4]
    def cat(x, n):   # cắt ở ranh giới từ, có dấu … (không cụt chữ giữa chừng)
        x = re.sub(r"\s+", " ", x).strip()
        if len(x) <= n:
            return x
        c = x[:n - 1]
        i = c.rfind(" ")
        return (c[:i] if i > n * 0.6 else c).rstrip(" ,.;:") + "…"
    return {"cho": [cat(x, 120) for x in cho[:5]], "tim": cat(tim, 140)} if (cho or tim) else None


def do_dai_hien(tex):
    """Số ký tự HIỆN RA của một công thức (bỏ lệnh TeX, ngoặc), để ước bề rộng."""
    x = re.sub(r"\\(text|mathrm|textbf)\s*\{([^{}]*)\}", r"\2", tex)
    x = re.sub(r"\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", lambda m: m.group(1) if len(m.group(1)) > len(m.group(2)) else m.group(2), x)
    x = re.sub(r"\\[a-zA-Z]+", "x", x)
    return len(re.sub(r"[{}_^\s]", "", x))


QUAN_HE = re.compile(r"(=|\\approx|\\Rightarrow|\\Leftrightarrow|\\le(?![a-z])|\\ge(?![a-z])|\\leq|\\geq|\\ne(?![a-z])|<|>)")


def chuan_don_vi(tex):
    """Đơn vị sau số trong công thức ("30\\,m", "37{,}4\\,m^2") viết chữ đứng \\text{m}: KaTeX mặc định coi m là biến, vẽ nghiêng như chữ "п"."""
    return re.sub(r"(\d|\})\s*\\[,;: ]\s*(km|cm|mm|m|kg|g|ha|l)(?=\^|[^a-zA-Z]|$)", lambda m: m.group(1) + "\\,\\text{" + m.group(2) + "}", tex)


def tach_cong_thuc(tex, toi_da=24):
    """Công thức dài: tách thành nhiều dòng TẠI dấu quan hệ ngoài cùng (=, ≈, ⇒...), dòng sau bắt đầu bằng dấu đó,
    như viết bảng - thay vì để máy ngắt dòng bừa giữa công thức (khó đọc, chữ nhỏ)."""
    if do_dai_hien(tex) <= toi_da or "\\text{" in tex and not QUAN_HE.search(tex):
        return [tex]
    manh, sau, sau_ngoac, i, bd = [], 0, 0, 0, 0
    while i < len(tex):
        ch = tex[i]
        if ch == "{":
            sau_ngoac += 1
        elif ch == "}":
            sau_ngoac -= 1
        elif sau_ngoac == 0:
            m = QUAN_HE.match(tex, i)
            if m and i > bd:
                manh.append(tex[bd:i].strip())
                bd = i
                i = m.end()
                continue
        i += 1
    manh.append(tex[bd:].strip())
    manh = [m for m in manh if m]
    if len(manh) <= 1:
        return [tex]
    # gộp tham lam: mỗi dòng không quá toi_da ký tự hiện ra
    dong = [manh[0]]
    for m in manh[1:]:
        if do_dai_hien(dong[-1] + m) <= toi_da:
            dong[-1] = dong[-1] + " " + m
        else:
            dong.append(m)
    return dong if len(dong) <= 4 else [tex]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kich_ban")
    ap.add_argument("--public", default="public")
    ap.add_argument("--props-ra", default=None)
    ap.add_argument("--giong", default=os.environ.get("GIONG", "vi-VN-HoaiMyNeural"))
    ap.add_argument("--toc-do", default=os.environ.get("TOC_DO") or "+15%")
    ap.add_argument("--cao-do", default=os.environ.get("CAO_DO", "+0Hz"))
    ap.add_argument("--phong-cach", default="phong_cach.json")
    ap.add_argument("--gia-lap", action="store_true", help="dùng tiếng bíp thay giọng thật (để thử máy)")
    # MỘT GIỌNG CỐ ĐỊNH cho mọi video: mặc định edge-tts (giọng NamMinh, không đổi giữa các cảnh, không phụ thuộc hạn mức).
    # Gemini TTS (MAY_GIONG=gemini) tự nhiên hơn nhưng là giọng AI sinh ra: mỗi lần gọi có thể lệch chất giọng, hết hạn mức thì phải đổi giọng.
    ap.add_argument("--may-giong", default=os.environ.get("MAY_GIONG") or "edge",
                    help="edge (mặc định, một giọng cố định) | gemini (giọng AI, cần GEMINI_KEYS)")
    ap.add_argument("--giong-gemini", default=os.environ.get("GIONG_GEMINI") or "Puck")
    ap.add_argument("--tts-model", default=os.environ.get("TTS_MODEL") or "gemini-2.5-flash-preview-tts")
    ap.add_argument("--toc-do-gemini", default=os.environ.get("TOC_DO_GEMINI") or "1.08")
    ap.add_argument("--phong-cach-giong", default=os.environ.get("PHONG_CACH_GIONG") or PHONG_CACH_GIONG_MAC_DINH)
    args = ap.parse_args()

    kb = json.load(open(args.kich_ban, encoding="utf8"))
    # cảnh ghi "dung_ban_ve": bung lại vật/điểm/vùng từ bản vẽ chung kb.ban_ve (Apps Script nén để kịch bản nhiều cảnh vừa giới hạn gửi)
    bv = kb.get("ban_ve") if isinstance(kb.get("ban_ve"), dict) else None
    for c in kb.get("canh") or []:
        du = (c.get("minh_hoa") or {}).get("du_lieu") if isinstance(c.get("minh_hoa"), dict) else None
        for v in (du.get("vat") or []) if isinstance(du, dict) else []:
            if isinstance(v, dict) and v.get("dung_ban_ve") and bv:
                for k in ("vat", "diem", "vung", "nhin"):
                    if k in bv and k not in v:
                        v[k] = bv[k]
    de_bai_the = the_de_bai(kb)
    canh = kb.get("canh") or []
    if not canh:
        sys.exit("Kịch bản không có cảnh nào.")
    id_ = str(kb.get("id") or "video")
    id_an_toan = re.sub(r"[^A-Za-z0-9_-]", "_", id_)

    thu_muc_giong = os.path.join(args.public, "giong")
    os.makedirs(thu_muc_giong, exist_ok=True)
    for f in os.listdir(thu_muc_giong):
        if f.endswith(".mp3"):
            os.remove(os.path.join(thu_muc_giong, f))

    canh_props = []
    bat_dau = 0
    tam_gem = tempfile.mkdtemp()
    giong_gem = None
    if not args.gia_lap and args.may_giong == "gemini":
        giong_gem = tao_giong_gemini(canh, tam_gem, args)
    for i, c in enumerate(canh):
        so = int(c.get("so") or i + 1)
        loi_thoai = str(c.get("loi_thoai") or "").strip()
        noi_dung_tam = [str(x) for x in (c.get("noi_dung_man_hinh") or []) if str(x).strip()]
        # công thức dài -> nhiều dòng ngắt tại dấu "=" (giữ chữ to, không ngắt bừa); cảnh biến đổi (bien_doi) giữ nguyên từng bước
        if str(c.get("trinh_bay") or "") != "bien_doi":
            noi_dung_tam = [d for x in noi_dung_tam for d in tach_cong_thuc(x)]
        if not loi_thoai:
            sys.exit("Cảnh %d không có lời thoại." % so)
        cac_doan = tach_cau(loi_thoai)
        gap = GAP
        with tempfile.TemporaryDirectory() as tam:
            ten = "%s_c%d.mp3" % (id_an_toan, so)
            if giong_gem and i in giong_gem:
                # Gemini đọc cả cảnh một lần (ngữ điệu liền mạch); mốc từng câu chia theo số ký tự
                gon = os.path.join(tam, "g.mp3")
                cat_lang(giong_gem[i], gon)
                tong = do_thoi_luong(gon)
                ky_tu = [max(1, len(d)) for d in cac_doan]
                do_dai = [tong * k / sum(ky_tu) for k in ky_tu]
                shutil.copyfile(gon, os.path.join(thu_muc_giong, "tam_" + ten))
                gap = 0
            else:
                cac_tep_tho = asyncio.run(tao_cac_doan(cac_doan, tam, args))
                cac_tep = []
                for k, tho in enumerate(cac_tep_tho):
                    gon = os.path.join(tam, "g%03d.mp3" % k)
                    cat_lang(tho, gon)
                    cac_tep.append(gon)
                do_dai = [do_thoi_luong(t) for t in cac_tep]
                ghep(cac_tep, os.path.join(thu_muc_giong, "tam_" + ten))
            # chuẩn hóa độ lớn giọng (kiểu podcast/TikTok, -15 LUFS) để lời giảng luôn rõ hơn nhạc nền
            chay(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(thu_muc_giong, "tam_" + ten), "-af",
                  "highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-15:TP=-1.5:LRA=7",
                  "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", os.path.join(thu_muc_giong, ten)])
            os.remove(os.path.join(thu_muc_giong, "tam_" + ten))
        tong_am = do_thoi_luong(os.path.join(thu_muc_giong, ten))

        lead_c, tail_c = nghi_canh(canh, i)
        cau, t = [], lead_c
        for d, dd in zip(cac_doan, do_dai):
            doan = chia_phu_de(d)
            tong_ky_tu = float(sum(len(x) for x in doan))
            t_doan = t
            for x in doan:
                dai_x = dd * len(x) / tong_ky_tu
                cau.append({"text": x, "bat": round(t_doan, 3), "ket": round(t_doan + dai_x, 3)})
                t_doan += dai_x
            t += dd + gap

        so_frame = max(int(round((lead_c + tong_am + tail_c) * FPS)), 2 * FPS)
        loai_hinh = str((c.get("minh_hoa") or {}).get("loai") or "").lower()
        toi_thieu = {"venn": 4.6, "luoi_mau": 5.2, "dien_tich": 6.0, "thuc_nghiem": 5.6, "so_do_cay": 5.0, "bi_hop": 3.8}.get(loai_hinh, 0)
        if loai_hinh == "san_khau":
            sb, co_quay = so_buoc_san_khau((c.get("minh_hoa") or {}).get("du_lieu"))
            toi_thieu = 1.0 + sb * 0.9 + (2.6 if co_quay else 0.8)
        so_frame = max(so_frame, int(round(toi_thieu * FPS)))
        tb = trinh_bay(c, noi_dung_tam)
        if tb in ("bien_doi", "cong_don") and len(noi_dung_tam) >= 1:
            # đủ thời gian cho mọi phép biến hình (mỗi dòng cách nhau 1,1 giây + 0,9 giây biến hình + khung đáp án)
            can = 1.25 + (len(noi_dung_tam) - 1) * 1.45 + 0.9 + (1.6 if re.search(r"dap_an|ket_qua", str(c.get("loai") or "").lower()) else 0.6)
            so_frame = max(so_frame, int(round(can * FPS)))
        mh = c.get("minh_hoa") or {}
        noi_dung = [chuan_don_vi(str(x)) for x in (c.get("noi_dung_man_hinh") or []) if str(x).strip()]
        canh_props.append({
            "so": so,
            "loai": str(c.get("loai") or ""),
            "noiDung": noi_dung,
            "minhHoa": {
                "loai": str(mh.get("loai") or "khong"),
                "moTa": str(mh.get("mo_ta") or ""),
                "duLieu": mh.get("du_lieu"),
            },
            "audio": "giong/" + ten,
            "batDau": bat_dau,
            "soFrame": so_frame,
            "leadFrame": int(round(lead_c * FPS)),
            "cau": cau,
            "trinhBay": trinh_bay(c, noi_dung),
            "chuThich": [str(x) for x in (c.get("chu_thich") or []) if str(x).strip()][:3],
            "tieuDeCanh": str(c.get("tieu_de_canh") or "").strip()[:70],
            "tuKhoa": str(c.get("tu_khoa") or "").strip()[:30],
            "nhan": str(c.get("nhan") or "").strip()[:16],
            "giuSanKhau": bool(c.get("giu_san_khau")) and i > 0,
            "chuyenCanh": str(c.get("chuyen_canh") or ""),
            "gocNhin": [str(x) for x in (c.get("goc_nhin") or [])][:4] if isinstance(c.get("goc_nhin"), list) else ([str(c.get("goc_nhin"))] if c.get("goc_nhin") else []),
        })
        bat_dau += so_frame
        so_tu = len(loi_thoai.split())
        print("Cảnh %d: %d câu, %d từ, giọng %.1fs (%.1f từ/giây), %d khung hình" % (so, len(cac_doan), so_tu, tong_am - GAP, so_tu / max(0.1, tong_am - GAP), so_frame))

    nhac = chon_nhac(args.public, id_an_toan)
    if nhac == "nhac/nen.wav" and os.environ.get("NHAC_THEO_CANH", "1") != "0":
        for f in os.listdir(os.path.join(args.public, "nhac")):
            if f.startswith("tron_"):
                os.remove(os.path.join(args.public, "nhac", f))
        nhac = tron_nhac_theo_canh(args.public, id_an_toan, canh, canh_props) or nhac
    hook_chu = str(kb.get("hook_chu") or kb.get("hook") or "").strip()
    pc, nen_co_dinh, th = doc_phong_cach(args.phong_cach)
    # bộ hiệu ứng chuyển động: "moi" (chữ 3 tầng, máy quay sống, vòng sóng, dấu BẪY, lóe sáng đáp án) | "cu"
    # ưu tiên: biến môi trường KIEU_CHUYEN_DONG (chạy thử tay trên GitHub) > kịch bản "kieu_chuyen_dong" > phong_cach.json
    kieu_cd = (os.environ.get("KIEU_CHUYEN_DONG") or str(kb.get("kieu_chuyen_dong") or "")).strip()
    if kieu_cd in ("moi", "cu"):
        pc["chuyenDong"] = kieu_cd
    # NỀN: mặc định mỗi video TỰ TẠO một nền riêng (kiểu + tông màu sinh từ mã video); nền ảnh trên Drive chỉ dùng khi DUNG_NEN_DRIVE=1
    dung_nen_drive = os.environ.get("DUNG_NEN_DRIVE") == "1" or pc.get("dungNenDrive") is True
    ds_nen = chon_nen(args.public, id_an_toan, nen_co_dinh, pc.get("soNenToiDa", 3)) if dung_nen_drive else []
    import hashlib
    bam = int(hashlib.sha1(id_.encode("utf8")).hexdigest()[:8], 16)
    kieu_nen = ["cuc_quang", "hat_sang", "song", "luc_giac", "tia", "ky_hieu", "luoi"]
    nen_tu_tao = None if ds_nen else {"kieu": kieu_nen[bam % len(kieu_nen)], "hue": (bam >> 8) % 360, "hat": bam}
    thuong_hieu, outro = tim_thuong_hieu(args.public, th)
    bai_hoc = [str(x).strip()[:90] for x in (kb.get("bai_hoc_rut_ra") or []) if str(x).strip()][:3]
    # Mặc định KHÔNG chèn màn kết/outro vào cuối video (video dừng ngay sau cảnh bài học).
    # Muốn bật lại: phong_cach.json -> "thuongHieu": {"coManKet": true} (màn kết tự tạo; thêm "dungOutroRieng": true để dùng tệp outro).
    outro = chon_man_ket(outro, dict(th, logo=thuong_hieu.get("logo")), bai_hoc) if th.get("coManKet") else None
    if outro:
        outro["batDau"] = bat_dau
        bat_dau += outro["soFrame"]
    props = {
        "id": id_an_toan,
        "tieuDe": str(kb.get("tieu_de") or kb.get("chu_de") or ""),
        "hook": str(kb.get("hook") or ""),
        "dapAn": str(kb.get("dap_an_cuoi") or kb.get("dap_an") or ""),
        "lop": str(kb.get("lop") or ""),
        "fps": FPS,
        "tongFrame": bat_dau,
        "hookChu": hook_chu,
        "hookKieu": str(kb.get("hook_kieu") or ""),
        "nhanManh": [str(x) for x in (kb.get("nhan_manh") or [])][:5],
        "nhac": nhac,
        "amLuongNhac": float(os.environ.get("AM_LUONG_NHAC") or (0.16 if nhac and (nhac.endswith("nen.wav") or "/tron_" in nhac) else 0.12)),
        "chuDe": str(kb.get("chu_de_ngan") or kb.get("chu_de") or "")[:40],
        "baiHoc": bai_hoc,
        "bia": tao_bia(kb, canh, canh_props),
        "series": {"ten": str(kb["series"].get("ten") or "")[:40], "tap": int(kb["series"].get("tap") or 0)} if isinstance(kb.get("series"), dict) and kb["series"].get("tap") else None,
        "quangCao": {"ten": str((kb.get("san_pham") or {}).get("ten") or "")[:60]} if isinstance(kb.get("san_pham"), dict) and (kb.get("san_pham") or {}).get("ten") else None,
        "duKien": [str(x).strip()[:30] for x in (kb.get("du_kien") or []) if str(x).strip()][:4],
        "deBai": de_bai_the,
        "tiepTheo": str(kb.get("video_tiep_theo") or "")[:70],
        "nen": ds_nen[0] if ds_nen else None,
        "dsNen": ds_nen,
        "nenTuTao": nen_tu_tao,
        "thuongHieu": thuong_hieu,
        "outro": outro,
        "phongCach": pc,
        "canh": canh_props,
    }
    if not args.gia_lap:
        print("Giọng đọc: %d cảnh bằng Gemini TTS (%s), %d đoạn bằng edge-tts (%s), %d đoạn bằng Google TTS dự phòng" % (
            THONG_KE_GIONG["gemini"], args.giong_gemini, THONG_KE_GIONG["edge"], args.giong, THONG_KE_GIONG["gtts"]))
    dich = args.props_ra or os.path.join(args.public, "props.json")
    with open(dich, "w", encoding="utf8") as f:
        json.dump(props, f, ensure_ascii=False, indent=1)
    print("Xong: %d cảnh, %.1f giây -> %s" % (len(canh_props), bat_dau / FPS, dich))


if __name__ == "__main__":
    main()
