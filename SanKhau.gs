/**
 * v96 — SÂN KHẤU 2D + NHẬN ĐỀ TỰ DO (Apps Script). Bản JS của scripts/khung4tang_v96.py (test_v96_gs.cjs so khớp kết quả).
 *  - chonSanKhau_(kb, r): định tuyến MỘT lần -> kb.khung4tang.san_khau.loai (hình phẳng v94 không đụng; vật thể khối thật -> 3D;
 *    xác suất -> rut_mau | so_do_cay | luoi_bayes | cot_phan_phoi; kinh tế / chuyển động 2D / tăng trưởng -> nhánh 2D;
 *    đề lạ / đại số thuần -> tu_duy_dai_so). Ghi chú đạo diễn (cột chi_dao / thẻ Zalo [chidao: ...]) ưu tiên tuyệt đối
 *    nhưng KHÔNG vượt GDPT 2018 (lưới Bayes chỉ lớp 12).
 *  - tuSuaSanKhau_(kb, r): Auto-fix (nhóm thẻ THEO GIÁ TRỊ, đếm n(Ω) / n(A) với trần vét cạn 100 000, đối chiếu đáp án),
 *    ký hiệu "không chia hết" (\text{ không } \vdots), đọc đề 1 lần, đọc đủ công thức, mã TeX thô ở trường chữ thường.
 *  - loiSanKhau_(kb): lỗi cứng XS_SAI_DAP_SO | KB_DOC_LAP_DE | KB_CUT_CONG_THUC | MA_THO_HIEN_THI.
 *  - huongDanSanKhau_(r), yeuCauDaDangSinhDe_(lop, mon), tachChiDao_(s).
 * Mọi hàm được gọi qua `typeof ... === 'function'` -> thiếu tệp này (chưa đồng bộ) thì hệ thống chạy như v95.
 */

var TRAN_VET_CAN_ = 100000;
var LOAI_XS_2D_ = ['rut_mau', 'so_do_cay', 'luoi_bayes', 'cot_phan_phoi'];
var LOAI_TT_2D_ = ['kinh_te_do_thi', 'so_do_2d', 'tang_truong'];
var LOAI_SAN_KHAU_ = LOAI_XS_2D_.concat(LOAI_TT_2D_, ['tu_duy_dai_so']);
var KHUON_VAT_THE_ = ['tam_bia_gap_hop', 'tru_non_toi_uu', 'hai_mat_cau_oxyz', 'khung_day_cap', 'mat_phang_cat_khoi', 'chop_lang_tru', 'parabol_quy_dao'];
var RE_VAT_THE_ = /hộp|bìa|tấm|lon|hình trụ|hình nón|phễu|cốc|mặt cầu|quả cầu|hình chóp|lăng trụ|tứ diện|dây cáp|sợi dây|treo|mặt phẳng|thiết diện|khối|bể|bồn|thùng|oxyz|tòa nhà|cột|kim tự tháp/i;
var TU_CHI_DAO_ = [
  [/bayes|lưới diện tích|hình vuông đơn vị|mosaic/i, 'luoi_bayes'],
  [/sơ đồ cây|cây xác suất|tree/i, 'so_do_cay'],
  [/biểu đồ cột|cột phân phối|phân phối/i, 'cot_phan_phoi'],
  [/rút (?:thẻ|mẫu)|bốc (?:thẻ|bi)|lật thẻ|thẻ số|rút mẫu/i, 'rut_mau'],
  [/đồ thị lợi nhuận|doanh thu|kinh tế|giá bán|thanh gạt/i, 'kinh_te_do_thi'],
  [/sơ đồ 2d|qua sông|dây cáp|bờ sông|chuyển động 2d|khoảng cách/i, 'so_do_2d'],
  [/tăng trưởng|lãi suất|lãi kép|hàm mũ|logarit/i, 'tang_truong'],
  [/sơ đồ tư duy|tư duy|biến đổi đại số|khóa màu/i, 'tu_duy_dai_so'],
  [/3d|khối|hình hộp|gập hộp|hình trụ/i, '3d_vector']
];

/* ===================== GHI CHÚ ĐẠO DIỄN ===================== */
function tachChiDao_(s) {
  s = String(s || '');
  var m = /\[\s*chi\s*_?dao\s*:\s*([^\]]+)\]/i.exec(s);
  if (!m) return {de: s, chi_dao: ''};
  return {de: (s.slice(0, m.index) + s.slice(m.index + m[0].length)).trim(), chi_dao: m[1].trim()};
}
function docChiDao_(s) {
  s = String(s || '').trim();
  var m = /\[\s*chi\s*_?dao\s*:\s*([^\]]+)\]/i.exec(s);
  var loi = (m ? m[1] : s).trim();
  if (!loi) return {loai: null, loi: ''};
  for (var i = 0; i < TU_CHI_DAO_.length; i++) if (TU_CHI_DAO_[i][0].test(loi)) return {loai: TU_CHI_DAO_[i][1], loi: loi.slice(0, 200)};
  return {loai: null, loi: loi.slice(0, 200)};
}

/* ===================== BỘ ĐỊNH TUYẾN ===================== */
function loaiXacSuat_(van, lop) {
  var t = String(van || '').toLowerCase();
  if (/bayes|xét nghiệm|dương tính|âm tính|xác suất có điều kiện|biết rằng|với điều kiện|p\(\s*\w\s*\|/.test(t)) {
    return String(lop) === '12' && /xét nghiệm|dương tính|bayes|tỉ lệ (?:mắc|nhiễm|lỗi|phế phẩm)|nhà máy|phân xưởng|máy\s*[ab12]/.test(t) ? 'luoi_bayes' : 'so_do_cay';
  }
  if (/lần lượt|liên tiếp|lần thứ (?:nhất|hai)|bắn|thi đấu|độc lập|vòng (?:1|một)|ván|trận|mỗi lần/.test(t) && !/thẻ đánh số|tấm thẻ/.test(t)) {
    // ít phép thử (<= 3 lần) -> sơ đồ cây rõ hơn; nhiều lần / khoanh bừa / phân phối -> biểu đồ cột
    var soLan = Math.max.apply(null, (t.match(/(\d+)\s*(?:lần|lượt|câu|ván|trận)/g) || ['0']).map(function (x) { return parseInt(x, 10) || 0; }));
    return soLan >= 4 && /đúng\s*\d+\s*lần|ít nhất\s*\d+\s*lần|bao nhiêu lần|số lần|phân phối|khoanh (?:bừa|ngẫu nhiên)|trắc nghiệm/.test(t) ? 'cot_phan_phoi' : 'so_do_cay';
  }
  if (/khoanh (?:bừa|ngẫu nhiên)|đúng\s*\d+\s*câu|ít nhất\s*\d+\s*câu|phân phối|so sánh hai phương án|phương án nào/.test(t)) return 'cot_phan_phoi';
  return 'rut_mau';
}
function loaiThucTe_(van, khuon) {
  var t = String(van || '').toLowerCase();
  if ((khuon === '__tu_do__' || (KHUON_VAT_THE_.indexOf(khuon) >= 0 && khuon !== 'parabol_quy_dao')) && RE_VAT_THE_.test(t)) return '3d_vector';
  if (/giá bán|lợi nhuận|doanh thu|chi phí|giảm giá|tăng giá|tiền lãi thu|bán được|khách hàng/.test(t)) return 'kinh_te_do_thi';
  if (/lãi suất|lãi kép|gửi tiết kiệm|tăng trưởng|dân số|vi khuẩn|phân rã|chu kì bán rã|logarit|\blog\b|hàm mũ|lạm phát/.test(t)) return 'tang_truong';
  if (/bờ sông|qua sông|chèo thuyền|bơi qua|kéo dây điện|dây cáp từ|đường ống từ|sát tường|rào.*(?:tường|bờ)|cổng (?:hình )?parabol|thang dựa/.test(t)) return 'so_do_2d';
  if (khuon === 'parabol_quy_dao' && /vận tốc|quãng đường|ném|quỹ đạo|tích phân|parabol|chuyển động|phanh/.test(t)) return '3d_vector';
  return null;
}
// -> {loai, nguon: chi_dao|ai|suy|lui|khoa_luong, chi_dao}
function chonSanKhau_(kb, r) {
  kb = kb || {}; r = r || {};
  var mon = String(kb.mon || r.mon || '').toUpperCase(), lop = String(kb.lop || r.lop || '');
  // v98: đặc tả Lego (hinh_khong_gian phien_ban 2) thắng mọi sân khấu (Oxyz lớp 12 / thực tế 3D không khớp khuôn)
  var hkgL = kb.hinh_khong_gian;
  if (hkgL && typeof hkgL === 'object' && (String(hkgL.phien_ban) === '2' || Array.isArray(hkgL.doi_tuong))) return {loai: 'lego_3d', nguon: 'lego', chi_dao: ''};
  if (kb.luong === 'hinh_hoc_thuan' || mon === 'HINH_HOC') return {loai: 'hinh_hoc', nguon: 'khoa_luong', chi_dao: ''};
  var van = [kb.de_bai, r.de_bai, kb.can_tim, kb.chu_de].filter(Boolean).join(' ');
  var cd = docChiDao_(kb.chi_dao || r.chi_dao || '');
  if (cd.loai) return {loai: cd.loai === 'luoi_bayes' && lop !== '12' ? 'so_do_cay' : cd.loai, nguon: 'chi_dao', chi_dao: cd.loi};
  if (kb.san_khau_dich === 'cay_bayes') return {loai: 'so_do_cay', nguon: 'hop_dong', chi_dao: cd.loi};   // v99.2: hợp đồng hình BP0
  var k4 = kb.khung4tang && typeof kb.khung4tang === 'object' ? kb.khung4tang : {};
  var sk = k4.san_khau && typeof k4.san_khau === 'object' ? k4.san_khau : {};
  if (LOAI_SAN_KHAU_.indexOf(sk.loai) >= 0) return {loai: sk.loai === 'luoi_bayes' && lop !== '12' ? 'so_do_cay' : sk.loai, nguon: 'ai', chi_dao: cd.loi};
  var c3 = k4.canh_3d_vector && typeof k4.canh_3d_vector === 'object' ? k4.canh_3d_vector : {};
  if (mon === 'XAC_SUAT' || /tính xác suất|xác suất để/i.test(van)) return {loai: loaiXacSuat_(van, lop), nguon: 'suy', chi_dao: cd.loi};
  var khuon = c3.khuon && c3.khuon !== 'luoi_the_bi_xac_suat' ? c3.khuon : (Array.isArray(c3.doi_tuong) && c3.doi_tuong.length ? '__tu_do__' : null);
  if (!khuon && typeof suyKhuon_ === 'function') { var s = suyKhuon_(kb, r); if (s && s.khuon !== 'luoi_the_bi_xac_suat') khuon = s.khuon; }
  var l = loaiThucTe_(van, khuon);
  if (l) return {loai: l, nguon: 'suy', chi_dao: cd.loi};
  return {loai: 'tu_duy_dai_so', nguon: 'lui', chi_dao: cd.loi};
}

/* ===================== v99.1: SÂN KHẤU TỰ SINH 2.5D (tu_sinh_svg) ===================== */
// Đề thực tế giàu hình ảnh / dạng lạ không có mẫu cứng (bông tuyết Koch, parabol giá vé, gấp hình, cầu vòm, bánh răng...)
// -> BP2 xin thêm MỘT lời gọi riêng (lapTuSinh_, BoPhan1.gs) viết mã Python thuần toán học sinh lớp SVG theo bước;
// máy kiểm bằng hộp cát scripts/tu_sinh_svg.py (kiemTuSinhMay_ của chay_bp1.js). Tắt: CAU_HINH TU_SINH_SVG = TAT.
var RE_TU_SINH_ = /bông tuyết|koch|fractal|phân hình|cầu vòm|mái vòm|cổng vòm|bánh răng|gấp (?:giấy|hình|tờ)|origami|giá vé|parabol|quỹ đạo|đường đi của|hòn đảo|cánh đồng|thửa ruộng|vòi phun|cầu treo|cánh quạt|hoa văn|lát gạch|xếp gạch/i;
function dungTuSinh_(r, kb) {
  r = r || {}; kb = kb || {};
  if (typeof cauHinh_ === 'function' && String(cauHinh_('TU_SINH_SVG') || '').toUpperCase() === 'TAT') return false;
  if ((typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r)) || kb.luong === 'hinh_hoc_thuan') return false;
  if ((typeof laVideoDai_ === 'function' && laVideoDai_(r)) || kb.kieu_video === 'DAI_10_PHUT') return false;
  if (typeof laLegoKb_ === 'function' && laLegoKb_(kb)) return false;
  var cd = String(kb.chi_dao || r.chi_dao || '');
  if (/tự sinh|tu_sinh|svg/i.test(cd)) return true;
  // v99.2: hợp đồng hình BP0 (kb.san_khau_dich, apHopDongVaoKb_) thắng - kể cả đề xác suất (Monty Hall, xác suất hình học)
  var dich = String(kb.san_khau_dich || ((typeof docHopDongHinh_ === 'function' && docHopDongHinh_(r)) || {}).san_khau_dich || '');
  if (dich === 'tu_sinh_svg') return true;
  if (dich && dich !== 'tu_sinh_svg') return false;
  if (String(kb.mon || r.mon || '').toUpperCase() === 'XAC_SUAT') return false;   // 4 mô-đun xác suất v96 đã đủ
  return RE_TU_SINH_.test(String(r.de_bai || kb.de_bai || ''));
}
/* ===================== v101.4: HỢP ĐỒNG HÌNH TỰ SUY TẠI BP2 (đề Zalo / đề thiếu hợp đồng của BP0) ===================== */
// Đề có ngữ cảnh hình ảnh / dãy số - đệ quy / xác suất mô hình lạ mà các sân khấu v96 không phủ -> ưu tiên tu_sinh_svg.
var RE_DAY_DEQUY_ = /dãy số|cấp số|truy hồi|đệ quy|số hạng|lặp lại|lồng nhau|lần thứ \d+|bước thứ \d+|sau \d+ (?:lần|bước)|nhân đôi|chia (?:ba|ba phần|đôi) rồi|tam giác sierpinski|sierpinski/i;
var RE_NGU_CANH_HINH_ = /hình vẽ|bản vẽ|sơ đồ|miền (?:tô|gạch)|phần tô|diện tích phần|lát|xếp|tô màu|vòng tròn|đường tròn|tam giác đều|lục giác|ngũ giác|đa giác|bàn cờ|lưới ô|ô vuông|trục số|tập hợp|giao của|hợp của|venn|góc|cung|đoạn thẳng|chia đoạn/i;
var RE_XS_MO_HINH_LA_ = /monty hall|ba cánh cửa|cánh cửa|nghịch lý|ngày sinh|hẹn gặp|gặp nhau|điểm ngẫu nhiên|rơi ngẫu nhiên|chọn ngẫu nhiên một điểm|xác suất hình học|kim buffon|ném (?:phi tiêu|kim)|bàn cờ|mê cung|đường đi|bước ngẫu nhiên|đi bộ ngẫu nhiên|hình vuông|đường tròn|tam giác/i;
// -> {san_khau_dich, kich_ban_hinh[4-6], nut_that, goi_y_hinh_anh, mang, nhom: ''} | null (không cần hợp đồng: sân khấu v96 / hình chuẩn tự phủ)
// buoc = mảng câu bước giải (c2.cac_buoc / c1.cac_buoc) để bám sát thứ tự giải.
function suyHopDongHinh_(r, buoc) {
  r = r || {};
  var tach = tachChiDao_(r.de_bai), de = tach.de || String(r.de_bai || '');
  var chiDao = String(r.chi_dao || tach.chi_dao || '');
  var mon = String(r.mon || '').toUpperCase(), lop = String(r.lop || '');
  if (/^HINH_/.test(mon)) return null;                                  // hình phẳng / không gian chuẩn có luồng riêng (v94 / v97)
  if (typeof laVideoDai_ === 'function' && laVideoDai_(r)) return null;  // video -10P không dùng Khung 4 tầng ngắn
  if (typeof cauHinh_ === 'function' && String(cauHinh_('TU_SINH_SVG') || '').toUpperCase() === 'TAT') return null;
  var cd = docChiDao_(chiDao), dich = '';
  var t = de.toLowerCase();
  if (/tự sinh|tu_sinh|svg/i.test(chiDao)) dich = 'tu_sinh_svg';
  else if (cd.loai) return null;                                         // chỉ đạo đã chỉ rõ sân khấu -> chonSanKhau_ tự tôn trọng, không cần hợp đồng
  else {
    var q = chonSanKhau_({mon: mon, lop: lop, de_bai: de}, r);           // CÙNG bộ định tuyến với Python chon_san_khau (không thêm nhánh mới)
    var la = RE_TU_SINH_.test(t) || RE_DAY_DEQUY_.test(t);
    if (mon === 'XAC_SUAT') {
      if (q.loai === 'luoi_bayes' || /bayes|xét nghiệm|dương tính/.test(t)) return null;   // xác suất có điều kiện đã có lưới Bayes / sơ đồ cây
      if (RE_XS_MO_HINH_LA_.test(t) && !/thẻ|tấm thẻ|xúc xắc|viên bi/.test(t)) dich = 'tu_sinh_svg';
    } else if (q.loai === 'tu_duy_dai_so' && q.nguon === 'lui') {
      // đề rơi về sơ đồ chữ: có ngữ cảnh hình / dãy lặp / bối cảnh thực tế -> hộp cát hình thay vì sơ đồ tư duy chữ
      if (la || RE_NGU_CANH_HINH_.test(t) || mon === 'THUC_TE') dich = 'tu_sinh_svg';
    } else if (la && (q.loai === '3d_vector' ? RE_TU_SINH_.test(t) : true) && q.nguon !== 'chi_dao') {
      if (q.loai === 'kinh_te_do_thi' || q.loai === 'tang_truong' || q.loai === 'so_do_2d') { if (RE_TU_SINH_.test(t)) dich = 'tu_sinh_svg'; }
      else dich = 'tu_sinh_svg';
    }
  }
  if (!dich) return null;
  var gt = (buoc || []).map(function (b) { return String(b || '').replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  var kbh = [];
  if (gt.length) {
    // chọn đều 4-6 bước giải: đầu (dựng đối tượng) - giữa (biến đổi) - cuối (kết quả)
    var n = Math.max(4, Math.min(6, gt.length));
    for (var i = 0; i < n; i++) {
      var s = gt[Math.min(gt.length - 1, Math.round(i * (gt.length - 1) / Math.max(1, n - 1)))];
      kbh.push('(' + (i + 1) + ') ' + (i === 0 ? 'dựng đúng đối tượng / thông số đề: ' : i === n - 1 ? 'hình chốt đáp án (không ghi số đáp án trước câu công bố): ' : 'biến đổi / thêm yếu tố / tô nhấn: ') + s.slice(0, 100));
    }
  } else kbh = ['(1) dựng đúng đối tượng và số liệu của đề', '(2) thêm / tách yếu tố then chốt của lời giải', '(3) biến đổi hình theo bước tính', '(4) hình chốt đáp án (không ghi số đáp án)'];
  return {san_khau_dich: dich, kich_ban_hinh: kbh.map(function (x) { return x.replace(/^\(\d\)\s*/, ''); }).slice(0, 6),
    nut_that: String((gt.length && gt[Math.floor(gt.length / 2)]) || 'bước đột phá của lời giải').slice(0, 160),
    goi_y_hinh_anh: 'hình tự sinh bám đề, mỗi bước giải thêm / đổi một lớp đúng lúc lời đọc nhắc tới', mang: mon, nhom: ''};
}
// Gắn hợp đồng suy ra vào r.yeu_to_tu_duy (trong bộ nhớ) khi thiếu -> docHopDongHinh_ / apHopDongVaoKb_ / dungTuSinh_ đều thấy.
function damBaoHopDongHinh_(r, buoc) {
  if (!r || (typeof docHopDongHinh_ === 'function' && docHopDongHinh_(r))) return null;
  var hd = null;
  try { hd = suyHopDongHinh_(r, buoc); } catch (e) { hd = null; }
  if (!hd || typeof ganHopDong_ !== 'function') return null;
  r.yeu_to_tu_duy = ganHopDong_(r.yeu_to_tu_duy, hd);
  try { Logger.log('v101.4: hợp đồng hình tự suy (' + hd.san_khau_dich + ') cho đề ' + String(r.id || '')); } catch (e2) {}
  return hd;
}
function huongDanTuSinh_(kb, r) {
  var buoc = ((kb.khung4tang || {}).buoc || []).map(function (b, i) { return i + ': ' + String(b.nhan || '') + ' — ' + String(b.tieu_de || '') + (b.khi_noi ? ' (khi_noi: "' + b.khi_noi + '")' : ''); });
  var loi = (kb.canh || []).map(function (c, i) { return (i + 1) + '. ' + String(c.loi_thoai || ''); }).join('\n');
  return 'Bạn là họa sĩ minh họa toán 2.5D. Viết MỘT đoạn Python ngắn, thuần toán học, vẽ hình minh họa cho tầng 2 của video toán dọc.\n' +
    'ĐỀ: ' + String((r && r.de_bai) || kb.de_bai || '') + '\nĐÁP ÁN: ' + String((r && r.dap_an) || kb.dap_an_cuoi || '') + '\n' +
    'CÁC BƯỚC GIẢI (chỉ số: nhãn — tiêu đề):\n' + buoc.join('\n') + '\nLỜI ĐỌC TỪNG CẢNH:\n' + loi + '\n\n' +
    'HỢP ĐỒNG MÃ (máy chạy trong hộp cát, sai là bị loại):\n' +
    '- Chỉ `import math` và `import ve25d` (thư viện vẽ dựng sẵn, xem dưới). Định nghĩa `def ve():` trả list lớp {"buoc": <chỉ số bước>, "svg": "<g>...</g>", "hieu_ung": "moc|no|ve|sang", "khi_noi": "cụm 3-6 từ NGUYÊN VĂN trong lời đọc lúc lớp này hiện", "nhan": "tên lớp"}.\n' +
    '- Mọi tọa độ TÍNH trong Python, nằm trong viewBox 0 0 800 540 (chừa lề 24 px). path chỉ lệnh TUYỆT ĐỐI M L C Q A Z. Không filter, không transform (trừ translate <= 40 px), không href / ảnh / script, không chuỗi chứa "__".\n' +
    '- Thẻ được dùng: g path polygon polyline line circle ellipse rect text tspan defs linearGradient radialGradient stop. Chữ: font-family "Be Vietnam Pro", cỡ >= 22, tô #E9EEF5.\n' +
    '- PHONG CÁCH 2.5D vector hiện đại trên nền TỐI: mỗi mảng có mặt bên đậm hơn lệch xuống 6-10 px (độ dày nổi), bóng mềm = bản sao rgba(0,0,0,.28) lệch xuống-phải 10 px; lớp MỚI tô màu nhấn #5CE1E6 (cyan) hoặc #FFB547 (hổ phách, chỉ cho lớp kết quả), viền sáng 2-3 px; lớp cũ dịu xám xanh #7C8DA6.\n' +
    '- Mỗi bước giải phải có ít nhất 1 lớp mới (tối thiểu 3 bước khác nhau) - hình đổi theo đúng lời đang giảng; KHÔNG ghi đáp số trước bước đáp án.\n' +
    // v99.2: luật thẩm mỹ CỨNG (hộp cát --chi-kiem chặn: TS_CHU_NHO / TS_MAU_LA / TS_NHAN_DE_NET) + thư viện ve25d dựng sẵn
    '- LUẬT THẨM MỸ CỨNG (máy đo, sai là bị loại): (1) MỌI chữ có font-size >= 24 (sàn 22) - màn hình dọc điện thoại; (2) nhãn KHÔNG đè lên nét vẽ / đỉnh hình: đặt NGOÀI hình kèm đường gióng mảnh, hoặc nằm trọn trong hộp nền đặc (rect fill-opacity >= 0.6); ' +
    '(3) màu CHỈ dùng biến theme ve25d.MAU (nhan = cyan nhấn, nhan_dam, nhan_toi, ket = hổ phách kết quả, ket_toi, cu = xám lớp cũ, chu, chu_mo, mat, mat_toi, nen, dung, sai) - máy tự đổi họ màu nhấn theo theme nền của video.\n' +
    '- THƯ VIỆN ve25d (được `import ve25d as v`, khuyên dùng): v.chu(x, y, s, co=28, mau) | v.nhan(x, y, s, tranh=[điểm cần tránh], co=26) tự chọn 1 trong 8 hướng không đè đỉnh + đường gióng + hộp nền | ' +
    'v.da_giac(pts, mau, day=7) mảng nổi 2.5D | v.hop(x, y, a, b, c, mau) -> (svg, P đỉnh A..H) | v.tru(cx, cy, r, h, mau) | v.trai_phang_2mat(x, y, rong1, rong2, cao) -> (svg, P A/G) | ' +
    'v.luoi(...), v.ban_co(x, y, o, n, to=[(i, j)]) | v.he_truc(x, y, w, h, u_max, v_max, nhan_x, nhan_y, vach) -> (svg, f(u, v)) | v.do_thi(x, y, w, h, ham, a, b, cuc_tri=t) -> (svg, f, P) | ' +
    'v.cua(x, y, w, h, so, mo, ben_trong) cánh cửa Monty Hall | v.the_bai | v.mien_to(pts, mau, mo) | v.cung(cx, cy, r, a0, a1, to=mau) | v.mui_ten | v.duong(pts, net_dut) | v.cham | v.lop(buoc, svg, hieu_ung, khi_noi, nhan_lop, nhom).\n' +
    // v101.4: hàm chuẩn mới của ve25d (ưu tiên gọi thay vì tự tính chuỗi <path> thô)
    '- HÀM CHUẨN MỚI (ƯU TIÊN GỌI, KHÔNG tự tính <path> thô khi đã có hàm): v.tam_nhan(x, y, "chữ", mau, co=24) nhãn viên thuốc nền đặc | v.da_giac_deu(cx, cy, r, so_canh, goc_bd=-90, mau, to_nen) -> (svg, đỉnh) | ' +
    'v.mui_ten_kich_thuoc(x1, y1, x2, y2, "5 cm", lech=26) đoạn đo kích thước | v.cung_goc(ox, oy, x1, y1, x2, y2, r=36, text="60°") cung góc (~90° = góc vuông) | ' +
    'v.truc_so(x1, x2, y, [0, (2, "a"), 5], mien_to=(a, b)) trục số + dải khoảng | v.luoi_o(x, y, cot, hang, kich_thuoc=56, o_to={(i, j): "ket"}, nhan_o={(i, j): "3"}) lưới ô vuông | ' +
    'v.so_do_venn([("A", "12"), ("B", "9")], nhan_giao="5") Venn 2-3 tập | v.phan_nhanh_de_quy(cx, cy, r, bac=0..3, kieu="koch|tam_giac_chia|cay_nhi_phan") - gọi lại với bac TĂNG DẦN ở từng bước, cùng (cx, cy, r).\n' +
    '- CHIA LỚP BÁM CÂU THOẠI (bắt buộc): (a) bước ĐẦU dựng đúng đối tượng với thông số của đề (số đo, số phần tử, số bậc); (b) các bước GIỮA tách / biến đổi / thêm yếu tố / tô nhấn đúng lúc câu thoại đang giảng ý đó; (c) bước CHỐT bật hình kết quả (màu hổ phách) với "khi_noi" đặt ĐÚNG câu công bố đáp án, tuyệt đối không hiện sớm hơn. ' +
    '"khi_noi" của mỗi lớp là cụm 3-6 từ lấy NGUYÊN VĂN trong lời đọc của đúng bước đó (không bịa cụm, không ghi giây). Không để quá 4-5 giây không có lớp mới hay chuyển động (nhiều lớp nhỏ nối nhau thay vì một lớp to đứng yên).\n' +
    '- DÙNG `nhom` cho các nhãn / lớp THAY THẾ nhau (cùng một vị trí, bước sau thay bước trước): đặt cùng chuỗi nhom để máy ẩn lớp cũ khi lớp mới hiện, tránh chồng chữ; lớp cộng dồn (hình nền, khung) thì không đặt nhom.\n' +
    (kb.kich_ban_hinh && kb.kich_ban_hinh.length ? '- HỢP ĐỒNG HÌNH TỪ BỘ PHẬN 0 (bám đúng thứ tự, mỗi bước hình ứng một bước giải): ' + kb.kich_ban_hinh.map(function (x, i) { return (i + 1) + ') ' + x; }).join(' ') + (kb.nut_that ? ' | Nút thắt: ' + kb.nut_that : '') + '\n' : '') +
    '- Bám đúng số liệu đề (ví dụ bông tuyết Koch: tam giác đều cạnh a, mỗi cạnh chia 3 bật tam giác đều ra ngoài, lớp n+1 = các tam giác mới; parabol: trục, đỉnh nổi bật, điểm chạy).\n' +
    'Chỉ trả JSON {"ma": "<mã Python>", "mo_ta": "1 câu"}.';
}

/* ===================== KÝ HIỆU "KHÔNG CHIA HẾT" & MÃ THÔ ===================== */
var RE_KHONG_CHIA_HET_ = /\\not\s*\\vdots|\\nmid|∤|\\not\s*⋮|(^|[^\wÀ-ỹ])not\s*⋮/g;
// kieu: 'tex' (công thức KaTeX) -> \text{ không } \vdots ; 'tron' (tiêu đề / nhãn ChuTron) -> không \vdots ; 'chu' -> không ⋮
function chuanKhongChiaHet_(s, kieu) {
  if (typeof s !== 'string' || !s) return s;
  var thay = kieu === 'chu' ? 'không ⋮ ' : kieu === 'tron' ? 'không \\vdots ' : '\\text{ không } \\vdots ';
  return s.replace(RE_KHONG_CHIA_HET_, function (all, p1) { return (typeof p1 === 'string' ? p1 : '') + thay; }).replace(/[ \t]{2,}/g, ' ').trim();
}
var RE_MA_THO_ = /\\[A-Za-z]+|\\\\|[_^]\{|(^|[^A-Za-z])Omega(?![A-Za-z])|\bC_\d/;
var MACRON_ = {A: 'Ā', E: 'Ē', I: 'Ī', O: 'Ō', U: 'Ū'};
// TeX -> chữ Unicode GIỮ NGHĨA (\overline{A} -> Ā, \not\vdots -> không ⋮, \Omega -> Ω, C_{10}^{3} -> C₁₀³)
function texSangChu_(s) {
  var x = chuanKhongChiaHet_(String(s || ''), 'chu').replace(/\$/g, '').replace(/\\\\(?=[A-Za-z])/g, '\\');
  var TREN = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', n: 'ⁿ'};
  var DUOI = {'0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', n: 'ₙ', k: 'ₖ'};
  var doi = function (a, bang) { return a.split('').map(function (c) { return bang[c] || c; }).join(''); };
  for (var i = 0; i < 4; i++) {
    var x0 = x;
    x = x.replace(/\\(?:overline|bar)\s*\{\s*([A-Za-z])\s*\}/g, function (a, c) { return MACRON_[c] || c + '̄'; });
    x = x.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2').replace(/\\binom\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, 'C($1,$2)')
      .replace(/\\(?:text|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}/g, '$1');
    if (x === x0) break;
  }
  x = x.replace(/_\{([0-9nk]+)\}|_([0-9nk])/g, function (a, b, c) { return doi(b || c, DUOI); })
    .replace(/\^\{([0-9n]+)\}|\^([0-9n])/g, function (a, b, c) { return doi(b || c, TREN); });
  var L = {cdot: '·', times: '×', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', approx: '≈', Omega: 'Ω', cap: '∩', cup: '∪', pi: 'π', vdots: '⋮', Rightarrow: '⇒', mid: '|'};
  x = x.replace(/\\([A-Za-z]+)/g, function (a, t) { return L[t] || ''; }).replace(/(^|[^A-Za-z])Omega(?![A-Za-z])/g, '$1Ω');
  return x.replace(/\{,\}/g, ',').replace(/[{}\\]/g, '').replace(/\s+/g, ' ').trim();
}

/* ===================== SỐ / ĐỌC SỐ (kiểm câu cụt công thức) ===================== */
// '2/3' -> ['2/3','2 phần 3','hai phần ba']; '0,5' -> ['0,5','không phẩy năm']; '120' -> ['120','một trăm hai mươi']
function cacDangDocSo_(s) {
  s = String(s || '').trim().replace(/\{,\}/g, ',').replace(/\\dfrac/g, '\\frac');
  var doc = typeof soThanhChu_ === 'function' ? soThanhChu_ : function (n) { return String(n); };
  var CH = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  var m = /^\\frac\{(\d+)\}\{(\d+)\}$/.exec(s) || /^(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (m) return [m[1] + '/' + m[2], m[1] + ' phần ' + m[2], doc(+m[1]) + ' phần ' + doc(+m[2])];
  m = /^(\d+)[.,](\d+)$/.exec(s);
  if (m) {
    var tung = m[2].split('').map(function (c) { return CH[+c]; }).join(' ');
    return [m[1] + ',' + m[2], m[1] + '.' + m[2], doc(+m[1]) + ' phẩy ' + (m[2].charAt(0) === '0' ? tung : doc(+m[2])), doc(+m[1]) + ' phẩy ' + tung];
  }
  m = /^(\d+)\s*%$/.exec(s);
  if (m) return [s, m[1] + ' phần trăm', doc(+m[1]) + ' phần trăm'];
  if (/^\d+$/.test(s)) return [s, doc(+s)];
  return [s];
}
// v99.1: biến thể cách đọc số tiếng Việt ("mươi tư", "mươi mốt", "mươi lăm", "linh" ↔ "lẻ", "nghìn" ↔ "ngàn") + nhóm
// nghìn "4.500" ↔ "4500" ↔ "4 500" -> câu đã đọc kết quả bằng chữ không bị Auto-fix nối thêm "bằng 144" (lỗi đọc lặp số)
function bienTheDocSo_(ds) {
  var ra = [];
  ds.forEach(function (d) {
    var v = [d];
    v.push(d.replace(/mươi bốn/g, 'mươi tư'), d.replace(/mươi một/g, 'mươi mốt'), d.replace(/(mươi|mười) năm/g, '$1 lăm'),
      d.replace(/ linh /g, ' lẻ '), d.replace(/nghìn/g, 'ngàn'));
    if (/^\d{4,}$/.test(d)) { var nh = d.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); v.push(nh, nh.replace(/\./g, ' ')); }
    if (/^\d{1,3}(\.\d{3})+$/.test(d)) v.push(d.replace(/\./g, ''));
    v.forEach(function (x) { if (ra.indexOf(x) < 0) ra.push(x); });
  });
  return ra;
}
function loiNoiSo_(loi, so) {
  var l = ' ' + String(loi || '').toLowerCase().replace(/\{,\}/g, ',').replace(/\s+/g, ' ') + ' ';
  return bienTheDocSo_(cacDangDocSo_(so)).some(function (d) {
    d = d.toLowerCase().replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    return new RegExp('(^|[^\\d.,/])' + d + '(?![\\d/]|[.,]\\d)').test(l);
  });
}
function soKetQuaDong_(d) {
  var s = String(d || '').replace(/\{,\}/g, ',').replace(/\\dfrac/g, '\\frac');
  if (s.indexOf('=') < 0) return null;
  var ve = s.slice(s.lastIndexOf('=') + 1).trim().replace(/\.$/, '').replace(/\\(?:text|mathrm)\{[^{}]*\}/g, '').trim();
  return /^(\\frac\{\d+\}\{\d+\}|\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?\s*%?)$/.test(ve) ? ve.replace(/\s+/g, '') : null;
}

/* ===================== ĐỌC LẶP ĐỀ ===================== */
function ngram3_(s) {
  var w = String(s || '').toLowerCase().match(/[0-9a-zà-ỹđ]+/g) || [], o = {};
  for (var i = 0; i + 2 < w.length; i++) o[w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]] = 1;
  return o;
}
// chỉ số các cảnh đọc lại >= 60 % cụm 3 từ của đề (cảnh đọc đề đầu tiên được giữ)
function canhLapDe_(kb) {
  var de = ngram3_(kb && kb.de_bai), nDe = Object.keys(de).length;
  if (nDe < 6) return [];
  var doc = [];
  (kb.canh || []).forEach(function (c, i) {
    var g = ngram3_(c && c.loi_thoai), k = Object.keys(g), chung = k.filter(function (x) { return de[x]; }).length;
    if (k.length && chung >= 5 && chung / Math.max(1, Math.min(nDe, k.length)) >= 0.6) doc.push(i);
  });
  return doc.slice(1);
}

/* ===================== XÁC SUẤT: RÚT MẪU (nhóm theo GIÁ TRỊ, vét cạn có trần) ===================== */
function v2_(n) { n = Math.abs(n); if (!n) return 99; var k = 0; while (n % 2 === 0) { n /= 2; k++; } return k; }
function viTuNhan_(nhan) {
  var s = chuanKhongChiaHet_(String(nhan || ''), 'chu').toLowerCase().replace(/\\text\s*\{\s*không\s*\}\s*(?:\\vdots|⋮)/g, ' không ⋮ ').replace(/\\vdots/g, '⋮').replace(/\$/g, '');
  var dk = [], m, re = /(không\s*(?:chia hết cho|⋮)|chia hết cho|⋮)\s*(\d+)/g;
  while ((m = re.exec(s))) {
    (function (k, phu) { if (k) dk.push(function (v) { return phu ? v % k !== 0 : v % k === 0; }); })(+m[2], /^không/.test(m[1]));
  }
  var s2 = s.replace(re, ' ');
  if (/(^|[^à-ỹa-z])chẵn([^à-ỹa-z]|$)/.test(s2)) dk.push(function (v) { return v % 2 === 0; });
  if (/(^|[^à-ỹa-z])lẻ([^à-ỹa-z]|$)/.test(s2)) dk.push(function (v) { return Math.abs(v % 2) === 1; });
  return dk.length ? function (v) { return dk.every(function (f) { return f(v); }); } : null;
}
function suyBienCo_(van) {
  var t = String(van || '').toLowerCase(), m;
  if ((m = /tích[^.;?]{0,40}?(?:chia hết cho|⋮|\\vdots)\s*(\d+)/.exec(t))) return {loai: 'tich_chia_het', so: +m[1], phu_dinh: /tích[^.;?]{0,30}?không\s*(?:chia hết|⋮)/.test(t)};
  if (/tích[^.;?]{0,30}?(?:là\s*)?(?:một\s*)?số chẵn/.test(t)) return {loai: 'tich_chia_het', so: 2};
  if (/tích[^.;?]{0,30}?(?:là\s*)?(?:một\s*)?số lẻ/.test(t)) return {loai: 'tich_chia_het', so: 2, phu_dinh: true};
  if ((m = /tổng[^.;?]{0,40}?(?:chia hết cho|⋮|\\vdots)\s*(\d+)/.exec(t))) return {loai: 'tong_chia_het', so: +m[1], phu_dinh: /tổng[^.;?]{0,30}?không\s*(?:chia hết|⋮)/.test(t)};
  if ((m = /tổng[^.;?]{0,30}?(bằng|lớn hơn|nhỏ hơn)\s*(\d+)/.exec(t))) return {loai: {'bằng': 'tong_bang', 'lớn hơn': 'tong_lon_hon', 'nhỏ hơn': 'tong_nho_hon'}[m[1]], so: +m[2]};
  return null;
}
function thoaBienCo_(gt, bc) {
  if (!bc || gt.some(function (v) { return typeof v !== 'number'; })) return null;
  var tich = 1, tong = 0, k = +bc.so || 0, ok;
  gt.forEach(function (v) { tich *= v; tong += v; });
  if (bc.loai === 'tich_chia_het') ok = !!k && tich % k === 0;
  else if (bc.loai === 'tong_chia_het') ok = !!k && tong % k === 0;
  else if (bc.loai === 'tong_bang') ok = tong === +bc.so;
  else if (bc.loai === 'tong_lon_hon') ok = tong > +bc.so;
  else if (bc.loai === 'tong_nho_hon') ok = tong < +bc.so;
  else return null;
  return bc.phu_dinh ? !ok : ok;
}
function nhomTuBienCo_(gt, bc) {
  if (!bc) return [];
  var k = +bc.so;
  if (bc.loai === 'tich_chia_het' && k === 4) return [
    {nhan: '\\vdots 4', mau: 'vang', phan_tu: gt.filter(function (v) { return v2_(v) >= 2; })},
    {nhan: '\\text{chẵn, không } \\vdots 4', mau: 'cyan', phan_tu: gt.filter(function (v) { return v2_(v) === 1; })},
    {nhan: '\\text{lẻ}', mau: 'xam', phan_tu: gt.filter(function (v) { return v % 2 !== 0; })}];
  if (bc.loai === 'tich_chia_het' && k >= 2) return [
    {nhan: '\\vdots ' + k, mau: 'vang', phan_tu: gt.filter(function (v) { return v % k === 0; })},
    {nhan: '\\text{không } \\vdots ' + k, mau: 'xam', phan_tu: gt.filter(function (v) { return v % k !== 0; })}];
  return [{nhan: '\\text{chẵn}', mau: 'cyan', phan_tu: gt.filter(function (v) { return v % 2 === 0; })},
    {nhan: '\\text{lẻ}', mau: 'hong', phan_tu: gt.filter(function (v) { return v % 2 !== 0; })}];
}
function toHop_(n, k) { if (k < 0 || k > n) return 0; var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
function ucln_(a, b) { while (b) { var t = a % b; a = b; b = t; } return Math.abs(a); }
// giá trị xác suất trong chuỗi đáp án -> {p, sai} | null
function giaTriDapAn_(dap) {
  var s = String(dap || '').replace(/\{,\}/g, ','), m;
  if ((m = /\\[dt]?frac\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}/.exec(s) || /(^|[^\d.,])(\d+)\s*\/\s*(\d+)(?![\d.,])/.exec(s))) {
    var a = m.length === 4 ? +m[2] : +m[1], b = m.length === 4 ? +m[3] : +m[2];
    return b ? {p: a / b, sai: 1e-9} : null;
  }
  if ((m = /(^|[^\d.,])(\d+(?:[.,](\d+))?)\s*%/.exec(s))) return {p: parseFloat(m[2].replace(',', '.')) / 100, sai: 5 * Math.pow(10, -((m[3] || '').length + 3))};
  if ((m = /(^|[^\d.,])(0[.,](\d+))(?!\d)/.exec(s))) return {p: parseFloat(m[2].replace(',', '.')), sai: 5 * Math.pow(10, -(m[3].length + 1))};
  return null;
}
// rut_mau: {phan_tu, nhom (theo giá trị), n_omega, n_a, p, khop}
function tinhRutMau_(ts, kb) {
  ts = ts || {};
  var de = String((kb && kb.de_bai) || ''), sua = [];
  var vat = /^(the|bi|xuc_xac)$/.test(ts.vat) ? ts.vat : /xúc xắc/i.test(de) ? 'xuc_xac' : /viên bi|\bbi\b|quả cầu|quả bóng/i.test(de) ? 'bi' : 'the';
  if (vat === 'bi') return {vat: 'bi', sua: sua};   // bi cùng màu không đánh số: nhóm theo số lượng là đúng bản chất (Python dựng chi tiết)
  var gt;
  if (Array.isArray(ts.phan_tu) && ts.phan_tu.length) gt = ts.phan_tu.map(Number).filter(isFinite).slice(0, 40);
  else {
    var tu = 1, den = +(ts.den || ts.N) || 0, m;
    if (vat === 'xuc_xac') den = 6;
    else if (!den && (m = /(?:từ|đánh số)\s*(\d+)\s*(?:đến|tới|-)\s*(\d+)/.exec(de))) { tu = +m[1]; den = +m[2]; }
    else if (!den && (m = /(\d+)\s*(?:tấm\s*)?thẻ/.exec(de))) den = +m[1];
    den = den || 10; gt = [];
    for (var v = tu; v <= Math.min(den, tu + 39); v++) gt.push(v);
  }
  var k = +ts.k, m2;
  if (!k && (m2 = /(?:lấy|chọn|rút|bốc)\s*(?:ra\s*)?(?:ngẫu nhiên\s*)?(?:đồng thời\s*|cùng lúc\s*)?(\d+)/i.exec(de))) k = +m2[1];
  k = Math.max(1, Math.min(k || 2, gt.length));
  var bc = ts.bien_co && ts.bien_co.loai ? ts.bien_co : suyBienCo_(de);
  // nhóm THEO GIÁ TRỊ — tuyệt đối không tô theo chỉ số ô
  var nhom = [], hong = false;
  (Array.isArray(ts.nhom) ? ts.nhom : []).slice(0, 5).forEach(function (g) {
    if (hong || !g) return;
    var ds;
    if (Array.isArray(g.phan_tu) && g.phan_tu.length) ds = g.phan_tu.map(Number).filter(function (x) { return gt.indexOf(x) >= 0; });
    else {
      var f = viTuNhan_(g.nhan);
      if (!f) { hong = true; return; }
      ds = gt.filter(f);
      sua.push('rut_mau: nhóm "' + texSangChu_(g.nhan) + '" ghi số lượng -> tô theo giá trị [' + ds.join(', ') + ']');
    }
    nhom.push({nhan: g.nhan, mau: g.mau, phan_tu: ds});
  });
  if (hong || !nhom.length) { nhom = bc ? nhomTuBienCo_(gt, bc) : []; if (nhom.length) sua.push('rut_mau: dựng nhóm từ bản chất biến cố'); }
  var da = {};
  nhom.slice().sort(function (a, b) { return a.phan_tu.length - b.phan_tu.length; }).forEach(function (g) {
    g.phan_tu = g.phan_tu.filter(function (v) { if (da[v]) return false; da[v] = 1; return true; });
  });
  nhom = nhom.filter(function (g) { return g.phan_tu.length; });
  var nO = vat === 'xuc_xac' ? Math.pow(gt.length, k) : toHop_(gt.length, k), nA = null;
  if (bc) {
    var dem = 0, n = gt.length, tong = 0;
    if (nO <= TRAN_VET_CAN_) {
      // vét cạn tổ hợp (không hoàn lại) / chỉnh hợp lặp (xúc xắc)
      var chi = [];
      var duyet = function (bd, sau) {
        if (sau === k) { tong++; if (thoaBienCo_(chi.map(function (i) { return gt[i]; }), bc)) dem++; return; }
        for (var i = vat === 'xuc_xac' ? 0 : bd; i < n; i++) { chi.push(i); duyet(i + 1, sau + 1); chi.pop(); }
      };
      duyet(0, 0);
      nA = dem;
    } else {
      // n(Ω) quá lớn: lấy mẫu 20 000 lần (hạt giống cố định) -> ước lượng, không treo script
      var hat = 96, ngau = function () { hat = (hat * 1103515245 + 12345) % 2147483648; return hat / 2147483648; };
      for (var lan = 0; lan < 20000; lan++) {
        var chon = [], co = {};
        while (chon.length < k) { var j = Math.floor(ngau() * n); if (vat === 'xuc_xac' || !co[j]) { co[j] = 1; chon.push(gt[j]); } }
        if (thoaBienCo_(chon, bc)) dem++;
      }
      nA = Math.round(dem / 20000 * nO);
    }
  }
  var kq = {vat: vat, k: k, phan_tu: gt, nhom: nhom, n_omega: nO, bien_co: bc, vet_can: nO <= TRAN_VET_CAN_, sua: sua};
  if (nA !== null) {
    var g = ucln_(nA, nO) || 1;
    kq.n_a = nA; kq.p = nA / nO; kq.p_tex = nA % nO === 0 ? String(nA / nO) : '\\dfrac{' + nA / g + '}{' + nO / g + '}';
    var d = giaTriDapAn_((kb && (kb.dap_an_cuoi || kb.dap_an)) || '');
    kq.khop = d ? Math.abs(d.p - kq.p) <= (kq.vet_can ? d.sai : Math.max(d.sai, 0.01)) : null;
  }
  return kq;
}
// so_do_cay / luoi_bayes / cot_phan_phoi: kiểm số học tối thiểu (tổng nhánh = 1, P(A|B) khớp đáp án)
function docTiLe_(x) {
  if (typeof x === 'number') return x;
  var s = String(x || '').replace(/\{,\}/g, ',').replace(/\s/g, ''), m;
  if ((m = /^\\[dt]?frac\{(\d+)\}\{(\d+)\}$/.exec(s) || /^(\d+)\/(\d+)$/.exec(s))) return +m[2] ? +m[1] / +m[2] : null;
  if ((m = /^(\d+(?:[.,]\d+)?)%$/.exec(s))) return parseFloat(m[1].replace(',', '.')) / 100;
  return /^\d+(?:[.,]\d+)?$/.test(s) ? parseFloat(s.replace(',', '.')) : null;
}
function kiemBayes_(ts, kb) {
  var A = ts.A || {}, pa = docTiLe_(A.p != null ? A.p : ts.p_A), pba = docTiLe_(ts.p_B_A), pbna = docTiLe_(ts.p_B_khong_A);
  if (pa === null || pba === null || pbna === null || !(pa > 0 && pa < 1)) return {hop_le: false};
  var pb = pa * pba + (1 - pa) * pbna, p = ts.hoi === 'B' || ts.hoi === 'toan_phan' ? pb : (pb ? pa * pba / pb : null);
  var d = giaTriDapAn_((kb && (kb.dap_an_cuoi || kb.dap_an)) || '');
  return {hop_le: true, p: p, khop: d && p !== null ? Math.abs(d.p - p) <= Math.max(d.sai, 1e-4) : null};
}

/* ===================== AUTO-FIX TỔNG ===================== */
function tuSuaSanKhau_(kb, r) {
  var sua = [];
  if (!kb || !kb.khung4tang || typeof kb.khung4tang !== 'object') return sua;
  var k4 = kb.khung4tang;
  if (r && r.chi_dao && !kb.chi_dao) kb.chi_dao = String(r.chi_dao).slice(0, 200);
  var q = chonSanKhau_(kb, r);
  kb._v96_loi = [];
  // v101.5: đã định tuyến vào sân khấu 2D chuyên dụng (chỉ đạo / AI chọn rõ) -> đồng bộ hợp đồng, không để sót san_khau_dich = tu_sinh_svg
  // (nếu sót, dungTuSinh_ vẫn đòi mã tu_sinh và Mắt thần báo nhầm tu_sinh_hong dù sân khấu chuyên dụng đã dựng hợp lệ)
  if (kb.san_khau_dich === 'tu_sinh_svg' && (q.nguon === 'chi_dao' || q.nguon === 'ai') && LOAI_SAN_KHAU_.indexOf(q.loai) >= 0) {
    kb.san_khau_dich = q.loai;
    delete kb.tu_sinh_hong;
    sua.push('san_khau_dich tu_sinh_svg -> ' + q.loai + ' (khớp định tuyến ' + q.nguon + ')');
  }
  if (q.loai !== 'hinh_hoc' && q.loai !== '3d_vector') {
    var cu = k4.san_khau && typeof k4.san_khau === 'object' ? k4.san_khau : {};
    var ts = cu.loai === q.loai && cu.tham_so && typeof cu.tham_so === 'object' ? cu.tham_so : {};
    var c3 = k4.canh_3d_vector || {};
    if (q.loai === 'rut_mau' && !Object.keys(ts).length && c3.khuon === 'luoi_the_bi_xac_suat' && c3.tham_so) { ts = JSON.parse(JSON.stringify(c3.tham_so)); delete ts.chon; }
    if (q.loai === 'rut_mau') {
      var rm = tinhRutMau_(ts, kb);
      sua = sua.concat(rm.sua);
      if (rm.vat !== 'bi') {
        ts.vat = rm.vat; ts.k = rm.k; ts.phan_tu = rm.phan_tu;
        ts.nhom = rm.nhom.map(function (g) { return {nhan: chuanKhongChiaHet_(g.nhan, 'tex'), mau: g.mau, phan_tu: g.phan_tu}; });
        if (rm.bien_co) ts.bien_co = rm.bien_co;
        if (rm.khop === false) kb._v96_loi.push('XS_SAI_DAP_SO: máy đếm n(A) = ' + rm.n_a + ', n(Ω) = ' + rm.n_omega + ' -> P(A) = ' + texSangChu_(rm.p_tex) +
          (rm.vet_can ? '' : ' (ước lượng lấy mẫu)') + ' khác đáp án "' + (kb.dap_an_cuoi || kb.dap_an) + '". Kiểm lại cách đếm biến cố.');
      }
    } else if (q.loai === 'luoi_bayes') {
      var kbz = kiemBayes_(ts, kb);
      if (kbz.hop_le && kbz.khop === false) kb._v96_loi.push('XS_SAI_DAP_SO: lưới Bayes tính được ' + kbz.p.toFixed(4) + ' khác đáp án "' + (kb.dap_an_cuoi || kb.dap_an) + '".');
    }
    k4.san_khau = {loai: q.loai, tham_so: ts, pha: Array.isArray(cu.pha) && cu.loai === q.loai ? cu.pha : []};
    if (q.chi_dao) k4.san_khau.chi_dao = q.chi_dao;
    // sân khấu 2D thay khuôn 3D: bỏ khuôn sai ngữ cảnh (lưới thẻ cũ / hộp nhét vào đề đại số)
    if (k4.canh_3d_vector) { delete k4.canh_3d_vector; sua.push('sân khấu 2D ' + q.loai + ' (' + q.nguon + ') thay khuôn 3D'); }
    else sua.push('sân khấu 2D ' + q.loai + ' (' + q.nguon + ')');
  } else if (k4.san_khau && q.loai === '3d_vector') { delete k4.san_khau; }
  sua = sua.concat(tuSuaKyHieuV96_(kb), tuSuaDocLapDe_(kb), tuSuaCutCongThuc_(kb));
  return sua;
}
// ký hiệu "không chia hết" + mã thô ở trường chữ thường (Intro / Outro / CTA)
function tuSuaKyHieuV96_(kb) {
  var dem = 0, k4 = kb.khung4tang || {};
  var doi = function (o, k, kieu) { if (o && typeof o[k] === 'string') { var m = chuanKhongChiaHet_(o[k], kieu); if (m !== o[k]) { o[k] = m; dem++; } } };
  (k4.buoc || []).forEach(function (b) {
    doi(b, 'tieu_de', 'tron'); doi(b, 'nhan', 'tron');
    (b.the || []).forEach(function (t) {
      if (Array.isArray(t.dong)) t.dong = t.dong.map(function (d) { var m = chuanKhongChiaHet_(d, 'tex'); if (m !== d) dem++; return m; });
      doi(t, 'noi_dung', 'tron'); doi(t, 'nhan', 'tron');
    });
  });
  (k4.de_ghim || []).forEach(function (d) { doi(d, 'nhan', 'tex'); });
  (kb.canh || []).forEach(function (c) {
    if (Array.isArray(c.noi_dung_man_hinh)) c.noi_dung_man_hinh = c.noi_dung_man_hinh.map(function (d) { return typeof d === 'string' ? chuanKhongChiaHet_(d, 'tex') : d; });
  });
  (kb.tom_tat_3_buoc || []).forEach(function (d) { doi(d, 'chien_thuat', 'tron'); doi(d, 'cong_thuc', 'tex'); });
  ['tieu_de_intro', 'phu_de_intro', 'cau_hook', 'cta', 'nhan_thi'].forEach(function (k) {
    if (typeof kb[k] === 'string' && (RE_MA_THO_.test(kb[k]) || RE_KHONG_CHIA_HET_.test(kb[k]))) { kb[k] = texSangChu_(kb[k]); dem++; }
    RE_KHONG_CHIA_HET_.lastIndex = 0;
  });
  return dem ? ['v96: chuẩn ký hiệu "không chia hết" / mã TeX thô ở ' + dem + ' chỗ'] : [];
}
// đọc đề đúng 1 lần: bỏ cảnh mở đầu / nhắc lại đọc lại đề, đánh số lại cảnh + bước khung 4 tầng
function tuSuaDocLapDe_(kb) {
  var lap = canhLapDe_(kb);
  if (!lap.length) return [];
  var xoa = lap.filter(function (i) { return /^(mo_dau|hook|de_bai|nhac_lai|dat_van_de|nhac_de)$/.test(String((kb.canh[i] || {}).loai || '')); });
  // giữ cảnh mo_dau ngắn nhất làm câu hỏi nếu cảnh bị trùng là de_bai đầu tiên -> đơn giản: luôn giữ cảnh đọc đề ĐẦU TIÊN
  if (!xoa.length) return [];
  var giu = [], moi = {};
  kb.canh.forEach(function (c, i) { if (xoa.indexOf(i) < 0) { moi[i + 1] = giu.length + 1; giu.push(c); } });
  giu.forEach(function (c, i) { c.so = i + 1; });
  kb.canh = giu;
  ((kb.khung4tang || {}).buoc || []).forEach(function (b) {
    if (b && b.canh !== undefined) {
      var c = +b.canh, t = c;
      while (t > 1 && moi[t] === undefined) t--;
      b.canh = moi[t] || 1;
      if (c && moi[c] === undefined && b.khi_noi) delete b.khi_noi;
    }
  });
  return ['v96: bỏ ' + xoa.length + ' cảnh đọc lặp đề (đọc đề đúng 1 lần)'];
}
// v102: câu CUỐI của lời thoại chỉ là GIẢI THÍCH KHÁI NIỆM / LÝ THUYẾT (vd "Đạo hàm theo thời gian cho mình mối liên hệ giữa hai vận tốc")
// -> KHÔNG phải vế trái của một phép tính, tuyệt đối không nối "bằng <số>" (trước đây Auto-fix chèn "bằng 0" vô nghĩa vào loại câu này).
// Chỉ coi là câu giải thích khi có dấu hiệu giảng khái niệm và KHÔNG có dấu hiệu đang tính ("ta có", thay, nhân, cộng, trừ, chia, tính, bằng, được).
function laCauGiaiThichKhaiNiem_(loi) {
  var cau = String(loi || '').split(/[.!?…]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  var cuoi = cau.length ? cau[cau.length - 1] : '';
  if (!cuoi) return false;
  var tinh = /(?:^|\s)(?:ta\s+có|thay|nhân|cộng|trừ|chia|tính|bằng|được|ra\s*$|suy\s+ra|vậy)(?:\s|$)/i.test(cuoi) || /\d/.test(cuoi) || /bằng\s*$/i.test(cuoi);
  var khaiNiem = /mối\s+liên\s+hệ|liên\s+hệ\s+giữa|quan\s+hệ\s+giữa|cho\s+(?:mình|ta|chúng\s+ta|bạn|biết)|nghĩa\s+là|tức\s+là|giúp|thể\s+hiện|biểu\s+diễn|mô\s+tả|áp\s+dụng|dùng\s+khi|khi\s+nào|vì\s+sao|tại\s+sao|bản\s+chất|ý\s+nghĩa|khái\s+niệm|quy\s+tắc|định\s+lý|nguyên\s+lý|hiểu\s+rằng|nhớ\s+rằng|lưu\s+ý/i.test(cuoi);
  if (tinh) return false;
  return khaiNiem || cuoi.split(/\s+/).length >= 16;
}
// đọc đủ công thức: lời thoại phải nói ra số kết quả của dòng màn hình "... = số"
function tuSuaCutCongThuc_(kb) {
  var dem = 0;
  (kb.canh || []).forEach(function (c) {
    if (!c || !Array.isArray(c.noi_dung_man_hinh) || /ket_luan|bai_hoc|cta/.test(String(c.loai || ''))) return;
    c.noi_dung_man_hinh.forEach(function (d) {
      var so = soKetQuaDong_(d);
      if (!so || loiNoiSo_(c.loi_thoai, so)) return;
      if (laCauGiaiThichKhaiNiem_(c.loi_thoai)) return;   // v102: câu giải thích khái niệm không bị nối "bằng <số>"
      // v99.1: câu đã kết bằng "bằng / là <một con số>" (AI đọc kết quả theo cách khác) -> không nối thêm vế lặp
      if (/(?:bằng|=|là|được)\s*[\d.,/]+\s*[^\s\d]{0,12}\s*[.!…]*\s*$/i.test(String(c.loi_thoai || ''))) return;
      var hien = so.replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$1/$2');
      c.loi_thoai = String(c.loi_thoai || '').replace(/\s*[.!…]*\s*$/, '') + ' bằng ' + hien + '.';
      dem++;
    });
  });
  return dem ? ['v96: bổ sung đáp số vào ' + dem + ' câu đọc cụt công thức'] : [];
}
// lỗi cứng còn lại sau Auto-fix
function loiSanKhau_(kb) {
  var nang = (kb && kb._v96_loi) || [];
  if (!kb || !kb.khung4tang) return nang;
  var lap = canhLapDe_(kb);
  if (lap.length) nang = nang.concat(['KB_DOC_LAP_DE: cảnh ' + lap.map(function (i) { return i + 1; }).join(', ') + ' đọc lại đề lần nữa. Chỉ đọc tóm tắt đề ĐÚNG 1 lần (1-2 câu, 5-7 giây).']);
  var cut = [];
  (kb.canh || []).forEach(function (c, i) {
    (c && Array.isArray(c.noi_dung_man_hinh) ? c.noi_dung_man_hinh : []).forEach(function (d) {
      var so = soKetQuaDong_(d);
      if (so && !loiNoiSo_(c.loi_thoai, so) && !laCauGiaiThichKhaiNiem_(c.loi_thoai) && !/ket_luan|bai_hoc|cta/.test(String(c.loai || ''))) cut.push('cảnh ' + (i + 1) + ' (' + so + ')');
    });
  });
  if (cut.length) nang.push('KB_CUT_CONG_THUC: lời thoại không đọc ra kết quả ' + cut.slice(0, 3).join(', ') + '. Đọc đủ biểu thức và đáp số.');
  var tho = ['tieu_de_intro', 'phu_de_intro', 'cau_hook', 'cta'].filter(function (k) { return typeof kb[k] === 'string' && RE_MA_THO_.test(kb[k]); });
  if (tho.length) nang.push('MA_THO_HIEN_THI: mã TeX thô ở ' + tho.join(', ') + ' (trường chữ thường không dựng KaTeX).');
  return nang;
}

/* ===================== PROMPT ===================== */
function huongDanSanKhau_(r) {
  var lop = String((r && r.lop) || ''), cd = docChiDao_((r && r.chi_dao) || '');
  var bayes = lop === '12' ? ' | {"loai":"luoi_bayes","tham_so":{"A":{"nhan":"mắc bệnh","p":"1%"},"B":{"nhan":"dương tính"},"p_B_A":"99%","p_B_khong_A":"5%","hoi":"A|B"},"pha":[vuong, cat_doc, cat_ngang, giao, ket]} (CHỈ lớp 12: xét nghiệm, kiểm định, Bayes)' : '';
  return 'SÂN KHẤU 2D (v96, tầng 2): thêm "khung4tang.san_khau" = {"loai","tham_so","pha":[{"ten","khi_noi":"cụm NGUYÊN VĂN lời đọc lúc chuyển pha"}]}. Máy TỰ TÍNH mọi con số (n(Ω), n(A), P, tích các nhánh, điểm tối ưu) và đối chiếu đáp án. ' +
    'XÁC SUẤT: {"loai":"rut_mau","tham_so":{"vat":"the|bi|xuc_xac","tu":1,"den":10,"k":3,"bien_co":{"loai":"tich_chia_het|tong_chia_het|tong_bang|tong_lon_hon|tong_nho_hon|it_nhat_mot|dung|cung_nhom|khac_nhom","so":4,"phu_dinh":false},' +
    '"nhom":[{"nhan":"\\\\vdots 4","mau":"vang","phan_tu":[4,8]},{"nhan":"\\\\text{chẵn, không } \\\\vdots 4","mau":"cyan","phan_tu":[2,6,10]},{"nhan":"\\\\text{lẻ}","mau":"xam","phan_tu":[1,3,5,7,9]}]},' +
    '"pha":[hien, nhom, khong_gian_mau, thu {"chon":[1,2,3] = GIÁ TRỊ trên thẻ}, doi, ket]} — nhóm BẮT BUỘC liệt kê GIÁ TRỊ phần tử (phan_tu), cấm chỉ ghi số lượng; pha "thu"/"doi" lúc giảng biến cố đối chọn bộ thuộc \\overline{A}, pha "ket" (chốt P(A)) chọn bộ THỎA A' +
    ' | {"loai":"so_do_cay","tham_so":{"tang":["Lần 1","Lần 2"],"goc":{"con":[{"nhan":"Trúng","p":"0,8","con":[{"nhan":"Trúng","p":"0,8"},{"nhan":"Trượt","p":"0,2"}]},{"nhan":"Trượt","p":"0,2","con":[...]}]},"duong":[[0,1],[1,0]] (chỉ số nhánh của các đường thỏa)},"pha":[goc, tang_1, tang_2, duong, tich, ket]}' + bayes +
    ' | {"loai":"cot_phan_phoi","tham_so":{"nhi_thuc":{"n":5,"p":"0,25"} hoặc "cot":[{"nhan":"0","p":"1/8"}...],"dich":[3,4,5]},"pha":[truc, cot, dich, cong, ket]}. ' +
    'THỰC TẾ KHÔNG CÓ VẬT KHỐI: {"loai":"kinh_te_do_thi","tham_so":{"ham":"(20-x)(200+20x)","bien":"x","mien":[0,20],"kieu":"max","ten_ham":"L","nhan_bien":"Giảm giá x (nghìn đồng)","phu":[{"ten":"Giá bán","ham":"30-x","don_vi":"k"}]},"pha":[truc, ve, keo, toi_uu, ket]}' +
    ' | {"loai":"so_do_2d","tham_so":{"mau":"song_bo|day_cap|cong_parabol|rao_tuong|thang_tuong","tham_so":{"rong":3,"dai":8} (day_cap: h1,h2,d; cong_parabol: rong,cao; rao_tuong: L; thang_tuong: h),"bien":"x","mien":[0,8],"ham":"tổng thời gian/độ dài theo x","kieu":"min","ten_ham":"T"},"pha":[hinh, bien, keo, toi_uu, ket]}' +
    ' | {"loai":"tang_truong","tham_so":{"ham":"100*(1+0.06)^t","bien":"t","mien":[0,10],"moc":[0,10],"ten_ham":"T","don_vi":"triệu"},"pha":[truc, ve, moc, so_sanh, ket]}' +
    ' | {"loai":"tu_duy_dai_so"} (đề đại số / giải tích thuần / đề lạ: máy dựng sơ đồ suy luận từ các bước, khóa màu ẩn số — KHÔNG nhét hình hộp). ' +
    'Ký hiệu "không chia hết": công thức viết "\\\\text{ không } \\\\vdots 4", tiêu đề viết "không \\\\vdots 4"; CẤM \\\\not\\\\vdots, \\\\nmid. ' +
    'Hook 2 giây đầu: pha đầu (hien/goc/truc) bật ngay, KHÔNG để sân khấu đứng yên.\n' +
    (cd.loi ? 'CHỈ ĐẠO CỦA NGƯỜI DÙNG (ƯU TIÊN TUYỆT ĐỐI, trong giới hạn GDPT 2018): "' + cd.loi + '"' + (cd.loai ? ' -> dùng sân khấu "' + (cd.loai === 'luoi_bayes' && lop !== '12' ? 'so_do_cay' : cd.loai) + '"' : '') + '; dàn cảnh, lời giảng và thứ tự pha theo đúng ý này.\n' : '');
}

// sinh đề đa dạng: xác suất xoay vòng bối cảnh đời thực; thực tế xen kẽ khuôn 3D (null -> dùng khuôn cũ) với 3 nhóm 2D
var BOI_CANH_XS_ = [
  'xét nghiệm y tế (độ nhạy / tỉ lệ dương tính giả)', 'khoanh lụi trắc nghiệm (đúng ít nhất k câu)', 'tỉ lệ rơi vật phẩm trong trò chơi (mở hộp nhiều lần)',
  'kiểm định lô hàng (lấy mẫu sản phẩm lỗi)', 'mật khẩu / lập số tự nhiên từ các chữ số', 'bốc thăm chia đội / chọn ban cán sự',
  'rút thẻ đánh số (tích / tổng chia hết)', 'bắn cung / ném bóng nhiều lượt độc lập', 'gieo xúc xắc (tổng điểm)', 'hai nhà máy / hai phân xưởng sản xuất (xác suất toàn phần)'
];
function yeuCauDaDangSinhDe_(lop, mon) {
  mon = String(mon || '').toUpperCase();
  var p = typeof PropertiesService !== 'undefined' ? PropertiesService.getScriptProperties() : null;
  var lay = function (k, n) { if (!p) return 0; var v = Number(p.getProperty(k) || 0); p.setProperty(k, String((v + 1) % 997)); return v % n; };
  if (mon === 'XAC_SUAT') {
    var ds = BOI_CANH_XS_.filter(function (b) { return String(lop) === '12' || !/y tế|nhà máy/.test(b); });
    var bc = ds[lay('BOI_CANH_XS_KE', ds.length)];
    return '\nBỐI CẢNH LẦN NÀY (BẮT BUỘC, v96 đa dạng hóa xác suất): ' + bc + '. Đề phải dựng được bằng một trong các sân khấu 2D: rut_mau | so_do_cay | cot_phan_phoi' +
      (String(lop) === '12' ? ' | luoi_bayes (xác suất có điều kiện / Bayes lớp 12)' : '') + '. Thêm vào mỗi phần tử JSON trường "san_khau" (tên sân khấu dự định).\n';
  }
  if (mon === 'THUC_TE') {
    var vong = ['3d', 'kinh_te_do_thi', '3d', 'so_do_2d', 'tang_truong'];
    var v = vong[lay('NHOM_TT_KE', vong.length)];
    if (v === '3d') return null;
    var mo = {kinh_te_do_thi: 'KINH TẾ: giá bán ↔ lượng khách ↔ doanh thu / lợi nhuận tối ưu (hàm bậc 2 hoặc bậc 3)',
      so_do_2d: 'CHUYỂN ĐỘNG / KHOẢNG CÁCH 2D: chèo thuyền qua sông rồi chạy bờ, kéo dây cáp giữa hai cột, hình chữ nhật dưới cổng parabol, rào khu đất sát tường',
      tang_truong: 'TĂNG TRƯỞNG / LÃI SUẤT / HÀM MŨ – LOGARIT: lãi kép, dân số, vi khuẩn, phân rã (so sánh mốc đầu - mốc đích)'}[v];
    return '\nNHÓM ĐỀ LẦN NÀY (BẮT BUỘC, v96): ' + mo + '. KHÔNG ra đề gập hộp / hình khối. Đúng chương trình lớp ' + lop + (String(lop) !== '12' && v === 'tang_truong' ? ' (lớp ' + lop + ': chỉ lãi đơn / cấp số nhân đơn giản, không logarit nếu chưa học)' : '') +
      '. Thêm vào mỗi phần tử JSON trường "san_khau":"' + v + '".\n';
  }
  return null;
}
