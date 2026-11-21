"""Khớp tên tiếng Việt (thực thể / bối cảnh / màu) với danh mục mẫu."""

import json
import re
import unicodedata
from pathlib import Path

DANH_MUC = json.loads((Path(__file__).with_name("danh_muc.json")).read_text(encoding="utf8"))


def chuan(text):
    return " ".join(unicodedata.normalize("NFC", str(text or "")).casefold().split())


def bo_dau(text):
    s = unicodedata.normalize("NFD", chuan(text).replace("đ", "d"))
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def co_cum(cum, van_ban):
    """Cụm từ xuất hiện trọn từ trong văn bản (đã chuẩn hóa)."""
    return re.search(r"(?<![\w])" + re.escape(cum) + r"(?![\w])", van_ban) is not None


def _tot_nhat(van_ban, bang):
    """Chọn khóa có tên gọi dài nhất xuất hiện trọn từ trong van_ban."""
    best, best_len = None, 0
    for key, names in bang.items():
        for n in names:
            n = chuan(n)
            if len(n) > best_len and co_cum(n, van_ban):
                best, best_len = key, len(n)
    return best


LOAI_TU = r"(?:\d+|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mấy|các|những|mỗi|cái|chiếc|con|quả|trái|viên|hòn|tấm|lá|ngôi|căn|cây|bộ|đôi|cặp)\s+"


def cac_dau_cum(text):
    """Cụm gốc rồi lần lượt bỏ số đếm / loại từ đứng đầu: '4 chiếc ô tô màu đỏ' -> ..., 'ô tô màu đỏ'.
    Thử cụm gốc trước để 'cây cam' vẫn là cây (không bị bỏ 'cây' thành quả cam)."""
    t = chuan(text)
    out = [t] if t else []
    while True:
        m = re.match(LOAI_TU, t)
        if not m or len(t) == m.end():
            return out
        t = t[m.end():]
        out.append(t)


def _dau_cum(van_ban, bang):
    """Khóa có tên gọi dài nhất khớp ĐẦU cụm (danh từ chính), không khớp bổ ngữ phía sau
    ('cái nêm chặn bánh xe' không thành xe; 'cây cam' là cây, không phải quả cam)."""
    best, best_len = None, 0
    for key, names in bang.items():
        for n in names:
            if len(n) > best_len and (van_ban == n or van_ban.startswith(n + " ")):
                best, best_len = key, len(n)
    return best


def khop_vat(the):
    """Thực thể -> id mẫu thư viện, hoặc None nếu chưa có mẫu phù hợp."""
    vat = DANH_MUC["vat"]
    mau_tv = the.get("mau_tv")
    if mau_tv in vat:
        return nang_mau(mau_tv, the)
    bang = {k: [chuan(n) for n in v["ten"]] + [k.replace("_", " ")] for k, v in vat.items()}
    khong_dau = {k: [bo_dau(n) for n in v] for k, v in bang.items()}
    for nguon in (the.get("ten"), the.get("tu_de")):
        for ten in cac_dau_cum(nguon):
            key = _dau_cum(ten, bang) or _dau_cum(bo_dau(ten), khong_dau)
            if key:
                return nang_mau(key, the)
    return None


KIN = re.compile(r"\b(kín|có nắp|nắp đậy|đậy nắp|hóa chất|công nghiệp|xăng|dầu|khí đốt|gas)\b")
KHONG_NAP = re.compile(r"\b(không nắp|không có nắp|hở nắp|mở nắp|hộp hở)\b")


def nang_mau(key, the):
    """Hình dạng theo tính từ của đề, không chỉ theo danh từ chính: 'bồn chứa hình trụ kín' phải có nắp (bon_kin),
    'hộp không nắp' phải hở miệng (hop_khong_nap) -- trước đây cả hai rơi về be_tru (hở, có nước) / hop (khối đặc)."""
    van = " ".join(chuan(the.get(k)) for k in ("ten", "tu_de", "mo_ta"))
    if key in ("be_tru", "bon_vom") and KIN.search(van) and not re.search(r"\bhở\b|không nắp", van):
        return "bon_kin" if key == "be_tru" else key
    if key == "hop" and KHONG_NAP.search(van):
        return "hop_khong_nap"
    if key in ("the", "hop") and re.search(r"tấm (bìa|các-tông|carton|tôn|nhôm)|miếng bìa", van):
        return "tam_bia"
    return key


def mau_theo_lop(lop):
    return DANH_MUC["mac_dinh_theo_lop"].get(lop)


def khop_moi_truong(*van_ban, ngoai_troi=None):
    bang = {k: v["ten"] for k, v in DANH_MUC["moi_truong"].items()}
    for t in van_ban:
        key = _tot_nhat(chuan(t), bang)
        if key:
            return key
    if ngoai_troi is True:
        return "ngoai_troi"
    if ngoai_troi is False:
        return "phong"
    return None


def khop_mau_sac(text):
    """Tên màu tiếng Việt -> mã màu danh mục (do, xanh_duong...)."""
    t = chuan(text)
    if t in DANH_MUC["mau_sac"] or re.fullmatch(r"#[0-9a-f]{6}", t):
        return t
    return _tot_nhat(t, DANH_MUC["mau_sac"])
