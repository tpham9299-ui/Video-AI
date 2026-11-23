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
t('v99.1: khung4tang hỏng -> gỡ, không còn bo_dung = blender', () => {
  const kb = {luong: 'thuc_te_xac_suat', canh: [], khung4tang: {buoc: 'x'}};
  ctx.tuSuaKhung4Tang_(kb, {mon: 'THUC_TE'});
  assert.ok(!kb.khung4tang);
  assert.equal(kb.bo_dung, undefined);
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
t('prompt: chèn hướng dẫn khung 4 tầng cho thực tế, không cho hình học / 10 phút / BO_DUNG_MAC_DINH=blender bị bỏ qua (v99.1)', () => {
  ctx.laMonHinhHoc_ = (r) => String(r.mon).toUpperCase() === 'HINH_HOC';
  ctx.laVideoDai_ = (r) => /-10P$/.test(String(r.id || ''));
  assert.equal(ctx.dungKhung4Tang_({mon: 'THUC_TE', id: 'A1'}), true);
  assert.equal(ctx.dungKhung4Tang_({mon: 'HINH_HOC', id: 'A2'}), false);
  assert.equal(ctx.dungKhung4Tang_({mon: 'THUC_TE', id: 'A3-10P'}), false);
  cauHinh = {BO_DUNG_MAC_DINH: 'blender'};
  assert.equal(ctx.dungKhung4Tang_({mon: 'THUC_TE', id: 'A1'}), true);
  cauHinh = {};
  const p = ctx.huongDanKhung4Tang_({lop: '11'});
  assert.ok(/"khung4tang"/.test(p) && /canh_3d_vector/.test(p) && /tach_vector/.test(p) && /KHÔNG dùng hệ tọa độ Oxyz/.test(p));
  // v92: lớp 11 không được gợi ý khuôn Oxyz; lớp 12 có
  assert.ok(!/hai_mat_cau_oxyz/.test(p) && /tam_bia_gap_hop/.test(p));
  assert.ok(/hai_mat_cau_oxyz \(CHỈ lớp 12/.test(ctx.huongDanKhung4Tang_({lop: '12'})));
});
t('v99.1: thiếu khung4tang -> KHUNG4TANG_BAT_BUOC', () => {
  const kb = kbMau();
  const nhe = ctx.loiKhung4Tang_(kb);
  assert.ok(nhe.some((x) => x.startsWith('KHUNG4TANG_BAT_BUOC')));
  kb.khung4tang = {buoc: [{nhan: 'a'}, {khi_noi: 'không có trong lời'}]};
  assert.ok(ctx.loiKhung4Tang_(kb).some((x) => x.startsWith('KHUNG4TANG_KHI_NOI_LECH')));
});

console.log('v92: Auto-fix 3D khuôn tham số, tiêu đề, Casio, BBT, phụ đề');
t('suy khuôn từ đề: 12 thẻ / lon 512 cm³ / bìa 12×12 / 8 viên bi / ô tô tích phân', () => {
  assert.deepEqual(J(ctx.suyKhuon_({mon: 'XAC_SUAT', de_bai: 'Có 12 thẻ đánh số từ 1 đến 12. Rút ngẫu nhiên 3 thẻ. Tính xác suất tích chia hết cho 4.'})), {khuon: 'luoi_the_bi_xac_suat', tham_so: {vat: 'the', N: 12, k: 3}});
  const lon = ctx.suyKhuon_({mon: 'THUC_TE', de_bai: 'Một lon nước hình trụ có thể tích 512 cm³.'});
  assert.equal(lon.khuon, 'tru_non_toi_uu');
  assert.equal(lon.tham_so.V, 512);
  assert.deepEqual(J(ctx.suyKhuon_({mon: 'THUC_TE', de_bai: 'Từ tấm bìa hình vuông 12×12 cm, cắt 4 góc rồi gấp thành hộp.'}).tham_so), {a: 12, b: 12});
  assert.equal(ctx.suyKhuon_({mon: 'XAC_SUAT', de_bai: 'Hộp có 5 viên bi đỏ và 3 viên bi xanh, xác suất lấy 2 bi'}).tham_so.vat, 'bi');
  assert.equal(ctx.suyKhuon_({mon: 'THUC_TE', de_bai: 'Ô tô đang chạy thì hãm phanh, v(t) = -5t + 20 (m/s). Tính quãng đường.'}).tham_so.ham, '-5t + 20');
});
t('đặc tả 3D kiểu cũ hỏng (nhom_lap thiếu so) -> khuôn suy từ đề; 3D tĩnh -> khuôn; da_giac "dinh" -> "diem"', () => {
  const kb = {luong: 'thuc_te_xac_suat', mon: 'XAC_SUAT', de_bai: 'Có 12 thẻ đánh số từ 1 đến 12, rút 3 thẻ.', canh: [{loi_thoai: 'Rút ba thẻ.'}],
    khung4tang: {buoc: [{nhan: 'Đề', tieu_de: 'Đề', the: []}], canh_3d_vector: {doi_tuong: [{id: 'the', loai: 'nhom_lap'}], buoc: []}}};
  const sua = ctx.tuSuaKhung4Tang_(kb, {mon: 'XAC_SUAT', lop: '11'});
  assert.equal(kb.khung4tang.canh_3d_vector.khuon, 'luoi_the_bi_xac_suat', sua.join('; '));
  const kb2 = {luong: 'thuc_te_xac_suat', mon: 'THUC_TE', de_bai: 'Tấm bìa 12×12 gấp hộp', canh: [],
    khung4tang: {buoc: [{nhan: 'a', the: []}], canh_3d_vector: {doi_tuong: [{id: 'h', loai: 'hinh_hop', kich_thuoc: [2, 2, 1]}], buoc: [{t: 0}]}}};
  ctx.tuSuaKhung4Tang_(kb2, {mon: 'THUC_TE', lop: '12'});
  assert.equal(kb2.khung4tang.canh_3d_vector.khuon, 'tam_bia_gap_hop');
  const c3 = {doi_tuong: [{id: 'v', loai: 'da_giac', dinh: [[0, 0, 0], [1, 0, 0], [1, 1, 0]]}, {id: 'n', loai: 'nhom_lap', ds: ['1', '2']}]};
  assert.equal(ctx.suaTruong3DV_(c3), 2);
  assert.ok(Array.isArray(c3.doi_tuong[0].diem) && c3.doi_tuong[1].so === 2);
});
t('không suy được khuôn + 3D rỗng -> lỗi cứng KHUNG4TANG_3D_RONG', () => {
  const kb = {luong: 'thuc_te_xac_suat', mon: 'THUC_TE', de_bai: 'Bác An gửi tiết kiệm 100 triệu lãi 6%/năm.', canh: [{loi_thoai: 'a'}],
    khung4tang: {buoc: [{nhan: 'a', the: []}]}};
  ctx.tuSuaKhung4Tang_(kb, {mon: 'THUC_TE', lop: '12'});
  assert.ok(ctx.loiKhung4Tang_(kb).some((x) => /^KHUNG4TANG_3D_RONG/.test(x)));
  assert.ok(ctx.LOI_CUNG_RE_.test('KHUNG4TANG_3D_RONG: x'));
});
t('tiêu đề dính đáp số -> "?", phụ đề bật mặc định (v95), Casio SHIFT SOLVE (tối ưu) -> MENU 8, BBT tên hàm động, bước tự gắn cảnh', () => {
  const kb = {luong: 'thuc_te_xac_suat', mon: 'THUC_TE', de_bai: 'Từ tấm bìa 12×12 cm cắt 4 góc gấp hộp. Tìm x để thể tích lớn nhất.', dap_an_cuoi: '128',
    canh: [{loi_thoai: 'Đề cho tấm bìa.'}, {loi_thoai: "Lập hàm V'(x) và xét dấu. Vậy thể tích lớn nhất."}],
    khung4tang: {buoc: [
      {nhan: 'Lập hàm', tieu_de: 'Lập hàm', khi_noi: 'lập hàm', the: [{loai: 'casio', phim: ['SHIFT', 'SOLVE'], ket_qua: '2'}, {loai: 'bang_bien_thien', moc_x: ['0', '2', '6'], dau: ['+', '-'], gia_tri: ['0', '128', '0']}]},
      {nhan: 'Kết luận', tieu_de: 'V lớn nhất bằng 128', the: []}],
      canh_3d_vector: {khuon: 'tam_bia', tham_so: {a: 12}}}};
  ctx.tuSuaKhung4Tang_(kb, {mon: 'THUC_TE', lop: '12'});
  const k = kb.khung4tang;
  assert.equal(k.phu_de, 'gon');   // v95: phụ đề gọn 1 dòng mặc định BẬT (CAU_HINH PHU_DE_4TANG=TAT để tắt)
  assert.equal(k.buoc[1].tieu_de, 'V lớn nhất bằng ?');
  assert.deepEqual(J(k.buoc[0].the[0].phim), ['MENU', '8', 'f(X)', '=']);
  assert.equal(k.buoc[0].the[1].ham, 'V');
  assert.equal(k.buoc[0].canh, 2);
  assert.equal(k.canh_3d_vector.khuon, 'tam_bia_gap_hop');
});
t('prompt v92: khuôn, cấm đáp số tiêu đề, Casio MENU 8, \\overline{A}, hook khớp đáp án, khuôn theo lớp', () => {
  const p = ctx.huongDanKhung4Tang_({lop: '12', mon: 'THUC_TE'});
  assert.ok(/"khuon"/.test(p) && /MENU 8/.test(p) && /KHÔNG ghi đáp số/.test(p) && /"phu_de":"tat"/.test(p) && /2-3 thẻ/.test(p));
  assert.ok(!/"phim":\["SHIFT","SOLVE"\]/.test(p));
  const v = ctx.vanDeDe_({kiem_chung: ''});
  assert.ok(/\\overline\{A\}/.test(v) && /ĐÚNG đại lượng/.test(v));
  assert.deepEqual(J(ctx.dsKhuonTheoLop_('10', 'THUC_TE')), ['parabol_quy_dao']);
  assert.deepEqual(J(ctx.dsKhuonTheoLop_('11', 'XAC_SUAT')), ['luoi_the_bi_xac_suat']);
  assert.ok(!ctx.dsKhuonTheoLop_('11', 'THUC_TE').includes('hai_mat_cau_oxyz'));
});
t('sinh đề: xoay vòng khuôn theo lớp và chèn yêu cầu khuôn vào prompt', () => {
  const kho = {};
  ctx.PropertiesService = {getScriptProperties: () => ({getProperty: (k) => kho[k] || null, setProperty: (k, v) => { kho[k] = v; }})};
  const a = ctx.chonKhuonSinhDe_('12', 'THUC_TE'), b = ctx.chonKhuonSinhDe_('12', 'THUC_TE');
  assert.notEqual(a, b);
  assert.equal(ctx.chonKhuonSinhDe_('10', 'THUC_TE'), 'parabol_quy_dao');
  assert.ok(/KHUÔN HÌNH 3D/.test(ctx.yeuCauKhuonSinhDe_('11', 'XAC_SUAT')));
});

console.log('v93: Intro móc câu / Outro tóm tắt / đối chiếu');
const kbV93 = () => ({id: 'V93', luong: 'thuc_te_xac_suat', mon: 'THUC_TE', lop: '12', chu_de_ngan: 'Tối ưu hộp không nắp',
  de_bai: 'Từ tấm bìa 12×12 cm cắt 4 góc gấp hộp. Tìm x để thể tích lớn nhất.', dap_an_cuoi: 'x = 2, V = 128', hook_chu: 'Cắt góc bao nhiêu để hộp chứa nhiều nhất?',
  canh: [{loi_thoai: 'Cắt góc bao nhiêu?'}, {loi_thoai: 'Lập hàm thể tích.'}],
  khung4tang: {buoc: [
    {nhan: 'Đề bài', tieu_de: 'Tấm bìa', the: [{loai: 'chu', noi_dung: 'Cắt 4 góc'}]},
    {nhan: 'Lập hàm', tieu_de: 'Thể tích', the: [{loai: 'cong_thuc', dong: ['V(x) = x(12 - 2x)^2']}]},
    {nhan: 'Đạo hàm', tieu_de: "V'(x) = 0", the: [{loai: 'cong_thuc', dong: ["V'(x) = (12 - 2x)(12 - 6x)"]}]},
    {nhan: 'Kết luận', tieu_de: 'V lớn nhất', the: [{loai: 'cong_thuc', dong: ['V(2) = 128']}]}],
    canh_3d_vector: {khuon: 'tam_bia_gap_hop', tham_so: {a: 12}}}});
t('kịch bản v92 (không có trường mới) -> tự điền đủ 5 trường intro + tom_tat_3_buoc, không lỗi cứng', () => {
  const kb = kbV93();
  const sua = ctx.tuSuaKhung4Tang_(kb, {mon: 'THUC_TE', lop: '12'});
  assert.equal(kb.nhan_thi, 'ÔN THI THPT · LỚP 12');
  assert.equal(kb.tieu_de_intro, 'CẮT GÓC BAO NHIÊU ĐỂ HỘP CHỨA NHIỀU NHẤT?');
  assert.ok(kb.tieu_de_intro.length <= 44);
  assert.equal(kb.phu_de_intro, 'TỐI ƯU HỘP KHÔNG NẮP · LẬP HÀM');
  assert.ok(kb.cau_hook.length >= 6 && kb.cta === 'LƯU LẠI NGAY!');   // v95: nhãn CTA chuẩn + câu kêu gọi thêm vào lời cảnh cuối
  assert.equal(kb.tom_tat_3_buoc.length, 3);
  assert.deepEqual(J(kb.tom_tat_3_buoc[0]), {chien_thuat: 'Lập hàm', cong_thuc: 'V(x) = x(12 - 2x)^2'});
  assert.ok(!sua.some((x) => ctx.LOI_CUNG_RE_.test(x)), sua.join('; '));
  assert.equal(kb.bo_dung, '3d_vector');
});
t('cắt gọn cho vừa bố cục: tiêu đề ≤ 2 dòng, bỏ TeX, che số đáp án; tóm tắt 1 dòng', () => {
  const kb = kbV93();
  Object.assign(kb, {tieu_de_intro: 'Hộp $V_{max}$ = 128 khi cắt góc x bằng bao nhiêu xăng-ti-mét vuông vức chuẩn chỉnh', cau_hook: 'Đáp án 128 nè', nhan_thi: 'đề giữa kì 1 · lớp 12',
    tom_tat_3_buoc: [{chien_thuat: 'Lập hàm thể tích theo cạnh cắt x', cong_thuc: 'V = x(12-2x)^2 = 4x^3 - 48x^2 + 144x = 4x(x-6)^2'}, {chien_thuat: 'Đạo hàm', cong_thuc: "V' = 0"}]});
  ctx.tuSuaKhung4Tang_(kb, {mon: 'THUC_TE', lop: '12'});
  assert.ok(kb.tieu_de_intro.length <= 44 && !/[\\$_{}]/.test(kb.tieu_de_intro) && !/128/.test(kb.tieu_de_intro), kb.tieu_de_intro);
  assert.ok(!/128/.test(kb.cau_hook));
  assert.equal(kb.nhan_thi, 'ĐỀ GIỮA KÌ 1 · LỚP 12');
  assert.ok(kb.tom_tat_3_buoc[0].chien_thuat.length <= 18);
  assert.ok(kb.tom_tat_3_buoc[0].cong_thuc.length <= 56);
});
t('doi_chieu sai (ham có ký tự lạ / miền ngược / ngưỡng hỏng) -> bỏ, giữ 3D; hợp lệ -> giữ', () => {
  const kb = kbV93();
  const b = kb.khung4tang.buoc;
  b[1].doi_chieu = {ham: 'alert(1);x', mien: [0, 6]};
  b[2].doi_chieu = {ham: 'x*(12-2*x)^2', mien: [6, 0]};
  b[3].doi_chieu = {ham: 'x*(12-2*x)^2', mien: [0, 6], nguong: {gia_tri: 'abc', kieu: '<='}};
  b[0].doi_chieu = {ham: 'x*(12-2*x)^2', mien: [0, 6], kieu: 'max', toi_uu: 2, hinh: 'hop_la'};
  ctx.tuSuaKhung4Tang_(kb, {mon: 'THUC_TE', lop: '12'});
  assert.ok(!b[1].doi_chieu && !b[2].doi_chieu && !b[3].doi_chieu);
  assert.equal(b[0].doi_chieu.hinh, 'thanh');
});
t('luồng hình học thuần: không có trường intro/doi_chieu nào được thêm (khóa luồng giữ nguyên)', () => {
  const kb = kbV93();
  kb.luong = 'hinh_hoc_thuan'; kb.mon = 'HINH_HOC';
  ctx.tuSuaKhung4Tang_(kb, {mon: 'HINH_HOC', lop: '12'});
  assert.ok(!kb.khung4tang && !kb.tieu_de_intro && !kb.tom_tat_3_buoc);
});
t('prompt v93: dạy trường tùy chọn intro/outro/doi_chieu', () => {
  const p = ctx.huongDanKhung4Tang_({lop: '12', mon: 'THUC_TE'});
  assert.ok(/"tieu_de_intro"/.test(p) && /"tom_tat_3_buoc"/.test(p) && /"doi_chieu"/.test(p) && /"nguong"/.test(p) && /"cau_hook"/.test(p));
  assert.ok(/không đạo hàm/.test(ctx.huongDanKhung4Tang_({lop: '11', mon: 'THUC_TE'})));
});

console.log(`\n${dat} test đạt`);
