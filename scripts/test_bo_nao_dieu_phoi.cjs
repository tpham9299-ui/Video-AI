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
assert.equal(ctx.BO_NAO_.thuLai, 1, 'trần thử lại thống nhất TRAN_SUA_BP3 = 1');
for (let n=1;n<=ctx.BO_NAO_.thuLai;n++) {
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
    if (/^ +scripts\/khung4tang\s*$/m.test(yml)) {
      fs.cpSync(path.join(root,'scripts','khung4tang'),path.join(dir,'khung4tang'),{recursive:true});
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

// Tự động đọc link Drive 3 nguồn, phân loại lỗi DOC_DE (XOA_KHONG_SUA_DUOC vs BAT_BUOC_SUA) và thực thi /xulyloi + nhipBoNao_.
function richText(text, linkUrl = null, runs = []) {
  return {
    _isRichText: true,
    getText: () => text,
    getLinkUrl: () => linkUrl,
    getRuns: () => runs.map(([t, u]) => ({ getText: () => t, getLinkUrl: () => u }))
  };
}
function mockRichTab(data, name = '') {
  let maxRows = 100;
  const rawAt = (r, c) => data[r]?.[c] ?? '';
  const readVal = v => {
    if (v && v._isRichText) return v.getText();
    if (typeof v === 'string' && /^=HYPERLINK/i.test(v)) return 'Xem MP4';
    return v;
  };
  const tab = {
    getName: () => name,
    getLastRow: () => data.length,
    getLastColumn: () => Math.max(...data.map(r => r.length), 1),
    getMaxColumns: () => Math.max(...data.map(r => r.length), app.COT.length),
    getMaxRows: () => maxRows,
    getDataRange: () => ({ getValues: () => data.map(r => r.map(readVal)) }),
    appendRow: r => data.push(Array.from(r)),
    setFrozenRows() {},
    setTabColor() {},
    deleteRow: n => data.splice(n - 1, 1),
    insertRowsAfter: (_, n) => { maxRows += n; },
    getRange: (row, c, height = 1, width = 1) => ({
      getValue: () => readVal(rawAt(row - 1, c - 1)),
      getFormula: () => {
        const v = rawAt(row - 1, c - 1);
        return typeof v === 'string' && /^=HYPERLINK/i.test(v) ? v : '';
      },
      getRichTextValue: () => {
        const v = rawAt(row - 1, c - 1);
        return v && v._isRichText ? v : null;
      },
      getFormulas: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => tab.getRange(row + i, c + j).getFormula())),
      getRichTextValues: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => tab.getRange(row + i, c + j).getRichTextValue())),
      getValues: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => tab.getRange(row + i, c + j).getValue())),
      setValue: v => { (data[row - 1] ||= [])[c - 1] = v; },
      setValues(values) { values.forEach((r, i) => r.forEach((v, j) => tab.getRange(row + i, c + j).setValue(v))); },
      copyTo(target) { target.setValues(Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => rawAt(row + i - 1, c + j - 1)))); }
    })
  };
  return tab;
}
function jsonFile(id, name = id + '.json') {
  const file = {
    getId: () => id, getName: () => name, getMimeType: () => 'application/json',
    isTrashed: () => file.removed,
    setTrashed: v => { assert.equal(v, true); assert.equal(file.removed, false); file.removed = v; },
    removed: false
  };
  files.set(id, file);
  return file;
}

// Kiểm tra layDanhSachFileIdDriveTuDong_ đọc đủ 3 nguồn (RichText + getRuns, Formula HYPERLINK, Value URL trần + DRIVE_JSON).
const triSourceData = [
  ['Thanh thống kê'],
  ['Mã', 'Trạng thái', 'Lớp', 'Chủ đề', 'ĐỀ BÀI', 'Đáp án', 'Tư duy', 'Vì sao cần suy nghĩ', 'Bẫy thường gặp', 'Kịch bản', 'Ghi chú'],
  [
    'SRC-1', 'LOI_CAN_XEM', '12', 'Chủ đề', 'Đề 1', '1/2', '8',
    'DRIVE_JSON:kb-value-1 https://drive.google.com/open?id=raw-url-1',
    '=HYPERLINK("https://drive.google.com/file/d/hyp-id-1/view";"Mở MP4")',
    richText('🎬 Xem video | ▶️ Mở file', 'https://drive.google.com/file/d/rt-cell-1/view', [
      ['🎬 Xem video', 'https://drive.google.com/file/d/rt-run-mp4/view'],
      ['▶️ Mở file', 'https://drive.google.com/file/d/rt-run-json/view']
    ]),
    'DUNG_VIDEO: Xem nhật ký: https://github.com/test/runs/1'
  ]
];
const triTab = mockRichTab(triSourceData, 'DOC_DE');
assert.deepEqual(
  Array.from(app.layDanhSachFileIdDriveTuDong_(triTab, 3, 11)).sort(),
  ['hyp-id-1', 'kb-value-1', 'raw-url-1', 'rt-cell-1', 'rt-run-json', 'rt-run-mp4'].sort()
);

// Kiểm tra phanLoaiLoiDong_ đủ các nhánh (BP1, BP2, BP3, lỗi bản chất, chạm trần, quá 48h, không rõ nguyên nhân).
assert.equal(app.phanLoaiLoiDong_('BO_KHONG_DAT', 'bất kỳ', 0).hanhDong, 'XOA_KHONG_SUA_DUOC');
assert.equal(app.phanLoaiLoiDong_('LOAI', 'lệch đáp án', 0).hanhDong, 'XOA_KHONG_SUA_DUOC');
for (const kw of ['BO_KHONG_DAT', 'sửa 3 lần vẫn lỗi', 'Mắt thần 3+3', 'het_luot', 'Kiểm duyệt bố cục vẫn lỗi', 'AI_SAI_TOAN', 'DE_SAI', 'VO_NGHIEM_SAI_DE', 'KHONG_CO_DAP_AN', 'TRUNG_DE']) {
  assert.equal(app.phanLoaiLoiDong_('LOI_CAN_XEM', kw, 0).hanhDong, 'XOA_KHONG_SUA_DUOC', 'từ khóa không sửa được: ' + kw);
}
assert.deepEqual(
  { h: app.phanLoaiLoiDong_('LOI_CAN_XEM', 'het_key tại BP1', 0).hanhDong, t: app.phanLoaiLoiDong_('LOI_CAN_XEM', 'het_key tại BP1', 0).trangThaiDich },
  { h: 'BAT_BUOC_SUA', t: 'CHO_GIAI' }
);
assert.equal(app.phanLoaiLoiDong_('LOI_CAN_XEM', '[TU_SUA:1/1] Ly do cu: JSON_LOI', 1).hanhDong, 'XOA_KHONG_SUA_DUOC');
assert.equal(app.phanLoaiLoiDong_('LOI_CAN_XEM', 'timeout tại BP1', 0).trangThaiDich, 'CHO_GIAI');
assert.equal(app.phanLoaiLoiDong_('LOI_CAN_XEM', 'DE_CHU: chồng chữ', 0).trangThaiDich, 'CHO_KICH_BAN');
assert.equal(app.phanLoaiLoiDong_('LOI_CAN_XEM', 'TRAN_KHUNG', 1).hanhDong, 'XOA_KHONG_SUA_DUOC');
assert.equal(app.phanLoaiLoiDong_('LOI_CAN_XEM', 'DUNG_VIDEO: 503', 0, { coKichBanJson: true }).trangThaiDich, 'CO_KICH_BAN');
assert.equal(app.phanLoaiLoiDong_('LOI_CAN_XEM', 'DUNG_VIDEO: 503', 0, { coKichBanJson: true }).tranSua, 1);
assert.equal(app.phanLoaiLoiDong_('LOI_CAN_XEM', 'GIAO_DIEN_CU_KHONG_HOP_LE', 0, { coKichBanJson: false }).trangThaiDich, 'CHO_KICH_BAN');
assert.equal(app.phanLoaiLoiDong_('LOI_CAN_XEM', 'DUNG_VIDEO: 503', 1, { coKichBanJson: true }).hanhDong, 'XOA_KHONG_SUA_DUOC');
assert.equal(app.phanLoaiLoiDong_('LOI_CAN_XEM', 'DUNG_VIDEO: 503', 0, { coKichBanJson: true, quaHan48h: true }).hanhDong, 'XOA_KHONG_SUA_DUOC');
assert.equal(app.phanLoaiLoiDong_('LOI_CAN_XEM', 'lỗi lạ không xác định', 0).hanhDong, 'XOA_KHONG_SUA_DUOC');

// 5 CA BẮT BUỘC cho xuLyLoiTrenSheetNgay() và lệnh Zalo /xulyloi.
const ca1Json = jsonFile('ca1-kb-json', 'CA1-DUNG.json');
const ca1BadMp4 = mp4('ca1-bad-mp4', 'CA1-DUNG.mp4');
const ca1NoKbMp4 = mp4('ca1-nokb-mp4', 'CA1-NOKB.mp4');
const ca2Json = jsonFile('ca2-kb-json', 'CA2-HETLUOT.json');
const ca2Mp4 = mp4('ca2-bad-mp4', 'CA2-HETLUOT.mp4');
const ca3Video = mp4('ca3-bo-mp4', 'CA3-BO.mp4');
const ca4BadMp4 = mp4('ca4-bad-mp4', 'CA4-T2.mp4');
const ca5DaDang = mp4('ca5-dadang-mp4', 'CA5-DADANG.mp4');
const ca5ChoDang = mp4('ca5-chodang-mp4', 'CA5-CHODANG.mp4');
const ca5Orphan = mp4('ca5-orphan-mp4', 'CA3-BO_ban_cu.mp4');

const docLoiHeader = ['Mã', 'Trạng thái', 'Lớp', 'Chủ đề', 'ĐỀ BÀI', 'Đáp án', 'Tư duy', 'Vì sao cần suy nghĩ', 'Bẫy thường gặp', 'Kịch bản', 'Ghi chú'];
const docLoiRows = [
  ['Thống kê cũ (⚠️ 5 lỗi)'],
  docLoiHeader,
  // Ca 1a: DUNG_VIDEO lần đầu, có Rich Text ▶️ Mở file (JSON hợp lệ) + MP4 hỏng -> xóa MP4 hỏng, giữ JSON, [TU_SUA:1/2], đẩy CO_KICH_BAN
  ['CA1-DUNG', 'LOI_CAN_XEM', '12', 'Tối ưu', 'Đề ca 1a', '5', '8', '', '',
    richText('▶️ Mở file', null, [
      ['▶️ Mở file', 'https://drive.google.com/file/d/ca1-kb-json/view'],
      ['🎬 Xem video', 'https://drive.google.com/file/d/ca1-bad-mp4/view']
    ]),
    'DUNG_VIDEO: Xem nhật ký: https://github.com/test/runs/101'],
  // Ca 1b: DUNG_VIDEO lần đầu, không còn JSON hợp lệ -> xóa MP4 hỏng, [TU_SUA:1/2], đẩy CHO_KICH_BAN
  ['CA1-NOKB', 'LOI_CAN_XEM', '12', 'Tối ưu', 'Đề ca 1b', '6', '8', '', '',
    richText('🎬 Xem video', 'https://drive.google.com/file/d/ca1-nokb-mp4/view'),
    'DUNG_VIDEO: Xem nhật ký: https://github.com/test/runs/102'],
  // Ca 2: DUNG_VIDEO đã [TU_SUA:1/1] -> XOA_KHONG_SUA_DUOC, setTrashed(true), LUU_TRU + LuuTru_Loi, xóa khỏi DOC_DE
  ['CA2-HETLUOT', 'LOI_CAN_XEM', '12', 'Xác suất', 'Đề ca 2 hết lượt', '3/4', '8', '', '',
    richText('▶️ Mở file', null, [
      ['▶️ Mở file', 'https://drive.google.com/file/d/ca2-kb-json/view'],
      ['🎬 Xem video', 'https://drive.google.com/file/d/ca2-bad-mp4/view']
    ]),
    '[TU_SUA:1/1] Ly do cu: DUNG_VIDEO: Xem nhật ký: https://github.com/test/runs/202'],
  // Ca 3: LOI_CAN_XEM ghi BO_KHONG_DAT (video): S_0, u_1 có Rich Text 🎬 Xem video -> setTrashed(true) đúng fileId, xóa hẳn khỏi DOC_DE
  ['CA3-BO', 'LOI_CAN_XEM', '11', 'Hình học', 'Đề ca 3 bỏ không đạt', '12', '9', '', '',
    richText('🎬 Xem video', 'https://drive.google.com/file/d/ca3-bo-mp4/view'),
    'BO_KHONG_DAT (video): S_0, u_1'],
  // Ca 4: LOI_CAN_XEM ghi t2_trong lần đầu -> đẩy về CHO_KICH_BAN kèm [TU_SUA:1/1]
  ['CA4-T2', 'LOI_CAN_XEM', '12', 'Thực tế', 'Đề ca 4 t2 trống', '10', '8', '', '',
    richText('🎬 Xem video', 'https://drive.google.com/file/d/ca4-bad-mp4/view'),
    't2_trong'],
  // Ca 5: Dòng DA_DANG và CHO_DANG phải được bảo vệ tuyệt đối
  ['CA5-DADANG', 'DA_DANG', '12', 'Đã đăng', 'Đề ca 5 đã đăng', '7', '9', '', '',
    richText('🎬 Xem video', 'https://drive.google.com/file/d/ca5-dadang-mp4/view'), ''],
  ['CA5-CHODANG', 'CHO_DANG', '12', 'Chờ đăng', 'Đề ca 5 chờ đăng', '8', '9', '', '',
    richText('🎬 Xem video', 'https://drive.google.com/file/d/ca5-chodang-mp4/view'), '']
];
const docLoiTab = mockRichTab(docLoiRows, 'DOC_DE');
const hangLoiData = [cells[0].slice(),
  archiveRow('CA1-DUNG', { trang_thai: 'LOI_CAN_XEM', file_video: 'ca1-bad-mp4', file_kich_ban: 'DRIVE_JSON:ca1-kb-json', cap_nhat: new Date() }),
  archiveRow('CA2-HETLUOT', { trang_thai: 'LOI_CAN_XEM', file_video: 'ca2-bad-mp4', file_kich_ban: 'DRIVE_JSON:ca2-kb-json', cap_nhat: new Date() }),
  archiveRow('CA4-T2', { trang_thai: 'LOI_CAN_XEM', file_video: 'ca4-bad-mp4', cap_nhat: new Date() }),
  archiveRow('CA5-DADANG', { trang_thai: 'DA_DANG', file_video: 'ca5-dadang-mp4', cap_nhat: new Date() }),
  archiveRow('CA5-CHODANG', { trang_thai: 'CHO_DANG', file_video: 'ca5-chodang-mp4', cap_nhat: new Date() })
];
const hangLoiTab = mockRichTab(hangLoiData, 'HANG_DOI');
const luuTruLoiMoi = mockRichTab([], 'LuuTru_Loi');
const chiMucMoi = mockRichTab([['ma_bam', 'id', 'lop', 'de_bai_rut_gon', 'dap_an', 'ket_qua', 'ngay_xong']], 'LUU_TRU');
tabs.set('DOC_DE', docLoiTab);
tabs.set('HANG_DOI', hangLoiTab);
tabs.set('LuuTru_Loi', luuTruLoiMoi);
tabs.set('LUU_TRU', chiMucMoi);
folderFiles = [ca1BadMp4, ca1NoKbMp4, ca2Mp4, ca3Video, ca4BadMp4, ca5DaDang, ca5ChoDang, ca5Orphan];
driveProps.delete('VI_TRI_QUET_VIDEO_LOI');

const tomTatLoi = app.xuLyLoiTrenSheetNgay();
assert.match(tomTatLoi, /Đẩy sửa lại: 3 bài \(BP1: 0, BP2: 2, BP3: 1\)/);
assert.match(tomTatLoi, /Đã xóa không sửa được: 2 bài/);
assert.match(tomTatLoi, /Đã đưa vào Thùng rác Drive: 7 file/);

// Kiểm chứng Ca 1a & Ca 1b
const rCa1a = docLoiRows.find(r => r[0] === 'CA1-DUNG');
assert.equal(rCa1a[1], 'CO_KICH_BAN', 'Ca 1a đẩy về CO_KICH_BAN khi còn file JSON hợp lệ');
assert.match(rCa1a[10], /^\[TU_SUA:1\/1\] Ly do cu: DUNG_VIDEO: Xem nhật ký:/);
assert.equal(ca1BadMp4.removed, true, 'Ca 1a xóa MP4 hỏng');
assert.equal(ca1Json.removed, false, 'Ca 1a giữ lại file JSON kịch bản');
const hCa1a = hangLoiData.find(r => r[0] === 'CA1-DUNG');
assert.equal(hCa1a[1], 'CHO_DUNG', 'HANG_DOI đồng bộ CO_KICH_BAN -> CHO_DUNG để BP3 chạy ngay');
const rCa1b = docLoiRows.find(r => r[0] === 'CA1-NOKB');
assert.equal(rCa1b[1], 'CHO_KICH_BAN', 'Ca 1b thiếu JSON đẩy về CHO_KICH_BAN');
assert.match(rCa1b[10], /^\[TU_SUA:1\/1\] Ly do cu: DUNG_VIDEO:/);
assert.equal(ca1NoKbMp4.removed, true);

// Kiểm chứng Ca 2
assert.equal(docLoiRows.some(r => r[0] === 'CA2-HETLUOT'), false, 'Ca 2 xóa hẳn khỏi DOC_DE');
assert.equal(hangLoiData.some(r => r[0] === 'CA2-HETLUOT'), false, 'Ca 2 xóa hẳn khỏi HANG_DOI');
assert.equal(ca2Mp4.removed, true, 'Ca 2 xóa MP4 lỗi');
assert.equal(ca2Json.removed, true, 'Ca 2 xóa luôn JSON lỗi');
assert.equal(luuTruLoiMoi.getDataRange().getValues().some(r => r[0] === 'CA2-HETLUOT'), true, 'Ca 2 lưu LuuTru_Loi');
assert.equal(chiMucMoi.getDataRange().getValues().some(r => r[1] === 'CA2-HETLUOT' && r[5] === 'LOI_KHONG_SUA_DUOC'), true, 'Ca 2 lưu LUU_TRU ket_qua=LOI_KHONG_SUA_DUOC');

// Kiểm chứng Ca 3
assert.equal(docLoiRows.some(r => r[0] === 'CA3-BO'), false, 'Ca 3 xóa hẳn khỏi DOC_DE');
assert.equal(ca3Video.removed, true, 'Ca 3 xóa đúng fileId từ Rich Text 🎬 Xem video');
assert.equal(ca5Orphan.removed, true, 'Quét Drive dọn luôn MP4 mồ côi của mã đã xóa');
assert.equal(luuTruLoiMoi.getDataRange().getValues().some(r => r[0] === 'CA3-BO'), true);
assert.equal(chiMucMoi.getDataRange().getValues().some(r => r[1] === 'CA3-BO' && r[5] === 'LOI_KHONG_SUA_DUOC'), true);

// Kiểm chứng Ca 4
const rCa4 = docLoiRows.find(r => r[0] === 'CA4-T2');
assert.equal(rCa4[1], 'CHO_KICH_BAN', 'Ca 4 đẩy về CHO_KICH_BAN');
assert.equal(rCa4[10], '[TU_SUA:1/1] Ly do cu: t2_trong');
assert.equal(ca4BadMp4.removed, true);
const hCa4 = hangLoiData.find(r => r[0] === 'CA4-T2');
assert.equal(hCa4[1], 'CHO_KICH_BAN');
assert.match(hCa4[col('gop_y')], /t2_trong/);

// Kiểm chứng Ca 5: tuyệt đối KHÔNG xóa file DA_DANG / CHO_DANG và thanh thống kê hàng 1 đã làm mới
assert.equal(ca5DaDang.removed, false, 'Ca 5 bảo vệ DA_DANG');
assert.equal(ca5ChoDang.removed, false, 'Ca 5 bảo vệ CHO_DANG');
assert.equal(docLoiRows.some(r => r[0] === 'CA5-DADANG'), true);
assert.equal(docLoiRows.some(r => r[0] === 'CA5-CHODANG'), true);
assert.match(String(docLoiRows[0][0]), /Tổng 5 đề.*⚠️ 0 lỗi/, 'Thanh thống kê hàng 1 cập nhật ngay lập tức');

// Kiểm chứng lệnh Zalo /xulyloi và trần 3 bài/nhịp (key >= 25%) vs 0 bài sửa (key < 25%, vẫn xóa không sửa được) trong nhipBoNao_.
assert.match(app.traLoiLenh_('chat-test', '/xulyloi'), /Đẩy sửa lại: 0 bài.*Đã xóa không sửa được: 0 bài/s);
vm.runInContext(read('ZaloDeBai.gs'), app);
const zaloRepliesLoi = [];
const zaloCacheLoi = new Map();
Object.assign(app, {
  CacheService: { getScriptCache: () => ({ get: k => zaloCacheLoi.get(k), put: (k, v) => zaloCacheLoi.set(k, v) }) },
  ContentService: { createTextOutput: () => ({ setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  guiZaloToi_: (_, msg) => zaloRepliesLoi.push(msg)
});
driveProps.set('ZALO_WEBHOOK_SECRET', 'sec-loi');
driveProps.set('ZALO_CHAT_IDS', 'chat-loi');
app.nhanZalo_({ parameter: { k: 'sec-loi' }, postData: { contents: JSON.stringify({ message: { text: '/xulyloi', message_id: 'm-xl-1', chat: { id: 'chat-loi' } } }) } });
assert.match(zaloRepliesLoi.at(-1), /Đẩy sửa lại: 0 bài \(BP1: 0, BP2: 0, BP3: 0\)/);

// Kiểm tra tách tác vụ nặng khỏi nhịp 5 phút: nhipBoNao_('chay') KHÔNG chạy xuLyLoiDocDe_ (giữ <30s, tránh "khóa đang bận");
// còn xuLyLoiDocDe_ tự kiểm soát trần toiDaSua (0 khi key < 25%, 3 khi key >= 25%).
const nhipDocRows = [
  ['Thống kê'], docLoiHeader,
  ['NB-S1', 'LOI_CAN_XEM', '12', 'T', 'Đề s1', '1', '8', '', '', '', 't2_trong'],
  ['NB-S2', 'LOI_CAN_XEM', '12', 'T', 'Đề s2', '2', '8', '', '', '', 't2_trong'],
  ['NB-S3', 'LOI_CAN_XEM', '12', 'T', 'Đề s3', '3', '8', '', '', '', 't2_trong'],
  ['NB-S4', 'LOI_CAN_XEM', '12', 'T', 'Đề s4', '4', '8', '', '', '', 't2_trong'],
  ['NB-X1', 'LOI_CAN_XEM', '12', 'T', 'Đề x1', '5', '8', '', '', '', 'AI_SAI_TOAN']
];
tabs.set('DOC_DE', mockRichTab(nhipDocRows, 'DOC_DE'));
tabs.set('HANG_DOI', mockRichTab([cells[0].slice()], 'HANG_DOI'));
folderFiles = [];
let appKeyRatio = 0.2;
Object.assign(app, {
  khoThongKeKhaDung_: () => ({ tyLe: appKeyRatio, conSong: Math.round(20 * appKeyRatio), tong: 20 }),
  runsDangBoNao_: () => [],
  docRunsBoNao_: () => [],
  chanNguonBoNao_: () => 'đủ nguồn',
  chDang_: () => 'TAT',
  chNC_: () => 'TAT',
  dangNghi_: () => false,
  dsNenTangChoVideo_: () => [],
  matThanChan_: () => false,
  laUuTien_: () => false,
  giaiTrenGitHub_: () => true
});
app.Utilities.formatDate = (d, _, fmt) => fmt === 'HH' ? '10' : fmt === 'yyyyMMdd' ? '20261127' : dateFromVN(d, fmt);
app.nhipBoNao_('chay');
assert.equal(nhipDocRows.some(r => r[0] === 'NB-X1'), true, 'nhipBoNao_ siêu nhẹ KHÔNG quét/xóa nặng trên DOC_DE trong nhịp 5 phút');
app.xuLyLoiDocDe_({ chayTay: false, toiDaSua: 0 });
assert.equal(nhipDocRows.some(r => r[0] === 'NB-X1'), false, 'Nhánh xóa không sửa được chạy khi toiDaSua=0');
assert.equal(nhipDocRows.slice(2).filter(r => r[1] === 'CHO_KICH_BAN').length, 0, 'toiDaSua=0 không đẩy sửa');
app.xuLyLoiDocDe_({ chayTay: false, toiDaSua: 3 });
assert.equal(nhipDocRows.slice(2).filter(r => r[1] === 'CHO_KICH_BAN').length, 3, 'Mỗi lượt dọn đẩy sửa tối đa 3 bài');
assert.equal(nhipDocRows.slice(2).filter(r => r[1] === 'LOI_CAN_XEM').length, 1, 'Bài thứ 4 chờ lượt sau');

// Kiểm chứng bổ sung Đợt 1:
// (A) Đọc Rich Text Link cột J (kể cả multi-run) trong donSachVideoLoiDriveNgay;
// (B) Lỗi quyền sở hữu DriveApp ghi nguyên văn err.message vào NHAT_KY và >1 lần thì gắn [BO_QUA_XOA_MP4] + VẪN chuyển LuuTru_Loi (không lặp vô hạn);
// (C) Tự động dọn PropertiesService vượt 35/50 (xóa PLI_*, HE_* > 3 ngày, khóa tạm/mã bài/ngày cũ; giữ nguyên key Gemini, GitHub token, cấu hình & sản lượng hôm nay).
const rtColJMp4 = mp4('rt-colj-mp4', 'RT-COLJ.mp4');
const rtColJJson = jsonFile('rt-colj-json', 'RT-COLJ.json');
const deniedForever = mp4('denied-forever', 'DENIED-ROW.mp4');
deniedForever.setTrashed = () => { throw Error('Access denied: You do not have permission to trash this file'); };
const permDocRows = [
  ['Thống kê'], docLoiHeader,
  ['RT-COLJ', 'LOI_CAN_XEM', '12', 'Xác suất', 'Đề cột J rich text runs', '1/2', '8', '', '',
    richText('▶️ Mở file | 🎬 Xem video', null, [
      ['▶️ Mở file', 'https://drive.google.com/file/d/rt-colj-json/view'],
      ['🎬 Xem video', 'https://drive.google.com/file/d/rt-colj-mp4/view']
    ]),
    'BO_KHONG_DAT (video): t2_trong'],
  ['DENIED-ROW', 'LOI_CAN_XEM', '12', 'Thực tế', 'Đề lỗi quyền sở hữu Drive', '5', '8', '', '',
    richText('🎬 Xem video', 'https://drive.google.com/file/d/denied-forever/view'),
    'BO_KHONG_DAT (video): cat_chu']
];
const permLuuTruLoi = mockRichTab([], 'LuuTru_Loi');
const permChiMuc = mockRichTab([['ma_bam', 'id', 'lop', 'de_bai_rut_gon', 'dap_an', 'ket_qua', 'ngay_xong']], 'LUU_TRU');
tabs.set('DOC_DE', mockRichTab(permDocRows, 'DOC_DE'));
tabs.set('HANG_DOI', mockRichTab([cells[0].slice()], 'HANG_DOI'));
tabs.set('LuuTru_Loi', permLuuTruLoi);
tabs.set('LUU_TRU', permChiMuc);
folderFiles = [rtColJMp4, deniedForever];
driveProps.delete('MP4_LOI_BO_QUA');
driveProps.delete('VI_TRI_QUET_VIDEO_LOI');
logs.length = 0;

// Lượt 1: RT-COLJ xóa được MP4 từ run thứ 2 ở cột J (không xóa nhầm JSON); DENIED-ROW bị từ chối quyền lần 1 -> ghi nguyên văn err.message vào NHAT_KY, giữ dòng chờ thử lại 1 lần
const kqQuyen1 = app.donSachVideoLoiDriveNgay();
assert.equal(rtColJMp4.removed, true, 'donSachVideoLoiDriveNgay đọc đúng Rich Text run ở cột J và xóa MP4');
assert.equal(rtColJJson.removed, false, 'donTepVideoCuaDong_ bỏ qua file JSON ở cột J');
assert.equal(permDocRows.some(r => r[0] === 'RT-COLJ'), false);
assert.equal(permDocRows.some(r => r[0] === 'DENIED-ROW'), true, 'Lần 1 lỗi quyền giữ lại thử thêm 1 lần');
assert.ok(logs.some(([muc, msg]) => muc === 'DON_VIDEO_LOI' && /Access denied: You do not have permission to trash this file/.test(msg)), 'Ghi nguyên văn err.message vào NHAT_KY');
assert.match(kqQuyen1, /Có lỗi cần xem trong NHAT_KY/);

// Lượt 2: DENIED-ROW bị từ chối quyền lần 2 (>1 lần) -> gắn [BO_QUA_XOA_MP4] và VẪN chuyển sang LuuTru_Loi, xóa khỏi DOC_DE (chấm dứt vòng lặp 90 lỗi!)
logs.length = 0;
const kqQuyen2 = app.donSachVideoLoiDriveNgay();
assert.equal(permDocRows.some(r => r[0] === 'DENIED-ROW'), false, 'Lần 2 lỗi quyền phải chuyển dòng khỏi DOC_DE để không lặp vô hạn');
const dongDeniedLuu = permLuuTruLoi.getDataRange().getValues().find(r => r[0] === 'DENIED-ROW');
assert.ok(dongDeniedLuu, 'DENIED-ROW đã được chuyển vào LuuTru_Loi');
assert.match(String(dongDeniedLuu[col('ghi_chu')]), /\[BO_QUA_XOA_MP4\]/, 'Gắn cờ [BO_QUA_XOA_MP4] trên dòng chuyển lưu trữ');
assert.equal(logs.some(([muc, msg]) => muc === 'DON_VIDEO_LOI' && /\[BO_QUA_XOA_MP4\]/.test(msg)), true);
assert.match(kqQuyen2, /Đã chuyển 1 dòng DOC_DE/);

// Kiểm chứng donRacScriptProperties() + donDepHotSheetDinhKy() tự dọn khi > 35/50 khóa
const propStore = new Map([
  ['GEMINI_API_KEY', 'key-chinh'],
  ['GEMINI_KEYS_GITHUB', 'key-gh-1,key-gh-2'],
  ['GITHUB_TOKEN', 'ghp_secret'],
  ['GITHUB_REPO', 'user/Video-AI'],
  ['DUNG_VIDEO_SECRET', 'sec-123'],
  ['BO_NAO_VIDEO_MOI_NGAY', JSON.stringify({ ngay: '20261127', ids: ['TT1', 'TT2'] })],
  ['PLAYLIST_Toan_lop_12', 'PL123'],
  ['kd_active1', 'BAD'],
  ['kdm_active2_pro', '2026-11-27'],
  ['HE_yt_recent', '2026-11-26'],
  ['DON_RAC_NGAY', '2026-11-27'],
  // Các nhóm khóa rác cần quét sạch:
  ['BP0_GIU_DEN', String(Date.now() - 60000)],
  ['NGHI_DEN', String(Date.now() - 60000)],
  ['DA_NANG_CAP_DRIVE_V40', '{"old":1}'],
  ['KEY_HET_NGAY_GH', JSON.stringify({ ngay: '2026-11-20', ds: ['a'] })],
  ['BO_NAO_DA_BAO_18H', '20261120'],
  ['BO_NAO_DON_CU_NGAY', JSON.stringify({ ngay: '20261120', ids: ['x'] })],
  ['DA_SINH_10P_NGAY', '20261120'],
  ['MODEL_CHAN_403', JSON.stringify({ 'gemini-old': Date.now() - 1000 })],
  ['ZALO_TT261120-101010-1', '1'],
  ['TMP_RUN_OLD', '1'],
  ['THONG_KE_2026-11-20', '9'],
]);
for (let i = 0; i < 15; i++) propStore.set('PLI_vid' + i + '_PL123', '1');
for (let i = 0; i < 10; i++) propStore.set('HE_yt_old_' + i, '2026-11-20');
for (let i = 0; i < 10; i++) propStore.set('kdm_old_' + i, '2026-11-22');
assert.ok(propStore.size > 35, 'Bắt đầu vượt ngưỡng 35/50');
app.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: k => (propStore.has(k) ? propStore.get(k) : null),
    getProperties: () => Object.fromEntries(propStore),
    getKeys: () => Array.from(propStore.keys()),
    setProperty: (k, v) => propStore.set(k, String(v)),
    deleteProperty: k => propStore.delete(k)
  })
};
app.khoNgayPT_ = () => '2026-11-27';
app.Utilities.formatDate = (d, tz, fmt) => {
  if (fmt === 'yyyy-MM-dd') return '2026-11-27';
  if (fmt === 'yyyyMMdd') return '20261127';
  return dateFromVN(d, fmt);
};
app.donDepHotSheetDinhKy();
assert.ok(propStore.size <= 35, 'Sau dọn định kỳ phải giảm sâu dưới 35/50, thực tế: ' + propStore.size);
for (const keep of ['GEMINI_API_KEY', 'GEMINI_KEYS_GITHUB', 'GITHUB_TOKEN', 'DUNG_VIDEO_SECRET', 'BO_NAO_VIDEO_MOI_NGAY', 'PLAYLIST_Toan_lop_12', 'kd_active1', 'kdm_active2_pro', 'HE_yt_recent']) {
  assert.ok(propStore.has(keep), 'Phải giữ nguyên khóa quan trọng: ' + keep);
}
for (const gone of ['PLI_vid0_PL123', 'HE_yt_old_0', 'kdm_old_0', 'BP0_GIU_DEN', 'NGHI_DEN', 'DA_NANG_CAP_DRIVE_V40', 'KEY_HET_NGAY_GH', 'BO_NAO_DA_BAO_18H', 'BO_NAO_DON_CU_NGAY', 'DA_SINH_10P_NGAY', 'MODEL_CHAN_403', 'ZALO_TT261120-101010-1', 'TMP_RUN_OLD', 'THONG_KE_2026-11-20']) {
  assert.equal(propStore.has(gone), false, 'Phải xóa sạch khóa rác/quá hạn: ' + gone);
}

// Kiểm chứng BoPhan2.gs doPost xử lý mp4_bi_chan (không tải MP4 lên Drive, vẫn đẩy Auto-Heal)
const blockedPostRow = archiveRow('MP4-CHAN-1', { trang_thai: 'DANG_DUNG', lan_giao: 'lg-chan', file_kich_ban: '{"canh":[]}', ai_kiem_tra: '{}' });
const postTab = mockRichTab([cells[0].slice(), blockedPostRow], 'HANG_DOI');
tabs.set('HANG_DOI', postTab);
propStore.set('DUNG_VIDEO_SECRET', 'sec-123');
const healDrafts = [];
Object.assign(app, {
  luuNhapKichBan_: (id, kb) => { healDrafts.push({ id, kb }); return true; },
  ContentService: { createTextOutput: s => ({ text: s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) }
});
const resChan = app.doPost({
  parameter: {},
  postData: {
    contents: JSON.stringify({
      token: 'sec-123', id: 'MP4-CHAN-1', lan_giao: 'lg-chan', ok: false, mp4_bi_chan: true,
      file_id: '', anh_3x3: 'grid-id-1',
      mat_than: { dat: false, chay: true, loi: [{ o: 3, loai: 'cat_chu', mo_ta: 'tràn chữ', nang: true }], ly_do: 'ô 3 cắt chữ' }
    })
  }
});
assert.equal(JSON.parse(resChan.text).tu_sua, true, 'MP4 bị chặn trên runner vẫn đẩy Auto-Heal về BP2');
assert.equal(JSON.parse(resChan.text).mp4_bi_chan, true);
assert.equal(postTab.getDataRange().getValues()[1][col('trang_thai')], 'CHO_KICH_BAN');

// Kiểm chứng Đợt 3:
// (1) Trần sửa thống nhất TRAN_SUA_BP2 = 1, TRAN_SUA_BP3 = 1 trên BoPhan1 / NangCao / BoNaoDieuPhoi
assert.equal(app.TRAN_SUA_BP2, 1);
assert.equal(app.TRAN_SUA_BP3, 1);
assert.equal(app.TRAN_TU_SUA_, 1);
assert.equal(app.TRAN_BO_CUC_, 1);
assert.equal(app.BO_NAO_.thuLai, 1);
assert.equal(app.soLanSuaKichBanYC_(), 1);
assert.equal(app.soLanSuaYeuCau_(), 1);
assert.equal(app.MAC_DINH.SO_LAN_SUA_KICH_BAN, '1');
assert.equal(app.MAC_DINH_NC_.SO_LAN_SUA_YEU_CAU, '1');
assert.equal(app.MAC_DINH_NC_.SO_LAN_SUA_KICH_BAN_YC, '1');

// (2) BP0 sinh theo lô 2–3 đề/lượt khi hàng đợi nóng < 4–6 & quỹ key >= 25%, tuyệt đối không tính CHO_DANG hay CHO_DUYET
const hangChiChoDangVaChoDuyet = [
  ...Array.from({ length: 12 }, (_, i) => ({ id: 'CD-' + i, trang_thai: 'CHO_DANG', duyet: 'DA_DUYET' })),
  ...Array.from({ length: 15 }, (_, i) => ({ id: 'CH-' + i, trang_thai: 'CO_VIDEO', duyet: 'CHO' })),
  { id: 'HOT-1', trang_thai: 'MOI', de_bai: 'Đề nóng 1' },
];
assert.equal(app.tonBoNao_(hangChiChoDangVaChoDuyet), 1, 'CHO_DANG và CHO_DUYET không tính vào phanh tồn nóng');
assert.equal(app.tinhSoDeLoBP0_(hangChiChoDangVaChoDuyet, { tyLe: 0.3 }), 3, 'Hàng nóng 1/4, key >= 25% -> sinh lô 3 đề');
assert.equal(app.tinhSoDeLoBP0_(hangChiChoDangVaChoDuyet, { tyLe: 0.2 }), 0, 'Quỹ key < 25% -> 0 đề');
const tmpLo = fs.mkdtempSync(path.join(os.tmpdir(), 'bp0-lo-'));
try {
  const raLo = path.join(tmpLo, 'lo.json');
  const dlLo = {
    so_luong: 3,
    cau_hinh: { CHE_DO_NGUON: 'SANG_TAC', VIDEO_10P_MOI_NGAY: 'TAT', LOP_HINH_PHANG: '9', SO_DE_MOI_MOI_LAN: '2' },
    props: {},
    gan_day: [],
  };
  const rLo = spawnSync(process.execPath, [path.join(root, 'scripts', 'bophan1', 'sinh_de_gh.js')], {
    env: { ...process.env, BP0_GIA_LAP: '1', SD_MON: 'XEN_KE', SD_DU_LIEU: JSON.stringify(dlLo), SD_RA: raLo },
    encoding: 'utf8',
  });
  assert.equal(rLo.status, 0, rLo.stderr);
  const kqLo = JSON.parse(fs.readFileSync(raLo, 'utf8'));
  assert.equal(kqLo.ok, true);
  assert.equal(kqLo.de.length, 3, 'BP0 sinh đủ lô 3 đề trong 1 lần mở runner');
  const soMangKhacNhau = new Set(kqLo.de.map(x => `${x.mon}|${String(x.nguon || '').includes('KHONG_GIAN') ? 'KG' : String(x.nguon || '').includes('PHANG') ? 'HP' : ''}`)).size;
  assert.ok(soMangKhacNhau >= 3, 'Lô 3 đề xoay đều các mảng còn thiếu qua chonMang_');
} finally { fs.rmSync(tmpLo, { recursive: true, force: true }); }

// (3) Tự xả kho CHỜ BẠN DUYỆT: >=90% & 0 lỗi cứng -> CHO_DANG; >72h không có /sua -> Top 5 Zalo + lưu trữ LuuTru_ChoDuyet
const nowXa = Date.now();
const cu80h = new Date(nowXa - 80 * 3600e3);
const moi10h = new Date(nowXa - 10 * 3600e3);
const xaHangData = [
  cells[0].slice(),
  archiveRow('XA-AUTO90', { trang_thai: 'CO_VIDEO', duyet: 'CHO', file_video: 'vid-auto90', cap_nhat: cu80h, ai_kiem_tra: JSON.stringify({ phan_tram: 92, chi_tiet: { dap_an: 9 } }) }),
  archiveRow('XA-72H-1', { trang_thai: 'CO_VIDEO', duyet: 'CHO', file_video: 'vid-1', chu_de: 'Bài 1', cap_nhat: cu80h, ai_kiem_tra: JSON.stringify({ phan_tram: 84 }) }),
  archiveRow('XA-72H-2', { trang_thai: 'CO_VIDEO', duyet: 'CHO', file_video: 'vid-2', chu_de: 'Bài 2', cap_nhat: cu80h, ai_kiem_tra: JSON.stringify({ phan_tram: 82 }) }),
  archiveRow('XA-72H-3', { trang_thai: 'CO_VIDEO', duyet: 'CHO', file_video: 'vid-3', chu_de: 'Bài 3', cap_nhat: cu80h, ai_kiem_tra: JSON.stringify({ phan_tram: 80 }) }),
  archiveRow('XA-72H-4', { trang_thai: 'CO_VIDEO', duyet: 'CHO', file_video: 'vid-4', chu_de: 'Bài 4', cap_nhat: cu80h, ai_kiem_tra: JSON.stringify({ phan_tram: 78 }) }),
  archiveRow('XA-72H-5', { trang_thai: 'CO_VIDEO', duyet: 'CHO', file_video: 'vid-5', chu_de: 'Bài 5', cap_nhat: cu80h, ai_kiem_tra: JSON.stringify({ phan_tram: 76 }) }),
  archiveRow('XA-72H-6', { trang_thai: 'CO_VIDEO', duyet: 'CHO', file_video: 'vid-6', chu_de: 'Bài 6', cap_nhat: cu80h, ai_kiem_tra: JSON.stringify({ phan_tram: 70 }) }),
  archiveRow('XA-COSUA', { trang_thai: 'CO_VIDEO', duyet: 'CHO', file_video: 'vid-sua', gop_y: 'Sửa lại bước 2', cap_nhat: cu80h, ai_kiem_tra: JSON.stringify({ phan_tram: 75 }) }),
  archiveRow('XA-MOI', { trang_thai: 'CO_VIDEO', duyet: 'CHO', file_video: 'vid-moi', cap_nhat: moi10h, ai_kiem_tra: JSON.stringify({ phan_tram: 80 }) }),
];
const xaTab = mockRichTab(xaHangData, 'HANG_DOI');
tabs.set('HANG_DOI', xaTab);
tabs.delete('LuuTru_ChoDuyet');
const zaloXa = [];
app.guiZaloMotLan_ = (_k, msg) => zaloXa.push(msg);
const kqXa = app.xaKhoChoDuyet_(xaTab, { now: nowXa });
assert.equal(kqXa.tuDuyet, 1, 'Bài >=90% & 0 lỗi cứng tự chuyển thẳng CHO_DANG');
assert.equal(kqXa.guiTop5, 5, 'Gửi đúng Top 5 bài quá hạn 72h qua Zalo');
assert.equal(kqXa.luuTru, 6, 'Đẩy toàn bộ 6 bài quá hạn 72h (không có /sua) vào LuuTru_ChoDuyet');
assert.deepEqual(Array.from(kqXa.top5), ['XA-72H-1', 'XA-72H-2', 'XA-72H-3', 'XA-72H-4', 'XA-72H-5']);
assert.equal(xaHangData.find(r => r[0] === 'XA-AUTO90')[1], 'CHO_DANG');
assert.equal(xaHangData.some(r => r[0] === 'XA-COSUA'), true, 'Bài có lệnh /sua không bị đẩy lưu trữ');
assert.equal(xaHangData.some(r => r[0] === 'XA-MOI'), true, 'Bài mới <72h giữ nguyên');
assert.equal(xaHangData.some(r => String(r[0]).startsWith('XA-72H-')), false, 'Bài quá 72h đã xóa khỏi bảng nóng');
assert.equal(tabs.get('LuuTru_ChoDuyet').getLastRow(), 7, '6 bài + 1 dòng tiêu đề trong LuuTru_ChoDuyet');
assert.match(zaloXa.at(-1), /Top 5 bài cần quyết định/);

// (4) Cửa 3 gộp trong BoPhan2.gs doPost: nhận ai_hau_kiem đạt >=90% -> chuyển thẳng CHO_DANG, không gọi BP4 lần 2
const cua3Row = archiveRow('CUA3-PASS', { trang_thai: 'DANG_DUNG', lan_giao: 'lg-c3', file_kich_ban: '{"canh":[]}', ai_kiem_tra: '{}' });
const cua3Tab = mockRichTab([cells[0].slice(), cua3Row], 'HANG_DOI');
tabs.set('HANG_DOI', cua3Tab);
const resCua3 = app.doPost({
  parameter: {},
  postData: {
    contents: JSON.stringify({
      token: 'sec-123', id: 'CUA3-PASS', lan_giao: 'lg-c3', ok: true, file_id: 'vid-cua3-ok',
      anh_kt: 'kt-1', anh_3x3: 'grid-c3',
      kiem_tra_mp4: { dat: true, ly_do: '' },
      mat_than: { dat: true, chay: true, loi: [] },
      ai_hau_kiem: { dat: true, phan_tram: 94, diem: 9.4, loi_nang: false, nang: [], chi_tiet: { dap_an: 10, bo_cuc: 9 }, van_de: [], gop_y: '' },
    }),
  },
});
const bodyCua3 = JSON.parse(resCua3.text);
assert.equal(bodyCua3.cua_3_da_cham, true);
assert.equal(bodyCua3.dat, true);
assert.equal(cua3Tab.getDataRange().getValues()[1][col('trang_thai')], 'CHO_DANG', 'Cửa 3 đạt chuyển thẳng CHO_DANG không gọi BP4 lần 2');

// (5) Báo cáo Zalo 21:00 tách 3 dòng: BP1, BP2 lần đầu, Lỗi hạ tầng (Drive / GitHub Actions) — không gộp Drive vào lỗi sản xuất
const nkBaoCao = [
  ['thoi_gian', 'muc', 'noi_dung'],
  [new Date(), 'GIAI_OK', 'TT1 giải xong'],
  [new Date(), 'GIAI_OK', 'TT2 giải xong'],
  [new Date(), 'GIAI_LOI', 'TT3 sai đáp án'],
  [new Date(), 'DON_VIDEO_LOI', 'file123: Access denied'],
  [new Date(), 'GITHUB_BI_CHAN', 'GitHub HTTP 503'],
  [new Date(), 'MAT_THAN', 'TT4 chặn: cat_chu'],
];
tabs.set('NHAT_KY', {
  getLastRow: () => nkBaoCao.length,
  getLastColumn: () => 3,
  getRange: () => ({ getValues: () => nkBaoCao.slice(1) }),
});
tabs.set('HANG_DOI', mockRichTab([
  cells[0].slice(),
  archiveRow('BC-1', { trang_thai: 'CO_VIDEO', duyet: 'DA_DUYET', file_video: 'v1', cap_nhat: new Date(), ai_kiem_tra: '{}' }),
], 'HANG_DOI'));
app.khoDanhSachKey_ = () => [];
const bcZalo = app.taoBaoCaoSucKhoe_();
assert.match(bcZalo, /1\) Ty le dau BP1: 67% \(2\/3\)/);
assert.match(bcZalo, /2\) Ty le dau BP2 lan dau: 100% \(1\/1\)/);
assert.match(bcZalo, /3\) Loi ha tang \(Drive \/ GitHub Actions\): 2 \(Drive: 1 \| GitHub Actions: 1\)/);
assert.ok(!/TOP 3 LOI HOM NAY:.*DON_VIDEO_LOI/.test(bcZalo), 'Không gộp lỗi Drive vào Top 3 lỗi sản xuất video');

console.log('0 hỏng. Đạt điều phối BP5 → BP0, 3 cửa chuẩn, trần sửa thống nhất (=1), sinh lô BP0, xả kho 72h, báo cáo 3 dòng tách hạ tầng, dọn MP4, xử lý lỗi DOC_DE (/xulyloi), Script Properties >35/50, watchdog, checkout Python và đăng ký/cú pháp '+gs.length+' tệp .gs.');
