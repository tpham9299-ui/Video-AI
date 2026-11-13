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

var MAC_DINH_NC_ = { TU_KIEM_TRA_VIDEO: 'BAT', DIEM_HINH_TOI_THIEU: '7', THU_HOOK: 'BAT', SERIES: 'BAT', BAO_CAO_GIO: '21' };
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
  ScriptApp.getProjectTriggers().forEach(function (t) { if (['capNhatThongKe', 'baoCaoHangNgay'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  _bo_nho_cau_hinh_ = null;
  ScriptApp.newTrigger('capNhatThongKe').timeBased().atHour(6).everyDays(1).create();
  ScriptApp.newTrigger('baoCaoHangNgay').timeBased().atHour(Number(chNC_('BAO_CAO_GIO')) || 21).everyDays(1).create();
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

function xuLyAiXem_(sh, r) {
  var kq = null;
  try { kq = aiChamVideo_(r); } catch (e) {
    if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e.message))) throw e;
    nhatKy_('AI_XEM_LOI', r.id + ': ' + e.message);
  }
  var cu = {};
  try { cu = JSON.parse(String(r.ai_kiem_tra || '{}')); } catch (e3) {}
  var lan = Number(cu.lan_sua) || 0;
  var nguong = Number(chNC_('DIEM_HINH_TOI_THIEU')) || 7;
  if (!kq) { ghi_(sh, r._row, { duyet: 'CHO' }); guiDuyet_(r, '(AI chưa xem được video, bạn xem kỹ giúp)'); return; }
  var ghiAi = JSON.stringify({ diem: kq.diem, van_de: kq.van_de, lan_sua: lan, luc: new Date().toISOString() });
  nhatKy_('AI_XEM', r.id + ': ' + kq.diem + '/10' + (kq.van_de.length ? ' | ' + kq.van_de.join('; ').slice(0, 300) : ''));
  if (kq.diem >= nguong || lan >= 1) {
    ghi_(sh, r._row, { duyet: 'CHO', ai_kiem_tra: ghiAi });
    guiDuyet_(r, '🤖 AI đã xem: ' + kq.diem + '/10' + (kq.diem < nguong ? ' (đã tự sửa 1 lần nhưng vẫn chưa đạt, bạn xem kỹ giúp)' : '') +
      (kq.van_de.length ? '\nLưu ý: ' + kq.van_de.slice(0, 3).join('; ') : ''));
    return;
  }
  // chưa đạt: tự viết lại kịch bản theo nhận xét của AI rồi dựng lại (giống lệnh /sua)
  if (!r.file_kich_ban) { ghi_(sh, r._row, { duyet: 'CHO', ai_kiem_tra: ghiAi }); guiDuyet_(r, '🤖 AI chấm ' + kq.diem + '/10 nhưng không còn kịch bản để tự sửa.'); return; }
  var kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString());
  luuNhapKichBan_(r.id, kb);
  ghi_(sh, r._row, {
    trang_thai: 'DA_GIAI', duyet: '', uu_tien: 1, so_lan_loi: 0,
    gop_y: ('AI XEM VIDEO CHẤM ' + kq.diem + '/10. Vấn đề: ' + kq.van_de.join('; ') + '. Cách sửa: ' + kq.gop_y).slice(0, 1500),
    ai_kiem_tra: JSON.stringify({ diem: kq.diem, van_de: kq.van_de, lan_sua: lan + 1, luc: new Date().toISOString() }),
    ghi_chu: 'AI tự sửa hình (điểm ' + kq.diem + '/10)'
  });
  baoZaloDe_(r, '🤖 AI xem video ' + r.id + ' thấy hình chưa khớp đề (' + kq.diem + '/10): ' + kq.van_de.slice(0, 3).join('; ').slice(0, 300) + '\n🔧 Đang tự sửa kịch bản và dựng lại, xong sẽ gửi bạn duyệt.');
  henUuTien_(20);
}

// Gemini nhìn ảnh 4 khung hình (+ ảnh đề nếu có) và chấm mức khớp đề. Trả {diem, van_de[], gop_y}.
function aiChamVideo_(r) {
  var anhs = [];
  var kt = DriveApp.getFileById(String(r.anh_kt)).getBlob();
  anhs.push({ mime: 'image/jpeg', data: Utilities.base64Encode(kt.getBytes()) });
  var anhDe = typeof anhDeChoGemini_ === 'function' ? anhDeChoGemini_(r) : null;
  if (anhDe) anhs.push(anhDe);
  var kb = {};
  try { kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); } catch (e) {}
  var canh = (kb.canh || []);
  var moTa = canh.map(function (c, i) { return 'Cảnh ' + (i + 1) + ' (' + c.loai + '): ' + (c.tieu_de_canh || '') + ' | hình: ' + String((c.minh_hoa || {}).mo_ta || '').slice(0, 160); }).join('\n');
  var prompt = 'Bạn là người kiểm duyệt video dạy toán TikTok. ẢNH 1 là 4 khung hình ghép ngang của video: cảnh 1, cảnh 2, cảnh 3 và cảnh đáp án.' +
    (anhDe ? ' ẢNH 2 là ảnh chụp đề gốc.' : '') + '\nĐỀ BÀI: ' + r.de_bai + (r.mo_ta_hinh ? '\nMÔ TẢ HÌNH CỦA ĐỀ: ' + r.mo_ta_hinh : '') +
    '\nĐÁP ÁN ĐÚNG: ' + (r.dap_an_hien || r.dap_an) + '\nKỊCH BẢN DỰ ĐỊNH:\n' + moTa + '\n' +
    'Hãy chấm khắt khe (0-10) theo: (1) hình minh họa có thể hiện ĐÚNG đối tượng/hình dạng/quy luật của đề không (ví dụ đề bông tuyết Koch mà vẽ cái hộp là sai nặng, tối đa 3 điểm); ' +
    '(2) số liệu, nhãn trên hình có đúng đề không; (3) trình bày: chữ đè lên nhau, chữ bị cắt, khung trống không có gì, hình quá nhỏ/khó nhìn; (4) cảnh đáp án có hiện đúng đáp án không.\n' +
    'Trả JSON: {"diem":0-10,"van_de":["mỗi vấn đề một câu ngắn, nói rõ cảnh nào"],"gop_y":"chỉ dẫn sửa cụ thể theo từng cảnh để vẽ đúng đề (dùng hinh_tu_do nếu cần)"}';
  var j = goiGemini_(prompt, 0.1, { suyNghi: 'low', anhs: anhs });
  var diem = Math.max(0, Math.min(10, Number(j && j.diem)));
  if (!isFinite(diem)) throw new Error('AI không trả điểm');
  return { diem: diem, van_de: (Array.isArray(j.van_de) ? j.van_de : []).map(String).slice(0, 6), gop_y: String(j.gop_y || '').slice(0, 800) };
}

// Gửi tin xin duyệt (dùng chung cho mọi đường).
function guiDuyet_(r, ghiChu) {
  var tin = '🎞 Video đã dựng xong: ' + (r.chu_de || r.id) + '\nhttps://drive.google.com/file/d/' + r.file_video + '/view' + (ghiChu ? '\n' + ghiChu : '') +
    '\n👉 Xem rồi trả lời: /duyet ' + r.id + ' (cho đăng) | /sua ' + r.id + ' <góp ý> | /bo ' + r.id;
  if (r.zalo_chat) guiZaloToi_(r.zalo_chat, tin); else guiZaloMotLan_('DUYET_' + r.id + '_' + r.file_video, tin);
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

function xacDinhSeries_(r) {
  if (chNC_('SERIES').toUpperCase() === 'TAT') return null;
  var chu = (String(r.de_bai || '') + ' ' + String(r.chu_de || '') + ' ' + String(r.mo_ta_hinh || '')).toLowerCase();
  var ten = r.san_pham ? 'Toán đi chợ'
    : /koch|sierpinski|fractal|bông tuyết|lặp lại/.test(chu) ? 'Hình học kỳ diệu'
    : /lãi|tiết kiệm|gửi ngân hàng|trả góp|lợi nhuận|doanh thu|giá bán/.test(chu) ? 'Toán và tiền bạc'
    : /nhỏ nhất|lớn nhất|tốn ít|tiết kiệm nhất|tối ưu/.test(chu) ? 'Tối ưu đời thường'
    : /chiều cao|khoảng cách|thang|góc nâng|đo/.test(chu) ? 'Đo đạc thực tế'
    : String(r.mon).toUpperCase() === 'XAC_SUAT' ? 'Xác suất không như bạn nghĩ' : 'Toán quanh ta';
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

// Thêm video YouTube vào danh sách phát cùng tên series (tạo nếu chưa có).
function themVaoPlaylist_(kb, videoId) {
  if (!kb || !kb.series || typeof YouTube === 'undefined') return '';
  try {
    var p = PropertiesService.getScriptProperties();
    var khoa = 'PLAYLIST_' + kb.series.ten.replace(/\s+/g, '_');
    var pl = p.getProperty(khoa);
    if (!pl) {
      pl = YouTube.Playlists.insert({ snippet: { title: kb.series.ten, description: 'Series video dạy toán: ' + kb.series.ten }, status: { privacyStatus: 'public' } }, 'snippet,status').id;
      p.setProperty(khoa, pl);
    }
    YouTube.PlaylistItems.insert({ snippet: { playlistId: pl, resourceId: { kind: 'youtube#video', videoId: videoId } } }, 'snippet');
    return 'đã thêm vào danh sách phát "' + kb.series.ten + '"';
  } catch (e) { return 'chưa thêm được vào danh sách phát (' + String(e.message).slice(0, 80) + ')'; }
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
    '🤖 AI xem video: ' + dem('AI_XEM') + ' lần | tự sửa kịch bản: ' + dem('KICH_BAN_SUA') + ' | máy tự sửa lỗi vặt: ' + dem('KICH_BAN_TU_SUA') + '\n' +
    '📥 Hàng đợi: ' + tt(function (r) { return r.trang_thai === 'MOI'; }) + ' chờ giải, ' + tt(function (r) { return r.trang_thai === 'DA_GIAI'; }) + ' chờ kịch bản, ' +
    tt(function (r) { return r.trang_thai === 'CO_KICH_BAN' || r.trang_thai === 'DANG_DUNG'; }) + ' đang/chờ dựng, ' +
    tt(function (r) { return r.trang_thai === 'CO_VIDEO' && String(r.duyet) !== 'DA_DUYET'; }) + ' CHỜ BẠN DUYỆT, ' + tt(function (r) { return r.trang_thai === 'CO_VIDEO' && String(r.duyet) === 'DA_DUYET'; }) + ' đã duyệt chờ đăng\n' +
    '⚡ Gemini: ' + dem('QUA_TAI') + ' lần quá tải, ' + dem('HET_HAN_MUC') + ' lần hết hạn mức' + (nghi ? ' (đang tạm nghỉ)' : '') + '\n' +
    '🔑 Token GitHub: ' + tokenTin + '\n' +
    (loi.length ? '⚠️ ' + loi.length + ' lỗi hôm nay: ' + Object.keys(dongLoi).slice(0, 3).map(function (k) { return k + (dongLoi[k] > 1 ? ' (x' + dongLoi[k] + ')' : ''); }).join(' | ') + '\n' : '✨ Không có lỗi nào hôm nay\n') +
    (tk.length ? '🏆 Video nổi bật 7 ngày: ' + tk[0].chu_de + ' (' + tk[0].luot_xem + ' lượt xem' + (Number(tk[0].ty_le_xem) > 0 ? ', xem trung bình ' + tk[0].ty_le_xem + '%' : '') + ')' : '');
  guiZalo_(tin);
}
