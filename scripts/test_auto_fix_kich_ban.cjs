// v91 — Kiểm thử AUTO-FIX kịch bản + khung 4 tầng (chạy .gs trong vm, không gọi Gemini).
// Chạy: node scripts/test_auto_fix_kich_ban.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const GOC = path.join(__dirname, '..');

let cauHinh = {};
const nhatKy = [];
const ctx = vm.createContext({});
for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
// thay các hàm chạm Sheets / Cache bằng bản giả (đặt SAU khi nạp .gs)
Object.assign(ctx, {cauHinh_: (k) => cauHinh[k] || '', nhatKy_: (m, nd) => nhatKy.push(m + ': ' + nd), cauNoiGanDay_: () => [], laDai10P_: () => false});
let dat = 0;
const J = (x) => JSON.parse(JSON.stringify(x));
const t = (ten, fn) => { fn(); dat++; console.log('  ✓', ten); };

console.log('Chuẩn hóa TeX hiển thị');
t('\\binom và C(n,k) -> C_n^k', () => {
  assert.equal(ctx.suaTexHienThi_('\\binom{10}{2} = 45'), 'C_{10}^{2} = 45');
  assert.equal(ctx.suaTexHienThi_('P = C(5,2)/C(10,2)'), 'P = C_{5}^{2}/C_{10}^{2}');
});
t('dấu "." làm phép nhân -> \\cdot, giữ số thập phân và S.ABCD', () => {
  assert.equal(ctx.suaTexHienThi_('3 . 4 = 12'), '3 \\cdot 4 = 12');
  assert.equal(ctx.suaTexHienThi_('2.(x+1)'), '2 \\cdot (x+1)');
  assert.equal(ctx.suaTexHienThi_('29.50'), '29.50');
  assert.equal(ctx.suaTexHienThi_('S.ABCD'), 'S.ABCD');
});
t('bỏ $, gạch chéo kép, cân ngoặc', () => {
  assert.equal(ctx.suaTexHienThi_('$\\\\frac{1}{2}$'), '\\frac{1}{2}');
  assert.equal(ctx.suaTexHienThi_('\\frac{1}{2'), '\\frac{1}{2}');
  assert.equal(ctx.suaTexHienThi_('x^{2}}'), 'x^{2}');
});

console.log('Auto-fix kịch bản');
const kbMau = () => ({
  id: 'T1', mon: 'XAC_SUAT', luong: 'thuc_te_xac_suat', dap_an_cuoi: '7/15', dap_an: '7/15',
  hook: 'Xác suất là 7/15 đó!', hook_chu: 'Xác suất là 7/15 đó', hook_kieu: 'ket_qua_truoc',
  canh: [
    {so: 1, loai: 'mo_dau', loi_thoai: 'Rút hai thẻ, xác suất là bảy phần mười lăm.', noi_dung_man_hinh: []},
    {so: 2, loai: 'de_bai', tieu_de_canh: ': Đề bài cho gì', loi_thoai: 'Có mười thẻ, rút hai thẻ.', noi_dung_man_hinh: ['$n(\\Omega) = \\binom{10}{2}$'],
      minh_hoa: {loai: 'san_khau', mo_ta: 'x', du_lieu: {vat: [
        {id: 'a', loai: 'nhan', noi_dung: 'A', mau: 'đỏ'}, {id: 'b', loai: 'nhan', noi_dung: 'B'}, {id: 'c', loai: 'nhan', noi_dung: 'C'},
        {id: 'd', loai: 'nhan', noi_dung: 'D'}, {id: 'e', loai: 'the', ds: ['1', '2'], mau: 'xanh'}],
      hanh_dong: [{buoc: 1, vat: 'd', kieu: 'sang'}]}}},
    {so: 3, loai: 'tinh_toan', tieu_de_canh: 'Tính', loi_thoai: 'Ta có \\frac{7}{15}.', noi_dung_man_hinh: ['P = \\frac{7}{15}']},
    {so: 4, loai: 'dap_an', tieu_de_canh: 'Đáp án cuối cùng', loi_thoai: 'Vậy đáp án bảy phần mười lăm.', noi_dung_man_hinh: ['P = \\frac{7}{15}']},
    {so: 5, loai: 'bai_hoc', tieu_de_canh: 'Bài học rút ra', loi_thoai: 'Nhớ đếm bằng tổ hợp khi rút không hoàn lại. Đăng ký kênh nhé.', noi_dung_man_hinh: []},
  ],
});
t('hook lộ đáp số -> "?", lời cảnh 1 -> "bao nhiêu"', () => {
  const kb = kbMau();
  assert.ok(ctx.loHookDapAn_(kb));
  const sua = ctx.tuSuaHinhThuc_(kb, {mon: 'XAC_SUAT', lop: '11'});
  assert.ok(sua.some((x) => /che đáp số/.test(x)), sua.join('; '));
  assert.equal(ctx.loHookDapAn_(kb), '', kb.hook + ' | ' + kb.canh[0].loi_thoai);
  assert.ok(/\?/.test(kb.hook_chu) && /bao nhiêu/.test(kb.canh[0].loi_thoai));
});
t('TeX, màu, nhãn thừa, tiêu đề, lời thoại LaTeX, trường hook', () => {
  const kb = kbMau();
  ctx.tuSuaHinhThuc_(kb, {mon: 'XAC_SUAT'});
  const c2 = kb.canh[1];
  assert.equal(c2.noi_dung_man_hinh[0], 'n(\\Omega) = C_{10}^{2}');
  assert.equal(c2.tieu_de_canh, 'Đề bài cho gì');
  const vat = c2.minh_hoa.du_lieu.vat;
  assert.equal(vat.filter((v) => v.loai === 'nhan').length, 3);
  assert.equal(c2.minh_hoa.du_lieu.hanh_dong.length, 0, 'hành động trỏ nhãn bị bỏ phải gỡ');
  assert.equal(vat[0].mau, 'do');
  assert.equal(vat.find((v) => v.id === 'e').mau, 'xanh_duong');
  assert.ok(!/\\/.test(kb.canh[2].loi_thoai), kb.canh[2].loi_thoai);
  assert.ok(ctx.HOOK_KIEU_.includes(kb.hook_kieu));
  assert.ok(Array.isArray(kb.nhan_manh) && kb.nhan_manh.length && kb.hook_ung_vien.length === 3);
  assert.ok(Array.isArray(kb.bai_hoc_rut_ra) && kb.bai_hoc_rut_ra.length >= 1);
});

console.log('Phân loại lỗi cứng / cảnh báo');
t('lỗi hình thức hạ thành cảnh báo, lỗi toán giữ cứng', () => {
  const r = ctx.phanLoaiLoiCung_(['TEX_THIEU_NGOAC CANH_2: x', 'QUA_NHIEU_CHU_CANH_3: y', 'DE_BAI_CHI_CO_CHU_CANH_2: z', 'DAP_AN_CUOI_SAI', 'PHEP_TINH_SAI_CANH_4: w',
    'VI_PHAM_CHUONG_TRINH_LOP: dùng đạo hàm', 'LUONG_HINH_HOC_CON_mo_hinh_3d', 'THIEU_LOI_THOAI_CANH_3: v'], ['IT_CANH: 5'], {canh: [1, 2, 3, 4, 5, 6]});
  assert.deepEqual(J(r.nang.map((x) => x.split(/[: ]/)[0])), ['DAP_AN_CUOI_SAI', 'PHEP_TINH_SAI_CANH_4', 'VI_PHAM_CHUONG_TRINH_LOP', 'LUONG_HINH_HOC_CON_mo_hinh_3d', 'THIEU_LOI_THOAI_CANH_3']);
  assert.equal(r.nhe.length, 4);
  assert.ok(r.nhe[0].startsWith('TEX_THIEU_NGOAC') && /cảnh báo/.test(r.nhe[0]), 'giữ mã lỗi ở đầu chuỗi');
});
t('kịch bản < 4 cảnh vẫn là lỗi cứng', () => {
  const r = ctx.phanLoaiLoiCung_([], [], {canh: [1, 2]});
  assert.ok(r.nang[0].startsWith('QUA_IT_CANH'));
});
t('AUTO_FIX_KICH_BAN = TAT -> giữ hành vi cũ', () => {
  cauHinh = {AUTO_FIX_KICH_BAN: 'TAT'};
  const r = ctx.phanLoaiLoiCung_(['TEX_THIEU_NGOAC CANH_2: x'], [], {canh: [1, 2, 3, 4, 5]});
  assert.equal(r.nang.length, 1);
  const kb = kbMau();
  assert.deepEqual(J(ctx.tuSuaHinhThuc_(kb, {})), []);
  cauHinh = {};
});
t('danhGiaKichBan_ không còn từ chối vì lỗi hình thức', () => {
  const kb = kbMau();
  kb.canh[1].noi_dung_man_hinh = ['\\frac{1}{2'];   // TEX_THIEU_NGOAC (trước v91 là lỗi nặng)
  const dg = ctx.danhGiaKichBan_(kb, '7/15', 'XAC_SUAT', '', null, 'Có 10 thẻ, rút 2 thẻ.', '');
  assert.ok(!dg.nang.some((x) => /^TEX_/.test(x)), dg.nang.join('\n'));
  assert.ok(dg.nhe.some((x) => /^TEX_THIEU_NGOAC/.test(x)));
});

console.log('Khung 4 tầng / 3D Vector');
const k4Mau = () => ({
  de_ghim: [{id: 'F', nhan: 'F = 4500'}, {id: 'P', nhan: 'P = ?', mau: 'đỏ'}, {nhan: ''}],
  buoc: [
    {canh: 1, nhan: 'Dựng hình', tieu_de: 'Bốn dây cáp', mau: 'xanh', du_kien: ['F', 'khong_co'], the: [{loai: 'cong_thuc', dong: ['\\binom{4}{2}']}, {loai: 'la'}]},
    {khi_noi: 'Tách một lực', mau: 'tim', the: [{loai: 'cong_thuc', dong: []}]},
    'hong',
  ],
  canh_3d_vector: {doi_tuong: [{id: 'E', loai: 'diem', toa_do: [0, 0, 1], mau: 'vàng'}, {id: 'E', loai: 'diem'}, {id: 'x', loai: 'khoi_la'},
    {id: 'v', loai: 'vector', tu: 'E', den: [1, 0, 0]}],
  buoc: [{hien: ['E', 'v', 'ma'], hanh_dong: [{loai: 'tach_vector', vat: 'v'}, {loai: 'bay', vat: 'v'}, {loai: 'truot_diem', vat: 'khong'}]}]},
});
t('chuẩn hóa: màu, du_kien lạ, thẻ rỗng, đối tượng trùng/sai loại, hành động lạ', () => {
  const kb = {luong: 'thuc_te_xac_suat', mon: 'THUC_TE', canh: [{loi_thoai: 'Tách một lực căng.'}], khung4tang: k4Mau()};
  const sua = ctx.tuSuaKhung4Tang_(kb, {mon: 'THUC_TE'});
  const k = kb.khung4tang;
  assert.equal(kb.bo_dung, '3d_vector');
  assert.equal(k.de_ghim.length, 2);
  assert.equal(k.de_ghim[1].mau, 'hong');
  assert.equal(k.buoc.length, 2, sua.join('; '));
  assert.equal(k.buoc[0].mau, 'cyan');
  assert.equal(k.buoc[1].mau, 'hong');
  assert.deepEqual(J(k.buoc[0].du_kien), ['F']);
  assert.equal(k.buoc[0].the.length, 1);
  assert.equal(k.buoc[0].the[0].dong[0], 'C_{4}^{2}');
  assert.equal(k.buoc[1].the.length, 0);
  assert.equal(k.buoc[1].nhan, 'Bước 2');
  assert.deepEqual(J(k.canh_3d_vector.doi_tuong.map((d) => d.id)), ['E', 'v']);
  assert.equal(k.canh_3d_vector.doi_tuong[0].mau, 'vang');
  assert.deepEqual(J(k.canh_3d_vector.buoc[0].hien), ['E', 'v']);
  assert.equal(k.canh_3d_vector.buoc[0].hanh_dong.length, 1);
});
t('khung4tang hỏng -> quay về đường dựng cũ (không từ chối)', () => {
  const kb = {luong: 'thuc_te_xac_suat', canh: [], khung4tang: {buoc: 'x'}};
  ctx.tuSuaKhung4Tang_(kb, {mon: 'THUC_TE'});
  assert.ok(!kb.khung4tang);
  assert.equal(kb.bo_dung, 'blender');
});
t('KHÓA LUỒNG: bài hình học thuần bị gỡ khung4tang / canh_3d_vector / bo_dung', () => {
  const kb = {luong: 'hinh_hoc_thuan', mon: 'HINH_HOC', canh: [{minh_hoa: {loai: 'san_khau', du_lieu: {vat: []}}}], khung4tang: k4Mau(), canh_3d_vector: {}, bo_dung: '3d_vector'};
  assert.ok(ctx.loiLuongHinhHoc_(kb).some((x) => /khung4tang/.test(x)));
  ctx.khoaLuongHinhHoc_(kb);
  assert.ok(!kb.khung4tang && !kb.canh_3d_vector && !kb.bo_dung);
  assert.equal(ctx.loiLuongHinhHoc_(kb).length, 0);
  const kb2 = {luong: 'hinh_hoc_thuan', canh: [], khung4tang: k4Mau()};
  ctx.tuSuaKhung4Tang_(kb2, {mon: 'HINH_HOC'});
  assert.ok(!kb2.khung4tang);
});
t('prompt: chèn hướng dẫn khung 4 tầng cho thực tế, không cho hình học / 10 phút / BO_DUNG_MAC_DINH=blender', () => {
  ctx.laMonHinhHoc_ = (r) => String(r.mon).toUpperCase() === 'HINH_HOC';
  ctx.laVideoDai_ = (r) => /-10P$/.test(String(r.id || ''));
  assert.equal(ctx.dungKhung4Tang_({mon: 'THUC_TE', id: 'A1'}), true);
  assert.equal(ctx.dungKhung4Tang_({mon: 'HINH_HOC', id: 'A2'}), false);
  assert.equal(ctx.dungKhung4Tang_({mon: 'THUC_TE', id: 'A3-10P'}), false);
  cauHinh = {BO_DUNG_MAC_DINH: 'blender'};
  assert.equal(ctx.dungKhung4Tang_({mon: 'THUC_TE', id: 'A1'}), false);
  cauHinh = {};
  const p = ctx.huongDanKhung4Tang_({lop: '11'});
  assert.ok(/"khung4tang"/.test(p) && /canh_3d_vector/.test(p) && /tach_vector/.test(p) && /KHÔNG dùng hệ tọa độ Oxyz/.test(p));
  assert.ok(/CHỈ lớp 12/.test(p));
});
t('cảnh báo nhẹ khi thiếu khung4tang (không bao giờ nặng)', () => {
  const kb = kbMau();
  const nhe = ctx.loiKhung4Tang_(kb);
  assert.ok(nhe.some((x) => x.startsWith('THIEU_KHUNG4TANG')));
  kb.khung4tang = {buoc: [{nhan: 'a'}, {khi_noi: 'không có trong lời'}]};
  assert.ok(ctx.loiKhung4Tang_(kb).some((x) => x.startsWith('KHUNG4TANG_KHI_NOI_LECH')));
});

console.log(`\n${dat} test đạt`);
