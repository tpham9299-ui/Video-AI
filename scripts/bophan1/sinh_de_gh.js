// BỘ PHẬN 0 TRÊN GITHUB: tìm đề có thật trên Internet / sáng tác đề mới (+ đề chuyên đề 10 phút)
// bằng cụm key GEMINI_KEYS trên GitHub, rồi trả danh sách đề MOI về Apps Script (doPost loai = 'them_de').
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const {execFileSync} = require('child_process');

const GOC = path.resolve(__dirname, '..', '..');
const RA = process.env.SD_RA || path.join(GOC, 'ket_qua_sinh_de.json');
const dl = process.env.SD_DU_LIEU ? JSON.parse(process.env.SD_DU_LIEU) : {};
const GIA_LAP = process.env.BP0_GIA_LAP === '1';
const keys = String(process.env.GEMINI_KEYS || process.env.GEMINI_API_KEY || '').split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
const out = {ok: false, de: [], lop_ke: null, mon_ke: null, ngay_10p: '', lop_10p: null, nhat_ky: [], loi: ''};

if (!GIA_LAP && !keys.length) {
  out.loi = 'THIEU_GEMINI_KEYS';
  fs.writeFileSync(RA, JSON.stringify(out));
  process.exit(1);
}

const addedRows = [];
const props = Object.assign({}, dl.props || {});
const chMap = Object.assign({}, dl.cau_hinh || {});
if (process.env.SD_MON && /^(XEN_KE|XAC_SUAT|THUC_TE|HINH_HOC)$/i.test(process.env.SD_MON.trim())) {
  chMap.CHU_DE_VIDEO = process.env.SD_MON.trim().toUpperCase();
}
const fakeHang = (dl.gan_day || []).map((x) => ({chu_de: x.chu_de || '', de_bai: x.de_bai || '', ma_bam: x.ma_bam || '', trang_thai: x.trang_thai || 'MOI', id: x.id || ''}));

const fakeSheet = {
  getName: () => 'HANG_DOI',
  getLastRow: () => fakeHang.length + 1,
  appendRow: (arr) => {
    const COT_LIST = ctx.COT || [];
    const obj = {};
    COT_LIST.forEach((k, idx) => { if (arr[idx] !== '' && arr[idx] !== undefined) obj[k] = arr[idx]; });
    addedRows.push(obj);
    fakeHang.push(obj);
  },
};

const ctx = {
  SpreadsheetApp: {getActiveSpreadsheet: () => ({getSheetByName: () => fakeSheet}), flush: () => {}},
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => (k in props ? String(props[k]) : null),
      setProperty: (k, v) => { props[k] = String(v); },
      getProperties: () => ({...props}),
    }),
  },
  CacheService: {getScriptCache: () => ({get: () => null, put: () => {}, remove: () => {}})},
  Utilities: {
    formatDate: (d, _tz, f) => {
      const x = new Date(new Date(d).getTime() + 7 * 3600e3);
      const P = (n) => String(n).padStart(2, '0');
      const m = {yyyy: x.getUTCFullYear(), yy: String(x.getUTCFullYear()).slice(2), MM: P(x.getUTCMonth() + 1), dd: P(x.getUTCDate()), HH: P(x.getUTCHours()), mm: P(x.getUTCMinutes()), ss: P(x.getUTCSeconds())};
      return f.replace(/yyyy|yy|MM|dd|HH|mm|ss/g, (k) => m[k]);
    },
    computeDigest: (_a, s) => Array.from(require('crypto').createHash('md5').update(String(s)).digest()).map((x) => (x > 127 ? x - 256 : x)),
    DigestAlgorithm: {MD5: 'MD5'},
  },
  Logger: {log: (s) => console.log(String(s))},
  DriveApp: {getFileById: () => { throw new Error('KHONG_CO_DRIVE'); }},
  ScriptApp: {getProjectTriggers: () => [], newTrigger: () => ({}), deleteTrigger: () => {}},
  UrlFetchApp: {fetch: () => { throw new Error('KHONG_DUNG_URLFETCH'); }},
  khoDanhSachKey_: () => (GIA_LAP ? ['gia_lap'] : keys),
  khoGoi_: (_nhom, model, body) => {
    if (GIA_LAP) {
      const p = ((body.contents && body.contents[0] && body.contents[0].parts && body.contents[0].parts[0] && body.contents[0].parts[0].text) || '');
      const payload = /CHUYÊN ĐỀ DÀI 10 PHÚT/i.test(p)
        ? {lop: '12', mon: 'THUC_TE', chu_de: 'Chuyên đề 10 phút: Tối ưu bể', de_bai: 'Xây bể chứa nước không nắp đáy vuông thể tích 32m3. Tìm diện tích nhỏ nhất.', dap_an: '48', yeu_to_tu_duy: 'Cô-si', bay_thuong_gap: 'Quên bỏ nắp'}
        : [{dang: 'toi_uu_hop', chu_de: 'Hộp chữ nhật', de_bai: 'Cắt 4 góc hình vuông cạnh x từ tấm bìa vuông 60cm để gấp hộp không nắp thể tích lớn nhất.', dap_an: '10', diem_tu_duy: 9, yeu_to_tu_duy: 'Cực trị', bay_thuong_gap: 'Điều kiện 0<x<30'}];
      return {ok: true, code: 200, raw: JSON.stringify({candidates: [{content: {parts: [{text: JSON.stringify(payload)}]}}]})};
    }
    const danhSach = String(chMap.DANH_SACH_MODEL || '').split(/[\s,;]+/).filter(Boolean);
    const models = danhSach.length ? danhSach : [model, chMap.MODEL_CHINH, chMap.MODEL_DU_PHONG, chMap.MODEL_DU_PHONG_2, 'gemini-2.5-flash'].filter(Boolean);
    const t = path.join(os.tmpdir(), 'sd_gem_' + Date.now() + '.json');
    fs.writeFileSync(t, JSON.stringify({model, models, bodies: [body], keys}));
    try {
      const s = execFileSync(process.execPath, [path.join(__dirname, 'goi_gemini.js'), t], {encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, timeout: 480000, stdio: ['ignore', 'pipe', 'inherit']});
      return JSON.parse(s)[0];
    } catch (e) {
      return {ok: false, code: 0, raw: 'LOI_TIEN_TRINH: ' + String(e && e.message || e).slice(0, 200)};
    } finally {
      try { fs.unlinkSync(t); } catch (e) {}
    }
  },
};

vm.createContext(ctx);
for (const f of ['BoPhan1.gs', 'PromptKichBan.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'NangCao.gs', 'SanPham.gs', 'ZaloDeBai.gs']) {
  const p = path.join(GOC, f);
  if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, {filename: f});
}

vm.runInContext(`
  THOI_GIAN_TOI_DA_MS = 12 * 60 * 1000;
  _bat_dau_chay_ = Date.now();
  cauHinh_ = function (k) { return __ch[k] !== undefined && __ch[k] !== '' ? __ch[k] : MAC_DINH[k]; };
  docHang_ = function () { return __hang; };
  docMaBamLuuTru_ = function () { var o = {}; (__maBam || []).forEach(function (b) { if (b) o[b] = true; }); return o; };
  themHang_ = function (_sh, obj) { __added.push(obj); __hang.push(obj); };
  nhatKy_ = function (m, nd) { __nk.push([new Date().toISOString(), m, String(nd).slice(0, 400)]); console.log(m + ': ' + nd); };
`, Object.assign(ctx, {__ch: chMap, __hang: fakeHang, __maBam: dl.ma_bam || [], __added: addedRows, __nk: out.nhat_ky}));

try {
  const bc = {moi: 0, giai_ok: 0, loai: 0, kich_ban: 0, loi: 0};
  ctx.sinhDeNeuCan_({}, bc);
  out.ok = true;
  out.de = addedRows.map((x) => {
    const y = Object.assign({}, x);
    if (y.cap_nhat instanceof Date) y.cap_nhat = y.cap_nhat.toISOString();
    return y;
  });
  out.lop_ke = props.LOP_KE || null;
  out.mon_ke = props.MON_KE || null;
  out.ngay_10p = props.DA_SINH_10P_NGAY || '';
  out.lop_10p = props.LOP_10P_KE || null;
  console.log(`SINH_DE xong: ${out.de.length} đề mới`);
} catch (e) {
  out.loi = String(e && e.message || e).slice(0, 300);
  console.error('SINH_DE loi:', out.loi);
}
fs.writeFileSync(RA, JSON.stringify(out));
