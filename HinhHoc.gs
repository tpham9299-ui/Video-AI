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
  '10': 'hình học phẳng THCS nâng cao + lớp 10: tam giác đồng dạng, hệ thức lượng trong tam giác vuông và tam giác thường (định lý sin, cos), đường tròn (góc nội tiếp, tiếp tuyến, tứ giác nội tiếp, phương tích), véc tơ, diện tích',
  '11': 'hình học phẳng nâng cao: tứ giác nội tiếp, phương tích, trục đẳng phương, đường thẳng Euler/Simson, hệ thức lượng, phép biến hình (tịnh tiến, quay, vị tự), tọa độ trong mặt phẳng',
  '12': 'hình học phẳng nâng cao + tọa độ phẳng: đường tròn, tứ giác nội tiếp, tiếp tuyến, phép vị tự, cực trị hình học, tọa độ - véc tơ'
};
function chuongTrinhHinh_(lop) { return CHUONG_TRINH_HINH_HOC[String(lop)] || CHUONG_TRINH_HINH_HOC['10']; }

var YEU_CAU_DE_HINH_ = '- CHỈ hình học PHẲNG, dựng được bằng tọa độ (không hình không gian). Đề tự đủ bằng chữ: nêu rõ cách dựng từng điểm (giao của..., trung điểm của..., chân đường vuông góc từ ... xuống ...).\n' +
  '- "loai" = "tinh": hỏi đúng MỘT đại lượng, đáp số là MỘT con số (độ dài, số đo góc theo độ, diện tích, tỉ số), dữ kiện bằng số cụ thể.\n' +
  '- "loai" = "chung_minh": đúng MỘT mệnh đề cần chứng minh, kiểm được bằng tọa độ (bằng nhau, vuông góc, song song, thẳng hàng, đồng quy, 4 điểm cùng thuộc một đường tròn, ' +
  'tiếp tuyến, đẳng thức độ dài/tỉ số). Ghi mệnh đề vào "menh_de" (vd "AM = AN", "MN ⊥ BC", "B, C, E, F cùng thuộc một đường tròn"). Không hỏi nhiều ý a), b), c).\n' +
  '- Có một Ý TƯỞNG THEN CHỐT đẹp (kẻ thêm đường phụ, góc nội tiếp cùng chắn cung, tam giác đồng dạng, phương tích...) để video có khoảnh khắc "à ra thế".\n' +
  '- Hình vẽ không quá rối: tối đa khoảng 10 điểm có tên, tối đa 2 đường tròn.\n';
var DANG_HINH_ = 'tam_giac_dong_dang, he_thuc_luong, goc_noi_tiep, tu_giac_noi_tiep, tiep_tuyen_duong_tron, phuong_tich, thang_hang_dong_quy, vuong_goc_song_song, dien_tich_ti_so, cuc_tri_hinh_hoc';

function promptSangTacHinhHoc_(lop, n, daCo) {
  return 'Bạn là giáo viên chuyên Toán, ra đề HÌNH HỌC PHẲNG DẠNG KHÓ (đề thi vào lớp 10 chuyên, học sinh giỏi, câu vận dụng cao) cho học sinh lớp ' + lop + ' (Việt Nam).\n' +
    'Phạm vi: ' + chuongTrinhHinh_(lop) + '.\n' +
    'Hãy SÁNG TÁC ' + n + ' bài hình học phẳng mới (ưu tiên xen kẽ bài tính và bài chứng minh).\n' +
    'THANG ĐIỂM "diem_tu_duy": 10 = cần một ý tưởng then chốt đẹp (đường phụ, góc nội tiếp, đồng dạng khéo...); 8-9 = nhiều bước suy luận, có bẫy; dưới 8 = áp dụng công thức. CHỈ ra đề từ 8 điểm.\n' +
    'YÊU CẦU:\n' + YEU_CAU_DE_HINH_ + (typeof yeuCauDapAnChinhXac_ === 'function' ? yeuCauDapAnChinhXac_('THUC_TE') : '') +
    '- "dang" là một trong: ' + DANG_HINH_ + '.\n- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Trả về MỘT mảng JSON, mỗi phần tử: {"dang":"","loai":"tinh|chung_minh","chu_de":"","de_bai":"","menh_de":"","dap_an":"(bài tính) con số","diem_tu_duy":1-10,"y_tuong_then_chot":"","yeu_to_tu_duy":"","bay_thuong_gap":""}. Có thể dùng LaTeX trong $...$.';
}
function promptTimHinhHoc_(lop, n, daCo) {
  return 'Hãy dùng Google Search để TÌM TRÊN INTERNET ' + (n + 2) + ' bài HÌNH HỌC PHẲNG DẠNG KHÓ CÓ THẬT (đề thi vào lớp 10 chuyên, đề học sinh giỏi, câu hình cuối đề thi) cho học sinh lớp ' + lop + ' (Việt Nam). ' +
    'Nguồn: toanmath.com, thuvienhoclieu.com, vietjack.com, loigiaihay.vn, đề của các sở/trường chuyên.\n' +
    'Đề có nhiều ý a), b), c) thì CHỈ giữ MỘT ý hay nhất (thường là ý cuối) và viết lại thành đề tự đủ (nêu đủ cách dựng các điểm cần cho ý đó).\n' +
    'YÊU CẦU:\n' + YEU_CAU_DE_HINH_ + '- "dang" là một trong: ' + DANG_HINH_ + '.\n- Mỗi đề kèm "nguon_url" là trang bạn thực sự tìm thấy. Không chắc thì bỏ; không có đề phù hợp thì trả [].\n' +
    '- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Chỉ trả về MỘT mảng JSON: {"dang":"","loai":"tinh|chung_minh","chu_de":"","de_bai":"","menh_de":"","dap_an":"","diem_tu_duy":1-10,"yeu_to_tu_duy":"","bay_thuong_gap":"","nguon_url":""}';
}
function dangHinhDungDuoc_(dang) { return DANG_HINH_.split(', ').indexOf(String(dang || '').trim().toLowerCase()) >= 0; }
function loaiDeHinh_(r) { return /chứng minh|cmr\b|chứng tỏ|hãy chỉ ra rằng/i.test(String(r.de_bai || '')) ? 'chung_minh' : 'tinh'; }

// Mã dựng hình bằng tọa độ: dùng cho cả kiểm chứng và lấy tọa độ vẽ hình.
var HUONG_DAN_MA_HINH_ = 'Viết MỘT hàm JavaScript thuần tên kiemChung() (không thư viện, không gọi mạng), DỰNG HÌNH BẰNG TỌA ĐỘ trực tiếp từ ĐỀ BÀI (không dựa vào lời giải): ' +
  'tự viết các hàm nhỏ: giao 2 đường thẳng, giao đường thẳng - đường tròn, giao 2 đường tròn, trung điểm, chân đường vuông góc, tâm/bán kính đường tròn ngoại tiếp, phân giác, quay điểm. ' +
  'Đề có dữ kiện tự do (tam giác bất kỳ, điểm M bất kỳ trên cung...) thì sinh tham số NGẪU NHIÊN hợp lệ (đúng mọi điều kiện của đề: nhọn, AB < AC, M nằm trên cung nhỏ...; dùng Math.random). ' +
  'Mọi vòng lặp phải dừng, tổng không quá 200000 phép tính. ';
var DANG_TRA_HINH_ = '"hinh": {"diem":{"A":[x,y],...} tọa độ CÁC điểm có tên trong đề của MỘT cấu hình đẹp, dễ nhìn (không quá dẹt, các điểm không sát nhau), ' +
  '"canh":[["A","B"],...] các đoạn thẳng của hình, "tron":[["O","A"]] đường tròn (tâm, một điểm trên đường tròn) hoặc [["A","B","C"]] (đường tròn qua 3 điểm), "phu":[["A","H"]] các đường kẻ thêm của lời giải}';

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
    { nhiet: 0.1, prompt: HUONG_DAN_MA_HINH_ + 'Thử mệnh đề cần chứng minh ở ÍT NHẤT 6 cấu hình ngẫu nhiên khác nhau; với mỗi cấu hình tính "phần dư" (ví dụ |AM - AN|, |tích vô hướng| của hai véc tơ cần vuông góc, |định thức| khi cần thẳng hàng) chia cho kích thước hình. ' +
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
function chuanHinhToaDo_(h) {
  if (!h || typeof h !== 'object' || !h.diem || typeof h.diem !== 'object') return null;
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
  return { diem: diem, canh: loc(h.canh, 2).map(function (c) { return [c[0], c[1]]; }), tron: tron, phu: loc(h.phu, 2).map(function (c) { return [c[0], c[1]]; }) };
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
    '- Hình chính vẽ bằng hinh_hoc (diem, canh, goc, vuong, to, "tron": đường tròn [tâm, điểm] hoặc [A,B,C], "phu": đường kẻ thêm (nét đứt vàng, hiện sau), "bang": vạch cạnh bằng nhau [A,B,số vạch]).' +
    (hinh ? ' DÙNG ĐÚNG TÊN ĐIỂM sau (máy sẽ tự thay tọa độ đúng tỉ lệ từ mô hình dựng hình): ' + Object.keys(hinh.diem).join(', ') + (hinh.tron.length ? '; đường tròn: ' + JSON.stringify(hinh.tron) : '') + (hinh.phu.length ? '; đường phụ: ' + JSON.stringify(hinh.phu) : '') + '.' : '') + '\n' +
    '- MỘT hình xuyên suốt (giu_san_khau): cảnh đề bài dựng hình từng bước theo đúng thứ tự đề nêu; cảnh ý tưởng kẻ đường phụ ("phu"); mỗi cảnh giải tô sáng (chon theo chỉ số cạnh) đúng các cạnh/góc đang nói và ghi lý do (định lý) trên màn hình.\n' +
    (cm ? '- Bài CHỨNG MINH: mỗi bước một khẳng định + "vì ..." (định lý/tính chất); cảnh đáp án chốt mệnh đề + "(đpcm)". Cảnh THỬ LẠI: đo bằng số trên một cấu hình cụ thể (vd "AM ≈ 3{,}42,\\; AN ≈ 3{,}42 \\checkmark") để người xem thấy mệnh đề đúng.\n'
      : '- Bài TÍNH: cảnh thử lại kiểm bằng cách thứ hai (tọa độ/hệ thức khác) với số cụ thể.\n') +
    (c1.y_tuong ? '- Ý tưởng then chốt đã kiểm chứng: ' + String(c1.y_tuong).slice(0, 300) + '\n' : '') +
    (Array.isArray(c1.cac_buoc) && c1.cac_buoc.length ? '- Lời giải đã kiểm chứng (bám sát, không thêm bước sai): ' + JSON.stringify(c1.cac_buoc).slice(0, 2500) + '\n' : '');
}
