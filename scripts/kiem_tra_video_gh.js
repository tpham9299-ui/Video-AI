// BỘ PHẬN 3 TRÊN GITHUB: chạy AI kiểm duyệt lưới khung hình (aiChamVideo_ + tinhDapUng_ trong NangCao.gs)
// bằng cụm key GEMINI_KEYS trên GitHub, rồi trả kết quả về Apps Script (doPost loai = 'ai_xem').
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {execFileSync} = require('child_process');

const GOC = path.resolve(__dirname, '..');
const RA = process.env.KT_RA || path.join(GOC, 'ket_qua_kt_video.json');
const dl = process.env.KT_DU_LIEU ? JSON.parse(process.env.KT_DU_LIEU) : {};
const keys = String(process.env.GEMINI_KEYS || process.env.GEMINI_API_KEY || '').split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
const out = {id: (dl.hang && dl.hang.id) || process.env.ID_VIDEO || '', ok: false, kq: null, loi: ''};

if (!keys.length) {
  out.loi = 'THIEU_GEMINI_KEYS';
  fs.writeFileSync(RA, JSON.stringify(out));
  process.exit(1);
}

const fileDir = '/tmp/kt_files';
const docFile = (fid) => {
  const dir = path.join(fileDir, String(fid));
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir)[0];
  return f ? fs.readFileSync(path.join(dir, f)) : null;
};

const props = {};
const ctx = {
  SpreadsheetApp: {getActiveSpreadsheet: () => ({getSheetByName: () => null}), flush: () => {}},
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => (k in props ? String(props[k]) : null),
      setProperty: (k, v) => { props[k] = String(v); },
      getProperties: () => ({...props}),
    }),
  },
  CacheService: {getScriptCache: () => ({get: () => null, put: () => {}, remove: () => {}})},
  Utilities: {
    base64Encode: (b) => Buffer.from(b).toString('base64'),
    sleep: (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(ms, 60000)),
  },
  Logger: {log: (s) => console.log(String(s))},
  DriveApp: {
    getFileById: (id) => {
      const buf = docFile(id);
      if (!buf) throw new Error('KHONG_THAY_FILE_DRIVE_' + id);
      return {
        getBlob: () => ({
          getBytes: () => buf,
          getDataAsString: () => buf.toString('utf8'),
          getContentType: () => /\.json$/i.test(String(id)) ? 'application/json' : 'image/jpeg',
        }),
      };
    },
  },
  ScriptApp: {getProjectTriggers: () => [], newTrigger: () => ({}), deleteTrigger: () => {}},
  UrlFetchApp: {fetch: () => { throw new Error('KHONG_DUNG_URLFETCH'); }},
  khoDanhSachKey_: () => keys,
  khoGoi_: (_nhom, model, body) => {
    const ch = dl.cau_hinh || {};
    const danhSach = String(ch.DANH_SACH_MODEL || '').split(/[\s,;]+/).filter(Boolean);
    const models = danhSach.length ? danhSach : [model, ch.MODEL_CHINH, ch.MODEL_DU_PHONG, ch.MODEL_DU_PHONG_2].filter(Boolean);   // v98.2: goi_gemini.js tự xếp hạng model sống
    const t = path.join(require('os').tmpdir(), 'kt_gem_' + Date.now() + '.json');
    fs.writeFileSync(t, JSON.stringify({model, models, bodies: [body], keys, cheDo: 'nhe'}));
    try {
      const s = execFileSync(process.execPath, [path.join(__dirname, 'bophan1', 'goi_gemini.js'), t], {encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, timeout: 480000, stdio: ['ignore', 'pipe', 'inherit']});
      return JSON.parse(s)[0];
    } catch (e) {
      return {ok: false, code: 0, raw: 'LOI_TIEN_TRINH: ' + String(e && e.message || e).slice(0, 200)};
    } finally {
      try { fs.unlinkSync(t); } catch (e) {}
    }
  },
};

vm.createContext(ctx);
for (const f of ['BoPhan1.gs', 'NangCao.gs', 'SanPham.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs', 'SanKhau.gs']) {
  const p = path.join(GOC, f);
  if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, {filename: f});
}

vm.runInContext(`
  THOI_GIAN_TOI_DA_MS = 12 * 60 * 1000;
  _bat_dau_chay_ = Date.now();
  cauHinh_ = function (k) { return __ch[k] !== undefined ? __ch[k] : MAC_DINH[k]; };
  quyTacHocChoKiemDuyet_ = function () { return __qt || []; };
  anhDeChoGemini_ = function () { return __anhDe; };
  nhatKy_ = function (m, nd) { console.log(m + ': ' + nd); };
`, Object.assign(ctx, {
  __ch: dl.cau_hinh || {},
  __qt: dl.quy_tac_kd || [],
  __anhDe: (() => {
    const fid = dl.hang && dl.hang.file_anh;
    if (!fid || /^https?:/i.test(String(fid))) return null;
    const buf = docFile(fid);
    return buf ? {mime: 'image/jpeg', data: buf.toString('base64')} : null;
  })(),
}));

try {
  const r = dl.hang || {};
  const kq = ctx.aiChamVideo_(r);
  out.anh_kt = r.anh_kt;
  out.ok = true;
  out.kq = kq;
  console.log(`AI_XEM [${out.id}]: ${kq.phan_tram}% (dat=${kq.dat})`);
} catch (e) {
  out.loi = String(e && e.message || e).slice(0, 300);
  console.error('AI_XEM loi:', out.loi);
}
fs.writeFileSync(RA, JSON.stringify(out));
