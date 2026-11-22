// v94: chạy bản JS kiemVanBanGdpt_ (KiemTraHinh.gs, khối [GDPT2018_BAT_DAU]..[GDPT2018_KET_THUC]) trên các câu mẫu từ stdin
// [[cap, chu], ...] -> in [[ "MA:muc", ... ], ...] (đã sắp) để test_giai_hinh_phang.py so khớp với bản Python.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'KiemTraHinh.gs'), 'utf8');
const a = src.indexOf('// [GDPT2018_BAT_DAU]');
const b = src.indexOf('// [GDPT2018_KET_THUC]');
if (a < 0 || b < 0) { console.error('Không thấy khối GDPT2018 trong KiemTraHinh.gs'); process.exit(1); }
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src.slice(a, b), ctx);
const cau = JSON.parse(fs.readFileSync(0, 'utf8') || '[]');
const ra = cau.map(([cap, chu]) => ctx.kiemVanBanGdpt_(chu, cap, '').map((x) => x.ma + ':' + x.muc).sort());
process.stdout.write(JSON.stringify(ra));
