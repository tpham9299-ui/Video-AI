// v98 — Test Đợt 1 (căn giữa + 3 lỗi thực chiến) phía Remotion: node scripts/test_v98.mjs
//  - khung đối xứng: mọi tầng / Intro / Outro / phụ đề lề trái = lề phải = 130 px (tâm 540);
//  - chiều cao phân số: \frac lồng \frac được cấp đủ chỗ (không cắt nửa tử / mẫu), thẻ một mình quá cao thì co chữ;
//  - chống đứng hình THẬT: mọi mốc đổi hình (pha + hiện nhóm + sóng quét) của 4 mẫu v96 cách nhau <= 4 s;
//  - không lộ đáp án: thanh ĐỀ của mẫu tái hiện lỗi (AI ghi sẵn "x = 5") hiện "x = ?" tới đúng mốc chốt.
import {build} from 'esbuild';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {execFileSync} from 'child_process';
import {pathToFileURL} from 'url';

const nap = async (vao) => {
  const kq = await build({entryPoints: [path.resolve(vao)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error', external: ['react', 'remotion', 'katex']});
  const tep = path.join(os.tmpdir(), `v98_${path.basename(vao)}_${process.pid}.mjs`);
  fs.writeFileSync(tep, kq.outputFiles[0].text);
  const m = await import(pathToFileURL(tep).href);
  fs.unlinkSync(tep);
  return m;
};
const V = await nap('src/khung4tang/vung.ts');
const B = await nap('src/khung4tang/bo_cuc_v93.ts');
const T = await nap('src/khung4tang/do_tex.ts');
const C = await nap('src/sankhau2d/chung.ts');

let dat = 0, hong = 0;
const thu = (ten, dk, them = '') => {
  if (dk) dat++;
  else hong++;
  console.log(`${dk ? 'ĐẠT ' : 'HỎNG'} ${ten}${dk || !them ? '' : ' — ' + them}`);
};

console.log('— Căn giữa đối xứng');
const bc = V.boCuc4Tang(true);
thu('tầng: left 130, rộng 820, tâm 540', bc.le === 130 && bc.rong === 820 && bc.le + bc.rong / 2 === 540 && V.TAM_X === 540);
thu('Intro/Outro: khung 130..950', B.LE_ND_V93 === 130 && B.LE_ND_V93 + B.RONG_ND_V93 === 950);
const k4 = fs.readFileSync('src/khung4tang/Khung4Tang.tsx', 'utf8');
thu('Khung4Tang: 4 tầng đặt left = bc.le, phụ đề left = LE_ND', (k4.match(/le=\{bc\.le\}/g) || []).length === 4 && /data-vung="phu_de" style=\{\{position: 'absolute', left: LE_ND, width: RONG_ND/.test(k4));
const t3 = fs.readFileSync('src/khung4tang/TangTheGiai.tsx', 'utf8');
thu('T3: công thức căn giữa (không còn can="trai"), tiêu đề thẻ căn giữa', !/can="trai"/.test(t3) && /can="giua"/.test(t3) && (t3.match(/justifyContent: 'center', gap: 12/g) || []).length >= 2);
const td = fs.readFileSync('src/sankhau2d/TuDuyDaiSo.tsx', 'utf8');
thu('Tư duy đại số: dòng biến đổi căn giữa + dữ kiện căn giữa', /can="giua"/.test(td) && !/can="trai"/.test(td) && /flexWrap: 'nowrap', overflow: 'hidden', justifyContent: 'center'/.test(td));
thu('sân khấu 2D: lề trong đối xứng (trái = phải)', C.LE.trai === C.LE.phai);

console.log('— Phân số không bị cắt');
thu('độ sâu: a+b = 0, \\frac = 1, \\frac lồng = 2, \\dfrac = 1,25', T.doSauPhanSo('a+b') === 0 && T.doSauPhanSo('\\frac{a}{b}') === 1 && T.doSauPhanSo('\\frac{\\frac{1}{2}}{3}') === 2 && T.doSauPhanSo('\\dfrac{1}{2}') === 1.25);
const h1 = T.caoDongTex('x = 2', 42), h2 = T.caoDongTex('\\frac{a}{b}', 42), h3 = T.caoDongTex('\\frac{\\frac{1}{x}+1}{\\frac{2}{x}-1}', 42);
thu(`chiều cao tăng theo tầng phân số (${h1} < ${h2} < ${h3}); 2 tầng >= 2,9 em`, h1 < h2 && h2 < h3 && h3 >= 42 * 2.9);
const co = T.coVuaCao(['\\frac{\\frac{1}{x}+1}{\\frac{2}{x}-1} = \\frac{3}{4}', '\\frac{x+1}{2-x} = \\frac{3}{4}', 'x = \\frac{2}{7}'], 42, 380 - 84, 10, 28);
thu(`thẻ 3 dòng phân số tầng: co chữ còn ${co} px để vừa T3`, co < 42 && co >= 28);
const vua = fs.readFileSync('src/vua.ts', 'utf8');
thu('Toan maxHeight: lớp chặn cuối co theo chiều cao (vua.ts)', /export function khopVua\(el: HTMLElement, maxWidth: number, maxHeight\?: number\)/.test(vua));

console.log('— Chống đứng hình thật (<= 4 s)');
const py = process.platform === 'win32' ? 'python' : 'python3';
for (const [ten, mau] of [['bayes', 'mau/v96/bayes_xet_nghiem.json'], ['thuc_te_2d', 'mau/v96/loi_nhuan_tra_sua.json'], ['dai_so', 'mau/v96/dai_so_chi_dao.json'], ['vd_153504', 'mau/v96/vd_153504.json']]) {
  const ra = `out/v98/${ten}/props.json`;
  if (!fs.existsSync(ra)) execFileSync(py, ['scripts/chuanbi.py', mau, '--gia-lap', '--props-ra', ra], {env: {...process.env, PYTHONIOENCODING: 'utf-8'}, stdio: 'pipe'});
  const p = JSON.parse(fs.readFileSync(ra, 'utf8'));
  const sk = p.khung4tang.sanKhau;
  const tong = p.khung4tang.tongFrame / 30;
  const moc = [0, ...C.mocDoiHinh(sk), tong].filter((x) => x <= tong).sort((a, b) => a - b);
  const ho = Math.max(...moc.slice(1).map((x, i) => x - moc[i]));
  thu(`${ten} (${sk.loai}): khoảng không đổi hình dài nhất ${ho.toFixed(2)} s <= 4 s`, ho <= 4.0001);
  if (sk.loai === 'tu_duy_dai_so') {
    const l = C.lichTuDuy(sk);
    thu('tư duy: cảnh mở "x = ?" tắt <= 2,6 s, khung chuỗi suy luận hiện ngay ở Bước 1', l.tHeroRa <= 2.6 && l.tKhung[0] < (sk.pha.find((q) => q.ten === 'nut_1')?.t ?? 99));
  }
  if (sk.loai === 'rut_mau') {
    const t0 = sk.pha.find((q) => q.ten === 'hien')?.t ?? 0.3;
    const n = Math.max(3, Math.ceil(sk.phan_tu.length / 3));
    const tCuoi = C.tHienNhom(sk.phan_tu.length - 1, t0, n);
    thu(`rút thẻ: ${sk.phan_tu.length} thẻ hiện theo nhóm, nhóm cuối ở ${tCuoi.toFixed(1)} s (< 3 s)`, tCuoi > t0 + 0.7 && tCuoi < 3);
    thu('sóng quét: có tại mốc nhịp, nhấc lần lượt từng thẻ', C.songQuet([5], 5.5) !== null && C.songQuet([5], 7) === null && C.nhacSong(0.4, 3, 10) > 0.5 && C.nhacSong(0.4, 8, 10) === 0);
  }
}

console.log('— Không lộ đáp án');
const pl = JSON.parse(fs.readFileSync('out/v98/lo_dap_an/props.json', 'utf8'));
const o = pl.khung4tang.deGhim.find((d) => d.id === 'x');
const tToiUu = pl.khung4tang.sanKhau.pha.find((q) => q.ten === 'toi_uu').t;
thu('ô ghim AI ghi sẵn "x = 5" -> "x = ?" và chỉ đổi sang "x = 5" sau mốc chốt nghiệm', o.nhan === 'x = ?' && o.doi && o.doi.nhan === 'x = 5' && o.doi.t > tToiUu, JSON.stringify(o));

console.log(`\ntest_v98: ${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
