// v95 — Kiểm thử phía Apps Script (chạy .gs trong vm, không gọi Gemini): chuẩn Toán (parabol / căn cứ cực trị),
// câu rào, thứ tự thẻ theo lời đọc, khử thẻ lặp ở ranh giới bước, tiêu đề intro bài hộp, tóm tắt đủ 3 dòng, CTA khớp lời,
// prompt gọn 50-68 s cho luồng khung 4 tầng. Ghi kịch bản đã Auto-fix ra out/v95/hop/kb_sua.json cho bước chuanbi.py.
// Chạy: node scripts/test_v95_gs.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const GOC = path.join(__dirname, '..');

const cauHinh = {BO_DUNG_MAC_DINH: '3d_vector'};
const ctx = vm.createContext({});
for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
Object.assign(ctx, {cauHinh_: (k) => cauHinh[k] || '', nhatKy_: () => {}, cauNoiGanDay_: () => [], laDai10P_: () => false});
let dat = 0, loi = 0;
const t = (ten, fn) => {
  try { fn(); dat++; console.log('  ✓', ten); } catch (e) { loi++; console.log('  ✗', ten, '—', e.message.split('\n')[0]); }
};
const J = (x) => JSON.parse(JSON.stringify(x));
const mau = JSON.parse(fs.readFileSync(path.join(GOC, 'mau/kich_ban_v95_hop_16x10.json'), 'utf8'));

console.log('Bậc hàm (sai phân hữu hạn)');
t('x(16 - 2x)(10 - 2x) là bậc ba -> khac', () => assert.equal(ctx.bacHam_('x(16 - 2x)(10 - 2x)', 'x'), 'khac'));
t('-x^2 + 4x + 5 là bậc hai', () => assert.equal(ctx.bacHam_('-x^2 + 4x + 5', 'x'), 'bac2'));
t('2\\pi r^2 + \\frac{1024}{r} (phân thức) -> khac', () => assert.equal(ctx.bacHam_('2\\pi r^2 + \\frac{1024}{r}', 'r'), 'khac'));
t('20 - 4t bậc nhất', () => assert.equal(ctx.bacHam_('20 - 4t', 't'), 'bac01'));
t('chuỗi lạ -> null (không đoán)', () => assert.equal(ctx.bacHam_('alert(1)', 'x'), null));

console.log('Auto-fix v95 trên bài hộp 16×10 (tái hiện TT261122-133524-0)');
const kb = J(mau);
const sua = ctx.tuSuaKhung4Tang_(kb, {lop: '12', mon: 'THUC_TE'});
const van = JSON.stringify(Object.assign({}, kb, {_ghi_chu: ''}));
t('không còn chữ "parabol" (hàm bậc ba)', () => assert.ok(!/parabol/i.test(van), String(van.match(/.{30}parabol.{30}/i))));
t('"đỉnh parabol" -> "điểm cực đại"', () => assert.ok(/điểm cực đại/.test(kb.canh[7].loi_thoai), kb.canh[7].loi_thoai));
t('bỏ câu rào "Thật tuyệt vời" / "Khoan chốt vội" / "Muốn tìm..., trước hết ta cần"', () => {
  assert.ok(!/tuyệt vời|khoan chốt|trước hết ta cần/i.test(kb.canh[2].loi_thoai + kb.canh[5].loi_thoai), kb.canh[2].loi_thoai + ' | ' + kb.canh[5].loi_thoai);
  assert.ok(/gọi x là cạnh/.test(kb.canh[2].loi_thoai));   // giữ nguyên cụm khi_noi
});
t('thẻ bước 2 theo đúng thứ tự lời đọc: Đặt ẩn -> Kích thước -> Hàm thể tích', () => {
  assert.equal(kb.khung4tang.buoc[1].the.map((x) => x.nhan).join(' > '), 'Đặt ẩn > Kích thước đáy > Hàm thể tích');
});
t('thẻ V\'(x) lặp ở ranh giới bước 2 -> 3: giữ ở bước "Đạo hàm", bỏ ở cuối bước 2', () => {
  assert.ok(/12x\^2/.test((kb.khung4tang.buoc[2].the[0].dong || []).join()), JSON.stringify(kb.khung4tang.buoc[2].the[0]));
  assert.ok(!kb.khung4tang.buoc[1].the.some((x) => /12x\^2/.test((x.dong || []).join())));
});
t('tiêu đề intro bài hộp -> "CẮT CẠNH BAO NHIÊU ĐỂ HỘP LỚN NHẤT?"', () => assert.equal(kb.tieu_de_intro, 'CẮT CẠNH BAO NHIÊU ĐỂ HỘP LỚN NHẤT?'));
t('tom_tat_3_buoc luôn đủ 3 dòng', () => assert.equal(kb.tom_tat_3_buoc.length, 3));
t('CTA lấy theo lời đọc cảnh cuối ("Đăng ký kênh") -> nút "ĐĂNG KÝ KÊNH!"', () => assert.equal(kb.cta, 'ĐĂNG KÝ KÊNH!'));
t('phụ đề khung 4 tầng mặc định bật (gon)', () => assert.equal(kb.khung4tang.phu_de, 'gon'));
t('nhật ký Auto-fix ghi đủ các mục v95', () => assert.ok(sua.filter((x) => /^v95:/.test(x)).length >= 5, sua.join(' | ')));

console.log('Lỗi cứng chuẩn Toán');
t('kịch bản đã sửa: không còn lỗi cứng TOAN_*', () => assert.equal(JSON.stringify(ctx.loiToanV95_(kb).nang), '[]'));
t('còn "parabol" ở hàm bậc ba (Auto-fix tắt) -> TOAN_GOI_SAI_PARABOL', () => {
  assert.ok(ctx.loiToanV95_(J(mau)).nang.some((x) => /^TOAN_GOI_SAI_PARABOL/.test(x)));
});
t('nhảy cóc V\'(x) = 0 -> kết luận lớn nhất, thiếu căn cứ -> TOAN_THIEU_CAN_CU_CUC_TRI', () => {
  const k = J(kb);
  k.canh[7].loi_thoai = 'Vậy x = 2 cho thể tích lớn nhất.';
  k.canh[k.canh.length - 1].loi_thoai = 'Tóm lại: đặt ẩn, lập hàm, giải đạo hàm bằng 0. Đăng ký kênh nhé!';
  k.khung4tang.buoc[3].the = [{loai: 'chu', noi_dung: 'x = 2'}];
  k.khung4tang.buoc[3].tieu_de = 'Chốt x = 2';
  assert.ok(ctx.loiToanV95_(k).nang.some((x) => /^TOAN_THIEU_CAN_CU_CUC_TRI/.test(x)));
});
for (const [ten, cau] of [['bảng biến thiên', 'Lập bảng biến thiên thấy V lớn nhất tại x = 2.'], ['so sánh đầu mút', 'So sánh giá trị tại đầu mút và x = 2, V lớn nhất.'],
  ['Cauchy', 'Theo bất đẳng thức Cauchy, V lớn nhất khi x = 2.'], ['đỉnh hàm bậc hai', 'Đỉnh của hàm bậc hai cho giá trị lớn nhất tại x = 2.']]) {
  t('căn cứ hợp lệ "' + ten + '" -> không lỗi', () => {
    const k = J(kb);
    k.canh[7].loi_thoai = cau;
    k.canh[k.canh.length - 1].loi_thoai = 'Tóm lại: đặt ẩn, lập hàm, giải đạo hàm bằng 0. Đăng ký kênh nhé!';
    k.khung4tang.buoc[3].tieu_de = 'Chốt x = 2';
    k.khung4tang.buoc[3].the = [{loai: 'chu', noi_dung: 'x = 2'}];
    assert.ok(!ctx.loiToanV95_(k).nang.some((x) => /^TOAN_THIEU_CAN_CU_CUC_TRI/.test(x)));
  });
}
t('lỗi TOAN_* là lỗi CỨNG (LOI_CUNG_RE_)', () => { assert.ok(ctx.LOI_CUNG_RE_.test('TOAN_GOI_SAI_PARABOL: x')); assert.ok(ctx.LOI_CUNG_RE_.test('TOAN_THIEU_CAN_CU_CUC_TRI: x')); });
t('hàm thật sự bậc hai: "đỉnh parabol" được giữ, không báo lỗi', () => {
  const k = {luong: 'thuc_te_xac_suat', de_bai: 'Tìm giá trị lớn nhất', canh: [{loai: 'tinh_toan', loi_thoai: 'Đỉnh parabol tại t = 2', noi_dung_man_hinh: ['h(t) = -5t^2 + 20t']}], khung4tang: {buoc: []}};
  ctx.tuSuaToanV95_(k);
  assert.ok(/parabol/.test(k.canh[0].loi_thoai));
  assert.ok(!ctx.loiToanV95_(k).nang.some((x) => /PARABOL/.test(x)));
});

console.log('CTA theo ngữ nghĩa lời đọc');
for (const [loi, nhan] of [['Nhớ lưu lại video để ôn nhé!', 'LƯU LẠI NGAY!'], ['Bình luận đáp án của bạn nhé', 'BÌNH LUẬN NGAY!'],
  ['Lưu ý điều kiện. Đăng ký kênh nhé!', 'ĐĂNG KÝ KÊNH!'], ['Giải thích xong rồi, theo dõi kênh nhé', 'THEO DÕI KÊNH!'], ['Lưu ý x > 0.', '']]) {
  t('"' + loi + '" -> "' + nhan + '"', () => assert.equal(ctx.ctaTuLoi_(loi), nhan));
}
t('lời cuối không có câu kêu gọi -> thêm câu khớp nút', () => {
  const k = J(mau);
  k.canh[k.canh.length - 1].loi_thoai = 'Tóm lại ba bước: đặt ẩn, lập hàm, xét dấu.';
  ctx.tuSuaKhung4Tang_(k, {lop: '12'});
  assert.equal(k.cta, 'LƯU LẠI NGAY!');
  assert.ok(/Lưu lại ngay/.test(k.canh[k.canh.length - 1].loi_thoai), k.canh[k.canh.length - 1].loi_thoai);
});

console.log('Prompt gọn 50-68 s cho khung 4 tầng');
t('quyTrinh6Phan_ luồng 4 tầng: 8-12 cảnh, 50-68 giây, cấm câu rào, chuẩn parabol / căn cứ cực trị', () => {
  const p = ctx.quyTrinh6Phan_(true, {lop: '12', mon: 'THUC_TE'});
  for (const k of ['8-12 cảnh', '50-68', 'thật tuyệt vời', 'parabol', 'đổi dấu', 'CẮT CẠNH BAO NHIÊU']) assert.ok(p.includes(k), k);
});
t('luồng hình học thuần vẫn giữ quy trình 6 phần cũ', () => {
  const p = ctx.quyTrinh6Phan_(true, {lop: '9', mon: 'HINH_HOC'});
  assert.ok(p.includes('QUY TRÌNH CỐ ĐỊNH 6 PHẦN'));
});

console.log('Bài lon có ngưỡng S ≤ 400 (mau/kich_ban_v93_lon_nguong.json) vẫn qua Auto-fix v95');
const lon = JSON.parse(fs.readFileSync(path.join(GOC, 'mau/kich_ban_v93_lon_nguong.json'), 'utf8'));
ctx.tuSuaKhung4Tang_(lon, {lop: String(lon.lop || '12'), mon: lon.mon || 'THUC_TE'});
t('lon: không lỗi cứng TOAN_*, giữ ngưỡng của đối chiếu, tóm tắt 3 dòng', () => {
  assert.equal(JSON.stringify(ctx.loiToanV95_(lon).nang), '[]');
  assert.ok((lon.khung4tang.buoc || []).some((b) => b.doi_chieu && b.doi_chieu.nguong), 'mất ngưỡng');
  assert.equal(lon.tom_tat_3_buoc.length, 3);
});
fs.mkdirSync(path.join(GOC, 'out/v95/lon'), {recursive: true});
fs.writeFileSync(path.join(GOC, 'out/v95/lon/kb_sua.json'), JSON.stringify(lon, null, 1));

const ra = path.join(GOC, 'out/v95/hop');
fs.mkdirSync(ra, {recursive: true});
fs.writeFileSync(path.join(ra, 'kb_sua.json'), JSON.stringify(kb, null, 1));
console.log(`\n${dat} đạt, ${loi} lỗi  (kịch bản đã Auto-fix: out/v95/hop/kb_sua.json)`);
process.exit(loi ? 1 : 0);
