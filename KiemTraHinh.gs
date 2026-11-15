/**
 * KIỂM TRA HÌNH MINH HỌA TRONG KỊCH BẢN (dán thành tệp KiemTraHinh.gs, cùng dự án với Code.gs)
 * Mục đích: bắt kịch bản mà phần mô tả hình minh họa thiếu/sai dạng NGAY khi viết, rồi buộc Gemini viết lại,
 * thay vì để bộ phận dựng video phải thay bằng "thẻ mô tả" nhàm chán.
 * Quy tắc phải khớp với src/bocuc.ts và src/sankhau/dulieu.ts của bộ phận dựng video.
 * Bản này thêm: kiểm tra "san_khau" (vật thật + hành động), tiêu đề cảnh, và tuSuaKichBan_() tự sửa lỗi vặt để đỡ gọi lại Gemini.
 */

var LOAI_VAT_ = ['canh_that', 'nguoi', 'the', 'the_bai', 'xuc_xac', 'dong_xu', 'hop_bi', 'tui', 'hop_qua', 'dong_ho', 'dien_thoai', 'bong_bay',
  'dong_ho_do', 'bieu_do_cot', 'thanh', 'vong_quay', 'cua', 'banh', 'nhan', 'chu', 'so_dem', 'mui_ten', 'bieu_tuong', 'luoi_o', 'danh_sach', 'ban_tron', 'anh_that',
  'khoi_hop', 'tru', 'non', 'cau', 'toa_nha', 'xe', 'cay', 'thang', 'hinh_hoc', 'do_thi', 'hinh_tu_do'];
var VAT_3D_ = ['khoi_hop', 'tru', 'non', 'cau', 'toa_nha', 'xe', 'cay', 'thang', 'xuc_xac', 'hop_bi', 'hop_qua', 'cua'];   // vật 3D thật (cảnh đời thực)
var VAT_MO_HINH_ = ['hinh_hoc', 'do_thi', 'hinh_tu_do', 'canh_that'];   // canh_that: cảnh thực tế tự dựng cũng là hình vẽ của đề
var TU_VAT_3D_ = {
  khoi_hop: /hộp|bể|thùng|phòng|khối|lăng trụ|container|tủ/, tru: /trụ|lon|cốc|bồn|ống nước|bình|thùng phi|cột tròn/, non: /nón|phễu|chóp nón/,
  cau: /cầu|quả bóng|bóng/, toa_nha: /nhà|tòa|tháp|cột|building/, thang: /thang/, xe: /xe|ô tô|tàu/, cay: /cây/
};
var KIEU_NET_ = ['da_giac', 'duong', 'mui_ten', 'tron', 'cung', 'chu', 'svg', 'da_giac_deu', 'koch', 'sierpinski', 'tham_so', 'lap', 'xep_chong', 'vat'];
// THƯ VIỆN VẬT THỰC TẾ (nét "vat" của hinh_tu_do) và từ khóa trong đề bắt buộc vẽ đúng vật đó
var TEN_VAT_THUC_ = ['cot_co', 'nguoi', 'toa_nha', 'ngan_hang', 'nha', 'truong_hoc', 'cay', 'cay_thong', 'hai_dang', 'thap_nuoc', 'cot_dien', 'den_duong',
  'nui', 'mat_troi', 'xe_hoi', 'thuyen', 'may_bay', 'khinh_khi_cau', 'cau', 'song', 'thang', 'tien', 'heo_dat', 'dieu', 'tuong', 'ho_nuoc',
  'hang_rao', 'cong_trinh', 'cua_hang', 'xe_may', 'xe_dap', 'xe_buyt', 'con_duong', 'qua_bong', 'ro_bong_ro', 'gieng', 'cong', 'bieu_tuong',
  'ban', 'ghe', 'ti_vi', 'kim_tu_thap', 'thap'];
var TU_VAT_THUC_ = [
  [/cái bàn|chiếc bàn|mặt bàn|bàn học|bàn ăn|bàn làm việc|bàn gỗ|chân bàn/, ['ban', '@ban_tron'], 'cái bàn (vẽ bàn có mặt bàn + chân, KHÔNG vẽ khối hộp)'],
  [/cái ghế|chiếc ghế|dãy ghế|ghế ngồi/, ['ghe', '@nguoi', '@ban_tron'], 'cái ghế'], [/ti vi|tivi|tv\b|màn hình/, ['ti_vi'], 'cái ti vi / màn hình'],
  [/kim tự tháp/, ['kim_tu_thap'], 'kim tự tháp'], [/tháp truyền hình|tháp phát sóng|tháp ăng|tháp thép|tháp eiffel|tháp sắt/, ['thap'], 'tháp thép / tháp truyền hình'],
  [/cột cờ/, ['cot_co'], 'cột cờ'], [/ngân hàng|gửi tiết kiệm|gửi tiền|sổ tiết kiệm/, ['ngan_hang', 'tien', 'heo_dat'], 'ngân hàng / tiền gửi'],
  [/tòa nhà|toà nhà|chung cư|cao ốc|nhà cao tầng/, ['toa_nha'], 'tòa nhà'], [/ngôi nhà|căn nhà|mái nhà/, ['nha', 'toa_nha'], 'ngôi nhà'],
  [/trường học|sân trường/, ['truong_hoc', 'cot_co'], 'trường học'], [/cây|cái cây|cây cao|bóng cây/, ['cay', 'cay_thong'], 'cái cây'],
  [/hải đăng/, ['hai_dang'], 'ngọn hải đăng'], [/tháp nước|bồn nước trên cao/, ['thap_nuoc'], 'tháp nước'], [/cột điện/, ['cot_dien'], 'cột điện'],
  [/đèn đường|cột đèn/, ['den_duong'], 'cột đèn'], [/ngọn núi|quả đồi|đỉnh núi/, ['nui'], 'ngọn núi'], [/mặt trời|bóng (của|dài|đổ)/, ['mat_troi'], 'mặt trời / bóng nắng'],
  [/ô tô|xe hơi|ôtô/, ['xe_hoi'], 'ô tô'], [/thuyền|ca nô|tàu thủy|con tàu/, ['thuyen'], 'thuyền'], [/máy bay/, ['may_bay'], 'máy bay'],
  [/khinh khí cầu/, ['khinh_khi_cau'], 'khinh khí cầu'], [/cây cầu|chiếc cầu|nhịp cầu|cầu bắc/, ['cau'], 'cây cầu'], [/con sông|dòng sông|bờ sông|qua sông/, ['song'], 'dòng sông'],
  [/cái thang|chiếc thang|thang dựa|thang tựa/, ['thang'], 'cái thang'], [/con diều|thả diều/, ['dieu'], 'con diều'], [/bức tường|bờ tường/, ['tuong'], 'bức tường'],
  [/hồ nước|cái hồ|mặt hồ|(^|[\s,.])ao (cá|nước|làng)/, ['ho_nuoc'], 'hồ nước'], [/heo đất|lợn đất/, ['heo_dat'], 'heo đất'],
  [/người quan sát|đứng cách|nhìn lên|nhìn xuống|góc nâng|góc hạ|tầm mắt/, ['nguoi'], 'người quan sát'],
  [/hàng rào|rào xung quanh|rào quanh|làm rào/, ['hang_rao'], 'hàng rào'], [/xe máy/, ['xe_may'], 'xe máy'], [/xe đạp/, ['xe_dap'], 'xe đạp'], [/xe buýt|xe khách/, ['xe_buyt'], 'xe buýt'],
  [/bưu điện|bệnh viện|nhà máy|ủy ban|uỷ ban|nhà văn hóa|khách sạn/, ['cong_trinh'], 'công trình (có biển tên)'], [/cửa hàng|siêu thị|tiệm|quầy hàng|chợ\b/, ['cua_hang'], 'cửa hàng'],
  [/con đường|đường thẳng nối|quãng đường|đoạn đường/, ['con_duong', 'xe_hoi', 'xe_may', 'xe_dap'], 'con đường / xe'], [/rổ bóng|bóng rổ/, ['ro_bong_ro'], 'rổ bóng rổ'], [/cái giếng|giếng nước/, ['gieng'], 'cái giếng'],
  [/mảnh vườn|khu vườn|vườn rau|mảnh đất|thửa ruộng|sân bóng|hồ bơi|bể bơi/, ['@canh_that', '@hinh_hoc', '@hinh_tu_do'], 'mảnh đất / vườn (vẽ nhìn từ trên với canh_that nhin "tren")']
];
// vật 3D cũ cũng chấp nhận được cho một số tên
var THAY_VAT_THUC_ = { toa_nha: ['toa_nha'], nha: ['toa_nha'], cay: ['cay'], cay_thong: ['cay'], xe_hoi: ['xe'], thang: ['thang'], nguoi: ['nguoi'] };
// Sửa canh_that tại chỗ (thay vì vứt cả cảnh): vật lạ -> công trình có biển tên; thiếu mã/số đo -> tự điền; phép đo trỏ điểm không có -> bỏ phép đo đó.
function suaCanhThat_(v, sua, so) {
  var cao0 = typeof CAO_MAC_DINH_ !== 'undefined' ? CAO_MAC_DINH_ : {};
  var vat = Array.isArray(v.vat) ? v.vat.filter(laDT_) : [];
  var x = 0, daMa = {};
  vat.forEach(function (o, i) {
    if (TEN_VAT_THUC_.indexOf(String(o.ten)) < 0) { o.bien = o.bien || String(o.ten || o.nhan || '').replace(/_/g, ' ').slice(0, 20); o.ten = 'cong_trinh'; sua.push('canh_that cảnh ' + so + ': vật lạ -> công trình có biển "' + o.bien + '"'); }
    if (o.ten === 'mat_troi' && o.x === undefined) return;
    if (!laChuoi_(o.ma) || daMa[o.ma]) o.ma = String.fromCharCode(65 + i);
    daMa[o.ma] = 1;
    if (o.ten !== 'thang' || o.dinh_x === undefined) {
      if (!(Number(o.cao) > 0)) o.cao = cao0[o.ten] || 3;
      if (!laSo_(Number(o.x))) o.x = x;
      o.cao = Number(o.cao); o.x = Number(o.x);
      x = Math.max(x, o.x) + Math.max(3, o.cao * 0.8);
    }
  });
  v.vat = vat;
  var neo = {};
  vat.forEach(function (o) { if (o.ma) ['', '.chan', '.dinh', '.mat', '.giua'].forEach(function (h) { neo[o.ma + h] = 1; }); });
  (Array.isArray(v.diem) ? v.diem : []).forEach(function (d) { if (d && d.ma) neo[d.ma] = 1; });
  (Array.isArray(v.vung) ? v.vung : []).forEach(function (z) { if (z && z.ma) ['', '.tl', '.tr', '.bl', '.br', '.giua', '.tren', '.duoi', '.trai', '.phai'].forEach(function (h) { neo[z.ma + h] = 1; }); });
  var truoc = Array.isArray(v.do) ? v.do.length : 0;
  v.do = (Array.isArray(v.do) ? v.do : []).filter(function (d) {
    if (!laDT_(d)) return false;
    var can = [d.tu, d.den, d.vat, d.tai].concat(Array.isArray(d.dinh) ? d.dinh : []).filter(function (a) { return a !== undefined && a !== ''; });
    return can.every(function (a) { return neo[String(a)]; });
  });
  if (v.do.length < truoc) sua.push('canh_that cảnh ' + so + ': bỏ ' + (truoc - v.do.length) + ' phép đo trỏ tới điểm không có');
}

// CẢNH THỰC TẾ TỰ DỰNG (canh_that): kiểm tra tên vật, mã, số đo và mọi điểm neo của phép đo đều trỏ tới vật/điểm có thật.
function kiemTraCanhThat_(v, ev) {
  var nhin = v.nhin === 'tren' ? 'tren' : 'ngang';
  var vat = Array.isArray(v.vat) ? v.vat : [], vung = Array.isArray(v.vung) ? v.vung : [], diem = Array.isArray(v.diem) ? v.diem : [];
  if (!vat.length && !vung.length) return 'HINH_' + ev + ': canh_that cần "vat" (và/hoặc "vung" khi nhin "tren").';
  var neo = {};
  for (var i = 0; i < vat.length; i++) {
    var x = vat[i];
    if (!laDT_(x) || TEN_VAT_THUC_.indexOf(String(x.ten)) < 0) return 'HINH_' + ev + ', vat[' + i + ']: "ten" phải thuộc thư viện: ' + TEN_VAT_THUC_.join(', ') + ' (vật khác: dùng "cong_trinh" kèm "bien" ghi tên, hoặc "bieu_tuong" kèm "emoji").';
    if (x.ten === 'mat_troi' && x.x === undefined) continue;
    if (!laChuoi_(x.ma)) return 'HINH_' + ev + ', vat[' + i + ']: mỗi vật cần "ma" (A, B, C...) để các phép đo trỏ tới.';
    if (x.ten === 'thang' && x.dinh_x !== undefined) { if (!laSo_(x.x) || !laSo_(x.dinh_cao)) return 'HINH_' + ev + ': thang dựa tường cần "x" (chân), "dinh_x", "dinh_cao" (mét).'; }
    else if (!laSo_(x.cao) || x.cao <= 0 || !laSo_(x.x)) return 'HINH_' + ev + ', vật ' + x.ma + ': cần "cao" (mét, > 0) và "x" (vị trí ngang, mét)' + (nhin === 'tren' ? ' và "y"' : '') + '.';
    ['', '.chan', '.dinh', '.mat', '.giua'].forEach(function (h) { neo[x.ma + h] = 1; });
  }
  diem.forEach(function (d) { if (d && d.ma) neo[d.ma] = 1; });
  vung.forEach(function (z) { if (z && z.ma) ['', '.tl', '.tr', '.bl', '.br', '.giua', '.tren', '.duoi', '.trai', '.phai'].forEach(function (h) { neo[z.ma + h] = 1; }); });
  var dsDo = Array.isArray(v.do) ? v.do : [];
  for (var j = 0; j < dsDo.length; j++) {
    var d = dsDo[j];
    if (!laDT_(d)) continue;
    var can = [d.tu, d.den, d.vat, d.tai].concat(Array.isArray(d.dinh) ? d.dinh : []).filter(function (a) { return a !== undefined && a !== ''; });
    for (var q = 0; q < can.length; q++) if (!neo[String(can[q])]) return 'HINH_' + ev + ', do[' + j + '] (' + d.kieu + '): điểm "' + can[q] + '" không có. Dùng mã vật (A), A.dinh, A.mat, A.giua, mã trong "diem"' + (vung.length ? ', hoặc góc vùng V.tl/V.tr/V.bl/V.br' : '') + '.';
  }
  return '';
}

// Cảnh GIẢI THÍCH CÔNG THỨC: loại nhac_lai/kien_thuc/ly_thuyet/cong_thuc/giai_thich..., hoặc cảnh (không phải bước tính) mà lời thoại
// nói về công thức + nguồn gốc / ý nghĩa đại lượng / cách dùng (AI hay đặt tên loại khác nhau).
function laCanhGiaiThichCongThuc_(c) {
  if (!c) return false;
  var l = String(c.loai || '');
  if (/nhac_lai|kien_thuc|ly_thuyet|cong_thuc|giai_thich|nguon_goc|y_nghia|dinh_ly|tinh_chat/.test(l)) return true;
  if (/tinh_toan|dap_an|ket_qua|kiem_tra|bay|loi_sai|mo_dau|de_bai/.test(l)) return false;
  var t = (String(c.tieu_de_canh || '') + ' ' + String(c.loi_thoai || '')).toLowerCase();
  return /công thức|định lý|bất đẳng thức|tính chất/.test(t) && /từ đâu|vì sao|tại sao|nghĩa là|ý nghĩa|đại lượng|chính là|ở đây|áp dụng|dùng khi/.test(t);
}

// ĐIỂM CỦA ĐỀ phải có trên bản vẽ: đề nhắc tới A, A', B, P... (chữ in hoa đứng riêng, "AA'", "A'B") mà bản vẽ không có điểm/vật
// mang tên đó -> lỗi (hình vẽ không giúp người xem theo dõi lời giải). Chỉ xét khi đề có >= 2 điểm.
function diemTrongDe_(de) {
  var ds = [], m, re = /(^|[^A-Za-zÀ-ỹ0-9])((?:[A-Z]'?){1,3})(?![A-Za-zÀ-ỹ0-9])/g;
  while ((m = re.exec(String(de || '')))) {
    (m[2].match(/[A-Z]'?/g) || []).forEach(function (x) { if (ds.indexOf(x) < 0) ds.push(x); });
  }
  return ds.filter(function (x) { return !/^[VSI]$/.test(x); });   // V, S thường là thể tích / diện tích, không phải điểm
}
function kiemTraDiemDe_(bv, deGoc) {
  var can = diemTrongDe_(deGoc);
  if (can.length < 2 || !bv) return [];
  var co = {};
  (bv.diem || []).concat(bv.vat || []).forEach(function (x) { if (x && x.ma) co[String(x.ma)] = 1; });
  var thieu = can.filter(function (x) { return !co[x]; });
  return thieu.length ? ['BAN_VE_THIEU_DIEM: đề nhắc tới điểm ' + thieu.join(', ') + ' nhưng bản vẽ không có. Thêm từng điểm vào "diem" (ma, x, y theo mét, đúng số đo của đề)' +
    (/sông|bờ/i.test(String(deGoc)) ? '; bài qua sông: NHÌN TỪ TRÊN, vung "song" là dải sông, điểm nằm trên hai bờ.' : '.')] : [];
}

// BỐ CỤC PHẢI ĐÚNG CẤU TRÚC ĐỀ: đề "ngồi quanh bàn tròn / xếp vòng tròn" mà hình vẽ người xếp HÀNG NGANG là sai điều kiện bài toán
// (đếm hoán vị vòng khác hẳn xếp hàng). [quy luật đề, vật bắt buộc, mô tả]
var TU_BO_CUC_ = [
  [/bàn tròn|quanh (một )?(cái )?bàn|ngồi quanh|xếp (thành )?(một )?vòng( tròn)?|đứng thành vòng|vòng tròn/, 'ban_tron', 'bàn tròn / xếp vòng tròn']
];
function kiemTraBoCucDe_(kb, deGoc) {
  var de = String(deGoc || '').toLowerCase();
  var loi = [];
  TU_BO_CUC_.forEach(function (m) {
    if (!m[0].test(de)) return;
    var co = (kb.canh || []).slice(0, 8).some(function (c) { var du = c && c.minh_hoa && c.minh_hoa.du_lieu; return du && Array.isArray(du.vat) && du.vat.some(function (v) { return v && v.loai === m[1]; }); });
    if (!co) loi.push('BO_CUC_SAI_DE: đề là ' + m[2] + ' nhưng các cảnh đề bài / mô phỏng không vẽ "' + m[1] + '" (vẽ người xếp hàng ngang là SAI điều kiện bài toán). ' +
      'Dùng {"loai":"' + m[1] + '","ds":["Nam","Nữ",...]} ở cảnh đề bài và các cảnh mô phỏng, chon/loai_bo từng ghế, quay để minh họa xoay vòng.');
  });
  return loi;
}
// Tự sửa: đề bàn tròn -> nhóm người (>= 3) đang xếp hàng ở các cảnh được đổi thành bàn tròn (giữ nhãn, hành động chọn theo ghế).
function tuSuaBoCucDe_(kb, deGoc) {
  var de = String(deGoc || '').toLowerCase();
  if (!TU_BO_CUC_[0][0].test(de) || !kb || !Array.isArray(kb.canh)) return [];
  var sua = [];
  kb.canh.forEach(function (c, i) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    (du && Array.isArray(du.vat) ? du.vat : []).forEach(function (v) {
      if (!v || v.loai !== 'nguoi') return;
      var n = Array.isArray(v.ds) && v.ds.length ? v.ds.length : Number(v.so_luong) || 1;
      if (n < 3 || n > 16) return;
      v.loai = 'ban_tron';
      if (!Array.isArray(v.ds) || !v.ds.length) v.ds = Array.from({ length: n }, function (_, k) { return String(k + 1); });
      v.so_luong = v.ds.length;
      sua.push('cảnh ' + (i + 1) + ': nhóm ' + n + ' người -> bàn tròn (đề ngồi quanh bàn tròn)');
    });
  });
  return sua;
}

// BẢN VẼ NHÌN TỪ TRÊN phải khớp số đo của đề: tổng các cạnh có rào = tổng chiều dài lưới/rào đề cho
// (vd 120 m lưới, một cạnh sát tường: tường phải nằm trên cạnh song song tường, rào 3 cạnh còn lại cộng lại đúng 120).
function kiemTraSoDoVung_(bv, deGoc) {
  var de = String(deGoc || '').toLowerCase();
  if (!bv || bv.nhin !== 'tren' || !Array.isArray(bv.vung) || !/rào|lưới|hàng rào|dây thép/.test(de)) return [];
  var m = /(\d+(?:[.,]\d+)?)\s*(?:m|mét)\b[^.?!]{0,40}?(?:lưới|rào|dây)|(?:lưới|rào|dây)[^.?!\d]{0,30}?(\d+(?:[.,]\d+)?)\s*(?:m|mét)\b/.exec(de);
  if (!m) return [];
  var tong = Number(String(m[1] || m[2]).replace(',', '.'));
  var loi = [];
  bv.vung.forEach(function (z) {
    if (!z || !(Number(z.rong) > 0) || !(Number(z.dai) > 0)) return;
    var tuong = Array.isArray(z.tuong) ? z.tuong : z.tuong ? [z.tuong] : [];
    var canh = z.hang_rao === true ? ['tren', 'duoi', 'trai', 'phai'].filter(function (c) { return tuong.indexOf(c) < 0; }) : Array.isArray(z.hang_rao) ? z.hang_rao : [];
    if (!canh.length) return;
    var s = canh.reduce(function (a, c) { return a + (/tren|duoi/.test(c) ? Number(z.rong) : /trai|phai/.test(c) ? Number(z.dai) : 0); }, 0);
    if (Math.abs(s - tong) > tong * 0.02 + 0.01) loi.push('BAN_VE_SAI_SO_DO: các cạnh có rào (' + canh.join(', ') + ') cộng lại ' + s + ' m nhưng đề cho ' + tong + ' m lưới/rào. "rong" là cạnh ngang (tren/duoi), "dai" là cạnh dọc (trai/phai); đặt "tuong" đúng cạnh song song tường và dùng kích thước của đáp án.');
  });
  return loi;
}

// Tự sửa lỗi hay gặp nhất: đặt tường lên cạnh ngắn thay vì cạnh dài -> đổi rong <-> dai (và đổi 2 nhãn cạnh) nếu nhờ vậy tổng rào khớp đề.
function tuSuaSoDoVung_(bv, deGoc) {
  var sua = false;
  // nhãn cạnh là số ("30 m", "60 m"): nhãn cạnh ngang phải bằng "rong", nhãn cạnh dọc bằng "dai"
  var soNhan = function (t) { var m = /^\s*(\d+(?:[.,]\d+)?)\s*(?:m|mét)?\s*$/.exec(String(t || '')); return m ? Number(m[1].replace(',', '.')) : NaN; };
  (bv && Array.isArray(bv.vung) ? bv.vung : []).forEach(function (z) {
    if (!z || !Array.isArray(z.canh) || z.canh.length < 2) return;
    var a = soNhan(z.canh[0]), b = soNhan(z.canh[1]);
    if (a === Number(z.dai) && b === Number(z.rong) && a !== b) { var t = z.canh[0]; z.canh[0] = z.canh[1]; z.canh[1] = t; sua = true; }
  });
  if (!kiemTraSoDoVung_(bv, deGoc).length) return sua;
  (bv.vung || []).forEach(function (z) {
    if (!z || !(Number(z.rong) > 0) || !(Number(z.dai) > 0)) return;
    var thu = JSON.parse(JSON.stringify(z));
    var t = thu.rong; thu.rong = thu.dai; thu.dai = t;
    var a = Array.isArray(thu.canh) ? soNhan(thu.canh[0]) : NaN, b = Array.isArray(thu.canh) ? soNhan(thu.canh[1]) : NaN;
    var nhanSoDung = a === Number(thu.rong) && b === Number(thu.dai);   // nhãn số đã khớp kích thước sau khi đổi -> giữ nguyên
    if (Array.isArray(thu.canh) && thu.canh.length >= 2 && !nhanSoDung) { var c0 = thu.canh[0]; thu.canh[0] = thu.canh[1]; thu.canh[1] = c0; }
    if (!kiemTraSoDoVung_({ nhin: 'tren', vung: [thu] }, deGoc).length && kiemTraSoDoVung_({ nhin: 'tren', vung: [z] }, deGoc).length) {
      Object.keys(thu).forEach(function (k) { z[k] = thu[k]; });
      sua = true;
    }
  });
  return sua;
}

// Đề nói tới vật thực tế (cột cờ, ngân hàng, tòa nhà...) mà 3 cảnh đầu không vẽ đúng vật đó (thay bằng khối hộp/trụ vô nghĩa) -> lỗi nặng.
function kiemTraVatThucDe_(kb, deGoc) {
  var de = String(deGoc || '').toLowerCase();
  if (!de) return [];
  var co = {};
  (kb.canh || []).slice(0, 6).forEach(function (c) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat)) return;
    du.vat.forEach(function (v) {
      if (!v) return;
      co['@' + v.loai] = true;
      if (Array.isArray(v.hinh)) v.hinh.forEach(function (h) { if (h && h.kieu === 'vat') co[h.ten] = true; });
      if (v.loai === 'canh_that') {
        (v.vat || []).forEach(function (x) { if (x) co[x.ten] = true; });
        // nhìn từ trên: hàng rào / bức tường vẽ bằng thuộc tính của vùng ("hang_rao": true | ["tren","phai"...], "tuong": "duoi")
        (v.vung || []).forEach(function (z) {
          if (!z) return;
          if (z.hang_rao === true || (Array.isArray(z.hang_rao) && z.hang_rao.length) || (typeof z.hang_rao === 'string' && z.hang_rao)) co.hang_rao = true;
          if (z.tuong) co.tuong = true;
        });
      }
    });
  });
  var loi = [];
  TU_VAT_THUC_.forEach(function (m) {
    if (!m[0].test(de)) return;
    var dat = m[1].some(function (t) { return co[t] || (THAY_VAT_THUC_[t] || []).some(function (l) { return co['@' + l]; }); });
    if (!dat) loi.push('VAT_THUC_TE_SAI: đề nói tới ' + m[2] + ' nhưng 3 cảnh đầu không vẽ vật đó. Dùng vật canh_that (vat: {"ma":"A","ten":"' + m[1].filter(function (t) { return t[0] !== '@'; })[0] + '","cao":mét,"x":mét} + các phép đo) đúng số đo của đề; KHÔNG thay bằng khối hộp/khối trụ.');
  });
  return loi.concat(kiemTraVatLaMoiCanh_(kb, de)).slice(0, 5);
}
// MỌI CẢNH (không chỉ 3 cảnh đầu): vẽ một CÔNG TRÌNH / VẬT LỚN mà đề không hề nói tới (đề nói "ngọn hải đăng" mà cảnh vẽ tòa nhà,
// đề nói "cái bàn" mà cảnh vẽ khối hộp...) -> lỗi nặng. Vật được nhắc trong lời thoại của chính cảnh đó (ví dụ cảnh liên hệ thực tế) thì hợp lệ.
var VAT_LON_ = ['toa_nha', 'hai_dang', 'thap_nuoc', 'cot_co', 'cot_dien', 'den_duong', 'thap', 'cong_trinh', 'ngan_hang', 'nha', 'truong_hoc', 'cua_hang', 'kim_tu_thap', 'ban', 'ti_vi'];
function vatCuaCanh_(c) {
  var co = {};
  var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
  (du && Array.isArray(du.vat) ? du.vat : []).forEach(function (v) {
    if (!v) return;
    if (v.loai === 'toa_nha') co.toa_nha = true;   // vật 3D tòa nhà
    if (v.loai === 'khoi_hop') co['@khoi_hop'] = true;
    if (Array.isArray(v.hinh)) v.hinh.forEach(function (h) { if (h && h.kieu === 'vat' && h.ten) co[h.ten] = true; });
    if (v.loai === 'canh_that') (v.vat || []).forEach(function (x) { if (x && x.ten) co[x.ten] = true; });
  });
  return co;
}
function kiemTraVatLaMoiCanh_(kb, de) {
  var loi = [];
  var choPhepDe = {};
  TU_VAT_THUC_.forEach(function (m) { if (m[0].test(de)) m[1].forEach(function (t) { choPhepDe[t] = true; }); });
  var coDoiTuongDe = Object.keys(choPhepDe).some(function (t) { return VAT_LON_.indexOf(t) >= 0; });
  var deCoBan = /cái bàn|chiếc bàn|mặt bàn|bàn học|bàn ăn|bàn làm việc|bàn gỗ|chân bàn/.test(de);
  (kb.canh || []).forEach(function (c, i) {
    var co = vatCuaCanh_(c);
    var chuCanh = (String(c.loi_thoai || '') + ' ' + String(c.tieu_de_canh || '')).toLowerCase();
    var choPhepCanh = {};
    TU_VAT_THUC_.forEach(function (m) { if (m[0].test(chuCanh)) m[1].forEach(function (t) { choPhepCanh[t] = true; }); });
    Object.keys(co).forEach(function (t) {
      if (VAT_LON_.indexOf(t) < 0 || choPhepDe[t] || choPhepCanh[t]) return;
      // đề không có công trình nào và lời cảnh cũng không nhắc: chỉ báo khi đề có đối tượng chính khác (tránh chặn hình minh họa chung)
      if (!coDoiTuongDe) return;
      var dung = Object.keys(choPhepDe).filter(function (x) { return VAT_LON_.indexOf(x) >= 0; })[0];
      loi.push('VAT_LA_CANH_' + (i + 1) + ': cảnh ' + (i + 1) + ' vẽ "' + t + '" nhưng đề KHÔNG có vật đó (đề nói tới "' + dung + '"). Thay bằng đúng vật của đề ("ten":"' + dung + '"), giữ nguyên số đo.');
    });
    if (deCoBan && co['@khoi_hop'] && !co.ban) loi.push('BAN_VE_THANH_HOP_CANH_' + (i + 1) + ': đề nói cái bàn nhưng cảnh ' + (i + 1) + ' vẽ khối hộp. Dùng canh_that với vật {"ten":"ban","cao":<chiều cao bàn>,"rong":<chiều dài mặt bàn>} (mặt bàn + chân), hoặc hinh_tu_do nét vat "ban".');
  });
  return loi;
}
// MÁY TỰ SỬA: cảnh vẽ công trình mà đề không có, trong khi đề có đúng MỘT công trình chính -> đổi tên vật thành vật của đề (giữ số đo, vị trí).
function tuSuaVatLa_(kb, deGoc) {
  var de = String(deGoc || '').toLowerCase(), sua = [];
  var choPhep = {};
  TU_VAT_THUC_.forEach(function (m) { if (m[0].test(de)) m[1].forEach(function (t) { choPhep[t] = true; }); });
  var chinh = Object.keys(choPhep).filter(function (t) { return VAT_LON_.indexOf(t) >= 0 && TEN_VAT_THUC_.indexOf(t) >= 0; });
  if (chinh.length !== 1) return sua;
  var dung = chinh[0];
  (kb.canh || []).forEach(function (c, i) {
    var chuCanh = (String(c.loi_thoai || '') + ' ' + String(c.tieu_de_canh || '')).toLowerCase();
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    var doi = 0;
    var thay = function (x) {
      if (!x || !x.ten || x.ten === dung || VAT_LON_.indexOf(x.ten) < 0 || choPhep[x.ten]) return;
      var nhac = TU_VAT_THUC_.some(function (m) { return m[1].indexOf(x.ten) >= 0 && m[0].test(chuCanh); });
      if (nhac) return;
      x.ten = dung; doi++;
    };
    (du && Array.isArray(du.vat) ? du.vat : []).forEach(function (v) {
      if (!v) return;
      if (v.loai === 'canh_that') (v.vat || []).forEach(thay);
      if (Array.isArray(v.hinh)) v.hinh.forEach(function (h) { if (h && h.kieu === 'vat') thay(h); });
    });
    if (doi) sua.push('VAT_LA_CANH_' + (i + 1) + '->' + dung);
  });
  if (kb.ban_ve && Array.isArray(kb.ban_ve.vat)) kb.ban_ve.vat.forEach(function (x) { if (x && x.ten && x.ten !== dung && VAT_LON_.indexOf(x.ten) >= 0 && !choPhep[x.ten]) { x.ten = dung; sua.push('BAN_VE->' + dung); } });
  return sua;
}
// BÀI TÀI CHÍNH (lãi suất, lãi kép, gửi tiết kiệm, vay, trả góp, tăng trưởng dân số...): KHÔNG có vật hình khối nào trong đề,
// nên hình phải là ngân hàng / tiền / heo đất / người, biểu đồ cột số tiền qua từng kỳ, đồ thị hàm mũ, dòng thời gian các kỳ.
// Khối hộp, trụ, nón, cầu, hình hình học, vật 3D... mà đề không nhắc = hình KHÔNG LIÊN QUAN -> lỗi nặng, máy tự gỡ.
var TAI_CHINH_RE_ = /lãi suất|lãi kép|lãi đơn|lãi hàng (tháng|năm|quý)|gửi tiết kiệm|tiết kiệm|gửi (tiền|vào) ngân hàng|sổ tiết kiệm|tiền gửi|tiền lãi|vay (vốn|tiền|ngân hàng)?|khoản vay|trả góp|kỳ hạn|tăng trưởng|dân số tăng|tăng dân số|lạm phát|khấu hao|chiết khấu/i;
var HINH_KHOI_ = ['khoi_hop', 'tru', 'non', 'cau', 'hinh_hoc', 'xuc_xac', 'hop_qua', 'hop_bi', 'cua', 'thang', 'xe', 'cay', 'toa_nha', 'banh', 'vong_quay'];
var VAT_TAI_CHINH_ = ['ngan_hang', 'tien', 'heo_dat', 'nguoi', 'cua_hang', 'bieu_tuong', 'nha', 'xe_hoi', 'xe_may', 'xe_dap', 'cong_trinh', 'truong_hoc'];
function laDeTaiChinh_(de) { return TAI_CHINH_RE_.test(String(de || '').toLowerCase()); }
// vật này có được đề nhắc tới không (ví dụ đề lãi suất mua xe thì vẽ xe được)
function deNhacVat_(loai, de) {
  var tu = TU_VAT_3D_[loai];
  if (tu && tu.test(de)) return true;
  return TU_VAT_THUC_.some(function (m) { return m[1].indexOf(loai) >= 0 && m[0].test(de); });
}
function vatLaTaiChinh_(v, de) {
  if (!v) return false;
  if (HINH_KHOI_.indexOf(v.loai) >= 0) return !deNhacVat_(v.loai === 'xe' ? 'xe_hoi' : v.loai, de);
  return false;
}
function kiemTraTaiChinh_(kb, deGoc) {
  var de = String(deGoc || '').toLowerCase(), nang = [], nhe = [];
  if (!laDeTaiChinh_(de)) return { nang: nang, nhe: nhe };
  var coBieuDo = false;
  (kb.canh || []).forEach(function (c, i) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    var la = [];
    (du && Array.isArray(du.vat) ? du.vat : []).forEach(function (v) {
      if (!v) return;
      if (v.loai === 'bieu_do_cot' || v.loai === 'do_thi') coBieuDo = true;
      if (vatLaTaiChinh_(v, de)) la.push(v.loai);
      if (Array.isArray(v.hinh)) v.hinh.forEach(function (h) { if (h && h.kieu === 'vat' && h.ten && VAT_TAI_CHINH_.indexOf(h.ten) < 0 && !deNhacVat_(h.ten, de)) la.push(h.ten); });
      if (v.loai === 'canh_that') (v.vat || []).forEach(function (x) { if (x && x.ten && VAT_TAI_CHINH_.indexOf(x.ten) < 0 && !deNhacVat_(x.ten, de)) la.push(x.ten); });
    });
    if (la.length) nang.push('HINH_KHONG_LIEN_QUAN_CANH_' + (i + 1) + ': bài lãi suất / tiền bạc nhưng cảnh ' + (i + 1) + ' vẽ ' + la.join(', ') +
      ' (đề không có vật đó). Chỉ dùng: canh_that với ngan_hang, tien, heo_dat, nguoi; bieu_do_cot số tiền sau từng kỳ; do_thi hàm mũ; danh_sach / luoi_o làm dòng thời gian các kỳ; so_dem số tiền.');
  });
  if (!coBieuDo) nhe.push('TAI_CHINH_THIEU_BIEU_DO: bài lãi suất nên có bieu_do_cot (số tiền sau mỗi kỳ, cột cao dần) hoặc do_thi hàm mũ để người xem THẤY tiền tăng thế nào.');
  return { nang: nang, nhe: nhe };
}
// MÁY TỰ SỬA bài tài chính: gỡ hình khối / vật không liên quan; cảnh mất hết hình thì thay bằng cảnh ngân hàng + người + heo đất.
function tuSuaTaiChinh_(kb, deGoc) {
  var de = String(deGoc || '').toLowerCase(), sua = [];
  if (!laDeTaiChinh_(de) || !kb || !Array.isArray(kb.canh)) return sua;
  kb.canh.forEach(function (c, i) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat)) return;
    var bo = {}, truoc = JSON.stringify(du.vat);
    du.vat = du.vat.filter(function (v) {
      if (!v) return false;
      if (vatLaTaiChinh_(v, de)) { bo[v.id] = true; return false; }
      if (v.loai === 'canh_that' && Array.isArray(v.vat)) {
        v.vat = v.vat.filter(function (x) { return x && (VAT_TAI_CHINH_.indexOf(x.ten) >= 0 || deNhacVat_(x.ten, de)); });
        if (!v.vat.length) { bo[v.id] = true; return false; }
      }
      if (Array.isArray(v.hinh)) v.hinh = v.hinh.filter(function (h) { return !(h && h.kieu === 'vat' && h.ten && VAT_TAI_CHINH_.indexOf(h.ten) < 0 && !deNhacVat_(h.ten, de)); });
      return true;
    });
    if (JSON.stringify(du.vat) === truoc) return;
    du.vat = du.vat.filter(function (v) { return v.loai !== 'mui_ten' || (!bo[v.tu] && !bo[v.den]); });
    if (Array.isArray(du.hanh_dong)) du.hanh_dong = du.hanh_dong.filter(function (h) { return h && !bo[h.vat]; });
    if (!du.vat.some(function (v) { return v && VAT_PHU_.indexOf(v.loai) < 0; })) {
      du.vat.unshift({ id: 'tc_' + (i + 1), loai: 'canh_that', nhin: 'ngang', x: 50, y: 46, buoc: 1,
        vat: [{ ma: 'A', ten: 'nguoi', cao: 1.7, x: 0 }, { ma: 'B', ten: 'ngan_hang', cao: 6, x: 6 }, { ma: 'C', ten: 'heo_dat', cao: 1.2, x: 12 }] });
      if (!Array.isArray(du.hanh_dong)) du.hanh_dong = [];
      du.hanh_dong.push({ buoc: 2, vat: 'tc_' + (i + 1), kieu: 'sang' });
    }
    sua.push('gỡ hình không liên quan (bài lãi suất) ở cảnh ' + (i + 1));
  });
  return sua;
}
var KIEU_HANH_DONG_ = ['chon', 'loai_bo', 'sang', 'rung', 'quay', 'mo', 'lay_ra', 'dat_gia_tri', 'bung_ra', 'di_chuyen', 'phong_to', 'thu_nho', 'an', 'doi_chu', 'goc_3d', 'bien_hinh', 'tach', 'ghep', 'dem_tang'];
var VAT_PHU_ = ['nhan', 'chu', 'mui_ten', 'bieu_tuong', 'so_dem'];   // vật phụ trợ (chữ, nhãn): không tính là "vật thật"

// Kiểm tra sân khấu của một cảnh. idCu: id các vật đang có trên sân khấu từ cảnh trước (khi giu_san_khau). Trả '' nếu hợp lệ.
function kiemTraSanKhau_(du, cn, idCu) {
  var giuCu = !!(idCu && Object.keys(idCu).length);
  // giữ sân khấu cảnh trước: được phép không thêm vật mới, chỉ có hành động trên vật cũ
  if (laDT_(du) && giuCu && (du.vat === undefined || (Array.isArray(du.vat) && !du.vat.length))) du.vat = [];
  else if (!laDT_(du) || !Array.isArray(du.vat) || !du.vat.length) return 'HINH_' + cn + ': san_khau cần du_lieu.vat là mảng 1-16 vật {id, loai, x, y, buoc...}.';
  if (du.vat.length > 16) return 'HINH_' + cn + ': tối đa 16 vật mỗi cảnh (nên 1-5).';
  var ids = {}, coVatThat = !!(idCu && Object.keys(idCu).length);
  for (var i = 0; i < du.vat.length; i++) {
    var v = du.vat[i], ev = cn + ', vat[' + i + ']';
    if (!laDT_(v) || LOAI_VAT_.indexOf(v.loai) < 0) return 'HINH_' + ev + ': "loai" phải thuộc: ' + LOAI_VAT_.join(', ') + '.';
    if (!laChuoi_(v.id)) return 'HINH_' + ev + ': mỗi vật cần "id" (chuỗi ngắn, duy nhất).';
    if (ids[v.id]) return 'HINH_' + ev + ': id "' + v.id + '" bị trùng.';
    ids[v.id] = v;
    if (v.loai !== 'mui_ten' && (!laSo_(v.x) || !laSo_(v.y) || v.x < 0 || v.x > 100 || v.y < 0 || v.y > 100)) return 'HINH_' + ev + ': ' + v.loai + ' cần x, y là số 0-100 (tâm vật).';
    if (v.loai === 'canh_that') { var lct = kiemTraCanhThat_(v, ev); if (lct) return lct; coVatThat = true; continue; }
    if ((v.loai === 'nhan' || v.loai === 'chu') && !laChuoi_(v.noi_dung)) return 'HINH_' + ev + ': "' + v.loai + '" cần "noi_dung".';
    if (v.loai === 'bieu_tuong' && !laChuoi_(v.emoji)) return 'HINH_' + ev + ': "bieu_tuong" cần "emoji".';
    if (v.loai === 'bieu_do_cot' && (!Array.isArray(v.ds_so) || !v.ds_so.length || v.ds_so.some(function (x) { return !(Number(x) >= 0); }))) return 'HINH_' + ev + ': bieu_do_cot cần "ds_so" là mảng số không âm (và "ds" là nhãn cột).';
    if (v.loai === 'vong_quay' && (!Array.isArray(v.ds) || v.ds.length < 2 || v.ds.length > 12)) return 'HINH_' + ev + ': vong_quay cần "ds" là 2-12 nhãn ô.';
    if ((v.loai === 'dong_ho_do' || v.loai === 'thanh') && v.gia_tri !== undefined && !(Number(v.gia_tri) >= 0 && Number(v.gia_tri) <= 1)) return 'HINH_' + ev + ': "gia_tri" của ' + v.loai + ' là xác suất 0-1 (ví dụ 0.4643); ghi phân số vào "gia_tri_chu".';
    if (v.loai === 'danh_sach' && (!Array.isArray(v.ds) || v.ds.length < 1 || v.ds.length > 6)) return 'HINH_' + ev + ': danh_sach cần "ds" là 1-6 dòng ngắn.';
    if (v.loai === 'anh_that' && !(Number(v.anh) >= 0 && Math.floor(Number(v.anh)) === Number(v.anh))) return 'HINH_' + ev + ': anh_that cần "anh" là số thứ tự ảnh thật của sản phẩm (0, 1, 2...).';
    if (v.loai === 'ban_tron' && !((Array.isArray(v.ds) && v.ds.length >= 3 && v.ds.length <= 16) || (Number(v.so_luong) >= 3 && Number(v.so_luong) <= 16))) return 'HINH_' + ev + ': ban_tron cần "ds" là 3-16 nhãn ghế theo chiều kim đồng hồ ("Nam", "Nữ", tên; "_" = ghế trống).';
    if (v.loai === 'luoi_o' && v.so_luong !== undefined && !(Number(v.so_luong) >= 1 && Number(v.so_luong) <= 64)) return 'HINH_' + ev + ': luoi_o có tối đa 64 ô ("so_luong").';
    if ((v.loai === 'hop_bi' || v.loai === 'tui') && (!Array.isArray(v.nhom) || !v.nhom.length)) return 'HINH_' + ev + ': ' + v.loai + ' cần "nhom" là mảng {mau, so}.';
    var loiVat = kiemTraVatThucTe_(v, ev);
    if (loiVat) return loiVat;
    if (VAT_PHU_.indexOf(v.loai) < 0) coVatThat = true;
  }
  for (var j = 0; j < du.vat.length; j++) {
    var m = du.vat[j];
    if (m.loai === 'mui_ten' && ((m.tu && !ids[m.tu] && !(idCu && idCu[m.tu])) || (m.den && !ids[m.den] && !(idCu && idCu[m.den])))) return 'HINH_' + cn + ': mũi tên "' + m.id + '" nối tới id không có trên sân khấu.';
  }
  if (!coVatThat) return 'HINH_QUA_DON_GIAN_' + cn + ': sân khấu chỉ có chữ/nhãn/emoji. Hãy dùng vật thật (nguoi, the, hop_bi, xuc_xac, vong_quay, dong_ho_do...) diễn tả tình huống.';
  var hd = du.hanh_dong || [];
  if (!Array.isArray(hd)) return 'HINH_' + cn + ': "hanh_dong" phải là mảng.';
  for (var k = 0; k < hd.length; k++) {
    var h = hd[k];
    if (!laDT_(h) || KIEU_HANH_DONG_.indexOf(h.kieu) < 0) return 'HINH_' + cn + ', hanh_dong[' + k + ']: "kieu" phải thuộc: ' + KIEU_HANH_DONG_.join(', ') + '.';
    if (h.kieu === 'dat_gia_tri' && h.gia_tri !== undefined && !laSo_(Number(h.gia_tri))) return 'HINH_' + cn + ', hanh_dong[' + k + ']: "gia_tri" của dat_gia_tri phải là số.';
    if (h.kieu !== 'thu_nho' && h.kieu !== 'phong_to' && h.kieu !== 'goc_3d' && !ids[h.vat] && !(idCu && idCu[h.vat])) return 'HINH_' + cn + ', hanh_dong[' + k + ']: "vat" = "' + h.vat + '" không phải id của vật nào trên sân khấu.';
  }
  if (!hd.length && !(idCu && Object.keys(idCu).length)) return 'HINH_IT_CHUYEN_DONG_' + cn + ': mỗi cảnh san_khau cần ít nhất 1 hành động (chon, quay, mo, lay_ra, rung, bung_ra, phong_to...) ăn khớp lời thoại.';
  return '';
}

// CẢNH LIÊN HỆ THỰC TẾ chỉ có hộp chữ ("ỨNG DỤNG THI CÔNG"): máy tự vẽ VẬT THẬT được nhắc trong lời thoại
// (chuồng trại -> hàng rào, sân bóng -> quả bóng, gửi tiết kiệm -> ngân hàng...) đứng cạnh một người đang chỉ vào.
var LIEN_HE_VAT_ = [[/chuồng|trang trại|nông trại|rào/, 'hang_rao'], [/sân bóng|bóng đá|đá bóng/, 'qua_bong'], [/bóng rổ/, 'ro_bong_ro'],
  [/tòa nhà|cao ốc|chung cư/, 'toa_nha'], [/xây nhà|ngôi nhà|nhà ở|thi công|công trình|vật liệu/, 'nha'], [/ngân hàng|lãi suất|gửi tiết kiệm|vay/, 'ngan_hang'],
  [/heo đất|để dành/, 'heo_dat'], [/tiền|mua|bán|giá|chi phí/, 'tien'], [/xe buýt/, 'xe_buyt'], [/xe máy/, 'xe_may'], [/xe đạp/, 'xe_dap'], [/ô tô|xe hơi|lái xe|quãng đường/, 'xe_hoi'],
  [/cây|vườn|trồng/, 'cay'], [/cây cầu|bắc cầu/, 'cau'], [/thuyền|sông|ca nô/, 'thuyen'], [/máy bay/, 'may_bay'], [/cột điện|dây điện/, 'cot_dien'],
  [/hồ bơi|bể bơi|hồ nước|bể nước/, 'ho_nuoc'], [/trường|lớp học|học sinh/, 'truong_hoc'], [/cửa hàng|siêu thị|quán/, 'cua_hang'], [/hải đăng/, 'hai_dang'], [/thang/, 'thang'], [/diều/, 'dieu'],
  [/cái bàn|mặt bàn|bàn học|bàn ăn/, 'ban'], [/ti vi|tivi|màn hình/, 'ti_vi'], [/kim tự tháp/, 'kim_tu_thap'], [/tháp truyền hình|tháp phát sóng|tháp thép/, 'thap']];
// chiều cao minh họa (không phải số đo): giữ vật lớn thấp lại để người đứng cạnh không bị tí hon
var CAO_LIEN_HE_ = { hang_rao: 1.3, qua_bong: 0.6, ro_bong_ro: 3, toa_nha: 4.5, nha: 3.4, ngan_hang: 3.6, heo_dat: 0.8, tien: 0.8, xe_buyt: 2.6, xe_may: 1.2, xe_dap: 1.1, xe_hoi: 1.5,
  cay: 3.2, cau: 3, thuyen: 2, may_bay: 2.5, cot_dien: 4, ho_nuoc: 0.8, truong_hoc: 3.8, cua_hang: 3.2, hai_dang: 4.5, thang: 3, dieu: 3, ban: 0.8, ti_vi: 0.9, kim_tu_thap: 4, thap: 4.5 };
function suaLienHeThucTe_(kb) {
  var sua = [];
  var CHU_ = ['nhan', 'chu', 'the', 'danh_sach', 'so_dem', 'mui_ten', 'bieu_tuong'];
  (kb.canh || []).forEach(function (c, i) {
    if (!c || !/lien_he/.test(String(c.loai || ''))) return;
    var mh = c.minh_hoa, du = mh && mh.du_lieu;
    var vat = du && Array.isArray(du.vat) ? du.vat : [];
    if (vat.some(function (v) { return v && CHU_.indexOf(v.loai) < 0; })) return;   // đã có vật thật
    var loi = (String(c.loi_thoai || '') + ' ' + String((mh && mh.mo_ta) || '')).toLowerCase();
    var ten = [];
    LIEN_HE_VAT_.forEach(function (m) { if (ten.length < 3 && m[0].test(loi) && ten.indexOf(m[1]) < 0) ten.push(m[1]); });
    if (!ten.length) return;
    var ds = [{ ma: 'A', ten: 'nguoi', cao: 1.7, x: 0 }], x = 3;
    ten.forEach(function (t, k) { var cao = CAO_LIEN_HE_[t] || 3; ds.push({ ma: String.fromCharCode(66 + k), ten: t, cao: cao, x: x }); x += Math.max(2.6, cao * 0.9); });
    var ct = { id: 'canh_lh', loai: 'canh_that', nhin: 'ngang', x: 50, y: 50, buoc: 1, vat: ds, do: [] };
    if (typeof kiemTraCanhThat_ === 'function' && kiemTraCanhThat_(ct, 'LIEN_HE')) return;
    c.minh_hoa = { loai: 'san_khau', mo_ta: 'Liên hệ thực tế: người chỉ vào ' + ten.join(', ') + ' - những nơi dùng đúng cách nghĩ của bài.', du_lieu: { vat: [ct], hanh_dong: [{ buoc: 2, vat: 'canh_lh', kieu: 'sang' }] } };
    c.giu_san_khau = false;
    sua.push('cảnh ' + (i + 1) + ' (liên hệ thực tế): vẽ vật thật ' + ten.join(', '));
  });
  return sua;
}

// Tự sửa lỗi vặt (không đổi nội dung bài): kẹp tọa độ, bỏ từ khóa không khớp tiêu đề, bỏ vật/hành động lạ, cắt chú thích dài.
function tuSuaKichBan_(kb, ctx) {
  if (!kb || !Array.isArray(kb.canh)) return [];
  kb.canh = kb.canh.filter(laDT_);
  var loaiTheoId = {};   // id vật -> loại (giữ qua các cảnh giu_san_khau)
  if (Array.isArray(kb.du_kien)) kb.du_kien = kb.du_kien.map(function (x) { return String(x).replace(/\s+/g, ' ').trim().slice(0, 30); }).filter(Boolean).slice(0, 4);
  else delete kb.du_kien;
  kb.canh.forEach(function (c, i) {
    if (!c) return;
    if (c.tieu_de_canh) c.tieu_de_canh = String(c.tieu_de_canh).replace(/\s+/g, ' ').trim().slice(0, 60);
    if (c.tu_khoa && (!c.tieu_de_canh || String(c.tieu_de_canh).toLowerCase().indexOf(String(c.tu_khoa).toLowerCase()) < 0)) c.tu_khoa = '';
    if (i === 0) c.giu_san_khau = false;
    if (Array.isArray(kb.bai_hoc_rut_ra)) kb.bai_hoc_rut_ra = kb.bai_hoc_rut_ra.slice(0, 3).map(function (x) { return String(x).slice(0, 90); });
    if (c.chuyen_canh && ['mo', 'truot_len', 'phong', 'luot_ngang', 'truot_xuong', 'lat_3d', 'quet_sang', 'tron_mo', 'zoom_xuyen', 'nghieng', 'lat_ngang', 'day_ngang'].indexOf(c.chuyen_canh) < 0) delete c.chuyen_canh;
    if (c.giong_doc) c.giong_doc = String(c.giong_doc).replace(/\s+/g, ' ').trim().slice(0, 120);
    // bỏ lời mở máy móc "Cảnh 3:", "Bước 2:" ở đầu lời thoại (nhãn bước đã hiện trên màn hình)
    if (i > 0 && c.loi_thoai) {
      var gon = String(c.loi_thoai).replace(/^\s*(cảnh\s+\d+|bước\s+(\d+|một|hai|ba|bốn|năm))\s*[:.,-]\s*/i, '');
      if (gon.length >= 15) c.loi_thoai = gon.charAt(0).toUpperCase() + gon.slice(1);
    }
    if (Array.isArray(c.chu_thich)) c.chu_thich = c.chu_thich.slice(0, 3).map(function (x) { return String(x).slice(0, 60); });
    var mh = c.minh_hoa;
    if (!laDT_(mh) || mh.loai !== 'san_khau' || !laDT_(mh.du_lieu)) return;
    var du = mh.du_lieu;
    if (Array.isArray(du.vat)) {
      du.vat = du.vat.map(function (v) { return laDT_(v) ? doiTenVat_(v) : v; }).filter(function (v) { return laDT_(v) && LOAI_VAT_.indexOf(v.loai) >= 0; });
      du.vat.forEach(function (v, k) {
        if (!laChuoi_(v.id)) v.id = 'v' + (i + 1) + '_' + k;
        ['x', 'y', 'x2', 'y2'].forEach(function (t) { if (v[t] !== undefined && laSo_(Number(v[t]))) v[t] = Math.min(98, Math.max(2, Number(v[t]))); });
        if ((v.loai === 'dong_ho_do' || v.loai === 'thanh' || v.loai === 'bong_bay') && Number(v.gia_tri) > 1 && Number(v.gia_tri) <= 100) v.gia_tri = Number(v.gia_tri) / 100;
        if (v.muc_nuoc !== undefined && Number(v.muc_nuoc) > 1 && Number(v.muc_nuoc) <= 100) v.muc_nuoc = Number(v.muc_nuoc) / 100;
        if (v.loai === 'do_thi' && typeof v.ham === 'string') v.ham = v.ham.replace(/^\s*[a-zA-Z]\s*\(\s*x\s*\)\s*=\s*|^\s*y\s*=\s*/, '').replace(/\\cdot|\\times/g, '*').replace(/[{}]/g, function (c) { return c === '{' ? '(' : ')'; });
        loaiTheoId[v.id] = v.loai;
      });
    }
    if (Array.isArray(du.hanh_dong)) {
      du.hanh_dong.forEach(function (h) { if (laDT_(h) && BI_DANH_HANH_DONG_[h.kieu]) h.kieu = BI_DANH_HANH_DONG_[h.kieu]; });
      du.hanh_dong = du.hanh_dong.filter(function (h) { return laDT_(h) && KIEU_HANH_DONG_.indexOf(h.kieu) >= 0; });
      du.hanh_dong.forEach(function (h) {
        var lv = loaiTheoId[h.vat];
        // mực nước / xác suất ghi theo phần trăm -> đổi về 0-1
        if (h.kieu === 'dat_gia_tri' && ['khoi_hop', 'tru', 'non', 'dong_ho_do', 'thanh', 'bong_bay'].indexOf(lv) >= 0 && Number(h.gia_tri) > 1 && Number(h.gia_tri) <= 100) h.gia_tri = Number(h.gia_tri) / 100;
      });
    }
  });
  return tuSuaSau_(kb, ctx);
}

var KIEU_HINH_VE_ = ['tron', 'chu_nhat', 'chu', 'mui_ten', 'duong', 'bi', 'xuc_xac', 'the_bai', 'dong_xu', 'bieu_tuong', 'luoi', 'truc_so'];

function laSo_(v) { return typeof v === 'number' && isFinite(v); }
function laChuoi_(v) { return typeof v === 'string' && v.trim() !== ''; }
function laDT_(v) { return v && typeof v === 'object' && !Array.isArray(v); }

// Trả về '' nếu hợp lệ, hoặc câu mô tả lỗi (dùng làm lời nhắc sửa cho Gemini).
function kiemTraMinhHoa_(mh, so, idCu) {
  var cn = 'CANH_' + so;
  if (!laDT_(mh)) return 'THIEU_MINH_HOA_' + cn + ': mỗi cảnh phải có đối tượng "minh_hoa".';
  var loai = String(mh.loai || '');
  if (loai === '' || loai === 'khong') return '';
  var du = mh.du_lieu;
  if (loai === 'san_khau') return kiemTraSanKhau_(du, cn, idCu);
  if (!laDT_(du)) return 'HINH_' + cn + ': minh_hoa.loai là "' + loai + '" nhưng "du_lieu" là null/thiếu. Phải có du_lieu đúng dạng, hoặc đổi loai thành "khong".';

  if (loai === 'so_do_cay') {
    if (!Array.isArray(du.nhanh) || !du.nhanh.length) return 'HINH_' + cn + ': so_do_cay cần "nhanh" là mảng có ít nhất 1 nhánh {nhan, xs}.';
    for (var i = 0; i < du.nhanh.length; i++) if (!laDT_(du.nhanh[i]) || !laChuoi_(du.nhanh[i].nhan)) return 'HINH_' + cn + ': mỗi nhánh của so_do_cay phải có "nhan" là chuỗi.';
    return '';
  }
  if (loai === 'bang') {
    if (!Array.isArray(du.cot) || !du.cot.length || !Array.isArray(du.hang) || !du.hang.length) return 'HINH_' + cn + ': bang cần "cot" (mảng tiêu đề) và "hang" (mảng các hàng, mỗi hàng là mảng ô).';
    for (var h = 0; h < du.hang.length; h++) if (!Array.isArray(du.hang[h])) return 'HINH_' + cn + ': mỗi phần tử của "hang" phải là một mảng ô.';
    return '';
  }
  if (loai === 'venn') {
    if (!laChuoi_(du.A) || !laChuoi_(du.B)) return 'HINH_' + cn + ': venn cần "A" và "B" là chuỗi tên hai tập hợp.';
    if (du.dem !== undefined) {
      if (!laDT_(du.dem)) return 'HINH_' + cn + ': "dem" của venn là đối tượng {chiA, giao, chiB, ngoai} số phần tử mỗi vùng (0-36).';
      var vv = ['chiA', 'giao', 'chiB', 'ngoai'];
      for (var z = 0; z < vv.length; z++) if (du.dem[vv[z]] !== undefined && !(Number(du.dem[vv[z]]) >= 0 && Number(du.dem[vv[z]]) <= 36)) return 'HINH_' + cn + ': số phần tử mỗi vùng của venn tối đa 36.';
    }
    return '';
  }
  if (loai === 'bi_hop') {
    if (!Array.isArray(du.nhom) || !du.nhom.length) return 'HINH_' + cn + ': bi_hop cần "nhom" là mảng {ten, so}.';
    for (var g = 0; g < du.nhom.length; g++) {
      var n = du.nhom[g];
      if (!laDT_(n) || !laChuoi_(n.ten) || !laSo_(Number(n.so)) || Number(n.so) < 1 || Number(n.so) > 60) return 'HINH_' + cn + ': mỗi nhóm bi cần "ten" (chuỗi) và "so" (số nguyên 1-60).';
    }
    return '';
  }
  if (loai === 'luoi_mau') {
    if (!Array.isArray(du.hang_nhan) || !du.hang_nhan.length || du.hang_nhan.length > 8 || !Array.isArray(du.cot_nhan) || !du.cot_nhan.length || du.cot_nhan.length > 8) return 'HINH_' + cn + ': luoi_mau cần "hang_nhan" và "cot_nhan" là mảng 1-8 chuỗi (ví dụ ["1","2","3","4","5","6"]).';
    if (du.su_kien !== undefined) {
      if (!Array.isArray(du.su_kien) || du.su_kien.length > 3) return 'HINH_' + cn + ': "su_kien" của luoi_mau là mảng tối đa 3 sự kiện {ten, mau, o:[[hàng,cột],...], xs}.';
      for (var q = 0; q < du.su_kien.length; q++) {
        var sk = du.su_kien[q];
        if (!laDT_(sk) || !laChuoi_(sk.ten) || !Array.isArray(sk.o) || !sk.o.length) return 'HINH_' + cn + ': mỗi sự kiện của luoi_mau cần "ten" (ký hiệu ngắn như A) và "o" là mảng các cặp [hàng,cột] tính từ 1.';
        for (var w = 0; w < sk.o.length; w++) {
          var oc = sk.o[w];
          if (!Array.isArray(oc) || oc.length < 2 || !(oc[0] >= 1 && oc[0] <= du.hang_nhan.length) || !(oc[1] >= 1 && oc[1] <= du.cot_nhan.length)) return 'HINH_' + cn + ': ô [' + String(oc) + '] của luoi_mau nằm ngoài lưới (hàng 1-' + du.hang_nhan.length + ', cột 1-' + du.cot_nhan.length + ').';
        }
      }
    }
    return '';
  }
  if (loai === 'dien_tich') {
    if (!Array.isArray(du.cot) || !du.cot.length || du.cot.length > 4) return 'HINH_' + cn + ': dien_tich cần "cot" là mảng 1-4 cột {nhan, xs, gia_tri, mau, hang:[...]}.';
    for (var c2 = 0; c2 < du.cot.length; c2++) {
      var cc = du.cot[c2];
      if (!laDT_(cc) || !laChuoi_(cc.nhan) || !Array.isArray(cc.hang) || !cc.hang.length || cc.hang.length > 4) return 'HINH_' + cn + ': mỗi cột của dien_tich cần "nhan" và "hang" là mảng 1-4 ô {nhan, xs, gia_tri, mau, kq, to}.';
      if (cc.gia_tri !== undefined && !(Number(cc.gia_tri) > 0)) return 'HINH_' + cn + ': "gia_tri" của cột dien_tich phải là số dương (xác suất, ví dụ 0.625).';
      for (var h2 = 0; h2 < cc.hang.length; h2++) {
        if (!laDT_(cc.hang[h2]) || !laChuoi_(cc.hang[h2].nhan)) return 'HINH_' + cn + ': mỗi ô của dien_tich cần "nhan".';
        if (cc.hang[h2].gia_tri !== undefined && !(Number(cc.hang[h2].gia_tri) > 0)) return 'HINH_' + cn + ': "gia_tri" của ô dien_tich phải là số dương (xác suất có điều kiện).';
      }
    }
    return '';
  }
  if (loai === 'thuc_nghiem') {
    if (!(Number(du.p) > 0 && Number(du.p) < 1)) return 'HINH_' + cn + ': thuc_nghiem cần "p" là xác suất lý thuyết trong khoảng (0,1), ví dụ 0.4643.';
    if (du.n !== undefined && !(Number(du.n) >= 20 && Number(du.n) <= 1000)) return 'HINH_' + cn + ': "n" của thuc_nghiem là số lần thử từ 20 đến 1000.';
    return '';
  }
  // Mọi loại còn lại (xuc_xac, the_bai, luoi, day_so, khac...) phải dùng danh sách "phan_tu" (hình vẽ tự do).
  if (!Array.isArray(du.phan_tu) || !du.phan_tu.length) return 'HINH_' + cn + ': loại "' + loai + '" phải có du_lieu.phan_tu là mảng các phần tử hình vẽ.';
  if (du.phan_tu.length > 40) return 'HINH_' + cn + ': tối đa 40 phần tử hình vẽ mỗi cảnh.';
  for (var k = 0; k < du.phan_tu.length; k++) {
    var e = du.phan_tu[k];
    var ev = cn + ', phan_tu[' + k + ']';
    if (!laDT_(e) || KIEU_HINH_VE_.indexOf(e.kieu) < 0) return 'HINH_' + ev + ': "kieu" phải thuộc: ' + KIEU_HINH_VE_.join(', ') + '.';
    if (e.kieu === 'mui_ten' || e.kieu === 'duong') {
      if (!laSo_(e.x1) || !laSo_(e.y1) || !laSo_(e.x2) || !laSo_(e.y2)) return 'HINH_' + ev + ': ' + e.kieu + ' cần các số x1, y1, x2, y2 (0-100).';
    } else {
      if (!laSo_(e.x) || !laSo_(e.y) || e.x < 0 || e.x > 100 || e.y < 0 || e.y > 100) return 'HINH_' + ev + ': ' + e.kieu + ' cần x, y là số trong 0-100.';
    }
    if (e.kieu === 'chu' && !laChuoi_(e.noi_dung)) return 'HINH_' + ev + ': "chu" cần "noi_dung".';
    if (e.kieu === 'bieu_tuong' && !laChuoi_(e.emoji)) return 'HINH_' + ev + ': "bieu_tuong" cần "emoji".';
    if (e.kieu === 'xuc_xac' && !(Number(e.mat) >= 1 && Number(e.mat) <= 6)) return 'HINH_' + ev + ': "xuc_xac" cần "mat" từ 1 đến 6.';
    if (e.kieu === 'luoi' && !(Number(e.hang) >= 1 && Number(e.cot) >= 1)) return 'HINH_' + ev + ': "luoi" cần "hang" và "cot".';
    if (e.kieu === 'truc_so' && !(laSo_(e.tu) && laSo_(e.den) && e.den > e.tu)) return 'HINH_' + ev + ': "truc_so" cần "tu" < "den" (số).';
  }
  return '';
}

var HOOK_KIEU_ = ['sai_lam', 'thach_thuc', 'bat_ngo', 'ket_qua_truoc', 'cau_hoi'];
var CAM_XUC_ = ['ngac_nhien', 'nghi', 'boi_roi', 'y_tuong', 'thao_tac', 'vui', 'tu_tin'];

function demTu_(t) { return String(t || '').trim().split(/\s+/).filter(Boolean).length; }

// Kiểm tra hook ở 5 giây đầu và cảm xúc nhân vật. Trả '' nếu hợp lệ.
function kiemTraHook_(kb) {
  var c1 = kb.canh[0];
  var tu = demTu_(kb.hook_chu);
  if (tu < 3 || tu > 12) return 'HOOK_CHU_SAI: "hook_chu" phải có 3-12 từ (hiện ' + tu + '): đúng câu hook viết ngắn để in chữ lớn lên màn hình.';
  if (HOOK_KIEU_.indexOf(kb.hook_kieu) < 0) return 'HOOK_KIEU_SAI: "hook_kieu" phải thuộc: ' + HOOK_KIEU_.join(', ') + '.';
  if (!Array.isArray(kb.nhan_manh) || !kb.nhan_manh.length || kb.nhan_manh.length > 3) return 'NHAN_MANH_SAI: "nhan_manh" là mảng 1-3 cụm từ nằm nguyên văn trong hook_chu.';
  for (var i = 0; i < kb.nhan_manh.length; i++) {
    if (String(kb.hook_chu).toLowerCase().indexOf(String(kb.nhan_manh[i]).toLowerCase()) < 0) return 'NHAN_MANH_SAI: cụm "' + kb.nhan_manh[i] + '" không nằm nguyên văn trong hook_chu.';
  }
  if (!Array.isArray(kb.hook_ung_vien) || kb.hook_ung_vien.length < 3) return 'THIEU_HOOK_UNG_VIEN: cần "hook_ung_vien" gồm 3 phương án hook.';
  if (demTu_(c1.loi_thoai) > 18) return 'HOOK_QUA_DAI: lời thoại cảnh 1 có ' + demTu_(c1.loi_thoai) + ' từ, phải tối đa 16 từ để đọc trong 5 giây.';
  var choChao = typeof cauHinh_ === 'function' && cauHinh_('KIEU_MO_DAU') === 'chao_hook';
  var loiDau = String(c1.loi_thoai || '');
  if (choChao) loiDau = loiDau.replace(/^\s*(xin\s+)?chào\s+(bạn|cả nhà)\s*[!,.]?\s*/i, '');   // cho phép "Chào bạn!" rồi vào hook ngay
  if (/^\s*(các bạn|mọi người|hôm nay|xin chào|chào|hello|hi\b)/i.test(loiDau) || /^\s*(các bạn|mọi người|hôm nay)/i.test(kb.hook_chu)) return 'HOOK_YEU: hook không được mở bằng lời chào hay "hôm nay", "các bạn", "mọi người". Hãy mở bằng mâu thuẫn, tình huống hoặc câu hỏi cụ thể.';
  if (/\d+\s*%/.test(kb.hook_chu + ' ' + c1.loi_thoai)) return 'HOOK_BIA_SO_LIEU: không bịa số liệu thống kê (ví dụ "90% học sinh sai"); dùng "rất nhiều bạn", "dễ sai".';
  return '';
}


/* ===================== ĐÁP ÁN, NỘI DUNG LẠ, Ý ĐỒ BÀI TOÁN ===================== */

// Đọc số thành chữ tiếng Việt (0 đến 999999): 13 -> "mười ba", 28 -> "hai mươi tám", 105 -> "một trăm linh năm".
function soThanhChu_(n) {
  n = Math.floor(Number(n));
  var CH = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  if (!isFinite(n) || n < 0 || n >= 1000000) return String(n);
  if (n < 10) return CH[n];
  if (n < 20) return 'mười' + (n % 10 === 0 ? '' : ' ' + (n % 10 === 5 ? 'lăm' : CH[n % 10]));
  if (n < 100) {
    var c = Math.floor(n / 10), d = n % 10;
    return CH[c] + ' mươi' + (d === 0 ? '' : ' ' + (d === 1 ? 'mốt' : d === 5 ? 'lăm' : CH[d]));
  }
  if (n < 1000) {
    var tr = Math.floor(n / 100), r = n % 100;
    var s = CH[tr] + ' trăm';
    if (r === 0) return s;
    if (r < 10) return s + ' linh ' + CH[r];
    return s + ' ' + soThanhChu_(r);
  }
  var ng = Math.floor(n / 1000), r2 = n % 1000;
  var s2 = soThanhChu_(ng) + ' nghìn';
  if (r2 === 0) return s2;
  if (r2 < 10) return s2 + ' không trăm linh ' + CH[r2];
  if (r2 < 100) return s2 + ' không trăm ' + soThanhChu_(r2);
  return s2 + ' ' + soThanhChu_(r2);
}

// Mọi phân số "số nguyên / số nguyên" xuất hiện trong chuỗi: \frac{a}{b}, \dfrac{a}{b} hoặc a/b.
function cacPhanSo_(t) {
  var kq = [], m, re1 = /\\d?frac\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}/g, re2 = /(\d+)\s*\/\s*(\d+)/g;
  while ((m = re1.exec(t)) !== null) kq.push([Number(m[1]), Number(m[2])]);
  while ((m = re2.exec(t)) !== null) kq.push([Number(m[1]), Number(m[2])]);
  return kq;
}

// Tìm cảnh đáp án: cảnh cuối cùng có loai là dap_an/ket_qua; không có thì cảnh liền trước cảnh chốt bài học.
function timCanhDapAn_(kb) {
  var idx = -1;
  for (var i = 0; i < kb.canh.length; i++) if (/dap_an|ket_qua/i.test(String(kb.canh[i].loai || ''))) idx = i;
  if (idx >= 0) return idx;
  var n = kb.canh.length;
  return /bai_hoc|ket_luan|chot/i.test(String(kb.canh[n - 1].loai || '')) && n >= 2 ? n - 2 : n - 1;
}

// Đảm bảo cảnh đáp án LUÔN ra đúng đáp án đã kiểm chứng, dù AI viết gì: gọi trước hopLeKichBan_ (xem hướng dẫn sửa Code.gs).
// Giữ nguyên cảnh nếu mọi phân số trong đó đều bằng đáp án đúng và lời thoại có đọc đúng tử/mẫu; ngược lại thay bằng bản chuẩn.
function suaDapAn_(kb, dapAn) {
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return;
  if (String(dapAn) === 'CM' && typeof suaDapAnChungMinh_ === 'function') return suaDapAnChungMinh_(kb, kb.dap_an_hien);   // bài chứng minh hình học
  if (laDapSo_(dapAn)) return suaDapSo_(kb, dapAn);
  var m = /^(\d+)\/(\d+)$/.exec(String(dapAn).replace(/\s/g, ''));
  if (!m) return;
  var tu = Number(m[1]), mau = Number(m[2]);
  var c = kb.canh[timCanhDapAn_(kb)];
  c.loai = 'dap_an';
  var dsDong = c.noi_dung_man_hinh || [];
  var dong = dsDong.length ? String(dsDong[dsDong.length - 1]) : '';   // chỉ dòng CUỐI phải ra đáp án; các dòng trước là bước biến đổi
  var ps = cacPhanSo_(dong);
  // dòng cuối có thể là phần mở rộng của các dòng trước (còn các phân số trung gian), nên chỉ phân số CUỐI CÙNG phải bằng đáp án
  var dungHet = ps.length > 0 && (ps[ps.length - 1][0] * mau === ps[ps.length - 1][1] * tu);
  if (!dungHet) c.noi_dung_man_hinh = ['P = \\frac{' + tu + '}{' + mau + '}'];
  var noi = String(c.loi_thoai || '').toLowerCase();
  var coTu = noi.indexOf(soThanhChu_(tu)) >= 0 || new RegExp('(^|\\D)' + tu + '(\\D|$)').test(noi);
  var coMau = noi.indexOf(soThanhChu_(mau)) >= 0 || new RegExp('(^|\\D)' + mau + '(\\D|$)').test(noi);
  var saiSo = /\d+\s*(phần|trên)\s*\d+/.exec(noi);
  if (LA_RE_.test(noi) || LA_RE_.test(String(c.noi_dung_man_hinh).toLowerCase())) { coTu = false; c.noi_dung_man_hinh = ['P = \\frac{' + tu + '}{' + mau + '}']; }
  if (!(coTu && coMau) || (saiSo && !new RegExp('^' + tu + '\\s*(phần|trên)\\s*' + mau + '$').test(saiSo[0]))) {
    c.loi_thoai = 'Vậy xác suất cần tìm là ' + soThanhChu_(tu) + ' phần ' + soThanhChu_(mau) + '.';
  }
  kb.dap_an_cuoi = String(dapAn);
}

var LA_RE_ = /hết hạn mức|hạn mức|quota|rate limit|resource_exhausted|xin lỗi|mô hình ngôn ngữ|trí tuệ nhân tạo|là một ai|as an ai|không thể (giúp|trả lời|hoàn thành)|todo|lorem|\bundefined\b/;

// Câu thông báo của hệ thống/AI lọt vào nội dung video (ví dụ "hết hạn mức", "xin lỗi", "là một mô hình ngôn ngữ").
function noiDungLa_(kb) {
  var txt = JSON.stringify([kb.canh, kb.hook, kb.hook_chu, kb.tieu_de]).toLowerCase();
  var m = LA_RE_.exec(txt);
  return m ? 'NOI_DUNG_LA: nội dung có cụm "' + m[0] + '" (câu thông báo của hệ thống/AI, không phải lời giảng). Viết lại hoàn toàn bằng nội dung bài toán, không nhắc tới hạn mức hay xin lỗi.' : '';
}

// Cách trình bày công thức: "cong_don" = viết thêm lên bảng (dòng sau mở rộng dòng trước), "bien_doi" = các dòng biến hình thay thế nhau, "xep" = xếp chồng.
function kiemTraTrinhBay_(kb) {
  for (var i = 0; i < kb.canh.length; i++) {
    var c = kb.canh[i], tb = c.trinh_bay;
    if (tb === undefined || tb === null || tb === '') continue;
    if (tb !== 'bien_doi' && tb !== 'cong_don' && tb !== 'xep') return 'TRINH_BAY_SAI_CANH_' + (i + 1) + ': "trinh_bay" phải là "cong_don", "bien_doi" hoặc "xep".';
    if (tb === 'bien_doi' || tb === 'cong_don') {
      var d = c.noi_dung_man_hinh || [];
      var toiDa = tb === 'cong_don' ? 6 : 4;
      if (d.length < 1 || d.length > toiDa) return 'BIEN_DOI_SO_DONG_CANH_' + (i + 1) + ': "' + tb + '" cần 1-' + toiDa + ' dòng.';
      for (var j = 0; j < d.length; j++) {
        if (String(d[j]).replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}\s]/g, '').length > 64) return 'BIEN_DOI_DONG_DAI_CANH_' + (i + 1) + ': mỗi dòng của "bien_doi"/"cong_don" tối đa khoảng 60 ký tự hiển thị; hãy rút gọn hoặc dùng "xep".';
      }
    }
  }
  return '';
}

// Khung chú thích: tối đa 3 dòng ngắn.
function kiemTraChuThich_(kb) {
  for (var i = 0; i < kb.canh.length; i++) {
    var ct = kb.canh[i].chu_thich;
    if (ct === undefined || ct === null) continue;
    if (!Array.isArray(ct) || ct.length > 3) return 'CHU_THICH_CANH_' + (i + 1) + ': "chu_thich" là mảng tối đa 3 dòng ngắn.';
    for (var j = 0; j < ct.length; j++) if (String(ct[j]).length > 60) return 'CHU_THICH_DAI_CANH_' + (i + 1) + ': mỗi dòng chú thích tối đa 60 ký tự.';
  }
  return '';
}

// Kiểm tra cách dạy: phải có ý tưởng then chốt, có cảnh "y_do"/"diem_chot", không mở cảnh giải bằng "áp dụng công thức".
function kiemTraCachDay_(kb) {
  if (String(kb.y_tuong_chinh || '').trim().length < 30) return 'THIEU_Y_TUONG_CHINH: "y_tuong_chinh" phải là một câu (ít nhất 30 ký tự) nêu ý tưởng then chốt làm bài toán trở nên dễ hiểu.';
  var co = false;
  for (var i = 0; i < kb.canh.length; i++) {
    var c = kb.canh[i], l = String(c.loai || '');
    if (/y_do|diem_chot|mo_hinh/i.test(l)) co = true;
    if (/huong|tinh|thu_nho|diem_chot/i.test(l) && /^\s*(áp dụng|dùng|sử dụng|ta có)\s+(công thức|định lý|quy tắc)/i.test(String(c.loi_thoai || ''))) {
      return 'RAP_KHUON_CANH_' + (i + 1) + ': cảnh không được mở bằng "áp dụng công thức". Hãy nói vì sao nghĩ tới hướng này (ý đồ bài toán, quan sát) rồi mới nhắc công thức nếu cần.';
    }
  }
  if (!co) return 'THIEU_CANH_Y_DO: phải có ít nhất một cảnh loai "y_do" (bài toán thật sự hỏi gì) hoặc "diem_chot" (ý tưởng then chốt).';
  return '';
}

// Thay cho hopLeKichBan_ cũ trong Code.gs (xóa hàm cũ). Giữ các kiểm tra cũ, thêm kiểm tra hình minh họa.
// Đánh giá kịch bản, gom TẤT CẢ lỗi một lần và chia hai mức:
//  - nang: làm hỏng video hoặc sai nội dung (thiếu lời thoại, sai đáp án, không vẽ hình của đề, quá dài nhiều...) -> phải sửa.
//  - nhe : chỉ chưa đẹp theo quy ước (tiêu đề, hook, số cảnh có hình...) -> thử sửa một lần, còn thì vẫn dùng được.
// Gọi SAU tuSuaKichBan_ (máy đã tự sửa phần lớn lỗi vặt).
function danhGiaKichBan_(kb, dapAn, mon, coHinhDe, sanPham, deGoc) {
  var nang = [], nhe = [];
  var them = function (ds, loi) { if (loi) ds.push(loi); };
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return { nang: ['KHONG_CO_CANH: kịch bản phải có mảng "canh" gồm 14-18 cảnh.'], nhe: [] };
  // VIDEO NHIỀU CẢNH, CHI TIẾT: 14-18 cảnh (dưới 10 hoặc trên 22 phải viết lại; 10-13 vẫn dùng được nhưng nhắc tách thêm)
  if (kb.canh.length < 10 || kb.canh.length > 24) nang.push('SO_CANH_NGOAI_10_DEN_24: hiện có ' + kb.canh.length + ' cảnh, cần 15-20 cảnh (mỗi cảnh một ý: mỗi bước tính một cảnh, đề bài 1-2 cảnh, mô phỏng 2-3 cảnh...).');
  else if (kb.canh.length < 14) nhe.push('IT_CANH: ' + kb.canh.length + ' cảnh, nên tách thành 15-20 cảnh cho chi tiết (mỗi bước tính, mỗi ý một cảnh).');
  var thucTe = String(mon || '').toUpperCase() === 'THUC_TE';
  if (!Array.isArray(kb.bai_hoc_rut_ra) || kb.bai_hoc_rut_ra.filter(function (x) { return String(x).trim().length >= 8; }).length < 2) nhe.push('THIEU_BAI_HOC_RUT_RA: cần "bai_hoc_rut_ra" là mảng 3 câu ngắn (mỗi câu ≤ 12 từ).');
  if (!kb.canh.some(function (c) { return /tinh|giai/i.test(String(c.loai || '')); })) nhe.push('THIEU_CANH_TINH_TOAN: cần ít nhất một cảnh "tinh_toan".');
  if (!/bai_hoc|ket_luan|chot/i.test(String(kb.canh[kb.canh.length - 1].loai || ''))) nhe.push('THIEU_CANH_BAI_HOC: cảnh cuối phải là "bai_hoc".');
  var tong = 0;
  for (var i = 0; i < kb.canh.length; i++) {
    var c = kb.canh[i];
    if (!c.loi_thoai || !String(c.loi_thoai).trim()) { nang.push('THIEU_LOI_THOAI_CANH_' + (i + 1) + ': cảnh nào cũng phải có lời thoại.'); continue; }
    if (/[\\$]/.test(c.loi_thoai)) nang.push('LOI_THOAI_CHUA_LATEX_CANH_' + (i + 1));
    tong += uocGiayDoc_(c.loi_thoai);
  }
  if (/^\s*(xin\s+)?chào/i.test(kb.canh[0].loi_thoai) && !(typeof cauHinh_ === 'function' && cauHinh_('KIEU_MO_DAU') === 'chao_hook')) nhe.push('MO_DAU_BANG_LOI_CHAO');
  var gioiHan = Math.max(Number(cauHinh_('GIAY_TOI_DA')) || 190, 180);   // video nhiều cảnh: tối thiểu 180 giây dù CAU_HINH còn giá trị cũ
  if (tong > gioiHan * 1.15) nang.push('QUA_DAI_' + tong + '_GIAY');
  else if (tong > gioiHan) nhe.push('QUA_DAI_' + tong + '_GIAY');
  if (String(kb.dap_an_cuoi).replace(/\s/g, '') !== dapAn) nang.push('DAP_AN_CUOI_SAI');

  var idTruoc = {}, soSanKhau = 0, so3D = 0, soMoHinh = 0, coHinh = 0;
  for (var j = 0; j < kb.canh.length; j++) {
    var cj = kb.canh[j];
    var laSK = cj.minh_hoa && cj.minh_hoa.loai === 'san_khau';
    var idCu = laSK && cj.giu_san_khau ? idTruoc : null;
    them(nhe, kiemTraMinhHoa_(cj.minh_hoa, j + 1, idCu));
    if (j > 0 && String(cj.tieu_de_canh || '').trim().length < 6) nhe.push('THIEU_TIEU_DE_CANH_' + (j + 1) + ': cần "tieu_de_canh" 3-8 từ.');
    if (demTu_(cj.tieu_de_canh) > 10) nhe.push('TIEU_DE_CANH_DAI_' + (j + 1));
    if (laSK && laDT_(cj.minh_hoa.du_lieu) && Array.isArray(cj.minh_hoa.du_lieu.vat)) {
      soSanKhau++;
      var moi = {};
      if (cj.giu_san_khau) Object.keys(idTruoc).forEach(function (k) { moi[k] = true; });
      cj.minh_hoa.du_lieu.vat.forEach(function (v) { if (v) moi[v.id] = true; });
      idTruoc = moi;
      if (cj.minh_hoa.du_lieu.vat.some(function (v) { return v && VAT_3D_.indexOf(v.loai) >= 0; })) so3D++;
      if (cj.minh_hoa.du_lieu.vat.some(function (v) { return v && VAT_MO_HINH_.indexOf(v.loai) >= 0; })) soMoHinh++;
    } else idTruoc = {};
    if (cj.minh_hoa && cj.minh_hoa.loai && cj.minh_hoa.loai !== 'khong') {
      coHinh++;
      if (String(cj.minh_hoa.mo_ta || '').trim().length < 40) nhe.push('MO_TA_HINH_QUA_NGAN_CANH_' + (j + 1));
    }
  }
  them(nang, noiDungLa_(kb));
  kiemTraPhepTinh_(kb).forEach(function (x) { nang.push(x); });
  kiemTraHinhDungYen_(kb).forEach(function (x) { nhe.push(x); });
  kiemTraNhanDai_(kb).forEach(function (x) { nhe.push(x); });
  kiemTraBaCham_(kb).forEach(function (x) { nang.push(x); });
  kiemTraCuPhapTex_(kb).forEach(function (x) { nang.push(x); });
  kiemTraVatThucDe_(kb, deGoc).forEach(function (x) { nang.push(x); });
  kiemTraBoCucDe_(kb, deGoc).forEach(function (x) { nang.push(x); });
  // CÔNG THỨC: phải có cảnh giải thích công thức (từ đâu ra, ý nghĩa đại lượng, áp dụng); mỗi cảnh ≤ 3 dòng công thức
  var dungCongThuc = kb.canh.some(function (c) { return /tinh|giai/.test(String(c && c.loai)) && (c.noi_dung_man_hinh || []).some(function (d) { return /=/.test(String(d)); }); });
  var soGiaiThich = kb.canh.filter(laCanhGiaiThichCongThuc_).length;
  if (dungCongThuc && soGiaiThich === 0) nang.push('THIEU_GIAI_THICH_CONG_THUC: bài dùng công thức nhưng không có cảnh "nhac_lai" giải thích. Thêm 2-3 cảnh nhac_lai trước phần tính: công thức TỪ ĐÂU RA, Ý NGHĨA từng đại lượng (chỉ lên hình), ÁP DỤNG vào bài này thế nào.');
  else if (dungCongThuc && soGiaiThich < 2) nhe.push('GIAI_THICH_CONG_THUC_SO_SAI: chỉ có ' + soGiaiThich + ' cảnh nhac_lai; nên 2-3 cảnh (từ đâu ra, ý nghĩa đại lượng, áp dụng vào bài).');
  kb.canh.forEach(function (c, j) { if (c && Array.isArray(c.noi_dung_man_hinh) && c.noi_dung_man_hinh.length > 3) nhe.push('QUA_NHIEU_DONG_CONG_THUC_CANH_' + (j + 1) + ': ' + c.noi_dung_man_hinh.length + ' dòng công thức (chữ sẽ nhỏ). Tối đa 2-3 dòng mỗi cảnh, tách phần còn lại sang cảnh sau.'); });
  if (!kb.canh.some(function (c) { return /lien_he/.test(String(c && c.loai)); })) nhe.push('THIEU_LIEN_HE_THUC_TE: nên có 1 cảnh "lien_he_thuc_te": cách nghĩ/công thức này dùng ở đâu ngoài đời (2-3 ví dụ cụ thể, có hình vật thật).');
  // cảnh ĐỀ BÀI phải cho thấy VẬT THẬT của đề (hộp bi, xúc xắc, đồng xu, người, cột cờ...), không chỉ toàn khung chữ
  var CHU_THUAN_ = ['nhan', 'chu', 'the', 'danh_sach', 'so_dem', 'mui_ten'];
  kb.canh.forEach(function (c, j) {
    if (!c || String(c.loai) !== 'de_bai') return;
    var du = c.minh_hoa && c.minh_hoa.du_lieu;
    var vat = du && Array.isArray(du.vat) ? du.vat : [];
    var coVat = vat.some(function (v) { return v && CHU_THUAN_.indexOf(v.loai) < 0; }) || (c.giu_san_khau && j > 0);
    if (!coVat) nang.push('DE_BAI_CHI_CO_CHU_CANH_' + (j + 1) + ': cảnh đề bài chỉ có khung chữ. Phải vẽ VẬT THẬT của đề (' + (thucTe ? 'canh_that với vật thật' : 'hop_bi với đúng số bi từng màu, xuc_xac, dong_xu, the_bai, nguoi, vong_quay...') + ') - thẻ ĐỀ CHO / CẦN TÌM máy đã tự hiện, không cần nhắc lại bằng chữ trên sân khấu.');
  });
  var hinhHocMon = String(mon || '').toUpperCase() === 'HINH_HOC';
  if (hinhHocMon) {
    // bài hình học: hình chính (hinh_hoc) phải có ngay từ đầu và xuyên suốt phần lời giải
    var coHH = kb.canh.map(function (c) { var du = c && c.minh_hoa && c.minh_hoa.du_lieu; return !!(du && Array.isArray(du.vat) && du.vat.some(function (v) { return v && (v.loai === 'hinh_hoc' || v.loai === 'hinh_tu_do'); })) || !!(c && c.giu_san_khau); });
    if (!coHH.slice(0, 3).some(Boolean)) nang.push('THIEU_HINH_HINH_HOC: bài hình học nhưng 3 cảnh đầu không vẽ hình (hinh_hoc với các điểm, cạnh, đường tròn của đề).');
    if (coHH.filter(Boolean).length < Math.ceil(kb.canh.length / 2)) nhe.push('IT_HINH_HINH_HOC: bài hình học nên giữ hình chính (giu_san_khau) trong hầu hết các cảnh giải, tô sáng đúng cạnh/góc đang nói.');
  } else if (!thucTe) {
    // xác suất: mô phỏng phải đa dạng (ít nhất 4 loại vật chính), không lặp một kiểu hình cả video
    var loaiChinh = {};
    kb.canh.forEach(function (c) { var du = c && c.minh_hoa && c.minh_hoa.du_lieu; if (du && Array.isArray(du.vat)) du.vat.forEach(function (v) { if (v && VAT_PHU_.indexOf(v.loai) < 0 && v.loai !== 'danh_sach') loaiChinh[v.loai] = 1; }); });
    if (Object.keys(loaiChinh).length < 4) nhe.push('MO_PHONG_DON_DIEU: cả video chỉ dùng ' + Object.keys(loaiChinh).length + ' loại vật chính (' + Object.keys(loaiChinh).join(', ') + '). Video xác suất cần ít nhất 4 loại khác nhau (hop_bi, xuc_xac, vong_quay, the_bai, luoi_o, bieu_do_cot, dong_ho_do, banh...) và mỗi cảnh có hành động (lay_ra, quay, mo, dat_gia_tri).');
  }
  var qt = kiemTraQuyTrinh_(kb, deGoc);
  qt.nang.forEach(function (x) { nang.push(x); });
  qt.nhe.forEach(function (x) { nhe.push(x); });
  them(nhe, kiemTraCachDay_(kb));
  them(nhe, kiemTraTrinhBay_(kb));
  them(nhe, kiemTraChuThich_(kb));
  them(nhe, kiemTraHook_(kb));
  them(nhe, kiemTraNoiCanh_(kb));
  if (coHinhDe) {
    // coHinhDe: chữ của đề + mô tả hình. Vật 3D chỉ được tính là "vẽ đúng hình" khi đề nhắc đúng loại vật đó.
    var chuDe = String(coHinhDe).toLowerCase();
    // đề XẾP CHỒNG (ống, lon, gạch, khúc gỗ xếp thành tầng/hàng): phải vẽ đúng chồng vật (nét xep_chong hoặc các hình tròn), không thay bằng một khối trụ/hộp
    var xepChong = /xếp|chồng|chất/.test(chuDe) && /tầng|hàng|lớp|chồng/.test(chuDe);
    var veHinh = kb.canh.slice(0, 3).some(function (c) {
      var du0 = c && c.minh_hoa && c.minh_hoa.du_lieu;
      if (xepChong) return !!(du0 && Array.isArray(du0.vat) && du0.vat.some(function (v) { return v && v.loai === 'hinh_tu_do' && Array.isArray(v.hinh) && v.hinh.some(function (h) { return h && (h.kieu === 'xep_chong' || h.kieu === 'tron' || (h.kieu === 'lap' && h.hinh && h.hinh.kieu === 'tron')); }); }));
      var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
      if (!c || !c.minh_hoa || c.minh_hoa.loai !== 'san_khau' || !du || !Array.isArray(du.vat)) return false;
      return du.vat.some(function (v) {
        if (!v) return false;
        if (VAT_MO_HINH_.indexOf(v.loai) >= 0) return true;
        var tu = TU_VAT_3D_[v.loai];
        return !!tu && tu.test(chuDe);
      });
    });
    if (!veHinh && xepChong) nang.push('THIEU_HINH_DE: đề XẾP CHỒNG vật thành tầng/hàng. 3 cảnh đầu phải vẽ đúng chồng vật bằng hinh_tu_do với nét {"kieu":"xep_chong","tam":[50,55],"r":44,"hang":[số vật từng tầng từ trên xuống]} (hoặc "tren"/"duoi"), KHÔNG dùng một khối trụ/hộp thay cho cả chồng.');
    else if (!veHinh) nang.push('THIEU_HINH_DE: đề có hình (ảnh kèm hoặc hình dạng cụ thể) nhưng 3 cảnh đầu không vẽ lại hình đó. Hãy vẽ ĐÚNG hình của đề ở cảnh mo_dau hoặc de_bai: cảnh thực tế dùng canh_that (vật thật + số đo), hình học dùng hinh_hoc/hinh_tu_do; không thay bằng vật khác.');
  }
  var taiChinh = laDeTaiChinh_(deGoc);
  if (taiChinh) { var tcK = kiemTraTaiChinh_(kb, deGoc); tcK.nang.forEach(function (x) { nang.push(x); }); tcK.nhe.forEach(function (x) { nhe.push(x); }); }
  if (thucTe && !taiChinh && so3D < 2 && !coHinhDe) nhe.push('THIEU_CANH_3D: video toán thực tế nên có ít nhất 2 cảnh có vật 3D thật dựng lại tình huống của đề.');
  if (thucTe && soMoHinh < 1) nhe.push('THIEU_MO_HINH: video toán thực tế nên có ít nhất 1 cảnh hinh_hoc, do_thi hoặc hinh_tu_do để mô hình hóa.');
  var canDA = kb.canh[timCanhDapAn_(kb)];
  var dsDA = (canDA && canDA.noi_dung_man_hinh) || [];
  if (laDapSo_(dapAn) && !coDapSo_(dsDA.length ? String(dsDA[dsDA.length - 1]) : '', dapAn)) nang.push('DAP_AN_SAI_TREN_MAN_HINH: dòng cuối của cảnh đáp án phải chứa đáp số ' + dapAn + '.');
  var psDA = cacPhanSo_(dsDA.length ? String(dsDA[dsDA.length - 1]) : '');
  var mDA = /^(\d+)\/(\d+)$/.exec(String(dapAn).replace(/\s/g, ''));
  if (mDA && psDA.length && (psDA[psDA.length - 1][0] * Number(mDA[2]) !== psDA[psDA.length - 1][1] * Number(mDA[1]))) nang.push('DAP_AN_SAI_TREN_MAN_HINH: phân số cuối ở dòng cuối của cảnh đáp án không bằng ' + dapAn + '.');
  var can = Math.max(3, Math.ceil(kb.canh.length / 2));
  if (coHinh < can) nhe.push('IT_HINH_MINH_HOA: chỉ có ' + coHinh + ' cảnh có hình, nên có ít nhất ' + can + '.');
  var canSK = Math.min(3, kb.canh.length - 2);
  if (soSanKhau < canSK) nhe.push('IT_SAN_KHAU: chỉ có ' + soSanKhau + ' cảnh dùng "san_khau", nên có ít nhất ' + canSK + '.');
  // CÂU NỐI ĐA DẠNG: không lặp cùng một câu mở đầu cảnh trong video, không dùng lại y nguyên các câu mở của video gần đây
  if (typeof moDauCau_ === 'function') {
    var demMo = {}, dem2 = {}, trungCu = [], ganDay = typeof cauNoiGanDay_ === 'function' ? cauNoiGanDay_(kb.id) || [] : [];
    kb.canh.forEach(function (c, i) {
      var m = moDauCau_(c.loi_thoai), m2 = m.split(' ').slice(0, 2).join(' ');
      if (m.split(' ').length < 3) return;
      demMo[m] = (demMo[m] || 0) + 1; dem2[m2] = (dem2[m2] || 0) + 1;
      if (ganDay.indexOf(m) >= 0) trungCu.push('cảnh ' + (i + 1) + ' "' + m + '"');
    });
    var lap = Object.keys(demMo).filter(function (k) { return demMo[k] >= 2; }).concat(Object.keys(dem2).filter(function (k) { return dem2[k] >= 3; }));
    if (lap.length) nhe.push('CAU_NOI_LAP: các cảnh mở đầu giống nhau ("' + lap.slice(0, 3).join('", "') + '"). Mỗi cảnh mở bằng một cách nói khác, đúng phong cách lời của video.');
    if (trungCu.length >= 3) nhe.push('CAU_NOI_CU: ' + trungCu.slice(0, 4).join(', ') + ' dùng lại y nguyên câu mở của video trước. Viết lại cho mới.');
  }
  if (sanPham && typeof kiemTraSanPhamTrongKichBan_ === 'function') kiemTraSanPhamTrongKichBan_(kb, sanPham).forEach(function (x) { (/\(nhẹ\)/.test(x) ? nhe : nang).push(x); });
  return { nang: nang, nhe: nhe };
}

// Giữ tên cũ: trả lỗi đầu tiên (nặng trước), '' nếu hoàn hảo.
function hopLeKichBan_(kb, dapAn, mon, coHinhDe) {
  var d = danhGiaKichBan_(kb, dapAn, mon, coHinhDe);
  return d.nang[0] || d.nhe[0] || '';
}


/* ===================== TOÁN THỰC TẾ: VẬT 3D, HÌNH HỌC, ĐỒ THỊ, ĐÁP SỐ ===================== */

// Kiểm tra dữ liệu riêng của các vật toán thực tế. Trả '' nếu hợp lệ.
function kiemTraVatThucTe_(v, ev) {
  var kt = v.kich_thuoc;
  if (kt !== undefined) {
    var can = v.loai === 'khoi_hop' || v.loai === 'toa_nha' ? 3 : v.loai === 'cau' ? 1 : 2;
    if (!Array.isArray(kt) || kt.length < can || kt.slice(0, can).some(function (x) { return !(Number(x) > 0); })) return 'HINH_' + ev + ': "kich_thuoc" của ' + v.loai + ' là mảng ' + can + ' số dương (' + (can === 3 ? '[dài, rộng, cao]' : can === 2 ? '[bán kính, chiều cao]' : '[bán kính]') + '), ghi số thật của đề.';
  }
  if (v.muc_nuoc !== undefined && !(Number(v.muc_nuoc) >= 0 && Number(v.muc_nuoc) <= 1)) return 'HINH_' + ev + ': "muc_nuoc" là tỉ lệ 0-1 (0.5 = nửa bể).';
  if (v.loai === 'thang' && v.goc_nghieng !== undefined && !(Number(v.goc_nghieng) >= 5 && Number(v.goc_nghieng) <= 85)) return 'HINH_' + ev + ': "goc_nghieng" của thang là góc với mặt đất 5-85 độ.';
  if (v.loai === 'hinh_tu_do') return kiemTraHinhTuDo_(v, ev);
  if (v.loai === 'hinh_hoc') {
    if (!laDT_(v.diem) || Object.keys(v.diem).length < 2) return 'HINH_' + ev + ': hinh_hoc cần "diem" là đối tượng {"A":[x,y],...} có ít nhất 2 điểm, tọa độ 0-100.';
    var ten = Object.keys(v.diem);
    for (var i = 0; i < ten.length; i++) {
      var xy = v.diem[ten[i]];
      if (!Array.isArray(xy) || xy.length < 2 || !laSo_(Number(xy[0])) || !laSo_(Number(xy[1])) || xy[0] < -10 || xy[0] > 110 || xy[1] < -10 || xy[1] > 110) return 'HINH_' + ev + ': điểm "' + ten[i] + '" của hinh_hoc cần [x, y] là số 0-100.';
    }
    var co = function (k) { return typeof k === 'string' && !!v.diem[k]; };
    var ds = [['canh', 2], ['goc', 3], ['vuong', 3], ['to', 3], ['tron', 2], ['phu', 2], ['bang', 2]];
    for (var d = 0; d < ds.length; d++) {
      var mang = v[ds[d][0]];
      if (mang === undefined) continue;
      if (!Array.isArray(mang)) return 'HINH_' + ev + ': "' + ds[d][0] + '" của hinh_hoc phải là mảng.';
      for (var j = 0; j < mang.length; j++) {
        var it = mang[j];
        if (!Array.isArray(it) || it.length < ds[d][1]) return 'HINH_' + ev + ': mỗi phần tử "' + ds[d][0] + '" cần ít nhất ' + ds[d][1] + ' tên điểm.';
        var soDiem = ds[d][0] === 'to' ? it.length : ds[d][1];
        for (var q = 0; q < soDiem; q++) if (!co(it[q])) return 'HINH_' + ev + ': "' + ds[d][0] + '" nhắc tới điểm "' + it[q] + '" không có trong "diem".';
      }
    }
    if (!Array.isArray(v.canh) || !v.canh.length) return 'HINH_' + ev + ': hinh_hoc cần ít nhất 1 cạnh trong "canh" [["A","B","nhãn"]].';
  }
  if (v.loai === 'do_thi') {
    if (!laChuoi_(v.ham)) return 'HINH_' + ev + ': do_thi cần "ham" là biểu thức theo x (ví dụ "x^2+128/x").';
    var tu = Number(v.x_tu), den = Number(v.x_den);
    if (!laSo_(tu) || !laSo_(den) || den <= tu) return 'HINH_' + ev + ': do_thi cần "x_tu" < "x_den" (khoảng vẽ nằm trong điều kiện của ẩn).';
    var f = phanTichBieuThuc_(v.ham, v.kieu === 'do');
    if (!f) return 'HINH_' + ev + ': "ham" = "' + v.ham + '" không đọc được. Viết kiểu máy tính: dùng * ^ / ( ), sqrt, sin, cos, tan, ln, log, exp, abs; không LaTeX, không "y =".';
    var tot = 0;
    for (var k = 0; k <= 40; k++) { var y = f(tu + (den - tu) * k / 40); if (isFinite(y)) tot++; }
    if (tot < 25) return 'HINH_' + ev + ': hàm "' + v.ham + '" không xác định trên phần lớn khoảng [' + tu + ', ' + den + ']; hãy chọn khoảng vẽ nằm trong miền xác định.';
  }
  return '';
}

// Đáp số dạng số (toán thực tế) chứ không phải phân số xác suất.
function laDapSo_(dapAn) { return /^-?\d+(\.\d+)?$/.test(String(dapAn).trim()); }
// Dòng công thức có chứa đáp số không (chấp nhận 12.5, 12,5, 12{,}5).
function coDapSo_(dong, dapAn) {
  var t = String(dong).replace(/\{,\}/g, ',').replace(/\\,|\\ |~/g, '').replace(/(\d)[\s.](?=\d{3}(\D|$))/g, '$1');   // bỏ dấu phân cách nghìn "138 548"
  var dung = Number(String(dapAn).trim());
  var so = (t.match(/-?\d+(?:[.,]\d+)?/g) || []).map(function (x) { return Number(x.replace(',', '.')); });
  // khớp nếu có một số bằng đáp số, hoặc là đáp số đã làm tròn (theo số chữ số thập phân đang hiện)
  return so.some(function (x) {
    if (!isFinite(x) || !isFinite(dung)) return false;
    var le = (String(x).split('.')[1] || '').length;
    return Math.abs(x - dung) <= Math.max(1e-9, 1e-6 * Math.abs(dung)) || Math.abs(x - dung) <= 0.5 * Math.pow(10, -le) + 1e-9;
  });
}
// Đọc đáp số thành lời: 12.5 -> "mười hai phẩy năm".
function docDapSo_(dapAn) {
  var s = String(dapAn).trim(), am = s.charAt(0) === '-';
  if (am) s = s.slice(1);
  var p = s.split('.');
  var chu = soThanhChu_(Number(p[0]));
  if (p[1]) chu += ' phẩy ' + (p[1].length <= 2 && p[1].charAt(0) !== '0' ? soThanhChu_(Number(p[1])) : p[1].split('').map(function (c) { return soThanhChu_(Number(c)); }).join(' '));
  return (am ? 'âm ' : '') + chu;
}
// Bản suaDapAn_ cho đáp số: dòng cuối cảnh đáp án phải chứa đáp số, lời thoại phải đọc đúng số.
function suaDapSo_(kb, dapAn) {
  var c = kb.canh[timCanhDapAn_(kb)];
  c.loai = 'dap_an';
  var ds = Array.isArray(c.noi_dung_man_hinh) ? c.noi_dung_man_hinh : [];
  var cuoi = ds.length ? String(ds[ds.length - 1]) : '';
  var soTex = String(dapAn).replace('.', '{,}');
  if (!coDapSo_(cuoi, dapAn) || LA_RE_.test(cuoi.toLowerCase())) {
    var hien = String(kb.dap_an_hien || '').trim();
    ds = ds.slice(0, 3).concat([hien && coDapSo_(hien, dapAn) && hien.length <= 40 ? '\\text{' + hien.replace(/[{}\\]/g, '') + '}' : '\\text{Đáp số: } ' + soTex]);
    c.noi_dung_man_hinh = ds;
  }
  var noi = String(c.loi_thoai || '').toLowerCase();
  var docSo = docDapSo_(dapAn);
  var coSo = noi.indexOf(docSo) >= 0 || coDapSo_(noi, dapAn);
  if (!coSo || LA_RE_.test(noi)) c.loi_thoai = String(c.loi_thoai && !LA_RE_.test(noi) ? c.loi_thoai.replace(/\s*$/, ' ') : '') + 'Vậy đáp số là ' + docSo + '.';
  kb.dap_an_cuoi = String(dapAn);
}

// Bộ đọc biểu thức một biến (giống src/sankhau/bieuthuc.ts của bộ dựng video): trả hàm f(x) hoặc null nếu viết sai.
function phanTichBieuThuc_(nguon, theoDo) {
  var D = theoDo ? Math.PI / 180 : 1;
  var HAM = { sqrt: Math.sqrt, can: Math.sqrt, sin: function (a) { return Math.sin(a * D); }, cos: function (a) { return Math.cos(a * D); }, tan: function (a) { return Math.tan(a * D); },
    abs: Math.abs, ln: Math.log, log: function (a) { return Math.log(a) / Math.LN10; }, exp: Math.exp, asin: Math.asin, acos: Math.acos, atan: Math.atan };
  var tenHam = Object.keys(HAM).sort(function (a, b) { return b.length - a.length; });
  var s = String(nguon || '').toLowerCase().replace(/\s+/g, '').replace(/(\d),(\d)/g, '$1.$2').replace(/×|·/g, '*').replace(/÷|:/g, '/')
    .replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/\*\*/g, '^');
  var i = 0;
  function nhin() { return s.charAt(i); }
  function loi() { throw new Error('bieu_thuc'); }
  function tong() {
    var a = tich();
    while (nhin() === '+' || nhin() === '-') {
      var op = s.charAt(i++), b = tich(), aa = a;
      a = op === '+' ? (function (p, q) { return function (x) { return p(x) + q(x); }; })(aa, b) : (function (p, q) { return function (x) { return p(x) - q(x); }; })(aa, b);
    }
    return a;
  }
  function tich() {
    var a = dau();
    for (;;) {
      var c = nhin();
      if (c === '*' || c === '/') {
        i++;
        var b = dau(), aa = a;
        a = c === '*' ? (function (p, q) { return function (x) { return p(x) * q(x); }; })(aa, b) : (function (p, q) { return function (x) { return p(x) / q(x); }; })(aa, b);
      } else if (c && /[0-9.a-z(]/.test(c)) {
        var b2 = dau(), a2 = a;
        a = (function (p, q) { return function (x) { return p(x) * q(x); }; })(a2, b2);
      } else break;
    }
    return a;
  }
  function dau() {
    if (nhin() === '-') { i++; var a = dau(); return function (x) { return -a(x); }; }
    if (nhin() === '+') { i++; return dau(); }
    return luyThua();
  }
  function luyThua() {
    var a = coSo();
    if (nhin() === '^') { i++; var b = dau(); return function (x) { return Math.pow(a(x), b(x)); }; }
    return a;
  }
  function coSo() {
    var c = nhin();
    if (c === '(') { i++; var a = tong(); if (nhin() !== ')') loi(); i++; return a; }
    if (c && /[0-9.]/.test(c)) {
      var m = /^[0-9]*\.?[0-9]+(e[+-]?[0-9]+)?/.exec(s.slice(i));
      if (!m) loi();
      i += m[0].length;
      var v = parseFloat(m[0]);
      return function () { return v; };
    }
    var m2 = /^[a-z]+/.exec(s.slice(i));
    if (!m2) loi();
    var ten = m2[0];
    if (ten.charAt(0) === 'x') { i += 1; return function (x) { return x; }; }
    if (ten.indexOf('pi') === 0) { i += 2; return function () { return Math.PI; }; }
    for (var k = 0; k < tenHam.length; k++) {
      if (ten.indexOf(tenHam[k]) === 0) {
        i += tenHam[k].length;
        var g = HAM[tenHam[k]], arg = luyThua();
        return function (x) { return g(arg(x)); };
      }
    }
    if (ten.charAt(0) === 'e') { i += 1; return function () { return Math.E; }; }
    return loi();
  }
  try {
    var f = tong();
    return i === s.length ? f : null;
  } catch (e) { return null; }
}


/* ===================== MẠCH NỐI GIỮA CÁC CẢNH ===================== */

var MO_MAY_MOC_ = /^\s*(bước\s+(tiếp theo|kế tiếp|đầu tiên)|tiếp theo\s*[,:]|sau đây|bây giờ\s+(chúng\s+)?(ta|mình)\s+sẽ|cảnh\s+(này|tiếp)|cái bẫy (ở đây|là)|đầu tiên\s*(,|ta|chúng ta)|ở bước này|tiếp tục\s*[,:])/i;

// Lời thoại phải nghe như một bài nói liền mạch: không được nhiều cảnh mở bằng câu chuyển máy móc, không lặp một kiểu mở đầu.
function kiemTraNoiCanh_(kb) {
  var mayMoc = [], dau = {};
  for (var i = 1; i < kb.canh.length; i++) {
    var lt = String(kb.canh[i].loi_thoai || '').trim();
    if (MO_MAY_MOC_.test(lt)) mayMoc.push(i + 1);
    var hai = lt.toLowerCase().split(/\s+/).slice(0, 2).join(' ');
    if (hai.length >= 4) dau[hai] = (dau[hai] || 0) + 1;
  }
  if (mayMoc.length >= 2) return 'NOI_CANH_MAY_MOC: các cảnh ' + mayMoc.join(', ') + ' mở bằng câu chuyển máy móc ("Bước tiếp theo", "Tiếp theo,", "Cái bẫy ở đây là"...). Hãy viết câu NỐI tự nhiên bắt từ ý cảnh trước, như một người đang nói liền mạch.';
  for (var k in dau) if (dau[k] >= 3) return 'NOI_CANH_LAP: ' + dau[k] + ' cảnh cùng mở đầu bằng "' + k + '...". Mỗi cảnh cần một câu nối khác nhau.';
  return '';
}


// Hình tự do: khung, danh sách nét hợp lệ (tọa độ là số, đa giác ≥ 3 điểm, svg chỉ gồm lệnh đường dẫn...).
function kiemTraHinhTuDo_(v, ev) {
  if (v.khung !== undefined && (!Array.isArray(v.khung) || v.khung.length < 2 || !(Number(v.khung[0]) >= 10) || !(Number(v.khung[1]) >= 10))) return 'HINH_' + ev + ': "khung" của hinh_tu_do là [rộng, cao] (ví dụ [100,100]).';
  if (!Array.isArray(v.hinh) || !v.hinh.length) return 'HINH_' + ev + ': hinh_tu_do cần "hinh" là mảng các nét {kieu, ...} (da_giac, duong, tron, koch...).';
  if (v.hinh.length > 60) return 'HINH_' + ev + ': hinh_tu_do tối đa 60 nét.';
  var laDiem = function (p) { return Array.isArray(p) && p.length >= 2 && laSo_(Number(p[0])) && laSo_(Number(p[1])); };
  for (var i = 0; i < v.hinh.length; i++) {
    var h = v.hinh[i], e = ev + ', hinh[' + i + ']';
    if (h && h.kieu === 'lap' && laDT_(h.hinh)) h = h.hinh;
    if (!laDT_(h) || KIEU_NET_.indexOf(h.kieu) < 0) return 'HINH_' + e + ': "kieu" phải thuộc: ' + KIEU_NET_.join(', ') + '.';
    if ((h.kieu === 'da_giac' && !(Array.isArray(h.diem) && h.diem.length >= 3 && h.diem.every(laDiem))) ||
        ((h.kieu === 'duong' || h.kieu === 'mui_ten') && !(Array.isArray(h.diem) && h.diem.length >= 2 && h.diem.every(laDiem)))) return 'HINH_' + e + ': ' + h.kieu + ' cần "diem" là mảng các [x, y] (đa giác ≥ 3 điểm, đường ≥ 2 điểm).';
    if ((h.kieu === 'tron' || h.kieu === 'cung' || h.kieu === 'da_giac_deu') && (!laDiem(h.tam) || !(Number(h.r) > 0))) return 'HINH_' + e + ': ' + h.kieu + ' cần "tam":[x,y] và "r" > 0.';
    if ((h.kieu === 'koch' || h.kieu === 'sierpinski') && !(laDiem(h.tam) && Number(h.r) > 0) && !(Array.isArray(h.diem) && h.diem.length >= 3)) return 'HINH_' + e + ': ' + h.kieu + ' cần "tam" + "r" (hình đều) hoặc "diem" (đa giác gốc).';
    if ((h.kieu === 'koch' || h.kieu === 'sierpinski') && h.lap !== undefined && !(Number(h.lap) >= 0 && Number(h.lap) <= 6)) return 'HINH_' + e + ': "lap" của ' + h.kieu + ' từ 0 đến 6.';
    if (h.kieu === 'svg' && !(typeof h.d === 'string' && /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s\-eE+]+$/.test(h.d))) return 'HINH_' + e + ': svg cần "d" chỉ gồm lệnh đường dẫn SVG (M, L, C, Q, A, Z và số).';
    if (h.kieu === 'chu' && !laChuoi_(h.noi_dung)) return 'HINH_' + e + ': chu cần "noi_dung".';
    if (h.kieu === 'vat' && TEN_VAT_THUC_.indexOf(String(h.ten)) < 0) return 'HINH_' + e + ': nét vat cần "ten" thuộc: ' + TEN_VAT_THUC_.join(', ') + '.';
    if (h.kieu === 'xep_chong' && !(Array.isArray(h.hang) && h.hang.length >= 1) && !(Number(h.tren) >= 1 && Number(h.duoi) >= Number(h.tren))) return 'HINH_' + e + ': xep_chong cần "hang":[số vật mỗi tầng từ trên xuống] hoặc "tren" + "duoi" (số vật tầng trên cùng / dưới cùng).';
    if (h.kieu === 'tham_so' && (!phanTichBieuThuc_(String(h.x || '').replace(/(^|[^a-z])t(?![a-z])/g, '$1x')) || !phanTichBieuThuc_(String(h.y || '').replace(/(^|[^a-z])t(?![a-z])/g, '$1x')))) return 'HINH_' + e + ': tham_so cần "x" và "y" là biểu thức theo t viết kiểu máy tính.';
  }
  return '';
}


/* ===================== TỰ SỬA SÂU (không cần gọi lại Gemini) ===================== */

var MO_MAY_MOC_PHAN_ = /^\s*(bước\s+(tiếp theo|kế tiếp|đầu tiên)\s*[,:.]?|tiếp theo\s*[,:]|sau đây\s*[,:]?|bây giờ\s+(chúng\s+)?(ta|mình)\s+sẽ\s+|cảnh\s+(này|tiếp theo)\s*[,:]?|ở bước này\s*[,:]?|tiếp tục\s*[,:])\s*/i;
var CHAO_HOOK_PHAN_ = /^\s*(xin chào|chào các bạn|chào mọi người|các bạn ơi|mọi người ơi|các bạn|mọi người|hôm nay\s+(chúng ta|mình)?\s*(sẽ)?)\s*[,!.:]?\s*/i;

// Tên vật / hành động AI hay tự đặt -> đổi về loại có sẵn (hình học đơn giản thành hinh_tu_do) thay vì bỏ.
var BI_DANH_HINH_ = {
  tam_giac: { kieu: 'da_giac_deu', so_canh: 3 }, tam_giac_deu: { kieu: 'da_giac_deu', so_canh: 3 }, hinh_vuong: { kieu: 'da_giac_deu', so_canh: 4, xoay: 45 },
  ngu_giac: { kieu: 'da_giac_deu', so_canh: 5 }, luc_giac: { kieu: 'da_giac_deu', so_canh: 6 }, da_giac_deu: { kieu: 'da_giac_deu', so_canh: 6 },
  hinh_tron: { kieu: 'tron' }, duong_tron: { kieu: 'tron' }, tron: { kieu: 'tron' }, bong_tuyet: { kieu: 'koch', lap: 3 }, koch: { kieu: 'koch', lap: 3 },
  bong_tuyet_koch: { kieu: 'koch', lap: 3 }, sierpinski: { kieu: 'sierpinski', lap: 3 }, tam_giac_sierpinski: { kieu: 'sierpinski', lap: 3 }
};
var BI_DANH_VAT_ = { hinh_hop: 'khoi_hop', hop: 'khoi_hop', be: 'khoi_hop', be_nuoc: 'khoi_hop', lon: 'tru', hinh_tru: 'tru', coc: 'tru', hinh_non: 'non', qua_cau: 'cau', hinh_cau: 'cau',
  ngoi_nha: 'toa_nha', nha: 'toa_nha', o_to: 'xe', cai_cay: 'cay', bieu_do: 'bieu_do_cot', do_thi_ham: 'do_thi', hinh_ve: 'hinh_tu_do', hinh: 'hinh_tu_do', van_ban: 'chu', so: 'so_dem' };
var BI_DANH_HANH_DONG_ = { lat: 'bien_hinh', dich: 'bien_hinh', cat_ghep: 'bien_hinh', doi_xung: 'bien_hinh', tach_ra: 'tach', no_ra: 'tach', ghep_lai: 'ghep', dem: 'dem_tang', dem_tung_tang: 'dem_tang', xoay: 'quay', lac: 'quay', hien: 'sang', nhay: 'sang', nhap_nhay: 'sang', noi_bat: 'chon', to_mau: 'chon', gach: 'loai_bo', xoa: 'loai_bo',
  zoom: 'phong_to', phong: 'phong_to', thu: 'thu_nho', doi_gia_tri: 'dat_gia_tri', tang: 'dat_gia_tri', giam: 'dat_gia_tri', dich_chuyen: 'di_chuyen', chay: 'di_chuyen', mo_ra: 'mo', camera: 'goc_3d' };
function doiTenVat_(v) {
  if (LOAI_VAT_.indexOf(v.loai) >= 0) return v;
  var ten = String(v.loai || '').toLowerCase().trim().replace(/\s+/g, '_');
  if (BI_DANH_VAT_[ten]) { v.loai = BI_DANH_VAT_[ten]; return v; }
  var h = BI_DANH_HINH_[ten];
  if (h) {
    var net = { kieu: h.kieu, tam: [50, 50], r: 38, mau: v.mau || 'xanh_duong', to: v.mau || 'xanh_duong' };
    if (h.so_canh) net.so_canh = h.so_canh;
    if (h.xoay) net.xoay = h.xoay;
    if (h.lap !== undefined) net.lap = v.lap !== undefined ? v.lap : h.lap;
    if (v.nhan) net.nhan = v.nhan;
    return { id: v.id, loai: 'hinh_tu_do', x: v.x, y: v.y, co: v.co, buoc: v.buoc, gia_tri: v.gia_tri, khung: [100, 100], hinh: [net] };
  }
  return v;
}

function hoaDau_(t) { t = String(t || '').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
function cauDau_(t) { var m = /^[^.!?]*[.!?]?/.exec(String(t || '').trim()); return m ? m[0].trim() : String(t || ''); }
function catTu_(t, n) { var w = String(t || '').replace(/\s+/g, ' ').trim().split(' '); return w.slice(0, n).join(' ').replace(/[,;:]+$/, ''); }
// Rút gọn còn tối đa n từ nhưng cắt ở ranh giới ý (dấu phẩy, chấm phẩy, hai chấm, gạch) để không đứt giữa cụm từ.
function rutGon_(t, n) {
  var w = String(t || '').replace(/\s+/g, ' ').trim().split(' ');
  if (w.length <= n) return w.join(' ');
  var dau = w.slice(0, n);
  for (var k = dau.length - 1; k >= 2; k--) if (/[,;:–—-]$/.test(dau[k])) return dau.slice(0, k + 1).join(' ').replace(/[,;:–—-]+$/, '');
  return dau.join(' ').replace(/[,;:]+$/, '') + '…';
}

// Đọc ký hiệu toán trong LỜI THOẠI thành chữ (giọng đọc không đọc được LaTeX): \frac{1}{3} -> "1 phần 3", x^2 -> "x bình phương".
function docLatexThanhLoi_(s) {
  s = String(s || '');
  if (!/[\\$^_]/.test(s)) return s;
  var cu;
  s = s.replace(/\$/g, '');
  do {
    cu = s;
    s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1 phần $2').replace(/\\sqrt\s*\{([^{}]*)\}/g, 'căn $1').replace(/\\text\s*\{([^{}]*)\}/g, '$1');
  } while (s !== cu);
  s = s.replace(/\\(cdot|times)/g, ' nhân ').replace(/\\(leq|le)\b/g, ' nhỏ hơn hoặc bằng ').replace(/\\(geq|ge)\b/g, ' lớn hơn hoặc bằng ')
    .replace(/\\neq/g, ' khác ').replace(/\\approx/g, ' xấp xỉ ').replace(/\\pi/g, ' pi ').replace(/\\(Rightarrow|implies)/g, ' suy ra ')
    .replace(/\^\s*\{?2\}?/g, ' bình phương').replace(/\^\s*\{?3\}?/g, ' lập phương').replace(/\^\s*\{([^{}]*)\}/g, ' mũ $1').replace(/\^\s*(\w)/g, ' mũ $1')
    .replace(/_\s*\{([^{}]*)\}/g, ' $1').replace(/_\s*(\w)/g, ' $1').replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}\\]/g, ' ');
  return s.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
}

// Tiêu đề cảnh lấy từ ý đầu của lời thoại (khi AI quên viết).
function tieuDeTuLoi_(t) {
  var y = String(t || '').split(/[.!?,:;]/)[0];
  var td = catTu_(y, 7).replace(/^(và|nhưng|vậy|thì|rồi)\s+/i, '');
  return hoaDau_(td.length >= 6 ? td : catTu_(t, 6));
}

// Sửa sâu các lỗi vặt. ctx: {y_tuong: ý tưởng then chốt từ lời giải}. Trả về danh sách việc đã sửa (ghi nhật ký).
function tuSuaSau_(kb, ctx) {
  ctx = ctx || {};
  var sua = [];
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return sua;
  // 1) lời thoại: đọc ký hiệu toán thành chữ, bỏ câu mở máy móc
  kb.canh.forEach(function (c, i) {
    if (c.loi_thoai && /[\\$]/.test(c.loi_thoai)) { c.loi_thoai = docLatexThanhLoi_(c.loi_thoai); sua.push('đọc LaTeX thành lời ở cảnh ' + (i + 1)); }
    if (i > 0 && c.loi_thoai) {
      var g = String(c.loi_thoai).replace(MO_MAY_MOC_PHAN_, '');
      if (g !== c.loi_thoai && g.length >= 15) { c.loi_thoai = hoaDau_(g); sua.push('bỏ câu mở máy móc ở cảnh ' + (i + 1)); }
    }
    if (!Array.isArray(c.noi_dung_man_hinh)) c.noi_dung_man_hinh = c.noi_dung_man_hinh ? [String(c.noi_dung_man_hinh)] : [];
    if (c.chu_thich !== undefined && !Array.isArray(c.chu_thich)) c.chu_thich = c.chu_thich ? [String(c.chu_thich).slice(0, 60)] : [];
  });
  // 2) sân khấu: bỏ vật/hành động hỏng thay vì từ chối cả kịch bản
  var idTruoc = {};
  kb.canh.forEach(function (c, i) {
    var mh = c.minh_hoa;
    if (!laDT_(mh)) { c.minh_hoa = { loai: 'khong' }; idTruoc = {}; return; }
    if (mh.loai === 'san_khau') {
      if (!laDT_(mh.du_lieu)) mh.du_lieu = { vat: [], hanh_dong: [] };
      var du = mh.du_lieu;
      if (!Array.isArray(du.vat)) du.vat = [];
      var idCu = c.giu_san_khau && i > 0 ? idTruoc : {};
      var ids = {};
      du.vat = du.vat.map(function (v) { return laDT_(v) ? doiTenVat_(v) : v; });
      if (Array.isArray(du.hanh_dong)) du.hanh_dong.forEach(function (h) { if (laDT_(h) && BI_DANH_HANH_DONG_[h.kieu]) h.kieu = BI_DANH_HANH_DONG_[h.kieu]; });
      du.vat = du.vat.filter(function (v, k) {
        if (!laDT_(v) || LOAI_VAT_.indexOf(v.loai) < 0) { if (laDT_(v)) sua.push('bỏ vật không biết vẽ "' + v.loai + '" ở cảnh ' + (i + 1)); return false; }
        if (!laChuoi_(v.id) || ids[v.id]) v.id = (laChuoi_(v.id) ? v.id : 'v') + '_' + (i + 1) + '_' + k;
        if (v.loai === 'canh_that') suaCanhThat_(v, sua, i + 1);
        if (v.loai !== 'mui_ten') {
          v.x = laSo_(Number(v.x)) ? Math.min(98, Math.max(2, Number(v.x))) : 50;
          v.y = laSo_(Number(v.y)) ? Math.min(98, Math.max(2, Number(v.y))) : 50;
          var loi = kiemTraSanKhau_({ vat: [v], hanh_dong: [] }, 'CANH_' + (i + 1), { _: true });
          if (loi) { sua.push('bỏ vật hỏng ở cảnh ' + (i + 1) + ': ' + loi.slice(0, 80)); return false; }
        }
        ids[v.id] = true;
        return true;
      });
      du.vat = du.vat.filter(function (v) { return v.loai !== 'mui_ten' || ((!v.tu || ids[v.tu] || idCu[v.tu]) && (!v.den || ids[v.den] || idCu[v.den])); });
      du.hanh_dong = (Array.isArray(du.hanh_dong) ? du.hanh_dong : []).filter(function (h) {
        return laDT_(h) && KIEU_HANH_DONG_.indexOf(h.kieu) >= 0 && (h.kieu === 'thu_nho' || h.kieu === 'phong_to' || h.kieu === 'goc_3d' || ids[h.vat] || idCu[h.vat]);
      });
      // hết vật hợp lệ: có BẢN VẼ CẢNH THỰC TẾ của đề thì dùng bản vẽ đó (đúng vật, đúng số đo) thay vì để cảnh chỉ còn chữ
      if (!du.vat.length && !Object.keys(idCu).length && laDT_(kb.ban_ve) && Array.isArray(kb.ban_ve.vat) && kb.ban_ve.vat.length) {
        var bv = JSON.parse(JSON.stringify(kb.ban_ve));
        du.vat = [{ id: 'bv_' + (i + 1), loai: 'canh_that', x: 50, y: 50, buoc: 1, vat: bv.vat, diem: bv.diem || [], vung: bv.vung || [], do: bv.do || [], nhin: bv.nhin || 'ngang' }];
        ids[du.vat[0].id] = true;
        sua.push('cảnh ' + (i + 1) + ' không còn vật hợp lệ -> dùng bản vẽ cảnh thực tế của đề');
      }
      if (!du.vat.length && !Object.keys(idCu).length) { c.minh_hoa = { loai: 'khong', mo_ta: String(mh.mo_ta || '') }; idTruoc = {}; sua.push('cảnh ' + (i + 1) + ' không còn vật hợp lệ, bỏ sân khấu'); return; }
      if (!du.hanh_dong.length && du.vat.length) du.hanh_dong.push({ buoc: 2, vat: du.vat[0].id, kieu: 'sang' });
      if (String(mh.mo_ta || '').trim().length < 40) {
        mh.mo_ta = (String(mh.mo_ta || '').trim() + ' Sân khấu gồm ' + du.vat.map(function (v) { return v.loai + (v.nhan || v.noi_dung ? ' "' + (v.nhan || v.noi_dung) + '"' : ''); }).join(', ') + ', xuất hiện lần lượt theo lời thoại.').trim();
      }
      var moi = {};
      if (c.giu_san_khau) Object.keys(idCu).forEach(function (k) { moi[k] = true; });
      du.vat.forEach(function (v) { moi[v.id] = true; });
      idTruoc = moi;
    } else {
      idTruoc = {};
      if (mh.loai && mh.loai !== 'khong') {
        var l2 = kiemTraMinhHoa_(mh, i + 1, null);
        if (l2) { c.minh_hoa = { loai: 'khong', mo_ta: String(mh.mo_ta || '') }; sua.push('hình mẫu hỏng ở cảnh ' + (i + 1) + ', bỏ: ' + l2.slice(0, 80)); }
        else if (String(mh.mo_ta || '').trim().length < 40) mh.mo_ta = (String(mh.mo_ta || '').trim() + ' Hình ' + mh.loai + ' minh họa đúng các số liệu đang nói tới.').trim();
      }
    }
  });
  // 3) tiêu đề cảnh, trình bày công thức
  kb.canh.forEach(function (c, i) {
    if (i > 0) {
      var td = String(c.tieu_de_canh || '').replace(/\s+/g, ' ').trim();
      if (td.length < 6) { td = tieuDeTuLoi_(c.loi_thoai); sua.push('tự đặt tiêu đề cảnh ' + (i + 1)); }
      if (demTu_(td) > 10) td = rutGon_(td, 9);
      c.tieu_de_canh = td;
      if (c.tu_khoa && td.toLowerCase().indexOf(String(c.tu_khoa).toLowerCase()) < 0) c.tu_khoa = '';
    }
    var tb = c.trinh_bay;
    if (tb !== undefined && tb !== null && tb !== '' && ['bien_doi', 'cong_don', 'xep'].indexOf(tb) < 0) c.trinh_bay = 'xep';
    if ((c.trinh_bay === 'bien_doi' || c.trinh_bay === 'cong_don') && kiemTraTrinhBay_({ canh: [c] })) c.trinh_bay = 'xep';
    if (c.noi_dung_man_hinh.length > 6) c.noi_dung_man_hinh = c.noi_dung_man_hinh.slice(-6);
  });
  // 4) hook
  var c1 = kb.canh[0];
  if (HOOK_KIEU_.indexOf(kb.hook_kieu) < 0) kb.hook_kieu = 'cau_hoi';
  var choChao = typeof cauHinh_ === 'function' && cauHinh_('KIEU_MO_DAU') === 'chao_hook';
  if (!choChao && c1.loi_thoai) {
    var bo = String(c1.loi_thoai).replace(CHAO_HOOK_PHAN_, '');
    if (bo !== c1.loi_thoai && bo.length >= 10) { c1.loi_thoai = hoaDau_(bo); sua.push('bỏ lời chào ở hook'); }
  }
  if (demTu_(c1.loi_thoai) > 18) {
    var hai = String(c1.loi_thoai).match(/[^.!?]+[.!?]?/g) || [];
    var gon = '';
    for (var k = 0; k < hai.length; k++) { var thu = (gon + ' ' + hai[k]).trim(); if (demTu_(thu) > 16) break; gon = thu; }
    if (demTu_(gon) >= 5) { c1.loi_thoai = gon; sua.push('rút gọn hook còn ' + demTu_(gon) + ' từ'); }
  }
  if (!laChuoi_(kb.hook)) kb.hook = c1.loi_thoai;
  var hc = String(kb.hook_chu || '').replace(CHAO_HOOK_PHAN_, '').trim();
  if (demTu_(hc) < 3 || demTu_(hc) > 12) {
    // chọn câu ngắn gọn nhất đủ 3-12 từ trong các câu móc có sẵn; không có thì rút gọn ở ranh giới ý
    var ung = [hc, cauDau_(kb.hook), cauDau_(c1.loi_thoai)].concat(Array.isArray(kb.hook_ung_vien) ? kb.hook_ung_vien.map(cauDau_) : [])
      .map(function (x) { return String(x || '').replace(CHAO_HOOK_PHAN_, '').trim(); }).filter(function (x) { return demTu_(x) >= 3 && demTu_(x) <= 12; });
    hc = ung.length ? ung[0] : rutGon_(cauDau_(kb.hook || c1.loi_thoai), 12);
    sua.push('tự đặt hook_chu');
  }
  hc = hc.replace(/\d+\s*%/g, 'rất nhiều');
  kb.hook_chu = hoaDau_(hc);
  var nm = (Array.isArray(kb.nhan_manh) ? kb.nhan_manh : []).filter(function (x) { return laChuoi_(x) && kb.hook_chu.toLowerCase().indexOf(String(x).toLowerCase()) >= 0; }).slice(0, 3);
  if (!nm.length) {
    var tuDai = kb.hook_chu.replace(/[^\wÀ-ỹ\s]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 3; }).sort(function (a, b) { return b.length - a.length; })[0];
    if (tuDai) nm = [tuDai];
  }
  kb.nhan_manh = nm;
  var uv = (Array.isArray(kb.hook_ung_vien) ? kb.hook_ung_vien : []).filter(laChuoi_);
  while (uv.length < 3) uv.push([kb.hook_chu, kb.hook, c1.loi_thoai][uv.length] || kb.hook_chu);
  kb.hook_ung_vien = uv.slice(0, 3);
  // 5) ý tưởng chính
  if (String(kb.y_tuong_chinh || '').trim().length < 30) {
    var nguon = String(ctx.y_tuong || '').trim();
    if (nguon.length < 30) {
      var cMau = kb.canh.filter(function (c) { return /diem_chot|y_do|thu_nho/i.test(String(c.loai || '')); })[0];
      nguon = cMau ? String(cMau.loi_thoai || '') : nguon;
    }
    if (nguon.length >= 30) { kb.y_tuong_chinh = nguon.slice(0, 240); sua.push('tự điền y_tuong_chinh'); }
  }
  // 6) đủ các loại cảnh cần thiết
  if (!kb.canh.some(function (c) { return /tinh|giai/i.test(String(c.loai || '')); })) {
    for (var t = 1; t < kb.canh.length - 1; t++) {
      if (kb.canh[t].noi_dung_man_hinh.length && !/dap_an|ket_qua|bai_hoc/i.test(String(kb.canh[t].loai || ''))) { kb.canh[t].loai = 'tinh_toan'; sua.push('đổi cảnh ' + (t + 1) + ' thành tinh_toan'); break; }
    }
  }
  if (!kb.canh.some(function (c) { return /y_do|diem_chot|mo_hinh/i.test(String(c.loai || '')); })) {
    for (var u = 1; u < kb.canh.length - 1; u++) {
      if (/thu_nho|phan_tich|huong|y_tuong/i.test(String(kb.canh[u].loai || ''))) { kb.canh[u].loai = 'diem_chot'; sua.push('đổi cảnh ' + (u + 1) + ' thành diem_chot'); break; }
    }
  }
  // 7) bài học rút ra + cảnh bài học cuối
  var bhr = (Array.isArray(kb.bai_hoc_rut_ra) ? kb.bai_hoc_rut_ra : []).map(function (x) { return String(x).trim(); }).filter(function (x) { return x.length >= 8; });
  if (bhr.length < 2) {
    var cuoi = kb.canh[kb.canh.length - 1];
    var dsCuoi = [];
    var duC = cuoi.minh_hoa && cuoi.minh_hoa.du_lieu;
    if (duC && Array.isArray(duC.vat)) duC.vat.forEach(function (v) { if (v.loai === 'danh_sach' && Array.isArray(v.ds)) dsCuoi = dsCuoi.concat(v.ds); });
    if (dsCuoi.length < 2) dsCuoi = (String(cuoi.loi_thoai || '').match(/[^.!?]+[.!?]/g) || []).filter(function (x) { return !/\?\s*$/.test(x); });
    bhr = dsCuoi.map(function (x) { return catTu_(String(x).replace(/^[-•\d.\s]+/, ''), 12); }).filter(function (x) { return x.length >= 8; }).slice(0, 3);
    if (bhr.length >= 2) { kb.bai_hoc_rut_ra = bhr; sua.push('tự điền bai_hoc_rut_ra'); }
  }
  var cCuoi = kb.canh[kb.canh.length - 1];
  if (!/bai_hoc|ket_luan|chot/i.test(String(cCuoi.loai || ''))) {
    if (!/dap_an|ket_qua/i.test(String(cCuoi.loai || ''))) { cCuoi.loai = 'bai_hoc'; sua.push('đổi cảnh cuối thành bai_hoc'); }
    else if (kb.canh.length < 12 && bhr.length >= 2) {
      kb.canh.push({
        so: kb.canh.length + 1, loai: 'bai_hoc', tieu_de_canh: 'Ghi nhớ từ bài này', tu_khoa: 'Ghi nhớ', giong_doc: 'thân thiện, đọng lại',
        loi_thoai: 'Vậy rút ra được gì? ' + bhr.map(function (x) { return x.replace(/[.!]+$/, ''); }).join('. ') + '. Bình luận cho mình biết bạn nghĩ gì nhé!',
        noi_dung_man_hinh: [],
        minh_hoa: { loai: 'san_khau', mo_ta: 'Thẻ ghi nhớ liệt kê các điều rút ra, từng dòng sáng lên theo lời thoại.', du_lieu: { vat: [{ id: 'ghi_nho', loai: 'danh_sach', x: 50, y: 50, noi_dung: 'Ghi nhớ', ds: bhr, buoc: 1 }], hanh_dong: [{ buoc: 2, vat: 'ghi_nho', kieu: 'chon', chi_so: [1, 2, 3] }] } }
      });
      sua.push('thêm cảnh bài học cuối');
    }
  }
  suaLienHeThucTe_(kb).forEach(function (x) { sua.push(x); });
  return sua;
}


/* ===================== MÁY TÍNH LẠI MỌI PHÉP TÍNH TRÊN MÀN HÌNH (lần 25) ===================== */
// Mỗi dòng công thức "A = B = C" (hoặc ≈): vế nào chỉ gồm số và phép toán thì máy tự tính; hai vế số liền nhau lệch nhau
// (quá sai số làm tròn) là LỖI NẶNG, Gemini phải sửa. Ví dụ bắt được: S_{20} = \frac{20(3+22)}{2} = 260 (thực ra 250).
function texThanhSo_(s) {
  var t = String(s || '');
  t = t.replace(/\\(text|mathrm|mbox|textbf)\s*\{[^{}]*\}(\s*\^\s*(\{[^{}]*\}|\d))?/g, ' ');
  t = t.replace(/\\left|\\right|\\displaystyle|\\,|\;|\\:|\\!|\\quad|\\qquad|~|\\ /g, ' ');
  t = t.replace(/\{,\}/g, '.').replace(/\\%/g, '%');
  // lượng giác theo ĐỘ: \tan(50^\circ), \sin 30°, \cos(60°) -> lg_tan(50)... (tính thật để bắt phép tính sai ở bài góc nâng)
  t = t.replace(/\\(sin|cos|tan|cot)\s*\(?\s*(\d+(?:[.,]\d+)?|\d+\{,\}\d+)\s*(?:\^\s*\{?\s*\\circ\s*\}?|°)\s*\)?/g, function (m, f, x) { return ' lg' + f + '(' + String(x).replace('{,}', '.').replace(',', '.') + ') '; });
  // bỏ đơn vị ở cuối (m, cm², đồng, triệu đồng, ống, tầng...)
  t = t.replace(/(\s*(m|cm|mm|km|dm|kg|g|l|ml|lít|đ|đồng|vnđ|triệu|tỷ|nghìn|ngàn|giờ|phút|giây|năm|tháng|ngày|ống|tầng|cái|người|học sinh|viên|lần|°|\\circ|\^\{?\\circ\}?)(\s*\^\s*\{?\d\}?)?)+\s*$/i, '');
  t = t.replace(/\\[dt]?frac/g, '\\frac');
  // \frac{a}{b} -> ((a)/(b)), \sqrt{a} -> sqrt(a), \sqrt[n]{a} -> pow(a,1/n)
  var layNhom = function (x, i) {   // x[i] === '{'
    var sau = 0;
    for (var k = i; k < x.length; k++) { if (x[k] === '{') sau++; else if (x[k] === '}') { sau--; if (!sau) return { noi: x.slice(i + 1, k), het: k + 1 }; } }
    return null;
  };
  for (var lan = 0; lan < 30; lan++) {
    var i = t.indexOf('\\frac');
    if (i >= 0) {
      var j = i + 5; while (t[j] === ' ') j++;
      var a = t[j] === '{' ? layNhom(t, j) : null; if (!a) return null;
      var k = a.het; while (t[k] === ' ') k++;
      var b = t[k] === '{' ? layNhom(t, k) : null; if (!b) return null;
      t = t.slice(0, i) + '((' + a.noi + ')/(' + b.noi + '))' + t.slice(b.het);
      continue;
    }
    i = t.indexOf('\\sqrt');
    if (i >= 0) {
      var p = i + 5, bac = '2';
      if (t[p] === '[') { var q = t.indexOf(']', p); if (q < 0) return null; bac = t.slice(p + 1, q); p = q + 1; }
      var c = t[p] === '{' ? layNhom(t, p) : null; if (!c) return null;
      t = t.slice(0, i) + 'pow((' + c.noi + '),1/(' + bac + '))' + t.slice(c.het);
      continue;
    }
    break;
  }
  t = t.replace(/\\cdot|\\times|·|×/g, '*').replace(/\\div|:/g, '/').replace(/−/g, '-').replace(/\\pi/g, '(3.141592653589793)');
  t = t.replace(/[{}]/g, function (m) { return m === '{' ? '(' : ')'; });
  t = t.replace(/(\d),(\d)/g, '$1.$2');                 // 2,5 -> 2.5
  t = t.replace(/(\d)\s+(?=\d{3}(\D|$))/g, '$1');      // 138 548 -> 138548
  t = t.replace(/%/g, '/100');
  t = t.replace(/\^/g, '**');
  t = t.replace(/(\d|\))\s*\(/g, '$1*(').replace(/\)\s*(\d)/g, ')*$1');
  t = t.replace(/pow\*\(/g, 'pow(').replace(/(\d|\))\s*pow/g, '$1*pow');
  t = t.replace(/(lgsin|lgcos|lgtan|lgcot)\*\(/g, '$1(').replace(/(\d|\))\s*(lg(?:sin|cos|tan|cot))/g, '$1*$2');
  var bo = t.replace(/pow|lgsin|lgcos|lgtan|lgcot/g, '');
  if (/[A-Za-zÀ-ỹ\\]/.test(bo)) return null;   // còn chữ/biến -> không phải phép tính thuần số
  if (!/\d/.test(t) || !/^[\d\s.+\-*/()e,]*$/.test(bo)) return null;
  try {
    var R = Math.PI / 180;
    var v = Function('pow', 'lgsin', 'lgcos', 'lgtan', 'lgcot', '"use strict"; return (' + t + ');')(Math.pow,
      function (x) { return Math.sin(x * R); }, function (x) { return Math.cos(x * R); }, function (x) { return Math.tan(x * R); }, function (x) { return 1 / Math.tan(x * R); });
    return typeof v === 'number' && isFinite(v) ? v : null;
  } catch (e) { return null; }
}
function soLe10_(s) { var m = /(\d)[.,]|\{,\}/.test(String(s)) ? /[.,]\s*(\d+)|\{,\}\s*(\d+)/.exec(String(s)) : null; return m ? (m[1] || m[2] || '').length : 0; }
function kiemTraPhepTinh_(kb) {
  var loi = [];
  (kb.canh || []).forEach(function (c, j) {
    (c && c.noi_dung_man_hinh || []).forEach(function (dong) {
      var s = String(dong || '');
      if (!/=|\\approx|≈/.test(s) || /\\neq|\\leq|\\geq|<|>/.test(s)) return;
      var phan = s.split(/(\\approx|≈|=)/);
      var ve = [], dau = [];
      for (var k = 0; k < phan.length; k += 2) { ve.push(phan[k]); if (k + 1 < phan.length) dau.push(phan[k + 1]); }
      for (var m = 0; m < ve.length - 1; m++) {
        var a = texThanhSo_(ve[m]), b = texThanhSo_(ve[m + 1]);
        if (a === null || b === null) continue;
        var xapXi = dau[m] !== '=';
        var tol = Math.max(0.5 * Math.pow(10, -soLe10_(ve[m + 1])) * 1.001, Math.abs(b) * (xapXi ? 0.006 : 1e-9), 1e-9);
        if (Math.abs(a - b) > tol) {
          loi.push('PHEP_TINH_SAI_CANH_' + (j + 1) + ': dòng "' + s.slice(0, 90) + '" sai: ' + ve[m].trim().slice(0, 40) + ' tính ra ' + (Math.round(a * 10000) / 10000) + ', không phải ' + (Math.round(b * 10000) / 10000) +
            '. Sửa cho đúng; nếu đề không có đáp số tròn thì nói thật điều đó, không được ép phép tính sai.');
          break;
        }
      }
    });
  });
  return loi;
}
// nhãn/chữ trên hình quá dài (chữ sẽ nhỏ, khó đọc): nên tối đa ~22 ký tự
function kiemTraNhanDai_(kb) {
  var loi = [];
  (kb.canh || []).forEach(function (c, j) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat)) return;
    du.vat.forEach(function (v) {
      if (!v) return;
      var ds = [];
      if (v.loai === 'nhan' || v.loai === 'chu') ds.push(String(v.noi_dung || ''));
      if (v.loai === 'hinh_tu_do' && Array.isArray(v.hinh)) v.hinh.forEach(function (h) { if (h) { if (h.kieu === 'chu') ds.push(String(h.noi_dung || '')); if (h.nhan) ds.push(String(h.nhan)); } });
      ds.forEach(function (x) {
        var dai = x.replace(/\\[a-zA-Z]+|[{}_^$]/g, '').length;
        if (dai > 24) loi.push('NHAN_QUA_DAI_CANH_' + (j + 1) + ': "' + x.slice(0, 40) + '" (' + dai + ' ký tự): nhãn/chữ trên hình tối đa ~22 ký tự (vd "u_1 = 3", "Tầng 1"); ý dài đưa vào lời thoại hoặc noi_dung_man_hinh.');
      });
    });
  });
  return loi;
}


// Công thức sai cú pháp (thiếu ngoặc, $...$, gạch chéo nhân đôi) -> trên video sẽ lộ mã thô: bắt sửa trước khi dựng.
function kiemTraCuPhapTex_(kb) {
  var loi = [];
  var xet = function (s, noi) {
    s = String(s || '');
    if (!/[\\{}^_$]/.test(s)) return;
    var mo = 0, sai = false;
    s.replace(/\\[{}]/g, '').split('').forEach(function (ch) { if (ch === '{') mo++; else if (ch === '}') { mo--; if (mo < 0) sai = true; } });
    if (mo !== 0 || sai) loi.push('TEX_THIEU_NGOAC ' + noi + ': "' + s.slice(0, 50) + '" mở/đóng ngoặc { } không khớp -> sửa lại cho đúng LaTeX.');
    else if (/\$/.test(s)) loi.push('TEX_CO_DAU_DO_LA ' + noi + ': "' + s.slice(0, 50) + '" không dùng dấu $ bao công thức, viết thẳng LaTeX.');
    else if (/\\\\[a-zA-Z]/.test(s)) loi.push('TEX_GACH_CHEO_KEP ' + noi + ': "' + s.slice(0, 50) + '" bị thừa dấu gạch chéo (\\\\frac) -> chỉ một dấu \\ trước lệnh.');
  };
  (kb.canh || []).forEach(function (c, j) {
    var noi = 'CANH_' + (j + 1);
    (c.noi_dung_man_hinh || []).forEach(function (x) { xet(x, noi); });
    (c.chu_thich || []).forEach(function (x) { xet(x, noi); });
    var du = c.minh_hoa && c.minh_hoa.du_lieu;
    if (du && Array.isArray(du.vat)) du.vat.forEach(function (v) {
      if (!v) return;
      xet(v.noi_dung, noi); xet(v.nhan, noi);
      (Array.isArray(v.ds) ? v.ds : []).forEach(function (x) { xet(x, noi); });
      (Array.isArray(v.hinh) ? v.hinh : []).forEach(function (h) { if (h) { xet(h.noi_dung, noi); xet(h.nhan, noi); } });
    });
  });
  (kb.de_cho || []).forEach(function (x) { xet(x, 'DE_CHO'); });
  xet(kb.can_tim, 'CAN_TIM');
  return loi.slice(0, 8);
}


// QUY TRÌNH CỐ ĐỊNH 6 PHẦN: ĐỀ BÀI -> MÔ PHỎNG -> LỖI SAI -> GIẢI -> THỬ LẠI -> CHỐT. Kiểm tra đủ phần, đúng thứ tự,
// và phần đề bài nêu ĐỦ dữ kiện (de_cho + can_tim chứa mọi con số của đề).
var PHA_6_ = [[/mo_dau|hook|cau_hoi|de_bai/, 0, 'ĐỀ BÀI'], [/mo_hinh|mo_phong|y_do|thu_nho|phan_tich/, 1, 'MÔ PHỎNG'], [/bay|loi_sai/, 2, 'LỖI SAI'],
  [/nhac_lai|kien_thuc|ly_thuyet|cong_thuc|dinh_ly|nguon_goc|y_nghia|diem_chot|y_tuong|tinh|giai|dap_an|ket_qua/, 3, 'GIẢI'], [/kiem_tra|thu_lai/, 4, 'THỬ LẠI'], [/bai_hoc|ket_luan|chot|lien_he/, 5, 'CHỐT']];
function phaCua_(loai) {
  var l = String(loai || '').toLowerCase();
  for (var i = 0; i < PHA_6_.length; i++) if (PHA_6_[i][0].test(l)) return PHA_6_[i][1];
  return -1;
}
// MÁY TỰ SỬA QUY TRÌNH (trước khi chấm, đỡ phải nhờ Gemini viết lại cả kịch bản):
//  - cảnh lệch thứ tự 6 phần -> sắp lại ổn định theo phần (cảnh đang "giữ sân khấu" mà bị tách khỏi cảnh trước thì được chép
//    đủ các vật đang có trên sân khấu để không mất hình);
//  - thiếu de_cho / can_tim -> lấy từ du_kien và câu hỏi của đề.
function tuSuaQuyTrinh_(kb, deGoc) {
  var sua = [];
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return sua;
  var ds = kb.canh.map(function (c, i) { return {c: c, i: i, p: phaCua_(c && c.loai)}; });
  // pha của cảnh không nhận ra (loại lạ) = pha cảnh liền trước
  for (var k = 0; k < ds.length; k++) if (ds[k].p < 0) ds[k].p = k ? ds[k - 1].p : 0;
  var lech = ds.some(function (x, k) { return k && x.p < ds[k - 1].p; });
  if (lech) {
    // sân khấu thực tế của từng cảnh (cộng dồn theo chuỗi giu_san_khau) trước khi đổi chỗ
    var sanKhau = [], truoc = null;
    kb.canh.forEach(function (c, i) {
      var du = c && c.minh_hoa && c.minh_hoa.loai === 'san_khau' && c.minh_hoa.du_lieu;
      var vat = du && Array.isArray(du.vat) ? du.vat : [];
      var gop = {};
      if (c.giu_san_khau && truoc) truoc.forEach(function (v) { if (v && v.id) gop[v.id] = v; });
      vat.forEach(function (v) { if (v && v.id) gop[v.id] = v; });
      sanKhau[i] = Object.keys(gop).map(function (id) { return gop[id]; });
      truoc = du ? sanKhau[i] : null;
    });
    var moi = ds.slice().sort(function (a, b) { return a.p - b.p || a.i - b.i; });
    moi.forEach(function (x, k) {
      var c = x.c;
      var truocCu = x.i - 1, truocMoi = k ? moi[k - 1].i : -1;
      if (c.giu_san_khau && truocCu !== truocMoi) {
        c.giu_san_khau = false;
        if (c.minh_hoa && c.minh_hoa.du_lieu && Array.isArray(c.minh_hoa.du_lieu.vat)) c.minh_hoa.du_lieu.vat = sanKhau[x.i];
      }
    });
    kb.canh = moi.map(function (x) { return x.c; });
    kb.canh.forEach(function (c, k) { c.so = k + 1; if (k === 0) c.giu_san_khau = false; });
    sua.push('sắp lại cảnh theo quy trình 6 phần');
  }
  var cho = Array.isArray(kb.de_cho) ? kb.de_cho.filter(function (x) { return String(x).trim(); }) : [];
  if (cho.length < 2 && Array.isArray(kb.du_kien) && kb.du_kien.length >= 2) { kb.de_cho = kb.du_kien.map(String).slice(0, 5); sua.push('de_cho lấy từ du_kien'); }
  // thẻ ĐỀ CHO thiếu số của đề -> dựng lại từ chính các vế câu có số trong đề (không bao giờ thiếu dữ kiện)
  if (deGoc) {
    var soDe = (String(deGoc).replace(/(câu|bài|lớp|ví dụ)\s*\d+/gi, ' ').match(/\d+(?:[.,]\d+)?/g) || []).map(function (x) { return x.replace(',', '.'); });
    var coChu = (Array.isArray(kb.de_cho) ? kb.de_cho.join(' ') : '').replace(/,/g, '.');
    var mat = soDe.filter(function (x, i) { return soDe.indexOf(x) === i && coChu.indexOf(x) < 0; });
    if (mat.length) {
      var ve = String(deGoc).split(/(?<=[.;!])\s+|,\s+(?=[^\d])/).map(function (x) { return x.replace(/\s+/g, ' ').trim(); })
        .filter(function (x) { return /\d/.test(x) && !/\?\s*$|^\s*(hỏi|tính|tìm)\b/i.test(x); });
      if (ve.length) { kb.de_cho = ve.slice(0, 5).map(function (x) { return x.replace(/[.;]$/, '').slice(0, 70); }); sua.push('de_cho dựng lại từ các dữ kiện của đề'); }
    }
  }
  if (String(kb.can_tim || '').trim().length < 5 && deGoc) {
    var cau = String(deGoc).split(/(?<=[.?!])\s+/).filter(function (x) { return /\?|^\s*(hỏi|tính|tìm|xác định|chứng minh)/i.test(x); });
    if (cau.length) { kb.can_tim = cau[cau.length - 1].replace(/^\s*hỏi\s*/i, '').trim().slice(0, 110); sua.push('can_tim lấy từ câu hỏi của đề'); }
  }
  return sua;
}

function kiemTraQuyTrinh_(kb, deGoc) {
  var nang = [], nhe = [];
  var ds = (kb.canh || []).map(function (c) { return phaCua_(c && c.loai); });
  var coPha = [0, 0, 0, 0, 0, 0];
  ds.forEach(function (p) { if (p >= 0) coPha[p]++; });
  var thieu = [];
  // THỬ LẠI chỉ được bỏ khi kịch bản ghi rõ lý do không thể thử lại (khong_thu_lai)
  var boThuLai = String(kb.khong_thu_lai || '').trim().split(/\s+/).length >= 6;
  for (var p = 0; p < 6; p++) if (!coPha[p] && !(p === 4 && boThuLai)) thieu.push(PHA_6_[p][2]);
  if (thieu.length) nang.push('THIEU_PHAN_QUY_TRINH: thiếu phần ' + thieu.join(', ') + '. Mọi video phải đủ 6 phần theo thứ tự: ĐỀ BÀI (mo_dau, de_bai) -> MÔ PHỎNG (mo_hinh_hoa / y_do / thu_nho) -> LỖI SAI (bay) -> GIẢI (nhac_lai, diem_chot, tinh_toan, dap_an) -> THỬ LẠI (kiem_tra) -> CHỐT (bai_hoc).');
  var iDe = -1;
  (kb.canh || []).forEach(function (c, i) { if (iDe < 0 && String(c && c.loai) === 'de_bai') iDe = i; });
  if (iDe < 0 || iDe > 1) nang.push('DE_BAI_PHAI_DUNG_DAU: cảnh "de_bai" phải là cảnh 1 hoặc 2 (ngay sau câu móc), đọc rõ toàn bộ đề trước khi mô phỏng.');
  var sai = [];
  for (var i = 1; i < ds.length; i++) {
    if (ds[i] < 0) continue;
    var truoc = -1;
    for (var j = i - 1; j >= 0; j--) if (ds[j] >= 0) { truoc = ds[j]; break; }
    if (truoc > ds[i]) sai.push('cảnh ' + (i + 1) + ' (' + kb.canh[i].loai + ', phần ' + PHA_6_[ds[i]][2] + ') đứng sau phần ' + PHA_6_[truoc][2]);
  }
  if (sai.length) nang.push('SAI_THU_TU_QUY_TRINH: ' + sai.slice(0, 3).join('; ') + '. Sắp lại cảnh theo đúng 6 phần.');
  // THỬ LẠI phải THẬT: có phép thử bằng số trên màn hình + lời thoại có số + hình không chỉ là nhãn chữ
  (kb.canh || []).forEach(function (c, i) {
    if (!c || phaCua_(c.loai) !== 4) return;
    var ct = (c.noi_dung_man_hinh || []).map(String);
    var coPhepThu = ct.some(function (d) { return /\d/.test(d) && /=|<|>|\\le|\\ge|\\approx|\\neq|≈|≤|≥/.test(d); });
    var loiCoSo = /\d|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|trăm|nghìn/.test(String(c.loi_thoai || '').toLowerCase());
    var du = c.minh_hoa && c.minh_hoa.du_lieu, vs = du && Array.isArray(du.vat) ? du.vat : [];
    var chiChu = !c.giu_san_khau && vs.length > 0 && vs.every(function (v) { return v && ['nhan', 'chu', 'the', 'mui_ten', 'bieu_tuong'].indexOf(v.loai) >= 0; });
    if (!coPhepThu || !loiCoSo) nang.push('THU_LAI_HINH_THUC_CANH_' + (i + 1) + ': cảnh thử lại chưa thử thật. "noi_dung_man_hinh" phải có phép thử bằng SỐ (thế đáp án vào đề / cách thứ hai / so với giá trị khác, vd "60 + 2 \\cdot 30 = 120 \\checkmark"), lời thoại đọc phép thử đó; bài thật sự không thử lại được thì bỏ cảnh và ghi lý do vào "khong_thu_lai".');
    else if (chiChu) nhe.push('THU_LAI_CHI_CO_CHU_CANH_' + (i + 1) + ': hình cảnh thử lại chỉ có nhãn chữ; nên minh họa phép thử (bản vẽ có số đo, luoi_o / bieu_do_cot đếm kết quả, chon các trường hợp).');
  });
  // phần đề bài: thẻ ĐỀ CHO / CẦN TÌM
  var cho = Array.isArray(kb.de_cho) ? kb.de_cho.map(String).filter(function (x) { return x.trim(); }) : [];
  if (cho.length < 2) nang.push('THIEU_DE_CHO: cần "de_cho" là mảng 2-5 dữ kiện của đề (đủ mọi con số), máy hiện thành thẻ ĐỀ BÀI ở đầu video.');
  if (String(kb.can_tim || '').trim().length < 5) nang.push('THIEU_CAN_TIM: cần "can_tim" nêu rõ đề hỏi gì (≤ 80 ký tự).');
  if (deGoc && cho.length) {
    var soDe = (String(deGoc).replace(/(câu|bài|lớp|ví dụ)\s*\d+/gi, ' ').match(/\d+(?:[.,]\d+)?/g) || [])
      .map(function (x) { return x.replace(',', '.'); }).filter(function (x, k, a) { return a.indexOf(x) === k; });
    var coChu = (cho.join(' ') + ' ' + kb.can_tim + ' ' + (kb.canh || []).filter(function (c) { return /de_bai|mo_dau/.test(String(c.loai)); }).map(function (c) { return (c.noi_dung_man_hinh || []).join(' '); }).join(' ')).replace(/\{,\}/g, '.').replace(/,/g, '.');
    var mat = soDe.filter(function (x) { return !new RegExp('(^|[^\\d.])' + x.replace('.', '\\.') + '(?![\\d])').test(coChu); });
    if (soDe.length && mat.length > Math.max(1, soDe.length * 0.34)) nang.push('DE_BAI_THIEU_DU_KIEN: thẻ đề bài (de_cho/can_tim) còn thiếu các số của đề: ' + mat.slice(0, 6).join(', ') + '. Phần đề bài phải nêu đủ mọi dữ kiện.');
    else if (mat.length) nhe.push('DE_BAI_THIEU_SO: de_cho chưa có số ' + mat.join(', ') + ' của đề (nếu là dữ kiện thì thêm vào).');
  }
  // lời thoại cảnh đề bài phải đủ dài để đọc hết đề
  var loiDe = (kb.canh || []).filter(function (c) { return String(c && c.loai) === 'de_bai'; }).map(function (c) { return String(c.loi_thoai || ''); }).join(' ');
  if (iDe >= 0 && loiDe.split(/\s+/).filter(Boolean).length < 18) nang.push('DE_BAI_QUA_SO_SAI: lời thoại phần đề bài quá ngắn; phải đọc đủ mọi dữ kiện của đề và nói rõ đề hỏi gì.');
  return { nang: nang, nhe: nhe };
}


// Dấu ba chấm của hình đề bị VẼ LẠI nguyên xi (chữ "⋮"/"…" hay mấy chấm tròn nhỏ) thay vì dựng phần bị lược bằng nét có quy luật.
function kiemTraBaCham_(kb) {
  var loi = [];
  var laBaCham = function (x) { return /^[\s$]*(⋮|…|⋯|\.\s*\.\s*\.|\\[vcl]?dots|\\ddots)[\s$]*$/.test(String(x || '')); };
  (kb.canh || []).forEach(function (c, j) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat)) return;
    du.vat.forEach(function (v) {
      if (!v) return;
      var bi = (v.loai === 'nhan' || v.loai === 'chu') && laBaCham(v.noi_dung);
      if (v.loai === 'hinh_tu_do' && Array.isArray(v.hinh)) {
        var cham = 0;
        v.hinh.forEach(function (h) {
          if (!h) return;
          if (h.kieu === 'chu' && laBaCham(h.noi_dung)) bi = true;
          if (h.nhan && laBaCham(h.nhan)) bi = true;
          if (h.kieu === 'tron' && Number(h.r) > 0 && Number(h.r) <= 1.5) cham++;
        });
        if (cham >= 3) bi = true;
      }
      if (bi) loi.push('VE_LAI_BA_CHAM_CANH_' + (j + 1) + ' (vật "' + (v.id || v.loai) + '"): dấu ba chấm trong hình đề nghĩa là "còn nhiều phần bị lược", không được vẽ lại thành chấm/chữ. Đọc xem nó thay cho bao nhiêu tầng/hàng/số hạng rồi dựng bằng nét có quy luật: xep_chong với đủ hang (máy tự làm khoảng rút gọn sinh động), lap với so_lan thật, hoặc danh_sach/so_dem chạy số; lời thoại nói rõ phần bị lược.');
    });
  });
  return loi;
}


// Cảnh có hình mà KHÔNG có chuyển động nào ngoài lúc xuất hiện (hình đứng yên như khối cứng suốt cảnh) -> nhắc thêm hành động.
function kiemTraHinhDungYen_(kb) {
  var loi = [];
  (kb.canh || []).forEach(function (c, j) {
    if (!c || !/mo_dau|de_bai|mo_hinh|y_do|diem_chot|tinh|kiem_tra|thu_nho|nhac_lai/.test(String(c.loai || ''))) return;
    var du = c.minh_hoa && c.minh_hoa.loai === 'san_khau' && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat) || !du.vat.length) return;
    var soHD = (Array.isArray(du.hanh_dong) ? du.hanh_dong : []).filter(function (h) { return h && Number(h.buoc) >= 1; }).length;
    var vatSau = du.vat.filter(function (v) { return v && Number(v.buoc) >= 2; }).length;
    var netSau = 0;
    du.vat.forEach(function (v) { if (v && Array.isArray(v.hinh)) v.hinh.forEach(function (h) { if (h && Number(h.buoc) >= 2) netSau++; }); });
    var tuDong = du.vat.some(function (v) { return v && ((Array.isArray(v.hinh) && v.hinh.some(function (h) { return h && h.kieu === 'xep_chong'; })) || (v.loai === 'canh_that' && Array.isArray(v.do) && v.do.length)); }) ? 1 : 0;   // chồng vật tự xếp / cảnh thực tế tự vẽ dần các phép đo   // chồng vật tự xếp từng tầng
    if (soHD + vatSau + netSau + tuDong < 2) loi.push('HINH_DUNG_YEN_CANH_' + (j + 1) + ': hình gần như đứng yên suốt cảnh. Thêm ít nhất 2 hành động khớp lời thoại (bien_hinh dời/xoay mảnh, tach/ghep, dem_tang, dat_gia_tri, chon, di_chuyen...) và tả chuyển động trong "mo_ta".');
  });
  return loi;
}
