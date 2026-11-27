#!/usr/bin/env python3
"""Từ điển đọc ký hiệu Toán tiếng Việt tự nhiên cho TTS (CHỈ dùng cho chuỗi đưa vào TTS, không sửa phụ đề hiển thị).

Ánh xạ tự nhiên các ký hiệu hình học, đại số và xác suất hay bị TTS đọc sai:
  - Khoảng cách: d(M, (SBD)) -> "khoảng cách từ điểm M đến mặt phẳng S B D"
  - Phân số chứa căn: \\frac{a\\sqrt{6}}{3}, a√6/3 -> "a căn 6 trên 3"
  - Quan hệ hình học: \\perp -> "vuông góc với", \\parallel -> "song song với",
    \\widehat{SCA} -> "góc S C A", (SC, (ABCD)) -> "góc giữa đường thẳng S C và mặt phẳng A B C D",
    \\triangle ABC -> "tam giác A B C"
  - Đại số / xác suất: C_n^k, A_n^k, P(A|B), \\overline{A}, \\leq, \\geq, \\neq
"""
import re

_MACRON_MAP = {
    "Ā": "A", "Ē": "E", "Ī": "I", "Ō": "O", "Ū": "U",
    "ā": "a", "ē": "e", "ī": "i", "ō": "o", "ū": "u",
}


def tach_ten_diem(ten):
    """Tách chuỗi tên điểm / đường / mặt phẳng thành từng ký tự đọc rõ cho TTS.
    VD: 'SBD' -> 'S B D', 'ABCD' -> 'A B C D', "A'B'C'" -> 'A phẩy B phẩy C phẩy', 'S.ABCD' -> 'S A B C D'.
    """
    s = str(ten or "").strip()
    if not s:
        return ""
    s = s.replace(".", " ").replace("′", "'").replace("’", "'")
    s = re.sub(r"\{([^{}]*)\}", r"\1", s)
    tokens = []
    for m in re.finditer(r"([A-Za-z])(?:_?(\d+))?('*)", s):
        chu, chi_so, phay = m.group(1), m.group(2), m.group(3)
        muc = chu
        if chi_so:
            muc += " " + chi_so
        if phay:
            muc += " phẩy" * len(phay)
        tokens.append(muc)
    return " ".join(tokens) if tokens else re.sub(r"\s+", " ", s).strip()


def _doc_bieu_thuc_ngan(expr):
    """Đọc ngắn gọn tử/mẫu trong biểu thức căn và phân số chứa căn (VD: a\\sqrt{6} -> 'a căn 6')."""
    s = str(expr or "").strip()
    if not s:
        return ""
    s = s.replace("$", "").replace("{,}", ",")
    s = re.sub(r"\\(?:left|right|displaystyle|mathrm|text|textbf|textit)\s*", " ", s)
    # Căn bậc ba / bậc n
    s = re.sub(r"\\sqrt\s*\[\s*3\s*\]\s*\{([^{}]+)\}", lambda m: " căn bậc ba của %s " % _doc_bieu_thuc_ngan(m.group(1)), s)
    s = re.sub(r"\\sqrt\s*\[\s*([^\]]+)\s*\]\s*\{([^{}]+)\}", lambda m: " căn bậc %s của %s " % (m.group(1).strip(), _doc_bieu_thuc_ngan(m.group(2))), s)
    # Căn bậc hai LaTeX & Unicode
    s = re.sub(r"\\sqrt\s*\{([^{}]+)\}", lambda m: " căn %s " % _doc_bieu_thuc_ngan(m.group(1)), s)
    s = re.sub(r"√\s*\(([^()]+)\)", lambda m: " căn %s " % _doc_bieu_thuc_ngan(m.group(1)), s)
    s = re.sub(r"√\s*(\d+(?:[.,]\d+)?|[a-zA-Z])", r" căn \1 ", s)
    # Phép toán & hằng số trong biểu thức ngắn
    s = re.sub(r"\\(?:cdot|times)\b|[·×]", " nhân ", s)
    s = re.sub(r"\\pi\b|π", " pi ", s)
    s = re.sub(r"\^\s*\{?\s*2\s*\}?|²", " bình phương ", s)
    s = re.sub(r"\^\s*\{?\s*3\s*\}?|³", " lập phương ", s)
    s = re.sub(r"([a-zA-Z0-9])\s*\+\s*([a-zA-Z0-9])", r"\1 cộng \2", s)
    s = re.sub(r"([a-zA-Z0-9])\s*[-−]\s*([a-zA-Z0-9])", r"\1 trừ \2", s)
    # Hệ số gắn biến trước chữ căn (VD: 2a căn 3 -> 2 a căn 3; giữ a căn 6 gọn)
    s = re.sub(r"\b(\d+)([a-zA-Z])\b", r"\1 \2", s)
    s = re.sub(r"[{}]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def _bien_co_tu_nhien(raw):
    x = str(raw or "").strip()
    m = re.fullmatch(r"\\(?:overline|bar)\s*\{?\s*([A-Za-z])\s*\}?|([ĀĒĪŌŪāēīōū])|([A-Za-z])\u0304", x)
    if m:
        c = m.group(1) or _MACRON_MAP.get(m.group(2) or "", "") or m.group(3)
        return "biến cố đối %s ngang" % c, True
    x = re.sub(r"\\cap\b|∩", " giao ", x)
    x = re.sub(r"\\cup\b|∪", " hợp ", x)
    return re.sub(r"\s+", " ", x).strip(), False


def _thay_phan_so_chua_can(s):
    """Đổi phân số chứa căn (LaTeX \\frac/\\dfrac/\\tfrac và dạng inline a√6/3, √3/2, 2a/√11) sang '<tử> trên <mẫu>'."""
    # 1) LaTeX \frac / \dfrac / \tfrac có chứa \sqrt hoặc √ ở tử hoặc mẫu
    re_frac = re.compile(r"\\[dt]?frac\s*\{((?:[^{}]|\{[^{}]*\})+)\}\s*\{((?:[^{}]|\{[^{}]*\})+)\}")

    def _sub_frac(m):
        tu, mau = m.group(1), m.group(2)
        if ("\\sqrt" in tu or "√" in tu or "\\sqrt" in mau or "√" in mau):
            return " %s trên %s " % (_doc_bieu_thuc_ngan(tu), _doc_bieu_thuc_ngan(mau))
        return m.group(0)

    for _ in range(3):
        s_moi = re_frac.sub(_sub_frac, s)
        if s_moi == s:
            break
        s = s_moi

    # 2) Dạng inline có căn ở tử: a√6/3, 2a√3/3, √6/3, a\sqrt{6}/3, a√(6)/3
    re_inline_tu = re.compile(
        r"(?<![\wÀ-ỹ\\])"
        r"((?:\d*\s*[a-zA-Z]?\s*(?:√\s*(?:\([^()]+\)|\d+|[a-zA-Z])|\\sqrt\s*\{[^{}]+\})))"
        r"\s*/\s*"
        r"(\d+|√\s*(?:\([^()]+\)|\d+|[a-zA-Z])|\\sqrt\s*\{[^{}]+\}|[a-zA-Z])"
        r"(?![\wÀ-ỹ])"
    )
    s = re_inline_tu.sub(lambda m: " %s trên %s " % (_doc_bieu_thuc_ngan(m.group(1)), _doc_bieu_thuc_ngan(m.group(2))), s)

    # 3) Dạng inline có căn ở mẫu: 2a/√11, a/√2, 1/\sqrt{3}
    re_inline_mau = re.compile(
        r"(?<![\wÀ-ỹ\\])"
        r"(\d+[a-zA-Z]?|[a-zA-Z])"
        r"\s*/\s*"
        r"(√\s*(?:\([^()]+\)|\d+|[a-zA-Z])|\\sqrt\s*\{[^{}]+\})"
        r"(?![\wÀ-ỹ])"
    )
    s = re_inline_mau.sub(lambda m: " %s trên %s " % (_doc_bieu_thuc_ngan(m.group(1)), _doc_bieu_thuc_ngan(m.group(2))), s)
    return s


def doc_toan_tu_nhien(text):
    """Chuyển ký hiệu Toán phổ biến (LaTeX & Unicode) sang tiếng Việt tự nhiên cho TTS.

    Không đụng tới biểu thức hàm số dạng V(x), V'(x), S'(r), V_max hay phân số nguyên 40/120
    để tương thích 100% với các bộ lọc hàm số (v95) và xác suất (v96) trong chuanbi.py.
    """
    s = str(text or "")
    if not s.strip():
        return ""

    # Gỡ delimiter lệnh co giãn ngoặc vô nghĩa với TTS
    s = re.sub(r"\\(?:left|right|displaystyle)\b", "", s)
    s = s.replace("{,}", ",")

    # 1. Khoảng cách: d(M, (SBD)), d(M, SB), d((SAB), (SCD)), d(AB, SC)
    # 1a. Điểm đến mặt phẳng: d(M, (SBD)) -> "khoảng cách từ điểm M đến mặt phẳng S B D"
    s = re.sub(
        r"(?<![A-Za-zÀ-ỹ])d\s*\(\s*([A-Z](?:_?\{?\d+\}?|'*))\s*[,;]\s*\(\s*([A-Z][A-Za-z0-9'’′_.{}]{1,10})\s*\)\s*\)",
        lambda m: " khoảng cách từ điểm %s đến mặt phẳng %s " % (tach_ten_diem(m.group(1)), tach_ten_diem(m.group(2))),
        s,
    )
    # 1b. Hai mặt phẳng: d((SAB), (SCD))
    s = re.sub(
        r"(?<![A-Za-zÀ-ỹ])d\s*\(\s*\(\s*([A-Z][A-Za-z0-9'’′_.{}]{1,10})\s*\)\s*[,;]\s*\(\s*([A-Z][A-Za-z0-9'’′_.{}]{1,10})\s*\)\s*\)",
        lambda m: " khoảng cách giữa mặt phẳng %s và mặt phẳng %s " % (tach_ten_diem(m.group(1)), tach_ten_diem(m.group(2))),
        s,
    )
    # 1c. Điểm đến đường thẳng: d(M, SB) hoặc d(M, \Delta)
    s = re.sub(
        r"(?<![A-Za-zÀ-ỹ])d\s*\(\s*([A-Z](?:_?\{?\d+\}?|'*))\s*[,;]\s*([A-Z]'*[A-Z]'*)\s*\)",
        lambda m: " khoảng cách từ điểm %s đến đường thẳng %s " % (tach_ten_diem(m.group(1)), tach_ten_diem(m.group(2))),
        s,
    )
    # 1d. Hai đường thẳng chéo nhau: d(AB, SC)
    s = re.sub(
        r"(?<![A-Za-zÀ-ỹ])d\s*\(\s*([A-Z]'*[A-Z]'*)\s*[,;]\s*([A-Z]'*[A-Z]'*)\s*\)",
        lambda m: " khoảng cách giữa hai đường thẳng %s và %s " % (tach_ten_diem(m.group(1)), tach_ten_diem(m.group(2))),
        s,
    )

    # 2. Góc giữa đường thẳng & mặt phẳng / hai mặt phẳng / hai đường thẳng
    # 2a. (SC, (ABCD)) -> "góc giữa đường thẳng S C và mặt phẳng A B C D"
    s = re.sub(
        r"(?:góc\s+(?:giữa\s+)?)?\(\s*([A-Z]'*[A-Z]'*)\s*[,;]\s*\(\s*([A-Z][A-Za-z0-9'’′_.{}]{2,10})\s*\)\s*\)",
        lambda m: " góc giữa đường thẳng %s và mặt phẳng %s " % (tach_ten_diem(m.group(1)), tach_ten_diem(m.group(2))),
        s,
        flags=re.I,
    )
    # 2b. ((ABCD), SC) -> "góc giữa mặt phẳng A B C D và đường thẳng S C"
    s = re.sub(
        r"(?:góc\s+(?:giữa\s+)?)?\(\s*\(\s*([A-Z][A-Za-z0-9'’′_.{}]{2,10})\s*\)\s*[,;]\s*([A-Z]'*[A-Z]'*)\s*\)",
        lambda m: " góc giữa mặt phẳng %s và đường thẳng %s " % (tach_ten_diem(m.group(1)), tach_ten_diem(m.group(2))),
        s,
        flags=re.I,
    )
    # 2c. ((SAB), (ABCD)) -> "góc giữa mặt phẳng S A B và mặt phẳng A B C D"
    s = re.sub(
        r"(?:góc\s+(?:giữa\s+)?)?\(\s*\(\s*([A-Z][A-Za-z0-9'’′_.{}]{2,10})\s*\)\s*[,;]\s*\(\s*([A-Z][A-Za-z0-9'’′_.{}]{2,10})\s*\)\s*\)",
        lambda m: " góc giữa mặt phẳng %s và mặt phẳng %s " % (tach_ten_diem(m.group(1)), tach_ten_diem(m.group(2))),
        s,
        flags=re.I,
    )
    # 2d. (SA, BC) -> "góc giữa đường thẳng S A và đường thẳng B C"
    s = re.sub(
        r"(?:góc\s+(?:giữa\s+)?)?(?<![A-Za-zÀ-ỹ0-9_])\(\s*([A-Z]'*[A-Z]'*)\s*[,;]\s*([A-Z]'*[A-Z]'*)\s*\)",
        lambda m: " góc giữa đường thẳng %s và đường thẳng %s " % (tach_ten_diem(m.group(1)), tach_ten_diem(m.group(2))),
        s,
        flags=re.I,
    )

    # 3. Góc 3 đỉnh & tam giác: \widehat{SCA}, \angle ABC, ∠SCA, \triangle ABC, △ABC
    s = re.sub(
        r"(?:góc\s+)?(?:\\(?:widehat|hat|angle)\s*\{([A-Za-z0-9'’′_\s]+)\}|(?:\\angle\b|∠)\s*([A-Z]'*[A-Z]'*[A-Z]'*|[A-Z]'*))",
        lambda m: " góc %s " % tach_ten_diem(m.group(1) or m.group(2)),
        s,
        flags=re.I,
    )
    s = re.sub(
        r"(?:tam\s+giác\s+)?(?:\\triangle\b|\\Delta\b|△|Δ)\s*\{?\s*([A-Z]'*[A-Z]'*[A-Z]'*)\s*\}?",
        lambda m: " tam giác %s " % tach_ten_diem(m.group(1)),
        s,
        flags=re.I,
    )

    # 4. Phân số chứa căn & căn đơn lẻ
    s = _thay_phan_so_chua_can(s)
    s = re.sub(r"\\sqrt\s*\[\s*3\s*\]\s*\{([^{}]+)\}", lambda m: " căn bậc ba của %s " % _doc_bieu_thuc_ngan(m.group(1)), s)
    s = re.sub(r"\\sqrt\s*\{([^{}]+)\}", lambda m: " căn %s " % _doc_bieu_thuc_ngan(m.group(1)), s)
    s = re.sub(r"([a-zA-Z0-9])\s*√\s*\(([^()]+)\)", lambda m: "%s căn %s " % (m.group(1), _doc_bieu_thuc_ngan(m.group(2))), s)
    s = re.sub(r"([a-zA-Z0-9])\s*√\s*(\d+(?:[.,]\d+)?|[a-zA-Z])", r"\1 căn \2 ", s)
    s = re.sub(r"√\s*\(([^()]+)\)", lambda m: " căn %s " % _doc_bieu_thuc_ngan(m.group(1)), s)
    s = re.sub(r"√\s*(\d+(?:[.,]\d+)?|[a-zA-Z])", r" căn \1 ", s)

    # 5. Tổ hợp, chỉnh hợp, xác suất & biến cố đối
    s = re.sub(r"\\[dt]?binom\s*\{\s*(\w+)\s*\}\s*\{\s*(\w+)\s*\}", r" tổ hợp chập \2 của \1 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])C\s*_\s*\{?\s*(\w+?)\s*\}?\s*\^\s*\{?\s*(\w+)\s*\}?(?![\w])", r" tổ hợp chập \2 của \1 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])C\s*\^\s*\{?\s*(\w+?)\s*\}?\s*_\s*\{?\s*(\w+)\s*\}?(?![\w])", r" tổ hợp chập \1 của \2 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])C\s*\(\s*(\d+|[nk])\s*[,;]\s*(\d+|[nk])\s*\)", r" tổ hợp chập \2 của \1 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])A\s*_\s*\{?\s*(\w+?)\s*\}?\s*\^\s*\{?\s*(\w+)\s*\}?(?![\w])", r" chỉnh hợp chập \2 của \1 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])A\s*\^\s*\{?\s*(\w+?)\s*\}?\s*_\s*\{?\s*(\w+)\s*\}?(?![\w])", r" chỉnh hợp chập \1 của \2 ", s)
    s = re.sub(r"(?<![A-Za-zÀ-ỹ])n\s*\(\s*(?:\\Omega|Ω|Omega)\s*\)|\|\s*(?:\\Omega|Ω)\s*\|", " số phần tử không gian mẫu ", s)

    bc = r"(?:\\(?:overline|bar)\s*\{?\s*[A-Za-z]\s*\}?|[ĀĒĪŌŪ]|[A-Z]\u0304?)(?:\s*(?:\\cap|∩|\\cup|∪)\s*(?:\\(?:overline|bar)\s*\{?\s*[A-Za-z]\s*\}?|[A-Z]))?"

    def _sub_p(m):
        a, doi = _bien_co_tu_nhien(m.group(1))
        if m.group(2):
            b, _ = _bien_co_tu_nhien(m.group(2))
            return " xác suất của %s với điều kiện %s " % (a.replace("biến cố đối ", ""), b.replace("biến cố đối ", ""))
        return " xác suất %s " % (a if doi else "của " + a)

    s = re.sub(r"(?<![A-Za-zÀ-ỹ])P\s*\(\s*(" + bc + r")\s*(?:(?:\\mid|\||∣)\s*(" + bc + r"))?\s*\)", _sub_p, s)
    # Biến cố đối đứng riêng: \overline{A}, \bar{A}, Ā -> "biến cố đối A ngang" (tránh lặp "biến cố đối biến cố đối")
    s = re.sub(
        r"(?:biến\s+cố\s+đối\s+)?(?:\\(?:overline|bar)\s*\{?\s*([A-Za-z])\s*\}?|([ĀĒĪŌŪ])|([A-Z])\u0304)",
        lambda m: " biến cố đối %s ngang " % (m.group(1) or _MACRON_MAP.get(m.group(2) or "", "") or m.group(3)),
        s,
        flags=re.I,
    )

    # 6. Quan hệ hình học & so sánh đại số
    for pat, rep in (
        (r"\\perp\b|⊥", " vuông góc với "),
        (r"\\parallel\b|∥|//", " song song với "),
        (r"\\(?:leq|le)\b|≤", " nhỏ hơn hoặc bằng "),
        (r"\\(?:geq|ge)\b|≥", " lớn hơn hoặc bằng "),
        (r"\\(?:neq|ne)\b|≠", " khác "),
        (r"\\approx\b|≈", " xấp xỉ "),
        (r"\\(?:sim|backsim)\b|∼", " đồng dạng với "),
        (r"\\(?:Rightarrow|implies)\b|⇒", ", suy ra "),
        (r"\\(?:Leftrightarrow|iff)\b|⇔", ", tương đương "),
        (r"\\in\b|∈", " thuộc "),
        (r"\\notin\b|∉", " không thuộc "),
        (r"\\cap\b|∩", " giao "),
        (r"\\cup\b|∪", " hợp "),
    ):
        s = re.sub(pat, rep, s)

    # 7. Mặt phẳng đứng riêng (SBD), (ABCD) (chỉ 3-4 chữ hoa tên đỉnh hình học)
    s = re.sub(
        r"(?:mặt\s+phẳng\s+)?\(\s*([A-Z]'*[A-Z]'*[A-Z]'*(?:[A-Z]'*)?)\s*\)",
        lambda m: " mặt phẳng %s " % tach_ten_diem(m.group(1)),
        s,
        flags=re.I,
    )

    # 8. Ký hiệu độ: 45^\circ, 45° -> "45 độ"
    s = re.sub(r"(\d+(?:[.,]\d+)?)\s*(?:\^\s*\{?\s*\\circ\s*\}?|°)", r"\1 độ", s)

    # Dọn khoảng trắng thừa & chống lặp cụm
    s = re.sub(r"(?i)\bmặt phẳng\s+mặt phẳng\b", "mặt phẳng", s)
    s = re.sub(r"(?i)\bbiến cố đối\s+biến cố đối\b", "biến cố đối", s)
    s = re.sub(r"(?i)\bgóc\s+góc\b", "góc", s)
    s = re.sub(r"(?i)\btam giác\s+tam giác\b", "tam giác", s)
    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


__all__ = ["doc_toan_tu_nhien", "tach_ten_diem"]
