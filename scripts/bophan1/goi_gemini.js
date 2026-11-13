// Gọi Gemini SONG SONG cho một danh sách yêu cầu (chạy riêng một tiến trình để mã .gs đồng bộ gọi được qua execFileSync).
// Vào: đường dẫn tệp JSON {model, bodies:[...], keys:[...], batDauKey}. Ra (stdout): JSON [{ok, code, raw, het}]
// Mỗi yêu cầu dùng một key khác nhau; key bị 429 thì thử key kế tiếp.
const fs = require('fs');
const {model, bodies, keys, batDauKey = 0, gioiHanGiay = 300} = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
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
      return cuoi;   // 400/403/5xx: để mã .gs quyết định (đổi model, chờ...)
    } catch (e) {
      cuoi = {ok: false, code: 0, raw: String(e && e.message || e), het: false};
    }
  }
  if (so429 && so429 === keys.length) cuoi.het = /quota|exhausted|per day|PerDay/i.test(cuoi.raw);
  return cuoi;
}
Promise.all(bodies.map(mot)).then((kq) => process.stdout.write(JSON.stringify(kq)));
