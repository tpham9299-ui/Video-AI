// KIỂM DUYỆT BỐ CỤC TRƯỚC KHI DỰNG: chụp 2 khung mẫu mỗi cảnh (ở chế độ kiemDuyet), đo chữ tràn mép / đè nhau / bị cắt /
// mã TeX thô / KaTeX lỗi / chữ quá nhỏ, rồi ghi báo cáo theo từng cảnh để Gemini sửa đúng chỗ.
// Dùng: node scripts/kiem_duyet.mjs <thư mục bundle> <props.json> <báo cáo ra.json>
// Thoát mã 0 luôn; số lỗi nặng ghi trong báo cáo (máy dựng tự quyết định chặn hay chỉ báo).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import catalog from './bophan1/model_gemini.cjs';
import katex from 'katex';
import {dungImXacSuat} from './dung_im_xs.mjs';

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

const [thuMucBundle, tepProps = 'public/props.json', tepRa = 'out/kiem_duyet.json', tepKichBan] = process.argv.slice(2);
const bundle = thuMucBundle || (fs.existsSync('build/index.html') ? 'build' :
  await (await import('@remotion/bundler')).bundle({entryPoint: path.resolve('src/index.ts')}));
fs.mkdirSync(path.dirname(tepRa), {recursive: true});
const props = JSON.parse(fs.readFileSync(tepProps, 'utf8'));
const kbNguon = tepKichBan && fs.existsSync(tepKichBan) ? JSON.parse(fs.readFileSync(tepKichBan, 'utf8')) : {};
props.mon ||= kbNguon.mon || (/^T[TI]\d/i.test(props.id || '') ? 'THUC_TE' : '');
props.kieu_video ||= kbNguon.kieu_video;
const thucTe = props.mon === 'THUC_TE' && props.kieu_video !== 'DAI_10_PHUT' && !/-10P$/i.test(props.id || '');
const hanKiemDuyet = Date.now() + 400_000;
const lech = (props.anhBiaDau ? 1 : 0) + (props.intro && props.intro.soFrame > 0 ? props.intro.lech || 0 : 0);   // khung 0 là ảnh bìa, sau đó intro thương hiệu
// Ảnh tĩnh local dùng đúng mốc đã chuẩn bị ngay cả khi thư mục âm thanh của lượt dựng cũ đã dọn.
const inputProps = {...props, kiemDuyet: true, ...(!thuMucBundle ? {
  nhac: null, canh: (props.canh || []).map(c => ({...c, audio: null})),
} : {})};
const canh = props.canh || [];

// khung mẫu: 55% và 95% mỗi cảnh (tái dùng chính khung 95% của các cảnh được chọn cho AI nhìn hình -> giảm một nửa số lần renderStill)
const debut3D = c => c.phaMinhHoa ? c.phaMinhHoa !== "toan" : c.moiTruong || (c.chuoi3D && !c.chuoi3D.giuNet);
const coCanhBlender = canh.some(debut3D);
const chonSet = new Set(
  canh.map((c, i) => i).filter((i, k, a) => coCanhBlender || a.length <= 18 || k % Math.ceil(a.length / 18) === 0 || /dap_an|ket_qua/.test(String(canh[i].loai)))
);
const mau = [];
for (const p of [0.95, 0.55]) {
  canh.forEach((c, i) => {
    const off = p === 0.95 ? Math.min(Math.round(c.soFrame * p), Math.max(0, c.soFrame - 10)) : Math.round(c.soFrame * ((c.phaMinhHoa === 'chuyen' || c.phaMinhHoa === 'thuc' || c.chuoi3D?.phepThu || c.moiTruong?.loai === 'phep_thu') ? 0 : debut3D(c) ? .23 : p));
    mau.push({f: Math.min(props.tongFrame - 1, lech + c.batDau + off), i, isEnd: p === 0.95});
  });
}

const xs = props.mon === 'XAC_SUAT' && props.boCuc === '4tang' && props.kieu_video !== 'DAI_10_PHUT' && !/-10P$/i.test(props.id || '');
const fps = props.fps || 30, steps = props.khung4tang?.buoc || [];
const end = props.outro?.batDau ?? props.tongFrame;
if (xs && steps.length > 1) {
  const add = frame => {
    if (frame >= end || mau.some(m => m.f === frame+lech)) return;
    const i = Math.max(0, canh.findIndex(c => frame >= c.batDau && frame < c.batDau+c.soFrame));
    mau.push({f: frame+lech, i, isEnd: false});
  };
  steps.slice(1).forEach(b => add(Math.ceil((b.t+.8)*fps)));
  for (let f=Math.ceil(steps[1].t*fps); f<end; f+=4*fps) add(f);
}
if (props.boCuc === '4tang' && canh.length) {
  const probe = (frame, brand) => {
    const f = Math.min(props.tongFrame - 1, frame + lech);
    const i = Math.max(0, canh.findIndex(c => frame >= c.batDau && frame < c.batDau + c.soFrame));
    mau.unshift({f, i, isEnd: false, brand});
  };
  if (props.khung4tang?.mocCau) probe(Math.round(1.7 * fps), 'intro');
  probe(Math.min(end - 1, Math.max(6 * fps, Math.round(end / 2))), 'giai');
  if (props.outro) probe(end + Math.floor(props.outro.soFrame / 2), 'outro');
}
const trinhDuyet = await openBrowser('chrome', {browserExecutable: process.env.TRINH_DUYET || null, chromiumOptions: {gl: 'swangle'}});
const comp = await selectComposition({serveUrl: path.resolve(bundle), id: 'Video', inputProps, puppeteerInstance: trinhDuyet});
const tho = [];
const anhAi = [];
const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-'));
async function chup(m) {
  let nhan = null;
  const layAi = debut3D(canh[m.i]) || (m.isEnd && chonSet.has(m.i));
  const tep = path.join(tam, layAi ? `ai${m.i}-${m.f}.jpeg` : `k${m.i}-${m.f}.jpeg`);
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
    if (nhan && !nhan.hong && nhan.frame === m.f - lech) tho[i + j] = {...nhan, frame: m.f, canh: m.i};
    if (layAi) anhAi[2 * m.i + Number(m.isEnd)] = {canh: m.i, ten: `${m.i + 1} (${(canh[m.i] || {}).loai || '?'}, ${!m.isEnd ? 'vật 3D' : 'cuối cảnh'})`, tep};
    ghiBaoCao({chay: false, loi: [], ly_do: 'kiểm duyệt chưa hoàn tất'}, false);
  }));
}
await trinhDuyet.close({silent: true});
const aiKq = await aiNhinHinh(anhAi.filter(Boolean)).catch((e) => ({chay: false, ly_do: String(e.message || e).slice(0, 160), loi: []}));
fs.rmSync(tam, {recursive: true, force: true});
ghiBaoCao(aiKq, true);

// v101.5: kiểm lại cú pháp bằng chính KaTeX (chấp nhận "\ ", \vdots, \text{...}, \Omega...). Chuỗi bị cắt (>= 60 ký tự) không thể
// kết luận -> coi như chưa chắc sai thì GIỮ báo cáo; chuỗi đủ ngắn mà KaTeX dựng được -> bỏ báo nhầm.
function texHopLe(s) {
  const t = String(s || '').trim().replace(/^\$+|\$+$/g, '');
  if (!t || t.length >= 60) return false;
  try { katex.renderToString(t, {throwOnError: true, strict: false}); return true; } catch (e) { return false; }
}

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
    if (!props.manimLop && String(kbDA.dap_an ?? '').trim() && Number.isFinite(dapAn) && /^-?\d+([.,]\d+)?$/.test(String(kbDA.dap_an).trim())) {
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
      if (l.kieu === 'KATEX_LOI' && texHopLe(l.chu)) continue;   // v101.5: báo nhầm - KaTeX chuẩn (\ , \vdots, \text{...}) dựng được
      const khoa =`${k.canh}|${l.kieu}|${l.chu}|${l.chu2 || ''}`;
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
  const nang = aiLoi.concat(ds.filter(laNang).map(moTa), loiDapAn);
  if (xs && dungImXacSuat(khung.filter(k => k.frame-lech < end).map(k => ({shape: k.shape, frame: k.frame-lech})), steps, fps))
    nang.unshift('hinh_dung_im: hình học T2 không đổi qua ba bước hoặc hơn 12 giây');
  if (props.boCuc === '4tang') {
    if (!props.outro) nang.unshift('thuong_hieu: thiếu Outro của khung 4 tầng');
    for (const probe of mau.filter(m => m.brand)) {
      const sample = khung.find(k => k.frame === probe.f);
      const required = probe.brand === 'outro' ? ['outro'] : probe.brand === 'giai' ? ['nuoc', 'dau'] : [];
      if (!sample || required.some(key => !sample.nhanKenh?.includes(key)))
        nang.unshift('thuong_hieu: thiếu dấu kênh trong SAFE_ZONE_TIKTOK ở ' + probe.brand);
    }
    if (khung.some(k => k.tranIntro)) nang.unshift('cat_chu: tiêu đề Intro tràn SAFE_ZONE_TIKTOK');
    if (khung.some(k => k.kenhCu)) nang.unshift('thuong_hieu: còn tên kênh cũ');
    if (khung.some(k => k.coThe && !k.nhanKenh?.includes('the'))) nang.unshift('thuong_hieu: thiếu chữ ký trên thẻ công thức');
  }
  if (thucTe && props.khung4tang?.batBuocVatThe && props.khung4tang?.tuSinh && hoanTat && !aiKq.chay)
    nang.unshift('t2_trong: chưa đối chiếu được vật thể tự sinh với đề trên ảnh');
  if (thucTe) {
    const giua = mau.filter(m => m.i > 0 && m.i < canh.length - 1 &&
      (!props.outro || m.f - lech < props.outro.batDau));
    const loi = giua.find(m => !khung.some(k => k.frame === m.f && k.hinhT2 === true && (!props.khung4tang?.batBuocVatThe || k.duHaiCot)));
    if (loi || !giua.length) nang.unshift('t2_trong: chưa thấy hình minh họa trong vùng an toàn T2' + (loi ? ' ở ' + ten(loi.i) : ' ở các khung giải'));
  }
  const nhe = ds.filter((l) => !laNang(l)).map(moTa);
  if (!aiKq.chay) nhe.push('AI_NHIN_HINH_KHONG_CHAY: ' + (aiKq.ly_do || 'không gọi được Gemini') + ' - hình chưa được AI đối chiếu với đề');
  const bao = {hong: khung.length < mau.length || !hoanTat || (coCanhBlender && !aiKq.chay), so_khung: khung.length, so_khung_mau: mau.length, nang: [...new Set(nang)], nhe: [...new Set(nhe)], ai_nhin: aiKq.chay ? (aiLoi.length ? 'sai' : 'dung') : 'khong_chay', chi_tiet: ds.slice(0, 80)};
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
  if (props.manimLop) return {chay: false, ly_do: 'đối chiếu lớp Manim trên MP4 sau khi ghép', loi: []};
  const keys = [...new Set(String((process.env.GEMINI_KEYS || '') + ',' + (process.env.GEMINI_API_KEY || '')).split(/[\s,;]+/).filter(Boolean))];
  if (!keys.length) return {chay: false, ly_do: 'không có key Gemini dùng được', loi: []};
  const missing = coCanhBlender ? canh.findIndex((c, i) => anh.filter(a => a.canh === i).length < (debut3D(c) ? 2 : 1)) : -1;
  if (missing >= 0) return {chay: false, ly_do: 'thiếu khung cần đối chiếu ở cảnh ' + (missing + 1), loi: []};
  if (!anh.length || !tepKichBan || !fs.existsSync(tepKichBan)) return {chay: false, ly_do: 'thiếu ảnh hoặc kịch bản', loi: []};
  const kb = JSON.parse(fs.readFileSync(tepKichBan, 'utf8'));
  const de = String(kb.de_bai || '').trim();
  if (!de) return {chay: false, ly_do: 'kịch bản không có đề bài', loi: []};
  const dapAn = String(kb.dap_an_hien || kb.dap_an || '');
  const dsCanh = anh.map((a, i) => { const c = (kb.canh || [])[a.canh] || {}; return `ẢNH ${i + 1} = cảnh ${a.ten} (pha ${canh[a.canh]?.phaMinhHoa || "truyền thống"}): "${String(c.loi_thoai || '').slice(0, 140)}" | công thức: ${(c.noi_dung_man_hinh || []).join(' ; ')}`; }).join('\n');
  const prompt = 'Bạn là người KIỂM DUYỆT KHẮT KHE video dạy toán trước khi dựng. Pha thuc là minh họa đời thật. Pha chuyen hòa mờ từ vật thật sang nét toán. Pha toan dùng sơ đồ, ký hiệu và đồ thị Manim; ở pha này hãy đánh giá dữ kiện toán thay vì đòi vẽ lại vật thật. Với cặp vật 3D và cuối cảnh, đối chiếu cùng một vật, số lượng, vị trí tương đối, tỉ lệ và cạnh tương ứng khi chuyển sang sơ đồ. Với phép thử xác suất, so số vật, màu trước và sau lần rút, hoặc mặt ngửa của xu và số chấm mặt trên khi xúc xắc dừng với lời mô tả. Kết quả minh họa của một lần thử không phải xác suất của biến cố. Báo nếu có nền chữ nhật riêng che nền video. Những cảnh còn lại dùng khung cuối.\n' +
    'ĐỀ BÀI: ' + de + (kb.mo_ta_hinh ? '\nMÔ TẢ HÌNH ĐỀ: ' + kb.mo_ta_hinh : '') + '\nĐÁP ÁN ĐÚNG (đã kiểm chứng bằng 2 cách giải + mã tính): ' + dapAn + '\n' + dsCanh + '\n' +
    (props.khung4tang?.batBuocVatThe ? 'Mọi ô giải phải có vật thể đúng đề kể cả pha toán. Nếu chia đôi, kiểm riêng bên trái có vật thể và bên phải có đồ thị. Thanh trượt/chữ hoặc đồ thị đơn độc là lỗi t2_trong.\n' : '') +
    'Kiểm tra TỪNG ảnh, chỉ báo lỗi THẬT:\n' +
    '(1) Vật/địa điểm thật trong đề (cột cờ, tòa nhà, ngân hàng, hàng rào, tường, cây, người, xe...) phải vẽ ĐÚNG là vật đó; khối hộp/khối trụ/thẻ chữ thay vật thật là SAI.\n' +
    '(2) KHÔNG có vật bị vẽ LẶP (2 tòa nhà, 2 người khi đề chỉ có 1), không có vật thừa sót lại từ cảnh trước.\n' +
    '(2b) CÁCH SẮP XẾP đúng điều kiện đề: ngồi quanh BÀN TRÒN phải là vòng tròn quanh bàn (xếp hàng ngang là SAI), đúng số người / số vật và nhãn; không có vật nào đè lên vật khác.\n' +
    '(3) Số đo trên hình đúng số của đề, đặt đúng chỗ (khoảng cách nằm dưới đoạn đúng, chiều cao cạnh đúng vật, góc ở đúng đỉnh); tỉ lệ hình không mâu thuẫn số đo.\n' +
    '(4) Mọi số, phép tính, đáp số hiện trên màn hình phải đúng và khớp đáp án ' + dapAn + ' (cảnh đáp án phải hiện đúng đáp án; huy hiệu số phải đọc được rõ).\n' +
    '(5) Chữ không bị che khuất hoàn toàn đến mức không đọc được, không lộ mã LaTeX thô.\n' +
    'CHỈ trả "dung": false khi có lỗi NGHIÊM TRỌNG làm hỏng video hoặc sai toán học (sai đáp án, sai phép tính, vẽ sai hẳn vật của đề, hoặc chữ đè che khuất hoàn toàn). Các chi tiết thẩm mỹ nhỏ, khoảng cách hơi sát nhưng vẫn đọc rõ, hoặc cảnh mở đầu/chốt bài chỉ có chữ thì ĐẶT "dung": true. Phân loại từng lỗi. sai_toan gồm sai ký hiệu biến cố, công thức, phép tính hoặc đáp số. Ghi nguyên công thức sai và công thức đúng. Trả JSON: {"dung": true|false, "van_de": [{"loai":"sai_toan|bo_cuc","ly_do":"ẢNH n (cảnh ...): lỗi gì, phải sửa thế nào"}]}';
  const parts = [{text: prompt}, ...anh.map((a) => ({inline_data: {mime_type: 'image/jpeg', data: fs.readFileSync(a.tep).toString('base64')}}))];
  // cùng bộ model linh hoạt với Bộ phận 1: tự động đổi model nếu một model lỗi / 404 / hết hạn mức
  // v98.2: danh sách model sống (ListModels, cache theo ngày) xếp hạng chế độ 'nhe'; lỗi -> dự phòng sạch
  const models = catalog.hopNhat({song: await catalog.layModelSong(keys).catch(() => []), chiDinh: process.env.MODEL_AI_NHIN || '', cheDo: 'nhe'});
  const bo404 = catalog.doc404();
  const hetNgay = new Set();
  const model404 = new Set();
  const loiModel = {};
  let lyDo = 'mọi lần gọi Gemini đều lỗi';
  for (let vong = 0; vong < 3; vong++) {
    let choMs = 0;
    for (let mi = 0; mi < models.length; mi++) {
      const model = models[mi];
      if (model404.has(model) || catalog.chet404(model, keys, bo404)) continue;
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
          if (res.status === 404) {   // model không tồn tại -> nhớ cặp (model, key) trong ngày, đổi model kế ngay; Google gợi ý model mới -> chèn kế tiếp
            model404.add(model); catalog.ghi404(model, k, bo404);
            const gy = catalog.goiY404(raw);
            if (gy && !models.slice(0, mi + 1).includes(gy) && !catalog.chet404(gy, keys, bo404)) {
              const cu = models.indexOf(gy);
              if (cu > mi) models.splice(cu, 1);
              models.splice(mi + 1, 0, gy);
            }
            break;
          }
          if (res.status === 429 && /PerDay|per day|daily/i.test(raw)) { hetNgay.add(model + '|' + k); continue; }   // hết hạn mức ngày: key kế
          if (res.status === 429) { const m = /"retryDelay":\s*"(\d+)/.exec(raw); const c = Math.min(60, (m ? Number(m[1]) : 15) + 1) * 1000; choMs = choMs ? Math.min(choMs, c) : c; continue; }
          if (res.status >= 500) break; // máy chủ model này đang lỗi -> thử ngay model kế tiếp
          if (res.status === 401 || ([400, 403].includes(res.status) && /API_KEY_INVALID|API key not valid|API key expired|API_KEY_EXPIRED/i.test(raw))) { hetNgay.add(model + '|' + k); ghiKeyHong(k, res.status, raw); }
          if (res.status === 403) hetNgay.add(model + '|' + k);
          continue;
        }
        const j = await res.json().catch(() => null);
        const txt = j && j.candidates && j.candidates[0] && j.candidates[0].content && (j.candidates[0].content.parts || []).map((p) => p.text || '').join('');
        let kq = null;
        try { kq = JSON.parse(txt); } catch (e) { lyDo = model + ' trả lời không đọc được'; continue; }
        if (!kq || typeof kq.dung !== 'boolean') { lyDo = model + ' trả lời thiếu "dung"'; continue; }
        const issues = Array.isArray(kq.van_de) && kq.van_de.length ? kq.van_de : ['hình không khớp đề'];
        const loi = kq.dung ? [] : issues.map(issue => {
          const reason = String(issue?.ly_do || issue);
          const legacyMath = typeof issue === 'string' && /sai (?:ký hiệu|biến cố|toán|đáp (?:án|số)|phép tính)|nhầm.{0,40}biến cố đối|biến cố đối.{0,60}n\(A\)/i.test(reason);
          if (props.khung4tang?.batBuocVatThe && /t2_trong|thieu_hinh_vat_the/i.test(reason)) return 't2_trong: ' + reason;
          return (issue?.loai === 'sai_toan' || legacyMath ? 'AI_SAI_TOAN: ' : 'AI_NHIN_HINH: ') + reason;
        });
        console.log('AI nhìn hình (' + model + '): ' + (loi.join(' | ') || 'ĐÚNG đề'));
        return {chay: true, loi};
      }
    }
    if (!choMs || Date.now() + choMs >= hanKiemDuyet) break;
    console.log(`AI nhìn hình: mọi key đang bị giới hạn theo phút, chờ ${Math.round(choMs / 1000)} giây rồi thử lại`);
    await new Promise((r) => setTimeout(r, choMs));
  }
  return {chay: false, ly_do: lyDo, loi: []};
}
