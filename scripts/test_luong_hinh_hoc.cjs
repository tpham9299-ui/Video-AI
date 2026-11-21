// Kiểm thử nhanh KHÓA LUỒNG hình học thuần (v86): phân loại đề, gỡ dấu vết cảnh thật / 3D, kiểm tra chéo đề - kịch bản - hình.
// Chạy: node scripts/test_luong_hinh_hoc.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const GOC = path.join(__dirname, '..');

// mọi tệp .gs phải hợp lệ cú pháp
for (const f of fs.readdirSync(GOC).filter((x) => x.endsWith('.gs'))) new vm.Script(fs.readFileSync(path.join(GOC, f), 'utf8'), {filename: f});

const ctx = vm.createContext({cauHinh_: () => '', nhatKy_: () => {}});
for (const f of ['KiemTraHinh.gs', 'HinhHoc.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx);

// 1) phân loại đề
assert.equal(ctx.laDeHinhHocThuan_('Cho hình chóp S.ABCD có đáy là hình vuông, SA vuông góc với (ABCD). Chứng minh BD vuông góc (SAC).'), true);
assert.equal(ctx.laDeHinhHocThuan_('Cho tam giác ABC vuông tại A, đường cao AH. Biết AB = 3, AC = 4. Tính AH.'), true);
assert.equal(ctx.laDeHinhHocThuan_('Cho hình thang ABCD có AB song song CD. Chứng minh ...'), true);
assert.equal(ctx.laDeHinhHocThuan_('Một người đứng cách cột cờ 20 m nhìn đỉnh cột dưới góc 30 độ. Tính chiều cao cột cờ.'), false);
assert.equal(ctx.laDeHinhHocThuan_('Xây bể nước hình hộp chữ nhật không nắp có thể tích 32 m³.'), false);
assert.equal(ctx.xacDinhLuong_({mon: 'HINH_HOC'}), 'hinh_hoc_thuan');
assert.equal(ctx.xacDinhLuong_({mon: 'THUC_TE'}), 'thuc_te_xac_suat');

// 2) gỡ dấu vết luồng thực tế khỏi kịch bản hình học
const kb = JSON.parse(fs.readFileSync(path.join(GOC, 'mau/kich_ban_hinh_khong_gian.json'), 'utf8'));
kb.mo_hinh_3d = {chi_tiet: [{hinh: 'hop'}]};
kb.cau_chuyen = {nguoi_ke: 'a', phong_canh: {troi: '#000000'}};
kb.canh[0].minh_hoa.du_lieu.vat.push({id: 'ct', loai: 'canh_that', x: 50, y: 50});
kb.canh[1].net_toan = [{diem: [[0, 0]]}];
kb.canh[2].minh_hoa = {loai: 'so_do_cay', du_lieu: {goc: 'x'}};
assert.ok(ctx.loiLuongHinhHoc_(kb).length >= 3);
const sua = ctx.khoaLuongHinhHoc_(kb);
assert.ok(sua.length >= 4, sua.join('; '));
assert.equal(ctx.loiLuongHinhHoc_(kb).length, 0, ctx.loiLuongHinhHoc_(kb).join(", "));
assert.equal(kb.luong, 'hinh_hoc_thuan');
assert.ok(!kb.cau_chuyen.phong_canh);

// 3) kiểm tra chéo: đủ điểm của đề, buoc_ve khớp nguyên văn lời thoại
kb.canh[2].minh_hoa = JSON.parse(JSON.stringify(kb.canh[1].minh_hoa));
let k = ctx.kiemTraKichBanManim_(kb);
assert.equal(k.nang.length, 0, k.nang.join('\n'));
kb.canh[1].buoc_ve = [{ve: 'BD', khi_noi: 'không có trong lời'}];
k = ctx.kiemTraKichBanManim_(kb);
assert.ok(k.nang.some((x) => x.startsWith('BUOC_VE_KHONG_KHOP_LOI_CANH_2')), k.nang.join('\n'));
kb.canh[1].buoc_ve = [{ve: 'BK', khi_noi: kb.canh[1].loi_thoai.split(' ').slice(0, 3).join(' ')}];
k = ctx.kiemTraKichBanManim_(kb);
assert.ok(k.nang.some((x) => x.startsWith('BUOC_VE_DOI_TUONG_LA_CANH_2')), k.nang.join('\n'));
delete kb.canh[1].buoc_ve;
kb.canh[1].loi_thoai += ' Gọi K là trung điểm SC.';
k = ctx.kiemTraKichBanManim_(kb);
assert.ok(k.nang.some((x) => x.startsWith('HINH_THIEU_DIEM_CANH_2') && x.includes('K')), k.nang.join('\n'));

// 4) chenToaDoHinh_: bỏ điểm AI tự đặt, ghi hình chuẩn kèm quan hệ cho bộ kiểm BP3
const kb2 = JSON.parse(fs.readFileSync(path.join(GOC, 'mau/kich_ban_hinh_khong_gian.json'), 'utf8'));
const v = kb2.canh[1].minh_hoa.du_lieu.vat[0];
v.diem.Z = [5, 5];
v.canh.push(['Z', 'A', '']);
const hinh = {diem: {S: [20, 10], A: [20, 90], B: [60, 90], C: [80, 70], D: [40, 70], O: [50, 80]}, canh: [['S', 'A']], khuat: [['A', 'D']], phu: [], tron: [],
  diem_goc: {S: [0, 0, 2], A: [0, 0, 0], B: [2, 0, 0], C: [2, 2, 0], D: [0, 2, 0], O: [1, 1, 0]}, quan_he: [{loai: 'vuong_goc', a: ['S', 'A'], b: ['A', 'B']}]};
const s2 = ctx.chenToaDoHinh_(kb2, hinh);
assert.ok(!('Z' in v.diem));
assert.ok(!v.canh.some((c) => c.includes('Z')));
assert.ok(s2.some((x) => x.includes('bỏ điểm tự đặt')));
assert.equal(kb2.hinh_chuan.quan_he.length, 1);
console.log('Khóa luồng hình học thuần: phân loại, gỡ 3D, kiểm tra chéo đề/kịch bản/hình đều đạt.');
