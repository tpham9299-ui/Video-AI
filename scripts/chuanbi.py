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
import time
import difflib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import hashlib
import threading
from concurrent.futures import ThreadPoolExecutor

CACHE_TTS_DIR = os.environ.get("CACHE_TTS_DIR") or os.path.join(tempfile.gettempdir(), "video_ai_tts_cache")
try:
    os.makedirs(CACHE_TTS_DIR, exist_ok=True)
except Exception:
    pass

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
    if str(tep).lower().endswith(".wav"):
        try:
            import wave
            with wave.open(tep, "rb") as w:
                sr = w.getframerate()
                if sr > 0:
                    return w.getnframes() / float(sr)
        except Exception:
            pass
    out = chay(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", tep])
    return float(out.strip())


# ---------- Chuẩn hóa văn bản để giọng đọc không đọc sai ----------
# ĐỌC KÝ HIỆU HÌNH HỌC thành lời (trước đây "⊥", "(SAC)", "BD"... để nguyên -> giọng Gemini đọc lạc, sinh tiếng RÈ)
TEN_CHU_CAI = {"A": "a", "B": "bê", "C": "xê", "D": "đê", "E": "e", "F": "ép", "G": "gờ", "H": "hát", "I": "i", "J": "giây", "K": "ca", "L": "lờ",
               "M": "mờ", "N": "nờ", "O": "o", "P": "pê", "Q": "quy", "R": "rờ", "S": "ét", "T": "tê", "U": "u", "V": "vê", "W": "vê kép", "X": "ích",
               "Y": "i dài", "Z": "dét"}
DOC_CHU_CAI = {"bat": False}   # bật cho video HÌNH HỌC (main đặt theo kb.mon / đề): đánh vần tên điểm "BD" -> "bê đê"
KY_HIEU_DOC = [("⊥", " vuông góc với "), ("∥", " song song với "), ("//", " song song với "), ("∠", " góc "), ("△", " tam giác "), ("Δ", " tam giác "),
               ("°", " độ"), ("≈", " xấp xỉ "), ("≤", " nhỏ hơn hoặc bằng "), ("≥", " lớn hơn hoặc bằng "), ("≠", " khác "), ("√", " căn "),
               ("²", " bình phương"), ("³", " lập phương"), ("π", " pi"), ("∈", " thuộc "), ("∉", " không thuộc "), ("⇒", ", suy ra "), ("⇔", ", tương đương "),
               ("→", " suy ra "), ("∩", " giao "), ("∪", " hợp "), ("≡", " trùng "), ("∼", " đồng dạng với "), ("~", " đồng dạng với "), ("…", ", "), ("·", " nhân "),
               ("±", " cộng trừ "), ("−", " trừ "), ("∞", " vô cùng ")]


LOI_CHINH_TA_VIET = [
    (r"(?i)\bxác\s+xuất\b", "xác suất"),
    (r"(?i)\bsác\s+suất\b", "xác suất"),
    (r"(?i)\bsác\s+xuất\b", "xác suất"),
    (r"(?i)\bgiả\s+thuyết\b", "giả thiết"),
    (r"(?i)\bhình\s+chiêu\b", "hình chiếu"),
    (r"(?i)\bđường\s+trung\s+truc\b", "đường trung trực"),
    (r"(?i)\btrung\s+diem\b", "trung điểm"),
    (r"(?i)\btrọng\s+tam\b", "trọng tâm"),
    (r"(?i)\btam\s+giac\b", "tam giác"),
    (r"(?i)\bxac\s+suat\b", "xác suất"),
    (r"(?i)\bvuông\s+goc\b", "vuông góc"),
    (r"(?i)\blăng\s+tru\b", "lăng trụ"),
    (r"(?i)\btứ\s+dien\b", "tứ diện"),
    (r"(?i)\bhình\s+chop\b", "hình chóp"),
    (r"(?i)\bmặt\s+phang\b", "mặt phẳng"),
    (r"(?i)\bkhông\s+gian\s+mau\b", "không gian mẫu"),
    (r"(?i)\bbiến\s+co\b", "biến cố"),
    (r"(?i)\bchỉnh\s+hop\b", "chỉnh hợp"),
    (r"(?i)\btổ\s+hop\b", "tổ hợp"),
    (r"(?i)\bhoán\s+vi\b", "hoán vị"),
    (r"(?i)\bbất\s+đẳng\s+thuc\b", "bất đẳng thức"),
    (r"(?i)\bhệ\s+thức\s+luong\b", "hệ thức lượng"),
    (r"(?i)\bđịnh\s+li\b", "định lý"),
    (r"(?i)\bchứng\s+mình\b", "chứng minh"),
    (r"(?i)\bdiện\s+tich\b", "diện tích"),
    (r"(?i)\bthể\s+tich\b", "thể tích"),
    (r"(?i)\bbán\s+kinh\b", "bán kính"),
    (r"(?i)\bđường\s+kinh\b", "đường kính"),
]


def sua_chinh_ta_tieng_viet(text):
    s = re.sub(r"(\d)\s*[xX]\s*(?=\d)", r"\1 × ", str(text or ""))
    # Đổi các lệnh LaTeX bị sót sang chữ đọc tự nhiên trước khi hiển thị phụ đề
    for _ in range(3):
        s_cu = s
        s = re.sub(r"\\[dt]?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}", r"\1 phần \2", s)
        s = re.sub(r"\\binom\s*\{([^{}]+)\}\s*\{([^{}]+)\}", r"C \2 của \1", s)
        s = re.sub(r"\\sqrt\s*\[3\]\s*\{([^{}]+)\}", r"căn bậc ba của \1", s)
        s = re.sub(r"\\sqrt\s*\{([^{}]+)\}", r"căn \1", s)
        s = re.sub(r"\\(?:text|mathrm|textbf|textit)\s*\{([^{}]*)\}", r"\1", s)
        if s == s_cu:
            break
    for cmd, thay in ((r"\\perp\b", " vuông góc với "), (r"\\parallel\b", " song song với "),
                      (r"\\(?:angle|widehat)\b", " góc "), (r"\\(?:triangle|Delta)\b", " tam giác "),
                      (r"\^\s*\{?\\circ\}?", " độ "), (r"\\circ\b", " độ "),
                      (r"\\(?:cdot|times)\b", " nhân "), (r"\\div\b", " chia "),
                      (r"\\(?:approx)\b", " xấp xỉ "), (r"\\(?:le|leq)\b", " nhỏ hơn hoặc bằng "),
                      (r"\\(?:ge|geq)\b", " lớn hơn hoặc bằng "), (r"\\(?:ne|neq)\b", " khác "),
                      (r"\\(?:Rightarrow|implies|to)\b", " suy ra "), (r"\\(?:Leftrightarrow|iff)\b", " tương đương "),
                      (r"\\(?:sim|backsim)\b", " đồng dạng với "), (r"\\pi\b", " pi "),
                      (r"\\alpha\b", " an pha "), (r"\\beta\b", " bê ta "), (r"\\Omega\b", " ô mê ga "),
                      (r"\^2\b", " bình phương"), (r"\^3\b", " lập phương")):
        s = re.sub(cmd, thay, s)
    s = re.sub(r"\\[a-zA-Z]+|[{}$]", " ", s)
    for pat, rep in LOI_CHINH_TA_VIET:
        def _giu_hoa(m, r=rep):
            goc = m.group(0)
            if goc.isupper():
                return r.upper()
            if goc[0].isupper():
                return r[0].upper() + r[1:]
            return r
        s = re.sub(pat, _giu_hoa, s)
    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    # tên khối S.ABCD / ABC.A'B'C' giữ liền (trước đây bị tách "S. ABCD" -> tách câu sai, giọng ngắt giữa tên hình)
    s = re.sub(r"\b([A-Z]{1,4}'*)\.(?=[A-Z]'*[A-Z])", "\\1\u00a7", s)
    s = re.sub(r"([,.;:!?])(?=[A-Za-zÀ-ỹđĐ])", r"\1 ", s)
    s = s.replace("\u00a7", ".")
    return re.sub(r"\s+", " ", s).strip()


def _danh_van(m):
    chu = m.group(0)
    phay = chu.count("'")
    ten = " ".join(TEN_CHU_CAI.get(c, c) for c in chu.replace("'", ""))
    return " " + ten + (" phẩy" * phay) + " "


# ---------- v89: PHỤ ĐỀ HIỂN THỊ SỐ & KÝ HIỆU (tách khỏi văn bản đọc TTS) ----------
# Văn đọc ("năm mươi tư pi mét khối", "một phần bốn", "x bằng mười") chỉ để giọng đọc; phụ đề phải hiện "54π m³", "1/4", "x = 10".
# Mốc thời gian vẫn tính trên văn đọc (từng từ thật), chỉ chữ hiển thị của mỗi cụm được đổi. Cụm toán nối bằng dấu cách không ngắt
# ( ) để phụ đề không chẻ "x = 10" thành hai cụm.
SO_DON_VI = {"không": 0, "zero": 0, "một": 1, "mốt": 1, "hai": 2, "ba": 3, "bốn": 4, "tư": 4, "năm": 5, "lăm": 5,
             "sáu": 6, "bảy": 7, "tám": 8, "chín": 9}
TU_SO = set(SO_DON_VI) | {"mười", "mươi", "trăm", "linh", "lẻ", "nghìn", "ngàn"}
DON_VI_HIEN = [("xăng ti mét vuông", "cm²"), ("xăng-ti-mét vuông", "cm²"), ("xăng ti mét khối", "cm³"), ("xăng-ti-mét khối", "cm³"),
               ("xăng-ti-mét", "cm"), ("xăng ti mét", "cm"), ("xen-ti-mét", "cm"), ("xen ti mét", "cm"), ("centimet", "cm"), ("xentimét", "cm"),
               ("mét vuông", "m²"), ("mét khối", "m³"), ("ki-lô-mét", "km"), ("ki lô mét", "km"), ("mi-li-mét", "mm"), ("ki-lô-gam", "kg"),
               ("m lập phương", "m³"), ("m bình phương", "m²"), ("mét", "m")]
DON_VI_SAU_SO = re.compile(r"^(cm|mm|m|km|kg|g|m²|m³|cm²|cm³|mét|độ|phần|lít|giờ|phút|giây|đồng|nghìn|triệu|thẻ|số|pi|lần|người|bạn|viên|quả|cái|%|nhỏ|lớn|bằng|cộng|trừ|nhân|chia|<|>|=)$|^(xăng|xen|ki-lô|mi-li)", re.I)
NOI_CUM_SO = {"phần", "phẩy", "pi", "mét", "xăng-ti-mét", "bằng", "nhỏ", "lớn", "hơn", "trừ", "cộng", "nhân", "chia", "bình", "lập", "phương"}
KHONG_LA_SO = re.compile(r"^(bằng|=|trừ|cộng|nhân|chia|<|>|≤|≥|là)$", re.I)
TU_TOAN_TRUOC = re.compile(r"^(bằng|=|là|phẩy|phần|chia|nhân|cộng|trừ|<|>|hơn|được|còn|tổng|tích|x|r|h|y|n|k)$", re.I)


def _gia_tri_cum_so(ws):
    tong = tram = 0
    chuc = dv = -1
    for w in ws:
        if w == "trăm":
            tram += (dv if dv >= 0 else 1) * 100
            dv = chuc = -1
        elif w in ("nghìn", "ngàn"):
            tong += ((tram + max(0, chuc) * 10 + max(0, dv)) or 1) * 1000
            tram = 0
            dv = chuc = -1
        elif w == "mười":
            if chuc >= 0 or dv >= 0:
                return None
            chuc = 1
        elif w == "mươi":
            if dv < 0:
                return None
            chuc, dv = dv, -1
        elif w in ("linh", "lẻ"):
            chuc = 0
        elif w in SO_DON_VI:
            if dv >= 0:
                return None
            dv = SO_DON_VI[w]
    return tong + tram + max(0, chuc) * 10 + max(0, dv) if ws else None


def so_chu_sang_so(text):
    """'năm mươi tư' -> '54'; 'mười cm' -> '10 cm'; một từ số lẻ chỉ đổi khi đứng sau từ toán (bằng, phần...) hoặc trước đơn vị."""
    tu = text.split(" ")
    ra = []
    i = 0
    while i < len(tu):
        w = tu[i]
        sach = w.lower().strip(",.;:!?")
        if sach not in TU_SO or w.lower() != sach and i + 1 < len(tu) and False:
            ra.append(w)
            i += 1
            continue
        cum, j = [], i
        while j < len(tu) and tu[j].lower().strip(",.;:!?") in TU_SO:
            cum.append(tu[j].lower().strip(",.;:!?"))
            if tu[j][-1:] in ",.;:!?":
                j += 1
                break
            j += 1
        dau_cuoi = tu[j - 1][-1:] if tu[j - 1][-1:] in ",.;:!?" else ""
        sau = tu[j].lower().strip(",.;:!?") if j < len(tu) else ""
        truoc = ra[-1].lower().strip(",.;:!?") if ra else ""
        v = _gia_tri_cum_so(cum)
        # "không" đơn lẻ chỉ là số 0 khi đứng sau từ toán ("bằng không"), tránh đổi "không thỏa mãn"
        # v92: "tích không chia hết" -> giữ chữ (trước đây "tích"/"tổng"/"được" làm "không" thành 0)
        if cum == ["không"] and not (KHONG_LA_SO.match(truoc) or sau in ("phẩy", "<", ">")):
            v = None
        doi = v is not None and (len(cum) >= 2 or DON_VI_SAU_SO.match(sau) or TU_TOAN_TRUOC.match(truoc) or cum[0] == "zero")
        if not doi:
            ra.append(w)
            i += 1
            continue
        ra.append(str(v) + dau_cuoi)
        i = j
    return " ".join(ra)


def hien_phu_de(text):
    s = so_chu_sang_so(re.sub(r"\s+", " ", str(text)).strip())
    s = re.sub(r"(\d)\s+pi\b", r"\1π", s, flags=re.I)
    s = re.sub(r"(?<![\wÀ-ỹ])([a-zA-Z])\s+phẩy\b", r"\1'", s)
    for doc, hien in DON_VI_HIEN:
        s = re.sub(r"(\d|π)\s+" + re.escape(doc) + r"(?![\wÀ-ỹ])", r"\1 " + hien, s, flags=re.I)
    s = re.sub(r"(\d+)\s+phần trăm\b", r"\1%", s)
    s = re.sub(r"(\d+)\s+phẩy\s+(\d+)", r"\1,\2", s)                       # 29 phẩy 5 -> 29,5
    s = re.sub(r"\b\d{5,}\b", lambda m: "{:,}".format(int(m.group(0))).replace(",", "."), s)   # 500000 -> 500.000
    s = re.sub(r"\s+mỗi\s+(mét vuông|m²)(?![\wÀ-ỹ])", "/m²", s)
    s = re.sub(r"\s+mỗi\s+(mét khối|m³)(?![\wÀ-ỹ])", "/m³", s)
    s = re.sub(r"(\d+)\s+phần\s+(\d+)", r"\1/\2", s)
    s = re.sub(r"(\S)\s+bình phương\b", r"\1²", s)
    s = re.sub(r"(\S)\s+lập phương\b", r"\1³", s)
    toan = r"(?:[a-zA-Z]'?\([a-z]\)|[\d.,]+[π²³%]?|[a-zA-Z]'?[²³]?|\)[²³]?)"
    # v92: so sánh < > chỉ khi một vế là BIẾN chữ (x, r, V(x)) -> câu văn "4 lớn hơn 384!" không thành ký hiệu
    bien = r"(?:[a-zA-Z]'?\([a-z]\)|[a-zA-Z]'?[²³]?)"
    for doc, ky in (("lớn hơn hoặc bằng", "≥"), ("nhỏ hơn hoặc bằng", "≤"), ("nhỏ hơn", "<"), ("lớn hơn", ">")):
        s = re.sub(r"(?<![\wÀ-ỹ'])(" + bien + r")\s+" + doc + r"\s+(?=" + toan + r"(?![\wÀ-ỹ!]))", r"\1 " + ky + " ", s)
        s = re.sub(r"(?<![\wÀ-ỹ'])(" + toan + r")\s+" + doc + r"\s+(?=" + bien + r"(?![\wÀ-ỹ!]))", r"\1 " + ky + " ", s)
    for doc, ky in (("bằng", "="), ("trừ", "−"), ("cộng", "+"), ("nhân", "·")):
        s = re.sub(r"(?<![\wÀ-ỹ'])(" + toan + r")\s+" + doc + r"\s+(?=" + toan + r"(?![\wÀ-ỹ]))", r"\1 " + ky + " ", s)
    # nối cụm toán bằng dấu cách không ngắt: "x = 10", "0 < x < 30", "30 − x", "54π m³"
    s = re.sub(r"(?<=\S) (?=[=<>≤≥−+·] )", " ", s)
    s = re.sub(r"(?<=[=<>≤≥−+·]) (?=\S)", " ", s)
    s = re.sub(r"(?<=\d|π) (?=(?:cm|mm|m|km|kg|m²|m³|cm²|cm³)(?![\wÀ-ỹ]))", " ", s)
    return s


# v92: tên chữ cái thường khi đọc ký hiệu hàm / vi phân (biến y đọc "i", không phải "i dài")
TEN_BIEN = {"x": "ích", "y": "i", "t": "tê", "r": "rờ", "s": "ét", "v": "vê", "f": "ép", "g": "gờ", "h": "hát", "n": "nờ", "k": "ca",
            "a": "a", "b": "bê", "c": "xê", "m": "mờ", "p": "pê", "q": "quy", "l": "lờ", "d": "đê", "u": "u", "z": "dét", "w": "vê kép"}


def _ten_ky(c):
    return TEN_CHU_CAI.get(c, c) if c.isupper() else TEN_BIEN.get(c, c)


def doc_ky_hieu_ham(s):
    """v92: S'(r) -> "ét phẩy rờ", V'(x) -> "vê phẩy ích", V(x) -> "vê ích"; dt/dx/dy -> "đê tê"/"đê ích"/"đê i";
    "zero" và chữ số 0 đứng riêng -> "không" (giọng Gemini hay đọc "dt" thành "diện tích", "0" thành "zero")."""
    s = re.sub(r"(?<![\wÀ-ỹ'])([A-Za-z])('+)\s*\(\s*([a-z])\s*\)", lambda m: " %s%s %s " % (_ten_ky(m.group(1)), " phẩy" * len(m.group(2)), _ten_ky(m.group(3))), s)
    s = re.sub(r"(?<![\wÀ-ỹ'])([A-Za-z])\(\s*([a-z])\s*\)", lambda m: " %s %s " % (_ten_ky(m.group(1)), _ten_ky(m.group(2))), s)
    if not DOC_CHU_CAI["bat"]:
        s = re.sub(r"(?<![\wÀ-ỹ'])([A-Za-z])('+)(?![\wÀ-ỹ'])", lambda m: " %s%s " % (_ten_ky(m.group(1)), " phẩy" * len(m.group(2))), s)
    s = re.sub(r"(?<![\wÀ-ỹ])d([txyr])(?![\wÀ-ỹ])", lambda m: " đê " + _ten_ky(m.group(1)) + " ", s)
    s = re.sub(r"(?i)\bzero\b", "không", s)
    s = re.sub(r"(?<![\d.,])0(?![\d.,])", "không", s)
    return s


def chuan_hoa_doc(text):
    s = doc_ky_hieu_ham(sua_chinh_ta_tieng_viet(text))
    # v89: đơn vị sau số đọc thành lời (lời thoại nay viết "10 cm", "54π m³" cho phụ đề; giọng vẫn đọc tự nhiên)
    for ky, doc in (("cm²", "xăng-ti-mét vuông"), ("cm³", "xăng-ti-mét khối"), ("m²", "mét vuông"), ("m³", "mét khối"),
                    ("cm", "xăng-ti-mét"), ("mm", "mi-li-mét"), ("km", "ki-lô-mét"), ("m", "mét")):
        s = re.sub(r"(\d|π)\s*" + re.escape(ky) + r"(?![\wÀ-ỹ²³])", r"\1 " + doc, s)
    s = re.sub(r"(?<=\s)<(?=\s)", "nhỏ hơn", s)
    s = re.sub(r"(?<=\s)>(?=\s)", "lớn hơn", s)
    s = re.sub(r"(\d)\s*⋮\s*(\d)", r"\1 chia hết cho \2", s)
    s = re.sub(r"\b([A-Z]{1,4}'*)\.(?=[A-Z]'*[A-Z])", r"\1 ", s)   # S.ABCD -> "S ABCD" (đọc liền, không ngắt ở dấu chấm)
    s = re.sub(r"\(\s*([A-Z]{3,4})\s*\)", r" mặt phẳng \1 ", s)    # (SAC) -> mặt phẳng SAC
    s = re.sub(r"\(\s*([A-Z])\s*\)", r" \1 ", s)                  # đường tròn (O) -> đường tròn O
    for k, v in KY_HIEU_DOC:
        s = s.replace(k, v)
    s = re.sub(r"(\d+)\s*/\s*(\d+)", r"\1 phần \2", s)       # 3/5 -> "3 phần 5"
    s = re.sub(r"(\d)\s*%", r"\1 phần trăm", s)
    s = re.sub(r"\s*/\s*(năm|tháng|ngày|giờ|giây|phút|kỳ|quý|tuần|người|chai|cái|kg|km|m)\b", r" mỗi \1", s)   # 6%/năm -> 6 phần trăm mỗi năm
    s = s.replace("×", " nhân ").replace("÷", " chia ").replace("=", " bằng ")
    s = re.sub(r"(?<=\s)\+(?=\s)", "cộng", s)
    s = re.sub(r"(?<=\s)-(?=\s)", "trừ", s)
    if DOC_CHU_CAI["bat"]:
        # tên điểm / đoạn / mặt: 1-4 chữ in hoa đứng riêng (có thể kèm dấu phẩy trên A') -> đọc từng chữ cái kiểu Việt
        s = re.sub(r"(?<![A-Za-zÀ-ÖØ-öø-ɏḀ-ỹ])[A-Z]{1,4}'*(?![A-Za-zÀ-ÖØ-öø-ɏḀ-ỹ])", _danh_van, s)
    s = re.sub(r"\s+([,.!?])", r"\1", re.sub(r"\s+", " ", s)).strip()
    return s


# ---------- PHÁT HIỆN GIỌNG RÈ / TẠP ÂM (giọng Gemini đôi khi "đọc lạc" ra tiếng rè, ồ, xì) ----------
def do_tap_am(wav):
    """Tỉ lệ khung 0,25 giây bị TẠP ÂM (to mà lại "xì" như nhiễu: tỉ lệ qua điểm 0 rất cao) + tỉ lệ mẫu bị VỠ TIẾNG (chạm trần).
    Trả (ti_le_tap_am, ti_le_vo, ti_le_lien_tuc): giọng sạch thường ~0; tiếng rè / nhiễu > 0,03."""
    import wave
    import array
    try:
        with wave.open(wav, "rb") as w:
            sr, n, kenh, rong = w.getframerate(), w.getnframes(), w.getnchannels(), w.getsampwidth()
            if rong != 2 or n <= 0:
                return 0.0, 0.0, 0.0
            raw = w.readframes(n)
    except Exception as e:
        print("Không đo được tạp âm:", e)
        return 0.0, 0.0, 0.0
    buoc = max(1, int(sr * 0.25))
    try:
        import numpy as np
        arr = np.frombuffer(raw, dtype="<i2")
        if kenh > 1:
            arr = arr[::kenh]
        n_mau = len(arr)
        vo = int(np.count_nonzero((arr > 32000) | (arr < -32000)))
        m = (n_mau - 1) // buoc if n_mau > buoc else 0
        if m == 0:
            return 0.0, vo / float(max(1, n_mau)), 0.0
        kh = arr[:m * buoc].reshape(m, buoc)
        k4 = kh[:, ::4].astype(np.float64)
        nl = np.mean(k4 * k4, axis=1)
        db = 10.0 * np.log10(nl / (32768.0 ** 2) + 1e-12)
        sig = kh >= 0
        zcr = np.count_nonzero(sig[:, :buoc - 1:2] != sig[:, 1:buoc:2], axis=1) / (buoc / 2.0)
        to_mask = db > -32
        to = int(np.count_nonzero(to_mask))
        co_xi = (to_mask & (zcr > 0.32)).tolist()
        tong = m
    except ImportError:
        a = array.array("h")
        a.frombytes(raw)
        if kenh > 1:
            a = a[::kenh]
        n_mau = len(a)
        to = 0
        vo = sum(1 for x in a if x > 32000 or x < -32000)
        co_xi = []
        for i in range(0, n_mau - buoc, buoc):
            k = a[i:i + buoc]
            nl = sum(x * x for x in k[::4]) / max(1, len(k[::4]))
            db = 10 * math.log10(nl / (32768.0 ** 2) + 1e-12)
            xi = False
            if db > -32:
                to += 1
                zcr = sum(1 for j in range(1, len(k), 2) if (k[j - 1] >= 0) != (k[j] >= 0)) / (len(k) / 2.0)
                xi = zcr > 0.32
            co_xi.append(xi)
        tong = max(1, len(co_xi))
    # chỉ tính tiếng xì kéo dài LIÊN TỤC >= 0,5 giây (2 khung): âm "x", "s" của giọng thật chỉ ~0,1-0,2 giây, không bị tính nhầm
    xau, chuoi = 0, 0
    for xi in co_xi + [False]:
        if xi:
            chuoi += 1
        else:
            if chuoi >= 2:
                xau += chuoi
            chuoi = 0
    return xau / float(max(1, to)), vo / float(max(1, n_mau)), to / float(max(1, tong))


def giong_bi_re(wav, ten=""):
    tap, vo, lien = do_tap_am(wav)
    re_ = tap > 0.03 or vo > 0.004
    print("Đo giọng %s: tạp âm %.1f%%, vỡ tiếng %.2f%%, có tiếng %.0f%% thời lượng%s" % (ten, tap * 100, vo * 100, lien * 100, " -> RÈ/NHIỄU" if re_ else " -> sạch"))
    return re_


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
    for idx, w in enumerate(tu):
        cur.append(w)
        dai = len(" ".join(cur))
        con_phan = k - len(phan)
        if con_phan <= 1:
            continue
        # v89: không cắt giữa cụm số/biểu thức đọc thành lời ("năm mươi | tư", "x bằng | mười") -> phụ đề đổi được về "54", "x = 10"
        nxt = tu[idx + 1].lower().strip(",.;:!?") if idx + 1 < len(tu) else ""
        hien = w.lower().strip(",.;:!?")
        if w[-1:] not in ",;:" and hien in TU_SO and nxt in TU_SO:
            continue   # v92: không bao giờ chẻ một con số ("một nghìn | không trăm hai mươi tư" -> "1000" + "24")
        if w[-1:] not in ",;:" and (nxt in TU_SO or nxt in NOI_CUM_SO or hien in NOI_CUM_SO) and dai < 1.5 * con_lai / con_phan:
            continue
        muc_tieu = con_lai / con_phan
        if dai >= muc_tieu or (w[-1:] in ",;:" and dai >= 0.7 * muc_tieu):
            phan.append(" ".join(cur))
            con_lai -= dai + 1
            cur = []
    if cur:
        phan.append(" ".join(cur))
    return phan


# ---------- Tạo giọng (có nhấn nhá, biến thiên cao độ & nhịp điệu theo từng câu/cảnh) ----------
async def _tts(text, tep, giong, toc_do, cao_do, am_luong="+0%"):
    import edge_tts
    k_cache = hashlib.sha256(("edge_v2_%s_%s_%s_%s_%s" % (giong, toc_do, cao_do, am_luong, text)).encode("utf8")).hexdigest()
    f_cache = os.path.join(CACHE_TTS_DIR, "edge_v2_%s.mp3" % k_cache)
    f_tu_cache = f_cache + ".tu.json"
    if os.path.isfile(f_cache) and os.path.getsize(f_cache) > 800 and os.path.isfile(f_tu_cache):
        shutil.copyfile(f_cache, tep)
        shutil.copyfile(f_tu_cache, tep + ".tu.json")
        return
    loi = None
    for lan in range(4):
        try:
            # v86: đọc kèm mốc TỪNG TỪ thật (WordBoundary: offset/duration đơn vị 100 ns) để đồng bộ cứng hình - tiếng
            try:
                c = edge_tts.Communicate(text, giong, rate=toc_do, pitch=cao_do, volume=am_luong, boundary="WordBoundary")
            except TypeError:   # edge-tts cũ (< 7) không có tham số boundary: mặc định đã trả WordBoundary
                c = edge_tts.Communicate(text, giong, rate=toc_do, pitch=cao_do, volume=am_luong)
            tu = []
            with open(tep, "wb") as f_am:
                async for ch in c.stream():
                    if ch.get("type") == "audio":
                        f_am.write(ch["data"])
                    elif ch.get("type") == "WordBoundary":
                        tu.append([str(ch.get("text") or ""), round(ch["offset"] / 1e7, 4), round((ch["offset"] + ch["duration"]) / 1e7, 4)])
            if os.path.exists(tep) and os.path.getsize(tep) > 800:
                with open(tep + ".tu.json", "w", encoding="utf8") as f_tu:
                    json.dump(tu, f_tu, ensure_ascii=False)
                try:
                    tmp_c = f_cache + ".tmp.%d" % os.getpid()
                    shutil.copyfile(tep, tmp_c)
                    os.replace(tmp_c, f_cache)
                    shutil.copyfile(tep + ".tu.json", tmp_c)
                    os.replace(tmp_c, f_tu_cache)
                except Exception:
                    pass
                return
            loi = "tệp âm thanh rỗng"
        except Exception as e:  # mạng chập chờn, dịch vụ bận...
            loi = str(e)
        await asyncio.sleep(2 * (lan + 1))
    raise RuntimeError("edge-tts thất bại: %s | đoạn: %s" % (loi, text[:60]))


def them_nhan_nha_doc(text, loai=""):
    """Bổ sung dấu ngắt nhịp nhấn nhá (...) và dấu câu biểu cảm (!, ?) ngay trong văn bản gửi cho TTS
    để máy đọc tự động nhấn mạnh trọng âm vào từ khóa, con số quan trọng và lên/xuống ngữ điệu tự nhiên
    TRONG CÙNG MỘT CHẤT GIỌNG ĐỒNG NHẤT (không cần dịch tần số mẫu hay đổi cao độ nền giữa các cảnh)."""
    s = str(text or "").strip()
    if not s:
        return s
    loai = str(loai or "").lower()
    # 1) Ngắt nhịp nhấn mạnh sau các cụm cảnh báo / chuyển ý / gọi sự chú ý
    s = re.sub(r"(?i)\b(nhưng\s+khoan|cẩn\s+thận|đừng\s+vội|chú\s+ý\s+nhé|để\s+ý\s+kỹ\s+nhé|nhưng\s+cẩn\s+thận|khoan\s+đã|bí\s+quyết\s+ở\s+đây\s+là|mấu\s+chốt\s+nằm\s+ở|mấu\s+chốt\s+là|điều\s+kỳ\s+diệu\s+là)\s*[,:]?", r"\1, ", s)
    # 2) Ngắt nhịp lấy đà trước khi đọc đáp số / kết luận quan trọng để TTS tự động nhấn trọng âm vào kết quả
    s = re.sub(r"(?i)\b(đáp\s+án\s+cuối\s+cùng\s+là|đáp\s+án\s+đúng\s+là|đáp\s+án\s+chính\s+là|vậy\s+đáp\s+số\s+là|vậy\s+xác\s+suất\s+cần\s+tìm\s+là|kết\s+quả\s+chính\s+là|giá\s+trị\s+lớn\s+nhất\s+là|giá\s+trị\s+nhỏ\s+nhất\s+là|suy\s+ra\s+ngay)\s+", r"\1, ", s)
    # 3) Nhấn nhẹ trước các từ khóa toán học quan trọng ("bằng đúng", "chỉ còn", "tổng cộng")
    # (bỏ dấu "..." chen giữa câu: giọng TTS ngắt cụt, nghe như đọc máy)
    # 4) Đảm bảo câu hỏi có dấu '?' để TTS tự động vút ngữ điệu ở cuối câu hỏi
    if re.search(r"(?i)\b(bao\s+nhiêu|như\s+thế\s+nào|vì\s+sao|tại\s+sao|đúng\s+không|phải\s+không|không\s+nhỉ|chưa\s+nhỉ|ở\s+đâu\s+nhỉ)\b", s) and not s.endswith("?"):
        s = s.rstrip(".!…") + "?"
    # 5) Cảnh mở đầu, điểm chốt, đáp án: kết câu bằng '!' để giọng đọc nhấn sáng, hào hứng tự nhiên
    elif re.search(r"mo_dau|hook|diem_chot|y_tuong|dap_an|ket_qua", loai) and not s.endswith(("?", "!")):
        s = s.rstrip(".…") + "!"
    return re.sub(r"\s+", " ", s).strip()


def thong_so_cao_do_cau(cau_text, loai_canh="", idx_cau=0, toc_do_goc="+6%", cao_do_goc="+0Hz"):
    """Giữ ĐỒNG NHẤT 100% cao độ nền (pitch) và tốc độ nền (rate) giữa tất cả các câu/cảnh trong toàn bộ video
    để âm sắc người đọc không bao giờ bị biến đổi giữa các cảnh. Sự nhấn nhá được tạo ra tự nhiên nhờ cấu trúc ngắt nhịp
    trong them_nhan_nha_doc() và dải động âm thanh tự nhiên."""
    return str(toc_do_goc or "+6%"), str(cao_do_goc or "+0Hz"), "+0%"


def _gia_lap(text, tep):
    tu = max(1, len(text.split()))
    giay = max(0.8, tu / TOC_DO_GIA_LAP)
    chay(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i",
          "sine=frequency=220:duration=%.2f" % giay, "-af", "volume=0.15",
          "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", tep])
    ds = text.split()
    buoc = giay / max(1, len(ds))
    with open(tep + ".tu.json", "w", encoding="utf8") as f_tu:
        json.dump([[w, round(k * buoc, 3), round((k + 0.85) * buoc, 3)] for k, w in enumerate(ds)], f_tu, ensure_ascii=False)


def _gtts(text, tep, toc):
    """Giọng dự phòng: Google Translate TTS (miễn phí). Đọc chậm hơn nên tăng tốc bằng ffmpeg cho khớp nhịp."""
    from gtts import gTTS
    tho = tep + ".g.mp3"
    gTTS(text, lang="vi").save(tho)
    chay(["ffmpeg", "-y", "-loglevel", "error", "-i", tho, "-af", "atempo=%.2f" % toc, "-c:a", "libmp3lame", "-b:a", "96k", tep])
    os.remove(tho)


THONG_KE_GIONG = {"edge": 0, "gtts": 0, "gemini": 0}

PHONG_CACH_GIONG_MAC_DINH = (
    "Đọc bằng tiếng Việt chuẩn, giọng của một người anh/chị dạy toán đang kể chuyện cho em nghe: tự nhiên, ấm, gần gũi, "
    "như nói chuyện thật chứ không như đọc văn bản hay quảng cáo. Tốc độ nói vừa phải, đều tay; câu dài thì ngắt hơi ở dấu phẩy. "
    "Nhấn nhẹ và rõ vào con số, kết quả và từ khóa, nhưng KHÔNG gào, KHÔNG kéo dài giọng, KHÔNG lên giọng quá đà. "
    "Câu hỏi thì cuối câu hơi lên giọng; lúc cảnh báo sai lầm thì chậm lại một chút; lúc ra đáp án thì vui và chắc chắn. "
    "Đọc ký hiệu toán theo cách giáo viên Việt Nam nói (ví dụ: 'pi', 'r bình phương', 'phần'). "
    "Chỉ đọc đúng lời văn bản dưới đây, không thêm bớt từ."
)

# Sắc thái & chỉ đạo cao độ/nhấn nhá riêng theo từng loại cảnh
SAC_THAI_THEO_LOAI = [
    (r"mo_dau|hook|cau_hoi", "tò mò, gợi chuyện như đang hỏi một người bạn; cuối câu hỏi hơi lên giọng"),
    (r"de_bai", "kể chuyện rõ ràng, ngắt nghỉ gọn giữa các dữ kiện, đọc rõ từng con số"),
    (r"nhac_lai|kien_thuc", "ân cần, giải thích từ tốn"),
    (r"mo_hinh", "tập trung, như đang chỉ vào từng chi tiết trên hình"),
    (r"y_do|thu_nho", "gợi mở, dẫn dắt nhẹ nhàng"),
    (r"bay", "chậm lại một chút, giọng cảnh báo nhẹ nhàng, nhấn vào chỗ hay sai"),
    (r"diem_chot|y_tuong", "vui vẻ như vừa nhận ra mấu chốt, không cường điệu"),
    (r"tinh|giai", "đều tay, rành mạch, nhấn nhẹ kết quả trung gian"),
    (r"kiem_tra", "chắc chắn, bình tĩnh"),
    (r"dap_an|ket_qua", "vui và chắc chắn, dừng một nhịp ngắn trước đáp số rồi đọc rõ đáp số"),
    (r"bai_hoc|ket_luan|chot", "ấm áp, chậm rãi như lời nhắn cuối bài"),
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
_GEM_LOCK = threading.Lock()
# NGÂN SÁCH THỜI GIAN cho giọng Gemini (cả video): Gemini chậm / treo thì không được ăn hết 30 phút của máy dựng.
# Quá hạn -> báo lỗi -> cả video dùng giọng dự phòng (edge-tts), video vẫn ra đúng hạn.
GIAY_TOI_DA_GEMINI = float(os.environ.get("GIAY_TOI_DA_GEMINI") or 180)
_BAT_DAU_GEMINI = []
TEP_KEY_HONG_JSON = os.path.join(tempfile.gettempdir(), "gemini_key_hong.json")


def ds_key_gemini():
    ds = []
    for nguon in (os.environ.get("GEMINI_KEYS", ""), os.environ.get("GEMINI_API_KEY", "")):
        for k in re.split(r"[\s,;]+", nguon):
            if k and k not in ds:
                ds.append(k)
    return ds


def ghi_key_hong(k, code, noi):
    with _GEM_LOCK:
        if k in KEY_HONG:
            return
        KEY_HONG.add(k)
        ds_goc = [x for x in re.split(r"[\s,;]+", os.environ.get("GEMINI_KEYS", "")) if x]
        so = ds_goc.index(k) + 1 if k in ds_goc else 0
        m = re.search(r'"message":\s*"([^"]{0,160})', noi)
        ly = "HTTP %d: %s" % (code, re.sub(r"\s+", " ", m.group(1) if m else noi)[:160])
        try:
            if os.path.exists(TEP_KEY_HONG_JSON):
                with open(TEP_KEY_HONG_JSON, encoding="utf8") as f:
                    ds = json.load(f)
            else:
                ds = []
            ma = k[:6] + "_" + k[-4:]
            if not any(x.get("dau") == ma for x in ds):
                ds.append({"so": so, "dau": ma, "ly_do": ly})
            with open(TEP_KEY_HONG_JSON, "w", encoding="utf8") as f:
                json.dump(ds, f)
        except Exception:
            pass
    print("KEY_HONG: key thứ %s (%s) lỗi thật: %s -> bỏ qua, sẽ báo Zalo" % (so or "?", k[:6] + "_" + k[-4:], ly))


def gemini_tts(text, tep_wav, giong, model, phong_cach, dung_cache=True):
    """Giọng Gemini TTS (Google): một lần gọi cho cả lời thoại của cảnh. Trả về tệp WAV 24 kHz.
    Dùng mọi key trong GEMINI_KEYS / GEMINI_API_KEY (GitHub Secret), tự động đổi model TTS dự phòng và xoay vòng key khi gặp lỗi."""
    import base64
    import urllib.error
    import urllib.request
    import time
    k_cache = hashlib.sha256(("gemini_v3_%s_%s_%s_%s" % (giong, model, phong_cach, text)).encode("utf8")).hexdigest()
    f_cache = os.path.join(CACHE_TTS_DIR, "gem_v3_%s.wav" % k_cache)
    if dung_cache and os.path.isfile(f_cache) and os.path.getsize(f_cache) > 2000:
        shutil.copyfile(f_cache, tep_wav)
        print("Gemini TTS: lấy từ cache (%s) cho %d ký tự" % (k_cache[:8], len(text)))
        return
    keys = ds_key_gemini()
    if not keys:
        raise RuntimeError("chưa có GEMINI_API_KEY")
    than = {
        "contents": [{"parts": [{"text": phong_cach + "\n" + text}]}],
        "generationConfig": {"responseModalities": ["AUDIO"],
                             "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": giong}}}},
    }
    ds_model = [str(model).split(",")[0].strip()]
    loi = None
    with _GEM_LOCK:
        if not _BAT_DAU_GEMINI:
            _BAT_DAU_GEMINI.append(time.time())
        t0 = _BAT_DAU_GEMINI[0]

    def con_lai():
        return GIAY_TOI_DA_GEMINI - (time.time() - t0)

    rot = int(hashlib.md5(text.encode("utf8")).hexdigest()[:4], 16)
    for md in ds_model:
        url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % md
        chuyen_model = False
        for vong in range(3):
            with _GEM_LOCK:
                dung = [k for k in keys if k not in KEY_HONG and (md + "|" + k) not in KEY_HET_NGAY and k not in KEY_HET_NGAY]
            if not dung:
                break
            if len(dung) > 1:
                r_idx = (rot + vong) % len(dung)
                dung = dung[r_idx:] + dung[:r_idx]
            cho_min = 0
            for key in dung:
                req = urllib.request.Request(url, data=json.dumps(than).encode("utf8"), method="POST",
                                             headers={"Content-Type": "application/json", "x-goog-api-key": key})
                if con_lai() < 12:
                    raise RuntimeError("Gemini TTS quá %d giây (chậm/treo) -> dùng giọng dự phòng" % GIAY_TOI_DA_GEMINI)
                try:
                    with urllib.request.urlopen(req, timeout=max(12, min(45, con_lai()))) as r:
                        d = json.loads(r.read().decode("utf8"))
                    phan = d["candidates"][0]["content"]["parts"]
                    b64 = next(p["inlineData"]["data"] for p in phan if "inlineData" in p)
                    pcm = tep_wav + ".%d.pcm" % threading.get_ident()
                    with open(pcm, "wb") as f:
                        f.write(base64.b64decode(b64))
                    chay(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcm, tep_wav])
                    if os.path.exists(pcm):
                        os.remove(pcm)
                    try:
                        if not giong_bi_re(tep_wav, "cache_check"):
                            tmp_c = f_cache + ".tmp.%d" % threading.get_ident()
                            shutil.copyfile(tep_wav, tmp_c)
                            os.replace(tmp_c, f_cache)
                    except Exception:
                        pass
                    return
                except urllib.error.HTTPError as e:
                    noi = e.read().decode("utf8", "ignore")[:4000]
                    loi = "HTTP %d (%s) %s" % (e.code, md, noi[:300])
                    if e.code == 404:
                        print("Gemini TTS: model %s không khả dụng (HTTP 404) -> tự động đổi model TTS khác" % md)
                        chuyen_model = True
                        break
                    if e.code == 429 and re.search(r"PerDay|per day|daily", noi, re.I):
                        with _GEM_LOCK:
                            KEY_HET_NGAY.add(md + "|" + key)   # hết hạn mức NGÀY cho model này: sang key kế
                        print("Gemini TTS: key %s… hết hạn mức ngày cho %s, chuyển key/model khác" % (key[:6], md))
                        continue
                    if e.code == 401 or (e.code in (400, 403) and re.search(r"API_KEY_INVALID|API key not valid|API key expired|API_KEY_EXPIRED", noi, re.I)):
                        ghi_key_hong(key, e.code, noi)
                        continue
                    if e.code == 403:
                        continue   # quyền của key trên model này; thử key kế
                    if e.code in (429, 500, 503):
                        m = re.search(r'"retryDelay":\s*"(\d+)', noi)
                        cho = min(45, int(m.group(1)) + 2) if m else 8 * (vong + 1)
                        cho_min = min(cho_min, cho) if cho_min else cho
                        continue
                    print("Gemini TTS: model %s trả lỗi HTTP %d -> thử đổi model TTS kế tiếp" % (md, e.code))
                    chuyen_model = True
                    break
                except Exception as e:
                    loi = str(e)
            if chuyen_model or not cho_min:
                break
            if con_lai() < cho_min + 15:
                break
            print("Gemini TTS (%s): mọi key đang bận/giới hạn theo phút, chờ %d giây rồi thử lại" % (md, cho_min))
            time.sleep(cho_min)
    raise RuntimeError("Gemini TTS lỗi trên mọi model (%s): %s" % (", ".join(ds_model), loi))


def tao_giong_gemini(canh, thu_muc, args):
    """Dự phòng khi cần đọc từng cảnh bằng Gemini: GIỮ ĐỒNG NHẤT 100% MỘT CHỈ ĐẠO PHONG CÁCH VÀ MỘT TẦN SỐ MẪU
    xuyên suốt mọi cảnh để không bao giờ bị lệch màu giọng giữa các cảnh; sự nhấn nhá nằm ở dấu ngắt nhịp them_nhan_nha_doc()."""
    kq = {}
    phong_cach_chung = (
        args.phong_cach_giong +
        " Giữ cố định đúng một màu giọng, một tốc độ và một âm sắc người đọc xuyên suốt; "
        "nhấn nhẹ vào con số và từ khóa, ngữ điệu tự nhiên như nói chuyện theo dấu '?', '!'.\nĐoạn cần đọc:"
    )
    tempo = float(args.toc_do_gemini or 1.0)
    loc = ("atempo=%.3f," % tempo if abs(tempo - 1) > 0.01 else "") + "aresample=44100,aformat=channel_layouts=mono"
    nhiem_vu = []
    for i, c in enumerate(canh):
        loai_c = str(c.get("loai") or "").lower()
        van_goc = chuan_hoa_doc(str(c.get("loi_thoai") or "").strip())
        if van_goc:
            nhiem_vu.append((i, them_nhan_nha_doc(van_goc, loai_c)))

    def doc_mot_canh(item):
        i, van = item
        wav = os.path.join(thu_muc, "gem_%d.wav" % i)
        gemini_tts(van, wav, args.giong_gemini, args.tts_model, phong_cach_chung)
        tu = max(1, len(van.split()))
        if tu >= 8 and tu / max(0.1, do_thoi_luong(wav) - 0.4) > 4.6:
            print("Gemini đọc thiếu chữ ở cảnh %d, đọc lại" % (i + 1))
            gemini_tts(van, wav, args.giong_gemini, args.tts_model, phong_cach_chung, dung_cache=False)
        if giong_bi_re(wav, "cảnh %d" % (i + 1)):
            gemini_tts(van, wav, args.giong_gemini, args.tts_model, phong_cach_chung, dung_cache=False)
            if giong_bi_re(wav, "cảnh %d (đọc lại)" % (i + 1)):
                raise RuntimeError("giọng Gemini cảnh %d vẫn rè sau khi đọc lại" % (i + 1))
        nhanh = os.path.join(thu_muc, "gem_%d.out.wav" % i)
        chay(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", loc, "-c:a", "pcm_s16le", nhanh])
        return i, nhanh

    try:
        with ThreadPoolExecutor(max_workers=min(4, max(1, len(nhiem_vu)))) as ex:
            for i, nhanh in ex.map(doc_mot_canh, nhiem_vu):
                kq[i] = nhanh
                with _GEM_LOCK:
                    THONG_KE_GIONG["gemini"] += 1
    except Exception as e:
        print("Cảnh báo: %s -> cả video chuyển sang edge-tts đồng nhất" % str(e)[:200])
        with _GEM_LOCK:
            THONG_KE_GIONG["gemini"] = 0
        return None
    return kq


def tim_khoang_lang(wav, nguong_db=-38, toi_thieu=0.4):
    """Các khoảng lặng trong tệp âm thanh: [(bắt đầu, kết thúc)] (giây), dùng bộ lọc silencedetect của ffmpeg."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", "silencedetect=noise=%ddB:d=%.2f" % (nguong_db, toi_thieu), "-f", "null", "-"],
                       capture_output=True, text=True)
    ds, bd = [], None
    for dong in r.stderr.splitlines():
        m = re.search(r"silence_start: ([\d.]+)", dong)
        if m:
            bd = float(m.group(1))
        m = re.search(r"silence_end: ([\d.]+)", dong)
        if m and bd is not None:
            ds.append((bd, float(m.group(1))))
            bd = None
    return ds


def _doc_khuc_gemini_mot_lan(ds_canh, chi_so_bat_dau, thu_muc, args):
    """Đọc liền mạch một nhóm cảnh (hoặc toàn bộ video) trong MỘT lần gọi Gemini TTS duy nhất:
    đảm bảo giọng đọc ĐỒNG NHẤT 100% về âm sắc/người đọc, đồng thời có NHẤN NHÁ tự nhiên nhờ them_nhan_nha_doc()."""
    van = [them_nhan_nha_doc(chuan_hoa_doc(str(c.get("loi_thoai") or "").strip()), str(c.get("loai") or "")) for c in ds_canh]
    if not all(van):
        return None
    toan_bai = "\n\n".join(van)
    phong_cach = (
        args.phong_cach_giong +
        " Đây là toàn bộ lời giảng liền mạch của một người thầy duy nhất. "
        "BẮT BUỘC giữ đồng nhất 100% một chất giọng, một âm sắc xuyên suốt từ đầu đến cuối; "
        "nhấn nhẹ vào con số, từ khóa; lên xuống ngữ điệu tự nhiên như đang kể chuyện, không cường điệu. "
        "Giữa hai đoạn (cách nhau một dòng trống) hãy ngắt nghỉ rõ khoảng 1,2 giây.\nLời giảng:"
    )
    ky_tu = [max(1, len(v)) for v in van]
    tong_ky_tu = sum(ky_tu)
    for lan in range(2):
        wav = os.path.join(thu_muc, "ca_bai_%d_%d.wav" % (chi_so_bat_dau, lan))
        try:
            gemini_tts(toan_bai, wav, args.giong_gemini, args.tts_model, phong_cach, dung_cache=(lan == 0))
        except Exception as e:
            print("Cảnh báo: Gemini đọc liền mạch lỗi: %s" % str(e)[:200])
            return None
        D = do_thoi_luong(wav)
        if D < tong_ky_tu / 30.0:
            print("Gemini đọc liền mạch quá ngắn (%.1f giây cho %d ký tự), đọc lại" % (D, tong_ky_tu))
            continue
        if D > tong_ky_tu / 7.0:
            print("Gemini đọc liền mạch dài bất thường (%.1f giây cho %d ký tự), đọc lại" % (D, tong_ky_tu))
            continue
        if giong_bi_re(wav, "cả bài (lần %d)" % (lan + 1)):
            continue
        # Dò khoảng ngừng MỘT lần (d=0.14) rồi lọc các ngưỡng 0.38s -> 0.26s -> 0.18s trong Python
        tat_ca_lang = tim_khoang_lang(wav, nguong_db=-38, toi_thieu=0.14)
        cat, ok = [], False
        for d_min in (0.38, 0.26, 0.18):
            lang = [(b, e) for b, e in tat_ca_lang if (e - b) >= d_min - 1e-6]
            cat_thu, truoc, ok_thu, tich = [], 0.0, True, 0
            for k in range(len(van) - 1):
                tich += ky_tu[k]
                du_kien = D * tich / tong_ky_tu
                cua_so = max(2.8, 0.42 * D * ky_tu[k] / tong_ky_tu)
                ung = [(b, e) for b, e in lang if (b + e) / 2 > truoc + 0.5 and abs((b + e) / 2 - du_kien) <= cua_so]
                if not ung:
                    ok_thu = False
                    break
                b, e = max(ung, key=lambda x: (x[1] - x[0]) - 0.12 * abs((x[0] + x[1]) / 2 - du_kien))
                cat_thu.append((b, e))
                truoc = (b + e) / 2
            if ok_thu:
                cat, ok = cat_thu, True
                break
        if not ok:
            print("Không tìm đủ khoảng ngừng giữa các cảnh (lần %d), đọc lại" % (lan + 1))
            continue
        moc = [0.0] + [(b + e) / 2 for b, e in cat] + [D]
        lech = [(moc[k + 1] - moc[k]) / (D * ky_tu[k] / tong_ky_tu) for k in range(len(van))]
        if min(lech) < 0.42 or max(lech) > 2.3:
            print("Cắt cảnh không khớp độ dài chữ (tỉ lệ %.2f-%.2f), đọc lại" % (min(lech), max(lech)))
            continue
        kq = {}
        tempo = float(args.toc_do_gemini or 1.0)
        loc = ("atempo=%.3f," % tempo if abs(tempo - 1) > 0.01 else "") + "aresample=44100,aformat=channel_layouts=mono"
        thieu_chu = []

        def cat_mot_canh(k):
            idx_thuc = chi_so_bat_dau + k
            ra = os.path.join(thu_muc, "gem_%d.wav" % idx_thuc)
            gon = os.path.join(thu_muc, "gem_%d.gon.wav" % idx_thuc)
            chay(["ffmpeg", "-y", "-loglevel", "error", "-ss", "%.3f" % moc[k], "-to", "%.3f" % moc[k + 1], "-i", wav, "-af", loc,
                  "-c:a", "pcm_s16le", ra])
            try:
                cat_lang(ra, gon)
                giay = do_thoi_luong(gon)
                tu = max(1, len(van[k].split()))
                loi_tu = ("cảnh %d: %d từ trong %.1f giây" % (idx_thuc + 1, tu, giay)) if (tu >= 8 and tu / max(0.1, giay) > 4.6) else None
                return idx_thuc, gon, loi_tu
            except Exception:
                return idx_thuc, ra, None

        with ThreadPoolExecutor(max_workers=min(4, max(1, len(van)))) as ex:
            for idx_thuc, tep_kq, loi_tu in ex.map(cat_mot_canh, range(len(van))):
                kq[idx_thuc] = tep_kq
                if loi_tu:
                    thieu_chu.append(loi_tu)
        if thieu_chu:
            print("Gemini đọc THIẾU CHỮ (nhanh bất thường) %s -> đọc lại" % "; ".join(thieu_chu))
            continue
        print("Gemini đọc liền mạch %d cảnh (từ cảnh %d, %.1f giây)" % (len(van), chi_so_bat_dau + 1, D))
        return kq
    return None


def tao_giong_gemini_mot_lan(canh, thu_muc, args):
    """GIỌNG THỐNG NHẤT CẢ VIDEO & CÓ NHẤN NHÁ:
    - Với video ngắn (<= 18 cảnh): đọc TOÀN BỘ lời thoại trong 1 lần gọi duy nhất (1 người đọc xuyên suốt 100%, không lệch giọng giữa các cảnh).
    - Với video dài 10 phút (> 18 cảnh): chia thành các chặng lớn 12 cảnh đọc liền mạch cùng một cấu hình giọng."""
    if len(canh) <= 18:
        kq = _doc_khuc_gemini_mot_lan(canh, 0, thu_muc, args)
        if kq:
            with _GEM_LOCK:
                THONG_KE_GIONG["gemini"] += len(kq)
        return kq
    kq_tong = {}
    buoc = 12
    doan = [(canh[bd:bd + buoc], bd) for bd in range(0, len(canh), buoc)]
    with ThreadPoolExecutor(max_workers=min(2, len(doan))) as ex:
        for kq_khuc in ex.map(lambda p: _doc_khuc_gemini_mot_lan(p[0], p[1], thu_muc, args), doan):
            if not kq_khuc:
                return None
            kq_tong.update(kq_khuc)
    with _GEM_LOCK:
        THONG_KE_GIONG["gemini"] += len(kq_tong)
    return kq_tong


async def tao_cac_doan(cac_doan, thu_muc, args, loai_canh="", sem=None):
    sem = sem or asyncio.Semaphore(SO_EDGE_SONG_SONG)

    async def mot(i, d):
        tep = os.path.join(thu_muc, "d%03d.mp3" % i)
        if args.gia_lap:
            await asyncio.get_running_loop().run_in_executor(None, _gia_lap, d, tep)
            return tep
        van = them_nhan_nha_doc(chuan_hoa_doc(d), loai_canh)
        toc_do_cau, cao_do_cau, am_luong_cau = thong_so_cao_do_cau(van, loai_canh, i, args.toc_do, args.cao_do)
        bien_the = [van, van.rstrip(" .,!?") + ".", "À, " + van[0].lower() + van[1:] if van else van]
        async with sem:
            for k, v in enumerate(bien_the):
                try:
                    await _tts(v, tep, args.giong, toc_do_cau, cao_do_cau, am_luong_cau)
                    with _GEM_LOCK:
                        THONG_KE_GIONG["edge"] += 1
                    if k:
                        print("edge-tts đọc được sau khi chỉnh chữ (cách %d): %s" % (k, v[:60]))
                    return tep
                except Exception as e:
                    print("Cảnh báo: edge-tts lỗi (%s)%s" % (str(e)[:120], ", thử chỉnh chữ" if k < len(bien_the) - 1 else ", chờ rồi thử lại"))
        loi = None
        for lan in range(3):
            await asyncio.sleep(15 * (lan + 1))
            for v in bien_the:
                try:
                    async with sem:
                        await _tts(v, tep, args.giong, toc_do_cau, cao_do_cau, am_luong_cau)
                    with _GEM_LOCK:
                        THONG_KE_GIONG["edge"] += 1
                    print("edge-tts đọc được sau khi chờ thử lại (vòng %d)" % (lan + 1))
                    return tep
                except Exception as e:
                    loi = e
        raise RuntimeError("edge-tts không đọc được đoạn này sau nhiều lần thử (không dùng giọng khác để tránh lẫn giọng): %s | đoạn: %s" % (loi, d[:60]))

    cac_tep = await asyncio.gather(*[mot(i, d) for i, d in enumerate(cac_doan)])
    return list(cac_tep)


async def tao_tat_ca_doan_edge(nhiem_vu, args):
    """Tạo giọng edge-tts (hoặc giả lập) SONG SONG cho mọi cảnh trong cùng 1 event loop."""
    sem = asyncio.Semaphore(SO_EDGE_SONG_SONG)

    async def chay_canh(muc):
        i, cac_doan, thu_muc, loai_canh = muc
        return i, await tao_cac_doan(cac_doan, thu_muc, args, loai_canh, sem=sem)

    kq = await asyncio.gather(*[chay_canh(m) for m in nhiem_vu])
    return dict(kq)


def cat_lang(tep_vao, tep_ra):
    """Cắt khoảng lặng đầu và cuối của một câu (giọng đọc thường chừa ~0.2-0.4 giây mỗi đầu), giữ lại 0.03 giây."""
    loc = ("aresample=44100,aformat=channel_layouts=mono,"
           "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.03,areverse,"
           "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.03,areverse")
    codec = ["-c:a", "pcm_s16le"] if str(tep_ra).lower().endswith(".wav") else ["-c:a", "libmp3lame", "-b:a", "96k"]
    chay(["ffmpeg", "-y", "-loglevel", "error", "-i", tep_vao, "-af", loc] + codec + [tep_ra])


def doc_tu_edge(tep):
    """Mốc từng từ edge-tts đã lưu cạnh tệp âm thanh: [[chữ đọc, bắt đầu, kết thúc], ...] (giây) hoặc None."""
    try:
        with open(tep + ".tu.json", encoding="utf8") as f:
            tu = json.load(f)
        tu = [x for x in tu if isinstance(x, list) and len(x) == 3 and x[2] >= x[1] >= 0]
        return tu or None
    except Exception:
        return None


def cat_theo_tu(tep_vao, tep_ra, tu):
    """Cắt đầu/cuối đoạn theo đúng mốc từ đầu/cuối (thay silenceremove: biết chính xác đã cắt bao nhiêu giây),
    trả lại mốc từ đã dời về gốc tệp mới."""
    bd = max(0.0, tu[0][1] - 0.04)
    kt = tu[-1][2] + 0.15
    chay(["ffmpeg", "-y", "-loglevel", "error", "-i", tep_vao, "-ss", "%.3f" % bd, "-to", "%.3f" % kt,
          "-af", "aresample=44100,aformat=channel_layouts=mono", "-c:a", "pcm_s16le", tep_ra])
    return [[w, round(a - bd, 4), round(b - bd, 4)] for w, a, b in tu]


def _tok(s):
    return re.findall(r"\w+", str(s).casefold())


def can_tu_tho(doan_tho, tu_noi):
    """Gán mốc THẬT cho từng từ GỐC của câu lời thoại (doan_tho.split(" ")) từ mốc các từ ĐÃ ĐỌC (tu_noi, chữ sau chuẩn hóa:
    "SA" -> "ét a", số -> chữ...). So khớp chuỗi bằng difflib; từ không khớp nội suy theo độ dài giữa hai từ khớp kề nhau."""
    goc = doan_tho.split(" ")
    ky_vong, nguon = [], []
    for i, w in enumerate(goc):
        try:
            doc = _tok(chuan_hoa_doc(w)) or _tok(w)
        except Exception:
            doc = _tok(w)
        for t in doc:
            ky_vong.append(t)
            nguon.append(i)
    thuc, thoi = [], []
    for w, a, b in tu_noi:
        ds = _tok(w) or ["_"]
        for k, t in enumerate(ds):
            thuc.append(t)
            thoi.append((a + (b - a) * k / len(ds), a + (b - a) * (k + 1) / len(ds)))
    gan = [[] for _ in goc]
    for a, b, n in difflib.SequenceMatcher(None, ky_vong, thuc, autojunk=False).get_matching_blocks():
        for k in range(n):
            gan[nguon[a + k]].append(thoi[b + k])
    dau, cuoi = tu_noi[0][1], tu_noi[-1][2]
    moc = [(min(x[0] for x in g), max(x[1] for x in g)) if g else None for g in gan]
    i = 0
    while i < len(goc):
        if moc[i] is not None:
            i += 1
            continue
        j = i
        while j < len(goc) and moc[j] is None:
            j += 1
        t0 = moc[i - 1][1] if i > 0 else dau
        t1 = moc[j][0] if j < len(goc) else cuoi
        t1 = max(t0, t1)
        tong = float(sum(max(1, len(goc[k])) for k in range(i, j)))
        t = t0
        for k in range(i, j):
            dt = (t1 - t0) * max(1, len(goc[k])) / tong
            moc[k] = (t, t + dt)
            t += dt
        i = j
    return [[w, round(a, 3), round(b, 3)] for w, (a, b) in zip(goc, moc)]


def tim_cum_tu(cum, tu, tu_vi_tri=0):
    """Tìm cụm chữ (nguyên văn lời thoại) trong danh sách từ có mốc của cảnh; trả (chỉ số từ đầu cụm, chỉ số sau cụm) hoặc None.
    Tìm tiếp từ tu_vi_tri trước (giữ thứ tự đọc), không thấy mới tìm lại từ đầu."""
    can = _tok(cum)
    if not can:
        return None
    phang = []
    for k, x in enumerate(tu):
        for t in _tok(x["w"]):
            phang.append((t, k))
    for bat in (tu_vi_tri, 0):
        for i in range(len(phang) - len(can) + 1):
            if phang[i][1] < bat:
                continue
            if [q[0] for q in phang[i:i + len(can)]] == can:
                return phang[i][1], phang[i + len(can) - 1][1] + 1
    return None


def moc_buoc_ve(buoc_ve, tu):
    """Mốc vẽ từng nét theo "buoc_ve" kịch bản: [{"ve","khi_noi","t","khop"}] (t: giây tính từ đầu cảnh, lúc giọng đọc bắt đầu cụm)."""
    kq, vt = [], 0
    for b in buoc_ve if isinstance(buoc_ve, list) else []:
        if not isinstance(b, dict) or not str(b.get("ve") or "").strip():
            continue
        tim = tim_cum_tu(str(b.get("khi_noi") or ""), tu, vt) if tu else None
        if tim:
            vt = tim[1]
        kq.append({"ve": str(b["ve"]).strip(), "khi_noi": str(b.get("khi_noi") or ""), "t": tu[tim[0]]["bat"] if tim else None, "khop": bool(tim)})
    return kq


def tu_tu_cau(cau):
    """Mốc từng từ ước lượng từ các câu phụ đề (khi giọng đọc không có WordBoundary): chia đều thời lượng câu theo số từ."""
    tu = []
    for c in cau:
        ds = str(c.get("text") or "").split()
        if not ds:
            continue
        buoc = (c["ket"] - c["bat"]) / len(ds)
        tu.extend({"w": w, "bat": round(c["bat"] + k * buoc, 3), "ket": round(c["bat"] + (k + 1) * buoc, 3)} for k, w in enumerate(ds))
    return tu


def quay_canh(kb, so, cau, tu):
    """Giai đoạn D (luồng thực tế & xác suất): dac_ta_canh.quay[] của cảnh `so` -> props.canh[i].quay.
    Mỗi hành động mang mốc t (giây từ đầu cảnh) = lúc giọng đọc bắt đầu cụm khi_noi (mốc từ thật nếu có, không thì ước lượng
    theo câu). canh_3d.py ghép mốc này vào kế hoạch Blender / Three.js; Remotion chạy hành động đúng lúc nói."""
    if str(kb.get("luong") or "") == "hinh_hoc_thuan" or str(kb.get("mon") or "").upper() == "HINH_HOC":
        return None   # khóa luồng hình học thuần: không có cảnh thật / góc máy 3D
    spec = kb.get("dac_ta_canh")
    if not isinstance(spec, dict):
        return None
    shot = next((q for q in spec.get("quay") or [] if isinstance(q, dict) and q.get("canh") == so), None)
    if not shot:
        return None
    nguon = tu or tu_tu_cau(cau)
    hd, vt = [], 0
    for i, a in enumerate(shot.get("hanh_dong") or []):
        if not isinstance(a, dict) or not a.get("vat") or not a.get("dong_tu"):
            continue
        cum = str(a.get("khi_noi") or "")
        tim = tim_cum_tu(cum, nguon, vt) if cum and nguon else None
        if tim:
            vt = tim[1]
        hd.append({"i": i, "vat": str(a["vat"]), "dongTu": str(a["dong_tu"]), "so": a.get("so"),
                   "thamSo": a.get("tham_so") or {}, "khiNoi": cum,
                   "t": nguon[tim[0]]["bat"] if tim else None, "khop": bool(tim), "nguonMoc": "tu_that" if tu else "uoc_luong"})
    return {"gocMay": shot.get("goc_may") or "toan_canh", "chuyenMay": shot.get("chuyen_may") or "luot_vao",
            "tieuDiem": [str(x) for x in shot.get("tieu_diem") or []],
            "hienSoLieu": [str(x) for x in shot.get("hien_so_lieu") or []], "hanhDong": hd}


MAU_3DV = {"cyan", "vang", "hong", "ngoc", "trang", "xam"}
# Auto-fix tên màu AI hay viết lệch -> bảng màu ngữ nghĩa của 3D Vector (src/3d-vector/kieu.ts)
MAU_3DV_GAN = {"xanh": "cyan", "xanh_duong": "cyan", "lam": "cyan", "blue": "cyan", "vàng": "vang", "yellow": "vang", "cam": "vang",
               "do": "hong", "đỏ": "hong", "red": "hong", "tim": "hong", "hồng": "hong", "pink": "hong", "xanh_la": "ngoc", "luc": "ngoc",
               "green": "ngoc", "white": "trang", "trắng": "trang", "gray": "xam", "grey": "xam", "xám": "xam"}


# ---------- v92: SUY KHUÔN 3D THAM SỐ TỪ ĐỀ (Auto-fix: không bao giờ để tầng sân khấu trống/đứng im) ----------
TEN_KHUON = ("hai_mat_cau_oxyz", "khung_day_cap", "tam_bia_gap_hop", "tru_non_toi_uu",
             "parabol_quy_dao", "mat_phang_cat_khoi", "chop_lang_tru", "luoi_the_bi_xac_suat")
BIET_DANH_KHUON = {"tam_bia": "tam_bia_gap_hop", "gap_hop": "tam_bia_gap_hop", "hop_khong_nap": "tam_bia_gap_hop",
                   "hinh_tru": "tru_non_toi_uu", "tru_non": "tru_non_toi_uu", "lon": "tru_non_toi_uu", "hinh_non": "tru_non_toi_uu",
                   "the_so": "luoi_the_bi_xac_suat", "bi": "luoi_the_bi_xac_suat", "xac_suat": "luoi_the_bi_xac_suat",
                   "parabol": "parabol_quy_dao", "do_thi": "parabol_quy_dao", "van_toc": "parabol_quy_dao", "mat_cau": "hai_mat_cau_oxyz",
                   "oxyz": "hai_mat_cau_oxyz", "day_cap": "khung_day_cap", "thiet_dien": "mat_phang_cat_khoi", "chop": "chop_lang_tru",
                   "lang_tru": "chop_lang_tru"}
SO_CHU_NHO = {"hai": 2, "ba": 3, "bốn": 4, "năm": 5, "sáu": 6, "bảy": 7, "tám": 8, "chín": 9, "mười": 10}
MAU_BI = {"đỏ": "hong", "xanh": "cyan", "vàng": "vang", "trắng": "trang", "đen": "xam", "tím": "hong", "lục": "ngoc", "hồng": "hong"}


def ten_khuon(v):
    s = re.sub(r"[\s-]+", "_", str(v or "").strip().lower())
    return s if s in TEN_KHUON else BIET_DANH_KHUON.get(s)


def _so(x):
    try:
        return float(str(x).replace(",", "."))
    except (TypeError, ValueError):
        return None


def _so_tu(chu):
    chu = chu.strip().lower()
    return _so(chu) if re.match(r"^\d", chu) else SO_CHU_NHO.get(chu)


def _ham_mot_bien(bt):
    """Biểu thức của t (đã lọc chỉ còn số, t, phép toán) -> hàm Python; dùng để tìm khoảng t cho đồ thị."""
    s = str(bt or "").replace("^", "**").replace(",", ".")
    s = re.sub(r"(\d)\s*\(", r"\1*(", s)
    if not re.fullmatch(r"[-+*/(). 0-9t]+", s):
        return None
    try:
        f = eval("lambda t: " + s, {"__builtins__": {}})   # noqa: S307 - chuỗi đã lọc ký tự an toàn
        f(1.0)
        return f
    except Exception:   # noqa: BLE001
        return None


def suy_khuon(kb):
    """Đề -> {khuon, tham_so} (một trong 8 khuôn src/3d-vector/khuon). None khi không nhận ra dạng bài."""
    de = " ".join(str(kb.get(k) or "") for k in ("de_bai", "chu_de", "tieu_de", "can_tim"))
    t = de.lower()
    mon = str(kb.get("mon") or "").upper()
    lop = str(kb.get("lop") or "")
    so = r"(\d+(?:[.,]\d+)?)"
    if re.search(r"mặt cầu", t) and re.search(r"oxyz|tọa độ", t) and lop == "12":
        tam = re.findall(r"tâm\s*\w*\s*\(\s*(-?\d+(?:[.,]\d+)?)\s*[;,]\s*(-?\d+(?:[.,]\d+)?)\s*[;,]\s*(-?\d+(?:[.,]\d+)?)\s*\)", t)
        bk = re.findall(r"bán kính\s*(?:r\s*\w*\s*=\s*)?" + so, t)
        ts = {}
        if len(tam) >= 2:
            ts.update(tam1=[_so(x) for x in tam[0]], tam2=[_so(x) for x in tam[1]])
        if len(bk) >= 2:
            ts.update(r1=_so(bk[0]), r2=_so(bk[1]))
        return {"khuon": "hai_mat_cau_oxyz", "tham_so": ts}
    if re.search(r"(thẻ|lá bài|viên bi|quả bóng|\bbi\b|quả cầu)", t) and (mon == "XAC_SUAT" or "xác suất" in t):
        bi = bool(re.search(r"viên bi|\bbi\b|quả bóng|quả cầu", t))
        ts = {"vat": "bi" if bi else "the"}
        if bi:
            nhom = [{"so": int(_so_tu(n)), "mau": MAU_BI.get(m, "cyan")}
                    for n, m in re.findall(r"(\d+|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s*(?:viên\s*)?(?:bi|quả\s*(?:bóng|cầu))\s*(?:màu\s*)?(đỏ|xanh|vàng|trắng|đen|tím|lục|hồng)", t)
                    if _so_tu(n)]
            if nhom:
                ts["nhom"] = nhom
            m = re.search(r"(\d+)\s*(?:viên\s*)?bi", t)
            if not nhom and m:
                ts["N"] = int(m.group(1))
        else:
            m = re.search(r"(?:từ|đánh số)\s*1\s*(?:đến|tới|-)\s*(\d+)", t) or re.search(r"(\d+)\s*(?:tấm\s*)?thẻ", t)
            if m:
                ts["N"] = int(m.group(1))
        m = re.search(r"(?:lấy|chọn|rút|bốc)\s*(?:ra\s*)?(?:ngẫu nhiên\s*)?(?:đồng thời\s*|cùng lúc\s*)?(\d+|hai|ba|bốn|năm)\b", t)
        if m and _so_tu(m.group(1)):
            ts["k"] = int(_so_tu(m.group(1)))
        return {"khuon": "luoi_the_bi_xac_suat", "tham_so": ts}
    if re.search(r"(tấm|miếng|tờ)\s*(bìa|tôn|nhôm|giấy|carton|thép|kim loại)|gấp\s*(?:lại\s*)?(?:thành\s*)?(?:một\s*)?(?:cái\s*)?(hộp|thùng)|cắt\s*(?:bỏ\s*)?(?:đi\s*)?(4|bốn)\s*(?:hình vuông|góc)", t):
        ts = {}
        m = re.search(so + r"\s*(?:cm|dm|m)?\s*[x×*]\s*" + so, t)
        if m:
            ts.update(a=_so(m.group(1)), b=_so(m.group(2)))
        else:
            m = re.search(r"(?:hình vuông|vuông)\s*(?:có\s*)?cạnh\s*(?:bằng\s*|là\s*|dài\s*)?" + so, t)
            if m:
                ts.update(a=_so(m.group(1)), b=_so(m.group(1)))
        return {"khuon": "tam_bia_gap_hop", "tham_so": ts}
    if re.search(r"hình trụ|\blon\b|bồn|cốc|thùng phuy|hộp sữa|hình nón|phễu|ống trụ|bình trụ", t):
        ts = {"loai": "non" if re.search(r"hình nón|phễu", t) else "tru"}
        m = re.search(so + r"\s*(cm³|cm3|dm³|dm3|m³|m3|lít|ml)", t)
        if m:
            ts["V"] = _so(m.group(1)) * (1000 if m.group(2) == "lít" else 1)
        m = re.search(r"bán kính(?:\s*đáy)?\s*(?:r\s*)?(?:=|bằng|là)?\s*" + so, t)
        if m:
            ts["r"] = _so(m.group(1))
        m = re.search(r"chiều cao\s*(?:h\s*)?(?:=|bằng|là)?\s*" + so, t)
        if m:
            ts["h"] = _so(m.group(1))
        if re.search(r"phôi|tấm (?:tôn|nhôm) hình vuông|cắt (?:nắp|đáy)", t):
            ts["phoi"] = True
        return {"khuon": "tru_non_toi_uu", "tham_so": ts}
    if re.search(r"vận tốc|quãng đường|chuyển động|phanh|hãm|quỹ đạo|ném|gia tốc|tích phân|parabol|đồ thị", t):
        ts = {"ten_ham": "s" if re.search(r"quãng đường s\s*\(", t) else "h" if "ném" in t else "v"}
        m = re.search(r"\b([vsh])\s*\(\s*t\s*\)\s*=\s*([-+0-9t.,^*/() ]+?)(?=\s*\(|\s*m/s|[;]|,\s|\.\s|\s+[a-zà-ỹ]|$)", t)
        if m:
            ts["ten_ham"] = m.group(1)
            ts["ham"] = re.sub(r"(\d)\s*t", r"\1*t", m.group(2).strip().replace(",", "."))
            f = _ham_mot_bien(ts["ham"])
            if f:
                try:
                    b = next((x / 10 for x in range(1, 1201) if f(x / 10) <= 0 < f(0)), None)
                except Exception:   # noqa: BLE001
                    b = None
                m2 = re.search(r"(?:trong|sau)\s*(\d+(?:[.,]\d+)?)\s*(?:giây|s\b)", t)
                ts["t"] = [0, _so(m2.group(1)) if m2 else (b or 10)]
        return {"khuon": "parabol_quy_dao", "tham_so": ts}
    if re.search(r"dây cáp|sợi dây|lực căng|treo", t):
        ts = {}
        m = re.search(r"(\d+|hai|ba|bốn|năm|sáu)\s*(?:sợi\s*)?(?:dây|cáp)", t)
        if m and _so_tu(m.group(1)):
            ts["so_cap"] = int(_so_tu(m.group(1)))
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:°|độ)", t)
        if m:
            ts["goc"] = _so(m.group(1))
        return {"khuon": "khung_day_cap", "tham_so": ts}
    if re.search(r"mặt phẳng cắt|thiết diện|cắt khối|mặt cắt", t):
        return {"khuon": "mat_phang_cat_khoi", "tham_so": {"khoi": "tru" if "trụ" in t else "hop"}}
    if re.search(r"hình chóp|lăng trụ|tứ diện|kim tự tháp", t):
        ts = {"loai": "lang_tru_tam_giac" if "lăng trụ" in t else "chop_tam_giac" if re.search(r"tứ diện|chóp tam giác", t) else "chop_tu_giac"}
        m = re.search(r"cạnh(?:\s*đáy)?\s*(?:bằng|là|=)?\s*" + so, t)
        if m:
            ts["a"] = _so(m.group(1))
        m = re.search(r"chiều cao\s*(?:bằng|là|=)?\s*" + so, t)
        if m:
            ts["h"] = _so(m.group(1))
        return {"khuon": "chop_lang_tru", "tham_so": ts}
    if mon == "XAC_SUAT":
        return {"khuon": "luoi_the_bi_xac_suat", "tham_so": {}}
    return None


def _hop_le_3dv(c3):
    """Số đối tượng dựng được của đặc tả tự do (khớp dac_ta.ts, kể cả tên trường cũ ds/dinh/tam_day)."""
    if not isinstance(c3, dict) or not isinstance(c3.get("doi_tuong"), list):
        return 0
    n = 0
    for d in c3["doi_tuong"]:
        if not isinstance(d, dict) or not d.get("id"):
            continue
        l = d.get("loai")

        def duong(k):
            return isinstance(d.get(k), (int, float)) and d[k] > 0
        if l == "nhom_lap":
            ok = duong("so") or bool(isinstance(d.get("ds"), list) and d["ds"])
        elif l == "da_giac":
            ok = len(d.get("diem") or d.get("dinh") or []) >= 3
        elif l in ("hinh_tru", "hinh_non"):
            ok = (duong("ban_kinh") or duong("r")) and isinstance(d.get("cao", d.get("h")), (int, float)) and d.get("cao", d.get("h")) != 0
        elif l == "mat_cau":
            ok = duong("ban_kinh")
        elif l == "hinh_hop":
            ok = isinstance(d.get("kich_thuoc"), list) and len(d["kich_thuoc"]) == 3
        else:
            ok = l in ("diem", "doan_thang", "vector", "hinh_chop", "duong_cong", "goc")
        n += 1 if ok else 0
    return n


def _dong_3dv(c3):
    """Đặc tả tự do có CHUYỂN ĐỘNG không (có hành động, hoặc >= 3 bước có thay đổi)."""
    bs = [b for b in (c3.get("buoc") or []) if isinstance(b, dict)]
    # v92: phải đổi hình ở >= 3 bước (hành động cũng tính là đổi) -> một lần gập rồi đứng im suốt bài không còn lọt qua
    return sum(1 for b in bs if b.get("hien") or b.get("an") or b.get("camera") or b.get("nhan_manh") or b.get("hanh_dong")) >= 3


def _tok_khop(s):
    """Từ dùng để so khớp khi_noi: bỏ số (chữ hay chữ số) vì lời thoại ghi "năm trăm mười hai" còn phụ đề /
    mốc ước lượng ghi "512" -> hai phía chỉ so phần chữ."""
    return [w for w in _tok(s) if not w.isdigit() and w not in TU_SO and not re.fullmatch(r"\d+\w*", w)]


def _trai_deu(ds, lo, hi):
    """Điền các mốc None (giữ thứ tự) bằng nội suy đều giữa hai mốc đã biết kề nhau; biên = lo / hi."""
    ra = list(ds)
    n = len(ra)
    i = 0
    while i < n:
        if ra[i] is not None:
            i += 1
            continue
        j = i
        while j < n and ra[j] is None:
            j += 1
        a = ra[i - 1] if i > 0 else lo
        b = ra[j] if j < n else hi
        for k in range(i, j):
            ra[k] = a + (b - a) * (k - i + 1) / (j - i + 1)
        i = j
    return ra


def khung_4_tang(kb, canh_props, fps):
    """v92: kb.khung4tang (AI viết, mốc theo lời `khi_noi`) -> props.khung4tang (mốc `t` giây từ đầu phần nội dung).
    - Khớp `khi_noi` CHỈ TIẾN, trong đúng cảnh `canh` của bước (không quay lại tìm từ đầu -> hết nhảy bước sớm vì cụm trùng
      câu đọc đề); so phần chữ, bỏ số (lời thoại ghi chữ, mốc ước lượng từ phụ đề ghi số); khớp gần >= 72% số từ.
    - Bước >= 2 không bao giờ trước khi đọc xong đề; bước cuối có ít nhất ~6 s (không bị ép về 0,5 s cuối video).
    - Thẻ: con trỏ riêng trong khung thời gian của bước; thẻ không khớp trải đều trong bước; thẻ đầu hiện ngay khi vào bước;
      bước < 2 thẻ / hở > 14 s lấy thêm thẻ từ noi_dung_man_hinh của cảnh đang đọc; bước cuối luôn có thẻ đáp số.
    - 3D: luôn có khuôn tham số (khuon) hoặc mang khuon_du_phong; mốc 3D không khớp trải theo mốc các bước.
    Khóa luồng hình học thuần: luôn trả None (bài hình học dựng bằng Manim)."""
    if str(kb.get("luong") or "") == "hinh_hoc_thuan" or str(kb.get("mon") or "").upper() == "HINH_HOC":
        return None
    k4 = kb.get("khung4tang")
    if not isinstance(k4, dict) or not isinstance(k4.get("buoc"), list) or not k4["buoc"]:
        return None
    tu_all, dau_canh, pham_vi, het_canh = [], {}, {}, {}
    for c in canh_props:
        goc = c["batDau"] / float(fps)
        so_c = int(c["so"])
        dau_canh[so_c] = goc + c.get("leadFrame", 0) / float(fps)
        het_canh[so_c] = goc + c["soFrame"] / float(fps)
        i0 = len(tu_all)
        for w in (c.get("tu") or tu_tu_cau(c.get("cau") or [])):
            tu_all.append({"w": w["w"], "bat": round(goc + w["bat"], 3), "ket": round(goc + w["ket"], 3)})
        pham_vi[so_c] = (i0, len(tu_all))
    tong = canh_props[-1]["batDau"] / float(fps) + canh_props[-1]["soFrame"] / float(fps) if canh_props else 0
    phang = [(tk, k) for k, x in enumerate(tu_all) for tk in _tok_khop(x["w"])]
    thong_ke = {"khop": 0, "uoc": 0}

    def tim(cum, tu_tu=0, tu_den=None):
        """(chỉ số từ đầu, chỉ số sau cụm) trong [tu_tu, tu_den); khớp đúng trước, rồi khớp gần (>= 72%)."""
        can = _tok_khop(cum)
        if not can or not phang:
            return None
        tu_den = len(tu_all) if tu_den is None else tu_den
        vung = [q for q in phang if tu_tu <= q[1] < tu_den]
        n = len(can)
        for i in range(len(vung) - n + 1):
            if [q[0] for q in vung[i:i + n]] == can:
                return vung[i][1], vung[i + n - 1][1] + 1
        tot = None
        for i in range(max(0, len(vung) - n + 1)):
            r = difflib.SequenceMatcher(None, can, [q[0] for q in vung[i:i + n]]).ratio()
            if r >= 0.72 and (tot is None or r > tot[0]):
                tot = (r, vung[i][1], vung[min(len(vung) - 1, i + n - 1)][1] + 1)
        return (tot[1], tot[2]) if tot else None

    def chi_so_tai(t):
        return next((k for k, x in enumerate(tu_all) if x["bat"] >= t - 0.05), len(tu_all))

    def mau(m, md="cyan"):
        m = str(m or "").strip().lower().replace(" ", "_")
        m = MAU_3DV_GAN.get(m, m)
        return m if m in MAU_3DV else md

    # hết phần đọc đề: các cảnh mở đầu / đề liên tiếp từ đầu video
    t_het_de = 0.0
    for c in canh_props:
        if re.search(r"mo_dau|hook|de_bai|dat_van_de", str(c.get("loai") or "")):
            t_het_de = het_canh[int(c["so"])]
        else:
            break
    ds_buoc = [b for b in k4["buoc"] if isinstance(b, dict)]
    nb = len(ds_buoc)
    # ---- mốc bước ----
    t_buoc, con_tro = [], 0
    for j, b in enumerate(ds_buoc):
        if j == 0:
            t_buoc.append(0.0)
            continue
        try:
            so_c = int(b.get("canh")) if b.get("canh") is not None else None
        except (TypeError, ValueError):
            so_c = None
        lo, hi = con_tro, len(tu_all)
        if so_c in pham_vi and con_tro < pham_vi[so_c][1]:
            lo, hi = max(con_tro, pham_vi[so_c][0]), pham_vi[so_c][1]
        kq = tim(str(b.get("khi_noi") or ""), lo, hi) if b.get("khi_noi") else None
        if kq is None and so_c in pham_vi and b.get("khi_noi"):
            kq = tim(str(b.get("khi_noi")), con_tro)   # khi_noi lệch cảnh: vẫn chỉ tìm TIẾN
        if kq:
            con_tro = kq[1]
            thong_ke["khop"] += 1
            t = tu_all[kq[0]]["bat"]
        elif so_c in dau_canh:
            thong_ke["uoc"] += 1
            t = dau_canh[so_c]
        else:
            thong_ke["uoc"] += 1
            t = None
        if t is not None and t < t_het_de - 0.05 and not (so_c in het_canh and het_canh[so_c] <= t_het_de):
            t = t_het_de   # cấm nhảy sang bước giải khi chưa đọc xong đề
        t_buoc.append(t)
    du_tru = min(6.0, max(2.0, tong * 0.08))
    t_buoc = _trai_deu(t_buoc, t_het_de, max(t_het_de + 1, tong - du_tru))
    gian = 2.5 if tong > nb * 4 else max(0.8, tong / max(1, nb) * 0.5)
    for j in range(1, nb):
        t_buoc[j] = max(t_buoc[j], t_buoc[j - 1] + gian)
    if nb > 1 and t_buoc[-1] > tong - du_tru:   # bước cuối không bị đẩy sát Outro
        t_buoc[-1] = max(t_buoc[-2] + 0.8, tong - du_tru)
        for j in range(nb - 2, 0, -1):
            t_buoc[j] = min(t_buoc[j], t_buoc[j + 1] - min(gian, (t_buoc[j + 1] - t_buoc[0]) / (j + 1)))
    t_buoc = [round(max(0.0, x), 3) for x in t_buoc]

    dap_an = str(kb.get("dap_an_cuoi") or kb.get("dap_an") or "")
    so_dap = re.findall(r"\d+(?:[.,]\d+)?", dap_an)
    de_txt = str(kb.get("de_bai") or "")
    so_lo = [x for x in so_dap if not re.search(r"(?<![\d.,])" + re.escape(x) + r"(?![\d.,])", de_txt)]
    cac_canh = [c for c in (kb.get("canh") or []) if isinstance(c, dict)]
    toi_uu = bool(re.search(r"lớn nhất|nhỏ nhất|tối đa|tối thiểu|ít nhất|nhiều nhất", de_txt, re.I))
    # tên hàm cho bảng biến thiên: ký hiệu đạo hàm hay gặp nhất trong lời thoại / màn hình / thẻ (V'(x), S'(r)...)
    van_kb = json.dumps([[c.get("loi_thoai"), c.get("noi_dung_man_hinh")] for c in cac_canh] + [k4.get("buoc")], ensure_ascii=False)
    dem_ham = {}
    for m in re.finditer(r"([A-Za-z])'\s*\(\s*([a-z])\s*\)", van_kb):
        dem_ham[m.groups()] = dem_ham.get(m.groups(), 0) + 1
    ham_bbt = max(dem_ham, key=dem_ham.get) if dem_ham else None

    def _chuan_dong(x):
        return re.sub(r"\\[,;:! ]|\\left|\\right|\s+|\{,\}", "", str(x)).replace("\\dfrac", "\\frac")

    def canh_cua_the(th, t0, t1):
        """Thẻ không có khi_noi: tìm cảnh (bắt đầu trong bước) có noi_dung_man_hinh trùng dòng của thẻ -> mốc đầu cảnh đó."""
        dong = {_chuan_dong(x) for x in (th.get("dong") or ([th.get("noi_dung")] if th.get("noi_dung") else []))}
        dong.discard("")
        if not dong:
            return None
        for i, c in enumerate(canh_props):
            ts = dau_canh[int(c["so"])]
            if t0 - 0.5 <= ts < t1 and i < len(cac_canh):
                man = {_chuan_dong(x) for x in (cac_canh[i].get("noi_dung_man_hinh") or []) if isinstance(x, str)}
                if dong & man or any(a in b or b in a for a in dong for b in man if len(a) >= 6 and len(b) >= 6):
                    return ts + 0.3
        return None

    def the_tu_canh(t0, t1):
        """Thẻ công thức lấy từ noi_dung_man_hinh của các cảnh BẮT ĐẦU trong [t0, t1)."""
        ra = []
        for i, c in enumerate(canh_props):
            ts = dau_canh[int(c["so"])]
            if t0 <= ts < t1 and i < len(cac_canh):
                dong = [str(x) for x in (cac_canh[i].get("noi_dung_man_hinh") or []) if isinstance(x, str) and str(x).strip()][:3]
                if dong:
                    ra.append({"loai": "cong_thuc", "dong": dong, "t": round(ts + 0.3, 3), "tu_dong": True})
        return ra

    buoc = []
    for j, b in enumerate(ds_buoc):
        t = t_buoc[j]
        t_sau = t_buoc[j + 1] if j + 1 < nb else tong
        vao = t + 0.45   # tiêu đề cũ ra (0,2 s) rồi mới tới thẻ
        tran = max(vao, t_sau - 1.2)
        w1 = chi_so_tai(t_sau)
        ct = chi_so_tai(t - 0.3)
        the, moc_the = [], []
        for th in b.get("the") or []:
            if not isinstance(th, dict) or th.get("loai") not in ("cong_thuc", "casio", "bang_bien_thien", "chu"):
                continue
            th = dict(th)
            if th["loai"] == "cong_thuc":
                th["dong"] = [str(d) for d in th.get("dong") or [] if str(d).strip()][:4]
                if not th["dong"]:
                    continue
            # GTLN/GTNN bằng SHIFT SOLVE ra thẳng cực trị là sai cách bấm -> bảng giá trị MENU 8 (như Auto-fix KiemTraHinh.gs)
            if th["loai"] == "casio" and toi_uu and "SOLVE" in " ".join(map(str, th.get("phim") or [])).upper() \
                    and not re.search(r"=\s*0|'\(", json.dumps(th, ensure_ascii=False)):
                th["phim"] = ["MENU", "8", "f(X)", "="]
            if th["loai"] == "bang_bien_thien" and not th.get("ham") and ham_bbt:
                th["ham"], th["bien"] = ham_bbt[0], th.get("bien") or ham_bbt[1]
            kq = tim(str(th.get("khi_noi") or ""), ct, max(w1, ct)) if th.get("khi_noi") else None
            if kq:
                ct = kq[1]
                thong_ke["khop"] += 1
                moc_the.append(min(tran, max(vao, tu_all[kq[0]]["bat"])))
            else:
                if th.get("khi_noi"):
                    thong_ke["uoc"] += 1
                tc = canh_cua_the(th, t, t_sau)
                moc_the.append(min(tran, max(vao, tc)) if tc is not None else None)
            th.pop("khi_noi", None)
            the.append(th)
        if moc_the and moc_the[0] is None:
            moc_the[0] = vao   # thẻ đầu không khớp: hiện ngay khi vào bước (không để T3 trống đầu bước)
        moc_the = _trai_deu(moc_the, vao, tran + (tran - vao) / max(1, len(moc_the)))
        for k, th in enumerate(the):
            th["t"] = round(min(tran, max(vao, moc_the[k])), 3)
            if k:
                th["t"] = round(max(th["t"], the[k - 1]["t"] + 0.6), 3)
        # dòng công thức theo khi_noi_dong (tìm trong khung bước), thiếu thì cách đều
        for th in the:
            kd = th.pop("khi_noi_dong", None)
            if th["loai"] != "cong_thuc":
                continue
            moc, cd = [], chi_so_tai(th["t"])
            for k in range(len(th["dong"])):
                kq = tim(str(kd[k]), cd, max(w1, cd)) if isinstance(kd, list) and k < len(kd) and kd[k] else None
                if kq:
                    cd = kq[1]
                    moc.append(max(th["t"], tu_all[kq[0]]["bat"]))
                else:
                    moc.append(None)
            if moc and moc[0] is None:
                moc[0] = th["t"] + 0.15
            moc = _trai_deu(moc, th["t"], th["t"] + 0.9 * (len(th["dong"]) + 1))
            for k in range(1, len(moc)):
                moc[k] = max(moc[k], moc[k - 1] + 0.45)
            th["moc"] = [round(min(x, tran), 3) for x in moc]

        def lo_hong():
            mocs = sorted([vao] + [x["t"] for x in the] + [t_sau])
            return max(b2 - a2 for a2, b2 in zip(mocs, mocs[1:]))
        # lấp chỗ trống: bước < 2 thẻ hoặc hở > 14 s không có thẻ mới -> thẻ từ màn hình của cảnh đang đọc
        if len(the) < 2 or lo_hong() > 14:
            da_co = {_chuan_dong(d) for x in the for d in (x.get("dong") or [])}
            for x in the_tu_canh(t - 0.5, t_sau - 1.0):
                if any(_chuan_dong(d) in da_co for d in x["dong"]) or len(the) >= 6:
                    continue
                mocs = sorted([vao] + [y["t"] for y in the] + [t_sau])
                if len(the) >= 2 and not any(a2 < x["t"] < b2 and b2 - a2 > 14 for a2, b2 in zip(mocs, mocs[1:])):
                    continue
                x["t"] = max(x["t"], vao)
                x["moc"] = [round(x["t"] + 0.15 + 0.5 * i, 3) for i in range(len(x["dong"]))]
                the.append(x)
                da_co.update(_chuan_dong(d) for d in x["dong"])
            the.sort(key=lambda x: x["t"])
        # bước cuối: thẻ đáp số giữ tới Outro (không còn khoảng trống giữa bước cuối và màn kết)
        if j == nb - 1 and so_dap and not any(any(sd in json.dumps(x, ensure_ascii=False) for sd in so_dap) for x in the):
            the.append({"loai": "chu", "nhan": "Đáp số", "noi_dung": dap_an[:60], "t": round(min(tran, max(vao, the[-1]["t"] + 1.2 if the else vao)), 3)})
        if not the:
            the.append({"loai": "chu", "noi_dung": str(b.get("tieu_de") or b.get("nhan") or "")[:60], "t": round(vao, 3)})
        tieu_de = str(b.get("tieu_de") or "")[:60]
        for x in so_lo:   # chống lộ đáp số ở tiêu đề bước (tiêu đề hiện TRƯỚC khi tính xong)
            tieu_de = re.sub(r"(?<![\d.,])" + re.escape(x) + r"(?![\d.,])", "?", tieu_de)
        tieu_de = re.sub(r"\?(?:\s*[/:,.]\s*\?)+", "?", tieu_de)   # "31/44" -> "?" (không thành "?/?")
        tieu_de = re.sub(r"(?i)(biến cố đối)\s+([A-Z])(?![\w'])", r"\1 \\overline{\2}", tieu_de)   # ký hiệu biến cố đối đúng
        buoc.append({"t": t, "nhan": str(b.get("nhan") or "Bước %d" % (j + 1))[:24], "tieu_de": tieu_de,
                     "mau": mau(b.get("mau"), ["cyan", "vang", "hong", "ngoc"][j % 4]),
                     "du_kien": [str(x) for x in b.get("du_kien") or []], "the": the})
    if not buoc:
        return None
    de_ghim = [{"id": str(d.get("id") or "d%d" % i), "nhan": str(d.get("nhan") or "")[:28], **({"mau": mau(d["mau"])} if d.get("mau") else {})}
               for i, d in enumerate(k4.get("de_ghim") or []) if isinstance(d, dict) and str(d.get("nhan") or "").strip()][:5]

    # ---- 3D: khuôn tham số (ưu tiên) / đặc tả tự do có chuyển động / khuôn suy từ đề ----
    c3 = k4.get("canh_3d_vector")
    c3 = json.loads(json.dumps(c3)) if isinstance(c3, dict) else None
    suy = suy_khuon(kb)
    if c3 and ten_khuon(c3.get("khuon")):
        c3["khuon"] = ten_khuon(c3["khuon"])
        c3.pop("doi_tuong", None)
        nguon_3d = "khuôn " + c3["khuon"]
    elif c3 and _hop_le_3dv(c3) and _dong_3dv(c3):
        nguon_3d = "đặc tả tự do (%d đối tượng)" % _hop_le_3dv(c3)
    elif suy:
        print("Auto-fix 3D: %s -> khuôn %s %s" % ("đặc tả 3D thiếu/hỏng" if not c3 or not _hop_le_3dv(c3) else "đặc tả 3D đứng im",
                                                  suy["khuon"], json.dumps(suy["tham_so"], ensure_ascii=False)))
        c3 = dict(suy)
        nguon_3d = "khuôn suy từ đề " + suy["khuon"]
    else:
        nguon_3d = "đặc tả tự do" if c3 and _hop_le_3dv(c3) else "KHÔNG CÓ (tầng 2 có thể trống)"
    if c3 is not None and suy and not c3.get("khuon"):
        c3["khuon_du_phong"] = suy
    if c3 and c3.get("khuon"):
        ct, ds_pha = 0, []
        for ph in c3.get("pha") or []:
            if not isinstance(ph, dict):
                continue
            ph = dict(ph)
            kq = tim(str(ph.get("khi_noi") or ""), ct) if ph.get("khi_noi") else None
            if kq:
                ct = kq[1]
                ph["t"] = round(tu_all[kq[0]]["bat"], 3)
            elif ph.get("buoc") is not None:
                try:
                    ph["t"] = round(t_buoc[max(0, min(nb - 1, int(ph["buoc"]) - 1))] + 0.5, 3)
                except (TypeError, ValueError):
                    pass
            ph.pop("khi_noi", None)
            ds_pha.append(ph)
        if ds_pha:
            c3["pha"] = ds_pha
    elif c3:
        ds3 = [b for b in (c3.get("buoc") or []) if isinstance(b, dict)]
        n3 = len(ds3)
        ct, t3 = 0, []
        for i, b in enumerate(ds3):
            kq = tim(str(b.get("khi_noi") or ""), ct) if i and b.get("khi_noi") else None
            if kq:
                ct = kq[1]
            t3.append(0.0 if i == 0 else (tu_all[kq[0]]["bat"] if kq else None))
        # không khớp: trải theo mốc các bước khung 4 tầng (trước đây +1,2 s -> mọi thay đổi dồn vào vài giây đầu rồi đứng im)
        for i in range(n3):
            if t3[i] is None:
                u = i * nb / max(1, n3)
                k = int(u)
                a2 = t_buoc[min(k, nb - 1)]
                b2 = t_buoc[k + 1] if k + 1 < nb else tong
                t3[i] = a2 + (u - k) * (b2 - a2) + (0.6 if u == k else 0)
        for i, b in enumerate(ds3):
            b["t"] = round(max(t3[i], ds3[i - 1]["t"] + 0.4) if i else 0.0, 3)
            for h in b.get("hanh_dong") or []:
                if isinstance(h, dict):
                    kq = tim(str(h.get("khi_noi") or ""), chi_so_tai(b["t"])) if h.get("khi_noi") else None
                    h["t"] = round(max(b["t"], tu_all[kq[0]]["bat"]) if kq else b["t"] + 0.3, 3)
                    h.pop("khi_noi", None)
            for kh in ("khi_noi", "canh"):
                b.pop(kh, None)
    print("Khung 4 tầng: %d bước (mốc %s s), %d mốc khớp lời đọc, %d mốc ước lượng, 3D: %s" % (
        len(buoc), ", ".join("%.1f" % x for x in t_buoc), thong_ke["khop"], thong_ke["uoc"], nguon_3d))
    return {"tongFrame": int(round(tong * fps)), "fps": fps,
            # v92: phụ đề MẶC ĐỊNH TẮT trên khung 4 tầng (chỉ bật khi kịch bản ghi rõ phu_de: "gon")
            # (kịch bản cũ do prompt v91 luôn ghi "gon" -> bỏ qua; muốn bật lại: env PHU_DE_4TANG=BAT)
            "boCuc": {"anToanTikTok": True, "phuDe": "gon" if str(os.environ.get("PHU_DE_4TANG") or "").upper() in ("1", "BAT", "GON") else "tat"},
            "deGhim": de_ghim, "buoc": buoc, "canh3dv": c3}


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
    codec = ["-c:a", "pcm_s16le"] if str(dich).lower().endswith(".wav") else ["-c:a", "libmp3lame", "-b:a", "96k"]
    lenh += ["-filter_complex", ";".join(loc), "-map", "[out]"] + codec + [dich]
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
            for k in ("soNenToiDa", "lopNeonTrenNen", "kieuPhuDe", "mauPhuDe", "lopQuet", "butChi", "thanhBuoc", "tieuDeInHoa", "khungSanKhau", "loiMoiGiuaVideo", "chuyenDong", "intro"):
                if k in d:
                    pc[k] = d[k]
            if isinstance(d.get("thuongHieu"), dict):
                th.update(d["thuongHieu"])
        except Exception as e:
            print("Cảnh báo: không đọc được %s (%s), dùng phong cách mặc định" % (tep, e))
    return pc, co_dinh, th


def tao_intro(cfg, thuong_hieu):
    """Intro thương hiệu "nét vẽ hình học" chèn TRƯỚC cảnh hook (src/Intro.tsx), đọc từ phong_cach.json -> "intro".
    Trả None khi tắt hoặc kênh chưa có tên. lech = số khung nội dung bị lùi (= soFrame - chuyen, phần chuyển cảnh chồng lên cảnh đầu);
    tongFrame đã cộng lech, các tầng đọc mốc khung (kiểm duyệt, ảnh kiểm tra, chuyển động, lớp Manim) cộng thêm lech."""
    if not isinstance(cfg, dict) or cfg.get("bat", True) is not True:
        return None
    if not (cfg.get("ten") or (thuong_hieu or {}).get("ten") or (thuong_hieu or {}).get("handle")):
        return None
    giay = min(3.5, max(2.0, float(cfg.get("giay") or 2.8)))
    so = int(round(giay * FPS))
    chuyen = int(round(min(1.0, max(0.25, float(cfg.get("chuyenGiay") or 0.5))) * FPS))
    it = {"soFrame": so, "chuyen": chuyen, "lech": so - chuyen}
    for k in ("ten", "khauHieu", "mauNhan", "mauPhu", "mauNen", "soTuNhan", "dungLogo", "amThanh"):
        if k in cfg and cfg[k] not in (None, ""):
            it[k] = cfg[k]
    return it


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
    if not canh_props:
        return None
    gain = {"nhe": 0.85, "chinh": 1.0, "cang": 0.95, "bung": 1.0}
    o = 2.0                                       # một ô nhịp = 2 giây (120 BPM, 4/4)
    tong_giay = (canh_props[-1]["batDau"] + canh_props[-1]["soFrame"]) / FPS + 8.0
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
        mon = str(kb.get("mon") or "").upper()
        loai = "Toán đi chợ" if kb.get("san_pham") else ("Xác suất" if mon == "XAC_SUAT" else "Hình học" if mon == "HINH_HOC" else "Toán thực tế")
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
    hien = dict(th or {})
    hien.pop("outroGiay", None)
    hien.pop("outroTuTao", None)
    hien.pop("dungOutroRieng", None)
    hien.pop("coManKet", None)
    if not hien.get("ten") or "toán thầy trí" in str(hien.get("ten") or "").lower():
        hien["ten"] = os.environ.get("KENH_TEN") or "Tư duy Xác suất"
    if not hien.get("handle") or "toanthaytri" in str(hien.get("handle") or "").lower():
        hien["handle"] = os.environ.get("KENH_HANDLE") or "@tuduyxacsuat"
    if not hien.get("khauHieu"):
        hien["khauHieu"] = os.environ.get("KENH_KHAU_HIEU") or (th.get("khauHieu") if th else "") or "Học toán tư duy mỗi ngày"
    if not hien.get("loiMoi"):
        hien["loiMoi"] = os.environ.get("KENH_LOI_MOI") or (th.get("loiMoi") if th else "") or "Bấm theo dõi để học mẹo toán mỗi ngày"
    hien["logo"] = "thuong_hieu/" + os.path.basename(logo) if logo else None
    outro = None
    if out:
        ten = os.path.basename(out)
        video = ten.lower().endswith((".mp4", ".mov", ".webm"))
        giay = float((th or {}).get("outroGiay") or 5)
        if video:
            try:
                giay = min(max(do_thoi_luong(out), 2.0), 12.0)
            except Exception:
                pass
        outro = {"tep": "thuong_hieu/" + ten, "loai": "video" if video else "anh", "soFrame": int(round(giay * FPS))}
    return hien, outro


def la_chuyen_muc_xac_suat(kb):
    mon = str(kb.get("mon") or kb.get("loai_cau_hoi") or kb.get("chuyen_muc") or "")
    chu = (mon + " " + str(kb.get("chu_de") or "") + " " + str(kb.get("tieu_de") or "")).lower()
    return mon.upper() == "XAC_SUAT" or bool(re.search(r"xac_suat|xác suất|xac suat", chu))


def logo_theo_chuyen_muc(thuong_hieu, public, kb):
    """v92: logo.png của kênh in sẵn chữ "Tư duy Xác suất" -> bài Toán (thực tế/tối ưu/tích phân/Oxyz) dùng logo_toan.*,
    không có thì bỏ ảnh để LogoTron vẽ chữ ĐỘNG theo tên chuyên mục. Bài xác suất ưu tiên logo_xac_suat.*, rồi logo.*."""
    th = dict(thuong_hieu or {})
    thu_muc = os.path.join(public, "thuong_hieu")
    xs = la_chuyen_muc_xac_suat(kb)
    th["chuyenMuc"] = "xac_suat" if xs else "toan"
    rieng = tim_tep(thu_muc, "logo_xac_suat" if xs else "logo_toan", (".png", ".webp", ".jpg", ".jpeg")) if os.path.isdir(thu_muc) else None
    if rieng:
        th["logo"] = "thuong_hieu/" + os.path.basename(rieng)
    elif not xs:
        th["logo"] = None
    return th


def ten_kenh_theo_chuyen_muc(thuong_hieu, th, kb):
    """v89: tên kênh ở Intro / dấu nước / màn kết theo chuyên mục (phong_cach.json -> thuongHieu.tenTheoChuyenMuc,
    ví dụ {"Xác suất": "Tư duy Xác suất", "mac_dinh": "Tư duy Toán"}) để bài Đạo hàm/Tối ưu không gắn cứng chữ "Xác suất"."""
    bang = (th or {}).get("tenTheoChuyenMuc")
    if not isinstance(bang, dict) or not bang:
        return thuong_hieu
    mon = str(kb.get("mon") or kb.get("loai_cau_hoi") or kb.get("chuyen_muc") or "")
    chu = (mon + " " + str(kb.get("chu_de") or kb.get("tieu_de") or "")).lower()
    ten = None
    for k, v in bang.items():
        if k != "mac_dinh" and k.lower() in chu:
            ten = v
            break
    if ten is None and re.search(r"xac_suat|xác suất|xac suat", chu):
        ten = bang.get("Xác suất")
    ten = ten or bang.get("mac_dinh")
    return dict(thuong_hieu, ten=ten) if ten else thuong_hieu


def chon_man_ket(outro_tep, th, bai_hoc):
    """Màn kết: mặc định dùng màn kết tự tạo chuyên nghiệp (tóm tắt bài học + kênh + nút Theo dõi).
    Chỉ dùng tệp outro của bạn khi phong_cach.json đặt "thuongHieu": {"dungOutroRieng": true}."""
    if outro_tep and th.get("dungOutroRieng"):
        return outro_tep
    if not th.get("outroTuTao", True):
        return outro_tep
    if bai_hoc or th.get("ten") or th.get("handle") or th.get("logo"):
        giay = 6.0 if bai_hoc else 3.2
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
    # \hl{...} (khung vàng phần đang xét) và \dpcm chỉ bản Manim hiểu -> bản Remotion (KaTeX) đổi về dạng thường
    tex = re.sub(r"\\hl\{", "{", str(tex)).replace("\\dpcm", "\\text{(đpcm)}")
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


# các gói phong cách edit an toàn (xem phong_cach_edit trong kịch bản)
GOI_EDIT = {
    "nang_dong": {"nen": ["tia", "hat_sang"], "lopQuet": "luon", "kieuPhuDe": "hop"},
    "toi_gian": {"nen": ["luoi", "song"], "lopQuet": False, "kieuPhuDe": "mau"},
    "dien_anh": {"nen": ["cuc_quang", "luc_giac"], "lopQuet": True, "kieuPhuDe": "hop"},
    "so_tay": {"nen": ["ky_hieu", "luoi"], "lopQuet": True, "kieuPhuDe": "mau", "kieuToan": "dong_nhat"},
}


def gia_viet(n):
    try:
        n = int(float(n))
    except (TypeError, ValueError):
        return ""
    return ("{:,}".format(n)).replace(",", ".") + "đ" if n > 0 else ""


def chuan_anh_san_pham(kb, public):
    """Video sản phẩm: ảnh thật đã được workflow tải về public/sp/<mã>/ (từ Drive VIDEO_XACSUAT/san_pham/<mã>/).
    Đổi vật anh_that {"anh": k} thành {"src": "sp/<mã>/anh_k.jpg"}; ảnh không có thì vật hiện thẻ tên sản phẩm (không vỡ video).
    Trả danh sách đường dẫn ảnh có thật (ảnh 0 dùng cho thẻ sản phẩm cuối video)."""
    sp = kb.get("san_pham") if isinstance(kb.get("san_pham"), dict) else None
    if not sp:
        return []
    ma = re.sub(r"[^A-Za-z0-9_-]", "", str(sp.get("id") or ""))
    ds = []
    for ten in sp.get("anh") or []:
        ten = re.sub(r"[^A-Za-z0-9_.-]", "", str(ten))
        duong = "sp/%s/%s" % (ma, ten)
        ds.append(duong if ma and ten and os.path.isfile(os.path.join(public, duong)) else "")
    co = [x for x in ds if x]
    print("Ảnh thật sản phẩm %s: %d/%d ảnh có trên máy dựng" % (ma, len(co), len(ds)))
    gia = gia_viet(sp.get("gia_ban"))
    for c in kb.get("canh") or []:
        du = (c.get("minh_hoa") or {}).get("du_lieu") if isinstance(c.get("minh_hoa"), dict) else None
        for v in (du.get("vat") or []) if isinstance(du, dict) else []:
            if not isinstance(v, dict) or v.get("loai") != "anh_that":
                continue
            try:
                k = int(v.get("anh") or 0)
            except (TypeError, ValueError):
                k = 0
            src = ds[k] if 0 <= k < len(ds) and ds[k] else (co[0] if co else "")
            if src:
                v["src"] = src
            if not v.get("noi_dung"):
                v["noi_dung"] = str(sp.get("ten") or "")[:40]
            if v.get("gia") and not v.get("gia_tri_chu"):
                v["gia_tri_chu"] = gia
    return co


def the_san_pham(kb, anh_sp):
    sp = kb.get("san_pham") if isinstance(kb.get("san_pham"), dict) else None
    if not sp or not sp.get("ten"):
        return None
    return {"ten": str(sp.get("ten"))[:60], "gia": gia_viet(sp.get("gia_ban")), "anh": anh_sp[0] if anh_sp else "",
            "cta": "🛒 Có tại kênh · link ở mô tả" if sp.get("link") else "🛒 Có tại kênh · xem giỏ hàng / mô tả"}


def _la_nhan_an_so_som(nhan, de_goc):
    s = str(nhan or "").strip()
    if not s or "?" in s:
        return False
    bo_dv = re.sub(r"\s*(m|cm|mm|km|dm|l|lít|kg|g|độ|°|\^\s*\{?\s*[23]\s*\}?|\\circ)\s*$", "", s, flags=re.I).strip()
    if re.fullmatch(r"-?\d+(?:[.,]\d+)?", bo_dv):
        return False
    m_bien = re.search(r"(?:^|[^a-zA-ZÀ-ỹ])([xyhr])(?:[^a-zA-ZÀ-ỹ]|$)", bo_dv)
    if not m_bien:
        return False
    bien = m_bien.group(1)
    co_trong_de = bool(re.search(r"(?:^|[\s($,;])" + re.escape(bien) + r"(?:[\s)$.,;=<>+\-^]|$)", str(de_goc or "")))
    return not co_trong_de


def minh_hoa_thuc_te(kb):
    if kb.get("mon") not in (None, "", "THUC_TE"):
        return
    de = " ".join([str(kb.get("de_bai") or ""), *map(str, kb.get("de_cho") or [])])
    de = de.replace("{,}", ",")
    de = re.sub(r"[{}$]|\\(?:text|mathrm)|\\[,; ]", " ", de)
    def khoang_cach(ten, mo_ta):
        do_dai = r"\s*(?:=|là|dài)?\s*(\d+(?:[.,]\d+)?)\s*km\b"
        m = re.search(r"(?:\b" + ten + r"\b|" + mo_ta + r")" + do_dai, de, re.I)
        return float(m[1].replace(",", ".")) if m else 0

    ah = khoang_cach("AH", r"(?:tàu|thuyền)\s+A\s+cách\s+bờ(?: biển)?")
    hb = khoang_cach("(?:HB|BH)", r"(?:trạm\s+)?B\s+cách\s+H")
    can = re.search(r"(?:\bcó|gồm|quản lý|tổng số|toàn bộ)\s+(\d+)\s*căn hộ", de, re.I)
    if not can:
        can = re.search(r"(?:^|[.;])\s*(\d+)\s*căn hộ\b", de, re.I)
    du = None
    if ah and hb and 0.25 <= hb / ah <= 8 and re.search(r"tàu|thuyền", de, re.I) and re.search("bờ", de, re.I):
        du = {"loai": "cap_bo", "ah": ah, "hb": hb}
    elif can and 1 <= int(can[1]) <= 150 and re.search("thuê", de, re.I):
        du = {"loai": "can_ho", "tong": int(can[1]), "trong": None}
    if not du:
        return
    for c in kb.get("canh") or []:
        if c.get("loai") not in ("mo_dau", "hook", "de_bai", "mo_hinh_hoa"):
            continue
        mh = c.get("minh_hoa") or {}
        if mh.get("loai") not in (None, "", "khong", "san_khau"):
            continue
        vat = (mh["du_lieu"].get("vat") or []) if isinstance(mh.get("du_lieu"), dict) else []
        if any(v.get("loai") in ("anh_that", "do_thi", "hinh_hoc") for v in vat if isinstance(v, dict)):
            continue
        data = dict(du)
        if du["loai"] == "can_ho":
            loi = str(c.get("loi_thoai") or "")
            so_trong = re.search(r"(?<![.,\d])(\d+)\s*căn (?:hộ )?(?:bị |bỏ )?trống", loi, re.I)
            if so_trong and int(so_trong[1]) <= du["tong"] and not re.search(r"mỗi|cứ |thêm|tăng|giảm|nếu", loi, re.I):
                data["trong"] = int(so_trong[1])
            elif re.search(r"thuê hết|thuê kín|kín phòng", loi, re.I) and not re.search(r"chưa|không|nếu|tăng|giảm", loi, re.I):
                data["trong"] = 0
        c["minh_hoa"] = {"loai": "thuc_te_theo_de", "du_lieu": data}
        c["giu_san_khau"] = False


def minh_hoa_chon_nhom(kb):
    de = " ".join([str(kb.get("de_bai") or ""), *map(str, kb.get("de_cho") or [])])
    nhom = {}
    for m in re.finditer(r"\b(\d+)\s*(?:học sinh|hs|bạn)\s*(?:ở |thuộc )?(?:khối|lớp)\s*(10|11|12)\b", de, re.I):
        if re.search(r"(?:chọn|lấy)\s*$", de[:m.start()], re.I):
            continue
        nhom.setdefault(m[2], int(m[1]))
    if any(so < 1 or so > 12 for so in nhom.values()):
        nhom.clear()
    for c in kb.get("canh") or []:
        loai = str(c.get("loai") or "")
        loi = str(c.get("loi_thoai") or "").lower()
        mh = c.get("minh_hoa") or {}
        du = mh.get("du_lieu") or {}
        vat = (du.get("vat") or []) if isinstance(du, dict) else []
        loai_vat = {v.get("loai") for v in vat if isinstance(v, dict)}
        that = loai_vat - {"chu", "nhan", "the", "so_dem", "mui_ten", "danh_sach", "bieu_tuong"}
        if mh.get("loai") not in (None, "", "khong", "san_khau", "bi_hop"):
            continue
        quay_that = re.search(r"vòng quay|quay số|bánh xe", loi)
        if re.search(r"lien_he|bai_hoc|ket_luan", loai) and not quay_that and (
                re.search(r"phân công|phân bổ nhân sự|ca trực|chia (?:nhóm|ca)|lập đội|xếp lịch", loi)
                and (not that or that & {"hop_qua", "vong_quay"} or str(mh.get("mo_ta") or "").startswith("Liên hệ thực tế sinh động"))):
            c["minh_hoa"] = {"loai": "bang_phan_cong", "mo_ta": "Người điều phối gắn phiếu thành viên lên bảng phân công"}
            c["giu_san_khau"] = False
        elif len(nhom) >= 2 and loai in ("mo_dau", "de_bai", "mo_hinh_hoa", "nhac_lai", "tinh_toan", "diem_chot", "mo_phong") and re.search(r"trường hợp|tổ hợp|chọn|khối", loi) and (
                not loai_vat or loai_vat <= {"chu", "nhan", "hop_bi", "tui", "hop_qua"}):
            vat_moi, hd = [], []
            loi_chon = loi
            for chu, so_lop in (("mười hai", "12"), ("mười một", "11"), ("mười", "10")):
                loi_chon = re.sub(r"((?:khối|lớp)\s+)" + chu + r"\b", lambda m: m[1] + so_lop, loi_chon)
            for i, (lop, so) in enumerate(sorted(nhom.items())):
                ma = "khoi_" + lop
                vat_moi.append({"id": ma, "loai": "nguoi", "x": 50, "y": (i + 0.5) * 100 / len(nhom), "co": 0.46 if so > 6 else 0.64,
                                "so_luong": so, "buoc": i + 1, "nhan": "Khối " + lop})
                chon = re.search(r"(?:chọn|lấy)\s+(một|hai|ba|bốn|[1-9])\s*(?:học sinh|bạn|em)\s*(?:ở |thuộc )?(?:khối|lớp)\s*" + lop + r"\b", loi_chon)
                if chon:
                    n = {"một": 1, "hai": 2, "ba": 3, "bốn": 4}.get(chon[1]) or int(chon[1])
                    if n <= so:
                        hd.append({"buoc": len(nhom) + 1, "vat": ma, "kieu": "chon", "chi_so": list(range(1, n + 1)), "mau": "xanh_la"})
            c["minh_hoa"] = {"loai": "san_khau", "mo_ta": "Học sinh từng khối theo số lượng của đề", "du_lieu": {"vat": vat_moi, "hanh_dong": hd}}
            c["giu_san_khau"] = False


def chuan_hoa_hinh_kich_ban(kb):
    """Tự động chuẩn hóa 4 lỗi hình minh họa phổ biến ngay cả với các kịch bản cũ đang chờ dựng trên Drive:
    1) Đề tấm thẻ đánh số nhưng vẽ hop_bi -> đổi sang các tấm thẻ đánh số (the).
    2) Lưới 16 ô vuông trống vô nghĩa (luoi_o) cho Không gian mẫu lớn -> đổi sang thẻ các bước chọn + bộ đếm công-tơ-mét (so_dem).
    3) Cảnh liên hệ thực tế (lien_he_thuc_te) lạm dụng hop_qua -> đổi sang vật thật khớp lời thoại (vong_quay, nguoi, dien_thoai, canh_that...).
    4) Đặt ẩn sẵn (2x, x, h) ngay ở cảnh mo_dau / de_bai -> đổi thành nhãn đề bài ("Dài = 2 Rộng", "Rộng ?", "Cao ?") và đưa bước Đặt ẩn vào cảnh giải bài.
    """
    if not isinstance(kb, dict) or not isinstance(kb.get("canh"), list):
        return
    de_goc = str(kb.get("de_bai") or "")
    de_all = (de_goc + " " + " ".join(str(x) for x in (kb.get("de_cho") or [])) + " " + str(kb.get("tieu_de") or "")).lower()

    # 1) Đề tấm thẻ -> đổi hop_bi / tui thành các tấm thẻ đánh số
    la_de_the = bool(re.search(r"(tấm\s+thẻ|chiếc\s+thẻ|thẻ\s+đánh\s+số|thẻ\s+mang\s+số|thẻ\s+số|rút\s+.*thẻ|chọn\s+.*thẻ|bốc\s+.*thẻ|tấm\s+phiếu|lá\s+phiếu)", de_all)) and not bool(re.search(r"(viên\s+bi|quả\s+cầu|hộp\s+bi|túi\s+bi|quả\s+bóng)", de_all))
    if la_de_the:
        m_tu_den = re.search(r"từ\s*(\d+)\s*đến\s*(\d+)", de_all)
        if m_tu_den:
            a, b = int(m_tu_den.group(1)), int(m_tu_den.group(2))
            if 0 < b - a + 1 <= 12:
                ds_the = [str(k) for k in range(a, b + 1)]
                nhan_the = "%d tấm thẻ (%d → %d)" % (len(ds_the), a, b)
            else:
                ds_the = [str(a), str(a + 1), str(a + 2), "…", str(b - 1), str(b)]
                nhan_the = "%d tấm thẻ (%d → %d)" % (max(1, b - a + 1), a, b)
        else:
            m_so = re.search(r"(\d+)\s*(?:tấm\s+|chiếc\s+)?thẻ", de_all)
            n0 = min(12, max(3, int(m_so.group(1)))) if m_so else 9
            ds_the = [str(k) for k in range(1, n0 + 1)]
            nhan_the = "%d tấm thẻ (1 → %d)" % (n0, n0)
        for c in kb["canh"]:
            du = (c.get("minh_hoa") or {}).get("du_lieu") if isinstance(c.get("minh_hoa"), dict) else None
            if not isinstance(du, dict) or not isinstance(du.get("vat"), list):
                continue
            id_doi = set()
            for v in du["vat"]:
                if isinstance(v, dict) and v.get("loai") in ("hop_bi", "tui"):
                    id_doi.add(v.get("id"))
                    v["loai"] = "the"
                    v["so_luong"] = len(ds_the)
                    v["ds"] = list(ds_the)
                    v["mau"] = v.get("mau") or "cam"
                    v["nhan"] = nhan_the
                    if float(v.get("y") or 50) > 44:
                        v["y"] = 34
                    v["co"] = min(float(v.get("co") or 0.9), 0.92)
                    v.pop("nhom", None)
            if id_doi and isinstance(du.get("hanh_dong"), list):
                for h in du["hanh_dong"]:
                    if isinstance(h, dict) and h.get("vat") in id_doi and h.get("kieu") == "lay_ra":
                        h["kieu"] = "chon"
                        h["chi_so"] = [1, 2, 3]
                        h["mau"] = h.get("mau") or "xanh_la"

    # 2) Lưới 16 ô vuông trống (luoi_o không có ds) -> đổi sang thẻ giai đoạn Quy tắc nhân + bộ đếm Không gian mẫu
    for i, c in enumerate(kb["canh"]):
        du = (c.get("minh_hoa") or {}).get("du_lieu") if isinstance(c.get("minh_hoa"), dict) else None
        if not isinstance(du, dict) or not isinstance(du.get("vat"), list):
            continue
        ct_chu = " ".join(str(x) for x in (c.get("noi_dung_man_hinh") or []))
        loi = (str(c.get("loi_thoai") or "") + " " + str(c.get("tieu_de_canh") or "")).lower()
        for k, v in enumerate(list(du["vat"])):
            if not isinstance(v, dict) or v.get("loai") != "luoi_o":
                continue
            co_ds = isinstance(v.get("ds"), list) and any(str(x or "").strip() for x in v["ds"])
            if co_ds:
                continue
            n = int(v.get("so_luong") or 16)
            if n == 4 and re.search(r"xu|đồng tiền|sấp|ngửa", de_all + " " + loi):
                v["ds"] = ["SS", "SN", "NS", "NN"]
                continue
            if n == 8 and re.search(r"xu|đồng tiền|sấp|ngửa", de_all + " " + loi):
                v["ds"] = ["SSS", "SSN", "SNS", "SNN", "NSS", "NSN", "NNS", "NNN"]
                continue
            if n == 36 and re.search(r"xúc xắc|súc sắc", de_all + " " + loi):
                v["ds"] = ["(%d,%d)" % (r0, c0) for r0 in range(1, 7) for c0 in range(1, 7)]
                v["so_cot"] = 6
                continue
            cac_so = [int(x) for x in re.findall(r"\d+", re.sub(r"\\[a-zA-Z]+", " ", ct_chu)) if int(x) > 1]
            dich_so = cac_so[-1] if cac_so else 0
            m_tich = re.search(r"(\d+)\s*(?:\\times|\\cdot|×|\*)\s*(\d+)\s*=\s*(\d+)", ct_chu)
            if m_tich:
                ds_buoc = ["Bước 1: %s cách" % m_tich.group(1), "Bước 2: %s cách" % m_tich.group(2)]
                dich_so = int(m_tich.group(3))
            elif isinstance(kb.get("du_kien"), list) and len(kb["du_kien"]) >= 2:
                ds_buoc = [str(x) for x in kb["du_kien"][:3]]
            else:
                ds_buoc = ["Giai đoạn 1", "Giai đoạn 2"]
            id_goc = str(v.get("id") or ("kgm_%d" % (i + 1)))
            du["vat"][k] = {
                "id": id_goc, "loai": "the", "x": 50, "y": 34 if dich_so > 0 else 46, "co": 0.92, "buoc": 1,
                "so_luong": len(ds_buoc), "ds": ds_buoc, "mau": "xanh_duong", "nhan": "Các giai đoạn tạo Không gian mẫu Ω"
            }
            if dich_so > 0 and not any(isinstance(o, dict) and o.get("loai") == "so_dem" for o in du["vat"]):
                du["vat"].append({
                    "id": id_goc + "_dem", "loai": "so_dem", "x": 50, "y": 72, "co": 0.88, "buoc": 2,
                    "noi_dung": "Tổng số kết quả n(Ω)", "gia_tri": dich_so, "nhan": "cách chọn", "kieu": "vien", "mau": "vang"
                })

    # 3) Cảnh liên hệ thực tế (lien_he_thuc_te) dùng hop_qua chung chung -> thay bằng hình minh họa đa dạng khớp lời thoại
    for i, c in enumerate(kb["canh"]):
        if not re.search(r"lien_he", str(c.get("loai") or ""), re.I):
            continue
        du = (c.get("minh_hoa") or {}).get("du_lieu") if isinstance(c.get("minh_hoa"), dict) else None
        if not isinstance(du, dict) or not isinstance(du.get("vat"), list):
            continue
        vat = du["vat"]
        chu_the = " ".join(str(v.get("noi_dung") or "") + " " + " ".join(str(x) for x in (v.get("ds") or [])) for v in vat if isinstance(v, dict))
        loi = (str(c.get("loi_thoai") or "") + " " + str(c.get("tieu_de_canh") or "") + " " + chu_the).lower()
        loi_doc = str(c.get("loi_thoai") or "").lower()
        thay = set()
        if not re.search(r"hộp quà|món quà|tặng quà|sinh nhật", loi):
            thay.add("hop_qua")
        if re.search(r"bốc thăm|rút thăm|chia bảng|mật khẩu|mã pin|điện thoại", loi_doc) and not re.search(r"vòng quay|quay số|bánh xe", loi_doc):
            thay.add("vong_quay")
        if any(isinstance(v, dict) and v.get("loai") in thay for v in vat):
            loi = loi_doc
            vat_phu = []
            for v in vat:
                if isinstance(v, dict) and v.get("loai") not in thay:
                    vc = dict(v)
                    if float(vc.get("y") or 50) < 68:
                        vc["y"] = 76
                    vc["co"] = min(float(vc.get("co") or 0.9), 0.88)
                    vat_phu.append(vc)
            id_chinh = "lh_%d" % (i + 1)
            if re.search(r"mật khẩu|mã pin|bảo mật|điện thoại|tin nhắn|tài khoản", loi):
                vat_moi = [
                    {"id": id_chinh, "loai": "dien_thoai", "x": 34, "y": 40, "co": 0.9, "buoc": 1, "noi_dung": "Bảo mật & Xác thực", "ds": ["Mã PIN: ••••", "OTP ngẫu nhiên", "An toàn 99,9%"], "gia_tri_chu": "Đã khóa"},
                    {"id": id_chinh + "_ng", "loai": "nguoi", "x": 72, "y": 42, "co": 0.92, "so_luong": 2, "ds": ["Người dùng", "Hệ thống"], "kieu": "chi", "buoc": 2}
                ]
                hd_moi = [{"buoc": 2, "vat": id_chinh, "kieu": "chon", "chi_so": [1, 2], "mau": "xanh_la"}]
            elif re.search(r"bốc thăm|rút thăm|chia bảng", loi):
                vat_moi = [{"id": id_chinh, "loai": "the", "x": 50, "y": 40, "buoc": 1,
                            "ds": ["A", "B", "C"], "so_luong": 3, "nhan": "Ví dụ phiếu bốc thăm"}]
                hd_moi = [{"buoc": 2, "vat": id_chinh, "kieu": "chon", "chi_so": [1]}]
            else:
                vat_moi = [
                    {"id": id_chinh, "loai": "bieu_do_cot", "x": 34, "y": 38, "co": 0.85, "buoc": 1, "ds": ["Phương án A", "Phương án B", "Phương án C"], "ds_so": [72, 48, 88], "nhan": "Ứng dụng thực tế"},
                    {"id": id_chinh + "_ng", "loai": "nguoi", "x": 74, "y": 40, "co": 0.9, "so_luong": 3, "ds": ["Nhóm 1", "Nhóm 2", "Nhóm 3"], "kieu": "vui", "buoc": 2}
                ]
                hd_moi = [{"buoc": 2, "vat": id_chinh, "kieu": "chon", "chi_so": [3], "mau": "xanh_la"}]
            du["vat"] = vat_moi + vat_phu[:2]
            du["hanh_dong"] = hd_moi

    # 4) Không đặt ẩn sẵn (2x, x, h) ở cảnh mo_dau / de_bai trước khi vào giải bài
    mau_vat_an = None
    nhan_an_goc = None
    for i, c in enumerate(kb["canh"]):
        loai_c = str(c.get("loai") or "").lower()
        if loai_c not in ("mo_dau", "hook", "de_bai"):
            continue
        la_mo_dau = (loai_c in ("mo_dau", "hook") or i == 0)
        du = (c.get("minh_hoa") or {}).get("du_lieu") if isinstance(c.get("minh_hoa"), dict) else None
        if not isinstance(du, dict) or not isinstance(du.get("vat"), list):
            continue
        for v in du["vat"]:
            if not isinstance(v, dict):
                continue
            nkt = v.get("nhan_kich_thuoc")
            if isinstance(nkt, list) and any(_la_nhan_an_so_som(nh, de_goc) for nh in nkt):
                if not mau_vat_an:
                    mau_vat_an = json.loads(json.dumps(v))
                    nhan_an_goc = list(nkt)
                if la_mo_dau:
                    v["nhan_kich_thuoc"] = ["" for _ in nkt]
                elif v.get("loai") == "khoi_hop" and len(nkt) >= 3:
                    a0, a1, a2 = str(nkt[0] or "").strip(), str(nkt[1] or "").strip(), str(nkt[2] or "").strip()
                    m0, m1 = re.fullmatch(r"(\d+)\s*x", a0, re.I), re.fullmatch(r"(\d+)\s*x", a1, re.I)
                    if m0 and re.fullmatch(r"x", a1, re.I):
                        v["nhan_kich_thuoc"] = ["Dài = %s Rộng" % m0.group(1), "Rộng ?", "Cao ?" if _la_nhan_an_so_som(a2, de_goc) else a2]
                    elif m1 and re.fullmatch(r"x", a0, re.I):
                        v["nhan_kich_thuoc"] = ["Rộng ?", "Dài = %s Rộng" % m1.group(1), "Cao ?" if _la_nhan_an_so_som(a2, de_goc) else a2]
                    elif re.fullmatch(r"x", a0, re.I) and re.fullmatch(r"x", a1, re.I):
                        v["nhan_kich_thuoc"] = ["Cạnh đáy ?", "Cạnh đáy ?", "Cao ?" if _la_nhan_an_so_som(a2, de_goc) else a2]
                    else:
                        v["nhan_kich_thuoc"] = ["Dài ?" if _la_nhan_an_so_som(a0, de_goc) else a0, "Rộng ?" if _la_nhan_an_so_som(a1, de_goc) else a1, "Cao ?" if _la_nhan_an_so_som(a2, de_goc) else a2]
                else:
                    v["nhan_kich_thuoc"] = ["?" if _la_nhan_an_so_som(nh, de_goc) else nh for nh in nkt]
    if nhan_an_goc:
        for j, c_giai in enumerate(kb["canh"]):
            if j > 0 and str(c_giai.get("loai") or "").lower() not in ("mo_dau", "hook", "de_bai"):
                du_g = (c_giai.get("minh_hoa") or {}).get("du_lieu") if isinstance(c_giai.get("minh_hoa"), dict) else None
                if isinstance(du_g, dict) and isinstance(du_g.get("vat"), list) and mau_vat_an:
                    v_cung = [v for v in du_g["vat"] if isinstance(v, dict) and v.get("loai") == mau_vat_an.get("loai")]
                    if v_cung:
                        v_cung[0]["nhan_kich_thuoc"] = list(nhan_an_goc)
                    elif c_giai.get("giu_san_khau"):
                        c_giai["giu_san_khau"] = False
                        v_clone = json.loads(json.dumps(mau_vat_an))
                        v_clone["id"] = "vat_an_%d" % (j + 1)
                        v_clone["buoc"] = 1
                        du_g["vat"].insert(0, v_clone)
                da_co_dat_an = any(re.search(r"(gọi|đặt)\s+.*(\blà\s+[xyhr]\b|=\s*[xyhr]\b)", str(cs.get("loi_thoai") or "") + " " + " ".join(str(x) for x in (cs.get("noi_dung_man_hinh") or [])), re.I) for cs in kb["canh"])
                if not da_co_dat_an:
                    l0 = str(nhan_an_goc[0] if len(nhan_an_goc) > 0 else "")
                    w0 = str(nhan_an_goc[1] if len(nhan_an_goc) > 1 else "")
                    h0 = str(nhan_an_goc[2] if len(nhan_an_goc) > 2 else "")
                    if re.fullmatch(r"2x", l0, re.I) and re.fullmatch(r"x", w0, re.I):
                        dong_dat = r"\text{Đặt rộng } = x\;(x>0) \Rightarrow \text{dài } = 2x" + (r",\; \text{cao } = " + h0 if h0 else "")
                    elif re.fullmatch(r"x", l0, re.I) and re.fullmatch(r"x", w0, re.I):
                        dong_dat = r"\text{Đặt cạnh đáy } = x\;(x>0)" + (r",\; \text{chiều cao } = " + h0 if h0 else "")
                    else:
                        dong_dat = r"\text{Đặt ẩn: } " + r",\; ".join(nhan_an_goc)
                    nd_mh = list(c_giai.get("noi_dung_man_hinh") or [])
                    c_giai["noi_dung_man_hinh"] = ([dong_dat] + nd_mh)[:3]
                break


LOAI_CANH_GIAI = re.compile(r"dap_an|ket_qua|kiem_tra|tinh|giai|diem_chot|bai_hoc|ket_luan")


def gan_moc_chong_lo(c, cau, tu):
    """v89 CHỐNG LỘ ĐÁP ÁN trên sân khấu:
    - danh_sach: mỗi dòng hiện đúng lúc lời giảng nói tới (khi_noi_dong[i] hoặc chính chữ của dòng) -> vat["moc_dong"].
    - do_thi: tọa độ điểm đánh dấu (cực trị) chỉ hiện khi lời giảng nói tới "khi_noi_diem"; cảnh đặt vấn đề (không phải cảnh giải/đáp án)
      mà không khai báo thì hiện dấu "?" -> vat["moc_hien_diem"] (giây, -1 = giữ dấu ?)."""
    mh = c.get("minh_hoa") if isinstance(c.get("minh_hoa"), dict) else None
    du = mh.get("du_lieu") if mh else None
    if not isinstance(du, dict) or not isinstance(du.get("vat"), list):
        return
    la_giai = bool(LOAI_CANH_GIAI.search(str(c.get("loai") or "").lower()))
    for v in du["vat"]:
        if not isinstance(v, dict):
            continue
        if v.get("loai") == "danh_sach" and isinstance(v.get("ds"), list) and v["ds"]:
            kn = v.get("khi_noi_dong")
            cum = [str(x) for x in kn] if isinstance(kn, list) and len(kn) == len(v["ds"]) else [texSangChuPy(str(x)) for x in v["ds"]]
            moc = moc_cong_thuc(cum, cau, len(cum), tu)
            if moc:
                v["moc_dong"] = moc
        elif v.get("loai") == "bieu_do_cot" and isinstance(v.get("ds_so"), list) and v["ds_so"]:
            # từng cột mọc lên đúng lúc lời đọc nói tới giá trị thử đó (khi_noi_dong[i] hoặc nhãn cột)
            kn = v.get("khi_noi_dong")
            nhan = v.get("ds") if isinstance(v.get("ds"), list) and len(v["ds"]) == len(v["ds_so"]) else []
            cum = [str(x) for x in kn] if isinstance(kn, list) and len(kn) == len(v["ds_so"]) else [texSangChuPy(str(x)) for x in nhan]
            moc = moc_cong_thuc(cum, cau, len(cum), tu) if cum else None
            if moc:
                v["moc_dong"] = moc
        elif v.get("loai") == "bang_bien_thien" and isinstance(v.get("khi_noi_dong"), list) and v["khi_noi_dong"]:
            kn = [str(x) for x in v["khi_noi_dong"][:2]]
            moc = moc_cong_thuc(kn, cau, len(kn), tu)
            if moc:
                v["moc_dong"] = moc
        elif v.get("loai") == "do_thi" and v.get("danh_dau"):
            kn = str(v.get("khi_noi_diem") or "").strip()
            moc = moc_cong_thuc([kn], cau, 1, tu) if kn else None
            v["moc_hien_diem"] = moc[0] if moc else (None if la_giai else -1)


def texSangChuPy(s):
    """Chữ đọc được từ một dòng TeX ngắn (để dò dòng đó trong lời giảng): bỏ lệnh, ngoặc."""
    s = re.sub(r"\\(?:dfrac|frac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"\1 phần \2", s)
    s = re.sub(r"\\[a-zA-Z]+|[{}$^_]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def moc_cong_thuc(cum, cau, so_dong, tu=None):
    """Mốc đầu cụm nói cho từng dòng công thức: dùng mốc TỪ THẬT (tu) khi có, không thì ước lượng theo vị trí từ trong phụ đề.
    v89: khớp TỪNG DÒNG (trước đây một dòng lệch là bỏ cả cảnh -> công thức hiện theo nhịp cố định, lộ kết quả trước lời giảng).
    Dòng không khớp được nội suy giữa hai dòng đã khớp; không dòng nào khớp mới trả None."""
    if not isinstance(cum, list) or not cum or len(cum) != so_dong:
        return None
    kq = [None] * so_dong
    if tu:
        vt = 0
        for i, nhan in enumerate(cum):
            tim = None
            if isinstance(nhan, str):
                for bien in (nhan, hien_phu_de(nhan), chuan_hoa_doc(nhan)):
                    tim = tim_cum_tu(bien, tu, vt)
                    if tim and tim[0] >= vt:
                        break
                    tim = None
            if tim:
                kq[i] = round(tu[tim[0]]["bat"], 3)
                vt = tim[1]
    else:
        tu_p, moc = [], []
        for c in cau:
            ds = re.findall(r"\w+", c["text"].casefold())
            for j, w in enumerate(ds):
                tu_p.append(w)
                moc.append(c["bat"] + (c["ket"] - c["bat"]) * j / len(ds))
        vi_tri = 0
        for i, nhan in enumerate(cum):
            for bien in ((nhan, hien_phu_de(nhan)) if isinstance(nhan, str) else ()):
                ds = re.findall(r"\w+", bien.casefold())
                if not ds:
                    continue
                for j in range(vi_tri, len(tu_p) - len(ds) + 1):
                    if tu_p[j:j + len(ds)] == ds:
                        kq[i] = round(moc[j], 3)
                        vi_tri = j + len(ds)
                        break
                if kq[i] is not None:
                    break
    biet = [i for i, v in enumerate(kq) if v is not None]
    if not biet:
        return None
    for i in range(so_dong):
        if kq[i] is not None:
            continue
        truoc = max([j for j in biet if j < i], default=None)
        sau = min([j for j in biet if j > i], default=None)
        if truoc is not None and sau is not None:
            kq[i] = round(kq[truoc] + (kq[sau] - kq[truoc]) * (i - truoc) / (sau - truoc), 3)
        elif truoc is not None:
            kq[i] = round(kq[truoc] + 0.9 * (i - truoc), 3)
        else:
            kq[i] = round(max(0.2, kq[sau] - 0.9 * (sau - i)), 3)
    for i in range(1, so_dong):   # giữ thứ tự hiện, cách nhau tối thiểu 0,35 s
        kq[i] = round(max(kq[i], kq[i - 1] + 0.35), 3)
    return kq


# v91: đo thời gian từng khâu của bước chuẩn bị (in bảng cuối bước + out/thoi_gian_chuanbi.json + GITHUB_STEP_SUMMARY)
SO_EDGE_SONG_SONG = max(1, min(16, int(os.environ.get("EDGE_SONG_SONG") or 8)))
SO_LUONG_AM = max(2, min(8, int(os.environ.get("LUONG_AM") or (os.cpu_count() or 4))))
THOI_GIAN_KHAU = []


class do_khau:
    def __init__(self, ten):
        self.ten = ten

    def __enter__(self):
        self.t0 = time.perf_counter()
        return self

    def __exit__(self, *a):
        THOI_GIAN_KHAU.append((self.ten, time.perf_counter() - self.t0))
        return False


_MOC_KHAU = [None]


def cham(ten):
    """Ghi thời gian từ điểm chấm trước tới giờ cho khâu `ten`."""
    bay_gio = time.perf_counter()
    if _MOC_KHAU[0] is not None:
        THOI_GIAN_KHAU.append((ten, bay_gio - _MOC_KHAU[0]))
    _MOC_KHAU[0] = bay_gio


def in_bang_thoi_gian(tong_giay, thu_muc_ra="out"):
    dong = ["| Khâu | Giây | % |", "|---|---:|---:|"]
    for ten, g in THOI_GIAN_KHAU:
        dong.append("| %s | %.2f | %d%% |" % (ten, g, round(100 * g / max(1e-6, tong_giay))))
    dong.append("| **Tổng chuanbi.py** | **%.2f** | 100%% |" % tong_giay)
    print("\n=== THỜI GIAN BƯỚC CHUẨN BỊ ===")
    for ten, g in THOI_GIAN_KHAU:
        print("  %-34s %7.2f s" % (ten, g))
    print("  %-34s %7.2f s" % ("TỔNG", tong_giay))
    try:
        os.makedirs(thu_muc_ra, exist_ok=True)
        with open(os.path.join(thu_muc_ra, "thoi_gian_chuanbi.json"), "w", encoding="utf8") as f:
            json.dump({"tong": round(tong_giay, 2), "khau": [{"ten": t, "giay": round(g, 2)} for t, g in THOI_GIAN_KHAU]}, f, ensure_ascii=False, indent=1)
        tom_tat = os.environ.get("GITHUB_STEP_SUMMARY")
        if tom_tat:
            with open(tom_tat, "a", encoding="utf8") as f:
                f.write("### Thời gian chuanbi.py\n\n" + "\n".join(dong) + "\n\n")
    except OSError:
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kich_ban")
    ap.add_argument("--public", default="public")
    ap.add_argument("--props-ra", default=None)
    ap.add_argument("--giong", default=os.environ.get("GIONG", "vi-VN-HoaiMyNeural"))
    ap.add_argument("--toc-do", default=os.environ.get("TOC_DO") or "+6%")
    ap.add_argument("--cao-do", default=os.environ.get("CAO_DO", "+0Hz"))
    ap.add_argument("--phong-cach", default="phong_cach.json")
    ap.add_argument("--gia-lap", action="store_true", help="dùng tiếng bíp thay giọng thật (để thử máy)")
    # MỘT GIỌNG CHO CẢ VIDEO: mặc định Gemini đọc TOÀN BỘ lời thoại trong MỘT lần gọi (một người đọc xuyên suốt, giọng tự nhiên),
    # rồi cắt theo cảnh. Không đọc được thì CẢ video dùng edge-tts (không bao giờ trộn hai giọng trong một video). MAY_GIONG=edge để luôn dùng edge.
    co_key = bool(os.environ.get("GEMINI_KEYS") or os.environ.get("GEMINI_API_KEY"))
    ap.add_argument("--may-giong", default=os.environ.get("MAY_GIONG") or ("gemini" if co_key else "edge"),
                    help="gemini (mặc định khi có key: đọc cả video một lần) | edge")
    ap.add_argument("--giong-gemini", default=os.environ.get("GIONG_GEMINI") or "Puck")
    ap.add_argument("--tts-model", default=os.environ.get("TTS_MODEL") or "gemini-2.5-flash-preview-tts")
    ap.add_argument("--toc-do-gemini", default=os.environ.get("TOC_DO_GEMINI") or "1.08")
    ap.add_argument("--phong-cach-giong", default=os.environ.get("PHONG_CACH_GIONG") or PHONG_CACH_GIONG_MAC_DINH)
    args = ap.parse_args()
    t_tong = time.perf_counter()
    cham("")

    kb = json.load(open(args.kich_ban, encoding="utf8"))
    # giọng do Apps Script chọn theo quy tắc (Charon nam / Kore nữ...); dự phòng edge cùng giới tính để không đổi giọng nam <-> nữ
    if str(kb.get("giong") or "").strip() and re.fullmatch(r"[A-Za-z]{3,20}", str(kb["giong"]).strip()):
        args.giong_gemini = str(kb["giong"]).strip()
    if str(kb.get("gioi_tinh_giong") or "") == "nu":
        args.giong = "vi-VN-HoaiMyNeural"
    elif str(kb.get("gioi_tinh_giong") or "") == "nam":
        args.giong = "vi-VN-NamMinhNeural"
    print("Giọng của video này: Gemini %s (dự phòng edge %s)" % (args.giong_gemini, args.giong))
    luong_hh = str(kb.get("luong") or "") == "hinh_hoc_thuan" or str(kb.get("mon") or "").upper() == "HINH_HOC"
    if luong_hh and args.may_giong != "edge" and os.environ.get("HH_GIONG_GEMINI") != "1":
        # Gemini TTS không trả mốc từng từ -> bài hình học dùng edge-tts (WordBoundary) để từng nét vẽ khớp đúng lời đọc
        args.may_giong = "edge"
        print("Luồng hình học thuần: dùng edge-tts có mốc từng từ (WordBoundary) để đồng bộ cứng nét vẽ với giọng đọc")
    # cảnh ghi "dung_ban_ve": bung lại vật/điểm/vùng từ bản vẽ chung kb.ban_ve (Apps Script nén để kịch bản nhiều cảnh vừa giới hạn gửi)
    bv = kb.get("ban_ve") if isinstance(kb.get("ban_ve"), dict) else None
    for idx_c, c in enumerate(kb.get("canh") or []):
        du = (c.get("minh_hoa") or {}).get("du_lieu") if isinstance(c.get("minh_hoa"), dict) else None
        for v in (du.get("vat") or []) if isinstance(du, dict) else []:
            if isinstance(v, dict) and v.get("dung_ban_ve") and bv:
                for k in ("vat", "diem", "vung", "nhin"):
                    if k in bv and k not in v:
                        v[k] = json.loads(json.dumps(bv[k]))
                if "do" not in v and "do" in bv and isinstance(bv["do"], list):
                    ds_do = json.loads(json.dumps(bv["do"]))
                    for idx_d, d_item in enumerate(ds_do):
                        if isinstance(d_item, dict):
                            d_item["buoc"] = min(4, 1 + ((idx_d + idx_c) % 4))
                    v["do"] = ds_do
    if not luong_hh:   # luồng hình học thuần: không bung vật đời sống / bản vẽ cảnh thật
        minh_hoa_thuc_te(kb)
        minh_hoa_chon_nhom(kb)
    chuan_hoa_hinh_kich_ban(kb)
    anh_sp = chuan_anh_san_pham(kb, args.public)
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

    # video HÌNH HỌC: đánh vần tên điểm (BD -> "bê đê", (SAC) -> "mặt phẳng ét a xê") để giọng đọc không lạc
    DOC_CHU_CAI["bat"] = str(kb.get("mon") or "").upper() == "HINH_HOC" or bool(re.search(r"tam giác|hình chóp|lăng trụ|tứ diện|đường tròn|chứng minh|mặt phẳng", str(kb.get("de_bai") or ""), re.I))
    canh_props = []
    bat_dau = 0
    tam_gem = tempfile.mkdtemp()
    giong_gem = None
    chuan_hoa = []
    for i, c in enumerate(canh):
        so = int(c.get("so") or i + 1)
        loi_thoai = sua_chinh_ta_tieng_viet(str(c.get("loi_thoai") or "").strip())
        c["loi_thoai"] = loi_thoai
        if c.get("tieu_de_canh"):
            c["tieu_de_canh"] = sua_chinh_ta_tieng_viet(c.get("tieu_de_canh"))
        noi_dung_tam = [str(x) for x in (c.get("noi_dung_man_hinh") or []) if str(x).strip()]
        # công thức dài -> nhiều dòng ngắt tại dấu "=" (giữ chữ to, không ngắt bừa); cảnh biến đổi (bien_doi) giữ nguyên từng bước
        if str(c.get("trinh_bay") or "") != "bien_doi":
            noi_dung_tam = [d for x in noi_dung_tam for d in tach_cong_thuc(x)]
        if not loi_thoai:
            sys.exit("Cảnh %d không có lời thoại." % so)
        chuan_hoa.append((i, so, c, loi_thoai, noi_dung_tam, tach_cau(loi_thoai)))

    # phong cách / thương hiệu / nền đọc song song với giọng đọc (độc lập với TTS)
    ex_phu = ThreadPoolExecutor(max_workers=2)
    tuong_lai_pc = ex_phu.submit(doc_phong_cach, args.phong_cach)
    cham("Chuẩn hóa kịch bản")
    from xe_3d import CAR, EVENT
    xe = CAR.search(str(kb.get("de_bai") or ""))
    tach_nhip = {i for i, _, _, van, _, _ in chuan_hoa if xe and EVENT.search(van)}
    gem_doan = {}
    if not args.gia_lap and args.may_giong == "gemini":
        # Mặc định đọc LIỀN MẠCH MỘT LẦN (mot_lan) kết hợp them_nhan_nha_doc() để giọng đọc ĐỒNG NHẤT 100% xuyên suốt các cảnh
        # mà vẫn có nhấn nhá trọng âm tự nhiên (không bị lệch giọng giữa các cảnh).
        if tach_nhip:
            # Đo thời lượng bản đọc từng câu có sự kiện, giữ cùng một giọng cho cả bài.
            ds_doc, chi_muc = [], {}
            for i, _, c, van, _, cau_doc in chuan_hoa:
                indices = []
                for doan in (cau_doc if i in tach_nhip else [van]):
                    indices.append(len(ds_doc))
                    ds_doc.append(dict(c, loi_thoai=doan))
                chi_muc[i] = indices
            wavs = tao_giong_gemini(ds_doc, tam_gem, args)
            if wavs and len(wavs) == len(ds_doc):
                gem_doan = {i: [wavs[j] for j in ids] for i, ids in chi_muc.items() if i in tach_nhip}
                giong_gem = {i: wavs[ids[0]] for i, ids in chi_muc.items()}
        elif (os.environ.get("CACH_DOC_GEMINI") or "mot_lan") != "tung_canh":
            giong_gem = tao_giong_gemini_mot_lan(canh, tam_gem, args)
        else:
            giong_gem = tao_giong_gemini(canh, tam_gem, args)
            if not giong_gem:
                giong_gem = tao_giong_gemini_mot_lan(canh, tam_gem, args)
        if not giong_gem:
            print("Gemini không đọc được cả video -> CẢ video dùng một giọng edge-tts đồng nhất 100% có nhấn nhá (không trộn giọng)")
    if giong_gem is not None and set(giong_gem) != set(range(len(canh))):
        giong_gem = None
    cham("Giọng Gemini TTS")
    am_thanh_kq = {}
    with tempfile.TemporaryDirectory() as tam_chung:
        nhiem_vu_edge = []
        for i, so, c, loi_thoai, noi_dung_tam, cac_doan in chuan_hoa:
            if not (giong_gem and i in giong_gem):
                tam_i = os.path.join(tam_chung, "c_%d" % i)
                os.makedirs(tam_i, exist_ok=True)
                nhiem_vu_edge.append((i, cac_doan, tam_i, str(c.get("loai") or "")))
        edge_tho = asyncio.run(tao_tat_ca_doan_edge(nhiem_vu_edge, args)) if nhiem_vu_edge else {}
        cham("Giọng edge-tts (song song %d)" % SO_EDGE_SONG_SONG)

        def xu_ly_am_canh(muc):
            i, so, c, loi_thoai, noi_dung_tam, cac_doan = muc
            tam_i = os.path.join(tam_chung, "am_%d" % i)
            os.makedirs(tam_i, exist_ok=True)
            ten = "%s_c%d.mp3" % (id_an_toan, so)
            tam_wav = os.path.join(tam_i, "tam_%d.wav" % i)
            dich_mp3 = os.path.join(thu_muc_giong, ten)
            if giong_gem and i in giong_gem and i not in gem_doan:
                # Gemini đọc cả cảnh một lần (ngữ điệu liền mạch); mốc từng câu chia theo số ký tự
                nguon_gem = giong_gem[i]
                if str(nguon_gem).endswith(".gon.wav"):
                    gon = nguon_gem
                else:
                    gon = os.path.join(tam_i, "g.wav")
                    cat_lang(nguon_gem, gon)
                tong = do_thoi_luong(gon)
                ky_tu = [max(1, len(d)) for d in cac_doan]
                do_dai = [tong * k / sum(ky_tu) for k in ky_tu]
                gap_c = 0
                vao_loc = gon
                tu_doan = None
            else:
                cac_tep_tho = gem_doan[i] if i in gem_doan else edge_tho[i]
                cac_tep = []
                tu_doan = []
                for k, tho in enumerate(cac_tep_tho):
                    gon = os.path.join(tam_i, "g%03d.wav" % k)
                    tu_tho = doc_tu_edge(tho) if i not in gem_doan else None
                    if tu_tho:
                        tu_doan.append(cat_theo_tu(tho, gon, tu_tho))
                    else:
                        cat_lang(tho, gon)
                        tu_doan.append(None)
                    cac_tep.append(gon)
                do_dai = [do_thoi_luong(t) for t in cac_tep]
                ghep(cac_tep, tam_wav)
                gap_c = GAP
                vao_loc = tam_wav
            # Chuẩn hóa độ lớn giọng (-15 LUFS) nhưng giữ nguyên dải động tự nhiên (LRA=13, ratio=1.6, attack=25ms)
            # để bảo toàn trọng âm nhấn nhá của giọng đọc (tránh nén bẹp âm lượng làm giọng bị ngang)
            chay(["ffmpeg", "-y", "-loglevel", "error", "-i", vao_loc, "-af",
                  "highpass=f=75,treble=g=1.8:f=3600,acompressor=threshold=-14dB:ratio=1.6:attack=25:release=180,loudnorm=I=-15:TP=-1.2:LRA=13",
                  "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", dich_mp3])
            tong_am = do_thoi_luong(dich_mp3)
            return ten, do_dai, tong_am, gap_c, tu_doan

        with ThreadPoolExecutor(max_workers=min(SO_LUONG_AM, max(1, len(chuan_hoa)))) as ex:
            for item, kq_am in zip(chuan_hoa, ex.map(xu_ly_am_canh, chuan_hoa)):
                am_thanh_kq[item[0]] = kq_am
        cham("Cắt lặng + chuẩn âm (%d luồng)" % SO_LUONG_AM)

    shutil.rmtree(tam_gem, ignore_errors=True)

    for i, so, c, loi_thoai, noi_dung_tam, cac_doan in chuan_hoa:
        ten, do_dai, tong_am, gap, tu_doan = am_thanh_kq[i]
        lead_c, tail_c = nghi_canh(canh, i)
        cau, t = [], lead_c
        tu_canh = []   # v86: mốc THẬT từng từ gốc của lời thoại (giây tính từ đầu cảnh) -> Manim vẽ đúng lúc nói
        du_tu = bool(tu_doan) and all(tu_doan)
        for k, (d, dd) in enumerate(zip(cac_doan, do_dai)):
            doan = chia_phu_de(d)
            if du_tu:
                moc = can_tu_tho(d, tu_doan[k])
                for w, a, b in moc:
                    tu_canh.append({"w": w, "bat": round(t + a, 3), "ket": round(t + b, 3)})
                vt = 0
                for x in doan:
                    n = len(x.split(" "))
                    seg = moc[vt:vt + n] or moc[-1:]
                    vt += n
                    cau.append({"text": hien_phu_de(x), "bat": round(t + seg[0][1], 3), "ket": round(t + seg[-1][2], 3)})
            else:
                tong_ky_tu = float(sum(len(x) for x in doan))
                t_doan = t
                for x in doan:
                    dai_x = dd * len(x) / tong_ky_tu
                    cau.append({"text": hien_phu_de(x), "bat": round(t_doan, 3), "ket": round(t_doan + dai_x, 3)})
                    t_doan += dai_x
            t += dd + gap

        gan_moc_chong_lo(c, cau, tu_canh if du_tu else None)
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
        moc_loi = moc_cong_thuc(c.get("moc_loi"), cau, len(noi_dung), tu_canh)
        moc_ve = moc_buoc_ve(c.get("buoc_ve"), tu_canh) if c.get("buoc_ve") else []
        if moc_loi:
            so_frame = max(so_frame, math.ceil((moc_loi[-1] + 1.5) * FPS))
        quay = quay_canh(kb, so, cau, tu_canh)
        if quay:
            for a in quay["hanhDong"]:
                if a["t"] is not None:
                    a["t"] = round(a["t"], 3)
                    so_frame = max(so_frame, math.ceil((a["t"] + 1.6) * FPS))   # đủ thời gian xem hết hành động cuối
            for a in quay["hanhDong"]:
                if not a["khop"]:
                    print(f"Cảnh {so}: không thấy khi_noi \"{a['khiNoi']}\" trong lời đọc -> hành động '{a['dongTu']}' dùng mốc ước lượng")
        canh_props.append({
            "so": so,
            "loai": str(c.get("loai") or ""),
            "noiDung": noi_dung,
            **({"mocCongThuc": moc_loi} if moc_loi else {}),
            **({"tu": tu_canh, "dongBo": "tu_that"} if tu_canh else {"dongBo": "uoc_luong"}),
            **({"mocVe": moc_ve} if moc_ve else {}),
            **({"quay": quay} if quay else {}),
            **({"netToan": c["net_toan"]} if "net_toan" in c else {}),
            **({"moHinh3D": c["mo_hinh_3d"]} if "mo_hinh_3d" in c else {}),
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

    cham("Mốc phụ đề / công thức / góc máy")
    nhac = chon_nhac(args.public, id_an_toan)
    if nhac == "nhac/nen.wav" and os.environ.get("NHAC_THEO_CANH", "1") != "0":
        for f in os.listdir(os.path.join(args.public, "nhac")):
            if f.startswith("tron_"):
                os.remove(os.path.join(args.public, "nhac", f))
        nhac = tron_nhac_theo_canh(args.public, id_an_toan, canh, canh_props) or nhac
    hook_chu = str(kb.get("hook_chu") or kb.get("hook") or "").strip()
    if not hook_chu and canh:
        hook_chu = str(canh[0].get("tieu_de") or kb.get("tieu_de") or "BÍ QUYẾT GIẢI TOÁN").strip()
    cham("Nhạc nền theo cảnh")
    pc, nen_co_dinh, th = tuong_lai_pc.result()
    ex_phu.shutdown(wait=False)
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
    # GÓI PHONG CÁCH EDIT (Apps Script luân phiên theo quy tắc, ghi vào kb.phong_cach_edit): chỉ đổi phần "trang phục"
    # (nền, chuyển cảnh, kiểu phụ đề, phông công thức) - KHÔNG đổi bố cục/cỡ chữ/vị trí nên không sinh lại lỗi tràn, đè.
    goi = GOI_EDIT.get(str(kb.get("phong_cach_edit") or "").strip())
    if goi:
        if nen_tu_tao and goi.get("nen"):
            nen_tu_tao["kieu"] = goi["nen"][bam % len(goi["nen"])]
        for k in ("lopQuet", "kieuPhuDe", "kieuToan"):
            if k in goi:
                pc[k] = goi[k]
        print("Gói phong cách edit: %s" % kb.get("phong_cach_edit"))
    thuong_hieu, outro = tim_thuong_hieu(args.public, th)
    # v92: tên + logo theo chuyên mục TRƯỚC khi dựng intro / màn kết (trước đây logo tròn "Tư duy Xác suất" cho mọi bài)
    thuong_hieu = logo_theo_chuyen_muc(ten_kenh_theo_chuyen_muc(thuong_hieu, th, kb), args.public, kb)
    bai_hoc = [str(x).strip()[:90] for x in (kb.get("bai_hoc_rut_ra") or []) if str(x).strip()][:3]
    # Tự động chèn màn kết/outro thương hiệu chuyên nghiệp vào cuối video (tóm tắt bài học + kênh + nút Thích / Theo dõi).
    co_man_ket = bool(th.get("coManKet", True))
    # v89: video đã có cảnh bai_hoc (chốt kiến thức) -> màn kết KHÔNG lặp lại 3 gạch đầu dòng, chỉ đáp án + kênh (ngắn hơn, bớt đuôi im lặng)
    if any(re.search(r"bai_hoc|ket_luan|chot", str(c.get("loai") or "").lower()) for c in (kb.get("canh") or [])):
        bai_hoc = []
    outro = chon_man_ket(outro, dict(th, logo=thuong_hieu.get("logo")), bai_hoc) if co_man_ket else None
    if outro:
        outro["batDau"] = bat_dau
        bat_dau += outro["soFrame"]
    intro = tao_intro(pc.get("intro"), thuong_hieu)
    if kb.get("kieu_video") == "DAI_10_PHUT" or str(kb.get("id", "")).upper().endswith("-10P"):
        if not 540 * FPS <= bat_dau <= 660 * FPS:
            raise ValueError(f"Chuyên đề dài {bat_dau / FPS:.1f}s sau khi tạo giọng, cần 540–660s. Hãy sửa kịch bản trước khi dựng.")
    props = {
        "id": id_an_toan,
        "tieuDe": str(kb.get("tieu_de") or kb.get("chu_de") or ""),
        "hook": str(kb.get("hook") or ""),
        "dapAn": str(kb.get("dap_an_cuoi") or kb.get("dap_an") or ""),
        "lop": str(kb.get("lop") or ""),
        "fps": FPS,
        "tongFrame": bat_dau + (intro["lech"] if intro else 0),
        "hookChu": hook_chu,
        "hookKieu": str(kb.get("hook_kieu") or ""),
        "nhanManh": [str(x) for x in (kb.get("nhan_manh") or [])][:5],
        "nhac": nhac,
        "amLuongNhac": float(os.environ.get("AM_LUONG_NHAC") or (0.16 if nhac and (nhac.endswith("nen.wav") or "/tron_" in nhac) else 0.12)),
        "chuDe": str(kb.get("chu_de_ngan") or kb.get("chu_de") or "")[:40],
        "baiHoc": bai_hoc,
        "bia": tao_bia(kb, canh, canh_props),
        # số tập KHÔNG in lúc dựng nữa (kể cả kịch bản cũ còn mang số): số tập đánh lúc đăng, theo số bài đã có trên kênh (dang_video.py)
        "series": None,
        "quangCao": the_san_pham(kb, anh_sp),
        "duKien": [str(x).strip()[:30] for x in (kb.get("du_kien") or []) if str(x).strip()][:4],
        "deBai": de_bai_the,
        "deGoc": str(kb.get("de_bai") or ""),
        "tiepTheo": str(kb.get("video_tiep_theo") or "")[:70],
        "nen": ds_nen[0] if ds_nen else None,
        "dsNen": ds_nen,
        "nenTuTao": nen_tu_tao,
        **({"phongCanh": kb["cau_chuyen"]["phong_canh"]} if not luong_hh and isinstance(kb.get("cau_chuyen"),dict) and kb["cau_chuyen"].get("phong_canh") else {}),
        **({"luong": "hinh_hoc_thuan"} if luong_hh else {"luong": str(kb.get("luong") or "thuc_te_xac_suat")}),
        "thuongHieu": ten_kenh_theo_chuyen_muc(thuong_hieu, th, kb),
        "outro": outro,
        "intro": intro,
        "phongCach": pc,
        "canh": canh_props,
    }
    k4 = khung_4_tang(kb, canh_props, FPS)
    if k4:
        props["boCuc"] = "4tang"
        props["khung4tang"] = k4
    cham("Thương hiệu, bìa, khung 4 tầng")
    if not args.gia_lap:
        print("Giọng đọc: %d cảnh bằng Gemini TTS (%s), %d đoạn bằng edge-tts (%s), %d đoạn bằng Google TTS dự phòng" % (
            THONG_KE_GIONG["gemini"], args.giong_gemini, THONG_KE_GIONG["edge"], args.giong, THONG_KE_GIONG["gtts"]))
    dich = args.props_ra or os.path.join(args.public, "props.json")
    os.makedirs(os.path.dirname(os.path.abspath(dich)), exist_ok=True)
    with open(dich, "w", encoding="utf8") as f:
        json.dump(props, f, ensure_ascii=False, indent=1)
    print("Xong: %d cảnh, %.1f giây -> %s" % (len(canh_props), bat_dau / FPS, dich))
    cham("Ghi props.json")
    in_bang_thoi_gian(time.perf_counter() - t_tong, os.environ.get("THU_MUC_RA") or "out")


if __name__ == "__main__":
    main()
