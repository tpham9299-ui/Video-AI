// KIỂM DUYỆT BỐ CỤC TRƯỚC KHI DỰNG: chụp 2 khung mẫu mỗi cảnh (ở chế độ kiemDuyet), đo chữ tràn mép / đè nhau / bị cắt /
// mã TeX thô / KaTeX lỗi / chữ quá nhỏ, rồi ghi báo cáo theo từng cảnh để Gemini sửa đúng chỗ.
// Dùng: node scripts/kiem_duyet.mjs <thư mục bundle> <props.json> <báo cáo ra.json>
// Thoát mã 0 luôn; số lỗi nặng ghi trong báo cáo (máy dựng tự quyết định chặn hay chỉ báo).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';

// --- key Gemini hỏng (dùng chung với Bộ phận 1 / giọng đọc): khai báo TRƯỚC khi chạy kiểm duyệt ---
var TEP_KEY_HONG_JSON = path.join(os.tmpdir(), 'gemini_key_hong.json');
function maKey(k) { return k.slice(0, 6) + '_' + k.slice(-4); }
function dsKeyHong() { try { return JSON.parse(fs.readFileSync(TEP_KEY_HONG_JSON, 'utf8')); } catch (e) { return []; } }
function ghiKeyHong(k, code, raw) {
  const ds = dsKeyHong();
  if (ds.some((x) => x.dau === maKey(k))) return;
  const goc = String(process.env.GEMINI_KEYS || '').split(/[\s,;]+/).filter(Boolean);
  const m = /"message":\s*"([^"]{0,160})/.exec(raw);
  ds.push({so: goc.indexOf(k) + 1 || 0, dau: maKey(k), ly_do: `HTTP ${code}: ${(m ? m[1] : raw).replace(/\s+/g, ' ').slice(0, 160)}`});
  try { fs.writeFileSync(TEP_KEY_HONG_JSON, JSON.stringify(ds)); } catch (e) { /* bỏ */ }
  console.log(`KEY_HONG: key ${maKey(k)} lỗi thật (HTTP ${code}) -> bỏ qua, sẽ báo Zalo`);
}

const [bundle, tepProps, tepRa, tepKichBan] = process.argv.slice(2);
const props = JSON.parse(fs.readFileSync(tepProps, 'utf8'));
const hanKiemDuyet = Date.now() + 400_000;
const lech = props.anhBiaDau ? 1 : 0;   // khung 0 là ảnh bìa
const inputProps = {...props, kiemDuyet: true};
const canh = props.canh || [];

// khung mẫu: 55% và 95% mỗi cảnh (tái dùng chính khung 95% của các cảnh được chọn cho AI nhìn hình -> giảm một nửa số lần renderStill)
const chonSet = new Set(
  canh.map((c, i) => i).filter((i, k, a) => a.length <= 18 || k % Math.ceil(a.length / 18) === 0 || /dap_an|ket_qua/.test(String(canh[i].loai)))
);
const mau = [];
for (const p of [0.95, 0.55]) {
  canh.forEach((c, i) => {
    const off = p === 0.95 ? Math.min(Math.round(c.soFrame * p), Math.max(0, c.soFrame - 10)) : Math.round(c.soFrame * p);
    mau.push({f: Math.min(props.tongFrame - 1, lech + c.batDau + off), i, isEnd: p === 0.95});
  });
}

const trinhDuyet = await openBrowser('chrome', {browserExecutable: process.env.TRINH_DUYET || null, chromiumOptions: {gl: 'swangle'}});
const comp = await selectComposition({serveUrl: path.resolve(bundle), id: 'Video', inputProps, puppeteerInstance: trinhDuyet});
const tho = [];
const anhAi = [];
const tam = fs.mkdtempSync('/tmp/kd-');
async function chup(m) {
  let nhan = null;
  const layAi = m.isEnd && chonSet.has(m.i);
  const tep = path.join(tam, layAi ? `ai${m.i}.jpeg` : `k${m.i}-${m.f}.jpeg`);
  await renderStill({
    serveUrl: path.resolve(bundle), composition: comp, inputProps, frame: m.f, output: tep, imageFormat: 'jpeg',
    jpegQuality: layAi ? 58 : 40, scale: layAi ? 0.3 : 0.25,
    puppeteerInstance: trinhDuyet,
    onBrowserLog: (l) => {
      const s = String(l.text || '');
      if (s.startsWith('KD|')) { try { nhan = JSON.parse(s.slice(3)); } catch (e) { /* bỏ */ } }
    },
  });
  return {nhan, tep, layAi};
}

const songSong = Math.min(2, os.availableParallelism());
for (let i = 0; i < mau.length; i += songSong) {
  if (Date.now() >= hanKiemDuyet - 45_000) break;
  // Ghi từng khung ngay khi xong; giữ thứ tự mẫu cho báo cáo và ảnh gửi Gemini.
  await Promise.all(mau.slice(i, i + songSong).map(async (m, j) => {
    const {nhan, tep, layAi} = await chup(m);
    if (nhan) tho[i + j] = {...nhan, canh: m.i};
    if (layAi) anhAi[m.i] = {canh: m.i, ten: `${m.i + 1} (${(canh[m.i] || {}).loai || '?'})`, tep};
    ghiBaoCao({chay: false, loi: [], ly_do: 'kiểm duyệt chưa hoàn tất'}, false);
  }));
}
await trinhDuyet.close({silent: true});
const aiKq = await aiNhinHinh(anhAi.filter(Boolean)).catch((e) => ({chay: false, ly_do: String(e.message || e).slice(0, 160), loi: []}));
fs.rmSync(tam, {recursive: true, force: true});
ghiBaoCao(aiKq, true);

function ghiBaoCao(aiKq, hoanTat) {
  const khung = tho.filter(Boolean);
  const aiLoi = aiKq.loi || [];
  if (hoanTat && !aiKq.chay) console.log('⚠️ AI NHÌN HÌNH KHÔNG CHẠY ĐƯỢC: ' + (aiKq.ly_do || 'không rõ') + ' -> hình CHƯA được AI đối chiếu với đề');

  // ĐỐI CHIẾU ĐÁP ÁN TRÊN MÀN HÌNH: khung cuối cảnh đáp án phải hiện ĐÚNG đáp án đã kiểm chứng (đọc chữ thật trên khung,
  // kể cả số của huy hiệu số lăn). Sai/thiếu -> lỗi nặng, không dựng.
  const loiDapAn = [];
  try {
    const kbDA = tepKichBan && fs.existsSync(tepKichBan) ? JSON.parse(fs.readFileSync(tepKichBan, 'utf8')) : {};
    const dapAn = Number(String(kbDA.dap_an ?? '').replace(',', '.'));
    if (String(kbDA.dap_an ?? '').trim() && Number.isFinite(dapAn) && /^-?\d+([.,]\d+)?$/.test(String(kbDA.dap_an).trim())) {
      const docSo = (t) => (String(t).replace(/(\d)\s+(?=\d{3}\b)/g, '$1').match(/-?\d+(?:[.,]\d+)?/g) || []).map((x) => Number(x.replace(',', '.')));
      const bang = (x) => Math.abs(x - dapAn) <= Math.max(1e-9, Math.abs(dapAn) * 1e-9);
      canh.forEach((c, i) => {
        if (!/dap_an|ket_qua/.test(String(c.loai || ''))) return;
        const cuoi = khung.filter((k) => k.canh === i).sort((a, b) => b.frame - a.frame)[0];
        if (!cuoi) return;
        const so = (cuoi.so || []).map((x) => Number(String(x).replace(',', '.')));
        const soChu = docSo((cuoi.chu || []).join(' | '));
        if (so.length && !so.some(bang)) loiDapAn.push(`cảnh ${i + 1} (${c.loai}): HUY HIỆU ĐÁP ÁN hiện ${cuoi.so.join(', ')} nhưng đáp án đúng là ${kbDA.dap_an} -> sửa gia_tri của so_dem cho đúng đáp án`);
        if (!so.some(bang) && !soChu.some(bang)) loiDapAn.push(`cảnh ${i + 1} (${c.loai}): màn hình cảnh đáp án KHÔNG hiện đáp số ${kbDA.dap_an} -> ghi rõ đáp số trong noi_dung_man_hinh của cảnh đáp án`);
      });
      if (hoanTat) console.log(loiDapAn.length ? 'Đối chiếu đáp án: SAI - ' + loiDapAn.join(' | ') : `Đối chiếu đáp án trên màn hình: ĐÚNG (${kbDA.dap_an})`);
    }
  } catch (e) { console.log('Đối chiếu đáp án: lỗi ' + String(e.message || e).slice(0, 120)); }

  // gộp theo cảnh + nội dung (một lỗi lặp ở nhiều khung chỉ báo một lần)
  const NANG = new Set(['TEX_THO', 'KATEX_LOI', 'TRAN_MEP', 'CHU_DE', 'CAT_CHU']);
  const gop = new Map();
  for (const k of khung) {
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
      case 'VAT_DE': return `${ten(l.canh)}: hai vật ĐÈ LÊN NHAU (${l.chu} và ${l.chu2}) -> đặt hai vật xa nhau (x, y), bớt số lượng hoặc tách sang cảnh khác`;
      case 'HINH_NHO': return `${ten(l.canh)}: hình minh họa QUÁ NHỎ (chỉ chiếm ${l.co}% vùng sân khấu) -> bớt vật phụ, tăng "co" của hình chính, dùng một hình lớn rõ ràng`;
      default: return `${ten(l.canh)}: ${l.kieu} ${c}`;
    }
  };
  const ds = [...gop.values()];
  // vật đè vật chỉ tính nặng khi lặp lại ở >= 2 khung mẫu (1 khung có thể là lúc vật đang bay vào)
  const laNang = (l) => NANG.has(l.kieu) || ((l.kieu === 'VAT_DE' || l.kieu === 'HINH_NHO') && l.so >= 2);   // hình nhỏ ở >= 2 khung mẫu cũng là lỗi nặng
  const nang = ds.filter(laNang).map(moTa).concat(aiLoi, loiDapAn);
  const nhe = ds.filter((l) => !laNang(l)).map(moTa);
  if (!aiKq.chay) nhe.push('AI_NHIN_HINH_KHONG_CHAY: ' + (aiKq.ly_do || 'không gọi được Gemini') + ' - hình chưa được AI đối chiếu với đề');
  const bao = {hong: khung.length < mau.length || !hoanTat, so_khung: khung.length, so_khung_mau: mau.length, nang: [...new Set(nang)], nhe: [...new Set(nhe)], ai_nhin: aiKq.chay ? (aiLoi.length ? 'sai' : 'dung') : 'khong_chay', chi_tiet: ds.slice(0, 80)};
  fs.writeFileSync(tepRa + '.tmp', JSON.stringify(bao, null, 1));
  fs.renameSync(tepRa + '.tmp', tepRa);
  if (!hoanTat) return;
  console.log(`Kiểm duyệt bố cục: ${khung.length}/${mau.length} khung, ${bao.nang.length} lỗi nặng, ${bao.nhe.length} lỗi nhẹ`);
  bao.nang.slice(0, 20).forEach((x) => console.log('  [NẶNG] ' + x));
  bao.nhe.slice(0, 10).forEach((x) => console.log('  [nhẹ] ' + x));
}

// AI NHÌN HÌNH TRƯỚC KHI DỰNG: Gemini xem ảnh cảnh đề bài + mô phỏng, đối chiếu với đề: vẽ ĐÚNG vật thật của đề chưa (cột cờ ra cột cờ,
// ngân hàng ra ngân hàng, hàng rào ra hàng rào), số đo có đúng chỗ không. Sai thì trả lỗi nặng -> kịch bản được sửa trước khi dựng.
// Cần GEMINI_API_KEY (hoặc GEMINI_KEYS) trong GitHub Secrets; không có thì bỏ qua bước này.
async function aiNhinHinh(anh) {
  const keys = [...new Set(String((process.env.GEMINI_KEYS || '') + ',' + (process.env.GEMINI_API_KEY || '')).split(/[\s,;]+/).filter(Boolean))];
  if (!keys.length) return {chay: false, ly_do: 'không có key Gemini dùng được', loi: []};
  if (!anh.length || !tepKichBan || !fs.existsSync(tepKichBan)) return {chay: false, ly_do: 'thiếu ảnh hoặc kịch bản', loi: []};
  const kb = JSON.parse(fs.readFileSync(tepKichBan, 'utf8'));
  const de = String(kb.de_bai || '').trim();
  if (!de) return {chay: false, ly_do: 'kịch bản không có đề bài', loi: []};
  const dapAn = String(kb.dap_an_hien || kb.dap_an || '');
  const dsCanh = anh.map((a, i) => { const c = (kb.canh || [])[a.canh] || {}; return `ẢNH ${i + 1} = cảnh ${a.ten}: "${String(c.loi_thoai || '').slice(0, 140)}" | công thức: ${(c.noi_dung_man_hinh || []).join(' ; ').slice(0, 120)}`; }).join('\n');
  const prompt = 'Bạn là người KIỂM DUYỆT KHẮT KHE video dạy toán trước khi dựng. Mỗi ảnh là khung cuối của một cảnh.\n' +
    'ĐỀ BÀI: ' + de + (kb.mo_ta_hinh ? '\nMÔ TẢ HÌNH ĐỀ: ' + kb.mo_ta_hinh : '') + '\nĐÁP ÁN ĐÚNG (đã kiểm chứng bằng 2 cách giải + mã tính): ' + dapAn + '\n' + dsCanh + '\n' +
    'Kiểm tra TỪNG ảnh, chỉ báo lỗi THẬT:\n' +
    '(1) Vật/địa điểm thật trong đề (cột cờ, tòa nhà, ngân hàng, hàng rào, tường, cây, người, xe...) phải vẽ ĐÚNG là vật đó; khối hộp/khối trụ/thẻ chữ thay vật thật là SAI.\n' +
    '(2) KHÔNG có vật bị vẽ LẶP (2 tòa nhà, 2 người khi đề chỉ có 1), không có vật thừa sót lại từ cảnh trước.\n' +
    '(2b) CÁCH SẮP XẾP đúng điều kiện đề: ngồi quanh BÀN TRÒN phải là vòng tròn quanh bàn (xếp hàng ngang là SAI), đúng số người / số vật và nhãn; không có vật nào đè lên vật khác.\n' +
    '(3) Số đo trên hình đúng số của đề, đặt đúng chỗ (khoảng cách nằm dưới đoạn đúng, chiều cao cạnh đúng vật, góc ở đúng đỉnh); tỉ lệ hình không mâu thuẫn số đo.\n' +
    '(4) Mọi số, phép tính, đáp số hiện trên màn hình phải đúng và khớp đáp án ' + dapAn + ' (cảnh đáp án phải hiện đúng đáp án; huy hiệu số phải đọc được rõ).\n' +
    '(5) Chữ không bị che khuất hoàn toàn đến mức không đọc được, không lộ mã LaTeX thô.\n' +
    'CHỈ trả "dung": false khi có lỗi NGHIÊM TRỌNG làm hỏng video hoặc sai toán học (sai đáp án, sai phép tính, vẽ sai hẳn vật của đề, hoặc chữ đè che khuất hoàn toàn). Các chi tiết thẩm mỹ nhỏ, khoảng cách hơi sát nhưng vẫn đọc rõ, hoặc cảnh mở đầu/chốt bài chỉ có chữ thì ĐẶT "dung": true. Trả JSON: {"dung": true|false, "van_de": ["ẢNH n (cảnh ...): lỗi gì, phải sửa thế nào"]}';
  const parts = [{text: prompt}, ...anh.map((a) => ({inline_data: {mime_type: 'image/jpeg', data: fs.readFileSync(a.tep).toString('base64')}}))];
  // cùng bộ model linh hoạt với Bộ phận 1: tự động đổi model nếu một model lỗi / 404 / hết hạn mức
  const models = [...new Set([process.env.MODEL_AI_NHIN, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-3.6-flash'].filter(Boolean))];
  const hetNgay = new Set();
  const model404 = new Set();
  const loiModel = {};
  let lyDo = 'mọi lần gọi Gemini đều lỗi';
  for (let vong = 0; vong < 3; vong++) {
    let choMs = 0;
    for (const model of models) {
      if (model404.has(model)) continue;
      for (const k of keys) {
        if (hetNgay.has(model + '|' + k)) continue;
        const conLai = hanKiemDuyet - Date.now();
        if (conLai <= 0) return {chay: false, ly_do: 'hết thời gian kiểm duyệt', loi: []};
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(k)}`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({contents: [{role: 'user', parts}], generationConfig: {temperature: 0.1, responseMimeType: 'application/json'}}),
          signal: AbortSignal.timeout(Math.min(90000, conLai)),
        }).catch((e) => { lyDo = 'lỗi mạng: ' + String(e.message || e).slice(0, 80); return null; });
        if (!res) continue;
        if (!res.ok) {
          const raw = await res.text().catch(() => '');
          loiModel[model] = `HTTP ${res.status}${res.status === 429 ? (/PerDay|per day|daily/i.test(raw) ? ' hết hạn mức ngày' : ' giới hạn phút') : ''}`;
          lyDo = Object.entries(loiModel).map(([m, l]) => `${m} ${l}`).join('; ');
          if (res.status === 404) { model404.add(model); break; } // model không tồn tại -> đổi sang model kế ngay, không thử key khác
          if (res.status === 429 && /PerDay|per day|daily/i.test(raw)) { hetNgay.add(model + '|' + k); continue; }   // hết hạn mức ngày: key kế
          if (res.status === 429) { const m = /"retryDelay":\s*"(\d+)/.exec(raw); const c = Math.min(60, (m ? Number(m[1]) : 15) + 1) * 1000; choMs = choMs ? Math.min(choMs, c) : c; continue; }
          if (res.status >= 500) break; // máy chủ model này đang lỗi -> thử ngay model kế tiếp
          if (res.status === 401 || ([400, 403].includes(res.status) && /API_KEY_INVALID|API key not valid|API key expired|SERVICE_DISABLED|has not been used|is disabled|suspended|PERMISSION_DENIED|billing/i.test(raw))) { hetNgay.add(model + '|' + k); ghiKeyHong(k, res.status, raw); }
          continue;
        }
        const j = await res.json().catch(() => null);
        const txt = j && j.candidates && j.candidates[0] && j.candidates[0].content && (j.candidates[0].content.parts || []).map((p) => p.text || '').join('');
        let kq = null;
        try { kq = JSON.parse(txt); } catch (e) { lyDo = model + ' trả lời không đọc được'; continue; }
        if (typeof kq.dung !== 'boolean') { lyDo = model + ' trả lời thiếu "dung"'; continue; }
        console.log(`AI nhìn hình (${anh.length} cảnh, ${model}): ` + (kq.dung ? 'ĐÚNG đề' : 'SAI: ' + (kq.van_de || []).join(' | ')));
        return {chay: true, loi: kq.dung === false ? (kq.van_de || []).slice(0, 6).map((x) => 'AI_NHIN_HINH: ' + String(x)) : []};
      }
    }
    if (!choMs || Date.now() + choMs >= hanKiemDuyet) break;
    console.log(`AI nhìn hình: mọi key đang bị giới hạn theo phút, chờ ${Math.round(choMs / 1000)} giây rồi thử lại`);
    await new Promise((r) => setTimeout(r, choMs));
  }
  return {chay: false, ly_do: lyDo, loi: []};
}
