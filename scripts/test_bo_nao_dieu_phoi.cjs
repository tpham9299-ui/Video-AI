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

let rows = [], active = [], calls = [], picked = [], warnings = [], keyRatio = 1, vnDay = '20261127';
const config = new Map(), props = new Map();
const ctx = vm.createContext({
  Date, TEN_HANG_DOI:'HANG_DOI', SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:()=>({})}),flush(){}},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})},
  Utilities:{formatDate:()=>vnDay}, khoThongKeKhaDung_:()=>({tyLe:keyRatio}),
  giaiTrenGitHub_:()=>true,cauHinh_:k=>config.get(k), chDang_:()=>'BAT', chNC_:()=>'BAT', dangNghi_:()=>false, chanNguonBoNao_:()=>'',
  dsNenTangChoVideo_:()=>['youtube'], damBaoCot_(){}, matThanChan_:()=>false, daDuyet_:r=>r.duyet==='DA_DUYET', laUuTien_:()=>false,
  docHang_:()=>rows, voiKhoa_:(_,fn)=>fn(), nhatKy_(){}, guiZaloMotLan_:(k,text)=>warnings.push(text),
  ghi_:(_,i,f,id)=>Object.assign(rows.find(r=>r.id===id),f)
});
vm.runInContext(read('BoNaoDieuPhoi.gs'), ctx);
const {cho,dang,workflow} = ctx.BO_NAO_;
ctx.docRunsBoNao_ = (bp,query)=>active.filter(run=>run.bp===bp && query.startsWith('status='+run.status));
ctx.runsDangBoNao_ = bp=>['queued','in_progress','pending','waiting','requested'].flatMap(status=>ctx.docRunsBoNao_(bp,'status='+status));
ctx.giaoBuocBoNao_ = (_,bp,r)=>{ calls.push(bp); picked.push(r.id); r.trang_thai=dang[bp]; r.cap_nhat=new Date(); };
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

// Newest physical row wins at every BP, even when its cap_nhat is older.
active=[]; config.clear();
for (let bp=1; bp<=5; bp++) {
  calls=[]; picked=[];
  rows=[row(bp,{id:'first',cap_nhat:new Date()}),row(bp,{id:'last',cap_nhat:new Date(Date.now()-1000)})];
  ctx.buocBoNao_({},bp,'chay',0);
  assert.deepEqual(picked,['last'],`BP${bp} lấy dòng cuối`);
}
const oldDate=new Date(Date.now()-4*86400e3);
const backlog=(i)=>row(4,{id:'backlog-'+i,ngay_tao:oldDate});
rows=[backlog(0)]; calls=[]; keyRatio=0.39;
assert.match(ctx.buocBoNao_({},4,'chay',0),/quỹ key dưới 40%/);
assert.deepEqual(calls,[]);
keyRatio=0.4;
for (let bp=1; bp<=4; bp++) {
  const fresh=row(bp,{id:'fresh'});
  rows=[fresh,backlog(0)]; picked=[];
  ctx.buocBoNao_({},4,'chay',0);
  assert.deepEqual(picked,bp===4?['fresh']:[]);
}
for (let i=0;i<5;i++) {
  picked=[]; rows=[backlog(i)];
  ctx.buocBoNao_({},4,'chay',0);
  assert.deepEqual(picked,['backlog-'+i]);
}
rows=[backlog(5)]; picked=[];
assert.match(ctx.buocBoNao_({},4,'chay',0),/đã đủ 5 bài cũ/);
assert.deepEqual(picked,[]);
assert.equal(ctx.lyDoDonBaiCu_([backlog(0)],backlog(0),true),'','BP4 và Auto-Heal tính cùng một bài');
vnDay='20261128';ctx.buocBoNao_({},4,'chay',0);assert.deepEqual(picked,['backlog-5']);

function fillBuffer(n) {
  return [row(1),row(2),row(3),row(4),...Array.from({length:n},(_,i)=>row(5,{id:'ready-'+i}))];
}
props.clear(); calls=[]; rows=fillBuffer(7);
assert.match(ctx.nhipBoNao_('chay'),/Kho đệm sẵn đăng: 6\/7 \(ĐANG NGỦ ĐÔNG\)/);
assert.deepEqual(calls,[5,4]);
assert.equal(props.get('BO_NAO_NGU_DONG'),'1');
// A busy publisher keeps the buffer at 6, and the production stages stay asleep.
active=[{id:100,bp:5,status:'in_progress',display_title:'Đăng ready-6'}];
rows=fillBuffer(6);calls=[];
assert.match(ctx.nhipBoNao_('chay'),/6\/7 \(ĐANG NGỦ ĐÔNG\)/);
assert.deepEqual(calls,[4]);
active=[];rows=fillBuffer(6);calls=[];
assert.match(ctx.nhipBoNao_('chay'),/5\/7 \(ĐANG SẢN XUẤT\)/);
assert.deepEqual(calls,[5,4,3,2,1,0]);
assert.equal(props.has('BO_NAO_NGU_DONG'),false);

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
const cells = [], uploads = [], notices = [], files = new Map(), trashed = [];
const sheet = {
  getDataRange:()=>({getValues:()=>cells.map(row=>row.slice())}),
  getRange:(row,col,_,width)=>({
    getValues:()=>[cells[row-1].slice(col-1,col-1+width)],
    getValue:()=>cells[row-1][col-1],getFormula:()=>'',
    setValue:v=>{cells[row-1][col-1]=v;},setNumberFormat(){}
  })
};
const app=vm.createContext({Date, Logger:{log(){}}, CacheService:{getScriptCache:()=>({get:()=>null})},
  SpreadsheetApp:{flush(){}},MimeType:{PLAIN_TEXT:'text/plain'},
  Utilities:{formatDate:()=> '27/11'},DriveApp:{getFileById:id=>{
    if (!files.has(id)) throw Error('File not found');
    return files.get(id);
  }},
  PropertiesService:{getScriptProperties:()=>({getProperty:()=>null,setProperty(){}})}});
for (const f of ['BoPhan1.gs','BoNaoDieuPhoi.gs','NangCao.gs','DangVideo.gs','BoPhan2.gs']) vm.runInContext(read(f),app);
assert.deepEqual(Array.from(app.DANH_SACH_TEP_GS_,name=>name+'.gs').sort(),gs.slice().sort());
assert.equal(new Set(app.DANH_SACH_TEP_GS_).size,gs.length);
Object.assign(app,{cauHinh_:()=>'',nhatKy_(){},xoaNhapKichBan_(){},guiZaloMotLan_:(k,m)=>notices.push(m),
  thuMucKhoKichBan_:()=>({createFile:(name,data)=>{
    uploads.push({name,data});files.set('drive-id',{getBlob:()=>({getDataAsString:()=>data})});return {getId:()=>'drive-id'};
  }})});
cells.push(Array.from(app.COT));
function addRow(id) {
  const r={id,trang_thai:'DANG_KICH_BAN',lan_giao:'attempt',ghi_chu:'GITHUB|100|DA_GIAI'};
  cells.push(cells[0].map(k=>r[k] || ''));
}
addRow('TT-good');
const raw='  {"canh":[]}  ';
assert.equal(app.ghiKichBanAnToan_('raw',raw),raw);
assert.equal(app.docKichBanAnToan_(raw),raw);
assert.equal(app.ghiKichBanAnToan_('8000','x'.repeat(8000)).length,8000);
const result={id:'TT-good',viec:'kich_ban',ok:true,lan_giao:'attempt',kich_ban:JSON.stringify({canh:[],noi_dung:'x'.repeat(8000)}),hang:{trang_thai:'CO_KICH_BAN'}};
assert.equal(app.nhanKetQuaBoPhan1_(sheet,{...result,lan_giao:'stale'}).lap,true);
assert.equal(app.nhanKetQuaBoPhan1_(sheet,result).ok,true);
assert.equal(cells[1][1],'CHO_DUNG');
assert.equal(app.docHang_(sheet)[0].file_kich_ban,'DRIVE_JSON:drive-id');
assert.equal(uploads[0].name,'TT-good.json');
assert.equal(app.docKichBanAnToan_('DRIVE_JSON:drive-id'),uploads[0].data);
assert.equal(app.docKichBanAnToan_('drive-id'),uploads[0].data);
assert.equal(app.docKichBanAnToan_('DRIVE_JSON:missing'),'');
assert.equal(app.nhanKetQuaBoPhan1_(sheet,result).lap,true);
assert.equal(uploads.length,1);
addRow('TT-bad');
app.nhanKetQuaBoPhan1_(sheet,{...result,id:'TT-bad',kich_ban:null,hang:{trang_thai:'XOA',ghi_chu:'t2_trong'},run_url:'run/1254'});
assert.equal(cells[2][1],'LOI_CAN_XEM');
assert.match(notices[0],/t2_trong.*run\/1254/);

const videoId='ABC_def-123';
const videoUrl='https://drive.google.com/file/d/'+videoId+'/view?usp=share_link';
for (const link of [videoId,videoUrl,'https://drive.google.com/open?usp=share&id='+videoId,'=HYPERLINK("'+videoUrl+'";"MP4")']) {
  assert.equal(app.idDriveVideo_(link),videoId);
}
for (const link of ['',null,'https://drive.google.com/file/d/','https://drive.google.com.evil.invalid/open?id='+videoId,'https://example.com/open?id='+videoId,'=HYPERLINK("kẹt")']) {
  assert.equal(app.idDriveVideo_(link),'');
  assert.equal(app.duaMp4LoiVaoThungRac_(app.idDriveVideo_(link)),true);
}
let inTrash=false;
files.set(videoId,{getMimeType:()=> 'video/mp4',isTrashed:()=>inTrash,setTrashed:v=>{trashed.push(v);inTrash=v;}});
assert.equal(app.duaMp4LoiVaoThungRac_(videoId),true);
assert.equal(app.duaMp4LoiVaoThungRac_(videoId),true);
assert.equal(app.duaMp4LoiVaoThungRac_('id-missing'),true);
assert.deepEqual(trashed,[true]);
files.set('no-access',{getMimeType(){throw Error('Access denied');}});
assert.equal(app.duaMp4LoiVaoThungRac_('no-access'),false);
addRow('TT-rejected');
const col=k=>cells[0].indexOf(k);
cells[3][col('file_video')]=videoUrl;
inTrash=false;
app.ghiVideoBoKhongDat_(sheet,app.docHang_(sheet)[2],'t2_trong: '+ 'mô tả dài '.repeat(100));
assert.equal(cells[3][col('file_video')],'[Đã xóa file lỗi - 27/11]');
assert.equal(cells[3][col('ghi_chu')],'BO_KHONG_DAT (video): t2_trong');
assert.equal(cells[3][col('trang_thai')],'XOA');
assert.deepEqual(trashed,[true,true]);

// Keep a failed Auto-Heal job on the Sheet, then resume the same job without another BP4 run.
addRow('TT-heal');
cells[4][col('file_kich_ban')]='DRIVE_JSON:later';
const drafts=[];
Object.assign(app,{luuNhapKichBan_:(id,kb)=>drafts.push({id,kb}),henUuTien_(){}});
app.traVeSuaKichBan_(sheet,app.docHang_(sheet)[3],'sửa tầng 2','Auto-Heal',{so_lan_tu_sua:1},null,true);
assert.equal(cells[4][col('trang_thai')],'LOI_TAM');
assert.equal(drafts.length,0);
files.set('later',{getBlob:()=>({getDataAsString:()=>'{"canh":[],"tu_sinh_hong":true}'})});
app.thuLaiAutoHealCho_(sheet);
assert.equal(cells[4][col('trang_thai')],'CHO_KICH_BAN');
assert.equal(cells[4][col('tu_sua_cho')],'');
assert.equal(drafts[0].kb.tu_sinh_hong,undefined);

// A legacy pass and a fresh BP4 pass are both promoted into the posting queue.
addRow('TT-legacy-pass');
Object.assign(cells[5],{[col('trang_thai')]:'CO_VIDEO',[col('duyet')]:'CHO',[col('file_video')]:'legacy-video',
  [col('ai_kiem_tra')]:'{"phan_tram":90,"chi_tiet":{"dap_an":9,"bo_cuc":9}}',[col('ghi_chu')]:''});
app.cuuVideoDatBP4_(sheet);
assert.equal(cells[5][col('trang_thai')],'CHO_DANG');
addRow('TT-new-pass');
Object.assign(cells[6],{[col('trang_thai')]:'DANG_KIEM_DUYET',[col('file_video')]:'new-video'});
Object.assign(app,{thucTeNgan_:()=>false,ghiQuaKiemDuyet_(){},ghiKetQuaPhongCach_(){},guiZalo_(){},henDangVideoS_(){}});
app.apDungKetQuaAiXem_(sheet,app.docHang_(sheet)[5],{dat:true,phan_tram:90,diem:9,chi_tiet:{dap_an:9},van_de:[],nang:[]});
assert.equal(cells[6][col('trang_thai')],'CHO_DANG');

// Copy must survive a failure between the confirmed archive write and deletion of the source.
function mockTab(data) {
  const tab={
    getLastRow:()=>data.length,getMaxColumns:()=>app.COT.length,getMaxRows:()=>100,
    getDataRange:()=>({getValues:()=>data.map(row=>row.slice())}),
    appendRow:row=>data.push(Array.from(row)),setFrozenRows(){},setTabColor(){},
    deleteRow:n=>data.splice(n-1,1),
    getRange:(row,c,width=1,count=1)=>({
      getValue:()=>data[row-1]?.[c-1] ?? '',getFormula:()=>'',
      getValues:()=>Array.from({length:width},(_,i)=>Array.from({length:count},(_,j)=>data[row+i-1]?.[c+j-1] ?? '')),
      setValue:v=>{(data[row-1] ||= [])[c-1]=v;},
      setValues(values){values.forEach((r,i)=>r.forEach((v,j)=>tab.getRange(row+i,c+j).setValue(v)));},
      copyTo(target){target.setValues(this.getValues());}
    })
  };
  return tab;
}
const postedDate=new Date(Date.now()-8*86400e3);
const dateFromVN=(d,fmt)=>new Date(d.getTime()+7*3600e3).toISOString().slice(0,7).replace('-','_');
const archiveMonth='LuuTru_'+dateFromVN(postedDate,'yyyy_MM');
const archiveRow=(id,data)=>Array.from(app.COT,k=>({id,de_bai:'đề '+id,ma_bam:'hash-'+id,...data})[k] ?? '');
const hotData=[cells[0].slice(),
  archiveRow('posted',{trang_thai:'DA_DANG',cap_nhat:postedDate}),
  archiveRow('recent',{trang_thai:'DA_DANG',cap_nhat:new Date()}),
  archiveRow('rejected',{trang_thai:'XOA',ghi_chu:'BO_KHONG_DAT (video): t2_trong',
    file_video:'[Đã xóa file lỗi - 25/11]',cap_nhat:new Date(Date.now()-3*86400e3)})];
const hot=mockTab(hotData), tabs=new Map([['HANG_DOI',hot]]);
const book={
  getSheetByName:n=>tabs.get(n),
  insertSheet:n=>{const t=mockTab([]);tabs.set(n,t);return t;}
};
Object.assign(app,{voiKhoa_:(_,fn)=>fn(),damBaoCot_(){},deMoiChoSanPhamBiBo_(){},xoaKichBanKhoiSheet_(){throw Error('tạm lỗi');}});
app.SpreadsheetApp.getActiveSpreadsheet=()=>book;
app.Utilities.formatDate=dateFromVN;
assert.equal(app.donDepHotSheetDinhKy().trucTrac,true);
assert.equal(hotData.length,4,'nguồn còn nguyên khi dọn bị gián đoạn');
assert.equal(tabs.get(archiveMonth).getLastRow(),2);
assert.equal(tabs.get('LuuTru_Loi').getLastRow(),2);
app.xoaKichBanKhoiSheet_=()=>{};
assert.deepEqual({...app.donDepHotSheetDinhKy()},{daDang:1,loi:1,mp4:0,trucTrac:false});
assert.deepEqual(hotData.slice(1).map(r=>r[0]),['recent']);
assert.equal(tabs.get(archiveMonth).getLastRow(),2,'chạy lại không chép trùng');
assert.equal(tabs.get('LUU_TRU').getLastRow(),3,'chạy lại không trùng mã băm');
assert.equal(app.docMaBamLuuTru_()['hash-posted'],true);
assert.equal(app.docMaBamLuuTru_()['hash-rejected'],true);
const inputs=[['mon','du_lieu'],['id','de'],['id','de'],['viec','id','kich_ban','lan_giao'],['id','du_lieu','lan_giao'],['viec','id','dang','lan_giao']];
workflow.forEach((file,bp)=>{
  const yaml=read('.github/workflows/'+file).split('concurrency:')[0];
  inputs[bp].forEach(key=>assert.match(yaml,new RegExp('^      '+key+':','m'),file));
});
console.log('0 hỏng. Đạt điều phối BP5 → BP0, thứ tự quét, phanh tồn cũ, kho đệm, dọn MP4, lưu kịch bản, watchdog, checkout Python và đăng ký/cú pháp '+gs.length+' tệp .gs.');
