/**
 * ============================================================
 * NÂNG CAO (dán thành tệp mới NangCao.gs): 6 tính năng
 *  1. AI TỰ XEM VIDEO trước khi gửi bạn duyệt: GitHub chụp 4 khung hình (cảnh 1-3 + đáp án) -> Gemini so với đề (và ảnh đề nếu có),
 *     chấm điểm 0-10. Dưới ngưỡng thì tự viết lại kịch bản theo nhận xét và dựng lại (tối đa 1 lần), rồi mới gửi bạn duyệt.
 *  2. SỐ LIỆU YOUTUBE: mỗi ngày lấy lượt xem, thích, bình luận (+ tỉ lệ xem trung bình nếu bật YouTube Analytics) vào sheet THONG_KE,
 *     rút ra kiểu mở đầu / độ dài / chủ đề nào giữ chân người xem tốt, đưa vào lời nhắc viết kịch bản.
 *  3. LUÂN PHIÊN KIỂU MỞ ĐẦU: mỗi video thử một kiểu hook; đủ số liệu thì 70% dùng kiểu tốt nhất, 30% thử kiểu ít dùng.
 *  4. ẢNH BÌA YOUTUBE: khung hình lúc câu móc hiện đầy đủ (cần kênh đã xác minh số điện thoại để đặt ảnh bìa qua API).
 *  5. SERIES: mỗi video thuộc một series theo chủ đề (Toán đi chợ, Hình học kỳ diệu, Tối ưu đời thường...), đánh số tập, nhắc tập trước,
 *     tự thêm vào danh sách phát YouTube cùng tên.
 *  6. BÁO CÁO HẰNG NGÀY qua Zalo: việc đã làm, lỗi, hàng đợi, Gemini, hạn token GitHub, video nổi bật.
 * CÀI ĐẶT: chạy caiDatNangCao() một lần. (Muốn có tỉ lệ xem: Dịch vụ + > YouTube Analytics API.)
 * Cấu hình (CAU_HINH): TU_KIEM_TRA_VIDEO BAT|TAT, DIEM_HINH_TOI_THIEU (7), THU_HOOK BAT|TAT, SERIES BAT|TAT, BAO_CAO_GIO (21)
 * ============================================================
 */

var MAC_DINH_NC_ = { TU_KIEM_TRA_VIDEO: 'BAT', DIEM_HINH_TOI_THIEU: '8', THU_HOOK: 'BAT', SERIES: 'BAT', BAO_CAO_GIO: '21', PLAYLIST_THEO: 'lop,lop_loai',
  HOC_EDIT: 'BAT', HOC_EDIT_GIO: '2', HOC_EDIT_SO_VIDEO: '3', HOC_EDIT_TU_KHOA: 'math shorts animation|giải toán shorts|motion graphics math|toán học thú vị shorts|3d math animation' };
function chNC_(k) { var v = cauHinh_(k); return v === undefined || v === null || String(v).trim() === '' ? MAC_DINH_NC_[k] : String(v).trim(); }
var TEN_THONG_KE = 'THONG_KE';
var COT_TK = ['id', 'video_yt', 'ngay_dang', 'luot_xem', 'thich', 'binh_luan', 'ty_le_xem', 'xem_tb_giay', 'hook_kieu', 'hook_chu', 'mon', 'chu_de', 'series', 'giay', 'cap_nhat'];

function caiDatNangCao() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  damBaoCot_(ss.getSheetByName(TEN_HANG_DOI));
  shThongKe_();
  var ch = ss.getSheetByName(TEN_CAU_HINH), co = {};
  ch.getDataRange().getValues().forEach(function (v) { co[v[0]] = true; });
  Object.keys(MAC_DINH_NC_).forEach(function (k) { if (!co[k]) ch.appendRow([k, MAC_DINH_NC_[k]]); });
  ScriptApp.getProjectTriggers().forEach(function (t) { if (['capNhatThongKe', 'baoCaoHangNgay', 'hocEditHangNgay'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  _bo_nho_cau_hinh_ = null;
  ScriptApp.newTrigger('capNhatThongKe').timeBased().atHour(6).everyDays(1).create();
  ScriptApp.newTrigger('baoCaoHangNgay').timeBased().atHour(Number(chNC_('BAO_CAO_GIO')) || 21).everyDays(1).create();
  ScriptApp.newTrigger('hocEditHangNgay').timeBased().atHour(Number(chNC_('HOC_EDIT_GIO')) || 2).everyDays(1).create();
  thuMucHocEdit_();
  Logger.log('Đã đặt trigger: capNhatThongKe (6 giờ sáng), baoCaoHangNgay (' + chNC_('BAO_CAO_GIO') + ' giờ). Múi giờ theo cài đặt dự án: ' + Session.getScriptTimeZone());
  Logger.log(typeof YouTubeAnalytics === 'undefined' ? 'ℹ️ Chưa bật YouTube Analytics API (Dịch vụ +) nên chỉ có lượt xem/thích/bình luận, chưa có tỉ lệ xem.' : '✅ Đã bật YouTube Analytics.');
}

/* ===================== 1. AI TỰ XEM VIDEO ===================== */

// Gọi từ doPost khi GitHub báo dựng xong và có ảnh kiểm tra: trả true nếu đã giao cho AI xem (chưa gửi bạn duyệt).
function giaoAiXemVideo_(sh, r, d) {
  if (chNC_('TU_KIEM_TRA_VIDEO').toUpperCase() === 'TAT' || !d.anh_kt) return false;
  ghi_(sh, r._row, { duyet: 'AI_XEM' });
  henKiemTraVideo_(15);
  return true;
}
function henKiemTraVideo_(giay) {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'chayKiemTraVideo') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('chayKiemTraVideo').timeBased().after(Math.max(10, giay) * 1000).create();
}

function chayKiemTraVideo() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'chayKiemTraVideo') ScriptApp.deleteTrigger(t); });
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(10000)) { henKiemTraVideo_(90); return; }
  var conViec = false;
  try {
    _bat_dau_chay_ = Date.now();
    _bo_nho_cau_hinh_ = null;
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var ds = docHang_(sh).filter(function (r) { return r.trang_thai === 'CO_VIDEO' && String(r.duyet) === 'AI_XEM'; });
    for (var i = 0; i < ds.length; i++) {
      if (!conDuGoiGemini_()) { conViec = true; break; }
      xuLyAiXem_(sh, ds[i]);
    }
  } catch (e) {
    nhatKy_('AI_XEM_LOI', String(e.message).slice(0, 300));
    conViec = true;
  } finally { khoa.releaseLock(); }
  if (conViec) henKiemTraVideo_(120);
  try { if (typeof sauUuTien_ === 'function') sauUuTien_(); } catch (e2) {}
}

// AI KIỂM DUYỆT video vừa dựng (bước cuối, sau kiểm duyệt bố cục tự động trên GitHub). Chỉ video ĐẠT mới được gửi bạn / đăng.
// Chưa đạt: tự viết lại kịch bản theo nhận xét rồi dựng lại, tối đa SO_LAN_TU_SUA_VIDEO lần (mặc định 2). Vẫn chưa đạt thì giữ lại
// (duyet = KHONG_DAT), không gửi, không đăng; báo bạn một tin ngắn kèm lý do (nhắn /xem <mã> nếu vẫn muốn xem).
function docAiKT_(r) { try { return JSON.parse(String(r.ai_kiem_tra || '{}')) || {}; } catch (e) { return {}; } }
function ghiAiKT_(sh, r, them, cot) {
  var o = docAiKT_(r);
  Object.keys(them).forEach(function (k) { o[k] = them[k]; });
  o.luc = new Date().toISOString();
  var f = cot || {};
  f.ai_kiem_tra = JSON.stringify(o).slice(0, 1800);
  ghi_(sh, r._row, f);
  r.ai_kiem_tra = f.ai_kiem_tra;
}
// gửi kịch bản về Bộ phận 1 viết lại theo góp ý (giống lệnh /sua), giữ bản cũ làm bản nháp để sửa đúng chỗ
function traVeSuaKichBan_(sh, r, gopY, ghiChu, them) {
  var kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString());
  luuNhapKichBan_(r.id, kb);
  ghiAiKT_(sh, r, them, { trang_thai: 'DA_GIAI', duyet: '', uu_tien: 1, so_lan_loi: 0, gop_y: String(gopY).slice(0, 1500), ghi_chu: String(ghiChu).slice(0, 200) });
  henUuTien_(20);
}

// GitHub báo KIỂM DUYỆT BỐ CỤC không đạt (đo trên khung hình thật: chữ tràn mép, chữ đè, TeX thô, công thức lỗi)
function xuLyKiemDuyetBoCuc_(sh, r, kd) {
  var nang = (kd && kd.nang) || [];
  var lan = (Number(docAiKT_(r).kd_lan) || 0) + 1;
  nhatKy_('KIEM_DUYET', r.id + ' lần ' + lan + ': ' + nang.length + ' lỗi bố cục | ' + nang.slice(0, 4).join(' | ').slice(0, 400));
  if (!r.file_kich_ban) { baoLoiDung_(sh, r, 'KIEM_DUYET: ' + nang.slice(0, 2).join('; ')); return { ok: true }; }
  traVeSuaKichBan_(sh, r,
    'KIỂM DUYỆT BỐ CỤC TỰ ĐỘNG (đo trên khung hình thật) KHÔNG ĐẠT, PHẢI SỬA HẾT: ' + nang.slice(0, 10).join(' || ') +
    '. Cách sửa chung: bớt vật/chữ trong cảnh bị lỗi, đặt các vật cách xa nhau (x, y), nhãn ngắn ≤ 22 ký tự, công thức LaTeX đúng cú pháp.',
    'Kiểm duyệt bố cục lần ' + lan + ' chưa đạt: tự sửa kịch bản', { kd_lan: lan, kd_loi: nang.slice(0, 5) });
  return { ok: true, sua: true };
}

function xuLyAiXem_(sh, r) {
  var kq = null;
  try { kq = aiChamVideo_(r); } catch (e) {
    if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e.message))) throw e;
    nhatKy_('AI_XEM_LOI', r.id + ': ' + e.message);
  }
  var cu = docAiKT_(r);
  var lan = Number(cu.lan_sua) || 0;
  var toiDa = Number(cauHinh_('SO_LAN_TU_SUA_VIDEO')) || 2;
  var nguong = Number(chNC_('DIEM_HINH_TOI_THIEU')) || 8;
  if (!kq) {
    // AI không chấm được (lỗi mạng/ảnh): video đã qua kiểm duyệt bố cục tự động, vẫn cho qua nhưng ghi rõ
    ghiAiKT_(sh, r, { diem: null }, { duyet: canDuyet_() ? 'CHO' : '' });
    if (canDuyet_()) guiDuyet_(r, '(Đã qua kiểm duyệt bố cục tự động; AI chưa chấm được hình, bạn xem kỹ giúp)');
    return;
  }
  nhatKy_('AI_XEM', r.id + ': ' + kq.diem + '/10' + (kq.van_de.length ? ' | ' + kq.van_de.join('; ').slice(0, 300) : ''));
  if (kq.diem >= nguong && !kq.loi_nang) {
    ghiAiKT_(sh, r, { diem: kq.diem, van_de: kq.van_de }, { duyet: canDuyet_() ? 'CHO' : '' });
    if (canDuyet_()) guiDuyet_(r, '✅ Đạt kiểm duyệt: ' + kq.diem + '/10' + (lan ? ' (đã tự sửa ' + lan + ' lần)' : ''));
    else guiZalo_('✅ Video ' + (r.chu_de || r.id) + ' đạt kiểm duyệt (' + kq.diem + '/10), xếp lịch đăng.', 'vua');
    return;
  }
  if (lan >= toiDa || !r.file_kich_ban) {
    ghiAiKT_(sh, r, { diem: kq.diem, van_de: kq.van_de }, { duyet: 'KHONG_DAT', ghi_chu: ('KHÔNG ĐẠT kiểm duyệt (' + kq.diem + '/10): ' + kq.van_de.join('; ')).slice(0, 300) });
    guiZalo_('⛔ Video "' + (r.chu_de || r.id) + '" chưa đạt kiểm duyệt sau ' + lan + ' lần tự sửa nên KHÔNG gửi, KHÔNG đăng (' + kq.diem + '/10).\n' +
      'Lý do: ' + kq.van_de.slice(0, 3).join('; ').slice(0, 300) + '\nVẫn muốn xem: /xem ' + r.id, 'cao', 'KHONG_DAT_' + r.id);
    return;
  }
  traVeSuaKichBan_(sh, r,
    'AI KIỂM DUYỆT VIDEO CHẤM ' + kq.diem + '/10 (cần ≥ ' + nguong + '). Vấn đề: ' + kq.van_de.join('; ') + '. Cách sửa: ' + kq.gop_y,
    'AI kiểm duyệt ' + kq.diem + '/10: tự sửa lần ' + (lan + 1), { diem: kq.diem, van_de: kq.van_de, lan_sua: lan + 1 });
  baoZaloDe_(r, '🤖 Kiểm duyệt video ' + r.id + ' chưa đạt (' + kq.diem + '/10): ' + kq.van_de.slice(0, 3).join('; ').slice(0, 300) + '\n🔧 Đang tự sửa và dựng lại.', 'thap');
}

// /xem <mã>: lấy link video bị giữ lại vì chưa đạt kiểm duyệt
function xemVideoKhongDat_(chu) {
  var id = String(chu || '').replace(/^\/xem\s*/i, '').trim();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var r = docHang_(sh).filter(function (x) { return x.id === id; })[0];
  if (!r || !r.file_video) return 'Không thấy video ' + id + '.';
  var o = docAiKT_(r);
  return '🎞 ' + (r.chu_de || r.id) + ' (' + (String(r.duyet) === 'KHONG_DAT' ? 'CHƯA ĐẠT kiểm duyệt' : 'trạng thái ' + (r.duyet || r.trang_thai)) + (o.diem !== undefined && o.diem !== null ? ', ' + o.diem + '/10' : '') + ')\nhttps://drive.google.com/file/d/' + r.file_video + '/view' +
    (o.van_de && o.van_de.length ? '\nVấn đề: ' + o.van_de.slice(0, 3).join('; ') : '') + '\nCho đăng: /duyet ' + r.id + ' | Sửa: /sua ' + r.id + ' <góp ý> | Bỏ: /bo ' + r.id;
}

// Gemini nhìn LƯỚI KHUNG HÌNH (mỗi phần của quy trình một khung) + ảnh đề nếu có, chấm theo TIÊU CHÍ CỦA BẠN.
// Trả {diem, van_de[], gop_y, loi_nang}. loi_nang = vi phạm tiêu chí bắt buộc (thiếu đề bài, chữ đè/tràn, TeX thô, đáp án sai).
function aiChamVideo_(r) {
  var anhs = [];
  var kt = DriveApp.getFileById(String(r.anh_kt)).getBlob();
  anhs.push({ mime: 'image/jpeg', data: Utilities.base64Encode(kt.getBytes()) });
  var anhDe = typeof anhDeChoGemini_ === 'function' ? anhDeChoGemini_(r) : null;
  if (anhDe) anhs.push(anhDe);
  var kb = {};
  try { kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); } catch (e) {}
  var canh = (kb.canh || []);
  var moTa = canh.map(function (c, i) { return 'Cảnh ' + (i + 1) + ' (' + c.loai + '): ' + (c.tieu_de_canh || '') + ' | hình: ' + String((c.minh_hoa || {}).mo_ta || '').slice(0, 140); }).join('\n');
  var prompt = 'Bạn là người KIỂM DUYỆT KHẮT KHE video dạy toán TikTok trước khi gửi cho chủ kênh. ẢNH 1 là lưới khung hình của video, theo thứ tự: ' +
    'đề bài, mô phỏng, lỗi sai, giải, đáp án, thử lại, chốt kiến thức (có thể thiếu vài khung).' + (anhDe ? ' ẢNH 2 là ảnh chụp đề gốc.' : '') +
    '\nĐỀ BÀI: ' + r.de_bai + (r.mo_ta_hinh ? '\nMÔ TẢ HÌNH CỦA ĐỀ: ' + r.mo_ta_hinh : '') + '\nĐÁP ÁN ĐÚNG: ' + (r.dap_an_hien || r.dap_an) + '\nKỊCH BẢN:\n' + moTa + '\n' +
    'TIÊU CHÍ BẮT BUỘC của chủ kênh (vi phạm bất kỳ điều nào = loi_nang true, tối đa 5 điểm):\n' +
    '(1) Khung đầu phải nêu RÕ ĐỀ BÀI: đề cho gì, dữ kiện, cần tìm gì (thẻ ĐỀ CHO / CẦN TÌM đọc được); không được nhảy thẳng vào mô phỏng.\n' +
    '(2) Không có chữ đè lên chữ, không có chữ tràn/bị cắt ở mép màn hình, không có chữ quá nhỏ khó đọc trên điện thoại.\n' +
    '(3) Không có mã LaTeX thô (\\frac, ^{}, $...$, dấu gạch chéo) hiện trên màn hình; công thức phải hiện đẹp.\n' +
    '(4) Hình minh họa đúng đối tượng/hình dạng/số liệu của đề (vẽ vật khác đề là sai nặng); đáp án hiện đúng ' + (r.dap_an_hien || r.dap_an) + '.\n' +
    'TIÊU CHÍ CHẤT LƯỢNG (trừ điểm): hình hấp dẫn, có chiều sâu, không trống trải; bố cục cân đối; màu sắc thống nhất; đủ 6 phần đúng thứ tự.\n' +
    'Trả JSON: {"diem":0-10,"loi_nang":true|false,"van_de":["mỗi vấn đề một câu ngắn, nói rõ khung/cảnh nào"],"gop_y":"chỉ dẫn sửa cụ thể theo từng cảnh của kịch bản"}';
  var j = goiGemini_(prompt, 0.1, { suyNghi: 'low', anhs: anhs });
  var diem = Math.max(0, Math.min(10, Number(j && j.diem)));
  if (!isFinite(diem)) throw new Error('AI không trả điểm');
  return { diem: diem, loi_nang: j.loi_nang === true, van_de: (Array.isArray(j.van_de) ? j.van_de : []).map(String).slice(0, 6), gop_y: String(j.gop_y || '').slice(0, 800) };
}

// Gửi tin xin duyệt (dùng chung cho mọi đường).
function guiDuyet_(r, ghiChu) {
  var tin = '🎞 Video đã dựng xong: ' + (r.chu_de || r.id) + '\nhttps://drive.google.com/file/d/' + r.file_video + '/view' + (ghiChu ? '\n' + ghiChu : '') +
    '\n👉 Xem rồi trả lời: /duyet ' + r.id + ' (cho đăng) | /sua ' + r.id + ' <góp ý> | /bo ' + r.id;
  if (r.zalo_chat) guiZaloToi_(r.zalo_chat, tin); else guiZaloMotLan_('DUYET_' + r.id + '_' + r.file_video, tin, 'cao');
}

/* ===================== 2. SỐ LIỆU YOUTUBE ===================== */

function shThongKe_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_THONG_KE);
  if (!sh) { sh = ss.insertSheet(TEN_THONG_KE); sh.appendRow(COT_TK); sh.setFrozenRows(1); }
  return sh;
}
function docTK_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_THONG_KE);
  if (!sh) return [];
  var v = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) { var o = { _row: i + 1 }; for (var j = 0; j < COT_TK.length; j++) o[COT_TK[j]] = v[i][j]; if (o.id) out.push(o); }
  return out;
}

// Gọi khi đăng YouTube thành công: ghi một dòng thống kê kèm đặc điểm video (kiểu hook, chủ đề, series, độ dài).
function dangKyThongKe_(r, videoId) {
  try {
    var kb = {};
    try { kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); } catch (e) {}
    shThongKe_().appendRow([r.id, videoId, new Date(), '', '', '', '', '', kb.hook_kieu || '', String(kb.hook_chu || '').slice(0, 100), r.mon || kb.mon || '',
      String(r.chu_de || '').slice(0, 60), kb.series ? kb.series.ten + ' #' + kb.series.tap : '', kb.tong_giay || '', new Date()]);
  } catch (e2) { nhatKy_('THONG_KE_LOI', e2.message); }
}

function capNhatThongKe() {
  if (typeof YouTube === 'undefined') return;
  var sh = shThongKe_();
  var ds = docTK_().filter(function (r) { return r.video_yt && r.ngay_dang instanceof Date && Date.now() - r.ngay_dang.getTime() < 60 * 86400000; });
  for (var i = 0; i < ds.length; i += 50) {
    var nhom = ds.slice(i, i + 50);
    try {
      var res = YouTube.Videos.list('statistics', { id: nhom.map(function (r) { return r.video_yt; }).join(',') });
      (res.items || []).forEach(function (it) {
        var r = nhom.filter(function (x) { return x.video_yt === it.id; })[0];
        if (!r) return;
        var s = it.statistics || {};
        sh.getRange(r._row, COT_TK.indexOf('luot_xem') + 1, 1, 3).setValues([[Number(s.viewCount) || 0, Number(s.likeCount) || 0, Number(s.commentCount) || 0]]);
        sh.getRange(r._row, COT_TK.indexOf('cap_nhat') + 1).setValue(new Date());
      });
    } catch (e) { nhatKy_('THONG_KE_LOI', 'YouTube statistics: ' + e.message); }
  }
  if (typeof YouTubeAnalytics !== 'undefined' && ds.length) {
    try {
      var den = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
      var bq = YouTubeAnalytics.Reports.query({ ids: 'channel==MINE', startDate: '2024-01-01', endDate: den, metrics: 'views,averageViewDuration,averageViewPercentage', dimensions: 'video', filters: 'video==' + ds.slice(0, 200).map(function (r) { return r.video_yt; }).join(','), maxResults: 200 });
      (bq.rows || []).forEach(function (row) {
        var r = ds.filter(function (x) { return x.video_yt === row[0]; })[0];
        if (r) sh.getRange(r._row, COT_TK.indexOf('ty_le_xem') + 1, 1, 2).setValues([[Math.round(Number(row[3]) * 10) / 10, Number(row[2]) || 0]]);
      });
    } catch (e2) { nhatKy_('THONG_KE_LOI', 'YouTube Analytics: ' + e2.message); }
  }
}

// Điểm hiệu quả một video: tỉ lệ xem trung bình (nếu có), không thì lượt xem.
function diemTK_(r) { return Number(r.ty_le_xem) > 0 ? Number(r.ty_le_xem) : Number(r.luot_xem) || 0; }

// Bài học từ số liệu (đưa vào lời nhắc viết kịch bản); '' khi chưa đủ dữ liệu.
function goiYTuSoLieu_() {
  var ds = docTK_().filter(function (r) { return Number(r.luot_xem) > 0; });
  if (ds.length < 6) return '';
  var coTyLe = ds.filter(function (r) { return Number(r.ty_le_xem) > 0; }).length >= ds.length / 2;
  var donVi = coTyLe ? '% xem trung bình' : ' lượt xem trung bình';
  var nhom = function (fn) {
    var g = {};
    ds.forEach(function (r) { var k = fn(r); if (!k) return; (g[k] = g[k] || []).push(diemTK_(r)); });
    return Object.keys(g).filter(function (k) { return g[k].length >= 2; }).map(function (k) { return { k: k, tb: g[k].reduce(function (a, b) { return a + b; }, 0) / g[k].length, n: g[k].length }; })
      .sort(function (a, b) { return b.tb - a.tb; });
  };
  var dong = [];
  var hk = nhom(function (r) { return r.hook_kieu; });
  if (hk.length >= 2) dong.push('Kiểu mở đầu hiệu quả nhất: ' + hk[0].k + ' (' + Math.round(hk[0].tb) + donVi + ', ' + hk[0].n + ' video); kém nhất: ' + hk[hk.length - 1].k + '.');
  var dd = nhom(function (r) { var g = Number(r.giay) || 0; return !g ? '' : g < 60 ? 'dưới 60 giây' : g < 80 ? '60-80 giây' : g < 100 ? '80-100 giây' : 'trên 100 giây'; });
  if (dd.length >= 2) dong.push('Độ dài giữ chân tốt nhất: ' + dd[0].k + '.');
  var mn = nhom(function (r) { return r.mon; });
  if (mn.length >= 2) dong.push('Chủ đề được xem nhiều hơn: ' + mn[0].k + '.');
  var top = ds.slice().sort(function (a, b) { return diemTK_(b) - diemTK_(a); }).slice(0, 2).map(function (r) { return '"' + r.hook_chu + '"'; }).filter(function (x) { return x.length > 4; });
  if (top.length) dong.push('Các câu móc của video tốt nhất: ' + top.join(', ') + ' (học tinh thần, không chép).');
  return dong.length ? 'BÀI HỌC TỪ SỐ LIỆU XEM THẬT CỦA KÊNH (áp dụng nếu hợp với bài): ' + dong.join(' ') + '\n\n' : '';
}

/* ===================== 3. LUÂN PHIÊN KIỂU MỞ ĐẦU ===================== */

var KIEU_HOOK_NC_ = ['sai_lam', 'thach_thuc', 'bat_ngo', 'ket_qua_truoc', 'cau_hoi'];
function chonKieuHook_() {
  if (chNC_('THU_HOOK').toUpperCase() === 'TAT') return '';
  var ds = docTK_().filter(function (r) { return Number(r.luot_xem) > 0 && KIEU_HOOK_NC_.indexOf(r.hook_kieu) >= 0; });
  if (ds.length < 10) {
    var p = PropertiesService.getScriptProperties();
    var k = Number(p.getProperty('HOOK_KE') || 0);
    p.setProperty('HOOK_KE', String(k + 1));
    return KIEU_HOOK_NC_[k % KIEU_HOOK_NC_.length];
  }
  var tk = {};
  KIEU_HOOK_NC_.forEach(function (h) { tk[h] = { n: 0, tong: 0 }; });
  ds.forEach(function (r) { tk[r.hook_kieu].n++; tk[r.hook_kieu].tong += diemTK_(r); });
  if (Math.random() < 0.3) return KIEU_HOOK_NC_.slice().sort(function (a, b) { return tk[a].n - tk[b].n; })[0];   // thử kiểu ít dùng
  return KIEU_HOOK_NC_.filter(function (h) { return tk[h].n > 0; }).sort(function (a, b) { return tk[b].tong / tk[b].n - tk[a].tong / tk[a].n; })[0];
}

/* ===================== 5. SERIES ===================== */

// Phân loại đề -> tên series (cũng là cơ sở của "loại câu hỏi" trên ảnh bìa và danh sách phát).
function tenSeriesTheoDe_(r) {
  var chu = (String(r.de_bai || '') + ' ' + String(r.chu_de || '') + ' ' + String(r.mo_ta_hinh || '')).toLowerCase();
  if (String(r.mon).toUpperCase() === 'XAC_SUAT' && !r.san_pham) return 'Xác suất không như bạn nghĩ';
  return r.san_pham ? 'Toán đi chợ'
    : /koch|sierpinski|fractal|bông tuyết|lặp lại|hình vẽ|tam giác|đường tròn|hình vuông|đa giác|lục giác/.test(chu) ? 'Hình học kỳ diệu'
    : /lãi|tiết kiệm|gửi ngân hàng|trả góp|lợi nhuận|doanh thu|giá bán/.test(chu) ? 'Toán và tiền bạc'
    : /nhỏ nhất|lớn nhất|tốn ít|tiết kiệm nhất|tối ưu/.test(chu) ? 'Tối ưu đời thường'
    : /chiều cao|khoảng cách|thang|góc nâng|đo /.test(chu) ? 'Đo đạc thực tế' : 'Toán quanh ta';
}
var LOAI_THEO_SERIES_ = { 'Xác suất không như bạn nghĩ': 'Xác suất', 'Hình học kỳ diệu': 'Hình học', 'Toán và tiền bạc': 'Toán tiền bạc', 'Tối ưu đời thường': 'Tối ưu',
  'Đo đạc thực tế': 'Đo đạc', 'Toán đi chợ': 'Toán đi chợ', 'Toán quanh ta': 'Toán thực tế' };
// Loại câu hỏi (in trên ảnh bìa, dùng chia danh sách phát): Xác suất, Hình học, Tối ưu, Toán tiền bạc, Đo đạc, Toán đi chợ, Toán thực tế.
function phanLoaiCauHoi_(r) { return LOAI_THEO_SERIES_[tenSeriesTheoDe_(r)] || 'Toán thực tế'; }

function xacDinhSeries_(r) {
  if (chNC_('SERIES').toUpperCase() === 'TAT') return null;
  var ten = tenSeriesTheoDe_(r);
  var p = PropertiesService.getScriptProperties();
  var khoa = 'SERIES_' + ten.replace(/\s+/g, '_');
  var daCo = {};
  try { daCo = JSON.parse(p.getProperty(khoa) || '{}'); } catch (e) {}
  // cùng một đề (viết lại kịch bản) giữ nguyên số tập
  if (daCo.theo && daCo.theo[r.id]) return { ten: ten, tap: daCo.theo[r.id], truoc: daCo.truoc_cua && daCo.truoc_cua[r.id] || '' };
  var tap = (Number(daCo.tap) || 0) + 1;
  var truoc = daCo.cuoi || '';
  daCo.tap = tap;
  daCo.theo = daCo.theo || {};
  daCo.truoc_cua = daCo.truoc_cua || {};
  daCo.theo[r.id] = tap;
  daCo.truoc_cua[r.id] = truoc;
  var ids = Object.keys(daCo.theo);
  if (ids.length > 60) ids.slice(0, ids.length - 60).forEach(function (k) { delete daCo.theo[k]; delete daCo.truoc_cua[k]; });
  p.setProperty(khoa, JSON.stringify(daCo));
  return { ten: ten, tap: tap, truoc: truoc };
}
function ghiTapCuoiSeries_(se, tieuDe) {
  if (!se) return;
  var p = PropertiesService.getScriptProperties();
  var khoa = 'SERIES_' + se.ten.replace(/\s+/g, '_');
  var daCo = {};
  try { daCo = JSON.parse(p.getProperty(khoa) || '{}'); } catch (e) {}
  daCo.cuoi = String(tieuDe || '').slice(0, 80);
  p.setProperty(khoa, JSON.stringify(daCo));
}

// Các danh sách phát YouTube của một video theo CAU_HINH > PLAYLIST_THEO (mặc định "lop,lop_loai"):
//   lop      -> "Toán lớp 12"            lop_loai -> "Lớp 12 · Xác suất"            series -> tên series ("Hình học kỳ diệu")
function tenPlaylistCua_(lop, loai, series) {
  var ds = [];
  String(chNC_('PLAYLIST_THEO')).toLowerCase().split(/[,;\s]+/).forEach(function (k) {
    if (k === 'lop' && lop) ds.push({ ten: 'Toán lớp ' + lop, mo_ta: 'Video giải toán lớp ' + lop + ' ngắn gọn, dễ hiểu: xác suất, toán thực tế, hình học...' });
    if (k === 'lop_loai' && lop && loai) ds.push({ ten: 'Lớp ' + lop + ' · ' + loai, mo_ta: 'Toán lớp ' + lop + ', chủ đề ' + loai.toLowerCase() + ': giải nhanh, hiểu bản chất.' });
    if (k === 'series' && series) ds.push({ ten: series, mo_ta: 'Series video dạy toán: ' + series });
  });
  return ds;
}
function idPlaylist_(muc) {
  var p = PropertiesService.getScriptProperties();
  var khoa = 'PLAYLIST_' + muc.ten.replace(/[^\wÀ-ỹ]+/g, '_');
  var pl = p.getProperty(khoa);
  if (!pl) {
    pl = YouTube.Playlists.insert({ snippet: { title: muc.ten, description: muc.mo_ta, defaultLanguage: 'vi' }, status: { privacyStatus: 'public' } }, 'snippet,status').id;
    p.setProperty(khoa, pl);
  }
  return pl;
}
// Thêm video YouTube vào các danh sách phát (tạo danh sách nếu chưa có); không thêm trùng.
function themVaoPlaylist_(kb, videoId, r) {
  if (typeof YouTube === 'undefined' || !videoId) return '';
  var lop = String((r && r.lop) || (kb && kb.lop) || '').trim();
  var loai = (kb && kb.loai_cau_hoi) || (r ? phanLoaiCauHoi_(r) : '');
  var ds = tenPlaylistCua_(lop, loai, kb && kb.series ? kb.series.ten : '');
  var p = PropertiesService.getScriptProperties();
  var daThem = [], loi = [];
  ds.forEach(function (muc) {
    try {
      var pl = idPlaylist_(muc);
      var khoa = 'PLI_' + videoId + '_' + pl;
      if (p.getProperty(khoa)) return;
      YouTube.PlaylistItems.insert({ snippet: { playlistId: pl, resourceId: { kind: 'youtube#video', videoId: videoId } } }, 'snippet');
      p.setProperty(khoa, '1');
      daThem.push(muc.ten);
    } catch (e) { loi.push(muc.ten + ' (' + String(e.message).slice(0, 60) + ')'); }
  });
  return (daThem.length ? 'đã thêm vào danh sách phát: ' + daThem.join(', ') : '') + (loi.length ? (daThem.length ? '; ' : '') + 'chưa thêm được: ' + loi.join(', ') : '');
}

// Chạy tay một lần: xếp các video YouTube ĐÃ ĐĂNG trước đây vào danh sách phát theo lớp / loại câu hỏi.
function xepPlaylistVideoCu() {
  if (typeof YouTube === 'undefined') { Logger.log('Chưa bật dịch vụ YouTube Data API v3.'); return; }
  var hang = docHang_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI));
  var n = 0;
  hang.forEach(function (r) {
    var kq = {};
    try { kq = JSON.parse(String(r.link_dang || '{}')); } catch (e) {}
    var vid = kq.youtube && kq.youtube.ok && kq.youtube.id;
    if (!vid) return;
    var kb = {};
    try { kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); } catch (e2) {}
    var t = themVaoPlaylist_(kb, vid, r);
    if (t) { n++; Logger.log(r.id + ': ' + t); }
  });
  Logger.log('Xong: đã xử lý ' + n + ' video.');
}

/* ===================== 6. BÁO CÁO HẰNG NGÀY ===================== */

function baoCaoHangNgay() {
  _bo_nho_cau_hinh_ = null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var homNay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var nk = (ss.getSheetByName('NHAT_KY') ? ss.getSheetByName('NHAT_KY').getDataRange().getValues().slice(1) : [])
    .filter(function (v) { return v[0] instanceof Date && Utilities.formatDate(v[0], 'Asia/Ho_Chi_Minh', 'yyyyMMdd') === homNay; });
  var dem = function (muc, re) { return nk.filter(function (v) { return v[1] === muc && (!re || re.test(String(v[2]))); }).length; };
  var loi = nk.filter(function (v) { return /LOI/.test(String(v[1])); });
  var hang = docHang_(ss.getSheetByName(TEN_HANG_DOI));
  var tt = function (fn) { return hang.filter(fn).length; };
  var dongLoi = {};
  loi.forEach(function (v) { var k = String(v[1]) + ': ' + String(v[2]).replace(/^[A-Z]{2}\d{6}-\d{6}(-\d+)?:\s*/, '').slice(0, 70); dongLoi[k] = (dongLoi[k] || 0) + 1; });
  var tokenTin = '';
  try {
    var p = PropertiesService.getScriptProperties();
    var res = UrlFetchApp.fetch('https://api.github.com/repos/' + p.getProperty('GITHUB_REPO'), { headers: { Authorization: 'Bearer ' + p.getProperty('GITHUB_TOKEN') }, muteHttpExceptions: true });
    var han = typeof hanToken_ === 'function' ? hanToken_(res) : null;
    tokenTin = res.getResponseCode() === 401 ? '❌ HẾT HẠN' : han ? 'còn ' + Math.ceil((han.getTime() - Date.now()) / 86400000) + ' ngày' : 'không hết hạn';
  } catch (e) { tokenTin = 'không kiểm tra được'; }
  var tk = docTK_().filter(function (r) { return r.ngay_dang instanceof Date && Date.now() - r.ngay_dang.getTime() < 7 * 86400000 && Number(r.luot_xem) > 0; })
    .sort(function (a, b) { return diemTK_(b) - diemTK_(a); });
  var nghi = Number(PropertiesService.getScriptProperties().getProperty('NGHI_DEN') || 0) > Date.now();
  var tin = '📊 BÁO CÁO NGÀY ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM') + '\n' +
    '✅ Hôm nay: ' + dem('GIAI', /ĐẠT/) + ' đề giải đạt | ' + dem('KICH_BAN', /đã lưu file/) + ' kịch bản | ' + dem('DUNG_VIDEO', /xong/) + ' video dựng xong | ' + dem('DANG_VIDEO', /đạt [a-z]/) + ' lần đăng\n' +
    '🛡 Kiểm duyệt: ' + dem('KIEM_DUYET') + ' lần bố cục chưa đạt (đã tự sửa) | 🤖 AI chấm video: ' + dem('AI_XEM') + ' lần | tự sửa kịch bản: ' + dem('KICH_BAN_SUA') + ' | máy tự sửa lỗi vặt: ' + dem('KICH_BAN_TU_SUA') + '\n' +
    '📥 Hàng đợi: ' + tt(function (r) { return r.trang_thai === 'MOI'; }) + ' chờ giải, ' + tt(function (r) { return r.trang_thai === 'DA_GIAI'; }) + ' chờ kịch bản, ' +
    tt(function (r) { return r.trang_thai === 'CO_KICH_BAN' || r.trang_thai === 'DANG_DUNG'; }) + ' đang/chờ dựng, ' +
    tt(function (r) { return r.trang_thai === 'CO_VIDEO' && String(r.duyet) !== 'DA_DUYET'; }) + ' CHỜ BẠN DUYỆT, ' + tt(function (r) { return r.trang_thai === 'CO_VIDEO' && String(r.duyet) === 'KHONG_DAT'; }) + ' bị giữ vì chưa đạt kiểm duyệt (/xem <mã>), ' + tt(function (r) { return r.trang_thai === 'CO_VIDEO' && String(r.duyet) === 'DA_DUYET'; }) + ' đã duyệt chờ đăng\n' +
    '⚡ Gemini: ' + dem('QUA_TAI') + ' lần quá tải, ' + dem('HET_HAN_MUC') + ' lần hết hạn mức' + (nghi ? ' (đang tạm nghỉ)' : '') + '\n' +
    '🔑 Token GitHub: ' + tokenTin + '\n' +
    (loi.length ? '⚠️ ' + loi.length + ' lỗi hôm nay: ' + Object.keys(dongLoi).slice(0, 3).map(function (k) { return k + (dongLoi[k] > 1 ? ' (x' + dongLoi[k] + ')' : ''); }).join(' | ') + '\n' : '✨ Không có lỗi nào hôm nay\n') +
    (tk.length ? '🏆 Video nổi bật 7 ngày: ' + tk[0].chu_de + ' (' + tk[0].luot_xem + ' lượt xem' + (Number(tk[0].ty_le_xem) > 0 ? ', xem trung bình ' + tk[0].ty_le_xem + '%' : '') + ')' : '');
  guiZalo_(tin, 'cao', 'BAO_CAO_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd'));
}


/* ===================== TỰ HỌC CÁCH EDIT MỖI NGÀY (lần 24) ===================== */
// Mỗi ngày (trigger hocEditHangNgay, mặc định 2 giờ sáng) hệ thống XEM vài video ngắn rồi rút ra kỹ thuật edit, tích lũy vào
// sheet HOC_EDIT; các kỹ thuật hệ thống làm được được đưa vào lời nhắc viết kịch bản (áp dụng ngay cho video sau), kỹ thuật cần
// lập trình thêm được báo qua Zalo. Nguồn video:
//  1. Thư mục Drive <thư mục gốc>/hoc_edit: video bạn lưu từ TikTok (nút "Lưu video" trong TikTok) hoặc bất kỳ đâu -> hệ thống
//     tải lên Gemini để xem. (Hệ thống KHÔNG tự tải video từ TikTok vì điều khoản TikTok cấm tải tự động.)
//  2. Lệnh Zalo "/hoc <link YouTube>": thêm video YouTube vào hàng chờ học.
//  3. Tự tìm trên YouTube Shorts (YouTube Data API, theo HOC_EDIT_TU_KHOA): video ngắn nhiều lượt xem trong 7 ngày.
var TEN_HOC_EDIT = 'HOC_EDIT';
var COT_HE = ['ten', 'nhom', 'mo_ta', 'cach_ap_dung', 'kha_nang', 'diem', 'so_lan', 'nguon', 'lan_dau', 'lan_cuoi', 'ap_dung'];

function shHocEdit_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_HOC_EDIT);
  if (!sh) { sh = ss.insertSheet(TEN_HOC_EDIT); sh.appendRow(COT_HE); sh.setFrozenRows(1); }
  return sh;
}
function thuMucHocEdit_() {
  var goc = thuMucKichBan_().getParents().next();
  var it = goc.getFoldersByName('hoc_edit');
  return it.hasNext() ? it.next() : goc.createFolder('hoc_edit');
}

// Khả năng hiện có của bộ dựng (để Gemini quy kỹ thuật về cái làm được ngay)
var KHA_NANG_DUNG_ = 'Bộ dựng video toán của kênh hiện LÀM ĐƯỢC: chữ tiêu đề 3 tầng hiện từng ký tự (dòng dẫn nghiêng nhỏ / từ chốt cực lớn màu nhấn / dòng đuôi), ' +
  'chữ nổi khối 3D; máy quay đập zoom vào từ khóa, rung khi đóng dấu, lùi ra cuối bài; hình học nổi khối 3D đổi góc nhìn theo nhịp lời (6 góc: cheo_trai, tren_xuong, cheo_phai, thap_chinh_dien, cao_toan_canh, nghieng_nhe); ' +
  'vòng sóng lan ở nhãn, nét vẽ có đầu sao chổi, con dấu BẪY + gạch đỏ viết tay, cửa tròn chuyển cảnh, lóe sáng tia + vòng xung kích ở đáp án, số chạy, công thức biến hình, ' +
  'phụ đề từng từ có ô màu, đường tiến trình có chấm, chuyển cảnh (mo, truot_len, phong, luot_ngang, truot_xuong, lat_3d), nhạc theo tâm trạng cảnh, hiệu ứng âm thanh. ' +
  'Phần KỊCH BẢN điều khiển được: câu móc mở đầu, nhịp và độ dài cảnh, câu nối, cách đặt câu hỏi/bẫy, chọn chuyển cảnh, chọn góc nhìn 3D, chữ chốt của tiêu đề, cách kết bài.';

function hocEditHangNgay() {
  if (String(chNC_('HOC_EDIT')).toUpperCase() === 'TAT') return;
  var bat = Date.now();
  _bat_dau_chay_ = bat;
  _bo_nho_cau_hinh_ = null;
  var props = PropertiesService.getScriptProperties();
  var toiDa = Number(chNC_('HOC_EDIT_SO_VIDEO')) || 3;
  var ds = [];
  // 1) video bạn lưu vào Drive hoc_edit
  try {
    var it = thuMucHocEdit_().getFiles();
    while (it.hasNext() && ds.length < toiDa) {
      var f = it.next();
      if (!/^video\//.test(f.getMimeType()) || props.getProperty('HE_' + f.getId())) continue;
      if (f.getSize() > 45 * 1024 * 1024) { props.setProperty('HE_' + f.getId(), 'qua_lon'); continue; }
      ds.push({ loai: 'drive', id: f.getId(), ten: f.getName() });
    }
  } catch (e) { nhatKy_('HOC_EDIT', 'Không đọc được thư mục hoc_edit: ' + e.message); }
  // 2) link YouTube gửi qua Zalo
  var hang = [];
  try { hang = JSON.parse(props.getProperty('HOC_EDIT_HANG') || '[]'); } catch (e) {}
  while (hang.length && ds.length < toiDa) { var l = hang.shift(); if (!props.getProperty('HE_' + l.id)) ds.push(l); }
  props.setProperty('HOC_EDIT_HANG', JSON.stringify(hang.slice(0, 30)));
  // 3) tự tìm YouTube Shorts nổi bật tuần này
  if (ds.length < toiDa && typeof YouTube !== 'undefined') {
    var tuKhoa = String(chNC_('HOC_EDIT_TU_KHOA')).split('|').map(function (x) { return x.trim(); }).filter(Boolean);
    var q = tuKhoa[Math.floor(Date.now() / 86400000) % Math.max(1, tuKhoa.length)];
    try {
      var kq = YouTube.Search.list('snippet', { q: q, type: 'video', videoDuration: 'short', order: 'viewCount', maxResults: 15,
        publishedAfter: new Date(Date.now() - 7 * 86400000).toISOString(), relevanceLanguage: /[à-ỹ]/i.test(q) ? 'vi' : 'en' });
      (kq.items || []).forEach(function (x) {
        var id = x.id && x.id.videoId;
        if (id && ds.length < toiDa && !props.getProperty('HE_yt_' + id)) ds.push({ loai: 'youtube', id: 'yt_' + id, url: 'https://www.youtube.com/watch?v=' + id, ten: x.snippet.title });
      });
    } catch (e) { nhatKy_('HOC_EDIT', 'Tìm YouTube lỗi: ' + e.message); }
  }
  if (!ds.length) { nhatKy_('HOC_EDIT', 'Hôm nay không có video mới để học'); return; }
  var moi = [], canLapTrinh = [], soVideo = 0;
  for (var i = 0; i < ds.length; i++) {
    if (Date.now() - bat > 4.3 * 60 * 1000) break;
    try {
      var p = xemVideoHocEdit_(ds[i]);
      props.setProperty('HE_' + ds[i].id, new Date().toISOString().slice(0, 10));
      if (!p || !Array.isArray(p.ky_thuat)) continue;
      soVideo++;
      var r = ghiKyThuat_(p.ky_thuat, ds[i].ten || ds[i].url || ds[i].id);
      moi = moi.concat(r.moi);
      canLapTrinh = canLapTrinh.concat(r.canLapTrinh);
    } catch (e) {
      nhatKy_('HOC_EDIT', 'Không xem được ' + (ds[i].ten || ds[i].id) + ': ' + String(e.message).slice(0, 200));
      if (!/HET_GIO|QUA_TAI|HET_HAN_MUC/.test(String(e.message))) props.setProperty('HE_' + ds[i].id, 'loi');
    }
  }
  var tin = '🎓 Học edit hôm nay: xem ' + soVideo + ' video, ' + moi.length + ' kỹ thuật mới.';
  if (moi.length) tin += '\n✅ Áp dụng ngay vào kịch bản:\n' + moi.slice(0, 6).map(function (k) { return '• ' + k; }).join('\n');
  if (canLapTrinh.length) tin += '\n🛠 Cần lập trình thêm cho bộ dựng (nhờ Claude làm khi bạn muốn):\n' + canLapTrinh.slice(0, 5).map(function (k) { return '• ' + k; }).join('\n');
  nhatKy_('HOC_EDIT', tin.replace(/\n/g, ' | ').slice(0, 480));
  if (soVideo) guiZalo_(tin, canLapTrinh.length ? 'vua' : 'thap');
}

function loiNhacHocEdit_() {
  return 'Bạn là biên tập viên video ngắn (TikTok/Shorts) chuyên phân tích KỸ THUẬT EDIT. Xem video này và rút ra các kỹ thuật edit/thiết kế giúp video cuốn hút: ' +
    'mở đầu (3 giây đầu), nhịp cắt, chuyển cảnh, chuyển động máy quay/góc nhìn 3D, chữ động (kinetic typography), bố cục, màu, âm thanh/nhạc, cách giữ chân và kêu gọi tương tác. ' +
    'CHỈ học CÁCH LÀM (kỹ thuật), không chép nội dung, nhân vật, thương hiệu, nhạc có bản quyền.\n' + KHA_NANG_DUNG_ + '\n' +
    'Với mỗi kỹ thuật, cho biết cách áp dụng vào video GIẢI TOÁN của kênh và "kha_nang": "co_san" (bộ dựng đã làm được, chỉ cần kịch bản dùng đúng), "qua_kich_ban" (áp dụng được bằng cách viết kịch bản khác đi), ' +
    'hoặc "can_lap_trinh" (cần lập trình thêm hiệu ứng mới). "diem" 1-10 = mức đáng học cho video toán (rối mắt, chóng mặt, câu view rẻ tiền thì điểm thấp).\n' +
    'Trả JSON: {"tom_tat":"1 câu","ky_thuat":[{"ten":"tên ngắn 3-7 chữ","nhom":"mo_dau|nhip|chuyen_canh|may_quay|chu|bo_cuc|mau|am_thanh|tuong_tac","mo_ta":"làm thế nào, thấy ở giây nào","cach_ap_dung":"áp dụng vào video toán ra sao (1-2 câu cụ thể)","kha_nang":"co_san|qua_kich_ban|can_lap_trinh","diem":8}]} (tối đa 6 kỹ thuật, ưu tiên cái đáng học nhất).';
}

// Gemini xem video: YouTube dùng thẳng URL; video Drive tải lên Gemini Files API (cùng key cho tải lên và hỏi).
function xemVideoHocEdit_(v) {
  var key = khoDanhSachKey_()[0];
  if (!key) throw new Error('THIEU_GEMINI_API_KEY');
  var model = cauHinh_('MODEL_CHINH');
  var phan;
  if (v.loai === 'youtube') phan = [{ file_data: { file_uri: v.url, mime_type: 'video/mp4' } }];
  else {
    var blob = DriveApp.getFileById(v.id).getBlob();
    var up = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=media&key=' + encodeURIComponent(key), {
      method: 'post', contentType: blob.getContentType() || 'video/mp4', payload: blob.getBytes(), muteHttpExceptions: true });
    if (up.getResponseCode() !== 200) throw new Error('Tải video lên Gemini lỗi HTTP ' + up.getResponseCode() + ': ' + up.getContentText().slice(0, 150));
    var tep = JSON.parse(up.getContentText()).file;
    for (var k = 0; k < 20 && tep.state !== 'ACTIVE'; k++) {   // chờ Gemini xử lý video (tối đa ~100 giây)
      if (tep.state === 'FAILED') throw new Error('Gemini không xử lý được video');
      Utilities.sleep(5000);
      tep = JSON.parse(UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/' + tep.name + '?key=' + encodeURIComponent(key), { muteHttpExceptions: true }).getContentText());
    }
    if (tep.state !== 'ACTIVE') throw new Error('Gemini xử lý video quá lâu');
    phan = [{ file_data: { file_uri: tep.uri, mime_type: tep.mimeType || 'video/mp4' } }];
  }
  var body = { contents: [{ parts: phan.concat([{ text: loiNhacHocEdit_() }]) }], generationConfig: { temperature: 0.4, responseMimeType: 'application/json' } };
  var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Gemini HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 150));
  return docKetQua_(res.getContentText());
}

// Gộp kỹ thuật trùng tên (tích lũy số lần gặp); trả về danh sách kỹ thuật mới để báo cáo.
function ghiKyThuat_(ds, nguon) {
  var sh = shHocEdit_();
  var v = sh.getDataRange().getValues();
  var chiSo = {};
  for (var i = 1; i < v.length; i++) chiSo[String(v[i][0]).toLowerCase().trim()] = i + 1;
  var homNay = new Date();
  var moi = [], canLapTrinh = [];
  ds.slice(0, 6).forEach(function (k) {
    if (!k || !k.ten) return;
    var ten = String(k.ten).trim().slice(0, 60), khoa = ten.toLowerCase();
    var kn = /can_lap_trinh/.test(k.kha_nang) ? 'can_lap_trinh' : /qua_kich_ban/.test(k.kha_nang) ? 'qua_kich_ban' : 'co_san';
    var diem = Math.max(1, Math.min(10, Number(k.diem) || 5));
    if (chiSo[khoa]) {
      var r = chiSo[khoa];
      var cu = sh.getRange(r, 1, 1, COT_HE.length).getValues()[0];
      var soLan = (Number(cu[6]) || 1) + 1;
      var diemCu = Number(cu[5]) || diem;
      sh.getRange(r, 6, 1, 5).setValues([[Math.round((diemCu * (soLan - 1) + diem) / soLan * 10) / 10, soLan, String(nguon).slice(0, 80), cu[8] || homNay, homNay]]);
    } else {
      sh.appendRow([ten, String(k.nhom || ''), String(k.mo_ta || '').slice(0, 300), String(k.cach_ap_dung || '').slice(0, 300), kn, diem, 1, String(nguon).slice(0, 80), homNay, homNay, diem >= 6 && kn !== 'can_lap_trinh' ? 'BAT' : 'TAT']);
      chiSo[khoa] = sh.getLastRow();
      if (diem >= 6) (kn === 'can_lap_trinh' ? canLapTrinh : moi).push(ten + ': ' + String(k.cach_ap_dung || '').slice(0, 120));
    }
  });
  return { moi: moi, canLapTrinh: canLapTrinh };
}

// Khối "BÀI HỌC EDIT" đưa vào lời nhắc viết kịch bản: các kỹ thuật đang BẬT, điểm cao, gặp nhiều lần, ưu tiên mới học.
// Mỗi video chỉ áp 4 kỹ thuật, xoay vòng theo ngày để video không cái nào giống cái nào. Tắt một kỹ thuật: cột ap_dung = TAT.
function hocEditChoPrompt_() {
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HOC_EDIT);
    if (!sh || sh.getLastRow() < 2) return '';
    var ds = sh.getDataRange().getValues().slice(1).filter(function (x) { return String(x[10]).toUpperCase() === 'BAT' && x[4] !== 'can_lap_trinh'; })
      .map(function (x) {
        var ngay = x[9] instanceof Date ? (Date.now() - x[9].getTime()) / 86400000 : 30;
        return { ten: x[0], cach: x[3], diem: Number(x[5]) * (1 + Math.log(1 + Number(x[6]))) * (ngay < 7 ? 1.3 : 1) };
      }).sort(function (a, b) { return b.diem - a.diem; }).slice(0, 12);
    if (!ds.length) return '';
    var lech = Math.floor(Date.now() / 86400000) % ds.length;
    var chon = ds.slice(lech).concat(ds.slice(0, lech)).slice(0, 4);
    return 'BÀI HỌC EDIT HỆ THỐNG TỰ HỌC TỪ CÁC VIDEO NGẮN NỔI BẬT (áp dụng tự nhiên vào video này, không làm rối mắt, không phá các quy tắc ở trên):\n' +
      chon.map(function (k) { return '- ' + k.ten + ': ' + k.cach; }).join('\n') + '\n';
  } catch (e) { return ''; }
}

// Lệnh Zalo: /hoc <link YouTube> (TikTok: lưu video vào thư mục Drive hoc_edit)
function nhanLenhHoc_(chu) {
  var m = /(youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([A-Za-z0-9_-]{6,})/.exec(String(chu));
  if (!m) {
    if (/tiktok\.com/i.test(chu)) return '📥 Video TikTok: bạn bấm "Lưu video" trong TikTok rồi tải vào thư mục Drive "hoc_edit" (cạnh thư mục kịch bản). Mỗi đêm hệ thống tự xem và học (hệ thống không tự tải từ TikTok vì điều khoản TikTok không cho phép).';
    return 'Cách dùng: /hoc <link YouTube>. Video TikTok/Facebook: lưu về máy rồi tải vào thư mục Drive "hoc_edit".';
  }
  var props = PropertiesService.getScriptProperties();
  var hang = [];
  try { hang = JSON.parse(props.getProperty('HOC_EDIT_HANG') || '[]'); } catch (e) {}
  hang.push({ loai: 'youtube', id: 'yt_' + m[2], url: 'https://www.youtube.com/watch?v=' + m[2], ten: 'YouTube ' + m[2] });
  props.setProperty('HOC_EDIT_HANG', JSON.stringify(hang.slice(-30)));
  return '📚 Đã thêm vào hàng chờ học edit (' + hang.length + ' video). Hệ thống xem lúc ' + chNC_('HOC_EDIT_GIO') + ' giờ sáng và báo kết quả qua Zalo. Muốn học ngay: chạy hocEditHangNgay() trong Apps Script.';
}
