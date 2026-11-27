// v99.1 — Remotion (không render): node scripts/test_v99_1.mjs
//  - 5 theme nền: chữ #E9EEF5 đạt tương phản >= 7:1 trên điểm sáng nhất (đỉnh / giữa / đáy + quầng sáng + vệt quét);
//  - nền chuyển động theo nhịp bước (quầng dịch, vệt quét chỉ 0,9 s sau khi đổi bước); xung nhịp T2 0..1 trong 0,9 s;
//  - sân khấu tự sinh: lớp chưa tới mốc thì ẩn, lớp mới nhất sáng rồi lắng, lớp cùng nhóm thay nhau (không chồng nhãn);
//  - 2 mẫu out/v99_1 (nếu có props): T2 không đứng > 6 s, theme đúng, lớp kết quả không trước tCongBo.
import {build} from 'esbuild';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {pathToFileURL} from 'url';

const boCss = {
  name: 'bo-css',
  setup(b) {
    b.onResolve({filter: /\.css$/}, (a) => ({path: a.path, namespace: 'css-empty'}));
    b.onLoad({filter: /.*/, namespace: 'css-empty'}, () => ({contents: ''}));
  },
};
const nap = async (vao) => {
  const kq = await build({entryPoints: [path.resolve(vao)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error', external: ['react', 'remotion', 'katex'], plugins: [boCss]});
  fs.mkdirSync('out', {recursive: true});
  const tep = path.join(path.resolve('out'), `v991_${path.basename(vao)}_${process.pid}.mjs`);
  fs.writeFileSync(tep, kq.outputFiles[0].text);
  const m = await import(pathToFileURL(tep).href);
  fs.unlinkSync(tep);
  return m;
};
const N = await nap('src/khung4tang/nen_v99.ts');
const S = await nap('src/sankhau2d/SanKhauTuSinh.tsx');
const C = await nap('src/chu.ts');
const B = await nap('src/khung4tang/bo_cuc_v93.ts');
const T3 = await nap('src/khung4tang/TangTheGiai.tsx');
const T4 = await nap('src/khung4tang/ThanhDe.tsx');
const OT = await nap('src/khung4tang/OutroTomTat.tsx');
const KG = await nap('src/khonggian/index.ts');
let dat = 0, hong = 0;
const kiem = (dk, ten) => { if (dk) dat++; else hong++; console.log((dk ? 'ĐẠT  ' : 'HỎNG ') + ten); };

console.log('1. Tương phản 5 theme');
kiem(N.DS_THEME.length === 5, 'đủ 5 theme: ' + N.DS_THEME.join(', '));
for (const ten of N.DS_THEME) {
  const th = N.THEME_V99[ten];
  const diem = [th.tren, th.giua, th.duoi, th.sangNhat, N.tron(th.giua, th.quang, th.quangMo), N.tron(N.tron(th.giua, th.quang, th.quangMo), '#ffffff', 0.07)];
  if (th.vien) diem.push(N.tron(th.giua, th.vien, 0.14));
  const min = Math.min(...diem.map((c) => N.tuongPhan(N.CHU_CHINH, c)));
  kiem(min >= 7, `${ten}: tương phản nhỏ nhất ${min.toFixed(2)} : 1 (>= 7)`);
}
kiem(N.layTheme('deep_ocean')?.hoaTiet === 'song' && N.layTheme('blueprint')?.hoaTiet === 'ban_ve' && N.layTheme('khong_co') === null, 'layTheme + họa tiết riêng mỗi theme');
kiem(new Set(N.DS_THEME.map((t) => N.THEME_V99[t].giua)).size === 5, '5 theme khác màu nền');

console.log('2. Chuyển động nền + xung nhịp');
const moc = [0, 5, 12];
const a = N.trangThaiNen(4, moc), b = N.trangThaiNen(6.5, moc), c = N.trangThaiNen(12.4, moc);
kiem(a.lechX !== b.lechX && b.lechX !== c.lechX, `quầng sáng dịch theo bước (${a.lechX.toFixed(0)} -> ${b.lechX.toFixed(0)} -> ${c.lechX.toFixed(0)})`);
kiem(N.trangThaiNen(5.4, moc).quet > 0 && N.trangThaiNen(7, moc).quet === -1 && N.trangThaiNen(0.3, moc).quet === -1, 'vệt quét chỉ 0,9 s sau khi đổi bước (không ở bước đầu)');
kiem(N.xungNhip(10.45, [10]) > 0.4 && N.xungNhip(11, [10]) === -1 && N.xungNhip(3, undefined) === -1, 'xung nhịp T2: 0..1 trong 0,9 s');

console.log('3. Sân khấu tự sinh');
const L = [{id: 'a', t: 1, svg: '', hieu_ung: 'moc', nhom: 'g'}, {id: 'b', t: 3, svg: '', hieu_ung: 've'}, {id: 'c', t: 5, svg: '', hieu_ung: 'no', nhom: 'g'}];
kiem(S.trangThaiLop(L[0], 0.9, 30, true).hien === 0, 'lớp chưa tới mốc: ẩn');
kiem(S.trangThaiLop(L[0], 2, 30, true).hien > 0.9, 'lớp đã tới mốc: hiện đủ');
kiem(S.trangThaiLop(L[1], 3.4, 30, true).quet < 1 && S.trangThaiLop(L[1], 4.5, 30, true).quet === 1, "hiệu ứng 've': quét lộ dần 1,1 s");
kiem(S.trangThaiLop(L[0], 1.6, 30, true).sang > 0.5 && S.trangThaiLop(L[0], 4, 30, false).sang === 0, 'lớp mới nhất sáng rồi lắng; lớp cũ không sáng');
kiem(S.trangThaiLop(L[0], 6, 30, false).hien < S.trangThaiLop(L[0], 6, 30, true).hien, 'lớp cũ dịu hơn lớp đang giảng');
kiem(S.heSoThay(L[0], L, 4) === 1 && S.heSoThay(L[0], L, 5.5) === 0 && S.heSoThay(L[2], L, 6) === 1 && S.heSoThay(L[1], L, 9) === 1, 'lớp cùng nhóm thay nhau (không chồng nhãn), lớp không nhóm giữ nguyên');

console.log('4. Hai mẫu v99.1');
for (const [ten, theme] of [['koch_dao', 'deep_ocean'], ['gia_ve_parabol', 'emerald_studio']]) {
  const p = `out/v99_1/${ten}/props.json`;
  if (!fs.existsSync(p)) { console.log(`  (bỏ qua ${ten}: chạy chuanbi.py --gia-lap trước)`); continue; }
  const k = JSON.parse(fs.readFileSync(p, 'utf8')).khung4tang;
  kiem(k.theme === theme && N.layTheme(k.theme), `${ten}: theme ${theme}`);
  const m = [...N.mocDoiHinhV99(k), k.tongFrame / (k.fps || 30)].sort((x, y) => x - y);
  const lo = Math.max(...m.slice(1).map((x, i) => x - m[i]));
  kiem(lo <= 6.05, `${ten}: T2 không đứng hình > 6 s (dài nhất ${lo.toFixed(1)} s)`);
  const ketQua = (k.tuSinh?.lop || []).filter((l) => l.buoc === (k.buoc.length - 1));
  kiem(ketQua.length && ketQua.every((l) => l.t >= k.tCongBo - 0.01), `${ten}: lớp kết quả không trước câu chốt (${k.tCongBo}s)`);
  kiem((k.tuSinh?.lop || []).every((l, i, ds) => !i || ds[i - 1].t <= l.t), `${ten}: lớp tự sinh sắp theo thời gian`);
}

console.log('5. Outro giữ sân khấu tự sinh + nền theme');
const vid = fs.readFileSync('src/Video.tsx', 'utf8'), out = fs.readFileSync('src/khung4tang/OutroTomTat.tsx', 'utf8');
kiem(vid.includes('tuSinh={k.tuSinh || null}') && vid.includes('theme={k.theme}'), 'Video.tsx truyền tuSinh + theme vào OutroTomTat');
kiem(out.includes('<SanKhauTuSinh ts={tuSinh}') && out.includes('<NenKhiQuyen th={th}'), 'OutroTomTat dựng bước cuối SanKhauTuSinh + nền khí quyển');
kiem(!/textOverflow: 'ellipsis'}}><ChuTron s=\{d\.chien_thuat\} co=\{d\.chien_thuat\.length > 14 \? 28/.test(out), 'nhãn tóm tắt 3 hộp không còn cắt "..." (xuống 2 dòng)');
for (const ten of ['koch_dao', 'gia_ve_parabol']) {
  const p = `out/v99_1/${ten}/props.json`;
  if (!fs.existsSync(p)) continue;
  const tt = JSON.parse(fs.readFileSync(p, 'utf8')).khung4tang.tomTat || [];
  kiem(tt.length === 3 && tt.every((d) => d.chien_thuat.length <= 18 && d.cong_thuc), `${ten}: Outro 3 nhãn trọn (<= 18 ký tự) + đủ công thức`);
}

console.log('6. Khắc phục lỗi thị giác Việc 2 (Xác suất, Thực tế, Hình học 3D)');
// 6.1 Độc quyền sân khấu + chuyển lớp nối tiếp 5 khung không đè chữ
const tRa5 = 5 / 30;
kiem(
  S.heSoThay(L[0], L, 5 + tRa5 + 0.001, 30) === 0 &&
    Math.abs(S.mocVaoLop(L[2], L, 30) - (5 + tRa5)) < 1e-6 &&
    S.mocVaoLop(L[0], L, 30) === L[0].t,
  'SanKhauTuSinh: lớp cũ tắt hẳn trong 5 khung rồi lớp mới cùng nhóm mới vào (không đè chữ)',
);
const k4Src = fs.readFileSync('src/khung4tang/Khung4Tang.tsx', 'utf8');
const tsSrc = fs.readFileSync('src/sankhau2d/SanKhauTuSinh.tsx', 'utf8');
const t1Src = fs.readFileSync('src/khung4tang/TangTieuDe.tsx', 'utf8');
kiem(
  tsSrc.includes('const cong = ts.chiLopKichBan || coLopHopLe ? 0 : 1;') && k4Src.includes('loaiSanKhauT2 === \'ts\''),
  'T2 & Outro độc quyền 1 sân khấu: có tu_sinh_svg hợp lệ thì không render lớp tiến trình mặc định',
);
kiem(
  /justifyContent:\s*'flex-start'/.test(t1Src) && /paddingTop:\s*1[4-9]/.test(t1Src) && /gap:\s*1[4-9]/.test(t1Src),
  'TangTieuDe: căn từ trên xuống (flex-start + paddingTop/gap >= 14px) chống đè dòng Story Math',
);
// 6.2 Khử trùng thẻ trong cùng bước
const theLoc = T3.locTheTrungTrongBuoc([
  {loai: 'cong_thuc', dong: ['\\overline{A}: \\text{ cả 3 viên bi vàng}'], t: 15.48, tu_dong: true, moc: [15.63]},
  {loai: 'cong_thuc', dong: ['\\overline{A}: \\text{ cả 3 bi đều vàng}'], t: 15.5, moc: [15.65]},
]);
kiem(theLoc.length === 1 && theLoc[0].dong[0].includes('đều vàng') && theLoc[0].t === 15.48, 'TangTheGiai: khử trùng 2 thẻ cùng vế trái Ā trong cùng 1 bước');
// 6.3 Dọn dấu câu phụ đề
const pdSach = C.lamSachPhuDe('Suy ra P(A) bằng 1 - P(Ā), = 1 - 1/21,', false);
kiem(pdSach === 'Suy ra P(A) = 1 - P(Ā) = 1 - 1/21.', `Phụ đề dọn dấu phẩy trước "=" & cuối câu -> "${pdSach}"`);
// 6.4 Mở khóa đáp án trên thanh ĐỀ ở bước cuối
const dgMo = T4.boSungDoiDapAn(
  [{id: 'p', nhan: 'P(A) = ?'}],
  [{t: 37.2, nhan: 'Kết luận', tieu_de: 'Chốt', the: [{loai: 'cong_thuc', chot: true, dong: ['P(A) = 1 - \\dfrac{1}{21} = \\dfrac{20}{21}']}]}],
  37.2,
  '20/21',
);
kiem(dgMo[0]?.doi?.nhan === 'P(A) = 20/21' && dgMo[0]?.doi?.t === 37.2, `ThanhDe: tự mở khóa "P(A) = ?" -> "${dgMo[0]?.doi?.nhan}"`);
// 6.5 Dọn ký tự rác tiêu đề Intro + Outro nhãn không cụt + không khoảng trắng trước dấu phẩy
const td1 = B.lamSachTieuDeIntro('CHÓP TAM GIÁC ĐỀU ĐÁY: GÓC ?° VÀ KHOẢNG CÁCH A√?');
const td2 = B.lamSachTieuDeIntro('GÓC ?" VÀ KHOẢNG CÁCH A/?"');
const td3 = B.lamSachTieuDeIntro('TĂNG GIÁ CÀ PHÊ – CÓ LÃI HƠN?');
kiem(
  td1 === 'CHÓP TAM GIÁC ĐỀU ĐÁY: GÓC VÀ KHOẢNG CÁCH' && td2 === 'GÓC VÀ KHOẢNG CÁCH' && td3 === 'TĂNG GIÁ CÀ PHÊ – CÓ LÃI HƠN?',
  `IntroMocCau: dọn rác tiêu đề ("${td1}" | "${td2}") và giữ nguyên tiêu đề hợp lệ`,
);
kiem(
  OT.chuanNhanTomTat('Biến cố đối Ā (3') === 'Biến cố đối Ā' &&
    OT.chuanNhanTomTat('Hàm lợi nhuận bậc') === 'Hàm lợi nhuận' &&
    OT.chuanNhanTomTat('Khóa mặt phụ (SAM)') === 'Khóa mặt phụ (SAM)' &&
    OT.texDapAn('50 nghìn đồng , lãi 6,75 triệu') === '50 nghìn đồng, lãi 6{,}75 triệu',
  'OutroTomTat: bỏ cắt cụt ngoặc/từ treo và xóa khoảng trắng thừa trước dấu phẩy',
);
// 6.6 Hình học 3D: nhãn góc 45° cách mọi nhãn đỉnh & chấm đỉnh >= 28px
if (fs.existsSync('out/san-pham-mau/props_mau_1.json')) {
  const kg1 = JSON.parse(fs.readFileSync('out/san-pham-mau/props_mau_1.json', 'utf8')).khung4tang?.khongGian;
  if (kg1) {
    const cb1 = KG.chuanBi(kg1, 820, 642);
    const f54 = KG.veKhung(kg1, cb1, 54, 820, 642, {x0: 22, y0: 18, x1: 798, y1: 624});
    const g45 = f54.goc.find((g) => g.nhan);
    const kcMinNhan = g45 ? Math.min(...f54.nhan.filter((n) => n.op > 0.05).map((n) => Math.hypot(g45.nhan.x - n.x, g45.nhan.y - n.y))) : 0;
    const kcMinCham = g45 ? Math.min(...f54.cham.filter((c) => c.op > 0.05).map((c) => Math.hypot(g45.nhan.x - c.x, g45.nhan.y - c.y))) : 0;
    kiem(kcMinNhan >= 28 && kcMinCham >= 28, `SanKhauKhongGian: nhãn góc 45° cách nhãn đỉnh ${kcMinNhan.toFixed(1)}px & chấm đỉnh ${kcMinCham.toFixed(1)}px (>= 28px)`);
  }
}

console.log(`\nKẾT QUẢ: ${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
