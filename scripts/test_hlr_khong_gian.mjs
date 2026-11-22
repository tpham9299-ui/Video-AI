// v97 — Test NÉT KHUẤT GIẢI TÍCH (src/khonggian/hlr.ts): node scripts/test_hlr_khong_gian.mjs
// So với chân lý "bắn tia lấy mẫu dày tới mọi mặt" trên lưới góc máy 24 x 6; cạnh trong khối (SO, AC, BD), cạnh đâm xuyên,
// cạnh nửa liền nửa đứt đổi mượt khi xoay; tách lớp sau mặt kính; tất định (không trạng thái) và chống nhấp nháy sát ngưỡng.
import {build} from 'esbuild';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {execFileSync} from 'child_process';
import {pathToFileURL} from 'url';

const kq = await build({entryPoints: [path.resolve('src/khonggian/index.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error'});
const tep = path.join(os.tmpdir(), `khonggian_hlr_${process.pid}.mjs`);
fs.writeFileSync(tep, kq.outputFiles[0].text);
const E = await import(pathToFileURL(tep).href);
fs.unlinkSync(tep);

let dat = 0, hong = 0;
const thu = (ten, dk, them = '') => {
  if (dk) dat++;
  else hong++;
  if (!dk) console.log(`HỎNG ${ten}${them ? ' — ' + them : ''}`);
};
const py = process.platform === 'win32' ? 'python' : 'python3';
const giai = (tep) => JSON.parse(execFileSync(py, ['scripts/giai_hinh_khong_gian.py', '-', '--chi-kiem'].slice(0, 1).concat([tep, '--ra', path.join(os.tmpdir(), 'kg_' + path.basename(tep))]), {env: {...process.env, PYTHONIOENCODING: 'utf-8'}}) && fs.readFileSync(path.join(os.tmpdir(), 'kg_' + path.basename(tep)), 'utf8'));
const G1 = giai('mau/v97/giao_diem_mnp.json'), G2 = giai('mau/v97/vuong_goc_sa.json');
const W = 950, H = 883;

function soVoiChuan(dung, C, R, ten) {
  const vo = E.matVo(dung.diem, dung.khoi.mat);
  const truoc = E.phanLoaiMat(vo, C, null);
  let saiMax = 0, chi = '';
  for (const x of dung.doan) {
    const P = dung.diem[x.a], Q = dung.diem[x.b];
    const manh = E.tachDoan({id: x.id, a: P, b: Q, vai: x.vai}, C, vo, truoc, [], R);
    const N = 600;
    const chuan = E.khuatMauDay(P, Q, C, vo, N);
    let sai = 0;
    const bien = manh.map((m) => m.u1);
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N;
      if (bien.some((b) => Math.abs(b - u) < 1.5 / N)) continue; // sát điểm đổi trạng thái: bỏ qua sai số lấy mẫu
      const m = manh.find((m) => m.u0 <= u && u <= m.u1);
      if (!m || m.khuat !== chuan[i]) sai++;
    }
    // cạnh nằm trên mặt sượt tia (|n·v| < 0,035) được phép theo luật chống nhấp nháy -> chỉ tính sai khi mặt không sượt
    if (sai > saiMax) { saiMax = sai; chi = x.id; }
  }
  return {saiMax, chi};
}

for (const [ten, G] of [['mẫu 1', G1], ['mẫu 2', G2]]) {
  const kg = {phienBan: 1, dung: G.dung, xoay: []};
  const bc = E.boiCanh(kg, W, H);
  let tong = 0, loi = [];
  for (let n = 0; n < 360; n += 15) for (const c of [-20, 5, 20, 40, 64, 85]) {
    const m = {n, c, muc: bc.muc, R: bc.R, k: 100, ox: 0, oy: 0};
    const C = E.heMay(m).viTri;
    const vo = bc.vo;
    // bỏ góc mà có mặt sượt tia (luật chống nhấp nháy cố ý khác chân lý tức thời ở đúng ngưỡng)
    if (vo.some((f) => Math.abs(E.doTruoc(f, C)) < E.NGUONG_SUOT)) continue;
    const r = soVoiChuan(G.dung, C, bc.R);
    tong++;
    if (r.saiMax > 0) loi.push(`n=${n} c=${c} ${r.chi}:${r.saiMax}`);
  }
  thu(`${ten}: nét liền/đứt giải tích khớp bắn tia dày trên ${tong} góc máy`, loi.length === 0 && tong > 100, loi.slice(0, 5).join('; '));
}

// cạnh trong lòng khối luôn đứt; cạnh đáy sau đứt; chóp nhìn chuẩn: đúng 3 cạnh khuất (AD, DC, SD) ở mẫu 2
{
  const kg = {phienBan: 1, dung: G2.dung, xoay: []};
  const bc = E.boiCanh(kg, W, H);
  const C = E.heMay({n: 28, c: 22, muc: bc.muc, R: bc.R, k: 100, ox: 0, oy: 0}).viTri;
  const truoc = E.phanLoaiMat(bc.vo, C, null);
  const trang = (id) => {
    const x = G2.dung.doan.find((d) => d.id === id);
    return E.tachDoan({id, a: G2.dung.diem[x.a], b: G2.dung.diem[x.b], vai: x.vai}, C, bc.vo, truoc, [], bc.R);
  };
  thu('AC, BD (trong đáy, nhìn từ trên) là nét đứt trọn', ['AC', 'BD'].every((id) => trang(id).every((m) => m.khuat)));
  const khoiKhuat = G2.dung.doan.filter((d) => d.vai === 'khoi' && trang(d.id).every((m) => m.khuat)).map((d) => d.id).sort();
  thu('góc 3/4 SGK: cạnh khuất = AD, CD, DS', JSON.stringify(khoiKhuat) === JSON.stringify(['CD', 'DA', 'DS']), khoiKhuat.join(','));
  const ah = trang('AH');
  thu('AH (nằm trên mặt trước SAB) nét liền', ah.every((m) => !m.khuat));
}

// đoạn xuyên khối: liền -> đứt -> liền (nửa liền nửa đứt) và đổi MƯỢT theo khung khi xoay
{
  const kg = {phienBan: 1, dung: G1.dung, xoay: []};
  const bc = E.boiCanh(kg, W, H);
  const P = [-3, -0.2, 0.9], Q = [3, 0.6, 0.9];
  const C = E.heMay({n: 28, c: 22, muc: bc.muc, R: bc.R, k: 100, ox: 0, oy: 0}).viTri;
  const truoc = E.phanLoaiMat(bc.vo, C, null);
  const m = E.tachDoan({id: 'x', a: P, b: Q, vai: 'phu'}, C, bc.vo, truoc, [], bc.R);
  thu('đoạn xuyên khối tách liền / đứt / liền', m.length === 3 && !m[0].khuat && m[1].khuat && !m[2].khuat, JSON.stringify(m.map((x) => [x.u0.toFixed(3), x.u1.toFixed(3), x.khuat])));
  // khi xoay 30 khung, phần đứt co / giãn liên tục (biên đổi < 0,08 tham số mỗi khung)
  let truocDo = null, nhay = 0;
  for (let f = 0; f <= 30; f++) {
    const n = 28 + (120 * f) / 30;
    const Cf = E.heMay({n, c: 22, muc: bc.muc, R: bc.R, k: 100, ox: 0, oy: 0}).viTri;
    const mf = E.tachDoan({id: 'x', a: P, b: Q, vai: 'phu'}, Cf, bc.vo, E.phanLoaiMat(bc.vo, Cf, null), [], bc.R);
    const dut = mf.filter((x) => x.khuat).reduce((s, x) => s + x.u1 - x.u0, 0);
    const chuan = E.khuatMauDay(P, Q, Cf, bc.vo, 400).filter((x) => x).length / 400;
    if (Math.abs(dut - chuan) > 0.006) nhay++;
    truocDo = dut;
  }
  thu('xoay 120° trong 30 khung: phần đứt mỗi khung khớp chân lý (đổi mượt theo máy)', nhay === 0, 'lệch ' + nhay + ' khung');
}

// mặt kính bán trong suốt: KHÔNG biến cạnh sau nó thành nét đứt, chỉ đánh dấu "sau kính"; nét nằm trên kính không bị tính sau
{
  const kg = {phienBan: 1, dung: G1.dung, xoay: [], hien: {}};
  const bc = E.boiCanh(kg, W, H);
  const C = E.heMay({n: 28, c: 22, muc: bc.muc, R: bc.R, k: 100, ox: 0, oy: 0}).viTri;
  const truoc = E.phanLoaiMat(bc.vo, C, null);
  const k = G1.dung.kinh[0];
  const n = (() => { const [a, b, c] = k.da_giac; const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; const x = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const l = Math.hypot(...x); return x.map((y) => y / l); })();
  const kinh = [{id: k.id, p: k.bung, n, op: 0.3, bung: true}];
  let khuatVoi = 0, khuatKhong = 0, sau = 0;
  for (const x of G1.dung.doan) {
    const a = E.tachDoan({id: x.id, a: G1.dung.diem[x.a], b: G1.dung.diem[x.b], vai: x.vai}, C, bc.vo, truoc, kinh, bc.R);
    const b = E.tachDoan({id: x.id, a: G1.dung.diem[x.a], b: G1.dung.diem[x.b], vai: x.vai}, C, bc.vo, truoc, [], bc.R);
    khuatVoi += a.filter((m) => m.khuat).reduce((s, m) => s + m.u1 - m.u0, 0);
    khuatKhong += b.filter((m) => m.khuat).reduce((s, m) => s + m.u1 - m.u0, 0);
    sau += a.filter((m) => m.sauKinh).length;
  }
  thu('mặt kính không làm thêm nét đứt', Math.abs(khuatVoi - khuatKhong) < 1e-9);
  thu('có nét được tách lớp "sau kính"', sau > 0);
  const np = G1.dung.doan.find((d) => d.id === 'NP');
  const mNP = E.tachDoan({id: 'NP', a: G1.dung.diem.N, b: G1.dung.diem.P, vai: 'phu'}, C, bc.vo, truoc, kinh, bc.R);
  thu('NP nằm trên (MNP) không bị tính sau kính', np && mNP.every((m) => !m.sauKinh));
}

// tất định + không trạng thái: cùng t ra cùng kết quả bất kể thứ tự gọi
{
  const kg = {phienBan: 1, dung: G1.dung, tongGiay: 20, xoay: [{t: 3, d: 1.05, goc_nhin: 'nhin_day'}, {t: 8, d: 1.05, goc_nhin: 'ep_mep_mat', doi_tuong: ['M', 'N', 'P']}]};
  const cb = E.chuanBi(kg, W, H);
  const vung = {x0: 43, y0: 4, x1: 942, y1: 644};
  const a = JSON.stringify(E.veKhung(kg, cb, 8.6, W, H, vung));
  for (const t of [19, 0.2, 3.4, 12]) E.veKhung(kg, cb, t, W, H, vung);
  const cb2 = E.chuanBi(kg, W, H);
  const b = JSON.stringify(E.veKhung(kg, cb2, 8.6, W, H, vung));
  thu('tất định: cùng t -> khung giống hệt (không cache giữa khung)', a === b);
}

// chống nhấp nháy: máy khóa ở tư thế có mặt gần sượt (|n·v| sát 0,035) và nhiễu ±0,4° -> phân loại mặt không đổi
{
  const kg = {phienBan: 1, dung: G2.dung, xoay: []};
  const bc = E.boiCanh(kg, W, H);
  // tìm góc ngang làm mặt SAB sượt (pháp tuyến SAB = -y): n quanh 90°
  const f = bc.vo.find((x) => x.ten.includes('S') && x.ten.includes('A') && x.ten.includes('B'));
  let nSuot = 0, best = 9;
  for (let n = 60; n < 120; n += 0.05) {
    const s = Math.abs(E.doTruoc(f, E.heMay({n, c: 22, muc: bc.muc, R: bc.R, k: 1, ox: 0, oy: 0}).viTri));
    if (s < best) { best = s; nSuot = n; }
  }
  const on = E.heMay({n: nSuot - 6, c: 22, muc: bc.muc, R: bc.R, k: 1, ox: 0, oy: 0}).viTri;
  const ket = new Set();
  for (let d = -0.4; d <= 0.4; d += 0.05) {
    const C = E.heMay({n: nSuot + d, c: 22, muc: bc.muc, R: bc.R, k: 1, ox: 0, oy: 0}).viTri;
    ket.add(JSON.stringify(E.phanLoaiMat(bc.vo, C, on)));
  }
  thu('mặt sượt tia: phân loại lấy theo tư thế ổn định (không chớp khi nhiễu ±0,4°)', ket.size === 1, 'số trạng thái ' + ket.size);
  const ketTucThoi = new Set();
  for (let d = -0.4; d <= 0.4; d += 0.05) ketTucThoi.add(JSON.stringify(E.phanLoaiMat(bc.vo, E.heMay({n: nSuot + d, c: 22, muc: bc.muc, R: bc.R, k: 1, ox: 0, oy: 0}).viTri, null)));
  thu('(đối chứng) không có luật ổn định thì phân loại có chớp', ketTucThoi.size > 1);
}

console.log(`test_hlr_khong_gian: ${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
