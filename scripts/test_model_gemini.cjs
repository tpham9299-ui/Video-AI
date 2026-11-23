// v98.2 — MODEL GEMINI ĐỘNG: bộ lọc ListModels, xếp hạng theo phiên bản + chế độ nang/nhe, bỏ trùng snapshot, gợi ý 404,
// cache theo key/ngày (ListModels đúng 1 lần), nhớ cặp (model, key) 404 trong ngày, goi_gemini.js đầu-cuối với máy chủ giả,
// so khớp bản .gs (BoPhan1.gs) <-> Node (model_gemini.cjs), danhSachModel_ / KhoKey.gs 404 theo ngày. KHÔNG gọi mạng thật.
// Chạy: node scripts/test_model_gemini.cjs
const fs = require('node:fs');
const os = require('node:os');
const vm = require('node:vm');
const path = require('node:path');
const http = require('node:http');
const {execFile} = require('node:child_process');
const assert = require('node:assert/strict');
const GOC = path.join(__dirname, '..');
const TAM = fs.mkdtempSync(path.join(os.tmpdir(), 'test_model_gemini_'));
process.env.GEMINI_THU_MUC_TAM = TAM;
const M = require('./bophan1/model_gemini.cjs');

let dat = 0, loi = 0;
const t = async (ten, fn) => {
  try { await fn(); dat++; console.log('  ✓', ten); } catch (e) { loi++; console.log('  ✗', ten, '—', String(e.message).split('\n')[0]); }
};
const G = (name, methods = ['generateContent', 'countTokens']) => ({name: 'models/' + name, supportedGenerationMethods: methods});
// Phản hồi ListModels giả lập: lẫn 2.0 / 2.5 / 3.0 / 3.1, snapshot, bí danh latest, tts, embedding, imagen, gemma...
const LIST = [
  G('gemini-2.0-flash'), G('gemini-2.0-flash-001'), G('gemini-2.0-flash-exp'), G('gemini-2.0-flash-lite'),
  G('gemini-2.5-flash'), G('gemini-2.5-flash-preview-05-20'), G('gemini-2.5-pro'), G('gemini-2.5-flash-lite'),
  G('gemini-2.5-flash-preview-tts'), G('gemini-2.5-flash-image'), G('gemini-2.5-computer-use-preview-10-2025'),
  G('gemini-3.0-flash'), G('gemini-3.0-flash-001'), G('gemini-3.1-pro'), G('gemini-3.1-pro-preview'), G('gemini-3.1-flash-lite'),
  G('gemini-pro-latest'), G('gemini-flash-latest'), G('gemini-flash-lite-latest'),
  G('gemini-embedding-001', ['embedContent']), G('text-embedding-004', ['embedContent']), G('imagen-4.0-generate-001', ['predict']),
  G('veo-3.0-generate-001', ['predictLongRunning']), G('gemma-3-27b-it'), G('aqa', ['generateAnswer']), G('learnlm-2.0-flash-experimental'),
  G('gemini-robotics-er-1.5-preview'), G('gemini-2.5-flash-native-audio-latest'), G('gemini-3.1-pro-embedding', ['embedContent']),
];

(async () => {
  console.log('1. Bộ lọc ListModels');
  const loc = M.locModel(LIST);
  await t('chỉ giữ gemini-* có generateContent', () => assert.ok(loc.every((m) => /^gemini-/.test(m))));
  await t('loại tts / embedding / imagen / veo / gemma / aqa / learnlm / robotics / computer-use / audio / image', () => {
    for (const x of ['tts', 'embedding', 'imagen', 'veo', 'gemma', 'aqa', 'learnlm', 'robotics', 'computer-use', 'audio', 'image']) assert.ok(!loc.some((m) => m.includes(x)), x);
  });
  await t('giữ bí danh -latest văn bản', () => ['gemini-pro-latest', 'gemini-flash-latest', 'gemini-flash-lite-latest'].forEach((m) => assert.ok(loc.includes(m), m)));

  console.log('2. Bỏ trùng snapshot');
  const sach = M.boTrungSnapshot(loc);
  await t('2.0-flash giữ bản ổn định, bỏ -001 / -exp', () => { assert.ok(sach.includes('gemini-2.0-flash')); assert.ok(!sach.includes('gemini-2.0-flash-001') && !sach.includes('gemini-2.0-flash-exp')); });
  await t('3.1-pro ổn định thắng -preview; 2.5-flash thắng -preview-05-20', () => { assert.ok(!sach.includes('gemini-3.1-pro-preview')); assert.ok(!sach.includes('gemini-2.5-flash-preview-05-20')); });
  await t('chỉ có preview -> giữ preview', () => assert.deepEqual(M.boTrungSnapshot(['gemini-3.5-pro-preview', 'gemini-3.5-pro-preview-11-2026']), ['gemini-3.5-pro-preview']));
  await t('phân tích phiên bản 3.1 / 3 / 2.0', () => {
    assert.deepEqual(M.phanTich('gemini-3.1-pro').ban, [3, 1]);
    assert.deepEqual(M.phanTich('gemini-3-flash-preview').ban, [3, 0]);
    assert.equal(M.phanTich('gemini-flash-latest').ban, null);
  });

  console.log('3. Xếp hạng ưu tiên');
  const nang = M.xepHang(loc, 'nang'), nhe = M.xepHang(loc, 'nhe');
  await t('nang: pro mới nhất -> flash mới nhất -> pro-latest -> flash-latest -> flash-lite', () =>
    assert.deepEqual(nang.slice(0, 6), ['gemini-3.1-pro', 'gemini-3.0-flash', 'gemini-pro-latest', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest']));
  await t('nhe: flash mới nhất -> flash-latest -> flash-lite -> pro', () =>
    assert.deepEqual(nhe.slice(0, 6), ['gemini-3.0-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-pro', 'gemini-pro-latest']));
  await t('bản cũ 2.5 / 2.0 xếp sau mọi bản mới và bí danh', () => {
    const i25 = nang.indexOf('gemini-2.5-pro'), i20 = nang.indexOf('gemini-2.0-flash');
    assert.ok(i25 > nang.indexOf('gemini-flash-lite-latest') && i20 > i25);
  });
  await t('3.10 > 3.9 (so số, không so chuỗi)', () => assert.equal(M.xepHang(['gemini-3.9-pro', 'gemini-3.10-pro'])[0], 'gemini-3.10-pro'));
  await t('pro cũ hơn flash -> flash mới nhất lên đầu (nang)', () => assert.equal(M.xepHang(['gemini-2.5-pro', 'gemini-3.0-flash'], 'nang')[0], 'gemini-3.0-flash'));
  await t('không lặp tên', () => assert.equal(new Set(nang).size, nang.length));

  console.log('4. Gợi ý model trong thông báo 404');
  const raw404 = JSON.stringify({error: {code: 404, message: 'models/gemini-2.5-pro is not found for API version v1beta, or is not supported for generateContent. Please update your code to use models/gemini-3.1-pro.', status: 'NOT_FOUND'}});
  await t('rút đúng tên model gợi ý (kể cả dấu chấm cuối câu)', () => assert.equal(M.goiY404(raw404), 'gemini-3.1-pro'));
  await t('không có gợi ý -> rỗng', () => assert.equal(M.goiY404('{"error":{"message":"models/x is not found"}}'), ''));

  console.log('5. Dự phòng & ghép chuỗi');
  await t('dự phòng sạch: không còn 2.0-flash / 2.5-flash / 2.5-pro', () => {
    for (const x of ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro']) assert.ok(!M.DU_PHONG.includes(x));
    for (const x of ['gemini-3.1-pro', 'gemini-3.0-flash', 'gemini-pro-latest', 'gemini-flash-latest']) assert.ok(M.DU_PHONG.includes(x));
  });
  await t('biết danh sách sống -> bỏ tên cấu hình đã khai tử', () => {
    const c = M.hopNhat({song: ['gemini-3.1-pro', 'gemini-3.0-flash'], chiDinh: 'gemini-2.5-pro', cauHinh: ['gemini-2.0-flash']});
    assert.deepEqual(c, ['gemini-3.1-pro', 'gemini-3.0-flash']);
  });
  await t('model chỉ định còn sống -> đứng đầu', () => assert.equal(M.hopNhat({song: nang, chiDinh: 'gemini-flash-latest'})[0], 'gemini-flash-latest'));
  await t('ListModels lỗi -> cấu hình + dự phòng, xếp hạng', () => assert.equal(M.hopNhat({song: [], cauHinh: ['gemini-2.5-flash']})[0], 'gemini-3.1-pro'));

  console.log('6. Máy chủ giả: cache ListModels + goi_gemini.js đầu-cuối');
  const dem = {list: 0, goi: []};
  let che404 = new Set(['gemini-3.1-pro']);
  const sv = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => {
      const u = new URL(req.url, 'http://x');
      if (req.method === 'GET' && u.pathname === '/v1beta/models') {
        dem.list++;
        if (req.headers['x-goog-api-key'] === 'key_hong') { res.writeHead(400); return res.end('{"error":{"message":"API key not valid"}}'); }
        const trang = u.searchParams.get('pageToken') === 'p2';
        res.writeHead(200, {'Content-Type': 'application/json'});
        return res.end(JSON.stringify(trang ? {models: LIST.slice(10)} : {models: LIST.slice(0, 10), nextPageToken: 'p2'}));
      }
      const m = /^\/v1beta\/models\/([^:]+):generateContent$/.exec(u.pathname);
      if (m) {
        const md = decodeURIComponent(m[1]);
        dem.goi.push(md);
        if (che404.has(md)) { res.writeHead(404); return res.end(JSON.stringify({error: {code: 404, message: `models/${md} is not found for API version v1beta. Please update your code to use models/gemini-3.5-pro.`}})); }
        res.writeHead(200, {'Content-Type': 'application/json'});
        return res.end(JSON.stringify({candidates: [{content: {parts: [{text: JSON.stringify({ok: true, md})}]}}]}));
      }
      res.writeHead(404); res.end('{}');
    });
  });
  await new Promise((r) => sv.listen(0, '127.0.0.1', r));
  const GOC_GIA = `http://127.0.0.1:${sv.address().port}`;

  await t('ListModels gom đủ 2 trang, cache tệp theo key/ngày: gọi lần 2 không chạm mạng', async () => {
    const a = await M.layModelSong(['key_a'], {goc: GOC_GIA});
    assert.equal(a[0], 'gemini-3.1-pro');
    assert.ok(a.includes('gemini-flash-lite-latest'), 'trang 2');
    const n = dem.list;
    const b = await M.layModelSong(['key_a'], {goc: GOC_GIA});
    assert.deepEqual(b, a);
    assert.equal(dem.list, n, 'không gọi lại ListModels');
    assert.ok(fs.existsSync(M.tepDs('key_a')));
  });
  await t('key mới nhưng đã có cache của key khác trong ngày -> dùng lại, không gọi mạng', async () => {
    const n = dem.list;
    await M.layModelSong(['key_b', 'key_a'], {goc: GOC_GIA});
    assert.equal(dem.list, n);
  });
  await t('key hỏng -> thử key kế; mọi key lỗi -> [] và nghỉ 10 phút', async () => {
    const tam2 = fs.mkdtempSync(path.join(os.tmpdir(), 'tmg2_'));
    process.env.GEMINI_THU_MUC_TAM = tam2;
    const n = dem.list;
    assert.deepEqual(await M.layModelSong(['key_hong'], {goc: GOC_GIA}), []);
    assert.deepEqual(await M.layModelSong(['key_hong'], {goc: GOC_GIA}), []);
    assert.equal(dem.list, n + 1, 'lần 2 không gọi lại trong 10 phút');
    process.env.GEMINI_THU_MUC_TAM = TAM;
  });
  await t('nhớ 404 theo ngày: ghi404 -> doc404, chet404 khi >= 2 key (hoặc mọi key)', () => {
    const s = new Set();
    M.ghi404('gemini-x', 'k1', s);
    assert.ok(M.doc404().has('gemini-x|' + M.bamKey('k1')));
    assert.ok(!M.chet404('gemini-x', ['k1', 'k2', 'k3'], s));
    assert.ok(M.chet404('gemini-x', ['k1'], s));
    M.ghi404('gemini-x', 'k2', s);
    assert.ok(M.chet404('gemini-x', ['k1', 'k2', 'k3'], s));
    assert.ok(!M.doc404('2000-01-01').size, 'ngày khác -> trống');
  });

  const chayGoi = (cfg) => new Promise((giai) => {
    const tep = path.join(TAM, 'yc_' + Date.now() + Math.random() + '.json');
    fs.writeFileSync(tep, JSON.stringify(cfg));
    execFile(process.execPath, [path.join(GOC, 'scripts/bophan1/goi_gemini.js'), tep],
      {env: {...process.env, GEMINI_GOC: GOC_GIA, TMP: TAM, TEMP: TAM, TMPDIR: TAM}, timeout: 60000}, (e, so, se) => giai({kq: JSON.parse(so || '[]'), se: String(se)}));
  });
  const body = {contents: [{parts: [{text: 'x'}]}], generationConfig: {temperature: 0}};
  await t('goi_gemini.js: 3.1-pro 404 + gợi ý 3.5-pro -> chèn 3.5-pro thử ngay, gọi thành công', async () => {
    dem.goi = [];
    const {kq, se} = await chayGoi({model: 'gemini-1.5-pro', models: ['gemini-1.0-pro'], bodies: [body], keys: ['key_e2e']});
    assert.ok(kq[0].ok, se);
    assert.equal(kq[0].model, "gemini-3.5-pro", JSON.stringify(kq[0]).slice(0,200) + " | " + dem.goi.join(",") + " | " + se.slice(0,600));
    assert.deepEqual(dem.goi, ['gemini-3.1-pro', 'gemini-3.5-pro'], 'không thử tên cấu hình đã khai tử (không có trong ListModels)');
    assert.ok(/GOI_Y_MODEL/.test(se));
  });
  await t('goi_gemini.js lần 2 cùng ngày: bỏ qua cặp (3.1-pro, key) đã 404, không gọi lại ListModels', async () => {
    dem.goi = [];
    const n = dem.list;
    try { fs.unlinkSync(path.join(TAM, 'gemini_model_tot_nhat.txt')); } catch (e) { /* chưa có */ }
    const {kq} = await chayGoi({model: '', bodies: [body], keys: ['key_e2e'], cheDo: 'nang'});
    assert.ok(kq[0].ok);
    assert.ok(!dem.goi.includes('gemini-3.1-pro'), dem.goi.join(','));
    assert.equal(dem.goi[0], 'gemini-3.0-flash');
    assert.equal(dem.list, n);
  });
  await t('goi_gemini.js cheDo nhe: flash mới nhất trước', async () => {
    dem.goi = []; che404 = new Set();
    try { fs.unlinkSync(path.join(TAM, 'gemini_model_tot_nhat.txt')); } catch (e) { /* bỏ */ }
    const {kq} = await chayGoi({model: '', bodies: [body], keys: ['key_e2e'], cheDo: 'nhe'});
    assert.ok(kq[0].ok);
    assert.equal(dem.goi[0], 'gemini-3.0-flash');
  });
  await t('goi_gemini.js ListModels lỗi -> danh sách dự phòng sạch', async () => {
    dem.goi = [];
    const tam3 = fs.mkdtempSync(path.join(os.tmpdir(), 'tmg3_'));
    const {kq, se} = await new Promise((giai) => {
      const tep = path.join(tam3, 'yc.json');
      fs.writeFileSync(tep, JSON.stringify({model: '', bodies: [body], keys: ['key_hong'], cheDo: 'nang'}));
      execFile(process.execPath, [path.join(GOC, 'scripts/bophan1/goi_gemini.js'), tep],
        {env: {...process.env, GEMINI_GOC: GOC_GIA, GEMINI_THU_MUC_TAM: tam3, TMP: tam3, TEMP: tam3, TMPDIR: tam3}, timeout: 60000}, (e, so, se2) => giai({kq: JSON.parse(so || '[]'), se: String(se2)}));
    });
    assert.ok(/MODEL_DU_PHONG/.test(se));
    assert.equal(dem.goi[0], 'gemini-3.1-pro');
    assert.ok(kq[0].ok);
  });
  sv.close();

  console.log('7. Apps Script (.gs) so khớp Node + danhSachModel_ + KhoKey 404 theo ngày');
  const props = {}, bo = {}, cauHinh = {DANH_SACH_MODEL: 'gemini-2.5-flash,gemini-2.0-flash', MODEL_BIEN_KICH: 'gemini-2.5-pro'};
  let fetchDem = 0, phanHoi = () => ({code: 200, text: JSON.stringify({models: LIST})});
  const ctx = vm.createContext({
    PropertiesService: {getScriptProperties: () => ({getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); },
      getProperties: () => ({...props}), setProperties: (o) => Object.assign(props, o)})},
    CacheService: {getScriptCache: () => ({get: (k) => (k in bo ? bo[k] : null), put: (k, v) => { bo[k] = String(v); }, remove: (k) => { delete bo[k]; }, getAll: (ks) => Object.fromEntries(ks.filter((k) => k in bo).map((k) => [k, bo[k]]))})},
    UrlFetchApp: {fetch: (url, o) => { fetchDem++; const r = phanHoi(url, o); return {getResponseCode: () => r.code, getContentText: () => r.text}; }},
    Utilities: {formatDate: (d, tz) => d.toLocaleDateString('en-CA', {timeZone: tz}), sleep() {},
      computeDigest: (_a, s) => Array.from(require('node:crypto').createHash('md5').update(String(s)).digest()), DigestAlgorithm: {MD5: 'MD5'}, Charset: {UTF_8: 'UTF_8'}},
    SpreadsheetApp: {getActiveSpreadsheet: () => ({getSheetByName: () => null})}, Logger: {log() {}},
  });
  for (const f of ['BoPhan1.gs', 'KhoKey.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
  Object.assign(ctx, {cauHinh_: (k) => cauHinh[k] || '', nhatKy_: () => {}});
  props.GEMINI_API_KEY = 'gk1,gk2,gk3';
  const J = (x) => JSON.parse(JSON.stringify(x));
  await t('locModelGemini_ == locModel', () => assert.deepEqual(J(ctx.locModelGemini_(LIST)), loc));
  for (const cd of ['nang', 'nhe']) {
    await t(`xepHangModel_ == xepHang (${cd}, 6 bộ dữ liệu)`, () => {
      for (const ds of [loc, sach, M.DU_PHONG, ['gemini-2.5-pro', 'gemini-3.0-flash'], ['gemini-3.9-pro', 'gemini-3.10-pro', 'gemini-exp-1206'], ['gemini-3.5-pro-preview', 'gemini-3.5-pro-preview-11-2026', 'gemini-3-flash-preview']]) {
        assert.deepEqual(J(ctx.xepHangModel_(ds, cd)), M.xepHang(ds, cd), ds.join(','));
      }
    });
  }
  await t('goiYModel404_ == goiY404', () => { assert.equal(ctx.goiYModel404_(raw404), M.goiY404(raw404)); assert.equal(ctx.goiYModel404_('x'), ''); });
  await t('MODEL_CHUAN_DU_PHONG_ == DU_PHONG', () => assert.deepEqual(J(vm.runInContext('MODEL_CHUAN_DU_PHONG_', ctx)), M.DU_PHONG));
  await t('danhSachModel_: ListModels 1 lần rồi CacheService 6 giờ; tên cấu hình khai tử bị bỏ', () => {
    fetchDem = 0;
    const a = J(ctx.danhSachModel_('nang'));
    assert.equal(a[0], 'gemini-3.1-pro');
    assert.ok(!a.includes('gemini-2.5-flash-preview-tts'));
    ctx.danhSachModel_('nhe'); ctx.danhSachModel_('nang');
    assert.equal(fetchDem, 1, 'chỉ gọi ListModels 1 lần');
    assert.ok(bo.DS_MODEL_SONG);
    assert.equal(ctx.danhSachModel_('nhe')[0], 'gemini-3.0-flash');
  });
  await t('tuyChonBienKich_: MODEL_BIEN_KICH khai tử (không còn trong ListModels) -> pro sống mới nhất', () => {
    const live = JSON.parse(bo.DS_MODEL_SONG).filter((m) => m !== 'gemini-2.5-pro');
    bo.DS_MODEL_SONG = JSON.stringify(live);
    assert.equal(ctx.tuyChonBienKich_().modelUuTien, 'gemini-3.1-pro');
  });
  await t('ListModels lỗi -> cấu hình + dự phòng sạch, nghỉ 10 phút', () => {
    delete bo.DS_MODEL_SONG; fetchDem = 0;
    phanHoi = () => ({code: 403, text: '{}'});
    const a = J(ctx.danhSachModel_('nang'));
    assert.equal(a[0], 'gemini-3.1-pro');
    assert.ok(bo.DS_MODEL_SONG_LOI);
    ctx.danhSachModel_('nang');
    assert.equal(fetchDem, 3, 'thử tối đa 3 key, lần 2 không thử lại');
  });
  await t('KhoKey: 404 ghi cặp (model, key) trong ngày; key đó bị bỏ, hết key -> MODEL_KHONG_CO_HOM_NAY', () => {
    delete bo.DS_MODEL_SONG_LOI;
    props.GEMINI_API_KEY = 'gk1';
    phanHoi = () => ({code: 404, text: raw404});
    const r1 = ctx.khoGoi_('VIDEO', 'gemini-2.5-pro', {contents: []}, {hanChoMs: 0});
    assert.equal(r1.code, 404);
    assert.ok(JSON.parse(props.MODEL_404_NGAY).cap['gemini-2.5-pro|' + ctx.khoId_('gk1')]);
    const n = fetchDem;
    const r2 = ctx.khoGoi_('VIDEO', 'gemini-2.5-pro', {contents: []}, {hanChoMs: 0});
    assert.equal(r2.code, 404);
    assert.ok(/MODEL_KHONG_CO_HOM_NAY/.test(r2.raw));
    assert.equal(fetchDem, n, 'không gọi lại');
    assert.ok(ctx.model404HomNay_('gemini-2.5-pro'));
    props.MODEL_404_NGAY = JSON.stringify({ngay: '2000-01-01', cap: {['gemini-2.5-pro|' + ctx.khoId_('gk1')]: 1}});
    assert.ok(!ctx.model404HomNay_('gemini-2.5-pro'), 'sang ngày mới tự bỏ');
  });
  await t('goiGemini_: 404 kèm gợi ý -> thử model gợi ý ngay sau', () => {
    const goi = [];
    Object.assign(ctx, {conDuGoiGemini_: () => true, duThoiGian_: () => true,
      khoGoi_: (_n, md) => { goi.push(md); return md === 'gemini-3.1-pro' ? {ok: false, code: 404, raw: raw404} : {ok: true, code: 200, raw: JSON.stringify({candidates: [{content: {parts: [{text: '{"ok":1}'}]}}]})}; }});
    bo.DS_MODEL_SONG = JSON.stringify(['gemini-3.1-pro', 'gemini-3.0-flash']);
    Object.keys(bo).filter((k) => /^MODEL_HONG_|^MODEL_TOT/.test(k)).forEach((k) => delete bo[k]);
    props.MODEL_404_NGAY = '{}';
    ctx.goiGemini_('x', 0.1, {});
    // gợi ý gemini-3.1-pro trùng model vừa lỗi -> bỏ; dựng gợi ý khác:
    goi.length = 0;
    Object.keys(bo).filter((k) => /^MODEL_HONG_|^MODEL_TOT/.test(k)).forEach((k) => delete bo[k]);
    ctx.khoGoi_ = (_n, md) => { goi.push(md); return md === 'gemini-3.1-pro' ? {ok: false, code: 404, raw: raw404.replace('models/gemini-3.1-pro.', 'models/gemini-3.5-pro.')} : {ok: true, code: 200, raw: JSON.stringify({candidates: [{content: {parts: [{text: '{"ok":1}'}]}}]})}; };
    ctx.goiGemini_('x', 0.1, {});
    assert.deepEqual(goi, ['gemini-3.1-pro', 'gemini-3.5-pro']);
  });

  fs.rmSync(TAM, {recursive: true, force: true});
  console.log(`\n${dat} đạt, ${loi} lỗi`);
  process.exit(loi ? 1 : 0);
})();
