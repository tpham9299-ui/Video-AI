// v96 — Kiểm thử phía Apps Script (chạy .gs trong vm, không gọi Gemini): bộ định tuyến chonSanKhau_ (có / không ghi chú đạo diễn,
// đề lạ rơi vào tu_duy_dai_so thay vì hình hộp), rút mẫu nhóm THEO GIÁ TRỊ + đối chiếu đáp án + trần vét cạn 100 000,
// ký hiệu "không chia hết", mã TeX thô, đọc lặp đề, câu cụt công thức (khớp cả dạng đọc tiếng Việt), lỗi cứng, prompt / CTA,
// tỷ trọng sinh đề Xác suất, so khớp định tuyến với bản Python (khung4tang_v96.py).
// Ghi kịch bản mẫu 1 đã Auto-fix ra out/v96/vd_153504/kb_sua.json cho bước chuanbi.py. Chạy: node scripts/test_v96_gs.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const assert = require('node:assert/strict');
const GOC = path.join(__dirname, '..');

const cauHinh = {BO_DUNG_MAC_DINH: '3d_vector'};
const props = {};
const ctx = vm.createContext({PropertiesService: {getScriptProperties: () => ({getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }})}});
for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs', 'SanKhau.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
Object.assign(ctx, {cauHinh_: (k) => cauHinh[k] || '', nhatKy_: () => {}, cauNoiGanDay_: () => [], laDai10P_: () => false});
let dat = 0, loi = 0;
const t = (ten, fn) => {
  try { fn(); dat++; console.log('  ✓', ten); } catch (e) { loi++; console.log('  ✗', ten, '—', e.message.split('\n')[0]); }
};
const J = (x) => JSON.parse(JSON.stringify(x));
const doc = (f) => JSON.parse(fs.readFileSync(path.join(GOC, f), 'utf8'));

t('Sheets ghi phân số ở ô văn bản và chặn Date, ISO', () => {
  const writes = [];
  const sh = {getRange: () => ({setNumberFormat: v => writes.push(v), setValue: v => writes.push(v)})};
  ctx.ghi_(sh, 2, {dap_an: '5/7'});
  assert.deepEqual(writes.slice(0,2), ['@','5/7']);
  for (const bad of [new Date('2026-07-04T17:00:00Z'),'2026-07-04T17:00:00.000Z'])
    assert.throws(() => ctx.dapAnVanBan_(bad), /DAP_AN_NGAY/);
});
console.log('Bộ định tuyến chonSanKhau_');
const CA = [
  ['thẻ 1..10 tích ⋮ 4 -> rut_mau', {mon: 'XAC_SUAT', lop: '11', de_bai: 'Rút ngẫu nhiên 3 thẻ từ 10 thẻ đánh số từ 1 đến 10. Tính xác suất tích chia hết cho 4.'}, 'rut_mau'],
  ['xét nghiệm lớp 12 -> luoi_bayes', {mon: 'XAC_SUAT', lop: '12', de_bai: 'Tỉ lệ mắc bệnh 1%, xét nghiệm dương tính đúng 99%. Biết người đó dương tính, tính xác suất mắc bệnh.'}, 'luoi_bayes'],
  ['điều kiện lớp 11 -> so_do_cay (không vượt GDPT)', {mon: 'XAC_SUAT', lop: '11', de_bai: 'Xét nghiệm dương tính, biết rằng... tính xác suất.'}, 'so_do_cay'],
  ['bắn 2 lần độc lập -> so_do_cay', {mon: 'XAC_SUAT', lop: '11', de_bai: 'Một xạ thủ bắn 2 lần độc lập, xác suất trúng mỗi lần 0,8. Tính xác suất trúng đúng 1 lần.'}, 'so_do_cay'],
  ['khoanh bừa 10 câu -> cot_phan_phoi', {mon: 'XAC_SUAT', lop: '12', de_bai: 'Khoanh bừa 10 câu trắc nghiệm, tính xác suất đúng ít nhất 5 câu.'}, 'cot_phan_phoi'],
  ['giá bán / lợi nhuận -> kinh_te_do_thi', {mon: 'THUC_TE', lop: '12', de_bai: 'Quán bán trà sữa 30 nghìn, giảm giá 1 nghìn bán thêm 20 ly. Tìm giá để lợi nhuận lớn nhất.'}, 'kinh_te_do_thi'],
  ['lãi kép -> tang_truong', {mon: 'THUC_TE', lop: '12', de_bai: 'Gửi tiết kiệm 100 triệu, lãi kép 6% mỗi năm. Sau bao nhiêu năm được 200 triệu?'}, 'tang_truong'],
  ['qua sông -> so_do_2d', {mon: 'THUC_TE', lop: '12', de_bai: 'Một người chèo thuyền qua sông rộng 3 km rồi chạy bộ trên bờ tới B cách 8 km. Chọn điểm cập bờ để thời gian ít nhất.'}, 'so_do_2d'],
  ['tấm bìa gập hộp -> 3d_vector', {mon: 'THUC_TE', lop: '12', de_bai: 'Từ tấm bìa 12 cm, cắt bốn góc rồi gập thành hộp không nắp. Tìm x để thể tích lớn nhất.'}, '3d_vector'],
  ['phương trình mũ (AI gắn nhầm khuôn hộp) -> tu_sinh_svg', {mon: 'THUC_TE', lop: '12', de_bai: 'Giải phương trình 4^x - 3.2^x + 2 = 0.', khung4tang: {buoc: [], canh_3d_vector: {khuon: 'tam_bia_gap_hop'}}}, 'tu_sinh_svg'],
  ['bất đẳng thức lạ -> tu_sinh_svg', {mon: 'THUC_TE', lop: '11', de_bai: 'Chứng minh a^2 + b^2 >= 2ab với mọi a, b.'}, 'tu_sinh_svg'],
  ['chỉ đạo "chỉ dùng sơ đồ tư duy" vẫn minh họa bài hộp', {mon: 'THUC_TE', lop: '12', chi_dao: '[chidao: chỉ dùng sơ đồ tư duy]', de_bai: 'Tấm bìa 12 cm gập hộp.'}, '3d_vector'],
  ['chỉ đạo "dùng lưới Bayes" lớp 11 -> so_do_cay', {mon: 'XAC_SUAT', lop: '11', chi_dao: 'dùng lưới Bayes', de_bai: 'Rút 2 thẻ.'}, 'so_do_cay'],
  ['chỉ đạo "vẽ đồ thị lợi nhuận"', {mon: 'THUC_TE', lop: '12', chi_dao: '[chidao: vẽ đồ thị lợi nhuận]', de_bai: 'Bài toán bán hàng.'}, 'kinh_te_do_thi'],
  ['hình học thuần -> giữ luồng v94', {mon: 'HINH_HOC', lop: '9', de_bai: 'Cho tam giác ABC vuông tại A.'}, 'hinh_hoc'],
];
for (const [ten, kb, mong] of CA) t(ten, () => assert.equal(ctx.chonSanKhau_(J(kb), {}).loai, mong));
t('chỉ đạo ghi nguồn chi_dao + lời gốc', () => { const q = ctx.chonSanKhau_({mon: 'THUC_TE', lop: '12', chi_dao: '[chidao: vẽ đồ thị lợi nhuận]'}, {}); assert.equal(q.nguon, 'chi_dao'); assert.equal(q.chi_dao, 'vẽ đồ thị lợi nhuận'); });
t('tachChiDao_ tách thẻ khỏi đề Zalo', () => assert.deepEqual(J(ctx.tachChiDao_('[chidao: dùng sơ đồ cây] Bắn 2 lần...')), {de: 'Bắn 2 lần...', chi_dao: 'dùng sơ đồ cây'}));
t('so khớp định tuyến với bản Python (15 ca)', () => {
  const ma = 'import json,sys; sys.path.insert(0, "scripts"); import khung4tang_v96 as v; ca = json.load(sys.stdin); print(json.dumps([v.chon_san_khau(kb)["loai"] for kb in ca]))';
  const r = spawnSync('python', ['-c', ma], {cwd: GOC, input: JSON.stringify(CA.map((c) => c[1])), encoding: 'utf8', env: {...process.env, PYTHONIOENCODING: 'utf-8'}});
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), CA.map((c) => c[2]));
});

console.log('Rút mẫu: nhóm THEO GIÁ TRỊ (vá lỗi tô theo chỉ số ô của VD261122-153504-0)');
const kbThe = {de_bai: 'Rút ngẫu nhiên 3 thẻ từ 10 thẻ đánh số từ 1 đến 10. Tính xác suất để tích 3 số chia hết cho 4.', dap_an: '2/3'};
const rm = ctx.tinhRutMau_({nhom: [{nhan: 'Chia hết cho 4', so: 2}, {nhan: 'Chẵn không chia hết cho 4', so: 3}, {nhan: 'Lẻ', so: 5}]}, kbThe);
t('nhóm {4,8} | {2,6,10} | {1,3,5,7,9} (không phải {1,2} | {3,4,5} | {6..10})', () => assert.deepEqual(J(rm.nhom.map((g) => g.phan_tu)), [[4, 8], [2, 6, 10], [1, 3, 5, 7, 9]]));
t('n(Ω) = 120, n(A) = 80, P = 2/3 khớp đáp án', () => { assert.equal(rm.n_omega, 120); assert.equal(rm.n_a, 80); assert.equal(rm.p_tex, '\\dfrac{2}{3}'); assert.equal(rm.khop, true); });
t('đáp án sai 1/2 -> khop = false', () => assert.equal(ctx.tinhRutMau_({}, Object.assign({}, kbThe, {dap_an: '1/2'})).khop, false));
t('nhóm ghi \\not\\vdots / "không ⋮" vẫn đọc đúng giá trị', () => {
  const r2 = ctx.tinhRutMau_({nhom: [{nhan: '\\vdots 4'}, {nhan: '\\text{chẵn} \\not\\vdots 4'}, {nhan: 'lẻ'}]}, kbThe);
  assert.deepEqual(J(r2.nhom.map((g) => g.phan_tu)), [[4, 8], [2, 6, 10], [1, 3, 5, 7, 9]]);
});
t('trần vét cạn: 40 thẻ chọn 6 (3,8 triệu) -> lấy mẫu < 3 s, không treo', () => {
  const t0 = Date.now();
  const r3 = ctx.tinhRutMau_({den: 40, k: 6, bien_co: {loai: 'tong_chia_het', so: 3}}, {de_bai: '', dap_an: '1/3'});
  assert.ok(Date.now() - t0 < 3000); assert.equal(r3.vet_can, false); assert.ok(Math.abs(r3.p - 1 / 3) < 0.02, String(r3.p));
});
t('dưới trần: 20 thẻ chọn 4 (4845) vét cạn chính xác', () => assert.equal(ctx.tinhRutMau_({den: 20, k: 4, bien_co: {loai: 'tich_chia_het', so: 2}}, {de_bai: ''}).vet_can, true));

console.log('Ký hiệu "không chia hết" & mã TeX thô');
t('\\not\\vdots -> \\text{ không } \\vdots (công thức)', () => assert.equal(ctx.chuanKhongChiaHet_('15 \\not\\vdots 4', 'tex'), '15 \\text{ không } \\vdots 4'));
t('\\nmid / ∤ -> không \\vdots (tiêu đề ChuTron)', () => { assert.equal(ctx.chuanKhongChiaHet_('Tích \\nmid 4', 'tron'), 'Tích không \\vdots 4'); assert.equal(ctx.chuanKhongChiaHet_('Tích ∤ 4', 'tron'), 'Tích không \\vdots 4'); });
t('texSangChu_ giữ nghĩa: \\overline{A}: tích \\not\\vdots 4 -> Ā: tích không ⋮ 4', () => assert.equal(ctx.texSangChu_('\\overline{A}: tích \\not\\vdots 4'), 'Ā: tích không ⋮ 4'));
t('texSangChu_: n(\\Omega) = C_{10}^{3}', () => assert.equal(ctx.texSangChu_('n(\\Omega) = C_{10}^{3}'), 'n(Ω) = C₁₀³'));

console.log('Đọc số tiếng Việt / câu cụt công thức');
t('2/3 ↔ "hai phần ba"', () => assert.ok(ctx.loiNoiSo_('vậy xác suất là hai phần ba', '2/3')));
t('120 ↔ "một trăm hai mươi"', () => assert.ok(ctx.loiNoiSo_('có một trăm hai mươi cách', '120')));
t('0,5 ↔ "không phẩy năm"', () => assert.ok(ctx.loiNoiSo_('xác suất bằng không phẩy năm', '0,5')));
t('120 không khớp nhầm 1200', () => assert.ok(!ctx.loiNoiSo_('có 1200 cách', '120')));
t('Auto-fix không nối lặp khi lời đã đọc bằng chữ', () => {
  const kb = {canh: [{loai: 'tinh_toan', loi_thoai: 'Vậy xác suất là hai phần ba.', noi_dung_man_hinh: ['P(A) = \\dfrac{2}{3}']}]};
  ctx.tuSuaCutCongThuc_(kb); assert.equal(kb.canh[0].loi_thoai, 'Vậy xác suất là hai phần ba.');
});
t('câu cụt "ta có số phần tử không gian mẫu." -> "... bằng 120."', () => {
  const kb = {canh: [{loai: 'tinh_toan', loi_thoai: 'Trước hết ta có số phần tử không gian mẫu.', noi_dung_man_hinh: ['n(\\Omega) = C_{10}^{3} = 120']}]};
  ctx.tuSuaCutCongThuc_(kb); assert.equal(kb.canh[0].loi_thoai, 'Trước hết ta có số phần tử không gian mẫu bằng 120.');
});

console.log('Auto-fix trọn bộ trên mẫu 1 (tái hiện VD261122-153504-0)');
const kb1 = doc('mau/v96/vd_153504.json');
const sua1 = ctx.tuSuaKhung4Tang_(kb1, {lop: '11', mon: 'XAC_SUAT'});
t('đọc đề còn đúng 1 lần (bỏ 2 cảnh lặp), cảnh đánh số lại', () => { assert.equal(ctx.canhLapDe_(kb1).length, 0); assert.equal(kb1.canh.length, 7); assert.deepEqual(J(kb1.canh.map((c) => c.so)), [1, 2, 3, 4, 5, 6, 7]); });
t('bước khung 4 tầng trỏ lại đúng cảnh sau khi bỏ', () => assert.deepEqual(kb1.khung4tang.buoc.map((b) => b.canh), [1, 2, 4, 6]));
t('sân khấu rut_mau thay lưới thẻ 3D (bỏ canh_3d_vector)', () => { assert.equal(kb1.khung4tang.san_khau.loai, 'rut_mau'); assert.equal(kb1.khung4tang.canh_3d_vector, undefined); });
t('nhóm trong kịch bản đã là GIÁ TRỊ', () => assert.deepEqual(J(kb1.khung4tang.san_khau.tham_so.nhom.map((g) => g.phan_tu)), [[4, 8], [2, 6, 10], [1, 3, 5, 7, 9]]));
t('tiêu đề "\\not\\vdots" -> "không \\vdots"', () => assert.equal(kb1.khung4tang.buoc[2].tieu_de, '\\overline{A}: Tích 3 số không \\vdots 4'));
t('câu cụt n(Ω) đã đọc 120', () => assert.ok(/120/.test(kb1.canh[1].loi_thoai), kb1.canh[1].loi_thoai));
t('không còn lỗi cứng v96 sau Auto-fix', () => assert.deepEqual(J(ctx.loiSanKhau_(kb1)), []));
t('nhật ký Auto-fix có ghi', () => assert.ok(sua1.some((x) => /đọc lặp đề/.test(x)) && sua1.some((x) => /sân khấu 2D rut_mau/.test(x)), sua1.join('; ')));
fs.mkdirSync(path.join(GOC, 'out/v96/vd_153504'), {recursive: true});
fs.writeFileSync(path.join(GOC, 'out/v96/vd_153504/kb_sua.json'), JSON.stringify(kb1, null, 1));

console.log('Lỗi cứng');
t('đáp án sai -> XS_SAI_DAP_SO là lỗi cứng', () => {
  const kb = doc('mau/v96/vd_153504.json'); kb.dap_an_cuoi = 'P(A) = 1/2';
  ctx.tuSuaKhung4Tang_(kb, {lop: '11', mon: 'XAC_SUAT'});
  const l = ctx.loiSanKhau_(kb).filter((x) => /^XS_SAI_DAP_SO/.test(x));
  assert.equal(l.length, 1); assert.ok(ctx.LOI_CUNG_RE_.test(l[0]));
});
t('KB_DOC_LAP_DE / KB_CUT_CONG_THUC / MA_THO_HIEN_THI thuộc lỗi cứng', () => ['KB_DOC_LAP_DE: x', 'KB_CUT_CONG_THUC: x', 'MA_THO_HIEN_THI: x'].forEach((x) => assert.ok(ctx.LOI_CUNG_RE_.test(x))));
t('cảnh nội dung (không phải mở đầu) đọc lại đề -> vẫn báo KB_DOC_LAP_DE', () => {
  const kb = {de_bai: 'Rút ngẫu nhiên 3 thẻ từ 10 thẻ đánh số từ 1 đến 10 tính xác suất tích chia hết cho 4', khung4tang: {buoc: []},
    canh: [{loai: 'de_bai', loi_thoai: 'Rút ngẫu nhiên 3 thẻ từ 10 thẻ đánh số từ 1 đến 10 tính xác suất tích chia hết cho 4'}, {loai: 'tinh_toan', loi_thoai: 'Rút ngẫu nhiên 3 thẻ từ 10 thẻ đánh số từ 1 đến 10 tính xác suất tích chia hết cho 4'}]};
  assert.ok(ctx.loiSanKhau_(kb).some((x) => /^KB_DOC_LAP_DE/.test(x)));
});

console.log('Prompt / CTA / sinh đề');
const pXS = ctx.huongDanKhung4Tang_({lop: '11', mon: 'XAC_SUAT', chi_dao: '[chidao: dùng sơ đồ cây]'});
t('bài xác suất: dạy san_khau, không dạy khuôn 3D lưới thẻ', () => { assert.ok(/san_khau/.test(pXS)); assert.ok(!/Khuôn dùng được cho bài/.test(pXS)); });
t('prompt dạy nhóm theo GIÁ TRỊ + \\text{ không } \\vdots', () => assert.ok(/phan_tu/.test(pXS) && /text\{ không \}/.test(pXS) && /CẤM \\\\not\\\\vdots/.test(pXS)));
t('chỉ đạo người dùng đưa thẳng vào prompt', () => assert.ok(/CHỈ ĐẠO CỦA NGƯỜI DÙNG.*dùng sơ đồ cây/.test(pXS)));
t('lớp 11 không được dạy luoi_bayes', () => assert.ok(!/"loai":"luoi_bayes"/.test(pXS)));
const qt = ctx.quyTrinhGon4Tang_(false, {lop: '12', mon: 'THUC_TE'});
t('quy trình: đọc đề đúng 1 lần + đọc đủ công thức', () => assert.ok(/ĐỌC ĐỀ ĐÚNG 1 LẦN/.test(qt) && /KB_CUT_CONG_THUC/.test(qt) && !/mo_dau \(câu hỏi của đề/.test(qt)));
t('CTA siêu ngắn ưu tiên bình luận / lưu, cấm "đăng ký kênh" dài (v98.3 khóa đuôi)', () => assert.ok(/CTA siêu ngắn/.test(qt) && /Bình luận đáp án/.test(qt) && /câu "đăng ký kênh\.\.\." dài/.test(qt)));
t('tỷ trọng sinh đề: TY_LE_XAC_SUAT 55 -> 11/20 lượt là Xác suất', () => {
  cauHinh.TY_LE_XAC_SUAT = '55'; props.MON_KE = '0';
  const ds = Array.from({length: 20}, () => ctx.chonMon_());
  assert.equal(ds.filter((m) => m === 'XAC_SUAT').length, 11, ds.join(','));
});
t('mặc định (không cấu hình) cũng 55 %', () => { delete cauHinh.TY_LE_XAC_SUAT; props.MON_KE = '0'; assert.equal(Array.from({length: 20}, () => ctx.chonMon_()).filter((m) => m === 'XAC_SUAT').length, 11); });
t('sinh đề XS xoay vòng bối cảnh đời thực (không chỉ rút thẻ)', () => {
  props.BOI_CANH_XS_KE = '0';
  const ds = Array.from({length: 4}, () => ctx.yeuCauKhuonSinhDe_('12', 'XAC_SUAT'));
  assert.equal(new Set(ds).size, 4); assert.ok(ds.every((x) => /BỐI CẢNH LẦN NÀY/.test(x)));
});
t('sinh đề THUC_TE xen kẽ Kinh tế / Chuyển động 2D / Tăng trưởng với khuôn 3D', () => {
  props.NHOM_TT_KE = '0';
  const ds = Array.from({length: 5}, () => ctx.yeuCauKhuonSinhDe_('12', 'THUC_TE'));
  assert.ok(/KINH TẾ/.test(ds[1]) && /CHUYỂN ĐỘNG/.test(ds[3]) && /TĂNG TRƯỞNG/.test(ds[4]) && /KHUÔN HÌNH 3D/.test(ds[0]), ds.map((x) => x.slice(0, 40)).join(' | '));
});
t('cột Sheet chi_dao nối CUỐI (dữ liệu cũ không lệch)', () => assert.equal(vm.runInContext('COT[COT.length - 1]', ctx), 'chi_dao'));
t('SanKhau.gs nằm trong danh sách tự đồng bộ', () => assert.ok(vm.runInContext('DANH_SACH_TEP_GS_', ctx).includes('SanKhau')));

console.log(`\nKẾT QUẢ: ${dat} đạt, ${loi} hỏng`);
process.exit(loi ? 1 : 0);
