"""v99.2 — Nội dung bền vững (Evergreen): gỡ năm sinh / khóa học / năm thi khỏi chữ đăng bài.

Bản Python đôi của KiemTraHinh.gs (veSinhNamSinh_ / coNamSinh_ / veSinhMetaDang_) - test so khớp ở test_v99_2_gs.cjs
và test_v99_2.py (cùng bộ mẫu). dang_video.py gọi `ve_sinh_meta` trước khi đăng (phòng metadata cũ / Gemini tự bịa).
  "2k9 ơi" -> "Bạn ơi" | "Học sinh 2009" -> "Học sinh lớp N" | "#2k8" -> "#toanhoc" | "THPT 2027" -> "THPT" | "#thpt2027" -> "#thpt"
"""
import re

_NAM_SINH = r"(?:0?[5-9]|1[0-5])"
RE_NAM_SINH = re.compile(
    r"2k" + _NAM_SINH + r"(?![0-9])|(?:học sinh|sĩ tử|teen|team|khóa|khoá|thế hệ)\s+20(?:0[5-9]|1[0-5])(?![0-9])|#20(?:0[5-9]|1[0-5])(?![0-9])|"
    r"(?:thpt|kỳ thi|kì thi|đề thi|thi vào 10|tốt nghiệp)(?:\s+quốc gia)?\s+(?:năm\s+)?20(?:2[5-9]|3[0-9])(?![0-9])|#[a-z]*20(?:2[5-9]|3[0-9])(?![0-9])",
    re.I)


def co_nam_sinh(s):
    return bool(RE_NAM_SINH.search(str(s or "")))


def nhan_lop(lop):
    l = re.sub(r"\D", "", str(lop or ""))
    return "lớp " + l if l in ("8", "9", "10", "11", "12") else ""


def ve_sinh_nam_sinh(s, lop=""):
    if s is None:
        return s
    t, nl = str(s), nhan_lop(lop)
    if not co_nam_sinh(t):
        return t
    t = re.sub(r"#2k" + _NAM_SINH + r"(?![0-9A-Za-z])", "#toanhoc", t, flags=re.I)
    t = re.sub(r"#20(?:0[5-9]|1[0-5])(?![0-9])", "#toanhoc", t)
    t = re.sub(r"#([a-z]*?)20(?:2[5-9]|3[0-9])(?![0-9])", lambda m: "#" + m.group(1) if m.group(1) else "#toanhoc", t, flags=re.I)
    t = re.sub(r"(học sinh|sĩ tử|teen)\s+(?:2k" + _NAM_SINH + r"|20(?:0[5-9]|1[0-5]))(?![0-9])", lambda m: m.group(1) + (" " + nl if nl else ""), t, flags=re.I)
    t = re.sub(r"(?:team|khóa|khoá|thế hệ)\s+(?:2k" + _NAM_SINH + r"|20(?:0[5-9]|1[0-5]))(?![0-9])", "các bạn " + nl if nl else "các bạn", t, flags=re.I)
    t = re.sub(r"((?:THPT|kỳ thi|kì thi|đề thi|thi vào 10|tốt nghiệp)(?:\s+quốc gia)?)\s+(?:năm\s+)?20(?:2[5-9]|3[0-9])(?![0-9])", r"\1", t, flags=re.I)
    t = re.sub(r"(^|[^0-9A-Za-zÀ-ỹ])(các\s+)?2k" + _NAM_SINH + r"(?![0-9A-Za-z])", lambda m: m.group(1) + ("các bạn" if m.group(2) else "bạn"), t, flags=re.I)
    t = re.sub(r"(^|[.!?]\s+)(các bạn|bạn)(?=[\s,!?.])", lambda m: m.group(1) + m.group(2)[0].upper() + m.group(2)[1:], t)
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r"\s+([,.!?])", r"\1", t)
    da = set()

    def bo_trung(m):
        k = m.group(2).lower()
        if k in da:
            return ""
        da.add(k)
        return m.group(0)
    return re.sub(r"(^|\s)#([0-9A-Za-zÀ-ỹ_]+)", bo_trung, t)


KHOA_META = ("tieu_de", "yt_tieu_de", "tt_tieu_de", "mo_ta", "yt_dau", "fb_dau", "yt_mo_ta", "fb_mo_ta")


def ve_sinh_meta(meta, lop=""):
    if not isinstance(meta, dict):
        return meta
    lop = lop or meta.get("lop") or ""
    for k in KHOA_META:
        if isinstance(meta.get(k), str):
            meta[k] = ve_sinh_nam_sinh(meta[k], lop)
    if isinstance(meta.get("the"), list):
        ra, da = [], set()
        for t in meta["the"]:
            x = str(t or "").lstrip("#")
            if re.fullmatch(r"2k\d{1,2}", x, re.I) or re.fullmatch(r"20(?:0[5-9]|1[0-5])", x):
                x = "toanhoc"
            elif co_nam_sinh("#" + x):
                x = re.sub(r"20(?:2[5-9]|3[0-9])$", "", x) or "toanhoc"
            if x and x not in da:
                da.add(x)
                ra.append(x)
        meta["the"] = ra
    return meta
