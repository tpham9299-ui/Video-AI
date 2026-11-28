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
// Ngừng gọi DriveApp.setTrashed lên tệp MP4 từ Apps Script (chuyển hoàn toàn sang rclone trên GitHub Actions).
assert.equal(app.duaMp4LoiVaoThungRac_(videoId),true);
assert.equal(app.duaMp4LoiVaoThungRac_('id-missing'),true);
assert.deepEqual(trashed,[]);
files.set('no-access',{getName(){throw Error('Access denied');}});
assert.equal(app.duaMp4LoiVaoThungRac_('no-access'),true);
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
const driveDispatches=[];
app.guiWorkflowGitHub_=(inputs,wf)=>{ driveDispatches.push({wf,inputs}); return {ok:true}; };
assert.match(app.donSachVideoLoiDriveNgay(),/Đã chuyển 1 dòng DOC_DE sang LuuTru_Loi.*đánh dấu 1 file MP4 lỗi chờ rclone dọn.*Đã giữ 2 dòng/);
// Apps Script tuyệt đối không gọi DriveApp.setTrashed lên bất kỳ tệp MP4 nào; thay vào đó giao don-video-drive.yml (rclone).
assert.equal(formulaFile.removed,false);
assert.ok(rejectedFiles.every(f=>!f.removed));
assert.ok(protectedFiles.concat(nonMp4).every(f=>!f.removed));
assert.equal(docData.some(r=>r[0]==='DOC-LOI'),false);
assert.equal(docData.some(r=>r[0]==='SHARED' && r[4].includes('file-protected')),true);
assert.equal(docData.some(r=>r[0]==='SHARED-NAME' && r[4].includes('good-index-only')),true);
const errorArchive=tabs.get('LuuTru_Loi');
assert.equal(errorArchive.getRange(3,1).getValue(),'DOC-LOI');
assert.match(errorArchive.getRange(3,col('file_video')+1).getValue(),/^\[Chờ rclone dọn MP4 - \d\d\/\d\d\]$/);
assert.equal(app.docMaBamLuuTru_()[app.bam_('bài lỗi công thức')],true);
assert.equal(driveDispatches.at(-1).wf,'don-video-drive.yml');
assert.equal(driveDispatches.at(-1).inputs.che_do,'loi');
assert.equal(driveDispatches.at(-1).inputs.dry_run,'false');
const payloadDon1=JSON.parse(driveDispatches.at(-1).inputs.du_lieu);
assert.ok(payloadDon1.tap_id_bao_ve.includes('CHO-NOW') && payloadDon1.tap_id_bao_ve.includes('POSTED-ID'));
assert.ok(payloadDon1.tap_id_loi.includes('DOC-LOI') && payloadDon1.tap_id_loi.includes('OLD-LOI'));
assert.ok(!payloadDon1.tap_id_loi.includes('CHO-NOW') && !payloadDon1.tap_id_loi.includes('POSTED-ID'));
assert.match(app.donSachVideoLoiDriveNgay(),/Đã chuyển 0 dòng DOC_DE sang LuuTru_Loi.*đánh dấu 0 file MP4 lỗi/);

// A new BP4 failure archives the exact version without calling DriveApp.setTrashed on MP4. A stale callback cannot reject a passing version.
const bp4=mp4('bp4-new');
hotData.push(archiveRow('BP4-NEW',{trang_thai:'DANG_KIEM_DUYET',file_video:'bp4-new',cap_nhat:new Date()}));
app.boDeKhongDat_(hot,app.docHang_(hot).find(r=>r.id==='BP4-NEW'),'t2_trong: '+ 'mô tả dài '.repeat(100),'video');
assert.equal(bp4.removed,false,'boDeKhongDat_ không gọi DriveApp.setTrashed lên MP4 (chờ rclone dọn)');
assert.equal(hotData.some(r=>r[0]==='BP4-NEW'),false);
assert.equal(errorArchive.getRange(4,col('ghi_chu')+1).getValue(),'BO_KHONG_DAT (video): t2_trong');
assert.match(errorArchive.getRange(4,col('file_video')+1).getValue(),/^\[Chờ rclone dọn MP4 - /);
hotData.push(archiveRow('PASS-BP4',{trang_thai:'CHO_DANG',file_video:'still-good',cap_nhat:new Date()}));
const passBp4=mp4('still-good');
app.boDeKhongDat_(hot,app.docHang_(hot).find(r=>r.id==='PASS-BP4'),'het_luot','video');
assert.equal(passBp4.removed,false);
assert.equal(hotData.find(r=>r[0]==='PASS-BP4')[1],'CHO_DANG');

// Kiểm chứng 3 lệnh Zalo /donvideoloi thu | /donvideoloi | /donvideoloi mocoi đẩy đúng che_do & dry_run sang don-video-drive.yml.
driveDispatches.length=0;
assert.match(app.traLoiLenh_('chat-test','/donvideoloi thu'),/CHẠY THỬ \(dry_run=true/);
assert.equal(driveDispatches.at(-1).wf,'don-video-drive.yml');
assert.equal(driveDispatches.at(-1).inputs.che_do,'mocoi');
assert.equal(driveDispatches.at(-1).inputs.dry_run,'true');
assert.equal(driveDispatches.at(-1).inputs.chat_id,'chat-test');

assert.match(app.traLoiLenh_('chat-test','/donvideoloi'),/dọn MP4 lỗi/);
assert.equal(driveDispatches.at(-1).inputs.che_do,'loi');
assert.equal(driveDispatches.at(-1).inputs.dry_run,'false');

assert.match(app.traLoiLenh_('chat-test','/donvideoloi mocoi'),/dọn tổng MP4 lỗi \+ mồ côi > 24h/);
assert.equal(driveDispatches.at(-1).inputs.che_do,'mocoi');
assert.equal(driveDispatches.at(-1).inputs.dry_run,'false');

// Kiểm chứng fallback ghi JSON tạm lên Drive khi payload > 55KB & dừng an toàn khi tap_id_bao_ve rỗng.
const bigTabs=new Map([['LUU_TRU',mockTab([['ma_bam','id','lop','de_bai_rut_gon','dap_an','ket_qua','ngay_xong'],
  ...Array.from({length:2800},(_,i)=>['h'+i,'TT261127-10'+String(i).padStart(4,'0')+'-1','12','','','DA_DANG',new Date()])],'LUU_TRU')]]);
const origGetBook=app.SpreadsheetApp.getActiveSpreadsheet;
app.SpreadsheetApp.getActiveSpreadsheet=()=>({getSheetByName:n=>bigTabs.get(n),getSheets:()=>Array.from(bigTabs.values())});
driveDispatches.length=0;
const uploadsBefore=uploads.length;
const kqBig=app.kichHoatDonVideoDriveGitHub_('mocoi',false,'chat-big','zalo');
assert.equal(kqBig.ok,true);
assert.equal(uploads.length,uploadsBefore+1,'payload > 55KB ghi tệp JSON tạm trên Drive');
assert.equal(JSON.parse(driveDispatches.at(-1).inputs.du_lieu)._file_du_lieu_drive,'drive-id');

// Khi Whitelist rỗng (= 0 phần tử) -> Apps Script cũng dừng an toàn, không gọi GitHub Actions.
app.SpreadsheetApp.getActiveSpreadsheet=()=>({getSheetByName:()=>null,getSheets:()=>[]});
driveDispatches.length=0;
const kqRongGs=app.kichHoatDonVideoDriveGitHub_('mocoi',false,'chat-empty','zalo');
assert.equal(kqRongGs.dung_an_toan,true);
assert.equal(driveDispatches.length,0);
app.SpreadsheetApp.getActiveSpreadsheet=origGetBook;

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

// Kiểm tra Whitelist + Default-Delete + TTL 24h (phanLoaiDongLoiMacDinh_ & phanLoaiLoiDong_).
assert.deepEqual(Array.from(app.TRANG_THAI_SONG_HOP_LE),
  ['MOI', 'CHO_GIAI', 'DA_GIAI', 'CHO_KICH_BAN', 'CO_KICH_BAN', 'DANG_DUNG', 'CO_VIDEO', 'CHO_KIEM_DUYET', 'CHO_DUYET', 'CHO_DANG', 'DA_DANG']);
assert.deepEqual(Array.from(app.LOI_HA_TANG_TAM_THOI),
  ['timeout', '429', '502', '503', '504', 'rate limit', 'het_key', 'ECONNRESET', 'ETIMEDOUT', 'network']);

// (a) Ca lỗi lạ chưa từng định nghĩa: trạng thái lạ LOI_LA_MOI_999 hoặc LOI_CAN_XEM với ghi chú Traceback lạ -> mặc định XOA_KHONG_SUA_DUOC + laLoiLa=true + [LOI_LA]
const plLoiLaStatus = app.phanLoaiDongLoiMacDinh_('LOI_LA_MOI_999', 'lỗi hệ thống chưa từng thấy', 0, 2);
assert.equal(plLoiLaStatus.hanhDong, 'XOA_KHONG_SUA_DUOC');
assert.equal(plLoiLaStatus.laLoiLa, true);
assert.equal(plLoiLaStatus.tienToGhiChu, '[LOI_LA]');

const plLoiLaTrace = app.phanLoaiDongLoiMacDinh_('LOI_CAN_XEM', 'Traceback: ZeroDivisionError ở module lạ', 0, 2);
assert.equal(plLoiLaTrace.hanhDong, 'XOA_KHONG_SUA_DUOC');
assert.equal(plLoiLaTrace.laLoiLa, true);
assert.equal(plLoiLaTrace.tienToGhiChu, '[LOI_LA]');

// (b) Ca lỗi đã biết (BO_KHONG_DAT, LOAI, AI_SAI_TOAN...) -> XOA_KHONG_SUA_DUOC nhưng không đánh dấu laLoiLa
assert.equal(app.phanLoaiDongLoiMacDinh_('BO_KHONG_DAT', 'bất kỳ', 0, 1).hanhDong, 'XOA_KHONG_SUA_DUOC');
assert.equal(app.phanLoaiDongLoiMacDinh_('BO_KHONG_DAT', 'bất kỳ', 0, 1).laLoiLa, false);
assert.equal(app.phanLoaiDongLoiMacDinh_('LOAI', 'lệch đáp án', 0, 1).hanhDong, 'XOA_KHONG_SUA_DUOC');
for (const kw of ['BO_KHONG_DAT', 'sửa 3 lần vẫn lỗi', 'Mắt thần 3+3', 'het_luot', 'AI_SAI_TOAN', 'DE_SAI', 'TRUNG_DE']) {
  assert.equal(app.phanLoaiDongLoiMacDinh_('LOI_CAN_XEM', kw, 0, 1).hanhDong, 'XOA_KHONG_SUA_DUOC', 'từ khóa không sửa được: ' + kw);
}

// (c) Ca lỗi hạ tầng tạm (timeout, 429, 503, het_key...) lần đầu -> BAT_BUOC_SUA ([TU_SUA:1/1]); lần 2 vẫn lỗi -> tự hạ cấp XOA_KHONG_SUA_DUOC
const plTimeout1 = app.phanLoaiDongLoiMacDinh_('LOI_CAN_XEM', 'timeout tại BP1', 0, 1);
assert.equal(plTimeout1.hanhDong, 'BAT_BUOC_SUA');
assert.equal(plTimeout1.trangThaiDich, 'CHO_GIAI');
assert.equal(plTimeout1.tienToGhiChu, '[TU_SUA:1/1]');
const plTimeout2 = app.phanLoaiDongLoiMacDinh_('LOI_CAN_XEM', '[TU_SUA:1/1] Ly do cu: timeout tại BP1', 1, 2);
assert.equal(plTimeout2.hanhDong, 'XOA_KHONG_SUA_DUOC');

const pl429Lan1 = app.phanLoaiDongLoiMacDinh_('LOI_CAN_XEM', 'Gemini HTTP 429 rate limit', 0, 1, { coKichBanJson: true });
assert.equal(pl429Lan1.hanhDong, 'BAT_BUOC_SUA');
assert.equal(pl429Lan1.trangThaiDich, 'CO_KICH_BAN');
assert.equal(pl429Lan1.tranSua, 1);
assert.equal(app.phanLoaiDongLoiMacDinh_('LOI_CAN_XEM', '[TU_SUA:1/1] Ly do cu: HTTP 429', 1, 2, { coKichBanJson: true }).hanhDong, 'XOA_KHONG_SUA_DUOC');
assert.equal(app.phanLoaiDongLoiMacDinh_('LOI_CAN_XEM', 'DUNG_VIDEO: 503', 0, 50, { coKichBanJson: true, quaHan48h: true }).hanhDong, 'XOA_KHONG_SUA_DUOC');

// (d) Ca bài treo im lặng ở DANG_DUNG quá 24 giờ không có run đang chạy -> lần 1 trả hàng đợi, lần 2 tự xóa ([LOI_LA_TREO_24H]); có run đang chạy -> GIU_NGUYEN
assert.equal(app.phanLoaiDongLoiMacDinh_('DANG_DUNG', '', 0, 20, { dangChayWorkflow: false }).hanhDong, 'GIU_NGUYEN', 'Dưới 24h giữ nguyên');
assert.equal(app.phanLoaiDongLoiMacDinh_('DANG_DUNG', '', 0, 30, { dangChayWorkflow: true }).hanhDong, 'GIU_NGUYEN', 'Đang có workflow GitHub chạy thì giữ nguyên');
const plTreo1 = app.phanLoaiDongLoiMacDinh_('DANG_DUNG', '', 0, 26, { coKichBanJson: true, dangChayWorkflow: false });
assert.equal(plTreo1.hanhDong, 'BAT_BUOC_SUA');
assert.equal(plTreo1.trangThaiDich, 'CO_KICH_BAN');
assert.equal(plTreo1.laTreo24h, true);
assert.equal(plTreo1.tienToGhiChu, '[TU_SUA:1/1]');
const plTreo2 = app.phanLoaiDongLoiMacDinh_('DANG_DUNG', '[TU_SUA:1/1] Ly do cu: Treo > 24h ở DANG_DUNG', 1, 26, { coKichBanJson: true, dangChayWorkflow: false });
assert.equal(plTreo2.hanhDong, 'XOA_KHONG_SUA_DUOC');
assert.equal(plTreo2.laLoiLa, true);
assert.equal(plTreo2.laTreo24h, true);
assert.equal(plTreo2.tienToGhiChu, '[LOI_LA_TREO_24H]');

// Tích hợp thực tế trên DOC_DE + HANG_DOI qua xuLyLoiDocDe_() / xuLyLoiTrenSheetNgay():
// - Ca lỗi lạ (LOI_LA_MOI_999 & LOI_CAN_XEM Traceback ZeroDivisionError) -> gắn [LOI_LA], xóa JSON Apps Script, KHÔNG gọi setTrashed lên MP4, đưa sang LuuTru_Loi + LUU_TRU, xóa khỏi DOC_DE
// - Ca lỗi hạ tầng tạm (timeout, 429) lần 1 -> đẩy sửa [TU_SUA:1/1]; lần 2 -> xóa sạch
// - Ca bài treo im lặng ở DANG_DUNG > 24h không có run -> lần 1 trả về CO_KICH_BAN, lần 2 xóa với [LOI_LA_TREO_24H]
// - Ca bảo vệ DA_DANG & CHO_DANG tuyệt đối không bị đụng tới
const nowLoi = Date.now();
const cu26h = new Date(nowLoi - 26 * 3600e3);
const moi2h = new Date(nowLoi - 2 * 3600e3);

const caHaTangJson = jsonFile('ca-ht-json', 'CA-HT-503.json');
const caHaTangMp4 = mp4('ca-ht-mp4', 'CA-HT-503.mp4');
const caLoiLa1Json = jsonFile('ca-ll1-json', 'CA-LOILA-999.json');
const caLoiLa1Mp4 = mp4('ca-ll1-mp4', 'CA-LOILA-999.mp4');
const caLoiLa2Json = jsonFile('ca-ll2-json', 'CA-TRACE.json');
const caLoiLa2Mp4 = mp4('ca-ll2-mp4', 'CA-TRACE.mp4');
const caTreo1Json = jsonFile('ca-treo1-json', 'CA-TREO-1.json');
const caTreo2Json = jsonFile('ca-treo2-json', 'CA-TREO-2.json');
const caTreo2Mp4 = mp4('ca-treo2-mp4', 'CA-TREO-2.mp4');
const caHetLuot429Json = jsonFile('ca-429-json', 'CA-429-LAN2.json');
const caDaDangMp4 = mp4('ca-dd-mp4', 'CA-DADANG.mp4');
const caChoDangMp4 = mp4('ca-cd-mp4', 'CA-CHODANG.mp4');

const docLoiHeader = ['Mã', 'Trạng thái', 'Lớp', 'Chủ đề', 'ĐỀ BÀI', 'Đáp án', 'Tư duy', 'Vì sao cần suy nghĩ', 'Bẫy thường gặp', 'Kịch bản', 'Ghi chú', 'Ngày cập nhật'];
const docLoiRows = [
  ['Thống kê cũ (⚠️ 5 lỗi)'],
  docLoiHeader,
  ['CA-HT-503', 'LOI_CAN_XEM', '12', 'Tối ưu', 'Đề lỗi 503 lần 1', '5', '8', '', '',
    richText('▶️ Mở file', null, [
      ['▶️ Mở file', 'https://drive.google.com/file/d/ca-ht-json/view'],
      ['🎬 Xem video', 'https://drive.google.com/file/d/ca-ht-mp4/view']
    ]),
    'DUNG_VIDEO: HTTP 503', moi2h],
  ['CA-HT-TIMEOUT', 'LOI_CAN_XEM', '12', 'Xác suất', 'Đề timeout BP1 lần 1', '', '8', '', '', '', 'timeout tại BP1', moi2h],
  ['CA-429-LAN2', 'LOI_CAN_XEM', '12', 'Xác suất', 'Đề 429 lần 2 hết lượt', '3/4', '8', '', '',
    richText('▶️ Mở file', 'https://drive.google.com/file/d/ca-429-json/view'),
    '[TU_SUA:1/1] Ly do cu: HTTP 429', moi2h],
  ['CA-LOILA-999', 'LOI_LA_MOI_999', '11', 'Hình học', 'Đề trạng thái lỗi lạ', '12', '9', '', '',
    richText('▶️ Mở file', null, [
      ['▶️ Mở file', 'https://drive.google.com/file/d/ca-ll1-json/view'],
      ['🎬 Xem video', 'https://drive.google.com/file/d/ca-ll1-mp4/view']
    ]),
    'Lỗi chưa từng khai báo', moi2h],
  ['CA-TRACE', 'LOI_CAN_XEM', '12', 'Thực tế', 'Đề traceback lạ', '10', '8', '', '',
    richText('▶️ Mở file', null, [
      ['▶️ Mở file', 'https://drive.google.com/file/d/ca-ll2-json/view'],
      ['🎬 Xem video', 'https://drive.google.com/file/d/ca-ll2-mp4/view']
    ]),
    'Traceback: ZeroDivisionError ở module lạ', moi2h],
  ['CA-TREO-1', 'DANG_DUNG', '12', 'Tối ưu', 'Đề treo 26h lần 1', '9', '8', '', '',
    richText('▶️ Mở file', 'https://drive.google.com/file/d/ca-treo1-json/view'), '', cu26h],
  ['CA-TREO-2', 'DANG_DUNG', '12', 'Tối ưu', 'Đề treo 26h lần 2', '9', '8', '', '',
    richText('▶️ Mở file', null, [
      ['▶️ Mở file', 'https://drive.google.com/file/d/ca-treo2-json/view'],
      ['🎬 Xem video', 'https://drive.google.com/file/d/ca-treo2-mp4/view']
    ]),
    '[TU_SUA:1/1] Ly do cu: Treo > 24h ở DANG_DUNG', cu26h],
  ['CA-DADANG', 'DA_DANG', '12', 'Đã đăng', 'Đề đã đăng', '7', '9', '', '',
    richText('🎬 Xem video', 'https://drive.google.com/file/d/ca-dd-mp4/view'), '', cu26h],
  ['CA-CHODANG', 'CHO_DANG', '12', 'Chờ đăng', 'Đề chờ đăng', '8', '9', '', '',
    richText('🎬 Xem video', 'https://drive.google.com/file/d/ca-cd-mp4/view'), '', cu26h]
];
const docLoiTab = mockRichTab(docLoiRows, 'DOC_DE');
const hangLoiData = [cells[0].slice(),
  archiveRow('CA-HT-503', { trang_thai: 'LOI_CAN_XEM', file_video: 'ca-ht-mp4', file_kich_ban: 'DRIVE_JSON:ca-ht-json', cap_nhat: moi2h }),
  archiveRow('CA-429-LAN2', { trang_thai: 'LOI_CAN_XEM', file_kich_ban: 'DRIVE_JSON:ca-429-json', cap_nhat: moi2h }),
  archiveRow('CA-LOILA-999', { trang_thai: 'LOI_LA_MOI_999', file_video: 'ca-ll1-mp4', file_kich_ban: 'DRIVE_JSON:ca-ll1-json', cap_nhat: moi2h }),
  archiveRow('CA-TRACE', { trang_thai: 'LOI_CAN_XEM', file_video: 'ca-ll2-mp4', file_kich_ban: 'DRIVE_JSON:ca-ll2-json', cap_nhat: moi2h }),
  archiveRow('CA-TREO-1', { trang_thai: 'DANG_DUNG', file_kich_ban: 'DRIVE_JSON:ca-treo1-json', cap_nhat: cu26h }),
  archiveRow('CA-TREO-2', { trang_thai: 'DANG_DUNG', file_video: 'ca-treo2-mp4', file_kich_ban: 'DRIVE_JSON:ca-treo2-json', ghi_chu: '[TU_SUA:1/1] Ly do cu: Treo > 24h ở DANG_DUNG', cap_nhat: cu26h }),
  archiveRow('CA-DADANG', { trang_thai: 'DA_DANG', file_video: 'ca-dd-mp4', cap_nhat: cu26h }),
  archiveRow('CA-CHODANG', { trang_thai: 'CHO_DANG', file_video: 'ca-cd-mp4', cap_nhat: cu26h })
];
const hangLoiTab = mockRichTab(hangLoiData, 'HANG_DOI');
const luuTruLoiMoi = mockRichTab([], 'LuuTru_Loi');
const chiMucMoi = mockRichTab([['ma_bam', 'id', 'lop', 'de_bai_rut_gon', 'dap_an', 'ket_qua', 'ngay_xong']], 'LUU_TRU');
tabs.set('DOC_DE', docLoiTab);
tabs.set('HANG_DOI', hangLoiTab);
tabs.set('LuuTru_Loi', luuTruLoiMoi);
tabs.set('LUU_TRU', chiMucMoi);
app.runsDangBoNao_ = () => []; // không có workflow GitHub nào đang chạy cho CA-TREO-1 / CA-TREO-2

const tomTatLoi = app.xuLyLoiTrenSheetNgay();
assert.match(tomTatLoi, /Đẩy sửa lại: 3 bài \(BP1: 1, BP2: 0, BP3: 2\)/);
assert.match(tomTatLoi, /Đã xóa không sửa được: 4 bài \(lỗi lạ: 3\)/);

// Lỗi hạ tầng tạm lần 1 -> đẩy sửa [TU_SUA:1/1], giữ JSON, KHÔNG gọi DriveApp.setTrashed lên MP4
const rHt503 = docLoiRows.find(r => r[0] === 'CA-HT-503');
assert.equal(rHt503[1], 'CO_KICH_BAN');
assert.match(rHt503[10], /^\[TU_SUA:1\/1\] Ly do cu: DUNG_VIDEO: HTTP 503/);
assert.equal(caHaTangJson.removed, false, 'Giữ JSON kịch bản khi đẩy về CO_KICH_BAN');
assert.equal(caHaTangMp4.removed, false, 'Apps Script KHÔNG gọi DriveApp.setTrashed lên MP4');
const rHtTimeout = docLoiRows.find(r => r[0] === 'CA-HT-TIMEOUT');
assert.equal(rHtTimeout[1], 'CHO_GIAI');
assert.match(rHtTimeout[10], /^\[TU_SUA:1\/1\] Ly do cu: timeout tại BP1/);

// Lỗi hạ tầng lần 2 (CA-429-LAN2) -> xóa sạch khỏi DOC_DE + HANG_DOI, xóa JSON, lưu LuuTru_Loi + LUU_TRU
assert.equal(docLoiRows.some(r => r[0] === 'CA-429-LAN2'), false);
assert.equal(hangLoiData.some(r => r[0] === 'CA-429-LAN2'), false);
assert.equal(caHetLuot429Json.removed, true);

// 2 ca lỗi lạ (LOI_LA_MOI_999 & Traceback ZeroDivisionError) -> xóa khỏi DOC_DE + HANG_DOI, gắn [LOI_LA] trong LuuTru_Loi, xóa JSON Apps Script, KHÔNG đụng MP4
const ltLoiVals = luuTruLoiMoi.getDataRange().getValues();
const cmVals = chiMucMoi.getDataRange().getValues();
for (const idLa of ['CA-LOILA-999', 'CA-TRACE']) {
  assert.equal(docLoiRows.some(r => r[0] === idLa), false, idLa + ' bị xóa khỏi DOC_DE');
  assert.equal(hangLoiData.some(r => r[0] === idLa), false, idLa + ' bị xóa khỏi HANG_DOI');
  const dongLt = ltLoiVals.find(r => r[0] === idLa);
  assert.ok(dongLt, idLa + ' được lưu vào LuuTru_Loi');
  assert.match(String(dongLt[col('ghi_chu')]), /^\[LOI_LA\]/, idLa + ' gắn tiền tố [LOI_LA]');
  assert.equal(cmVals.some(r => r[1] === idLa && r[5] === 'LOI_KHONG_SUA_DUOC'), true, idLa + ' ghi mã băm vào LUU_TRU');
}
assert.equal(caLoiLa1Json.removed, true, 'Xóa kịch bản JSON của lỗi lạ');
assert.equal(caLoiLa2Json.removed, true, 'Xóa kịch bản JSON của lỗi lạ');
assert.equal(caLoiLa1Mp4.removed, false, 'Không gọi DriveApp.setTrashed lên MP4 lỗi lạ (chờ rclone dọn)');
assert.equal(caLoiLa2Mp4.removed, false, 'Không gọi DriveApp.setTrashed lên MP4 lỗi lạ (chờ rclone dọn)');

// Ca treo im lặng DANG_DUNG > 24h: lần 1 trả CO_KICH_BAN + [TU_SUA:1/1]; lần 2 xóa hẳn + gắn [LOI_LA_TREO_24H]
const rTreo1 = docLoiRows.find(r => r[0] === 'CA-TREO-1');
assert.equal(rTreo1[1], 'CO_KICH_BAN', 'Treo 24h lần 1 trả về hàng đợi CO_KICH_BAN');
assert.match(rTreo1[10], /^\[TU_SUA:1\/1\]/);
assert.equal(caTreo1Json.removed, false);
assert.equal(docLoiRows.some(r => r[0] === 'CA-TREO-2'), false, 'Treo 24h lần 2 xóa hẳn khỏi DOC_DE');
assert.equal(hangLoiData.some(r => r[0] === 'CA-TREO-2'), false, 'Treo 24h lần 2 xóa hẳn khỏi HANG_DOI');
assert.equal(caTreo2Json.removed, true);
assert.equal(caTreo2Mp4.removed, false);
const dongTreo2 = ltLoiVals.find(r => r[0] === 'CA-TREO-2');
assert.ok(dongTreo2);
assert.match(String(dongTreo2[col('ghi_chu')]), /^\[LOI_LA_TREO_24H\]/);

// Bảo vệ tuyệt đối DA_DANG và CHO_DANG + cập nhật thanh thống kê hàng 1
assert.equal(caDaDangMp4.removed, false);
assert.equal(caChoDangMp4.removed, false);
assert.equal(docLoiRows.some(r => r[0] === 'CA-DADANG'), true);
assert.equal(docLoiRows.some(r => r[0] === 'CA-CHODANG'), true);
assert.match(String(docLoiRows[0][0]), /Tổng 5 đề.*⚠️ 0 lỗi/, 'Thanh thống kê hàng 1 cập nhật ngay lập tức');

// Kiểm chứng lệnh Zalo /xulyloi và /donvideoloi thu|mocoi qua nhanZalo_.
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
driveDispatches.length = 0;
app.nhanZalo_({ parameter: { k: 'sec-loi' }, postData: { contents: JSON.stringify({ message: { text: '/donvideoloi thu', message_id: 'm-dv-1', chat: { id: 'chat-loi' } } }) } });
assert.equal(driveDispatches.at(-1).wf, 'don-video-drive.yml');
assert.equal(driveDispatches.at(-1).inputs.che_do, 'mocoi');
assert.equal(driveDispatches.at(-1).inputs.dry_run, 'true');

// Kiểm tra tách tác vụ nặng khỏi nhịp 5 phút: nhipBoNao_('chay') KHÔNG chạy xuLyLoiDocDe_;
// còn xuLyLoiDocDe_ tự kiểm soát trần toiDaSua (0 khi key < 25%, 3 khi key >= 25%) cho lỗi hạ tầng tạm.
const nhipDocRows = [
  ['Thống kê'], docLoiHeader,
  ['NB-S1', 'LOI_CAN_XEM', '12', 'T', 'Đề s1', '1', '8', '', '', '', 'timeout tại BP1', moi2h],
  ['NB-S2', 'LOI_CAN_XEM', '12', 'T', 'Đề s2', '2', '8', '', '', '', '429 rate limit tại BP1', moi2h],
  ['NB-S3', 'LOI_CAN_XEM', '12', 'T', 'Đề s3', '3', '8', '', '', '', 'network error tại BP1', moi2h],
  ['NB-S4', 'LOI_CAN_XEM', '12', 'T', 'Đề s4', '4', '8', '', '', '', '504 tại BP1', moi2h],
  ['NB-X1', 'LOI_CAN_XEM', '12', 'T', 'Đề x1', '5', '8', '', '', '', 'AI_SAI_TOAN', moi2h]
];
tabs.set('DOC_DE', mockRichTab(nhipDocRows, 'DOC_DE'));
tabs.set('HANG_DOI', mockRichTab([cells[0].slice()], 'HANG_DOI'));
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
assert.equal(nhipDocRows.slice(2).filter(r => r[1] === 'CHO_GIAI').length, 0, 'toiDaSua=0 không đẩy sửa');
app.xuLyLoiDocDe_({ chayTay: false, toiDaSua: 3 });
assert.equal(nhipDocRows.slice(2).filter(r => r[1] === 'CHO_GIAI').length, 3, 'Mỗi lượt dọn đẩy sửa tối đa 3 bài lỗi hạ tầng tạm');
assert.equal(nhipDocRows.slice(2).filter(r => r[1] === 'LOI_CAN_XEM').length, 1, 'Bài thứ 4 chờ lượt sau');

// Kiểm chứng lịch dọn đêm 02:30 VN (chayDonDepHotSheetTheoLich) tự kích hoạt don-video-drive.yml (mocoi, dry_run=false).
driveDispatches.length = 0;
tabs.set('DOC_DE', mockRichTab([['Thống kê'], docLoiHeader, ['LIVE-1', 'DA_DANG', '12', 'T', 'Đề sống', '1', '8', '', '', '', '', moi2h]], 'DOC_DE'));
app.chayDonDepHotSheetTheoLich();
assert.equal(driveDispatches.some(d => d.wf === 'don-video-drive.yml' && d.inputs.che_do === 'mocoi' && d.inputs.dry_run === 'false' && d.inputs.nguon === 'lich_dem'), true,
  'Lịch đêm 02:30 gọi don-video-drive.yml với che_do=mocoi, dry_run=false');

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
// Phiên 1/3: phanh BP0 (lyDoChanBoNao_) và cỡ lô (tinhSoDeLoBP0_) dùng CHUNG một ngưỡng hàng nóng 4–6
{
  const cauHinhCu = app.cauHinh_, dangNghiCu = app.dangNghi_;
  app.dangNghi_ = () => false;
  app.cauHinh_ = (k) => (k === 'NGUONG_HANG_DOI_NONG' ? '6' : '');
  assert.equal(app.nguongNongBP0_(), 6, 'NGUONG_HANG_DOI_NONG=6 -> ngưỡng 6');
  assert.equal(app.lyDoChanBoNao_(0, 5, 0, false), '', 'ngưỡng 6: tồn nóng 5 chưa phanh BP0');
  assert.equal(app.lyDoChanBoNao_(0, 6, 0, false), 'tồn 6/6', 'ngưỡng 6: tồn nóng 6 -> phanh');
  const hang5 = Array.from({ length: 5 }, (_, i) => ({ id: 'N-' + i, trang_thai: 'MOI', de_bai: 'x' }));
  assert.equal(app.tinhSoDeLoBP0_(hang5, { tyLe: 0.5 }), 2, 'ngưỡng 6, tồn 5 -> lô tối thiểu 2 đề');
  app.cauHinh_ = (k) => (k === 'NGUONG_HANG_DOI_NONG' ? '99' : '');
  assert.equal(app.nguongNongBP0_(), 6, 'ngưỡng kẹp tối đa 6');
  app.cauHinh_ = () => '';
  assert.equal(app.nguongNongBP0_(), 4, 'mặc định ngưỡng 4');
  assert.equal(app.lyDoChanBoNao_(0, 4, 0, false), 'tồn 4/4', 'mặc định: tồn nóng 4 -> phanh');
  const hangLoi = [{ id: 'L-1', trang_thai: 'LOI' }, { id: 'L-2', trang_thai: 'LOI_CAN_XEM' }, { id: 'D-1', trang_thai: 'CO_VIDEO', duyet: 'CHO' }];
  assert.equal(app.tonBoNao_(hangLoi), 0, 'LOI_CAN_XEM / CHO_DUYET không tính vào phanh BP0');
  app.cauHinh_ = cauHinhCu;
  app.dangNghi_ = dangNghiCu;
}
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

// (5) Báo cáo Zalo 21:00 tách 3 dòng + thêm 1 dòng tóm tắt "Lỗi lạ mới tự dọn hôm nay" (tối đa 3 mẫu [LOI_LA])
const nkBaoCao = [
  ['thoi_gian', 'muc', 'noi_dung'],
  [new Date(), 'GIAI_OK', 'TT1 giải xong'],
  [new Date(), 'GIAI_OK', 'TT2 giải xong'],
  [new Date(), 'GIAI_LOI', 'TT3 sai đáp án'],
  [new Date(), 'DON_VIDEO_LOI', 'file123: Access denied'],
  [new Date(), 'GITHUB_BI_CHAN', 'GitHub HTTP 503'],
  [new Date(), 'MAT_THAN', 'TT4 chặn: cat_chu'],
  [new Date(), 'LOI_LA', 'TT-LA1: [LOI_LA] Traceback: ZeroDivisionError'],
  [new Date(), 'LOI_LA', 'TT-LA2: [LOI_LA] LOI_LA_MOI_999'],
  [new Date(), 'LOI_LA', 'TT-LA3: [LOI_LA_TREO_24H] Treo > 24h ở DANG_DUNG'],
  [new Date(), 'LOI_LA', 'TT-LA4: [LOI_LA] Mẫu thứ 4 không vượt quá 3 mẫu hiển thị'],
];
tabs.set('NHAT_KY', {
  getLastRow: () => nkBaoCao.length,
  getLastColumn: () => 3,
  getRange: () => ({ getValues: () => nkBaoCao.slice(1) }),
});
tabs.set('LuuTru_Loi', mockRichTab([cells[0].slice()], 'LuuTru_Loi'));
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
assert.match(bcZalo, /Lỗi lạ mới tự dọn hôm nay: 4 \(\[LOI_LA\] Traceback: ZeroDivisionError \| \[LOI_LA\] LOI_LA_MOI_999 \| \[LOI_LA_TREO_24H\]/);
assert.ok(!/Mẫu thứ 4/.test(bcZalo), 'Chỉ gom tối đa 3 mẫu chuỗi [LOI_LA] ngắn');

// (6) Webhook BoPhan2.gs doPost tiếp nhận báo cáo từ don-video-drive.yml (loai='bao_cao_don_drive')
const donDriveReplies = [];
app.guiZaloToi_ = (cid, msg) => donDriveReplies.push([cid, msg]);
const resDonDrive = app.doPost({
  parameter: {},
  postData: {
    contents: JSON.stringify({
      token: 'sec-123',
      loai: 'bao_cao_don_drive',
      chat_id: 'chat-don',
      bao_cao: '🧹 DỌN VIDEO DRIVE THÙNG RÁC: đã đưa 3 tệp vào Thùng rác.',
    }),
  },
});
assert.equal(JSON.parse(resDonDrive.text).ok, true);
assert.deepEqual(donDriveReplies.at(-1), ['chat-don', '🧹 DỌN VIDEO DRIVE THÙNG RÁC: đã đưa 3 tệp vào Thùng rác.']);

console.log('0 hỏng. Đạt điều phối BP5 → BP0, Whitelist + Default-Delete + TTL 24h, dọn Drive bằng rclone (don-video-drive.yml), 3 cửa chuẩn, trần sửa thống nhất (=1), sinh lô BP0, xả kho 72h, báo cáo 3 dòng + lỗi lạ, Script Properties >35/50, watchdog, checkout Python và đăng ký/cú pháp '+gs.length+' tệp .gs.');
