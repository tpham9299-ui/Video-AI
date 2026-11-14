/**
 * LỜI NHẮC VIẾT KỊCH BẢN VIDEO (dán thành tệp PromptKichBan.gs trong cùng dự án Apps Script với BoPhan1.gs).
 * BoPhan1.gs gọi taoPromptKichBan_(r, c1, c2). Muốn chỉnh giọng văn/cấu trúc video thì chỉ sửa tệp này.
 * Hai loại video: XÁC SUẤT (đáp án phân số) và TOÁN THỰC TẾ (r.mon = 'THUC_TE', đáp số là một con số, cảnh 3D thật + mô hình hóa).
 * Mọi dạng "minh_hoa" ở đây phải khớp với bộ dựng video (src/sankhau/dulieu.ts) và bộ kiểm tra KiemTraHinh.gs.
 */

function taoPromptKichBan_(r, c1, c2) {
  var tt = typeof laMonThucTe_ === 'function' && laMonThucTe_(r);
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
    'Yếu tố cần suy nghĩ: ' + r.yeu_to_tu_duy + '\nBẫy học sinh hay sai: ' + r.bay_thuong_gap + '\n',
    'MÔ HÌNH HÓA: ' + (c1.mo_hinh || c2.mo_hinh || '(tự nêu từ lời giải)') + '\n',
    'LỜI GIẢI GỌN (ưu tiên dùng để dạy): ' + (c2.y_tuong ? 'Ý tưởng then chốt: ' + c2.y_tuong + '\n' : '\n') + buocC2 + '\n',
    'LỜI GIẢI CHI TIẾT (để đối chiếu số liệu): ' + buocC1 + '\n\n',

    'NGUYÊN TẮC SỐ LIỆU: mọi con số chỉ lấy từ đề và hai lời giải trên; dòng CUỐI của cảnh đáp án phải chứa đúng đáp số ' + r.dap_an + ' (viết dấu phẩy thập phân kiểu Việt Nam trong LaTeX là {,}, ví dụ 12{,}5) kèm đơn vị. Không viết câu thông báo của hệ thống (hạn mức, xin lỗi...).\n\n',

    '1) TOÁN THỰC TẾ = DỰNG LẠI CẢNH THẬT RỒI MÔ HÌNH HÓA (bắt buộc): người xem phải THẤY vật thật trước, rồi thấy nó "biến" thành hình học/hàm số, cuối cùng quay lại vật thật với kết quả. ',
    'Mạch hình ảnh: cảnh thật 3D (vật đúng hình dạng: hộp/bể = khoi_hop, lon/cốc/bồn = tru, phễu = non, nhà = toa_nha, thang = thang, đường đi có xe = xe, cảnh quan = cay) -> giữ sân khấu, gắn nhãn kích thước (x, h, 4 m...) lên vật -> mô hình phẳng (hinh_hoc: tam giác, góc, cạnh) hoặc hàm số (do_thi) -> tính -> quay lại cảnh thật 3D với kích thước đúng của đáp số. ',
    'Vật 3D phải đúng TỈ LỆ của đề ("kich_thuoc" ghi số thật, ví dụ đáy 4x4, cao 2 -> [4,4,2]); khi đổi kích thước để so sánh thì dùng hai vật cạnh nhau.\n\n',

    '2) DẠY Ý ĐỒ, KHÔNG DẠY CÔNG THỨC RẬP KHUÔN: nói rõ (a) "y_do": đề thật sự muốn tối ưu/tính đại lượng nào, cái gì cố định, cái gì thay đổi; (b) "mo_hinh_hoa": đặt ẩn là gì, điều kiện của ẩn (ẩn dương, nhỏ hơn cạnh tấm tôn...), lập biểu thức; ',
    '(c) "diem_chot": ý then chốt (đại lượng cố định để khử ẩn, đối xứng, bất đẳng thức, đường gấp khúc duỗi thẳng...) và VÌ SAO nó đúng; (d) chỉ khi suy luận đã dẫn tới mới dùng công thức. Ghi ý tưởng then chốt vào "y_tuong_chinh" (một câu, ít nhất 30 ký tự).\n\n',

    '3) ĐÂY LÀ MỘT BÀI GIẢNG, PHẢI KỸ VÀ RÕ: người xem chưa biết gì cũng phải hiểu, và tự làm lại được bài tương tự. ',
    quyTrinh6Phan_(true),
    'Ngoài "canh", trả thêm: "bai_hoc_rut_ra" (mảng 3 câu, mỗi câu ≤ 12 từ, là quy tắc dùng được ngay, ví dụ "Thể tích cố định: rút một ẩn theo ẩn kia") và "video_tiep_theo" (≤ 10 từ, hẹn bài kế tiếp).\n'
  ] : [
    'Bạn là giáo viên Toán kiêm biên kịch và ĐẠO DIỄN HÌNH ẢNH cho video ngắn TikTok/YouTube Shorts (video dọc) dạy học sinh lớp ' + r.lop + ' giải bài xác suất. ',
    'Video được DỰNG TỰ ĐỘNG từ kịch bản JSON của bạn: mỗi cảnh có một "sân khấu" gồm các VẬT THẬT (người, thẻ, xúc xắc, vòng quay, hộp quà, đồng hồ đo xác suất...) chuyển động theo từng câu thoại, kiểu đồ họa neon như các video giải thích nổi tiếng trên TikTok. Chỉ những gì bạn mô tả trong "du_lieu" mới xuất hiện trên màn hình, nên hãy đạo diễn thật cụ thể.\n\n',

    'DỮ LIỆU ĐÃ KIỂM CHỨNG (nguồn sự thật duy nhất):\n',
    'ĐỀ: ' + r.de_bai + '\n',
    'ĐÁP ÁN CUỐI CÙNG (đã kiểm chứng bằng máy, KHÔNG được đổi): ' + r.dap_an + '\n',
    vanDeDe_(r),
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
    quyTrinh6Phan_(false),
    'Ngoài "canh", trả thêm: "bai_hoc_rut_ra" (mảng 3 câu, mỗi câu ≤ 12 từ, là quy tắc làm bài dùng được ngay, ví dụ "Gặp chữ CÙNG: tách từng loại rồi cộng"; dùng làm các dòng danh_sach ở cảnh bai_hoc cuối video) và "video_tiep_theo" (≤ 10 từ, hẹn bài kế tiếp cùng chủ đề).\n'
  ];
  var moDau = [
    'MỞ ĐẦU ẤN TƯỢNG (quyết định người xem có lướt đi không; 1,5 giây đầu là quan trọng nhất): cảnh 1 tối đa 5 giây, "loi_thoai" cảnh 1 tối đa 16 từ. Nghĩ 3 phương án hook, ghi vào "hook_ung_vien", chọn phương án mạnh nhất. ',
    'Công thức hook mạnh: (a) phá vỡ kỳ vọng ("Bể to hơn mà lại tốn ÍT gạch hơn?"); (b) đặt cược/thách thức có con số cụ thể ("Cho bạn 10 giây: ..."); (c) nói trước kết quả gây sốc rồi hứa giải thích; (d) chỉ ra sai lầm mà chính người xem đang mắc; (e) câu hỏi đời thực ai cũng từng gặp. ',
    'Nói thẳng với "bạn", động từ mạnh, có con số hoặc hình ảnh cụ thể; hình ảnh cảnh 1 phải là vật thật đang chuyển động (camera 3D xoay, vật bung ra, xúc xắc lăn...), không mở bằng chữ suông. ',
    chao ? 'Được phép mở bằng MỘT lời chào cực ngắn có năng lượng (tối đa 3 từ, ví dụ "Chào bạn!") rồi vào hook ngay trong cùng câu thoại; KHÔNG "hôm nay", "các bạn ơi", "mọi người". '
         : 'KHÔNG chào hỏi, KHÔNG "hôm nay", "các bạn ơi", "mọi người": vào thẳng câu móc. ',
    '"hook_kieu": sai_lam | thach_thuc | bat_ngo | ket_qua_truoc | cau_hoi. Không bịa thống kê kiểu "90% học sinh sai". ',
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
    'BÀI CÓ SẢN PHẨM DO KÊNH BÁN (phải MINH BẠCH, không phải quảng cáo trá hình): sản phẩm "' + sp.ten + '"' + (sp.thuong_hieu ? ' (' + sp.thuong_hieu + ')' : '') + ', giá kênh bán ' + sp.gia_ban + ' đồng' +
      (sp.gia_thap ? ', giá thị trường ngày ' + sp.ngay + ': ' + sp.gia_thap + (sp.gia_cao > sp.gia_thap ? ' đến ' + sp.gia_cao : '') + ' đồng' : '') + '. Thông số đã xác minh: ' + ((sp.thong_so || []).join('; ') || '(chỉ dùng giá)') + '.\n',
    '(a) Bài giảng toán là chính: người xem không mua vẫn học được kỹ năng hữu ích. Sản phẩm chỉ là bối cảnh đời thật của bài, xuất hiện tự nhiên (vật trên sân khấu, con số trong đề), không quảng cáo. ',
    '(b) Chỉ dùng số liệu và thông số ở trên; không thêm công dụng, không so sánh với sản phẩm khác, KHÔNG nêu tên thương hiệu/sản phẩm cạnh tranh. ',
    '(c) CẤM lời quảng cáo quá đà: "tốt nhất", "rẻ nhất", "số 1", "hàng đầu", "duy nhất", "cam kết", "100%", "mua ngay", "chốt đơn". Không kêu gọi mua giữa video. ',
    '(d) Chỉ được nhắc một câu ngắn, trung thực ở cảnh bài học cuối, ví dụ: "Sản phẩm trong bài là ' + sp.ten + ', kênh có bán, thông tin ở giỏ hàng." Máy tự gắn nhãn "Có sản phẩm do kênh bán" lên video, bạn không cần viết nhãn.\n\n'
  ] : [];
  var nangCao = [
    r._series ? 'SERIES: video này là tập ' + r._series.tap + ' của series "' + r._series.ten + '"' + (r._series.truoc ? ' (tập trước: "' + r._series.truoc + '")' : '') +
      '. Có thể nhắc nhẹ một câu nối với tập trước nếu tự nhiên; "video_tiep_theo" hẹn một bài cùng series.\n' : '',
    r._hook ? 'KIỂU MỞ ĐẦU CẦN THỬ Ở VIDEO NÀY: "' + r._hook + '" (đặt "hook_kieu" = "' + r._hook + '" và viết câu móc đúng kiểu đó, thật mạnh). Hệ thống đang đo kiểu mở đầu nào giữ chân người xem tốt nhất.\n' : '',
    typeof goiYTuSoLieu_ === 'function' ? goiYTuSoLieu_() : '',
    typeof hocEditChoPrompt_ === 'function' ? hocEditChoPrompt_() : '',
    'GÓC NHÌN 3D (tùy chọn): cảnh có hình học/hình tự do được dựng nổi khối 3D; có thể thêm "goc_nhin": ["..."] (1-3 góc, máy đổi góc ở các bước của cảnh) chọn trong: cheo_trai, tren_xuong (nhìn thẳng từ trên khi cần đọc số đo chính xác), cheo_phai, thap_chinh_dien (góc thấp hùng vĩ, hợp hook/đáp án), cao_toan_canh, nghieng_nhe. Hai cảnh liền nhau nên khác góc; không cần thì bỏ trống.\n'
  ];
  var noiCanh = [
    'MẠCH NỐI GIỮA CÁC CẢNH (rất quan trọng, người nghe ghét cảm giác "chuyển slide"): cả video phải nghe như MỘT bài nói liền mạch của một người thật, không phải các đoạn rời ghép lại. ',
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
    'do_thi {x:50, y:50, ham: biểu thức theo x viết kiểu máy tính ("x^2+128/x", "x*(60-2*x)^2", "3/sin(x)+3/cos(x)", "1000*1.06^x"; dùng * ^ / sqrt sin cos tan ln log exp abs, góc tính bằng radian trừ khi kieu:"do"), x_tu, x_den (khoảng vẽ, x_den > x_tu, nằm trong điều kiện của ẩn), y_tu, y_den (để 0 và 0 thì máy tự tính), gia_tri: vị trí x ban đầu của điểm chạy, danh_dau:[x cực trị/nghiệm], nhan_truc:["x","S"], noi_dung: tên hàm}: ',
    'đồ thị vẽ dần, điểm chạy dọc đường cong (dat_gia_tri {gia_tri: x mới} để điểm trượt tới đó, hiện "x = … → y = …"), danh_dau hiện chấm và tọa độ. Rất hợp để kiểm tra cực trị.\n',
    '  HÌNH TỰ DO (vẽ ĐÚNG mọi hình của đề mà các vật trên không có):\n',
    '  hinh_tu_do {x, y, co, khung:[rộng, cao] (khung tọa độ riêng, mặc định [100,100], gốc trên-trái, y hướng XUỐNG; giữ hình trong khoảng 5-95), noi_dung: tiêu đề nhỏ, gia_tri: bước lặp hiện tại của fractal, hinh:[các nét vẽ lần lượt]}. ',
    'Mỗi nét {kieu, ...các trường riêng, mau, to (tên màu để tô kín, hoặc true), do_to 0.05-1, net (độ dày 1-14), dut:true (nét đứt), nhan (nhãn LaTeX ngắn), vi_tri_nhan:[x,y], buoc (bước xuất hiện riêng; bỏ trống = vẽ lần lượt)}: ',
    'da_giac {diem:[[x,y],...]} (đa giác kín) | duong {diem} (đường gấp khúc hở) | mui_ten {diem:[[x1,y1],[x2,y2]]} | tron {tam:[x,y], r} | cung {tam, r, tu, den (độ, 0 = hướng phải, tăng theo chiều kim đồng hồ)} | chu {tam, noi_dung (LaTeX), co_chu} | ',
    'svg {d: "M10 10 L90 10 Q50 60 10 10 Z"} (đường cong tự do: bờ biển, con sông, hình cong lạ) | da_giac_deu {tam, r, so_canh 3-24, xoay} | ',
    'koch {tam, r, lap 0-6} hoặc {diem: đa giác gốc, lap}: bông tuyết Koch (gai hướng ra ngoài) | sierpinski {tam, r, lap 0-6}: tam giác Sierpinski | ',
    'tham_so {x: "biểu thức theo t", y: "biểu thức theo t", t_tu, t_den}: đường cong tham số (xoắn ốc, hình tim, quỹ đạo) | lap {hinh: một nét, so_lan, dich:[dx,dy], xoay (độ mỗi lần), tam_xoay:[x,y], ti_le}: nhân bản (hàng cây, bậc thang, hoa văn, lát gạch). ',
    'xep_chong {tam:[x,y], r: nửa bề rộng tầng dưới cùng, hang:[số vật từng tầng TỪ TRÊN XUỐNG] hoặc tren + duoi (+ buoc_tang, mặc định 1)}: CHỒNG VẬT XẾP TẦNG (ống thép, lon, khúc gỗ, quả cam, gạch) đúng như hình đề, tầng nhiều thì tự rút gọn "⋮" ở giữa như sách giáo khoa; ĐỀ XẾP ỐNG/LON THÀNH TẦNG BẮT BUỘC dùng nét này (không dùng khối trụ); thêm ten_tang (vd "tầng", "hàng") để máy ghi "+15 tầng" ở chỗ rút gọn. Nhãn từng tầng dùng nét chu đặt bên phải. ',
    'vat {ten, goc:[x,y] (điểm CHÂN vật trên mặt đất; mat_troi, may_bay: tâm), cao (chiều cao theo khung, ĐÚNG TỈ LỆ số đo của đề), rong (chỉ cau, song, ho_nuoc, tuong), lat:true (quay mặt sang trái), diem:[[chân],[đỉnh]] (thang dựa tường)}: VẬT THỰC TẾ vẽ sẵn, đẹp, có chuyển động nhẹ: ' +
    'cot_co (cột cờ đỏ sao vàng bay), nguoi (người quan sát, MẮT ở 93% chiều cao), toa_nha, ngan_hang, nha, truong_hoc, cay, cay_thong, hai_dang, thap_nuoc, cot_dien, den_duong, nui, mat_troi, xe_hoi, thuyen, may_bay, khinh_khi_cau, cau, song, thang, tien (chồng tiền + xu), heo_dat, dieu, tuong, ho_nuoc. ' +
    'ĐỀ CÓ VẬT THỰC TẾ NÀO THÌ PHẢI VẼ ĐÚNG VẬT ĐÓ bằng nét vat (cột cờ = cot_co, ngân hàng/gửi tiết kiệm = ngan_hang + tien, tòa nhà = toa_nha...), TUYỆT ĐỐI không thay bằng khối hộp/khối trụ/thẻ chữ. ' +
    'Đặt vật CHUNG KHUNG với các nét hình học: duong cho mặt đất và tia nhìn (dut:true), cung cho góc, chu cho số đo, da_giac tô mờ (do_to ≤ 0.2) cho tam giác cần tính - để tia nhìn chạm đúng đỉnh cột, số đo nằm đúng chỗ. ' +
    'Ví dụ đề đo cột cờ (đứng cách 20 m, góc nâng 35°, mắt cao 1,6 m), khung [100,80], đất y=72: {"kieu":"duong","diem":[[4,72],[96,72]]}, {"kieu":"vat","ten":"cot_co","goc":[84,72],"cao":50,"nhan":"h = ?"}, {"kieu":"vat","ten":"nguoi","goc":[20,72],"cao":5.4}, ' +
    '{"kieu":"duong","diem":[[21.5,67.3],[84,23.5]],"dut":true,"mau":"vang"} (tia nhìn từ mắt tới đỉnh), {"kieu":"cung","tam":[21.5,67.3],"r":10,"tu":-35,"den":0}, {"kieu":"chu","tam":[52,79],"noi_dung":"20\\\\,m"}. ' +
    '"mo_ta" của mỗi cảnh phải nói RÕ vẽ VẬT GÌ (tên vật thật của đề), đặt ở đâu, số đo nào gắn vào đâu và chuyển động ra sao.\n',
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
    '- GỢI Ý CHỌN VẬT: người/học sinh -> nguoi; bi, kẹo trong hộp -> hop_bi + lay_ra; bốc thăm -> tui hoặc the + chon; quà -> hop_qua + mo; xúc xắc, đồng xu, bài -> đúng vật đó + quay; quay số -> vong_quay; ',
    'đếm số cách / không gian mẫu -> luoi_o hoặc so_dem; liệt kê trường hợp, luật chơi -> danh_sach; so sánh hai trường hợp -> the hoặc bieu_do_cot; phần bù "ít nhất một" -> banh hoặc thanh; đáp án -> dong_ho_do; cái bẫy -> rung + loai_bo + nhan.\n'
  ];
  var viDu = tt ? [
    'VÍ DỤ MỘT CẢNH TỐT (bài bể nước không nắp, đáy vuông, thể tích 32 m³):\n',
    '{"so":3,"loai":"mo_hinh_hoa","tieu_de_canh":"Đặt cạnh đáy là x","tu_khoa":"x","giong_doc":"tập trung, mạch lạc","loi_thoai":"Muốn tối ưu thì phải gọi tên cái đang thay đổi. Gọi cạnh đáy là x, chiều cao là h. Thể tích ba mươi hai nên h bằng ba mươi hai chia x bình phương.","noi_dung_man_hinh":["x^2 h = 32","h=\\\\frac{32}{x^2}"],"trinh_bay":"xep",',
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
    'Trả về MỘT đối tượng JSON: {"tieu_de":"tiêu đề đăng video < 60 ký tự, gây tò mò","chu_de_ngan":"chủ đề 2-5 từ (hiện góc trên)","bai_hoc_rut_ra":["","",""],"video_tiep_theo":"","hook_ung_vien":["","",""],"hook":"(đúng lời thoại cảnh 1)","hook_chu":"","tieu_de_bia":"","hook_kieu":"","nhan_manh":[""],"y_tuong_chinh":"","de_cho":["",""],"can_tim":"","du_kien":["",""],"hashtag":["#toanhoc","' + (tt ? '#toanthucte' : '#xacsuat') + '"],"dap_an_cuoi":"' + r.dap_an + '",',
    '"canh":[{"so":1,"loai":"mo_dau|de_bai|mo_hinh_hoa|nhac_lai|y_do|bay|thu_nho|diem_chot|tinh_toan|kiem_tra|dap_an|bai_hoc","tieu_de_canh":"","tu_khoa":"","nhan":"","giu_san_khau":false,"giong_doc":"","loi_thoai":"","noi_dung_man_hinh":[],"trinh_bay":"cong_don|bien_doi|xep","chu_thich":[],"minh_hoa":{"loai":"san_khau","mo_ta":"","du_lieu":{"goc_nhin":null,"vat":[],"hanh_dong":[]}}}]}'
  ];

  return [].concat(
    dauVao,
    ['GIỮ CHÂN NGƯỜI XEM (rất quan trọng trên TikTok): (a) cứ 2-3 giây phải có một thay đổi trên màn hình (vật mới, hành động, đổi cảnh); (b) mở một "vòng lặp tò mò" ở cảnh 1-2 và chỉ đóng ở cảnh đáp án ("đến cuối bạn sẽ thấy vì sao..."); ',
    '(c) có một khoảnh khắc mời người xem đoán trước ("dừng video, đoán thử đi"); (d) ưu tiên đề có kết quả TRÁI TRỰC GIÁC hoặc tình huống đời thực gây tranh cãi (gameshow, bốc thăm, xổ số, sinh nhật trùng nhau, mật khẩu, trận đấu...); (e) câu ngắn, động từ mạnh, không giảng dài.\n'],
    moDau,
    khopDe,
    sanPham,
    nangCao,
    noiCanh,
    ['4) MỖI CẢNH CÓ: "loai"; "tieu_de_canh" (BẮT BUỘC từ cảnh 2: câu tiêu đề in chữ trắng thật lớn ở đầu cảnh, 3-8 từ, nói đúng ý chính của cảnh, ví dụ "Cùng giới nghĩa là gì?", "Bẫy: quên hai bạn nữ"); ',
    '"tu_khoa" (1-3 từ nằm NGUYÊN VĂN trong tieu_de_canh, được tô cam); "nhan" (tùy chọn, nhãn cam ngắn tối đa 2 từ, ví dụ "BƯỚC 1"; để trống thì máy tự đặt theo loại cảnh); ',
    '"loi_thoai"; "noi_dung_man_hinh"; "trinh_bay"; "chu_thich" (tùy chọn); "chuyen_canh" (tùy chọn: truot_len | phong | luot_ngang | truot_xuong | lat_3d (xoay 3D như lật trang); để trống thì máy tự xoay vòng, dùng "phong" cho cảnh bẫy/đáp án để tạo kịch tính); "giu_san_khau" (true nếu cảnh này DIỄN TIẾP trên sân khấu của cảnh trước: vật cũ còn nguyên, chỉ thêm vật hoặc hành động mới, giống video mẫu giữ nguyên hàng thẻ suốt nhiều cảnh. Nên dùng cho 2-3 cảnh liên tiếp cùng tình huống); "minh_hoa".\n',
    'LỜI THOẠI: câu ngắn (≤ 16 từ mỗi câu), mỗi cảnh ≤ 45 từ, giọng tự nhiên như đang nói chuyện ("để ý nhé", "thử nghĩ xem", "vì sao?"). Số và công thức viết thành LỜI ("ba phần năm", "C tám hai"), KHÔNG có ký hiệu LaTeX, dấu / hay %. Đừng đọc lại thứ đã hiện trên màn hình từng chữ một.\n',
    'CÔNG THỨC "noi_dung_man_hinh": mảng LaTeX (không kèm $), chỉ ở cảnh cần (tinh_toan, dap_an, có thể diem_chot); các cảnh khác để [] vì hình đã nói thay chữ. Tối đa 3 dòng (cong_don tối đa 4), mỗi dòng ngắn; chữ tiếng Việt đặt trong \\text{}; chỉ dùng \\frac, \\times, \\cdot, \\binom, \\text, ^, _, \\cup, \\cap, \\Rightarrow, \\overline. ',
    'Dòng công thức ngắn ở cảnh thu_nho/diem_chot nên dùng "xep": máy hiện từng dòng như đang VIẾT TAY bằng bút chì. Tô màu biến theo vật trên sân khấu (ví dụ x cam, y xanh) bằng \\\\textcolor để người xem nối hình với công thức. ',
    '"trinh_bay": "cong_don" (ưu tiên cho tính toán/đáp án: dòng sau GIỮ NGUYÊN dòng trước và nối thêm "=...", ví dụ ["P=\\\\frac{10}{28}+\\\\frac{3}{28}","P=\\\\frac{10}{28}+\\\\frac{3}{28}=\\\\frac{13}{28}"]) | "bien_doi" | "xep". Dòng CUỐI của cảnh đáp án phải là đáp án đúng. ',
    'Màu theo ý nghĩa: mỗi đối tượng một màu, dùng ĐÚNG màu đó ở cả hình và công thức: do=#FF5C61, xanh_duong=#4FC3F7, xanh_la=#3BF29A, cam=#FF8A3D, tim=#B79CFF, hong=#FF7EB6; tô trong công thức bằng \\\\textcolor{#FF5C61}{...}.\n\n'],
    ['5) HÌNH MINH HỌA = "SÂN KHẤU" (quan trọng nhất sau hook; hình nghèo nàn là kịch bản bị loại):\n',
    '- Ít nhất 4 cảnh (và mọi cảnh mo_dau, de_bai, y_do, bay, dap_an) dùng "minh_hoa.loai":"san_khau". Chỉ cảnh tính toán mới được dùng mẫu chuyên: so_do_cay, luoi_mau, dien_tich, venn, bang. KHÔNG dùng hình chỉ toàn emoji hay chỉ toàn chữ; KHÔNG vẽ sơ đồ bằng các đoạn thẳng khi có vật thật thay thế được.\n',
    '- "mo_ta": mô tả như đạo diễn (≥ 40 ký tự): vật gì, ở đâu, màu gì, chuyển động gì theo câu thoại nào, người xem phải hiểu ra điều gì.\n',
    '- "du_lieu": {"vat":[...], "hanh_dong":[...]}. Khung sân khấu tọa độ PHẦN TRĂM: x 0-100 trái sang phải, y 0-100 trên xuống dưới; (x,y) là TÂM vật. Mỗi cảnh 1-5 vật; các vật lớn cách nhau ít nhất 30 đơn vị theo y (xếp trên-dưới) hoặc 35 theo x (xếp trái-phải); nhóm nhiều phần tử (người, thẻ, cửa) nên chiếm cả một hàng (x=50). "buoc" 1-6 là thứ tự xuất hiện, mỗi bước khớp với một câu/ý trong lời thoại theo đúng thứ tự.\n'],
    ['- VẬT ("loai" và các trường riêng; trường chung: id (bắt buộc, duy nhất), loai, x, y, buoc, co (0.5-1.5, cỡ), mau, nhan (chữ dưới vật), tu_huong (trai|phai|tren|duoi: bay vào từ hướng đó)):\n',
    '  nguoi {so_luong 1-12, ds:["An","Bình"...] tên từng người}: học sinh, cầu thủ, khách hàng. | the {so_luong 1-8, noi_dung hoặc ds: chữ trên từng thẻ, gia_tri_chu: số lớn}: phiếu, vé, thẻ số, lựa chọn, trường hợp. | ',
    'the_bai {ds:["A♥","7♠","K♦"]}: lá bài tự rơi và lật mặt. | xuc_xac {so_luong 1-3, ket_qua:[3,5]}: xúc xắc lăn rồi dừng đúng mặt khi có hành động quay. | dong_xu {so_luong 1-4, ds:["S","N"]}: đồng xu tung lật. | ',
    'hop_bi {nhom:[{"mau":"do","so":5},{"mau":"xanh_duong","so":3}]}: hộp trong suốt, bi rơi vào. | tui {nhom:[...]}: túi bốc thăm (không thấy bên trong). | hop_qua {gia_tri_chu hoặc noi_dung, emoji}: hộp quà mở ra lộ phần thưởng. | ',
    'dong_ho {nhan}: đồng hồ, kim quay. | dien_thoai {noi_dung: tiêu đề màn hình, ds: các dòng/tin nhắn/lựa chọn, gia_tri_chu: nút}: ứng dụng, tin nhắn, mật khẩu. | bong_bay {gia_tri 0-1: độ phồng, gia_tri_chu}. | ',
    'dong_ho_do {gia_tri: xác suất 0-1, gia_tri_chu:"13/28", nhan}: đồng hồ đo xác suất, kim quét tới giá trị (DÙNG ở cảnh đáp án). | bieu_do_cot {ds: nhãn cột, ds_so: số liệu}: so sánh số cách/xác suất. | thanh {gia_tri 0-1, gia_tri_chu, nhan}: thanh xác suất. | ',
    'vong_quay {ds: nhãn các ô (2-12), ket_qua: số thứ tự ô dừng}: vòng quay may mắn. | cua {so_luong 2-4, ds: thứ sau mỗi cửa}: các cánh cửa. | banh {so_luong 2-12: số phần bằng nhau, ds}: chiếc bánh/pizza chia phần (tỉ lệ, phần bù). | ',
    'luoi_o {so_luong 4-64, so_cot, ds: chữ trong từng ô (tùy chọn), nhan}: lưới ô lấp đầy lần lượt, rất hợp với KHÔNG GIAN MẪU (36 kết quả tung 2 xúc xắc, 30 lượt chơi...) rồi "chon" các ô thuận lợi. | ',
    'danh_sach {noi_dung: tiêu đề thẻ, ds: 2-5 dòng ngắn}: thẻ sáng nổi có các dòng đánh số trượt vào; "chon" tô vàng quét ngang dòng quan trọng, "loai_bo" gạch dòng sai (liệt kê trường hợp, điều kiện, luật chơi). | ',
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
function vanDeDe_(r) {
  var m = /DE_CO_VAN_DE:\s*(.+)$/.exec(String(r.kiem_chung || ''));
  var chung = 'MỌI PHÉP TÍNH TRÊN MÀN HÌNH ĐỀU ĐƯỢC MÁY TÍNH LẠI: chỉ cần một vế sai (ví dụ ghi 20·25/2 = 260 trong khi thực ra là 250) là kịch bản bị trả về. Đừng bao giờ "ép" phép tính cho ra số đẹp.\n';
  if (!m) return chung;
  return chung + 'ĐỀ CÓ VẤN ĐỀ (bước giải đã thử ngược và phát hiện): ' + m[1] + '\n' +
    'Video PHẢI nói thật điều này một cách tích cực, như một phát hiện thú vị dạy học sinh biết THỬ LẠI đáp số (ví dụ: "Thử lại: 20 tầng chỉ có 250 ống, 21 tầng lại cần 273 ống, nên 260 ống không xếp vừa khít; xếp được 20 tầng trọn vẹn và còn dư 10 ống"). ' +
    'Có một cảnh "kiem_tra" cho phép thử ngược này; đáp số và các phép tính theo đúng cách hiểu ở trên.\n';
}


// QUY TRÌNH CỐ ĐỊNH 6 PHẦN cho MỌI video (toán thực tế và xác suất như nhau). Máy kiểm tra thứ tự và nội dung từng phần.
function quyTrinh6Phan_(tt) {
  return 'QUY TRÌNH CỐ ĐỊNH 6 PHẦN (BẮT BUỘC cho mọi video, đúng thứ tự, không được bỏ phần nào; 9-12 cảnh, tổng ' + cauHinh_('GIAY_MUC_TIEU') + ' giây):\n' +
    'PHẦN 1 - ĐỀ BÀI (luôn đi đầu, KHÔNG được nhảy thẳng vào mô phỏng):\n' +
    '  (1) mo_dau: câu móc ≤ 5 giây, chính là CÂU HỎI của đề nói cho hấp dẫn (không nói chuyện khác).\n' +
    '  (2) de_bai: ĐỌC RÕ TOÀN BỘ ĐỀ: lời thoại nêu ĐỦ mọi dữ kiện và mọi con số của đề (không bỏ số nào) rồi nói rõ đề hỏi gì. ' +
    'Hình: ' + (tt ? 'cảnh thật 3D của đề với số liệu gắn lên vật' : 'tình huống đời thực bằng vật thật') + '. Máy tự hiện THẺ ĐỀ BÀI (ĐỀ CHO / CẦN TÌM) từ "de_cho" và "can_tim" nên KHÔNG làm danh_sach "Đề cho / Cần tìm" trên sân khấu. Đề dài có thể dùng 2 cảnh de_bai liên tiếp.\n' +
    'PHẦN 2 - MÔ PHỎNG: (3) ' + (tt ? 'mo_hinh_hoa: dựng hình minh họa, đặt ẩn ngay trên vật, chuyển sang hình học/biểu thức, nêu điều kiện của ẩn' : 'y_do hoặc thu_nho: dựng lại tình huống bằng vật thật chuyển động (bốc, tung, chia, xếp...), cho thấy không gian mẫu hoặc trường hợp nhỏ') + '. Hình phải chuyển động theo lời (ít nhất 2 hành động).\n' +
    'PHẦN 3 - LỖI SAI THƯỜNG GẶP: (4) bay: cách làm sai mà học sinh hay mắc, cho thấy nó sai ở đâu (rung + loai_bo) và VÌ SAO sai.\n' +
    'PHẦN 4 - GIẢI: (5) nhac_lai (nếu cần): kiến thức/công thức sẽ dùng, ý nghĩa bằng lời thường; (6) diem_chot: ý then chốt và vì sao đúng; (7)-(8) tinh_toan: TỪNG BƯỚC, mỗi cảnh 1-2 bước, mọi con số hiện trên màn hình; (9) dap_an: ' + (tt ? 'quay lại cảnh thật 3D với kích thước đúng đáp số + so_dem kieu "vien"' : 'đáp án lớn, rõ (dong_ho_do hoặc so_dem)') + '.\n' +
    'PHẦN 5 - THỬ LẠI: (10) kiem_tra: THẾ NGƯỢC đáp án vào đề (hoặc cách thứ hai / mô phỏng / trường hợp đặc biệt) để chứng minh đáp án đúng, nói rõ "thử lại".\n' +
    'PHẦN 6 - CHỐT KIẾN THỨC: (11) bai_hoc: 2-3 điều rút ra (danh_sach), dấu hiệu nhận ra dạng bài, một chỗ dùng ngoài đời, một câu hỏi biến thể cho người xem tự luyện.\n' +
    'Trả thêm "de_cho": mảng 2-5 dữ kiện của đề, mỗi cái ≤ 60 ký tự, đủ MỌI con số của đề (ví dụ "Tầng trên cùng: 3 ống", "Mỗi tầng dưới hơn 1 ống", "Tổng 260 ống"); ' +
    '"can_tim": điều đề hỏi, ≤ 80 ký tự (ví dụ "Xếp được bao nhiêu tầng? Dư bao nhiêu ống?"). Viết chữ thường, công thức ngắn thì dùng LaTeX.\n';
}
