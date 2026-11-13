// DỰNG SONG SONG - ghép các khúc do dung_khuc.mjs dựng thành video hoàn chỉnh (không mã hóa lại hình => vài giây).
// Cách dùng: node scripts/ghep_khuc.mjs <thư mục chứa khuc_*.ts/.aac/.json> <tệp mp4 ra>
import {combineChunks} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [thuMuc, ra] = process.argv.slice(2);
if (!thuMuc || !ra) {
  console.error('Cách dùng: node scripts/ghep_khuc.mjs <thư mục khúc> <ra.mp4>');
  process.exit(2);
}
const meta = fs.readdirSync(thuMuc).filter((f) => /^khuc_\d+\.json$/.test(f))
  .map((f) => JSON.parse(fs.readFileSync(path.join(thuMuc, f), 'utf8')))
  .sort((a, b) => a.i - b.i);
if (!meta.length) throw new Error('Không thấy khúc nào trong ' + thuMuc);
const {n, tong, moiKhuc, fps} = meta[0];
// kiểm tra đủ khúc, liền nhau, phủ hết video - thiếu một khúc là báo lỗi ngay (không ghép ra video hụt đoạn)
let ke = 0;
for (const m of meta) {
  if (m.dau !== ke) throw new Error(`Thiếu khung ${ke}-${m.dau - 1} (khúc trước khúc ${m.i} bị thiếu)`);
  ke = m.cuoi + 1;
}
if (ke !== tong) throw new Error(`Các khúc chỉ phủ tới khung ${ke - 1}/${tong - 1}`);
const videoFiles = meta.map((m) => path.join(thuMuc, `khuc_${m.i}.ts`));
const audioFiles = meta.map((m) => path.join(thuMuc, `khuc_${m.i}.aac`));
[...videoFiles, ...audioFiles].forEach((f) => {
  if (!fs.existsSync(f)) throw new Error('Thiếu tệp ' + f);
});
const bd = Date.now();
await combineChunks({
  outputLocation: ra,
  videoFiles,
  audioFiles,
  codec: 'h264',
  audioCodec: 'aac',
  fps,
  framesPerChunk: moiKhuc,
  compositionDurationInFrames: tong,
  preferLossless: false,
});
console.log(`Đã ghép ${meta.length}/${n} khúc -> ${ra} (${tong} khung, ${Math.round((Date.now() - bd) / 1000)} giây)`);
