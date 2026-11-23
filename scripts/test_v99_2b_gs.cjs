// v99.2b — vá 3 lỗi thực chiến trong NHAT_KY (chạy .gs trong vm + goi_gemini.js với máy chủ giả, KHÔNG gọi mạng thật):
//  1. model trả HTTP 403 (MODEL_TU_CHOI) bị chặn 12 giờ (Apps Script + GitHub), 403 do key / dự án không chặn model;
//     DOC_DE: chế độ 'nhe' (Flash trước), trần < 4 phút, báo Zalo đúng nguyên nhân (không bảo "gửi lại ảnh rõ hơn" khi do Gemini);
//  2. bai_hoc_rut_ra là chuỗi không còn nổ ".map is not a function";
//  3. lỗi tạm "người môi giới" / broker: nghỉ 2 giây, thử lại tối đa 2 lần (gửi + nhận Zalo).
// Chạy: node scripts/test_v99_2b_gs.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const GOC = path.join(__dirname, '..');

let props = {};
const cacheMem = {};
const nk = [];
let ngu = 0;
const ctx = vm.createContext({
  PropertiesService: {getScriptProperties: () => ({getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, getProperties: () => ({...props})})},
  CacheService: {getScriptCache: () => ({get: (k) => cacheMem[k] || null, put: (k, v) => { cacheMem[k] = v; }, remove: (k) => { delete cacheMem[k]; }})},
  Utilities: {sleep: (ms) => { ngu += ms; }, base64Encode: () => 'eA==', formatDate: () => '261123-000000'},
  ContentService: {createTextOutput: (s) => ({setMimeType: () => s}), MimeType: {JSON: 'json'}},
  Logger: {log: () => {}}, console,
});
for (const f of ['BoPhan1.gs', 'KiemTraHinh.gs', 'NangCao.gs', 'ZaloDeBai.gs', 'DangVideo.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
Object.assign(ctx, {cauHinh_: () => '', nhatKy_: (m, s) => nk.push(m + ': ' + s), khoDanhSachKey_: () => ['k1', 'k2'], conDuGoiGemini_: () => true, layModelSong_: () => []});
let dat = 0, loi = 0;
const t = async (ten, fn) => {
  try { await fn(); dat++; console.log('  ✓', ten); } catch (e) { loi++; console.log('  ✗', ten, '—', String(e.message).split('\n')[0]); }
};
const giong = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));   // đối tượng tạo trong vm khác realm -> so JSON
const ok = (o) => ({ok: true, code: 200, raw: JSON.stringify({candidates: [{content: {parts: [{text: JSON.stringify(o)}]}}]})});

(async () => {
  console.log('1. Chặn model 403 (MODEL_TU_CHOI) 12 giờ');
  await t('goiGemini_: model 403 bị chặn, đổi model ngay; lượt sau KHÔNG gọi lại model đó', () => {
    props = {};
    const goi = [];
    ctx.danhSachModel_ = () => ['gemini-4-carbon', 'gemini-3-flash'].filter((m) => !ctx.modelBiChan403_(m));
    ctx.khoGoiCoSuyNghi_ = (m) => { goi.push(m); return m === 'gemini-4-carbon' ? {ok: false, code: 403, raw: 'MODEL_TU_CHOI'} : ok({x: 1}); };
    giong(ctx.goiGemini_('p', 0.1, {}), {x: 1});
    assert.ok(ctx.modelBiChan403_('gemini-4-carbon'));
    const h = JSON.parse(props.MODEL_CHAN_403)['gemini-4-carbon'];
    assert.ok(h > Date.now() + 11.9 * 3600e3 && h < Date.now() + 12.1 * 3600e3, 'hạn 12 giờ');
    goi.length = 0;
    ctx.goiGemini_('p', 0.1, {});
    assert.deepEqual(goi, ['gemini-3-flash']);
    assert.ok(nk.some((x) => /GEMINI_CHAN_MODEL/.test(x)));
  });
  await t('403 do KEY / dự án (API chưa bật, key hỏng, thanh toán) KHÔNG chặn model', () => {
    assert.equal(ctx.la403TuChoi_(403, 'MODEL_TU_CHOI'), true);
    assert.equal(ctx.la403TuChoi_(403, 'KHONG_CO_KEY_CO_QUYEN'), true);
    assert.equal(ctx.la403TuChoi_(403, '{"error":{"status":"PERMISSION_DENIED","details":[{"reason":"SERVICE_DISABLED"}]}}'), false);
    assert.equal(ctx.la403TuChoi_(403, 'Generative Language API has not been used in project 123'), false);
    assert.equal(ctx.la403TuChoi_(403, 'API key not valid'), false);
    assert.equal(ctx.la403TuChoi_(429, 'x'), false);
  });
  await t('hết hạn sau 12 giờ; gộp danh sách GitHub trả về (giới hạn 24 giờ); modelConSong_ / danhSachModel_ lọc', () => {
    props = {MODEL_CHAN_403: JSON.stringify({'gemini-cu': Date.now() - 1000})};
    ctx._chan403_ = null;
    vm.runInContext('_chan403_ = null', ctx);
    assert.equal(ctx.modelBiChan403_('gemini-cu'), false);
    assert.equal(ctx.ghiModelChan403_({'gemini-pro-latest': Date.now() + 5 * 3600e3, 'gemini-xa': Date.now() + 99 * 3600e3, 'gemini-qua-han': Date.now() - 1}), 2);
    assert.ok(ctx.modelBiChan403_('gemini-pro-latest') && !ctx.modelBiChan403_('gemini-qua-han'));
    assert.ok(JSON.parse(props.MODEL_CHAN_403)['gemini-xa'] <= Date.now() + 24 * 3600e3 + 1000);
    const src = fs.readFileSync(path.join(GOC, 'BoPhan1.gs'), 'utf8');
    assert.ok(/model404HomNay_\(m\) \|\| modelBiChan403_\(m\)\) return false/.test(src) && /!model404HomNay_\(m\) && !modelBiChan403_\(m\)/.test(src));
    assert.ok(/goi\.model_chan = dsModelChan403_\(\)/.test(src) && /ghiModelChan403_\(d\.model_chan\)/.test(src));
    const kho = fs.readFileSync(path.join(GOC, 'KhoKey.gs'), 'utf8');
    assert.ok(/modelBiChan403_\(model\)\) return \{ ok: false, code: 403/.test(kho) && /\+\+so403 >= 2/.test(kho));
  });
  await t('GitHub goi_gemini.js (máy chủ giả): 2 key cùng 403 -> chặn model, đổi model ngay, ghi tệp chặn cho các lượt sau', async () => {
    const thu = fs.mkdtempSync(path.join(os.tmpdir(), 'v992b_'));
    const goi = [];
    const sv = http.createServer((req, res) => {
      const md = decodeURIComponent((/models\/([^:]+):/.exec(req.url) || [])[1] || '');
      goi.push(md);
      req.resume();
      req.on('end', () => {
        if (md === 'gemini-4-argon') { res.writeHead(403, {'Content-Type': 'application/json'}); res.end('{"error":{"code":403,"status":"PERMISSION_DENIED","message":"denied"}}'); return; }
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({candidates: [{content: {parts: [{text: '{"y":2}'}]}}]}));
      });
    });
    await new Promise((r) => sv.listen(0, '127.0.0.1', r));
    const cong = sv.address().port;
    const vao = path.join(thu, 'vao.json');
    fs.writeFileSync(vao, JSON.stringify({model: 'gemini-4-argon', models: ['gemini-4-argon', 'gemini-3-flash'], tungModel: true, bodies: [{contents: [{parts: [{text: 'x'}]}]}], keys: ['AAAAAAkey1111', 'BBBBBBkey2222', 'CCCCCCkey3333'], gioiHanGiay: 20}));
    const env = {...process.env, GEMINI_GOC: 'http://127.0.0.1:' + cong, TMP: thu, TEMP: thu, TMPDIR: thu};
    const chay = () => new Promise((r) => { const cp = require('node:child_process').spawn(process.execPath, [path.join(GOC, 'scripts', 'bophan1', 'goi_gemini.js'), vao], {env}); let o = ''; cp.stdout.on('data', (d) => { o += d; }); cp.on('close', () => r(o)); });
    const out1 = JSON.parse(await chay());
    const so403 = goi.filter((m) => m === 'gemini-4-argon').length;
    assert.equal(so403, 2, 'chỉ thử 2 key rồi bỏ model (không thử hết 3 key)');
    const chan = JSON.parse(fs.readFileSync(path.join(thu, 'gemini_model_chan_403.json'), 'utf8'));
    assert.ok(chan['gemini-4-argon'] > Date.now());
    goi.length = 0;
    await chay();
    assert.ok(!goi.includes('gemini-4-argon'), 'lượt sau không gọi lại model đã chặn');
    sv.close();
    fs.rmSync(thu, {recursive: true, force: true});
    assert.ok(out1[0].code === 403 || out1[0].ok);   // tungModel: chỉ model chỉ định -> trả 403 để .gs chặn & đổi model
  });

  console.log('2. DOC_DE nhanh + đúng nguyên nhân');
  await t('docDe_: chế độ nhe (Flash trước) + hạn chót riêng; quá hạn -> QUA_THOI_GIAN_DOC_ANH (không phải lỗi ảnh)', () => {
    let opts = null;
    ctx.goiGemini_ = (p, n, o) => { opts = o; return {doc_duoc: true, de_bai: 'x'.repeat(30)}; };
    const han = Date.now() + 60000;
    ctx.docDe_({}, {id: 'ZL1', de_bai: 'Tính xác suất rút được 2 bi đỏ từ hộp 5 bi', file_anh: ''}, han);
    assert.equal(opts.cheDo, 'nhe');
    assert.equal(opts.hanChotMs, han);
    ctx.goiGemini_ = () => { throw new Error('HET_GIO'); };
    assert.throws(() => ctx.docDe_({}, {id: 'ZL1', de_bai: 'đề chữ dài đủ hai mươi lăm ký tự 123'}, Date.now() - 1), /^Error: QUA_THOI_GIAN_DOC_ANH/);
    assert.ok(vm.runInContext('TRAN_DOC_DE_MS_', ctx) < 240000);
  });
  await t('goiGemini_ dừng đúng hạn chót hanChotMs (HET_GIO) trước khi gọi tiếp', () => {
    vm.runInContext('_chan403_ = null', ctx);
    props = {};
    ctx.danhSachModel_ = () => ['gemini-3-flash'];
    let goi = 0;
    ctx.khoGoiCoSuyNghi_ = () => { goi++; return ok({}); };
    assert.throws(() => ctx.goiGemini_('p', 0.1, {hanChotMs: Date.now() - 1}), /HET_GIO/);
    assert.equal(goi, 0);
  });
  await t('báo Zalo đúng nguyên nhân: quá thời gian / quá tải / hết hạn mức / lỗi Gemini ≠ "gửi lại ảnh rõ hơn"', () => {
    const r = {id: 'ZL9'};
    const a = ctx.loiDocDeChoZalo_(r, 'DANG_DOC_DE lần 3 (nếu dòng này đứng yên: lần chạy đã bị ngắt vì quá 6 phút)');
    assert.ok(/quá chậm/.test(a) && /không phải do ảnh/.test(a) && !/rõ hơn/.test(a));
    assert.ok(/quá thời gian|quá chậm/.test(ctx.loiDocDeChoZalo_(r, 'QUA_THOI_GIAN_DOC_ANH: Gemini đọc ảnh quá 210 giây')));
    assert.ok(/quá tải/.test(ctx.loiDocDeChoZalo_(r, 'Chờ Gemini hết quá tải')) && !/rõ hơn/.test(ctx.loiDocDeChoZalo_(r, 'QUA_TAI')));
    assert.ok(/hạn mức/.test(ctx.loiDocDeChoZalo_(r, 'Chờ hạn mức Gemini')));
    assert.ok(/lỗi gọi Gemini/.test(ctx.loiDocDeChoZalo_(r, 'GEMINI_LOI: gemini-x HTTP 403: MODEL_TU_CHOI')));
    assert.ok(/rõ hơn/.test(ctx.loiDocDeChoZalo_(r, 'KHONG_DOC_DUOC: ảnh mờ')));
  });
  await t('xuLyDocDe_: đã quá trần 3,5 phút của lần chạy -> dừng, không bắt đầu đề mới', () => {
    let batDau = 0;
    ctx.docHang_ = () => [{id: 'ZL2', trang_thai: 'CHO_DOC', _row: 2}];
    ctx.duThoiGianViec_ = () => true; ctx.uocGoiMs_ = () => 1000;
    ctx.batDauViec_ = () => { batDau++; return true; };
    ctx.xuLyDocDe_({}, {loai: 0, loi: 0}, Date.now() - 220000);
    assert.equal(batDau, 0);
    assert.ok(nk.some((x) => /^DUNG_SOM: Đọc đề/.test(x)));
  });

  console.log('3. bai_hoc_rut_ra chuỗi / mảng');
  await t('mangBaiHoc_: mảng giữ nguyên, chuỗi -> [chuỗi], còn lại -> []; DangVideo + tuSuaHinhThuc_ + chuanbi.py dùng bản an toàn', () => {
    giong(ctx.mangBaiHoc_(['a', 'b']), ['a', 'b']);
    giong(ctx.mangBaiHoc_('  Gộp 2 cạnh ngắn '), ['Gộp 2 cạnh ngắn']);
    giong(ctx.mangBaiHoc_(''), []);
    giong(ctx.mangBaiHoc_(null), []);
    giong(ctx.mangBaiHoc_({a: 1}), []);
    const dv = fs.readFileSync(path.join(GOC, 'DangVideo.gs'), 'utf8');
    assert.ok(!/\(kb\.bai_hoc_rut_ra \|\| \[\]\)\.map/.test(dv) && /mangBaiHoc_\(kb\.bai_hoc_rut_ra\)/.test(dv));
    const kb = {bai_hoc_rut_ra: 'Một câu bài học đủ dài', canh: []};
    ctx.tuSuaHinhThuc_(kb, {});
    assert.ok(Array.isArray(kb.bai_hoc_rut_ra) && kb.bai_hoc_rut_ra[0] === 'Một câu bài học đủ dài');
    const py = spawnSync('python', ['-X', 'utf8', '-c', [
      'import re,sys',
      's=open("scripts/chuanbi.py",encoding="utf8").read()',
      'assert "bhr if isinstance(bhr, list)" in s',
      'assert "(kb.get(\\"bai_hoc_rut_ra\\") or [])" not in s',
      'print("ok")'].join('\n')], {cwd: GOC, encoding: 'utf8'});
    assert.equal(py.stdout.trim(), 'ok', py.stderr);
  });

  console.log('4. Lỗi tạm "người môi giới" / broker');
  await t('thuLaiBroker_: lỗi broker 2 lần rồi được -> 3 lần gọi, nghỉ 2 giây mỗi lần; lỗi khác ném ngay; 3 lần broker -> ném', () => {
    let n = 0;
    ngu = 0;
    assert.equal(ctx.thuLaiBroker_(() => { if (++n < 3) throw new Error('Đã xảy ra lỗi với người môi giới'); return 'xong'; }, 'test'), 'xong');
    assert.equal(n, 3);
    assert.equal(ngu, 4000);
    n = 0;
    assert.throws(() => ctx.thuLaiBroker_(() => { n++; throw new Error('Lỗi khác'); }), /Lỗi khác/);
    assert.equal(n, 1);
    n = 0;
    assert.throws(() => ctx.thuLaiBroker_(() => { n++; throw new Error('Service error: broker'); }), /broker/);
    assert.equal(n, 3);
  });
  await t('nhanZalo_: lệnh /tt gặp lỗi broker 1 lần -> nghỉ 2 giây, xử lý lại đúng 1 lần (không bị chặn bởi chống lặp tin)', () => {
    props = {ZALO_WEBHOOK_SECRET: 's'};
    let lanTT = 0;
    const gui = [];
    ctx.dsNguoiGuiDe_ = () => ['c1'];
    ctx.nhoNguoiNhan_ = () => {};
    ctx.guiZaloToi_ = (c, s) => gui.push(s);
    ctx.tinhTrangUuTien_ = () => { if (++lanTT === 1) throw new Error('Đã xảy ra lỗi với người môi giới'); return 'Tiến độ OK'; };
    ngu = 0;
    ctx.nhanZalo_({parameter: {k: 's'}, postData: {contents: JSON.stringify({message: {message_id: 'm1', chat: {id: 'c1'}, text: '/tt'}})}});
    assert.equal(lanTT, 2);
    assert.deepEqual(gui, ['Tiến độ OK']);
    assert.equal(ngu, 2000);
    // tin trùng thật (Zalo gửi lại) vẫn bị chống lặp
    ctx.nhanZalo_({parameter: {k: 's'}, postData: {contents: JSON.stringify({message: {message_id: 'm1', chat: {id: 'c1'}, text: '/tt'}})}});
    assert.equal(lanTT, 2);
  });
  await t('gửi Zalo (guiZalo_ / guiAnhZalo_ / goiZaloApi_) đều bọc thuLaiBroker_', () => {
    const b1 = fs.readFileSync(path.join(GOC, 'BoPhan1.gs'), 'utf8');
    const zl = fs.readFileSync(path.join(GOC, 'ZaloDeBai.gs'), 'utf8');
    assert.ok((b1.match(/thuLaiBroker_\(function \(\) \{\s*return UrlFetchApp\.fetch\('https:\/\/bot-api/g) || []).length >= 3);
    assert.ok(/thuLaiBroker_\(function \(\) \{\s*return UrlFetchApp\.fetch\(ZALO_API_/.test(zl));
  });

  console.log(`\nKẾT QUẢ: ${dat} đạt, ${loi} hỏng`);
  process.exit(loi ? 1 : 0);
})();
