// v98.3 — Kiểm thử phía Apps Script (chạy .gs trong vm, KHÔNG gọi mạng): node scripts/test_v98_3_gs.cjs
//  - prompt khung 4 tầng: 45-55 giây, 170-220 tiếng, hook < 12 chữ, câu 10-18 chữ, bẫy đề, khóa đuôi sau đáp án (mẹo + CTA, cấm đọc lại tóm tắt);
//  - tuSuaDuoiV983_: đuôi dài -> còn 1 mẹo + 1 CTA, bỏ cảnh thừa sau đáp án, đánh số lại cảnh + bước; đuôi gọn giữ nguyên;
//    không đụng hình không gian / video 10 phút / kịch bản không có cảnh đáp án; cảnh báo độ dài theo ngưỡng mới.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const GOC = path.join(__dirname, '..');
const props = {};
const ctx = vm.createContext({PropertiesService: {getScriptProperties: () => ({getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }})}});
for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs', 'SanKhau.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
const bo = {};
Object.assign(ctx, {CacheService: {getScriptCache: () => ({get: (k) => bo[k] || null, put: (k, v) => { bo[k] = v; }})}, cauHinh_: () => '', nhatKy_: () => {}, laDai10P_: () => false});
let dat = 0, loi = 0;
const t = (ten, fn) => {
  try { fn(); dat++; console.log('  ✓', ten); } catch (e) { loi++; console.log('  ✗', ten, '—', e.message.split('\n')[0]); }
};
const J = (x) => JSON.parse(JSON.stringify(x));

console.log('1. Prompt nhịp 45-55 giây');
const qt = ctx.quyTrinhGon4Tang_(false, {lop: '12', mon: 'XAC_SUAT'});
t('45-55 giây, 170-220 tiếng', () => { assert.ok(/45-55 GIÂY/.test(qt)); assert.ok(/170-220 TIẾNG/.test(qt)); assert.ok(!/50-68/.test(qt)); });
t('hook < 12 chữ, cấm đọc lê thê lại đề', () => { assert.ok(/HOOK/.test(qt) && /< 12 chữ/.test(qt)); assert.ok(/CẤM đọc lê thê lại toàn bộ đề/.test(qt)); });
t('câu 10-18 chữ + nhấn bẫy (không hoàn lại, tổ hợp C, chia cho toàn phần)', () => {
  assert.ok(/10-18 CHỮ/.test(qt)); ['không hoàn lại', 'tổ hợp C', 'chia cho xác suất toàn phần'].forEach((x) => assert.ok(qt.includes(x), x));
});
t('khóa đuôi: tối đa 2 câu ≤ 6 giây, cấm đọc lại tóm tắt 3 bước', () => {
  assert.ok(/KHÓA ĐUÔI SAU ĐÁP ÁN/.test(qt) && /≤ 6 giây/.test(qt)); assert.ok(/CẤM sau khi đã lộ đáp án: đọc lại 3 bước tóm tắt/.test(qt));
  assert.ok(!/đọc lần lượt 3 bước tóm tắt/.test(qt));
});
t('luồng khung 4 tầng dùng prompt gọn', () => assert.ok(/45-55/.test(String(ctx.GIAY_4TANG_))));

console.log('2. Auto-fix khóa đuôi sau đáp án');
const kbMau = () => ({
  dap_an_cuoi: 'P = 9/11', cta: 'LƯU LẠI NGAY!',
  canh: [
    {so: 1, loai: 'de_bai', loi_thoai: 'Bi đỏ này đến từ hộp nào?'},
    {so: 2, loai: 'tinh_toan', loi_thoai: 'Nhân xác suất dọc mỗi nhánh.'},
    {so: 3, loai: 'dap_an', loi_thoai: 'Vậy xác suất là chín phần mười một.'},
    {so: 4, loai: 'lien_he_thuc_te', loi_thoai: 'Công thức này dùng trong y học để đọc kết quả xét nghiệm, trong lọc thư rác và trong rất nhiều bài toán đời thực khác nữa.'},
    {so: 5, loai: 'ket_luan', loi_thoai: 'Tóm lại: vẽ cây, nhân dọc nhánh, cộng ra toàn phần, rồi chia lấy nhánh cần tìm. Mẹo nhớ: thấy chữ biết rằng, chia cho toàn phần. Lưu lại kẻo quên mẹo này!'},
  ],
  khung4tang: {buoc: [{canh: 1, khi_noi: 'bi đỏ này'}, {canh: 2, khi_noi: 'nhân xác suất'}, {canh: 3, khi_noi: 'vậy xác suất'}, {canh: 4, khi_noi: 'công thức này dùng'}, {canh: 5, khi_noi: 'tóm lại'}]},
});
const kb = kbMau();
const sua = ctx.tuSuaDuoiV983_(kb);
t('báo sửa + bỏ 1 cảnh thừa', () => { assert.equal(sua.length, 1); assert.ok(/bỏ 1 cảnh thừa/.test(sua[0]), sua[0]); });
t('còn 4 cảnh, đánh số lại 1..4, cảnh cuối ket_luan', () => { assert.deepEqual(J(kb.canh.map((c) => c.so)), [1, 2, 3, 4]); assert.equal(kb.canh[3].loai, 'ket_luan'); });
t('đuôi = mẹo + CTA, ≤ 25 tiếng, không còn câu tóm tắt', () => {
  const l = kb.canh[3].loi_thoai;
  assert.equal(l, 'Mẹo nhớ: thấy chữ biết rằng, chia cho toàn phần. Lưu lại kẻo quên mẹo này!');
  assert.ok(l.split(/\s+/).length <= 25); assert.ok(!/Tóm lại/.test(l));
});
t('bước trỏ cảnh bị bỏ dời về cảnh trước + bỏ khi_noi không còn trong lời', () => {
  const b = kb.khung4tang.buoc;
  assert.equal(b[3].canh, 3); assert.ok(!('khi_noi' in b[3]));
  assert.equal(b[4].canh, 4); assert.ok(!('khi_noi' in b[4]));
  assert.equal(b[2].khi_noi, 'vậy xác suất');
});
t('không có câu CTA -> không bịa, giữ câu ngắn; tuSuaMocCau_ thêm CTA khớp nút', () => {
  const k = kbMau(); k.canh[4].loi_thoai = 'Tóm lại: vẽ cây, nhân dọc nhánh, cộng ra toàn phần, rồi chia lấy nhánh cần tìm, thế là xong bài toán khó này rồi. Thấy chữ biết rằng thì chia toàn phần.';
  ctx.tuSuaDuoiV983_(k);
  assert.equal(k.canh[k.canh.length - 1].loi_thoai, 'Thấy chữ biết rằng thì chia toàn phần.');
});
t('cảnh kiem_tra (thử lại) ngay sau đáp án được giữ', () => {
  const k = kbMau(); k.canh[3].loai = 'kiem_tra'; k.canh[3].loi_thoai = 'Thử lại: tổng hai nhánh đúng bằng mười một phần sáu mươi.';
  ctx.tuSuaDuoiV983_(k);
  assert.equal(k.canh.length, 5); assert.equal(k.canh[3].loai, 'kiem_tra');
  assert.equal(k.canh[4].loi_thoai, 'Mẹo nhớ: thấy chữ biết rằng, chia cho toàn phần. Lưu lại kẻo quên mẹo này!');
});
t('đuôi đã gọn (1 cảnh, ≤ 2 câu, ≤ 25 tiếng) -> giữ nguyên', () => {
  const k = kbMau(); k.canh.splice(3, 1); k.canh[3].so = 4; k.canh[3].loi_thoai = 'Thấy chữ biết rằng: chia toàn phần. Lưu lại nhé!';
  const truoc = J(k);
  assert.deepEqual(J(ctx.tuSuaDuoiV983_(k)), []); assert.deepEqual(J(k), truoc);
});
t('không đụng hình không gian / 10 phút / không có cảnh đáp án', () => {
  const a = kbMau(); a.hinh_khong_gian = {khoi: {}}; assert.deepEqual(J(ctx.tuSuaDuoiV983_(a)), []);
  const b = kbMau(); b.kieu_video = 'DAI_10_PHUT'; assert.deepEqual(J(ctx.tuSuaDuoiV983_(b)), []);
  const c = kbMau(); c.canh[2].loai = 'tinh_toan'; assert.deepEqual(J(ctx.tuSuaDuoiV983_(c)), []);
});
t('chạy trong chuỗi Auto-fix khung 4 tầng (trước tuSuaMocCau_)', () => {
  const src = fs.readFileSync(path.join(GOC, 'KiemTraHinh.gs'), 'utf8');
  assert.ok(src.indexOf('tuSuaDuoiV983_(kb)') < src.indexOf('sua = sua.concat(tuSuaMocCau_(kb, r))'));
});
t('cảnh báo độ dài: > 240 tiếng, nhắc mục tiêu 45-55 giây', () => {
  const k = kbMau(); k.canh[1].loi_thoai = Array(260).fill('từ').join(' ');
  const r = ctx.loiToanV95_(k);
  assert.ok(r.nhe.some((x) => /KICH_BAN_DAI_4TANG/.test(x) && /45-55/.test(x)));
});
console.log(`\nKẾT QUẢ: ${dat} đạt, ${loi} hỏng`);
process.exit(loi ? 1 : 0);
