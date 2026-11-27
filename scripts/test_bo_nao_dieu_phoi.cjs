const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const gs = fs.readdirSync(root).filter(file => file.endsWith('.gs'));
gs.forEach(filename => new vm.Script(read(filename), {filename}));

let rows = [], active = [], calls = [], warnings = [];
const config = new Map(), props = new Map();
const ctx = vm.createContext({
  Date, TEN_HANG_DOI:'HANG_DOI', SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:()=>({})}),flush(){}},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})},
  giaiTrenGitHub_:()=>true,cauHinh_:k=>config.get(k), chDang_:()=>'BAT', chNC_:()=>'BAT', dangNghi_:()=>false, chanNguonBoNao_:()=>'',
  dsNenTangChoVideo_:()=>['youtube'], damBaoCot_(){}, matThanChan_:()=>false, daDuyet_:r=>r.duyet==='DA_DUYET', laUuTien_:()=>false,
  docHang_:()=>rows, voiKhoa_:(_,fn)=>fn(), nhatKy_(){}, guiZaloMotLan_:(k,text)=>warnings.push(text),
  ghi_:(_,i,f,id)=>Object.assign(rows.find(r=>r.id===id),f)
});
vm.runInContext(read('BoNaoDieuPhoi.gs'), ctx);
const {cho,dang,workflow} = ctx.BO_NAO_;
ctx.docRunsBoNao_ = (bp,query)=>active.filter(run=>run.bp===bp && query.startsWith('status='+run.status));
ctx.runsDangBoNao_ = bp=>['queued','in_progress','pending','waiting','requested'].flatMap(status=>ctx.docRunsBoNao_(bp,'status='+status));
ctx.giaoBuocBoNao_ = (_,bp,r)=>{ calls.push(bp); r.trang_thai=dang[bp]; r.cap_nhat=new Date(); };
ctx.sinhDeQuaGitHub_ = ()=>{calls.push(0);return true;};
ctx.chonVideoDang_ = ds=>ds[0];
function row(bp,extra={}) {
  return {id:'TT-'+bp, trang_thai:cho[bp], de_bai:'đề', file_kich_ban:'kb', file_video:'video',
    anh_kt:'ảnh',duyet:bp===5?'DA_DUYET':'CHO_AI',cap_nhat:new Date(),...extra};
}
rows = [1,2,3,4,5].map(bp=>row(bp));
ctx.nhipBoNao_('chay');
assert.deepEqual(calls,[5,4,3,2,1,0]);
ctx.nhipBoNao_('chay');
assert.equal(calls.filter(bp=>bp===0).length,1,'BP0 giữ chỗ trước khi run xuất hiện');
props.clear(); calls=[]; rows=Array.from({length:4},(_,i)=>row(3,{id:'TT-'+i,trang_thai:'CO_KICH_BAN'}));
ctx.nhipBoNao_('chay');
assert.deepEqual(calls,[3],'tồn đầu nhịp 4 bài chặn BP0 kể cả vừa gửi dựng');
calls=[];rows=[];active=[{id:1,bp:0,status:'queued'}];
ctx.nhipBoNao_('chay'); assert.deepEqual(calls,[]);
const old = {MOI:cho[1],DA_GIAI:cho[2],CO_KICH_BAN:cho[3],LOI:'LOI_CAN_XEM'};
Object.entries(old).forEach(([trang_thai,t])=>assert.equal(ctx.trangThaiBoNao_({trang_thai}),t));
assert.equal(ctx.trangThaiBoNao_({trang_thai:'GITHUB',ghi_chu:'GITHUB|123|DA_GIAI'}),dang[2]);
assert.equal(ctx.trangThaiBoNao_({trang_thai:'CO_VIDEO',duyet:'DA_DUYET'}),cho[5]);
for (const t of [...cho.slice(1),...dang.slice(1)]) {
  const r={trang_thai:t}; ctx.docTrangThaiCu_(r); assert.equal(ctx.trangThaiBoNao_(r),t);
}
config.set('CHE_DO_VAN_HANH','DUYET_TAY_SAU_BP2');
rows=[row(3)]; calls=[];
ctx.buocBoNao_({},3,'chay',0); assert.deepEqual(calls,[]);
rows[0].duyet_kich_ban='kb'; ctx.buocBoNao_({},3,'chay',0); assert.deepEqual(calls,[3]);
const stale=()=>Object.assign(rows[0],{trang_thai:dang[3],cap_nhat:new Date(Date.now()-41*60000)});
stale();active=[{id:9,bp:3,status:'in_progress',display_title:'Dựng video TT-3'}];
ctx.buocBoNao_({},3,'xa',0);assert.equal(rows[0].trang_thai,dang[3]);
active=[{id:10,bp:3,status:'completed',display_title:'Dựng video TT-3',html_url:'https://github.com/test/runs/10'}];
for (let n=1;n<=2;n++) {
  stale();ctx.buocBoNao_({},3,'xa',0);
  assert.equal(rows[0].trang_thai,cho[3]);assert.equal(rows[0].so_lan_thu_lai,n);
}
stale();ctx.buocBoNao_({},3,'xa',0);assert.equal(rows[0].trang_thai,'LOI_CAN_XEM');
assert.match(warnings.pop(),/runs\/10/);
stale();const api=ctx.docRunsBoNao_;ctx.docRunsBoNao_=()=>{throw Error('HTTP 403');};
assert.match(ctx.nhipBoNao_('xa'),/HTTP 403/);assert.equal(rows[0].trang_thai,dang[3]);ctx.docRunsBoNao_=api;

// Exercise the Python import chain with only files delivered by each worker checkout.
for (const bp of [1,2]) {
  const yml=read('.github/workflows/'+workflow[bp]);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bp2-checkout-'));
  try {
    for (const [,file] of yml.matchAll(/^ +scripts\/([\w]+\.py)\s*$/gm)) {
      fs.copyFileSync(path.join(root,'scripts',file),path.join(dir,file));
    }
    const py=process.platform==='win32'?'python':'python3';
    const result=spawnSync(py,['-X','utf8','tu_sinh_svg.py','-','--chi-kiem'],{cwd:dir,input:'{}',encoding:'utf8'});
    assert.equal(result.status,2,result.stderr);
    assert.equal(JSON.parse(result.stdout).ok,false,'máy kiểm chạy và từ chối mẫu rỗng');
    const good=spawnSync(py,['-X','utf8','tu_sinh_svg.py','-','--chi-kiem'],{cwd:dir,input:read('mau/v99_1/koch_dao.json'),encoding:'utf8'});
    assert.equal(good.status,0,good.stderr || good.stdout);
    assert.equal(JSON.parse(good.stdout).ok,true);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
// Real Sheet boundary and BP2 callback: retrying the HTTP request must save just one Drive file.
const cells = [], uploads = [], notices = [];
const sheet = {
  getDataRange:()=>({getValues:()=>cells.map(row=>row.slice())}),
  getRange:(row,col,_,width)=>({
    getValues:()=>[cells[row-1].slice(col-1,col-1+width)],
    getValue:()=>cells[row-1][col-1],
    setValue:v=>{cells[row-1][col-1]=v;},setNumberFormat(){}
  })
};
const app=vm.createContext({Date, CacheService:{getScriptCache:()=>({get:()=>null})},
  SpreadsheetApp:{flush(){}},MimeType:{PLAIN_TEXT:'text/plain'},
  PropertiesService:{getScriptProperties:()=>({getProperty:()=>null,setProperty(){}})}});
for (const f of ['BoPhan1.gs','BoNaoDieuPhoi.gs']) vm.runInContext(read(f),app);
Object.assign(app,{nhatKy_(){},xoaNhapKichBan_(){},guiZaloMotLan_:(k,m)=>notices.push(m),
  thuMucKichBan_:()=>({createFile:(name,data)=>{uploads.push(data);return {getId:()=>'drive-id'};}})});
cells.push(Array.from(app.COT));
function addRow(id) {
  const r={id,trang_thai:'DANG_KICH_BAN',lan_giao:'attempt',ghi_chu:'GITHUB|100|DA_GIAI'};
  cells.push(cells[0].map(k=>r[k] || ''));
}
addRow('TT-good');
const result={id:'TT-good',viec:'kich_ban',ok:true,lan_giao:'attempt',kich_ban:'{"canh":[]}',hang:{trang_thai:'CO_KICH_BAN'}};
assert.equal(app.nhanKetQuaBoPhan1_(sheet,{...result,lan_giao:'stale'}).lap,true);
assert.equal(app.nhanKetQuaBoPhan1_(sheet,result).ok,true);
assert.equal(cells[1][1],'CHO_DUNG');
assert.equal(app.docHang_(sheet)[0].file_kich_ban,'drive-id');
assert.equal(app.nhanKetQuaBoPhan1_(sheet,result).lap,true);
assert.equal(uploads.length,1);
addRow('TT-bad');
app.nhanKetQuaBoPhan1_(sheet,{...result,id:'TT-bad',kich_ban:null,hang:{trang_thai:'XOA',ghi_chu:'t2_trong'},run_url:'run/1254'});
assert.equal(cells[2][1],'LOI_CAN_XEM');
assert.match(notices[0],/t2_trong.*run\/1254/);
const inputs=[['mon','du_lieu'],['id','de'],['id','de'],['viec','id','kich_ban','lan_giao'],['id','du_lieu','lan_giao'],['viec','id','dang','lan_giao']];
workflow.forEach((file,bp)=>{
  const yaml=read('.github/workflows/'+file).split('concurrency:')[0];
  inputs[bp].forEach(key=>assert.match(yaml,new RegExp('^      '+key+':','m'),file));
});
console.log('Đạt điều phối BP5 → BP0, chống trùng, phanh tồn, duyệt tay, watchdog, trạng thái cũ, checkout Python và cú pháp '+gs.length+' tệp .gs.');
