// Props thử v89: dựng lại các khung từng lỗi (dữ kiện đề, danh sách bước, đối chiếu miền, thẻ chia hết, bảng biến thiên, đồ thị, phụ đề)
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('public/props.json', 'utf8'));
const goc = p.canh[1];
const F = 165;
const cau = (ds) => ds.map((t, i) => ({text: t, bat: 0.2 + i * 2.2, ket: 2.2 + i * 2.2}));
const sk = (vat, hd = []) => ({loai: 'san_khau', moTa: 'thu', duLieu: {vat, hanh_dong: hd}});
const canh = [
  {loai: 'de_bai', tieuDeCanh: ': Đề bài', noiDung: [], minhHoa: sk([]), cau: cau(['Bồn chứa dung tích 54π m³,', 'đáy chịu tải 500.000 đồng/m²'])},
  {loai: 'tinh_toan', tieuDeCanh: 'Áp dụng vào hàm thể tích', noiDung: ['v = (30 - x)^2'], mocCongThuc: [3.0], trinhBay: 'xep',
    minhHoa: sk([{id: 'ds', loai: 'danh_sach', x: 50, y: 50, noi_dung: String.raw`Phân tích V(x) = u \cdot v`, ds: [String.raw`u = 4x \Rightarrow u' = 4`, String.raw`v = (30 - x)^2 \Rightarrow v' = -2(30 - x)`], moc_dong: [0.4, 1.2], buoc: 1}],
      [{buoc: 2, vat: 'ds', kieu: 'chon', chi_so: [1], mau: 'xanh_la'}]),
    cau: cau(['30 − x.', "nên v' = −2(30 − x)"])},
  {loai: 'tinh_toan', tieuDeCanh: 'V phẩy bằng zero', noiDung: ["V'(x) = 4(30 - x)^2 - 8x(30 - x)", "V'(x) = 4(30 - x)(30 - 3x) = 0"], mocCongThuc: [0.5, 2.5], trinhBay: 'bien_doi', minhHoa: sk([]),
    cau: cau(["V'(x) = 0 khi", 'x = 10 hoặc x = 30'])},
  {loai: 'kiem_tra', tieuDeCanh: 'Đối chiếu điều kiện', noiDung: [],
    minhHoa: sk([{id: 'ds', loai: 'danh_sach', x: 50, y: 50, noi_dung: 'Đối chiếu miền (0; 30)', ds: ['x = 30: Không thỏa mãn (Loại)', 'x = 10: Thỏa mãn 0 < x < 30 (Nhận)'], moc_dong: [0.4, 1.4], buoc: 1}],
      [{buoc: 2, vat: 'ds', kieu: 'loai_bo', chi_so: [1]}, {buoc: 3, vat: 'ds', kieu: 'chon', chi_so: [2], mau: 'xanh_la'}]),
    cau: cau(['0 < x < 30,', 'nên x = 10 cm'])},
  {loai: 'bay', tieuDeCanh: 'Cắt chính giữa ?', noiDung: [String.raw`Tích = 32 \vdots 4 ✓`, String.raw`Tổng = 13 \text{ lẻ } ✗`], mocCongThuc: [0.5, 1.6], trinhBay: 'xep',
    minhHoa: sk([{id: 'ds', loai: 'danh_sach', x: 50, y: 50, noi_dung: 'Kiểm tra bộ thẻ', ds: [String.raw`120\:\4 ✓`, String.raw`Chẵn: 4 \vdots 4`, 'Tích 4x . (30-x)^2 = 29.50'], moc_dong: [0.3, 0.8, 1.3], buoc: 1}]),
    cau: cau(['Tích bằng 32 chia hết cho 4,', 'xác suất 1/4'])},
  {loai: 'tinh_toan', tieuDeCanh: 'Lập bảng biến thiên', noiDung: [],
    minhHoa: sk([{id: 'b', loai: 'bang_bien_thien', x: 50, y: 50, noi_dung: String.raw`f(r) = 2\pi r^2 + \dfrac{108\pi}{r}`, moc: ['0', '3', String.raw`+\infty`], dau: ['-', '+'], gia_tri: [String.raw`+\infty`, String.raw`54\pi`, String.raw`+\infty`], moc_dong: [0.6, 1.4], buoc: 1}]),
    cau: cau(["f'(r) đổi dấu tại r = 3 m"])},
  {loai: 'mo_hinh_hoa', tieuDeCanh: 'Đặt vấn đề bằng đồ thị', noiDung: [],
    minhHoa: sk([{id: 'g', loai: 'do_thi', x: 50, y: 50, ham: '4*x*(30-x)^2', x_tu: 0, x_den: 30, danh_dau: [10], nhan_truc: ['x', 'V(x)'], moc_hien_diem: -1, noi_dung: 'V(x) = 4x(30 - x)^2', buoc: 1}]),
    cau: cau(['Đỉnh nằm ở đâu?'])},
];
let bd = 0;
p.canh = canh.map((c, i) => {
  const r = {...goc, so: i + 1, chuThich: [], tuKhoa: '', nhan: '', giuSanKhau: false, chuyenCanh: '', gocNhin: null, mocCongThuc: undefined, tu: undefined, dongBo: '', ...c, batDau: bd, soFrame: F, leadFrame: 4};
  bd += F;
  return r;
});
p.tongFrame = bd; p.manimLop = false; p.luong = 'thuc_te_xac_suat'; p.outro = null; p.intro = undefined;
p.bia = {loai: 'Tối ưu', tieuDe: 'Bán kính bao nhiêu?', khung: 10};
p.deBai = {cho: [String.raw`Bồn chứa chất lỏng dạng hình trụ kín dung tích $54\pi\ m^3$`, 'Đáy dưới chịu tải lớn nhất: 500,000 đồng/m^2', 'Thân bồn 800.000 đồng/m²'], tim: 'Tìm r để chi phí nhỏ nhất?'};
p.suKienManim = []; p.anhManimBia = null;
fs.writeFileSync('out/thu_v89/props.json', JSON.stringify(p));
const pi = {...p, intro: {soFrame: 84, chuyen: 15, lech: 69}, thuongHieu: {...p.thuongHieu, ten: 'Tư duy Xác suất'}};
pi.tongFrame = p.tongFrame + 69;
fs.writeFileSync('out/thu_v89/props_intro.json', JSON.stringify(pi));
console.log('tong', bd, canh.map((_, i) => i * F));
