// v97 — Kiểm thử phía Apps Script cho HÌNH HỌC KHÔNG GIAN CHUẨN (chạy .gs trong vm, không gọi Gemini):
// prompt hinh_khong_gian (gọn 7-10 cảnh, bỏ buoc_ve / ví dụ tọa độ, HinhHoc.gs không đổi), CAU_HINH tắt, hình phẳng v94 không bị ảnh hưởng,
// Auto-fix (tên camera, nhãn bước, moc_xoay -> cụm con nguyên văn, KHÔNG dời đầu cảnh), lỗi cứng CAM_MAT_MOC / CAM_DE_GIO / KG_*,
// bộ giải máy qua Python, khóa luồng giữ hinh_khong_gian, đường kiểm duyệt danhGiaKichBan_ không đòi tọa độ hinh_hoc,
// so khớp chuẩn hóa chữ gốc / Auto-fix với bản Python (hinh_khong_gian/thoi_gian.py). Chạy: node scripts/test_v97_gs.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {spawnSync, execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const GOC = path.join(__dirname, '..');
const PY = process.platform === 'win32' ? 'python' : 'python3';
const ENV = {...process.env, PYTHONIOENCODING: 'utf-8'};

const cauHinh = {BO_DUNG_MAC_DINH: '3d_vector'};
const props = {};
const ctx = vm.createContext({PropertiesService: {getScriptProperties: () => ({getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }})}});
for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs', 'SanKhau.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
const shGia = {getLastRow: () => 1, getLastColumn: () => 1, getDataRange: () => ({getValues: () => [[]]}), getRange: () => ({getValues: () => [[]], getValue: () => ''})};
Object.assign(ctx, {SpreadsheetApp: {getActiveSpreadsheet: () => ({getSheetByName: () => shGia})}, CacheService: {getScriptCache: () => ({get: () => null, put: () => {}})}});
Object.assign(ctx, {cauHinh_: (k) => cauHinh[k] || '', nhatKy_: () => {}, cauNoiGanDay_: () => [], laDai10P_: () => false,
  kiemKhongGianMay_: (kb) => {
    const r = spawnSync(PY, [path.join(GOC, 'scripts', 'giai_hinh_khong_gian.py'), '-', '--chi-kiem'], {input: JSON.stringify(kb), env: ENV});
    try { return JSON.parse(r.stdout.toString('utf8')); } catch (e) { return null; }
  }});
let dat = 0, loi = 0;
const t = (ten, fn) => {
  try { fn(); dat++; console.log('  ✓', ten); } catch (e) { loi++; console.log('  ✗', ten, '—', e.message.split('\n')[0]); }
};
const J = (x) => JSON.parse(JSON.stringify(x));
const doc = (f) => JSON.parse(fs.readFileSync(path.join(GOC, f), 'utf8'));
const KB1 = doc('mau/v97/giao_diem_mnp.json'), KB2 = doc('mau/v97/vuong_goc_sa.json');
const ma = (ds) => ds.map((x) => String(x).split(':')[0]);

console.log('1. Prompt');
const rKG = {mon: 'HINH_HOC', lop: '11', de_bai: KB1.de_bai, dap_an: 'E = KM ∩ SD', cach_1: '{}', cach_2: '{}', id: 'HH-1'};
const rHP = {mon: 'HINH_HOC', lop: '9', de_bai: 'Cho tam giác ABC nhọn nội tiếp đường tròn (O). Chứng minh tứ giác BCEF nội tiếp.', dap_an: 'CM', cach_1: '{}', cach_2: '{}', id: 'HH-2'};
let pKG = '';
t('dungHinhKhongGian_: không gian -> có; phẳng -> không', () => { assert.ok(ctx.dungHinhKhongGian_(rKG)); assert.ok(!ctx.dungHinhKhongGian_(rHP)); });
t('taoPromptKichBan_ bài không gian có hinh_khong_gian + moc_xoay + 5 chế độ camera', () => {
  pKG = ctx.taoPromptKichBan_(rKG, {cac_buoc: ['b1']}, {cac_buoc: ['b2']});
  assert.match(pKG, /"hinh_khong_gian"/);
  assert.match(pKG, /moc_xoay/);
  for (const c of ['toan_canh', 'truc_dien_mat', 'ep_mep_mat', 'nhin_day', 'can_canh']) assert.ok(pKG.includes(c), c);
  assert.match(pKG, /CAM_MAT_MOC/);
});
t('prompt gọn 7-10 cảnh / 50-68 s, bỏ quy trình 15-20 cảnh', () => { assert.match(pKG, /7-10 cảnh/); assert.ok(!/15-20 cảnh/.test(pKG)); });
t('prompt bỏ buoc_ve tọa độ + ví dụ hinh_hoc của bản cũ', () => {
  assert.ok(!/ĐỒNG BỘ HÌNH - TIẾNG/.test(pKG));
  assert.ok(!/"diem":\{"S":\[20,10\]/.test(pKG));
  assert.ok(!/Mỗi cảnh chỉ có đúng MỘT vật/.test(pKG));
  assert.ok(!/"buoc_ve":\[\{"ve":"","khi_noi":""\}\]/.test(pKG));
});
t('prompt cấm Oxyz / vectơ pháp tuyến ở lớp 11', () => assert.match(pKG, /CẤM tọa độ Oxyz, vectơ pháp tuyến/));
t('bài hình phẳng giữ nguyên prompt v94 (không chèn hinh_khong_gian)', () => {
  const p = ctx.taoPromptKichBan_(rHP, {cac_buoc: []}, {cac_buoc: []});
  assert.match(p, /"hinh_phang_chuan"/);
  assert.ok(!/"hinh_khong_gian"/.test(p));
});
t('CAU_HINH HINH_KHONG_GIAN_CHUAN=TAT -> về prompt Manim cũ', () => {
  cauHinh.HINH_KHONG_GIAN_CHUAN = 'TAT';
  try {
    assert.ok(!ctx.dungHinhKhongGian_(rKG));
    const p = ctx.taoPromptKichBan_(rKG, {cac_buoc: []}, {cac_buoc: []});
    assert.ok(!/"hinh_khong_gian"/.test(p));
    assert.match(p, /buoc_ve/);
  } finally { delete cauHinh.HINH_KHONG_GIAN_CHUAN; }
});

console.log('2. Auto-fix tuSuaKhongGian_');
t('tên camera bí danh + nhãn "Bước n" + bước 1 thiếu toan_canh', () => {
  const kb = J(KB1);
  kb.hinh_khong_gian.buoc[0].xoay = [];
  kb.hinh_khong_gian.buoc[2].xoay[0].goc_nhin = 'tren_xuong';
  kb.hinh_khong_gian.buoc[3].nhan = 'Bước 2';
  const sua = ctx.tuSuaKhongGian_(kb, rKG);
  assert.equal(kb.hinh_khong_gian.buoc[0].xoay[0].goc_nhin, 'toan_canh');
  assert.equal(kb.hinh_khong_gian.buoc[2].xoay[0].goc_nhin, 'nhin_day');
  assert.ok(!/^bước/i.test(kb.hinh_khong_gian.buoc[3].nhan));
  assert.ok(sua.length >= 3);
});
t('moc_xoay lệch chữ -> cụm con >= 3 từ NGUYÊN VĂN (giữ vị trí giữa câu)', () => {
  const kb = J(KB1);
  kb.hinh_khong_gian.buoc[2].xoay[0].moc_xoay = 'giờ ta xét mặt đáy ABCD nhé';
  ctx.tuSuaKhongGian_(kb, rKG);
  assert.equal(kb.hinh_khong_gian.buoc[2].xoay[0].moc_xoay, 'xét mặt đáy abcd');
});
t('v102.1 moc_xoay không có trong lời -> hạ cánh mềm về góc toan_canh (không dời mốc về đầu cảnh)', () => {
  const kb = J(KB1);
  kb.hinh_khong_gian.buoc[2].xoay[0].moc_xoay = 'nhìn từ phía dưới lên';
  ctx.tuSuaKhongGian_(kb, rKG);
  const x = kb.hinh_khong_gian.buoc[2].xoay[0];
  assert.equal(x.goc_nhin, 'toan_canh');
  assert.equal(x.du_phong, true);
  assert.equal(x.moc_xoay, undefined);
});

console.log('3. Lỗi cứng kiemKhongGian_');
t('mẫu 1 + mẫu 2: không lỗi cứng (kể cả bộ giải máy)', () => {
  for (const kb of [KB1, KB2]) { const k = J(ctx.kiemKhongGian_(J(kb))); assert.deepEqual(k.nang, [], JSON.stringify(k.nang)); }
});
// v102.1: lỗi camera là lớp trình diễn -> cảnh báo nhẹ (nhe), KHÔNG đánh rớt kịch bản
t('moc_xoay không khớp -> CAM_MAT_MOC chỉ là cảnh báo (không chặn)', () => {
  const kb = J(KB1);
  kb.hinh_khong_gian.buoc[3].xoay[0].moc_xoay = 'câu không hề có';
  const k = ctx.kiemKhongGian_(kb);
  assert.ok(!ma(k.nang).includes('CAM_MAT_MOC') && ma(k.nhe).includes('CAM_MAT_MOC'));
});
t('cú xoay thiếu moc_xoay -> CAM_MAT_MOC cảnh báo (không chặn)', () => {
  const kb = J(KB1);
  delete kb.hinh_khong_gian.buoc[4].xoay[0].moc_xoay;
  const k = ctx.kiemKhongGian_(kb);
  assert.ok(!ma(k.nang).includes('CAM_MAT_MOC') && ma(k.nhe).includes('CAM_MAT_MOC'));
});
t('moc_xoay nằm ở cảnh khác (đúng chữ nhưng sai cảnh) -> cảnh báo, không chặn', () => {
  const kb = J(KB1);
  kb.hinh_khong_gian.buoc[3].xoay[0].moc_xoay = 'xét mặt đáy ABCD';
  const k = ctx.kiemKhongGian_(kb);
  assert.ok(!ma(k.nang).includes('CAM_MAT_MOC') && ma(k.nhe).includes('CAM_MAT_MOC'));
});
t('hai cú xoay sát nhau trong một cảnh -> CAM_DE_GIO cảnh báo (Python bỏ cú sau)', () => {
  const kb = J(KB2);
  kb.hinh_khong_gian.buoc[1].xoay[1].moc_xoay = 'xuống đáy, hai đường';
  kb.hinh_khong_gian.buoc[1].xoay[0].moc_xoay = 'nhìn từ trên';
  const k = ctx.kiemKhongGian_(kb);
  assert.ok(!ma(k.nang).includes('CAM_DE_GIO') && ma(k.nhe).includes('CAM_DE_GIO'));
});
t('truc_dien_mat thiếu 3 điểm -> KG_THIEU_DAC_TA', () => {
  const kb = J(KB1);
  kb.hinh_khong_gian.buoc[3].xoay[0].doi_tuong = ['S'];
  assert.ok(ma(ctx.kiemKhongGian_(kb).nang).includes('KG_THIEU_DAC_TA'));
});
t('thiếu khoi -> KG_THIEU_DAC_TA', () => {
  const kb = J(KB1);
  delete kb.hinh_khong_gian.khoi;
  assert.ok(ma(ctx.kiemKhongGian_(kb).nang).includes('KG_THIEU_DAC_TA'));
});
t('bộ giải máy: mệnh đề sai -> KG_MENH_DE_SAI', () => {
  const kb = J(KB1);
  kb.hinh_khong_gian.menh_de.push({loai: 'vuong_goc', a: 'NP', b: 'CD'});
  assert.ok(ma(ctx.kiemKhongGian_(kb).nang).includes('KG_MENH_DE_SAI'));
});
t('bộ giải máy: số đo lệch -> KG_SAI_SO_DO', () => {
  const kb = J(KB2);
  kb.hinh_khong_gian.so_do[1].gia_tri = 'a\\sqrt{2}';
  assert.ok(ma(ctx.kiemKhongGian_(kb).nang).includes('KG_SAI_SO_DO'));
});
t('đọc lặp đề (v96) vẫn là lỗi cứng ở bài không gian', () => {
  const kb = J(KB1);
  kb.canh.splice(3, 0, {so: 99, loai: 'nhac_lai', loi_thoai: kb.canh[1].loi_thoai, noi_dung_man_hinh: []});
  kb.canh.forEach((c, i) => { c.so = i + 1; });
  assert.ok(ma(ctx.kiemKhongGian_(kb).nang).includes('KB_DOC_LAP_DE'));
});
t('LOI_CUNG_RE_ nhận KG_* và CAM_*', () => {
  for (const m of ['KG_MENH_DE_SAI', 'KG_SAI_SO_DO', 'KG_DINH_CHUM', 'CAM_MAT_MOC', 'CAM_DE_GIO']) assert.ok(vm.runInContext('LOI_CUNG_RE_', ctx).test(m + ': x'), m);
});

console.log('4. Đường kiểm duyệt đầy đủ');
t('khóa luồng hình học giữ hinh_khong_gian (chỉ gỡ lớp 3D thực tế)', () => {
  const kb = J(KB1);
  kb.khung4tang = {buoc: []};
  ctx.khoaLuongHinhHoc_(kb);
  assert.ok(kb.hinh_khong_gian && !kb.khung4tang);
});
t('danhGiaKichBan_ bài không gian: không đòi tọa độ hinh_hoc / buoc_ve, không lỗi cứng', () => {
  const kb = J(KB1);
  ctx.khoaLuongHinhHoc_(kb);
  const kq = ctx.danhGiaKichBan_(kb, KB1.dap_an_cuoi, 'HINH_HOC', true, null, KB1.de_bai, '11');
  const nang = (kq && (kq.nang || kq.loi_cung)) || [];
  assert.ok(!nang.some((x) => /THIEU_TOA_DO_HINH|HINH_THIEU_DIEM|BUOC_VE_/.test(String(x))), JSON.stringify(nang).slice(0, 300));
  assert.ok(!nang.some((x) => /^(KG_|CAM_)/.test(String(x))), JSON.stringify(nang).slice(0, 300));
});
t('danhGiaKichBan_: moc_xoay sai -> KHÔNG còn lỗi cứng CAM_MAT_MOC (hạ cánh mềm, v102.1)', () => {
  const kb = J(KB1);
  ctx.khoaLuongHinhHoc_(kb);
  kb.hinh_khong_gian.buoc[3].xoay[0].moc_xoay = 'câu không hề có';
  const kq = ctx.danhGiaKichBan_(kb, KB1.dap_an_cuoi, 'HINH_HOC', true, null, KB1.de_bai, '11');
  assert.ok(!((kq && kq.nang) || []).some((x) => /^CAM_/.test(String(x))), JSON.stringify((kq && kq.nang) || []).slice(0, 300));
});

console.log('5. So khớp với bản Python');
t('tokKG_ (JS) = tok (Python) trên chữ gốc có ngoặc / S.ABCD / ký hiệu', () => {
  const mau = ['Trước hết xét mặt đáy (ABCD).', 'Hình chóp S.ABCD có SA ⊥ (ABCD)', "Cạnh A'B' và \\frac{a}{2} = 3,5", 'Ép mép mặt phẳng SAC lại, ta thấy BD!'];
  const py = JSON.parse(execFileSync(PY, ['-c', 'import sys,json;sys.path.insert(0,"scripts");from hinh_khong_gian.thoi_gian import tok;print(json.dumps([tok(x) for x in json.load(sys.stdin)]))'],
    {input: JSON.stringify(mau), cwd: GOC, env: ENV}).toString('utf8'));
  mau.forEach((s, i) => assert.deepEqual(J(ctx.tokKG_(s)), py[i], s));
});
t('timCumKG_ (JS) = tim_cum (Python): khớp đúng / cụm con / không khớp', () => {
  const loi = 'Ta có nhận xét quan trọng: trước hết xét mặt đáy (ABCD) rồi kéo dài NP cắt CD tại K';
  const cum = ['xét mặt đáy ABCD', 'giờ hãy xét mặt đáy ABCD nào', 'vậy mặt đáy kia', 'kéo dài NP'];
  const py = JSON.parse(execFileSync(PY, ['-c', 'import sys,json;sys.path.insert(0,"scripts");from hinh_khong_gian.thoi_gian import tok,tim_cum;d=json.load(sys.stdin);ds=[(w,0,1) for w in tok(d["loi"])];' +
    'print(json.dumps([(lambda k:[k[0],k[2]] if k else None)(tim_cum(c,ds,0,len(ds))) for c in d["cum"]]))'], {input: JSON.stringify({loi, cum}), cwd: GOC, env: ENV}).toString('utf8'));
  const toks = ctx.tokKG_(loi);
  cum.forEach((c, i) => {
    const k = ctx.timCumKG_(c, toks, 0);
    assert.deepEqual(k ? [k.i, k.kieu] : null, py[i], c);
  });
});

console.log(`\ntest_v97_gs: ${dat} đạt, ${loi} hỏng`);
process.exit(loi ? 1 : 0);
