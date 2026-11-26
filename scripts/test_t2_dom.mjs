// node scripts/test_t2_dom.mjs <bundle> <props THUC_TE đã chuẩn bị> <thư mục báo cáo>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const [bundle, source, dest] = process.argv.slice(2);
const props = JSON.parse(fs.readFileSync(source, 'utf8'));
assert.equal(props.mon, 'THUC_TE');
fs.mkdirSync(dest, {recursive: true});
const k = props.khung4tang;
delete k.sanKhau;
delete k.khongGian;
delete k.canh3dv;
k.buoc.forEach(b => delete b.doi_chieu);
k.tuSinh = {chiLopKichBan: true, lop: [
  {id: 'chu', t: 0, buoc: 0, hieu_ung: 'moc',
    svg: '<rect x="200" y="180" width="400" height="92" stroke="cyan"/><text x="250" y="230" fill="white">x + y = 20</text>' +
      '<circle cx="300" cy="240" r="120" opacity="0"/><path d="M900 800 L1200 960" stroke="white"/>'},
]};
const file = path.join(dest, 'props.json');
const report = path.join(dest, 'kiem_duyet.json');
fs.writeFileSync(file, JSON.stringify(props));
execFileSync(process.execPath, ['scripts/kiem_duyet.mjs', bundle, file, report], {
  stdio: 'inherit', env: {...process.env, GEMINI_KEYS: '', GEMINI_API_KEY: ''},
});
const result = JSON.parse(fs.readFileSync(report, 'utf8'));
assert.equal(result.so_khung, result.so_khung_mau);
assert.ok(result.nang.some(msg => msg.startsWith('t2_trong:')));
