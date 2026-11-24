// MODEL GEMINI ĐỘNG (v98.2): không phụ thuộc danh sách model cố định.
//  - ListModels (GET /v1beta/models) -> chỉ giữ model văn bản gọi được generateContent.
//  - Tự xếp hạng theo số phiên bản (3.1 > 3.0 > 2.5) và theo chế độ: 'nang' (giải toán / kịch bản / Lego) | 'nhe' (kiểm duyệt / sửa nhanh).
//  - Cache: bộ nhớ theo key + tệp tạm theo ngày (mỗi job chỉ gọi ListModels 1 lần cho mỗi key mới).
//  - Nhớ cặp (model, key) trả 404 trong NGÀY (giờ Thái Bình Dương, cùng mốc reset hạn mức 429).
// Bản ES5 tương đương nằm trong BoPhan1.gs (locModelGemini_, xepHangModel_, goiYModel404_) - test so khớp: scripts/test_model_gemini.cjs
// ListModels chỉ xác nhận khả năng generateContent. Quyền và quota được xác định khi gọi.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// Dự phòng khi ListModels lỗi mạng / bị chặn (đã bỏ 2.0-flash, 2.5-flash, 2.5-pro)
const DU_PHONG = ['gemini-3.1-pro', 'gemini-3.0-flash', 'gemini-pro-latest', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
// Model chuyên dụng không hợp viết kịch bản / trả JSON / đọc ảnh đề
const LOAI_BO_RE = /embedding|imagen|veo|tts|audio|transcribe|aqa|bisheng|robotics|computer-use|learnlm|gemma|image|live|vision/i;

function tenGon(m) { return String((m && m.name) || m || '').trim().replace(/^models\//, ''); }

// Bộ lọc phản hồi ListModels: [{name, supportedGenerationMethods}] -> [tên]
function locModel(dsTho) {
  const ra = [];
  for (const m of dsTho || []) {
    const ten = tenGon(m);
    const ph = (m && m.supportedGenerationMethods) || [];
    if (!/^gemini-/i.test(ten) || ph.indexOf('generateContent') < 0 || LOAI_BO_RE.test(ten)) continue;
    if (ra.indexOf(ten) < 0) ra.push(ten);
  }
  return ra;
}

// Phân tích tên: phiên bản [chính, phụ], hạng pro|flash|lite|khac, bí danh -latest, gốc (bỏ đuôi snapshot)
const DUOI_SNAP_RE = /-(\d{3}|exp(-[\w.-]*)?|preview(-[\w.-]*)?|\d{2}-\d{2}(-\d{2,4})?|\d{4}(-\d{2}){0,2})$/i;
function phanTich(ten) {
  const t = String(ten).toLowerCase();
  const mb = /^gemini-(\d+)(?:\.(\d+))?-/.exec(t);
  const latest = /latest/.test(t);
  const hang = /flash-lite|lite/.test(t) ? 'lite' : /flash/.test(t) ? 'flash' : /pro/.test(t) ? 'pro' : 'khac';
  let goc = t, snap = 0;
  for (let i = 0; i < 4 && DUOI_SNAP_RE.test(goc); i++) {
    const d = DUOI_SNAP_RE.exec(goc)[0];
    snap = Math.max(snap, /preview/.test(d) && !/\d/.test(d) ? 1 : 2);   // 0 ổn định | 1 preview trơn | 2 có ngày / -001 / -exp
    goc = goc.slice(0, -d.length);
  }
  return {ten, ban: mb ? [Number(mb[1]), Number(mb[2] || 0)] : null, hang, latest, goc, snap};
}
const soBan = (a, b) => (b[0] - a[0]) || (b[1] - a[1]);

// Mỗi gốc (vd gemini-2.5-flash) giữ MỘT bản: ổn định > preview trơn > snapshot có ngày (chuỗi dài hơn = mới hơn)
function boTrungSnapshot(ds) {
  const tot = new Map();
  for (const ten of ds) {
    const p = phanTich(ten);
    const cu = tot.get(p.goc);
    if (!cu || p.snap < cu.snap || (p.snap === cu.snap && p.ten > cu.ten)) tot.set(p.goc, p);
  }
  return ds.filter((ten) => [...tot.values()].some((p) => p.ten === ten));
}

// Xếp hạng. nang: pro mới nhất -> flash mới nhất -> pro-latest -> flash-latest -> flash-lite -> còn lại
//           nhe : flash mới nhất -> flash-latest -> flash-lite -> pro mới nhất -> pro-latest -> còn lại
// "Mới nhất" so số phiên bản: pro cũ hơn flash thì flash lên trước (bản mới nhất luôn đứng đầu).
function xepHang(ds, cheDo = 'nang') {
  const nhe = cheDo === 'nhe';
  const ps = boTrungSnapshot([...new Set(ds.map(tenGon).filter(Boolean))]).map(phanTich);
  const coBan = (h) => ps.filter((p) => p.hang === h && p.ban && !p.latest).sort((a, b) => soBan(a.ban, b.ban) || a.snap - b.snap);
  const biDanh = (h) => ps.filter((p) => p.hang === h && p.latest);
  const pro = coBan('pro'), flash = coBan('flash'), lite = coBan('lite');
  const dau = [];
  const them = (p) => { if (p && dau.indexOf(p) < 0) dau.push(p); };
  let moiNhat = [pro[0], flash[0]].filter(Boolean);
  if (moiNhat.length === 2) {
    const s = soBan(pro[0].ban, flash[0].ban);
    moiNhat = s < 0 || (s === 0 && !nhe) ? [pro[0], flash[0]] : [flash[0], pro[0]];
  }
  if (nhe) {
    them(flash[0]); biDanh('flash').forEach(them); them(lite[0]); biDanh('lite').forEach(them);
    them(pro[0]); biDanh('pro').forEach(them);
  } else {
    moiNhat.forEach(them); biDanh('pro').forEach(them); biDanh('flash').forEach(them);
    them(lite[0]); biDanh('lite').forEach(them);
  }
  const thuTuHang = nhe ? {flash: 0, lite: 1, pro: 2, khac: 3} : {pro: 0, flash: 1, lite: 2, khac: 3};
  const conLai = ps.filter((p) => dau.indexOf(p) < 0).sort((a, b) =>
    (a.ban && b.ban ? soBan(a.ban, b.ban) : (a.ban ? -1 : b.ban ? 1 : 0)) || (thuTuHang[a.hang] - thuTuHang[b.hang]) || a.snap - b.snap || (a.ten < b.ten ? -1 : 1));
  return dau.concat(conLai).map((p) => p.ten);
}

// Gợi ý trong thông báo 404 của Google: "... Please update your code to use models/<ten_model> ..."
function goiY404(raw) {
  const m = /(?:update your code to use|use|migrate to|switch to)\s+(?:the\s+)?(?:model\s+)?[`'"]?models\/(gemini-[\w.-]*\w)[`'".,;)\s]/i.exec(String(raw || '') + ' ');
  return m ? m[1] : '';
}

/* ---------------- cache + nhớ 404 theo ngày ---------------- */
const ngayPT = () => new Date().toLocaleDateString('en-CA', {timeZone: 'America/Los_Angeles'});
const bamKey = (k) => crypto.createHash('sha256').update(String(k)).digest('hex').slice(0, 12);
const thuMucTam = () => process.env.GEMINI_THU_MUC_TAM || os.tmpdir();
const tepDs = (k, ngay = ngayPT()) => path.join(thuMucTam(), `gemini_ds_model_${ngay}_${bamKey(k)}.json`);
const tepLoiDs = () => path.join(thuMucTam(), 'gemini_ds_model_loi.json');
const tep404 = () => path.join(thuMucTam(), 'gemini_model_404_ngay.txt');
const boNho = new Map();   // key -> Promise<[tên]>
const PHUT_NGHI_LOI_DS = 10;   // ListModels lỗi mạng: 10 phút không thử lại (mỗi lần gọi goi_gemini.js là một tiến trình mới)

async function modelVanBanTho(key, goc = 'https://generativelanguage.googleapis.com') {
  const models = [];
  const trang = new Set();
  const signal = AbortSignal.timeout(Number(process.env.GEMINI_LIST_TIMEOUT_MS) || 12000);
  let token = '';
  do {
    trang.add(token);
    const url = new URL('/v1beta/models', goc);
    url.searchParams.set('pageSize', '100');
    if (token) url.searchParams.set('pageToken', token);
    const res = await fetch(url, {headers: {'x-goog-api-key': key}, signal});
    if (!res.ok) throw new Error('LIST_MODELS_HTTP_' + res.status);
    const d = await res.json();
    models.push(...(d.models || []));
    token = d.nextPageToken;
  } while (token && !trang.has(token));
  return boTrungSnapshot(locModel(models));
}

// Danh sách model sống của MỘT key (đã lọc + bỏ trùng snapshot, xếp hạng 'nang'). Lỗi -> ném.
async function modelVanBan(key, goc) {
  if (!boNho.has(key)) {
    boNho.set(key, (async () => {
      const t = tepDs(key);
      try { const ds = JSON.parse(fs.readFileSync(t, 'utf8')); if (Array.isArray(ds) && ds.length) return ds; } catch (e) { /* chưa có cache */ }
      const ds = xepHang(await modelVanBanTho(key, goc), 'nang');
      if (ds.length) { try { fs.writeFileSync(t, JSON.stringify(ds), {mode: 0o600}); } catch (e) { /* bỏ */ } }
      return ds;
    })());
    boNho.get(key).catch(() => boNho.delete(key));
  }
  return boNho.get(key);
}

// Danh sách model sống cho cả kho key: dùng cache của key bất kỳ trong ngày, không có thì hỏi lần lượt tới khi một key trả lời.
// Không key nào trả lời -> [] (nơi gọi rơi về DU_PHONG) và nghỉ PHUT_NGHI_LOI_DS phút.
async function layModelSong(keys, {goc, toiDaKey = 3} = {}) {
  const ds = [...new Set((keys || []).filter(Boolean))];
  for (const k of ds) {
    try { const c = JSON.parse(fs.readFileSync(tepDs(k), 'utf8')); if (Array.isArray(c) && c.length) return c; } catch (e) { /* bỏ */ }
  }
  try {
    const l = JSON.parse(fs.readFileSync(tepLoiDs(), 'utf8'));
    if (Date.now() - Number(l.luc) < PHUT_NGHI_LOI_DS * 60000) return [];
  } catch (e) { /* bỏ */ }
  for (const k of ds.slice(0, toiDaKey)) {
    try { const r = await modelVanBan(k, goc); if (r.length) return r; } catch (e) { /* key kế */ }
  }
  try { fs.writeFileSync(tepLoiDs(), JSON.stringify({luc: Date.now()})); } catch (e) { /* bỏ */ }
  return [];
}

// Ghép chuỗi gọi: model chỉ định (nếu còn sống) đứng đầu, sau đó là xếp hạng tự động.
// Biết danh sách sống -> bỏ mọi tên cấu hình không còn trong đó. Không biết -> cấu hình + DU_PHONG rồi xếp hạng.
function hopNhat({song = [], chiDinh = '', cauHinh = [], cheDo = 'nang'} = {}) {
  const sach = (a) => [...new Set(a.map(tenGon).filter(Boolean))];
  const coSong = song.length > 0;
  const nen = coSong ? xepHang(song, cheDo) : xepHang(sach([...cauHinh, ...DU_PHONG]), cheDo);
  const cd = tenGon(chiDinh);
  if (cd && (!coSong || song.indexOf(cd) >= 0)) return [cd, ...nen.filter((m) => m !== cd)];
  return nen;
}

// 404 theo ngày: dòng "ngày|model|băm key"
function doc404(ngay = ngayPT()) {
  const s = new Set();
  try {
    for (const d of fs.readFileSync(tep404(), 'utf8').split('\n')) {
      const [n, m, h] = d.trim().split('|');
      if (n === ngay && m && h) s.add(m + '|' + h);
    }
  } catch (e) { /* chưa có */ }
  return s;
}
function ghi404(model, key, boNho404) {
  const kh = model + '|' + bamKey(key);
  if (boNho404 && boNho404.has(kh)) return;
  if (boNho404) boNho404.add(kh);
  try { fs.appendFileSync(tep404(), `${ngayPT()}|${kh}\n`); } catch (e) { /* bỏ */ }
}
// Model coi như chết trong ngày khi >= 2 key (hoặc mọi key còn lại nếu ít hơn) đã nhận 404
function chet404(model, keys, boNho404) {
  const ds = (keys || []).filter(Boolean);
  if (!ds.length) return false;
  const n = ds.filter((k) => boNho404.has(model + '|' + bamKey(k))).length;
  return n >= Math.min(2, ds.length);
}

module.exports = {DU_PHONG, LOAI_BO_RE, locModel, phanTich, boTrungSnapshot, xepHang, goiY404, modelVanBan, layModelSong, hopNhat,
  doc404, ghi404, chet404, bamKey, ngayPT, tepDs};

// CLI: node model_gemini.cjs --ds [nang|nhe]   (đọc GEMINI_KEYS / GEMINI_API_KEY) -> stdout JSON danh sách model sống (rỗng nếu lỗi)
if (require.main === module && process.argv[2] === '--ds') {
  const keys = [process.env.GEMINI_KEYS, process.env.GEMINI_API_KEY].filter(Boolean).join(',').split(/[\s,;]+/).filter(Boolean);
  layModelSong(keys, {goc: process.env.GEMINI_GOC}).then((ds) => process.stdout.write(JSON.stringify(xepHang(ds, process.argv[3] || 'nang'))),
    () => process.stdout.write('[]'));
}
