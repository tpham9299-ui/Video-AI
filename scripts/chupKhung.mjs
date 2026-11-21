// Chụp nhanh nhiều khung hình (để xem thử giao diện mà không dựng cả video).
// node scripts/chupKhung.mjs public/props.json thu_muc_ra 30,120,400 [chrome]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'fs';
import path from 'path';
const [propsTep, ra, dsKhung, chrome] = process.argv.slice(2);
const inputProps = JSON.parse(fs.readFileSync(propsTep, 'utf8'));
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
const opt = chrome ? {browserExecutable: chrome} : {};
// cảnh Three.js (moiTruong / phongCanh) cần WebGL phần mềm như khi dựng thật (dung_khuc.mjs)
if (inputProps.phongCanh || inputProps.canh.some((c) => c.moiTruong)) opt.chromiumOptions = {gl: 'swangle'};
const comp = await selectComposition({serveUrl, id: 'Video', inputProps, ...opt});
fs.mkdirSync(ra, {recursive: true});
for (const f of dsKhung.split(',').map(Number)) {
  await renderStill({composition: comp, serveUrl, output: path.join(ra, `k${String(f).padStart(5, '0')}.png`), frame: f, inputProps, scale: 0.5, ...opt});
  console.log('khung', f);
}
