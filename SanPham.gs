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
 * B) VIDEO GIỚI THIỆU SẢN PHẨM BẰNG BÀI TOÁN (minh bạch, hợp lý, dùng ẢNH THẬT của sản phẩm)
 *      /sanpham <tên sản phẩm hoặc link> [ghi chú]   (gửi kèm ảnh sản phẩm, ghi lệnh ở phần chú thích ảnh)
 *      /anhsp [mã]   gửi THÊM ảnh thật của sản phẩm (ghi lệnh ở chú thích ảnh), tối đa 6 ảnh/sản phẩm
 *    Ảnh lưu ngay vào Drive VIDEO_XACSUAT/san_pham/<mã>/ (link ảnh Zalo có hạn dùng). Có link mà không có ảnh: hệ thống thử lấy ảnh
 *    đại diện của trang bán. AI xem từng ảnh (góc chụp, chữ trên bao bì, kích thước nhìn thấy) để viết đề và chọn ảnh cho từng cảnh.
 *    1. Hệ thống dùng Gemini + Google Search tìm: giá ở nhiều nơi bán (có nguồn, ngày), thông số, cách các nơi bán/đối thủ giới
 *       thiệu (chỉ rút ý), đánh giá chung, các lời quảng cáo không kiểm chứng được. Thông số chỉ được coi là ĐÃ XÁC MINH khi có
 *       từ 2 nguồn trở lên (hoặc nguồn chính hãng).
 *    2. Bot gửi tóm tắt hồ sơ. Bạn kiểm tra rồi trả lời:  /xacnhan [mã] <giá bạn bán>   (ví dụ /xacnhan 249000)   hoặc /huysp [mã]
 *    3. Hệ thống sáng tác bài toán XOAY QUANH sản phẩm (công dụng thật, giá, thông số đã xác minh -> phép tính có ích: chi phí mỗi lần dùng,
 *       tiết kiệm sau N tháng, dung tích/kích thước, mua combo...), rồi giải - kiểm chứng - viết kịch bản - dựng video như đề ưu tiên.
 *       Video: ảnh thật xuất hiện ở mở đầu + các cảnh dữ kiện/lời giải (vật anh_that), cuối video có thẻ sản phẩm (ảnh + tên + giá + "link ở mô tả").
 *       Đề / video không đạt BỘ PHẬN KIỂM DUYỆT YÊU CẦU (NangCao.gs) -> bỏ và tự sáng tác đề mới cho sản phẩm (tối đa 6 đề).
 *    4. Minh bạch: video luôn có nhãn nhỏ "Có sản phẩm do kênh bán" và dòng tên sản phẩm ở cuối; mô tả bài đăng ghi rõ; TikTok bật nhãn
 *       nội dung thương mại (quảng bá doanh nghiệp của bạn). Kịch bản không được dùng lời quảng cáo quá đà ("tốt nhất", "rẻ nhất",
 *       "số 1"...) hay nhắc tên đối thủ; vi phạm là lỗi nặng, AI phải sửa.
 * ============================================================
 */

var TEN_SAN_PHAM = 'SAN_PHAM';
var COT_SP = ['id', 'trang_thai', 'ten', 'link', 'ghi_chu', 'anh', 'ho_so', 'gia_ban', 'zalo_chat', 'cap_nhat', 'so_de', 'anh_ds'];

function shSanPham_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_SAN_PHAM);
  if (!sh) { sh = ss.insertSheet(TEN_SAN_PHAM); sh.appendRow(COT_SP); sh.setFrozenRows(1); }
  else if (sh.getLastColumn() < COT_SP.length) sh.getRange(1, 1, 1, COT_SP.length).setValues([COT_SP]);   // sheet cũ: thêm cột mới
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
function canDuyet_() { return String(cauHinh_('DUYET_TRUOC_KHI_DANG') || 'TAT').toUpperCase() === 'BAT'; }
// Video đang được AI kiểm duyệt hoặc chưa đạt kiểm duyệt thì KHÔNG bao giờ được đăng.
// Khi DUYET_TRUOC_KHI_DANG = TAT (mặc định mới): AI kiểm duyệt đạt sẽ tự đánh dấu DA_DUYET để tự đăng mỗi ngày 2 video.
function daDuyet_(r) {
  var dv = String(r.duyet || '');
  if (dv === 'AI_XEM' || dv === 'KHONG_DAT' || dv === 'BO') return false;
  var tuKT = typeof chNC_ === 'function' ? String(chNC_('TU_KIEM_TRA_VIDEO') || 'BAT').toUpperCase() !== 'TAT' : true;
  if (tuKT && !canDuyet_()) return dv === 'DA_DUYET';
  return !canDuyet_() || dv === 'DA_DUYET';
}

/* ===================== LỆNH ZALO MỚI (gọi từ nhanZalo_) ===================== */

// Trả true nếu tin nhắn là lệnh của tệp này (đã trả lời người gửi).
// NHIỀU LỆNH TRONG MỘT TIN: mỗi dòng một lệnh (/duyet, /sua, /bo, /xacnhan...; viết "duyệt", "sửa", "bỏ" không dấu gạch cũng hiểu),
// một lệnh nhiều mã ("/duyet A B C", "/bo A, B lý do"), "/duyet tatca" = duyệt mọi video đã đạt kiểm duyệt đang chờ.
// Dòng không phải lệnh nằm ngay dưới một lệnh được nối vào lệnh đó (góp ý /sua viết nhiều dòng). Làm LẦN LƯỢT đúng thứ tự
// (thứ tự duyệt = thứ tự số tập), rồi trả MỘT tin tổng hợp kết quả từng dòng.
function xuLyLenhZaloMoi_(chat, chu, anh) {
  var ds = tachNhieuLenh_(chu);
  if (ds.length >= 2) { guiZaloToi_(chat, chayNhieuLenh_(chat, ds, anh)); return true; }
  var tl = traLoiLenh_(chat, ds.length ? ds[0] : chu, anh);
  if (tl === null) return false;
  guiZaloToi_(chat, tl);
  return true;
}
// một lệnh -> câu trả lời (null nếu không phải lệnh của tệp này)
function traLoiLenh_(chat, chu, anh) {
  var l = String(chu || '').trim().toLowerCase();
  if (/^\/duyet\b/.test(l)) return duyetVideo_(chu);
  if (/^\/sua\b/.test(l)) return yeuCauSuaVideo_(chat, chu);
  if (/^\/bo\b/.test(l)) return boVideo_(chu, chat);
  if (/^\/cho\b/.test(l)) return danhSachChoDuyet_();
  if (/^\/(suavideocu|dunglai|nangcap)\b/.test(l) && typeof quetVaSuaVideoCuDrive === 'function') return quetVaSuaVideoCuDrive();
  if (/^\/(videodai|10phut|youtube10p)\b/.test(l) && typeof taoVideoDaiZalo_ === 'function') return taoVideoDaiZalo_(chat, chu);
  if (/^\/(capnhatcode|dongbocode|upcode)\b/.test(l) && typeof capNhatMaAppsScriptTuGitHub === 'function') return capNhatMaAppsScriptTuGitHub();
  if (/^\/xem\b/.test(l) && typeof xemVideoKhongDat_ === 'function') return xemVideoKhongDat_(chu);
  if (/^\/sanpham\b/.test(l)) return nhanSanPham_(chat, chu, anh);
  if (/^\/anhsp\b/.test(l)) return themAnhSanPham_(chu, anh);
  if (/^\/xacnhan\b/.test(l)) return xacNhanSanPham_(chu);
  if (/^\/huysp\b/.test(l)) return huySanPham_(chu);
  if (/^\/hoc\b/.test(l) && typeof nhanLenhHoc_ === 'function') return nhanLenhHoc_(chu);
  if (/^\/quytac\b/.test(l) && typeof danhSachQuyTac_ === 'function') return danhSachQuyTac_();
  if (/^\/xoaquytac\b/.test(l) && typeof xoaQuyTac_ === 'function') return xoaQuyTac_(chu);
  if (/^\/gopy\b/.test(l) && typeof nhanGopYChung_ === 'function') return nhanGopYChung_(chat, chu);
  if (/^\/(tt|trangthai)\b/.test(l) && typeof tinhTrangUuTien_ === 'function') return tinhTrangUuTien_();
  if (/^\/(key|keys|khokey|kiemtrakey)\b/.test(l) && typeof thongTinKhoKeyZalo_ === 'function') return thongTinKhoKeyZalo_(true);
  if (/^\/(token|hantoken)\b/.test(l) && typeof thongTinTokenGitHub_ === 'function') return thongTinTokenGitHub_();
  if (/^\/hinhhoc\b/.test(l)) return typeof taoDeHinhNgay_ === 'function' ? taoDeHinhNgay_(chat, chu) : '⚠️ Chưa có tệp HinhHoc.gs trong Apps Script: thêm tệp mới HinhHoc.gs (bản bàn giao) rồi Triển khai phiên bản mới.';
  if (/^\/phongcach\b/.test(l) && typeof bangPhongCach_ === 'function') return bangPhongCach_() + (thongKeLyDoBo_() ? '\n📉 ' + thongKeLyDoBo_() : '');
  return null;
}
var MA_DE_RE_ = /^[A-Za-z]{2}\d{6}-\d{6}(-\d+)?$/;
var LENH_CHU_ = { 'duyet': '/duyet', 'duyệt': '/duyet', 'sua': '/sua', 'sửa': '/sua', 'bo': '/bo', 'bỏ': '/bo', 'xem': '/xem', 'xacnhan': '/xacnhan', 'xác nhận': '/xacnhan' };
var TAT_CA_RE_ = /^(tatca|tất cả|tat ca|het|hết|all|toanbo|toàn bộ)$/i;
// một dòng -> lệnh chuẩn ("/duyet ...") hoặc '' nếu không phải lệnh
function chuanDongLenh_(dong) {
  var x = String(dong || '').trim().replace(/^([-•*+]|\d+[.)])\s*/, '');   // bỏ gạch đầu dòng / số thứ tự
  if (/^\//.test(x)) return x;
  var m = /^(duyệt|duyet|sửa|sua|bỏ|bo|xem|xác nhận|xacnhan)\s+(.+)$/i.exec(x);
  if (!m) return '';
  var dau = m[2].trim().split(/[\s,;]+/)[0];
  if (!MA_DE_RE_.test(dau) && !TAT_CA_RE_.test(dau) && !/^(tất|tat)\b/i.test(m[2].trim())) return '';   // tránh nhầm câu thường / đề toán
  return LENH_CHU_[m[1].toLowerCase()] + ' ' + m[2].trim();
}
function tachNhieuLenh_(chu) {
  var dong = String(chu || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
  var ds = [];
  dong.forEach(function (d) {
    var c = chuanDongLenh_(d);
    if (c) ds.push(c);
    else if (ds.length) ds[ds.length - 1] += ' ' + d;   // dòng nối tiếp lệnh trên (góp ý nhiều dòng)
  });
  // lệnh nhiều mã: /duyet A B C | /bo A, B lý do | /duyet tatca
  var ra = [];
  ds.forEach(function (c) {
    var m = /^\/(duyet|bo)\s+(.+)$/i.exec(c);
    if (!m) { ra.push(c); return; }
    var phan = m[2].replace(/,/g, ' ').trim().split(/\s+/);
    if (TAT_CA_RE_.test(phan[0]) || (/^(tất|tat)$/i.test(phan[0]) && /^(cả|ca)$/i.test(phan[1] || ''))) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
      var cho = docHang_(sh).filter(function (r) { return r.trang_thai === 'CO_VIDEO' && r.file_video && String(r.duyet || '') === 'CHO'; })
        .sort(function (a, b) { return new Date(a.cap_nhat).getTime() - new Date(b.cap_nhat).getTime(); });   // video cũ trước -> tập nhỏ trước
      var lyDo = phan.slice(/^(tất|tat)$/i.test(phan[0]) ? 2 : 1).join(' ');
      if (!cho.length) ra.push('/' + m[1] + ' __KHONG_CO__');
      cho.forEach(function (r) { ra.push('/' + m[1] + ' ' + r.id + (lyDo ? ' ' + lyDo : '')); });
      return;
    }
    var ma = [];
    while (phan.length && MA_DE_RE_.test(phan[0])) ma.push(phan.shift());
    if (ma.length <= 1) { ra.push(c); return; }
    ma.forEach(function (id) { ra.push('/' + m[1] + ' ' + id + (phan.length ? ' ' + phan.join(' ') : '')); });
  });
  return ra;
}
function chayNhieuLenh_(chat, ds, anh) {
  var kq = [], ok = 0;
  _dang_chay_nhieu_ = true;
  var coBoKhongLyDo = false;
  ds.slice(0, 40).forEach(function (c, i) {
    var tl;
    if (/__KHONG_CO__/.test(c)) tl = 'Không có video nào đã đạt kiểm duyệt đang chờ duyệt.';
    else {
      try { tl = traLoiLenh_(chat, c, i === 0 ? anh : ''); } catch (e) { tl = '⚠️ Lỗi: ' + String(e.message).slice(0, 120); }
      if (tl === null) tl = '❓ Không hiểu lệnh này';
    }
    if (/^(✅|🗑|✍️|📷|🔎|🧠|📚)/.test(String(tl))) ok++;
    kq.push((i + 1) + '. ' + c.replace(/__KHONG_CO__/, '').slice(0, 60) + '\n   → ' + String(tl).split('\n')[0].slice(0, ds.length > 12 ? 110 : 200));
  });
  _dang_chay_nhieu_ = false;
  coBoKhongLyDo = ds.some(function (c) { return /^\/bo\s+[A-Za-z]{2}\d{6}-\d{6}(-\d+)?\s*$/.test(c); });
  nhatKy_('ZALO_NHIEU_LENH', ds.length + ' lệnh, ' + ok + ' thành công');
  return '📋 Đã thực hiện ' + Math.min(ds.length, 40) + ' lệnh (' + ok + ' thành công)' + (ds.length > 40 ? ', mỗi tin tối đa 40 lệnh' : '') + ':\n' + kq.join('\n') + (coBoKhongLyDo ? '\n' + cauHoiLyDo_() : '');
}
// nhanZalo_ dùng để nhận ra tin nhắn là (các) lệnh dù dòng đầu không có dấu "/"
function laTinLenh_(chu) { var d = String(chu || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean)[0]; return !!d && !!chuanDongLenh_(d); }

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
  var coKhoa = khoa.tryLock(4000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var hang = docHang_(sh);
    var cho = videoChoDuyet_(hang);
    var t = tachLenh_(chu, hang.map(function (r) { return r.id; }));
    if (!t.ma && cho.length > 1) return 'Đang có ' + cho.length + ' video chờ duyệt, hãy ghi rõ mã, ví dụ /duyet ' + cho[0].id + '\n\n' + danhSachChoDuyet_();
    var r = t.ma ? hang.filter(function (x) { return x.id === t.ma; })[0] : cho[0];
    if (!r) return 'Không có video nào đang chờ duyệt.';
    // ghi THỜI ĐIỂM DUYỆT (đăng theo đúng thứ tự duyệt -> số tập theo thứ tự duyệt; video chưa duyệt / bị bỏ không chiếm số)
    var kqD = {};
    try { kqD = JSON.parse(String(r.link_dang || '{}')) || {}; } catch (eD) { kqD = {}; }
    kqD._duyet_luc = Date.now();
    ghi_(sh, r._row, { duyet: 'DA_DUYET', link_dang: JSON.stringify(kqD) });
    SpreadsheetApp.flush();
    nhatKy_('DUYET_VIDEO', r.id);
    if (typeof ghiKetQuaPhongCach_ === 'function') ghiKetQuaPhongCach_(r.id, true);   // đạo diễn sáng tạo học: phong cách này được duyệt
    r.duyet = 'DA_DUYET'; r.link_dang = JSON.stringify(kqD);
    var bat = String(cauHinh_('DANG_TU_DONG') || 'BAT').toUpperCase() === 'BAT';
    var tapDuKien = typeof duKienTap_ === 'function' ? duKienTap_(hang, r) : 0;
    return '✅ Đã duyệt ' + r.id + ' (' + (r.chu_de || '') + ').' +
      (tapDuKien ? ' Dự kiến đăng là Toán lớp ' + String(r.lop).replace(/[^0-9]/g, '') + ' – Tập ' + tapDuKien + ' (số chính thức chốt lúc đăng, theo số bài đã có trên các kênh).' : '') + (bat ? ' Video sẽ được đăng ở khung giờ tới (' + (cauHinh_('GIO_DANG') || '11:30,19:30') + ').' : ' Lịch đăng tự động đang TẮT (CAU_HINH > DANG_TU_DONG); muốn đăng ngay dùng menu 📤 trong Sheet.') +
      (cho.length > 1 ? '\nCòn ' + (cho.length - 1) + ' video chờ duyệt, nhắn /cho để xem.' : '');
  } finally { if (coKhoa) { try { khoa.releaseLock(); } catch (eL) {} } }
}

// /bo:
// - Nếu kèm góp ý về hình ảnh / chữ / bố cục / lời giảng / nhịp điệu (không phải yêu cầu "xóa hẳn" hay "đề dở"):
//   TỰ ĐỘNG chuyển sang nhờ AI SỬA LẠI KỊCH BẢN theo góp ý đó rồi dựng lại (không vứt bỏ video/đề bài).
// - Nếu chỉ "/bo <mã>" hoặc ghi rõ "xóa hẳn / bỏ hẳn / đề dở": tạm giữ bản sao kịch bản trong CHO_LY_DO_BO để nếu bạn trả lời
//   lý do 1-6 (lỗi hình/chữ/cách edit) thì hệ thống khôi phục và nhờ AI sửa lại kịch bản ngay; chỉ xóa vĩnh viễn khi đề không hay (số 7).
function boVideo_(chu, chat) {
  var khoa = LockService.getScriptLock();
  var coKhoa = khoa.tryLock(4000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var tatCa = docHang_(sh).filter(function (r) { return r.id && r.trang_thai !== 'DA_DANG' && r.trang_thai !== 'DA_XONG'; });
    var cho = tatCa.filter(function (r) { return r.trang_thai === 'CO_VIDEO' && r.file_video; })
      .sort(function (a, b) { return new Date(b.cap_nhat).getTime() - new Date(a.cap_nhat).getTime(); });
    var t = tachLenh_(chu, tatCa.map(function (r) { return r.id; }));
    if (!t.ma && cho.length > 1) return 'Đang có ' + cho.length + ' video chờ duyệt, hãy ghi rõ mã, ví dụ /bo ' + cho[0].id + '\n\n' + danhSachChoDuyet_();
    var r = t.ma ? tatCa.filter(function (x) { return x.id === t.ma; })[0] : (cho[0] || tatCa[tatCa.length - 1]);
    if (!r) return 'Không có video/đề nào (chưa đăng) để bỏ.';

    // Nếu người dùng kèm góp ý sửa nội dung/hình ảnh/chữ (không phải yêu cầu xóa hẳn hay chê đề dở) -> nhờ AI sửa lại kịch bản theo góp ý!
    var con = String(t.con || '').trim();
    var muonXoaHan = !con || /xóa hẳn|bỏ hẳn|hủy hẳn|đề (dở|sai|chán|không hay)|\b7\b/i.test(con);
    if (!muonXoaHan && con.length >= 4) {
      if (coKhoa) { try { khoa.releaseLock(); coKhoa = false; } catch (eR) {} }
      return yeuCauSuaVideo_(chat || r.zalo_chat || '', '/sua ' + r.id + ' ' + con);
    }

    try { CacheService.getScriptCache().put('DA_BO_' + r.id, '1', 21600); } catch (eC) {}
    nhatKy_('BO_VIDEO', r.id + (con ? ': ' + con.slice(0, 150) : ''));
    if (typeof ghiKetQuaPhongCach_ === 'function') ghiKetQuaPhongCach_(r.id, false);   // phong cách này bị bỏ
    var ngB = luuNgonKichBan_(r);
    if (con) {
      if (typeof ghiGopYDeHoc_ === 'function') ghiGopYDeHoc_(r.id, 'bo', con + ' || BỐI CẢNH VIDEO ĐÃ BỎ - đề: ' + ngB.de + (ngB.kb ? ' | kịch bản: ' + ngB.kb.slice(0, 1200) : ''), chat || '');
      ghiLyDoBo_(maLyDo_(con).ma, con);
    } else {
      themChoLyDo_(r.id, ngB);   // bỏ mà KHÔNG ghi lý do: hỏi một câu chọn nhanh; nếu chọn 1-6 sẽ khôi phục để AI sửa lại kịch bản
    }
    var xoa = xoaHanVideo_(sh, r, con);
    SpreadsheetApp.flush();
    var tin = '🗑 Đã tạm gỡ video ' + r.id + ' khỏi lịch đăng' + (xoa.tep ? ' (đã dọn ' + xoa.tep + ' tệp video cũ trên Drive)' : '') + '.';
    return tin + (con || _dang_chay_nhieu_ ? '' : '\n' + cauHoiLyDo_());
  } finally { if (coKhoa) { try { khoa.releaseLock(); } catch (eL) {} } }
}

// Xóa hẳn một video: tệp trên Drive (video gốc, bản đã in số tập, ảnh bìa đăng, ảnh bìa, ảnh kiểm tra, kịch bản) + khối kịch bản ở
// DOC_KICH_BAN + dòng HANG_DOI; mã băm đề được lưu ở LUU_TRU để hệ thống không sinh/tìm lại đúng đề đó.
function xoaHanVideo_(sh, r, lyDo) {
  var ids = [r.file_video, r.anh_bia, r.anh_kt, r.file_kich_ban];
  try { var kq = JSON.parse(String(r.link_dang || '{}')) || {}; ids.push(kq._file_tap, kq._file_bia); } catch (e) {}
  var tep = 0;
  ids.filter(function (x, i, a) { return x && a.indexOf(x) === i; }).forEach(function (id) {
    try { DriveApp.getFileById(String(id)).setTrashed(true); tep++; } catch (e) {}
  });
  try { if (typeof xoaKichBanKhoiSheet_ === 'function') xoaKichBanKhoiSheet_(r.id); } catch (e) {}
  try { if (typeof xoaNhapKichBan_ === 'function') xoaNhapKichBan_(r.id); } catch (e) {}
  try {
    var lt = luuTruSheet_();
    lt.appendRow([r.ma_bam || bam_(r.de_bai), r.id, r.lop, String(r.de_bai || '').slice(0, 120), r.dap_an || '', 'BO_QUA_ZALO' + (lyDo ? ': ' + String(lyDo).slice(0, 80) : ''), new Date()]);
  } catch (e) {}
  // tìm lại dòng theo mã (số dòng có thể đã đổi nếu vừa xóa dòng khác trong cùng lượt)
  var dong = docHang_(sh).filter(function (x) { return x.id === r.id; })[0];
  if (dong) sh.deleteRow(dong._row);
  // Đặt cờ để chayDonDep đồng bộ bảng DOC_DE / DOC_KICH_BAN ở nền thay vì chạy đồng bộ mất 30-90s làm nghẽn lệnh tiếp theo
  try { PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1'); } catch (e) {}
  return { tep: tep };
}
// tóm tắt kịch bản + dữ liệu dòng trước khi xóa, để câu trả lời "Vì sao bạn bỏ?" sau đó vừa học được vừa KHÔI PHỤC SỬA LẠI KỊCH BẢN nếu lỗi thuộc về cách edit (1-6)
function luuNgonKichBan_(r) {
  var kbRaw = '', kbMoTa = '';
  try {
    kbRaw = DriveApp.getFileById(String(r.file_kich_ban)).getBlob().getDataAsString();
    var kb = JSON.parse(kbRaw);
    kbMoTa = typeof moTaKichBanChoDuyet_ === 'function' ? moTaKichBanChoDuyet_(kb).slice(0, 3000) : '';
  } catch (e) {}
  return {
    de: String(r.de_bai || '').slice(0, 600),
    kb: kbMoTa,
    kb_raw: kbRaw.slice(0, 45000),
    hang_backup: {
      id: r.id, lop: r.lop || '12', mon: r.mon || 'THUC_TE', chu_de: r.chu_de || '', de_bai: r.de_bai || '',
      dap_an: r.dap_an || '', dap_an_hien: r.dap_an_hien || '', cach_1: r.cach_1 || '', cach_2: r.cach_2 || '',
      kiem_chung: r.kiem_chung || '', ma_bam: r.ma_bam || ''
    }
  };
}

/* ---------- HỎI LÝ DO BỎ VIDEO (để hệ thống học, không bắt buộc) ---------- */
var _dang_chay_nhieu_ = false;
var LY_DO_BO_ = [
  ['1', 'Hình không khớp đề', 'hình minh họa không khớp đề (vẽ sai vật, sai cách sắp xếp, sai số đo)'],
  ['2', 'Chữ đè / rối mắt', 'chữ đè lên hình hoặc chồng nhiều lớp chữ, rối mắt'],
  ['3', 'Hình nhỏ / trống', 'hình minh họa quá nhỏ, sân khấu trống trải'],
  ['4', 'Lời giải / đáp án', 'lời giải hoặc đáp án sai / khó hiểu'],
  ['5', 'Giọng / nhịp', 'giọng đọc, nhịp video chưa hay (nhanh, chậm, đều đều)'],
  ['6', 'Nhàm chán, máy móc', 'cách giảng, cách dàn cảnh nhàm chán, máy móc, thiếu sáng tạo'],
  ['7', 'Đề không hay', 'đề bài không hay / không hợp kênh']
];
function cauHoiLyDo_() {
  return '❓ Vì sao bạn bỏ? Trả lời nhanh bằng số (có thể nhiều số, thêm chữ nếu muốn): ' +
    LY_DO_BO_.map(function (x) { return x[0] + ' ' + x[1]; }).join(' | ') + '. Ví dụ: "1 3" hoặc "2 chữ đáp án bị che". Bỏ qua cũng được.';
}
function themChoLyDo_(id, ngon) {
  var p = PropertiesService.getScriptProperties(), o = {};
  try { o = JSON.parse(p.getProperty('CHO_LY_DO_BO') || '{}'); } catch (e) { o = {}; }
  if (!o.luc || Date.now() - o.luc > 3 * 3600000) o = { ids: [] };
  if ((o.ids || []).indexOf(id) < 0) o.ids = (o.ids || []).concat([id]).slice(-10);
  o.ngon = o.ngon || {};
  if (ngon) o.ngon[id] = ngon;
  Object.keys(o.ngon).forEach(function (k) { if (o.ids.indexOf(k) < 0) delete o.ngon[k]; });
  o.luc = Date.now();
  p.setProperty('CHO_LY_DO_BO', JSON.stringify(o));
}
// "1 3 chữ bị che" -> {ma:['1','3'], chu:'chữ bị che'}; chữ tự do không có số thì đoán mã theo từ khóa
function maLyDo_(chu) {
  var s = String(chu || '').trim(), m = /^([1-7](?:[\s,;]+[1-7])*)\b\s*(.*)$/.exec(s);
  var ma = m ? m[1].split(/[\s,;]+/) : [], con = m ? m[2] : s, l = con.toLowerCase();
  if (!ma.length) {
    if (/không khớp|sai vật|sai hình|vẽ sai|không liên quan/.test(l)) ma.push('1');
    if (/đè|chồng|rối|che/.test(l)) ma.push('2');
    if (/nhỏ|trống/.test(l)) ma.push('3');
    if (/sai đáp|đáp án|lời giải|tính sai/.test(l)) ma.push('4');
    if (/giọng|nhịp|nhanh quá|chậm/.test(l)) ma.push('5');
    if (/nhàm|chán|máy móc|lặp|giống nhau/.test(l)) ma.push('6');
    if (/đề (dở|chán|không hay)|đề bài/.test(l)) ma.push('7');
  }
  return { ma: ma, chu: con };
}
function ghiLyDoBo_(ma, chu) {
  try {
    var p = PropertiesService.getScriptProperties(), tk = {};
    try { tk = JSON.parse(p.getProperty('LY_DO_BO_THONG_KE') || '{}'); } catch (e) { tk = {}; }
    (ma || []).forEach(function (k) { tk[k] = (tk[k] || 0) + 1; });
    p.setProperty('LY_DO_BO_THONG_KE', JSON.stringify(tk));
  } catch (e2) {}
}
function thongKeLyDoBo_() {
  var tk = {};
  try { tk = JSON.parse(PropertiesService.getScriptProperties().getProperty('LY_DO_BO_THONG_KE') || '{}'); } catch (e) { tk = {}; }
  var ds = LY_DO_BO_.filter(function (x) { return tk[x[0]]; }).sort(function (a, b) { return tk[b[0]] - tk[a[0]]; });
  return ds.length ? 'Lý do bạn bỏ video nhiều nhất: ' + ds.slice(0, 4).map(function (x) { return x[1] + ' (' + tk[x[0]] + ')'; }).join(', ') : '';
}
// nhanZalo_ gọi: tin trả lời câu hỏi lý do (trong 3 giờ sau khi bỏ). Trả câu trả lời của bot, hoặc null nếu tin không phải lý do.
function traLoiLyDoBo_(chat, chu) {
  var p = PropertiesService.getScriptProperties(), o = {};
  try { o = JSON.parse(p.getProperty('CHO_LY_DO_BO') || '{}'); } catch (e) { return null; }
  if (!o.ids || !o.ids.length || Date.now() - (o.luc || 0) > 3 * 3600000) return null;
  var s = String(chu || '').trim();
  if (!s || s.length > 160 || /^\//.test(s)) return null;
  var ld = maLyDo_(s);
  if (!ld.ma.length && (s.length > 80 || /\d{2,}/.test(s))) return null;   // giống một đề toán hơn là lý do -> để xử lý như đề
  var moTa = ld.ma.map(function (k) { var x = LY_DO_BO_.filter(function (y) { return y[0] === k; })[0]; return x ? x[2] : ''; }).filter(Boolean);
  var noiDung = moTa.join('; ') + (ld.chu ? (moTa.length ? '. Ghi chú: ' : '') + ld.chu : '');
  if (!noiDung) return null;
  ghiLyDoBo_(ld.ma, noiDung);
  // Nếu lý do thuộc nhóm 1-6 (hình ảnh, chữ, bố cục, lời giảng, giọng đọc, dàn cảnh nhàm chán) mà KHÔNG phải 7 (đề không hay):
  // Khôi phục lại đề bài + bản nháp kịch bản vào HANG_DOI để AI SỬA LẠI KỊCH BẢN theo đúng góp ý thay vì vứt bỏ!
  var laLoiEdit = ld.ma.some(function (k) { return ['1', '2', '3', '4', '5', '6'].indexOf(k) >= 0; }) && ld.ma.indexOf('7') < 0;
  var daKhoiPhuc = [];
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  o.ids.forEach(function (id) {
    var ng = (o.ngon || {})[id];
    var kemTheo = ng ? ' || BỐI CẢNH VIDEO - đề: ' + ng.de + (ng.kb ? ' | kịch bản: ' + ng.kb.slice(0, 1200) : '') : '';
    if (typeof ghiGopYDeHoc_ === 'function') ghiGopYDeHoc_(id, laLoiEdit ? 'sua' : 'bo', noiDung + kemTheo, chat);
    if (laLoiEdit && ng && ng.hang_backup && ng.hang_backup.de_bai && sh) {
      try {
        CacheService.getScriptCache().remove('DA_BO_' + id);
        CacheService.getScriptCache().put('SUA_MOI_' + id, String(Date.now()), 3600);
        if (ng.kb_raw) {
          try { luuNhapKichBan_(id, JSON.parse(ng.kb_raw)); } catch (eN) {}
        }
        var hb = ng.hang_backup;
        var hienCo = docHang_(sh).filter(function (x) { return x.id === id; })[0];
        if (hienCo) {
          ghi_(sh, hienCo._row, { trang_thai: hb.dap_an ? 'DA_GIAI' : 'MOI', gop_y: noiDung.slice(0, 1000), uu_tien: 1, zalo_chat: chat, duyet: '', so_lan_loi: 0, ghi_chu: 'Sửa lại theo góp ý: ' + noiDung.slice(0, 180) });
        } else {
          var dongMoi = COT.map(function (c) {
            if (c === 'trang_thai') return hb.dap_an ? 'DA_GIAI' : 'MOI';
            if (c === 'gop_y') return noiDung.slice(0, 1000);
            if (c === 'uu_tien') return 1;
            if (c === 'zalo_chat') return chat || '';
            if (c === 'ghi_chu') return 'Khôi phục & sửa lại kịch bản theo góp ý: ' + noiDung.slice(0, 160);
            if (c === 'ngay_tao' || c === 'cap_nhat') return new Date();
            return hb[c] !== undefined ? hb[c] : '';
          });
          sh.appendRow(dongMoi);
        }
        daKhoiPhuc.push(id);
      } catch (eKP) { nhatKy_('KHOI_PHUC_SUA_LOI', id + ': ' + eKP.message); }
    }
  });
  if (daKhoiPhuc.length) {
    SpreadsheetApp.flush();
    try { henUuTien_(15); } catch (eH) {}
  }
  p.deleteProperty('CHO_LY_DO_BO');
  if (daKhoiPhuc.length) {
    return '✍️ Đã nhận góp ý: "' + noiDung.slice(0, 180) + '".\n🔄 Thay vì bỏ luôn, hệ thống đã khôi phục ' + daKhoiPhuc.join(', ') + ' và giao AI CHỈNH SỬA LẠI KỊCH BẢN theo đúng góp ý của bạn rồi dựng lại video mới!\n🧠 Đồng thời rút thành quy tắc áp dụng cho các video đang chờ và video sau.';
  }
  return '🙏 Đã ghi lý do cho ' + o.ids.length + ' video vừa bỏ: ' + noiDung.slice(0, 200) + '\n🧠 Hệ thống sẽ học để các video sau tránh lỗi này.';
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
// Không bao giờ báo "đang bận": thực thi tức thì, hỗ trợ sửa ở mọi trạng thái (kể cả đang dựng hoặc đã có video).
function yeuCauSuaVideo_(chat, chu) {
  var khoa = LockService.getScriptLock();
  var coKhoa = khoa.tryLock(4000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var hang = docHang_(sh).filter(function (r) { return r.id; });
    var cho = videoChoDuyet_(hang);
    var t = tachLenh_(chu, hang.map(function (r) { return r.id; }));
    if (!t.ma && cho.length > 1) return 'Đang có ' + cho.length + ' video chờ duyệt, hãy ghi rõ mã, ví dụ /sua ' + cho[0].id + ' <góp ý>\n\n' + danhSachChoDuyet_();
    var r = t.ma ? hang.filter(function (x) { return x.id === t.ma; })[0] : (cho[0] || hang[hang.length - 1]);
    if (!r) return 'Không tìm thấy video để sửa. Nhắn /cho để xem mã video.';
    if (!t.con || t.con.length < 3) return 'Hãy ghi rõ góp ý, ví dụ: /sua ' + r.id + ' cảnh 2 vẽ bông tuyết to hơn, giọng chậm lại ở đáp số';
    if (r.file_kich_ban) {
      try {
        var kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString());
        luuNhapKichBan_(r.id, kb);
      } catch (eKb) {}
    }
    // Bỏ file video cũ để tránh đăng nhầm trong lúc đang dựng bản sửa mới
    [r.file_video, r.anh_kt, r.anh_bia].forEach(function (fid) {
      if (fid) { try { DriveApp.getFileById(String(fid)).setTrashed(true); } catch (eTr) {} }
    });
    try { CacheService.getScriptCache().put('SUA_MOI_' + r.id, String(Date.now()), 3600); } catch (eC) {}
    var ttTiep = r.dap_an ? 'DA_GIAI' : 'MOI';
    ghi_(sh, r._row, { trang_thai: ttTiep, file_video: '', anh_kt: '', anh_bia: '', gop_y: t.con.slice(0, 1000), uu_tien: 1, zalo_chat: chat, duyet: '', so_lan_loi: 0, ghi_chu: 'Sửa theo góp ý: ' + t.con.slice(0, 200) });
    SpreadsheetApp.flush();
    try { PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1'); } catch (eP) {}
    if (typeof ghiGopYDeHoc_ === 'function') ghiGopYDeHoc_(r.id, 'sua', t.con, chat);   // học góp ý -> quy tắc cho mọi video sau
    henUuTien_(15);
    return '✍️ Đã nhận góp ý cho ' + r.id + '. Hệ thống ưu tiên sửa kịch bản theo góp ý rồi dựng lại ngay, xong sẽ tự kiểm duyệt và báo bạn.\n🧠 Góp ý này cũng được học thành quy tắc cho các video sau (bot sẽ nhắn lại điều đã hiểu).';
  } finally { if (coKhoa) { try { khoa.releaseLock(); } catch (eL) {} } }
}

/* ===================== SẢN PHẨM ===================== */

/* ---------- ẢNH THẬT CỦA SẢN PHẨM ---------- */
function dsAnhSP_(r) { try { var a = JSON.parse(String(r.anh_ds || '[]')); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function thuMucAnhSP_(id) {
  var goc = thuMucKichBan_().getParents().next();
  var it = goc.getFoldersByName('san_pham');
  var sp = it.hasNext() ? it.next() : goc.createFolder('san_pham');
  var it2 = sp.getFoldersByName(id);
  return it2.hasNext() ? it2.next() : sp.createFolder(id);
}
// tải ảnh (URL Zalo / ảnh trang bán) về Drive: VIDEO_XACSUAT/san_pham/<mã>/anh_<k>.jpg; trả số ảnh hiện có
function luuAnhSanPham_(sh, r, url) {
  var ds = dsAnhSP_(r);
  if (ds.length >= 6) return ds.length;
  var res = UrlFetchApp.fetch(String(url), { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() !== 200) throw new Error('Tải ảnh lỗi ' + res.getResponseCode());
  var b = res.getBlob();
  var loai = String(b.getContentType() || '');
  if (!/^image\//.test(loai)) { if (b.getBytes().length < 5000) throw new Error('Không phải ảnh'); b.setContentType('image/jpeg'); }
  if (b.getBytes().length > 12 * 1024 * 1024) throw new Error('Ảnh quá lớn (> 12MB)');
  var ext = /png/.test(loai) ? 'png' : /webp/.test(loai) ? 'webp' : 'jpg';
  var ten = 'anh_' + (ds.length + 1) + '.' + ext;
  b.setName(ten);
  var tep = thuMucAnhSP_(r.id).createFile(b);
  ds.push({ tep: ten, id: tep.getId() });
  ghiSP_(sh, r._row, { anh_ds: JSON.stringify(ds) });
  r.anh_ds = JSON.stringify(ds);
  return ds.length;
}
function themAnhSanPham_(chu, anh) {
  if (!anh) return 'Gửi ẢNH sản phẩm và ghi chú thích /anhsp [mã], ví dụ /anhsp SP261114-101500';
  var sh = shSanPham_();
  var ds = docSP_(sh);
  var t = tachLenh_(chu, ds.map(function (r) { return r.id; }));
  var r = t.ma ? ds.filter(function (x) { return x.id === t.ma; })[0]
    : ds.filter(function (x) { return x.trang_thai !== 'BO'; }).sort(function (a, b) { return new Date(b.cap_nhat) - new Date(a.cap_nhat); })[0];
  if (!r) return 'Chưa có sản phẩm nào, gửi /sanpham <tên> kèm ảnh trước nhé.';
  if (dsAnhSP_(r).length >= 6) return 'Sản phẩm ' + r.id + ' đã đủ 6 ảnh.';
  try {
    var n = luuAnhSanPham_(sh, r, anh);
    return '📷 Đã lưu ảnh ' + n + '/6 cho ' + (r.ten || r.id) + '. Ảnh thật sẽ xuất hiện trong video (mở đầu, dữ kiện, thẻ sản phẩm cuối video).';
  } catch (e) { return '⚠️ Không lưu được ảnh: ' + e.message; }
}
// có link trang bán mà chưa có ảnh: lấy ảnh đại diện (og:image) của trang
function layAnhTuLink_(sh, r) {
  if (!r.link || dsAnhSP_(r).length) return;
  try {
    var html = UrlFetchApp.fetch(String(r.link), { muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': 'Mozilla/5.0' } }).getContentText().slice(0, 400000);
    var m = /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i.exec(html) || /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html);
    if (m && /^https?:\/\//.test(m[1])) { luuAnhSanPham_(sh, r, m[1].replace(/&amp;/g, '&')); nhatKy_('SAN_PHAM_ANH', r.id + ': lấy ảnh đại diện từ trang bán'); }
  } catch (e) { nhatKy_('SAN_PHAM_ANH', r.id + ': không lấy được ảnh từ link (' + String(e.message).slice(0, 100) + ')'); }
}
// ảnh cho Gemini nhìn (tối đa n ảnh)
function anhSanPhamChoGemini_(sp, n) {
  var out = [];
  ((sp && sp.anh_id) || []).slice(0, n || 3).forEach(function (id) {
    try { var b = DriveApp.getFileById(id).getBlob(); if (b.getBytes().length < 10 * 1024 * 1024) out.push({ mime: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) }); } catch (e) {}
  });
  return out;
}
// AI xem từng ảnh: góc chụp, thấy gì, chữ trên bao bì, có hợp làm ảnh lớn mở đầu không -> dùng để viết đề + chọn ảnh cho cảnh
function moTaAnhSanPham_(r, ten) {
  var ds = dsAnhSP_(r);
  if (!ds.length) return [];
  var anhs = anhSanPhamChoGemini_({ anh_id: ds.map(function (x) { return x.id; }) }, 6);
  if (!anhs.length) return [];
  var j = goiGemini_('Đây là ' + anhs.length + ' ảnh THẬT của sản phẩm "' + ten + '" (theo thứ tự ảnh 0, 1, 2...). Với MỖI ảnh, mô tả ngắn gọn, chỉ điều NHÌN THẤY (không đoán công dụng): ' +
    'góc chụp (chính diện / nghiêng / cận chi tiết / đang sử dụng / bao bì / bảng thông số), sản phẩm chiếm bao nhiêu khung, nền (trơn/rối), chữ/số đọc được trên ảnh (dung tích, kích thước...), ' +
    'ảnh này hợp dùng làm ảnh lớn mở đầu không. Trả JSON {"anh":[{"so":0,"goc":"","mo_ta":"","chu_tren_anh":"","nen_tron":true,"hop_mo_dau":true}]}', 0.1, { suyNghi: 'low', anhs: anhs });
  var a = (j && Array.isArray(j.anh)) ? j.anh : [];
  return a.slice(0, ds.length).map(function (x, k) { return { so: k, goc: String(x.goc || '').slice(0, 40), mo_ta: String(x.mo_ta || '').slice(0, 160), chu: String(x.chu_tren_anh || '').slice(0, 100), hop_mo_dau: x.hop_mo_dau === true }; });
}


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
  if (anh) { try { var dongMoi = docSP_(sh).filter(function (x) { return x.id === id; })[0]; luuAnhSanPham_(sh, dongMoi, anh); } catch (eA) { nhatKy_('SAN_PHAM_ANH', id + ': ' + eA.message); } }
  henUuTien_(20);
  return '🔎 Đã nhận sản phẩm (' + id + ')' + (anh ? ' kèm 1 ảnh' : '') + '. Hệ thống đang tìm giá ở nhiều nơi bán, thông số, cách các nơi bán giới thiệu và kiểm tra độ chính xác (khoảng 1-3 phút), xong sẽ gửi tóm tắt để bạn xác nhận.\n📷 Video sẽ dùng ẢNH THẬT của sản phẩm: gửi thêm ảnh (chính diện, cận cảnh, đang dùng...) với chú thích /anhsp ' + id + ' (tối đa 6 ảnh).';
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
  layAnhTuLink_(sh, r);
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
  try { hs.anh_mo_ta = moTaAnhSanPham_(r, hs.ten_chuan || ten); } catch (eMA) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(eMA.message))) throw eMA; hs.anh_mo_ta = []; }
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
    (dsAnhSP_(r).length ? '📷 ' + dsAnhSP_(r).length + ' ảnh thật sẽ dùng trong video' + (hs.anh_mo_ta.length ? ': ' + hs.anh_mo_ta.map(function (x) { return 'ảnh ' + (x.so + 1) + ' ' + x.goc; }).join(', ') : '') + '\n'
      : '📷 CHƯA CÓ ẢNH sản phẩm: gửi ảnh thật kèm chú thích /anhsp ' + r.id + ' trước khi xác nhận để video dùng ảnh thật\n') +
    '👉 Đúng thì trả lời: /xacnhan ' + r.id + ' <giá bạn bán>, ví dụ /xacnhan ' + r.id + ' ' + (hs.gia_thap || 199000) + '\nKhông dùng: /huysp ' + r.id);
}

function taoDeTuSanPham_(sh, r, bc) {
  var hs = {};
  try { hs = JSON.parse(String(r.ho_so || '{}')); } catch (e) {}
  var dat = (hs.thong_so || []).filter(function (x) { return x.xac_minh; }).map(function (x) { return x.ten + ': ' + x.gia_tri; });
  var ten = hs.ten_chuan || r.ten;
  var anhDs = dsAnhSP_(r), moTaAnh = hs.anh_mo_ta || [];
  var daCo = Number(r.so_de) || 0;              // đã sáng tác bao nhiêu đề (đề trước không đạt kiểm duyệt thì sáng tác lại)
  var soDe = daCo ? 1 : 2;
  var prompt = 'Bạn là giáo viên Toán giỏi kiêm người làm nội dung bán hàng có tâm, làm video ngắn (TikTok/YouTube/Facebook) GIỚI THIỆU SẢN PHẨM BẰNG MỘT BÀI TOÁN THỰC TẾ.\n' +
    'Hãy SÁNG TÁC ' + soDe + ' bài toán mà SẢN PHẨM là TRUNG TÂM một cách HỢP LÝ: bài toán sinh ra từ chính cách người ta mua và dùng sản phẩm này ' +
    '(chi phí cho mỗi lần/mỗi ngày dùng, tiết kiệm sau N tháng so với cách làm cũ, dung tích - kích thước - số lần dùng, mua lẻ hay mua combo, thời gian dùng hết, tối ưu cách dùng...). ' +
    'Người xem phải thấy: bài toán có ích thật (học được kỹ năng tính), và kết quả bài toán cho họ một LÝ DO HỢP LÝ để quan tâm sản phẩm (nhưng không phóng đại).\n' +
    'SẢN PHẨM: ' + ten + (hs.thuong_hieu ? ' (' + hs.thuong_hieu + ')' : '') + (hs.loai ? ' - loại: ' + hs.loai : '') + (hs.mo_ta_ngan ? ' - ' + hs.mo_ta_ngan : '') +
    '\nGiá kênh bán: ' + r.gia_ban + ' đồng' +
    (hs.gia_thap ? '\nGiá trên thị trường (ngày ' + hs.ngay_tim + '): ' + hs.gia_thap + (hs.gia_cao > hs.gia_thap ? ' đến ' + hs.gia_cao : '') + ' đồng' : '') +
    '\nThông số ĐÃ XÁC MINH (chỉ được dùng các thông số này): ' + (dat.length ? dat.join('; ') : '(không có, chỉ dùng giá)') +
    (moTaAnh.length ? '\nẢNH THẬT CỦA SẢN PHẨM (sẽ hiện trong video, đề nên nhắc tới đặc điểm nhìn thấy được): ' + moTaAnh.map(function (x) { return 'ảnh ' + x.so + ': ' + x.goc + ' - ' + x.mo_ta + (x.chu ? ' (chữ trên ảnh: ' + x.chu + ')' : ''); }).join(' | ') : '') +
    (r.ghi_chu ? '\nGhi chú của chủ kênh: ' + r.ghi_chu : '') + '\n' +
    'QUY TẮC (bắt buộc):\n' +
    '- Đề nêu TÊN sản phẩm và dùng giá / thông số thật ở trên làm dữ kiện chính. Số liệu giả định thêm (số lần dùng mỗi ngày, giá cách làm cũ...) phải hợp lý, phổ biến ngoài đời và nói rõ là giả định trong đề.\n' +
    '- Trung thực: KHÔNG thêm công dụng chưa xác minh, KHÔNG dùng "tốt nhất", "rẻ nhất", "số 1", "duy nhất", "cam kết", "100%", KHÔNG nhắc tên thương hiệu/sản phẩm cạnh tranh, KHÔNG chê sản phẩm khác.\n' +
    '- Đề hỏi đúng MỘT đại lượng, đáp số DUY NHẤT là một con số (có đơn vị) hoặc một xác suất dạng phân số; đủ dữ kiện bằng chữ; kiểm chứng được bằng máy.\n' +
    '- "cach_dua_san_pham": sản phẩm xuất hiện thế nào trong video (ảnh thật nào ở cảnh nào, thông số nào được chỉ ra trên ảnh). "loi_ket_hop_ly": MỘT câu kết nối kết quả bài toán với giá trị sản phẩm, chỉ dùng con số của bài, trung thực (vd "tính ra mỗi ngày chỉ khoảng 1.400 đồng").\n' +
    yeuCauDang_('THUC_TE') + '- Có thể dùng dạng xác suất (' + MO_TA_DANG_.XAC_SUAT + ') nếu thật tự nhiên (vd chương trình bốc thăm khi mua), khi đó "mon" là "XAC_SUAT".\n' +
    (typeof yeuCauDapAnChinhXac_ === 'function' ? yeuCauDapAnChinhXac_() : '') +
    'Trả về MỘT mảng JSON, mỗi phần tử: {"mon":"THUC_TE|XAC_SUAT","dang":"","lop":"10|11|12","chu_de":"","de_bai":"","dap_an":"","cach_dua_san_pham":"","loi_ket_hop_ly":"","diem_tu_duy":1-10,"yeu_to_tu_duy":"","bay_thuong_gap":""}';
  var kq = goiGemini_(prompt, 0.7, { suyNghi: cauHinh_('MUC_SUY_NGHI_KICH_BAN'), anhs: anhSanPhamChoGemini_({ anh_id: anhDs.map(function (x) { return x.id; }) }, 3) });
  if (kq && !Array.isArray(kq) && Array.isArray(kq.de)) kq = kq.de;
  if (!Array.isArray(kq) || !kq.length) throw new Error('Không sáng tác được bài toán cho sản phẩm');
  var shH = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var them = 0, dsDe = [];
  kq.slice(0, soDe).forEach(function (d, i) {
    if (!d || !d.de_bai) return;
    var mon = String(d.mon || '').toUpperCase() === 'XAC_SUAT' ? 'XAC_SUAT' : 'THUC_TE';
    var sp = JSON.stringify({ id: r.id, ten: ten, thuong_hieu: hs.thuong_hieu || '', gia_ban: Number(r.gia_ban) || 0, gia_thap: hs.gia_thap || 0, gia_cao: hs.gia_cao || 0, ngay: hs.ngay_tim || '',
      thong_so: dat.slice(0, 8), doi_thu: (hs.doi_thu || []).slice(0, 10), link: String(r.link || '').slice(0, 300),
      anh: anhDs.map(function (x) { return x.tep; }), anh_id: anhDs.map(function (x) { return x.id; }), anh_mo_ta: moTaAnh.slice(0, 6),
      cach_dua: String(d.cach_dua_san_pham || '').slice(0, 300), loi_ket: String(d.loi_ket_hop_ly || '').slice(0, 200) });
    themHang_(shH, {
      id: 'SD' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss') + '-' + i, trang_thai: 'MOI', mon: mon, lop: /^(10|11|12)$/.test(String(d.lop)) ? String(d.lop) : '10',
      chu_de: String(d.chu_de || ten).slice(0, 60), de_bai: d.de_bai, nguon: 'SAN_PHAM|' + String(ten).slice(0, 40), diem_tu_duy: d.diem_tu_duy || '',
      yeu_to_tu_duy: d.yeu_to_tu_duy || '', bay_thuong_gap: d.bay_thuong_gap || '', uu_tien: 1, zalo_chat: r.zalo_chat, san_pham: sp, so_lan_loi: 0, cap_nhat: new Date(), ma_bam: bam_(d.de_bai),
      kiem_chung: d.dap_an ? 'DU_KIEN: ' + String(d.dap_an).slice(0, 40) : ''
    });
    dsDe.push(d);
    them++;
  });
  if (bc) bc.moi += them;
  ghiSP_(sh, r._row, { trang_thai: 'DA_DUNG', so_de: daCo + them });
  guiZaloToi_(r.zalo_chat, (daCo ? '🔁 Đề trước chưa đạt kiểm duyệt, đã sáng tác đề mới' : '🧮 Đã sáng tác ' + them + ' bài toán') + ' xoay quanh ' + ten + (anhDs.length ? ' (dùng ' + anhDs.length + ' ảnh thật)' : ' (CHƯA có ảnh thật, gửi /anhsp ' + r.id + ' kèm ảnh)') + ':\n' +
    dsDe.map(function (d, i) { return (i + 1) + '. ' + latexDoc_(String(d.de_bai || '')).slice(0, 220); }).join('\n') +
    '\nĐang giải, kiểm chứng, viết kịch bản và dựng video (ưu tiên). Chỉ video đạt kiểm duyệt yêu cầu mới được gửi để bạn duyệt.');
}

// Các lời quảng cáo quá đà / thúc ép không được xuất hiện trong video có sản phẩm (được phép: "có tại kênh", "link ở mô tả", "giỏ hàng").
var LOI_QUA_DA_ = /tốt nhất|rẻ nhất|số 1|số một thị trường|hàng đầu|duy nhất|cam kết|100\s*%|tuyệt đối|thần kỳ|mua ngay|chốt đơn|săn ngay|nhanh tay|kẻo hết/i;
function kiemTraSanPhamTrongKichBan_(kb, sp) {
  if (!sp) return [];
  var loi = [];
  var chu = JSON.stringify([kb.hook, kb.hook_chu, kb.tieu_de, (kb.canh || []).map(function (c) { return [c.loi_thoai, c.tieu_de_canh, c.noi_dung_man_hinh, c.chu_thich]; })]);
  var m = LOI_QUA_DA_.exec(chu);
  if (m) loi.push('QUANG_CAO_QUA_DA: kịch bản có cụm "' + m[0] + '". Giới thiệu sản phẩm phải trung thực, không phóng đại, không thúc ép mua; hãy viết lại câu đó tự nhiên (vd "sản phẩm có tại kênh, link ở mô tả").');
  (sp.doi_thu || []).forEach(function (t) {
    t = String(t || '').trim();
    if (t.length >= 3 && chu.toLowerCase().indexOf(t.toLowerCase()) >= 0) loi.push('NHAC_DOI_THU: kịch bản nhắc tới "' + t + '" (sản phẩm cạnh tranh). Không nêu tên đối thủ.');
  });
  // ẢNH THẬT: có ảnh thì phải dùng (mở đầu + ít nhất một cảnh khác), chỉ số ảnh phải có thật
  var soAnh = (sp.anh || []).length;
  if (soAnh) {
    var canhCoAnh = [], saiSo = [];
    (kb.canh || []).forEach(function (c, i) {
      var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
      (du && Array.isArray(du.vat) ? du.vat : []).forEach(function (v) {
        if (!v || v.loai !== 'anh_that') return;
        var k = Number(v.anh);
        if (!(k >= 0 && k < soAnh && Math.floor(k) === k)) saiSo.push('cảnh ' + (i + 1) + ' anh=' + v.anh);
        else if (canhCoAnh.indexOf(i) < 0) canhCoAnh.push(i);
      });
    });
    if (saiSo.length) loi.push('ANH_SAN_PHAM_SAI_SO: ' + saiSo.slice(0, 3).join(', ') + '. Sản phẩm chỉ có ' + soAnh + ' ảnh, "anh" là số thứ tự từ 0 đến ' + (soAnh - 1) + '.');
    if (!canhCoAnh.length) loi.push('THIEU_ANH_SAN_PHAM: video giới thiệu sản phẩm nhưng không dùng ẢNH THẬT nào. Thêm vật {"loai":"anh_that","anh":0,...} ở cảnh mở đầu (ảnh lớn) và ở cảnh đề bài/dữ kiện (ảnh nhỏ hơn + nhãn chỉ thông số).');
    else if (canhCoAnh.length < 2 || canhCoAnh[0] > 1) loi.push('IT_ANH_SAN_PHAM (nhẹ): ảnh thật nên xuất hiện ở cảnh mở đầu VÀ ít nhất một cảnh dữ kiện/lời giải.');
  }
  // đề phải xoay quanh đúng sản phẩm
  var tuKhoa = String(sp.ten || '').toLowerCase().split(/\s+/).filter(function (w) { return w.length >= 3; }).slice(0, 3);
  var deChu = String(kb.de_bai || '') + ' ' + chu;
  if (tuKhoa.length && !tuKhoa.some(function (w) { return deChu.toLowerCase().indexOf(w) >= 0; })) loi.push('SAN_PHAM_KHONG_XUAT_HIEN: kịch bản không nhắc tới sản phẩm "' + sp.ten + '". Bài toán phải xoay quanh sản phẩm này.');
  return loi;
}
