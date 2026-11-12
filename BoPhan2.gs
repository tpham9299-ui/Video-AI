/**
 * ============================================================
 * BỘ PHẬN 2 – DỰNG VIDEO (phần điều phối trên Apps Script)
 * Dán thành một tệp mới tên BoPhan2.gs trong CÙNG dự án Apps Script với Code.gs.
 *
 * Luồng: CO_KICH_BAN --(chayBoPhan2, mỗi 10 phút)--> gửi kịch bản sang GitHub --> DANG_DUNG
 *        GitHub dựng video, tải lên Drive, gọi lại hàm doPost() bên dưới --> CO_VIDEO (+ báo Zalo)
 *        Dựng lỗi hoặc quá hạn -> quay về CO_KICH_BAN (tối đa MAX_LAN_LOI lần rồi LOI).
 *
 * Bí mật cần thêm (Project Settings > Script Properties), KHÔNG viết vào mã:
 *   GITHUB_TOKEN       Fine-grained token của repo dựng video, quyền Contents: Read and write
 *   GITHUB_REPO        dạng  ten-tai-khoan/ten-repo
 *   DUNG_VIDEO_SECRET  chuỗi bí mật tự đặt (>= 24 ký tự); đặt GIỐNG HỆT trong GitHub Secrets
 *
 * Lưu ý: dự án này dùng doPost() để nhận kết quả từ GitHub. Một dự án Apps Script chỉ có MỘT doPost();
 * nếu sau này bạn gắn thêm webhook khác vào đây, hãy gộp chung.
 * ============================================================
 */

var BP2_QUA_HAN_PHUT = 75;   // DANG_DUNG quá số phút này mà GitHub chưa báo kết quả -> coi là lỗi, thử lại

/* ===================== CÀI ĐẶT ===================== */

// Chạy MỘT lần sau khi đã sửa Code.gs (thêm 'file_video' vào COT) và đặt 3 bí mật.
function caiDatBoPhan2() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var c = COT.indexOf('file_video') + 1;
  if (!sh) throw new Error('Chưa có sheet HANG_DOI: hãy chạy khoiTao() trước.');
  if (c <= 0) throw new Error('Chưa thêm "file_video" vào mảng COT trong Code.gs (xem hướng dẫn sửa Code.gs, bước D).');
  sh.getRange(1, c).setValue('file_video');

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'chayBoPhan2') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('chayBoPhan2').timeBased().everyMinutes(10).create();

  var p = PropertiesService.getScriptProperties();
  var thieu = ['GITHUB_TOKEN', 'GITHUB_REPO', 'DUNG_VIDEO_SECRET'].filter(function (k) { return !p.getProperty(k); });
  Logger.log(thieu.length ? 'CÒN THIẾU bí mật: ' + thieu.join(', ') : 'Đã đủ 3 bí mật. Chạy kiemTraKetNoiGitHub() để thử kết nối.');
}

// Kiểm tra token và tên repo có đúng không.
function kiemTraKetNoiGitHub() {
  var p = PropertiesService.getScriptProperties();
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + p.getProperty('GITHUB_REPO'), {
    headers: { Authorization: 'Bearer ' + p.getProperty('GITHUB_TOKEN'), Accept: 'application/vnd.github+json' },
    muteHttpExceptions: true
  });
  Logger.log(res.getResponseCode() === 200 ? 'Kết nối GitHub OK' : 'Lỗi ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
}

/* ===================== VÒNG CHẠY (trigger 10 phút) ===================== */

function chayBoPhan2() {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(10000)) return;
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    if (!sh) return;
    var hang = docHang_(sh);
    var bayGio = Date.now();

    // 1) Video đang dựng quá lâu -> báo lỗi để thử lại
    var dangDung = 0;
    hang.forEach(function (r) {
      if (r.trang_thai !== 'DANG_DUNG') return;
      var phut = r.cap_nhat instanceof Date ? (bayGio - r.cap_nhat.getTime()) / 60000 : 99999;
      if (phut > BP2_QUA_HAN_PHUT) baoLoiDung_(sh, r, 'QUA_HAN: GitHub không báo kết quả sau ' + BP2_QUA_HAN_PHUT + ' phút');
      else dangDung++;
    });
    if (dangDung > 0) return;   // mỗi lúc chỉ dựng 1 video (đúng hạn mức miễn phí, dễ theo dõi)

    // 2) Lấy kịch bản chờ lâu nhất
    var ds = hang.filter(function (r) { return r.trang_thai === 'CO_KICH_BAN' && r.file_kich_ban; })
      .sort(function (a, b) { return new Date(a.cap_nhat).getTime() - new Date(b.cap_nhat).getTime(); });
    if (!ds.length) return;

    var r = ds[0];
    try {
      kichHoatDungVideo_(r);
      ghi_(sh, r._row, { trang_thai: 'DANG_DUNG', ghi_chu: '' });
      nhatKy_('DUNG_VIDEO', r.id + ' -> đã gửi sang GitHub để dựng');
    } catch (e) {
      baoLoiDung_(sh, r, e.message);
    }
    dongBoBangDoc();
  } finally {
    khoa.releaseLock();
  }
}

// Gửi sự kiện repository_dispatch (kèm kịch bản) tới GitHub. Thành công khi GitHub trả 204.
function kichHoatDungVideo_(r) {
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty('GITHUB_TOKEN'), repo = p.getProperty('GITHUB_REPO');
  if (!token || !repo) throw new Error('THIEU_GITHUB_TOKEN_HOAC_REPO');

  var kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString());
  delete kb.cach_giai;                       // lời giải chi tiết không cần cho việc dựng, bớt dung lượng
  kb.id = r.id;
  var goi = { event_type: 'dung-video', client_payload: { id: r.id, kich_ban: kb } };
  var thanVan = JSON.stringify(goi);
  if (thanVan.length > 60000) { delete kb.de_bai; thanVan = JSON.stringify(goi); }   // GitHub giới hạn ~65.535 ký tự
  if (thanVan.length > 60000) throw new Error('KICH_BAN_QUA_LON_' + thanVan.length);

  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/dispatches', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: thanVan,
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  });
  var ma = res.getResponseCode();
  if (ma !== 204) throw new Error('GITHUB_' + ma + ': ' + String(res.getContentText()).replace(/\s+/g, ' ').slice(0, 200));
}

/* ===================== NHẬN KẾT QUẢ TỪ GITHUB ===================== */

// Triển khai: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
// Sao chép địa chỉ kết thúc bằng /exec vào GitHub Secret APPS_SCRIPT_URL.
// Mỗi lần sửa mã nhớ Deploy > Manage deployments > Edit > Version: New version.
function doPost(e) {
  var tra = function (o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); };
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return tra({ ok: false, loi: 'JSON_HONG' }); }
  var bi = PropertiesService.getScriptProperties().getProperty('DUNG_VIDEO_SECRET');
  if (!bi || !d || d.token !== bi) return tra({ ok: false, loi: 'SAI_TOKEN' });

  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(120000)) return tra({ ok: false, loi: 'BAN' });   // đang chạy Bộ phận 1: GitHub sẽ thử lại
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var r = null;
    docHang_(sh).forEach(function (x) { if (x.id === d.id) r = x; });
    if (!r) return tra({ ok: false, loi: 'KHONG_TIM_THAY' });

    // Chống xử lý lặp: GitHub (hoặc mạng) có thể gửi cùng một kết quả nhiều lần; chỉ lần đầu được báo Zalo/ghi.
    if (d.ok && d.file_id) {
      if (r.trang_thai === 'CO_VIDEO' && String(r.file_video) === String(d.file_id)) return tra({ ok: true, lap: true });
      if (r.trang_thai === 'DA_XONG') return tra({ ok: true, lap: true });
      ghi_(sh, r._row, { trang_thai: 'CO_VIDEO', file_video: String(d.file_id), ghi_chu: '', so_lan_loi: 0 });
      nhatKy_('DUNG_VIDEO', r.id + ' -> xong, file ' + d.file_id);
      guiZaloMotLan_('VIDEO_' + r.id + '_' + d.file_id, '🎞 Video đã dựng xong: ' + (r.chu_de || r.id) + (d.giay ? ' (' + d.giay + ' giây)' : '') +
        '\nhttps://drive.google.com/file/d/' + d.file_id + '/view');
    } else {
      if (r.trang_thai !== 'DANG_DUNG') return tra({ ok: true, lap: true });   // lỗi đã được xử lý rồi
      baoLoiDung_(sh, r, d.loi || 'GITHUB_BAO_LOI');
    }
    dongBoBangDoc();
    return tra({ ok: true });
  } finally {
    khoa.releaseLock();
  }
}

// Gửi Zalo tối đa MỘT lần cho mỗi khóa (nhớ trong 6 giờ) để không bao giờ báo lặp dù hàm bị gọi nhiều lần.
function guiZaloMotLan_(khoaTin, noiDung) {
  var cache = CacheService.getScriptCache();
  if (cache.get('ZALO_' + khoaTin)) return;
  cache.put('ZALO_' + khoaTin, '1', 21600);
  guiZalo_(noiDung);
}

// Dựng lỗi: đưa về CO_KICH_BAN để thử lại; quá MAX_LAN_LOI lần thì đánh dấu LOI và báo Zalo.
function baoLoiDung_(sh, r, lyDo) {
  var n = (Number(r.so_lan_loi) || 0) + 1;
  var het = n >= Number(cauHinh_('MAX_LAN_LOI'));
  ghi_(sh, r._row, {
    trang_thai: het ? 'LOI' : 'CO_KICH_BAN',
    so_lan_loi: n,
    ghi_chu: ('DUNG_VIDEO: ' + String(lyDo)).slice(0, 300)
  });
  nhatKy_('DUNG_LOI', r.id + ' (lần ' + n + '): ' + lyDo);
  if (het) guiZaloMotLan_('LOI_' + r.id + '_' + n, '❌ Dựng video ' + r.id + ' lỗi ' + n + ' lần, cần xem: ' + String(lyDo).slice(0, 200));
}

/* ===================== DỌN FILE VIDEO KHI ĐÁNH DẤU ĐÃ ĐĂNG ===================== */

// Gọi từ donDaXong_() (bước J trong hướng dẫn sửa Code.gs): cùng cách xử lý như file kịch bản (CACH_XU_LY_FILE).
function xuLyFileVideo_(fileId) {
  if (!fileId) return;
  var cach = cauHinh_('CACH_XU_LY_FILE');
  if (cach === 'GIU') return;
  try {
    var f = DriveApp.getFileById(fileId);
    if (cach === 'XOA') { f.setTrashed(true); return; }
    var goc = thuMucKichBan_().getParents().next();
    var it = goc.getFoldersByName('da_xong');
    var dich = it.hasNext() ? it.next() : goc.createFolder('da_xong');
    f.moveTo(dich);
  } catch (e) { nhatKy_('LOI_DON_DEP', 'video ' + fileId + ': ' + e.message); }
}
