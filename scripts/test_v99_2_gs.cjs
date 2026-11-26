// v99.2 — Kiểm thử phía Apps Script (chạy .gs trong vm, KHÔNG gọi mạng): node scripts/test_v99_2_gs.cjs
//  1. BP0: 40 lượt qua sinh_de_gh.js (giả lập) ra ĐỦ 4 mảng (THUC_TE / XAC_SUAT / HINH_PHANG / HINH_KHONG_GIAN), bộ đếm gửi-trả đủ,
//     TY_LE_MON / TY_LE_XAC_SUAT / CHU_DE_VIDEO; chặn đề SGK (tự sinh) nhưng đề Zalo không đi qua bộ lọc;
//  2. hợp đồng hình BP0 -> BP2 (yeu_to_tu_duy [hop_dong]) + định tuyến tự sinh / cây Bayes khớp Python;
//  3. BP1: kiểm chứng 2 chiều phân biệt Koch HỮU HẠN 10 lần (200 m, 5 triệu/m²) với tổng VÔ HẠN, phản hồi sửa 1 lần,
//     nghịch lý Monty Hall (đổi cửa = 2/3) qua trọng tài, khóa ngộ nhận 4 bẫy, chọn cách giải gọn;
//  4. Evergreen: gỡ "2k9 ơi", "Học sinh 2009", "#2k8", "THPT 2027" (khớp bản Python scripts/evergreen.py);
//  5. Auto-Heal: lỗi cứng lần 1 & 2 trả về BP2, lần 3 dừng (CHO + Zalo), cảnh báo thẩm mỹ nhẹ không dựng lại, kiểm duyệt bố cục chung trần;
//  6. lapTuSinh_: hợp đồng tu_sinh_svg vá tối đa 2 lần, vẫn hỏng -> cảnh báo tu_sinh_hong (không rơi ngầm về hộp chữ).
const fs = require('node:fs');
const vm = require('node:vm');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync, spawnSync} = require('node:child_process');
const GOC = path.join(__dirname, '..');

let props = {};
const ghiSheet = [];
const zalo = [];
let nhapKb = null;
const ctx = vm.createContext({
  PropertiesService: {getScriptProperties: () => ({getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => ({...props}), getKeys: () => Object.keys(props)})},
  Logger: {log: () => {}}, console,
});
for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs', 'SanKhau.gs', 'BoPhan2.gs', 'DangVideo.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
let cauHinh = {};
const nk = [];
Object.assign(ctx, {
  CacheService: {getScriptCache: () => ({get: () => null, put: () => {}, remove: () => {}})},
  cauHinh_: (k) => (cauHinh[k] !== undefined ? cauHinh[k] : ''), chNC_: (k) => (cauHinh[k] !== undefined ? cauHinh[k] : ''),
  nhatKy_: (m, s) => nk.push(m + ': ' + s),
  ghi_: (sh, row, f) => ghiSheet.push(f),
  DriveApp: {getFileById: () => ({getBlob: () => ({getDataAsString: () => JSON.stringify(nhapKb || {canh: [{loi_thoai: 'x'}]})})})},
  luuNhapKichBan_: (id, kb) => { nhapKb = kb; }, henUuTien_: () => {},
  guiZaloMotLan_: (k, s) => zalo.push(s), guiZalo_: (s) => zalo.push(s),
});
let dat = 0, loi = 0;
const t = (ten, fn) => {
  try { fn(); dat++; console.log('  ✓', ten); } catch (e) { loi++; console.log('  ✗', ten, '—', String(e.message).split('\n')[0]); }
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v992_'));

console.log('1. BP0 — xoay vòng 4 mảng theo lịch sử thật + bộ đếm');
t('40 lượt sinh_de_gh.js (giả lập) ra đủ 4 mảng, mỗi mảng >= 9 đề, hình phẳng lớp 9, không gian lớp 11/12, đề SGK luôn bị chặn', () => {
  let hang = [], dem = {};
  const ra = path.join(tmp, 'sd.json');
  const mang = {THUC_TE: 0, XAC_SUAT: 0, HINH_PHANG: 0, HINH_KHONG_GIAN: 0};
  let sgk = 0;
  for (let i = 0; i < 40; i++) {
    const dl = {cau_hinh: {CHE_DO_NGUON: 'SANG_TAC', VIDEO_10P_MOI_NGAY: 'TAT', LOP_HINH_PHANG: '9', SO_DE_MOI_MOI_LAN: '2'}, props: dem, gan_day: hang.slice(-40)};
    execFileSync(process.execPath, [path.join(GOC, 'scripts', 'bophan1', 'sinh_de_gh.js')], {env: {...process.env, BP0_GIA_LAP: '1', SD_MON: 'XEN_KE', SD_DU_LIEU: JSON.stringify(dl), SD_RA: ra}, stdio: 'ignore'});
    const d = JSON.parse(fs.readFileSync(ra, 'utf8'));
    assert.ok(d.ok, 'lượt ' + i + ': ' + d.loi);
    assert.equal(d.de.length, 1, 'lượt ' + i + ' phải đúng 1 đề (đề SGK bị chặn)');
    if (d.nhat_ky.some((x) => x[1] === 'BO_DE_SGK')) sgk++;
    const x = d.de[0];
    const m = ctx.mangCuaDong_(x);
    mang[m]++;
    if (m === 'HINH_PHANG') assert.equal(String(x.lop), '9');
    if (m === 'HINH_KHONG_GIAN') assert.ok(/^(11|12)$/.test(String(x.lop)), 'không gian lớp ' + x.lop);
    assert.ok(ctx.docHopDongHinh_(x), 'đề phải mang hợp đồng hình');
    hang.push({id: x.id, mon: x.mon, nguon: x.nguon, de_bai: x.de_bai, trang_thai: 'DA_XONG', ma_bam: x.ma_bam});
    dem = d.dem;
    Object.keys(dem).forEach((k) => assert.ok(ctx.laKhoaDemBP0_(k), 'khóa đếm lạ ' + k));
  }
  Object.entries(mang).forEach(([k, v]) => assert.ok(v >= 9, k + ' chỉ ' + v + '/40 (' + JSON.stringify(mang) + ')'));
  assert.equal(sgk, 40);
});
t('bộ đếm v99.1 bị bỏ quên (MON_KE_KHAC, HH_KE, KHUON_KE_*, NHOM_KE_*) đều thuộc danh sách gửi-trả', () => {
  ['MON_KE', 'MON_KE_KHAC', 'HH_KE', 'KHUON_KE_THUC_TE', 'NHOM_KE_XAC_SUAT', 'LOP_KE', 'BOI_CANH_XS_KE'].forEach((k) => assert.ok(ctx.laKhoaDemBP0_(k), k));
  const src = fs.readFileSync(path.join(GOC, 'BoPhan1.gs'), 'utf8');
  assert.ok(/laKhoaDemBP0_\(k\)\) propsGui\[k\]/.test(src) && /d\.dem\[k\]/.test(src));
  assert.ok(/'SanKhau\.gs'\]/.test(fs.readFileSync(path.join(GOC, 'scripts', 'bophan1', 'sinh_de_gh.js'), 'utf8')), 'sinh_de_gh.js nạp SanKhau.gs');
});
t('TY_LE_MON / TY_LE_XAC_SUAT / CHU_DE_VIDEO / HINH_HOC_KHO', () => {
  cauHinh = {TY_LE_MON: 'THUC_TE:40, XAC_SUAT:40, HINH_HOC:20'};
  let tl = ctx.tyLeMon_();
  assert.ok(Math.abs(tl.THUC_TE - 0.4) < 1e-9 && Math.abs(tl.HINH_PHANG - 0.1) < 1e-9 && Math.abs(tl.HINH_KHONG_GIAN - 0.1) < 1e-9);
  cauHinh = {TY_LE_XAC_SUAT: '55'};
  tl = ctx.tyLeMon_();
  assert.ok(Math.abs(tl.XAC_SUAT - 0.55) < 1e-9 && Math.abs(tl.HINH_PHANG - 0.15) < 1e-9);
  cauHinh = {};
  tl = ctx.tyLeMon_();
  Object.values(tl).forEach((v) => assert.ok(Math.abs(v - 0.25) < 1e-9));
  cauHinh = {CHU_DE_VIDEO: 'HINH_HOC'};
  assert.ok(/^HINH_/.test(ctx.chonMang_([])));
  cauHinh = {HINH_HOC_KHO: 'TAT'};
  for (let i = 0; i < 6; i++) assert.ok(!/^HINH_/.test(ctx.chonMang_([{id: 'TT1', mon: 'THUC_TE', de_bai: 'x'}].slice(0, i % 2))));
  cauHinh = {};
  // lịch sử toàn THUC_TE + XAC_SUAT (đúng tình trạng v99.1) -> mảng hình học được chọn ngay
  const cu = [];
  for (let i = 0; i < 20; i++) cu.push({id: (i % 2 ? 'TT' : 'VD') + i, mon: i % 2 ? 'THUC_TE' : 'XAC_SUAT', de_bai: 'đề ' + i});
  assert.ok(/^HINH_/.test(ctx.chonMang_(cu)));
});

console.log('2. Danh sách đen SGK + hợp đồng hình');
t('chặn 4 mô-típ SGK, giữ đề sáng tạo', () => {
  assert.equal(ctx.laDeSgkNhamChan_('Cắt 4 góc hình vuông cạnh x từ tấm bìa 60 cm rồi gấp thành hộp không nắp.'), 'cat_goc_gap_hop');
  assert.equal(ctx.laDeSgkNhamChan_('Rạp chiếu phim bán vé 50 nghìn, mỗi lần giảm giá 5 nghìn thì thêm 20 khách.'), 'gia_ve_rap');
  assert.equal(ctx.laDeSgkNhamChan_('Hộp có 5 bi đỏ, 3 bi xanh. Lấy ngẫu nhiên 2 viên bi. Tính xác suất được 2 bi đỏ.'), 'rut_bi_don_gian');
  assert.equal(ctx.laDeSgkNhamChan_('Hai vòi nước cùng chảy vào bể thì sau 4 giờ đầy bể.'), 'nang_suat_voi_nuoc');
  assert.equal(ctx.laDeSgkNhamChan_('Hai đội công nhân cùng làm chung một công việc thì 12 ngày xong.'), 'nang_suat_voi_nuoc');
  assert.equal(ctx.laDeSgkNhamChan_('Hai bạn hẹn gặp trong khoảng 17h-18h, ai đến trước chờ 15 phút. Tính xác suất gặp nhau.'), '');
  assert.equal(ctx.laDeSgkNhamChan_('Hòn đảo bông tuyết Koch cạnh 200 m, giá 5 triệu/m², tính giá trị sau lần lặp thứ 10.'), '');
  assert.equal(ctx.laDeSgkNhamChan_('Có 2 hộp: hộp 1 có 3 bi đỏ 2 bi xanh, hộp 2... Lấy 1 bi từ hộp 1 chuyển sang hộp 2 rồi lấy 1 bi. Biết rằng bi lấy ra màu đỏ...'), '');
});
t('đề Zalo KHÔNG đi qua bộ lọc SGK (chỉ sinhDeNeuCan_ / timDeInternet_ gọi)', () => {
  const zl = fs.readFileSync(path.join(GOC, 'ZaloDeBai.gs'), 'utf8');
  assert.ok(!/laDeSgkNhamChan_/.test(zl));
  const src = fs.readFileSync(path.join(GOC, 'BoPhan1.gs'), 'utf8');
  const goi = src.split('\n').filter((d) => /laDeSgkNhamChan_\(d\.de_bai\)/.test(d)).length;
  assert.equal(goi, 2);
  const nhan = src.slice(src.indexOf('function nhanThemDeTuGitHub_'), src.indexOf('function nhanThemDeTuGitHub_') + 3000);
  assert.ok(!/laDeSgkNhamChan_/.test(nhan));
});
t('hợp đồng hình: ghi / đọc / bỏ khỏi yeu_to_tu_duy, chỉ thị BP2, áp vào kb', () => {
  const nhom = ctx.NHOM_SANG_TAC_[1];
  const hd = ctx.hopDongTuDe_({san_khau_dich: 'tu_sinh_svg', kich_ban_hinh: ['a', 'b', 'c', 'd', 'e'], nut_that: 'dải chéo', goi_y_hinh_anh: 'dải tô dần'}, 'XAC_SUAT', nhom);
  const yt = ctx.ganHopDong_('Cần nghĩ đổi sang diện tích', hd);
  assert.equal(ctx.boHopDong_(yt), 'Cần nghĩ đổi sang diện tích');
  const r = {yeu_to_tu_duy: yt};
  assert.equal(ctx.docHopDongHinh_(r).kich_ban_hinh.length, 4);
  assert.ok(/sân khấu đích "tu_sinh_svg"/.test(ctx.huongDanHopDongV992_(r)));
  const kb = {};
  assert.ok(ctx.apHopDongVaoKb_(kb, r));
  assert.equal(kb.san_khau_dich, 'tu_sinh_svg');
  // mảng THUC_TE không nhận cay_bayes; hình học ép đúng sân khấu
  assert.equal(ctx.hopDongTuDe_({san_khau_dich: 'cay_bayes'}, 'THUC_TE', ctx.NHOM_SANG_TAC_[0]).san_khau_dich, 'tu_sinh_svg');
  assert.equal(ctx.hopDongTuDe_({san_khau_dich: 'tu_sinh_svg'}, 'HINH_PHANG', null).san_khau_dich, 'hinh_phang');
  // prompt kịch bản đọc hợp đồng, không lộ chuỗi [hop_dong]
  const pk = fs.readFileSync(path.join(GOC, 'PromptKichBan.gs'), 'utf8');
  assert.ok(/boHopDong_\(r\.yeu_to_tu_duy\) \+ huongDanHopDongV992_\(r\)/.test(pk));
});
t('định tuyến: hợp đồng tu_sinh_svg mở tự sinh cho XÁC SUẤT; cay_bayes -> so_do_cay (khớp Python)', () => {
  assert.equal(ctx.dungTuSinh_({de_bai: 'Hai bạn hẹn gặp', mon: 'XAC_SUAT'}, {san_khau_dich: 'tu_sinh_svg'}), true);
  assert.equal(ctx.dungTuSinh_({de_bai: 'Hòn đảo bông tuyết Koch', mon: 'THUC_TE'}, {san_khau_dich: 'cay_bayes'}), true);
  assert.equal(ctx.dungTuSinh_({de_bai: 'Hai bạn hẹn gặp', mon: 'XAC_SUAT'}, {}), false);
  const kb = {mon: 'XAC_SUAT', lop: '11', san_khau_dich: 'cay_bayes', de_bai: 'Rút thẻ ngẫu nhiên, tính xác suất'};
  assert.equal(ctx.chonSanKhau_(kb, {}).loai, 'so_do_cay');
  const py = spawnSync('python', ['-X', 'utf8', '-c', 'import sys,json;sys.path.insert(0,"scripts");import khung4tang_v96 as k;print(k.chon_san_khau(json.loads(sys.argv[1]))["loai"])', JSON.stringify(kb)], {cwd: GOC, encoding: 'utf8'});
  assert.equal(py.stdout.trim(), 'so_do_cay', py.stderr);
});

console.log('3. BP1 — kiểm chứng 2 chiều, khóa ngộ nhận, chọn cách gọn');
// Koch: S_n = S0 (1 + (1/3) Σ_{k=0}^{n-1} (4/9)^k), S0 = 10000√3 m², giá 5 triệu/m² -> tỷ đồng
const MA_KOCH_DUNG = 'function kiemChung(){var S0=10000*Math.sqrt(3),S=S0,them=S0/3;for(var k=1;k<=10;k++){S+=them;them*=4/9;}' +
  'var gt=S0*(1+0.6*(1-Math.pow(4/9,10)));return {kieu:"gia_tri",gia_tri:S*5/1000,mo_phong:S*5/1000,giai_tich:gt*5/1000};}';
const MA_KOCH_NHAM = 'function kiemChung(){var S0=10000*Math.sqrt(3),S=S0,them=S0/3;for(var k=1;k<=10;k++){S+=them;them*=4/9;}' +
  'return {kieu:"gia_tri",gia_tri:1.6*S0*5/1000,mo_phong:S*5/1000,giai_tich:1.6*S0*5/1000};}';
t('Koch HỮU HẠN 10 lần ≈ 138,55 tỷ khác VÔ HẠN ≈ 138,56 tỷ: mã đúng khớp 2 chiều, mã nhầm vô hạn bị bắt (> 1e-4)', () => {
  const a = ctx.chayKiemChung_(MA_KOCH_DUNG), b = ctx.chayKiemChung_(MA_KOCH_NHAM);
  assert.ok(Math.abs(a.gia_tri - 138.551) < 0.01, 'hữu hạn ' + a.gia_tri);
  assert.ok(Math.abs(b.gia_tri - 138.564) < 0.01, 'vô hạn ' + b.gia_tri);
  assert.ok(Math.abs(a.gia_tri - b.gia_tri) > 1e-4);
  assert.equal(ctx.kiemHaiChieu_(a).ok, true);
  const hb = ctx.kiemHaiChieu_(b);
  assert.equal(hb.ok, false);
  assert.ok(hb.lech > 1e-4);
  assert.equal(ctx.kiemHaiChieu_({kieu: 'gia_tri', gia_tri: 3}), null);   // mã cũ không 2 chiều -> giữ hành vi cũ
});
t('trọng tài: mã lệch 2 chiều -> phản hồi Gemini sửa 1 lần -> mã sửa khớp mới được bỏ phiếu', () => {
  let goi = 0;
  ctx.goiGemini_ = () => { goi++; return {ma: MA_KOCH_DUNG}; };
  const doc = (c) => (c && isFinite(Number(c.gia_tri)) ? Number(c.gia_tri) : null);
  const tt = ctx.trongTai_({id: 'T1', lop: '11', mon: 'THUC_TE', de_bai: 'Koch đến lần thứ 10'}, {
    de: 'đề', dinhDang: '', c1: {gia_tri: 138.5510}, c2: {gia_tri: 138.5510, do_gon: 9, nut_that: 'cộng dồn 10 bước'}, kc: {ma: MA_KOCH_NHAM}, doc,
    bang: (x, y) => x !== null && y !== null && ctx.khopSo_(x, y), chu: ctx.vietSo_,
    kiem: (kq) => ({v: Number(kq.gia_tri), manh: 2, mo: 'máy ' + kq.gia_tri, khop: (x) => ctx.khopSo_(Number(kq.gia_tri), x)}),
    promptMa: 'viết mã',
  });
  assert.equal(goi, 1);
  assert.ok(tt.dat, tt.ly_do);
  assert.ok(Math.abs(tt.v - 138.551) < 0.01);
  assert.ok(/2 chiều khớp/.test(tt.mo), tt.mo);
});
t('nghịch lý Monty Hall: đếm vét cạn + giải tích -> trọng tài chốt 2/3 (đổi cửa)', () => {
  const ma = 'function kiemChung(){var thang=0,tong=0;for(var xe=0;xe<3;xe++)for(var chon=0;chon<3;chon++){var mo=[];for(var c=0;c<3;c++)if(c!==xe&&c!==chon)mo.push(c);' +
    'for(var i=0;i<mo.length;i++){var w=1/mo.length;var doi=3-chon-mo[i];tong+=w;if(doi===xe)thang+=w;}}return {kieu:"chinh_xac",tu:2,mau:3,mo_phong:thang/tong,giai_tich:2/3};}';
  const kq = ctx.chayKiemChung_(ma);
  assert.equal(ctx.kiemHaiChieu_(kq).ok, true);
  const bang = (a, b) => !!(a && b && a.tu * b.mau === b.tu * a.mau);
  const tt = ctx.trongTai_({id: 'M1', lop: '12', mon: 'XAC_SUAT', de_bai: 'Monty Hall'}, {
    de: 'đề', dinhDang: '', c1: {tu: 1, mau: 2}, c2: {tu: 2, mau: 3, do_gon: 9, nut_that: 'người dẫn biết xe ở đâu'}, kc: {ma}, doc: ctx.chuanHoa_, bang,
    chu: (v) => v.tu + '/' + v.mau,
    kiem: (k) => { const v = ctx.chuanHoa_({tu: k.tu, mau: k.mau}); return {v, manh: 2, mo: 'đếm ' + v.tu + '/' + v.mau, khop: (x) => bang(x, v)}; },
    promptMa: 'viết mã',
  });
  assert.ok(tt.dat, tt.ly_do);
  assert.equal(tt.chu, '2/3');
  assert.equal(tt.c2.tu * 3, tt.c2.mau * 2);   // cách gọn (đúng) vào chỗ LỜI GIẢI GỌN
});
t('khóa ngộ nhận: hữu hạn "lần thứ 10" / vô hạn / đơn vị / không hoàn lại / biên tối ưu', () => {
  const a = ctx.khoaNgoNhanDe_('Đảo bông tuyết Koch cạnh 200 m, giá 5 triệu/m². Tính giá trị đảo sau lần thứ 10.', 'THUC_TE');
  assert.ok(/ĐỀ NÓI HỮU HẠN/.test(a) && /TUYỆT ĐỐI không dùng tổng vô hạn/.test(a) && /ĐƠN VỊ/.test(a) && /triệu/.test(a));
  assert.ok(/ĐỀ NÓI VÔ HẠN/.test(ctx.khoaNgoNhanDe_('Cứ tiếp tục mãi như vậy (vô hạn lần), tính tổng diện tích.', 'THUC_TE')));
  assert.ok(/KHÔNG HOÀN LẠI/.test(ctx.khoaNgoNhanDe_('Lấy lần lượt 2 thẻ không hoàn lại. Tính xác suất.', 'XAC_SUAT')));
  assert.ok(/CÓ HOÀN LẠI/.test(ctx.khoaNgoNhanDe_('Rút 1 thẻ, ghi số rồi trả lại vào hộp, rút tiếp.', 'XAC_SUAT')));
  assert.ok(/TỐI ƯU/.test(ctx.khoaNgoNhanDe_('Tìm x để diện tích lớn nhất.', 'THUC_TE')));
  const src = fs.readFileSync(path.join(GOC, 'BoPhan1.gs'), 'utf8');
  assert.equal((src.match(/khoaNgoNhanDe_\(r\.de_bai, '(THUC_TE|XAC_SUAT)'\)/g) || []).length, 2);
  assert.ok((src.match(/YEU_CAU_HAI_CHIEU_ \+/g) || []).length >= 4);
});
t('chonCachGon_: ưu tiên do_gon cao + có nút thắt, ít bước', () => {
  const dai = {cac_buoc: [1, 2, 3, 4, 5, 6, 7], do_gon: 4};
  const gon = {cac_buoc: [1, 2, 3], do_gon: 9, nut_that: 'trải phẳng hai mặt kề'};
  assert.equal(ctx.chonCachGon_([dai, gon]), gon);
});

console.log('4. Evergreen — gỡ năm sinh / khóa học / năm thi');
const MAU_EG = [['2k9 ơi, bài này khó lắm!', ''], ['Học sinh 2009 cần biết mẹo này', '12'], ['Sĩ tử 2k8 chú ý', '11'], ['#2k8 #toanhoc #xacsuat', ''],
  ['Đề thi THPT 2027 có dạng này', '12'], ['Các 2k10 ơi', '10'], ['Team 2k7 vào đây', '12'], ['#thpt2027 #onthi', '12'], ['Năm 2025 dân số tăng 2%', '11'], ['Cạnh 2009 m', '']];
t('JS: "2k9 ơi" / "Học sinh 2009" / "#2k8" / "THPT 2027" được làm sạch, số thường giữ nguyên', () => {
  assert.equal(ctx.veSinhNamSinh_('2k9 ơi, bài này khó lắm!', ''), 'Bạn ơi, bài này khó lắm!');
  assert.equal(ctx.veSinhNamSinh_('Học sinh 2009 cần biết mẹo này', '12'), 'Học sinh lớp 12 cần biết mẹo này');
  assert.equal(ctx.veSinhNamSinh_('#2k8 #toanhoc #xacsuat', ''), '#toanhoc #xacsuat');
  assert.equal(ctx.veSinhNamSinh_('Đề thi THPT 2027 có dạng này', '12'), 'Đề thi THPT có dạng này');
  assert.equal(ctx.veSinhNamSinh_('Năm 2025 dân số tăng 2%', '11'), 'Năm 2025 dân số tăng 2%');
  MAU_EG.forEach(([s, l]) => assert.ok(!ctx.coNamSinh_(ctx.veSinhNamSinh_(s, l)), s));
});
t('JS <-> Python (scripts/evergreen.py) cho cùng kết quả', () => {
  const py = spawnSync('python', ['-X', 'utf8', '-c', 'import sys,json;sys.path.insert(0,"scripts");import evergreen as e;print(json.dumps([e.ve_sinh_nam_sinh(s,l) for s,l in json.loads(sys.argv[1])],ensure_ascii=False))', JSON.stringify(MAU_EG)], {cwd: GOC, encoding: 'utf8'});
  const pyKq = JSON.parse(py.stdout);
  MAU_EG.forEach(([s, l], i) => assert.equal(ctx.veSinhNamSinh_(s, l), pyKq[i], s));
});
t('kịch bản (tuSuaHinhThuc_) + metadata đăng (noiDungDang_ bọc veSinhMetaDang_) + HOC_EDIT / QUY_TAC_HOC', () => {
  const kb = {lop: '12', hook: '2k8 ơi, bẫy này nè!', tieu_de_bia: 'Sĩ tử 2008 phải biết', canh: [{loi_thoai: 'Các 2k8 nhớ nhé', noi_dung_man_hinh: ['x']}],
    khung4tang: {tu_sinh: {ma: 'x = "2k8"'}}};
  const sua = ctx.veSinhKb_(kb, {});
  assert.ok(sua.length);
  assert.equal(kb.hook, 'Bạn ơi, bẫy này nè!');
  assert.equal(kb.tieu_de_bia, 'Sĩ tử lớp 12 phải biết');
  assert.equal(kb.canh[0].loi_thoai, 'Các bạn nhớ nhé');
  assert.equal(kb.khung4tang.tu_sinh.ma, 'x = "2k8"');   // mã tự sinh không bị đụng
  const m = ctx.veSinhMetaDang_({tieu_de: 'Mẹo cho 2k9', mo_ta: 'Ôn THPT 2027 #2k9', the: ['2k9', 'toanhoc', 'thpt2027']}, '12');
  assert.ok(!ctx.coNamSinh_(m.tieu_de + m.mo_ta + m.the.join(' ')));
  assert.deepEqual(m.the, ['toanhoc', 'thpt']);
  assert.ok(/veSinhMetaDang_\(meta, r && r\.lop\)/.test(fs.readFileSync(path.join(GOC, 'DangVideo.gs'), 'utf8')));
  const nc = fs.readFileSync(path.join(GOC, 'NangCao.gs'), 'utf8');
  assert.equal((nc.match(/coNamSinh_\(/g) || []).length, 2);
  assert.ok(/XƯNG HÔ BỀN VỮNG/.test(fs.readFileSync(path.join(GOC, 'PromptKichBan.gs'), 'utf8')));
});

console.log('5. Auto-Heal Mắt thần — chỉ lỗi cứng, tối đa 1 lần dựng lại / bài');
const dongR = () => ({id: 'TT1', _row: 5, file_kich_ban: 'f1', ai_kiem_tra: '{}'});
const capNhat = (r) => { const g = ghiSheet[ghiSheet.length - 1]; if (g && g.ai_kiem_tra) r.ai_kiem_tra = g.ai_kiem_tra; return g; };
t('lỗi cứng lần 1 -> trả về BP2 (DA_GIAI + chỉ thị sửa đúng lỗi), lần 2 -> dừng (het_luot) để CHO + Zalo', () => {
  const r = dongR();
  const d = {file_id: 'v1', mat_than: {dat: false, loi: [{o: 4, loai: 'cat_chu', mo_ta: 'tiêu đề tràn', nang: true}, {o: 7, loai: 'lech_pha', mo_ta: 'đáp án sớm 4 s', nang: true}]}};
  ghiSheet.length = 0;
  let kq = ctx.xuLyTuSuaMatThan_({}, r, d);
  let g = capNhat(r);
  assert.ok(kq.tu_sua);
  assert.equal(g.trang_thai, 'DA_GIAI');
  assert.ok(/cat_chu/.test(g.gop_y) && /lech_pha/.test(g.gop_y) && /Cách sửa/.test(g.gop_y));
  assert.equal(JSON.parse(r.ai_kiem_tra).so_lan_tu_sua, 1);
  assert.ok(JSON.parse(r.ai_kiem_tra).ghi_chu_sua_tu_dong.length === 2);
  const truoc = ghiSheet.length;
  kq = ctx.xuLyTuSuaMatThan_({}, r, d);
  assert.equal(kq.tu_sua, false);
  assert.equal(kq.het_luot, true);
  assert.equal(ghiSheet.length, truoc, 'lần 2 không ghi DA_GIAI');
});
t('cảnh báo thẩm mỹ nhẹ (nang:false) / lỗi hệ thống (logo_sai) KHÔNG dựng lại', () => {
  const r = dongR();
  ghiSheet.length = 0;
  let kq = ctx.xuLyTuSuaMatThan_({}, r, {mat_than: {dat: false, loi: [{o: 3, loai: 'chong_chu', nang: false}, {o: 1, loai: 'logo_sai', nang: true}]}});
  assert.equal(kq.tu_sua, false);
  assert.equal(kq.cung.length, 0);
  assert.equal(ghiSheet.length, 0);
  cauHinh = {TU_SUA_MAT_THAN: 'TAT'};
  kq = ctx.xuLyTuSuaMatThan_({}, r, {mat_than: {dat: false, loi: [{o: 3, loai: 'cat_chu', nang: true}]}});
  assert.equal(kq.tu_sua, false);
  cauHinh = {};
});
t('tu_sinh_hong -> kịch bản nháp được dọn cờ để BP2 lập lại sân khấu tự sinh', () => {
  const r = dongR();
  nhapKb = {canh: [{loi_thoai: 'x'}], tu_sinh_da_thu: true, tu_sinh_hong: 'hỏng', khung4tang: {tu_sinh: {ma: 'x'}}};
  ctx.xuLyTuSuaMatThan_({}, r, {mat_than: {dat: false, loi: [{o: 2, loai: 'tu_sinh_hong', nang: true}]}});
  assert.ok(!nhapKb.tu_sinh_da_thu && !nhapKb.tu_sinh_hong && !nhapKb.khung4tang.tu_sinh);
  nhapKb = null;
});
t('webhook BoPhan2.gs gọi Auto-Heal cho cả Mắt thần + bo_cuc_loi; kiểm duyệt bố cục dùng chung trần 1 lần', () => {
  const b2 = fs.readFileSync(path.join(GOC, 'BoPhan2.gs'), 'utf8');
  assert.ok(b2.indexOf('xuLyTuSuaMatThan_(sh, r, d)') > 0 && b2.indexOf('xuLyTuSuaMatThan_(sh, r, d)') < b2.indexOf('kqMT._mat_than_chan'));
  assert.ok(/d\.bo_cuc_loi/.test(b2));
  const r = dongR();
  r.ai_kiem_tra = JSON.stringify({so_lan_tu_sua: 1, so_lan_bo_cuc: 1, kd_lan: 1});
  ghiSheet.length = 0; zalo.length = 0;
  const kq = ctx.xuLyKiemDuyetBoCuc_({}, r, {loai: 'bo_cuc', nang: ['chữ tràn mép cảnh 3']});
  assert.equal(kq.het_luot, true);
  assert.equal(ghiSheet[0].trang_thai, 'LOI');
  assert.equal(zalo.length, 1);
  const r2 = dongR();
  ghiSheet.length = 0;
  ctx.xuLyKiemDuyetBoCuc_({}, r2, {loai: 'bo_cuc', nang: ['chữ tràn mép cảnh 3']});
  assert.equal(JSON.parse(capNhat(r2).ai_kiem_tra).so_lan_tu_sua, 1);
});

t('v102.0: bo_cuc + Mắt thần dùng chung trần 1 lần/bài; nhận hinh_nho/tran_day/nhan_de & bo_cuc_loi; catGonTex_ an toàn', () => {
  const r = dongR();
  r.ai_kiem_tra = JSON.stringify({so_lan_tu_sua: 1, so_lan_bo_cuc: 1, kd_lan: 1});
  ghiSheet.length = 0;
  const kq = ctx.xuLyTuSuaMatThan_({}, r, {file_id: 'v1', mat_than: {dat: false, loi: [{o: 4, loai: 'cat_chu', mo_ta: 'x', nang: true}]}});
  assert.equal(kq.tu_sua, false, 'đã dùng 1 lượt bố cục -> khóa trần 1 lần/bài');
  assert.equal(kq.het_luot, true);
  const r3 = dongR();
  ghiSheet.length = 0;
  const kq3 = ctx.xuLyTuSuaMatThan_({}, r3, {file_id: 'v2', mat_than: {dat: false, loi: [{o: 5, loai: 'hinh_nho', mo_ta: 'hình bé', nang: true}, {o: 6, loai: 'tran_day', mo_ta: 'tràn đáy', nang: true}, {o: 7, loai: 'nhan_de', mo_ta: 'nhãn đè', nang: true}]}});
  assert.equal(kq3.tu_sua, true);
  assert.equal(kq3.cung.length, 3);
  const r4 = dongR();
  ghiSheet.length = 0;
  const kq4 = ctx.xuLyTuSuaMatThan_({}, r4, {file_id: 'v3', mat_than: {dat: true, loi: []}, bo_cuc_loi: ['TEX_THO: lộ \\text ở cảnh 2']});
  assert.equal(kq4.tu_sua, true);
  assert.equal(kq4.cung[0].loai, 'latex_tho');
  const goc = '\\Omega:\\ \\text{chọn 3 trong 20 thẻ (1 ... 20) rồi tính xác suất}';
  const gon = ctx.catGonTex_(goc, 40);
  assert.ok(!/\\text\{[^}]*$/.test(gon) && (gon.match(/\{/g) || []).length === (gon.match(/\}/g) || []).length && !/\\$/.test(gon), gon);
  assert.equal(ctx.catGonTex_('A:\\ \\text{Tổng } \\vdots 3', 60), 'A:\\ \\text{Tổng } \\vdots 3');
});
t('v101.5: tuSuaSanKhau_ đồng bộ san_khau_dich tu_sinh_svg -> rut_mau khi chỉ đạo chọn sân khấu chuyên dụng', () => {
  const kb = {san_khau_dich: 'tu_sinh_svg', tu_sinh_hong: 'x', mon: 'XAC_SUAT', lop: '11', chi_dao: 'rút thẻ số', de_bai: 'Rút 3 thẻ từ 20 thẻ', khung4tang: {buoc: [], de_ghim: []}};
  try { ctx.tuSuaSanKhau_(kb, {}); } catch (e) { /* các bước sau không liên quan */ }
  assert.equal(kb.san_khau_dich, 'rut_mau');
  assert.ok(!kb.tu_sinh_hong);
  assert.equal(ctx.dungTuSinh_({}, kb), false);
});

console.log('6. lapTuSinh_ — hợp đồng tu_sinh_svg vá tối đa 2 lần');
const kbTs = () => ({san_khau_dich: 'tu_sinh_svg', khung4tang: {buoc: [{nhan: 'a'}, {nhan: 'b'}, {nhan: 'c'}]}, canh: [{loi_thoai: 'x'}]});
t('máy từ chối 2 lần rồi đạt -> gắn (đã vá 2 lần)', () => {
  let n = 0, m = 0;
  ctx.goiGemini_ = () => ({ma: 'def ve(): return [] # ' + (n++), mo_ta: 'x'});
  ctx.conDuGoiGemini_ = () => true;
  ctx.kiemTuSinhMay_ = () => (m++ < 2 ? {ok: false, loi: 'TS_CHU_NHO: chữ 18 px'} : {ok: true, so_lop: 4});
  const kb = kbTs();
  assert.equal(ctx.lapTuSinh_(kb, {id: 'X'}, {}), true);
  assert.equal(n, 3);
  assert.ok(!kb.tu_sinh_hong);
});
t('vẫn lỗi sau 2 lần -> cảnh báo tu_sinh_hong, GIỮ mã để chuanbi.py vá tiếp (không rơi ngầm)', () => {
  let n = 0;
  ctx.goiGemini_ = () => ({ma: 'def ve(): return [] # ' + (n++)});
  ctx.kiemTuSinhMay_ = () => ({ok: false, loi: 'TS_NHAN_DE_NET: nhãn đè đỉnh'});
  const kb = kbTs();
  assert.equal(ctx.lapTuSinh_(kb, {id: 'X'}, {}), false);
  assert.equal(n, 3);
  assert.ok(/sau 2 lần vá/.test(kb.tu_sinh_hong));
  assert.ok(kb.khung4tang.tu_sinh && kb.khung4tang.tu_sinh.ma);
  assert.ok(nk.some((x) => /^TU_SINH_HONG/.test(x)));
});
t('không hợp đồng -> giữ hành vi v99.1 (vá 1 lần, lỗi thì gỡ)', () => {
  let n = 0;
  ctx.goiGemini_ = () => ({ma: 'def ve(): return [] # ' + (n++)});
  const kb = kbTs();
  delete kb.san_khau_dich;
  assert.equal(ctx.lapTuSinh_(kb, {id: 'X'}, {}), false);
  assert.equal(n, 2);
  assert.ok(!kb.khung4tang.tu_sinh && !kb.tu_sinh_hong);
});
t('prompt huongDanTuSinh_ có luật thẩm mỹ cứng + API ve25d + hợp đồng hình', () => {
  const s = ctx.huongDanTuSinh_({kich_ban_hinh: ['gốc', 'trải phẳng', 'nối', 'chốt'], nut_that: 'trải phẳng', khung4tang: {buoc: []}, canh: []}, {de_bai: 'kiến bò'});
  assert.ok(/font-size >= 24/.test(s) && /ve25d\.MAU/.test(s) && /v\.nhan\(/.test(s) && /HỢP ĐỒNG HÌNH TỪ BỘ PHẬN 0/.test(s));
});
t('workflow BP1 / BP2 checkout đủ bộ kiểm Python (tự sinh / hình phẳng / không gian)', () => {
  ['viet-kich-ban.yml', 'bo-phan-1.yml'].forEach((f) => {
    const y = fs.readFileSync(path.join(GOC, '.github', 'workflows', f), 'utf8');
    ['scripts/tu_sinh_svg.py', 'scripts/ve25d.py', 'scripts/giai_hinh_phang.py', 'scripts/hinh_phang', 'scripts/giai_hinh_khong_gian.py', 'scripts/hinh_khong_gian'].forEach((x) => assert.ok(y.includes(x), f + ' thiếu ' + x));
  });
  assert.ok(fs.readFileSync(path.join(GOC, '.github', 'workflows', 'dang-video.yml'), 'utf8').includes('scripts/evergreen.py'));
});

t('BP4: đủ điểm nhưng thiếu bằng chứng hình phải về BP2', () => {
  const r = {...dongR(), mon: 'THUC_TE'};
  ghiSheet.length = 0;
  ctx.apDungKetQuaAiXem_({}, r, {dat: true, phan_tram: 100});
  const g = capNhat(r);
  assert.equal(g.trang_thai, 'DA_GIAI');
  assert.match(g.gop_y, /t2_trong/);
  assert.equal(JSON.parse(r.ai_kiem_tra).so_lan_mat_than, 1);
});

t('THUC_TE chỉ có thẻ chữ: BP2 giữ lỗi cứng và giữ hợp đồng SVG', () => {
  const kb = {mon: 'THUC_TE', san_khau_dich: 'tu_sinh_svg', khung4tang: {san_khau: {loai: 'tu_duy_dai_so'}, buoc: []}};
  ctx.tuSuaSanKhau_(kb, {});
  assert.equal(kb.san_khau_dich, 'tu_sinh_svg');
  assert.ok(ctx.phanLoaiLoiCung_([], [], kb).nang.some(x => x.startsWith('t2_trong')));
  assert.ok(!ctx.phanLoaiLoiCung_([], [], {...kb, id: 'TEST-10P'}).nang.length);
});

console.log('7. v102.0 — Tự dọn Script Properties > 35/50, đếm video đạt hôm nay & báo cáo Zalo 21:00');
const fmtDateMock = (d, tz, f) => {
  const dt = new Date(d.getTime() + (tz === 'America/Los_Angeles' ? -7 : 7) * 3600000);
  const p2 = (n) => String(n).padStart(2, '0');
  const Y = dt.getUTCFullYear(), M = p2(dt.getUTCMonth() + 1), D = p2(dt.getUTCDate()), h = p2(dt.getUTCHours()), m = p2(dt.getUTCMinutes());
  return f === 'yyyy-MM-dd' ? `${Y}-${M}-${D}` : `${h}:${m} ${D}/${M}/${Y}`;
};
t('kiemVaDonScriptProperties_ tự dọn khi > 35 khóa, xóa kdm_*/kd_* cũ & HE_yt_* lỗi, giữ BAD / hôm nay / key', () => {
  ctx.Utilities = {formatDate: fmtDateMock};
  ctx.khoNgayPT_ = () => '2026-11-26';
  props = {GEMINI_KEY: 'secret', kd_bad1: 'BAD', kd_now: '2026-11-26', kdm_now_pro: '2026-11-26', HE_yt_ok: '2026-11-25', DON_RAC_NGAY: '2026-11-26'};
  for (let i = 0; i < 20; i++) props['kdm_old_' + i] = '2026-11-20';
  for (let i = 0; i < 15; i++) props['HE_yt_err_' + i] = 'loi';
  assert.ok(Object.keys(props).length > 35);
  const kq = ctx.kiemVaDonScriptProperties_();
  assert.ok(kq && kq.da_xoa === 35, 'phải xóa 35 khóa rác, thực tế: ' + JSON.stringify(kq));
  assert.equal(props.GEMINI_KEY, 'secret');
  assert.equal(props.kd_bad1, 'BAD');
  assert.equal(props.kd_now, '2026-11-26');
  assert.equal(props.kdm_now_pro, '2026-11-26');
  assert.equal(props.HE_yt_ok, '2026-11-25');
  assert.equal(props.CAI_DAT_KHOA, '0');
});
t('demVideoDatHomNay_ chỉ đếm video ngắn ĐẠT hôm nay (bỏ LOI, CHO, -10P, hôm qua)', () => {
  ctx.Utilities = {formatDate: fmtDateMock};
  const now = new Date(), qua = new Date(Date.now() - 2 * 86400000);
  const hang = [
    {id: 'TT1', trang_thai: 'CO_VIDEO', duyet: 'DA_DUYET', cap_nhat: now},
    {id: 'TT2', trang_thai: 'DA_DANG', duyet: 'DA_DUYET', cap_nhat: now},
    {id: 'TT3', trang_thai: 'DA_XONG', duyet: '', cap_nhat: now},
    {id: 'TT4', trang_thai: 'CO_VIDEO', duyet: 'CHO', cap_nhat: now},
    {id: 'TT5', trang_thai: 'LOI', duyet: '', cap_nhat: now},
    {id: 'TT6-10P', trang_thai: 'DA_XONG', duyet: 'DA_DUYET', cap_nhat: now},
    {id: 'TT7', trang_thai: 'DA_XONG', duyet: 'DA_DUYET', cap_nhat: qua},
  ];
  assert.equal(ctx.demVideoDatHomNay_(hang), 3);
});
t('taoBaoCaoSucKhoe_ báo đúng chỉ tiêu đạt, tỷ lệ đạt lần 1 (%), Auto-Heal & Top 3 mã lỗi hôm nay', () => {
  ctx.Utilities = {formatDate: fmtDateMock};
  ctx.khoDanhSachKey_ = () => [];
  const now = new Date();
  const hang = [
    {id: 'TT1', trang_thai: 'CO_VIDEO', duyet: 'DA_DUYET', file_video: 'v1', cap_nhat: now, ai_kiem_tra: '{}'},
    {id: 'TT2', trang_thai: 'CO_VIDEO', duyet: 'DA_DUYET', file_video: 'v2', cap_nhat: now, ai_kiem_tra: JSON.stringify({so_lan_tu_sua: 1})},
    {id: 'TT3', trang_thai: 'LOI', duyet: '', cap_nhat: now, ai_kiem_tra: '{}'},
  ];
  const nkRows = [
    [now, 'TU_SUA_MAT_THAN', 'TT2 lần 1/1: cat_chu: tràn | hinh_nho: nhỏ'],
    [now, 'AUTO_HEAL_BO_CUC', 'TT4 lần 1/1: TEX_THO: lộ text'],
    [now, 'MAT_THAN', 'TT5 chặn: cat_chu + t2_trong'],
    [now, 'MAT_THAN', 'TT6 chặn: cat_chu'],
  ];
  ctx.docHang_ = () => hang;
  ctx.SpreadsheetApp = {
    getActiveSpreadsheet: () => ({
      getSheetByName: (ten) => ten === 'NHAT_KY'
        ? {getLastRow: () => nkRows.length + 1, getLastColumn: () => 3, getRange: () => ({getValues: () => nkRows})}
        : {}
    })
  };
  const bc = ctx.taoBaoCaoSucKhoe_();
  assert.match(bc, /dat kiem duyet 2\/3/);
  assert.match(bc, /dat lan 1: 1\/2 \(50%\)/);
  assert.match(bc, /Auto-Heal da chay: 2 luot/);
  assert.match(bc, /TOP 3 LOI HOM NAY: cat_chu \(3\)/);
});

fs.rmSync(tmp, {recursive: true, force: true});
console.log(`\nKẾT QUẢ: ${dat} đạt, ${loi} hỏng`);
process.exit(loi ? 1 : 0);
