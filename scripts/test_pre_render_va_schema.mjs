import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {execFile, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import vm from 'node:vm';
import {chonFrame, chotBaoCao, soiDomPhu, soiHop} from './kiem_tra_de_chu_truoc_render.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CHROME_GATE = 'scripts/kiem_tra_de_chu_truoc_render.mjs';
const python = process.platform === 'win32' ? 'python' : 'python3';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'test-soi-chu-'));
const exec = promisify(execFile);
const nhanh = process.argv.includes('--nhanh');
let dat = 0, hong = 0;

async function test(ten, fn) {
  try {
    await fn();
    dat++;
    console.log('✓ ' + ten);
  } catch (e) {
    hong++;
    console.error('✗ ' + ten, e);
  }
}

const a = {id: 1, nhan: 'tieu_de_buoc', x: 100, y: 240, w: 200, h: 50, opacity: 1};
const b = {id: 2, nhan: 'svg_text', x: 330, y: 240, w: 100, h: 40, opacity: 1};
await test('Hộp tách rời, cha-con và chữ opacity ≤ 0,15 đều đạt', () => {
  assert.deepEqual(soiHop([a, b], 10, 'Intro'), []);
  assert.deepEqual(soiHop([a, {...b, x: 115, cha: [1]}], 10, 'Intro'), []);
  assert.deepEqual(soiHop([a, {...b, x: 115, opacity: 0.15}], 10, 'Intro'), []);
});
await test('DE_CHU theo diện tích hoặc kích thước giao và kèm đúng cặp', () => {
  const [loi] = soiHop([a, {...b, x: 286, h: 10}], 15, 'Bước 1');
  assert.equal(loi.loai, 'DE_CHU');
  assert.equal(loi.phan_tu_1, a.nhan);
  assert.equal(loi.phan_tu_2, b.nhan);
  assert.equal(loi.frame, 15);
  assert.equal(soiHop([{...a, w: 60}, {...b, x: 115, y: 287, w: 40, h: 5}], 15, 'Bước 1')[0].loai, 'DE_CHU');
  assert.deepEqual(soiHop([a, {...b, x: 288, y: 282}], 15, 'Bước 1'), []);
});
await test('TRAN_KHUNG đúng ranh 1072 px và báo hộp bị cắt', () => {
  assert.deepEqual(soiHop([{...a, x: 872}], 16, 'Outro'), []);
  assert.equal(soiHop([{...a, x: 873}], 16, 'Outro')[0].loai, 'TRAN_KHUNG');
  assert.equal(soiHop([{...a, cat: 'Chữ vượt khối cố định ngang 5 px'}], 16, 'Outro')[0].loai, 'TRAN_KHUNG');
});

await test('0 hộp data-va-cham khi Chromium đã chạy -> dat=false và mã GIAO_DIEN_CU_KHONG_HOP_LE', () => {
  const kq0 = chotBaoCao([], {boQua: '', soFrame: 5, soHop: 0});
  assert.equal(kq0.dat, false);
  assert.equal(kq0.loi.length, 1);
  assert.equal(kq0.loi[0].loai, 'GIAO_DIEN_CU_KHONG_HOP_LE');
  const kqBoQua = chotBaoCao([], {boQua: 'Chromium lỗi', soFrame: 0, soHop: 0});
  assert.deepEqual(kqBoQua, {dat: true, loi: []});
  const kqOk = chotBaoCao([], {boQua: '', soFrame: 5, soHop: 12});
  assert.deepEqual(kqOk, {dat: true, loi: []});
});

await test('Mốc Intro sau thương hiệu và Outro sau khi CTA xuất hiện', () => {
  const p = {anhBiaDau: true, thuongHieu: {ten: 'Story Math'}, intro: {lech: 80, soFrame: 100},
    boCuc: '4tang', khung4tang: {mocCau: {giay: 4}, buoc: [{t: 0}, {t: 4}, {t: 8}, {t: 12}], tCongBo: 16},
    canh: [{batDau: 0, soFrame: 120}], outro: {batDau: 540, soFrame: 105}};
  const mau = chonFrame(p, {fps: 30, durationInFrames: 726});
  assert.deepEqual(mau[0], {frame: 141, canh: 'Intro'});
  assert.deepEqual(mau.at(-1), {frame: 717, canh: 'Outro'});
  assert.ok(mau.length >= 4 && mau.length <= 6);
});

const ketQuaGemini = {candidates: [{content: {parts: [{text: JSON.stringify({dap_an_cuoi: '2/3'})}]}}]};
await test('Apps Script gửi schema BP1/BP2 và thử lại JSON khi API trả 400', () => {
  const cauHinh = new Map();
  const cache = {get: k => cauHinh.get(k), put: (k, v) => cauHinh.set(k, v)};
  const goi = [];
  const gia = (model, body) => {
    const gc = structuredClone(body.generationConfig);
    goi.push({model, gc});
    return gc.responseSchema
      ? {ok: false, code: 400, raw: 'Maximum complexity exceeded in responseSchema'}
      : {ok: true, code: 200, raw: JSON.stringify(ketQuaGemini)};
  };
  const ctx = vm.createContext({
    CacheService: {getScriptCache: () => cache}, Logger: {log() {}},
  });
  for (const f of ['BoPhan1.gs', 'KhoKey.gs']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, {filename: f});
  }
  Object.assign(ctx, {
    khoDanhSachKey_: () => ['key-gia'], cauHinh_: () => 'high', danhSachModel_: () => ['gemini-2.5-pro'],
    conDuGoiGemini_: () => true, modelBiChan403_: () => false, nhatKy_: () => {},
    khoGoi_: (_he, model, body) => gia(model, body),
    khoGoiSong_: (_he, model, bodies) => bodies.map(body => gia(model, body)),
  });
  const bp1 = ctx.schemaGiaiBP1_('xac_suat');
  const bp2 = ctx.schemaKichBan_();
  assert.ok(bp1.required.includes('tu') && bp1.required.includes('mau'));
  assert.equal(ctx.schemaGiaiBP1_('chung_minh').properties.cac_buoc.items.properties.ly_do.type, 'STRING');
  assert.ok(bp2.required.includes('dap_an_cuoi') && bp2.required.includes('binh_luan_ghim'));
  assert.ok(bp2.properties.canh.items.required.includes('noi_dung_man_hinh'));
  assert.ok(bp2.properties.canh.items.properties.loai.enum.includes('phan_tich'));
  const buoc = bp2.properties.khung4tang.properties.buoc.items.properties;
  assert.equal(buoc.hanh_dong.properties.do.type, 'INTEGER');
  assert.equal(buoc.hanh_dong.properties.nhanh.type, 'INTEGER');
  assert.equal(buoc.the.items.properties.chot.type, 'BOOLEAN');
  assert.equal(bp2.properties.tom_tat_3_buoc.minItems, 3);
  assert.equal(bp2.properties.tom_tat_3_buoc.maxItems, 3);
  assert.equal(ctx.goiGeminiSong_([{prompt: 'Giải', nhiet: 0.2, schema: bp1}])[0].dap_an_cuoi, '2/3');
  assert.equal(ctx.goiKichBanCoSchema_('Viết', 0.2, {suyNghi: 'high'}, bp2).dap_an_cuoi, '2/3');
  assert.deepEqual(goi.map(g => !!g.gc.responseSchema), [true, false, true, false]);
  assert.ok(goi.every(g => g.model === 'gemini-2.5-pro' && g.gc.responseMimeType === 'application/json' && g.gc.thinkingConfig));
  assert.ok(!cauHinh.has('KHONG_SCHEMA_gemini-2.5-pro'), 'schema quá phức tạp không đánh dấu model thiếu tính năng');
  const kb = {
    canh: [{minh_hoa: {du_lieu: '{"vat":[]}'}}],
    khung4tang: {san_khau: '{"loai":"rut_mau"}', buoc: [{doi_chieu: {ham: 'x^2'}, hanh_dong: {pha: 'truong_hop', do: 2}}]},
  };
  ctx.goiGemini_ = () => kb;
  const daBung = ctx.goiKichBanCoSchema_('Viết', 0.2, {}, bp2);
  assert.equal(daBung.canh[0].minh_hoa.du_lieu.vat.length, 0);
  assert.equal(daBung.khung4tang.san_khau.loai, 'rut_mau');
  assert.equal(daBung.khung4tang.buoc[0].doi_chieu.ham, 'x^2');
  assert.equal(daBung.khung4tang.buoc[0].hanh_dong.do, 2);
  // Schema Xác suất mới có đầy đủ bien_co / nhom / duong / dich / thuan_loi và khong_thu_lai.
  const skProps = bp2.properties.khung4tang.properties.san_khau.properties;
  assert.ok(skProps.loai.enum.includes('rut_mau') && skProps.loai.enum.includes('luoi_bayes'));
  const tsProps = skProps.tham_so.properties;
  assert.ok(tsProps.bien_co.properties.loai.enum.includes('it_nhat_mot'));
  assert.ok(tsProps.bien_co.properties.loai.enum.includes('cung_nhom'));
  assert.equal(tsProps.nhom.items.properties.phan_tu.items.type, 'INTEGER');
  assert.equal(tsProps.cot.items.properties.thuan_loi.type, 'BOOLEAN');
  assert.equal(bp2.properties.khong_thu_lai.type, 'STRING');
});

await test('Xác suất khớp responseSchema đi qua máy đếm XS_SAI_DAP_SO cho n(A) > 0 khớp đáp án (không báo n(A)=0)', () => {
  const ctx = vm.createContext({
    PropertiesService: {getScriptProperties: () => ({getProperty: () => null, setProperty() {}})},
    Logger: {log() {}},
  });
  for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs', 'SanKhau.gs']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, {filename: f});
  }
  Object.assign(ctx, {cauHinh_: () => '', nhatKy_: () => {}, cauNoiGanDay_: () => []});
  // Ca 1: biến cố nhóm (it_nhat_mot) theo đúng responseSchema mới -> trước đây thoaBienCo_ trả null làm n(A) = 0!
  const kbNhom = {
    mon: 'XAC_SUAT', lop: '11',
    de_bai: 'Rút ngẫu nhiên 2 thẻ từ 6 thẻ đánh số 1 đến 6. Tính xác suất có ít nhất 1 thẻ chẵn.',
    dap_an: '4/5', dap_an_cuoi: '4/5',
    canh: [
      {so: 1, loai: 'de_bai', tieu_de_canh: 'Đề bài', loi_thoai: 'Rút 2 thẻ từ 1 đến 6, xác suất có ít nhất 1 thẻ chẵn là bao nhiêu?', noi_dung_man_hinh: [], minh_hoa: {loai: 'san_khau', du_lieu: {vat: []}}},
      {so: 2, loai: 'dap_an', tieu_de_canh: 'Đáp án', loi_thoai: 'Ta có P bằng bốn phần năm.', noi_dung_man_hinh: ['P(A) = \\dfrac{4}{5}'], minh_hoa: {loai: 'san_khau', du_lieu: {vat: []}}},
    ],
    khung4tang: {
      buoc: [{khi_noi: 'Rút 2 thẻ', tieu_de: 'Không gian mẫu', the: [{loai: 'cong_thuc', khi_noi: 'Rút 2 thẻ', dong: ['n(\\Omega) = 15']}]}],
      san_khau: {
        loai: 'rut_mau',
        tham_so: {
          vat: 'the', tu: 1, den: 6, k: 2,
          nhom: [
            {nhan: 'chẵn', mau: 'vang', phan_tu: [2, 4, 6]},
            {nhan: 'lẻ', mau: 'xam', phan_tu: [1, 3, 5]},
          ],
          bien_co: {loai: 'it_nhat_mot', nhom: 'chẵn', phu_dinh: false},
        },
        pha: [{ten: 'hien'}, {ten: 'ket'}],
      },
    },
  };
  const rm1 = ctx.tinhRutMau_(kbNhom.khung4tang.san_khau.tham_so, kbNhom);
  assert.equal(rm1.n_omega, 15);
  assert.equal(rm1.n_a, 12);
  assert.ok(rm1.n_a > 0);
  assert.equal(rm1.khop, true);
  ctx.tuSuaSanKhau_(kbNhom, {mon: 'XAC_SUAT', lop: '11'});
  assert.deepEqual(Array.from(kbNhom._v96_loi).filter(x => /^XS_SAI_DAP_SO/.test(x)), []);

  // Ca 2: biến cố tổng lớn hơn hoặc bằng (tong_it_nhat) khớp đáp án
  const kbTong = {
    mon: 'XAC_SUAT', lop: '11',
    de_bai: 'Gieo 2 lần xúc xắc. Tính xác suất tổng không nhỏ hơn 10.',
    dap_an: '1/6', dap_an_cuoi: '1/6',
  };
  const rm2 = ctx.tinhRutMau_({vat: 'xuc_xac', tu: 1, den: 6, k: 2, co_hoan_lai: true, bien_co: {loai: 'tong_it_nhat', so: 10}}, kbTong);
  assert.equal(rm2.n_omega, 36);
  assert.equal(rm2.n_a, 6);
  assert.equal(rm2.khop, true);

  // Ca 3: biến cố lạ không đánh giá được -> KHÔNG báo sai n(A) = 0
  const rmLa = ctx.tinhRutMau_({vat: 'the', tu: 1, den: 6, k: 2, bien_co: {loai: 'khong_ho_tro'}}, kbNhom);
  assert.equal(rmLa.n_a, undefined);
  assert.equal(rmLa.khop, undefined);

  // Đối chiếu bản Python (khung4tang_v96.py) trên cùng JSON khớp schema (kể cả cot_phan_phoi với thuan_loi: true)
  const pyOut = execFileSync(python, ['-X', 'utf8', '-c',
    'import json,sys; sys.path.insert(0,"scripts"); import khung4tang_v96 as v; kb=json.loads(sys.argv[1]); sua=[]; r=v.dung_rut_mau(kb["khung4tang"]["san_khau"]["tham_so"], kb, sua); c=v.dung_cot_phan_phoi({"cot":[{"nhan":"0","p":"1/4","thuan_loi":False},{"nhan":"1","p":"3/4","thuan_loi":True}]}, {"dap_an_cuoi":"3/4"}, sua); print(json.dumps({"n_a":r["n_a"],"n_omega":r["n_omega"],"khop":r["khop_dap_an"],"cot_dich":c["dich"],"cot_khop":c["khop_dap_an"],"sua":sua}))',
    JSON.stringify(kbNhom)], {cwd: ROOT, encoding: 'utf8'});
  const pyKq = JSON.parse(pyOut);
  assert.equal(pyKq.n_a, 12);
  assert.equal(pyKq.n_omega, 15);
  assert.equal(pyKq.khop, true);
  assert.deepEqual(pyKq.cot_dich, [1]);
  assert.equal(pyKq.cot_khop, true);
});

await test('Kịch bản Thực tế bắt buộc có bước thu_lai (cả lời đọc & màn hình) và cấm khối hộp cho bài tiền bạc', () => {
  const ctx = vm.createContext({
    PropertiesService: {getScriptProperties: () => ({getProperty: () => null, setProperty() {}})},
    Logger: {log() {}},
  });
  for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs', 'SanKhau.gs']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, {filename: f});
  }
  Object.assign(ctx, {cauHinh_: () => '', nhatKy_: () => {}, cauNoiGanDay_: () => []});
  const qt = ctx.quyTrinhGon4Tang_(true, {lop: '12', mon: 'THUC_TE'});
  const hd = ctx.huongDanKhung4Tang_({lop: '12', mon: 'THUC_TE'});
  assert.match(qt, /thu_lai.*BẮT BUỘC.*noi_dung_man_hinh.*loi_thoai/);
  assert.match(qt, /BÀI TIỀN BẠC \/ TÀI CHÍNH.*TUYỆT ĐỐI CẤM.*khoi_hop/);
  assert.match(hd, /BÀI TIỀN BẠC \/ TÀI CHÍNH.*TUYỆT ĐỐI CẤM.*khoi_hop/);

  // kiemTraQuyTrinh_ báo lỗi khi thiếu thu_lai (và không có khong_thu_lai), đạt khi có thu_lai bằng số trên cả lời đọc & màn hình
  const kbThieu = {
    de_cho: ['Gửi 100 triệu', 'Lãi suất 6%/năm'], can_tim: 'Số tiền sau 2 năm',
    canh: [
      {loai: 'de_bai', loi_thoai: 'Gửi tiết kiệm một trăm triệu đồng với lãi suất sáu phần trăm mỗi năm thì sau hai năm nhận được bao nhiêu tiền tất cả?'},
      {loai: 'mo_hinh_hoa', loi_thoai: 'Áp dụng công thức lãi kép.'},
      {loai: 'bay', loi_thoai: 'Đừng nhầm với lãi đơn.'},
      {loai: 'dap_an', loi_thoai: 'Sau hai năm được 112,36 triệu.', noi_dung_man_hinh: ['T = 112,36']},
      {loai: 'ket_luan', loi_thoai: 'Lưu lại mẹo lãi kép này!'},
    ],
  };
  assert.ok(ctx.kiemTraQuyTrinh_(kbThieu).nang.some(x => /THIEU_PHAN_QUY_TRINH.*THỬ LẠI/.test(x)));

  const kbDu = structuredClone(kbThieu);
  kbDu.canh.splice(4, 0, {
    loai: 'thu_lai',
    loi_thoai: 'Thử lại: năm 1 có 106 triệu, năm 2 nhân 1,06 đúng bằng 112,36 triệu.',
    noi_dung_man_hinh: ['106 \\cdot 1,06 = 112,36 \\;\\checkmark'],
  });
  assert.ok(!ctx.kiemTraQuyTrinh_(kbDu).nang.some(x => /THIEU_PHAN_QUY_TRINH|THU_LAI_HINH_THUC/.test(x)));

  // Workflow dung-video.yml: kiểm tra chuyển động & Mắt thần 3x3 chạy TRƯỚC tải MP4 lên Drive và xóa MP4 hỏng trên runner.
  const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/dung-video.yml'), 'utf8');
  const iCd = yml.indexOf('scripts/kiem_tra_chuyen_dong.py');
  const iMt = yml.indexOf('scripts/mat_than_3x3.py');
  const iCong = yml.indexOf('id: cong_mp4');
  const iDrive = yml.indexOf('id: drive');
  assert.ok(iCd > 0 && iCd < iMt && iMt < iCong && iCong < iDrive, 'chuyển động -> Mắt thần -> cổng chặn -> Drive');
  assert.match(yml.slice(iCong, iDrive), /os\.remove\(mp4_path\)/);
  assert.match(yml.slice(iDrive), /CHAN_MP4.*true[\s\S]*KHÔNG tải MP4 lên Drive/);
});

// Dữ liệu Pha 2A (kịch bản sư phạm thuần, chỉ mo_ta_minh_hoa tiếng Việt — KHÔNG mã SVG, KHÔNG tự gõ bảng đếm) cho 4 mảng
function taoBoDuLieuPha2A() {
  const hpGoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'mau/hinh_phang/am_vuong_de.json'), 'utf8'));
  const kgGoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'mau/v97/vuong_goc_sa.json'), 'utf8'));
  return {
    XAC_SUAT: {
      de_info: {
        id: 'XS-2PHA-01', lop: '11', mon: 'XAC_SUAT',
        de_bai: 'Trong hộp có 5 bi đỏ và 3 bi xanh. Rút ngẫu nhiên 2 viên bi. Tính xác suất có ít nhất 1 bi đỏ.',
        dap_an: '25/28', dap_an_hien: '25/28',
      },
      kb_2a: {
        id: 'XS-2PHA-01', mon: 'XAC_SUAT', lop: '11',
        tieu_de: 'Rút 2 bi có ít nhất 1 bi đỏ?', chu_de_ngan: 'Xác suất rút bi',
        dap_an_cuoi: '25/28', dap_an_hien: '25/28',
        hook: 'Rút 2 trong 8 viên bi, cơ hội dính bi đỏ cao tới mức nào?',
        hook_chu: 'ÍT NHẤT 1 BI ĐỎ?', hook_kieu: 'cau_hoi',
        tieu_de_bia: 'RÚT 2 BI ĐỎ XANH', nhan_manh: ['1 BI ĐỎ'],
        y_tuong_chinh: 'Chia đúng hai trường hợp 1 đỏ 1 xanh và 2 bi đỏ rồi cộng lại trên không gian mẫu C(8,2).',
        bay_tu_duy: 'Nhầm chỉnh hợp A(8,2) thay vì tổ hợp C(8,2) khi rút đồng thời.',
        de_cho: ['5 bi đỏ, 3 bi xanh', 'Rút ngẫu nhiên 2 bi'], can_tim: 'Xác suất có ít nhất 1 bi đỏ',
        du_kien: ['5 đỏ, 3 xanh', 'Rút 2 bi'],
        bai_hoc_rut_ra: ['Rút đồng thời dùng tổ hợp C.', 'Chia trường hợp rời nhau rồi cộng.', 'Luôn thử lại bằng biến cố đối.'],
        binh_luan_ghim: 'Đổi thành 4 bi đỏ và 4 bi xanh thì xác suất ra bao nhiêu? Bình luận nhé!',
        tom_tat_3_buoc: [
          {chien_thuat: 'Không gian mẫu', cong_thuc: 'n(\\Omega) = C_8^2 = 28'},
          {chien_thuat: 'Chia 2 trường hợp', cong_thuc: 'n(A) = 15 + 10 = 25'},
          {chien_thuat: 'Chốt xác suất', cong_thuc: 'P(A) = \\dfrac{25}{28}'},
        ],
        canh: [
          {so: 1, loai: 'de_bai', tieu_de_canh: 'Bài toán rút bi', loi_thoai: 'Hộp có 5 bi đỏ và 3 bi xanh. Rút ngẫu nhiên 2 viên, xác suất có ít nhất 1 bi đỏ là bao nhiêu?', noi_dung_man_hinh: [], mo_ta_minh_hoa: 'Hộp trong suốt chứa 5 viên bi đỏ và 3 viên bi xanh'},
          {so: 2, loai: 'y_do', tieu_de_canh: 'Không gian mẫu', loi_thoai: 'Ta rút cùng lúc 2 viên trong 8 viên nên không gian mẫu là C 2 của 8 bằng 28.', noi_dung_man_hinh: ['n(\\Omega) = C_8^2 = 28'], mo_ta_minh_hoa: 'Lấy mẫu 2 viên bi đồng thời từ hộp 8 viên bi'},
          {so: 3, loai: 'bay', tieu_de_canh: 'Tránh bẫy thứ tự', loi_thoai: 'Cẩn thận bẫy nhé! Rút đồng thời không phân biệt thứ tự nên dùng tổ hợp C, tuyệt đối không dùng chỉnh hợp A.', noi_dung_man_hinh: ['C_8^2 \\ne A_8^2'], mo_ta_minh_hoa: 'Gạch bỏ cách đếm chỉnh hợp, giữ nguyên bộ 2 bi'},
          {so: 4, loai: 'tinh_toan', tieu_de_canh: 'Trường hợp 1 bi đỏ', loi_thoai: 'Trường hợp một: lấy đúng 1 bi đỏ và 1 bi xanh, có 5 nhân 3 bằng 15 cách.', noi_dung_man_hinh: ['\\text{TH1 (1 đỏ): } C_5^1 \\cdot C_3^1 = 15'], mo_ta_minh_hoa: 'Nhấc nổi 1 viên bi đỏ cùng 1 viên bi xanh ra khay'},
          {so: 5, loai: 'tinh_toan', tieu_de_canh: 'Trường hợp 2 bi đỏ', loi_thoai: 'Trường hợp hai: lấy cả 2 bi đỏ, có C 2 của 5 bằng 10 cách.', noi_dung_man_hinh: ['\\text{TH2 (2 đỏ): } C_5^2 = 10'], mo_ta_minh_hoa: 'Nhấc nổi 2 viên bi đỏ ra khay, cộng tổng 25 cách'},
          {so: 6, loai: 'dap_an', tieu_de_canh: 'Chốt xác suất', loi_thoai: 'Tổng n của A bằng 25, vậy xác suất P của A bằng 25 phần 28.', noi_dung_man_hinh: ['P(A) = \\dfrac{25}{28}'], mo_ta_minh_hoa: 'Thanh tỉ lệ sáng vàng ở mức 25 phần 28'},
          {so: 7, loai: 'thu_lai', tieu_de_canh: 'Thử lại bằng phần bù', loi_thoai: 'Thử lại bằng biến cố đối: không có bi đỏ tức 2 bi xanh có 3 cách, 1 trừ 3 phần 28 đúng bằng 25 phần 28.', noi_dung_man_hinh: ['1 - \\dfrac{C_3^2}{28} = 1 - \\dfrac{3}{28} = \\dfrac{25}{28}'], mo_ta_minh_hoa: 'So sánh phần bù 3/28 với 25/28 khớp tuyệt đối'},
          {so: 8, loai: 'ket_luan', tieu_de_canh: 'Ghi nhớ nhanh', loi_thoai: 'Gặp chữ ít nhất một, thử chéo ngay bằng phần bù. Lưu lại kẻo quên nhé!', noi_dung_man_hinh: [], mo_ta_minh_hoa: 'Tóm tắt 3 bước giải trên nền sáng'},
        ],
      },
    },
    THUC_TE: {
      de_info: {
        id: 'TT-2PHA-01', lop: '12', mon: 'THUC_TE',
        de_bai: 'Gửi tiết kiệm 100 triệu đồng với lãi suất 6%/năm theo hình thức lãi kép. Sau 2 năm nhận được bao nhiêu triệu đồng?',
        dap_an: '112,36', dap_an_hien: '112,36 triệu đồng',
      },
      kb_2a: {
        id: 'TT-2PHA-01', mon: 'THUC_TE', lop: '12',
        tieu_de: 'Gửi 100 triệu lãi kép 2 năm được bao nhiêu?', chu_de_ngan: 'Lãi kép tiết kiệm',
        dap_an_cuoi: '112,36 triệu đồng', dap_an_hien: '112,36 triệu đồng',
        hook: 'Gửi 100 triệu hai năm có thật chỉ lãi 12 triệu?',
        hook_chu: 'LÃI KÉP 2 NĂM?', hook_kieu: 'sai_lam',
        tieu_de_bia: 'LÃI KÉP 100 TRIỆU', nhan_manh: ['LÃI KÉP'],
        y_tuong_chinh: 'Lãi năm nhất được nhập gốc để sinh thêm lãi ở năm hai theo công thức lũy thừa (1 + r)^n.',
        bay_tu_duy: 'Cộng gộp lãi đơn 6% nhân 2 thành 112 triệu mà quên tiền lãi sinh lãi.',
        de_cho: ['Gốc P = 100 triệu', 'Lãi suất 6%/năm', 'Kỳ hạn 2 năm'], can_tim: 'Tổng tiền sau 2 năm',
        du_kien: ['100 triệu', '6%/năm', '2 năm'],
        bai_hoc_rut_ra: ['Lãi kép nhân lũy thừa (1 + r)^n.', 'Không nhân thẳng lãi đơn.', 'Thử lại từng năm để chắc số.'],
        binh_luan_ghim: 'Nếu gửi 3 năm với cùng lãi suất 6%/năm thì nhận được bao nhiêu? Bình luận đáp số nhé!',
        tom_tat_3_buoc: [
          {chien_thuat: 'Bỏ bẫy lãi đơn', cong_thuc: 'T \\ne 100 + 2 \\cdot 6'},
          {chien_thuat: 'Lập hàm lãi kép', cong_thuc: 'T = 100(1 + 0{,}06)^2'},
          {chien_thuat: 'Chốt & thử lại', cong_thuc: '106 \\cdot 1{,}06 = 112{,}36'},
        ],
        canh: [
          {so: 1, loai: 'de_bai', tieu_de_canh: 'Bài toán gửi tiết kiệm', loi_thoai: 'Gửi 100 triệu lãi suất 6 phần trăm mỗi năm theo lãi kép, sau 2 năm thu về bao nhiêu tiền?', noi_dung_man_hinh: [], mo_ta_minh_hoa: 'Túi tiền tiết kiệm 100 triệu gắn nhãn lãi suất 6%/năm'},
          {so: 2, loai: 'mo_hinh_hoa', tieu_de_canh: 'Công thức lãi kép', loi_thoai: 'Lãi kép nhập lãi vào gốc mỗi năm nên sau 2 năm ta nhân 100 với 1 phẩy 06 bình phương.', noi_dung_man_hinh: ['T = 100 \\cdot (1 + 0{,}06)^2'], mo_ta_minh_hoa: 'Túi tiền tăng trưởng qua 2 kỳ với hệ số nhân 1,06'},
          {so: 3, loai: 'bay', tieu_de_canh: 'Bẫy tính lãi đơn', loi_thoai: 'Nhiều bạn nhân nhanh 6 phần trăm với 2 ra 112 triệu là trượt bẫy lãi đơn ngay.', noi_dung_man_hinh: ['100 + 12 = 112 \\text{ (sai)}'], mo_ta_minh_hoa: 'Nhân vật cảnh báo gạch chéo con số lãi đơn 112 triệu'},
          {so: 4, loai: 'dap_an', tieu_de_canh: 'Chốt số tiền', loi_thoai: 'Tính ra tổng số tiền nhận được là 112 phẩy 36 triệu đồng.', noi_dung_man_hinh: ['T = 112{,}36 \\text{ triệu}'], mo_ta_minh_hoa: 'Túi tiền tỏa sáng vàng với tổng 112,36 triệu đồng'},
          {so: 5, loai: 'thu_lai', tieu_de_canh: 'Thử lại từng năm', loi_thoai: 'Thử lại từng năm: hết năm 1 có 106 triệu, sang năm 2 lấy 106 nhân 1 phẩy 06 đúng bằng 112 phẩy 36 triệu.', noi_dung_man_hinh: ['106 \\cdot 1{,}06 = 112{,}36 \\;\\checkmark'], mo_ta_minh_hoa: 'Đối chiếu từng năm: năm 1 được 106, năm 2 đúng 112,36'},
          {so: 6, loai: 'ket_luan', tieu_de_canh: 'Mẹo nhớ lãi kép', loi_thoai: 'Lãi kép luôn nhân lũy thừa theo số kỳ. Lưu lại mẹo này nhé!', noi_dung_man_hinh: [], mo_ta_minh_hoa: 'Tổng kết công thức lãi kép trên nền xanh ngọc'},
        ],
      },
    },
    HINH_PHANG: {
      de_info: {id: 'HP-2PHA-01', lop: '9', mon: 'HINH_HOC', de_bai: hpGoc.de_bai, dap_an: 'CM'},
      kb_2a: {
        ...hpGoc,
        id: 'HP-2PHA-01',
        y_tuong_chinh: 'Tư duy ngược: muốn AM vuông góc DE phải đưa về tam giác AID đồng dạng tam giác ACM qua tứ giác nội tiếp BEDC.',
        bay_tu_duy: 'Lao vào tính góc rời rạc mà quên bắc cầu qua tứ giác nội tiếp BEDC.',
        binh_luan_ghim: 'Nếu đổi DE thành đường nối hai chân đường cao khác thì tính chất vuông góc còn đúng không?',
        khong_thu_lai: 'Bài chứng minh hình học tổng hợp không có phép thử số độc lập.',
        tom_tat_3_buoc: [
          {chien_thuat: 'Tứ giác nội tiếp', cong_thuc: '\\angle BEC = \\angle BDC = 90^\\circ'},
          {chien_thuat: 'Bắc cầu góc', cong_thuc: '\\angle ADI = \\angle ABC = \\angle AMC'},
          {chien_thuat: 'Đồng dạng chốt 90°', cong_thuc: '\\triangle AID \\sim \\triangle ACM'},
        ],
        canh: hpGoc.canh.map(c => ({...c, mo_ta_minh_hoa: 'Dựng hình phẳng chuẩn và bật sáng góc/đoạn tương ứng với ' + c.tieu_de_canh})),
      },
    },
    HINH_KHONG_GIAN: {
      de_info: {id: 'KG-2PHA-01', lop: '11', mon: 'HINH_HOC', de_bai: kgGoc.de_bai, dap_an: '45°; a√6/3'},
      kb_2a: {
        ...kgGoc,
        id: 'KG-2PHA-01',
        y_tuong_chinh: 'Tư duy ngược: muốn tìm khoảng cách từ A tới mặt nghiêng (SBC), ép về mặt bên (SAB) chứa SA và kẻ duy nhất đường cao AH vuông góc SB.',
        bay_tu_duy: 'Hạ thẳng đường cao vào giữa mặt (SBC) khiến không tính được độ dài.',
        bai_hoc_rut_ra: ['Tìm mặt phụ chứa chân đường cao.', 'Hạ đường cao trong tam giác vuông mặt bên.', 'Góc với đáy đi qua hình chiếu.'],
        binh_luan_ghim: 'Nếu đổi SA bằng a căn 3 thì góc giữa SC và đáy bằng bao nhiêu độ? Bình luận nhé!',
        khong_thu_lai: 'Bài hình học không gian tổng hợp theo tham số a kiểm trực tiếp trên tam giác vuông.',
        tom_tat_gia_thiet: ['Chóp S.ABCD đáy vuông cạnh a', 'SA \\perp (ABCD)', 'SA = a\\sqrt{2}'],
        yeu_cau_ngan: 'd(A,(SBC)) = ?',
        tom_tat_3_buoc: [
          {chien_thuat: 'Khóa vuông góc', cong_thuc: 'BD \\perp (SAC)'},
          {chien_thuat: 'Góc hình chiếu', cong_thuc: '\\widehat{SCA} = 45^\\circ'},
          {chien_thuat: 'Đường cao mặt bên', cong_thuc: 'AH = \\dfrac{a\\sqrt{6}}{3}'},
        ],
        canh: kgGoc.canh.map(c => ({...c, mo_ta_minh_hoa: 'Hình chóp S.ABCD 3 pha xoay góc nhìn tập trung vào ' + c.tieu_de_canh})),
      },
    },
  };
}

const bo2Pha = taoBoDuLieuPha2A();
const ketQua2B = {};

await test('Luồng 2 pha Script-First (Single Source of Truth + Pha 2A -> Pha 2B) đạt cả 4 mảng không lỗi XS/T2/thu_lai', () => {
  const scGoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'schema/kich_ban_bp2.json'), 'utf8'));
  const ctx = vm.createContext({
    PropertiesService: {getScriptProperties: () => ({getProperty: () => null, setProperty() {}})},
    Logger: {log() {}},
  });
  for (const f of ['BoPhan1.gs', 'NangCao.gs', 'KiemTraHinh.gs', 'HinhHoc.gs', 'PromptKichBan.gs', 'SanKhau.gs']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, {filename: f});
  }
  Object.assign(ctx, {
    cauHinh_: () => '', nhatKy_: () => {}, cauNoiGanDay_: () => [],
    mauVangChoPrompt_: () => 'MẪU VÀNG THAM KHẢO: 1 mẫu chuẩn\n',
    baiHocEditCoDacChoPrompt_: (_r, toiDa) => {
      assert.equal(toiDa, 5, 'Pha 2A chỉ nạp tối đa 5 luật từ bai_hoc_edit.json');
      return 'SỔ TAY BÀI HỌC CÔ ĐẶC (tối đa 5 luật):\n- [Tránh] A -> [Làm thay] B\n';
    },
  });

  // 1) Đồng bộ tuyệt đối schema/kich_ban_bp2.json <-> BoPhan1.gs (chuẩn hóa realm qua JSON)
  const clone = (o) => JSON.parse(JSON.stringify(o));
  assert.deepStrictEqual(clone(ctx.schemaPha2A_()), scGoc.pha_2a);
  assert.deepStrictEqual(clone(ctx.schemaKichBan_()), scGoc.pha_2b);
  assert.deepStrictEqual(clone(ctx.schemaAnhXa2B_('HINH_PHANG')), scGoc.pha_2b_anh_xa.HINH_PHANG);
  assert.deepStrictEqual(clone(ctx.schemaAnhXa2B_('HINH_KHONG_GIAN')), scGoc.pha_2b_anh_xa.HINH_KHONG_GIAN);

  // 2) Prompt Pha 2A thuần sư phạm: có đề, 2 cách giải, mẫu vàng, 5 luật, thu_lai, binh_luan_ghim, mo_ta_minh_hoa, cấm SVG/bảng đếm
  const p2a = ctx.taoPromptPha2A_(bo2Pha.XAC_SUAT.de_info, {cac_buoc: ['Cách 1']}, {y_tuong: 'Chia 2 TH', cac_buoc: ['Cách 2']});
  assert.match(p2a, /PHA 2A/);
  assert.match(p2a, /MẪU VÀNG THAM KHẢO/);
  assert.match(p2a, /tối đa 5 luật/);
  assert.match(p2a, /thu_lai/);
  assert.match(p2a, /binh_luan_ghim/);
  assert.match(p2a, /mo_ta_minh_hoa/);
  assert.match(p2a, /TUYỆT ĐỐI KHÔNG viết mã Python\/SVG/);

  // 3) Chạy Pha 2B Python (scripts/dao_dien_2b.py) trên đủ 4 mảng
  for (const mang of ['XAC_SUAT', 'THUC_TE', 'HINH_PHANG', 'HINH_KHONG_GIAN']) {
    const raw = execFileSync(python, ['-X', 'utf8', 'scripts/dao_dien_2b.py', '-'], {
      cwd: ROOT, input: JSON.stringify(bo2Pha[mang]), encoding: 'utf8', timeout: 30000,
    });
    const kq = JSON.parse(raw);
    assert.equal(kq.ok, true, `${mang}: Pha 2B phải ok`);
    assert.equal(kq.mang, mang, `${mang}: xác định đúng mảng`);
    assert.deepEqual(kq.loi_schema, [], `${mang}: không lỗi schema/kich_ban_bp2.json`);
    ketQua2B[mang] = kq.kb;

    if (mang === 'XAC_SUAT') {
      assert.ok(kq.xac_suat && kq.xac_suat.n_a === 25 && kq.xac_suat.n_omega === 28 && kq.xac_suat.khop === true, 'xac_suat_dong tính chính xác 25/28');
      assert.equal(kq.kb.khung4tang.san_khau.loai, 'rut_mau');
      assert.ok(kq.kb.khung4tang.buoc.some(b => b.hanh_dong && b.hanh_dong.pha === 'truong_hop' && b.hanh_dong.do === 1));
      assert.ok(kq.kb.khung4tang.buoc.some(b => b.hanh_dong && b.hanh_dong.pha === 'truong_hop' && b.hanh_dong.do === 2));
      ctx.tuSuaSanKhau_(kq.kb, bo2Pha.XAC_SUAT.de_info);
      assert.deepEqual(Array.from(kq.kb._v96_loi || []).filter(x => /^XS_SAI_DAP_SO/.test(x)), [], 'Không phát sinh XS_SAI_DAP_SO');
      assert.ok(!ctx.kiemTraQuyTrinh_(kq.kb).nang.some(x => /THIEU_PHAN_QUY_TRINH|THU_LAI_HINH_THUC/.test(x)), 'XAC_SUAT đủ thu_lai');
    } else if (mang === 'THUC_TE') {
      assert.equal(kq.nguon_hinh, 'kho_manh_svg:tui_tien_lai_suat', 'Bài tiền bạc ánh xạ đúng mảnh tui_tien_lai_suat (cấm khối hộp)');
      assert.ok(kq.kb.khung4tang.tu_sinh && kq.kb.khung4tang.tu_sinh.ma.includes('tui_tien_lai_suat'));
      assert.ok(!kq.kb.khung4tang.tu_sinh.ma.includes('hop_chu_nhat_3d'));
      assert.ok(!ctx.kiemTraQuyTrinh_(kq.kb).nang.some(x => /THIEU_PHAN_QUY_TRINH|THU_LAI_HINH_THUC/.test(x)), 'THUC_TE đủ thu_lai');
    } else if (mang === 'HINH_PHANG') {
      assert.equal(kq.kb.luong, 'hinh_hoc_thuan');
      assert.ok(kq.kb.hinh_phang_chuan && Array.isArray(kq.kb.hinh_phang_chuan.trang_chung_minh));
    } else if (mang === 'HINH_KHONG_GIAN') {
      assert.equal(kq.kb.luong, 'hinh_hoc_thuan');
      assert.ok(kq.kb.hinh_khong_gian && Array.isArray(kq.kb.hinh_khong_gian.cac_net_dung) && Array.isArray(kq.kb.hinh_khong_gian.net_phu));
      // Kiểm chứng giữ nguyên nhánh khung_hinh_hoc_du_phong khi Manim 3D không có hinh_khong_gian
      const kbManim = structuredClone(bo2Pha.HINH_KHONG_GIAN.kb_2a);
      delete kbManim.hinh_khong_gian;
      const kqManim = JSON.parse(execFileSync(python, ['-X', 'utf8', 'scripts/dao_dien_2b.py', '-'], {
        cwd: ROOT, input: JSON.stringify({kb_2a: kbManim, de_info: bo2Pha.HINH_KHONG_GIAN.de_info}), encoding: 'utf8', timeout: 30000,
      }));
      assert.equal(kqManim.nguon_hinh, 'khung_hinh_hoc_du_phong');
      assert.ok(kqManim.kb.tom_tat_gia_thiet.length >= 2);
    }
  }
});

await test('KhoKey gửi lại đúng key của từng yêu cầu song song và không đánh dấu key', () => {
  const goi = [];
  const gia = (url, opts) => {
    const body = JSON.parse(opts.payload);
    const gc = body.generationConfig;
    goi.push({url, key: opts.headers['x-goog-api-key'], gc});
    const code = gc.responseSchema ? 400 : 200;
    return {getResponseCode: () => code, getContentText: () => code === 400
      ? '{"error":{"message":"Invalid response_schema: property not found"}}' : JSON.stringify(ketQuaGemini)};
  };
  const ctx = vm.createContext({UrlFetchApp: {fetch: gia, fetchAll: yc => yc.map(x => gia(x.url, x))}});
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'KhoKey.gs'), 'utf8'), ctx);
  Object.assign(ctx, {
    khoDanhSachKey_: () => ['thu-1', 'thu-2'], khoXep_: () => ({dung: ['thu-1', 'thu-2']}),
    khoGhiNhanLoi_: () => assert.fail('lỗi schema không đi qua bộ phân loại key'),
    khoGhi404_: () => assert.fail('property not found trong schema không phải lỗi model 404'),
  });
  const body = {contents: [], generationConfig: {temperature: 0.4, responseMimeType: 'application/json', responseSchema: {type: 'OBJECT'}}};
  const model = 'gemini-2.5-pro';
  assert.ok(ctx.khoGoi_('VIDEO', model, JSON.stringify(body)).ok);
  assert.ok(ctx.khoGoiSong_('VIDEO', model, [body, body]).every(r => r.ok));
  assert.deepEqual(goi.map(x => [x.key, !!x.gc.responseSchema]), [
    ['thu-1', true], ['thu-1', false], ['thu-1', true], ['thu-2', true], ['thu-1', false], ['thu-2', false],
  ]);
  assert.ok(goi.every(x => x.url.endsWith('/' + model + ':generateContent') && x.gc.temperature === 0.4 && x.gc.responseMimeType === 'application/json'));
  assert.ok(body.generationConfig.responseSchema);
});

await test('Broker Node thử lại cùng model/key và giữ JSON MIME qua HTTP 400', async () => {
  const goi = [];
  const server = http.createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    goi.push({url: req.url, body});
    const coSchema = !!body.generationConfig.responseSchema;
    res.writeHead(coSchema ? 400 : 200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(coSchema ? {error: {message: 'Unsupported response_schema'}} : ketQuaGemini));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const tep = path.join(tmp, 'gemini.json');
    fs.writeFileSync(tep, JSON.stringify({
      model: 'gemini-2.5-pre-render-test', tungModel: true, keys: ['key-gia'], gioiHanGiay: 3,
      bodies: [{contents: [{parts: [{text: 'test'}]}], generationConfig: {
        responseMimeType: 'application/json', responseSchema: {type: 'OBJECT', properties: {dap_an_cuoi: {type: 'STRING'}}},
      }}],
    }));
    const {stdout, stderr} = await exec(process.execPath, ['scripts/bophan1/goi_gemini.js', tep], {
      cwd: ROOT, timeout: 15000,
      env: {...process.env, GEMINI_GOC: 'http://127.0.0.1:' + server.address().port, TEMP: tmp, TMP: tmp, TMPDIR: tmp},
    });
    assert.ok(JSON.parse(stdout)[0].ok);
    assert.match(stderr, /GEMINI_SCHEMA_FALLBACK/);
    assert.equal(goi.length, 2);
    assert.equal(goi[0].url, goi[1].url);
    assert.ok(goi[0].body.generationConfig.responseSchema);
    assert.equal(goi[1].body.generationConfig.responseSchema, undefined);
    assert.equal(goi[1].body.generationConfig.responseMimeType, 'application/json');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

await test('Workflow đóng gói hai lỗi nặng và đúng lượt giao cho Auto-Heal', () => {
  const yaml = fs.readFileSync(path.join(ROOT, '.github/workflows/dung-video.yml'), 'utf8');
  const buoc = yaml.split('id: bao_sua', 2)[1].split('\n      - name:', 1)[0];
  const py = /^ {10}python3 - <<'PY'\r?\n([\s\S]*?)^ {10}PY\r?$/m.exec(buoc);
  assert.ok(py, 'đọc được phần chuẩn bị webhook');
  const dir = path.join(tmp, 'webhook');
  fs.mkdirSync(path.join(dir, 'out/pre_render'), {recursive: true});
  const loi = soiHop([a, {...b, x: 230}, {...a, id: 3, nhan: 'outro_cta', x: 900, y: 800}], 96, 'Bước 2');
  fs.writeFileSync(path.join(dir, 'out/pre_render/bao_cao.json'), JSON.stringify({dat: false, loi}));
  execFileSync(python, ['-X', 'utf8', '-c', py[1].replace(/^ {10}/gm, '')], {cwd: dir,
    env: {...process.env, ID_VIDEO: 'video-thu', LAN_GIAO: 'lan-thu', DUNG_VIDEO_SECRET: 'gia-lap'}});
  const {ok, id, lan_giao, kiem_duyet} = JSON.parse(fs.readFileSync(path.join(dir, 'bao_kiem_duyet.json'), 'utf8'));
  assert.deepEqual([ok, id, lan_giao, kiem_duyet.loai], [false, 'video-thu', 'lan-thu', 'bo_cuc']);
  assert.match(kiem_duyet.nang[0], /^DE_CHU · Bước 2 \(frame 96\) · tieu_de_buoc ↔ svg_text:/);
  assert.match(kiem_duyet.nang[1], /^TRAN_KHUNG .*outro_cta:/);
});

await test('Cửa 2 gộp đo DOM (TEX_THO, KATEX_LOI, t2_trong, thuong_hieu) + Cửa 3 chấm điểm gộp + dung-video.yml bỏ Chromium lần 2', () => {
  // 1) Cửa 2: soiDomPhu bắt TEX_THO, KATEX_LOI thật (bỏ qua KaTeX hợp lệ), t2_trong trên THUC_TE, thuong_hieu cũ
  const loiDom = soiDomPhu(
    {
      texTho: ['\\frac{1}{2}'],
      katexLoi: ['\\frac{1}{2}', '\\frac{1}{'],
      coVungT2: true,
      hinhT2: false,
      kenhCu: true,
      tranIntro: false,
    },
    {frame: 90, canh: 'Bước 2', thucTe: true, boCuc: '4tang'},
  );
  const ma = loiDom.map(x => x.loai);
  assert.ok(ma.includes('TEX_THO'), 'Cửa 2 bắt TEX_THO');
  assert.ok(ma.includes('KATEX_LOI'), 'Cửa 2 bắt KATEX_LOI thật');
  assert.equal(loiDom.filter(x => x.loai === 'KATEX_LOI').length, 1, 'Cửa 2 bỏ báo nhầm KaTeX hợp lệ');
  assert.ok(ma.includes('t2_trong'), 'Cửa 2 bắt t2_trong trên THUC_TE');
  assert.ok(ma.includes('thuong_hieu'), 'Cửa 2 bắt thương hiệu cũ');

  // 2) Workflow dung-video.yml chỉ mở Chromium 1 lần trước TTS (không chạy lại kiem_duyet.mjs sau bundle)
  const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/dung-video.yml'), 'utf8');
  assert.ok(yml.includes('node scripts/kiem_tra_de_chu_truoc_render.mjs'), 'Cửa 2 chạy trước TTS');
  assert.ok(!yml.includes('node scripts/kiem_duyet.mjs'), 'Bỏ bước mở Chromium lần 2 kiem_duyet.mjs');
  assert.ok(yml.includes('scripts/mat_than_3x3.py public/props.json') && yml.includes('kich_ban.json'), 'Cửa 3 truyền kich_ban.json để hậu kiểm 1 lần');
  assert.ok(yml.includes("d['ai_hau_kiem'] = mt['hau_kiem']"), 'Webhook gửi kết quả hậu kiểm Cửa 3 về Apps Script');

  // 3) Cửa 3 Python: tinh_hau_kiem_cua_3 tính % đúng và chặn khi thiếu t2_co_hinh hoặc điểm thấp
  const pyOut = execFileSync(python, ['-X', 'utf8', '-c',
    'import json,sys; sys.path.insert(0,"scripts"); import mat_than_3x3 as mt; '
    + 'ok=mt.tinh_hau_kiem_cua_3({"diem":{k:9 for k,_,_ in mt.TIEU_CHI_CUA_3},"t2_co_hinh":True},[],thuc_te=True); '
    + 'bad=mt.tinh_hau_kiem_cua_3({"diem":{k:9 for k,_,_ in mt.TIEU_CHI_CUA_3},"t2_co_hinh":False},[],thuc_te=True); '
    + 'print(json.dumps({"ok":ok,"bad":bad}))'], {cwd: ROOT, encoding: 'utf8'});
  const c3 = JSON.parse(pyOut);
  assert.equal(c3.ok.dat, true);
  assert.equal(c3.ok.phan_tram, 90);
  assert.equal(c3.bad.dat, false);
});

await test('PromptKichBan.gs ngắn hơn trước lượt tinh gọn', () => {
  const goc = 158538, truoc = 152214;
  const sau = Buffer.byteLength(fs.readFileSync(path.join(ROOT, 'PromptKichBan.gs'), 'utf8').replace(/\r\n/g, '\n'));
  assert.ok(sau < truoc);
  console.log('  PromptKichBan.gs ' + truoc + ' → ' + sau + ' byte (−' + ((truoc - sau) / truoc * 100).toFixed(2) + '% trong lượt này, −' + ((goc - sau) / goc * 100).toFixed(2) + '% so với bản gốc)');
});

if (!nhanh) {
  let props;
  await test('Props Koch: chọn 4–6 frame, đo Chromium thật và báo thời gian', () => {
    const dir = path.join(tmp, 'mau');
    props = path.join(dir, 'props.json');
    const bao = path.join(dir, 'bao.json');
    const bat = performance.now();
    execFileSync(python, ['-X', 'utf8', 'scripts/chuanbi.py', 'mau/v99_1/koch_dao.json',
      '--props-soi-chu', '--props-ra', props, '--out-dir', dir], {cwd: ROOT, encoding: 'utf8', timeout: 30000});
    const msProps = performance.now() - bat;
    const p = JSON.parse(fs.readFileSync(props, 'utf8'));
    assert.ok(p.canh.every(c => c.audio === null) && p.nhac === null);
    assert.equal(fs.existsSync(path.join(dir, p.id, 'checkpoint.json')), false);
    const mau = chonFrame(p, {fps: p.fps, durationInFrames: p.tongFrame});
    assert.ok(mau.length >= 4 && mau.length <= 6);
    assert.equal(mau[0].canh, 'Intro');
    assert.equal(mau.at(-1).canh, 'Outro');
    assert.ok(mau.some(x => x.canh === 'Kết luận'));
    const log = execFileSync(process.execPath, [CHROME_GATE, props, bao], {cwd: ROOT, encoding: 'utf8', timeout: 90000});
    assert.match(log, /Gate: [4-6] frame, [1-9]\d* hộp chữ, [\d.]+ s/);
    assert.deepEqual(JSON.parse(fs.readFileSync(bao, 'utf8')), {dat: true, loi: []});
    console.log('  Chuẩn bị props ' + (msProps / 1000).toFixed(2) + ' s. ' + log.trim().split('\n').at(-1));
  });
  await test('Chromium lỗi khởi động: cảnh báo và fail-open', async () => {
    assert.ok(props);
    const bao = path.join(tmp, 'bo_qua.json');
    const {stdout, stderr} = await exec(process.execPath, [CHROME_GATE, props, bao], {
      cwd: ROOT, timeout: 30000, env: {...process.env, TRINH_DUYET: path.join(tmp, 'chrome-khong-co')},
    });
    assert.match(stderr, /::warning::.*Chromium không khởi chạy được/);
    assert.match(stdout, /Gate: 0 frame/);
    assert.deepEqual(JSON.parse(fs.readFileSync(bao, 'utf8')), {dat: true, loi: []});
  });
  await test('Chromium bắt nhãn SVG đè nhau và nhãn bị cắt trong sân khấu thật', () => {
    const p = JSON.parse(fs.readFileSync(props, 'utf8'));
    const lop = p.khung4tang.tuSinh.lop.at(-1);
    lop.svg += '<text x="350" y="190" font-size="32">Nhãn kiểm A</text>' +
      '<text x="350" y="190" font-size="32">Nhãn kiểm B</text>' +
      '<text x="300" y="567" font-size="32">Nhãn bị cắt</text>';
    const tep = path.join(tmp, 'va_cham.json'), bao = path.join(tmp, 'ket_qua_va_cham.json');
    fs.writeFileSync(tep, JSON.stringify(p));
    const log = execFileSync(process.execPath, [CHROME_GATE, tep, bao], {cwd: ROOT, encoding: 'utf8', timeout: 90000});
    const kq = JSON.parse(fs.readFileSync(bao, 'utf8'));
    assert.equal(kq.dat, false);
    assert.ok(kq.loi.some(x => x.loai === 'DE_CHU' && /Nhãn kiểm A/.test(x.phan_tu_1) && /Nhãn kiểm B/.test(x.phan_tu_2)));
    assert.ok(kq.loi.some(x => x.loai === 'TRAN_KHUNG' && /Nhãn bị cắt/.test(x.phan_tu_1) && /khối bao cắt/.test(x.chi_tiet)));
    console.log('  ' + log.trim().split('\n').at(-1));
  });

  await test('End-to-end 4 mảng (Pha 2A -> Pha 2B -> chuanbi.py --gia-lap -> Collision Gate Chromium): >0 hộp chữ & dat=true', () => {
    for (const mang of ['XAC_SUAT', 'THUC_TE', 'HINH_PHANG', 'HINH_KHONG_GIAN']) {
      const dirM = path.join(tmp, 'e2e_' + mang.toLowerCase());
      const pubM = path.join(dirM, 'public');
      fs.mkdirSync(pubM, {recursive: true});
      const kbPath = path.join(dirM, 'kb_2b.json');
      const propsPath = path.join(dirM, 'props.json');
      const baoPath = path.join(dirM, 'bao.json');
      fs.writeFileSync(kbPath, JSON.stringify(ketQua2B[mang]));
      const cbOut = execFileSync(python, ['-X', 'utf8', 'scripts/chuanbi.py', kbPath, '--gia-lap', '--public', pubM, '--props-ra', propsPath, '--out-dir', dirM], {
        cwd: ROOT, encoding: 'utf8', timeout: 60000,
      });
      assert.ok(!/t2_trong|hinh_dung_im|XS_SAI_DAP_SO/.test(cbOut), `${mang}: chuanbi.py không phát sinh t2_trong/hinh_dung_im/XS_SAI_DAP_SO`);
      const p = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
      if (mang === 'XAC_SUAT') {
        assert.equal(p.khung4tang?.sanKhau?.n_a, 25);
        assert.equal(p.khung4tang?.sanKhau?.n_omega, 28);
      } else if (mang === 'THUC_TE') {
        assert.ok((p.khung4tang?.tuSinh?.lop?.length || 0) >= 3, 'THUC_TE có đủ lớp SVG trong T2');
      } else if (mang === 'HINH_PHANG') {
        assert.equal(p.boCuc, 'hinh_phang');
      } else if (mang === 'HINH_KHONG_GIAN') {
        assert.ok(p.khung4tang?.khongGian, 'HINH_KHONG_GIAN có sân khấu không gian 3D');
      }
      const gateLog = execFileSync(process.execPath, [CHROME_GATE, propsPath, baoPath], {
        cwd: ROOT, encoding: 'utf8', timeout: 90000,
      });
      const mHop = /Gate: (\d+) frame, (\d+) hộp chữ/.exec(gateLog);
      assert.ok(mHop && Number(mHop[2]) > 0, `${mang}: Pre-Render Collision Gate phải đo được > 0 hộp chữ (${gateLog.trim()})`);
      const bao = JSON.parse(fs.readFileSync(baoPath, 'utf8'));
      assert.equal(bao.dat, true, `${mang}: Collision Gate dat=true (lỗi: ${JSON.stringify(bao.loi)})`);
      console.log(`  [${mang}] ${gateLog.trim().split('\n').at(-1)}`);
    }
  });
}

fs.rmSync(tmp, {recursive: true, force: true});
console.log('test_pre_render_va_schema: ' + dat + ' đạt, ' + hong + ' hỏng');
process.exitCode = hong ? 1 : 0;
