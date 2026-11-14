// KIỂM DUYỆT BỐ CỤC TRƯỚC KHI DỰNG: chụp 3 khung mẫu mỗi cảnh (ở chế độ kiemDuyet), đo chữ tràn mép / đè nhau / bị cắt /
// mã TeX thô / KaTeX lỗi / chữ quá nhỏ, rồi ghi báo cáo theo từng cảnh để Gemini sửa đúng chỗ.
// Dùng: node scripts/kiem_duyet.mjs <thư mục bundle> <props.json> <báo cáo ra.json>
// Thoát mã 0 luôn; số lỗi nặng ghi trong báo cáo (máy dựng tự quyết định chặn hay chỉ báo).
import fs from 'node:fs';
import path from 'node:path';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';

const [bundle, tepProps, tepRa] = process.argv.slice(2);
const props = JSON.parse(fs.readFileSync(tepProps, 'utf8'));
const lech = props.anhBiaDau ? 1 : 0;   // khung 0 là ảnh bìa
const inputProps = {...props, kiemDuyet: true};
const canh = props.canh || [];

// khung mẫu: 45%, 80%, 97% mỗi cảnh (lúc hầu hết vật đã hiện)
const mau = [];
canh.forEach((c, i) => {
  for (const p of [0.45, 0.8, 0.97]) mau.push({f: lech + Math.min(props.tongFrame - 1, Math.round(c.batDau + c.soFrame * p)), i});
});

const trinhDuyet = await openBrowser('chrome', {browserExecutable: process.env.TRINH_DUYET || null, chromiumOptions: {gl: 'swangle'}});
const comp = await selectComposition({serveUrl: path.resolve(bundle), id: 'Video', inputProps, puppeteerInstance: trinhDuyet});
const tho = [];
const tam = fs.mkdtempSync('/tmp/kd-');
for (const m of mau) {
  let nhan = null;
  await renderStill({
    serveUrl: path.resolve(bundle), composition: comp, inputProps, frame: m.f, output: path.join(tam, `k${m.f}.jpeg`), imageFormat: 'jpeg', jpegQuality: 40, scale: 0.25,
    puppeteerInstance: trinhDuyet,
    onBrowserLog: (l) => {
      const s = String(l.text || '');
      if (s.startsWith('KD|')) { try { nhan = JSON.parse(s.slice(3)); } catch (e) { /* bỏ */ } }
    },
  });
  if (nhan) tho.push({...nhan, canh: m.i});
}
await trinhDuyet.close({silent: true});

// gộp theo cảnh + nội dung (một lỗi lặp ở nhiều khung chỉ báo một lần)
const NANG = new Set(['TEX_THO', 'KATEX_LOI', 'TRAN_MEP', 'CHU_DE', 'CAT_CHU']);
const gop = new Map();
for (const k of tho) {
  for (const l of k.loi || []) {
    const khoa = `${k.canh}|${l.kieu}|${l.chu}|${l.chu2 || ''}`;
    const cu = gop.get(khoa);
    if (cu) { cu.so++; continue; }
    gop.set(khoa, {...l, canh: k.canh, frame: k.frame, so: 1});
  }
}
const ten = (i) => `cảnh ${i + 1} (${(canh[i] || {}).loai || '?'})`;
const moTa = (l) => {
  const c = `"${String(l.chu).slice(0, 40)}"`;
  switch (l.kieu) {
    case 'TEX_THO': return `${ten(l.canh)}: hiện MÃ TeX THÔ ${c} trên màn hình -> viết lại thành công thức LaTeX hợp lệ trong noi_dung_man_hinh / nhãn, hoặc viết chữ thường (1/3, x²)`;
    case 'KATEX_LOI': return `${ten(l.canh)}: công thức ${c} sai cú pháp LaTeX (thiếu ngoặc, lệnh lạ) -> sửa lại`;
    case 'TRAN_MEP': return `${ten(l.canh)}: chữ ${c} TRÀN ra ngoài mép màn hình ${l.lech}px -> rút ngắn chữ, giảm số vật hoặc đặt vật vào giữa`;
    case 'CHU_DE': return `${ten(l.canh)}: chữ ${c} ĐÈ LÊN chữ "${String(l.chu2).slice(0, 40)}" -> tách vị trí hai vật (x, y), bớt vật hoặc bớt chữ trong cảnh`;
    case 'CAT_CHU': return `${ten(l.canh)}: chữ ${c} bị khung CẮT MẤT một phần -> rút ngắn chữ`;
    case 'CHU_NHO': return `${ten(l.canh)}: chữ ${c} quá nhỏ (${l.co}px) -> bớt vật trong cảnh để hình to hơn, hoặc rút ngắn chữ`;
    default: return `${ten(l.canh)}: ${l.kieu} ${c}`;
  }
};
const ds = [...gop.values()];
const nang = ds.filter((l) => NANG.has(l.kieu)).map(moTa);
const nhe = ds.filter((l) => !NANG.has(l.kieu)).map(moTa);
const bao = {so_khung: tho.length, so_khung_mau: mau.length, nang: [...new Set(nang)], nhe: [...new Set(nhe)], chi_tiet: ds.slice(0, 80)};
fs.writeFileSync(tepRa, JSON.stringify(bao, null, 1));
console.log(`Kiểm duyệt bố cục: ${tho.length}/${mau.length} khung, ${bao.nang.length} lỗi nặng, ${bao.nhe.length} lỗi nhẹ`);
bao.nang.slice(0, 20).forEach((x) => console.log('  [NẶNG] ' + x));
bao.nhe.slice(0, 10).forEach((x) => console.log('  [nhẹ] ' + x));
