// v93 — Test cảnh đối chiếu "Hình động ↔ Đồ thị ngưỡng" + bố cục Intro/Outro: node scripts/test_doi_chieu.mjs
// Kiểm: điểm tối ưu máy tự tính đúng (bìa 12 -> x = 2, V = 128; lon 512 -> r ≈ 4,34), dữ liệu sai MỌI kiểu -> null
// (tầng 2 lùi về 3D, không vẽ NaN), đổi màu theo ngưỡng, nhịp quét dừng ở tối ưu, tiêu đề intro ≤ 2 dòng vừa khung,
// các vùng Intro / Outro không chồng lên vùng mô hình 3D.
import {build} from 'esbuild';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {pathToFileURL} from 'url';

const nap = async (tep) => {
  const kq = await build({entryPoints: [path.resolve(tep)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error',
    external: ['react', 'remotion', 'katex'], jsx: 'automatic'});
  fs.mkdirSync('out', {recursive: true});
  const tam = path.join(path.resolve('out'), `doi_chieu_test_${process.pid}_${path.basename(tep)}.mjs`);
  fs.writeFileSync(tam, kq.outputFiles[0].text);
  const m = await import(pathToFileURL(tam).href);
  fs.unlinkSync(tam);
  return m;
};
const D = await nap('src/khung4tang/doi_chieu.ts');

let dat = 0, hong = 0;
const thu = (ten, dk, them = '') => {
  if (dk) dat++;
  else hong++;
  console.log(`${dk ? 'ĐẠT ' : 'HỎNG'} ${ten}${dk || !them ? '' : ' — ' + them}`);
};
const gan = (a, b, e = 0.01) => Math.abs(a - b) <= e;

const bia = D.docDoiChieu({ham: 'x*(12-2*x)^2', bien: 'x', ten_ham: 'V', mien: [0, 6], kieu: 'max', hinh: 'tam_bia', tham_so: {a: 12, b: 12}});
thu('bìa 12×12: x* = 2, V* = 128', bia && gan(bia.xTot, 2) && gan(bia.yTot, 128, 0.05), bia && `${bia.xTot} ${bia.yTot}`);
thu('bìa: hình tam_bia giữ nguyên (tham số dựng được)', bia && bia.hinh === 'tam_bia');
thu('mọi điểm mẫu hữu hạn, đủ dày', bia && bia.mau.length >= 150 && bia.mau.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));

const lon = D.docDoiChieu({ham: '2*pi*r^2+1024/r', bien: 'r', ten_ham: 'S', mien: [1.5, 9], kieu: 'min', toi_uu: 4.34, nguong: {gia_tri: 400, kieu: '<='}, hinh: 'mat_cat_tru', tham_so: {V: 512}});
thu('lon 512: r* ≈ 4,34, S* ≈ 354,2', lon && gan(lon.xTot, 4.335, 0.01) && gan(lon.yTot, 354.2, 0.2), lon && `${lon.xTot} ${lon.yTot}`);
thu('lon: ngưỡng đạt tại tối ưu, vượt ở r = 1,5', lon && D.datNguong(lon, lon.yTot) && !D.datNguong(lon, lon.f(1.6)));
thu('lon: trục y không bị đỉnh 2V/r ép dẹt (yMax < S(1,5))', lon && lon.yMax < lon.f(1.5));

// dữ liệu sai -> null (lùi về sân khấu 3D)
const sai = {
  'thiếu hàm': {mien: [0, 6]},
  'hàm có lệnh lạ': {ham: 'alert(1)', mien: [0, 6]},
  'hàm sai cú pháp': {ham: 'x*(12-', mien: [0, 6]},
  'miền ngược': {ham: 'x^2', mien: [6, 0]},
  'miền NaN': {ham: 'x^2', mien: ['a', 2]},
  'hàm hằng': {ham: '5', mien: [0, 6]},
  'hàm không xác định gần hết miền': {ham: 'sqrt(x-100)', mien: [0, 6]},
  'toi_uu AI ghi sai': {ham: 'x*(12-2*x)^2', mien: [0, 6], toi_uu: 3},
  'ngưỡng không phải số': {ham: 'x^2', mien: [-2, 2], kieu: 'min', nguong: {gia_tri: 'abc', kieu: '<='}},
  'ngưỡng sai kiểu so sánh': {ham: 'x^2', mien: [-2, 2], kieu: 'min', nguong: {gia_tri: 1, kieu: '<'}},
  'ngưỡng không đạt ngay tại tối ưu': {ham: 'x^2+5', mien: [-2, 2], kieu: 'min', nguong: {gia_tri: 1, kieu: '<='}},
  'ngưỡng không bao giờ bị vượt': {ham: 'x^2', mien: [-2, 2], kieu: 'min', nguong: {gia_tri: 100, kieu: '<='}},
  'biến tên dài': {ham: 'x^2', bien: 'xy', mien: [0, 1]},
  'không phải đối tượng': 'x^2',
};
for (const [ten, v] of Object.entries(sai)) thu(`sai -> null: ${ten}`, D.docDoiChieu(v) === null);

const hinhSai = D.docDoiChieu({ham: 'x*(12-2*x)^2', mien: [0, 6], hinh: 'tam_bia', tham_so: {a: 8}});
thu('tam_bia với miền vượt a/2 -> về thanh đo (vẫn vẽ đồ thị)', hinhSai && hinhSai.hinh === 'thanh');

// nhịp: quét a..b rồi dừng ở tối ưu
const n0 = D.nhipDoiChieu(bia, 0.2, 6), n1 = D.nhipDoiChieu(bia, 1.6, 6), n2 = D.nhipDoiChieu(bia, 5.9, 6);
thu('nhịp: đầu bước ở a, giữa đang quét, cuối dừng đúng x*', n0.x === 0 && n1.pha === 'quet' && n1.x > 0 && n2.pha === 'dung' && gan(n2.x, bia.xTot, 1e-9));
thu('nhịp bước ngắn (3,9 s) vẫn kịp dừng ở tối ưu', D.nhipDoiChieu(bia, 3.5, 3.9).pha === 'dung');
thu('số kiểu Việt', D.soViet(4.335) === '4,34' && D.soViet(128) === '128');

// bố cục intro / outro (hằng số, không render)
const src = fs.readFileSync('src/khung4tang/IntroMocCau.tsx', 'utf8');
const I = await nap('src/khung4tang/bo_cuc_v93.ts');
const dai = 'CẮT GÓC BAO NHIÊU ĐỂ HỘP CHỨA NHIỀU NHẤT?';
const d2 = I.haiDong(dai);
const co = I.coTieuDeIntro(d2);
thu('tiêu đề 44 ký tự -> 2 dòng, mỗi dòng vừa 952 px', d2.length === 2 && d2.every((x) => x.length * co * 0.68 <= 952), `${d2} @${co}`);
thu('tiêu đề 2 dòng không chạm vùng mô hình (236 + 220 <= 470 < INTRO_SAN.y)', 236 + Math.max(...[co * 1.04 * 2]) <= 456 && 470 + 44 < I.INTRO_SAN.y);
thu('hook + CTA nằm dưới vùng mô hình và trên 14% đáy TikTok', I.INTRO_SAN.y + I.INTRO_SAN.h + 182 + 96 <= 1650 && /INTRO_SAN\.y \+ INTRO_SAN\.h \+ 24/.test(src));
thu('thời lượng intro trong [3,6 ; 5] s', I.giayIntro({}, 60) === 5 && I.giayIntro({}, 9) === 3.6 && I.giayIntro(null, 60) === 0);
const V = I.VUNG_OUTRO;
thu('outro: đáp án | mô hình | 3 dòng | nút không chồng nhau, trên 14% đáy',
  V.dapAn.y + V.dapAn.h <= V.san.y && V.san.y + V.san.h <= V.dong.y && V.dong.y + 3 * V.dong.h + 2 * V.dong.cach <= V.nut.y && V.nut.y + 96 <= 1650);

// v95: nhịp THEO LỜI ĐỌC + huy hiệu đúng loại
{
  const tr = Array.from({length: 40}, (_, i) => D.nhipTheoLoi(bia, 0.2 + i * 0.2, 12, 8.5));
  thu('v95: trước mốc giải (8,5 s) điểm sáng chỉ dò, không bao giờ "đứng" ở tối ưu', tr.filter((_, i) => 0.2 + i * 0.2 < 8.5).every((n) => n.pha === 'quet'));
  thu('v95: từ mốc giải lướt 0,8 s rồi chốt đúng x* = 2', D.nhipTheoLoi(bia, 8.9, 12, 8.5).pha === 've' && D.nhipTheoLoi(bia, 9.4, 12, 8.5).pha === 'dung' && Math.abs(D.nhipTheoLoi(bia, 9.4, 12, 8.5).x - 2) < 1e-6);
  thu('v95: không có mốc giải -> nhịp cũ v93', D.nhipTheoLoi(bia, 5.9, 6).pha === D.nhipDoiChieu(bia, 5.9, 6).pha);
  thu('v95: bài cực trị thuần -> ★ CỰC ĐẠI khi chốt, ĐANG DÒ khi quét', D.chuHuyHieu(bia, 128, 'dung', true).chu === '★ CỰC ĐẠI' && D.chuHuyHieu(bia, 50, 'quet', false).chu === 'ĐANG DÒ');
  thu('v95: bài có ngưỡng -> ✓ ĐẠT CHUẨN / ✕ VƯỢT NGƯỠNG', D.chuHuyHieu(lon, 354, 'dung', true).chu === '✓ ĐẠT CHUẨN' && D.chuHuyHieu(lon, 600, 'quet', false).chu === '✕ VƯỢT NGƯỠNG');
}

console.log(`\n${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
