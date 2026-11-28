// HANG_DOI lưu trạng thái chuẩn. docHang_ dịch về tên cũ cho các bộ giải, bảng đọc và lịch đăng.
var TRAN_SUA_BP2 = typeof TRAN_SUA_BP2 !== 'undefined' ? TRAN_SUA_BP2 : 1;
var TRAN_SUA_BP3 = typeof TRAN_SUA_BP3 !== 'undefined' ? TRAN_SUA_BP3 : 1;
var NGAN_SACH_NHIP_BO_NAO_MS_ = 30000;   // giữ nhipBoNao_ siêu nhẹ (< 30 giây/nhịp, không chạy dọn Sheet/Drive nặng)
var NGUONG_NONG_BP0_MIN_ = 4;
var NGUONG_NONG_BP0_MAX_ = 6;
var BO_NAO_ = {
  cheDo: 'TU_DONG_TOAN_PHAN', ton: 4, thuLai: TRAN_SUA_BP3,
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

// Whitelist trạng thái sống hợp lệ & danh sách ngắn lỗi hạ tầng tạm thời được phép cứu (chống lọt lỗi lạ + TTL 24h).
var TRANG_THAI_SONG_HOP_LE = [
  'MOI', 'CHO_GIAI', 'DA_GIAI', 'CHO_KICH_BAN', 'CO_KICH_BAN',
  'DANG_DUNG', 'CO_VIDEO', 'CHO_KIEM_DUYET', 'CHO_DUYET', 'CHO_DANG', 'DA_DANG'
];
var LOI_HA_TANG_TAM_THOI = [
  'timeout', '429', '502', '503', '504', 'rate limit', 'het_key', 'ECONNRESET', 'ETIMEDOUT', 'network'
];
var TRANG_THAI_XU_LY_TTL_ = ['CHO_GIAI', 'CHO_KICH_BAN', 'CO_KICH_BAN', 'DANG_DUNG'];
var TTL_TREO_IM_LANG_GIO_ = 24;
var TRANG_THAI_NOI_BO_SONG_ = ['CHO_DUNG', 'DANG_GIAI', 'DANG_KICH_BAN', 'DANG_KIEM_DUYET', 'DANG_DANG', 'CHO_DOC', 'GITHUB', 'DA_XONG', 'DA_LAM_VIDEO'];
var RE_MA_LOI_DA_BIET_ = /BO_KHONG_DAT|sửa\s+\d+\s+lần\s+vẫn\s+lỗi|Mắt\s*thần\s*3\s*\+\s*3|\bhet_luot\b|Kiểm\s+duyệt\s+bố\s+cục\s+vẫn\s+lỗi|\b(AI_SAI_TOAN|DE_SAI|VO_NGHIEM_SAI_DE|KHONG_CO_DAP_AN|TRUNG_DE|KHONG_DOC_DUOC|MP4_BI_CHAN|t2_trong|hinh_dung_im|TEX_LENH_CUT|KHUNG4TANG_3D_RONG|DE_CHU|TRAN_KHUNG|thieu_dap_an|GIAO_DIEN_CU_KHONG_HOP_LE|cat_chu|chong_chu|latex_tho|ma_tho|so_cat|lo_dap_an|lech_pha|tu_sinh_hong|hinh_nho|tran_day|nhan_de|DAP_AN_LECH|PREFLIGHT_LOI|JSON_LOI|QUA_HAN|BP4_KHONG_DAT)\b/i;

function chuanHoaTrangThaiWhitelist_(trangThai) {
  var raw = String(trangThai || '').trim();
  if (!raw) return '';
  if (typeof NHAN_TRANG_THAI === 'object' && NHAN_TRANG_THAI) {
    var keys = Object.keys(NHAN_TRANG_THAI);
    for (var i = 0; i < keys.length; i++) {
      if (NHAN_TRANG_THAI[keys[i]] && NHAN_TRANG_THAI[keys[i]][0] === raw) {
        raw = keys[i];
        break;
      }
    }
  }
  var up = raw.toUpperCase();
  return up === 'LOI' ? 'LOI_CAN_XEM' : up;
}

function docSoLanTuSuaBoNao_(ghiChu) {
  var m = /\[TU_SUA:(\d+)(?:\/\d+)?\]/i.exec(String(ghiChu || ''));
  return m ? (Number(m[1]) || 0) : 0;
}

function khopLoiHaTangTamThoi_(ghiChu) {
  var gc = String(ghiChu || '');
  if (!gc) return false;
  return LOI_HA_TANG_TAM_THOI.some(function (mau) {
    var esc = String(mau).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s_-]+');
    return new RegExp('(?:^|[^A-Za-z0-9_])' + esc + '(?:$|[^A-Za-z0-9_])', 'i').test(gc);
  });
}

function laMaLoiDaBiet_(tt, ghiChu) {
  if (tt === 'BO_KHONG_DAT' || tt === 'LOAI' || tt === 'XOA' || tt === 'DA_DON_VIDEO') return true;
  if (tt !== 'LOI_CAN_XEM' && tt !== 'LOI') return false;
  var gc = String(ghiChu || '').trim();
  if (!gc) return false;
  return khopLoiHaTangTamThoi_(gc) || RE_MA_LOI_DA_BIET_.test(gc);
}

function buocChoTruocDo_(tt, ghiChu, opt) {
  opt = opt || {};
  var gc = String(ghiChu || '');
  if (tt === 'CHO_GIAI') return {trangThaiDich: 'CHO_GIAI', boPhan: 'BP1'};
  if (tt === 'CHO_KICH_BAN') return {trangThaiDich: 'CHO_KICH_BAN', boPhan: 'BP2'};
  if (tt === 'CO_KICH_BAN' || tt === 'DANG_DUNG') {
    var dichDung = opt.coKichBanJson === false ? 'CHO_KICH_BAN' : 'CO_KICH_BAN';
    return {trangThaiDich: dichDung, boPhan: dichDung === 'CO_KICH_BAN' ? 'BP3' : 'BP2'};
  }
  if (Number(opt.bpLoi) === 1 || /\bBP1\b|bước\s*giải|bo-phan-1|giai_de/i.test(gc)) {
    return {trangThaiDich: 'CHO_GIAI', boPhan: 'BP1'};
  }
  if (Number(opt.bpLoi) === 3 || opt.coKichBanJson === true || /DUNG_VIDEO|\bBP3\b|dung-video/i.test(gc)) {
    var dich3 = opt.coKichBanJson === true ? 'CO_KICH_BAN' : 'CHO_KICH_BAN';
    return {trangThaiDich: dich3, boPhan: dich3 === 'CO_KICH_BAN' ? 'BP3' : 'BP2'};
  }
  if (Number(opt.bpLoi) === 2 || /\bBP2\b|kich_ban|viet-kich-ban/i.test(gc) || opt.coDapAn === true) {
    return {trangThaiDich: 'CHO_KICH_BAN', boPhan: 'BP2'};
  }
  return {trangThaiDich: 'CHO_GIAI', boPhan: 'BP1'};
}

// Whitelist + Default-Delete + TTL 24h cho mọi dòng trên Sheet.
function phanLoaiDongLoiMacDinh_(trangThai, ghiChu, soLanDaSua, tuoiGio, tuyChon) {
  var tt = chuanHoaTrangThaiWhitelist_(trangThai);
  var gc = String(ghiChu || '');
  var opt = tuyChon || {};
  var daSua = Math.max(Number(soLanDaSua) || 0, docSoLanTuSuaBoNao_(gc));
  var tuoi = Number(tuoiGio);
  if (!isFinite(tuoi)) tuoi = 0;

  // 1) Trạng thái nằm trong Whitelist sống hợp lệ
  if (TRANG_THAI_SONG_HOP_LE.indexOf(tt) >= 0) {
    // Chốt TTL 24 giờ cho bài treo im lặng ở trạng thái xử lý khi không có workflow đang chạy
    if (TRANG_THAI_XU_LY_TTL_.indexOf(tt) >= 0 && tuoi > TTL_TREO_IM_LANG_GIO_ && !opt.dangChayWorkflow) {
      if (daSua < 1) {
        var dichTtl = buocChoTruocDo_(tt, gc, opt);
        return {
          hanhDong: 'BAT_BUOC_SUA',
          trangThaiDich: dichTtl.trangThaiDich,
          boPhan: dichTtl.boPhan,
          tranSua: 1,
          soLanDaSua: daSua,
          laLoiLa: false,
          laTreo24h: true,
          tienToGhiChu: '[TU_SUA:1/1]',
          lyDo: 'treo_qua_24h_thu_lai'
        };
      }
      return {
        hanhDong: 'XOA_KHONG_SUA_DUOC',
        trangThaiDich: '',
        boPhan: '',
        tranSua: 0,
        soLanDaSua: daSua,
        laLoiLa: true,
        laTreo24h: true,
        tienToGhiChu: '[LOI_LA_TREO_24H]',
        lyDo: 'treo_qua_24h_het_luot'
      };
    }
    return {
      hanhDong: 'GIU_NGUYEN',
      trangThaiDich: tt,
      boPhan: '',
      tranSua: 0,
      soLanDaSua: daSua,
      laLoiLa: false,
      laTreo24h: false,
      tienToGhiChu: '',
      lyDo: 'trang_thai_song_hop_le'
    };
  }

  // 2) Trạng thái KHÔNG nằm trong Whitelist sống hợp lệ -> chỉ cứu 1 lần nếu khớp lỗi hạ tầng tạm thời
  if (daSua < 1 && khopLoiHaTangTamThoi_(gc) && !opt.quaHan48h) {
    var dichLoi = buocChoTruocDo_(tt, gc, opt);
    return {
      hanhDong: 'BAT_BUOC_SUA',
      trangThaiDich: dichLoi.trangThaiDich,
      boPhan: dichLoi.boPhan,
      tranSua: 1,
      soLanDaSua: daSua,
      laLoiLa: false,
      laTreo24h: false,
      tienToGhiChu: '[TU_SUA:1/1]',
      lyDo: 'loi_ha_tang_tam_thoi'
    };
  }

  // 3) Mặc định xóa mọi trường hợp còn lại (kể cả mọi lỗi lạ chưa từng khai báo hoặc đã hết 1 lượt cứu)
  var laLoiLa = !laMaLoiDaBiet_(tt, gc);
  return {
    hanhDong: 'XOA_KHONG_SUA_DUOC',
    trangThaiDich: '',
    boPhan: '',
    tranSua: 0,
    soLanDaSua: daSua,
    laLoiLa: laLoiLa,
    laTreo24h: false,
    tienToGhiChu: laLoiLa ? '[LOI_LA]' : '',
    lyDo: laLoiLa ? 'loi_la_mac_dinh_xoa' : (daSua >= 1 && khopLoiHaTangTamThoi_(gc) ? 'het_luot_cuu_ha_tang' : 'loi_da_biet_khong_sua_duoc')
  };
}

// Tập mã bài đang có workflow GitHub Actions chạy (dùng để chốt TTL 24h, fail-safe trả null nếu API lỗi).
function layTapIdDangChayWorkflow_(tuyChon) {
  var opt = tuyChon || {};
  if (opt.tapIdDangChay) {
    var tap = new Set();
    if (typeof opt.tapIdDangChay.forEach === 'function') {
      opt.tapIdDangChay.forEach(function (id) { if (id) tap.add(String(id).trim().toUpperCase()); });
    }
    return tap;
  }
  try {
    var ketQua = new Set();
    [1, 2, 3].forEach(function (bp) {
      var runs = runsDangBoNao_(bp) || [];
      runs.forEach(function (run) {
        var ma = String((run && run.display_title) || '').trim().split(/\s+/).pop();
        if (ma) ketQua.add(ma.toUpperCase());
      });
    });
    return ketQua;
  } catch (e) {
    return null;
  }
}

// Tóm tắt 1 dòng lỗi lạ mới tự dọn hôm nay (tối đa 3 mẫu chuỗi [LOI_LA] ngắn) cho báo cáo Zalo 21:00.
function tomTatLoiLaHomNay_(ss, homNayIso) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var tz = MUI_GIO_BO_NAO_;
  var homNay = homNayIso || Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var ngayCua = function (v) {
    if (!v) return '';
    var d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  };
  var mau = [], daCo = {}, tong = 0, maDaDem = {};
  var themMau = function (ma, chuoi) {
    var keyMa = ma ? String(ma).trim().toUpperCase() : '';
    if (keyMa && maDaDem[keyMa]) return;
    if (keyMa) maDaDem[keyMa] = 1;
    tong++;
    var s = String(chuoi || '').replace(/\s+/g, ' ').trim();
    if (keyMa) s = s.replace(new RegExp('^' + keyMa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[:|-]\\s*', 'i'), '');
    if (s.indexOf('[LOI_LA') < 0) s = '[LOI_LA] ' + s;
    s = s.slice(0, 68);
    if (s && !daCo[s] && mau.length < 3) {
      daCo[s] = 1;
      mau.push(s);
    }
  };
  try {
    var shNk = ss && ss.getSheetByName('NHAT_KY');
    if (shNk && typeof shNk.getLastRow === 'function' && shNk.getLastRow() > 1) {
      var soCot = Math.min(3, typeof shNk.getLastColumn === 'function' ? shNk.getLastColumn() : 3);
      var valsNk = shNk.getRange(2, 1, shNk.getLastRow() - 1, soCot).getValues();
      valsNk.forEach(function (v) {
        if (ngayCua(v[0]) !== homNay) return;
        var muc = String(v[1] || ''), nd = String(v[2] || '');
        if (muc === 'LOI_LA' || nd.indexOf('[LOI_LA') >= 0) {
          var mId = /^([A-Za-z0-9_-]+)\s*[:|-]\s*(.*)$/.exec(nd);
          themMau(mId ? mId[1] : '', mId ? mId[2] : nd);
        }
      });
    }
  } catch (e1) {}
  try {
    var shLt = ss && ss.getSheetByName('LuuTru_Loi');
    if (shLt && typeof shLt.getDataRange === 'function') {
      var valsLt = shLt.getDataRange().getValues();
      if (valsLt.length > 1) {
        var hdr = valsLt[0].map(function (c) { return String(c || '').trim().toLowerCase(); });
        var iId = hdr.indexOf('id') >= 0 ? hdr.indexOf('id') : 0;
        var iGc = hdr.indexOf('ghi_chu');
        var iCn = hdr.indexOf('cap_nhat');
        for (var i = 1; i < valsLt.length; i++) {
          var gc = iGc >= 0 ? String(valsLt[i][iGc] || '') : '';
          if (gc.indexOf('[LOI_LA') < 0) continue;
          if (iCn >= 0 && valsLt[i][iCn] && ngayCua(valsLt[i][iCn]) !== homNay) continue;
          themMau(valsLt[i][iId], gc);
        }
      }
    }
  } catch (e2) {}
  return {
    soLuong: tong,
    mau: mau,
    dong: 'Lỗi lạ mới tự dọn hôm nay: ' + tong + (mau.length ? ' (' + mau.join(' | ') + ')' : '')
  };
}

// Đọc tên tệp để nhận diện fileId trỏ tới mã bài được bảo vệ trong Sheet.
function tepDonVideoCoTenBaoVe_(fileId, nguon, han) {
  if (!nguon.tapIdBaoVe.size) return false;
  kiemHanDonVideo_(han, 10000);
  var ten;
  try {
    ten = DriveApp.getFileById(fileId).getName();
  } catch (e) {
    return false;
  }
  if (!maTrongTenMp4_(ten).some(function (ma) { return nguon.tapIdBaoVe.has(ma); })) return false;
  nguon.tapTepBaoVe.add(fileId);
  return true;
}

// Thu thập đầy đủ tap_id_bao_ve và tap_id_loi để truyền an toàn sang workflow don-video-drive.yml (rclone).
function thuThapDanhSachDonVideoDrive_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var tapIdBaoVe = new Set();
  var tapIdLoi = new Set();
  var songHopLe = function (tt, duyet) {
    if (String(duyet || '').trim().toUpperCase() === 'DA_DUYET') return true;
    var c = chuanHoaTrangThaiWhitelist_(tt);
    return TRANG_THAI_SONG_HOP_LE.indexOf(c) >= 0 || TRANG_THAI_NOI_BO_SONG_.indexOf(c) >= 0;
  };
  var docBang = function (sh, chiMuc) {
    if (!sh || typeof sh.getDataRange !== 'function') return [];
    if (typeof docBangDonVideo_ === 'function') {
      try { return docBangDonVideo_(sh, chiMuc).dong || []; } catch (e0) {}
    }
    var vals = sh.getDataRange().getValues();
    if (!vals.length) return [];
    var dau = -1, cot = [];
    for (var i = 0; i < Math.min(vals.length, 2); i++) {
      var cNorm = vals[i].map(function (x) {
        var t = String(x || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        return t === 'ma' || t === 'ma_de' ? 'id' : t;
      });
      if (cNorm.indexOf('id') >= 0) { dau = i + 1; cot = cNorm; break; }
    }
    if (dau < 0) return [];
    return vals.slice(dau).map(function (row) {
      var o = {};
      cot.forEach(function (k, j) { if (k) o[k] = row[j]; });
      o.id = String(o.id || '').trim();
      o._ma = o.id.toUpperCase();
      o.trang_thai = chuanHoaTrangThaiWhitelist_(o.trang_thai);
      o.ket_qua = String(o.ket_qua || '').trim().toUpperCase();
      return o;
    }).filter(function (o) { return o.id; });
  };

  // 1) HANG_DOI và DOC_DE
  var tenDocDe = typeof BANG_DE !== 'undefined' ? BANG_DE : 'DOC_DE';
  [ss.getSheetByName(TEN_HANG_DOI), ss.getSheetByName(tenDocDe)].forEach(function (sh) {
    docBang(sh, false).forEach(function (r) {
      if (songHopLe(r.trang_thai, r.duyet)) tapIdBaoVe.add(r._ma);
      else tapIdLoi.add(r._ma);
    });
  });

  // 2) SAN_PHAM
  var tenSp = typeof TEN_SAN_PHAM !== 'undefined' ? TEN_SAN_PHAM : 'SAN_PHAM';
  var shSp = ss.getSheetByName(tenSp);
  if (shSp && typeof shSp.getDataRange === 'function') {
    docBang(shSp, false).forEach(function (r) {
      var tt = chuanHoaTrangThaiWhitelist_(r.trang_thai);
      if (tt !== 'BO' && tt !== 'LOI_CAN_XEM' && tt !== 'XOA' && tt !== 'LOAI') {
        tapIdBaoVe.add(r._ma);
      }
    });
  }

  // 3) Tất cả tab LuuTru_YYYY_MM
  if (typeof ss.getSheets === 'function') {
    ss.getSheets().forEach(function (tab) {
      if (/^LuuTru_\d{4}_\d{2}$/.test(tab.getName())) {
        docBang(tab, false).forEach(function (r) {
          var tt = chuanHoaTrangThaiWhitelist_(r.trang_thai);
          if (!/^(LOI_CU|LOAI|CHO_QUA_HAN|BO_KHONG_DAT|LOI_KHONG_SUA_DUOC|LOI_CAN_XEM|XOA)$/.test(tt)) {
            tapIdBaoVe.add(r._ma);
          }
        });
      }
    });
  }

  // 4) LUU_TRU (bảo vệ DA_DANG, đánh dấu lỗi các mã kết quả lỗi)
  var tenLt = typeof TEN_LUU_TRU !== 'undefined' ? TEN_LUU_TRU : 'LUU_TRU';
  docBang(ss.getSheetByName(tenLt), true).forEach(function (r) {
    var kq = String(r.ket_qua || '').trim().toUpperCase();
    if (/^(DA_DANG|DA_LAM_VIDEO|DA_XONG)$/.test(kq)) tapIdBaoVe.add(r._ma);
    else if (/^(LOI_CU|LOAI|CHO_QUA_HAN|BO_KHONG_DAT|LOI_KHONG_SUA_DUOC|BO_QUA_ZALO)/.test(kq)) tapIdLoi.add(r._ma);
  });

  // 5) LuuTru_Loi
  docBang(ss.getSheetByName('LuuTru_Loi'), false).forEach(function (r) {
    if (songHopLe(r.trang_thai, r.duyet)) tapIdBaoVe.add(r._ma);
    else tapIdLoi.add(r._ma);
  });

  // Whitelist thắng tuyệt đối
  tapIdBaoVe.forEach(function (id) { tapIdLoi.delete(id); });
  return {
    tap_id_bao_ve: Array.from(tapIdBaoVe).sort(),
    tap_id_loi: Array.from(tapIdLoi).sort()
  };
}

// Đẩy danh sách bảo vệ / lỗi sang workflow GitHub Actions don-video-drive.yml (dùng rclone đưa vào Thùng rác Drive).
function kichHoatDonVideoDriveGitHub_(cheDo, dryRun, chatId, nguon) {
  cheDo = String(cheDo || 'mocoi').toLowerCase() === 'loi' ? 'loi' : 'mocoi';
  dryRun = !!dryRun;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ds = thuThapDanhSachDonVideoDrive_(ss);
  if (!ds.tap_id_bao_ve.length) {
    var canhBao = 'DỪNG AN TOÀN: tap_id_bao_ve rỗng (= 0 phần tử), hủy gọi don-video-drive.yml (0 tệp bị xóa).';
    try { nhatKy_('DON_VIDEO_DRIVE', canhBao); } catch (eNk0) {}
    return {ok: false, dung_an_toan: true, che_do: cheDo, dry_run: dryRun, so_bao_ve: 0, so_loi: ds.tap_id_loi.length, loi: canhBao};
  }
  var payload = JSON.stringify({tap_id_bao_ve: ds.tap_id_bao_ve, tap_id_loi: ds.tap_id_loi});
  var chuoiGui = payload;
  if (payload.length > 55000) {
    var tm = typeof thuMucKhoKichBan_ === 'function' ? thuMucKhoKichBan_() : null;
    if (!tm) {
      return {ok: false, che_do: cheDo, dry_run: dryRun, so_bao_ve: ds.tap_id_bao_ve.length, so_loi: ds.tap_id_loi.length, loi: 'Payload vượt 55KB và không mở được thư mục Drive lưu tạm'};
    }
    var tep = tm.createFile('don_drive_payload_' + Date.now() + '.json', payload, typeof MimeType !== 'undefined' ? MimeType.PLAIN_TEXT : 'text/plain');
    chuoiGui = JSON.stringify({_file_du_lieu_drive: tep.getId(), so_bao_ve: ds.tap_id_bao_ve.length, so_loi: ds.tap_id_loi.length});
  }
  var gh = typeof guiWorkflowGitHub_ === 'function'
    ? guiWorkflowGitHub_({che_do: cheDo, dry_run: String(dryRun), du_lieu: chuoiGui, chat_id: String(chatId || ''), nguon: String(nguon || 'apps_script')}, 'don-video-drive.yml')
    : {ok: false, loi: 'Thiếu guiWorkflowGitHub_'};
  try {
    nhatKy_('DON_VIDEO_DRIVE', (gh && gh.ok ? 'Đã gửi ' : 'Lỗi gửi ') + 'don-video-drive.yml (' + cheDo + ', dry_run=' + dryRun + ', bảo vệ=' + ds.tap_id_bao_ve.length + ', lỗi=' + ds.tap_id_loi.length + ')' + (gh && gh.loi ? ': ' + gh.loi : ''));
  } catch (eNk) {}
  return {
    ok: !!(gh && gh.ok),
    che_do: cheDo,
    dry_run: dryRun,
    so_bao_ve: ds.tap_id_bao_ve.length,
    so_loi: ds.tap_id_loi.length,
    loi: (gh && gh.loi) || ''
  };
}

// Xử lý lệnh Zalo: /donvideoloi thu (mocoi, dry_run=true) | /donvideoloi (loi, dry_run=false) | /donvideoloi mocoi (mocoi, dry_run=false)
function lenhDonVideoLoiZalo_(chat, chu) {
  var thamSo = String(chu || '').trim().replace(/^\/donvideoloi\b/i, '').trim().toLowerCase();
  var cheDo = 'loi', dryRun = false, moTa = 'dọn MP4 lỗi (rclone -> Thùng rác Drive)';
  if (thamSo === 'thu' || thamSo === 'thử' || thamSo === 'dry') {
    cheDo = 'mocoi';
    dryRun = true;
    moTa = 'CHẠY THỬ (dry_run=true, không xóa tệp) quét MP4 lỗi + mồ côi > 24h';
  } else if (thamSo === 'mocoi' || thamSo === 'mồ côi') {
    cheDo = 'mocoi';
    dryRun = false;
    moTa = 'dọn tổng MP4 lỗi + mồ côi > 24h (rclone -> Thùng rác Drive)';
  }
  var kq = kichHoatDonVideoDriveGitHub_(cheDo, dryRun, chat, 'zalo');
  if (kq.dung_an_toan) return '🛑 ' + kq.loi;
  if (!kq.ok) return '⚠️ Chưa gửi được lệnh sang GitHub Actions (don-video-drive.yml): ' + (kq.loi || 'lỗi không rõ');
  return '🧹 Đã gửi GitHub Actions (don-video-drive.yml) ' + moTa + '.\n' +
    '• Whitelist bảo vệ: ' + kq.so_bao_ve + ' mã | Danh sách lỗi: ' + kq.so_loi + ' mã.\n' +
    'Kết quả chi tiết sẽ tự gửi về Zalo khi lượt chạy hoàn tất.';
}

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
      var trig = ScriptApp.newTrigger('chayDonDepHotSheetTheoLich').timeBased().inTimezone(MUI_GIO_BO_NAO_)
        .atHour(2).everyDays(1);
      if (typeof trig.nearMinute === 'function') trig = trig.nearMinute(30);
      trig.create();
    } catch (e) {
      ScriptApp.deleteTrigger(nhip);
      throw e;
    }
    var thayThe = LICH_BO_NAO_CU_.concat(['chayBoNaoDieuPhoi', 'chayDonDepHotSheetTheoLich', 'donDepHotSheetDinhKy', 'chayDonDep']);
    cu.forEach(function (t) { if (thayThe.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
    return 'Đã cài điều phối mỗi ' + PHUT_NHIP_BO_NAO_ + ' phút và dọn Hot Sheet + Drive (rclone) hằng ngày lúc ~02:30 giờ VN.';
  }) || 'Hệ thống đang bận, hãy chạy lại caiDatLichTuDongChuan().';
}

function chayDonDepHotSheetTheoLich() {
  // Trigger truyền sự kiện, còn hàm dọn nhận hạn chót dạng số. Gọi mặc định để giữ giới hạn thời gian.
  var kq = donDepHotSheetDinhKy();
  try {
    if (typeof xuLyLoiDocDe_ === 'function') {
      var ssDoc = SpreadsheetApp.getActiveSpreadsheet();
      var tenDoc = typeof BANG_DE !== 'undefined' ? BANG_DE : 'DOC_DE';
      if (ssDoc && ssDoc.getSheetByName(tenDoc)) {
        var key = typeof docQuyKeyBoNao_ === 'function' ? docQuyKeyBoNao_() : null;
        var toiDa = key && key.tyLe >= NGUONG_KEY_TOI_THIEU_SAN_XUAT ? 3 : 0;
        xuLyLoiDocDe_({chayTay: false, toiDaSua: toiDa});
      }
    }
  } catch (eLoi) { try { nhatKy_('XU_LY_LOI_DOC_DE', 'Lịch đêm 02:30: ' + eLoi.message); } catch (e2) {} }
  try {
    if (typeof kichHoatDonVideoDriveGitHub_ === 'function') {
      kichHoatDonVideoDriveGitHub_('mocoi', false, '', 'lich_dem');
    }
  } catch (eDr) { try { nhatKy_('DON_VIDEO_DRIVE_LOI', 'Lịch đêm 02:30: ' + eDr.message); } catch (e3) {} }
  return kq;
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
  // Chỉ đếm hàng đợi NÓNG (MOI/CHO_GIAI, DA_GIAI/CHO_KICH_BAN, CO_KICH_BAN/CHO_DUNG, DANG_DUNG).
  // TUYỆT ĐỐI không tính CHO_DANG hay CHO_DUYET/CHO_KIEM_DUYET vào phanh chặn BP0.
  return hang.filter(function(r) {
    return r.id && ['CHO_GIAI', 'CHO_KICH_BAN', 'CHO_DUNG', 'DANG_DUNG'].indexOf(trangThaiBoNao_(r)) >= 0;
  }).length;
}

// Tính cỡ lô BP0 (2–3 đề/lượt) khi hàng đợi nóng dưới ngưỡng 4–6 bài và quỹ key >= 25%.
// Một ngưỡng hàng nóng duy nhất cho phanh BP0 (lyDoChanBoNao_) và cỡ lô (tinhSoDeLoBP0_): CAU_HINH NGUONG_HANG_DOI_NONG kẹp 4–6, mặc định 4.
function nguongNongBP0_() {
  var cfgNguong = Number(typeof cauHinh_ === 'function' ? cauHinh_('NGUONG_HANG_DOI_NONG') : 0);
  return cfgNguong ? Math.max(NGUONG_NONG_BP0_MIN_, Math.min(NGUONG_NONG_BP0_MAX_, cfgNguong)) : BO_NAO_.ton;
}

function tinhSoDeLoBP0_(hang, key) {
  var ton = tonBoNao_(hang || []);
  var nguong = nguongNongBP0_();
  if (ton >= nguong) return 0;
  if (key && !(key.tyLe >= NGUONG_KEY_TOI_THIEU_SAN_XUAT)) return 0;
  return Math.max(2, Math.min(3, nguong - ton));
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
  if (het) guiZaloMotLan_('XAKET_' + bp + '_' + r.id, r.id + ' BP' + bp + ' hết ' + BO_NAO_.thuLai + ' lượt thử lại. ' + lyDo);
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

/* ===================== v102.1 CẦU DAO NGẮT MẠCH BP2 (bảo vệ quỹ key Gemini) =====================
 * Một khóa Script Properties duy nhất BP2_CAU_DAO = {truot, ngat_den, loai, ly_do, ngay, bao}.
 *  - truot: số bài BP2 trượt LIÊN TIẾP (reset 0 ngay khi có 1 bài đậu).
 *  - truot >= 5 HOẶC quỹ key < 20% -> tạm hoãn giao BP2 mới 3 giờ (ngắt theo key: tự mở sớm khi key hồi >= 25%).
 *  - Tự mở lại khi sang ngày mới (giờ VN) hoặc hết hạn; /mobp2 mở tay bất cứ lúc nào. BP4/BP5 không bị ảnh hưởng.
 *  - Mỗi lần ngắt chỉ gửi ĐÚNG 1 tin Zalo (cờ bao = ngat_den của lần ngắt đó). */
var CAU_DAO_BP2_KHOA_ = 'BP2_CAU_DAO';
var CAU_DAO_BP2_TRUOT_TOI_DA_ = 5;
var CAU_DAO_BP2_GIO_ = 3;
var CAU_DAO_BP2_KEY_NGAT_ = 0.20;
var CAU_DAO_BP2_KEY_MO_ = 0.25;
function ngayCauDao_(luc) { return Utilities.formatDate(luc || new Date(), MUI_GIO_BO_NAO_, 'yyyyMMdd'); }
function docCauDaoBP2_() {
  var o = {};
  try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty(CAU_DAO_BP2_KHOA_) || '{}') || {}; } catch (e) { o = {}; }
  return {truot: Number(o.truot) || 0, ngat_den: Number(o.ngat_den) || 0, loai: String(o.loai || ''), ly_do: String(o.ly_do || ''),
    ngay: String(o.ngay || ''), bao: Number(o.bao) || 0, lan_cuoi: String(o.lan_cuoi || '')};
}
function ghiCauDaoBP2_(o) {
  var p = PropertiesService.getScriptProperties();
  if (!o.truot && !o.ngat_den && !o.bao) { if (typeof p.deleteProperty === 'function') p.deleteProperty(CAU_DAO_BP2_KHOA_); else p.setProperty(CAU_DAO_BP2_KHOA_, '{}'); return; }
  p.setProperty(CAU_DAO_BP2_KHOA_, JSON.stringify(o));
}
function ngatCauDaoBP2_(o, loai, lyDo, luc) {
  var now = (luc || new Date()).getTime();
  o.ngat_den = now + CAU_DAO_BP2_GIO_ * 3600000;
  o.loai = loai;
  o.ly_do = String(lyDo || '').slice(0, 200);
  o.ngay = ngayCauDao_(luc);
  if (o.bao !== o.ngat_den) {
    o.bao = o.ngat_den;
    try {
      guiZalo_('⛔ Cầu dao BP2 đã NGẮT ' + CAU_DAO_BP2_GIO_ + ' giờ (tới ' + Utilities.formatDate(new Date(o.ngat_den), MUI_GIO_BO_NAO_, 'HH:mm') + ' giờ VN) để bảo vệ quỹ key Gemini.\n' +
        'Lý do: ' + o.ly_do + '\nBP4/BP5 vẫn đăng bài chờ sẵn bình thường. Mở lại ngay: /mobp2', 'cao', 'BP2_CAU_DAO_' + o.ngat_den);
    } catch (eZ) {}
  }
  nhatKy_('CAU_DAO_BP2', 'NGẮT ' + CAU_DAO_BP2_GIO_ + 'h: ' + o.ly_do);
  return o;
}
// Ghi kết quả một bài BP2 (đậu -> reset; trượt -> +1, đủ 5 bài liên tiếp -> ngắt). Trả trạng thái mới.
function ghiKetQuaBP2CauDao_(dat, lyDo, luc) {
  var o = docCauDaoBP2_();
  if (dat) {
    if (o.truot) nhatKy_('CAU_DAO_BP2', 'Có bài BP2 đậu -> reset bộ đếm trượt liên tiếp (' + o.truot + ' -> 0)');
    o.truot = 0;
    o.lan_cuoi = '';
  } else {
    o.truot = (Number(o.truot) || 0) + 1;
    o.lan_cuoi = String(lyDo || '').slice(0, 160);
    if (o.truot >= CAU_DAO_BP2_TRUOT_TOI_DA_ && !(o.ngat_den > (luc || new Date()).getTime()))
      ngatCauDaoBP2_(o, 'truot', o.truot + ' bài BP2 trượt liên tiếp (gần nhất: ' + (o.lan_cuoi || 'không rõ') + ')', luc);
  }
  ghiCauDaoBP2_(o);
  return o;
}
// Lý do chặn BP2 do cầu dao ('' = cho chạy). ghi=false chỉ xem (/trangthai), không đổi trạng thái.
function lyDoCauDaoBP2_(key, luc, ghi) {
  luc = luc || new Date();
  var o = docCauDaoBP2_(), now = luc.getTime(), doi = false;
  var tyLe = key && isFinite(Number(key.tyLe)) ? Number(key.tyLe) : null;
  if (o.ngat_den) {
    var moLai = now >= o.ngat_den || (o.ngay && o.ngay !== ngayCauDao_(luc)) || (o.loai === 'key' && tyLe !== null && tyLe >= CAU_DAO_BP2_KEY_MO_);
    if (moLai) {
      nhatKy_('CAU_DAO_BP2', 'Tự mở lại (' + (o.loai === 'key' && tyLe !== null && tyLe >= CAU_DAO_BP2_KEY_MO_ ? 'quỹ key hồi ' + Math.round(tyLe * 100) + '%' : now >= o.ngat_den ? 'hết ' + CAU_DAO_BP2_GIO_ + ' giờ' : 'sang ngày mới') + ')');
      o.ngat_den = 0; o.loai = ''; o.ly_do = '';
      if (o.truot >= CAU_DAO_BP2_TRUOT_TOI_DA_) o.truot = 0;
      doi = true;
    }
  }
  if (!o.ngat_den && tyLe !== null && tyLe < CAU_DAO_BP2_KEY_NGAT_) {
    if (!ghi) return 'cầu dao BP2: quỹ key ' + Math.round(tyLe * 100) + '% < ' + Math.round(CAU_DAO_BP2_KEY_NGAT_ * 100) + '%';
    ngatCauDaoBP2_(o, 'key', 'quỹ key Gemini còn ' + Math.round(tyLe * 100) + '% < ' + Math.round(CAU_DAO_BP2_KEY_NGAT_ * 100) + '% (tự mở khi hồi >= ' + Math.round(CAU_DAO_BP2_KEY_MO_ * 100) + '%)', luc);
    doi = true;
  }
  if (doi && ghi) ghiCauDaoBP2_(o);
  if (!o.ngat_den) return '';
  return 'cầu dao BP2 ngắt tới ' + Utilities.formatDate(new Date(o.ngat_den), MUI_GIO_BO_NAO_, 'HH:mm') + ' (' + o.ly_do + '), mở tay: /mobp2';
}
// Lệnh Zalo /mobp2: mở cầu dao + reset bộ đếm.
function moCauDaoBP2_() {
  var o = docCauDaoBP2_();
  var dangNgat = o.ngat_den > Date.now();
  ghiCauDaoBP2_({truot: 0, ngat_den: 0, loai: '', ly_do: '', ngay: '', bao: 0, lan_cuoi: ''});
  nhatKy_('CAU_DAO_BP2', 'Mở tay bằng /mobp2' + (dangNgat ? ' (đang ngắt: ' + o.ly_do + ')' : ''));
  return dangNgat ? '✅ Đã mở lại cầu dao BP2 và reset bộ đếm trượt (' + o.truot + ' -> 0). Nhịp điều phối sau sẽ giao BP2 lại.' +
    (o.loai === 'key' ? '\n⚠️ Quỹ key vẫn có thể thấp: nếu còn < ' + Math.round(CAU_DAO_BP2_KEY_NGAT_ * 100) + '%, cầu dao sẽ ngắt lại.' : '')
    : 'ℹ️ Cầu dao BP2 đang đóng (BP2 chạy bình thường). Đã reset bộ đếm trượt (' + o.truot + ' -> 0).';
}

function cheDoBoNao_() {
  return String(cauHinh_('CHE_DO_VAN_HANH')).trim().toUpperCase() === 'DUYET_TAY_SAU_BP2'
    ? 'DUYET_TAY_SAU_BP2' : BO_NAO_.cheDo;
}

function lyDoChanBoNao_(bp, ton, soRun, dangNgay) {
  if (String(cauHinh_('BAT_BP' + bp) || 'BAT').toUpperCase() === 'TAT') return 'BAT_BP' + bp + '=TAT';
  if (soRun >= BO_NAO_.gioiHan[bp]) return 'đủ ' + BO_NAO_.gioiHan[bp] + ' slot';
  if (!bp && ton >= nguongNongBP0_()) return 'tồn ' + ton + '/' + nguongNongBP0_();
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
  var soLo = tinhSoDeLoBP0_(hang) || 2;
  var duLieu = JSON.stringify({
    lan_giao: p.getProperty('BP0_GIU_DEN'), so_luong: soLo, cau_hinh: ch, props: propsGui,
    gan_day: hang.slice(-40).map(function (r) {
      return {id: r.id, trang_thai: r.trang_thai, chu_de: String(r.chu_de || '').slice(0, 60),
        de_bai: String(r.de_bai || '').slice(0, 120), ma_bam: r.ma_bam || '', mon: r.mon || '', nguon: String(r.nguon || '').slice(0, 60)};
    }),
    ma_bam: Object.keys(docMaBamLuuTru_()).slice(-120).concat(hang.map(function (r) { return r.ma_bam; }).filter(Boolean).slice(-120))
  });
  if (duLieu.length > 60000) throw new Error('Dữ liệu BP0 vượt giới hạn dispatch');
  var gh = guiWorkflowGitHub_({mon: ch.CHU_DE_VIDEO || 'XEN_KE', du_lieu: duLieu}, 'sinh-de.yml');
  if (!gh || !gh.ok) throw new Error(gh ? gh.loi : 'GitHub chưa xác nhận giao BP0');
  nhatKy_('SINH_DE_GH', 'Đã giao Bộ phận 0 (sinh-de.yml) tạo lô ' + soLo + ' đề mới trên GitHub');
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
  // v102.1 cầu dao BP2: 5 bài trượt liên tiếp hoặc quỹ key < 20% -> hoãn giao BP2 mới (BP4/BP5 vẫn chạy)
  if (bp === 2 && !lyDo && ds.length) lyDo = lyDoCauDaoBP2_(docQuyKeyBoNao_(), new Date(), lenh !== 'xem' && lenh !== 'xa');
  var p = PropertiesService.getScriptProperties();
  var boSung = false, lyDoNguon = '';
  var sanXuatNgay = lenh === 'san_xuat_ngay';
  if (!bp && !lyDo) {
    var dangLam = demDangSanXuatBoNao_(hang);
    var keyBP0 = sanXuatNgay ? null : docQuyKeyBoNao_();
    if (sanXuatNgay && dangLam) lyDo = 'BP1–BP3 còn ' + dangLam + ' bài đang xử lý';
    else if (keyBP0 && Number(keyBP0.tyLe) < NGUONG_KEY_TOI_THIEU_SAN_XUAT)
      lyDo = 'quỹ key Gemini ' + Math.round(Number(keyBP0.tyLe) * 100) + '% < ' + (NGUONG_KEY_TOI_THIEU_SAN_XUAT * 100) + '%, chưa sinh lô mới';
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
  var soVideoMoi = lenh === 'chay' ? voiKhoa_(1000, function () { return demVideoMoiTrongNgay_(luc, true); }) : null;
  if (soVideoMoi === null) soVideoMoi = demVideoMoiTrongNgay_(luc, false);
  var key = docQuyKeyBoNao_();
  // Tách tác vụ dọn Sheet/Drive nặng (xuLyLoiDocDe_, donDaXong_, doVaSuaVideoCuTrenDrive_) ra khỏi nhịp 5 phút:
  // nhipBoNao_ chỉ đọc bảng nóng và gửi workflow_dispatch (< 30 giây/nhịp) để /trangthai không bị "khóa đang bận".
  var loi = hang.filter(function(r) { return trangThaiBoNao_(r) === 'LOI_CAN_XEM'; });
  var tin = [cheDoBoNao_() + (loi.length ? ' · cần xem ' + loi.length + ' (' + loi[0].id + ': ' + String(loi[0].ghi_chu).slice(0,120) + ')' : '')];
  var kho = tinhKhoDemBoNao_(hang, false, soVideoMoi, key);
  var ketQua = {};
  (lenh === 'dang_ngay' ? [5] : [5,4,3,2,1,0]).forEach(function(bp) {
    var buoc = ketQua[bp] = {};
    if (lenh === 'chay' && Date.now() - _bat_dau_chay_ >= NGAN_SACH_NHIP_BO_NAO_MS_) {
      buoc.lyDo = 'nhường khóa (< 30s/nhịp)';
      tin.push('BP' + bp + ' · ' + buoc.lyDo);
      return;
    }
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
  var cdBP2 = docCauDaoBP2_();
  dau.push('Cầu dao BP2: ' + (cdBP2.ngat_den > Date.now() ? 'NGẮT tới ' + Utilities.formatDate(new Date(cdBP2.ngat_den), MUI_GIO_BO_NAO_, 'HH:mm') + ' (' + cdBP2.ly_do + ') - /mobp2 để mở' : 'đóng · trượt liên tiếp ' + cdBP2.truot + '/' + CAU_DAO_BP2_TRUOT_TOI_DA_));
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
  // Tác vụ nặng (donDaXong_, xuLyLoiDocDe_, xaKhoChoDuyet_, doVaSuaVideoCuTrenDrive_) đã tách sang lịch dọn định kỳ / lệnh tay
  // để nhịp 5 phút luôn hoàn tất nhanh, không làm /trangthai dính "khóa đang bận".
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
