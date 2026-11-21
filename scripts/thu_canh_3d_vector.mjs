// v90 — Dựng thử khung 4 tầng + sân khấu 3D Vector từ tệp mẫu (không cần kịch bản/giọng đọc).
//   node scripts/thu_canh_3d_vector.mjs mau/canh3dv_A_oxyz.json [mau/...json] [--clip] [--khung 20,60]
// Ảnh: out/canh3dv/<tên>/kNNNNN.png (theo "_khung_thu" của mẫu). --clip: thêm out/canh3dv/<tên>.mp4 (toàn bộ tongFrame).
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const clip = args.includes('--clip');
const iK = args.indexOf('--khung');
const khungRieng = iK >= 0 ? args[iK + 1].split(',').map(Number) : null;
const tep = args.filter((a, i) => a.endsWith('.json') && args[i - 1] !== '--khung');
if (!tep.length) {
  console.error('Cách dùng: node scripts/thu_canh_3d_vector.mjs mau/canh3dv_B_cau_4cap.json [--clip] [--khung 20,60]');
  process.exit(1);
}
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
for (const t of tep) {
  const inputProps = JSON.parse(fs.readFileSync(t, 'utf8'));
  const ten = path.basename(t, '.json');
  const ra = path.join('out', 'canh3dv', ten);
  fs.mkdirSync(ra, {recursive: true});
  const comp = await selectComposition({serveUrl, id: 'Khung4Tang', inputProps});
  const t0 = Date.now();
  for (const f of khungRieng || inputProps._khung_thu || [30]) {
    await renderStill({composition: comp, serveUrl, output: path.join(ra, `k${String(f).padStart(5, '0')}.png`), frame: f, inputProps});
    console.log(`${ten}: khung ${f}`);
  }
  console.log(`${ten}: ảnh xong sau ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (clip) {
    const t1 = Date.now();
    await renderMedia({composition: comp, serveUrl, codec: 'h264', outputLocation: path.join('out', 'canh3dv', `${ten}.mp4`), inputProps, crf: 18});
    console.log(`${ten}: clip ${comp.durationInFrames} khung xong sau ${((Date.now() - t1) / 1000).toFixed(1)} s`);
  }
}
