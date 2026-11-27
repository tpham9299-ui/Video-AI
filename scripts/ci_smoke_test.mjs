#!/usr/bin/env node
// Khối 4 — CI Smoke Test tự động kiểm tra nhanh toàn hệ thống (< 60s):
//  1. Quét toàn bộ .github/workflows/*.yml có sparse-checkout, đối chiếu với tệp cấu hình được script trong job đó đọc.
//  2. Kiểm tra hợp lệ bai_hoc_edit.json, mau_vang/index.json, đủ 5 tệp SFX WAV sạch trong public/sfx/, và khóa chống ồn DongCoSfx.
//  3. Chạy chuanbi.py --gia-lap cho các đề mẫu chuẩn (HINH_PHANG, HINH_KHONG_GIAN, THUC_TE, XAC_SUAT).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const PY = process.platform === 'win32' ? 'python' : 'python3';

let dat = 0;
const hong = [];
const kiem = (ten, dk, chiTiet = '') => {
  if (dk) {
    dat++;
    console.log(`  ✓ ${ten}`);
  } else {
    hong.push(ten + (chiTiet ? ` — ${chiTiet}` : ''));
    console.log(`  ✗ ${ten}${chiTiet ? ` — ${chiTiet}` : ''}`);
  }
};

// 1. Quét sparse-checkout trong toàn bộ .github/workflows/*.yml
console.log('1. Kiểm tra sparse-checkout vs tệp cấu hình trong .github/workflows/*.yml');
const wfDir = path.join(ROOT, '.github', 'workflows');
const wfFiles = fs.existsSync(wfDir) ? fs.readdirSync(wfDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')) : [];
const CONFIG_FILES = ['phong_cach.json', 'bai_hoc_edit.json', 'mau_vang'];

function trichTepConfigTrongScript(scriptRelPath) {
  const full = path.join(ROOT, scriptRelPath);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) return [];
  const src = fs.readFileSync(full, 'utf8');
  const found = new Set();
  for (const cfg of CONFIG_FILES) {
    if (src.includes(cfg)) found.add(cfg);
  }
  return [...found];
}

for (const wf of wfFiles) {
  const txt = fs.readFileSync(path.join(wfDir, wf), 'utf8');
  if (!txt.includes('sparse-checkout:')) continue;
  // Tách từng job block có sparse-checkout
  const blocks = txt.split(/(?=\n\s{2}[a-zA-Z0-9_-]+:\s*\n)/);
  let checkedJobs = 0;
  for (const blk of blocks) {
    const mSparse = /sparse-checkout:\s*\|\r?\n((?:\s+[^\r\n]+\r?\n)+)/.exec(blk);
    if (!mSparse) continue;
    checkedJobs++;
    const jobName = (/^\s{2}([a-zA-Z0-9_-]+):/m.exec(blk) || [])[1] || 'job';
    const listed = mSparse[1]
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^\/+/, '').replace(/\/+$/, ''))
      .filter(Boolean);
    const needed = new Set();
    // Kiểm trực tiếp trong thân job
    for (const cfg of CONFIG_FILES) {
      if (blk.includes(cfg)) needed.add(cfg);
    }
    // Kiểm các script được gọi trong job (node scripts/..., python3 scripts/...)
    const reScript = /(?:node|python3?)\s+(scripts\/[A-Za-z0-9_./-]+\.(?:[cm]?js|py))/g;
    let m;
    while ((m = reScript.exec(blk))) {
      for (const cfg of trichTepConfigTrongScript(m[1])) needed.add(cfg);
    }
    const thieu = [...needed].filter((cfg) => !listed.some((l) => l === cfg || cfg.startsWith(l + '/') || l.startsWith(cfg + '/')));
    kiem(`${wf} [${jobName}]: sparse-checkout đủ tệp cấu hình (${[...needed].join(', ') || 'không'})`, thieu.length === 0, thieu.length ? `thiếu: ${thieu.join(', ')}` : '');
  }
  if (!checkedJobs) kiem(`${wf}: phân tích được sparse-checkout`, false);
}

// 2. Kiểm tra bai_hoc_edit.json, mau_vang/index.json, public/sfx/ (5 tệp) và DongCoSfx
console.log('2. Kiểm tra bai_hoc_edit.json, mau_vang/index.json, public/sfx/ và DongCoSfx');
try {
  const bh = JSON.parse(fs.readFileSync(path.join(ROOT, 'bai_hoc_edit.json'), 'utf8'));
  const cms = ['HINH_PHANG', 'HINH_KHONG_GIAN', 'THUC_TE', 'XAC_SUAT'];
  const duCm = cms.every((k) => Array.isArray(bh.chuyen_muc?.[k]) && bh.chuyen_muc[k].length <= 8);
  const allRules = cms.flatMap((k) => bh.chuyen_muc?.[k] || []);
  const khuonOk = allRules.length > 0 && allRules.every((r) => /^\[Tránh\]\s+.+\s+->\s+\[Làm thay\]\s+.+$/.test(String(r.luat || '')) && typeof r.so_lan_tai_pham === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(String(r.ngay_cap_nhat || '')));
  kiem('bai_hoc_edit.json hợp lệ (<= 8 luật/chuyên mục, đúng khuôn [Tránh] -> [Làm thay])', duCm && khuonOk);
} catch (e) {
  kiem('bai_hoc_edit.json đọc được', false, String(e.message));
}

try {
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'mau_vang', 'index.json'), 'utf8'));
  const ds = Array.isArray(idx.mau) ? idx.mau : [];
  const coHP = ds.some((m) => m.chuyen_muc === 'HINH_PHANG');
  const coKG = ds.some((m) => m.chuyen_muc === 'HINH_KHONG_GIAN');
  const tepOk = ds.every((m) => {
    const p = path.join(ROOT, 'mau_vang', String(m.tep || ''));
    if (!fs.existsSync(p)) return false;
    JSON.parse(fs.readFileSync(p, 'utf8'));
    return true;
  });
  kiem('mau_vang/index.json hợp lệ (đủ mẫu HINH_PHANG + HINH_KHONG_GIAN, đủ tệp JSON)', coHP && coKG && tepOk);
} catch (e) {
  kiem('mau_vang/index.json đọc được', false, String(e.message));
}

const SFX_CAN = ['draw.wav', 'pop.wav', 'whoosh.wav', 'trap.wav', 'ding.wav'];
const sfxThieu = SFX_CAN.filter((ten) => {
  const p = path.join(ROOT, 'public', 'sfx', ten);
  if (!fs.existsSync(p)) return true;
  const buf = fs.readFileSync(p);
  return buf.length < 1000 || buf.subarray(0, 4).toString('ascii') !== 'RIFF';
});
kiem(`public/sfx/ đủ 5 tệp WAV hợp lệ (${SFX_CAN.join(', ')})`, sfxThieu.length === 0, sfxThieu.length ? `lỗi: ${sfxThieu.join(', ')}` : '');

// Kiểm tra khóa chống ồn & cooldown 3.5s trong src/amthanh/DongCoSfx.tsx
try {
  const kq = await build({
    entryPoints: [path.join(ROOT, 'src', 'amthanh', 'DongCoSfx.tsx')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    external: ['react', 'remotion'],
    logLevel: 'error',
  });
  fs.mkdirSync(path.join(ROOT, 'out'), {recursive: true});
  const tep = path.join(ROOT, 'out', `dong_co_sfx_${process.pid}.mjs`);
  fs.writeFileSync(tep, kq.outputFiles[0].text);
  const mod = await import(pathToFileURL(tep).href);
  fs.unlinkSync(tep);
  const lich = mod.lapLichSfx([
    {loai: 'net_phu', t: 5.0},
    {loai: 'ket_qua_chip', t: 6.2},
    {loai: 'chuyen_pha', t: 8.6},
    {loai: 'bay', t: 8.9},
    {loai: 'moc_cong_bo', t: 15.0},
  ]);
  const volOk = lich.every((x) => x.volume >= 0.14 && x.volume <= 0.18);
  const cdOk = lich.every((x, i) => i === 0 || x.t - lich[i - 1].t >= 3.5 - 1e-6);
  const uuOk = lich.some((x) => x.loai === 'bay') && lich.some((x) => x.loai === 'moc_cong_bo');
  kiem('DongCoSfx: volume 0.14–0.18, cooldown cứng >= 3.5s, ưu tiên sự kiện quan trọng', volOk && cdOk && uuOk, JSON.stringify(lich));
} catch (e) {
  kiem('DongCoSfx biên dịch & chạy lapLichSfx', false, String(e.message));
}

// 3. Chạy chuanbi.py --gia-lap cho các đề mẫu chuẩn
console.log('3. Smoke test chuanbi.py --gia-lap trên các luồng chuẩn');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video_ai_smoke_'));
const MAU_SMOKE = [
  {ten: 'HINH_PHANG (am_vuong_de)', tep: 'mau/hinh_phang/am_vuong_de.json', kiemProps: (p) => p.boCuc === 'hinh_phang' && (p.deBai?.cho?.length || 0) > 0 && (p.hinhPhang?.dong_giai?.length || 0) > 0 && (p.hinhPhang?.tomTat?.length || 0) >= 2 && !!p.hinhPhang?.mocCau},
  {ten: 'HINH_KHONG_GIAN (vuong_goc_sa)', tep: 'mau/v97/vuong_goc_sa.json', kiemProps: (p) => p.boCuc === '4tang' && !!p.khung4tang?.khongGian && (p.deBai?.cho?.length || 0) > 0 && !/VUÔNG GÓC\s*·\s*VUÔNG GÓC/i.test(String(p.khung4tang?.mocCau?.phu_de || ''))},
  {ten: 'THUC_TE (kien_bo_hop)', tep: 'mau/v99_2/kien_bo_hop.json', kiemProps: (p) => p.boCuc === '4tang' && !!p.khung4tang?.buoc?.length},
  {ten: 'XAC_SUAT (gap_nhau_xs)', tep: 'mau/v99_2/gap_nhau_xs.json', kiemProps: (p) => p.boCuc === '4tang' && !!p.khung4tang?.buoc?.length},
];

for (const m of MAU_SMOKE) {
  const full = path.join(ROOT, m.tep);
  if (!fs.existsSync(full)) {
    console.log(`  (bỏ qua ${m.ten}: không có ${m.tep})`);
    continue;
  }
  const ra = path.join(tmpDir, `${path.basename(m.tep, '.json')}_props.json`);
  const r = spawnSync(PY, ['-X', 'utf8', path.join(ROOT, 'scripts', 'chuanbi.py'), full, '--gia-lap', '--props-ra', ra], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {...process.env, PYTHONIOENCODING: 'utf-8'},
    timeout: 60000,
  });
  if (r.status !== 0 || !fs.existsSync(ra)) {
    kiem(`chuanbi.py --gia-lap ${m.ten}`, false, (r.stderr || r.stdout || '').slice(-220));
    continue;
  }
  const props = JSON.parse(fs.readFileSync(ra, 'utf8'));
  kiem(`chuanbi.py --gia-lap ${m.ten}`, m.kiemProps(props));
}
try { fs.rmSync(tmpDir, {recursive: true, force: true}); } catch (_e) {}

// 4. Kiểm thử Đợt 2: Kho 16 mảnh ghép SVG + Auto Cover Frame + Bình luận ghim biến thể
console.log('4. Kiểm thử kho 16 mảnh ghép SVG, Auto Cover Frame và bình luận ghim');
const rKhoSvg = spawnSync(PY, ['-X', 'utf8', path.join(ROOT, 'scripts', 'test_kho_manh_svg.py')], {
  cwd: ROOT,
  encoding: 'utf8',
  env: {...process.env, PYTHONIOENCODING: 'utf-8'},
  timeout: 90000,
});
kiem(
  'python -X utf8 scripts/test_kho_manh_svg.py',
  rKhoSvg.status === 0,
  rKhoSvg.status === 0 ? '' : (rKhoSvg.stderr || rKhoSvg.stdout || '').slice(-260),
);

console.log(`\nCI SMOKE TEST: ${dat} đạt, ${hong.length} hỏng`);
process.exit(hong.length ? 1 : 0);
