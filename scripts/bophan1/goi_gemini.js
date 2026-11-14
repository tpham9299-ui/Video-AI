// Gọi Gemini SONG SONG cho một danh sách yêu cầu (chạy riêng một tiến trình để mã .gs đồng bộ gọi được qua execFileSync).
// Vào: đường dẫn tệp JSON {model, bodies:[...], keys:[...], batDauKey}. Ra (stdout): JSON [{ok, code, raw, het}]
//
// XOAY VÒNG KEY:
//  - Key HẾT HẠN MỨC NGÀY (429 "per day") cho model này: ghi nhớ cả lần chạy, chuyển ngay sang key kế, không gọi lại key đó nữa.
//  - Key bị giới hạn THEO PHÚT (429 khác): thử key khác; mọi key đều đang bị giới hạn phút thì CHỜ đúng thời gian Google yêu cầu
//    (retryDelay, tối đa 60 giây) rồi thử lại vòng mới (tối đa 4 vòng).
//  - Key LỖI THẬT (sai key, hết hiệu lực, bị khóa, chưa bật API...): ghi vào /tmp/gemini_key_hong.json để báo người dùng gỡ,
//    bỏ qua key đó cho mọi lần gọi sau.
//  - Mọi key còn dùng được đều hết hạn mức ngày -> het = true (mã .gs chuyển sang model khác hoặc tạm nghỉ).
const fs = require('fs');
const os = require('os');
const path = require('path');
const cauHinh = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const {model, bodies, batDauKey = 0, gioiHanGiay = 300} = cauHinh;
const TEP_KEY_HONG = path.join(os.tmpdir(), 'gemini_key_hong.txt');
const TEP_KEY_HONG_JSON = path.join(os.tmpdir(), 'gemini_key_hong.json');
const TEP_HET_NGAY = path.join(os.tmpdir(), 'gemini_key_het_ngay.txt');
const docDong = (t) => (fs.existsSync(t) ? fs.readFileSync(t, 'utf8') : '').split('\n').filter(Boolean);
const hong = new Set(docDong(TEP_KEY_HONG));
const hetNgay = new Set(docDong(TEP_HET_NGAY));   // dạng "model|key"
const tatCa = cauHinh.keys || [];
const url = (k) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(k)}`;
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

// phân loại lỗi của MỘT key
function phanLoai(code, raw) {
  if (code === 429) return /PerDay|per day|daily/i.test(raw) ? 'het_ngay' : 'phut';
  if (code === 401) return 'hong';
  if ((code === 400 || code === 403) && /API_KEY_INVALID|API key not valid|API key expired|API_KEY_EXPIRED|SERVICE_DISABLED|has not been used|is disabled|CONSUMER_SUSPENDED|suspended|PERMISSION_DENIED|billing/i.test(raw)) return 'hong';
  return 'khac';
}
function lyDoHong(code, raw) {
  const m = /"message":\s*"([^"]{0,160})/.exec(raw);
  return `HTTP ${code}: ${(m ? m[1] : raw).replace(/\s+/g, ' ').slice(0, 160)}`;
}
function ghiKeyHong(k, code, raw) {
  if (hong.has(k)) return;
  hong.add(k);
  const so = tatCa.indexOf(k) + 1;
  const ly = lyDoHong(code, raw);
  try { fs.appendFileSync(TEP_KEY_HONG, k + '\n'); } catch (e) { /* bỏ */ }
  try {
    const ds = fs.existsSync(TEP_KEY_HONG_JSON) ? JSON.parse(fs.readFileSync(TEP_KEY_HONG_JSON, 'utf8')) : [];
    if (!ds.some((x) => x.dau === k.slice(0, 8))) ds.push({so, dau: k.slice(0, 8), ly_do: ly});
    fs.writeFileSync(TEP_KEY_HONG_JSON, JSON.stringify(ds));
  } catch (e) { /* bỏ */ }
  process.stderr.write(`KEY_HONG: key thứ ${so} trong GEMINI_KEYS (bắt đầu ${k.slice(0, 6)}…) lỗi thật: ${ly} -> bỏ qua, sẽ báo Zalo\n`);
}
function ghiHetNgay(k) {
  const khoa = model + '|' + k;
  if (hetNgay.has(khoa)) return;
  hetNgay.add(khoa);
  try { fs.appendFileSync(TEP_HET_NGAY, khoa + '\n'); } catch (e) { /* bỏ */ }
  process.stderr.write(`KEY_HET_NGAY: key thứ ${tatCa.indexOf(k) + 1} hết hạn mức ngày cho ${model} -> chuyển key khác\n`);
}

async function mot(body, i) {
  let cuoi = {ok: false, code: 0, raw: 'KHONG_CO_KEY', het: false};
  for (let vong = 0; vong < 4; vong++) {
    const dung = tatCa.filter((k) => !hong.has(k) && !hetNgay.has(model + '|' + k));
    if (!dung.length) break;
    let choMs = 0;   // >0: có key chỉ bị giới hạn theo phút -> chờ rồi thử vòng mới
    for (let lan = 0; lan < dung.length; lan++) {
      const k = dung[(batDauKey + i + lan) % dung.length];
      if (hong.has(k) || hetNgay.has(model + '|' + k)) continue;
      try {
        const ac = new AbortController();
        const hen = setTimeout(() => ac.abort(), gioiHanGiay * 1000);
        const res = await fetch(url(k), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: ac.signal});
        clearTimeout(hen);
        const raw = await res.text();
        if (res.ok) return {ok: true, code: res.status, raw};
        cuoi = {ok: false, code: res.status, raw, het: false};
        const loai = phanLoai(res.status, raw);
        if (loai === 'het_ngay') { ghiHetNgay(k); continue; }
        if (loai === 'hong') { ghiKeyHong(k, res.status, raw); continue; }
        if (loai === 'phut') {
          const m = /"retryDelay":\s*"(\d+)/.exec(raw);
          const cho = Math.min(60, (m ? Number(m[1]) : 15) + 1) * 1000;
          choMs = choMs ? Math.min(choMs, cho) : cho;
          continue;
        }
        return cuoi;   // 400/5xx không phải lỗi key: để mã .gs quyết định (đổi model, chờ...)
      } catch (e) {
        cuoi = {ok: false, code: 0, raw: String((e && e.message) || e), het: false};
      }
    }
    if (!choMs) break;
    process.stderr.write(`Gemini: mọi key đang bị giới hạn theo phút, chờ ${Math.round(choMs / 1000)} giây rồi thử lại\n`);
    await ngu(choMs);
  }
  // không còn key nào dùng được vì hết hạn mức ngày (key hỏng không tính) -> báo hết hạn mức để đổi model / tạm nghỉ
  const conKey = tatCa.filter((k) => !hong.has(k));
  if (conKey.length && conKey.every((k) => hetNgay.has(model + '|' + k))) cuoi.het = true;
  if (!conKey.length) cuoi = {ok: false, code: 401, raw: 'MOI_KEY_DEU_HONG', het: false};
  return cuoi;
}
Promise.all(bodies.map(mot)).then((kq) => process.stdout.write(JSON.stringify(kq)));
