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

const nap = async (vao) => {
  const kq = await build({entryPoints: [path.resolve(vao)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error', external: ['react', 'remotion', 'katex']});
  fs.mkdirSync('out', {recursive: true});
  const tep = path.join(path.resolve('out'), `v991_${path.basename(vao)}_${process.pid}.mjs`);
  fs.writeFileSync(tep, kq.outputFiles[0].text);
  const m = await import(pathToFileURL(tep).href);
  fs.unlinkSync(tep);
  return m;
};
const N = await nap('src/khung4tang/nen_v99.ts');
const S = await nap('src/sankhau2d/SanKhauTuSinh.tsx');
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

console.log(`\nKẾT QUẢ: ${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
