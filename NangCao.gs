/**
 * ============================================================
 * NÂNG CAO (dán thành tệp mới NangCao.gs): 6 tính năng
 *  1. AI TỰ XEM VIDEO trước khi gửi bạn duyệt: GitHub chụp 4 khung hình (cảnh 1-3 + đáp án) -> Gemini so với đề (và ảnh đề nếu có),
 *     chấm điểm 0-10. Dưới ngưỡng thì tự viết lại kịch bản theo nhận xét và dựng lại (tối đa 1 lần), rồi mới gửi bạn duyệt.
 *  2. SỐ LIỆU YOUTUBE: mỗi ngày lấy lượt xem, thích, bình luận (+ tỉ lệ xem trung bình nếu bật YouTube Analytics) vào sheet THONG_KE,
 *     rút ra kiểu mở đầu / độ dài / chủ đề nào giữ chân người xem tốt, đưa vào lời nhắc viết kịch bản.
 *  3. LUÂN PHIÊN KIỂU MỞ ĐẦU: mỗi video thử một kiểu hook; đủ số liệu thì 70% dùng kiểu tốt nhất, 30% thử kiểu ít dùng.
 *  4. ẢNH BÌA YOUTUBE: khung hình lúc câu móc hiện đầy đủ (cần kênh đã xác minh số điện thoại để đặt ảnh bìa qua API).
 *  5. SERIES: mỗi video thuộc một series theo chủ đề (Toán đi chợ, Hình học kỳ diệu, Tối ưu đời thường...), đánh số tập, nhắc tập trước,
 *     tự thêm vào danh sách phát YouTube cùng tên.
 *  6. BÁO CÁO HẰNG NGÀY qua Zalo: việc đã làm, lỗi, hàng đợi, Gemini, hạn token GitHub, video nổi bật.
 * CÀI ĐẶT: chạy caiDatNangCao() một lần. (Muốn có tỉ lệ xem: Dịch vụ + > YouTube Analytics API.)
 * Cấu hình (CAU_HINH): TU_KIEM_TRA_VIDEO BAT|TAT, DIEM_HINH_TOI_THIEU (7), THU_HOOK BAT|TAT, SERIES BAT|TAT, BAO_CAO_GIO (21)
 * ============================================================
 */

var MAC_DINH_NC_ = { TU_KIEM_TRA_VIDEO: 'BAT', DIEM_HINH_TOI_THIEU: '8', MUC_DAP_UNG_TOI_THIEU: '100', DIEM_MOI_TIEU_CHI: '10', AI_DUYET_KICH_BAN: 'BAT', SO_LAN_SUA_YEU_CAU: '2', SO_LAN_SUA_KICH_BAN_YC: '3', THU_HOOK: 'BAT', SERIES: 'BAT', BAO_CAO_GIO: '21', PLAYLIST_THEO: 'lop,lop_loai',
  HOC_EDIT: 'BAT', HOC_EDIT_GIO: '2', HOC_EDIT_SO_VIDEO: '3', HOC_EDIT_TU_KHOA: 'math shorts animation|giải toán shorts|motion graphics math|toán học thú vị shorts|3d math animation' };
function chNC_(k) { var v = cauHinh_(k); return v === undefined || v === null || String(v).trim() === '' ? MAC_DINH_NC_[k] : String(v).trim(); }
var TEN_THONG_KE = 'THONG_KE';
var COT_TK = ['id', 'video_yt', 'ngay_dang', 'luot_xem', 'thich', 'binh_luan', 'ty_le_xem', 'xem_tb_giay', 'hook_kieu', 'hook_chu', 'mon', 'chu_de', 'series', 'giay', 'cap_nhat'];

function caiDatNangCao() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  damBaoCot_(ss.getSheetByName(TEN_HANG_DOI));
  shThongKe_();
  var ch = ss.getSheetByName(TEN_CAU_HINH), co = {};
  ch.getDataRange().getValues().forEach(function (v) { co[v[0]] = true; });
  Object.keys(MAC_DINH_NC_).forEach(function (k) { if (!co[k]) ch.appendRow([k, MAC_DINH_NC_[k]]); });
  ScriptApp.getProjectTriggers().forEach(function (t) { if (['capNhatThongKe', 'baoCaoHangNgay', 'hocEditHangNgay'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  _bo_nho_cau_hinh_ = null;
  ScriptApp.newTrigger('capNhatThongKe').timeBased().atHour(6).everyDays(1).create();
  ScriptApp.newTrigger('baoCaoHangNgay').timeBased().atHour(Number(chNC_('BAO_CAO_GIO')) || 21).everyDays(1).create();
  ScriptApp.newTrigger('hocEditHangNgay').timeBased().atHour(Number(chNC_('HOC_EDIT_GIO')) || 2).everyDays(1).create();
  thuMucHocEdit_();
  Logger.log('Đã đặt trigger: capNhatThongKe (6 giờ sáng), baoCaoHangNgay (' + chNC_('BAO_CAO_GIO') + ' giờ). Múi giờ theo cài đặt dự án: ' + Session.getScriptTimeZone());
  Logger.log(typeof YouTubeAnalytics === 'undefined' ? 'ℹ️ Chưa bật YouTube Analytics API (Dịch vụ +) nên chỉ có lượt xem/thích/bình luận, chưa có tỉ lệ xem.' : '✅ Đã bật YouTube Analytics.');
}

/* ===================== 1. AI TỰ XEM VIDEO ===================== */

// Gọi từ doPost khi GitHub báo dựng xong và có ảnh kiểm tra: trả true nếu đã giao cho AI xem (chưa gửi bạn duyệt).
function giaoAiXemVideo_(sh, r, d) {
  if (chNC_('TU_KIEM_TRA_VIDEO').toUpperCase() === 'TAT' || !d.anh_kt) return false;
  ghi_(sh, r._row, { duyet: 'AI_XEM' });
  henKiemTraVideo_(15);
  return true;
}
function henKiemTraVideo_(giay) {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'chayKiemTraVideo') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('chayKiemTraVideo').timeBased().after(Math.max(10, giay) * 1000).create();
}

function chayKiemTraVideo() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'chayKiemTraVideo') ScriptApp.deleteTrigger(t); });
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(10000)) { henKiemTraVideo_(90); return; }
  var conViec = false;
  try {
    _bat_dau_chay_ = Date.now();
    _bo_nho_cau_hinh_ = null;
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    var ds = docHang_(sh).filter(function (r) { return r.trang_thai === 'CO_VIDEO' && String(r.duyet) === 'AI_XEM'; });
    for (var i = 0; i < ds.length; i++) {
      if (!conDuGoiGemini_()) { conViec = true; break; }
      xuLyAiXem_(sh, ds[i]);
    }
  } catch (e) {
    nhatKy_('AI_XEM_LOI', String(e.message).slice(0, 300));
    conViec = true;
  } finally { khoa.releaseLock(); }
  if (conViec) henKiemTraVideo_(120);
  try { if (typeof sauUuTien_ === 'function') sauUuTien_(); } catch (e2) {}
}

// BỘ PHẬN KIỂM DUYỆT YÊU CẦU - cửa 2: chấm VIDEO vừa dựng (sau kiểm duyệt bố cục tự động trên GitHub) theo bảng tiêu chí của chủ kênh.
// Đạt (≥ MUC_DAP_UNG_TOI_THIEU %, mặc định 85%, và mọi tiêu chí bắt buộc ≥ 7) mới gửi bạn duyệt / đăng.
// Chưa đạt: tự viết lại kịch bản theo nhận xét rồi dựng lại, tối đa SO_LAN_SUA_YEU_CAU lần (mặc định 2). Vẫn chưa đạt -> BỎ video + XÓA đề, làm đề mới.
function docAiKT_(r) { try { return JSON.parse(String(r.ai_kiem_tra || '{}')) || {}; } catch (e) { return {}; } }
function ghiAiKT_(sh, r, them, cot) {
  var o = docAiKT_(r);
  Object.keys(them).forEach(function (k) { o[k] = them[k]; });
  o.luc = new Date().toISOString();
  var f = cot || {};
  f.ai_kiem_tra = JSON.stringify(o).slice(0, 1800);
  ghi_(sh, r._row, f);
  r.ai_kiem_tra = f.ai_kiem_tra;
}
// gửi kịch bản về Bộ phận 1 viết lại theo góp ý (giống lệnh /sua), giữ bản cũ làm bản nháp để sửa đúng chỗ
function traVeSuaKichBan_(sh, r, gopY, ghiChu, them) {
  var kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString());
  luuNhapKichBan_(r.id, kb);
  ghiAiKT_(sh, r, them, { trang_thai: 'DA_GIAI', duyet: '', uu_tien: 1, so_lan_loi: 0, gop_y: String(gopY).slice(0, 1500), ghi_chu: String(ghiChu).slice(0, 200) });
  henUuTien_(20);
}

// GitHub báo KIỂM DUYỆT BỐ CỤC không đạt (đo trên khung hình thật: chữ tràn mép, chữ đè, TeX thô, công thức lỗi)
function xuLyKiemDuyetBoCuc_(sh, r, kd) {
  var nang = (kd && kd.nang) || [];
  var lan = (Number(docAiKT_(r).kd_lan) || 0) + 1;
  nhatKy_('KIEM_DUYET', r.id + ' lần ' + lan + ': ' + nang.length + ' lỗi bố cục | ' + nang.slice(0, 4).join(' | ').slice(0, 400));
  if (!r.file_kich_ban) { baoLoiDung_(sh, r, 'KIEM_DUYET: ' + nang.slice(0, 2).join('; ')); return { ok: true }; }
  traVeSuaKichBan_(sh, r,
    'KIỂM DUYỆT BỐ CỤC TỰ ĐỘNG (đo trên khung hình thật) KHÔNG ĐẠT, PHẢI SỬA HẾT: ' + nang.slice(0, 10).join(' || ') +
    '. Cách sửa chung: bớt vật/chữ trong cảnh bị lỗi, đặt các vật cách xa nhau (x, y), nhãn ngắn ≤ 22 ký tự, công thức LaTeX đúng cú pháp.',
    'Kiểm duyệt bố cục lần ' + lan + ' chưa đạt: tự sửa kịch bản', { kd_lan: lan, kd_loi: nang.slice(0, 5) });
  return { ok: true, sua: true };
}

function xuLyAiXem_(sh, r) {
  var kq = null;
  try { kq = aiChamVideo_(r); } catch (e) {
    if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e.message))) throw e;
    nhatKy_('AI_XEM_LOI', r.id + ': ' + e.message);
  }
  var cu = docAiKT_(r);
  var lan = Number(cu.lan_sua) || 0;
  var toiDa = soLanSuaYeuCau_();
  if (!kq) {
    // AI CHƯA CHẤM ĐƯỢC (hết key, mạng...): KHÔNG BAO GIỜ coi là đạt. Giữ trạng thái AI_XEM để lượt sau chấm lại;
    // quá 6 lượt vẫn không chấm được thì giữ video lại (không gửi duyệt, không đăng) và báo người dùng.
    var loiAi = (Number(cu.lan_loi_ai) || 0) + 1;
    if (loiAi < 6) { ghiAiKT_(sh, r, { lan_loi_ai: loiAi }, { duyet: 'AI_XEM' }); nhatKy_('AI_XEM_LOI', r.id + ': chưa chấm được, sẽ chấm lại (lần ' + loiAi + ')'); return; }
    ghiAiKT_(sh, r, { diem: null, lan_loi_ai: loiAi }, { duyet: 'KHONG_DAT', ghi_chu: 'AI chưa chấm được video sau ' + loiAi + ' lần thử, giữ lại chưa gửi' });
    guiZalo_('⏸ Video "' + (r.chu_de || r.id) + '" đã dựng xong nhưng AI kiểm duyệt chưa chấm được (hết key/lỗi mạng) nên CHƯA gửi, CHƯA đăng.\nXem tay: /xem ' + r.id, 'cao', 'AI_KHONG_CHAM_' + r.id);
    return;
  }
  var pt = kq.phan_tram, nguongPT = nguongDapUng_();
  nhatKy_('AI_XEM', r.id + ': đáp ứng ' + pt + '% (cần ≥ ' + nguongPT + '%) | ' + tomTatTieuChi_(kq) + (kq.van_de.length ? ' | ' + kq.van_de.join('; ').slice(0, 300) : ''));
  if (kq.dat) {
    ghiAiKT_(sh, r, { diem: kq.diem, phan_tram: pt, chi_tiet: kq.chi_tiet, van_de: kq.van_de }, { duyet: canDuyet_() ? 'CHO' : '' });
    if (canDuyet_()) guiDuyet_(r, '✅ Đạt kiểm duyệt yêu cầu: ' + (pt >= 100 ? '10/10 mọi tiêu chí' : pt + '%') + (lan ? ' (đã tự sửa ' + lan + ' lần)' : ''));
    else guiZalo_('✅ Video ' + (r.chu_de || r.id) + ' đạt kiểm duyệt yêu cầu (' + pt + '%), xếp lịch đăng.', 'vua');
    return;
  }
  if (lan >= toiDa || !r.file_kich_ban) {
    // đã tự sửa đủ số lần mà vẫn chưa đạt: BỎ VIDEO + XÓA ĐỀ, hệ thống tự làm đề mới (không gửi bạn, không đăng)
    var lyDo = 'đáp ứng ' + pt + '% sau ' + lan + ' lần tự sửa' + (kq.nang.length ? ', tiêu chí bắt buộc chưa đạt: ' + kq.nang.join(', ') : '') + '. ' + kq.van_de.slice(0, 3).join('; ');
    ghiAiKT_(sh, r, { diem: kq.diem, phan_tram: pt, chi_tiet: kq.chi_tiet, van_de: kq.van_de }, {});
    boDeKhongDat_(sh, r, lyDo, 'video');
    if (laUuTien_(r)) baoZaloDe_(r, '❌ Video cho đề ' + r.id + ' không đạt kiểm duyệt yêu cầu (' + pt + '%) sau ' + lan + ' lần tự sửa nên hệ thống đã BỎ video và xóa đề.\nLý do: ' + kq.van_de.slice(0, 2).join('; ').slice(0, 250), 'cao');
    return;
  }
  traVeSuaKichBan_(sh, r,
    'BỘ PHẬN KIỂM DUYỆT YÊU CẦU: video mới đáp ứng ' + pt + '% (cần ≥ ' + nguongPT + '%, mọi tiêu chí ' + diemMoiTieuChi_() + '/10' + (kq.nang.length ? ', tiêu chí chưa đạt: ' + kq.nang.join(', ') : '') + '). Vấn đề: ' + kq.van_de.join('; ') + '. Cách sửa: ' + kq.gop_y,
    'Kiểm duyệt yêu cầu ' + pt + '%: tự sửa lần ' + (lan + 1), { diem: kq.diem, phan_tram: pt, chi_tiet: kq.chi_tiet, van_de: kq.van_de, lan_sua: lan + 1 });
}

// /xem <mã>: lấy link video bị giữ lại vì chưa đạt kiểm duyệt
function xemVideoKhongDat_(chu) {
  var id = String(chu || '').replace(/^\/xem\s*/i, '').trim();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var r = docHang_(sh).filter(function (x) { return x.id === id; })[0];
  if (!r || !r.file_video) return 'Không thấy video ' + id + '.';
  var o = docAiKT_(r);
  return '🎞 ' + (r.chu_de || r.id) + ' (' + (String(r.duyet) === 'KHONG_DAT' ? 'CHƯA ĐẠT kiểm duyệt' : 'trạng thái ' + (r.duyet || r.trang_thai)) + (o.diem !== undefined && o.diem !== null ? ', ' + o.diem + '/10' : '') + ')\nhttps://drive.google.com/file/d/' + r.file_video + '/view' +
    (o.van_de && o.van_de.length ? '\nVấn đề: ' + o.van_de.slice(0, 3).join('; ') : '') + '\nCho đăng: /duyet ' + r.id + ' | Sửa: /sua ' + r.id + ' <góp ý> | Bỏ: /bo ' + r.id;
}

// Gemini nhìn LƯỚI KHUNG HÌNH (mỗi phần của quy trình một khung) + ảnh đề nếu có, chấm theo TIÊU CHÍ CỦA BẠN.
// Trả {diem, van_de[], gop_y, loi_nang}. loi_nang = vi phạm tiêu chí bắt buộc (thiếu đề bài, chữ đè/tràn, TeX thô, đáp án sai).
function aiChamVideo_(r) {
  var anhs = [];
  var kt = DriveApp.getFileById(String(r.anh_kt)).getBlob();
  anhs.push({ mime: 'image/jpeg', data: Utilities.base64Encode(kt.getBytes()) });
  var anhDe = typeof anhDeChoGemini_ === 'function' ? anhDeChoGemini_(r) : null;
  if (anhDe) anhs.push(anhDe);
  var kb = {};
  try { kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); } catch (e) {}
  var ds = tieuChiYeuCau_(!!kb.san_pham, 'video');
  if (kb.san_pham && typeof anhSanPhamChoGemini_ === 'function') anhSanPhamChoGemini_(kb.san_pham, 2).forEach(function (a) { anhs.push(a); });
  var canh = (kb.canh || []);
  var moTa = canh.map(function (c, i) { return 'Cảnh ' + (i + 1) + ' (' + c.loai + '): ' + (c.tieu_de_canh || '') + ' | hình: ' + String((c.minh_hoa || {}).mo_ta || '').slice(0, 140); }).join('\n');
  var prompt = 'Bạn là người KIỂM DUYỆT KHẮT KHE video dạy toán TikTok trước khi gửi cho chủ kênh. ẢNH 1 là lưới khung hình của video: MỖI CẢNH MỘT KHUNG theo đúng thứ tự cảnh của kịch bản bên dưới (đọc từ trái sang phải, trên xuống dưới).' + (anhDe ? ' ẢNH 2 là ảnh chụp đề gốc.' : '') +
    '\nĐỀ BÀI: ' + r.de_bai + (r.mo_ta_hinh ? '\nMÔ TẢ HÌNH CỦA ĐỀ: ' + r.mo_ta_hinh : '') + '\nĐÁP ÁN ĐÚNG: ' + (r.dap_an_hien || r.dap_an) + '\nKỊCH BẢN:\n' + moTa + '\n' +
    (kb.khong_thu_lai ? 'KỊCH BẢN GHI KHÔNG THỂ THỬ LẠI VÌ: ' + kb.khong_thu_lai + '\n' : '') +
    (kb.san_pham ? 'SẢN PHẨM QUẢNG BÁ: ' + kb.san_pham.ten + ' (giá kênh bán ' + kb.san_pham.gia_ban + 'đ). Các ảnh sau ảnh lưới là ẢNH THẬT của sản phẩm để đối chiếu.\n' : '') +
    'TIÊU CHÍ CỦA CHỦ KÊNH (chấm mỗi tiêu chí 0-10; CHỈ cho 10 khi HOÀN HẢO TUYỆT ĐỐI; còn một chi tiết nhỏ chưa ổn thì ≤ 9 và ghi rõ; có một lỗi rõ ràng thì ≤ 6; không chắc thì chấm thấp):\n' + moTaTieuChi_(ds) + '\n' +
    'Tự kiểm lại từng phép tính nhìn thấy. "van_de": mỗi vấn đề một câu, nói rõ khung/cảnh nào. "gop_y": chỉ dẫn sửa cụ thể theo từng cảnh của kịch bản.\n' +
    'Trả JSON: {"diem":{' + ds.map(function (t) { return '"' + t.id + '":0'; }).join(',') + '},"van_de":[],"gop_y":""}';
  var j = goiGemini_(prompt, 0.1, { suyNghi: 'low', anhs: anhs });
  if (!j || !j.diem || typeof j.diem !== 'object') throw new Error('AI không trả điểm');
  var kq = tinhDapUng_(j, ds);
  kq.diem = Math.round(kq.phan_tram) / 10;
  return kq;
}


/* ===================== BỘ PHẬN KIỂM DUYỆT YÊU CẦU ===================== */
// Mọi yêu cầu chủ kênh đã đặt ra được gom thành MỘT bảng tiêu chí có trọng số. AI chấm từng tiêu chí 0-10, máy tự tính
// MỨC ĐÁP ỨNG (%) = trung bình có trọng số. Tiêu chí "bắt buộc" dưới 7 điểm = lỗi nặng (không bao giờ gửi bạn).
// Hai cửa: (1) KỊCH BẢN trước khi dựng (đọc chữ, rẻ, chặn sớm hình không bám đề); (2) VIDEO sau khi dựng (nhìn mọi cảnh).
// Chưa đạt -> tự sửa theo nhận xét (tối đa SO_LAN_SUA_YEU_CAU lần mỗi cửa); sửa rồi vẫn thấp -> BỎ VIDEO + XÓA ĐỀ, hệ thống làm đề mới.
var TIEU_CHI_YEU_CAU_ = [
  { id: 'de_bai', w: 1.5, bb: true, kb: true, chu: 'Mở đầu nêu RÕ ĐỀ BÀI: đề cho gì (đủ dữ kiện, đúng số), cần tìm gì; không nhảy thẳng vào lời giải.' },
  { id: 'bam_de', w: 3, bb: true, kb: true, chu: 'Hình minh họa BÁM SÁT NGỮ CẢNH ĐỀ: đúng đối tượng (người, vật, công trình...), đúng số lượng, đúng cách sắp xếp/vị trí (ngồi bàn tròn phải vẽ vòng quanh bàn, bờ sông - đường ống phải vẽ sông và ống...), số đo trên hình khớp đề; không vẽ vật không liên quan, không lặp vật; bài lãi suất / tiền bạc không được có khối hộp, trụ, nón, cầu hay hình học mà đề không nhắc (chỉ ngân hàng, tiền, heo đất, biểu đồ, đồ thị).' },
  { id: 'loi_giai', w: 3, bb: true, kb: true, chu: 'LỜI GIẢI ĐÚNG: mọi phép tính, số trung gian, công thức trên màn hình đúng toán học, dẫn đúng tới đáp án; giải thích công thức có từ đâu.' },
  { id: 'dap_an', w: 2, bb: true, kb: true, chu: 'ĐÁP ÁN đúng (khớp đáp án đã kiểm chứng), hiện rõ, đọc được đầy đủ chữ số và đơn vị.' },
  { id: 'thu_lai', w: 1.5, bb: true, kb: true, chu: 'THỬ LẠI THẬT: cảnh thử lại có phép thử bằng số cụ thể (thế đáp án vào đề / cách thứ hai / so giá trị khác) cả trên màn hình lẫn lời thoại; chỉ một khung chữ "thử lại" là không đạt. Kịch bản ghi rõ "khong_thu_lai" kèm lý do hợp lý thì tiêu chí này đạt.' },
  { id: 'nhieu_canh', w: 1.5, bb: false, kb: true, chu: 'KHAI THÁC NHIỀU CẢNH: mỗi bước của lời giải có hình riêng bám đề (bản vẽ, số đo, mô phỏng); không có cảnh trống trải chỉ có chữ; hình đi theo từng bước lời giải.' },
  { id: 'bo_cuc', w: 2, bb: true, kb: false, chu: 'BỐ CỤC SẠCH: không chữ/hình/người đè lên nhau, không tràn hay bị cắt ở mép, không mã LaTeX thô, chữ đủ to đọc trên điện thoại.' },
  { id: 'tham_my', w: 1, bb: false, kb: false, chu: 'THẨM MỸ: hình hấp dẫn, có chiều sâu, cân đối, màu sắc thống nhất.' },
  { id: 'san_pham', w: 2, bb: true, kb: true, sp: true, chu: 'SẢN PHẨM: đề bài xoay quanh đúng sản phẩm (dùng giá/thông số thật của nó) một cách hợp lý; ẢNH THẬT của sản phẩm xuất hiện rõ (mở đầu + ít nhất một cảnh khác + thẻ cuối); lời quảng cáo tự nhiên, trung thực, không quá đà, không chê đối thủ; vẫn là một bài toán có ích.' }
];
function tieuChiYeuCau_(coSP, giaiDoan) {
  var ds = TIEU_CHI_YEU_CAU_.filter(function (t) { return (!t.sp || coSP) && (giaiDoan !== 'kb' || t.kb); });
  // quy tắc chủ kênh đã dạy qua góp ý: thành một tiêu chí bắt buộc riêng
  var qt = [];
  try { qt = typeof quyTacHocChoKiemDuyet_ === 'function' ? quyTacHocChoKiemDuyet_() || [] : []; } catch (e) { qt = []; }
  if (qt.length) ds = ds.concat([{ id: 'quy_tac_hoc', w: 2, bb: true, kb: true, chu: 'TUÂN THỦ MỌI QUY TẮC CHỦ KÊNH ĐÃ DẠY qua góp ý (vi phạm bất kỳ quy tắc nào là không đạt, ghi rõ quy tắc bị vi phạm): ' + qt.map(function (x, i) { return '(' + (i + 1) + ') ' + x; }).join(' ') }]);
  return ds;
}
// CHỦ KÊNH CHỈ NHẬN VIDEO 10/10: mặc định MỌI tiêu chí phải đạt đúng 10 điểm (DIEM_MOI_TIEU_CHI) và mức đáp ứng 100%.
function nguongDapUng_() { var n = Number(chNC_('MUC_DAP_UNG_TOI_THIEU')); return isFinite(n) && n > 0 ? n : 100; }
function diemMoiTieuChi_() { var n = Number(chNC_('DIEM_MOI_TIEU_CHI')); return isFinite(n) && n > 0 ? Math.min(10, n) : 10; }
function soLanSuaKichBanYC_() { var n = Number(chNC_('SO_LAN_SUA_KICH_BAN_YC')); return isFinite(n) && n >= 0 ? n : 3; }
function soLanSuaYeuCau_() { var n = Number(chNC_('SO_LAN_SUA_YEU_CAU')); return isFinite(n) && n >= 0 ? n : 2; }
function moTaTieuChi_(ds) { return ds.map(function (t) { return '- ' + t.id + (t.bb ? ' (BẮT BUỘC)' : '') + ': ' + t.chu; }).join('\n'); }
// AI trả {"diem":{"id":0-10,...},"van_de":[...],"gop_y":""} -> máy tự tính % đáp ứng (không tin con số tổng của AI)
function tinhDapUng_(j, ds) {
  var d = (j && j.diem && typeof j.diem === 'object') ? j.diem : {};
  var tong = 0, w = 0, nang = [], chiTiet = {}, chuaDu = [], can = diemMoiTieuChi_();
  ds.forEach(function (t) {
    var x = Number(d[t.id]);
    if (!isFinite(x)) x = 0;   // AI bỏ sót tiêu chí = coi như chưa đạt (không cho qua vì thiếu chấm)
    x = Math.max(0, Math.min(10, x));
    chiTiet[t.id] = x; tong += x * t.w; w += t.w;
    if (t.bb && x < 7) nang.push(t.id + '=' + x);
    if (x < can) chuaDu.push(t.id + '=' + x);
  });
  var pt = w ? Math.round(tong / w * 10) : 0;
  return { phan_tram: pt, loi_nang: nang.length > 0, nang: nang.length ? nang : chuaDu, chi_tiet: chiTiet, dat: pt >= nguongDapUng_() && !nang.length && !chuaDu.length,
    van_de: (Array.isArray(j && j.van_de) ? j.van_de : []).map(String).slice(0, 8), gop_y: String((j && j.gop_y) || '').slice(0, 1200) };
}
function tomTatTieuChi_(kq) { return Object.keys(kq.chi_tiet || {}).map(function (k) { return k + ' ' + kq.chi_tiet[k]; }).join(', '); }

// CỬA 1: duyệt KỊCH BẢN trước khi dựng (chỉ đọc chữ). Trả null nếu AI không chấm được (cửa 2 vẫn chặn sau).
function moTaKichBanChoDuyet_(kb) {
  var vatCua = function (c) {
    var du = c && c.minh_hoa && c.minh_hoa.du_lieu;
    var vs = du && Array.isArray(du.vat) ? du.vat : [];
    return vs.slice(0, 14).map(function (v) {
      if (!v) return '';
      var nd = v.noi_dung || v.nhan || v.chu || v.ten || (Array.isArray(v.ds) ? v.ds.join('/') : '') || (v.so !== undefined ? v.so : '');
      return v.loai + (nd !== '' ? '(' + String(nd).slice(0, 40) + ')' : '') + (v.anh !== undefined && v.loai === 'anh_that' ? '[ảnh SP ' + v.anh + ']' : '');
    }).join(', ') + (c.giu_san_khau ? ' [giữ hình cảnh trước]' : '');
  };
  return (kb.canh || []).map(function (c, i) {
    return 'Cảnh ' + (i + 1) + ' [' + c.loai + '] ' + String(c.tieu_de_canh || '') +
      '\n  lời: ' + String(c.loi_thoai || '').slice(0, 260) +
      '\n  màn hình: ' + (c.noi_dung_man_hinh || []).map(String).join(' | ').slice(0, 260) +
      '\n  hình: ' + String((c.minh_hoa || {}).mo_ta || '').slice(0, 200) + ' || vật: ' + vatCua(c);
  }).join('\n').slice(0, 16000);
}
function aiDuyetKichBan_(kb, r, spham) {
  var ds = tieuChiYeuCau_(!!spham, 'kb');
  var prompt = 'Bạn là BỘ PHẬN KIỂM DUYỆT YÊU CẦU của một kênh video dạy toán (TikTok/YouTube/Facebook). Chấm KỊCH BẢN dưới đây TRƯỚC KHI DỰNG, thật khắt khe, theo đúng các yêu cầu của chủ kênh.\n' +
    'ĐỀ BÀI: ' + r.de_bai + (r.mo_ta_hinh ? '\nMÔ TẢ HÌNH CỦA ĐỀ: ' + r.mo_ta_hinh : '') + '\nĐÁP ÁN ĐÃ KIỂM CHỨNG: ' + (r.dap_an_hien || r.dap_an) +
    (kb.khong_thu_lai ? '\nKỊCH BẢN GHI KHÔNG THỂ THỬ LẠI VÌ: ' + kb.khong_thu_lai : '') +
    (spham ? '\nSẢN PHẨM QUẢNG BÁ: ' + spham.ten + ' | giá kênh bán ' + spham.gia_ban + 'đ | thông số đã xác minh: ' + (spham.thong_so || []).join('; ') + ' | số ảnh thật: ' + ((spham.anh || []).length) : '') +
    '\nKỊCH BẢN (' + (kb.canh || []).length + ' cảnh):\n' + moTaKichBanChoDuyet_(kb) + '\n' +
    'TIÊU CHÍ (chấm mỗi tiêu chí 0-10; CHỈ cho 10 khi HOÀN HẢO TUYỆT ĐỐI, không còn bất kỳ điểm nào cần sửa; còn một chi tiết nhỏ chưa ổn thì ≤ 9 và ghi rõ chi tiết đó; có một lỗi rõ ràng thì ≤ 6):\n' + moTaTieuChi_(ds) + '\n' +
    'Tự kiểm lại từng phép tính trên màn hình. "van_de": mỗi vấn đề một câu, ghi rõ cảnh số mấy. "gop_y": chỉ dẫn sửa CỤ THỂ theo từng cảnh (vẽ vật gì, đặt ở đâu, số nào sai sửa thành gì).\n' +
    'Trả JSON: {"diem":{' + ds.map(function (t) { return '"' + t.id + '":0'; }).join(',') + '},"van_de":[],"gop_y":""}';
  var j = goiGemini_(prompt, 0.1, { suyNghi: 'medium' });
  if (!j || !j.diem) return null;
  return tinhDapUng_(j, ds);
}

// Bỏ video + xóa đề (không đạt yêu cầu sau khi đã tự sửa). Đề được dọn khỏi sheet ở lần chạy tới (mã băm lưu lại để không sinh lại).
// Đề sản phẩm: sản phẩm quay về DA_XAC_NHAN để sáng tác đề mới (tối đa 3 lượt). Đề bạn gửi: báo bạn một tin.
function boDeKhongDat_(sh, r, lyDo, giaiDoan) {
  var ghiChu = ('BO_KHONG_DAT (' + giaiDoan + '): ' + lyDo).slice(0, 300);
  if (r.file_video) { try { DriveApp.getFileById(String(r.file_video)).setTrashed(true); } catch (e) {} }
  ghi_(sh, r._row, { trang_thai: 'XOA', duyet: 'BO', ghi_chu: ghiChu });
  r.trang_thai = 'XOA'; r.ghi_chu = ghiChu;
  try { xoaNhapKichBan_(r.id); } catch (e2) {}
  nhatKy_('BO_DE_KHONG_DAT', r.id + ' (' + giaiDoan + '): ' + String(lyDo).slice(0, 250));
  if (giaiDoan === 'video' && typeof ghiKetQuaPhongCach_ === 'function') ghiKetQuaPhongCach_(r.id, false);
  try { PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1'); } catch (e3) {}
}
// gọi từ donDaXong_ trước khi xóa dòng: đề sản phẩm bị bỏ -> sản phẩm sáng tác đề mới
function deMoiChoSanPhamBiBo_(r) {
  if (!/^BO_KHONG_DAT/.test(String(r.ghi_chu || '')) || !r.san_pham) return;
  var sp = null;
  try { sp = JSON.parse(String(r.san_pham)); } catch (e) { return; }
  var shS = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(typeof TEN_SAN_PHAM !== 'undefined' ? TEN_SAN_PHAM : 'SAN_PHAM');
  if (!shS || !sp || !sp.id) return;
  var dong = docSP_(shS).filter(function (x) { return x.id === sp.id; })[0];
  if (!dong || dong.trang_thai === 'BO') return;
  var lan = (Number(dong.so_de) || 0);
  if (lan >= 6) { guiZaloToi_(dong.zalo_chat, '⚠️ Sản phẩm ' + dong.id + ': các bài toán sáng tác vẫn chưa đạt kiểm duyệt nên hệ thống dừng. Bạn gửi thêm ảnh/thông số rõ hơn rồi /sanpham lại nhé.'); return; }
  ghiSP_(shS, dong._row, { trang_thai: 'DA_XAC_NHAN', ghi_chu: 'Đề cũ không đạt kiểm duyệt, sáng tác đề mới' });
  try { henUuTien_(30); } catch (e2) {}
}

// Gửi tin xin duyệt (dùng chung cho mọi đường).
function guiDuyet_(r, ghiChu) {
  var tin = '🎞 Video đã dựng xong: ' + (r.chu_de || r.id) + '\nhttps://drive.google.com/file/d/' + r.file_video + '/view' + (ghiChu ? '\n' + ghiChu : '') +
    '\n👉 Xem rồi trả lời: /duyet ' + r.id + ' (cho đăng) | /sua ' + r.id + ' <góp ý> | /bo ' + r.id;
  if (r.zalo_chat) guiZaloToi_(r.zalo_chat, tin); else guiZaloMotLan_('DUYET_' + r.id + '_' + r.file_video, tin, 'cao');
}

/* ===================== 2. SỐ LIỆU YOUTUBE ===================== */

function shThongKe_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_THONG_KE);
  if (!sh) { sh = ss.insertSheet(TEN_THONG_KE); sh.appendRow(COT_TK); sh.setFrozenRows(1); }
  return sh;
}
function docTK_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_THONG_KE);
  if (!sh) return [];
  var v = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) { var o = { _row: i + 1 }; for (var j = 0; j < COT_TK.length; j++) o[COT_TK[j]] = v[i][j]; if (o.id) out.push(o); }
  return out;
}

// Gọi khi đăng YouTube thành công: ghi một dòng thống kê kèm đặc điểm video (kiểu hook, chủ đề, series, độ dài).
function dangKyThongKe_(r, videoId) {
  try {
    var kb = {};
    try { kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); } catch (e) {}
    shThongKe_().appendRow([r.id, videoId, new Date(), '', '', '', '', '', kb.hook_kieu || '', String(kb.hook_chu || '').slice(0, 100), r.mon || kb.mon || '',
      String(r.chu_de || '').slice(0, 60), kb.series ? kb.series.ten + ' #' + kb.series.tap : '', kb.tong_giay || '', new Date()]);
  } catch (e2) { nhatKy_('THONG_KE_LOI', e2.message); }
}

function capNhatThongKe() {
  if (typeof YouTube === 'undefined') return;
  var sh = shThongKe_();
  var ds = docTK_().filter(function (r) { return r.video_yt && r.ngay_dang instanceof Date && Date.now() - r.ngay_dang.getTime() < 60 * 86400000; });
  for (var i = 0; i < ds.length; i += 50) {
    var nhom = ds.slice(i, i + 50);
    try {
      var res = YouTube.Videos.list('statistics', { id: nhom.map(function (r) { return r.video_yt; }).join(',') });
      (res.items || []).forEach(function (it) {
        var r = nhom.filter(function (x) { return x.video_yt === it.id; })[0];
        if (!r) return;
        var s = it.statistics || {};
        sh.getRange(r._row, COT_TK.indexOf('luot_xem') + 1, 1, 3).setValues([[Number(s.viewCount) || 0, Number(s.likeCount) || 0, Number(s.commentCount) || 0]]);
        sh.getRange(r._row, COT_TK.indexOf('cap_nhat') + 1).setValue(new Date());
      });
    } catch (e) { nhatKy_('THONG_KE_LOI', 'YouTube statistics: ' + e.message); }
  }
  if (typeof YouTubeAnalytics !== 'undefined' && ds.length) {
    try {
      var den = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
      var bq = YouTubeAnalytics.Reports.query({ ids: 'channel==MINE', startDate: '2024-01-01', endDate: den, metrics: 'views,averageViewDuration,averageViewPercentage', dimensions: 'video', filters: 'video==' + ds.slice(0, 200).map(function (r) { return r.video_yt; }).join(','), maxResults: 200 });
      (bq.rows || []).forEach(function (row) {
        var r = ds.filter(function (x) { return x.video_yt === row[0]; })[0];
        if (r) sh.getRange(r._row, COT_TK.indexOf('ty_le_xem') + 1, 1, 2).setValues([[Math.round(Number(row[3]) * 10) / 10, Number(row[2]) || 0]]);
      });
    } catch (e2) { nhatKy_('THONG_KE_LOI', 'YouTube Analytics: ' + e2.message); }
  }
}

// Điểm hiệu quả một video: tỉ lệ xem trung bình (nếu có), không thì lượt xem.
function diemTK_(r) { return Number(r.ty_le_xem) > 0 ? Number(r.ty_le_xem) : Number(r.luot_xem) || 0; }

// Bài học từ số liệu (đưa vào lời nhắc viết kịch bản); '' khi chưa đủ dữ liệu.
function goiYTuSoLieu_() {
  var ds = docTK_().filter(function (r) { return Number(r.luot_xem) > 0; });
  if (ds.length < 6) return '';
  var coTyLe = ds.filter(function (r) { return Number(r.ty_le_xem) > 0; }).length >= ds.length / 2;
  var donVi = coTyLe ? '% xem trung bình' : ' lượt xem trung bình';
  var nhom = function (fn) {
    var g = {};
    ds.forEach(function (r) { var k = fn(r); if (!k) return; (g[k] = g[k] || []).push(diemTK_(r)); });
    return Object.keys(g).filter(function (k) { return g[k].length >= 2; }).map(function (k) { return { k: k, tb: g[k].reduce(function (a, b) { return a + b; }, 0) / g[k].length, n: g[k].length }; })
      .sort(function (a, b) { return b.tb - a.tb; });
  };
  var dong = [];
  var hk = nhom(function (r) { return r.hook_kieu; });
  if (hk.length >= 2) dong.push('Kiểu mở đầu hiệu quả nhất: ' + hk[0].k + ' (' + Math.round(hk[0].tb) + donVi + ', ' + hk[0].n + ' video); kém nhất: ' + hk[hk.length - 1].k + '.');
  var dd = nhom(function (r) { var g = Number(r.giay) || 0; return !g ? '' : g < 60 ? 'dưới 60 giây' : g < 80 ? '60-80 giây' : g < 100 ? '80-100 giây' : 'trên 100 giây'; });
  if (dd.length >= 2) dong.push('Độ dài giữ chân tốt nhất: ' + dd[0].k + '.');
  var mn = nhom(function (r) { return r.mon; });
  if (mn.length >= 2) dong.push('Chủ đề được xem nhiều hơn: ' + mn[0].k + '.');
  var top = ds.slice().sort(function (a, b) { return diemTK_(b) - diemTK_(a); }).slice(0, 2).map(function (r) { return '"' + r.hook_chu + '"'; }).filter(function (x) { return x.length > 4; });
  if (top.length) dong.push('Các câu móc của video tốt nhất: ' + top.join(', ') + ' (học tinh thần, không chép).');
  return dong.length ? 'BÀI HỌC TỪ SỐ LIỆU XEM THẬT CỦA KÊNH (áp dụng nếu hợp với bài): ' + dong.join(' ') + '\n\n' : '';
}

/* ===================== 3. LUÂN PHIÊN KIỂU MỞ ĐẦU ===================== */

var KIEU_HOOK_NC_ = ['sai_lam', 'thach_thuc', 'bat_ngo', 'ket_qua_truoc', 'cau_hoi'];
function chonKieuHook_() {
  if (chNC_('THU_HOOK').toUpperCase() === 'TAT') return '';
  var ds = docTK_().filter(function (r) { return Number(r.luot_xem) > 0 && KIEU_HOOK_NC_.indexOf(r.hook_kieu) >= 0; });
  if (ds.length < 10) {
    var p = PropertiesService.getScriptProperties();
    var k = Number(p.getProperty('HOOK_KE') || 0);
    p.setProperty('HOOK_KE', String(k + 1));
    return KIEU_HOOK_NC_[k % KIEU_HOOK_NC_.length];
  }
  var tk = {};
  KIEU_HOOK_NC_.forEach(function (h) { tk[h] = { n: 0, tong: 0 }; });
  ds.forEach(function (r) { tk[r.hook_kieu].n++; tk[r.hook_kieu].tong += diemTK_(r); });
  if (Math.random() < 0.3) return KIEU_HOOK_NC_.slice().sort(function (a, b) { return tk[a].n - tk[b].n; })[0];   // thử kiểu ít dùng
  return KIEU_HOOK_NC_.filter(function (h) { return tk[h].n > 0; }).sort(function (a, b) { return tk[b].tong / tk[b].n - tk[a].tong / tk[a].n; })[0];
}

/* ===================== 5. SERIES ===================== */

// Phân loại đề -> tên series (cũng là cơ sở của "loại câu hỏi" trên ảnh bìa và danh sách phát).
function tenSeriesTheoDe_(r) {
  var chu = (String(r.de_bai || '') + ' ' + String(r.chu_de || '') + ' ' + String(r.mo_ta_hinh || '')).toLowerCase();
  if (String(r.mon).toUpperCase() === 'HINH_HOC') return 'Hình học kỳ diệu';
  if (String(r.mon).toUpperCase() === 'XAC_SUAT' && !r.san_pham) return 'Xác suất không như bạn nghĩ';
  return r.san_pham ? 'Toán đi chợ'
    : /koch|sierpinski|fractal|bông tuyết|lặp lại|hình vẽ|tam giác|đường tròn|hình vuông|đa giác|lục giác/.test(chu) ? 'Hình học kỳ diệu'
    : /lãi|tiết kiệm|gửi ngân hàng|trả góp|lợi nhuận|doanh thu|giá bán/.test(chu) ? 'Toán và tiền bạc'
    : /nhỏ nhất|lớn nhất|tốn ít|tiết kiệm nhất|tối ưu/.test(chu) ? 'Tối ưu đời thường'
    : /chiều cao|khoảng cách|thang|góc nâng|đo /.test(chu) ? 'Đo đạc thực tế' : 'Toán quanh ta';
}
var LOAI_THEO_SERIES_ = { 'Xác suất không như bạn nghĩ': 'Xác suất', 'Hình học kỳ diệu': 'Hình học', 'Toán và tiền bạc': 'Toán tiền bạc', 'Tối ưu đời thường': 'Tối ưu',
  'Đo đạc thực tế': 'Đo đạc', 'Toán đi chợ': 'Toán đi chợ', 'Toán quanh ta': 'Toán thực tế' };
// Loại câu hỏi (in trên ảnh bìa, dùng chia danh sách phát): Xác suất, Hình học, Tối ưu, Toán tiền bạc, Đo đạc, Toán đi chợ, Toán thực tế.
function phanLoaiCauHoi_(r) { return LOAI_THEO_SERIES_[tenSeriesTheoDe_(r)] || 'Toán thực tế'; }

// SERIES = "Toán lớp N". SỐ TẬP KHÔNG cấp lúc viết kịch bản nữa (trước đây cấp sớm theo 7 chủ đề nên video bị loại / đăng
// không theo thứ tự làm số nhảy lung tung). Số tập được đánh LÚC ĐĂNG: đếm số bài lớp đó đã có trên YouTube/Facebook/TikTok
// (DangVideo.gs + dang_video.py), rồi in "TẬP N" vào video.
function xacDinhSeries_(r) {
  if (chNC_('SERIES').toUpperCase() === 'TAT') return null;
  var lop = String((r && r.lop) || '').replace(/[^0-9]/g, '');
  if (!lop) return null;
  return { ten: 'Toán lớp ' + lop, tap: 0, truoc: '' };
}
function ghiTapCuoiSeries_(se, tieuDe) {
  if (!se) return;
  var p = PropertiesService.getScriptProperties();
  var khoa = 'SERIES_' + se.ten.replace(/\s+/g, '_');
  var daCo = {};
  try { daCo = JSON.parse(p.getProperty(khoa) || '{}'); } catch (e) {}
  daCo.cuoi = String(tieuDe || '').slice(0, 80);
  p.setProperty(khoa, JSON.stringify(daCo));
}

// Các danh sách phát YouTube của một video theo CAU_HINH > PLAYLIST_THEO (mặc định "lop,lop_loai"):
//   lop      -> "Toán lớp 12"            lop_loai -> "Lớp 12 · Xác suất"            series -> tên series ("Hình học kỳ diệu")
function tenPlaylistCua_(lop, loai, series) {
  var ds = [];
  String(chNC_('PLAYLIST_THEO')).toLowerCase().split(/[,;\s]+/).forEach(function (k) {
    if (k === 'lop' && lop) ds.push({ ten: 'Toán lớp ' + lop, mo_ta: 'Video giải toán lớp ' + lop + ' ngắn gọn, dễ hiểu: xác suất, toán thực tế, hình học...' });
    if (k === 'lop_loai' && lop && loai) ds.push({ ten: 'Lớp ' + lop + ' · ' + loai, mo_ta: 'Toán lớp ' + lop + ', chủ đề ' + loai.toLowerCase() + ': giải nhanh, hiểu bản chất.' });
    if (k === 'series' && series) ds.push({ ten: series, mo_ta: 'Series video dạy toán: ' + series });
  });
  return ds;
}
function idPlaylist_(muc) {
  var p = PropertiesService.getScriptProperties();
  var khoa = 'PLAYLIST_' + muc.ten.replace(/[^\wÀ-ỹ]+/g, '_');
  var pl = p.getProperty(khoa);
  if (!pl) {
    pl = YouTube.Playlists.insert({ snippet: { title: muc.ten, description: muc.mo_ta, defaultLanguage: 'vi' }, status: { privacyStatus: 'public' } }, 'snippet,status').id;
    p.setProperty(khoa, pl);
  }
  return pl;
}
// Thêm video YouTube vào các danh sách phát (tạo danh sách nếu chưa có); không thêm trùng.
function themVaoPlaylist_(kb, videoId, r) {
  if (typeof YouTube === 'undefined' || !videoId) return '';
  var lop = String((r && r.lop) || (kb && kb.lop) || '').trim();
  var loai = (kb && kb.loai_cau_hoi) || (r ? phanLoaiCauHoi_(r) : '');
  var ds = tenPlaylistCua_(lop, loai, kb && kb.series ? kb.series.ten : '');
  var p = PropertiesService.getScriptProperties();
  var daThem = [], loi = [];
  ds.forEach(function (muc) {
    try {
      var pl = idPlaylist_(muc);
      var khoa = 'PLI_' + videoId + '_' + pl;
      if (p.getProperty(khoa)) return;
      YouTube.PlaylistItems.insert({ snippet: { playlistId: pl, resourceId: { kind: 'youtube#video', videoId: videoId } } }, 'snippet');
      p.setProperty(khoa, '1');
      daThem.push(muc.ten);
    } catch (e) { loi.push(muc.ten + ' (' + String(e.message).slice(0, 60) + ')'); }
  });
  return (daThem.length ? 'đã thêm vào danh sách phát: ' + daThem.join(', ') : '') + (loi.length ? (daThem.length ? '; ' : '') + 'chưa thêm được: ' + loi.join(', ') : '');
}

// Chạy tay một lần: xếp các video YouTube ĐÃ ĐĂNG trước đây vào danh sách phát theo lớp / loại câu hỏi.
function xepPlaylistVideoCu() {
  if (typeof YouTube === 'undefined') { Logger.log('Chưa bật dịch vụ YouTube Data API v3.'); return; }
  var hang = docHang_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI));
  var n = 0;
  hang.forEach(function (r) {
    var kq = {};
    try { kq = JSON.parse(String(r.link_dang || '{}')); } catch (e) {}
    var vid = kq.youtube && kq.youtube.ok && kq.youtube.id;
    if (!vid) return;
    var kb = {};
    try { kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); } catch (e2) {}
    var t = themVaoPlaylist_(kb, vid, r);
    if (t) { n++; Logger.log(r.id + ': ' + t); }
  });
  Logger.log('Xong: đã xử lý ' + n + ' video.');
}

/* ===================== 6. BÁO CÁO HẰNG NGÀY ===================== */

function baoCaoHangNgay() {
  _bo_nho_cau_hinh_ = null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var homNay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var nk = (ss.getSheetByName('NHAT_KY') ? ss.getSheetByName('NHAT_KY').getDataRange().getValues().slice(1) : [])
    .filter(function (v) { return v[0] instanceof Date && Utilities.formatDate(v[0], 'Asia/Ho_Chi_Minh', 'yyyyMMdd') === homNay; });
  var dem = function (muc, re) { return nk.filter(function (v) { return v[1] === muc && (!re || re.test(String(v[2]))); }).length; };
  var loi = nk.filter(function (v) { return /LOI/.test(String(v[1])); });
  var hang = docHang_(ss.getSheetByName(TEN_HANG_DOI));
  var tt = function (fn) { return hang.filter(fn).length; };
  var dongLoi = {};
  loi.forEach(function (v) { var k = String(v[1]) + ': ' + String(v[2]).replace(/^[A-Z]{2}\d{6}-\d{6}(-\d+)?:\s*/, '').slice(0, 70); dongLoi[k] = (dongLoi[k] || 0) + 1; });
  var tokenTin = '';
  try {
    var p = PropertiesService.getScriptProperties();
    var res = UrlFetchApp.fetch('https://api.github.com/repos/' + p.getProperty('GITHUB_REPO'), { headers: { Authorization: 'Bearer ' + p.getProperty('GITHUB_TOKEN') }, muteHttpExceptions: true });
    var han = typeof hanToken_ === 'function' ? hanToken_(res) : null;
    tokenTin = res.getResponseCode() === 401 ? '❌ HẾT HẠN' : han ? 'còn ' + Math.ceil((han.getTime() - Date.now()) / 86400000) + ' ngày' : 'không hết hạn';
  } catch (e) { tokenTin = 'không kiểm tra được'; }
  var tk = docTK_().filter(function (r) { return r.ngay_dang instanceof Date && Date.now() - r.ngay_dang.getTime() < 7 * 86400000 && Number(r.luot_xem) > 0; })
    .sort(function (a, b) { return diemTK_(b) - diemTK_(a); });
  var nghi = Number(PropertiesService.getScriptProperties().getProperty('NGHI_DEN') || 0) > Date.now();
  var tin = '📊 BÁO CÁO NGÀY ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM') + '\n' +
    '✅ Hôm nay: ' + dem('GIAI', /ĐẠT/) + ' đề giải đạt | ' + dem('KICH_BAN', /đã lưu file/) + ' kịch bản | ' + dem('DUNG_VIDEO', /xong/) + ' video dựng xong | ' + dem('DANG_VIDEO', /đạt [a-z]/) + ' lần đăng\n' +
    '🛡 Kiểm duyệt: ' + dem('KIEM_DUYET') + ' lần bố cục chưa đạt (đã tự sửa) | 🤖 AI chấm video: ' + dem('AI_XEM') + ' lần | tự sửa kịch bản: ' + dem('KICH_BAN_SUA') + ' | máy tự sửa lỗi vặt: ' + dem('KICH_BAN_TU_SUA') + '\n' +
    '📥 Hàng đợi: ' + tt(function (r) { return r.trang_thai === 'MOI'; }) + ' chờ giải, ' + tt(function (r) { return r.trang_thai === 'DA_GIAI'; }) + ' chờ kịch bản, ' +
    tt(function (r) { return r.trang_thai === 'CO_KICH_BAN' || r.trang_thai === 'DANG_DUNG'; }) + ' đang/chờ dựng, ' +
    tt(function (r) { return r.trang_thai === 'CO_VIDEO' && String(r.duyet) !== 'DA_DUYET'; }) + ' CHỜ BẠN DUYỆT, ' + tt(function (r) { return r.trang_thai === 'CO_VIDEO' && String(r.duyet) === 'KHONG_DAT'; }) + ' bị giữ vì chưa đạt kiểm duyệt (/xem <mã>), ' + tt(function (r) { return r.trang_thai === 'CO_VIDEO' && String(r.duyet) === 'DA_DUYET'; }) + ' đã duyệt chờ đăng\n' +
    '⚡ Gemini: ' + dem('QUA_TAI') + ' lần quá tải, ' + dem('HET_HAN_MUC') + ' lần hết hạn mức' + (nghi ? ' (đang tạm nghỉ)' : '') + '\n' +
    '🔑 Token GitHub: ' + tokenTin + '\n' +
    (loi.length ? '⚠️ ' + loi.length + ' lỗi hôm nay: ' + Object.keys(dongLoi).slice(0, 3).map(function (k) { return k + (dongLoi[k] > 1 ? ' (x' + dongLoi[k] + ')' : ''); }).join(' | ') + '\n' : '✨ Không có lỗi nào hôm nay\n') +
    (tk.length ? '🏆 Video nổi bật 7 ngày: ' + tk[0].chu_de + ' (' + tk[0].luot_xem + ' lượt xem' + (Number(tk[0].ty_le_xem) > 0 ? ', xem trung bình ' + tk[0].ty_le_xem + '%' : '') + ')' : '');
  // đổi mới liên tục: mỗi tuần sáng tác thêm một cách dàn cảnh để thử
  var moiDD = '';
  try { moiDD = sangTacDanCanhMoi_(); } catch (eDD) { nhatKy_('DAO_DIEN_LOI', String(eDD.message).slice(0, 150)); }
  // tỉ lệ duyệt 7 ngày (để thấy hệ thống có tiến bộ không)
  var tyLe = '';
  try {
    var tuan = Date.now() - 7 * 86400000;
    var nk7 = (ss.getSheetByName('NHAT_KY') ? ss.getSheetByName('NHAT_KY').getDataRange().getValues().slice(1) : []).filter(function (v) { return v[0] instanceof Date && v[0].getTime() > tuan; });
    var duyet7 = nk7.filter(function (v) { return v[1] === 'DUYET_VIDEO'; }).length, bo7 = nk7.filter(function (v) { return v[1] === 'BO_VIDEO'; }).length;
    if (duyet7 + bo7) tyLe = '📈 7 ngày qua bạn duyệt ' + duyet7 + '/' + (duyet7 + bo7) + ' video (' + Math.round(duyet7 / (duyet7 + bo7) * 100) + '%). Xem phong cách nào được duyệt nhiều: /phongcach\n';
  } catch (eTL) {}
  tin += '\n' + tyLe + (moiDD ? moiDD + '\n' : '');
  guiZalo_(tin, 'cao', 'BAO_CAO_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd'));
}


/* ===================== TỰ HỌC CÁCH EDIT MỖI NGÀY (lần 24) ===================== */
// Mỗi ngày (trigger hocEditHangNgay, mặc định 2 giờ sáng) hệ thống XEM vài video ngắn rồi rút ra kỹ thuật edit, tích lũy vào
// sheet HOC_EDIT; các kỹ thuật hệ thống làm được được đưa vào lời nhắc viết kịch bản (áp dụng ngay cho video sau), kỹ thuật cần
// lập trình thêm được báo qua Zalo. Nguồn video:
//  1. Thư mục Drive <thư mục gốc>/hoc_edit: video bạn lưu từ TikTok (nút "Lưu video" trong TikTok) hoặc bất kỳ đâu -> hệ thống
//     tải lên Gemini để xem. (Hệ thống KHÔNG tự tải video từ TikTok vì điều khoản TikTok cấm tải tự động.)
//  2. Lệnh Zalo "/hoc <link YouTube>": thêm video YouTube vào hàng chờ học.
//  3. Tự tìm trên YouTube Shorts (YouTube Data API, theo HOC_EDIT_TU_KHOA): video ngắn nhiều lượt xem trong 7 ngày.
var TEN_HOC_EDIT = 'HOC_EDIT';
var COT_HE = ['ten', 'nhom', 'mo_ta', 'cach_ap_dung', 'kha_nang', 'diem', 'so_lan', 'nguon', 'lan_dau', 'lan_cuoi', 'ap_dung'];

function shHocEdit_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_HOC_EDIT);
  if (!sh) { sh = ss.insertSheet(TEN_HOC_EDIT); sh.appendRow(COT_HE); sh.setFrozenRows(1); }
  return sh;
}
function thuMucHocEdit_() {
  var goc = thuMucKichBan_().getParents().next();
  var it = goc.getFoldersByName('hoc_edit');
  return it.hasNext() ? it.next() : goc.createFolder('hoc_edit');
}

// Khả năng hiện có của bộ dựng (để Gemini quy kỹ thuật về cái làm được ngay)
var KHA_NANG_DUNG_ = 'Bộ dựng video toán của kênh hiện LÀM ĐƯỢC: chữ tiêu đề 3 tầng hiện từng ký tự (dòng dẫn nghiêng nhỏ / từ chốt cực lớn màu nhấn / dòng đuôi), ' +
  'chữ nổi khối 3D; máy quay đập zoom vào từ khóa, rung khi đóng dấu, lùi ra cuối bài; hình học nổi khối 3D đổi góc nhìn theo nhịp lời (6 góc: cheo_trai, tren_xuong, cheo_phai, thap_chinh_dien, cao_toan_canh, nghieng_nhe); ' +
  'vòng sóng lan ở nhãn, nét vẽ có đầu sao chổi, con dấu BẪY + gạch đỏ viết tay, cửa tròn chuyển cảnh, lóe sáng tia + vòng xung kích ở đáp án, số chạy, công thức biến hình, ' +
  'phụ đề từng từ có ô màu, đường tiến trình có chấm, chuyển cảnh (mo, truot_len, phong, luot_ngang, truot_xuong, lat_3d), nhạc theo tâm trạng cảnh, hiệu ứng âm thanh. ' +
  'Phần KỊCH BẢN điều khiển được: câu móc mở đầu, nhịp và độ dài cảnh, câu nối, cách đặt câu hỏi/bẫy, chọn chuyển cảnh, chọn góc nhìn 3D, chữ chốt của tiêu đề, cách kết bài.';

function hocEditHangNgay() {
  if (String(chNC_('HOC_EDIT')).toUpperCase() === 'TAT') return;
  var bat = Date.now();
  _bat_dau_chay_ = bat;
  _bo_nho_cau_hinh_ = null;
  var props = PropertiesService.getScriptProperties();
  var toiDa = Number(chNC_('HOC_EDIT_SO_VIDEO')) || 3;
  var ds = [];
  // 1) video bạn lưu vào Drive hoc_edit
  try {
    var it = thuMucHocEdit_().getFiles();
    while (it.hasNext() && ds.length < toiDa) {
      var f = it.next();
      if (!/^video\//.test(f.getMimeType()) || props.getProperty('HE_' + f.getId())) continue;
      if (f.getSize() > 45 * 1024 * 1024) { props.setProperty('HE_' + f.getId(), 'qua_lon'); continue; }
      ds.push({ loai: 'drive', id: f.getId(), ten: f.getName() });
    }
  } catch (e) { nhatKy_('HOC_EDIT', 'Không đọc được thư mục hoc_edit: ' + e.message); }
  // 2) link YouTube gửi qua Zalo
  var hang = [];
  try { hang = JSON.parse(props.getProperty('HOC_EDIT_HANG') || '[]'); } catch (e) {}
  while (hang.length && ds.length < toiDa) { var l = hang.shift(); if (!props.getProperty('HE_' + l.id)) ds.push(l); }
  props.setProperty('HOC_EDIT_HANG', JSON.stringify(hang.slice(0, 30)));
  // 3) tự tìm YouTube Shorts nổi bật tuần này
  if (ds.length < toiDa && typeof YouTube !== 'undefined') {
    var tuKhoa = String(chNC_('HOC_EDIT_TU_KHOA')).split('|').map(function (x) { return x.trim(); }).filter(Boolean);
    var q = tuKhoa[Math.floor(Date.now() / 86400000) % Math.max(1, tuKhoa.length)];
    try {
      var kq = YouTube.Search.list('snippet', { q: q, type: 'video', videoDuration: 'short', order: 'viewCount', maxResults: 15,
        publishedAfter: new Date(Date.now() - 7 * 86400000).toISOString(), relevanceLanguage: /[à-ỹ]/i.test(q) ? 'vi' : 'en' });
      (kq.items || []).forEach(function (x) {
        var id = x.id && x.id.videoId;
        if (id && ds.length < toiDa && !props.getProperty('HE_yt_' + id)) ds.push({ loai: 'youtube', id: 'yt_' + id, url: 'https://www.youtube.com/watch?v=' + id, ten: x.snippet.title });
      });
    } catch (e) { nhatKy_('HOC_EDIT', 'Tìm YouTube lỗi: ' + e.message); }
  }
  if (!ds.length) { nhatKy_('HOC_EDIT', 'Hôm nay không có video mới để học'); return; }
  var moi = [], canLapTrinh = [], soVideo = 0;
  for (var i = 0; i < ds.length; i++) {
    if (Date.now() - bat > 4.3 * 60 * 1000) break;
    try {
      var p = xemVideoHocEdit_(ds[i]);
      props.setProperty('HE_' + ds[i].id, new Date().toISOString().slice(0, 10));
      if (!p || !Array.isArray(p.ky_thuat)) continue;
      soVideo++;
      var r = ghiKyThuat_(p.ky_thuat, ds[i].ten || ds[i].url || ds[i].id);
      moi = moi.concat(r.moi);
      canLapTrinh = canLapTrinh.concat(r.canLapTrinh);
    } catch (e) {
      nhatKy_('HOC_EDIT', 'Không xem được ' + (ds[i].ten || ds[i].id) + ': ' + String(e.message).slice(0, 200));
      if (!/HET_GIO|QUA_TAI|HET_HAN_MUC/.test(String(e.message))) props.setProperty('HE_' + ds[i].id, 'loi');
    }
  }
  var tin = '🎓 Học edit hôm nay: xem ' + soVideo + ' video, ' + moi.length + ' kỹ thuật mới.';
  if (moi.length) tin += '\n✅ Áp dụng ngay vào kịch bản:\n' + moi.slice(0, 6).map(function (k) { return '• ' + k; }).join('\n');
  if (canLapTrinh.length) tin += '\n🛠 Cần lập trình thêm cho bộ dựng (nhờ Claude làm khi bạn muốn):\n' + canLapTrinh.slice(0, 5).map(function (k) { return '• ' + k; }).join('\n');
  nhatKy_('HOC_EDIT', tin.replace(/\n/g, ' | ').slice(0, 480));
  if (soVideo) guiZalo_(tin, canLapTrinh.length ? 'vua' : 'thap');
}

function loiNhacHocEdit_() {
  return 'Bạn là biên tập viên video ngắn (TikTok/Shorts) chuyên phân tích KỸ THUẬT EDIT. Xem video này và rút ra các kỹ thuật edit/thiết kế giúp video cuốn hút: ' +
    'mở đầu (3 giây đầu), nhịp cắt, chuyển cảnh, chuyển động máy quay/góc nhìn 3D, chữ động (kinetic typography), bố cục, màu, âm thanh/nhạc, cách giữ chân và kêu gọi tương tác. ' +
    'CHỈ học CÁCH LÀM (kỹ thuật), không chép nội dung, nhân vật, thương hiệu, nhạc có bản quyền.\n' + KHA_NANG_DUNG_ + '\n' +
    'Với mỗi kỹ thuật, cho biết cách áp dụng vào video GIẢI TOÁN của kênh và "kha_nang": "co_san" (bộ dựng đã làm được, chỉ cần kịch bản dùng đúng), "qua_kich_ban" (áp dụng được bằng cách viết kịch bản khác đi), ' +
    'hoặc "can_lap_trinh" (cần lập trình thêm hiệu ứng mới). "diem" 1-10 = mức đáng học cho video toán (rối mắt, chóng mặt, câu view rẻ tiền thì điểm thấp).\n' +
    'Trả JSON: {"tom_tat":"1 câu","ky_thuat":[{"ten":"tên ngắn 3-7 chữ","nhom":"mo_dau|nhip|chuyen_canh|may_quay|chu|bo_cuc|mau|am_thanh|tuong_tac","mo_ta":"làm thế nào, thấy ở giây nào","cach_ap_dung":"áp dụng vào video toán ra sao (1-2 câu cụ thể)","kha_nang":"co_san|qua_kich_ban|can_lap_trinh","diem":8}]} (tối đa 6 kỹ thuật, ưu tiên cái đáng học nhất).';
}

// Gemini xem video: YouTube dùng thẳng URL; video Drive tải lên Gemini Files API (cùng key cho tải lên và hỏi).
function xemVideoHocEdit_(v) {
  var key = khoDanhSachKey_()[0];
  if (!key) throw new Error('THIEU_GEMINI_API_KEY');
  var model = cauHinh_('MODEL_CHINH');
  var phan;
  if (v.loai === 'youtube') phan = [{ file_data: { file_uri: v.url, mime_type: 'video/mp4' } }];
  else {
    var blob = DriveApp.getFileById(v.id).getBlob();
    var up = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=media&key=' + encodeURIComponent(key), {
      method: 'post', contentType: blob.getContentType() || 'video/mp4', payload: blob.getBytes(), muteHttpExceptions: true });
    if (up.getResponseCode() !== 200) throw new Error('Tải video lên Gemini lỗi HTTP ' + up.getResponseCode() + ': ' + up.getContentText().slice(0, 150));
    var tep = JSON.parse(up.getContentText()).file;
    for (var k = 0; k < 20 && tep.state !== 'ACTIVE'; k++) {   // chờ Gemini xử lý video (tối đa ~100 giây)
      if (tep.state === 'FAILED') throw new Error('Gemini không xử lý được video');
      Utilities.sleep(5000);
      tep = JSON.parse(UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/' + tep.name + '?key=' + encodeURIComponent(key), { muteHttpExceptions: true }).getContentText());
    }
    if (tep.state !== 'ACTIVE') throw new Error('Gemini xử lý video quá lâu');
    phan = [{ file_data: { file_uri: tep.uri, mime_type: tep.mimeType || 'video/mp4' } }];
  }
  var body = { contents: [{ parts: phan.concat([{ text: loiNhacHocEdit_() }]) }], generationConfig: { temperature: 0.4, responseMimeType: 'application/json' } };
  var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Gemini HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 150));
  return docKetQua_(res.getContentText());
}

// Gộp kỹ thuật trùng tên (tích lũy số lần gặp); trả về danh sách kỹ thuật mới để báo cáo.
function ghiKyThuat_(ds, nguon) {
  var sh = shHocEdit_();
  var v = sh.getDataRange().getValues();
  var chiSo = {};
  for (var i = 1; i < v.length; i++) chiSo[String(v[i][0]).toLowerCase().trim()] = i + 1;
  var homNay = new Date();
  var moi = [], canLapTrinh = [];
  ds.slice(0, 6).forEach(function (k) {
    if (!k || !k.ten) return;
    var ten = String(k.ten).trim().slice(0, 60), khoa = ten.toLowerCase();
    var kn = /can_lap_trinh/.test(k.kha_nang) ? 'can_lap_trinh' : /qua_kich_ban/.test(k.kha_nang) ? 'qua_kich_ban' : 'co_san';
    var diem = Math.max(1, Math.min(10, Number(k.diem) || 5));
    if (chiSo[khoa]) {
      var r = chiSo[khoa];
      var cu = sh.getRange(r, 1, 1, COT_HE.length).getValues()[0];
      var soLan = (Number(cu[6]) || 1) + 1;
      var diemCu = Number(cu[5]) || diem;
      sh.getRange(r, 6, 1, 5).setValues([[Math.round((diemCu * (soLan - 1) + diem) / soLan * 10) / 10, soLan, String(nguon).slice(0, 80), cu[8] || homNay, homNay]]);
    } else {
      sh.appendRow([ten, String(k.nhom || ''), String(k.mo_ta || '').slice(0, 300), String(k.cach_ap_dung || '').slice(0, 300), kn, diem, 1, String(nguon).slice(0, 80), homNay, homNay, diem >= 6 && kn !== 'can_lap_trinh' ? 'BAT' : 'TAT']);
      chiSo[khoa] = sh.getLastRow();
      if (diem >= 6) (kn === 'can_lap_trinh' ? canLapTrinh : moi).push(ten + ': ' + String(k.cach_ap_dung || '').slice(0, 120));
    }
  });
  return { moi: moi, canLapTrinh: canLapTrinh };
}

// Khối "BÀI HỌC EDIT" đưa vào lời nhắc viết kịch bản: các kỹ thuật đang BẬT, điểm cao, gặp nhiều lần, ưu tiên mới học.
// Mỗi video chỉ áp 4 kỹ thuật, xoay vòng theo ngày để video không cái nào giống cái nào. Tắt một kỹ thuật: cột ap_dung = TAT.
function hocEditChoPrompt_() {
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HOC_EDIT);
    if (!sh || sh.getLastRow() < 2) return '';
    var ds = sh.getDataRange().getValues().slice(1).filter(function (x) { return String(x[10]).toUpperCase() === 'BAT' && x[4] !== 'can_lap_trinh'; })
      .map(function (x) {
        var ngay = x[9] instanceof Date ? (Date.now() - x[9].getTime()) / 86400000 : 30;
        return { ten: x[0], cach: x[3], diem: Number(x[5]) * (1 + Math.log(1 + Number(x[6]))) * (ngay < 7 ? 1.3 : 1) };
      }).sort(function (a, b) { return b.diem - a.diem; }).slice(0, 12);
    if (!ds.length) return '';
    var lech = Math.floor(Date.now() / 86400000) % ds.length;
    var chon = ds.slice(lech).concat(ds.slice(0, lech)).slice(0, 4);
    return 'BÀI HỌC EDIT HỆ THỐNG TỰ HỌC TỪ CÁC VIDEO NGẮN NỔI BẬT (áp dụng tự nhiên vào video này, không làm rối mắt, không phá các quy tắc ở trên):\n' +
      chon.map(function (k) { return '- ' + k.ten + ': ' + k.cach; }).join('\n') + '\n';
  } catch (e) { return ''; }
}

// Lệnh Zalo: /hoc <link YouTube> (TikTok: lưu video vào thư mục Drive hoc_edit)
function nhanLenhHoc_(chu) {
  var m = /(youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([A-Za-z0-9_-]{6,})/.exec(String(chu));
  if (!m) {
    if (/tiktok\.com/i.test(chu)) return '📥 Video TikTok: bạn bấm "Lưu video" trong TikTok rồi tải vào thư mục Drive "hoc_edit" (cạnh thư mục kịch bản). Mỗi đêm hệ thống tự xem và học (hệ thống không tự tải từ TikTok vì điều khoản TikTok không cho phép).';
    return 'Cách dùng: /hoc <link YouTube>. Video TikTok/Facebook: lưu về máy rồi tải vào thư mục Drive "hoc_edit".';
  }
  var props = PropertiesService.getScriptProperties();
  var hang = [];
  try { hang = JSON.parse(props.getProperty('HOC_EDIT_HANG') || '[]'); } catch (e) {}
  hang.push({ loai: 'youtube', id: 'yt_' + m[2], url: 'https://www.youtube.com/watch?v=' + m[2], ten: 'YouTube ' + m[2] });
  props.setProperty('HOC_EDIT_HANG', JSON.stringify(hang.slice(-30)));
  return '📚 Đã thêm vào hàng chờ học edit (' + hang.length + ' video). Hệ thống xem lúc ' + chNC_('HOC_EDIT_GIO') + ' giờ sáng và báo kết quả qua Zalo. Muốn học ngay: chạy hocEditHangNgay() trong Apps Script.';
}

/* ===================== HỌC TỪ GÓP Ý CỦA CHỦ KÊNH (liên tục học, áp dụng cho các video sau) =====================
 * Mỗi góp ý qua Zalo (/sua <mã> <góp ý>, /bo <mã> <lý do>, /gopy <góp ý chung>) được ghi vào sheet HOC_GOP_Y rồi Gemini đọc
 * cùng kịch bản của video đó để HIỂU Ý ĐỒ của bạn (không chỉ sửa đúng chỗ đó) và rút thành QUY TẮC CHUNG cho mọi video sau.
 * Quy tắc trùng ý được GỘP (đếm số lần bạn nhắc - nhắc càng nhiều càng ưu tiên). Bot nhắn lại "Đã hiểu: ..." để bạn kiểm tra.
 * Áp dụng ở 2 nơi: (1) lời nhắc viết kịch bản (bắt buộc làm theo); (2) Bộ phận kiểm duyệt yêu cầu chấm thêm tiêu chí
 * "quy_tac_hoc" (bắt buộc 10/10) - video vi phạm quy tắc bạn đã dạy không bao giờ được gửi.
 * Lệnh: /quytac (xem danh sách), /xoaquytac <số> (bỏ quy tắc hiểu sai), /gopy <góp ý chung không gắn video nào>.
 */
var TEN_HOC_GOP_Y = 'HOC_GOP_Y';
var COT_HGY = ['luc', 'ma', 'loai', 'gop_y', 'trang_thai', 'y_do', 'quy_tac'];
var TEN_QUY_TAC_HOC = 'QUY_TAC_HOC';
var COT_QTH = ['so', 'nhom', 'quy_tac', 'cach_kiem', 'y_do', 'so_lan', 'lan_dau', 'lan_cuoi', 'bat'];
function shHGY_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_HOC_GOP_Y);
  if (!sh) { sh = ss.insertSheet(TEN_HOC_GOP_Y); sh.appendRow(COT_HGY); sh.setFrozenRows(1); }
  return sh;
}
function shQTH_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_QUY_TAC_HOC);
  if (!sh) { sh = ss.insertSheet(TEN_QUY_TAC_HOC); sh.appendRow(COT_QTH); sh.setFrozenRows(1); }
  return sh;
}
function docQuyTacHoc_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_QUY_TAC_HOC);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getDataRange().getValues().slice(1).map(function (v, i) {
    var o = { _row: i + 2 };
    COT_QTH.forEach(function (k, j) { o[k] = v[j]; });
    return o;
  }).filter(function (o) { return o.quy_tac && String(o.bat).toUpperCase() !== 'TAT'; });
}
// ghi góp ý vào hàng chờ học (gọi từ lệnh Zalo: không gọi Gemini ngay để bot trả lời nhanh)
function ghiGopYDeHoc_(ma, loai, gopY, chat) {
  try {
    if (!String(gopY || '').trim() || String(gopY).trim().length < 4) return;
    shHGY_().appendRow([new Date(), ma || '', loai, String(gopY).slice(0, 1500), 'CHO', '', '']);
    if (chat) PropertiesService.getScriptProperties().setProperty('HOC_GOP_Y_CHAT', String(chat));
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'xuLyHocGopY') ScriptApp.deleteTrigger(t); });
    ScriptApp.newTrigger('xuLyHocGopY').timeBased().after(30 * 1000).create();
  } catch (e) { nhatKy_('HOC_GOP_Y_LOI', String(e.message).slice(0, 200)); }
}
// chạy theo trigger: học từng góp ý đang chờ
function xuLyHocGopY() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'xuLyHocGopY') ScriptApp.deleteTrigger(t); });
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(20000)) { ScriptApp.newTrigger('xuLyHocGopY').timeBased().after(90 * 1000).create(); return; }
  try {
    _bo_nho_cau_hinh_ = null;
    var sh = shHGY_();
    var v = sh.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      if (v[i][4] !== 'CHO') continue;
      var kq = null;
      try { kq = hocMotGopY_(String(v[i][1] || ''), String(v[i][2] || ''), String(v[i][3] || '')); }
      catch (e) {
        if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e.message))) { ScriptApp.newTrigger('xuLyHocGopY').timeBased().after(30 * 60 * 1000).create(); return; }
        nhatKy_('HOC_GOP_Y_LOI', String(e.message).slice(0, 200));
      }
      sh.getRange(i + 1, 5, 1, 3).setValues([[kq ? 'DA_HOC' : 'LOI', kq ? kq.y_do : '', kq ? kq.tom_tat : '']]);
      if (kq && kq.tom_tat) {
        var chat = PropertiesService.getScriptProperties().getProperty('HOC_GOP_Y_CHAT');
        var tin = '🧠 Đã hiểu góp ý' + (v[i][1] ? ' (' + v[i][1] + ')' : '') + ': ' + kq.y_do + '\n📌 Quy tắc áp dụng cho MỌI video sau:\n' + kq.tom_tat +
          '\n(Hiểu sai thì nhắn /xoaquytac <số>, xem tất cả: /quytac)';
        if (chat) guiZaloToi_(chat, tin); else guiZalo_(tin, 'vua');
      }
    }
  } finally { khoa.releaseLock(); }
}
// Gemini đọc góp ý + kịch bản video đó + các quy tắc đã có -> ý đồ thật sự + quy tắc chung (gộp quy tắc trùng ý)
function hocMotGopY_(ma, loai, gopY) {
  var boiCanh = '';
  if (ma) {
    try {
      var shH = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
      var r = docHang_(shH).filter(function (x) { return x.id === ma; })[0];
      if (r) {
        boiCanh = 'ĐỀ CỦA VIDEO: ' + String(r.de_bai || '').slice(0, 500);
        if (r.file_kich_ban) { var kb = JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()); boiCanh += '\nKỊCH BẢN VIDEO ĐÓ:\n' + moTaKichBanChoDuyet_(kb).slice(0, 7000); }
      }
    } catch (e) {}
  }
  var cu = docQuyTacHoc_();
  var prompt = 'Bạn là trợ lý của chủ một kênh video dạy toán ngắn (TikTok/YouTube/Facebook). Chủ kênh vừa góp ý về một video (' + (loai === 'bo' ? 'bỏ video' : loai === 'gopy' ? 'góp ý chung' : 'yêu cầu sửa') + '):\n' +
    '"' + gopY + '"\n' + (boiCanh ? boiCanh + '\n' : '') +
    'Nhiệm vụ:\n1) "y_do": hiểu Ý ĐỒ THẬT SỰ phía sau góp ý (chủ kênh muốn đạt điều gì cho người xem, vì sao chỗ đó chưa ổn) - một câu ngắn, rõ.\n' +
    '2) Rút ra QUY TẮC CHUNG áp dụng cho MỌI video sau (không chỉ video này): viết như mệnh lệnh cụ thể mà người viết kịch bản / dựng video làm theo được, ' +
    'và "cach_kiem": cách người kiểm duyệt nhìn video/kịch bản để biết đã làm đúng chưa. Chỉ rút quy tắc thật sự suy ra được từ góp ý; tối đa 3 quy tắc.\n' +
    '3) Nếu quy tắc mới TRÙNG Ý một quy tắc đã có thì KHÔNG tạo mới mà ghi vào "trung" kèm "so" của quy tắc cũ (có thể viết lại quy tắc cũ rõ hơn trong "quy_tac").\n' +
    'CÁC QUY TẮC ĐÃ CÓ:\n' + (cu.length ? cu.map(function (q) { return q.so + '. [' + q.nhom + '] ' + q.quy_tac; }).join('\n') : '(chưa có)') + '\n' +
    'Nhóm: hinh (hình minh họa / vật), loi_giai (lời giải, công thức), loi_thoai (câu chữ, giọng văn), bo_cuc (bố cục, chữ, màu), nhip (tốc độ, độ dài), am_thanh, noi_dung (chọn đề, chủ đề), khac.\n' +
    'Trả JSON: {"y_do":"","quy_tac":[{"nhom":"","quy_tac":"","cach_kiem":"","trung":0}]}';
  var j = goiGemini_(prompt, 0.2, { suyNghi: 'low' });
  if (!j || !Array.isArray(j.quy_tac)) return null;
  var sh = shQTH_(), bayGio = new Date(), tom = [];
  var tatCa = docQuyTacHoc_();
  var soLonNhat = tatCa.reduce(function (m, q) { return Math.max(m, Number(q.so) || 0); }, 0);
  try { var vAll = sh.getDataRange().getValues().slice(1); vAll.forEach(function (x) { soLonNhat = Math.max(soLonNhat, Number(x[0]) || 0); }); } catch (e) {}
  j.quy_tac.slice(0, 3).forEach(function (q) {
    if (!q || !String(q.quy_tac || '').trim()) return;
    var cuQ = Number(q.trung) > 0 ? tatCa.filter(function (x) { return Number(x.so) === Number(q.trung); })[0] : null;
    if (cuQ) {
      sh.getRange(cuQ._row, 3, 1, 6).setValues([[String(q.quy_tac).slice(0, 400), String(q.cach_kiem || cuQ.cach_kiem).slice(0, 300), String(j.y_do || cuQ.y_do).slice(0, 300), (Number(cuQ.so_lan) || 1) + 1, cuQ.lan_dau, bayGio]]);
      tom.push(cuQ.so + '. ' + String(q.quy_tac).slice(0, 200) + ' (bạn đã nhắc ' + ((Number(cuQ.so_lan) || 1) + 1) + ' lần)');
    } else {
      soLonNhat++;
      sh.appendRow([soLonNhat, String(q.nhom || 'khac').slice(0, 20), String(q.quy_tac).slice(0, 400), String(q.cach_kiem || '').slice(0, 300), String(j.y_do || '').slice(0, 300), 1, bayGio, bayGio, 'BAT']);
      tom.push(soLonNhat + '. ' + String(q.quy_tac).slice(0, 200));
    }
  });
  nhatKy_('HOC_GOP_Y', (ma || 'chung') + ': ' + String(j.y_do || '').slice(0, 150) + ' | ' + tom.join(' | ').slice(0, 300));
  return { y_do: String(j.y_do || '').slice(0, 300), tom_tat: tom.join('\n') };
}
// quy tắc đã học -> đưa vào lời nhắc viết kịch bản (ưu tiên quy tắc được nhắc nhiều lần và mới nhắc)
function quyTacHocChoPrompt_() {
  try {
    var ds = docQuyTacHoc_().sort(function (a, b) {
      return (Number(b.so_lan) || 1) - (Number(a.so_lan) || 1) || new Date(b.lan_cuoi).getTime() - new Date(a.lan_cuoi).getTime();
    }).slice(0, 25);
    if (!ds.length) return '';
    return 'QUY TẮC CHỦ KÊNH ĐÃ DẠY QUA CÁC LẦN GÓP Ý (BẮT BUỘC làm theo, ưu tiên hơn gợi ý khác; người kiểm duyệt chấm riêng từng quy tắc):\n' +
      ds.map(function (q) { return '- [' + q.nhom + '] ' + q.quy_tac + ((Number(q.so_lan) || 1) > 1 ? ' (đã nhắc ' + q.so_lan + ' lần)' : ''); }).join('\n') + '\n';
  } catch (e) { return ''; }
}
function quyTacHocChoKiemDuyet_() {
  try {
    return docQuyTacHoc_().slice(0, 25).map(function (q) { return q.quy_tac + (q.cach_kiem ? ' (kiểm: ' + q.cach_kiem + ')' : ''); });
  } catch (e) { return []; }
}
// lệnh Zalo
function danhSachQuyTac_() {
  var ds = docQuyTacHoc_();
  if (!ds.length) return '📭 Chưa có quy tắc nào. Mỗi lần bạn góp ý (/sua, /bo kèm lý do, /gopy) hệ thống tự rút quy tắc.';
  return '📚 Quy tắc đã học từ góp ý của bạn (' + ds.length + '):\n' + ds.map(function (q) { return q.so + '. [' + q.nhom + '] ' + String(q.quy_tac).slice(0, 160) + ((Number(q.so_lan) || 1) > 1 ? ' ×' + q.so_lan : ''); }).join('\n').slice(0, 3500) +
    '\nBỏ quy tắc hiểu sai: /xoaquytac <số>';
}
function xoaQuyTac_(chu) {
  var so = Number(String(chu).replace(/[^\d]/g, ''));
  var q = docQuyTacHoc_().filter(function (x) { return Number(x.so) === so; })[0];
  if (!q) return 'Không thấy quy tắc số ' + (so || '?') + '. Nhắn /quytac để xem danh sách.';
  shQTH_().getRange(q._row, COT_QTH.indexOf('bat') + 1).setValue('TAT');
  return '🗑 Đã bỏ quy tắc ' + so + ': ' + String(q.quy_tac).slice(0, 150);
}
function nhanGopYChung_(chat, chu) {
  var nd = String(chu || '').replace(/^\s*\/gopy\s*/i, '').trim();
  if (nd.length < 5) return 'Cách dùng: /gopy <góp ý chung cho mọi video>, ví dụ: /gopy câu nối giữa các bước đừng lặp lại giống nhau';
  ghiGopYDeHoc_('', 'gopy', nd, chat);
  return '✍️ Đã nhận góp ý, hệ thống đang học và sẽ nhắn lại quy tắc rút ra (khoảng 1 phút).';
}

/* ===================== ĐA DẠNG: PHONG CÁCH LỜI + GÓI EDIT (luân phiên theo quy tắc, không ngẫu nhiên) =====================
 * Mỗi video nhận MỘT phong cách lời (cách dẫn dắt, kiểu câu nối) và MỘT gói edit (nền, chuyển cảnh, kiểu phụ đề, phông công thức),
 * hai vòng luân phiên độ dài khác nhau (6 và 4) nên tổ hợp lặp lại sau 12 video. Gói edit chỉ đổi "trang phục", không đổi bố cục,
 * nên các lỗi bạn đã nhắc (chữ đè, tràn, vật đè nhau) không quay lại; kiểm duyệt bố cục + kiểm duyệt 10/10 vẫn chạy như cũ.
 * Câu mở đầu cảnh của các video gần đây được nhớ lại để video mới KHÔNG lặp lại y nguyên.
 */
var PHONG_CACH_LOI_ = [
  { id: 'ke_chuyen', ten: 'KỂ CHUYỆN', chu: 'dẫn dắt như kể một câu chuyện có nhân vật và tình huống; câu nối theo diễn biến ("Rồi rắc rối bắt đầu...", "Đến đây An mới nhận ra...").' },
  { id: 'thach_do', ten: 'THÁCH ĐỐ', chu: 'mỗi bước mở bằng một câu hỏi thách người xem đoán trước rồi mới giải ("Bạn đoán xem bước này ra bao nhiêu?", "Dừng 3 giây thử nghĩ...").' },
  { id: 'tham_tu', ten: 'THÁM TỬ', chu: 'như thám tử lần theo manh mối: dữ kiện là "manh mối", cái bẫy là "kẻ đánh lạc hướng", đáp án là "lời giải của vụ án" (vừa phải, không lố).' },
  { id: 'ban_than', ten: 'BẠN THÂN', chu: 'như một người bạn ngồi giải cùng, giọng đời thường, câu ngắn, có cảm thán tự nhiên ("Ơ, khoan đã!", "Thấy chưa, dễ mà!").' },
  { id: 'meo_nhanh', ten: 'MẸO NHANH', chu: 'nhịp gọn, nhấn mạnh mẹo và lối tắt, câu nối dứt khoát ("Mẹo ở đây là...", "Lối tắt:", "Chốt nhanh:").' },
  { id: 'thay_vui', ten: 'THẦY GIÁO VUI TÍNH', chu: 'giải thích kỹ nhưng dí dỏm, ví von đời thường (so sánh với đi chợ, xếp hàng, chơi game...), câu nối thân mật.' }
];
var GOI_EDIT_ = ['nang_dong', 'toi_gian', 'dien_anh', 'so_tay'];
// CÁCH DÀN CẢNH (cấu trúc hình ảnh của cả video) - thư viện gốc; hệ thống tự sáng tác thêm cách mới theo thời gian (DAO_DIEN_MOI)
var DAN_CANH_GOC_ = [
  { id: 'mot_hinh_bien_doi', ten: 'MỘT HÌNH BIẾN ĐỔI', chu: 'một hình chính xuyên suốt (giu_san_khau), mỗi cảnh thêm/biến đổi đúng MỘT lớp trên hình đó (số đo hiện ra, phần tô màu, đường phụ...).' },
  { id: 'so_sanh_song_song', ten: 'SO SÁNH SONG SONG', chu: 'đặt hai phương án / cách sai và cách đúng cạnh nhau (trái - phải) rồi loại dần phương án sai; người xem tự so sánh bằng mắt.' },
  { id: 'phong_to_chi_tiet', ten: 'TOÀN CẢNH - CẬN CẢNH', chu: 'mở bằng toàn cảnh đời thật, phóng to (phong_to) vào đúng chi tiết then chốt khi giải, cuối cùng thu về toàn cảnh với đáp số gắn đúng chỗ.' },
  { id: 'hanh_trinh', ten: 'HÀNH TRÌNH', chu: 'một nhân vật đi qua các "chặng" (mỗi bước giải là một chặng, có thẻ/biểu tượng đánh dấu chặng), về đích là đáp án.' },
  { id: 'dem_nguoc', ten: 'THỬ THÁCH ĐẾM NGƯỢC', chu: 'trước mỗi bước quan trọng đặt câu hỏi + đồng hồ (dong_ho) đếm ngược 3 giây cho người xem tự đoán, rồi mới lật kết quả.' },
  { id: 'lat_the', ten: 'LẬT THẺ MANH MỐI', chu: 'các dữ kiện / bước giải là những thẻ (the) úp, lần lượt lật từng thẻ để mở manh mối; thẻ cuối là đáp án.' },
  { id: 'thu_va_sai', ten: 'THỬ VÀ SAI', chu: 'thử vài giá trị/cách làm (bảng, biểu đồ cột, đồ thị) để thấy quy luật, chỉ ra vì sao các lần thử đầu chưa đúng rồi mới tìm ra cách đúng.' },
  { id: 'dao_nguoc', ten: 'BẮT ĐẦU TỪ KẾT QUẢ', chu: 'hé lộ đáp số gây bất ngờ ngay đầu (hook), rồi lần ngược lại từng bước để chứng minh vì sao lại ra như vậy.' }
];
// thống kê duyệt/bỏ theo từng phong cách (lời / dàn cảnh / edit) -> chọn phong cách bằng UCB: hay được duyệt thì dùng nhiều hơn,
// vẫn chừa chỗ thử phong cách ít dùng; không lặp lại đúng phong cách của video liền trước.
function docThongKeDD_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('DAO_DIEN_THONG_KE') || '{}'); } catch (e) { return {}; } }
function dsDanCanh_() {
  var moi = [];
  try { moi = JSON.parse(PropertiesService.getScriptProperties().getProperty('DAO_DIEN_MOI') || '[]'); } catch (e) { moi = []; }
  var bo = {};
  try { bo = JSON.parse(PropertiesService.getScriptProperties().getProperty('DAO_DIEN_LOAI') || '{}'); } catch (e2) { bo = {}; }
  return DAN_CANH_GOC_.concat(moi).filter(function (x) { return x && x.id && !bo[x.id]; });
}
function chonUCB_(chieu, ds, truoc) {
  var tk = (docThongKeDD_()[chieu]) || {};
  var tong = ds.reduce(function (s0, x) { var o = tk[x.id || x] || {}; return s0 + (o.ok || 0) + (o.bo || 0); }, 0);
  var tot = null, diemTot = -1e9;
  ds.forEach(function (x, i) {
    var id = x.id || x;
    if (ds.length > 1 && id === truoc) return;   // không lặp phong cách của video liền trước
    var o = tk[id] || {}, n = (o.ok || 0) + (o.bo || 0);
    var d = ((o.ok || 0) + 1) / (n + 2) + 0.7 * Math.sqrt(Math.log(tong + 2) / (n + 1)) + i * 1e-6;
    if (d > diemTot) { diemTot = d; tot = x; }
  });
  return tot || ds[0];
}
function chonPhongCachVideo_(r) {
  var p = PropertiesService.getScriptProperties();
  var nho = {};
  try { nho = JSON.parse(p.getProperty('PHONG_CACH_THEO_VIDEO') || '{}'); } catch (e) { nho = {}; }
  if (r && r.id && nho[r.id]) return nho[r.id];            // cùng một video dựng lại: giữ nguyên phong cách đã chọn
  var truoc = {};
  try { truoc = JSON.parse(p.getProperty('PHONG_CACH_TRUOC') || '{}'); } catch (e1) { truoc = {}; }
  var loi = chonUCB_('loi', PHONG_CACH_LOI_, truoc.loi);
  var dc = chonUCB_('dan', dsDanCanh_(), truoc.dan);
  var ed = chonUCB_('edit', GOI_EDIT_, truoc.edit);
  var kq = { loi_id: loi.id, loi_ten: loi.ten, loi_chu: loi.chu, dan_id: dc.id, dan_ten: dc.ten, dan_chu: dc.chu, edit: ed };
  p.setProperty('PHONG_CACH_TRUOC', JSON.stringify({ loi: loi.id, dan: dc.id, edit: ed }));
  if (r && r.id) {
    nho[r.id] = kq;
    var ids = Object.keys(nho);
    if (ids.length > 200) ids.slice(0, ids.length - 200).forEach(function (k) { delete nho[k]; });
    p.setProperty('PHONG_CACH_THEO_VIDEO', JSON.stringify(nho));
  }
  return kq;
}
// kết quả của một video (bạn duyệt = tốt; bạn bỏ / không đạt kiểm duyệt = chưa tốt) -> cộng vào thống kê phong cách của video đó
function ghiKetQuaPhongCach_(id, tot) {
  try {
    var p = PropertiesService.getScriptProperties();
    var nho = JSON.parse(p.getProperty('PHONG_CACH_THEO_VIDEO') || '{}');
    var pc = nho[id];
    if (!pc || pc._da_ghi) return;
    var tk = docThongKeDD_();
    [['loi', pc.loi_id], ['dan', pc.dan_id], ['edit', pc.edit]].forEach(function (c) {
      if (!c[1]) return;
      tk[c[0]] = tk[c[0]] || {};
      var o = tk[c[0]][c[1]] = tk[c[0]][c[1]] || { ok: 0, bo: 0 };
      if (tot) o.ok++; else o.bo++;
    });
    p.setProperty('DAO_DIEN_THONG_KE', JSON.stringify(tk));
    pc._da_ghi = true; nho[id] = pc;
    p.setProperty('PHONG_CACH_THEO_VIDEO', JSON.stringify(nho));
    loaiDanCanhKem_(tk);
  } catch (e) { nhatKy_('DAO_DIEN_LOI', String(e.message).slice(0, 150)); }
}
// cách dàn cảnh dùng >= 6 lần mà tỉ lệ được duyệt < 25% -> ngừng dùng (giữ ít nhất 4 cách)
function loaiDanCanhKem_(tk) {
  var p = PropertiesService.getScriptProperties();
  var bo = {};
  try { bo = JSON.parse(p.getProperty('DAO_DIEN_LOAI') || '{}'); } catch (e) { bo = {}; }
  var con = dsDanCanh_();
  Object.keys(tk.dan || {}).forEach(function (id) {
    var o = tk.dan[id], n = o.ok + o.bo;
    if (n >= 6 && o.ok / n < 0.25 && con.length > 4 && !bo[id]) { bo[id] = true; con = con.filter(function (x) { return x.id !== id; }); nhatKy_('DAO_DIEN', 'Ngừng dùng cách dàn cảnh "' + id + '" (được duyệt ' + o.ok + '/' + n + ')'); }
  });
  p.setProperty('DAO_DIEN_LOAI', JSON.stringify(bo));
}
// ĐỔI MỚI LIÊN TỤC: mỗi tuần (trigger hằng ngày tự kiểm) Gemini sáng tác 1 cách dàn cảnh mới dựa trên thống kê duyệt/bỏ,
// các quy tắc bạn đã dạy và bài học edit từ video nổi bật; cách mới vào vòng thử, tốt thì ở lại, kém thì tự bị loại.
function sangTacDanCanhMoi_() {
  var p = PropertiesService.getScriptProperties();
  var lan = Number(p.getProperty('DAO_DIEN_LAN_SANG_TAC') || 0);
  if (Date.now() - lan < 6.5 * 86400000) return '';
  var tk = docThongKeDD_().dan || {};
  var ds = dsDanCanh_();
  var bang = ds.map(function (x) { var o = tk[x.id] || { ok: 0, bo: 0 }; return '- ' + x.ten + ': ' + x.chu + ' (duyệt ' + o.ok + ', bỏ ' + o.bo + ')'; }).join('\n');
  var j = goiGemini_('Bạn là ĐẠO DIỄN SÁNG TẠO của kênh video dạy toán ngắn (dọc 9:16, TikTok/YouTube Shorts). Các CÁCH DÀN CẢNH đang dùng và số lần chủ kênh duyệt/bỏ:\n' + bang + '\n' +
    (typeof quyTacHocChoPrompt_ === 'function' ? quyTacHocChoPrompt_() : '') + (typeof hocEditChoPrompt_ === 'function' ? hocEditChoPrompt_() : '') +
    'Hãy sáng tác MỘT cách dàn cảnh MỚI, khác hẳn các cách trên, phù hợp video dạy toán 60-100 giây, tận dụng điểm mạnh của các cách được duyệt nhiều và tránh điểm yếu của các cách bị bỏ nhiều. ' +
    'Chỉ dùng được các loại hình bộ dựng có sẵn: người, thẻ, xúc xắc, đồng xu, hộp bi, vòng quay, đồng hồ, biểu đồ cột, thanh, số đếm, lưới ô, danh sách, bàn tròn, cảnh thực tế (vật thật + số đo), hình học, đồ thị, hình tự do; hành động: xuất hiện, chọn, loại bỏ, quay, mở, lấy ra, phóng to, thu nhỏ, di chuyển, biến hình. ' +
    'Trả JSON {"id":"chu_thuong_khong_dau","ten":"TÊN NGẮN IN HOA","chu":"mô tả cụ thể 1-2 câu: hình chính là gì, các cảnh nối nhau thế nào"}', 0.9, { suyNghi: 'low' });
  p.setProperty('DAO_DIEN_LAN_SANG_TAC', String(Date.now()));
  if (!j || !j.id || !j.chu || ds.some(function (x) { return x.id === j.id; })) return '';
  var moi = [];
  try { moi = JSON.parse(p.getProperty('DAO_DIEN_MOI') || '[]'); } catch (e) { moi = []; }
  moi.push({ id: String(j.id).replace(/[^a-z0-9_]/g, '').slice(0, 30) || ('moi_' + Date.now()), ten: String(j.ten || 'CÁCH MỚI').slice(0, 30), chu: String(j.chu).slice(0, 300), luc: new Date().toISOString() });
  p.setProperty('DAO_DIEN_MOI', JSON.stringify(moi.slice(-12)));
  nhatKy_('DAO_DIEN', 'Sáng tác cách dàn cảnh mới: ' + j.ten + ' - ' + String(j.chu).slice(0, 150));
  return '🎬 Cách dàn cảnh mới đưa vào thử: ' + j.ten + ' - ' + String(j.chu).slice(0, 200);
}
// lệnh Zalo /phongcach: tỉ lệ được duyệt của từng phong cách
function bangPhongCach_() {
  var tk = docThongKeDD_();
  var dong = function (ten, ds, chieu) {
    return ten + ':\n' + ds.map(function (x) { var id = x.id || x, o = (tk[chieu] || {})[id] || { ok: 0, bo: 0 }, n = o.ok + o.bo; return '• ' + (x.ten || id) + ': ' + (n ? Math.round(o.ok / n * 100) + '% duyệt (' + o.ok + '/' + n + ')' : 'chưa có dữ liệu'); }).join('\n');
  };
  return '🎬 Hệ thống tự chọn phong cách theo tỉ lệ bạn duyệt (hay duyệt -> dùng nhiều hơn, hay bỏ -> ít dần, kém hẳn -> loại):\n' +
    dong('Cách dàn cảnh', dsDanCanh_(), 'dan') + '\n' + dong('Phong cách lời', PHONG_CACH_LOI_, 'loi') + '\n' + dong('Gói edit', GOI_EDIT_, 'edit');
}
function layPhongCachVideo_(r) {
  if (r && r._phongCach) return r._phongCach;
  var kq = null;
  try { kq = chonPhongCachVideo_(r); } catch (e) { kq = null; }
  if (r) r._phongCach = kq;
  return kq;
}
// câu mở đầu cảnh (3-5 chữ đầu) của các video gần đây
function moDauCau_(s) { return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).slice(0, 4).join(' '); }
// lưu dạng "mã video|câu mở" để khi SỬA LẠI chính video đó không tự coi câu cũ của nó là "lặp"
function cauNoiGanDay_(boId) {
  var ds = [];
  try { ds = JSON.parse(PropertiesService.getScriptProperties().getProperty('CAU_NOI_GAN_DAY') || '[]'); } catch (e) { ds = []; }
  return ds.filter(function (x) { return !boId || String(x).split('|')[0] !== String(boId); }).map(function (x) { var i = String(x).indexOf('|'); return i >= 0 ? String(x).slice(i + 1) : String(x); });
}
function ghiCauNoi_(kb) {
  try {
    var p = PropertiesService.getScriptProperties();
    var ds = [];
    try { ds = JSON.parse(p.getProperty('CAU_NOI_GAN_DAY') || '[]'); } catch (e0) { ds = []; }
    var id = String(kb.id || '');
    ds = ds.filter(function (x) { return String(x).split('|')[0] !== id; });   // bản mới thay bản cũ của cùng video
    (kb.canh || []).forEach(function (c) { var m = moDauCau_(c && c.loi_thoai); if (m.split(' ').length >= 3) ds.push(id + '|' + m); });
    p.setProperty('CAU_NOI_GAN_DAY', JSON.stringify(ds.slice(-90)));
  } catch (e) {}
}
function phongCachLoiChoPrompt_(r) {
  var pc = layPhongCachVideo_(r);
  var gan = cauNoiGanDay_(r && r.id).slice(-40);
  return (pc ? 'PHONG CÁCH LỜI CỦA VIDEO NÀY: ' + pc.loi_ten + ' - ' + pc.loi_chu + ' Giữ phong cách này xuyên suốt nhưng KHÔNG làm sai/loãng nội dung toán.\n' : '') +
    (pc && pc.dan_chu ? 'CÁCH DÀN CẢNH CỦA VIDEO NÀY: ' + pc.dan_ten + ' - ' + pc.dan_chu + ' Áp dụng sáng tạo cho đúng đề này (hình vẫn phải bám sát đề, không đè chữ, không vẽ vật lạ); nếu thật sự không hợp với đề thì chọn cách dàn cảnh hợp hơn.\n' : '') +
    'CÂU NỐI ĐA DẠNG: mỗi cảnh mở đầu bằng một cách nói KHÁC nhau (không lặp "Tiếp theo", "Bây giờ", "Vậy là" nhiều lần trong một video)' +
    (gan.length ? '; TRÁNH dùng lại các câu mở đầu cảnh đã dùng ở các video gần đây: "' + gan.join('", "') + '"' : '') + '.\n';
}
