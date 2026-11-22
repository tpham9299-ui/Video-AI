// BỘ PHẬN 1 TRÊN GITHUB: giải + kiểm chứng + viết kịch bản cho MỘT đề, dùng lại NGUYÊN mã Apps Script (BoPhan1.gs,
// PromptKichBan.gs, KiemTraHinh.gs, NangCao.gs, SanPham.gs) chạy trong Node với các dịch vụ Apps Script giả lập.
// Không còn giới hạn 6 phút / 90 phút mỗi ngày của Apps Script.
//
// Vào (biến môi trường):
//   BP1_DE       JSON {hang:{...dòng HANG_DOI}, cau_hinh:{...}, series, hook, goi_y}   (Apps Script gửi)
//   GEMINI_KEYS  các key Gemini, mỗi dòng một key (hoặc cách nhau bằng dấu phẩy); thiếu thì dùng GEMINI_API_KEY
//   BP1_ANH      (tùy chọn) đường dẫn ảnh đề đã tải từ Drive
//   BP1_GIA_LAP  =1: không gọi Gemini thật (chạy thử)
// Ra: tệp ket_qua_bp1.json {id, ok, hang:{các cột đã đổi}, kich_ban, nhat_ky:[...], zalo:[...], series_ghi, loi}
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const {execFileSync} = require('child_process');

const GOC = path.resolve(__dirname, '..', '..');
const RA = process.env.BP1_RA || path.join(GOC, 'ket_qua_bp1.json');
// chạy tay không kèm đề (Actions > Run workflow): giải một đề mẫu để kiểm tra key Gemini
const DE_MAU = {hang: {id: 'THU-' + Date.now().toString(36), trang_thai: 'MOI', lop: '12', mon: 'THUC_TE', chu_de: 'Bể nước ít vật liệu', so_lan_loi: 0,
  de_bai: 'Xây một bể nước hình hộp chữ nhật không nắp, đáy là hình vuông, thể tích 32 m³. Tìm diện tích xây (đáy + 4 mặt bên) nhỏ nhất (m²).'}, cau_hinh: {}};
const de = process.env.BP1_DE ? JSON.parse(process.env.BP1_DE) : process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : DE_MAU;
const keys = [...new Set([process.env.GEMINI_KEYS, process.env.GEMINI_API_KEY].filter(Boolean).join(',').split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))];
const GIA_LAP = process.env.BP1_GIA_LAP === '1';
const out = {id: de.hang && de.hang.id, ok: false, hang: {}, kich_ban: null, nhat_ky: [], zalo: [], series_ghi: null, loi: ''};

// thiếu key: báo ngay để Apps Script tự làm đề này tại chỗ (không tính là lỗi của đề)
// KEY HẾT HẠN MỨC NGÀY đã biết từ các lần chạy trước (Apps Script nhớ, theo ngày giờ Thái Bình Dương): bỏ qua ngay, khỏi dò lại
const TEP_HET_NGAY = path.join(os.tmpdir(), 'gemini_key_het_ngay.txt');
const maKeyBp1 = (k) => k.slice(0, 6) + '_' + k.slice(-4);
try {
  const biet = new Set((de.het_ngay || []).map(String));
  const dong = [];
  for (const k of keys) for (const x of biet) { const [md, ma] = x.split('|'); if (ma === maKeyBp1(k)) dong.push(md + '|' + k); }
  if (dong.length) { fs.writeFileSync(TEP_HET_NGAY, dong.join('\n') + '\n'); console.log(`Đã biết ${dong.length} cặp model-key hết hạn mức hôm nay, bỏ qua ngay`); }
} catch (e) { /* bỏ */ }
if (!GIA_LAP && !keys.length) {
  out.loi = 'THIEU_GEMINI_API_KEY';
  out.hang = null;
  fs.writeFileSync(RA, JSON.stringify(out));
  console.error('Chưa có key Gemini: thêm Secret GEMINI_KEYS (mỗi dòng một key) trong GitHub > Settings > Secrets and variables > Actions');
  process.exit(1);
}

/* ---------------- sheet giả: HANG_DOI (một dòng), CAU_HINH, các sheet khác rỗng ---------------- */
function taoSheet(ten, data) {
  const sh = {
    data,
    getLastRow: () => data.length, getMaxRows: () => Math.max(1, data.length), getMaxColumns: () => 60, insertColumnsAfter() {},
    appendRow: (r) => data.push(r.slice()),
    getDataRange: () => ({getValues: () => data.map((r) => r.slice())}),
    getRange: (r, c, nr = 1, nc = 1) => {
      const api = {
        setValue: (v) => { while (data.length < r) data.push([]); data[r - 1][c - 1] = v; return api; },
        setValues: (vs) => { vs.forEach((row, i) => row.forEach((v, j) => { while (data.length < r + i) data.push([]); data[r + i - 1][c + j - 1] = v; })); return api; },
        getValues: () => Array.from({length: nr}, (_, i) => Array.from({length: nc}, (_, j) => ((data[r + i - 1] || [])[c + j - 1] ?? ''))),
        getValue: () => (data[r - 1] || [])[c - 1] ?? '',
      };
      return new Proxy(api, {get: (t, k) => t[k] || (() => api)});
    },
    deleteRow: (r) => data.splice(r - 1, 1), deleteRows: (r, n) => data.splice(r - 1, n), getName: () => ten,
  };
  return new Proxy(sh, {get: (t, k) => (k in t ? t[k] : () => sh)});
}
const props = {};
const cache = {};
const tep = {}; // tệp Drive giả trong thư mục kịch bản
const thuMuc = {
  getId: () => 'F',
  getFilesByName: (n) => { let da = false; return {hasNext: () => n in tep && !da, next: () => { da = true; return {setContent: (c) => { tep[n] = c; }, getBlob: () => ({getDataAsString: () => tep[n]}), setTrashed: () => { delete tep[n]; }, getId: () => n}; }}; },
  createFile: (n, c) => { tep[n] = c; return {getId: () => n}; },
  getParents: () => ({next: () => thuMuc, hasNext: () => true}),
  getFoldersByName: () => ({hasNext: () => false}), createFolder: () => thuMuc,
};

/* ---------------- gọi Gemini: tiến trình phụ gọi song song, đồng bộ với mã .gs ---------------- */
let vongKey = 0;
function goiTho(model, bodies, tungModel = false) {
  if (GIA_LAP) return bodies.map(giaLapGemini);
  const t = path.join(os.tmpdir(), `bp1_${process.pid}_${Date.now()}.json`);
  // Danh sách model linh hoạt: tự động đổi model ngay trong tiến trình gọi khi gặp lỗi (404, 400, 429 hết ngày, 500, 503, mạng)
  const ch = de.cau_hinh || {};
  const dsCauHinh = typeof ctx.danhSachModel_ === 'function' ? ctx.danhSachModel_() : [];
  const models = [...new Set([model, ...dsCauHinh, ch.MODEL_CHINH, ch.MODEL_DU_PHONG, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-flash-lite-latest'].map((x) => String(x || '').trim()).filter(Boolean))];
  const hedgeGiay = String(ch.GOI_DU_PHONG_SONG_SONG).toUpperCase() === 'TAT' ? 0 : Number(ch.GIAY_GOI_DU_PHONG) || 0;
  fs.writeFileSync(t, JSON.stringify({model, models, bodies, keys, batDauKey: vongKey, hedgeGiay, tungModel}), {mode: 0o600});
  vongKey = (vongKey + bodies.length) % Math.max(1, keys.length);
  try {
    return JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'goi_gemini.js'), t], {maxBuffer: 64 * 1024 * 1024, timeout: 330000}).toString());
  } catch (e) {
    return bodies.map(() => ({ok: false, code: 0, raw: 'LOI_TIEN_TRINH: ' + String(e.message).slice(0, 200)}));
  } finally {
    try { fs.unlinkSync(t); } catch (e) {}
  }
}

/* ---------------- dịch vụ Apps Script giả lập ---------------- */
const ngu = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms));
const ctx = {
  console, JSON, Math, Date, Buffer,
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = taoSheet(n, []))}),
    flush() {},
  },
  PropertiesService: {getScriptProperties: () => ({getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => ({...props})})},
  CacheService: {getScriptCache: () => ({get: (k) => cache[k] || null, put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; }})},
  LockService: {getScriptLock: () => ({tryLock: () => true, waitLock() {}, releaseLock() {}})},
  Utilities: {
    sleep: ngu,
    formatDate: (d, tz, f) => {
      const x = new Date(new Date(d).getTime() + 7 * 3600e3);
      const P = (n) => String(n).padStart(2, '0');
      const m = {yyyy: x.getUTCFullYear(), yy: String(x.getUTCFullYear()).slice(2), MM: P(x.getUTCMonth() + 1), dd: P(x.getUTCDate()), HH: P(x.getUTCHours()), mm: P(x.getUTCMinutes()), ss: P(x.getUTCSeconds())};
      return f.replace(/yyyy|yy|MM|dd|HH|mm|ss/g, (k) => m[k]);
    },
    base64Encode: (b) => Buffer.from(b).toString('base64'),
    base64Decode: (s) => Array.from(Buffer.from(s, 'base64')),
    getUuid: () => require('crypto').randomUUID(),
    computeDigest: (_a, s) => Array.from(require('crypto').createHash('md5').update(String(s)).digest()).map((x) => (x > 127 ? x - 256 : x)),
    DigestAlgorithm: {MD5: 'MD5'},
  },
  Logger: {log: (s) => console.log(String(s))},
  MimeType: {PLAIN_TEXT: 'text/plain', JSON: 'application/json'},
  DriveApp: {getFolderById: () => thuMuc, getFileById: () => { throw new Error('KHONG_CO_DRIVE_TREN_GITHUB'); }},
  UrlFetchApp: {fetch: () => { throw new Error('KHONG_GOI_MANG_TU_MA_GS_TREN_GITHUB'); }},
  ScriptApp: {getProjectTriggers: () => [], newTrigger: () => new Proxy({}, {get: () => () => ({})}), deleteTrigger() {}},
  // kho key (thay tệp KhoKey.gs của Apps Script)
  khoDanhSachKey_: () => (GIA_LAP ? ['gia_lap'] : keys),
  khoGoi_: (_nhom, model, body, opts) => goiTho(model, [body], !!opts?.tungModel)[0],
  khoGoiSong_: (_nhom, model, bodies) => goiTho(model, bodies),
  // v94: kiểm chứng hình phẳng chuẩn bằng tọa độ số thật (scripts/giai_hinh_phang.py --chi-kiem) ngay trong vòng duyệt BP2
  // -> lỗi HP_* kèm gợi ý quay lại cho AI sửa ở lượt retry. Không có Python -> null (BP3 vẫn chặn cứng).
  kiemHinhPhangMay_: (kb) => {
    for (const py of ['python3', 'python']) {
      try {
        const ra = execFileSync(py, [path.join(GOC, 'scripts', 'giai_hinh_phang.py'), '-', '--chi-kiem'],
          {input: JSON.stringify(kb), timeout: 60000, stdio: ['pipe', 'pipe', 'pipe']});
        return JSON.parse(ra.toString('utf8'));
      } catch (e) {
        if (e && e.status === 2 && e.stdout) { try { return JSON.parse(e.stdout.toString('utf8')); } catch (e2) { return null; } }
        if (e && e.status === 3) return null;
      }
    }
    return null;
  },
};

const sheets = {};
vm.createContext(ctx);
for (const f of ['BoPhan1.gs', 'PromptKichBan.gs', 'KiemTraHinh.gs', 'NangCao.gs', 'SanPham.gs', 'HinhHoc.gs']) {
  const p = path.join(GOC, f);
  if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, {filename: f});
}
const COT = vm.runInContext('COT', ctx);
const hang = de.hang || {};
sheets[vm.runInContext('TEN_HANG_DOI', ctx)] = taoSheet('HANG_DOI', [COT.slice(), COT.map((k) => (hang[k] === undefined || hang[k] === null ? '' : hang[k]))]);
sheets[vm.runInContext('TEN_CAU_HINH', ctx)] = taoSheet('CAU_HINH', [['khoa', 'gia_tri'], ...Object.entries(de.cau_hinh || {}).map(([k, v]) => [k, v])]);
Object.assign(props, de.thong_ke || {}); // TB_*_MS... (ước lượng thời gian) nếu có
if (de.nhap && hang.id) tep['nhap_' + hang.id + '.json'] = String(de.nhap); // bản nháp đang sửa dở (vd. sửa theo góp ý /sua)

ctx.__out = out;
ctx.__thuMuc = thuMuc;
ctx.__pre = {series: de.series || null, hook: de.hook || '', goi_y: de.goi_y || '', hoc_edit: de.hoc_edit || '', quy_tac_hoc: de.quy_tac_hoc || '', quy_tac_kd: de.quy_tac_kd || [], phong_cach: de.phong_cach || null, cau_noi: de.cau_noi || []};
ctx.__anh = process.env.BP1_ANH && fs.existsSync(process.env.BP1_ANH) ? {mime: /\.png$/i.test(process.env.BP1_ANH) ? 'image/png' : 'image/jpeg', data: fs.readFileSync(process.env.BP1_ANH).toString('base64')} : null;
vm.runInContext(`
  THOI_GIAN_TOI_DA_MS = 22 * 60 * 1000;      // GitHub: 22 phút cho một đề (Apps Script chỉ 4,6 phút)
  KIEM_CHUNG_TOI_DA_MS = 60000;
  _bat_dau_chay_ = Date.now();
  nhatKy_ = function (muc, nd) { var s = muc + ': ' + String(nd).slice(0, 500); __out.nhat_ky.push([new Date().toISOString(), muc, String(nd).slice(0, 500)]); console.log(s); };
  guiZalo_ = function (t, muc, khoa) { __out.zalo.push({tat_ca: true, noi_dung: String(t), muc: muc || 'thap', khoa: khoa || ''}); };
  baoZaloDe_ = function (r, t, muc) { __out.zalo.push({id: r.id, noi_dung: String(t), muc: muc || 'thap'}); };
  xacDinhSeries_ = function () { return __pre.series; };
  chonKieuHook_ = function () { return __pre.hook; };
  goiYTuSoLieu_ = function () { return __pre.goi_y; };
  hocEditChoPrompt_ = function () { return __pre.hoc_edit; };
  quyTacHocChoPrompt_ = function () { return __pre.quy_tac_hoc; };
  quyTacHocChoKiemDuyet_ = function () { return __pre.quy_tac_kd; };
  chonPhongCachVideo_ = function () { return __pre.phong_cach; };
  cauNoiGanDay_ = function () { return __pre.cau_noi; };
  ghiTapCuoiSeries_ = function (se, tieuDe) { __out.series_ghi = {se: se, tieu_de: tieuDe}; };
  anhDeChoGemini_ = function () { return __anh; };
  thuMucKichBan_ = function () { return __thuMuc; };
  dongBoBangDoc = function () {};
`, ctx);

/* ---------------- chạy tách luồng: giải đề (viec=giai: MOI -> DA_GIAI) HOẶC xây kịch bản (viec=kich_ban: DA_GIAI -> CO_KICH_BAN) ---------------- */
const sh = sheets.HANG_DOI;
const truoc = sh.data[1].slice();
const bc = {moi: 0, giai_ok: 0, loai: 0, kich_ban: 0, loi: 0};
const trangThai = () => sh.data[1][COT.indexOf('trang_thai')];
const viec = String(de.viec || process.env.BP1_VIEC || (hang.trang_thai === 'DA_GIAI' ? 'kich_ban' : 'giai')).toLowerCase();
console.log(`Bắt đầu Bộ phận 1 [${viec.toUpperCase()}]: ${out.id} (trạng thái đầu vào: ${trangThai()})`);
const cot = (k) => sh.data[1][COT.indexOf(k)];
if (/^DANG_/.test(String(cot('ghi_chu')))) { sh.data[1][COT.indexOf('so_lan_loi')] = 0; sh.data[1][COT.indexOf('ghi_chu')] = ''; }
let lan = 0, luot = 0;
for (;;) {
  try {
    const bat = Date.now();
    const ttTruoc = trangThai();
    if (viec === 'giai') {
      if (trangThai() === 'MOI') ctx.xuLyGiai_(sh, bc, bat, false);
    } else if (viec === 'kich_ban') {
      if (trangThai() === 'DA_GIAI') ctx.xuLyKichBan_(sh, bc, bat, false);
    } else {
      if (trangThai() === 'MOI') ctx.xuLyGiai_(sh, bc, bat, false);
      if (trangThai() === 'DA_GIAI') ctx.xuLyKichBan_(sh, bc, bat, false);
    }
    const gc = String(cot('ghi_chu') || '');
    const chuaXongViec = (viec === 'giai' && trangThai() === 'MOI') ||
      (viec === 'kich_ban' && trangThai() === 'DA_GIAI') ||
      (viec !== 'giai' && viec !== 'kich_ban' && (trangThai() === 'MOI' || trangThai() === 'DA_GIAI'));
    const conLam = chuaXongViec && gc && luot < 3;
    if (conLam) {
      luot++;
      console.log(`Chưa xong [${viec}] (${trangThai()}: ${gc.slice(0, 120)}) -> làm tiếp ngay, lượt ${luot + 1}`);
      if (ttTruoc === trangThai() && !/^Đang sửa kịch bản/.test(gc)) ngu(4000);
      continue;
    }
    out.ok = true;
    out.viec = viec;
    break;
  } catch (e) {
    const m = String(e && e.message);
    if (m === 'QUA_TAI' && viec !== 'kich_ban' && lan < 3) { lan++; console.log('Gemini quá tải, chờ ' + 25 * lan + ' giây rồi thử lại'); ngu(25000 * lan); continue; }
    out.loi = m;
    out.viec = viec;
    console.log('LỖI: ' + m + '\n' + String(e && e.stack || '').slice(0, 800));
    break;
  }
}
// các cột đã đổi
COT.forEach((k, i) => {
  const a = truoc[i], b = sh.data[1][i];
  if (k !== 'cap_nhat' && String(a ?? '') !== String(b ?? '')) out.hang[k] = b instanceof Date ? b.toISOString() : b;
});
const tenKb = out.id + '.json';
if (tep[tenKb]) { out.kich_ban = tep[tenKb]; delete out.hang.file_kich_ban; }
const nhap = tep['nhap_' + out.id + '.json'];
if (nhap && !out.kich_ban) out.nhap = nhap; // bản nháp (nếu dừng giữa chừng) để Apps Script giữ lại
out.thong_ke = Object.fromEntries(Object.entries(props).filter(([k]) => /^TB_/.test(k)));
out.bao_cao = bc;
try { out.het_ngay = (fs.existsSync(TEP_HET_NGAY) ? fs.readFileSync(TEP_HET_NGAY, 'utf8') : '').split('\n').filter(Boolean).map((x) => { const i = x.indexOf('|'); return x.slice(0, i) + '|' + maKeyBp1(x.slice(i + 1)); }); } catch (e) { /* bỏ */ }
fs.writeFileSync(RA, JSON.stringify(out));
console.log(`Xong: ${out.id} -> ${out.hang.trang_thai || trangThai()} | ${JSON.stringify(bc)} | ${out.loi || 'không lỗi'}`);

/* ---------------- chạy thử (BP1_GIA_LAP=1) ---------------- */
function giaLapGemini(body) {
  const p = ((body.contents[0].parts || []).find((x) => x.text) || {}).text || '';
  const tl = (o) => ({ok: true, code: 200, raw: JSON.stringify({candidates: [{content: {parts: [{text: JSON.stringify(o)}]}}]})});
  if (process.env.BP1_GIA_LAP_VAN_DE && /kiemChung\(\)/.test(p)) return tl({ma: 'function kiemChung(){var n=0,s=0;while(s+n+3<=260){s+=n+3;n++;}return {kieu:"gia_tri",gia_tri:n};}'});
  if (process.env.BP1_GIA_LAP_VAN_DE && /Bài toán thực tế|Giải bài sau|chấm thi/.test(p)) return tl({mo_hinh: 'cấp số cộng u1=3, d=1', cac_buoc: ['n(n+5)/2=260', 'n≈20,44'], gia_tri: 20, don_vi: 'tầng', dap_an_hien: '20 tầng, dư 10 ống', thu_nguoc: 'S20=250≠260', de_co_van_de: '260 ống không xếp vừa khít: 20 tầng dùng 250 ống, 21 tầng cần 273 ống; hiểu là xếp được 20 tầng trọn vẹn, dư 10 ống', y_tuong: 'cấp số cộng'});
  const xs = /xác suất/i.test(p) && !/thực tế/i.test(p);
  if (/kiemChung\(\)/.test(p) && xs) return tl({ma: 'function kiemChung(){var c=0,t=0;for(var i=0;i<8;i++)for(var j=i+1;j<8;j++){t++;if((i<5)==(j<5))c++;}return {kieu:"chinh_xac",tu:c,mau:t};}'});
  if (/kiemChung\(\)/.test(p)) return tl({ma: 'function kiemChung(){var m=1e9;for(var x=0.5;x<=20;x+=0.001){var s=x*x+128/x;if(s<m)m=s;}return {kieu:"gia_tri",gia_tri:m};}'});
  if (/ĐẠO DIỄN HÌNH ẢNH 3D/.test(p)) return tl(JSON.parse(fs.readFileSync(path.join(GOC, 'mau/kich_ban_thuc_te.json'), 'utf8')));
  if (/ĐẠO DIỄN HÌNH ẢNH/.test(p)) return tl(JSON.parse(fs.readFileSync(path.join(GOC, 'mau/kich_ban_mau.json'), 'utf8')));
  if (xs && process.env.BP1_GIA_LAP_LECH) {
    // chạy thử trọng tài: hai cách đầu SAI khác nhau, giải lại (suy nghĩ kỹ) mới đúng
    if (/chấm thi rất cẩn thận/.test(p)) return tl({cac_buoc: ['x'], tu: 13, mau: 28});
    if (/SUY LUẬN/.test(p)) return tl({cac_buoc: ['x'], tu: 1, mau: 2, y_tuong: 'sai'});
    return tl({cac_buoc: ['x'], tu: 3, mau: 7});
  }
  if (xs) return tl({cac_buoc: ['x'], tu: 13, mau: 28, y_tuong: 'cùng giới = 2 nam hoặc 2 nữ'});
  if (/Bài toán thực tế/.test(p)) return tl({mo_hinh: 'đáy x, cao h', cac_buoc: ['S=x^2+128/x'], gia_tri: 48, don_vi: 'm²', dap_an_hien: 'x = 4 m; S = 48 m²', y_tuong: 'khử h'});
  return tl({});
}
