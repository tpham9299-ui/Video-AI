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
  DANG_TU_DONG: 'TAT', GIO_DANG: '11:30,19:30', NEN_TANG_DANG: 'youtube,facebook,tiktok',
  YOUTUBE_CHE_DO: 'public', YOUTUBE_CACH: 'apps_script', SO_LAN_THU_DANG: '3'
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
  Logger.log('Khi đã cài xong các tài khoản, đổi DANG_TU_DONG trong sheet CAU_HINH thành BAT. Muốn thử ngay: chạy dangNgay().');
}

/* ===================== VÒNG CHẠY (trigger 15 phút) ===================== */

function chayDangVideo() {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(20000)) return;
  try {
    _bat_dau_chay_ = Date.now();
    _bo_nho_cau_hinh_ = null;
    if (chDang_('DANG_TU_DONG').toUpperCase() !== 'BAT') return;
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var hang = docHang_(sh);
    // GitHub không báo kết quả quá 60 phút -> coi các nền tảng đang chờ là lỗi để thử lại sau
    hang.forEach(function (r) {
      if (r.trang_thai !== 'DANG_DANG') return;
      var phut = r.cap_nhat instanceof Date ? (Date.now() - r.cap_nhat.getTime()) / 60000 : 999;
      if (phut < 60) return;
      var kq = docKetQuaDang_(r);
      dsNenTangDang_().forEach(function (n) { if (!(kq[n] && (kq[n].ok || kq[n].bo_qua))) kq[n] = { ok: false, loi: 'GitHub không báo kết quả sau 60 phút' }; });
      ketThucDang_(sh, r, kq);
    });
    var r = chonVideoDang_(docHang_(sh));
    if (r) dangVideo_(sh, r);
  } finally {
    khoa.releaseLock();
  }
}

// Menu / chạy tay: đăng ngay video "Có video" cũ nhất (bỏ qua khung giờ, kể cả khi DANG_TU_DONG = TAT).
function dangNgay() {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(30000)) { Logger.log('Hệ thống đang bận, thử lại sau.'); return; }
  try {
    _bat_dau_chay_ = Date.now();
    _bo_nho_cau_hinh_ = null;
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var ds = docHang_(sh).filter(function (r) { return r.trang_thai === 'CO_VIDEO' && r.file_video; })
      .sort(function (a, b) { return new Date(a.cap_nhat).getTime() - new Date(b.cap_nhat).getTime(); });
    if (!ds.length) { Logger.log('Không có video nào ở trạng thái "Có video" để đăng.'); return; }
    dangVideo_(sh, ds[0]);
    Logger.log('Đã gửi đăng ' + ds[0].id + '. Xem cột link_dang và tin Zalo.');
  } finally { khoa.releaseLock(); }
}

/* ===================== CHỌN VIDEO THEO LỊCH ===================== */

function thoiDiem_(v) {
  if (v instanceof Date) return v;
  if (!v) return null;
  var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/.exec(String(v).trim());   // dd/MM/yyyy HH:mm (giờ Việt Nam)
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4] - 7, +m[5]));
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// Khung giờ chung vừa tới (trong vòng 3 giờ), dạng "yyyyMMdd-HH:mm"; chưa tới khung nào thì null.
function khungDangHienTai_() {
  var bay = new Date();
  var ngay = Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var hm = Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'HH:mm').split(':');
  var phutNay = +hm[0] * 60 + +hm[1];
  var tot = null, phutTot = -1;
  chDang_('GIO_DANG').split(/[,;\s]+/).forEach(function (g) {
    var m = /^(\d{1,2})[:hH](\d{2})?$/.exec(g.trim());
    if (!m) return;
    var p = +m[1] * 60 + (+m[2] || 0);
    if (p <= phutNay && phutNay - p <= 180 && p > phutTot) { phutTot = p; tot = ngay + '-' + ('0' + m[1]).slice(-2) + ':' + ('0' + (+m[2] || 0)).slice(-2); }
  });
  return tot;
}

function chonVideoDang_(hang) {
  var cho = hang.filter(function (r) { return r.trang_thai === 'CO_VIDEO' && r.file_video; });
  if (!cho.length) return null;
  var bay = Date.now();
  // 1) video có hẹn giờ riêng (cột lich_dang) đã tới giờ
  var den = cho.filter(function (r) { var t = thoiDiem_(r.lich_dang); return t && t.getTime() <= bay; })
    .sort(function (a, b) { return thoiDiem_(a.lich_dang).getTime() - thoiDiem_(b.lich_dang).getTime(); });
  if (den.length) return den[0];
  // 2) khung giờ chung: mỗi khung đăng một video (đề ưu tiên gửi qua Zalo trước, rồi tới video cũ nhất)
  var khung = khungDangHienTai_();
  var p = PropertiesService.getScriptProperties();
  if (!khung || p.getProperty('DANG_KHUNG_CUOI') === khung) return null;
  var ds = cho.filter(function (r) { return !thoiDiem_(r.lich_dang); })
    .sort(function (a, b) { return ((laUuTien_(b) ? 1 : 0) - (laUuTien_(a) ? 1 : 0)) || (new Date(a.cap_nhat).getTime() - new Date(b.cap_nhat).getTime()); });
  if (!ds.length) return null;
  p.setProperty('DANG_KHUNG_CUOI', khung);
  return ds[0];
}

/* ===================== ĐĂNG ===================== */

function docKetQuaDang_(r) {
  try { var o = JSON.parse(String(r.link_dang || '{}')); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
}

// Tiêu đề, mô tả, thẻ cho bài đăng (lấy từ kịch bản).
function noiDungDang_(r) {
  var kb = {};
  try { kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); } catch (e) {}
  var the = (kb.hashtag || []).map(function (h) { return String(h).replace(/^#+/, '').replace(/\s+/g, ''); }).filter(Boolean);
  (laMonThucTe_(r) ? ['toanthucte', 'toanhoc', 'hoctoan'] : ['xacsuat', 'toanhoc', 'hoctoan']).concat(r.lop ? ['toan' + r.lop] : []).forEach(function (t) { if (the.indexOf(t) < 0) the.push(t); });
  the = the.slice(0, 10);
  var tieuDe = String(kb.tieu_de || r.chu_de || 'Bài toán hay').replace(/\s+/g, ' ').trim().slice(0, 90);
  var de = latexDoc_(String(kb.de_bai || r.de_bai || '')).replace(/\s+/g, ' ').trim();
  var baiHoc = (kb.bai_hoc_rut_ra || []).map(function (x) { return '• ' + x; }).join('\n');
  var moTa = [
    String(kb.hook || tieuDe),
    '',
    '📌 Đề bài: ' + de.slice(0, 1500),
    '🎯 Đáp án và cách giải thông minh có trong video, thử tự giải trước nhé!',
    baiHoc ? '\n💡 Ghi nhớ:\n' + baiHoc : '',
    kb.video_tiep_theo ? '\n👉 Video sau: ' + kb.video_tiep_theo : '',
    '',
    the.map(function (t) { return '#' + t; }).join(' ')
  ].join('\n').replace(/\n{3,}/g, '\n\n').slice(0, 4800);
  return { tieu_de: tieuDe, yt_tieu_de: (tieuDe + ' #shorts').slice(0, 100), mo_ta: moTa, the: the };
}

function dangVideo_(sh, r) {
  var ds = dsNenTangDang_();
  if (!ds.length) { nhatKy_('DANG_VIDEO', 'NEN_TANG_DANG trống, không có nền tảng nào để đăng'); return; }
  var kq = docKetQuaDang_(r);
  var can = ds.filter(function (n) { return !(kq[n] && (kq[n].ok || kq[n].bo_qua)); });
  if (!can.length) { ketThucDang_(sh, r, kq); return; }
  var meta = noiDungDang_(r);
  nhatKy_('DANG_VIDEO', r.id + ' -> đăng lên ' + can.join(', '));
  if (can.indexOf('youtube') >= 0 && chDang_('YOUTUBE_CACH') !== 'github') {
    kq.youtube = dangYouTube_(r, meta);
    can = can.filter(function (n) { return n !== 'youtube'; });
  }
  if (can.length) {
    var gui = typeof guiWorkflowGitHub_ === 'function' ? guiWorkflowGitHub_({
      viec: 'dang', id: r.id,
      dang: JSON.stringify({ file_id: String(r.file_video), ten: r.id, tieu_de: meta.tieu_de, yt_tieu_de: meta.yt_tieu_de, mo_ta: meta.mo_ta, the: meta.the, nen_tang: can, yt_che_do: chDang_('YOUTUBE_CHE_DO') })
    }) : { ok: false, loi: 'Thiếu BoPhan2.gs bản mới (guiWorkflowGitHub_)' };
    if (gui.ok) {
      ghi_(sh, r._row, { trang_thai: 'DANG_DANG', link_dang: JSON.stringify(kq), ghi_chu: 'Đang đăng qua GitHub: ' + can.join(', ') });
      return;
    }
    can.forEach(function (n) { kq[n] = { ok: false, loi: 'Không gọi được GitHub: ' + gui.loi }; });
  }
  ketThucDang_(sh, r, kq);
}

// YouTube: đăng thẳng từ Apps Script bằng dịch vụ nâng cao YouTube Data API v3 (dưới quyền tài khoản Google của bạn).
function dangYouTube_(r, meta) {
  if (typeof YouTube === 'undefined') return { ok: false, loi: 'Chưa bật dịch vụ YouTube Data API v3 trong Apps Script (Dịch vụ + > YouTube Data API v3)' };
  try {
    var f = DriveApp.getFileById(r.file_video);
    var mb = f.getSize() / 1048576;
    if (mb > 48) return { ok: false, loi: 'Video ' + mb.toFixed(1) + ' MB, quá giới hạn 48 MB của Apps Script. Đặt YOUTUBE_CACH = github (xem hướng dẫn).' };
    var v = YouTube.Videos.insert({
      snippet: { title: meta.yt_tieu_de, description: meta.mo_ta, tags: meta.the, categoryId: '27', defaultLanguage: 'vi', defaultAudioLanguage: 'vi' },
      status: { privacyStatus: chDang_('YOUTUBE_CHE_DO'), selfDeclaredMadeForKids: false }
    }, 'snippet,status', f.getBlob());
    return { ok: true, url: 'https://youtube.com/shorts/' + v.id, id: v.id, che_do: v.status && v.status.privacyStatus };
  } catch (e) {
    return { ok: false, loi: String(e.message || e).slice(0, 200) };
  }
}

// Gộp kết quả, cập nhật trạng thái, báo Zalo.
function ketThucDang_(sh, r, kq) {
  var ds = dsNenTangDang_();
  var dat = ds.filter(function (n) { return kq[n] && kq[n].ok; });
  var boQua = ds.filter(function (n) { return kq[n] && kq[n].bo_qua; });
  var loi = ds.filter(function (n) { return !(kq[n] && (kq[n].ok || kq[n].bo_qua)); });
  var toiDa = Number(chDang_('SO_LAN_THU_DANG')) || 3;
  if (loi.length) kq._thu = (Number(kq._thu) || 0) + 1;
  var xong = !loi.length || kq._thu >= toiDa;
  var trangThai = xong ? (dat.length ? 'DA_DANG' : 'LOI') : 'CO_VIDEO';
  ghi_(sh, r._row, {
    trang_thai: trangThai, link_dang: JSON.stringify(kq),
    ghi_chu: (loi.length ? 'Đăng lỗi: ' + loi.map(function (n) { return n + ' (' + String((kq[n] || {}).loi || '').slice(0, 80) + ')'; }).join('; ') + (xong ? '' : ' -> thử lại ở khung giờ sau') : '').slice(0, 300)
  });
  nhatKy_('DANG_VIDEO', r.id + ': đạt ' + (dat.join(',') || '-') + ' | lỗi ' + (loi.join(',') || '-') + ' | bỏ qua ' + (boQua.join(',') || '-'));
  var tin = (dat.length ? '📤 Đã đăng video "' + (r.chu_de || r.id) + '":' : '⚠️ Chưa đăng được video "' + (r.chu_de || r.id) + '":') +
    dat.map(function (n) { return '\n' + TEN_NEN_TANG_[n] + ': ' + (kq[n].url || 'đã đăng') + (kq[n].ghi_chu ? ' (' + kq[n].ghi_chu + ')' : ''); }).join('') +
    loi.map(function (n) { return '\n❌ ' + TEN_NEN_TANG_[n] + ': ' + String((kq[n] || {}).loi || 'lỗi').slice(0, 150); }).join('') +
    boQua.map(function (n) { return '\n⏭ ' + TEN_NEN_TANG_[n] + ': ' + String(kq[n].loi || 'chưa cài đặt').slice(0, 100); }).join('') +
    (loi.length && !xong ? '\n🔁 Sẽ thử lại nền tảng lỗi ở khung giờ sau.' : '');
  try { guiZaloMotLan_('DANG_' + r.id + '_' + (kq._thu || 0) + '_' + dat.join(''), tin); } catch (e) { guiZalo_(tin); }
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
  var link = 'https://www.tiktok.com/v2/auth/authorize/?client_key=' + encodeURIComponent(key) +
    '&scope=' + encodeURIComponent('user.info.basic,video.publish,video.upload') + '&response_type=code' +
    '&redirect_uri=' + encodeURIComponent(url) + '&state=' + state;
  Logger.log('Mở liên kết sau (trong 30 phút), đăng nhập tài khoản TikTok của kênh và bấm Đồng ý:\n' + link);
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
