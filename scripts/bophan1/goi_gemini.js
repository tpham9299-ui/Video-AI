// Gọi Gemini SONG SONG cho một danh sách yêu cầu (chạy riêng một tiến trình để mã .gs đồng bộ gọi được qua execFileSync).
// Vào: đường dẫn tệp JSON {model, bodies:[...], keys:[...], batDauKey}. Ra (stdout): JSON [{ok, code, raw, het}]
//
// XOAY VÒNG KEY:
//  - Key HẾT HẠN MỨC NGÀY (429 "per day") cho model này: ghi nhớ cả lần chạy, chuyển ngay sang key kế, không gọi lại key đó nữa.
//  - Key bị giới hạn THEO PHÚT (429 khác): thử key khác; mọi key đều đang bị giới hạn phút thì CHỜ đúng thời gian Google yêu cầu
//    (retryDelay, tối đa 60 giây) rồi thử lại vòng mới (tối đa 4 vòng).
//  - Key bị TỪ CHỐI (401/"API key not valid"...) ở một model: chỉ bỏ key đó cho RIÊNG model đó (key dạng mới "AQ." có thể bị
//    một model từ chối nhưng model khác vẫn chạy). Chỉ khi key bị từ chối ở >= 2 model khác nhau và CHƯA thành công lần nào
//    mới ghi /tmp/gemini_key_hong.json để báo người dùng gỡ.
//  - Mọi key còn dùng được đều hết hạn mức ngày -> het = true (mã .gs chuyển sang model khác hoặc tạm nghỉ).
const fs = require('fs');
const os = require('os');
const path = require('path');
const cauHinh = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const {model, bodies, batDauKey = 0, gioiHanGiay = 300} = cauHinh;
// GỌI DỰ PHÒNG SONG SONG: model chính chưa trả lời sau "hedgeGiay" giây (thường do quá tải) -> gọi thêm model dự phòng bằng key khác,
// lấy kết quả nào về trước. Không tốn thêm khi model chính trả lời nhanh.
const duPhong = (cauHinh.duPhong || []).filter((m) => m && m !== model);
const hedgeGiay = Number(cauHinh.hedgeGiay) || 80;
const TEP_KEY_HONG = path.join(os.tmpdir(), 'gemini_key_hong.txt');
const TEP_KEY_HONG_JSON = path.join(os.tmpdir(), 'gemini_key_hong.json');
const TEP_HET_NGAY = path.join(os.tmpdir(), 'gemini_key_het_ngay.txt');
const maKey = (k) => k.slice(0, 6) + '_' + k.slice(-4);   // nhận diện key: 6 ký tự đầu + 4 cuối (nhiều key chung phần đầu)
const docDong = (t) => (fs.existsSync(t) ? fs.readFileSync(t, 'utf8') : '').split('\n').filter(Boolean);
const hong = new Set(docDong(TEP_KEY_HONG));   // key hỏng thật (đã xác nhận)
const TEP_TU_CHOI = path.join(os.tmpdir(), 'gemini_key_tu_choi.txt');   // "model|key" bị từ chối
const TEP_TOT = path.join(os.tmpdir(), 'gemini_key_tot.txt');            // key đã thành công ít nhất 1 lần
const tuChoi = new Set(docDong(TEP_TU_CHOI));
const tot = new Set(docDong(TEP_TOT));
const hetNgay = new Set(docDong(TEP_HET_NGAY));   // dạng "model|key"
const tatCa = cauHinh.keys || [];
const GOC_API = process.env.GEMINI_GOC || 'https://generativelanguage.googleapis.com';   // chỉ đổi khi chạy thử với máy chủ giả
const url = (k, md = model) => `${GOC_API}/v1beta/models/${encodeURIComponent(md)}:generateContent?key=${encodeURIComponent(k)}`;
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
function ghiTuChoi(k, code, raw, model) {
  const khoa = model + '|' + k;
  if (!tuChoi.has(khoa)) { tuChoi.add(khoa); try { fs.appendFileSync(TEP_TU_CHOI, khoa + '\n'); } catch (e) { /* bỏ */ } }
  process.stderr.write(`KEY_TU_CHOI: key thứ ${tatCa.indexOf(k) + 1} (${maKey(k)}) bị ${model} từ chối (HTTP ${code}) -> bỏ key này cho model này\n`);
  const soModel = new Set([...tuChoi].filter((x) => x.endsWith('|' + k)).map((x) => x.split('|')[0])).size;
  if (soModel >= 2 && !tot.has(k)) ghiKeyHong(k, code, raw);
}
function ghiTot(k) { if (!tot.has(k)) { tot.add(k); try { fs.appendFileSync(TEP_TOT, k + '\n'); } catch (e) { /* bỏ */ } } }
function ghiKeyHong(k, code, raw) {
  if (hong.has(k)) return;
  hong.add(k);
  const so = tatCa.indexOf(k) + 1;
  const ly = lyDoHong(code, raw);
  try { fs.appendFileSync(TEP_KEY_HONG, k + '\n'); } catch (e) { /* bỏ */ }
  try {
    const ds = fs.existsSync(TEP_KEY_HONG_JSON) ? JSON.parse(fs.readFileSync(TEP_KEY_HONG_JSON, 'utf8')) : [];
    if (!ds.some((x) => x.dau === maKey(k))) ds.push({so, dau: maKey(k), ly_do: ly});
    fs.writeFileSync(TEP_KEY_HONG_JSON, JSON.stringify(ds));
  } catch (e) { /* bỏ */ }
  process.stderr.write(`KEY_HONG: key thứ ${so} trong GEMINI_KEYS (${maKey(k)}) lỗi thật: ${ly} -> bỏ qua, sẽ báo Zalo\n`);
}
function ghiHetNgay(k, model) {
  const khoa = model + '|' + k;
  if (hetNgay.has(khoa)) return;
  hetNgay.add(khoa);
  try { fs.appendFileSync(TEP_HET_NGAY, khoa + '\n'); } catch (e) { /* bỏ */ }
  process.stderr.write(`KEY_HET_NGAY: key thứ ${tatCa.indexOf(k) + 1} hết hạn mức ngày cho ${model} -> chuyển key khác\n`);
}

async function motModel(model, body, i, huy) {
  let cuoi = {ok: false, code: 0, raw: 'KHONG_CO_KEY', het: false};
  for (let vong = 0; vong < 4; vong++) {
    const dung = tatCa.filter((k) => !hong.has(k) && !hetNgay.has(model + '|' + k) && !tuChoi.has(model + '|' + k));
    if (!dung.length) break;
    let choMs = 0;   // >0: có key chỉ bị giới hạn theo phút -> chờ rồi thử vòng mới
    for (let lan = 0; lan < dung.length; lan++) {
      if (huy && huy.xong) return {ok: false, code: 0, raw: 'DA_CO_KET_QUA', het: false};
      const k = dung[(batDauKey + i + lan) % dung.length];
      if (hong.has(k) || hetNgay.has(model + '|' + k) || tuChoi.has(model + '|' + k)) continue;
      try {
        const ac = new AbortController();
        const hen = setTimeout(() => ac.abort(), gioiHanGiay * 1000);
        if (huy) huy.ds.push(ac);
        const res = await fetch(url(k, model), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: ac.signal});
        clearTimeout(hen);
        const raw = await res.text();
        if (res.ok) { ghiTot(k); return {ok: true, code: res.status, raw}; }
        cuoi = {ok: false, code: res.status, raw, het: false};
        const loai = phanLoai(res.status, raw);
        if (loai === 'het_ngay') { ghiHetNgay(k, model); continue; }
        if (loai === 'hong') { ghiTuChoi(k, res.status, raw, model); continue; }
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
  const conKey = tatCa.filter((k) => !hong.has(k) && !tuChoi.has(model + '|' + k));
  if (conKey.length && conKey.every((k) => hetNgay.has(model + '|' + k))) cuoi.het = true;
  if (!conKey.length) cuoi = {ok: false, code: 401, raw: 'MOI_KEY_DEU_HONG', het: false};
  return cuoi;
}
// một yêu cầu: model chính; quá hedgeGiay giây chưa xong thì chạy song song model dự phòng (key lệch đi để không trùng key).
// Lấy kết quả THÀNH CÔNG về trước. Model chính lỗi nhanh (trước hedgeGiay) thì trả lỗi đó ngay cho mã .gs xử lý như cũ.
function mot(body, i) {
  if (!duPhong.length) return motModel(model, body, i, null);
  const huy = {xong: false, ds: []};
  return new Promise((giai) => {
    let kqChinh = null, chinhXong = false, phuChay = false, phuXong = false, hen = null;
    const ket = (r) => {
      if (huy.xong) return;
      huy.xong = true;
      clearTimeout(hen);
      huy.ds.forEach((ac) => { try { ac.abort(); } catch (e) { /* bỏ */ } });
      giai(r);
    };
    hen = setTimeout(() => {
      if (huy.xong) return;
      phuChay = true;
      process.stderr.write(`GOI_DU_PHONG: ${model} chưa trả lời sau ${hedgeGiay} giây -> gọi song song ${duPhong[0]}\n`);
      motModel(duPhong[0], body, i + 5, huy).then((r) => {
        phuXong = true;
        if (r && r.ok) { r.model = duPhong[0]; process.stderr.write(`GOI_DU_PHONG: dùng kết quả của ${duPhong[0]} (về trước)\n`); ket(r); }
        else if (chinhXong) ket(kqChinh);
      }, () => { phuXong = true; if (chinhXong) ket(kqChinh); });
    }, hedgeGiay * 1000);
    motModel(model, body, i, huy).then((r) => {
      chinhXong = true; kqChinh = r;
      if ((r && r.ok) || !phuChay || phuXong) ket(r);
    }, (e) => { chinhXong = true; kqChinh = {ok: false, code: 0, raw: String((e && e.message) || e), het: false}; if (!phuChay || phuXong) ket(kqChinh); });
  });
}
Promise.all(bodies.map(mot)).then((kq) => { process.stdout.write(JSON.stringify(kq)); process.exit(0); });
