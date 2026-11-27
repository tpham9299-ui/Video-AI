// HANG_DOI lưu trạng thái chuẩn. docHang_ dịch về tên cũ cho các bộ giải, bảng đọc và lịch đăng.
var BO_NAO_ = {
  cheDo: 'TU_DONG_TOAN_PHAN', ton: 4, thuLai: 2,
  workflow: ['sinh-de.yml', 'bo-phan-1.yml', 'viet-kich-ban.yml', 'dung-video.yml', 'kiem-tra-video.yml', 'dang-video.yml'],
  cho: ['', 'CHO_GIAI', 'CHO_KICH_BAN', 'CHO_DUNG', 'CHO_KIEM_DUYET', 'CHO_DANG'],
  dang: ['', 'DANG_GIAI', 'DANG_KICH_BAN', 'DANG_DUNG', 'DANG_KIEM_DUYET', 'DANG_DANG'],
  gioiHan: [1, 2, 2, 2, 1, 1], phut: [20, 15, 15, 40, 20, 20]
};
var SO_NGAY_BAI_CU = 3;
var NGUONG_KEY_DON_CU = 0.4;
var GIOI_HAN_DON_CU_NGAY = 5;
var BAT_CHE_DO_KHO_DEM = true;
var MUC_TIEU_KHO_DEM = 7;
var NGUONG_THUC_DAY_KHO_DEM = 5;
var CHI_TIEU_VIDEO_MOI_NGAY = 3;
var NGUONG_KEY_TOI_THIEU_SAN_XUAT = 0.25;
var PHUT_NHIP_BO_NAO_ = 5;
var MUI_GIO_BO_NAO_ = 'Asia/Ho_Chi_Minh';
var MOT_NGAY_MS_ = 86400000;

function lucTaoBoNao_(r) {
  var m = /^[A-Za-z]{2}(\d{2})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(?:-|$)/.exec(String(r.id));
  var tao = m ? Date.UTC(2000 + +m[1], +m[2] - 1, +m[3], +m[4] - 7, +m[5], +m[6]) : NaN;
  return new Date(r.ngay_tao || tao || r.cap_nhat || NaN);
}

function baiCuBoNao_(r) {
  return Date.now() - lucTaoBoNao_(r).getTime() >= SO_NGAY_BAI_CU * MOT_NGAY_MS_;
}

function dangChoSanXuatBoNao_(r) {
  return r.id && (r.tu_sua_cho || r.trang_thai === 'CHO_DOC' ||
    (r.trang_thai === 'LOI_TAM' && Number(r.bp_thu_lai) >= 1 && Number(r.bp_thu_lai) <= 4) ||
    (BO_NAO_.cho.slice(1, 5).indexOf(trangThaiBoNao_(r)) >= 0 && (trangThaiBoNao_(r) !== 'CHO_KIEM_DUYET' || r.duyet === 'CHO_AI')));
}

function trangThaiDonBaiCu_(hang) {
  if (hang.some(function (x) { return dangChoSanXuatBoNao_(x) && !baiCuBoNao_(x); })) return {chan: 'còn bài mới chờ'};
  var p = PropertiesService.getScriptProperties();
  var ngay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var so = {};
  try { so = JSON.parse(p.getProperty('BO_NAO_DON_CU_NGAY') || '{}') || {}; } catch (e) {}
  var ids = so.ngay === ngay && Array.isArray(so.ids) ? so.ids : [];
  try {
    if (!(khoThongKeKhaDung_().tyLe >= NGUONG_KEY_DON_CU)) return {chan: 'quỹ key dưới ' + (NGUONG_KEY_DON_CU * 100) + '%'};
  } catch (e) { return {chan: 'chưa đọc được quỹ key'}; }
  return {p: p, ngay: ngay, ids: ids};
}

// Gọi dưới khóa chung để một bài qua BP4 và Auto-Heal chỉ chiếm một suất trong ngày.
function lyDoDonBaiCu_(hang, r, giuCho, dem) {
  if (!baiCuBoNao_(r)) return '';
  dem = dem || trangThaiDonBaiCu_(hang);
  if (dem.chan) return dem.chan;
  var daGiu = dem.ids.indexOf(String(r.id)) >= 0;
  if (!daGiu && dem.ids.length >= GIOI_HAN_DON_CU_NGAY) return 'đã đủ ' + GIOI_HAN_DON_CU_NGAY + ' bài cũ/ngày';
  if (giuCho && !daGiu) {
    dem.ids.push(String(r.id));
    dem.p.setProperty('BO_NAO_DON_CU_NGAY', JSON.stringify({ngay: dem.ngay, ids: dem.ids}));
  }
  return '';
}

function demVideoMoiTrongNgay_(luc, ghi) {
  var ngay = Utilities.formatDate(luc || new Date(), MUI_GIO_BO_NAO_, 'yyyyMMdd');
  var p = PropertiesService.getScriptProperties();
  var cu = {};
  try { cu = JSON.parse(p.getProperty('BO_NAO_VIDEO_MOI_NGAY') || '{}') || {}; } catch (e) {}
  var ids = new Set(cu.ngay === ngay && Array.isArray(cu.ids) ? cu.ids : []);
  // Webhook BP3 chỉ ghi DUNG_VIDEO khi nhận một MP4 hoàn thành. cap_nhat thay đổi cả khi duyệt và đăng.
  var nk = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NHAT_KY');
  if (nk) nk.getDataRange().getValues().forEach(function (dong) {
    if (dong[1] !== 'DUNG_VIDEO' || !(dong[0] instanceof Date) ||
        Utilities.formatDate(dong[0], MUI_GIO_BO_NAO_, 'yyyyMMdd') !== ngay) return;
    var m = /^(.+?) -> xong, file \S/.exec(String(dong[2]));
    if (m) ids.add(m[1]);
  });
  if (ghi && !(cu.ngay > ngay) && (cu.ngay !== ngay || !Array.isArray(cu.ids) || cu.ids.length !== ids.size))
    p.setProperty('BO_NAO_VIDEO_MOI_NGAY', JSON.stringify({ngay: ngay, ids: Array.from(ids)}));
  return ids.size;
}

function docQuyKeyBoNao_() {
  try { return khoThongKeKhaDung_(); }
  catch (e) { return null; }
}

function tinhKhoDemBoNao_(hang, ghi, soVideoMoi, key) {
  var p = PropertiesService.getScriptProperties();
  var so = hang.filter(function (r) {
    return r.id && (r._trang_thai_sheet || r.trang_thai) === 'CHO_DANG';
  }).length;
  var cu = p.getProperty('BO_NAO_NGU_DONG') === '1';
  var nguTheoKho = BAT_CHE_DO_KHO_DEM && (so >= MUC_TIEU_KHO_DEM || (cu && so > NGUONG_THUC_DAY_KHO_DEM));
  if (ghi && cu !== nguTheoKho) {
    if (nguTheoKho) p.setProperty('BO_NAO_NGU_DONG', '1');
    else p.deleteProperty('BO_NAO_NGU_DONG');
  }
  var thieu = Math.max(0, CHI_TIEU_VIDEO_MOI_NGAY - soVideoMoi);
  var canLam = thieu > 0 && !!key && key.tyLe >= NGUONG_KEY_TOI_THIEU_SAN_XUAT;
  return {so: so, ngu: nguTheoKho && !canLam, nguTheoKho: nguTheoKho, thieu: thieu, canLam: canLam};
}

function trangThaiBoNao_(r) {
  var t = r.trang_thai;
  if (t === 'MOI') return 'CHO_GIAI';
  if (t === 'DA_GIAI') return 'CHO_KICH_BAN';
  if (t === 'GITHUB') return (/\|DA_GIAI\b/.test(r.ghi_chu) || (!/\|MOI\b/.test(r.ghi_chu) && r.dap_an)) ? 'DANG_KICH_BAN' : 'DANG_GIAI';
  if (t === 'CO_KICH_BAN') return 'CHO_DUNG';
  if (t === 'CO_VIDEO') {
    if (r.duyet === 'DA_DUYET') return 'CHO_DANG';
    if (r.duyet === 'AI_XEM') return 'DANG_KIEM_DUYET';
    return 'CHO_KIEM_DUYET';
  }
  return t === 'LOI' ? 'LOI_CAN_XEM' : t;
}

function docTrangThaiCu_(r) {
  var cu = {CHO_GIAI:'MOI', CHO_KICH_BAN:'DA_GIAI', CHO_DUNG:'CO_KICH_BAN',
    DANG_GIAI:'GITHUB', DANG_KICH_BAN:'GITHUB', CHO_KIEM_DUYET:'CO_VIDEO',
    DANG_KIEM_DUYET:'CO_VIDEO', CHO_DANG:'CO_VIDEO'};
  var t = r.trang_thai;
  if (viecTaiChoBoNao_ && viecTaiChoBoNao_.dangLam && r.id === viecTaiChoBoNao_.id &&
      r.lan_giao === viecTaiChoBoNao_.lan && t === BO_NAO_.dang[viecTaiChoBoNao_.bp]) t = BO_NAO_.cho[viecTaiChoBoNao_.bp];
  r.trang_thai = cu[t] || t;
  if ((t === 'DANG_GIAI' || t === 'DANG_KICH_BAN') && !/^GITHUB\|/.test(r.ghi_chu))
    r.ghi_chu = 'GITHUB|' + new Date(r.cap_nhat).getTime() + '|' + (t === 'DANG_GIAI' ? 'MOI' : 'DA_GIAI');
  if (t === 'CHO_DANG') r.duyet = 'DA_DUYET';
  if (t === 'DANG_KIEM_DUYET') r.duyet = 'AI_XEM';
  if (t === 'CHO_KIEM_DUYET' && !r.duyet) r.duyet = 'CHO_AI';
}

function chuanBiGhiTrangThai_(sh, row, fields) {
  var f = Object.assign({}, fields);
  if (f.duyet !== undefined || f.trang_thai === 'CO_VIDEO') {
    var values = sh.getRange(row, 1, 1, COT.length).getValues()[0];
    var r = {trang_thai: values[1], duyet: values[COT.indexOf('duyet')]};
    docTrangThaiCu_(r);
    f.trang_thai = trangThaiBoNao_(Object.assign(r, f));
  } else if (f.trang_thai) f.trang_thai = trangThaiBoNao_(f);
  return f;
}

var LICH_BO_NAO_CU_ = ['chayBoPhan1','chayGiaiDe','chayVietKichBan','chayBoPhan2','chayDangVideo','chayLichDangDinhKy','kiemTraDangSauDuyet','chayKiemTraVideo'];

function caiLichBoNao_() {
  var triggers = ScriptApp.getProjectTriggers();
  if (!triggers.some(function(t) { return t.getHandlerFunction() === 'chayBoNaoDieuPhoi'; }))
    ScriptApp.newTrigger('chayBoNaoDieuPhoi').timeBased().everyMinutes(PHUT_NHIP_BO_NAO_).create();
  triggers.forEach(function(t) { if (LICH_BO_NAO_CU_.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
}

function caiDatLichTuDongChuan() {
  return voiKhoa_(5000, function () {
    var cu = ScriptApp.getProjectTriggers();
    var nhip = ScriptApp.newTrigger('chayBoNaoDieuPhoi').timeBased().everyMinutes(PHUT_NHIP_BO_NAO_).create();
    try {
      ScriptApp.newTrigger('chayDonDepHotSheetTheoLich').timeBased().inTimezone(MUI_GIO_BO_NAO_)
        .atHour(2).everyDays(1).create();
    } catch (e) {
      ScriptApp.deleteTrigger(nhip);
      throw e;
    }
    var thayThe = LICH_BO_NAO_CU_.concat(['chayBoNaoDieuPhoi', 'chayDonDepHotSheetTheoLich', 'donDepHotSheetDinhKy', 'chayDonDep']);
    cu.forEach(function (t) { if (thayThe.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
    return 'Đã cài điều phối mỗi ' + PHUT_NHIP_BO_NAO_ + ' phút và dọn Hot Sheet hằng ngày từ 02:00 đến 03:00 giờ VN.';
  }) || 'Hệ thống đang bận, hãy chạy lại caiDatLichTuDongChuan().';
}

function chayDonDepHotSheetTheoLich() {
  // Trigger truyền sự kiện, còn hàm dọn nhận hạn chót dạng số. Gọi mặc định để giữ giới hạn thời gian.
  return donDepHotSheetDinhKy();
}

function yeuCauRuns_(bp, query, page) {
  var p = PropertiesService.getScriptProperties();
  var repo = p.getProperty('GITHUB_REPO');
  var token = p.getProperty('GITHUB_TOKEN');
  if (!repo || !token) throw new Error('Thiếu GITHUB_REPO hoặc GITHUB_TOKEN');
  return {
    url: 'https://api.github.com/repos/' + repo + '/actions/workflows/' + BO_NAO_.workflow[bp] +
      '/runs?per_page=100&page=' + page + '&' + query,
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    muteHttpExceptions: true
  };
}

function docRunsBoNao_(bp, query, firstResponse) {
  var runs = [];
  for (var page = 1; page <= 10; page++) {
    var res = page === 1 && firstResponse;
    if (!res) {
      var req = yeuCauRuns_(bp, query, page);
      res = UrlFetchApp.fetch(req.url, {headers:req.headers, muteHttpExceptions:true});
    }
    if (res.getResponseCode() !== 200) throw new Error('GitHub ' + BO_NAO_.workflow[bp] + ' HTTP ' + res.getResponseCode());
    var body = JSON.parse(res.getContentText());
    if (!Array.isArray(body.workflow_runs)) throw new Error('GitHub thiếu workflow_runs');
    runs = runs.concat(body.workflow_runs);
    if (runs.length >= body.total_count || body.workflow_runs.length < 100) return runs;
  }
  throw new Error('GitHub giới hạn phân trang');
}

function runsDangBoNao_(bp) {
  var queries = ['queued','in_progress','pending','waiting','requested'].map(function(status) { return 'status=' + status; });
  var responses = UrlFetchApp.fetchAll(queries.map(function(q) { return yeuCauRuns_(bp,q,1); }));
  return queries.reduce(function(all,q,i) { return all.concat(docRunsBoNao_(bp,q,responses[i])); }, []);
}

function runCuaBai_(run, id) {
  return String(run.display_title || '').trim().split(/\s+/).pop() === String(id);
}

function tonBoNao_(hang) {
  return hang.filter(function(r) {
    return r.id && ['CHO_GIAI', 'CHO_KICH_BAN', 'CHO_DUNG', 'DANG_DUNG'].indexOf(trangThaiBoNao_(r)) >= 0;
  }).length;
}

function demDangSanXuatBoNao_(hang) {
  return hang.filter(function(r) {
    var t = trangThaiBoNao_(r);
    return r.id && (BO_NAO_.cho.slice(1, 4).indexOf(t) >= 0 || BO_NAO_.dang.slice(1, 4).indexOf(t) >= 0 ||
      (t === 'LOI_TAM' && Number(r.bp_thu_lai) >= 1 && Number(r.bp_thu_lai) <= 3));
  }).length;
}

function thuLaiBoNao_(sh, r, bp, lyDo, tam) {
  var n = Number(r.bp_thu_lai) === bp ? Number(r.so_lan_thu_lai) || 0 : 0;
  var het = n >= BO_NAO_.thuLai;
  var f = {trang_thai: het ? 'LOI_CAN_XEM' : tam ? 'LOI_TAM' : BO_NAO_.cho[bp],
    bp_thu_lai: bp, so_lan_thu_lai: het ? n : n+1, ghi_chu: lyDo, lan_giao: ''};
  if (bp === 4) f.duyet = 'CHO_AI';
  if (bp === 5) giaiPhongGiuKhung_(r.id);
  ghi_(sh, r._row, f, r.id);
  if (het) guiZaloMotLan_('XAKET_' + bp + '_' + r.id, r.id + ' BP' + bp + ' hết 2 lượt thử lại. ' + lyDo);
}

function xaZombieBoNao_(sh, bp, hang, runs) {
  var dem = 0;
  hang.forEach(function(r) {
    if (!bp || trangThaiBoNao_(r) !== BO_NAO_.dang[bp]) return;
    // repository_dispatch đời cũ chỉ hiện số run trong tiêu đề, chưa thể loại trừ bài này.
    if (bp === 3 && runs.some(function(run) {
      return run.event === 'repository_dispatch' && /\s\d+$/.test(run.display_title);
    })) return;
    var moc = new Date(r.cap_nhat || 0).getTime();
    if (Date.now() - moc < BO_NAO_.phut[bp]*60000 || runs.some(function(run) { return runCuaBai_(run, r.id); })) return;
    // Upload YouTube của Apps Script có thể vẫn chạy sau callback BP5.
    if (bp === 5 && (docKetQuaDang_(r).youtube || {}).cho_apps_script) { henDangYouTubeCho_(5); return; }
    var luc = moc || Date.now();
    var cuaSo = new Date(luc-600000).toISOString() + '..' + new Date(luc+600000).toISOString();
    var last = docRunsBoNao_(bp, 'status=completed&created=' + encodeURIComponent(cuaSo))
      .find(function(run) { return runCuaBai_(run,r.id); });
    thuLaiBoNao_(sh, r, bp, 'Quá ' + BO_NAO_.phut[bp] + ' phút, thiếu callback. ' + (last ? last.html_url : 'GitHub chưa ghi nhận run cho lượt này'), false);
    dem++;
  });
  return dem;
}

function duyetKichBanBoNao_(id) {
  return voiKhoa_(5000,function() {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var r = docHang_(sh).find(function(x) { return x.id === id && trangThaiBoNao_(x) === 'CHO_DUNG'; });
    if (!r || !r.file_kich_ban) return 'Không tìm thấy kịch bản chờ dựng ' + id;
    ghi_(sh,r._row,{duyet_kich_ban:r.file_kich_ban},r.id);
    return 'Đã duyệt kịch bản ' + id;
  }) || 'Đang bận, thử lại';
}

function cheDoBoNao_() {
  return String(cauHinh_('CHE_DO_VAN_HANH')).trim().toUpperCase() === 'DUYET_TAY_SAU_BP2'
    ? 'DUYET_TAY_SAU_BP2' : BO_NAO_.cheDo;
}

function lyDoChanBoNao_(bp, ton, soRun, dangNgay) {
  if (String(cauHinh_('BAT_BP' + bp) || 'BAT').toUpperCase() === 'TAT') return 'BAT_BP' + bp + '=TAT';
  if (soRun >= BO_NAO_.gioiHan[bp]) return 'đủ ' + BO_NAO_.gioiHan[bp] + ' slot';
  if (!bp && ton >= BO_NAO_.ton) return 'tồn ' + ton + '/' + BO_NAO_.ton;
  if (bp <= 2 && dangNghi_()) return 'đang nghỉ hạn mức Gemini';
  if (bp === 5 && !dangNgay && chDang_('DANG_TU_DONG').toUpperCase() !== 'BAT') return 'DANG_TU_DONG=TAT';
  if (bp === 4 && chNC_('TU_KIEM_TRA_VIDEO').toUpperCase() === 'TAT') return 'TU_KIEM_TRA_VIDEO=TAT';
  if (!bp && cauHinh_('CHE_DO_NGUON') === 'KHO_DE') return 'nguồn KHO_DE';
  return '';
}

// Một việc Gemini tại chỗ mỗi nhịp. Giữ chỗ trên Sheet rồi nhả khóa trước khi gọi AI.
var viecTaiChoBoNao_ = null;
function lamTaiChoBoNao_(sh, bc) {
  var viec = viecTaiChoBoNao_;
  if (!viec) return;
  viec.dangLam = true;
  try {
    if (viec.bp === 0) sinhDeNeuCan_(sh,bc);
    if (viec.bp === 1) xuLyGiai_(sh,bc,_bat_dau_chay_,false,[viec.id]);
    if (viec.bp === 2) xuLyKichBan_(sh,bc,_bat_dau_chay_,false,[viec.id]);
  } finally {
    viecTaiChoBoNao_ = null;
    if (!viec.bp) PropertiesService.getScriptProperties().deleteProperty('BP0_GIU_DEN');
    else voiKhoa_(5000,function() {
      var r = docHang_(sh).find(function(x) { return x.id === viec.id; });
      if (r && r.lan_giao === viec.lan && trangThaiBoNao_(r) === BO_NAO_.dang[viec.bp])
        ghi_(sh,r._row,{trang_thai:BO_NAO_.cho[viec.bp],ghi_chu:'TAI_CHO: tiếp tục bản nháp'},r.id);
    });
  }
}

function giaoBuocBoNao_(sh, bp, r) {
  var taiCho = bp <= 2 && (!giaiTrenGitHub_() || /^TAI_CHO/.test(r.ghi_chu));
  if (taiCho && viecTaiChoBoNao_) return;
  r.lan_giao = Utilities.getUuid();
  var fields = {trang_thai:BO_NAO_.dang[bp], lan_giao:r.lan_giao};
  var tao = lucTaoBoNao_(r);
  if (!r.ngay_tao && !isNaN(tao.getTime())) fields.ngay_tao = tao;
  if (Number(r.bp_thu_lai) !== bp) { fields.bp_thu_lai = bp; fields.so_lan_thu_lai = 0; }
  if (bp <= 2) fields.ghi_chu = 'GITHUB|' + Date.now() + '|' + r.trang_thai;
  if (bp === 4) fields.duyet = 'AI_XEM';
  ghi_(sh,r._row,fields,r.id);
  SpreadsheetApp.flush();
  if (taiCho) {
    viecTaiChoBoNao_ = {bp:bp,id:r.id,lan:r.lan_giao};
    return;
  }
  if (bp === 5) {
    try { if (!dangVideo_(sh, r)) giaiPhongGiuKhung_(r.id); }
    catch (e) { giaiPhongGiuKhung_(r.id); throw e; }
  } else if (bp === 4) {
    giaoAiXemVideo_(sh,r,r);
  } else if (bp === 3) {
    kichHoatDungVideo_(r);
    ghi_(sh,r._row,{trang_thai:'DANG_DUNG',ghi_chu:''},r.id);
  } else {
    var duLieu = goiDeChoGitHub_(r, bp === 2 ? 'kich_ban' : 'giai');
    if (!duLieu) throw new Error('Dữ liệu vượt giới hạn dispatch');
    var gh = guiWorkflowGitHub_({id:r.id, de:duLieu}, BO_NAO_.workflow[bp]);
    if (!gh.ok) throw new Error(gh.loi);
  }
}

// Dùng cùng hợp đồng sinh-de.yml khi bộ đếm video đạt cũ chặn lượt bù chỉ tiêu.
function giaoSinhDeBuChiTieu_(hang, p) {
  var ch = {}, propsGui = {};
  var chSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_CAU_HINH);
  if (chSh) chSh.getDataRange().getValues().slice(1).forEach(function (r) {
    var k = String(r[0] || '').trim();
    if (k && String(r[1]) !== '' && !/TOKEN|SECRET|KEY|MAT_KHAU|PASS|CLIENT/i.test(k)) ch[k] = String(r[1]).slice(0, 1000);
  });
  ch.NGUONG_HANG_DOI = String(Math.max(BO_NAO_.ton, Number(ch.NGUONG_HANG_DOI) || 0));
  if (Number(ch.TOI_DA_CHO_DUNG_VIDEO) > 0)
    ch.TOI_DA_CHO_DUNG_VIDEO = String(Math.max(BO_NAO_.ton, Number(ch.TOI_DA_CHO_DUNG_VIDEO)));
  var tatCa = p.getProperties();
  Object.keys(tatCa).forEach(function (k) { if (laKhoaDemBP0_(k)) propsGui[k] = tatCa[k]; });
  var duLieu = JSON.stringify({
    lan_giao: p.getProperty('BP0_GIU_DEN'), cau_hinh: ch, props: propsGui,
    gan_day: hang.slice(-40).map(function (r) {
      return {id: r.id, trang_thai: r.trang_thai, chu_de: String(r.chu_de || '').slice(0, 60),
        de_bai: String(r.de_bai || '').slice(0, 120), ma_bam: r.ma_bam || '', mon: r.mon || '', nguon: String(r.nguon || '').slice(0, 60)};
    }),
    ma_bam: Object.keys(docMaBamLuuTru_()).slice(-120).concat(hang.map(function (r) { return r.ma_bam; }).filter(Boolean).slice(-120))
  });
  if (duLieu.length > 60000) throw new Error('Dữ liệu BP0 vượt giới hạn dispatch');
  var gh = guiWorkflowGitHub_({mon: ch.CHU_DE_VIDEO || 'XEN_KE', du_lieu: duLieu}, 'sinh-de.yml');
  if (!gh || !gh.ok) throw new Error(gh ? gh.loi : 'GitHub chưa xác nhận giao BP0');
  nhatKy_('SINH_DE_GH', 'Đã giao Bộ phận 0 (sinh-de.yml) bổ sung đề mới trên GitHub');
}

function buocBoNao_(sh,bp,lenh,tonDau,kho,ketQua) {
  var runs = runsDangBoNao_(bp);
  var hang = docHang_(sh);
  var xa = lenh === 'xem' ? 0 : xaZombieBoNao_(sh,bp,hang,runs);
  if (xa) hang = docHang_(sh);
  var dang = hang.filter(function(r) { return bp && trangThaiBoNao_(r) === BO_NAO_.dang[bp]; });
  var soRun = new Set(runs.map(function(run){return run.id;})).size;
  var giu = dang.filter(function(r) { return !runs.some(function(run){return runCuaBai_(run,r.id);}); }).length;
  var ds = hang.slice().reverse().filter(function(r) {
    return r.id && !r.tu_sua_cho && bp && (trangThaiBoNao_(r) === BO_NAO_.cho[bp] || (r.trang_thai === 'LOI_TAM' && Number(r.bp_thu_lai) === bp));
  });
  if (ketQua) ketQua.coHang = ds.length > 0 || soRun + giu > 0;
  var lyDoTonCu = '', demTonCu;
  var don = ds.filter(function(r) {
    if (runs.some(function(run){return runCuaBai_(run,r.id);})) return false;
    if (bp === 1) return !!r.de_bai;
    if (bp === 3) return r.file_kich_ban && (cheDoBoNao_() === 'TU_DONG_TOAN_PHAN' || r.duyet_kich_ban === r.file_kich_ban);
    if (bp === 4) {
      if (!r.file_video || !r.anh_kt || r.duyet !== 'CHO_AI' || matThanChan_(r)) return false;
      if (baiCuBoNao_(r) && !demTonCu) demTonCu = trangThaiDonBaiCu_(hang);
      var chan = lyDoDonBaiCu_(hang, r, false, demTonCu);
      if (chan) lyDoTonCu = chan;
      return !chan;
    }
    if (bp === 5) return r.file_video && dsNenTangChoVideo_(r).length && daDuyet_(r) && !matThanChan_(r);
    return true;
  });
  var lyDo = lyDoChanBoNao_(bp,Math.max(tonDau,tonBoNao_(hang)),soRun+giu,lenh === 'dang_ngay');
  var p = PropertiesService.getScriptProperties();
  var boSung = false, lyDoNguon = '';
  var sanXuatNgay = lenh === 'san_xuat_ngay';
  if (!bp && !lyDo) {
    var dangLam = demDangSanXuatBoNao_(hang);
    if (sanXuatNgay && dangLam) lyDo = 'BP1–BP3 còn ' + dangLam + ' bài đang xử lý';
    else if (Number(p.getProperty('BP0_GIU_DEN')) > Date.now()) lyDo = 'đã gửi BP0, đang chờ kết quả';
    else if (kho && kho.nguTheoKho && kho.canLam && dangLam >= kho.thieu)
      lyDo = 'BP1–BP3 có ' + dangLam + ' bài đang xử lý, đủ bù ' + kho.thieu + ' video còn thiếu';
    if (!lyDo) {
      boSung = sanXuatNgay || (kho && kho.canLam && dangLam < kho.thieu);
      lyDoNguon = chanNguonBoNao_(hang);
      if (!boSung) lyDo = lyDoNguon;
    }
  }
  if (bp && !lyDo && !don.length) {
    var dau = ds[0];
    if (lyDoTonCu) lyDo = lyDoTonCu;
    else if (!dau) lyDo = 'hết hàng';
    else if (runs.some(function(run){ return runCuaBai_(run,dau.id); })) lyDo = dau.id + ' đã có run';
    else if (bp === 3) lyDo = dau.file_kich_ban ? 'chờ /duyetkb ' + dau.id : dau.id + ' thiếu file_kich_ban';
    else lyDo = dau.id + ' ' + (dau.ghi_chu || (bp === 4 ? 'chờ ảnh/duyệt ' + dau.duyet : 'thiếu đầu vào'));
  }
  if (!lyDo && lenh !== 'xem' && lenh !== 'xa') {
    if (!bp) {
      p.setProperty('BP0_GIU_DEN',String(Date.now()+BO_NAO_.phut[0]*60000));
      try {
        if (boSung && lyDoNguon) giaoSinhDeBuChiTieu_(hang, p);
        else if (!sanXuatNgay && !giaiTrenGitHub_()) {
          if (!viecTaiChoBoNao_) viecTaiChoBoNao_ = {bp:0};
          else lyDo = 'đang xử lý đề tại Apps Script';
        } else if (!sinhDeQuaGitHub_(sh,{})) lyDo = 'đã đủ chỉ tiêu ngày hoặc đủ hàng nguồn';
        if (lyDo) p.deleteProperty('BP0_GIU_DEN');
      } catch (e) {
        if (!e.dispatchIncertain) p.deleteProperty('BP0_GIU_DEN');
        throw e;
      }
    } else {
      don.forEach(function(r) {
        if (r.trang_thai === 'LOI_TAM') { r.trang_thai = BO_NAO_.cho[bp]; docTrangThaiCu_(r); }
      });
      var r = bp === 5 && lenh !== 'dang_ngay' ? chonVideoDang_(don) : don[0];
      if (!r) lyDo = 'chờ lịch/khung đăng';
      else {
        try {
          if (bp === 4) lyDo = lyDoDonBaiCu_(hang, r, true, demTonCu);
          if (!lyDo) giaoBuocBoNao_(sh,bp,r);
        }
        catch (e) {
          if (!e.dispatchIncertain) thuLaiBoNao_(sh,r,bp,String(e.message),true);
          throw e;
        }
      }
    }
  }
  if (!lyDo && bp === 5 && lenh === 'xem' && !chonVideoDang_(don,true)) lyDo = 'chờ lịch/khung đăng ' + chDang_('GIO_DANG');
  if (ketQua) {
    ketQua.lyDo = lyDo;
    ketQua.tienDo = soRun + giu > 0 ? 'đang xử lý' : 'đã giao việc';
  }
  return 'BP'+bp+' tồn '+ds.length+' · GH '+soRun+(xa?' · xả '+xa:'')+(lyDo?' · '+lyDo:'');
}

function lyDoNguDongBoNao_(kho, key) {
  if (!kho.thieu) return 'ngủ đông, đã đạt ' + CHI_TIEU_VIDEO_MOI_NGAY + ' video mới và đủ kho đệm';
  if (!key) return 'ngủ đông, chưa đọc được quỹ key Gemini';
  return 'ngủ đông, quỹ key Gemini ' + key.conSong + '/' + key.tong + ' dưới ' + (NGUONG_KEY_TOI_THIEU_SAN_XUAT * 100) + '%';
}

function baoChuaCoVideoBoNao_(luc, ketQua) {
  if (Number(Utilities.formatDate(luc, MUI_GIO_BO_NAO_, 'HH')) < 18) return;
  var ngay = Utilities.formatDate(luc, MUI_GIO_BO_NAO_, 'yyyyMMdd');
  var p = PropertiesService.getScriptProperties();
  var gui = voiKhoa_(1000, function () {
    if (p.getProperty('BO_NAO_DA_BAO_18H') === ngay || demVideoMoiTrongNgay_(luc, true) !== 0) return false;
    p.setProperty('BO_NAO_DA_BAO_18H', ngay);
    return true;
  });
  if (!gui) return;
  var lyDo = [0, 1, 2, 3].filter(function (bp) {
    return ketQua[bp] && (bp === 0 || ketQua[bp].coHang);
  }).map(function (bp) { return 'BP' + bp + ' ' + (ketQua[bp].lyDo || ketQua[bp].tienDo); });
  guiZalo_('⚠️ Từ 18:00 giờ VN, video mới hôm nay vẫn 0/' + CHI_TIEU_VIDEO_MOI_NGAY + '.\n' + lyDo.join('\n'), 'cao');
}

function kichHoatSanXuatNgay() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  try {
    return voiKhoa_(5000, function () {
      damBaoCot_(sh);
      var ketQua = {};
      buocBoNao_(sh, 0, 'san_xuat_ngay', 0, null, ketQua);
      return ketQua.lyDo ? 'BP0 chưa tạo đề vì ' + ketQua.lyDo + '.' : 'Đã giao BP0 sinh đề ngay.';
    }) || 'Hệ thống đang bận, hãy gửi lại /sanxuatngay.';
  } catch (e) {
    nhatKy_('DIEU_PHOI_LOI', 'BP0 · ' + e.message);
    return 'BP0 chưa tạo đề vì ' + e.message;
  }
}

function nhipBoNao_(lenh, trangThai) {
  _bat_dau_chay_ = Date.now();
  var luc = new Date(_bat_dau_chay_);
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  damBaoCot_(sh);
  var hang = docHang_(sh);
  var tonDau = tonBoNao_(hang);
  var loi = hang.filter(function(r) { return trangThaiBoNao_(r) === 'LOI_CAN_XEM'; });
  var tin = [cheDoBoNao_() + (loi.length ? ' · cần xem ' + loi.length + ' (' + loi[0].id + ': ' + String(loi[0].ghi_chu).slice(0,120) + ')' : '')];
  var soVideoMoi = lenh === 'chay' ? voiKhoa_(1000, function () { return demVideoMoiTrongNgay_(luc, true); }) : null;
  if (soVideoMoi === null) soVideoMoi = demVideoMoiTrongNgay_(luc, false);
  var key = docQuyKeyBoNao_();
  var kho = tinhKhoDemBoNao_(hang, false, soVideoMoi, key);
  var ketQua = {};
  (lenh === 'dang_ngay' ? [5] : [5,4,3,2,1,0]).forEach(function(bp) {
    var buoc = ketQua[bp] = {};
    try {
      var dong = voiKhoa_(5000,function() {
        try {
          if (bp === 5 && lenh !== 'xem' && lenh !== 'xa') {
            // Ghi mốc vào ngủ trước BP5 và xét lại sau khi nhả một video khỏi kho.
            tinhKhoDemBoNao_(docHang_(sh), true, soVideoMoi, key);
            if (typeof cuuVideoDatBP4_ === 'function') cuuVideoDatBP4_(sh);
          }
          if (bp === 4 && lenh === 'chay' && String(cauHinh_('BAT_BP4') || 'BAT').toUpperCase() !== 'TAT' &&
              typeof thuLaiAutoHealCho_ === 'function') thuLaiAutoHealCho_(sh);
          if (bp <= 3 && kho.ngu && lenh !== 'xa') {
            buoc.lyDo = lyDoNguDongBoNao_(kho, key);
            return 'BP' + bp + ' · ngủ đông';
          }
          return buocBoNao_(sh,bp,lenh,tonDau,kho,buoc);
        }
        finally { SpreadsheetApp.flush(); }
      });
      if (!dong) buoc.lyDo = 'khóa đang bận';
      tin.push(dong || 'BP'+bp+' · '+buoc.lyDo);
    } catch (e) { buoc.lyDo = e.message; tin.push('BP'+bp+' · '+e.message); nhatKy_('DIEU_PHOI_LOI',tin[tin.length-1]); }
    if (bp === 5) {
      kho = (lenh === 'xem' || lenh === 'xa' ? null : voiKhoa_(1000,function () {
        return tinhKhoDemBoNao_(docHang_(sh), true, soVideoMoi, key);
      })) || tinhKhoDemBoNao_(docHang_(sh), false, soVideoMoi, key);
    }
  });
  if (trangThai) trangThai.ngu = kho.ngu;
  if (lenh === 'chay' && !soVideoMoi) {
    try { baoChuaCoVideoBoNao_(new Date(), ketQua); }
    catch (eBao) { nhatKy_('DIEU_PHOI_LOI', 'Cảnh báo 18:00 · ' + eBao.message); }
  }
  var dau = ['Video mới hôm nay: ' + soVideoMoi + '/' + CHI_TIEU_VIDEO_MOI_NGAY,
    'Kho đệm CHO_DANG: ' + kho.so + '/' + MUC_TIEU_KHO_DEM + ' (' +
    (kho.ngu ? 'ĐANG NGỦ ĐÔNG' : 'ĐANG SẢN XUẤT') + ')',
    'Quỹ key: ' + (key ? key.conSong + '/' + key.tong : 'chưa đọc được')];
  if (ketQua[0] && ketQua[0].lyDo) dau.push('Lý do BP0 chưa tạo đề: ' + ketQua[0].lyDo);
  dau.push('Tồn cũ chờ dọn: ' + docHang_(sh).filter(function (r) { return dangChoSanXuatBoNao_(r) && baiCuBoNao_(r); }).length + ' bài');
  return dau.concat(tin).join('\n');
}

function chayBoNaoDieuPhoi() {
  // Dọn theo yêu cầu dùng một lượt riêng vì chayDonDep có hạn chót 4,5 phút.
  if (PropertiesService.getScriptProperties().getProperty('DOT_DON_VIDEO_LOI')) return chayDonDep();
  var trangThai = {};
  var tin = nhipBoNao_('chay', trangThai);
  nhatKy_('DIEU_PHOI',tin);
  tuDongDongBoCodeTuGitHub_();
  try { kiemTraHanToken_(); } catch (e) { nhatKy_('GITHUB_TOKEN',e.message); }
  try { if (typeof khoCanhBaoQuyKeyThap_ === 'function') khoCanhBaoQuyKeyThap_(); } catch (eK) { nhatKy_('KEY_THAP_LOI', eK.message); }
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var bc = {moi:0,giai_ok:0,loai:0,kich_ban:0,loi:0};
  if (viecTaiChoBoNao_) lamTaiChoBoNao_(sh,bc);
  try { baoTriNhipBoNao_(); } catch (eDon) { nhatKy_('DON_DEP', eDon.message); }
  if (trangThai.ngu) return tin;
  if (dangNghi_() || !duThoiGian_(_bat_dau_chay_,60000)) return tin;
  var cache = CacheService.getScriptCache();
  var coQuyen = voiKhoa_(1000,function() {
    if (cache.get('DOC_NGUON_BO_NAO')) return false;
    cache.put('DOC_NGUON_BO_NAO','1',360);
    return true;
  });
  if (!coQuyen) return tin;
  try {
    if (coViecSanPham_()) xuLySanPham_(bc,_bat_dau_chay_);
    xuLyDocDe_(sh,bc,_bat_dau_chay_);
    if (String(cauHinh_('TU_SUA_VIDEO_CU_DRIVE') || 'BAT') !== 'TAT' && !coDeUuTien_(docHang_(sh)) && duThoiGian_(_bat_dau_chay_,60000))
      doVaSuaVideoCuTrenDrive_(sh,2);
  } finally { cache.remove('DOC_NGUON_BO_NAO'); }
  return tin;
}

function baoTriNhipBoNao_() {
  if (!duThoiGian_(_bat_dau_chay_, 60000)) return;
  var p = PropertiesService.getScriptProperties();
  var ve = voiKhoa_(1000, function () {
    var cache = CacheService.getScriptCache();
    if (cache.get('BAO_TRI_NHIP_BO_NAO')) return false;
    cache.put('BAO_TRI_NHIP_BO_NAO', '1', 900);
    var canVe = donDaXong_(_bat_dau_chay_ + GIOI_HAN_DON_VIDEO_MS_) > 0 || p.getProperty('CAN_DONG_BO') === '1';
    if (canVe) p.deleteProperty('CAN_DONG_BO');
    if (typeof kiemVaDonScriptProperties_ === 'function') kiemVaDonScriptProperties_();
    return canVe;
  });
  if (ve) dongBoBangDoc();
}
