/**
 * ============================================================
 * HÌNH HỌC KHÓ (dán thành tệp mới HinhHoc.gs, cùng dự án): GIẢI + CHỨNG MINH bài hình học phẳng dạng khó
 * (đề thi vào lớp 10 chuyên, học sinh giỏi, câu vận dụng cao), làm video như các môn khác.
 *
 * - Hai loại đề: "tinh" (đáp số là MỘT con số: độ dài, góc, diện tích, tỉ số) và "chung_minh" (một mệnh đề cụ thể:
 *   bằng nhau, vuông góc, song song, thẳng hàng, đồng quy, 4 điểm cùng thuộc đường tròn, tiếp tuyến, đẳng thức độ dài...).
 * - KIỂM CHỨNG BẰNG MÁY (không tin lời AI): Gemini viết mã JavaScript DỰNG HÌNH BẰNG TỌA ĐỘ trực tiếp từ đề
 *   (giao điểm, trung điểm, chân đường cao, đường tròn...).
 *     + bài tính: máy tính ra đáp số, phải khớp hai lời giải độc lập (như toán thực tế);
 *     + bài chứng minh: máy thử mệnh đề ở NHIỀU cấu hình ngẫu nhiên (≥ 5), mệnh đề phải đúng ở mọi cấu hình (sai số ~0),
 *       đồng thời hai cách chứng minh độc lập (tổng hợp + tọa độ/véc tơ/lượng giác) đều chứng minh được. Sai ở một cấu hình
 *       = đề sai/mơ hồ -> sửa đề hoặc xóa (giống đề lệch đáp án).
 * - HÌNH ĐÚNG TỈ LỆ: chính mã dựng hình trả về tọa độ các điểm của một cấu hình đẹp; hệ thống thay tọa độ này vào mọi hình
 *   hinh_hoc trong kịch bản (AI không phải tự đoán tọa độ -> hình không bao giờ sai/méo).
 * Cấu hình (CAU_HINH): HINH_HOC_KHO = BAT|TAT (mặc định BAT: xen kẽ xác suất -> thực tế -> hình học).
 * ============================================================
 */

function laMonHinhHoc_(r) { return String((r && r.mon) || '').toUpperCase() === 'HINH_HOC'; }
function batHinhHoc_() { return String(cauHinh_('HINH_HOC_KHO') || 'BAT').toUpperCase() !== 'TAT'; }
var CHUONG_TRINH_HINH_HOC = {
  '10': 'hình học phẳng THCS nâng cao + lớp 10: tam giác đồng dạng, hệ thức lượng (định lý sin, cos), đường tròn (góc nội tiếp, tiếp tuyến, tứ giác nội tiếp, phương tích), véc tơ, diện tích',
  '11': 'hình học phẳng nâng cao (phương tích, trục đẳng phương, phép biến hình) VÀ hình học KHÔNG GIAN lớp 11: quan hệ song song, quan hệ vuông góc, góc giữa đường thẳng và mặt phẳng, góc giữa hai mặt phẳng, khoảng cách (điểm - mặt, hai đường chéo nhau), thiết diện',
  '12': 'hình học KHÔNG GIAN: thể tích khối chóp, khối lăng trụ, khối hộp; khoảng cách, góc trong không gian; mặt cầu ngoại tiếp; tọa độ Oxyz; và hình học phẳng nâng cao'
};
// mỗi lần sinh đề hình học xen kẽ PHẲNG / KHÔNG GIAN (lớp 10 chỉ học PHẲNG theo GDPT 2018)
function chonKieuHinh_(lop) {
  if (String(lop) === '10') return 'PHANG';
  var p = PropertiesService.getScriptProperties();
  var k = Number(p.getProperty('HH_KE') || 0);
  p.setProperty('HH_KE', String(k + 1));
  return k % 2 ? 'KHONG_GIAN' : 'PHANG';
}
function chuongTrinhHinh_(lop) { return CHUONG_TRINH_HINH_HOC[String(lop)] || CHUONG_TRINH_HINH_HOC['10']; }

var YEU_CAU_DE_HINH_ = '- Dựng được bằng TỌA ĐỘ (phẳng: Oxy; không gian: Oxyz). Đề tự đủ bằng chữ: nêu rõ cách dựng từng điểm (giao của..., trung điểm của..., chân đường vuông góc từ ... xuống ..., hình chiếu của ... lên mặt phẳng ...), độ dài/góc cụ thể khi cần.\n' +
  '- "loai" = "tinh": hỏi đúng MỘT đại lượng, đáp số là MỘT con số (độ dài, khoảng cách, số đo góc theo độ, diện tích, thể tích, tỉ số).\n' +
  '- "loai" = "chung_minh": đúng MỘT mệnh đề cần chứng minh, kiểm được bằng tọa độ (bằng nhau, vuông góc, song song, thẳng hàng, đồng quy, đồng phẳng, 4 điểm cùng thuộc một đường tròn / mặt cầu, ' +
  'tiếp tuyến, đẳng thức độ dài/tỉ số, đường thẳng vuông góc mặt phẳng, hai mặt phẳng vuông góc). Ghi mệnh đề vào "menh_de". Không hỏi nhiều ý a), b), c).\n' +
  '- ĐỘ KHÓ: bài mà học sinh khá cũng thấy khó - cần một Ý TƯỞNG THEN CHỐT (kẻ đường phụ, dựng hình chiếu, góc nội tiếp cùng chắn cung, tam giác đồng dạng khéo, phương tích, đổi đỉnh tính thể tích, quy về hình chiếu...) để có khoảnh khắc "à ra thế".\n' +
  '- Hình vẽ không quá rối: tối đa khoảng 10 điểm có tên, tối đa 2 đường tròn.\n';
var YEU_CAU_KHONG_GIAN_ = '- Đề HÌNH HỌC KHÔNG GIAN: hình chóp (đáy tam giác / vuông / chữ nhật / thoi), lăng trụ đứng / xiên, hình hộp, tứ diện; cho các độ dài, góc, quan hệ vuông góc đủ để dựng tọa độ Oxyz.\n';
var YEU_CAU_PHANG_ = '- Đề HÌNH HỌC PHẲNG thuần túy (không phải hình không gian).\n';
var DANG_HINH_ = 'tam_giac_dong_dang, he_thuc_luong, goc_noi_tiep, tu_giac_noi_tiep, tiep_tuyen_duong_tron, phuong_tich, thang_hang_dong_quy, vuong_goc_song_song, dien_tich_ti_so, cuc_tri_hinh_hoc, ' +
  'kg_the_tich, kg_khoang_cach, kg_goc, kg_vuong_goc, kg_song_song, kg_thiet_dien, kg_mat_cau';

function promptSangTacHinhHoc_(lop, n, daCo, kieuEp) {
  var kieu = kieuEp || chonKieuHinh_(lop);
  return 'Bạn là giáo viên chuyên Toán, ra đề ' + (kieu === 'KHONG_GIAN' ? 'HÌNH HỌC KHÔNG GIAN' : 'HÌNH HỌC PHẲNG') + ' DẠNG KHÓ (đề thi vào lớp 10 chuyên, học sinh giỏi, câu vận dụng cao, bài chứng minh làm khó học sinh) cho học sinh lớp ' + lop + ' (Việt Nam).\n' +
    'Phạm vi: ' + chuongTrinhHinh_(lop) + '.\n' + (typeof yeuCauKienThucLop_ === 'function' ? yeuCauKienThucLop_(lop, 'HINH_HOC') + '\n' : '') +
    'Hãy SÁNG TÁC ' + n + ' bài mới (ưu tiên bài CHỨNG MINH khó, xen kẽ bài tính).\n' + (kieu === 'KHONG_GIAN' ? YEU_CAU_KHONG_GIAN_ : YEU_CAU_PHANG_) +
    'THANG ĐIỂM "diem_tu_duy": 10 = cần một ý tưởng then chốt đẹp (đường phụ, góc nội tiếp, đồng dạng khéo...); 8-9 = nhiều bước suy luận, có bẫy; dưới 8 = áp dụng công thức. CHỈ ra đề từ 8 điểm.\n' +
    'YÊU CẦU:\n' + YEU_CAU_DE_HINH_ + (typeof yeuCauDapAnChinhXac_ === 'function' ? yeuCauDapAnChinhXac_('THUC_TE') : '') +
    '- "dang" là một trong: ' + DANG_HINH_ + '.\n- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Trả về MỘT mảng JSON, mỗi phần tử: {"dang":"","loai":"tinh|chung_minh","chu_de":"","de_bai":"","menh_de":"","dap_an":"(bài tính) con số","diem_tu_duy":1-10,"y_tuong_then_chot":"","yeu_to_tu_duy":"","bay_thuong_gap":""}. Có thể dùng LaTeX trong $...$.';
}
function promptTimHinhHoc_(lop, n, daCo) {
  var kieu = chonKieuHinh_(lop);
  return 'Hãy dùng Google Search để TÌM TRÊN INTERNET ' + (n + 2) + ' bài ' + (kieu === 'KHONG_GIAN' ? 'HÌNH HỌC KHÔNG GIAN' : 'HÌNH HỌC PHẲNG') + ' DẠNG KHÓ CÓ THẬT (đề thi vào lớp 10 chuyên, đề học sinh giỏi, câu hình cuối đề thi THPT, bài chứng minh khó) cho học sinh lớp ' + lop + ' (Việt Nam).\n' +
    (typeof yeuCauKienThucLop_ === 'function' ? yeuCauKienThucLop_(lop, 'HINH_HOC') + '\n' : '') +
    (kieu === 'KHONG_GIAN' ? YEU_CAU_KHONG_GIAN_ : YEU_CAU_PHANG_) +
    'Nguồn: toanmath.com, thuvienhoclieu.com, vietjack.com, loigiaihay.vn, đề của các sở/trường chuyên.\n' +
    'Đề có nhiều ý a), b), c) thì CHỈ giữ MỘT ý hay nhất (thường là ý cuối) và viết lại thành đề tự đủ (nêu đủ cách dựng các điểm cần cho ý đó).\n' +
    'YÊU CẦU:\n' + YEU_CAU_DE_HINH_ + '- "dang" là một trong: ' + DANG_HINH_ + '.\n- Mỗi đề kèm "nguon_url" là trang bạn thực sự tìm thấy. Không chắc thì bỏ; không có đề phù hợp thì trả [].\n' +
    '- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Chỉ trả về MỘT mảng JSON: {"dang":"","loai":"tinh|chung_minh","chu_de":"","de_bai":"","menh_de":"","dap_an":"","diem_tu_duy":1-10,"yeu_to_tu_duy":"","bay_thuong_gap":"","nguon_url":""}';
}
// mọi dạng hình (phẳng / không gian) đều dựng được bằng tọa độ -> chỉ loại khi thiếu hẳn "dang"
function dangHinhDungDuoc_(dang) { return String(dang || '').trim().length > 0; }
function loaiDeHinh_(r) { return /chứng minh|cmr\b|chứng tỏ|hãy chỉ ra rằng/i.test(String(r.de_bai || '')) ? 'chung_minh' : 'tinh'; }
function laHinhKhongGian_(de) { return /hình chóp|lăng trụ|tứ diện|hình hộp|mặt cầu|mặt phẳng|không gian|Oxyz|cạnh bên|mặt bên|đáy là|vuông góc với đáy|vuông góc với mặt/i.test(String(de || '')); }

// Mã dựng hình bằng tọa độ: dùng cho cả kiểm chứng và lấy tọa độ vẽ hình (kể cả các điểm phụ và đường thẳng phụ).
var HUONG_DAN_MA_HINH_ = 'Viết MỘT hàm JavaScript thuần tên kiemChung() (không thư viện, không gọi mạng), DỰNG HÌNH BẰNG TỌA ĐỘ trực tiếp từ ĐỀ BÀI và dựng thêm CÁC ĐIỂM PHỤ / ĐƯỜNG THẲNG PHỤ cần cho lời giải (chân đường cao, hình chiếu vuông góc, trung điểm, tâm đáy, giao điểm...). ' +
  'Hình PHẲNG: điểm [x,y]; tự viết hàm giao 2 đường thẳng, giao đường thẳng - đường tròn, giao 2 đường tròn, trung điểm, chân đường vuông góc, tâm đường tròn ngoại tiếp, phân giác, quay điểm. ' +
  'Hình KHÔNG GIAN: điểm [x,y,z] (đặt đáy trên mặt z = 0, chiều cao theo trục z; góc khuất phía sau-trái đặt ở y > 0 như A=[0,d,0], các đỉnh phía trước ở y = 0 để phép chiếu sách giáo khoa X = x + 0.41*y, Y = z + 0.29*y nhìn từ phía trước-trên-bên phải thấy rõ mặt trước và che khuất đúng cạnh sau); ' +
  'tự viết hàm tích vô hướng, tích có hướng, phương trình mặt phẳng, hình chiếu điểm lên mặt phẳng / đường thẳng, khoảng cách điểm - mặt phẳng, khoảng cách hai đường chéo nhau, góc đường thẳng - mặt phẳng, góc hai mặt phẳng, thể tích (|tích hỗn tạp|/6). ' +
  'Đề có dữ kiện tự do (tam giác bất kỳ, điểm M bất kỳ, hình chóp bất kỳ...) thì sinh tham số NGẪU NHIÊN hợp lệ (đúng mọi điều kiện của đề; dùng Math.random). ' +
  'Mọi vòng lặp phải dừng, tổng không quá 200000 phép tính. ';
var DANG_TRA_HINH_ = '"hinh": {"diem":{"A":[x,y] hoặc [x,y,z],...} tọa độ TẤT CẢ các điểm có tên trong đề VÀ các điểm phụ (H, M, K, I, O...) của MỘT cấu hình đẹp, dễ nhìn (không quá dẹt, các điểm không sát nhau), ' +
  '"canh":[["A","B"],...] các cạnh NHÌN THẤY của hình (vẽ nét liền), "khuat":[["A","D"],...] (CHỈ hình không gian) các cạnh BỊ CHE KHUẤT nằm phía sau hoặc bên trong khối khi nhìn từ phía trước (vẽ nét đứt chuẩn hình học không gian), ' +
  '"mat":[["S","A","B"],["A","B","C","D"],...] (CHỈ hình không gian) danh sách các mặt của khối đa diện để máy kiểm tra che khuất 3D, ' +
  '"tron":[["O","A"]] đường tròn (tâm, một điểm trên đường tròn) hoặc [["A","B","C"]] (đường tròn qua 3 điểm) - chỉ hình phẳng, ' +
  '"phu":[["A","H"],...] các ĐƯỜNG THẲNG PHỤ kẻ thêm để phục vụ bài toán (đường cao, đường trung tuyến, hình chiếu, đoạn nối phụ...)}';

function giaiHinhHoc_(r) {
  var t0 = Date.now();
  var loai = loaiDeHinh_(r);
  var kg = laHinhKhongGian_(r.de_bai);
  var lopC = typeof chuanLop_ === 'function' ? chuanLop_(r.lop) : String(r.lop || '');
  var luuY = typeof yeuCauKienThucLop_ === 'function' ? yeuCauKienThucLop_(r.lop, 'HINH_HOC') : '';
  var de = 'Bài hình học ' + (kg ? 'KHÔNG GIAN' : 'PHẲNG') + ' (lớp ' + r.lop + '):\n' + r.de_bai;
  var deGiai = de + (luuY ? '\n\n' + luuY : '');
  var phuongPhap2 = !kg ? 'tọa độ Oxy, véc tơ phẳng hoặc lượng giác' : (lopC === '12' ? 'tọa độ Oxyz, véc tơ không gian hoặc lượng giác' : 'véc tơ không gian, lượng giác hoặc hướng hình học tổng hợp khác (KHÔNG gắn hệ tọa độ Oxyz)');
  if (loai === 'tinh') return giaiHinhTinh_(r, de, t0, deGiai, phuongPhap2);
  var dinhDang = 'Trình bày chứng minh CHẶT CHẼ: được phép và khuyến khích KẺ THÊM ĐƯỜNG THẲNG PHỤ (đường cao, hình chiếu, đường song song, trung tuyến...) nếu giúp lời giải sáng sủa; mỗi bước một khẳng định + lý do (định lý, tính chất, dữ kiện nào). Nếu mệnh đề SAI hoặc đề thiếu/mơ hồ (cấu hình khác nhau cho kết luận khác nhau) thì "chung_minh_duoc": false và ghi rõ vào "de_co_van_de". ' +
    'Trả JSON: {"menh_de":"mệnh đề cần chứng minh (ngắn)","y_tuong":"ý then chốt (1-2 câu)","duong_phu":["mô tả đường kẻ thêm nếu có, vd Kẻ AH vuông góc BC tại H"],"cac_buoc":[{"khang_dinh":"","ly_do":""}],"chung_minh_duoc":true|false,"de_co_van_de":""}\n\n';
  var kq3 = goiGeminiSong_([
    { nhiet: 0.2, prompt: 'Bạn là giáo viên chuyên Toán. Chứng minh bài hình học sau bằng phương pháp HÌNH HỌC TỔNG HỢP đúng chương trình lớp ' + (lopC || r.lop) + ' (góc, tam giác đồng dạng/bằng nhau, đường tròn, quan hệ vuông góc/song song không gian, kẻ thêm đường phụ khéo). ' + dinhDang + deGiai },
    { nhiet: 0.3, prompt: 'Bạn là giáo viên chuyên Toán. Chứng minh bài hình học sau đúng chương trình lớp ' + (lopC || r.lop) + ' bằng một PHƯƠNG PHÁP KHÁC HẲN: ' + phuongPhap2 + ' (tính toán chặt chẽ, KHÔNG dùng kiến thức lớp trên hoặc số phức). ' + dinhDang + deGiai },
    { nhiet: 0.1, prompt: HUONG_DAN_MA_HINH_ + 'Thử mệnh đề cần chứng minh ở ÍT NHẤT 6 cấu hình ngẫu nhiên khác nhau; với mỗi cấu hình tính "phần dư" (ví dụ |AM - AN|, |tích vô hướng| của hai véc tơ cần vuông góc, |định thức| khi cần thẳng hàng / đồng phẳng, khoảng cách từ điểm tới mặt phẳng khi cần điểm thuộc mặt phẳng) chia cho kích thước hình. ' +
      'Hàm trả về {"kieu":"chung_minh","so_cau_hinh":số cấu hình đã thử,"du_max":phần dư lớn nhất (số thực),' + DANG_TRA_HINH_ + '}. Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de }
  ]);
  var c1 = kq3[0] || {}, c2 = kq3[1] || {}, kc = kq3[2];
  nhatKy_('THOI_GIAN', 'Chứng minh hình học + mã dựng hình (3 yêu cầu Gemini) mất ' + Math.round((Date.now() - t0) / 1000) + ' giây');
  var may = chayMaHinh_(r, kc);
  var dung = may && may.kieu === 'chung_minh' && Number(may.so_cau_hinh) >= 4 && isFinite(Number(may.du_max)) && Number(may.du_max) < 1e-6;
  // mã đầu chưa chạy được: viết lại một lần
  if (!may) {
    try { may = chayMaHinh_(r, goiGemini_(HUONG_DAN_MA_HINH_ + 'Thử mệnh đề ở ÍT NHẤT 6 cấu hình ngẫu nhiên, trả {"kieu":"chung_minh","so_cau_hinh":n,"du_max":số,' + DANG_TRA_HINH_ + '}. Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de, 0.2, { suyNghi: 'high' })); }
    catch (e) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e.message))) throw e; }
    dung = may && may.kieu === 'chung_minh' && Number(may.so_cau_hinh) >= 4 && Number(may.du_max) < 1e-6;
  }
  var cm1 = c1.chung_minh_duoc === true, cm2 = c2.chung_minh_duoc === true;
  // hai lời chứng minh đều nói ĐƯỢC mà máy thử lại thấy sai: nhiều khả năng mã dựng hình viết sai (không phải đề sai)
  // -> viết lại mã một lần (suy nghĩ kỹ) rồi thử lại, tránh loại oan đề đúng.
  if (!dung && cm1 && cm2) {
    try {
      var may2 = chayMaHinh_(r, goiGemini_(HUONG_DAN_MA_HINH_ + 'Mã thử trước đó cho phần dư lớn (có thể đã dựng sai một điểm). Dựng lại CẨN THẬN từng điểm đúng như đề, tự kiểm từng bước dựng. ' +
        'Thử mệnh đề ở ÍT NHẤT 6 cấu hình ngẫu nhiên, trả {"kieu":"chung_minh","so_cau_hinh":n,"du_max":số,' + DANG_TRA_HINH_ + '}. Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de, 0.2, { suyNghi: 'high' }));
      if (may2 && may2.kieu === 'chung_minh' && Number(may2.so_cau_hinh) >= 4 && Number(may2.du_max) < 1e-6) { may = may2; dung = true; }
    } catch (e2) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e2.message))) throw e2; }
  }
  var tom = 'máy thử ' + (may ? (may.so_cau_hinh || 0) + ' cấu hình, phần dư lớn nhất ' + Number(may.du_max).toExponential(1) : 'không chạy được') + ' | tổng hợp: ' + (cm1 ? 'chứng minh được' : 'không') + ' | cách 2: ' + (cm2 ? 'chứng minh được' : 'không');
  // MÁY ĐÃ XÁC NHẬN mệnh đề đúng (≥ 4 cấu hình ngẫu nhiên, sai số ~0) là bằng chứng mạnh nhất: chỉ cần MỘT lời chứng minh
  // chặt chẽ là đủ dựng video (trước đây bắt cả hai -> đề đúng vẫn bị loại khi một cách chứng minh bế tắc).
  if (!dung || !(cm1 || cm2)) return { dat: false, c1: c1, c2: c2, ly_do: 'Chứng minh chưa được xác nhận (' + tom + ')' + (!dung && !cm1 && !cm2 ? ' MENH_DE_SAI' : '') };
  var vp1 = cm1 && typeof kiemTraViPhamLop_ === 'function' ? kiemTraViPhamLop_(c1, r.lop, 'HINH_HOC', r.de_bai) : [];
  var vp2 = cm2 && typeof kiemTraViPhamLop_ === 'function' ? kiemTraViPhamLop_(c2, r.lop, 'HINH_HOC', r.de_bai) : [];
  if ((!cm1 || vp1.length) && cm2 && !vp2.length) { var tg = c1; c1 = c2; c2 = tg; vp1 = vp2; }
  else if (cm1 && vp1.length && lopC && typeof goiGemini_ === 'function') {
    nhatKy_('GIAI', r.id + ': chứng minh hình học vi phạm lớp ' + lopC + ' (' + vp1[0] + ') -> viết lại theo đúng chương trình lớp ' + lopC);
    try {
      var cSua = goiGemini_('Bạn là giáo viên Toán lớp ' + lopC + '. Chứng minh lại bài hình học sau CHỈ dùng kiến thức được phép của lớp ' + lopC + ' (KHÔNG dùng phương pháp lớp trên hay số phức; trước đó bị lỗi: ' + vp1.join('; ') + ').\n' + dinhDang + deGiai, 0.2, { suyNghi: 'high' });
      if (cSua && cSua.chung_minh_duoc === true && !kiemTraViPhamLop_(cSua, r.lop, 'HINH_HOC', r.de_bai).length) c1 = cSua;
    } catch (eSuaH) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(eSuaH.message))) throw eSuaH; }
  }
  c1.hinh_toa_do = chuanHinhToaDo_(may.hinh);
  var menh = String(c1.menh_de || c2.menh_de || '').trim() || 'điều phải chứng minh';
  var vanDe = String(c1.de_co_van_de || c2.de_co_van_de || '').trim();
  return { dat: true, c1: c1, c2: c2, dap_an: 'CM', dap_an_hien: catDapAnHien_('Đã chứng minh: ' + menh, 110),
    mo_ta: 'Chứng minh hình học: ' + tom, de_co_van_de: vanDe.length > 8 ? vanDe.slice(0, 300) : '' };
}

// Bài tính: giải như toán thực tế (2 lời giải + mã tính số dựng hình bằng tọa độ, trọng tài khi lệch) và lấy tọa độ vẽ hình.
function giaiHinhTinh_(r, de, t0, deGiai, phuongPhap2) {
  var lopC = typeof chuanLop_ === 'function' ? chuanLop_(r.lop) : String(r.lop || '');
  var deDayDu = deGiai || (de + (typeof yeuCauKienThucLop_ === 'function' ? '\n\n' + yeuCauKienThucLop_(r.lop, 'HINH_HOC') : ''));
  var pp2 = phuongPhap2 || ((!laHinhKhongGian_(r.de_bai) || lopC === '12') ? 'tọa độ, véc tơ hoặc lượng giác' : 'véc tơ không gian, lượng giác hoặc hướng tổng hợp khác (KHÔNG gắn hệ tọa độ Oxyz)');
  var dinhDang = 'Đáp số cuối là MỘT con số (độ dài / số đo góc theo độ / diện tích / thể tích / tỉ số). Được phép KẺ THÊM ĐƯỜNG THẲNG PHỤ (đường cao, hình chiếu, trung tuyến...) để tính toán. Nếu đề yêu cầu làm tròn thì "gia_tri" là số ĐÃ làm tròn đúng yêu cầu; nếu không thì giữ ít nhất 4 chữ số có nghĩa. ' +
    'Nếu đề thiếu dữ kiện hoặc mơ hồ (nhiều cấu hình cho đáp số khác nhau) thì ghi rõ vào "de_co_van_de". ' +
    'Trả JSON: {"y_tuong":"ý then chốt","duong_phu":["đường kẻ thêm nếu có"],"cac_buoc":["mỗi bước: khẳng định + lý do"],"gia_tri":0,"don_vi":"","dap_an_hien":"câu trả lời ngắn có đơn vị, ví dụ AB = 6 cm","de_co_van_de":""}\n\n';
  var maPrompt = HUONG_DAN_MA_HINH_ + 'Tính đại lượng đề hỏi từ tọa độ (nếu đề có tham số tự do mà đáp số không phụ thuộc tham số thì thử vài cấu hình và trả giá trị chung). ' +
    'Hàm trả về {"kieu":"gia_tri","gia_tri":số_thực,' + DANG_TRA_HINH_ + '}. Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de;
  var kq3 = goiGeminiSong_([
    { nhiet: 0.2, prompt: 'Bạn là giáo viên chuyên Toán. Giải bài hình học sau bằng HÌNH HỌC TỔNG HỢP đúng chương trình lớp ' + (lopC || r.lop) + ' thật chặt chẽ (kẻ thêm đường phụ, đồng dạng, góc nội tiếp, hệ thức lượng, hình chiếu không gian...). ' + dinhDang + deDayDu },
    { nhiet: 0.4, prompt: 'Bạn là giáo viên chuyên Toán. Giải bài hình học sau đúng chương trình lớp ' + (lopC || r.lop) + ' bằng phương pháp KHÁC: ' + pp2 + '. ' + dinhDang + deDayDu },
    { nhiet: 0.1, prompt: maPrompt }
  ]);
  var c1 = kq3[0], c2 = kq3[1], kc = kq3[2];
  nhatKy_('THOI_GIAN', 'Giải hình học (tính) + mã dựng hình (3 yêu cầu Gemini) mất ' + Math.round((Date.now() - t0) / 1000) + ' giây');
  var docTT = function (c) { var x = docSo_(c && c.gia_tri); return isFinite(x) ? x : null; };
  if (docTT(c1) === null && docTT(c2) === null) throw new Error('DAP_AN_KHONG_HOP_LE');
  var tt = trongTai_(r, {
    de: deDayDu, dinhDang: dinhDang, c1: c1, c2: c2, kc: kc,
    doc: docTT, bang: function (a, b) { return a !== null && b !== null && khopSo_(a, b); }, chu: vietSo_,
    kiem: function (kq) {
      var gk = docSo_(kq && kq.gia_tri);
      if (!isFinite(gk)) return null;
      return { v: gk, manh: 2, mo: 'Dựng hình bằng tọa độ: ' + vietSo_(gk), khop: function (x) { return khopSo_(gk, x); } };
    },
    promptMa: maPrompt
  });
  if (!tt.dat) return { dat: false, c1: c1, c2: c2, ly_do: tt.ly_do };
  var may = chayMaHinh_(r, (tt && tt.kc) || kc);
  c1 = tt.c1; c2 = tt.c2;
  if (c1 && may && may.hinh) c1.hinh_toa_do = chuanHinhToaDo_(may.hinh);
  var dapAn = vietSo_(tt.v);
  var hien = catDapAnHien_(String((c1 && c1.dap_an_hien) || (c2 && c2.dap_an_hien) || '').trim(), 110) || dapAn.replace('.', ',') + (c1 && c1.don_vi ? ' ' + c1.don_vi : '');
  return { dat: true, c1: c1, c2: c2, dap_an: dapAn, dap_an_hien: hien, mo_ta: tt.mo, de_co_van_de: tt.de_co_van_de };
}

function chayMaHinh_(r, kc) {
  if (!kc || !kc.ma) return null;
  try { return chayKiemChung_(kc.ma); }
  catch (e) { nhatKy_('GIAI', r.id + ': mã dựng hình lỗi (' + String(e.message).slice(0, 100) + ')'); return null; }
}

// ============================================================
// PHÂN LOẠI CẠNH NHÌN THẤY (NÉT LIỀN) VÀ CẠNH BỊ KHUẤT (NÉT ĐỨT) TRONG HÌNH HỌC KHÔNG GIAN 3D
// ============================================================
// Phép chiếu song song sách giáo khoa: X = x + 0.41*y, Y = z + 0.29*y.
// Cùng một điểm chiếu 2D (X, Y) trên màn hình ứng với tia nhìn 3D: (x, y, z) = (X - 0.41*y, y, Y - 0.29*y).
// Giá trị y NHỎ HƠN nghĩa là GẦN NGƯỜI XEM HƠN (phía trước); giá trị y LỚN HƠN nghĩa là ở PHÍA SAU (bị che khuất).
// Vector hướng từ vật về mắt người xem: v_cam = (+0.41, -1.0, +0.29).
function phanLoaiCanhKhongGian3D_(diem3D, diem2D, h) {
  var capCanh = function (a, b) { return a < b ? a + '|' + b : b + '|' + a; };
  var dsCanhGoc = [], daCo = {};
  var gomCanh = function (arr) {
    (Array.isArray(arr) ? arr : []).forEach(function (c) {
      if (!Array.isArray(c) || c.length < 2) return;
      var a = String(c[0]), b = String(c[1]);
      if (!diem3D[a] || !diem3D[b] || a === b) return;
      var k = capCanh(a, b);
      if (!daCo[k]) { daCo[k] = true; dsCanhGoc.push([a, b]); }
    });
  };
  gomCanh(h.canh);
  gomCanh(h.khuat);
  if (!dsCanhGoc.length) return { canh: [], khuat: [], phu: h.phu || [] };

  // Tập các đỉnh chính (thuộc các cạnh của khối đa diện)
  var dinhChinh = {};
  dsCanhGoc.forEach(function (c) { dinhChinh[c[0]] = true; dinhChinh[c[1]] = true; });
  var tenDinh = Object.keys(dinhChinh);
  if (tenDinh.length < 4) return { canh: h.canh || [], khuat: h.khuat || [], phu: h.phu || [] };

  // 1) Quy tắc Bao Lồi 2D (2D Silhouette / Convex Hull):
  // Mọi cạnh nằm trên đường viền bao ngoài cùng của hình chiếu 2D BẮT BUỘC là cạnh nhìn thấy (nét liền)!
  var laCanhBien2D = function (a, b) {
    var A = diem2D[a], B = diem2D[b];
    if (!A || !B) return false;
    var dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy);
    if (len < 1e-6) return false;
    var duong = 0, am = 0;
    for (var i = 0; i < tenDinh.length; i++) {
      var k = tenDinh[i];
      if (k === a || k === b) continue;
      var P = diem2D[k];
      var cross = (dx * (P[1] - A[1]) - dy * (P[0] - A[0])) / len;
      if (cross > 1e-4) duong++;
      else if (cross < -1e-4) am++;
      if (duong > 0 && am > 0) return false;
    }
    return true;
  };

  // 2) Dựng danh sách các mặt phẳng của khối đa diện 3D (từ h.mat + tự nhận diện mặt đáy và các mặt tam giác/tứ giác)
  var dsMat = [];
  var daCoMat = {};
  var themMat = function (ds) {
    if (!Array.isArray(ds) || ds.length < 3) return;
    var hop = ds.map(String).filter(function (k) { return !!diem3D[k]; });
    if (hop.length < 3) return;
    var khoa = hop.slice().sort().join('|');
    if (daCoMat[khoa]) return;
    daCoMat[khoa] = true;
    dsMat.push(hop);
  };
  if (Array.isArray(h.mat)) h.mat.forEach(themMat);

  // Tự động nhận diện mặt đáy (các đỉnh có cùng z_min) và các mặt bên (3-cycles hoặc nối đỉnh chóp với cạnh đáy)
  var zMin = Infinity, zMax = -Infinity;
  tenDinh.forEach(function (k) {
    var z = diem3D[k][2];
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;
  });
  var dinhDay = tenDinh.filter(function (k) { return Math.abs(diem3D[k][2] - zMin) <= Math.max(1e-3, (zMax - zMin) * 0.05); });
  if (dinhDay.length >= 3) {
    var cx = 0, cy = 0;
    dinhDay.forEach(function (k) { cx += diem3D[k][0]; cy += diem3D[k][1]; });
    cx /= dinhDay.length; cy /= dinhDay.length;
    dinhDay.sort(function (u, v) {
      return Math.atan2(diem3D[u][1] - cy, diem3D[u][0] - cx) - Math.atan2(diem3D[v][1] - cy, diem3D[v][0] - cx);
    });
    themMat(dinhDay);
  }
  // Tìm mọi chu trình 3 đỉnh (mặt tam giác) và 4 đỉnh đồng phẳng tạo bởi các cạnh của khối
  for (var i0 = 0; i0 < tenDinh.length; i0++) {
    for (var i1 = i0 + 1; i1 < tenDinh.length; i1++) {
      var u0 = tenDinh[i0], u1 = tenDinh[i1];
      if (!daCo[capCanh(u0, u1)]) continue;
      for (var i2 = i1 + 1; i2 < tenDinh.length; i2++) {
        var u2 = tenDinh[i2];
        if (!daCo[capCanh(u0, u2)] || !daCo[capCanh(u1, u2)]) continue;
        // Bỏ qua tam giác đường chéo nằm bên trong khối (có đỉnh khác ở cả hai phía mặt phẳng)
        var A0 = diem3D[u0], A1 = diem3D[u1], A2 = diem3D[u2];
        var nx3 = (A1[1] - A0[1]) * (A2[2] - A0[2]) - (A1[2] - A0[2]) * (A2[1] - A0[1]);
        var ny3 = (A1[2] - A0[2]) * (A2[0] - A0[0]) - (A1[0] - A0[0]) * (A2[2] - A0[2]);
        var nz3 = (A1[0] - A0[0]) * (A2[1] - A0[1]) - (A1[1] - A0[1]) * (A2[0] - A0[0]);
        var len3 = Math.hypot(nx3, ny3, nz3) || 1;
        var pos3 = false, neg3 = false;
        tenDinh.forEach(function (dk) {
          if (dk === u0 || dk === u1 || dk === u2) return;
          var Q = diem3D[dk];
          var d3 = (nx3 * (Q[0] - A0[0]) + ny3 * (Q[1] - A0[1]) + nz3 * (Q[2] - A0[2])) / len3;
          if (d3 > 1e-2) pos3 = true;
          else if (d3 < -1e-2) neg3 = true;
        });
        if (!(pos3 && neg3)) themMat([u0, u1, u2]);
      }
    }
  }
  // Với hình lăng trụ / hình hộp: tìm các mặt 4 đỉnh đồng phẳng có 4 cạnh nối thành chu trình
  for (var a0 = 0; a0 < dsCanhGoc.length; a0++) {
    for (var a1 = a0 + 1; a1 < dsCanhGoc.length; a1++) {
      var cA = dsCanhGoc[a0], cB = dsCanhGoc[a1];
      if (cA[0] === cB[0] || cA[0] === cB[1] || cA[1] === cB[0] || cA[1] === cB[1]) continue;
      var q = null;
      if (daCo[capCanh(cA[1], cB[0])] && daCo[capCanh(cB[1], cA[0])]) q = [cA[0], cA[1], cB[0], cB[1]];
      else if (daCo[capCanh(cA[1], cB[1])] && daCo[capCanh(cB[0], cA[0])]) q = [cA[0], cA[1], cB[1], cB[0]];
      if (q) {
        var P0 = diem3D[q[0]], P1 = diem3D[q[1]], P2 = diem3D[q[2]], P3 = diem3D[q[3]];
        var nx = (P1[1] - P0[1]) * (P2[2] - P0[2]) - (P1[2] - P0[2]) * (P2[1] - P0[1]);
        var ny = (P1[2] - P0[2]) * (P2[0] - P0[0]) - (P1[0] - P0[0]) * (P2[2] - P0[2]);
        var nz = (P1[0] - P0[0]) * (P2[1] - P0[1]) - (P1[1] - P0[1]) * (P2[0] - P0[0]);
        var norm = Math.hypot(nx, ny, nz) || 1;
        var dist = Math.abs(nx * (P3[0] - P0[0]) + ny * (P3[1] - P0[1]) + nz * (P3[2] - P0[2])) / norm;
        if (dist < 1e-2) themMat(q);
      }
    }
  }

  // Tâm khối 3D
  var tam3D = [0, 0, 0];
  tenDinh.forEach(function (k) { tam3D[0] += diem3D[k][0]; tam3D[1] += diem3D[k][1]; tam3D[2] += diem3D[k][2]; });
  tam3D[0] /= tenDinh.length; tam3D[1] /= tenDinh.length; tam3D[2] /= tenDinh.length;

  // Vector hướng nhìn từ vật về camera: v_cam = (+0.41, -1.0, +0.29)
  var vCam = [0.41, -1.0, 0.29];
  var thongTinMat = dsMat.map(function (m) {
    var A = diem3D[m[0]], B = diem3D[m[1]], C = diem3D[m[2]];
    var ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
    var vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    var L = Math.hypot(nx, ny, nz) || 1;
    nx /= L; ny /= L; nz /= L;
    // Pháp tuyến hướng ra ngoài khối (tính từ tâm tam3D)
    var dotOut = nx * (A[0] - tam3D[0]) + ny * (A[1] - tam3D[1]) + nz * (A[2] - tam3D[2]);
    if (dotOut < 0) { nx = -nx; ny = -ny; nz = -nz; }
    var dotCam = nx * vCam[0] + ny * vCam[1] + nz * vCam[2];
    // Sắp xếp đỉnh mặt trên 2D theo góc quanh tâm mặt để kiểm tra điểm nằm trong đa giác 2D
    var cx2 = 0, cy2 = 0;
    m.forEach(function (k) { cx2 += diem2D[k][0]; cy2 += diem2D[k][1]; });
    cx2 /= m.length; cy2 /= m.length;
    var dinh2D = m.slice().sort(function (p, q) {
      return Math.atan2(diem2D[p][1] - cy2, diem2D[p][0] - cx2) - Math.atan2(diem2D[q][1] - cy2, diem2D[q][0] - cx2);
    }).map(function (k) { return diem2D[k]; });
    return { dinh: m, n: [nx, ny, nz], A: A, nhinThay: dotCam > 1e-5, dinh2D: dinh2D };
  });

  // Kiểm tra điểm 2D P có nằm trong đa giác lồi poly2D không (kể cả sát biên)
  var trongDaGiac2D = function (P, poly) {
    var duong = 0, am = 0;
    for (var i = 0; i < poly.length; i++) {
      var Q1 = poly[i], Q2 = poly[(i + 1) % poly.length];
      var cr = (Q2[0] - Q1[0]) * (P[1] - Q1[1]) - (Q2[1] - Q1[1]) * (P[0] - Q1[0]);
      if (cr > 1e-4) duong++;
      else if (cr < -1e-4) am++;
      if (duong > 0 && am > 0) return false;
    }
    return true;
  };

  // Kiểm tra một đoạn thẳng [u, v] có bị mặt phẳng nào phía trước che khuất không
  var biMatTruocChe = function (u, v) {
    var P1 = diem3D[u], P2 = diem3D[v];
    if (!P1 || !P2) return false;
    // Thử 3 điểm dọc theo đoạn (0.3, 0.5, 0.7)
    var ts = [0.3, 0.5, 0.7];
    for (var ti = 0; ti < ts.length; ti++) {
      var t = ts[ti];
      var M3 = [P1[0] + (P2[0] - P1[0]) * t, P1[1] + (P2[1] - P1[1]) * t, P1[2] + (P2[2] - P1[2]) * t];
      var M2 = [M3[0] + 0.41 * M3[1], M3[2] + 0.29 * M3[1]];
      for (var f = 0; f < thongTinMat.length; f++) {
        var fm = thongTinMat[f];
        if (fm.dinh.indexOf(u) >= 0 && fm.dinh.indexOf(v) >= 0) continue; // chính mặt chứa cạnh này
        if (!trongDaGiac2D(M2, fm.dinh2D)) continue;
        // Tìm độ sâu y_mat của mặt phẳng fm tại đúng tia nhìn 2D M2 = (X, Y):
        // Điểm trên tia nhìn có tọa độ (M2[0] - 0.41*y, y, M2[1] - 0.29*y).
        // Thay vào phương trình mặt phẳng n . (P(y) - A) = 0:
        var n = fm.n, A = fm.A;
        var heSoY = -0.41 * n[0] + 1.0 * n[1] - 0.29 * n[2]; // = - (n . vCam)
        if (Math.abs(heSoY) < 1e-6) continue;
        var hangSo = n[0] * (M2[0] - A[0]) + n[1] * (0 - A[1]) + n[2] * (M2[1] - A[2]);
        var yMat = -hangSo / heSoY;
        // Nếu mặt phẳng nằm phía trước điểm M3 (yMat < M3[1] - eps) -> đoạn bị mặt này che khuất!
        if (yMat < M3[1] - 1e-3) return true;
      }
    }
    return false;
  };

  var khuatGoc = {};
  (Array.isArray(h.khuat) ? h.khuat : []).forEach(function (c) {
    if (Array.isArray(c) && c.length >= 2) khuatGoc[capCanh(String(c[0]), String(c[1]))] = true;
  });

  var canhMoi = [], khuatMoi = [];
  dsCanhGoc.forEach(function (c) {
    var u = c[0], v = c[1], k = capCanh(u, v);
    // 1. Cạnh nằm trên đường viền bao ngoài 2D: LUÔN NHÌN THẤY (nét liền)
    if (laCanhBien2D(u, v)) {
      canhMoi.push([u, v]);
      return;
    }
    // 2. Nếu bị bất kỳ mặt nào phía trước che khuất theo tia nhìn 3D -> CẠNH KHUẤT (nét đứt)
    if (biMatTruocChe(u, v)) {
      khuatMoi.push([u, v]);
      return;
    }
    // 3. Kiểm tra các mặt chứa cạnh (u, v): nếu thuộc ít nhất 1 mặt nhìn thấy -> nét liền; chỉ thuộc mặt khuất hoặc nằm trong lòng khối -> nét đứt
    var matChua = thongTinMat.filter(function (fm) { return fm.dinh.indexOf(u) >= 0 && fm.dinh.indexOf(v) >= 0; });
    if (matChua.length > 0) {
      var coMatThay = matChua.some(function (fm) { return fm.nhinThay; });
      if (coMatThay) canhMoi.push([u, v]);
      else khuatMoi.push([u, v]);
      return;
    }
    // 4. Đoạn nối bên trong khối (đường chéo đáy, đường cao SH...) hoặc được AI đánh dấu khuất -> nét đứt
    if (khuatGoc[k]) khuatMoi.push([u, v]);
    else canhMoi.push([u, v]);
  });

  return { canh: canhMoi, khuat: khuatMoi, phu: h.phu || [], mat: dsMat };
}

// Đổi tọa độ thật -> % khung hình học (0-100, y hướng XUỐNG), giữ tỉ lệ, chừa lề 10%. Tính cả đường tròn vào khung.
// Hình KHÔNG GIAN: chiếu song song kiểu sách giáo khoa (trục sâu y vẽ chéo 35°, thu nhỏ 0,5): X = x + 0,41y; Y = z + 0,29y,
// đồng thời tự động phân loại chính xác cạnh nhìn thấy (nét liền) và cạnh không nhìn thấy (nét đứt), giữ nguyên diem_3d để xoay 3D trực quan.
function chieuHinhKhongGian_(h) {
  var co3D = Object.keys(h.diem).some(function (k) { var p = h.diem[k]; return Array.isArray(p) && p.length >= 3 && isFinite(Number(p[2])); });
  if (!co3D) return h;
  var d3 = {}, d2 = {};
  Object.keys(h.diem).forEach(function (k) {
    var p = h.diem[k];
    if (!Array.isArray(p)) return;
    var x = Number(p[0]) || 0, y = Number(p[1]) || 0, z = Number(p[2]) || 0;
    d3[k] = [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000, Math.round(z * 1000) / 1000];
    d2[k] = [x + 0.41 * y, z + 0.29 * y];
  });
  var pl = phanLoaiCanhKhongGian3D_(d3, d2, h);
  return { diem: d2, diem_3d: d3, mat: pl.mat || [], canh: pl.canh, khuat: pl.khuat, phu: pl.phu, tron: [], _kg: true };
}
function chuanHinhToaDo_(h) {
  if (!h || typeof h !== 'object' || !h.diem || typeof h.diem !== 'object') return null;
  h = chieuHinhKhongGian_(h);
  var ten = Object.keys(h.diem).filter(function (k) { var p = h.diem[k]; return Array.isArray(p) && isFinite(Number(p[0])) && isFinite(Number(p[1])); }).slice(0, 24);
  if (ten.length < 2) return null;
  var xs = [], ys = [];
  ten.forEach(function (k) { xs.push(Number(h.diem[k][0])); ys.push(Number(h.diem[k][1])); });
  var tron = (Array.isArray(h.tron) ? h.tron : []).filter(function (c) { return Array.isArray(c) && (c.length === 2 || c.length === 3) && c.every(function (k) { return ten.indexOf(k) >= 0; }); }).slice(0, 3);
  tron.forEach(function (c) {
    var P = function (k) { return [Number(h.diem[k][0]), Number(h.diem[k][1])]; };
    var cx, cy, R;
    if (c.length === 2) { cx = P(c[0])[0]; cy = P(c[0])[1]; R = Math.hypot(P(c[1])[0] - cx, P(c[1])[1] - cy); }
    else {
      var A = P(c[0]), B = P(c[1]), C = P(c[2]);
      var d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
      if (Math.abs(d) < 1e-12) return;
      var a2 = A[0] * A[0] + A[1] * A[1], b2 = B[0] * B[0] + B[1] * B[1], c2 = C[0] * C[0] + C[1] * C[1];
      cx = (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d; cy = (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d; R = Math.hypot(A[0] - cx, A[1] - cy);
    }
    xs.push(cx - R, cx + R); ys.push(cy - R, cy + R);
  });
  var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
  var w = maxX - minX || 1, hh = maxY - minY || 1;
  // khung hình học 880x600: giữ đúng tỉ lệ thật
  var k = Math.min(0.8 * 880 / w, 0.8 * 600 / hh);
  var ox = (880 - w * k) / 2, oy = (600 - hh * k) / 2;
  var diem = {};
  ten.forEach(function (n) {
    var x = (Number(h.diem[n][0]) - minX) * k + ox, y = (maxY - Number(h.diem[n][1])) * k + oy;   // lật trục y
    diem[n] = [Math.round(x / 880 * 1000) / 10, Math.round(y / 600 * 1000) / 10];
  });
  var loc = function (ds, n) { return (Array.isArray(ds) ? ds : []).filter(function (c) { return Array.isArray(c) && c.length >= n && c.slice(0, n).every(function (x) { return diem[x]; }); }).slice(0, 20); };
  var khuat = loc(h.khuat, 2).map(function (c) { return [c[0], c[1]]; });
  var laKhuat = function (c) { return khuat.some(function (k) { return (k[0] === c[0] && k[1] === c[1]) || (k[0] === c[1] && k[1] === c[0]); }); };
  var phu = loc(h.phu, 2).map(function (c) { return [c[0], c[1]]; });
  return { diem: diem, diem_3d: h.diem_3d || null, mat: h.mat || [], canh: loc(h.canh, 2).map(function (c) { return [c[0], c[1]]; }).filter(function (c) { return !laKhuat(c); }), khuat: khuat, tron: tron,
    phu: phu, khong_gian: !!h._kg };
}

// Kịch bản hình học: mọi hinh_hoc dùng TỌA ĐỘ ĐÚNG từ mã dựng hình (giữ cạnh/góc/nhãn kịch bản viết; đồng bộ đường thẳng phụ, cạnh khuất/nhìn thấy và tọa độ 3D).
function chenToaDoHinh_(kb, hinh) {
  if (!hinh || !hinh.diem || !kb || !Array.isArray(kb.canh)) return [];
  var sua = [];
  var cungDoan = function (a, b) { return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]); };
  // Đảm bảo cảnh mở đầu / đề bài luôn có đối tượng hinh_hoc để Manim dựng hình 100% (tuyệt đối không để rơi về Remotion)
  var coVatHinh = kb.canh.some(function (c) {
    var vat = c && c.minh_hoa && c.minh_hoa.du_lieu && c.minh_hoa.du_lieu.vat;
    return Array.isArray(vat) && vat.some(function (v) { return v && v.loai === 'hinh_hoc'; });
  });
  if (!coVatHinh && kb.canh[0]) {
    var c0 = kb.canh[0];
    c0.minh_hoa = c0.minh_hoa || { kieu: 'san_khau', du_lieu: { vat: [] } };
    c0.minh_hoa.kieu = 'san_khau';
    c0.minh_hoa.du_lieu = c0.minh_hoa.du_lieu || { vat: [] };
    c0.minh_hoa.du_lieu.vat = [{
      id: 'hh_chinh', loai: 'hinh_hoc', x: 50, y: 50, co: 1,
      diem: JSON.parse(JSON.stringify(hinh.diem)),
      canh: (hinh.canh || []).map(function (x) { return [x[0], x[1], '']; }),
      khuat: (hinh.khuat || []).map(function (x) { return x.slice(); }),
      phu: (hinh.phu || []).map(function (x) { return x.slice(); }),
      tron: (hinh.tron || []).map(function (x) { return x.slice(); })
    }];
    sua.push('tự động gắn mô hình hinh_hoc chuẩn cho Manim ở cảnh 1');
  }
  kb.canh.forEach(function (c, i) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    var loaiCanh = String((c && c.loai) || '');
    var laCanhDe = /^(mo_dau|de_bai|hook)$/.test(loaiCanh);
    if (laCanhDe) c.noi_dung_man_hinh = []; // Video hình học không hiện chữ đề bài lên màn hình (đề bài do giọng đọc đảm nhận)
    (du && Array.isArray(du.vat) ? du.vat : []).forEach(function (v) {
      if (!v || v.loai !== 'hinh_hoc' || !v.diem || typeof v.diem !== 'object') return;
      var doi = 0;
      Object.keys(v.diem).forEach(function (n) { if (hinh.diem[n]) { v.diem[n] = hinh.diem[n].slice(); doi++; } });
      if (!doi && !Object.keys(hinh.diem).length) return;
      Object.keys(hinh.diem).forEach(function (n) { if (!v.diem[n]) v.diem[n] = hinh.diem[n].slice(); });
      if (hinh.diem_3d) v.diem_3d = JSON.parse(JSON.stringify(hinh.diem_3d));
      if (hinh.mat && hinh.mat.length) v.mat = JSON.parse(JSON.stringify(hinh.mat));
      if (hinh.khong_gian) v.khong_gian = true;
      if (!Array.isArray(v.canh) || !v.canh.length) v.canh = hinh.canh.map(function (x) { return [x[0], x[1], '']; });
      if (!Array.isArray(v.tron) && hinh.tron.length) v.tron = hinh.tron.map(function (x) { return x.slice(); });
      if (hinh.khuat && hinh.khuat.length) {   // hình không gian: cạnh khuất vẽ nét đứt, tuyệt đối không vẽ thành cạnh liền
        v.khuat = hinh.khuat.map(function (x) { return x.slice(); });
        v.canh = (v.canh || []).filter(function (ca) { return !hinh.khuat.some(function (k) { return cungDoan(ca, k); }); });
      }
      // Đồng bộ các đường thẳng phụ (phu) cho Manim vẽ thêm khi vào phần mô hình / ý tưởng / giải
      if (hinh.phu && hinh.phu.length) {
        if (laCanhDe) {
          // Ở cảnh đề bài: chưa vẽ đường kẻ phụ thành cạnh liền hoặc nét phụ của đề
          v.phu = [];
          v.canh = (v.canh || []).filter(function (ca) { return !hinh.phu.some(function (p) { return cungDoan(ca, p); }); });
        } else {
          v.phu = Array.isArray(v.phu) ? v.phu : [];
          hinh.phu.forEach(function (p) {
            if (!v.phu.some(function (vp) { return cungDoan(vp, p); })) v.phu.push([p[0], p[1]]);
          });
          v.canh = (v.canh || []).filter(function (ca) { return !v.phu.some(function (p) { return cungDoan(ca, p); }); });
        }
      }
      sua.push('cảnh ' + (i + 1) + ': hình học dùng tọa độ dựng hình chuẩn (' + Object.keys(v.diem).length + ' điểm)');
    });
  });
  return sua;
}

// Cảnh đáp án bài chứng minh: dòng cuối là mệnh đề đã chứng minh + "(đpcm)"; lời thoại chốt "điều phải chứng minh".
function suaDapAnChungMinh_(kb, dapAnHien) {
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return;
  var c = kb.canh[timCanhDapAn_(kb)];
  c.loai = 'dap_an';
  var ds = (c.noi_dung_man_hinh || []).map(String);
  var cuoi = ds.length ? ds[ds.length - 1] : '';
  if (!/đpcm|blacksquare|square|điều phải chứng minh/i.test(cuoi)) {
    var menh = String(dapAnHien || '').replace(/^Đã chứng minh:\s*/i, '').replace(/[{}\\]/g, '').slice(0, 40);
    ds = ds.slice(0, 3).concat(['\\text{' + (menh || 'Điều phải chứng minh') + '}\\;\\blacksquare']);
    c.noi_dung_man_hinh = ds;
  }
  if (!/chứng minh|đpcm/i.test(String(c.loi_thoai || ''))) c.loi_thoai = String(c.loi_thoai || '').replace(/\s+$/, '') + ' Vậy ta đã chứng minh xong.';
  kb.dap_an_cuoi = 'CM';
}

// Đề hình học CHỨNG MINH bị máy bác bỏ (mệnh đề sai / đề mơ hồ): viết lại nhưng GIỮ dạng chứng minh (trước đây bị viết lại
// thành bài tính một con số -> hệ thống gần như không bao giờ ra được video chứng minh). BoPhan1.suaDeChoChinhXac_ gọi hàm này.
function suaDeHinhChungMinh_(r, lyDo) {
  var prompt = 'Bạn là giáo viên chuyên Toán ra đề hình học rất cẩn thận. Đề CHỨNG MINH dưới đây KHÔNG DÙNG ĐƯỢC vì: ' + lyDo + '\n' +
    '(máy dựng hình bằng tọa độ ở nhiều cấu hình ngẫu nhiên thấy mệnh đề KHÔNG đúng, hoặc đề mơ hồ).\n' +
    'ĐỀ CŨ (lớp ' + r.lop + '): ' + r.de_bai + '\n' +
    'Hãy VIẾT LẠI thành một đề CHỨNG MINH ĐÚNG, giữ cùng hình vẽ (cùng cách dựng các điểm) và độ khó:\n' +
    '- Chọn một kết luận CHẮC CHẮN ĐÚNG của hình đó, ưu tiên các kết quả kinh điển đã biết (tứ giác nội tiếp tạo bởi các đường cao, đường thẳng Simson, ' +
    'đường tròn Euler, trực tâm đối xứng qua cạnh nằm trên đường tròn ngoại tiếp, phương tích, tiếp tuyến vuông góc bán kính, hai tam giác đồng dạng cho hệ thức tích, ' +
    'đường thẳng vuông góc mặt phẳng trong hình chóp có cạnh bên vuông góc đáy...).\n' +
    '- Hoặc sửa GIẢ THIẾT (thêm điều kiện còn thiếu) để mệnh đề cũ trở thành đúng.\n' +
    '- Đề tự đủ, nêu rõ cách dựng từng điểm; đúng MỘT mệnh đề cần chứng minh, bắt đầu phần hỏi bằng "Chứng minh".\n' +
    '- Tự kiểm bằng tọa độ ở một cấu hình cụ thể trước khi trả lời. Không chắc chắn đúng thì "chac_chan": false.\n' +
    'Trả JSON: {"de_bai":"đề mới đầy đủ","menh_de":"mệnh đề cần chứng minh","kiem_tra":"thử bằng tọa độ ở một cấu hình","chac_chan":true|false}';
  var j = goiGemini_(prompt, 0.3, { suyNghi: 'high' });
  if (!j || j.chac_chan !== true || String(j.de_bai || '').trim().length < 30 || !/chứng minh/i.test(String(j.de_bai))) return null;
  return { de_bai: String(j.de_bai).trim(), dap_an: 'CM' };
}

// Lời nhắc riêng khi viết kịch bản bài hình học (chèn vào prompt kịch bản)
function huongDanKichBanHinh_(r) {
  if (!laMonHinhHoc_(r)) return '';
  var c1 = {};
  try { c1 = JSON.parse(String(r.cach_1 || '{}')) || {}; } catch (e) { c1 = {}; }
  var hinh = c1.hinh_toa_do;
  var cm = String(r.dap_an) === 'CM';
  return 'VIDEO HÌNH HỌC ' + (cm ? 'CHỨNG MINH' : 'TÍNH TOÁN') + ' (dạng khó):\n' +
    '- Hình chính vẽ bằng hinh_hoc (diem, canh, goc, vuong, to, "tron": đường tròn [tâm, điểm] hoặc [A,B,C], "phu": đường thẳng phụ kẻ thêm để phục vụ bài toán (nét đứt vàng, Manim tự động vẽ dần đúng cảnh được nhắc), "bang": vạch cạnh bằng nhau [A,B,số vạch], "khuat": cạnh không nhìn thấy của hình không gian (nét đứt)).' +
    (hinh && hinh.khong_gian ? ' ĐÂY LÀ HÌNH HỌC KHÔNG GIAN: BẮT BUỘC đảm bảo quy tắc cơ bản: cạnh NHÌN THẤY đặt trong "canh" (vẽ NÉT LIỀN), cạnh KHÔNG NHÌN THẤY (bị che khuất phía sau hoặc nằm trong lòng khối) đặt trong "khuat" (vẽ NÉT ĐỨT); dùng "to" (tô mặt) để làm nổi mặt phẳng đang xét, và "phu" cho đường thẳng phụ kẻ thêm (đường cao, hình chiếu, khoảng cách...).' : '') +
    (hinh ? ' DÙNG ĐÚNG TÊN ĐIỂM sau (máy sẽ tự thay tọa độ đúng tỉ lệ từ mô hình dựng hình): ' + Object.keys(hinh.diem).join(', ') + (hinh.tron.length ? '; đường tròn: ' + JSON.stringify(hinh.tron) : '') + (hinh.khuat && hinh.khuat.length ? '; cạnh khuất (nét đứt): ' + JSON.stringify(hinh.khuat) : '') + (hinh.phu.length ? '; đường thẳng phụ kẻ thêm: ' + JSON.stringify(hinh.phu) : '') + '.' : '') + '\n' +
    '- ĐƯỢC PHÉP VÀ KHUYẾN KHÍCH DÙNG MANIM VẼ THÊM CÁC ĐƯỜNG THẲNG PHỤ ("phu"): ở cảnh ý tưởng / mô hình hóa hoặc bước giải cần kẻ thêm đường phụ (kẻ đường cao, nối hai điểm, kẻ đường song song, dựng hình chiếu vuông góc...), hãy khai báo đoạn thẳng đó vào mảng "phu": [["A","H"],...] của hinh_hoc và nêu rõ trong lời thoại ("Ta kẻ thêm đường phụ AH vuông góc với BC tại H...") + ký hiệu góc vuông vào "vuong": [["A","H","C"]] nếu vuông góc. Manim sẽ tự động diễn hoạt vẽ nét đứt vàng cho đường phụ đúng lúc giọng đọc nhắc tới!\n' +
    '- MỘT hình xuyên suốt (giu_san_khau): ở cảnh đề bài KHÔNG hiện chữ đề bài lên màn hình (noi_dung_man_hinh = []) vì đề bài do giọng đọc đảm nhận và hình vẽ phải hiển thị thật to ở chính giữa màn hình; các điểm và cạnh được Manim vẽ dần theo đúng tiến độ giọng nói; cảnh ý tưởng kẻ thêm đường phụ ("phu"); mỗi cảnh giải dùng Manim làm nổi bật (màu sắc rực rỡ, nét dày, tia sáng chạy dọc cạnh, KHÔNG làm mờ các nét xung quanh) đúng các cạnh/góc đang nói và ghi lý do (định lý) trên màn hình.\n' +
    '- PHẦN TOÁN CỦA VIDEO NÀY BẮT BUỘC DỰNG 100% BẰNG MANIM (tuyệt đối không dùng Remotion để làm nổi bật hình; mỗi đại lượng một màu, công thức tô cùng màu với cạnh/góc trên hình, phần đang xét sáng rực lên mà không làm mờ cảnh xung quanh). Để máy tô màu và làm nổi ĐÚNG chỗ, viết công thức theo quy ước:\n' +
    '  + đoạn thẳng viết liền tên 2 điểm (ME, BC), góc viết \\angle ABC hoặc \\widehat{ABC}, tam giác viết \\triangle ABC, mặt phẳng viết (SAC), đường tròn viết (O). KHÔNG viết "góc" / "tam giác" bằng chữ trong công thức.\n' +
    '  + \\hl{...} = khung vàng quanh phần ĐANG XÉT của dòng (vd "\\hl{\\angle BEC} = 90^\\circ"), mỗi dòng tối đa 1 \\hl. Dòng kết luận cuối dùng \\dpcm hoặc \\blacksquare.\n' +
    '  + mỗi cảnh có thể thêm "nhan_manh_hinh": danh sách phần hình cần làm nổi trong cảnh đó (vd ["\\triangle BEC","EM","\\angle BEC"]); hai tam giác được so sánh (bằng nhau / đồng dạng) thêm "tach": ["ABC","DEF"] để máy tách hai tam giác ra đặt cạnh nhau.\n' +
    '  + "trinh_bay": "bien_doi" khi các dòng là MỘT đẳng thức biến đổi dần (dòng sau biến hình từ dòng trước), "cong_don" khi là các ý nối tiếp.\n' +
    '- HƯỚNG DẪN CHI TIẾT, MỖI CẢNH MỘT Ý: không dồn nhiều bước vào một cảnh. Mỗi bước giải = 1 cảnh gồm:\n' +
    '  + tieu_de_canh nêu đúng điều đang chứng minh/tính ở bước đó, KHÔNG ghi "Bước 1:" (thanh bước đã có), vd "EM là trung tuyến"; tu_khoa = cụm chính trong tiêu đề, vd "trung tuyến";\n' +
    '  + "kien_thuc": định lý / tính chất / định nghĩa dùng ở bước này, viết như sách giáo khoa, ≤ 90 ký tự (vd "Trong tam giác vuông, trung tuyến ứng với cạnh huyền bằng nửa cạnh huyền"). Trường này KHÔNG hiện thành chữ trên màn hình (video hình học tránh ô chữ): GIỌNG ĐỌC phải giảng kiến thức này, còn màn hình thể hiện nó BẰNG HÌNH (phần đang xét sáng lên, cạnh/góc tô màu, số đo ghi cạnh hình);\n' +
    '  + số đo cụ thể viết trong công thức dạng "\\angle ABC = 60^\\circ", "AB = 5" (máy tự ghi số đo lên ngay cạnh góc / đoạn đó trên hình);\n' +
    '  + 1-3 dòng công thức (khẳng định + lý do \\text{(vì ...)} ngắn);\n' +
    '  + lời thoại GIẢNG như thầy cô: chỉ thẳng vào hình ("nhìn tam giác BEC đang tô màu..."), nói rõ ta dùng kiến thức gì, vì sao áp dụng được ở đây (điều kiện của định lý đã thỏa ra sao), rồi mới nêu kết quả.\n' +
    (cm ? '- Bài CHỨNG MINH: tối thiểu 4 cảnh giải; mỗi bước một khẳng định + "vì ..." (định lý/tính chất); cảnh đáp án chốt mệnh đề + \\dpcm. Cảnh THỬ LẠI: đo bằng số trên một cấu hình cụ thể (vd "AM \\approx 3{,}42,\\; AN \\approx 3{,}42 \\checkmark") để người xem thấy mệnh đề đúng.\n'
      : '- Bài TÍNH: cảnh thử lại kiểm bằng cách thứ hai ' + ((laHinhKhongGian_(r.de_bai) && (typeof chuanLop_ !== 'function' || chuanLop_(r.lop) !== '12')) ? '(hệ thức hoặc cách tính tổng hợp khác, KHÔNG gắn Oxyz)' : '(tọa độ/hệ thức khác)') + ' với số cụ thể.\n') +
    (c1.y_tuong ? '- Ý tưởng then chốt đã kiểm chứng: ' + String(c1.y_tuong).slice(0, 300) + '\n' : '') +
    (Array.isArray(c1.cac_buoc) && c1.cac_buoc.length ? '- Lời giải đã kiểm chứng (bám sát, không thêm bước sai): ' + JSON.stringify(c1.cac_buoc).slice(0, 2500) + '\n' : '');
}

// Kiểm tra kịch bản hình học (dựng bằng Manim): bước nào cũng phải có công thức + lý do, chứng minh không quá gọn.
// Trả {nang:[], nhe:[]}; KiemTraHinh.gs gọi khi kb.mon = HINH_HOC.
function kiemTraKichBanManim_(kb) {
  var nang = [], nhe = [];
  if (!kb || !Array.isArray(kb.canh)) return { nang: nang, nhe: nhe };
  var laBuoc = function (c) { return /tinh|giai|chung_minh|buoc|lap_luan|suy_luan/.test(String(c && c.loai)); };
  var buoc = kb.canh.filter(laBuoc);
  if (String(kb.dap_an_cuoi || kb.dap_an) === 'CM' && buoc.length < 3) nhe.push('CHUNG_MINH_QUA_GON: chỉ có ' + buoc.length + ' cảnh giải. Tách lời chứng minh thành ít nhất 4 cảnh, mỗi cảnh MỘT bước (khẳng định + lý do) để người xem theo kịp.');
  kb.canh.forEach(function (c, j) {
    if (!laBuoc(c)) return;
    var ds = (c.noi_dung_man_hinh || []).map(String);
    if (!ds.length) nhe.push('BUOC_THIEU_CONG_THUC_CANH_' + (j + 1) + ': cảnh giải phải có 1-3 dòng công thức (khẳng định của bước này).');
    var chu = ds.join(' ') + ' ' + String(c.loi_thoai || '') + ' ' + String(c.kien_thuc || '');
    if (String(c.kien_thuc || '').trim().length < 12) nhe.push('BUOC_THIEU_KIEN_THUC_CANH_' + (j + 1) + ': thêm "kien_thuc": định lý / tính chất dùng ở bước này; lời thoại phải giảng kiến thức đó và vì sao áp dụng được.');
    if (/^\s*bước\s*\d/i.test(String(c.tieu_de_canh || ''))) nhe.push('TIEU_DE_CO_SO_BUOC_CANH_' + (j + 1) + ': bỏ "Bước N:" khỏi tieu_de_canh (thanh bước đã hiện), tiêu đề chỉ nêu điều đang chứng minh.');
    if (!/vì|do |theo |nên|suy ra|\\Rightarrow|định lý|tính chất/i.test(chu)) nhe.push('BUOC_THIEU_LY_DO_CANH_' + (j + 1) + ': nêu rõ VÌ SAO (định lý / tính chất) ngay trong bước này.');
    if (ds.length && !ds.some(function (d) { return /[A-Z]'?[A-Z]|\\angle|\\widehat|\\triangle|\([A-Z]{3,4}\)/.test(d); })) nhe.push('BUOC_KHONG_CHI_HINH_CANH_' + (j + 1) + ': công thức không nhắc cạnh / góc / tam giác nào trên hình -> máy không làm nổi được chỗ đang xét. Viết bằng tên điểm (ME, \\angle BEC, \\triangle BEC).');
    if (ds.some(function (d) { return /(góc|tam giác)\s*[A-Z]/.test(d.replace(/\\text\{[^}]*\}/g, '')); })) nhe.push('BUOC_GOC_BANG_CHU_CANH_' + (j + 1) + ': trong công thức viết \\angle ABC / \\triangle ABC thay cho chữ "góc" / "tam giác".');
  });
  return { nang: nang, nhe: nhe };
}

// Lệnh Zalo /hinhhoc [phang|khonggian] [10|11|12] [chungminh|tinh]: sáng tác NGAY một đề hình học khó (ưu tiên làm video trước).
function taoDeHinhNgay_(chat, chu) {
  var l = String(chu || '').toLowerCase();
  var kieu = /kh[oô]ng\s*gian|kg\b|khonggian/.test(l) ? 'KHONG_GIAN' : /ph[aă]ng/.test(l) ? 'PHANG' : null;
  var lop = (/\b(10|11|12)\b/.exec(l) || [])[1] || (kieu === 'KHONG_GIAN' ? '11' : '10');
  if (!kieu) kieu = chonKieuHinh_(lop);
  var ycThem = /ch[uứ]ng\s*minh|chungminh/.test(l) ? '\nBẮT BUỘC: "loai" = "chung_minh".' : /\btinh\b|tính/.test(l) ? '\nBẮT BUỘC: "loai" = "tinh".' : '';
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var hang = docHang_(sh);
  var daCo = hang.slice(-30).map(function (r) { return '- ' + String(r.de_bai).slice(0, 90); }).join('\n');
  var kq = goiGemini_(promptSangTacHinhHoc_(lop, 1, daCo, kieu) + ycThem, 0.9, { suyNghi: 'medium' });
  if (kq && !Array.isArray(kq) && Array.isArray(kq.de)) kq = kq.de;
  var d = Array.isArray(kq) ? kq.filter(function (x) { return x && x.de_bai && String(x.de_bai).length > 30; })[0] : null;
  if (!d) return '⚠️ Chưa sáng tác được đề hình học (Gemini không trả đề hợp lệ), thử lại sau ít phút nhé.';
  var id = 'HH' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss') + '-0';
  themHang_(sh, {
    id: id, trang_thai: 'MOI', lop: lop, chu_de: String(d.chu_de || 'Hình học khó').slice(0, 60), de_bai: d.de_bai, nguon: 'AI_SANG_TAC|HINH_' + kieu, mon: 'HINH_HOC',
    diem_tu_duy: d.diem_tu_duy || '', yeu_to_tu_duy: d.yeu_to_tu_duy || d.y_tuong_then_chot || '', bay_thuong_gap: d.bay_thuong_gap || '',
    uu_tien: 1, zalo_chat: chat, so_lan_loi: 0, cap_nhat: new Date(), ma_bam: bam_(d.de_bai), kiem_chung: d.dap_an && d.loai !== 'chung_minh' ? 'DU_KIEN: ' + String(d.dap_an).slice(0, 40) : ''
  });
  if (typeof henUuTien_ === 'function') henUuTien_(20);
  return '📐 Đã sáng tác đề ' + (kieu === 'KHONG_GIAN' ? 'HÌNH KHÔNG GIAN' : 'HÌNH PHẲNG') + ' lớp ' + lop + ' (' + id + ', ' + (d.loai === 'chung_minh' ? 'chứng minh' : 'tính') + '):\n' +
    (typeof latexDoc_ === 'function' ? latexDoc_(String(d.de_bai)) : String(d.de_bai)).slice(0, 400) + '\nĐang giải 2 cách + kiểm chứng bằng tọa độ, rồi viết kịch bản và dựng video (ưu tiên).';
}
