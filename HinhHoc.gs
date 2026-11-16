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
// mỗi lần sinh đề hình học xen kẽ PHẲNG / KHÔNG GIAN (lớp 10 chủ yếu phẳng)
function chonKieuHinh_(lop) {
  var p = PropertiesService.getScriptProperties();
  var k = Number(p.getProperty('HH_KE') || 0);
  p.setProperty('HH_KE', String(k + 1));
  if (String(lop) === '10') return k % 3 === 2 ? 'KHONG_GIAN' : 'PHANG';
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
    'Phạm vi: ' + chuongTrinhHinh_(lop) + '.\n' +
    'Hãy SÁNG TÁC ' + n + ' bài mới (ưu tiên bài CHỨNG MINH khó, xen kẽ bài tính).\n' + (kieu === 'KHONG_GIAN' ? YEU_CAU_KHONG_GIAN_ : YEU_CAU_PHANG_) +
    'THANG ĐIỂM "diem_tu_duy": 10 = cần một ý tưởng then chốt đẹp (đường phụ, góc nội tiếp, đồng dạng khéo...); 8-9 = nhiều bước suy luận, có bẫy; dưới 8 = áp dụng công thức. CHỈ ra đề từ 8 điểm.\n' +
    'YÊU CẦU:\n' + YEU_CAU_DE_HINH_ + (typeof yeuCauDapAnChinhXac_ === 'function' ? yeuCauDapAnChinhXac_('THUC_TE') : '') +
    '- "dang" là một trong: ' + DANG_HINH_ + '.\n- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Trả về MỘT mảng JSON, mỗi phần tử: {"dang":"","loai":"tinh|chung_minh","chu_de":"","de_bai":"","menh_de":"","dap_an":"(bài tính) con số","diem_tu_duy":1-10,"y_tuong_then_chot":"","yeu_to_tu_duy":"","bay_thuong_gap":""}. Có thể dùng LaTeX trong $...$.';
}
function promptTimHinhHoc_(lop, n, daCo) {
  var kieu = chonKieuHinh_(lop);
  return 'Hãy dùng Google Search để TÌM TRÊN INTERNET ' + (n + 2) + ' bài ' + (kieu === 'KHONG_GIAN' ? 'HÌNH HỌC KHÔNG GIAN' : 'HÌNH HỌC PHẲNG') + ' DẠNG KHÓ CÓ THẬT (đề thi vào lớp 10 chuyên, đề học sinh giỏi, câu hình cuối đề thi THPT, bài chứng minh khó) cho học sinh lớp ' + lop + ' (Việt Nam). ' +
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

// Mã dựng hình bằng tọa độ: dùng cho cả kiểm chứng và lấy tọa độ vẽ hình.
var HUONG_DAN_MA_HINH_ = 'Viết MỘT hàm JavaScript thuần tên kiemChung() (không thư viện, không gọi mạng), DỰNG HÌNH BẰNG TỌA ĐỘ trực tiếp từ ĐỀ BÀI (không dựa vào lời giải). ' +
  'Hình PHẲNG: điểm [x,y]; tự viết hàm giao 2 đường thẳng, giao đường thẳng - đường tròn, giao 2 đường tròn, trung điểm, chân đường vuông góc, tâm đường tròn ngoại tiếp, phân giác, quay điểm. ' +
  'Hình KHÔNG GIAN: điểm [x,y,z] (đặt đáy trên mặt z = 0, chiều cao theo trục z); tự viết hàm tích vô hướng, tích có hướng, phương trình mặt phẳng, hình chiếu điểm lên mặt phẳng / đường thẳng, ' +
  'khoảng cách điểm - mặt phẳng, khoảng cách hai đường chéo nhau, góc đường thẳng - mặt phẳng, góc hai mặt phẳng, thể tích (|tích hỗn tạp|/6). ' +
  'Đề có dữ kiện tự do (tam giác bất kỳ, điểm M bất kỳ, hình chóp bất kỳ...) thì sinh tham số NGẪU NHIÊN hợp lệ (đúng mọi điều kiện của đề; dùng Math.random). ' +
  'Mọi vòng lặp phải dừng, tổng không quá 200000 phép tính. ';
var DANG_TRA_HINH_ = '"hinh": {"diem":{"A":[x,y] hoặc [x,y,z],...} tọa độ CÁC điểm có tên trong đề của MỘT cấu hình đẹp, dễ nhìn (không quá dẹt, các điểm không sát nhau), ' +
  '"canh":[["A","B"],...] các đoạn thẳng của hình, "khuat":[["A","D"]] (CHỈ hình không gian) các cạnh BỊ KHUẤT khi nhìn từ phía trước-trên-bên phải (vẽ nét đứt như sách giáo khoa), ' +
  '"tron":[["O","A"]] đường tròn (tâm, một điểm trên đường tròn) hoặc [["A","B","C"]] (đường tròn qua 3 điểm) - chỉ hình phẳng, "phu":[["A","H"]] các đường kẻ thêm của lời giải}';

function giaiHinhHoc_(r) {
  var t0 = Date.now();
  var loai = loaiDeHinh_(r);
  var de = 'Bài hình học phẳng (lớp ' + r.lop + '):\n' + r.de_bai;
  if (loai === 'tinh') return giaiHinhTinh_(r, de, t0);
  var dinhDang = 'Trình bày chứng minh CHẶT CHẼ: mỗi bước một khẳng định + lý do (định lý, tính chất, dữ kiện nào). Nếu mệnh đề SAI hoặc đề thiếu/mơ hồ (cấu hình khác nhau cho kết luận khác nhau) thì "chung_minh_duoc": false và ghi rõ vào "de_co_van_de". ' +
    'Trả JSON: {"menh_de":"mệnh đề cần chứng minh (ngắn)","y_tuong":"ý then chốt (1-2 câu)","duong_phu":["đường kẻ thêm nếu có"],"cac_buoc":[{"khang_dinh":"","ly_do":""}],"chung_minh_duoc":true|false,"de_co_van_de":""}\n\n';
  var kq3 = goiGeminiSong_([
    { nhiet: 0.2, prompt: 'Bạn là giáo viên chuyên Toán. Chứng minh bài hình học sau bằng phương pháp HÌNH HỌC TỔNG HỢP (góc, tam giác đồng dạng/bằng nhau, đường tròn, đường phụ khéo). ' + dinhDang + de },
    { nhiet: 0.3, prompt: 'Bạn là giáo viên chuyên Toán. Chứng minh bài hình học sau bằng một PHƯƠNG PHÁP KHÁC HẲN hình học tổng hợp: tọa độ, véc tơ, số phức hoặc lượng giác (tính toán đại số chặt chẽ). ' + dinhDang + de },
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
  var tom = 'máy thử ' + (may ? (may.so_cau_hinh || 0) + ' cấu hình, phần dư lớn nhất ' + Number(may.du_max).toExponential(1) : 'không chạy được') + ' | tổng hợp: ' + (cm1 ? 'chứng minh được' : 'không') + ' | cách 2: ' + (cm2 ? 'chứng minh được' : 'không');
  if (!dung || !(cm1 && cm2)) return { dat: false, c1: c1, c2: c2, ly_do: 'Chứng minh chưa được xác nhận (' + tom + ')' };
  c1.hinh_toa_do = chuanHinhToaDo_(may.hinh);
  var menh = String(c1.menh_de || c2.menh_de || '').trim() || 'điều phải chứng minh';
  var vanDe = String(c1.de_co_van_de || c2.de_co_van_de || '').trim();
  return { dat: true, c1: c1, c2: c2, dap_an: 'CM', dap_an_hien: catDapAnHien_('Đã chứng minh: ' + menh, 110),
    mo_ta: 'Chứng minh hình học: ' + tom, de_co_van_de: vanDe.length > 8 ? vanDe.slice(0, 300) : '' };
}

// Bài tính: giải như toán thực tế (2 lời giải + mã tính số dựng hình bằng tọa độ, trọng tài khi lệch) và lấy tọa độ vẽ hình.
function giaiHinhTinh_(r, de, t0) {
  var dinhDang = 'Đáp số cuối là MỘT con số (độ dài / số đo góc theo độ / diện tích / tỉ số). Nếu đề yêu cầu làm tròn thì "gia_tri" là số ĐÃ làm tròn đúng yêu cầu; nếu không thì giữ ít nhất 4 chữ số có nghĩa. ' +
    'Nếu đề thiếu dữ kiện hoặc mơ hồ (nhiều cấu hình cho đáp số khác nhau) thì ghi rõ vào "de_co_van_de". ' +
    'Trả JSON: {"y_tuong":"ý then chốt","duong_phu":["đường kẻ thêm nếu có"],"cac_buoc":["mỗi bước: khẳng định + lý do"],"gia_tri":0,"don_vi":"","dap_an_hien":"câu trả lời ngắn có đơn vị, ví dụ AB = 6 cm","de_co_van_de":""}\n\n';
  var maPrompt = HUONG_DAN_MA_HINH_ + 'Tính đại lượng đề hỏi từ tọa độ (nếu đề có tham số tự do mà đáp số không phụ thuộc tham số thì thử vài cấu hình và trả giá trị chung). ' +
    'Hàm trả về {"kieu":"gia_tri","gia_tri":số_thực,' + DANG_TRA_HINH_ + '}. Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de;
  var kq3 = goiGeminiSong_([
    { nhiet: 0.2, prompt: 'Bạn là giáo viên chuyên Toán. Giải bài hình học sau bằng HÌNH HỌC TỔNG HỢP thật chặt chẽ (đường phụ, đồng dạng, góc nội tiếp, hệ thức lượng...). ' + dinhDang + de },
    { nhiet: 0.4, prompt: 'Bạn là giáo viên chuyên Toán. Giải bài hình học sau bằng phương pháp KHÁC: tọa độ, véc tơ hoặc lượng giác. ' + dinhDang + de },
    { nhiet: 0.1, prompt: maPrompt }
  ]);
  var c1 = kq3[0], c2 = kq3[1], kc = kq3[2];
  nhatKy_('THOI_GIAN', 'Giải hình học (tính) + mã dựng hình (3 yêu cầu Gemini) mất ' + Math.round((Date.now() - t0) / 1000) + ' giây');
  var docTT = function (c) { var x = docSo_(c && c.gia_tri); return isFinite(x) ? x : null; };
  if (docTT(c1) === null && docTT(c2) === null) throw new Error('DAP_AN_KHONG_HOP_LE');
  var tt = trongTai_(r, {
    de: de, dinhDang: dinhDang, c1: c1, c2: c2, kc: kc,
    doc: docTT, bang: function (a, b) { return a !== null && b !== null && khopSo_(a, b); }, chu: vietSo_,
    kiem: function (kq) {
      var gk = docSo_(kq && kq.gia_tri);
      if (!isFinite(gk)) return null;
      return { v: gk, manh: 2, mo: 'Dựng hình bằng tọa độ: ' + vietSo_(gk), khop: function (x) { return khopSo_(gk, x); } };
    },
    promptMa: maPrompt
  });
  if (!tt.dat) return { dat: false, c1: c1, c2: c2, ly_do: tt.ly_do };
  var may = chayMaHinh_(r, kc);
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

// Đổi tọa độ thật -> % khung hình học (0-100, y hướng XUỐNG), giữ tỉ lệ, chừa lề 10%. Tính cả đường tròn vào khung.
// Hình KHÔNG GIAN: chiếu song song kiểu sách giáo khoa (trục sâu y vẽ chéo 35°, thu nhỏ 0,5): X = x + 0,41y; Y = z + 0,29y.
function chieuHinhKhongGian_(h) {
  var co3D = Object.keys(h.diem).some(function (k) { var p = h.diem[k]; return Array.isArray(p) && p.length >= 3 && isFinite(Number(p[2])); });
  if (!co3D) return h;
  var d = {};
  Object.keys(h.diem).forEach(function (k) {
    var p = h.diem[k];
    if (!Array.isArray(p)) return;
    var x = Number(p[0]) || 0, y = Number(p[1]) || 0, z = Number(p[2]) || 0;
    d[k] = [x + 0.41 * y, z + 0.29 * y];
  });
  return { diem: d, canh: h.canh, khuat: h.khuat, phu: h.phu, tron: [], _kg: true };
}
function chuanHinhToaDo_(h) {
  if (!h || typeof h !== 'object' || !h.diem || typeof h.diem !== 'object') return null;
  h = chieuHinhKhongGian_(h);
  var ten = Object.keys(h.diem).filter(function (k) { var p = h.diem[k]; return Array.isArray(p) && isFinite(Number(p[0])) && isFinite(Number(p[1])); }).slice(0, 20);
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
  var loc = function (ds, n) { return (Array.isArray(ds) ? ds : []).filter(function (c) { return Array.isArray(c) && c.length >= n && c.slice(0, n).every(function (x) { return diem[x]; }); }).slice(0, 16); };
  var khuat = loc(h.khuat, 2).map(function (c) { return [c[0], c[1]]; });
  var laKhuat = function (c) { return khuat.some(function (k) { return (k[0] === c[0] && k[1] === c[1]) || (k[0] === c[1] && k[1] === c[0]); }); };
  return { diem: diem, canh: loc(h.canh, 2).map(function (c) { return [c[0], c[1]]; }).filter(function (c) { return !laKhuat(c); }), khuat: khuat, tron: tron,
    phu: loc(h.phu, 2).map(function (c) { return [c[0], c[1]]; }), khong_gian: !!h._kg };
}

// Kịch bản hình học: mọi hinh_hoc dùng TỌA ĐỘ ĐÚNG từ mã dựng hình (giữ cạnh/góc/nhãn kịch bản viết; thêm cạnh, đường tròn còn thiếu ở cảnh đầu).
function chenToaDoHinh_(kb, hinh) {
  if (!hinh || !hinh.diem || !kb || !Array.isArray(kb.canh)) return [];
  var sua = [];
  kb.canh.forEach(function (c, i) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    (du && Array.isArray(du.vat) ? du.vat : []).forEach(function (v) {
      if (!v || v.loai !== 'hinh_hoc' || !v.diem || typeof v.diem !== 'object') return;
      var doi = 0;
      Object.keys(v.diem).forEach(function (n) { if (hinh.diem[n]) { v.diem[n] = hinh.diem[n].slice(); doi++; } });
      // điểm kịch bản tự đặt mà mã dựng hình không có: giữ nguyên (thường là điểm phụ)
      if (!doi) return;
      Object.keys(hinh.diem).forEach(function (n) { if (!v.diem[n]) v.diem[n] = hinh.diem[n].slice(); });
      if (!Array.isArray(v.canh) || !v.canh.length) v.canh = hinh.canh.map(function (x) { return [x[0], x[1], '']; });
      if (!Array.isArray(v.tron) && hinh.tron.length) v.tron = hinh.tron.map(function (x) { return x.slice(); });
      if (hinh.khuat && hinh.khuat.length) {   // hình không gian: cạnh khuất vẽ nét đứt, không vẽ thành cạnh liền
        v.khuat = hinh.khuat.map(function (x) { return x.slice(); });
        v.canh = (v.canh || []).filter(function (c) { return !hinh.khuat.some(function (k) { return (k[0] === c[0] && k[1] === c[1]) || (k[0] === c[1] && k[1] === c[0]); }); });
      }
      sua.push('cảnh ' + (i + 1) + ': hình học dùng tọa độ dựng hình đúng (' + doi + ' điểm)');
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

// Lời nhắc riêng khi viết kịch bản bài hình học (chèn vào prompt kịch bản)
function huongDanKichBanHinh_(r) {
  if (!laMonHinhHoc_(r)) return '';
  var c1 = {};
  try { c1 = JSON.parse(String(r.cach_1 || '{}')) || {}; } catch (e) { c1 = {}; }
  var hinh = c1.hinh_toa_do;
  var cm = String(r.dap_an) === 'CM';
  return 'VIDEO HÌNH HỌC ' + (cm ? 'CHỨNG MINH' : 'TÍNH TOÁN') + ' (dạng khó):\n' +
    '- Hình chính vẽ bằng hinh_hoc (diem, canh, goc, vuong, to, "tron": đường tròn [tâm, điểm] hoặc [A,B,C], "phu": đường kẻ thêm (nét đứt vàng, hiện sau), "bang": vạch cạnh bằng nhau [A,B,số vạch], "khuat": cạnh khuất của hình không gian (nét đứt)).' +
    (hinh && hinh.khong_gian ? ' ĐÂY LÀ HÌNH KHÔNG GIAN: máy đã chiếu sẵn hình như sách giáo khoa, cạnh khuất nét đứt; dùng to (tô mặt) để làm nổi mặt phẳng đang xét, phu cho đường cao / hình chiếu.' : '') +
    (hinh ? ' DÙNG ĐÚNG TÊN ĐIỂM sau (máy sẽ tự thay tọa độ đúng tỉ lệ từ mô hình dựng hình): ' + Object.keys(hinh.diem).join(', ') + (hinh.tron.length ? '; đường tròn: ' + JSON.stringify(hinh.tron) : '') + (hinh.phu.length ? '; đường phụ: ' + JSON.stringify(hinh.phu) : '') + '.' : '') + '\n' +
    '- MỘT hình xuyên suốt (giu_san_khau): cảnh đề bài dựng hình từng bước theo đúng thứ tự đề nêu; cảnh ý tưởng kẻ đường phụ ("phu"); mỗi cảnh giải tô sáng (chon theo chỉ số cạnh) đúng các cạnh/góc đang nói và ghi lý do (định lý) trên màn hình.\n' +
    '- VIDEO NÀY DỰNG BẰNG MANIM (kiểu video hình học trên mạng: nền đen, mỗi đại lượng một màu, công thức tô cùng màu với cạnh/góc trên hình, phần đang xét sáng lên, phần khác mờ đi). Để máy tô màu và làm nổi ĐÚNG chỗ, viết công thức theo quy ước:\n' +
    '  + đoạn thẳng viết liền tên 2 điểm (ME, BC), góc viết \\angle ABC hoặc \\widehat{ABC}, tam giác viết \\triangle ABC, mặt phẳng viết (SAC), đường tròn viết (O). KHÔNG viết "góc" / "tam giác" bằng chữ trong công thức.\n' +
    '  + \\hl{...} = khung vàng quanh phần ĐANG XÉT của dòng (vd "\\hl{\\angle BEC} = 90^\\circ"), mỗi dòng tối đa 1 \\hl. Dòng kết luận cuối dùng \\dpcm hoặc \\blacksquare.\n' +
    '  + mỗi cảnh có thể thêm "nhan_manh_hinh": danh sách phần hình cần làm nổi trong cảnh đó (vd ["\\triangle BEC","EM","\\angle BEC"]); hai tam giác được so sánh (bằng nhau / đồng dạng) thêm "tach": ["ABC","DEF"] để máy tách hai tam giác ra đặt cạnh nhau.\n' +
    '  + "trinh_bay": "bien_doi" khi các dòng là MỘT đẳng thức biến đổi dần (dòng sau biến hình từ dòng trước), "cong_don" khi là các ý nối tiếp.\n' +
    '- HƯỚNG DẪN CHI TIẾT, MỖI CẢNH MỘT Ý: không dồn nhiều bước vào một cảnh. Mỗi bước giải = 1 cảnh gồm:\n' +
    '  + tieu_de_canh nêu đúng điều đang chứng minh/tính ở bước đó, KHÔNG ghi "Bước 1:" (thanh bước đã có), vd "EM là trung tuyến"; tu_khoa = cụm chính trong tiêu đề, vd "trung tuyến";\n' +
    '  + "kien_thuc": định lý / tính chất / định nghĩa dùng ở bước này, viết như sách giáo khoa, ≤ 90 ký tự (vd "Trong tam giác vuông, trung tuyến ứng với cạnh huyền bằng nửa cạnh huyền") - hiện thành thẻ KIẾN THỨC trên video;\n' +
    '  + 1-3 dòng công thức (khẳng định + lý do \\text{(vì ...)} ngắn);\n' +
    '  + lời thoại GIẢNG như thầy cô: chỉ thẳng vào hình ("nhìn tam giác BEC đang tô màu..."), nói rõ ta dùng kiến thức gì, vì sao áp dụng được ở đây (điều kiện của định lý đã thỏa ra sao), rồi mới nêu kết quả.\n' +
    (cm ? '- Bài CHỨNG MINH: tối thiểu 4 cảnh giải; mỗi bước một khẳng định + "vì ..." (định lý/tính chất); cảnh đáp án chốt mệnh đề + \\dpcm. Cảnh THỬ LẠI: đo bằng số trên một cấu hình cụ thể (vd "AM \\approx 3{,}42,\\; AN \\approx 3{,}42 \\checkmark") để người xem thấy mệnh đề đúng.\n'
      : '- Bài TÍNH: cảnh thử lại kiểm bằng cách thứ hai (tọa độ/hệ thức khác) với số cụ thể.\n') +
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
    if (String(c.kien_thuc || '').trim().length < 12) nhe.push('BUOC_THIEU_KIEN_THUC_CANH_' + (j + 1) + ': thêm "kien_thuc": định lý / tính chất dùng ở bước này (hiện thành thẻ KIẾN THỨC), lời thoại giải thích vì sao áp dụng được.');
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
