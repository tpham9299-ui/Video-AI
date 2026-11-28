#!/usr/bin/env node
// CI Smoke Test — Lưới chặn lỗi tuyệt đối trước khi chạy thật (< 60s):
//  1. Quét chéo import Python & require/import JS đệ quy đối chiếu sparse-checkout trong .github/workflows/*.yml.
//  2. Kiểm tra cú pháp YAML (không Tab) & trường an toàn (timeout-minutes, cấm cancel-in-progress: true ở BP3-BP5, callback lỗi + retry).
//  3. Đối chiếu tên workflow & inputs giữa toàn bộ *.gs và on.workflow_dispatch.inputs trong .github/workflows/*.yml.
//  4. Kiểm tra bẫy .gitignore cho tài nguyên bắt buộc (public/sfx/*.wav, phong_cach.json, bai_hoc_edit.json, mau_vang/index.json).
//  5. Kiểm tra hợp lệ bai_hoc_edit.json, mau_vang/index.json, đủ 5 tệp SFX WAV sạch, khóa chống ồn DongCoSfx.
//  6. Chạy chuanbi.py --gia-lap cho các đề mẫu chuẩn + kiểm chứng checkpoint TTS/Manim/Audio Mastering + cảnh báo quỹ key < 20%.
//  7. Kiểm thử kho 16 mảnh ghép SVG, Auto Cover Frame và bình luận ghim biến thể.
//  8. Kiểm thử luồng phân tích YouTube Analytics hàng tuần (đề xuất kho vàng mau_vang/).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
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

const wfDir = path.join(ROOT, '.github', 'workflows');
const wfFiles = fs.existsSync(wfDir) ? fs.readdirSync(wfDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort() : [];

// =========================================================================
// 1. Quét chéo import Python & require/import JS đệ quy đối chiếu sparse-checkout
// =========================================================================
console.log('1. Quét chéo import Python & require/import JS đối chiếu sparse-checkout');
const CONFIG_REFS = ['phong_cach.json', 'bai_hoc_edit.json', 'mau_vang/index.json', 'mau_vang', 'schema/kich_ban_bp2.json'];

function normRel(p) {
  return p.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
}

function duocCheBoiSparse(neededPath, listed) {
  const n = normRel(neededPath);
  return listed.some((raw) => {
    const l = normRel(raw);
    if (!l) return false;
    if (l === n) return true;
    if (n.startsWith(l + '/')) return true;
    // Glob đơn giản kiểu /*.gs hoặc public/sfx/*.wav
    if (l.includes('*')) {
      const re = new RegExp('^' + l.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+') + '$');
      if (re.test(n)) return true;
    }
    return false;
  });
}

function giaiQuyetPyModule(modName, currentFileRel) {
  const res = [];
  const curDir = path.dirname(currentFileRel);
  const parts = modName.replace(/^\.+/, '').split('.').filter(Boolean);
  if (!parts.length) return res;
  const isRel = modName.startsWith('.');
  const bases = isRel ? [curDir] : ['scripts', curDir];
  for (const base of bases) {
    const asFile = normRel(path.join(base, ...parts) + '.py');
    const asDir = normRel(path.join(base, ...parts));
    if (fs.existsSync(path.join(ROOT, asFile)) && fs.statSync(path.join(ROOT, asFile)).isFile()) {
      res.push(asFile);
      break;
    }
    if (fs.existsSync(path.join(ROOT, asDir)) && fs.statSync(path.join(ROOT, asDir)).isDirectory()) {
      res.push(asDir);
      break;
    }
  }
  return res;
}

function truyVetDeQuy(entryRels) {
  const needed = new Set();
  const visited = new Set();
  const queue = [...entryRels.map(normRel)];

  const addFileOrDir = (rel) => {
    const n = normRel(rel);
    if (n === '.') return; // path.join(GOC, biến) không chỉ tới một tệp có thể truy vết.
    const full = path.join(ROOT, n);
    if (!fs.existsSync(full)) return;
    needed.add(n);
    if (fs.statSync(full).isDirectory()) {
      if (visited.has(n)) return;
      visited.add(n);
      for (const entry of fs.readdirSync(full)) {
        if (entry === '__pycache__') continue;
        const child = normRel(path.join(n, entry));
        const cf = path.join(ROOT, child);
        if (fs.statSync(cf).isFile() && /\.(?:py|[cm]?js)$/.test(entry)) {
          queue.push(child);
        }
      }
      return;
    }
    if (!visited.has(n)) queue.push(n);
  };

  while (queue.length) {
    const rel = queue.shift();
    if (visited.has(rel)) continue;
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    if (fs.statSync(full).isDirectory()) {
      addFileOrDir(rel);
      continue;
    }
    visited.add(rel);
    needed.add(rel);
    const src = fs.readFileSync(full, 'utf8');

    // Tệp cấu hình / tài nguyên được tham chiếu trực tiếp
    for (const cfg of CONFIG_REFS) {
      if (src.includes(cfg) && fs.existsSync(path.join(ROOT, cfg))) {
        needed.add(cfg);
      }
    }
    for (const mSfx of src.matchAll(/public\/sfx\/[A-Za-z0-9_.-]+\.wav/g)) {
      if (fs.existsSync(path.join(ROOT, mSfx[0]))) needed.add(mSfx[0]);
    }
    for (const mFont of src.matchAll(/public\/fonts\/[A-Za-z0-9_.-]+/g)) {
      if (fs.existsSync(path.join(ROOT, mFont[0]))) needed.add(mFont[0]);
    }

    if (rel.endsWith('.py')) {
      // Tránh nhận nhầm chuỗi ví dụ trong docstring dài bằng cách bỏ qua comment # ở đầu dòng
      const lines = src.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        let m;
        if ((m = /^from\s+(\.[A-Za-z0-9_.]*|[A-Za-z0-9_.]+)\s+import\s+(.+)$/.exec(trimmed))) {
          const mod = m[1];
          const targets = m[2].split('#')[0].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
          if (mod === '.') {
            for (const t of targets) {
              for (const found of giaiQuyetPyModule('.' + t, rel)) addFileOrDir(found);
            }
          } else {
            const foundMod = giaiQuyetPyModule(mod, rel);
            for (const found of foundMod) addFileOrDir(found);
            for (const t of targets) {
              for (const sub of giaiQuyetPyModule(mod + '.' + t, rel)) addFileOrDir(sub);
            }
          }
        } else if ((m = /^import\s+([A-Za-z0-9_.,\s]+?)(?:\s+as\s+\w+)?(?:\s*#.*)?$/.exec(trimmed))) {
          for (const part of m[1].split(',')) {
            const mod = part.trim().split(/\s+as\s+/)[0].trim();
            if (!mod) continue;
            for (const found of giaiQuyetPyModule(mod, rel)) addFileOrDir(found);
          }
        }
      }
    } else if (/\.[cm]?js$/.test(rel)) {
      const curDir = path.dirname(rel);
      // require('./...') và import ... from './...'
      for (const m of src.matchAll(/(?:require\(\s*|from\s+)['"]([^'"]+)['"]/g)) {
        const spec = m[1];
        if (!spec.startsWith('.')) continue;
        const base = normRel(path.join(curDir, spec));
        const cands = [base, base + '.js', base + '.cjs', base + '.mjs'];
        for (const c of cands) {
          if (fs.existsSync(path.join(ROOT, c)) && fs.statSync(path.join(ROOT, c)).isFile()) {
            addFileOrDir(c);
            break;
          }
        }
      }
      // path.join(__dirname, 'file.js') hoặc path.join(__dirname, 'sub', 'file.js')
      for (const m of src.matchAll(/path\.join\(\s*__dirname\s*,\s*([^)]+)\)/g)) {
        const segs = [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
        if (!segs.length) continue;
        const cand = normRel(path.join(curDir, ...segs));
        if (fs.existsSync(path.join(ROOT, cand))) addFileOrDir(cand);
      }
      // path.join(GOC, 'scripts', 'foo.py') hoặc path.join(GOC, 'phong_cach.json') (bỏ qua tệp xuất tạm ket_qua_*.json)
      for (const m of src.matchAll(/path\.join\(\s*GOC\s*,\s*([^)]+)\)/g)) {
        const segs = [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
        if (!segs.length) continue;
        const cand = normRel(path.join(...segs));
        if (cand.startsWith('out/') || /^(?:ket_qua_|gui_|bao_)/.test(path.basename(cand))) continue;
        if (fs.existsSync(path.join(ROOT, cand))) addFileOrDir(cand);
      }
      // Danh sách tệp .gs nạp bằng vm.runInContext
      for (const m of src.matchAll(/['"]([A-Za-z0-9_]+\.gs)['"]/g)) {
        if (fs.existsSync(path.join(ROOT, m[1]))) needed.add(m[1]);
      }
    }
  }
  return [...needed].sort();
}

for (const wf of wfFiles) {
  const txt = fs.readFileSync(path.join(wfDir, wf), 'utf8');
  if (!txt.includes('sparse-checkout:')) continue;
  const blocks = txt.split(/(?=\r?\n  [a-zA-Z0-9_-]+:\r?\n)/);
  let checkedJobs = 0;
  for (const blk of blocks) {
    const mSparse = /sparse-checkout:\s*\|\r?\n((?:\s+[^\r\n]+\r?\n)+)/.exec(blk);
    if (!mSparse) continue;
    checkedJobs++;
    const jobName = (/^  ([a-zA-Z0-9_-]+):/m.exec(blk) || [])[1] || 'job';
    const listed = mSparse[1]
      .split(/\r?\n/)
      .map((l) => normRel(l.trim()))
      .filter(Boolean);
    const entries = new Set();
    const directNeeded = new Set();
    for (const cfg of CONFIG_REFS) {
      if (blk.includes(cfg) && fs.existsSync(path.join(ROOT, cfg))) directNeeded.add(cfg);
    }
    const reScript = /(?:node|python3?|\/tmp\/mv\/bin\/python|bash)\s+(?:-[A-Za-z0-9]+\s+)*(scripts\/[A-Za-z0-9_./-]+\.(?:[cm]?js|py|sh))/g;
    let m;
    while ((m = reScript.exec(blk))) entries.add(m[1]);
    if (/\bnpm run kiem-tra\b/.test(blk)) {
      const npmTests = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts['kiem-tra'];
      for (const script of npmTests.matchAll(reScript)) entries.add(script[1]);
    }
    // Bắt thêm `from scripts.xxx import ...` hoặc `import scripts.xxx` trong inline Python của workflow
    for (const mi of blk.matchAll(/(?:from|import)\s+scripts\.([A-Za-z0-9_.]+)/g)) {
      for (const found of giaiQuyetPyModule(mi[1], 'scripts/__inline__.py')) entries.add(found);
    }
    const traced = truyVetDeQuy([...entries]);
    const allNeeded = [...new Set([...directNeeded, ...traced])].sort();
    const thieu = allNeeded.filter((p) => !duocCheBoiSparse(p, listed));
    kiem(
      `${wf} [${jobName}]: sparse-checkout đủ toàn bộ script/module đệ quy & cấu hình (${allNeeded.length} tệp)`,
      thieu.length === 0,
      thieu.length ? `THIẾU: ${thieu.join(', ')}` : '',
    );
  }
  if (!checkedJobs) kiem(`${wf}: phân tích được sparse-checkout`, false);
}

// Kiểm tra tường minh bộ dựng hình Tầng 2 dự phòng (scripts/du_phong_t2.py), đạo diễn Pha 2B (scripts/dao_dien_2b.py)
// và nguồn chân lý Schema duy nhất (schema/kich_ban_bp2.json) trong các workflow cốt lõi
kiem('scripts/du_phong_t2.py tồn tại trên ổ đĩa', fs.existsSync(path.join(ROOT, 'scripts', 'du_phong_t2.py')));
kiem('scripts/dao_dien_2b.py tồn tại trên ổ đĩa', fs.existsSync(path.join(ROOT, 'scripts', 'dao_dien_2b.py')));
kiem('schema/kich_ban_bp2.json tồn tại trên ổ đĩa', fs.existsSync(path.join(ROOT, 'schema', 'kich_ban_bp2.json')));
for (const wf of ['bo-phan-1.yml', 'viet-kich-ban.yml', 'dung-video.yml']) {
  const txt = fs.readFileSync(path.join(wfDir, wf), 'utf8');
  const coDuPhong = txt.includes('scripts/du_phong_t2.py') || !txt.includes('sparse-checkout:') || /^\s*\/?scripts\s*$/m.test(txt);
  const coDaoDien = txt.includes('scripts/dao_dien_2b.py') || !txt.includes('sparse-checkout:') || /^\s*\/?scripts\s*$/m.test(txt);
  const coSchema = /^\s*\/?schema(?:\/kich_ban_bp2\.json)?\s*$/m.test(txt) || !txt.includes('sparse-checkout:');
  kiem(`${wf}: bao phủ scripts/du_phong_t2.py trong checkout/sparse-checkout`, coDuPhong);
  kiem(`${wf}: bao phủ scripts/dao_dien_2b.py & schema/kich_ban_bp2.json trong sparse-checkout`, coDaoDien && coSchema);
}
{
  // Kiểm tra đồng bộ Single Source of Truth Schema giữa schema/kich_ban_bp2.json, BoPhan1.gs (bản nội tuyến Apps Script), Node & Python
  const scGoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'schema', 'kich_ban_bp2.json'), 'utf8'));
  const gsCtx = vm.createContext({Object, Array, String, Number, JSON, RegExp, Math, Date});
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'BoPhan1.gs'), 'utf8'), gsCtx, {filename: 'BoPhan1.gs'});
  const gs2a = JSON.parse(JSON.stringify(gsCtx.schemaPha2A_()));
  const gs2b = JSON.parse(JSON.stringify(gsCtx.schemaKichBan_()));
  let khop2a = false, khop2b = false;
  try { assert.deepStrictEqual(gs2a, scGoc.pha_2a); khop2a = true; } catch (_e) {}
  try { assert.deepStrictEqual(gs2b, scGoc.pha_2b); khop2b = true; } catch (_e) {}
  const khopHinhPhang = JSON.stringify(gsCtx.schemaAnhXa2B_('HINH_PHANG')) === JSON.stringify(scGoc.pha_2b_anh_xa.HINH_PHANG);
  const nodeGoi = fs.readFileSync(path.join(ROOT, 'scripts', 'bophan1', 'goi_gemini.js'), 'utf8');
  const pyCb = fs.readFileSync(path.join(ROOT, 'scripts', 'chuanbi.py'), 'utf8');
  const py2b = fs.readFileSync(path.join(ROOT, 'scripts', 'dao_dien_2b.py'), 'utf8');
  const duNguon = nodeGoi.includes('kich_ban_bp2.json') && py2b.includes('kich_ban_bp2.json') && pyCb.includes('dao_dien_2b');
  kiem('Single Source of Truth: schema/kich_ban_bp2.json đồng bộ 100% với BoPhan1.gs, goi_gemini.js, dao_dien_2b.py & chuanbi.py', khop2a && khop2b && khopHinhPhang && duNguon,
    [!khop2a && 'lệch pha_2a', !khop2b && 'lệch pha_2b', !khopHinhPhang && 'lệch ánh xạ hình phẳng', !duNguon && 'thiếu tham chiếu Node/Python'].filter(Boolean).join(', '));
}

// =========================================================================
// 2. Kiểm tra cú pháp YAML & trường an toàn của toàn bộ .github/workflows/*.yml
// =========================================================================
console.log('2. Kiểm tra cú pháp YAML & trường an toàn (.github/workflows/*.yml)');
const BP_LIMITS = {
  'sinh-de.yml': {maxTimeout: 20, camCancel: false, canCallback: true},
  'bo-phan-1.yml': {maxTimeout: 20, camCancel: false, canCallback: true},
  'viet-kich-ban.yml': {maxTimeout: 20, camCancel: false, canCallback: true},
  'dung-video.yml': {maxTimeout: 45, camCancel: true, canCallback: true},
  'kiem-tra-video.yml': {maxTimeout: 20, camCancel: true, canCallback: true},
  'dang-video.yml': {maxTimeout: 20, camCancel: true, canCallback: true},
  'ci-smoke-test.yml': {maxTimeout: 10},
  'don-video-drive.yml': {maxTimeout: 15, camCancel: true, canCallback: true},
  'kiem-tra-key.yml': {maxTimeout: 10},
  'phan-tich-tuan.yml': {maxTimeout: 10},
  'thu-giong.yml': {maxTimeout: 20},
};

for (const wf of wfFiles) {
  const txt = fs.readFileSync(path.join(wfDir, wf), 'utf8');
  const coTab = /\t/.test(txt);
  const coOnJobs = /^on:/m.test(txt) && /^jobs:/m.test(txt);
  kiem(`${wf}: cú pháp YAML sạch (không Tab, có on: & jobs:)`, !coTab && coOnJobs, coTab ? 'chứa ký tự Tab' : !coOnJobs ? 'thiếu on:/jobs:' : '');

  const rule = BP_LIMITS[wf] || {maxTimeout: 45};

  // Tách phần jobs: và kiểm từng job có timeout-minutes hợp lệ
  const jobsPart = txt.split(/^jobs:\s*$/m)[1] || '';
  const jobBlocks = jobsPart.split(/(?=\r?\n  [a-zA-Z0-9_-]+:\r?\n)/).filter((b) => /^  [a-zA-Z0-9_-]+:/m.test(b));
  const timeoutLoi = [];
  for (const jb of jobBlocks) {
    const jName = (/^  ([a-zA-Z0-9_-]+):/m.exec(jb) || [])[1] || 'job';
    const mTo = /^ {4}timeout-minutes:[ \t]*([1-9]\d*)[ \t]*(?:#.*)?$/m.exec(jb);
    if (!mTo) timeoutLoi.push(`${jName}: thiếu timeout-minutes`);
    else if (Number(mTo[1]) > rule.maxTimeout) timeoutLoi.push(`${jName}: timeout=${mTo[1]} > ${rule.maxTimeout}`);
  }
  kiem(`${wf}: mọi job có timeout-minutes <= ${rule.maxTimeout}`, jobBlocks.length > 0 && timeoutLoi.length === 0, timeoutLoi.join('; '));

  if (rule.camCancel) {
    const cancelVals = [...txt.matchAll(/^ *cancel-in-progress:[ \t]*(.*)$/gm)].map((m) => m[1].split('#')[0].trim());
    const anToan = cancelVals.every((v) => v === 'false');
    kiem(`${wf}: KHÔNG đặt cancel-in-progress: true`, anToan, anToan ? '' : `cancel-in-progress=${cancelVals.join(', ')}`);
  }

  if (rule.canCallback) {
    const coCb = /if:\s*\$\{\{\s*(?:always|failure)\(\)/.test(txt) && txt.includes('APPS_SCRIPT_URL');
    const coRunUrl = txt.includes('run_url');
    const coRetry = txt.includes('--retry 3');
    kiem(
      `${wf}: có callback báo lỗi (always/failure), gửi run_url và curl --retry 3`,
      coCb && coRunUrl && coRetry,
      [!coCb && 'thiếu callback always/failure', !coRunUrl && 'thiếu run_url', !coRetry && 'thiếu --retry 3'].filter(Boolean).join(', '),
    );
  }
}

// =========================================================================
// 3. Kiểm tra khớp tên workflow & inputs giữa *.gs và on.workflow_dispatch.inputs
// =========================================================================
console.log('3. Kiểm tra khớp inputs giữa *.gs và on.workflow_dispatch.inputs');
function docInputsWorkflow(wfName) {
  const full = path.join(wfDir, wfName);
  if (!fs.existsSync(full)) return null;
  const txt = fs.readFileSync(full, 'utf8');
  const m = /workflow_dispatch:\s*\r?\n\s+inputs:\s*\r?\n((?:[ \t]+[^\r\n]*\r?\n|\r?\n)*?)(?=^\S|^  \S|\Z)/m.exec(txt);
  const set = new Set();
  if (m) {
    for (const l of m[1].split(/\r?\n/)) {
      const mk = /^      ([a-zA-Z0-9_-]+):\s*$/.exec(l);
      if (mk) set.add(mk[1]);
    }
  }
  return set;
}

const gsFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.gs')).sort();
const boNaoSrc = fs.readFileSync(path.join(ROOT, 'BoNaoDieuPhoi.gs'), 'utf8');
const mWfArr = /workflow:\s*\[([^\]]+)\]/.exec(boNaoSrc);
const boNaoWorkflows = mWfArr ? [...mWfArr[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
kiem(
  `BoNaoDieuPhoi.gs: đủ 6 workflow tồn tại trong .github/workflows/`,
  boNaoWorkflows.length === 6 && boNaoWorkflows.every((w) => fs.existsSync(path.join(wfDir, w))),
  boNaoWorkflows.filter((w) => !fs.existsSync(path.join(wfDir, w))).join(', '),
);

const dispatchChecks = [];
for (const gf of gsFiles) {
  const src = fs.readFileSync(path.join(ROOT, gf), 'utf8');
  // Tìm mọi lời gọi guiWorkflowGitHub_({ ... }, 'xxx.yml') hoặc guiWorkflowGitHub_({ ... }, BO_NAO_.workflow[bp])
  const reCall = /guiWorkflowGitHub_\(\s*\{([^}]*)\}\s*,\s*([^)]+)\)/g;
  let m;
  while ((m = reCall.exec(src))) {
    const objBody = m[1];
    const wfExpr = m[2].trim();
    const keys = [...objBody.matchAll(/(?:^|,)\s*([a-zA-Z0-9_]+)\s*:/g)].map((x) => x[1]);
    const targets = [];
    const mLit = /^['"]([^'"]+\.yml)['"]$/.exec(wfExpr);
    if (mLit) {
      targets.push(mLit[1]);
    } else if (/BO_NAO_\.workflow\[/.test(wfExpr)) {
      // BoNaoDieuPhoi.gs: gọi cho bp === 1 và bp === 2
      if (boNaoWorkflows[1]) targets.push(boNaoWorkflows[1]);
      if (boNaoWorkflows[2]) targets.push(boNaoWorkflows[2]);
    }
    for (const wfName of targets) {
      dispatchChecks.push({gf, wfName, keys});
    }
  }
}

kiem('Tìm thấy đầy đủ lời gọi guiWorkflowGitHub_ trong *.gs (>= 6 workflow)', dispatchChecks.length >= 6, `tìm thấy ${dispatchChecks.length}`);
for (const {gf, wfName, keys} of dispatchChecks) {
  const declared = docInputsWorkflow(wfName);
  const thieu = declared ? keys.filter((k) => !declared.has(k)) : ['KHÔNG TỒN TẠI WORKFLOW'];
  kiem(
    `${gf} -> ${wfName}: khớp inputs (${keys.join(', ') || 'rỗng'})`,
    declared !== null && thieu.length === 0,
    thieu.length ? `chưa khai báo trong workflow_dispatch.inputs: ${thieu.join(', ')}` : '',
  );
}

// =========================================================================
// 4. Kiểm tra bẫy .gitignore cho tài nguyên bắt buộc
// =========================================================================
console.log('4. Kiểm tra bẫy .gitignore cho tài nguyên bắt buộc');
const SFX_CAN = ['draw.wav', 'pop.wav', 'whoosh.wav', 'trap.wav', 'ding.wav'];
const MANDATORY_TRACKED = [
  ...SFX_CAN.map((f) => `public/sfx/${f}`),
  'phong_cach.json',
  'bai_hoc_edit.json',
  'mau_vang/index.json',
];
if (fs.existsSync(path.join(ROOT, '.git'))) {
  const rIgn = spawnSync('git', ['check-ignore', '--no-index', ...MANDATORY_TRACKED], {cwd: ROOT, encoding: 'utf8'});
  const biChan = (rIgn.stdout || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  kiem(
    '.gitignore không chặn bất kỳ tài nguyên bắt buộc nào (public/sfx/*.wav, *.json)',
    biChan.length === 0,
    biChan.length ? `BỊ CHẶN BỞI .gitignore: ${biChan.join(', ')}` : '',
  );
  const rLs = spawnSync('git', ['ls-files', '--', ...MANDATORY_TRACKED], {cwd: ROOT, encoding: 'utf8'});
  const tracked = new Set((rLs.stdout || '').split(/\r?\n/).map((s) => normRel(s.trim())).filter(Boolean));
  const chuaTrack = MANDATORY_TRACKED.filter((p) => !tracked.has(p));
  kiem(
    'Toàn bộ tài nguyên bắt buộc đều đang được Git tracking',
    chuaTrack.length === 0,
    chuaTrack.length ? `CHƯA TRACK: ${chuaTrack.join(', ')}` : '',
  );
} else {
  console.log('  (bỏ qua kiểm tra git: không có thư mục .git)');
}

// =========================================================================
// 5. Kiểm tra bai_hoc_edit.json, mau_vang/index.json, public/sfx/ (5 tệp) và DongCoSfx
// =========================================================================
console.log('5. Kiểm tra bai_hoc_edit.json, mau_vang/index.json, public/sfx/ và DongCoSfx');
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

const sfxThieu = SFX_CAN.filter((ten) => {
  const p = path.join(ROOT, 'public', 'sfx', ten);
  if (!fs.existsSync(p)) return true;
  const buf = fs.readFileSync(p);
  return buf.length < 1000 || buf.subarray(0, 4).toString('ascii') !== 'RIFF';
});
kiem(`public/sfx/ đủ 5 tệp WAV hợp lệ (${SFX_CAN.join(', ')})`, sfxThieu.length === 0, sfxThieu.length ? `lỗi: ${sfxThieu.join(', ')}` : '');

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

// =========================================================================
// 6. Smoke test chuanbi.py --gia-lap + Checkpoint + Cảnh báo quỹ key < 20%
// =========================================================================
console.log('6. Smoke test chuanbi.py --gia-lap, checkpoint dựng video & cảnh báo quỹ key < 20%');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video_ai_smoke_'));
const MAU_SMOKE = [
  {ten: 'HINH_PHANG (am_vuong_de)', tep: 'mau/hinh_phang/am_vuong_de.json', kiemProps: (p) => p.boCuc === 'hinh_phang' && !p.intro && (p.deBai?.cho?.length || 0) > 0 && (p.hinhPhang?.dong_giai?.length || 0) > 0 && (p.hinhPhang?.tomTat?.length || 0) >= 2 && !!p.hinhPhang?.mocCau && p.outro?.loai === 'tu_tao'},
  {ten: 'HINH_KHONG_GIAN Remotion 3D (vuong_goc_sa)', tep: 'mau/v97/vuong_goc_sa.json', kiemProps: (p) => p.boCuc === '4tang' && !p.intro && !!p.khung4tang?.khongGian && (p.deBai?.cho?.length || 0) > 0 && !/VUÔNG GÓC\s*·\s*VUÔNG GÓC/i.test(String(p.khung4tang?.mocCau?.phu_de || '')) && p.outro?.loai === 'tu_tao'},
  {ten: 'HINH_KHONG_GIAN Manim 3D (kich_ban_hinh_khong_gian)', tep: 'mau/kich_ban_hinh_khong_gian.json', kiemProps: (p) => p.boCuc === '4tang' && !p.intro && p.mon === 'HINH_KHONG_GIAN' && p.khung4tang?.cheDo === 'HINH_KHONG_GIAN' && p.khung4tang?.khongGian === null && (p.khung4tang?.buoc?.length || 0) >= 2 && (p.khung4tang?.tomTat?.length || 0) >= 2 && p.outro?.loai === 'tu_tao'},
  {ten: 'THUC_TE (kien_bo_hop)', tep: 'mau/v99_2/kien_bo_hop.json', kiemProps: (p) => p.boCuc === '4tang' && !p.intro && !!p.khung4tang?.buoc?.length && p.outro?.loai === 'tu_tao'},
  {ten: 'XAC_SUAT (gap_nhau_xs)', tep: 'mau/v99_2/gap_nhau_xs.json', kiemProps: (p) => p.boCuc === '4tang' && !p.intro && !!p.khung4tang?.buoc?.length && p.outro?.loai === 'tu_tao'},
];

let mauCkPath = '';
let mauCkId = '';
for (const m of MAU_SMOKE) {
  const full = path.join(ROOT, m.tep);
  if (!fs.existsSync(full)) {
    console.log(`  (bỏ qua ${m.ten}: không có ${m.tep})`);
    continue;
  }
  const ra = path.join(tmpDir, `${path.basename(m.tep, '.json')}_props.json`);
  const r = spawnSync(PY, ['-X', 'utf8', path.join(ROOT, 'scripts', 'chuanbi.py'), full, '--gia-lap', '--props-ra', ra, '--out-dir', tmpDir], {
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
  if (!mauCkPath) {
    mauCkPath = full;
    mauCkId = props.id;
  }
}

// Kiểm tra checkpoint TTS tái dùng khi chạy lại cùng bài + checkpoint Manim / Audio Mastering
if (mauCkPath && mauCkId) {
  const ckPub = path.join(tmpDir, 'ck_pub');
  const ckOut = path.join(tmpDir, 'ck_out');
  fs.mkdirSync(path.join(ckPub, 'nhac'), {recursive: true});
  if (fs.existsSync(path.join(ROOT, 'public', 'nhac', 'lofi.wav'))) {
    fs.copyFileSync(path.join(ROOT, 'public', 'nhac', 'lofi.wav'), path.join(ckPub, 'nhac', 'lofi.wav'));
  }
  const r1 = spawnSync(PY, ['-X', 'utf8', path.join(ROOT, 'scripts', 'chuanbi.py'), mauCkPath, '--gia-lap', '--public', ckPub, '--props-ra', path.join(ckOut, 'p1.json'), '--out-dir', ckOut], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {...process.env, PYTHONIOENCODING: 'utf-8'},
    timeout: 60000,
  });
  const ckFile = path.join(ckOut, mauCkId, 'checkpoint.json');
  const ckExists = r1.status === 0 && fs.existsSync(ckFile);
  const r2 = spawnSync(PY, ['-X', 'utf8', path.join(ROOT, 'scripts', 'chuanbi.py'), mauCkPath, '--gia-lap', '--public', ckPub, '--props-ra', path.join(ckOut, 'p2.json'), '--out-dir', ckOut], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {...process.env, PYTHONIOENCODING: 'utf-8'},
    timeout: 60000,
  });
  const ttsTaiDung = ckExists && r2.status === 0 && /Checkpoint TTS hợp lệ/.test(r2.stdout || '');
  // Kiểm tra ghi & kiểm checkpoint manim và audio_mastering
  const fakeMov = path.join(ckOut, `${mauCkId}_manim.mov`);
  const fakeMp4 = path.join(ckOut, `${mauCkId}.mp4`);
  fs.writeFileSync(fakeMov, 'FAKE_MANIM_DATA_123456');
  fs.writeFileSync(fakeMp4, 'FAKE_MASTERED_MP4_123456');
  const rMGhi = spawnSync(PY, ['-X', 'utf8', path.join(ROOT, 'scripts', 'chuanbi.py'), '--checkpoint-ghi', 'manim', '--id', mauCkId, '--kich-ban', mauCkPath, '--tep', fakeMov, '--out-dir', ckOut], {cwd: ROOT, encoding: 'utf8'});
  const rMKiem = spawnSync(PY, ['-X', 'utf8', path.join(ROOT, 'scripts', 'chuanbi.py'), '--checkpoint-kiem', 'manim', '--id', mauCkId, '--kich-ban', mauCkPath, '--tep', fakeMov, '--out-dir', ckOut], {cwd: ROOT, encoding: 'utf8'});
  const rAGhi = spawnSync(PY, ['-X', 'utf8', path.join(ROOT, 'scripts', 'chuanbi.py'), '--checkpoint-ghi', 'audio_mastering', '--id', mauCkId, '--tep', fakeMp4, '--out-dir', ckOut], {cwd: ROOT, encoding: 'utf8'});
  const rAKiem = spawnSync(PY, ['-X', 'utf8', path.join(ROOT, 'scripts', 'chuanbi.py'), '--checkpoint-kiem', 'audio_mastering', '--id', mauCkId, '--tep', fakeMp4, '--out-dir', ckOut], {cwd: ROOT, encoding: 'utf8'});
  kiem(
    'Checkpoint chặng dựng video (TTS tái dùng, Manim & Audio Mastering ghi/kiểm hợp lệ)',
    ttsTaiDung && rMGhi.status === 0 && rMKiem.status === 0 && rAGhi.status === 0 && rAKiem.status === 0,
    !ttsTaiDung ? `r1=${r1.status}, ckExists=${ckExists}, stdout=${(r2.stdout || '').slice(-140)}` : '',
  );
}
try { fs.rmSync(tmpDir, {recursive: true, force: true}); } catch (_e) {}

// Kiểm tra cảnh báo quỹ key Gemini < 20% trong KhoKey.gs (gửi đúng 1 tin/ngày, chống spam)
try {
  const crypto = await import('node:crypto');
  const kProps = new Map();
  const kCache = new Map();
  const zaloMsgs = [];
  const kCtx = vm.createContext({
    Date, Math, JSON, Object, Array, String, Number, RegExp,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (kProps.has(k) ? kProps.get(k) : null),
        setProperty: (k, v) => kProps.set(k, String(v)),
        getProperties: () => Object.fromEntries(kProps.entries()),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (kCache.has(k) ? kCache.get(k) : null),
        put: (k, v) => kCache.set(k, String(v)),
        getAll: (ks) => Object.fromEntries(ks.filter((k) => kCache.has(k)).map((k) => [k, kCache.get(k)])),
      }),
    },
    Utilities: {
      computeDigest: (_a, s) => Array.from(crypto.createHash('md5').update(String(s)).digest()),
      DigestAlgorithm: {MD5: 'MD5'},
      Charset: {UTF_8: 'UTF_8'},
      formatDate: (d, tz, fmt) => {
        const offsetH = tz === 'America/Los_Angeles' ? -8 : 7;
        const x = new Date(d.getTime() + offsetH * 3600e3);
        const P = (n) => String(n).padStart(2, '0');
        return fmt
          .replace('yyyy', String(x.getUTCFullYear()))
          .replace('MM', P(x.getUTCMonth() + 1))
          .replace('dd', P(x.getUTCDate()))
          .replace('HH', P(x.getUTCHours()))
          .replace('mm', P(x.getUTCMinutes()));
      },
    },
    Logger: {log() {}},
    nhatKy_() {},
    guiZaloMotLan_: (_k, msg) => zaloMsgs.push(msg),
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'KhoKey.gs'), 'utf8'), kCtx, {filename: 'KhoKey.gs'});
  // 10 key, 9 key đã hết hạn mức hôm nay -> còn 1/10 (10% < 20%)
  const keys = Array.from({length: 10}, (_, i) => `AIzaTestKeyNumber${String(i).padStart(2, '0')}XXXX`);
  kProps.set('GEMINI_KEYS_GITHUB', keys.join(','));
  const ptDay = kCtx.khoNgayPT_();
  for (let i = 0; i < 9; i++) {
    kProps.set('kd_' + kCtx.khoId_(keys[i]), ptDay);
  }
  const lan1 = kCtx.khoCanhBaoQuyKeyThap_();
  const lan2 = kCtx.khoCanhBaoQuyKeyThap_();
  const okCanhBao = lan1 === true && lan2 === false && zaloMsgs.length === 1 && /1\/10/.test(zaloMsgs[0]) && /reset/i.test(zaloMsgs[0]);
  kiem('KhoKey.gs: cảnh báo quỹ key < 20% gửi 1 tin Zalo/ngày (số key sống/tổng + giờ reset, không spam)', okCanhBao, JSON.stringify({lan1, lan2, zaloMsgs}));
} catch (e) {
  kiem('KhoKey.gs: kiểm thử cảnh báo quỹ key < 20%', false, String(e.message));
}

// =========================================================================
// 7. Kiểm thử Đợt 2: Kho 16 mảnh ghép SVG + Auto Cover Frame + Bình luận ghim biến thể
// =========================================================================
console.log('7. Kiểm thử kho 16 mảnh ghép SVG, Auto Cover Frame và bình luận ghim');
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

// =========================================================================
// 8. Kiểm thử Đợt 4: Phân tích YouTube Analytics định kỳ hàng tuần
// =========================================================================
console.log('8. Kiểm thử phân tích YouTube Analytics hàng tuần (scripts/test_phan_tich_youtube.py)');
const rYtTuan = spawnSync(PY, ['-X', 'utf8', path.join(ROOT, 'scripts', 'test_phan_tich_youtube.py')], {
  cwd: ROOT,
  encoding: 'utf8',
  env: {...process.env, PYTHONIOENCODING: 'utf-8'},
  timeout: 60000,
});
kiem(
  'python -X utf8 scripts/test_phan_tich_youtube.py',
  rYtTuan.status === 0,
  rYtTuan.status === 0 ? '' : (rYtTuan.stderr || rYtTuan.stdout || '').slice(-260),
);

// Collision Gate và schema. npm run kiem-tra chạy thêm ca Chromium thật.
const wfDung = fs.readFileSync(path.join(wfDir, 'dung-video.yml'), 'utf8');
const iProps = wfDung.indexOf('--props-soi-chu');
const iGate = wfDung.indexOf('node scripts/kiem_tra_de_chu_truoc_render.mjs');
const iTts = wfDung.indexOf('BAO_LOI_BP2=out/loi_truoc_tts.txt python3 scripts/chuanbi.py kich_ban.json ||');
const iKiemHinh = wfDung.indexOf('- name: Kiểm chứng phép dựng và mệnh đề hình học trước TTS');
const iBuocProps = wfDung.indexOf('- name: Chuẩn bị props giả lập');
const buocKiemHinh = wfDung.slice(iKiemHinh, iBuocProps);
kiem('BP3: kiểm chứng cả hai bộ giải hình học và dừng khi lỗi trước bước props và TTS',
  wfDung.indexOf('id: kb') < iKiemHinh && iKiemHinh >= 0 && iKiemHinh < iBuocProps && iBuocProps < iTts &&
  buocKiemHinh.includes('python3 scripts/kiem_hinh_truoc_tts.py kich_ban.json out/loi_hinh_truoc_tts.json') &&
  buocKiemHinh.includes('"loi": "KIEM_DUYET_BO_CUC"') && buocKiemHinh.includes('exit 1') &&
  /from scripts\.giai_hinh_phang import giai/.test(fs.readFileSync(path.join(ROOT, 'scripts', 'kiem_hinh_truoc_tts.py'), 'utf8')) &&
  /from scripts\.giai_hinh_khong_gian import giai/.test(fs.readFileSync(path.join(ROOT, 'scripts', 'kiem_hinh_truoc_tts.py'), 'utf8')) &&
  /return 2/.test(fs.readFileSync(path.join(ROOT, 'scripts', 'kiem_hinh_truoc_tts.py'), 'utf8')));
const buocProps = wfDung.slice(wfDung.indexOf('id: props_soi_chu'), iGate);
const buocTts = wfDung.slice(wfDung.indexOf('- name: Tạo giọng đọc'), iTts);
kiem('BP3: 3 cửa chuẩn (props không TTS → 1 lần Chromium Cửa 2 → TTS → Cửa 3 hậu kiểm 1 lần, bỏ kiem_duyet.mjs trùng)',
  iProps >= 0 && iProps < iGate && iGate < iTts && buocProps.includes("GEMINI_KEYS: ''") &&
  buocProps.includes("GEMINI_API_KEY: ''") && buocTts.includes("steps.soi_chu.outputs.chan != 'true'") &&
  wfDung.includes("steps.soi_chu.outputs.chan == 'true'") &&
  wfDung.includes("gate_path = 'out/pre_render/bao_cao.json'") &&
  !wfDung.includes('node scripts/kiem_duyet.mjs') &&
  wfDung.includes("d['ai_hau_kiem'] = mt['hau_kiem']"));
const coGoiKhung4Tang = ['__init__.py', 'moc_thoi_gian.py', 'san_khau.py', 'kiem_tra.py'].every(
  (f) => fs.existsSync(path.join(ROOT, 'scripts', 'khung4tang', f)),
);
const wfBp1 = fs.readFileSync(path.join(wfDir, 'bo-phan-1.yml'), 'utf8');
const wfBp2 = fs.readFileSync(path.join(wfDir, 'viet-kich-ban.yml'), 'utf8');
kiem('Gói scripts/khung4tang/ + sparse-checkout + wrapper tương thích ngược v93..v99',
  coGoiKhung4Tang && wfBp1.includes('scripts/khung4tang') && wfBp2.includes('scripts/khung4tang'));
const rGate = spawnSync(process.execPath, ['scripts/test_pre_render_va_schema.mjs', '--nhanh'], {
  cwd: ROOT, encoding: 'utf8', timeout: 30000,
});
kiem('scripts/test_pre_render_va_schema.mjs: hình học hộp, fallback Gemini và báo lỗi Auto-Heal', rGate.status === 0,
  rGate.status === 0 ? '' : (rGate.stderr || rGate.stdout || '').slice(-700));

// =========================================================================
// 9. Kiểm thử chống lọt lỗi lạ & dọn MP4 Drive bằng rclone (don-video-drive.yml)
// =========================================================================
console.log('9. Kiểm thử don-video-drive.yml, scripts/don_video_drive.py & thứ tự kiểm lỗi cứng MP4');
const wfDonDrivePath = path.join(wfDir, 'don-video-drive.yml');
const pyDonDrivePath = path.join(ROOT, 'scripts', 'don_video_drive.py');
const wfDonDriveTxt = fs.existsSync(wfDonDrivePath) ? fs.readFileSync(wfDonDrivePath, 'utf8') : '';
const pyDonDriveTxt = fs.existsSync(pyDonDrivePath) ? fs.readFileSync(pyDonDrivePath, 'utf8') : '';
kiem(
  'don-video-drive.yml & scripts/don_video_drive.py tồn tại, cấm xóa vĩnh viễn (--drive-use-trash=false)',
  !!wfDonDriveTxt && !!pyDonDriveTxt &&
  !wfDonDriveTxt.includes('--drive-use-trash=false') &&
  !pyDonDriveTxt.includes('--drive-use-trash=false') &&
  pyDonDriveTxt.includes('--drive-use-trash=true') &&
  wfDonDriveTxt.includes('scripts/don_video_drive.py'),
);
const iMotion = wfDung.indexOf('scripts/kiem_tra_chuyen_dong.py');
const iMatThan = wfDung.indexOf('scripts/mat_than_3x3.py');
const iCongMp4 = wfDung.indexOf('id: cong_mp4');
const iPushMp4 = wfDung.indexOf('rclone copy --retries 3 --low-level-retries 5 --retries-sleep 5s "out/$ID.mp4"');
kiem(
  'dung-video.yml: kiểm lỗi cứng MP4 (chuyển động + Mắt thần 3×3 + cổng chặn MP4) chạy TRƯỚC bước đẩy MP4 lên Drive',
  iMotion >= 0 && iMatThan > iMotion && iCongMp4 > iMatThan && iPushMp4 > iCongMp4,
  `iMotion=${iMotion}, iMatThan=${iMatThan}, iCongMp4=${iCongMp4}, iPushMp4=${iPushMp4}`,
);
const rDonDrive = spawnSync(PY, ['-X', 'utf8', path.join(ROOT, 'scripts', 'test_don_video_drive.py')], {
  cwd: ROOT,
  encoding: 'utf8',
  env: {...process.env, PYTHONIOENCODING: 'utf-8'},
  timeout: 60000,
});
kiem(
  'python -X utf8 scripts/test_don_video_drive.py',
  rDonDrive.status === 0,
  rDonDrive.status === 0 ? '' : (rDonDrive.stderr || rDonDrive.stdout || '').slice(-320),
);

// v102.1 kiến trúc BP2 bền vững: cửa cứng/mềm, vệ sinh tĩnh, minh họa trung tính, hạ cánh mềm Hình học, cầu dao BP2
for (const [lenh, thamSo] of [[process.execPath, ['scripts/test_kien_truc_bp2.cjs']], [PY, ['-X', 'utf8', 'scripts/test_kien_truc_bp2.py']]]) {
  const rKT = spawnSync(lenh, thamSo, {cwd: ROOT, encoding: 'utf8', env: {...process.env, PYTHONIOENCODING: 'utf-8'}, timeout: 120000});
  kiem((lenh === PY ? 'python -X utf8 ' : 'node ') + thamSo[thamSo.length - 1], rKT.status === 0,
    rKT.status === 0 ? '' : (rKT.stderr || rKT.stdout || '').slice(-320));
}

console.log(`\nCI SMOKE TEST: ${dat} đạt, ${hong.length} hỏng`);
process.exit(hong.length ? 1 : 0);
