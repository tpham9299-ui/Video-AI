// Gọi Gemini SONG SONG cho một danh sách yêu cầu (chạy riêng một tiến trình để mã .gs đồng bộ gọi được qua execFileSync).
// Vào: đường dẫn tệp JSON {model, bodies:[...], keys:[...], batDauKey}. Ra (stdout): JSON [{ok, code, raw, het}]
// Mỗi yêu cầu dùng một key khác nhau; key bị 429 thì thử key kế tiếp.
const fs = require('fs');
const cauHinh = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const {model, bodies, batDauKey = 0, gioiHanGiay = 300} = cauHinh;
// key đã biết là hỏng (lần gọi trước ghi lại) thì bỏ qua luôn
const TEP_KEY_HONG = require('path').join(require('os').tmpdir(), 'gemini_key_hong.txt');
const hong = new Set((fs.existsSync(TEP_KEY_HONG) ? fs.readFileSync(TEP_KEY_HONG, 'utf8') : '').split('\n').filter(Boolean));
const keys = cauHinh.keys.filter((k) => !hong.has(k)).length ? cauHinh.keys.filter((k) => !hong.has(k)) : cauHinh.keys;
const url = (k) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(k)}`;
async function mot(body, i) {
  let cuoi = {ok: false, code: 0, raw: 'KHONG_CO_KEY', het: false};
  let so429 = 0;
  for (let lan = 0; lan < keys.length; lan++) {
    const k = keys[(batDauKey + i + lan) % keys.length];
    try {
      const ac = new AbortController();
      const hen = setTimeout(() => ac.abort(), gioiHanGiay * 1000);
      const res = await fetch(url(k), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: ac.signal});
      clearTimeout(hen);
      const raw = await res.text();
      if (res.ok) return {ok: true, code: res.status, raw};
      cuoi = {ok: false, code: res.status, raw, het: false};
      if (res.status === 429) { so429++; continue; }   // key này hết lượt/tốc độ: thử key khác
      // KEY HỎNG (401, hoặc 400/403 "API key not valid"): ghi nhớ để các lần gọi sau bỏ qua, thử ngay key khác (không đổi model)
      if (res.status === 401 || (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED.*key/i.test(raw) && (res.status === 400 || res.status === 403))) {
        try { fs.appendFileSync(TEP_KEY_HONG, k + '\n'); } catch (e) { /* bỏ */ }
        if (!hong.has(k)) { hong.add(k); process.stderr.write(`KEY_HONG: key thứ ${cauHinh.keys.indexOf(k) + 1} trong GEMINI_KEYS không hợp lệ (bắt đầu ${k.slice(0, 6)}…), sẽ bỏ qua\n`); }
        continue;
      }
      return cuoi;   // 400/403/5xx: để mã .gs quyết định (đổi model, chờ...)
    } catch (e) {
      cuoi = {ok: false, code: 0, raw: String(e && e.message || e), het: false};
    }
  }
  if (so429 && so429 === keys.length) cuoi.het = /quota|exhausted|per day|PerDay/i.test(cuoi.raw);
  return cuoi;
}
Promise.all(bodies.map(mot)).then((kq) => process.stdout.write(JSON.stringify(kq)));
