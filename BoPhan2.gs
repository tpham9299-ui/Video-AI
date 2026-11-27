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


/* ===================== CÀI ĐẶT ===================== */

// Chạy MỘT lần sau khi đã sửa Code.gs (thêm 'file_video' vào COT) và đặt 3 bí mật.
function caiDatBoPhan2() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var c = COT.indexOf('file_video') + 1;
  if (!sh) throw new Error('Chưa có sheet HANG_DOI: hãy chạy khoiTao() trước.');
  if (c <= 0) throw new Error('Chưa thêm "file_video" vào mảng COT trong Code.gs (xem hướng dẫn sửa Code.gs, bước D).');
  sh.getRange(1, c).setValue('file_video');

  caiLichBoNao_();

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

// Lệnh Zalo /token: tình trạng token GitHub đang dùng (KHÔNG bao giờ in mã token): còn dùng được không, hạn, số ngày còn lại,
// và đủ quyền chưa (Contents: đọc repo; Actions: gọi được các workflow dựng video / giải đề / đăng bài).
function thongTinTokenGitHub_() {
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty('GITHUB_TOKEN'), repo = p.getProperty('GITHUB_REPO');
  if (!token || !repo) return '❌ Chưa có token GitHub (GITHUB_TOKEN) hoặc tên repo (GITHUB_REPO) trong Script Properties.';
  var h = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo, { headers: h, muteHttpExceptions: true });
  var ma = res.getResponseCode();
  if (ma === 401) return '❌ Token GitHub HẾT HẠN hoặc đã bị xóa/thu hồi: hệ thống không gọi được GitHub (không giải đề, không dựng video).\n' +
    'Cách sửa: tạo token mới, dán vào sheet CAU_HINH dòng GITHUB_TOKEN_MOI rồi chạy capNhatTokenGitHub.';
  if (ma === 404) return '❌ Token còn hiệu lực nhưng KHÔNG thấy repo ' + repo + ': token chưa được cấp quyền repo này (Repository access) hoặc tên repo sai.';
  if (ma !== 200) return '⚠️ GitHub trả lỗi HTTP ' + ma + ' khi kiểm tra token, thử lại sau ít phút.';
  var han = hanToken_(res);
  var dong = ['🔑 Token GitHub: ✅ ĐANG DÙNG ĐƯỢC (repo ' + repo + ')'];
  if (!han) dong.push('⏳ Thời hạn: KHÔNG HẾT HẠN (vĩnh viễn)');
  else {
    var con = Math.ceil((han.getTime() - Date.now()) / 86400000);
    dong.push('⏳ Hết hạn ngày ' + Utilities.formatDate(han, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') + ' (còn ' + con + ' ngày)' + (con <= 7 ? ' ⚠️ SẮP HẾT, nên gia hạn ngay' : ''));
  }
  // quyền Actions (đọc danh sách workflow; quyền ghi được thử thật mỗi lần hệ thống gửi việc sang GitHub)
  var wf = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/actions/workflows', { headers: h, muteHttpExceptions: true });
  dong.push(wf.getResponseCode() === 200 ? '✅ Quyền Actions: có (gọi được dựng video, giải đề, đăng bài)'
    : '❌ Quyền Actions: THIẾU (HTTP ' + wf.getResponseCode() + ') - sửa token, cấp "Actions: Read and write"');
  var cuoi = CacheService.getScriptCache().get('GH_GUI_LOI_GAN');
  if (cuoi) dong.push('⚠️ Lần gửi việc sang GitHub gần đây bị lỗi: ' + cuoi);
  return dong.join('\n');
}

/* ===================== VÒNG CHẠY (trigger 10 phút) ===================== */

function chayBoPhan2() { return chayBoNaoDieuPhoi(); }

// GIỌNG ĐỌC THEO QUY TẮC (mỗi video một giọng; kênh có giọng chủ đạo, đổi gió có nhịp đều):
//  CHU_KY (mặc định): đếm video gửi dựng, cứ CHU_KY_GIONG video giọng NAM thì 1 video giọng NỮ (3 -> nam, nam, nam, nữ, nam, nam, nam, nữ...)
//  THEO_MON: toán thực tế giọng nam, xác suất giọng nữ (mỗi chuyên mục một "người dẫn")
//  CHI_NAM / CHI_NU: luôn một giọng.
// Video đã được chọn giọng thì dựng lại vẫn giữ nguyên giọng đó (lưu theo mã video).
function chonGiongDoc_(r) {
  var nam = String(cauHinh_('GIONG_NAM') || 'Puck').trim(), nu = String(cauHinh_('GIONG_NU') || 'Aoede').trim();
  var p = PropertiesService.getScriptProperties();
  var daChon = {};
  try { daChon = JSON.parse(p.getProperty('GIONG_THEO_VIDEO') || '{}'); } catch (e) {}
  if (daChon[r.id]) return { gioi: daChon[r.id], ten: daChon[r.id] === 'nu' ? nu : nam };
  var qt = String(cauHinh_('QUY_TAC_GIONG') || 'CHU_KY').toUpperCase();
  var gioi = 'nam';
  if (qt === 'CHI_NU') gioi = 'nu';
  else if (qt === 'THEO_MON') gioi = laMonThucTe_(r) ? 'nam' : 'nu';
  else if (qt === 'CHU_KY') {
    var k = Math.max(1, Number(cauHinh_('CHU_KY_GIONG')) || 3);
    var dem = Number(p.getProperty('GIONG_DEM') || 0);
    gioi = (dem % (k + 1)) === k ? 'nu' : 'nam';
    p.setProperty('GIONG_DEM', String(dem + 1));
  }
  daChon[r.id] = gioi;
  var ids = Object.keys(daChon);
  if (ids.length > 300) ids.slice(0, ids.length - 300).forEach(function (x) { delete daChon[x]; });
  p.setProperty('GIONG_THEO_VIDEO', JSON.stringify(daChon));
  nhatKy_('GIONG_DOC', r.id + ': giọng ' + (gioi === 'nu' ? 'nữ ' + nu : 'nam ' + nam) + ' (quy tắc ' + qt + ')');
  return { gioi: gioi, ten: gioi === 'nu' ? nu : nam };
}

function kichHoatDungVideo_(r) {
  var kb = JSON.parse(docKichBanAnToan_(r.file_kich_ban) || 'null');
  if (!kb) throw new Error('DRIVE_KICH_BAN: chưa đọc được kịch bản');
  delete kb.cach_giai;                       // lời giải chi tiết không cần cho việc dựng, bớt dung lượng
  kb.id = r.id;
  if (!kb.mon && (r.mon || /^HH/i.test(String(r.id || '')))) kb.mon = r.mon || 'HINH_HOC';
  if (!kb.luong) kb.luong = String(kb.mon || '').toUpperCase() === 'HINH_HOC' ? 'hinh_hoc_thuan' : 'thuc_te_xac_suat';   // v86 khóa luồng (kịch bản cũ)
  // kiểm duyệt bố cục trên GitHub: 'chan' = lỗi nặng thì dừng, gửi về để tự sửa kịch bản; sau 1 lần dựng lại vẫn lỗi -> 'bao' (dựng rồi AI chấm)
  var kdCu = {};
  try { kdCu = JSON.parse(String(r.ai_kiem_tra || '{}')); } catch (e0) {}
  kb._kiem_duyet = (Number(kdCu.so_lan_tu_sua) || Number(kdCu.kd_lan) || 0) >= 1 ? 'bao' : 'chan';
  // giọng đọc của video này theo QUY TẮC (không ngẫu nhiên); cùng một video dựng lại thì giữ nguyên giọng đã chọn
  var gd = chonGiongDoc_(r);
  kb.giong = gd.ten; kb.gioi_tinh_giong = gd.gioi;
  // KỊCH BẢN NHIỀU CẢNH -> NÉN cho vừa giới hạn gửi GitHub (65.535 ký tự):
  // Bỏ phần không dùng khi dựng, rút gọn mô tả cảnh; nếu kịch bản nhiều khung hình rất lớn (> 58KB)
  // thì lưu bản payload gọn lên tệp riêng trên Drive (KHÔNG ghi đè file_kich_ban gốc để giữ nguyên hashtag/thong_tin đăng)
  ['hook_ung_vien', 'hashtag', 'y_tuong_chinh', 'tu_kiem_tra'].forEach(function (k) { if (JSON.stringify(kb).length > 50000) delete kb[k]; });
  if (JSON.stringify(kb).length > 52000) kb.canh.forEach(function (c) { if (c && c.minh_hoa && c.minh_hoa.mo_ta) c.minh_hoa.mo_ta = String(c.minh_hoa.mo_ta).slice(0, 90); });
  var chuoi = JSON.stringify(kb);
  if (chuoi.length > 58000) {
    var tepIdGui = idTepKichBan_(ghiKichBanAnToan_(r.id + '_payload', chuoi));
    if (!tepIdGui) throw new Error('DRIVE_KICH_BAN: chưa lưu được payload dựng');
    chuoi = JSON.stringify({ id: r.id, _file_kich_ban_drive: tepIdGui, giong: kb.giong, gioi_tinh_giong: kb.gioi_tinh_giong, _kiem_duyet: kb._kiem_duyet, mon: kb.mon, luong: kb.luong });
  }

  var kq = guiWorkflowGitHub_({ viec: 'dung', lan_giao: r.lan_giao, id: r.id, kich_ban: chuoi }, 'dung-video.yml');
  if (!kq.ok) throw new Error(kq.loi);
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
  var nhanh = nhanhGitHub_() || 'master';
  var res = null, ma = 0;
  var nhanhThu = nhanh;
  for (var thu = 0; thu < 2; thu++) {
    try {
      res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/actions/workflows/' + tepWorkflow + '/dispatches', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ ref: nhanhThu, inputs: inputs }),
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
      });
      ma = res.getResponseCode();
      if (ma >= 500) throw new Error('GitHub HTTP ' + ma);
    } catch (e) { e.dispatchIncertain = true; throw e; }
    if (ma >= 200 && ma < 300) return { ok: true, ma: ma };
    if (ma === 404 && nhanhThu !== 'master' && thu === 0) { nhanhThu = 'master'; continue; }
    break;
  }
  var noi = String(res.getContentText()).replace(/\s+/g, ' ');
  try { CacheService.getScriptCache().put('GH_GUI_LOI_GAN', Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm dd/MM') + ' ' + tepWorkflow + ' HTTP ' + ma, 21600); } catch (eC) {}   // cho lệnh /token
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
  if (!khoa.tryLock(30000)) return tra({ ok: false, loi: 'BAN' });   // đang ghi ngắn: GitHub sẽ thử lại
  if (typeof _GIU_KHOA_ !== 'undefined') _GIU_KHOA_++;
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    damBaoCot_(sh);
    // key Gemini lỗi thật (GitHub phát hiện): báo Zalo để người dùng gỡ key, mỗi key một lần mỗi ngày
    if (Array.isArray(d.key_hong) && d.key_hong.length) baoKeyHong_(d.key_hong);
    if (d.loai === 'bao_cao_key' && d.bao_cao) {
      PropertiesService.getScriptProperties().setProperty('BAO_CAO_KEY_GH', String(d.bao_cao).slice(0, 1800));
      var tbKey = '🔑 KẾT QUẢ KIỂM TRA KEY GEMINI TRÊN GITHUB:\n' + String(d.bao_cao).slice(0, 1200);
      if (typeof khoXem === 'function') {
        try { tbKey += '\n\n📂 KHO KEY APPS SCRIPT:\n' + String(khoXem()).slice(0, 700); } catch (eKx) {}
      }
      guiZalo_(tbKey, 'cao', 'BC_KEY_GH_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd_HHmm'));
      return tra({ ok: true });
    }
    if (d.loai === 'bao_cao_don_drive' && d.bao_cao) {
      var tinDonDrive = String(d.bao_cao).slice(0, 1800);
      nhatKy_('DON_VIDEO_DRIVE', tinDonDrive.replace(/\n/g, ' | ').slice(0, 400));
      if (d.chat_id && typeof guiZaloToi_ === 'function') guiZaloToi_(String(d.chat_id), tinDonDrive);
      else guiZalo_(tinDonDrive, 'cao', 'DON_DRIVE_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd_HHmm'));
      return tra({ ok: true });
    }
    if (d.loai === 'key_hong') return tra({ ok: true });
    if (d.id && d.loai !== 'them_de') {
      var hienTai = docHang_(sh).find(function(x) { return x.id === d.id; });
      if (hienTai && String(d.lan_giao || '') !== String(hienTai.lan_giao || '')) return tra({ok:true, lap:true});
    }
    if (d.loai === 'bo_phan_1') {   // kết quả giải + kịch bản từ GitHub (BoPhan1.gs, lần 23)
      return tra(nhanKetQuaBoPhan1_(sh, d));
    }
    if (d.loai === 'them_de' && typeof nhanThemDeTuGitHub_ === 'function') {   // đề mới từ sinh-de.yml
      return tra(nhanThemDeTuGitHub_(sh, d));
    }
    if (d.loai === 'ai_xem' && typeof xuLyKetQuaAiXem_ === 'function') {   // kết quả AI chấm video từ kiem-tra-video.yml
      var kqAX = xuLyKetQuaAiXem_(sh, d);
      PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
      return tra(kqAX);
    }
    if (d.loai === 'dang') {   // kết quả đăng video lên mạng xã hội (DangVideo.gs)
      var kqDang = typeof xuLyKetQuaDang_ === 'function' ? xuLyKetQuaDang_(sh, d) : { ok: false, loi: 'THIEU_DangVideo.gs' };
      PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
      return tra(kqDang);
    }
    // Nếu người dùng vừa yêu cầu /bo video này trong lúc GitHub đang dựng: không gọi DriveApp.setTrashed lên MP4 (don-video-drive.yml sẽ dọn bằng rclone)
    if (d.id && CacheService.getScriptCache().get('DA_BO_' + d.id)) {
      return tra({ ok: true, lap: true });
    }
    var r = null;
    docHang_(sh).forEach(function (x) { if (x.id === d.id) r = x; });
    if (!r) {
      // Dòng có thể đã được lưu trữ sau khi đăng. Webhook gửi lại không chứng minh MP4 là bản lỗi.
      return tra({ ok: false, loi: 'KHONG_TIM_THAY' });
    }
    // Nếu người dùng vừa nhắn /sua <mã> khiến dòng đã quay về MOI / DA_GIAI / GITHUB hoặc vừa mới sửa xong (SUA_MOI_): bỏ kết quả dựng cũ (MP4 mồ côi do rclone dọn)
    if (['MOI', 'DA_GIAI', 'GITHUB'].indexOf(String(r.trang_thai)) >= 0 || CacheService.getScriptCache().get('SUA_MOI_' + r.id)) {
      return tra({ ok: true, lap: true });
    }

    // KIỂM DUYỆT BỐ CỤC không đạt (chữ tràn/đè, TeX thô...): chưa dựng, tự sửa kịch bản rồi dựng lại (NangCao.gs)
    if (d.kiem_duyet && !d.ok) {
      if (r.trang_thai !== 'DANG_DUNG') return tra({ ok: true, lap: true });
      if (typeof xuLyKiemDuyetBoCuc_ === 'function') return tra(xuLyKiemDuyetBoCuc_(sh, r, d.kiem_duyet));
    }
    // Chống xử lý lặp: GitHub (hoặc mạng) có thể gửi cùng một kết quả nhiều lần; chỉ lần đầu được báo Zalo/ghi.
    if (r.trang_thai !== 'DANG_DUNG') return tra({ok: true, lap: true});
    // Cổng chặn MP4 hỏng trên runner: chưa tải MP4 lên Drive (không sinh rác Drive), vẫn đi qua Auto-Heal / chốt lỗi.
    if (d.mp4_bi_chan) {
      var matThanBiChan = d.mat_than && d.mat_than.dat === false;
      var coBoCucBiChan = Array.isArray(d.bo_cuc_loi) && d.bo_cuc_loi.length > 0;
      var tuSuaChan = (matThanBiChan || coBoCucBiChan) && typeof xuLyTuSuaMatThan_ === 'function' ? xuLyTuSuaMatThan_(sh, r, d) : null;
      if (tuSuaChan && tuSuaChan.tu_sua) {
        PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
        return tra({ ok: true, tu_sua: true, mp4_bi_chan: true, lan: tuSuaChan.da_sua + 1 });
      }
      var lyDoChan = String((d.kiem_tra_mp4 && d.kiem_tra_mp4.ly_do) || (d.mat_than && d.mat_than.ly_do) || d.loi || 'MP4 trượt cổng kiểm tra trước khi tải lên Drive');
      nhatKy_('MAT_THAN', r.id + ': chặn MP4 trên runner (không tải Drive) - ' + lyDoChan.slice(0, 300));
      if (tuSuaChan && tuSuaChan.het_luot && typeof boDeKhongDat_ === 'function') {
        boDeKhongDat_(sh, r, tuSuaChan.cung.map(function (x) { return x.loai; }).join(', '), 'video', '');
        PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
        return tra({ ok: true, het_luot: true, mp4_bi_chan: true });
      }
      ghi_(sh, r._row, { trang_thai: 'LOI_CAN_XEM', file_video: '', ghi_chu: ('MP4_BI_CHAN: ' + lyDoChan).slice(0, 300), lan_giao: '' }, r.id);
      var tinChan = '🛑 Chặn MP4 hỏng trên runner (đã xóa MP4, không đẩy lên Drive) cho ' + r.id + ':\n' + lyDoChan.slice(0, 400);
      if (d.anh_3x3 && typeof guiAnhZalo_ === 'function') guiAnhZalo_(d.anh_3x3, tinChan, laUuTien_(r) && r.zalo_chat ? r.zalo_chat : '');
      else guiZaloMotLan_('CHAN_MP4_' + r.id, tinChan, 'cao');
      PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
      return tra({ ok: true, mp4_bi_chan: true });
    }
    if (d.ok && d.file_id) {
      if (r.trang_thai === 'CO_VIDEO' && String(r.file_video) === String(d.file_id)) return tra({ ok: true, lap: true });
      if (r.trang_thai === 'DA_XONG') return tra({ ok: true, lap: true });
      var lyDoCho = d.kiem_tra_mp4 && d.kiem_tra_mp4.dat === true ? '' :
        String((d.kiem_tra_mp4 || {}).ly_do || 'Thiếu kết quả kiểm tra MP4');
      var gc = { trang_thai: 'CO_VIDEO', file_video: String(d.file_id), ghi_chu: lyDoCho, so_lan_loi: 0, duyet: 'CHO', anh_kt: d.anh_kt || '', anh_bia: d.anh_bia || '' };
      // v91 MẮT THẦN 3×3 phát hiện lỗi nặng: giữ ở CHO (không giao AI xem, không xếp lịch), đánh dấu chặn trong link_dang
      // (DangVideo.gs bỏ qua cho tới khi chính bạn /duyet sau thời điểm chặn) và gửi ảnh lưới + danh sách lỗi qua Zalo.
      var matThanChan = d.mat_than && d.mat_than.dat === false;
      var coBoCucLoi = Array.isArray(d.bo_cuc_loi) && d.bo_cuc_loi.length > 0;
      // v99.2/v102.0 AUTO-HEAL: lỗi CỨNG do kịch bản (Mắt thần 3×3 hoặc bo_cuc_loi nặng) và còn lượt
      // (tối đa 1 lần dựng lại / bài) -> trả về BP2 sửa đúng lỗi rồi BP3 tự dựng lại; video lỗi bỏ vào thùng rác. Hết lượt / lỗi khác -> CHO + Zalo.
      var tuSua = (matThanChan || coBoCucLoi) && typeof xuLyTuSuaMatThan_ === 'function' ? xuLyTuSuaMatThan_(sh, r, d) : null;
      if (tuSua && tuSua.tu_sua) {
        // Không gọi DriveApp.setTrashed lên MP4 (tránh lỗi quyền DON_VIDEO_LOI); MP4 lỗi sẽ được rclone dọn qua don-video-drive.yml.
        PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
        return tra({ ok: true, tu_sua: true, lan: tuSua.da_sua + 1 });
      }
      if (tuSua && tuSua.het_luot) {
        ghi_(sh, r._row, {anh_kt: gc.anh_kt, anh_bia: gc.anh_bia}, r.id);
        boDeKhongDat_(sh, r, tuSua.cung.map(function (x) { return x.loai; }).join(', '), 'video', String(d.file_id));
        return tra({ok: true, het_luot: true});
      }
      if (matThanChan) {
        var kqMT = {};
        try { kqMT = JSON.parse(String(r.link_dang || '{}')) || {}; } catch (eMT) { kqMT = {}; }
        kqMT._mat_than_chan = String(d.file_id); kqMT._mat_than_luc = Date.now();
        gc.link_dang = JSON.stringify(kqMT);
      }
      ghi_(sh, r._row, gc);
      r.file_video = String(d.file_id); r.anh_kt = d.anh_kt || ''; r.anh_bia = d.anh_bia || '';
      if (matThanChan) {
        nhatKy_('MAT_THAN', r.id + ': chặn đăng - ' + String(d.mat_than.ly_do || '').slice(0, 300));
        var dsLoiMT = (d.mat_than.loi || []).filter(function (x) { return x && x.nang !== false; }).slice(0, 6)
          .map(function (x) { return '• Ô ' + x.o + ' – ' + ({cat_chu: 'cắt chữ/tràn khung', chong_chu: 'chồng nhãn/chữ', latex_tho: 'mã LaTeX thô', lo_dap_an: 'lộ đáp án sớm'}[x.loai] || x.loai) + (x.mo_ta ? ': ' + x.mo_ta : ''); });
        var tinMT = '🛑 Mắt thần 3×3 CHẶN ĐĂNG video ' + r.id + (r.chu_de ? ' (' + r.chu_de + ')' : '') + ':\n' + dsLoiMT.join('\n') +
          (tuSua && tuSua.het_luot ? '\n🔧 Đã tự sửa ' + tuSua.da_sua + '/' + TRAN_TU_SUA_ + ' lần mà vẫn lỗi' + (function () { var g = docAiKT_(r).ghi_chu_sua_tu_dong; return g && g.length ? ' (lần cuối sửa: ' + [].concat(g).join('; ').slice(0, 200) + ')' : ''; })() + ' -> dừng tự sửa.' :
            tuSua && !tuSua.cung.length ? '\n(Lỗi không do kịch bản / chỉ cảnh báo nhẹ -> không tự dựng lại để tiết kiệm quota.)' : '') +
          '\nVideo: https://drive.google.com/file/d/' + d.file_id + '/view' +
          '\nXem kỹ rồi /duyet ' + r.id + ' (vẫn cho đăng) hoặc /sua ' + r.id + ' <góp ý> để dựng lại.';
        var cMT = CacheService.getScriptCache();
        if (!cMT.get('ZALO_MT_' + r.id + '_' + d.file_id)) {
          cMT.put('ZALO_MT_' + r.id + '_' + d.file_id, '1', 21600);
          if (typeof guiAnhZalo_ === 'function') guiAnhZalo_(d.anh_3x3, tinMT, laUuTien_(r) && r.zalo_chat ? r.zalo_chat : '');
          else guiZalo_(tinMT, 'cao');
        }
      }
      // Cửa 3 gộp (Mắt thần 3×3 + AI hậu kiểm 1 lần duy nhất): nếu Cửa 3 đã chấm đủ tiêu chí & đạt -> chuyển thẳng CHO_DANG, KHÔNG gọi BP4 lần 2!
      var hauKiemCua3 = d.ai_hau_kiem && d.ai_hau_kiem.chi_tiet ? d.ai_hau_kiem
        : (d.mat_than && d.mat_than.hau_kiem && d.mat_than.hau_kiem.chi_tiet ? d.mat_than.hau_kiem : null);
      if (!matThanChan && !lyDoCho && hauKiemCua3 && typeof apDungKetQuaAiXem_ === 'function') {
        nhatKy_('DUNG_VIDEO', r.id + ' -> xong, file ' + d.file_id);
        apDungKetQuaAiXem_(sh, r, hauKiemCua3);
        PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
        return tra({ ok: true, cua_3_da_cham: true, phan_tram: hauKiemCua3.phan_tram, dat: !!hauKiemCua3.dat });
      }
      var aiXem = !matThanChan && !lyDoCho && !!d.anh_kt;
      if (aiXem) ghi_(sh, r._row, {trang_thai: 'CHO_KIEM_DUYET', duyet: 'CHO_AI'}, r.id);
      nhatKy_('DUNG_VIDEO', r.id + ' -> xong, file ' + d.file_id);
      var tinVideo = '🎞 Video đã dựng xong: ' + (r.chu_de || r.id) + (d.giay ? ' (' + d.giay + ' giây)' : '') +
        '\nhttps://drive.google.com/file/d/' + d.file_id + '/view' +
        (lyDoCho ? '\n' + lyDoCho : '') + '\nChờ kiểm duyệt. /duyet ' + r.id + ' để cho đăng hoặc /sua ' + r.id + ' <góp ý> để dựng lại';
      if (aiXem) {
        nhatKy_('AI_XEM', r.id + ': video xong, AI đang tự kiểm tra yêu cầu trước khi xếp lịch đăng');
      } else if (matThanChan) {
        // đã báo Zalo kèm ảnh lưới ở trên
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
      thuLaiBoNao_(sh,r,3,d.loi || 'GitHub báo lỗi dựng',true);
    }
    // Đặt cờ để chayDonDep vẽ lại bảng DOC_DE / DOC_KICH_BAN ở nền thay vì giữ khóa 30-90 giây tại đây
    PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
    return tra({ ok: true });
  } finally {
    if (typeof _GIU_KHOA_ !== 'undefined' && _GIU_KHOA_ > 0) _GIU_KHOA_--;
    khoa.releaseLock();
  }
}

// Gửi Zalo tối đa MỘT lần cho mỗi khóa (nhớ trong 6 giờ) để không bao giờ báo lặp dù hàm bị gọi nhiều lần.
// Key Gemini LỖI THẬT (sai key, hết hiệu lực, bị khóa, chưa bật API) - KHÔNG phải hết hạn mức ngày (hết hạn mức thì hệ thống
// tự chuyển key và chờ, không làm phiền). ds: [{so, dau, ly_do}] - "so" là thứ tự key trong Secret GEMINI_KEYS.
function baoKeyHong_(ds) {
  var ngay = Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd');
  var pr = PropertiesService.getScriptProperties();
  var daBao = String(pr.getProperty('KEY_HONG_DA_BAO') || '').split(',').filter(function (x) { return x.indexOf(ngay + ':') === 0; });
  ds.slice(0, 10).forEach(function (k) {
    if (!k || !k.dau) return;
    var dau = String(k.dau).replace(/[^\w.-]/g, '').slice(0, 12);
    if (daBao.indexOf(ngay + ':' + dau) >= 0) return;   // hôm nay đã báo key này rồi
    daBao.push(ngay + ':' + dau);
    pr.setProperty('KEY_HONG_DA_BAO', daBao.join(','));
    guiZaloMotLan_('KEY_HONG_' + dau + '_' + ngay,
      '🔑 Key Gemini thứ ' + (k.so || '?') + ' trong GEMINI_KEYS (đầu "' + dau.split('_')[0] + '", cuối "' + (dau.split('_')[1] || '') + '") bị LỖI THẬT, không phải hết hạn mức:\n' +
      String(k.ly_do || '').slice(0, 160) + '\n' +
      'Hệ thống đã tự bỏ qua key này. Bạn gỡ nó khỏi GitHub > Settings > Secrets and variables > Actions > GEMINI_KEYS (và khỏi kho key Apps Script nếu có).', 'cao');
    nhatKy_('KEY_HONG', 'key thứ ' + (k.so || '?') + ' (' + dau + '): ' + String(k.ly_do || '').slice(0, 160));
  });
}

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

function xuLyFileVideo_(fileId, han) {
  fileId = idDriveVideo_(fileId);
  if (!fileId || cauHinh_('CACH_XU_LY_FILE') !== 'CHUYEN') return;
  try {
    kiemHanDonVideo_(han, 10000);
    var f = DriveApp.getFileById(fileId);
    var goc = thuMucKichBan_().getParents().next();
    var it = goc.getFoldersByName('da_xong');
    kiemHanDonVideo_(han, 5000);
    var dich = it.hasNext() ? it.next() : goc.createFolder('da_xong');
    kiemHanDonVideo_(han);
    f.moveTo(dich);
  } catch (e) { nhatKy_('LOI_DON_DEP', 'video ' + fileId + ': ' + e.message); }
}
