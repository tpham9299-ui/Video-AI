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
 *   a) Script Properties đã có ZALO_BOT_TOKEN. Người được gửi đề: ZALO_CHAT_IDS hoặc dòng ZALO_NGUOI_GUI_DE trong sheet CAU_HINH
 *      (gửi /id cho bot để biết mã chat; mã chat là riêng cho từng bot).
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
    var res = thuLaiBroker_(function () {
      return UrlFetchApp.fetch(ZALO_API_ + token + '/' + phuongThuc, {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify(than || {})
      });
    }, 'goiZaloApi ' + phuongThuc);
    try { return JSON.parse(res.getContentText()); } catch (e) { return { ok: false, ma: res.getResponseCode(), raw: res.getContentText().slice(0, 200) }; }
  } catch (e2) { return { ok: false, loi: e2.message }; }
}

// Nhắn riêng cho một người (người đã gửi đề).
function guiZaloToi_(chatId, noiDung) {
  if (!chatId) return;
  var token = tokenNhanZalo_();
  if (!token) return;
  goiZaloApi_(token, 'sendMessage', { chat_id: String(chatId), text: String(noiDung).slice(0, 2000) });
}
// Báo về một đề ưu tiên: nhắn cho người gửi; đề ưu tiên tự đánh dấu (không có người gửi) thì báo chung.
// muc như guiZalo_: tiến độ ('thap') chỉ ghi nhật ký, trừ khi CAU_HINH ZALO_THONG_BAO = DAY_DU.
function baoZaloDe_(r, noiDung, muc) {
  try {
    if (!duocThongBao_(muc)) { nhatKy_('ZALO_AN', (r && r.id ? r.id + ': ' : '') + String(noiDung).replace(/\n/g, ' | ').slice(0, 300)); return; }
    if (r && r.zalo_chat) guiZaloToi_(r.zalo_chat, noiDung);
    else guiZalo_(noiDung, muc);
  } catch (e) { Logger.log('Lỗi báo Zalo: ' + e.message); }
}
// Người nhận thông báo chung = những người đã nhắn cho BOT ĐỀ BÀI và có quyền (mã chat riêng cho từng bot nên phải lấy
// đúng mã của bot này) + ZALO_NGUOI_GUI_DE. Chưa ai nhắn bot đề bài thì mới dùng ZALO_CHAT_IDS cũ.
function nhoNguoiNhan_(chat) {
  var p = PropertiesService.getScriptProperties();
  var ds = String(p.getProperty('ZALO_NHAN_TB') || '').split(',').filter(Boolean);
  if (ds.indexOf(chat) >= 0) return;
  ds.push(chat);
  p.setProperty('ZALO_NHAN_TB', ds.slice(-10).join(','));
}
function dsNhanThongBao_() {
  var p = PropertiesService.getScriptProperties();
  var ds = (String(p.getProperty('ZALO_NHAN_TB') || '') + ',' + String(cauHinh_('ZALO_NGUOI_GUI_DE') || '') + ',' + String(p.getProperty('ZALO_CHAT_IDS') || ''))
    .split(/[,;\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  return ds.filter(function (x, i) { return ds.indexOf(x) === i; });
}

/* ===================== NHẬN TIN (gọi từ doPost) ===================== */

function nhanZalo_(e, lanThu) {
  lanThu = Number(lanThu) || 0;   // v99.2b: > 0 = lần thử lại sau lỗi tạm "người môi giới" / broker
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
    if (!lanThu && cache.get(maTin)) return tra;
    cache.put(maTin, '1', 21600);
    if (lanThu && cache.get('ZXONG_' + maTin)) return tra;   // lần trước đã ghi đề xong, chỉ lỗi ở bước sau -> không thêm trùng

    var choPhep = dsNguoiGuiDe_();
    var chu = String(m.text || m.caption || '').trim();
    var anh = m.photo_url || m.photo || m.url || '';
    if (Array.isArray(anh)) anh = anh.length ? anh[anh.length - 1] : '';
    if (typeof anh !== 'string') anh = (anh && (anh.url || anh.photo_url)) || '';
    var lenh = chu.toLowerCase();

    if (/^\/(id|start)\b/.test(lenh)) { guiZaloToi_(chat, '🆔 Mã chat của bạn: ' + chat + (choPhep.indexOf(chat) >= 0 ? '\n✅ Bạn đã có quyền gửi đề.' : '\n➕ Để gửi đề: mở sheet CAU_HINH, dòng ZALO_NGUOI_GUI_DE, thêm mã này vào cột gia_tri (nhiều mã cách nhau dấu phẩy).')); return tra; }
    if (choPhep.indexOf(chat) < 0) {
      if (!cache.get('ZLA_' + chat)) { cache.put('ZLA_' + chat, '1', 21600); guiZaloToi_(chat, 'Bạn chưa có quyền gửi đề cho hệ thống này. Mã chat của bạn: ' + chat + '\nChủ hệ thống mở sheet CAU_HINH, thêm dòng khoa = ZALO_NGUOI_GUI_DE, gia_tri = ' + chat + ' (nhiều mã cách nhau dấu phẩy) rồi gửi lại đề.'); }
      return tra;
    }
    nhoNguoiNhan_(chat);   // thông báo chung của hệ thống sẽ gửi qua bot này cho bạn
    if (/^\/(giup|help)\b/.test(lenh)) { guiZaloToi_(chat, huongDanZalo_()); return tra; }
    if (/^\/(tt|trangthai|trạng thái)\b/.test(lenh) || lenh === 'tt') { guiZaloToi_(chat, tinhTrangUuTien_()); return tra; }
    if (/^\/(key|keys|khokey|kiemtrakey)\b/.test(lenh) && typeof thongTinKhoKeyZalo_ === 'function') { guiZaloToi_(chat, thongTinKhoKeyZalo_(true)); return tra; }
    if (/^\/huy\b/.test(lenh)) { guiZaloToi_(chat, huyUuTien_(chat)); return tra; }
    // lệnh (một hoặc NHIỀU dòng: /duyet /sua /bo /cho /sanpham /xacnhan /huysp...; "duyệt <mã>" không dấu gạch cũng hiểu) (SanPham.gs)
    if ((/^\//.test(lenh) || (typeof laTinLenh_ === 'function' && laTinLenh_(chu))) && typeof xuLyLenhZaloMoi_ === 'function' && xuLyLenhZaloMoi_(chat, chu, anh)) return tra;

    // trả lời câu hỏi "Vì sao bạn bỏ?" (trong 3 giờ sau khi /bo không kèm lý do) -> học lý do, không coi là đề mới (SanPham.gs)
    if (!anh && typeof traLoiLyDoBo_ === 'function') { var tlLD = traLoiLyDoBo_(chat, chu); if (tlLD) { guiZaloToi_(chat, tlLD); return tra; } }
    var laDeChu = !anh && chu.length >= 25 && /\d/.test(chu);
    if (!anh && !laDeChu) { guiZaloToi_(chat, huongDanZalo_()); return tra; }

    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var hang = docHang_(sh);
    var truoc = hang.filter(function (r) { return laUuTien_(r) && ['CHO_DOC', 'MOI', 'DA_GIAI', 'CO_KICH_BAN', 'DANG_DUNG'].indexOf(r.trang_thai) >= 0; }).length;
    var lop = (/lớp\s*(10|11|12)/i.exec(chu) || [])[1] || '';
    var id = 'ZL' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 90 + 10);
    // v96: thẻ chỉ đạo sân khấu "[chidao: dùng lưới Bayes]" -> tách khỏi đề, lưu cột chi_dao (SanKhau.gs ưu tiên tuyệt đối)
    var tdCd = typeof tachChiDao_ === 'function' ? tachChiDao_(chu) : {de: chu, chi_dao: ''};
    themHang_(sh, {
      id: id, trang_thai: 'CHO_DOC', lop: lop, chu_de: 'Đề gửi qua Zalo', de_bai: tdCd.de, nguon: 'ZALO|' + String((m.from && m.from.display_name) || '').slice(0, 30),
      uu_tien: 1, zalo_chat: chat, file_anh: anh, so_lan_loi: 0, cap_nhat: new Date(), chi_dao: tdCd.chi_dao
    });
    cache.put('ZXONG_' + maTin, '1', 21600);
    nhatKy_('ZALO_DE', id + ': nhận ' + (anh ? 'ảnh đề' : 'đề dạng chữ') + ' từ ' + chat);
    guiZaloToi_(chat, '📥 Đã nhận đề (' + id + ')! Hệ thống ƯU TIÊN làm video cho bài này ngay, các bài khác tạm dừng.\n' +
      'Các bước: đọc đề → giải 2 cách + kiểm chứng bằng máy → viết kịch bản → dựng video → KIỂM DUYỆT tự động. Thường 15-30 phút; mình chỉ nhắn khi video đã đạt kiểm duyệt (hoặc khi cần bạn giúp).' +
      (truoc ? '\n⏳ Trước bài này còn ' + truoc + ' đề ưu tiên đang làm.' : '') + '\nNhắn /tt để xem tiến độ.');
    henUuTien_(20);
  } catch (err) {
    // v99.2b: lỗi tạm "người môi giới" / broker -> nghỉ 2 giây, xử lý lại tin này (tối đa 2 lần) thay vì rớt lệnh
    if (laLoiBroker_(err) && lanThu < 2) {
      try { nhatKy_('ZALO_THU_LAI', 'nhận tin: lỗi tạm "' + String(err.message).slice(0, 80) + '" -> thử lại lần ' + (lanThu + 1) + '/2'); } catch (e3) {}
      Utilities.sleep(2000);
      return nhanZalo_(e, lanThu + 1);
    }
    try { nhatKy_('ZALO_LOI', String(err.message).slice(0, 300)); } catch (e2) {}
  }
  return tra;
}

// Ai được gửi đề: ZALO_CHAT_IDS (Script Properties) + dòng ZALO_NGUOI_GUI_DE trong sheet CAU_HINH.
// Lưu ý: mã chat là RIÊNG cho từng bot, nên nếu nhận đề bằng bot khác (ZALO_BOT_TOKEN_DE) thì mã sẽ khác mã cũ.
function dsNguoiGuiDe_() {
  var a = String(PropertiesService.getScriptProperties().getProperty('ZALO_CHAT_IDS') || '') + ',' + String(cauHinh_('ZALO_NGUOI_GUI_DE') || '');
  return a.split(/[,;\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);
}

function huongDanZalo_() {
  return '🤖 Gửi cho mình ẢNH CHỤP một đề toán (xác suất hoặc toán thực tế) hoặc GÕ đề, mình sẽ ưu tiên làm video hướng dẫn ngay.\n' +
    'Mẹo: chụp thẳng, rõ số; ảnh có nhiều câu thì ghi chú kèm ảnh, ví dụ "câu 3, lớp 12".\n' +
    'Lệnh: /tt tiến độ | /key kiểm tra số lượng key Gemini còn xài được | /huy hủy đề vừa gửi | /id mã chat | /token hạn token GitHub | /phongcach tỉ lệ duyệt theo phong cách\n' +
    'Hình học khó: /hinhhoc [phang|khonggian] [10|11|12] [chungminh|tinh] - sáng tác ngay một đề và làm video ưu tiên\n' +
    'Duyệt video: /cho xem video chờ duyệt | /duyet [mã] | /sua [mã] <góp ý> | /bo [mã] | /donvideoloi dọn MP4 đã chấm không đạt vào Thùng rác Drive\n' +
    'Duyệt HÀNG LOẠT: mỗi dòng một lệnh trong cùng một tin, hoặc /duyet <mã1> <mã2> <mã3>, hoặc /duyet tatca\n' +
    'Sản phẩm: /sanpham <tên hoặc link> | /xacnhan [mã] <giá bạn bán> | /huysp [mã]';
}

function tinhTrangUuTien_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  if (!sh) return '✅ Hàng đợi chưa có dữ liệu.';
  var ds = docHang_(sh).filter(function (r) { return laUuTien_(r) && ['CHO_DOC', 'MOI', 'DA_GIAI', 'CO_KICH_BAN', 'DANG_DUNG'].indexOf(r.trang_thai) >= 0; });
  if (!ds.length) return '✅ Không còn đề ưu tiên nào đang làm. Hệ thống đang chạy các đề thường.';
  return '📋 Đề ưu tiên đang làm:\n' + ds.map(function (r) {
    return '• ' + r.id + ': ' + ((NHAN_TRANG_THAI[r.trang_thai] || [r.trang_thai])[0]) + (r.dap_an_hien || r.dap_an ? ' | đáp án ' + (r.dap_an_hien || r.dap_an) : '') +
      (r.ghi_chu && !/^DANG_/.test(String(r.ghi_chu)) ? ' | ' + String(r.ghi_chu).slice(0, 80) : '');
  }).join('\n');
}

function huyUuTien_(chat) {
  var khoa = LockService.getScriptLock();
  var coKhoa = khoa.tryLock(4000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var ds = docHang_(sh).filter(function (r) { return laUuTien_(r) && String(r.zalo_chat) === String(chat) && TRANG_THAI_DANG_LAM_.concat(['GITHUB', 'CO_KICH_BAN', 'DANG_DUNG']).indexOf(r.trang_thai) >= 0; });
    if (!ds.length) return 'Không có đề nào của bạn còn hủy được.';
    var r = ds[ds.length - 1];
    try { CacheService.getScriptCache().put('DA_BO_' + r.id, '1', 21600); } catch (eC) {}
    ghi_(sh, r._row, { trang_thai: 'LOAI', uu_tien: '', ghi_chu: 'Người gửi đã hủy qua Zalo' });
    SpreadsheetApp.flush();
    return '🗑 Đã hủy đề ' + r.id + '. Hệ thống quay lại làm các đề khác.';
  } finally { if (coKhoa) { try { khoa.releaseLock(); } catch (eL) {} } }
}

/* ===================== CHẠY ĐỀ ƯU TIÊN ===================== */

// Trigger một lần do nhanZalo_ / sauUuTien_ đặt. Toàn bộ việc nằm trong chayBoPhan1 (tự vào chế độ ưu tiên).
function chayUuTien() {
  xoaTriggerUuTien_();
  henUuTien_(370);   // hẹn sẵn dự phòng nếu Apps Script bị ngắt ở 6 phút
  var kq = chayBoPhan1();
  if (kq === false) henUuTien_(90);          // đang có lần chạy khác giữ khóa: hẹn lại
  else {
    xoaTriggerUuTien_();
    if (kq !== 'UU_TIEN') sauUuTien_();      // kiểm tra việc dựng và hẹn lại nếu còn
  }
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
  if (coDeUuTien_(hang) || (typeof coViecSanPham_ === 'function' && coViecSanPham_())) {
    var nghiDen = Number(PropertiesService.getScriptProperties().getProperty('NGHI_DEN') || 0);
    var giay = nghiDen > Date.now() ? Math.ceil((nghiDen - Date.now()) / 1000) + 30 : 60;
    henUuTien_(giay);
  }
}

/* ===================== ĐỌC ĐỀ TỪ ẢNH / CHỮ ===================== */

function xuLyDocDe_(sh, bc, bat) {
  var ds = docHang_(sh).filter(function (r) { return r.trang_thai === 'CHO_DOC'; });
  for (var i = 0; i < ds.length; i++) {
    if (!duThoiGianViec_(bat, uocGoiMs_() + 20000)) { nhatKy_('DUNG_SOM', 'Không đủ thời gian đọc đề ưu tiên, để lần sau'); return; }
    var r = ds[i];
    // v99.2b: trần vòng gọi API đọc đề < 4 phút tính từ đầu lần chạy (Apps Script ngắt cứng ở 6 phút)
    if (Date.now() > Number(bat || Date.now()) + TRAN_DOC_DE_MS_) { nhatKy_('DUNG_SOM', 'Đọc đề: đã dùng ' + Math.round((Date.now() - bat) / 1000) + ' giây, để lần chạy sau'); return; }
    var ghiTruoc = String(r.ghi_chu || '');
    if (!batDauViec_(sh, r, 'DOC_DE', bc)) { baoZaloDe_(r, loiDocDeChoZalo_(r, ghiTruoc), 'cao'); continue; }
    try {
      var j = docDe_(sh, r, Number(bat || Date.now()) + TRAN_DOC_DE_MS_);
      if (!j || j.doc_duoc === false || !j.de_bai || String(j.de_bai).length < 15) {
        ghi_(sh, r._row, { trang_thai: 'LOAI', ghi_chu: 'KHONG_DOC_DUOC: ' + String((j && j.ly_do) || '').slice(0, 200) });
        baoZaloDe_(r, '🤔 Mình chưa đọc được đề này' + (j && j.ly_do ? ': ' + j.ly_do : '') + '.\nBạn chụp lại thẳng, đủ sáng, rõ số (hoặc gõ đề) rồi gửi lại nhé.', 'cao');
        bc.loai++;
        continue;
      }
      var mon = String(j.mon || '').toUpperCase() === 'XAC_SUAT' ? 'XAC_SUAT' : String(j.mon || '').toUpperCase() === 'HINH_HOC' && typeof giaiHinhHoc_ === 'function' ? 'HINH_HOC' : 'THUC_TE';
      // v86: AI hay xếp nhầm hình KHÔNG GIAN (chóp, lăng trụ...) vào THUC_TE -> luồng Blender. Đề hình thuần (có tên điểm, không vật đời sống) luôn là HINH_HOC.
      if (mon === 'THUC_TE' && typeof giaiHinhHoc_ === 'function' && typeof laDeHinhHocThuan_ === 'function' && laDeHinhHocThuan_(j.de_bai)) mon = 'HINH_HOC';
      var lop = /^(10|11|12)$/.test(String(r.lop)) ? String(r.lop) : (/^(10|11|12)$/.test(String(j.lop)) ? String(j.lop) : '12');
      var b = bam_(j.de_bai);
      // Đề này đã có video rồi -> gửi lại link, khỏi làm lại
      var cu = docHang_(sh).filter(function (x) { return x.ma_bam === b && x.file_video && x.id !== r.id; })[0];
      if (cu) {
        ghi_(sh, r._row, { trang_thai: 'LOAI', uu_tien: '', ghi_chu: 'TRUNG_DE: đã có video ở ' + cu.id });
        baoZaloDe_(r, '🎞 Đề này đã có video rồi: https://drive.google.com/file/d/' + cu.file_video + '/view', 'cao');
        continue;
      }
      ghi_(sh, r._row, {
        trang_thai: 'MOI', mon: mon, lop: lop, chu_de: String(j.chu_de || 'Đề gửi qua Zalo').slice(0, 60), de_bai: j.de_bai,
        diem_tu_duy: Number(j.diem_tu_duy) || '', yeu_to_tu_duy: j.yeu_to_tu_duy || '', bay_thuong_gap: j.bay_thuong_gap || '',
        mo_ta_hinh: String(j.mo_ta_hinh || '').slice(0, 1500),
        ma_bam: b, so_lan_loi: 0, ghi_chu: ''
      });
      nhatKy_('DOC_DE', r.id + ' -> ' + mon + ' lớp ' + lop + ': ' + String(j.de_bai).slice(0, 120));
      baoZaloDe_(r, '📖 Đã đọc đề (' + (mon === 'XAC_SUAT' ? 'xác suất' : mon === 'HINH_HOC' ? 'hình học' : 'toán thực tế') + ', lớp ' + lop + (j.cau_da_chon ? ', ' + j.cau_da_chon : '') + '):\n' +
        latexDoc_(String(j.de_bai)).slice(0, 600) + (j.ghi_chu_doi ? '\n📝 ' + j.ghi_chu_doi : '') + '\n🧮 Đang giải bằng 2 cách và kiểm chứng bằng máy...', 'thap');
    } catch (e) {
      var daLoiTruoc = Number(r.so_lan_loi) || 0;
      xuLyLoiHang_(sh, r, e, bc);
      if (daLoiTruoc >= Number(cauHinh_('MAX_LAN_LOI')) && !laUuTien_(r)) baoZaloDe_(r, '⚠️ Đọc đề ' + r.id + ' bị lỗi: ' + String(e.message).slice(0, 150), 'cao');
      if (/^QUA_THOI_GIAN_DOC_ANH/.test(String(e.message))) return;   // hết quỹ thời gian của lần chạy này
    }
  }
}

// Đọc đề bằng Gemini (nhìn ảnh nếu có). Ảnh tải về Drive ngay (link ảnh của Zalo có hạn dùng).
var TRAN_DOC_DE_MS_ = 210000;   // v99.2b: 3,5 phút cho cả vòng đọc đề (lần gọi cuối vẫn xong trước mốc ngắt 6 phút)
// v99.3: Danh sách ngắn 3–4 model chuyên đọc ảnh ổn định cho bước DOC_DE, loại trừ hẳn model không hỗ trợ ảnh (transcribe, tts...) và model 404/403 để không chạm trần 210 giây.
var MODEL_DOC_DE_UU_TIEN_ = ['gemini-3.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
var RE_MODEL_KHONG_DOC_ANH_ = /transcribe|tts|audio|speech|embedding|imagen|veo|aqa|bisheng|robotics|computer-use|learnlm|gemma|customtools|thinking/i;

function dsModelDocDe_() {
  var bo = null;
  try { bo = CacheService.getScriptCache(); } catch (e) {}
  var dsUngVien = MODEL_DOC_DE_UU_TIEN_.slice();
  if (typeof danhSachModel_ === 'function') {
    var tuDong = danhSachModel_('nhe') || [];
    for (var i = 0; i < tuDong.length; i++) {
      if (dsUngVien.indexOf(tuDong[i]) < 0) dsUngVien.push(tuDong[i]);
    }
  }
  var kq = [];
  for (var j = 0; j < dsUngVien.length; j++) {
    var m = String(dsUngVien[j] || '').trim();
    if (!m || RE_MODEL_KHONG_DOC_ANH_.test(m)) continue;
    if (typeof modelBiChan404_ === 'function' && modelBiChan404_(m)) continue;
    if (typeof model404HomNay_ === 'function' && model404HomNay_(m)) continue;
    if (typeof modelBiChan403_ === 'function' && modelBiChan403_(m)) continue;
    if (bo && bo.get('MODEL_HONG_' + m)) continue;
    kq.push(m);
    if (kq.length >= 4) break;
  }
  if (!kq.length) {
    for (var k = 0; k < MODEL_DOC_DE_UU_TIEN_.length && kq.length < 4; k++) {
      var mk = MODEL_DOC_DE_UU_TIEN_[k];
      if (!RE_MODEL_KHONG_DOC_ANH_.test(mk)) kq.push(mk);
    }
  }
  return kq.slice(0, 4);
}

// Lý do thật khi hết lượt đọc đề: quá thời gian / quá tải / hết hạn mức Gemini KHÔNG phải lỗi ảnh -> không bảo "gửi lại ảnh rõ hơn"
function loiDocDeChoZalo_(r, ghiTruoc) {
  var g = String(ghiTruoc || '');
  if (/^DANG_|QUA_THOI_GIAN|HET_GIO|hết thời gian|BI_NGAT/i.test(g)) return '⏱ Đề ' + r.id + ': Gemini đọc ảnh quá chậm nên lần chạy bị ngắt nhiều lần (không phải do ảnh). Hệ thống tạm dừng đề này; bạn gửi lại sau ít phút hoặc gõ đề bằng chữ nhé.';
  if (/QUA_TAI|quá tải|503|UNAVAILABLE/i.test(g)) return '⏳ Đề ' + r.id + ': Gemini đang quá tải (HTTP 503) nên chưa đọc được đề (không phải do ảnh). Bạn gửi lại sau ít phút nhé.';
  if (/HET_HAN_MUC|hạn mức|429/i.test(g)) return '⏳ Đề ' + r.id + ': kho key Gemini đã hết hạn mức nên chưa đọc được đề. Hệ thống sẽ làm khi có hạn mức mới.';
  if (/GEMINI_LOI|HTTP \d{3}|MODEL_TU_CHOI/i.test(g)) return '⚠️ Đề ' + r.id + ': lỗi gọi Gemini khi đọc đề (' + g.slice(0, 120) + '). Bạn gửi lại sau ít phút nhé.';
  return '⚠️ Không đọc được đề ' + r.id + ' sau nhiều lần thử' + (g ? ' (' + g.slice(0, 100) + ')' : '') + '. Bạn gửi lại ảnh rõ hơn hoặc gõ đề nhé.';
}

function docDe_(sh, r, hanChot) {
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
    '- Bài HÌNH HỌC PHẲNG có câu CHỨNG MINH (bằng nhau, vuông góc, song song, thẳng hàng, tứ giác nội tiếp...): GIỮ NGUYÊN câu chứng minh (một ý), "mon" = "HINH_HOC".\n' +
    '- Câu hỏi không có đáp số là một số (tìm tập nghiệm, nhiều đáp số...; trừ chứng minh hình học ở trên): đổi thành câu hỏi tương đương có đáp số là MỘT số (ví dụ "tổng các nghiệm", "giá trị lớn nhất bằng bao nhiêu") và giải thích ngắn trong "ghi_chu_doi".\n' +
    '- "mon": "XAC_SUAT" nếu câu hỏi là tính MỘT xác suất (đáp án là phân số); "HINH_HOC" nếu là bài hình học THUẦN TÚY, PHẲNG HOẶC KHÔNG GIAN (tam giác, đường tròn, hình chóp, lăng trụ, tứ diện, hình hộp...; tính độ dài/góc/diện tích/thể tích/khoảng cách hoặc chứng minh) và đề KHÔNG gắn với vật hay tình huống đời sống; mọi bài khác (toán thực tế, hàm số, đại số, lãi suất...) là "THUC_TE" (đáp số là một con số).\n' +
    '- "lop": lớp phù hợp nhất (10, 11 hoặc 12). "dang": mã dạng gần nhất trong: ' + DANG_DUNG_DUOC.XAC_SUAT.concat(DANG_DUNG_DUOC.THUC_TE).join(', ') + ' (không khớp thì ghi "khac").\n' +
    '- "doc_duoc": false nếu không phải đề toán hoặc ảnh mờ không chắc chắn các con số; ghi "ly_do" ngắn gọn bằng tiếng Việt.\n' +
       '- "mo_ta_hinh": nếu ảnh có HÌNH VẼ (hình học, sơ đồ, hình minh họa, chuỗi hình theo bước...) thì mô tả thật chi tiết để vẽ lại y hệt: hình gì, bao nhiêu hình, xếp thế nào, hình dạng từng hình (tam giác đều, ngôi sao sáu cánh, bông tuyết Koch...), màu, các điểm và nhãn số đo trên hình, hình sau biến đổi từ hình trước ra sao. Nếu hình có dấu ba chấm ("…", "⋮", "⋯") thì PHẢI ghi rõ nó thay cho cái gì (vd "⋮ ở giữa = các tầng 4 đến 18 bị lược, mỗi tầng hơn tầng trên 1 ống") chứ không ghi "có ba chấm". Tách rõ đâu là VẬT THẬT (cột cờ, tòa nhà, ngân hàng, cây, người quan sát, ống, mảnh đất...) và đâu là CHÚ THÍCH (nhãn, số đo, mũi tên, ngoặc); đề chỉ có chữ mà nói tới vật thật thì vẫn mô tả cảnh: vật gì, đứng ở đâu, nhìn từ đâu, số đo nằm ở đâu. Không có hình thì để "".\n' +
    'Trả JSON: {"doc_duoc":true,"ly_do":"","mon":"","lop":"","dang":"","chu_de":"2-6 từ","de_bai":"","mo_ta_hinh":"","cau_da_chon":"","ghi_chu_doi":"","diem_tu_duy":1-10,"yeu_to_tu_duy":"vì sao cần suy nghĩ","bay_thuong_gap":"học sinh hay sai ở đâu"}';
  // v99.3: đọc ảnh = khóa danh sách ngắn 3–4 model chuyên đọc ảnh ổn định (loại bỏ transcribe / model 404) + 1 vòng thử để không chạm trần 210 giây
  var opts = { suyNghi: 'mac_dinh', cheDo: 'nhe', models: dsModelDocDe_(), soVongThu: 1 };
  if (hanChot) opts.hanChotMs = hanChot;
  if (anh) opts.anh = { mime: anh.getContentType() || 'image/jpeg', data: Utilities.base64Encode(anh.getBytes()) };
  var j;
  try { j = goiGemini_(prompt, 0.1, opts); }
  catch (e) {
    if (String(e.message) === 'HET_GIO' && hanChot && Date.now() >= hanChot) throw new Error('QUA_THOI_GIAN_DOC_ANH: Gemini đọc ảnh quá ' + Math.round(TRAN_DOC_DE_MS_ / 1000) + ' giây');
    throw e;
  }
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
