// KIỂM TRA TỪNG KEY GEMINI: gọi thử một câu rất ngắn và phân loại
//   DUNG_DUOC   : key chạy tốt
//   HET_NGAY    : hết hạn mức NGÀY cho model đó (giữ key, chờ Google reset hạn mức, thường lúc 0h giờ Thái Bình Dương = 14-15h VN)
//   GIOI_HAN_PHUT: đang bị giới hạn theo phút (giữ key, bình thường)
//   LOI_THAT    : sai key / hết hiệu lực / bị khóa -> nên XÓA khỏi GEMINI_KEYS
// Không in key ra nhật ký: chỉ hiện 6 ký tự đầu + 4 ký tự cuối.
// Dùng: node scripts/kiem_tra_key.mjs   (đọc GEMINI_KEYS, GEMINI_API_KEY từ biến môi trường)
import fs from 'node:fs';
import catalog from './bophan1/model_gemini.cjs';

const MODELS = (process.env.MODELS || 'gemini-2.5-flash,gemini-flash-latest,gemini-2.5-pro,gemini-2.0-flash,gemini-flash-lite-latest').split(',').map((x) => x.trim()).filter(Boolean);
const tach = (s) => String(s || '').split(/[\s,;]+/).filter(Boolean);
const dsKey = tach(process.env.GEMINI_KEYS).map((k, i) => ({k, ten: `GEMINI_KEYS #${i + 1}`}));
for (const k of tach(process.env.GEMINI_API_KEY)) if (!dsKey.some((x) => x.k === k)) dsKey.push({k, ten: 'GEMINI_API_KEY'});
const ma = (k) => k.slice(0, 6) + '…' + k.slice(-4);

async function thu(k, model) {
  try {
    const ac = new AbortController();
    const hen = setTimeout(() => ac.abort(), 45000);   // mỗi lần thử tối đa 45 giây (không treo cả bước)
    const genCfg = {maxOutputTokens: 16, temperature: 0};
    if (/^gemini-(2\.5-flash)/i.test(model)) genCfg.thinkingConfig = {thinkingBudget: 0};
    else if (/2\.5-pro/i.test(model)) genCfg.thinkingConfig = {thinkingBudget: 128};
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(k)}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, signal: ac.signal,
      body: JSON.stringify({contents: [{parts: [{text: 'Trả lời đúng một chữ: ok'}]}], generationConfig: genCfg}),
    }).finally(() => clearTimeout(hen));
    const raw = await res.text();
    if (res.ok) return {loai: 'DUNG_DUOC'};
    const msg = ((/"message":\s*"([^"]{0,140})/.exec(raw) || [])[1] || raw.slice(0, 140)).replace(/\s+/g, ' ');
    if (res.status === 429 && /\blimit:\s*0\b|"quotaValue":\s*"?0\b/i.test(raw)) return {loai: 'QUOTA_BANG_0', msg};
    if (res.status === 429) return /PerDay|per day|daily/i.test(raw) ? {loai: 'HET_NGAY', msg} : {loai: 'GIOI_HAN_PHUT', msg};
    if (res.status === 401 || ((res.status === 400 || res.status === 403) && /API_KEY_INVALID|API key not valid|API key expired|API_KEY_EXPIRED/i.test(raw))) return {loai: 'LOI_THAT', msg: `HTTP ${res.status}: ${msg}`};
    if (res.status === 403) return {loai: 'THIEU_QUYEN', msg};
    if (res.status === 404) return {loai: 'MODEL_KHONG_CO', msg};
    return {loai: 'LOI_KHAC', msg: `HTTP ${res.status}: ${msg}`};
  } catch (e) {
    return {loai: 'LOI_MANG', msg: /abort/i.test(String(e && e.name) + String(e && e.message)) ? 'quá 45 giây không trả lời' : String(e.message || e).slice(0, 120)};
  }
}

if (!dsKey.length) { console.log('Không có key nào trong GEMINI_KEYS / GEMINI_API_KEY'); process.exit(0); }
const ketQua = [];
for (const {k, ten} of dsKey) {
  const theoModel = {}, lyDo = {};
  const danhMuc = process.env.MODELS ? [] : await catalog.modelVanBan(k).catch(() => []);
  const models = danhMuc.length
    ? [...new Set([...MODELS.filter((m) => danhMuc.includes(m)), ...danhMuc])].slice(0, 5)
    : MODELS;
  for (const m of models) {
    const r = await thu(k, m);
    theoModel[m] = r.loai;
    if (r.msg) lyDo[m] = r.msg;
    if (!process.env.MODELS && ['DUNG_DUOC', 'LOI_THAT'].includes(r.loai)) break;
  }
  const v = Object.values(theoModel);
  const chay = models.filter((m) => theoModel[m] === 'DUNG_DUOC');
  const ketLuan = chay.length ? {loai: 'DUNG_DUOC', model: chay[0]}
    : v.includes('GIOI_HAN_PHUT') ? {loai: 'GIOI_HAN_PHUT'} : v.includes('HET_NGAY') ? {loai: 'HET_NGAY'}
    : v.includes('LOI_THAT') ? {loai: 'LOI_THAT', msg: Object.values(lyDo)[0]}
    : {loai: v.find((x) => x !== 'MODEL_KHONG_CO') || 'MODEL_KHONG_CO', msg: Object.values(lyDo)[0]};
  ketQua.push({ten, ma: ma(k), ...ketLuan, theo_model: theoModel, ly_do: lyDo});
  console.log(`đã thử ${ten} (${ma(k)}): ${ketLuan.loai}`);
}

const NHAN = {DUNG_DUOC: '✅ dùng được', HET_NGAY: '⏳ hết hạn mức ngày (giữ, chờ reset)', GIOI_HAN_PHUT: '⏳ đang giới hạn theo phút (giữ)', LOI_THAT: '❌ LỖI THẬT -> nên xóa', QUOTA_BANG_0: '⚠️ quota của model bằng 0, kiểm tra dự án và gói API', THIEU_QUYEN: '⚠️ kiểm tra quyền API hoặc cấu hình dự án', MODEL_KHONG_CO: '⚠️ model không khả dụng', LOI_KHAC: '⚠️ lỗi khác', LOI_MANG: '⚠️ lỗi mạng'};
console.log('=====KET_QUA_KEY=====');
for (const r of ketQua) {
  console.log(`${r.ten} (${r.ma}): ${NHAN[r.loai] || r.loai}${r.model && r.model !== MODELS[0] ? ` [model chính ${MODELS[0]}: ${r.theo_model[MODELS[0]] || 'chưa thử'}; chạy được: ${Object.keys(r.theo_model).filter((m) => r.theo_model[m] === 'DUNG_DUOC').join(', ')}]` : ''}${r.msg ? ' | ' + r.msg : ''}`);
  console.log('    theo model: ' + Object.entries(r.theo_model).map(([m, l]) => `${m}=${l}${l !== 'DUNG_DUOC' && r.ly_do[m] ? ' (' + r.ly_do[m].slice(0, 70) + ')' : ''}`).join(', '));
}
const dem = (l) => ketQua.filter((r) => r.loai === l).length;
const conXaiDuoc = dem('DUNG_DUOC');
const dongTomTat = `📊 TỔNG: ${ketQua.length} key | ✅ Đang dùng tốt: ${conXaiDuoc} key | Giới hạn phút: ${dem('GIOI_HAN_PHUT')} | Quota bằng 0: ${dem('QUOTA_BANG_0')} | Thiếu quyền: ${dem('THIEU_QUYEN')} | ⏳ Hết hạn mức ngày: ${dem('HET_NGAY')} key (chờ reset) | ❌ Lỗi thật: ${dem('LOI_THAT')} key`;
console.log(dongTomTat);
console.log('=====HET_KET_QUA_KEY=====');
const chiTietDong = ketQua.map((r) => `• ${r.ten} (${r.ma}): ${NHAN[r.loai] || r.loai}${r.model ? ` [${r.model}]` : ''}`).join('\n');
fs.writeFileSync('/tmp/gemini_key_bao_cao.json', JSON.stringify({
  tong: ketQua.length,
  dung_duoc: conXaiDuoc,
  het_ngay: dem('HET_NGAY'),
  loi_that: dem('LOI_THAT'),
  bao_cao: `${dongTomTat}\n${chiTietDong}`,
}));
// key lỗi thật: ghi để bước sau báo về Apps Script -> Zalo
const hong = ketQua.map((r, i) => ({r, i})).filter(({r}) => r.loai === 'LOI_THAT').map(({r}) => ({so: Number((/#(\d+)/.exec(r.ten) || [])[1]) || 0, dau: r.ma.replace('…', '_'), ly_do: r.msg}));
if (hong.length) fs.writeFileSync('/tmp/gemini_key_hong.json', JSON.stringify(hong));
