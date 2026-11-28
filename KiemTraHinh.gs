/**
 * KIỂM TRA HÌNH MINH HỌA TRONG KỊCH BẢN (dán thành tệp KiemTraHinh.gs, cùng dự án với Code.gs)
 * Mục đích: bắt kịch bản mà phần mô tả hình minh họa thiếu/sai dạng NGAY khi viết, rồi buộc Gemini viết lại,
 * thay vì để bộ phận dựng video phải thay bằng "thẻ mô tả" nhàm chán.
 * Quy tắc phải khớp với src/bocuc.ts và src/sankhau/dulieu.ts của bộ phận dựng video.
 * Bản này thêm: kiểm tra "san_khau" (vật thật + hành động), tiêu đề cảnh, và tuSuaKichBan_() tự sửa lỗi vặt để đỡ gọi lại Gemini.
 */

var LOAI_VAT_ = ['canh_that', 'nguoi', 'the', 'the_bai', 'xuc_xac', 'dong_xu', 'hop_bi', 'tui', 'hop_qua', 'dong_ho', 'dien_thoai', 'bong_bay',
  'dong_ho_do', 'bieu_do_cot', 'thanh', 'vong_quay', 'cua', 'banh', 'nhan', 'chu', 'so_dem', 'mui_ten', 'bieu_tuong', 'luoi_o', 'danh_sach', 'ban_tron', 'anh_that',
  'khoi_hop', 'tru', 'non', 'cau', 'toa_nha', 'xe', 'cay', 'thang', 'hinh_hoc', 'do_thi', 'hinh_tu_do', 'bang_bien_thien'];
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
// VẬT NGOÀI THƯ VIỆN VẼ SẴN: vẽ bằng BIỂU TƯỢNG (emoji) ĐÚNG vật đó (hàng nghìn loại) thay vì đổi thành vật khác.
// Khóa: tên không dấu (ten trong kịch bản) hoặc từ tiếng Việt. Không tìm được thì mới dùng "công trình có biển tên" (chỉ hợp với tòa nhà).
var TU_DIEN_EMOJI_ = [
  [/tau_hoa|tàu hỏa|tàu hoả|đoàn tàu|xe lửa|tau_lua/, '🚆'], [/xe_tai|xe tải/, '🚚'], [/xe_cuu_thuong|xe cứu thương/, '🚑'], [/xe_cuu_hoa|cứu hỏa|cứu hoả/, '🚒'], [/taxi/, '🚕'],
  [/tau_thuy|tàu thủy|tàu thuỷ|du thuyền|tau_bien/, '🚢'], [/tau_ngam|tàu ngầm/, '🚤'], [/truc_thang|trực thăng/, '🚁'], [/ten_lua|tên lửa|rocket/, '🚀'], [/ve_tinh|vệ tinh/, '🛰'],
  [/bon_xang|cây xăng|tram_xang/, '⛽'], [/den_giao_thong|đèn giao thông|đèn tín hiệu/, '🚦'], [/bien_bao|biển báo/, '🚧'], [/cau_thang_cuon|thang cuốn/, '🛗'],
  [/benh_vien|bệnh viện/, '🏥'], [/nha_may|nhà máy|xí nghiệp/, '🏭'], [/khach_san|khách sạn/, '🏨'], [/sieu_thi/, '🏬'], [/buu_dien|bưu điện/, '🏤'], [/san_van_dong|sân vận động/, '🏟'],
  [/nha_tho|nhà thờ/, '⛪'], [/lau_dai|lâu đài/, '🏰'], [/leu|cái lều|lều trại/, '⛺'], [/den_tho|chùa|đền/, '🛕'], [/thap_eiffel/, '🗼'], [/cau_vong|cầu vồng/, '🌈'],
  [/bo_bien|bãi biển|biển/, '🏖'], [/dao|hòn đảo/, '🏝'], [/sa_mac|sa mạc/, '🏜'], [/nui_lua|núi lửa/, '🌋'], [/thac|thác nước/, '🏞'], [/rung|khu rừng/, '🌲'],
  [/hoa|bông hoa|bó hoa/, '🌸'], [/hoa_huong_duong|hướng dương/, '🌻'], [/cay_xuong_rong|xương rồng/, '🌵'], [/cay_dua|cây dừa/, '🌴'], [/la_cay|chiếc lá/, '🍃'], [/hat_giong|hạt giống/, '🌱'],
  [/meo|con mèo/, '🐈'], [/cho|con chó/, '🐕'], [/ga|con gà/, '🐓'], [/vit|con vịt/, '🦆'], [/bo|con bò/, '🐄'], [/lon|con lợn|con heo/, '🐖'], [/de|con dê/, '🐐'], [/cuu|con cừu/, '🐑'],
  [/ca|con cá|đàn cá/, '🐟'], [/chim|con chim/, '🐦'], [/ong|con ong|tổ ong/, '🐝'], [/kien|con kiến/, '🐜'], [/tho|con thỏ/, '🐇'], [/ngua|con ngựa/, '🐎'], [/vi_khuan|vi khuẩn/, '🦠'],
  [/tao|quả táo/, '🍎'], [/cam|quả cam/, '🍊'], [/chuoi|quả chuối/, '🍌'], [/dua_hau|dưa hấu/, '🍉'], [/nho|chùm nho/, '🍇'], [/trung|quả trứng/, '🥚'], [/banh_mi|bánh mì/, '🥖'],
  [/pizza/, '🍕'], [/banh_sinh_nhat|bánh sinh nhật|bánh kem/, '🎂'], [/keo|viên kẹo/, '🍬'], [/kem|cây kem/, '🍦'], [/sua|hộp sữa/, '🥛'], [/ca_phe|cà phê/, '☕'], [/tra_sua|trà sữa/, '🧋'],
  [/chai|chai nước|cái chai/, '🍾'], [/coc|cái cốc|ly nước/, '🥤'], [/noi|cái nồi/, '🍲'], [/gao|bao gạo/, '🌾'], [/thung_rac|thùng rác/, '🗑'], [/vali/, '🧳'], [/balo|ba lô/, '🎒'],
  [/sach|quyển sách|cuốn sách/, '📚'], [/vo|quyển vở/, '📓'], [/but|cây bút/, '✏️'], [/thuoc_ke|thước kẻ/, '📏'], [/may_tinh|máy tính/, '💻'], [/dien_thoai|điện thoại/, '📱'],
  [/dong_ho|đồng hồ/, '⏰'], [/lich|tờ lịch/, '📅'], [/qua|hộp quà|món quà/, '🎁'], [/bong_bay|bóng bay/, '🎈'], [/nen|ngọn nến/, '🕯'], [/bong_den|bóng đèn/, '💡'], [/pin|cục pin/, '🔋'],
  [/quat|cái quạt/, '🪭'], [/may_giat|máy giặt/, '🧺'], [/tu_lanh|tủ lạnh/, '🧊'], [/giuong|cái giường/, '🛏'], [/sofa|ghế sofa/, '🛋'], [/cua_so|cửa sổ/, '🪟'], [/guong|cái gương/, '🪞'],
  [/ve|vé|tấm vé/, '🎫'], [/the_ngan_hang|thẻ ngân hàng|thẻ tín dụng/, '💳'], [/vang|thỏi vàng/, '🪙'], [/kim_cuong|kim cương/, '💎'], [/hop_qua/, '🎁'], [/giai_thuong|cúp|huy chương/, '🏆'],
  [/bong_da|quả bóng đá/, '⚽'], [/bong_chuyen|bóng chuyền/, '🏐'], [/cau_long|cầu lông/, '🏸'], [/ho_boi|bể bơi/, '🏊'], [/xuc_xac/, '🎲'], [/la_bai|lá bài/, '🃏'], [/may_bay_giay|máy bay giấy/, '🛩'],
  [/nhiet_ke|nhiệt kế/, '🌡'], [/kinh_lup|kính lúp/, '🔍'], [/nam_cham|nam châm/, '🧲'], [/can|cân đĩa|cái cân/, '⚖'], [/ong_nghiem|ống nghiệm/, '🧪'], [/vong_tay|nhẫn/, '💍'],
  [/mua|cơn mưa|giọt mưa/, '🌧'], [/tuyet|bông tuyết/, '❄️'], [/set|tia sét/, '⚡'], [/gio|cơn gió/, '🌬'], [/mat_trang|mặt trăng/, '🌙'], [/ngoi_sao|ngôi sao/, '⭐'], [/trai_dat|trái đất/, '🌍']
];
function timEmoji_(chu) {
  var s = String(chu || '').toLowerCase();
  for (var i = 0; i < TU_DIEN_EMOJI_.length; i++) if (TU_DIEN_EMOJI_[i][0].test(s)) return TU_DIEN_EMOJI_[i][1];
  return '';
}
var LA_CONG_TRINH_ = /benh_vien|nha_may|uy_ban|khach_san|truong|cong_ty|toa|nha_|tru_so|buu_dien|thu_vien|cong_trinh/;
function suaCanhThat_(v, sua, so) {
  var cao0 = typeof CAO_MAC_DINH_ !== 'undefined' ? CAO_MAC_DINH_ : {};
  var vat = Array.isArray(v.vat) ? v.vat.filter(laDT_) : [];
  var x = 0, daMa = {};
  vat.forEach(function (o, i) {
    if (TEN_VAT_THUC_.indexOf(String(o.ten)) < 0) {
      // vật chưa có hình vẽ sẵn: biểu tượng đúng vật (emoji) + nhãn tên; chỉ tòa nhà/cơ quan mới thành "công trình có biển tên"
      var em = o.emoji || timEmoji_(String(o.ten || '') + ' ' + String(o.nhan || '') + ' ' + String(o.bien || ''));
      var tenGoc = catTheoTu_(bocTexSangChu_(String(o.ten || o.nhan || '').replace(/_/g, ' ')), 20);
      if (em && !LA_CONG_TRINH_.test(String(o.ten || ''))) { o.emoji = em; if (!o.nhan) o.nhan = tenGoc; o.ten = 'bieu_tuong'; sua.push('canh_that cảnh ' + so + ': vật "' + tenGoc + '" chưa có hình vẽ sẵn -> biểu tượng ' + em); }
      else { o.bien = o.bien || tenGoc; o.ten = 'cong_trinh'; sua.push('canh_that cảnh ' + so + ': vật lạ -> công trình có biển "' + o.bien + '"'); }
    }
    if (o.ten === 'mat_troi' && o.x === undefined) return;
    if (!laChuoi_(o.ma) || daMa[o.ma]) {
      var codeMa = 65 + (i % 26);
      while (daMa[String.fromCharCode(codeMa)] && codeMa < 91) codeMa++;
      o.ma = !daMa[String.fromCharCode(codeMa)] ? String.fromCharCode(codeMa) : ('V' + (i + 1));
    }
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
    else if (!laSo_(x.cao) || x.cao <= 0 || !laSo_(x.x) || (nhin === 'tren' && x.y !== undefined && !laSo_(x.y))) return 'HINH_' + ev + ', vật ' + x.ma + ': cần "cao" (mét, > 0) và "x" (vị trí ngang, mét)' + (nhin === 'tren' ? ' và "y"' : '') + '.';
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
    if (v.loai === 'anh_that' && (v.anh === '' || v.anh === undefined || v.anh === null || !(Number(v.anh) >= 0 && Math.floor(Number(v.anh)) === Number(v.anh)))) return 'HINH_' + ev + ': anh_that cần "anh" là số thứ tự ảnh thật của sản phẩm (0, 1, 2...).';
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

// CẢNH LIÊN HỆ THỰC TẾ: máy tự vẽ VẬT THẬT đa dạng khớp lời thoại (tránh lạm dụng hộp quà hop_qua chung chung).
var LIEN_HE_VAT_ = [[/chuồng|trang trại|nông trại|rào/, 'hang_rao'], [/sân bóng|bóng đá|đá bóng|cầu thủ|thi đấu|chia bảng/, 'qua_bong'], [/bóng rổ/, 'ro_bong_ro'],
  [/tòa nhà|cao ốc|chung cư/, 'toa_nha'], [/xây nhà|ngôi nhà|nhà ở|thi công|công trình|vật liệu/, 'nha'], [/ngân hàng|lãi suất|gửi tiết kiệm|vay|tài chính|đầu tư/, 'ngan_hang'],
  [/heo đất|để dành/, 'heo_dat'], [/tiền|mua|bán|giá|chi phí/, 'tien'], [/xe buýt/, 'xe_buyt'], [/xe máy/, 'xe_may'], [/xe đạp/, 'xe_dap'], [/ô tô|xe hơi|lái xe|quãng đường|giao thông/, 'xe_hoi'],
  [/cây|vườn|trồng/, 'cay'], [/cây cầu|bắc cầu/, 'cau'], [/thuyền|sông|ca nô/, 'thuyen'], [/máy bay|hàng không/, 'may_bay'], [/cột điện|dây điện/, 'cot_dien'],
  [/hồ bơi|bể bơi|hồ nước|bể nước/, 'ho_nuoc'], [/trường|lớp học|học sinh|thi cử|trắc nghiệm|chọn đội/, 'truong_hoc'], [/cửa hàng|siêu thị|quán|mua sắm|khách hàng/, 'cua_hang'], [/hải đăng/, 'hai_dang'], [/thang/, 'thang'], [/diều/, 'dieu'],
  [/cái bàn|mặt bàn|bàn học|bàn ăn/, 'ban'], [/ti vi|tivi|màn hình/, 'ti_vi'], [/kim tự tháp/, 'kim_tu_thap'], [/tháp truyền hình|tháp phát sóng|tháp thép/, 'thap'],
  [/bệnh viện|y tế|bác sĩ|xét nghiệm|ca trực|lịch trực|phân bổ ca|phân công|nhân sự|nhà máy|sản xuất|kiểm định|linh kiện/, 'cong_trinh']];
// chiều cao minh họa (không phải số đo): giữ vật lớn thấp lại để người đứng cạnh không bị tí hon
var CAO_LIEN_HE_ = { hang_rao: 1.3, qua_bong: 0.6, ro_bong_ro: 3, toa_nha: 4.5, nha: 3.4, ngan_hang: 3.6, heo_dat: 0.8, tien: 0.8, xe_buyt: 2.6, xe_may: 1.2, xe_dap: 1.1, xe_hoi: 1.5,
  cay: 3.2, cau: 3, thuyen: 2, may_bay: 2.5, cot_dien: 4, ho_nuoc: 0.8, truong_hoc: 3.8, cua_hang: 3.2, hai_dang: 4.5, thang: 3, dieu: 3, ban: 0.8, ti_vi: 0.9, kim_tu_thap: 4, thap: 4.5, cong_trinh: 3.8 };
function suaLienHeThucTe_(kb) {
  var sua = [];
  var CHU_ = ['nhan', 'chu', 'the', 'danh_sach', 'so_dem', 'mui_ten', 'bieu_tuong'];
  (kb.canh || []).forEach(function (c, i) {
    if (!c || !/lien_he/.test(String(c.loai || ''))) return;
    var mh = c.minh_hoa, du = mh && mh.du_lieu;
    var vat = du && Array.isArray(du.vat) ? du.vat : [];
    var chuThe = vat.map(function (v) { return v ? (String(v.noi_dung || '') + ' ' + String(v.nhan || '') + ' ' + (Array.isArray(v.ds) ? v.ds.join(' ') : '')) : ''; }).join(' ');
    var loi = (String(c.loi_thoai || '') + ' ' + String(c.tieu_de_canh || '') + ' ' + String((mh && mh.mo_ta) || '') + ' ' + chuThe).toLowerCase();
    var loiDoc = String(c.loi_thoai || '').toLowerCase();
    var vongQuayThua = vat.some(function (v) { return v && v.loai === 'vong_quay'; }) && !/vòng quay|quay số|bánh xe/.test(loiDoc);
    if (vongQuayThua) loi = loiDoc;
    var coHopQuaThua = vat.some(function (v) { return v && v.loai === 'hop_qua'; }) && !/hộp quà|món quà|tặng quà|sinh nhật/.test(loi);
    var coVatThatKhac = vat.some(function (v) { return v && CHU_.indexOf(v.loai) < 0 && !(coHopQuaThua && v.loai === 'hop_qua'); });
    if (coVatThatKhac && !coHopQuaThua && !vongQuayThua) return;   // đã có vật thật đa dạng (không phải hop_qua chung chung)

    // Giữ lại các thẻ chữ tóm tắt ở phía dưới sân khấu (nếu có) và thay hop_qua bằng hình minh họa khớp lời thoại
    var vatPhuDuoi = vat.filter(function (v) { return v && v.loai !== 'hop_qua' && CHU_.indexOf(v.loai) >= 0; }).map(function (v) {
      var vc = JSON.parse(JSON.stringify(v));
      if (Number(vc.y) < 68) vc.y = 76;
      vc.co = Math.min(Number(vc.co) || 0.9, 0.88);
      return vc;
    }).slice(0, 2);

    var vatMoi = [], hdMoi = [];
    var idChinh = 'lh_' + (i + 1);
    if (/mật khẩu|mã pin|bảo mật|điện thoại|tin nhắn|mạng|tài khoản/.test(loi)) {
      vatMoi.push({ id: idChinh, loai: 'dien_thoai', x: 34, y: 42, co: 0.92, buoc: 1, noi_dung: 'Bảo mật & Xác thực', ds: ['Mã PIN: ••••', 'OTP ngẫu nhiên', 'Bảo vệ tài khoản'], gia_tri_chu: 'An toàn' });
      vatMoi.push({ id: idChinh + '_ng', loai: 'nguoi', x: 72, y: 44, co: 0.95, so_luong: 2, ds: ['Người dùng', 'Hệ thống'], kieu: 'chi', buoc: 2 });
      hdMoi.push({ buoc: 2, vat: idChinh, kieu: 'chon', chi_so: [1, 2], mau: 'xanh_la' });
    } else if (/vòng quay|quay số|bánh xe/.test(loiDoc)) {
      vatMoi.push({id: idChinh, loai: 'vong_quay', x: 50, y: 42, ds: ['1', '2', '3', '4'], buoc: 1, nhan: 'Minh họa quay số'});
      hdMoi.push({buoc: 2, vat: idChinh, kieu: 'quay'});
    } else if (/bốc thăm|rút thăm|chia bảng/.test(loiDoc) && !/phân công|ca trực|chia nhóm/.test(loiDoc)) {
      vatMoi.push({id: idChinh, loai: 'the', x: 50, y: 42, so_luong: 3, ds: ['A', 'B', 'C'], buoc: 1, nhan: 'Ví dụ phiếu bốc thăm'});
      hdMoi.push({buoc: 2, vat: idChinh, kieu: 'chon', chi_so: [1], mau: 'xanh_la'});
    } else if (/bàn tròn|hội nghị|tiệc|sắp xếp chỗ/.test(loi)) {
      vatMoi.push({ id: idChinh, loai: 'ban_tron', x: 50, y: 42, co: 0.92, buoc: 1, ds: ['Khách 1', 'Khách 2', 'Khách 3', 'Khách 4', 'Khách 5', 'Khách 6'], noi_dung: 'Xếp chỗ', nhan: 'Sắp xếp bàn tròn' });
      hdMoi.push({ buoc: 2, vat: idChinh, kieu: 'quay' });
    } else if (/thời tiết|dự báo|mưa|bảo hiểm|rủi ro|thống kê|xác suất thực nghiệm|tỉ lệ/.test(loi)) {
      vatMoi.push({ id: idChinh, loai: 'bieu_do_cot', x: 35, y: 42, co: 0.86, buoc: 1, ds: ['Kịch bản 1', 'Kịch bản 2', 'Kịch bản 3'], ds_so: [75, 45, 90], nhan: 'Phân tích dữ liệu thực tế' });
      vatMoi.push({ id: idChinh + '_do', loai: 'dong_ho_do', x: 74, y: 42, co: 0.85, buoc: 2, gia_tri: 0.82, gia_tri_chu: '82%', nhan: 'Độ tin cậy' });
      hdMoi.push({ buoc: 2, vat: idChinh, kieu: 'chon', chi_so: [3], mau: 'xanh_la' });
    } else {
      var ten = [];
      LIEN_HE_VAT_.forEach(function (m) { if (ten.length < 3 && m[0].test(loi) && ten.indexOf(m[1]) < 0) ten.push(m[1]); });
      if (!ten.length) ten = ['truong_hoc', 'cong_trinh'];
      var bienCT = /bệnh viện|y tế|bác sĩ|xét nghiệm/.test(loi) ? 'BỆNH VIỆN' : /nhà máy|sản xuất|kiểm định|linh kiện/.test(loi) ? 'NHÀ MÁY' : /ca trực|lịch trực|phân bổ|phân công|nhân sự/.test(loi) ? 'TRUNG TÂM ĐIỀU HÀNH' : 'CƠ QUAN';
      var ds = [{ ma: 'A', ten: 'nguoi', cao: 1.7, x: 0, dong_tac: 'chi' }], x = 3;
      ten.forEach(function (t, k) {
        var cao = CAO_LIEN_HE_[t] || 3;
        var item = { ma: String.fromCharCode(66 + k), ten: t, cao: cao, x: x };
        if (t === 'cong_trinh') item.bien = bienCT;
        ds.push(item);
        x += Math.max(2.6, cao * 0.9);
      });
      if (/ca trực|phân bổ|phân công|nhân sự|đội|nhóm/.test(loi)) {
        ds.push({ ma: String.fromCharCode(66 + ten.length), ten: 'nguoi', cao: 1.7, x: x, dong_tac: 'gio_tay' });
      }
      var ct = { id: idChinh, loai: 'canh_that', nhin: 'ngang', x: 50, y: vatPhuDuoi.length ? 38 : 48, co: vatPhuDuoi.length ? 0.88 : 1, buoc: 1, vat: ds, do: [] };
      if (typeof kiemTraCanhThat_ === 'function' && kiemTraCanhThat_(ct, 'LIEN_HE')) return;
      vatMoi.push(ct);
      hdMoi.push({ buoc: 2, vat: idChinh, kieu: 'sang' });
    }
    c.minh_hoa = {
      loai: 'san_khau',
      mo_ta: 'Liên hệ thực tế sinh động khớp lời thoại: minh họa trực quan các tình huống ứng dụng ngoài đời thực.',
      du_lieu: { vat: vatMoi.concat(vatPhuDuoi), hanh_dong: hdMoi }
    };
    c.giu_san_khau = false;
    sua.push('cảnh ' + (i + 1) + ' (liên hệ thực tế): thay hình minh họa đa dạng khớp lời thoại');
  });
  return sua;
}

// Tự sửa lỗi vặt (không đổi nội dung bài): kẹp tọa độ, bỏ từ khóa không khớp tiêu đề, bỏ vật/hành động lạ, cắt chú thích dài.
function tuSuaKichBan_(kb, ctx, r) {
  if (!kb || !Array.isArray(kb.canh)) return [];
  kb.canh = kb.canh.filter(laDT_);
  var loaiTheoId = {};   // id vật -> loại (giữ qua các cảnh giu_san_khau)
  if (Array.isArray(kb.du_kien)) kb.du_kien = kb.du_kien.map(function (x) { return catGonTex_(String(x).replace(/\s+/g, ' ').trim(), 30); }).filter(Boolean).slice(0, 4);
  else delete kb.du_kien;
  if (!Array.isArray(kb.bai_hoc_rut_ra) || kb.bai_hoc_rut_ra.filter(function (x) { return String(x).trim().length >= 8; }).length < 2) {
    kb.bai_hoc_rut_ra = [
      'Đọc kỹ đề bài để nhận diện đúng dạng toán và không gian mẫu.',
      'Chia nhỏ bài toán thành các trường hợp độc lập để tránh đếm trùng.',
      'Luôn kiểm chứng lại kết quả bằng biến cố đối hoặc phép thử ngược.'
    ];
  } else {
    kb.bai_hoc_rut_ra = kb.bai_hoc_rut_ra.slice(0, 3).map(function (x) { return catGonTex_(String(x), 90); });
  }
  if (r && r.dap_an) {
    if (typeof dapAnVanBan_ === 'function') r.dap_an = dapAnVanBan_(r.dap_an);
    var daTho = String(r.dap_an).replace(/\s/g, '');
    // v102: đáp án kịch bản có THAM SỐ chữ (2a/√11, 0,603a) mà kết quả máy là số trần -> giữ dạng có tham số, không cắt cụt thành "0,603"
    var coThamSo_ = function (s) { return /(?:^|[^A-Za-zÀ-ỹ])[A-Za-z](?![A-Za-zÀ-ỹ])/.test(String(s || '').replace(/\\[A-Za-z]+/g, ' ').replace(/[{}^_$]/g, ' ')); };
    var giuThamSo = kb.dap_an_cuoi && coThamSo_(kb.dap_an_cuoi) && !coThamSo_(r.dap_an);
    if (!giuThamSo && (!kb.dap_an_cuoi || String(kb.dap_an_cuoi).replace(/\s/g, '') !== daTho)) {
      kb.dap_an_cuoi = r.dap_an;
    }
  }
  if (kb.canh.length > 0) {
    var cCuoi = kb.canh[kb.canh.length - 1];
    if (cCuoi && !/bai_hoc|ket_luan|chot/i.test(String(cCuoi.loai || ''))) {
      cCuoi.loai = 'bai_hoc';
    }
  }
  kb.canh.forEach(function (c, i) {
    if (!c) return;
    if (c.tieu_de_canh) c.tieu_de_canh = catGonTex_(String(c.tieu_de_canh).replace(/\s+/g, ' ').trim(), 60);
    if (c.tu_khoa && (!c.tieu_de_canh || String(c.tieu_de_canh).toLowerCase().indexOf(String(c.tu_khoa).toLowerCase()) < 0)) c.tu_khoa = '';
    if (i === 0) c.giu_san_khau = false;
    if (c.chuyen_canh && ['mo', 'truot_len', 'phong', 'luot_ngang', 'truot_xuong', 'lat_3d', 'quet_sang', 'tron_mo', 'zoom_xuyen', 'nghieng', 'lat_ngang', 'day_ngang'].indexOf(c.chuyen_canh) < 0) delete c.chuyen_canh;
    if (c.giong_doc) c.giong_doc = catGonTex_(String(c.giong_doc).replace(/\s+/g, ' ').trim(), 120);
    // Tự động chuyển đổi sạch sẽ mã LaTeX sang lời đọc tiếng Việt thuần túy và sửa lỗi chính tả trong lời thoại & tiêu đề cảnh
    if (c.tieu_de_canh) c.tieu_de_canh = suaChinhTaTiengViet_(c.tieu_de_canh);
    if (c.loi_thoai) {
      c.loi_thoai = suaChinhTaTiengViet_(docLatexThanhLoi_(c.loi_thoai));
    } else {
      c.loi_thoai = (c.tieu_de_canh ? String(c.tieu_de_canh) + '. ' : '') + 'Để ý kỹ chi tiết này nhé!';
    }
    // bỏ lời mở máy móc "Cảnh 3:", "Bước 2:" ở đầu lời thoại (nhãn bước đã hiện trên màn hình)
    if (i > 0 && c.loi_thoai) {
      var gon = String(c.loi_thoai).replace(/^\s*(cảnh\s+\d+|bước\s+(\d+|một|hai|ba|bốn|năm))\s*[:.,-]\s*/i, '');
      if (gon.length >= 15) c.loi_thoai = gon.charAt(0).toUpperCase() + gon.slice(1);
    }
    if (Array.isArray(c.chu_thich)) c.chu_thich = c.chu_thich.slice(0, 3).map(function (x) { return catGonTex_(x, 60); });
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
  return tuSuaSau_(kb, ctx, r);
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

var HOOK_KIEU_ = ['sai_lam', 'thach_thuc', 'bat_ngo', 'cau_hoi'];   // v89: bỏ 'ket_qua_truoc' (lộ đáp án ngay câu đầu)
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
  var lo = loHookDapAn_(kb);
  if (lo) return lo;
  var pa = tieuDePhienAm_(kb);
  if (pa) return pa;
  return '';
}

// v89 CHỐNG LỘ ĐÁP ÁN: đáp số (không có sẵn trong đề) không được xuất hiện ở hook / tiêu đề / ảnh bìa / lời cảnh 1.
function loHookDapAn_(kb) {
  var mau = mauDapSoLo_(kb);
  if (!mau.length) return '';
  var dap = String(kb.dap_an_cuoi || kb.dap_an || '');
  var o = {hook: kb.hook, hook_chu: kb.hook_chu, tieu_de_bia: kb.tieu_de_bia, tieu_de: kb.tieu_de, chu_de_ngan: kb.chu_de_ngan,
    hook_ung_vien: (kb.hook_ung_vien || []).join(' | '), 'loi_thoai cảnh 1': kb.canh && kb.canh[0] ? kb.canh[0].loi_thoai : ''};
  for (var k in o) {
    var v = String(o[k] || '');
    for (var i = 0; i < mau.length; i++) if (mau[i].test(v)) return 'HOOK_LO_DAP_AN: "' + k + '" đang nêu đáp số (' + dap + '). Mở bài phải là câu hỏi gợi tò mò (ví dụ "P(A ∩ B) = ?", "r bằng bao nhiêu thì rẻ nhất?"), không nói trước kết quả.';
  }
  return '';
}
// Mẫu nhận diện đáp số (không có sẵn trong đề) dưới dạng số, phân số, chữ đọc -> dùng cho kiểm tra và Auto-fix chống lộ đáp án.
function mauDapSoLo_(kb) {
  var dap = String(kb.dap_an_cuoi || kb.dap_an || '');
  if (!dap) return [];
  var de = [].concat(kb.de_cho || [], kb.du_kien || [], [kb.can_tim || '']).join(' ');
  var mau = [];
  var phanSo = dap.match(/(\d+)\s*\/\s*(\d+)|frac\{(\d+)\}\{(\d+)\}/);
  if (phanSo) {
    var tu = phanSo[1] || phanSo[3], mauSo = phanSo[2] || phanSo[4];
    mau.push(new RegExp('(^|[^\\d])' + tu + '\\s*/\\s*' + mauSo + '(?!\\d)'));
    mau.push(new RegExp('frac\\{' + tu + '\\}\\{' + mauSo + '\\}'));
    mau.push(new RegExp(soThanhChu_(Number(tu)) + '\\s+phần\\s+' + soThanhChu_(Number(mauSo)), 'i'));
  } else {
    (dap.match(/\d+(?:[.,]\d+)?/g) || []).forEach(function (so) {
      var n = Number(so.replace(',', '.'));
      if (!isFinite(n) || n < 2) return;                                     // 0, 1 quá phổ biến
      var reSo = '(^|[^\\d.,])' + so.replace(/[.,]/, '[.,]') + '(?![\\d])';
      if (new RegExp(reSo).test(de)) return;                                // số có sẵn trong đề
      mau.push(new RegExp(reSo));
      if (Math.floor(n) === n && n < 1000000) mau.push(new RegExp('(^|\\s)' + soThanhChu_(n) + '(?=\\s|$|[,.!?])', 'i'));
    });
  }
  return mau;
}

// v89: tiêu đề cảnh không viết phiên âm ("V phẩy bằng zero", "mười cm", "năm mươi tư") và không mở đầu bằng dấu câu.
function tieuDePhienAm_(kb) {
  var re = /(^|\s)(zero|phẩy|xăng-ti-mét|xen-ti-mét|mươi|một phần|hai phần|ba phần)(?=\s|$)|(^|\s)(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s+(cm|m|mét|độ)(?=\s|$)/i;
  for (var i = 0; i < (kb.canh || []).length; i++) {
    var t = String(kb.canh[i].tieu_de_canh || '');
    if (re.test(t)) return 'TIEU_DE_PHIEN_AM: tiêu đề cảnh ' + (i + 1) + ' "' + t + '" viết phiên âm; viết kiểu toán: "V\'(x) = 0", "10 cm", "54π m³", "1/4".';
    if (/^\s*[:,;?!]/.test(t)) return 'TIEU_DE_DAU_CAU: tiêu đề cảnh ' + (i + 1) + ' "' + t + '" bắt đầu bằng dấu câu.';
  }
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
function laDai10P_(kb) { return !!kb && kb.kieu_video === 'DAI_10_PHUT'; }

function loiCauChuyen_(kb) {
  var story = kb.cau_chuyen, set = story && story.phong_canh;
  function chu(x) { return typeof x === 'string' && x.trim().length > 1; }
  function mau(x) { return /^#[0-9a-f]{6}$/i.test(String(x)); }
  function ba(x) { return Array.isArray(x) && x.length === 3 && x.every(function(n){return typeof n === 'number' && isFinite(n);}); }
  if (!story || ![story.nguoi_ke, story.dia_diem, story.muc_tieu].every(chu))
    return 'THIEU_CAU_CHUYEN: ghi rõ người kể, địa điểm, quyết định cần đưa ra và kể bằng lời thoại.';
  if (!set || !mau(set.troi) || !mau(set.dat) || !Array.isArray(set.vat) || set.vat.length < 3 || set.vat.length > 32)
    return 'THIEU_PHONG_CANH: dựng địa điểm bằng màu trời, sàn và 3–32 khối ở phong_canh.vat.';
  if (!set.vat.every(function(v) {
    return v && chu(v.ten) && /^(hop|tru|cau|non)$/.test(v.hinh) && mau(v.mau) && ba(v.tam) &&
      Math.abs(v.tam[0]) <= 10 && v.tam[1]>=0 && v.tam[1]<=8 && v.tam[2]>=-12 && v.tam[2]<=0 &&
      ba(v.co) && v.co.every(function(n){return n>0 && n<=20;});
  })) return 'PHONG_CANH_SAI: kiểm tra tên, hình, màu, tâm [x,y,z] và kích thước từng vật theo quy ước phong_canh.';
  return '';
}

// Dùng cùng phép kiểm khi viết và khi GitHub nhận kịch bản để dựng.
function loiKichBanDungCanh_(kb, deGoc) {
  var loi = [], canh = kb.canh;
  if (!Array.isArray(canh) || canh.length < 3) return ['Cần cảnh mở đầu thực tế, cảnh đọc đề và cảnh giải.'];
  if (!canh.every(function(c) { return c && typeof c === 'object'; })) return ['Danh sách cảnh có phần tử sai kiểu.'];
  if (!/^(hook|mo_dau)$/.test(canh[0].loai) || canh[1].loai !== 'de_bai')
    loi.push('Cảnh 1 phải mở câu chuyện bằng vật thật, cảnh 2 đọc đề và nối cùng vật sang hình toán.');
  var de = String(deGoc || kb.de_bai || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
  function banVe(model, viTri) {
    if (!model) return;
    (['chi_tiet','doan_toan']).forEach(function(k) {
      if (!Array.isArray(model[k])) return;
      model[k].forEach(function(v) {
        var trich = String(v && v.tu_de || '').trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
        if (!trich || de.indexOf(trich) < 0) loi.push(viTri + ': ' + k + ' cần trích đúng dữ kiện từ đề gốc.');
      });
    });
  }
  banVe(kb.mo_hinh_3d, 'Mô hình chung');
  canh.forEach(function(c,i) {
    var viTri = 'Cảnh ' + (i + 1);
    if (!String(c.loi_thoai || '').trim()) loi.push(viTri + ': thiếu lời dẫn.');
    banVe(c.mo_hinh_3d, viTri);
    if (c.net_toan !== undefined && (!Array.isArray(c.net_toan) || c.net_toan.length > 32 ||
      !c.net_toan.every(function(net) {
        return net && Array.isArray(net.diem) && net.diem.length >= 1 && net.diem.length <= 120 &&
          net.diem.every(function(p) { return Array.isArray(p) && p.length === 2 &&
            p.every(function(x) { return typeof x === 'number' && isFinite(x) && x >= 0 && x <= 1; }); }) &&
          (net.nhan === undefined || typeof net.nhan === 'string');
      }))) loi.push(viTri + ': nét Manim cần 1–120 điểm [x,y] trong khoảng 0–1.');
  });
  return loi;
}

function danhGiaKichBan_(kb, dapAn, mon, coHinhDe, sanPham, deGoc, lop) {
  var nang = [], nhe = [];
  var lopKT = lop || (kb && kb.lop) || '';
  if (lopKT && typeof kiemTraViPhamLop_ === 'function') {
    kiemTraViPhamLop_(kb, lopKT, mon, deGoc).forEach(function (vp) {
      var lChuan = typeof chuanLop_ === 'function' ? chuanLop_(lopKT) : lopKT;
      nang.push('VI_PHAM_CHUONG_TRINH_LOP: ' + vp + ' Viết lại toàn bộ công thức và lời thoại chỉ dùng đúng kiến thức lớp ' + lChuan + '.');
    });
  }
  var them = function (ds, loi) { if (loi) ds.push(loi); };
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return { nang: ['KHONG_CO_CANH: kịch bản phải có mảng "canh" gồm 14-18 cảnh.'], nhe: [] };
  var laLuongHH = String(mon || kb.mon || '').toUpperCase() === 'HINH_HOC' || kb.luong === 'hinh_hoc_thuan';
  if (!laLuongHH) them(nang, loiCauChuyen_(kb));   // luồng hình học thuần: không có phong cảnh 3D / câu chuyện đời sống
  if (String(mon || kb.mon || "").toUpperCase() !== "HINH_HOC") nang = nang.concat(loiKichBanDungCanh_(kb, deGoc));
  var laDai10P = kb.kieu_video === 'DAI_10_PHUT';
  // VIDEO NHIỀU CẢNH, CHI TIẾT: 14-18 cảnh cho video ngắn; 28-65 cảnh cho video bài giảng chuyên đề dài 10 phút
  if (laDai10P) {
    if (kb.canh.length < 22 || kb.canh.length > 68) nang.push('SO_CANH_VIDEO_DAI_SAI: hiện có ' + kb.canh.length + ' cảnh, video dài 10 phút cần 32-55 cảnh chi tiết.');
  } else {
    if (kb.canh.length < 8 || kb.canh.length > 26) nang.push('SO_CANH_NGOAI_10_DEN_24: hiện có ' + kb.canh.length + ' cảnh, cần 15-20 cảnh (mỗi cảnh một ý: mỗi bước tính một cảnh, đề bài 1-2 cảnh, mô phỏng 2-3 cảnh...).');
    else if (kb.canh.length < 14) nhe.push('IT_CANH: ' + kb.canh.length + ' cảnh, nên tách thành 15-20 cảnh cho chi tiết (mỗi bước tính, mỗi ý một cảnh).');
  }
  var thucTe = String(mon || '').toUpperCase() === 'THUC_TE';
  if (!Array.isArray(kb.bai_hoc_rut_ra) || kb.bai_hoc_rut_ra.filter(function (x) { return String(x).trim().length >= 8; }).length < 2) nhe.push('THIEU_BAI_HOC_RUT_RA: cần "bai_hoc_rut_ra" là mảng 3 câu ngắn (mỗi câu ≤ 12 từ).');
  if (!kb.canh.some(function (c) { return /tinh|giai/i.test(String(c.loai || '')); })) nhe.push('THIEU_CANH_TINH_TOAN: cần ít nhất một cảnh "tinh_toan".');
  if (!/bai_hoc|ket_luan|chot/i.test(String(kb.canh[kb.canh.length - 1].loai || ''))) nhe.push('THIEU_CANH_BAI_HOC: cảnh cuối phải là "bai_hoc".');
  var tong = 0;
  for (var i = 0; i < kb.canh.length; i++) {
    var c = kb.canh[i];
    if (!c.loi_thoai || !String(c.loi_thoai).trim()) { nang.push('THIEU_LOI_THOAI_CANH_' + (i + 1) + ': cảnh nào cũng phải có lời thoại.'); continue; }
    if (/[\\$]/.test(c.loi_thoai)) nang.push('LOI_THOAI_CHUA_LATEX_CANH_' + (i + 1));
    // Quyết định cần tạo mô hình dựa vào bộ lập cảnh trước TTS.
    // Các loại "the", "banh", "khoi_hop" cũng là hình Manim trong phần giải.
    tong += uocGiayDoc_(c.loi_thoai);
  }
  if (/^\s*(xin\s+)?chào/i.test(kb.canh[0].loi_thoai) && !(typeof cauHinh_ === 'function' && cauHinh_('KIEU_MO_DAU') === 'chao_hook')) nhe.push('MO_DAU_BANG_LOI_CHAO');
  var gioiHan = laDai10P ? 760 : Math.max(Number(cauHinh_('GIAY_TOI_DA')) || 190, 180);   // video dài 10 phút: tối đa ~12,5 phút; video ngắn: tối thiểu 180s
  if (laDai10P && (tong < 540 || tong > 660)) nang.push('THOI_LUONG_CHUYEN_DE: lời giảng ước tính ' + tong + ' giây, cần 540–660 giây. Điều chỉnh nội dung từng chương.');
  if (!laDai10P && tong > gioiHan * 1.15) nang.push('QUA_DAI_' + tong + '_GIAY');
  else if (tong > gioiHan) nhe.push('QUA_DAI_' + tong + '_GIAY');
  if (String(kb.dap_an_cuoi).replace(/\s/g, '') !== dapAn) nang.push('DAP_AN_CUOI_SAI');

  var banVeDau = kb.mo_hinh_3d || kb.canh[0].mo_hinh_3d || (kb.canh[1] && kb.canh[1].mo_hinh_3d);
  var coBanVeDau = banVeDau && Array.isArray(banVeDau.chi_tiet) && banVeDau.chi_tiet.length > 0;
  var idTruoc = {}, soSanKhau = 0, so3D = 0, soMoHinh = 0, coHinh = 0;
  for (var j = 0; j < kb.canh.length; j++) {
    var cj = kb.canh[j];
    if (Array.isArray(cj.net_toan) && cj.net_toan.length) soMoHinh++;
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
  if (typeof kiemTraDaDangHinhThucTe_ === 'function') kiemTraDaDangHinhThucTe_(kb, mon).forEach(function (x) { nhe.push(x); });
  kiemTraNhanDai_(kb).forEach(function (x) { nhe.push(x); });
  kiemTraBaCham_(kb).forEach(function (x) { nang.push(x); });
  kiemTraCuPhapTex_(kb).forEach(function (x) { nang.push(x); });
  if ((laLuongHH || /^(HINH_HOC|HINH_PHANG|HINH_KHONG_GIAN)$/.test(String(kb.mon || mon || '').toUpperCase())) && typeof kiemTraKichBanManim_ === 'function') {
    // v97: hình KHÔNG GIAN chuẩn (hinh_khong_gian) -> kiểm riêng (đặc tả + moc_xoay + bộ giải máy), không đòi tọa độ hinh_hoc / buoc_ve
    var kM = kb.hinh_khong_gian && typeof kiemKhongGian_ === 'function' && (typeof batHinhKhongGian_ !== 'function' || batHinhKhongGian_()) ? kiemKhongGian_(kb) : kiemTraKichBanManim_(kb);
    kM.nang.forEach(function (x) { nang.push(x); });
    kM.nhe.forEach(function (x) { nhe.push(x); });
    // BP3 kiểm hinh_phang_chuan độc lập với hinh_khong_gian: kb mang cả hai thì BP2 cũng phải kiểm cả hai (trước đây chỉ kiểm KG -> HP_* lọt sang BP3).
    if (kb.hinh_khong_gian && kb.hinh_phang_chuan && typeof kb.hinh_phang_chuan === 'object' && typeof kiemHinhPhangChuan_ === 'function' &&
        (typeof batHinhPhangChuan_ !== 'function' || batHinhPhangChuan_())) {
      var kHP = kiemHinhPhangChuan_(kb);
      kHP.nang.forEach(function (x) { if (nang.indexOf(x) < 0) nang.push(x); });
      kHP.nhe.forEach(function (x) { if (nhe.indexOf(x) < 0) nhe.push(x); });
    }
  }
  if (!laLuongHH) {
    kiemTraVatThucDe_(kb, deGoc).forEach(function (x) { nang.push(x); });
    kiemTraBoCucDe_(kb, deGoc).forEach(function (x) { nang.push(x); });
  }
  // CÔNG THỨC: phải có cảnh giải thích công thức (từ đâu ra, ý nghĩa đại lượng, áp dụng); mỗi cảnh ≤ 3 dòng công thức
  var dungCongThuc = kb.canh.some(function (c) { return /tinh|giai/.test(String(c && c.loai)) && (c.noi_dung_man_hinh || []).some(function (d) { return /=/.test(String(d)); }); });
  var soGiaiThich = kb.canh.filter(laCanhGiaiThichCongThuc_).length;
  if (dungCongThuc && soGiaiThich === 0) nang.push('THIEU_GIAI_THICH_CONG_THUC: bài dùng công thức nhưng không có cảnh "nhac_lai" giải thích. Thêm 2-3 cảnh nhac_lai trước phần tính: công thức TỪ ĐÂU RA, Ý NGHĨA từng đại lượng (chỉ lên hình), ÁP DỤNG vào bài này thế nào.');
  else if (dungCongThuc && soGiaiThich < 2) nhe.push('GIAI_THICH_CONG_THUC_SO_SAI: chỉ có ' + soGiaiThich + ' cảnh nhac_lai; nên 2-3 cảnh (từ đâu ra, ý nghĩa đại lượng, áp dụng vào bài).');
  kb.canh.forEach(function (c, j) { if (c && Array.isArray(c.noi_dung_man_hinh) && c.noi_dung_man_hinh.length > 3) nhe.push('QUA_NHIEU_DONG_CONG_THUC_CANH_' + (j + 1) + ': ' + c.noi_dung_man_hinh.length + ' dòng công thức (chữ sẽ nhỏ). Tối đa 2-3 dòng mỗi cảnh, tách phần còn lại sang cảnh sau.'); });
  if (!laLuongHH && !kb.canh.some(function (c) { return /lien_he/.test(String(c && c.loai)); })) nhe.push('THIEU_LIEN_HE_THUC_TE: nên có 1 cảnh "lien_he_thuc_te": cách nghĩ/công thức này dùng ở đâu ngoài đời (2-3 ví dụ cụ thể, có hình vật thật).');
  // cảnh ĐỀ BÀI phải cho thấy VẬT THẬT của đề (hộp bi, tấm thẻ, xúc xắc, đồng xu, người, cột cờ...), không chỉ toàn khung chữ
  var CHU_THUAN_ = ['nhan', 'chu', 'danh_sach', 'so_dem', 'mui_ten'];
  kb.canh.forEach(function (c, j) {
    if (!c || String(c.loai) !== 'de_bai') return;
    var du = c.minh_hoa && c.minh_hoa.du_lieu;
    var vat = du && Array.isArray(du.vat) ? du.vat : [];
    var coVat = vat.some(function (v) {
      if (!v) return false;
      if (v.loai === 'the') return (Array.isArray(v.ds) && v.ds.length >= 2) || Number(v.so_luong) >= 2;
      return CHU_THUAN_.indexOf(v.loai) < 0;
    }) || (c.giu_san_khau && j > 0);
    if (!coVat) nang.push('DE_BAI_CHI_CO_CHU_CANH_' + (j + 1) + ': cảnh đề bài chỉ có khung chữ. Phải vẽ VẬT THẬT của đề (' + (thucTe ? 'canh_that với vật thật' : 'the (tấm thẻ đánh số), hop_bi (hộp bi), xuc_xac, dong_xu, the_bai, nguoi, vong_quay...') + ') - thẻ ĐỀ CHO / CẦN TÌM máy đã tự hiện, không cần nhắc lại bằng chữ trên sân khấu.');
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
    var veHinh = (coBanVeDau && !xepChong) || kb.canh.slice(0, 3).some(function (c) {
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
  if (thucTe && !taiChinh && !coBanVeDau && !so3D && !coHinhDe) nhe.push('THIEU_CANH_3D: video toán thực tế cần tình huống mở đầu có thể dựng bằng Blender.');
  if (thucTe && soMoHinh < 1) nhe.push('THIEU_MO_HINH: video toán thực tế nên có ít nhất 1 cảnh hinh_hoc, do_thi hoặc hinh_tu_do để mô hình hóa.');
  var canDA = kb.canh[timCanhDapAn_(kb)];
  var dsDA = (canDA && canDA.noi_dung_man_hinh) || [];
  if (!dsDA.length && kb.hinh_phang_chuan && Array.isArray(kb.hinh_phang_chuan.trang_chung_minh)) {
    // v94: hình phẳng chuẩn -> dòng kết luận là dòng cuối của trang chứng minh cuối
    var tHP = kb.hinh_phang_chuan.trang_chung_minh.filter(function (t) { return t && Array.isArray(t.dong) && t.dong.length; });
    if (tHP.length) dsDA = tHP[tHP.length - 1].dong.map(function (d) { return String((d && d.tex) || ''); });
  }
  if (laDapSo_(dapAn) && !coDapSo_(dsDA.length ? String(dsDA[dsDA.length - 1]) : '', dapAn)) nang.push('DAP_AN_SAI_TREN_MAN_HINH: dòng cuối của cảnh đáp án phải chứa đáp số ' + dapAn + '.');
  var psDA = cacPhanSo_(dsDA.length ? String(dsDA[dsDA.length - 1]) : '');
  var mDA = /^(\d+)\/(\d+)$/.exec(String(dapAn).replace(/\s/g, ''));
  if (mDA && psDA.length && (psDA[psDA.length - 1][0] * Number(mDA[2]) !== psDA[psDA.length - 1][1] * Number(mDA[1]))) nang.push('DAP_AN_SAI_TREN_MAN_HINH: phân số cuối ở dòng cuối của cảnh đáp án không bằng ' + dapAn + '.');
  var can = Math.max(3, Math.ceil(kb.canh.length / 2));
  if (coHinh < can) nhe.push('IT_HINH_MINH_HOA: chỉ có ' + coHinh + ' cảnh có hình, nên có ít nhất ' + can + '.');
  var canSK = Math.min(3, kb.canh.length - 2);
  if (soSanKhau < canSK) nhe.push('IT_SAN_KHAU: chỉ có ' + soSanKhau + ' cảnh dùng "san_khau", nên có ít nhất ' + canSK + '.');
  // CHỮ TRÊN HÌNH GỌN GÀNG: một cảnh tối đa 3 nhãn chữ trên sân khấu (chữ dài, công thức để ở khung công thức bên dưới);
  // hình tự do không chồng quá 5 dòng chữ; nhãn không được dài như câu văn.
  kb.canh.forEach(function (c, i) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    var vs = du && Array.isArray(du.vat) ? du.vat : [];
    var nhan = vs.filter(function (v) { return v && (v.loai === 'nhan' || v.loai === 'chu'); });
    var coHinh = vs.some(function (v) { return v && VAT_PHU_.indexOf(v.loai) < 0 && v.loai !== 'danh_sach'; });
    if (nhan.length > 3) nang.push('QUA_NHIEU_CHU_CANH_' + (i + 1) + ': cảnh ' + (i + 1) + ' có ' + nhan.length + ' nhãn chữ trên sân khấu (tối đa 3). Giữ 1-3 nhãn ngắn quan trọng nhất, phần còn lại đưa vào "noi_dung_man_hinh" hoặc lời thoại.');
    var dai = nhan.filter(function (v) { return String(v.noi_dung || '').replace(/\\[a-zA-Z]+|[{}_^$]/g, '').length > 32; });
    if (dai.length) nhe.push('NHAN_QUA_DAI_CANH_' + (i + 1) + ': nhãn "' + catGonTex_(String(dai[0].noi_dung), 40) + '..." dài như câu văn; nhãn trên hình tối đa ~5 chữ, câu dài để ở khung công thức.');
    vs.forEach(function (v) {
      if (!v || v.loai !== 'hinh_tu_do' || !Array.isArray(v.hinh)) return;
      var soChu = v.hinh.filter(function (h) { return h && (h.kieu === 'chu' || h.nhan); }).length;
      if (soChu > 6) nhe.push('HINH_NHIEU_CHU_CANH_' + (i + 1) + ': hình tự do có ' + soChu + ' dòng chữ/nhãn chồng lên hình, rối mắt. Giữ tối đa 4-5 nhãn ngắn, hiện dần theo bước (buoc).');
    });
    if (coHinh && nhan.length >= 3) nhe.push('CHU_DE_LEN_HINH_CANH_' + (i + 1) + ': cảnh có hình chính kèm ' + nhan.length + ' nhãn; đặt nhãn ở vùng trống quanh hình (không đặt giữa hình), hiện lần lượt theo lời thoại.');
  });
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
  // BÀI HÌNH HỌC (dựng bằng Manim): bỏ các yêu cầu chỉ dành cho video Remotion (hình phải có hành động sân khấu, cảnh liên hệ
  // thực tế vẽ vật thật, cảnh nhắc lại công thức, đề bài phải có vật thật...). Manim tự làm chuyển động theo lời giảng, giọng đọc giảng
  // kiến thức; giữ các yêu cầu này chỉ làm kịch bản lan man (người kiểm duyệt chê "rườm rà") và bị xóa oan.
  if (String(mon || '').toUpperCase() === 'HINH_HOC') {
    var boQuaHH = /^(HINH_DUNG_YEN|HINH_IT_CHUYEN_DONG|THIEU_CANH_3D|THIEU_LIEN_HE_THUC_TE|THIEU_GIAI_THICH_CONG_THUC|GIAI_THICH_CONG_THUC_SO_SAI|DE_BAI_CHI_CO_CHU|HINH_QUA_DON_GIAN|MO_TA_HINH_QUA_NGAN|IT_CANH|SO_CANH_NGOAI)/;
    nang = nang.filter(function (x) { return !boQuaHH.test(String(x)); });
    nhe = nhe.filter(function (x) { return !boQuaHH.test(String(x)); });
    if (kb.canh.length < 6) nang.push('IT_CANH_HINH_HOC: bài hình học cần ít nhất 6 cảnh (mở đầu, đề bài, ý tưởng, các bước giải, kết luận).');
  }
  // v92: tầng 3D rỗng/đứng im mà Auto-fix không suy được khuôn -> LỖI CỨNG (bắt AI viết lại), còn lại là cảnh báo
  // v98: có đặc tả Lego (hinh_khong_gian v2) -> hình 3D do động cơ Lego dựng: bỏ yêu cầu khuôn canh_3d_vector, kiểm đặc tả Lego
  var laLegoKT = typeof laLegoKb_ === 'function' && laLegoKb_(kb);
  if (!laLuongHH) loiKhung4Tang_(kb).forEach(function (x) { if (laLegoKT && /^KHUNG4TANG_3D_RONG/.test(x)) return; (/^(KHUNG4TANG_3D_RONG|KHUNG4TANG_BAT_BUOC)/.test(x) ? nang : nhe).push(x); });
  if (laLegoKT && !laLuongHH && typeof kiemKhongGian_ === 'function') { var kLg = kiemKhongGian_(kb); kLg.nang.forEach(function (x) { nang.push(x); }); kLg.nhe.forEach(function (x) { nhe.push(x); }); }
  // v95: chuẩn Toán (parabol / căn cứ cực trị = lỗi cứng) + độ dài khung 4 tầng (cảnh báo)
  if (!laLuongHH) { var tv95 = loiToanV95_(kb); nang = nang.concat(tv95.nang); nhe = nhe.concat(tv95.nhe); }
  // v96: xác suất sai đáp số / đọc lặp đề / cụt công thức / mã TeX thô ở trường chữ thường = lỗi cứng (SanKhau.gs)
  if (!laLuongHH && typeof loiSanKhau_ === 'function') nang = nang.concat(loiSanKhau_(kb));
  // v91 AUTO-FIX: chỉ lỗi cứng (đáp án/phép tính/lớp/khóa luồng/rỗng) còn trong "nang"; lỗi hình thức thành cảnh báo
  return phanLoaiLoiCung_(nang, nhe, kb);
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
    var ds = [['canh', 2], ['goc', 3], ['vuong', 3], ['to', 3], ['tron', 2], ['phu', 2], ['bang', 2], ['khuat', 2]];
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

// Đáp số dạng số (toán thực tế, chấp nhận cả 0.8165 và 0,8165) chứ không phải phân số xác suất.
function laDapSo_(dapAn) { return /^-?\d+([.,]\d+)?$/.test(String(dapAn == null ? '' : dapAn).trim()); }
// Kiểm tra nghiêm ngặt dòng công thức có chứa đúng đáp số (tránh "1" trong "1 - P" bị nhận nhầm là 0.8165 do làm tròn nguyên).
function chuaDapSoChinhXac_(dong, dapAn) {
  var t = String(dong == null ? '' : dong).replace(/\{,\}/g, ',').replace(/\\,|\\ |~/g, '').replace(/(\d)\s+(?=\d{3}(\D|$))/g, '$1');
  var dung = Number(String(dapAn == null ? '' : dapAn).trim().replace(',', '.'));
  if (!isFinite(dung)) return false;
  var so = (t.match(/-?\d+(?:[.,]\d+)?/g) || []).map(function (x) { return Number(x.replace(',', '.')); });
  var tol = Math.max(1e-6, 1e-6 * Math.abs(dung));
  return so.some(function (x) { return isFinite(x) && Math.abs(x - dung) <= tol; });
}
// Dòng công thức có chứa đáp số không (chấp nhận 12.5, 12,5, 12{,}5).
function coDapSo_(dong, dapAn) {
  var t = String(dong).replace(/\{,\}/g, ',').replace(/\\,|\\ |~/g, '').replace(/(\d)[\s.](?=\d{3}(\D|$))/g, '$1');   // bỏ dấu phân cách nghìn "138 548"
  var dung = Number(String(dapAn).trim().replace(',', '.'));
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
  var s = String(dapAn).trim().replace(',', '.'), am = s.charAt(0) === '-';
  if (am) s = s.slice(1);
  var p = s.split('.');
  var chu = soThanhChu_(Number(p[0]));
  if (p[1]) chu += ' phẩy ' + (p[1].length <= 2 && p[1].charAt(0) !== '0' ? soThanhChu_(Number(p[1])) : p[1].split('').map(function (c) { return soThanhChu_(Number(c)); }).join(' '));
  return (am ? 'âm ' : '') + chu;
}
// Tự đồng bộ đáp số chốt vào noi_dung_man_hinh của mọi cảnh dap_an/ket_qua (và thẻ bước tương ứng trong khung4tang) bằng code thuần.
function dongBoDapSoCanhDapAn_(kb, dapAnNguon) {
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return false;
  var goc = String(dapAnNguon || kb.dap_an || kb.dap_an_cuoi || '').trim();
  if (!goc || !laDapSo_(goc)) return false;
  var dapAnNorm = goc.replace(',', '.');
  var soTex = dapAnNorm.replace('.', '{,}');
  var hien = String(kb.dap_an_hien || '').trim();
  var dongBoSung = hien && chuaDapSoChinhXac_(hien, dapAnNorm) && hien.length <= 40
    ? '\\text{' + hien.replace(/[{}\\]/g, '') + '}'
    : '\\text{Đáp số: } ' + soTex;
  var dsCanhDA = [];
  kb.canh.forEach(function (c, idx) {
    if (c && /dap_an|ket_qua/i.test(String(c.loai || ''))) dsCanhDA.push({c: c, idx: idx});
  });
  if (!dsCanhDA.length) {
    var i0 = timCanhDapAn_(kb);
    if (kb.canh[i0]) dsCanhDA.push({c: kb.canh[i0], idx: i0});
  }
  var daSua = false;
  dsCanhDA.forEach(function (item) {
    var c = item.c;
    if (!Array.isArray(c.noi_dung_man_hinh)) c.noi_dung_man_hinh = c.noi_dung_man_hinh ? [String(c.noi_dung_man_hinh)] : [];
    var daCo = c.noi_dung_man_hinh.some(function (line) { return chuaDapSoChinhXac_(line, dapAnNorm) && !LA_RE_.test(String(line || '').toLowerCase()); });
    if (!daCo) {
      c.noi_dung_man_hinh = c.noi_dung_man_hinh.slice(0, 3).concat([dongBoSung]);
      daSua = true;
    }
  });
  // Đồng bộ vào thẻ bước khung4tang tương ứng với cảnh đáp án (hoặc bước cuối) để Remotion Khung4Tang chắc chắn hiện đáp số
  var k4 = kb.khung4tang;
  if (k4 && Array.isArray(k4.buoc) && k4.buoc.length) {
    var soCanhDA = dsCanhDA.map(function (x) { return Number(x.c.so || x.idx + 1); });
    var bChon = null;
    k4.buoc.forEach(function (b) { if (b && soCanhDA.indexOf(Number(b.canh)) >= 0) bChon = b; });
    if (!bChon) bChon = k4.buoc[k4.buoc.length - 1];
    if (bChon && typeof bChon === 'object') {
      if (!Array.isArray(bChon.the)) bChon.the = [];
      var coTrenThe = bChon.the.some(function (th) {
        if (!th || typeof th !== 'object') return false;
        if (chuaDapSoChinhXac_(th.noi_dung, dapAnNorm)) return true;
        return Array.isArray(th.dong) && th.dong.some(function (d) { return chuaDapSoChinhXac_(d, dapAnNorm); });
      });
      if (!coTrenThe) {
        bChon.the.push({loai: 'cong_thuc', dong: [dongBoSung]});
        daSua = true;
      }
    }
  }
  return daSua;
}
// Bản suaDapAn_ cho đáp số: dòng cuối cảnh đáp án phải chứa đáp số chính xác, lời thoại phải đọc đúng số.
function suaDapSo_(kb, dapAn) {
  var dapAnNorm = String(dapAn).trim().replace(',', '.');
  var c = kb.canh[timCanhDapAn_(kb)];
  c.loai = 'dap_an';
  dongBoDapSoCanhDapAn_(kb, dapAnNorm);
  var noi = String(c.loi_thoai || '').toLowerCase();
  var docSo = docDapSo_(dapAnNorm);
  var coSo = noi.indexOf(docSo) >= 0 || chuaDapSoChinhXac_(noi, dapAnNorm);
  if (!coSo || LA_RE_.test(noi)) c.loi_thoai = String(c.loi_thoai && !LA_RE_.test(noi) ? c.loi_thoai.replace(/\s*$/, ' ') : '') + 'Vậy đáp số là ' + docSo + '.';
  kb.dap_an_cuoi = String(dapAnNorm);
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
function catTu_(t, n) { if (/[\\{}^_$]/.test(t)) return String(t); var w = String(t || '').replace(/\s+/g, ' ').trim().split(' '); return w.slice(0, n).join(' ').replace(/[,;:]+$/, ''); }
// Rút gọn còn tối đa n từ nhưng cắt ở ranh giới ý (dấu phẩy, chấm phẩy, hai chấm, gạch) để không đứt giữa cụm từ.
function rutGon_(t, n) {
  if (/[\\{}^_$]/.test(t)) return String(t);
  var w = String(t || '').replace(/\s+/g, ' ').trim().split(' ');
  if (w.length <= n) return w.join(' ');
  var dau = w.slice(0, n);
  for (var k = dau.length - 1; k >= 2; k--) if (/[,;:–—-]$/.test(dau[k])) return dau.slice(0, k + 1).join(' ').replace(/[,;:–—-]+$/, '');
  return dau.join(' ').replace(/[,;:]+$/, '') + '…';
}

function suaChinhTaTiengViet_(s) {
  s = String(s || '');
  if (!s) return s;
  return s
    .replace(/\bxác\s+xuất\b/gi, function (m) { return m.charAt(0) === 'X' ? 'Xác suất' : 'xác suất'; })
    .replace(/\bgiả\s+thuyết\b/gi, function (m) { return m.charAt(0) === 'G' ? 'Giả thiết' : 'giả thiết'; })
    .replace(/\bhình\s+chiêu\b/gi, function (m) { return m.charAt(0) === 'H' ? 'Hình chiếu' : 'hình chiếu'; })
    .replace(/\bđường\s+thăng\b/gi, function (m) { return m.charAt(0) === 'Đ' ? 'Đường thẳng' : 'đường thẳng'; })
    .replace(/\btỉ\s+xuất\b/gi, function (m) { return m.charAt(0) === 'T' ? 'Tỉ suất' : 'tỉ suất'; })
    .replace(/\bnăng\s+xuất\b/gi, function (m) { return m.charAt(0) === 'N' ? 'Năng suất' : 'năng suất'; })
    .replace(/\bkhối\s+chốp\b/gi, function (m) { return m.charAt(0) === 'K' ? 'Khối chóp' : 'khối chóp'; })
    .replace(/\bhình\s+chốp\b/gi, function (m) { return m.charAt(0) === 'H' ? 'Hình chóp' : 'hình chóp'; })
    .replace(/\bvuông\s+gốc\b/gi, function (m) { return m.charAt(0) === 'V' ? 'Vuông góc' : 'vuông góc'; })
    .replace(/\s+/g, ' ').trim();
}

// Đọc ký hiệu toán trong LỜI THOẠI thành chữ (giọng đọc không đọc được LaTeX): \frac{1}{3} -> "1 phần 3", x^2 -> "x bình phương".
function docLatexThanhLoi_(s) {
  s = String(s || '');
  if (!/[\\$^_]/.test(s)) return s;
  var cu;
  s = s.replace(/\$/g, '');
  do {
    cu = s;
    s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, ' $1 phần $2 ')
      .replace(/\\binom\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, ' C $2 của $1 ')
      .replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]*)\}/g, ' căn bậc $1 của $2 ')
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, ' căn bậc hai của $1 ')
      .replace(/\\(?:text|mathrm|textbf|textit|mathbf)\s*\{([^{}]*)\}/g, ' $1 ')
      .replace(/\\widehat\s*\{([^{}]*)\}/g, ' góc $1 ');
  } while (s !== cu);
  s = s.replace(/\\(cdot|times)\b/g, ' nhân ').replace(/\\div\b/g, ' chia ').replace(/\\pm\b/g, ' cộng trừ ')
    .replace(/\\(leq|le)\b/g, ' nhỏ hơn hoặc bằng ').replace(/\\(geq|ge)\b/g, ' lớn hơn hoặc bằng ')
    .replace(/\\(neq|ne)\b/g, ' khác ').replace(/\\approx\b/g, ' xấp xỉ ').replace(/\\equiv\b/g, ' đồng dư ')
    .replace(/\\perp\b/g, ' vuông góc với ').replace(/\\parallel\b/g, ' song song với ')
    .replace(/\\angle\b/g, ' góc ').replace(/\\(triangle|Delta)\b/g, ' tam giác ')
    .replace(/\^\s*\{?\\(circ|degree)\}?/g, ' độ ').replace(/\\(circ|degree)\b/g, ' độ ')
    .replace(/\\pi\b/g, ' pi ').replace(/\\alpha\b/g, ' alpha ').replace(/\\beta\b/g, ' beta ').replace(/\\gamma\b/g, ' gamma ')
    .replace(/\\(Omega|omega)\b/g, ' không gian mẫu ').replace(/\\infty\b/g, ' vô cùng ')
    .replace(/\\(Rightarrow|implies|rightarrow|to)\b/g, ' suy ra ').replace(/\\(Leftrightarrow|iff)\b/g, ' tương đương ')
    .replace(/\\(sim|cong)\b/g, ' đồng dạng với ').replace(/\\in\b/g, ' thuộc ')
    .replace(/\^\s*\{?2\}?(?![0-9])/g, ' bình phương ').replace(/\^\s*\{?3\}?(?![0-9])/g, ' lập phương ')
    .replace(/\^\s*\{([^{}]*)\}/g, ' mũ $1 ').replace(/\^\s*([A-Za-z0-9]+)/g, ' mũ $1 ')
    .replace(/_\s*\{([^{}]*)\}/g, ' $1 ').replace(/_\s*([A-Za-z0-9]+)/g, ' $1 ')
    .replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}\\]/g, ' ');
  return s.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
}

// Tiêu đề cảnh lấy từ ý đầu của lời thoại (khi AI quên viết).
function tieuDeTuLoi_(t) {
  var y = String(t || '').split(/[.!?,:;]/)[0];
  var td = catTu_(y, 7).replace(/^(và|nhưng|vậy|thì|rồi)\s+/i, '');
  return hoaDau_(td.length >= 6 ? td : catTu_(t, 6));
}

var LENH_KATEX_HOP_LE_ = {
  cdot: 1, times: 1, div: 1, pm: 1, mp: 1, le: 1, leq: 1, ge: 1, geq: 1, ne: 1, neq: 1, approx: 1, equiv: 1,
  infty: 1, pi: 1, alpha: 1, beta: 1, gamma: 1, delta: 1, Delta: 1, theta: 1, lambda: 1, mu: 1, sigma: 1, Sigma: 1,
  omega: 1, Omega: 1, varphi: 1, phi: 1, cap: 1, cup: 1, in: 1, notin: 1, subset: 1, emptyset: 1, varnothing: 1,
  Rightarrow: 1, rightarrow: 1, to: 1, Leftrightarrow: 1, iff: 1, Longrightarrow: 1, implies: 1,
  angle: 1, circ: 1, degree: 1, perp: 1, parallel: 1, ldots: 1, cdots: 1, dots: 1, vdots: 1, sum: 1, prod: 1,
  triangle: 1, sim: 1, cong: 1, percent: 1, quad: 1, qquad: 1, mid: 1, not: 1, nmid: 1,
  sin: 1, cos: 1, tan: 1, cot: 1, log: 1, ln: 1, lg: 1, max: 1, min: 1, lim: 1, exp: 1, det: 1, mod: 1, gcd: 1,
  frac: 1, dfrac: 1, tfrac: 1, binom: 1, dbinom: 1, tbinom: 1, sqrt: 1, overline: 1, bar: 1, widehat: 1, vec: 1, overrightarrow: 1,
  text: 1, textrm: 1, textbf: 1, textit: 1, mathrm: 1, mathbf: 1, mathit: 1, boldsymbol: 1, operatorname: 1, mbox: 1,
  color: 1, textcolor: 1, colorbox: 1, hl: 1, mvang: 1, mdo: 1, mngoc: 1, mcam: 1, mla: 1,
  left: 1, right: 1, displaystyle: 1, limits: 1, begin: 1, end: 1, big: 1, Big: 1, bigg: 1, Bigg: 1,
  setminus: 1, forall: 1, exists: 1, dpcm: 1
};

// Kiểm tra cân bằng {} và cú pháp lệnh TeX (chặn lệnh cụt như \te, \co, thiếu ngoặc/đối số)
function kiemTraTexHopLe_(s) {
  s = String(s == null ? '' : s).trim();
  if (!s) return { ok: true };
  if (/\$/.test(s)) return { ok: false, ma: 'TEX_CO_DAU_DO_LA' };
  if (/\\\\[a-zA-Z]/.test(s)) return { ok: false, ma: 'TEX_GACH_CHEO_KEP' };
  if (/\\$/.test(s)) return { ok: false, ma: 'TEX_LENH_CUT' };
  var mo = 0;
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    if (ch === '\\' && i + 1 < s.length) { i++; continue; }
    if (ch === '{') mo++;
    else if (ch === '}') { if (--mo < 0) return { ok: false, ma: 'TEX_THIEU_NGOAC' }; }
  }
  if (mo !== 0) return { ok: false, ma: 'TEX_THIEU_NGOAC' };
  if (/\\(?:text|textrm|textbf|textit|mathrm|mathbf|overline|bar|sqrt|color|[dt]?frac|[dt]?binom)\s*(?:\{\s*\}|$)/.test(s) ||
      /\\(?:[dt]?frac|[dt]?binom|textcolor)\s*\{[^{}]*\}\s*(?:$|[^\{\s])/.test(s)) {
    return { ok: false, ma: 'TEX_THIEU_DOI_SO' };
  }
  var m, reCmd = /\\([A-Za-z]+)/g;
  while ((m = reCmd.exec(s))) {
    if (!LENH_KATEX_HOP_LE_[m[1]]) return { ok: false, ma: 'TEX_LENH_CUT' };
  }
  return { ok: true };
}

// Đồng bộ tất định (.gs <-> Python <-> TS): bóc sạch \text{}, {\color{...}...}, \textcolor{}{}, \textbf{} -> chữ tiếng Việt sạch
// + đổi ký hiệu toán cơ bản sang Unicode (S₀, u₁, x², √3, 1/3), bỏ lệnh TeX cụt/lạ.
function bocTexSangChu_(s) {
  var x = String(s == null ? '' : s)
    .replace(/\\not\s*\\vdots|\\nmid|∤|\\not\s*⋮|(^|[^\wÀ-ỹ])not\s*⋮/g, function (all, p1) { return (typeof p1 === 'string' ? p1 : '') + 'không ⋮ '; })
    .replace(/\$/g, '')
    .replace(/\\\(|\\\)|\\\[|\\\]/g, ' ')
    .replace(/\\\\(?=[A-Za-z])/g, '\\');
  var TREN = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ', k: 'ᵏ', x: 'ˣ'};
  var DUOI = {'0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ'};
  var MACRON = {A: 'Ā', E: 'Ē', I: 'Ī', O: 'Ō', U: 'Ū', a: 'ā', e: 'ē', i: 'ī', o: 'ō', u: 'ū'};
  var doi = function (a, bang) { return a.split('').map(function (c) { return bang[c] || c; }).join(''); };
  for (var lan = 0; lan < 6; lan++) {
    var x0 = x;
    x = x.replace(/\\textcolor\s*\{[^{}]*\}\s*\{([^{}]*)\}/g, '$1')
      .replace(/\{\s*\\color\s*\{[^{}]*\}\s*([^{}]*)\}/g, '$1')
      .replace(/\\color\s*\{[^{}]*\}/g, '')
      .replace(/\\(?:overline|bar)\s*\{\s*([A-Za-z])\s*\}/g, function (_, c) { return MACRON[c] || c + '\u0304'; })
      .replace(/\\(?:overline|bar)\s*\{([^{}]*)\}/g, function (_, a) { return a.split('').map(function (c) { return c + '\u0304'; }).join(''); })
      .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, function (_, a, b) {
        return (/^[\w.,]+$/.test(a) ? a : '(' + a + ')') + '/' + (/^[\w.,]+$/.test(b) ? b : '(' + b + ')');
      })
      .replace(/\\[dt]?binom\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, 'C($1,$2)')
      .replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, function (_, n, a) { return doi(n, TREN) + '√' + (a.length > 1 ? '(' + a + ')' : a); })
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, function (_, a) { return '√' + (a.length > 1 ? '(' + a + ')' : a); })
      .replace(/\\(?:text|textrm|mathrm|mathbf|textbf|textit|operatorname|mathit|boldsymbol|mbox|hl)\s*\{([^{}]*)\}/g, '$1');
    if (x === x0) break;
  }
  x = x.replace(/_\{([0-9+\-=()aehijklmnoprstuvx]+)\}|_([0-9aehijklmnoprstuvx])(?![A-Za-z])/g, function (_, a, b) { return doi(a || b, DUOI); })
    .replace(/\^\{([0-9+\-=()nikx]+)\}|\^([0-9nikx])(?![A-Za-z])/g, function (_, a, b) { return doi(a || b, TREN); })
    .replace(/\\(?:left|right|displaystyle|limits)\b/g, '')
    .replace(/\\[,;:!> ]/g, ' ').replace(/\\%/g, '%');
  var L = {
    cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', equiv: '≡',
    Omega: 'Ω', omega: 'ω', cap: '∩', cup: '∪', in: '∈', notin: '∉', subset: '⊂', pi: 'π', vdots: '⋮',
    Rightarrow: '⇒', rightarrow: '→', to: '→', Leftrightarrow: '⇔', iff: '⇔', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ',
    theta: 'θ', lambda: 'λ', mu: 'μ', sigma: 'σ', Sigma: 'Σ', varphi: 'φ', phi: 'φ', infty: '∞', emptyset: '∅', varnothing: '∅',
    angle: '∠', circ: '°', degree: '°', perp: '⊥', parallel: '∥', triangle: '△', ldots: '…', cdots: '⋯', dots: '…', mid: '|', sim: '~',
    quad: ' ', qquad: ' ', sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', log: 'log', ln: 'ln', lg: 'lg', max: 'max', min: 'min', lim: 'lim'
  };
  x = x.replace(/\\([A-Za-z]+)/g, function (_, t) { return L[t] !== undefined ? L[t] : ''; })
    .replace(/(^|[^A-Za-z\\])Omega(?![A-Za-z])/g, '$1Ω');
  return x.replace(/\{,\}/g, ',').replace(/[{}\\]/g, '').replace(/\s+/g, ' ').trim();
}

// Cắt văn bản thường theo biên từ — CẤM cắt ngang giữa lệnh \command hoặc giữa cặp ngoặc {...} / (...)
function catTheoTu_(s, max) {
  var x = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (!max || x.length <= max) return x;
  var tu = x.split(' '), ra = '';
  for (var i = 0; i < tu.length; i++) {
    var thu = ra ? ra + ' ' + tu[i] : tu[i];
    if (thu.length > max) {
      if (!ra) { ra = tu[i]; break; }
      break;
    }
    ra = thu;
  }
  // Không để hở cặp ngoặc { } hoặc ( ) hoặc lệnh \ bị cắt cụt ở cuối
  var moNgoac = function (ch, a, b) {
    var d = 0;
    for (var k = 0; k < ch.length; k++) {
      if (ch.charAt(k) === '\\' && k + 1 < ch.length) { k++; continue; }
      if (ch.charAt(k) === a) d++;
      else if (ch.charAt(k) === b && d > 0) d--;
    }
    return d;
  };
  ra = ra.replace(/\\[A-Za-z]*\s*$/, '').trim();
  while (ra && (moNgoac(ra, '{', '}') > 0 || moNgoac(ra, '(', ')') > 0)) {
    var idxMo = Math.max(
      moNgoac(ra, '{', '}') > 0 ? ra.lastIndexOf('{') : -1,
      moNgoac(ra, '(', ')') > 0 ? ra.lastIndexOf('(') : -1
    );
    if (idxMo <= 0) break;
    ra = ra.slice(0, idxMo).replace(/\\[A-Za-z]*\s*$/, '').trim();
  }
  return ra.replace(/[\s,.;:·–-]+$/, '') || tu[0];
}

// Bộ tiền xử lý vá lỗi TeX thuần code chạy TRƯỚC bước kiểm duyệt TEX_LENH_CUT:
//  - Cân bằng ngoặc { } cho các lệnh phổ biến (\text{, \textbf{, \mathrm{, \overline{...)
//  - Xóa/dọn các đuôi lệnh bị cắt vỡ ở cuối chuỗi (\te, \text{ rỗng, cụm vỡ |\color{#...}...)
//  - Nếu bên trong \text{...} chỉ chứa câu chữ tiếng Việt thuần không có toán phức tạp -> bóc vỏ \text{} để không bao giờ lộ mã thô.
function suaCuPhapTex_(s) {
  if (typeof s !== 'string') return s;
  var t = suaChinhTaTiengViet_(s.replace(/\$/g, '').replace(/\\\\([a-zA-Z]+)/g, '\\$1'));
  // 1) Dọn cụm vỡ kiểu "|\color{#FACC15}t|\te" hoặc "\color{#...}" cắt dở ở cuối
  t = t.replace(/\|\s*\\color\s*\{#[0-9A-Fa-f]{3,8}\}\s*([^|{}\\]*?)\|\s*(?:\\[A-Za-z]*)?$/g, function (_, noi) {
    var sach = String(noi || '').trim();
    return sach ? ' | ' + sach : '';
  });
  t = t.replace(/\|\s*\\color\s*\{#[0-9A-Fa-f]{3,8}\}\s*([^|{}\\]*?)(?=\||$)/g, function (_, noi) {
    var sach = String(noi || '').trim();
    return sach ? ' | ' + sach : '';
  });
  t = t.replace(/\\color\s*\{[^}]*$/g, '').trim();
  // 2) Gỡ lệnh TeX cắt cụt ở cuối chuỗi (vd "\te", "\co", "\") hoặc kèm dấu "|" treo ngay trước
  for (var vong = 0; vong < 3; vong++) {
    var t0 = t;
    t = t.replace(/(\|?)\s*\\([A-Za-z]+)\s*$/, function (all, ong, ten) {
      return LENH_KATEX_HOP_LE_[ten] ? all : '';
    }).replace(/\|?\s*\\\s*$/, '').trim();
    // Lệnh mở ngoặc rỗng bị cắt cụt ở cuối: "2\text{", "\textbf{", "\mathrm{", "\overline{", "\frac{"
    t = t.replace(/\\(?:text|textrm|textbf|textit|mathrm|mathbf|overline|bar|sqrt|color|textcolor|[dt]?frac|[dt]?binom)\s*\{\s*$/g, '').trim();
    // Lệnh 2 đối số bị cắt thiếu đối số 2 ở cuối: "\textcolor{#...}" -> xóa, "\frac{a}" -> giữ "a"
    t = t.replace(/\\textcolor\s*\{[^{}]*\}\s*$/g, '').trim();
    t = t.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*$/g, '$1').trim();
    if (t === t0) break;
  }
  // 3) Cân bằng dấu { / }
  var mo = 0, out = '';
  for (var idx = 0; idx < t.length; idx++) {
    var ch = t.charAt(idx);
    if (ch === '\\' && idx + 1 < t.length) { out += ch + t.charAt(++idx); continue; }
    if (ch === '{') { mo++; out += ch; }
    else if (ch === '}') { if (mo > 0) { mo--; out += ch; } }
    else out += ch;
  }
  while (mo > 0) { out += '}'; mo--; }
  // 4) Xóa các vỏ lệnh rỗng sau khi đóng ngoặc
  out = out.replace(/\\(?:text|textrm|textbf|textit|mathrm|mathbf|overline|bar|sqrt|color)\s*\{\s*\}/g, '').replace(/\s+/g, ' ').trim();
  // 5) Xóa mọi lệnh lạ/cắt cụt không nằm trong danh sách lệnh KaTeX hợp lệ
  out = out.replace(/\\([A-Za-z]+)/g, function (all, ten) { return LENH_KATEX_HOP_LE_[ten] ? all : ''; }).replace(/\s+/g, ' ').trim();
  // 6) Nếu bóc vỏ \text{...} (chỉ chứa câu chữ thuần) mà phần còn lại KHÔNG có toán phức tạp (\, ^, _, {, }) -> bóc vỏ để không lộ mã thô
  if (/\\(?:text|textrm|textbf)\s*\{/.test(out)) {
    var thuBoc = out.replace(/\\(?:text|textrm|textbf)\s*\{([^{}\\]*)\}/g, '$1').replace(/\s+/g, ' ').trim();
    if (!/[\\^_{}]/.test(thuBoc)) out = thuBoc;
  }
  return out;
}

// Tiền xử lý vá TeX trên toàn bộ các trường hiển thị/KaTeX của kịch bản TRƯỚC khi kiểm duyệt TEX_LENH_CUT
function vaCuPhapTexKb_(kb) {
  if (!kb || typeof kb !== 'object') return kb;
  var sua = function (o, k) { if (o && typeof o[k] === 'string' && /[\\{}^_$]/.test(o[k])) o[k] = suaCuPhapTex_(o[k]); };
  var suaMang = function (arr) { return Array.isArray(arr) ? arr.map(function (x) { return typeof x === 'string' && /[\\{}^_$]/.test(x) ? suaCuPhapTex_(x) : x; }) : arr; };
  (kb.canh || []).forEach(function (c) {
    if (!c || typeof c !== 'object') return;
    sua(c, 'tieu_de_canh');
    c.noi_dung_man_hinh = suaMang(c.noi_dung_man_hinh);
    c.chu_thich = suaMang(c.chu_thich);
    var du = c.minh_hoa && c.minh_hoa.du_lieu;
    if (du && Array.isArray(du.vat)) du.vat.forEach(function (v) {
      if (!v) return;
      sua(v, 'noi_dung'); sua(v, 'nhan');
      v.ds = suaMang(v.ds);
      if (Array.isArray(v.hinh)) v.hinh.forEach(function (h) { if (h) { sua(h, 'noi_dung'); sua(h, 'nhan'); } });
    });
  });
  kb.de_cho = suaMang(kb.de_cho);
  sua(kb, 'can_tim');
  (kb.tom_tat_3_buoc || []).forEach(function (d) { if (d && typeof d === 'object') { sua(d, 'chien_thuat'); sua(d, 'cong_thuc'); } });
  var k4 = kb.khung4tang || {};
  (k4.de_ghim || []).forEach(function (d) { if (d) sua(d, 'nhan'); });
  (k4.buoc || []).forEach(function (b) {
    if (!b) return;
    sua(b, 'nhan'); sua(b, 'tieu_de');
    (b.the || []).forEach(function (th) {
      if (!th) return;
      sua(th, 'nhan'); sua(th, 'noi_dung');
      th.dong = suaMang(th.dong);
    });
  });
  var sk = k4.san_khau && k4.san_khau.tham_so;
  if (sk && typeof sk === 'object') {
    ['nhan_bien', 'nhan_ham', 'don_vi'].forEach(function (k) { sua(sk, k); });
    if (sk.nhan && typeof sk.nhan === 'object') Object.keys(sk.nhan).forEach(function (k) { sua(sk.nhan, k); });
    (Array.isArray(sk.nhom) ? sk.nhom : []).forEach(function (g) { if (g) sua(g, 'nhan'); });
  }
  return kb;
}

// Giới hạn độ dài phần chữ theo biên từ; giữ trọn công thức KaTeX hợp lệ, nếu mã TeX bị cụt/hỏng thì tự vá trước, vẫn lỗi mới bóc sang Unicode sạch trước khi cắt.
function catGonTex_(s, n) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (/[\\{}^_$]/.test(s)) {
    var daVa = suaCuPhapTex_(s);
    if (!/[\\{}^_$]/.test(daVa)) return catTheoTu_(daVa, n);
    return kiemTraTexHopLe_(daVa).ok ? daVa : catTheoTu_(bocTexSangChu_(daVa), n);
  }
  return catTheoTu_(s, n);
}

// Nhận diện đề bài xác suất về TẤM THẺ / THẺ ĐÁNH SỐ (không phải viên bi)
function laDeTamThe_(de) {
  var s = String(de || '').toLowerCase();
  return /(tấm\s+thẻ|chiếc\s+thẻ|thẻ\s+đánh\s+số|thẻ\s+mang\s+số|thẻ\s+số|rút\s+.*thẻ|chọn\s+.*thẻ|bốc\s+.*thẻ|tấm\s+phiếu|lá\s+phiếu)/.test(s) &&
    !/(viên\s+bi|quả\s+cầu|hộp\s+bi|túi\s+bi|quả\s+bóng)/.test(s);
}
function danhSachTheTuDe_(de) {
  var s = String(de || '');
  var mTuDen = /từ\s*(\d+)\s*đến\s*(\d+)/i.exec(s);
  if (mTuDen) {
    var a = Number(mTuDen[1]), b = Number(mTuDen[2]);
    if (b > a && b - a + 1 <= 12) {
      var ds = [];
      for (var k = a; k <= b; k++) ds.push(String(k));
      return { n: ds.length, ds: ds, nhan: ds.length + ' tấm thẻ (' + a + ' → ' + b + ')' };
    } else if (b > a) {
      return { n: 7, ds: [String(a), String(a + 1), String(a + 2), '…', String(b - 1), String(b)], nhan: (b - a + 1) + ' tấm thẻ (' + a + ' → ' + b + ')' };
    }
  }
  var mSo = /(\d+)\s*(?:tấm\s+|chiếc\s+)?thẻ/i.exec(s);
  var n0 = mSo ? Math.min(12, Math.max(3, Number(mSo[1]))) : 9;
  var ds0 = [];
  for (var j = 1; j <= n0; j++) ds0.push(String(j));
  return { n: n0, ds: ds0, nhan: (mSo ? mSo[1] : n0) + ' tấm thẻ (1 → ' + (mSo ? mSo[1] : n0) + ')' };
}
function taoVatXacSuatTheoDe_(de, idx) {
  var s = String(de || '').toLowerCase();
  if (laDeTamThe_(s)) {
    var tt = danhSachTheTuDe_(de);
    return { id: 'the_de_' + idx, loai: 'the', x: 50, y: 36, co: 0.92, buoc: 1, so_luong: tt.n, ds: tt.ds, mau: 'cam', nhan: tt.nhan };
  }
  if (/lá\s+bài|bộ\s+bài|rút\s+bài|tú\s+lơ\s+khơ/.test(s)) {
    return { id: 'bai_de_' + idx, loai: 'the_bai', x: 50, y: 42, buoc: 1, so_luong: 4, ds: ['A♥', 'K♠', 'Q♦', 'J♣'], nhan: 'Bộ bài 52 lá' };
  }
  if (/xúc\s+xắc|súc\s+sắc/.test(s)) {
    return { id: 'xx_de_' + idx, loai: 'xuc_xac', x: 50, y: 42, buoc: 1, so_luong: /hai|2/.test(s) ? 2 : 1, ket_qua: [3, 5], nhan: 'Gieo xúc xắc' };
  }
  if (/đồng\s+xu|đồng\s+tiền/.test(s)) {
    return { id: 'xu_de_' + idx, loai: 'dong_xu', x: 50, y: 42, buoc: 1, so_luong: /ba|3/.test(s) ? 3 : 2, ds: ['S', 'N', 'S'], nhan: 'Tung đồng xu' };
  }
  if (/bàn\s+tròn|xếp\s+vòng\s+tròn|ngồi\s+quanh/.test(s)) {
    return { id: 'bt_de_' + idx, loai: 'ban_tron', x: 50, y: 44, buoc: 1, ds: ['A', 'B', 'C', 'D', 'E', 'F'], noi_dung: 'Bàn tròn' };
  }
  if (/vòng\s+quay|quay\s+số/.test(s)) {
    return { id: 'vq_de_' + idx, loai: 'vong_quay', x: 50, y: 44, buoc: 1, ds: ['1', '2', '3', '4', '5', '6'], ket_qua: [2], nhan: 'Vòng quay' };
  }
  // v102.1: CHỈ dùng hop_bi khi đề thật sự có bi / bóng / quả cầu / hộp-túi bốc thăm; đề khác (trạm phát tín hiệu, học sinh,
  // mạch điện, máy...) -> mảnh minh họa toán học TRUNG TÍNH (biểu đồ thanh xác suất từng đối tượng) luôn đúng ngữ nghĩa.
  if (laDeCoBi_(s)) return { id: 'xs_de_' + idx, loai: 'hop_bi', x: 50, y: 48, buoc: 1, nhom: [{ mau: 'do', so: 4 }, { mau: 'xanh_duong', so: 5 }] };
  return vatTrungTinhXacSuat_(de, idx);
}
function laDeCoBi_(s) {
  return /\bbi\b|viên\s+bi|quả\s+bóng|quả\s+cầu|bóng\s+(?:màu|đỏ|xanh|vàng|trắng|đen)|bốc\s+thăm|(?:hộp|túi|bình)\s+(?:kín\s+)?(?:đựng|chứa)\s+(?:\d+\s+)?(?:viên|quả|bi|bóng)/i.test(String(s || ''));
}
// Biểu đồ thanh trung tính: mỗi đối tượng được đặt tên (A, B, C...) một cột xác suất lấy từ đề; không có tên -> biến cố A / Ā.
function vatTrungTinhXacSuat_(de, idx) {
  var goc = String(de || '');
  var ten = [];
  (goc.match(/(?:^|[\s,;(])([A-Z])(?=[\s,;.)]|$)/g) || []).forEach(function (m) { var t = m.replace(/[^A-Z]/g, ''); if (t && ten.indexOf(t) < 0 && ten.length < 5) ten.push(t); });
  var p = (goc.match(/0[.,]\d+|\d{1,2}(?:[.,]\d+)?\s*%/g) || []).map(function (x) {
    var v = Number(String(x).replace('%', '').replace(',', '.').trim());
    return /%/.test(x) ? v : v * 100;
  }).filter(function (v) { return v > 0 && v <= 100; });
  var loaiDT = (/trạm|tín hiệu|phát sóng/i.exec(goc) || /máy|thiết bị|linh kiện|bóng đèn|công tắc|mạch/i.exec(goc) || /học sinh|người|bạn|xạ thủ|cầu thủ|vận động viên/i.exec(goc) || [''])[0];
  if (ten.length >= 2) {
    return { id: 'xs_de_' + idx, loai: 'bieu_do_cot', x: 50, y: 46, co: 0.86, buoc: 1, ds: ten,
      ds_so: ten.map(function (_, k) { return Math.round(p.length ? p[Math.min(k, p.length - 1)] : 50); }),
      nhan: 'Xác suất từng ' + (loaiDT ? loaiDT.toLowerCase() : 'đối tượng') };
  }
  var pA = Math.round(p.length ? p[0] : 50);
  return { id: 'xs_de_' + idx, loai: 'bieu_do_cot', x: 50, y: 46, co: 0.86, buoc: 1, ds: ['A', 'Ā'], ds_so: [pA, Math.max(0, 100 - pA)], nhan: 'Bảng đếm biến cố' };
}

// 1) Đề nói về TẤM THẺ mà cảnh vẽ HỘP BI (hop_bi/tui) -> tự động đổi sang các tấm thẻ đánh số (the)
function tuSuaVatDungDeXacSuat_(kb, deGoc) {
  var sua = [];
  var de = String(deGoc || kb.de_bai || (Array.isArray(kb.de_cho) ? kb.de_cho.join(' ') : '') + ' ' + (kb.tieu_de || ''));
  if (!laDeTamThe_(de)) return sua;
  var tt = danhSachTheTuDe_(de);
  (kb.canh || []).forEach(function (c, i) {
    var du = c && c.minh_hoa && c.minh_hoa.loai === 'san_khau' && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat)) return;
    var idDoi = {};
    du.vat.forEach(function (v) {
      if (!v || (v.loai !== 'hop_bi' && v.loai !== 'tui')) return;
      idDoi[v.id] = true;
      v.loai = 'the';
      v.so_luong = tt.n;
      v.ds = tt.ds.slice();
      v.mau = v.mau || 'cam';
      v.nhan = tt.nhan;
      if (Number(v.y) > 44) v.y = 34;
      v.co = Math.min(Number(v.co) || 0.9, 0.92);
      delete v.nhom;
      sua.push('cảnh ' + (i + 1) + ': đề bài tấm thẻ -> đổi hop_bi thành ' + tt.n + ' tấm thẻ đánh số');
    });
    if (Object.keys(idDoi).length && Array.isArray(du.hanh_dong)) {
      du.hanh_dong.forEach(function (h) {
        if (h && idDoi[h.vat] && h.kieu === 'lay_ra') {
          h.kieu = 'chon';
          h.chi_so = [1, 2, 3];
          h.mau = h.mau || 'xanh_la';
        }
      });
    }
  });
  return sua;
}

// 2) Bỏ lưới 4x4 trống vô nghĩa (luoi_o không có ds) khi tính Không gian mẫu n(Ω): đổi thành thẻ giai đoạn Quy tắc nhân + Bộ đếm công-tơ-mét
function tuSuaKhongGianMauLuoiO_(kb, deGoc) {
  var sua = [];
  var de = String(deGoc || kb.de_bai || '').toLowerCase();
  (kb.canh || []).forEach(function (c, i) {
    var du = c && c.minh_hoa && c.minh_hoa.loai === 'san_khau' && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat)) return;
    var ctChu = (c.noi_dung_man_hinh || []).join(' ');
    var loi = String(c.loi_thoai || '') + ' ' + String(c.tieu_de_canh || '');
    for (var k = 0; k < du.vat.length; k++) {
      var v = du.vat[k];
      if (!v || v.loai !== 'luoi_o') continue;
      var coDs = Array.isArray(v.ds) && v.ds.some(function (x) { return String(x || '').trim() !== ''; });
      if (coDs) continue;
      var n = Number(v.so_luong) || 16;
      // Nếu là tung 2 đồng xu (4 ô), 3 đồng xu (8 ô), 2 xúc xắc (36 ô) -> điền nhãn kết quả thật vào từng ô
      if (n === 4 && /xu|đồng tiền|sấp|ngửa/.test(de + ' ' + loi.toLowerCase())) {
        v.ds = ['SS', 'SN', 'NS', 'NN'];
        sua.push('cảnh ' + (i + 1) + ': điền nhãn SS, SN, NS, NN cho lưới không gian mẫu');
        continue;
      }
      if (n === 8 && /xu|đồng tiền|sấp|ngửa/.test(de + ' ' + loi.toLowerCase())) {
        v.ds = ['SSS', 'SSN', 'SNS', 'SNN', 'NSS', 'NSN', 'NNS', 'NNN'];
        sua.push('cảnh ' + (i + 1) + ': điền 8 kết quả tung 3 đồng xu cho lưới');
        continue;
      }
      if (n === 36 && /xúc xắc|súc sắc/.test(de + ' ' + loi.toLowerCase())) {
        var dsXX = [];
        for (var r0 = 1; r0 <= 6; r0++) for (var c0 = 1; c0 <= 6; c0++) dsXX.push('(' + r0 + ',' + c0 + ')');
        v.ds = dsXX;
        v.so_cot = 6;
        sua.push('cảnh ' + (i + 1) + ': điền 36 cặp mặt xúc xắc (1,1)..(6,6) cho lưới không gian mẫu');
        continue;
      }
      // Còn lại: lưới 16 ô trống dùng cho Không gian mẫu lớn (vd n(Ω) = 64 × 32 = 2048 hoặc C_9^3) -> đổi sang thẻ các bước chọn + bộ đếm số cách
      var cacSo = (ctChu.replace(/\\[a-zA-Z]+/g, ' ').match(/\d+/g) || []).map(Number).filter(function (x) { return x > 1; });
      var dichSo = cacSo.length ? cacSo[cacSo.length - 1] : 0;
      var mTich = /(\d+)\s*(?:\\times|\\cdot|×|\*)\s*(\d+)\s*=\s*(\d+)/.exec(ctChu);
      var dsBuoc = [];
      if (mTich) {
        dsBuoc = ['Bước 1: ' + mTich[1] + ' cách', 'Bước 2: ' + mTich[2] + ' cách'];
        dichSo = Number(mTich[3]);
      } else if (Array.isArray(kb.du_kien) && kb.du_kien.length >= 2) {
        dsBuoc = kb.du_kien.slice(0, 3);
      } else {
        dsBuoc = ['Giai đoạn 1', 'Giai đoạn 2'];
      }
      var idGoc = v.id || ('kgm_' + (i + 1));
      du.vat[k] = {
        id: idGoc,
        loai: 'the',
        x: 50,
        y: dichSo > 0 ? 34 : 46,
        co: 0.92,
        buoc: 1,
        so_luong: dsBuoc.length,
        ds: dsBuoc,
        mau: 'xanh_duong',
        nhan: 'Các giai đoạn tạo Không gian mẫu Ω'
      };
      if (dichSo > 0 && !du.vat.some(function (o) { return o && o.loai === 'so_dem'; })) {
        du.vat.push({
          id: idGoc + '_dem',
          loai: 'so_dem',
          x: 50,
          y: 72,
          co: 0.88,
          buoc: 2,
          noi_dung: 'Tổng số kết quả n(Ω)',
          gia_tri: dichSo,
          nhan: 'cách chọn',
          kieu: 'vien',
          mau: 'vang'
        });
      }
      if (Array.isArray(du.hanh_dong)) {
        du.hanh_dong.forEach(function (h) {
          if (h && h.vat === idGoc && Array.isArray(h.chi_so)) {
            h.chi_so = dsBuoc.map(function (_, idx) { return idx + 1; });
          }
        });
      }
      sua.push('cảnh ' + (i + 1) + ': thay lưới 16 ô trống vô nghĩa bằng sơ đồ các bước chọn + bộ đếm Không gian mẫu');
    }
  });
  return sua;
}

// 3) Không đặt ẩn sẵn (2x, x, h) ở cảnh mo_dau / de_bai trước khi giải; chuyển bước đặt ẩn sang cảnh giải bài (mo_hinh_hoa / tinh_toan) kèm công thức đặt ẩn
function laNhanAnSoSom_(nhan, deGoc) {
  var s = String(nhan || '').trim();
  if (!s || /\?/.test(s)) return false;
  // Nếu chỉ là số kèm đơn vị (vd "36 m", "20 cm", "45°", "36 m^3") -> dữ kiện đề cho, giữ nguyên
  var boDonVi = s.replace(/\s*(m|cm|mm|km|dm|l|lít|kg|g|độ|°|\^\s*\{?\s*[23]\s*\}?|\\circ)\s*$/i, '').trim();
  if (/^-?\d+(?:[.,]\d+)?$/.test(boDonVi)) return false;
  // Kiểm tra có chứa biến đại số x, y, h, r (như "x", "2x", "3x", "h", "60 - 2x") mà đề bài gốc chưa hề định nghĩa tên biến đó
  var mBien = /(?:^|[^a-zA-ZÀ-ỹ])([xyhr])(?:[^a-zA-ZÀ-ỹ]|$)/.exec(boDonVi);
  if (!mBien) return false;
  var bien = mBien[1];
  var de = String(deGoc || '');
  var coTrongDe = new RegExp('(?:^|[\\s($,;])' + bien + '(?:[\\s)$.,;=<>+\\-^]|$)').test(de);
  return !coTrongDe;
}
function doiNhanSangDeBai_(dsNhan, loaiVat, laMoDau) {
  if (laMoDau) return dsNhan.map(function () { return ''; });
  if (loaiVat === 'khoi_hop' && dsNhan.length >= 3) {
    var a0 = String(dsNhan[0] || '').trim(), a1 = String(dsNhan[1] || '').trim(), a2 = String(dsNhan[2] || '').trim();
    var mGap0 = /^(\d+)\s*x$/i.exec(a0), mGap1 = /^(\d+)\s*x$/i.exec(a1);
    if (mGap0 && /^x$/i.test(a1)) return ['Dài = ' + mGap0[1] + ' Rộng', 'Rộng ?', laNhanAnSoSom_(a2, '') ? 'Cao ?' : a2];
    if (mGap1 && /^x$/i.test(a0)) return ['Rộng ?', 'Dài = ' + mGap1[1] + ' Rộng', laNhanAnSoSom_(a2, '') ? 'Cao ?' : a2];
    if (/^x$/i.test(a0) && /^x$/i.test(a1)) return ['Cạnh đáy ?', 'Cạnh đáy ?', laNhanAnSoSom_(a2, '') ? 'Cao ?' : a2];
    return [
      laNhanAnSoSom_(a0, '') ? 'Dài ?' : a0,
      laNhanAnSoSom_(a1, '') ? 'Rộng ?' : a1,
      laNhanAnSoSom_(a2, '') ? 'Cao ?' : a2
    ];
  }
  if ((loaiVat === 'tru' || loaiVat === 'non') && dsNhan.length >= 2) {
    return [
      laNhanAnSoSom_(dsNhan[0], '') ? 'Bán kính ?' : dsNhan[0],
      laNhanAnSoSom_(dsNhan[1], '') ? 'Cao ?' : dsNhan[1]
    ];
  }
  return dsNhan.map(function (nh) { return laNhanAnSoSom_(nh, '') ? '?' : nh; });
}
function tuSuaDatAnTheoBuoc_(kb, deGoc) {
  var sua = [];
  var de = String(deGoc || kb.de_bai || '');
  var mauVatAn = null;
  var nhanAnGoc = null;
  (kb.canh || []).forEach(function (c, i) {
    if (!c || !/^(mo_dau|hook|de_bai)$/i.test(String(c.loai || ''))) return;
    var laMoDau = /^(mo_dau|hook)$/i.test(String(c.loai || '')) || i === 0;
    var du = c.minh_hoa && c.minh_hoa.loai === 'san_khau' && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat)) return;
    du.vat.forEach(function (v) {
      if (!v) return;
      if (Array.isArray(v.nhan_kich_thuoc) && v.nhan_kich_thuoc.some(function (nh) { return laNhanAnSoSom_(nh, de); })) {
        if (!mauVatAn) {
          mauVatAn = JSON.parse(JSON.stringify(v));
          nhanAnGoc = v.nhan_kich_thuoc.slice();
        }
        v.nhan_kich_thuoc = doiNhanSangDeBai_(v.nhan_kich_thuoc, v.loai, laMoDau);
        sua.push('cảnh ' + (i + 1) + ' (' + c.loai + '): gỡ ẩn số đặt sớm (' + nhanAnGoc.join(', ') + ') khỏi ' + v.loai + ', chuyển sang bước giải');
      }
      if (v.loai === 'canh_that') {
        if (Array.isArray(v.vung)) v.vung.forEach(function (z) {
          if (z && Array.isArray(z.canh) && z.canh.some(function (nh) { return laNhanAnSoSom_(nh, de); })) {
            if (!nhanAnGoc) nhanAnGoc = z.canh.slice();
            z.canh = z.canh.map(function (nh) { return laNhanAnSoSom_(nh, de) ? (laMoDau ? '' : 'Cạnh ?') : nh; });
            sua.push('cảnh ' + (i + 1) + ' (' + c.loai + '): chưa đặt ẩn sớm trên vùng canh_that');
          }
        });
        if (Array.isArray(v.do)) v.do.forEach(function (d) {
          if (d && d.nhan && laNhanAnSoSom_(d.nhan, de)) {
            d.nhan = laMoDau ? '' : '?';
          }
        });
      }
      if (v.loai === 'hinh_hoc' && Array.isArray(v.canh)) {
        v.canh.forEach(function (ca) {
          if (Array.isArray(ca) && ca[2] && laNhanAnSoSom_(ca[2], de)) {
            ca[2] = laMoDau ? '' : '?';
          }
        });
      }
    });
  });

  // Đảm bảo ở cảnh bắt đầu giải bài (mo_hinh_hoa / y_do / tinh_toan đầu tiên sau de_bai) có bước ĐẶT ẨN tường minh cả trên hình lẫn công thức
  if (nhanAnGoc && nhanAnGoc.length) {
    var idxGiai = -1;
    for (var j = 0; j < kb.canh.length; j++) {
      var l = String(kb.canh[j] && kb.canh[j].loai || '');
      if (j > 0 && !/^(mo_dau|hook|de_bai)$/i.test(l)) { idxGiai = j; break; }
    }
    if (idxGiai >= 0) {
      var cGiai = kb.canh[idxGiai];
      var duG = cGiai.minh_hoa && cGiai.minh_hoa.loai === 'san_khau' && cGiai.minh_hoa.du_lieu;
      if (duG && Array.isArray(duG.vat) && mauVatAn) {
        var vCungLoai = duG.vat.filter(function (v) { return v && v.loai === mauVatAn.loai; })[0];
        if (vCungLoai) {
          vCungLoai.nhan_kich_thuoc = nhanAnGoc.slice();
        } else if (cGiai.giu_san_khau) {
          cGiai.giu_san_khau = false;
          var vClone = JSON.parse(JSON.stringify(mauVatAn));
          vClone.id = 'vat_an_' + (idxGiai + 1);
          vClone.buoc = 1;
          duG.vat.unshift(vClone);
        }
      }
      var daCoCauDatAn = kb.canh.some(function (cs) {
        var txt = String(cs && cs.loi_thoai || '') + ' ' + ((cs && cs.noi_dung_man_hinh) || []).join(' ');
        return /(gọi|đặt)\s+.*(\blà\s+[xyhr]\b|=\s*[xyhr]\b)/i.test(txt);
      });
      if (!daCoCauDatAn) {
        var dongDatAn = '\\text{Đặt ẩn: } ' + nhanAnGoc.join(',\\; ');
        var L0 = String(nhanAnGoc[0] || ''), W0 = String(nhanAnGoc[1] || ''), H0 = String(nhanAnGoc[2] || '');
        if (/^2x$/i.test(L0) && /^x$/i.test(W0)) {
          dongDatAn = '\\text{Đặt rộng } = x\\;(x>0) \\Rightarrow \\text{dài } = 2x' + (H0 ? ',\\; \\text{cao } = ' + H0 : '');
          if (!/(gọi|đặt)\s+/i.test(String(cGiai.loi_thoai || ''))) {
            cGiai.loi_thoai = 'Để giải bài toán, trước hết ta đặt chiều rộng đáy là x, suy ra chiều dài gấp đôi là hai x' + (H0 ? ' và chiều cao là ' + H0 : '') + '. ' + String(cGiai.loi_thoai || '');
          }
        } else if (/^x$/i.test(L0) && /^x$/i.test(W0)) {
          dongDatAn = '\\text{Đặt cạnh đáy } = x\\;(x>0)' + (H0 ? ',\\; \\text{chiều cao } = ' + H0 : '');
          if (!/(gọi|đặt)\s+/i.test(String(cGiai.loi_thoai || ''))) {
            cGiai.loi_thoai = 'Bước đầu tiên, ta gọi cạnh đáy là x' + (H0 ? ' và chiều cao là ' + H0 : '') + '. ' + String(cGiai.loi_thoai || '');
          }
        }
        if (!Array.isArray(cGiai.noi_dung_man_hinh)) cGiai.noi_dung_man_hinh = [];
        cGiai.noi_dung_man_hinh.unshift(dongDatAn);
        cGiai.noi_dung_man_hinh = cGiai.noi_dung_man_hinh.slice(0, 3);
        sua.push('cảnh ' + (idxGiai + 1) + ': bổ sung bước Đặt ẩn tường minh vào phần giải');
      }
    }
  }
  return sua;
}

// Sửa sâu các lỗi vặt. ctx: {y_tuong: ý tưởng then chốt từ lời giải}. Trả về danh sách việc đã sửa (ghi nhật ký).
function tuSuaSau_(kb, ctx, r) {
  ctx = ctx || {};
  var sua = [];
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return sua;
  var deGoc = (r && r.de_bai) || kb.de_bai || '';
  if (kb.tieu_de) kb.tieu_de = suaChinhTaTiengViet_(kb.tieu_de);
  if (kb.hook_chu) kb.hook_chu = suaChinhTaTiengViet_(kb.hook_chu);
  if (kb.bai_hoc_rut_ra) kb.bai_hoc_rut_ra = suaChinhTaTiengViet_(kb.bai_hoc_rut_ra);
  tuSuaVatDungDeXacSuat_(kb, deGoc).forEach(function (x) { sua.push(x); });
  tuSuaKhongGianMauLuoiO_(kb, deGoc).forEach(function (x) { sua.push(x); });
  tuSuaDatAnTheoBuoc_(kb, deGoc).forEach(function (x) { sua.push(x); });
  // 1) lời thoại & công thức màn hình: đọc ký hiệu toán thành chữ, sửa cú pháp TeX, bỏ câu mở máy móc
  kb.canh.forEach(function (c, i) {
    if (c.tieu_de_canh) c.tieu_de_canh = suaChinhTaTiengViet_(c.tieu_de_canh);
    if (c.loi_thoai) {
      var l0 = c.loi_thoai;
      c.loi_thoai = suaChinhTaTiengViet_(docLatexThanhLoi_(c.loi_thoai));
      if (c.loi_thoai !== l0) sua.push('chuẩn hóa lời thoại & chính tả ở cảnh ' + (i + 1));
    }
    if (i > 0 && c.loi_thoai) {
      var g = String(c.loi_thoai).replace(MO_MAY_MOC_PHAN_, '');
      if (g !== c.loi_thoai && g.length >= 15) { c.loi_thoai = hoaDau_(g); sua.push('bỏ câu mở máy móc ở cảnh ' + (i + 1)); }
    }
    if (!Array.isArray(c.noi_dung_man_hinh)) c.noi_dung_man_hinh = c.noi_dung_man_hinh ? [String(c.noi_dung_man_hinh)] : [];
    c.noi_dung_man_hinh = c.noi_dung_man_hinh.map(function (x) { return suaCuPhapTex_(String(x)); });
    if (/y_do|bay|loi_sai/i.test(String(c.loai || '')) && c.tieu_de_canh) c.tieu_de_canh = catTheoTu_(bocTexSangChu_(c.tieu_de_canh), 60);
    if (c.chu_thich !== undefined && !Array.isArray(c.chu_thich)) c.chu_thich = c.chu_thich ? [catTheoTu_(bocTexSangChu_(c.chu_thich), 60)] : [];
    if (Array.isArray(c.chu_thich)) c.chu_thich = c.chu_thich.map(function (x) { return catTheoTu_(bocTexSangChu_(String(x)), 60); });
  });
  // Làm giàu lời thoại cảnh đề bài nếu bị quá ngắn (< 18 từ)
  kb.canh.forEach(function (c) {
    if (!c || String(c.loai) !== 'de_bai') return;
    if (String(c.loi_thoai || '').trim().split(/\s+/).filter(Boolean).length < 18) {
      var boSung = [];
      if (Array.isArray(kb.de_cho) && kb.de_cho.length) boSung.push('Đề bài cho biết: ' + kb.de_cho.join(', ') + '.');
      if (kb.can_tim) boSung.push('Câu hỏi đặt ra là: ' + kb.can_tim + '.');
      if (boSung.length) { c.loi_thoai = (String(c.loi_thoai || '').trim() + ' ' + boSung.join(' ')).trim(); sua.push('bổ sung dữ kiện vào lời thoại cảnh đề bài'); }
    }
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
        // hình tự do: nét "vat" chưa có hình vẽ sẵn -> biểu tượng đúng vật (thay vì bị loại cả hình)
        if (v.loai === 'hinh_tu_do' && Array.isArray(v.hinh)) v.hinh.forEach(function (h) {
          if (!h || h.kieu !== 'vat' || TEN_VAT_THUC_.indexOf(String(h.ten)) >= 0) return;
          var em = h.emoji || timEmoji_(String(h.ten || '') + ' ' + String(h.nhan || ''));
          if (em) { if (!h.nhan) h.nhan = catTheoTu_(bocTexSangChu_(String(h.ten || '').replace(/_/g, ' ')), 20); h.emoji = em; h.ten = 'bieu_tuong'; sua.push('hình tự do cảnh ' + (i + 1) + ': vật chưa có hình vẽ sẵn -> biểu tượng ' + em); }
        });
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
      // Tự sửa lỗi quá nhiều nhãn chữ (tối đa 3 nhãn trên sân khấu) & chuẩn hóa TeX trong nhãn
      var demNhan = 0;
      du.vat = du.vat.filter(function (v) {
        if (v.noi_dung) v.noi_dung = suaCuPhapTex_(String(v.noi_dung));
        if (v.nhan) v.nhan = suaCuPhapTex_(String(v.nhan));
        if (v.loai === 'nhan' || v.loai === 'chu') { demNhan++; if (demNhan > 3) { sua.push('giảm bớt nhãn thừa ở cảnh ' + (i + 1)); return false; } }
        return true;
      });
      du.hanh_dong = (Array.isArray(du.hanh_dong) ? du.hanh_dong : []).filter(function (h) {
        return laDT_(h) && KIEU_HANH_DONG_.indexOf(h.kieu) >= 0 && (h.kieu === 'thu_nho' || h.kieu === 'phong_to' || h.kieu === 'goc_3d' || ids[h.vat] || idCu[h.vat]);
      });
      // Cảnh đề bài chỉ có chữ/nhãn -> tự ghép bản vẽ thực tế hoặc vật mô phỏng chuẩn xác theo đúng đề để tránh lỗi DE_BAI_CHI_CO_CHU
      var CHU_THUAN_S = ['nhan', 'chu', 'danh_sach', 'so_dem', 'mui_ten'];
      var coVatDe = du.vat.some(function (v) {
        if (!v) return false;
        if (v.loai === 'the') return (Array.isArray(v.ds) && v.ds.length >= 2) || Number(v.so_luong) >= 2;
        return CHU_THUAN_S.indexOf(v.loai) < 0;
      });
      if (String(c.loai) === 'de_bai' && !Object.keys(idCu).length && !coVatDe) {
        if (laDT_(kb.ban_ve) && Array.isArray(kb.ban_ve.vat) && kb.ban_ve.vat.length) {
          var bvDe = JSON.parse(JSON.stringify(kb.ban_ve));
          du.vat.unshift({ id: 'bv_de_' + (i + 1), loai: 'canh_that', x: 50, y: 50, buoc: 1, vat: bvDe.vat, diem: bvDe.diem || [], vung: bvDe.vung || [], do: bvDe.do || [], nhin: bvDe.nhin || 'ngang' });
          ids['bv_de_' + (i + 1)] = true;
          sua.push('cảnh đề bài chỉ có chữ -> chèn bản vẽ thực tế của đề');
        } else if (String(kb.mon || '').toUpperCase() === 'XAC_SUAT') {
          var vatXS = taoVatXacSuatTheoDe_(deGoc, i + 1);
          du.vat.unshift(vatXS);
          ids[vatXS.id] = true;
          sua.push('cảnh đề bài xác suất chỉ có chữ -> chèn vật thật theo đề (' + vatXS.loai + ')');
        }
      }
      // hết vật hợp lệ: có BẢN VẼ CẢNH THỰC TẾ của đề thì dùng bản vẽ đó (đúng vật, đúng số đo) thay vì để cảnh chỉ còn chữ
      if (!du.vat.length && !Object.keys(idCu).length && laDT_(kb.ban_ve) && Array.isArray(kb.ban_ve.vat) && kb.ban_ve.vat.length) {
        var bv = JSON.parse(JSON.stringify(kb.ban_ve));
        du.vat = [{ id: 'bv_' + (i + 1), loai: 'canh_that', x: 50, y: 50, buoc: 1, vat: bv.vat, diem: bv.diem || [], vung: bv.vung || [], do: bv.do || [], nhin: bv.nhin || 'ngang' }];
        ids[du.vat[0].id] = true;
        sua.push('cảnh ' + (i + 1) + ' không còn vật hợp lệ -> dùng bản vẽ cảnh thực tế của đề');
      }
      if (!du.vat.length && !Object.keys(idCu).length) { c.minh_hoa = { loai: 'khong', mo_ta: String(mh.mo_ta || '') }; idTruoc = {}; sua.push('cảnh ' + (i + 1) + ' không còn vật hợp lệ, bỏ sân khấu'); return; }
      if (!du.hanh_dong.length && du.vat.length) du.hanh_dong.push({ buoc: 2, vat: du.vat[0].id, kieu: 'sang' });
      if (String(mh.mo_ta || '').trim().length < 40 && !/Sân khấu gồm/.test(String(mh.mo_ta || ''))) {
        var tenVatMT = [];
        du.vat.forEach(function (v) {
          var t = v.loai + (v.nhan || v.noi_dung ? ' "' + String(v.nhan || v.noi_dung).slice(0, 24) + '"' : '');
          if (tenVatMT.indexOf(t) < 0 && tenVatMT.length < 4) tenVatMT.push(t);
        });
        mh.mo_ta = (String(mh.mo_ta || '').trim() + ' Sân khấu gồm ' + tenVatMT.join(', ') + ', xuất hiện lần lượt theo lời thoại.').trim();
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
        else if (String(mh.mo_ta || '').trim().length < 40 && !/minh họa đúng các số liệu/.test(String(mh.mo_ta || ''))) mh.mo_ta = (String(mh.mo_ta || '').trim() + ' Hình ' + mh.loai + ' minh họa đúng các số liệu đang nói tới.').trim();
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
  var dungCT = kb.canh.some(function (c) { return /tinh|giai/.test(String(c && c.loai)) && (c.noi_dung_man_hinh || []).some(function (d) { return /=/.test(String(d)); }); });
  if (dungCT && typeof laCanhGiaiThichCongThuc_ === 'function' && !kb.canh.some(laCanhGiaiThichCongThuc_)) {
    for (var gt = 1; gt < kb.canh.length - 1; gt++) {
      if (/nhac_lai|kien_thuc|ly_thuyet|cong_thuc|y_tuong|phan_tich/i.test(String(kb.canh[gt].loai || '')) && String(kb.canh[gt].loi_thoai || '').length >= 25) {
        kb.canh[gt].loai = 'nhac_lai';
        sua.push('đổi cảnh ' + (gt + 1) + ' thành nhac_lai giải thích công thức');
        break;
      }
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
  if (!/\d/.test(t) || !/^[\d\s.+\-*/()e]*$/.test(bo)) return null;
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
        if (/\\text\s*\{\s*(m|cm|mm|km|dm|kg|g|l|ml|lít|giờ|phút|giây|đồng)\s*\}/i.test(ve[m]) && /\\text\s*\{\s*(m|cm|mm|km|dm|kg|g|l|ml|lít|giờ|phút|giây|đồng)\s*\}/i.test(ve[m + 1])) continue;
        var a = texThanhSo_(ve[m]), b = texThanhSo_(ve[m + 1]);
        if (a === null || b === null) continue;
        var xapXi = dau[m] !== '=';
        var tol = xapXi ? Math.max(0.5 * Math.pow(10, -soLe10_(ve[m + 1])) * 1.001, Math.abs(b) * 0.006, 1e-9) : Math.max(Math.abs(b) * 1e-9, 1e-9);
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


// Công thức sai cú pháp (thiếu ngoặc, lệnh cụt \te, $...$, gạch chéo nhân đôi) -> trên video sẽ lộ mã thô: bắt sửa trước khi dựng.
function kiemTraCuPhapTex_(kb) {
  var loi = [];
  var xet = function (s, noi) {
    s = String(s || '');
    if (!/[\\{}^_$]/.test(s)) return;
    var kq = kiemTraTexHopLe_(s);
    if (kq.ok) return;
    var xem = catTheoTu_(s.replace(/\s+/g, ' '), 50);
    if (kq.ma === 'TEX_THIEU_NGOAC') loi.push('TEX_THIEU_NGOAC ' + noi + ': "' + xem + '" mở/đóng ngoặc { } không khớp -> sửa lại cho đúng LaTeX.');
    else if (kq.ma === 'TEX_THIEU_DOI_SO') loi.push('TEX_THIEU_DOI_SO ' + noi + ': ' + s);
    else if (kq.ma === 'TEX_LENH_CUT') loi.push('TEX_LENH_CUT ' + noi + ': "' + xem + '" có lệnh TeX bị cắt cụt hoặc sai cú pháp -> sửa lại cho đủ lệnh.');
    else if (kq.ma === 'TEX_CO_DAU_DO_LA') loi.push('TEX_CO_DAU_DO_LA ' + noi + ': "' + xem + '" không dùng dấu $ bao công thức, viết thẳng LaTeX.');
    else if (kq.ma === 'TEX_GACH_CHEO_KEP') loi.push('TEX_GACH_CHEO_KEP ' + noi + ': "' + xem + '" bị thừa dấu gạch chéo (\\\\frac) -> chỉ một dấu \\ trước lệnh.');
  };
  (kb.canh || []).forEach(function (c, j) {
    var noi = 'CANH_' + (j + 1);
    xet(c.tieu_de_canh, noi);
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
  (kb.tom_tat_3_buoc || []).forEach(function (d) { if (d && typeof d === 'object') { xet(d.chien_thuat, 'TOM_TAT'); xet(d.cong_thuc, 'TOM_TAT'); } });
  var k4 = kb.khung4tang || {};
  (k4.de_ghim || []).forEach(function (d) { if (d) xet(d.nhan, 'DE_GHIM'); });
  (k4.buoc || []).forEach(function (b, i) {
    if (!b) return;
    var noi = 'BUOC_' + (i + 1);
    xet(b.nhan, noi);
    xet(b.tieu_de, noi);
    (b.the || []).forEach(function (th) {
      if (!th) return;
      xet(th.nhan, noi);
      xet(th.noi_dung, noi);
      (Array.isArray(th.dong) ? th.dong : []).forEach(function (d) { xet(d, noi); });
    });
  });
  var sk = k4.san_khau && k4.san_khau.tham_so;
  if (sk && typeof sk === 'object') {
    ['nhan_bien', 'nhan_ham', 'don_vi'].forEach(function (k) { xet(sk[k], 'SAN_KHAU_2D'); });
    if (sk.nhan && typeof sk.nhan === 'object') Object.keys(sk.nhan).forEach(function (k) { xet(sk.nhan[k], 'SAN_KHAU_2D'); });
    (Array.isArray(sk.nhom) ? sk.nhom : []).forEach(function (g) { if (g) xet(g.nhan, 'SAN_KHAU_2D'); });
  }
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
// v102.1 BỘ VỆ SINH TĨNH 0-API (chạy sau MỌI lượt AI sinh / sửa, trước kiểm tĩnh và AI đối chiếu cảnh):
// khử câu lặp (toàn chuỗi), n-gram >= 2 từ lặp liền nhau, mục liệt kê trùng sau dấu phẩy; cắt độ dài theo biên từ.
function khuLapVanBan_(s, toiDa) {
  var goc = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (!goc) return '';
  var khoa = function (x) { return String(x).toLowerCase().replace(/[^\wÀ-ỹ]+/g, ' ').trim(); };
  var cau = goc.match(/[^.!?;|…]+[.!?;|…]*/g) || [goc], daCo = {}, ra = [];
  cau.forEach(function (c) {
    var t = c.trim();
    if (!t) return;
    // mục liệt kê trùng trong một câu ("the, the, the")
    var muc = t.split(/,\s+/), giu = [], daMuc = {};   // chỉ tách ", " (giữ số thập phân 0,8)
    muc.forEach(function (m) {
      var k = khoa(m);
      var duoi = giu.length && k ? khoa(giu[giu.length - 1]).split(' ').slice(-k.split(' ').length).join(' ') : '';
      if (k && (daMuc[k] || duoi === k)) return;
      giu.push(m);
      if (k) daMuc[k] = 1;
    });
    t = giu.join(', ');
    // n-gram lặp liền nhau (>= 2 từ), lặp tới khi ổn định
    var w = t.split(' '), doi = true, vong = 0;
    while (doi && vong++ < 20) {
      doi = false;
      for (var n = Math.min(12, Math.floor(w.length / 2)); n >= 2 && !doi; n--) {
        for (var i = 0; i + 2 * n <= w.length; i++) {
          if (khoa(w.slice(i, i + n).join(' ')) && khoa(w.slice(i, i + n).join(' ')) === khoa(w.slice(i + n, i + 2 * n).join(' '))) { w.splice(i + n, n); doi = true; break; }
        }
      }
    }
    t = w.join(' ');
    var k = khoa(t);
    if (k && daCo[k]) return;
    if (k) daCo[k] = 1;
    ra.push(t);
  });
  var kq = ra.join(' ').replace(/\s+([,.;!?])/g, '$1').trim();
  if (toiDa && kq.length > toiDa) {
    var cat = kq.slice(0, toiDa), sp = cat.lastIndexOf(' ');
    kq = (sp > toiDa * 0.6 ? cat.slice(0, sp) : cat).replace(/[,;:\s]+$/, '') + '…';
  }
  return kq;
}
var GIOI_HAN_MO_TA_MINH_HOA_ = 220;
function veSinhVanBanKb_(kb) {
  var sua = [];
  if (!kb || !Array.isArray(kb.canh)) return sua;
  var demMT = 0, demLoi = 0, demMuc = 0;
  var khuTrungMang = function (a) {
    if (!Array.isArray(a)) return a;
    var da = {}, ra = [];
    a.forEach(function (x) { var k = typeof x === 'string' ? x.replace(/\s+/g, ' ').trim() : JSON.stringify(x); if (!k || da[k]) { demMuc++; return; } da[k] = 1; ra.push(x); });
    return ra;
  };
  kb.canh.forEach(function (c) {
    if (!c || typeof c !== 'object') return;
    if (typeof c.mo_ta_minh_hoa === 'string') { var m1 = khuLapVanBan_(c.mo_ta_minh_hoa, GIOI_HAN_MO_TA_MINH_HOA_); if (m1 !== c.mo_ta_minh_hoa) { c.mo_ta_minh_hoa = m1; demMT++; } }
    if (c.minh_hoa && typeof c.minh_hoa === 'object' && typeof c.minh_hoa.mo_ta === 'string') {
      var m2 = khuLapVanBan_(c.minh_hoa.mo_ta, GIOI_HAN_MO_TA_MINH_HOA_);
      if (m2 !== c.minh_hoa.mo_ta) { c.minh_hoa.mo_ta = m2; demMT++; }
    }
    if (typeof c.loi_thoai === 'string' && c.loi_thoai.length > 30) {
      var l = khuLapVanBan_(c.loi_thoai, 0);
      if (l && l.length < c.loi_thoai.replace(/\s+/g, ' ').trim().length - 3) { c.loi_thoai = l; demLoi++; }
    }
    var nd = khuTrungMang(c.noi_dung_man_hinh);
    if (nd !== c.noi_dung_man_hinh) c.noi_dung_man_hinh = nd;
  });
  var k4 = kb.khung4tang;
  if (k4 && Array.isArray(k4.buoc)) k4.buoc.forEach(function (b) {
    if (!b || !Array.isArray(b.the)) return;
    b.the = khuTrungMang(b.the);
    b.the.forEach(function (t) { if (t && Array.isArray(t.dong)) t.dong = khuTrungMang(t.dong); });
  });
  if (demMT) sua.push('vệ sinh tĩnh: khử lặp / cắt gọn ' + demMT + ' mô tả minh họa');
  if (demLoi) sua.push('vệ sinh tĩnh: khử câu lặp ở ' + demLoi + ' lời thoại');
  if (demMuc) sua.push('vệ sinh tĩnh: bỏ ' + demMuc + ' dòng / thẻ trùng');
  return sua;
}
// v102.1 KHÓA thu_lai TẠI SCHEMA: schema BP2 bắt buộc trường "thu_lai" {phep_thu, loi_doc}. Kịch bản quên cảnh thử lại mà
// trường đó có phép thử bằng số -> chèn tất định cảnh "thu_lai" trước phần CHỐT (0 API), không đợi AI chấm mới phát hiện.
function chotThuLaiTuSchema_(kb) {
  var sua = [];
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return sua;
  if (kb.canh.some(function (c) { return c && phaCua_(c.loai) === 4; })) return sua;
  if (String(kb.khong_thu_lai || '').trim().split(/\s+/).length >= 6) return sua;
  var tl = kb.thu_lai && typeof kb.thu_lai === 'object' ? kb.thu_lai : null;
  var phep = tl ? String(tl.phep_thu || '').trim() : '';
  var doc = tl ? String(tl.loi_doc || tl.cach || '').trim() : '';
  if (!(/\d/.test(phep) && /=|≈|\\approx|<|>|\\le|\\ge/.test(phep)) || !/\d|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười/i.test(doc)) return sua;
  var viTri = kb.canh.length;
  while (viTri > 1 && /^(bai_hoc|ket_luan|cta|lien_he_thuc_te)$/.test(String((kb.canh[viTri - 1] || {}).loai || ''))) viTri--;
  var canhTL = {loai: 'thu_lai', tieu_de_canh: 'Thử lại bằng số', loi_thoai: doc, noi_dung_man_hinh: [phep],
    mo_ta_minh_hoa: 'Thế đáp án vào phép thử, đánh dấu đúng', minh_hoa: {loai: 'khong', mo_ta: 'Phép thử bằng số'}, giu_san_khau: true};
  kb.canh.splice(viTri, 0, canhTL);
  kb.canh.forEach(function (c, i) { if (c) c.so = i + 1; });
  // giữ đúng tham chiếu cảnh của các bước (khung 4 tầng / hình không gian): cảnh từ vị trí chèn trở đi lùi 1
  [kb.khung4tang && kb.khung4tang.buoc, kb.hinh_khong_gian && kb.hinh_khong_gian.buoc].forEach(function (ds) {
    (Array.isArray(ds) ? ds : []).forEach(function (b) { if (b && Number(b.canh) > viTri) b.canh = Number(b.canh) + 1; });
  });
  sua.push('khóa thu_lai: chèn cảnh thử lại bằng số từ trường thu_lai (cảnh ' + (viTri + 1) + ')');
  return sua;
}

function tuSuaQuyTrinh_(kb, deGoc) {
  var sua = [];
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return sua;
  var ds = kb.canh.map(function (c, i) { return {c: c, i: i, p: phaCua_(c && c.loai)}; });
  // pha của cảnh không nhận ra (loại lạ) = pha cảnh liền trước
  for (var k = 0; k < ds.length; k++) if (ds[k].p < 0) ds[k].p = k ? ds[k - 1].p : 0;
  var lech = kb.kieu_video !== 'DAI_10_PHUT' && ds.some(function (x, k) { return k && x.p < ds[k - 1].p; });
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
    var soDe = (String(deGoc).replace(/(câu|bài|lớp|ví dụ)\s*\d+/gi, ' ').replace(/(\d)\{,\}(\d)/g, '$1,$2').match(/\d+(?:[.,]\d+)?/g) || []).map(function (x) { return x.replace(',', '.'); });
    var coChu = (Array.isArray(kb.de_cho) ? kb.de_cho.join(' ') : '').replace(/,/g, '.');
    var mat = soDe.filter(function (x, i) { return soDe.indexOf(x) === i && coChu.indexOf(x) < 0; });
    if (mat.length) {
      var ve = String(deGoc).split(/(?<=[.;!])\s+|,\s+(?=[^\d])/).map(function (x) { return x.replace(/\s+/g, ' ').trim(); })
        .filter(function (x) { return /\d/.test(x) && !/\?\s*$|^\s*(hỏi|tính|tìm)\b/i.test(x); });
      if (ve.length < 2) {
        var veThem = String(deGoc).split(/(?<=[.;!])\s+|,\s+/).map(function (x) { return x.replace(/\s+/g, ' ').trim(); })
          .filter(function (x) { return x.length >= 6 && !/\?\s*$|^\s*(hỏi|tính|tìm)\b/i.test(x); });
        veThem.forEach(function (x) { if (ve.indexOf(x) < 0 && ve.length < 4) ve.push(x); });
      }
      if (ve.length) { kb.de_cho = ve.slice(0, 5).map(function (x) { return catGonTex_(x.replace(/[.;]$/, ''), 70); }); sua.push('de_cho dựng lại từ các dữ kiện của đề'); }
    }
  }
  if (String(kb.can_tim || '').trim().length < 5 && deGoc) {
    var cau = String(deGoc).split(/(?<=[.?!])\s+/).filter(function (x) { return /\?|^\s*(hỏi|tính|tìm|xác định|chứng minh)/i.test(x); });
    if (cau.length) { kb.can_tim = catGonTex_(cau[cau.length - 1].replace(/^\s*hỏi\s*/i, '').trim(), 110); sua.push('can_tim lấy từ câu hỏi của đề'); }
  }
  if (String(kb.can_tim || '').trim().length < 5) {
    kb.can_tim = catGonTex_(String(kb.tieu_de || kb.chu_de || 'Tìm giá trị thỏa mãn yêu cầu đề bài'), 90);
    sua.push('tự điền can_tim mặc định');
  }
  // Làm giàu lời thoại cảnh đề bài sau khi đã có đủ de_cho & can_tim nếu lời thoại bị quá ngắn (< 18 từ)
  kb.canh.forEach(function (c) {
    if (!c || String(c.loai) !== 'de_bai') return;
    if (String(c.loi_thoai || '').trim().split(/\s+/).filter(Boolean).length < 18) {
      var boSung = [];
      if (Array.isArray(kb.de_cho) && kb.de_cho.length) boSung.push('Đề bài cho biết ' + kb.de_cho.join(', ') + '.');
      if (kb.can_tim) boSung.push('Yêu cầu của bài là ' + kb.can_tim + '.');
      if (boSung.length) { c.loi_thoai = (String(c.loi_thoai || '').trim() + ' ' + boSung.join(' ')).trim(); sua.push('bổ sung đầy đủ dữ kiện vào lời thoại đề bài'); }
    }
  });
  // Nếu cảnh kiem_tra thiếu phép thử bằng số trên màn hình -> bổ sung câu thử khớp với đáp án đã kiểm chứng
  kb.canh.forEach(function (c) {
    if (!c || phaCua_(c.loai) !== 4) return;
    var ct = Array.isArray(c.noi_dung_man_hinh) ? c.noi_dung_man_hinh.map(String) : [];
    var coPhepThu = ct.some(function (d) { return /\d/.test(d) && /=|<|>|\\le|\\ge|\\approx|\\neq|≈|≤|≥/.test(d); });
    if (!coPhepThu && kb.dap_an_cuoi && String(kb.dap_an_cuoi) !== 'CM') {
      var da = String(kb.dap_an_cuoi).trim();
      ct.push('\\text{Thử lại: Kết quả } = ' + (da.indexOf('/') > 0 ? '\\frac{' + da.split('/')[0] + '}{' + da.split('/')[1] + '}' : da) + ' \\text{ (thỏa mãn)}');
      c.noi_dung_man_hinh = ct.slice(-3);
      if (!/\d|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|trăm|nghìn/.test(String(c.loi_thoai || '').toLowerCase())) {
        c.loi_thoai = (String(c.loi_thoai || '').trim() + ' Thử lại trực tiếp ta thấy giá trị ' + docLatexThanhLoi_(da) + ' hoàn toàn thỏa mãn điều kiện bài toán.').trim();
      }
      sua.push('bổ sung phép thử kiểm chứng ở cảnh kiem_tra');
    }
  });
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

// BÀI TOÁN THỰC TẾ: MỖI CẢNH MỘT HÌNH / KHUNG HÌNH RIÊNG KHỚP ĐÚNG NỘI DUNG CẢNH ĐÓ (tránh 1 hình tĩnh dùng suốt cả video).
// Tự động chia các vật/phép đo thành nhiều bước khung hình (buoc: 1..4) và thêm hành động zoom/sáng/chọn theo từng cảnh.
function tuSuaDaDangHinh_(kb, r) {
  var sua = [];
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return sua;
  var mon = String((r && r.mon) || kb.mon || '').toUpperCase();
  if (mon === 'HINH_HOC') return sua;
  var dauVanTruoc = '', demLap = 0;
  kb.canh.forEach(function (c, i) {
    var du = c && c.minh_hoa && c.minh_hoa.loai === 'san_khau' && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat) || !du.vat.length) return;
    if (!Array.isArray(du.hanh_dong)) du.hanh_dong = [];
    // 1) Chia nhỏ khung hình (buoc: 1..4) cho các phép đo/vật trong canh_that hoặc san_khau nếu tất cả đang đổ ra cùng buoc=1
    du.vat.forEach(function (v, vi) {
      if (!v) return;
      if (v.loai === 'canh_that') {
        var dsDo = Array.isArray(v.do) ? v.do : [];
        if (dsDo.length >= 2) {
          var cungBuoc = dsDo.every(function (d) { return !d || (d.buoc || 2) === (dsDo[0] && (dsDo[0].buoc || 2)); });
          if (cungBuoc) {
            dsDo.forEach(function (d, di) { if (d) d.buoc = Math.min(4, 1 + Math.floor((di * 3) / Math.max(1, dsDo.length)) + (di > 0 ? 1 : 0)); });
            sua.push('cảnh ' + (i + 1) + ': chia phép đo canh_that thành nhiều khung bước (buoc 1..4)');
          }
        }
        var dsVat = Array.isArray(v.vat) ? v.vat : [];
        if (dsVat.length >= 2 && dsVat.every(function (o) { return !o || (o.buoc || 1) === 1; }) && i === 0) {
          dsVat.forEach(function (o, oi) { if (o && oi > 0) o.buoc = Math.min(3, 1 + oi); });
        }
      } else if (du.vat.length >= 3 && vi > 0 && (v.buoc === undefined || v.buoc === 1)) {
        v.buoc = Math.min(4, 1 + Math.ceil((vi * 3) / du.vat.length));
      }
    });
    // 2) Phát hiện hai cảnh liên tiếp dùng y hệt một cấu hình hình minh họa -> biến đổi cảnh sau khớp nội dung đang nói
    var dauVan = JSON.stringify(du.vat.map(function (v) {
      if (!v) return '';
      return v.loai + ':' + (v.noi_dung || v.nhan || '') + ':' + JSON.stringify(v.do || v.ds || v.hinh || '');
    }));
    if (dauVan === dauVanTruoc) {
      demLap++;
      var ct0 = du.vat.filter(function (v) { return v && v.loai === 'canh_that'; })[0];
      if (ct0 && typeof tuyChinhBanVeTheoCanh_ === 'function') {
        var tcMoi = tuyChinhBanVeTheoCanh_(ct0, c, r || kb);
        if (tcMoi && Array.isArray(tcMoi.vat) && tcMoi.vat.length) {
          var vatKhac = du.vat.filter(function (v) { return v && v.loai !== 'canh_that'; });
          du.vat = tcMoi.vat.concat(vatKhac).slice(0, 6);
          du.hanh_dong = (tcMoi.hanh_dong || []).concat(du.hanh_dong || []).slice(0, 6);
        }
        sua.push('cảnh ' + (i + 1) + ': tùy biến canh_that theo nội dung cảnh');
      } else {
        var idChinh = (du.vat[0] && du.vat[0].id) || 'v0';
        var kieuHD = ['phong_to', 'chon', 'sang'][demLap % 3];
        if (!du.hanh_dong.some(function (h) { return h && h.kieu === kieuHD; })) {
          du.hanh_dong.push({ buoc: Math.min(4, 2 + (demLap % 2)), vat: idChinh, kieu: kieuHD });
        }
        // Trích biểu thức ngắn (không chứa LaTeX thô) trong noi_dung_man_hinh để gắn nhãn trực quan
        var ctNgan = (c.noi_dung_man_hinh || []).map(function (d) { return String(d || '').trim(); }).filter(function (d) { return d.length >= 3 && d.length <= 26 && !/\\|[{}_^]/.test(d); })[0];
        if (ctNgan && du.vat.filter(function (v) { return v && (v.loai === 'nhan' || v.loai === 'chu'); }).length < 2) {
          du.vat.push({ id: 'nh_c' + (i + 1), loai: 'nhan', x: 50, y: 14, buoc: 3, mau: ['vang', 'xanh_la', 'cam'][i % 3], noi_dung: ctNgan });
          sua.push('cảnh ' + (i + 1) + ': thêm nhãn & hiệu ứng riêng khớp bước tính');
        }
      }
    } else {
      demLap = 0;
    }
    dauVanTruoc = JSON.stringify(du.vat.map(function (v) {
      if (!v) return '';
      return v.loai + ':' + (v.noi_dung || v.nhan || '') + ':' + JSON.stringify(v.do || v.ds || v.hinh || '');
    }));
  });
  // 3) Loại bỏ các dòng chữ / công thức lặp lại y hệt nhau giữa hai cảnh liên tiếp (tránh chữ hiện lặp gây nhàm chán)
  var ndTruoc = {}, tdTruoc = '';
  kb.canh.forEach(function (c, i) {
    if (!c) return;
    var dsND = Array.isArray(c.noi_dung_man_hinh) ? c.noi_dung_man_hinh : [];
    if (i > 0 && dsND.length > 1 && c.trinh_bay !== 'cong_don') {
      var loc = dsND.filter(function (d) { return !ndTruoc[String(d || '').replace(/\s+/g, '')]; });
      if (loc.length > 0 && loc.length < dsND.length) {
        c.noi_dung_man_hinh = loc;
        sua.push('cảnh ' + (i + 1) + ': bỏ ' + (dsND.length - loc.length) + ' dòng công thức lặp lại từ cảnh trước');
      }
    }
    ndTruoc = {};
    (c.noi_dung_man_hinh || []).forEach(function (d) { ndTruoc[String(d || '').replace(/\s+/g, '')] = true; });
    var td = String(c.tieu_de_canh || '').trim();
    if (i > 0 && td && td.toLowerCase() === tdTruoc.toLowerCase()) {
      c.tieu_de_canh = tieuDeTuLoi_(c.loi_thoai);
      sua.push('cảnh ' + (i + 1) + ': đổi tiêu đề cảnh bị trùng với cảnh trước');
    }
    tdTruoc = String(c.tieu_de_canh || '').trim();
  });
  return sua;
}

function kiemTraDaDangHinhThucTe_(kb, mon) {
  var loi = [];
  if (!kb || !Array.isArray(kb.canh) || String(mon || kb.mon || '').toUpperCase() === 'HINH_HOC') return loi;
  var dauVanTruoc = '', chuoiLap = 1, maxLap = 1;
  kb.canh.forEach(function (c) {
    var du = c && c.minh_hoa && c.minh_hoa.loai === 'san_khau' && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat) || !du.vat.length) return;
    var dv = JSON.stringify({ v: du.vat, h: du.hanh_dong || [] });
    if (dv === dauVanTruoc) { chuoiLap++; if (chuoiLap > maxLap) maxLap = chuoiLap; }
    else { chuoiLap = 1; dauVanTruoc = dv; }
  });
  if (maxLap >= 3) {
    loi.push('HINH_LAP_LAI_NHIEU_CANH: có ' + maxLap + ' cảnh liên tiếp dùng y hệt một hình minh họa tĩnh. Mỗi cảnh phải thể hiện đúng đoạn nội dung cảnh đó đang nói (ẩn/hiện các phép đo theo bước buoc: 1..4, đổi nhãn từ "?" sang số vừa tính được, phóng to hoặc tô sáng phần đang xét).');
  }
  return loi;
}



/* ===================== v91: AUTO-FIX THAY CHO TỪ CHỐI CỨNG ===================== */
// Lỗi nhỏ / hình thức được máy TỰ CHUẨN HÓA (tuSuaHinhThuc_) rồi hạ thành cảnh báo nhẹ (phanLoaiLoiCung_).
// Chỉ TỪ CHỐI CỨNG khi: kịch bản rỗng cảnh / lời đọc, sai kết quả toán học cốt lõi (đáp án, phép tính, vượt chương trình lớp),
// vi phạm khóa luồng hinh_hoc_thuan hoặc hình học thiếu dữ kiện bắt buộc cho Manim. JSON hỏng đã bị chặn từ lúc đọc (BoPhan1.gs).
// Tắt: CAU_HINH AUTO_FIX_KICH_BAN = TAT (quay về cách cũ).
var LOI_CUNG_RE_ = /^(THU_TU_TOI_UU|TEX_THIEU_NGOAC|TEX_THIEU_DOI_SO|TEX_LENH_CUT|DAP_AN_NGAY|PREFLIGHT_|t2_trong|KHUNG4TANG_BAT_BUOC|XS_SAI_DAP_SO|KB_DOC_LAP_DE|KB_CUT_CONG_THUC|MA_THO_HIEN_THI|KHUNG4TANG_3D_RONG|TOAN_GOI_SAI_PARABOL|TOAN_THIEU_CAN_CU_CUC_TRI|KHONG_CO_CANH|QUA_IT_CANH|THIEU_LOI_THOAI_CANH_|DAP_AN_CUOI_SAI|DAP_AN_SAI_TREN_MAN_HINH|PHEP_TINH_SAI_CANH_|VI_PHAM_CHUONG_TRINH_LOP|LUONG_HINH_HOC|NOI_DUNG_LA|THOI_LUONG_CHUYEN_DE|SO_CANH_VIDEO_DAI_SAI|HINH_THIEU_DIEM_DE|HINH_THIEU_DIEM_CANH_|THIEU_TOA_DO_HINH|BUOC_VE_KHONG_KHOP_LOI_CANH_|BUOC_VE_DOI_TUONG_LA_CANH_|HP_VUOT_CHUONG_TRINH|HP_MENH_DE_SAI|HP_DONG_DANG_SAI_THU_TU|HP_DUNG_LOI|HP_DIEM_KHONG_TON_TAI|HP_THIEU_DAC_TA|KG_VUOT_CHUONG_TRINH|KG_MENH_DE_SAI|KG_SAI_SO_DO|KG_DUNG_LOI|KG_DIEM_KHONG_TON_TAI|KG_THIEU_DAC_TA|KG_KHOI_LOI|KG_DINH_CHUM|CAM_MAT_MOC|CAM_DE_GIO)/;
var MAU_SAN_KHAU_ = ['do', 'xanh_duong', 'xanh_la', 'cam', 'vang', 'tim', 'hong', 'ngoc', 'trang', 'xam', 'nau'];
var MAU_GAN_ = {'đỏ': 'do', red: 'do', xanh: 'xanh_duong', 'xanh dương': 'xanh_duong', xanh_lam: 'xanh_duong', lam: 'xanh_duong', blue: 'xanh_duong', cyan: 'xanh_duong',
  'xanh lá': 'xanh_la', xanh_luc: 'xanh_la', luc: 'xanh_la', green: 'xanh_la', orange: 'cam', 'vàng': 'vang', yellow: 'vang', 'tím': 'tim', purple: 'tim',
  'hồng': 'hong', pink: 'hong', 'trắng': 'trang', white: 'trang', 'xám': 'xam', gray: 'xam', grey: 'xam', 'nâu': 'nau', brown: 'nau', den: 'xam', 'đen': 'xam', black: 'xam'};
var MAU_3DV_GAN_ = {xanh: 'cyan', xanh_duong: 'cyan', lam: 'cyan', blue: 'cyan', 'vàng': 'vang', yellow: 'vang', cam: 'vang', do: 'hong', 'đỏ': 'hong', red: 'hong',
  tim: 'hong', 'hồng': 'hong', pink: 'hong', xanh_la: 'ngoc', green: 'ngoc', white: 'trang', 'trắng': 'trang', gray: 'xam', grey: 'xam', 'xám': 'xam'};

function batAutoFix_() { return String((typeof cauHinh_ === 'function' && cauHinh_('AUTO_FIX_KICH_BAN')) || 'BAT').toUpperCase() !== 'TAT'; }

// Chuẩn hóa một chuỗi LaTeX hiển thị: \binom / C(n,k) -> C_n^k, bỏ $, gạch chéo kép, dấu "." làm phép nhân -> \cdot, cân ngoặc { }.
function suaTexHienThi_(s) {
  if (typeof s !== 'string' || !s) return s;
  var t = s.replace(/\$/g, '').replace(/\\\\([a-zA-Z])/g, '\\$1');
  t = t.replace(/\\[dt]?binom\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, 'C_{$1}^{$2}')
    .replace(/(^|[^A-Za-z\\_])C\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g, '$1C_{$2}^{$3}')
    .replace(/(\d)\s+\.\s+(\d)/g, '$1 \\cdot $2')                       // "3 . 4" -> 3 · 4 (giữ số thập phân 29.50)
    .replace(/(\d|\))\s*\.\s*(\(|\\(?:frac|sqrt|pi))/g, '$1 \\cdot $2')  // "2.(x+1)", "3.\frac", "2.\pi"
    .replace(/([a-z])\s+\.\s+([a-z0-9])/g, '$1 \\cdot $2');            // "a . b" (có khoảng trắng; không đụng "S.ABCD")
  return suaCuPhapTex_(t);
}

function thayDapSo_(s, mau, thay) {
  if (typeof s !== 'string' || !s) return s;
  mau.forEach(function (re) {
    s = s.replace(new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g'), function (all, p1) {
      return (typeof p1 === 'string' && p1.length <= 1 && all.indexOf(p1) === 0 ? p1 : '') + thay;
    });
  });
  return s.replace(/\?\s*\?/g, '?');
}

// [GDPT2018_BAT_DAU] v94: khóa khung GDPT 2018 cho hình phẳng chuẩn (bản JS của scripts/hinh_phang/gdpt2018.py, test so khớp 2 bản).
// Bắt ĐÚNG CỤM định lý / phương pháp (không chặn từ đơn sin/cos/tan của tỉ số lượng giác lớp 9), luôn kèm gợi ý cách chứng minh thay thế.
var GOI_Y_NOI_TIEP_ = 'Chứng minh tứ giác nội tiếp theo GDPT 2018: (1) hai tam giác vuông chung cạnh huyền {xy} -> 4 điểm cách đều trung điểm của {xy}, cùng thuộc đường tròn đường kính {xy}; hoặc (2) chỉ ra 4 đỉnh cách đều một điểm; hoặc (3) tổng hai góc đối bằng 180°.';
var GOI_Y_VECTO_ = 'Lớp 8/9 chưa học vectơ/tích vô hướng: chứng minh vuông góc bằng góc (góc nội tiếp chắn nửa đường tròn, tổng hai góc nhọn của tam giác vuông bằng 90°, tam giác đồng dạng có góc tương ứng 90°) hoặc định lý Pythagore đảo.';
var GOI_Y_SIN_COS_ = 'Lớp 8/9 không dùng định lý sin/cosin: kẻ thêm đường cao để có tam giác vuông rồi dùng tỉ số lượng giác của góc nhọn (lớp 9), hệ thức về cạnh và góc trong tam giác vuông, định lý Pythagore hoặc tam giác đồng dạng.';
var GOI_Y_PHUONG_TICH_ = 'Không dùng phương tích: chứng minh đẳng thức tích MA·MB = MC·MD bằng hai tam giác đồng dạng (vd △MAC ∼ △MDB theo trường hợp góc - góc nhờ góc nội tiếp cùng chắn một cung) rồi suy ra tỉ số.';
var GOI_Y_LOP8_ = 'Lớp 8 chưa học đường tròn và tỉ số lượng giác (lớp 9): dùng tam giác đồng dạng, định lý Thalès, tính chất đường phân giác, đường trung bình, định lý Pythagore, tính chất các tứ giác đặc biệt.';
var GOI_Y_SO_PHUC_ = 'Không dùng số phức ở mọi lớp: giải bằng hình học tổng hợp hoặc biến đổi đại số thực.';
var KT_ = '(?![A-Za-z0-9_À-ỹ])';   // \b của Python (Unicode) - JS \b không hiểu chữ có dấu
var QUY_TAC_GDPT_ = [
  ['CUNG_CHUA_GOC', {lop_8: 'cung', lop_9: 'cung'}, 'cung\\s+ch[ứu]a\\s+g[óo]c', 0, 'cung chứa góc (chương trình 2006)', GOI_Y_NOI_TIEP_],
  ['CUNG_NHIN_CANH', {lop_8: 'cung', lop_9: 'cung'}, '(?:c[ùu]ng\\s+nh[ìi]n|nh[ìi]n)\\s+(?:c[ạa]nh\\s+|đo[ạa]n\\s+(?:th[ẳa]ng\\s+)?|d[âa]y\\s+)?([A-Z]{2})\\s+(?:d[ưu][ớo]i|theo)\\s+(?:m[ộo]t\\s+|hai\\s+|c[áa]c\\s+)?g[óo]c', 1, 'hai đỉnh cùng nhìn một cạnh dưới các góc bằng nhau (chương trình 2006)', GOI_Y_NOI_TIEP_],
  ['HAI_DINH_KE', {lop_8: 'cung', lop_9: 'cung'}, 'hai\\s+đ[ỉi]nh\\s+k[ềe]\\s+(?:c[ùu]ng\\s+)?nh[ìi]n', 0, 'hai đỉnh kề cùng nhìn một cạnh (chương trình 2006)', GOI_Y_NOI_TIEP_],
  ['VECTO', {lop_8: 'cung', lop_9: 'cung'}, 'vect[ơo]' + KT_ + '|v[ée]c\\s*t[ơo]' + KT_ + '|\\\\vec\\s*\\{|\\\\overrightarrow|t[íi]ch\\s+v[ôo]\\s+h[ưu][ớo]ng', 0, 'vectơ / tích vô hướng', GOI_Y_VECTO_],
  ['DINH_LY_SIN', {lop_8: 'cung', lop_9: 'cung'}, 'đ[ịi]nh\\s+l[ýíiy]\\s+(?:h[àa]m\\s+(?:s[ốo]\\s+)?)?sin(?:e)?' + KT_ + '|\\\\frac\\s*\\{[^{}]*\\}\\s*\\{\\s*\\\\sin', 0, 'định lý sin', GOI_Y_SIN_COS_],
  ['DINH_LY_COS', {lop_8: 'cung', lop_9: 'cung'}, 'đ[ịi]nh\\s+l[ýíiy]\\s+(?:h[àa]m\\s+(?:s[ốo]\\s+)?)?c[ôo]sin|đ[ịi]nh\\s+l[ýíiy]\\s+cos' + KT_ + '|-\\s*2\\s*(?:\\\\cdot\\s*)?[A-Za-z]{1,2}\\s*(?:\\\\cdot\\s*)?[A-Za-z]{1,2}\\s*(?:\\\\cdot\\s*)?\\\\cos', 0, 'định lý cosin', GOI_Y_SIN_COS_],
  ['PHUONG_TICH', {lop_8: 'cung', lop_9: 'cung', thpt: 'canh_bao'}, 'ph[ưu][ơo]ng\\s+t[íi]ch|tr[ụu]c\\s+đ[ẳa]ng\\s+ph[ưu][ơo]ng', 0, 'phương tích / trục đẳng phương', GOI_Y_PHUONG_TICH_],
  ['LOP8_DUONG_TRON', {lop_8: 'cung'}, 'g[óo]c\\s+n[ộo]i\\s+ti[ếe]p|t[ứu]\\s+gi[áa]c\\s+n[ộo]i\\s+ti[ếe]p|ti[ếe]p\\s+tuy[ếe]n|g[óo]c\\s+[ởo]\\s+t[âa]m|\\\\(?:sin|cos|tan|cot)' + KT_ + '|t[ỉi]\\s+s[ốo]\\s+l[ưu][ợo]ng\\s+gi[áa]c', 0, 'kiến thức đường tròn / tỉ số lượng giác của lớp 9', GOI_Y_LOP8_],
  ['SO_PHUC', {lop_8: 'cung', lop_9: 'cung', thpt: 'cung'}, 's[ốo]\\s+ph[ứu]c|(?<![A-Za-z0-9_À-ỹ])i\\s*\\^\\s*2\\s*=\\s*-\\s*1', 0, 'số phức', GOI_Y_SO_PHUC_],
  ['TOA_DO', {lop_8: 'canh_bao', lop_9: 'canh_bao'}, 'h[ệe]\\s+tr[ụu]c\\s+t[ọo]a\\s+đ[ộo]|ph[ưu][ơo]ng\\s+ph[áa]p\\s+t[ọo]a\\s+đ[ộo]|g[ắa]n\\s+(?:h[ệe]\\s+)?t[ọo]a\\s+đ[ộo]', 0, 'phương pháp tọa độ trong chứng minh hình', 'Ưu tiên chứng minh tổng hợp (góc, tam giác đồng dạng, tính chất đường tròn).'],
  ['GOC_TIEP_TUYEN_DAY', {lop_9: 'canh_bao'}, 'g[óo]c\\s+t[ạa]o\\s+b[ởo]i\\s+(?:tia\\s+)?ti[ếe]p\\s+tuy[ếe]n\\s+v[àa]\\s+d[âa]y', 0, 'góc tạo bởi tia tiếp tuyến và dây cung (⚠ cần đối chiếu SGK)', 'Có thể thay bằng: bán kính vuông góc tiếp tuyến + góc nội tiếp chắn nửa đường tròn, hoặc tam giác cân tạo bởi hai bán kính.'],
  ['GOC_DINH_TRONG_NGOAI', {lop_9: 'canh_bao'}, 'g[óo]c\\s+c[óo]\\s+đ[ỉi]nh\\s+(?:[ởo]\\s+)?(?:b[êe]n\\s+)?(?:trong|ngo[àa]i)\\s+đ[ưu][ờo]ng\\s+tr[òo]n', 0, 'góc có đỉnh ở bên trong / bên ngoài đường tròn (⚠ cần đối chiếu SGK)', 'Có thể thay bằng: góc ngoài tam giác bằng tổng hai góc trong không kề + góc nội tiếp.'],
  ['GOC_NGOAI_TU_GIAC', {lop_9: 'canh_bao'}, 'g[óo]c\\s+ngo[àa]i\\s+(?:t[ạa]i\\s+(?:m[ộo]t\\s+)?đ[ỉi]nh\\s+)?b[ằa]ng\\s+g[óo]c\\s+trong\\s+(?:c[ủu]a\\s+)?(?:đ[ỉi]nh\\s+)?đ[ốo]i', 0, 'góc ngoài bằng góc trong đối (⚠ cần đối chiếu SGK)', 'Thay bằng: tổng hai góc đối bằng 180° rồi dùng hai góc kề bù.']
];
function kiemVanBanGdpt_(s, cap, nguon) {
  var kq = [];
  s = String(s || '');
  QUY_TAC_GDPT_.forEach(function (q) {
    var muc = q[1][cap];
    if (!muc) return;
    var rx = new RegExp(q[2], 'gi'), m;
    while ((m = rx.exec(s)) !== null) {
      if (m[0] === '') { rx.lastIndex++; continue; }
      if (q[3] && m[q[3]] !== m[q[3]].toUpperCase()) continue;
      var xy = q[3] ? m[q[3]] : '';
      if (!xy) { var mm = /\b([A-Z]{2})\b/.exec(s.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40)); xy = mm ? mm[1] : 'XY'; }
      kq.push({ ma: q[0], muc: muc, cum: m[0].slice(0, 60), nguon: nguon || '', ten: q[4], goi_y: q[5].replace(/\{xy\}/g, xy) });
      break;
    }
  });
  return kq;
}
function kiemGdpt2018_(kb, cap) {
  var hp = (kb && kb.hinh_phang_chuan) || {};
  cap = cap || (typeof capLopHinhPhang_ === 'function' ? capLopHinhPhang_(hp.cap_lop || kb.lop) : 'lop_9');
  var ds = [];
  (hp.trang_chung_minh || []).forEach(function (t, i) {
    if (!t) return;
    ds.push(['trang ' + (i + 1) + ' tiêu đề', String(t.tieu_de || '')]);
    (t.dong || []).forEach(function (d, j) { if (d) ds.push(['trang ' + (i + 1) + ' dòng ' + (j + 1), [d.tex, d.khi_noi, d.ly_do].map(function (x) { return String(x || ''); }).join(' ')]); });
  });
  (kb.canh || []).forEach(function (c, i) {
    if (!c) return;
    var so = c.so || i + 1;
    ds.push(['cảnh ' + so + ' lời thoại', String(c.loi_thoai || '')]);
    ds.push(['cảnh ' + so + ' kiến thức', String(c.kien_thuc || '')]);
    ds.push(['cảnh ' + so + ' màn hình', (c.noi_dung_man_hinh || []).join(' ')]);
  });
  var cung = [], canhBao = [], da = {};
  ds.forEach(function (x) {
    kiemVanBanGdpt_(x[1], cap, x[0]).forEach(function (y) {
      var k = y.ma + '|' + y.nguon;
      if (da[k]) return;
      da[k] = 1;
      (y.muc === 'cung' ? cung : canhBao).push(y);
    });
  });
  return { cung: cung, canh_bao: canhBao };
}
// [GDPT2018_KET_THUC]

// Kiểm tên điểm và đường tròn theo thứ tự thực thi của hinh_phang/hinh.py, kể cả khi Apps Script chạy không có Python.
function kiemThuTuPhepDungHinhPhang_(phepDung) {
  var diem = new Set(), tron = new Set(), loi = '';
  var chuan = function (x) {
    return String(x || '').trim().replace(/^([A-Z])_\{(\d+)\}$/, '$1_$2').replace(/^([A-Z])(\d+)$/, '$1_$2');
  };
  var tach = function (x) {
    var s = String(x || '').replace(/\\(triangle|angle|widehat|Delta)\b/g, '');
    if (s.indexOf('_{') < 0) s = s.replace(/[{}]/g, '');
    return (s.replace(/ /g, '').match(/[A-Z](?:'+|_\{\d+\}|_?\d+)?/g) || []).map(chuan);
  };
  var laTron = function (x) { return /^\([\s\S]*\)$/.test(String(x || '').trim()); };
  // v102.1 ký hiệu tia / đường 1 chữ hoa + 1 chữ thường ("Ax", "By"): hợp lệ khi một phép dựng trước đã tạo đường qua điểm đó
  // (tiep_tuyen tai, song_song / vuong_goc qua, phan_giac, hoặc khai báo "ten_duong"); ngược lại báo lỗi tường minh ngay vòng tĩnh.
  var tia = {};
  var laTia = function (x) { return /^\s*[A-Z]'?[a-z]'?\s*$/.test(String(x || '')); };
  function ghiTia(goc, b) {
    var g = chuan(goc);
    if (g) tia[g] = true;
    if (b && b.ten_duong) tia[String(b.ten_duong).trim()] = true;
  }
  function docDiem(x) {
    var ten = chuan(x);
    if (!loi && !diem.has(ten)) loi = 'HP_DIEM_KHONG_TON_TAI: điểm ' + ten + ' chưa được dựng trước bước này';
  }
  function docTron(x) {
    var khoa = tach(x).join('');
    if (!loi && !tron.has(khoa)) loi = 'HP_DIEM_KHONG_TON_TAI: đường tròn (' + khoa + ') chưa được dựng';
  }
  function docNhom(x, n) {
    if (n === 2 && laTia(x)) {
      var tenTia = String(x).trim(), gocTia = tenTia.charAt(0);
      if (tia[tenTia] || tia[gocTia]) { docDiem(gocTia); return [gocTia, gocTia]; }
      if (!loi) loi = 'HP_DUNG_LOI: ký hiệu tia "' + tenTia + '" chưa gắn với đường nào - đặt tên đường bằng 2 điểm chữ hoa (vd "' + gocTia + 'T") hoặc khai báo "ten_duong": "' + tenTia + '" ở phép dựng tạo đường qua ' + gocTia;
      return [];
    }
    var ds = tach(x);
    if (ds.length === n) ds.forEach(docDiem);
    else if (!loi) loi = 'HP_DUNG_LOI: "' + String(x || '') + '" cần đúng ' + n + ' điểm';
    return ds;
  }
  function docDuong(x) {
    var ds = tach(x);
    var vong = laTron(x) || (ds.length === 1 && tron.has(ds[0]));
    if (vong) docTron(x);
    else docNhom(x, 2);
    return vong;
  }
  function chonGiao(b) {
    (Array.isArray(b.khac) ? b.khac : b.khac ? [b.khac] : []).forEach(docDiem);
    if (b.gan || b.xa) docDiem(b.gan || b.xa);
  }
  function themTam(tam) {
    diem.add(tam);
    tron.add(tam);
  }
  var buoc = phepDung.filter(function (b) { return b && typeof b === 'object' && !Array.isArray(b); });
  if (phepDung.length && !buoc.length) return 'HP_THIEU_DAC_TA: phep_dung cần có ít nhất một phép dựng.';
  for (var i = 0; i < buoc.length; i++) {
    var b = buoc[i], loai = b.loai, tam = chuan(b.tam || 'O');
    switch (loai) {
      case 'tam_giac':
      case 'tam_giac_noi_tiep':
      case 'tu_giac':
        var dinh = b.dinh;
        if (Array.isArray(dinh)) dinh = dinh.every(function (x) { return typeof x === 'string'; }) ? dinh.join('') : '';
        var ds = typeof dinh === 'string' ? tach(dinh) : [];
        var soDinh = loai === 'tu_giac' ? 4 : 3;
        if (new Set(ds).size !== soDinh || ds.length !== soDinh) {
          loi = 'HP_DUNG_LOI: ' + (soDinh === 3 ? 'tam giác' : 'tứ giác') + ' cần đúng ' + soDinh + ' đỉnh khác nhau trong "dinh"';
        } else {
          ds.forEach(function (x) { diem.add(x); });
          if (loai === 'tam_giac_noi_tiep') { themTam(tam); tron.add(ds.join('')); }
        }
        break;
      case 'duong_tron': themTam(tam); break;
      case 'diem_tren':
        if (laTron(b.tren)) docTron(b.tren);
        else docNhom(b.tren, 2);
        break;
      case 'diem_ngoai': docTron(b.duong_tron || '(O)'); break;
      case 'chan_duong_cao': docDiem(b.tu); docNhom(b.xuong, 2); break;
      case 'duong_kinh': docTron(b.duong_tron || '(O)'); docDiem(b.tu); break;
      case 'trung_diem': docNhom(b.doan, 2); break;
      case 'giao_diem':
        var tronA = docDuong(b.a), tronB = docDuong(b.b);
        if (tronA || tronB) chonGiao(b);
        break;
      case 'duong_tron_ngoai_tiep':
        tron.add(docNhom(b.tg, 3).join(''));
        themTam(tam);
        break;
      case 'duong_tron_duong_kinh':
        tron.add(docNhom(b.doan, 2).join(''));
        if (b.tam) themTam(chuan(b.tam));
        break;
      case 'tiep_tuyen':
        docTron(b.duong_tron || '(O)');
        docDiem(b.tai || b.tu);
        if (b.tai) ghiTia(b.tai, b);
        if (b.tai && b.cat && docDuong(b.cat)) chonGiao(b);
        if (!b.tai && b.tu) {
          var tiepDiem = Array.isArray(b.ten_tiep_diem) ? b.ten_tiep_diem : b.ten_tiep_diem ? [b.ten_tiep_diem] : [];
          tiepDiem.slice(0, 2).forEach(function (x) { diem.add(chuan(x)); });
        }
        break;
      case 'phan_giac':
        var dsPG = docNhom(b.goc, 3);
        if (dsPG.length === 3) ghiTia(dsPG[1], b);
        if (docDuong(b.cat)) chonGiao(b);
        break;
      case 'doi_xung':
        docDiem(b.diem);
        if (tach(b.qua).length === 1) docDiem(b.qua);
        else docNhom(b.qua, 2);
        break;
      case 'song_song':
      case 'vuong_goc':
        docDiem(b.qua);
        docNhom(b.voi, 2);
        ghiTia(b.qua, b);
        if (b.cat && docDuong(b.cat)) chonGiao(b);
        break;
      case 'doan_noi':
        (Array.isArray(b.doan) ? b.doan : [b.doan]).forEach(function (x) {
          var dsNoi = tach(x);
          if (dsNoi.length >= 2) dsNoi.forEach(docDiem);
          else if (!loi) loi = 'HP_DUNG_LOI: đoạn nối "' + String(x || '') + '" cần ít nhất 2 điểm';
        });
        break;
      default: loi = 'HP_DUNG_LOI: loại phép dựng "' + (loai || '') + '" không hỗ trợ';
    }
    if (loi) return loi.replace(': ', ': phép dựng ' + (i + 1) + '/' + (b.id || 'd' + (i + 1)) + ': ');
    if (b.ten && (/^(diem_tren|diem_ngoai|chan_duong_cao|duong_kinh|trung_diem|giao_diem|phan_giac|doi_xung|song_song|vuong_goc)$/.test(loai) ||
        (loai === 'tiep_tuyen' && b.tai))) diem.add(chuan(b.ten));
  }
  return '';
}

// v94: Auto-fix nhẹ các trường phụ của kb.hinh_phang_chuan (không đụng phép dựng / mệnh đề: sai thì bộ kiểm chứng trả lại AI).
var MAU_HP_ = ['vang', 'do', 'ngoc', 'cam', 'la'];
var MAU_HP_GAN_ = { yellow: 'vang', 'vàng': 'vang', red: 'do', 'đỏ': 'do', coral: 'do', san_ho: 'do', hong: 'do', teal: 'ngoc', cyan: 'ngoc', xanh_ngoc: 'ngoc', turquoise: 'ngoc',
  orange: 'cam', green: 'la', xanh_la: 'la', 'xanh lá': 'la', xanh: 'ngoc' };
function tuSuaHinhPhangChuan_(kb, r) {
  var sua = [];
  var hp = kb && kb.hinh_phang_chuan;
  if (!hp || typeof hp !== 'object') return sua;
  if (typeof laHinhKhongGian_ === 'function' && laHinhKhongGian_(kb.de_bai || (r && r.de_bai))) { delete kb.hinh_phang_chuan; sua.push('gỡ hinh_phang_chuan (đề hình KHÔNG GIAN dùng hinh_hoc)'); return sua; }
  var cap = typeof capLopHinhPhang_ === 'function' ? capLopHinhPhang_(hp.cap_lop || kb.lop || (r && r.lop)) : 'lop_9';
  if (hp.cap_lop !== cap) { hp.cap_lop = cap; sua.push('cap_lop -> ' + cap); }
  if (!Array.isArray(hp.dieu_kien)) hp.dieu_kien = [];
  // responseSchema 2B trả hinh_phang_chuan dạng chuỗi: AI đôi khi mã hóa lồng thêm "phep_dung" thành chuỗi JSON -> bung lại (chỉ định dạng)
  if (typeof hp.phep_dung === 'string') { try { var pdChuoi = JSON.parse(hp.phep_dung); if (Array.isArray(pdChuoi)) { hp.phep_dung = pdChuoi; sua.push('phep_dung chuỗi JSON -> mảng'); } } catch (ePd) {} }
  // Phép dựng hình gốc thiếu "loai" nhưng có "dinh" (lỗi hay gặp làm mất đỉnh A ở bước 2): suy loại theo số đỉnh thay vì lặng lẽ bỏ bước.
  (Array.isArray(hp.phep_dung) ? hp.phep_dung : []).forEach(function (b, i) {
    if (!b || typeof b !== 'object' || b.loai || !b.dinh) return;
    var soDinh = (String(Array.isArray(b.dinh) ? b.dinh.join('') : b.dinh).replace(/\\(triangle|angle|widehat|Delta)\b/g, '').match(/[A-Z](?:'+|_\{\d+\}|_?\d+)?/g) || []).length;
    var loaiDoan = soDinh === 3 ? (b.tam ? 'tam_giac_noi_tiep' : 'tam_giac') : soDinh === 4 ? 'tu_giac' : '';
    if (loaiDoan) { b.loai = loaiDoan; sua.push('phep_dung[' + i + '] thiếu loai -> ' + loaiDoan + ' (theo ' + soDinh + ' đỉnh)'); }
  });
  hp.phep_dung = (Array.isArray(hp.phep_dung) ? hp.phep_dung : []).filter(function (b) { return b && typeof b === 'object' && b.loai; });
  var daId = {};
  hp.phep_dung.forEach(function (b, i) { var id = String(b.id || ''); if (!id || daId[id]) { b.id = 'd' + (i + 1); sua.push('phep_dung[' + i + '].id -> ' + b.id); } daId[b.id] = 1; });
  hp.de_rut_gon = (Array.isArray(hp.de_rut_gon) ? hp.de_rut_gon : []).map(function (x) { return typeof x === 'string' ? { tex: x } : x; }).filter(function (x) { return x && String(x.tex || '').trim(); });
  if (hp.de_rut_gon.length > 3) { hp.de_rut_gon = hp.de_rut_gon.slice(0, 3); sua.push('de_rut_gon cắt còn 3 dòng'); }
  if (typeof hp.muc_tieu === 'string') hp.muc_tieu = { tex: hp.muc_tieu };
  var trangMoi = [];
  (Array.isArray(hp.trang_chung_minh) ? hp.trang_chung_minh : []).forEach(function (t) {
    if (!t || typeof t !== 'object') return;
    var dong = (Array.isArray(t.dong) ? t.dong : []).map(function (d) { return typeof d === 'string' ? { tex: d } : d; }).filter(function (d) { return d && String(d.tex || '').trim(); });
    dong.forEach(function (d) {
      d.tex = String(d.tex).replace(/^\$+|\$+$/g, '').replace(/\\color\{(vang|do|ngoc|cam|la)\}\{([^{}]*)\}/g, '\\m$1{$2}');
      (Array.isArray(d.hanh_dong_hinh) ? d.hanh_dong_hinh : (d.hanh_dong_hinh = [])).forEach(function (h) {
        if (!h || h.loai === 'khung_bac_cau' || h.loai === 'ket_luan') return;
        var m = String(h.mau || '').trim().toLowerCase().replace(/\s+/g, '_');
        m = MAU_HP_GAN_[m] || MAU_HP_GAN_[m.replace(/_/g, ' ')] || m;
        if (MAU_HP_.indexOf(m) < 0) m = 'vang';
        if (m !== h.mau) { h.mau = m; sua.push('màu hành động -> ' + m); }
      });
    });
    for (var k = 0; k < dong.length; k += 5) trangMoi.push({ tieu_de: String(t.tieu_de || '') + (k ? ' (tiếp)' : ''), dong: dong.slice(k, k + 5) });
    if (dong.length > 5) sua.push('trang "' + t.tieu_de + '" > 5 dòng -> chia trang');
  });
  hp.trang_chung_minh = trangMoi;
  // cảnh: công thức nằm trong trang chứng minh -> bỏ noi_dung_man_hinh / buoc_ve trùng lặp
  kb.canh.forEach(function (c) { if (c && Array.isArray(c.noi_dung_man_hinh) && c.noi_dung_man_hinh.length) { c.noi_dung_man_hinh = []; c.moc_loi = []; } if (c) delete c.buoc_ve; });
  return sua;
}

function tuSuaHinhThuc_(kb, r) {
  var sua = [];
  if (kb && kb.bai_hoc_rut_ra !== undefined && !Array.isArray(kb.bai_hoc_rut_ra) && typeof mangBaiHoc_ === 'function') kb.bai_hoc_rut_ra = mangBaiHoc_(kb.bai_hoc_rut_ra);   // v99.2b: chuỗi -> mảng
  if (kb && typeof veSinhKb_ === 'function') sua = sua.concat(veSinhKb_(kb, r));   // v99.2 Evergreen: luôn chạy (kể cả tắt Auto-fix)
  if (!batAutoFix_() || !kb || !Array.isArray(kb.canh)) return sua;
  if (kb.hinh_phang_chuan) sua = sua.concat(tuSuaHinhPhangChuan_(kb, r));   // v94
  if (kb.hinh_khong_gian && typeof tuSuaKhongGian_ === 'function') sua = sua.concat(tuSuaKhongGian_(kb, r));   // v97
  var dem = {tex: 0, mau: 0, nhan: 0, td: 0};
  var texMang = function (ds) { return Array.isArray(ds) ? ds.map(function (x) { var y = suaTexHienThi_(x); if (y !== x) dem.tex++; return y; }) : ds; };
  var chuanMau = function (m) {
    if (typeof m !== 'string' || MAU_SAN_KHAU_.indexOf(m) >= 0 || /^#[0-9a-f]{3,8}$/i.test(m)) return m;
    var k = m.trim().toLowerCase(), g = MAU_GAN_[k] || MAU_GAN_[k.replace(/_/g, ' ')];
    if (g) { dem.mau++; return g; }
    return m;
  };
  kb.canh.forEach(function (c, i) {
    if (!c) return;
    // lời thoại còn ký hiệu LaTeX -> đọc thành chữ (giọng đọc không đọc được \frac)
    if (/[\\$]/.test(String(c.loi_thoai || ''))) { c.loi_thoai = docLatexThanhLoi_(c.loi_thoai); sua.push('cảnh ' + (i + 1) + ': đổi LaTeX trong lời thoại thành chữ'); }
    c.noi_dung_man_hinh = texMang(c.noi_dung_man_hinh);
    c.chu_thich = texMang(c.chu_thich);
    // tiêu đề: bỏ dấu câu rớt đầu, điền khi thiếu
    if (typeof c.tieu_de_canh === 'string' && /^\s*[:,;.?!\-–]+/.test(c.tieu_de_canh)) { c.tieu_de_canh = c.tieu_de_canh.replace(/^\s*[:,;.?!\-–]+\s*/, ''); dem.td++; }
    if (i > 0 && String(c.tieu_de_canh || '').trim().length < 6 && c.loi_thoai) { c.tieu_de_canh = tieuDeTuLoi_(c.loi_thoai); dem.td++; }
    var du = c.minh_hoa && c.minh_hoa.du_lieu;
    if (!du || !Array.isArray(du.vat)) return;
    du.vat.forEach(function (v) {
      if (!v) return;
      ['noi_dung', 'nhan'].forEach(function (k) { if (typeof v[k] === 'string') { var y = suaTexHienThi_(v[k]); if (y !== v[k]) { v[k] = y; dem.tex++; } } });
      v.ds = texMang(v.ds);
      if (v.mau !== undefined) v.mau = chuanMau(v.mau);
      if (Array.isArray(v.hinh)) v.hinh.forEach(function (h) { if (h) { ['noi_dung', 'nhan'].forEach(function (k) { if (typeof h[k] === 'string') h[k] = suaTexHienThi_(h[k]); }); if (h.mau !== undefined) h.mau = chuanMau(h.mau); } });
    });
    // quá 3 nhãn chữ trên sân khấu -> giữ 3 nhãn đầu, gỡ hành động trỏ tới nhãn bị bỏ
    var nhan = du.vat.filter(function (v) { return v && (v.loai === 'nhan' || v.loai === 'chu'); });
    if (nhan.length > 3) {
      var bo = {};
      nhan.slice(3).forEach(function (v) { bo[v.id] = 1; });
      du.vat = du.vat.filter(function (v) { return !(v && (v.loai === 'nhan' || v.loai === 'chu') && bo[v.id]); });
      if (Array.isArray(du.hanh_dong)) du.hanh_dong = du.hanh_dong.filter(function (h) { return !(h && bo[h.vat]); });
      dem.nhan++;
    }
  });
  kb.de_cho = texMang(kb.de_cho);
  if (typeof kb.can_tim === 'string') kb.can_tim = suaTexHienThi_(kb.can_tim);
  // trường phụ của hook
  if (!String(kb.hook_chu || '').trim() && kb.hook) { kb.hook_chu = catTu_(kb.hook, 12); sua.push('điền hook_chu từ hook'); }
  if (HOOK_KIEU_.indexOf(kb.hook_kieu) < 0) { kb.hook_kieu = /\?\s*$/.test(String(kb.hook_chu || '')) ? 'cau_hoi' : 'thach_thuc'; sua.push('đặt hook_kieu mặc định'); }
  var hc = String(kb.hook_chu || '');
  if (hc && (!Array.isArray(kb.nhan_manh) || !kb.nhan_manh.length || kb.nhan_manh.length > 3 || kb.nhan_manh.some(function (x) { return hc.toLowerCase().indexOf(String(x).toLowerCase()) < 0; }))) {
    var hop = (Array.isArray(kb.nhan_manh) ? kb.nhan_manh : []).filter(function (x) { return x && hc.toLowerCase().indexOf(String(x).toLowerCase()) >= 0; }).slice(0, 3);
    kb.nhan_manh = hop.length ? hop : [catTu_(hc.replace(/[?!.]+$/, ''), 3)];
    sua.push('chuẩn hóa nhan_manh theo hook_chu');
  }
  if (hc && (!Array.isArray(kb.hook_ung_vien) || kb.hook_ung_vien.length < 3)) {
    var uv = (Array.isArray(kb.hook_ung_vien) ? kb.hook_ung_vien : []).filter(Boolean);
    while (uv.length < 3) uv.push(uv.length ? hc + (uv.length === 1 ? ' Thử đoán xem!' : ' Bạn chọn cách nào?') : hc);
    kb.hook_ung_vien = uv;
    sua.push('bù hook_ung_vien đủ 3');
  }
  // hook / tiêu đề / bìa lỡ dính đáp số -> thay bằng "?" (lời cảnh 1 -> "bao nhiêu")
  if (typeof mauDapSoLo_ === 'function' && loHookDapAn_(kb)) {
    var mau = mauDapSoLo_(kb);
    ['hook', 'hook_chu', 'tieu_de_bia', 'tieu_de', 'chu_de_ngan'].forEach(function (k) { kb[k] = thayDapSo_(kb[k], mau, '?'); });
    if (Array.isArray(kb.hook_ung_vien)) kb.hook_ung_vien = kb.hook_ung_vien.map(function (x) { return thayDapSo_(x, mau, '?'); });
    if (kb.canh[0]) kb.canh[0].loi_thoai = thayDapSo_(kb.canh[0].loi_thoai, mau, 'bao nhiêu');
    sua.push('che đáp số lộ ở hook/tiêu đề/cảnh 1');
  }
  if (!Array.isArray(kb.bai_hoc_rut_ra) || kb.bai_hoc_rut_ra.filter(function (x) { return String(x).trim().length >= 8; }).length < 2) {
    var chot = kb.canh.filter(function (c) { return c && /bai_hoc|ket_luan|chot/.test(String(c.loai || '')); }).map(function (c) { return catTu_(String(c.loi_thoai || '').split(/[.!?]/)[0], 12); }).filter(function (x) { return x.length >= 8; });
    if (chot.length) { kb.bai_hoc_rut_ra = chot.slice(0, 3); sua.push('điền bai_hoc_rut_ra từ cảnh chốt'); }
  }
  if (dem.tex) sua.push('chuẩn hóa ' + dem.tex + ' công thức (binom, $, ngoặc, dấu nhân)');
  if (dem.mau) sua.push('đổi ' + dem.mau + ' tên màu về bảng màu chuẩn');
  if (dem.nhan) sua.push('cắt bớt nhãn chữ thừa ở ' + dem.nhan + ' cảnh');
  if (dem.td) sua.push('sửa ' + dem.td + ' tiêu đề cảnh');
  return sua.concat(tuSuaKhung4Tang_(kb, r));
}

// v92: SUY KHUÔN 3D THAM SỐ TỪ ĐỀ (bản rút gọn của chuanbi.py suy_khuon) -> {khuon, tham_so} | null.
function suyKhuon_(kb, r) {
  var t = [kb && kb.de_bai, kb && kb.chu_de, kb && kb.tieu_de, kb && kb.can_tim, r && r.de_bai].filter(Boolean).join(' ').toLowerCase();
  var mon = String((kb && kb.mon) || (r && r.mon) || '').toUpperCase(), lop = String((kb && kb.lop) || (r && r.lop) || '');
  var so = function (x) { var v = parseFloat(String(x).replace(',', '.')); return isFinite(v) ? v : undefined; };
  var m;
  if (/mặt cầu/.test(t) && /oxyz|tọa độ/.test(t) && lop === '12') return {khuon: 'hai_mat_cau_oxyz', tham_so: {}};
  if (/(thẻ|lá bài|viên bi|quả bóng|\bbi\b|quả cầu)/.test(t) && (mon === 'XAC_SUAT' || /xác suất/.test(t))) {
    var bi = /viên bi|\bbi\b|quả bóng|quả cầu/.test(t), ts = {vat: bi ? 'bi' : 'the'};
    m = /(?:từ|đánh số)\s*1\s*(?:đến|tới|-)\s*(\d+)/.exec(t) || /(\d+)\s*(?:tấm\s*)?(?:thẻ|viên bi)/.exec(t);
    if (m) ts.N = Number(m[1]);
    m = /(?:lấy|chọn|rút|bốc)\s*(?:ra\s*)?(?:ngẫu nhiên\s*)?(?:đồng thời\s*|cùng lúc\s*)?(\d+)/.exec(t);
    if (m) ts.k = Number(m[1]);
    return {khuon: 'luoi_the_bi_xac_suat', tham_so: ts};
  }
  if (/(tấm|miếng|tờ)\s*(bìa|tôn|nhôm|giấy|carton|thép)|gấp\s*(?:lại\s*)?(?:thành\s*)?(?:một\s*)?(?:cái\s*)?(hộp|thùng)|cắt\s*(?:bỏ\s*)?(?:đi\s*)?(4|bốn)\s*(?:hình vuông|góc)/.test(t)) {
    m = /(\d+(?:[.,]\d+)?)\s*(?:cm|dm|m)?\s*[x×*]\s*(\d+(?:[.,]\d+)?)/.exec(t);
    if (m) return {khuon: 'tam_bia_gap_hop', tham_so: {a: so(m[1]), b: so(m[2])}};
    m = /vuông\s*(?:có\s*)?cạnh\s*(?:bằng\s*|là\s*|dài\s*)?(\d+(?:[.,]\d+)?)/.exec(t);
    return {khuon: 'tam_bia_gap_hop', tham_so: m ? {a: so(m[1]), b: so(m[1])} : {}};
  }
  if (/hình trụ|\blon\b|bồn|cốc|thùng phuy|hộp sữa|hình nón|phễu/.test(t)) {
    var tt = {loai: /hình nón|phễu/.test(t) ? 'non' : 'tru'};
    m = /(\d+(?:[.,]\d+)?)\s*(cm³|cm3|dm³|m³|lít|ml)/.exec(t);
    if (m) tt.V = so(m[1]) * (m[2] === 'lít' ? 1000 : 1);
    if (/phôi|cắt (?:nắp|đáy)/.test(t)) tt.phoi = true;
    return {khuon: 'tru_non_toi_uu', tham_so: tt};
  }
  if (/vận tốc|quãng đường|chuyển động|phanh|hãm|quỹ đạo|ném|gia tốc|tích phân|parabol/.test(t)) {
    var tp = {ten_ham: 'v'};
    m = /\b([vsh])\s*\(\s*t\s*\)\s*=\s*([-+0-9t.,^*\/() ]+?)(?=\s*\(|\s*m\/s|;|,\s|\.\s|\s+[a-zà-ỹ]|$)/.exec(t);
    if (m) { tp.ten_ham = m[1]; tp.ham = m[2].trim().replace(/,/g, '.'); }
    return {khuon: 'parabol_quy_dao', tham_so: tp};
  }
  if (/dây cáp|sợi dây|lực căng|treo/.test(t)) {
    var td = {};
    m = /(\d+(?:[.,]\d+)?)\s*(?:°|độ)/.exec(t);
    if (m) td.goc = so(m[1]);
    return {khuon: 'khung_day_cap', tham_so: td};
  }
  if (/mặt phẳng cắt|thiết diện|cắt khối|mặt cắt/.test(t)) return {khuon: 'mat_phang_cat_khoi', tham_so: {khoi: /trụ/.test(t) ? 'tru' : 'hop'}};
  if (/hình chóp|lăng trụ|tứ diện|kim tự tháp/.test(t)) return {khuon: 'chop_lang_tru', tham_so: {loai: /lăng trụ/.test(t) ? 'lang_tru_tam_giac' : /tứ diện|chóp tam giác/.test(t) ? 'chop_tam_giac' : 'chop_tu_giac'}};
  if (mon === 'XAC_SUAT') return {khuon: 'luoi_the_bi_xac_suat', tham_so: {}};
  return null;
}
var KHUON_TEN_ = ['hai_mat_cau_oxyz', 'khung_day_cap', 'tam_bia_gap_hop', 'tru_non_toi_uu', 'parabol_quy_dao', 'mat_phang_cat_khoi', 'chop_lang_tru', 'luoi_the_bi_xac_suat'];
var KHUON_BIET_DANH_ = {tam_bia: 'tam_bia_gap_hop', gap_hop: 'tam_bia_gap_hop', hinh_tru: 'tru_non_toi_uu', lon: 'tru_non_toi_uu', hinh_non: 'tru_non_toi_uu', the_so: 'luoi_the_bi_xac_suat',
  bi: 'luoi_the_bi_xac_suat', xac_suat: 'luoi_the_bi_xac_suat', parabol: 'parabol_quy_dao', do_thi: 'parabol_quy_dao', mat_cau: 'hai_mat_cau_oxyz', oxyz: 'hai_mat_cau_oxyz', day_cap: 'khung_day_cap',
  thiet_dien: 'mat_phang_cat_khoi', chop: 'chop_lang_tru', lang_tru: 'chop_lang_tru'};
function tenKhuon_(v) { var k = String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_'); return KHUON_TEN_.indexOf(k) >= 0 ? k : (KHUON_BIET_DANH_[k] || ''); }
// đặc tả tự do: sửa tên trường cũ (dinh -> diem, tam_day -> day, ds -> so) và đếm đối tượng dựng được
function suaTruong3DV_(c3) {
  var n = 0;
  (c3.doi_tuong || []).forEach(function (d) {
    if (!d) return;
    if (d.loai === 'da_giac' && !Array.isArray(d.diem) && Array.isArray(d.dinh)) { d.diem = d.dinh; delete d.dinh; }
    if ((d.loai === 'hinh_tru' || d.loai === 'hinh_non') && d.day === undefined && d.tam_day !== undefined) { d.day = d.tam_day; delete d.tam_day; }
    if (d.loai === 'nhom_lap' && !(Number(d.so) > 0) && Array.isArray(d.ds) && d.ds.length) d.so = d.ds.length;
    var ok = d.loai === 'nhom_lap' ? Number(d.so) > 0 : d.loai === 'da_giac' ? Array.isArray(d.diem) && d.diem.length >= 3 :
      (d.loai === 'hinh_tru' || d.loai === 'hinh_non') ? Number(d.ban_kinh) > 0 && Number(d.cao) !== 0 && isFinite(Number(d.cao)) :
      d.loai === 'mat_cau' ? Number(d.ban_kinh) > 0 : d.loai === 'hinh_hop' ? Array.isArray(d.kich_thuoc) && d.kich_thuoc.length === 3 : true;
    if (ok) n++;
  });
  return n;
}
function dong3DV_(c3) {
  var bs = (c3.buoc || []).filter(Boolean);
  // v92: phải đổi hình ở >= 3 bước (hành động cũng tính) -> một lần gập rồi đứng im suốt bài không lọt qua
  return bs.filter(function (b) { return (b.hien && b.hien.length) || (b.an && b.an.length) || b.camera || (b.nhan_manh && b.nhan_manh.length) || (Array.isArray(b.hanh_dong) && b.hanh_dong.length); }).length >= 3;
}

// v91+v92: chuẩn hóa kb.khung4tang (khớp src/3d-vector/dac_ta.ts + khuon/). Luồng hình học thuần: gỡ (khóa luồng).
function tuSuaKhung4Tang_(kb, r) {
  var sua = [];
  if (!kb || kb.khung4tang === undefined) return sua;
  if (kb.luong === 'hinh_hoc_thuan' || String(kb.mon || '').toUpperCase() === 'HINH_HOC' || (r && typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r))) {
    delete kb.khung4tang; delete kb.bo_dung; sua.push('gỡ khung4tang (luồng hình học thuần)'); return sua;
  }
  var k4 = kb.khung4tang;
  if (!k4 || typeof k4 !== 'object' || !Array.isArray(k4.buoc)) { delete kb.khung4tang; delete kb.bo_dung; sua.push('khung4tang hỏng -> phải viết lại (v99.1 không còn đường dựng cũ)'); return sua; }
  var dsMau = typeof MAU_3DV_ !== 'undefined' ? MAU_3DV_ : ['cyan', 'vang', 'hong', 'ngoc', 'trang', 'xam'];
  var mau3 = function (m, md) { var k = String(m || '').trim().toLowerCase().replace(/\s+/g, '_'); k = MAU_3DV_GAN_[k] || k; return dsMau.indexOf(k) >= 0 ? k : md; };
  // v95: phụ đề gọn 1 dòng MẶC ĐỊNH BẬT trên khung 4 tầng; chỉ tắt khi CAU_HINH PHU_DE_4TANG = TAT
  k4.phu_de = String((typeof cauHinh_ === 'function' && cauHinh_('PHU_DE_4TANG')) || '').toUpperCase() === 'TAT' ? 'tat' : 'gon';
  k4.de_ghim = (Array.isArray(k4.de_ghim) ? k4.de_ghim : []).filter(function (d) { return d && String(d.nhan || '').trim(); }).slice(0, 5).map(function (d, i) {
    var o = {id: String(d.id || ('d' + i)), nhan: suaTexHienThi_(String(d.nhan))};
    if (d.mau) o.mau = mau3(d.mau, 'hong');
    return o;
  });
  var idDe = {};
  k4.de_ghim.forEach(function (d) { idDe[d.id] = 1; });
  // số của đáp án không có trong đề -> không được hiện ở tiêu đề bước (lộ đáp số trước khi tính xong)
  var deTxt = String(kb.de_bai || (r && r.de_bai) || '');
  var soDap = (String(kb.dap_an_cuoi || kb.dap_an || '').match(/\d+(?:[.,]\d+)?/g) || []).filter(function (x) { return !new RegExp('(^|[^\\d.,])' + x.replace(/[.]/g, '\\.') + '(?![\\d.,])').test(deTxt); });
  var loiCanh = (kb.canh || []).map(function (c) { return String((c && c.loi_thoai) || '').toLowerCase(); });
  var toiUu = /lớn nhất|nhỏ nhất|tối đa|tối thiểu|ít nhất|nhiều nhất|gtln|gtnn/i.test(deTxt);
  var tenHam = (JSON.stringify(kb).match(/([A-Za-z])'\s*\(\s*([a-z])\s*\)/) || []);
  var truoc = k4.buoc.length, demThe = 0, demTd = 0, demCasio = 0;
  var soBuocK4 = k4.buoc.filter(function (b) { return b && typeof b === 'object'; }).length;
  k4.buoc = k4.buoc.filter(function (b) { return b && typeof b === 'object'; }).map(function (b, j) {
    b.mau = mau3(b.mau, ['cyan', 'vang', 'hong', 'ngoc'][j % 4]);
    // v99.2: T1 đã có viên thuốc "BƯỚC n" -> nhãn phụ KHÔNG lặp "Bước n" (từng hiện "BƯỚC 2 | BƯỚC 1"); rỗng -> tên pha ngắn / trống
    var nhanGoc = String(b.nhan || '').trim();
    b.nhan = nhanPhuBuoc_(nhanGoc, j, soBuocK4);
    // tiêu đề dự phòng KHÔNG dùng "Bước n" (viên thuốc đã ghi số): nhãn pha -> cụm lời đọc khi_noi -> "Kết luận" / "Lời giải"
    var kn = String(b.khi_noi || '').trim();
    if (!String(b.tieu_de || '').trim()) b.tieu_de = b.nhan || (kn ? kn.charAt(0).toUpperCase() + kn.slice(1) : (j === soBuocK4 - 1 ? 'Kết luận' : 'Lời giải'));
    soDap.forEach(function (x) {
      var re = new RegExp('(^|[^\\d.,])' + x.replace(/[.]/g, '\\.') + '(?![\\d.,])', 'g');
      if (re.test(b.tieu_de)) { b.tieu_de = b.tieu_de.replace(re, '$1?'); demTd++; }
    });
    b.tieu_de = b.tieu_de.replace(/\?(?:\s*[\/:,.]\s*\?)+/g, '?');   // "31/44" -> "?" (không thành "?/?")
    b.tieu_de = b.tieu_de.replace(/(biến cố đối)\s+([A-Z])(?![\w'])/gi, '$1 \\overline{$2}');   // ký hiệu biến cố đối đúng
    // bước chưa ghi cảnh: tìm cảnh chứa khi_noi (để chuanbi.py khớp mốc trong đúng cảnh)
    if (b.canh === undefined && b.khi_noi) {
      var kn = String(b.khi_noi).toLowerCase(), ic = -1;
      loiCanh.forEach(function (l, i) { if (ic < 0 && l.indexOf(kn) >= 0) ic = i; });
      if (ic >= 0) b.canh = ic + 1;
    }
    b.du_kien = (Array.isArray(b.du_kien) ? b.du_kien : []).map(String).filter(function (x) { return idDe[x]; });
    b.the = (Array.isArray(b.the) ? b.the : []).filter(function (t) { return t && /^(cong_thuc|casio|bang_bien_thien|chu)$/.test(t.loai); }).map(function (t) {
      if (t.loai === 'cong_thuc') t.dong = (Array.isArray(t.dong) ? t.dong : []).map(suaTexHienThi_).filter(Boolean).slice(0, 4);
      if (t.loai === 'bang_bien_thien' && !t.ham && tenHam[1]) { t.ham = tenHam[1]; t.bien = t.bien || tenHam[2]; }
      // tìm GTLN/GTNN bằng SHIFT SOLVE ra thẳng cực trị là SAI -> bảng giá trị MENU 8
      if (t.loai === 'casio' && toiUu && Array.isArray(t.phim) && t.phim.join(' ').toUpperCase().indexOf('SOLVE') >= 0 && !/=\s*0|f'|'\(/.test(JSON.stringify(t))) {
        t.phim = ['MENU', '8', 'f(X)', '=']; demCasio++;
      }
      return t;
    }).filter(function (t) { return t.loai !== 'cong_thuc' || t.dong.length; });
    if (b.the.length < 2) demThe++;
    return b;
  });
  if (k4.buoc.length < truoc) sua.push('khung4tang: bỏ ' + (truoc - k4.buoc.length) + ' bước hỏng');
  if (demTd) sua.push('khung4tang: che ' + demTd + ' đáp số lộ ở tiêu đề bước');
  if (demCasio) sua.push('khung4tang: đổi ' + demCasio + ' thẻ Casio SHIFT SOLVE -> MENU 8 (bảng giá trị)');
  if (demThe) sua.push('khung4tang: ' + demThe + ' bước ít hơn 2 thẻ (chuanbi.py lấy thêm thẻ từ màn hình cảnh)');
  // ---- 3D: luôn ánh xạ về khuôn tham số, hoặc đặc tả tự do hợp lệ + CÓ chuyển động ----
  // v96: định tuyến sân khấu MỘT lần (SanKhau.gs): 2D (xác suất / kinh tế / chuyển động 2D / tăng trưởng / tư duy) hoặc 3D
  if (typeof tuSuaSanKhau_ === 'function') sua = sua.concat(tuSuaSanKhau_(kb, r));
  var coDoiChieuVatThe_ = function (buoc) {
    return (Array.isArray(buoc) ? buoc : []).some(function (b) {
      var d = b && b.doi_chieu;
      if (!d || typeof d !== 'object') return false;
      var ts = d.tham_so || {}, mien = d.mien || [];
      var phai = typeof d.ham === 'string' && d.ham.trim() && mien.length === 2 && isFinite(+mien[0]) && isFinite(+mien[1]) && +mien[1] > +mien[0];
      var trai = +mien[0] >= 0 && ((d.hinh === 'tam_bia' && +ts.a > 0 && +mien[1] <= Math.min(+ts.a, +(ts.b == null ? ts.a : ts.b)) / 2 + 1e-6) ||
        (d.hinh === 'mat_cat_tru' && +ts.V > 0) || (d.hinh === 'tam_giac_luc' && +mien[1] <= 89));
      return trai && phai;
    });
  };
  var chuyenNhanhTrucQuan2D_ = function (lyDo) {
    var monChuyen = String((kb && kb.mon) || (r && r.mon) || '').toUpperCase();
    var laNgan = kb.kieu_video !== 'DAI_10_PHUT' && !/-10P$/i.test(String(kb.id || (r && r.id) || ''));
    if (!laNgan || (monChuyen === 'HINH_HOC' || kb.luong === 'hinh_hoc_thuan')) return false;
    delete k4.canh_3d_vector;
    if (coDoiChieuVatThe_(k4.buoc)) {
      sua.push('3D Vector (' + lyDo + '): giữ nhánh đối chiếu có vật thể co giãn (DoiChieu)');
      return true;
    }
    var sk = k4.san_khau || {};
    if (sk.loai === 'so_do_2d' && ['song_bo', 'day_cap', 'cong_parabol', 'rao_tuong', 'thang_tuong'].indexOf((sk.tham_so || {}).mau) >= 0) {
      sua.push('3D Vector (' + lyDo + '): giữ sân khấu so_do_2d');
      return true;
    }
    kb.san_khau_dich = 'tu_sinh_svg';
    if (k4.san_khau && k4.san_khau.loai !== 'tu_sinh_svg') delete k4.san_khau;
    sua.push('3D Vector (' + lyDo + ') -> tự chuyển tuyến sang tu_sinh_svg (kho_manh_svg/ve25d), không ép 8 khuôn 3D');
    return true;
  };
  var c3 = k4.canh_3d_vector;
  var suy = k4.san_khau || (k4.tu_sinh || {}).ma || kb.san_khau_dich === 'tu_sinh_svg' ? null : suyKhuon_(kb, r);
  if (k4.san_khau || (k4.tu_sinh || {}).ma || kb.san_khau_dich === 'tu_sinh_svg') { /* v96/v102: sân khấu 2D / 2.5D đã chọn -> bỏ qua khuôn 3D */ }
  else if (c3 && typeof c3 === 'object' && tenKhuon_(c3.khuon)) {
    c3.khuon = tenKhuon_(c3.khuon);
    if (!c3.tham_so || typeof c3.tham_so !== 'object') c3.tham_so = (suy && suy.khuon === c3.khuon && suy.tham_so) || {};
    delete c3.doi_tuong;
  } else if (c3 && typeof c3 === 'object' && Array.isArray(c3.doi_tuong)) {
    var loai = typeof LOAI_3DV_ !== 'undefined' ? LOAI_3DV_ : ['diem', 'doan_thang', 'vector', 'da_giac', 'hinh_hop', 'mat_cau', 'hinh_tru', 'hinh_non', 'hinh_chop', 'duong_cong', 'goc', 'nhom_lap'];
    var nDT = c3.doi_tuong.length, id = {};
    c3.doi_tuong = c3.doi_tuong.filter(function (d) {
      if (!d || !d.id || loai.indexOf(d.loai) < 0 || id[d.id]) return false;
      id[d.id] = 1;
      return true;
    });
    c3.doi_tuong.forEach(function (d) { if (d.mau) d.mau = mau3(d.mau, 'cyan'); if (typeof d.nhan === 'string') d.nhan = suaTexHienThi_(d.nhan); });
    var dung = suaTruong3DV_(c3);
    if (c3.doi_tuong.length < nDT) sua.push('3D Vector: bỏ ' + (nDT - c3.doi_tuong.length) + ' đối tượng sai loại/trùng id');
    (Array.isArray(c3.buoc) ? c3.buoc : []).forEach(function (b) {
      if (!b) return;
      ['hien', 'an', 'nhan_manh'].forEach(function (k) { if (Array.isArray(b[k])) b[k] = b[k].filter(function (x) { return id[x]; }); });
      if (Array.isArray(b.hanh_dong)) b.hanh_dong = b.hanh_dong.filter(function (h) { return h && id[h.vat] && /^(truot_diem|tach_vector|gap_mat|dich|ve_dan|nang)$/.test(h.loai); });
    });
    if (!c3.phien_ban) c3.phien_ban = 1;
    if (!dung || !dong3DV_(c3)) {
      if (suy) { k4.canh_3d_vector = suy; sua.push('3D Vector: đặc tả ' + (dung ? 'đứng im' : 'không còn đối tượng dựng được') + ' -> khuôn ' + suy.khuon); }
      else if (!chuyenNhanhTrucQuan2D_(dung ? 'đứng im' : 'rỗng')) {
        sua.push('KHUNG4TANG_3D_RONG: đặc tả 3D ' + (dung ? 'đứng im' : 'rỗng') + ' và không suy được khuôn từ đề; viết lại canh_3d_vector bằng một trong 8 khuôn ({"khuon","tham_so","pha"}).');
      }
    } else if (suy) c3.khuon_du_phong = suy;
  } else if (suy) {
    k4.canh_3d_vector = suy; sua.push('3D Vector: thiếu đặc tả -> khuôn ' + suy.khuon + ' suy từ đề');
  } else if (!chuyenNhanhTrucQuan2D_('không khớp 8 khuôn 3D')) {
    delete k4.canh_3d_vector;
    sua.push('KHUNG4TANG_3D_RONG: thiếu canh_3d_vector và không suy được khuôn từ đề; thêm {"khuon","tham_so","pha"} theo một trong 8 khuôn.');
  }
  if (!k4.buoc.length) { delete kb.khung4tang; delete kb.bo_dung; sua.push('khung4tang không còn bước -> phải viết lại'); return sua; }
  sua = sua.concat(tuSuaToanV95_(kb));
  sua = sua.concat(tuSuaDuoiV983_(kb));   // v98.3: đuôi sau đáp án <= 6 s TRƯỚC khi suy CTA từ lời
  sua = sua.concat(tuSuaMocCau_(kb, r));
  kb.bo_dung = '3d_vector';
  return sua;
}

// v93: INTRO MÓC CÂU / OUTRO TÓM TẮT 3 BƯỚC / ĐỐI CHIẾU HÌNH ↔ ĐỒ THỊ — mọi trường đều TÙY CHỌN: thiếu thì tự sinh,
// dài thì cắt ở ranh giới từ cho vừa bố cục (tiêu đề intro ≤ 2 dòng, mỗi dòng tóm tắt 1 dòng), số đáp án bị che "?".
// Không bao giờ tạo lỗi cứng: kịch bản v92 cũ vẫn dựng như trước (chuanbi.py còn tự sinh lần nữa nếu thiếu).
var DAI_MOC_CAU_ = {nhan_thi: 28, tieu_de_intro: 44, phu_de_intro: 36, cau_hook: 40, cta: 18, chien_thuat: 18, cong_thuc: 56};
var HOOK_MOC_CAU_ = {
  '12': ['MUỐN 9+ THI THPT KHÔNG THỂ BỎ QUA!', 'SAI 1 BƯỚC LÀ MẤT ĐIỂM!', 'DẠNG HAY GẶP TRONG ĐỀ THI!'],
  '9': ['MUỐN ĐỖ VÀO 10 PHẢI NẮM DẠNG NÀY!', 'SAI 1 BƯỚC LÀ MẤT ĐIỂM!', '3 BƯỚC LÀ RA ĐÁP ÁN!'],
  '': ['MUỐN 9+ THI KÌ KHÔNG THỂ BỎ QUA!', 'SAI 1 BƯỚC LÀ MẤT ĐIỂM!', '3 BƯỚC LÀ RA ĐÁP ÁN!']
};
function catTuMocCau_(x, max) {
  x = String(x || '').replace(/\s+/g, ' ').trim();
  if (!max || x.length <= max) return x;
  if (/[\\{}^_$]/.test(x)) x = bocTexSangChu_(x);
  if (x.length <= max) return x;
  // v96: cụm "không ⋮ 4" là MỘT ý — bỏ bớt từ thường đứng trước cụm thay vì cắt còn "tích không" (mất nghĩa)
  var m = /không\s*⋮\s*\d+/i.exec(x);
  if (m) {
    var dau = x.slice(0, m.index).trim().split(/\s+/).filter(Boolean), sau = x.slice(m.index + m[0].length);
    while (dau.length && (dau.concat([m[0]]).join(' ') + sau).length > max && !/:$/.test(dau[dau.length - 1])) dau.pop();
    var y = (dau.concat([m[0]]).join(' ') + sau).trim();
    if (y.length <= max) return y;
  }
  var cat = catTheoTu_(x, max).replace(/\s+không$/i, '');
  return cat || x.split(' ')[0];
}
// bỏ mã TeX ($, \lệnh, {}, ^, _) -> chữ thường sạch; hoa = in hoa
function chuSachMocCau_(s, max, hoa) {
  var x = bocTexSangChu_(s);
  if (hoa !== false) x = x.toUpperCase();
  return max ? catTuMocCau_(x, max) : x;
}
function cheDapSoMocCau_(s, kb) {
  var mau = typeof mauDapSoLo_ === 'function' ? mauDapSoLo_(kb) : [];
  s = String(s || '');
  // mẫu có nhóm (^|...) ở đầu thì giữ lại ký tự đứng trước; mẫu không nhóm (frac{a}{b}) -> tham số thứ 2 là vị trí (số)
  mau.forEach(function (re) { s = s.replace(new RegExp(re.source, 'g' + (re.ignoreCase ? 'i' : '')), function (m, g1) { return (typeof g1 === 'string' ? g1 : '') + '?'; }); });
  return s.replace(/\?(?:\s*[\/:,.]\s*\?)+/g, '?');
}
function congThucGonMocCau_(tex) {
  var s = String(tex || '').replace(/\s+/g, ' ').replace(/^\$+|\$+$/g, '').trim();
  if (s.length <= DAI_MOC_CAU_.cong_thuc || /[\\{}^_]/.test(s)) return s;
  var ve = s.split('=').map(function (v) { return v.trim(); }).filter(function (v) { return v; });
  while (ve.length > 2) ve.shift();
  s = ve.join(' = ');
  return s.length <= DAI_MOC_CAU_.cong_thuc ? s : catGonTex_(ve[ve.length - 1], DAI_MOC_CAU_.cong_thuc);
}
// v102: gắn ĐÚNG nhãn chuyên đề ở dòng phụ Intro (phu_de_intro) / chu_de_ngan theo bản chất đề:
//  - "TỐI ƯU" CHỈ khi đề thật sự tìm GTLN / GTNN / cực trị / "nhất"; bài tốc độ biến thiên / thang trượt -> "TỐC ĐỘ BIẾN THIÊN";
//  - bài hình không gian hỏi khoảng cách d(A, (P)) -> "KHOẢNG CÁCH" (không gắn nhầm "SONG SONG").
function loaiChuyenDe_(kb) {
  var van = [kb && kb.de_bai, kb && kb.can_tim, kb && kb.chu_de].map(function (x) { return String(x || ''); }).join(' ');
  var toiUu = /lớn\s*nhất|nhỏ\s*nhất|GTLN|GTNN|cực\s*(?:đại|tiểu|trị)|tối\s*ưu|ngắn\s*nhất|dài\s*nhất|tiết\s*kiệm\s*nhất|nhiều\s*nhất|ít\s*nhất|rẻ\s*nhất|lợi\s*nhuận\s*cao\s*nhất/i.test(van);
  var tocDo = /tốc\s*độ|vận\s*tốc|biến\s*thiên|đang\s*(?:trượt|giảm|tăng|chảy|rơi)|trượt\s*xuống|tại\s*thời\s*điểm|thang\s*(?:dài|trượt|dựa)/i.test(van);
  var khoangCach = /khoảng\s*cách|d\s*\(\s*[A-Z]+\s*,/i.test(van);
  var khongGian = /hình\s*chóp|lăng\s*trụ|hình\s*hộp|tứ\s*diện|mặt\s*phẳng|\(\s*[A-Z]{3,4}\s*\)|hình\s*lập\s*phương/i.test(van);
  var ten = '';
  if (khongGian && khoangCach) ten = 'KHOẢNG CÁCH';
  else if (tocDo && !toiUu) ten = 'TỐC ĐỘ BIẾN THIÊN';
  return {toiUu: toiUu, tocDo: tocDo, khoangCach: khoangCach, khongGian: khongGian, ten: ten};
}
function chuanNhanChuyenDe_(kb) {
  var lc = loaiChuyenDe_(kb), sua = [];
  ['phu_de_intro', 'chu_de_ngan'].forEach(function (k) {
    var s = kb[k];
    if (typeof s !== 'string' || !s) return;
    var m = s;
    if (!lc.toiUu && /TỐI\s*ƯU/i.test(m)) {
      var thay = lc.ten === 'KHOẢNG CÁCH' ? 'KHOẢNG CÁCH' : lc.tocDo ? 'TỐC ĐỘ BIẾN THIÊN' : 'ỨNG DỤNG ĐẠO HÀM';
      m = m.replace(/TỐI\s*ƯU(?:\s*(?:ĐỜI\s*THƯỜNG|HÓA))?/i, thay);
    }
    if (lc.ten === 'KHOẢNG CÁCH' && /SONG\s*SONG/i.test(m) && !/chứng\s*minh[^.?]*song\s*song/i.test(String(kb.de_bai || ''))) m = m.replace(/SONG\s*SONG/i, 'KHOẢNG CÁCH');
    if (k === 'phu_de_intro') m = m.replace(/(KHOẢNG CÁCH)(?:\s*·\s*\1)+/g, '$1').replace(/(TỐC ĐỘ BIẾN THIÊN)(?:\s*·\s*\1)+/g, '$1');
    if (m !== s) { kb[k] = catTheoTu_(bocTexSangChu_(m), k === 'phu_de_intro' ? DAI_MOC_CAU_.phu_de_intro : 40); sua.push('v102: nhãn chuyên đề ' + k + ' -> "' + kb[k] + '"'); }
  });
  return sua;
}
function tuSuaMocCau_(kb, r) {
  var sua = [];
  var k4 = kb.khung4tang || {};
  var lop = String(kb.lop || (r && r.lop) || '').trim();
  // 1. viên thuốc ngữ cảnh thi
  var nt = chuSachMocCau_(kb.nhan_thi, DAI_MOC_CAU_.nhan_thi);
  if (!nt) { nt = lop === '9' ? 'ÔN THI VÀO 10' : lop === '12' ? 'ÔN THI THPT · LỚP 12' : (lop ? 'LUYỆN THI · LỚP ' + lop : 'LUYỆN THI'); sua.push('tự điền nhan_thi'); }
  kb.nhan_thi = nt;
  // 2. tiêu đề intro: tối đa 2 dòng (≤ 40 ký tự, bỏ từ dài > 22 ký tự), che số đáp án
  var td = '', nguon = [kb.tieu_de_intro, kb.hook_chu, kb.tieu_de_bia, kb.tieu_de, kb.chu_de];
  for (var i = 0; i < nguon.length && td.length < 6; i++) {
    td = chuSachMocCau_(cheDapSoMocCau_(nguon[i], kb));
  }
  if (td !== String(kb.tieu_de_intro || '')) sua.push(kb.tieu_de_intro ? 'cắt gọn/che số tieu_de_intro' : 'tự điền tieu_de_intro');
  // v95: tiêu đề đúng bản chất toán — bài hộp cắt 4 góc NHƯ NHAU không được hỏi "cắt góc nào" (khớp khung4tang_v95.py)
  var baiHop = String(((k4.canh_3d_vector || {}).khuon) || '') === 'tam_bia_gap_hop' || /cắt\s*(bỏ\s*)?(ở\s*)?(bốn|4)\s*góc/i.test(String(kb.de_bai || ''));
  if (baiHop && /góc\s*nào/i.test(td)) {
    td = 'CẮT CẠNH BAO NHIÊU ĐỂ HỘP ' + (/nhỏ\s*nhất/i.test(String(kb.de_bai || '')) ? 'NHỎ NHẤT' : 'LỚN NHẤT') + '?';
    sua.push('v95: tiêu đề intro bài hộp -> "' + td + '"');
  }
  kb.tieu_de_intro = td || 'GIẢI NHANH BÀI TOÁN';
  // 3. dòng phụ chuyên đề
  var pd = chuSachMocCau_(cheDapSoMocCau_(kb.phu_de_intro, kb));
  if (kb.phu_de_intro === undefined) {
    var phan = [], cd = chuSachMocCau_(kb.chu_de_ngan || kb.chu_de || '', 22);
    if (cd) phan.push(cd);
    (k4.buoc || []).forEach(function (b) {
      var n = chuSachMocCau_(b && b.nhan, 14);
      if (n && !/^(ĐỀ BÀI|ĐỀ|BƯỚC\s*\d+|KẾT LUẬN|DỰNG HÌNH|ĐÁP SỐ|ĐÁP ÁN|TÓM TẮT)$/.test(n) && phan.indexOf(n) < 0 && n.indexOf('?') < 0) phan.push(n);
    });
    while (phan.length && phan.join(' · ').length > DAI_MOC_CAU_.phu_de_intro) phan.pop();
    pd = phan.slice(0, 3).join(' · ');
    if (pd) sua.push('tự điền phu_de_intro');
  }
  kb.phu_de_intro = pd;
  sua = sua.concat(chuanNhanChuyenDe_(kb));   // v102: nhãn TỐI ƯU / SONG SONG đúng bản chất đề
  // 4. câu hook tâm lý + 5. CTA
  var hk = chuSachMocCau_(cheDapSoMocCau_(kb.cau_hook, kb), DAI_MOC_CAU_.cau_hook);
  if (hk.length < 6) {
    var ds = HOOK_MOC_CAU_[lop] || HOOK_MOC_CAU_[''], h = 0, id = String(kb.id || kb.de_bai || '');
    for (var j = 0; j < id.length; j++) h = (h * 31 + id.charCodeAt(j)) % 9973;
    hk = ds[h % ds.length]; sua.push('tự điền cau_hook');
  }
  kb.cau_hook = hk;
  // v95: CTA = nhãn ngữ nghĩa của LỜI ĐỌC cảnh cuối (nút ghi gì thì giọng kêu gọi đúng điều đó); lời cuối thiếu câu kêu gọi
  // -> thêm câu khớp nhãn cta vào cuối lời thoại cảnh kết
  var ctaLoi = ctaTuLoi_(loiCanhKet_(kb));
  if (ctaLoi) kb.cta = ctaLoi;
  else {
    kb.cta = ctaTuLoi_(kb.cta) || 'LƯU LẠI NGAY!';
    var ck = kb.canh && kb.canh.length ? kb.canh[kb.canh.length - 1] : null;
    if (ck && typeof ck.loi_thoai === 'string') {
      ck.loi_thoai = ck.loi_thoai.replace(/\s*$/, '') + (/[.!?]$/.test(ck.loi_thoai.trim()) ? ' ' : '. ') + (CAU_CTA_[kb.cta] || CAU_CTA_['LƯU LẠI NGAY!']);
      sua.push('v95: thêm câu kêu gọi khớp nút "' + kb.cta + '" vào lời cảnh cuối');
    }
  }
  // 6. tóm tắt 3 bước: mỗi dòng 1 dòng (tên chiến thuật ≤ 18 ký tự, công thức ≤ 56 ký tự TeX); thiếu -> rút từ các bước giải
  var tt = (Array.isArray(kb.tom_tat_3_buoc) ? kb.tom_tat_3_buoc : []).map(function (d) {
    if (typeof d === 'string') return {chien_thuat: chuSachMocCau_(d, DAI_MOC_CAU_.chien_thuat, false), cong_thuc: ''};
    return d && typeof d === 'object' ? {chien_thuat: chuSachMocCau_(d.chien_thuat, DAI_MOC_CAU_.chien_thuat, false), cong_thuc: congThucGonMocCau_(d.cong_thuc)} : null;
  }).filter(function (d) { return d && d.chien_thuat; });
  if (tt.length < 2) {
    var ung = (k4.buoc || []).slice((k4.buoc || []).length >= 4 ? 1 : 0);
    var ct = function (b) {
      var the = (b && b.the) || [];
      for (var q = the.length - 1; q >= 0; q--) {
        if (the[q] && the[q].loai === 'cong_thuc' && Array.isArray(the[q].dong) && the[q].dong.length) return String(the[q].dong[the[q].dong.length - 1]);
        if (the[q] && the[q].loai === 'casio' && the[q].ket_qua) return String(the[q].ket_qua);
      }
      return '';
    };
    var co = ung.filter(function (b) { return ct(b); });
    if (co.length > 3 && /kết luận|đáp/i.test(String(co[co.length - 1].nhan || ''))) co.pop();
    if (co.length > 3) co = [co[0], co[Math.floor(co.length / 2)], co[co.length - 1]];
    var chon = co.concat(ung.filter(function (b) { return co.indexOf(b) < 0; })).slice(0, 3);
    chon.sort(function (a, b) { return ung.indexOf(a) - ung.indexOf(b); });
    tt = chon.map(function (b) { return {chien_thuat: chuSachMocCau_(b.nhan || b.tieu_de, DAI_MOC_CAU_.chien_thuat, false), cong_thuc: congThucGonMocCau_(ct(b))}; })
      .filter(function (d) { return d.chien_thuat; });
    if (tt.length >= 2) sua.push('tự điền tom_tat_3_buoc');
  }
  // v95: LUÔN đủ 3 dòng (bù từ các bước chưa dùng, rồi dòng đáp số, rồi dòng chiến thuật chuẩn) -> Outro không hổng
  if (tt.length < 3) {
    var dung = tt.map(function (d) { return String(d.chien_thuat).toLowerCase(); });
    var trungNghia = function (c) { c = c.toLowerCase(); return dung.some(function (x) { return x.indexOf(c) >= 0 || c.indexOf(x) >= 0; }); };   // "Lập hàm" ~ "Lập hàm thể tích"
    var ctB = function (b) {
      var the = (b && b.the) || [];
      for (var q = the.length - 1; q >= 0; q--) {
        if (the[q] && the[q].loai === 'cong_thuc' && Array.isArray(the[q].dong) && the[q].dong.length) return String(the[q].dong[the[q].dong.length - 1]);
        if (the[q] && the[q].loai === 'casio' && the[q].ket_qua) return String(the[q].ket_qua);
      }
      return '';
    };
    // ưu tiên bước giữa có công thức (đạo hàm / xét dấu), bỏ bước đề bài / kết luận (đáp số đã ở đầu Outro)
    var ungB = (k4.buoc || []).slice(1).filter(function (b) { return b && !/kết\s*luận|đáp|đề\s*bài/i.test(String(b.nhan || '')); });
    ungB.sort(function (a, b) { return (ctB(a) ? 0 : 1) - (ctB(b) ? 0 : 1); });
    ungB.forEach(function (b) {
      if (tt.length >= 3) return;
      var c2 = chuSachMocCau_(b.nhan || b.tieu_de, DAI_MOC_CAU_.chien_thuat, false);
      if (c2 && !trungNghia(c2) && c2.indexOf('?') < 0) { tt.push({chien_thuat: c2, cong_thuc: congThucGonMocCau_(ctB(b))}); dung.push(c2.toLowerCase()); }
    });
    if (tt.length < 3 && kb.dap_an_cuoi) tt.push({chien_thuat: 'Chốt đáp số', cong_thuc: congThucGonMocCau_(String(kb.dap_an_cuoi))});
    var md3 = ['Đặt ẩn, tìm điều kiện', 'Lập hàm cần tối ưu', 'Xét dấu, chốt cực trị'];
    while (tt.length < 3) tt.push({chien_thuat: md3[tt.length], cong_thuc: ''});
    sua.push('v95: bù đủ 3 dòng tom_tat_3_buoc');
  }
  kb.tom_tat_3_buoc = tt.slice(0, 3);
  // 7. đối chiếu Hình ↔ Đồ thị: kiểm hình dạng dữ liệu; sai một chỗ -> bỏ (tầng 2 giữ sân khấu 3D chuẩn)
  (k4.buoc || []).forEach(function (b, jb) {
    if (!b || b.doi_chieu === undefined) return;
    var d = b.doi_chieu, ok = d && typeof d === 'object' && typeof d.ham === 'string' && d.ham.length <= 120 &&
      /^[-+*\/^().,0-9a-zπ\s]+$/i.test(d.ham) && Array.isArray(d.mien) && d.mien.length === 2 &&
      isFinite(Number(d.mien[0])) && isFinite(Number(d.mien[1])) && Number(d.mien[1]) > Number(d.mien[0]);
    if (ok && d.nguong !== undefined && d.nguong !== null) ok = typeof d.nguong === 'object' && isFinite(Number(d.nguong.gia_tri)) && (d.nguong.kieu === '<=' || d.nguong.kieu === '>=');
    if (ok && d.toi_uu !== undefined && d.toi_uu !== null) ok = isFinite(Number(d.toi_uu)) && Number(d.toi_uu) >= Number(d.mien[0]) && Number(d.toi_uu) <= Number(d.mien[1]);
    if (!ok) { delete b.doi_chieu; sua.push('bỏ doi_chieu bước ' + (jb + 1) + ' (dữ liệu hàm/miền/ngưỡng không hợp lệ -> giữ 3D)'); return; }
    d.mien = [Number(d.mien[0]), Number(d.mien[1])];
    d.kieu = d.kieu === 'min' ? 'min' : 'max';
    if (['tam_bia', 'mat_cat_tru', 'tam_giac_luc', 'thanh'].indexOf(d.hinh) < 0) d.hinh = 'thanh';
  });
  return sua;
}

/* ===================== v95: CHUẨN TOÁN + NHỊP KHUNG 4 TẦNG ===================== */
// Bậc của hàm một biến (đọc từ LaTeX/biểu thức đơn giản) bằng sai phân hữu hạn: 'bac2' | 'bac01' | 'khac' | null (không đọc được).
function texSangBieuThuc_(tex) {
  var s = String(tex || '').replace(/\\left|\\right|\\,|\\;|\\!|\s+/g, '');
  for (var k = 0; k < 4; k++) s = s.replace(/\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, 'Math.sqrt($1)').replace(/\\(cdot|times)/g, '*').replace(/\\pi/g, 'PI').replace(/π/g, 'PI')
    .replace(/[−–]/g, '-').replace(/\^\{([^{}]+)\}/g, '^($1)').replace(/\{|\}/g, '');
  return s;
}
function bacHam_(bieuThuc, bien) {
  var s = texSangBieuThuc_(bieuThuc), b = bien || 'x';
  if (!s || s.length > 140) return null;
  // biến -> X (chỉ khi không dính chữ thường; "PI" viết hoa nên 2\pi r -> 2PIX), Math.sqrt giữ chỗ bằng "Q"
  s = s.replace(/Math\.sqrt/g, 'Q').replace(new RegExp('(?<![a-z])' + b + '(?![a-z])', 'g'), 'X');
  if (!/^[-+*\/^().0-9XPIQ]+$/.test(s)) return null;
  s = s.replace(/(\d|X|\)|PI)(?=\(|X|PI|Q)/g, '$1*').replace(/(X|\)|PI)(?=\d)/g, '$1*')
    .replace(/(^|[(*\/+-])-(?=[X\d(PQ])/g, '$1(-1)*')   // "-x^2" -> "(-1)*X**2" (JS cấm "-X**2")
    .replace(/\^/g, '**').replace(/Q/g, 'Math.sqrt');
  var f;
  try { f = new Function('X', 'PI', 'return ' + s); f(1.3, Math.PI); } catch (e) { return null; }
  var h = 0.37, x0 = 0.61, v = [];
  for (var i = 0; i < 5; i++) { var y = f(x0 + i * h, Math.PI); if (!isFinite(y)) return 'khac'; v.push(y); }
  var d1 = [], d2 = [], d3 = [];
  for (i = 0; i < 4; i++) d1.push(v[i + 1] - v[i]);
  for (i = 0; i < 3; i++) d2.push(d1[i + 1] - d1[i]);
  for (i = 0; i < 2; i++) d3.push(d2[i + 1] - d2[i]);
  var thang = Math.max(1, Math.abs(v[0]), Math.abs(v[4]));
  var gan0 = function (u) { return Math.abs(u) < 1e-7 * thang; };
  if (gan0(d2[0]) && gan0(d2[1]) && gan0(d2[2])) return 'bac01';
  if (gan0(d3[0]) && gan0(d3[1])) return 'bac2';
  return 'khac';
}
// hàm chính của bài: doi_chieu.ham -> khuôn (hộp gập / trụ tối ưu luôn KHÔNG bậc 2) -> dòng "V(x) = ..." trên màn hình / thẻ
function loaiHamChinh_(kb) {
  var k4 = kb.khung4tang || {}, i;
  var buoc = Array.isArray(k4.buoc) ? k4.buoc : [];
  for (i = 0; i < buoc.length; i++) if (buoc[i] && buoc[i].doi_chieu && buoc[i].doi_chieu.ham) {
    var q = bacHam_(String(buoc[i].doi_chieu.ham).replace(/\*\*/g, '^'), buoc[i].doi_chieu.bien || 'x');
    if (q) return q;
  }
  var kh = String(((k4.canh_3d_vector || {}).khuon) || '');
  if (kh === 'tam_bia_gap_hop' || kh === 'tru_non_toi_uu') return 'khac';
  var dong = [];
  (kb.canh || []).forEach(function (c) { (Array.isArray(c && c.noi_dung_man_hinh) ? c.noi_dung_man_hinh : []).forEach(function (d) { dong.push(String(d)); }); });
  buoc.forEach(function (b) { (b && b.the || []).forEach(function (th) { (th && th.dong || []).forEach(function (d) { dong.push(String(d)); }); }); });
  for (i = 0; i < dong.length; i++) {
    var m = /(?:^|[^A-Za-z'])([A-Za-z])\(\s*([a-z])\s*\)\s*=\s*([^=]+)$/.exec(dong[i]);
    if (m && !/'/.test(dong[i].slice(0, m.index + 3))) { var r2 = bacHam_(m[3], m[2]); if (r2) return r2; }
  }
  return null;
}
// mọi chuỗi chữ người xem/nghe thấy (để sửa / kiểm cùng một chỗ)
function duyetChuKichBan_(kb, fn) {
  (kb.canh || []).forEach(function (c) {
    if (!c) return;
    ['loi_thoai', 'tieu_de'].forEach(function (k) { if (typeof c[k] === 'string') c[k] = fn(c[k], k); });
    if (Array.isArray(c.noi_dung_man_hinh)) c.noi_dung_man_hinh = c.noi_dung_man_hinh.map(function (d) { return typeof d === 'string' ? fn(d, 'man_hinh') : d; });
  });
  var k4 = kb.khung4tang;
  if (k4 && Array.isArray(k4.buoc)) k4.buoc.forEach(function (b) {
    if (!b) return;
    ['tieu_de', 'nhan'].forEach(function (k) { if (typeof b[k] === 'string') b[k] = fn(b[k], k); });
    (b.the || []).forEach(function (th) { if (th) ['noi_dung', 'nhan'].forEach(function (k) { if (typeof th[k] === 'string') th[k] = fn(th[k], k); }); });
  });
  if (Array.isArray(kb.bai_hoc_rut_ra)) kb.bai_hoc_rut_ra = kb.bai_hoc_rut_ra.map(function (x) { return typeof x === 'string' ? fn(x, 'bai_hoc') : x; });
  ['tieu_de_intro', 'hook_chu', 'tieu_de'].forEach(function (k) { if (typeof kb[k] === 'string') kb[k] = fn(kb[k], k); });
}
var CAU_RAO_ = [
  /(?:^|[.!?]\s*)(?:thật|quá|rất)\s+tuyệt\s+vời[!.]?\s*/gi,
  /(?:^|[,.!?]\s*)khoan\s+(?:đã|chốt\s+vội)[,!.]?\s*/gi,
  /(?:^|[.!?]\s*)(?:hãy|nào)\s+cùng\s+(?:nhau\s+)?(?:khám\s+phá|tìm\s+hiểu)[^.!?]*[.!?]\s*/gi,
  /(?:^|[.!?]\s*)các\s+bạn\s+có\s+biết\s+không\s*[?!.]\s*/gi,
  /muốn\s+tìm\s+([^,.!?]{2,40}),\s*trước\s+hết\s+(?:ta|chúng\s+ta)\s+cần\s+/gi
];
function tuSuaToanV95_(kb) {
  var sua = [];
  if (!kb || !Array.isArray(kb.canh) || kb.luong === 'hinh_hoc_thuan') return sua;
  // 1. "parabol" ở hàm KHÔNG bậc hai -> "điểm cực đại/cực tiểu" / "đồ thị" (lỗi cứng nếu Auto-fix tắt)
  var loai = loaiHamChinh_(kb);
  if (loai === 'khac' || loai === 'bac01') {
    var nho = /nhỏ\s*nhất|tối\s*thiểu|ít\s*nhất/i.test(String(kb.de_bai || '')), dem = 0;
    duyetChuKichBan_(kb, function (s) {
      var t = s.replace(/đỉnh\s+(?:của\s+)?(?:đường\s+)?parabol/gi, function () { dem++; return nho ? 'điểm cực tiểu' : 'điểm cực đại'; })
        .replace(/(?:đường\s+)?parabol/gi, function () { dem++; return 'đồ thị'; });
      return t;
    });
    if (dem) sua.push('v95: đổi ' + dem + ' chỗ "parabol" (hàm không bậc hai) -> "điểm cực trị / đồ thị"');
  }
  // 2. câu rào / sáo rỗng
  var rao = 0;
  (kb.canh || []).forEach(function (c) {
    if (!c || typeof c.loi_thoai !== 'string') return;
    var t = c.loi_thoai;
    CAU_RAO_.forEach(function (re) {
      t = t.replace(re, function (m, g1) {
        rao++;
        var dau = /^[.!?,]/.test(m) ? m.charAt(0) + ' ' : '';
        return typeof g1 === 'string' ? 'Tìm ' + g1 + ': ' : dau;   // nhóm bắt chỉ có ở mẫu "Muốn tìm ..., trước hết ta cần"
      });
    });
    t = t.replace(/\s{2,}/g, ' ').replace(/^\s*[,.]\s*/, '').trim();
    if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
    if (t && t !== c.loi_thoai) c.loi_thoai = t;
  });
  if (rao) sua.push('v95: bỏ ' + rao + ' câu rào / sáo rỗng trong lời thoại');
  // 3. thẻ khung 4 tầng: theo đúng thứ tự LỜI ĐỌC + khử thẻ lặp công thức ở ranh giới bước
  var k4 = kb.khung4tang;
  if (k4 && Array.isArray(k4.buoc)) {
    var loi = kb.canh.map(function (c) { return String((c && c.loi_thoai) || '').toLowerCase(); }).join(' ');
    var chuan = function (x) { return String(x || '').replace(/\\[,;:! ]|\\left|\\right|\s+|\{,\}/g, '').replace(/\\dfrac/g, '\\frac'); };
    var doi = 0, bo = 0, truoc = null;
    k4.buoc.forEach(function (b) {
      if (!b || !Array.isArray(b.the)) return;
      var vt = b.the.map(function (th, j) { var k = th && th.khi_noi ? loi.indexOf(String(th.khi_noi).toLowerCase()) : -1; return {th: th, j: j, k: k}; });
      var co = vt.filter(function (o) { return o.k >= 0; });
      if (co.length >= 2) {
        var oCo = co.map(function (o) { return o.j; });
        var sx = co.slice().sort(function (a, c) { return a.k - c.k || a.j - c.j; });
        var moi = b.the.slice();
        oCo.forEach(function (o, n) { if (moi[o] !== sx[n].th) doi++; moi[o] = sx[n].th; });
        b.the = moi;
      }
      if (truoc && truoc.length && b.the.length) {
        var cuoi = truoc[truoc.length - 1], dau = b.the[0];
        var da = (cuoi && Array.isArray(cuoi.dong) ? cuoi.dong : []).map(chuan);
        if (dau && dau.loai === 'cong_thuc' && Array.isArray(dau.dong) && da.length) {
          var con = dau.dong.filter(function (d) { return da.indexOf(chuan(d)) < 0; });
          if (!con.length && truoc.length > 1) { bo++; truoc.pop(); }   // trùng y hệt: GIỮ ở bước sau (bước nói về nó), bỏ ở bước trước
          else if (con.length < dau.dong.length) { bo++; if (con.length) { dau.dong = con; delete dau.khi_noi_dong; } else if (b.the.length > 1) b.the.shift(); }
        }
      }
      truoc = b.the;
    });
    if (doi) sua.push('v95: sắp lại ' + doi + ' thẻ theo đúng thứ tự lời đọc');
    if (bo) sua.push('v95: khử ' + bo + ' thẻ lặp công thức ở ranh giới bước');
  }
  return sua;
}
// v98.3: KHÓA ĐUÔI SAU ĐÁP ÁN (giữ chân Shorts/TikTok): sau cảnh dap_an cuối cùng chỉ còn MỘT cảnh ket_luan gồm tối đa
// 1 câu mẹo nhớ (<= 18 chữ) + 1 câu CTA; tổng <= DUOI_TOI_DA_TIENG_ tiếng (~6 s). Cảnh liên hệ thực tế / tóm tắt đọc lại bị bỏ,
// đánh số lại cảnh + bước khung 4 tầng (cùng cách tuSuaDocLapDe_). Bài hình không gian / Lego và video 10 phút không đụng.
var DUOI_TOI_DA_TIENG_ = 25;
var RE_MEO_DUOI_ = /mẹo|nhớ|gặp|dấu hiệu|chìa khóa|bí quyết|luôn|đừng quên|cứ thấy|hễ|thấy chữ|bẫy/i;
function cauLoi_(s) {
  return (String(s || '').match(/[^.!?…]+[.!?…]*/g) || []).map(function (x) { return x.trim(); }).filter(String);
}
function demTieng_(s) { return String(s || '').split(/\s+/).filter(String).length; }
function tuSuaDuoiV983_(kb) {
  if (!kb || !Array.isArray(kb.canh) || !kb.khung4tang || kb.kieu_video === 'DAI_10_PHUT' || kb.hinh_khong_gian) return [];
  var iDA = -1;
  // cảnh kiem_tra (thử lại / căn cứ cực trị) ngay sau đáp án là TOÁN, không phải đuôi -> giữ, khóa đuôi tính sau nó
  kb.canh.forEach(function (c, i) { if (c && /dap_an|ket_qua/.test(String(c.loai || ''))) iDA = i; });
  if (iDA >= 0) while (iDA + 1 < kb.canh.length - 1 && /kiem_tra/.test(String((kb.canh[iDA + 1] || {}).loai || ''))) iDA++;
  if (iDA < 0 || iDA >= kb.canh.length - 1) return [];
  var sau = kb.canh.slice(iDA + 1);
  var cau = [];
  sau.forEach(function (c) { cau = cau.concat(cauLoi_(c && c.loi_thoai)); });
  var tong = cau.reduce(function (s, x) { return s + demTieng_(x); }, 0);
  if (sau.length === 1 && cau.length <= 2 && tong <= DUOI_TOI_DA_TIENG_) return [];
  var laCta = function (x) { return CTA_NGHIA_.some(function (p) { return p[0].test(x); }); };
  var cta = null;
  for (var k = cau.length - 1; k >= 0; k--) if (laCta(cau[k]) && demTieng_(cau[k]) <= 16) { cta = cau[k]; break; }
  // không có câu kêu gọi: KHÔNG bịa — tuSuaMocCau_ (chạy ngay sau) thêm đúng một câu CTA khớp nút
  var meo = null;
  cau.forEach(function (x) { if (!meo && x !== cta && !laCta(x) && RE_MEO_DUOI_.test(x) && demTieng_(x) <= 18) meo = x; });
  if (!meo && !cta) cau.forEach(function (x) { if (!meo && demTieng_(x) <= 18) meo = x; });
  if (meo && cta && demTieng_(meo) + demTieng_(cta) > DUOI_TOI_DA_TIENG_) meo = null;
  if (!meo && !cta) return [];
  var cuoi = sau[sau.length - 1];
  var loiMoi = [meo, cta].filter(Boolean).join(' ');
  if (sau.length === 1 && loiMoi === String(cuoi.loi_thoai || '').trim()) return [];
  cuoi.loi_thoai = loiMoi;
  if (!/ket_luan|bai_hoc|cta/.test(String(cuoi.loai || ''))) cuoi.loai = 'ket_luan';
  var xoa = sau.length - 1;
  if (xoa) {
    var moi = {}, giu = [];
    kb.canh.forEach(function (c, i) { if (i <= iDA || c === cuoi) { moi[i + 1] = giu.length + 1; giu.push(c); } });
    giu.forEach(function (c, i) { c.so = i + 1; });
    kb.canh = giu;
    (kb.khung4tang.buoc || []).forEach(function (b) {
      if (b && b.canh !== undefined) {
        var c = +b.canh, t = c;
        while (t > 1 && moi[t] === undefined) t--;
        b.canh = moi[t] || 1;
        if (c && moi[c] === undefined && b.khi_noi) delete b.khi_noi;
      }
    });
  }
  var lc = loiMoi.toLowerCase();
  (kb.khung4tang.buoc || []).forEach(function (b) {
    if (b && +b.canh === cuoi.so && b.khi_noi && lc.indexOf(String(b.khi_noi).toLowerCase()) < 0) delete b.khi_noi;
  });
  return ['v98.3: khóa đuôi sau đáp án ' + tong + ' -> ' + demTieng_(loiMoi) + ' tiếng' + (xoa ? ', bỏ ' + xoa + ' cảnh thừa' : '') + ' (mẹo + CTA)'];
}
// Lỗi CỨNG v95: (a) gọi "parabol" với hàm không bậc hai (khi Auto-fix tắt / còn sót); (b) nhảy cóc từ đạo hàm = 0 sang kết luận
// lớn nhất/nhỏ nhất mà THIẾU MỌI căn cứ hợp lệ (đổi dấu, bảng biến thiên, so sánh đầu mút/biên, bất đẳng thức/Cauchy, đỉnh bậc hai).
function loiToanV95_(kb) {
  var nang = [], nhe = [];
  if (!kb || !Array.isArray(kb.canh) || kb.luong === 'hinh_hoc_thuan') return {nang: nang, nhe: nhe};
  var tat = [];
  duyetChuKichBan_(JSON.parse(JSON.stringify(kb)), function (s) { tat.push(s); return s; });
  var van = tat.join(' \n ');
  var loai = loaiHamChinh_(kb);
  if ((loai === 'khac' || loai === 'bac01') && /parabol/i.test(van)) nang.push('TOAN_GOI_SAI_PARABOL: hàm của bài không phải bậc hai (bậc ba / phân thức / chứa căn) nhưng lời giảng gọi "parabol" / "đỉnh parabol". Nói "điểm cực đại / cực tiểu của đồ thị".');
  var k4 = kb.khung4tang || {};
  var coBbt = (k4.buoc || []).some(function (b) { return (b && b.the || []).some(function (th) { return th && th.loai === 'bang_bien_thien'; }); });
  var daoHam0 = /[A-Za-z]'\s*\(\s*[a-z]\s*\)\s*=\s*0|đạo\s*hàm\s*(?:bằng|=)\s*(?:0|không)|cho\s+đạo\s+hàm\s+bằng/i.test(van);
  var ketLuan = /lớn\s*nhất|nhỏ\s*nhất|cực\s*đại|cực\s*tiểu|_\{?\\?max|_\{?\\?min|giá\s*trị\s*tối\s*ưu/i.test(van);
  // căn cứ chỉ tính ở NỘI DUNG thật (lời đọc, màn hình, thẻ) — nhãn/tiêu đề bước như "Xét dấu" không phải căn cứ
  var noiDung = [];
  duyetChuKichBan_(JSON.parse(JSON.stringify(kb)), function (s, k) { if (/^(loi_thoai|man_hinh|noi_dung)$/.test(k)) noiDung.push(s); return s; });
  (k4.buoc || []).forEach(function (b) { (b && b.the || []).forEach(function (th) { (th && th.dong || []).forEach(function (d) { noiDung.push(String(d)); }); }); });
  var canCu = coBbt || /đổi\s*dấu|xét\s*dấu|bảng\s*biến\s*thiên|dương\s*sang\s*âm|âm\s*sang\s*dương|đầu\s*mút|so\s*sánh\s*(?:các\s*)?giá\s*trị|tại\s*(?:hai\s*)?biên|bất\s*đẳng\s*thức|cauchy|am-gm|cô-?si|đỉnh\s*(?:của\s*)?(?:hàm\s*)?(?:bậc\s*hai|parabol)|đạo\s*hàm\s*cấp\s*hai|[A-Za-z]''\s*\(/i.test(noiDung.join(' | '));
  if (daoHam0 && ketLuan && !canCu) nang.push('TOAN_THIEU_CAN_CU_CUC_TRI: lời giảng đi thẳng từ "đạo hàm bằng 0" sang kết luận lớn nhất/nhỏ nhất mà không có căn cứ. Thêm MỘT câu căn cứ (ví dụ "đạo hàm đổi dấu từ dương sang âm qua x = 2 nên V đạt cực đại", hoặc bảng biến thiên / so sánh giá trị tại đầu mút và nghiệm).');
  // độ dài khung 4 tầng: mục tiêu 45-55 s (v98.3; cảnh báo, không chặn)
  if (kb.khung4tang && kb.kieu_video !== 'DAI_10_PHUT') {
    var tieng = kb.canh.reduce(function (s, c) { return s + String((c && c.loi_thoai) || '').split(/\s+/).filter(String).length; }, 0);
    if (tieng > 240) nhe.push('KICH_BAN_DAI_4TANG: lời thoại ' + tieng + ' tiếng (~' + Math.round(tieng / 4.4) + ' s), mục tiêu 170-220 tiếng cho video 45-55 giây. Cắt câu rào, gộp ý trùng, không đọc lại đề.');
  }
  return {nang: nang, nhe: nhe};
}

// v95: nhãn nút CTA 2-4 từ theo NGỮ NGHĨA lời đọc (khớp khung4tang_v95.py cta_tu_loi); lời kêu gọi xuất hiện cuối cùng thắng
var CTA_NGHIA_ = [[/đăng\s*ký|subscribe/i, 'ĐĂNG KÝ KÊNH!'], [/lưu(?!\s*ý)\s*(lại|video|ngay|bí\s*quyết|mẹo)?|bấm\s*lưu|save/i, 'LƯU LẠI NGAY!'],
  [/bình\s*luận|comment|để\s*lại\s*(đáp|câu|ý)|viết\s*đáp\s*án/i, 'BÌNH LUẬN NGAY!'], [/chia\s*sẻ|gửi\s*cho\s*bạn|share/i, 'CHIA SẺ NGAY!'],
  [/theo\s*dõi|follow/i, 'THEO DÕI KÊNH!'], [/thả\s*tim|(?:bấm|nhấn)\s*thích|\blike\b/i, 'THẢ TIM NHÉ!']];
var CAU_CTA_ = {'LƯU LẠI NGAY!': 'Lưu lại ngay để ôn nhé!', 'ĐĂNG KÝ KÊNH!': 'Đăng ký kênh để học thêm mẹo mới nhé!', 'BÌNH LUẬN NGAY!': 'Bình luận đáp án của bạn nhé!',
  'CHIA SẺ NGAY!': 'Chia sẻ cho bạn cùng ôn nhé!', 'THEO DÕI KÊNH!': 'Theo dõi kênh để xem bài tiếp theo nhé!', 'THẢ TIM NHÉ!': 'Thả tim nếu thấy hay nhé!'};
function ctaTuLoi_(loi) {
  var s = String(loi || ''), tot = '', vi = -1;
  CTA_NGHIA_.forEach(function (p) {
    var re = new RegExp(p[0].source, 'gi'), m;
    while ((m = re.exec(s))) { if (m.index > vi) { vi = m.index; tot = p[1]; } if (!m[0]) re.lastIndex++; }
  });
  return tot;
}
// lời các cảnh kết (bai_hoc|ket_luan|cta ở cuối video) -> nơi Outro phát cùng giọng
function loiCanhKet_(kb) {
  var ds = Array.isArray(kb && kb.canh) ? kb.canh : [], ra = [];
  for (var i = ds.length - 1; i > 0; i--) {
    var l = String((ds[i] && ds[i].loai) || '');
    if (/bai_hoc|ket_luan|cta|keu_goi|loi_ket/i.test(l) && !/dap_an|ket_qua|chot/i.test(l)) ra.unshift(String(ds[i].loi_thoai || '')); else break;
  }
  return ra.join(' ');
}

// Cảnh báo cho khung4tang. v99.1: thiếu khung4tang ở bài thực tế / xác suất ngắn = lỗi cứng KHUNG4TANG_BAT_BUOC.
function loiKhung4Tang_(kb) {
  var nhe = [];
  if (!kb || !Array.isArray(kb.canh)) return nhe;
  var can = typeof boDungMacDinh_ === 'function' && boDungMacDinh_() === '3d_vector' && kb.kieu_video !== 'DAI_10_PHUT' &&
    kb.luong !== 'hinh_hoc_thuan' && String(kb.mon || '').toUpperCase() !== 'HINH_HOC';
  if (can && !kb.khung4tang) nhe.push('KHUNG4TANG_BAT_BUOC: v99.1 mọi bài thực tế / xác suất dựng bằng khung 4 tầng (không còn đường dựng cũ); thêm "khung4tang" đúng schema (de_ghim, buoc có khi_noi nguyên văn, canh_3d_vector).');
  var k4 = kb.khung4tang;
  if (k4 && Array.isArray(k4.buoc)) {
    var loi = kb.canh.map(function (c) { return String((c && c.loi_thoai) || '').toLowerCase(); }).join(' ');
    var lech = k4.buoc.slice(1).filter(function (b) { return b.khi_noi && loi.indexOf(String(b.khi_noi).toLowerCase()) < 0; }).length;
    if (lech) nhe.push('KHUNG4TANG_KHI_NOI_LECH: ' + lech + ' bước có khi_noi không nằm nguyên văn trong loi_thoai (máy sẽ ước lượng mốc).');
    var c3 = k4.canh_3d_vector;
    var coDoiChieu = (k4.buoc || []).some(function (b) { return b && b.doi_chieu && b.doi_chieu.hinh && b.doi_chieu.ham; });
    if ((k4.tu_sinh || {}).ma || (k4.san_khau && k4.san_khau.loai) || (typeof chonSanKhau_ === 'function' && (kb.san_khau_dich === 'tu_sinh_svg' || coDoiChieu))) {
      /* v96/v102: tầng 2 là sân khấu 2D / 2.5D / đối chiếu có vật thể -> không đòi khuôn 3D cứng */
    }
    else if (!c3) nhe.push('KHUNG4TANG_3D_RONG: chưa có canh_3d_vector và máy không suy được khuôn từ đề; viết {"khuon","tham_so","pha"} theo một trong 8 khuôn.');
    else if (!tenKhuon_(c3.khuon) && !c3.khuon_du_phong && Array.isArray(c3.doi_tuong) && (!suaTruong3DV_(c3) || !dong3DV_(c3))) nhe.push('KHUNG4TANG_3D_RONG: canh_3d_vector ' + (suaTruong3DV_(c3) ? 'đứng im (< 3 bước thay đổi, không hành động)' : 'không còn đối tượng dựng được') + '; dùng một trong 8 khuôn.');
    k4.buoc.forEach(function (b, j) { if (!Array.isArray(b.the) || b.the.length < 2) nhe.push('KHUNG4TANG_IT_THE: bước ' + (j + 1) + ' cần 2-3 thẻ nối tiếp, mỗi thẻ có khi_noi.'); });
  }
  return nhe;
}

// Cổng lọc sớm (Pre-flight Gate) tại BP2 trước khi lưu CO_KICH_BAN:
// CHỈ áp dụng cho kịch bản ngắn luồng Khung4Tang (THUC_TE / XAC_SUAT); bỏ qua HINH_PHANG, HINH_KHONG_GIAN và video -10P.
function congLocSomBP2_(kb, r) {
  var loi = [];
  if (!kb || typeof kb !== 'object') return ['PREFLIGHT_RONG: kịch bản trống'];
  r = r || {};
  var mon = String(kb.mon || r.mon || '').toUpperCase();
  var id = String(kb.id || r.id || '');
  if (kb.kieu_video === 'DAI_10_PHUT' || r.kieu_video === 'DAI_10_PHUT' || /-10P$/i.test(id)) return loi;
  if (kb.luong === 'hinh_hoc_thuan' || /^HINH_/.test(mon) || kb.hinh_phang_chuan || kb.hinh_khong_gian) return loi;
  // 0) Tiền xử lý thuần code TRƯỚC khi chấm lỗi: tự vá TEX_LENH_CUT / ngoặc hở / \text thuần Việt và tự đồng bộ đáp số cảnh cuối dap_an
  vaCuPhapTexKb_(kb);
  dongBoDapSoCanhDapAn_(kb, r.dap_an || kb.dap_an || kb.dap_an_cuoi);
  // 1) Cân bằng ngoặc {} và cú pháp lệnh TeX trên mọi ô KaTeX
  kiemTraCuPhapTex_(kb).forEach(function (x) { loi.push(x); });
  // 2) Không lộ mã TeX thô ở ô văn bản thường (không chạy KaTeX)
  var reTho = /\\[A-Za-z]+|\{[^{}]*\}|\\\\/;
  ['tieu_de_intro', 'phu_de_intro', 'cau_hook', 'cta', 'nhan_thi'].forEach(function (k) {
    if (typeof kb[k] === 'string' && reTho.test(kb[k])) loi.push('MA_THO_HIEN_THI: mã TeX thô ở ' + k + ' ("' + catTheoTu_(kb[k], 40) + '")');
  });
  (kb.canh || []).forEach(function (c, i) {
    if (!c) return;
    if (/y_do|bay|loi_sai/i.test(String(c.loai || '')) && typeof c.tieu_de_canh === 'string' && reTho.test(c.tieu_de_canh)) {
      loi.push('MA_THO_HIEN_THI: mã TeX thô ở tiêu đề cảnh ' + (i + 1) + ' (' + c.loai + ')');
    }
    (Array.isArray(c.chu_thich) ? c.chu_thich : []).forEach(function (ct) {
      if (typeof ct === 'string' && reTho.test(ct)) loi.push('MA_THO_HIEN_THI: mã TeX thô ở chu_thich cảnh ' + (i + 1));
    });
  });
  var k4 = kb.khung4tang || {};
  var skTs = k4.san_khau && k4.san_khau.tham_so;
  if (skTs && typeof skTs === 'object') {
    ['nhan_bien', 'nhan_ham', 'don_vi'].forEach(function (k) {
      if (typeof skTs[k] === 'string' && reTho.test(skTs[k])) loi.push('MA_THO_HIEN_THI: mã TeX thô ở nhãn 2D ' + k);
    });
    if (skTs.nhan && typeof skTs.nhan === 'object') {
      Object.keys(skTs.nhan).forEach(function (k) {
        if (typeof skTs.nhan[k] === 'string' && reTho.test(skTs.nhan[k])) loi.push('MA_THO_HIEN_THI: mã TeX thô ở so_do_2d.nhan.' + k);
      });
    }
  }
  // 3) Không thiếu hình Tầng 2 (giữ nguyên luật Allowlist THUC_TE + sân khấu 2D XAC_SUAT)
  if (!k4 || !Array.isArray(k4.buoc) || !k4.buoc.length) {
    loi.push('t2_trong: thiếu khung4tang.buoc cho bài ngắn ' + (mon || 'Khung4Tang'));
  } else if (typeof thucTeNgan_ === 'function' && thucTeNgan_(kb, r)) {
    var plTT = phanLoaiLoiCung_([], [], kb);
    (plTT.nang || []).forEach(function (x) { if (/^t2_trong|^THU_TU_TOI_UU/.test(String(x))) loi.push(x); });
  } else if (mon === 'XAC_SUAT') {
    var coHinhXS = (k4.san_khau && k4.san_khau.loai) || (k4.tu_sinh && typeof k4.tu_sinh.ma === 'string' && k4.tu_sinh.ma.trim()) || (k4.canh_3d_vector && k4.canh_3d_vector.khuon);
    if (!coHinhXS) loi.push('t2_trong: bài XAC_SUAT thiếu sân khấu 2D hoặc tu_sinh hợp lệ ở Tầng 2.');
  }
  // 4) Khớp đáp án (chặn ISO date, chặn lệch r.dap_an <-> kb.dap_an_cuoi <-> sân khấu)
  var daGoc = String(r.dap_an || kb.dap_an || '').trim();
  var daCuoi = String(kb.dap_an_cuoi || '').trim();
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(daGoc) || /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(daCuoi)) {
    loi.push('DAP_AN_NGAY: đáp án bị Sheets chuyển thành ngày ISO, kiểm tra lại phân số gốc.');
  }
  if (!daGoc && !daCuoi) {
    loi.push('DAP_AN_CUOI_SAI: thiếu đáp án của bài toán.');
  } else if (daGoc && daCuoi && typeof coDapSo_ === 'function' && !coDapSo_(daCuoi, daGoc) && !coDapSo_(daGoc, daCuoi)) {
    loi.push('DAP_AN_CUOI_SAI: dap_an_cuoi ("' + catTheoTu_(daCuoi, 40) + '") không khớp đáp án chuẩn ("' + catTheoTu_(daGoc, 40) + '").');
  }
  ((kb._v96_loi || []).filter(function (x) { return /^XS_SAI_DAP_SO/.test(String(x)); })).forEach(function (x) { loi.push(x); });
  return loi.slice(0, 8);
}

// Phân loại cuối: chỉ giữ lỗi CỨNG trong "nang"; còn lại hạ thành cảnh báo nhẹ (đã/đang được máy tự sửa, vẫn gửi làm gợi ý khi sửa bằng AI).
function phanLoaiLoiCung_(nang, nhe, kb) {
  if (typeof thucTeNgan_ === 'function' && thucTeNgan_(kb)) {
    var k = kb.khung4tang || {}, sk = k.san_khau || {}, ts = sk.tham_so || {};
    var c3 = k.canh_3d_vector || {}, kg = kb.hinh_khong_gian || {};
    var svg = k.tu_sinh || (sk.loai === 'tu_sinh_svg' ? sk : {});
    var ma = svg.ma || (svg.tham_so || {}).ma;
    if (!choDoThiThuan_([kb.de_bai, kb.can_tim, kb.chu_de].join(' '))) {
      (k.buoc || []).forEach(function (b, i) {
        var d = b && b.doi_chieu;
        if (!d) return;
        var ts = d.tham_so || {}, mien = d.mien || [];
        var phai = typeof d.ham === 'string' && d.ham.trim() && mien.length === 2 && isFinite(+mien[0]) && isFinite(+mien[1]) && +mien[1] > +mien[0];
        var trai = +mien[0] >= 0 && ((d.hinh === 'tam_bia' && +ts.a > 0 && +mien[1] <= Math.min(+ts.a, +(ts.b == null ? ts.a : ts.b)) / 2 + 1e-6) ||
          (d.hinh === 'mat_cat_tru' && +ts.V > 0) || (d.hinh === 'tam_giac_luc' && +mien[1] <= 89));
        if (!trai || !phai) nang = nang.concat('t2_trong: đối chiếu bước ' + (i + 1) + ' thiếu ' + (!trai ? 'vật thể co giãn bên trái' : 'hàm và miền bên phải') + '.');
      });
    }
    var muc = -1;
    function luiBuoc(cau) {
      var pha = /(?:gọi|đặt|chọn) (?:ẩn|biến|[xtrh](?![a-zà-ỹ]))|lập (?:hàm|biểu thức)|xây dựng hàm|thiết lập hàm|tìm (?:đỉnh|cực trị)|xét (?:đỉnh|đạo hàm)|tính đạo hàm|chốt (?:đáp án|kết quả)|kết luận/gi;
      var dong;
      while ((dong = pha.exec(cau))) {
        var n = /^(?:gọi|đặt|chọn)/i.test(dong[0]) ? 0 : /^(?:lập|xây|thiết)/i.test(dong[0]) ? 1 : /^(?:tìm|xét|tính)/i.test(dong[0]) ? 2 : 3;
        if (n < muc) return true;
        muc = n;
      }
      return false;
    }
    if (/tối ưu|cực trị|lớn nhất|nhỏ nhất|cực đại|cực tiểu/i.test(kb.de_bai || '')) {
      var loiBuoc = (k.buoc || []).some(function (b) { return b && luiBuoc(b.tieu_de || b.nhan || ''); });
      muc = -1;
      var loiDoc = (kb.canh || []).some(function (c) { return c && !/^(hook|de_bai|mo_dau|cta|bai_hoc)$/.test(c.loai) && luiBuoc(c.loi_thoai || ''); });
      if (loiBuoc || loiDoc) nang = nang.concat('THU_TU_TOI_UU: gọi ẩn trên hình, lập hàm, tìm cực trị, chốt đáp án.');
    }
    var tot = (sk.loai === 'so_do_2d' && ['song_bo','day_cap','cong_parabol','rao_tuong','thang_tuong'].indexOf(ts.mau) >= 0) ||
      (['kinh_te_do_thi','tang_truong'].indexOf(sk.loai) >= 0 && choDoThiThuan_([kb.de_bai,kb.can_tim,kb.chu_de].join(' ')) && ts.ham && Array.isArray(ts.mien) && ts.mien.length === 2) ||
      (!sk.loai && (tenKhuon_(c3.khuon) || (suaTruong3DV_(c3) && dong3DV_(c3)))) || (kg.doi_tuong || []).length;
    if (chonSanKhau_(kb).loai === 'tu_sinh_svg' && !ma) tot = false;
    if (ma || kb.san_khau_dich === 'tu_sinh_svg') {
      tot = typeof ma === 'string' && ma.trim();
      if (tot) {
        var kq = typeof kiemTuSinhMay_ === 'function' && kiemTuSinhMay_(kb);
        tot = kq && kq.ok;
      }
    } else if (tot && ['kinh_te_do_thi','tang_truong','so_do_2d'].indexOf(sk.loai) >= 0 && typeof kiemSanKhau2DMay_ === 'function') {
      var kq2D = kiemSanKhau2DMay_(kb);
      tot = kq2D && kq2D.ok;
    }
    if (['kinh_te_do_thi','tang_truong'].indexOf(sk.loai) >= 0 && (kb.canh || []).some(function (c) {
      return c && /nhìn (?:vào )?hình vẽ/i.test(c.loi_thoai || '');
    })) nang = nang.concat('t2_trong: lời nói nhìn vào hình vẽ trong khi sân khấu chỉ có đồ thị.');
    if (!tot) nang = nang.concat('t2_trong: THUC_TE cần vật thể, sơ đồ hoặc đồ thị có dữ liệu hợp lệ theo từng bước.');
  }
  if (!batAutoFix_()) return {nang: nang, nhe: nhe};
  var cung = [], ha = [];
  nang.forEach(function (x) { (LOI_CUNG_RE_.test(String(x)) ? cung : ha).push(x); });
  if (kb && Array.isArray(kb.canh) && kb.canh.length && kb.canh.length < 4) cung.push('QUA_IT_CANH: kịch bản chỉ có ' + kb.canh.length + ' cảnh, không đủ dựng video.');
  if (ha.length && typeof nhatKy_ === 'function') { try { nhatKy_('AUTO_FIX', (kb && kb.id ? kb.id + ': ' : '') + 'hạ ' + ha.length + ' lỗi hình thức thành cảnh báo: ' + ha.map(function (x) { return String(x).split(':')[0]; }).slice(0, 8).join(', ')); } catch (e) {} }
  // giữ nguyên mã lỗi ở đầu chuỗi (moTaLoiKichBan_ / bộ lọc gợi ý tra theo mã), chỉ đánh dấu ở cuối
  return {nang: cung, nhe: ha.map(function (x) { return x + ' [cảnh báo: không chặn kịch bản]'; }).concat(nhe)};
}


/* ===================== v97: HÌNH HỌC KHÔNG GIAN CHUẨN — Auto-fix + lỗi cứng (bản JS của hinh_khong_gian/thoi_gian.py) ===================== */
// Chữ gốc chuẩn hóa để đối chiếu moc_xoay (khớp tok() Python): bỏ lệnh TeX, ngoặc, dấu chấm trong S.ABCD, ký hiệu toán; chữ thường
function tokKG_(s) {
  var x = String(s || '').replace(/\\[A-Za-z]+/g, ' ').replace(/[()\[\]{}$^_\\=+\-*\/<>|⊥∥∩∪∈⊂°'’′.,;:!?"“”…–—]/g, ' ').toLowerCase();
  return x.split(/\s+/).filter(function (w) { return w; });
}
// -> {i, n, kieu: dung|con} trong toks[lo..] hoặc null. KHÔNG BAO GIỜ trả vị trí đầu cảnh mặc định (chống xoay sớm)
function timCumKG_(cum, toks, lo) {
  var can = tokKG_(cum), n = can.length;
  if (!n) return null;
  var bang = function (i, ds) { for (var k = 0; k < ds.length; k++) if (toks[i + k] !== ds[k]) return false; return true; };
  for (var i = lo || 0; i + n <= toks.length; i++) if (bang(i, can)) return {i: i, n: n, kieu: 'dung'};
  if (n >= 3) for (var m = n - 1; m >= 3; m--) for (var k = 0; k + m <= n; k++) {
    var con = can.slice(k, k + m);
    for (var j = lo || 0; j + m <= toks.length; j++) if (bang(j, con)) return {i: j, n: m, kieu: 'con', cum: con.join(' ')};
  }
  return null;
}
// v98: bí danh động tác Lego + hình khối (Gemini không schema / model cũ hay viết tên gần đúng)
var BI_DANH_DONG_TAC_ = {doi_xung: 'doi_xung_mat', lay_doi_xung: 'doi_xung_mat', phan_xa: 'doi_xung_mat', dich_chuyen: 'tinh_tien', tinh_tien_vector: 'tinh_tien',
  xoay_quanh: 'quay', quay_quanh: 'quay', lam_mo: 'co_lap', tap_trung: 'co_lap', lam_noi: 'co_lap', truot: 'truot_toi_uu', truot_diem: 'truot_toi_uu', toi_uu: 'truot_toi_uu'};
var BI_DANH_HINH_LEGO_ = {hinh_tru: 'tru', tru_tron: 'tru', hinh_non: 'non', mat_cau: 'cau', qua_cau: 'cau', hinh_cau: 'cau', hinh_hop: 'hop', hop_chu_nhat: 'hop',
  lap_phuong: 'hop', hinh_chop: 'chop', hinh_lang_tru: 'lang_tru', duong_tron: 'tron', quy_dao_bay: 'quy_dao', san: 'san_oxy', mat_dat: 'san_oxy'};
var BI_DANH_CAMERA_KG_ = {truc_dien: 'truc_dien_mat', nhin_thang_mat: 'truc_dien_mat', ep_mep: 'ep_mep_mat', edge_on: 'ep_mep_mat', nhin_doc_mat: 'ep_mep_mat',
  tren_xuong: 'nhin_day', nhin_tu_tren: 'nhin_day', zoom: 'can_canh', phong_to: 'can_canh', tong_quan: 'toan_canh', mac_dinh: 'toan_canh'};

// Auto-fix nhẹ: tên chế độ camera, bước 1 có toan_canh, nhãn bước "Bước n" -> nhãn ngắn, moc_xoay lệch chữ -> cụm con >= 3 từ NGUYÊN VĂN
// trong đúng cảnh (giữ vị trí giữa câu). Không tìm được -> để nguyên cho loiKhongGian_ báo CAM_MAT_MOC (KHÔNG dời về đầu cảnh).
function tuSuaKhongGian_(kb, r) {
  var sua = [], hkg = kb && kb.hinh_khong_gian;
  if (!hkg || typeof hkg !== 'object' || !Array.isArray(hkg.buoc)) return sua;
  var canhSo = {};
  (kb.canh || []).forEach(function (c, i) { if (c) canhSo[String(c.so || i + 1)] = c; });
  var conTro = {};
  (Array.isArray(hkg.doi_tuong) ? hkg.doi_tuong : []).forEach(function (o) {
    if (o && o.hinh && BI_DANH_HINH_LEGO_[String(o.hinh).toLowerCase()]) { sua.push('khối ' + (o.id || '') + ': hình "' + o.hinh + '" -> ' + BI_DANH_HINH_LEGO_[String(o.hinh).toLowerCase()]); o.hinh = BI_DANH_HINH_LEGO_[String(o.hinh).toLowerCase()]; }
  });
  hkg.buoc.forEach(function (b, j) {
    if (!b || typeof b !== 'object') return;
    if (/^\s*bước\s*\d+\s*$/i.test(String(b.nhan || ''))) { b.nhan = String(b.tieu_de || '').split(/\s+/).slice(0, 2).join(' ') || 'Giải'; sua.push('bước ' + (j + 1) + ': nhãn "Bước n" -> "' + b.nhan + '"'); }
    if (!Array.isArray(b.xoay)) b.xoay = b.xoay && typeof b.xoay === 'object' ? [b.xoay] : [];
    if (j === 0 && !b.xoay.length) { b.xoay = [{goc_nhin: 'toan_canh'}]; sua.push('bước 1: thêm góc toan_canh mở đề'); }
    var c = canhSo[String(b.canh)];
    var toks = c ? tokKG_(c.loi_thoai) : [];
    var so = String(b.canh);
    // v98 Lego: bí danh động tác + moc_hanh_dong lệch chữ -> cụm con nguyên văn (giống moc_xoay)
    (Array.isArray(b.hanh_dong) ? b.hanh_dong : []).forEach(function (h) {
      if (!h || typeof h !== 'object') return;
      var l = String(h.loai || '').trim().toLowerCase();
      if (BI_DANH_DONG_TAC_[l]) { sua.push('bước ' + (j + 1) + ': động tác "' + l + '" -> ' + BI_DANH_DONG_TAC_[l]); h.loai = BI_DANH_DONG_TAC_[l]; }
      if (!h.moc_hanh_dong && h.khi_noi && typeof LEGO_DONG_TAC_ !== 'undefined' && LEGO_DONG_TAC_.indexOf(h.loai) >= 0) { h.moc_hanh_dong = h.khi_noi; }
      if (!h.moc_hanh_dong || !toks.length) return;
      var kqh = timCumKG_(h.moc_hanh_dong, toks, 0);
      if (!kqh) { sua.push('bước ' + (j + 1) + ': moc_hanh_dong "' + h.moc_hanh_dong + '" không có trong lời -> chạy ở đầu bước (dự phòng)'); delete h.moc_hanh_dong; delete h.khi_noi; h.du_phong = true; return; }
      if (kqh && kqh.kieu === 'con') { sua.push('bước ' + (j + 1) + ': moc_hanh_dong "' + h.moc_hanh_dong + '" -> "' + kqh.cum + '"'); h.moc_hanh_dong = kqh.cum; }
    });
    b.xoay.forEach(function (x) {
      if (!x || typeof x !== 'object') return;
      var g = String(x.goc_nhin || x.che_do || 'toan_canh').trim().toLowerCase();
      if (BI_DANH_CAMERA_KG_[g]) { sua.push('bước ' + (j + 1) + ': goc_nhin "' + g + '" -> ' + BI_DANH_CAMERA_KG_[g]); g = BI_DANH_CAMERA_KG_[g]; }
      if (CHE_DO_CAMERA_KG_.indexOf(g) < 0) { sua.push('bước ' + (j + 1) + ': goc_nhin lạ "' + g + '" -> toan_canh'); g = 'toan_canh'; }
      x.goc_nhin = g; delete x.che_do;
      if (j > 0 && (!x.moc_xoay || (toks.length && !timCumKG_(x.moc_xoay, toks, conTro[so] || 0)))) {
        // v102.1 HẠ CÁNH MỀM: mốc xoay là lớp trình diễn phụ, không phải lỗi toán -> rơi về góc nhìn chuẩn thấy toàn khối
        sua.push('bước ' + (j + 1) + ': moc_xoay "' + String(x.moc_xoay || '') + '" không có trong lời cảnh ' + so + ' -> góc toan_canh dự phòng');
        x.goc_nhin = 'toan_canh'; x.du_phong = true; delete x.moc_xoay; delete x.doi_tuong;
        return;
      }
      if (!x.moc_xoay || !toks.length) return;
      var kq = timCumKG_(x.moc_xoay, toks, conTro[so] || 0);
      if (kq && kq.kieu === 'con') { sua.push('bước ' + (j + 1) + ': moc_xoay "' + x.moc_xoay + '" -> cụm nguyên văn "' + kq.cum + '"'); x.moc_xoay = kq.cum; }
      if (kq) conTro[so] = kq.i + kq.n;
    });
  });
  return sua;
}

// Lỗi cứng bài không gian chuẩn (thay kiemTraKichBanManim_ khi có hinh_khong_gian): đặc tả, moc_xoay, đọc lặp đề / cụt công thức (v96),
// bộ giải máy (KG_* từ scripts/giai_hinh_khong_gian.py qua chay_bp1.js; Apps Script thật không có Python -> chuanbi.py chặn lại).
function kiemKhongGian_(kb) {
  var nang = [], nhe = [], hkg = (kb && kb.hinh_khong_gian) || {};
  var laLegoK = typeof laLegoKb_ === 'function' && laLegoKb_(kb);   // v98: đặc tả Lego (6 khối) — không có "khoi" đơn
  if (typeof loiLuongHinhHoc_ === 'function' && String(kb.luong || '') === 'hinh_hoc_thuan') loiLuongHinhHoc_(kb).forEach(function (x) { nang.push(x + ': video hình học thuần chỉ có hình học (không vật đời sống / 3D trang trí).'); });
  if (laLegoK) {
    if (!Array.isArray(hkg.doi_tuong) || !hkg.doi_tuong.length) nang.push('KG_THIEU_DAC_TA: đặc tả Lego thiếu "doi_tuong" (6 khối: khoi | doan | duong_cong | mat | diem | he_truc).');
    (hkg.buoc || []).forEach(function (b, j) {
      (b && Array.isArray(b.hanh_dong) ? b.hanh_dong : []).forEach(function (h) {
        if (h && !h.du_phong && LEGO_DONG_TAC_.indexOf(h.loai) >= 0 && !String(h.moc_hanh_dong || '').trim()) nhe.push('CAM_MAT_MOC: bước ' + (j + 1) + ' động tác ' + h.loai + ' thiếu moc_hanh_dong -> chạy ở đầu bước (dự phòng, không chặn).');
      });
    });
  } else if (!hkg.khoi || typeof hkg.khoi !== 'object' || !hkg.khoi.loai) nang.push('KG_THIEU_DAC_TA: hinh_khong_gian thiếu "khoi" (loại khối, đáy, chân đường cao).');
  if (!Array.isArray(hkg.buoc) || hkg.buoc.length < 2) nang.push('KG_THIEU_DAC_TA: hinh_khong_gian cần >= 2 bước (bước 1 mở đề toan_canh + các bước giải có xoay).');
  var canhSo = {};
  (kb.canh || []).forEach(function (c, i) { if (c) canhSo[String(c.so || i + 1)] = c; });
  var conTro = {}, viTri = [];
  (hkg.buoc || []).forEach(function (b, j) {
    if (!b) return;
    var c = canhSo[String(b.canh)];
    if (!c) { nang.push('KG_THIEU_DAC_TA: bước ' + (j + 1) + ' trỏ tới cảnh ' + b.canh + ' không tồn tại.'); return; }
    var toks = tokKG_(c.loi_thoai), so = String(b.canh);
    (Array.isArray(b.xoay) ? b.xoay : []).forEach(function (x) {
      if (!x || x.du_phong) return;
      if (j === 0 && !x.moc_xoay) return;
      // v102.1 CAM_MAT_MOC là lỗi TRÌNH DIỄN (camera), không phải lỗi toán -> cảnh báo nhẹ; chuanbi.py rơi về góc toan_canh
      if (!x.moc_xoay) { nhe.push('CAM_MAT_MOC: bước ' + (j + 1) + ' cú xoay ' + x.goc_nhin + ' thiếu moc_xoay -> góc toan_canh dự phòng (không chặn).'); return; }
      var kq = timCumKG_(x.moc_xoay, toks, conTro[so] || 0);
      if (!kq) { nhe.push('CAM_MAT_MOC: bước ' + (j + 1) + ' moc_xoay "' + x.moc_xoay + '" không có trong lời cảnh ' + so + ' -> góc toan_canh dự phòng (không chặn).'); return; }
      conTro[so] = kq.i + kq.n;
      viTri.push({canh: so, i: kq.i, g: x.goc_nhin, j: j});
      if (['truc_dien_mat', 'ep_mep_mat'].indexOf(x.goc_nhin) >= 0 && (!Array.isArray(x.doi_tuong) || x.doi_tuong.length < 3)) nang.push('KG_THIEU_DAC_TA: bước ' + (j + 1) + ' ' + x.goc_nhin + ' cần doi_tuong = 3 điểm của mặt phẳng.');
    });
  });
  for (var k = 1; k < viTri.length; k++) {
    var a = viTri[k - 1], b2 = viTri[k];
    if (a.canh === b2.canh && b2.i - a.i < 4) nhe.push('CAM_DE_GIO: hai cú xoay ' + a.g + ' và ' + b2.g + ' (cảnh ' + a.canh + ') cách nhau < 4 từ lời đọc (cần >= ~1 s).');
  }
  if (typeof canhLapDe_ === 'function') {
    var lap = canhLapDe_(kb);
    if (lap.length) nang.push('KB_DOC_LAP_DE: cảnh ' + lap.map(function (i) { return i + 1; }).join(', ') + ' đọc lại đề lần nữa. Chỉ đọc đề ĐÚNG 1 lần.');
  }
  if (typeof soKetQuaDong_ === 'function' && typeof loiNoiSo_ === 'function') {
    var cut = [];
    (kb.canh || []).forEach(function (c, i) {
      (c && Array.isArray(c.noi_dung_man_hinh) ? c.noi_dung_man_hinh : []).forEach(function (d) {
        var so = soKetQuaDong_(d);
        if (so && !loiNoiSo_(c.loi_thoai, so) && !/ket_luan|bai_hoc|cta/.test(String(c.loai || ''))) cut.push('cảnh ' + (i + 1) + ' (' + so + ')');
      });
    });
    if (cut.length) nang.push('KB_CUT_CONG_THUC: lời thoại không đọc ra kết quả ' + cut.slice(0, 3).join(', ') + '. Đọc đủ biểu thức và đáp số.');
  }
  if ((kb.canh || []).length > 12) nhe.push('KG_NHIP_DAI: ' + kb.canh.length + ' cảnh (nên 7-10 cảnh, 50-68 s).');
  if (typeof kiemKhongGianMay_ === 'function') {
    var m = null;
    try { m = kiemKhongGianMay_(kb); } catch (e) { m = {loi: [{ma: 'PREFLIGHT_HINH_KHONG_GIAN', chi_tiet: 'bộ giải Python lỗi khi gọi: ' + String(e && e.message || e).slice(0, 160)}]}; }
    if (m && Array.isArray(m.loi)) m.loi.forEach(function (x) { nang.push(x.ma + ': ' + x.chi_tiet + (x.goi_y ? ' | Gợi ý: ' + x.goi_y : '')); });
    if (m && Array.isArray(m.canh_bao)) m.canh_bao.forEach(function (x) { nhe.push('KG_CANH_BAO: ' + x); });
  }
  return {nang: nang, nhe: nhe};
}

/* ===================== v99.2: NỘI DUNG BỀN VỮNG (EVERGREEN) — GỠ NĂM SINH / KHÓA HỌC / NĂM THI ===================== */
// Gemini hay bịa theo thói quen TikTok ("2k9 ơi", "sĩ tử 2008", "#2k8", "THPT 2027") -> video hết hạn sau 1 năm. Lớp chặn đầu ra
// dùng chung cho kịch bản (tuSuaHinhThuc_), metadata đăng (DangVideo.gs) và HOC_EDIT / QUY_TAC_HOC. Bản Python đôi:
// scripts/dang_video.py ve_sinh_nam_sinh (test so khớp test_v99_2_gs.cjs <-> test_v99_2.py).
var RE_NAM_SINH_ = /2k(?:0?[5-9]|1[0-5])(?![0-9])|(?:học sinh|sĩ tử|teen|team|khóa|khoá|thế hệ)\s+20(?:0[5-9]|1[0-5])(?![0-9])|#20(?:0[5-9]|1[0-5])(?![0-9])|(?:thpt|kỳ thi|kì thi|đề thi|thi vào 10|tốt nghiệp)(?:\s+quốc gia)?\s+(?:năm\s+)?20(?:2[5-9]|3[0-9])(?![0-9])|#[a-z]*20(?:2[5-9]|3[0-9])(?![0-9])/i;
function coNamSinh_(s) { return RE_NAM_SINH_.test(String(s || '')); }
function nhanLop_(lop) { var l = String(lop || '').replace(/\D/g, ''); return /^(8|9|10|11|12)$/.test(l) ? 'lớp ' + l : ''; }
// -> chuỗi đã gỡ năm sinh / năm thi (giữ nghĩa, thay bằng lớp hoặc "bạn")
function veSinhNamSinh_(s, lop) {
  if (s === null || s === undefined) return s;
  var t = String(s), nl = nhanLop_(lop);
  if (!coNamSinh_(t)) return t;
  t = t.replace(/#2k(?:0?[5-9]|1[0-5])(?![0-9A-Za-z])/gi, '#toanhoc')
    .replace(/#20(?:0[5-9]|1[0-5])(?![0-9])/g, '#toanhoc')
    .replace(/#([a-z]*?)20(?:2[5-9]|3[0-9])(?![0-9])/gi, function (m, a) { return a ? '#' + a : '#toanhoc'; })
    .replace(/(học sinh|sĩ tử|teen)\s+(?:2k(?:0?[5-9]|1[0-5])|20(?:0[5-9]|1[0-5]))(?![0-9])/gi, function (m, a) { return a + (nl ? ' ' + nl : ''); })
    .replace(/(?:team|khóa|khoá|thế hệ)\s+(?:2k(?:0?[5-9]|1[0-5])|20(?:0[5-9]|1[0-5]))(?![0-9])/gi, nl ? 'các bạn ' + nl : 'các bạn')
    .replace(/((?:THPT|kỳ thi|kì thi|đề thi|thi vào 10|tốt nghiệp)(?:\s+quốc gia)?)\s+(?:năm\s+)?20(?:2[5-9]|3[0-9])(?![0-9])/gi, '$1')
    .replace(/(^|[^0-9A-Za-zÀ-ỹ])(các\s+)?2k(?:0?[5-9]|1[0-5])(?![0-9A-Za-z])/gi, function (m, a, cac) { return a + (cac ? 'các bạn' : 'bạn'); })
    .replace(/(^|[.!?]\s+)(các bạn|bạn)(?=[\s,!?.])/g, function (m, a, b) { return a + b.charAt(0).toUpperCase() + b.slice(1); })
    .replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1');
  var daThe = {};   // hashtag trùng sau khi thay (#2k8 #toanhoc -> một #toanhoc)
  t = t.replace(/(^|\s)#([0-9A-Za-zÀ-ỹ_]+)/g, function (m, a, the) { var k = the.toLowerCase(); if (daThe[k]) return ''; daThe[k] = 1; return m; });
  return t;
}
var KHOA_BO_VE_SINH_ = {ma: 1, svg: 1, de_bai: 1, file_kich_ban: 1, id: 1};
// Gỡ năm sinh trong MỌI trường chữ của kịch bản (đệ quy; bỏ mã tự sinh / SVG / đề gốc). Trả danh sách sửa.
function veSinhKb_(kb, r) {
  var lop = (kb && kb.lop) || (r && r.lop) || '';
  var dem = 0;
  var di = function (o, sau) {
    if (sau > 8 || !o || typeof o !== 'object') return;
    Object.keys(o).forEach(function (k) {
      if (KHOA_BO_VE_SINH_[k]) return;
      var v = o[k];
      if (typeof v === 'string') { var w = veSinhNamSinh_(v, lop); if (w !== v) { o[k] = w; dem++; } }
      else if (v && typeof v === 'object') di(v, sau + 1);
    });
  };
  di(kb, 0);
  return dem ? ['EVERGREEN: gỡ năm sinh / năm thi ở ' + dem + ' trường chữ (thay bằng lớp / "bạn")'] : [];
}
// Metadata đăng bài (tiêu đề / mô tả / hashtag mọi nền tảng)
function veSinhMetaDang_(meta, lop) {
  if (!meta) return meta;
  ['tieu_de', 'yt_tieu_de', 'tt_tieu_de', 'mo_ta', 'yt_dau', 'fb_dau', 'yt_mo_ta', 'fb_mo_ta'].forEach(function (k) {
    if (typeof meta[k] === 'string') meta[k] = veSinhNamSinh_(meta[k], lop);
  });
  if (Array.isArray(meta.the)) {
    var da = {};
    meta.the = meta.the.map(function (t) {
      var x = String(t || '').replace(/^#/, '');
      if (/^2k\d{1,2}$/i.test(x) || /^20(?:0[5-9]|1[0-5])$/.test(x)) return 'toanhoc';
      return coNamSinh_('#' + x) ? (x.replace(/20(?:2[5-9]|3[0-9])$/, '') || 'toanhoc') : x;
    }).filter(function (t) { if (!t || da[t]) return false; da[t] = 1; return true; });
  }
  return meta;
}

/* ===================== v99.2: NHÃN PHỤ BƯỚC KHÔNG LẶP "BƯỚC n" ===================== */
// Bản đôi: scripts/khung4tang_v99.py nhan_phu_buoc + src/khung4tang/nhan_buoc.ts nhanPhuBuoc (test so khớp test_v99_2_gs.cjs).
function nhanPhuBuoc_(nhan, j, n) {
  var s = String(nhan === null || nhan === undefined ? '' : nhan).trim();
  if (!/^(?:bước|buoc|step)\s*(?:\d|[:.\-–—·|/]|$)/i.test(s)) return s;   // "Bước ngoặt" là cụm có nghĩa -> giữ
  var con = s.replace(/^\s*(?:bước|buoc|step)\s*\d*\s*[:.\-–—·|/]*\s*/i, '').trim();
  if (con) return con.charAt(0).toUpperCase() + con.slice(1);
  if (n && j === 0) return 'Đề bài';
  if (n && j === n - 1) return 'Kết luận';
  return '';
}
