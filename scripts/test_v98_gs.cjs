// v98 — Kiểm thử phía Apps Script cho ĐỘNG CƠ LEGO + khóa 3 lớp chống lỗi Gemini (chạy .gs trong vm, KHÔNG gọi mạng):
// Lớp 1 responseSchema enum cố định (6 khối / 5 động tác / 6 hình khối / 6 chế độ máy) gắn đúng vào payload + tự gọi lại không schema
// khi model trả 400; Lớp 2 bộ giải Python (KG_*) qua kiemKhongGianMay_; Lớp 3 gửi ĐÚNG mục JSON lỗi cho Gemini vá tối đa 1 lần,
// luồng thực tế vá không xong -> bỏ Lego giữ khung 4 tầng. Định tuyến dungLego_ / chonSanKhau_ (so khớp Python), Auto-fix bí danh,
// kiemKhongGian_ cho đặc tả v2, KHUNG4TANG_3D_RONG không chặn khi đã có Lego. Chạy: node scripts/test_v98_gs.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const assert = require('node:assert/strict');
const GOC = path.join(__dirname, '..');
const PY = process.platform === 'win32' ? 'python' : 'python3';
const ENV = {...process.env, PYTHONIOENCODING: 'utf-8'};

const cauHinh = {BO_DUNG_MAC_DINH: '3d_vector'};
const props = {};
const ctx = vm.createContext({PropertiesService: {getScriptProperties: () => ({getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }})}});
for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs', 'SanKhau.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
const shGia = {getLastRow: () => 1, getLastColumn: () => 1, getDataRange: () => ({getValues: () => [[]]}), getRange: () => ({getValues: () => [[]], getValue: () => ''})};
const bo = {};
Object.assign(ctx, {SpreadsheetApp: {getActiveSpreadsheet: () => ({getSheetByName: () => shGia})}, CacheService: {getScriptCache: () => ({get: (k) => bo[k] || null, put: (k, v) => { bo[k] = v; }})}});
const nk = [];
Object.assign(ctx, {cauHinh_: (k) => cauHinh[k] || '', nhatKy_: (a, b) => nk.push(a + ' ' + b), cauNoiGanDay_: () => [], laDai10P_: () => false,
  kiemKhongGianMay_: (kb) => {
    const r = spawnSync(PY, [path.join(GOC, 'scripts', 'giai_hinh_khong_gian.py'), '-', '--chi-kiem'], {input: JSON.stringify(kb), env: ENV});
    try { return JSON.parse(r.stdout.toString('utf8')); } catch (e) { return null; }
  }});
let dat = 0, loi = 0;
const t = (ten, fn) => {
  try { fn(); dat++; console.log('  ✓', ten); } catch (e) { loi++; console.log('  ✗', ten, '—', e.message.split('\n')[0]); }
};
const J = (x) => JSON.parse(JSON.stringify(x));
const KB = JSON.parse(fs.readFileSync(path.join(GOC, 'mau/v98/thap_flycam_oxyz.json'), 'utf8'));
const HKG = KB.hinh_khong_gian;
const ma = (ds) => ds.map((x) => String(x).split(':')[0]);

console.log('1. Lớp 1 — responseSchema enum cố định');
const sch = ctx.schemaLego_();
const P = sch.properties;
t('6 khối nguyên thủy đúng enum', () => assert.deepEqual(J(P.doi_tuong.items.properties.loai.enum), ['khoi', 'doan', 'duong_cong', 'mat', 'diem', 'he_truc']));
t('5 động tác đúng enum + moc_hanh_dong bắt buộc', () => {
  const h = P.buoc.items.properties.hanh_dong.items;
  assert.deepEqual(J(h.properties.loai.enum), ['tinh_tien', 'doi_xung_mat', 'quay', 'co_lap', 'truot_toi_uu']);
  assert.ok(h.required.includes('moc_hanh_dong'));
});
t('hình khối enum có đủ hop | lang_tru | chop | tru | non | cau', () => ['hop', 'lang_tru', 'chop', 'tru', 'non', 'cau'].forEach((x) => assert.ok(P.doi_tuong.items.properties.hinh.enum.includes(x))));
t('chế độ máy enum có phang_2d (cảnh dẫn 2D -> 3D)', () => assert.ok(P.buoc.items.properties.xoay.items.properties.goc_nhin.enum.includes('phang_2d')));
t('schema chỉ dùng kiểu OpenAPI Gemini (OBJECT/ARRAY/STRING/NUMBER/INTEGER/BOOLEAN), không additionalProperties', () => {
  const duyet = (o) => { assert.ok(['OBJECT', 'ARRAY', 'STRING', 'NUMBER', 'INTEGER', 'BOOLEAN'].includes(o.type), o.type); assert.ok(!('additionalProperties' in o)); if (o.properties) Object.values(o.properties).forEach(duyet); if (o.items) duyet(o.items); };
  duyet(sch);
});
t('mẫu tháp flycam khớp schema (mọi giá trị enum hợp lệ)', () => {
  const kiem = (v, s, duong) => {
    if (s.enum) assert.ok(s.enum.includes(v), duong + '=' + v);
    if (s.type === 'OBJECT' && v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (s.properties[k]) kiem(x, s.properties[k], duong + '.' + k);
    if (s.type === 'ARRAY' && Array.isArray(v)) v.forEach((x, i) => kiem(x, s.items, duong + '[' + i + ']'));
  };
  const h = J(HKG);
  h.buoc.forEach((b) => (b.hien || []).forEach((x, i) => { if (typeof x === 'string') b.hien[i] = {id: x}; }));
  kiem(h, sch, 'hkg');
});

console.log('2. goiGemini_ gắn responseSchema + tự bỏ schema khi model trả 400');
{
  const goi = [];
  Object.assign(ctx, {khoDanhSachKey_: () => ['k'], danhSachModel_: () => ['gemini-2.5-pro'], conDuGoiGemini_: () => true, duThoiGian_: () => true,
    khoGoi_: (_n, model, body) => {
      goi.push(J(body.generationConfig));
      if (body.generationConfig.responseSchema) return {ok: false, code: 400, raw: '{"error":{"message":"Invalid JSON payload received. Unknown name \\"responseSchema\\""}}'};
      return {ok: true, code: 200, raw: JSON.stringify({candidates: [{content: {parts: [{text: JSON.stringify({sua: []})}]}}]})};
    }});
  t('payload có responseSchema + responseMimeType JSON', () => {
    const kq = ctx.goiGemini_('x', 0.2, {schema: ctx.schemaVaLego_()});
    assert.ok(goi[0].responseSchema && goi[0].responseMimeType === 'application/json');
    assert.ok(!goi[1].responseSchema, 'lần 2 bỏ schema');
    assert.deepEqual(J(kq), {sua: []});
  });
  t('model đã báo không nhận schema -> nhớ (lần sau không gửi schema nữa)', () => {
    goi.length = 0;
    ctx.goiGemini_('x', 0.2, {schema: ctx.schemaVaLego_()});
    assert.ok(!goi[0].responseSchema && goi.length === 1);
  });
}

console.log('3. Định tuyến');
const rOxyz = {mon: 'HINH_HOC', lop: '12', de_bai: 'Trong không gian Oxyz cho A(1; 2; 3), B(3; 0; -1). Tìm M thuộc (Oxy) sao cho MA + MB nhỏ nhất.', dap_an: 'M', id: 'O-1', cach_1: '{}', cach_2: '{}'};
const rTT = {mon: 'THUC_TE', lop: '12', de_bai: KB.de_bai, dap_an: KB.dap_an_cuoi, id: 'T-1', cach_1: '{}', cach_2: '{}'};
t('dungLego_: Oxyz lớp 12 -> có; cùng đề lớp 11 -> không; hình chóp lớp 11 -> không', () => {
  assert.ok(ctx.dungLego_(rOxyz));
  assert.ok(ctx.dungLego_(rTT));
  assert.ok(!ctx.dungLego_({...rOxyz, lop: '11'}));
  assert.ok(!ctx.dungLego_({mon: 'HINH_HOC', lop: '11', de_bai: 'Cho hình chóp S.ABCD có đáy là hình vuông...'}));
});
t('Oxyz lớp 12 không đi v97 (dungHinhKhongGian_ = false), prompt chính có câu nhắc Lego', () => {
  assert.ok(!ctx.dungHinhKhongGian_(rOxyz));
  const p = ctx.taoPromptKichBan_(rOxyz, {}, {});
  assert.ok(/ĐỘNG CƠ LEGO/.test(p) && !/"hinh_khong_gian": \{\n "khoi"/.test(p));
});
t('CAU_HINH LEGO_3D = TAT -> tắt', () => { cauHinh.LEGO_3D = 'TAT'; try { assert.ok(!ctx.dungLego_(rOxyz)); } finally { delete cauHinh.LEGO_3D; } });
t('chonSanKhau_: có đặc tả Lego -> lego_3d, khớp bản Python', () => {
  const kb = J(KB);
  const js = ctx.chonSanKhau_(kb, rTT);
  const r = spawnSync(PY, ['-c', 'import json,sys;sys.path.insert(0,"scripts");import khung4tang_v96 as v;kb=json.load(sys.stdin);print(json.dumps(v.chon_san_khau(kb)))'], {input: JSON.stringify(kb), env: ENV, cwd: GOC});
  const py = JSON.parse(r.stdout.toString('utf8'));
  assert.equal(js.loai, 'lego_3d');
  assert.equal(py.loai, js.loai);
});

console.log('4. Lớp 3 — tự vá đúng mục lỗi, tối đa 1 lần');
const lich = [];
ctx.goiGemini_ = (prompt, nhiet, opts) => { lich.push({prompt, schema: opts && opts.schema}); return lich.length === 1 ? lich.tl1() : lich.tl2(prompt); };
t('pass 2 có schema; số đo sai -> gửi ĐÚNG mục so_do lỗi -> vá -> hết lỗi', () => {
  lich.length = 0;
  const sai = J(HKG);
  sai.so_do[0].gia_tri = '800';
  lich.tl1 = () => J(sai);
  lich.tl2 = (p) => {
    assert.ok(/KG_SAI_SO_DO/.test(p), 'có thông báo lỗi ngắn');
    assert.ok(p.includes('"gia_tri":"800"'), 'có đúng mục JSON lỗi');
    assert.ok(!p.includes('"buoc"'), 'không gửi lại cả đặc tả');
    return {sua: [{nhom: 'so_do', khoa: '0', moi_json: JSON.stringify({...sai.so_do[0], gia_tri: '781,02'})}]};
  };
  const kb = J(KB);
  delete kb.hinh_khong_gian;
  const ok = ctx.lapLego_(kb, rTT, {});
  assert.ok(ok, nk.slice(-2).join(' | '));
  assert.equal(lich.length, 2);
  assert.ok(lich[0].schema && lich[1].schema, 'cả hai lời gọi đều có schema');
  assert.equal(kb.hinh_khong_gian.so_do[0].gia_tri, '781,02');
  assert.equal(kb.hinh_khong_gian.phien_ban, 2);
});
t('vá vẫn lỗi (luồng thực tế) -> bỏ Lego, giữ khung 4 tầng; không gọi lần 3', () => {
  lich.length = 0;
  const sai = J(HKG);
  sai.diem.push({ten: 'X', loai: 'trung_diem', doan: 'AZ'});
  lich.tl1 = () => J(sai);
  lich.tl2 = (p) => { assert.ok(p.includes('"ten":"X"')); return {sua: [{nhom: 'diem', khoa: 'X', moi_json: JSON.stringify({ten: 'X', loai: 'trung_diem', doan: 'AQ'})}]}; };
  const kb = J(KB);
  delete kb.hinh_khong_gian;
  const ok = ctx.lapLego_(kb, rTT, {});
  assert.ok(!ok && !kb.hinh_khong_gian && lich.length === 2);
});
t('đã thử Lego một lần -> không gọi lại (chống vòng lặp)', () => {
  lich.length = 0;
  const kb = J(KB);
  kb.lego_da_thu = true;
  assert.ok(!ctx.lapLego_(kb, rTT, {}) && lich.length === 0);
});

console.log('5. Auto-fix + lỗi cứng đặc tả v2');
t('bí danh: hinh_tru -> tru, doi_xung -> doi_xung_mat, moc_hanh_dong lệch chữ -> cụm con nguyên văn', () => {
  const kb = J(KB);
  kb.hinh_khong_gian.doi_tuong.find((o) => o.id === 'thapA').hinh = 'hinh_tru';
  const h = kb.hinh_khong_gian.buoc[4].hanh_dong[0];
  h.loai = 'doi_xung';
  h.moc_hanh_dong = 'giờ ta lấy đối xứng B qua mặt phẳng Oxy';
  const sua = ctx.tuSuaKhongGian_(kb, rTT);
  assert.equal(kb.hinh_khong_gian.doi_tuong.find((o) => o.id === 'thapA').hinh, 'tru');
  assert.equal(h.loai, 'doi_xung_mat');
  assert.ok(/lấy đối xứng b qua mặt phẳng/i.test(h.moc_hanh_dong) && !/giờ ta/i.test(h.moc_hanh_dong), h.moc_hanh_dong);
  assert.ok(sua.length >= 3);
});
t('kiemKhongGian_ đặc tả v2: không đòi "khoi", bộ giải máy ĐẠT', () => {
  const k = ctx.kiemKhongGian_(J(KB));
  assert.ok(!k.nang.some((x) => /thiếu "khoi"/.test(x)), k.nang.join(' | '));
  assert.ok(!k.nang.some((x) => /^KG_/.test(x)), k.nang.join(' | '));
});
t('động tác thiếu moc_hanh_dong -> CAM_MAT_MOC (lỗi cứng)', () => {
  const kb = J(KB);
  delete kb.hinh_khong_gian.buoc[6].hanh_dong[0].moc_hanh_dong;
  const k = ctx.kiemKhongGian_(kb);
  assert.ok(ma(k.nang).includes('CAM_MAT_MOC'));
  assert.ok(ctx.LOI_CUNG_RE_.test('CAM_MAT_MOC: x'));
});
t('số đo sai trong đặc tả -> KG_SAI_SO_DO từ bộ giải Python', () => {
  const kb = J(KB);
  kb.hinh_khong_gian.so_do[0].gia_tri = '700';
  assert.ok(ma(ctx.kiemKhongGian_(kb).nang).includes('KG_SAI_SO_DO'));
});
t('danhGiaKichBan_ luồng thực tế có Lego: KHUNG4TANG_3D_RONG không còn chặn', () => {
  const kb = J(KB);
  kb.khung4tang = {de_ghim: [], buoc: []};
  const dg = ctx.danhGiaKichBan_(kb, KB.dap_an_cuoi, 'THUC_TE', '', null, KB.de_bai, '12');
  assert.ok(!dg.nang.some((x) => /^KHUNG4TANG_3D_RONG/.test(x)), dg.nang.slice(0, 3).join(' | '));
});

console.log(`\ntest_v98_gs: ${dat} đạt, ${loi} hỏng`);
process.exit(loi ? 1 : 0);
