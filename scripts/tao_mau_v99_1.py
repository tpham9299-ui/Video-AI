"""v99.1 — sinh 2 mẫu nghiệm thu mau/v99_1/ (sân khấu tự sinh 2.5D + nền theme):
  1. koch_dao.json       : hòn đảo bông tuyết Koch cạnh 200 m, giá 5 triệu/m² (nền Deep Ocean, lớp 11 - CSN lùi vô hạn)
  2. gia_ve_parabol.json : giảm giá vé tối ưu lợi nhuận, parabol có đỉnh nổi bật (nền Emerald Studio, lớp 10 - đỉnh parabol)
Mã Python trong `khung4tang.tu_sinh.ma` CHÍNH là thứ BP2 (Gemini) sẽ viết; chuanbi.py chạy nó trong hộp cát tu_sinh_svg.py.
Chạy: python scripts/tao_mau_v99_1.py
"""
import json
import os

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MA_KOCH = r'''
import math

CX, CY, L = 400.0, 300.0, 370.0
NEN, CANH, CYAN, HO, XAM = "#16324A", "#0C1E2E", "#5CE1E6", "#FFB547", "#7C8DA6"

def tam_giac():
    R = L / math.sqrt(3)
    return [(CX + R * math.cos(math.radians(a)), CY + R * math.sin(math.radians(a))) for a in (-90, 30, 150)]

def chia(poly):
    moi, them = [], []
    n = len(poly)
    for k in range(n):
        a, b = poly[k], poly[(k + 1) % n]
        p1 = (a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3)
        p2 = (a[0] + 2 * (b[0] - a[0]) / 3, a[1] + 2 * (b[1] - a[1]) / 3)
        dx, dy = p2[0] - p1[0], p2[1] - p1[1]
        c, s = math.cos(math.radians(-60)), math.sin(math.radians(-60))
        dinh = (p1[0] + dx * c - dy * s, p1[1] + dx * s + dy * c)
        moi += [a, p1, dinh, p2]
        them.append([p1, dinh, p2])
    return moi, them

def pts(poly, dx=0.0, dy=0.0):
    return " ".join("%.1f,%.1f" % (x + dx, y + dy) for x, y in poly)

def khoi(poly, mat, vien, day=7.0, bong=True, w=2.2):
    s = ""
    if bong:
        s += '<polygon points="%s" fill="rgba(0,0,0,0.28)"/>' % pts(poly, 9, 11)
    s += '<polygon points="%s" fill="%s"/>' % (pts(poly, 0, day), CANH)
    s += '<polygon points="%s" fill="%s" stroke="%s" stroke-width="%.1f" stroke-linejoin="round"/>' % (pts(poly), mat, vien, w)
    return s

def chu(x, y, s, mau="#E9EEF5", co=30, dam=700, neo="middle"):
    return ('<text x="%.1f" y="%.1f" fill="%s" font-family="Be Vietnam Pro" font-size="%d" font-weight="%d" '
            'text-anchor="%s">%s</text>') % (x, y, mau, co, dam, neo, s)

def ve():
    t0 = tam_giac()
    p1, them1 = chia(t0)
    p2, them2 = chia(p1)
    p3, them3 = chia(p2)
    song = "".join('<path d="M %d %d C %d %d %d %d %d %d" fill="none" stroke="#3FD0E0" stroke-opacity="0.18" stroke-width="2"/>'
                   % (60 + 120 * k, 500 - 8 * (k % 2), 100 + 120 * k, 488, 140 + 120 * k, 512, 180 + 120 * k, 500 - 8 * (k % 2)) for k in range(5))
    lop = [
        {"buoc": 0, "hieu_ung": "no", "nhan": "đảo gốc", "svg": song + khoi(t0, NEN, XAM)},
        {"buoc": 1, "hieu_ung": "sang", "nhan": "tam giác 200 m", "khi_noi": "tam giác đều cạnh 200 mét",
         "svg": khoi(t0, "#1D4A63", CYAN, bong=False, w=3)},
        {"buoc": 1, "hieu_ung": "moc", "nhan": "nhãn S0", "nhom": "giua", "khi_noi": "bằng 10000 căn ba",
         "svg": chu(CX, CY + 22, "S₀ = 10000√3", co=32)},
        {"buoc": 1, "hieu_ung": "moc", "nhan": "nhãn cạnh", "nhom": "dau", "khi_noi": "cạnh 200 mét",
         "svg": chu(CX, 40, "cạnh a = 200 m", CYAN, 30)},
        {"buoc": 2, "hieu_ung": "moc", "nhan": "lần 1: 3 tam giác", "khi_noi": "mỗi cạnh mọc thêm",
         "svg": "".join(khoi(t, "#1F6F80", CYAN, day=5, bong=False) for t in them1)},
        {"buoc": 2, "hieu_ung": "moc", "nhan": "nhãn lần 1", "nhom": "dau", "khi_noi": "cạnh nhỏ bằng một phần ba",
         "svg": chu(CX, 40, "+3 tam giác, mỗi cái S₀/9", CYAN, 30)},
        {"buoc": 3, "hieu_ung": "moc", "nhan": "lần 2: 12 tam giác", "khi_noi": "lần thứ hai",
         "svg": "".join(khoi(t, "#24808F", CYAN, day=3, bong=False, w=1.6) for t in them2)},
        {"buoc": 3, "hieu_ung": "ve", "nhan": "lần 3: 48 tam giác", "khi_noi": "cứ thế mãi",
         "svg": "".join('<polygon points="%s" fill="#2B97A6" stroke="%s" stroke-width="1"/>' % (pts(t), CYAN) for t in them3)},
        {"buoc": 3, "hieu_ung": "moc", "nhan": "nhãn công bội", "nhom": "dau", "khi_noi": "nhân bốn phần chín",
         "svg": chu(CX, 40, "công bội q = 4/9", CYAN, 30)},
        {"buoc": 4, "hieu_ung": "sang", "nhan": "đường bờ", "khi_noi": "tổng cấp số nhân lùi vô hạn", "nhom": "giua",
         "svg": '<polygon points="%s" fill="none" stroke="%s" stroke-width="3"/>' % (pts(p3), HO) + '<rect x="%.1f" y="%.1f" width="200" height="54" rx="27" fill="#0B1A26"/>' % (CX - 100, CY - 18) + chu(CX, CY + 20, "S = 8/5 · S₀", HO, 32, 800)},
        {"buoc": 5, "hieu_ung": "no", "nhan": "giá trị đảo", "khi_noi": "giá trị hòn đảo",
         "svg": '<rect x="250" y="452" width="300" height="56" rx="28" fill="#2A2110" stroke="%s" stroke-width="2.5"/>' % HO
                + chu(CX, 492, "≈ 138,6 tỷ đồng", HO, 32, 800)},
    ]
    return lop
'''

MA_PARABOL = r'''
import math

X0, Y0, KX, KY, NEN_L = 96.0, 470.0, 66.0, 0.0405, 25000.0
CYAN, HO, XAM, NEN = "#5CE1E6", "#FFB547", "#7C8DA6", "#0F3A33"

def L(x):
    return (80 - 5 * x) * (400 + 40 * x)

def P(x, y):
    # trục L bắt đầu từ 25 000 (có dấu ngắt trục) để thấy rõ độ cong của parabol
    return X0 + KX * x, Y0 - KY * (y - NEN_L)

def chu(x, y, s, mau="#E9EEF5", co=30, dam=700, neo="middle"):
    return ('<text x="%.1f" y="%.1f" fill="%s" font-family="Be Vietnam Pro" font-size="%d" font-weight="%d" '
            'text-anchor="%s">%s</text>') % (x, y, mau, co, dam, neo, s)

def duong(x0, x1, n=60):
    d = []
    for k in range(n + 1):
        x = x0 + (x1 - x0) * k / n
        px, py = P(x, L(x))
        d.append(("M" if not k else "L") + " %.1f %.1f" % (px, py))
    return " ".join(d)

def ve():
    # trục: x = số lần giảm 5 nghìn (0..9), y = lợi nhuận (nghìn đồng), gốc y = 0 ở đáy
    truc = ('<line x1="%.1f" y1="%.1f" x2="760" y2="%.1f" stroke="%s" stroke-width="2"/>' % (X0, Y0, Y0, XAM)
            + '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="40" stroke="%s" stroke-width="2"/>' % (X0, Y0, X0, XAM)
            + "".join('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1.5"/>' % (X0 + KX * k, Y0, X0 + KX * k, Y0 + 8, XAM) for k in range(10))
            + "".join(chu(X0 + KX * k, Y0 + 34, str(k), XAM, 26, 600) for k in range(0, 10, 3))
            + '<path d="M %.1f %.1f L %.1f %.1f M %.1f %.1f L %.1f %.1f" stroke="%s" stroke-width="2"/>' % (X0 - 9, Y0 - 22, X0 + 9, Y0 - 28, X0 - 9, Y0 - 32, X0 + 9, Y0 - 38, XAM)
            + chu(X0 + 16, 58, "L (nghìn đồng)", XAM, 26, 700, "start"))   # v99.2: đầu trục (không cắt đường gióng đỉnh)
    nen = '<rect x="%.1f" y="60" width="%.1f" height="%.1f" rx="18" fill="%s" fill-opacity="0.35"/>' % (X0 + 6, 760 - X0 - 12, Y0 - 66, NEN)
    cong = duong(0, 9)
    bong = duong(0, 9).replace("M ", "M ").replace(" L ", " L ")
    xv, yv = 3, L(3)
    vx, vy = P(xv, yv)
    lop = [
        {"buoc": 0, "hieu_ung": "no", "nhan": "trục", "svg": nen + truc},
        {"buoc": 1, "hieu_ung": "sang", "nhan": "ẩn x", "khi_noi": "là số lần giảm 5 nghìn", "svg": '<line x1="96" y1="470" x2="760" y2="470" stroke="%s" stroke-width="3.5"/>' % CYAN + chu(744, 450, "x = số lần giảm", CYAN, 28, 700, "end")},
        {"buoc": 2, "hieu_ung": "ve", "nhan": "parabol", "khi_noi": "lợi nhuận là một hàm bậc hai",
         "svg": '<path d="%s" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="7" transform="translate(6 8)"/>' % bong
                + '<path d="%s" fill="none" stroke="%s" stroke-width="4.5" stroke-linecap="round"/>' % (cong, CYAN)
                + chu(470, 38, "L(x) = −200x² + 1200x + 32000", CYAN, 28)},
    ]
    for k, x in enumerate((0, 1, 2)):
        # mỗi lớp vẽ lại các điểm đã thử + nhãn điểm MỚI; cùng nhóm "thu" -> lớp sau thay lớp trước (không chồng nhãn)
        cham = "".join('<circle cx="%.1f" cy="%.1f" r="9" fill="%s"/>' % (P(u, L(u)) + (CYAN,)) for u in range(x + 1))
        px, py = P(x, L(x))
        lop.append({"buoc": 3, "hieu_ung": "moc", "nhan": "thử x = %d" % x, "khi_noi": ["giảm 0 lần", "giảm 1 lần", "giảm 2 lần"][k], "nhom": "thu",
                    "svg": cham + '<circle cx="%.1f" cy="%.1f" r="16" fill="none" stroke="%s" stroke-width="2.5"/>' % (px, py, CYAN)
                           + chu(px + 14, py + 46, "L = %d" % L(x), "#E9EEF5", 28, 700, "start")})
    lop.append({"buoc": 4, "hieu_ung": "sang", "nhan": "đỉnh", "khi_noi": "đỉnh của parabol", "nhom": "thu",
                "svg": "".join('<circle cx="%.1f" cy="%.1f" r="8" fill="%s"/>' % (P(u, L(u)) + (CYAN,)) for u in range(3)) + '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2" stroke-dasharray="8 7"/>' % (vx, vy, vx, Y0, HO)
                       + '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2" stroke-dasharray="8 7"/>' % (X0, vy, vx, vy, HO)
                       + '<circle cx="%.1f" cy="%.1f" r="22" fill="%s" fill-opacity="0.18"/>' % (vx, vy, HO)
                       + '<circle cx="%.1f" cy="%.1f" r="11" fill="%s" stroke="#2A2110" stroke-width="3"/>' % (vx, vy, HO)
                       + chu(vx, vy - 30, "đỉnh x = 3", HO, 30, 800)})
    lop.append({"buoc": 5, "hieu_ung": "no", "nhan": "kết quả", "khi_noi": "giá vé 85 nghìn",
                "svg": '<rect x="430" y="300" width="320" height="104" rx="24" fill="#2A2110" stroke="%s" stroke-width="2.5"/>' % HO
                       + chu(590, 342, "Giá vé 85 nghìn", HO, 30, 800) + chu(590, 384, "L max = 33,8 triệu", "#E9EEF5", 28, 700)})
    return lop
'''


def koch():
    return {
        "id": "V991-KOCH", "mon": "THUC_TE", "luong": "thuc_te_xac_suat", "lop": "11",
        "tieu_de": "Hòn đảo bông tuyết đáng giá bao nhiêu?", "chu_de": "Cấp số nhân lùi vô hạn",
        "de_bai": "Một hòn đảo nhân tạo được xây theo hình bông tuyết Koch: ban đầu là tam giác đều cạnh 200 m; mỗi lần, "
                  "chia mỗi cạnh thành 3 phần bằng nhau rồi dựng ra ngoài một tam giác đều trên đoạn giữa, lặp mãi. Giá đất "
                  "5 triệu đồng/m². Hỏi giá trị hòn đảo khoảng bao nhiêu tỷ đồng?",
        "dap_an_cuoi": "≈ 138,6 tỷ đồng", "cta": "Lưu lại để ôn cấp số nhân nhé!",
        "canh": [
            {"so": 1, "loai": "de_bai", "loi_thoai": "Hòn đảo mọc gai mãi mãi, vậy nó đáng giá bao nhiêu?", "noi_dung_man_hinh": []},
            {"so": 2, "loai": "tinh_toan", "loi_thoai": "Bắt đầu từ tam giác đều cạnh 200 mét. Diện tích là căn ba chia bốn nhân 200 bình phương, bằng 10000 căn ba mét vuông.",
             "noi_dung_man_hinh": ["S_0 = \\dfrac{\\sqrt{3}}{4} \\cdot 200^2 = 10000\\sqrt{3}"]},
            {"so": 3, "loai": "tinh_toan", "loi_thoai": "Lần một, mỗi cạnh mọc thêm một tam giác nhỏ. Cạnh nhỏ bằng một phần ba, nên diện tích bằng một phần chín. Ba tam giác thêm S không chia ba.",
             "noi_dung_man_hinh": ["3 \\cdot \\dfrac{S_0}{9} = \\dfrac{S_0}{3}"]},
            {"so": 4, "loai": "tinh_toan", "loi_thoai": "Lần thứ hai có 12 tam giác, mỗi cái nhỏ đi chín lần. Phần thêm nhân bốn phần chín. Cứ thế mãi, đây là bẫy: số gai tăng nhưng diện tích thêm nhỏ dần.",
             "noi_dung_man_hinh": ["q = \\dfrac{4}{9}"]},
            {"so": 5, "loai": "tinh_toan", "loi_thoai": "Cộng tất cả là tổng cấp số nhân lùi vô hạn. S bằng S không cộng S không chia ba chia cho một trừ bốn phần chín, bằng tám phần năm S không.",
             "noi_dung_man_hinh": ["S = S_0 + \\dfrac{S_0/3}{1 - 4/9} = \\dfrac{8}{5} S_0 \\approx 27713"]},
            {"so": 6, "loai": "dap_an", "loi_thoai": "Vậy giá trị hòn đảo là 27713 mét vuông nhân 5 triệu, khoảng 138,6 tỷ đồng.",
             "noi_dung_man_hinh": ["27713 \\cdot 5 \\approx 138{,}6 \\text{ tỷ}"]},
            {"so": 7, "loai": "ket_luan", "loi_thoai": "Mẹo: chu vi vô hạn nhưng diện tích hữu hạn. Lưu lại để ôn nhé!", "noi_dung_man_hinh": []},
        ],
        "tom_tat_3_buoc": [
            {"chien_thuat": "Diện tích gốc", "cong_thuc": "S_0 = 10000\\sqrt{3}"},
            {"chien_thuat": "Cấp số nhân lùi", "cong_thuc": "q = \\dfrac{4}{9}"},
            {"chien_thuat": "Kết luận"},
        ],
        "khung4tang": {
            "de_ghim": [{"id": "a", "nhan": "a = 200 m"}, {"id": "g", "nhan": "5 \\text{ tr}/m^2"}, {"id": "q", "nhan": "T = ?"}],
            "buoc": [
                {"canh": 1, "nhan": "Đề bài", "tieu_de": "Đảo bông tuyết Koch", "the": [{"loai": "chu", "noi_dung": "Gai mọc mãi, giá bao nhiêu?"}]},
                {"canh": 2, "khi_noi": "bắt đầu từ tam giác đều", "nhan": "Bước 1", "tieu_de": "Diện tích gốc", "du_kien": ["a"],
                 "the": [{"loai": "cong_thuc", "dong": ["S_0 = \\dfrac{\\sqrt{3}}{4} \\cdot 200^2 = 10000\\sqrt{3}"]}]},
                {"canh": 3, "khi_noi": "mỗi cạnh mọc thêm", "nhan": "Bước 2", "tieu_de": "Lần 1: thêm 3 tam giác",
                 "the": [{"loai": "cong_thuc", "dong": ["3 \\cdot \\dfrac{S_0}{9} = \\dfrac{S_0}{3}"]}]},
                {"canh": 4, "khi_noi": "lần thứ hai có 12 tam giác", "nhan": "Bước 3", "tieu_de": "Công bội 4/9",
                 "the": [{"loai": "cong_thuc", "dong": ["q = \\dfrac{4}{9}"]}]},
                {"canh": 5, "khi_noi": "tổng cấp số nhân lùi vô hạn", "nhan": "Bước 4", "tieu_de": "Tổng vô hạn",
                 "the": [{"loai": "cong_thuc", "dong": ["S = \\dfrac{8}{5} S_0 \\approx 27713"]}]},
                {"canh": 6, "khi_noi": "vậy giá trị hòn đảo", "nhan": "Kết luận", "tieu_de": "Giá trị đảo", "mau": "vang", "du_kien": ["g", "q"],
                 "the": [{"loai": "cong_thuc", "chot": True, "dong": ["T \\approx 138{,}6 \\text{ tỷ đồng}"]}]},
            ],
            "tu_sinh": {"ma": MA_KOCH.strip() + "\n", "mo_ta": "Đảo bông tuyết Koch 2.5D mọc gai qua 3 lần lặp"},
        },
    }


def parabol():
    return {
        "id": "V991-GIAVE", "mon": "THUC_TE", "luong": "thuc_te_xac_suat", "lop": "10",
        "tieu_de": "Giảm giá vé bao nhiêu thì lời nhất?", "chu_de": "Hàm số bậc hai",
        "de_bai": "Một rạp chiếu bán vé 100 nghìn đồng, mỗi ngày có 400 khách. Cứ giảm giá vé 5 nghìn đồng thì có thêm 40 khách. "
                  "Chi phí mỗi khách là 20 nghìn đồng. Định giá vé để lợi nhuận lớn nhất.",
        "dap_an_cuoi": "Giá vé 85 nghìn đồng, lợi nhuận lớn nhất 33,8 triệu đồng", "cta": "Bình luận nếu bạn giải ra trước nhé!",
        "canh": [
            {"so": 1, "loai": "de_bai", "loi_thoai": "Giảm giá vé thì lời hơn hay lỗ hơn?", "noi_dung_man_hinh": []},
            {"so": 2, "loai": "tinh_toan", "loi_thoai": "Gọi ít-sờ là số lần giảm 5 nghìn. Giá vé còn 100 trừ 5 ích, khách tăng lên 400 cộng 40 ích.",
             "noi_dung_man_hinh": ["\\text{Giá} = 100 - 5x,\\ \\text{Khách} = 400 + 40x"]},
            {"so": 3, "loai": "tinh_toan", "loi_thoai": "Mỗi vé lời 80 trừ 5 ích. Vậy lợi nhuận là một hàm bậc hai, mở xuống dưới.",
             "noi_dung_man_hinh": ["L(x) = (80 - 5x)(400 + 40x) = -200x^2 + 1200x + 32000"]},
            {"so": 4, "loai": "tinh_toan", "loi_thoai": "Thử nhanh: giảm 0 lần được 32000, giảm 1 lần được 33000, giảm 2 lần được 33600. Còn tăng, đừng dừng sớm!",
             "noi_dung_man_hinh": ["L(0) = 32000,\\ L(1) = 33000,\\ L(2) = 33600"]},
            {"so": 5, "loai": "tinh_toan", "loi_thoai": "Lợi nhuận lớn nhất tại đỉnh của parabol, ích bằng trừ bê chia hai a, bằng 3. lờ tại 3 là 33800.",
             "noi_dung_man_hinh": ["x = -\\dfrac{b}{2a} = 3", "L(3) = 33800"]},
            {"so": 6, "loai": "dap_an", "loi_thoai": "Vậy giá vé 85 nghìn đồng, lợi nhuận lớn nhất 33,8 triệu đồng bằng 33,8 triệu.",
             "noi_dung_man_hinh": ["L_{max} = 33{,}8 \\text{ triệu}"]},
            {"so": 7, "loai": "ket_luan", "loi_thoai": "Mẹo: hàm bậc hai thì tìm đỉnh, không cần thử hết. Bình luận nếu bạn giải ra trước nhé!", "noi_dung_man_hinh": []},
        ],
        "khung4tang": {
            "de_ghim": [{"id": "g", "nhan": "100k \\cdot 400"}, {"id": "d", "nhan": "-5k \\to +40"}, {"id": "q", "nhan": "x = ?"}],
            "buoc": [
                {"canh": 1, "nhan": "Đề bài", "tieu_de": "Giảm giá vé có lời?", "the": [{"loai": "chu", "noi_dung": "Giá vé tối ưu?"}]},
                {"canh": 2, "khi_noi": "là số lần giảm 5 nghìn", "nhan": "Bước 1", "tieu_de": "Đặt ẩn x", "du_kien": ["g", "d"],
                 "the": [{"loai": "cong_thuc", "dong": ["\\text{Giá} = 100 - 5x", "\\text{Khách} = 400 + 40x"]}]},
                {"canh": 3, "khi_noi": "mỗi vé lời 80", "nhan": "Bước 2", "tieu_de": "Lập hàm lợi nhuận",
                 "the": [{"loai": "cong_thuc", "dong": ["L(x) = -200x^2 + 1200x + 32000"]}]},
                {"nhan": "Bước 3", "tieu_de": "Thử vài giá trị", "khi_noi": "thử nhanh",
                 "the": [{"loai": "cong_thuc", "dong": ["L(0) = 32000", "L(2) = 33600"]}]},
                {"canh": 5, "khi_noi": "lợi nhuận lớn nhất tại đỉnh", "nhan": "Bước 4", "tieu_de": "Đỉnh parabol", "du_kien": ["q"],
                 "the": [{"loai": "cong_thuc", "dong": ["x = -\\dfrac{b}{2a} = 3"]}]},
                {"canh": 6, "khi_noi": "vậy giá vé 85 nghìn", "nhan": "Kết luận", "tieu_de": "Giá vé tối ưu", "mau": "vang",
                 "the": [{"loai": "cong_thuc", "chot": True, "dong": ["L_{max} = 33{,}8 \\text{ triệu}"]}]},
            ],
            "tu_sinh": {"ma": MA_PARABOL.strip() + "\n", "mo_ta": "Parabol lợi nhuận, điểm thử chạy dần tới đỉnh"},
        },
    }


if __name__ == "__main__":
    os.makedirs(os.path.join(GOC, "mau", "v99_1"), exist_ok=True)
    for ten, kb in (("koch_dao", koch()), ("gia_ve_parabol", parabol())):
        p = os.path.join(GOC, "mau", "v99_1", ten + ".json")
        with open(p, "w", encoding="utf8") as f:
            json.dump(kb, f, ensure_ascii=False, indent=1)
        print("ghi", p)
