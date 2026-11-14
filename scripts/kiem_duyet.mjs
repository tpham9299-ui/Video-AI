// KIỂM DUYỆT BỐ CỤC TRƯỚC KHI DỰNG: chụp 3 khung mẫu mỗi cảnh (ở chế độ kiemDuyet), đo chữ tràn mép / đè nhau / bị cắt /
// mã TeX thô / KaTeX lỗi / chữ quá nhỏ, rồi ghi báo cáo theo từng cảnh để Gemini sửa đúng chỗ.
// Dùng: node scripts/kiem_duyet.mjs <thư mục bundle> <props.json> <báo cáo ra.json>
// Thoát mã 0 luôn; số lỗi nặng ghi trong báo cáo (máy dựng tự quyết định chặn hay chỉ báo).
import fs from 'node:fs';
import path from 'node:path';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';

const [bundle, tepProps, tepRa, tepKichBan] = process.argv.slice(2);
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
// ẢNH CẢNH ĐỀ BÀI + MÔ PHỎNG cho AI nhìn (khung cuối cảnh, lúc hình đã vẽ đủ)
const anhAi = [];
for (const [re, ten] of [[/de_bai/, 'đề bài'], [/mo_hinh|mo_phong|y_do|thu_nho/, 'mô phỏng']]) {
  const i = canh.findIndex((c) => re.test(String(c.loai || '')));
  if (i < 0) continue;
  const c = canh[i];
  const tep = path.join(tam, `ai${i}.jpeg`);
  await renderStill({serveUrl: path.resolve(bundle), composition: comp, inputProps: props, frame: lech + Math.round(c.batDau + c.soFrame * 0.95), output: tep, imageFormat: 'jpeg', jpegQuality: 70, scale: 0.4, puppeteerInstance: trinhDuyet});
  anhAi.push({canh: i, ten, tep});
}
await trinhDuyet.close({silent: true});
const aiLoi = await aiNhinHinh(anhAi).catch((e) => { console.log('AI nhìn hình: bỏ qua (' + String(e.message || e).slice(0, 120) + ')'); return []; });

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
const nang = ds.filter((l) => NANG.has(l.kieu)).map(moTa).concat(aiLoi);
const nhe = ds.filter((l) => !NANG.has(l.kieu)).map(moTa);
const bao = {so_khung: tho.length, so_khung_mau: mau.length, nang: [...new Set(nang)], nhe: [...new Set(nhe)], chi_tiet: ds.slice(0, 80)};
fs.writeFileSync(tepRa, JSON.stringify(bao, null, 1));
console.log(`Kiểm duyệt bố cục: ${tho.length}/${mau.length} khung, ${bao.nang.length} lỗi nặng, ${bao.nhe.length} lỗi nhẹ`);
bao.nang.slice(0, 20).forEach((x) => console.log('  [NẶNG] ' + x));
bao.nhe.slice(0, 10).forEach((x) => console.log('  [nhẹ] ' + x));


// AI NHÌN HÌNH TRƯỚC KHI DỰNG: Gemini xem ảnh cảnh đề bài + mô phỏng, đối chiếu với đề: vẽ ĐÚNG vật thật của đề chưa (cột cờ ra cột cờ,
// ngân hàng ra ngân hàng, hàng rào ra hàng rào), số đo có đúng chỗ không. Sai thì trả lỗi nặng -> kịch bản được sửa trước khi dựng.
// Cần GEMINI_API_KEY (hoặc GEMINI_KEYS) trong GitHub Secrets; không có thì bỏ qua bước này.
async function aiNhinHinh(anh) {
  const keys = String(process.env.GEMINI_KEYS || process.env.GEMINI_API_KEY || '').split(/[\s,;]+/).filter(Boolean);
  if (!keys.length || !anh.length || !tepKichBan || !fs.existsSync(tepKichBan)) return [];
  const kb = JSON.parse(fs.readFileSync(tepKichBan, 'utf8'));
  const de = String(kb.de_bai || '').trim();
  if (!de) return [];
  const prompt = 'Bạn kiểm duyệt hình minh họa video dạy toán. Các ảnh là cảnh ' + anh.map((a, i) => `ảnh ${i + 1} = cảnh ${a.ten}`).join(', ') + '.\n' +
    'ĐỀ BÀI: ' + de + (kb.mo_ta_hinh ? '\nMÔ TẢ HÌNH ĐỀ: ' + kb.mo_ta_hinh : '') + '\n' +
    'Kiểm tra KHẮT KHE: (1) mọi vật/địa điểm thật trong đề (cột cờ, tòa nhà, ngân hàng, hàng rào, cây, người, sông, xe...) có được vẽ ĐÚNG là vật đó không (vẽ khối hộp/khối trụ/thẻ chữ thay cho vật thật là SAI); ' +
    '(2) hình dạng, số lượng, cách sắp xếp có đúng đề không; (3) các số đo trên hình có đúng số của đề và đặt đúng chỗ không. Bỏ qua chuyện thẩm mỹ nhỏ.\n' +
    'Trả JSON: {"dung": true|false, "van_de": ["mỗi lỗi một câu, nói rõ ảnh nào, vật nào sai và phải vẽ thế nào"]}';
  const parts = [{text: prompt}, ...anh.map((a) => ({inline_data: {mime_type: 'image/jpeg', data: fs.readFileSync(a.tep).toString('base64')}}))];
  const models = [process.env.MODEL_AI_NHIN || 'gemini-flash-latest', 'gemini-2.5-flash'];
  for (const model of models) {
    for (const k of keys) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(k)}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({contents: [{role: 'user', parts}], generationConfig: {temperature: 0.1, responseMimeType: 'application/json'}}),
      }).catch(() => null);
      if (!res || !res.ok) continue;
      const j = await res.json().catch(() => null);
      const txt = j && j.candidates && j.candidates[0] && j.candidates[0].content && (j.candidates[0].content.parts || []).map((p) => p.text || '').join('');
      let kq = null;
      try { kq = JSON.parse(txt); } catch (e) { continue; }
      console.log('AI nhìn hình: ' + (kq.dung ? 'ĐÚNG đề' : 'SAI: ' + (kq.van_de || []).join(' | ')));
      return kq.dung === false ? (kq.van_de || []).slice(0, 4).map((x) => 'AI_NHIN_HINH: ' + String(x)) : [];
    }
  }
  return [];
}
