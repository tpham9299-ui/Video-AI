#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phiên 2/3 — Bảng đối chiếu Giọng đọc ↔ Phụ đề ↔ Mốc hình (0 API, chỉ đọc kịch bản + props --gia-lap).

    python -X utf8 scripts/bang_doi_chieu_tts.py mau/v99_2/kien_bo_hop.json out/x/props.json [... cặp kb props] [--md out/bang.md]

Mỗi câu lời thoại: | Lời gốc | Bản đọc TTS (chuan_hoa_doc) | Phụ đề hiển thị (props.canh[].cau) | Thời lượng & mốc chuyển hình |
kèm kiểm tự động (trả mã thoát 1 khi có lỗi):
  TTS_KY_HIEU  — bản đọc còn ký hiệu/mã TeX bộ đọc không phát âm được (\\ { } ^ _ $ √ ² π ≤ ...)
  TTS_LAP      — hai từ liền nhau trùng (đọc lặp "bằng bằng")
  PD_TEX       — phụ đề dính mã TeX thô
  PD_DAU_CAU   — phụ đề có dấu câu thừa / khoảng trắng trước dấu câu
  T2_DUNG      — khoảng không đổi hình Tầng 2 > 4 s (ước lượng từ mọi mốc t trong khung4tang + đầu cảnh)
  LO_DAP_AN    — ô ghim / thẻ hiện kết quả chốt trước moc_cong_bo
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chuanbi  # noqa: E402

RE_TTS_KY_HIEU = re.compile(r"[\\{}^_$√²³π≤≥≠∈∩∪⊥∥∠△Δ·×÷]|\bfrac\b|\bsqrt\b|\btext\b")
RE_PD_TEX = re.compile(r"\\[A-Za-z]+|[{}$]|\^\{|_\{")
RE_PD_DAU = re.compile(r"\s[,.!?;:]|[,;:]{2,}|\.\.(?!\.)|,\s*\.|[!?]\s*[.,]|,\s*[=<>≤≥]\s")


def _lap_tu(s):
    w = re.findall(r"[\wÀ-ỹ'-]+", s.lower())
    return [a for a, b in zip(w, w[1:]) if a == b and not a.isdigit() and a not in ("từng", "dần", "xa", "nhau")]


def _moc_t(o, ra):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("t", "bat", "tBat", "tHien") and isinstance(v, (int, float)):
                ra.append(float(v))
            else:
                _moc_t(v, ra)
    elif isinstance(o, list):
        for v in o:
            _moc_t(v, ra)


def kiem_t2(props):
    """Khoảng T2 không đổi hình dài nhất trong vùng giải [0, tChot] — dùng ĐÚNG moc_doi_hinh (Python) + nhipT2
    như Remotion `mocDoiHinhV99`. Luồng Hình học (KhungHinhHoc, không có props.khung4tang) do lớp Manim tự dựng
    theo mốc lời ở BP3 -> trả None (Mắt thần 3×3 kiểm `hinh_dung_im` trên MP4)."""
    k4 = props.get("khung4tang") or {}
    if not k4.get("buoc"):
        return None
    import khung4tang.moc_thoi_gian as mtg
    moc = mtg.moc_doi_hinh(k4) + [float(x) for x in (k4.get("nhipT2") or []) if isinstance(x, (int, float))]
    het = float(k4.get("tChot") or (k4.get("tongFrame") or 0) / (k4.get("fps") or 30))
    moc = sorted(set([0.0, het] + [x for x in moc if 0 <= x <= het]))
    return max((b - a for a, b in zip(moc, moc[1:])), default=0.0)


def kiem_lo_dap_an(props):
    k4 = props.get("khung4tang") or {}
    t_cb = k4.get("tCongBo")
    if t_cb is None:
        return []
    loi = []
    dap = re.sub(r"\s+", "", str(props.get("dapAn") or ""))
    for g in k4.get("deGhim") or []:
        doi = g.get("doi") or {}
        if doi and float(doi.get("t") or 0) + 1e-6 < float(t_cb):
            loi.append("ô ghim %s đổi đáp số lúc %.2fs < tCongBo %.2fs" % (g.get("id"), doi.get("t"), t_cb))
    for b in k4.get("buoc") or []:
        for th in b.get("the") or []:
            nd = re.sub(r"\s+", "", str(th.get("noi_dung") or th.get("tex") or ""))
            if dap and len(dap) >= 3 and dap in nd and float(th.get("t") or 0) + 1e-6 < float(t_cb) - 0.05:
                loi.append("thẻ '%s' lộ đáp số lúc %.2fs" % (nd[:30], th.get("t")))
    return loi


def bang(kb_duong, props_duong):
    kb = json.load(open(kb_duong, encoding="utf-8"))
    props = json.load(open(props_duong, encoding="utf-8"))
    chuanbi.DOC_CHU_CAI["bat"] = str(kb.get("mon") or "").upper() == "HINH_HOC" or bool(re.search(
        r"tam giác|hình chóp|lăng trụ|tứ diện|đường tròn|chứng minh|mặt phẳng", str(kb.get("de_bai") or ""), re.I))
    fps = props.get("fps") or 30
    canh_p = {c.get("so"): c for c in props.get("canh") or []}
    dong, loi = [], []
    for c in kb.get("canh") or []:
        pc = canh_p.get(c.get("so")) or {}
        pd = [x.get("text", "") for x in pc.get("cau") or []]
        bat = (pc.get("batDau") or 0) / fps
        dai = (pc.get("soFrame") or 0) / fps
        cau = chuanbi.tach_cau(c.get("loi_thoai") or "")
        doc_ds = [chuanbi.chuan_hoa_doc(cg) for cg in cau]
        moc = "c%s %s %.2f→%.2fs (%.1fs)" % (c.get("so"), c.get("loai"), bat, bat + dai, dai)
        dong.append((" ".join(cau), " ".join(doc_ds), " ⏐ ".join(pd), moc))
        for doc in doc_ds:
            for m in set(RE_TTS_KY_HIEU.findall(doc)):
                loi.append("TTS_KY_HIEU c%s: '%s' trong \"%s\"" % (c.get("so"), m, doc))
            for w in _lap_tu(doc):
                loi.append("TTS_LAP c%s: '%s %s' trong \"%s\"" % (c.get("so"), w, w, doc))
        for h in pd:
            if RE_PD_TEX.search(h):
                loi.append("PD_TEX c%s: \"%s\"" % (c.get("so"), h))
            if RE_PD_DAU.search(h):
                loi.append("PD_DAU_CAU c%s: \"%s\"" % (c.get("so"), h))
    ho = kiem_t2(props)
    if ho is not None and ho > 4.0001:
        loi.append("T2_DUNG: khoảng không đổi hình dài nhất %.2f s > 4 s" % ho)
    loi += ["LO_DAP_AN: " + x for x in kiem_lo_dap_an(props)]
    k4 = props.get("khung4tang") or {}
    tom = "tổng %.1fs | tCongBo %s | T2 tĩnh dài nhất %s" % ((props.get("tongFrame") or 0) / fps, k4.get("tCongBo"),
                                                        "%.2fs" % ho if ho is not None else "— (Manim theo mốc lời, Mắt thần kiểm)")
    return dong, loi, tom


def _o(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def main():
    ds = [a for a in sys.argv[1:] if not a.startswith("--")]
    md_ra = sys.argv[sys.argv.index("--md") + 1] if "--md" in sys.argv else None
    if md_ra in ds:
        ds.remove(md_ra)
    if len(ds) < 2 or len(ds) % 2:
        print(__doc__)
        return 2
    out, tong_loi = [], 0
    for kb_d, pr_d in zip(ds[::2], ds[1::2]):
        dong, loi, tom = bang(kb_d, pr_d)
        out.append("### %s  (%s)\n" % (os.path.basename(kb_d), tom))
        out.append("| Lời gốc | Bản đọc TTS | Phụ đề hiển thị | Thời lượng & mốc |\n|---|---|---|---|")
        out += ["| %s | %s | %s | %s |" % tuple(_o(x) for x in d) for d in dong]
        out.append("\n**Kiểm tự động:** " + ("0 lỗi" if not loi else "%d lỗi" % len(loi)))
        out += ["- " + x for x in loi]
        out.append("")
        tong_loi += len(loi)
    van = "\n".join(out)
    print(van)
    if md_ra:
        os.makedirs(os.path.dirname(md_ra) or ".", exist_ok=True)
        open(md_ra, "w", encoding="utf-8").write(van)
    print("BẢNG ĐỐI CHIẾU TTS: %d lỗi" % tong_loi)
    return 1 if tong_loi else 0


if __name__ == "__main__":
    sys.exit(main())
