const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const ctx = vm.createContext({});
for (const file of ['KiemTraHinh.gs', 'NangCao.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), ctx);
}
const kb = JSON.parse(fs.readFileSync(path.join(__dirname,'../mau/kich_ban_thuc_te.json')));
assert.equal(ctx.loiKichBanDungCanh_(kb,kb.de_bai).length,0);
const c = kb.canh[2];
c.noi_dung_man_hinh = ['P = 3/5 = 0,6', '2 × 3 = 6'];
assert.equal(ctx.loiKichBanDungCanh_(kb,kb.de_bai).length,0);
c.noi_dung_man_hinh.push('P = 3/5 = 0,5');
c.net_toan = [{diem:[[2,0]]}];
assert.equal(ctx.loiKichBanDungCanh_(kb,kb.de_bai).length,1);
assert.ok(ctx.kiemTraPhepTinh_(kb).some(x => x.includes("0,5")));
assert.equal(ctx.loiDoiChieuCanh_([{canh:1,loi:[]}],2).length,1);
assert.equal(ctx.loiDoiChieuCanh_([{canh:1,loi:[]},{canh:1,loi:[]}],2).length,1);
assert.equal(ctx.loiDoiChieuCanh_([{canh:1,loi:[]},{canh:2,loi:['Sai số lượng']}],2).length,1);
assert.equal(ctx.loiDoiChieuCanh_([{canh:1,loi:[]},{canh:2,loi:[]}],2).length,0);
console.log('Đã kiểm tra cấu trúc, đẳng thức và đối chiếu từng cảnh.');
