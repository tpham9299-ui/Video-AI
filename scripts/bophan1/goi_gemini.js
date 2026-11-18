// Gọi Gemini SONG SONG cho một danh sách yêu cầu (chạy riêng một tiến trình để mã .gs đồng bộ gọi được qua execFileSync).
// Vào: đường dẫn tệp JSON {model, bodies:[...], keys:[...], batDauKey}. Ra (stdout): JSON [{ok, code, raw, het}]
//
const fs = require('fs');
const os = require('os');
const path = require('path');
const cauHinh = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const {model, bodies, batDauKey = 0, gioiHanGiay = 300} = cauHinh;
// GỌI DỰ PHÒNG SONG SONG & TỰ ĐỘNG ĐỔI MODEL:
//  - Danh sách model linh hoạt (models): khi một model lỗi (404 không tồn tại, 400 không hỗ trợ, 429 hết hạn mức, 500/503 quá tải),
//    hệ thống tự động chuyển ngay sang model tiếp theo trong chuỗi mà không cố định 1 model.
//  - Model chính chưa trả lời sau "hedgeGiay" giây -> gọi song song model dự phòng bằng key khác, lấy kết quả nào về trước.
const duPhong = (cauHinh.duPhong || []).filter((m) => m && m !== model);
const chuoiModel = [...new Set([model, ...(cauHinh.models || []), ...duPhong, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-flash-lite-latest'].filter(Boolean))];
const hedgeGiay = Number(cauHinh.hedgeGiay) || 0;
const TEP_KEY_HONG = path.join(os.tmpdir(), 'gemini_key_hong.txt');
const TEP_KEY_HONG_JSON = path.join(os.tmpdir(), 'gemini_key_hong.json');
const TEP_HET_NGAY = path.join(os.tmpdir(), 'gemini_key_het_ngay.txt');
const TEP_MODEL_404 = path.join(os.tmpdir(), 'gemini_model_khong_co.txt');
const TEP_MODEL_TOT = path.join(os.tmpdir(), 'gemini_model_tot_nhat.txt');
const maKey = (k) => k.slice(0, 6) + '_' + k.slice(-4);   // nhận diện key: 6 ký tự đầu + 4 cuối (nhiều key chung phần đầu)
const docDong = (t) => (fs.existsSync(t) ? fs.readFileSync(t, 'utf8') : '').split('\n').filter(Boolean);
const hong = new Set(docDong(TEP_KEY_HONG));   // key hỏng thật (đã xác nhận)
const model404 = new Set(docDong(TEP_MODEL_404)); // model không tồn tại (HTTP 404) -> bỏ qua ngay
const TEP_TU_CHOI = path.join(os.tmpdir(), 'gemini_key_tu_choi.txt');   // "model|key" bị từ chối
const tuChoi = new Set(docDong(TEP_TU_CHOI));
const hetNgay = new Set(docDong(TEP_HET_NGAY));   // dạng "model|key"
const tatCa = [...new Set(cauHinh.keys || [])];
const nghiDen = new Map();
const GOC_API = process.env.GEMINI_GOC || 'https://generativelanguage.googleapis.com';   // chỉ đổi khi chạy thử với máy chủ giả
const url = (k, md = model) => `${GOC_API}/v1beta/models/${encodeURIComponent(md)}:generateContent?key=${encodeURIComponent(k)}`;
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

// phân loại lỗi của MỘT key / model
function phanLoai(code, raw) {
  if (code === 404 || (code === 400 && /not found|not supported for generateContent|is not found/i.test(raw))) return 'model_404';
  if (code === 429 && /\blimit:\s*0\b|"quotaValue":\s*"?0\b/i.test(raw)) return 'tu_choi';
  if (code === 429) return /PerDay|per day|daily/i.test(raw) ? 'het_ngay' : 'phut';
  if (code === 401) return 'hong';
  if ((code === 400 || code === 403) && /API_KEY_INVALID|API key not valid|API key expired|API_KEY_EXPIRED/i.test(raw)) return 'hong';
  if (code === 403) return 'tu_choi';
  return 'khac';
}
function ghiModel404(md) {
  if (!md || model404.has(md)) return;
  model404.add(md);
  try { fs.appendFileSync(TEP_MODEL_404, md + '\n'); } catch (e) { /* bỏ */ }
  process.stderr.write(`MODEL_KHONG_CO: model ${md} không tồn tại/không hỗ trợ (HTTP 404) -> tự động đổi sang model khác\n`);
}
function ghiModelTot(md) {
  try { fs.writeFileSync(TEP_MODEL_TOT, String(md || '').trim()); } catch (e) { /* bỏ */ }
}
function chuanBodyChoModel(md, body) {
  if (!body || !body.generationConfig || !body.generationConfig.thinkingConfig) return body;
  const config = body.generationConfig.thinkingConfig;
  if (/^gemini-2\.5/i.test(md) && config.thinkingBudget != null && !(config.thinkingBudget === 0 && /pro/i.test(md))) return body;
  if (/^gemini-3/i.test(md) && config.thinkingLevel) return body;
  const b = JSON.parse(JSON.stringify(body));
  if (b.generationConfig) delete b.generationConfig.thinkingConfig;
  return b;
}
const {modelVanBan} = require('./model_gemini.cjs');
let danhMuc;
function tuTimModelTrenApi() {
  if (!danhMuc) danhMuc = (async () => {
    for (const k of tatCa.filter((k) => !hong.has(k))) {
      const ds = await modelVanBan(k, GOC_API).catch(() => []);
      if (ds.length) return ds;
    }
    return [];
  })();
  return danhMuc;
}
function lyDoHong(code, raw) {
  const m = /"message":\s*"([^"]{0,160})/.exec(raw);
  return `HTTP ${code}: ${(m ? m[1] : raw).replace(/\s+/g, ' ').slice(0, 160)}`;
}
function ghiTuChoi(k, code, model) {
  const khoa = model + '|' + k;
  if (!tuChoi.has(khoa)) { tuChoi.add(khoa); try { fs.appendFileSync(TEP_TU_CHOI, khoa + '\n'); } catch (e) { /* bỏ */ } }
  process.stderr.write(`KEY_TU_CHOI: key thứ ${tatCa.indexOf(k) + 1} (${maKey(k)}) bị ${model} từ chối (HTTP ${code}) -> bỏ key này cho model này\n`);
}
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

async function motModel(model, body, i, huy, soVong = 2) {
  if (model404.has(model)) return {ok: false, code: 404, raw: 'MODEL_KHONG_CO: ' + model, het: false};
  let bodyGui = chuanBodyChoModel(model, body);
  let cuoi = {ok: false, code: 0, raw: 'KHONG_CO_KEY', het: false};
  for (let vong = 0; vong < soVong; vong++) {
    const dung = tatCa.filter((k) => !hong.has(k) && !hetNgay.has(model + '|' + k) && !tuChoi.has(model + '|' + k));
    if (!dung.length) break;
    let choMs = 0;   // >0: có key chỉ bị giới hạn theo phút -> chờ rồi thử vòng mới
    for (let lan = 0; lan < dung.length; lan++) {
      if (huy && huy.xong) return {ok: false, code: 0, raw: 'DA_CO_KET_QUA', het: false};
      const k = dung[(batDauKey + i + lan) % dung.length];
      if (hong.has(k) || hetNgay.has(model + '|' + k) || tuChoi.has(model + '|' + k)) continue;
      const khoa = model + '|' + k;
      const conNghi = (nghiDen.get(khoa) || 0) - Date.now();
      if (conNghi > 0) {
        choMs = choMs ? Math.min(choMs, conNghi) : conNghi;
        cuoi = {ok: false, code: 429, raw: 'GIOI_HAN_TOC_DO', het: false, model};
        continue;
      }
      let hen = null;
      try {
        const ac = new AbortController();
        hen = setTimeout(() => ac.abort(), gioiHanGiay * 1000);
        if (huy) huy.ds.push(ac);
        const res = await fetch(url(k, model), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(bodyGui), signal: ac.signal});
        const raw = await res.text();
        if (res.ok) { ghiModelTot(model); return {ok: true, code: res.status, raw, model}; }
        cuoi = {ok: false, code: res.status, raw, het: false, model};
        const loai = phanLoai(res.status, raw);
        if (loai === 'model_404') { ghiModel404(model); return cuoi; }
        // Nếu lỗi 400 do thinkingConfig không tương thích với model này -> bỏ thinkingConfig và thử lại ngay
        if (res.status === 400 && /thinking/i.test(raw) && bodyGui.generationConfig && bodyGui.generationConfig.thinkingConfig) {
          bodyGui = JSON.parse(JSON.stringify(bodyGui));
          delete bodyGui.generationConfig.thinkingConfig;
          lan--;
          continue;
        }
        if (loai === 'het_ngay') { ghiHetNgay(k, model); continue; }
        if (loai === 'hong') { ghiKeyHong(k, res.status, raw); continue; }
        if (loai === 'tu_choi') { ghiTuChoi(k, res.status, model); continue; }
        if (loai === 'phut') {
          const m = /"retryDelay":\s*"(\d+)/.exec(raw);
          const cho = ((m ? Number(m[1]) : 12) + 1) * 1000;
          nghiDen.set(khoa, Date.now() + cho);
          choMs = choMs ? Math.min(choMs, cho) : cho;
          continue;
        }
        return cuoi;   // 400/5xx không phải lỗi key: chuyển sang model tiếp theo
      } catch (e) {
        if (huy && huy.xong) return {ok: false, code: 0, raw: 'DA_CO_KET_QUA', het: false};
        cuoi = {ok: false, code: 0, raw: String((e && e.message) || e), het: false, model};
      } finally {
        if (hen) clearTimeout(hen);
      }
    }
    if (!choMs || vong + 1 >= soVong || choMs > 45000) break;
    process.stderr.write(`Gemini (${model}): mọi key đang bị giới hạn theo phút, chờ ${Math.round(choMs / 1000)} giây rồi thử lại\n`);
    await ngu(choMs);
  }
  const conKey = tatCa.filter((k) => !hong.has(k) && !tuChoi.has(model + '|' + k));
  if (conKey.length && conKey.every((k) => hetNgay.has(model + '|' + k))) return {ok: false, code: 429, raw: 'HET_HAN_MUC_NGAY', het: true, model};
  if (!conKey.length && tatCa.some((k) => !hong.has(k))) return {ok: false, code: 403, raw: 'MODEL_TU_CHOI', het: false, model};
  if (tatCa.length && tatCa.every((k) => hong.has(k))) cuoi = {ok: false, code: 401, raw: 'MOI_KEY_DEU_HONG', het: false, model};
  return cuoi;
}

// Thử lần lượt các model trong chuỗi linh hoạt: hễ model hiện tại lỗi (404, 400, 429 hết hạn mức, 500, 503, lỗi mạng)
// thì TỰ ĐỘNG chuyển ngay sang model kế tiếp (kể cả tự dò danh sách model từ Google API nếu cần).
async function motChuoiModel(dsModel, body, i, huy) {
  let ds = dsModel.filter((m) => m && !model404.has(m));
  const modelTot = fs.existsSync(TEP_MODEL_TOT) ? fs.readFileSync(TEP_MODEL_TOT, 'utf8').trim() : '';
  if (modelTot && !model404.has(modelTot) && ds.includes(modelTot) && ds[0] !== modelTot) {
    ds = [modelTot, ...ds.filter((m) => m !== modelTot)];
  }
  if (!ds.length) ds = (await tuTimModelTrenApi()).filter((m) => !model404.has(m)).slice(0, 6);
  let cuoi = {ok: false, code: 0, raw: 'KHONG_CO_MODEL', het: false};
  let canDoModel = false;
  for (let mIdx = 0; mIdx < ds.length; mIdx++) {
    if (huy && huy.xong) return {ok: false, code: 0, raw: 'DA_CO_KET_QUA', het: false};
    const md = ds[mIdx];
    if (model404.has(md)) continue;
    const kq = await motModel(md, body, i + mIdx * 2, huy, mIdx === 0 ? 2 : 1);
    if (kq && kq.ok) {
      if (mIdx > 0) process.stderr.write(`DOI_MODEL_TU_DONG: đã tự động đổi sang model ${md} và gọi thành công\n`);
      return kq;
    }
    cuoi = kq || cuoi;
    if (cuoi.raw === 'MOI_KEY_DEU_HONG') return cuoi;
    if ([403, 404].includes(cuoi.code)) canDoModel = true;
    if (mIdx + 1 < ds.length) {
      process.stderr.write(`DOI_MODEL_TU_DONG: ${md} lỗi (HTTP ${cuoi.code || 0}) -> thử model kế tiếp ${ds[mIdx + 1]}\n`);
    }
  }
  // Nếu mọi model cấu hình đều 404 -> tự hỏi API Google lấy danh sách model thật sự khả dụng và thử ngay
  if (canDoModel) {
    const dsMoi = await tuTimModelTrenApi();
    for (const md of dsMoi.filter((m) => !ds.includes(m) && !model404.has(m)).slice(0, 6)) {
      process.stderr.write(`TU_DO_MODEL: thử model tự phát hiện từ API: ${md}\n`);
      const kq = await motModel(md, body, i + 3, huy, 2);
      if (kq && kq.ok) return kq;
      cuoi = kq || cuoi;
    }
  }
  return cuoi;
}

// một yêu cầu: chạy chuỗi model linh hoạt; quá hedgeGiay giây chưa xong thì chạy song song nhánh dự phòng từ model thứ 2 trở đi.
function mot(body, i) {
  const ds = chuoiModel.filter((m) => m && !model404.has(m));
  if (ds.length <= 1 || hedgeGiay <= 0) return motChuoiModel(chuoiModel, body, i, null);
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
      const dsPhu = ds.slice(1);
      process.stderr.write(`GOI_DU_PHONG: ${ds[0]} chưa trả lời sau ${hedgeGiay} giây -> gọi song song ${dsPhu[0]}\n`);
      motChuoiModel(dsPhu, body, i + 5, huy).then((r) => {
        phuXong = true;
        if (r && r.ok) { process.stderr.write(`GOI_DU_PHONG: dùng kết quả của ${r.model || dsPhu[0]} (về trước)\n`); ket(r); }
        else if (chinhXong) ket(kqChinh);
      }, () => { phuXong = true; if (chinhXong) ket(kqChinh); });
    }, hedgeGiay * 1000);
    motChuoiModel(ds, body, i, huy).then((r) => {
      chinhXong = true; kqChinh = r;
      if ((r && r.ok) || !phuChay || phuXong) ket(r);
    }, (e) => { chinhXong = true; kqChinh = {ok: false, code: 0, raw: String((e && e.message) || e), het: false}; if (!phuChay || phuXong) ket(kqChinh); });
  });
}
async function chayLo() {
  const kq = new Array(bodies.length);
  let tiep = 0;
  async function xuLy() {
    while (tiep < bodies.length) {
      const i = tiep++;
      kq[i] = await mot(bodies[i], i);
    }
  }
  await Promise.all(Array.from({length: Math.min(3, tatCa.length || 1, bodies.length)}, xuLy));
  process.stdout.write(JSON.stringify(kq));
}
chayLo();
