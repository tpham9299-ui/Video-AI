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
 * Lưu ý: dự án này dùng doPost() để nhận kết quả từ GitHub VÀ tin nhắn Zalo (đề ưu tiên, xem ZaloDeBai.gs).
 * Một dự án Apps Script chỉ có MỘT doPost(): tin Zalo được nhận ra nhờ tham số ?nguon=zalo trên địa chỉ webhook.
 * Đề ưu tiên (gửi qua Zalo) được gửi dựng TRƯỚC, kể cả khi đang có video khác đang dựng (GitHub dựng song song);
 * trong lúc còn đề ưu tiên chưa xong, các đề thường không được gửi dựng.
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

/* ===================== GIA HẠN TOKEN GITHUB ===================== */
// Token GitHub (fine-grained) luôn có ngày hết hạn. Gia hạn = tạo lại token (Regenerate) -> GitHub cấp MÃ MỚI.
// Vì Script Properties đã đầy, dán mã mới vào sheet CAU_HINH (dòng GITHUB_TOKEN_MOI) rồi chạy capNhatTokenGitHub():
// hàm thử mã với GitHub, đạt thì lưu vào Script Properties (GITHUB_TOKEN) và XÓA dòng đó khỏi sheet.
function capNhatTokenGitHub() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ch = ss.getSheetByName(TEN_CAU_HINH);
  var v = ch.getDataRange().getValues(), hang = -1, token = '';
  for (var i = 1; i < v.length; i++) if (String(v[i][0]).trim() === 'GITHUB_TOKEN_MOI') { hang = i + 1; token = String(v[i][1]).trim(); }
  if (!token) { Logger.log('Chưa có dòng GITHUB_TOKEN_MOI (cột khoa) với mã token mới (cột gia_tri) trong sheet CAU_HINH.'); return; }
  var p = PropertiesService.getScriptProperties();
  var repo = p.getProperty('GITHUB_REPO') || 'tpham9299-ui/Video-AI';
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) { Logger.log('❌ Mã mới KHÔNG dùng được (HTTP ' + res.getResponseCode() + '), chưa lưu. Kiểm tra lại đã chép đủ mã chưa.'); return; }
  p.setProperty('GITHUB_TOKEN', token);
  ch.deleteRow(hang);   // không để mã bí mật nằm trên sheet
  var han = hanToken_(res);
  Logger.log('✅ Đã lưu token mới vào GITHUB_TOKEN và xóa dòng GITHUB_TOKEN_MOI khỏi sheet.' + (han ? ' Hạn mới: ' + Utilities.formatDate(han, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : ' Token không có ngày hết hạn.'));
  CacheService.getScriptCache().remove('DA_XEM_HAN_TOKEN');
}

// Ngày hết hạn đọc từ phản hồi của GitHub (header github-authentication-token-expiration); null nếu không hết hạn.
function hanToken_(res) {
  var h = res.getAllHeaders(), gt = '';
  Object.keys(h).forEach(function (k) { if (k.toLowerCase() === 'github-authentication-token-expiration') gt = String(h[k]); });
  var m = /(\d{4})-(\d{2})-(\d{2})/.exec(gt);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

// Mỗi ngày kiểm tra một lần: token còn ≤ 7 ngày thì nhắn Zalo nhắc gia hạn (mỗi ngày một tin), hết hạn thì báo ngay.
function kiemTraHanToken_() {
  var c = CacheService.getScriptCache();
  if (c.get('DA_XEM_HAN_TOKEN')) return;
  c.put('DA_XEM_HAN_TOKEN', '1', 21600);
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty('GITHUB_TOKEN'), repo = p.getProperty('GITHUB_REPO');
  if (!token || !repo) return;
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, muteHttpExceptions: true });
  var ngay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  if (res.getResponseCode() === 401) {
    guiZaloMotLan_('TOKEN_HET_' + ngay, '❌ Token GitHub đã HẾT HẠN hoặc bị thu hồi: video không dựng được nữa. Tạo lại token (Regenerate) rồi dán vào sheet CAU_HINH dòng GITHUB_TOKEN_MOI và chạy capNhatTokenGitHub (xem SUA_CODE_LAN_16.md).');
    return;
  }
  var han = hanToken_(res);
  if (!han) return;
  var con = Math.ceil((han.getTime() - Date.now()) / 86400000);
  if (con <= 7) guiZaloMotLan_('TOKEN_SAP_HET_' + ngay, '⏰ Token GitHub còn ' + con + ' ngày là hết hạn (' + Utilities.formatDate(han, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') + '). Gia hạn sớm để video không bị dừng: Regenerate token trên GitHub, dán mã mới vào sheet CAU_HINH dòng GITHUB_TOKEN_MOI, rồi chạy capNhatTokenGitHub.');
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
    try { kiemTraHanToken_(); } catch (eh) { Logger.log('Kiểm tra hạn token: ' + eh.message); }
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    if (!sh) return;
    chonVaGuiDung_(sh);
  } finally {
    khoa.releaseLock();
  }
}

// Chọn kịch bản chờ lâu nhất (đề ưu tiên trước) và gửi GitHub dựng, nếu còn chỗ. Gọi khi ĐÃ giữ khóa.
function chonVaGuiDung_(sh) {
  {
    var hang = docHang_(sh);
    var bayGio = Date.now();

    // 1) Video đang dựng quá lâu -> báo lỗi để thử lại
    var dangDung = 0;
    hang.forEach(function (r) {
      if (r.trang_thai !== 'DANG_DUNG') return;
      var phut = r.cap_nhat instanceof Date ? (bayGio - r.cap_nhat.getTime()) / 60000 : 99999;
      if (phut > BP2_QUA_HAN_PHUT) { kiemTraGitHubBiChan_(); baoLoiDung_(sh, r, 'QUA_HAN: GitHub không báo kết quả sau ' + BP2_QUA_HAN_PHUT + ' phút'); }
      else dangDung++;
    });
    // 2) Đề ưu tiên (Zalo) trước, rồi kịch bản chờ lâu nhất
    var conUuTien = hang.some(function (r) { return laUuTien_(r) && ['CHO_DOC', 'MOI', 'DA_GIAI', 'CO_KICH_BAN', 'DANG_DUNG'].indexOf(r.trang_thai) >= 0; });
    var ds = hang.filter(function (r) { return r.trang_thai === 'CO_KICH_BAN' && r.file_kich_ban && (laUuTien_(r) || !conUuTien); })
      .sort(function (a, b) {
        var u = (laUuTien_(b) ? 1 : 0) - (laUuTien_(a) ? 1 : 0);
        return u || new Date(a.cap_nhat).getTime() - new Date(b.cap_nhat).getTime();
      });
    if (!ds.length) return;
    var r = ds[0];
    // dựng song song tối đa SO_VIDEO_CUNG_LUC video thường (mặc định 2); đề ưu tiên được thêm một chỗ
    var toiDaDung = Number(cauHinh_('SO_VIDEO_CUNG_LUC')) || 2;
    if (dangDung >= toiDaDung && !(laUuTien_(r) && dangDung < toiDaDung + 1)) return;

    try {
      kichHoatDungVideo_(r);
      ghi_(sh, r._row, { trang_thai: 'DANG_DUNG', ghi_chu: '' });
      nhatKy_('DUNG_VIDEO', r.id + ' -> đã gửi sang GitHub để dựng' + (laUuTien_(r) ? ' (ưu tiên)' : ''));
    } catch (e) {
      baoLoiDung_(sh, r, e.message);
    }
    if (laUuTien_(r)) PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');   // đề ưu tiên: không chờ vẽ bảng
    else PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
  }
}

// Gửi kịch bản sang GitHub để dựng. Ưu tiên "workflow_dispatch" với ref = nhánh GITHUB_NHANH (CAU_HINH), để GitHub chạy đúng
// mã mới nhất của nhánh đó thay vì mã cũ trên nhánh mặc định (master). Token chưa có quyền Actions hoặc nhánh không tồn tại
// -> tự lùi về "repository_dispatch" như cũ (dựng bằng nhánh mặc định) và báo một lần để bạn biết.
function kichHoatDungVideo_(r) {
  var kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString());
  delete kb.cach_giai;                       // lời giải chi tiết không cần cho việc dựng, bớt dung lượng
  kb.id = r.id;
  // kiểm duyệt bố cục trên GitHub: 'chan' = lỗi nặng thì dừng, gửi về để tự sửa kịch bản; sau 2 lần sửa vẫn lỗi -> 'bao' (dựng rồi AI chấm)
  var kdCu = {};
  try { kdCu = JSON.parse(String(r.ai_kiem_tra || '{}')); } catch (e0) {}
  kb._kiem_duyet = (Number(kdCu.kd_lan) || 0) >= 2 ? 'bao' : 'chan';
  if (JSON.stringify(kb).length > 52000) delete kb.de_bai;
  var chuoi = JSON.stringify(kb);
  if (chuoi.length > 60000) throw new Error('KICH_BAN_QUA_LON_' + chuoi.length);

  var nhanh = nhanhGitHub_();
  if (nhanh) {
    var kq = guiWorkflowGitHub_({ viec: 'dung', id: r.id, kich_ban: chuoi });
    if (kq.ok) return;
    nhatKy_('GITHUB_NHANH', 'Không chạy được trên nhánh ' + nhanh + ' (' + kq.loi + '), lùi về cách cũ (nhánh mặc định)');
    guiZaloMotLan_('NHANH_' + kq.ma, '⚠️ GitHub chưa chạy được trên nhánh ' + nhanh + ' (' + kq.loi + '). Video vẫn được dựng nhưng bằng mã của nhánh mặc định. ' +
      (kq.ma === 403 ? 'Cách sửa: token GitHub cần thêm quyền "Actions: Read and write".' : 'Kiểm tra lại tên nhánh ở CAU_HINH > GITHUB_NHANH.'));
  }
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty('GITHUB_TOKEN'), repo = p.getProperty('GITHUB_REPO');
  if (!token || !repo) throw new Error('THIEU_GITHUB_TOKEN_HOAC_REPO');
  var thanVan = JSON.stringify({ event_type: 'dung-video', client_payload: { id: r.id, kich_ban: kb } });
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/dispatches', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: thanVan,
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  });
  var ma = res.getResponseCode();
  if (ma !== 204) throw new Error('GITHUB_' + ma + ': ' + String(res.getContentText()).replace(/\s+/g, ' ').slice(0, 200));
}

// Nhánh GitHub để dựng/đăng (CAU_HINH > GITHUB_NHANH). Để trống hoặc "-" = dùng cách cũ (nhánh mặc định).
function nhanhGitHub_() {
  var n = String(cauHinh_('GITHUB_NHANH') || '').trim();
  return n === '-' ? '' : n;
}

// Chạy workflow dung-video.yml trên nhánh GITHUB_NHANH với các tham số (inputs). Trả {ok, ma, loi}.
function guiWorkflowGitHub_(inputs, tepWorkflow) {
  tepWorkflow = tepWorkflow || 'dung-video.yml';
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty('GITHUB_TOKEN'), repo = p.getProperty('GITHUB_REPO');
  if (!token || !repo) return { ok: false, ma: 0, loi: 'THIEU_GITHUB_TOKEN_HOAC_REPO' };
  var nhanh = nhanhGitHub_();
  if (!nhanh) return { ok: false, ma: 0, loi: 'CHUA_DAT_GITHUB_NHANH' };
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/actions/workflows/' + tepWorkflow + '/dispatches', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ ref: nhanh, inputs: inputs }),
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  });
  var ma = res.getResponseCode();
  if (ma === 204) return { ok: true, ma: ma };
  var noi = String(res.getContentText()).replace(/\s+/g, ' ');
  if (ma === 403 && /not accessible by personal access token/i.test(noi)) {
    return { ok: false, ma: ma, loi: 'Token GitHub CHƯA có quyền "Actions: Read and write" (GitHub > Settings > Developer settings > Fine-grained tokens > Edit > Add permissions > Actions)' };
  }
  if (ma === 404) return { ok: false, ma: ma, loi: 'Không thấy workflow ' + tepWorkflow + ' trên nhánh "' + nhanh + '" (kiểm tra CAU_HINH > GITHUB_NHANH)' };
  return { ok: false, ma: ma, loi: 'HTTP ' + ma + ': ' + noi.slice(0, 160) };
}

// GitHub nhận lệnh (204) nhưng KHÔNG chạy job (thanh toán lỗi, hết phút vì repo private, Actions bị tắt...): không có kết quả gửi về.
// Gọi khi một việc trên GitHub quá hạn: đọc vài lần chạy gần nhất, thấy lý do bị chặn thì báo bạn (tối đa 1 lần/ngày).
function kiemTraGitHubBiChan_() {
  try {
    var c = CacheService.getScriptCache();
    if (c.get('GH_KT_CHAN')) return '';
    c.put('GH_KT_CHAN', '1', 1800);
    var p = PropertiesService.getScriptProperties();
    var token = p.getProperty('GITHUB_TOKEN'), repo = p.getProperty('GITHUB_REPO');
    if (!token || !repo) return '';
    var h = { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, muteHttpExceptions: true };
    var runs = JSON.parse(UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/actions/runs?per_page=5', h).getContentText()).workflow_runs || [];
    var hong = runs.filter(function (x) { return x.conclusion === 'failure' && new Date(x.updated_at) - new Date(x.created_at) < 120000; });
    if (hong.length < 2) return '';
    var cr = JSON.parse(UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/check-suites/' + hong[0].check_suite_id + '/check-runs', h).getContentText()).check_runs || [];
    var lyDo = '';
    for (var i = 0; i < cr.length && !lyDo; i++) {
      if (!cr[i].output || !cr[i].output.annotations_count) continue;
      var an = JSON.parse(UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/check-runs/' + cr[i].id + '/annotations', h).getContentText()) || [];
      an.forEach(function (a) { if (!lyDo && /payment|spending limit|billing|minutes/i.test(String(a.message))) lyDo = String(a.message); });
    }
    if (!lyDo) return '';
    var rieng = false;
    try { rieng = JSON.parse(UrlFetchApp.fetch('https://api.github.com/repos/' + repo, h).getContentText())['private'] === true; } catch (e2) {}
    nhatKy_('GITHUB_BI_CHAN', lyDo.slice(0, 300));
    guiZalo_('🚨 GitHub ĐANG CHẶN mọi lần chạy (giải đề + dựng video đều dừng): "' + lyDo.slice(0, 160) + '"\n' +
      (rieng ? '👉 Repo đang ở chế độ PRIVATE nên bị tính phút theo gói. Cách nhanh nhất: GitHub > repo > Settings > General > Danger Zone > Change visibility > Public (repo public chạy Actions miễn phí không giới hạn; Secrets vẫn an toàn).'
             : '👉 Vào GitHub > Settings > Billing and plans để cập nhật thanh toán hoặc tăng giới hạn chi tiêu.') +
      '\nTrong lúc chờ, đề vẫn được giải chậm tại Apps Script.', 'cao', 'GH_CHAN_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd'));
    return lyDo;
  } catch (e) { return ''; }
}

/* ===================== NHẬN KẾT QUẢ TỪ GITHUB ===================== */

// Triển khai: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
// Sao chép địa chỉ kết thúc bằng /exec vào GitHub Secret APPS_SCRIPT_URL.
// Mỗi lần sửa mã nhớ Deploy > Manage deployments > Edit > Version: New version.
function doPost(e) {
  if (e && e.parameter && e.parameter.nguon === 'zalo' && typeof nhanZalo_ === 'function') return nhanZalo_(e);   // tin nhắn Zalo (ZaloDeBai.gs)
  var tra = function (o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); };
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return tra({ ok: false, loi: 'JSON_HONG' }); }
  var bi = PropertiesService.getScriptProperties().getProperty('DUNG_VIDEO_SECRET');
  if (!bi || !d || d.token !== bi) return tra({ ok: false, loi: 'SAI_TOKEN' });

  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(120000)) return tra({ ok: false, loi: 'BAN' });   // đang chạy Bộ phận 1: GitHub sẽ thử lại
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    if (d.loai === 'bo_phan_1') {   // kết quả giải + kịch bản từ GitHub (BoPhan1.gs, lần 23)
      return tra(nhanKetQuaBoPhan1_(sh, d));
    }
    if (d.loai === 'dang') {   // kết quả đăng video lên mạng xã hội (DangVideo.gs)
      var kqDang = typeof xuLyKetQuaDang_ === 'function' ? xuLyKetQuaDang_(sh, d) : { ok: false, loi: 'THIEU_DangVideo.gs' };
      PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
      return tra(kqDang);
    }
    var r = null;
    docHang_(sh).forEach(function (x) { if (x.id === d.id) r = x; });
    if (!r) return tra({ ok: false, loi: 'KHONG_TIM_THAY' });

    // KIỂM DUYỆT BỐ CỤC không đạt (chữ tràn/đè, TeX thô...): chưa dựng, tự sửa kịch bản rồi dựng lại (NangCao.gs)
    if (d.kiem_duyet && !d.ok) {
      if (r.trang_thai !== 'DANG_DUNG') return tra({ ok: true, lap: true });
      if (typeof xuLyKiemDuyetBoCuc_ === 'function') return tra(xuLyKiemDuyetBoCuc_(sh, r, d.kiem_duyet));
    }
    // Chống xử lý lặp: GitHub (hoặc mạng) có thể gửi cùng một kết quả nhiều lần; chỉ lần đầu được báo Zalo/ghi.
    if (d.ok && d.file_id) {
      if (r.trang_thai === 'CO_VIDEO' && String(r.file_video) === String(d.file_id)) return tra({ ok: true, lap: true });
      if (r.trang_thai === 'DA_XONG') return tra({ ok: true, lap: true });
      var canDuyetVideo = typeof canDuyet_ === 'function' && canDuyet_();
      ghi_(sh, r._row, { trang_thai: 'CO_VIDEO', file_video: String(d.file_id), ghi_chu: '', so_lan_loi: 0, duyet: canDuyetVideo ? 'CHO' : '', anh_kt: d.anh_kt || '', anh_bia: d.anh_bia || '' });
      // AI xem video trước (NangCao.gs): đạt mới gửi bạn duyệt, chưa đạt thì tự sửa rồi dựng lại
      r.file_video = String(d.file_id); r.anh_kt = d.anh_kt || ''; r.anh_bia = d.anh_bia || '';
      // AI kiểm duyệt MỌI video (kể cả khi tắt duyệt tay): chưa đạt thì tự sửa, không gửi bạn / không đăng
      var aiXem = typeof giaoAiXemVideo_ === 'function' && giaoAiXemVideo_(sh, r, d);
      nhatKy_('DUNG_VIDEO', r.id + ' -> xong, file ' + d.file_id);
      var tinVideo = '🎞 Video đã dựng xong: ' + (r.chu_de || r.id) + (d.giay ? ' (' + d.giay + ' giây)' : '') +
        '\nhttps://drive.google.com/file/d/' + d.file_id + '/view' +
        (canDuyetVideo ? '\n👉 Xem rồi trả lời: /duyet ' + r.id + ' (cho đăng) | /sua ' + r.id + ' <góp ý> (sửa rồi dựng lại) | /bo ' + r.id + ' (không đăng)' : '');
      if (aiXem) {
        nhatKy_('AI_XEM', r.id + ': video xong, AI đang xem trước khi gửi bạn duyệt');
      } else if (laUuTien_(r) && r.zalo_chat) {
        var cacheV = CacheService.getScriptCache();
        if (!cacheV.get('ZALO_VIDEO_' + r.id + '_' + d.file_id)) {
          cacheV.put('ZALO_VIDEO_' + r.id + '_' + d.file_id, '1', 21600);
          guiZaloToi_(r.zalo_chat, '🎉 Video cho đề bạn gửi đã xong' + (r.dap_an_hien ? ' (đáp án ' + r.dap_an_hien + ')' : '') + '!' + tinVideo.slice(tinVideo.indexOf('\n')) +
            '\nHệ thống quay lại làm các đề khác.');
        }
      } else guiZaloMotLan_('VIDEO_' + r.id + '_' + d.file_id, tinVideo);
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
function guiZaloMotLan_(khoaTin, noiDung, muc) {
  guiZalo_(noiDung, muc || 'cao', khoaTin);
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
  if (het && !(laUuTien_(r) && r.zalo_chat)) guiZaloMotLan_('LOI_' + r.id + '_' + n, '❌ Dựng video ' + r.id + ' lỗi ' + n + ' lần nên dừng, cần xem: ' + String(lyDo).slice(0, 200), 'vua');
  if (laUuTien_(r) && r.zalo_chat && (het || duocThongBao_('thap'))) guiZaloToi_(r.zalo_chat, het ? '❌ Dựng video cho đề ' + r.id + ' lỗi ' + n + ' lần nên dừng lại: ' + String(lyDo).slice(0, 150)
    : '🔁 Dựng video đề ' + r.id + ' gặp trục trặc, hệ thống tự dựng lại (lần ' + (n + 1) + ').');
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
