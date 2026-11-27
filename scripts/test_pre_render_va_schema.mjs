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
  assert.equal(ctx.goiGeminiSong_([{prompt: 'Giải', nhiet: 0.2, schema: bp1}])[0].dap_an_cuoi, '2/3');
  assert.equal(ctx.goiKichBanCoSchema_('Viết', 0.2, {suyNghi: 'high'}, bp2).dap_an_cuoi, '2/3');
  assert.deepEqual(goi.map(g => !!g.gc.responseSchema), [true, false, true, false]);
  assert.ok(goi.every(g => g.model === 'gemini-2.5-pro' && g.gc.responseMimeType === 'application/json' && g.gc.thinkingConfig));
  assert.ok(!cauHinh.has('KHONG_SCHEMA_gemini-2.5-pro'), 'schema quá phức tạp không đánh dấu model thiếu tính năng');
  const kb = {
    canh: [{minh_hoa: {du_lieu: '{"vat":[]}'}}],
    khung4tang: {san_khau: '{"loai":"rut_mau"}', buoc: [{doi_chieu: {ham: 'x^2'}}]},
  };
  ctx.goiGemini_ = () => kb;
  const daBung = ctx.goiKichBanCoSchema_('Viết', 0.2, {}, bp2);
  assert.equal(daBung.canh[0].minh_hoa.du_lieu.vat.length, 0);
  assert.equal(daBung.khung4tang.san_khau.loai, 'rut_mau');
  assert.equal(daBung.khung4tang.buoc[0].doi_chieu.ham, 'x^2');
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

await test('PromptKichBan.gs ngắn hơn bản gốc trước Việc 4', () => {
  const truoc = 158538;
  const sau = Buffer.byteLength(fs.readFileSync(path.join(ROOT, 'PromptKichBan.gs'), 'utf8').replace(/\r\n/g, '\n'));
  assert.ok(sau < truoc);
  console.log('  PromptKichBan.gs ' + truoc + ' → ' + sau + ' byte (−' + ((truoc - sau) / truoc * 100).toFixed(2) + '%)');
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
}

fs.rmSync(tmp, {recursive: true, force: true});
console.log('test_pre_render_va_schema: ' + dat + ' đạt, ' + hong + ' hỏng');
process.exitCode = hong ? 1 : 0;
