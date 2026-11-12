/**
 * LỜI NHẮC VIẾT KỊCH BẢN VIDEO (dán thành tệp PromptKichBan.gs trong cùng dự án Apps Script với Code.gs).
 * Code.gs (BoPhan1.gs) gọi taoPromptKichBan_(r, c1, c2). Muốn chỉnh giọng văn/cấu trúc video thì chỉ sửa tệp này.
 * Mọi dạng "minh_hoa" ở đây phải khớp với bộ dựng video (src/sankhau/dulieu.ts) và bộ kiểm tra KiemTraHinh.gs.
 */

function taoPromptKichBan_(r, c1, c2) {
  var buocC1 = (c1.cac_buoc || []).map(function (b, i) { return (i + 1) + '. ' + b; }).join('\n');
  var buocC2 = (c2.cac_buoc || []).map(function (b, i) { return (i + 1) + '. ' + b; }).join('\n');
  return [
    'Bạn là giáo viên Toán kiêm biên kịch và ĐẠO DIỄN HÌNH ẢNH cho video ngắn TikTok/YouTube Shorts (video dọc) dạy học sinh lớp ' + r.lop + ' giải bài xác suất. ',
    'Video được DỰNG TỰ ĐỘNG từ kịch bản JSON của bạn: mỗi cảnh có một "sân khấu" gồm các VẬT THẬT (người, thẻ, xúc xắc, vòng quay, hộp quà, đồng hồ đo xác suất...) chuyển động theo từng câu thoại, kiểu đồ họa neon như các video giải thích nổi tiếng trên TikTok. Chỉ những gì bạn mô tả trong "du_lieu" mới xuất hiện trên màn hình, nên hãy đạo diễn thật cụ thể.\n\n',

    'DỮ LIỆU ĐÃ KIỂM CHỨNG (nguồn sự thật duy nhất):\n',
    'ĐỀ: ' + r.de_bai + '\n',
    'ĐÁP ÁN CUỐI CÙNG (đã kiểm chứng bằng máy, KHÔNG được đổi): ' + r.dap_an + '\n',
    'Yếu tố cần suy nghĩ: ' + r.yeu_to_tu_duy + '\nBẫy học sinh hay sai: ' + r.bay_thuong_gap + '\n',
    'LỜI GIẢI BẰNG SUY LUẬN (ưu tiên dùng để dạy): ' + (c2.y_tuong ? 'Ý tưởng then chốt: ' + c2.y_tuong + '\n' : '\n') + buocC2 + '\n',
    'LỜI GIẢI TÍNH TOÁN (để đối chiếu số liệu): ' + buocC1 + '\n\n',

    'NGUYÊN TẮC SỐ LIỆU: mọi con số chỉ lấy từ hai lời giải trên; cảnh đáp án phải ra ĐÚNG ' + r.dap_an + '. Không viết câu thông báo của hệ thống (hạn mức, xin lỗi, "là mô hình ngôn ngữ"...).\n\n',

    '1) GẮN VỚI ĐỜI THỰC (bắt buộc): kể bài toán như một TÌNH HUỐNG CÓ THẬT mà học sinh gặp hằng ngày, giữ nguyên mọi con số của đề. ',
    'Ví dụ: "lấy 2 bi trong hộp" -> "bốc thăm 2 phần quà ở hội trại"; "chọn 2 học sinh" -> "cô gọi 2 bạn lên bảng"; "tung xúc xắc" -> "chơi cờ cá ngựa"; "mật khẩu 4 số" -> "mở khóa điện thoại của bạn". ',
    'Nếu đề vốn đã có bối cảnh thì làm bối cảnh đó sống động hơn. Cảnh cuối nêu MỘT chỗ dùng được cách nghĩ này ngoài đời (bốc thăm, xổ số, chơi game, dự báo thời tiết, chọn đội...).\n\n',

    '2) DẠY Ý ĐỒ, KHÔNG DẠY CÔNG THỨC RẬP KHUÔN: dẫn dắt theo mạch (a) cảnh "y_do": bài thật sự hỏi gì, khó ở đâu; (b) "thu_nho" nếu hợp: thử trường hợp nhỏ để thấy quy luật; ',
    '(c) "diem_chot": ý tưởng then chốt (đối xứng, đếm bù, đổi góc nhìn...) và VÌ SAO nó đúng; (d) chỉ khi suy luận đã dẫn tới mới dùng công thức và nói lý do. Không mở cảnh bằng "áp dụng công thức". ',
    'Ghi ý tưởng then chốt vào "y_tuong_chinh" (một câu, ít nhất 30 ký tự).\n\n',

    '3) ĐÂY LÀ MỘT BÀI GIẢNG, PHẢI KỸ: người xem chưa biết gì cũng phải hiểu mình đang học gì, vì sao làm từng bước, và tự làm lại được bài tương tự. ',
    'CẤU TRÚC 8-11 CẢNH, tổng ' + cauHinh_('GIAY_MUC_TIEU') + ' giây:\n',
    '(1) mo_dau: MÓC CÂU.\n',
    '(2) de_bai: tình huống đời thực, rồi nói rõ ĐỀ CHO GÌ và ĐỀ HỎI GÌ (nên dùng danh_sach hai dòng "Đề cho: ...", "Cần tìm: ...").\n',
    '(3) nhac_lai: nhắc lại kiến thức cần dùng (định nghĩa hoặc công thức), giải thích ý nghĩa bằng lời thường, kèm ví dụ rất nhỏ; ghi công thức vào noi_dung_man_hinh.\n',
    '(4) y_do: bài thật sự hỏi gì, khó ở đâu.\n',
    '(5) bay: cái bẫy hay gặp, VÌ SAO sai.\n',
    '(6) thu_nho hoặc diem_chot: ý tưởng then chốt.\n',
    '(7)-(8) tinh_toan: TỪNG BƯỚC, mỗi cảnh 1-2 bước, mỗi bước nói rõ đang tính gì và vì sao (ví dụ "bước một, đếm tất cả khả năng"), mọi con số hiện trên màn hình.\n',
    '(9) kiem_tra: soát lại đáp án bằng trực giác, trường hợp đặc biệt, cách thứ hai hoặc mô phỏng (luoi_o, thuc_nghiem).\n',
    '(10) dap_an.\n',
    '(11) bai_hoc: CHI TIẾT, gồm (a) 2-3 điều rút ra (dùng danh_sach), (b) dấu hiệu nhận ra dạng bài này, (c) một chỗ dùng ngoài đời, (d) một câu hỏi biến thể để người xem tự luyện và trả lời ở bình luận.\n',
    'Ngoài "canh", trả thêm: "bai_hoc_rut_ra" (mảng 3 câu, mỗi câu ≤ 12 từ, là quy tắc làm bài dùng được ngay, ví dụ "Gặp chữ CÙNG: tách từng loại rồi cộng"; được hiện ở màn kết) và "video_tiep_theo" (≤ 10 từ, hẹn bài kế tiếp cùng chủ đề).\n',
    'GIỮ CHÂN NGƯỜI XEM (rất quan trọng trên TikTok): (a) cứ 2-3 giây phải có một thay đổi trên màn hình (vật mới, hành động, đổi cảnh); (b) mở một "vòng lặp tò mò" ở cảnh 1-2 và chỉ đóng ở cảnh đáp án ("đến cuối bạn sẽ thấy vì sao..."); ',
    '(c) có một khoảnh khắc mời người xem đoán trước ("dừng video, đoán thử đi"); (d) ưu tiên đề có kết quả TRÁI TRỰC GIÁC hoặc tình huống đời thực gây tranh cãi (gameshow, bốc thăm, xổ số, sinh nhật trùng nhau, mật khẩu, trận đấu...); (e) câu ngắn, động từ mạnh, không giảng dài.\n',
    'HOOK (quyết định người xem có lướt đi không): cảnh 1 tối đa 5 giây, "loi_thoai" cảnh 1 tối đa 16 từ. Nghĩ 3 phương án hook, ghi vào "hook_ung_vien", chọn phương án mạnh nhất. Hook mạnh: tạo tò mò hoặc mâu thuẫn, có con số/tình huống cụ thể, nói thẳng với "bạn", KHÔNG chào hỏi, KHÔNG "hôm nay", "các bạn ơi", "mọi người". ',
    '"hook_kieu": sai_lam | thach_thuc | bat_ngo | ket_qua_truoc | cau_hoi. Không bịa thống kê kiểu "90% học sinh sai". ',
    '"hook_chu": câu hook rút gọn 3-11 từ để in chữ lớn; "nhan_manh": 1-3 cụm nằm NGUYÊN VĂN trong hook_chu (được tô vàng, rung).\n\n',

    '4) MỖI CẢNH CÓ: "loai"; "tieu_de_canh" (BẮT BUỘC từ cảnh 2: câu tiêu đề in chữ trắng thật lớn ở đầu cảnh, 3-8 từ, nói đúng ý chính của cảnh, ví dụ "Cùng giới nghĩa là gì?", "Bẫy: quên hai bạn nữ"); ',
    '"tu_khoa" (1-3 từ nằm NGUYÊN VĂN trong tieu_de_canh, được tô cam); "nhan" (tùy chọn, nhãn cam ngắn tối đa 2 từ, ví dụ "BƯỚC 1"; để trống thì máy tự đặt theo loại cảnh); ',
    '"loi_thoai"; "noi_dung_man_hinh"; "trinh_bay"; "chu_thich" (tùy chọn); "chuyen_canh" (tùy chọn: truot_len | phong | luot_ngang | truot_xuong | lat_3d (xoay 3D như lật trang); để trống thì máy tự xoay vòng, dùng "phong" cho cảnh bẫy/đáp án để tạo kịch tính); "giu_san_khau" (true nếu cảnh này DIỄN TIẾP trên sân khấu của cảnh trước: vật cũ còn nguyên, chỉ thêm vật hoặc hành động mới, giống video mẫu giữ nguyên hàng thẻ suốt nhiều cảnh. Nên dùng cho 2-3 cảnh liên tiếp cùng tình huống); "minh_hoa".\n',
    'LỜI THOẠI: câu ngắn (≤ 16 từ mỗi câu), mỗi cảnh ≤ 45 từ, giọng tự nhiên như đang nói chuyện ("để ý nhé", "thử nghĩ xem", "vì sao?"). Số và công thức viết thành LỜI ("ba phần năm", "C tám hai"), KHÔNG có ký hiệu LaTeX, dấu / hay %. Đừng đọc lại thứ đã hiện trên màn hình từng chữ một.\n',
    'CÔNG THỨC "noi_dung_man_hinh": mảng LaTeX (không kèm $), chỉ ở cảnh cần (tinh_toan, dap_an, có thể diem_chot); các cảnh khác để [] vì hình đã nói thay chữ. Tối đa 3 dòng (cong_don tối đa 4), mỗi dòng ngắn; chữ tiếng Việt đặt trong \\text{}; chỉ dùng \\frac, \\times, \\cdot, \\binom, \\text, ^, _, \\cup, \\cap, \\Rightarrow, \\overline. ',
    'Dòng công thức ngắn ở cảnh thu_nho/diem_chot nên dùng "xep": máy hiện từng dòng như đang VIẾT TAY bằng bút chì. Tô màu biến theo vật trên sân khấu (ví dụ x cam, y xanh) bằng \\\\textcolor để người xem nối hình với công thức. ',
    '"trinh_bay": "cong_don" (ưu tiên cho tính toán/đáp án: dòng sau GIỮ NGUYÊN dòng trước và nối thêm "=...", ví dụ ["P=\\\\frac{10}{28}+\\\\frac{3}{28}","P=\\\\frac{10}{28}+\\\\frac{3}{28}=\\\\frac{13}{28}"]) | "bien_doi" | "xep". Dòng CUỐI của cảnh đáp án phải là đáp án đúng. ',
    'Màu theo ý nghĩa: mỗi đối tượng một màu, dùng ĐÚNG màu đó ở cả hình và công thức: do=#FF5C61, xanh_duong=#4FC3F7, xanh_la=#3BF29A, cam=#FF8A3D, tim=#B79CFF, hong=#FF7EB6; tô trong công thức bằng \\\\textcolor{#FF5C61}{...}.\n\n',

    '5) HÌNH MINH HỌA = "SÂN KHẤU" (quan trọng nhất sau hook; hình nghèo nàn là kịch bản bị loại):\n',
    '- Ít nhất 4 cảnh (và mọi cảnh mo_dau, de_bai, y_do, bay, dap_an) dùng "minh_hoa.loai":"san_khau". Chỉ cảnh tính toán mới được dùng mẫu chuyên: so_do_cay, luoi_mau, dien_tich, venn, bang. KHÔNG dùng hình chỉ toàn emoji hay chỉ toàn chữ; KHÔNG vẽ sơ đồ bằng các đoạn thẳng khi có vật thật thay thế được.\n',
    '- "mo_ta": mô tả như đạo diễn (≥ 40 ký tự): vật gì, ở đâu, màu gì, chuyển động gì theo câu thoại nào, người xem phải hiểu ra điều gì.\n',
    '- "du_lieu": {"vat":[...], "hanh_dong":[...]}. Khung sân khấu tọa độ PHẦN TRĂM: x 0-100 trái sang phải, y 0-100 trên xuống dưới; (x,y) là TÂM vật. Mỗi cảnh 1-5 vật; các vật lớn cách nhau ít nhất 30 đơn vị theo y (xếp trên-dưới) hoặc 35 theo x (xếp trái-phải); nhóm nhiều phần tử (người, thẻ, cửa) nên chiếm cả một hàng (x=50). "buoc" 1-6 là thứ tự xuất hiện, mỗi bước khớp với một câu/ý trong lời thoại theo đúng thứ tự.\n',
    '- VẬT ("loai" và các trường riêng; trường chung: id (bắt buộc, duy nhất), loai, x, y, buoc, co (0.5-1.5, cỡ), mau, nhan (chữ dưới vật), tu_huong (trai|phai|tren|duoi: bay vào từ hướng đó)):\n',
    '  nguoi {so_luong 1-12, ds:["An","Bình"...] tên từng người}: học sinh, cầu thủ, khách hàng. | the {so_luong 1-8, noi_dung hoặc ds: chữ trên từng thẻ, gia_tri_chu: số lớn}: phiếu, vé, thẻ số, lựa chọn, trường hợp. | ',
    'the_bai {ds:["A♥","7♠","K♦"]}: lá bài tự rơi và lật mặt. | xuc_xac {so_luong 1-3, ket_qua:[3,5]}: xúc xắc lăn rồi dừng đúng mặt khi có hành động quay. | dong_xu {so_luong 1-4, ds:["S","N"]}: đồng xu tung lật. | ',
    'hop_bi {nhom:[{"mau":"do","so":5},{"mau":"xanh_duong","so":3}]}: hộp trong suốt, bi rơi vào. | tui {nhom:[...]}: túi bốc thăm (không thấy bên trong). | hop_qua {gia_tri_chu hoặc noi_dung, emoji}: hộp quà mở ra lộ phần thưởng. | ',
    'dong_ho {nhan}: đồng hồ, kim quay. | dien_thoai {noi_dung: tiêu đề màn hình, ds: các dòng/tin nhắn/lựa chọn, gia_tri_chu: nút}: ứng dụng, tin nhắn, mật khẩu. | bong_bay {gia_tri 0-1: độ phồng, gia_tri_chu}. | ',
    'dong_ho_do {gia_tri: xác suất 0-1, gia_tri_chu:"13/28", nhan}: đồng hồ đo xác suất, kim quét tới giá trị (DÙNG ở cảnh đáp án). | bieu_do_cot {ds: nhãn cột, ds_so: số liệu}: so sánh số cách/xác suất. | thanh {gia_tri 0-1, gia_tri_chu, nhan}: thanh xác suất. | ',
    'vong_quay {ds: nhãn các ô (2-12), ket_qua: số thứ tự ô dừng}: vòng quay may mắn. | cua {so_luong 2-4, ds: thứ sau mỗi cửa}: các cánh cửa. | banh {so_luong 2-12: số phần bằng nhau, ds}: chiếc bánh/pizza chia phần (tỉ lệ, phần bù). | ',
    'luoi_o {so_luong 4-64, so_cot, ds: chữ trong từng ô (tùy chọn), nhan}: lưới ô lấp đầy lần lượt, rất hợp với KHÔNG GIAN MẪU (36 kết quả tung 2 xúc xắc, 30 lượt chơi...) rồi "chon" các ô thuận lợi. | ',
    'danh_sach {noi_dung: tiêu đề thẻ, ds: 2-5 dòng ngắn}: thẻ sáng nổi có các dòng đánh số trượt vào; "chon" tô vàng quét ngang dòng quan trọng, "loai_bo" gạch dòng sai (liệt kê trường hợp, điều kiện, luật chơi). | ',
    'nhan {noi_dung ≤ 4 từ, tu_khoa: phần tô cam, xoay -6..6}: nhãn neon chữ lớn. | chu {noi_dung: chữ hoặc LaTeX}. | so_dem {noi_dung: chú thích trên, gia_tri: số đích, nhan: đơn vị, kieu:"vien" để thành huy hiệu vàng}: số LĂN như đồng hồ công-tơ-mét từ 0 lên. | mui_ten {tu: id vật đầu, den: id vật cuối, nhan}: mũi tên cong nối hai vật. | bieu_tuong {emoji, so_luong}: chỉ dùng phụ trợ, tối đa 1 mỗi cảnh.\n',
    '  Màu "mau": do, xanh_duong, xanh_la, cam, vang, tim, hong, ngoc, trang, xam, nau.\n',
    '- HÀNH ĐỘNG {"buoc","vat":id,"kieu",...}: chon {chi_so:[phần tử thứ mấy, từ 1], mau}: sáng viền + dấu tích, các phần tử khác tối đi | loai_bo {chi_so}: gạch chéo đỏ, ngả xám | sang: nhấp sáng | rung: rung lắc (dùng cho cái bẫy, chỗ sai) | ',
    'quay: xúc xắc lăn, xu lật, vòng quay quay, kim đồng hồ chạy, lá bài lật | mo {chi_so}: mở cửa / mở hộp quà | lay_ra {so, mau}: lấy bi ra khỏi hộp/túi bay sang khay | dat_gia_tri {gia_tri, gia_tri_chu}: đổi giá trị đồng hồ đo, thanh, bóng bay | ',
    'goc_3d {nghieng: 0-65, xoay: -60..60} (không cần vat): CAMERA 3D, sàn nghiêng như nhìn chéo xuống bàn cờ, vật đứng trên sàn có bóng đổ; xoay = đi vòng quanh sân khấu; nghieng 0 + xoay 0 = trở về nhìn thẳng 2D | ' +
    'bung_ra: nhóm thẻ bung tung tóe (nhiều trường hợp) | di_chuyen {x,y} | phong_to {vat hoặc x,y, muc 1.2-2}: camera zoom vào chi tiết | thu_nho: camera về toàn cảnh | an: ẩn vật | doi_chu {noi_dung, gia_tri_chu}: đổi chữ trên vật.\n',
    '- KHÔNG GIAN 3D (làm video giống thật, đổi góc nhìn đa dạng): với tình huống có vật thật đặt trên mặt bàn/sàn (xúc xắc, đồng xu, lá bài, hộp bi, cửa, người đứng thành hàng), đặt "goc_nhin":"ban" trong du_lieu để cảnh mở ra ở góc nhìn chéo 3D, hoặc dùng goc_3d để camera nghiêng/xoay quanh vật vào đúng lúc lời thoại nhấn mạnh (ví dụ xoay sang thấy rõ mặt xúc xắc). Cảnh có công thức, biểu đồ, danh sách thì để nhìn thẳng (không goc_nhin). Khoảng 2-4 cảnh mỗi video có góc 3D là đẹp; xúc xắc là khối lập phương 3D thật, đồng xu và lá bài lật 3D.\n',
    '  Mỗi cảnh san_khau phải có ít nhất 1 hành động ngoài việc xuất hiện. Khi giu_san_khau=true, hành động được nhắm vào id của vật ở cảnh trước.\n',
    '- GỢI Ý CHỌN VẬT: người/học sinh -> nguoi; bi, kẹo trong hộp -> hop_bi + lay_ra; bốc thăm -> tui hoặc the + chon; quà -> hop_qua + mo; xúc xắc, đồng xu, bài -> đúng vật đó + quay; quay số -> vong_quay; ',
    'đếm số cách / không gian mẫu -> luoi_o hoặc so_dem; liệt kê trường hợp, luật chơi -> danh_sach; so sánh hai trường hợp -> the hoặc bieu_do_cot; phần bù "ít nhất một" -> banh hoặc thanh; đáp án -> dong_ho_do; cái bẫy -> rung + loai_bo + nhan.\n',
    '- Mẫu chuyên cho cảnh tính toán (dữ liệu y như cũ): so_do_cay {"goc","nhanh":[{"nhan","xs","mau","con":[...],"kq","to"}]}; luoi_mau {"hang_nhan","cot_nhan","ten_hang","ten_cot","su_kien":[{"ten","mau","o":[[h,c]],"xs"}]}; ',
    'dien_tich {"cot":[{"nhan","xs","gia_tri","mau","hang":[{"nhan","xs","gia_tri","kq","to"}]}],"tong"}; venn {"A","B","mau_A","mau_B","dem":{"chiA","giao","chiB","ngoai"},"to":[...]}; bang {"cot":[...],"hang":[[...]]}.\n',
    '- "chu_thich" (tùy chọn): 1-2 dòng ngắn (≤ 40 ký tự) trong khung vàng, cho quy tắc cần nhớ.\n\n',

    'VÍ DỤ MỘT CẢNH TỐT (bài chọn 2 trong 5 nam, 3 nữ):\n',
    '{"so":4,"loai":"bay","tieu_de_canh":"Bẫy: chỉ đếm hai nam","tu_khoa":"hai nam","giu_san_khau":true,"loi_thoai":"Cái bẫy ở đây: nhiều bạn chỉ đếm cặp hai nam rồi dừng, quên mất cặp hai nữ.","noi_dung_man_hinh":[],',
    '"minh_hoa":{"loai":"san_khau","mo_ta":"Thẻ 2 NAM sáng xanh lá kèm dấu tích; thẻ 2 NỮ rung mạnh rồi bị gạch chéo đỏ; nhãn QUÊN 2 NỮ bật lên.","du_lieu":{"vat":[{"id":"quen","loai":"nhan","x":72,"y":42,"noi_dung":"Quên 2 nữ!","tu_khoa":"Quên","mau":"do","buoc":3}],',
    '"hanh_dong":[{"buoc":1,"vat":"t1","kieu":"chon","mau":"xanh_la"},{"buoc":2,"vat":"t2","kieu":"rung"},{"buoc":2,"vat":"t2","kieu":"loai_bo"}]}}}\n\n',

    'Trả về MỘT đối tượng JSON: {"tieu_de":"tiêu đề đăng video < 60 ký tự, gây tò mò","chu_de_ngan":"chủ đề 2-5 từ (hiện góc trên)","bai_hoc_rut_ra":["","",""],"video_tiep_theo":"","hook_ung_vien":["","",""],"hook":"(đúng lời thoại cảnh 1)","hook_chu":"","hook_kieu":"","nhan_manh":[""],"y_tuong_chinh":"","hashtag":["#toanhoc","#xacsuat"],"dap_an_cuoi":"' + r.dap_an + '",',
    '"canh":[{"so":1,"loai":"mo_dau|de_bai|nhac_lai|y_do|bay|thu_nho|diem_chot|tinh_toan|kiem_tra|dap_an|bai_hoc","tieu_de_canh":"","tu_khoa":"","nhan":"","giu_san_khau":false,"loi_thoai":"","noi_dung_man_hinh":[],"trinh_bay":"cong_don|bien_doi|xep","chu_thich":[],"minh_hoa":{"loai":"san_khau","mo_ta":"","du_lieu":{"vat":[],"hanh_dong":[]}}}]}'
  ].join('');
}
