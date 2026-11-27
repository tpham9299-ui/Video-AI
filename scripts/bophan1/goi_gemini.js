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
// v98.2: KHÔNG còn danh sách model cố định - chuỗi = model chỉ định (nếu còn sống) + xếp hạng tự động từ ListModels (model_gemini.cjs).
//  cheDo: 'nang' (giải toán, kịch bản, Lego - mặc định) | 'nhe' (kiểm duyệt, sửa nhanh). Chuỗi được lập trong chayLo().
const cheDo = cauHinh.cheDo === 'nhe' ? 'nhe' : 'nang';
let chuoiModel = cauHinh.tungModel ? [model] : [];
const hedgeGiay = Number(cauHinh.hedgeGiay) || 0;
const TEP_KEY_HONG = path.join(os.tmpdir(), 'gemini_key_hong.txt');
const TEP_KEY_HONG_JSON = path.join(os.tmpdir(), 'gemini_key_hong.json');
const TEP_HET_NGAY = path.join(os.tmpdir(), 'gemini_key_het_ngay.txt');
const TEP_MODEL_TOT = path.join(os.tmpdir(), 'gemini_model_tot_nhat.txt');
const maKey = (k) => k.slice(0, 6) + '_' + k.slice(-4);   // nhận diện key: 6 ký tự đầu + 4 cuối (nhiều key chung phần đầu)
const docDong = (t) => (fs.existsSync(t) ? fs.readFileSync(t, 'utf8') : '').split('\n').filter(Boolean);
const hong = new Set(docDong(TEP_KEY_HONG));   // key hỏng thật (đã xác nhận)
const catalog = require('./model_gemini.cjs');
const bo404 = catalog.doc404();       // v98.2: cặp "model|băm key" đã trả 404 trong NGÀY (giống HET_HAN_MUC_NGAY)
const model404 = new Set();            // model đã 404 trong tiến trình này -> bỏ qua ngay
const TEP_TU_CHOI = path.join(os.tmpdir(), 'gemini_key_tu_choi.txt');   // "model|key" bị từ chối
const tuChoi = new Set(docDong(TEP_TU_CHOI));
// v99.2b: model trả HTTP 403 (không phải lỗi key) -> chặn CẢ model 12 giờ, dùng chung giữa các lần gọi trong job + gửi về Apps Script
// (chay_bp1.js nạp / trả danh sách MODEL_CHAN_403 qua tệp này)
const TEP_MODEL_CHAN = path.join(os.tmpdir(), 'gemini_model_chan_403.json');
const GIO_CHAN_403 = 12;
const RE_403_LOI_KEY = /API_KEY_INVALID|API key not valid|API_KEY_EXPIRED|API key expired|SERVICE_DISABLED|has not been used in project|API_KEY_SERVICE_BLOCKED|API_KEY_HTTP_REFERRER_BLOCKED|billing/i;
function docModelChan() {
  try { const o = JSON.parse(fs.readFileSync(TEP_MODEL_CHAN, 'utf8')); const bay = Date.now(); return Object.fromEntries(Object.entries(o || {}).filter(([, h]) => Number(h) > bay)); } catch (e) { return {}; }
}
const modelChan = docModelChan();
function chanModel403(md) {
  if (!md || modelChan[md]) return;
  modelChan[md] = Date.now() + GIO_CHAN_403 * 3600e3;
  try { fs.writeFileSync(TEP_MODEL_CHAN, JSON.stringify({...docModelChan(), ...modelChan})); } catch (e) { /* bỏ */ }
  process.stderr.write(`MODEL_CHAN_403: ${md} từ chối quyền (HTTP 403) -> chặn ${GIO_CHAN_403} giờ, bỏ qua ở mọi lượt sau
`);
}
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
// model coi như chết: đã 404 trong tiến trình này, hoặc >= 2 key đã 404 trong ngày
const chet = (md) => model404.has(md) || !!modelChan[md] || catalog.chet404(md, tatCa.filter((k) => !hong.has(k)), bo404);
function ghiModel404(md, k) {
  if (!md) return;
  if (k) catalog.ghi404(md, k, bo404);
  if (model404.has(md)) return;
  model404.add(md);
  process.stderr.write(`MODEL_KHONG_CO: model ${md} không tồn tại/không hỗ trợ (HTTP 404) -> nhớ cặp (model, key) tới hết ngày, đổi sang model khác\n`);
}
// model gợi ý thay thế còn dùng được (chưa 404, chưa hết hạn mức ngày ở mọi key)
function goiYDung(md) {
  if (!md || chet(md)) return false;
  const con = tatCa.filter((k) => !hong.has(k) && !tuChoi.has(md + '|' + k));
  return !con.length || !con.every((k) => hetNgay.has(md + '|' + k));
}
function ghiModelTot(md) {
  try { fs.writeFileSync(TEP_MODEL_TOT, String(md || '').trim()); } catch (e) { /* bỏ */ }
}
function chuanBodyChoModel(md, body) {
  if (!body || !body.generationConfig || !body.generationConfig.thinkingConfig) return body;
  const config = body.generationConfig.thinkingConfig;
  if (/^gemini-2\.5/i.test(md) && config.thinkingBudget != null && !(config.thinkingBudget === 0 && /pro/i.test(md))) return body;
  if (/^gemini-([3-9]|[1-9]\d)|latest/i.test(md) && config.thinkingLevel) return body;
  const b = JSON.parse(JSON.stringify(body));
  if (b.generationConfig) delete b.generationConfig.thinkingConfig;
  return b;
}
let danhMuc;
function tuTimModelTrenApi() {   // danh sách model sống (cache theo key / theo ngày), xếp theo chế độ gọi
  if (!danhMuc) danhMuc = catalog.layModelSong(tatCa.filter((k) => !hong.has(k)), {goc: GOC_API})
    .then((ds) => catalog.xepHang(ds, cheDo), () => []);
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
  if (modelChan[model]) return {ok: false, code: 403, raw: 'MODEL_TU_CHOI (đã chặn): ' + model, het: false, model};
  if (chet(model)) return {ok: false, code: 404, raw: 'MODEL_KHONG_CO: ' + model, het: false};
  let bodyGui = chuanBodyChoModel(model, body);
  let schemaDaThuLai = false;
  let so403 = 0;
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
        const gui = data => fetch(url(k, model), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data), signal: ac.signal});
        let res = await gui(bodyGui);
        let raw = await res.text();
        // Giữ model, key và MIME khi lỗi chỉ thuộc cấu hình structured output.
        if (res.status === 400 && bodyGui.generationConfig?.responseSchema && /schema|structured[- ]output/i.test(raw)) {
          const {responseSchema, ...generationConfig} = bodyGui.generationConfig;
          bodyGui = {...bodyGui, generationConfig: {...generationConfig, responseMimeType: 'application/json'}};
          process.stderr.write('GEMINI_SCHEMA_FALLBACK: ' + model + ' gọi lại ở chế độ JSON\n');
          schemaDaThuLai = true;
          res = await gui(bodyGui);
          raw = await res.text();
        }
        if (res.ok) { ghiModelTot(model); return {ok: true, code: res.status, raw, model}; }
        cuoi = {ok: false, code: res.status, raw, het: false, model, schemaDaThuLai};
        const loai = phanLoai(res.status, raw);
        if (loai === 'model_404') { ghiModel404(model, k); cuoi.goiY = catalog.goiY404(raw); return cuoi; }
        // Nếu lỗi 400 do thinkingConfig không tương thích với model này -> bỏ thinkingConfig và thử lại ngay
        if (res.status === 400 && /thinking/i.test(raw) && bodyGui.generationConfig && bodyGui.generationConfig.thinkingConfig) {
          bodyGui = JSON.parse(JSON.stringify(bodyGui));
          delete bodyGui.generationConfig.thinkingConfig;
          lan--;
          continue;
        }
        if (loai === 'het_ngay') { ghiHetNgay(k, model); continue; }
        if (loai === 'hong') { ghiKeyHong(k, res.status, raw); continue; }
        if (loai === 'tu_choi') {
          ghiTuChoi(k, res.status, model);
          // v99.2b: 2 key cùng bị 403 -> model không cho dùng: chặn 12 giờ, chuyển model ngay (không thử hết key)
          if (res.status === 403 && !RE_403_LOI_KEY.test(raw) && ++so403 >= 2) { chanModel403(model); return {ok: false, code: 403, raw: 'MODEL_TU_CHOI', het: false, model}; }
          continue;
        }
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
  if (!conKey.length && tatCa.some((k) => !hong.has(k))) {
    if (so403) chanModel403(model);   // mọi key còn lại đều từ chối (có ít nhất một 403 thật)
    return {ok: false, code: 403, raw: 'MODEL_TU_CHOI', het: false, model};
  }
  if (tatCa.length && tatCa.every((k) => hong.has(k))) cuoi = {ok: false, code: 401, raw: 'MOI_KEY_DEU_HONG', het: false, model};
  return cuoi;
}

// Thử lần lượt các model trong chuỗi linh hoạt: hễ model hiện tại lỗi (404, 400, 429 hết hạn mức, 500, 503, lỗi mạng)
// thì TỰ ĐỘNG chuyển ngay sang model kế tiếp (kể cả tự dò danh sách model từ Google API nếu cần).
async function motChuoiModel(dsModel, body, i, huy) {
  let ds = dsModel.filter((m) => m && !chet(m));
  const modelTot = fs.existsSync(TEP_MODEL_TOT) ? fs.readFileSync(TEP_MODEL_TOT, 'utf8').trim() : '';
  if (!cauHinh.tungModel && modelTot && !chet(modelTot) && ds.includes(modelTot) && ds[0] !== modelTot) {
    ds = [modelTot, ...ds.filter((m) => m !== modelTot)];
  }
  if (!ds.length && !cauHinh.tungModel) ds = (await tuTimModelTrenApi()).filter((m) => !chet(m)).slice(0, 6);
  if (!ds.length) return {ok: false, code: 404, raw: 'MODEL_KHONG_CO', het: false};
  let cuoi = {ok: false, code: 0, raw: 'KHONG_CO_MODEL', het: false};
  let canDoModel = false;
  for (let mIdx = 0; mIdx < ds.length; mIdx++) {
    if (huy && huy.xong) return {ok: false, code: 0, raw: 'DA_CO_KET_QUA', het: false};
    const md = ds[mIdx];
    if (chet(md)) continue;
    const kq = await motModel(md, body, i + mIdx * 2, huy, mIdx === 0 ? 2 : 1);
    if (kq && kq.ok) {
      if (mIdx > 0) process.stderr.write(`DOI_MODEL_TU_DONG: đã tự động đổi sang model ${md} và gọi thành công\n`);
      return kq;
    }
    cuoi = kq || cuoi;
    if (cuoi.raw === 'MOI_KEY_DEU_HONG') return cuoi;
    // 404 kèm "Please update your code to use models/<ten>": chèn <ten> ngay sau model vừa lỗi (kể cả khi tungModel)
    const gy = cuoi.goiY;
    if (gy && gy !== md && !ds.slice(0, mIdx + 1).includes(gy) && goiYDung(gy)) {
      ds = [...ds.slice(0, mIdx + 1), gy, ...ds.slice(mIdx + 1).filter((m) => m !== gy)];
      process.stderr.write(`GOI_Y_MODEL: Google gợi ý ${gy} thay cho ${md} -> thử ngay\n`);
    }
    if ([403, 404].includes(cuoi.code)) canDoModel = true;
    if (mIdx + 1 < ds.length) {
      process.stderr.write(`DOI_MODEL_TU_DONG: ${md} lỗi (HTTP ${cuoi.code || 0}) -> thử model kế tiếp ${ds[mIdx + 1]}\n`);
    }
  }
  // Nếu mọi model cấu hình đều 404 -> tự hỏi API Google lấy danh sách model thật sự khả dụng và thử ngay
  if (canDoModel && !cauHinh.tungModel) {
    const dsMoi = await tuTimModelTrenApi();
    for (const md of dsMoi.filter((m) => !ds.includes(m) && !chet(m)).slice(0, 6)) {
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
  const ds = chuoiModel.filter((m) => m && !chet(m));
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
  if (!cauHinh.tungModel) {
    const song = await tuTimModelTrenApi().catch(() => []);
    chuoiModel = catalog.hopNhat({song, chiDinh: model, cauHinh: [...(cauHinh.models || []), ...duPhong], cheDo});
    if (!song.length) process.stderr.write(`MODEL_DU_PHONG: không lấy được ListModels -> dùng danh sách dự phòng ${chuoiModel.slice(0, 5).join(', ')}\n`);
  }
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
