/**
 * ============================================================
 * BỘ PHẬN 1 – Tìm/sáng tác đề xác suất có tư duy → giải → kiểm chứng → viết kịch bản
 * Chạy trên: Google Apps Script gắn với một Google Sheet (Extensions > Apps Script)
 * AI: Gemini API (gói miễn phí) | Thông báo: Zalo Bot | Lưu kịch bản: Google Drive
 *
 * Bí mật (đặt trong Project Settings > Script Properties, KHÔNG viết vào code):
 *   GEMINI_API_KEY, ZALO_BOT_TOKEN, ZALO_CHAT_IDS (nhiều id cách nhau dấu phẩy)
 *
 * Nguồn đề (menu 🎬 Video AI > 📚 Nguồn đề): mặc định UU_TIEN_INTERNET = tìm đề có thật trên internet
 * bằng Gemini + Google Search trước; không có đề nào đạt thì mới để AI sáng tác.
 *
 * Chủ đề video (CAU_HINH > CHU_DE_VIDEO): XAC_SUAT | THUC_TE (toán thực tế, đáp số là một số) | XEN_KE (luân phiên hai loại).
 * Đề gửi qua Zalo (ảnh chụp hoặc chữ) được ƯU TIÊN: các đề khác tạm dừng cho tới khi video của đề đó dựng xong (xem ZaloDeBai.gs).
 *
 * Trạng thái của một dòng trong HANG_DOI:
 *   (CHO_DOC: đề Zalo chờ đọc ảnh) -> MOI -> DA_GIAI -> CO_KICH_BAN   (đi tiếp sang Bộ phận 2)
 *   LOAI (đáp án không khớp) | LOI (lỗi quá số lần cho phép)
 *
 * PHIÊN BẢN GIAO DIỆN v6 (canh giữa + giãn dòng + văn bản dài canh trái; dòng 1 của DOC_DE có ghi "giao diện v6").
 * BẢN HOÀN CHỈNH: đã gồm giao diện sheet mới (font Palatino Linotype, cỡ chữ 11,
 * chỉ hiện 2 sheet DOC_DE và DOC_KICH_BAN, các sheet kỹ thuật được ẩn).
 * ============================================================
 */

var TEN_HANG_DOI = 'HANG_DOI';
var TEN_CAU_HINH = 'CAU_HINH';
// BẢN SỬA LỖI "Exceeded maximum execution time" (vượt quá thời gian chạy):
//  1. Ghi "đang làm lần n" vào dòng TRƯỚC khi gọi Gemini: nếu Apps Script ngắt giữa chừng, lần sau dòng đó vẫn bị tính 1 lần lỗi,
//     quá MAX_LAN_LOI lần thì chuyển LOI. Bản cũ bị ngắt thì không ghi được gì nên cứ chọn lại đúng dòng đó và lại bị ngắt mãi.
//  2. Mỗi lần gọi Gemini đều kiểm tra hạn chót; không đủ thời gian thì dừng gọn (HET_GIO), để lần chạy sau.
//  3. Mã kiểm chứng do AI viết được chèn bộ đếm: chạy quá KIEM_CHUNG_TOI_DA_MS (kể cả vòng lặp vô hạn) thì tự dừng.
//  4. Ước lượng thời gian theo số đo thật (bản cũ bị chặn trần nên luôn đoán thiếu).
//  5. Việc vẽ lại bảng DOC_DE/DOC_KICH_BAN (rất chậm) chuyển sang trigger dọn dẹp 15 phút, không chen vào cuối lần chạy chính.
//  6. Gemini 2.5/3 "suy nghĩ" rất lâu với lời nhắc dài: viết kịch bản và tìm đề dùng mức suy nghĩ thấp (MUC_SUY_NGHI_KICH_BAN).
var THOI_GIAN_TOI_DA_MS = 4.6 * 60 * 1000; // mọi việc gọi AI phải xong trước mốc này (giới hạn cứng của Apps Script là 6 phút)
var KIEM_CHUNG_TOI_DA_MS = 25000;          // mã kiểm chứng chạy lâu hơn mức này thì dừng (coi như lỗi của đề đó)
var _bat_dau_chay_ = Date.now();            // mốc bắt đầu của lần chạy hiện tại (đặt lại ở đầu chayBoPhan1)
var _bo_nho_cau_hinh_ = null;               // đọc sheet CAU_HINH một lần cho mỗi lần chạy

var COT = ['id', 'trang_thai', 'lop', 'chu_de', 'de_bai', 'nguon', 'diem_tu_duy',
  'yeu_to_tu_duy', 'bay_thuong_gap', 'cach_1', 'cach_2', 'dap_an', 'kiem_chung',
  'file_kich_ban', 'ghi_chu', 'so_lan_loi', 'cap_nhat', 'ma_bam', 'file_video',
  'mon', 'uu_tien', 'file_anh', 'zalo_chat', 'dap_an_hien',   // 5 cột lần 15
  'lich_dang', 'link_dang',    // 2 cột lần 16
  'mo_ta_hinh',                // lần 17: mô tả chi tiết hình vẽ kèm đề (đọc từ ảnh) để video vẽ lại đúng hình
  'duyet', 'gop_y', 'san_pham', // lần 19: trạng thái duyệt video, góp ý khi duyệt, sản phẩm trong bài (JSON)
  'anh_kt', 'anh_bia', 'ai_kiem_tra', 'series'];   // lần 20: ảnh kiểm tra/ảnh bìa (Drive), kết quả AI xem video, series (hẹn giờ đăng, link đã đăng). Cột mới luôn nối vào CUỐI nên dữ liệu cũ không lệch

var PHIEN_BAN_EDIT = 46;                    // phiên bản chuẩn edit mới nhất (tự động nâng cấp các video cũ/đang chờ dưới mức này)
// Tên model nằm trong CAU_HINH vì Google đổi tên/ngừng model thường xuyên; hệ thống tự động đổi model dự phòng khi gặp lỗi.
var MAC_DINH = {
  // GIỌNG ĐỌC (mỗi video MỘT giọng từ đầu đến cuối): QUY_TAC_GIONG = CHU_KY (mặc định: cứ CHU_KY_GIONG video giọng nam thì 1 video giọng nữ)
  // | THEO_MON (toán thực tế = nam, xác suất = nữ) | CHI_NAM | CHI_NU. Tên giọng Gemini: GIONG_NAM (Puck/Charon/Fenrir), GIONG_NU (Aoede/Kore).
  QUY_TAC_GIONG: 'CHU_KY', CHU_KY_GIONG: '3', GIONG_NAM: 'Puck', GIONG_NU: 'Aoede',
  DANH_SACH_MODEL: 'gemini-2.5-flash,gemini-flash-latest,gemini-2.5-pro,gemini-2.0-flash,gemini-flash-lite-latest,gemini-3.8-flash,gemini-3.6-flash',
  MODEL_CHINH: 'gemini-2.5-flash',
  MODEL_DU_PHONG: 'gemini-flash-latest',
  MODEL_DU_PHONG_2: 'gemini-2.5-pro', // model dự phòng thứ 3 (tùy chọn, có thể để trống)
  MODEL_DU_PHONG_3: 'gemini-flash-lite-latest', // model dự phòng thứ 4: bản "lite" thường ít bị quá tải (503) hơn
  PHUT_NGHI_QUA_TAI: '20',     // mọi model đều báo quá tải (503) thì tạm nghỉ ngần này phút rồi tự chạy lại
  SO_DE_MOI_MOI_LAN: '2',
  SO_DE_TOI_DA_MOI_LAN: '2',   // mỗi lần chạy chỉ giải/viết kịch bản tối đa ngần này đề (để chạy nhanh)
  NGUONG_HANG_DOI: '4',        // dưới ngưỡng này mới sinh thêm đề
  DIEM_TU_DUY_TOI_THIEU: '7',  // thang 1-10
  MAX_LAN_LOI: '3',
  CHE_DO_NGUON: 'UU_TIEN_INTERNET', // UU_TIEN_INTERNET: tìm đề có thật trên internet trước, không có mới để AI sáng tác | CHI_INTERNET | SANG_TAC (chỉ AI) | KHO_DE (bạn tự thêm dòng MOI có de_bai)
  THU_MUC_GOC: 'VIDEO_XACSUAT',
  TOI_DA_CHO_DUNG_VIDEO: '12', // số kịch bản chờ dựng video tối đa; đạt mức này thì tạm dừng sinh đề (0 = không giới hạn)
  NGAY_GIU_LOAI: '7',          // đề bị LOAI quá số ngày này sẽ được dọn (0 = không dọn)
  CACH_XU_LY_FILE: 'CHUYEN',    // CHUYEN: đưa file kịch bản vào thư mục da_xong | XOA: bỏ vào thùng rác | GIU: để nguyên
  GIAY_MUC_TIEU: '110-170',    // thời lượng video mong muốn (giây): 16-22 cảnh chi tiết
  GIAY_TOI_DA: '200',          // kịch bản dài hơn mức này sẽ bị từ chối và viết lại
  CHU_KY_CHAY_PHUT: '15',      // trigger chayBoPhan1 chạy mỗi bao nhiêu phút. Khi giải trên GitHub mỗi lần chạy chỉ vài giây nên 10-15 phút là an toàn. Chạy caiDatTrigger() lại sau khi đổi
  ZALO_THONG_BAO: 'IT',        // IT = chỉ báo việc quan trọng (video đạt kiểm duyệt, báo cáo ngày, lỗi cần bạn ra tay) | VUA = thêm đăng video, hết hạn mức | DAY_DU = báo mọi tiến độ
  GIAI_TREN_GITHUB: 'BAT',     // BAT = giải + viết kịch bản trên GitHub (nhanh, không giới hạn 6 phút) | TAT = làm tại Apps Script như cũ
  SO_DE_GITHUB_CUNG_LUC: '3',  // số đề GitHub xử lý song song (đề ưu tiên Zalo luôn được gửi ngay)
  MUC_SUY_NGHI_KICH_BAN: 'low', // mức "suy nghĩ" của Gemini khi viết kịch bản/tìm đề: low (nhanh, khuyên dùng) | high | tat (không gửi tham số)
  MUC_SUY_NGHI_GIAI: 'mac_dinh', // khi GIẢI đề: mac_dinh (để Gemini tự quyết, chính xác hơn) | low | high
  UOC_GOI_GEMINI_GIAY: '75',   // ước lượng một lần gọi Gemini mất bao lâu; không đủ chừng này thời gian thì để lần chạy sau
  CHU_DE_VIDEO: 'XEN_KE',      // XAC_SUAT: chỉ xác suất | THUC_TE: chỉ toán thực tế | XEN_KE: luân phiên hai loại
  GITHUB_NHANH: 'master',
  DUYET_TRUOC_KHI_DANG: 'TAT', // TAT: AI tự kiểm tra video đạt yêu cầu thì tự động xếp lịch đăng 2 video/ngày | BAT: phải duyệt tay qua Zalo (/duyet)
  DANG_TU_DONG: 'BAT',         // BAT: tự động đăng mỗi ngày SO_VIDEO_MOI_NGAY video khi qua kiểm duyệt
  SO_VIDEO_MOI_NGAY: '2',      // số video tự động đăng mỗi ngày (mặc định 2 video/ngày vào khung GIO_DANG)
  TU_SUA_VIDEO_CU_DRIVE: 'BAT', // BAT: tự động dò lại các video cũ/đang chờ trên Drive để nâng cấp sang phiên bản edit mới
  VIDEO_DAI_YOUTUBE: 'BAT',    // BAT: hỗ trợ tạo video chuyên đề dài ~10 phút (540-660s) có giá trị học tập cao cho YouTube
  THOI_LUONG_VIDEO_DAI: '540-660',
  KIEU_MO_DAU: 'hook'          // hook: vào thẳng câu móc (khuyên dùng) | chao_hook: cho phép một lời chào cực ngắn kiểu "Chào bạn!" trước câu móc
};

// Toán thực tế theo lớp: chỉ những dạng bộ dựng video vẽ được bằng vật 3D (bể, lon, tòa nhà, thang, xe, cây), hình học trên sàn và đồ thị.
var CHUONG_TRINH_THUC_TE = {
  '10': 'Hàm số bậc hai và ứng dụng tối ưu (doanh thu, lợi nhuận, rào vườn diện tích lớn nhất, cổng parabol, quỹ đạo ném); hệ thức lượng trong tam giác (đo chiều cao tòa nhà/cây/cột cờ, khoảng cách qua sông bằng góc); bất phương trình bậc nhất hai ẩn trong sản xuất',
  '11': 'Cấp số cộng, cấp số nhân, hàm số mũ và logarit trong đời sống (lãi kép, gửi tiết kiệm, trả góp, tăng dân số, phân rã); lượng giác ứng dụng (độ cao cabin vòng đu quay, bóng nắng); khoảng cách và góc trong không gian (thang dựa tường, mái nhà)',
  '12': 'Ứng dụng đạo hàm tìm giá trị lớn nhất/nhỏ nhất (thể tích hộp/bể/lon, diện tích vật liệu, chi phí kéo dây, quãng đường ngắn nhất, lợi nhuận); tích phân tính quãng đường từ vận tốc, diện tích, thể tích bồn/bể; chuyển động của xe'
};

// CHỈ nhận những dạng bài này (bộ dựng video minh họa được rõ ràng). Dạng lạ ngoài danh sách bị bỏ ngay khi tìm/sáng tác đề.
var DANG_DUNG_DUOC = {
  XAC_SUAT: ['dem_to_hop', 'bi_hop', 'xuc_xac', 'dong_xu', 'the_bai', 'chon_nguoi', 'xep_cho', 'vong_quay', 'bien_co_doi', 'doc_lap', 'co_dieu_kien', 'toan_phan_bayes', 'mat_khau_so'],
  THUC_TE: ['toi_uu_hop', 'toi_uu_tru', 'do_cao_khoang_cach', 'thang_tuong', 'duong_di_ngan_nhat', 'ham_bac_hai_toi_uu', 'rao_vuon_dien_tich', 'lai_suat_tang_truong', 'chuyen_dong_quang_duong', 'luong_giac_vong_quay', 'the_tich_bon_be']
};
var MO_TA_DANG_ = {
  XAC_SUAT: 'dem_to_hop (chọn/đếm tổ hợp), bi_hop (bốc bi/kẹo trong hộp, túi), xuc_xac, dong_xu, the_bai, chon_nguoi (chọn học sinh, lập đội), xep_cho (xếp hàng, xếp ghế), vong_quay, bien_co_doi ("ít nhất một"), doc_lap (bắn cung, thi đấu nhiều lượt), co_dieu_kien, toan_phan_bayes (xét nghiệm, nhà máy), mat_khau_so (mật khẩu, biển số, lập số)',
  THUC_TE: 'toi_uu_hop (hộp, bể, thùng hình hộp: thể tích/vật liệu tối ưu), toi_uu_tru (lon, cốc, bồn hình trụ hoặc nón), do_cao_khoang_cach (đo tòa nhà, cây, cột cờ, qua sông bằng góc), thang_tuong (thang/dây dựa tường, mái), duong_di_ngan_nhat (kéo dây điện qua sông, đi đường nào nhanh nhất), ham_bac_hai_toi_uu (giá bán - lợi nhuận, cổng parabol, ném bóng), rao_vuon_dien_tich (rào mảnh vườn, chia đất), lai_suat_tang_truong (lãi kép, tiết kiệm, dân số), chuyen_dong_quang_duong (xe chạy, vận tốc, quãng đường), luong_giac_vong_quay (đu quay, độ cao theo thời gian), the_tich_bon_be (bồn nước, bể bơi, lượng nước)'
};
var DANG_TRANH_ = {
  XAC_SUAT: 'xác suất hình học liên tục (chọn điểm ngẫu nhiên trên đoạn/hình), biến ngẫu nhiên và phân phối, kỳ vọng phương sai, bài cần hình vẽ hay bảng số liệu không có trong chữ, bài nhiều câu hỏi nhỏ',
  THUC_TE: 'hình không gian nhiều mặt phức tạp (chóp cụt, lăng trụ xiên), thiết diện, khối tròn xoay quanh đường cong lạ, tích phân hàm phức tạp, bài cần đọc biểu đồ/bảng không có trong chữ, bài có nhiều câu hỏi nhỏ hoặc nhiều đáp số, đáp án không phải MỘT con số'
};
function laMonThucTe_(r) { return String((r && r.mon) || '').toUpperCase() === 'THUC_TE'; }

// Phạm vi kiến thức theo lớp (hãy chỉnh cho đúng bộ sách bạn dạy).
var CHUONG_TRINH = {
  '10': 'Quy tắc đếm, hoán vị, chỉnh hợp, tổ hợp; tính xác suất của biến cố theo định nghĩa cổ điển',
  '11': 'Biến cố hợp, biến cố giao, biến cố độc lập; quy tắc cộng và quy tắc nhân xác suất',
  '12': 'Xác suất có điều kiện; công thức xác suất toàn phần; công thức Bayes'
};

/* ===================== CÀI ĐẶT BAN ĐẦU ===================== */

function khoiTao() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_HANG_DOI) || ss.insertSheet(TEN_HANG_DOI);
  if (sh.getLastRow() === 0) { sh.appendRow(COT); sh.setFrozenRows(1); }
  damBaoCot_(sh);
  var ch = ss.getSheetByName(TEN_CAU_HINH) || ss.insertSheet(TEN_CAU_HINH);
  if (ch.getLastRow() === 0) {
    ch.appendRow(['khoa', 'gia_tri']);
    Object.keys(MAC_DINH).forEach(function (k) { ch.appendRow([k, MAC_DINH[k]]); });
  }
  thuMucKichBan_();
  Logger.log('Đã khởi tạo xong. Hãy đặt 3 bí mật trong Script Properties rồi chạy caiDatTrigger().');
}

function caiDatTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'chayBoPhan1') ScriptApp.deleteTrigger(t);
  });
  // Tài khoản Gmail thường có hạn mức tổng thời gian chạy trigger khoảng 90 phút/ngày: mỗi lần chạy dùng tối đa ~5 phút,
  // nên 60 phút/lần (24 lần/ngày) là an toàn; chạy dày hơn chỉ nên dùng với tài khoản Google Workspace.
  var phut = Number(cauHinh_('CHU_KY_CHAY_PHUT')) || 60;
  var tg = ScriptApp.newTrigger('chayBoPhan1').timeBased();
  if (phut < 60) tg.everyMinutes([5, 10, 15, 30].filter(function (x) { return x <= phut; }).pop() || 30);
  else tg.everyHours([1, 2, 4, 6, 8, 12].filter(function (x) { return x <= phut / 60; }).pop() || 1);
  tg.create();
  caiDatTriggerDon();   // trigger 15 phút: dọn đề đã xong + vẽ lại bảng DOC_DE/DOC_KICH_BAN khi cần
  Logger.log('Đã đặt trigger chayBoPhan1 (mỗi ' + phut + ' phút) và chayDonDep (mỗi 15 phút).');
}

/* ===================== VÒNG CHẠY CHÍNH ===================== */

function chayBoPhan1() {
  // Dùng cờ CacheService (tự giải phóng sau 280s) thay vì giữ cứng LockService.getScriptLock() suốt 5 phút gọi AI,
  // để các lệnh Zalo (/bo, /sua, /duyet, /huy) của chủ kênh LUÔN thực thi tức thì, không bao giờ bị báo "Hệ thống đang bận".
  var cacheChay = CacheService.getScriptCache();
  if (cacheChay.get('DANG_CHAY_BP1')) return false;
  cacheChay.put('DANG_CHAY_BP1', String(Date.now()), 280);
  var bat = Date.now();
  _bat_dau_chay_ = bat;
  var cheDoUuTien = false;
  _bo_nho_cau_hinh_ = null;
  var bc = { moi: 0, giai_ok: 0, loai: 0, kich_ban: 0, loi: 0 };
  try {
    damBaoCauHinhTuDong_();
    if (dangNghi_()) {
      nhatKy_('NGHI', 'Đang tạm nghỉ (hết hạn mức trước đó) nên bỏ qua lần chạy này. Chạy xoaNghi() để chạy lại ngay.');
      return;
    }
    nhatKy_('BAT_DAU', 'Bắt đầu lần chạy');
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
    damBaoCot_(sh);
    baoDongBiNgat_(sh);
    // Có đề ưu tiên (gửi qua Zalo) chưa xong: chỉ làm đề đó, các đề khác tạm dừng.
    var coSP = typeof coViecSanPham_ === 'function' && coViecSanPham_();
    if (coSP || coDeUuTien_(docHang_(sh))) {
      cheDoUuTien = true;
      nhatKy_('UU_TIEN', 'Đang có việc ưu tiên từ Zalo (đề/sản phẩm/góp ý): tạm dừng các đề khác');
      if (coSP) xuLySanPham_(bc, bat);     // tìm hiểu sản phẩm mới / sáng tác đề cho sản phẩm đã xác nhận
      // đọc đề -> giải -> kịch bản liền một mạch để video ra sớm nhất
      xuLyDocDe_(sh, bc, bat);
      if (giaiTrenGitHub_()) lamBoPhan1_(sh, bc, bat, true);
      else { xuLyGiai_(sh, bc, bat, true); xuLyKichBan_(sh, bc, bat, true); }
    } else {
      // Tự động dò lại các video cũ hoặc đang chờ trên Google Drive / Sheet để nâng cấp cách edit sang phiên bản mới
      if (String(cauHinh_('TU_SUA_VIDEO_CU_DRIVE') || 'BAT').toUpperCase() !== 'TAT') {
        try { doVaSuaVideoCuTrenDrive_(sh, 2); } catch (eCu) { nhatKy_('SUA_VIDEO_CU_LOI', eCu.message); }
      }
      var coViec = docHang_(sh).some(function (r) { return r.trang_thai === 'MOI' || r.trang_thai === 'DA_GIAI' || r.trang_thai === 'GITHUB'; });
      if (!coViec) { sinhDeNeuCan_(sh, bc); nhatKy_('SINH_DE', 'Hàng đợi trống, đã thêm ' + bc.moi + ' đề mới'); }
      if (giaiTrenGitHub_()) lamBoPhan1_(sh, bc, bat, false);
      else {
        xuLyKichBan_(sh, bc, bat);   // ưu tiên đề đã giải xong -> ra kịch bản trước
        xuLyGiai_(sh, bc, bat);
      }
      if (coViec && duThoiGian_(bat, tbMs_('TB_SINH_DE_MS', 90000) * 1.2)) { sinhDeNeuCan_(sh, bc); nhatKy_('SINH_DE', 'Bổ sung hàng đợi: +' + bc.moi + ' đề'); }
      if (bc.moi && giaiTrenGitHub_()) lamBoPhan1_(sh, bc, bat, false);   // đề vừa sinh: gửi GitHub ngay
    }
  } catch (e) {
    if (String(e.message) === 'HET_HAN_MUC') {
      datNghi_(cheDoUuTien ? 30 : 60);
      nhatKy_('HET_HAN_MUC', 'Gemini báo hết hạn mức/giới hạn tốc độ; tạm nghỉ ' + (cheDoUuTien ? 30 : 60) + ' phút');
      guiZalo_('⏸ Hết hạn mức Gemini miễn phí hôm nay, hệ thống tự nghỉ rồi chạy lại' + (cheDoUuTien ? ' (đề ưu tiên của bạn vẫn giữ chỗ đầu hàng).' : '.'), 'vua', 'HHM_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd'));
    } else if (String(e.message) === 'QUA_TAI') {
      var phut = cheDoUuTien ? 4 : (Number(cauHinh_('PHUT_NGHI_QUA_TAI')) || 20);   // đề ưu tiên: thử lại sớm
      datNghi_(phut);
      nhatKy_('QUA_TAI', 'Mọi model Gemini đều báo quá tải (503, lỗi phía Google, không phải lỗi của bạn); tạm nghỉ ' + phut + ' phút');
      var c = CacheService.getScriptCache();
      if (!c.get('ZALO_QUA_TAI')) { c.put('ZALO_QUA_TAI', '1', 10800); guiZalo_('⏳ Gemini đang quá tải (503), hệ thống tự thử lại sau ' + phut + ' phút.', 'thap'); }
    } else if (String(e.message) === 'HET_GIO') {
      nhatKy_('DUNG_SOM', 'Không đủ thời gian cho lần gọi Gemini tiếp theo, phần còn lại để lần chạy sau');
    } else {
      nhatKy_('LOI', String(e.message) + ' | ' + String(e.stack || '').slice(0, 300));
      guiZalo_('❌ Bộ phận 1 gặp lỗi: ' + String(e.message).slice(0, 300), 'vua', 'BP1LOI_' + String(e.message).slice(0, 60));
    }
  } finally {
    try { cacheChay.remove('DANG_CHAY_BP1'); } catch (eLock) {}
  }
  try { if (Date.now() - bat < 300000) donDaXong_(); } catch (e) { nhatKy_('LOI_DON_DEP', e.message); }
  // Vẽ lại bảng dễ đọc rất chậm (30-90 giây): luôn để chayDonDep thực hiện ở nền để không giữ tiến trình.
  PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
  nhatKy_('KET_THUC', 'Xong sau ' + Math.round((Date.now() - bat) / 1000) + ' giây: ' + JSON.stringify(bc));
  Logger.log('Xong sau ' + Math.round((Date.now() - bat) / 1000) + ' giay: ' + JSON.stringify(bc));
  if (cheDoUuTien) { try { sauUuTien_(); } catch (e3) { nhatKy_('UU_TIEN_LOI', e3.message); } }
  if (!cheDoUuTien && bc.moi + bc.giai_ok + bc.loai + bc.kich_ban + bc.loi > 0) {
    guiZalo_('📊 Bộ phận 1: +' + bc.moi + ' đề mới | ' + bc.giai_ok + ' đã giải & kiểm chứng đạt | ' +
      bc.loai + ' bị loại (đáp án không khớp) | ' + bc.kich_ban + ' kịch bản mới | ' + bc.loi + ' lỗi', 'thap');
  }  return cheDoUuTien ? 'UU_TIEN' : true;
}

// Tự động cập nhật cấu hình sang chế độ: AI tự kiểm duyệt video đúng yêu cầu -> tự động đăng 2 video/ngày & tự động đổi model
function damBaoCauHinhTuDong_() {
  try {
    var p = PropertiesService.getScriptProperties();
    if (p.getProperty('DA_CAP_NHAT_TU_DONG_V49') === '1') return;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ch = ss.getSheetByName(TEN_CAU_HINH);
    if (ch && ch.getLastRow() > 0) {
      var capNhat = {
        DANG_TU_DONG: 'BAT',
        DUYET_TRUOC_KHI_DANG: 'TAT',
        SO_VIDEO_MOI_NGAY: '2',
        GIO_DANG: '11:30,19:30',
        TU_KIEM_TRA_VIDEO: 'BAT',
        AI_DUYET_KICH_BAN: 'BAT',
        TU_SUA_VIDEO_CU_DRIVE: 'BAT',
        DANH_SACH_MODEL: MAC_DINH.DANH_SACH_MODEL
      };
      var v = ch.getDataRange().getValues();
      var daCo = {}, giaTriCu = {};
      for (var i = 1; i < v.length; i++) {
        var k = String(v[i][0] || '').trim();
        if (k) { daCo[k] = i + 1; giaTriCu[k] = String(v[i][1] || '').trim(); }
      }
      // Hạ ngưỡng kiểm duyệt quá gắt (100% / 10 điểm tuyệt đối) xuống mức chuẩn cao 85% / 8 điểm để tránh từ chối oan kịch bản tốt
      if (!daCo.MUC_DAP_UNG_TOI_THIEU || giaTriCu.MUC_DAP_UNG_TOI_THIEU === '100') capNhat.MUC_DAP_UNG_TOI_THIEU = '85';
      if (!daCo.DIEM_MOI_TIEU_CHI || giaTriCu.DIEM_MOI_TIEU_CHI === '10') capNhat.DIEM_MOI_TIEU_CHI = '8';
      Object.keys(capNhat).forEach(function (k) {
        if (daCo[k]) ch.getRange(daCo[k], 2).setValue(capNhat[k]);
        else ch.appendRow([k, capNhat[k]]);
      });
      _bo_nho_cau_hinh_ = null;
    }
    // Tự động giải cứu:
    // 1) Các video đã dựng xong (CO_VIDEO) bị kẹt ở KHONG_DAT do "AI chưa chấm được video"
    // 2) Các đề Zalo (vd ZL261118-095438-84) bị dừng ở LOI do thiếu hàm khoDanhSachKey_ trước khi khôi phục KhoKey.gs
    var sh = ss.getSheetByName(TEN_HANG_DOI);
    var coDeZaloCuu = false;
    if (sh && sh.getLastRow() > 1) {
      var dsHang = docHang_(sh);
      dsHang.forEach(function (r) {
        if (r.trang_thai === 'CO_VIDEO' && r.file_video && r.duyet === 'KHONG_DAT' && /AI chưa chấm được video/i.test(String(r.ghi_chu || ''))) {
          var kqD = {};
          try { kqD = JSON.parse(String(r.link_dang || '{}')) || {}; } catch (e0) { kqD = {}; }
          kqD._duyet_luc = kqD._duyet_luc || Date.now();
          ghi_(sh, r._row, {
            duyet: 'DA_DUYET',
            link_dang: JSON.stringify(kqD),
            ghi_chu: 'Đã giải cứu tự động từ trạng thái nghẽn key kiểm duyệt'
          });
        } else if (r.trang_thai === 'LOI' && /khoDanhSachKey_/i.test(String(r.ghi_chu || ''))) {
          var ttKhoiPhuc = (/^ZL/i.test(String(r.id || '')) && (r.chu_de === 'Đề gửi qua Zalo' || r.file_anh)) ? 'CHO_DOC' : (r.dap_an ? 'DA_GIAI' : 'MOI');
          ghi_(sh, r._row, {
            trang_thai: ttKhoiPhuc,
            so_lan_loi: 0,
            ghi_chu: ''
          });
          if (laUuTien_(r)) coDeZaloCuu = true;
        }
      });
    }
    if (coDeZaloCuu && typeof henUuTien_ === 'function') {
      try { henUuTien_(10); } catch (eH) {}
    }
    if (typeof thongTinKhoKeyZalo_ === 'function') {
      try { guiZalo_(thongTinKhoKeyZalo_(true), 'cao', 'BAO_CAO_KEY_V49'); } catch (eK) {}
    }
    p.setProperty('DA_CAP_NHAT_TU_DONG_V49', '1');
  } catch (e) {}
}

/* ===================== BƯỚC A: SINH ĐỀ ===================== */

function sinhDeNeuCan_(sh, bc) {
  var che = cauHinh_('CHE_DO_NGUON');
  if (che === 'KHO_DE') return;
  var hang = docHang_(sh);
  var dangCho = hang.filter(function (r) { return r.trang_thai === 'MOI' || r.trang_thai === 'DA_GIAI' || r.trang_thai === 'GITHUB'; }).length;
  // tỉ lệ qua kiểm duyệt 10/10 thấp -> giữ nhiều đề chờ hơn để số video đạt mỗi ngày vẫn đủ (NangCao.gs > heSoSanXuat_)
  var hsSX = typeof heSoSanXuat_ === 'function' ? heSoSanXuat_() : { he_so: 1 };
  if (dangCho >= Math.min(10, Math.round(Number(cauHinh_('NGUONG_HANG_DOI')) * hsSX.he_so))) return;
  var choDung = hang.filter(function (r) { return r.trang_thai === 'CO_KICH_BAN' || r.trang_thai === 'DANG_DUNG' || r.trang_thai === 'CO_VIDEO'; }).length;
  var toiDaCho = Number(cauHinh_('TOI_DA_CHO_DUNG_VIDEO'));
  if (toiDaCho > 0 && choDung >= toiDaCho) {
    nhatKy_('TAM_DUNG_SINH_DE', 'Đang có ' + choDung + ' kịch bản chờ dựng video, tạm dừng sinh đề mới');
    return;
  }

  var props = PropertiesService.getScriptProperties();
  var dsLop = ['10', '11', '12'];
  var chiSo = Number(props.getProperty('LOP_KE') || 0) % 3;
  var lop = dsLop[chiSo];
  props.setProperty('LOP_KE', String(chiSo + 1));
  var mon = chonMon_();

  var daCo = hang.slice(-40).map(function (r) { return '- ' + r.chu_de + ': ' + String(r.de_bai).slice(0, 100); }).join('\n');
  var n = Number(cauHinh_('SO_DE_MOI_MOI_LAN'));
  var tSinh = Date.now();

  // Ưu tiên đề có thật trên internet; chỉ khi không tìm được đề nào đạt yêu cầu mới để AI sáng tác.
  if (che === 'UU_TIEN_INTERNET' || che === 'CHI_INTERNET') {
    var them = 0;
    try { them = timDeInternet_(sh, hang, lop, n, bc, mon); }
    catch (e) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e.message))) throw e; nhatKy_('TIM_INTERNET_LOI', String(e.message)); }
    if (them > 0) { nhatKy_('TIM_INTERNET', 'Đã lấy ' + them + ' đề ' + mon + ' có thật từ internet (lớp ' + lop + ')'); return; }
    if (che === 'CHI_INTERNET') { nhatKy_('TIM_INTERNET', 'Không tìm được đề phù hợp trên internet (chế độ chỉ internet nên không nhờ AI sáng tác)'); return; }
    nhatKy_('TIM_INTERNET', 'Không tìm được đề phù hợp trên internet, chuyển sang AI sáng tác (' + mon + ', lớp ' + lop + ')');
  }
  var prompt = mon === 'HINH_HOC' ? promptSangTacHinhHoc_(lop, n, daCo) : mon === 'THUC_TE' ? promptSangTacThucTe_(lop, n, daCo) : promptSangTacXacSuat_(lop, n, daCo);
  var kq = goiGemini_(prompt, 0.9, { suyNghi: mon === 'HINH_HOC' ? 'medium' : cauHinh_('MUC_SUY_NGHI_KICH_BAN') });
  capNhatTb_('TB_SINH_DE_MS', Date.now() - tSinh);
  if (kq && !Array.isArray(kq) && Array.isArray(kq.de)) kq = kq.de;
  if (!Array.isArray(kq)) throw new Error('SINH_DE_JSON_SAI_DANG');

  var daBam = docMaBamLuuTru_();
  hang.forEach(function (r) { daBam[r.ma_bam] = true; });
  var nguong = Number(cauHinh_('DIEM_TU_DUY_TOI_THIEU'));
  kq.forEach(function (d, i) {
    if (!d || !d.de_bai || Number(d.diem_tu_duy) < nguong) return;
    if (!dangDungDuoc_(mon, d.dang)) { nhatKy_('BO_DANG_LA', 'Bỏ đề dạng "' + d.dang + '" (bộ dựng video chưa minh họa tốt): ' + String(d.de_bai).slice(0, 80)); return; }
    var b = bam_(d.de_bai);
    if (daBam[b]) return;
    daBam[b] = true;
    var id = (mon === 'HINH_HOC' ? 'HH' : mon === 'THUC_TE' ? 'TT' : 'VD') + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss') + '-' + i;
    themHang_(sh, {
      id: id, trang_thai: 'MOI', lop: lop, chu_de: d.chu_de, de_bai: d.de_bai, nguon: 'AI_SANG_TAC', mon: mon,
      diem_tu_duy: d.diem_tu_duy, yeu_to_tu_duy: d.yeu_to_tu_duy, bay_thuong_gap: d.bay_thuong_gap,
      so_lan_loi: 0, cap_nhat: new Date(), ma_bam: b, kiem_chung: duKienDapAn_(d)
    });
    bc.moi++;
  });
}

/* ===================== CHỦ ĐỀ: XÁC SUẤT / TOÁN THỰC TẾ ===================== */

// Chọn chủ đề cho lần sinh đề này: theo CHU_DE_VIDEO; XEN_KE thì luân phiên XAC_SUAT, THUC_TE.
function chonMon_() {
  var cd = String(cauHinh_('CHU_DE_VIDEO') || 'XEN_KE').toUpperCase();
  if (cd === 'XAC_SUAT' || cd === 'THUC_TE' || cd === 'HINH_HOC') return cd;
  var p = PropertiesService.getScriptProperties();
  var vong = typeof batHinhHoc_ === 'function' && batHinhHoc_() ? ['XAC_SUAT', 'THUC_TE', 'HINH_HOC'] : ['XAC_SUAT', 'THUC_TE'];   // xen kẽ, có hình học khó (HinhHoc.gs)
  var k = Number(p.getProperty('MON_KE') || 0);
  p.setProperty('MON_KE', String((k + 1) % 6));
  return vong[k % vong.length];
}
// Dạng bài có nằm trong danh sách bộ dựng video làm được không (đề cũ chưa có "dang" thì cho qua).
function dangDungDuoc_(mon, dang) {
  if (mon === 'HINH_HOC') return typeof dangHinhDungDuoc_ === 'function' && dangHinhDungDuoc_(dang);
  var ds = DANG_DUNG_DUOC[mon === 'THUC_TE' ? 'THUC_TE' : 'XAC_SUAT'];
  if (dang === undefined || dang === null || dang === '') return false;
  return ds.indexOf(String(dang).trim().toLowerCase()) >= 0;
}
function laUuTien_(r) { return !!r && (String(r.uu_tien) === '1' || r.uu_tien === true || r.uu_tien === 1); }
var TRANG_THAI_DANG_LAM_ = ['CHO_DOC', 'MOI', 'DA_GIAI'];
// Còn đề ưu tiên (Zalo) đang ở giai đoạn Bộ phận 1 không?
function coDeUuTien_(hang) {
  return hang.some(function (r) { return laUuTien_(r) && TRANG_THAI_DANG_LAM_.indexOf(r.trang_thai) >= 0; });
}
// Thêm tiêu đề các cột mới (lần 15) vào dòng 1 của HANG_DOI nếu sheet cũ chưa có.
function damBaoCot_(sh) {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('COT_DA_DU') === String(COT.length)) return;
  if (sh.getMaxColumns() < COT.length) sh.insertColumnsAfter(sh.getMaxColumns(), COT.length - sh.getMaxColumns());
  sh.getRange(1, 1, 1, COT.length).setValues([COT]);
  p.setProperty('COT_DA_DU', String(COT.length));
}

function yeuCauDang_(mon) {
  return '- Mỗi đề BẮT BUỘC có "dang" là MỘT mã trong danh sách sau (đề không thuộc dạng nào thì KHÔNG lấy, vì máy dựng video không minh họa được): ' + MO_TA_DANG_[mon] + '.\n' +
    '- TRÁNH các dạng: ' + DANG_TRANH_[mon] + '.\n';
}

// ĐỀ PHẢI CÓ ĐÚNG MỘT ĐÁP ÁN CHÍNH XÁC (dùng chung cho mọi prompt sáng tác / tìm đề). Người ra đề phải TỰ GIẢI và ghi "dap_an":
// đáp án này được đối chiếu với kết quả hệ thống tự giải (trọng tài nhiều cách giải + mã kiểm chứng); lệch nhau = đề mơ hồ -> sửa hoặc xóa.
function yeuCauDapAnChinhXac_(mon) {
  return '- ĐÁP ÁN DUY NHẤT VÀ CHÍNH XÁC TUYỆT ĐỐI (bắt buộc): mọi dữ kiện nhất quán, đủ, không mâu thuẫn; câu hỏi chỉ hiểu được MỘT cách ' +
    '(không dùng "khoảng", "gần", "có thể", "tối đa/tối thiểu" mơ hồ; nói rõ có hoàn lại hay không, có phân biệt thứ tự hay không, các vật có giống nhau không); ' +
    (mon === 'THUC_TE'
      ? 'nêu rõ đơn vị và làm tròn đến hàng nào nếu đáp số không nguyên; bài cần số nguyên (số người, số tầng...) thì chọn số liệu để nghiệm nguyên khớp ĐÚNG; bài cực trị phải có cực trị nằm trong miền xác định. '
      : 'đáp án là MỘT phân số tối giản xác định duy nhất. ') +
    'TỰ GIẢI TRƯỚC khi đưa đề: ghi "dap_an" (một con số' + (mon === 'THUC_TE' ? '' : ' hoặc phân số a/b') + ') và "kiem_tra" (thử lại đáp số với từng dữ kiện). Đề nào bạn KHÔNG chắc đáp án duy nhất thì KHÔNG đưa ra.\n';
}
function promptSangTacXacSuat_(lop, n, daCo) {
  return 'Bạn là giáo viên Toán giỏi, chuyên ra đề XÁC SUẤT ĐÒI HỎI TƯ DUY CAO cho học sinh lớp ' + lop + ' (Việt Nam).\n' +
    'Phạm vi kiến thức: ' + CHUONG_TRINH[lop] + '.\n' +
    'Hãy SÁNG TÁC ' + n + ' bài toán xác suất mới mà người giải phải NGHĨ chứ không chỉ áp dụng công thức.\n' +
    'THANG ĐIỂM "diem_tu_duy" (chấm khắt khe và thành thật): 10 = có một ý tưởng then chốt bất ngờ làm bài toán trở nên đơn giản (đối xứng, đếm bù, quy về bài nhỏ hơn, song ánh, đổi vai trò, nhìn từ góc khác); 8-9 = cần phân tích cấu trúc hoặc chia trường hợp khéo và có bẫy dễ nhầm; 6-7 = chỉ cần chọn đúng công thức; 1-5 = thay số vào công thức. CHỈ ra những đề đạt từ 8 điểm trở lên.\n' +
    'YÊU CẦU:\n' +
    '- Đáp án là MỘT xác suất dạng phân số; đề đầy đủ dữ kiện, không phụ thuộc hình vẽ hay bảng không có trong chữ.\n' +
    '- Có thể kiểm chứng bằng đếm vét cạn hoặc mô phỏng máy tính (không quá nhiều đối tượng).\n' +
    '- Tình huống có VẬT THẬT dễ hình dung (người, bi, thẻ, xúc xắc, đồng xu, vòng quay, cửa, quà) để video minh họa sinh động.\n' +
    yeuCauDang_('XAC_SUAT') + yeuCauDapAnChinhXac_('XAC_SUAT') +
    '- Đề phải khiến người giải phải tự hỏi "bài này thật sự muốn kiểm tra điều gì?"; tránh các bài chỉ cần "tính C(n,k) rồi chia".\n' +
    '- Mỗi đề kèm "y_tuong_then_chot": một câu nêu ý tưởng giúp giải bài thông minh (bạn phải tự biết cách giải thông minh đó trước khi ra đề).\n' +
    '- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Trả về MỘT mảng JSON, mỗi phần tử: {"dang":"","chu_de":"","de_bai":"","diem_tu_duy":1-10,"y_tuong_then_chot":"","yeu_to_tu_duy":"vì sao cần suy nghĩ","bay_thuong_gap":"học sinh hay sai ở đâu","dap_an":"a/b","kiem_tra":""}. Có thể dùng LaTeX trong $...$.';
}

function promptSangTacThucTe_(lop, n, daCo) {
  return 'Bạn là giáo viên Toán giỏi, chuyên ra đề TOÁN THỰC TẾ (vận dụng toán vào đời sống) cho học sinh lớp ' + lop + ' (Việt Nam).\n' +
    'Phạm vi kiến thức: ' + CHUONG_TRINH_THUC_TE[lop] + '.\n' +
    'Hãy SÁNG TÁC ' + n + ' bài toán thực tế mới, có bối cảnh đời thường nhìn thấy được (xây bể, làm hộp, lon nước, đo tòa nhà, dựng thang, kéo dây điện, rào vườn, bán hàng, gửi tiết kiệm, xe chạy, đu quay...).\n' +
    'THANG ĐIỂM "diem_tu_duy" (chấm khắt khe): 10 = phải tự MÔ HÌNH HÓA (đặt ẩn, lập hàm) rồi có một ý then chốt làm bài gọn; 8-9 = mô hình hóa có bẫy dễ sai (quên điều kiện, nhầm mặt, nhầm đơn vị); 6-7 = thay vào công thức có sẵn; 1-5 = tính số đơn thuần. CHỈ ra đề từ 8 điểm.\n' +
    'YÊU CẦU:\n' +
    '- Đề hỏi đúng MỘT đại lượng, đáp số là MỘT con số (nguyên hoặc thập phân, nêu rõ đơn vị và cách làm tròn nếu có). Không hỏi nhiều ý, không trắc nghiệm.\n' +
    '- Đủ dữ kiện bằng chữ, không phụ thuộc hình vẽ; kiểm chứng được bằng máy tính (vét lưới số, thử nhiều giá trị, tính số).\n' +
    '- Hình dung được bằng vật 3D đơn giản (hình hộp, hình trụ/nón, tòa nhà, thang, xe, cây) và hình học phẳng (tam giác, hình chữ nhật, góc) hoặc đồ thị hàm số một biến.\n' +
    yeuCauDang_('THUC_TE') + yeuCauDapAnChinhXac_('THUC_TE') +
    '- Mỗi đề kèm "y_tuong_then_chot" (ý then chốt để giải gọn) và "ham_so" nếu bài quy về khảo sát hàm một biến (ví dụ "x^2+128/x", trống nếu không có).\n' +
    '- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Trả về MỘT mảng JSON, mỗi phần tử: {"dang":"","chu_de":"","de_bai":"","don_vi":"","diem_tu_duy":1-10,"y_tuong_then_chot":"","ham_so":"","yeu_to_tu_duy":"vì sao cần suy nghĩ","bay_thuong_gap":"học sinh hay sai ở đâu","dap_an":"","kiem_tra":""}. Có thể dùng LaTeX trong $...$.';
}

function promptTimXacSuat_(lop, n, daCo) {
  return 'Hãy dùng Google Search để TÌM TRÊN INTERNET ' + (n + 2) + ' bài toán XÁC SUẤT CÓ THẬT (đã được đăng ở nơi khác, KHÔNG tự sáng tác) dành cho học sinh lớp ' + lop + ' (Việt Nam).\n' +
    'Phạm vi kiến thức: ' + CHUONG_TRINH[lop] + '.\n' +
    'ƯU TIÊN bài VẬN DỤNG CAO, đề học sinh giỏi, câu cuối của đề thi thử; các bài có "mẹo" suy luận. Nguồn: sách giáo khoa/sách bài tập hiện hành, đề minh họa và đề thi tốt nghiệp THPT của Bộ GD&ĐT, đề thi thử của các sở/trường, đề học sinh giỏi, và các trang như toanmath.com, thuvienhoclieu.com, vietjack.com, loigiaihay.vn.\n' +
    'THANG ĐIỂM "diem_tu_duy" (chấm khắt khe, thành thật): 10 = có một ý tưởng then chốt làm bài trở nên đơn giản (đối xứng, đếm bù, quy về bài nhỏ hơn, song ánh, đổi vai trò, góc nhìn khác); 8-9 = cần phân tích cấu trúc hoặc chia trường hợp khéo, có bẫy dễ nhầm; 6-7 = chỉ cần chọn đúng công thức; 1-5 = thay số vào công thức. CHỈ lấy bài từ 8 điểm trở lên; bài chỉ áp dụng công thức máy móc thì BỎ.\n' +
    'YÊU CẦU:\n' +
    '- Câu hỏi có đáp án là MỘT xác suất dạng phân số; nếu đề gốc là trắc nghiệm thì bỏ các phương án A, B, C, D, chỉ giữ phần dữ kiện và câu hỏi.\n' +
    '- Đề phải đầy đủ dữ kiện, không phụ thuộc hình vẽ hoặc bảng không có trong chữ; có thể kiểm chứng bằng đếm vét cạn hoặc mô phỏng.\n' +
    yeuCauDang_('XAC_SUAT') + yeuCauDapAnChinhXac_('XAC_SUAT') + '- Đề internet: chép ĐÁP ÁN CỦA NGUỒN vào "dap_an" nếu nguồn có lời giải; đề không có đáp án rõ ràng thì bỏ qua.\n' +
    '- Giữ sát nguyên văn đề gốc (chỉ chỉnh nhẹ cho rõ ràng), KHÔNG chép lời giải hay đáp án.\n' +
    '- Mỗi đề phải kèm "nguon_url" là địa chỉ trang bạn thực sự tìm thấy đề đó. Không chắc chắn đề có thật thì BỎ QUA; không tìm được đề nào phù hợp thì trả mảng rỗng [].\n' +
    '- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Chỉ trả về MỘT mảng JSON, không thêm chữ nào khác. Có thể dùng LaTeX trong $...$; trong JSON phải viết dấu gạch chéo ngược kép, ví dụ \\\\frac. ' +
    'Mỗi phần tử: {"dang":"","chu_de":"","de_bai":"","diem_tu_duy":1-10,"yeu_to_tu_duy":"vì sao cần suy nghĩ (ý tưởng then chốt)","bay_thuong_gap":"học sinh hay sai ở đâu","nguon_url":"","dap_an":"","kiem_tra":""}';
}

function promptTimThucTe_(lop, n, daCo) {
  return 'Hãy dùng Google Search để TÌM TRÊN INTERNET ' + (n + 2) + ' bài TOÁN THỰC TẾ CÓ THẬT (đã được đăng ở nơi khác, KHÔNG tự sáng tác) dành cho học sinh lớp ' + lop + ' (Việt Nam).\n' +
    'Phạm vi kiến thức: ' + CHUONG_TRINH_THUC_TE[lop] + '.\n' +
    'Nguồn: sách giáo khoa mới (phần "Vận dụng", "Hoạt động thực tế"), đề minh họa/đề thi tốt nghiệp THPT (câu trả lời ngắn), đề thi thử của sở/trường, các trang toanmath.com, thuvienhoclieu.com, vietjack.com, loigiaihay.vn.\n' +
    'THANG ĐIỂM "diem_tu_duy" (chấm khắt khe): 10 = phải tự mô hình hóa rồi có ý then chốt làm bài gọn; 8-9 = mô hình hóa có bẫy dễ sai; 6-7 = thay công thức có sẵn; 1-5 = tính số đơn thuần. CHỈ lấy bài từ 8 điểm.\n' +
    'YÊU CẦU:\n' +
    '- Đề hỏi MỘT đại lượng, đáp số là MỘT con số (có đơn vị, giữ nguyên yêu cầu làm tròn của đề gốc). Đề trắc nghiệm thì bỏ phương án; đề nhiều ý thì chỉ giữ MỘT ý chính có đáp số là một số.\n' +
    '- Đủ dữ kiện bằng chữ (bỏ những bài phải nhìn hình mới hiểu); hình dung được bằng vật 3D đơn giản (hộp, trụ, tòa nhà, thang, xe, cây), hình học phẳng hoặc đồ thị hàm một biến.\n' +
    yeuCauDang_('THUC_TE') + yeuCauDapAnChinhXac_('THUC_TE') + '- Đề internet: chép ĐÁP ÁN CỦA NGUỒN vào "dap_an" nếu nguồn có lời giải; đề không có đáp án rõ ràng thì bỏ qua.\n' +
    '- Giữ sát nguyên văn đề gốc, KHÔNG chép lời giải hay đáp án. Mỗi đề kèm "nguon_url" là trang bạn thực sự tìm thấy; không chắc thì bỏ; không có đề phù hợp thì trả [].\n' +
    '- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Chỉ trả về MỘT mảng JSON, không thêm chữ nào khác. Có thể dùng LaTeX trong $...$; trong JSON phải viết dấu gạch chéo ngược kép, ví dụ \\\\frac. ' +
    'Mỗi phần tử: {"dang":"","chu_de":"","de_bai":"","don_vi":"","diem_tu_duy":1-10,"yeu_to_tu_duy":"vì sao cần suy nghĩ (ý tưởng then chốt)","bay_thuong_gap":"học sinh hay sai ở đâu","nguon_url":"","dap_an":"","kiem_tra":""}';
}

/* ---------- Giải + kiểm chứng TOÁN THỰC TẾ: đáp số là một con số (có thể thập phân) ---------- */

// Đọc số từ câu trả lời của AI: chấp nhận 12.5, "12,5", "48 m2"...
function docSo_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  var m = /-?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?/i.exec(String(v === undefined || v === null ? '' : v).replace(/\s/g, ''));
  return m ? Number(m[0].replace(',', '.')) : NaN;
}
// Số chữ số thập phân của một số (ví dụ 12.35 -> 2).
function soLe_(x) { var s = String(x); return s.indexOf('.') < 0 || /e/i.test(s) ? 0 : s.split('.')[1].length; }
// Hai đáp số coi như bằng nhau: sai lệch tương đối ≤ 0,3%, hoặc khớp sau khi làm tròn theo số chữ số thập phân của bên ít chữ số hơn.
function khopSo_(a, b) {
  if (!isFinite(a) || !isFinite(b)) return false;
  var tol = Math.max(1e-6, 3e-3 * Math.max(Math.abs(a), Math.abs(b)));
  var d = Math.min(soLe_(a), soLe_(b));
  if (d >= 1) tol = Math.max(tol, 0.5 * Math.pow(10, -d) + 1e-9);
  return Math.abs(a - b) <= tol;
}
// Viết gọn đáp số: tối đa 4 chữ số thập phân, bỏ số 0 thừa (48, 12.5, 3.1416).
function vietSo_(x) {
  var r = Math.round(x * 10000) / 10000;
  return String(r);
}

function giaiThucTe_(r) {
  var t0 = Date.now();
  var de = 'Bài toán thực tế (lớp ' + r.lop + '):\n' + r.de_bai;
  var dinhDang = 'Đáp số cuối là MỘT con số (đại lượng đề hỏi). Nếu đề yêu cầu làm tròn thì "gia_tri" là số ĐÃ làm tròn đúng yêu cầu; nếu không thì giữ ít nhất 4 chữ số có nghĩa. ' +
    'BẮT BUỘC THỬ NGƯỢC: thay đáp số vào lại TẤT CẢ dữ kiện của đề và tính lại (ví dụ đề cho tổng 260 thì tính lại tổng với đáp số tìm được xem có đúng 260 không). ' +
    'Nếu đề KHÔNG có đáp số thỏa mãn chính xác mọi dữ kiện (cần số nguyên mà phương trình không có nghiệm nguyên, dữ kiện mâu thuẫn, thiếu dữ kiện) thì ghi rõ vào "de_co_van_de" ' +
    'và chọn CÁCH HIỂU HỢP LÝ NHẤT để vẫn trả lời được (ví dụ: xếp được tối đa bao nhiêu tầng trọn vẹn và còn dư bao nhiêu), ghi cách hiểu đó trong "de_co_van_de"; đề bình thường thì để "de_co_van_de" rỗng. ' +
    'Trả JSON: {"mo_hinh":"đặt ẩn, điều kiện, hàm/biểu thức cần xét","cac_buoc":["..."],"gia_tri":0,"don_vi":"","dap_an_hien":"câu trả lời ngắn có đơn vị, ví dụ x = 4 m; S = 48 m²","thu_nguoc":"phép thử lại với đáp số","de_co_van_de":""}\n\n';
  var kq3 = goiGeminiSong_([
    { nhiet: 0.2, prompt: 'Bạn là giáo viên Toán giỏi. Giải bài toán thực tế sau thật cẩn thận: đặt ẩn, nêu điều kiện của ẩn, lập biểu thức, giải và kiểm tra điều kiện; soát kỹ đơn vị. ' + dinhDang + de },
    { nhiet: 0.5, prompt: 'Bạn là giáo viên Toán giỏi, dạy bằng SUY LUẬN. Giải bài toán thực tế sau bằng cách GỌN và DỄ HIỂU nhất: nhận ra đại lượng cố định để khử ẩn, đối xứng, bất đẳng thức, hình học trực quan... Mỗi bước nói rõ VÌ SAO làm vậy. ' +
      'Thêm "y_tuong" (điều mấu chốt cần nhận ra, 1-2 câu) vào JSON. ' + dinhDang + de },
    { nhiet: 0.1, prompt: 'Viết MỘT hàm JavaScript thuần tên kiemChung() (không dùng thư viện, không gọi mạng) để tự kiểm chứng đáp số bài toán thực tế sau bằng TÍNH SỐ trên máy (Google Apps Script, chậm hơn máy thường ~10 lần). ' +
      'Cài đặt trực tiếp từ ĐỀ BÀI, không dựa vào lời giải: ví dụ bài cực trị thì quét lưới thật mịn trên miền xác định rồi thu hẹp quanh điểm tốt nhất (tổng không quá 1 triệu phép tính); bài tích phân thì tính số bằng Simpson; bài lãi suất thì mô phỏng từng kỳ. ' +
      'Mọi vòng lặp phải chắc chắn dừng; không tạo mảng quá 100000 phần tử. Nếu đề yêu cầu làm tròn thì làm tròn đúng như đề. ' +
      'Hàm trả về {"kieu":"gia_tri","gia_tri":số_thực}. Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de }
  ]);
  var c1 = kq3[0], c2 = kq3[1], kc = kq3[2];
  nhatKy_('THOI_GIAN', 'Giải toán thực tế + mã kiểm chứng (3 yêu cầu Gemini) mất ' + Math.round((Date.now() - t0) / 1000) + ' giây');
  var docTT = function (c) { var x = docSo_(c && c.gia_tri); return isFinite(x) ? x : null; };
  if (docTT(c1) === null && docTT(c2) === null) throw new Error('DAP_AN_KHONG_HOP_LE');
  var tt = trongTai_(r, {
    de: de, dinhDang: dinhDang, c1: c1, c2: c2, kc: kc,
    doc: docTT, bang: function (a, b) { return a !== null && b !== null && khopSo_(a, b); }, chu: vietSo_,
    kiem: function (kq) {
      var gk = docSo_(kq && kq.gia_tri);
      if (!isFinite(gk)) return null;
      var mp = kq.kieu === 'mo_phong';
      return { v: mp ? null : gk, manh: mp ? 1 : 2, mo: 'Tính số bằng máy: ' + vietSo_(gk),
        khop: function (x) { return mp ? Math.abs(gk - x) <= Math.max(0.02 * Math.abs(x), 1e-3) : khopSo_(gk, x); } };
    },
    promptMa: 'Viết MỘT hàm JavaScript thuần tên kiemChung() (không thư viện, không gọi mạng) tự tính đáp số bài toán thực tế sau bằng TÍNH SỐ, cài đặt trực tiếp từ ĐỀ BÀI (đọc kỹ đơn vị, điều kiện, yêu cầu làm tròn). ' +
      'Bài cực trị: quét lưới mịn trên miền xác định rồi thu hẹp quanh điểm tốt nhất; tích phân: Simpson; lãi suất/dãy: mô phỏng từng kỳ; hình học: tính tọa độ. Tổng không quá 1 triệu phép tính, vòng lặp phải dừng. ' +
      'Trả về {"kieu":"gia_tri","gia_tri":số_thực}. Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de
  });
  if (!tt.dat) return { dat: false, c1: c1, c2: c2, ly_do: tt.ly_do };
  c1 = tt.c1; c2 = tt.c2;
  var a1 = tt.v, mo = tt.mo;
  // Giữ đúng số chữ số thập phân mà lời giải đưa ra (đề yêu cầu làm tròn), tối đa 4.
  var dapAn = vietSo_(a1);
  var hien = catDapAnHien_(String((c1 && c1.dap_an_hien) || (c2 && c2.dap_an_hien) || '').trim(), 110);
  if (!hien) hien = dapAn.replace('.', ',') + (c1 && c1.don_vi ? ' ' + c1.don_vi : '');
  return { dat: true, c1: c1, c2: c2, dap_an: dapAn, dap_an_hien: hien, mo_ta: mo, de_co_van_de: tt.de_co_van_de };
}

// Rút gọn đáp án hiển thị mà KHÔNG cắt giữa số ("Diện tích tối đa: 18" thay vì 1800 m²): bỏ ngoặc giải thích trước,
// rồi mới cắt ở dấu phân cách (, ; .) gần nhất.
function catDapAnHien_(s, max) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  var bo = s.replace(/\s*\([^()]*\)/g, '').trim();
  if (bo.length >= 4 && bo.length <= max) return bo;
  var cat = s.slice(0, max);
  var i = Math.max(cat.lastIndexOf(', '), cat.lastIndexOf('; '), cat.lastIndexOf('. '), cat.lastIndexOf(' ('));
  return (i > max * 0.4 ? cat.slice(0, i) : cat.replace(/\s+\S*$/, '')).replace(/[\s,;:(]+$/, '').trim();
}

/* ===================== BƯỚC A2: TÌM ĐỀ CÓ THẬT TRÊN INTERNET ===================== */

function timDeInternet_(sh, hang, lop, n, bc, mon) {
  mon = mon || 'XAC_SUAT';
  var daCo = hang.slice(-60).map(function (r) { return '- ' + String(r.de_bai).slice(0, 90); }).join('\n');
  var prompt = mon === 'HINH_HOC' ? promptTimHinhHoc_(lop, n, daCo) : mon === 'THUC_TE' ? promptTimThucTe_(lop, n, daCo) : promptTimXacSuat_(lop, n, daCo);

  var kq = goiGeminiTimKiem_(prompt);
  if (!kq) return 0;
  if (!kq.coTimKiem) { nhatKy_('TIM_INTERNET', 'Gemini trả lời mà không thực sự tìm kiếm trên web, bỏ qua kết quả'); return 0; }
  var ds = traMangJson_(kq.text);
  if (!ds || !ds.length) { nhatKy_('TIM_INTERNET', 'Gemini không trả về đề nào dùng được'); return 0; }

  var daBam = docMaBamLuuTru_();
  hang.forEach(function (r) { daBam[r.ma_bam] = true; });
  var nguong = Number(cauHinh_('DIEM_TU_DUY_TOI_THIEU'));
  var them = 0;
  ds.forEach(function (d, i) {
    if (them >= n) return;
    if (!d || !d.de_bai || String(d.de_bai).length < 30) return;
    if (Number(d.diem_tu_duy) < nguong) return;
    if (!dangDungDuoc_(mon, d.dang)) { nhatKy_('BO_DANG_LA', 'Bỏ đề internet dạng "' + d.dang + '": ' + String(d.de_bai).slice(0, 80)); return; }
    var url = String(d.nguon_url || '').trim();
    if (!/^https?:\/\//i.test(url)) return;              // không rõ nguồn thì không nhận
    var b = bam_(d.de_bai);
    if (daBam[b]) return;
    daBam[b] = true;
    var host = url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0].toLowerCase();
    // Đối chiếu tên miền với các trang mà Google Search thực sự trả về
    var khop = kq.mien.some(function (m) { m = String(m).toLowerCase(); return m.indexOf(host) >= 0 || host.indexOf(m) >= 0; });
    var id = (mon === 'HINH_HOC' ? 'HI' : mon === 'THUC_TE' ? 'TI' : 'VT') + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss') + '-' + i;
    themHang_(sh, {
      id: id, trang_thai: 'MOI', lop: lop, chu_de: d.chu_de, de_bai: d.de_bai, mon: mon,
      nguon: 'INTERNET|' + host + (khop ? '' : ' (chưa đối chiếu)') + '|' + url,
      diem_tu_duy: d.diem_tu_duy, yeu_to_tu_duy: d.yeu_to_tu_duy, bay_thuong_gap: d.bay_thuong_gap,
      so_lan_loi: 0, cap_nhat: new Date(), ma_bam: b, kiem_chung: duKienDapAn_(d)
    });
    them++;
    bc.moi++;
  });
  return them;
}

// Tìm đề trên internet (Gemini + Google Search). Lỗi/hết hạn mức ở đây KHÔNG làm dừng hệ thống: trả null để chuyển sang AI sáng tác.
function goiGeminiTimKiem_(prompt) {
  if (!khoDanhSachKey_().length) throw new Error('THIEU_GEMINI_API_KEY');
  var models = danhSachModel_();
  for (var m = 0; m < models.length; m++) {
    if (!conDuGoiGemini_()) { nhatKy_('TIM_INTERNET', 'Không đủ thời gian để tìm đề trên internet, để lần sau'); return null; }
    var kq = khoGoiCoSuyNghi_(models[m], {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 }
    }, cauHinh_('MUC_SUY_NGHI_KICH_BAN'), { hanChoMs: 20000, tenQuota: models[m] + '+tim' });   // hạn mức tìm kiếm tính riêng, không làm các key mất quyền gọi thường
    if (!kq.ok) {
      nhatKy_('GEMINI_LOI', 'tìm kiếm ' + models[m] + ' HTTP ' + kq.code + ': ' + String(kq.raw).replace(/\s+/g, ' ').slice(0, 160));
      continue;
    }
    try {
      var j = JSON.parse(kq.raw);
      var cand = (j.candidates || [])[0] || {};
      var parts = (cand.content || {}).parts || [];
      var text = parts.map(function (p) { return p.text || ''; }).join('');
      var chunks = ((cand.groundingMetadata || {}).groundingChunks) || [];
      var mien = [];
      chunks.forEach(function (c) {
        var t = c && c.web && c.web.title;
        if (t && mien.indexOf(t) < 0) mien.push(t);
      });
      return { text: text, mien: mien, coTimKiem: chunks.length > 0 };
    } catch (e) { nhatKy_('GEMINI_LOI', 'tìm kiếm ' + models[m] + ' đọc kết quả lỗi: ' + e.message); }
  }
  return null;
}

// Lấy mảng JSON từ câu trả lời dạng văn bản (có thể kèm ```json hoặc chữ thừa; tự sửa dấu \ LaTeX chưa được escape).
function traMangJson_(txt) {
  var s = String(txt || '').replace(/```json|```/g, '');
  var a = s.indexOf('['), b = s.lastIndexOf(']');
  if (a < 0 || b <= a) return null;
  s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch (e) {}
  try { return JSON.parse(s.replace(/(?<!\\)\\(?![\\"\/u])/g, '\\\\')); } catch (e2) { return null; }
}

/* ===================== ĐỀ PHẢI CÓ ĐÁP ÁN CHẮC CHẮN ===================== */
// Đáp án người ra đề tự giải (lưu vào cột kiem_chung lúc thêm đề, dạng "DU_KIEN: 48").
function duKienDapAn_(d) {
  var x = String((d && d.dap_an) || '').replace(/\$/g, '').trim();
  return x ? 'DU_KIEN: ' + x.slice(0, 40) : '';
}
function layDuKien_(r) { var m = /DU_KIEN:\s*([^|]+)/.exec(String(r.kiem_chung || '')); return m ? m[1].trim() : ''; }
// Hai đáp án có bằng nhau không (số thực theo khopSo_, phân số a/b so theo giá trị).
function giaTriDapAn_(x) {
  var s = String(x || '').replace(/\\[dt]?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2').replace(/[{}\s]/g, '').replace(/,(?=\d)/g, '.');
  var p = /(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/.exec(s);
  if (p && Number(p[2]) !== 0) return Number(p[1]) / Number(p[2]);
  var m = /-?\d+(?:\.\d+)?/.exec(s);
  return m ? Number(m[0]) : NaN;
}
function dapAnBang_(a, b) {
  var x = giaTriDapAn_(a), y = giaTriDapAn_(b);
  if (!isFinite(x) || !isFinite(y)) return true;   // không đọc được số -> không dùng để loại
  return Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x)) || khopSo_(x, y);
}
// Nhờ Gemini VIẾT LẠI đề (giữ bối cảnh, dạng bài, độ khó) để có đúng một đáp án chính xác. Trả {de_bai, dap_an} hoặc null.
function suaDeChoChinhXac_(r, lyDo) {
  // đề hình học CHỨNG MINH: sửa thành đề chứng minh đúng (HinhHoc.gs), không biến thành bài tính
  if (typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r) && typeof loaiDeHinh_ === 'function' && loaiDeHinh_(r) === 'chung_minh' && typeof suaDeHinhChungMinh_ === 'function') return suaDeHinhChungMinh_(r, lyDo);
  var mon = laMonThucTe_(r) ? 'THUC_TE' : 'XAC_SUAT';
  var prompt = 'Bạn là giáo viên Toán ra đề rất cẩn thận. Đề dưới đây KHÔNG DÙNG ĐƯỢC vì: ' + lyDo + '\n' +
    'ĐỀ CŨ (lớp ' + r.lop + '): ' + r.de_bai + '\n' +
    'Hãy VIẾT LẠI đề: giữ bối cảnh, dạng bài và độ khó, nhưng sửa số liệu / câu chữ để đề có ĐÚNG MỘT đáp án chính xác, không ai hiểu khác được.\n' +
    yeuCauDapAnChinhXac_(mon) +
    'Tự giải lại đề mới bằng HAI cách khác nhau, hai cách phải ra cùng đáp số. Không chắc chắn thì trả "chac_chan": false.\n' +
    'Trả JSON: {"de_bai":"đề mới đầy đủ","dap_an":"","kiem_tra":"thử lại đáp số với từng dữ kiện","chac_chan":true|false}';
  var j = goiGemini_(prompt, 0.3, { suyNghi: 'high' });
  if (!j || j.chac_chan !== true || String(j.de_bai || '').trim().length < 30 || !String(j.dap_an || '').trim()) return null;
  return { de_bai: String(j.de_bai).trim(), dap_an: String(j.dap_an).trim() };
}
// Đề không có đáp án chắc chắn (các cách giải lệch nhau / đề mơ hồ / lệch đáp án của người ra đề):
// sửa đề MỘT lần rồi giải lại từ đầu; đã sửa rồi vẫn hỏng (hoặc là đề người dùng gửi, không được tự đổi) -> đánh dấu XOA,
// cuối lần chạy dọn khỏi sheet (lưu mã băm để không sinh lại đề đó).
function xuLyDeKhongChac_(sh, r, lyDo, bc, kq) {
  var daSua = /DA_SUA_DE/.test(String(r.kiem_chung || ''));
  if (!laUuTien_(r) && !daSua && conDuGoiGemini_()) {
    var moi = null;
    try { moi = suaDeChoChinhXac_(r, lyDo); } catch (e) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e.message))) throw e; }
    if (moi) {
      ghi_(sh, r._row, {
        trang_thai: 'MOI', de_bai: moi.de_bai, ma_bam: bam_(moi.de_bai), cach_1: '', cach_2: '', dap_an: '', dap_an_hien: '',
        kiem_chung: 'DA_SUA_DE | DU_KIEN: ' + moi.dap_an.slice(0, 40), so_lan_loi: 0, ghi_chu: 'Đã sửa đề để có đáp án duy nhất, giải lại từ đầu'
      });
      nhatKy_('SUA_DE', r.id + ': đề cũ hỏng (' + String(lyDo).slice(0, 160) + ') -> đã viết lại đề, giải lại');
      return;
    }
  }
  ghi_(sh, r._row, { trang_thai: 'XOA', ghi_chu: ('XÓA: ' + lyDo).slice(0, 300), cach_1: kq && kq.c1 ? JSON.stringify(kq.c1) : '', cach_2: kq && kq.c2 ? JSON.stringify(kq.c2) : '' });
  nhatKy_('XOA_DE', r.id + ': ' + (daSua ? 'đã sửa đề mà vẫn ' : '') + 'không có đáp án chắc chắn -> xóa (' + String(lyDo).slice(0, 160) + ')');
  bc.loai++;
  if (laUuTien_(r)) baoZaloDe_(r, '⚠️ Đề ' + r.id + ' không có đáp án chắc chắn nên hệ thống KHÔNG làm video (tránh dạy sai) và đã xóa khỏi danh sách.\n' +
    'Lý do: ' + String(lyDo).slice(0, 200) + '\nBạn có thể gửi lại đề rõ hơn (ghi đủ dữ kiện, kèm đáp án mong đợi).', 'cao');
}

/* ===================== BƯỚC B: GIẢI + KIỂM CHỨNG ===================== */

function xuLyGiai_(sh, bc, bat, chiUuTien, chiIds) {
  var ds = docHang_(sh).filter(function (r) { return r.trang_thai === 'MOI' && r.de_bai && (!chiUuTien || laUuTien_(r)) && (!chiIds || chiIds.indexOf(r.id) >= 0); })
    .slice(0, Number(cauHinh_('SO_DE_TOI_DA_MOI_LAN')));
  for (var i = 0; i < ds.length; i++) {
    if (!duThoiGianViec_(bat, tbMs_('TB_GIAI_MS', 150000) * 1.15)) { nhatKy_('DUNG_SOM', 'Không đủ thời gian cho đề giải tiếp theo, để lần chạy sau'); return; }
    var r = ds[i];
    var t0 = Date.now();
    if (!batDauViec_(sh, r, 'GIAI', bc)) continue;
    try {
      nhatKy_('GIAI', 'Bắt đầu giải ' + r.id + ' (lần ' + r.so_lan_loi + ')');
      var kq = giaiVaKiemChung_(r);
      nhatKy_('GIAI', r.id + ' -> ' + (kq.dat ? 'ĐẠT ' + kq.dap_an : 'LOẠI ' + kq.ly_do));
      var vanDe0 = kq.dat ? String(kq.de_co_van_de || '').trim() : '';
      var duKien = layDuKien_(r);
      var lyDoHong = !kq.dat ? 'các cách giải độc lập cho đáp án khác nhau (' + String(kq.ly_do || '').slice(0, 150) + ')'
        : vanDe0 ? 'đề mơ hồ / không có đáp số chính xác: ' + vanDe0.slice(0, 180)
        : (duKien && !dapAnBang_(duKien, kq.dap_an)) ? 'đáp án người ra đề (' + duKien + ') lệch đáp án hệ thống giải và kiểm chứng (' + kq.dap_an + ')'
        : '';
      if (lyDoHong) {
        xuLyDeKhongChac_(sh, r, lyDoHong, bc, kq);
      } else {
        if (!r.ma_bam) ghi_(sh, r._row, { ma_bam: bam_(r.de_bai) });
        // tới đây: đáp án đã được nhiều nguồn độc lập thống nhất, đề rõ ràng, khớp đáp án người ra đề (nếu có)
        ghi_(sh, r._row, {
          trang_thai: 'DA_GIAI', cach_1: JSON.stringify(kq.c1), cach_2: JSON.stringify(kq.c2),
          dap_an: kq.dap_an, dap_an_hien: kq.dap_an_hien || '', kiem_chung: kq.mo_ta + (duKien ? ' | khớp đáp án người ra đề ' + duKien : ''), ghi_chu: '', so_lan_loi: 0
        });
        bc.giai_ok++;
        if (laUuTien_(r)) baoZaloDe_(r, '✅ Đã giải và kiểm chứng: đáp án ' + (kq.dap_an_hien || kq.dap_an) + '\n✍ Đang viết kịch bản video...', 'thap');
      }
      capNhatTb_('TB_GIAI_MS', Date.now() - t0);
    } catch (e) { xuLyLoiHang_(sh, r, e, bc); }
  }
}

// Ghi "đang làm" + tăng số lần thử TRƯỚC khi gọi AI. Nếu lần chạy bị Apps Script ngắt (quá 6 phút), dòng này vẫn được tính
// một lần lỗi; quá MAX_LAN_LOI thì chuyển LOI thay vì kẹt mãi. Trả false nếu dòng đã hết lượt.
function batDauViec_(sh, r, viec, bc) {
  var n = Number(r.so_lan_loi) || 0;
  var max = Number(cauHinh_('MAX_LAN_LOI')) || 3;
  if (n >= max) {
    var ly = /^DANG_/.test(String(r.ghi_chu)) ? 'BI_NGAT_QUA_6_PHUT ' + n + ' lần khi ' + viec + ' (bài quá nặng hoặc Gemini trả lời quá chậm)' : String(r.ghi_chu || 'QUA_SO_LAN_THU');
    ghi_(sh, r._row, { trang_thai: 'LOI', ghi_chu: ly.slice(0, 300) });
    nhatKy_('LOI_DONG', r.id + ': ' + ly);
    bc.loi++;
    return false;
  }
  ghi_(sh, r._row, { so_lan_loi: n + 1, ghi_chu: 'DANG_' + viec + ' lần ' + (n + 1) + ' (nếu dòng này đứng yên: lần chạy đã bị ngắt vì quá 6 phút)' });
  SpreadsheetApp.flush();
  r.so_lan_loi = n + 1;
  return true;
}

// Đầu mỗi lần chạy: dòng nào còn ghi chú "DANG_..." nghĩa là lần chạy trước bị ngắt giữa chừng -> ghi nhật ký cho dễ tra.
function baoDongBiNgat_(sh) {
  docHang_(sh).forEach(function (r) {
    if (/^DANG_/.test(String(r.ghi_chu)) && (r.trang_thai === 'MOI' || r.trang_thai === 'DA_GIAI')) {
      nhatKy_('BI_NGAT', r.id + ': lần chạy trước bị ngắt khi đang xử lý (' + String(r.ghi_chu).split(' (')[0] + ')');
    }
  });
}

function giaiVaKiemChung_(r) {
  if (typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r)) return giaiHinhHoc_(r);   // hình học khó: tính hoặc chứng minh (HinhHoc.gs)
  return laMonThucTe_(r) ? giaiThucTe_(r) : giaiXacSuat_(r);
}

function giaiXacSuat_(r) {
  var t0 = Date.now();
  var de = 'Bài toán (lớp ' + r.lop + '):\n' + r.de_bai;
  var dinhDang = 'Đáp án cuối là MỘT xác suất dạng phân số với tử và mẫu là số nguyên dương. Soát lại: đếm trùng/đếm sót, có hoàn lại không, có phân biệt thứ tự không. ' +
    'Nếu đề mơ hồ hoặc mâu thuẫn, ghi rõ vào "de_co_van_de" cách hiểu hợp lý nhất đã dùng (đề bình thường để rỗng). Trả JSON: {"cac_buoc":["..."],"tu":0,"mau":0,"de_co_van_de":""}\n\n';
  // Ba việc độc lập nhau (hai cách giải + mã kiểm chứng) nên gọi đồng thời.
  var kq3 = goiGeminiSong_([
    { nhiet: 0.2, prompt: 'Bạn là giáo viên Toán giỏi. Giải bài toán xác suất sau thật cẩn thận, từng bước, ' +
      'soát kỹ lỗi đếm trùng/đếm sót. ' + dinhDang + de },
    { nhiet: 0.5, prompt: 'Bạn là giáo viên Toán giỏi, nổi tiếng vì dạy bằng SUY LUẬN. Giải bài toán xác suất sau bằng cách THÔNG MINH NHẤT, ít tính toán nhất: ưu tiên nhận ra cấu trúc của bài (đối xứng, đếm bù, biến cố đối, quy về bài đơn giản hơn, thử trường hợp nhỏ để tìm quy luật, đổi góc nhìn); CHỈ dùng công thức khi suy luận đã đưa tới đó. Mỗi bước phải nói rõ VÌ SAO làm vậy. Nếu bài không có cách thông minh hơn thì chia trường hợp thật rõ ràng. ' +
    'Đáp án cuối là MỘT xác suất dạng phân số với tử và mẫu là số nguyên dương. Trả JSON: {"y_tuong":"điều mấu chốt cần nhận ra, 1-2 câu","cac_buoc":["..."],"tu":0,"mau":0}\n\n' + de },
    { nhiet: 0.1, prompt: 'Viết MỘT hàm JavaScript thuần tên kiemChung() (không dùng thư viện, không gọi mạng) để tự kiểm chứng đáp án bài toán xác suất sau ' +
      'bằng máy tính (chạy trên Google Apps Script, CHẬM hơn máy tính thường khoảng 10 lần). Ưu tiên ĐẾM VÉT CẠN (liệt kê toàn bộ không gian mẫu) nếu không quá khoảng 1 triệu phép lặp; ' +
      'nếu không thì MÔ PHỎNG với đúng n = 200000 lần dùng Math.random. Mọi vòng lặp phải chắc chắn dừng; không tạo mảng quá 100000 phần tử. ' +
      'Hàm trả về: đếm vét cạn -> {"kieu":"chinh_xac","tu":số_nguyên,"mau":số_nguyên}; ' +
      'mô phỏng -> {"kieu":"mo_phong","gia_tri":số_thực,"n":200000}. ' +
      'Hãy cài đặt trực tiếp từ ĐỀ BÀI, không dựa vào lời giải. Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de }
  ]);
  var c1 = kq3[0], c2 = kq3[1], kc = kq3[2];
  Logger.log('Goi Gemini song song xong sau ' + Math.round((Date.now() - t0) / 1000) + ' giay');
  nhatKy_('THOI_GIAN', 'Giải + viết mã kiểm chứng (3 yêu cầu Gemini) mất ' + Math.round((Date.now() - t0) / 1000) + ' giây');

  if (!chuanHoa_(c1) && !chuanHoa_(c2)) throw new Error('DAP_AN_KHONG_HOP_LE');
  var bangPS = function (a, b) { return !!(a && b && a.tu * b.mau === b.tu * a.mau); };
  var tt = trongTai_(r, {
    de: de, dinhDang: dinhDang, c1: c1, c2: c2, kc: kc,
    doc: chuanHoa_, bang: bangPS, chu: function (v) { return v.tu + '/' + v.mau; },
    kiem: function (kq) {
      if (kq.kieu === 'chinh_xac') {
        var v = chuanHoa_({ tu: kq.tu, mau: kq.mau });
        return v ? { v: v, manh: 2, mo: 'Đếm vét cạn: ' + v.tu + '/' + v.mau, khop: function (x) { return bangPS(x, v); } } : null;
      }
      if (kq.kieu === 'mo_phong' && isFinite(Number(kq.gia_tri))) {
        var n = Number(kq.n) || 200000;
        return { v: null, manh: 1, mo: 'Mô phỏng n=' + n + ': ' + kq.gia_tri, khop: function (x) { var g = x.tu / x.mau; return Math.abs(Number(kq.gia_tri) - g) <= 5 * Math.sqrt(g * (1 - g) / n) + 1e-4; } };
      }
      return null;
    },
    promptMa: 'Viết MỘT hàm JavaScript thuần tên kiemChung() (không thư viện, không gọi mạng) kiểm chứng đáp án bài xác suất sau bằng máy. ' +
      'Ưu tiên ĐẾM VÉT CẠN toàn bộ không gian mẫu (tối đa ~1 triệu phép lặp), nếu không được thì MÔ PHỎNG đúng n = 200000 lần. Mọi vòng lặp phải dừng; mảng không quá 100000 phần tử. ' +
      'Trả về {"kieu":"chinh_xac","tu":số_nguyên,"mau":số_nguyên} hoặc {"kieu":"mo_phong","gia_tri":số_thực,"n":200000}. Cài đặt trực tiếp từ ĐỀ BÀI, đọc đề thật kỹ từng chữ (có hoàn lại không, phân biệt thứ tự không, "ít nhất"/"đúng"...). Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de
  });
  if (!tt.dat) return { dat: false, c1: c1, c2: c2, ly_do: tt.ly_do };
  return { dat: true, c1: tt.c1, c2: tt.c2, dap_an: tt.chu, dap_an_hien: tt.chu, mo_ta: tt.mo, de_co_van_de: tt.de_co_van_de };
}

// TRỌNG TÀI: không loại đề chỉ vì hai cách giải lệch nhau hay lệch mã kiểm chứng. Bỏ phiếu giữa các nguồn ĐỘC LẬP:
// mỗi lời giải = 1 phiếu, mã tính/đếm vét cạn = 2 phiếu, mô phỏng = 1 phiếu. Đáp án đạt >= 3 phiếu thì chốt.
// Chưa đủ: giải lại (suy nghĩ kỹ, biết các đáp án đang lệch) + viết mã kiểm chứng MỚI; vẫn chưa đủ: giải thêm bằng phương pháp
// khác hẳn. Chỉ loại khi sau các vòng đó vẫn không có đáp án nào được ít nhất 2 nguồn độc lập đồng ý.
function trongTai_(r, o) {
  var ung = [];   // {v, c, nguon}
  var ma = [];    // {v, manh, mo, khop}
  var themGiai = function (c, nguon) { var v = c ? o.doc(c) : null; if (v !== null && v !== undefined) ung.push({ v: v, c: c, nguon: nguon }); };
  var chayMa = function (kc, ten) {
    if (!kc || !kc.ma) return;
    try { var k = o.kiem(chayKiemChung_(kc.ma)); if (k) ma.push(k); }
    catch (e) { nhatKy_('GIAI', r.id + ': mã kiểm chứng ' + ten + ' lỗi (' + String(e.message).slice(0, 80) + ')'); }
  };
  var diem = function (v) {
    var d = 0;
    ung.forEach(function (u) { if (o.bang(u.v, v)) d += 1; });
    ma.forEach(function (k) { if (k.khop(v)) d += k.manh; });
    return d;
  };
  // đáp án điểm cao nhất + điểm của đáp án KHÁC cao nhì: chỉ chốt khi thắng rõ (nhì < 3 hoặc kém >= 2 phiếu),
  // để hai mã kiểm chứng cùng hiểu sai đề không "thắng phiếu" ba lời giải đúng
  var tot = function () {
    var ds = ung.map(function (u) { return u.v; });
    ma.forEach(function (k) { if (k.v !== null && k.v !== undefined) ds.push(k.v); });
    var best = null, bd = 0;
    ds.forEach(function (v) { var d = diem(v); if (d > bd) { bd = d; best = v; } });
    var nhi = 0;
    ds.forEach(function (v) { if (best !== null && !o.bang(v, best)) nhi = Math.max(nhi, diem(v)); });
    return { v: best, d: bd, nhi: nhi, ro: bd >= 3 && (nhi < 3 || bd - nhi >= 2) };
  };
  var tomTat = function () {
    return ung.map(function (u) { return u.nguon + '=' + o.chu(u.v); }).concat(ma.map(function (k) { return k.mo; })).join(' | ');
  };
  var ketQua = function (v, vong) {
    var khop = ung.filter(function (u) { return o.bang(u.v, v); });
    var c1 = khop.length ? khop[0].c : o.c1;
    var c2 = khop.filter(function (u) { return u.nguon === 'cach2'; }).length ? o.c2 : c1;   // giữ cách "thông minh" nếu nó đúng
    var mo = ma.filter(function (k) { return k.khop(v); }).map(function (k) { return k.mo; }).join('; ') || 'các lời giải độc lập khớp nhau';
    if (vong) nhatKy_('GIAI', r.id + ': trọng tài vòng ' + vong + ' chốt ' + o.chu(v) + ' (' + tomTat() + ')');
    var vanDe = '';
    khop.concat(ung).some(function (u) { var x = String((u.c && u.c.de_co_van_de) || '').trim(); if (x.length > 8) { vanDe = x; return true; } return false; });
    return { dat: true, v: v, chu: o.chu(v), c1: c1, c2: c2, mo: mo + (vong ? ' | phân xử sau ' + vong + ' vòng' : ''), de_co_van_de: vanDe.slice(0, 300) };
  };
  themGiai(o.c1, 'cach1');
  themGiai(o.c2, 'cach2');
  chayMa(o.kc, '1');
  var t = tot();
  if (t.v !== null && t.ro) return ketQua(t.v, 0);
  // vòng 1: giải lại thật kỹ (biết các đáp án đang lệch) + mã kiểm chứng mới viết độc lập
  nhatKy_('GIAI', r.id + ': các nguồn chưa thống nhất (' + tomTat() + '), mở trọng tài');
  var goiY = 'Các lời giải/máy tính trước cho các kết quả: ' + tomTat() + '. Có ít nhất một cái SAI. Hãy tự giải lại TỪ ĐẦU thật cẩn thận, đọc kỹ từng chữ của đề, ' +
    'chỉ ra chỗ dễ sai (đếm trùng, đếm sót, hiểu sai đề, đơn vị, làm tròn) rồi cho đáp án đúng. ';
  try { themGiai(goiGemini_('Bạn là giáo viên Toán chấm thi rất cẩn thận. ' + goiY + o.dinhDang + o.de, 0.1, { suyNghi: 'high' }), 'giai_lai'); }
  catch (e1) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e1.message))) throw e1; }
  try { chayMa(goiGemini_(o.promptMa, 0.2, { suyNghi: cauHinh_('MUC_SUY_NGHI_GIAI') }), '2'); }
  catch (e2) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e2.message))) throw e2; }
  t = tot();
  if (t.v !== null && t.ro) return ketQua(t.v, 1);
  // vòng 2: giải bằng phương pháp khác hẳn (liệt kê trực tiếp / đặt lại mô hình)
  try { themGiai(goiGemini_('Bạn là giáo viên Toán. Giải bài sau bằng một PHƯƠNG PHÁP KHÁC HẲN cách thông thường (ví dụ liệt kê trực tiếp các trường hợp nhỏ, đếm bằng bảng, đặt lại mô hình/tọa độ), ' +
    'kiểm tra lại kết quả bằng một cách thứ hai trước khi trả lời. ' + o.dinhDang + o.de, 0.3, { suyNghi: 'high' }), 'cach_khac'); }
  catch (e3) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e3.message))) throw e3; }
  t = tot();
  if (t.v !== null && t.ro) return ketQua(t.v, 2);
  // đề ưu tiên (người dùng gửi): chấp nhận khi có ít nhất 2 nguồn độc lập đồng ý
  if (laUuTien_(r) && t.v !== null && t.d >= 2 && t.d > t.nhi) return ketQua(t.v, 2);
  return { dat: false, ly_do: 'KHONG_THONG_NHAT sau trọng tài: ' + tomTat().slice(0, 250) };
}

// Chạy mã kiểm chứng do AI viết. Đã chặn các API nguy hiểm, nhưng KHÔNG phải sandbox tuyệt đối:
// chỉ dùng với mã sinh từ đề toán, và nên dùng tài khoản/Sheet riêng cho hệ thống này.
function chayKiemChung_(ma) {
  if (!ma || /\b(DriveApp|UrlFetchApp|SpreadsheetApp|PropertiesService|ScriptApp|MailApp|GmailApp|eval|Function|constructor|globalThis|window|require|import|process)\b|__proto__/.test(ma)) {
    throw new Error('MA_KIEM_CHUNG_KHONG_AN_TOAN');
  }
  var che = ['DriveApp', 'UrlFetchApp', 'SpreadsheetApp', 'PropertiesService', 'ScriptApp', 'MailApp', 'GmailApp',
    'DocumentApp', 'CalendarApp', 'CacheService', 'LockService', 'Session', 'Utilities'];
  // Hạn chạy: KIEM_CHUNG_TOI_DA_MS nhưng không vượt quá thời gian còn lại của lần chạy (chừa 40 giây để ghi kết quả).
  var han = Date.now() + Math.max(3000, Math.min(KIEM_CHUNG_TOI_DA_MS, THOI_GIAN_TOI_DA_MS + 40000 - (Date.now() - _bat_dau_chay_)));
  var dem = 0;
  var gac = function () {
    if ((++dem & 2047) === 0 && Date.now() > han) throw new Error('KIEM_CHUNG_QUA_LAU');
    return true;
  };
  var fn = Function.apply(null, che.concat(['__gac', '"use strict";\n' + chenGacVongLap_(ma) + '\nreturn kiemChung();']));
  var kq = fn.apply(null, che.map(function () { return undefined; }).concat([gac]));
  if (!kq || typeof kq !== 'object') throw new Error('KIEM_CHUNG_KHONG_TRA_KET_QUA');
  return kq;
}

// Chèn lời gọi __gac() vào điều kiện của mọi vòng lặp for/while và đầu mỗi khối do{...}, để vòng lặp quá lâu hay vô hạn
// tự dừng bằng lỗi KIEM_CHUNG_QUA_LAU thay vì làm Apps Script bị ngắt sau 6 phút (Apps Script không có cách nào khác để ngắt mã đồng bộ).
function chenGacVongLap_(ma) {
  var out = '', i = 0, n = ma.length;
  var laChu = function (c) { return /[A-Za-z0-9_$]/.test(c || ''); };
  while (i < n) {
    var c = ma[i];
    // bỏ qua chuỗi và chú thích
    if (c === '"' || c === "'" || c === '`') {
      var j = i + 1;
      while (j < n && ma[j] !== c) { if (ma[j] === '\\') j++; j++; }
      out += ma.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === '/' && ma[i + 1] === '/') { var e1 = ma.indexOf('\n', i); e1 = e1 < 0 ? n : e1; out += ma.slice(i, e1); i = e1; continue; }
    if (c === '/' && ma[i + 1] === '*') { var e2 = ma.indexOf('*/', i + 2); e2 = e2 < 0 ? n : e2 + 2; out += ma.slice(i, e2); i = e2; continue; }
    var tu = /^(for|while|do)\b/.exec(ma.slice(i, i + 6));
    if (tu && !laChu(ma[i - 1])) {
      var k = i + tu[1].length;
      if (tu[1] === 'do') {
        var m = k; while (m < n && /\s/.test(ma[m])) m++;
        if (ma[m] === '{') { out += ma.slice(i, m + 1) + '__gac();'; i = m + 1; continue; }
        out += tu[1]; i = k; continue;
      }
      var p = k; while (p < n && /\s/.test(ma[p])) p++;
      if (ma[p] !== '(') { out += tu[1]; i = k; continue; }
      // tìm ngoặc đóng tương ứng
      var sau = 0, q = p, chamPhay = [];
      for (; q < n; q++) {
        if (ma[q] === '(') sau++;
        else if (ma[q] === ')') { sau--; if (sau === 0) break; }
        else if (ma[q] === ';' && sau === 1) chamPhay.push(q);
      }
      var dau = ma.slice(p + 1, q);
      if (tu[1] === 'while') {
        out += 'while (__gac() && (' + dau + '))';
      } else if (chamPhay.length === 2) {
        var a = chamPhay[0] - p - 1, b = chamPhay[1] - p - 1;
        var dk = dau.slice(a + 1, b).trim();
        out += 'for (' + dau.slice(0, a) + '; __gac() && (' + (dk || 'true') + ');' + dau.slice(b + 1) + ')';
      } else {
        // for...of / for...in: số lần lặp hữu hạn, chỉ gác thân vòng nếu có khối {...}
        var r = q + 1; while (r < n && /\s/.test(ma[r])) r++;
        if (ma[r] === '{') { out += ma.slice(i, r + 1) + '__gac();'; i = r + 1; continue; }
        out += ma.slice(i, q + 1);
      }
      i = q + 1;
      continue;
    }
    out += c; i++;
  }
  return out;
}

/* ===================== BƯỚC C: VIẾT KỊCH BẢN ===================== */

function xuLyKichBan_(sh, bc, bat, chiUuTien, chiIds) {
  var ds = docHang_(sh).filter(function (r) { return r.trang_thai === 'DA_GIAI' && (!chiUuTien || laUuTien_(r)) && (!chiIds || chiIds.indexOf(r.id) >= 0); })
    .slice(0, Number(cauHinh_('SO_DE_TOI_DA_MOI_LAN')));
  for (var i = 0; i < ds.length; i++) {
    if (!duThoiGianViec_(bat, tbMs_('TB_KICHBAN_MS', 100000) * 1.15)) { nhatKy_('DUNG_SOM', 'Không đủ thời gian cho kịch bản tiếp theo, để lần chạy sau'); return; }
    var r = ds[i];
    var t0 = Date.now();
    if (!batDauViec_(sh, r, 'VIET_KICH_BAN', bc)) continue;
    try {
      nhatKy_('KICH_BAN', 'Bắt đầu viết kịch bản ' + r.id);
      var c1 = {}, c2 = {};
      try { c1 = JSON.parse(r.cach_1); } catch (e1) {}
      try { c2 = JSON.parse(r.cach_2); } catch (e2) {}
      // series (đánh số tập, nhắc tập trước) và kiểu mở đầu đang thử (NangCao.gs)
      r._series = typeof xacDinhSeries_ === 'function' ? xacDinhSeries_(r) : null;
      r._hook = typeof chonKieuHook_ === 'function' ? chonKieuHook_() : '';
      var prompt = taoPromptKichBan_(r, c1, c2);   // lời nhắc nằm trong tệp PromptKichBan.gs
      var sn = { suyNghi: cauHinh_('MUC_SUY_NGHI_KICH_BAN') };
      // Đề gửi kèm ảnh: cho Gemini NHÌN ảnh khi viết kịch bản để vẽ lại đúng hình của đề (không thay bằng vật "gần giống").
      var anhDe = anhDeChoGemini_(r);
      if (anhDe) sn.anh = anhDe;
      // BẢN VẼ cảnh thực tế (bước riêng): vật thật, số đo, phép đo -> kịch bản phải dùng đúng bản vẽ này
      r._banVe = null;
      if (typeof lapBanVe_ === 'function' && conDuGoiGemini_()) {
        try { r._banVe = lapBanVe_(r, anhDe); if (r._banVe) nhatKy_('BAN_VE', r.id + ': đã lập bản vẽ ' + (r._banVe.vat || []).map(function (v) { return v.ten; }).join(', ')); }
        catch (eBv) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(eBv.message))) throw eBv; }
      }
      prompt = taoPromptKichBan_(r, c1, c2);
      // Có bản nháp từ lần trước (đang sửa dở) thì sửa tiếp từ đó, không viết lại từ đầu.
      var kb = docNhapKichBan_(r.id);
      var laDai10P = typeof laVideoDai_ === 'function' && laVideoDai_(r);
      if (kb) nhatKy_('KICH_BAN', r.id + ': sửa tiếp bản nháp lần trước');
      else if (laDai10P && typeof lapKichBanDai10Phut_ === 'function') {
        var tGoiDai = Date.now();
        kb = lapKichBanDai10Phut_(r, c1, c2, sn);
        capNhatTb_('TB_GOI_KB_MS', Date.now() - tGoiDai);
      } else {
        var tGoi = Date.now();
        kb = goiGemini_(prompt, 0.6, sn);
        capNhatTb_('TB_GOI_KB_MS', Date.now() - tGoi);
      }
      if (laDai10P && kb) kb.kieu_video = 'DAI_10_PHUT';
      var ctxSua = { y_tuong: String((c2 && c2.y_tuong) || '') };
      var spham = null;
      try { spham = r.san_pham ? JSON.parse(String(r.san_pham)) : null; } catch (eSp) { spham = null; }
      // Người duyệt góp ý (/sua): sửa bản nháp theo góp ý trước, rồi mới kiểm tra như thường
      if (String(r.gop_y || '').trim() && conDuGoiGemini_()) {
        try {
          var kbGY = suaKichBanBangGemini_(kb, ['GOP_Y_NGUOI_DUYET (bắt buộc làm theo, sửa đúng các cảnh liên quan): ' + String(r.gop_y)], prompt, sn);
          if (kbGY && Array.isArray(kbGY.canh) && kbGY.canh.length) { kb = kbGY; ghi_(sh, r._row, { gop_y: '' }); nhatKy_('KICH_BAN_SUA', r.id + ': đã sửa theo góp ý của người duyệt'); }
        } catch (eGY) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(eGY.message))) { luuNhapKichBan_(r.id, kb); throw eGY; } }
      }
      var hinhDe = deCoHinh_(r) ? String(r.de_bai || '') + ' ' + String(r.mo_ta_hinh || '') : '';
      var dg = null, lanSua = 0, hetGio = false;
      var maxSua = Number(cauHinh_('SO_LAN_SUA_KICH_BAN')) || 3;   // GitHub: 6 vòng (không lo hết giờ)
      for (;;) {
        chuanBiKichBan_(kb, r, ctxSua);
        dg = danhGiaKichBan_(kb, r.dap_an, r.mon, hinhDe, spham, r.de_bai);
        // hết lỗi nặng: xong nếu không còn lỗi nhẹ, hoặc đã nhờ sửa một lần (lỗi nhẹ không làm hỏng video)
        if (!dg.nang.length && (!dg.nhe.length || lanSua >= 1)) break;
        if (lanSua >= maxSua) break;
        if (!conDuGoiGemini_()) { hetGio = true; break; }
        var dsLoi = dg.nang.concat(dg.nhe);
        nhatKy_('KICH_BAN_SUA', r.id + ' sửa ngay lần ' + (lanSua + 1) + ' (' + dg.nang.length + ' lỗi nặng, ' + dg.nhe.length + ' lỗi nhẹ): ' + dsLoi.map(function (x) { return String(x).split(':')[0]; }).join(', '));
        var kbMoi = null;
        try { kbMoi = suaKichBanBangGemini_(kb, dsLoi, prompt, sn); }
        catch (eS) {
          if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(eS.message))) { luuNhapKichBan_(r.id, kb); throw eS; }
          nhatKy_('KICH_BAN_SUA', r.id + ': Gemini sửa lỗi (' + String(eS.message).slice(0, 120) + ')');
        }
        if (kbMoi && Array.isArray(kbMoi.canh) && kbMoi.canh.length) kb = kbMoi;
        lanSua++;
      }
      if (dg.nang.length) {
        luuNhapKichBan_(r.id, kb);
        if (hetGio || lanSua < maxSua) {
          // hết thời gian của lần chạy: KHÔNG tính là lỗi, lần chạy sau sửa tiếp bản nháp
          ghi_(sh, r._row, { so_lan_loi: Math.max(0, (Number(r.so_lan_loi) || 1) - 1), ghi_chu: 'Đang sửa kịch bản (còn ' + dg.nang.length + ' lỗi), tiếp tục ở lần chạy sau' });
          nhatKy_('KICH_BAN_SUA', r.id + ': lưu bản nháp, còn ' + dg.nang.length + ' lỗi nặng: ' + dg.nang.map(function (x) { return String(x).split(':')[0]; }).join(', '));
          continue;
        }
        throw new Error('KICH_BAN_KHONG_HOP_LE: ' + dg.nang[0]);
      }
      // thiếu cảnh giải thích công thức (từ đâu ra, ý nghĩa đại lượng, khi nào dùng) -> bước riêng viết bổ sung; lỗi nặng mới thì bỏ
      if (typeof boSungGiaiThichCongThuc_ === 'function' && !(typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r)) && canBoSungGiaiThich_(kb) && conDuGoiGemini_()) {
        var kbLuu = JSON.stringify(kb);
        try {
          var canhGT = boSungGiaiThichCongThuc_(kb, r, sn);
          if (canhGT) {
            kb.canh = canhGT;
            chuanBiKichBan_(kb, r, ctxSua);
            var dgGT = danhGiaKichBan_(kb, r.dap_an, r.mon, hinhDe, spham, r.de_bai);
            if (dgGT.nang.length) { kb = JSON.parse(kbLuu); nhatKy_('KICH_BAN_GIAI_THICH', r.id + ': bỏ cảnh giải thích bổ sung (' + dgGT.nang.map(function (x) { return String(x).split(':')[0]; }).join(', ') + ')'); }
            else { dg = dgGT; nhatKy_('KICH_BAN_GIAI_THICH', r.id + ': đã thêm cảnh giải thích công thức, nay ' + demCanhGiaiThich_(kb) + ' cảnh, tổng ' + kb.canh.length + ' cảnh'); }
          }
        } catch (eGT) { kb = JSON.parse(kbLuu); if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(eGT.message))) { luuNhapKichBan_(r.id, kb); throw eGT; } }
      }
      // BỘ PHẬN KIỂM DUYỆT YÊU CẦU - cửa 1 (NangCao.gs): AI chấm kịch bản theo bảng yêu cầu của chủ kênh TRƯỚC khi dựng.
      // Chưa đạt -> sửa theo nhận xét (tối đa SO_LAN_SUA_YEU_CAU lần); vẫn thấp -> xóa đề (hệ thống tự làm đề mới).
      if (typeof aiDuyetKichBan_ === 'function' && String(chNC_('AI_DUYET_KICH_BAN')).toUpperCase() !== 'TAT') {
        var lanYC = 0, toiDaYC = typeof soLanSuaKichBanYC_ === 'function' ? soLanSuaKichBanYC_() : soLanSuaYeuCau_(), boDe = null, dy = null, totNhatYC = null;
        while (conDuGoiGemini_()) {
          try { dy = aiDuyetKichBan_(kb, r, spham); }
          catch (eYC) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(eYC.message))) { luuNhapKichBan_(r.id, kb); throw eYC; } dy = null; }
          if (!dy) { nhatKy_('KIEM_DUYET_YC', r.id + ': AI chưa chấm được kịch bản, để cửa kiểm duyệt video chặn sau'); break; }
          nhatKy_('KIEM_DUYET_YC', r.id + ' kịch bản lần ' + (lanYC + 1) + ': đáp ứng ' + dy.phan_tram + '% | ' + tomTatTieuChi_(dy) + (dy.dat ? ' -> ĐẠT' : ' | ' + dy.van_de.slice(0, 3).join('; ').slice(0, 250)));
          if (dy.dat) break;
          // GIỮ BẢN TỐT NHẤT: bản sửa chấm THẤP hơn bản tốt nhất trước đó -> quay lại bản tốt nhất rồi sửa tiếp từ đó
          // (trước đây bản 99% bị bản sửa 84% đè mất, cuối cùng đề bị xóa oan).
          if (!totNhatYC || Number(dy.phan_tram) > Number(totNhatYC.dy.phan_tram)) totNhatYC = { kb: JSON.stringify(kb), dy: dy, dg: dg };
          else if (Number(dy.phan_tram) < Number(totNhatYC.dy.phan_tram)) {
            nhatKy_('KIEM_DUYET_YC', r.id + ': bản sửa kém hơn (' + dy.phan_tram + '% < ' + totNhatYC.dy.phan_tram + '%) -> quay lại bản tốt nhất, sửa tiếp từ đó');
            kb = JSON.parse(totNhatYC.kb); dy = totNhatYC.dy; dg = totNhatYC.dg;
          }
          if (lanYC >= toiDaYC) { boDe = 'kịch bản chỉ đáp ứng ' + dy.phan_tram + '% sau ' + lanYC + ' lần sửa' + (dy.nang.length ? ' (bắt buộc chưa đạt: ' + dy.nang.join(', ') + ')' : '') + '. ' + dy.van_de.slice(0, 2).join('; '); break; }
          var kbTruoc = JSON.stringify(kb), kbYC = null;
          try { kbYC = suaKichBanBangGemini_(kb, ['KIEM_DUYET_YEU_CAU (bắt buộc sửa hết; kịch bản mới đáp ứng ' + dy.phan_tram + '%, tiêu chí: ' + tomTatTieuChi_(dy) + '). Vấn đề: ' + dy.van_de.join(' || ') + '. Cách sửa: ' + dy.gop_y], prompt, sn); }
          catch (eYS) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(eYS.message))) { luuNhapKichBan_(r.id, kb); throw eYS; } }
          lanYC++;
          if (kbYC && Array.isArray(kbYC.canh) && kbYC.canh.length) {
            kb = kbYC;
            chuanBiKichBan_(kb, r, ctxSua);
            var dgYC = danhGiaKichBan_(kb, r.dap_an, r.mon, hinhDe, spham, r.de_bai);
            if (dgYC.nang.length) { kb = JSON.parse(kbTruoc); nhatKy_('KIEM_DUYET_YC', r.id + ': bản sửa sinh lỗi nặng (' + dgYC.nang.map(function (x) { return String(x).split(':')[0]; }).join(', ') + '), giữ bản trước'); }
            else dg = dgYC;
          }
        }
        if (boDe) {
          // TUYỆT ĐỐI KHÔNG xóa bỏ đề/video chỉ vì chưa đạt 100% ở cửa chấm kịch bản khi đã có bản nháp hợp lệ (không có lỗi nặng toán học).
          // Khôi phục bản kịch bản tốt nhất đã được AI chỉnh sửa theo góp ý (totNhatYC) để tiếp tục dựng video.
          if (totNhatYC && totNhatYC.kb) {
            kb = JSON.parse(totNhatYC.kb);
            chuanBiKichBan_(kb, r, ctxSua);
            dg = danhGiaKichBan_(kb, r.dap_an, r.mon, hinhDe, spham, r.de_bai);
          }
          if (!dg || !dg.nang || !dg.nang.length) {
            nhatKy_('KIEM_DUYET_YC', r.id + ': giữ bản kịch bản tốt nhất sau ' + lanYC + ' vòng AI chỉnh sửa theo góp ý (' + (totNhatYC && totNhatYC.dy ? totNhatYC.dy.phan_tram : '?') + '%) -> dựng video');
          } else {
            luuNhapKichBan_(r.id, kb);
            ghi_(sh, r._row, { so_lan_loi: Math.max(0, (Number(r.so_lan_loi) || 1) - 1), ghi_chu: 'Tiếp tục AI sửa kịch bản ở lượt sau: ' + boDe.slice(0, 180) });
            continue;
          }
        }
      }
      if (dg.nhe.length) nhatKy_('KICH_BAN_LUU_Y', r.id + ': dùng được, còn ' + dg.nhe.length + ' lưu ý nhẹ: ' + dg.nhe.map(function (x) { return String(x).split(':')[0]; }).join(', '));
      xoaNhapKichBan_(r.id);
      chuanHoaThoiLuong_(kb);
      kb.id = r.id; kb.lop = r.lop; kb.chu_de = r.chu_de; kb.de_bai = r.de_bai;
      kb.dap_an = r.dap_an; kb.cach_giai = c1;
      kb._phien_ban_edit = PHIEN_BAN_EDIT;
      kb.mon = typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r) ? 'HINH_HOC' : laMonThucTe_(r) ? 'THUC_TE' : 'XAC_SUAT';
      if (r.dap_an_hien) kb.dap_an_hien = String(r.dap_an_hien);
      if (laUuTien_(r)) kb.uu_tien = 1;
      if (spham) kb.san_pham = spham;   // bộ dựng video tự gắn nhãn có sản phẩm do kênh bán
      if (r._series) kb.series = { ten: r._series.ten, tap: 0 };   // số tập đánh lúc đăng (DangVideo.gs)
      if (typeof layPhongCachVideo_ === 'function') { var pcv = layPhongCachVideo_(r); if (pcv) { kb.phong_cach_loi = pcv.loi_id; kb.phong_cach_dan = pcv.dan_id || ''; kb.phong_cach_edit = pcv.edit; } }
      if (typeof ghiCauNoi_ === 'function') ghiCauNoi_(kb);
      if (typeof phanLoaiCauHoi_ === 'function') kb.loai_cau_hoi = phanLoaiCauHoi_(r);   // loại câu hỏi: màu nhãn trên ảnh bìa + danh sách phát
      var tep = thuMucKichBan_().createFile(r.id + '.json', JSON.stringify(kb, null, 2), MimeType.PLAIN_TEXT);
      var aiKtCu = {};
      try { aiKtCu = JSON.parse(String(r.ai_kiem_tra || '{}')) || {}; } catch (eKt) { aiKtCu = {}; }
      aiKtCu.phien_ban = PHIEN_BAN_EDIT;
      ghi_(sh, r._row, { trang_thai: 'CO_KICH_BAN', file_kich_ban: tep.getId(), ghi_chu: '', so_lan_loi: 0, series: kb.series ? kb.series.ten : '', ai_kiem_tra: JSON.stringify(aiKtCu).slice(0, 1800) });
      nhatKy_('KICH_BAN', r.id + ' -> đã lưu file ' + tep.getId());
      if (laUuTien_(r)) baoZaloDe_(r, '🎬 Kịch bản xong (' + kb.canh.length + ' cảnh, khoảng ' + kb.tong_giay + ' giây). Đang dựng video, thường mất 10-20 phút...', 'thap');
      capNhatTb_('TB_KICHBAN_MS', Date.now() - t0);
      bc.kich_ban++;
    } catch (e) { xuLyLoiHang_(sh, r, e, bc); }
  }
}

// Câu kêu gọi cuối video, xoay vòng cho đỡ nhàm (một câu dùng được cho cả YouTube lẫn TikTok/Facebook).
var CAU_KEU_GOI_ = [
  'Thấy hay thì đăng ký kênh hoặc bấm theo dõi để không bỏ lỡ tập sau nhé!',
  'Bấm theo dõi hoặc đăng ký kênh ngay, tập sau còn một bài hay hơn nữa đó!',
  'Muốn giải toán nhanh như vậy mỗi ngày, nhớ đăng ký kênh hoặc theo dõi mình nhé!',
  'Đừng quên đăng ký kênh hoặc theo dõi để học thêm mẹo toán ở tập sau!'
];
function chonCauKeuGoi_(r) {
  var h = 0, id = String((r && r.id) || '');
  for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return CAU_KEU_GOI_[h % CAU_KEU_GOI_.length];
}

// Chuẩn bị kịch bản trước khi đánh giá: bỏ lời chào, khóa đáp án đúng, máy tự sửa lỗi vặt.
function chuanBiKichBan_(kb, r, ctxSua) {
  if (!kb || !Array.isArray(kb.canh)) return;
  if (cauHinh_('KIEU_MO_DAU') !== 'chao_hook') xoaLoiChao_(kb);
  if (r.dap_an_hien && !kb.dap_an_hien) kb.dap_an_hien = String(r.dap_an_hien);
  if (r._banVe && !kb.ban_ve) kb.ban_ve = r._banVe;   // có sẵn bản vẽ của đề: cảnh nào mất hết vật thì dùng bản vẽ thay vì để trống
  var sua = typeof tuSuaKichBan_ === 'function' ? tuSuaKichBan_(kb, ctxSua, r) || [] : [];
  if (typeof tuSuaQuyTrinh_ === 'function') sua = sua.concat(tuSuaQuyTrinh_(kb, r.de_bai) || []);
  if (typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r)) {   // hình học: tọa độ ĐÚNG từ mã dựng hình đã kiểm chứng
    try { var c1H = JSON.parse(String(r.cach_1 || '{}')); if (c1H && c1H.hinh_toa_do) sua = sua.concat(chenToaDoHinh_(kb, c1H.hinh_toa_do)); } catch (eH) {}
  }
  if (typeof tuSuaTaiChinh_ === 'function') sua = sua.concat(tuSuaTaiChinh_(kb, r.de_bai) || []);   // bài lãi suất: gỡ hình khối không liên quan
  if (typeof tuSuaVatLa_ === 'function') sua = sua.concat(tuSuaVatLa_(kb, r.de_bai) || []);   // đề hải đăng mà vẽ tòa nhà -> đổi đúng vật, giữ số đo
  if (typeof tuSuaBoCucDe_ === 'function') sua = sua.concat(tuSuaBoCucDe_(kb, r.de_bai) || []);   // đề bàn tròn -> người ngồi quanh bàn tròn
  if (typeof tuSuaDaDangHinh_ === 'function') sua = sua.concat(tuSuaDaDangHinh_(kb, r) || []);    // đa dạng hóa hình minh họa theo từng cảnh
  // câu KÊU GỌI cuối video (dùng chung cho mọi nền tảng: YouTube "đăng ký", TikTok/Facebook "theo dõi"; dải chữ riêng từng nền tảng in lúc đăng)
  var cuoi = kb.canh[kb.canh.length - 1];
  if (cuoi && !/đăng ký|theo dõi|follow|subscribe/i.test(String(cuoi.loi_thoai || ''))) {
    cuoi.loi_thoai = String(cuoi.loi_thoai || '').replace(/\s+$/, '') + ' ' + chonCauKeuGoi_(r);
    sua.push('thêm câu kêu gọi đăng ký / theo dõi cuối video');
  }
  // bản vẽ nhìn từ trên: tường đặt nhầm lên cạnh ngắn (tổng rào không khớp đề) -> tự đổi cạnh dài/ngắn
  if (typeof tuSuaSoDoVung_ === 'function') kb.canh.forEach(function (c, i) {
    var vs = c && c.minh_hoa && c.minh_hoa.du_lieu && c.minh_hoa.du_lieu.vat;
    (Array.isArray(vs) ? vs : []).forEach(function (v) { if (v && v.loai === 'canh_that' && tuSuaSoDoVung_(v, r.de_bai)) sua.push('SO_DO_VUNG_CANH_' + (i + 1)); });
  });
  if (r._banVe && typeof chenBanVe_ === 'function') { sua = sua.concat(chenBanVe_(kb, r._banVe)); kb.ban_ve = r._banVe; }
  kb._phien_ban_edit = PHIEN_BAN_EDIT;
  suaDapAn_(kb, r.dap_an);   // sau khi tự sửa (có thể vừa thêm/đổi cảnh) để cảnh đáp án luôn đúng
  if (sua.length) nhatKy_('KICH_BAN_TU_SUA', r.id + ': ' + sua.slice(0, 8).join('; ').slice(0, 450));
}

// Nhờ Gemini sửa ĐÚNG các lỗi còn lại (gửi kèm toàn bộ quy tắc + kịch bản hiện tại), giữ nguyên phần đã đúng.
function suaKichBanBangGemini_(kb, dsLoi, prompt, sn) {
  var p = prompt + '\n\n=== NHIỆM VỤ BÂY GIỜ: SỬA KỊCH BẢN, KHÔNG VIẾT LẠI TỪ ĐẦU ===\n' +
    'Dưới đây là kịch bản bạn đã viết (máy đã tự sửa các lỗi vặt). Còn các lỗi sau, hãy sửa TẤT CẢ trong một lần:\n' +
    dsLoi.map(function (x, i) { return (i + 1) + '. ' + moTaLoiKichBan_(x); }).join('\n') +
    '\nYÊU CẦU: giữ nguyên mọi phần không liên quan tới lỗi (lời thoại, số liệu, đáp án, hình đã đúng); chỉ sửa đúng chỗ lỗi; tuân thủ mọi quy tắc ở trên ' +
    '(đặc biệt: hình phải khớp đề, đáp án đúng, lời thoại không có ký hiệu LaTeX). Trả về TOÀN BỘ kịch bản JSON sau khi sửa, cùng định dạng.\n' +
    'KỊCH BẢN HIỆN TẠI:\n' + JSON.stringify(kb);
  return goiGemini_(p, 0.3, sn);
}

// Bản nháp kịch bản đang sửa dở (Drive, thư mục kịch bản): lần chạy sau sửa tiếp thay vì viết lại.
function tepNhap_(id) { var it = thuMucKichBan_().getFilesByName('nhap_' + id + '.json'); return it.hasNext() ? it.next() : null; }
function luuNhapKichBan_(id, kb) {
  try { var f = tepNhap_(id); var noi = JSON.stringify(kb); if (f) f.setContent(noi); else thuMucKichBan_().createFile('nhap_' + id + '.json', noi, MimeType.PLAIN_TEXT); } catch (e) { nhatKy_('NHAP', 'Không lưu được bản nháp ' + id + ': ' + e.message); }
}
function docNhapKichBan_(id) {
  try { var f = tepNhap_(id); if (!f) return null; var kb = JSON.parse(f.getBlob().getDataAsString()); return kb && Array.isArray(kb.canh) ? kb : null; } catch (e) { return null; }
}
function xoaNhapKichBan_(id) { try { var f = tepNhap_(id); if (f) f.setTrashed(true); } catch (e) {} }

// Ảnh đề (đề gửi qua Zalo) để gửi kèm Gemini khi viết kịch bản; null nếu không có hoặc ảnh quá lớn.
function anhDeChoGemini_(r) {
  var f = String(r.file_anh || '');
  if (!f || /^https?:/i.test(f)) return null;
  try {
    var b = DriveApp.getFileById(f).getBlob();
    if (b.getBytes().length > 12 * 1024 * 1024) return null;
    return { mime: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) };
  } catch (e) { nhatKy_('ANH_DE', r.id + ': không đọc được ảnh đề (' + e.message + ')'); return null; }
}
// Đề có hình (ảnh kèm, mô tả hình, hoặc nhắc tới hình dạng cụ thể) -> kịch bản BẮT BUỘC vẽ lại hình đó.
function deCoHinh_(r) {
  if (String(r.mo_ta_hinh || '').trim() || (r.file_anh && !/^https?:/i.test(String(r.file_anh)))) return true;
  return /hình (vẽ|bên|dưới|sau)|như hình|bông tuyết|koch|sierpinski|fractal|tam giác|hình vuông|hình chữ nhật|hình tròn|đường tròn|nửa đường tròn|hình thang|lục giác|ngũ giác|đa giác|hình quạt|cung tròn|elip|parabol|hyperbol|đồ thị|mặt cắt|thiết kế theo hình|có dạng/i.test(String(r.de_bai || ''));
}

/* ===================== GỌI GEMINI: TỰ ĐỘNG ĐỔI MODEL KHI GẶP LỖI ===================== */

var MODEL_CHUAN_DU_PHONG_ = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-flash-lite-latest',
  'gemini-2.0-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash'
];

// Danh sách model động: không cố định vào một model duy nhất.
// Ưu tiên model vừa chạy tốt gần nhất (MODEL_TOT_NHAT), loại bỏ model bị lỗi 404/không tồn tại (MODEL_HONG_<m>),
// đẩy model hết hạn mức ngày (HET_NGAY_MODEL_<m>) hoặc quá tải 503 (QUA_TAI_<m>) xuống cuối.
function danhSachModel_() {
  var ds = [], cache = CacheService.getScriptCache();
  var chuoiDS = String(cauHinh_('DANH_SACH_MODEL') || '').trim();
  if (chuoiDS) {
    chuoiDS.split(/[,;\s|]+/).forEach(function (m) {
      m = m.trim();
      if (m && ds.indexOf(m) < 0) ds.push(m);
    });
  }
  ['MODEL_CHINH', 'MODEL_DU_PHONG', 'MODEL_DU_PHONG_2', 'MODEL_DU_PHONG_3'].forEach(function (k) {
    var m = String(cauHinh_(k) || '').trim();
    if (m && ds.indexOf(m) < 0) ds.push(m);
  });
  MODEL_CHUAN_DU_PHONG_.forEach(function (m) {
    if (ds.indexOf(m) < 0) ds.push(m);
  });
  // Bổ sung các model tìm thấy động từ Google API (nếu đã từng dò)
  try {
    var tuTim = JSON.parse(cache.get('DS_MODEL_TU_TIM') || '[]');
    if (Array.isArray(tuTim)) tuTim.forEach(function (m) { if (m && ds.indexOf(m) < 0) ds.push(m); });
  } catch (e0) {}

  // Lọc bỏ các model đã xác nhận không tồn tại / ngừng hỗ trợ (HTTP 404)
  var hopLe = ds.filter(function (m) { return !cache.get('MODEL_HONG_' + m); });
  if (!hopLe.length) hopLe = ds.slice();

  // Đưa model vừa chạy thành công gần nhất lên đầu để không tốn thời gian thử lại model lỗi
  var totNhat = cache.get('MODEL_TOT_NHAT');
  if (totNhat && hopLe.indexOf(totNhat) > 0 && !cache.get('QUA_TAI_' + totNhat) && !cache.get('HET_NGAY_MODEL_' + totNhat)) {
    hopLe = [totNhat].concat(hopLe.filter(function (m) { return m !== totNhat; }));
  }

  var khoe = hopLe.filter(function (m) { return !cache.get('QUA_TAI_' + m) && !cache.get('HET_NGAY_MODEL_' + m); });
  var tai = hopLe.filter(function (m) { return cache.get('QUA_TAI_' + m) && !cache.get('HET_NGAY_MODEL_' + m); });
  var het = hopLe.filter(function (m) { return cache.get('HET_NGAY_MODEL_' + m); });
  return khoe.concat(tai, het);
}

// Tự động dò danh sách model hiện có trên tài khoản Google Gemini API khi các model cấu hình bị đổi tên / 404
function tuTimModelGemini_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('DA_DO_MODEL_API')) return [];
  cache.put('DA_DO_MODEL_API', '1', 3600);
  try {
    var keys = typeof khoDanhSachKey_ === 'function' ? khoDanhSachKey_() : [];
    if (!keys.length || typeof UrlFetchApp === 'undefined') return [];
    for (var i = 0; i < Math.min(keys.length, 3); i++) {
      var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(keys[i]), { muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) continue;
      var j = JSON.parse(res.getContentText());
      var tim = (j.models || []).filter(function (m) {
        var ten = String(m.name || '').replace(/^models\//, '');
        var methods = m.supportedGenerationMethods || [];
        return /^gemini-(2|3|4|flash|pro)/i.test(ten) && !/tts|embedding|imagen|veo|vision|audio/i.test(ten) && methods.indexOf('generateContent') >= 0;
      }).map(function (m) { return String(m.name || '').replace(/^models\//, ''); });
      if (tim.length) {
        cache.put('DS_MODEL_TU_TIM', JSON.stringify(tim.slice(0, 8)), 21600);
        nhatKy_('GEMINI_MODEL', 'Đã tự động dò thấy ' + tim.length + ' model khả dụng: ' + tim.slice(0, 6).join(', '));
        return tim.slice(0, 8);
      }
    }
  } catch (e) {}
  return [];
}

function laQuaTai_(kq) {
  return kq.code === 503 || kq.code === 529 || /UNAVAILABLE|overloaded|high demand|try again later/i.test(String(kq.raw || ''));
}
function laModelKhongCo_(kq) {
  return kq.code === 404 || (kq.code === 400 && /not found|not supported for generateContent|model .* does not exist|invalid model/i.test(String(kq.raw || '')));
}

// opts.suyNghi: mức suy nghĩ ('low' | 'high' | 'mac_dinh' | 'tat'). Gọi có hạn chót: không đủ thời gian thì ném 'HET_GIO'.
// Tự động chuyển sang model kế tiếp ngay lập tức khi gặp bất kỳ lỗi nào (404, 400, 429, 503, JSON hỏng...).
function goiGemini_(prompt, nhiet, opts) {
  opts = opts || {};
  if (!khoDanhSachKey_().length) throw new Error('THIEU_GEMINI_API_KEY');
  var models = danhSachModel_();
  var cache = CacheService.getScriptCache();
  var hetHanMuc = false, lyDo = '', soLoi = 0, soQuaTai = 0, daDoThem = false;
  for (var lan = 0; lan < 3; lan++) {
    var coTheThuLai = false;
    for (var m = 0; m < models.length; m++) {
      var tenModel = models[m];
      if (cache.get('MODEL_HONG_' + tenModel)) continue;
      if (!conDuGoiGemini_()) throw new Error(soQuaTai && soQuaTai === soLoi ? 'QUA_TAI' : 'HET_GIO');
      var dsAnh = opts.anhs || (opts.anh ? [opts.anh] : []);
      var phan = dsAnh.map(function (a) { return { inline_data: { mime_type: a.mime, data: a.data } }; }).concat([{ text: prompt }]);
      var kq = khoGoiCoSuyNghi_(tenModel, {
        contents: [{ parts: phan }],
        generationConfig: { temperature: nhiet, responseMimeType: 'application/json' }
      }, opts.suyNghi, { hanChoMs: 20000 });
      if (kq.ok) {
        try {
          var parsed = docKetQua_(kq.raw);
          cache.put('MODEL_TOT_NHAT', tenModel, 1800);
          return parsed;
        } catch (e) {
          lyDo = tenModel + ' ' + e.message; soLoi++; coTheThuLai = true;
          nhatKy_('GEMINI_DOI_MODEL', lyDo + ' -> tự động đổi sang model kế tiếp');
          continue;
        }
      }
      soLoi++;
      lyDo = tenModel + ' HTTP ' + kq.code + ': ' + String(kq.raw).replace(/\s+/g, ' ').slice(0, 160);
      nhatKy_('GEMINI_DOI_MODEL', lyDo);
      if (laModelKhongCo_(kq)) {
        cache.put('MODEL_HONG_' + tenModel, '1', 21600);
        if (!daDoThem && m === models.length - 1) {
          daDoThem = true;
          tuTimModelGemini_().forEach(function (nm) { if (models.indexOf(nm) < 0) models.push(nm); });
        }
        continue;
      }
      if (laQuaTai_(kq)) { soQuaTai++; cache.put('QUA_TAI_' + tenModel, '1', 600); coTheThuLai = true; continue; }
      if (kq.het) { hetHanMuc = true; cache.put('HET_NGAY_MODEL_' + tenModel, '1', 7200); continue; }
      if (kq.code === 429 || kq.code >= 500 || kq.code === 0 || kq.code === 400) { coTheThuLai = true; continue; }
    }
    if (!coTheThuLai) break;
    var cho = lan === 0 ? 6000 : 15000;
    if (!duThoiGian_(_bat_dau_chay_, uocGoiMs_() + cho)) break;
    Utilities.sleep(cho);
  }
  if (soQuaTai && soQuaTai === soLoi) throw new Error('QUA_TAI');
  throw new Error(hetHanMuc ? 'HET_HAN_MUC' : 'GEMINI_LOI: ' + lyDo);
}

function uocGoiMs_() { return Math.max(30, Number(cauHinh_('UOC_GOI_GEMINI_GIAY')) || 75) * 1000; }
// Còn đủ thời gian cho một lần gọi Gemini không (theo ước lượng UOC_GOI_GEMINI_GIAY)?
function conDuGoiGemini_() { return duThoiGian_(_bat_dau_chay_, uocGoiMs_()); }

// Thêm tham số "suy nghĩ" phù hợp với đời model rồi gọi khoGoi_. Model không nhận tham số (lỗi 400) thì tự gọi lại không kèm
// và nhớ 6 giờ để lần sau khỏi thử.
function thamSoSuyNghi_(model, muc) {
  muc = String(muc || '').toLowerCase();
  if (!muc || muc === 'tat' || muc === 'mac_dinh') return null;
  var md = String(model).toLowerCase();
  if (CacheService.getScriptCache().get('KHONG_SUY_NGHI_' + md)) return null;
  if (/gemini-2\.5/.test(md)) return { thinkingBudget: muc === 'high' ? 8192 : (/pro/.test(md) ? 128 : 0) };
  if (/gemini-(3|[4-9])|latest/.test(md)) return { thinkingLevel: muc === 'high' ? 'high' : 'low' };
  return null;
}
function khoGoiCoSuyNghi_(model, body, muc, tuyChon) {
  var ts = thamSoSuyNghi_(model, muc);
  if (ts) body.generationConfig = Object.assign({}, body.generationConfig || {}, { thinkingConfig: ts });
  var kq = khoGoi_('VIDEO', model, body, tuyChon);
  if (ts && !kq.ok && kq.code === 400 && /thinking|generationConfig|Invalid JSON payload/i.test(String(kq.raw))) {
    CacheService.getScriptCache().put('KHONG_SUY_NGHI_' + String(model).toLowerCase(), '1', 21600);
    delete body.generationConfig.thinkingConfig;
    nhatKy_('GEMINI', model + ' không nhận tham số suy nghĩ, gọi lại không kèm');
    kq = khoGoi_('VIDEO', model, body, tuyChon);
  }
  return kq;
}

function docKetQua_(noiDungPhanHoi) {
  var j = JSON.parse(noiDungPhanHoi);
  var txt = (((j.candidates || [])[0] || {}).content || {}).parts;
  if (!txt) throw new Error('GEMINI_KHONG_CO_NOI_DUNG');
  var s = txt.filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join('').replace(/^```json|^```|```$/gm, '').trim();
  try { return JSON.parse(s); } catch (e) { throw new Error('GEMINI_JSON_LOI'); }
}

// Gọi nhiều yêu cầu Gemini ĐỒNG THỜI, chọn model khỏe nhất đầu tiên trong danhSachModel_() (không cố định MODEL_CHINH).
// Yêu cầu nào lỗi sẽ tự động đổi sang các model dự phòng qua goiGemini_().
function goiGeminiSong_(ds) {
  if (!khoDanhSachKey_().length) throw new Error('THIEU_GEMINI_API_KEY');
  var muc = cauHinh_('MUC_SUY_NGHI_GIAI');
  var models = danhSachModel_();
  var modelChon = models[0] || 'gemini-2.5-flash';
  var ts = thamSoSuyNghi_(modelChon, muc);
  var bodies = ds.map(function (d) {
    var gc = { temperature: d.nhiet, responseMimeType: 'application/json' };
    if (ts) gc.thinkingConfig = ts;
    return { contents: [{ parts: [{ text: d.prompt }] }], generationConfig: gc };
  });
  var tBat = Date.now();
  var kq = khoGoiSong_('VIDEO', modelChon, bodies);
  var tSong = Math.round((Date.now() - tBat) / 1000);
  var goiLai = 0;
  var cache = CacheService.getScriptCache();
  var ketQua = kq.map(function (r, i) {
    if (r && r.ok) {
      try {
        var parsed = docKetQua_(r.raw);
        cache.put('MODEL_TOT_NHAT', r.model || modelChon, 1800);
        return parsed;
      } catch (e) { /* rơi xuống gọi lại bằng chuỗi model dự phòng */ }
    } else if (r && laModelKhongCo_(r)) {
      cache.put('MODEL_HONG_' + modelChon, '1', 21600);
    } else if (r && laQuaTai_(r)) {
      cache.put('QUA_TAI_' + modelChon, '1', 600);
    }
    goiLai++;
    return goiGemini_(ds[i].prompt, ds[i].nhiet, { suyNghi: muc });
  });
  nhatKy_('GEMINI', ds.length + ' yêu cầu song song (model ' + modelChon + '): chờ ' + tSong + ' giây; ' + goiLai + ' yêu cầu tự đổi model/gọi lại; tổng ' + Math.round((Date.now() - tBat) / 1000) + ' giây');
  return ketQua;
}

/* ===================== TỰ ĐỘNG DÒ LẠI & NÂNG CẤP VIDEO CŨ / ĐANG CHỜ TRÊN GOOGLE DRIVE ===================== */

// Kiểm tra một dòng đề đã ở phiên bản edit mới nhất (PHIEN_BAN_EDIT) chưa
function daNangCapEditMoi_(r) {
  try {
    var o = JSON.parse(String(r.ai_kiem_tra || '{}')) || {};
    if (Number(o.phien_ban) >= PHIEN_BAN_EDIT) return true;
  } catch (e) {}
  return false;
}

// Menu / Lệnh Zalo / Tự động: Dò lại toàn bộ video cũ hoặc đang chờ trên Sheet và Google Drive,
// đưa về viết lại kịch bản & dựng lại theo phiên bản edit mới (Manim đường phụ + nét đứt 3D + minh họa đa khung hình).
function quetVaSuaVideoCuDrive() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_HANG_DOI);
  var kq = doVaSuaVideoCuTrenDrive_(sh, 20, true);
  PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
  var tb = '🔄 Đã rà soát Google Drive & Sheet: nâng cấp ' + kq.sheet + ' video đang chờ trong Sheet và khôi phục ' + kq.drive + ' video cũ từ Drive sang phiên bản edit mới (v' + PHIEN_BAN_EDIT + ').';
  Logger.log(tb);
  try { ss.toast(tb, 'Video AI', 8); } catch (e) {}
  return tb;
}

function doVaSuaVideoCuTrenDrive_(sh, toiDa, quetSauDrive) {
  toiDa = Number(toiDa) || 3;
  var daSuaSheet = 0, daKhoiPhucDrive = 0;
  var hang = docHang_(sh);
  var idTrongSheet = {};
  hang.forEach(function (r) { if (r.id) idTrongSheet[r.id] = r; });

  // 1) Rà soát các video đang chờ / có sẵn trong HANG_DOI (CO_VIDEO, CO_KICH_BAN, LOI, hoặc DANG_DUNG bị kẹt) chưa lên phiên bản mới
  for (var i = 0; i < hang.length && daSuaSheet < toiDa; i++) {
    var r = hang[i];
    if (!r || !r.id || daNangCapEditMoi_(r)) continue;
    var tt = String(r.trang_thai || '');
    if (['CO_VIDEO', 'CO_KICH_BAN', 'LOI'].indexOf(tt) < 0) continue;
    // Kiểm tra xem kịch bản trên Drive đã có _phien_ban_edit >= PHIEN_BAN_EDIT chưa
    var kbCu = null;
    if (r.file_kich_ban) {
      try { kbCu = JSON.parse(DriveApp.getFileById(String(r.file_kich_ban)).getBlob().getDataAsString()); } catch (eKb) { kbCu = null; }
    }
    if (kbCu && Number(kbCu._phien_ban_edit) >= PHIEN_BAN_EDIT && tt !== 'LOI') {
      var kt0 = {};
      try { kt0 = JSON.parse(String(r.ai_kiem_tra || '{}')) || {}; } catch (e0) {}
      kt0.phien_ban = PHIEN_BAN_EDIT;
      ghi_(sh, r._row, { ai_kiem_tra: JSON.stringify(kt0).slice(0, 1800) });
      continue;
    }
    // Chuyển file video cũ, ảnh kiểm tra, ảnh bìa cũ vào thùng rác Drive để dựng lại bản mới
    [r.file_video, r.anh_kt, r.anh_bia].forEach(function (fid) {
      if (fid) { try { DriveApp.getFileById(String(fid)).setTrashed(true); } catch (eTrash) {} }
    });
    try { xoaNhapKichBan_(r.id); } catch (eN) {}
    var coGiai = !!(r.cach_1 && r.dap_an);
    if (typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r)) {
      try { var c1H = JSON.parse(String(r.cach_1 || '{}')); if (!c1H || !c1H.hinh_toa_do) coGiai = false; } catch (eH) { coGiai = false; }
    } else if (!coGiai && kbCu && kbCu.cach_giai && (kbCu.dap_an || r.dap_an)) {
      r.cach_1 = JSON.stringify(kbCu.cach_giai);
      r.dap_an = r.dap_an || kbCu.dap_an;
      coGiai = true;
    }
    var ktMoi = { phien_ban: PHIEN_BAN_EDIT, nang_cap_tu_cu: true, luc_nang_cap: new Date().toISOString() };
    ghi_(sh, r._row, {
      trang_thai: coGiai ? 'DA_GIAI' : 'MOI',
      cach_1: r.cach_1 || '',
      dap_an: r.dap_an || '',
      file_video: '',
      anh_kt: '',
      anh_bia: '',
      duyet: '',
      so_lan_loi: 0,
      ai_kiem_tra: JSON.stringify(ktMoi),
      ghi_chu: 'Nâng cấp cách edit sang phiên bản mới (v' + PHIEN_BAN_EDIT + ')'
    });
    nhatKy_('NANG_CAP_VIDEO_CU', r.id + ' (' + tt + ') -> đưa về ' + (coGiai ? 'DA_GIAI' : 'MOI') + ' để sửa cách edit sang bản v' + PHIEN_BAN_EDIT);
    daSuaSheet++;
  }

  // 2) Dò trong Google Drive (thư mục kich_ban, da_xong, video, THU_MUC_GOC) tìm các kịch bản/video cũ đã rời khỏi HANG_DOI
  if (daSuaSheet < toiDa || quetSauDrive) {
    try {
      var p = PropertiesService.getScriptProperties();
      var daQuet = {};
      try { daQuet = JSON.parse(p.getProperty('DA_NANG_CAP_DRIVE_V' + PHIEN_BAN_EDIT) || '{}') || {}; } catch (eQ) { daQuet = {}; }
      var tmKb = thuMucKichBan_();
      var goc = tmKb.getParents().hasNext() ? tmKb.getParents().next() : tmKb;
      var dsThuMuc = [tmKb];
      ['da_xong', 'video'].forEach(function (tenTM) {
        var itF = goc.getFoldersByName(tenTM);
        if (itF.hasNext()) dsThuMuc.push(itF.next());
      });
      dsThuMuc.push(goc);

      // Lập bản đồ các file video .mp4 cũ trên Drive theo mã đề để dọn khi dựng lại
      var videoCuTheoId = {};
      dsThuMuc.forEach(function (tm) {
        var itV = tm.getFiles();
        var demV = 0;
        while (itV.hasNext() && demV < 150) {
          var fv = itV.next(); demV++;
          var tenV = String(fv.getName() || '');
          var mV = /^([A-Za-z]{2}\d{6}-\d{6}(?:-\d+)?)\.mp4$/i.exec(tenV);
          if (mV) videoCuTheoId[mV[1]] = fv;
        }
      });

      for (var t = 0; t < dsThuMuc.length && (daSuaSheet + daKhoiPhucDrive) < toiDa; t++) {
        var it = dsThuMuc[t].getFiles();
        var demF = 0;
        while (it.hasNext() && (daSuaSheet + daKhoiPhucDrive) < toiDa && demF < 150) {
          var f = it.next(); demF++;
          var ten = String(f.getName() || '');
          if (!/\.json$/i.test(ten) || /^nhap_|^tiktok/i.test(ten)) continue;
          var idDe = ten.replace(/\.json$/i, '');
          if (!/^[A-Za-z]{2}\d{6}-\d{6}(-\d+)?$/.test(idDe)) continue;
          if (idTrongSheet[idDe] || daQuet[idDe]) continue;
          daQuet[idDe] = 1;
          var kb = null;
          try { kb = JSON.parse(f.getBlob().getDataAsString()); } catch (eJ) { kb = null; }
          if (!kb || !kb.de_bai || Number(kb._phien_ban_edit) >= PHIEN_BAN_EDIT) continue;
          // Nếu có file .mp4 cũ trên Drive, bỏ vào thùng rác để thay bằng bản mới
          if (videoCuTheoId[idDe]) { try { videoCuTheoId[idDe].setTrashed(true); } catch (eTv) {} }
          var monDe = String(kb.mon || (/^HH/.test(idDe) ? 'HINH_HOC' : /^TT/.test(idDe) ? 'THUC_TE' : 'XAC_SUAT')).toUpperCase();
          var coCG = !!(kb.cach_giai && kb.dap_an && (monDe !== 'HINH_HOC' || kb.cach_giai.hinh_toa_do));
          themHang_(sh, {
            id: idDe,
            trang_thai: coCG ? 'DA_GIAI' : 'MOI',
            lop: kb.lop || '12',
            chu_de: kb.chu_de || 'Nâng cấp video cũ',
            de_bai: kb.de_bai,
            nguon: 'DRIVE_CU',
            mon: monDe,
            diem_tu_duy: 8,
            yeu_to_tu_duy: kb.y_tuong_chinh || '',
            bay_thuong_gap: '',
            cach_1: kb.cach_giai ? JSON.stringify(kb.cach_giai) : '',
            cach_2: kb.cach_giai ? JSON.stringify(kb.cach_giai) : '',
            dap_an: kb.dap_an || '',
            dap_an_hien: kb.dap_an_hien || '',
            file_kich_ban: f.getId(),
            ghi_chu: 'Khôi phục từ Drive để sửa cách edit sang bản mới v' + PHIEN_BAN_EDIT,
            so_lan_loi: 0,
            cap_nhat: new Date(),
            ma_bam: bam_(kb.de_bai),
            san_pham: kb.san_pham ? JSON.stringify(kb.san_pham) : '',
            ai_kiem_tra: JSON.stringify({ phien_ban: PHIEN_BAN_EDIT, khoi_phuc_drive: true })
          });
          idTrongSheet[idDe] = true;
          nhatKy_('KHOI_PHUC_VIDEO_CU', idDe + ' -> đưa từ Drive vào HANG_DOI để dựng lại theo bản mới v' + PHIEN_BAN_EDIT);
          daKhoiPhucDrive++;
        }
      }
      var keysQ = Object.keys(daQuet);
      if (keysQ.length > 300) {
        var gonQ = {};
        keysQ.slice(-300).forEach(function (k) { gonQ[k] = 1; });
        daQuet = gonQ;
      }
      p.setProperty('DA_NANG_CAP_DRIVE_V' + PHIEN_BAN_EDIT, JSON.stringify(daQuet));
    } catch (eDr) { nhatKy_('QUET_DRIVE_LOI', eDr.message); }
  }
  return { sheet: daSuaSheet, drive: daKhoiPhucDrive };
}

/* ===================== BỘ PHẬN 1 TRÊN GITHUB (lần 23) ===================== */
// Apps Script chỉ ĐIỀU PHỐI: gửi đề sang GitHub (workflow bo-phan-1.yml). GitHub chạy NGUYÊN mã giải + kiểm chứng + viết + chấm +
// tự sửa kịch bản (không giới hạn 6 phút, nhiều đề song song) rồi gửi kết quả về doPost (nhanKetQuaBoPhan1_).
// Dự phòng: gửi GitHub lỗi, GitHub báo lỗi hoặc quá GH_QUA_HAN_PHUT phút không trả lời -> đề đó làm tại Apps Script như cũ.
var GH_QUA_HAN_PHUT = 35;
function giaiTrenGitHub_() { return String(cauHinh_('GIAI_TREN_GITHUB') || 'BAT').toUpperCase() !== 'TAT'; }

function lamBoPhan1_(sh, bc, bat, chiUuTien) {
  var gh = giaoBoPhan1ChoGitHub_(sh, chiUuTien);
  // đề phải làm tại chỗ (GitHub lỗi/quá hạn), hoặc không gửi được sang GitHub -> làm tại Apps Script
  var taiCho = gh.loi ? null : docHang_(sh).filter(function (r) { return /^TAI_CHO/.test(String(r.ghi_chu)) && (r.trang_thai === 'MOI' || r.trang_thai === 'DA_GIAI'); }).map(function (r) { return r.id; });
  if (gh.loi || taiCho.length) {
    xuLyKichBan_(sh, bc, bat, chiUuTien, taiCho);
    xuLyGiai_(sh, bc, bat, chiUuTien, taiCho);
  }
}

// Dữ liệu gửi kèm: dòng đề + CAU_HINH (bỏ mục bí mật) + series/kiểu hook/bài học số liệu đã tính sẵn + bản nháp kịch bản (nếu có).
// KEY HẾT HẠN MỨC NGÀY mà GitHub đã phát hiện ("model|6 ký tự đầu_4 cuối", không lưu key đầy đủ): nhớ đến hết ngày
// giờ Thái Bình Dương (lúc Google reset hạn mức) để lần chạy sau bỏ qua ngay, không mất thời gian dò lại.
function ngayPT_() { return Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd'); }
function docKeyHetNgay_() {
  try { var o = JSON.parse(PropertiesService.getScriptProperties().getProperty('KEY_HET_NGAY_GH') || '{}'); return o.ngay === ngayPT_() ? (o.ds || []) : []; } catch (e) { return []; }
}
function ghiKeyHetNgay_(ds) {
  if (!Array.isArray(ds) || !ds.length) return;
  var cu = docKeyHetNgay_();
  ds.forEach(function (x) { x = String(x).slice(0, 80); if (cu.indexOf(x) < 0) cu.push(x); });
  PropertiesService.getScriptProperties().setProperty('KEY_HET_NGAY_GH', JSON.stringify({ ngay: ngayPT_(), ds: cu.slice(-200) }));
}
function goiDeChoGitHub_(r) {
  var hang = {};
  COT.forEach(function (k) { var v = r[k]; hang[k] = v instanceof Date ? v.toISOString() : (v === undefined || v === null ? '' : v); });
  var ch = {};
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_CAU_HINH);
  if (sheet) sheet.getDataRange().getValues().slice(1).forEach(function (x) {
    var k = String(x[0] || '').trim();
    if (k && String(x[1]) !== '' && !/TOKEN|SECRET|KEY|MAT_KHAU|PASS|CLIENT/i.test(k)) ch[k] = String(x[1]).slice(0, 1500);
  });
  var tk = {};
  var p = PropertiesService.getScriptProperties().getProperties();
  Object.keys(p).forEach(function (k) { if (/^TB_/.test(k)) tk[k] = p[k]; });
  // lượt lỗi do Apps Script bị cắt 6 phút (ghi chú DANG_...) không phải lỗi của đề: GitHub làm lại từ đầu
  if (/^DANG_|^TAI_CHO|^Chờ/.test(String(hang.ghi_chu))) { hang.so_lan_loi = 0; hang.ghi_chu = ''; }
  if (!ch.SO_LAN_SUA_KICH_BAN) ch.SO_LAN_SUA_KICH_BAN = '6';
  if (!ch.MAX_LAN_LOI || Number(ch.MAX_LAN_LOI) < 3) ch.MAX_LAN_LOI = '3';
  var goi = { hang: hang, cau_hinh: ch, thong_ke: tk, series: null, hook: '', goi_y: '' };
  try { if (typeof xacDinhSeries_ === 'function') goi.series = xacDinhSeries_(r); } catch (e) {}
  try { if (typeof chonKieuHook_ === 'function') goi.hook = chonKieuHook_(); } catch (e) {}
  try { if (typeof goiYTuSoLieu_ === 'function') goi.goi_y = goiYTuSoLieu_(); } catch (e) {}
  try { if (typeof hocEditChoPrompt_ === 'function') goi.hoc_edit = hocEditChoPrompt_(); } catch (e) {}
  try { if (typeof quyTacHocChoPrompt_ === 'function') { goi.quy_tac_hoc = quyTacHocChoPrompt_(); goi.quy_tac_kd = quyTacHocChoKiemDuyet_(); } } catch (e) {}
  try { if (typeof chonPhongCachVideo_ === 'function') { goi.phong_cach = chonPhongCachVideo_(r); goi.cau_noi = cauNoiGanDay_(r.id).slice(-40); } } catch (e) {}
  goi.het_ngay = docKeyHetNgay_();
  var nhap = docNhapKichBan_(r.id);
  if (nhap) goi.nhap = JSON.stringify(nhap);
  var s = JSON.stringify(goi);
  if (s.length > 60000) { goi.goi_y = ''; goi.hoc_edit = ''; s = JSON.stringify(goi); }
  if (s.length > 60000) { delete goi.nhap; s = JSON.stringify(goi); }
  return s.length > 60000 ? null : s;
}

function giaoBoPhan1ChoGitHub_(sh, chiUuTien) {
  var bayGio = Date.now();
  var dangChay = 0;
  docHang_(sh).forEach(function (r) {
    if (r.trang_thai !== 'GITHUB') return;
    var m = /^GITHUB\|(\d+)\|(\w+)/.exec(String(r.ghi_chu));
    var luc = m ? Number(m[1]) : (r.cap_nhat instanceof Date ? r.cap_nhat.getTime() : 0);
    if (bayGio - luc > GH_QUA_HAN_PHUT * 60000) {
      ghi_(sh, r._row, { trang_thai: m ? m[2] : 'MOI', ghi_chu: 'TAI_CHO: GitHub không trả kết quả sau ' + GH_QUA_HAN_PHUT + ' phút, làm tại Apps Script' });
      if (typeof kiemTraGitHubBiChan_ === 'function') kiemTraGitHubBiChan_();
      nhatKy_('GITHUB_BP1', r.id + ': GitHub quá hạn, chuyển về làm tại Apps Script');
    } else dangChay++;
  });
  var toiDa = (Number(cauHinh_('SO_DE_GITHUB_CUNG_LUC')) || 3) + (typeof heSoSanXuat_ === 'function' ? heSoSanXuat_().them_song_song : 0);
  var ds = docHang_(sh).filter(function (r) {
    return ((r.trang_thai === 'MOI' && r.de_bai) || r.trang_thai === 'DA_GIAI') && !/^TAI_CHO/.test(String(r.ghi_chu)) && (!chiUuTien || laUuTien_(r));
  }).sort(function (a, b) {
    var u = (laUuTien_(b) ? 1 : 0) - (laUuTien_(a) ? 1 : 0);
    var g = (b.trang_thai === 'DA_GIAI' ? 1 : 0) - (a.trang_thai === 'DA_GIAI' ? 1 : 0);   // đã giải -> ra kịch bản trước
    return u || g || new Date(a.cap_nhat).getTime() - new Date(b.cap_nhat).getTime();
  });
  var gui = 0;
  var cacheBP1 = CacheService.getScriptCache();
  for (var i = 0; i < ds.length; i++) {
    var r = ds[i];
    if (dangChay >= toiDa && !laUuTien_(r)) break;
    if (cacheBP1.get('GUI_BP1_' + r.id)) continue;   // đã gửi trong 3 phút gần đây -> không gửi trùng gây hủy job cũ
    var duLieu = goiDeChoGitHub_(r);
    if (!duLieu) { ghi_(sh, r._row, { ghi_chu: 'TAI_CHO: dữ liệu đề quá lớn để gửi GitHub' }); continue; }
    cacheBP1.put('GUI_BP1_' + r.id, '1', 180);
    var trangThaiCu = r.trang_thai, ghiChuCu = r.ghi_chu;
    ghi_(sh, r._row, { trang_thai: 'GITHUB', ghi_chu: 'GITHUB|' + Date.now() + '|' + trangThaiCu + ' (đang ' + (trangThaiCu === 'MOI' ? 'giải + viết kịch bản' : 'viết kịch bản') + ' trên GitHub)' });
    var kq = guiWorkflowGitHub_({ id: r.id, de: duLieu }, 'bo-phan-1.yml');
    if (!kq.ok) {
      cacheBP1.remove('GUI_BP1_' + r.id);
      ghi_(sh, r._row, { trang_thai: trangThaiCu, ghi_chu: ghiChuCu });
      nhatKy_('GITHUB_BP1_LOI', 'Không gửi được đề sang GitHub (' + kq.loi + '), lần này làm tại Apps Script');
      guiZaloMotLan_('GH_BP1_' + kq.ma + '_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd'), '⚠️ Không gửi được đề sang GitHub để giải (' + String(kq.loi).slice(0, 150) + '). Hệ thống tạm làm tại Apps Script (chậm hơn).');
      return { gui: gui, loi: kq.loi };
    }
    nhatKy_('GITHUB_BP1', r.id + ' -> đã gửi GitHub ' + (trangThaiCu === 'MOI' ? 'giải + viết kịch bản' : 'viết kịch bản') + (laUuTien_(r) ? ' (ưu tiên)' : ''));
    dangChay++;
    gui++;
  }
  return { gui: gui };
}

// Kết quả từ GitHub (doPost, loai = bo_phan_1): ghi các cột, lưu kịch bản lên Drive, báo Zalo, rồi chạy tiếp ngay (gửi dựng video,
// gửi đề kế tiếp sang GitHub) mà không chờ trigger.
function nhanKetQuaBoPhan1_(sh, d) {
  if (d && d.id && CacheService.getScriptCache().get('DA_BO_' + d.id)) return { ok: true, lap: true };
  var r = null;
  docHang_(sh).forEach(function (x) { if (x.id === d.id) r = x; });
  if (!r) return { ok: false, loi: 'KHONG_TIM_THAY' };
  if (r.trang_thai !== 'GITHUB') return { ok: true, lap: true };
  var m = /^GITHUB\|\d+\|(\w+)/.exec(String(r.ghi_chu));
  var cu = m ? m[1] : 'MOI';
  (d.nhat_ky || []).slice(-30).forEach(function (x) { nhatKy_(x[1], '[GitHub] ' + x[2]); });
  try { ghiKeyHetNgay_(d.het_ngay); } catch (eHN) {}
  if (!d.hang || (!d.ok && !Object.keys(d.hang).length)) {
    var lyDo = String(d.loi || 'GitHub báo lỗi');
    var tamNghi = /^(QUA_TAI|HET_HAN_MUC)$/.test(lyDo);
    ghi_(sh, r._row, { trang_thai: cu, ghi_chu: tamNghi ? 'Chờ Gemini (' + lyDo + '), GitHub sẽ thử lại' : 'TAI_CHO: GitHub lỗi (' + lyDo.slice(0, 150) + '), làm tại Apps Script' });
    if (lyDo === 'HET_HAN_MUC') { datNghi_(60); guiZaloMotLan_('GH_HHM_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd'), '⏸ Mọi key Gemini trên GitHub đã hết hạn mức hôm nay, Bộ phận 1 tạm nghỉ 60 phút.', 'vua'); }
    else if (lyDo === 'QUA_TAI') datNghi_(10);
    if (/THIEU_GEMINI/.test(lyDo)) guiZaloMotLan_('GH_THIEU_KEY_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd'), '⚠️ GitHub chưa có key Gemini (Secret GEMINI_KEYS) nên đề đang được làm tại Apps Script (chậm). Thêm Secret để chạy nhanh.');
    nhatKy_('GITHUB_BP1', r.id + ': GitHub lỗi: ' + lyDo.slice(0, 200));
    return { ok: true };
  }
  var f = {};
  Object.keys(d.hang).forEach(function (k) { if (COT.indexOf(k) >= 0 && k !== 'id' && k !== 'cap_nhat') f[k] = d.hang[k]; });
  if (!f.trang_thai) f.trang_thai = cu;
  if (f.ghi_chu === undefined) f.ghi_chu = '';
  if (d.kich_ban) {
    try {
      var kbObj = JSON.parse(String(d.kich_ban));
      kbObj._phien_ban_edit = PHIEN_BAN_EDIT;
      d.kich_ban = JSON.stringify(kbObj);
      if (typeof ghiCauNoi_ === 'function') ghiCauNoi_(kbObj);
    } catch (eCN) {}   // nhớ câu mở đầu cảnh để video sau không lặp
    var tep = thuMucKichBan_().createFile(r.id + '.json', String(d.kich_ban), MimeType.PLAIN_TEXT);
    f.file_kich_ban = tep.getId();
    var ktG = {};
    try { ktG = JSON.parse(String(f.ai_kiem_tra || r.ai_kiem_tra || '{}')) || {}; } catch (eKt) { ktG = {}; }
    ktG.phien_ban = PHIEN_BAN_EDIT;
    f.ai_kiem_tra = JSON.stringify(ktG).slice(0, 1800);
    xoaNhapKichBan_(r.id);
  } else if (d.nhap) {
    try { luuNhapKichBan_(r.id, JSON.parse(d.nhap)); } catch (e) {}
  }
  if (d.loi === 'QUA_TAI') datNghi_(10);
  ghi_(sh, r._row, f);
  if (d.series_ghi && typeof ghiTapCuoiSeries_ === 'function') { try { ghiTapCuoiSeries_(d.series_ghi.se, d.series_ghi.tieu_de); } catch (e) {} }
  (d.zalo || []).forEach(function (z) { try { if (z.id) baoZaloDe_(r, z.noi_dung, z.muc); else guiZalo_(z.noi_dung, z.muc, z.khoa); } catch (e) {} });
  nhatKy_('GITHUB_BP1', r.id + ' -> ' + f.trang_thai + (d.kich_ban ? ' (đã lưu kịch bản)' : '') + (d.loi ? ' | ' + d.loi : ''));
  // đề máy tự sinh bị loại/lỗi: hệ thống tự thay đề khác, không làm phiền (vẫn có trong báo cáo ngày); đề bạn gửi thì báo
  if (f.trang_thai === 'XOA' && /^BO_KHONG_DAT/.test(String(f.ghi_chu || '')) && laUuTien_(r)) baoZaloDe_(r, '❌ Đề ' + r.id + ' không đạt kiểm duyệt yêu cầu nên hệ thống đã bỏ (không dựng video): ' + String(f.ghi_chu).slice(0, 220), 'cao');
  else if ((f.trang_thai === 'LOAI' || f.trang_thai === 'XOA' || f.trang_thai === 'LOI') && laUuTien_(r)) baoZaloDe_(r, (f.trang_thai !== 'LOI' ? '❌ Không làm video cho đề ' : '⚠️ Đề ') + r.id + (f.trang_thai !== 'LOI' ? ' (không có đáp án chắc chắn, đã xóa khỏi danh sách): ' : ' tạm dừng vì lỗi: ') + String(f.ghi_chu || '').slice(0, 200), 'cao');
  if (f.trang_thai === 'XOA' || f.trang_thai === 'LOAI') PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');   // dọn khỏi sheet ở lần chạy tới
  // chạy tiếp ngay: có kịch bản -> gửi dựng; còn đề chờ -> gửi GitHub
  if (f.trang_thai === 'CO_KICH_BAN' && typeof chonVaGuiDung_ === 'function') { try { chonVaGuiDung_(sh); } catch (e) { nhatKy_('DUNG_LOI', e.message); } }
  try { if (!dangNghi_()) giaoBoPhan1ChoGitHub_(sh, false); } catch (e) { nhatKy_('GITHUB_BP1_LOI', e.message); }
  PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
  return { ok: true };
}

/* ===================== TIỆN ÍCH ===================== */

// Còn đủ thời gian để làm thêm một việc cần khoảng canMs mili-giây không?
function duThoiGian_(bat, canMs) { return (Date.now() - bat) + canMs < THOI_GIAN_TOI_DA_MS; }
// Như duThoiGian_ nhưng việc ĐẦU TIÊN của mỗi lần chạy luôn được làm. Trước đây, sau vài lần giải chậm (Gemini quá tải,
// hết hạn mức model chính phải dùng model dự phòng) thời gian trung bình đo được vượt ~4 phút, nên mọi lần chạy đều
// "không đủ thời gian" ngay từ giây đầu và đề đứng yên mãi. Việc nào thật sự quá 6 phút vẫn bị batDauViec_ đếm lỗi như cũ.
function duThoiGianViec_(bat, canMs) {
  if (Date.now() - bat < 30000) return true;
  return duThoiGian_(bat, canMs);
}
// Thời gian trung bình đã đo được cho từng loại việc (lưu trong Script Properties).
// Lấy số đo THẬT (bản cũ chặn trần ở mức mặc định nên luôn đoán thiếu, bắt đầu việc không kịp làm xong rồi bị ngắt).
function tbMs_(khoa, macDinh) {
  var v = Number(PropertiesService.getScriptProperties().getProperty(khoa));
  return v > 0 ? Math.max(20000, Math.min(v, 280000)) : macDinh;
}
function capNhatTb_(khoa, ms) {
  var cu = tbMs_(khoa, ms);
  ms = Math.min(ms, 280000);
  // lần chậm hơn trung bình được tính nặng hơn (an toàn), lần nhanh hơn chỉ kéo xuống từ từ
  var w = ms > cu ? 0.6 : 0.3;
  PropertiesService.getScriptProperties().setProperty(khoa, String(Math.round(cu * (1 - w) + ms * w)));
}

// Ghi nhật ký vào sheet NHAT_KY để biết hệ thống dừng ở đâu (kể cả khi bị Apps Script ngắt do quá 6 phút).
function nhatKy_(muc, noiDung) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('NHAT_KY') || ss.insertSheet('NHAT_KY');
    if (sh.getLastRow() === 0) sh.appendRow(['thoi_gian', 'muc', 'noi_dung']);
    sh.appendRow([new Date(), muc, String(noiDung).slice(0, 500)]);
    if (sh.getLastRow() > 500) sh.deleteRows(2, 100);
    SpreadsheetApp.flush();
  } catch (e) { Logger.log('Khong ghi duoc nhat ky: ' + e.message); }
}

// Chạy hàm này nếu hệ thống đang "tạm nghỉ" sau khi báo hết hạn mức và bạn muốn chạy lại ngay.
function xoaNghi() {
  PropertiesService.getScriptProperties().deleteProperty('NGHI_DEN');
  Logger.log('Đã bỏ trạng thái tạm nghỉ.');
}

function xuLyLoiHang_(sh, r, e, bc) {
  var msg = String(e.message);
  if (msg === 'HET_HAN_MUC' || msg === 'HET_GIO' || msg === 'QUA_TAI') {
    // không phải lỗi của đề: trả lại lượt đã tính ở batDauViec_
    ghi_(sh, r._row, { so_lan_loi: Math.max(0, (Number(r.so_lan_loi) || 1) - 1), ghi_chu: msg === 'HET_GIO' ? 'Chờ lần chạy sau (hết thời gian)' : msg === 'QUA_TAI' ? 'Chờ Gemini hết quá tải' : 'Chờ hạn mức Gemini' });
    throw e;
  }
  nhatKy_('LOI_DONG', r.id + ': ' + e.message);
  var n = Number(r.so_lan_loi) || 1;   // đã được tăng ở batDauViec_
  var f = { so_lan_loi: n, ghi_chu: String(e.message).slice(0, 300) };
  if (n >= Number(cauHinh_('MAX_LAN_LOI'))) {
    f.trang_thai = 'LOI';
    // kịch bản sửa nhiều lần vẫn không hợp lệ: không để đề nằm chờ mãi -> xóa đề, hệ thống làm đề mới
    if (/^KICH_BAN_KHONG_HOP_LE/.test(msg)) { f.trang_thai = 'XOA'; f.ghi_chu = ('BO_KHONG_DAT (kịch bản): sửa ' + n + ' lần vẫn lỗi - ' + msg).slice(0, 300); PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1'); }
  }
  ghi_(sh, r._row, f);
  bc.loi++;
  if (f.trang_thai === 'XOA' && laUuTien_(r)) baoZaloDe_(r, '❌ Đề ' + r.id + ': kịch bản sửa ' + n + ' lần vẫn chưa đạt nên hệ thống bỏ đề này. Bạn có thể gửi lại đề rõ hơn.', 'cao');
  if (f.trang_thai === 'LOI' && laUuTien_(r)) baoZaloDe_(r, '⚠️ Đề ' + r.id + ' gặp lỗi ' + n + ' lần nên tạm dừng: ' + String(e.message).slice(0, 160) + '\nCác đề khác chạy tiếp. Bạn có thể gửi lại đề.', 'cao');
}

function chuanHoa_(c) {
  if (!c) return null;
  var tu = Number(c.tu), mau = Number(c.mau);
  if (!(tu > 0 && mau > 0 && tu <= mau && Math.floor(tu) === tu && Math.floor(mau) === mau)) return null;
  var g = gcd_(tu, mau);
  return { tu: tu / g, mau: mau / g };
}
function gcd_(a, b) { while (b) { var t = b; b = a % b; a = t; } return a; }

function cauHinh_(khoa) {
  if (!_bo_nho_cau_hinh_) {
    _bo_nho_cau_hinh_ = {};
    var ch = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_CAU_HINH);
    if (ch) {
      var v = ch.getDataRange().getValues();
      for (var i = 1; i < v.length; i++) if (v[i][0] && String(v[i][1]) !== '') _bo_nho_cau_hinh_[v[i][0]] = String(v[i][1]);
    }
  }
  return _bo_nho_cau_hinh_[khoa] !== undefined ? _bo_nho_cau_hinh_[khoa] : MAC_DINH[khoa];
}

function docHang_(sh) {
  var v = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    var o = { _row: i + 1 };
    for (var j = 0; j < COT.length; j++) {
      var val = v[i][j];
      if ((COT[j] === 'dap_an' || COT[j] === 'dap_an_hien') && val instanceof Date && !isNaN(val.getTime())) {
        val = val.getDate() + '/' + (val.getMonth() + 1);
      }
      o[COT[j]] = val;
    }
    out.push(o);
  }
  return out;
}
function ghi_(sh, row, f) {
  f.cap_nhat = new Date();
  Object.keys(f).forEach(function (k) {
    var c = COT.indexOf(k);
    if (c >= 0) {
      var val = f[k];
      if ((k === 'dap_an' || k === 'dap_an_hien') && typeof val === 'string' && /^\s*\d+\s*\/\s*\d+\s*$/.test(val)) {
        val = "'" + val.trim();
      }
      sh.getRange(row, c + 1).setValue(val);
    }
  });
}
function themHang_(sh, o) {
  sh.appendRow(COT.map(function (k) {
    var val = o[k] === undefined ? '' : o[k];
    if ((k === 'dap_an' || k === 'dap_an_hien') && typeof val === 'string' && /^\s*\d+\s*\/\s*\d+\s*$/.test(val)) {
      return "'" + val.trim();
    }
    return val;
  }));
}

function bam_(s) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(s).toLowerCase().replace(/\s+/g, ' ').trim());
  return b.map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join('');
}

function thuMucKichBan_() {
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('THU_MUC_KICH_BAN_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var ten = cauHinh_('THU_MUC_GOC');
  var it = DriveApp.getFoldersByName(ten);
  var goc = it.hasNext() ? it.next() : DriveApp.createFolder(ten);
  var it2 = goc.getFoldersByName('kich_ban');
  var con = it2.hasNext() ? it2.next() : goc.createFolder('kich_ban');
  p.setProperty('THU_MUC_KICH_BAN_ID', con.getId());
  return con;
}

function dangNghi_() {
  var t = Number(PropertiesService.getScriptProperties().getProperty('NGHI_DEN') || 0);
  return Date.now() < t;
}
function datNghi_(phut) {
  PropertiesService.getScriptProperties().setProperty('NGHI_DEN', String(Date.now() + phut * 60000));
}

// Gửi tin qua Zalo Bot API: POST https://bot-api.zaloplatforms.com/bot<TOKEN>/sendMessage {chat_id, text}
// ZALO_CHAT_IDS là danh sách chat_id cách nhau bằng dấu phẩy (gửi cho nhiều người).
// MỌI thông báo của hệ thống đi qua MỘT bot: bot nhận đề (ZALO_BOT_TOKEN_DE; chưa có thì ZALO_BOT_TOKEN).
// muc: 'cao' = luôn gửi (video đã qua kiểm duyệt chờ bạn xem, báo cáo ngày, lỗi cần bạn ra tay)
//      'vua' = chỉ gửi khi CAU_HINH ZALO_THONG_BAO = VUA hoặc DAY_DU (đăng video thành công, hết hạn mức...)
//      'thap' (mặc định) = tiến độ, lỗi tạm thời đã tự xử lý: chỉ ghi NHAT_KY, gửi khi ZALO_THONG_BAO = DAY_DU
// khoa (tùy chọn): mỗi khóa chỉ gửi 1 lần trong 6 giờ, không bao giờ báo lặp.
function duocThongBao_(muc) {
  var che = String(cauHinh_('ZALO_THONG_BAO') || 'IT').trim().toUpperCase();
  var hang = { cao: 3, vua: 2, thap: 1 }[muc || 'thap'] || 1;
  return hang >= (che === 'DAY_DU' ? 1 : che === 'VUA' ? 2 : 3);
}
function guiZalo_(noiDung, muc, khoa) {
  if (!duocThongBao_(muc)) { try { nhatKy_('ZALO_AN', String(noiDung).replace(/\n/g, ' | ').slice(0, 300)); } catch (e0) {} return; }
  if (khoa) { var c = CacheService.getScriptCache(); if (c.get('ZALO_' + khoa)) return; c.put('ZALO_' + khoa, '1', 21600); }
  var token = typeof tokenNhanZalo_ === 'function' ? tokenNhanZalo_() : PropertiesService.getScriptProperties().getProperty('ZALO_BOT_TOKEN');
  var ds = typeof dsNhanThongBao_ === 'function' ? dsNhanThongBao_() : String(PropertiesService.getScriptProperties().getProperty('ZALO_CHAT_IDS') || '').split(',');
  if (!token || !ds.length) return;
  ds.forEach(function (id) {
    id = String(id).trim();
    if (!id) return;
    try {
      UrlFetchApp.fetch('https://bot-api.zaloplatforms.com/bot' + token + '/sendMessage', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ chat_id: id, text: String(noiDung).slice(0, 2000) })
      });
    } catch (e) { Logger.log('Loi gui Zalo: ' + e.message); }
  });
}

/* ===================== BẢNG DỄ ĐỌC (DOC_DE, DOC_KICH_BAN) – GIAO DIỆN MỚI ===================== */

var FONT = 'Palatino Linotype';      // đổi font tại đây. Nếu Sheets không nhận, thử: 'Lora', 'Merriweather', 'Georgia', 'Cambria'
var FONT_TOAN = 'Roboto Mono';       // font cho dòng công thức hiện trên màn hình
var CO_CHU = 11;                     // cỡ chữ chung cho toàn bộ sheet
var BANG_DE = 'DOC_DE';
var BANG_KB = 'DOC_KICH_BAN';
var SHEET_KY_THUAT = ['HANG_DOI', 'CAU_HINH', 'NHAT_KY', 'LUU_TRU'];

// Google Sheets không có tùy chọn "giãn dòng" thật, nên giả lập bằng cách tăng chiều cao hàng
// (mỗi dòng chữ chiếm DAN_DONG px, cộng DEM_HANG px đệm trên-dưới) và canh giữa theo chiều dọc.
// Muốn thoáng hơn: tăng DAN_DONG (ví dụ 22) hoặc DEM_HANG (ví dụ 24). Muốn gọn lại: giảm hai số này.
var DAN_DONG = 20;   // px cho mỗi dòng chữ (chữ cỡ 11 cao khoảng 15px)
var DEM_HANG = 18;   // px đệm thêm cho mỗi hàng

// Ước lượng số dòng chữ sau khi tự xuống dòng của một ô có bề rộng rongPx.
function uocSoDong_(text, rongPx) {
  var chuoi = String(text === null || text === undefined ? '' : text);
  var kyTu = Math.max(4, Math.floor((rongPx - 14) / 8.2 * 0.92));
  var tong = 0;
  chuoi.split('\n').forEach(function (d) { tong += Math.max(1, Math.ceil(d.length / kyTu)); });
  return tong;
}

// Đặt chiều cao từng hàng theo ô dài nhất (rongCot[c] = 0 nghĩa là bỏ qua cột đó). Gộp các hàng cùng chiều cao để gọi ít lệnh.
function datChieuCaoHang_(sh, hangDau, bang, rongCot) {
  var chieu = bang.map(function (row) {
    var max = 1;
    row.forEach(function (v, c) { if (rongCot[c]) max = Math.max(max, uocSoDong_(v, rongCot[c])); });
    return Math.round((max * DAN_DONG + DEM_HANG) / 10) * 10;
  });
  var i = 0;
  while (i < chieu.length) {
    var j = i;
    while (j + 1 < chieu.length && chieu[j + 1] === chieu[i]) j++;
    sh.setRowHeights(hangDau + i, j - i + 1, chieu[i]);
    i = j + 1;
  }
}

// Menu "Video AI" xuất hiện trên thanh menu của Google Sheet (cần tải lại trang sau khi lưu mã).
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🎬 Video AI')
    .addItem('▶ Chạy Bộ phận 1 ngay', 'chayBoPhan1')
    .addSubMenu(ui.createMenu('📚 Nguồn đề')
      .addItem('🌐 Ưu tiên đề có thật trên internet, thiếu mới dùng AI', 'cheDoUuTienInternet')
      .addItem('🌐 Chỉ lấy đề trên internet', 'cheDoChiInternet')
      .addItem('🤖 Chỉ để AI sáng tác', 'cheDoChiAI')
      .addItem('✍ Tự nhập đề (kho đề)', 'cheDoKhoDe'))
    .addSeparator()
    .addItem('✅ Đánh dấu đã làm video (các dòng đang chọn ở DOC_DE)', 'danhDauDaLamVideo')
    .addItem('📤 Đăng ngay video cũ nhất chờ đăng', 'dangNgay')
    .addItem('🎓 Tạo video dài 10 phút học tập (YouTube)', 'taoVideoDai10Phut')
    .addItem('🔁 Quét Drive & sửa toàn bộ video cũ sang bản mới', 'quetVaSuaVideoCuDrive')
    .addItem('☁️ Tự cập nhật mã .gs từ GitHub vào Apps Script', 'capNhatMaAppsScriptTuGitHub')
    .addItem('🔑 Xem số lượng Key Gemini còn dùng được (KhoKey)', 'khoXem')
    .addItem('🧹 Dọn ngay các đề đã xong', 'donNgay')
    .addItem('🔄 Cập nhật bảng đề và kịch bản', 'dongBoBangDoc')
    .addItem('🧱 Dựng lại bảng kịch bản', 'dungLaiBangKichBan')
    .addItem('✨ Làm đẹp toàn bộ', 'lamDepHangDoi')
    .addSeparator()
    .addItem('👁 Hiện các sheet kỹ thuật', 'hienSheetKyThuat')
    .addItem('🙈 Ẩn các sheet kỹ thuật', 'anSheetKyThuatNgay')
    .addItem('⏯ Bỏ trạng thái tạm nghỉ', 'xoaNghi')
    .addItem('🚑 Cứu các đề bị kẹt do quá 6 phút', 'cuuDongBiNgat')
    .addItem('🩺 Thử gọi Gemini (đo thời gian)', 'thuGoiGemini')
    .addToUi();
}

// Đổi chế độ nguồn đề (ghi vào sheet CAU_HINH, dòng CHE_DO_NGUON).
function datCauHinh_(khoa, giaTri) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ch = ss.getSheetByName(TEN_CAU_HINH) || ss.insertSheet(TEN_CAU_HINH);
  if (ch.getLastRow() === 0) ch.appendRow(['khoa', 'gia_tri']);
  var v = ch.getDataRange().getValues(), xong = false;
  for (var i = 1; i < v.length; i++) {
    if (v[i][0] === khoa) { ch.getRange(i + 1, 2).setValue(giaTri); xong = true; break; }
  }
  if (!xong) ch.appendRow([khoa, giaTri]);
  ss.toast('Nguồn đề: ' + giaTri, 'Video AI', 5);
}
function cheDoUuTienInternet() { datCauHinh_('CHE_DO_NGUON', 'UU_TIEN_INTERNET'); }
function cheDoChiInternet() { datCauHinh_('CHE_DO_NGUON', 'CHI_INTERNET'); }
function cheDoChiAI() { datCauHinh_('CHE_DO_NGUON', 'SANG_TAC'); }
function cheDoKhoDe() { datCauHinh_('CHE_DO_NGUON', 'KHO_DE'); }

function dongBoBangDoc() {
  try { napKichBanCu_(); capNhatDocDe_(); anSheetKyThuat_(false); }
  catch (e) { nhatKy_('LOI_BANG_DOC', e.message); }
}

// [nhãn, màu nền, màu chữ]
var NHAN_TRANG_THAI = {
  CHO_DOC: ['📥 Đề Zalo, chờ đọc', '#ffe0f0', '#a3195b'],
  MOI: ['🆕 Chờ giải', '#e8f0fe', '#1a56c4'],
  GITHUB: ['⚙️ Đang giải trên GitHub', '#ede7f6', '#4527a0'],
  DA_GIAI: ['✅ Đã giải, chờ kịch bản', '#fff4d6', '#8a5a00'],
  CO_KICH_BAN: ['🎬 Có kịch bản', '#d9f0e1', '#0b6b2c'],
  DANG_DUNG: ['⏳ Đang dựng video', '#e8eaf6', '#3949ab'],
  CO_VIDEO: ['🎞 Có video', '#c8e6c9', '#1b5e20'],
  DANG_DANG: ['📤 Đang đăng', '#e3f2fd', '#0d47a1'],
  DA_DANG: ['🌐 Đã đăng', '#b2dfdb', '#004d40'],
  LOAI: ['❌ Loại (đáp án lệch)', '#fde2e0', '#b3261e'],
  XOA: ['🗑 Xóa (không có đáp án chắc chắn)', '#fde2e0', '#b3261e'],
  LOI: ['⚠️ Lỗi, cần xem', '#fde2e0', '#b3261e']
};
var LOP_MAU = { '10': '#e1f5fe', '11': '#fff0d9', '12': '#f1e4f7' };

var HINH_MINH_HOA = {
  so_do_cay: '🌳 Sơ đồ cây', bang: '📊 Bảng', venn: '⭕ Venn', xuc_xac: '🎲 Xúc xắc',
  bi_hop: '🔴 Bi – hộp', the_bai: '🃏 Thẻ bài', luoi: '▦ Lưới', day_so: '🔢 Dãy số', khong: '—', khac: '🖼 Khác'
};

// Nhãn nguồn đề hiện dưới cột Chủ đề: 🌐 tên miền (đề có thật trên internet) | 🤖 AI sáng tác.
function nhanNguon_(n) {
  n = String(n || '');
  if (n.indexOf('INTERNET|') === 0) return '🌐 ' + (n.split('|')[1] || 'internet');
  if (n === 'AI_SANG_TAC') return '🤖 AI sáng tác';
  if (n.indexOf('ZALO') === 0) return '📱 Zalo' + (n.split('|')[1] ? ': ' + n.split('|')[1] : '') + ' (ưu tiên)';
  return n ? '✍ ' + n : '';
}

/* ---------- Bảng DOC_DE: mỗi đề một dòng, mới nhất ở trên ---------- */
function capNhatDocDe_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(BANG_DE) || ss.insertSheet(BANG_DE, 0);
  var hang = docHang_(ss.getSheetByName(TEN_HANG_DOI)).filter(function (r) { return r.id; }).reverse();
  var tieuDe = ['Mã', 'Trạng thái', 'Lớp', 'Chủ đề', 'ĐỀ BÀI', 'Đáp án', 'Tư duy', 'Vì sao cần suy nghĩ', 'Bẫy thường gặp', 'Kịch bản', 'Ghi chú'];
  var nc = tieuDe.length;

  var dem = {};
  hang.forEach(function (r) { dem[r.trang_thai] = (dem[r.trang_thai] || 0) + 1; });
  var tong = '🎲  ĐỀ XÁC SUẤT & TOÁN THỰC TẾ   ·   Tổng ' + hang.length + ' đề     🆕 ' + (dem.MOI || 0) + ' chờ giải     ✅ ' + (dem.DA_GIAI || 0) +
    ' chờ kịch bản     🎬 ' + (dem.CO_KICH_BAN || 0) + ' có kịch bản     ⏳ ' + (dem.DANG_DUNG || 0) + ' đang dựng     🎞 ' + (dem.CO_VIDEO || 0) + ' có video     ❌ ' + (dem.LOAI || 0) + ' loại     ⚠️ ' + (dem.LOI || 0) +
    ' lỗi          (cập nhật ' + Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM HH:mm') + ' · giao diện v6)';

  var f = sh.getFilter(); if (f) f.remove();
  try { sh.getDataRange().breakApart(); } catch (e) {}
  sh.clear();
  sh.setHiddenGridlines(true);
  sh.setTabColor('#1a73e8');
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setFontFamily(FONT).setFontSize(CO_CHU);

  // Dòng 1: băng tiêu đề + thống kê
  sh.getRange(1, 1, 1, nc).merge().setValue(tong)
    .setBackground('#0b3d91').setFontColor('#ffffff').setFontSize(CO_CHU).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 46);

  // Dòng 2: tiêu đề cột
  sh.getRange(2, 1, 1, nc).setValues([tieuDe])
    .setBackground('#1a73e8').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(2, 34);
  sh.setFrozenRows(2);
  [120, 150, 60, 170, 520, 80, 75, 300, 300, 90, 220].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });

  if (!hang.length) return;
  var dong = hang.map(function (r) {
    var nhan = NHAN_TRANG_THAI[r.trang_thai] || [String(r.trang_thai), '#ffffff', '#202124'];
    var d = Number(r.diem_tu_duy) || 0;
    return [r.id, nhan[0], r.lop ? 'Lớp ' + r.lop : '', [(laMonThucTe_(r) ? '🏗 ' : '🎲 ') + (r.chu_de || ''), nhanNguon_(r.nguon)].filter(Boolean).join('\n'), latexDoc_(r.de_bai), r.dap_an_hien || r.dap_an || '',
      d ? '★ ' + d + '/10' : '', latexDoc_(r.yeu_to_tu_duy), latexDoc_(r.bay_thuong_gap),
      '',   // cột Kịch bản: điền liên kết thật (rich text) ở bên dưới, không dùng công thức để tránh #ERROR!
      r.ghi_chu || ''];
  });
  var vung = sh.getRange(3, 1, dong.length, nc);
  vung.setValues(dong).setWrap(true).setVerticalAlignment('top')
    .setBorder(true, true, true, true, true, true, '#e0e3e7', SpreadsheetApp.BorderStyle.SOLID);

  // Nền xen kẽ + tô màu theo trạng thái / lớp / điểm tư duy
  var nen = hang.map(function (r, i) {
    var xen = i % 2 ? '#f6f8fb' : '#ffffff';
    var d = Number(r.diem_tu_duy) || 0;
    var nhan = NHAN_TRANG_THAI[r.trang_thai] || ['', '#ffffff', '#202124'];
    var row = [];
    for (var c = 0; c < nc; c++) row.push(xen);
    row[1] = nhan[1];
    row[2] = LOP_MAU[String(r.lop)] || xen;
    row[6] = d >= 9 ? '#b7e1cd' : d >= 8 ? '#d9f0e1' : xen;
    return row;
  });
  vung.setBackgrounds(nen);
  vung.setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Cột Kịch bản: liên kết thật tới file trên Drive (không dùng công thức HYPERLINK nên không bị #ERROR!)
  var kieuLienKet = SpreadsheetApp.newTextStyle().setForegroundColor('#1155cc').setUnderline(true).setBold(true).build();
  var lienKet = hang.map(function (r) {
    var rt = SpreadsheetApp.newRichTextValue();
    var idLk = r.file_video || r.file_kich_ban;
    if (!idLk) return [rt.setText('').build()];
    var nhanLk = r.file_video ? '🎞 Xem video' : '▶ Mở file';
    return [rt.setText(nhanLk).setLinkUrl('https://drive.google.com/file/d/' + idLk + '/view')
      .setTextStyle(0, nhanLk.length, kieuLienKet).build()];
  });
  sh.getRange(3, 10, dong.length, 1).setRichTextValues(lienKet);

  sh.getRange(3, 1, dong.length, 1).setFontColor('#80868b').setFontSize(CO_CHU);
  sh.getRange(3, 2, dong.length, 1).setFontWeight('bold').setFontSize(CO_CHU)
    .setFontColors(hang.map(function (r) { return [(NHAN_TRANG_THAI[r.trang_thai] || ['', '', '#202124'])[2]]; }));
  sh.getRange(3, 3, dong.length, 1).setHorizontalAlignment('center').setFontWeight('bold');
  sh.getRange(3, 4, dong.length, 1).setFontWeight('bold');
  sh.getRange(3, 5, dong.length, 1).setFontSize(CO_CHU);
  // Các cột văn bản dài: canh TRÁI theo chiều ngang (vẫn giữa theo chiều dọc) cho dễ đọc
  [5, 8, 9].forEach(function (c) { sh.getRange(3, c, dong.length, 1).setHorizontalAlignment('left').setVerticalAlignment('middle'); });
  sh.getRange(3, 6, dong.length, 1).setHorizontalAlignment('center').setFontWeight('bold').setFontSize(CO_CHU).setFontColor('#0b3d91');
  sh.getRange(3, 7, dong.length, 1).setHorizontalAlignment('center').setFontColor('#b06000').setFontWeight('bold');
  sh.getRange(3, 10, dong.length, 1).setHorizontalAlignment('center');
  sh.getRange(3, 11, dong.length, 1).setFontColor('#b3261e').setFontSize(CO_CHU);

  sh.getRange(2, 1, dong.length + 1, nc).createFilter();   // lọc theo trạng thái, lớp... ngay trên tiêu đề cột
  datChieuCaoHang_(sh, 3, dong, [120, 150, 60, 170, 520, 80, 75, 300, 300, 0, 220]);
}

/* ---------- Bảng DOC_KICH_BAN: mỗi kịch bản = 1 băng tiêu đề + các cảnh, mới nhất ở trên ---------- */
function dungKhungKichBan_(sh) {
  sh.setHiddenGridlines(true);
  sh.setTabColor('#188038');
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setFontFamily(FONT).setFontSize(CO_CHU);
  sh.getRange(1, 1, 1, 7).setValues([['Mã đề', 'Cảnh', 'Loại cảnh', '🎙 Lời thoại (giọng đọc)', '🖥 Hiện trên màn hình', '🖼 Hình minh họa', 'Giây']])
    .setBackground('#0b6b2c').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(1, 36);
  sh.setFrozenRows(1);
  [110, 50, 110, 480, 300, 280, 55].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
}

function ghiKichBanSheet_(kb) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(BANG_KB) || ss.insertSheet(BANG_KB);
  if (sh.getLastRow() === 0) dungKhungKichBan_(sh);
  var canh = kb.canh || [];
  if (!canh.length) return;

  var tongGiay = canh.reduce(function (t, c) { return t + (Number(c.thoi_luong_giay) || 0); }, 0);
  var soDong = canh.length + 1;                 // 1 băng tiêu đề + các cảnh
  sh.insertRowsAfter(1, soDong);                // chèn ngay dưới tiêu đề cột => kịch bản mới nằm trên cùng
  var tatCa = sh.getRange(2, 1, soDong, 7);
  try { tatCa.breakApart(); } catch (e) {}
  tatCa.clear();
  tatCa.setFontFamily(FONT).setFontSize(CO_CHU).setVerticalAlignment('top').setWrap(true);

  // Băng tiêu đề của kịch bản
  var deBai = latexDoc_(kb.de_bai || '');
  sh.getRange(2, 1).setValue(kb.id).setFontSize(CO_CHU).setFontColor('#cfe8d5');
  sh.getRange(2, 2, 1, 6).merge()
    .setValue('🎬 ' + (kb.tieu_de || kb.chu_de || kb.id) + '     ·     Lớp ' + kb.lop + '     ·     Đáp án: ' + kb.dap_an +
      '     ·     ' + canh.length + ' cảnh, ~' + tongGiay + ' giây\nĐề: ' + deBai);
  var bang = sh.getRange(2, 1, 1, 7);
  bang.setBackground('#188038').setFontColor('#ffffff').setFontWeight('bold').setFontSize(CO_CHU).setVerticalAlignment('middle').setHorizontalAlignment('center');
  sh.getRange(2, 1).setFontSize(CO_CHU).setFontColor('#cfe8d5').setFontWeight('normal');
  sh.setRowHeight(2, 28 + 20 * Math.max(1, Math.ceil(deBai.length / 120)));

  // Các cảnh
  var dong = canh.map(function (c, i) {
    var mh = c.minh_hoa || {};
    var hinh = (HINH_MINH_HOA[mh.loai] || mh.loai || '') + (mh.mo_ta ? '\n' + mh.mo_ta : '');
    return ['', c.so || i + 1, String(c.loai || '').replace(/_/g, ' '), c.loi_thoai || '',
      (c.noi_dung_man_hinh || []).map(latexDoc_).join('\n'), hinh, c.thoi_luong_giay || ''];
  });
  var vung = sh.getRange(3, 1, canh.length, 7);
  vung.setValues(dong).setBorder(true, true, true, true, true, true, '#d6e6db', SpreadsheetApp.BorderStyle.SOLID);
  vung.setBackgrounds(canh.map(function (c, i) {
    var x = i % 2 ? '#f1f8f3' : '#ffffff';
    return [x, x, x, x, x, x, x];
  }));
  sh.getRange(3, 2, canh.length, 1).setHorizontalAlignment('center').setFontWeight('bold').setFontColor('#188038').setFontSize(CO_CHU);
  sh.getRange(3, 3, canh.length, 1).setFontColor('#5f6368').setFontSize(CO_CHU);
  sh.getRange(3, 4, canh.length, 1).setFontSize(CO_CHU);
  sh.getRange(3, 5, canh.length, 1).setFontFamily(FONT_TOAN).setFontSize(CO_CHU).setFontColor('#0b3d91');
  sh.getRange(3, 6, canh.length, 1).setFontColor('#5f6368').setFontSize(CO_CHU);
  sh.getRange(3, 7, canh.length, 1).setHorizontalAlignment('center').setFontColor('#b06000').setFontWeight('bold');
  vung.setHorizontalAlignment('center').setVerticalAlignment('middle');
  [4, 5, 6].forEach(function (c) { sh.getRange(3, c, canh.length, 1).setHorizontalAlignment('left').setVerticalAlignment('middle'); });   // lời thoại, nội dung màn hình, hình minh họa: canh trái
  datChieuCaoHang_(sh, 3, dong, [0, 50, 110, 480, 270, 280, 55]);
}

// Nạp vào DOC_KICH_BAN các kịch bản đã có file trên Drive nhưng chưa có trong bảng.
function napKichBanCu_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(BANG_KB);
  var da = {};
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (v) { if (v[0]) da[v[0]] = true; });
  docHang_(ss.getSheetByName(TEN_HANG_DOI)).forEach(function (r) {
    if (['CO_KICH_BAN', 'DANG_DUNG', 'CO_VIDEO'].indexOf(r.trang_thai) < 0 || !r.file_kich_ban || da[r.id]) return;
    try {
      ghiKichBanSheet_(JSON.parse(DriveApp.getFileById(r.file_kich_ban).getBlob().getDataAsString()));
    } catch (e) { nhatKy_('LOI_BANG_DOC', 'Không nạp được kịch bản ' + r.id + ': ' + e.message); }
  });
}

// Chạy 1 lần (menu "Dựng lại bảng kịch bản") để chuyển bảng kịch bản cũ sang kiểu trình bày mới.
function dungLaiBangKichBan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(BANG_KB);
  if (sh) {
    try { sh.getDataRange().breakApart(); } catch (e) {}
    sh.clear();
  }
  napKichBanCu_();
  ss.toast('Đã dựng lại bảng kịch bản', 'Video AI', 5);
}

/* ---------- Ẩn sheet kỹ thuật, xóa sheet trống mặc định ---------- */
// ep = true: ẩn lại bất kể trước đó đã ẩn hay chưa. ep = false: mỗi sheet chỉ tự ẩn MỘT lần
// (để nếu bạn chủ động hiện NHAT_KY ra xem lỗi thì lần chạy sau không tự ẩn lại).
function anSheetKyThuat_(ep) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var p = PropertiesService.getScriptProperties();
  ['Sheet1', 'Sheet 1', 'Trang tính1', 'Trang tính 1'].forEach(function (t) {
    var s = ss.getSheetByName(t);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) { try { ss.deleteSheet(s); } catch (e) {} }
  });
  var chinh = ss.getSheetByName(BANG_DE);
  SHEET_KY_THUAT.forEach(function (t) {
    var s = ss.getSheetByName(t);
    if (!s || s.isSheetHidden()) return;
    if (!ep && p.getProperty('DA_AN_' + t) === '1') return;
    try {
      var act = ss.getActiveSheet();
      if (chinh && act && act.getName() === t) ss.setActiveSheet(chinh);
      s.hideSheet();
      p.setProperty('DA_AN_' + t, '1');
    } catch (e) {}
  });
}
function anSheetKyThuatNgay() { anSheetKyThuat_(true); }
function hienSheetKyThuat() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  SHEET_KY_THUAT.forEach(function (t) {
    var s = ss.getSheetByName(t);
    if (s && s.isSheetHidden()) s.showSheet();
  });
}

/* ---------- Làm đẹp toàn bộ ---------- */
function lamDepHangDoi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_HANG_DOI);
  if (sh) {
    var rong = { id: 130, trang_thai: 100, lop: 45, chu_de: 160, de_bai: 300, nguon: 260, diem_tu_duy: 60, yeu_to_tu_duy: 160, bay_thuong_gap: 160,
      cach_1: 80, cach_2: 80, dap_an: 70, kiem_chung: 160, file_kich_ban: 100, ghi_chu: 220, so_lan_loi: 60, cap_nhat: 130, ma_bam: 60, file_video: 100 };
    COT.forEach(function (k, i) { sh.setColumnWidth(i + 1, rong[k]); });
    sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setFontFamily(FONT).setFontSize(CO_CHU);
    sh.getRange(1, 1, 1, COT.length).setBackground('#5f6368').setFontColor('#ffffff').setFontWeight('bold').setVerticalAlignment('middle');
    sh.setRowHeight(1, 30);
    sh.setFrozenRows(1);
    sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), COT.length).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setVerticalAlignment('top');
    sh.setTabColor('#5f6368');
    ['cach_1', 'cach_2', 'ma_bam'].forEach(function (k) { sh.hideColumns(COT.indexOf(k) + 1); });
    sh.showColumns(COT.indexOf('nguon') + 1);   // cột nguon chứa đường link gốc của đề trên internet
  }
  var nk = ss.getSheetByName('NHAT_KY');
  if (nk) {
    [140, 110, 760].forEach(function (w, i) { nk.setColumnWidth(i + 1, w); });
    nk.getRange(1, 1, nk.getMaxRows(), nk.getMaxColumns()).setFontFamily(FONT).setFontSize(CO_CHU);
    nk.getRange(1, 1, 1, 3).setBackground('#5f6368').setFontColor('#ffffff').setFontWeight('bold');
    nk.setFrozenRows(1);
    nk.setTabColor('#9aa0a6');
  }
  var ch = ss.getSheetByName(TEN_CAU_HINH);
  if (ch) {
    [220, 260].forEach(function (w, i) { ch.setColumnWidth(i + 1, w); });
    ch.getRange(1, 1, ch.getMaxRows(), ch.getMaxColumns()).setFontFamily(FONT).setFontSize(CO_CHU);
    ch.getRange(1, 1, 1, 2).setBackground('#5f6368').setFontColor('#ffffff').setFontWeight('bold');
    ch.setFrozenRows(1);
    ch.setTabColor('#9aa0a6');
  }
  dongBoBangDoc();
  // Xếp thứ tự: DOC_DE, DOC_KICH_BAN lên đầu rồi ẩn các sheet kỹ thuật
  [BANG_DE, BANG_KB].forEach(function (t, i) {
    var s = ss.getSheetByName(t);
    if (s) { ss.setActiveSheet(s); ss.moveActiveSheet(i + 1); }
  });
  var dau = ss.getSheetByName(BANG_DE);
  if (dau) ss.setActiveSheet(dau);
  anSheetKyThuat_(true);
}

// Đổi LaTeX sang văn bản dễ đọc trong ô Google Sheet (ví dụ \frac{5}{6} -> 5/6, ^3 -> ³).
function latexDoc_(s) {
  if (s === null || s === undefined) return '';
  s = String(s);
  var ngoac = function (x) { x = x.trim(); return /^[0-9A-Za-zÀ-ỹ.,]+$/.test(x) ? x : '(' + x + ')'; };
  s = s.replace(/\$+/g, '').replace(/\\\{/g, '\u0001').replace(/\\\}/g, '\u0002');
  var lenh = { cdot: '·', times: '×', geq: '≥', ge: '≥', leq: '≤', le: '≤', neq: '≠', ne: '≠', cup: '∪', cap: '∩', 'in': '∈', notin: '∉',
    subset: '⊂', subseteq: '⊆', emptyset: '∅', varnothing: '∅', Omega: 'Ω', omega: 'ω', alpha: 'α', beta: 'β', theta: 'θ', pi: 'π',
    infty: '∞', approx: '≈', Rightarrow: '⇒', Leftrightarrow: '⇔', rightarrow: '→', to: '→', ldots: '…', dots: '…', cdots: '…',
        quad: ' ', qquad: ' ', left: '', right: '', mid: '|', cdotp: '·', iff: '⇔', implies: '⇒', bullet: '•' };
  s = s.replace(new RegExp('\\\\(' + Object.keys(lenh).join('|') + ')(?![A-Za-z])', 'g'), function (_, t) { return lenh[t]; });
  for (var k = 0; k < 5; k++) {
    s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, function (_, a, b) { return ngoac(a) + '/' + ngoac(b); });
    s = s.replace(/\\binom\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, function (_, a, b) { return 'C(' + a + ', ' + b + ')'; });
    s = s.replace(/\\(?:overline|bar)\s*\{([^{}]*)\}/g, '$1\u0304');
    s = s.replace(/\\(?:text|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)');
  }
  var sup = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', 'n': 'ⁿ', '+': '⁺', '-': '⁻' };
  var sub = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  var doi = function (t, map, tienTo) {
    var out = '';
    for (var i = 0; i < t.length; i++) { if (!map[t[i]]) return tienTo + '(' + t + ')'; out += map[t[i]]; }
    return out;
  };
  s = s.replace(/\^\{([^{}]*)\}/g, function (_, t) { return doi(t, sup, '^'); });
  s = s.replace(/\^([0-9n])/g, function (_, t) { return sup[t]; });
  s = s.replace(/_\{([^{}]*)\}/g, function (_, t) { return doi(t, sub, '_'); });
  s = s.replace(/_([0-9])/g, function (_, t) { return sub[t]; });
  s = s.replace(/\\([A-Za-z]+)/g, '$1');   // lệnh còn lại: bỏ dấu gạch chéo
  s = s.replace(/\\[,;:! ]/g, ' ').replace(/[{}]/g, '').replace(/\u0001/g, '{').replace(/\u0002/g, '}');
  return s.replace(/[ \t]{2,}/g, ' ').trim();
}
/* ===================== DỌN DẸP ĐỀ ĐÃ LÀM XONG VIDEO ===================== */

var TEN_LUU_TRU = 'LUU_TRU';

// Sheet lưu trữ chỉ giữ mã băm + đề rút gọn, để đề đã xóa không bị sinh lại.
function luuTruSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_LUU_TRU);
  if (!sh) {
    sh = ss.insertSheet(TEN_LUU_TRU);
    sh.appendRow(['ma_bam', 'id', 'lop', 'de_bai_rut_gon', 'dap_an', 'ket_qua', 'ngay_xong']);
    sh.setFrozenRows(1);
    sh.setTabColor('#9aa0a6');
  }
  return sh;
}

function docMaBamLuuTru_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_LUU_TRU);
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (v) { if (v[0]) out[v[0]] = true; });
  return out;
}

function xuLyFileKichBan_(fileId) {
  if (!fileId) return;
  var cach = cauHinh_('CACH_XU_LY_FILE');
  if (cach === 'GIU') return;
  try {
    var f = DriveApp.getFileById(fileId);
    if (cach === 'XOA') { f.setTrashed(true); return; }
    var goc = thuMucKichBan_().getParents().next();
    var it = goc.getFoldersByName('da_xong');
    var dich = it.hasNext() ? it.next() : goc.createFolder('da_xong');
    f.moveTo(dich);
  } catch (e) { nhatKy_('LOI_DON_DEP', 'file ' + fileId + ': ' + e.message); }
}

// Xóa khối kịch bản (băng tiêu đề + các cảnh) của một đề khỏi DOC_KICH_BAN.
function xoaKichBanKhoiSheet_(id) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BANG_KB);
  if (!sh || sh.getLastRow() < 2) return;
  var a = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (var i = 1; i < a.length; i++) {
    if (a[i][0] === id) {
      var j = i + 1;
      while (j < a.length && !a[j][0]) j++;
      sh.deleteRows(i + 1, j - i);
      return;
    }
  }
}

// Dọn: các đề DA_XONG + mọi đề không có đáp án chắc chắn (XOA, LOAI, đề mơ hồ chưa dựng video). Trả về số dòng đã dọn.
function donDaXong_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_HANG_DOI);
  if (!sh) return 0;
  var ngayGiu = Number(cauHinh_('NGAY_GIU_LOAI'));
  var bayGio = Date.now();
  var xoa = docHang_(sh).filter(function (r) {
    if (r.trang_thai === 'DA_XONG') return true;
    // đề không có đáp án chắc chắn: XOA (đã thử sửa mà không được), LOAI (lệch đáp án, kiểu cũ) -> xóa NGAY, không giữ lại
    if (r.trang_thai === 'XOA' || r.trang_thai === 'LOAI') return true;
    // đề cũ được làm theo "cách hiểu hợp lý" (DE_CO_VAN_DE) mà chưa dựng video: đáp án mơ hồ -> xóa (trừ đề người dùng tự gửi)
    if (/DE_CO_VAN_DE/.test(String(r.kiem_chung || '')) && !laUuTien_(r) && (r.trang_thai === 'DA_GIAI' || r.trang_thai === 'CO_KICH_BAN')) return true;
    return false;
  });
  if (!xoa.length) return 0;

  // đề sản phẩm bị bỏ vì không đạt kiểm duyệt: sản phẩm sáng tác đề mới (NangCao.gs)
  xoa.forEach(function (r) { if (r.trang_thai === 'XOA' && typeof deMoiChoSanPhamBiBo_ === 'function') { try { deMoiChoSanPhamBiBo_(r); } catch (eSP) {} } });
  var lt = luuTruSheet_();
  var dong = xoa.map(function (r) {
    return [r.ma_bam || bam_(r.de_bai), r.id, r.lop, String(r.de_bai).slice(0, 120), r.dap_an || '',
      r.trang_thai === 'DA_XONG' ? 'DA_LAM_VIDEO' : 'LOAI', new Date()];
  });
  lt.getRange(lt.getLastRow() + 1, 1, dong.length, 7).setValues(dong);   // lưu mã băm TRƯỚC khi xóa

  xoa.forEach(function (r) {
    if (r.trang_thai === 'DA_XONG') { xuLyFileKichBan_(r.file_kich_ban); xuLyFileVideo_(r.file_video); xoaKichBanKhoiSheet_(r.id); }
    else if (r.file_kich_ban) { try { xuLyFileKichBan_(r.file_kich_ban); xoaKichBanKhoiSheet_(r.id); } catch (eF) {} }
  });
  xoa.map(function (r) { return r._row; }).sort(function (a, b) { return b - a; })
    .forEach(function (row) { sh.deleteRow(row); });   // xóa từ dưới lên để số dòng không bị lệch
  nhatKy_('DON_DEP', 'Đã dọn ' + xoa.length + ' đề (đã lưu mã vào ' + TEN_LUU_TRU + ')');
  return xoa.length;
}

// Menu: chọn các dòng ở DOC_DE rồi bấm để đánh dấu đã làm video và dọn luôn.
function danhDauDaLamVideo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var sh = ss.getActiveSheet();
  if (sh.getName() !== BANG_DE) { ui.alert('Hãy mở sheet ' + BANG_DE + ', chọn (bôi đen) các dòng đề đã làm xong video rồi bấm lại.'); return; }
  var rg = sh.getActiveRange();
  var r1 = Math.max(rg.getRow(), 3), r2 = rg.getLastRow();
  if (r2 < r1) { ui.alert('Hãy chọn ít nhất một dòng đề (từ dòng 3 trở xuống).'); return; }
  var ids = {};
  sh.getRange(r1, 1, r2 - r1 + 1, 1).getValues().forEach(function (v) { if (v[0]) ids[v[0]] = true; });

  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(30000)) { ui.alert('Hệ thống đang chạy, hãy thử lại sau ít phút.'); return; }
  var n = 0, daDon = 0;
  try {
    var q = ss.getSheetByName(TEN_HANG_DOI);
    docHang_(q).forEach(function (r) {
      if (ids[r.id] && (r.trang_thai === 'CO_VIDEO' || r.trang_thai === 'CO_KICH_BAN' || r.trang_thai === 'DA_DANG')) { ghi_(q, r._row, { trang_thai: 'DA_XONG' }); n++; }
    });
    daDon = donDaXong_();
    dongBoBangDoc();
  } finally { khoa.releaseLock(); }
  ss.toast('Đã đánh dấu ' + n + ' đề (chỉ đề có trạng thái "Có kịch bản" mới đánh dấu được); đã dọn ' + daDon + ' dòng.', 'Video AI', 8);
}

// Menu: dọn ngay các đề đã mang trạng thái DA_XONG (ví dụ do Bộ phận 2 hoặc bạn gõ tay vào HANG_DOI).
function donNgay() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(30000)) { ss.toast('Hệ thống đang chạy, thử lại sau.', 'Video AI', 5); return; }
  var n = 0;
  try { n = donDaXong_(); dongBoBangDoc(); } finally { khoa.releaseLock(); }
  ss.toast('Đã dọn ' + n + ' dòng.', 'Video AI', 5);
}
function caiDatTriggerDon() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'chayDonDep') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('chayDonDep').timeBased().everyMinutes(15).create();
}

function chayDonDep() {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(5000)) return;   // đang có lần chạy chính thì bỏ qua
  var canVe = false;
  try {
    var p = PropertiesService.getScriptProperties();
    var can = p.getProperty('CAN_DONG_BO') === '1';
    if (donDaXong_() > 0 || can) { p.deleteProperty('CAN_DONG_BO'); canVe = true; }
  } finally { khoa.releaseLock(); }
  // Vẽ lại bảng DOC_DE / DOC_KICH_BAN bên ngoài khóa để không bao giờ chặn lệnh Zalo của người dùng
  if (canVe) dongBoBangDoc();
}

var TOC_DO_DOC = 4.7;   // số từ/giây của giọng đọc; đọc nhanh thì tăng lên 4,0

function uocGiayDoc_(loiThoai) {
  var tu = String(loiThoai || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(tu / TOC_DO_DOC + 0.5));
}

// Ghi đè thời lượng AI tự đoán bằng thời lượng ước tính từ số từ của lời thoại.
function chuanHoaThoiLuong_(kb) {
  var tong = 0;
  kb.canh.forEach(function (c, i) {
    c.so = i + 1;
    c.thoi_luong_giay = uocGiayDoc_(c.loi_thoai);
    tong += c.thoi_luong_giay;
  });
  kb.tong_giay = tong;
  return tong;
}
// Cắt câu chào ở đầu cảnh 1 (AI hay quên quy tắc "không chào hỏi").
function xoaLoiChao_(kb) {
  if (!kb || !Array.isArray(kb.canh) || !kb.canh.length) return;
  var c = kb.canh[0];
  var moi = String(c.loi_thoai || '').replace(/^\s*(xin\s+)?chào[^.!?\n]*[.!?]\s*/i, '').trim();
  if (moi.length >= 10) c.loi_thoai = moi;   // chỉ cắt khi phần còn lại đủ dài để làm lời mở đầu
}
// Đổi mã lỗi kiểm tra thành lời nhắc dễ hiểu để Gemini biết cần sửa gì.
function moTaLoiKichBan_(loi) {
  var s = String(loi);
  if (s.indexOf('QUA_DAI') === 0) return 'tổng thời lượng lời thoại ước tính ' + s.replace(/\D/g, '') + ' giây, vượt giới hạn ' + cauHinh_('GIAY_TOI_DA') +
    ' giây. Hãy rút gọn: cắt câu thừa, mỗi cảnh lời thoại tối đa 40 từ, nhưng vẫn giữ đủ các bước giảng.';
  if (s.indexOf('MO_DAU') === 0) return 'cảnh 1 mở đầu bằng lời chào. Hãy mở bằng một câu hỏi gây tò mò hoặc cảnh báo cái bẫy.';
  if (s.indexOf('SO_CANH') === 0) return 'số cảnh phải từ 14 đến 18 (mỗi ý một cảnh: đề bài 1-2, mô phỏng 2-3, lỗi sai 1-2, giải 5-7 với mỗi bước tính một cảnh, thử lại 1-2, chốt 1-2)';
  if (s.indexOf('LOI_THOAI_CHUA_LATEX') === 0) return 'lời thoại có ký hiệu \\ hoặc $ (' + s + '). Hãy đọc công thức thành lời, không dùng ký hiệu.';
  if (s.indexOf('THIEU_LOI_THOAI') === 0) return 'có cảnh thiếu lời thoại (' + s + '). Cảnh nào cũng phải có lời thoại.';
  if (s.indexOf('DAP_AN_CUOI') === 0) return 'trường dap_an_cuoi phải đúng bằng đáp án đã kiểm chứng ghi trong đề bài ở trên.';
  if (s.indexOf('THIEU_CANH_3D') === 0 || s.indexOf('THIEU_MO_HINH') === 0 || s.indexOf('HINH_') === 0) return s;
  return s;
}
function datLaiTb() {
  var p = PropertiesService.getScriptProperties();
  ['TB_GIAI_MS', 'TB_KICHBAN_MS', 'TB_GOI_KB_MS', 'TB_SINH_DE_MS'].forEach(function (k) { p.deleteProperty(k); });
}

// Chạy tay một lần nếu có dòng đã bị chuyển LOI vì bị ngắt (BI_NGAT_QUA_6_PHUT): đưa về trạng thái trước đó để làm lại với bản sửa này.
function cuuDongBiNgat() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_HANG_DOI);
  var n = 0;
  docHang_(sh).forEach(function (r) {
    var g = String(r.ghi_chu || '');
    if (r.trang_thai === 'LOI' && /BI_NGAT|DANG_|exceeded|thời gian/i.test(g)) {
      ghi_(sh, r._row, { trang_thai: r.dap_an ? 'DA_GIAI' : 'MOI', so_lan_loi: 0, ghi_chu: '' }); n++;
    } else if ((r.trang_thai === 'MOI' || r.trang_thai === 'DA_GIAI') && /^DANG_/.test(g)) {
      ghi_(sh, r._row, { so_lan_loi: 0, ghi_chu: '' }); n++;
    }
  });
  Logger.log('Đã đưa ' + n + ' dòng về hàng chờ.');
}

// Chẩn đoán: gọi thử TỪNG model với lời nhắc ngắn, in thời gian và kết quả (chạy tay để xem model/key nào đang dùng được).
function thuGoiGemini() {
  _bat_dau_chay_ = Date.now();
  danhSachModel_().forEach(function (m) {
    var t = Date.now();
    var kq = khoGoiCoSuyNghi_(m, { contents: [{ parts: [{ text: 'Trả JSON {"ok":true}' }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }, 'low', { hanChoMs: 10000 });
    var s = Math.round((Date.now() - t) / 1000);
    Logger.log(m + ': ' + (kq.ok ? 'OK' : laQuaTai_(kq) ? 'QUÁ TẢI 503' : 'LỖI HTTP ' + kq.code + ' ' + String(kq.raw).replace(/\s+/g, ' ').slice(0, 120)) + ' sau ' + s + ' giây');
  });
}

/* ===================== VIDEO DÀI 10 PHÚT HỌC TẬP (CHUYÊN ĐỀ YOUTUBE) & TỰ ĐỒNG BỘ MÃ APPS SCRIPT ===================== */

function laVideoDai_(r) {
  if (!r) return false;
  return /\[VIDEO_DAI_10P\]|DAI_10_PHUT/i.test(String(r.kiem_chung || '') + ' ' + String(r.chu_de || '') + ' ' + String(r.nguon || ''));
}

// Tạo đề bài & yêu cầu sản xuất video bài giảng chuyên đề dài 10 phút (~540-660 giây, 42-50 cảnh) cho YouTube
function taoVideoDaiZalo_(chat, chu) {
  var yeuCau = String(chu || '').replace(/^\s*\/(videodai|10phut|youtube10p)\s*/i, '').trim();
  var kq = taoDeVideoDai10Phut_(yeuCau, chat);
  return kq;
}

function taoVideoDai10Phut() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tb = taoDeVideoDai10Phut_('', '');
  try { ss.toast(tb, 'Video AI 10 Phút', 8); } catch (e) {}
  Logger.log(tb);
  return tb;
}

function taoDeVideoDai10Phut_(goiYChuDe, chat) {
  _bat_dau_chay_ = Date.now();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_HANG_DOI);
  var lop = ['12', '11', '10'][Math.floor(Math.random() * 3)];
  if (/lớp\s*10|\b10\b/.test(goiYChuDe)) lop = '10';
  else if (/lớp\s*11|\b11\b/.test(goiYChuDe)) lop = '11';
  else if (/lớp\s*12|\b12\b/.test(goiYChuDe)) lop = '12';
  var prompt = 'Bạn là giáo viên luyện thi Toán THPT xuất sắc tại Việt Nam. Hãy thiết kế MỘT BÀI TOÁN TRỌNG TÂM THỰC CHIẾN mức 8,5 - 9,5 điểm (lớp ' + lop + ') ' +
    (goiYChuDe ? 'theo chủ đề/yêu cầu: "' + goiYChuDe + '"' : 'thuộc dạng Toán thực tế tối ưu / chuyển động / hình học ghép / xác suất vận dụng cao thường gặp trong đề thi giữa kỳ, cuối kỳ và THPT Quốc gia') +
    ' để làm hạt nhân cho VIDEO BÀI GIẢNG CHUYÊN ĐỀ DÀI 10 PHÚT trên YouTube.\n' +
    'YÊU CẦU:\n' +
    '- Đề bài rõ ràng, có bối cảnh thực tế hấp dẫn (như bài cầu vượt - sà lan - ô tô, mảnh vườn tròn ghép lục giác, tối ưu chi phí xây dựng, bài toán lãi suất/tối ưu...), số liệu khớp tuyệt đối và có ĐÚNG MỘT đáp số.\n' +
    '- Trả JSON: {"lop":"' + lop + '","mon":"THUC_TE|XAC_SUAT|HINH_HOC","chu_de":"Chuyên đề 10 phút: <tên ngắn gọn>","de_bai":"toàn bộ đề bài gốc","dap_an":"con số hoặc phân số","yeu_to_tu_duy":"bản chất toán học và phương pháp nhận diện dạng bài","bay_thuong_gap":"sai lầm 90% học sinh mắc phải trong phòng thi"}';
  var d = goiGemini_(prompt, 0.35, { suyNghi: 'low' });
  if (!d || !d.de_bai) return '⚠️ Chưa sinh được đề chuyên đề 10 phút, hãy thử lại.';
  var mon = String(d.mon || 'THUC_TE').toUpperCase();
  if (['THUC_TE', 'XAC_SUAT', 'HINH_HOC'].indexOf(mon) < 0) mon = 'THUC_TE';
  var tienTo = mon === 'HINH_HOC' ? 'HH' : mon === 'THUC_TE' ? 'TT' : 'XS';
  var id = tienTo + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss') + '-10P';
  var obj = {
    id: id,
    trang_thai: 'MOI',
    lop: String(d.lop || lop),
    mon: mon,
    chu_de: '[10 PHÚT] ' + String(d.chu_de || 'Chuyên đề thực chiến').replace(/^\[10 PHÚT\]\s*/i, '').slice(0, 80),
    de_bai: String(d.de_bai).trim(),
    nguon: 'CHUYEN_DE_10P',
    diem_tu_duy: 10,
    yeu_to_tu_duy: String(d.yeu_to_tu_duy || ''),
    bay_thuong_gap: String(d.bay_thuong_gap || ''),
    kiem_chung: '[VIDEO_DAI_10P]' + (d.dap_an ? ' | DU_KIEN: ' + String(d.dap_an).slice(0, 40) : ''),
    uu_tien: 1,
    zalo_chat: chat || '',
    cap_nhat: new Date(),
    ma_bam: bam_(d.de_bai)
  };
  sh.appendRow(COT.map(function (k) { return obj[k] !== undefined ? obj[k] : ''; }));
  SpreadsheetApp.flush();
  try { if (typeof henUuTien_ === 'function') henUuTien_(15); } catch (eH) {}
  return '🎓 Đã tạo chuyên đề Video Dài 10 Phút YouTube (' + id + ' - Lớp ' + obj.lop + '):\n📌 Chủ đề: ' + obj.chu_de + '\n📖 Đề trọng tâm: ' + obj.de_bai.slice(0, 220) + '...\n⏳ Hệ thống đang giải kiểm chứng và viết kịch bản 5 chương (~45 cảnh, ~10 phút) để dựng video học tập.';
}

// Tự động đồng bộ toàn bộ 10 tệp .gs (bao gồm KhoKey.gs) và tệp kê khai appsscript.json (giữ nguyên mọi Dịch vụ/Thư viện như YouTube, YouTubeAnalytics) từ nhánh master trên GitHub thẳng vào dự án Google Apps Script hiện tại
var DANH_SACH_TEP_GS_ = ['BoPhan1', 'PromptKichBan', 'KiemTraHinh', 'HinhHoc', 'BoPhan2', 'NangCao', 'DangVideo', 'SanPham', 'ZaloDeBai', 'KhoKey'];
function capNhatMaAppsScriptTuGitHub() {
  Logger.log('🚀 [BƯỚC 1/4] Bắt đầu đồng bộ mã từ GitHub...');
  var p = PropertiesService.getScriptProperties();
  var repo = p.getProperty('GITHUB_REPO') || 'tpham9299-ui/Video-AI';
  var nhanh = String(cauHinh_('GITHUB_NHANH') || 'master').trim() || 'master';
  var tokenGh = p.getProperty('GITHUB_TOKEN') || '';
  var headersGh = tokenGh ? { Authorization: 'Bearer ' + tokenGh } : {};
  var filesMoi = [];
  
  // 1. Tải 10 tệp .gs từ GitHub
  Logger.log('📥 [BƯỚC 2/4] Đang tải ' + DANH_SACH_TEP_GS_.length + ' tệp .gs từ GitHub (' + repo + '@' + nhanh + ')...');
  for (var i = 0; i < DANH_SACH_TEP_GS_.length; i++) {
    var ten = DANH_SACH_TEP_GS_[i];
    var urlRaw = 'https://raw.githubusercontent.com/' + repo + '/' + encodeURIComponent(nhanh) + '/' + ten + '.gs';
    var res = UrlFetchApp.fetch(urlRaw, { headers: headersGh, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      var errTai = '❌ Không tải được ' + ten + '.gs từ GitHub (HTTP ' + res.getResponseCode() + ')';
      Logger.log(errTai);
      throw new Error(errTai);
    }
    filesMoi.push({ name: ten, type: 'SERVER_JS', source: res.getContentText() });
    Logger.log('   ✓ Đã tải: ' + ten + '.gs (' + res.getContentText().length + ' ký tự)');
  }

  // 2. Tải tệp appsscript.json từ GitHub (nếu có)
  var rawManifestRes = UrlFetchApp.fetch('https://raw.githubusercontent.com/' + repo + '/' + encodeURIComponent(nhanh) + '/appsscript.json', {
    headers: headersGh,
    muteHttpExceptions: true
  });
  var manifestContent = null;
  if (rawManifestRes.getResponseCode() === 200) {
    manifestContent = rawManifestRes.getContentText();
    Logger.log('   ✓ Đã tải: appsscript.json từ GitHub');
  }

  try {
    var scriptId = ScriptApp.getScriptId();
    var oauth = ScriptApp.getOAuthToken();
    var urlContent = 'https://script.googleapis.com/v1/projects/' + scriptId + '/content';
    Logger.log('📡 [BƯỚC 3/4] Kết nối Google Apps Script API (Script ID: ' + scriptId + ')...');
    
    var curRes = UrlFetchApp.fetch(urlContent, {
      headers: { Authorization: 'Bearer ' + oauth },
      muteHttpExceptions: true
    });
    
    var statusCode = curRes.getResponseCode();
    Logger.log('   HTTP Status Code: ' + statusCode);
    if (statusCode === 401 || statusCode === 403) {
      var errText = curRes.getContentText();
      var thongBaoLoiQuyen = '⚠️ LỖI CẤP QUYỀN APPS SCRIPT API (HTTP ' + statusCode + '):\n' +
        'Chi tiết: ' + errText + '\n\n' +
        'Nguyên nhân: ScriptApp.getOAuthToken() chưa có quyền quản lý dự án (https://www.googleapis.com/auth/script.projects).\n\n' +
        '👉 BẠN CHỈ CẦN THAO TÁC 1 LẦN DUY NHẤT NHƯ SAU ĐỂ TỰ ĐỘNG HÓA MÃI MÃI:\n' +
        '1. Ở menu bên trái Apps Script, mở tệp "appsscript.json".\n' +
        '2. Dán nội dung sau vào tệp appsscript.json rồi bấm Lưu (Ctrl+S):\n' +
        '{\n' +
        '  "timeZone": "Asia/Ho_Chi_Minh",\n' +
        '  "dependencies": {\n' +
        '    "enabledAdvancedServices": [\n' +
        '      { "userSymbol": "YouTube", "serviceId": "youtube", "version": "v3" },\n' +
        '      { "userSymbol": "YouTubeAnalytics", "serviceId": "youtubeAnalytics", "version": "v2" }\n' +
        '    ]\n' +
        '  },\n' +
        '  "exceptionLogging": "STACKDRIVER",\n' +
        '  "runtimeVersion": "V8",\n' +
        '  "oauthScopes": [\n' +
        '    "https://www.googleapis.com/auth/script.projects",\n' +
        '    "https://www.googleapis.com/auth/script.external_request",\n' +
        '    "https://www.googleapis.com/auth/spreadsheets",\n' +
        '    "https://www.googleapis.com/auth/drive",\n' +
        '    "https://www.googleapis.com/auth/script.scriptapp",\n' +
        '    "https://www.googleapis.com/auth/script.storage",\n' +
        '    "https://www.googleapis.com/auth/youtube",\n' +
        '    "https://www.googleapis.com/auth/youtube.readonly",\n' +
        '    "https://www.googleapis.com/auth/yt-analytics.readonly"\n' +
        '  ]\n' +
        '}\n\n' +
        '3. Sau đó chọn lại hàm capNhatMaAppsScriptTuGitHub và bấm "Chạy". Google sẽ hiện cửa sổ yêu cầu cấp quyền (Authorization Required) -> Bấm Xem lại quyền -> Chọn tài khoản Google -> Nâng cao -> Chuyển đến (không an toàn) -> Cho phép.\n' +
        '4. Ngay sau khi chạy xong, bấm F5 trên trình duyệt là toàn bộ 10 file .gs và dịch vụ sẽ tự động cập nhật phiên bản mới nhất!';
      Logger.log(thongBaoLoiQuyen);
      return thongBaoLoiQuyen;
    }
    
    if (statusCode !== 200) {
      var errKhac = '⚠️ Lỗi không xác định khi gọi Apps Script API (HTTP ' + statusCode + '): ' + curRes.getContentText();
      Logger.log(errKhac);
      return errKhac;
    }

    var curData = JSON.parse(curRes.getContentText());
    // Giữ lại mọi tệp riêng khác trên Apps Script không nằm trong DANH_SACH_TEP_GS_ (không bao giờ xóa nhầm tệp của người dùng)
    (curData.files || []).forEach(function (f) {
      if (f && f.name && f.name !== 'appsscript' && DANH_SACH_TEP_GS_.indexOf(f.name) < 0) {
        filesMoi.push(f);
        Logger.log('   ✓ Giữ nguyên tệp riêng trên Apps Script: ' + f.name);
      }
    });
    // Hợp nhất tệp kê khai appsscript.json: giữ nguyên mọi Dịch vụ (YouTube, YouTubeAnalytics...) và Thư viện đang có trên Apps Script
    var manifestCuObj = {};
    var manifestCuFile = (curData.files || []).filter(function (f) { return f.name === 'appsscript'; })[0];
    if (manifestCuFile && manifestCuFile.source) {
      try { manifestCuObj = JSON.parse(manifestCuFile.source) || {}; } catch (eM0) { manifestCuObj = {}; }
    }
    var manifestMoiObj = {};
    if (manifestContent) {
      try { manifestMoiObj = JSON.parse(manifestContent) || {}; } catch (eM1) { manifestMoiObj = {}; }
    }
    var mergedManifest = Object.assign({}, manifestCuObj, manifestMoiObj);
    mergedManifest.dependencies = mergedManifest.dependencies || {};
    var dsDichVu = [
      { userSymbol: 'YouTube', serviceId: 'youtube', version: 'v3' },
      { userSymbol: 'YouTubeAnalytics', serviceId: 'youtubeAnalytics', version: 'v2' }
    ];
    var dvCu = (manifestCuObj.dependencies && manifestCuObj.dependencies.enabledAdvancedServices) || [];
    var dvMoi = (manifestMoiObj.dependencies && manifestMoiObj.dependencies.enabledAdvancedServices) || [];
    dvCu.concat(dvMoi).forEach(function (s) {
      if (s && s.serviceId && !dsDichVu.some(function (x) { return x.serviceId === s.serviceId && x.userSymbol === s.userSymbol; })) {
        dsDichVu.push(s);
      }
    });
    mergedManifest.dependencies.enabledAdvancedServices = dsDichVu;
    if (manifestCuObj.dependencies && manifestCuObj.dependencies.libraries && !mergedManifest.dependencies.libraries) {
      mergedManifest.dependencies.libraries = manifestCuObj.dependencies.libraries;
    }
    filesMoi.unshift({ name: 'appsscript', type: 'JSON', source: JSON.stringify(mergedManifest, null, 2) });

    Logger.log('💾 [BƯỚC 4/4] Đang ghi đè ' + filesMoi.length + ' tệp vào dự án Apps Script...');
    var putRes = UrlFetchApp.fetch(urlContent, {
      method: 'put',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + oauth },
      payload: JSON.stringify({ files: filesMoi }),
      muteHttpExceptions: true
    });

    if (putRes.getResponseCode() === 200) {
      try { damBaoCauHinhTuDong_(); } catch (eRescue) {}
      var msgOk = '🎉 ĐÃ TỰ ĐỘNG ĐỒNG BỘ THÀNH CÔNG 100%!\n' +
        '☁️ Đã nạp toàn bộ ' + DANH_SACH_TEP_GS_.length + ' tệp .gs (bao gồm KhoKey.gs) và khôi phục đầy đủ Dịch vụ (YouTube, YouTubeAnalytics) từ GitHub (' + repo + '@' + nhanh + ') thẳng vào Google Apps Script.\n\n' +
        '🔄 LƯU Ý BẮT BUỘC: Bạn hãy nhấn phím F5 (Tải lại trang trình duyệt) để trình soạn thảo Apps Script hiển thị toàn bộ mã nguồn và dịch vụ vừa được cập nhật!';
      Logger.log(msgOk);
      nhatKy_('CAP_NHAT_CODE', msgOk);
      return msgOk;
    } else {
      var errPut = '⚠️ Lỗi khi ghi đè mã nguồn vào Apps Script (HTTP ' + putRes.getResponseCode() + '): ' + putRes.getContentText();
      Logger.log(errPut);
      return errPut;
    }
  } catch (eApi) {
    var errNgoaiLe = '⚠️ Ngoại lệ xảy ra khi đồng bộ mã nguồn: ' + eApi.message + '\n' +
      'Vui lòng dán thủ công các tệp .gs vừa sửa hoặc kiểm tra cấu hình Apps Script API.';
    Logger.log(errNgoaiLe);
    return errNgoaiLe;
  }
}
