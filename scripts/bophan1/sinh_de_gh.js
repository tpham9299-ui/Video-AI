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
const keys = String(process.env.GEMINI_KEYS || process.env.GEMINI_API_KEY || '').split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
const out = {ok: false, de: [], lop_ke: null, mon_ke: null, ngay_10p: '', lop_10p: null, nhat_ky: [], loi: ''};

if (!keys.length) {
  out.loi = 'THIEU_GEMINI_KEYS';
  fs.writeFileSync(RA, JSON.stringify(out));
  process.exit(1);
}

const addedRows = [];
const props = Object.assign({}, dl.props || {});
const chMap = dl.cau_hinh || {};
const fakeHang = (dl.gan_day || []).map((x) => ({chu_de: x.chu_de || '', de_bai: x.de_bai || '', ma_bam: x.ma_bam || '', trang_thai: x.trang_thai || 'MOI', id: x.id || ''}));

const ctx = {
  SpreadsheetApp: {getActiveSpreadsheet: () => ({getSheetByName: () => ({getName: () => 'HANG_DOI'})}), flush: () => {}},
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
  khoDanhSachKey_: () => keys,
  khoGoi_: (_nhom, model, body) => {
    const danhSach = String(chMap.DANH_SACH_MODEL || '').split(/[\s,;]+/).filter(Boolean);
    const models = danhSach.length ? danhSach : [model, chMap.MODEL_CHINH, chMap.MODEL_DU_PHONG, chMap.MODEL_DU_PHONG_2, 'gemini-2.5-flash'].filter(Boolean);
    const t = path.join(os.tmpdir(), 'sd_gem_' + Date.now() + '.json');
    fs.writeFileSync(t, JSON.stringify({model, models, bodies: [body], keys, hedgeGiay: 35}));
    try {
      const s = execFileSync(process.execPath, [path.join(__dirname, 'goi_gemini.js'), t], {encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit']});
      return JSON.parse(s)[0];
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
  out.ngay_10p = props.NGAY_SINH_VIDEO_10P || '';
  out.lop_10p = props.LOP_VIDEO_10P_KE || null;
  console.log(`SINH_DE xong: ${out.de.length} đề mới`);
} catch (e) {
  out.loi = String(e && e.message || e).slice(0, 300);
  console.error('SINH_DE loi:', out.loi);
}
fs.writeFileSync(RA, JSON.stringify(out));
