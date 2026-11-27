const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const gs = fs.readdirSync(root).filter(file => file.endsWith('.gs'));
gs.forEach(filename => new vm.Script(read(filename), {filename}));

let rows = [], active = [], calls = [], picked = [], warnings = [], keyRatio = 1, vnDay = '20261127', vnHour = 17;
let logRows = [];
const config = new Map(), props = new Map();
const ctx = vm.createContext({
  Date, TEN_HANG_DOI:'HANG_DOI', TEN_CAU_HINH:'CAU_HINH',
  SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>{
    if (name==='NHAT_KY') return {getDataRange:()=>({getValues:()=>logRows})};
    if (name==='CAU_HINH') return {getDataRange:()=>({getValues:()=>[['khoa','gia_tri'],...config]})};
    return {};
  }}),flush(){}},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),getProperties:()=>Object.fromEntries(props),setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})},
  Utilities:{formatDate:(d,tz,fmt)=>{
    assert.equal(tz,'Asia/Ho_Chi_Minh');
    if (fmt==='HH') return String(vnHour);
    if (d.getUTCFullYear()===2025) return new Date(d.getTime()+7*3600e3).toISOString().slice(0,10).replaceAll('-','');
    return vnDay;
  }}, khoThongKeKhaDung_:()=>({tyLe:keyRatio,conSong:Math.round(28*keyRatio),tong:28}),
  giaiTrenGitHub_:()=>true,cauHinh_:k=>config.get(k), chDang_:()=>'BAT', chNC_:()=>'BAT', dangNghi_:()=>false, chanNguonBoNao_:()=>'',
  dsNenTangChoVideo_:()=>['youtube'], damBaoCot_(){}, matThanChan_:()=>false, daDuyet_:r=>r.duyet==='DA_DUYET', laUuTien_:()=>false,
  docHang_:()=>rows, voiKhoa_:(_,fn)=>fn(), nhatKy_(){}, guiZaloMotLan_:(k,text)=>warnings.push(text),
  guiZalo_:text=>warnings.push(text),
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
const tenDem='BO_NAO_VIDEO_MOI_NGAY';
const logRender=(date,id)=>[date,'DUNG_VIDEO',id+' -> xong, file file-'+id];
props.clear(); calls=[]; keyRatio=0.25;
rows=fillBuffer(10).filter(r=>r.id!=='TT-1');
rows.push(row(4,{id:'raw',trang_thai:'CO_VIDEO',duyet:'CHO'}), row(5,{id:'published',trang_thai:'DA_DANG'}),
  row(5,{id:'legacy-approved',trang_thai:'CO_VIDEO',_trang_thai_sheet:'CO_VIDEO'}),
  ...Array.from({length:4},(_,i)=>row(4,{id:'loi-'+i,trang_thai:'LOI_CAN_XEM',bp_thu_lai:2})));
config.set('BAT_BP5','TAT');
assert.match(ctx.nhipBoNao_('xem'),/Video mới hôm nay: 0\/3\nKho đệm CHO_DANG: 10\/7 \(ĐANG SẢN XUẤT\)\nQuỹ key: 7\/28/);
assert.deepEqual(calls,[]);
ctx.nhipBoNao_('chay');
assert.deepEqual(calls,[4,3,2,0],'kho đầy, thiếu video, BP0 vẫn giao khi còn đúng 25% key');
assert.equal(ctx.tonBoNao_(rows),1,'chỉ đang dựng chiếm phanh tồn sau khi đã gửi BP2');
assert.equal(ctx.demDangSanXuatBoNao_(rows),2);

calls=[]; rows=fillBuffer(10); props.delete('BP0_GIU_DEN');
assert.match(ctx.nhipBoNao_('chay'),/Lý do BP0 chưa tạo đề: BP1–BP3 có 3 bài đang xử lý, đủ bù 3 video còn thiếu/);
assert.deepEqual(calls,[4,3,2,1],'BP1–BP3 vẫn chạy khi các bài hiện tại đủ bù chỉ tiêu');

calls=[]; rows=fillBuffer(10); keyRatio=6/28;
assert.match(ctx.nhipBoNao_('chay'),/Lý do BP0 chưa tạo đề: ngủ đông, quỹ key Gemini 6\/28 dưới 25%/);
assert.deepEqual(calls,[4]);
keyRatio=0.25; config.delete('BAT_BP5');
logRows=['a','b','a','c'].map(id=>logRender(new Date(),id));
logRows.push([new Date(),'AI_XEM','old -> xong, file old']);
calls=[]; rows=fillBuffer(10);
assert.match(ctx.nhipBoNao_('chay'),/Video mới hôm nay: 3\/3\nKho đệm CHO_DANG: 9\/7 \(ĐANG NGỦ ĐÔNG\)/);
assert.deepEqual(calls,[5,4]);
logRows=[];
assert.equal(ctx.demVideoMoiTrongNgay_(),3,'Script Properties giữ số đã dựng sau khi nhật ký bị cắt');
assert.deepEqual(JSON.parse(props.get(tenDem)).ids,['a','b','c']);

props.delete('BO_NAO_NGU_DONG'); calls=[]; rows=fillBuffer(7);
assert.match(ctx.nhipBoNao_('chay'),/Kho đệm CHO_DANG: 6\/7 \(ĐANG NGỦ ĐÔNG\)/);
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

// A held full buffer reopens the next day. The first render at VN midnight belongs to the new day.
props.clear(); vnDay='20251128';
logRows=[logRender(new Date('2025-11-27T16:59:59Z'),'yesterday'),logRender(new Date('2025-11-27T17:00:00Z'),'today')];
assert.equal(ctx.demVideoMoiTrongNgay_(),1);
logRows=[]; calls=[]; rows=fillBuffer(10).slice(4);
ctx.chanNguonBoNao_=()=> 'đã đủ chỉ tiêu ngày hoặc đủ hàng nguồn';
ctx.laKhoaDemBP0_=k=>k==='MON_KE';
ctx.docMaBamLuuTru_=()=>({'archived-hash':true});
props.set('MON_KE','2');
let bp0Payload;
ctx.guiWorkflowGitHub_=(inputs,workflow)=>{
  assert.equal(workflow,'sinh-de.yml');
  calls.push(0);
  bp0Payload=JSON.parse(inputs.du_lieu);
  return {ok:true};
};
config.set('GEMINI_KEYS','test-secret');
config.set('BAT_BP5','TAT');
ctx.nhipBoNao_('chay');
assert.deepEqual(calls,[0],'bộ đếm video đạt cũ không chặn giao thêm đề');
assert.equal(bp0Payload.lan_giao,props.get('BP0_GIU_DEN'));
assert.equal(bp0Payload.props.MON_KE,'2');
assert.ok(!('GEMINI_KEYS' in bp0Payload.cau_hinh));
assert.deepEqual(bp0Payload.ma_bam,['archived-hash']);

// Evening alert uses the real BP0 blocker and is only sent by the scheduler, once per VN day.
warnings=[]; props.delete('BP0_GIU_DEN'); config.set('BAT_BP0','TAT'); vnHour=17;
ctx.nhipBoNao_('chay'); assert.deepEqual(warnings,[]);
vnHour=18;
ctx.nhipBoNao_('xem'); assert.deepEqual(warnings,[]);
ctx.nhipBoNao_('chay'); ctx.nhipBoNao_('chay');
assert.equal(warnings.length,1);
assert.match(warnings[0],/0\/3[\s\S]*BP0 BAT_BP0=TAT/);
vnDay='20251129';
ctx.nhipBoNao_('chay'); assert.equal(warnings.length,2);
logRows=[logRender(new Date(),'done')]; vnDay='20251130';
ctx.nhipBoNao_('chay'); assert.equal(warnings.length,2);

// One-off Zalo dispatch bypasses the buffer but respects an empty BP1–BP3 queue and the BP0 hold.
vm.runInContext(read('ZaloDeBai.gs'),ctx);
const chatReplies=[];
const messages=new Map();
Object.assign(ctx,{
  CacheService:{getScriptCache:()=>({get:k=>messages.get(k),put:(k,v)=>messages.set(k,v)})},
  ContentService:{createTextOutput:()=>({setMimeType(){return this;}}),MimeType:{JSON:'json'}},
  guiZaloToi_:(_,msg)=>chatReplies.push(msg)
});
props.set('ZALO_WEBHOOK_SECRET','test'); props.set('ZALO_CHAT_IDS','chat');
const zalo=(text,message_id)=>ctx.nhanZalo_({parameter:{k:'test'},postData:{contents:JSON.stringify({message:{text,message_id,chat:{id:'chat'}}})}});
config.delete('BAT_BP0'); calls=[]; props.delete('BP0_GIU_DEN');
rows=fillBuffer(10).slice(4).concat(row(2,{trang_thai:'DANG_KICH_BAN'}));
zalo('/sanxuatngay',1); assert.match(chatReplies.at(-1),/BP1–BP3 còn 1 bài/);
assert.deepEqual(calls,[]);
rows.pop(); props.set('BO_NAO_NGU_DONG','1');
props.set(tenDem,JSON.stringify({ngay:vnDay,ids:['done','done2','done3']}));
zalo('/trangthai',2); assert.match(chatReplies.at(-1),/ĐANG NGỦ ĐÔNG/);
zalo('/sanxuatngay',3); assert.match(chatReplies.at(-1),/Đã giao BP0/);
zalo('/sanxuatngay',4); assert.match(chatReplies.at(-1),/đã gửi BP0/);
assert.deepEqual(calls,[0]);
assert.equal(props.get('BO_NAO_NGU_DONG'),'1');

// Remove only superseded schedules, then keep exactly one of each on repeated installation.
const schedule=(name,options={})=>({getHandlerFunction:()=>name,...options});
let triggers=['chayBoNaoDieuPhoi','chayBoNaoDieuPhoi','donDepHotSheetDinhKy','chayDonDep','chayBoPhan1','khoDongBoDinhKy'].map(name=>schedule(name));
ctx.ScriptApp={
  getProjectTriggers:()=>triggers.slice(),
  deleteTrigger:t=>{triggers=triggers.filter(x=>x!==t);},
  newTrigger:name=>({timeBased:()=>{
    const options={};
    const builder={create(){const t=schedule(name,options);triggers.push(t);return t;}};
    for (const method of ['everyMinutes','inTimezone','atHour','everyDays']) builder[method]=value=>{options[method]=value;return builder;};
    return builder;
  }})
};
ctx.caiDatLichTuDongChuan(); ctx.caiDatLichTuDongChuan();
assert.deepEqual(triggers.map(t=>t.getHandlerFunction()),['khoDongBoDinhKy','chayBoNaoDieuPhoi','chayDonDepHotSheetTheoLich']);
assert.equal(triggers[1].everyMinutes,5);
assert.deepEqual([triggers[2].inTimezone,triggers[2].atHour,triggers[2].everyDays],['Asia/Ho_Chi_Minh',2,1]);
ctx.donDepHotSheetDinhKy=(...args)=>args.length;
assert.equal(ctx.chayDonDepHotSheetTheoLich({triggerUid:'daily'}),0,'trigger giữ chính sách hạn chót mặc định của hàm dọn');
ctx.chayDonDep=()=>{props.delete('DOT_DON_VIDEO_LOI');return 'đã dọn theo yêu cầu';};
props.set('DOT_DON_VIDEO_LOI',JSON.stringify({chat:'chat'}));
assert.equal(ctx.chayBoNaoDieuPhoi(),'đã dọn theo yêu cầu','lịch chuẩn vẫn phục vụ /donvideoloi');

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
files.set(videoId,{getName:()=> 'duyet.mp4',getMimeType:()=> 'video/mp4',isTrashed:()=>inTrash,setTrashed:v=>{trashed.push(v);inTrash=v;}});
assert.equal(app.duaMp4LoiVaoThungRac_(videoId),true);
assert.equal(app.duaMp4LoiVaoThungRac_(videoId),true);
assert.equal(app.duaMp4LoiVaoThungRac_('id-missing'),true);
assert.deepEqual(trashed,[true]);
files.set('no-access',{getName(){throw Error('Access denied');}});
assert.equal(app.duaMp4LoiVaoThungRac_('no-access'),false);
addRow('TT-rejected');
const col=k=>cells[0].indexOf(k);
cells[3][col('file_video')]=videoUrl;

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
function mockTab(data, name='') {
  let maxRows=100;
  const valueAt=(r,c)=>data[r]?.[c] ?? '';
  const readValue=v=>typeof v==='string' && /^=HYPERLINK/i.test(v) ? 'Xem MP4' : v;
  const tab={
    getName:()=>name,
    getLastRow:()=>data.length,getMaxColumns:()=>app.COT.length,getMaxRows:()=>maxRows,
    getDataRange:()=>({getValues:()=>data.map(row=>row.map(readValue))}),
    appendRow:row=>data.push(Array.from(row)),setFrozenRows(){},setTabColor(){},
    deleteRow:n=>data.splice(n-1,1),
    insertRowsAfter:(_,n)=>{maxRows+=n;},
    getRange:(row,c,height=1,width=1)=>({
      getValue:()=>readValue(valueAt(row-1,c-1)),
      getFormula:()=>/^=HYPERLINK/i.test(valueAt(row-1,c-1)) ? valueAt(row-1,c-1) : '',
      getRichTextValue:()=>null,
      getFormulas:()=>Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>tab.getRange(row+i,c+j).getFormula())),
      getRichTextValues:()=>Array.from({length:height},()=>Array(width).fill(null)),
      getValues:()=>Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>tab.getRange(row+i,c+j).getValue())),
      setValue:v=>{(data[row-1] ||= [])[c-1]=v;},
      setValues(values){values.forEach((r,i)=>r.forEach((v,j)=>tab.getRange(row+i,c+j).setValue(v)));},
      copyTo(target){target.setValues(Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>valueAt(row+i-1,c+j-1))));}
    })
  };
  return tab;
}
const postedDate=new Date(Date.now()-8*86400e3);
const dateFromVN=(d,fmt)=>{
  const iso = new Date(d.getTime()+7*3600e3).toISOString();
  return fmt==='dd/MM' ? iso.slice(8,10)+'/'+iso.slice(5,7) : iso.slice(0,7).replace('-','_');
};
const archiveMonth='LuuTru_'+dateFromVN(postedDate,'yyyy_MM');
const archiveRow=(id,data)=>Array.from(app.COT,k=>({id,de_bai:'đề '+id,ma_bam:'hash-'+id,...data})[k] ?? '');
const hotData=[cells[0].slice(),
  archiveRow('posted',{trang_thai:'DA_DANG',cap_nhat:postedDate}),
  archiveRow('recent',{trang_thai:'DA_DANG',cap_nhat:new Date()}),
  archiveRow('rejected',{trang_thai:'XOA',ghi_chu:'BO_KHONG_DAT (video): t2_trong',
    file_video:'[Đã xóa file lỗi - 25/11]',cap_nhat:new Date(Date.now()-3*86400e3)})];
const hot=mockTab(hotData,'HANG_DOI'), tabs=new Map([['HANG_DOI',hot]]);
const book={
  getSheetByName:n=>tabs.get(n),
  getSheets:()=>Array.from(tabs.values()),
  insertSheet:n=>{const t=mockTab([],n);tabs.set(n,t);return t;},
  toast(){}
};
Object.assign(app,{voiKhoa_:(_,fn)=>fn(),damBaoCot_(){},deMoiChoSanPhamBiBo_(){},xoaKichBanKhoiSheet_(){throw Error('tạm lỗi');}});
app.SpreadsheetApp.getActiveSpreadsheet=()=>book;
app.Utilities.formatDate=(d,_,fmt)=>dateFromVN(d,fmt);
assert.equal(app.donDepHotSheetDinhKy().trucTrac,true);
assert.equal(hotData.length,4,'nguồn còn nguyên khi dọn bị gián đoạn');
assert.equal(tabs.get(archiveMonth).getLastRow(),2);
assert.equal(tabs.get('LuuTru_Loi').getLastRow(),2);
app.xoaKichBanKhoiSheet_=()=>{};
assert.deepEqual({...app.donDepHotSheetDinhKy()},{daDang:1,loi:1,docDe:0,mp4:0,trucTrac:false,hetGio:false,baoVe:0});
assert.deepEqual(hotData.slice(1).map(r=>r[0]),['recent']);
assert.equal(tabs.get(archiveMonth).getLastRow(),2,'chạy lại không chép trùng');
assert.equal(tabs.get('LUU_TRU').getLastRow(),3,'chạy lại không trùng mã băm');
assert.equal(app.docMaBamLuuTru_()['hash-posted'],true);
assert.equal(app.docMaBamLuuTru_()['hash-rejected'],true);

// Manual cleanup uses the rendered label, formula and explicit status from DOC_DE.
vm.runInContext(read('SanPham.gs'),app);
app.bam_=s=>createHash('md5').update(String(s).toLowerCase()).digest('hex');
const driveProps=new Map([['THU_MUC_VIDEO_ID','videos-folder']]);
const logs=[];
Object.assign(app,{
  nhatKy_:(kind,entry)=>logs.push([kind,entry]),
  PropertiesService:{getScriptProperties:()=>({
    getProperty:k=>driveProps.get(k),setProperty:(k,v)=>driveProps.set(k,v),deleteProperty:k=>driveProps.delete(k)
  })}
});
function mp4(id, name=id+'.mp4') {
  const file={getId:()=>id,getName:()=>name,getMimeType:()=> 'video/mp4',isTrashed:()=>file.removed,
    setTrashed:v=>{assert.equal(v,true);assert.equal(file.removed,false);file.removed=v;},removed:false};
  files.set(id,file);
  return file;
}
const docFormula='=HYPERLINK("https://drive.google.com/file/d/file-formula/view";"Xem MP4")';
const docData=[['Bảng đề'],['Mã','Trạng thái','ĐỀ BÀI','Ghi chú','Link video'],
  ['DOC-LOI','LOI_CAN_XEM','bài lỗi công thức','sửa 3 lần vẫn lỗi',docFormula],
  ['CHO-NOW','CHO_DANG','bài đang chờ','BO_KHONG_DAT từ bản trước','=HYPERLINK("https://drive.google.com/open?id=file-protected";"Xem MP4")'],
  ['DANG-DUNG','DANG_DUNG','bài đang dựng','BO_KHONG_DAT từ bản trước',''],
  ['CHO-KD','CHO_KIEM_DUYET','bài chờ kiểm duyệt','het_luot của bản cũ',''],
  ['CO-VIDEO','CO_VIDEO','video chưa có lỗi','đang chờ chấm',''],
  ['CHUA-CHOT','LOI_CAN_XEM','chưa kết luận','đang chờ xem',''],
  ['SHARED','BO_KHONG_DAT','dòng lỗi trỏ tới video chờ đăng','het_luot','https://drive.google.com/open?id=file-protected'],
  ['SHARED-NAME','LOI_CAN_XEM','dòng lỗi trỏ tới video đã đăng','BO_KHONG_DAT','https://drive.google.com/open?id=good-index-only']];
tabs.set('DOC_DE',mockTab(docData,'DOC_DE'));
const idx=tabs.get('LUU_TRU');
for (const [id,ketQua] of [['OLD-LOI','LOI_CU'],['OLD-LOAI','LOAI'],['OLD-CHO','CHO_QUA_HAN'],['OLD-BO','BO_KHONG_DAT'],
  ['POSTED-ID','DA_DANG'],['POSTED-ID','LOI_CU'],['CHO-NOW','LOAI'],['DANG-DUNG','LOI_CU'],['CHO-KD','LOI_CU'],
  ['CO-VIDEO','LOAI'],['CHUA-CHOT','LOI_CU'],['posted','LOI_CU'],['ID-NGAN','LOI_CU'],['FILE-ALIAS','LOI_CU']]) {
  idx.appendRow(['hash-'+id,id,'','','',ketQua,new Date()]);
}
const formulaFile=mp4('file-formula','DOC-LOI.mp4');
const rejectedFiles=[mp4('old-1','OLD-LOI.mp4'),mp4('old-2','demo_OLD-LOAI_legacy.MP4'),
  mp4('old-3','OLD-CHO.mp4'),mp4('old-4','OLD-BO.mp4'),mp4('old-5','rejected.mp4')];
const protectedFiles=[mp4('good-index-only','POSTED-ID.mp4'),mp4('good-1','CHO-NOW.mp4'),mp4('good-2','posted.mp4'),
  mp4('good-3','OLD-LOI_CHO-NOW.mp4'),mp4('good-4','ID-NGAN-10P.mp4'),mp4('file-protected','FILE-ALIAS.mp4'),
  mp4('good-5','DANG-DUNG.mp4'),mp4('good-6','CHO-KD.mp4'),mp4('good-7','CO-VIDEO.mp4'),mp4('good-8','CHUA-CHOT.mp4'),
  mp4('good-9','OLD-LOI_OLD-LOAI.mp4')];
const nonMp4=mp4('cover','OLD-LOI.png');
let folderFiles=[formulaFile,...rejectedFiles,...protectedFiles,nonMp4];
const cursorCalls=[];
function iterateFrom(i=0) {
  return {hasNext:()=>i<folderFiles.length,next:()=>folderFiles[i++],getContinuationToken:()=>String(i)};
}
app.DriveApp.getFolderById=id=>{
  assert.equal(id,'videos-folder');
  return {getId:()=>id,getFiles:()=>iterateFrom()};
};
app.DriveApp.continueFileIterator=token=>{cursorCalls.push(token);return iterateFrom(Number(token));};
assert.match(app.donSachVideoLoiDriveNgay(),/Đã chuyển 1 dòng DOC_DE .* đưa 6 file MP4/);
assert.equal(formulaFile.removed,true);
assert.ok(rejectedFiles.every(f=>f.removed));
assert.ok(protectedFiles.concat(nonMp4).every(f=>!f.removed));
assert.equal(docData.some(r=>r[0]==='DOC-LOI'),false);
assert.equal(docData.some(r=>r[0]==='SHARED' && r[4].includes('file-protected')),true);
const errorArchive=tabs.get('LuuTru_Loi');
assert.equal(errorArchive.getRange(3,1).getValue(),'DOC-LOI');
assert.match(errorArchive.getRange(3,col('file_video')+1).getValue(),/^\[Đã xóa file lỗi - \d\d\/\d\d\]$/);
assert.equal(app.docMaBamLuuTru_()[app.bam_('bài lỗi công thức')],true);
assert.match(logs.at(-1)[1],/1 dòng DOC_DE.*6 file MP4/);
assert.match(app.donSachVideoLoiDriveNgay(),/Đã chuyển 0 dòng DOC_DE .* đưa 0 file MP4/);

// A new BP4 failure trashes and archives the exact version. A stale callback cannot reject a passing version.
const bp4=mp4('bp4-new');
hotData.push(archiveRow('BP4-NEW',{trang_thai:'DANG_KIEM_DUYET',file_video:'bp4-new',cap_nhat:new Date()}));
app.boDeKhongDat_(hot,app.docHang_(hot).find(r=>r.id==='BP4-NEW'),'t2_trong: '+ 'mô tả dài '.repeat(100),'video');
assert.equal(bp4.removed,true);
assert.equal(hotData.some(r=>r[0]==='BP4-NEW'),false);
assert.equal(errorArchive.getRange(4,col('ghi_chu')+1).getValue(),'BO_KHONG_DAT (video): t2_trong');
assert.match(errorArchive.getRange(4,col('file_video')+1).getValue(),/^\[Đã xóa file lỗi - /);
hotData.push(archiveRow('PASS-BP4',{trang_thai:'CHO_DANG',file_video:'still-good',cap_nhat:new Date()}));
const passBp4=mp4('still-good');
app.boDeKhongDat_(hot,app.docHang_(hot).find(r=>r.id==='PASS-BP4'),'het_luot','video');
assert.equal(passBp4.removed,false);
assert.equal(hotData.find(r=>r[0]==='PASS-BP4')[1],'CHO_DANG');

// Retry a failed Drive write without losing the link or adding a second archive row.
const blocked=mp4('blocked');
const trashBlocked=blocked.setTrashed;
blocked.setTrashed=()=>{throw Error('Access denied');};
const blockedRow=['DOC-BLOCKED','LOI_CAN_XEM','đề liên kết lỗi','Kiểm duyệt bố cục vẫn lỗi','https://drive.google.com/open?id=blocked'];
docData.push(blockedRow);
assert.match(app.donSachVideoLoiDriveNgay(),/Có lỗi cần xem trong NHAT_KY/);
assert.match(blockedRow[4],/id=blocked/);
assert.equal(docData.includes(blockedRow),true);
blocked.setTrashed=trashBlocked;
assert.match(app.donSachVideoLoiDriveNgay(),/Đã chuyển 1 dòng DOC_DE .* đưa 1 file MP4/);
assert.equal(docData.includes(blockedRow),false);

// A timed-out scan resumes at the next Drive file, rebuilding the protection set before trashing it.
const resumeA=mp4('resume-a','RESUME-A.mp4'), resumeB=mp4('resume-b','RESUME-B.mp4'), resumeC=mp4('resume-c','RESUME-C.mp4');
for (const id of ['RESUME-A','RESUME-B','RESUME-C']) idx.appendRow(['hash-'+id,id,'','','','LOAI',new Date()]);
folderFiles=[resumeA,resumeB,resumeC];
const now=Date.now();
const actualNow=Date.now;
const trashA=resumeA.setTrashed;
let clock=now;
try {
  Date.now=()=>clock;
  resumeA.setTrashed=v=>{trashA(v);clock=now+260000;};
  assert.match(app.donSachVideoLoiDriveNgay(),/Chạy thêm một lượt/);
  assert.equal(resumeB.removed,false);
  assert.equal(JSON.parse(driveProps.get('VI_TRI_QUET_VIDEO_LOI')).token,'1');
  docData.push(['RESUME-B','CHO_DANG','vừa duyệt','','']);
  assert.match(app.donSachVideoLoiDriveNgay(),/đưa 1 file MP4/);
  assert.equal(resumeB.removed,false);
  assert.equal(resumeC.removed,true);
  assert.deepEqual(cursorCalls,['1']);
  assert.equal(driveProps.has('VI_TRI_QUET_VIDEO_LOI'),false);
} finally { Date.now=actualNow; }

// A backlog larger than the periodic batch is processed by the Zalo command, including recent/undated rows.
const backlogFiles=Array.from({length:103},(_,i)=>{
  const file=mp4('backlog-file-'+i,'BACKLOG-'+i+'.mp4');
  docData.push(['BACKLOG-'+i,'LOI_CAN_XEM','đề tồn số '+i,'Mắt thần 3+3','https://drive.google.com/open?id='+file.getId()]);
  return file;
});
const replies=[];
Object.assign(app,{LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  guiZaloToi_:(...args)=>replies.push(args)});
folderFiles=[...backlogFiles,mp4('canonical-name','ban-cu-TT260126-103000-1-render.mp4')];
idx.appendRow(['hash-native-id','TT260126-103000-1','','','','LOI_CU',new Date()]);
assert.match(app.traLoiLenh_('chat-test','/donvideoloi'),/Đã nhận/);
assert.equal(backlogFiles[0].removed,false,'webhook trả lời trước khi gọi Drive');
app.chayDonDep();
assert.deepEqual(replies.map(([chat])=>chat),['chat-test']);
assert.match(replies[0][1],/Đã chuyển 103 dòng DOC_DE .* đưa 104 file MP4/);
assert.ok(folderFiles.every(f=>f.removed));
assert.ok(docData.every(r=>!String(r[0]).startsWith('BACKLOG-')));
assert.equal(driveProps.has('DOT_DON_VIDEO_LOI'),false);

const inputs=[['mon','du_lieu'],['id','de'],['id','de'],['viec','id','kich_ban','lan_giao'],['id','du_lieu','lan_giao'],['viec','id','dang','lan_giao']];
workflow.forEach((file,bp)=>{
  const yaml=read('.github/workflows/'+file).split('concurrency:')[0];
  inputs[bp].forEach(key=>assert.match(yaml,new RegExp('^      '+key+':','m'),file));
});
console.log('0 hỏng. Đạt điều phối BP5 → BP0, chỉ tiêu ngày, kho đệm, lịch và lệnh Zalo, phanh tồn, dọn MP4, lưu kịch bản, watchdog, checkout Python và đăng ký/cú pháp '+gs.length+' tệp .gs.');
