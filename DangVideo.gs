/**
 * ============================================================
 * HẸN GIỜ ĐĂNG VIDEO lên YouTube, Facebook, TikTok (dán thành tệp mới DangVideo.gs, cùng dự án với BoPhan1.gs, BoPhan2.gs)
 *
 * Cách chạy: trigger chayDangVideo mỗi 15 phút. Đến khung giờ trong CAU_HINH > GIO_DANG (giờ Việt Nam) thì lấy video
 * "Có video" cũ nhất chưa đăng và đăng lên các nền tảng trong NEN_TANG_DANG. Muốn hẹn giờ riêng cho một video:
 * gõ ngày giờ vào cột lich_dang của dòng đó trong HANG_DOI (ví dụ 20/11/2026 19:30), đến giờ là đăng.
 *   - YouTube: đăng thẳng từ Apps Script (cần bật dịch vụ YouTube Data API v3, xem bên dưới).
 *   - Facebook (Trang) và TikTok: Apps Script nhờ GitHub đăng (mã truy cập để trong GitHub Secrets), GitHub báo kết quả về.
 *   Đăng xong: trạng thái "Đã đăng", cột link_dang chứa link từng nền tảng, Zalo báo cho bạn.
 *   Nền tảng nào lỗi sẽ được thử lại ở khung giờ sau (tối đa SO_LAN_THU_DANG lần), nền tảng đã đăng được thì không đăng lại.
 *
 * CẤU HÌNH (sheet CAU_HINH, thêm dòng nếu chưa có; caiDatDangVideo() tự thêm các dòng mặc định):
 *   DANG_TU_DONG   BAT | TAT (mặc định TAT: chỉ bật khi đã cài xong tài khoản)
 *   GIO_DANG       các khung giờ trong ngày, ví dụ 11:30,19:30 (giờ Việt Nam)
 *   NEN_TANG_DANG  youtube,facebook,tiktok (bỏ bớt nền tảng chưa cài)
 *   YOUTUBE_CHE_DO public | unlisted | private
 *   YOUTUBE_CACH   apps_script (mặc định) | github (video > 48 MB, cần thêm YT_CLIENT_ID/SECRET/REFRESH_TOKEN vào GitHub Secrets)
 *
 * CÀI ĐẶT YOUTUBE: trong trình soạn thảo Apps Script, bấm "Dịch vụ" (+) > chọn "YouTube Data API v3" > Thêm.
 * Lần chạy đầu Google hỏi quyền quản lý YouTube: chọn đúng tài khoản Google sở hữu kênh.
 * ============================================================
 */

var MAC_DINH_DANG_ = {
  DANG_TU_DONG: 'BAT', GIO_DANG: '11:30,19:30', SO_VIDEO_MOI_NGAY: '2', NEN_TANG_DANG: 'youtube,facebook,tiktok',
  YOUTUBE_CHE_DO: 'public', YOUTUBE_CACH: 'apps_script', SO_LAN_THU_DANG: '3', DUYET_TRUOC_KHI_DANG: 'TAT'
};
var NEN_TANG_HOP_LE_ = ['youtube', 'facebook', 'tiktok'];
var TEN_NEN_TANG_ = { youtube: '▶️ YouTube', facebook: '📘 Facebook', tiktok: '🎵 TikTok' };

function chDang_(k) {
  var v = cauHinh_(k);
  return v === undefined || v === null || String(v).trim() === '' ? MAC_DINH_DANG_[k] : String(v).trim();
}
function dsNenTangDang_() {
  return chDang_('NEN_TANG_DANG').toLowerCase().split(/[,;\s]+/).filter(function (x) { return NEN_TANG_HOP_LE_.indexOf(x) >= 0; });
}
// Video chuyên đề dài 10 phút: CHỈ đăng lên YouTube (không đăng lên Facebook hay TikTok theo đúng yêu cầu)
function dsNenTangChoVideo_(r) {
  if (r && typeof laVideoDai_ === 'function' && laVideoDai_(r)) return ['youtube'];
  return dsNenTangDang_();
}

/* ===================== CÀI ĐẶT ===================== */

function caiDatDangVideo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  damBaoCot_(ss.getSheetByName(TEN_HANG_DOI));
  var ch = ss.getSheetByName(TEN_CAU_HINH);
  var co = {};
  ch.getDataRange().getValues().forEach(function (v) { co[v[0]] = true; });
  Object.keys(MAC_DINH_DANG_).forEach(function (k) { if (!co[k]) ch.appendRow([k, MAC_DINH_DANG_[k]]); });
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'chayDangVideo') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('chayDangVideo').timeBased().everyMinutes(15).create();
  _bo_nho_cau_hinh_ = null;
  Logger.log('Đã đặt trigger chayDangVideo (15 phút/lần). Cấu hình hiện tại: DANG_TU_DONG=' + chDang_('DANG_TU_DONG') + ', GIO_DANG=' + chDang_('GIO_DANG') + ', NEN_TANG_DANG=' + dsNenTangDang_().join(','));
  Logger.log(typeof YouTube === 'undefined' ? '⚠️ Chưa bật dịch vụ YouTube Data API v3 (Dịch vụ + > YouTube Data API v3) nên chưa đăng được YouTube.' : '✅ Đã bật dịch vụ YouTube.');
  Logger.log('Hệ thống tự động đăng mỗi ngày ' + chDang_('SO_VIDEO_MOI_NGAY') + ' video khi video đạt kiểm duyệt. Muốn thử ngay: chạy dangNgay().');
}

/* ===================== VÒNG CHẠY (trigger 15 phút) ===================== */

function chayDangVideo() {
  var cacheDV = CacheService.getScriptCache();
  if (cacheDV.get('DANG_CHAY_DANG_VIDEO')) return;
  cacheDV.put('DANG_CHAY_DANG_VIDEO', '1', 180);
  try {
    var lam = function () {
      _bat_dau_chay_ = Date.now();
      _bo_nho_cau_hinh_ = null;
      if (typeof damBaoCauHinhTuDong_ === 'function') damBaoCauHinhTuDong_();
      if (chDang_('DANG_TU_DONG').toUpperCase() !== 'BAT') return;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
      if (!sh) return;
      var hang = docHang_(sh);
      // GitHub không báo kết quả quá 35 phút -> coi các nền tảng đang chờ là lỗi và nhả khung giờ để thử lại ngay
      hang.forEach(function (r) {
        if (r.trang_thai !== 'DANG_DANG') return;
        var tgCN = r.cap_nhat ? new Date(r.cap_nhat).getTime() : 0;
        var phut = (isFinite(tgCN) && tgCN > 0) ? (Date.now() - tgCN) / 60000 : 999;
        if (phut < 35) return;
        var kq = docKetQuaDang_(r);
        dsNenTangChoVideo_(r).forEach(function (n) { if (!(kq[n] && (kq[n].ok || kq[n].bo_qua))) kq[n] = { ok: false, loi: 'GitHub không báo kết quả sau 35 phút' }; });
        ketThucDang_(sh, r, kq);
      });
      var hangMoi = docHang_(sh);
      var r = chonVideoDang_(hangMoi);
      if (!r) return;
      if (cacheDV.get('DA_BO_' + r.id)) { giaiPhongGiuKhung_(r.id); return; }
      try {
        var daGui = dangVideo_(sh, r);
        if (daGui === false) giaiPhongGiuKhung_(r.id);
      } catch (eDV) {
        giaiPhongGiuKhung_(r.id);
        nhatKy_('DANG_LOI', r.id + ': ' + String(eDV.message || eDV).slice(0, 200));
      }
    };
    if (typeof voiKhoa_ === 'function') voiKhoa_(10000, lam);
    else lam();
  } finally {
    try { cacheDV.remove('DANG_CHAY_DANG_VIDEO'); } catch (eL) {}
  }
}

// Menu / chạy tay: đăng ngay video "Có video" cũ nhất (bỏ qua khung giờ, kể cả khi DANG_TU_DONG = TAT).
function dangNgay() {
  var khoa = LockService.getScriptLock();
  var coKhoa = khoa.tryLock(5000);
  try {
    _bat_dau_chay_ = Date.now();
    _bo_nho_cau_hinh_ = null;
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var ds = docHang_(sh).filter(function (r) { return r.trang_thai === 'CO_VIDEO' && r.file_video && (typeof daDuyet_ !== 'function' || daDuyet_(r)); })
      .sort(function (a, b) { return new Date(a.cap_nhat).getTime() - new Date(b.cap_nhat).getTime(); });
    if (!ds.length) { Logger.log('Không có video "Có video" nào ĐÃ ĐẠT KIỂM DUYỆT / ĐÃ DUYỆT để đăng.'); return; }
    dangVideo_(sh, ds[0]);
    Logger.log('Đã gửi đăng ' + ds[0].id + '. Xem cột link_dang và tin Zalo.');
  } finally { if (coKhoa) { try { khoa.releaseLock(); } catch (eL) {} } }
}

/* ===================== CHỌN VIDEO THEO LỊCH (MẶC ĐỊNH 2 VIDEO / NGÀY) ===================== */

function thoiDiem_(v) {
  if (v instanceof Date) return v;
  if (!v) return null;
  var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/.exec(String(v).trim());   // dd/MM/yyyy HH:mm (giờ Việt Nam)
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4] - 7, +m[5]));
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// Lịch sử các khung giờ đã đăng thành công trong ngày hôm nay (giờ Việt Nam):
// { ngay: 'yyyyMMdd', khung: ['11:30', ...], da_dang_10p: bool, luc_cuoi: timestamp, dang_cho_10p: {...}|null, dang_cho_khung: {...}|null }
// QUAN TRỌNG: Chỉ khi thực sự có ít nhất 1 nền tảng đăng THÀNH CÔNG (dat.length > 0 trong ketThucDang_) mới chốt khung giờ vào tt.khung / DANG_KHUNG_CUOI / da_dang_10p.
// Nếu gửi GitHub lỗi hoặc đăng thất bại -> tự động nhả dang_cho_* để thử lại đúng khung giờ đó ở chu kỳ kế tiếp (không bỏ lỡ khung giờ!).
function trangThaiDangHomNay_() {
  var ngay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var p = PropertiesService.getScriptProperties();
  var o = {};
  try { o = JSON.parse(p.getProperty('LICH_SU_DANG_NGAY') || '{}') || {}; } catch (e) { o = {}; }
  if (o.ngay !== ngay) o = { ngay: ngay, khung: [], da_dang_10p: false, luc_cuoi: 0, dang_cho_10p: null, dang_cho_khung: null };
  if (!Array.isArray(o.khung)) o.khung = [];
  if (o.dang_cho) {
    if (o.dang_cho.kieu === '10p' && !o.dang_cho_10p) o.dang_cho_10p = o.dang_cho;
    else if (!o.dang_cho_khung) o.dang_cho_khung = o.dang_cho;
    delete o.dang_cho;
  }
  ['dang_cho_10p', 'dang_cho_khung'].forEach(function (k) {
    if (o[k] && (!o[k].luc || (Date.now() - Number(o[k].luc)) > 40 * 60000)) o[k] = null;
  });
  // Tương thích ngược với DANG_KHUNG_CUOI cũ
  var cu = String(p.getProperty('DANG_KHUNG_CUOI') || '');
  if (cu.indexOf(ngay + '-') === 0) {
    var kCu = cu.slice(ngay.length + 1);
    if (kCu && o.khung.indexOf(kCu) < 0) o.khung.push(kCu);
  }
  return o;
}

function giaiPhongGiuKhung_(id) {
  var p = PropertiesService.getScriptProperties();
  var tt = trangThaiDangHomNay_();
  var doi = false;
  ['dang_cho_10p', 'dang_cho_khung'].forEach(function (k) {
    if (tt[k] && (!id || tt[k].id === id)) { tt[k] = null; doi = true; }
  });
  if (doi) p.setProperty('LICH_SU_DANG_NGAY', JSON.stringify(tt));
}

function dangChoConHieuLuc_(hang, tt, kieu) {
  var khoa = kieu === '10p' ? 'dang_cho_10p' : 'dang_cho_khung';
  var dc = tt[khoa];
  if (!dc) return false;
  var r = (hang || []).filter(function (x) { return x.id === dc.id; })[0];
  if (!r || r.trang_thai !== 'DANG_DANG') {
    giaiPhongGiuKhung_(dc.id);
    return false;
  }
  return true;
}

// Tìm khung giờ đăng khả dụng hôm nay: đảm bảo đăng đủ SO_VIDEO_MOI_NGAY (mặc định 2 video/ngày vào 11:30 và 19:30).
// Nếu video đạt kiểm duyệt muộn hơn 11:30 (ví dụ 14:30 mới xong video đầu tiên trong ngày), khung 11:30 chưa dùng vẫn được kích hoạt bù!
function khungDangHienTai_(hang) {
  var bay = new Date();
  var ngay = Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var hm = Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'HH:mm').split(':');
  var phutNay = +hm[0] * 60 + +hm[1];
  var toiDaNgay = Math.max(1, Number(chDang_('SO_VIDEO_MOI_NGAY')) || 2);
  var tt = trangThaiDangHomNay_();
  if (tt.khung.length >= toiDaNgay) return null;
  if (dangChoConHieuLuc_(hang, tt, 'khung')) return null;
  // Chỉ giữ khoảng cách tối thiểu 45 phút giữa 2 khung giờ video ngắn trong ngày (không để video 10 phút chặn khung giờ ngắn)
  if (tt.khung.length > 0 && tt.luc_cuoi && (Date.now() - Number(tt.luc_cuoi)) < 45 * 60000) return null;

  var dsKhung = [];
  chDang_('GIO_DANG').split(/[,;\s]+/).forEach(function (g) {
    var m = /^(\d{1,2})[:hH](\d{2})?$/.exec(g.trim());
    if (!m) return;
    var tenK = ('0' + m[1]).slice(-2) + ':' + ('0' + (+m[2] || 0)).slice(-2);
    var p = +m[1] * 60 + (+m[2] || 0);
    dsKhung.push({ ten: tenK, phut: p });
  });
  dsKhung.sort(function (a, b) { return a.phut - b.phut; });
  for (var i = 0; i < dsKhung.length; i++) {
    var k = dsKhung[i];
    if (phutNay >= k.phut && tt.khung.indexOf(k.ten) < 0) {
      return { ma: ngay + '-' + k.ten, ten: k.ten, ngay: ngay };
    }
  }
  return null;
}

function chonVideoDang_(hang) {
  // Chỉ video đã đạt kiểm duyệt yêu cầu (daDuyet_ = true) mới được đăng
  var cho = hang.filter(function (r) {
    return r.trang_thai === 'CO_VIDEO' && r.file_video && !CacheService.getScriptCache().get('DA_BO_' + r.id) && (typeof daDuyet_ !== 'function' || daDuyet_(r));
  });
  if (!cho.length) return null;
  var bay = Date.now();
  // 1) video có hẹn giờ riêng (cột lich_dang) đã tới giờ
  var den = cho.filter(function (r) { var t = thoiDiem_(r.lich_dang); return t && t.getTime() <= bay; })
    .sort(function (a, b) { return thoiDiem_(a.lich_dang).getTime() - thoiDiem_(b.lich_dang).getTime(); });
  if (den.length) return den[0];
  // 2) Mỗi ngày đảm bảo đăng riêng 1 Video Dài 10 Phút lên YouTube (độc lập với hạn ngạch & giờ giãn cách video ngắn SO_VIDEO_MOI_NGAY)
  var p = PropertiesService.getScriptProperties();
  var tt = trangThaiDangHomNay_();
  var ds10p = cho.filter(function (r) { return !thoiDiem_(r.lich_dang) && typeof laVideoDai_ === 'function' && laVideoDai_(r); })
    .sort(function (a, b) { return lucDuyet_(a) - lucDuyet_(b); });
  if (ds10p.length && !tt.da_dang_10p && !dangChoConHieuLuc_(hang, tt, '10p')) {
    tt.dang_cho_10p = { id: ds10p[0].id, kieu: '10p', khung: '', ma: '', luc: Date.now() };
    p.setProperty('LICH_SU_DANG_NGAY', JSON.stringify(tt));
    return ds10p[0];
  }
  // 3) khung giờ chung mỗi ngày cho các video ngắn (mặc định 2 video/ngày vào 11:30 và 19:30)
  var khung = khungDangHienTai_(hang);
  if (!khung || p.getProperty('DANG_KHUNG_CUOI') === khung.ma) return null;
  // ĐĂNG THEO THỨ TỰ ĐẠT KIỂM DUYỆT / DUYỆT (số tập đánh lúc đăng -> tập tăng dần đúng thứ tự)
  var ds = cho.filter(function (r) { return !thoiDiem_(r.lich_dang) && !(typeof laVideoDai_ === 'function' && laVideoDai_(r)); })
    .sort(function (a, b) { return lucDuyet_(a) - lucDuyet_(b); });
  if (!ds.length) ds = cho.filter(function (r) { return !thoiDiem_(r.lich_dang); }).sort(function (a, b) { return lucDuyet_(a) - lucDuyet_(b); });
  if (!ds.length) return null;
  // Giữ chỗ tạm thời (dang_cho_khung), CHỈ chốt tt.khung & DANG_KHUNG_CUOI khi ketThucDang_ ghi nhận đăng thành công!
  tt.dang_cho_khung = { id: ds[0].id, kieu: 'khung', khung: khung.ten, ma: khung.ma, luc: Date.now() };
  p.setProperty('LICH_SU_DANG_NGAY', JSON.stringify(tt));
  return ds[0];
}

/* ===================== ĐĂNG ===================== */

function docKetQuaDang_(r) {
  try { var o = JSON.parse(String(r.link_dang || '{}')); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
}

// Tiêu đề, mô tả, thẻ cho bài đăng (lấy từ kịch bản).
function noiDungDang_(r, tap, td) {
  var kb = {};
  try { kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); } catch (e) {}
  var the = (kb.hashtag || []).map(function (h) { return String(h).replace(/^#+/, '').replace(/\s+/g, ''); }).filter(Boolean);
  (String(r.mon).toUpperCase() === 'HINH_HOC' ? ['hinhhoc', 'toanhoc', 'hoctoan'] : laMonThucTe_(r) ? ['toanthucte', 'toanhoc', 'hoctoan'] : ['xacsuat', 'toanhoc', 'hoctoan']).concat(r.lop ? ['toan' + r.lop] : []).forEach(function (t) { if (the.indexOf(t) < 0) the.push(t); });
  the = the.slice(0, 10);
  var tieuDe = String(kb.tieu_de || r.chu_de || 'Bài toán hay').replace(/\s+/g, ' ').trim().slice(0, 90);
  var de = latexDoc_(String(kb.de_bai || r.de_bai || '')).replace(/\s+/g, ' ').trim();
  var baiHoc = (kb.bai_hoc_rut_ra || []).map(function (x) { return '• ' + x; }).join('\n');
  var sp = kb.san_pham || null;
  if (sp && the.indexOf('quangcao') < 0) the.push('quangcao');
  if (kb.loai_cau_hoi) { var tl = kb.loai_cau_hoi.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, ''); if (tl && the.indexOf(tl) < 0) the.push(tl); }
  var laDai = (typeof laVideoDai_ === 'function' && laVideoDai_(r)) || kb.kieu_video === 'DAI_10_PHUT' || Number(kb.tong_giay) >= 240;
  var mucLucYT = '';
  if (laDai && Array.isArray(kb.canh) && kb.canh.length) {
    var giayTichLuy = 0, dsMuc = ['00:00 Mở đầu & Phân tích đề bài'], daGhiPha = { 'mo_dau': true, 'de_bai': true };
    var p2s = function (n) { var s = String(Math.floor(n)); return s.length < 2 ? '0' + s : s; };
    kb.canh.forEach(function (c) {
      var l = String((c && c.loai) || '');
      var nh = String((c && c.nhan) || '');
      var tdC = String((c && c.tieu_de_canh) || '').trim();
      var khoaMuc = nh || l;
      if (giayTichLuy >= 25 && tdC && !daGhiPha[khoaMuc] && dsMuc.length < 8) {
        daGhiPha[khoaMuc] = true;
        var ph = Math.floor(giayTichLuy / 60), gy = Math.floor(giayTichLuy % 60);
        dsMuc.push(p2s(ph) + ':' + p2s(gy) + ' ' + (nh ? nh + ' – ' : '') + tdC);
      }
      giayTichLuy += Number(c && c.thoi_luong_giay) || 8;
    });
    mucLucYT = '\n⏱ MỤC LỤC BÀI GIẢNG (Bấm vào mốc thời gian để xem từng phần):\n' + dsMuc.join('\n') + '\n';
  }
  var moTa = [
    sp ? '🛒 Sản phẩm trong video: ' + sp.ten + (Number(sp.gia_ban) > 0 ? ' – giá ' + Number(sp.gia_ban).toLocaleString('vi-VN') + 'đ' : '') + (sp.link ? '\n👉 Link sản phẩm: ' + sp.link : '') +
      '\n📢 Video có giới thiệu sản phẩm do kênh bán. Giá và thông số lấy ngày ' + (sp.ngay || '') + '.\n' : '',
    String(kb.hook || tieuDe),
    mucLucYT,
    '📌 Đề bài trọng tâm: ' + de.slice(0, 1500),
    '🎯 Đáp án và phương pháp giải chi tiết có trong video, hãy lấy giấy nháp làm cùng nhé!',
    baiHoc ? '\n💡 Tổng kết kiến thức bỏ túi:\n' + baiHoc : '',
    r.lop ? '\n📚 Toán lớp ' + String(r.lop).replace(/[^0-9]/g, '') + ' – Tập ' + (tap || '{TAP}') : '',
    kb.video_tiep_theo ? '\n👉 Video sau: ' + kb.video_tiep_theo : '',
    '',
    the.map(function (t) { return '#' + t; }).join(' ')
  ].join('\n').replace(/\n{3,}/g, '\n\n').slice(0, 4800);
  td = td || {};
  var nhanTap = r.lop ? ' | Toán lớp ' + String(r.lop).replace(/[^0-9]/g, '') + ' – Tập ' + (tap || '{TAP}') : '';
  var ytGoc = String(td.youtube || tieuDe).replace(/\s+/g, ' ').trim();
  var ytTieuDe = laDai ? ytGoc.slice(0, Math.max(20, 100 - nhanTap.length)) + nhanTap : ytGoc.slice(0, 92) + ' #shorts';
  return {
    tieu_de: tieuDe,
    yt_tieu_de: ytTieuDe.slice(0, 100),
    // TikTok: chú thích = câu mở đầu gây tò mò + kêu gọi THEO DÕI (thẻ # do GitHub nối thêm)
    tt_tieu_de: (String(td.tiktok || tieuDe) + nhanTap + (sp ? '\n🛒 ' + sp.ten + ' có tại kênh (giỏ hàng / link ở bio)' : '') + '\n👉 Theo dõi để không bỏ lỡ tập sau!').slice(0, 1500),
    mo_ta: moTa,
    yt_dau: String(td.youtube_mo_dau || td.youtube || tieuDe).slice(0, 220),
    fb_dau: String(td.facebook || tieuDe).slice(0, 220),
    yt_mo_ta: (String(td.youtube_mo_dau || td.youtube || tieuDe) + '\n\n' + moTa + '\n\n🔔 ĐĂNG KÝ KÊNH và bật chuông để xem tập tiếp theo!').slice(0, 4900),
    fb_mo_ta: (String(td.facebook || tieuDe) + '\n\n' + moTa + '\n\n👉 Nhấn THEO DÕI trang để xem tập tiếp theo mỗi ngày!').slice(0, 4900),
    the: the, quang_cao: !!sp
  };
}

// TIÊU ĐỀ GÂY ẤN TƯỢNG riêng từng nền tảng (Gemini viết lúc đăng, lưu vào link_dang để lần thử lại dùng đúng tiêu đề cũ).
// Tò mò, có con số / vật thật, câu hỏi thách đố; KHÔNG lộ đáp án, KHÔNG giật tít sai sự thật.
function tieuDeHapDan_(r) {
  var kb = {};
  try { kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); } catch (e) {}
  var prompt = 'Bạn là chuyên gia viết tiêu đề video ngắn (TikTok, YouTube Shorts, Facebook Reels) cho kênh dạy toán tiếng Việt.\n' +
    'Video: lớp ' + (r.lop || '') + ', chủ đề "' + (r.chu_de || kb.chu_de || '') + '".\nĐỀ: ' + String(kb.de_bai || r.de_bai || '').slice(0, 600) +
    '\nCâu móc trong video: ' + String(kb.hook || '').slice(0, 200) + '\nCái bẫy học sinh hay mắc: ' + String(r.bay_thuong_gap || '').slice(0, 200) + '\n' +
    'Viết tiêu đề khiến người lướt PHẢI DỪNG LẠI và bấm xem: gây tò mò (khoảng trống thông tin), có con số hoặc vật thật trong đề, ' +
    'câu hỏi/thách đố trực tiếp người xem ("90% học sinh sai câu này", "Bạn mất bao lâu để giải?"...), giọng trẻ trung tự nhiên, tối đa 1-2 emoji.\n' +
    'CẤM: lộ đáp án; giật tít sai sự thật hoặc hứa điều video không có; viết hoa toàn bộ; dấu chấm than liên tiếp.\n' +
    'Trả JSON: {"youtube":"tiêu đề YouTube Shorts ≤ 70 ký tự","youtube_mo_dau":"câu mở đầu mô tả YouTube ≤ 150 ký tự",' +
    '"tiktok":"câu mở đầu chú thích TikTok ≤ 120 ký tự","facebook":"câu mở đầu bài Facebook Reels ≤ 160 ký tự"}';
  var j = goiGemini_(prompt, 0.9, { suyNghi: 'low' });
  var sach = function (x, n) { return String(x || '').replace(/\s+/g, ' ').replace(/!{2,}/g, '!').trim().slice(0, n); };
  var td = { youtube: sach(j && j.youtube, 90), youtube_mo_dau: sach(j && j.youtube_mo_dau, 200), tiktok: sach(j && j.tiktok, 150), facebook: sach(j && j.facebook, 200) };
  // không được lộ đáp án trong tiêu đề (dùng ranh giới số để tránh xóa nhầm khi đáp án là "12" xuất hiện trong "Lớp 12")
  var da = String(r.dap_an || '').trim();
  if (da && da.length >= 2) {
    var daPhay = da.replace(/\./g, ',');
    var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
    var reDA = new RegExp('(^|[^0-9.,])(?:' + esc(da) + '|' + esc(daPhay) + ')(?=$|[^0-9.,])');
    Object.keys(td).forEach(function (k) { if (reDA.test(td[k])) td[k] = ''; });
  }
  return td.youtube || td.tiktok ? td : null;
}

function dangVideo_(sh, r) {
  var ds = dsNenTangChoVideo_(r);
  if (!ds.length) { nhatKy_('DANG_VIDEO', 'NEN_TANG_DANG trống, không có nền tảng nào để đăng'); return false; }
  var kq = docKetQuaDang_(r);
  var can = ds.filter(function (n) { return !(kq[n] && (kq[n].ok || kq[n].bo_qua)); });
  if (!can.length) { ketThucDang_(sh, r, kq); return true; }
  var tapDaGan = Number(kq._tap) || 0;
  if (!kq._td) { try { kq._td = tieuDeHapDan_(r); } catch (eTd) { kq._td = null; } }
  var meta = noiDungDang_(r, tapDaGan, kq._td);
  nhatKy_('DANG_VIDEO', r.id + ' -> đăng lên ' + can.join(', ') + (tapDaGan ? ' (tập ' + tapDaGan + ')' : ''));
  var ytApps = can.indexOf('youtube') >= 0 && chDang_('YOUTUBE_CACH') !== 'github';
  // lần thử lại: đã có bản video ĐÃ ĐÁNH SỐ trên Drive -> Apps Script đăng YouTube ngay bằng bản đó
  if (ytApps && tapDaGan && kq._file_tap && !laVideoDai_(r)) {
    kq.youtube = dangYouTube_(r, meta, kq._file_tap, kq._file_bia);
    can = can.filter(function (n) { return n !== 'youtube'; });
    ytApps = false;
  }
  if (can.length) {
    var lopSo = String(r.lop || '').replace(/[^0-9]/g, '');
    var demYT = -1;
    try { if (lopSo && !tapDaGan) demYT = demBaiLopYouTube_(lopSo); } catch (eDem) { demYT = -1; }
    var dangPayload = JSON.stringify({ file_id: String(r.file_video), ten: r.id, chuyen_de_10p: laVideoDai_(r), tieu_de: meta.tieu_de, yt_tieu_de: meta.yt_tieu_de, mo_ta: meta.mo_ta, yt_dau: meta.yt_dau, fb_dau: meta.fb_dau, tt_tieu_de: meta.tt_tieu_de, the: meta.the, nen_tang: can, yt_che_do: chDang_('YOUTUBE_CHE_DO'), quang_cao: meta.quang_cao, co_bia: !!r.anh_bia,
      lop: lopSo, tap_da_gan: tapDaGan, tap_he_thong: lopSo ? daDangLop_(lopSo) : 0, dem_youtube: demYT, yt_apps_script: ytApps });
    var gui = typeof guiWorkflowGitHub_ === 'function' ? guiWorkflowGitHub_({ viec: 'dang', id: r.id, dang: dangPayload }, 'dang-video.yml') : { ok: false, loi: 'Thiếu BoPhan2.gs bản mới (guiWorkflowGitHub_)' };
    if (gui && !gui.ok && gui.ma === 404 && typeof guiWorkflowGitHub_ === 'function') {
      gui = guiWorkflowGitHub_({ viec: 'dang', id: r.id, dang: dangPayload }, 'dung-video.yml');
    }
    if (gui.ok) {
      ghi_(sh, r._row, { trang_thai: 'DANG_DANG', link_dang: JSON.stringify(kq), ghi_chu: 'Đang đăng qua GitHub: ' + can.join(', ') });
      return true;
    }
    can.forEach(function (n) { kq[n] = { ok: false, loi: 'Không gọi được GitHub: ' + gui.loi }; });
  }
  ketThucDang_(sh, r, kq);
  return false;
}

// YouTube: đăng thẳng từ Apps Script bằng dịch vụ nâng cao YouTube Data API v3 (dưới quyền tài khoản Google của bạn).
function dangYouTube_(r, meta, fileId, fileBia, file10pDaDo) {
  if (laVideoDai_(r) && (!file10pDaDo || String(file10pDaDo) !== String(fileId || r.file_video))) {
    return { ok: false, loi: 'Chuyên đề cần được GitHub đo thời lượng tệp trước khi đăng YouTube.' };
  }
  if (typeof YouTube === 'undefined') return { ok: false, loi: 'Chưa bật dịch vụ YouTube Data API v3 trong Apps Script (Dịch vụ + > YouTube Data API v3)' };
  try {
    var f = DriveApp.getFileById(String(fileId || r.file_video));   // fileId: bản đã in số tập (GitHub tạo lúc đăng)
    var mb = f.getSize() / 1048576;
    if (mb > 48) return { ok: false, loi: 'Video ' + mb.toFixed(1) + ' MB, quá giới hạn 48 MB của Apps Script. Đặt YOUTUBE_CACH = github (xem hướng dẫn).' };
    var tn = {
      snippet: { title: meta.yt_tieu_de, description: meta.yt_mo_ta || meta.mo_ta, tags: meta.the, categoryId: '27', defaultLanguage: 'vi', defaultAudioLanguage: 'vi' },
      status: { privacyStatus: chDang_('YOUTUBE_CHE_DO'), selfDeclaredMadeForKids: false }
    };
    var v;
    if (meta.quang_cao) {
      // video có sản phẩm: khai báo "có quảng bá sản phẩm" với YouTube; dịch vụ cũ chưa hỗ trợ thì đăng không kèm (mô tả vẫn ghi rõ)
      try { v = YouTube.Videos.insert(Object.assign({ paidProductPlacementDetails: { hasPaidProductPlacement: true } }, tn), 'snippet,status,paidProductPlacementDetails', f.getBlob()); }
      catch (eQc) { v = null; }
    }
    if (!v) v = YouTube.Videos.insert(tn, 'snippet,status', f.getBlob());
    var ghiChuYT = [];
    // ẢNH BÌA THIẾT KẾ (loại câu hỏi, lớp, tiêu đề, hình của đề + TẬP N do GitHub in lúc đăng); không có bản đánh số thì dùng ảnh bìa gốc.
    // YouTube chỉ cho đặt ảnh bìa riêng khi kênh đã xác minh số điện thoại: lỗi thì BÁO bạn (không im lặng để YouTube tự lấy khung bất kỳ).
    var biaId = fileBia || r.anh_bia;
    if (biaId) {
      try { YouTube.Thumbnails.set(v.id, DriveApp.getFileById(String(biaId)).getBlob()); ghiChuYT.push('đã đặt ảnh bìa thiết kế' + (fileBia ? ' (có TẬP)' : '')); }
      catch (eB) {
        var lyB = String(eB.message || eB).slice(0, 160);
        ghiChuYT.push('CHƯA đặt được ảnh bìa: ' + lyB);
        guiZaloMotLan_('YT_BIA_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd'), '⚠️ YouTube không cho đặt ảnh bìa thiết kế cho video ' + r.id + ' (' + lyB + ').\n' +
          'Thường do kênh CHƯA XÁC MINH số điện thoại: vào youtube.com/verify xác minh một lần, các video sau sẽ tự có ảnh bìa đúng.', 'cao');
      }
    } else ghiChuYT.push('video không có ảnh bìa thiết kế');
    var kbYT = {};
    try { kbYT = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); } catch (eK) {}
    if (typeof themVaoPlaylist_ === 'function') { var pl = themVaoPlaylist_(kbYT, v.id, r); if (pl) ghiChuYT.push(pl); }
    if (typeof dangKyThongKe_ === 'function') dangKyThongKe_(r, v.id);
    var laDaiYT = (typeof laVideoDai_ === 'function' && laVideoDai_(r)) || kbYT.kieu_video === 'DAI_10_PHUT' || Number(kbYT.tong_giay) >= 240;
    return { ok: true, url: (laDaiYT ? 'https://youtu.be/' : 'https://youtube.com/shorts/') + v.id, id: v.id, che_do: v.status && v.status.privacyStatus, ghi_chu: ghiChuYT.join(', ') };
  } catch (e) {
    var biTat = /YouTube Data API v3 has not been used in project (\d+).*or it is disabled/i.exec(String(e.message || e));
    if (biTat) return { ok: false, loi: 'Bật YouTube Data API v3 trong dự án ' + biTat[1] + ': https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=' + biTat[1] };
    return { ok: false, loi: String(e.message || e).slice(0, 200) };
  }
}

/* ===================== SỐ TẬP THEO LỚP ===================== */
function lucDuyet_(r) { var o = docKetQuaDang_(r); return Number(o._duyet_luc) || new Date(r.cap_nhat).getTime() || 0; }
// Số tập DỰ KIẾN lúc bấm /duyet: số bài lớp đó đã có (YouTube / sổ hệ thống) + số video cùng lớp đã duyệt đang chờ đăng trước nó + 1.
function duKienTap_(hang, r) {
  var lop = String(r.lop || '').replace(/[^0-9]/g, '');
  if (!lop) return 0;
  var daCo = Math.max(daDangLop_(lop), demBaiLopYouTube_(lop));
  var t = lucDuyet_(r);
  var truoc = hang.filter(function (x) {
    return x.id !== r.id && x.trang_thai === 'CO_VIDEO' && String(x.duyet) === 'DA_DUYET' && String(x.lop || '').replace(/[^0-9]/g, '') === lop && lucDuyet_(x) <= t;
  }).length;
  return daCo + truoc + 1;
}
// Số bài "Toán lớp N" hệ thống đã đăng thành công (sổ ghi trong Script Properties, cập nhật mỗi lần đăng xong).
function daDangLop_(lop) { return Number(PropertiesService.getScriptProperties().getProperty('DA_DANG_LOP_' + lop) || 0); }
// Đếm bài lớp N đã có trên kênh YouTube (video có thẻ #toanN hoặc "Toán lớp N - Tập"). -1 nếu không đếm được.
function demBaiLopYouTube_(lop) {
  if (typeof YouTube === 'undefined') return -1;
  try {
    var ch = YouTube.Channels.list('contentDetails', { mine: true });
    var up = ch && ch.items && ch.items[0] && ch.items[0].contentDetails.relatedPlaylists.uploads;
    if (!up) return -1;
    var re1 = new RegExp('#toan' + lop + '(?!\\d)', 'i'), re2 = new RegExp('toán\\s*lớp\\s*' + lop + '\\s*[–-]\\s*tập', 'i');
    var dem = 0, tok = null;
    for (var i = 0; i < 20; i++) {
      var d = YouTube.PlaylistItems.list('snippet', { playlistId: up, maxResults: 50, pageToken: tok || undefined });
      (d.items || []).forEach(function (v) { var t = (v.snippet.title || '') + ' ' + (v.snippet.description || ''); if (re1.test(t) || re2.test(t)) dem++; });
      tok = d.nextPageToken;
      if (!tok) break;
    }
    return dem;
  } catch (e) { nhatKy_('DANG_VIDEO', 'Không đếm được bài trên YouTube: ' + String(e.message).slice(0, 150)); return -1; }
}

// Gộp kết quả, cập nhật trạng thái, báo Zalo.
function ketThucDang_(sh, r, kq) {
  var ds = dsNenTangChoVideo_(r);
  var dat = ds.filter(function (n) { return kq[n] && kq[n].ok; });
  var boQua = ds.filter(function (n) { return kq[n] && kq[n].bo_qua; });
  var loi = ds.filter(function (n) { return !(kq[n] && (kq[n].ok || kq[n].bo_qua)); });
  var toiDa = Number(chDang_('SO_LAN_THU_DANG')) || 3;
  if (loi.length) kq._thu = (Number(kq._thu) || 0) + 1;
  var xong = !loi.length || kq._thu >= toiDa;
  var trangThai = xong ? (dat.length ? 'DA_DANG' : 'LOI') : 'CO_VIDEO';
  if (typeof ghi_ === 'function') {
    ghi_(sh, r._row, {
      trang_thai: trangThai, link_dang: JSON.stringify(kq),
      ghi_chu: (loi.length ? 'Đăng lỗi: ' + loi.map(function (n) { return n + ' (' + String((kq[n] || {}).loi || '').slice(0, 80) + ')'; }).join('; ') + (xong ? '' : ' -> thử lại ở khung giờ sau') : '').slice(0, 300)
    }, r.id);
  }
  var lopSo = String(r.lop || '').replace(/[^0-9]/g, '');
  if (dat.length && kq._tap && lopSo && Number(kq._tap) > daDangLop_(lopSo)) PropertiesService.getScriptProperties().setProperty('DA_DANG_LOP_' + lopSo, String(kq._tap));
  // CHỈ chốt khung giờ hôm nay khi thực sự có nền tảng đăng thành công; nếu lỗi hoàn toàn -> nhả khung để chu kỳ 15 phút sau thử lại đúng khung giờ này
  var p = PropertiesService.getScriptProperties();
  var tt = trangThaiDangHomNay_();
  var doiTT = false;
  ['dang_cho_10p', 'dang_cho_khung'].forEach(function (k) {
    if (!tt[k] || tt[k].id !== r.id) return;
    if (dat.length) {
      if (k === 'dang_cho_10p') {
        tt.da_dang_10p = true;
      } else if (tt[k].khung) {
        if (tt.khung.indexOf(tt[k].khung) < 0) tt.khung.push(tt[k].khung);
        tt.luc_cuoi = Date.now();
        if (tt[k].ma) p.setProperty('DANG_KHUNG_CUOI', tt[k].ma);
      }
    }
    tt[k] = null;
    doiTT = true;
  });
  if (doiTT) p.setProperty('LICH_SU_DANG_NGAY', JSON.stringify(tt));
  nhatKy_('DANG_VIDEO', r.id + (kq._tap ? ' (Toán lớp ' + lopSo + ' – tập ' + kq._tap + ')' : '') + ': đạt ' + (dat.join(',') || '-') + ' | lỗi ' + (loi.join(',') || '-') + ' | bỏ qua ' + (boQua.join(',') || '-'));
  var tin = (dat.length ? '📤 Đã đăng video "' + (r.chu_de || r.id) + '"' + (kq._tap ? ' (Toán lớp ' + lopSo + ' – Tập ' + kq._tap + ')' : '') + ':' : '⚠️ Chưa đăng được video "' + (r.chu_de || r.id) + '":') +
    dat.map(function (n) { return '\n' + TEN_NEN_TANG_[n] + ': ' + (kq[n].url || 'đã đăng') + (kq[n].ghi_chu ? ' (' + kq[n].ghi_chu + ')' : ''); }).join('') +
    loi.map(function (n) { return '\n❌ ' + TEN_NEN_TANG_[n] + ': ' + String((kq[n] || {}).loi || 'lỗi').slice(0, 150); }).join('') +
    boQua.map(function (n) { return '\n⏭ ' + TEN_NEN_TANG_[n] + ': ' + String(kq[n].loi || 'chưa cài đặt').slice(0, 100); }).join('') +
    (loi.length && !xong ? '\n🔁 Sẽ thử lại nền tảng lỗi ở khung giờ sau.' : '');
  // đăng thành công: mức vừa (đã có trong báo cáo ngày); lỗi không tự thử lại được: mức cao
  try { guiZaloMotLan_('DANG_' + r.id + '_' + (kq._thu || 0) + '_' + dat.join(''), tin, loi.length && xong ? 'cao' : 'vua'); } catch (e) {}
}

function henDangYouTubeCho_(giay) {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'chayDangYouTubeCho') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('chayDangYouTubeCho').timeBased().after(Math.max(5, giay || 5) * 1000).create();
}

// Chạy nền ngoài khóa doPost để tải file video lớn lên YouTube mà không làm hết giờ webhook hay nghẽn LockService.
function chayDangYouTubeCho() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'chayDangYouTubeCho') ScriptApp.deleteTrigger(t); });
  var cacheYT = CacheService.getScriptCache();
  if (cacheYT.get('DANG_TAI_YT_CHO')) { henDangYouTubeCho_(30); return; }
  cacheYT.put('DANG_TAI_YT_CHO', '1', 240);
  try {
    _bat_dau_chay_ = Date.now();
    _bo_nho_cau_hinh_ = null;
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    if (!sh) return;
    var ds = docHang_(sh).filter(function (r) {
      if (r.trang_thai !== 'DANG_DANG') return false;
      var kq = docKetQuaDang_(r);
      return !!(kq.youtube && kq.youtube.cho_apps_script);
    });
    for (var i = 0; i < ds.length; i++) {
      var r = ds[i];
      var kq = docKetQuaDang_(r);
      var fileYT = kq._file_tap || r.file_video;
      var ytKq = fileYT ? dangYouTube_(r, noiDungDang_(r, kq._tap, kq._td), fileYT, kq._file_bia, kq.youtube.file_10p_da_do) : { ok: false, loi: 'Không tìm thấy file video để đăng YouTube' };
      var luu = function () {
        var rowHien = docHang_(sh).filter(function (x) { return x.id === r.id; })[0];
        if (!rowHien || rowHien.trang_thai !== 'DANG_DANG') return;
        var kqHien = docKetQuaDang_(rowHien);
        kqHien.youtube = ytKq;
        ketThucDang_(sh, rowHien, kqHien);
      };
      if (typeof voiKhoa_ === 'function') voiKhoa_(15000, luu);
      else luu();
    }
  } finally {
    try { cacheYT.remove('DANG_TAI_YT_CHO'); } catch (eL) {}
  }
}

// Gọi từ doPost (BoPhan2.gs) khi GitHub báo kết quả đăng: {token, loai:"dang", id, ket_qua:{facebook:{ok,url|loi,bo_qua}, ...}}
function xuLyKetQuaDang_(sh, d) {
  var r = null;
  docHang_(sh).forEach(function (x) { if (x.id === d.id) r = x; });
  if (!r) return { ok: false, loi: 'KHONG_TIM_THAY' };
  if (r.trang_thai !== 'DANG_DANG') return { ok: true, lap: true };
  var kq = docKetQuaDang_(r);
  var moi = d.ket_qua || {};
  Object.keys(moi).forEach(function (n) { if (NEN_TANG_HOP_LE_.indexOf(n) >= 0) kq[n] = moi[n]; });
  if (moi._github_loi) {
    dsNenTangChoVideo_(r).forEach(function (n) {
      if (!(kq[n] && (kq[n].ok || kq[n].bo_qua))) kq[n] = { ok: false, loi: String(moi._github_loi).slice(0, 200) };
    });
  }
  if (moi._tap) { kq._tap = Number(moi._tap); kq._dem = moi._dem || kq._dem; }
  if (laVideoDai_(r) && moi.youtube && moi.youtube.cho_apps_script) {
    // Dùng đúng tệp của lượt vừa đo, kể cả khi đăng lại và Drive còn bản đánh số cũ.
    kq._file_tap = String(moi._file_tap || r.file_video);
  }
  if (moi._file_tap) kq._file_tap = String(moi._file_tap);
  if (moi._file_bia) kq._file_bia = String(moi._file_bia);   // ảnh bìa thiết kế đã in TẬP N (khung đầu của bản đăng YouTube)
  // YouTube đăng bằng Apps Script: lưu dữ liệu ngay, nhả khóa doPost tức thì rồi giao trigger nền 5s tải file lên YouTube
  if (kq.youtube && kq.youtube.cho_apps_script) {
    ghi_(sh, r._row, { link_dang: JSON.stringify(kq), ghi_chu: 'Đã nhận bản đánh số, đang chuẩn bị tải lên YouTube...' }, r.id);
    try { henDangYouTubeCho_(5); } catch (eYT) {
      var fileYT = kq._file_tap || r.file_video;
      kq.youtube = fileYT ? dangYouTube_(r, noiDungDang_(r, kq._tap, kq._td), fileYT, kq._file_bia, kq.youtube.file_10p_da_do) : { ok: false, loi: 'Không tìm thấy file video để đăng YouTube' };
      ketThucDang_(sh, r, kq);
    }
    return { ok: true };
  }
  ketThucDang_(sh, r, kq);
  return { ok: true };
}

/* ===================== KẾT NỐI TIKTOK (lấy mã làm mới một lần) ===================== */
// 1) Sheet CAU_HINH: thêm TIKTOK_CLIENT_KEY và TIKTOK_CLIENT_SECRET (lấy ở developers.tiktok.com > ứng dụng của bạn).
// 2) Trong ứng dụng TikTok (Login Kit > Redirect URI) thêm đúng địa chỉ web app /exec (dòng WEB_APP_URL của CAU_HINH).
// 3) Triển khai phiên bản mới cho web app, chạy layLinkDangNhapTikTok(), mở liên kết trong nhật ký, đăng nhập TikTok, đồng ý.
// Mã làm mới được lưu vào Drive: <THU_MUC_GOC>/bi_mat/tiktok_token.json; GitHub đọc tệp này khi đăng (và tự cập nhật mã mới).
function layLinkDangNhapTikTok() {
  var key = String(cauHinh_('TIKTOK_CLIENT_KEY') || '').trim();
  if (!key) throw new Error('Chưa có dòng TIKTOK_CLIENT_KEY trong sheet CAU_HINH.');
  // báo rõ đang dùng key nào và có bị trùng dòng không (dòng dưới cùng thắng), để chắc thay key đã có tác dụng
  var dong = [];
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_CAU_HINH).getDataRange().getValues().forEach(function (v, i) {
    if (String(v[0]).trim() === 'TIKTOK_CLIENT_KEY') dong.push('dòng ' + (i + 1) + ': ' + String(v[1]).trim());
  });
  Logger.log('Client key đang dùng: ' + key + (dong.length > 1 ? '\n⚠️ Sheet CAU_HINH có ' + dong.length + ' dòng TIKTOK_CLIENT_KEY (' + dong.join(' | ') + '), hệ thống lấy dòng DƯỚI CÙNG. Hãy xóa bớt, chỉ giữ một dòng.' : ''));
  var url = layUrlWebApp_();
  var state = Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('TIKTOK_STATE', state, 1800);
  // Quyền xin TikTok: mặc định đủ cả đăng thẳng (video.publish) lẫn gửi vào hộp nháp (video.upload).
  // TikTok báo lỗi "scope" khi ứng dụng (hoặc Sandbox) chưa bật quyền đó -> bật trong trang nhà phát triển,
  // hoặc tạm thêm dòng TIKTOK_SCOPE = user.info.basic,video.upload trong CAU_HINH để chỉ dùng hộp nháp.
  var quyen = String(cauHinh_('TIKTOK_SCOPE') || 'user.info.basic,video.upload,video.publish').replace(/\s+/g, '');
  var link = 'https://www.tiktok.com/v2/auth/authorize/?client_key=' + encodeURIComponent(key) +
    '&scope=' + encodeURIComponent(quyen) + '&response_type=code' +
    '&redirect_uri=' + encodeURIComponent(url) + '&state=' + state;
  Logger.log((/^sb/.test(key) ? '🧪 Đây là key SANDBOX: tài khoản TikTok đăng nhập phải nằm trong "Target users" của Sandbox.\n' : '') +
    'Quyền xin: ' + quyen + '\nRedirect URI phải khai báo trong Login Kit (đúng từng ký tự): ' + url +
    '\nNếu TikTok báo "scope": vào Sandbox/ứng dụng > Add products > Content Posting API (bật Direct Post) + Login Kit, rồi tick đủ các quyền ở mục Scopes.' +
    '\n\nMở liên kết sau (trong 30 phút), đăng nhập tài khoản TikTok của kênh và bấm Đồng ý:\n' + link);
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.code && p.state) return nhanMaTikTok_(p);
  if (p.error) return trangHtml_('❌ TikTok báo lỗi: ' + p.error + ' ' + (p.error_description || ''));
  return trangHtml_('Video AI đang hoạt động.');
}

function trangHtml_(chu) {
  return HtmlService.createHtmlOutput('<div style="font:18px sans-serif;padding:40px;text-align:center">' + String(chu).replace(/</g, '&lt;') + '</div>');
}

function nhanMaTikTok_(p) {
  var st = CacheService.getScriptCache().get('TIKTOK_STATE');
  if (!st || st !== p.state) return trangHtml_('Liên kết đăng nhập đã hết hạn hoặc không hợp lệ. Hãy chạy lại layLinkDangNhapTikTok().');
  var res = UrlFetchApp.fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'post', contentType: 'application/x-www-form-urlencoded', muteHttpExceptions: true,
    payload: { client_key: String(cauHinh_('TIKTOK_CLIENT_KEY') || '').trim(), client_secret: String(cauHinh_('TIKTOK_CLIENT_SECRET') || '').trim(),
      code: p.code, grant_type: 'authorization_code', redirect_uri: layUrlWebApp_() }
  });
  var d = {};
  try { d = JSON.parse(res.getContentText()); } catch (x) {}
  if (!d.refresh_token) return trangHtml_('❌ Không lấy được mã từ TikTok: ' + res.getContentText().slice(0, 300));
  var goc = thuMucKichBan_().getParents().next();
  var it = goc.getFoldersByName('bi_mat');
  var tm = it.hasNext() ? it.next() : goc.createFolder('bi_mat');
  var noi = JSON.stringify({ refresh_token: d.refresh_token, open_id: d.open_id, scope: d.scope, cap_nhat: new Date().toISOString() });
  var ds = tm.getFilesByName('tiktok_token.json');
  if (ds.hasNext()) ds.next().setContent(noi); else tm.createFile('tiktok_token.json', noi, MimeType.PLAIN_TEXT);
  CacheService.getScriptCache().remove('TIKTOK_STATE');
  nhatKy_('TIKTOK', 'Đã kết nối TikTok (quyền: ' + d.scope + ')');
  return trangHtml_('✅ Đã kết nối TikTok (quyền: ' + d.scope + '). Có thể đóng trang này.');
}
