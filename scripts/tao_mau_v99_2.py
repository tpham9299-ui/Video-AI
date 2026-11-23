"""v99.2 — sinh 2 mẫu nghiệm thu mau/v99_2/ (đề sáng tạo + hợp đồng hình BP0 + sân khấu tự sinh dùng thư viện ve25d):
  1. gap_nhau_xs.json : hai bạn hẹn gặp trong 60 phút, chờ 15 phút - xác suất hình học (tỉ số diện tích), P = 7/16
                        (XAC_SUAT, san_khau_dich = tu_sinh_svg: dải |x - y| <= 15 tô dần trên hình vuông)
  2. kien_bo_hop.json : kiến bò trên mặt hộp 30 x 20 x 10 cm từ A tới G - trải phẳng 2 mặt kề, so 3 cách trải,
                        ngắn nhất 30√2 ≈ 42,43 cm (THUC_TE, san_khau_dich = tu_sinh_svg)
Mã Python trong `khung4tang.tu_sinh.ma` là thứ BP2 (Gemini) sẽ viết: chạy trong hộp cát tu_sinh_svg.py, được `import ve25d`.
Chạy: python scripts/tao_mau_v99_2.py
"""
import json
import os

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MA_GAP_NHAU = r'''
import math
import ve25d as v

X, Y, C = 225.0, 60.0, 380.0          # hình vuông thời gian 60 x 60 phút (to, giữa sân khấu)

def ve():
    khung, f = v.he_truc(X, Y, C, C, 60, 60, vach=(15, 45, 60), co=24)
    def da(ds):
        return [f(u, w) for u, w in ds]
    vuong = da([(0, 0), (60, 0), (60, 60), (0, 60)])
    dai = da([(0, 0), (15, 0), (60, 45), (60, 60), (45, 60), (0, 15)])
    tg1, tg2 = da([(15, 0), (60, 0), (60, 45)]), da([(0, 15), (0, 60), (45, 60)])
    goc = list(vuong)
    p = f(40, 20)
    # hình: lớp KHÔNG nhóm (tích lũy); nhãn: nhóm "nhan" (nhãn bước sau THAY nhãn bước trước, không chồng chữ)
    return [
        v.lop(0, v.mien_to(vuong, "mat", 0.9, vien="cu", w=2.2) + khung
              + v.chu(X + C + 34, Y + C + 8, "An", co=26, mau="chu_mo", neo="start")
              + v.chu(X - 6, Y - 30, "Bình", co=26, mau="chu_mo", neo="end"), "no", khi_noi="trong một giờ", nhan_lop="khung giờ"),
        v.lop(1, v.cham(p[0], p[1], 9, "nhan"), "moc", khi_noi="mỗi cặp giờ đến", nhan_lop="một điểm", nhom="diem"),
        v.lop(1, v.nhan(p[0], p[1], "An 40, Bình 20", tranh=goc + dai, co=24, uu_tien=(1, 1)), "moc", khi_noi="mỗi cặp giờ đến", nhan_lop="nhãn điểm", nhom="nhan"),
        v.lop(2, v.mien_to(dai, "nhan", 0.42, vien="nhan", w=2.6), "ve", khi_noi="gặp nhau khi", nhan_lop="dải gặp nhau", nhom="dai"),
        v.lop(2, v.nhan(f(30, 30)[0], f(30, 30)[1], "|x − y| ≤ 15", tranh=goc, co=28, kc=0, giong=False), "moc", khi_noi="gặp nhau khi", nhan_lop="nhãn dải", nhom="nhan"),
        v.lop(3, v.mien_to(tg1, "cu", 0.55) + v.mien_to(tg2, "cu", 0.55), "sang", khi_noi="hai tam giác góc", nhan_lop="phần không gặp"),
        v.lop(3, v.nhan(f(47, 13)[0], f(47, 13)[1], "45²/2", tranh=goc, co=26, kc=0, giong=False)
              + v.nhan(f(13, 47)[0], f(13, 47)[1], "45²/2", tranh=goc, co=26, kc=0, giong=False), "moc", khi_noi="hai tam giác góc", nhan_lop="nhãn bù", nhom="nhan"),
        v.lop(4, v.mien_to(dai, "ket", 0.5, vien="ket", w=3), "no", khi_noi="vậy xác suất", nhan_lop="dải kết quả", nhom="dai"),
        v.lop(4, v.nhan(f(30, 30)[0], f(30, 30)[1], "P = 7/16", tranh=goc, co=32, mau="ket", kc=0, giong=False), "no", khi_noi="vậy xác suất", nhan_lop="kết quả", nhom="nhan"),
    ]
'''

MA_KIEN_BO = r'''
import math
import ve25d as v

K = 8.6      # px / cm cho hộp 2.5D
K2 = 7.0     # px / cm cho lưới trải phẳng

def ve():
    hop, P = v.hop(170, 430, 30 * K, 20 * K, 10 * K, mau="nhan", k=0.62)
    A, G = P["A"], P["G"]
    dinh = list(P.values())
    nh = (v.nhan(A[0], A[1], "A (kiến)", tranh=dinh, co=26, uu_tien=(-1, 1))
          + v.nhan(G[0], G[1], "G (mồi)", tranh=dinh, co=26, uu_tien=(1, -1))
          + v.nhan((P["A"][0] + P["B"][0]) / 2, P["A"][1], "30 cm", tranh=dinh, co=24, uu_tien=(0, 1))
          + v.nhan((P["B"][0] + P["C"][0]) / 2, (P["B"][1] + P["C"][1]) / 2, "20 cm", tranh=dinh, co=24, uu_tien=(1, 1))
          + v.nhan(P["A"][0], (P["A"][1] + P["E"][1]) / 2, "10 cm", tranh=dinh, co=24, uu_tien=(-1, 0)))
    cheo = v.duong([A, G], "sai", 3, net_dut=True) + v.nhan((A[0] + G[0]) / 2, (A[1] + G[1]) / 2, "xuyên hộp ✕", tranh=dinh, co=24, mau="sai", uu_tien=(0, -1))
    # trải phẳng mặt bên (20 cm) + mặt trên (10 cm) thành hình chữ nhật (20 + 10) x 30 cm - nửa trên sân khấu
    rong, cao = 30 * K2, 30 * K2
    lx, ly = 400 - rong / 2, 46.0
    tp, Q = v.trai_phang_2mat(lx, ly, 20 * K2, 10 * K2, cao, nhan_mat=("bên", "trên"))
    tp_nhan = (v.nhan(Q["A"][0], Q["A"][1], "A", tranh=[Q["G"]] + list(Q["gap"]), co=26, uu_tien=(-1, 1))
               + v.nhan(Q["G"][0], Q["G"][1], "G", tranh=[Q["A"]] + list(Q["gap"]), co=26, uu_tien=(1, -1)))
    # 3 cách trải - nửa dưới sân khấu
    ds = [("30+20 | 10", math.hypot(50, 10)), ("30+10 | 20", math.hypot(40, 20)), ("20+10 | 30", math.hypot(30, 30))]
    cot = ""
    for k, (ten, d) in enumerate(ds):
        y = 330 + 62 * k
        tot = k == 2
        cot += v.da_giac([(330, y), (330 + d * 5.6, y), (330 + d * 5.6, y + 32), (330, y + 32)], "ket" if tot else "cu", day=5, bong=False)
        cot += v.chu(318, y + 25, ten, co=24, mau="chu_mo", neo="end")
        cot += v.chu(342 + d * 5.6, y + 25, "%.1f" % d, co=26, mau="ket" if tot else "chu", neo="start")
    return [
        v.lop(0, hop + nh, "no", khi_noi="hộp quà", nhan_lop="hộp 2.5D", nhom="hinh"),
        v.lop(1, hop + nh + cheo, "sang", khi_noi="đi thẳng", nhan_lop="bẫy xuyên hộp", nhom="hinh"),
        v.lop(2, tp + tp_nhan + v.duong([Q["A"], Q["G"]], "nhan", 3.4), "ve", khi_noi="trải phẳng", nhan_lop="trải phẳng", nhom="hinh"),
        v.lop(3, cot, "moc", khi_noi="ba cách trải", nhan_lop="so 3 cách", nhom="cot"),
        v.lop(4, tp + tp_nhan + v.duong([Q["A"], Q["G"]], "ket", 4.4), "sang", khi_noi="vậy quãng đường", nhan_lop="ngắn nhất", nhom="hinh"),
    ]
'''


def gap_nhau():
    return {
        "id": "V992-GAPNHAU", "mon": "XAC_SUAT", "luong": "thuc_te_xac_suat", "lop": "11",
        "san_khau_dich": "tu_sinh_svg",
        "kich_ban_hinh": ["Hình vuông 60 x 60 phút", "Mỗi cặp giờ đến là một điểm", "Tô dải |x − y| ≤ 15", "Dải gặp nhau sáng hổ phách"],
        "nut_that": "Gặp nhau khi điểm (x; y) nằm trong dải |x − y| ≤ 15 - đổi xác suất thành tỉ số diện tích",
        "tieu_de": "Hẹn nhau 1 tiếng, chờ 15 phút - gặp được không?",
        "tieu_de_intro": "Chờ 15 phút – gặp được không?", "chu_de": "Xác suất hình học",
        "de_bai": "An và Bình hẹn gặp ở quán trà sữa trong khoảng 17 giờ đến 18 giờ. Mỗi bạn đến vào một thời điểm ngẫu nhiên "
                  "trong khoảng đó, ai đến trước chỉ chờ 15 phút rồi về. Tính xác suất hai bạn gặp nhau.",
        "dap_an_cuoi": "P = 7/16", "cta": "Lưu lại mẹo đổi xác suất thành diện tích nhé!",
        "canh": [
            {"so": 1, "loai": "de_bai", "loi_thoai": "Hẹn nhau trong một giờ, chỉ chờ 15 phút. Cơ hội gặp là bao nhiêu?", "noi_dung_man_hinh": []},
            {"so": 2, "loai": "tinh_toan", "loi_thoai": "Gọi x, y là số phút sau 17 giờ An và Bình đến. Mỗi cặp giờ đến là một điểm trong hình vuông cạnh 60.",
             "noi_dung_man_hinh": ["0 \\le x, y \\le 60"]},
            {"so": 3, "loai": "tinh_toan", "loi_thoai": "Hai bạn gặp nhau khi hiệu hai giờ đến không quá 15 phút. Đó là dải chéo giữa hình vuông.",
             "noi_dung_man_hinh": ["|x - y| \\le 15"]},
            {"so": 4, "loai": "tinh_toan", "loi_thoai": "Bẫy là đi đếm từng phút. Mẹo: lấy phần bù, hai tam giác góc không gặp, mỗi tam giác cạnh 45.",
             "noi_dung_man_hinh": ["S_{\\text{không gặp}} = 2 \\cdot \\dfrac{45^2}{2} = 2025"]},
            {"so": 5, "loai": "dap_an", "loi_thoai": "Vậy xác suất gặp nhau bằng 1 trừ 2025 phần 3600, bằng 7 phần 16.",
             "noi_dung_man_hinh": ["P = 1 - \\dfrac{2025}{3600} = \\dfrac{7}{16}"]},
            {"so": 6, "loai": "ket_luan", "loi_thoai": "Mẹo: đổi xác suất thành tỉ số diện tích. Lưu lại nhé!", "noi_dung_man_hinh": []},
        ],
        "tom_tat_3_buoc": [
            {"chien_thuat": "Giờ đến là 1 điểm", "cong_thuc": "0 \\le x, y \\le 60"},
            {"chien_thuat": "Bù 2 tam giác góc", "cong_thuc": "2 \\cdot \\dfrac{45^2}{2} = 2025"},
            {"chien_thuat": "Tỉ số diện tích", "cong_thuc": "P = \\dfrac{7}{16}"},
        ],
        "khung4tang": {
            "de_ghim": [{"id": "t", "nhan": "60 \\text{ phút}"}, {"id": "c", "nhan": "\\text{chờ } 15"}, {"id": "p", "nhan": "P = ?"}],
            "buoc": [
                {"canh": 1, "nhan": "Đề bài", "tieu_de": "Hẹn gặp trong 1 giờ", "the": [{"loai": "chu", "noi_dung": "Chờ 15 phút có gặp?"}]},
                {"canh": 2, "khi_noi": "mỗi cặp giờ đến", "nhan": "Mô hình", "tieu_de": "Mỗi cặp giờ là một điểm", "du_kien": ["t"],
                 "the": [{"loai": "cong_thuc", "dong": ["0 \\le x, y \\le 60"]}]},
                {"canh": 3, "khi_noi": "gặp nhau khi", "nhan": "Điều kiện", "tieu_de": "Dải gặp nhau", "du_kien": ["c"],
                 "the": [{"loai": "cong_thuc", "dong": ["|x - y| \\le 15"]}]},
                {"canh": 4, "khi_noi": "hai tam giác góc", "nhan": "Phần bù", "tieu_de": "Lấy phần bù",
                 "the": [{"loai": "cong_thuc", "dong": ["2 \\cdot \\dfrac{45^2}{2} = 2025"]}]},
                {"canh": 5, "khi_noi": "vậy xác suất", "nhan": "Kết luận", "tieu_de": "Tỉ số diện tích", "mau": "vang", "du_kien": ["p"],
                 "the": [{"loai": "cong_thuc", "chot": True, "dong": ["P = \\dfrac{7}{16}"]}]},
            ],
            "tu_sinh": {"ma": MA_GAP_NHAU.strip() + "\n", "mo_ta": "Hình vuông thời gian, dải gặp nhau tô dần"},
        },
    }


def kien_bo():
    return {
        "id": "V992-KIENBO", "mon": "THUC_TE", "luong": "thuc_te_xac_suat", "lop": "10",
        "san_khau_dich": "tu_sinh_svg",
        "kich_ban_hinh": ["Hộp quà 2.5D, kiến ở A", "Đường chéo xuyên hộp: bị loại", "Trải phẳng 2 mặt kề rồi nối thẳng", "So 3 cách trải, chốt 30√2"],
        "nut_that": "Trải phẳng hai mặt kề thành một hình chữ nhật, đường ngắn nhất là đường chéo",
        "tieu_de": "Kiến bò đường nào ngắn nhất?", "chu_de": "Trải phẳng hình hộp",
        "de_bai": "Một hộp quà hình hộp chữ nhật dài 30 cm, rộng 20 cm, cao 10 cm. Con kiến ở đỉnh A muốn bò trên mặt hộp tới đỉnh G đối diện. "
                  "Quãng đường ngắn nhất là bao nhiêu xăng-ti-mét (làm tròn 2 chữ số thập phân)?",
        "dap_an_cuoi": "30√2 ≈ 42,43 cm", "cta": "Bình luận cách trải bạn chọn nhé!",
        "canh": [
            {"so": 1, "loai": "de_bai", "loi_thoai": "Con kiến trên hộp quà muốn bò nhanh nhất tới miếng mồi. Đi đường nào?", "noi_dung_man_hinh": []},
            {"so": 2, "loai": "tinh_toan", "loi_thoai": "Bẫy đầu tiên: kiến không thể đi thẳng xuyên qua hộp, nó chỉ bò trên mặt.",
             "noi_dung_man_hinh": ["AG = \\sqrt{30^2 + 20^2 + 10^2} \\text{ (xuyên hộp)}"]},
            {"so": 3, "loai": "tinh_toan", "loi_thoai": "Mẹo: trải phẳng hai mặt kề nhau thành một hình chữ nhật, rồi nối thẳng A với G.",
             "noi_dung_man_hinh": ["d = \\sqrt{(b + c)^2 + a^2}"]},
            {"so": 4, "loai": "tinh_toan", "loi_thoai": "Có ba cách trải. Lần lượt được 51, 44,7 và 42,4 xăng-ti-mét. Cách gộp 20 với 10 thắng.",
             "noi_dung_man_hinh": ["\\sqrt{50^2 + 10^2},\\ \\sqrt{40^2 + 20^2},\\ \\sqrt{30^2 + 30^2}"]},
            {"so": 5, "loai": "dap_an", "loi_thoai": "Vậy quãng đường ngắn nhất là 30 căn 2, khoảng 42,43 xăng-ti-mét.",
             "noi_dung_man_hinh": ["d_{min} = 30\\sqrt{2} \\approx 42{,}43 \\text{ cm}"]},
            {"so": 6, "loai": "ket_luan", "loi_thoai": "Mẹo: gộp hai cạnh NGẮN nhất. Bình luận cách bạn chọn nhé!", "noi_dung_man_hinh": []},
        ],
        "tom_tat_3_buoc": [
            {"chien_thuat": "Bỏ đường xuyên hộp", "cong_thuc": "\\text{chỉ bò trên mặt}"},
            {"chien_thuat": "Trải 2 mặt kề", "cong_thuc": "d = \\sqrt{(b + c)^2 + a^2}"},
            {"chien_thuat": "Gộp 2 cạnh ngắn", "cong_thuc": "30\\sqrt{2} \\approx 42{,}43"},
        ],
        "khung4tang": {
            "de_ghim": [{"id": "k", "nhan": "30 \\times 20 \\times 10"}, {"id": "d", "nhan": "d = ?"}],
            "buoc": [
                {"canh": 1, "nhan": "Đề bài", "tieu_de": "Kiến bò trên hộp", "du_kien": ["k"], "the": [{"loai": "chu", "noi_dung": "Đường nào ngắn nhất?"}]},
                {"canh": 2, "khi_noi": "đi thẳng xuyên qua hộp", "nhan": "Bẫy", "tieu_de": "Bẫy: không xuyên hộp",
                 "the": [{"loai": "cong_thuc", "dong": ["\\text{chỉ bò trên mặt}"]}]},
                {"canh": 3, "khi_noi": "trải phẳng hai mặt", "nhan": "Trải phẳng", "tieu_de": "Trải phẳng 2 mặt kề",
                 "the": [{"loai": "cong_thuc", "dong": ["d = \\sqrt{(b + c)^2 + a^2}"]}]},
                {"canh": 4, "khi_noi": "có ba cách trải", "nhan": "So sánh", "tieu_de": "So 3 cách trải",
                 "the": [{"loai": "cong_thuc", "dong": ["51 > 44{,}7 > 42{,}4"]}]},
                {"canh": 5, "khi_noi": "vậy quãng đường ngắn nhất", "nhan": "Kết luận", "tieu_de": "Đường ngắn nhất", "mau": "vang", "du_kien": ["d"],
                 "the": [{"loai": "cong_thuc", "chot": True, "dong": ["d_{min} = 30\\sqrt{2} \\approx 42{,}43 \\text{ cm}"]}]},
            ],
            "tu_sinh": {"ma": MA_KIEN_BO.strip() + "\n", "mo_ta": "Hộp quà 2.5D trải phẳng, đường kiến bò ngắn nhất"},
        },
    }


if __name__ == "__main__":
    thu = os.path.join(GOC, "mau", "v99_2")
    os.makedirs(thu, exist_ok=True)
    for ten, kb in (("gap_nhau_xs", gap_nhau()), ("kien_bo_hop", kien_bo())):
        p = os.path.join(thu, ten + ".json")
        with open(p, "w", encoding="utf8") as f:
            json.dump(kb, f, ensure_ascii=False, indent=1)
        print("Đã ghi", os.path.relpath(p, GOC))
