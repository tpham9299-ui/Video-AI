// DỰNG SONG SONG - dựng MỘT KHÚC của video (mỗi máy GitHub dựng một khúc, cuối cùng ghép lại bằng ghep_khuc.mjs).
// Cách dùng: node scripts/dung_khuc.mjs <thư mục bundle> <props.json> <khúc thứ i (0..n-1)> <số khúc n> <thư mục ra>
// Ra: <thư mục ra>/khuc_<i>.ts (hình, H.264 MPEG-TS ghép nối liền byte) + khuc_<i>.aac (tiếng, căn theo khung AAC
// để ghép không bị "tách"/hụt tiếng ở chỗ nối) - đúng cơ chế Remotion Lambda dùng (forSeamlessAacConcatenation).
import {renderMedia, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [bundleDir, propsTep, iStr, nStr, ra] = process.argv.slice(2);
if (!bundleDir || !propsTep || iStr === undefined || !nStr || !ra) {
  console.error('Cách dùng: node scripts/dung_khuc.mjs <bundle> <props.json> <i> <n> <ra>');
  process.exit(2);
}
const i = Number(iStr), n = Number(nStr);
const inputProps = JSON.parse(fs.readFileSync(propsTep, 'utf8'));
const serveUrl = path.resolve(bundleDir);
const browserExecutable = process.env.TRINH_DUYET || null;   // để trống: Remotion tự tải Chrome Headless Shell
const comp = await selectComposition({serveUrl, id: 'Video', inputProps, browserExecutable});
const tong = comp.durationInFrames;
const moiKhuc = Math.ceil(tong / n);
const dau = i * moiKhuc;
const cuoi = Math.min(tong - 1, dau + moiKhuc - 1);
if (dau > cuoi) {
  console.log(`Khúc ${i}: không có khung hình nào (video ${tong} khung), bỏ qua`);
  process.exit(0);
}
fs.mkdirSync(ra, {recursive: true});
const soLuong = Number(process.env.SO_LUONG_DUNG) || os.cpus().length;
const bd = Date.now();
let lanIn = -1;
console.log(`Khúc ${i + 1}/${n}: khung ${dau}-${cuoi} / ${tong} (${soLuong} luồng)`);
await renderMedia({
  serveUrl,
  composition: comp,
  inputProps,
  codec: 'h264-ts',
  audioCodec: 'aac',
  frameRange: [dau, cuoi],
  compositionStart: 0,
  forSeamlessAacConcatenation: true,
  enforceAudioTrack: true,   // khúc im lặng vẫn có rãnh tiếng để ghép
  separateAudioTo: path.join(ra, `khuc_${i}.aac`),
  outputLocation: path.join(ra, `khuc_${i}.ts`),
  imageFormat: 'jpeg',
  concurrency: inputProps.canh.some(c => c.moiTruong) ? Math.min(3, soLuong) : soLuong,
  chromiumOptions: inputProps.canh.some(c => c.moiTruong) ? {gl: 'swangle'} : undefined,
  browserExecutable,
  overwrite: true,
  onProgress: ({progress}) => {
    const p = Math.floor(progress * 10);
    if (p !== lanIn) {
      lanIn = p;
      console.log(`  ${p * 10}% (${Math.round((Date.now() - bd) / 1000)} giây)`);
    }
  },
});
fs.writeFileSync(path.join(ra, `khuc_${i}.json`), JSON.stringify({i, n, dau, cuoi, tong, moiKhuc, fps: comp.fps}));
console.log(`Xong khúc ${i + 1}/${n} sau ${Math.round((Date.now() - bd) / 1000)} giây`);
