// HANG_DOI lưu trạng thái chuẩn. docHang_ dịch về tên cũ cho các bộ giải, bảng đọc và lịch đăng.
var BO_NAO_ = {
  cheDo: 'TU_DONG_TOAN_PHAN', ton: 4, thuLai: 2,
  workflow: ['sinh-de.yml', 'bo-phan-1.yml', 'viet-kich-ban.yml', 'dung-video.yml', 'kiem-tra-video.yml', 'dang-video.yml'],
  cho: ['', 'CHO_GIAI', 'CHO_KICH_BAN', 'CHO_DUNG', 'CHO_KIEM_DUYET', 'CHO_DANG'],
  dang: ['', 'DANG_GIAI', 'DANG_KICH_BAN', 'DANG_DUNG', 'DANG_KIEM_DUYET', 'DANG_DANG'],
  gioiHan: [1, 2, 2, 2, 1, 1], phut: [20, 15, 15, 40, 20, 20]
};

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

function caiLichBoNao_() {
  var cu = ['chayBoPhan1','chayGiaiDe','chayVietKichBan','chayBoPhan2','chayDangVideo','chayLichDangDinhKy','kiemTraDangSauDuyet','chayKiemTraVideo'];
  var triggers = ScriptApp.getProjectTriggers();
  if (!triggers.some(function(t) { return t.getHandlerFunction() === 'chayBoNaoDieuPhoi'; }))
    ScriptApp.newTrigger('chayBoNaoDieuPhoi').timeBased().everyMinutes(5).create();
  triggers.forEach(function(t) { if (cu.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
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
  return hang.filter(function(r) { return BO_NAO_.cho.slice(1,4).indexOf(trangThaiBoNao_(r)) >= 0; }).length;
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

function lyDoChanBoNao_(bp, hang, ton, soRun, dangNgay) {
  if (String(cauHinh_('BAT_BP' + bp) || 'BAT').toUpperCase() === 'TAT') return 'BAT_BP' + bp + '=TAT';
  if (soRun >= BO_NAO_.gioiHan[bp]) return 'đủ ' + BO_NAO_.gioiHan[bp] + ' slot';
  if (!bp && ton >= BO_NAO_.ton) return 'tồn ' + ton + '/' + BO_NAO_.ton;
  if (!bp && hang.filter(function(r) { return r.trang_thai === 'LOI_CAN_XEM' && Number(r.bp_thu_lai) === 2; }).length >= BO_NAO_.ton)
    return 'BP2 có ' + BO_NAO_.ton + ' bài cần xem';
  if (bp <= 2 && dangNghi_()) return 'đang nghỉ hạn mức Gemini';
  if (bp === 5 && !dangNgay && chDang_('DANG_TU_DONG').toUpperCase() !== 'BAT') return 'DANG_TU_DONG=TAT';
  if (bp === 4 && chNC_('TU_KIEM_TRA_VIDEO').toUpperCase() === 'TAT') return 'TU_KIEM_TRA_VIDEO=TAT';
  if (!bp && cauHinh_('CHE_DO_NGUON') === 'KHO_DE') return 'nguồn KHO_DE';
  if (!bp) return chanNguonBoNao_(hang);
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

function buocBoNao_(sh,bp,lenh,tonDau) {
  var runs = runsDangBoNao_(bp);
  var hang = docHang_(sh);
  var xa = lenh === 'xem' ? 0 : xaZombieBoNao_(sh,bp,hang,runs);
  if (xa) hang = docHang_(sh);
  var dang = hang.filter(function(r) { return bp && trangThaiBoNao_(r) === BO_NAO_.dang[bp]; });
  var soRun = new Set(runs.map(function(run){return run.id;})).size;
  var giu = dang.filter(function(r) { return !runs.some(function(run){return runCuaBai_(run,r.id);}); }).length;
  var ds = hang.filter(function(r) {
    return bp && (trangThaiBoNao_(r) === BO_NAO_.cho[bp] || (r.trang_thai === 'LOI_TAM' && Number(r.bp_thu_lai) === bp));
  }).sort(function(a,b) { return Number(laUuTien_(b))-Number(laUuTien_(a)) || new Date(a.cap_nhat)-new Date(b.cap_nhat); });
  var don = ds.filter(function(r) {
    if (runs.some(function(run){return runCuaBai_(run,r.id);})) return false;
    if (bp === 1) return !!r.de_bai;
    if (bp === 3) return r.file_kich_ban && (cheDoBoNao_() === 'TU_DONG_TOAN_PHAN' || r.duyet_kich_ban === r.file_kich_ban);
    if (bp === 4) return r.file_video && r.anh_kt && r.duyet === 'CHO_AI' && !matThanChan_(r);
    if (bp === 5) return r.file_video && dsNenTangChoVideo_(r).length && daDuyet_(r) && !matThanChan_(r);
    return true;
  });
  var lyDo = lyDoChanBoNao_(bp,hang,Math.max(tonDau,tonBoNao_(hang)),soRun+giu,lenh === 'dang_ngay');
  var p = PropertiesService.getScriptProperties();
  if (!bp && !lyDo && Number(p.getProperty('BP0_GIU_DEN')) > Date.now()) lyDo = 'đã gửi BP0, chờ GitHub';
  if (bp && !lyDo && !don.length) {
    var dau = ds[0];
    if (!dau) lyDo = 'hết hàng';
    else if (runs.some(function(run){ return runCuaBai_(run,dau.id); })) lyDo = dau.id + ' đã có run';
    else if (bp === 3) lyDo = dau.file_kich_ban ? 'chờ /duyetkb ' + dau.id : dau.id + ' thiếu file_kich_ban';
    else lyDo = dau.id + ' ' + (dau.ghi_chu || (bp === 4 ? 'chờ ảnh/duyệt ' + dau.duyet : 'thiếu đầu vào'));
  }
  if (!lyDo && lenh !== 'xem' && lenh !== 'xa') {
    if (!bp) {
      p.setProperty('BP0_GIU_DEN',String(Date.now()+BO_NAO_.phut[0]*60000));
      if (!giaiTrenGitHub_()) {
        if (!viecTaiChoBoNao_) viecTaiChoBoNao_ = {bp:0};
        else { p.deleteProperty('BP0_GIU_DEN'); lyDo = 'đang xử lý đề tại Apps Script'; }
      } else if (!sinhDeQuaGitHub_(sh,{})) { p.deleteProperty('BP0_GIU_DEN'); lyDo = 'đủ chỉ tiêu hoặc tồn nguồn'; }
    } else {
      don.forEach(function(r) {
        if (r.trang_thai === 'LOI_TAM') { r.trang_thai = BO_NAO_.cho[bp]; docTrangThaiCu_(r); }
      });
      var r = bp === 5 && lenh !== 'dang_ngay' ? chonVideoDang_(don) : don[0];
      if (!r) lyDo = 'chờ lịch/khung đăng';
      else {
        try { giaoBuocBoNao_(sh,bp,r); }
        catch (e) {
          if (!e.dispatchIncertain) thuLaiBoNao_(sh,r,bp,String(e.message),true);
          throw e;
        }
      }
    }
  }
  if (!lyDo && bp === 5 && lenh === 'xem' && !chonVideoDang_(don,true)) lyDo = 'chờ lịch/khung đăng ' + chDang_('GIO_DANG');
  return 'BP'+bp+' tồn '+ds.length+' · GH '+soRun+(xa?' · xả '+xa:'')+(lyDo?' · '+lyDo:'');
}

function nhipBoNao_(lenh) {
  _bat_dau_chay_ = Date.now();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  damBaoCot_(sh);
  var hang = docHang_(sh);
  var tonDau = tonBoNao_(hang);
  var loi = hang.filter(function(r) { return trangThaiBoNao_(r) === 'LOI_CAN_XEM'; });
  var tin = [cheDoBoNao_() + (loi.length ? ' · cần xem ' + loi.length + ' (' + loi[0].id + ': ' + String(loi[0].ghi_chu).slice(0,120) + ')' : '')];
  (lenh === 'dang_ngay' ? [5] : [5,4,3,2,1,0]).forEach(function(bp) {
    try {
      var dong = voiKhoa_(5000,function() {
        try { return buocBoNao_(sh,bp,lenh,tonDau); }
        finally { SpreadsheetApp.flush(); }
      });
      tin.push(dong || 'BP'+bp+' · khóa đang bận');
    } catch (e) { tin.push('BP'+bp+' · '+e.message); nhatKy_('DIEU_PHOI_LOI',tin[tin.length-1]); }
  });
  return tin.join('\n');
}

function chayBoNaoDieuPhoi() {
  var tin = nhipBoNao_('chay');
  nhatKy_('DIEU_PHOI',tin);
  tuDongDongBoCodeTuGitHub_();
  try { kiemTraHanToken_(); } catch (e) { nhatKy_('GITHUB_TOKEN',e.message); }
  try { if (typeof khoCanhBaoQuyKeyThap_ === 'function') khoCanhBaoQuyKeyThap_(); } catch (eK) { nhatKy_('KEY_THAP_LOI', eK.message); }
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var bc = {moi:0,giai_ok:0,loai:0,kich_ban:0,loi:0};
  if (viecTaiChoBoNao_) lamTaiChoBoNao_(sh,bc);
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
