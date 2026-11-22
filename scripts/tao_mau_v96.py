#!/usr/bin/env python3
"""v96 — sinh 4 kịch bản mẫu nghiệm thu vào mau/v96/ (+ mau/loi_qua_dem/vd_153504.json). Chạy: python scripts/tao_mau_v96.py"""
import json
import os

GOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

M1 = {
    "_ghi_chu": "v96 — tái hiện lỗi VD261122-153504-0 (dựng lại, không phải JSON thật): nhóm thẻ ghi SỐ LƯỢNG {so:2,3,5} -> bản cũ tô theo chỉ số ô "
                "{1,2},{3,4,5},{6..10}; tiêu đề '\\overline{A}: Tích 3 số \\not\\vdots 4' (KaTeX mất gạch chéo -> ngược nghĩa); đọc lặp đề 3 lần "
                "(mo_dau + de_bai + nhac_lai); câu cụt 'ta có số phần tử không gian mẫu.' không đọc 120; Outro chiến thuật lộ \\overline / C_.",
    "id": "V96-THE10", "mon": "XAC_SUAT", "luong": "thuc_te_xac_suat", "lop": "11", "tieu_de": "Rút 3 thẻ, tích chia hết cho 4", "chu_de": "Biến cố đối",
    "de_bai": "Rút ngẫu nhiên đồng thời 3 thẻ từ 10 thẻ đánh số từ 1 đến 10. Tính xác suất để tích 3 số trên 3 thẻ rút được chia hết cho 4.",
    "dap_an_cuoi": "P(A) = 2/3", "tieu_de_intro": "TÍCH CHIA HẾT CHO 4?", "cta": "Bình luận nhé!",
    "tom_tat_3_buoc": [{"chien_thuat": "Đếm n(\\Omega)", "cong_thuc": "C_{10}^{3} = 120"},
                       {"chien_thuat": "Xét \\overline{A}: tích \\not\\vdots 4", "cong_thuc": "n(\\overline{A}) = 10 + 30 = 40"},
                       {"chien_thuat": "Lấy phần bù", "cong_thuc": "P(A) = 1 - \\dfrac{40}{120} = \\dfrac{2}{3}"}],
    "canh": [
        {"so": 1, "loai": "mo_dau", "loi_thoai": "Rút ngẫu nhiên đồng thời 3 thẻ từ 10 thẻ đánh số từ 1 đến 10, xác suất tích chia hết cho 4 là bao nhiêu?", "noi_dung_man_hinh": []},
        {"so": 2, "loai": "de_bai", "loi_thoai": "Đề bài: rút ngẫu nhiên đồng thời 3 thẻ từ 10 thẻ đánh số từ 1 đến 10. Tính xác suất để tích 3 số trên 3 thẻ rút được chia hết cho 4.", "noi_dung_man_hinh": []},
        {"so": 3, "loai": "nhac_lai", "loi_thoai": "Nhắc lại: rút ngẫu nhiên đồng thời 3 thẻ từ 10 thẻ đánh số từ 1 đến 10, tính xác suất tích 3 số trên 3 thẻ chia hết cho 4.", "noi_dung_man_hinh": []},
        {"so": 4, "loai": "tinh_toan", "loi_thoai": "Trước hết ta có số phần tử không gian mẫu.", "noi_dung_man_hinh": ["n(\\Omega) = C_{10}^{3} = 120"]},
        {"so": 5, "loai": "tinh_toan", "loi_thoai": "Ta chia các số thành ba nhóm: chia hết cho 4 gồm 4 và 8, chẵn mà không chia hết cho 4 gồm 2, 6, 10, còn lại là 5 số lẻ.", "noi_dung_man_hinh": []},
        {"so": 6, "loai": "tinh_toan", "loi_thoai": "Xét biến cố đối: tích không chia hết cho 4. Thử rút 1, 2 và 3: tích bằng 6, không chia hết cho 4.", "noi_dung_man_hinh": []},
        {"so": 7, "loai": "tinh_toan", "loi_thoai": "Biến cố đối xảy ra khi ba số đều lẻ, có 10 cách, hoặc đúng một số chẵn không chia hết cho 4 và hai số lẻ, có 30 cách. Vậy n của A ngang bằng 40.",
         "noi_dung_man_hinh": ["n(\\overline{A}) = C_5^3 + 3 \\cdot C_5^2 = 40"]},
        {"so": 8, "loai": "dap_an", "loi_thoai": "Vậy xác suất cần tìm bằng 1 trừ 40 phần 120, bằng 2/3. Thử rút 2, 3, 4: tích 24 chia hết cho 4.", "noi_dung_man_hinh": ["P(A) = 1 - \\dfrac{40}{120} = \\dfrac{2}{3}"]},
        {"so": 9, "loai": "ket_luan", "loi_thoai": "Đổi thành chia hết cho 3 thì ra mấy? Bình luận nhé!", "noi_dung_man_hinh": []}],
    "khung4tang": {
        "de_ghim": [{"id": "n", "nhan": "1 \\dots 10"}, {"id": "k", "nhan": "k = 3"}, {"id": "p", "nhan": "P(A) = ?", "mau": "hong"}],
        "buoc": [
            {"canh": 1, "nhan": "Đề bài", "tieu_de": "Tích 3 thẻ chia hết cho 4?", "du_kien": ["n", "k"], "the": [{"loai": "chu", "noi_dung": "Rút 3 thẻ từ 1..10"}]},
            {"canh": 4, "khi_noi": "số phần tử không gian", "nhan": "Đếm", "tieu_de": "Không gian mẫu \\Omega", "du_kien": ["n", "k"],
             "the": [{"loai": "cong_thuc", "dong": ["n(\\Omega) = C_{10}^{3} = 120"], "khi_noi": "không gian mẫu"}]},
            {"canh": 6, "khi_noi": "xét biến cố đối", "nhan": "Biến cố đối", "tieu_de": "\\overline{A}: Tích 3 số \\not\\vdots 4",
             "the": [{"loai": "cong_thuc", "dong": ["n(\\overline{A}) = C_5^3 + 3 \\cdot C_5^2 = 40"], "khi_noi": "biến cố đối xảy ra"}]},
            {"canh": 8, "khi_noi": "vậy xác suất cần tìm", "nhan": "Kết luận", "tieu_de": "P(A) = ?", "du_kien": ["p"],
             "the": [{"loai": "cong_thuc", "dong": ["P(A) = 1 - \\dfrac{40}{120} = \\dfrac{2}{3}"], "khi_noi": "vậy xác suất"}]}],
        "canh_3d_vector": {"khuon": "luoi_the_bi_xac_suat", "tham_so": {"vat": "the", "N": 10, "k": 3,
                                                                         "nhom": [{"mau": "vang", "so": 2}, {"mau": "cyan", "so": 3}, {"mau": "xam", "so": 5}], "chon": [[1, 3, 5]]}}}}

M2 = {
    "id": "V96-BAYES", "mon": "XAC_SUAT", "luong": "thuc_te_xac_suat", "lop": "12", "tieu_de": "Xét nghiệm dương tính", "chu_de": "Công thức Bayes",
    "de_bai": "Một bệnh có tỉ lệ mắc 1%. Xét nghiệm cho kết quả dương tính với 99% người mắc bệnh và 5% người không mắc bệnh. Một người xét nghiệm dương tính. Tính xác suất người đó thật sự mắc bệnh.",
    "dap_an_cuoi": "P(A|B) ≈ 0,1667", "cta": "Lưu lại kẻo quên!",
    "canh": [
        {"so": 1, "loai": "de_bai", "loi_thoai": "Bệnh tỉ lệ 1%, xét nghiệm đúng 99% với người bệnh, nhầm 5% với người khỏe. Dương tính thì bao nhiêu phần trăm là bệnh thật?", "noi_dung_man_hinh": []},
        {"so": 2, "loai": "tinh_toan", "loi_thoai": "Gọi A là mắc bệnh, B là dương tính. Tỉ lệ mắc bệnh chỉ 1 phần trăm, một dải rất hẹp.", "noi_dung_man_hinh": ["P(A) = 0{,}01"]},
        {"so": 3, "loai": "tinh_toan", "loi_thoai": "Trong số người bệnh, 99% dương tính; trong số người khỏe vẫn có 5% dương tính.", "noi_dung_man_hinh": ["P(B \\mid A) = 0{,}99"]},
        {"so": 4, "loai": "tinh_toan", "loi_thoai": "Phần giao: vừa mắc bệnh vừa dương tính là 0,0099; khỏe mà dương tính là 0,0495. Cộng lại P của B bằng 0,0594.",
         "noi_dung_man_hinh": ["P(B) = 0{,}0099 + 0{,}0495 = 0{,}0594"]},
        {"so": 5, "loai": "dap_an", "loi_thoai": "Vậy xác suất mắc bệnh khi dương tính chỉ khoảng 0,1667, tức chưa tới 17%.", "noi_dung_man_hinh": ["P(A \\mid B) \\approx 0{,}1667"]},
        {"so": 6, "loai": "ket_luan", "loi_thoai": "Lưu lại kẻo quên công thức này!", "noi_dung_man_hinh": []}],
    "khung4tang": {
        "de_ghim": [{"id": "a", "nhan": "P(A) = 1\\%"}, {"id": "b", "nhan": "P(B|A) = 99\\%"}, {"id": "c", "nhan": "P(B|\\overline{A}) = 5\\%"}, {"id": "q", "nhan": "P(A|B) = ?", "mau": "hong"}],
        "buoc": [
            {"canh": 1, "nhan": "Đề bài", "tieu_de": "Dương tính có chắc mắc bệnh?", "the": [{"loai": "chu", "noi_dung": "Tỉ lệ mắc bệnh 1%"}]},
            {"canh": 2, "khi_noi": "gọi a là mắc bệnh", "nhan": "Chia lưới", "tieu_de": "Cắt theo P(A)", "du_kien": ["a"], "the": [{"loai": "cong_thuc", "dong": ["P(A) = 0{,}01"]}]},
            {"canh": 3, "khi_noi": "trong số người bệnh", "nhan": "Cắt ngang", "tieu_de": "Tỉ lệ dương tính mỗi nhóm", "du_kien": ["b", "c"],
             "the": [{"loai": "cong_thuc", "dong": ["P(B \\mid A) = 0{,}99", "P(B \\mid \\overline{A}) = 0{,}05"]}]},
            {"canh": 4, "khi_noi": "phần giao", "nhan": "Toàn phần", "tieu_de": "Tính P(B)", "the": [{"loai": "cong_thuc", "dong": ["P(B) = 0{,}0594"]}]},
            {"canh": 5, "khi_noi": "vậy xác suất mắc bệnh", "nhan": "Bayes", "tieu_de": "P(A|B) = ?", "du_kien": ["q"],
             "the": [{"loai": "cong_thuc", "dong": ["P(A \\mid B) = \\dfrac{0{,}0099}{0{,}0594} \\approx 0{,}1667"]}]}],
        "san_khau": {"loai": "luoi_bayes", "tham_so": {"A": {"nhan": "mắc bệnh", "p": "1%"}, "B": {"nhan": "dương tính"}, "p_B_A": "99%", "p_B_khong_A": "5%", "hoi": "A|B"},
                     "pha": [{"ten": "vuong"}, {"ten": "cat_doc", "khi_noi": "tỉ lệ mắc bệnh chỉ"}, {"ten": "cat_ngang", "khi_noi": "trong số người bệnh"},
                             {"ten": "giao", "khi_noi": "phần giao"}, {"ten": "ket", "khi_noi": "vậy xác suất mắc bệnh"}]}}}

M3 = {
    "id": "V96-LOINHUAN", "mon": "THUC_TE", "luong": "thuc_te_xac_suat", "lop": "12", "tieu_de": "Giảm giá bao nhiêu để lãi nhất?", "chu_de": "Tối ưu lợi nhuận",
    "de_bai": "Một quán bán trà sữa giá 30 nghìn đồng mỗi ly, mỗi ngày bán được 200 ly, giá vốn 10 nghìn đồng. Cứ giảm giá 1 nghìn đồng thì bán thêm 20 ly. Giảm giá bao nhiêu để lợi nhuận lớn nhất?",
    "dap_an_cuoi": "Giảm 5 nghìn đồng, lợi nhuận lớn nhất 4500 nghìn đồng", "cta": "Bình luận nhé!",
    "canh": [
        {"so": 1, "loai": "de_bai", "loi_thoai": "Trà sữa 30 nghìn, bán 200 ly, vốn 10 nghìn; giảm 1 nghìn bán thêm 20 ly. Giảm bao nhiêu thì lãi nhất?", "noi_dung_man_hinh": []},
        {"so": 2, "loai": "tinh_toan", "loi_thoai": "Gọi x là số nghìn đồng giảm giá. Giá bán còn 30 trừ x, số ly là 200 cộng 20x.", "noi_dung_man_hinh": ["0 \\le x \\le 20"]},
        {"so": 3, "loai": "tinh_toan", "loi_thoai": "Hàm lợi nhuận bằng 20 trừ x nhân 200 cộng 20x. Nếu giảm ít thì bán ít, giảm nhiều thì lãi mỗi ly mỏng.", "noi_dung_man_hinh": ["L(x) = (20 - x)(200 + 20x)"]},
        {"so": 4, "loai": "tinh_toan", "loi_thoai": "L là hàm bậc hai có hệ số âm, đạt lớn nhất tại đỉnh x bằng 5.", "noi_dung_man_hinh": ["L(x) = -20x^2 + 200x + 4000", "x = -\\dfrac{b}{2a} = 5"]},
        {"so": 5, "loai": "dap_an", "loi_thoai": "Vậy giảm 5 nghìn đồng, lợi nhuận lớn nhất 4500 nghìn đồng mỗi ngày.", "noi_dung_man_hinh": ["L(5) = 4500"]},
        {"so": 6, "loai": "ket_luan", "loi_thoai": "Nếu giá vốn tăng lên 12 nghìn thì sao? Bình luận nhé!", "noi_dung_man_hinh": []}],
    "khung4tang": {
        "de_ghim": [{"id": "g", "nhan": "30k \\to 200"}, {"id": "v", "nhan": "v = 10k"}, {"id": "x", "nhan": "x = ?", "mau": "hong"}],
        "buoc": [
            {"canh": 1, "nhan": "Đề bài", "tieu_de": "Giảm giá để lãi nhất?", "the": [{"loai": "chu", "noi_dung": "Giảm 1k, thêm 20 ly"}]},
            {"canh": 2, "khi_noi": "gọi x là số", "nhan": "Đặt ẩn", "tieu_de": "Giá bán và số ly theo x", "du_kien": ["x"], "the": [{"loai": "cong_thuc", "dong": ["0 \\le x \\le 20"]}]},
            {"canh": 3, "khi_noi": "hàm lợi nhuận", "nhan": "Lập hàm", "tieu_de": "Lợi nhuận L(x)", "the": [{"loai": "cong_thuc", "dong": ["L(x) = (20 - x)(200 + 20x)"]}]},
            {"canh": 4, "khi_noi": "hàm bậc hai", "nhan": "Tối ưu", "tieu_de": "Đỉnh của hàm bậc hai", "the": [{"loai": "cong_thuc", "dong": ["x = -\\dfrac{b}{2a} = 5"]}]},
            {"canh": 5, "khi_noi": "vậy giảm", "nhan": "Kết luận", "tieu_de": "Lãi lớn nhất khi x = ?", "the": [{"loai": "cong_thuc", "dong": ["L_{max} = L(5) = 4500"]}]}],
        "san_khau": {"loai": "kinh_te_do_thi",
                     "tham_so": {"ham": "(20-x)(200+20x)", "bien": "x", "mien": [0, 20], "kieu": "max", "ten_ham": "L", "nhan_bien": "Giảm giá x (nghìn đồng)",
                                 "nhan_ham": "lợi nhuận (nghìn đồng)", "don_vi": "nghìn đồng",
                                 "phu": [{"ten": "Giá bán", "ham": "30-x", "don_vi": "k"}, {"ten": "Số ly", "ham": "200+20x", "don_vi": "ly"}]},
                     "pha": [{"ten": "truc"}, {"ten": "ve", "khi_noi": "hàm lợi nhuận"}, {"ten": "keo", "khi_noi": "nếu giảm ít"},
                             {"ten": "toi_uu", "khi_noi": "đạt lớn nhất"}, {"ten": "ket", "khi_noi": "vậy giảm"}]}}}

M4 = {
    "id": "V96-DAISO", "mon": "THUC_TE", "luong": "thuc_te_xac_suat", "lop": "12", "tieu_de": "Phương trình mũ", "chu_de": "Đại số",
    "chi_dao": "[chidao: chỉ dùng sơ đồ tư duy]",
    "de_bai": "Giải phương trình 4^x - 3 \\cdot 2^x + 2 = 0.", "dap_an_cuoi": "x = 0 hoặc x = 1", "cta": "Lưu lại kẻo quên!",
    "canh": [
        {"so": 1, "loai": "de_bai", "loi_thoai": "Giải phương trình 4 mũ x trừ 3 nhân 2 mũ x cộng 2 bằng 0.", "noi_dung_man_hinh": []},
        {"so": 2, "loai": "tinh_toan", "loi_thoai": "Nhận ra 4 mũ x là bình phương của 2 mũ x, đặt t bằng 2 mũ x lớn hơn 0.", "noi_dung_man_hinh": ["t = 2^x > 0"]},
        {"so": 3, "loai": "tinh_toan", "loi_thoai": "Phương trình thành t bình phương trừ 3t cộng 2 bằng 0, nên t bằng 1 hoặc t bằng 2.", "noi_dung_man_hinh": ["t^2 - 3t + 2 = 0"]},
        {"so": 4, "loai": "dap_an", "loi_thoai": "Vậy x bằng 0 hoặc x bằng 1.", "noi_dung_man_hinh": ["x = 0;\\ x = 1"]},
        {"so": 5, "loai": "ket_luan", "loi_thoai": "Lưu lại kẻo quên cách đặt ẩn phụ này!", "noi_dung_man_hinh": []}],
    "khung4tang": {
        "de_ghim": [{"id": "p", "nhan": "4^x - 3 \\cdot 2^x + 2 = 0"}, {"id": "x", "nhan": "x = ?", "mau": "hong"}],
        "buoc": [
            {"canh": 1, "nhan": "Đề bài", "tieu_de": "Phương trình mũ", "the": [{"loai": "cong_thuc", "dong": ["4^x - 3 \\cdot 2^x + 2 = 0"]}]},
            {"canh": 2, "khi_noi": "đặt t bằng", "nhan": "Đặt ẩn phụ", "tieu_de": "Đưa về ẩn t", "the": [{"loai": "cong_thuc", "dong": ["t = 2^x > 0"]}]},
            {"canh": 3, "khi_noi": "phương trình thành", "nhan": "Bậc hai", "tieu_de": "Giải theo t", "the": [{"loai": "cong_thuc", "dong": ["t^2 - 3t + 2 = 0 \\Rightarrow t = 1;\\ t = 2"]}]},
            {"canh": 4, "khi_noi": "vậy x bằng", "nhan": "Trả biến", "tieu_de": "Tìm x", "the": [{"loai": "cong_thuc", "dong": ["2^x = 1 \\Rightarrow x = 0;\\ 2^x = 2 \\Rightarrow x = 1"]}]}],
        "canh_3d_vector": {"khuon": "tam_bia_gap_hop", "tham_so": {}}}}

# lời giảng bổ sung (nối SAU câu gốc, giữ nguyên mọi cụm khi_noi) để video đạt nhịp 55-70 s như kịch bản Gemini thật
THEM = {
    "V96-THE10": {5: "Vì tích chia hết cho 4 cần đủ hai thừa số 2, nên chỉ cần xem mỗi số góp mấy thừa số 2.",
                  7: "Cụ thể, chọn 3 trong 5 số lẻ có 10 cách; chọn 1 trong 3 số 2, 6, 10 rồi 2 trong 5 số lẻ có 3 nhân 10 bằng 30 cách.",
                  8: "Nghĩa là cứ 3 lần rút thì khoảng 2 lần tích chia hết cho 4.",
                  9: "Tóm lại: đếm không gian mẫu, đếm biến cố đối, rồi lấy phần bù."},
    "V96-BAYES": {2: "Trên lưới vuông, cột A chỉ rộng 1 phần trăm, cột A ngang chiếm 99 phần trăm còn lại.",
                  3: "Ở cột A phần dương tính gần như phủ kín, còn ở cột A ngang chỉ là một dải mỏng dưới đáy, nhưng dải đó rất dài.",
                  4: "Vậy trong số người dương tính, phần lớn lại là người khỏe, vì người khỏe đông hơn rất nhiều.",
                  5: "Công thức Bayes: lấy phần giao 0,0099 chia cho tổng dương tính 0,0594. Tức là chưa tới 17 trên 100 người dương tính thật sự mắc bệnh, nên cần xét nghiệm lại lần hai.",
                  6: "Tóm lại: chia lưới theo tỉ lệ mắc bệnh, cắt theo tỉ lệ dương tính, rồi lấy phần giao chia tổng."},
    "V96-LOINHUAN": {2: "Điều kiện: giảm không quá 20 nghìn để vẫn còn lãi. Mỗi ly còn lãi 20 trừ x nghìn sau khi trừ giá vốn 10 nghìn.",
                     3: "Đây là cuộc giằng co giữa số ly bán được và tiền lãi mỗi ly. Giảm 2 nghìn thì lãi 18 nhân 240 bằng 4320; giảm 8 nghìn cũng chỉ 12 nhân 360 bằng 4320.",
                     4: "Hệ số a bằng âm 20, b bằng 200, nên đỉnh tại x bằng âm b chia 2a, bằng 5.",
                     5: "Khi đó giá bán 25 nghìn, bán 300 ly, mỗi ly lãi 15 nghìn, cao hơn hẳn mức 4000 nghìn lúc chưa giảm giá.",
                     6: "Tóm lại: đặt ẩn là mức giảm, lập hàm lợi nhuận bậc hai, rồi tìm đỉnh."},
}


def lam_day(m):
    for c in m["canh"]:
        them = THEM.get(m["id"], {}).get(c["so"])
        if them:
            c["loi_thoai"] = (them + " " + c["loi_thoai"]) if c["loai"] == "ket_luan" else (c["loi_thoai"] + " " + them)
    return m


if __name__ == "__main__":
    for m in (M1, M2, M3):
        lam_day(m)
    os.makedirs(os.path.join(GOC, "mau", "v96"), exist_ok=True)
    for ten, m in (("vd_153504", M1), ("bayes_xet_nghiem", M2), ("loi_nhuan_tra_sua", M3), ("dai_so_chi_dao", M4)):
        json.dump(m, open(os.path.join(GOC, "mau", "v96", ten + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(M1, open(os.path.join(GOC, "mau", "loi_qua_dem", "vd_153504.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Đã ghi 4 mẫu vào mau/v96/ (+ mau/loi_qua_dem/vd_153504.json)")
