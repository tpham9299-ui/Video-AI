// Chạy bộ chọn khung giờ và hàm điều phối Apps Script bằng dịch vụ giả lập.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const props = new Map();
let time = '11:29';
let triggers = [];
let payload;
const row = {id:'TT-test', trang_thai:'CO_VIDEO', duyet:'DA_DUYET', file_video:'file'};
const ctx = vm.createContext({
  ScriptApp: {
    getProjectTriggers: () => triggers.slice(),
    deleteTrigger: t => { triggers = triggers.filter(x => x !== t); },
    newTrigger: name => ({
      getHandlerFunction: () => name, timeBased() { return this; },
      everyMinutes(n) { this.minutes = n; return this; },
      after(n) { this.delay = n; return this; }, create() { triggers.push(this); }
    })
  },
  Utilities: {formatDate: (_, zone, format) => format === 'HH:mm' ? time : '20261120'},
  PropertiesService: {getScriptProperties: () => ({getProperty:k => props.get(k),setProperty:(k,v) => props.set(k,v)})},
  CacheService: {getScriptCache: () => ({get: () => null})},
  cauHinh_: () => null, laVideoDai_: r => !!r.dai, daDuyet_: r => r.duyet === 'DA_DUYET',
  noiDungDang_: () => ({}), nhatKy_: () => {}, ghi_: (_,i,fields) => Object.assign(row,fields),
  guiWorkflowGitHub_: inputs => { payload = JSON.parse(inputs.dang); return {ok:true}; }
});
for (const name of ['DangVideo.gs','NangCao.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx);
}
ctx.noiDungDang_ = () => ({});
ctx.ScriptApp.newTrigger('chayDangVideo').create();
ctx.damBaoLichDang_();
ctx.henDangVideoS_(10);
ctx.henDangVideoS_(10);
ctx.damBaoLichDang_();
assert.deepEqual(triggers.map(t => [t.getHandlerFunction(),t.minutes || t.delay]),
  [['chayLichDangDinhKy',15],['kiemTraDangSauDuyet',10000]]);
assert.equal(ctx.chonVideoDang_([row]),null);
time = '11:30';
assert.equal(ctx.chonVideoDang_([row]),row);
ctx.dangVideo_(null,row);
assert.deepEqual(payload.nen_tang,['youtube','facebook','tiktok']);
ctx.ketThucDang_(null,row,{youtube:{ok:true},facebook:{ok:true},tiktok:{ok:false}});
assert.equal(ctx.chonVideoDang_([row]),null);
const result = JSON.parse(row.link_dang);
result._thu_lai_luc = Date.now()-1;
row.link_dang = JSON.stringify(result);
assert.equal(ctx.chonVideoDang_([row]),row);
ctx.dangVideo_(null,row);
assert.deepEqual(payload.nen_tang,['tiktok']);
ctx.ketThucDang_(null,row,{...result,tiktok:{ok:true}});
assert.equal(row.trang_thai,'DA_DANG');
assert.equal(ctx.chonVideoDang_([row]),null);
time = '19:30';
assert.equal(ctx.chonVideoDang_([{...row,duyet:'CHO_DUYET',trang_thai:'CO_VIDEO'}]),null);
console.log('Lịch định kỳ, lịch sau duyệt, ba nền tảng và phục hồi một phần đều đạt.');
