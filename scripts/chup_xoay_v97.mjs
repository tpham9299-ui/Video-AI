// v97 — Dải ảnh kiểm chứng ĐỔI NÉT GIỮA MỘT CÚ XOAY: chụp 4 mốc 0% -> 35% -> 70% -> 100% của cú xoay thứ k (mặc định k = 2)
// node scripts/chup_xoay_v97.mjs out/v97/giao_diem_mnp/props.json out/v97/xoay_frame [k]
// Ghi k_<phantram>.png (cả khung, scale 1) + trang_thai.json (từng cạnh: chuỗi L/D theo tham số tại mỗi mốc, tính bằng veKhung).
import {build} from 'esbuild';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {pathToFileURL} from 'url';

const [propsTep, ra, kArg] = process.argv.slice(2);
const k = Number(kArg || 2);
const P = JSON.parse(fs.readFileSync(propsTep, 'utf8'));
const kg = P.khung4tang.khongGian;
const kq = await build({entryPoints: [path.resolve('src/khonggian/index.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error'});
const tep = path.join(os.tmpdir(), `kg_xoay_${process.pid}.mjs`);
fs.writeFileSync(tep, kq.outputFiles[0].text);
const E = await import(pathToFileURL(tep).href);
fs.unlinkSync(tep);
const W = 950, H = 883; // v97 tối giản: tầng 2 tràn viền 16 %..62 %
const cb = E.chuanBi(kg, W, H);
const x = cb.lich.moc[k - 1];
if (!x) throw new Error('không có cú xoay thứ ' + k);
const fps = P.fps || 30;
const MOC = [0, 0.35, 0.7, 1];
// mốc theo TIẾN ĐỘ GÓC đã làm mềm (u = emXoay(thời gian)): tìm thời điểm có u đúng 0/35/70/100 %
const tTai = (u) => {
  if (u <= 0) return x.t0;
  if (u >= 1) return x.t1;
  let lo = x.t0, hi = x.t1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (E.emXoay((m - x.t0) / (x.t1 - x.t0)) < u) lo = m; else hi = m; }
  return (lo + hi) / 2;
};
const khung = MOC.map((u) => Math.round(tTai(u) * fps));
const trang = {};
MOC.forEach((u, i) => {
  const f = E.veKhung(kg, cb, khung[i] / fps, W, H, {x0: 46, y0: 6, x1: W - 8, y1: H - 6});
  const theoId = new Map();
  for (const m of f.manh) theoId.set(m.id, [...(theoId.get(m.id) || []), m]);
  for (const [id, ds] of theoId) {
    let s = '';
    for (let j = 0; j < 20; j++) { const uu = (j + 0.5) / 20; const p = ds.find((m) => m.u0 <= uu && uu <= m.u1); s += p ? (p.khuat ? 'D' : 'L') : '.'; }
    (trang[id] = trang[id] || [])[i] = s;
  }
});
fs.mkdirSync(ra, {recursive: true});
fs.writeFileSync(path.join(ra, 'trang_thai.json'), JSON.stringify({cu_xoay: x.che_do, doi: x.doi, t0: x.t0, t1: x.t1, khung, moc: MOC, canh: trang}, null, 1));
// cạnh đổi nét rõ nhất: đứt trọn -> lẫn -> liền trọn (hoặc ngược lại)
const doi = Object.entries(trang).filter(([, v]) => v.length === 4 && v[0] && v[3] && v[0] !== v[3]).map(([id, v]) => `${id}: ${v.join(' -> ')}`);
console.log(`Cú xoay ${k} (${x.che_do} ${x.doi.join('')}) ${x.t0.toFixed(2)}-${x.t1.toFixed(2)} s, khung ${khung.join(', ')}`);
console.log('Cạnh đổi nét:\n  ' + doi.join('\n  '));
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
const comp = await selectComposition({serveUrl, id: 'Video', inputProps: P});
for (let i = 0; i < khung.length; i++) {
  await renderStill({composition: comp, serveUrl, output: path.join(ra, `k_${String(Math.round(MOC[i] * 100)).padStart(3, '0')}.png`), frame: khung[i], inputProps: P, scale: 1});
  console.log('chụp', MOC[i] * 100 + '%', 'khung', khung[i]);
}
