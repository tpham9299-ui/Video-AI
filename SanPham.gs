/**
 * ============================================================
 * DUYỆT VIDEO + SẢN PHẨM TRONG BÀI TOÁN (dán thành tệp mới SanPham.gs, cùng dự án với các tệp khác)
 *
 * A) DUYỆT VIDEO TRƯỚC KHI ĐĂNG (CAU_HINH > DUYET_TRUOC_KHI_DANG = BAT, mặc định BAT)
 *    Video dựng xong -> bot gửi link kèm lệnh. Chỉ video đã duyệt mới được đăng theo lịch.
 *      /duyet [mã]          duyệt video (bỏ trống mã = video chờ duyệt mới nhất)
 *      /sua [mã] <góp ý>    viết lại kịch bản theo góp ý rồi dựng lại (được ưu tiên như đề Zalo)
 *      /bo [mã]             bỏ video, không đăng
 *      /cho                 xem các video đang chờ duyệt
 *
 * B) SẢN PHẨM TRONG BÀI TOÁN (minh bạch, không quảng cáo trá hình)
 *      /sanpham <tên sản phẩm hoặc link> [ghi chú]   (có thể gửi kèm ảnh sản phẩm, ghi lệnh ở phần chú thích ảnh)
 *    1. Hệ thống dùng Gemini + Google Search tìm: giá ở nhiều nơi bán (có nguồn, ngày), thông số, cách các nơi bán/đối thủ giới
 *       thiệu (chỉ rút ý), đánh giá chung, các lời quảng cáo không kiểm chứng được. Thông số chỉ được coi là ĐÃ XÁC MINH khi có
 *       từ 2 nguồn trở lên (hoặc nguồn chính hãng).
 *    2. Bot gửi tóm tắt hồ sơ. Bạn kiểm tra rồi trả lời:  /xacnhan [mã] <giá bạn bán>   (ví dụ /xacnhan 249000)   hoặc /huysp [mã]
 *    3. Hệ thống sáng tác bài toán HỮU ÍCH lấy sản phẩm làm bối cảnh (chi tiêu thông minh, so sánh giá, tối ưu, xác suất khuyến mãi...)
 *       chỉ dùng thông tin đã xác minh, rồi giải - kiểm chứng - viết kịch bản - dựng video như đề ưu tiên.
 *    4. Minh bạch: video luôn có nhãn nhỏ "Có sản phẩm do kênh bán" và dòng tên sản phẩm ở cuối; mô tả bài đăng ghi rõ; TikTok bật nhãn
 *       nội dung thương mại (quảng bá doanh nghiệp của bạn). Kịch bản không được dùng lời quảng cáo quá đà ("tốt nhất", "rẻ nhất",
 *       "số 1"...) hay nhắc tên đối thủ; vi phạm là lỗi nặng, AI phải sửa.
 * ============================================================
 */

var TEN_SAN_PHAM = 'SAN_PHAM';
var COT_SP = ['id', 'trang_thai', 'ten', 'link', 'ghi_chu', 'anh', 'ho_so', 'gia_ban', 'zalo_chat', 'cap_nhat', 'so_de'];

function shSanPham_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_SAN_PHAM);
  if (!sh) { sh = ss.insertSheet(TEN_SAN_PHAM); sh.appendRow(COT_SP); sh.setFrozenRows(1); }
  return sh;
}
function docSP_(sh) {
  var v = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    var o = { _row: i + 1 };
    for (var j = 0; j < COT_SP.length; j++) o[COT_SP[j]] = v[i][j];
    if (o.id) out.push(o);
  }
  return out;
}
function ghiSP_(sh, row, f) {
  f.cap_nhat = new Date();
  Object.keys(f).forEach(function (k) { var c = COT_SP.indexOf(k); if (c >= 0) sh.getRange(row, c + 1).setValue(f[k]); });
}
function coViecSanPham_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_SAN_PHAM);
  if (!sh) return false;
  return docSP_(sh).some(function (r) { return r.trang_thai === 'CHO_TIM' || r.trang_thai === 'DA_XAC_NHAN'; });
}
function canDuyet_() { return String(cauHinh_('DUYET_TRUOC_KHI_DANG') || 'BAT').toUpperCase() !== 'TAT'; }
function daDuyet_(r) { return !canDuyet_() || String(r.duyet || '') === 'DA_DUYET'; }

/* ===================== LỆNH ZALO MỚI (gọi từ nhanZalo_) ===================== */

// Trả true nếu tin nhắn là một lệnh của tệp này (đã trả lời người gửi).
function xuLyLenhZaloMoi_(chat, chu, anh) {
  var l = String(chu || '').trim().toLowerCase();
  if (/^\/duyet\b/.test(l)) { guiZaloToi_(chat, duyetVideo_(chu)); return true; }
  if (/^\/sua\b/.test(l)) { guiZaloToi_(chat, yeuCauSuaVideo_(chat, chu)); return true; }
  if (/^\/bo\b/.test(l)) { guiZaloToi_(chat, boVideo_(chu)); return true; }
  if (/^\/cho\b/.test(l)) { guiZaloToi_(chat, danhSachChoDuyet_()); return true; }
  if (/^\/sanpham\b/.test(l)) { guiZaloToi_(chat, nhanSanPham_(chat, chu, anh)); return true; }
  if (/^\/xacnhan\b/.test(l)) { guiZaloToi_(chat, xacNhanSanPham_(chu)); return true; }
  if (/^\/huysp\b/.test(l)) { guiZaloToi_(chat, huySanPham_(chu)); return true; }
  if (/^\/hoc\b/.test(l) && typeof nhanLenhHoc_ === 'function') { guiZaloToi_(chat, nhanLenhHoc_(chu)); return true; }
  return false;
}

// Lấy mã (nếu có) ngay sau lệnh và phần chữ còn lại.
function tachLenh_(chu, dsMa) {
  var phan = String(chu || '').trim().split(/\s+/);
  phan.shift();
  var ma = '';
  if (phan.length && dsMa.indexOf(phan[0]) >= 0) ma = phan.shift();
  return { ma: ma, con: phan.join(' ').trim() };
}

function videoChoDuyet_(hang) {
  return hang.filter(function (r) { return r.trang_thai === 'CO_VIDEO' && r.file_video && String(r.duyet || '') !== 'DA_DUYET'; })
    .sort(function (a, b) { return new Date(b.cap_nhat).getTime() - new Date(a.cap_nhat).getTime(); });
}

function duyetVideo_(chu) {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(20000)) return '⏳ Hệ thống đang bận, thử lại sau 1 phút nhé.';
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var hang = docHang_(sh);
    var cho = videoChoDuyet_(hang);
    var t = tachLenh_(chu, cho.map(function (r) { return r.id; }));
    if (!t.ma && cho.length > 1) return 'Đang có ' + cho.length + ' video chờ duyệt, hãy ghi rõ mã, ví dụ /duyet ' + cho[0].id + '\n\n' + danhSachChoDuyet_();
    var r = t.ma ? cho.filter(function (x) { return x.id === t.ma; })[0] : cho[0];
    if (!r) return 'Không có video nào đang chờ duyệt.';
    ghi_(sh, r._row, { duyet: 'DA_DUYET' });
    var bat = String(cauHinh_('DANG_TU_DONG') || 'TAT').toUpperCase() === 'BAT';
    return '✅ Đã duyệt ' + r.id + ' (' + (r.chu_de || '') + ').' + (bat ? ' Video sẽ được đăng ở khung giờ tới (' + (cauHinh_('GIO_DANG') || '11:30,19:30') + ').' : ' Lịch đăng tự động đang TẮT (CAU_HINH > DANG_TU_DONG); muốn đăng ngay dùng menu 📤 trong Sheet.') +
      (cho.length > 1 ? '\nCòn ' + (cho.length - 1) + ' video chờ duyệt, nhắn /cho để xem.' : '');
  } finally { khoa.releaseLock(); }
}

function boVideo_(chu) {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(20000)) return '⏳ Hệ thống đang bận, thử lại sau 1 phút nhé.';
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var cho = videoChoDuyet_(docHang_(sh));
    var t = tachLenh_(chu, cho.map(function (r) { return r.id; }));
    if (!t.ma && cho.length > 1) return 'Đang có ' + cho.length + ' video chờ duyệt, hãy ghi rõ mã, ví dụ /bo ' + cho[0].id + '\n\n' + danhSachChoDuyet_();
    var r = t.ma ? cho.filter(function (x) { return x.id === t.ma; })[0] : cho[0];
    if (!r) return 'Không có video nào đang chờ duyệt để bỏ.';
    ghi_(sh, r._row, { trang_thai: 'LOAI', duyet: 'BO', ghi_chu: 'Người duyệt bỏ qua Zalo' + (t.con ? ': ' + t.con : '') });
    return '🗑 Đã bỏ video ' + r.id + ', sẽ không đăng.';
  } finally { khoa.releaseLock(); }
}

function danhSachChoDuyet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var cho = videoChoDuyet_(docHang_(sh));
  if (!cho.length) return '✅ Không có video nào chờ duyệt.';
  return '🎞 Video chờ duyệt (' + cho.length + '):\n' + cho.slice(0, 8).map(function (r) {
    return '• ' + r.id + ': ' + (r.chu_de || '') + '\n  https://drive.google.com/file/d/' + r.file_video + '/view';
  }).join('\n') + '\nNhắn /duyet <mã>, /sua <mã> <góp ý> hoặc /bo <mã>.';
}

// Góp ý -> chép kịch bản hiện tại thành bản nháp, quay lại bước viết kịch bản (ưu tiên), Gemini sửa theo góp ý rồi dựng lại.
function yeuCauSuaVideo_(chat, chu) {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(20000)) return '⏳ Hệ thống đang bận, thử lại sau 1 phút nhé.';
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var hang = docHang_(sh);
    var cho = videoChoDuyet_(hang);
    var t = tachLenh_(chu, hang.map(function (r) { return r.id; }));
    if (!t.ma && cho.length > 1) return 'Đang có ' + cho.length + ' video chờ duyệt, hãy ghi rõ mã, ví dụ /sua ' + cho[0].id + ' <góp ý>\n\n' + danhSachChoDuyet_();
    var r = t.ma ? hang.filter(function (x) { return x.id === t.ma; })[0] : cho[0];
    if (!r) return 'Không tìm thấy video để sửa. Nhắn /cho để xem mã video.';
    if (!t.con || t.con.length < 5) return 'Hãy ghi rõ góp ý, ví dụ: /sua ' + r.id + ' cảnh 2 vẽ bông tuyết to hơn, giọng chậm lại ở đáp số';
    if (!r.file_kich_ban) return 'Video ' + r.id + ' không còn tệp kịch bản để sửa.';
    var kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString());
    luuNhapKichBan_(r.id, kb);
    ghi_(sh, r._row, { trang_thai: 'DA_GIAI', gop_y: t.con.slice(0, 1000), uu_tien: 1, zalo_chat: chat, duyet: '', so_lan_loi: 0, ghi_chu: 'Sửa theo góp ý: ' + t.con.slice(0, 200) });
    henUuTien_(20);
    return '✍️ Đã nhận góp ý cho ' + r.id + '. Hệ thống ưu tiên sửa kịch bản theo góp ý rồi dựng lại, xong sẽ gửi video mới để bạn duyệt.';
  } finally { khoa.releaseLock(); }
}

/* ===================== SẢN PHẨM ===================== */

function nhanSanPham_(chat, chu, anh) {
  var con = String(chu || '').replace(/^\s*\/sanpham\s*/i, '').trim();
  if (!con && !anh) return 'Gửi theo mẫu: /sanpham <tên sản phẩm hoặc link> [ghi chú]. Có thể gửi ảnh sản phẩm kèm chú thích /sanpham.';
  var link = (/(https?:\/\/\S+)/.exec(con) || [])[1] || '';
  var ten = con.replace(link, '').trim();
  var sh = shSanPham_();
  var id = 'SP' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss');
  sh.appendRow(COT_SP.map(function (k) {
    return { id: id, trang_thai: 'CHO_TIM', ten: ten.slice(0, 200), link: link, anh: anh || '', zalo_chat: chat, cap_nhat: new Date(), so_de: 0 }[k] || '';
  }));
  nhatKy_('SAN_PHAM', id + ': nhận "' + (ten || link || 'ảnh') + '"');
  henUuTien_(20);
  return '🔎 Đã nhận sản phẩm (' + id + '). Hệ thống đang tìm giá ở nhiều nơi bán, thông số, cách các nơi bán giới thiệu và kiểm tra độ chính xác (khoảng 1-3 phút), xong sẽ gửi tóm tắt để bạn xác nhận.';
}

function xacNhanSanPham_(chu) {
  var sh = shSanPham_();
  var ds = docSP_(sh);
  var cho = ds.filter(function (r) { return r.trang_thai === 'CHO_XAC_NHAN'; }).sort(function (a, b) { return new Date(b.cap_nhat) - new Date(a.cap_nhat); });
  var t = tachLenh_(chu, ds.map(function (r) { return r.id; }));
  var r = t.ma ? ds.filter(function (x) { return x.id === t.ma; })[0] : cho[0];
  if (!r) return 'Không có sản phẩm nào chờ xác nhận.';
  var gia = Number(String(t.con).replace(/[^\d]/g, ''));
  if (!(gia > 0)) return 'Ghi kèm giá bạn bán (đồng), ví dụ: /xacnhan ' + r.id + ' 249000';
  ghiSP_(sh, r._row, { trang_thai: 'DA_XAC_NHAN', gia_ban: gia });
  henUuTien_(20);
  return '✅ Đã xác nhận ' + (r.ten || r.id) + ' giá ' + gia.toLocaleString('vi-VN') + 'đ. Hệ thống đang sáng tác bài toán hữu ích có sản phẩm làm bối cảnh, rồi giải, viết kịch bản và dựng video (ưu tiên).';
}

function huySanPham_(chu) {
  var sh = shSanPham_();
  var ds = docSP_(sh);
  var t = tachLenh_(chu, ds.map(function (r) { return r.id; }));
  var r = t.ma ? ds.filter(function (x) { return x.id === t.ma; })[0] : ds.filter(function (x) { return /CHO_/.test(x.trang_thai) || x.trang_thai === 'DA_XAC_NHAN'; }).pop();
  if (!r) return 'Không có sản phẩm nào để hủy.';
  ghiSP_(sh, r._row, { trang_thai: 'BO' });
  return '🗑 Đã hủy sản phẩm ' + r.id + '.';
}

// Chạy trong chế độ ưu tiên (chayBoPhan1): tìm hiểu sản phẩm mới, tạo đề cho sản phẩm đã xác nhận.
function xuLySanPham_(bc, bat) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_SAN_PHAM);
  if (!sh) return;
  var ds = docSP_(sh);
  for (var i = 0; i < ds.length; i++) {
    var r = ds[i];
    if (r.trang_thai !== 'CHO_TIM' && r.trang_thai !== 'DA_XAC_NHAN') continue;
    if (!duThoiGianViec_(bat, uocGoiMs_() + 20000)) return;
    try {
      if (r.trang_thai === 'CHO_TIM') timHieuSanPham_(sh, r);
      else taoDeTuSanPham_(sh, r, bc);
    } catch (e) {
      if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e.message))) throw e;
      nhatKy_('SAN_PHAM_LOI', r.id + ': ' + e.message);
      ghiSP_(sh, r._row, { trang_thai: 'LOI', ghi_chu: String(e.message).slice(0, 300) });
      guiZaloToi_(r.zalo_chat, '⚠️ Sản phẩm ' + r.id + ' gặp lỗi: ' + String(e.message).slice(0, 200) + '. Bạn có thể gửi lại /sanpham.');
    }
  }
}

function traDoiTuongJson_(txt) {
  var s = String(txt || '').replace(/```json|```/g, '');
  var a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch (e) {}
  try { return JSON.parse(s.replace(/(?<!\\)\\(?![\\"\/u])/g, '\\\\')); } catch (e2) { return null; }
}

function timHieuSanPham_(sh, r) {
  var ten = String(r.ten || '').trim();
  // chỉ có ảnh: nhận diện sản phẩm từ ảnh trước
  if (!ten && r.anh) {
    var res = UrlFetchApp.fetch(String(r.anh), { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      var b = res.getBlob();
      var nd = goiGemini_('Ảnh này là một sản phẩm đang bán trên mạng. Cho biết tên sản phẩm chính xác nhất có thể (thương hiệu, dòng, dung tích/kích thước nếu thấy). Trả JSON {"ten":""}', 0.1,
        { suyNghi: 'low', anh: { mime: /^image\//.test(b.getContentType()) ? b.getContentType() : 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) } });
      ten = String((nd && nd.ten) || '').trim();
    }
    if (!ten) throw new Error('Không nhận diện được sản phẩm từ ảnh, hãy gửi kèm tên sản phẩm');
    ghiSP_(sh, r._row, { ten: ten });
  }
  var prompt = 'Dùng Google Search tìm thông tin CHÍNH XÁC, CÓ NGUỒN về sản phẩm sau (thị trường Việt Nam, giá bằng đồng):\n' +
    'Sản phẩm: ' + ten + (r.link ? '\nLink người dùng gửi: ' + r.link : '') + (r.ghi_chu ? '\nGhi chú: ' + r.ghi_chu : '') + '\n' +
    'YÊU CẦU:\n- Chỉ ghi điều thực sự tìm thấy trên các trang web; mỗi thông số và mỗi mức giá phải kèm URL nguồn. Không chắc thì bỏ, không bịa.\n' +
    '- "gia": giá đang bán ở càng nhiều nơi càng tốt (sàn TMĐT, website hãng, cửa hàng), mỗi mục {noi_ban, gia (số đồng, không chữ), url}.\n' +
    '- "thong_so": thông số kỹ thuật/công dụng chính, mỗi mục {ten, gia_tri, nguon:[url...]} (liệt kê MỌI nguồn nói giống nhau).\n' +
    '- "diem_noi_bat_noi_ban": các nơi bán và sản phẩm cạnh tranh thường nhấn mạnh điều gì khi giới thiệu (DIỄN ĐẠT LẠI ngắn gọn, không chép nguyên văn), mỗi mục {noi_dung, nguon}.\n' +
    '- "loi_quang_cao_chua_kiem_chung": những lời quảng cáo phổ biến nhưng KHÔNG có bằng chứng độc lập (ví dụ "tốt nhất", "diệt 99% vi khuẩn" không có kiểm nghiệm).\n' +
    '- "doi_thu": tên các sản phẩm/thương hiệu cạnh tranh trực tiếp.\n' +
    'Chỉ trả về MỘT đối tượng JSON: {"ten_chuan":"","thuong_hieu":"","loai":"","mo_ta_ngan":"","thong_so":[],"gia":[],"diem_noi_bat_noi_ban":[],"danh_gia_chung":"","loi_quang_cao_chua_kiem_chung":[],"doi_thu":[]}';
  var kq = goiGeminiTimKiem_(prompt);
  if (!kq || !kq.text) throw new Error('Không tìm được thông tin sản phẩm (Gemini tìm kiếm không trả lời)');
  var hs = traDoiTuongJson_(kq.text);
  if (!hs) throw new Error('Kết quả tìm kiếm không đọc được');
  // xác minh: thông số có >= 2 nguồn khác tên miền, hoặc từ trang chính hãng
  var mien = function (u) { return String(u || '').replace(/^https?:\/\/(www\.)?/i, '').split('/')[0].toLowerCase(); };
  var hang = String(hs.thuong_hieu || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  hs.thong_so = (Array.isArray(hs.thong_so) ? hs.thong_so : []).filter(function (x) { return x && x.ten && x.gia_tri; }).slice(0, 15).map(function (x) {
    var ns = (Array.isArray(x.nguon) ? x.nguon : [x.nguon]).filter(function (u) { return /^https?:\/\//.test(String(u)); });
    var dsMien = ns.map(mien).filter(function (m, k, a) { return a.indexOf(m) === k; });
    var chinhHang = hang.length >= 3 && dsMien.some(function (m) { return m.replace(/[^a-z0-9]/g, '').indexOf(hang) >= 0; });
    return { ten: String(x.ten).slice(0, 60), gia_tri: String(x.gia_tri).slice(0, 120), nguon: ns.slice(0, 4), xac_minh: dsMien.length >= 2 || chinhHang };
  });
  hs.gia = (Array.isArray(hs.gia) ? hs.gia : []).map(function (g) { return { noi_ban: String((g && g.noi_ban) || '').slice(0, 60), gia: Number(String((g && g.gia) || '').replace(/[^\d]/g, '')), url: String((g && g.url) || '') }; })
    .filter(function (g) { return g.gia >= 1000 && /^https?:\/\//.test(g.url); }).slice(0, 10);
  var dsGia = hs.gia.map(function (g) { return g.gia; }).sort(function (a, b) { return a - b; });
  hs.gia_thap = dsGia[0] || 0;
  hs.gia_cao = dsGia[dsGia.length - 1] || 0;
  hs.ngay_tim = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
  hs.mien_tim_kiem = kq.mien || [];
  var chuoi = JSON.stringify(hs);
  if (chuoi.length > 45000) { hs.diem_noi_bat_noi_ban = (hs.diem_noi_bat_noi_ban || []).slice(0, 5); chuoi = JSON.stringify(hs).slice(0, 45000); }
  ghiSP_(sh, r._row, { trang_thai: 'CHO_XAC_NHAN', ho_so: chuoi, ten: hs.ten_chuan || ten });
  var dat = hs.thong_so.filter(function (x) { return x.xac_minh; });
  var vnd = function (n) { return Number(n).toLocaleString('vi-VN') + 'đ'; };
  guiZaloToi_(r.zalo_chat, '📋 Hồ sơ sản phẩm ' + r.id + ': ' + (hs.ten_chuan || ten) + (hs.thuong_hieu ? ' (' + hs.thuong_hieu + ')' : '') + '\n' +
    (dsGia.length ? '💰 Giá trên thị trường: ' + vnd(hs.gia_thap) + (hs.gia_cao > hs.gia_thap ? ' – ' + vnd(hs.gia_cao) : '') + ' (' + dsGia.length + ' nơi bán, ngày ' + hs.ngay_tim + ')\n' : '💰 Chưa tìm được giá có nguồn rõ ràng\n') +
    (dat.length ? '✅ Thông số đã xác minh (≥ 2 nguồn hoặc chính hãng):\n' + dat.slice(0, 6).map(function (x) { return '• ' + x.ten + ': ' + x.gia_tri; }).join('\n') + '\n' : '⚠️ Chưa có thông số nào đủ 2 nguồn\n') +
    (hs.thong_so.length - dat.length > 0 ? '❔ ' + (hs.thong_so.length - dat.length) + ' thông số chỉ có 1 nguồn: sẽ KHÔNG dùng trong video\n' : '') +
    ((hs.diem_noi_bat_noi_ban || []).length ? '📣 Nơi bán thường nhấn mạnh: ' + hs.diem_noi_bat_noi_ban.slice(0, 3).map(function (x) { return x.noi_dung || x; }).join('; ') + '\n' : '') +
    ((hs.loi_quang_cao_chua_kiem_chung || []).length ? '🚫 Lời quảng cáo chưa kiểm chứng (sẽ tránh): ' + hs.loi_quang_cao_chua_kiem_chung.slice(0, 3).join('; ') + '\n' : '') +
    '👉 Đúng thì trả lời: /xacnhan ' + r.id + ' <giá bạn bán>, ví dụ /xacnhan ' + r.id + ' ' + (hs.gia_thap || 199000) + '\nKhông dùng: /huysp ' + r.id);
}

function taoDeTuSanPham_(sh, r, bc) {
  var hs = {};
  try { hs = JSON.parse(String(r.ho_so || '{}')); } catch (e) {}
  var dat = (hs.thong_so || []).filter(function (x) { return x.xac_minh; }).map(function (x) { return x.ten + ': ' + x.gia_tri; });
  var ten = hs.ten_chuan || r.ten;
  var prompt = 'Bạn là giáo viên Toán giỏi, làm video TikTok dạy toán thực tế có ích cho người xem (học sinh THPT và người lớn đi mua sắm).\n' +
    'Hãy SÁNG TÁC 2 bài toán mà một sản phẩm có thật là BỐI CẢNH tự nhiên. Bài toán phải dạy một kỹ năng toán hữu ích (tính phần trăm giảm giá thật, so sánh phương án mua, chi phí dùng lâu dài, tối ưu kích thước/vật liệu, cấp số nhân khi tiết kiệm, xác suất trong chương trình khuyến mãi...), có giá trị ngay cả khi người xem không mua.\n' +
    'SẢN PHẨM: ' + ten + (hs.thuong_hieu ? ' (' + hs.thuong_hieu + ')' : '') + '\nGiá kênh bán: ' + r.gia_ban + ' đồng' +
    (hs.gia_thap ? '\nGiá trên thị trường (ngày ' + hs.ngay_tim + '): ' + hs.gia_thap + (hs.gia_cao > hs.gia_thap ? ' đến ' + hs.gia_cao : '') + ' đồng' : '') +
    '\nThông số ĐÃ XÁC MINH (chỉ được dùng các thông số này): ' + (dat.length ? dat.join('; ') : '(không có, chỉ dùng giá)') + '\n' +
    'QUY TẮC (bắt buộc):\n- Chỉ dùng số liệu ở trên; số liệu giả định thêm (ví dụ số ngày dùng, số người) phải hợp lý và nói rõ là giả định trong đề.\n' +
    '- KHÔNG khen sản phẩm, KHÔNG dùng "tốt nhất", "rẻ nhất", "số 1", "duy nhất", "cam kết", KHÔNG nhắc tên thương hiệu/sản phẩm cạnh tranh, KHÔNG kêu gọi mua.\n' +
    '- Đề hỏi đúng MỘT đại lượng; đáp số là một con số (toán thực tế) hoặc một xác suất dạng phân số; đủ dữ kiện bằng chữ; kiểm chứng được bằng máy.\n' +
    yeuCauDang_('THUC_TE') + '- Có thể dùng dạng xác suất (' + MO_TA_DANG_.XAC_SUAT + ') nếu thật tự nhiên, khi đó "mon" là "XAC_SUAT".\n' +
    'Trả về MỘT mảng JSON, mỗi phần tử: {"mon":"THUC_TE|XAC_SUAT","dang":"","lop":"10|11|12","chu_de":"","de_bai":"","cach_dua_san_pham":"sản phẩm xuất hiện trong bài thế nào","diem_tu_duy":1-10,"yeu_to_tu_duy":"","bay_thuong_gap":""}';
  var kq = goiGemini_(prompt, 0.7, { suyNghi: cauHinh_('MUC_SUY_NGHI_KICH_BAN') });
  if (kq && !Array.isArray(kq) && Array.isArray(kq.de)) kq = kq.de;
  if (!Array.isArray(kq) || !kq.length) throw new Error('Không sáng tác được bài toán cho sản phẩm');
  var shH = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var sp = JSON.stringify({ id: r.id, ten: ten, thuong_hieu: hs.thuong_hieu || '', gia_ban: Number(r.gia_ban) || 0, gia_thap: hs.gia_thap || 0, gia_cao: hs.gia_cao || 0, ngay: hs.ngay_tim || '', thong_so: dat.slice(0, 8), doi_thu: (hs.doi_thu || []).slice(0, 10) });
  var them = 0;
  kq.slice(0, 2).forEach(function (d, i) {
    if (!d || !d.de_bai) return;
    var mon = String(d.mon || '').toUpperCase() === 'XAC_SUAT' ? 'XAC_SUAT' : 'THUC_TE';
    themHang_(shH, {
      id: 'SD' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss') + '-' + i, trang_thai: 'MOI', mon: mon, lop: /^(10|11|12)$/.test(String(d.lop)) ? String(d.lop) : '10',
      chu_de: String(d.chu_de || ten).slice(0, 60), de_bai: d.de_bai, nguon: 'SAN_PHAM|' + String(ten).slice(0, 40), diem_tu_duy: d.diem_tu_duy || '',
      yeu_to_tu_duy: d.yeu_to_tu_duy || '', bay_thuong_gap: d.bay_thuong_gap || '', uu_tien: 1, zalo_chat: r.zalo_chat, san_pham: sp, so_lan_loi: 0, cap_nhat: new Date(), ma_bam: bam_(d.de_bai)
    });
    them++;
  });
  if (bc) bc.moi += them;
  ghiSP_(sh, r._row, { trang_thai: 'DA_DUNG', so_de: them });
  guiZaloToi_(r.zalo_chat, '🧮 Đã sáng tác ' + them + ' bài toán có ' + ten + ' làm bối cảnh:\n' + kq.slice(0, 2).map(function (d, i) { return (i + 1) + '. ' + latexDoc_(String(d.de_bai || '')).slice(0, 220); }).join('\n') +
    '\nĐang giải, kiểm chứng, viết kịch bản và dựng video (ưu tiên). Video xong sẽ gửi để bạn duyệt.');
}

// Các lời quảng cáo quá đà không được xuất hiện trong video có sản phẩm.
var LOI_QUA_DA_ = /tốt nhất|rẻ nhất|số 1|số một thị trường|hàng đầu|duy nhất|cam kết|100\s*%|tuyệt đối|thần kỳ|mua ngay|chốt đơn|săn ngay/i;
function kiemTraSanPhamTrongKichBan_(kb, sp) {
  if (!sp) return [];
  var loi = [];
  var chu = JSON.stringify([kb.hook, kb.hook_chu, kb.tieu_de, (kb.canh || []).map(function (c) { return [c.loi_thoai, c.tieu_de_canh, c.noi_dung_man_hinh, c.chu_thich]; })]);
  var m = LOI_QUA_DA_.exec(chu);
  if (m) loi.push('QUANG_CAO_QUA_DA: kịch bản có cụm "' + m[0] + '". Video có sản phẩm phải trung thực, không dùng lời quảng cáo quá đà, không kêu gọi mua; hãy viết lại câu đó trung tính.');
  (sp.doi_thu || []).forEach(function (t) {
    t = String(t || '').trim();
    if (t.length >= 3 && chu.toLowerCase().indexOf(t.toLowerCase()) >= 0) loi.push('NHAC_DOI_THU: kịch bản nhắc tới "' + t + '" (sản phẩm cạnh tranh). Không nêu tên đối thủ.');
  });
  return loi;
}
