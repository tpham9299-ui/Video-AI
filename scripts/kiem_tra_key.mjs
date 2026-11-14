// KIỂM TRA TỪNG KEY GEMINI: gọi thử một câu rất ngắn và phân loại
//   DUNG_DUOC   : key chạy tốt
//   HET_NGAY    : hết hạn mức NGÀY cho model đó (giữ key, chờ Google reset hạn mức, thường lúc 0h giờ Thái Bình Dương = 14-15h VN)
//   GIOI_HAN_PHUT: đang bị giới hạn theo phút (giữ key, bình thường)
//   LOI_THAT    : sai key / hết hiệu lực / bị khóa / chưa bật API -> nên XÓA khỏi GEMINI_KEYS
// Không in key ra nhật ký: chỉ hiện 6 ký tự đầu + 4 ký tự cuối.
// Dùng: node scripts/kiem_tra_key.mjs   (đọc GEMINI_KEYS, GEMINI_API_KEY từ biến môi trường)
import fs from 'node:fs';

const MODELS = (process.env.MODELS || 'gemini-3.8-flash,gemini-3.6-flash,gemini-flash-latest,gemini-flash-lite-latest').split(',').map((x) => x.trim()).filter(Boolean);
const tach = (s) => String(s || '').split(/[\s,;]+/).filter(Boolean);
const dsKey = tach(process.env.GEMINI_KEYS).map((k, i) => ({k, ten: `GEMINI_KEYS #${i + 1}`}));
for (const k of tach(process.env.GEMINI_API_KEY)) if (!dsKey.some((x) => x.k === k)) dsKey.push({k, ten: 'GEMINI_API_KEY'});
const ma = (k) => k.slice(0, 6) + '…' + k.slice(-4);

async function thu(k, model) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(k)}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({contents: [{parts: [{text: 'Trả lời đúng một chữ: ok'}]}], generationConfig: {maxOutputTokens: 5, temperature: 0}}),
    });
    const raw = await res.text();
    if (res.ok) return {loai: 'DUNG_DUOC'};
    const msg = ((/"message":\s*"([^"]{0,140})/.exec(raw) || [])[1] || raw.slice(0, 140)).replace(/\s+/g, ' ');
    if (res.status === 429) return /PerDay|per day|daily/i.test(raw) ? {loai: 'HET_NGAY', msg} : {loai: 'GIOI_HAN_PHUT', msg};
    if (res.status === 401 || ((res.status === 400 || res.status === 403) && /API_KEY_INVALID|API key not valid|API key expired|SERVICE_DISABLED|has not been used|is disabled|suspended|PERMISSION_DENIED|billing/i.test(raw))) return {loai: 'LOI_THAT', msg: `HTTP ${res.status}: ${msg}`};
    if (res.status === 404) return {loai: 'MODEL_KHONG_CO', msg};
    return {loai: 'LOI_KHAC', msg: `HTTP ${res.status}: ${msg}`};
  } catch (e) {
    return {loai: 'LOI_MANG', msg: String(e.message || e).slice(0, 120)};
  }
}

if (!dsKey.length) { console.log('Không có key nào trong GEMINI_KEYS / GEMINI_API_KEY'); process.exit(0); }
const ketQua = [];
for (const {k, ten} of dsKey) {
  const theoModel = {};
  let ketLuan = null;
  for (const m of MODELS) {
    const r = await thu(k, m);
    theoModel[m] = r.loai;
    if (r.loai === 'LOI_THAT') { ketLuan = {loai: 'LOI_THAT', msg: r.msg}; break; }   // key hỏng: hỏng với mọi model
    if (r.loai === 'DUNG_DUOC' && !ketLuan) ketLuan = {loai: 'DUNG_DUOC', model: m};
    if (r.loai === 'DUNG_DUOC' && m === MODELS[0]) break;   // chạy tốt với model chính: đủ
    if (!ketLuan && r.loai !== 'MODEL_KHONG_CO' && !theoModel._msg) theoModel._msg = r.msg;
    await new Promise((x) => setTimeout(x, 400));
  }
  if (!ketLuan) {
    const v = Object.entries(theoModel).filter(([m]) => m !== '_msg').map(([, l]) => l);
    ketLuan = v.includes('HET_NGAY') ? {loai: 'HET_NGAY'} : v.includes('GIOI_HAN_PHUT') ? {loai: 'GIOI_HAN_PHUT'} : {loai: v[0] || 'LOI_KHAC', msg: theoModel._msg};
  }
  ketQua.push({ten, ma: ma(k), ...ketLuan, theo_model: Object.fromEntries(Object.entries(theoModel).filter(([m]) => m !== '_msg'))});
}

const NHAN = {DUNG_DUOC: '✅ dùng được', HET_NGAY: '⏳ hết hạn mức ngày (giữ, chờ reset)', GIOI_HAN_PHUT: '⏳ đang giới hạn theo phút (giữ)', LOI_THAT: '❌ LỖI THẬT -> nên xóa', MODEL_KHONG_CO: '⚠️ không có quyền dùng các model', LOI_KHAC: '⚠️ lỗi khác', LOI_MANG: '⚠️ lỗi mạng'};
console.log('=====KET_QUA_KEY=====');
for (const r of ketQua) {
  console.log(`${r.ten} (${r.ma}): ${NHAN[r.loai] || r.loai}${r.model && r.model !== MODELS[0] ? ` [model chính ${MODELS[0]}: ${r.theo_model[MODELS[0]]}; chạy được ${r.model}]` : ''}${r.msg ? ' | ' + r.msg : ''}`);
  console.log('    theo model: ' + Object.entries(r.theo_model).map(([m, l]) => `${m}=${l}`).join(', '));
}
const dem = (l) => ketQua.filter((r) => r.loai === l).length;
console.log(`TONG: ${ketQua.length} key | dùng được ${dem('DUNG_DUOC')} | hết hạn mức ngày ${dem('HET_NGAY')} | giới hạn phút ${dem('GIOI_HAN_PHUT')} | lỗi thật ${dem('LOI_THAT')} | khác ${ketQua.length - dem('DUNG_DUOC') - dem('HET_NGAY') - dem('GIOI_HAN_PHUT') - dem('LOI_THAT')}`);
console.log('=====HET_KET_QUA_KEY=====');
// key lỗi thật: ghi để bước sau báo về Apps Script -> Zalo
const hong = ketQua.map((r, i) => ({r, i})).filter(({r}) => r.loai === 'LOI_THAT').map(({r}) => ({so: Number((/#(\d+)/.exec(r.ten) || [])[1]) || 0, dau: r.ma.replace('…', '_'), ly_do: r.msg}));
if (hong.length) fs.writeFileSync('/tmp/gemini_key_hong.json', JSON.stringify(hong));
