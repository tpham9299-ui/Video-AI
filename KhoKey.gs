/* =====================================================================
   KHO KEY GEMINI DÙNG CHUNG (dán Y HỆT vào 3 project: A, điểm danh, video)
   - Project KHÔNG có KHO_URL / NH_URL trong Script Properties = KHO CHỦ (hệ thống A): giữ danh sách key + trạng thái.
   - Project CÓ KHO_URL (hoặc NH_URL) + KHO_SECRET (hoặc NH_SECRET) = MÁY KHÁCH: lấy key từ A, báo A khi key hết hạn mức.
   ===================================================================== */
var KHO_API_ = 'https://generativelanguage.googleapis.com/v1beta/models/';
var KHO_MODEL_CU_ = 'gemini-flash-latest';   // hạn mức của model này nằm ở khóa kd_ cũ của hệ thống A (giữ tương thích)

function khoProps_() { return PropertiesService.getScriptProperties(); }
function khoMd5_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(s), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function khoId_(k) { return khoMd5_(k).slice(0, 8); }   // giống keyId_ của hệ thống A
function khoNgayPT_() { return Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd'); }
function khoParse_(raw) {
  return String(raw || '').split(/[\s,;]+/).map(function (s) { return s.trim(); }).filter(Boolean)
    .filter(function (k, i, a) { return a.indexOf(k) === i; });
}
// Tên khóa lưu trạng thái "hết hạn mức ngày" của (key, model)
function khoTenKhoa_(id, tq) { return tq === KHO_MODEL_CU_ ? 'kd_' + id : 'kdm_' + id + '_' + tq; }

// v99.3: 404 = MODEL không tồn tại -> chỉ nhớ MODEL trong CacheService 6 giờ, KHÔNG đụng tới key (không "cháy key ảo").
function khoModelGoc_(tq) { return String(tq || '').replace(/\+.*$/, ''); }
var KHO_TTL_404_ = 21600, KHO_TTL_RPM_ = 75, KHO_TTL_RPD_ = 21600, KHO_TTL_BAD_ = 21600;
function kho404Model_(model) {
  try { return !!CacheService.getScriptCache().get('kho404m_' + khoModelGoc_(model)); } catch (e) { return false; }
}
function khoGhi404_(key, model) {   // giữ tham số key cho tương thích, KHÔNG dùng
  try { CacheService.getScriptCache().put('kho404m_' + khoModelGoc_(model), '1', KHO_TTL_404_); } catch (e) { /* bỏ qua */ }
}

// Kho key 2 tầng: tầng 1 = GEMINI_KEYS_GITHUB (ưu tiên), tầng 2 = kho cũ. Khử trùng, giữ ưu tiên tầng 1.
function khoKeyTang_() {
  var p = khoProps_(), gh = khoParse_(String(p.getProperty('GEMINI_KEYS_GITHUB') || '').replace(/[\r\n]+/g, ','));
  var cu = khoKeyCu_(), thay = {};
  gh.forEach(function (k) { thay[k] = 1; });
  return { gh: gh, gas: cu.filter(function (k) { return !thay[k]; }) };
}
// Nhãn an toàn để ghi log / Zalo: GH#1, GAS#2 (KHÔNG BAO GIỜ in nguyên key)
function khoNhan_(key) {
  var t = khoKeyTang_(), i = t.gh.indexOf(key);
  if (i >= 0) return 'GH#' + (i + 1);
  i = t.gas.indexOf(key);
  return i >= 0 ? 'GAS#' + (i + 1) : '…' + String(key || '').slice(-4);
}
function khoLog_(loai, key, msg) {
  try { if (typeof nhatKy_ === 'function') nhatKy_(loai, khoNhan_(key) + ': ' + msg); } catch (e) { /* bỏ qua */ }
}
function khoLa404_(code, raw) {
  return code === 404 || (code === 400 && /not found|not supported for generateContent|model .* does not exist|invalid model/i.test(String(raw || '')));
}

function khoUrl_() {
  var p = khoProps_();
  var url = (p.getProperty('KHO_URL') || p.getProperty('NH_URL') || '').trim();
  var secret = (p.getProperty('KHO_SECRET') || p.getProperty('NH_SECRET') || '').trim();
  return (url && secret) ? { url: url, secret: secret } : null;
}

// Danh sách key đang dùng: máy khách lấy bản sao từ A; kho chủ dùng GEMINI_API_KEY của chính nó
function khoDanhSachKey_() {
  var t = khoKeyTang_();
  return t.gh.concat(t.gas);
}
function khoKeyCu_() {
  var p = khoProps_();
  if (khoUrl_()) {
    var ban = khoParse_(p.getProperty('KHO_BAN_SAO'));
    if (!ban.length) {
      var cache = CacheService.getScriptCache();
      if (!cache.get('kho_thu')) { cache.put('kho_thu', '1', 300); khoDongBo_(); }   // không tải lại liên tục khi A đang không trả lời
      ban = khoParse_(p.getProperty('KHO_BAN_SAO'));
    }
    if (ban.length) return ban;
  }
  return khoParse_(p.getProperty('GEMINI_API_KEY') || p.getProperty('GEMINI_KEYS'));
}

// Xếp các key dùng được cho (hệ thống, model): dung = sẵn sàng, nghi = đang nghỉ ngắn vì giới hạn theo phút
function khoXep_(he, tq) {
  var all = khoProps_().getProperties(), homNay = khoNgayPT_();
  var tang = khoKeyTang_(), thuTu = [];
  // Tầng 1 (GitHub) luôn đứng trước tầng 2 (kho cũ); xoay vòng chỉ diễn ra TRONG từng tầng
  [tang.gh, tang.gas].forEach(function (ds) {
    var n = ds.length, bd = 0, buoc = 1;
    if (he === 'VIDEO') { bd = n - 1; buoc = -1; }
    else if (he === 'DIEMDANH') { bd = Math.floor(n / 2); }
    for (var i = 0; i < n; i++) thuTu.push(ds[(((bd + buoc * i) % n) + n) % n]);
  });
  var co404 = kho404Model_(tq);
  if (co404) return { dung: [], nghi: [], coHetNgay: false, co404: true, n429: 0, n403: 0 };   // model đã 404: không đụng tới key
  var cache = CacheService.getScriptCache();
  var tenCache = thuTu.map(function (k) { return 'kdn_' + khoId_(k) + '_' + tq; });
  var quyenCache = thuTu.map(function (k) { return 'kdb_' + khoId_(k) + '_' + tq; });
  var ngayCache = thuTu.map(function (k) { return 'kdd_' + khoId_(k) + '_' + tq; });
  var badCache = thuTu.map(function (k) { return 'kdx_' + khoId_(k); });
  var nghiMap = {};
  try { nghiMap = cache.getAll(tenCache.concat(quyenCache, ngayCache, badCache)); } catch (e) { nghiMap = {}; }
  var dung = [], nghi = [], coHetNgay = false, n429 = 0, n403 = 0;
  thuTu.forEach(function (k, i) {
    var id = khoId_(k);
    if (all['kd_' + id] === 'BAD' || nghiMap[badCache[i]]) { n403++; return; }
    if (all[khoTenKhoa_(id, tq)] === homNay || nghiMap[ngayCache[i]]) { coHetNgay = true; n429++; return; }
    if (nghiMap[quyenCache[i]]) { n403++; return; }
    if (nghiMap[tenCache[i]]) n429++;
    (nghiMap[tenCache[i]] ? nghi : dung).push(k);
  });
  return { dung: dung, nghi: nghi, coHetNgay: coHetNgay, co404: false, n429: n429, n403: n403, tong: thuTu.length };
}
// Tóm tắt ngắn (không lộ key) khi hết key: dùng cho nhật ký / Zalo
function khoTomTat_(tt) {
  return 'đã quét ' + (tt.tong || 0) + ' key (cả tầng GitHub lẫn tầng cũ): ' + (tt.n429 || 0) + ' key 429/hết hạn mức, ' + (tt.n403 || 0) + ' key 403/hỏng';
}

function khoNghiNgan_(id, tq) {
  try { CacheService.getScriptCache().put('kdn_' + id + '_' + tq, '1', KHO_TTL_RPM_); } catch (e) { /* bỏ qua */ }
}

function khoDanhDau_(key, tq, loai) {   // loai: 'ngay' (hết hạn mức ngày, 6 giờ) | 'bad' (key hỏng/khóa, 6 giờ) | 'bad_model' (lỗi quyền theo model)
  var id = khoId_(key), cache = CacheService.getScriptCache();
  try {
    if (loai === 'bad') { cache.put('kdx_' + id, '1', KHO_TTL_BAD_); return; }
    if (loai === 'bad_model' && tq) { cache.put('kdb_' + id + '_' + tq, 'BAD', 1800); return; }
    cache.put('kdd_' + id + '_' + tq, '1', KHO_TTL_RPD_);
  } catch (e) { /* bỏ qua */ }
}

// Máy khách báo cho A biết (không làm hỏng việc chính nếu A không trả lời)
function khoBaoChu_(key, tq, loai) {
  var u = khoUrl_();
  if (!u) return;
  try {
    UrlFetchApp.fetch(u.url, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, followRedirects: true,
      payload: JSON.stringify({ secret: u.secret, action: 'khoBao', id: khoId_(key), model: tq, loai: loai }) });
  } catch (e) { Logger.log('Kho key: không báo được cho A: ' + e.message); }
}

// Trả true nếu lỗi đã được xử lý bằng cách đánh dấu key (để vòng gọi đổi sang key khác)
function khoGhiNhanLoi_(key, tq, code, raw) {
  raw = String(raw || '');
  if (code === 429 && /\blimit:\s*0\b|"quotaValue":\s*"?0\b/i.test(raw)) {
    khoDanhDau_(key, tq, 'bad_model');
    khoLog_('KEY_429', key, 'limit 0 cho model ' + tq + ' -> bỏ qua key với model này');
    return true;
  }
  if (code === 429 || /RESOURCE_EXHAUSTED/.test(raw)) {
    if (/PerDay|per day|daily|RPD/i.test(raw)) {
      khoDanhDau_(key, tq, 'ngay'); khoBaoChu_(key, tq, 'ngay'); khoLog_('KEY_429', key, 'hết hạn mức NGÀY -> nghỉ 6 giờ');
      try { khoCanhBaoQuyKeyThap_(tq); } catch (eCb) {}
    } else { khoNghiNgan_(khoId_(key), tq); khoLog_('KEY_429', key, 'chạm giới hạn phút -> nghỉ ' + KHO_TTL_RPM_ + ' giây'); }
    return true;
  }
  if (code === 401 || ((code === 400 || code === 403) && /API_KEY_INVALID|API key not valid|API_KEY_EXPIRED|API key expired/i.test(raw))) {
    khoDanhDau_(key, tq, 'bad'); khoBaoChu_(key, tq, 'bad');
    khoLog_('KEY_HONG', key, 'HTTP ' + code + ' key hỏng/bị khóa -> bỏ qua 6 giờ');
    try { khoCanhBaoQuyKeyThap_(tq); } catch (eCb2) {}
    return true;
  }
  if (code === 403) {
    khoDanhDau_(key, tq, 'bad_model');
    khoLog_('KEY_403', key, 'từ chối model ' + tq + ' -> bỏ qua key với model này 30 phút');
    return true;
  }
  return false;
}
function khoLa403Model_(code, raw) { return code === 403 && !/API_KEY_INVALID|API key not valid|API_KEY_EXPIRED|API key expired|SERVICE_DISABLED|has not been used in project|API_KEY_SERVICE_BLOCKED|API_KEY_HTTP_REFERRER_BLOCKED|billing/i.test(String(raw || '')); }

// GỌI GEMINI QUA KHO KEY. he: 'VIDEO' | 'DIEMDANH' | tên bất kỳ. body: đối tượng hoặc chuỗi JSON.
// tuyChon: { hanChoMs: tổng thời gian chờ tối đa khi mọi key đang nghỉ ngắn (mặc định 45000; 0 = không chờ),
//            tenQuota: tên để theo dõi hạn mức riêng, ví dụ model + '+tim' cho lệnh có Google Search }
// Trả về { ok, code, het, raw, key }. het = true khi MỌI key đã hết hạn mức ngày cho model này.
function khoGoi_(he, model, body, tuyChon) {
  tuyChon = tuyChon || {};
  var tq = tuyChon.tenQuota || model;
  var hanCho = tuyChon.hanChoMs == null ? 45000 : tuyChon.hanChoMs;
  var url = KHO_API_ + model + ':generateContent';
  var payload = typeof body === 'string' ? body : JSON.stringify(body);
  if (!khoDanhSachKey_().length) return { ok: false, code: 0, het: false, raw: 'THIEU_GEMINI_API_KEY' };
  // v99.2b: model đã bị chặn vì 403 (BoPhan1.gs chanModel403_) -> trả ngay, không gọi mạng
  if (typeof modelBiChan403_ === 'function' && modelBiChan403_(model)) return { ok: false, code: 403, het: false, raw: 'MODEL_TU_CHOI (đã chặn): ' + model };
  var bat = Date.now(), loiMang = 0, loi5xx = 0, so403 = 0;
  for (var vong = 0; vong < 60; vong++) {
    var tt = khoXep_(he, tq);
    if (!tt.dung.length) {
      var tomTat = khoTomTat_(tt);
      try { CacheService.getScriptCache().put('KEY_TOM_TAT', tomTat, 600); } catch (eT) { /* bỏ qua */ }
      if (tt.co404) return { ok: false, code: 404, het: false, raw: 'MODEL_KHONG_CO (404, nhớ 6 giờ): ' + model };
      if (!tt.nghi.length && !tt.coHetNgay) return { ok: false, code: 403, het: false, raw: 'KHONG_CO_KEY_CO_QUYEN (' + tomTat + ')' };
      if (!tt.nghi.length) return { ok: false, code: 429, het: true, raw: 'HET_HAN_MUC_NGAY (' + tomTat + ')' };
      if (Date.now() - bat + 8000 > hanCho) return { ok: false, code: 429, het: false, raw: 'GIOI_HAN_TOC_DO (' + tomTat + ')' };
      Utilities.sleep(8000);
      continue;
    }
    var key = tt.dung[0], res;
    try {
      res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key },
                                     payload: payload, muteHttpExceptions: true });
    } catch (e) {
      if (++loiMang > 3) return { ok: false, code: 0, het: false, raw: String(e) };
      Utilities.sleep(2000 * loiMang);
      continue;
    }
    var code = res.getResponseCode(), raw = res.getContentText();
    if (code === 200) return { ok: true, code: 200, het: false, raw: raw, key: key };
    if (khoLa404_(code, raw)) { khoGhi404_(key, model); khoLog_('MODEL_404', key, model + ' không tồn tại -> nhớ model 6 giờ (key vẫn tốt)'); return { ok: false, code: code, het: false, raw: raw, key: key }; }   // v99.3: chỉ model bị nhớ
    var la403 = khoLa403Model_(code, raw);
    if (khoGhiNhanLoi_(key, tq, code, raw)) {
      // v99.2b: 2 key khác nhau cùng bị model từ chối (403) -> model không cho dùng, trả ngay (goiGemini_ chặn 12 giờ) thay vì thử hết key
      if (la403 && ++so403 >= 2) return { ok: false, code: 403, het: false, raw: 'MODEL_TU_CHOI: ' + String(raw).slice(0, 200), key: key };
      continue;
    }
    if (code >= 500) {
      if (++loi5xx > 4) return { ok: false, code: code, het: false, raw: raw };
      Utilities.sleep(Math.min(3000 * loi5xx, 12000));
      continue;
    }
    return { ok: false, code: code, het: false, raw: raw, key: key };   // 400 khác, 404...: để nơi gọi quyết định
  }
  return { ok: false, code: 0, het: false, raw: 'QUA_NHIEU_LAN_THU' };
}

// Gọi nhiều yêu cầu ĐỒNG THỜI, mỗi yêu cầu một key khác nhau (tránh dồn giới hạn theo phút vào một key).
// Yêu cầu nào lỗi sẽ tự gọi lại bằng khoGoi_ (có xoay key). Trả về mảng kết quả cùng dạng khoGoi_.
function khoGoiSong_(he, model, bodies) {
  var keys = khoXep_(he, model).dung;
  var tuan = function () { return bodies.map(function (b) { return khoGoi_(he, model, b); }); };
  if (!keys.length) return tuan();
  var url = KHO_API_ + model + ':generateContent';
  var yc = bodies.map(function (b, i) {
    return { url: url, method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': keys[i % keys.length] },
             payload: typeof b === 'string' ? b : JSON.stringify(b), muteHttpExceptions: true };
  });
  var kq;
  try { kq = UrlFetchApp.fetchAll(yc); } catch (e) { return tuan(); }
  return kq.map(function (r, i) {
    var code = r.getResponseCode(), raw = r.getContentText(), key = keys[i % keys.length];
    if (code === 200) return { ok: true, code: 200, het: false, raw: raw, key: key };
    if (khoLa404_(code, raw)) { khoGhi404_(key, model); return { ok: false, code: code, het: false, raw: raw, key: key }; }
    if (code === 400 || code === 404) {
      if (!khoGhiNhanLoi_(key, model, code, raw)) return { ok: false, code: code, het: false, raw: raw };
    } else khoGhiNhanLoi_(key, model, code, raw);
    return khoGoi_(he, model, bodies[i]);
  });
}

// Máy khách: lấy danh sách key + trạng thái hết hạn mức từ A
function khoDongBo_() {
  var u = khoUrl_();
  if (!u) return false;
  try {
    var r = UrlFetchApp.fetch(u.url, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, followRedirects: true,
      payload: JSON.stringify({ secret: u.secret, action: 'khoLay' }) });
    var j = JSON.parse(r.getContentText());
    if (!j || !j.ok || !j.keys || !j.keys.length) { Logger.log('Kho key: A trả lời không hợp lệ: ' + String(r.getContentText()).slice(0, 150)); return false; }
    var p = khoProps_(), all = p.getProperties(), dau = { KHO_BAN_SAO: j.keys.join(',') };
    if (j.ngay === khoNgayPT_()) {
      (j.het || []).forEach(function (h) { if (all['kd_' + h[0]] !== 'BAD') dau[khoTenKhoa_(h[0], h[1])] = j.ngay; });
      (j.bad || []).forEach(function (id) { dau['kd_' + id] = 'BAD'; });
    }
    p.setProperties(dau, false);
    return true;
  } catch (e) { Logger.log('Kho key: không liên lạc được hệ thống A: ' + e.message); return false; }
}
function khoDongBoDinhKy() { khoDongBo_(); }

// CHẠY 1 LẦN ở điểm danh và video: hẹn đồng bộ mỗi 30 phút. (Nếu sau này chạy lại hàm đặt lịch cũ xóa hết trigger thì chạy lại caiKho.)
function caiKho() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'khoDongBoDinhKy') ScriptApp.deleteTrigger(t); });
  if (!khoUrl_()) { Logger.log('Project này là KHO CHỦ (không có KHO_URL/NH_URL): không cần đồng bộ. Chạy khoXem() để xem trạng thái key.'); return; }
  ScriptApp.newTrigger('khoDongBoDinhKy').timeBased().everyMinutes(30).create();
  Logger.log(khoDongBo_() ? '✔ Đã đồng bộ với hệ thống A' : '✘ Chưa đồng bộ được với A: kiểm tra KHO_URL/KHO_SECRET và bản triển khai Web app của A');
  khoXem();
}

// ---- Phía kho chủ (A): trả danh sách + nhận báo cáo từ các hệ thống khác ----
function khoHubLay_() {
  var all = khoProps_().getProperties(), homNay = khoNgayPT_(), het = [], bad = [];
  Object.keys(all).forEach(function (k) {
    var m = /^kd_([0-9a-f]{8})$/.exec(k);
    if (m) { if (all[k] === 'BAD') bad.push(m[1]); else if (all[k] === homNay) het.push([m[1], KHO_MODEL_CU_]); return; }
    m = /^kdm_([0-9a-f]{8})_(.+)$/.exec(k);
    if (m && all[k] === homNay) het.push([m[1], m[2]]);
  });
  return { ok: true, keys: khoParse_(all.GEMINI_API_KEY), het: het, bad: bad, ngay: homNay };
}
function khoHubBao_(req) {
  var id = String(req.id || ''), model = String(req.model || '');
  if (!/^[0-9a-f]{8}$/.test(id) || !/^[A-Za-z0-9._+-]{1,70}$/.test(model)) return { ok: false, error: 'id/model không hợp lệ' };
  var p = khoProps_();
  var thuoc = khoParse_(p.getProperty('GEMINI_API_KEY')).some(function (k) { return khoId_(k) === id; });
  if (!thuoc) return { ok: false, error: 'id không thuộc kho' };
  if (req.loai === 'bad') p.setProperty('kd_' + id, 'BAD');
  else if (p.getProperty('kd_' + id) !== 'BAD') p.setProperty(khoTenKhoa_(id, model), khoNgayPT_());
  return { ok: true };
}

// ---- Xem và thử ----
function khoXem() {
  if (khoUrl_()) { try { khoDongBo_(); } catch (e) {} }
  var all = khoProps_().getProperties(), homNay = khoNgayPT_(), ds = khoDanhSachKey_();
  var dong = [];
  var demTotHoanToan = 0, demHetMotPhan = 0, demBiTuChoi = 0;
  dong.push('🔑 Chế độ: ' + (khoUrl_() ? 'MÁY KHÁCH (lấy key từ hệ thống A)' : 'KHO CHỦ / ĐỘC LẬP (dùng GEMINI_API_KEY của project này)') +
            ' · Tổng ' + ds.length + ' key · Ngày PT: ' + homNay);
  ds.forEach(function (k, i) {
    var id = khoId_(k), tt = [], badTam = false;
    try { badTam = !!CacheService.getScriptCache().get('kdx_' + id); } catch (eB) {}
    if (all['kd_' + id] === 'BAD' || badTam) {
      tt.push('❌ BỊ TỪ CHỐI');
      demBiTuChoi++;
    } else {
      if (all['kd_' + id] === homNay) tt.push(KHO_MODEL_CU_ + ': hết hạn mức ngày');
      Object.keys(all).forEach(function (n) {
        var tien = 'kdm_' + id + '_';
        if (n.indexOf(tien) === 0 && all[n] === homNay) tt.push(n.slice(tien.length) + ': hết hạn mức ngày');
      });
      if (tt.length) demHetMotPhan++;
      else demTotHoanToan++;
    }
    dong.push('• ' + khoNhan_(k) + ' (…' + k.slice(-4) + '): ' + (tt.length ? tt.join('; ') : '✅ còn dùng được cho mọi model'));
  });
  var conXaiDuoc = demTotHoanToan + demHetMotPhan;
  dong.splice(1, 0, '📊 TỔNG KẾT: Còn ' + conXaiDuoc + '/' + ds.length + ' key xài được (' + demTotHoanToan + ' key khỏe 100% mọi model, ' +
    demHetMotPhan + ' key chạm hạn mức ở 1 vài model nhưng vẫn dùng được ở model khác, ' + demBiTuChoi + ' key hỏng/bị từ chối).');
  var kqChuoi = dong.join('\n');
  Logger.log(kqChuoi);
  try { SpreadsheetApp.getActiveSpreadsheet().toast('Còn ' + conXaiDuoc + '/' + ds.length + ' key xài được (' + demTotHoanToan + ' khỏe 100%)', 'Kho Key Gemini', 8); } catch (eT) {}
  return kqChuoi;
}
function khoThu() {
  var model = khoProps_().getProperty('GEMINI_MODEL') || 'gemini-flash-lite-latest';
  var kq = khoGoi_('DIEMDANH', model, { contents: [{ parts: [{ text: 'Trả lời đúng một từ: OK' }] }],
                                        generationConfig: { maxOutputTokens: 20, temperature: 0 } }, { hanChoMs: 0 });
  Logger.log(kq.ok ? '✔ Gọi Gemini được, dùng key ' + khoNhan_(kq.key) + ' (model ' + model + ')'
                   : '✘ Lỗi ' + kq.code + (kq.het ? ' (mọi key đã hết hạn mức ngày cho model này)' : '') + ': ' + String(kq.raw).slice(0, 200));
}

// Thời điểm reset hạn mức ngày Gemini kế tiếp (00:00 Pacific Time -> giờ VN GMT+7: 14:00 mùa hè / 15:00 mùa đông)
function khoMocResetVN_() {
  var ptDay = khoNgayPT_();
  var now = Date.now();
  for (var m = 1; m <= 50; m++) {
    var d = new Date(now + m * 1800000);
    if (Utilities.formatDate(d, 'America/Los_Angeles', 'yyyy-MM-dd') !== ptDay) {
      d.setMinutes(0, 0, 0);
      return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'HH:mm dd/MM') + ' giờ VN (00:00 PT)';
    }
  }
  return '14:00-15:00 giờ VN (00:00 PT)';
}

// Thống kê tỷ lệ key Gemini còn khả dụng trong ngày PT hiện tại
function khoThongKeKhaDung_(model) {
  var p = khoProps_(), all = p.getProperties(), homNay = khoNgayPT_(), ds = khoDanhSachKey_();
  var tong = ds.length;
  if (!tong) return { tong: 0, conSong: 0, tyLe: 0, ngayPT: homNay, resetVN: khoMocResetVN_() };
  var tq = model || all.GEMINI_MODEL || KHO_MODEL_CU_;
  var cache = CacheService.getScriptCache();
  var badKeys = ds.map(function (k) { return 'kdx_' + khoId_(k); });
  var ngayKeys = ds.map(function (k) { return 'kdd_' + khoId_(k) + '_' + tq; });
  var mapCache = {};
  try { mapCache = cache.getAll(badKeys.concat(ngayKeys)) || {}; } catch (eC) { mapCache = {}; }
  var hetGhMap = {};
  try {
    var oGh = JSON.parse(all.KEY_HET_NGAY_GH || '{}');
    if (oGh && oGh.ngay === homNay && Array.isArray(oGh.ds)) {
      oGh.ds.forEach(function (x) {
        var parts = String(x).split('|');
        if (parts.length === 2) hetGhMap[parts[1]] = (hetGhMap[parts[1]] || 0) + 1;
      });
    }
  } catch (eGh) {}
  var conSong = 0;
  ds.forEach(function (k, i) {
    var id = khoId_(k);
    if (all['kd_' + id] === 'BAD' || mapCache[badKeys[i]]) return;
    if (all[khoTenKhoa_(id, tq)] === homNay || mapCache[ngayKeys[i]]) return;
    if (all['kd_' + id] === homNay) return;
    var maNg = String(k).slice(0, 6) + '_' + String(k).slice(-4);
    if (hetGhMap[maNg] && hetGhMap[maNg] >= 2) return;
    conSong++;
  });
  return { tong: tong, conSong: conSong, tyLe: conSong / tong, ngayPT: homNay, resetVN: khoMocResetVN_() };
}

// Cảnh báo sớm khi tỷ lệ key khả dụng tụt xuống dưới 20% (lưu cờ theo ngày PT trong PropertiesService để chống spam)
function khoCanhBaoQuyKeyThap_(model) {
  var tk = khoThongKeKhaDung_(model);
  if (!tk.tong || tk.tyLe >= 0.2) return false;
  var p = khoProps_();
  if (p.getProperty('CANH_BAO_KEY_THAP_NGAY') === tk.ngayPT) return false;
  p.setProperty('CANH_BAO_KEY_THAP_NGAY', tk.ngayPT);
  var pct = Math.round(tk.tyLe * 100);
  var tin = '⚠️ Quỹ key Gemini sắp cạn (< 20%): còn ' + tk.conSong + '/' + tk.tong +
    ' key khả dụng (' + pct + '%).\n⏱ Dự kiến reset hạn mức lúc ' + tk.resetVN + '.';
  try { if (typeof nhatKy_ === 'function') nhatKy_('KEY_THAP', tk.conSong + '/' + tk.tong + ' (' + pct + '%)'); } catch (eNk) {}
  try {
    if (typeof guiZaloMotLan_ === 'function') guiZaloMotLan_('KEY_THAP_' + tk.ngayPT, tin, 'cao');
    else if (typeof guiZalo_ === 'function') guiZalo_(tin, 'cao', 'KEY_THAP_' + tk.ngayPT);
  } catch (eZl) {}
  return true;
}

// Báo cáo chi tiết số lượng key còn xài được qua Zalo (lệnh /key hoặc /khokey) & kích hoạt kiểm tra trực tiếp trên GitHub Actions
function thongTinKhoKeyZalo_(kichHoatGitHub) {
  var s = khoXem();
  var p = khoProps_();
  var bcGh = p.getProperty('BAO_CAO_KEY_GH');
  if (bcGh) s += '\n\n☁️ KẾT QUẢ KIỂM TRA TRÊN GITHUB GẦN NHẤT:\n' + bcGh;
  if (kichHoatGitHub && typeof guiWorkflowGitHub_ === 'function') {
    try {
      var gh = guiWorkflowGitHub_({}, 'kiem-tra-key.yml');
      if (gh && gh.ok) s += '\n\n⏳ Đã đồng thời kích hoạt GitHub Actions thử thực tế từng key trong GEMINI_KEYS — kết quả chi tiết trên GitHub sẽ gửi về Zalo sau ~1-2 phút.';
    } catch (eG) {}
  }
  return s;
}
