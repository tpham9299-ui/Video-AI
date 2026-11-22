#!/usr/bin/env python3
"""v92 — Test mốc khung 4 tầng (chuanbi.py khung_4_tang), không gọi TTS: python scripts/test_moc_4tang.py
Kiểm: không nhảy bước sớm (khi_noi trùng câu đọc đề), không mất bước cuối, mỗi bước có >= 1 thẻ từ đầu bước, không hở > 14 s,
thẻ đáp số giữ tới Outro, phụ đề mặc định tắt, tiêu đề không lộ đáp số, 3D luôn có khuôn, phát âm & phụ đề số."""
import copy
import json
import os
import sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(GOC, "scripts"))
import chuanbi as cb  # noqa: E402

DAT, LOI = 0, []


def kiem(dk, ten, them=""):
    global DAT
    if dk:
        DAT += 1
        print("  ✓", ten)
    else:
        LOI.append(ten)
        print("  ✗", ten, "—", them)


def canh_gia(kb, giay=5.0):
    """props.canh giả: mỗi cảnh `giay` s, từ ước lượng chia đều theo câu (như giọng Gemini không có mốc từ)."""
    ra, bd = [], 0
    for c in kb["canh"]:
        so_frame = int(giay * 30)
        ra.append({"so": c["so"], "loai": c["loai"], "batDau": bd, "soFrame": so_frame, "leadFrame": 0,
                   "cau": [{"text": cb.hien_phu_de(c["loi_thoai"]), "bat": 0.1, "ket": giay - 0.3}]})
        bd += so_frame
    return ra


def doc(ten):
    return json.load(open(os.path.join(GOC, "mau", "loi_qua_dem", ten), encoding="utf8"))


def kiem_bai(ten):
    kb = doc(ten)
    cp = canh_gia(kb)
    k = cb.khung_4_tang(copy.deepcopy(kb), cp, 30)
    tong = k["tongFrame"] / 30.0
    b = k["buoc"]
    het_de = max(c["batDau"] + c["soFrame"] for c in cp if c["loai"] in ("mo_dau", "de_bai")) / 30.0
    print("%s: bước %s" % (ten, ", ".join("%.1f" % x["t"] for x in b)))
    kiem(all(x["t"] >= het_de - 0.05 for x in b[1:]), "%s: bước 2+ không bắt đầu trước khi đọc xong đề (%.1f s)" % (ten, het_de))
    kiem(all(b[i]["t"] < b[i + 1]["t"] for i in range(len(b) - 1)), "%s: mốc bước tăng dần" % ten)
    kiem(tong - b[-1]["t"] >= 5.5, "%s: bước cuối có >= 5,5 s (không bị ép về cuối)" % ten, "%.1f s" % (tong - b[-1]["t"]))
    hong = []
    for i, x in enumerate(b):
        t_sau = b[i + 1]["t"] if i + 1 < len(b) else tong
        moc = sorted([x["t"] + 0.45] + [y["t"] for y in x["the"]] + [t_sau])
        if not x["the"] or min(y["t"] for y in x["the"]) > x["t"] + 5 or max(q - p for p, q in zip(moc, moc[1:])) > 14.5:
            hong.append(i + 1)
        if any(y["t"] >= t_sau for y in x["the"]):
            hong.append(i + 1)
    kiem(not hong, "%s: mỗi bước có thẻ sớm, không hở > 14 s, không thẻ nào rơi sau bước kế" % ten, "bước %s" % hong)
    kiem(k["boCuc"]["phuDe"] == "tat", "%s: phụ đề mặc định tắt (kể cả kịch bản ghi \"gon\")" % ten)
    so = [s for s in __import__("re").findall(r"\d+", kb["dap_an_cuoi"]) if s not in kb["de_bai"]]
    kiem(not any(s in x["tieu_de"] for x in b for s in so), "%s: tiêu đề bước không lộ đáp số" % ten, [x["tieu_de"] for x in b])
    kiem(bool(k["canh3dv"] and (k["canh3dv"].get("khuon") or k["canh3dv"].get("khuon_du_phong"))), "%s: 3D luôn có khuôn tham số" % ten, k["canh3dv"])
    return k


def main():
    print("Ba bài lỗi qua đêm:")
    k1 = kiem_bai("the_12.json")
    k2 = kiem_bai("lon_512.json")
    k3 = kiem_bai("bia_12.json")
    kiem(k1["canh3dv"]["khuon"] == "luoi_the_bi_xac_suat" and k1["canh3dv"]["tham_so"].get("N") == 12, "12 thẻ -> lưới 12 thẻ")
    kiem(k2["canh3dv"]["khuon"] == "tru_non_toi_uu" and k2["canh3dv"]["tham_so"].get("V") == 512, "lon 512 cm³ -> khuôn trụ V = 512")
    kiem(k3["canh3dv"]["khuon"] == "tam_bia_gap_hop" and k3["canh3dv"]["tham_so"].get("a") == 12, "bìa 12×12 -> khuôn gập hộp a = 12")
    bbt2 = [t for x in k2["buoc"] for t in x["the"] if t["loai"] == "bang_bien_thien"]
    bbt3 = [t for x in k3["buoc"] for t in x["the"] if t["loai"] == "bang_bien_thien"]
    kiem(bbt2 and bbt2[0].get("ham") == "S" and bbt2[0].get("bien") == "r", "BBT lon: S'(r) / S(r)")
    kiem(bbt3 and bbt3[0].get("ham") == "V" and bbt3[0].get("bien") == "x", "BBT bìa: V'(x) / V(x)")
    kiem("?" in k1["buoc"][-1]["tieu_de"] and "/?" not in k1["buoc"][-1]["tieu_de"], "tiêu đề 'P(A) = 31/44' -> 'P(A) = ?'", k1["buoc"][-1]["tieu_de"])
    kiem(any("31/44" in json.dumps(t) or "31}{44" in json.dumps(t) for t in k1["buoc"][-1]["the"]), "bước cuối có thẻ đáp số")
    kiem("\\overline{A}" in k1["buoc"][3]["tieu_de"], "tiêu đề 'Biến cố đối A' -> \\overline{A}", k1["buoc"][3]["tieu_de"])
    casio = [t for x in k2["buoc"] for t in x["the"] if t["loai"] == "casio"]
    kiem(casio and casio[0]["phim"][:2] == ["MENU", "8"], "Casio SHIFT SOLVE (tìm GTNN) -> MENU 8", casio)

    print("Nhảy bước sớm / mất bước cuối (kịch bản cố tình xấu):")
    kb = doc("the_12.json")
    kb["khung4tang"]["buoc"][1]["khi_noi"] = "có mười hai tấm thẻ"   # trùng đúng câu đọc đề
    kb["khung4tang"]["buoc"][-1]["khi_noi"] = "câu không hề có trong lời thoại"
    kb["khung4tang"]["buoc"][2]["the"][0]["khi_noi"] = "bài học"      # thẻ khớp quá xa (cảnh cuối)
    cp = canh_gia(kb)
    k = cb.khung_4_tang(kb, cp, 30)
    het_de = 10.0
    kiem(k["buoc"][1]["t"] >= het_de - 0.05, "khi_noi trùng câu đề -> bước 2 vẫn sau khi đọc xong đề", k["buoc"][1]["t"])
    tong = k["tongFrame"] / 30.0
    kiem(k["buoc"][-1]["t"] <= tong - 5.5 and k["buoc"][-1]["t"] > k["buoc"][-2]["t"], "bước cuối không khớp -> vẫn có chỗ (không kẹt bước 3)", k["buoc"][-1]["t"])
    kiem(all(t["t"] < k["buoc"][3]["t"] for t in k["buoc"][2]["the"]), "thẻ khớp quá xa bị giữ trong bước của nó")

    print("Phát âm & phụ đề:")
    kiem(cb.chuan_hoa_doc("S'(r) = 0").strip() == "ét phẩy rờ bằng không", "S'(r) = 0 -> ét phẩy rờ bằng không", cb.chuan_hoa_doc("S'(r) = 0"))
    kiem("vê phẩy ích" in cb.chuan_hoa_doc("Cho V'(x) = 0"), "V'(x) -> vê phẩy ích")
    kiem("đê tê" in cb.chuan_hoa_doc("tích phân v(t) dt") and "diện tích" not in cb.chuan_hoa_doc("tích phân v(t) dt"), "dt -> đê tê (không phải diện tích)")
    kiem("đê ích" in cb.chuan_hoa_doc("∫ f(x) dx"), "dx -> đê ích")
    kiem("zero" not in cb.chuan_hoa_doc("bằng zero") and "không" in cb.chuan_hoa_doc("x = 0"), "0 / zero -> không")
    kiem(cb.hien_phu_de("tích không chia hết cho bốn") == "tích không chia hết cho bốn", "phụ đề: 'tích không chia hết' giữ chữ")
    kiem(cb.hien_phu_de("một nghìn không trăm hai mươi tư") == "1024", "phụ đề: 1024 đọc đủ")
    kiem(">" not in cb.hien_phu_de("bốn lớn hơn ba trăm tám mươi tư!") and cb.hien_phu_de("x lớn hơn năm").replace(" ", " ") == "x > 5", "phụ đề: so sánh chỉ khi có biến")
    doan = cb.chia_phu_de("Tổng số cách là một nghìn không trăm hai mươi tư cách chọn khác nhau cho bạn nhỏ tham gia trò chơi này nhé", 40)
    kiem(any("một nghìn không trăm hai mươi tư" in d for d in doan), "phụ đề: không chẻ đôi con số", doan)

    print("Logo theo chuyên mục:")
    th = {"ten": "Tư duy Toán", "logo": "thuong_hieu/logo.png"}
    kiem(cb.logo_theo_chuyen_muc(th, "khong_co", {"mon": "THUC_TE"})["logo"] is None, "bài Toán không dùng logo.png in chữ Xác suất")
    kiem(cb.logo_theo_chuyen_muc(th, "khong_co", {"mon": "XAC_SUAT"})["chuyenMuc"] == "xac_suat", "bài xác suất giữ chuyên mục xác suất")
    pc = {"tenTheoChuyenMuc": {"Xác suất": "Tư duy Xác suất", "mac_dinh": "Tư duy Toán"}}
    kiem(cb.ten_kenh_theo_chuyen_muc({"ten": "Tư duy Xác suất"}, pc, {"mon": "THUC_TE", "chu_de": "Tích phân quãng đường"})["ten"] == "Tư duy Toán", "tên kênh bài tích phân: Tư duy Toán")

    print("\n%d đạt, %d lỗi" % (DAT, len(LOI)))
    sys.exit(1 if LOI else 0)


if __name__ == "__main__":
    main()
