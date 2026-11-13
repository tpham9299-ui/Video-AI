/**
 * ============================================================
 * NHẬN ĐỀ QUA ZALO (dán thành tệp mới ZaloDeBai.gs, cùng dự án Apps Script với BoPhan1.gs và BoPhan2.gs)
 *
 * Bạn chụp ảnh một đề hay (hoặc gõ đề) gửi cho bot Zalo -> hệ thống ƯU TIÊN làm video cho đề đó NGAY:
 *   1. Bot nhận tin (webhook -> doPost trong BoPhan2.gs chuyển sang nhanZalo_), lưu một dòng CHO_DOC (uu_tien = 1) rồi trả lời ngay.
 *   2. Sau ~20 giây, trigger một lần chayUuTien() chạy: Gemini ĐỌC ẢNH -> giải 2 cách + kiểm chứng bằng máy -> viết kịch bản.
 *      Mỗi lần chạy tối đa ~5 phút; chưa xong thì tự hẹn chạy tiếp sau 1 phút.
 *   3. Có kịch bản là gửi sang GitHub dựng ngay (dựng song song nếu đang có video khác), xong thì gửi link video cho bạn.
 *   Trong lúc đó các đề thường TẠM DỪNG (không sinh đề, không giải, không gửi dựng); xong đề ưu tiên thì tự chạy tiếp.
 *   Mỗi giai đoạn bot đều nhắn cho bạn biết đang tới đâu.
 *
 * CÀI ĐẶT (một lần):
 *   a) Script Properties đã có ZALO_BOT_TOKEN, ZALO_CHAT_IDS (mã chat của bạn; gửi /id cho bot để biết mã).
 *      Bot đang dùng chung với hệ thống khác có webhook riêng? Tạo một bot Zalo khác cho việc nhận đề và đặt token vào ZALO_BOT_TOKEN_DE.
 *   b) Deploy > Manage deployments > Edit > Version: New version (để web app có hàm mới). Web app: Execute as Me, Who has access: Anyone.
 *   c) Chạy caiDatZalo() một lần: tự tạo ZALO_WEBHOOK_SECRET và đăng ký webhook với Zalo. Xem Nhật ký thực thi để biết kết quả.
 *   d) Gửi thử một ảnh đề cho bot.
 * Lệnh nhắn cho bot: /id (xem mã chat) | /tt (tình trạng đề ưu tiên) | /huy (hủy đề ưu tiên mới nhất chưa dựng) | /giup
 * ============================================================
 */

var ZALO_API_ = 'https://bot-api.zaloplatforms.com/bot';
// Cách 3 (nếu không thêm được dòng vào sheet CAU_HINH): dán địa chỉ /exec vào giữa hai dấu nháy dưới đây.
var WEB_APP_URL_DAN = '';

function tokenNhanZalo_() {
  var p = PropertiesService.getScriptProperties();
  return p.getProperty('ZALO_BOT_TOKEN_DE') || String(cauHinh_('ZALO_BOT_TOKEN_DE') || '').trim() || p.getProperty('ZALO_BOT_TOKEN');
}

/* ===================== CÀI ĐẶT WEBHOOK ===================== */

function caiDatZalo() { dangKyWebhookZalo_(false); }
// Chỉ dùng khi bạn chắc chắn muốn GHI ĐÈ webhook cũ của bot (hệ thống khác dùng chung bot sẽ không nhận được tin nữa).
function caiDatZaloGhiDe() { dangKyWebhookZalo_(true); }

function dangKyWebhookZalo_(ghiDe) {
  var p = PropertiesService.getScriptProperties();
  var token = tokenNhanZalo_();
  if (!token) throw new Error('Chưa có ZALO_BOT_TOKEN (hoặc ZALO_BOT_TOKEN_DE) trong Script Properties.');
  var bi = p.getProperty('ZALO_WEBHOOK_SECRET');
  if (!bi) { bi = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); p.setProperty('ZALO_WEBHOOK_SECRET', bi); }
  var goc = layUrlWebApp_();
  var url = goc + '?nguon=zalo&k=' + bi;

  var cu = goiZaloApi_(token, 'getWebhookInfo', {});
  var urlCu = cu && cu.result && cu.result.url ? String(cu.result.url) : '';
  if (urlCu && urlCu.split('?')[0] !== goc && !ghiDe) {
    Logger.log('⚠️ Bot này đang có webhook khác: ' + urlCu.split('?')[0] + '\nNếu đó là hệ thống khác dùng chung bot, hãy tạo bot Zalo riêng cho việc nhận đề, đặt token vào ZALO_BOT_TOKEN_DE rồi chạy lại caiDatZalo().\nNếu muốn ghi đè, chạy caiDatZaloGhiDe().');
    return;
  }
  var kq = goiZaloApi_(token, 'setWebhook', { url: url, secret_token: bi });
  Logger.log('setWebhook: ' + JSON.stringify(kq).slice(0, 300));
  var sau = goiZaloApi_(token, 'getWebhookInfo', {});
  Logger.log('getWebhookInfo: ' + JSON.stringify(sau).slice(0, 300).replace(bi, '***'));
  Logger.log(kq && kq.ok ? '✅ Đã đăng ký webhook. Gửi /id cho bot để kiểm tra, rồi gửi ảnh một đề toán.' : '❌ Zalo từ chối webhook, xem thông báo ở trên.');
}

// Địa chỉ web app dạng .../exec. Khi chạy từ trình soạn thảo, ScriptApp.getService().getUrl() thường trả địa chỉ thử
// nghiệm .../dev (Zalo không gọi được), nên ưu tiên địa chỉ bạn tự dán vào Script Property WEB_APP_URL
// (chính là địa chỉ đã dán vào GitHub Secret APPS_SCRIPT_URL).
function layUrlWebApp_() {
  var chuan = function (u) { return String(u || '').trim().split('?')[0].split('#')[0].replace(/\/+$/, ''); };
  // Lấy theo thứ tự: sheet CAU_HINH (dòng WEB_APP_URL) -> hằng WEB_APP_URL_DAN ở đầu tệp -> Script Property WEB_APP_URL
  var dsDan = [cauHinh_('WEB_APP_URL'), WEB_APP_URL_DAN, PropertiesService.getScriptProperties().getProperty('WEB_APP_URL')].map(chuan).filter(Boolean);
  for (var i = 0; i < dsDan.length; i++) if (/^https:\/\/script\.google\.com\/.+\/exec$/.test(dsDan[i])) return dsDan[i];
  var tuDan = dsDan[0] || '';
  var tuDong = '';
  try { tuDong = chuan(ScriptApp.getService().getUrl()); } catch (e) {}
  if (/\/exec$/.test(tuDong)) return tuDong;
  throw new Error('Chưa có địa chỉ web app dạng .../exec' + (tuDan ? ' (WEB_APP_URL hiện là "' + tuDan + '", không đúng dạng)' : '') +
    (/\/dev$/.test(tuDong) ? ' (Apps Script chỉ trả về địa chỉ thử nghiệm .../dev)' : '') +
    '. Cách sửa: Triển khai > Quản lý các lượt triển khai > chọn bản "Ứng dụng web" > sao chép URL kết thúc bằng /exec ' +
    '(giống GitHub Secret APPS_SCRIPT_URL) > mở sheet CAU_HINH, thêm một dòng: cột khoa = WEB_APP_URL, cột gia_tri = URL đó > chạy lại caiDatZalo.');
}

function goiZaloApi_(token, phuongThuc, than) {
  try {
    var res = UrlFetchApp.fetch(ZALO_API_ + token + '/' + phuongThuc, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify(than || {})
    });
    try { return JSON.parse(res.getContentText()); } catch (e) { return { ok: false, ma: res.getResponseCode(), raw: res.getContentText().slice(0, 200) }; }
  } catch (e2) { return { ok: false, loi: e2.message }; }
}

// Nhắn riêng cho một người (người đã gửi đề).
function guiZaloToi_(chatId, noiDung) {
  if (!chatId) return;
  var token = tokenNhanZalo_();
  if (!token) return;
  goiZaloApi_(token, 'sendMessage', { chat_id: String(chatId), text: ('[VIDEO] ' + noiDung).slice(0, 2000) });
}
// Báo tiến độ của một đề ưu tiên: nhắn cho người gửi; đề ưu tiên tự đánh dấu (không có người gửi) thì báo chung.
function baoZaloDe_(r, noiDung) {
  try {
    if (r && r.zalo_chat) guiZaloToi_(r.zalo_chat, noiDung);
    else guiZalo_(noiDung);
  } catch (e) { Logger.log('Lỗi báo Zalo: ' + e.message); }
}

/* ===================== NHẬN TIN (gọi từ doPost) ===================== */

function nhanZalo_(e) {
  var tra = ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  try {
    var p = PropertiesService.getScriptProperties();
    var bi = p.getProperty('ZALO_WEBHOOK_SECRET');
    if (!bi || String((e.parameter || {}).k || '') !== bi) return tra;   // không đúng mã bí mật: lặng lẽ bỏ qua
    var d = JSON.parse(e.postData.contents);
    var u = d && d.result ? d.result : d;
    var m = u && u.message;
    if (!m) return tra;
    var chat = String((m.chat && m.chat.id) || (m.from && m.from.id) || '');
    if (!chat) return tra;
    // Chống xử lý lặp: Zalo có thể gửi lại cùng một tin (Apps Script trả lời bằng chuyển hướng 302).
    var cache = CacheService.getScriptCache();
    var maTin = 'ZTIN_' + String(m.message_id || bam_(JSON.stringify(m)));
    if (cache.get(maTin)) return tra;
    cache.put(maTin, '1', 21600);

    var choPhep = String(p.getProperty('ZALO_CHAT_IDS') || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var chu = String(m.text || m.caption || '').trim();
    var anh = m.photo_url || m.photo || m.url || '';
    if (typeof anh !== 'string') anh = (anh && (anh.url || anh.photo_url)) || '';
    var lenh = chu.toLowerCase();

    if (/^\/(id|start)\b/.test(lenh)) { guiZaloToi_(chat, '🆔 Mã chat của bạn: ' + chat + (choPhep.indexOf(chat) >= 0 ? '\n✅ Bạn đã có quyền gửi đề.' : '\n➕ Thêm mã này vào ZALO_CHAT_IDS (Script Properties) để gửi đề.')); return tra; }
    if (choPhep.indexOf(chat) < 0) {
      if (!cache.get('ZLA_' + chat)) { cache.put('ZLA_' + chat, '1', 21600); guiZaloToi_(chat, 'Bạn chưa có quyền gửi đề cho hệ thống này. Mã chat của bạn: ' + chat); }
      return tra;
    }
    if (/^\/(giup|help)\b/.test(lenh)) { guiZaloToi_(chat, huongDanZalo_()); return tra; }
    if (/^\/(tt|trangthai|trạng thái)\b/.test(lenh) || lenh === 'tt') { guiZaloToi_(chat, tinhTrangUuTien_()); return tra; }
    if (/^\/huy\b/.test(lenh)) { guiZaloToi_(chat, huyUuTien_(chat)); return tra; }

    var laDeChu = !anh && chu.length >= 25 && /\d/.test(chu);
    if (!anh && !laDeChu) { guiZaloToi_(chat, huongDanZalo_()); return tra; }

    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var hang = docHang_(sh);
    var truoc = hang.filter(function (r) { return laUuTien_(r) && ['CHO_DOC', 'MOI', 'DA_GIAI', 'CO_KICH_BAN', 'DANG_DUNG'].indexOf(r.trang_thai) >= 0; }).length;
    var lop = (/lớp\s*(10|11|12)/i.exec(chu) || [])[1] || '';
    var id = 'ZL' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 90 + 10);
    themHang_(sh, {
      id: id, trang_thai: 'CHO_DOC', lop: lop, chu_de: 'Đề gửi qua Zalo', de_bai: chu, nguon: 'ZALO|' + String((m.from && m.from.display_name) || '').slice(0, 30),
      uu_tien: 1, zalo_chat: chat, file_anh: anh, so_lan_loi: 0, cap_nhat: new Date()
    });
    nhatKy_('ZALO_DE', id + ': nhận ' + (anh ? 'ảnh đề' : 'đề dạng chữ') + ' từ ' + chat);
    guiZaloToi_(chat, '📥 Đã nhận đề (' + id + ')! Hệ thống ƯU TIÊN làm video cho bài này ngay, các bài khác tạm dừng.\n' +
      'Các bước: đọc đề → giải 2 cách + kiểm chứng bằng máy → viết kịch bản → dựng video. Tổng thường 15-30 phút, mỗi bước mình sẽ nhắn bạn.' +
      (truoc ? '\n⏳ Trước bài này còn ' + truoc + ' đề ưu tiên đang làm.' : '') + '\nNhắn /tt để xem tiến độ.');
    henUuTien_(20);
  } catch (err) {
    try { nhatKy_('ZALO_LOI', String(err.message).slice(0, 300)); } catch (e2) {}
  }
  return tra;
}

function huongDanZalo_() {
  return '🤖 Gửi cho mình ẢNH CHỤP một đề toán (xác suất hoặc toán thực tế) hoặc GÕ đề, mình sẽ ưu tiên làm video hướng dẫn ngay.\n' +
    'Mẹo: chụp thẳng, rõ số; ảnh có nhiều câu thì ghi chú kèm ảnh, ví dụ "câu 3, lớp 12".\n' +
    'Lệnh: /tt tiến độ | /huy hủy đề vừa gửi | /id mã chat';
}

function tinhTrangUuTien_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var ds = docHang_(sh).filter(function (r) { return laUuTien_(r) && ['CHO_DOC', 'MOI', 'DA_GIAI', 'CO_KICH_BAN', 'DANG_DUNG'].indexOf(r.trang_thai) >= 0; });
  if (!ds.length) return '✅ Không còn đề ưu tiên nào đang làm. Hệ thống đang chạy các đề thường.';
  return '📋 Đề ưu tiên đang làm:\n' + ds.map(function (r) {
    return '• ' + r.id + ': ' + ((NHAN_TRANG_THAI[r.trang_thai] || [r.trang_thai])[0]) + (r.dap_an_hien || r.dap_an ? ' | đáp án ' + (r.dap_an_hien || r.dap_an) : '') +
      (r.ghi_chu && !/^DANG_/.test(String(r.ghi_chu)) ? ' | ' + String(r.ghi_chu).slice(0, 80) : '');
  }).join('\n');
}

function huyUuTien_(chat) {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(20000)) return '⏳ Hệ thống đang xử lý, thử /huy lại sau 1 phút nhé.';
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var ds = docHang_(sh).filter(function (r) { return laUuTien_(r) && String(r.zalo_chat) === String(chat) && TRANG_THAI_DANG_LAM_.concat(['CO_KICH_BAN']).indexOf(r.trang_thai) >= 0; });
    if (!ds.length) return 'Không có đề nào của bạn còn hủy được (đề đang dựng video thì không hủy được).';
    var r = ds[ds.length - 1];
    ghi_(sh, r._row, { trang_thai: 'LOAI', uu_tien: '', ghi_chu: 'Người gửi đã hủy qua Zalo' });
    return '🗑 Đã hủy đề ' + r.id + '. Hệ thống quay lại làm các đề khác.';
  } finally { khoa.releaseLock(); }
}

/* ===================== CHẠY ĐỀ ƯU TIÊN ===================== */

// Trigger một lần do nhanZalo_ / sauUuTien_ đặt. Toàn bộ việc nằm trong chayBoPhan1 (tự vào chế độ ưu tiên).
function chayUuTien() {
  xoaTriggerUuTien_();
  var kq = chayBoPhan1();
  if (kq === false) henUuTien_(90);          // đang có lần chạy khác giữ khóa: hẹn lại
  else if (kq !== 'UU_TIEN') sauUuTien_();   // bị tạm nghỉ hoặc không vào chế độ ưu tiên: vẫn kiểm tra việc dựng và hẹn lại
}

function xoaTriggerUuTien_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'chayUuTien') ScriptApp.deleteTrigger(t); });
}
function henUuTien_(giay) {
  xoaTriggerUuTien_();
  ScriptApp.newTrigger('chayUuTien').timeBased().after(Math.max(10, giay) * 1000).create();
}

// Sau mỗi lần chạy ưu tiên: kịch bản xong -> gửi dựng ngay; còn việc -> hẹn chạy tiếp.
function sauUuTien_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var hang = docHang_(sh);
  if (hang.some(function (r) { return laUuTien_(r) && r.trang_thai === 'CO_KICH_BAN'; }) && typeof chayBoPhan2 === 'function') {
    try { chayBoPhan2(); } catch (e) { nhatKy_('UU_TIEN_LOI', 'gửi dựng: ' + e.message); }
  }
  if (coDeUuTien_(hang)) {
    var nghiDen = Number(PropertiesService.getScriptProperties().getProperty('NGHI_DEN') || 0);
    var giay = nghiDen > Date.now() ? Math.ceil((nghiDen - Date.now()) / 1000) + 30 : 60;
    henUuTien_(giay);
  }
}

/* ===================== ĐỌC ĐỀ TỪ ẢNH / CHỮ ===================== */

function xuLyDocDe_(sh, bc, bat) {
  var ds = docHang_(sh).filter(function (r) { return r.trang_thai === 'CHO_DOC'; });
  for (var i = 0; i < ds.length; i++) {
    if (!duThoiGian_(bat, uocGoiMs_() + 20000)) { nhatKy_('DUNG_SOM', 'Không đủ thời gian đọc đề ưu tiên, để lần sau'); return; }
    var r = ds[i];
    if (!batDauViec_(sh, r, 'DOC_DE', bc)) { baoZaloDe_(r, '⚠️ Không đọc được đề ' + r.id + ' sau nhiều lần thử. Bạn gửi lại ảnh rõ hơn nhé.'); continue; }
    try {
      var j = docDe_(sh, r);
      if (!j || j.doc_duoc === false || !j.de_bai || String(j.de_bai).length < 15) {
        ghi_(sh, r._row, { trang_thai: 'LOAI', ghi_chu: 'KHONG_DOC_DUOC: ' + String((j && j.ly_do) || '').slice(0, 200) });
        baoZaloDe_(r, '🤔 Mình chưa đọc được đề này' + (j && j.ly_do ? ': ' + j.ly_do : '') + '.\nBạn chụp lại thẳng, đủ sáng, rõ số (hoặc gõ đề) rồi gửi lại nhé.');
        bc.loai++;
        continue;
      }
      var mon = String(j.mon || '').toUpperCase() === 'XAC_SUAT' ? 'XAC_SUAT' : 'THUC_TE';
      var lop = /^(10|11|12)$/.test(String(r.lop)) ? String(r.lop) : (/^(10|11|12)$/.test(String(j.lop)) ? String(j.lop) : '12');
      var b = bam_(j.de_bai);
      // Đề này đã có video rồi -> gửi lại link, khỏi làm lại
      var cu = docHang_(sh).filter(function (x) { return x.ma_bam === b && x.file_video && x.id !== r.id; })[0];
      if (cu) {
        ghi_(sh, r._row, { trang_thai: 'LOAI', uu_tien: '', ghi_chu: 'TRUNG_DE: đã có video ở ' + cu.id });
        baoZaloDe_(r, '🎞 Đề này đã có video rồi: https://drive.google.com/file/d/' + cu.file_video + '/view');
        continue;
      }
      ghi_(sh, r._row, {
        trang_thai: 'MOI', mon: mon, lop: lop, chu_de: String(j.chu_de || 'Đề gửi qua Zalo').slice(0, 60), de_bai: j.de_bai,
        diem_tu_duy: Number(j.diem_tu_duy) || '', yeu_to_tu_duy: j.yeu_to_tu_duy || '', bay_thuong_gap: j.bay_thuong_gap || '',
        ma_bam: b, so_lan_loi: 0, ghi_chu: ''
      });
      nhatKy_('DOC_DE', r.id + ' -> ' + mon + ' lớp ' + lop + ': ' + String(j.de_bai).slice(0, 120));
      baoZaloDe_(r, '📖 Đã đọc đề (' + (mon === 'XAC_SUAT' ? 'xác suất' : 'toán thực tế') + ', lớp ' + lop + (j.cau_da_chon ? ', ' + j.cau_da_chon : '') + '):\n' +
        latexDoc_(String(j.de_bai)).slice(0, 600) + (j.ghi_chu_doi ? '\n📝 ' + j.ghi_chu_doi : '') + '\n🧮 Đang giải bằng 2 cách và kiểm chứng bằng máy...');
    } catch (e) {
      xuLyLoiHang_(sh, r, e, bc);
      if (Number(r.so_lan_loi) >= Number(cauHinh_('MAX_LAN_LOI'))) baoZaloDe_(r, '⚠️ Đọc đề ' + r.id + ' bị lỗi: ' + String(e.message).slice(0, 150));
    }
  }
}

// Đọc đề bằng Gemini (nhìn ảnh nếu có). Ảnh tải về Drive ngay (link ảnh của Zalo có hạn dùng).
function docDe_(sh, r) {
  var anh = null;
  var f = String(r.file_anh || '');
  if (/^https?:\/\//i.test(f)) {
    var res = UrlFetchApp.fetch(f, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) throw new Error('TAI_ANH_LOI_' + res.getResponseCode());
    var blob = res.getBlob();
    var loai = String(blob.getContentType() || '');
    if (!/^image\//.test(loai)) blob.setContentType('image/jpeg');
    blob.setName(r.id + '.jpg');
    var tep = thuMucAnhDe_().createFile(blob);
    ghi_(sh, r._row, { file_anh: tep.getId() });
    r.file_anh = tep.getId();
    anh = blob;
  } else if (f) {
    anh = DriveApp.getFileById(f).getBlob();
  }
  if (anh && anh.getBytes().length > 15 * 1024 * 1024) throw new Error('ANH_QUA_LON');
  var ghiChu = String(r.de_bai || '').trim();
  var prompt = (anh ? 'Ảnh này là một đề Toán do học sinh/giáo viên Việt Nam gửi để làm VIDEO HƯỚNG DẪN GIẢI.\n' + (ghiChu ? 'Ghi chú của người gửi: "' + ghiChu + '"\n' : '')
                    : 'Đây là một đề Toán do người dùng gõ để làm VIDEO HƯỚNG DẪN GIẢI:\n"""' + ghiChu + '"""\n') +
    'NHIỆM VỤ: chép lại đề CHÍNH XÁC để giải và dựng video.\n' +
    '- Chép đầy đủ, đúng TỪNG con số và đơn vị; công thức viết LaTeX trong $...$ (trong JSON viết gạch chéo ngược kép, ví dụ \\\\frac). Có hình vẽ thì mô tả bằng chữ mọi dữ kiện trong hình (độ dài, góc, vị trí, điểm nào nối điểm nào).\n' +
    '- Ảnh có nhiều câu: lấy câu người gửi chỉ định; không có thì câu được khoanh/đánh dấu; không có nữa thì câu hay nhất có đáp số rõ ràng. Ghi vào "cau_da_chon" (ví dụ "Câu 3").\n' +
    '- Đề trắc nghiệm: bỏ phương án A, B, C, D, giữ dữ kiện và câu hỏi. Đề nhiều ý (a, b, c, d) hoặc đúng/sai: chọn MỘT ý có đáp số là một con số hoặc một phân số.\n' +
    '- Câu hỏi không có đáp số là một số (chứng minh, tìm tập nghiệm, nhiều đáp số): đổi thành câu hỏi tương đương có đáp số là MỘT số (ví dụ "tổng các nghiệm", "giá trị lớn nhất bằng bao nhiêu") và giải thích ngắn trong "ghi_chu_doi".\n' +
    '- "mon": "XAC_SUAT" nếu câu hỏi là tính MỘT xác suất (đáp án là phân số); mọi bài khác (toán thực tế, hình học, hàm số, đại số, lãi suất...) là "THUC_TE" (đáp số là một con số).\n' +
    '- "lop": lớp phù hợp nhất (10, 11 hoặc 12). "dang": mã dạng gần nhất trong: ' + DANG_DUNG_DUOC.XAC_SUAT.concat(DANG_DUNG_DUOC.THUC_TE).join(', ') + ' (không khớp thì ghi "khac").\n' +
    '- "doc_duoc": false nếu không phải đề toán hoặc ảnh mờ không chắc chắn các con số; ghi "ly_do" ngắn gọn bằng tiếng Việt.\n' +
    'Trả JSON: {"doc_duoc":true,"ly_do":"","mon":"","lop":"","dang":"","chu_de":"2-6 từ","de_bai":"","cau_da_chon":"","ghi_chu_doi":"","diem_tu_duy":1-10,"yeu_to_tu_duy":"vì sao cần suy nghĩ","bay_thuong_gap":"học sinh hay sai ở đâu"}';
  var opts = { suyNghi: 'mac_dinh' };
  if (anh) opts.anh = { mime: anh.getContentType() || 'image/jpeg', data: Utilities.base64Encode(anh.getBytes()) };
  var j = goiGemini_(prompt, 0.1, opts);
  if (Array.isArray(j)) j = j[0];
  return j;
}

function thuMucAnhDe_() {
  var goc = thuMucKichBan_().getParents().next();
  var it = goc.getFoldersByName('anh_de_zalo');
  return it.hasNext() ? it.next() : goc.createFolder('anh_de_zalo');
}

// Chạy tay để thử toàn bộ luồng ưu tiên mà không cần Zalo: thêm một đề chữ ưu tiên rồi chạy ngay.
function thuDeUuTien() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  themHang_(sh, {
    id: 'ZL' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss') + '-00', trang_thai: 'CHO_DOC', lop: '12', chu_de: 'Đề thử ưu tiên',
    de_bai: 'Một tấm tôn hình vuông cạnh 60 cm, người ta cắt ở bốn góc bốn hình vuông bằng nhau cạnh x cm rồi gấp lại thành cái hộp không nắp. Tìm x để thể tích hộp lớn nhất.',
    nguon: 'ZALO|thử', uu_tien: 1, so_lan_loi: 0, cap_nhat: new Date()
  });
  chayUuTien();
}
