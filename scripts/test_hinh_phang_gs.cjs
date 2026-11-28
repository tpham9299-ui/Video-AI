// Kiểm thử nhanh v94 phía Apps Script: hình phẳng chuẩn (prompt, Auto-fix, GDPT 2018 JS, cầu nối kiểm chứng Python, lỗi cứng).
// Chạy: node scripts/test_hinh_phang_gs.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const GOC = path.join(__dirname, '..');
let dat = 0;
const hong = [];
const kiem = (ten, dk) => { if (dk) { dat++; console.log('  ✓', ten); } else { hong.push(ten); console.log('  ✗', ten); } };

for (const f of fs.readdirSync(GOC).filter((x) => x.endsWith('.gs'))) new vm.Script(fs.readFileSync(path.join(GOC, f), 'utf8'), {filename: f});

const PY = process.platform === 'win32' ? 'python' : 'python3';
const kiemHinhPhangMay_ = (kb) => {
  try {
    return JSON.parse(execFileSync(PY, [path.join(GOC, 'scripts', 'giai_hinh_phang.py'), '-', '--chi-kiem'], {input: JSON.stringify(kb), env: {...process.env, PYTHONIOENCODING: 'utf8'}}).toString('utf8'));
  } catch (e) {
    return e.status === 2 ? JSON.parse(e.stdout.toString('utf8')) : null;
  }
};
const cauHinh = {};
const ctx = vm.createContext({cauHinh_: (k) => cauHinh[k] || '', nhatKy_: () => {}, kiemHinhPhangMay_, console});
for (const f of ['BoPhan1.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
ctx.cauHinh_ = (k) => cauHinh[k] || '';   // BoPhan1.gs định nghĩa cauHinh_ đọc Sheets -> thay bằng bảng giả
ctx.nhatKy_ = () => {};
const KB = JSON.parse(fs.readFileSync(path.join(GOC, 'mau/hinh_phang/am_vuong_de.json'), 'utf8'));
const moi = () => JSON.parse(JSON.stringify(KB));

console.log('1. Cấp lớp + chương trình');
kiem('capLopHinhPhang_: 9 -> lop_9, 8 -> lop_8, 11 -> thpt', ctx.capLopHinhPhang_('9') === 'lop_9' && ctx.capLopHinhPhang_('lớp 8') === 'lop_8' && ctx.capLopHinhPhang_('11') === 'thpt');
const yc = ctx.yeuCauKienThucLop_('9', 'HINH_HOC');
kiem('yeuCauKienThucLop_(9, HINH_HOC) cấm cung chứa góc + nêu 3 cách nội tiếp chuẩn', /cung chứa góc/.test(yc) && /cạnh huyền/.test(yc) && /180°/.test(yc));
kiem('lớp 9 các môn khác không đổi (chuanLop_ vẫn 10|11|12)', ctx.chuanLop_('9') === '' && ctx.yeuCauKienThucLop_('9', 'XAC_SUAT') === '');
kiem('chonKieuHinh_ lớp 8/9 -> PHANG', ctx.chonKieuHinh_('9') === 'PHANG' && ctx.chonKieuHinh_('8') === 'PHANG');

console.log('2. Prompt kịch bản');
const r = {mon: 'HINH_HOC', lop: '9', de_bai: KB.de_bai, dap_an: 'CM', cach_1: '{}', cach_2: '{}'};
kiem('dungHinhPhangChuan_: hình phẳng -> có; không gian -> không', ctx.dungHinhPhangChuan_(r) && !ctx.dungHinhPhangChuan_({mon: 'HINH_HOC', de_bai: 'Cho hình chóp S.ABCD'}));
const p = ctx.taoPromptHinhHocThuan_(r, {cac_buoc: []}, {cac_buoc: []}, {traVe: ['"giu_san_khau":false']});
kiem('prompt có hinh_phang_chuan, phép dựng, khóa màu, cấm tọa độ', /"hinh_phang_chuan"/.test(p) && /chan_duong_cao/.test(p) && /\\\\mvang/.test(p) && /KHÔNG ghi tọa độ/.test(p));
kiem('prompt bỏ ví dụ tọa độ hinh_hoc của bản cũ', !/"diem":\{"S":\[20,10\]/.test(p) && !/Mỗi cảnh chỉ có đúng MỘT vật/.test(p));
const prompt2B = ctx.taoPromptAnhXa2B_(KB, r, 'HINH_PHANG');
const schema2B = ctx.schemaAnhXa2B_('HINH_PHANG').properties.hinh_phang_chuan;
kiem('pha 2B khai báo đúng phép dựng d1, đỉnh A B C và chuỗi JSON theo responseSchema',
  prompt2B.includes('"loai":"tam_giac_noi_tiep","dinh":["A","B","C"]') && prompt2B.includes('Giữ "phep_dung" là mảng') &&
  schema2B.type === 'STRING' && schema2B.description.includes('phep_dung[].dinh'));
cauHinh.HINH_PHANG_CHUAN = 'TAT';
kiem('CAU_HINH HINH_PHANG_CHUAN=TAT -> về prompt cũ', !ctx.dungHinhPhangChuan_(r) && !/"hinh_phang_chuan"/.test(ctx.taoPromptHinhHocThuan_(r, {cac_buoc: []}, {cac_buoc: []}, {traVe: []})));
delete cauHinh.HINH_PHANG_CHUAN;

console.log('3. Auto-fix + khóa luồng');
const kb = moi();
kb.hinh_phang_chuan.cap_lop = '';
kb.hinh_phang_chuan.trang_chung_minh[0].dong[0].hanh_dong_hinh[0].mau = 'yellow';
for (let i = 0; i < 4; i++) kb.hinh_phang_chuan.trang_chung_minh[0].dong.push({khi_noi: 'x', tex: '\\angle BEC = 90^\\circ'});
kb.canh[3].noi_dung_man_hinh = ['AB'];
const sua = ctx.tuSuaHinhPhangChuan_(kb, r);
kiem('cap_lop suy từ lop = lop_9', kb.hinh_phang_chuan.cap_lop === 'lop_9');
kiem('màu "yellow" -> vang', kb.hinh_phang_chuan.trang_chung_minh[0].dong[0].hanh_dong_hinh[0].mau === 'vang');
kiem('trang 6 dòng tự chia thành 2 trang', kb.hinh_phang_chuan.trang_chung_minh.length === 6 && sua.some((x) => /chia trang/.test(x)));
kiem('noi_dung_man_hinh cảnh bị dọn (công thức nằm trong trang)', kb.canh[3].noi_dung_man_hinh.length === 0);
const kbL = moi();
ctx.khoaLuongHinhHoc_(kbL);
kiem('khóa luồng hình học giữ nguyên hinh_phang_chuan', !!kbL.hinh_phang_chuan && kbL.luong === 'hinh_hoc_thuan');
const kbKG = moi();
kbKG.de_bai = 'Cho hình chóp S.ABCD có đáy là hình vuông.';
ctx.tuSuaHinhPhangChuan_(kbKG, r);
kiem('đề không gian -> gỡ hinh_phang_chuan', !kbKG.hinh_phang_chuan);

console.log('4. Kiểm tra kịch bản (GDPT JS + kiểm chứng tọa độ Python)');
let k = ctx.kiemTraKichBanManim_(moi());
kiem('bài nghiệm thu: không lỗi nặng (' + k.nang.length + ')', k.nang.length === 0);
const kbG = moi();
kbG.canh[3].loi_thoai = 'Vì E và D cùng nhìn BC dưới một góc vuông nên BEDC nội tiếp.';
k = ctx.kiemTraKichBanManim_(kbG);
const g = k.nang.find((x) => /^HP_VUOT_CHUONG_TRINH/.test(x));
kiem('lời thoại "cùng nhìn BC dưới góc" -> HP_VUOT_CHUONG_TRINH + gợi ý cạnh huyền BC', g && /cạnh huyền BC/.test(g));
const kbS = moi();
kbS.canh[3].loi_thoai += ' Ta có sin B bằng AC trên BC.';
kiem('tỉ số lượng giác "sin B" lớp 9 không bị chặn', ctx.kiemTraKichBanManim_(kbS).nang.length === 0);
const kbD = moi();
kbD.hinh_phang_chuan.trang_chung_minh[3].dong[2].menh_de[0].tg2 = 'AMC';
k = ctx.kiemTraKichBanManim_(kbD);
kiem('đồng dạng sai thứ tự -> HP_DONG_DANG_SAI_THU_TU (qua Python)', k.nang.some((x) => /^HP_DONG_DANG_SAI_THU_TU/.test(x) && /ACM/.test(x)));
const kbV = moi();
kbV.hinh_phang_chuan.trang_chung_minh[1].dong.push({khi_noi: 'x', tex: 'DE \\parallel BC'});
k = ctx.kiemTraKichBanManim_(kbV);
kiem('mệnh đề sai trong chữ -> HP_MENH_DE_SAI', k.nang.some((x) => /^HP_MENH_DE_SAI/.test(x)));
const ph = ctx.phanLoaiLoiCung_(k.nang.concat(['TIEU_DE_DAI: x']), [], kbV);
kiem('HP_* là lỗi cứng, lỗi hình thức hạ thành cảnh báo', ph.nang.some((x) => /^HP_MENH_DE_SAI/.test(x)) && !ph.nang.some((x) => /^TIEU_DE_DAI/.test(x)));
const kbK = moi();
kbK.hinh_phang_chuan.phep_dung[1].khi_noi = 'cụm không có trong lời';
kiem('khi_noi không nguyên văn -> chỉ cảnh báo HP_KHI_NOI_KHONG_KHOP', ctx.kiemTraKichBanManim_(kbK).nhe.some((x) => /^HP_KHI_NOI_KHONG_KHOP/.test(x)));
const kbChungMinh = moi();
kbChungMinh.hinh_phang_chuan.trang_chung_minh[0].dong.push({khi_noi: 'x', tex: '\\angle AZB = 90^\\circ'});
kiem('BP2 giữ lỗi HP_DIEM_KHONG_TON_TAI từ bộ giải khi lời chứng minh dùng Z',
  ctx.kiemTraKichBanManim_(kbChungMinh).nang.some((x) => /^HP_DIEM_KHONG_TON_TAI:.*điểm Z/.test(x)));

const kbThieuA = moi();
const pd = kbThieuA.hinh_phang_chuan.phep_dung;
pd[0] = {id: 'd1', loai: 'duong_tron', tam: 'O'};
pd[1] = {id: 'd2', loai: 'chan_duong_cao', ten: 'H', tu: 'A', xuong: 'BC'};
const loiPy = kiemHinhPhangMay_(kbThieuA);
const loiD2 = 'HP_DIEM_KHONG_TON_TAI: phép dựng 2/d2: điểm A chưa được dựng trước bước này';
kiem('cầu nối Python trả đúng lỗi dùng A trước khi dựng ở d2',
  loiPy?.dat === false && loiPy.loi.some((x) => x.ma + ': ' + x.chi_tiet === loiD2));
ctx.kiemHinhPhangMay_ = undefined;
const danhGiaBP2 = (b) => ctx.danhGiaKichBan_(b, r.dap_an, r.mon, false, null, r.de_bai, r.lop).nang;
kiem('BP2 JS giữ lỗi thiếu A trong danh sách lỗi cứng khi chạy không có Python', danhGiaBP2(kbThieuA).includes(loiD2));
const kbDinhChuoi = moi();
kbDinhChuoi.hinh_phang_chuan.phep_dung[0].dinh = 'ABC';
kiem('BP2 JS nạp đủ A B C từ dinh dạng chuỗi', ctx.kiemTraKichBanManim_(kbDinhChuoi).nang.length === 0);
delete kbDinhChuoi.hinh_phang_chuan.phep_dung[0].dinh;
kiem('BP2 JS chặn tam giác bước 1 thiếu trường dinh', danhGiaBP2(kbDinhChuoi).some((x) => /^HP_DUNG_LOI: phép dựng 1\/d1:/.test(x)));

console.log('9. Phiên 1/3: cổng chốt hình học trước khi lưu CO_KICH_BAN (khớp bước trước TTS của BP3)');
ctx.kiemHinhPhangMay_ = kiemHinhPhangMay_;
const kiemKhongGianMay_ = (kb) => {
  try {
    return JSON.parse(execFileSync(PY, [path.join(GOC, 'scripts', 'giai_hinh_khong_gian.py'), '-', '--chi-kiem'], {input: JSON.stringify(kb), env: {...process.env, PYTHONIOENCODING: 'utf8'}}).toString('utf8'));
  } catch (e) {
    return e.status === 2 ? JSON.parse(e.stdout.toString('utf8')) : null;
  }
};
const kbChot = moi();
kbChot.luong = 'hinh_hoc_thuan';
kbChot.mon = 'HINH_HOC';
kiem('cổng chốt: bài chuẩn -> 0 lỗi', ctx.chotHinhHocTruocLuu_(kbChot).length === 0);
const kbChotA = JSON.parse(JSON.stringify(kbChot));
kbChotA.hinh_phang_chuan.phep_dung[0] = {id: 'd1', loai: 'duong_tron', tam: 'O'};
kbChotA.hinh_phang_chuan.phep_dung[1] = {id: 'd2', loai: 'chan_duong_cao', ten: 'H', tu: 'A', xuong: 'BC'};
kiem('cổng chốt: bước 1 chỉ (O), bước 2 dùng A -> chặn HP_DIEM_KHONG_TON_TAI', ctx.chotHinhHocTruocLuu_(kbChotA).some((x) => x === loiD2));
ctx.kiemHinhPhangMay_ = undefined;
kiem('cổng chốt: không có Python vẫn chặn bằng bản JS thứ tự dựng', ctx.chotHinhHocTruocLuu_(kbChotA).some((x) => x === loiD2));
ctx.kiemHinhPhangMay_ = kiemHinhPhangMay_;
const kbChotNgoai = JSON.parse(JSON.stringify(kbChotA));
kbChotNgoai.luong = 'thuc_te_xac_suat';
kbChotNgoai.mon = 'THUC_TE';
kiem('cổng chốt: luồng thực tế -> không kiểm hình phẳng (khớp BP3 hh=0)', ctx.chotHinhHocTruocLuu_(kbChotNgoai).length === 0);
const kbChotMay = JSON.parse(JSON.stringify(kbChot));
kbChotMay.hinh_phang_chuan.trang_chung_minh[0].dong.push({khi_noi: 'x', tex: 'AM \\perp BC'});
kiem('cổng chốt: mệnh đề sai trên tọa độ -> HP_MENH_DE_SAI từ bộ giải Python', ctx.chotHinhHocTruocLuu_(kbChotMay).some((x) => /^HP_MENH_DE_SAI/.test(x)));
const kbThieuLoai = moi();
delete kbThieuLoai.hinh_phang_chuan.phep_dung[0].loai;
const suaThieuLoai = ctx.tuSuaHinhPhangChuan_(kbThieuLoai, r);
kiem('Auto-fix: bước 1 thiếu loai nhưng có dinh 3 đỉnh -> suy lại tam_giac_noi_tiep, giữ A B C',
  kbThieuLoai.hinh_phang_chuan.phep_dung[0].loai === 'tam_giac_noi_tiep' && suaThieuLoai.some((x) => /thiếu loai/.test(x)) &&
  ctx.kiemThuTuPhepDungHinhPhang_(kbThieuLoai.hinh_phang_chuan.phep_dung) === '');
const kbPdChuoi = moi();
kbPdChuoi.hinh_phang_chuan.phep_dung = JSON.stringify(kbPdChuoi.hinh_phang_chuan.phep_dung);
ctx.tuSuaHinhPhangChuan_(kbPdChuoi, r);
kiem('Auto-fix: phep_dung mã hóa lồng thành chuỗi JSON -> bung lại mảng', Array.isArray(kbPdChuoi.hinh_phang_chuan.phep_dung) && kbPdChuoi.hinh_phang_chuan.phep_dung.length === KB.hinh_phang_chuan.phep_dung.length);
// kb mang cả hinh_khong_gian lẫn hinh_phang_chuan: trước đây BP2 chỉ kiểm KG -> HP_* lọt sang BP3
ctx.kiemKhongGianMay_ = kiemKhongGianMay_;
const kbHaiHinh = JSON.parse(JSON.stringify(kbChotA));
kbHaiHinh.hinh_khong_gian = JSON.parse(fs.readFileSync(path.join(GOC, 'mau/v97/vuong_goc_sa.json'), 'utf8')).hinh_khong_gian;
const nangHaiHinh = ctx.danhGiaKichBan_(kbHaiHinh, r.dap_an, 'HINH_HOC', false, null, r.de_bai, r.lop).nang;
kiem('danhGiaKichBan_: kb có cả KG lẫn HP -> vẫn bắt HP_DIEM_KHONG_TON_TAI', nangHaiHinh.includes(loiD2));
kiem('cổng chốt: kb có cả KG lẫn HP -> bắt HP_DIEM_KHONG_TON_TAI', ctx.chotHinhHocTruocLuu_(kbHaiHinh).includes(loiD2));
const kbKgRong = JSON.parse(JSON.stringify(kbChot));
delete kbKgRong.hinh_phang_chuan;
kbKgRong.hinh_khong_gian = JSON.parse(fs.readFileSync(path.join(GOC, 'mau/v97/vuong_goc_sa.json'), 'utf8')).hinh_khong_gian;
kbKgRong.hinh_khong_gian.so_do.push({loai: 'goc_ba_diem', goc: '', gia_tri: '45°'});
kiem('cổng chốt: hình không gian "goc" rỗng -> KG_DUNG_LOI (không crash, không lọt)', ctx.chotHinhHocTruocLuu_(kbKgRong).some((x) => /^KG_DUNG_LOI/.test(x)));
ctx.kiemKhongGianMay_ = () => { throw new Error('python chết'); };
kiem('kiemKhongGian_: cầu nối Python lỗi -> lỗi cứng PREFLIGHT_HINH_KHONG_GIAN thay vì cho qua',
  ctx.kiemKhongGian_(kbKgRong).nang.some((x) => /^PREFLIGHT_HINH_KHONG_GIAN/.test(x)));
ctx.kiemKhongGianMay_ = undefined;
const bp1 = fs.readFileSync(path.join(GOC, 'BoPhan1.gs'), 'utf8');
const viTriChot = bp1.indexOf('chotHinhHocTruocLuu_(kb)'), viTriLuu = bp1.indexOf("trang_thai: 'CO_KICH_BAN', file_kich_ban: oKb");
kiem('BP2 gọi cổng chốt hình học TRƯỚC khi ghi CO_KICH_BAN', viTriChot > 0 && viTriLuu > viTriChot);
const yml = fs.readFileSync(path.join(GOC, '.github/workflows/dung-video.yml'), 'utf8');
const iHinh = yml.indexOf('scripts/kiem_hinh_truoc_tts.py'), iTts = yml.indexOf('- name: Tạo giọng đọc'), iPre = yml.indexOf('- name: Chuẩn bị props giả lập');
kiem('BP3: kiểm hình trước TTS + trước props giả lập, có callback KIEM_DUYET_BO_CUC', iHinh > 0 && iHinh < iPre && iPre < iTts &&
  /bao_hinh_truoc_tts\.json/.test(yml) && /steps\.hinh_truoc_tts\.outputs\.da_bao == 'true'/.test(yml));
const iMat = yml.indexOf('- name: Mắt thần AI quét lưới 3×3'), iCong = yml.indexOf('- name: Cổng chặn MP4 hỏng'), iDrive = yml.indexOf('- name: Tải video lên Google Drive');
kiem('BP3: chuyển động + Mắt thần 3×3 + cổng MP4 chạy TRƯỚC rclone đẩy Drive', iMat > 0 && iMat < iCong && iCong < iDrive && /os\.remove\(mp4_path\)/.test(yml));

console.log('\nKết quả: %d đạt, %d hỏng', dat, hong.length);
process.exit(hong.length ? 1 : 0);
