// v99.2 — nhãn phụ bước không lặp "BƯỚC n" (T1) + Intro / Outro mẫu v99_2 không cụt chữ: node scripts/test_v99_2.mjs
//  - nhanPhuBuoc (src/khung4tang/nhan_buoc.ts) == nhanPhuBuoc_ (KiemTraHinh.gs) == nhan_phu_buoc (scripts/khung4tang_v99.py);
//  - props mẫu mau/v99_2 (chuanbi --gia-lap): không bước nào có nhãn bắt đầu bằng "Bước", tiêu đề Intro trọn câu,
//    3 nhãn Outro <= 18 ký tự và trùng nguyên văn kịch bản (không bị cắt).
import {build} from 'esbuild';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {spawnSync} from 'child_process';
import {pathToFileURL} from 'url';

let dat = 0, hong = 0;
const kiem = (dk, ten) => { if (dk) { dat++; console.log('  ✓', ten); } else { hong++; console.log('  ✗', ten); } };
const nap = async (vao) => {
  const kq = await build({entryPoints: [path.resolve(vao)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error'});
  fs.mkdirSync('out', {recursive: true});
  const tep = path.join(path.resolve('out'), `v992_${path.basename(vao)}_${process.pid}.mjs`);
  fs.writeFileSync(tep, kq.outputFiles[0].text);
  const m = await import(pathToFileURL(tep).href);
  fs.unlinkSync(tep);
  return m;
};

console.log('1. Nhãn phụ bước: 3 bản TS / JS / Python khớp nhau');
const {nhanPhuBuoc} = await nap('src/khung4tang/nhan_buoc.ts');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('KiemTraHinh.gs', 'utf8'), ctx);
const MAU = [['Bước 1', 1, 5], ['Bước 2', 2, 5], ['BƯỚC 3', 3, 5], ['Bước 2: Lập hàm', 2, 5], ['bước 4 · tối ưu', 4, 5], ['Bước', 0, 5], ['Bước 5', 4, 5],
  ['Step 2', 2, 5], ['Lập hàm', 1, 5], ['Đề bài', 0, 5], ['Bước ngoặt', 2, 5], ['', 2, 5], ['Bước 1', 0, 0]];
const py = spawnSync('python', ['-X', 'utf8', '-c', 'import sys,json;sys.path.insert(0,"scripts");import khung4tang_v99 as k;print(json.dumps([k.nhan_phu_buoc(a,j,n) for a,j,n in json.loads(sys.argv[1])],ensure_ascii=False))', JSON.stringify(MAU)], {encoding: 'utf8'});
const pyKq = JSON.parse(py.stdout || '[]');
MAU.forEach(([s, j, n], i) => {
  const a = nhanPhuBuoc(s, j, n), b = ctx.nhanPhuBuoc_(s, j, n), c = pyKq[i];
  kiem(a === b && b === c && !/^(bước|buoc|step)\s*(?:\d|[:.\-–—·|/]|$)/i.test(a), `"${s}" (bước ${j + 1}/${n}) -> "${a}"${a === b && b === c ? '' : ` | JS "${b}" | Py "${c}"`}`);
});
kiem(nhanPhuBuoc('Bước ngoặt', 2, 5) === 'Bước ngoặt' && nhanPhuBuoc('Bước 2: lập hàm', 1, 5) === 'Lập hàm' && nhanPhuBuoc('Bước 1', 0, 5) === 'Đề bài' && nhanPhuBuoc('Bước 5', 4, 5) === 'Kết luận' && nhanPhuBuoc('Bước 3', 2, 5) === '',
  'giữ tên pha sau dấu ":", bước đầu "Đề bài", bước cuối "Kết luận", bước giữa chỉ còn viên thuốc');
const t1 = fs.readFileSync('src/khung4tang/TangTieuDe.tsx', 'utf8');
kiem(/nhanPhuBuoc\(b\.nhan/.test(t1) && /\{nhan \? <span/.test(t1), 'TangTieuDe.tsx lọc nhãn và ẩn ô nhãn khi rỗng (không ghép 2 chữ BƯỚC)');

console.log('2. Mẫu v99_2: không "BƯỚC n | BƯỚC m", Intro / Outro không cụt');
for (const ten of ['gap_nhau_xs', 'kien_bo_hop']) {
  const r = spawnSync('python', ['-X', 'utf8', 'scripts/chuanbi.py', `mau/v99_2/${ten}.json`, '--gia-lap', '--props-ra', `out/v99_2/${ten}/props.json`], {encoding: 'utf8'});
  if (r.status !== 0) { kiem(false, `${ten}: chuanbi lỗi ${(r.stderr || '').slice(-200)}`); continue; }
  const kb = JSON.parse(fs.readFileSync(`mau/v99_2/${ten}.json`, 'utf8'));
  const k4 = JSON.parse(fs.readFileSync(`out/v99_2/${ten}/props.json`, 'utf8')).khung4tang;
  kiem(k4.buoc.every((b) => !/^(bước|buoc|step)\s*(?:\d|[:.\-–—·|/]|$)/i.test(String(b.nhan || ''))), `${ten}: nhãn phụ ${k4.buoc.map((b) => '"' + (b.nhan || '') + '"').join(' ')}`);
  const td = String((k4.mocCau || {}).tieuDe || (k4.mocCau || {}).tieu_de || '');
  if (kb.tieu_de_intro) kiem(td.replace(/\s+/g, ' ').toLowerCase() === kb.tieu_de_intro.toLowerCase(), `${ten}: tiêu đề Intro trọn câu "${td}"`);
  const tt = (k4.tomTat || []).map((d) => d.chien_thuat);
  const goc = (kb.tom_tat_3_buoc || []).map((d) => d.chien_thuat);
  kiem(tt.length === 3 && tt.every((x, i) => x.length <= 18 && x === goc[i]), `${ten}: Outro ${JSON.stringify(tt)} (<= 18 ký tự, không cắt)`);
}

console.log(`\nKẾT QUẢ: ${dat} đạt, ${hong} hỏng`);
process.exit(hong ? 1 : 0);
