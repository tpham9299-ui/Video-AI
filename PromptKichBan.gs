/**
 * LỜI NHẮC VIẾT KỊCH BẢN VIDEO (dán thành tệp PromptKichBan.gs trong cùng dự án Apps Script với BoPhan1.gs).
 * BoPhan1.gs gọi taoPromptKichBan_(r, c1, c2). Muốn chỉnh giọng văn/cấu trúc video thì chỉ sửa tệp này.
 * Hai loại video: XÁC SUẤT (đáp án phân số) và TOÁN THỰC TẾ (r.mon = 'THUC_TE', đáp số là một con số, cảnh 3D thật + mô hình hóa).
 * Mọi dạng "minh_hoa" ở đây phải khớp với bộ dựng video (src/sankhau/dulieu.ts) và bộ kiểm tra KiemTraHinh.gs.
 */

function taoPromptKichBan_(r, c1, c2) {
  var hh = typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r);
  var tt = (typeof laMonThucTe_ === 'function' && laMonThucTe_(r)) || hh;   // bài hình học dùng khung "đáp số / thử lại" của toán thực tế + hướng dẫn hình học riêng
  var buocC1 = (c1.cac_buoc || []).map(function (b, i) { return (i + 1) + '. ' + b; }).join('\n');
  var buocC2 = (c2.cac_buoc || []).map(function (b, i) { return (i + 1) + '. ' + b; }).join('\n');
  var chao = String(cauHinh_('KIEU_MO_DAU') || 'hook') === 'chao_hook';
  var dauVao = tt ? [
    'Bạn là giáo viên Toán kiêm biên kịch và ĐẠO DIỄN HÌNH ẢNH 3D cho video ngắn TikTok/YouTube Shorts (video dọc) dạy học sinh lớp ' + r.lop + ' giải một BÀI TOÁN THỰC TẾ. ',
    'Video được DỰNG TỰ ĐỘNG từ kịch bản JSON của bạn: mỗi cảnh có một "sân khấu" 3D (bể nước, lon, tòa nhà, thang, xe, cây... đặt trên sàn, camera nghiêng và xoay được) hòa với hình học phẳng (tam giác, góc, cạnh có độ dài) và đồ thị hàm số vẽ dần kiểu Manim. Chỉ những gì bạn mô tả trong "du_lieu" mới xuất hiện, nên hãy đạo diễn thật cụ thể, đúng kích thước, đúng tỉ lệ.\n\n',
    'DỮ LIỆU ĐÃ KIỂM CHỨNG (nguồn sự thật duy nhất):\n',
    'ĐỀ: ' + r.de_bai + '\n',
    'ĐÁP SỐ (đã kiểm chứng bằng máy, KHÔNG được đổi): ' + r.dap_an + (r.dap_an_hien ? ' (trình bày: ' + r.dap_an_hien + ')' : '') + '\n',
    vanDeDe_(r),
    banVeChoPrompt_(r),
    'Yếu tố cần suy nghĩ: ' + r.yeu_to_tu_duy + '\nBẫy học sinh hay sai: ' + r.bay_thuong_gap + '\n' +
    (typeof yeuCauKienThucLop_ === 'function' && yeuCauKienThucLop_(r.lop, r.mon) ? yeuCauKienThucLop_(r.lop, r.mon) + '\n(BẮT BUỘC giảng đúng phương pháp của lớp ' + r.lop + '; KHÔNG dùng kiến thức lớp trên hoặc số phức).\n' : ''),
    'MÔ HÌNH HÓA: ' + (c1.mo_hinh || c2.mo_hinh || '(tự nêu từ lời giải)') + '\n',
    'LỜI GIẢI GỌN (ưu tiên dùng để dạy): ' + (c2.y_tuong ? 'Ý tưởng then chốt: ' + c2.y_tuong + '\n' : '\n') + buocC2 + '\n',
    'LỜI GIẢI CHI TIẾT (để đối chiếu số liệu): ' + buocC1 + '\n\n',

    'NGUYÊN TẮC SỐ LIỆU: mọi con số chỉ lấy từ đề và hai lời giải trên; dòng CUỐI của cảnh đáp án phải chứa đúng đáp số ' + r.dap_an + ' (viết dấu phẩy thập phân kiểu Việt Nam trong LaTeX là {,}, ví dụ 12{,}5) kèm đơn vị. Không viết câu thông báo của hệ thống (hạn mức, xin lỗi...).\n\n',

    '1) TOÁN THỰC TẾ = DỰNG LẠI CẢNH THẬT RỒI MÔ HÌNH HÓA (bắt buộc): người xem phải THẤY vật thật trước, rồi thấy nó "biến" thành hình học/hàm số, cuối cùng quay lại vật thật với kết quả. ',
    'Đối chiếu mỗi nhãn với đúng vật trong đề. Bài di chuyển phải có vị trí xuất phát, điểm chuyển phương tiện và đích đến; vẽ đường đi qua các điểm ấy. Bài kinh tế phải phân biệt tổng số, số đang sử dụng và số bỏ trống. Khi đề chỉ nêu mức biến thiên, giữ biến trên hình đến khi có giá trị cụ thể. ',
    'BỐI CẢNH BLENDER: vật và bối cảnh của cảnh mở đầu mô tả bằng dac_ta_canh (xem mục ĐẶC TẢ CẢNH 3D). Chỉ khi cần một vật cấu tạo hình học đặc thù có đoạn đo riêng (bể không nắp, lăng trụ...) mới dùng thêm mo_hinh_3d: Khi bản vẽ canh_that thiếu vật chính hoặc chỉ có hình khối chung chung, hoặc khi đề mô tả vật có cấu tạo riêng, thêm vào gốc JSON mo_hinh_3d: {"chi_tiet":[{"tu_de":"cụm nguyên văn chỉ vật trong đề","hinh":"hop","tam":[0,0,1],"co":[4,3,2],"xoay":[0,0,0],"vat_lieu":"go"}]}. Ghép khối hop, tru, cau, non thành vật. tam là tâm, co là kích thước toàn phần theo X,Y,Z, Z thẳng đứng; xoay là độ quanh từng trục. Dùng mét cho tọa độ và kích thước. Bể chữ nhật không nắp dựng theo ba trục bằng đúng năm khối hộp: đáy dưới lòng bể, bốn vách đứng trên đáy, thể tích đo giữa các mặt trong. Giữ đúng số lượng, tỷ lệ và cấu tạo (bể không nắp gồm đáy và bốn vách). Các vật liệu gồm go, la, co, dat, gach, da, thep, nuoc, kinh, vang, trang, do, toi. Chỉ mô tả khi đủ dữ kiện để minh họa. ',
    'Mạch hình ảnh: cảnh thật 3D (vật đúng hình dạng: hộp/bể = khoi_hop, lon/cốc/bồn = tru, phễu = non, nhà = toa_nha, thang = thang, đường đi có xe = xe, cảnh quan = cay) -> giữ sân khấu, gắn nhãn kích thước (x, h, 4 m...) lên vật -> mô hình phẳng (hinh_hoc: tam giác, góc, cạnh) hoặc hàm số (do_thi) -> tính -> quay lại cảnh thật 3D với kích thước đúng của đáp số. ',
    'Vật 3D phải đúng TỈ LỆ của đề ("kich_thuoc" ghi số thật, ví dụ đáy 4x4, cao 2 -> [4,4,2]); khi đổi kích thước để so sánh thì dùng hai vật cạnh nhau.\n\n',

    '2) DẠY Ý ĐỒ, KHÔNG DẠY CÔNG THỨC RẬP KHUÔN: nói rõ (a) "y_do": đề thật sự muốn tối ưu/tính đại lượng nào, cái gì cố định, cái gì thay đổi; (b) "mo_hinh_hoa": đặt ẩn là gì, điều kiện của ẩn (ẩn dương, nhỏ hơn cạnh tấm tôn...), lập biểu thức; ',
    '(c) "diem_chot": ý then chốt (đại lượng cố định để khử ẩn, đối xứng, bất đẳng thức, đường gấp khúc duỗi thẳng...) và VÌ SAO nó đúng; (d) chỉ khi suy luận đã dẫn tới mới dùng công thức. Ghi ý tưởng then chốt vào "y_tuong_chinh" (một câu, ít nhất 30 ký tự).\n\n',

    '3) ĐÂY LÀ MỘT BÀI GIẢNG, PHẢI KỸ VÀ RÕ: người xem chưa biết gì cũng phải hiểu, và tự làm lại được bài tương tự. ',
    quyTrinh6Phan_(true, r),
    'Ngoài "canh", trả thêm: "bai_hoc_rut_ra" (mảng 3 câu, mỗi câu ≤ 12 từ, là quy tắc dùng được ngay, ví dụ "Thể tích cố định: rút một ẩn theo ẩn kia") và "video_tiep_theo" (≤ 10 từ, hẹn bài kế tiếp).\n'
  ] : [
    'Bạn là giáo viên Toán kiêm biên kịch và ĐẠO DIỄN HÌNH ẢNH cho video ngắn TikTok/YouTube Shorts (video dọc) dạy học sinh lớp ' + r.lop + ' giải bài xác suất. ',
    'Video được DỰNG TỰ ĐỘNG từ kịch bản JSON của bạn: mỗi cảnh có một "sân khấu" gồm các VẬT THẬT (người, thẻ, xúc xắc, vòng quay, hộp quà, đồng hồ đo xác suất...) chuyển động theo từng câu thoại, kiểu đồ họa neon như các video giải thích nổi tiếng trên TikTok. Chỉ những gì bạn mô tả trong "du_lieu" mới xuất hiện trên màn hình, nên hãy đạo diễn thật cụ thể.\n\n',

    'DỮ LIỆU ĐÃ KIỂM CHỨNG (nguồn sự thật duy nhất):\n',
    'ĐỀ: ' + r.de_bai + '\n',
    'ĐÁP ÁN CUỐI CÙNG (đã kiểm chứng bằng máy, KHÔNG được đổi): ' + r.dap_an + '\n',
    vanDeDe_(r),
    'Yếu tố cần suy nghĩ: ' + r.yeu_to_tu_duy + '\nBẫy học sinh hay sai: ' + r.bay_thuong_gap + '\n' +
    (typeof yeuCauKienThucLop_ === 'function' && yeuCauKienThucLop_(r.lop, r.mon) ? yeuCauKienThucLop_(r.lop, r.mon) + '\n(BẮT BUỘC giảng đúng phương pháp của lớp ' + r.lop + '; KHÔNG dùng kiến thức lớp trên hoặc số phức).\n' : ''),
    'LỜI GIẢI BẰNG SUY LUẬN (ưu tiên dùng để dạy): ' + (c2.y_tuong ? 'Ý tưởng then chốt: ' + c2.y_tuong + '\n' : '\n') + buocC2 + '\n',
    'LỜI GIẢI TÍNH TOÁN (để đối chiếu số liệu): ' + buocC1 + '\n\n',

    'NGUYÊN TẮC SỐ LIỆU: mọi con số chỉ lấy từ hai lời giải trên; cảnh đáp án phải ra ĐÚNG ' + r.dap_an + '. Không viết câu thông báo của hệ thống (hạn mức, xin lỗi, "là mô hình ngôn ngữ"...).\n\n',

    '1) GẮN VỚI ĐỜI THỰC (bắt buộc): kể bài toán như một TÌNH HUỐNG CÓ THẬT mà học sinh gặp hằng ngày, giữ nguyên mọi con số của đề. ',
    'Ví dụ: "lấy 2 bi trong hộp" -> "bốc thăm 2 phần quà ở hội trại"; "chọn 2 học sinh" -> "cô gọi 2 bạn lên bảng"; "tung xúc xắc" -> "chơi cờ cá ngựa"; "mật khẩu 4 số" -> "mở khóa điện thoại của bạn". ',
    'Nếu đề vốn đã có bối cảnh thì làm bối cảnh đó sống động hơn. Cảnh cuối nêu MỘT chỗ dùng được cách nghĩ này ngoài đời (bốc thăm, xổ số, chơi game, dự báo thời tiết, chọn đội...).\n\n',

    '2) DẠY Ý ĐỒ & TRÌNH BÀY XÁC SUẤT CỰC KỲ CHI TIẾT, TƯỜNG MINH TỪNG BƯỚC (BẮT BUỘC — KHÔNG NHẢY CÓC CÔNG THỨC): ' +
      'Học sinh xem xong phải hiểu rõ BẢN CHẤT tại sao nhân, tại sao cộng, tại sao dùng Tổ hợp C hay Chỉnh hợp A. Bắt buộc chia rõ các cảnh theo đúng 5 bước sư phạm xác suất:\n' +
      '   • Bước 1 — Xác định Phép thử & Tính Không gian mẫu n(Ω) (1-2 cảnh): Nêu rõ hành động lấy/xếp là có thứ tự hay không thứ tự; viết RÕ công thức và kết quả lên "noi_dung_man_hinh" (ví dụ: ["n(\\\\Omega) = C_{12}^3 = 220"]), đồng thời mô phỏng trực quan bằng chính VẬT THẬT của đề (the cho tấm thẻ đánh số, hop_bi cho bi, dong_xu, xuc_xac) kết hợp thẻ các giai đoạn chọn (the) + bộ đếm công-tơ-mét (so_dem). TUYỆT ĐỐI KHÔNG dùng luoi_o 16 ô vuông trống vô nghĩa để minh họa không gian mẫu lớn!\n' +
      '   • Bước 2 — Gọi Biến cố A & Chọn chiến lược đếm (1-2 cảnh "y_do"/"diem_chot"): Giải thích rõ dấu hiệu trong đề (gặp "ít nhất 1" hoặc "không quá" -> dùng biến cố đối \\\\overline{A}; gặp "cùng màu / đủ các loại" -> chia các trường hợp rời nhau). Hiện tóm tắt chiến lược lên "noi_dung_man_hinh" hoặc danh_sach / so_do_cay / venn.\n' +
      '   • Bước 3 — Chỉ rõ Cái bẫy học sinh hay mắc (1 cảnh "bay"): Nêu cụ thể lỗi sai phổ biến (nhầm C với A, đếm trùng, quên trường hợp, cộng thay vì nhân) kèm hình rung + loai_bo.\n' +
      '   • Bước 4 — Tính chi tiết số cách n(A) cho TỪNG TRƯỜNG HỢP (2-3 cảnh "tinh_toan"): Mỗi trường hợp 1 cảnh riêng! Giải thích từng thừa số trong tích (chọn từ nhóm nào, bao nhiêu cách), viết rõ phép tính trung gian lên "noi_dung_man_hinh" (ví dụ: ["\\\\text{TH1: } C_5^2 \\\\cdot C_4^1 = 10 \\\\cdot 4 = 40"], cảnh sau: ["\\\\text{TH2: } C_5^3 = 10", "n(A) = 40 + 10 = 50"]).\n' +
      '   • Bước 5 — Ráp công thức Xác suất P(A) & Kiểm tra (2 cảnh "dap_an", "kiem_tra"): Hiện đầy đủ công thức ["P(A) = \\\\frac{n(A)}{n(\\\\Omega)} = \\\\frac{50}{220} = \\\\frac{5}{22}"] (hoặc ["P(A) = 1 - \\\\frac{n(\\\\overline{A})}{n(\\\\Omega)} = ..."]) kèm đồng hồ đo dong_ho_do và kiểm chứng chéo.\n' +
      'Ghi ý tưởng then chốt vào "y_tuong_chinh" (một câu, ít nhất 30 ký tự).\n\n',

    '3) ĐÂY LÀ MỘT BÀI GIẢNG, PHẢI KỸ: người xem chưa biết gì cũng phải hiểu mình đang học gì, vì sao làm từng bước, và tự làm lại được bài tương tự. ',
    quyTrinh6Phan_(false, r),
    'Ngoài "canh", trả thêm: "bai_hoc_rut_ra" (mảng 3 câu, mỗi câu ≤ 12 từ, là quy tắc làm bài dùng được ngay, ví dụ "Gặp chữ CÙNG: tách từng loại rồi cộng"; dùng làm các dòng danh_sach ở cảnh bai_hoc cuối video) và "video_tiep_theo" (≤ 10 từ, hẹn bài kế tiếp cùng chủ đề).\n'
  ];
  var moDau = [
    'MỞ ĐẦU ẤN TƯỢNG (quyết định người xem có lướt đi không; 1,5 giây đầu là quan trọng nhất): cảnh 1 tối đa 5 giây, "loi_thoai" cảnh 1 tối đa 16 từ. Nghĩ 3 phương án hook, ghi vào "hook_ung_vien", chọn phương án mạnh nhất. ',
    'Công thức hook mạnh: (a) phá vỡ kỳ vọng ("Bể to hơn mà lại tốn ÍT gạch hơn?"); (b) đặt cược/thách thức có con số cụ thể ("Cho bạn 10 giây: ..."); (c) đặt ẩn số gây tò mò bằng ký hiệu ngắn ("P(A ∩ B) = ?", "r = ? để rẻ nhất") và hứa giải từng bước; (d) chỉ ra sai lầm mà chính người xem đang mắc; (e) câu hỏi đời thực ai cũng từng gặp. ',
    'Nói thẳng với "bạn", động từ mạnh, có con số hoặc hình ảnh cụ thể; ' + (hh ? 'hình ảnh cảnh 1 là chính HÌNH VẼ của đề đang hiện dần (nét vẽ chạy, điểm bật sáng), không vật thật, không mở bằng chữ suông. ' : 'hình ảnh cảnh 1 phải là vật thật đang chuyển động (camera 3D xoay, vật bung ra, xúc xắc lăn...), không mở bằng chữ suông. '),
    chao ? 'Được phép mở bằng MỘT lời chào cực ngắn có năng lượng (tối đa 3 từ, ví dụ "Chào bạn!") rồi vào hook ngay trong cùng câu thoại; KHÔNG "hôm nay", "các bạn ơi", "mọi người". '
         : 'KHÔNG chào hỏi, KHÔNG "hôm nay", "các bạn ơi", "mọi người": vào thẳng câu móc. ',
    '"hook_kieu": sai_lam | thach_thuc | bat_ngo | cau_hoi. Không bịa thống kê kiểu "90% học sinh sai". ',
    'CHỐNG LỘ ĐÁP ÁN (vi phạm = kịch bản bị loại): TUYỆT ĐỐI không nêu đáp số hay kết quả trung gian (ví dụ "xác suất là 1/4", "r = 3", "lãi 16000") trong loi_thoai cảnh 1, "hook", "hook_chu", "hook_ung_vien", "tieu_de_bia", "tieu_de", "chu_de_ngan"; mở bài là CÂU HỎI. Kết quả của một bước chỉ xuất hiện (lời, chữ, nhãn, đồ thị) ở đúng cảnh giảng tới bước đó; mỗi khung hình hiện đáp số tối đa MỘT chỗ. ',
    'CHỮ HIỂN THỊ & KÝ HIỆU (phụ đề lấy từ loi_thoai): trong "loi_thoai" viết CHỮ SỐ và KÝ HIỆU chuẩn ("54π m³", "1/4", "10 cm", "0 < x < 30", "x = 10", "V\'(x) = 0", "29,5"), KHÔNG phiên âm ("năm mươi tư", "một phần bốn", "xăng-ti-mét", "zero") - máy tự đọc thành lời. "tieu_de_canh", "nhan", dòng danh_sach: viết kiểu toán ("V\'(x) = 0", "10 cm", "Tích ⋮ 4"), không phiên âm, không bắt đầu bằng ":" "," "?". ',
    'LATEX trong JSON: mọi lệnh viết HAI gạch chéo ("\\\\vdots", "\\\\cdot", "\\\\dfrac", "\\\\times"); chia hết viết "a \\\\vdots b"; phép nhân dùng "\\\\cdot", KHÔNG dùng dấu chấm câu "." ("4x \\\\cdot (30-x)^2", "(u \\\\cdot v)\'"); số thập phân dấu phẩy "{,}" (29{,}5), tiền dấu chấm nghìn (500.000 đồng). Mọi đáp số kèm đơn vị ("r = 3 m", "x = 10 cm"). ',
    '"hook_chu": câu hook rút gọn 3-11 từ để in chữ lớn; "nhan_manh": 1-3 cụm nằm NGUYÊN VĂN trong hook_chu (được tô vàng, rung). ',
    '"tieu_de_bia": tiêu đề ẢNH BÌA 3-7 từ (≤ 34 ký tự), cực gợi tò mò, nói đúng nội dung, không bịa số liệu, nên chứa NGUYÊN VĂN một cụm trong nhan_manh (được tô màu trên ảnh bìa).\n\n'
  ];
  var coHinh = typeof deCoHinh_ === 'function' ? deCoHinh_(r) : false;
  var khopDe = [
    'HÌNH MINH HỌA PHẢI KHỚP ĐỀ GẦN NHƯ 100% (lỗi nặng nhất là vẽ một vật khác với đề): ',
    '(a) Liệt kê trong đầu MỌI đối tượng có trong đề (hình dạng, vật, số lượng, số đo, cách sắp xếp, quy luật biến đổi) và vẽ ĐÚNG chúng, đúng hình dạng, đúng tỉ lệ, đúng nhãn số đo. ',
    '(b) KHÔNG thay bằng vật "gần giống" trong danh sách (ví dụ đề hòn đảo hình bông tuyết Koch thì KHÔNG được vẽ bể nước hay hộp; đề sân hình chữ nhật có lối đi thì vẽ đúng sân và lối đi). ',
    'Hình nào danh sách vật không có sẵn thì vẽ bằng "hinh_tu_do" (vẽ được mọi hình: đa giác, đường, tròn, cung, đường SVG, đa giác đều, bông tuyết Koch, tam giác Sierpinski, đường cong tham số, nhân bản hình). ',
    '(c) Đề có quy luật lặp/biến đổi theo bước (fractal, dãy hình, xếp que diêm...) thì cho người xem THẤY quy luật đó chạy: dùng hinh_tu_do với "gia_tri" = bước đầu và các hành động dat_gia_tri 1, 2, 3 để hình biến đổi từng bước. ',
    '(d) Cảnh mo_dau và de_bai phải cho thấy chính hình của đề; các cảnh mô hình hóa/tính toán nên tái sử dụng đúng hình đó (phóng to một phần, tô màu phần đang tính).\n',
    coHinh ? 'ĐỀ NÀY CÓ HÌNH: ' + (r.mo_ta_hinh ? 'mô tả hình gốc: ' + String(r.mo_ta_hinh) + '. ' : '') +
      (r.file_anh ? 'Ảnh chụp đề gốc được gửi kèm: nhìn kỹ và vẽ lại các hình trong ảnh y hệt (số hình, hình dạng, màu, nhãn). ' : '') +
      'Ít nhất một trong 3 cảnh đầu phải vẽ đúng hình này bằng hinh_tu_do, hinh_hoc hoặc do_thi.\n\n' : '\n'
  ];
  var sp = null;
  try { sp = r.san_pham ? JSON.parse(String(r.san_pham)) : null; } catch (e) { sp = null; }
  var sanPham = sp ? [
    'VIDEO GIỚI THIỆU SẢN PHẨM BẰNG BÀI TOÁN (kênh tự bán, phải hợp lý và trung thực): sản phẩm "' + sp.ten + '"' + (sp.thuong_hieu ? ' (' + sp.thuong_hieu + ')' : '') + ', giá kênh bán ' + sp.gia_ban + ' đồng' +
      (sp.gia_thap ? ', giá thị trường ngày ' + sp.ngay + ': ' + sp.gia_thap + (sp.gia_cao > sp.gia_thap ? ' đến ' + sp.gia_cao : '') + ' đồng' : '') + '. Thông số đã xác minh: ' + ((sp.thong_so || []).join('; ') || '(chỉ dùng giá)') + '.\n' +
      (sp.cach_dua ? 'Ý tưởng đưa sản phẩm vào video: ' + sp.cach_dua + '\n' : ''),
    (sp.anh && sp.anh.length ? 'ẢNH THẬT CỦA SẢN PHẨM (' + sp.anh.length + ' ảnh, chỉ số từ 0): ' + (sp.anh_mo_ta || []).map(function (x) { return 'ảnh ' + x.so + ' = ' + x.goc + ': ' + x.mo_ta + (x.chu ? ' (chữ trên ảnh: ' + x.chu + ')' : '') + (x.hop_mo_dau ? ' [hợp làm ảnh lớn mở đầu]' : ''); }).join(' | ') + '\n' +
      '(a) DÙNG ẢNH THẬT bằng vật {"loai":"anh_that","anh":<chỉ số>,"x":..,"y":..,"co":..,"nhan":"chữ ngắn","gia":true|false} trên san_khau: ' +
      'cảnh MỞ ĐẦU có ảnh lớn (co 1.1-1.4, gia: true để dán nhãn giá) đi cùng câu móc; cảnh ĐỀ BÀI/DỮ KIỆN có ảnh nhỏ hơn (co 0.7-0.9) kèm nhan/mui_ten chỉ đúng thông số dùng trong đề; ' +
      'ít nhất một cảnh lời giải giữ ảnh nhỏ ở góc làm bối cảnh. KHÔNG đặt chữ/vật đè lên ảnh, không dùng ảnh ở cảnh không liên quan.\n'
      : 'Sản phẩm CHƯA có ảnh thật: vẽ sản phẩm bằng vật gần đúng nhất (hinh_tu_do / vật 3D) với nhãn tên sản phẩm.\n'),
    '(b) Bài toán là chính, xoay quanh sản phẩm: mọi con số lấy từ giá / thông số ở trên (giả định thêm phải nói rõ). Người xem không mua vẫn học được cách tính. ',
    '(c) YẾU TỐ QUẢNG CÁO HỢP LÝ: ở cảnh kết luận có MỘT câu nối kết quả bài toán với giá trị sản phẩm, chỉ dùng con số đã tính' + (sp.loi_ket ? ' (gợi ý: "' + sp.loi_ket + '")' : '') + '; ' +
      'cảnh bài học cuối nói một câu ngắn: "' + sp.ten + ' có tại kênh, link ở mô tả nhé." Máy tự gắn nhãn "Có sản phẩm do kênh bán" và THẺ SẢN PHẨM (ảnh + tên + giá) ở cuối video, không cần vẽ thẻ đó.\n',
    '(d) CẤM: "tốt nhất", "rẻ nhất", "số 1", "hàng đầu", "duy nhất", "cam kết", "100%", "mua ngay", "chốt đơn", "nhanh tay", công dụng chưa xác minh, so sánh/nhắc tên sản phẩm cạnh tranh, chê sản phẩm khác.\n\n'
  ] : [];
  var nangCao = [
    r._series ? 'SERIES: video thuộc chuỗi "' + r._series.ten + '". TUYỆT ĐỐI KHÔNG nói hay ghi SỐ TẬP (số tập do hệ thống đánh lúc đăng); "video_tiep_theo" hẹn một bài cùng lớp.\n' : '',
    r._hook ? 'KIỂU MỞ ĐẦU CẦN THỬ Ở VIDEO NÀY: "' + r._hook + '" (đặt "hook_kieu" = "' + r._hook + '" và viết câu móc đúng kiểu đó, thật mạnh). Hệ thống đang đo kiểu mở đầu nào giữ chân người xem tốt nhất.\n' : '',
    typeof goiYTuSoLieu_ === 'function' ? goiYTuSoLieu_() : '',
    typeof laDeTaiChinh_ === 'function' && laDeTaiChinh_(r.de_bai) ? 'BÀI TÀI CHÍNH (lãi suất / tiết kiệm / vay / trả góp / tăng trưởng) - THAY cho yêu cầu "dựng cảnh thật 3D" ở trên: ' +
      'đề KHÔNG có vật hình khối nào, nên TUYỆT ĐỐI không vẽ khoi_hop, tru, non, cau, hinh_hoc, xúc xắc, hộp quà hay bất kỳ hình khối nào đề không nhắc. ' +
      'Hình minh họa đúng: (1) cảnh thật canh_that với ngan_hang, nguoi, tien, heo_dat (người mang tiền đến ngân hàng, heo đất đầy dần); ' +
      '(2) bieu_do_cot số tiền SAU TỪNG KỲ (cột cao dần, dat_gia_tri/chon cột kỳ cuối) - đây là hình chính để MÔ HÌNH HÓA; (3) do_thi hàm mũ (vd "100*(1.06)^x") khi cần thấy tốc độ tăng; ' +
      '(4) danh_sach hoặc luoi_o làm dòng thời gian các kỳ (Kỳ 1, Kỳ 2...); (5) so_dem số tiền / số kỳ. Phần mô phỏng = bảng/biểu đồ số tiền qua từng kỳ, không phải hình học.\n' : '',
    hh && typeof huongDanKichBanHinh_ === 'function' ? huongDanKichBanHinh_(r) + 'ĐÂY LÀ BÀI HÌNH HỌC THUẦN TÚY: BỎ QUA mọi yêu cầu "dựng cảnh thật 3D / canh_that / vật thật" ở trên; hình chính là hinh_hoc.\n' : '',
    typeof quyTacHocChoPrompt_ === 'function' ? quyTacHocChoPrompt_() : '',
    typeof phongCachLoiChoPrompt_ === 'function' ? phongCachLoiChoPrompt_(r) : '',
    typeof hocEditChoPrompt_ === 'function' ? hocEditChoPrompt_() : '',
    'GÓC NHÌN 3D (tùy chọn): cảnh có hình học/hình tự do được dựng nổi khối 3D; có thể thêm "goc_nhin": ["..."] (1-3 góc, máy đổi góc ở các bước của cảnh) chọn trong: cheo_trai, tren_xuong (nhìn thẳng từ trên khi cần đọc số đo chính xác), cheo_phai, thap_chinh_dien (góc thấp hùng vĩ, hợp hook/đáp án), cao_toan_canh, nghieng_nhe. Hai cảnh liền nhau nên khác góc; không cần thì bỏ trống.\n'
  ];
  var danHinh = hh
    ? 'Khi lời giải hình học chuyển giữa khối và hình phẳng, giữ tên đỉnh, màu và hướng quan sát; tô riêng mặt đang xét rồi đưa mặt đó xuống cạnh công thức. Chỉ vẽ thiết diện nếu lời giải xác định được nó.'
    : tt
      ? 'Nếu lời giải suy ra công thức từ hình, mở bằng vật của đề và đánh dấu đúng đại lượng chưa biết. Giữ đường biên làm mốc; tô miền cần đo hoặc dựng mặt cắt, gắn kích thước ngay trên hình rồi mới thay số. Với vật thể quay, phân biệt miền quay và quỹ đạo bằng hai màu. Chỉ dùng định lý và dữ kiện có trong lời giải đã kiểm chứng.'
      : 'Khi đề so sánh hai biến cố, cho người xem thấy hai kết quả mẫu trên cùng một bộ vật. Đếm từng trường hợp bằng cùng bố cục, giữ màu của mỗi biến cố, rồi mới đặt hai kết quả cạnh nhau. Kiểm tra hai phép đếm dùng đúng không gian mẫu; nếu biến cố giao nhau, chỉ trừ phần đếm trùng khi lời giải yêu cầu.';
  var noiCanh = [
    danHinh,
    'Khi đề mô tả một quá trình chế tạo, mở bằng vật liệu ban đầu, dựng riêng từng thao tác cắt/gấp/gắn theo thứ tự lời kể và giữ góc nhìn khi đọc số đo. Cảnh liên hệ cuối phải cho thấy chính các vật dụng hoặc công trình được nhắc. Các danh sách chốt bài đánh dấu từng ý theo mốc lời. ',
    'Nếu thư viện không có đúng vật trong đề, hãy tự dựng đường bao bằng hinh_tu_do: dùng nét svg (d là đường dẫn), da_giac, cung hoặc duong trong cùng khung tọa độ. Lớp đầu vẽ dáng nhận diện; lớp sau tô riêng miền đang xét, đặt đường đo và ký hiệu cùng vị trí qua các cảnh. Lấy tỉ lệ từ dữ kiện đã biết; chỉ ghi nhãn số khi đề hoặc lời giải cung cấp. ',
    'Để nối hình với kết quả, dùng nhãn ngắn ngay cạnh phần đang đo hoặc đếm; giữ nguyên ký hiệu đó trong noi_dung_man_hinh. Khi lời giảng chuyển sang kiểm tra, quay về hình gốc và thay dấu hỏi bằng kết quả có đơn vị nếu có. Dùng vật, hành động và moc_loi đã có. ',
    'Dàn cảnh theo thao tác toán đang được đọc: giữ hình gốc ở vùng trên khi đưa phép tính xuống dưới. Với đối xứng, sáng từng cặp rồi mới lập bảng đếm; với xác suất, giữ bộ thẻ và đưa chính các phần tử đã chọn vào tập hợp; với thể tích, giữ cùng màu cho phần chất lỏng khi chuyển sang mặt cắt. Chỉ chọn cách diễn đạt phù hợp dữ kiện của đề. Mỗi nhịp chỉ nhấn một thay đổi. ',
    'Với mỗi dòng noi_dung_man_hinh, ghi một phần tử của mảng moc_loi theo đúng thứ tự. Mỗi phần tử là cụm 3–6 từ liên tiếp chép nguyên văn từ loi_thoai ở chỗ bắt đầu giải thích dòng đó. Chọn cụm riêng biệt theo thứ tự đọc. Ví dụ lời “Lấy diện tích đáy nhân với chiều cao” có thể dùng mốc “Lấy diện tích đáy”. ',
    'MẠCH NỐI GIỮA CÁC CẢNH (rất quan trọng, người nghe ghét cảm giác "chuyển slide"): cả video phải nghe như MỘT bài nói liền mạch của một người thật, không phải các đoạn rời ghép lại. ',
    'PHONG CÁCH LỜI THOẠI GIẢNG DẠY (BẮT BUỘC ĐỂ GIỌNG ĐỌC VUI VẺ, CÓ NHẤN NHÁ SƯ PHẠM): ' +
      'Nhập vai người thầy giáo trẻ dạy toán siêu vui tính, nhiệt huyết, hóm hỉnh và truyền cảm hứng. ' +
      'Thường xuyên dùng thán từ tạo nhịp cảm xúc tự nhiên: "Nào,", "Ồ,", "Để ý kỹ nhé,", "Thấy điều kỳ diệu chưa?", "Khoan đã!", "Tuyệt vời!". ' +
      'Đặt câu hỏi gợi mở kích thích trí tò mò của học sinh ("Tại sao lại thế nhỉ?", "Bí quyết nằm ở đâu?"). ' +
      'Ngắt các câu văn ngắn gọn, dứt khoát ở điểm nhấn; so sánh thực tế gần gũi, hài hước để học sinh thấy toán học cực kỳ thú vị và dễ hiểu. ' +
      'CẤM viết lời thoại khô khan, đều đều như đọc sách giáo khoa hay báo cáo khoa học. ',
    'Câu ĐẦU của mỗi cảnh (từ cảnh 2) là một CÂU NỐI tự nhiên, bắt từ ý cuối của cảnh trước rồi dẫn sang ý mới, ví dụ: ',
    'sang kiến thức: "Muốn gỡ được, mình chỉ cần nhớ một điều nhỏ thôi."; sang cái bẫy: "Nhưng khoan, chính chỗ này nhiều bạn trượt chân."; sang mấu chốt: "Vậy mẹo nằm ở đâu? Để ý kỹ nhé."; ',
    'sang tính: "Hiểu rồi thì phần tính nhẹ tênh."; nối hai cảnh tính: "Có cái đó rồi, giờ ráp tiếp."; sang kiểm tra: "Khoan chốt vội, thử soát lại xem."; sang đáp án: "Và kết quả là..."; sang bài học: "Vậy rút ra được gì?". ',
    'Mỗi câu nối chỉ dùng MỘT lần trong video, tự viết theo nội dung bài (các ví dụ trên chỉ để tham khảo, đừng chép y nguyên). ',
    'CẤM mở cảnh kiểu máy móc: "Bước một:", "Bước tiếp theo", "Cảnh này", "Tiếp theo,", "Sau đây", "Bây giờ chúng ta sẽ", "Cái bẫy ở đây là", "Đầu tiên ta". Thứ tự bước đã có nhãn trên màn hình, lời thoại không cần đọc lại. ',
    'Câu CUỐI của cảnh nên để ngỏ hoặc gợi sang cảnh sau (một câu hỏi nhỏ, một "nhưng..."), để người xem muốn nghe tiếp. Tránh cảnh nào cũng kết bằng cùng một kiểu câu.\n',
    'SẮC THÁI GIỌNG: mỗi cảnh có "giong_doc" (≤ 12 từ) chỉ đạo diễn xuất cho giọng đọc AI, ví dụ "tò mò, hơi thì thầm", "cảnh báo, chậm lại", "hào hứng, tự tin", "nhẹ nhàng, đọng lại". Các cảnh liền nhau nên có sắc thái khác nhau để giọng không đều đều.\n',
    'GIÚP NGƯỜI XEM NHỚ ĐỀ: trả "du_kien": 2-4 dữ kiện then chốt của đề, mỗi cái ≤ 18 ký tự (có thể có LaTeX ngắn, ví dụ "V = 32\\\\,m^3", "Không nắp", "5 nam, 3 nữ"); máy hiện chúng thành các thẻ nhỏ trên đầu màn hình suốt phần giải để người xem không quên đề đang hỏi gì.\n\n'
  ];
  var vat3d = [
    '  VẬT 3D THẬT (đặt trên sàn, tự xoay mặt theo camera 3D, có bóng đổ; RẤT HỢP cho toán thực tế, cũng dùng được cho bài xác suất có vật thật):\n',
    '  khoi_hop {kich_thuoc:[dài, rộng, cao] số thật của đề, nhan_kich_thuoc:["4 m","4 m","2 m"] (nhãn hiện trên 3 cạnh, có thể là "x","x","h"), muc_nuoc 0-1 (nước bên trong; dat_gia_tri đổi mực nước), kieu:"dac" để thành khối đặc (mặc định là bể kính trong suốt)}: hộp, bể, thùng, phòng, viên gạch. | ',
    'tru {kich_thuoc:[bán kính, chiều cao], nhan_kich_thuoc:["r","h"], muc_nuoc}: lon nước, cốc, bồn, ống. | non {như tru}: phễu, nón, đống cát. | cau {kich_thuoc:[bán kính], nhan}: quả bóng, bồn cầu. | ',
    'toa_nha {so_tang 1-30, nhan}: nhà, tòa tháp, cột (đo chiều cao). | xe {so_luong 1-3, nhan}: ô tô chạy, quãng đường (di_chuyen để xe chạy). | cay {so_luong 1-6, nhan}: cây, cảnh quan, mốc đo đạc. | thang {goc_nghieng: góc với mặt đất (độ), nhan}: thang/dây dựa tường. | ',
    'Camera: đặt "goc_nhin":{"nghieng":25-55,"xoay":-40..40} trong du_lieu để cảnh mở ra ở góc 3D, rồi dùng hành động goc_3d để camera bay vòng quanh vật đúng lúc lời thoại nhấn mạnh. Vật 3D lớn đặt cách nhau ít nhất 35 đơn vị theo x.\n',
    '  HÌNH HỌC PHẲNG & ĐỒ THỊ (vẽ dần kiểu Manim, nét sáng trên nền tối):\n',
    '  hinh_hoc {x:50, y:50, diem:{"A":[x%,y%],...} tọa độ 0-100 trong khung hình (gốc trên trái, y hướng xuống), canh:[["A","B","5 m"],...] (cạnh vẽ lần lượt, nhãn độ dài, để "" nếu không ghi), goc:[["B","A","C","30°"]] (cung góc tại đỉnh giữa), vuong:[["A","H","B"]] (ký hiệu góc vuông tại H), to:[["A","B","C"]] (tô vùng), noi_dung: tiêu đề}: ',
    'mô hình tam giác đo đạc, mặt cắt, đường đi, mảnh vườn. Hành động "chon" {chi_so:[số thứ tự cạnh trong canh, từ 1]} làm sáng cạnh đó; "loai_bo" gạch cạnh. Đặt hình đúng TỈ LỆ (cạnh 3 dài gấp rưỡi cạnh 2...). | ',
    'do_thi {x:50, y:50, ham: biểu thức theo x viết kiểu máy tính ("x^2+128/x", "x*(60-2*x)^2", "3/sin(x)+3/cos(x)", "1000*1.06^x"; dùng * ^ / sqrt sin cos tan ln log exp abs, góc tính bằng radian trừ khi kieu:"do"), x_tu, x_den (khoảng vẽ, x_den > x_tu, nằm trong điều kiện của ẩn), y_tu, y_den (để 0 và 0 thì máy tự tính), gia_tri: vị trí x ban đầu của điểm chạy, danh_dau:[x cực trị/nghiệm], khi_noi_diem: cụm 3-6 từ NGUYÊN VĂN trong loi_thoai lúc nói ra điểm đó (trước mốc này đỉnh chỉ hiện dấu "?"; cảnh đặt vấn đề để trống), nhan_truc:["x","S"], noi_dung: tên hàm}: ',
    'đồ thị vẽ dần, điểm chạy dọc đường cong (dat_gia_tri {gia_tri: x mới} để điểm trượt tới đó, hiện "x = … → y = …"), danh_dau hiện chấm và tọa độ. Rất hợp để kiểm tra cực trị.\n',
    '  HÌNH TỰ DO (vẽ ĐÚNG mọi hình của đề mà các vật trên không có):\n',
    '  hinh_tu_do {x, y, co, khung:[rộng, cao] (khung tọa độ riêng, mặc định [100,100], gốc trên-trái, y hướng XUỐNG; giữ hình trong khoảng 5-95), noi_dung: tiêu đề nhỏ, gia_tri: bước lặp hiện tại của fractal, hinh:[các nét vẽ lần lượt]}. ',
    'Mỗi nét {kieu, ...các trường riêng, mau, to (tên màu để tô kín, hoặc true), do_to 0.05-1, net (độ dày 1-14), dut:true (nét đứt), nhan (nhãn LaTeX ngắn), vi_tri_nhan:[x,y], buoc (bước xuất hiện riêng; bỏ trống = vẽ lần lượt)}: ',
    'da_giac {diem:[[x,y],...]} (đa giác kín) | duong {diem} (đường gấp khúc hở) | mui_ten {diem:[[x1,y1],[x2,y2]]} | tron {tam:[x,y], r} | cung {tam, r, tu, den (độ, 0 = hướng phải, tăng theo chiều kim đồng hồ)} | chu {tam, noi_dung (LaTeX), co_chu} | ',
    'svg {d: "M10 10 L90 10 Q50 60 10 10 Z"} (đường cong tự do: bờ biển, con sông, hình cong lạ) | da_giac_deu {tam, r, so_canh 3-24, xoay} | ',
    'koch {tam, r, lap 0-6} hoặc {diem: đa giác gốc, lap}: bông tuyết Koch (gai hướng ra ngoài) | sierpinski {tam, r, lap 0-6}: tam giác Sierpinski | ',
    'tham_so {x: "biểu thức theo t", y: "biểu thức theo t", t_tu, t_den}: đường cong tham số (xoắn ốc, hình tim, quỹ đạo) | lap {hinh: một nét, so_lan, dich:[dx,dy], xoay (độ mỗi lần), tam_xoay:[x,y], ti_le}: nhân bản (hàng cây, bậc thang, hoa văn, lát gạch). ',
    'xep_chong {tam:[x,y], r: nửa bề rộng tầng dưới cùng, hang:[số vật từng tầng TỪ TRÊN XUỐNG] hoặc tren + duoi (+ buoc_tang, mặc định 1)}: CHỒNG VẬT XẾP TẦNG (ống thép, lon, khúc gỗ, quả cam, gạch) đúng như hình đề, tầng nhiều thì tự rút gọn "⋮" ở giữa như sách giáo khoa; ĐỀ XẾP ỐNG/LON THÀNH TẦNG BẮT BUỘC dùng nét này (không dùng khối trụ); thêm ten_tang (vd "tầng", "hàng") để máy ghi "+15 tầng" ở chỗ rút gọn. Nhãn từng tầng dùng nét chu đặt bên phải. ',
    'CẢNH THỰC TẾ (BẮT BUỘC khi đề có vật/địa điểm thật: cột cờ, tòa nhà, ngân hàng, cây, người quan sát, hàng rào, vườn, sông, thang...): dùng vật "canh_that". BẠN KHÔNG TÍNH TỌA ĐỘ: chỉ ghi số đo THẬT của đề (mét), máy tự đặt tỉ lệ, dựng đúng vật và vẽ đường đo kiểu bản vẽ kỹ thuật. ' +
    'NHÌN NGANG (đo chiều cao, khoảng cách, góc nâng/hạ, bóng nắng, thang dựa tường): {"id":"canh","loai":"canh_that","x":50,"y":50,"nhin":"ngang","vat":[{"ma":"A","ten":"nguoi","cao":1.6,"x":0},{"ma":"B","ten":"cot_co","cao":15.6,"x":20}],"diem":[{"ma":"H","x":20,"cao":1.6}],' +
    '"do":[{"kieu":"khoang_cach","tu":"A","den":"B","nhan":"20 m","buoc":2},{"kieu":"chieu_cao","vat":"B","nhan":"h = ?","buoc":2},{"kieu":"tia","tu":"A.mat","den":"B.dinh","goc":"35°","buoc":2},{"kieu":"tam_giac","dinh":["A.mat","H","B.dinh"],"buoc":3},{"kieu":"vuong","tai":"H","buoc":3}]}. ' +
    'vat: ma (A, B...), ten (thư viện bên dưới), cao (mét), x (vị trí ngang, mét), tren:"B" nếu đứng trên vật B, rong (mét, cho cầu/sông/tường/hàng rào/đường), lat:true quay sang trái, bien:"BƯU ĐIỆN" (biển tên cho cong_trinh, cua_hang), emoji (cho bieu_tuong); thang dựa tường: {"ten":"thang","x":chân,"dinh_x":x chạm tường,"dinh_cao":độ cao chạm}. ' +
    'Điểm neo: "A" chân vật, "A.dinh" đỉnh, "A.mat" mắt người, "A.giua", hoặc mã trong "diem" (x, cao). ' +
    'do: khoang_cach {tu, den, nhan} | chieu_cao {vat, nhan} | tia {tu, den, goc} (tia nhìn + góc nâng/hạ) | doan {tu, den, nhan, dut} (dây, đoạn cần tính) | bong {vat, dai, nhan} (bóng nắng dài dai mét) | tam_giac {dinh:[3 điểm]} | vuong {tai} | chu {tai, nhan}. Mỗi phép đo có "buoc" để HIỆN DẦN theo lời giảng. ' +
    'NHÌN TỪ TRÊN (mảnh vườn, hàng rào quanh đất, ruộng, sân, hồ bơi, khoảng cách trên mặt đất): {"loai":"canh_that","nhin":"tren","vung":[{"ma":"V","ten":"vuon|ruong|san|san_bong|ho_boi|dat|song|duong","x":0,"y":0,"rong":20,"dai":12,"hang_rao":true,"tuong":"trai","canh":["20 m","12 m"],"nhan":"Vườn rau"}],"vat":[{"ma":"N","ten":"nha","x":-7,"y":6,"cao":6}],"do":[{"kieu":"doan","tu":"V.tl","den":"V.br","nhan":"d = ?"}]} (góc vùng V.tl V.tr V.bl V.br, V.giua, trung điểm V.tren V.duoi V.trai V.phai). hang_rao: true = rào cả 4 cạnh, hoặc mảng cạnh cần rào ["tren","phai","duoi"]; tuong: cạnh sát BỨC TƯỜNG có sẵn ("trai"...) - vẽ tường gạch, không rào cạnh đó. ' +
    'VẬT KHÔNG CÓ TRONG THƯ VIỆN (tàu hỏa, con mèo, quả táo, bánh sinh nhật, quyển sách...): dùng {"ten":"bieu_tuong","emoji":"<emoji ĐÚNG vật>","nhan":"tên vật"} - TUYỆT ĐỐI không thay bằng vật khác. ' +
    'THƯ VIỆN VẬT (vẽ sẵn đúng hình, có chuyển động nhẹ): ban (cái bàn: mặt bàn + chân), ghe, ti_vi, kim_tu_thap, thap (tháp thép/truyền hình, KHÁC tòa nhà), cot_co, nguoi, toa_nha, ngan_hang, nha, truong_hoc, cay, cay_thong, hai_dang, thap_nuoc, cot_dien, den_duong, nui, mat_troi, xe_hoi, thuyen, may_bay, khinh_khi_cau, cau, song, thang, tien, heo_dat, dieu, tuong, ho_nuoc, ' +
    'hang_rao, cong_trinh (+ bien: bưu điện, bệnh viện, nhà máy, ủy ban...), cua_hang (+ bien: chợ, siêu thị, tiệm...), xe_may, xe_dap, xe_buyt, con_duong, qua_bong, ro_bong_ro, gieng, cong, bieu_tuong (+ emoji cho vật chưa có: 🐄 🚜 🏊 ⛽...). ' +
    'TUYỆT ĐỐI không thay vật thật bằng khối hộp/khối trụ/thẻ chữ; vật chưa có thì cong_trinh + bien hoặc bieu_tuong + emoji. ' +
    'CHỈ dùng canh_that ở cảnh giới thiệu tình huống (mo_dau, de_bai) và cảnh chốt đáp án thực tế (dap_an); các cảnh ở giữa (mo_hinh_hoa, y_do, bay, tinh_toan, kiem_tra) BẮT BUỘC chuyển sang sơ đồ toán học tương ứng (hinh_hoc, do_thi, bieu_do_cot, danh_sach, the, so_dem) để người xem không bị nhàm chán vì nhìn mãi 1 hình! ' +
    '"mo_ta" mỗi cảnh phải ghi rõ vẽ VẬT GÌ (tên thật trong đề), số đo nào, đo từ đâu tới đâu.\n' +
    'HÌNH HỌC (PHẲNG & KHÔNG GIAN 3D — BẮT BUỘC XOAY 3D & NỔI BẬT CẠNH CHỨNG MINH):\n' +
    '- KHI CHỨNG MINH HOẶC TÍNH TOÁN CẠNH NÀO, GÓC NÀO, MẶT NÀO: Lời thoại phải xướng tên rõ ràng đoạn thẳng đó (ví dụ "Kẻ đường cao AH vuông góc với SC...", "Chứng minh BD vuông góc với mặt phẳng (SAC)...", "Xét cạnh SA..."); máy dựng Manim và Remotion sẽ tự động phóng tia sáng quét dọc theo cạnh đó (ShowPassingFlash) và bật sáng hào quang neon rực rỡ đúng khoảnh khắc giọng đọc cất lên, giúp học sinh tập trung tuyệt đối vào đúng yếu tố đang chứng minh.\n' +
    '- HÌNH HỌC KHÔNG GIAN CÓ XOAY 3D: Ở cảnh mở đầu đề bài, máy tự động xoay đa hướng khối chóp/lăng trụ để học sinh nhìn rõ toàn bộ các mặt bên và đáy; khi kẻ đường phụ hoặc phân tích mặt phẳng, góc máy tự động nghiêng 3D để quan sát rõ nhất góc vuông và đường phụ.\n' +
    '- CẠNH THẤY LÀ NÉT LIỀN, CẠNH KHUẤT LÀ NÉT ĐỨT, ĐƯỜNG PHỤ LÀ NÉT ĐỨT MÀU VÀNG PHÁT SÁNG.\n' +
    'HÌNH BÁM SÁT ĐỀ (bắt buộc, máy kiểm tra và AI soi từng cảnh):\n' +
    '- BỐ CỤC ĐÚNG CẤU TRÚC ĐỀ: ngồi quanh bàn tròn / xếp vòng tròn -> ban_tron (KHÔNG xếp hàng ngang); xếp hàng / dãy ghế -> nguoi thành hàng; ' +
    'qua sông, đường ống, hai bờ -> canh_that nhìn từ trên có dải sông và các điểm A, B, P...; đếm không gian mẫu theo quy tắc nhân / tổ hợp -> the (thẻ giai đoạn) + so_dem (bộ đếm số cách); CHỈ dùng luoi_o khi n(Ω) ≤ 36 VÀ phải điền đầy đủ mảng "ds" ghi kết quả từng ô; chia trường hợp -> sơ đồ / danh_sach.\n' +
    '- ĐÚNG VẬT trong MỌI cảnh (không chỉ cảnh đầu): đề nói gì vẽ đúng vật đó - đề "tấm thẻ / thẻ đánh số" BẮT BUỘC dùng vật "the" với mảng "ds":["1","2",...] (TUYỆT ĐỐI CẤM vẽ hop_bi cho đề tấm thẻ!); ngọn hải đăng = hai_dang (KHÔNG dùng toa_nha), cái bàn = ban (KHÔNG dùng khoi_hop), tháp thép = thap, cột cờ = cot_co, ' +
    'lời thoại nhắc vật nào thì hình cảnh đó có vật ấy; không vẽ công trình nào mà đề không có.\n' +
    '- ĐÚNG SỐ LƯỢNG VÀ NHÃN: 6 nam 6 nữ thì đủ 12 người ghi đúng Nam/Nữ; 9 tấm thẻ đánh số 1-9 thì đủ 9 thẻ đúng số (so_luong: 9, ds: ["1",..,"9"]).\n' +
    '- QUY TẮC ĐẶT ẨN THEO TỪNG BƯỚC GIẢI (BẮT BUỘC): Ở cảnh mo_dau và de_bai (khi đang đọc đề, chưa vào giải), TUYỆT ĐỐI CẤM gắn sẵn các ẩn số tự đặt ("x", "2x", "h", "r"...) lên hình (nhan_kich_thuoc, canh, do) nếu đề bài gốc chưa cho tên ẩn đó! Ở cảnh mo_dau và de_bai chỉ hiện số đề cho hoặc dấu hỏi ("Dài = 2 Rộng", "Rộng ?", "Cao ?"). Bước ĐẶT ẨN bắt buộc diễn ra ở cảnh giải bài (mo_hinh_hoa) kèm lời thoại và dòng công thức đặt ẩn rõ ràng (ví dụ "\\\\text{Đặt rộng } = x\\\\;(x>0) \\\\Rightarrow \\\\text{dài } = 2x,\\\\; \\\\text{cao } = h"), lúc đó mới gắn nhãn ["2x","x","h"] lên hình!\n' +
    '- CHỮ TRÊN HÌNH TINH TẾ: mỗi cảnh TỐI ĐA 3 nhãn (nhan/chu), mỗi nhãn ≤ 5 chữ, đặt ở VÙNG TRỐNG quanh hình (không đè lên giữa hình), hiện LẦN LƯỢT theo lời thoại (buoc tăng dần); ' +
    'câu dài, công thức để ở "noi_dung_man_hinh" (khung công thức). HÌNH CHÍNH TO, RÕ: một hình lớn chiếm phần lớn sân khấu ("co" 1.1-1.4) thay vì nhiều vật nhỏ rời rạc.\n' +
    '- MỖI ĐIỀU KIỆN CỦA ĐỀ PHẢI THẤY TRÊN HÌNH (vd "không 2 nữ ngồi cạnh nhau": chon các ghế xen kẽ, loai_bo cách xếp sai) - không chỉ nói bằng lời.\n' +
    '- "mo_ta" ghi CHI TIẾT như kịch bản quay phim: có những vật nào, mỗi vật ở đâu, bao nhiêu cái, nhãn gì, lần lượt chuyển động gì theo lời thoại.\n' +
    '- MỖI CẢNH PHẢI CÓ HÌNH MINH HỌA THỂ HIỆN ĐÚNG ĐOẠN NỘI DUNG CẢNH ĐÓ ĐANG NÓI (TUYỆT ĐỐI CẤM dùng duy nhất 1 hình minh họa tĩnh giống hệt nhau áp dụng cho toàn bộ video):\n' +
    '  + Chia kịch bản thành nhiều khung hình / cảnh nhỏ hơn (16-22 cảnh, mỗi cảnh 4-8 giây nói đúng 1 ý) và trong MỖI CẢNH chia thành 3-4 bước khung hình con (buoc: 1, 2, 3, 4) để hình minh họa biến đổi linh hoạt theo từng câu thoại.\n' +
    '  + Nếu dùng lại bối cảnh canh_that ở nhiều cảnh thì MỖI CẢNH bắt buộc thay đổi linh hoạt phần "do" (đường đo), "nhan", động tác nhân vật ("dong_tac"), góc máy ("phong_to"/"thu_nho") hoặc kết hợp thêm vật phụ (so_dem, nhan, bieu_do_cot, do_thi, hinh_hoc) cho khớp 100% với câu thoại của cảnh đó:\n' +
    '    • Cảnh mo_dau: chỉ hiện vật thật chính + người đang ngước nhìn/suy nghĩ + dấu chấm hỏi lớn gây tò mò + camera phong_to vào chi tiết đắt giá (chưa hiện hết các đường đo kỹ thuật).\n' +
    '    • Cảnh de_bai (chia 1-2 cảnh): dựng dần từng lớp theo lời đọc: buoc 1 hiện vật A, buoc 2 hiện vật B, buoc 3 hiện đường đo khoảng cách, buoc 4 hiện góc/chiều cao cần tìm.\n' +
    '    • Cảnh mo_hinh_hoa / y_do (2-3 cảnh): chuyển từ vật thật sang mô hình toán học (vẽ đè tam giác vuông tam_giac + dấu góc vuông vuong + gắn ẩn x, h; hoặc chuyển sang hinh_hoc / do_thi / hinh_tu_do cắt ghép).\n' +
    '    • Cảnh bay (lỗi sai): vẽ trực tiếp cái bẫy lên hình (ví dụ quên cộng chiều cao mắt người 1,6 m hoặc rào luôn cả cạnh tường gạch -> cho phần sai rung + loai_bo màu đỏ kèm nhãn cảnh báo).\n' +
    '    • Các cảnh tinh_toan (mỗi bước tính 1 cảnh riêng): cảnh đang tính đại lượng nào thì CHỈ làm sáng (mau: "vang"/"cam") đúng đoạn/góc đang tính đó, thêm camera phong_to vào đúng khu vực đang tính, hoặc kết hợp do_thi / bieu_do_cot / so_dem nhảy số trung gian.\n' +
    '    • Cảnh dap_an: toàn cảnh thực tế hoàn chỉnh, đổi nhãn "?" thành con số đáp án + huy hiệu so_dem (kieu: "vien") + nhân vật dong_tac: "vui".\n' +
    '    • Cảnh kiem_tra: hình thể hiện phép thử ngược bằng số cụ thể (so sánh 2 phương án hoặc thế số đo thật lên cạnh).\n' +
    '    • Cảnh lien_he_thuc_te: TUYỆT ĐỐI CẤM dùng hop_qua (hộp quà) chung chung! Bắt buộc vẽ các vật thực tế đa dạng khớp 100% với lời thoại (ví dụ bốc thăm -> phiếu rút; chia ca trực -> người và bảng phân công; lịch trực bệnh viện/nhà máy -> canh_that với cong_trinh + nguoi; bảo mật/mã PIN -> dien_thoai; dự báo/thống kê -> bieu_do_cot + dong_ho_do).\n',
    'DẤU BA CHẤM ("…", "⋮", "⋯") TRONG HÌNH ĐỀ KHÔNG PHẢI HÌNH VẼ: nó nghĩa là "còn nhiều phần giống quy luật bị lược đi". TUYỆT ĐỐI không vẽ lại ba chấm bằng tron/chu. Phải đọc ra nó thay cho cái gì (bao nhiêu tầng/hàng/số hạng, quy luật gì) rồi dựng bằng nét có quy luật: chồng tầng -> xep_chong với ĐỦ hang (máy tự làm khoảng rút gọn: các hàng mờ trôi qua + ngoặc "+n tầng" + số đếm chạy khi dem_tang); dãy hình lặp -> lap với so_lan thật; dãy số -> danh_sach hoặc so_dem dat_gia_tri chạy số. Lời thoại nói rõ phần bị lược ("ở giữa còn mười lăm tầng nữa, tầng nào cũng hơn tầng trên một ống"). ',
    'PHÂN BIỆT VẬT THẬT VÀ CHÚ THÍCH (đừng biến cả ảnh đề thành 3D): VẬT THẬT (ống, khối, bể, đất, mảnh hình tô màu) mới dựng 3D có bề dày, đổ bóng, xoay góc nhìn. CHÚ THÍCH (nhãn số đo, chữ "Tầng 1", đường kích thước, mũi tên chỉ dẫn, ngoặc gộp, ký hiệu ba chấm, công thức) luôn PHẲNG, quay mặt về người xem, đặt bám theo vật - máy tự tách hai lớp này. Vì vậy: vật thật thì cho to:true và net dày; chú thích thì dùng chu/nhan/mui_ten, không tô, không vẽ thành hình. ',
    'NHÃN VÀ CHỮ TRÊN HÌNH: ngắn (tối đa ~22 ký tự: "u_1 = 3", "Tầng 1", "200\\,m"), ký hiệu toán viết LaTeX; câu dài đưa vào lời thoại hoặc noi_dung_man_hinh. Máy tự giữ mọi chữ trên hình CÙNG MỘT CỠ, không cần chỉnh co_chu. ',
    'Hình đều (tam giác đều, lục giác, bông tuyết) nên dùng da_giac_deu/koch với tam và r thay vì tự tính tọa độ; hình có số đo cụ thể thì tính tọa độ theo ĐÚNG tỉ lệ số đo. ',
    'Hành động: chon {chi_so:[số thứ tự nét, từ 1]} làm nét đó sáng cam | loai_bo {chi_so} làm mờ nét bị bỏ | dat_gia_tri {gia_tri} đổi bước lặp của koch/sierpinski, hình "mọc" mượt từ bước này sang bước kia | sang.\n',
    'CHUYỂN ĐỘNG CỦA VẬT (BẮT BUỘC, đây là phần làm video sinh động - không để hình đứng yên như khối cứng): mỗi cảnh có hình phải có ÍT NHẤT 2 hành động ở các bước khác nhau, mỗi bước khớp đúng một ý trong lời thoại, và "mo_ta" phải tả rõ vật CHUYỂN ĐỘNG thế nào. Bộ hành động: ',
    'bien_hinh {vat, chi_so:[số thứ tự nét] (bỏ trống = cả vật), dx, dy (dời, đơn vị khung của hình; vật thường: % sân khấu), goc (xoay, độ), ti_le (phóng)}: dời/xoay/phóng mảnh hình - CẮT GHÉP HÌNH (đưa tam giác sang ghép thành hình chữ nhật), LẬT ĐỐI XỨNG, đưa mảnh vào chỗ, vật trượt tới | ',
    'tach {vat, gia_tri 0.5-1.5} rồi ghep {vat}: các phần của hình dạt ra xa cho thấy hình gồm những mảnh/tầng nào, rồi ghép lại | dem_tang {vat}: chồng vật xep_chong hiện số vật từng tầng lần lượt bên phải (đếm 3, 4, 5...) | ',
    'dat_gia_tri: nước dâng, fractal mọc thêm, điểm chạy trên đồ thị, số chạy | di_chuyen {x, y}: vật đi tới vị trí mới | chon / loai_bo / sang / rung: làm nổi bật, gạch bỏ, nhấp sáng, rung khi sai. ',
    'Máy tự thêm hiệu ứng vào cảnh (không cần viết): chồng vật xep_chong tự XẾP TỪNG TẦNG từ dưới lên (rơi xuống, nảy nhẹ), hình tô màu (do_to ≥ 0.25) tự MỌC thành khối 3D (mảng tô mờ do_to ≤ 0.2 giữ phẳng làm chú thích), vật thực tế (vat) tự mọc từ chân lên và có chuyển động riêng (cờ bay, đèn quét, bánh xe quay), vật 3D tự mọc lên và lơ lửng nhẹ. ',
    'Ví dụ cảnh đề xếp ống: buoc 1 chồng ống tự xếp từng tầng; buoc 2 dem_tang (số ống từng tầng bật ra: 3, 4, 5...); buoc 3 chon nét chu "u_1 = 3"; cảnh sau tach rồi ghep để thấy các tầng là cấp số cộng.\n',
    '  Ví dụ đề bông tuyết Koch cạnh 200 m: {"id":"dao","loai":"hinh_tu_do","x":50,"y":50,"khung":[100,100],"gia_tri":0,"hinh":[{"kieu":"koch","tam":[50,52],"r":44,"lap":3,"mau":"xanh_la","to":"xanh_la"},{"kieu":"chu","tam":[50,92],"noi_dung":"200\\\\,m"}]} kèm hanh_dong dat_gia_tri 1, 2, 3 ở các bước sau.\n'
  ];
  var goiY = tt ? [
    '- GỢI Ý CHỌN VẬT (toán thực tế): bể/hộp/thùng -> khoi_hop (+ muc_nuoc dâng lên); lon/cốc/bồn -> tru; đo chiều cao/khoảng cách tới vật thật (cột cờ, tòa nhà, cây, tháp, hải đăng, bờ sông) -> hinh_tu_do: nét vat đúng vật + người quan sát + tia nhìn (duong dut) + cung góc + chu số đo trong CÙNG khung; thang dựa tường -> vat thang với diem [chân, đỉnh] + vat tuong; lãi suất, gửi tiết kiệm -> vat ngan_hang + tien/heo_dat rồi bieu_do_cot/do_thi số tiền tăng; ',
    'đường đi, xe, vận tốc -> xe (di_chuyen) + do_thi; giá bán - lợi nhuận, lãi suất -> bieu_do_cot hoặc do_thi + so_dem; rào vườn, chia đất -> hinh_hoc có to + cay; cực trị -> do_thi + dat_gia_tri + danh_dau; đáp án -> vật 3D đúng kích thước + so_dem kieu vien; cái bẫy -> rung + loai_bo + nhan.\n',
    '- Ít nhất 3 cảnh có vật 3D thật (mo_dau, de_bai, dap_an) và ít nhất 1 cảnh hinh_hoc hoặc do_thi (mo_hinh_hoa, kiem_tra). Ít nhất 3 cảnh dùng góc nhìn 3D (goc_nhin hoặc goc_3d); cảnh có công thức, danh sách, đồ thị để nhìn thẳng.\n'
  ] : [
    '- GỢI Ý CHỌN VẬT: người/học sinh -> nguoi; tấm thẻ đánh số / phiếu thăm -> the (với ds:["1","2",...], CẤM dùng hop_bi cho tấm thẻ!) + chon; bi, quả cầu trong hộp -> hop_bi + lay_ra; xúc xắc, đồng xu, lá bài -> đúng vật đó + quay; quay số -> vong_quay; ',
    'đếm số cách / không gian mẫu -> the (thẻ các bước chọn) + so_dem (hoặc luoi_o có đầy đủ nhãn ds khi n(Ω) ≤ 36); liệt kê trường hợp, luật chơi -> danh_sach; chọn học sinh theo khối -> vẽ đúng từng nhóm học sinh và đánh dấu số bạn được chọn ở từng trường hợp; so sánh hai trường hợp -> the hoặc bieu_do_cot; phần bù "ít nhất một" -> banh hoặc thanh; đáp án -> dong_ho_do; cái bẫy -> rung + loai_bo + nhan; liên hệ thực tế -> canh_that / vong_quay / dien_thoai / bieu_do_cot khớp lời thoại (KHÔNG dùng hop_qua).\n' +
    '- MÔ PHỎNG XÁC SUẤT PHẢI ĐA DẠNG VÀ CHUYỂN ĐỘNG: cả video dùng ÍT NHẤT 4 loại vật chính khác nhau (vd hop_bi -> luoi_o -> bieu_do_cot -> dong_ho_do), hai cảnh liền nhau không lặp cùng vật chính (trừ khi giu_san_khau để diễn tiếp). ' +
    'Mỗi cảnh mô phỏng phải có hành động thật: lay_ra (bốc bi/thẻ), quay (vòng quay, xúc xắc lăn, đồng xu tung), mo (mở hộp quà/cửa), dat_gia_tri (đồng hồ/thanh/bộ đếm chạy), chon/loai_bo từng trường hợp trên luoi_o. ' +
    'Cảnh kiem_tra nên MÔ PHỎNG NHIỀU LẦN THỬ (luoi_o lấp đầy dần các lần thắng, so_dem chạy số lần, bieu_do_cot tần suất tiến về xác suất lý thuyết). Không dùng danh_sach chữ cho cảnh mô phỏng.\n'
  ];
  var viDu = tt ? [
    'VÍ DỤ MỘT CẢNH TỐT (bài bể nước không nắp, đáy vuông, thể tích 32 m³):\n',
    '{"so":3,"loai":"mo_hinh_hoa","tieu_de_canh":"Đặt cạnh đáy là x","tu_khoa":"x","giong_doc":"tập trung, mạch lạc","loi_thoai":"Muốn tối ưu thì phải gọi tên cái đang thay đổi. Gọi cạnh đáy là x, chiều cao là h. Thể tích 32 m³ nên h bằng 32 chia x².","noi_dung_man_hinh":["x^2 h = 32","h=\\\\frac{32}{x^2}"],"trinh_bay":"xep",',
    '"minh_hoa":{"loai":"san_khau","mo_ta":"Bể kính 3D ở giữa, ba cạnh hiện nhãn x, x, h màu cam; camera xoay sang phải cho thấy chiều cao; nước dâng tới nửa bể khi nói thể tích.","du_lieu":{"goc_nhin":{"nghieng":30,"xoay":-20},',
    '"vat":[{"id":"be","loai":"khoi_hop","x":50,"y":40,"kich_thuoc":[4,4,2],"nhan_kich_thuoc":["x","x","h"],"muc_nuoc":0,"mau":"xanh_duong","buoc":1}],',
    '"hanh_dong":[{"buoc":2,"kieu":"goc_3d","nghieng":35,"xoay":25},{"buoc":3,"vat":"be","kieu":"dat_gia_tri","gia_tri":0.5}]}}}\n\n'
  ] : [
    'VÍ DỤ MỘT CẢNH TỐT (bài chọn 2 trong 5 nam, 3 nữ):\n',
    '{"so":4,"loai":"bay","tieu_de_canh":"Bẫy: chỉ đếm hai nam","tu_khoa":"hai nam","giu_san_khau":true,"giong_doc":"hạ giọng, cảnh báo","loi_thoai":"Nhưng khoan, đến đây nhiều bạn chỉ đếm cặp hai nam rồi dừng, quên mất cặp hai nữ.","noi_dung_man_hinh":[],',
    '"minh_hoa":{"loai":"san_khau","mo_ta":"Thẻ 2 NAM sáng xanh lá kèm dấu tích; thẻ 2 NỮ rung mạnh rồi bị gạch chéo đỏ; nhãn QUÊN 2 NỮ bật lên.","du_lieu":{"vat":[{"id":"quen","loai":"nhan","x":72,"y":42,"noi_dung":"Quên 2 nữ!","tu_khoa":"Quên","mau":"do","buoc":3}],',
    '"hanh_dong":[{"buoc":1,"vat":"t1","kieu":"chon","mau":"xanh_la"},{"buoc":2,"vat":"t2","kieu":"rung"},{"buoc":2,"vat":"t2","kieu":"loai_bo"}]}}}\n\n'
  ];
  var traVe = [
    '5 ĐIỀU SỐNG CÒN ĐỂ KỊCH BẢN ĐẠT CHUẨN 100% NGAY LẦN ĐẦU (KHÔNG BỊ TRẢ VỀ):\n' +
    '1. LỜI THOẠI THUẦN TIẾNG VIỆT TỰ NHIÊN: TUYỆT ĐỐI CẤM ký hiệu $, \\, /, % trong "loi_thoai". Mọi công thức/số phải viết thành chữ đọc ("ba phần năm", "nhân", "C tám chập hai").\n' +
    '2. ĐÁP ÁN CUỐI CHÍNH XÁC: "dap_an_cuoi" BẮT BUỘC bằng "' + r.dap_an + '", dòng cuối cùng của cảnh "dap_an" trong "noi_dung_man_hinh" phải kết luận đúng đáp án này.\n' +
    '3. HÌNH VẼ CHÍNH XÁC: Chỉ dùng các vật có trong danh sách vật của hệ thống hoặc "hinh_tu_do", không tự bịa tên vật lạ.\n' +
    '4. ĐỦ BƯỚC VÀ CẢNH: 15-20 cảnh chi tiết; cảnh cuối cùng bắt buộc là "bai_hoc"; mảng "bai_hoc_rut_ra" đủ 3 câu ngắn bổ ích.\n' +
    '5. TRẢ VỀ JSON HỢP LỆ DUY NHẤT: Bắt đầu bằng { và kết thúc bằng }, không kèm lời giải thích bên ngoài.\n\n',
    'Trả về MỘT đối tượng JSON: {"tieu_de":"tiêu đề đăng video < 60 ký tự, gây tò mò","chu_de_ngan":"chủ đề 2-5 từ (hiện góc trên)","bai_hoc_rut_ra":["","",""],"video_tiep_theo":"","hook_ung_vien":["","",""],"hook":"(đúng lời thoại cảnh 1)","hook_chu":"","tieu_de_bia":"","hook_kieu":"","nhan_manh":[""],"y_tuong_chinh":"","de_cho":["",""],"can_tim":"","du_kien":["",""],"hashtag":["#toanhoc","' + (tt ? '#toanthucte' : '#xacsuat') + '"],"dap_an_cuoi":"' + r.dap_an + '",',
    '"canh":[{"so":1,"loai":"mo_dau|de_bai|mo_hinh_hoa|y_do|thu_nho|bay|nhac_lai|diem_chot|tinh_toan|dap_an|kiem_tra|lien_he_thuc_te|bai_hoc","tieu_de_canh":"","tu_khoa":"","nhan":"","giu_san_khau":false,"giong_doc":"","loi_thoai":"","noi_dung_man_hinh":[],"moc_loi":[],"trinh_bay":"cong_don|bien_doi|xep","chu_thich":[],"minh_hoa":{"loai":"san_khau","mo_ta":"","du_lieu":{"goc_nhin":null,"vat":[],"hanh_dong":[]}}}]}'
  ];

  // (v86) LUỒNG HÌNH HỌC THUẦN: prompt riêng, không chứa bất kỳ hướng dẫn cảnh thật / Blender / vật 3D nào (HinhHoc.gs)
  if (hh && typeof taoPromptHinhHocThuan_ === 'function') {
    var loiThoaiHH = ['MỖI CẢNH CÓ: "loai"; "tieu_de_canh" (từ cảnh 2, 3-8 từ nói đúng ý chính); "tu_khoa" (1-3 từ nguyên văn trong tiêu đề); "giu_san_khau"; "giong_doc"; "loi_thoai"; "noi_dung_man_hinh"; "moc_loi"; "trinh_bay"; "buoc_ve"; "kien_thuc"; "nhan_manh_hinh"; "minh_hoa".\n',
      'LỜI THOẠI: câu ngắn (≤ 16 từ), mỗi cảnh ≤ 45 từ; số và công thức đọc thành LỜI, KHÔNG ký hiệu LaTeX, dấu / hay %; tên điểm viết in hoa liền (SA, ABCD) để máy đánh vần đúng.\n',
      'CÔNG THỨC "noi_dung_man_hinh": mảng LaTeX (không kèm $), tối đa 3 dòng ngắn, chữ tiếng Việt trong \text{}; "trinh_bay": "cong_don" | "bien_doi" | "xep".\n\n'];
    // v94: hình phẳng chuẩn -> công thức nằm trong hinh_phang_chuan.trang_chung_minh (máy dựng + kiểm chứng), cảnh để noi_dung_man_hinh []
    if (typeof dungHinhPhangChuan_ === 'function' && dungHinhPhangChuan_(r)) {
      loiThoaiHH[2] = 'CÔNG THỨC: KHÔNG ghi vào "noi_dung_man_hinh" (để []); mọi dòng chứng minh viết trong hinh_phang_chuan.trang_chung_minh[].dong[].tex, mỗi dòng có khi_noi nguyên văn.\n\n';
    }
    // v97: hình KHÔNG GIAN chuẩn -> đặc tả cấu trúc hinh_khong_gian (máy giải tọa độ + đạo diễn camera theo moc_xoay)
    var kgChuan = typeof dungHinhKhongGian_ === 'function' && dungHinhKhongGian_(r);
    if (kgChuan) loiThoaiHH[2] = 'CÔNG THỨC: dòng chính của mỗi bước viết trong hinh_khong_gian.buoc[].the (LaTeX, mỗi thẻ có khi_noi nguyên văn); "noi_dung_man_hinh" của cảnh lặp lại đúng dòng đó (tối đa 2 dòng), "moc_loi": [].\n\n';
    var pHH = taoPromptHinhHocThuan_(r, c1, c2, { moDau: moDau, nangCao: nangCao.filter(function (x) { return x && !/BÀI TÀI CHÍNH|GÓC NHÌN 3D|BỎ QUA mọi yêu cầu/.test(x); }).concat(kgChuan ? [huongDanKhongGian_(r)] : []),
      noiCanh: [noiCanh[0]].concat(noiCanh.slice(6)), loiThoai: loiThoaiHH, traVe: traVe });
    if (typeof dungLego_ === 'function' && dungLego_(r)) return pHH + nhacLoiLego_();   // v98 Oxyz lớp 12: hình 3D xin ở lời gọi riêng có schema
    return kgChuan ? gonPromptKhongGian_(pHH, r) : pHH;
  }
  return [].concat(
    dauVao,
    ['Mỗi bài là một câu chuyện toán học. Thêm ở gốc JSON "cau_chuyen":{"nguoi_ke":"vai người kể","dia_diem":"địa điểm cụ thể","muc_tieu":"quyết định cần đưa ra","phong_canh":{"troi":"#RRGGBB","dat":"#RRGGBB","vat":[{"ten":"chi tiết đặc trưng của nơi này","hinh":"hop|tru|cau|non","tam":[x,y,z],"co":[rộng,cao,sâu],"mau":"#RRGGBB"}]}}. Dùng màu hex thực. Bố trí 3–32 khối ghép thành cảnh nhận diện được: X trái/phải từ -10 đến 10, Y là độ cao 0–8, Z từ -12 đến 0 (xa tới gần), kích thước mỗi trục >0 và ≤20. Đây là phối cảnh trang trí, vật mang số liệu trình bày riêng đúng theo đề. Chừa trung tâm cho hình và phép tính.\n',
     'Dùng một người kể xuyên suốt: mở ngay lúc nhân vật cần quyết định; từ điều họ quan sát, dẫn tới đại lượng và giải thích vì sao chọn từng bước; kiểm tra đáp án rồi quay về kết quả đối với nhân vật. Kể bằng loi_thoai thực sự nghe được. Không tự thêm điều kiện, con số hay đổi đáp án để tạo kịch tính. Với chứng minh trừu tượng, kể hành trình tìm manh mối trên bàn vẽ và giữ nguyên giả thiết. Chọn hook, chuyển cảnh và câu kết phục vụ câu chuyện đó.\n'],
    hh ? [] : [huongDanDacTaCanh_()],
    !hh && dungKhung4Tang_(r) ? [huongDanKhung4Tang_(r)] : [],
    hh ? [] : ['Trước khi xuất JSON, kiểm lại từng cảnh với đề và lời giải đã xác minh: số lượng, đơn vị, điều kiện áp dụng, kết quả trung gian và đáp số. Ví dụ sai có chủ ý phải ghi rõ và giải thích cách sửa. Đối chiếu hành động vật lý với chính câu lời thoại kích hoạt nó; giữ cùng vật và đại lượng qua điểm chuyển cảnh. Cảnh 1 bắt buộc có vật thật theo đề cho Blender, khai báo hành động vật lý có trong lời kể; cảnh 2 là de_bai chuyển chính vật đó thành hình toán cùng góc nhìn. Trong các cảnh giải, giữ góc máy ổn định, dùng net_toan trên từng cảnh khi cần sơ đồ mới: [{diem:[[x,y],...],nhan:"nhãn ngắn"}], tọa độ chuẩn hóa 0–1 từ trái sang phải và trên xuống dưới; một điểm là chấm, nhiều điểm là đường gấp khúc, khép kín để vẽ đa giác. Dựng đường, đồ thị và nhãn từ số liệu đã kiểm chứng, đưa công thức vào noi_dung_man_hinh. Với bài xe ô tô chạy trên đường, khai báo vật xe, ghi đúng hàm từ đề vào noi_dung_man_hinh và tách câu khi xe phanh, dừng hoặc chạy tiếp. Đừng viết sự kiện giả định thành câu kể. Với phép thử bi, xu, xúc xắc và trò chọn cửa, ghi số lượng, màu, kết quả và hành động trong san_khau theo đúng dữ kiện. Xe đơn chạy trên đường và các phép thử đã có bộ dựng riêng. Với các vật lý khác cần mô hình riêng, đặt mo_hinh_3d ngay trên cảnh, gồm chi_tiet và doan_toan. Mỗi chi tiết ghi tu_de nguyên văn đề, hinh, tam [X,Y,Z] theo mét, co [dài,rộng,cao], xoay theo độ, vat_lieu. Dùng thuyen hoặc bang_chuyen (trục dài X) khi đúng loại vật; ghép hop, tru, non, cau, hoặc lang_tru với day là 3–24 đỉnh XY của một đa giác lồi theo thứ tự chu vi. Vật chưa có mẫu có thể mô tả bằng khoi_tiet_dien với tang gồm 2–16 hàng [z,tâm_x,tâm_y,bán_kính_x,bán_kính_y], z tăng dần và bán kính dương; bộ dựng nối các tiết diện elip và co giãn về co. Nếu tiết diện chưa diễn tả được vật, tự tạo luoi_tam_giac với dinh là 3–256 đỉnh XYZ và mat là 1–512 tam giác gồm ba chỉ số đỉnh từ 0 theo thứ tự ngược chiều kim đồng hồ khi nhìn từ ngoài. Tách hình phức tạp thành nhiều phần. Đặt tất cả trong cùng hệ tọa độ, vẽ đủ các đối tượng và đúng quan hệ, số lượng. Vật chạy có dich_chuyen [dx,dy,dz] từ vị trí đầu đến cuối. doan_toan chứa các {a:[x,y,z],b:[x,y,z],tu_de:"trích đề",do_dai:"8 m"} để Manim hiện đúng đường đo; chỉ ghi do_dai nếu nằm nguyên văn trong trích dẫn. Có thể gắn id riêng cho chi tiết và thay tọa độ đầu mút bằng {"vat":"id","lech":[dx,dy,dz]} tính từ tâm cuối của vật, lệch theo các trục thế giới. Khoảng cách tới bờ thẳng là đoạn vuông góc tới bờ; phân biệt với quãng đường thuyền chạy. Giữ biểu đồ và các bước chứng minh trừu tượng ở dạng toán.\n'],
    ['GIỮ CHÂN NGƯỜI XEM (rất quan trọng trên TikTok): (a) cứ 2-3 giây phải có một thay đổi trên màn hình (vật mới, hành động, đổi cảnh); (b) mở một "vòng lặp tò mò" ở cảnh 1-2 và chỉ đóng ở cảnh đáp án ("đến cuối bạn sẽ thấy vì sao..."); ',
    '(c) có một khoảnh khắc mời người xem đoán trước ("dừng video, đoán thử đi"); (d) ưu tiên đề có kết quả TRÁI TRỰC GIÁC hoặc tình huống đời thực gây tranh cãi (gameshow, bốc thăm, xổ số, sinh nhật trùng nhau, mật khẩu, trận đấu...); (e) câu ngắn, động từ mạnh, không giảng dài.\n'],
    moDau,
    khopDe,
    sanPham,
    nangCao,
    noiCanh,
    ['4) MỖI CẢNH CÓ: "loai"; "tieu_de_canh" (BẮT BUỘC từ cảnh 2: câu tiêu đề in chữ trắng thật lớn ở đầu cảnh, 3-8 từ, nói đúng ý chính của cảnh, ví dụ "Cùng giới nghĩa là gì?", "Bẫy: quên hai bạn nữ"); ',
    '"tu_khoa" (1-3 từ nằm NGUYÊN VĂN trong tieu_de_canh, được tô cam); "nhan" (tùy chọn, nhãn cam ngắn tối đa 2 từ, ví dụ "BƯỚC 1"; để trống thì máy tự đặt theo loại cảnh); ',
    '"loi_thoai"; "noi_dung_man_hinh"; "trinh_bay"; "chu_thich" (tùy chọn); "chuyen_canh" (tùy chọn: mo | truot_len | nghieng | luot_ngang | truot_xuong | day_ngang | quet_sang | tron_mo | zoom_xuyen | lat_3d | lat_ngang | phong; để trống thì máy tự chọn đa dạng theo mạch bài); "giu_san_khau" (mặc định là false để MỖI CẢNH dựng một khung hình minh họa mới khớp đúng đoạn nội dung cảnh đó đang nói); "minh_hoa".\n',
    'LỜI THOẠI: câu ngắn (≤ 16 từ mỗi câu), mỗi cảnh ≤ 45 từ, giọng tự nhiên như đang nói chuyện ("để ý nhé", "thử nghĩ xem", "vì sao?"). Số và công thức viết thành LỜI ("ba phần năm", "C tám hai"), KHÔNG có ký hiệu LaTeX, dấu / hay %. Đừng đọc lại thứ đã hiện trên màn hình từng chữ một.\n',
    'CÔNG THỨC "noi_dung_man_hinh": mảng LaTeX (không kèm $), phép nhân viết bằng dấu ×, chỉ dùng chữ x cho biến. BẮT BUỘC hiện đầy đủ ở các cảnh mo_hinh_hoa, nhac_lai, diem_chot, tinh_toan, dap_an, kiem_tra để học sinh theo dõi rõ từng bước lập phương trình / tính n(Ω) / tính từng trường hợp n(A) / biến đổi đại số. Tối đa 3 dòng (cong_don tối đa 4), mỗi dòng ngắn; chữ tiếng Việt đặt trong \\text{}; chỉ dùng \\frac, \\times, \\cdot, \\binom, \\text, ^, _, \\cup, \\cap, \\Rightarrow, \\overline. ',
    'Dòng công thức ngắn ở cảnh thu_nho/diem_chot nên dùng "xep": máy hiện từng dòng như đang VIẾT TAY bằng bút chì. Tô màu biến theo vật trên sân khấu (ví dụ x cam, y xanh) bằng \\\\textcolor để người xem nối hình với công thức. ',
    '"trinh_bay": "cong_don" (ưu tiên cho tính toán/đáp án: dòng sau GIỮ NGUYÊN dòng trước và nối thêm "=...", ví dụ ["P=\\\\frac{10}{28}+\\\\frac{3}{28}","P=\\\\frac{10}{28}+\\\\frac{3}{28}=\\\\frac{13}{28}"]) | "bien_doi" | "xep". Dòng CUỐI của cảnh đáp án phải là đáp án đúng. ',
    'Màu theo ý nghĩa: mỗi đối tượng một màu, dùng ĐÚNG màu đó ở cả hình và công thức: do=#FF5C61, xanh_duong=#4FC3F7, xanh_la=#3BF29A, cam=#FF8A3D, tim=#B79CFF, hong=#FF7EB6; tô trong công thức bằng \\\\textcolor{#FF5C61}{...}.\n\n'],
    ['5) HÌNH MINH HỌA = "SÂN KHẤU" (quan trọng nhất sau hook; hình nghèo nàn là kịch bản bị loại):\n',
    '- Ít nhất 4 cảnh (và mọi cảnh mo_dau, de_bai, y_do, bay, dap_an) dùng "minh_hoa.loai":"san_khau". Chỉ cảnh tính toán mới được dùng mẫu chuyên: so_do_cay, luoi_mau, dien_tich, venn, bang. KHÔNG dùng hình chỉ toàn emoji hay chỉ toàn chữ; KHÔNG vẽ sơ đồ bằng các đoạn thẳng khi có vật thật thay thế được.\n',
    '- "mo_ta": mô tả như đạo diễn (≥ 40 ký tự): vật gì, ở đâu, màu gì, chuyển động gì theo câu thoại nào, người xem phải hiểu ra điều gì.\n',
    '- "du_lieu": {"vat":[...], "hanh_dong":[...]}. Khung sân khấu tọa độ PHẦN TRĂM: x 0-100 trái sang phải, y 0-100 trên xuống dưới; (x,y) là TÂM vật. Mỗi cảnh 1-5 vật; các vật lớn cách nhau ít nhất 30 đơn vị theo y (xếp trên-dưới) hoặc 35 theo x (xếp trái-phải); nhóm nhiều phần tử (người, thẻ, cửa) nên chiếm cả một hàng (x=50). "buoc" 1-6 là thứ tự xuất hiện, mỗi bước khớp với một câu/ý trong lời thoại theo đúng thứ tự.\n'],
    ['- VẬT ("loai" và các trường riêng; trường chung: id (bắt buộc, duy nhất), loai, x, y, buoc, co (0.5-1.5, cỡ), mau, nhan (chữ dưới vật), tu_huong (trai|phai|tren|duoi: bay vào từ hướng đó)):\n',
    '  nguoi {so_luong 1-12, ds:["An","Bình"...] tên từng người}: học sinh, cầu thủ, khách hàng. | the {so_luong 1-8, noi_dung hoặc ds: chữ trên từng thẻ, gia_tri_chu: số lớn}: phiếu, vé, thẻ số, lựa chọn, trường hợp. | ',
    'the_bai {ds:["A♥","7♠","K♦"]}: lá bài tự rơi và lật mặt. | Cảnh xác suất tập trung vào một phép thử: đặt một vật chính trên sân khấu, dùng nhom cho số bi từng màu và lay_ra đúng màu, đúng số viên ở bước minh họa; nếu kết quả ngẫu nhiên chưa biết, chỉ đặt giá trị cụ thể khi lời thoại nói rõ đây là một ví dụ. | xuc_xac {so_luong 1-3, ket_qua:[3,5]}: xúc xắc lăn rồi dừng đúng mặt khi có hành động quay. | dong_xu {so_luong 1-4, ds:["S","N"]}: đồng xu tung lật. | ',
    'hop_bi {nhom:[{"mau":"do","so":5},{"mau":"xanh_duong","so":3}]}: hộp trong suốt, bi rơi vào. | tui {nhom:[...]}: túi bốc thăm (không thấy bên trong). | hop_qua {gia_tri_chu hoặc noi_dung, emoji}: hộp quà mở ra lộ phần thưởng. | ',
    'dong_ho {nhan}: đồng hồ, kim quay. | dien_thoai {noi_dung: tiêu đề màn hình, ds: các dòng/tin nhắn/lựa chọn, gia_tri_chu: nút}: ứng dụng, tin nhắn, mật khẩu. | bong_bay {gia_tri 0-1: độ phồng, gia_tri_chu}. | ',
    'dong_ho_do {gia_tri: xác suất 0-1, gia_tri_chu:"13/28", nhan}: đồng hồ đo xác suất, kim quét tới giá trị (DÙNG ở cảnh đáp án). | bieu_do_cot {ds: nhãn cột, ds_so: số liệu, toi_uu: "min|max" (cột tối ưu tô nổi - chỉ ở cảnh kiem_tra/thu_lai, không ở cảnh đặt vấn đề), khi_noi_dong: [cụm NGUYÊN VĂN lời đọc lúc hiện từng cột]}: so sánh số cách/xác suất, các giá trị thử. | thanh {gia_tri 0-1, gia_tri_chu, nhan}: thanh xác suất. | ',
    'vong_quay {ds: nhãn các ô (2-12), ket_qua: số thứ tự ô dừng}: vòng quay may mắn. | cua {so_luong 2-4, ds: thứ sau mỗi cửa}: các cánh cửa. | banh {so_luong 2-12: số phần bằng nhau, ds}: chiếc bánh/pizza chia phần (tỉ lệ, phần bù). | ',
    'anh_that {anh: chỉ số ảnh thật của sản phẩm, nhan, gia: true|false}: ẢNH THẬT của sản phẩm (CHỈ dùng trong video có sản phẩm); chon = viền sáng lên. | ' +
    'ban_tron {ds: 3-16 nhãn ghế theo chiều kim đồng hồ từ ghế trên cùng ("Nam","Nữ", tên; "_" = ghế trống), noi_dung: chữ giữa bàn}: BÀN TRÒN có người ngồi quanh - BẮT BUỘC cho đề "ngồi quanh bàn tròn / xếp vòng tròn" (KHÔNG vẽ người xếp hàng ngang); chon/loai_bo theo số ghế, quay = cả vòng xoay 1 ghế (minh họa xoay vòng vẫn là một cách xếp), doi_chu đổi nhãn ghế. | ' +
    'luoi_o {so_luong 4-64, so_cot, ds: chữ trong từng ô (tùy chọn), nhan}: lưới ô lấp đầy lần lượt, rất hợp với KHÔNG GIAN MẪU (36 kết quả tung 2 xúc xắc, 30 lượt chơi...) rồi "chon" các ô thuận lợi. | ',
    'bang_bien_thien {noi_dung: tên hàm, bien: "x", ham: "f", moc: ["0","3","+\\infty"] (các mốc x, kể cả hai đầu), dau: ["-","+"] (dấu của đạo hàm trên từng khoảng, đủ moc.length-1 phần tử), gia_tri: ["+\\infty","54","+\\infty"] (giá trị f tại từng mốc, dùng "?" cho giá trị chưa tính tới), khi_noi_dong: [cụm lúc nói hàng dấu, cụm lúc nói hàng giá trị]}: BẢNG BIẾN THIÊN CHUẨN SGK (3 hàng x / đạo hàm / hàm, mũi tên tăng/giảm), dùng khi lời giảng lập bảng biến thiên (lớp 12; lớp 10-11 KHÔNG dùng). | ' +
    'danh_sach {noi_dung: tiêu đề thẻ, ds: 2-5 dòng ngắn, khi_noi_dong: mảng cùng độ dài ds, mỗi phần tử là cụm 3-6 từ NGUYÊN VĂN trong loi_thoai lúc bắt đầu nói dòng đó (dòng chỉ hiện khi giọng đọc tới)}: thẻ sáng nổi có các dòng đánh số trượt vào; "chon" tô vàng quét ngang dòng quan trọng, "loai_bo" gạch dòng sai (liệt kê trường hợp, điều kiện, luật chơi). | ',
    'nhan {noi_dung ≤ 4 từ, tu_khoa: phần tô cam, xoay -6..6}: nhãn neon chữ lớn. | chu {noi_dung: chữ hoặc LaTeX}. | so_dem {noi_dung: chú thích trên, gia_tri: số đích, nhan: đơn vị, kieu:"vien" để thành huy hiệu vàng}: số LĂN như đồng hồ công-tơ-mét từ 0 lên. | mui_ten {tu: id vật đầu, den: id vật cuối, nhan}: mũi tên cong nối hai vật. | bieu_tuong {emoji, so_luong}: chỉ dùng phụ trợ, tối đa 1 mỗi cảnh.\n'],
    vat3d,
    ['  Màu "mau": do, xanh_duong, xanh_la, cam, vang, tim, hong, ngoc, trang, xam, nau.\n',
    '- HÀNH ĐỘNG {"buoc","vat":id,"kieu",...}: chon {chi_so:[phần tử thứ mấy, từ 1], mau}: sáng viền + dấu tích, các phần tử khác tối đi | loai_bo {chi_so}: gạch chéo đỏ, ngả xám | sang: nhấp sáng | rung: rung lắc (dùng cho cái bẫy, chỗ sai) | ',
    'quay: xúc xắc lăn, xu lật, vòng quay quay, kim đồng hồ chạy, lá bài lật | mo {chi_so}: mở cửa / mở hộp quà | lay_ra {so, mau}: lấy bi ra khỏi hộp/túi bay sang khay | dat_gia_tri {gia_tri, gia_tri_chu}: đổi giá trị đồng hồ đo, thanh, bóng bay | ',
    'goc_3d {nghieng: 0-65, xoay: -60..60} (không cần vat): CAMERA 3D, sàn nghiêng như nhìn chéo xuống bàn cờ, vật đứng trên sàn có bóng đổ; xoay = đi vòng quanh sân khấu; nghieng 0 + xoay 0 = trở về nhìn thẳng 2D | ' +
    'bung_ra: nhóm thẻ bung tung tóe (nhiều trường hợp) | di_chuyen {x,y} | phong_to {vat hoặc x,y, muc 1.2-2}: camera zoom vào chi tiết | thu_nho: camera về toàn cảnh | an: ẩn vật | doi_chu {noi_dung, gia_tri_chu}: đổi chữ trên vật.\n'],
    ['- KHÔNG GIAN 3D (làm video giống thật, đổi góc nhìn đa dạng): với tình huống có vật thật đặt trên mặt bàn/sàn (xúc xắc, đồng xu, lá bài, hộp bi, cửa, người đứng thành hàng), đặt "goc_nhin":"ban" trong du_lieu để cảnh mở ra ở góc nhìn chéo 3D, hoặc dùng goc_3d để camera nghiêng/xoay quanh vật vào đúng lúc lời thoại nhấn mạnh (ví dụ xoay sang thấy rõ mặt xúc xắc). Cảnh có công thức, biểu đồ, danh sách thì để nhìn thẳng (không goc_nhin). Khoảng 2-4 cảnh mỗi video có góc 3D là đẹp; xúc xắc là khối lập phương 3D thật, đồng xu và lá bài lật 3D.\n',
    '  Mỗi cảnh san_khau phải có ít nhất 1 hành động ngoài việc xuất hiện. Khi giu_san_khau=true, hành động được nhắm vào id của vật ở cảnh trước.\n'],
    goiY,
    ['- Mẫu chuyên cho cảnh tính toán (dữ liệu y như cũ): so_do_cay {"goc","nhanh":[{"nhan","xs","mau","con":[...],"kq","to"}]}; luoi_mau {"hang_nhan","cot_nhan","ten_hang","ten_cot","su_kien":[{"ten","mau","o":[[h,c]],"xs"}]}; ',
    'dien_tich {"cot":[{"nhan","xs","gia_tri","mau","hang":[{"nhan","xs","gia_tri","kq","to"}]}],"tong"}; venn {"A","B","mau_A","mau_B","dem":{"chiA","giao","chiB","ngoai"},"to":[...]}; bang {"cot":[...],"hang":[[...]]}.\n',
    '- "chu_thich" (tùy chọn): 1-2 dòng ngắn (≤ 40 ký tự) trong khung vàng, cho quy tắc cần nhớ.\n\n'],
    viDu,
    traVe
  ).join('');
}


// Đề có vấn đề (bước giải phát hiện: không có đáp số khớp chính xác, mâu thuẫn...) -> kịch bản phải nói thật, phép tính phải đúng.
// ===== ĐẶC TẢ CẢNH (dac_ta_canh v1) cho luồng thực tế & xác suất =====
// Danh sách id phải khớp scripts/thu_vien_3d/danh_muc.json (test_dac_ta_canh.py kiểm).
var DANH_MUC_3D_ = {
  vat: ['hop','hop_khong_nap','tam_bia','be_tru','be_hop','bon_kin','lon','bon_vom','chai','coc','ban','ghe','ke','o_to','xe_tai','xe_dap','xe_may','thuyen','bang_chuyen','nguoi','cay','nha','cot','hang_rao','cua','thang','bong','qua','hop_bi','bi','xuc_xac','dong_xu','the','ca','dong_vat','cay_nho'],
  moi_truong: ['trai_ca','nong_trai','san_truong','lop_hoc','nha_xuong','duong_pho','bai_do_xe','bo_song','cua_hang','bep','cong_vien','cong_truong','ban_thi_nghiem','phong','ngoai_troi']
};

function huongDanDacTaCanh_() {
  return 'ĐẶC TẢ CẢNH 3D (BẮT BUỘC với bài thực tế / xác suất): thêm ở gốc JSON "dac_ta_canh" mô tả NGỮ NGHĨA cảnh mở đầu; KHÔNG ghi tọa độ, máy tự xếp chỗ theo kích thước thật và quan hệ. Cấu trúc: ' +
    '{"phien_ban":1,"boi_canh":{"mau":"<một id bối cảnh hoặc null>","trong_nha":true|false,"thoi_gian":"sang|trua|chieu|toi","tu_de":"cụm NGUYÊN VĂN chỉ địa điểm trong đề","mo_ta":"chi tiết nhận diện nơi này"},' +
    '"thuc_the":[{"id":"chu_thuong_khong_dau","ten":"tên vật","tu_de":"cụm NGUYÊN VĂN trong đề (kèm số lượng, màu nếu đề ghi)","lop":"vat_chua|phuong_tien|cong_trinh|nguoi|cay|dong_vat|do_vat|do_choi_xac_suat|noi_that|thuc_pham|khac",' +
    '"mau_tv":"<một id mẫu hoặc null>","so_luong":<số nguyên đúng đề hoặc "nhieu">,"mau_sac":"do|xanh_duong|xanh_la|vang|trang|den|cam|tim|hong|nau|xam hoặc #RRGGBB, hoặc mảng màu từng chiếc","vai_tro":"chinh|phu|trang_tri",' +
    '"kich_thuoc":{"dai|rong|cao|duong_kinh|ban_kinh|day":{"gt":số,"dv":"m|cm|mm|dm|km","nguon":"de|uoc_luong"}},"trang_thai":{"muc_nuoc":0..1}}],' +
    '"quan_he":[{"kieu":"xep_hang|luoi","vat":"id","huong":"ngang|doc","khoang_cach":{"gt":số,"dv":"m"}},{"kieu":"trong|tren|canh|cach|dua_vao","a":"id","b":"id hoặc id#k","phia":"trai|phai|truoc|sau"}],' +
    '"so_lieu":[{"gan":"id#k.cao|dai|rong|duong_kinh hoặc khoang_cach:id,id","nhan":"2 m","tu_de":"cụm nguyên văn"}],' +
    '"phep_thu":{"khong_gian":["id"...],"chon":k,"hoan_lai":false},' +
    '"quay":[{"canh":<số thứ tự cảnh>,"tieu_diem":["id"],"goc_may":"toan_canh|trung|can|tu_tren|ngang","hanh_dong":[{"vat":"id","dong_tu":"di_chuyen|roi|lay_ra|bo_vao|tung|lan|quay|rot_day|gap_hop|mo|dong|xep|danh_dau_chon|sang_len|dung_yen","so":n,"khi_noi":"cụm NGUYÊN VĂN trong loi_thoai của cảnh đó"}]}]}. ' +
    'Id mẫu vật có sẵn: ' + DANH_MUC_3D_.vat.join(', ') + '. Đúng hình theo tính từ của đề: bồn/téc "kín", "có nắp", hóa chất -> bon_kin (có nắp, không lộ nước); "hộp không nắp" -> hop_khong_nap; tấm bìa cắt 4 góc gấp hộp -> tam_bia với trang_thai.cat = cạnh ô cắt / cạnh tấm và hành động gap_hop khi lời thoại nói gấp. Chỉ thêm người khi đề nhắc VÀ người có hành động; không đặt vật trên/trong người. Id bối cảnh: ' + DANH_MUC_3D_.moi_truong.join(', ') + '. Vật không có mẫu: mau_tv null, máy tự sinh bản ghép. ' +
    'QUY TẮC BÁM ĐỀ: (1) liệt kê MỌI vật và nhân vật đề nhắc (vật mang số liệu là "chinh"; người/vật trong câu chuyện là "phu"; chi tiết thêm cho sinh động là "trang_tri"); ' +
    '(2) so_luong và màu đúng từng chữ của đề, mỗi nhóm khác màu là một thực thể riêng (4 xe đỏ, 3 xe trắng -> 2 thực thể); (3) kích thước có trong đề ghi nguon "de" với đúng số và đơn vị của đề, tự ước lượng ghi "uoc_luong"; ' +
    '(4) bối cảnh đúng địa điểm của đề/câu chuyện, không thay bằng phòng học hay nền trống chung chung; (5) so_lieu chỉ gắn dữ kiện độ dài của đề lên đúng vật.\n';
}

// ===== v91: KHUNG 4 TẦNG + SÂN KHẤU 3D VECTOR (luồng thực tế & xác suất; Remotion dựng, KHÔNG cần Blender) =====
// Schema khớp src/khung4tang/kieu.ts + src/3d-vector/dac_ta.ts; mốc thời gian AI ghi bằng "khi_noi", chuanbi.py đổi ra giây.
var LOAI_3DV_ = ['diem', 'doan_thang', 'vector', 'da_giac', 'hinh_hop', 'mat_cau', 'hinh_tru', 'hinh_non', 'hinh_chop', 'duong_cong', 'goc', 'nhom_lap'];
var MAU_3DV_ = ['cyan', 'vang', 'hong', 'ngoc', 'trang', 'xam'];
function boDungMacDinh_() { return String((typeof cauHinh_ === 'function' && cauHinh_('BO_DUNG_MAC_DINH')) || '3d_vector').toLowerCase() === 'blender' ? 'blender' : '3d_vector'; }
function dungKhung4Tang_(r) {
  if (typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r)) return false;   // khóa luồng hình học thuần: Manim
  if (typeof laVideoDai_ === 'function' && laVideoDai_(r)) return false;      // chuyên đề 10 phút giữ đường dựng cũ
  return boDungMacDinh_() === '3d_vector';
}
// v92: 8 KHUÔN 3D THAM SỐ (src/3d-vector/khuon): AI chỉ ghi {khuon, tham_so, pha} -> máy dựng hình + chuyển động từng bước.
var KHUON_3DV_ = {
  tam_bia_gap_hop: {ts: '{"a":12,"b":12,"x":2,"ten_x":"x"}', pha: 'nguyen_ven, to_goc, an_goc, gap, nhan_canh, the_tich', dung: 'tấm bìa/tôn a×b cắt 4 góc vuông cạnh x rồi gập hộp không nắp'},
  tru_non_toi_uu: {ts: '{"loai":"tru|non","V":512,"r":4,"h":8,"phoi":false}', pha: 'khoi, kich_thuoc, quet (nón: duong_sinh), phoi|be_mat, ket', dung: 'lon/cốc/bồn hình trụ, phễu hình nón tối ưu vật liệu (phoi:true khi đề cắt nắp/đáy từ tấm vuông)'},
  luoi_the_bi_xac_suat: {ts: '{"vat":"the|bi","N":12,"nhom":[{"mau":"hong","so":5},{"mau":"cyan","so":3}],"chon":[[1,2,3],[4,8,12]],"k":3}', pha: 'hien, khong_gian_mau, chon_1, chon_2 ..., ket', dung: 'thẻ đánh số 1..N hoặc bi nhiều màu; mỗi pha chon_i nhấc nổi + tô sáng các phần tử được chọn (chon ghi SỐ trên thẻ / thứ tự bi, 1-based)'},
  parabol_quy_dao: {ts: '{"ham":"20-4t","t":[0,5],"ten_ham":"v","ten_bien":"t","dien_tich":true}', pha: 'truc, ve, diem, dien_tich|dinh, ket', dung: 'đồ thị v(t), s(t), quỹ đạo ném, cổng parabol; dien_tich = tô vùng dưới đồ thị (quãng đường = tích phân, chỉ lớp 12)'},
  hai_mat_cau_oxyz: {ts: '{"tam1":[1,2,3],"r1":3,"tam2":[4,0,1],"r2":2,"duong":{"qua":[0,0,0],"vtcp":[1,1,0]},"ten_m":"M"}', pha: 'truc, cau1, cau2, duong, truot, ket', dung: 'CHỈ lớp 12: hai mặt cầu, đường thẳng Δ, điểm M trượt trên Δ'},
  khung_day_cap: {ts: '{"so_cap":4,"goc":30,"nhan_luc":"\\\\vec P"}', pha: 'dung, goc, luc, tach, tu_tren, ket', dung: 'vật treo bởi 3-4 dây cáp hợp với phương thẳng đứng góc α, tách lực căng (lớp 12)'},
  mat_phang_cat_khoi: {ts: '{"khoi":"hop|tru","kich_thuoc":[4,3,3],"r":1.5,"h":3}', pha: 'khoi, mat_phang, truot, giao_tuyen, ket', dung: 'mặt phẳng song song đáy trượt cắt khối, tô sáng thiết diện'},
  chop_lang_tru: {ts: '{"loai":"chop_tu_giac|chop_tam_giac|lang_tru_tam_giac","a":2,"h":3}', pha: 'khoi, duong_cao (lăng trụ: cheo), tam_giac, goc, ket', dung: 'chóp/lăng trụ: đường cao, tam giác vuông, góc giữa cạnh/mặt và đáy'}
};
function dsKhuonTheoLop_(lop, mon) {
  if (String(mon || '').toUpperCase() === 'XAC_SUAT') return ['luoi_the_bi_xac_suat'];
  if (String(lop) === '10') return ['parabol_quy_dao'];
  if (String(lop) === '11') return ['tam_bia_gap_hop', 'tru_non_toi_uu', 'chop_lang_tru', 'mat_phang_cat_khoi', 'parabol_quy_dao'];
  return ['tam_bia_gap_hop', 'tru_non_toi_uu', 'parabol_quy_dao', 'hai_mat_cau_oxyz', 'khung_day_cap', 'mat_phang_cat_khoi', 'chop_lang_tru'];
}
function moTaKhuon_(ten) {
  var k = KHUON_3DV_[ten];
  return k ? ten + ' (' + k.dung + '; tham_so ' + k.ts + '; pha: ' + k.pha + ')' : ten;
}
function huongDanKhung4Tang_(r) {
  var lop = String((r && r.lop) || '');
  var dsK = dsKhuonTheoLop_(lop, r && r.mon);
  return 'KHUNG 4 TẦNG + SÂN KHẤU 3D VECTOR (BẮT BUỘC với bài này; video dựng bằng Remotion, không dùng Blender): thêm ở gốc JSON "khung4tang". ' +
    'Màn hình chia cố định: T1 nhãn "BƯỚC n" + tiêu đề | T2 sân khấu 3D vector sống | T3 thẻ giải (công thức / máy tính / bảng biến thiên) | T4 thanh ghim ĐỀ. KHÔNG có phụ đề chạy chữ. ' +
    'Cấu trúc: {"phu_de":"tat","de_ghim":[{"id":"chu_khong_dau","nhan":"LaTeX ngắn ≤ 14 ký tự, ví dụ F = 4500, \\\\alpha = 60^\\\\circ, P = ?","mau":"hong nếu là ẩn cần tìm"}] (2-5 dữ kiện),' +
    '"buoc":[{"canh":số thứ tự cảnh (1-based) nơi bước bắt đầu,"khi_noi":"cụm 3-6 từ NGUYÊN VĂN trong loi_thoai của đúng cảnh đó, ở câu MỞ ĐẦU bước","nhan":"Dựng hình|Lập hàm|Tối ưu|Kết luận ≤ 3 từ",' +
    '"tieu_de":"≤ 8 từ; ký hiệu toán viết LaTeX (\\\\Omega, C_{12}^{3}, S_A, V\'(x)), TUYỆT ĐỐI KHÔNG ghi đáp số (kể cả bước kết luận: viết \\"Kết luận: V lớn nhất khi x = ?\\")","mau":"' + MAU_3DV_.join('|') + '","du_kien":["id trong de_ghim dùng ở bước này"],' +
    '"the":[2-3 thẻ NỐI TIẾP đúng nhịp đọc, MỖI thẻ có "khi_noi" (cụm nguyên văn lúc đọc tới thẻ đó); thẻ đầu ngay câu đầu bước, không thẻ nào đứng một mình quá 12 giây: ' +
    '{"loai":"cong_thuc","nhan":"tùy chọn","dong":["1-3 dòng LaTeX"],"khi_noi":"...","khi_noi_dong":["cụm nguyên văn lúc hiện từng dòng"]} | ' +
    '{"loai":"casio","phim":[...],"ket_qua":"...","khi_noi":"..."} (tìm GTLN/GTNN: dùng MENU 8 (Table) nhập f(X) rồi đọc bảng, hoặc giải phương trình f\'(x) = 0 rồi CALC thế nghiệm; CẤM hướng dẫn SHIFT SOLVE ra thẳng cực trị) | ' +
    '{"loai":"bang_bien_thien","ham":"tên hàm của bài: V, S, f...","bien":"x|r|t","moc_x":[...],"dau":[...],"gia_tri":[...],"khi_noi":"..."} | {"loai":"chu","noi_dung":"≤ 12 từ","khi_noi":"..."}]}] (3-6 bước theo đúng thứ tự lời giảng; bước 2 trở đi chỉ bắt đầu SAU khi đã đọc xong đề),' +
    '"canh_3d_vector": ƯU TIÊN KHUÔN THAM SỐ {"khuon":"tên khuôn","tham_so":{...số liệu ĐÚNG của đề...},"pha":[{"ten":"tên pha","khi_noi":"cụm nguyên văn lúc chuyển sang pha đó"}]} (pha không ghi khi_noi thì máy tự trải theo các bước). ' +
    (String((r && r.mon) || '').toUpperCase() === 'XAC_SUAT'
      ? 'BÀI XÁC SUẤT (v96): KHÔNG ghi "canh_3d_vector" — tầng 2 dùng "san_khau" 2D (rut_mau | so_do_cay | luoi_bayes | cot_phan_phoi), xem hướng dẫn SÂN KHẤU 2D bên dưới. '
      : 'Khuôn dùng được cho bài lớp ' + (lop || '?') + ': ' + dsK.map(moTaKhuon_).join(' | ') + '. ' +
        'Đề KHÔNG có vật thể khối thật (kinh tế / chuyển động 2D / tăng trưởng / đại số thuần) thì KHÔNG ghi canh_3d_vector mà ghi "san_khau" 2D (xem bên dưới). ') +
    'CHỈ khi không khuôn nào hợp mới dùng đặc tả tự do {"phien_ban":1,"doi_tuong":[...],"buoc":[{"khi_noi","camera":[goc_ngang,goc_cao 5..90,zoom] hoặc "tu_tren","hien":[id],"an":[id],"nhan_manh":[id],"hanh_dong":[...]}]} ' +
    '(≥ 3 bước có thay đổi; tọa độ [x,y,z], z hướng lên, khối ~[-3,3]³): diem {toa_do,nhan} | doan_thang/vector {tu,den} | da_giac {diem:[[x,y,z]...],ban_le?} | hinh_hop {tam,kich_thuoc,ten_dinh,nap} | mat_cau {tam,ban_kinh} | ' +
    'hinh_tru/hinh_non {day:[x,y,z],ban_kinh,cao} | hinh_chop {day:[[x,y,z]...],dinh} | duong_cong {diem|ham} | goc {dinh,canh:[id,id]} | nhom_lap {vat:"the|bi|khoi",so:N,xep:"luoi|hang|vong",mau_tung:[...],nhan_tung:[...]}; ' +
    'hành động: truot_diem, tach_vector, gap_mat, dich {vec}, ve_dan, nang {chi_so (0-based),mau}. Màu mang nghĩa: cyan = đề cho, vàng = đang xét/kết quả, hồng = ẩn cần tìm, ngọc = đã kiểm chứng. ' +
    (lop === '10' ? 'Lớp 10: chỉ hình PHẲNG, không Oxyz, không đạo hàm/tích phân. ' : lop === '11' ? 'Lớp 11: KHÔNG dùng hệ tọa độ Oxyz, không bảng biến thiên/đạo hàm tìm cực trị (dùng Cauchy / tam thức bậc hai). ' : '') +
    'Mọi khi_noi phải trích NGUYÊN VĂN loi_thoai (máy khớp từng từ); số liệu trên de_ghim, tham_so và thẻ phải khớp đề và đáp án.\n' +
    (typeof huongDanSanKhau_ === 'function' ? huongDanSanKhau_(r) : '') +
    huongDanMocCau_(r);
}
// v93: INTRO "3 GIÂY MÓC CÂU" + OUTRO "TÓM TẮT 3 BƯỚC" + ĐỐI CHIẾU HÌNH ↔ ĐỒ THỊ (đều TÙY CHỌN; thiếu thì Auto-fix tự sinh)
function huongDanMocCau_(r) {
  var lop = String((r && r.lop) || '');
  return 'INTRO MÓC CÂU & OUTRO (tùy chọn, ở GỐC JSON; chữ thường không LaTeX, KHÔNG chứa đáp số): ' +
    '"nhan_thi": ngữ cảnh thi ≤ 28 ký tự, IN HOA (ví dụ "' + (lop === '12' ? 'ĐỀ THI THPT · LỚP 12' : lop === '9' ? 'ÔN THI VÀO 10' : 'ĐỀ GIỮA KÌ 1 · LỚP ' + (lop || '11')) + '"; chỉ ghi tên kỳ thi thật khi đề đúng là đề thi đó), ' +
    '"tieu_de_intro": tiêu đề IN HOA ≤ 40 ký tự (tối đa 2 dòng), nêu tình huống/câu hỏi ĐÚNG bản chất toán (ví dụ "LON NƯỚC TỐN ÍT NHÔM NHẤT", bài hộp: "CẮT CẠNH BAO NHIÊU ĐỂ HỘP LỚN NHẤT?"), ' +
    '"phu_de_intro": 2-3 cụm chuyên đề nối bằng " · ", ≤ 36 ký tự (ví dụ "VECTƠ · LỰC CĂNG · GTNN"), ' +
    '"cau_hook": câu hook tâm lý ≤ 40 ký tự (ví dụ "MUỐN 9+ THI KÌ KHÔNG THỂ BỎ QUA!"; không bịa số liệu thống kê), "cta": nhãn nút 2-4 từ, một trong "LƯU LẠI NGAY!" | "ĐĂNG KÝ KÊNH!" | "BÌNH LUẬN NGAY!" | "CHIA SẺ NGAY!" | "THEO DÕI KÊNH!", PHẢI trùng nghĩa câu kêu gọi giọng đọc ở cảnh cuối (máy lấy lời đọc làm chuẩn), ' +
    '"tom_tat_3_buoc": [{"chien_thuat":"≤ 18 ký tự, ví dụ Rút h theo r","cong_thuc":"MỘT dòng LaTeX ≤ 40 ký tự, ví dụ S = 2\\\\pi r^2 + \\\\frac{1024}{r}"}] đúng 3 phần tử theo thứ tự giải (Outro được phép có đáp số). ' +
    'ĐỐI CHIẾU HÌNH ↔ ĐỒ THỊ (chỉ bài TỐI ƯU, đặt ở ĐÚNG MỘT bước khảo sát/xét dấu/tìm cực trị, không đặt ở bước 1): "doi_chieu": {"ham":"biểu thức một biến dùng + - * / ^ ( ) pi, ví dụ x*(12-2*x)^2 hoặc 2*pi*r^2+1024/r","bien":"x|r|t","ten_ham":"V|S|T","mien":[a,b] miền xác định của biến,"kieu":"max|min","toi_uu":số (tùy chọn, phải đúng),' +
    '"nguong":{"gia_tri":số,"kieu":"<=|>=","nhan":"LaTeX ngắn, ví dụ T \\\\le 4000"} (tùy chọn: chỉ khi đề có giới hạn chịu lực/vật liệu/chi phí; điểm tối ưu phải đạt ngưỡng),"hinh":"tam_bia|mat_cat_tru|tam_giac_luc|thanh","tham_so":{"a":12,"b":12} (tam_bia) | {"V":512} (mat_cat_tru)}. ' +
    'Máy tính lại điểm tối ưu và kiểm mọi giá trị; sai hoặc không khớp đáp án thì tầng 2 giữ sân khấu 3D. ' +
    (lop === '10' || lop === '11' ? 'Lớp ' + lop + ': đồ thị chỉ để đối chiếu trực quan, lời giảng vẫn dùng ' + (lop === '10' ? 'tam thức bậc hai / hình phẳng' : 'Cauchy / tam thức bậc hai') + ', không đạo hàm.' : '') + '\n';
}

function vanDeDe_(r) {
  var m = /DE_CO_VAN_DE:\s*(.+)$/.exec(String(r.kiem_chung || ''));
  var chung = 'CHUẨN TOÁN (v92): câu hỏi ở hook/mở bài phải hỏi ĐÚNG đại lượng mà đáp án cuối trả lời (hỏi thể tích thì đáp thể tích, hỏi x thì đáp x); biến cố đối của A luôn viết \\overline{A} (P(\\overline{A}) = 1 - P(A)), không viết nhầm thành A; bấm máy Casio tìm GTLN/GTNN dùng MENU 8 (Table) hoặc giải f\'(x) = 0 rồi CALC, cấm hướng dẫn SHIFT SOLVE ra thẳng cực trị.\n' +
    'MỌI PHÉP TÍNH TRÊN MÀN HÌNH ĐỀU ĐƯỢC MÁY TÍNH LẠI: chỉ cần một vế sai (ví dụ ghi 20·25/2 = 260 trong khi thực ra là 250) là kịch bản bị trả về. Đừng bao giờ "ép" phép tính cho ra số đẹp.\n';
  if (!m) return chung;
  return chung + 'ĐỀ CÓ VẤN ĐỀ (bước giải đã thử ngược và phát hiện): ' + m[1] + '\n' +
    'Video PHẢI nói thật điều này một cách tích cực, như một phát hiện thú vị dạy học sinh biết THỬ LẠI đáp số (ví dụ: "Thử lại: 20 tầng chỉ có 250 ống, 21 tầng lại cần 273 ống, nên 260 ống không xếp vừa khít; xếp được 20 tầng trọn vẹn và còn dư 10 ống"). ' +
    'Có một cảnh "kiem_tra" cho phép thử ngược này; đáp số và các phép tính theo đúng cách hiểu ở trên.\n';
}


// QUY TRÌNH CỐ ĐỊNH 6 PHẦN cho MỌI video (toán thực tế và xác suất như nhau). Máy kiểm tra thứ tự và nội dung từng phần.
function giayMucTieu_() {
  // video nhiều cảnh hơn: mục tiêu cũ (60-100 giây) không đủ cho 14-18 cảnh -> tự nâng nếu CAU_HINH còn giá trị cũ
  var g = String(cauHinh_('GIAY_MUC_TIEU') || '');
  var tren = Number((g.match(/(\d+)\s*$/) || [])[1]) || 0;
  return tren >= 130 ? g : '100-160';
}
// v95: QUY TRÌNH GỌN cho luồng khung 4 tầng (thực tế / tối ưu / Oxyz / xác suất): 50-68 giây, giữ chân người xem.
// Nguyên nhân video 102 s (TT261122-133524-0): prompt cũ ép 15-20 cảnh, 100-160 giây cho MỌI video ngắn.
// v98.3: siết 45-55 giây (giữ chân Shorts/TikTok): hook < 12 chữ, câu 10-18 chữ, đuôi sau đáp án <= 6 giây (mẹo + CTA).
var GIAY_4TANG_ = '45-55';
var TIENG_4TANG_ = '170-220';
function quyTrinhGon4Tang_(tt, r) {
  return 'NHỊP VIDEO GỌN (BẮT BUỘC, video khung 4 tầng): 7-10 cảnh, TỔNG ' + GIAY_4TANG_ + ' GIÂY, toàn bài ' + TIENG_4TANG_ + ' TIẾNG (âm tiết) lời thoại, mỗi cảnh 1 ý, 10-26 tiếng. ' +
    'MỖI CÂU 10-18 CHỮ, văn nói tự nhiên, câu chủ động ("Lấy ra 2 bi, không hoàn lại."), không câu ghép dài. NHẤN vào BẪY đề thi bằng một câu riêng ngắn khi gặp: "không hoàn lại", "tổ hợp C chứ không phải chỉnh hợp A", "chia cho xác suất toàn phần", "đơn vị", "điều kiện của ẩn". ' +
    'Đi THẲNG vào bài toán, mỗi câu phải mang thông tin. CẤM câu rào / sáo rỗng: "Muốn tìm ..., trước hết ta cần ...", "thật tuyệt vời", "khoan chốt vội", "hãy cùng nhau khám phá", "các bạn có biết không", "rất đơn giản thôi". ' +
    '0-3 GIÂY ĐẦU = HOOK: câu đầu tiên của cảnh de_bai là MỘT câu hỏi ngắn < 12 chữ gây tò mò, đi thẳng vào điều cần tìm ("Bi đỏ này đến từ hộp nào?"). CẤM đọc lê thê lại toàn bộ đề: con số / dữ kiện đã có thanh ĐỀ ghim trên màn hình và hình minh họa gánh, lời chỉ nói 1 câu "hỏi gì". ' +
    'Thứ tự cảnh: de_bai (ĐÚNG 1 CẢNH, 3-5 giây: câu hook + 1 câu hỏi gì) -> giải 4-6 cảnh (đặt ẩn + điều kiện; lập hàm; đạo hàm / biến đổi; giải nghiệm; CĂN CỨ CỰC TRỊ) -> dap_an (đáp số + ý nghĩa thực tế ≤ 1 câu ngắn) -> ket_luan (ĐUÔI ≤ 6 GIÂY). ' +
    'ĐỌC ĐỀ ĐÚNG 1 LẦN (v96, máy kiểm, lỗi cứng KB_DOC_LAP_DE): không có cảnh mo_dau / nhac_lai đọc lại đề; câu hook intro chỉ là câu hỏi ≤ 8 từ, không nhắc lại dữ kiện (thanh ĐỀ đã ghim dữ kiện). ' +
    'ĐỌC ĐỦ CÔNG THỨC (v96, lỗi cứng KB_CUT_CONG_THUC): cảnh có dòng màn hình "... = số" thì lời thoại phải đọc ra ĐÚNG số đó (vd "số phần tử không gian mẫu là C(10, 3) = 120"), cấm câu cụt "ta có số phần tử không gian mẫu." rồi im. ' +
    'KHÓA ĐUÔI SAU ĐÁP ÁN (v98.3, máy tự cắt nếu dài): cảnh cuối loai "ket_luan" (hoặc "bai_hoc") CHỈ gồm TỐI ĐA 2 CÂU, tổng ≤ 6 giây (≤ 25 tiếng): (1) MỘT câu mẹo nhớ nhanh ≤ 14 chữ ("Gặp chữ biết rằng: chia cho toàn phần.") và (2) ĐÚNG MỘT câu CTA siêu ngắn kích thích bình luận / lưu bài: "Bình luận đáp án nếu đổi thành 3 bi đỏ!" (cta "BÌNH LUẬN NGAY!") hoặc "Lưu lại kẻo quên mẹo này!" (cta "LƯU LẠI NGAY!"). ' +
    'CẤM sau khi đã lộ đáp án: đọc lại 3 bước tóm tắt (Outro tự HIỆN "tom_tat_3_buoc" bằng hình, KHÔNG đọc), giải thích vòng vo lại bản chất, liên hệ thực tế dài, cảnh lien_he_thuc_te / bay, câu "đăng ký kênh..." dài. Phép tính chốt đáp án KHÔNG đặt ở cảnh ket_luan. ' +
    'CHUẨN TOÁN (v95, máy kiểm): (1) chỉ gọi "parabol" / "đỉnh parabol" khi hàm THẬT SỰ bậc hai ax^2+bx+c; hàm bậc ba (V = x(16-2x)(10-2x)), phân thức, chứa căn thì nói "điểm cực đại / cực tiểu của đồ thị". ' +
    '(2) Tìm cực trị bằng đạo hàm: sau "' + "V'(x) = 0" + ' -> x = ..." PHẢI nêu căn cứ xác nhận: "đạo hàm đổi dấu từ dương sang âm qua x = ..." (hoặc bảng biến thiên / so sánh giá trị tại đầu mút và nghiệm / bất đẳng thức Cauchy / đỉnh hàm bậc hai), không nhảy thẳng từ đạo hàm bằng 0 sang kết luận lớn nhất. ' +
    '(3) Tiêu đề intro đúng bản chất (bài hộp cắt 4 góc như nhau: hỏi "CẮT CẠNH BAO NHIÊU ĐỂ HỘP LỚN NHẤT?", không hỏi "cắt góc nào"). ' +
    'Lời thoại viết biểu thức gọn để máy đọc chuẩn: "V(x) = x(16 - 2x)(10 - 2x)", "V\'(x) = 0", "x = 2", "144 cm³" (máy tự đọc "vê ích bằng ích nhân 16 trừ 2 ích...", "xăng-ti-mét khối"); không viết LaTeX trong loi_thoai.\n';
}
function quyTrinh6Phan_(tt, r) {
  if (r && dungKhung4Tang_(r)) return quyTrinhGon4Tang_(tt, r);   // v98.3: luồng khung 4 tầng: video gọn 45-55 giây
  return 'QUY TRÌNH CỐ ĐỊNH 6 PHẦN (BẮT BUỘC cho mọi video, đúng thứ tự, không được bỏ phần nào). VIDEO NHIỀU CẢNH, CHI TIẾT: 15-20 cảnh, mỗi cảnh 5-10 giây (lời thoại 12-30 từ, MỘT ý), tổng ' + giayMucTieu_() + ' giây. ' +
    'Nhiều cảnh nghĩa là chia nhỏ từng ý cho người học dễ theo, KHÔNG phải nói dài dòng hay lặp lại.\n' +
    'PHẦN 1 - ĐỀ BÀI (2-3 cảnh, luôn đi đầu, KHÔNG nhảy thẳng vào mô phỏng):\n' +
    '  mo_dau: câu móc ≤ 5 giây, chính là CÂU HỎI của đề nói cho hấp dẫn.\n' +
    '  de_bai (1-2 cảnh): ĐỌC RÕ TOÀN BỘ ĐỀ, nêu ĐỦ mọi dữ kiện và con số rồi nói rõ đề hỏi gì. Hình: ' + (tt ? 'cảnh thật của đề (canh_that) với số liệu gắn lên vật, mỗi dữ kiện hiện ra đúng lúc được đọc (buoc)' : 'tình huống đời thực bằng vật thật') +
    '. Máy tự hiện THẺ ĐỀ BÀI (ĐỀ CHO / CẦN TÌM) từ "de_cho" và "can_tim" nên KHÔNG làm danh_sach "Đề cho / Cần tìm" trên sân khấu.\n' +
    'PHẦN 2 - MÔ PHỎNG (2-3 cảnh): ' + (tt ? 'mo_hinh_hoa: dựng hình minh họa từng lớp (vật thật -> đường đo -> hình học), đặt ẩn ngay trên vật, nêu điều kiện của ẩn; có thể thêm y_do: đề thật sự hỏi đại lượng nào, cái gì cố định, cái gì thay đổi'
      : 'y_do / thu_nho: dựng lại tình huống bằng vật thật chuyển động (bốc, tung, chia, xếp...), cho thấy không gian mẫu, thử trường hợp nhỏ để thấy quy luật') + '.\n' +
    'PHẦN 3 - LỖI SAI THƯỜNG GẶP (1-2 cảnh): bay: diễn lại cách làm sai mà học sinh hay mắc (rung + loai_bo), chỉ ra sai ở đâu và VÌ SAO sai; cảnh sau có thể nói cách tránh.\n' +
    'PHẦN 4 - GIẢI (6-8 cảnh), dẫn dắt như người thầy giỏi:\n' +
    '  y_do (HƯỚNG SUY NGHĨ): vì sao nghĩ tới cách này, từ dấu hiệu nào trong đề (đề hỏi "lớn nhất" -> nghĩ tới hàm số / đạo hàm; "góc nâng" -> nghĩ tới tam giác vuông...), đi từ cái đã biết tới cái cần tìm.\n' +
    '  nhac_lai (GIẢI THÍCH CÔNG THỨC, 2-3 cảnh liền nhau, BẮT BUỘC khi bài dùng công thức): (a) công thức TỪ ĐÂU RA (vẽ/diễn giải ngắn bằng hình, không chép suông); (b) Ý NGHĨA TỪNG ĐẠI LƯỢNG trong công thức (mỗi ký hiệu là gì, đơn vị gì, chỉ lên hình); (c) ÁP DỤNG vào bài này thế nào (ký hiệu nào ứng với số nào của đề).\n' +
    '  diem_chot: ý then chốt và vì sao đúng. tinh_toan: MỖI BƯỚC TÍNH MỘT CẢNH (nói đang tính gì, vì sao), hình minh họa phần đang tính sáng lên.\n' +
    '  dap_an: ' + (tt ? 'quay lại cảnh thật với đáp số gắn đúng chỗ + so_dem kieu "vien"' : 'đáp án lớn, rõ (dong_ho_do hoặc so_dem)') + ', nói đáp số kèm ý nghĩa thực tế ("tức là cột cờ cao gần bằng tòa nhà 5 tầng").\n' +
    'PHẦN 5 - THỬ LẠI (1-2 cảnh): kiem_tra phải THỬ LẠI THẬT, không chỉ hiện chữ "thử lại": THẾ NGƯỢC đáp án vào đề (hoặc cách giải thứ hai / mô phỏng nhiều lần / thử một giá trị khác để so sánh). ' +
    '"noi_dung_man_hinh" BẮT BUỘC có phép thử bằng SỐ CỤ THỂ (vd "60 + 2 \\cdot 30 = 120 \\;\\checkmark", "S(40) = 1600 < 1800"), lời thoại đọc đúng phép thử đó, ' +
    'hình minh họa THỂ HIỆN phép thử (bản vẽ có số đo, luoi_o / bieu_do_cot đếm kết quả mô phỏng, chon các trường hợp...) - không dùng một nhãn chữ "THỬ LẠI". ' +
    'Chỉ khi bài THẬT SỰ KHÔNG THỂ thử lại (không có cách kiểm độc lập nào) mới bỏ phần này và ghi lý do vào "khong_thu_lai" (≥ 10 chữ).\n' +
    'PHẦN 6 - CHỐT KIẾN THỨC (2-3 cảnh): lien_he_thuc_te: cách nghĩ / công thức này dùng ở đâu ngoài đời (2-3 ví dụ cụ thể, có hình vật thật); cảnh bay: noi_dung_man_hinh có 2 dòng phản chứng ngắn (điều kiện thỏa ✅ / điều kiện sai ❌, ví dụ "Tích = 32 \\\\vdots 4 ✅", "Tổng = 13 lẻ ❌"); bai_hoc: 2-3 điều rút ra (danh_sach), dấu hiệu nhận ra dạng bài, SAU NÀY VẬN DỤNG công thức ra sao, một câu hỏi biến thể cho người xem tự luyện.\n' +
    'CÔNG THỨC TRÊN MÀN HÌNH: mỗi cảnh tối đa 2-3 dòng "noi_dung_man_hinh", mỗi dòng NGẮN (≤ 24 ký tự hiện ra, một phép biến đổi); công thức dài thì tách sang cảnh sau hoặc thành nhiều dòng tại dấu "=" (dòng sau bắt đầu bằng "= ..."), KHÔNG nhồi một dòng dài.\n' +
    'CHẤT LƯỢNG BÀI GIẢNG (nghe và nhìn): lời thoại như đang nói chuyện với một bạn học sinh: câu ngắn, có câu hỏi gợi mở ("vậy cái gì đang thay đổi?"), có câu nối giữa các cảnh ("có được x rồi, giờ ta tìm..."), nhấn vào từ khóa; "giong_doc" thay đổi theo cảnh (tò mò, chậm rãi khi giải thích, nhấn mạnh khi cảnh báo, hào hứng khi ra đáp án). ' +
    'Hình: mỗi cảnh một điểm nhìn chính, không nhồi vật; dùng lại cùng hình qua nhiều cảnh (giu_san_khau) và cho thêm dần lớp mới để người xem thấy bài "lớn lên" từng bước. ' +
    'Nhân vật người (nguoi) có "dong_tac": dung | di | vay_tay | chi | suy_nghi | vui | nhin_len | gio_tay | chao - chọn động tác khớp lời (đang suy nghĩ -> suy_nghi, ra đáp án -> vui, chỉ vào hình -> chi); người đang di_chuyen tự bước đi.\n' +
    'CHẤT LƯỢNG TỪNG CẢNH (vì nhiều cảnh nên mỗi cảnh phải chăm chút): ' +
    '(a) "mo_ta" viết 2-4 câu theo khung "Bố cục: vật gì ở đâu. Bước 1 (khi nói ...): vật nào làm gì. Bước 2 (khi nói ...): ...", tả rõ HƯỚNG và CÁCH vật di chuyển (bay vào từ trái, trượt theo đường cong tới..., tách ra, ghép lại, nảy nhẹ khi dừng); ' +
    '(b) mỗi cảnh có hình phải có 2-4 hành động ở các bước khác nhau, mỗi bước khớp đúng một cụm lời thoại; vật vào cảnh bằng "tu_huong" (trai | phai | tren | duoi) khác nhau cho sinh động; di_chuyen để vật đi tới chỗ mới (máy tự cho đi theo đường cong có quán tính); ' +
    '(c) cảnh liền nhau nối mạch: dùng "giu_san_khau": true để diễn tiếp trên hình cũ (vật cũ giữ nguyên, chỉ thêm vật/hành động mới) cho 2-3 cảnh cùng tình huống, tránh hình nhảy lung tung; ' +
    '(d) "chuyen_canh" (tùy chọn): mo | truot_len | nghieng | luot_ngang | truot_xuong | day_ngang | quet_sang | tron_mo | zoom_xuyen | lat_3d | lat_ngang | phong - sang phần mới dùng kiểu mạnh (quet_sang, tron_mo, day_ngang, lat_3d), trong cùng phần dùng kiểu nhẹ (mo, nghieng, truot_len); để trống thì máy tự xoay vòng đa dạng.\n' +
    'Trả thêm "de_cho": mảng 2-5 dữ kiện của đề, mỗi cái ≤ 60 ký tự, đủ MỌI con số của đề (ví dụ "Tầng trên cùng: 3 ống", "Mỗi tầng dưới hơn 1 ống", "Tổng 260 ống"); ' +
    '"can_tim": điều đề hỏi, ≤ 80 ký tự (ví dụ "Xếp được bao nhiêu tầng? Dư bao nhiêu ống?"). Viết chữ thường, công thức ngắn thì dùng LaTeX.\n';
}


// ===================== BẢN VẼ CẢNH THỰC TẾ (bước riêng, trước khi viết kịch bản) =====================
// Gemini chỉ làm MỘT việc: đọc đề (và ảnh đề) rồi lập bản vẽ canh_that: vật thật nào, cao bao nhiêu mét, đứng ở đâu, đo gì.
// Máy kiểm tra bản vẽ (đúng tên thư viện, điểm neo có thật, đủ vật của đề), sai thì cho sửa 1 lần. Kịch bản phải dùng ĐÚNG bản vẽ này.
function canBanVe_(r) {
  var de = String((r && r.de_bai) || '').toLowerCase() + ' ' + String((r && r.mo_ta_hinh) || '').toLowerCase();
  if (typeof TU_VAT_THUC_ === 'undefined') return false;
  return TU_VAT_THUC_.some(function (m) { return m[0].test(de); });
}
function lapBanVe_(r, anhDe) {
  if (!canBanVe_(r)) return null;
  var yeuCau = TU_VAT_THUC_.filter(function (m) { return m[0].test((String(r.de_bai) + ' ' + String(r.mo_ta_hinh || '')).toLowerCase()); })
    .map(function (m) { return m[2] + ' -> ' + m[1].filter(function (t) { return t[0] !== '@'; }).join(' / '); });
  var prompt = 'Bạn là HỌA SĨ BẢN VẼ KỸ THUẬT cho video dạy toán. Đọc kỹ đề rồi lập BẢN VẼ cảnh thực tế của đề, đúng 100% vật, vị trí và số đo của đề.\n' +
    'ĐỀ: ' + r.de_bai + (r.mo_ta_hinh ? '\nMÔ TẢ HÌNH CỦA ĐỀ: ' + r.mo_ta_hinh : '') + (anhDe ? '\n(Ảnh đề gửi kèm: nhìn ảnh để đặt vật đúng như hình.)' : '') + '\n' +
    ((r.dap_an_hien || r.dap_an) ? 'ĐÁP ÁN ĐÃ GIẢI (để vẽ ĐÚNG TỈ LỆ, không ghi đáp án lên hình): ' + String(r.dap_an_hien || r.dap_an).slice(0, 300) + '\n' : '') +
    'VẬT THẬT MÁY NHẬN RA TRONG ĐỀ (bắt buộc có trong bản vẽ): ' + yeuCau.join('; ') + '\n' +
    'Định dạng bản vẽ (máy TỰ tính tọa độ, bạn chỉ ghi số đo thật bằng mét):\n' +
    'NHÌN NGANG: {"loai":"canh_that","nhin":"ngang","vat":[{"ma":"A","ten":"nguoi","cao":1.6,"x":0},{"ma":"B","ten":"cot_co","cao":15.6,"x":20}],"diem":[{"ma":"H","x":20,"cao":1.6}],"do":[{"kieu":"khoang_cach","tu":"A","den":"B","nhan":"20 m"},{"kieu":"chieu_cao","vat":"B","nhan":"h = ?"},{"kieu":"tia","tu":"A.mat","den":"B.dinh","goc":"35°"},{"kieu":"tam_giac","dinh":["A.mat","H","B.dinh"]},{"kieu":"vuong","tai":"H"}]}\n' +
    'vat: ma, ten, cao (m), x (m), tren:"B" (đứng trên vật B), rong (m), lat, bien (biển tên cho cong_trinh/cua_hang), emoji (bieu_tuong); thang dựa tường {"ten":"thang","x":chân,"dinh_x":..,"dinh_cao":..}. Điểm neo: A, A.dinh, A.mat, A.giua, mã trong diem.\n' +
    'do: khoang_cach {tu,den,nhan} | chieu_cao {vat,nhan} | tia {tu,den,goc} | doan {tu,den,nhan} | bong {vat,dai,nhan} | tam_giac {dinh} | vuong {tai} | chu {tai,nhan}.\n' +
    'NHÌN TỪ TRÊN (vườn, ruộng, hàng rào quanh đất, sân, hồ bơi): {"loai":"canh_that","nhin":"tren","vung":[{"ma":"V","ten":"vuon","x":0,"y":0,"rong":20,"dai":12,"hang_rao":true,"tuong":"trai","canh":["20 m","12 m"]}],"vat":[],"do":[{"kieu":"doan","tu":"V.tl","den":"V.br","nhan":"d = ?"}]} (hang_rao true hoặc mảng cạnh ["tren","phai","duoi"]; tuong = cạnh sát bức tường có sẵn, không rào)\n' +
    'BÀI CÓ CÁC ĐIỂM TRÊN MẶT ĐẤT (đường ống / dây điện qua sông, đi từ A qua P đến B, quãng đường ngắn nhất, hai bờ sông...): BẮT BUỘC NHÌN TỪ TRÊN, ' +
    'vẽ dải sông bằng vung "song", MỌI điểm đề nhắc tới (A, A\', B, P...) phải có trong "diem" với tọa độ mét đúng số đo, mỗi số đo MỘT nhãn riêng (không gộp "500m/1200m"). Ví dụ: ' +
    '{"loai":"canh_that","nhin":"tren","vung":[{"ma":"S","ten":"song","x":0,"y":0,"rong":1400,"dai":500,"nhan":"Sông"}],' +
    '"diem":[{"ma":"A","x":0,"y":0},{"ma":"A\'","x":0,"y":500},{"ma":"B","x":1200,"y":500},{"ma":"P","x":700,"y":500}],' +
    '"vat":[{"ma":"NM","ten":"cong_trinh","bien":"Nhà máy","cao":150,"x":1200,"y":700}],' +
    '"do":[{"kieu":"doan","tu":"A","den":"A\'","nhan":"500 m"},{"kieu":"doan","tu":"A\'","den":"B","nhan":"1200 m"},{"kieu":"doan","tu":"A","den":"P","nhan":"ống dưới nước"},{"kieu":"doan","tu":"P","den":"B","nhan":"ống trên bờ"}]}\n' +
    'QUY TẮC NHÌN TỪ TRÊN: "rong" = cạnh NGANG (tren/duoi), "dai" = cạnh DỌC (trai/phai). Bài tìm kích thước tối ưu: vẽ theo kích thước của ĐÁP ÁN. ' +
    'Cạnh sát tường phải là cạnh mà đề/đáp án nói "song song tường" (vd đáp án cạnh song song tường 60 m -> tường nằm trên cạnh dài 60 m). ' +
    'TỔNG các cạnh có rào phải ĐÚNG bằng tổng chiều dài lưới/rào của đề. "canh": [nhãn cạnh ngang, nhãn cạnh dọc] - chỉ ghi số đo ĐỀ CHO hoặc dấu "?" (tuyệt đối chưa ghi ẩn số tự đặt x, y vào bản vẽ đề bài).\n' +
    'THƯ VIỆN TÊN VẬT: ' + TEN_VAT_THUC_.join(', ') + '. Vật không có trong thư viện: cong_trinh + bien (ghi đúng tên công trình) hoặc bieu_tuong + emoji. KHÔNG dùng khối hộp/khối trụ.\n' +
    'Chỉ đưa số ĐỀ CHO vào nhãn; đại lượng cần tìm ghi "?" (vd "h = ?"). Mọi vị trí phải nhất quán với số đo (khoảng cách 20 m thì hai vật cách nhau đúng 20 trên trục x).\n' +
    'Trả JSON: {"vat_trong_de":["liệt kê mọi vật/địa điểm thật trong đề"],"ban_ve":{...canh_that...},"tu_kiem_tra":"đối chiếu từng số của đề với bản vẽ"}';
  var opts = { suyNghi: 'low' };
  if (anhDe) opts.anh = anhDe;
  for (var lan = 0; lan < 2; lan++) {
    var j = null;
    try { j = goiGemini_(prompt, 0.2, opts); } catch (e) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e.message))) throw e; return banVeMacDinh_(r); }
    var bv = j && j.ban_ve;
    if (!bv || typeof bv !== 'object') continue;
    bv.loai = 'canh_that'; bv.id = 'canh'; bv.x = 50; bv.y = 50; bv.buoc = 1;
    if (typeof tuSuaSoDoVung_ === 'function' && tuSuaSoDoVung_(bv, r.de_bai)) nhatKy_('BAN_VE', r.id + ': tự đổi cạnh dài/ngắn cho tổng rào khớp đề');
    var loi = kiemTraCanhThat_(bv, 'BAN_VE');
    if (!loi) {
      var thieu = kiemTraVatThucDe_({ canh: [{ minh_hoa: { du_lieu: { vat: [bv] } } }] }, r.de_bai).concat(kiemTraSoDoVung_(bv, r.de_bai), kiemTraDiemDe_(bv, r.de_bai));
      if (!thieu.length) return bv;
      loi = thieu.join(' ');
    }
    if (lan === 1) break;
    prompt += '\nBẢN VẼ LẦN TRƯỚC BỊ LỖI, SỬA LẠI: ' + loi + '\nBản vẽ lần trước: ' + JSON.stringify(bv).slice(0, 3000);
  }
  return banVeMacDinh_(r);
}
// Dự phòng khi Gemini không lập được bản vẽ: dựng bản vẽ cơ bản từ các vật máy nhận ra trong đề (chiều cao mặc định hợp lý,
// đặt cách đều trên mặt đất). Không có số đo, nhưng ĐÚNG VẬT của đề - không bao giờ để khối hộp thay cột cờ.
var CAO_MAC_DINH_ = { cot_co: 12, nguoi: 1.6, toa_nha: 30, ngan_hang: 12, nha: 7, truong_hoc: 10, cay: 6, cay_thong: 8, hai_dang: 25, thap_nuoc: 15, cot_dien: 9, den_duong: 6,
  nui: 200, xe_hoi: 1.5, thuyen: 4, cau: 8, song: 2, thang: 4, tien: 0.6, heo_dat: 0.5, dieu: 6, tuong: 3, ho_nuoc: 1, hang_rao: 1.5, cong_trinh: 12, cua_hang: 5,
  xe_may: 1.1, xe_dap: 1, xe_buyt: 3, con_duong: 0.5, qua_bong: 0.3, ro_bong_ro: 3, gieng: 1.2, cong: 2.5, bieu_tuong: 2, ban: 0.75, ghe: 0.9, ti_vi: 0.8, kim_tu_thap: 140, thap: 60 };
function banVeMacDinh_(r) {
  var de = (String(r.de_bai || '') + ' ' + String(r.mo_ta_hinh || '')).toLowerCase();
  var ten = [];
  TU_VAT_THUC_.forEach(function (m) { if (m[0].test(de)) { var t = m[1].filter(function (x) { return x[0] !== '@'; })[0]; if (t && ten.indexOf(t) < 0) ten.push(t); } });
  if (/vườn|ruộng|mảnh đất|sân bóng|hồ bơi|bể bơi/.test(de)) {
    return { id: 'canh', loai: 'canh_that', x: 50, y: 50, buoc: 1, nhin: 'tren', vung: [{ ma: 'V', ten: /ruộng/.test(de) ? 'ruong' : /sân bóng/.test(de) ? 'san_bong' : /hồ bơi|bể bơi/.test(de) ? 'ho_boi' : 'vuon', x: 0, y: 0, rong: 20, dai: 12, hang_rao: ten.indexOf('hang_rao') >= 0 }], vat: [], do: [] };
  }
  if (!ten.length) return null;
  var x = 0, vat = [];
  ten.sort(function (a, b) { return (a === 'nguoi' ? -1 : 0) - (b === 'nguoi' ? -1 : 0); });
  ten.slice(0, 5).forEach(function (t, i) {
    var cao = CAO_MAC_DINH_[t] || 3;
    vat.push({ ma: String.fromCharCode(65 + i), ten: t, cao: cao, x: x, bien: t === 'cong_trinh' ? ((/bưu điện|bệnh viện|nhà máy|ủy ban|khách sạn/.exec(de) || [''])[0]) : undefined });
    x += Math.max(4, cao * 0.9);
  });
  return { id: 'canh', loai: 'canh_that', x: 50, y: 50, buoc: 1, nhin: 'ngang', vat: vat, do: [] };
}
function banVeChoPrompt_(r) {
  if (!r || !r._banVe) return '';
  return 'BẢN VẼ CẢNH THỰC TẾ GỐC ĐÃ DUYỆT (dùng làm chuẩn về tên vật ma/ten/cao/x, NHƯNG TUYỆT ĐỐI KHÔNG chép y nguyên một hình tĩnh này cho mọi cảnh! ' +
    'Mỗi cảnh phải biến đổi linh hoạt theo đúng nội dung cảnh đó đang nói: cảnh mo_dau chỉ hiện vật + dấu hỏi + zoom cận cảnh; cảnh de_bai cho từng số đo hiện dần theo buoc 1-2-3-4; ' +
    'cảnh mo_hinh_hoa thêm tam_giac + vuong + ẩn số; cảnh bay làm rung/gạch đỏ chỗ sai; mỗi cảnh tinh_toan chỉ làm nổi + zoom vào đúng cạnh/đại lượng đang tính hoặc dùng do_thi/bieu_do_cot/so_dem; ' +
    'cảnh dap_an đổi nhãn "?" thành đáp số ' + (r.dap_an_hien || r.dap_an || '') + '): ' + JSON.stringify(r._banVe) + '\n';
}
// Máy tự điều chỉnh bản vẽ theo từng loại cảnh để mỗi cảnh có hình minh họa riêng biệt, nhiều bước (buoc 1..4) và góc zoom khớp nội dung cảnh đó.
function tuyChinhBanVeTheoCanh_(banVe, c, r) {
  var bv = JSON.parse(JSON.stringify(banVe));
  var loai = String((c && c.loai) || '');
  var loi = String((c && c.loi_thoai) || '').toLowerCase();
  var dsDo = Array.isArray(bv.do) ? bv.do : [];
  var hd = [];
  var vatPhu = [];
  var idBv = bv.id || 'canh';

  // Phân chia các vật và đường đo thành nhiều bước khung hình con (buoc 1 -> 4) trong cùng một cảnh
  if (Array.isArray(bv.vat)) {
    bv.vat.forEach(function (v, idx) {
      v.buoc = idx === 0 ? 1 : Math.min(2, idx + 1);
      if (v.ten === 'nguoi') {
        if (loai === 'mo_dau' || loai === 'y_do') v.dong_tac = 'suy_nghi';
        else if (loai === 'bay') v.dong_tac = 'chi';
        else if (loai === 'dap_an' || loai === 'ket_qua') v.dong_tac = 'vui';
        else if (/tinh|mo_hinh/.test(loai)) v.dong_tac = 'chi';
      }
    });
  }

  if (loai === 'mo_dau') {
    // Cảnh mở đầu: chỉ giữ đường đo có dấu '?' (ẩn số gây tò mò), zoom cận cảnh vào vật chính
    bv.do = dsDo.filter(function (d) { return /\?/.test(String(d && d.nhan || '')) || d.kieu === 'tia'; }).map(function (d) { d.buoc = 2; d.mau = 'vang'; return d; });
    hd.push({ buoc: 2, vat: idBv, kieu: 'phong_to', x: 55, y: 42, muc: 1.28 });
    hd.push({ buoc: 3, vat: idBv, kieu: 'sang' });
  } else if (loai === 'de_bai') {
    // Cảnh đề bài: chỉ hiện dữ kiện đề cho và câu hỏi theo từng bước 2, 3, 4 (chưa hiện tam giác phụ của lời giải)
    var doDe = dsDo.filter(function (d) { return d && !/tam_giac|vuong/.test(String(d.kieu)); });
    bv.do = doDe.map(function (d, idx) { d.buoc = Math.min(4, 2 + Math.floor(idx / 2)); return d; });
    hd.push({ buoc: 2, vat: idBv, kieu: 'sang' });
  } else if (loai === 'mo_hinh_hoa' || loai === 'y_do' || loai === 'diem_chot') {
    // Cảnh mô hình hóa / điểm chốt: làm nổi bật tam giác, góc vuông và tia nhìn ở bước 2-3, kèm zoom vào mô hình
    bv.do = dsDo.map(function (d) {
      var laMH = /tam_giac|vuong|tia/.test(String(d.kieu));
      d.buoc = laMH ? 3 : 2;
      if (laMH) d.mau = 'cam';
      return d;
    });
    hd.push({ buoc: 2, vat: idBv, kieu: 'sang' });
    hd.push({ buoc: 3, vat: idBv, kieu: 'phong_to', x: 52, y: 46, muc: 1.22 });
  } else if (loai === 'bay') {
    // Cảnh lỗi sai: rung cảnh báo và gắn nhãn cảnh báo sai lầm
    bv.do = dsDo.filter(function (d) { return !/tam_giac/.test(String(d.kieu)); }).map(function (d) { d.buoc = 2; d.mau = 'do'; return d; });
    vatPhu.push({ id: 'nhan_bay_' + (c.so || 1), loai: 'nhan', x: 50, y: 16, noi_dung: 'Cẩn thận bẫy!', tu_khoa: 'bẫy', mau: 'do', buoc: 2 });
    hd.push({ buoc: 2, vat: idBv, kieu: 'rung' });
  } else if (/tinh|giai/.test(loai)) {
    // Cảnh tính toán: tô sáng đường đo được nhắc trong lời thoại/công thức và thêm bộ đếm hoặc zoom vào phần đang tính
    var chuCanh = (loi + ' ' + ((c && c.noi_dung_man_hinh) || []).join(' ')).toLowerCase();
    bv.do = dsDo.map(function (d, idx) {
      var nh = String(d.nhan || '').toLowerCase();
      var duocNhac = (nh && chuCanh.indexOf(nh.replace(/\s+/g, '')) >= 0) || (/tan|sin|cos|góc|°/.test(chuCanh) && d.kieu === 'tia') || (/cao|h\s*=/.test(chuCanh) && d.kieu === 'chieu_cao');
      d.buoc = duocNhac ? 2 : 1;
      if (duocNhac) d.mau = 'vang';
      return d;
    });
    var lechZoom = ((Number(c.so) || 1) % 2 === 0) ? { x: 58, y: 42, muc: 1.25 } : { x: 45, y: 48, muc: 1.2 };
    hd.push({ buoc: 2, vat: idBv, kieu: 'phong_to', x: lechZoom.x, y: lechZoom.y, muc: lechZoom.muc });
    hd.push({ buoc: 3, vat: idBv, kieu: 'sang' });
  } else if (/dap_an|ket_qua/.test(loai)) {
    // Cảnh đáp án: thay '?' bằng đáp số thật và thêm huy hiệu số đếm kết quả
    var dapHien = String((r && (r.dap_an_hien || r.dap_an)) || '');
    bv.do = dsDo.map(function (d) {
      if (/\?/.test(String(d.nhan || '')) && dapHien) { d.nhan = dapHien; d.mau = 'xanh_la'; d.buoc = 2; }
      else d.buoc = 1;
      return d;
    });
    hd.push({ buoc: 2, vat: idBv, kieu: 'sang' });
  } else {
    bv.do = dsDo.map(function (d, idx) { d.buoc = Math.min(3, 1 + (idx % 3)); return d; });
    hd.push({ buoc: 2, vat: idBv, kieu: 'sang' });
  }
  return { vat: [bv].concat(vatPhu), hanh_dong: hd };
}

function chenBanVe_(kb, banVe) {
  if (!banVe || !kb || !Array.isArray(kb.canh)) return [];
  var coCT = function (c) { var du = c && c.minh_hoa && c.minh_hoa.du_lieu; return !!(du && Array.isArray(du.vat) && du.vat.some(function (v) { return v && v.loai === 'canh_that'; })); };
  var CHI_CHU_ = ['nguoi', 'chu', 'nhan', 'the', 'mui_ten', 'bieu_tuong'];
  var chiNguoiChu = function (c) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    var vs = du && Array.isArray(du.vat) ? du.vat : [];
    return !c.giu_san_khau && vs.length > 0 && vs.every(function (v) { return v && CHI_CHU_.indexOf(v.loai) >= 0; });
  };
  var coRoi = kb.canh.slice(0, 4).some(coCT);
  var sua = [];
  var dauVanTruoc = '';
  kb.canh.forEach(function (c) {
    if (!c) return;
    var loai = String(c.loai || '');
    if (coCT(c)) {
      if (c.giu_san_khau) { c.giu_san_khau = false; sua.push('cảnh ' + c.so + ': bản vẽ thực tế không giữ vật cảnh trước'); }
      var duHienTai = c.minh_hoa && c.minh_hoa.du_lieu;
      var ctHienTai = duHienTai && Array.isArray(duHienTai.vat) ? duHienTai.vat.filter(function (v) { return v && v.loai === 'canh_that'; })[0] : null;
      var dv = JSON.stringify(ctHienTai ? { do: ctHienTai.do, vat: ctHienTai.vat, vung: ctHienTai.vung, diem: ctHienTai.diem, nhin: ctHienTai.nhin } : {});
      if (ctHienTai && (dv === dauVanTruoc || (Array.isArray(ctHienTai.do) && ctHienTai.do.length >= 2 && ctHienTai.do.every(function (d) { return !d || (d.buoc || 2) === (ctHienTai.do[0].buoc || 2); })))) {
        var tc = tuyChinhBanVeTheoCanh_(ctHienTai, c, kb);
        var vatKhac = Array.isArray(duHienTai.vat) ? duHienTai.vat.filter(function (v) { return v && v.loai !== 'canh_that'; }) : [];
        c.minh_hoa.du_lieu = Object.assign({}, duHienTai, tc, { vat: (tc.vat || []).concat(vatKhac) });
        sua.push('cảnh ' + c.so + ': biến đổi khung hình canh_that khớp từng câu thoại');
      }
      dauVanTruoc = dv;
      return;
    }
    dauVanTruoc = '';
    var duCanh = c.minh_hoa && c.minh_hoa.du_lieu;
    var coHinhRieng = duCanh && Array.isArray(duCanh.vat) && duCanh.vat.some(function (v) {
      return v && v.loai === 'hinh_tu_do' && !kiemTraHinhTuDo_(v, 'bản vẽ theo đề');
    });
    if (coHinhRieng) return;
    if (loai === 'mo_dau' && chiNguoiChu(c)) {
      var tc0 = tuyChinhBanVeTheoCanh_(banVe, c, kb);
      c.minh_hoa = { loai: 'san_khau', mo_ta: 'Cận cảnh tình huống thực tế của đề gây tò mò theo câu móc', du_lieu: tc0 };
      c.giu_san_khau = false;
      sua.push('cảnh ' + c.so + ' (mở đầu) dùng cận cảnh thực tế');
      return;
    }
    if (!coRoi && /^(de_bai|mo_hinh_hoa)$/.test(loai)) {
      var tc1 = tuyChinhBanVeTheoCanh_(banVe, c, kb);
      c.minh_hoa = { loai: 'san_khau', mo_ta: (c.minh_hoa && c.minh_hoa.mo_ta) || 'Dựng từng lớp cảnh thực tế và số đo theo lời đọc', du_lieu: tc1 };
      c.giu_san_khau = false;
      sua.push('cảnh ' + c.so + ' dùng bản vẽ thực tế theo từng bước');
      return;
    }
    if (/^(y_do|tinh_toan|kiem_tra|bay|dap_an|ket_qua)$/.test(loai) && chiNguoiChu(c)) {
      var tc2 = tuyChinhBanVeTheoCanh_(banVe, c, kb);
      c.minh_hoa = { loai: 'san_khau', mo_ta: (c.minh_hoa && c.minh_hoa.mo_ta) || ('Minh họa trực quan cho bước ' + loai + ' khớp lời thoại'), du_lieu: tc2 };
      c.giu_san_khau = false;
      sua.push('cảnh ' + c.so + ' (' + loai + ') tùy biến hình minh họa theo nội dung cảnh');
    }
  });
  return sua;
}

// ===================== BỔ SUNG CẢNH GIẢI THÍCH CÔNG THỨC (bước riêng, sau khi kịch bản đạt) =====================
// Kịch bản dùng công thức mà chỉ có 0-1 cảnh giải thích -> nhờ Gemini viết RIÊNG 3 cảnh: (1) công thức TỪ ĐÂU RA,
// (2) Ý NGHĨA từng đại lượng ứng với bài này, (3) KHI NÀO DÙNG / sau này vận dụng thế nào.
// Gemini chỉ viết lời + dòng công thức + chọn MẪU HÌNH; máy tự dựng minh_hoa từ mẫu nên luôn hợp lệ.
function demCanhGiaiThich_(kb) {
  return (kb.canh || []).filter(function (c) { return typeof laCanhGiaiThichCongThuc_ === 'function' ? laCanhGiaiThichCongThuc_(c) : /nhac_lai/.test(String(c && c.loai)); }).length;
}
function canBoSungGiaiThich_(kb) {
  if (!kb || !Array.isArray(kb.canh)) return false;
  var dung = kb.canh.some(function (c) { return /tinh|giai/.test(String(c && c.loai)) && (c.noi_dung_man_hinh || []).some(function (d) { return /=/.test(String(d)); }); });
  return dung && demCanhGiaiThich_(kb) < 1;
}
function hinhTuMau_(m, kb, id) {
  m = m || {};
  var kieu = String(m.kieu || 'the');
  if (kieu === 'hinh_tu_do') {
    var ve = { id: id, loai: kieu, x: 50, y: 50, buoc: 1, khung: m.khung || [100, 100], hinh: m.hinh };
    if (!kiemTraHinhTuDo_(ve, id)) return { vat: [ve], hanh_dong: [] };
  }
  if (kieu === 'ban_ve' && kb.ban_ve) {
    var bv = JSON.parse(JSON.stringify(kb.ban_ve));
    bv.id = id; bv.x = 50; bv.y = 50; bv.buoc = 1;
    if (Array.isArray(m.nhan_canh) && bv.vung && bv.vung[0]) bv.vung[0].canh = m.nhan_canh.slice(0, 2).map(String);
    bv.do = (Array.isArray(m.ghi_chu) ? m.ghi_chu : []).slice(0, 1).map(function (t) { return { kieu: 'chu', tai: ((bv.vung && bv.vung[0] && bv.vung[0].ma) || 'V') + '.giua', nhan: String(t).slice(0, 40), buoc: 2 }; });
    if (bv.nhin !== 'tren') bv.do = (kb.ban_ve.do || []).map(function (d) { var x = JSON.parse(JSON.stringify(d)); x.buoc = 2; return x; });
    return { vat: [bv], hanh_dong: [] };
  }
  if (kieu === 'do_thi' && m.ham && Number(m.x_den) > Number(m.x_tu)) {
    var dt = { id: id, loai: 'do_thi', x: 50, y: 50, ham: String(m.ham), x_tu: Number(m.x_tu), x_den: Number(m.x_den), nhan_truc: ['x', String(m.truc_y || 'y')], noi_dung: String(m.tieu_de || '').slice(0, 40), buoc: 1 };
    if (m.y_tu !== undefined && m.y_den !== undefined && Number(m.y_den) > Number(m.y_tu)) { dt.y_tu = Number(m.y_tu); dt.y_den = Number(m.y_den); }
    var hd = [];
    if (m.diem_x !== undefined && isFinite(Number(m.diem_x))) { dt.gia_tri = Number(m.x_tu); hd.push({ buoc: 2, vat: id, kieu: 'dat_gia_tri', gia_tri: Number(m.diem_x) }); }
    return { vat: [dt], hanh_dong: hd };
  }
  var ds = (Array.isArray(m.dong) ? m.dong : []).map(function (x) { return String(x).replace(/\s+/g, ' ').trim().slice(0, 46); }).filter(Boolean).slice(0, 4);
  if (!ds.length) ds = ['Công thức dùng trong bài'];
  return { vat: [{ id: id, loai: 'danh_sach', x: 50, y: 50, noi_dung: String(m.tieu_de || 'Ghi nhớ').slice(0, 34), ds: ds, buoc: 1 }],
    hanh_dong: ds.map(function (_, i) { return { buoc: i + 1, vat: id, kieu: 'chon', chi_so: [i + 1] }; }).slice(0, 3) };
}
function boSungGiaiThichCongThuc_(kb, r, sn) {
  if (!canBoSungGiaiThich_(kb)) return null;
  var cu = kb.canh.filter(function (c) { return typeof laCanhGiaiThichCongThuc_ === 'function' && laCanhGiaiThichCongThuc_(c); });
  var tinh = kb.canh.filter(function (c) { return /tinh|diem_chot|y_do/.test(String(c.loai)); }).map(function (c) { return '- ' + c.loi_thoai + ' | ' + (c.noi_dung_man_hinh || []).join(' ; '); }).join('\n');
  var prompt = 'Bạn là GIÁO VIÊN TOÁN giỏi giảng giải. Video dạy bài toán dưới đây đang thiếu phần GIẢI THÍCH CÔNG THỨC. Viết ĐÚNG 3 cảnh giải thích công thức chính được dùng.\n' +
    'ĐỀ: ' + r.de_bai + '\nĐÁP ÁN: ' + String(r.dap_an_hien || r.dap_an || '') + '\nCÁC BƯỚC GIẢI TRONG VIDEO:\n' + tinh.slice(0, 2500) + '\n' +
    (cu.length ? 'CẢNH GIẢI THÍCH ĐANG CÓ (sẽ được thay bằng 3 cảnh mới, có thể giữ ý hay): ' + cu.map(function (c) { return c.loi_thoai + ' | ' + (c.noi_dung_man_hinh || []).join(' ; '); }).join(' || ') + '\n' : '') +
    '3 CẢNH BẮT BUỘC theo thứ tự:\n' +
    '1) "tu_dau" - CÔNG THỨC TỪ ĐÂU RA: giải thích trực quan vì sao công thức đúng (ví dụ thử số, hình vuông/hình chữ nhật, hằng đẳng thức), không chép định nghĩa khô khan.\n' +
    '2) "dai_luong" - Ý NGHĨA TỪNG ĐẠI LƯỢNG: mỗi chữ trong công thức ứng với cái gì TRONG BÀI NÀY (chỉ lên hình: cạnh nào, tổng nào), đơn vị gì.\n' +
    '3) "van_dung" - KHI NÀO DÙNG: dấu hiệu nhận ra bài dùng được công thức này, điều kiện (dấu "=" xảy ra khi nào), sau này gặp dạng nào thì dùng.\n' +
    'Mỗi cảnh: "tieu_de_canh" (≤ 6 từ), "loi_thoai" (lời giảng tự nhiên, 22-40 từ, xưng "mình"/"các bạn", không chào), "noi_dung_man_hinh": 1-2 dòng LaTeX, mỗi dòng ≤ 24 ký tự hiển thị (tách dài ở dấu =),\n' +
    '"hinh": tự dựng minh họa khi cần: {"kieu":"hinh_tu_do","khung":[100,100],"hinh":[...]} với 2–12 nét. Dùng duong/da_giac có diem:[[x,y],...], tron có tam và r, svg có d; dùng mau, to và buoc để lần lượt dựng vật, phần đang xét và đường đo. Có thể chọn dạng khác: {"kieu":"the","tieu_de":"...","dong":["2-4 dòng chữ ngắn ≤ 40 ký tự, viết thường, không LaTeX"]}' +
    (kb.ban_ve ? ' | {"kieu":"ban_ve","nhan_canh":["nhãn cạnh ngang","nhãn cạnh dọc"],"ghi_chu":["1 ghi chú ngắn"]} (vẽ lại cảnh thực tế của đề, gắn tên đại lượng lên đúng chỗ - nên dùng cho cảnh 2)' : '') +
    ' | {"kieu":"do_thi","ham":"biểu thức theo x kiểu máy tính","x_tu":0,"x_den":..,"diem_x":điểm cần chỉ,"truc_y":"S","tieu_de":"..."}.\n' +
    'Trả JSON: {"canh":[{"muc":"tu_dau","tieu_de_canh":"","loi_thoai":"","noi_dung_man_hinh":[],"hinh":{}},{"muc":"dai_luong",...},{"muc":"van_dung",...}]}';
  var j = null;
  try { j = goiGemini_(prompt + '\nNối tiếp giọng kể và quyết định của nhân vật: ' + JSON.stringify(kb.cau_chuyen || {}), 0.5, sn || tuyChonBienKich_()); } catch (e) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(e.message))) throw e; return null; }
  var ds = j && Array.isArray(j.canh) ? j.canh.filter(function (c) { return c && String(c.loi_thoai || '').trim().length > 20; }).slice(0, 3) : [];
  if (ds.length < 2) return null;
  var NHAN = { tu_dau: 'TỪ ĐÂU RA', dai_luong: 'Ý NGHĨA', van_dung: 'KHI NÀO DÙNG' };
  var moi = ds.map(function (c, i) {
    var muc = NHAN[c.muc] ? c.muc : ['tu_dau', 'dai_luong', 'van_dung'][i];
    var du = hinhTuMau_(c.hinh, kb, 'gt' + (i + 1));
    return { loai: 'nhac_lai', tieu_de_canh: String(c.tieu_de_canh || NHAN[muc]).slice(0, 40), nhan: NHAN[muc], tu_khoa: '', giu_san_khau: false, giong_doc: 'chậm rãi, rõ ràng',
      loi_thoai: String(c.loi_thoai).replace(/\s+/g, ' ').trim(), noi_dung_man_hinh: (Array.isArray(c.noi_dung_man_hinh) ? c.noi_dung_man_hinh : []).map(String).slice(0, 2), trinh_bay: 'xep', chu_thich: [],
      minh_hoa: { loai: 'san_khau', mo_ta: 'Giải thích công thức - ' + NHAN[muc].toLowerCase() + ': ' + String(c.tieu_de_canh || '').slice(0, 60) + '. Hình: ' + (du.vat[0].loai === 'canh_that' ? 'vẽ lại cảnh thực tế của đề, gắn tên đại lượng lên cạnh' : du.vat[0].loai === 'do_thi' ? 'đồ thị, chấm điểm cần chú ý' : du.vat[0].loai === 'hinh_tu_do' ? 'đường bao và các lớp hình dựng theo dữ kiện' : 'thẻ ghi nhớ, sáng lần lượt từng dòng'), du_lieu: du },
      thoi_luong_giay: 7 };
  });
  // chèn: thay cảnh giải thích cũ; nếu không có thì đặt ngay trước bước tính đầu tiên
  var viTri = -1;
  for (var i = 0; i < kb.canh.length; i++) { if (cu.indexOf(kb.canh[i]) >= 0) { viTri = viTri < 0 ? i : viTri; } }
  var con = kb.canh.filter(function (c) { return cu.indexOf(c) < 0; });
  if (viTri < 0) { viTri = con.findIndex(function (c) { return /tinh_toan/.test(String(c.loai)); }); if (viTri < 0) viTri = Math.max(1, con.length - 4); }
  else viTri = con.filter(function (c, k) { return kb.canh.indexOf(c) < viTri; }).length;
  var can = con.slice(0, viTri).concat(moi, con.slice(viTri));
  can.forEach(function (c, k) { c.so = k + 1; });
  return can;
}

// ===================== THIẾT KẾ VIDEO BÀI GIẢNG CHUYÊN ĐỀ DÀI 10 PHÚT CHO YOUTUBE (540-660 GIÂY, 42-50 CẢNH) =====================
// Cấu trúc sư phạm 5 chương thực chiến giúp học sinh thật sự hiểu sâu và áp dụng được trong phòng thi:
//  - Chương 1 (Cảnh 1-6, ~60s)  : Đặt vấn đề thực tế & Phân tích đề bài từng lớp (hình minh họa hiện dần theo từng câu đọc như Anh Shiper Toán)
//  - Chương 2 (Cảnh 7-15, ~110s): Phương pháp gốc, Sơ đồ nhận diện dạng bài & Mô hình hóa toán học (tách hình học / hệ trục / đặt ẩn)
//  - Chương 3 (Cảnh 16-29, ~170s): Giải chi tiết Bài toán Trọng tâm & Phân tích Cái bẫy phòng thi + Kiểm chứng đáp số
//  - Chương 4 (Cảnh 30-40, ~140s): Mở rộng & Giải nhanh Bài toán Biến thể Nâng cao 9+ / 10 điểm cùng dạng (đổi điều kiện thực tế)
//  - Chương 5 (Cảnh 41-46, ~80s): Bảng tổng kết công thức "Bỏ túi phòng thi" + Bài tập tự luyện có đáp số để học sinh bình luận
function lapKichBanDai10Phut_(r, c1, c2, sn, nhap) {
  var kbGoc = nhap || goiGemini_(taoPromptKichBan_(r, c1, c2), 0.55, sn);
  if (!kbGoc || !Array.isArray(kbGoc.canh) || !kbGoc.canh.length) throw new Error('KHONG_TAO_DUOC_KHUNG_10_PHUT');
  kbGoc.kieu_video = 'DAI_10_PHUT';

  // Mở rộng thêm 3 chương chuyên sâu (Sơ đồ nhận diện phương pháp + Bài toán biến thể 10 điểm + Tổng kết & Bài tập tự luyện)
  var promptMoRong = 'Bạn là GIÁO VIÊN LUYỆN THI TOÁN THPT hàng đầu trên YouTube. Chúng ta đang làm VIDEO BÀI GIẢNG DÀI 10 PHÚT (có giá trị học tập thực chiến cao) từ bài toán gốc sau:\n' +
    'Giữ vai kể, địa điểm và mục tiêu xuyên cả các chương: ' + JSON.stringify(kbGoc.cau_chuyen || {}) + '\n' +
    'ĐỀ GỐC (Lớp ' + r.lop + '): ' + r.de_bai + '\n' +
    'ĐÁP ÁN ĐÃ KIỂM CHỨNG: ' + (r.dap_an_hien || r.dap_an) + '\n' +
    'Ý TƯỞNG THEN CHỐT: ' + ((c2 && c2.y_tuong) || kbGoc.y_tuong_chinh || '') + '\n\n' +
    'Hãy viết thêm 24 CẢNH CHUYÊN SÂU chia làm 3 phần để ghép vào bài giảng 10 phút (mỗi cảnh 10-14 giây, lời thoại 30-45 từ, giải thích cặn kẽ, mỗi cảnh có một hình minh họa san_khau RIÊNG BIỆT, không lặp lại chữ trên màn hình):\n' +
    '1) PHẦN PHƯƠNG PHÁP GỐC & DẤU HIỆU NHẬN DIỆN (8 cảnh, loai="nhac_lai" hoặc "mo_hinh_hoa"):\n' +
    '   - 3 dấu hiệu trong đề thi để nhận ra ngay dạng bài này trong 10 giây.\n' +
    '   - Bản chất công thức nền tảng (từ đâu mà có, vẽ hinh_hoc / do_thi / danh_sach minh họa từng đại lượng).\n' +
    '   - Quy trình 3 bước chuẩn để đặt ẩn và lập hàm không bao giờ nhầm đơn vị.\n' +
    '2) PHẦN BÀI TOÁN BIẾN THỂ VẬN DỤNG CAO 10 ĐIỂM (11 cảnh, loai="y_do", "bay", "tinh_toan"):\n' +
    '   - Đưa ra 1 bài toán biến thể nâng cao từ bài gốc (thay đổi số liệu/thêm điều kiện thực tế khó hơn, có đáp số tính đúng tuyệt đối).\n' +
    '   - Phân tích điểm khác biệt, cái bẫy mới và giải từng bước bằng phương pháp vừa học (dùng hinh_hoc, do_thi, bieu_do_cot, so_dem).\n' +
    '3) PHẦN TỔNG KẾT PHÒNG THI & BÀI TẬP TỰ LUYỆN (5 cảnh, loai="lien_he_thuc_te", "bai_hoc"):\n' +
    '   - Bảng công thức đóng khung cần nhớ (danh_sach).\n' +
    '   - Mẹo bấm máy tính Casio / kiểm tra nhanh đạo hàm, cực trị trong phòng thi.\n' +
    '   - Giao 1 bài tập tự luyện cụ thể kèm gợi ý và đáp số để học sinh tự giải rồi bình luận.\n\n' +
    'YÊU CẦU ĐỊNH DẠNG: mỗi cảnh đúng chuẩn {"loai":"...","tieu_de_canh":"...","tu_khoa":"...","nhan":"CHƯƠNG 2|BIẾN THỂ 10Đ|TỔNG KẾT","giu_san_khau":false,"giong_doc":"...","loi_thoai":"(không LaTeX, viết chữ số và ký hiệu chuẩn: 10 cm, 1/4, x = 10)","noi_dung_man_hinh":["1-2 dòng LaTeX ngắn, mới hoàn toàn"],"trinh_bay":"xep","minh_hoa":{"loai":"san_khau","mo_ta":"...","du_lieu":{"vat":[...],"hanh_dong":[...]}}}.\n' +
    'Giữ đúng chương trình lớp của đề. Mỗi cảnh phải giải thích một bước mới.';
  var soCanhThem = 24;
  var tuMoiCanh = Math.max(35, Math.ceil((600 - chuanHoaThoiLuong_(kbGoc)) * TOC_DO_DOC / soCanhThem));
  function vietChuong(khoa, soCanh, truoc) {
    var p = promptMoRong + '\nLượt này CHỈ viết phần ' + khoa + ', đúng ' + soCanh +
      ' cảnh. Mục tiêu ' + tuMoiCanh + ' từ tiếng Việt mỗi cảnh (thay cho 30–45 từ ở trên). ' +
      'Triển khai lý do, phép tính và kiểm tra cụ thể. Trả JSON {"canh":[...]}. ' + truoc;
    var j = goiGemini_(p, 0.5, sn);
    if (!j || !Array.isArray(j.canh) || j.canh.length !== soCanh || j.canh.some(function(c) {
      return !c || !String(c.loi_thoai || '').trim();
    })) throw new Error('CHUONG_10P_CHUA_DU: ' + khoa);
    return j.canh;
  }
  var pp = vietChuong('phuong_phap', 8, '');
  var bt = vietChuong('bien_the', 11, '');
  var tk = vietChuong('tong_ket', 5, 'Biến thể đã giảng: ' + bt.map(function(c) {return c.loi_thoai;}).join(' '));
  // Chèn phần Phương pháp ngay sau phần Đề bài / Mô phỏng của bài gốc; phần Biến thể + Tổng kết trước cảnh kết cuối
  var idxSauDe = 3;
  for (var i = 0; i < kbGoc.canh.length; i++) {
    if (/bay|nhac_lai|diem_chot|tinh_toan/.test(String(kbGoc.canh[i].loai || ''))) { idxSauDe = i; break; }
  }
  var dau = kbGoc.canh.slice(0, idxSauDe);
  var giua = idxSauDe < kbGoc.canh.length - 1 ? kbGoc.canh.slice(idxSauDe, kbGoc.canh.length - 1) : [];
  var cuoi = kbGoc.canh.slice(-1);
  kbGoc.canh = dau.concat(pp, giua, bt, tk, cuoi);
  kbGoc.canh.forEach(function (c, idx) { if (c) c.so = idx + 1; });
  kbGoc.kieu_video = 'DAI_10_PHUT';
  return kbGoc;
}


/* ===================== v97: HÌNH HỌC KHÔNG GIAN CHUẨN (đặc tả cấu trúc, máy giải tọa độ, đạo diễn camera) ===================== */
// Tắt: CAU_HINH HINH_KHONG_GIAN_CHUAN = TAT (về Manim manim_hinh.py cũ). Bản Python: scripts/giai_hinh_khong_gian.py + hinh_khong_gian/.
function batHinhKhongGian_() { return String((typeof cauHinh_ === 'function' && cauHinh_('HINH_KHONG_GIAN_CHUAN')) || 'BAT').toUpperCase() !== 'TAT'; }
function dungHinhKhongGian_(r) {
  if (typeof dungLego_ === 'function' && dungLego_(r)) return false;   // v98: Oxyz lớp 12 -> động cơ Lego (đặc tả riêng có schema)
  return batHinhKhongGian_() && typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r) && typeof laHinhKhongGian_ === 'function' && laHinhKhongGian_(r && r.de_bai);
}
var CHE_DO_CAMERA_KG_ = ['toan_canh', 'truc_dien_mat', 'ep_mep_mat', 'nhin_day', 'can_canh', 'phang_2d'];   // v98: + phang_2d (cảnh dẫn 2D -> 3D)
function huongDanKhongGian_(r) {
  return '\nHÌNH HỌC KHÔNG GIAN CHUẨN (BẮT BUỘC, thay cho hinh_hoc tọa độ / buoc_ve): trả thêm trường "hinh_khong_gian". TUYỆT ĐỐI KHÔNG ghi tọa độ (x, y, z): máy tự tính tọa độ từ cấu trúc, ' +
    'tự chọn tỷ lệ đẹp (điểm "bất kỳ" tránh trung điểm), tự kiểm chứng MỌI mệnh đề / số đo bằng số (sai -> bị trả lại), tự tính nét liền / nét đứt ở mọi khung khi xoay.\n' +
    '"hinh_khong_gian": {\n' +
    ' "khoi": {"loai":"chop_tu_giac|chop_tam_giac|tu_dien|lang_tru_tam_giac|lang_tru_tu_giac|hinh_hop|hop_chu_nhat|lap_phuong","dinh":"S","day":"ABCD",' +
    '"day_kieu":"vuong|chu_nhat|binh_hanh|thoi|thang|thang_vuong (tứ giác) | deu|vuong|vuong_can|can|tuy_y (tam giác)","vuong_tai":"B (đáy tam giác vuông)",' +
    '"chan_duong_cao":"A (cạnh bên SA ⊥ đáy) | tam (chóp đều) | trung_diem:AB (mặt bên ⊥ đáy) | tuy_y","deu":true|false,"xien":false,' +
    '"kich_thuoc":{"AB":1,"SA":1.414} (GHI ĐỦ số đo của đề theo đơn vị a = cạnh AB, căn viết số thập phân; đề không cho số thì bỏ trống)},\n' +
    ' "diem": [theo ĐÚNG thứ tự dựng; loại: {"ten":"N","loai":"trung_diem","doan":"AB"} | {"ten":"M","loai":"tren_canh","canh":"SC"} (KHÔNG ghi ty_le khi đề nói "bất kỳ"; có tỉ lệ thì "ty_le": SM/SC, vd 0.25 hoặc "1/3") | ' +
    '{"ten":"K","loai":"giao","duong":["NP","CD"]} (hai đường CÙNG một mặt phẳng; giao trên phần kéo dài được, máy tự vẽ đoạn kéo dài) | {"ten":"E","loai":"giao_duong_mat","duong":"SD","mat":"MNP"} | ' +
    '{"ten":"H","loai":"chan_vuong_goc","tu":"A","xuong":"SB"} hoặc {"tu":"A","mat":"SBC"} | {"ten":"G","loai":"trong_tam","tam_giac":"SAB"} | {"ten":"F","loai":"giao_song_song","qua":"M","song_song":"AB","cat":"SB"}],\n' +
    ' "doan": [{"doan":"AH","vai":"dich|phu"}] (đường phụ kẻ thêm; đường đích = đoạn cần tìm / chứng minh),\n' +
    ' "mat_cat": [{"mat":"MNP","bung":true}] (thiết diện / mặt phẳng cắt: máy tự tính đa giác thiết diện, phủ vàng bán trong suốt, không làm cạnh sau thành nét đứt),\n' +
    ' "goc": [{"dinh":"A","canh":"SB","vuong":true}, {"dinh":"C","canh":"SA","nhan":"\\\\varphi"}] (ký hiệu góc vuông 3D / cung góc),\n' +
    ' "menh_de": [{"loai":"vuong_goc_mat","duong":"BD","mat":"SAC"}, {"loai":"thuoc","diem":"E","mat":"MNP"}, {"loai":"song_song","a":"NP","b":"BD"} ...] (loai: thuoc | vuong_goc | vuong_goc_mat | mat_vuong_goc | song_song | song_song_mat | thang_hang | dong_phang),\n' +
    ' "so_do": [{"loai":"goc_duong_mat","duong":"SC","mat":"ABCD","gia_tri":"45°"}, {"loai":"khoang_cach_diem_mat","diem":"A","mat":"SBC","gia_tri":"\\\\dfrac{a\\\\sqrt{6}}{3}"}] ' +
    '(loai: do_dai | goc_duong_mat | goc_hai_duong | goc_hai_mat | goc_ba_diem | khoang_cach_diem_mat | khoang_cach_diem_duong | khoang_cach_hai_duong | the_tich),\n' +
    ' "truot": {"diem":"M"} (tùy chọn: điểm "bất kỳ" trượt nhẹ trên cạnh ở 2 giây đầu - hook),\n' +
    ' "de_ghim": [{"id":"d1","nhan":"SA ⊥ (ABCD)"}, ... "d(A, (SBC)) = ?"] (2-4 ô ngắn, ô cuối là câu hỏi có dấu ?),\n' +
    ' "buoc": [{"canh":<số cảnh>,"khi_noi":"cụm 2-5 từ NGUYÊN VĂN lời cảnh đó","nhan":"1-2 từ (Đề bài / Góc / Khoảng cách - KHÔNG ghi Bước 1)","tieu_de":"≤ 40 ký tự, không lộ đáp số",' +
    '"xoay":[{"goc_nhin":"' + CHE_DO_CAMERA_KG_.join('|') + '","doi_tuong":["S","A","C"],"moc_xoay":"cụm 3-5 từ NGUYÊN VĂN mở đầu ý chứng minh"}],' +
    '"hien":[{"id":"AH","khi_noi":"kẻ AH vuông góc"}],"nhan_manh":["AH","SB"],"hanh_dong":[{"loai":"bung_mat","id":"(MNP)","khi_noi":"bung rộng mặt phẳng"}],' +
    '"the":[{"loai":"cong_thuc","dong":["AH \\\\perp (SBC)"],"khi_noi":"..."}]}]\n}\n' +
    'ĐẠO DIỄN CAMERA (máy tính góc tối ưu, chỉ chọn tên + đối tượng): toan_canh (bước 1, mở đề) | truc_dien_mat [3 điểm của mặt] (nhìn thẳng mặt phụ đang chứng minh, máy làm mờ phần còn lại) | ' +
    'ep_mep_mat [3 điểm] (nhìn dọc theo mặt: đường ⊥ mặt, hai mặt ⊥, đường đâm xuyên mặt tại giao điểm) | nhin_day (giao tuyến ở đáy, hình chiếu xuống đáy) | can_canh [đối tượng] (chốt góc / đoạn / giao điểm).\n' +
    'ĐỒNG BỘ LỜI - XOAY (LỖI CỨNG CAM_MAT_MOC / CAM_DE_GIO): mỗi cú xoay (trừ toan_canh của bước 1) BẮT BUỘC có "moc_xoay" là cụm NGUYÊN VĂN trong loi_thoai của chính cảnh "canh" của bước, ' +
    'đặt đúng chỗ bắt đầu ý đó (vd "xét mặt phẳng SBD", "chiếu vuông góc xuống đáy", "cắt cạnh SD tại E"); máy xoay đúng lúc giọng đọc tới cụm, KHÔNG xoay đầu cảnh; hai cú xoay cách nhau ≥ 5 từ lời đọc.\n' +
    'NHỊP: 7-10 cảnh, tổng 50-68 giây (200-270 tiếng), mỗi bước giải đúng MỘT ý + MỘT cú xoay; lời đọc tên điểm in hoa liền (SA, SBC); đọc đề đúng 1 lần; mỗi dòng "... = số" phải được đọc ra số.\n' +
    'GDPT 2018: lớp 11 chứng minh tổng hợp (quan hệ song song / vuông góc, định lí ba đường vuông góc, hệ thức lượng tam giác vuông) - CẤM tọa độ Oxyz, vectơ pháp tuyến, tích vô hướng / có hướng; Oxyz chỉ lớp 12.\n';
}

// Gọn prompt hình học cũ cho bài không gian chuẩn: bỏ quy trình 15-20 cảnh, buoc_ve tọa độ, ví dụ tọa độ (HinhHoc.gs giữ nguyên)
function gonPromptKhongGian_(s, r) {
  s = String(s || '');
  if (typeof huongDanKichBanHinh_ === 'function') { var h = huongDanKichBanHinh_(r); if (h) s = s.split(h).join(''); }
  s = s.replace(/QUY TRÌNH 6 PHẦN CHO BÀI HÌNH[\s\S]*?(?=Trả thêm "de_cho")/,
    'QUY TRÌNH GỌN CHO BÀI HÌNH KHÔNG GIAN (7-10 cảnh, 50-68 giây, mỗi cảnh MỘT ý, lời 12-30 từ): mo_dau (câu hỏi móc ≤ 5 giây) -> de_bai (đọc đề đúng 1 lần) -> ' +
    'phan_tich (hướng đi: mặt phẳng phụ / hình chiếu) -> các cảnh giai (mỗi cảnh một bước + một cú xoay camera) -> dap_an -> bai_hoc (≤ 2 câu + kêu gọi lưu bài).\n');
  s = s.replace(/ĐỒNG BỘ HÌNH - TIẾNG \(BẮT BUỘC[\s\S]*?Mỗi dòng noi_dung_man_hinh có một phần tử "moc_loi"[^\n]*\n\n/, '');
  s = s.replace(/VÍ DỤ MỘT CẢNH ĐỀ BÀI TỐT \(hình chóp[\s\S]*?(?=5 ĐIỀU SỐNG CÒN)/, '');
  s = s.replace(/Mỗi cảnh chỉ có đúng MỘT vật \{"id":"hh","loai":"hinh_hoc",[^\n]*\n\n/, 'Hình vẽ (tọa độ, nét khuất, mặt cắt, góc máy) do máy dựng từ "hinh_khong_gian" (một hình xuyên suốt, giu_san_khau: true từ cảnh 2, minh_hoa của cảnh để {"loai":"san_khau","du_lieu":{"vat":[]}}).\n\n');
  s = s.replace(/"giu_san_khau":true,"buoc_ve":\[\{"ve":"","khi_noi":""\}\]/g, '"giu_san_khau":true');
  s = s.replace(/4\. ĐỦ BƯỚC VÀ CẢNH: 15-20 cảnh chi tiết;/, '4. ĐỦ BƯỚC VÀ CẢNH: 7-10 cảnh gọn (50-68 giây);');
  return s + '\nNHẮC LẠI: JSON trả về PHẢI có "hinh_khong_gian" như mô tả (không tọa độ); mọi moc_xoay là cụm nguyên văn trong lời của đúng cảnh.\n';
}

/* ===================== v98: ĐỘNG CƠ LEGO 6 KHỐI (Oxyz lớp 12 + Toán thực tế 3D) — Lớp 1: responseSchema enum cố định ===================== */
// Kịch bản (lời 8-12 cảnh) vẫn viết như cũ (không schema: hàng chục trường tùy chọn). Hình 3D xin ở MỘT lời gọi riêng có
// responseSchema chặt (lapLego_, BoPhan1.gs): Gemini KHÔNG thể bịa tên khối / động tác / chế độ máy ngoài enum.
// Lớp 2: Python (scripts/hinh_khong_gian/lego.py) tính MỌI tọa độ suy diễn + kiểm mệnh đề / số đo.
// Lớp 3: khối trang_tri lỗi -> bỏ riêng; lỗi lõi -> gửi đúng mục JSON lỗi cho Gemini vá tối đa 1 lần.
// Tắt: CAU_HINH LEGO_3D = TAT.
var LEGO_LOAI_ = ['khoi', 'doan', 'duong_cong', 'mat', 'diem', 'he_truc'];
var LEGO_HINH_ = ['hop', 'lang_tru', 'chop', 'tru', 'non', 'cau', 'tron', 'cung', 'parabol', 'elip', 'quy_dao', 'san_oxy', 'mat_phang', 'da_giac'];
var LEGO_DONG_TAC_ = ['tinh_tien', 'doi_xung_mat', 'quay', 'co_lap', 'truot_toi_uu'];
var LEGO_QUAN_HE_ = ['toa_do', 'trung_diem', 'tren_doan', 'doi_xung_mat', 'doi_xung_diem', 'tinh_tien', 'quay', 'giao_duong_mat', 'chan_vuong_goc', 'toi_uu_tong'];
var LEGO_MAU_ = ['cyan', 'vang', 'hong', 'ngoc', 'trang', 'xam', 'cam', 'tim', 'la'];
var LEGO_CAMERA_ = ['toan_canh', 'truc_dien_mat', 'ep_mep_mat', 'nhin_day', 'can_canh', 'phang_2d'];
var LEGO_MENH_DE_ = ['thuoc_mat', 'thang_hang', 'cung_phia_mat', 'toi_uu', 'vuong_goc', 'song_song', 'thuoc'];
var LEGO_SO_DO_ = ['tong_do_dai', 'do_dai', 'toa_do', 'goc_hai_duong', 'goc_duong_mat', 'khoang_cach_diem_mat', 'the_tich'];

function batLego_() { return String((typeof cauHinh_ === 'function' && cauHinh_('LEGO_3D')) || 'BAT').toUpperCase() !== 'TAT'; }
// Định tuyến: Oxyz lớp 12 (mọi luồng) | chỉ đạo người dùng nhắc lego / 3d tự do. Thực tế 3D không suy được khuôn
// (KHUNG4TANG_3D_RONG) được lapLego_ cứu ở vòng sửa (BoPhan1.gs) — 8 khuôn v92 giữ nguyên khi khớp.
function dungLego_(r) {
  if (!batLego_() || !r) return false;
  var de = String(r.de_bai || ''), lop = String(r.lop || '').replace(/\D/g, '');
  var cd = String(r.chi_dao || '') + ' ' + ((de.match(/\[\s*chi\s*_?dao\s*:\s*([^\]]+)\]/i) || [])[1] || '');
  if (/lego|3d tự do|khối tự do/i.test(cd)) return true;
  return lop === '12' && /oxyz|hệ (trục )?tọa độ\s*O\s*x\s*y\s*z|\(\s*-?\d+(?:[.,]\d+)?\s*;\s*-?\d+(?:[.,]\d+)?\s*;\s*-?\d+(?:[.,]\d+)?\s*\)/i.test(de);
}

function schemaLego_() {
  var S = function (e) { return e ? {type: 'STRING', enum: e} : {type: 'STRING'}; };
  var N = {type: 'NUMBER'}, B = {type: 'BOOLEAN'}, I = {type: 'INTEGER'};
  var AS = {type: 'ARRAY', items: {type: 'STRING'}}, AN = {type: 'ARRAY', items: N};
  var O = function (p, req) { var o = {type: 'OBJECT', properties: p}; if (req) o.required = req; return o; };
  var A = function (x) { return {type: 'ARRAY', items: x}; };
  return O({
    phien_ban: I,
    he_truc: O({loai: S(['oxyz', 'oxy', 'khong']), don_vi: S(), vach: N, huong: B}, ['loai']),
    diem: A(O({ten: S(), loai: S(LEGO_QUAN_HE_), toa_do: AN, nguon: S(), mat: S(), doan: S(), duong: S(), vec: S(), tam: S(), truc: S(), goc: N,
      ti_le: N, tu: S(), tren: S(), toi: AS, trang_tri: B}, ['ten', 'loai'])),
    doi_tuong: A(O({id: S(), loai: S(LEGO_LOAI_), hinh: S(LEGO_HINH_), kieu: S(['thang', 'vector', 'tia', 'gion']), doan: S(), tam: S(), ban_kinh: N, cao: N,
      kich_thuoc: AN, goc: S(), day: AS, dinh: S(), dinh_ten: AS, tu: S(), den: S(), a: N, b: N, goc_dau: N, goc_cuoi: N, diem: S(), mau: S(LEGO_MAU_),
      nhan: S(), lech: AN, luoi: B, trang_tri: B, chuyen_dong: O({theo: S(), giay: N, khi_noi: S()})}, ['id', 'loai'])),
    goc: A(O({dinh: S(), canh: S(), vuong: B, nhan: S()}, ['dinh', 'canh'])),
    menh_de: A(O({loai: S(LEGO_MENH_DE_), diem: S(), mat: S(), tren: S(), toi: AS, a: S(), b: S(), duong: S()}, ['loai'])),
    so_do: A(O({loai: S(LEGO_SO_DO_), doan: AS, diem: S(), truc: S(['x', 'y', 'z']), gia_tri: S()}, ['loai', 'gia_tri'])),
    de_ghim: A(O({id: S(), nhan: S()}, ['id', 'nhan'])),
    buoc: A(O({canh: I, khi_noi: S(), nhan: S(), tieu_de: S(),
      xoay: A(O({goc_nhin: S(LEGO_CAMERA_), doi_tuong: AS, moc_xoay: S()}, ['goc_nhin'])),
      hien: A(O({id: S(), khi_noi: S()}, ['id'])),
      nhan_manh: AS,
      hanh_dong: A(O({loai: S(LEGO_DONG_TAC_), doi_tuong: AS, diem: S(), tren: S(), toi: AS, don_vi: S(), moc_hanh_dong: S()}, ['loai', 'moc_hanh_dong'])),
      the: A(O({loai: S(['cong_thuc', 'chu']), dong: AS, noi_dung: S(), khi_noi: S(), chot: B}, ['loai']))}, ['canh', 'nhan', 'tieu_de']))
  }, ['he_truc', 'diem', 'doi_tuong', 'buoc', 'de_ghim']);
}

// Lời nhắc cho lời gọi riêng (có schema): đề + đáp án + lời từng cảnh (để moc_* là cụm NGUYÊN VĂN)
function huongDanLego_(kb, r) {
  var canh = (kb && kb.canh || []).map(function (c, i) { return '  cảnh ' + (c.so || i + 1) + ' [' + (c.loai || '') + ']: ' + String(c.loi_thoai || '').replace(/\s+/g, ' ').trim(); }).join('\n');
  var lop = String((r && r.lop) || (kb && kb.lop) || '');
  return 'Bạn là đạo diễn hình 3D cho video Toán dọc 9:16. Dựng hình bằng 6 KHỐI LEGO, máy tính mọi tọa độ suy diễn và tự kiểm chứng. Trả JSON đúng schema (đặc tả hinh_khong_gian).\n' +
    'ĐỀ: ' + String((r && r.de_bai) || kb.de_bai || '') + '\nĐÁP ÁN: ' + String((r && r.dap_an) || kb.dap_an_cuoi || '') + '\nLỚP: ' + lop + '\nLỜI ĐỌC CÁC CẢNH:\n' + canh + '\n\n' +
    'QUY TẮC:\n' +
    '1. "diem": điểm DỮ KIỆN của đề dùng {"ten","loai":"toa_do","toa_do":[x,y,z]} (chỉ số đề cho, đơn vị của đề; đặt gốc O hợp lý, z hướng lên); điểm SUY DIỄN chỉ khai báo QUAN HỆ, KHÔNG ghi tọa độ: ' +
    'doi_xung_mat {"nguon","mat":"Oxy"} | tinh_tien {"nguon","vec":"OH"} | quay {"nguon","truc":"AB","goc":90} | trung_diem {"doan":"AB"} | tren_doan {"doan","ti_le"} | giao_duong_mat {"duong","mat":"Oxy"} | chan_vuong_goc {"tu","mat" hoặc "duong"} | toi_uu_tong {"tren":"Oxy","toi":["A","B"]}.\n' +
    '2. "doi_tuong" (6 khối): khoi {"hinh":"hop|lang_tru|chop|tru|non|cau","tam","ban_kinh","cao","kich_thuoc","day","dinh","dinh_ten","luoi"} (tòa tháp = trụ, bể nước = trụ / hộp, radar = cầu) | ' +
    'doan {"doan":"AM","kieu":"thang|vector|tia|gion","nhan":"200\\\\,\\\\text{m}","mau"} (gion = đường gióng kích thước có số đo) | duong_cong {"hinh":"tron|cung|parabol|elip|quy_dao","tam","ban_kinh","tu","den","cao"} | ' +
    'mat {"hinh":"san_oxy|mat_phang|da_giac","diem"} (san_oxy = mặt đất bán trong suốt, nhìn xuyên xuống z < 0) | diem {"diem":"F","nhan":"Flycam","chuyen_dong":{"theo":"id quỹ đạo","giay":3}} | he_truc.\n' +
    '   Khối chỉ để minh họa (cây, mây, quỹ đạo gợi ý, vật bay) BẮT BUỘC "trang_tri": true; khối của lời giải KHÔNG có cờ này. Màu: đoạn bằng nhau cùng màu; đoạn đáp số "vang".\n' +
    '3. "buoc" khớp các cảnh: mỗi bước MỘT ý; "xoay" chọn trong ' + LEGO_CAMERA_.join(' | ') + ' (phang_2d = nhìn từ trên như bản đồ 2D ở bước 1, bước 2 xoay "toan_canh" để hình nổi 3D); mọi cú xoay trừ bước 1 có "moc_xoay" = cụm 3-5 từ NGUYÊN VĂN lời cảnh đó.\n' +
    '4. "hanh_dong" (5 động tác, mỗi cái có "moc_hanh_dong" = cụm 3-5 từ NGUYÊN VĂN lời đọc lúc động tác bắt đầu): tinh_tien / doi_xung_mat / quay {"doi_tuong":["tên ẢNH đã khai báo bằng quan hệ"]} | ' +
    'co_lap {"doi_tuong":[2-5 điểm / đoạn trọng tâm]} (nền mờ 80 %) | truot_toi_uu {"diem":"M","tren":"Oxy","toi":["A","B"],"don_vi":"m"} (M trượt qua lại rồi dừng ở cực trị, số đọc trực tiếp).\n' +
    '5. "the": công thức LaTeX của bước (khi_noi nguyên văn); thẻ cuối "chot": true. "de_ghim" 2-4 ô, ô hỏi ghi "= ?" (KHÔNG ghi đáp số). "menh_de" + "so_do" (gia_tri đúng như lời giải) để máy kiểm chứng.\n' +
    '6. GDPT 2018: Oxyz chỉ lớp 12; lớp 10-11 dùng "he_truc":{"loai":"khong"} và mô tả bằng độ dài / độ cao. Cấm số phức.\n';
}

// Câu nhắc thêm cho prompt kịch bản chính khi bài đi động cơ Lego (lời đọc phải có các cụm mốc rõ ràng cho máy bám)
function nhacLoiLego_() {
  return '\nHÌNH 3D (ĐỘNG CƠ LEGO): hình do máy dựng ở bước riêng từ lời của bạn — KHÔNG viết "canh_3d_vector" / "hinh_khong_gian". Lời đọc nói rõ từng thao tác bằng cụm ngắn ' +
    '("Đặt hệ trục Oxyz", "lấy đối xứng B qua mặt phẳng Oxy", "tịnh tiến A theo vectơ OH", "thử trượt điểm M"), mỗi cảnh một thao tác, 8-12 cảnh, 50-68 giây.\n';
}
