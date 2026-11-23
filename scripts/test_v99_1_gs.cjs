// v99.1 — Kiểm thử phía Apps Script (chạy .gs trong vm, KHÔNG gọi mạng): node scripts/test_v99_1_gs.cjs
//  - không đọc lặp số: loiNoiSo_ nhận "một trăm bốn mươi tư" / "4.500"; tuSuaCutCongThuc_ không nối "bằng 144" khi câu đã đọc;
//  - định tuyến sân khấu tự sinh (dungTuSinh_): Koch / parabol giá vé có; xác suất / hình học / 10 phút / TAT không;
//  - lapTuSinh_: máy từ chối -> vá đúng 1 lần -> gắn; vẫn lỗi -> gỡ tu_sinh (giữ sân khấu cũ);
//  - gỡ Blender: boDungMacDinh_ luôn 3d_vector, thiếu khung4tang = lỗi cứng KHUNG4TANG_BAT_BUOC; prompt cấm phiên âm.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const GOC = path.join(__dirname, '..');
const props = {};
const ctx = vm.createContext({PropertiesService: {getScriptProperties: () => ({getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }})}});
for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs', 'SanKhau.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
const bo = {};
let cauHinh = {};
Object.assign(ctx, {CacheService: {getScriptCache: () => ({get: (k) => bo[k] || null, put: (k, v) => { bo[k] = v; }})}, cauHinh_: (k) => cauHinh[k] || '', nhatKy_: () => {}});
let dat = 0, loi = 0;
const t = (ten, fn) => {
  try { fn(); dat++; console.log('  ✓', ten); } catch (e) { loi++; console.log('  ✗', ten, '—', e.message.split('\n')[0]); }
};
const kb = (f) => JSON.parse(fs.readFileSync(path.join(GOC, 'mau', 'v99_1', f + '.json'), 'utf8'));

console.log('1. Không đọc lặp "bằng X bằng X"');
t('loiNoiSo_: "một trăm bốn mươi tư" = 144, "mươi lăm" = 25, 4.500 = 4500', () => {
  assert.ok(ctx.loiNoiSo_('Thể tích lớn nhất bằng một trăm bốn mươi tư.', '144'));
  assert.ok(ctx.loiNoiSo_('được hai mươi lăm cách', '25'));
  assert.ok(ctx.loiNoiSo_('lợi nhuận 4500 nghìn', '4.500'));
  assert.ok(ctx.loiNoiSo_('lợi nhuận 4.500 nghìn', '4500'));
  assert.ok(!ctx.loiNoiSo_('lợi nhuận tăng', '144'));
});
t('tuSuaCutCongThuc_: câu đã đọc bằng chữ -> KHÔNG nối thêm', () => {
  const k = {canh: [{loai: 'tinh_toan', loi_thoai: 'Thay vào, V bằng một trăm bốn mươi tư.', noi_dung_man_hinh: ['V(2) = 144']}]};
  ctx.tuSuaCutCongThuc_(k);
  assert.equal(k.canh[0].loi_thoai, 'Thay vào, V bằng một trăm bốn mươi tư.');
});
t('tuSuaCutCongThuc_: câu kết bằng "bằng <số>" khác dạng -> không nối', () => {
  const k = {canh: [{loai: 'tinh_toan', loi_thoai: 'Vậy L bằng 33800 nghìn.', noi_dung_man_hinh: ['L = 33{,}8']}]};
  ctx.tuSuaCutCongThuc_(k);
  assert.ok(!/bằng 33,8/.test(k.canh[0].loi_thoai));
});
t('tuSuaCutCongThuc_: câu thật sự cụt -> vẫn nối 1 lần', () => {
  const k = {canh: [{loai: 'tinh_toan', loi_thoai: 'Ta nhân hai số lại.', noi_dung_man_hinh: ['16 \\cdot 9 = 144']}]};
  ctx.tuSuaCutCongThuc_(k);
  assert.equal(k.canh[0].loi_thoai, 'Ta nhân hai số lại bằng 144.');
  ctx.tuSuaCutCongThuc_(k);
  assert.equal((k.canh[0].loi_thoai.match(/144/g) || []).length, 1);
});
t('prompt kịch bản cấm phiên âm "ít-sờ" / "vê tại 2" và đọc lặp', () => {
  const s = fs.readFileSync(path.join(GOC, 'PromptKichBan.gs'), 'utf8');
  assert.ok(/cấm "ít-sờ"/.test(s) && /bằng 144 bằng 144/.test(s));
});

console.log('2. Định tuyến sân khấu tự sinh 2.5D');
t('Koch / parabol giá vé -> dùng tự sinh', () => {
  const a = kb('koch_dao'), b = kb('gia_ve_parabol');
  assert.equal(ctx.dungTuSinh_({de_bai: a.de_bai, mon: 'THUC_TE'}, a), true);
  assert.equal(ctx.dungTuSinh_({de_bai: b.de_bai, mon: 'THUC_TE'}, b), true);
});
t('xác suất / hình học / video 10 phút / CAU_HINH TAT -> không', () => {
  assert.equal(ctx.dungTuSinh_({de_bai: 'Rút 2 bi từ hộp, quỹ đạo', mon: 'XAC_SUAT'}, {}), false);
  assert.equal(ctx.dungTuSinh_({de_bai: 'parabol', mon: 'HINH_HOC'}, {luong: 'hinh_hoc_thuan'}), false);
  assert.equal(ctx.dungTuSinh_({de_bai: 'parabol giá vé', mon: 'THUC_TE'}, {kieu_video: 'DAI_10_PHUT'}), false);
  cauHinh = {TU_SINH_SVG: 'TAT'};
  assert.equal(ctx.dungTuSinh_({de_bai: 'bông tuyết Koch', mon: 'THUC_TE'}, {}), false);
  cauHinh = {};
});
t('chỉ đạo "tự sinh" thắng; đề thường không có -> không', () => {
  assert.equal(ctx.dungTuSinh_({de_bai: 'Tính tổng 1 + 2 + 3', mon: 'THUC_TE'}, {chi_dao: 'vẽ bằng tự sinh svg'}), true);
  assert.equal(ctx.dungTuSinh_({de_bai: 'Tính tổng 1 + 2 + 3', mon: 'THUC_TE'}, {}), false);
});
t('prompt tự sinh: hợp đồng mã + 2.5D + viewBox + chỉ import math', () => {
  const p = ctx.huongDanTuSinh_(kb('koch_dao'), {});
  ['import math', 'def ve():', 'viewBox 0 0 800 540', '2.5D', 'TUYỆT ĐỐI', 'khi_noi'].forEach((x) => assert.ok(p.includes(x), x));
});

console.log('3. lapTuSinh_: kiểm máy + vá 1 lần');
const kbThu = () => { const k = kb('koch_dao'); delete k.khung4tang.tu_sinh; return k; };
t('máy từ chối lần 1 -> Gemini vá -> gắn', () => {
  let goi = 0, kiem = 0;
  ctx.goiGemini_ = () => { goi++; return {ma: goi === 1 ? 'def ve(): return []' : 'import math\ndef ve(): return [1]', mo_ta: 'x'}; };
  ctx.kiemTuSinhMay_ = () => { kiem++; return kiem === 1 ? {ok: false, loi: 'TS_KHONG_LOP'} : {ok: true, so_lop: 5}; };
  ctx.conDuGoiGemini_ = () => true;
  const k = kbThu();
  assert.equal(ctx.lapTuSinh_(k, {id: 'A'}, 0), true);
  assert.equal(goi, 2);
  assert.ok(/return \[1\]/.test(k.khung4tang.tu_sinh.ma));
});
t('vẫn lỗi sau 1 lần vá -> gỡ tu_sinh (không vá lần 2)', () => {
  let goi = 0;
  ctx.goiGemini_ = () => { goi++; return {ma: 'def ve(): return []'}; };
  ctx.kiemTuSinhMay_ = () => ({ok: false, loi: 'TS_TRAN_VIEWBOX'});
  const k = kbThu();
  assert.equal(ctx.lapTuSinh_(k, {id: 'A'}, 0), false);
  assert.equal(goi, 2);
  assert.ok(!k.khung4tang.tu_sinh && k.tu_sinh_da_thu);
});

console.log('4. Gỡ đường dựng Blender');
t('boDungMacDinh_ luôn 3d_vector kể cả CAU_HINH BO_DUNG_MAC_DINH=blender', () => {
  cauHinh = {BO_DUNG_MAC_DINH: 'blender'};
  assert.equal(ctx.boDungMacDinh_(), '3d_vector');
  cauHinh = {};
});
t('bài thực tế ngắn thiếu khung4tang -> lỗi cứng KHUNG4TANG_BAT_BUOC', () => {
  const k = {luong: 'thuc_te_xac_suat', mon: 'THUC_TE', canh: [{loai: 'de_bai', loi_thoai: 'a'}]};
  assert.ok(ctx.loiKhung4Tang_(k).some((x) => /^KHUNG4TANG_BAT_BUOC/.test(x)));
  assert.ok(ctx.LOI_CUNG_RE_.test('KHUNG4TANG_BAT_BUOC: x'));
});
t('không còn đặc tả cảnh Blender trong prompt (dac_ta_canh / DANH_MUC_3D_)', () => {
  assert.equal(typeof ctx.huongDanDacTaCanh_, 'undefined');
  assert.equal(typeof ctx.DANH_MUC_3D_, 'undefined');
  assert.equal(typeof ctx.loiDacTaCanh_, 'undefined');
});
t('DangVideo.gs chỉ gọi dang-video.yml (không dự phòng dung-video.yml)', () => {
  const s = fs.readFileSync(path.join(GOC, 'DangVideo.gs'), 'utf8');
  assert.ok(/'dang-video\.yml'/.test(s) && !/\}, 'dung-video\.yml'\)/.test(s));
  const w = fs.readFileSync(path.join(GOC, '.github', 'workflows', 'dung-video.yml'), 'utf8');
  assert.ok(!/\n  dang:\n/.test(w) && !/blender/i.test(w.replace(/Blender cũ|dựng Blender|Blender đã gỡ/g, '')));
});

console.log(`\nKẾT QUẢ: ${dat} đạt, ${loi} hỏng`);
process.exit(loi ? 1 : 0);
