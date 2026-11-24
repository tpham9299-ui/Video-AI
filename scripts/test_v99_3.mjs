#!/usr/bin/env node
// v99.3 — Kiểm thử tự động toàn bộ Phần 1 đợt nâng cấp v99.3:
//   1. Khóa cứng thương hiệu 'Tư duy Xác suất' ở mọi mảng (Xác suất, Hình học, Hàm số, Parabol, Thực tế) trên cả Remotion, Python, phong_cach.json và Apps Script (.gs).
//   2. Hiệu ứng nền động nhẹ CPU theo useCurrentFrame(): 3 vầng sáng gradient trôi chậm (opacity 0.18-0.28), lưới tọa độ 2 tầng parallax, hạt bokeh / ký hiệu toán mờ phân biệt Hình học vs Xác suất.
//   3. Diệt sạch lỗi cắt chữ và đè khung: gỡ overflow:hidden ở tiêu đề Intro, câu Hook, viên thuốc nhãn BƯỚC, thanh ĐỀ, hộp công thức; auto-fit fontSize + padding an toàn; bỏ cắt thô [:28]/.slice() làm đứt chữ/LaTeX ("P(Tích | 3, te"); cố định khoảng cách vùng an toàn T2 - T3 - phụ đề - T4.
//   4. Vá 3 lỗi vận hành từ NHAT_KY & GitHub Actions:
//      - .github/workflows/dang-video.yml cài rclone qua apt-get install (bỏ curl rclone.org/install.sh)
//      - BoPhan1.gs / KhoKey.gs chặn tạm 12 giờ cho cả HTTP 404 (MODEL_KHONG_CO) và cache HTTP 429 (HET_HAN_MUC_NGAY) theo cặp key + model
//      - ZaloDeBai.gs / DOC_DE khóa danh sách ngắn 3-4 model chuyên đọc ảnh ổn định (loại transcribe và model 404)

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOC = path.resolve(__dirname, '..');

const nap = async (vao) => {
  const kq = await build({
    entryPoints: [path.resolve(GOC, vao)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    logLevel: 'error',
    external: ['react', 'remotion'],
    loader: {'.css': 'empty'},
  });
  fs.mkdirSync(path.join(GOC, 'out'), {recursive: true});
  const tep = path.join(GOC, 'out', `v993_${path.basename(vao)}_${process.pid}.mjs`);
  fs.writeFileSync(tep, kq.outputFiles[0].text);
  const m = await import(pathToFileURL(tep).href);
  fs.unlinkSync(tep);
  return m;
};

const {
  suyMangNen,
  vangSangDong,
  luoiParallax,
  hatBokehToan,
  viTriHat,
  DS_THEME,
  THEME_V99,
  CHU_CHINH,
  tuongPhan,
} = await nap('src/khung4tang/nen_v99.ts');
const {boCuc4Tang, vungAnToanT3PhuDe, KHOANG_AN_TOAN} = await nap('src/khung4tang/vung.ts');
const {coTieuDeIntro, coCauHookIntro} = await nap('src/khung4tang/bo_cuc_v93.ts');
const {coNhanBuoc, coTieuDeBuoc} = await nap('src/khung4tang/TangTieuDe.tsx');
const {coChuThanhDe, rongMucDe} = await nap('src/khung4tang/ThanhDe.tsx');
const {coChuTheChu, coNhanThe} = await nap('src/khung4tang/TangTheGiai.tsx');
const {TEN_THUONG_HIEU, chuanThuongHieu} = await nap('src/ThuongHieu.tsx');

let dat = 0, hong = 0;
function ktra(ten, fn) {
  try {
    fn();
    dat++;
    console.log('  ✓ ' + ten);
  } catch (e) {
    hong++;
    console.error('  ✗ ' + ten + ' — ' + (e && e.message ? e.message : e));
  }
}

console.log('1. Khóa cứng thương hiệu "Tư duy Xác suất" ở mọi mảng');
ktra('Remotion: TEN_THUONG_HIEU và chuanThuongHieu luôn trả "Tư duy Xác suất"', () => {
  assert.equal(TEN_THUONG_HIEU, 'Tư duy Xác suất');
  for (const dauVao of ['Tư duy Toán', 'Tư duy Xác suất', 'Hình học', 'Hàm số', 'Parabol', '', null, undefined]) {
    assert.equal(chuanThuongHieu(dauVao), 'Tư duy Xác suất');
  }
});

ktra('phong_cach.json & các component Remotion (.tsx) đều dùng thương hiệu cố định', () => {
  const pc = JSON.parse(fs.readFileSync(path.join(GOC, 'phong_cach.json'), 'utf8'));
  assert.equal(pc.thuongHieu.ten, 'Tư duy Xác suất');
  assert.equal(pc.thuongHieu.tenTheoChuyenMuc['Xác suất'], 'Tư duy Xác suất');
  assert.equal(pc.thuongHieu.tenTheoChuyenMuc.mac_dinh, 'Tư duy Xác suất');
  for (const f of ['src/khung4tang/Khung4Tang.tsx', 'src/khung4tang/IntroMocCau.tsx', 'src/khung4tang/OutroTomTat.tsx', 'src/Intro.tsx', 'src/ManKet.tsx', 'src/AnhBia.tsx', 'src/Video.tsx']) {
    const src = fs.readFileSync(path.join(GOC, f), 'utf8');
    assert.ok(!src.includes("'Tư duy Toán'") && !src.includes('"Tư duy Toán"'), f + ' còn chứa cứng "Tư duy Toán"');
  }
});

ktra('Python (chuanbi.py & mat_than_3x3.py): mọi mảng đều khóa "Tư duy Xác suất" và không cắt đứt [:28] ở de_ghim', () => {
  const pyCode = [
    'import sys, json',
    'sys.path.insert(0, "scripts")',
    'import chuanbi, mat_than_3x3',
    'import tempfile',
    'th, _ = chuanbi.tim_thuong_hieu(tempfile.mkdtemp(), {"ten": "Tư duy Toán"})',
    'assert th["ten"] == "Tư duy Xác suất"',
    'for m in ["XAC_SUAT", "HINH_HOC", "THUC_TE", ""]:',
    '    kb = {"mon": m, "chu_de": "Hình chóp & Parabol", "de_bai": "Tính thể tích hình chóp S.ABCD"}',
    '    assert chuanbi.ten_kenh_theo_chuyen_muc({"ten": "Tư duy Toán"}, {}, kb)["ten"] == "Tư duy Xác suất", m',
    '    assert chuanbi.logo_theo_chuyen_muc({"ten": "Tư duy Toán"}, tempfile.mkdtemp(), kb)["ten"] == "Tư duy Xác suất", m',
    'src = open("scripts/chuanbi.py", encoding="utf-8").read()',
    'import re',
    'lines = src.splitlines()',
    'i = next(j for j, d in enumerate(lines) if "de_ghim = [{" in d)',
    'dong_ghim = [lines[i], lines[i + 1]]',
    'assert not any(re.search(r"nhan\\"\\) or \\"\\"\\)\\[:\\d+\\]", d) for d in dong_ghim), dong_ghim',
    'nhan = r"P(\\text{Tích} \\mid 3, \\text{tổng chẵn}) = ?"',
    'ns = {"k4": {"de_ghim": [{"nhan": nhan}]}, "mau": lambda x: x}',
    'exec(lines[i].strip() + " " + lines[i + 1].strip(), ns)',
    'assert ns["de_ghim"][0]["nhan"] == nhan, ns["de_ghim"]',
    'p_ai = mat_than_3x3.prompt_ai({"dapAn": "1/5", "thuongHieu": {"chuyenMuc": "toan"}}, 8)',
    'assert "Tư duy Xác suất" in p_ai',
    'print("PY_OK")',
  ].join('\n');
  const r = spawnSync('python', ['-X', 'utf8', '-c', pyCode], {cwd: GOC, encoding: 'utf8'});
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.ok(r.stdout.includes('PY_OK'));
});

console.log('2. Hiệu ứng nền động thực sự (nhẹ CPU) theo useCurrentFrame()');
ktra('vangSangDong: 3 vầng sáng gradient trôi theo frame với opacity trong khoảng [0.18, 0.28]', () => {
  for (const f of [0, 45, 120, 300, 600]) {
    const ds = vangSangDong(f, 30, 720, '#3FD0E0', '#8E7CFF', 18);
    assert.equal(ds.length, 3);
    for (const v of ds) {
      assert.ok(v.opacity >= 0.18 && v.opacity <= 0.28, `frame ${f} ${v.id} opacity=${v.opacity}`);
    }
  }
  const f0 = vangSangDong(0, 30, 720);
  const f90 = vangSangDong(90, 30, 720);
  assert.notEqual(f0[0].cx, f90[0].cx, 'vầng sáng phải dịch chuyển theo frame');
  assert.notEqual(f0[1].cy, f90[1].cy, 'vầng sáng phụ phải dịch chuyển theo frame');
});

ktra('luoiParallax & hatBokehToan: lưới 2 tầng trượt parallax và phân biệt Hình học vs Xác suất', () => {
  const l0 = luoiParallax(0, 30);
  const l90 = luoiParallax(90, 30);
  assert.notEqual(l0.ganX, l90.ganX);
  assert.notEqual(l0.xaY, l90.xaY);

  assert.equal(suyMangNen({khongGian: {doiTuong: []}}), 'hinh_hoc');
  assert.equal(suyMangNen({theme: 'blueprint'}), 'hinh_hoc');
  assert.equal(suyMangNen({sanKhau: {loai: 'so_do_cay'}}), 'xac_suat');
  assert.equal(suyMangNen({theme: 'cosmic_indigo'}), 'xac_suat');
  assert.equal(suyMangNen({sanKhau: {loai: 'kinh_te_do_thi'}}), 'ham_so');

  const hatHH = hatBokehToan('hinh_hoc', 14);
  const hatXS = hatBokehToan('xac_suat', 14);
  assert.ok(hatHH.some((h) => h.kieu === 'khoi_mo'), 'Hình học có hình khối mờ');
  assert.ok(hatXS.some((h) => h.kieu === 'cot_mo'), 'Xác suất có biểu đồ cột mờ');
  assert.ok(hatXS.some((h) => h.kieu === 'bokeh'), 'Xác suất có hạt bokeh');
  const vt0 = viTriHat(hatXS[0], 0, 30);
  const vt60 = viTriHat(hatXS[0], 60, 30);
  assert.notEqual(vt0.y, vt60.y);
});

ktra('NenKhiQuyen.tsx và NenTramToanHoc.tsx đều gắn useCurrentFrame() và không dùng feTurbulence / filter blur nặng', () => {
  for (const f of ['src/khung4tang/NenKhiQuyen.tsx', 'src/khung4tang/NenTramToanHoc.tsx']) {
    const src = fs.readFileSync(path.join(GOC, f), 'utf8');
    assert.ok(src.includes('useCurrentFrame'), f + ' phải dùng useCurrentFrame()');
    assert.ok(!src.includes('<feTurbulence') && !src.includes('backdropFilter'), f + ' không được dùng filter nặng CPU');
  }
  for (const k of DS_THEME) {
    const th = THEME_V99[k];
    assert.ok(tuongPhan(CHU_CHINH, th.tren) >= 7);
    assert.ok(tuongPhan(CHU_CHINH, th.duoi) >= 7);
  }
});

console.log('3. Diệt sạch lỗi cắt chữ, auto-fit fontSize và tách vùng an toàn');
ktra('Gỡ overflow:hidden làm cụt chữ ở Intro, viên thuốc BƯỚC, thanh ĐỀ, hộp công thức và phụ đề', () => {
  const k4 = fs.readFileSync(path.join(GOC, 'src/khung4tang/Khung4Tang.tsx'), 'utf8');
  assert.ok(!/function Tang[\s\S]{0,220}overflow:\s*'hidden'/.test(k4), 'Tang không còn overflow:hidden');
  assert.ok(!/function PhuDeMotDong[\s\S]{0,600}overflow:\s*'hidden'/.test(k4), 'PhuDeMotDong không còn overflow:hidden');

  for (const f of ['src/khung4tang/TangTieuDe.tsx', 'src/khung4tang/ThanhDe.tsx', 'src/khung4tang/TangTheGiai.tsx', 'src/khung4tang/IntroMocCau.tsx']) {
    const src = fs.readFileSync(path.join(GOC, f), 'utf8');
    assert.ok(!src.includes("overflow: 'hidden'") && !src.includes('overflow:"hidden"'), f + ' vẫn còn overflow:hidden');
  }
});

ktra('Auto-fit fontSize thu nhỏ theo độ dài chuỗi cho tiêu đề Intro, câu Hook, nhãn BƯỚC, thanh ĐỀ và thẻ giải', () => {
  assert.ok(coTieuDeIntro(['NGẮN']) > coTieuDeIntro(['TIÊU ĐỀ INTRO DÀI HƠN HAI MƯƠI LĂM KÝ TỰ ĐỂ KIỂM TRA AUTO FIT']));
  assert.ok(coCauHookIntro(['Câu ngắn?']) > coCauHookIntro(['Tại sao có tới 95% học sinh chọn nhầm phương án này khi tính xác suất có điều kiện?']));
  assert.ok(coNhanBuoc('Đề bài') > coNhanBuoc('Xác suất toàn phần & công thức Bayes'));
  assert.ok(coTieuDeBuoc('Đặt ẩn x') > coTieuDeBuoc('Lập hàm diện tích toàn phần và khảo sát trên miền xác định'));
  const deDai = String.raw`P(\text{Tích} \mid 3, \text{tổng chẵn}) = ?`;
  assert.ok(coChuThanhDe([{nhan: 'x > 0'}]) >= coChuThanhDe([{nhan: deDai}, {nhan: 'n(\\Omega) = C_{10}^{3}'}, {nhan: 'Không hoàn lại'}]));
  assert.ok(coChuThanhDe([{nhan: deDai}, {nhan: deDai}, {nhan: deDai}]) >= 16, 'thanh ĐỀ co tối thiểu 16 px, không cắt chữ');
  assert.ok(rongMucDe(deDai, 24) > rongMucDe('x > 0', 24));
  assert.ok(coChuTheChu('Ta có x = 2') > coChuTheChu('Áp dụng bất đẳng thức Cauchy cho ba số dương để tìm giá trị nhỏ nhất của biểu thức'));
  assert.ok(coNhanThe('Đặt ẩn') >= coNhanThe('Xét điều kiện chia hết cho 3 và tổng chẵn'));
});

ktra('Vùng an toàn (safe zone) tách biệt rõ khu hình minh họa T2, khung công thức T3, vùng phụ đề và thanh ĐỀ T4', () => {
  const bc = boCuc4Tang(true);
  const v = vungAnToanT3PhuDe(bc, true);
  // T1 < T2 < T3 < phụ đề < T4, có khoảng đệm an toàn không đè nhau
  assert.ok(bc.t1.y >= 212);
  assert.ok(bc.t2.y >= bc.t1.y + bc.t1.h);
  assert.ok(v.t3.y >= bc.t2.y + bc.t2.h + KHOANG_AN_TOAN.t2_t3, 'T3 tách khỏi T2 >= 18px');
  assert.ok(v.yPhuDe >= v.t3.y + v.t3.h + KHOANG_AN_TOAN.t3_phuDe, 'phụ đề tách khỏi T3 >= 14px');
  assert.ok(bc.t4.y >= v.yPhuDe + KHOANG_AN_TOAN.caoPhuDe + KHOANG_AN_TOAN.phuDe_t4, 'T4 tách khỏi phụ đề >= 10px');
  assert.ok(bc.t4.y + bc.t4.h <= 1574);
});

console.log('4. Vá 3 lỗi vận hành từ NHAT_KY & GitHub Actions');
ktra('.github/workflows/dang-video.yml cài rclone thẳng qua apt-get, bỏ hẳn curl https://rclone.org/install.sh', () => {
  const yml = fs.readFileSync(path.join(GOC, '.github/workflows/dang-video.yml'), 'utf8');
  assert.ok(!yml.includes('rclone.org/install.sh'), 'vẫn còn rclone.org/install.sh');
  assert.ok(yml.includes('sudo apt-get update -qq && sudo apt-get install -y -qq rclone'), 'thiếu lệnh apt-get install rclone');
});

ktra('BoPhan1.gs / KhoKey.gs / ZaloDeBai.gs: chặn 12h HTTP 404 (MODEL_KHONG_CO), cache cặp (key + model) HTTP 429 (HET_HAN_MUC_NGAY), khóa 3-4 model đọc ảnh cho DOC_DE', () => {
  const bo = {};
  const props = {};
  const ctx = vm.createContext({
    console, Date, Math, JSON, Number, String, Array, Object, RegExp, Error, isFinite, parseInt, parseFloat,
    Logger: {log: () => {}},
    Utilities: {
      sleep: () => {},
      formatDate: () => '2026-11-24',
      base64Encode: () => 'AA==',
      computeDigest: (_a, s) => Array.from(createHash('md5').update(String(s)).digest()).map((x) => (x > 127 ? x - 256 : x)),
      DigestAlgorithm: {MD5: 'MD5', SHA_256: 'SHA_256', SHA_1: 'SHA_1'},
      Charset: {UTF_8: 'UTF_8'},
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => bo[k] || null,
        put: (k, v) => { bo[k] = String(v); },
        putAll: (o) => { Object.assign(bo, o); },
        remove: (k) => { delete bo[k]; },
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        getProperties: () => ({...props}),
        setProperty: (k, v) => { props[k] = String(v); },
        deleteProperty: (k) => { delete props[k]; },
      }),
    },
  });
  for (const f of ['KhoKey.gs', 'BoPhan1.gs', 'ZaloDeBai.gs', 'SanKhau.gs', 'PromptKichBan.gs', 'KiemTraHinh.gs']) {
    vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
  }
  Object.assign(ctx, {
    cauHinh_: () => '',
    nhatKy_: () => {},
    khoDanhSachKey_: () => ['AIzaSyKeyA_11111111111111111111111111', 'AIzaSyKeyB_22222222222222222222222222'],
    conDuGoiGemini_: () => true,
  });

  // (a) Khóa thương hiệu trong Apps Script (.gs)
  for (const mon of ['XAC_SUAT', 'HINH_HOC', 'THUC_TE']) {
    const kb = {mon, thuong_hieu: 'Tư duy Toán', khung4tang: {thuong_hieu: 'Tư duy Toán', buoc: [{canh: 1, tieu_de: 'Đề bài', the: []}]}, canh: [{so: 1, loai: 'de_bai', loi_thoai: 'Đề bài chuẩn.'}]};
    ctx.tuSuaHinhThuc_(kb, {id: 'T1', mon, de_bai: 'Đề toán kiểm tra thương hiệu dài hơn ba mươi ký tự.'});
    assert.equal(kb.thuong_hieu, 'Tư duy Xác suất');
    if (kb.khung4tang) assert.equal(kb.khung4tang.thuong_hieu, 'Tư duy Xác suất');   // bài hình học thuần bị gỡ khung4tang (khóa luồng)
  }
  for (const ten of ['Tư duy Toán', '', 'Hình học']) assert.equal(ctx.chuanThuongHieu_(ten), 'Tư duy Xác suất');

  // (b) Chặn tạm 12 giờ cho HTTP 404 (MODEL_KHONG_CO)
  assert.equal(ctx.chanModel404_('gemini-2.5-flash-preview-09-2025', 12), true);
  assert.equal(ctx.modelBiChan404_('gemini-2.5-flash-preview-09-2025'), true);
  assert.equal(ctx.modelConSong_('gemini-2.5-flash-preview-09-2025'), false);

  // (c) Cache HTTP 429 (HET_HAN_MUC_NGAY) theo từng cặp key + model (không khóa nhầm model khác của cùng key hoặc key khác)
  const keyA = 'AIzaSyKeyA_11111111111111111111111111';
  const keyB = 'AIzaSyKeyB_22222222222222222222222222';
  ctx.ghiCapHetNgay429_(keyA, 'gemini-2.5-flash');
  assert.equal(ctx.capDaHetNgay429_(keyA, 'gemini-2.5-flash'), true, 'cặp (keyA, gemini-2.5-flash) đã hết hạn mức ngày');
  assert.equal(ctx.capDaHetNgay429_(keyA, 'gemini-3.0-flash'), false, 'cùng keyA nhưng model khác vẫn còn dùng được');
  assert.equal(ctx.capDaHetNgay429_(keyB, 'gemini-2.5-flash'), false, 'keyB với gemini-2.5-flash vẫn còn dùng được');

  // (d) Bước DOC_DE khóa danh sách ngắn 3-4 model chuyên đọc ảnh ổn định, loại bỏ transcribe và model 404
  bo.DS_MODEL_SONG = JSON.stringify([
    'gemini-2.5-flash-transcribe',
    'gemini-2.5-flash-preview-09-2025',
    'gemini-3.0-flash',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro',
  ]);
  const dsDocDe = Array.from(ctx.dsModelDocDe_());
  assert.ok(dsDocDe.length >= 3 && dsDocDe.length <= 4, 'dsModelDocDe_ phải có 3-4 model: ' + JSON.stringify(dsDocDe));
  assert.ok(!dsDocDe.some((m) => /transcribe/i.test(m)), 'không được chứa model transcribe');
  assert.ok(!dsDocDe.includes('gemini-2.5-flash-preview-09-2025'), 'không được chứa model đã bị chặn 404');

  let optsGoi = null;
  ctx.goiGemini_ = (_p, _n, o) => { optsGoi = o; return {doc_duoc: true, de_bai: 'Cho hình chóp S.ABCD có đáy là hình vuông cạnh a.'}; };
  ctx.docDe_({}, {id: 'ZL993', de_bai: 'Tính thể tích khối chóp', file_anh: ''}, Date.now() + 120000);
  assert.ok(Array.isArray(optsGoi.models) && optsGoi.models.length >= 3 && optsGoi.models.length <= 4);
  assert.equal(optsGoi.soVongThu, 1);
});

console.log(`\nKẾT QUẢ v99.3: ${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
