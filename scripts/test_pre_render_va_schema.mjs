import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {execFile, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import vm from 'node:vm';
import {chonFrame, soiHop} from './kiem_tra_de_chu_truoc_render.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CHROME_GATE = 'scripts/kiem_tra_de_chu_truoc_render.mjs';
const python = process.platform === 'win32' ? 'python' : 'python3';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'test-soi-chu-'));
const exec = promisify(execFile);
const nhanh = process.argv.includes('--nhanh');
let dat = 0, hong = 0;

async function test(ten, fn) {
  try {
    await fn();
    dat++;
    console.log('✓ ' + ten);
  } catch (e) {
    hong++;
    console.error('✗ ' + ten, e);
  }
}

const a = {id: 1, nhan: 'tieu_de_buoc', x: 100, y: 240, w: 200, h: 50, opacity: 1};
const b = {id: 2, nhan: 'svg_text', x: 330, y: 240, w: 100, h: 40, opacity: 1};
await test('Hộp tách rời, cha-con và chữ opacity ≤ 0,15 đều đạt', () => {
  assert.deepEqual(soiHop([a, b], 10, 'Intro'), []);
  assert.deepEqual(soiHop([a, {...b, x: 115, cha: [1]}], 10, 'Intro'), []);
  assert.deepEqual(soiHop([a, {...b, x: 115, opacity: 0.15}], 10, 'Intro'), []);
});
await test('DE_CHU theo diện tích hoặc kích thước giao và kèm đúng cặp', () => {
  const [loi] = soiHop([a, {...b, x: 286, h: 10}], 15, 'Bước 1');
  assert.equal(loi.loai, 'DE_CHU');
  assert.equal(loi.phan_tu_1, a.nhan);
  assert.equal(loi.phan_tu_2, b.nhan);
  assert.equal(loi.frame, 15);
  assert.equal(soiHop([{...a, w: 60}, {...b, x: 115, y: 287, w: 40, h: 5}], 15, 'Bước 1')[0].loai, 'DE_CHU');
  assert.deepEqual(soiHop([a, {...b, x: 288, y: 282}], 15, 'Bước 1'), []);
});
await test('TRAN_KHUNG đúng ranh 1072 px và báo hộp bị cắt', () => {
  assert.deepEqual(soiHop([{...a, x: 872}], 16, 'Outro'), []);
  assert.equal(soiHop([{...a, x: 873}], 16, 'Outro')[0].loai, 'TRAN_KHUNG');
  assert.equal(soiHop([{...a, cat: 'Chữ vượt khối cố định ngang 5 px'}], 16, 'Outro')[0].loai, 'TRAN_KHUNG');
});

await test('Mốc Intro sau thương hiệu và Outro sau khi CTA xuất hiện', () => {
  const p = {anhBiaDau: true, thuongHieu: {ten: 'Story Math'}, intro: {lech: 80, soFrame: 100},
    boCuc: '4tang', khung4tang: {mocCau: {giay: 4}, buoc: [{t: 0}, {t: 4}, {t: 8}, {t: 12}], tCongBo: 16},
    canh: [{batDau: 0, soFrame: 120}], outro: {batDau: 540, soFrame: 105}};
  const mau = chonFrame(p, {fps: 30, durationInFrames: 726});
  assert.deepEqual(mau[0], {frame: 141, canh: 'Intro'});
  assert.deepEqual(mau.at(-1), {frame: 717, canh: 'Outro'});
  assert.ok(mau.length >= 4 && mau.length <= 6);
});

const ketQuaGemini = {candidates: [{content: {parts: [{text: JSON.stringify({dap_an_cuoi: '2/3'})}]}}]};
await test('Apps Script gửi schema BP1/BP2 và thử lại JSON khi API trả 400', () => {
  const cauHinh = new Map();
  const cache = {get: k => cauHinh.get(k), put: (k, v) => cauHinh.set(k, v)};
  const goi = [];
  const gia = (model, body) => {
    const gc = structuredClone(body.generationConfig);
    goi.push({model, gc});
    return gc.responseSchema
      ? {ok: false, code: 400, raw: 'Maximum complexity exceeded in responseSchema'}
      : {ok: true, code: 200, raw: JSON.stringify(ketQuaGemini)};
  };
  const ctx = vm.createContext({
    CacheService: {getScriptCache: () => cache}, Logger: {log() {}},
  });
  for (const f of ['BoPhan1.gs', 'KhoKey.gs']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, {filename: f});
  }
  Object.assign(ctx, {
    khoDanhSachKey_: () => ['key-gia'], cauHinh_: () => 'high', danhSachModel_: () => ['gemini-2.5-pro'],
    conDuGoiGemini_: () => true, modelBiChan403_: () => false, nhatKy_: () => {},
    khoGoi_: (_he, model, body) => gia(model, body),
    khoGoiSong_: (_he, model, bodies) => bodies.map(body => gia(model, body)),
  });
  const bp1 = ctx.schemaGiaiBP1_('xac_suat');
  const bp2 = ctx.schemaKichBan_();
  assert.ok(bp1.required.includes('tu') && bp1.required.includes('mau'));
  assert.equal(ctx.schemaGiaiBP1_('chung_minh').properties.cac_buoc.items.properties.ly_do.type, 'STRING');
  assert.ok(bp2.required.includes('dap_an_cuoi') && bp2.required.includes('binh_luan_ghim'));
  assert.ok(bp2.properties.canh.items.required.includes('noi_dung_man_hinh'));
  assert.ok(bp2.properties.canh.items.properties.loai.enum.includes('phan_tich'));
  const buoc = bp2.properties.khung4tang.properties.buoc.items.properties;
  assert.equal(buoc.hanh_dong.properties.do.type, 'INTEGER');
  assert.equal(buoc.hanh_dong.properties.nhanh.type, 'INTEGER');
  assert.equal(buoc.the.items.properties.chot.type, 'BOOLEAN');
  assert.equal(bp2.properties.tom_tat_3_buoc.minItems, 3);
  assert.equal(bp2.properties.tom_tat_3_buoc.maxItems, 3);
  assert.equal(ctx.goiGeminiSong_([{prompt: 'Giải', nhiet: 0.2, schema: bp1}])[0].dap_an_cuoi, '2/3');
  assert.equal(ctx.goiKichBanCoSchema_('Viết', 0.2, {suyNghi: 'high'}, bp2).dap_an_cuoi, '2/3');
  assert.deepEqual(goi.map(g => !!g.gc.responseSchema), [true, false, true, false]);
  assert.ok(goi.every(g => g.model === 'gemini-2.5-pro' && g.gc.responseMimeType === 'application/json' && g.gc.thinkingConfig));
  assert.ok(!cauHinh.has('KHONG_SCHEMA_gemini-2.5-pro'), 'schema quá phức tạp không đánh dấu model thiếu tính năng');
  const kb = {
    canh: [{minh_hoa: {du_lieu: '{"vat":[]}'}}],
    khung4tang: {san_khau: '{"loai":"rut_mau"}', buoc: [{doi_chieu: {ham: 'x^2'}, hanh_dong: {pha: 'truong_hop', do: 2}}]},
  };
  ctx.goiGemini_ = () => kb;
  const daBung = ctx.goiKichBanCoSchema_('Viết', 0.2, {}, bp2);
  assert.equal(daBung.canh[0].minh_hoa.du_lieu.vat.length, 0);
  assert.equal(daBung.khung4tang.san_khau.loai, 'rut_mau');
  assert.equal(daBung.khung4tang.buoc[0].doi_chieu.ham, 'x^2');
  assert.equal(daBung.khung4tang.buoc[0].hanh_dong.do, 2);
});

await test('KhoKey gửi lại đúng key của từng yêu cầu song song và không đánh dấu key', () => {
  const goi = [];
  const gia = (url, opts) => {
    const body = JSON.parse(opts.payload);
    const gc = body.generationConfig;
    goi.push({url, key: opts.headers['x-goog-api-key'], gc});
    const code = gc.responseSchema ? 400 : 200;
    return {getResponseCode: () => code, getContentText: () => code === 400
      ? '{"error":{"message":"Invalid response_schema: property not found"}}' : JSON.stringify(ketQuaGemini)};
  };
  const ctx = vm.createContext({UrlFetchApp: {fetch: gia, fetchAll: yc => yc.map(x => gia(x.url, x))}});
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'KhoKey.gs'), 'utf8'), ctx);
  Object.assign(ctx, {
    khoDanhSachKey_: () => ['thu-1', 'thu-2'], khoXep_: () => ({dung: ['thu-1', 'thu-2']}),
    khoGhiNhanLoi_: () => assert.fail('lỗi schema không đi qua bộ phân loại key'),
    khoGhi404_: () => assert.fail('property not found trong schema không phải lỗi model 404'),
  });
  const body = {contents: [], generationConfig: {temperature: 0.4, responseMimeType: 'application/json', responseSchema: {type: 'OBJECT'}}};
  const model = 'gemini-2.5-pro';
  assert.ok(ctx.khoGoi_('VIDEO', model, JSON.stringify(body)).ok);
  assert.ok(ctx.khoGoiSong_('VIDEO', model, [body, body]).every(r => r.ok));
  assert.deepEqual(goi.map(x => [x.key, !!x.gc.responseSchema]), [
    ['thu-1', true], ['thu-1', false], ['thu-1', true], ['thu-2', true], ['thu-1', false], ['thu-2', false],
  ]);
  assert.ok(goi.every(x => x.url.endsWith('/' + model + ':generateContent') && x.gc.temperature === 0.4 && x.gc.responseMimeType === 'application/json'));
  assert.ok(body.generationConfig.responseSchema);
});

await test('Broker Node thử lại cùng model/key và giữ JSON MIME qua HTTP 400', async () => {
  const goi = [];
  const server = http.createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    goi.push({url: req.url, body});
    const coSchema = !!body.generationConfig.responseSchema;
    res.writeHead(coSchema ? 400 : 200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(coSchema ? {error: {message: 'Unsupported response_schema'}} : ketQuaGemini));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const tep = path.join(tmp, 'gemini.json');
    fs.writeFileSync(tep, JSON.stringify({
      model: 'gemini-2.5-pre-render-test', tungModel: true, keys: ['key-gia'], gioiHanGiay: 3,
      bodies: [{contents: [{parts: [{text: 'test'}]}], generationConfig: {
        responseMimeType: 'application/json', responseSchema: {type: 'OBJECT', properties: {dap_an_cuoi: {type: 'STRING'}}},
      }}],
    }));
    const {stdout, stderr} = await exec(process.execPath, ['scripts/bophan1/goi_gemini.js', tep], {
      cwd: ROOT, timeout: 15000,
      env: {...process.env, GEMINI_GOC: 'http://127.0.0.1:' + server.address().port, TEMP: tmp, TMP: tmp, TMPDIR: tmp},
    });
    assert.ok(JSON.parse(stdout)[0].ok);
    assert.match(stderr, /GEMINI_SCHEMA_FALLBACK/);
    assert.equal(goi.length, 2);
    assert.equal(goi[0].url, goi[1].url);
    assert.ok(goi[0].body.generationConfig.responseSchema);
    assert.equal(goi[1].body.generationConfig.responseSchema, undefined);
    assert.equal(goi[1].body.generationConfig.responseMimeType, 'application/json');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

await test('Workflow đóng gói hai lỗi nặng và đúng lượt giao cho Auto-Heal', () => {
  const yaml = fs.readFileSync(path.join(ROOT, '.github/workflows/dung-video.yml'), 'utf8');
  const buoc = yaml.split('id: bao_sua', 2)[1].split('\n      - name:', 1)[0];
  const py = /^ {10}python3 - <<'PY'\r?\n([\s\S]*?)^ {10}PY\r?$/m.exec(buoc);
  assert.ok(py, 'đọc được phần chuẩn bị webhook');
  const dir = path.join(tmp, 'webhook');
  fs.mkdirSync(path.join(dir, 'out/pre_render'), {recursive: true});
  const loi = soiHop([a, {...b, x: 230}, {...a, id: 3, nhan: 'outro_cta', x: 900, y: 800}], 96, 'Bước 2');
  fs.writeFileSync(path.join(dir, 'out/pre_render/bao_cao.json'), JSON.stringify({dat: false, loi}));
  execFileSync(python, ['-X', 'utf8', '-c', py[1].replace(/^ {10}/gm, '')], {cwd: dir,
    env: {...process.env, ID_VIDEO: 'video-thu', LAN_GIAO: 'lan-thu', DUNG_VIDEO_SECRET: 'gia-lap'}});
  const {ok, id, lan_giao, kiem_duyet} = JSON.parse(fs.readFileSync(path.join(dir, 'bao_kiem_duyet.json'), 'utf8'));
  assert.deepEqual([ok, id, lan_giao, kiem_duyet.loai], [false, 'video-thu', 'lan-thu', 'bo_cuc']);
  assert.match(kiem_duyet.nang[0], /^DE_CHU · Bước 2 \(frame 96\) · tieu_de_buoc ↔ svg_text:/);
  assert.match(kiem_duyet.nang[1], /^TRAN_KHUNG .*outro_cta:/);
});

await test('PromptKichBan.gs ngắn hơn trước lượt tinh gọn', () => {
  const goc = 158538, truoc = 152214;
  const sau = Buffer.byteLength(fs.readFileSync(path.join(ROOT, 'PromptKichBan.gs'), 'utf8').replace(/\r\n/g, '\n'));
  assert.ok(sau < truoc);
  console.log('  PromptKichBan.gs ' + truoc + ' → ' + sau + ' byte (−' + ((truoc - sau) / truoc * 100).toFixed(2) + '% trong lượt này, −' + ((goc - sau) / goc * 100).toFixed(2) + '% so với bản gốc)');
});

if (!nhanh) {
  let props;
  await test('Props Koch: chọn 4–6 frame, đo Chromium thật và báo thời gian', () => {
    const dir = path.join(tmp, 'mau');
    props = path.join(dir, 'props.json');
    const bao = path.join(dir, 'bao.json');
    const bat = performance.now();
    execFileSync(python, ['-X', 'utf8', 'scripts/chuanbi.py', 'mau/v99_1/koch_dao.json',
      '--props-soi-chu', '--props-ra', props, '--out-dir', dir], {cwd: ROOT, encoding: 'utf8', timeout: 30000});
    const msProps = performance.now() - bat;
    const p = JSON.parse(fs.readFileSync(props, 'utf8'));
    assert.ok(p.canh.every(c => c.audio === null) && p.nhac === null);
    assert.equal(fs.existsSync(path.join(dir, p.id, 'checkpoint.json')), false);
    const mau = chonFrame(p, {fps: p.fps, durationInFrames: p.tongFrame});
    assert.ok(mau.length >= 4 && mau.length <= 6);
    assert.equal(mau[0].canh, 'Intro');
    assert.equal(mau.at(-1).canh, 'Outro');
    assert.ok(mau.some(x => x.canh === 'Kết luận'));
    const log = execFileSync(process.execPath, [CHROME_GATE, props, bao], {cwd: ROOT, encoding: 'utf8', timeout: 90000});
    assert.match(log, /Gate: [4-6] frame, [1-9]\d* hộp chữ, [\d.]+ s/);
    assert.deepEqual(JSON.parse(fs.readFileSync(bao, 'utf8')), {dat: true, loi: []});
    console.log('  Chuẩn bị props ' + (msProps / 1000).toFixed(2) + ' s. ' + log.trim().split('\n').at(-1));
  });
  await test('Chromium lỗi khởi động: cảnh báo và fail-open', async () => {
    assert.ok(props);
    const bao = path.join(tmp, 'bo_qua.json');
    const {stdout, stderr} = await exec(process.execPath, [CHROME_GATE, props, bao], {
      cwd: ROOT, timeout: 30000, env: {...process.env, TRINH_DUYET: path.join(tmp, 'chrome-khong-co')},
    });
    assert.match(stderr, /::warning::.*Chromium không khởi chạy được/);
    assert.match(stdout, /Gate: 0 frame/);
    assert.deepEqual(JSON.parse(fs.readFileSync(bao, 'utf8')), {dat: true, loi: []});
  });
  await test('Chromium bắt nhãn SVG đè nhau và nhãn bị cắt trong sân khấu thật', () => {
    const p = JSON.parse(fs.readFileSync(props, 'utf8'));
    const lop = p.khung4tang.tuSinh.lop.at(-1);
    lop.svg += '<text x="350" y="190" font-size="32">Nhãn kiểm A</text>' +
      '<text x="350" y="190" font-size="32">Nhãn kiểm B</text>' +
      '<text x="300" y="567" font-size="32">Nhãn bị cắt</text>';
    const tep = path.join(tmp, 'va_cham.json'), bao = path.join(tmp, 'ket_qua_va_cham.json');
    fs.writeFileSync(tep, JSON.stringify(p));
    const log = execFileSync(process.execPath, [CHROME_GATE, tep, bao], {cwd: ROOT, encoding: 'utf8', timeout: 90000});
    const kq = JSON.parse(fs.readFileSync(bao, 'utf8'));
    assert.equal(kq.dat, false);
    assert.ok(kq.loi.some(x => x.loai === 'DE_CHU' && /Nhãn kiểm A/.test(x.phan_tu_1) && /Nhãn kiểm B/.test(x.phan_tu_2)));
    assert.ok(kq.loi.some(x => x.loai === 'TRAN_KHUNG' && /Nhãn bị cắt/.test(x.phan_tu_1) && /khối bao cắt/.test(x.chi_tiet)));
    console.log('  ' + log.trim().split('\n').at(-1));
  });
}

fs.rmSync(tmp, {recursive: true, force: true});
console.log('test_pre_render_va_schema: ' + dat + ' đạt, ' + hong + ' hỏng');
process.exitCode = hong ? 1 : 0;
