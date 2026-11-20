// Chạy chính quy tắc Apps Script cho cả kịch bản đọc từ Drive và workflow chạy tay.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rules = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'KiemTraHinh.gs'), 'utf8'), rules);
const kb = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const errors = rules.loiKichBanDungCanh_(kb, kb.de_bai);
if (Array.isArray(kb.canh) && kb.canh.every(c => c && (!c.noi_dung_man_hinh || Array.isArray(c.noi_dung_man_hinh)))) {
  errors.push(...rules.kiemTraPhepTinh_(kb));
} else {
  errors.push("Sai cấu trúc cảnh hoặc noi_dung_man_hinh");
}
const storyError = rules.loiCauChuyen_(kb);
if (storyError) errors.push(storyError);
if (errors.length) {
  fs.mkdirSync('out', {recursive: true});
  fs.writeFileSync('out/loi_mo_hinh.json', JSON.stringify({nang: errors}));
  console.error(errors.join('\n'));
  process.exitCode = 1;
}
