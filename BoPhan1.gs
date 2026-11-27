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
  'anh_kt', 'anh_bia', 'ai_kiem_tra', 'series',   // lần 20: ảnh kiểm tra/ảnh bìa (Drive), kết quả AI xem video, series (hẹn giờ đăng, link đã đăng). Cột mới luôn nối vào CUỐI nên dữ liệu cũ không lệch
  'chi_dao', 'so_lan_thu_lai', 'bp_thu_lai', 'lan_giao', 'duyet_kich_ban',
  'ngay_tao', 'tu_sua_cho', 'mp4_cho_xoa'];

var PHIEN_BAN_EDIT = 52;                    // phiên bản chuẩn edit mới nhất (tự động nâng cấp các video cũ/đang chờ dưới mức này)
// Tên model nằm trong CAU_HINH vì Google đổi tên/ngừng model thường xuyên; hệ thống tự động đổi model dự phòng khi gặp lỗi.
var MAC_DINH = {
  // GIỌNG ĐỌC (mỗi video MỘT giọng từ đầu đến cuối): QUY_TAC_GIONG = CHU_KY (mặc định: cứ CHU_KY_GIONG video giọng nam thì 1 video giọng nữ)
  // | THEO_MON (toán thực tế = nam, xác suất = nữ) | CHI_NAM | CHI_NU. Tên giọng Gemini: GIONG_NAM (Puck/Charon/Fenrir), GIONG_NU (Aoede/Kore).
  QUY_TAC_GIONG: 'CHU_KY', CHU_KY_GIONG: '3', GIONG_NAM: 'Puck', GIONG_NU: 'Aoede',
  VIDEO_10P_MOI_NGAY: 'BAT',
  // v98.2: model do ListModels quyết định (danhSachModel_). Các khóa dưới chỉ là gợi ý khi ListModels lỗi; tên đã khai tử bị bỏ qua.
  DANH_SACH_MODEL: 'gemini-3.1-pro,gemini-3.0-flash,gemini-pro-latest,gemini-flash-latest,gemini-flash-lite-latest',
  MODEL_CHINH: '',
  MODEL_DU_PHONG: 'gemini-flash-latest',
  MODEL_DU_PHONG_2: '', // model dự phòng thứ 3 (tùy chọn, có thể để trống)
  MODEL_DU_PHONG_3: 'gemini-flash-lite-latest', // model dự phòng thứ 4: bản "lite" thường ít bị quá tải (503) hơn
  PHUT_NGHI_QUA_TAI: '20',     // mọi model đều báo quá tải (503) thì tạm nghỉ ngần này phút rồi tự chạy lại
  SO_DE_MOI_MOI_LAN: '2',
  SO_DE_TOI_DA_MOI_LAN: '2',   // mỗi lần chạy chỉ giải/viết kịch bản tối đa ngần này đề (để chạy nhanh)
  NGUONG_HANG_DOI: '4',        // dưới ngưỡng này mới sinh thêm đề
  DIEM_TU_DUY_TOI_THIEU: '7',  // thang 1-10
  MAX_LAN_LOI: '3',
  SO_LAN_SUA_KICH_BAN: '2',    // số vòng sửa kịch bản tối đa (tự sửa bằng máy trước, chỉ gọi AI khi còn lỗi nặng)
  BO_DUNG_MAC_DINH: '3d_vector',  // v91: Khung 4 tầng + 3D Vector (Remotion); v99.1: 'blender' không còn tác dụng
  AUTO_FIX_KICH_BAN: 'BAT',       // v91: lỗi hình thức tự chuẩn hóa + chỉ cảnh báo; TAT = từ chối như cũ
  MAT_THAN_3X3: 'BAT',            // v91: chốt ảnh lưới 3×3 trước khi đăng (GitHub gửi kết quả về doPost)
  CHE_DO_NGUON: 'UU_TIEN_INTERNET', // UU_TIEN_INTERNET: tìm đề có thật trên internet trước, không có mới để AI sáng tác | CHI_INTERNET | SANG_TAC (chỉ AI) | KHO_DE (bạn tự thêm dòng MOI có de_bai)
  THU_MUC_GOC: 'VIDEO_XACSUAT',
  TOI_DA_CHO_DUNG_VIDEO: '12', // số kịch bản chờ dựng video tối đa; đạt mức này thì tạm dừng sinh đề (0 = không giới hạn)
  NGAY_GIU_LOAI: '7',          // đề bị LOAI quá số ngày này sẽ được dọn (0 = không dọn)
  CACH_XU_LY_FILE: 'CHUYEN',    // CHUYEN: đưa file kịch bản vào thư mục da_xong | XOA: bỏ vào thùng rác | GIU: để nguyên
  GIAY_MUC_TIEU: '110-170',    // thời lượng video mong muốn (giây): 16-22 cảnh chi tiết
  GIAY_TOI_DA: '200',          // kịch bản dài hơn mức này sẽ bị từ chối và viết lại
  ZALO_THONG_BAO: 'IT',        // IT = chỉ báo việc quan trọng (video đạt kiểm duyệt, báo cáo ngày, lỗi cần bạn ra tay) | VUA = thêm đăng video, hết hạn mức | DAY_DU = báo mọi tiến độ
  GIAI_TREN_GITHUB: 'BAT',     // BAT = giải + viết kịch bản trên GitHub (nhanh, không giới hạn 6 phút) | TAT = làm tại Apps Script như cũ
  MODEL_BIEN_KICH: '',          // v98.2: trống = model 'nang' xếp hạng cao nhất đang sống (pro mới nhất)
  SUY_NGHI_BIEN_KICH: 'high',
  MUC_SUY_NGHI_KICH_BAN: 'low', // mức "suy nghĩ" của Gemini khi viết kịch bản/tìm đề: low (nhanh, khuyên dùng) | high | tat (không gửi tham số)
  MUC_SUY_NGHI_GIAI: 'mac_dinh', // khi GIẢI đề: mac_dinh (để Gemini tự quyết, chính xác hơn) | low | high
  UOC_GOI_GEMINI_GIAY: '75',   // ước lượng một lần gọi Gemini mất bao lâu; không đủ chừng này thời gian thì để lần chạy sau
  CHU_DE_VIDEO: 'XEN_KE',      // XAC_SUAT: chỉ xác suất | THUC_TE: chỉ toán thực tế | XEN_KE: luân phiên hai loại
  GITHUB_NHANH: 'master',
  DUYET_TRUOC_KHI_DANG: 'TAT', // TAT: AI tự kiểm tra video đạt yêu cầu thì tự động xếp lịch đăng 2 video/ngày | BAT: phải duyệt tay qua Zalo (/duyet)
  DANG_TU_DONG: 'BAT',         // BAT: tự động đăng mỗi ngày SO_VIDEO_MOI_NGAY video khi qua kiểm duyệt
  SO_VIDEO_MOI_NGAY: '2',      // số video tự động đăng mỗi ngày (mặc định 2 video/ngày vào khung GIO_DANG)
  CHI_TIEU_VIDEO_DAT_NGAY: '3', // chỉ tiêu tối thiểu số video ĐẠT kiểm duyệt/ngày (lịch đăng 2 video/ngày 11:30 & 19:30)
  GIO_LUU_TRU_LOI: '48',       // tự chuyển dòng LOI cũ sang LUU_TRU sau 48 giờ để HANG_DOI không nghẽn trigger
  GIO_LUU_TRU_CHO: '72',       // tự chuyển dòng CO_VIDEO chờ duyệt quá 72 giờ sang LUU_TRU
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

var CHUONG_TRINH_CHI_TIET_ = {
  '10': {
    duoc_phep: 'Toán lớp 10 (GDPT 2018): (1) Đại số: mệnh đề, tập hợp, hàm số bậc nhất và bậc hai (parabol, đỉnh -b/(2a), tam thức bậc hai), BPT bậc nhất 2 ẩn, bất đẳng thức Cauchy (AM-GM), Bunhiacopxki; (2) Hình học phẳng & Oxy: hệ thức lượng tam giác (định lý Cosin, Sin, Heron), vectơ phẳng, tọa độ Oxy, đường tròn, conic; (3) Tổ hợp & Xác suất: quy tắc cộng/nhân đếm, hoán vị Pn, chỉnh hợp Ank, tổ hợp Cnk, nhị thức Newton (n<=5), xác suất cổ điển P(A)=n(A)/n(Omega).',
    cam_tuyet_doi: 'KHÔNG dùng đạo hàm (f\'(x), y\'), KHÔNG bảng biến thiên / cực trị giải tích (cực đại, cực tiểu), KHÔNG nguyên hàm / tích phân, KHÔNG dãy số / cấp số cộng-nhân / giới hạn (lim), KHÔNG mũ / logarit (ln, log), KHÔNG hình học không gian (góc nhị diện, đường chéo nhau) hay tọa độ Oxyz, KHÔNG công thức cộng/nhân xác suất biến cố hợp-độc lập P(A∪B)/P(AB) (lớp 11), KHÔNG xác suất có điều kiện P(A|B) / toàn phần / Bayes (lớp 12), KHÔNG số phức.'
  },
  '11': {
    duoc_phep: 'Toán lớp 11 (GDPT 2018): (1) Đại số & Giải tích cơ bản: hàm số và phương trình lượng giác (miền giá trị sin, cos trong [-1,1]), dãy số, cấp số cộng, cấp số nhân, giới hạn (lim), hàm liên tục, lũy thừa - logarit cơ bản, ĐẠO HÀM cơ bản (ý nghĩa tiếp tuyến, vận tốc tức thời v(t)=s\'(t), gia tốc); (2) Tìm GTLN/GTNN ở lớp 11 CHỈ dùng tam thức bậc hai (parabol), BĐT Cauchy (AM-GM), Bunhiacopxki hoặc đánh giá lượng giác/mũ cơ bản; (3) Hình học không gian tổng hợp (KHÔNG gắn Oxyz): song song, vuông góc, góc đường-mặt, góc nhị diện, khoảng cách điểm-mặt và hai đường chéo nhau, thể tích chóp/lăng trụ/chóp cụt; (4) Xác suất: mọi kiến thức lớp 10 + biến cố hợp/giao/xung khắc/độc lập, quy tắc cộng P(A∪B)=P(A)+P(B)-P(AB) và quy tắc nhân P(AB)=P(A)P(B).',
    cam_tuyet_doi: 'TUYỆT ĐỐI KHÔNG dùng phương pháp lớp 12 để giải: KHÔNG lập bảng biến thiên bằng đạo hàm, KHÔNG cho f\'(x)=0 hay y\'=0 để tìm cực đại/cực tiểu/cực trị/GTLN/GTNN hay tiệm cận; KHÔNG nguyên hàm, tích phân; KHÔNG gắn hệ trục tọa độ Oxyz, tích có hướng, phương trình mặt phẳng/mặt cầu trong không gian; KHÔNG xác suất có điều kiện P(A|B), xác suất toàn phần, công thức Bayes; KHÔNG số phức.'
  },
  '12': {
    duoc_phep: 'Toán lớp 12 (GDPT 2018): Toàn bộ chương trình THPT gồm ứng dụng đạo hàm (đơn điệu, cực trị, bảng biến thiên, GTLN/GTNN, tiệm cận), nguyên hàm - tích phân và ứng dụng, hình học không gian Oxyz (vectơ Oxyz, mặt phẳng, đường thẳng, mặt cầu), xác suất có điều kiện P(A|B), công thức xác suất toàn phần và công thức Bayes.',
    cam_tuyet_doi: 'KHÔNG dùng số phức (đã bỏ khỏi chương trình GDPT 2018).'
  }
};

function chuanLop_(lop) {
  var m = /\b(10|11|12)\b/.exec(String(lop || ''));
  return m ? m[1] : '';
}

function yeuCauKienThucLop_(lop, mon) {
  // v94: hình học phẳng THCS (lớp 8/9) theo GDPT 2018 - chuanLop_ chỉ nhận 10|11|12 nên xét riêng ở đây
  if (mon === 'HINH_HOC' && /^\s*(lớp\s*)?[89]\b/i.test(String(lop || '')) && typeof quyDinhThcsHinh_ === 'function') return quyDinhThcsHinh_(capLopHinhPhang_(lop));
  var l = chuanLop_(lop);
  if (!l || !CHUONG_TRINH_CHI_TIET_[l]) return '';
  var ct = CHUONG_TRINH_CHI_TIET_[l];
  var riengMon = '';
  if (mon === 'XAC_SUAT') riengMon = CHUONG_TRINH[l] || '';
  else if (mon === 'THUC_TE') riengMon = CHUONG_TRINH_THUC_TE[l] || '';
  else if (mon === 'HINH_HOC' && typeof chuongTrinhHinh_ === 'function') riengMon = chuongTrinhHinh_(l);
  return 'QUY ĐỊNH BẮT BUỘC KIẾN THỨC LỚP ' + l + ' (GDPT 2018 — VI PHẠM SẼ BỊ LOẠI NGAY):\n' +
    (riengMon ? '- Trọng tâm môn lớp ' + l + ': ' + riengMon + '.\n' : '') +
    '- Kiến thức ĐƯỢC PHÉP dùng: ' + ct.duoc_phep + '\n' +
    '- Kiến thức CẤM TUYỆT ĐỐI (không dùng kiến thức lớp trên hoặc phần đã bỏ): ' + ct.cam_tuyet_doi;
}

// Kiểm tra tất định xem lời giải / kịch bản có dùng kiến thức vượt lớp (hoặc số phức) không.
// Trả mảng lỗi (rỗng = hợp lệ). Không đọc trường mã JS kiểm chứng để tránh bắt nhầm code nội bộ.
function kiemTraViPhamLop_(duLieu, lop, mon, deBai) {
  var l = chuanLop_(lop);
  if (!l) return [];
  var gomChu = function (v) {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map(gomChu).join('\n');
    if (typeof v === 'object') {
      if (Array.isArray(v.canh)) {
        return v.canh.map(function (c) {
          return [c.tieu_de_canh, c.kien_thuc, (c.noi_dung_man_hinh || []).join(' '), c.chu_thich, c.loi_thoai,
            JSON.stringify((c.minh_hoa || {}).du_lieu || {})].join('\n');
        }).join('\n');
      }
      var cacBuocTxt = Array.isArray(v.cac_buoc)
        ? v.cac_buoc.map(function (b) {
            return typeof b === 'string' ? b : (b && typeof b === 'object' ? [b.khang_dinh, b.ly_do, b.bieu_thuc, b.chu_thich].filter(Boolean).join(' ') : String(b || ''));
          }).join('\n')
        : (v.cac_buoc || '');
      return [v.y_tuong, v.mo_hinh, v.menh_de, cacBuocTxt, v.dap_an_hien, v.thu_nguoc].filter(Boolean).join('\n');
    }
    return String(v);
  };
  var txt = gomChu(duLieu).normalize('NFC').replace(/\\(?:prime\b|'|’)|[′’]/g, "'");
  if (!txt.trim()) return [];
  var loi = [];
  var them = function (mau, thongBao) { if (mau.test(txt)) loi.push(thongBao); };
  them(/số phức|phần ảo|đơn vị ảo/i, 'Dùng số phức (đã bỏ khỏi chương trình GDPT 2018)');
  if (l === '10' || l === '11') {
    them(/bảng biến thiên|điểm cực đại|điểm cực tiểu|giá trị cực đại|giá trị cực tiểu|tiệm cận đứng|tiệm cận ngang|tiệm cận xiên/i,
      'Lớp ' + l + ' không học bảng biến thiên / cực trị giải tích / tiệm cận (thuộc lớp 12)');
    them(/xác suất có điều kiện|xác suất toàn phần|công thức\s+Bayes|\bBayes\b|P\(\s*[A-Z]\s*\|\s*[A-Z]\s*\)/i,
      'Lớp ' + l + ' không học xác suất có điều kiện / toàn phần / Bayes (thuộc lớp 12)');
    them(/nguyên hàm|tích phân|\\int(?:\b|_)/i,
      'Lớp ' + l + ' không học nguyên hàm / tích phân (thuộc lớp 12)');
    them(/\bOxyz\b|hệ (?:trục )?tọa độ không gian|gắn hệ tọa độ\s*(?:Oxyz|ba chiều)|tích có hướng|vectơ pháp tuyến của mặt phẳng|phương trình mặt phẳng|phương trình mặt cầu/i,
      'Lớp ' + l + ' không học tọa độ không gian Oxyz (thuộc lớp 12)');
  }
  if (l === '11') {
    them(/(?:tìm|xét|đạt)\s+(?:GTLN|GTNN|giá trị lớn nhất|giá trị nhỏ nhất|cực trị|tối đa|tối thiểu)[^.\n]{0,110}(?:đạo hàm|[A-Za-z]'\s*(?:\([^)]*\))?\s*=)|(?:đạo hàm|[A-Za-z]'\s*(?:\([^)]*\))?\s*=\s*0)[^.\n]{0,110}(?:lớn nhất|nhỏ nhất|GTLN|GTNN|cực đại|cực tiểu|cực trị|đồng biến|nghịch biến|bảng biến thiên)/i,
      'Lớp 11 không dùng y\'=0 / đạo hàm để tìm cực trị hoặc GTLN/GTNN (thuộc lớp 12; lớp 11 dùng tam thức bậc hai, Cauchy/AM-GM hoặc lượng giác)');
    them(/đạo hàm[^.\n]{0,60}(?:hàm số đồng biến|hàm số nghịch biến)/i,
      'Lớp 11 không dùng đạo hàm xét đồng biến/nghịch biến (thuộc lớp 12)');
  }
  if (l === '10') {
    them(/đạo hàm|\bf'\s*\(|\b[fyg]'\s*(?:\([^)]*\)\s*)?=|\\frac\{d[a-z]\}\{d|\\dfrac\{d[a-z]\}\{d/i,
      'Lớp 10 không học đạo hàm (thuộc lớp 11-12)');
    them(/(?:\\lim\b|\blim\s*[_\(\{])|giới hạn dãy|giới hạn hàm|cấp số cộng|cấp số nhân/i,
      'Lớp 10 không học dãy số / cấp số / giới hạn (thuộc lớp 11)');
    them(/\\ln\b|\bln\s*\(?[a-z0-9]|\\log\b|\blogarit\b|hàm số mũ/i,
      'Lớp 10 không học lũy thừa thực / logarit (thuộc lớp 11-12)');
    them(/(?:công thức|quy tắc)\s+nhân\s+xác suất|biến cố độc lập|biến cố hợp|P\(\s*[A-Z]\s*(?:\\cup|∪)\s*[A-Z]\s*\)/i,
      'Lớp 10 chỉ dùng xác suất cổ điển, không dùng biến cố hợp/độc lập/quy tắc nhân xác suất (thuộc lớp 11)');
    them(/góc nhị diện|hai mặt phẳng vuông góc|giao tuyến (?:của )?hai mặt phẳng|hình chiếu vuông góc .* lên mặt phẳng|hai đường thẳng chéo nhau|khoảng cách hai đường chéo nhau|vuông góc với mặt phẳng/i,
      'Lớp 10 không học hình học không gian đường-mặt (thuộc lớp 11)');
  }
  return loi;
}

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
  var ch = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_CAU_HINH);
  var keys = ch.getDataRange().getValues().map(function(row) { return row[0]; });
  if (keys.indexOf('CHE_DO_VAN_HANH') < 0) ch.appendRow(['CHE_DO_VAN_HANH', BO_NAO_.cheDo]);
  BO_NAO_.workflow.forEach(function(_,bp) {
    if (keys.indexOf('BAT_BP'+bp) < 0) ch.appendRow(['BAT_BP'+bp,'BAT']);
  });
  caiLichBoNao_();
  caiDatTriggerDon();
}

var _GIU_KHOA_ = 0;
function voiKhoa_(ms, fn) {
  if (_GIU_KHOA_ > 0) return fn();
  var lk = LockService.getScriptLock();
  if (!lk.tryLock(ms || 15000)) return null;
  _GIU_KHOA_++;
  try { return fn(); }
  finally { _GIU_KHOA_--; try { lk.releaseLock(); } catch (eL) {} }
}

// Các menu và trigger đã cài trước khi cập nhật đều dùng chung bộ điều phối.
function chayVietKichBan() { return chayBoNaoDieuPhoi(); }
function chayGiaiDe() { return chayBoNaoDieuPhoi(); }
function chayBoPhan1() {
  // Lần đồng bộ từ danh sách tệp cũ chỉ tải được BoPhan1; lượt kế lấy cả mô-đun mới.
  if (typeof chayBoNaoDieuPhoi !== 'function') return capNhatMaAppsScriptTuGitHub();
  return chayBoNaoDieuPhoi();
}

function damBaoCauHinhTuDong_() { caiLichBoNao_(); }

function demVideoDatHomNay_(hang) {
  var tz = 'Asia/Ho_Chi_Minh', homNay = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  return (hang || []).filter(function (r) {
    if (!r || !r.id) return false;
    if ((typeof laVideoDai_ === 'function' && laVideoDai_(r)) || /-10P$/i.test(String(r.id))) return false;
    var ts = String(r.trang_thai || ''), du = String(r.duyet || '');
    var dat = (ts === 'CO_VIDEO' && du === 'DA_DUYET') || ts === 'DA_DANG' || ts === 'DA_XONG';
    if (!dat || !r.cap_nhat) return false;
    var d = r.cap_nhat instanceof Date ? r.cap_nhat : new Date(r.cap_nhat);
    return !isNaN(d.getTime()) && Utilities.formatDate(d, tz, 'yyyy-MM-dd') === homNay;
  }).length;
}

function sinhDeNeuCan_(sh, bc) {
  // Tự động đảm bảo mỗi ngày luôn sinh 1 video chuyên đề dài 10 phút cho YouTube (dù hàng đợi video ngắn đã đầy)
  try { tuDongSinhVideoDaiMoiNgay_(sh, bc); } catch (e10p) { nhatKy_('VIDEO_10P_LOI', String(e10p.message).slice(0, 180)); }
  var che = cauHinh_('CHE_DO_NGUON');
  if (che === 'KHO_DE') return;
  var hang = docHang_(sh);
  var chiTieuDat = Math.max(1, Number(cauHinh_('CHI_TIEU_VIDEO_DAT_NGAY')) || 3);
  if (demVideoDatHomNay_(hang) >= chiTieuDat) return;
  var dangCho = hang.filter(function (r) { return (r.trang_thai === 'MOI' && !!String(r.de_bai || '').trim()) || r.trang_thai === 'DA_GIAI' || r.trang_thai === 'GITHUB'; }).length;
  // tỉ lệ qua kiểm duyệt 10/10 thấp -> giữ nhiều đề chờ hơn để số video đạt mỗi ngày vẫn đủ (NangCao.gs > heSoSanXuat_)
  var hsSX = typeof heSoSanXuat_ === 'function' ? heSoSanXuat_() : { he_so: 1 };
  if (dangCho >= Math.min(10, Math.round(Number(cauHinh_('NGUONG_HANG_DOI')) * hsSX.he_so))) return;
  var choDung = hang.filter(function (r) { return r.trang_thai === 'CO_KICH_BAN' || r.trang_thai === 'DANG_DUNG'; }).length;
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
  // v99.2: chọn MẢNG theo lịch sử thật 20 đề gần nhất (THUC_TE | XAC_SUAT | HINH_PHANG | HINH_KHONG_GIAN) - không phụ thuộc bộ đếm
  var mang = typeof chonMang_ === 'function' ? chonMang_(hang) : null;
  var mon = mang ? monCuaMang_(mang) : chonMon_();
  var kieuHinh = mang === 'HINH_KHONG_GIAN' ? 'KHONG_GIAN' : mang === 'HINH_PHANG' ? 'PHANG' : null;
  // v94: CAU_HINH LOP_HINH_PHANG (vd 9) -> đề hình học tự sinh là hình phẳng lớp đó (ôn thi vào 10), không đổi lớp của các môn khác
  var lopHP = String((typeof cauHinh_ === 'function' && cauHinh_('LOP_HINH_PHANG')) || '').trim();
  if (mon === 'HINH_HOC' && kieuHinh !== 'KHONG_GIAN' && /^(8|9)$/.test(lopHP)) lop = lopHP;
  if (kieuHinh === 'KHONG_GIAN' && !/^(11|12)$/.test(lop)) lop = '11';   // lớp 10: chỉ hình phẳng (GDPT 2018)
  if (!mang) mang = mon === 'HINH_HOC' ? (kieuHinh === 'KHONG_GIAN' ? 'HINH_KHONG_GIAN' : 'HINH_PHANG') : mon;
  var st = typeof yeuCauSangTaoV992_ === 'function' ? yeuCauSangTaoV992_(mang, lop) : {chu: '', nhom: null, ep: false};
  nhatKy_('SINH_DE_MANG', 'Mảng ' + mang + ' (lớp ' + lop + ')' + (st.nhom ? ', nhóm sáng tạo ' + st.nhom.id : ''));
  var tagNguon = kieuHinh ? '|HINH_' + kieuHinh : '';
  var hopDong = function (d) { return st.ep && typeof hopDongTuDe_ === 'function' ? ganHopDong_(d.yeu_to_tu_duy, hopDongTuDe_(d, mang, st.nhom)) : d.yeu_to_tu_duy; };

  var daCo = hang.slice(-40).map(function (r) { return '- ' + r.chu_de + ': ' + String(r.de_bai).slice(0, 100); }).join('\n');
  var n = Number(cauHinh_('SO_DE_MOI_MOI_LAN'));
  var tSinh = Date.now();

  // Ưu tiên đề có thật trên internet; chỉ khi không tìm được đề nào đạt yêu cầu mới để AI sáng tác.
  if (che === 'UU_TIEN_INTERNET' || che === 'CHI_INTERNET') {
    var them = 0;
    try { them = timDeInternet_(sh, hang, lop, n, bc, mon, {kieuHinh: kieuHinh, st: st, tagNguon: tagNguon, hopDong: hopDong}); }
    catch (e) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e.message))) throw e; nhatKy_('TIM_INTERNET_LOI', String(e.message)); }
    if (them > 0) { nhatKy_('TIM_INTERNET', 'Đã lấy ' + them + ' đề ' + mon + ' có thật từ internet (lớp ' + lop + ')'); return; }
    if (che === 'CHI_INTERNET') { nhatKy_('TIM_INTERNET', 'Không tìm được đề phù hợp trên internet (chế độ chỉ internet nên không nhờ AI sáng tác)'); return; }
    nhatKy_('TIM_INTERNET', 'Không tìm được đề phù hợp trên internet, chuyển sang AI sáng tác (' + mon + ', lớp ' + lop + ')');
  }
  var prompt = mon === 'HINH_HOC' ? promptSangTacHinhHoc_(lop, n, daCo, kieuHinh) : mon === 'THUC_TE' ? promptSangTacThucTe_(lop, n, daCo) : promptSangTacXacSuat_(lop, n, daCo);
  // v92: chọn KHUÔN 3D trước (xoay vòng theo lớp) rồi mới sáng tác đề khớp khuôn -> video luôn có hình 3D động đúng đề
  // v99.2: nhóm sáng tạo + hợp đồng hình thay chỉ thị khuôn 3D (tắt: CAU_HINH SANG_TAO_V992 = TAT -> giữ v92/v96)
  if (st.ep) prompt += st.chu;
  else if (mon !== 'HINH_HOC') prompt += yeuCauKhuonSinhDe_(lop, mon);
  var kq = goiGemini_(prompt, 0.9, { suyNghi: mon === 'HINH_HOC' ? 'medium' : cauHinh_('MUC_SUY_NGHI_KICH_BAN') });
  capNhatTb_('TB_SINH_DE_MS', Date.now() - tSinh);
  if (kq && !Array.isArray(kq) && Array.isArray(kq.de)) kq = kq.de;
  if (!Array.isArray(kq)) throw new Error('SINH_DE_JSON_SAI_DANG');

  var daBam = docMaBamLuuTru_();
  hang.forEach(function (r) { daBam[r.ma_bam] = true; });
  var nguong = Number(cauHinh_('DIEM_TU_DUY_TOI_THIEU'));
  kq.forEach(function (d, i) {
    if (!d || !d.de_bai || Number(d.diem_tu_duy) < nguong) return;
    var sgk = typeof laDeSgkNhamChan_ === 'function' ? laDeSgkNhamChan_(d.de_bai) : '';
    if (sgk) { nhatKy_('BO_DE_SGK', 'Bỏ đề mô-típ SGK cũ (' + sgk + '): ' + String(d.de_bai).slice(0, 80)); return; }
    if (!dangDungDuoc_(mon, d.dang) && !(st.ep && mon !== 'HINH_HOC' && d.san_khau_dich === 'tu_sinh_svg')) { nhatKy_('BO_DANG_LA', 'Bỏ đề dạng "' + d.dang + '" (bộ dựng video chưa minh họa tốt): ' + String(d.de_bai).slice(0, 80)); return; }
    var b = bam_(d.de_bai);
    if (daBam[b]) return;
    daBam[b] = true;
    var id = (mon === 'HINH_HOC' ? 'HH' : mon === 'THUC_TE' ? 'TT' : 'VD') + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss') + '-' + i;
    themHang_(sh, {
      id: id, trang_thai: 'MOI', lop: lop, chu_de: d.chu_de, de_bai: d.de_bai, nguon: 'AI_SANG_TAC' + tagNguon + (st.nhom ? '|NHOM_' + st.nhom.id : ''), mon: mon,
      diem_tu_duy: d.diem_tu_duy, yeu_to_tu_duy: hopDong(d), bay_thuong_gap: d.bay_thuong_gap,
      so_lan_loi: 0, cap_nhat: new Date(), ma_bam: b, kiem_chung: duKienDapAn_(d)
    });
    bc.moi++;
  });
}

// v92: xoay vòng 8 khuôn 3D tham số (lọc theo lớp: lớp 10 chỉ khuôn phẳng, lớp 11 không Oxyz/đạo hàm) cho đề AI sáng tác.
function chonKhuonSinhDe_(lop, mon) {
  var ds = typeof dsKhuonTheoLop_ === 'function' ? dsKhuonTheoLop_(lop, mon) : [];
  if (!ds.length) return '';
  var p = PropertiesService.getScriptProperties();
  var k = Number(p.getProperty('KHUON_KE_' + mon) || 0);
  p.setProperty('KHUON_KE_' + mon, String((k + 1) % 64));
  return ds[k % ds.length];
}
function yeuCauKhuonSinhDe_(lop, mon) {
  if (typeof dungKhung4Tang_ === 'function' && !dungKhung4Tang_({lop: lop, mon: mon})) return '';
  // v96: xác suất -> xoay vòng kho bối cảnh đời thực + mô-đun 2D; thực tế -> xen kẽ khuôn 3D với Kinh tế / Chuyển động 2D / Tăng trưởng
  if (typeof yeuCauDaDangSinhDe_ === 'function') { var dd = yeuCauDaDangSinhDe_(lop, mon); if (dd !== null) return dd; }
  var ten = chonKhuonSinhDe_(lop, mon);
  if (!ten) return '';
  return '\nKHUÔN HÌNH 3D CỦA LẦN NÀY (BẮT BUỘC): mọi đề sáng tác phải dựng minh họa được bằng khuôn "' + ten + '" — ' +
    (typeof moTaKhuon_ === 'function' ? moTaKhuon_(ten) : ten) + '. Chọn bối cảnh và số liệu để hình khuôn này mô tả ĐÚNG đề (số liệu ghi rõ trong đề), vẫn giữ đúng chương trình lớp ' + lop + '. ' +
    'Thêm vào mỗi phần tử JSON trường "khuon":"' + ten + '".\n';
}

/* ===================== CHỦ ĐỀ: XÁC SUẤT / TOÁN THỰC TẾ ===================== */

// Chọn chủ đề cho lần sinh đề này: theo CHU_DE_VIDEO; XEN_KE thì luân phiên XAC_SUAT, THUC_TE.
function chonMon_() {
  var cd = String(cauHinh_('CHU_DE_VIDEO') || 'XEN_KE').toUpperCase();
  if (cd === 'XAC_SUAT' || cd === 'THUC_TE' || cd === 'HINH_HOC') return cd;
  var p = PropertiesService.getScriptProperties();
  var vong = typeof batHinhHoc_ === 'function' && batHinhHoc_() ? ['THUC_TE', 'HINH_HOC'] : ['THUC_TE'];   // các chủ đề còn lại (HinhHoc.gs)
  // v96: TỶ TRỌNG XÁC SUẤT (CAU_HINH TY_LE_XAC_SUAT, mặc định 55 %): rải đều tất định trên vòng 20 lượt (kiểu Bresenham),
  // các lượt còn lại luân phiên THUC_TE / HINH_HOC
  var tl = Number(cauHinh_('TY_LE_XAC_SUAT'));
  tl = isFinite(tl) && String(cauHinh_('TY_LE_XAC_SUAT') || '') !== '' ? Math.max(0, Math.min(100, tl)) : 55;
  var k = Number(p.getProperty('MON_KE') || 0) % 20;
  p.setProperty('MON_KE', String((k + 1) % 20));
  if (Math.floor((k + 1) * tl / 100) > Math.floor(k * tl / 100)) return 'XAC_SUAT';
  var k2 = Number(p.getProperty('MON_KE_KHAC') || 0);
  p.setProperty('MON_KE_KHAC', String((k2 + 1) % 12));
  return vong[k2 % vong.length];
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
    'Phạm vi kiến thức: ' + CHUONG_TRINH[lop] + '.\n' + yeuCauKienThucLop_(lop, 'XAC_SUAT') + '\n' +
    'TUYỆT ĐỐI KHÔNG chọn hay sáng tác bài phải dùng kiến thức lớp trên (vd lớp 10-11 không lấy bài xác suất có điều kiện / Bayes của lớp 12).\n' +
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
    'Phạm vi kiến thức: ' + CHUONG_TRINH_THUC_TE[lop] + '.\n' + yeuCauKienThucLop_(lop, 'THUC_TE') + '\n' +
    'TUYỆT ĐỐI KHÔNG chọn hay sáng tác bài phải dùng kiến thức lớp trên (vd lớp 10-11 không lấy bài phải khảo sát hàm bậc 3 / bảng biến thiên / đạo hàm tìm GTLN-GTNN hay tích phân của lớp 12).\n' +
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
    'Phạm vi kiến thức: ' + CHUONG_TRINH[lop] + '.\n' + yeuCauKienThucLop_(lop, 'XAC_SUAT') + '\n' +
    'TUYỆT ĐỐI KHÔNG chọn hay sáng tác bài phải dùng kiến thức lớp trên (vd lớp 10-11 không lấy bài xác suất có điều kiện / Bayes của lớp 12).\n' +
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
    'Phạm vi kiến thức: ' + CHUONG_TRINH_THUC_TE[lop] + '.\n' + yeuCauKienThucLop_(lop, 'THUC_TE') + '\n' +
    'TUYỆT ĐỐI KHÔNG chọn hay sáng tác bài phải dùng kiến thức lớp trên (vd lớp 10-11 không lấy bài phải khảo sát hàm bậc 3 / bảng biến thiên / đạo hàm tìm GTLN-GTNN hay tích phân của lớp 12).\n' +
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
  var luuY = yeuCauKienThucLop_(r.lop, 'THUC_TE');
  var de = 'Bài toán thực tế (lớp ' + r.lop + '):\n' + r.de_bai + (luuY ? '\n\n' + luuY : '') + khoaNgoNhanDe_(r.de_bai, 'THUC_TE');   // v99.2
  var dinhDang = 'Đáp số cuối là MỘT con số (đại lượng đề hỏi). Nếu đề yêu cầu làm tròn thì "gia_tri" là số ĐÃ làm tròn đúng yêu cầu; nếu không thì giữ ít nhất 4 chữ số có nghĩa. ' +
    'BẮT BUỘC THỬ NGƯỢC: thay đáp số vào lại TẤT CẢ dữ kiện của đề và tính lại (ví dụ đề cho tổng 260 thì tính lại tổng với đáp số tìm được xem có đúng 260 không). ' +
    'Nếu đề KHÔNG có đáp số thỏa mãn chính xác mọi dữ kiện (cần số nguyên mà phương trình không có nghiệm nguyên, dữ kiện mâu thuẫn, thiếu dữ kiện) thì ghi rõ vào "de_co_van_de" ' +
    'và chọn CÁCH HIỂU HỢP LÝ NHẤT để vẫn trả lời được (ví dụ: xếp được tối đa bao nhiêu tầng trọn vẹn và còn dư bao nhiêu), ghi cách hiểu đó trong "de_co_van_de"; đề bình thường thì để "de_co_van_de" rỗng. ' +
    'Trả JSON: {"mo_hinh":"đặt ẩn, điều kiện, hàm/biểu thức cần xét","cac_buoc":["..."],"gia_tri":0,"don_vi":"","dap_an_hien":"câu trả lời ngắn có đơn vị, ví dụ x = 4 m; S = 48 m²","thu_nguoc":"phép thử lại với đáp số","de_co_van_de":"","nut_that":"bước đột phá 1 câu","do_gon":1-10}\n\n';
  var schemaGiai = schemaGiaiBP1_('gia_tri');
  var kq3 = goiGeminiSong_([
    { nhiet: 0.2, schema: schemaGiai, prompt: 'Bạn là giáo viên Toán giỏi. Giải bài toán thực tế sau thật cẩn thận: đặt ẩn, nêu điều kiện của ẩn, lập biểu thức, giải và kiểm tra điều kiện; soát kỹ đơn vị. ' + dinhDang + de },
    { nhiet: 0.5, schema: schemaGiai, prompt: 'Bạn là giáo viên Toán giỏi, dạy bằng SUY LUẬN. Giải bài toán thực tế sau bằng cách GỌN và DỄ HIỂU nhất: nhận ra đại lượng cố định để khử ẩn, đối xứng, bất đẳng thức, hình học trực quan... Mỗi bước nói rõ VÌ SAO làm vậy. ' +
      'Thêm "y_tuong" (điều mấu chốt cần nhận ra, 1-2 câu) vào JSON. ' + dinhDang + de },
    { nhiet: 0.1, schema: schemaGiaiBP1_('ma'), prompt: 'Viết MỘT hàm JavaScript thuần tên kiemChung() (không dùng thư viện, không gọi mạng) để tự kiểm chứng đáp số bài toán thực tế sau bằng TÍNH SỐ trên máy (Google Apps Script, chậm hơn máy thường ~10 lần). ' +
      'Cài đặt trực tiếp từ ĐỀ BÀI, không dựa vào lời giải: ví dụ bài cực trị thì quét lưới thật mịn trên miền xác định rồi thu hẹp quanh điểm tốt nhất (tổng không quá 1 triệu phép tính); bài tích phân thì tính số bằng Simpson; bài lãi suất thì mô phỏng từng kỳ. ' +
      'Mọi vòng lặp phải chắc chắn dừng; không tạo mảng quá 100000 phần tử. Nếu đề yêu cầu làm tròn thì làm tròn đúng như đề. ' +
      'Hàm trả về {"kieu":"gia_tri","gia_tri":số_thực}. ' + YEU_CAU_HAI_CHIEU_ + 'Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de }
  ]);
  var c1 = kq3[0], c2 = kq3[1], kc = kq3[2];
  nhatKy_('THOI_GIAN', 'Giải toán thực tế + mã kiểm chứng (3 yêu cầu Gemini) mất ' + Math.round((Date.now() - t0) / 1000) + ' giây');
  var docTT = function (c) { var x = docSo_(c && c.gia_tri); return isFinite(x) ? x : null; };
  if (docTT(c1) === null && docTT(c2) === null) throw new Error('DAP_AN_KHONG_HOP_LE');
  var tt = trongTai_(r, {
    de: de, dinhDang: dinhDang, c1: c1, c2: c2, kc: kc, schema: schemaGiai,
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
      'Trả về {"kieu":"gia_tri","gia_tri":số_thực}. ' + YEU_CAU_HAI_CHIEU_ + 'Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de
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

function timDeInternet_(sh, hang, lop, n, bc, mon, o) {
  mon = mon || 'XAC_SUAT';
  o = o || {};
  var daCo = hang.slice(-60).map(function (r) { return '- ' + String(r.de_bai).slice(0, 90); }).join('\n');
  var prompt = mon === 'HINH_HOC' ? promptTimHinhHoc_(lop, n, daCo, o.kieuHinh) : mon === 'THUC_TE' ? promptTimThucTe_(lop, n, daCo) : promptTimXacSuat_(lop, n, daCo);
  if (o.st && o.st.ep) prompt += o.st.chu;   // v99.2: nhóm sáng tạo + hợp đồng hình (đề internet cũng phải có san_khau_dich)

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
    var sgk = typeof laDeSgkNhamChan_ === 'function' ? laDeSgkNhamChan_(d.de_bai) : '';
    if (sgk) { nhatKy_('BO_DE_SGK', 'Bỏ đề internet mô-típ SGK cũ (' + sgk + '): ' + String(d.de_bai).slice(0, 80)); return; }
    if (!dangDungDuoc_(mon, d.dang) && !(o.st && o.st.ep && mon !== 'HINH_HOC' && d.san_khau_dich === 'tu_sinh_svg')) { nhatKy_('BO_DANG_LA', 'Bỏ đề internet dạng "' + d.dang + '": ' + String(d.de_bai).slice(0, 80)); return; }
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
      nguon: 'INTERNET' + (o.tagNguon || '') + '|' + host + (khop ? '' : ' (chưa đối chiếu)') + '|' + url,
      diem_tu_duy: d.diem_tu_duy, yeu_to_tu_duy: o.hopDong ? o.hopDong(d) : d.yeu_to_tu_duy, bay_thuong_gap: d.bay_thuong_gap,
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
    .sort(function (a, b) { return (laVideoDai_(b) ? 1 : 0) - (laVideoDai_(a) ? 1 : 0); })
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
        var nhan10p = laVideoDai_(r) ? '[VIDEO_DAI_10P] | ' : '';
        ghi_(sh, r._row, {
          trang_thai: 'DA_GIAI', cach_1: JSON.stringify(kq.c1), cach_2: JSON.stringify(kq.c2),
          dap_an: kq.dap_an, dap_an_hien: kq.dap_an_hien || '', kiem_chung: nhan10p + kq.mo_ta + (duKien ? ' | khớp đáp án người ra đề ' + duKien : ''), ghi_chu: '', so_lan_loi: 0
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

// BP1: lời giải và mã kiểm chứng dùng hợp đồng khác nhau.
function schemaGiaiBP1_(dang) {
  var chu = {type: 'STRING'}, so = {type: 'NUMBER'}, nguyen = {type: 'INTEGER'};
  var dsChu = {type: 'ARRAY', items: chu};
  if (dang === 'ma') return {type: 'OBJECT', properties: {ma: chu}, required: ['ma']};
  dsChu.minItems = 1;
  var p = {cac_buoc: dsChu, de_co_van_de: chu, y_tuong: chu, nut_that: chu, do_gon: nguyen};
  var batBuoc = ['cac_buoc'];
  if (dang === 'xac_suat') {
    Object.assign(p, {tu: nguyen, mau: nguyen});
    batBuoc.push('tu', 'mau');
  } else if (dang === 'chung_minh') {
    Object.assign(p, {menh_de: chu, duong_phu: dsChu, chung_minh_duoc: {type: 'BOOLEAN'},
      cac_buoc: {type: 'ARRAY', items: {type: 'OBJECT', properties: {khang_dinh: chu, ly_do: chu}, required: ['khang_dinh', 'ly_do']}}});
    batBuoc.push('menh_de', 'chung_minh_duoc');
  } else {
    Object.assign(p, {gia_tri: so, don_vi: chu, dap_an_hien: chu, mo_hinh: chu, thu_nguoc: chu, duong_phu: dsChu});
    batBuoc.push('gia_tri', 'don_vi', 'dap_an_hien');
  }
  return {type: 'OBJECT', properties: p, required: batBuoc};
}

function giaiVaKiemChung_(r) {
  if (typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r)) return giaiHinhHoc_(r);   // hình học khó: tính hoặc chứng minh (HinhHoc.gs)
  return laMonThucTe_(r) ? giaiThucTe_(r) : giaiXacSuat_(r);
}

function giaiXacSuat_(r) {
  var t0 = Date.now();
  var luuY = yeuCauKienThucLop_(r.lop, 'XAC_SUAT');
  var de = 'Bài toán (lớp ' + r.lop + '):\n' + r.de_bai + (luuY ? '\n\n' + luuY : '') + khoaNgoNhanDe_(r.de_bai, 'XAC_SUAT');   // v99.2
  var dinhDang = 'Đáp án cuối là MỘT xác suất dạng phân số với tử và mẫu là số nguyên dương. Soát lại: đếm trùng/đếm sót, có hoàn lại không, có phân biệt thứ tự không. ' +
    'Nếu đề mơ hồ hoặc mâu thuẫn, ghi rõ vào "de_co_van_de" cách hiểu hợp lý nhất đã dùng (đề bình thường để rỗng). Trả JSON: {"cac_buoc":["..."],"tu":0,"mau":0,"de_co_van_de":"","nut_that":"bước đột phá 1 câu","do_gon":1-10}\n\n';
  // Ba việc độc lập nhau (hai cách giải + mã kiểm chứng) nên gọi đồng thời.
  var schemaGiai = schemaGiaiBP1_('xac_suat');
  var kq3 = goiGeminiSong_([
    { nhiet: 0.2, schema: schemaGiai, prompt: 'Bạn là giáo viên Toán giỏi. Giải bài toán xác suất sau thật cẩn thận, từng bước, ' +
      'soát kỹ lỗi đếm trùng/đếm sót. ' + dinhDang + de },
    { nhiet: 0.5, schema: schemaGiai, prompt: 'Bạn là giáo viên Toán giỏi, nổi tiếng vì dạy bằng SUY LUẬN. Giải bài toán xác suất sau bằng cách THÔNG MINH NHẤT, ít tính toán nhất: ưu tiên nhận ra cấu trúc của bài (đối xứng, đếm bù, biến cố đối, quy về bài đơn giản hơn, thử trường hợp nhỏ để tìm quy luật, đổi góc nhìn); CHỈ dùng công thức khi suy luận đã đưa tới đó. Mỗi bước phải nói rõ VÌ SAO làm vậy. Nếu bài không có cách thông minh hơn thì chia trường hợp thật rõ ràng. ' +
    'Đáp án cuối là MỘT xác suất dạng phân số với tử và mẫu là số nguyên dương. Trả JSON: {"y_tuong":"điều mấu chốt cần nhận ra, 1-2 câu","nut_that":"bước đột phá 1 câu","do_gon":1-10,"cac_buoc":["..."],"tu":0,"mau":0}\n\n' + de },
    { nhiet: 0.1, schema: schemaGiaiBP1_('ma'), prompt: 'Viết MỘT hàm JavaScript thuần tên kiemChung() (không dùng thư viện, không gọi mạng) để tự kiểm chứng đáp án bài toán xác suất sau ' +
      'bằng máy tính (chạy trên Google Apps Script, CHẬM hơn máy tính thường khoảng 10 lần). Ưu tiên ĐẾM VÉT CẠN (liệt kê toàn bộ không gian mẫu) nếu không quá khoảng 1 triệu phép lặp; ' +
      'nếu không thì MÔ PHỎNG với đúng n = 200000 lần dùng Math.random. Mọi vòng lặp phải chắc chắn dừng; không tạo mảng quá 100000 phần tử. ' +
      'Hàm trả về: đếm vét cạn -> {"kieu":"chinh_xac","tu":số_nguyên,"mau":số_nguyên}; ' +
      'mô phỏng -> {"kieu":"mo_phong","gia_tri":số_thực,"n":200000}. ' + YEU_CAU_HAI_CHIEU_ +
      'Hãy cài đặt trực tiếp từ ĐỀ BÀI, không dựa vào lời giải. Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de }
  ]);
  var c1 = kq3[0], c2 = kq3[1], kc = kq3[2];
  Logger.log('Goi Gemini song song xong sau ' + Math.round((Date.now() - t0) / 1000) + ' giay');
  nhatKy_('THOI_GIAN', 'Giải + viết mã kiểm chứng (3 yêu cầu Gemini) mất ' + Math.round((Date.now() - t0) / 1000) + ' giây');

  if (!chuanHoa_(c1) && !chuanHoa_(c2)) throw new Error('DAP_AN_KHONG_HOP_LE');
  var bangPS = function (a, b) { return !!(a && b && a.tu * b.mau === b.tu * a.mau); };
  var tt = trongTai_(r, {
    de: de, dinhDang: dinhDang, c1: c1, c2: c2, kc: kc, schema: schemaGiai,
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
      'Trả về {"kieu":"chinh_xac","tu":số_nguyên,"mau":số_nguyên} hoặc {"kieu":"mo_phong","gia_tri":số_thực,"n":200000}. Cài đặt trực tiếp từ ĐỀ BÀI, đọc đề thật kỹ từng chữ (có hoàn lại không, phân biệt thứ tự không, "ít nhất"/"đúng"...). ' + YEU_CAU_HAI_CHIEU_ + 'Trả JSON: {"ma":"function kiemChung(){...}"}\n\n' + de
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
  var themGiai = function (c, nguon) {
    var v = c ? o.doc(c) : null;
    if (v === null || v === undefined) return;
    var vp = typeof kiemTraViPhamLop_ === 'function' ? kiemTraViPhamLop_(c, r.lop, r.mon, r.de_bai) : [];
    if (vp.length) nhatKy_('GIAI', r.id + ' (' + nguon + '): vi phạm kiến thức lớp ' + r.lop + ': ' + vp[0]);
    ung.push({ v: v, c: c, nguon: nguon, vp: vp });
  };
  var chayMa = function (kc, ten) {
    if (!kc || !kc.ma) return;
    try {
      var raw = chayKiemChung_(kc.ma);
      // v99.2 KIỂM 2 CHIỀU: mo_phong (tính trực tiếp theo quy luật đề) phải khớp giai_tich (công thức) trong 1e-4 -> lệch: phản hồi
      // Gemini sửa mã ĐÚNG 1 lần (kèm số lệch + 4 bẫy ngộ nhận); vẫn lệch -> mã này KHÔNG được bỏ phiếu trong trọng tài.
      var hc = kiemHaiChieu_(raw);
      if (hc && !hc.ok && o.promptMa && typeof goiGemini_ === 'function') {
        nhatKy_('GIAI', r.id + ': mã kiểm chứng ' + ten + ' lệch 2 chiều (' + hc.mo + '), phản hồi sửa 1 lần');
        try {
          var kcSua = goiGemini_(o.promptMa + '\n\nMÃ TRƯỚC TỰ MÂU THUẪN: ' + hc.mo + '. Một trong hai cách tính SAI (hay gặp: nhầm hữu hạn n lần với tổng vô hạn, ' +
            'sai đơn vị, nhầm có / không hoàn lại, nghiệm tối ưu ngoài miền). Đọc lại đề, sửa để hai giá trị khớp.\nMÃ TRƯỚC:\n' + String(kc.ma).slice(0, 6000), 0.1, { suyNghi: cauHinh_('MUC_SUY_NGHI_GIAI'), schema: schemaGiaiBP1_('ma') });
          if (kcSua && kcSua.ma) { var raw2 = chayKiemChung_(kcSua.ma); var hc2 = kiemHaiChieu_(raw2); raw = raw2; hc = hc2; }
        } catch (eS) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(eS.message))) throw eS; }
      }
      if (hc && !hc.ok) { nhatKy_('GIAI', r.id + ': mã kiểm chứng ' + ten + ' vẫn lệch 2 chiều (' + hc.mo + ') -> không tính phiếu'); return; }
      var k = o.kiem(raw);
      if (k) { if (hc && hc.ok) k.mo += ' | 2 chiều khớp'; ma.push(k); }
    }
    catch (e) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e.message))) throw e; nhatKy_('GIAI', r.id + ': mã kiểm chứng ' + ten + ' lỗi (' + String(e.message).slice(0, 80) + ')'); }
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
    var khopSach = khop.filter(function (u) { return !u.vp || !u.vp.length; });
    var c1 = khopSach.length ? khopSach[0].c : (khop.length ? khop[0].c : o.c1);
    var c2Sach = khopSach.filter(function (u) { return u.nguon === 'cach2'; });
    var c2 = c2Sach.length ? c2Sach[0].c : (khopSach.length ? khopSach[0].c : (khop.filter(function (u) { return u.nguon === 'cach2'; }).length ? o.c2 : c1));
    var vanDeLop = '';
    if ((!khop.length || !khopSach.length) && chuanLop_(r.lop) && typeof goiGemini_ === 'function') {
      var lyDoVp = khop.length ? (khop[0].vp || []).join('; ') : 'lời giải trước chưa khớp kết quả mã kiểm chứng (' + tomTat() + ')';
      nhatKy_('GIAI', r.id + ': đáp án ' + o.chu(v) + (khop.length ? ' đúng nhưng lời giải vi phạm lớp ' + r.lop : ' được máy tính chốt, yêu cầu viết lời giải chuẩn lớp ' + r.lop) + ' (' + lyDoVp + ')');
      try {
        var promptSua = 'Bạn là giáo viên Toán lớp ' + r.lop + '. Đáp án đúng đã kiểm chứng của bài là ' + o.chu(v) +
          '.\nHãy VIẾT lời giải chi tiết, chính xác CHỈ dùng kiến thức được phép của lớp ' + r.lop + ' (giữ đúng đáp số ' + o.chu(v) + ').\n' +
          yeuCauKienThucLop_(r.lop, r.mon) + '\n' + o.dinhDang + o.de;
        var cMoi = goiGemini_(promptSua, 0.2, { suyNghi: 'high', schema: o.schema });
        var vMoi = cMoi ? o.doc(cMoi) : null;
        var vpMoi = cMoi && typeof kiemTraViPhamLop_ === 'function' ? kiemTraViPhamLop_(cMoi, r.lop, r.mon, r.de_bai) : ['KHONG_DOC_DUOC'];
        if (vMoi !== null && vMoi !== undefined && o.bang(vMoi, v) && !vpMoi.length) {
          c1 = cMoi; c2 = cMoi;
          nhatKy_('GIAI', r.id + ': đã viết lại lời giải sạch đúng kiến thức lớp ' + r.lop);
        } else {
          vanDeLop = 'Lời giải vượt chương trình lớp ' + r.lop + ' (' + (vpMoi.length ? vpMoi[0] : lyDoVp) + ')';
        }
      } catch (eSua) {
        if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(eSua.message))) throw eSua;
        vanDeLop = 'Lời giải vượt chương trình lớp ' + r.lop + ' (' + lyDoVp + ')';
      }
    }
    // c2 đã được chọn theo khopSach ở trên. v99.2: trong các lời giải ĐÚNG + sạch, đưa cách GỌN / trực quan nhất (do_gon, nut_that)
    // vào chỗ "LỜI GIẢI GỌN" (c2) của BP2 - Shorts 45-55 s cần 1 nút thắt, không biến đổi dài.
    var gon = chonCachGon_(khopSach.map(function (u) { return u.c; }));
    if (gon && gon !== c2) { if (gon === c1 && c2) { c1 = c2; } c2 = gon; }
    if (c2 && !c2.y_tuong && c2.nut_that) c2.y_tuong = c2.nut_that;
    var mo = ma.filter(function (k) { return k.khop(v); }).map(function (k) { return k.mo; }).join('; ') || 'các lời giải độc lập khớp nhau';
    if (vong) nhatKy_('GIAI', r.id + ': trọng tài vòng ' + vong + ' chốt ' + o.chu(v) + ' (' + tomTat() + ')');
    var vanDe = '';
    khop.concat(ung).some(function (u) { var x = String((u.c && u.c.de_co_van_de) || '').trim(); if (x.length > 8) { vanDe = x; return true; } return false; });
    if (vanDeLop && !vanDe) vanDe = vanDeLop;
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
  try { themGiai(goiGemini_('Bạn là giáo viên Toán chấm thi rất cẩn thận. ' + goiY + o.dinhDang + o.de, 0.1, { suyNghi: 'high', schema: o.schema }), 'giai_lai'); }
  catch (e1) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e1.message))) throw e1; }
  try { chayMa(goiGemini_(o.promptMa, 0.2, { suyNghi: cauHinh_('MUC_SUY_NGHI_GIAI'), schema: schemaGiaiBP1_('ma') }), '2'); }
  catch (e2) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO)$/.test(String(e2.message))) throw e2; }
  t = tot();
  if (t.v !== null && t.ro) return ketQua(t.v, 1);
  // vòng 2: giải bằng phương pháp khác hẳn (liệt kê trực tiếp / đặt lại mô hình)
  try { themGiai(goiGemini_('Bạn là giáo viên Toán. Giải bài sau theo ĐÚNG kiến thức lớp ' + (chuanLop_(r.lop) || r.lop) + ' bằng một PHƯƠNG PHÁP KHÁC HẲN cách thông thường (ví dụ liệt kê trực tiếp các trường hợp nhỏ, đếm bằng bảng, đặt lại mô hình' + (chuanLop_(r.lop) === '12' ? '/tọa độ Oxyz' : (chuanLop_(r.lop) === '10' ? '/tọa độ Oxy' : '')) + '), ' +
    'kiểm tra lại kết quả bằng một cách thứ hai trước khi trả lời. ' + o.dinhDang + o.de, 0.3, { suyNghi: 'high', schema: o.schema }), 'cach_khac'); }
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
    .sort(function (a, b) { return (laVideoDai_(b) ? 1 : 0) - (laVideoDai_(a) ? 1 : 0); })
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
      var sn = tuyChonBienKich_();
      // Đề gửi kèm ảnh: cho Gemini NHÌN ảnh khi viết kịch bản để vẽ lại đúng hình của đề (không thay bằng vật "gần giống").
      var anhDe = anhDeChoGemini_(r);
      if (anhDe) sn.anh = anhDe;
      var trenGitHub = THOI_GIAN_TOI_DA_MS > 600000;
      // BẢN VẼ cảnh thực tế: chỉ gọi thêm 1 lượt Gemini khi đề có ảnh chụp (anhDe) hoặc có mô tả hình;
      // các đề chữ thông thường dùng ngay bản vẽ chuẩn mặc định (banVeMacDinh_) trong taoPromptKichBan_ để tiết kiệm 30-45 giây/kịch bản.
      r._banVe = null;
      if (!laMonHinhHoc_(r) && (anhDe || deCoHinh_(r)) && typeof lapBanVe_ === 'function' && conDuGoiGemini_()) {   // luồng hình học thuần: KHÔNG lập bản vẽ cảnh thật
        try { r._banVe = lapBanVe_(r, anhDe); if (r._banVe) nhatKy_('BAN_VE', r.id + ': đã lập bản vẽ ' + (r._banVe.vat || []).map(function (v) { return v.ten; }).join(', ')); }
        catch (eBv) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(eBv.message))) throw eBv; }
        prompt = taoPromptKichBan_(r, c1, c2);
      }
      // Có bản nháp từ lần trước (đang sửa dở) thì sửa tiếp từ đó, không viết lại từ đầu.
      var kb = docNhapKichBan_(r.id);
      var laDai10P = typeof laVideoDai_ === 'function' && laVideoDai_(r);
      if (kb && !(laDai10P && kb.canh.length < 22)) nhatKy_('KICH_BAN', r.id + ': sửa tiếp bản nháp lần trước');
      else if (laDai10P && typeof lapKichBanDai10Phut_ === 'function') {
        var tGoiDai = Date.now();
        kb = lapKichBanDai10Phut_(r, c1, c2, sn, kb);
        capNhatTb_('TB_GOI_KB_MS', Date.now() - tGoiDai);
      } else {
        var tGoi = Date.now();
        kb = goiKichBanCoSchema_(prompt, 0.6, sn, schemaKichBan_());
        capNhatTb_('TB_GOI_KB_MS', Date.now() - tGoi);
      }
      if (laDai10P && kb) kb.kieu_video = 'DAI_10_PHUT';
      var ctxSua = { y_tuong: String((c2 && c2.y_tuong) || '') };
      var spham = null;
      try { spham = r.san_pham ? JSON.parse(String(r.san_pham)) : null; } catch (eSp) { spham = null; }
      // Người duyệt góp ý (/sua): bắt buộc áp dụng góp ý trước khi kiểm tra; nếu lỗi/hết giờ -> lưu nháp & dừng để lượt sau sửa tiếp
      if (String(r.gop_y || '').trim()) {
        if (!conDuGoiGemini_()) { luuNhapKichBan_(r.id, kb); throw new Error('HET_GIO'); }
        try {
          var kbGY = suaKichBanBangGemini_(kb, ['GOP_Y_NGUOI_DUYET (bắt buộc làm theo, sửa đúng các cảnh liên quan): ' + String(r.gop_y)], prompt, sn);
          if (kbGY && Array.isArray(kbGY.canh) && kbGY.canh.length) {
            kb = kbGY;
            ghi_(sh, r._row, { gop_y: '' }, r.id);
            nhatKy_('KICH_BAN_SUA', r.id + ': đã sửa theo góp ý của người duyệt');
          } else {
            luuNhapKichBan_(r.id, kb);
            ghi_(sh, r._row, { ghi_chu: 'Chờ áp dụng góp ý người duyệt ở lượt sau' }, r.id);
            continue;
          }
        } catch (eGY) {
          luuNhapKichBan_(r.id, kb);
          if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(eGY.message))) throw eGY;
          ghi_(sh, r._row, { ghi_chu: 'Chưa sửa được theo góp ý (' + String(eGY.message).slice(0, 120) + '), thử lại lượt sau' }, r.id);
          continue;
        }
      }
      var hinhDe = deCoHinh_(r) ? String(r.de_bai || '') + ' ' + String(r.mo_ta_hinh || '') : '';
      if (kb && typeof kb === 'object') kb.lop = chuanLop_(r.lop) || String(r.lop || '');
      if (kb && laMonThucTe_(r)) kb.mon = 'THUC_TE';
      var dg = null, lanSua = 0, hetGio = false, daSuaThieuHinh = false, daSuaTexAI = false;
      var maxSua = Number(cauHinh_('SO_LAN_SUA_KICH_BAN')) || 2;
      // v98: Oxyz lớp 12 -> đặc tả hình 3D Lego ở lời gọi riêng có responseSchema (sau khi đã có lời các cảnh)
      if (kb && typeof dungLego_ === 'function' && dungLego_(r) && !laLegoKb_(kb) && conDuGoiGemini_()) {
        try { lapLego_(kb, r, sn); } catch (eLg) { luuNhapKichBan_(r.id, kb); throw eLg; }
      }
      // v99.2: hợp đồng hình của BP0 (san_khau_dich / kich_ban_hinh / nut_that) -> kb để SanKhau.gs + chuanbi.py cùng đọc
      if (kb && typeof apHopDongVaoKb_ === 'function') apHopDongVaoKb_(kb, r);
      // v99.1: đề thực tế giàu hình ảnh / dạng lạ -> sân khấu tự sinh 2.5D (tối đa 1 lần vá khi thiếu hình, rồi tự cứu tất định)
      if (kb && kb.khung4tang && typeof dungTuSinh_ === 'function' && dungTuSinh_(r, kb) && !(kb.khung4tang.tu_sinh || {}).ma && !kb.tu_sinh_da_thu && conDuGoiGemini_()) {
        var coTsDau = false;
        try { coTsDau = lapTuSinh_(kb, r, sn, {toiDaVa: 1, mauNgan: true}); } catch (eTs) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(eTs.message))) { luuNhapKichBan_(r.id, kb); throw eTs; } }
        if (!coTsDau) daSuaThieuHinh = true;
      }
      for (;;) {
        try { boSungBanVeMoDau_(kb, r, sn); }
        catch (eBV) { if (kb && kb.canh) luuNhapKichBan_(r.id, kb); throw eBV; }
        chuanBiKichBan_(kb, r, ctxSua);
        // v102: đề THUC_TE không khớp 8 khuôn 3D đã được tuSuaKhung4Tang_ chuyển sang tu_sinh_svg -> gọi lapTuSinh_ tối đa 1 lần
        if (kb && kb.khung4tang && typeof dungTuSinh_ === 'function' && dungTuSinh_(r, kb) && !(kb.khung4tang.tu_sinh || {}).ma && !kb.tu_sinh_da_thu && !daSuaThieuHinh && conDuGoiGemini_()) {
          var coTsVong = false;
          try { coTsVong = lapTuSinh_(kb, r, sn, {toiDaVa: 0, mauNgan: true}); } catch (eTsV) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(eTsV.message))) { luuNhapKichBan_(r.id, kb); throw eTsV; } }
          daSuaThieuHinh = true;
          if (coTsVong) chuanBiKichBan_(kb, r, ctxSua);
        }
        dg = danhGiaKichBan_(kb, r.dap_an, r.mon, hinhDe, spham, r.de_bai, r.lop);
        // Chống thiếu hình Tầng 2 & chống đốt quota key:
        //  - Gặp KHUNG4TANG_3D_RONG -> tự chuyển tuyến ngay sang tu_sinh_svg (tuyệt đối không bắt AI sửa 8 khuôn 3D).
        //  - Với KHUNG4TANG_3D_RONG / t2_trong / hinh_dung_im -> gọi AI sửa tối đa 1 lần (kèm khung mẫu kho_manh_svg < 15 dòng);
        //    nếu vẫn rỗng/lỗi -> chuyển thẳng sang Lớp 3 tất định tuCuuTang2_ (0 tốn API, KHÔNG vứt BO_KHONG_DAT).
        var coLoi3DRong = dg.nang.some(function (x) { return /^KHUNG4TANG_3D_RONG/.test(String(x)); });
        var coLoiT2Trong = dg.nang.some(function (x) { return /^(?:t2_trong|hinh_dung_im)\b/.test(String(x)); });
        if ((coLoi3DRong || coLoiT2Trong) && kb && kb.khung4tang) {
          kb.san_khau_dich = 'tu_sinh_svg';
          delete kb.khung4tang.canh_3d_vector;
          if (kb.khung4tang.san_khau && kb.khung4tang.san_khau.loai !== 'tu_sinh_svg') delete kb.khung4tang.san_khau;
          var coTsCuu = false;
          if (!daSuaThieuHinh && typeof lapTuSinh_ === 'function' && conDuGoiGemini_()) {
            daSuaThieuHinh = true;
            kb.tu_sinh_da_thu = false;
            try { coTsCuu = lapTuSinh_(kb, r, sn, {toiDaVa: 0, mauNgan: true}); } catch (eTs2) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(eTs2.message))) { luuNhapKichBan_(r.id, kb); throw eTs2; } }
          }
          if (!coTsCuu && typeof tuCuuTang2_ === 'function') {
            coTsCuu = tuCuuTang2_(kb, r, coLoi3DRong ? 'KHUNG4TANG_3D_RONG' : (dg.nang.some(function (x) { return /^hinh_dung_im\b/.test(String(x)); }) ? 'hinh_dung_im' : 't2_trong'));
          }
          if (coTsCuu) continue;
        }
        // Hết lỗi nặng thì đi tiếp ngay sang cửa AI chấm tiêu chí (gộp sửa các lưu ý nhẹ vào cùng 1 vòng nếu AI chấm cần sửa, tiết kiệm 1-2 lượt Gemini).
        if (!dg.nang.length) break;
        var chiLoiTex = dg.nang.every(function (x) { return /^TEX_/.test(String(x)); });
        if (chiLoiTex && daSuaTexAI) break;
        if (lanSua >= maxSua) break;
        if (!conDuGoiGemini_()) { hetGio = true; break; }
        var dsLoi = dg.nang.concat(dg.nhe);
        if (dg.nang.some(function (x) { return /^TEX_/.test(String(x)); })) daSuaTexAI = true;
        nhatKy_('KICH_BAN_SUA', r.id + ' sửa ngay lần ' + (lanSua + 1) + ' (' + dg.nang.length + ' lỗi nặng, ' + dg.nhe.length + ' lỗi nhẹ): ' + dsLoi.map(function (x) { return String(x).split(':')[0]; }).join(', '));
        var kbMoi = null;
        try { kbMoi = suaKichBanBangGemini_(kb, dsLoi, prompt, sn); }
        catch (eS) {
          if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(eS.message))) { luuNhapKichBan_(r.id, kb); throw eS; }
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
            var dgGT = danhGiaKichBan_(kb, r.dap_an, r.mon, hinhDe, spham, r.de_bai, r.lop);
            if (dgGT.nang.length) { kb = JSON.parse(kbLuu); nhatKy_('KICH_BAN_GIAI_THICH', r.id + ': bỏ cảnh giải thích bổ sung (' + dgGT.nang.map(function (x) { return String(x).split(':')[0]; }).join(', ') + ')'); }
            else { dg = dgGT; nhatKy_('KICH_BAN_GIAI_THICH', r.id + ': đã thêm cảnh giải thích công thức, nay ' + demCanhGiaiThich_(kb) + ' cảnh, tổng ' + kb.canh.length + ' cảnh'); }
          }
        } catch (eGT) { kb = JSON.parse(kbLuu); if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(eGT.message))) { luuNhapKichBan_(r.id, kb); throw eGT; } }
      }
      // BỘ PHẬN KIỂM DUYỆT YÊU CẦU - cửa 1 (NangCao.gs): AI chấm kịch bản theo bảng yêu cầu của chủ kênh TRƯỚC khi dựng.
      // Nếu kịch bản đạt >= 72% ngay lượt đầu -> tối đa 1 vòng sửa; dưới 72% -> cho phép 2 vòng trên GitHub để nâng chất lượng nhanh gọn.
      var batBuocDuyetCanh = !laMonHinhHoc_(r);
      if (batBuocDuyetCanh || (typeof aiDuyetKichBan_ === 'function' && String(chNC_('AI_DUYET_KICH_BAN')).toUpperCase() !== 'TAT')) {
        var maxYC = typeof soLanSuaKichBanYC_ === 'function' ? soLanSuaKichBanYC_() : soLanSuaYeuCau_();
        var lanYC = 0, toiDaYC = Math.min(trenGitHub ? 2 : 1, maxYC), boDe = null, dy = null, totNhatYC = null;
        while (conDuGoiGemini_()) {
          try { dy = aiDuyetKichBan_(kb, r, spham); }
          catch (eYC) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(eYC.message))) { luuNhapKichBan_(r.id, kb); throw eYC; } dy = null; }
          if (!dy) break;
          if (lanYC === 0 && Number(dy.phan_tram) >= 72) toiDaYC = Math.min(1, toiDaYC);
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
          var goiYNhe = (dg && Array.isArray(dg.nhe)) ? dg.nhe.filter(function (x) {
            return /^(MO_PHONG_DON_DIEU|HINH_LAP_LAI_NHIEU_CANH|CHUNG_MINH_QUA_GON|CHU_DE_LEN_HINH|HINH_DUNG_YEN|CAI_BAY|CAU_NOI_LAP|GIOI_THIEU_AN_SOM|IT_ANH_SAN_PHAM)\b/.test(String(x));
          }).slice(0, 3) : [];
          try { kbYC = suaKichBanBangGemini_(kb, ['KIEM_DUYET_YEU_CAU (bắt buộc sửa hết; kịch bản mới đáp ứng ' + dy.phan_tram + '%, tiêu chí: ' + tomTatTieuChi_(dy) + '). Vấn đề: ' + dy.van_de.join(' || ') + '. Cách sửa: ' + dy.gop_y].concat(goiYNhe), prompt, sn); }
          catch (eYS) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(eYS.message))) { luuNhapKichBan_(r.id, kb); throw eYS; } }
          lanYC++;
          if (kbYC && Array.isArray(kbYC.canh) && kbYC.canh.length) {
            kb = kbYC;
            chuanBiKichBan_(kb, r, ctxSua);
            var dgYC = danhGiaKichBan_(kb, r.dap_an, r.mon, hinhDe, spham, r.de_bai, r.lop);
            if (dgYC.nang.length) { kb = JSON.parse(kbTruoc); nhatKy_('KIEM_DUYET_YC', r.id + ': bản sửa sinh lỗi nặng (' + dgYC.nang.map(function (x) { return String(x).split(':')[0]; }).join(', ') + '), giữ bản trước'); }
            else dg = dgYC;
          }
        }
        // v91 AUTO-FIX: luồng thực tế hết vòng sửa mà chưa "đạt" -> không ném bỏ ngay; xét như các luồng khác theo TIÊU CHÍ CỐT LÕI
        // (đề bài, bám đề, lời giải, đáp án, quy tắc đã dạy, sản phẩm >= 7/10) ở khối "if (boDe)" bên dưới.
        var autoFixYC = !!boDe && typeof batAutoFix_ === 'function' && batAutoFix_();
        if (autoFixYC) nhatKy_('AUTO_FIX', r.id + ': kiểm duyệt cảnh chưa đạt (' + boDe.slice(0, 120) + ') -> xét tiêu chí cốt lõi thay vì từ chối');
        if (batBuocDuyetCanh && !(dy && dy.dat) && !autoFixYC) {
          luuNhapKichBan_(r.id, kb);
          if (!boDe) {
            ghi_(sh, r._row, {so_lan_loi: Math.max(0, (Number(r.so_lan_loi) || 1) - 1), ghi_chu: 'Chờ duyệt đủ nội dung và hình của từng cảnh trước khi dựng'});
            continue;
          }
          throw new Error('KICH_BAN_KHONG_HOP_LE: ' + boDe);
        }
        if (boDe) {
          // Khôi phục bản kịch bản tốt nhất đã được AI chỉnh sửa theo góp ý (totNhatYC).
          if (totNhatYC && totNhatYC.kb) {
            kb = JSON.parse(totNhatYC.kb);
            dy = totNhatYC.dy || dy;
            chuanBiKichBan_(kb, r, ctxSua);
            dg = danhGiaKichBan_(kb, r.dap_an, r.mon, hinhDe, spham, r.de_bai, r.lop);
          }
          // Siết chuẩn tiêu chí cốt lõi của chủ kênh: KHÔNG cho qua nếu sai đề bài, sai hình bám đề, sai toán/đáp án, sai quy tắc đã dạy hoặc sai sản phẩm (< 7/10).
          var ctYC = (dy && dy.chi_tiet) || {};
          var cotLoiOk = ['de_bai', 'bam_de', 'loi_giai', 'dap_an', 'quy_tac_hoc', 'san_pham'].every(function (k) {
            return ctYC[k] === undefined || Number(ctYC[k]) >= 7;
          });
          if ((!dg || !dg.nang || !dg.nang.length) && cotLoiOk) {
            nhatKy_('KIEM_DUYET_YC', r.id + ': giữ bản kịch bản đạt tiêu chí cốt lõi sau ' + lanYC + ' vòng sửa (' + (dy ? dy.phan_tram : '?') + '%) -> dựng video');
          } else {
            var lanLoiKB = Number(r.so_lan_loi) || 1;
            var maxLoiKB = Math.max(2, Number(cauHinh_('MAX_LAN_LOI')) || 3);
            if (lanLoiKB >= maxLoiKB - 1 && typeof boDeKhongDat_ === 'function') {
              boDeKhongDat_(sh, r, boDe, 'kich_ban');
              bc.loai++;
              continue;
            }
            luuNhapKichBan_(r.id, kb);
            ghi_(sh, r._row, { ghi_chu: 'Tiếp tục AI sửa kịch bản ở lượt sau: ' + boDe.slice(0, 180) });
            continue;
          }
        }
      }
      if (dg.nhe.length) nhatKy_('KICH_BAN_LUU_Y', r.id + ': dùng được, còn ' + dg.nhe.length + ' lưu ý nhẹ: ' + dg.nhe.map(function (x) { return String(x).split(':')[0]; }).join(', '));
      // Cổng lọc sớm (Pre-flight Gate) trước khi lưu CO_KICH_BAN (chỉ Khung4Tang ngắn; bỏ qua HINH_PHANG / HINH_KHONG_GIAN / -10P)
      if (typeof congLocSomBP2_ === 'function') {
        var loiPF = congLocSomBP2_(kb, r);
        var thieuT2PF = loiPF.some(function (x) { return /^(?:t2_trong|KHUNG4TANG_3D_RONG|hinh_dung_im)/.test(String(x)); });
        if (thieuT2PF && kb.khung4tang) {
          kb.san_khau_dich = 'tu_sinh_svg';
          delete kb.khung4tang.canh_3d_vector;
          if (kb.khung4tang.san_khau && kb.khung4tang.san_khau.loai !== 'tu_sinh_svg') delete kb.khung4tang.san_khau;
          var daCuuPF = false;
          if (!daSuaThieuHinh && typeof lapTuSinh_ === 'function' && conDuGoiGemini_()) {
            daSuaThieuHinh = true;
            kb.tu_sinh_da_thu = false;
            nhatKy_('CONG_LOC_SOM_BP2', r.id + ': thiếu hình T2 -> gọi AI sửa 1 lần duy nhất kèm khung mẫu kho_manh_svg');
            try { daCuuPF = lapTuSinh_(kb, r, sn, {toiDaVa: 0, mauNgan: true}); } catch (ePfTs) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(ePfTs.message))) { luuNhapKichBan_(r.id, kb); throw ePfTs; } }
          }
          if (!daCuuPF && typeof tuCuuTang2_ === 'function') {
            tuCuuTang2_(kb, r, 'CONG_LOC_SOM_BP2');
          }
          chuanBiKichBan_(kb, r, ctxSua);
          loiPF = congLocSomBP2_(kb, r);
        }
        var chiLoiTexPF = loiPF.length && loiPF.every(function (x) { return /^TEX_/.test(String(x)); });
        if (loiPF.length && !(chiLoiTexPF && daSuaTexAI) && conDuGoiGemini_()) {
          if (loiPF.some(function (x) { return /^TEX_/.test(String(x)); })) daSuaTexAI = true;
          nhatKy_('CONG_LOC_SOM_BP2', r.id + ': chặn trước khi lưu (' + loiPF.slice(0, 3).join('; ').slice(0, 220) + ') -> tự sửa bằng Gemini');
          var kbPF = null;
          try { kbPF = suaKichBanBangGemini_(kb, loiPF, prompt, sn); } catch (ePfG) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(ePfG.message))) { luuNhapKichBan_(r.id, kb); throw ePfG; } }
          if (kbPF && Array.isArray(kbPF.canh) && kbPF.canh.length) kb = kbPF;
          chuanBiKichBan_(kb, r, ctxSua);
          loiPF = congLocSomBP2_(kb, r);
        }
        if (loiPF.some(function (x) { return /^(?:t2_trong|KHUNG4TANG_3D_RONG|hinh_dung_im)/.test(String(x)); }) && typeof tuCuuTang2_ === 'function') {
          tuCuuTang2_(kb, r, 'CONG_LOC_SOM_BP2_CHOT');
          chuanBiKichBan_(kb, r, ctxSua);
          loiPF = congLocSomBP2_(kb, r);
        }
        if (loiPF.length) {
          var lanLoiPF = Number(r.so_lan_loi) || 0;
          var maxLoiPF = Math.max(2, Number(cauHinh_('MAX_LAN_LOI')) || 3);
          if (lanLoiPF + 1 >= maxLoiPF) throw new Error('KICH_BAN_KHONG_HOP_LE: ' + loiPF[0]);
          luuNhapKichBan_(r.id, kb);
          ghi_(sh, r._row, { so_lan_loi: lanLoiPF + 1, ghi_chu: ('Cổng lọc sớm BP2 (' + (lanLoiPF + 1) + '/' + maxLoiPF + '): ' + loiPF[0]).slice(0, 260) });
          nhatKy_('CONG_LOC_SOM_BP2', r.id + ': lưu nháp sửa lượt sau (' + (lanLoiPF + 1) + '/' + maxLoiPF + '): ' + loiPF.slice(0, 3).join('; ').slice(0, 220));
          continue;
        }
      }
      chuanHoaThoiLuong_(kb);
      kb.id = r.id; kb.lop = r.lop; kb.chu_de = r.chu_de; kb.de_bai = r.de_bai;
      kb.dap_an = r.dap_an; kb.cach_giai = c1;
      kb._phien_ban_edit = PHIEN_BAN_EDIT;
      kb.mon = typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r) ? 'HINH_HOC' : laMonThucTe_(r) ? 'THUC_TE' : 'XAC_SUAT';
      kb.luong = typeof xacDinhLuong_ === 'function' ? xacDinhLuong_(r) : (kb.mon === 'HINH_HOC' ? 'hinh_hoc_thuan' : 'thuc_te_xac_suat');   // khóa luồng: BP3 đọc trường này
      if (kb.luong === 'hinh_hoc_thuan' && typeof khoaLuongHinhHoc_ === 'function') khoaLuongHinhHoc_(kb);   // chốt lần cuối: không còn dấu vết cảnh thật / 3D
      if (r.dap_an_hien) kb.dap_an_hien = String(r.dap_an_hien);
      if (laUuTien_(r)) kb.uu_tien = 1;
      if (spham) kb.san_pham = spham;   // bộ dựng video tự gắn nhãn có sản phẩm do kênh bán
      if (r._series) kb.series = { ten: r._series.ten, tap: 0 };   // số tập đánh lúc đăng (DangVideo.gs)
      if (typeof layPhongCachVideo_ === 'function') { var pcv = layPhongCachVideo_(r); if (pcv) { kb.phong_cach_loi = pcv.loi_id; kb.phong_cach_dan = pcv.dan_id || ''; kb.phong_cach_edit = pcv.edit; } }
      if (typeof ghiCauNoi_ === 'function') ghiCauNoi_(kb);
      if (typeof phanLoaiCauHoi_ === 'function') kb.loai_cau_hoi = phanLoaiCauHoi_(r);   // loại câu hỏi: màu nhãn trên ảnh bìa + danh sách phát
      var oKb = ghiKichBanAnToan_(r.id, JSON.stringify(kb));
      if (oKb === null) { luuNhapKichBan_(r.id, kb); throw new Error('DRIVE_KICH_BAN: chưa lưu được kịch bản'); }
      var aiKtCu = {};
      try { aiKtCu = JSON.parse(String(r.ai_kiem_tra || '{}')) || {}; } catch (eKt) { aiKtCu = {}; }
      aiKtCu.phien_ban = PHIEN_BAN_EDIT;
      ghi_(sh, r._row, { trang_thai: 'CO_KICH_BAN', file_kich_ban: oKb, duyet_kich_ban: '', ghi_chu: '', so_lan_loi: 0, series: kb.series ? kb.series.ten : '', ai_kiem_tra: JSON.stringify(aiKtCu).slice(0, 1800) }, r.id);
      SpreadsheetApp.flush();
      xoaKichBanThayThe_(r.file_kich_ban, oKb);
      xoaNhapKichBan_(r.id);
      nhatKy_('KICH_BAN', r.id + ' -> đã lưu kịch bản');
      if (laUuTien_(r)) baoZaloDe_(r, '🎬 Kịch bản xong (' + kb.canh.length + ' cảnh, khoảng ' + kb.tong_giay + ' giây). Đã vào hàng chờ dựng video.', 'thap');
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
  if (laMonThucTe_(r)) kb.mon = 'THUC_TE';
  if (laVideoDai_(r)) kb.kieu_video = 'DAI_10_PHUT';
  if (cauHinh_('KIEU_MO_DAU') !== 'chao_hook') xoaLoiChao_(kb);
  if (r.dap_an_hien && !kb.dap_an_hien) kb.dap_an_hien = String(r.dap_an_hien);
  if (r._banVe && !kb.ban_ve && !(typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r))) kb.ban_ve = r._banVe;   // có sẵn bản vẽ của đề: cảnh nào mất hết vật thì dùng bản vẽ thay vì để trống
  var sua = typeof tuSuaKichBan_ === 'function' ? tuSuaKichBan_(kb, ctxSua, r) || [] : [];
  if (typeof tuSuaQuyTrinh_ === 'function') sua = sua.concat(tuSuaQuyTrinh_(kb, r.de_bai) || []);
  var laHH = typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r);
  if (laHH) {   // LUỒNG HÌNH HỌC THUẦN: gỡ mọi vật đời sống / 3D trước, rồi gắn tọa độ ĐÚNG từ mã dựng hình đã kiểm chứng
    delete kb.ban_ve;
    if (typeof khoaLuongHinhHoc_ === 'function') sua = sua.concat(khoaLuongHinhHoc_(kb));
    try { var c1H = JSON.parse(String(r.cach_1 || '{}')); if (c1H && c1H.hinh_toa_do) sua = sua.concat(chenToaDoHinh_(kb, c1H.hinh_toa_do)); } catch (eH) {}
  } else {
    if (typeof tuSuaTaiChinh_ === 'function') sua = sua.concat(tuSuaTaiChinh_(kb, r.de_bai) || []);   // bài lãi suất: gỡ hình khối không liên quan
    if (typeof tuSuaVatLa_ === 'function') sua = sua.concat(tuSuaVatLa_(kb, r.de_bai) || []);   // đề hải đăng mà vẽ tòa nhà -> đổi đúng vật, giữ số đo
    if (typeof tuSuaBoCucDe_ === 'function') sua = sua.concat(tuSuaBoCucDe_(kb, r.de_bai) || []);   // đề bàn tròn -> người ngồi quanh bàn tròn
  }
  if (typeof tuSuaDaDangHinh_ === 'function') sua = sua.concat(tuSuaDaDangHinh_(kb, r) || []);    // đa dạng hóa hình minh họa theo từng cảnh
  // câu KÊU GỌI cuối video (dùng chung cho mọi nền tảng: YouTube "đăng ký", TikTok/Facebook "theo dõi"; dải chữ riêng từng nền tảng in lúc đăng)
  var cuoi = kb.canh[kb.canh.length - 1];
  if (cuoi && !/đăng ký|theo dõi|follow|subscribe/i.test(String(cuoi.loi_thoai || ''))) {
    cuoi.loi_thoai = String(cuoi.loi_thoai || '').replace(/\s+$/, '') + ' ' + chonCauKeuGoi_(r);
    sua.push('thêm câu kêu gọi đăng ký / theo dõi cuối video');
  }
  // bản vẽ nhìn từ trên: tường đặt nhầm lên cạnh ngắn (tổng rào không khớp đề) -> tự đổi cạnh dài/ngắn
  if (!laHH && typeof tuSuaSoDoVung_ === 'function') kb.canh.forEach(function (c, i) {
    var vs = c && c.minh_hoa && c.minh_hoa.du_lieu && c.minh_hoa.du_lieu.vat;
    (Array.isArray(vs) ? vs : []).forEach(function (v) { if (v && v.loai === 'canh_that' && tuSuaSoDoVung_(v, r.de_bai)) sua.push('SO_DO_VUNG_CANH_' + (i + 1)); });
  });
  if (!laHH && r._banVe && typeof chenBanVe_ === 'function') { sua = sua.concat(chenBanVe_(kb, r._banVe)); kb.ban_ve = r._banVe; }
  // v91 AUTO-FIX: chuẩn hóa lỗi hình thức (TeX, màu, nhãn thừa, tiêu đề, trường hook, đáp số lộ ở hook) + khung4tang / bo_dung
  if (typeof vaCuPhapTexKb_ === 'function') vaCuPhapTexKb_(kb);
  if (typeof tuSuaHinhThuc_ === 'function') sua = sua.concat(tuSuaHinhThuc_(kb, r) || []);
  if (!laHH && !kb.bo_dung && kb.khung4tang) kb.bo_dung = '3d_vector';   // v99.1: không còn bo_dung = blender
  kb._phien_ban_edit = PHIEN_BAN_EDIT;
  suaDapAn_(kb, r.dap_an);   // sau khi tự sửa (có thể vừa thêm/đổi cảnh) để cảnh đáp án luôn đúng
  if (typeof vaCuPhapTexKb_ === 'function') vaCuPhapTexKb_(kb);
  if (sua.length) nhatKy_('KICH_BAN_TU_SUA', r.id + ': ' + sua.slice(0, 8).join('; ').slice(0, 450));
}

// Bổ sung riêng vật chính trước khi người duyệt đọc kịch bản, dùng cùng kho key với biên kịch.
// v99.1: mô hình Blender (mo_hinh_3d) đã gỡ -> không gọi Gemini dựng vật mở đầu nữa (giữ tên hàm cho nơi gọi cũ).
function boSungBanVeMoDau_(kb, r, sn) { return; }

// Nhờ Gemini sửa ĐÚNG các lỗi còn lại (gửi kèm toàn bộ quy tắc + kịch bản hiện tại), giữ nguyên phần đã đúng.
function schemaKichBan_(soCanh) {
  var chu = {type: 'STRING'}, nguyen = {type: 'INTEGER'}, so = {type: 'NUMBER'}, dungSai = {type: 'BOOLEAN'};
  var jsonHinh = {type: 'STRING', description: 'JSON của mục hình dưới dạng chuỗi.'};
  var mang = function (items, min) {
    return Object.assign({type: 'ARRAY', items: items}, min == null ? {} : {minItems: min});
  };
  var obj = function (properties, required) { return {type: 'OBJECT', properties: properties, required: required || []}; };
  var dsChu = mang(chu);
  var canh = obj({
    so: nguyen, loai: {type: 'STRING', enum: ['mo_dau', 'de_bai', 'mo_hinh_hoa', 'y_do', 'thu_nho', 'bay', 'nhac_lai', 'diem_chot',
      'tinh_toan', 'dap_an', 'kiem_tra', 'thu_lai', 'lien_he_thuc_te', 'bai_hoc', 'ket_luan', 'gia_thiet',
      'dung_hinh', 'chung_minh', 'kiem_chung', 'mo_phong', 'phan_tich', 'giai', 'cta']}, tieu_de_canh: chu, tu_khoa: chu, nhan: chu, giu_san_khau: dungSai,
    giong_doc: chu, loi_thoai: chu, noi_dung_man_hinh: dsChu, moc_loi: dsChu, trinh_bay: {type: 'STRING', enum: ['cong_don', 'bien_doi', 'xep']},
    chu_thich: dsChu, chuyen_canh: chu, goc_nhin: dsChu, kien_thuc: chu, nhan_manh_hinh: dsChu, tach: dsChu, thoi_luong_giay: so,
    buoc_ve: mang(obj({ve: chu, khi_noi: chu}, ['ve', 'khi_noi'])),
    minh_hoa: obj({loai: chu, mo_ta: chu, du_lieu: jsonHinh}, ['loai']),
    net_toan: jsonHinh, mo_hinh_3d: jsonHinh
  }, ['loai', 'tieu_de_canh', 'loi_thoai', 'noi_dung_man_hinh', 'minh_hoa']);
  var dsCanh = mang(canh, soCanh || 1);
  if (soCanh) {
    dsCanh.maxItems = soCanh;
    return obj({canh: dsCanh}, ['canh']);
  }
  var the = obj({loai: chu, nhan: chu, dong: dsChu, khi_noi: chu, khi_noi_dong: dsChu,
    phim: dsChu, ket_qua: chu, ham: chu, bien: chu, moc_x: dsChu, dau: dsChu, gia_tri: dsChu, noi_dung: chu, chot: dungSai},
    ['loai', 'khi_noi']);
  var buoc = obj({canh: nguyen, khi_noi: chu, nhan: chu, tieu_de: chu, mau: chu, du_kien: dsChu,
    the: mang(the, 1), doi_chieu: jsonHinh,
    hanh_dong: obj({pha: chu, do: nguyen, nhanh: nguyen}, ['pha'])}, ['khi_noi', 'tieu_de', 'the']);
  var tomTat = mang(obj({chien_thuat: chu, cong_thuc: chu}, ['chien_thuat', 'cong_thuc']), 3);
  tomTat.maxItems = 3;
  return obj({
    tieu_de: chu, chu_de_ngan: chu, dap_an_cuoi: chu, dap_an_hien: chu, canh: dsCanh,
    hook: chu, hook_chu: chu, hook_kieu: chu, hook_ung_vien: dsChu, tieu_de_bia: chu, nhan_manh: dsChu,
    y_tuong_chinh: chu, de_cho: dsChu, can_tim: chu, du_kien: dsChu, hashtag: dsChu,
    bai_hoc_rut_ra: dsChu, video_tiep_theo: chu, binh_luan_ghim: chu,
    nhan_thi: chu, tieu_de_intro: chu, phu_de_intro: chu, cau_hook: chu, cta: chu,
    tom_tat_3_buoc: tomTat,
    cau_chuyen: obj({nguoi_ke: chu, dia_diem: chu, muc_tieu: chu, phong_canh: jsonHinh}),
    khung4tang: obj({phu_de: chu, theme: chu, de_ghim: mang(obj({id: chu, nhan: chu, mau: chu}, ['id', 'nhan'])),
      buoc: mang(buoc, 1), san_khau: jsonHinh, canh_3d_vector: jsonHinh,
      tu_sinh: obj({ma: chu, mo_ta: chu}, ['ma'])}, ['buoc']),
    hinh_phang_chuan: jsonHinh, hinh_khong_gian: jsonHinh
  }, ['tieu_de', 'dap_an_cuoi', 'hook', 'bai_hoc_rut_ra', 'binh_luan_ghim', 'canh']);
}

// Các bộ dựng nhận đối tượng/mảng. Giữ tương thích với JSON thường ở lượt fallback.
function bungMucHinhJson_(o, khoa) {
  if (!o) return;
  khoa.forEach(function (k) {
    if (typeof o[k] !== 'string') return;
    try {
      var v = JSON.parse(o[k]);
      if (v && typeof v === 'object') { o[k] = v; return; }
    } catch (e) { /* Bộ kiểm hình sẽ yêu cầu sửa nếu mục này cần thiết. */ }
    delete o[k];
  });
}

function goiKichBanCoSchema_(prompt, nhiet, opts, schema) {
  var kb = goiGemini_(prompt + '\nTrả một đối tượng JSON. Các mục hình gồm hinh_phang_chuan, hinh_khong_gian, phong_canh, san_khau, canh_3d_vector, doi_chieu, net_toan, mo_hinh_3d và minh_hoa.du_lieu giữ cấu trúc đã mô tả. Nếu schema yêu cầu chuỗi ở các mục này, ghi nội dung mục dưới dạng chuỗi JSON.', nhiet,
    Object.assign({}, opts || {}, {schema: schema}));
  if (!kb) return kb;
  bungMucHinhJson_(kb, ['hinh_phang_chuan', 'hinh_khong_gian']);
  bungMucHinhJson_(kb.cau_chuyen, ['phong_canh']);
  bungMucHinhJson_(kb.khung4tang, ['san_khau', 'canh_3d_vector']);
  if (kb.khung4tang && Array.isArray(kb.khung4tang.buoc)) kb.khung4tang.buoc.forEach(function (b) { bungMucHinhJson_(b, ['doi_chieu']); });
  if (Array.isArray(kb.canh)) kb.canh.forEach(function (c) {
    bungMucHinhJson_(c, ['net_toan', 'mo_hinh_3d']);
    bungMucHinhJson_(c && c.minh_hoa, ['du_lieu']);
  });
  return kb;
}

function suaKichBanBangGemini_(kb, dsLoi, prompt, sn) {
  if (kb.kieu_video === 'DAI_10_PHUT') prompt += '\nĐây là chuyên đề 540–660 giây. Giữ đủ các chương; quy định thời lượng và số cảnh video ngắn ở trên chỉ dùng cho bài ngắn.';
  var p = prompt + '\n\n=== NHIỆM VỤ BÂY GIỜ: SỬA KỊCH BẢN, KHÔNG VIẾT LẠI TỪ ĐẦU ===\n' +
    'Dưới đây là kịch bản bạn đã viết (máy đã tự sửa các lỗi vặt). Còn các lỗi sau, hãy sửa TẤT CẢ trong một lần:\n' +
    dsLoi.map(function (x, i) { return (i + 1) + '. ' + moTaLoiKichBan_(x); }).join('\n') +
    '\nYÊU CẦU: giữ nguyên mọi phần không liên quan tới lỗi (lời thoại, số liệu, đáp án, hình đã đúng); chỉ sửa đúng chỗ lỗi; tuân thủ mọi quy tắc ở trên ' +
    '(đặc biệt: hình phải khớp đề, đáp án đúng, lời thoại không có ký hiệu LaTeX). Trả về TOÀN BỘ kịch bản JSON sau khi sửa, cùng định dạng.\n' +
    'KỊCH BẢN HIỆN TẠI:\n' + JSON.stringify(kb);
  var daSua = goiKichBanCoSchema_(p, 0.3, sn, schemaKichBan_());
  return daSua && Array.isArray(daSua.canh) ? Object.assign({}, kb, daSua) : daSua;
}

// Bản nháp kịch bản đang sửa dở (Drive, thư mục kịch bản): lần chạy sau sửa tiếp thay vì viết lại.
function tepNhap_(id) { var it = thuMucKichBan_().getFilesByName('nhap_' + id + '.json'); return it.hasNext() ? it.next() : null; }
function luuNhapKichBan_(id, kb) {
  try { var f = tepNhap_(id); var noi = JSON.stringify(kb); if (f) f.setContent(noi); else thuMucKichBan_().createFile('nhap_' + id + '.json', noi, MimeType.PLAIN_TEXT); }
  catch (e) { nhatKy_('NHAP', 'Không lưu được bản nháp ' + id + ': ' + e.message); return false; }
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

// v98.2 MODEL ĐỘNG: KHÔNG phụ thuộc danh sách model cố định.
//  ListModels (CacheService 6 giờ) -> lọc model văn bản -> bỏ trùng snapshot -> xếp hạng theo số phiên bản + chế độ gọi:
//  'nang' (giải toán, kịch bản, Lego): pro mới nhất -> flash mới nhất -> pro-latest -> flash-latest -> flash-lite
//  'nhe'  (kiểm duyệt, sửa nhanh)     : flash mới nhất -> flash-latest -> flash-lite -> pro
//  Bản Node tương đương: scripts/bophan1/model_gemini.cjs (test so khớp: scripts/test_model_gemini.cjs).
// Danh sách dự phòng khi ListModels lỗi mạng / bị chặn (đã bỏ 2.0-flash, 2.5-flash, 2.5-pro):
var MODEL_CHUAN_DU_PHONG_ = ['gemini-3.1-pro', 'gemini-3.0-flash', 'gemini-pro-latest', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
var MODEL_LOAI_BO_RE_ = /embedding|imagen|veo|tts|audio|aqa|bisheng|robotics|computer-use|learnlm|gemma|image|live|vision/i;
var MODEL_DUOI_SNAP_RE_ = /-(\d{3}|exp(-[\w.-]*)?|preview(-[\w.-]*)?|\d{2}-\d{2}(-\d{2,4})?|\d{4}(-\d{2}){0,2})$/i;

function tenModelGon_(m) { return String((m && m.name) || m || '').trim().replace(/^models\//, ''); }

// Phản hồi ListModels [{name, supportedGenerationMethods}] -> [tên] model văn bản gọi được generateContent
function locModelGemini_(dsTho) {
  var ra = [];
  (dsTho || []).forEach(function (m) {
    var ten = tenModelGon_(m), ph = (m && m.supportedGenerationMethods) || [];
    if (!/^gemini-/i.test(ten) || ph.indexOf('generateContent') < 0 || MODEL_LOAI_BO_RE_.test(ten)) return;
    if (ra.indexOf(ten) < 0) ra.push(ten);
  });
  return ra;
}

function phanTichModel_(ten) {
  var t = String(ten).toLowerCase();
  var mb = /^gemini-(\d+)(?:\.(\d+))?-/.exec(t);
  var hang = /flash-lite|lite/.test(t) ? 'lite' : /flash/.test(t) ? 'flash' : /pro/.test(t) ? 'pro' : 'khac';
  var goc = t, snap = 0;
  for (var i = 0; i < 4 && MODEL_DUOI_SNAP_RE_.test(goc); i++) {
    var d = MODEL_DUOI_SNAP_RE_.exec(goc)[0];
    snap = Math.max(snap, /preview/.test(d) && !/\d/.test(d) ? 1 : 2);   // 0 ổn định | 1 preview trơn | 2 có ngày / -001 / -exp
    goc = goc.slice(0, -d.length);
  }
  return { ten: ten, ban: mb ? [Number(mb[1]), Number(mb[2] || 0)] : null, hang: hang, latest: /latest/.test(t), goc: goc, snap: snap };
}
function soBanModel_(a, b) { return (b[0] - a[0]) || (b[1] - a[1]); }

// Mỗi gốc (vd gemini-2.5-flash) giữ MỘT bản: ổn định > preview trơn > snapshot có ngày
function boTrungSnapshot_(ds) {
  var tot = {};
  ds.forEach(function (ten) {
    var p = phanTichModel_(ten), cu = tot[p.goc];
    if (!cu || p.snap < cu.snap || (p.snap === cu.snap && p.ten > cu.ten)) tot[p.goc] = p;
  });
  return ds.filter(function (ten) { return Object.keys(tot).some(function (g) { return tot[g].ten === ten; }); });
}

function xepHangModel_(ds, cheDo) {
  var nhe = cheDo === 'nhe', sach = [];
  (ds || []).forEach(function (m) { m = tenModelGon_(m); if (m && sach.indexOf(m) < 0) sach.push(m); });
  var ps = boTrungSnapshot_(sach).map(phanTichModel_);
  var coBan = function (h) {
    return ps.filter(function (p) { return p.hang === h && p.ban && !p.latest; })
      .sort(function (a, b) { return soBanModel_(a.ban, b.ban) || a.snap - b.snap; });
  };
  var biDanh = function (h) { return ps.filter(function (p) { return p.hang === h && p.latest; }); };
  var pro = coBan('pro'), flash = coBan('flash'), lite = coBan('lite'), dau = [];
  var them = function (p) { if (p && dau.indexOf(p) < 0) dau.push(p); };
  var moiNhat = [pro[0], flash[0]].filter(Boolean);
  if (moiNhat.length === 2) {
    var s = soBanModel_(pro[0].ban, flash[0].ban);
    moiNhat = s < 0 || (s === 0 && !nhe) ? [pro[0], flash[0]] : [flash[0], pro[0]];
  }
  if (nhe) {
    them(flash[0]); biDanh('flash').forEach(them); them(lite[0]); biDanh('lite').forEach(them);
    them(pro[0]); biDanh('pro').forEach(them);
  } else {
    moiNhat.forEach(them); biDanh('pro').forEach(them); biDanh('flash').forEach(them);
    them(lite[0]); biDanh('lite').forEach(them);
  }
  var thuTu = nhe ? { flash: 0, lite: 1, pro: 2, khac: 3 } : { pro: 0, flash: 1, lite: 2, khac: 3 };
  var conLai = ps.filter(function (p) { return dau.indexOf(p) < 0; }).sort(function (a, b) {
    return (a.ban && b.ban ? soBanModel_(a.ban, b.ban) : (a.ban ? -1 : b.ban ? 1 : 0)) || (thuTu[a.hang] - thuTu[b.hang]) || a.snap - b.snap || (a.ten < b.ten ? -1 : 1);
  });
  return dau.concat(conLai).map(function (p) { return p.ten; });
}

// "... Please update your code to use models/<ten_model> ..." -> <ten_model>
function goiYModel404_(raw) {
  var m = /(?:update your code to use|use|migrate to|switch to)\s+(?:the\s+)?(?:model\s+)?[`'"]?models\/(gemini-[\w.-]*\w)[`'".,;)\s]/i.exec(String(raw || '') + ' ');
  return m ? m[1] : '';
}

// Danh sách model sống (đã lọc, xếp 'nang'), cache 6 giờ. Trên GitHub chay_bp1.js nạp sẵn DS_MODEL_SONG / DS_MODEL_SONG_LOI.
// lamMoi = true: bỏ qua cache để dò lại (không xóa danh sách cũ nếu dò lỗi).
function layModelSong_(lamMoi) {
  var cache = CacheService.getScriptCache();
  if (!lamMoi) {
    try { var c = JSON.parse(cache.get('DS_MODEL_SONG') || '[]'); if (c && c.length) return c; } catch (e0) {}
    if (cache.get('DS_MODEL_SONG_LOI')) return [];
  }
  var keys = typeof khoDanhSachKey_ === 'function' ? khoDanhSachKey_() : [];
  if (!keys.length || typeof UrlFetchApp === 'undefined') return [];
  for (var i = 0; i < Math.min(keys.length, 3); i++) {
    try {
      var tho = [], token = '', trang = 0, hong = false;
      do {
        var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100' + (token ? '&pageToken=' + encodeURIComponent(token) : ''),
          { headers: { 'x-goog-api-key': keys[i] }, muteHttpExceptions: true });
        if (res.getResponseCode() !== 200) { hong = true; break; }
        var j = JSON.parse(res.getContentText());
        tho = tho.concat(j.models || []);
        token = j.nextPageToken || '';
      } while (token && ++trang < 5);
      if (hong) continue;
      var ds = xepHangModel_(locModelGemini_(tho), 'nang');
      if (ds.length) {
        cache.put('DS_MODEL_SONG', JSON.stringify(ds), 21600);
        cache.remove('DS_MODEL_SONG_LOI');
        nhatKy_('GEMINI_MODEL', 'ListModels: ' + ds.length + ' model sống, ưu tiên ' + ds.slice(0, 5).join(', '));
        return ds;
      }
    } catch (e) { /* key kế */ }
  }
  if (!lamMoi) cache.put('DS_MODEL_SONG_LOI', '1', 600);   // lỗi mạng / bị chặn: 10 phút dùng danh sách dự phòng
  return [];
}

// v99.3: 404 = model không tồn tại -> KhoKey.gs khoGhi404_ nhớ MODEL 6 giờ trong CacheService (không đụng tới key); ở đây chỉ đọc.
function model404HomNay_(m) {
  return typeof kho404Model_ === 'function' && kho404Model_(m);
}
// v99.3: model đọc ảnh (DOC_DE): bỏ model không nhận ảnh / thử nghiệm; bản ổn định (không preview/exp) xếp trước
function modelDocAnh_(ds) {
  var ok = ds.filter(function (m) {
    return !/exp|tts|audio|embed|imagen|veo|gemma|aqa|learnlm|live|robotics|computer-use|image-generation|thinking/i.test(m) && !model404HomNay_(m) && !CacheService.getScriptCache().get('MODEL_HONG_' + m);
  });
  if (!ok.length) return ds;
  var onDinh = ok.filter(function (m) { return !/preview/i.test(m); }), thu = ok.filter(function (m) { return /preview/i.test(m); });
  return onDinh.concat(thu);
}

// Model còn dùng được: chưa 404 (6 giờ / trong ngày) và có trong danh sách sống (nếu biết)
function modelConSong_(m) {
  m = tenModelGon_(m);
  if (!m) return false;
  if (CacheService.getScriptCache().get('MODEL_HONG_' + m) || model404HomNay_(m) || modelBiChan403_(m)) return false;
  var song = layModelSong_();
  return !song.length || song.indexOf(m) >= 0;
}

// Danh sách model động theo chế độ ('nang' mặc định | 'nhe'). Biết danh sách sống -> chỉ dùng model sống (tên cũ trong
// CAU_HINH bị bỏ qua). Không biết -> CAU_HINH + dự phòng sạch, xếp hạng như nhau. Loại model 404, đưa model vừa chạy tốt
// (MODEL_TOT_NHAT_<cheDo>) lên đầu, đẩy model hết hạn mức ngày / quá tải 503 xuống cuối.
function danhSachModel_(cheDo) {
  cheDo = cheDo === 'nhe' ? 'nhe' : 'nang';
  var cache = CacheService.getScriptCache();
  var song = layModelSong_(), ds;
  if (song.length) ds = xepHangModel_(song, cheDo);
  else {
    var cauHinhDs = [];
    String(cauHinh_('DANH_SACH_MODEL') || '').split(/[,;\s|]+/).concat(
      ['MODEL_CHINH', 'MODEL_DU_PHONG', 'MODEL_DU_PHONG_2', 'MODEL_DU_PHONG_3'].map(function (k) { return String(cauHinh_(k) || ''); }))
      .forEach(function (m) { m = m.trim(); if (/^gemini-/i.test(m) && cauHinhDs.indexOf(m) < 0) cauHinhDs.push(m); });
    ds = xepHangModel_(cauHinhDs.concat(MODEL_CHUAN_DU_PHONG_), cheDo);
  }
  var hopLe = ds.filter(function (m) { return !cache.get('MODEL_HONG_' + m) && !model404HomNay_(m) && !modelBiChan403_(m); });
  if (!hopLe.length) hopLe = ds.slice();
  var totNhat = cache.get('MODEL_TOT_NHAT_' + cheDo);
  if (totNhat && hopLe.indexOf(totNhat) > 0 && !cache.get('QUA_TAI_' + totNhat) && !cache.get('HET_NGAY_MODEL_' + totNhat)) {
    hopLe = [totNhat].concat(hopLe.filter(function (m) { return m !== totNhat; }));
  }
  var khoe = hopLe.filter(function (m) { return !cache.get('QUA_TAI_' + m) && !cache.get('HET_NGAY_MODEL_' + m); });
  var tai = hopLe.filter(function (m) { return cache.get('QUA_TAI_' + m) && !cache.get('HET_NGAY_MODEL_' + m); });
  var het = hopLe.filter(function (m) { return cache.get('HET_NGAY_MODEL_' + m); });
  return khoe.concat(tai, het);
}

// Mọi model trong chuỗi đều 404: dò lại ListModels ngay (bỏ cache, tối đa 1 lần/giờ) rồi xếp theo chế độ
function tuTimModelGemini_(cheDo) {
  var cache = CacheService.getScriptCache();
  if (cache.get('DA_DO_MODEL_API')) return [];
  cache.put('DA_DO_MODEL_API', '1', 3600);
  return xepHangModel_(layModelSong_(true), cheDo);
}

function laQuaTai_(kq) {
  return kq.code === 503 || kq.code === 529 || /UNAVAILABLE|overloaded|high demand|try again later/i.test(String(kq.raw || ''));
}
function laModelKhongCo_(kq) {
  return kq.code === 404 || (kq.code === 400 && /not found|not supported for generateContent|model .* does not exist|invalid model/i.test(String(kq.raw || '')));
}

// opts.suyNghi: mức suy nghĩ ('low' | 'high' | 'mac_dinh' | 'tat'). Gọi có hạn chót: không đủ thời gian thì ném 'HET_GIO'.
// Tự động chuyển sang model kế tiếp ngay lập tức khi gặp bất kỳ lỗi nào (404, 400, 429, 503, JSON hỏng...).
// v98.2: MODEL_BIEN_KICH trống / đã khai tử -> model 'nang' xếp hạng cao nhất đang sống
function tuyChonBienKich_() {
  var m = String(cauHinh_('MODEL_BIEN_KICH') || '').trim();
  if (!m || !modelConSong_(m)) m = danhSachModel_('nang')[0] || '';
  return { modelUuTien: m, suyNghi: cauHinh_('SUY_NGHI_BIEN_KICH') || 'high', cheDo: 'nang' };
}

// opts.cheDo: 'nang' (mặc định: giải toán, kịch bản, Lego) | 'nhe' (kiểm duyệt, sửa nhanh) -> thứ tự model xếp hạng tự động
function loiGeminiSchema_(kq) {
  return kq && !kq.ok && !kq.schemaDaThuLai && kq.code === 400 && /schema|structured[- ]output/i.test(String(kq.raw));
}

function ghiGeminiKhongSchema_(cache, model, raw) {
  // Chỉ nhớ model thực sự không hỗ trợ. Một schema phức tạp không loại các schema khác.
  if (/unknown (?:field|name).*response[_ ]?schema|(?:response[_ ]?schema|structured output)s? (?:is |are )?(?:not supported|unsupported)|(?:not supported|unsupported) (?:response[_ ]?schema|structured output)/i.test(String(raw))) {
    cache.put('KHONG_SCHEMA_' + model, '1', 21600);
  }
  nhatKy_('GEMINI', model + ' từ chối responseSchema -> gọi lại ở chế độ JSON');
}

function goiGemini_(prompt, nhiet, opts) {
  opts = opts || {};
  if (!khoDanhSachKey_().length) throw new Error('THIEU_GEMINI_API_KEY');
  var cheDo = opts.cheDo === 'nhe' ? 'nhe' : 'nang';
  var models = danhSachModel_(cheDo);
  var cache = CacheService.getScriptCache();
  if (opts.anh || opts.anhs) models = modelDocAnh_(models);   // v99.3: đọc ảnh chỉ dùng model còn sống + hỗ trợ ảnh ổn định
  if (opts.modelUuTien && modelConSong_(opts.modelUuTien) &&
      !cache.get('QUA_TAI_' + opts.modelUuTien) && !cache.get('HET_NGAY_MODEL_' + opts.modelUuTien)) {
    models = [opts.modelUuTien].concat(models.filter(function (md) { return md !== opts.modelUuTien; }));
  }
  var hetHanMuc = false, lyDo = '', soLoi = 0, soQuaTai = 0, daDoThem = false;
  for (var lan = 0; lan < 3; lan++) {
    var coTheThuLai = false;
    for (var m = 0; m < models.length; m++) {
      var tenModel = models[m];
      if (cache.get('MODEL_HONG_' + tenModel) || modelBiChan403_(tenModel)) continue;   // v99.2b: model 403 đã chặn 12 giờ
      if (opts.hanChotMs && Date.now() > opts.hanChotMs) throw new Error('HET_GIO');   // trần thời gian riêng của nơi gọi (DOC_DE < 4 phút)
      if (!conDuGoiGemini_()) throw new Error(soQuaTai && soQuaTai === soLoi ? 'QUA_TAI' : 'HET_GIO');
      var dsAnh = opts.anhs || (opts.anh ? [opts.anh] : []);
      var phan = dsAnh.map(function (a) { return { inline_data: { mime_type: a.mime, data: a.data } }; }).concat([{ text: prompt }]);
      // responseSchema bị từ chối -> thử lại cùng model với JSON MIME.
      var gcG = { temperature: nhiet, responseMimeType: 'application/json' };
      var coSchema = !!opts.schema && !cache.get('KHONG_SCHEMA_' + tenModel);
      if (coSchema) gcG.responseSchema = opts.schema;
      var kq = khoGoiCoSuyNghi_(tenModel, { contents: [{ parts: phan }], generationConfig: gcG }, opts.suyNghi, { hanChoMs: 20000, tungModel: !!opts.modelUuTien, cheDo: cheDo });
      if (coSchema && loiGeminiSchema_(kq)) {
        ghiGeminiKhongSchema_(cache, tenModel, kq.raw);
        kq = khoGoiCoSuyNghi_(tenModel, { contents: [{ parts: phan }], generationConfig: { temperature: nhiet, responseMimeType: 'application/json' } }, opts.suyNghi, { hanChoMs: 20000, tungModel: !!opts.modelUuTien, cheDo: cheDo });
      }
      if (kq.ok) {
        try {
          var parsed = docKetQua_(kq.raw);
          cache.put('MODEL_TOT_NHAT_' + cheDo, tenModel, 1800);
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
      if (la403TuChoi_(kq.code, kq.raw)) {   // v99.2b: model từ chối quyền -> chặn 12 giờ, mọi lượt sau bỏ qua ngay
        if (chanModel403_(tenModel)) nhatKy_('GEMINI_CHAN_MODEL', tenModel + ' trả HTTP 403 (MODEL_TU_CHOI) -> chặn ' + GIO_CHAN_MODEL_403_ + ' giờ');
        continue;
      }
      if (laModelKhongCo_(kq)) {
        cache.put('MODEL_HONG_' + tenModel, '1', 21600);
        // v98.2: Google gợi ý 'Please update your code to use models/<ten>' -> chèn <ten> ngay sau model vừa lỗi
        var gy = goiYModel404_(kq.raw);
        if (gy && gy !== tenModel && models.slice(0, m + 1).indexOf(gy) < 0 && !cache.get('MODEL_HONG_' + gy) && !model404HomNay_(gy) && !cache.get('HET_NGAY_MODEL_' + gy)) {
          models = models.slice(0, m + 1).concat([gy], models.slice(m + 1).filter(function (x) { return x !== gy; }));
          nhatKy_('GEMINI_MODEL', 'Google gợi ý ' + gy + ' thay cho ' + tenModel + ' -> thử ngay');
        }
        if (!daDoThem && m === models.length - 1) {
          daDoThem = true;
          tuTimModelGemini_(cheDo).forEach(function (nm) { if (models.indexOf(nm) < 0) models.push(nm); });
        }
        continue;
      }
      if (laQuaTai_(kq)) { soQuaTai++; cache.put('QUA_TAI_' + tenModel, '1', 600); coTheThuLai = true; continue; }
      if (kq.het) { hetHanMuc = true; cache.put('HET_NGAY_MODEL_' + tenModel, '1', 7200); continue; }
      if (kq.code === 429 || kq.code >= 500 || kq.code === 0) { coTheThuLai = true; continue; }
    }
    if (!coTheThuLai) break;
    var cho = lan === 0 ? 6000 : 15000;
    if (!duThoiGian_(_bat_dau_chay_, uocGoiMs_() + cho)) break;
    Utilities.sleep(cho);
  }
  if (opts.modelUuTien && THOI_GIAN_TOI_DA_MS > 600000 && /HTTP (401|403|404|429)/.test(lyDo)) throw new Error('KHO_GITHUB_KHONG_KHA_DUNG');
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
  if (/gemini-2\.5/.test(md)) return { thinkingBudget: muc === 'high' ? 8192 : (muc === 'medium' ? 2048 : (/pro/.test(md) ? 128 : 0)) };
  if (/gemini-(3|[4-9])|latest/.test(md)) return { thinkingLevel: muc === 'high' ? 'high' : (muc === 'medium' && !/pro/.test(md) ? 'medium' : 'low') };
  return null;
}
function khoGoiCoSuyNghi_(model, body, muc, tuyChon) {
  var ts = thamSoSuyNghi_(model, muc);
  if (ts) body.generationConfig = Object.assign({}, body.generationConfig || {}, { thinkingConfig: ts });
  var kq = khoGoi_('VIDEO', model, body, tuyChon);
  if (ts && !loiGeminiSchema_(kq) && !kq.ok && kq.code === 400 && /thinking|generationConfig|Invalid JSON payload/i.test(String(kq.raw))) {
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
  var models = danhSachModel_('nang');
  var modelChon = models[0] || MODEL_CHUAN_DU_PHONG_[0];
  var ts = thamSoSuyNghi_(modelChon, muc);
  var cache = CacheService.getScriptCache();
  var bodies = ds.map(function (d) {
    var gc = { temperature: d.nhiet, responseMimeType: 'application/json' };
    if (ts) gc.thinkingConfig = ts;
    if (d.schema && !cache.get('KHONG_SCHEMA_' + modelChon)) gc.responseSchema = d.schema;
    return { contents: [{ parts: [{ text: d.prompt }] }], generationConfig: gc };
  });
  var tBat = Date.now();
  var kq = khoGoiSong_('VIDEO', modelChon, bodies);
  var tSong = Math.round((Date.now() - tBat) / 1000);
  var goiLai = 0;
  var ketQua = kq.map(function (r, i) {
    var gc = bodies[i].generationConfig;
    if (gc.responseSchema && loiGeminiSchema_(r)) {
      ghiGeminiKhongSchema_(cache, modelChon, r.raw);
      delete gc.responseSchema;
      r = khoGoiCoSuyNghi_(modelChon, bodies[i], muc, {tungModel: true, cheDo: 'nang'});
    }
    if (r && r.ok) {
      try {
        var parsed = docKetQua_(r.raw);
        cache.put('MODEL_TOT_NHAT_nang', r.model || modelChon, 1800);
        return parsed;
      } catch (e) { /* rơi xuống gọi lại bằng chuỗi model dự phòng */ }
    } else if (r && la403TuChoi_(r.code, r.raw)) {
      chanModel403_(r.model || modelChon);
    } else if (r && laModelKhongCo_(r)) {
      cache.put('MODEL_HONG_' + modelChon, '1', 21600);
    } else if (r && laQuaTai_(r)) {
      cache.put('QUA_TAI_' + modelChon, '1', 600);
    }
    goiLai++;
    return goiGemini_(ds[i].prompt, ds[i].nhiet, { suyNghi: muc, schema: ds[i].schema });
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

  // 1) Rà soát các video đang chờ / có sẵn trong HANG_DOI (CO_VIDEO, CO_KICH_BAN, LOI) chưa lên phiên bản mới (bỏ qua video đã duyệt xong)
  for (var i = 0; i < hang.length && daSuaSheet < toiDa; i++) {
    var r = hang[i];
    if (!r || !r.id || daNangCapEditMoi_(r)) continue;
    if (r.tu_sua_cho || videoChoLuuTruLoi_(r)) continue;
    if (!quetSauDrive && (baiCuBoNao_(r) || r.duyet === 'CHO_AI')) continue;
    if (String(r.duyet || '') === 'DA_DUYET' || r.duyet === 'AI_XEM') continue;
    var tt = String(r.trang_thai || '');
    if (['CO_VIDEO', 'CO_KICH_BAN', 'LOI'].indexOf(tt) < 0) continue;
    if (!String(r.de_bai || '').trim() && !r.file_kich_ban) continue;
    // Kiểm tra xem kịch bản trên Drive đã có _phien_ban_edit >= PHIEN_BAN_EDIT chưa
    var kbCu = null;
    if (r.file_kich_ban) {
      try { kbCu = JSON.parse(docKichBanAnToan_(r.file_kich_ban)); } catch (eKb) { kbCu = null; }
    }
    if (kbCu && Number(kbCu._phien_ban_edit) >= PHIEN_BAN_EDIT && tt !== 'LOI') {
      var kt0 = {};
      try { kt0 = JSON.parse(String(r.ai_kiem_tra || '{}')) || {}; } catch (e0) {}
      kt0.phien_ban = PHIEN_BAN_EDIT;
      ghi_(sh, r._row, { ai_kiem_tra: JSON.stringify(kt0).slice(0, 1800) }, r.id);
      continue;
    }
    // Chuyển ảnh kiểm tra và ảnh bìa cũ vào thùng rác trước khi dựng lại.
    [r.anh_kt, r.anh_bia].forEach(function (fid) {
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
    }, r.id);
    nhatKy_('NANG_CAP_VIDEO_CU', r.id + ' (' + tt + ') -> đưa về ' + (coGiai ? 'DA_GIAI' : 'MOI') + ' để sửa cách edit sang bản v' + PHIEN_BAN_EDIT);
    daSuaSheet++;
  }

  // 2) Dò trong Google Drive (thư mục kich_ban, video, THU_MUC_GOC - không quét da_xong để tránh khôi phục video đã đăng) tìm các kịch bản/video cũ
  if (daSuaSheet < toiDa || quetSauDrive) {
    try {
      var p = PropertiesService.getScriptProperties();
      var daQuet = {};
      try { daQuet = JSON.parse(p.getProperty('DA_NANG_CAP_DRIVE_V' + PHIEN_BAN_EDIT) || '{}') || {}; } catch (eQ) { daQuet = {}; }
      var daLuuTru = docMaBamLuuTru_();
      var idLuuTru = {};
      try {
        var ltSh = luuTruSheet_();
        if (ltSh && ltSh.getLastRow() >= 2) {
          ltSh.getRange(2, 2, ltSh.getLastRow() - 1, 1).getValues().forEach(function (v) { if (v[0]) idLuuTru[String(v[0])] = true; });
        }
      } catch (eLT) {}
      var tmKb = thuMucKichBan_();
      var goc = tmKb.getParents().hasNext() ? tmKb.getParents().next() : tmKb;
      var dsThuMuc = [tmKb];
      ['video'].forEach(function (tenTM) {
        var itF = goc.getFoldersByName(tenTM);
        if (itF.hasNext()) dsThuMuc.push(itF.next());
      });
      dsThuMuc.push(goc);

      for (var t = 0; t < dsThuMuc.length && (daSuaSheet + daKhoiPhucDrive) < toiDa; t++) {
        var it = dsThuMuc[t].getFiles();
        var demF = 0;
        while (it.hasNext() && (daSuaSheet + daKhoiPhucDrive) < toiDa && demF < 150) {
          var f = it.next(); demF++;
          var ten = String(f.getName() || '');
          if (!/\.json$/i.test(ten) || /^nhap_|^tiktok|_payload\.json$/i.test(ten)) continue;
          var idDe = ten.replace(/\.json$/i, '');
          if (!/^[A-Za-z]{2}\d{6}-\d{6}(?:-(?:\d+|10P))?$/.test(idDe)) continue;
          if (idTrongSheet[idDe] || daQuet[idDe] || idLuuTru[idDe]) continue;
          daQuet[idDe] = 1;
          var kb = null;
          try { kb = JSON.parse(f.getBlob().getDataAsString()); } catch (eJ) { kb = null; }
          if (!kb || !kb.de_bai || Number(kb._phien_ban_edit) >= PHIEN_BAN_EDIT) continue;
          var mbDrive = bam_(kb.de_bai);
          if (daLuuTru[mbDrive]) continue;
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
            ma_bam: mbDrive,
            san_pham: kb.san_pham ? JSON.stringify(kb.san_pham) : '',
            ai_kiem_tra: JSON.stringify({ phien_ban: PHIEN_BAN_EDIT, khoi_phuc_drive: true })
          });
          idTrongSheet[idDe] = true;
          nhatKy_('KHOI_PHUC_VIDEO_CU', idDe + ' -> đưa từ Drive vào HANG_DOI để dựng lại theo bản mới v' + PHIEN_BAN_EDIT);
          daKhoiPhucDrive++;
        }
      }
      var keysQ = Object.keys(daQuet);
      if (keysQ.length > 150) {
        var gonQ = {};
        keysQ.slice(-150).forEach(function (k) { gonQ[k] = 1; });
        daQuet = gonQ;
      }
      p.setProperty('DA_NANG_CAP_DRIVE_V' + PHIEN_BAN_EDIT, JSON.stringify(daQuet));
    } catch (eDr) { nhatKy_('QUET_DRIVE_LOI', eDr.message); }
  }
  return { sheet: daSuaSheet, drive: daKhoiPhucDrive };
}

/* ===================== BỘ PHẬN 1 TRÊN GITHUB (TÁCH 2 LUỒNG ĐỘC LẬP: 1A GIẢI ĐỀ & 1B XÂY KỊCH BẢN) ===================== */
// BP1 và BP2 dùng chung gói đề. BoNaoDieuPhoi chọn workflow, giới hạn run và nhịp bàn giao.
function giaiTrenGitHub_() { return String(cauHinh_('GIAI_TREN_GITHUB') || 'BAT').toUpperCase() !== 'TAT'; }

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
function goiDeChoGitHub_(r, viec) {
  var hang = {};
  COT.forEach(function (k) { var v = r[k]; hang[k] = v instanceof Date ? v.toISOString() : (v === undefined || v === null ? '' : v); });
  // BP1/BP2 nhận bản nháp riêng. Các ô lưu kịch bản và duyệt dựng chỉ dùng tại Sheet.
  delete hang.file_kich_ban;
  delete hang.duyet_kich_ban;
  delete hang.tu_sua_cho;
  delete hang.mp4_cho_xoa;
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
  if (!ch.SO_LAN_SUA_KICH_BAN) ch.SO_LAN_SUA_KICH_BAN = '2';
  if (!ch.MAX_LAN_LOI || Number(ch.MAX_LAN_LOI) < 3) ch.MAX_LAN_LOI = '3';
  var viecThuc = viec || (r.trang_thai === 'DA_GIAI' ? 'kich_ban' : 'giai');
  var goi = { viec: viecThuc, hang: hang, cau_hinh: ch, thong_ke: tk, series: null, hook: '', goi_y: '' };
  if (viecThuc !== 'giai') {
    try { if (typeof xacDinhSeries_ === 'function') goi.series = xacDinhSeries_(r); } catch (e) {}
    try { if (typeof chonKieuHook_ === 'function') goi.hook = chonKieuHook_(); } catch (e) {}
    try { if (typeof goiYTuSoLieu_ === 'function') goi.goi_y = goiYTuSoLieu_(); } catch (e) {}
    try { if (typeof hocEditChoPrompt_ === 'function') goi.hoc_edit = hocEditChoPrompt_(); } catch (e) {}
    try { if (typeof quyTacHocChoPrompt_ === 'function') { goi.quy_tac_hoc = quyTacHocChoPrompt_(); goi.quy_tac_kd = quyTacHocChoKiemDuyet_(); } } catch (e) {}
    try { if (typeof chonPhongCachVideo_ === 'function') { goi.phong_cach = chonPhongCachVideo_(r); goi.cau_noi = cauNoiGanDay_(r.id).slice(-40); } } catch (e) {}
    var nhap = docNhapKichBan_(r.id);
    if (nhap) goi.nhap = JSON.stringify(nhap);
  }
  goi.het_ngay = docKeyHetNgay_();
  goi.model_chan = dsModelChan403_();   // v99.2b: GitHub bỏ qua ngay model 403 đã biết
  var s = JSON.stringify(goi);
  if (s.length > 60000) { goi.cau_noi = Array.isArray(goi.cau_noi) ? goi.cau_noi.slice(-15) : goi.cau_noi; goi.goi_y = ''; goi.hoc_edit = ''; s = JSON.stringify(goi); }
  if (s.length > 60000) {
    if (goi.quy_tac_hoc) goi.quy_tac_hoc = String(goi.quy_tac_hoc).slice(0, 4000);
    if (goi.hang && goi.hang.cach_2 && String(goi.hang.cach_2).length > 4000) goi.hang.cach_2 = String(goi.hang.cach_2).slice(0, 4000);
    s = JSON.stringify(goi);
  }
  if (s.length > 60000) { delete goi.nhap; s = JSON.stringify(goi); }
  if (s.length > 60000 && goi.hang && goi.hang.cach_1 && String(goi.hang.cach_1).length > 6000) {
    goi.hang.cach_1 = String(goi.hang.cach_1).slice(0, 6000);
    s = JSON.stringify(goi);
  }
  return s.length > 60000 ? null : s;
}

function nhanKetQuaBoPhan1_(sh, d) {
  if (d && d.id && CacheService.getScriptCache().get('DA_BO_' + d.id)) return { ok: true, lap: true };
  var r = null;
  docHang_(sh).forEach(function (x) { if (x.id === d.id) r = x; });
  if (!r) return { ok: false, loi: 'KHONG_TIM_THAY' };
  var laKB = trangThaiBoNao_(r) === 'DANG_KICH_BAN';
  if (r.trang_thai !== 'GITHUB' || String(d.lan_giao || '') !== String(r.lan_giao || '') ||
      (d.viec && d.viec !== (laKB ? 'kich_ban' : 'giai'))) return {ok:true, lap:true};
  var cu = laKB ? 'DA_GIAI' : 'MOI';
  (d.nhat_ky || []).slice(-30).forEach(function (x) { nhatKy_(x[1], '[GitHub] ' + x[2]); });
  try { ghiKeyHetNgay_(d.het_ngay); } catch (eHN) {}
  try { ghiModelChan403_(d.model_chan); } catch (eMC) {}
  // Hai kho độc lập: trả bản nháp cho Apps Script tiếp tục bằng khoGoi_ của VIDEO.
  if (cu === 'DA_GIAI' && !d.kich_ban && /^(HET_HAN_MUC|QUA_TAI|THIEU_GEMINI_API_KEY|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(d.loi))) {
    if (d.nhap) luuNhapKichBan_(r.id, JSON.parse(d.nhap));
    ghi_(sh, r._row, { trang_thai: cu, ghi_chu: 'TAI_CHO: viết tiếp kịch bản bằng KhoKey (' + d.loi + ')' }, r.id);
    return { ok: true };
  }
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
  if (f.trang_thai !== cu) { f.so_lan_thu_lai = 0; f.bp_thu_lai = ''; }
  if (cu === 'DA_GIAI' && (['XOA','LOI_CAN_XEM'].indexOf(f.trang_thai) >= 0 || (f.trang_thai === 'CO_KICH_BAN' && !d.kich_ban))) {
    f.trang_thai = 'LOI_CAN_XEM';
    f.bp_thu_lai = 2;
    f.ghi_chu = (f.ghi_chu || 'BP2 thiếu tệp kịch bản') + ' ' + (d.run_url || '');
  }
  if (f.ghi_chu === undefined) f.ghi_chu = '';
  if (d.kich_ban) {
    try {
      var kbObj = JSON.parse(String(d.kich_ban));
      kbObj._phien_ban_edit = PHIEN_BAN_EDIT;
      d.kich_ban = JSON.stringify(kbObj);
      if (typeof ghiCauNoi_ === 'function') ghiCauNoi_(kbObj);
    } catch (eCN) {}   // nhớ câu mở đầu cảnh để video sau không lặp
    f.file_kich_ban = ghiKichBanAnToan_(r.id, String(d.kich_ban));
    if (f.file_kich_ban === null) return {ok: false, loi: 'DRIVE_KICH_BAN'};
    f.duyet_kich_ban = '';
    var ktG = {};
    try { ktG = JSON.parse(String(f.ai_kiem_tra || r.ai_kiem_tra || '{}')) || {}; } catch (eKt) { ktG = {}; }
    ktG.phien_ban = PHIEN_BAN_EDIT;
    f.ai_kiem_tra = JSON.stringify(ktG).slice(0, 1800);
  } else if (d.nhap) {
    try { luuNhapKichBan_(r.id, JSON.parse(d.nhap)); } catch (e) {}
  }
  if (d.loi === 'QUA_TAI') datNghi_(10);
  ghi_(sh, r._row, f, r.id);
  SpreadsheetApp.flush();
  if (d.kich_ban) {
    xoaKichBanThayThe_(r.file_kich_ban, f.file_kich_ban);
    xoaNhapKichBan_(r.id);
  }
  if (f.trang_thai === 'LOI_CAN_XEM') guiZaloMotLan_('BP2_LOI_' + r.id, r.id + ' ' + f.ghi_chu);
  if (d.series_ghi && typeof ghiTapCuoiSeries_ === 'function') { try { ghiTapCuoiSeries_(d.series_ghi.se, d.series_ghi.tieu_de); } catch (e) {} }
  (d.zalo || []).forEach(function (z) { try { if (z.id) baoZaloDe_(r, z.noi_dung, z.muc); else guiZalo_(z.noi_dung, z.muc, z.khoa); } catch (e) {} });
  nhatKy_('GITHUB_BP1', r.id + ' -> ' + f.trang_thai + (d.kich_ban ? ' (đã lưu kịch bản)' : '') + (d.loi ? ' | ' + d.loi : ''));
  // đề máy tự sinh bị loại/lỗi: hệ thống tự thay đề khác, không làm phiền (vẫn có trong báo cáo ngày); đề bạn gửi thì báo
  if (f.trang_thai === 'XOA' && /^BO_KHONG_DAT/.test(String(f.ghi_chu || '')) && laUuTien_(r)) baoZaloDe_(r, '❌ Đề ' + r.id + ' không đạt kiểm duyệt yêu cầu nên hệ thống đã bỏ (không dựng video): ' + String(f.ghi_chu).slice(0, 220), 'cao');
  else if ((f.trang_thai === 'LOAI' || f.trang_thai === 'XOA' || f.trang_thai === 'LOI') && laUuTien_(r)) baoZaloDe_(r, (f.trang_thai !== 'LOI' ? '❌ Không làm video cho đề ' : '⚠️ Đề ') + r.id + (f.trang_thai !== 'LOI' ? ' (không có đáp án chắc chắn, đã xóa khỏi danh sách): ' : ' tạm dừng vì lỗi: ') + String(f.ghi_chu || '').slice(0, 200), 'cao');
  if (f.trang_thai === 'XOA' || f.trang_thai === 'LOAI') PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');   // dọn khỏi sheet ở lần chạy tới
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
  if (msg === 'KHO_GITHUB_KHONG_KHA_DUNG') throw e;
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
    // Giữ đề và lý do để kiểm tra cổng BP2 sau khi hết lượt sửa.
    if (/^KICH_BAN_KHONG_HOP_LE/.test(msg)) { f.trang_thai = 'LOI_CAN_XEM'; f.bp_thu_lai = 2; f.ghi_chu = ('BO_KHONG_DAT (kịch bản): sửa ' + n + ' lần vẫn lỗi - ' + msg).slice(0, 300); PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1'); }
  }
  ghi_(sh, r._row, f);
  bc.loi++;
  if (f.trang_thai === 'LOI_CAN_XEM' && typeof viecTaiChoBoNao_ !== 'undefined') guiZaloMotLan_('BP2_LOI_' + r.id, r.id + ' ' + f.ghi_chu);
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
      for (var i = 1; i < v.length; i++) {
        var key = v[i][0], value = v[i][1];
        if (!key || String(value) === '') continue;
        _bo_nho_cau_hinh_[key] = key === 'GIO_DANG' && value instanceof Date
          ? Utilities.formatDate(value, ch.getParent().getSpreadsheetTimeZone(), 'HH:mm') : String(value);
      }
    }
  }
  return _bo_nho_cau_hinh_[khoa] !== undefined ? _bo_nho_cau_hinh_[khoa] : MAC_DINH[khoa];
}

function dapAnVanBan_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' || /\d{4}-\d\d-\d\dT\d\d:\d\d/.test(String(v)))
    throw new Error('DAP_AN_NGAY: kiểm tra lại phân số gốc trong hàng đợi');
  return String(v == null ? '' : v).replace(/^'(?=\d+\s*\/)/, '');
}
function docHang_(sh) {
  var v = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    var o = { _row: i + 1 };
    for (var j = 0; j < COT.length; j++) {
      var val = v[i][j];
      if ((COT[j] === 'dap_an' || COT[j] === 'dap_an_hien') && val instanceof Date && !isNaN(val.getTime())) {
        val = Utilities.formatDate(val, sh.getParent().getSpreadsheetTimeZone(), 'd/M');
      }
      o[COT[j]] = val;
    }
    o._trang_thai_sheet = o.trang_thai;
    if (typeof docTrangThaiCu_ === 'function') docTrangThaiCu_(o);
    out.push(o);
  }
  return out;
}
function ghi_(sh, row, f, expectId) {
  if (!sh || row < 2) return;
  if (expectId && String(sh.getRange(row, 1).getValue()) !== String(expectId)) {
    var vals = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).getValues();
    var timThay = -1;
    for (var ri = 0; ri < vals.length; ri++) {
      if (String(vals[ri][0]) === String(expectId)) { timThay = ri + 2; break; }
    }
    if (timThay < 2) return;
    row = timThay;
  }
  if (typeof chuanBiGhiTrangThai_ === "function") f = chuanBiGhiTrangThai_(sh, row, f);
  f.cap_nhat = new Date();
  // Ghi kết quả/ID Drive trước khi công khai trạng thái bàn giao.
  var keys = Object.keys(f).filter(function(k) { return k !== 'trang_thai'; });
  if (f.trang_thai !== undefined) keys.push('trang_thai');
  keys.forEach(function (k) {
    var c = COT.indexOf(k);
    if (c >= 0) {
      var val = f[k];
      var cell = sh.getRange(row, c + 1);
      if (k === 'dap_an' || k === 'dap_an_hien') {
        val = dapAnVanBan_(val);
        cell.setNumberFormat('@');
      }
      cell.setValue(val);
    }
  });
}
function themHang_(sh, o) {
  if (typeof trangThaiBoNao_ === "function") o = Object.assign({}, o, {trang_thai: trangThaiBoNao_(o)});
  sh.appendRow(COT.map(function (k) {
    var val = k === 'ngay_tao' ? (o.ngay_tao || o.cap_nhat || new Date()) : (o[k] === undefined ? '' : o[k]);
    if (k === 'dap_an' || k === 'dap_an_hien') val = dapAnVanBan_(val);
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

var TIEN_TO_DRIVE_JSON_ = 'DRIVE_JSON:';
var GIOI_HAN_JSON_TREN_SHEET_ = 8000;

function idTepKichBan_(giaTriO) {
  var s = String(giaTriO || '').trim();
  if (s.indexOf(TIEN_TO_DRIVE_JSON_) === 0) s = s.slice(TIEN_TO_DRIVE_JSON_.length);
  return /^[\w-]+$/.test(s) && !/^(?:true|false|null|-?\d+)$/.test(s) ? s : '';
}

function thuMucKhoKichBan_() {
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('VIDEOAI_KHO_KICH_BAN_ID');
  if (id) {
    try {
      var cu = DriveApp.getFolderById(id);
      if (!cu.isTrashed()) return cu;
    } catch (e) {}
  }
  var it = DriveApp.getFoldersByName('VideoAI_KhoKichBan');
  var tm = it.hasNext() ? it.next() : DriveApp.createFolder('VideoAI_KhoKichBan');
  p.setProperty('VIDEOAI_KHO_KICH_BAN_ID', tm.getId());
  return tm;
}

function ghiKichBanAnToan_(idBai, jsonStr) {
  var s = String(jsonStr);
  if (s.length <= GIOI_HAN_JSON_TREN_SHEET_) return s;
  try {
    return TIEN_TO_DRIVE_JSON_ + thuMucKhoKichBan_().createFile(idBai + '.json', s, MimeType.PLAIN_TEXT).getId();
  } catch (e) {
    Logger.log('DRIVE_KICH_BAN ghi ' + idBai + ': ' + e.message);
    return null;
  }
}

function docKichBanAnToan_(giaTriO) {
  var s = String(giaTriO || '');
  var id = idTepKichBan_(s);
  if (!id) return s.trim().indexOf(TIEN_TO_DRIVE_JSON_) === 0 ? '' : s;
  try { return DriveApp.getFileById(id).getBlob().getDataAsString(); }
  catch (e) { Logger.log('DRIVE_KICH_BAN đọc ' + id + ': ' + e.message); return ''; }
}

function xoaKichBanThayThe_(cu, moi) {
  var id = idTepKichBan_(cu);
  if (!id || id === idTepKichBan_(moi)) return;
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {}
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
      thuLaiBroker_(function () {
        return UrlFetchApp.fetch('https://bot-api.zaloplatforms.com/bot' + token + '/sendMessage', {
          method: 'post', contentType: 'application/json', muteHttpExceptions: true,
          payload: JSON.stringify({ chat_id: id, text: String(noiDung).slice(0, 2000) })
        });
      }, 'guiZalo');
    } catch (e) { Logger.log('Loi gui Zalo: ' + e.message); }
  });
}

// v91: gửi ẢNH (tệp Drive) kèm chú thích qua Zalo Bot (sendPhoto). Bật chia sẻ "ai có link xem được" cho RIÊNG tệp ảnh đó
// để Zalo tải được; không gửi được ảnh -> gửi tin chữ kèm link Drive. chatRieng: gửi thêm cho người gửi đề (nếu có).
function guiAnhZalo_(fileId, noiDung, chatRieng) {
  var token = typeof tokenNhanZalo_ === 'function' ? tokenNhanZalo_() : PropertiesService.getScriptProperties().getProperty('ZALO_BOT_TOKEN');
  var ds = (typeof dsNhanThongBao_ === 'function' ? dsNhanThongBao_() : String(PropertiesService.getScriptProperties().getProperty('ZALO_CHAT_IDS') || '').split(','))
    .map(function (x) { return String(x).trim(); }).filter(Boolean);
  if (chatRieng && ds.indexOf(String(chatRieng)) < 0) ds.push(String(chatRieng));
  var linkAnh = '';
  if (fileId) {
    try {
      DriveApp.getFileById(String(fileId)).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      linkAnh = 'https://lh3.googleusercontent.com/d/' + fileId;
    } catch (eS) { nhatKy_('ZALO_ANH', 'Không bật chia sẻ ảnh ' + fileId + ': ' + eS.message); }
  }
  var chu = String(noiDung) + (fileId ? '\nẢnh lưới 3×3: https://drive.google.com/file/d/' + fileId + '/view' : '');
  if (!token || !ds.length || !duocThongBao_('cao')) { try { nhatKy_('ZALO_AN', chu.replace(/\n/g, ' | ').slice(0, 300)); } catch (e0) {} return; }
  ds.forEach(function (id) {
    var daGuiAnh = false;
    if (linkAnh) {
      try {
        var res = thuLaiBroker_(function () {
          return UrlFetchApp.fetch('https://bot-api.zaloplatforms.com/bot' + token + '/sendPhoto', {
            method: 'post', contentType: 'application/json', muteHttpExceptions: true,
            payload: JSON.stringify({ chat_id: id, photo: linkAnh, caption: String(noiDung).slice(0, 900) })
          });
        }, 'guiAnhZalo');
        daGuiAnh = res.getResponseCode() === 200 && /"ok"\s*:\s*true/.test(res.getContentText());
      } catch (eP) { daGuiAnh = false; }
    }
    if (!daGuiAnh || chu.length > 900) {
      try {
        thuLaiBroker_(function () {
          return UrlFetchApp.fetch('https://bot-api.zaloplatforms.com/bot' + token + '/sendMessage', {
            method: 'post', contentType: 'application/json', muteHttpExceptions: true,
            payload: JSON.stringify({ chat_id: id, text: chu.slice(0, 2000) })   // ảnh lỗi, hoặc chú thích bị cắt -> gửi đủ chữ
          });
        }, 'guiAnhZalo chữ');
      } catch (eM) { Logger.log('Loi gui Zalo: ' + eM.message); }
    }
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
    .addItem('▶ Chạy Bộ não Điều phối BP5 → BP0', 'chayBoNaoDieuPhoi')
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
    .addItem('🗑 Dọn video lỗi trên Sheet và Drive', 'donSachVideoLoiDriveNgay')
    .addItem('🔧 Xử lý toàn bộ lỗi DOC_DE (Sửa/Xóa)', 'xuLyLoiTrenSheetNgay')
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
  var daVe = voiKhoa_(5000, function () { capNhatDocDeTrongKhoa_(); return true; });
  if (!daVe) PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
}

function capNhatDocDeTrongKhoa_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var q = ss.getSheetByName(TEN_HANG_DOI);
  if (!q) return;
  var sh = ss.getSheetByName(BANG_DE) || ss.insertSheet(BANG_DE, 0);
  var hang = docHang_(q).filter(function (r) { return r.id; }).reverse();
  var idsHang = new Set(hang.map(function (r) { return String(r.id); }));
  // Một số DOC_DE cũ giữ dòng lỗi riêng. Giữ lại cho tới khi dòng được lưu trữ.
  if (docBangDonVideo_(sh).dong.some(function (r) { return !idsHang.has(r.id) && videoChoLuuTruLoi_(r); })) return;
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
  vung.offset(0, 5, dong.length, 1).setNumberFormat('@');
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
    var idLk = idDriveVideo_(r.file_video) || idTepKichBan_(r.file_kich_ban);
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
      ghiKichBanSheet_(JSON.parse(docKichBanAnToan_(r.file_kich_ban)));
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
  var sh = ss.getSheetByName(TEN_LUU_TRU) || ss.insertSheet(TEN_LUU_TRU);
  if (!sh.getLastRow()) {
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

function xuLyFileKichBan_(fileId, han) {
  fileId = idTepKichBan_(fileId);
  if (!fileId) return;
  var cach = cauHinh_('CACH_XU_LY_FILE');
  if (cach === 'GIU') return;
  try {
    kiemHanDonVideo_(han, 10000);
    var f = DriveApp.getFileById(fileId);
    if (/^video\//i.test(f.getMimeType()) || /\.mp4$/i.test(f.getName())) return;
    kiemHanDonVideo_(han, 5000);
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

function donSachCauLoiSheet() {
  var kq = donDepHotSheetDinhKy();
  if (!kq) return 'Hệ thống đang bận, gửi lại /donsheet sau ít phút.';
  return 'Đã lưu trữ ' + kq.daDang + ' bài đã đăng và ' + kq.loi + ' bài lỗi. Đã xử lý ' + kq.mp4 + ' dòng MP4 lỗi.' +
    (kq.trucTrac ? ' Có lỗi tạm khi dọn, lịch định kỳ sẽ thử lại.' : '') +
    (kq.hetGio ? ' Đã chạm mốc an toàn 4,5 phút.' : '');
}

var GIOI_HAN_DON_VIDEO_MS_ = 4.5 * 60 * 1000;
var HET_GIO_DON_VIDEO_ = 'HET_GIO_DON_VIDEO';
var KET_QUA_VIDEO_LOI_ = /^(LOI_CU|LOAI|CHO_QUA_HAN|BO_KHONG_DAT|LOI_KHONG_SUA_DUOC)$/;

function kiemHanDonVideo_(han, duPhong) {
  if (Date.now() + (duPhong || 0) >= han) throw new Error(HET_GIO_DON_VIDEO_);
}

function donDepHotSheetDinhKy(han) {
  han = han || Date.now() + GIOI_HAN_DON_VIDEO_MS_;
  return voiKhoa_(5000, function () { return donVideoLoiVaLuuTru_(han, false); });
}

function videoChoLuuTruLoi_(r) {
  var tt = r._trang_thai_sheet || r.trang_thai, ghiChu = String(r.ghi_chu || '');
  if (r.tu_sua_cho || r.duyet === 'DA_DUYET' ||
      /^(DA_DANG|DA_XONG|DA_LAM_VIDEO|DANG_.+|CHO_(?!QUA_HAN$).+)$/.test(tt)) return false;
  if (tt === 'DA_DON_VIDEO' || tt === 'BO_KHONG_DAT') return true;
  var hetLuot = /BO_KHONG_DAT|sửa\s+3\s+lần\s+vẫn\s+lỗi|Kiểm duyệt bố cục vẫn lỗi|Mắt thần\s*3\s*\+\s*3|het_luot/i.test(ghiChu);
  if (/^(LOI_CAN_XEM|LOI|LOAI|XOA)$/.test(tt)) return hetLuot || !!r.mp4_cho_xoa;
  if (!r.file_video || tt !== 'CO_VIDEO' || /^(AI_XEM|CHO_AI)$/.test(r.duyet) || videoDatBP4Cu_(r)) return false;
  if (hetLuot || (typeof videoCoKetLuanLoi_ === 'function' && videoCoKetLuanLoi_(r))) return true;
  var lan = /^Chờ duyệt tay sau (\d+) lần sửa \(\d+%\)/.exec(ghiChu);
  if (lan && Number(lan[1]) >= Math.min(soLanSuaYeuCau_(), TRAN_TU_SUA_)) return true;
  return r.duyet === 'CHO' && Number(docAiKT_(r).so_lan_tu_sua) >= TRAN_TU_SUA_ &&
    (matThanChan_(r) || /^AI chấm cuối chưa xác nhận hình minh họa ở tầng 2/.test(ghiChu));
}

function cotBangDonVideo_(ten) {
  var t = String(ten || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  var doi = {ma: 'id', ma_de: 'id', video: 'file_video', link_video: 'file_video', video_mp4: 'file_video',
    link_mp4: 'file_video', file_mp4: 'file_video', kich_ban: 'file_kich_ban', tu_duy: 'diem_tu_duy',
    vi_sao_can_suy_nghi: 'yeu_to_tu_duy', ngay_cap_nhat: 'cap_nhat'};
  return doi[t] || t;
}

function docBangDonVideo_(sh, chiMuc) {
  if (!sh) return {dong: []};
  var v = sh.getDataRange().getValues(), cot, tieuDe, dau = -1;
  for (var i = 0; i < Math.min(v.length, 2); i++) {
    cot = v[i].map(cotBangDonVideo_);
    if (cot.indexOf('id') >= 0 && cot.indexOf(chiMuc ? 'ket_qua' : 'trang_thai') >= 0) {
      dau = i + 1; tieuDe = v[i]; break;
    }
  }
  if (dau < 0) {
    if (sh.getLastRow()) throw new Error('Không đọc được tiêu đề tab ' + sh.getName());
    return {dong: []};
  }
  var cotVideo = cot.indexOf('file_video'), cotKb = cot.indexOf('file_kich_ban');
  var cotChung = cotVideo < 0 && cotKb >= 0;
  if (cotChung) cotVideo = cotKb;
  var congThuc = [], lienKet = [];
  if (cotVideo >= 0 && v.length > dau) {
    var rg = sh.getRange(dau + 1, cotVideo + 1, v.length - dau, 1);
    congThuc = rg.getFormulas();
    lienKet = rg.getRichTextValues();
  }
  var nhan = Object.keys(NHAN_TRANG_THAI).reduce(function (map, t) { map[NHAN_TRANG_THAI[t][0]] = t; return map; }, {});
  var dong = v.slice(dau).map(function (a, i) {
    var r = {_row: dau + i + 1, _cotVideo: cotVideo + 1};
    cot.forEach(function (c, j) { if (c) r[c] = a[j]; });
    r.id = String(r.id || '').trim();
    r._ma = r.id.toUpperCase();
    r._nhanTrangThai = String(r.trang_thai || '').trim();
    r.trang_thai = nhan[r._nhanTrangThai] || r._nhanTrangThai.toUpperCase();
    r.ket_qua = String(r.ket_qua || '').trim().toUpperCase();
    if (cotVideo >= 0 && !(cotChung && /^▶\uFE0F?\s*Mở file/.test(a[cotVideo]))) {
      var rt = lienKet[i][0];
      r.file_video = congThuc[i][0] || (rt && rt.getLinkUrl()) || a[cotVideo];
      if (cotChung) r.file_kich_ban = '';
    }
    return r;
  }).filter(function (r) { return r.id; });
  return {sh: sh, cot: cot, tieuDe: tieuDe, dong: dong, dau: dau};
}

function docNguonDonVideo_(ss, han) {
  var hang = docBangDonVideo_(ss.getSheetByName(TEN_HANG_DOI));
  var doc = docBangDonVideo_(ss.getSheetByName(BANG_DE));
  var chiMuc = docBangDonVideo_(ss.getSheetByName(TEN_LUU_TRU), true);
  var loi = docBangDonVideo_(ss.getSheetByName('LuuTru_Loi'));
  var tapIdBaoVe = new Set(), tapTepBaoVe = new Set(), tapIdLoi = new Set();
  var theoMa = new Map(hang.dong.map(function (r) { return [r._ma, r]; }));
  function baoVe(r) {
    tapIdBaoVe.add(r._ma);
    [r.file_video, r.mp4_cho_xoa].map(idDriveVideo_).filter(Boolean).forEach(function (id) { tapTepBaoVe.add(id); });
  }
  hang.dong.concat(doc.dong).forEach(function (r) {
    var q = theoMa.get(r._ma);
    // DOC_DE tạo tự động còn nhãn cũ trong lúc BP4 vừa chốt đúng bản MP4 này.
    if (q && q !== r && r._nhanTrangThai === NHAN_TRANG_THAI.CO_VIDEO[0] && q.mp4_cho_xoa &&
        q.mp4_cho_xoa === idDriveVideo_(r.file_video) && videoChoLuuTruLoi_(q)) {
      r.trang_thai = q.trang_thai;
      r.ghi_chu = q.ghi_chu;
      r._capNhatBangDoc = true;
    }
    if (!videoChoLuuTruLoi_(r)) baoVe(r);
  });
  ss.getSheets().forEach(function (tab) {
    kiemHanDonVideo_(han, 5000);
    if (/^LuuTru_\d{4}_\d{2}$/.test(tab.getName())) docBangDonVideo_(tab).dong.forEach(function (r) {
      if (!KET_QUA_VIDEO_LOI_.test(r.trang_thai) && !videoChoLuuTruLoi_(r)) baoVe(r);
    });
  });
  chiMuc.dong.forEach(function (r) {
    if (KET_QUA_VIDEO_LOI_.test(r.ket_qua)) tapIdLoi.add(r._ma);
    else if (/^(DA_DANG|DA_LAM_VIDEO|DA_XONG)$/.test(r.ket_qua)) baoVe(r);
  });
  loi.dong.forEach(function (r) {
    if (r.duyet === 'DA_DUYET' || /^(DA_DANG|DA_XONG|DA_LAM_VIDEO|DANG_.+|CHO_(?!QUA_HAN$).+)$/.test(r.trang_thai)) baoVe(r);
    else tapIdLoi.add(r._ma);
  });
  tapIdBaoVe.forEach(function (id) { tapIdLoi.delete(id); });
  return {hang: hang, doc: doc, chiMuc: chiMuc, loi: loi, tapIdBaoVe: tapIdBaoVe, tapTepBaoVe: tapTepBaoVe, tapIdLoi: tapIdLoi};
}

function ghiLoiDonVideo_(kq, e, viTri) {
  if (e.message === HET_GIO_DON_VIDEO_) kq.hetGio = true;
  else {
    kq.trucTrac = true;
    nhatKy_('DON_VIDEO_LOI', viTri + ': ' + e.message);
  }
}

function donVideoLoiVaLuuTru_(han, chayTay, maChotBP4) {
  var kq = {daDang: 0, loi: 0, docDe: 0, mp4: 0, trucTrac: false, hetGio: false, baoVe: 0};
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), now = Date.now();
    var q = ss.getSheetByName(TEN_HANG_DOI);
    if (q) damBaoCot_(q);
    var nguon = docNguonDonVideo_(ss, han);
    var daCo = new Set(nguon.chiMuc.dong.map(function (r) { return JSON.stringify([r.ma_bam, r.id]); }));
    var daCoMa = new Set(nguon.chiMuc.dong.map(function (r) { return r._ma; }));
    var daLuuLoi = new Set(nguon.loi.dong.filter(function (r) { return daCoMa.has(r._ma); }).map(function (r) { return r._ma; }));
    var daLuuHang = new Set();
    var dangCho = new Set(nguon.hang.dong.map(function (r) { return r._ma; }));
    var tabCache = Object.create(null), chiMuc = nguon.chiMuc.sh;
    var tepDaXuLy = new Set(), daLuuDinhKy = 0;

    [nguon.hang, nguon.doc].forEach(function (bang) {
      for (var i = bang.dong.length - 1; i >= 0; i--) {
        var r = bang.dong[i];
        if (maChotBP4 && r.id !== maChotBP4) continue;
        kiemHanDonVideo_(han, 10000);
        var luc = thoiDiem_(r.cap_nhat), tuoi = luc ? now - luc.getTime() : 0;
        var laDoc = bang === nguon.doc;
        var daDang = !chayTay && !laDoc && r.trang_thai === 'DA_DANG' && tuoi > 7 * MOT_NGAY_MS_;
        var loi = videoChoLuuTruLoi_(r);
        if (!loi && !daDang) continue;
        try {
          if (loi && !donTepVideoCuaDong_(bang, r, nguon, tepDaXuLy, kq, han)) continue;
          var duTuoi = chayTay || tuoi > 2 * MOT_NGAY_MS_ || (laDoc && daLuuLoi.has(r._ma));
          if (!daDang && (!duTuoi || (laDoc && dangCho.has(r._ma)))) continue;
          if (!chayTay && daLuuDinhKy >= 30) continue;
          kiemHanDonVideo_(han, 10000);
          if (!laDoc || (!daLuuHang.has(r._ma) && !(daLuuLoi.has(r._ma) && !luc))) {
            var tenTab = daDang ? 'LuuTru_' + Utilities.formatDate(luc, 'Asia/Ho_Chi_Minh', 'yyyy_MM') : 'LuuTru_Loi';
            chiMuc = chiMuc || luuTruSheet_();
            chuyenDongHotSheet_(ss, bang, r, tenTab, chiMuc, daCo, tabCache, now, laDoc);
          } else {
            kiemDongDonVideo_(bang, r);
            bang.sh.deleteRow(r._row);
          }
          if (loi) { daLuuLoi.add(r._ma); nguon.tapIdLoi.add(r._ma); }
          if (laDoc) kq.docDe++;
          else {
            dangCho.delete(r._ma);
            if (loi) daLuuHang.add(r._ma);
          }
          kq[daDang ? 'daDang' : 'loi']++;
          daLuuDinhKy++;
        } catch (eDong) {
          if (eDong.message === HET_GIO_DON_VIDEO_) throw eDong;
          ghiLoiDonVideo_(kq, eDong, r.id);
        }
      }
    });
    if (chayTay && !maChotBP4) quetThuMucVideoLoi_(nguon, kq, han);
  } catch (e) { ghiLoiDonVideo_(kq, e, 'Dọn Sheet và Drive'); }
  if (kq.daDang) PropertiesService.getScriptProperties().setProperty('CAN_DONG_BO', '1');
  return kq;
}

function kiemDongDonVideo_(bang, r) {
  var sh = bang.sh;
  var id = sh.getRange(r._row, bang.cot.indexOf('id') + 1).getValue();
  var tt = sh.getRange(r._row, bang.cot.indexOf('trang_thai') + 1).getValue();
  var cNgay = bang.cot.indexOf('cap_nhat');
  if (String(id).trim() !== r.id || String(tt).trim() !== r._nhanTrangThai ||
      (cNgay >= 0 && Number(thoiDiem_(sh.getRange(r._row, cNgay + 1).getValue())) !== Number(thoiDiem_(r.cap_nhat))))
    throw new Error('Dòng nguồn đã thay đổi');
}

function donTepVideoCuaDong_(bang, r, nguon, tepDaXuLy, kq, han) {
  var ids = Array.from(new Set([r.mp4_cho_xoa, r.file_video].map(idDriveVideo_).filter(Boolean)));
  if (nguon.tapIdBaoVe.has(r._ma) || ids.some(function (id) { return nguon.tapTepBaoVe.has(id); })) {
    kq.baoVe++;
    return false;
  }
  kiemDongDonVideo_(bang, r);
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    if (tepDaXuLy.has(id)) continue;
    var daDon = duaMp4LoiVaoThungRac_(id, han, kq, nguon.tapIdBaoVe);
    if (daDon === null) { kq.baoVe++; return false; }
    if (!daDon) throw new Error('Chưa dọn được MP4 ' + id);
    tepDaXuLy.add(id);
  }
  if (ids.length && r._cotVideo) {
    r.file_video = '[Đã xóa file lỗi - ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM') + ']';
    bang.sh.getRange(r._row, r._cotVideo).setValue(r.file_video);
  }
  if (r.mp4_cho_xoa && bang.cot.indexOf('mp4_cho_xoa') >= 0) {
    bang.sh.getRange(r._row, bang.cot.indexOf('mp4_cho_xoa') + 1).setValue('');
    r.mp4_cho_xoa = '';
  }
  if (r._capNhatBangDoc) {
    bang.sh.getRange(r._row, bang.cot.indexOf('ghi_chu') + 1).setValue(r.ghi_chu);
    bang.sh.getRange(r._row, bang.cot.indexOf('trang_thai') + 1).setValue(r.trang_thai);
    r._nhanTrangThai = r.trang_thai;
  }
  return true;
}

function donSachVideoLoiDriveNgay() {
  var han = Date.now() + GIOI_HAN_DON_VIDEO_MS_;
  var kq = voiKhoa_(5000, function () { return donVideoLoiVaLuuTru_(han, true); });
  var tin = kq ? tomTatDonVideoLoi_(kq) : 'Hệ thống đang bận. Thử lại sau ít phút.';
  if (kq) nhatKy_('DON_VIDEO_LOI', tin);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(tin, 'Video AI', 10); } catch (e) { Logger.log(tin); }
  return tin;
}

function tomTatDonVideoLoi_(kq) {
  return 'Đã chuyển ' + kq.docDe + ' dòng DOC_DE sang LuuTru_Loi và đưa ' + kq.mp4 + ' file MP4 vào Thùng rác Drive.' +
    (kq.baoVe ? ' Đã giữ ' + kq.baoVe + ' dòng trùng mã đề hoặc file được bảo vệ.' : '') +
    (kq.trucTrac ? ' Có lỗi cần xem trong NHAT_KY.' : '') +
    (kq.hetGio ? ' Đã chạm mốc an toàn 4,5 phút. Chạy thêm một lượt để tiếp tục.' : '');
}

function thuMucVideoDonLoi_(p, han) {
  var id = String(p.getProperty('THU_MUC_VIDEO_ID') || p.getProperty('DRIVE_FOLDER_ID') || p.getProperty('FOLDER_ID') ||
    (typeof FOLDER_ID !== 'undefined' ? FOLDER_ID : '') || '').trim();
  kiemHanDonVideo_(han, 10000);
  if (id) return DriveApp.getFolderById(id);
  // Workflow dung-video tải lên DRIVE_THU_MUC, mặc định VIDEO_XACSUAT/video.
  var path = String(p.getProperty('DRIVE_THU_MUC') || cauHinh_('DRIVE_THU_MUC') ||
    (cauHinh_('THU_MUC_GOC') || MAC_DINH.THU_MUC_GOC) + '/video');
  var folder = null;
  path.split('/').filter(Boolean).forEach(function (ten) {
    kiemHanDonVideo_(han, 10000);
    var it = folder ? folder.getFoldersByName(ten) : DriveApp.getFoldersByName(ten);
    if (!it.hasNext()) throw new Error('Không tìm thấy thư mục video Drive ' + path);
    folder = it.next();
    if (it.hasNext()) throw new Error('Trùng tên thư mục Drive ' + path + '. Đặt THU_MUC_VIDEO_ID trong Script Properties.');
  });
  if (!folder) throw new Error('Chưa cấu hình thư mục video Drive');
  return folder;
}

function maTrongTenMp4_(ten) {
  var ma = new Set(), stem = ten.toUpperCase().replace(/\.MP4$/, '');
  // Tách nguyên mã sinh tự động, gồm cả đuôi -10P hoặc -số, trong tên có tiền tố/hậu tố.
  var mauMa = /[A-Z]{2}\d{6}-\d{6}(?:-(?:10P|\d+))?/g, m;
  while ((m = mauMa.exec(stem))) {
    if (!/[A-Z0-9]/.test(stem.charAt(m.index - 1)) && !/[A-Z0-9]/.test(stem.charAt(mauMa.lastIndex))) ma.add(m[0]);
  }
  stem.split(/[^A-Z0-9_-]+/).forEach(function (phan) {
    var cum = phan.split('_');
    for (var i = 0; i < cum.length; i++) {
      for (var j = i + 1; j <= cum.length; j++) if (cum[i] && cum[j - 1]) ma.add(cum.slice(i, j).join('_'));
    }
  });
  return Array.from(ma);
}

function quetThuMucVideoLoi_(nguon, kq, han) {
  var p = PropertiesService.getScriptProperties(), khoa = 'VI_TRI_QUET_VIDEO_LOI';
  if (!nguon.tapIdLoi.size) { p.deleteProperty(khoa); return; }
  var it, folderId;
  try {
    var folder = thuMucVideoDonLoi_(p, han);
    kiemHanDonVideo_(han, 10000);
    folderId = folder.getId();
    var viTri = JSON.parse(p.getProperty(khoa) || 'null');
    if (viTri && viTri.folderId === folderId) {
      try { kiemHanDonVideo_(han, 10000); it = DriveApp.continueFileIterator(viTri.token); }
      catch (eTiep) {
        if (eTiep.message === HET_GIO_DON_VIDEO_) throw eTiep;
        p.deleteProperty(khoa);
        nhatKy_('DON_VIDEO_LOI', 'Bắt đầu lại lượt quét Drive: ' + eTiep.message);
      }
    }
    if (!it) { kiemHanDonVideo_(han, 10000); it = folder.getFiles(); }
    while (true) {
      kiemHanDonVideo_(han, 15000);
      if (!it.hasNext()) break;
      var file = it.next(), ten = '';
      try {
        ten = file.getName();
        if (!/\.mp4$/i.test(ten)) continue;
        var ma = maTrongTenMp4_(ten);
        if (ma.some(function (id) { return nguon.tapIdBaoVe.has(id); })) continue;
        if (ma.filter(function (id) { return nguon.tapIdLoi.has(id); }).length !== 1) continue;
        if (nguon.tapTepBaoVe.has(file.getId()) || !laTepMp4_(file.getMimeType(), ten) || file.isTrashed()) continue;
        // Kiểm tra lại ngay trước thao tác ghi trên Drive.
        kiemHanDonVideo_(han);
        file.setTrashed(true);
        kq.mp4++;
        if (typeof kq.drive === 'number') kq.drive++;
      } catch (eTep) {
        if (eTep.message === HET_GIO_DON_VIDEO_) {
          // Iterator đã bước qua file chưa dọn. Lượt sau quét lại để giữ file này trong phạm vi xử lý.
          it = null;
          p.deleteProperty(khoa);
          throw eTep;
        }
        ghiLoiDonVideo_(kq, eTep, ten || 'Tệp Drive');
      }
    }
    p.deleteProperty(khoa);
  } catch (e) {
    if (e.message === HET_GIO_DON_VIDEO_ && it && Date.now() < han) {
      try { p.setProperty(khoa, JSON.stringify({folderId: folderId, token: it.getContinuationToken()})); }
      catch (eViTri) { ghiLoiDonVideo_(kq, eViTri, 'Lưu vị trí quét Drive'); }
    }
    throw e;
  }
}

function chuyenDongHotSheet_(ss, bang, r, tenTab, chiMuc, daCo, tabCache, now, laDoc, ketQuaLuuTru) {
  kiemDongDonVideo_(bang, r);
  var loi = tenTab === 'LuuTru_Loi';
  var khoa = function (id, luc) { return String(id) + '|' + Number(thoiDiem_(luc)); };
  var dich = tabCache[tenTab];
  if (!dich) {
    var tab = ss.getSheetByName(tenTab);
    if (!tab) {
      tab = ss.insertSheet(tenTab);
      if (tab.getMaxRows() > 100) tab.deleteRows(101, tab.getMaxRows() - 100);
    }
    var cu = docBangDonVideo_(tab), tieuDe = cu.tieuDe || COT;
    var canonical = tieuDe.every(function (c, i) { return c === COT[i]; });
    if (canonical) tieuDe = COT;
    if (tab.getMaxColumns() < tieuDe.length) tab.insertColumnsAfter(tab.getMaxColumns(), tieuDe.length - tab.getMaxColumns());
    if (!cu.tieuDe || cu.tieuDe.length < tieuDe.length) tab.getRange(1, 1, 1, tieuDe.length).setValues([tieuDe]);
    var cot = tieuDe.map(cotBangDonVideo_), cNgay = cot.indexOf('cap_nhat');
    var daChep = new Set(cu.dong.map(function (x) { return khoa(x.id, cNgay >= 0 ? x.cap_nhat : null); }));
    dich = tabCache[tenTab] = {tab: tab, cot: cot, cNgay: cNgay, daChep: daChep, canonical: canonical};
  }
  var key = khoa(r.id, dich.cNgay >= 0 ? r.cap_nhat : null);
  if (!dich.daChep.has(key)) {
    var dong = dich.tab.getLastRow() + 1;
    if (dong > dich.tab.getMaxRows()) dich.tab.insertRowsAfter(dich.tab.getMaxRows(), 100);
    var rg = dich.tab.getRange(dong, 1, 1, dich.cot.length);
    if (!laDoc && dich.canonical) bang.sh.getRange(r._row, 1, 1, COT.length).copyTo(rg);
    else rg.setValues([dich.cot.map(function (c) {
      if (c === 'file_kich_ban' && dich.cot.indexOf('file_video') < 0) return r.file_video || r.file_kich_ban || '';
      return r[c] == null ? '' : r[c];
    })]);
    SpreadsheetApp.flush();
    var maLuu = dich.tab.getRange(dong, dich.cot.indexOf('id') + 1).getValue();
    var lucLuu = dich.cNgay >= 0 ? dich.tab.getRange(dong, dich.cNgay + 1).getValue() : null;
    if (khoa(maLuu, lucLuu) !== key)
      throw new Error('Chưa xác nhận dòng lưu trữ');
    dich.daChep.add(key);
  }
  var hash = r.ma_bam || bam_(r.de_bai);
  var muc = JSON.stringify([hash, r.id]);
  if (!daCo.has(muc)) {
    var dapAnLuu = r.dap_an instanceof Date ? Utilities.formatDate(r.dap_an, 'Asia/Ho_Chi_Minh', 'd/M') : dapAnVanBan_(r.dap_an);
    chiMuc.appendRow([hash, r.id, r.lop || '', String(r.de_bai || '').slice(0, 120), dapAnLuu, ketQuaLuuTru || (loi ? 'BO_KHONG_DAT' : 'DA_DANG'), new Date(now)]);
    SpreadsheetApp.flush();
    daCo.add(muc);
  }
  if (loi && !laDoc) {
    try { deMoiChoSanPhamBiBo_(r); } catch (e) { Logger.log(e.message); }
  }
  xoaKichBanKhoiSheet_(r.id);
  bang.sh.deleteRow(r._row);
}

/* ===================== XỬ LÝ TỰ ĐỘNG & CHẠY TAY TOÀN BỘ LỖI TRÊN DOC_DE ===================== */
var RE_LOI_KHONG_SUA_DUOC_ = /BO_KHONG_DAT|sửa\s+3\s+lần\s+vẫn\s+lỗi|Mắt\s*thần\s*3\s*\+\s*3|\bhet_luot\b|Kiểm\s+duyệt\s+bố\s+cục\s+vẫn\s+lỗi|\bAI_SAI_TOAN\b|\bDE_SAI\b|\bVO_NGHIEM_SAI_DE\b|\bKHONG_CO_DAP_AN\b|\bTRUNG_DE\b/i;
var RE_LOI_BP2_SUA_DUOC_ = /\b(t2_trong|hinh_dung_im|TEX_LENH_CUT|KHUNG4TANG_3D_RONG|DE_CHU|TRAN_KHUNG|thieu_dap_an)\b/i;
var RE_LOI_BP3_HA_TANG_ = /DUNG_VIDEO|Xem\s+nhật\s+ký|\btimeout\b|\b429\b|\b502\b|\b503\b|rate\s*limit|\bGIAO_DIEN_CU_KHONG_HOP_LE\b/i;
var RE_LOI_BP1_TAM_ = /\b(het_key|JSON_LOI)\b/i;

function trichFileIdDriveTuChuoi_(chuoi, choPhepIdTran) {
  var ids = [];
  var s = String(chuoi || '').trim();
  if (!s) return ids;
  var them = function (id) {
    id = String(id || '').trim();
    if (id && /^[\w-]+$/.test(id) && !/^(?:true|false|null|-?\d+)$/i.test(id) && ids.indexOf(id) < 0) ids.push(id);
  };
  var reJson = /DRIVE_JSON:([\w-]+)/g, m;
  while ((m = reJson.exec(s))) them(m[1]);
  var reHyp = /HYPERLINK\s*\(\s*["']([^"']+)["']/gi;
  while ((m = reHyp.exec(s))) {
    var idH = idDriveVideo_(m[1]);
    if (idH) them(idH);
  }
  var reUrl = /https?:\/\/drive\.google\.com(?=\/|\?)([^\s"'<>#;)]*)/gi;
  while ((m = reUrl.exec(s))) {
    var phan = m[1];
    var idU = /\/file\/d\/([\w-]+)(?=\/|\?|$)/.exec(phan) ||
      /\/d\/([\w-]+)(?=\/|\?|$)/.exec(phan) ||
      /[?&]id=([\w-]+)(?=&|$)/.exec(phan);
    if (idU) them(idU[1]);
  }
  if (choPhepIdTran && !ids.length) {
    var idT = idDriveVideo_(s);
    if (idT) them(idT);
  }
  return ids;
}

// Đọc đồng thời 3 nguồn trên 1 dòng DOC_DE: RichText (ô + từng run), Formula (=HYPERLINK), Value (URL Drive trần + DRIVE_JSON:).
function layDanhSachFileIdDriveTuDong_(sheet, rowIndex, numCols) {
  var ketQua = [];
  if (!sheet || !rowIndex || rowIndex < 1) return ketQua;
  var soCot = Number(numCols) || 0;
  if (!soCot) {
    try { soCot = typeof sheet.getLastColumn === 'function' ? sheet.getLastColumn() : sheet.getMaxColumns(); } catch (e) { soCot = 0; }
  }
  if (!soCot || soCot < 1) return ketQua;
  var them = function (id) { if (id && ketQua.indexOf(id) < 0) ketQua.push(id); };
  var rg = sheet.getRange(rowIndex, 1, 1, soCot);
  try {
    if (typeof rg.getRichTextValues === 'function') {
      var rts = rg.getRichTextValues();
      ((rts && rts[0]) || []).forEach(function (rt) {
        if (!rt) return;
        try { if (typeof rt.getLinkUrl === 'function') trichFileIdDriveTuChuoi_(rt.getLinkUrl(), false).forEach(them); } catch (e1) {}
        try {
          if (typeof rt.getRuns === 'function') {
            (rt.getRuns() || []).forEach(function (run) {
              if (run && typeof run.getLinkUrl === 'function') trichFileIdDriveTuChuoi_(run.getLinkUrl(), false).forEach(them);
            });
          }
        } catch (e2) {}
      });
    }
  } catch (eRt) {}
  try {
    if (typeof rg.getFormulas === 'function') {
      var fms = rg.getFormulas();
      ((fms && fms[0]) || []).forEach(function (fm) {
        if (fm) trichFileIdDriveTuChuoi_(fm, false).forEach(them);
      });
    }
  } catch (eFm) {}
  try {
    if (typeof rg.getValues === 'function') {
      var vals = rg.getValues();
      ((vals && vals[0]) || []).forEach(function (v) {
        if (v !== null && v !== undefined && v !== '') trichFileIdDriveTuChuoi_(v, false).forEach(them);
      });
    }
  } catch (eVal) {}
  return ketQua;
}

function docSoLanTuSua_(ghiChu) {
  var m = /\[TU_SUA:(\d+)(?:\/\d+)?\]/i.exec(String(ghiChu || ''));
  return m ? (Number(m[1]) || 0) : 0;
}

function boTagTuSua_(ghiChu) {
  return String(ghiChu || '').replace(/^\s*\[TU_SUA:\d+(?:\/\d+)?\]\s*(?:Ly\s*do\s*cu\s*:\s*)?/i, '').trim();
}

function taoGhiChuTuSua_(lanMoi, tranSua, ghiChuCu) {
  var goc = boTagTuSua_(ghiChuCu) || 'LOI_CAN_XEM';
  return ('[TU_SUA:' + lanMoi + '/' + tranSua + '] Ly do cu: ' + goc).slice(0, 300);
}

function chuanHoaTrangThaiLoi_(trangThai) {
  var raw = String(trangThai || '').trim();
  if (!raw) return '';
  if (typeof NHAN_TRANG_THAI === 'object') {
    var keys = Object.keys(NHAN_TRANG_THAI);
    for (var i = 0; i < keys.length; i++) {
      if (NHAN_TRANG_THAI[keys[i]][0] === raw) { raw = keys[i]; break; }
    }
  }
  var up = raw.toUpperCase();
  return up === 'LOI' ? 'LOI_CAN_XEM' : up;
}

function laTrangThaiLoiCanXuLy_(trangThai) {
  var tt = chuanHoaTrangThaiLoi_(trangThai);
  return tt === 'LOI_CAN_XEM' || tt === 'BO_KHONG_DAT' || tt === 'LOAI' || tt === 'XOA' || tt === 'DA_DON_VIDEO';
}

function laTrangThaiBaoVeDrive_(trangThai, duyet) {
  var tt = chuanHoaTrangThaiLoi_(trangThai);
  if (String(duyet || '').trim().toUpperCase() === 'DA_DUYET') return true;
  return /^(DA_DANG|DA_XONG|DA_LAM_VIDEO|CHO_DANG|CO_VIDEO|CHO_KIEM_DUYET|DANG_KIEM_DUYET|DANG_DUNG|DANG_DANG|DANG_GIAI|DANG_KICH_BAN|CHO_DUNG|CO_KICH_BAN|CHO_KICH_BAN|DA_GIAI|CHO_GIAI|MOI|GITHUB|CHO_DOC)$/.test(tt);
}

// Phân loại dứt khoát 1 dòng lỗi thành XOA_KHONG_SUA_DUOC hoặc BAT_BUOC_SUA (kèm trangThaiDich).
function phanLoaiLoiDong_(trangThai, ghiChu, soLanDaSua, tuyChon) {
  var tt = chuanHoaTrangThaiLoi_(trangThai);
  var gc = String(ghiChu || '');
  var daSua = Math.max(Number(soLanDaSua) || 0, docSoLanTuSua_(gc));
  var opt = tuyChon || {};
  var xoa = function (lyDo) {
    return {hanhDong: 'XOA_KHONG_SUA_DUOC', trangThaiDich: '', boPhan: '', tranSua: 0, soLanDaSua: daSua, lyDo: lyDo};
  };
  if (tt === 'BO_KHONG_DAT' || tt === 'LOAI' || tt === 'XOA' || tt === 'DA_DON_VIDEO') return xoa('trang_thai_' + tt);
  if (RE_LOI_KHONG_SUA_DUOC_.test(gc)) return xoa('loi_ban_chat_hoac_het_luot');
  if (tt !== 'LOI_CAN_XEM') return xoa('trang_thai_khac_' + (tt || 'RONG'));
  if (opt.quaHan48h) return xoa('qua_han_48h');

  // 1) Lỗi tạm bước giải (BP1): het_key, JSON_LOI, timeout tại BP1 (trần 1)
  var laTimeoutBP1 = /\btimeout\b/i.test(gc) && (/\bBP1\b|bước\s*giải|bo-phan-1|giai_de/i.test(gc) || Number(opt.bpLoi) === 1);
  if (RE_LOI_BP1_TAM_.test(gc) || laTimeoutBP1) {
    if (daSua >= 1) return xoa('cham_tran_sua_bp1');
    return {hanhDong: 'BAT_BUOC_SUA', trangThaiDich: 'CHO_GIAI', boPhan: 'BP1', tranSua: 1, soLanDaSua: daSua, lyDo: 'loi_tam_bp1'};
  }
  // 2) Lỗi kịch bản / bố cục (BP2): t2_trong, hinh_dung_im, TEX_LENH_CUT, KHUNG4TANG_3D_RONG, DE_CHU, TRAN_KHUNG, thieu_dap_an (trần 1)
  if (RE_LOI_BP2_SUA_DUOC_.test(gc)) {
    if (daSua >= 1) return xoa('cham_tran_sua_bp2');
    return {hanhDong: 'BAT_BUOC_SUA', trangThaiDich: 'CHO_KICH_BAN', boPhan: 'BP2', tranSua: 1, soLanDaSua: daSua, lyDo: 'loi_kich_ban_bp2'};
  }
  // 3) Lỗi dựng BP3 / hạ tầng: DUNG_VIDEO, Xem nhật ký, timeout, 429, 502, 503, rate limit, GIAO_DIEN_CU_KHONG_HOP_LE (trần 2)
  if (RE_LOI_BP3_HA_TANG_.test(gc)) {
    if (daSua >= 2) return xoa('cham_tran_sua_bp3');
    var dich = opt.coKichBanJson ? 'CO_KICH_BAN' : 'CHO_KICH_BAN';
    return {hanhDong: 'BAT_BUOC_SUA', trangThaiDich: dich, boPhan: dich === 'CO_KICH_BAN' ? 'BP3' : 'BP2', tranSua: 2, soLanDaSua: daSua, lyDo: 'loi_ha_tang_bp3'};
  }
  // 4) Không rõ nguyên nhân -> hạ cấp sang XOA_KHONG_SUA_DUOC để không tồn rác vĩnh viễn
  return xoa('khong_ro_nguyen_nhan');
}

function maTrongTenTep_(ten) {
  return maTrongTenMp4_(String(ten || '').replace(/\.(mp4|json|png|jpe?g|webp|txt)$/i, ''));
}

// Đưa mọi tài nguyên Drive lỗi (MP4, JSON kịch bản hỏng, ảnh kiểm tra...) vào Thùng rác, tôn trọng tapIdBaoVe/tapTepBaoVe và hạn 4,5 phút.
function duaTaiNguyenLoiVaoThungRac_(fileId, han, kq, tapIdBaoVe, tapTepBaoVe) {
  if (!fileId) return true;
  if (tapTepBaoVe && tapTepBaoVe.has(fileId)) {
    if (kq) kq.baoVe++;
    return null;
  }
  han = han || Date.now() + GIOI_HAN_DON_VIDEO_MS_;
  try {
    kiemHanDonVideo_(han, 10000);
    var tep = DriveApp.getFileById(fileId);
    var ten = tep.getName();
    if (tapIdBaoVe && tapIdBaoVe.size && maTrongTenTep_(ten).some(function (id) { return tapIdBaoVe.has(id); })) {
      if (kq) kq.baoVe++;
      return null;
    }
    if (!tep.isTrashed()) {
      kiemHanDonVideo_(han);
      tep.setTrashed(true);
      if (kq) {
        if (typeof kq.drive === 'number') kq.drive++;
        if (laTepMp4_(tep.getMimeType(), ten) && typeof kq.mp4 === 'number') kq.mp4++;
      }
    }
    return true;
  } catch (e) {
    if (e.message === HET_GIO_DON_VIDEO_) throw e;
    if (/file not found|no item with the given id|không tìm thấy/i.test(e.message) && !/permission|quyền|access/i.test(e.message)) return true;
    Logger.log('XOA_TAI_NGUYEN ' + fileId + ': ' + e.message);
    return false;
  }
}

// Kiểm tra cột J (Kịch bản) hoặc HANG_DOI còn file kịch bản JSON hợp lệ trên Drive không.
function thongTinKichBanCotJ_(sheet, rowIndex, numCols, cot, rHang, han) {
  var ungVien = [];
  var them = function (id) { if (id && ungVien.indexOf(id) < 0) ungVien.push(id); };
  if (rHang && rHang.file_kich_ban) {
    var kbRaw = String(rHang.file_kich_ban || '').trim();
    if (/^\s*\{/.test(kbRaw)) return {coKichBanJson: true, fileId: ''};
    them(idTepKichBan_(kbRaw));
  }
  var idxKb = cot ? cot.indexOf('file_kich_ban') : -1;
  if (idxKb < 0 && numCols >= 10) idxKb = 9;
  if (sheet && idxKb >= 0 && idxKb < numCols) {
    var rg = sheet.getRange(rowIndex, idxKb + 1, 1, 1);
    var val = '';
    try { val = String(rg.getValue() || '').trim(); } catch (eV) {}
    if (/^\s*\{/.test(val)) return {coKichBanJson: true, fileId: ''};
    trichFileIdDriveTuChuoi_(val, false).forEach(them);
    try {
      var fm = typeof rg.getFormula === 'function' ? rg.getFormula() : '';
      if (fm && !/xem\s*video|mp4/i.test(fm)) trichFileIdDriveTuChuoi_(fm, false).forEach(them);
    } catch (eF) {}
    try {
      var rt = typeof rg.getRichTextValue === 'function' ? rg.getRichTextValue() :
        (typeof rg.getRichTextValues === 'function' ? ((rg.getRichTextValues() || [[]])[0][0]) : null);
      if (rt) {
        var nhanCell = (typeof rt.getText === 'function' ? String(rt.getText() || '') : val);
        if (typeof rt.getLinkUrl === 'function' && rt.getLinkUrl() && !/xem\s*video/i.test(nhanCell)) {
          trichFileIdDriveTuChuoi_(rt.getLinkUrl(), false).forEach(them);
        }
        if (typeof rt.getRuns === 'function') {
          (rt.getRuns() || []).forEach(function (run) {
            if (!run || typeof run.getLinkUrl !== 'function') return;
            var u = run.getLinkUrl();
            var t = typeof run.getText === 'function' ? String(run.getText() || '') : '';
            if (u && !/xem\s*video/i.test(t)) trichFileIdDriveTuChuoi_(u, false).forEach(them);
          });
        }
      }
    } catch (eRt) {}
  }
  for (var i = 0; i < ungVien.length; i++) {
    var id = ungVien[i];
    try {
      if (han) kiemHanDonVideo_(han, 10000);
      var f = DriveApp.getFileById(id);
      var ten = String(f.getName() || ''), mime = String(f.getMimeType() || '');
      if (!f.isTrashed() && !laTepMp4_(mime, ten) && (/\.json$/i.test(ten) || /json|text\/plain/i.test(mime))) {
        return {coKichBanJson: true, fileId: id};
      }
    } catch (eDr) {
      if (eDr.message === HET_GIO_DON_VIDEO_) throw eDr;
    }
  }
  return {coKichBanJson: false, fileId: ''};
}

// Tập bảo vệ dành riêng cho xuLyLoiDocDe_: bảo vệ tuyệt đối DA_DANG, CHO_DANG, CO_VIDEO, CHO_KIEM_DUYET, DANG_DUNG, LuuTru_YYYY_MM và DA_DANG trong LUU_TRU.
function docNguonXuLyLoi_(ss, han) {
  var hang = docBangDonVideo_(ss.getSheetByName(TEN_HANG_DOI));
  var doc = docBangDonVideo_(ss.getSheetByName(BANG_DE));
  var chiMuc = docBangDonVideo_(ss.getSheetByName(TEN_LUU_TRU), true);
  var loi = docBangDonVideo_(ss.getSheetByName('LuuTru_Loi'));
  var tapIdBaoVe = new Set(), tapTepBaoVe = new Set(), tapIdLoi = new Set();
  function baoVeDong(bang, r) {
    tapIdBaoVe.add(r._ma);
    [r.file_video, r.mp4_cho_xoa, r.anh_kt, r.anh_bia].map(idDriveVideo_).filter(Boolean).forEach(function (id) { tapTepBaoVe.add(id); });
    if (r.file_kich_ban) {
      var kbId = idTepKichBan_(r.file_kich_ban);
      if (kbId) tapTepBaoVe.add(kbId);
    }
    if (bang && bang.sh && r._row && bang.cot) {
      layDanhSachFileIdDriveTuDong_(bang.sh, r._row, bang.cot.length).forEach(function (id) { tapTepBaoVe.add(id); });
    }
  }
  [hang, doc].forEach(function (bang) {
    bang.dong.forEach(function (r) {
      if (laTrangThaiBaoVeDrive_(r.trang_thai, r.duyet)) baoVeDong(bang, r);
    });
  });
  ss.getSheets().forEach(function (tab) {
    kiemHanDonVideo_(han, 5000);
    if (/^LuuTru_\d{4}_\d{2}$/.test(tab.getName())) {
      var bLt = docBangDonVideo_(tab);
      bLt.dong.forEach(function (r) {
        if (!KET_QUA_VIDEO_LOI_.test(r.trang_thai) && !laTrangThaiLoiCanXuLy_(r.trang_thai)) baoVeDong(bLt, r);
      });
    }
  });
  chiMuc.dong.forEach(function (r) {
    if (KET_QUA_VIDEO_LOI_.test(r.ket_qua)) tapIdLoi.add(r._ma);
    else if (/^(DA_DANG|DA_LAM_VIDEO|DA_XONG)$/.test(r.ket_qua)) tapIdBaoVe.add(r._ma);
  });
  loi.dong.forEach(function (r) {
    if (laTrangThaiBaoVeDrive_(r.trang_thai, r.duyet)) baoVeDong(loi, r);
    else tapIdLoi.add(r._ma);
  });
  tapIdBaoVe.forEach(function (id) { tapIdLoi.delete(id); });
  return {hang: hang, doc: doc, chiMuc: chiMuc, loi: loi, tapIdBaoVe: tapIdBaoVe, tapTepBaoVe: tapTepBaoVe, tapIdLoi: tapIdLoi};
}

// Cập nhật ngay thanh thống kê hàng 1 trên DOC_DE (số lỗi & mốc giờ hiện tại) không cần vẽ lại toàn bảng.
function capNhatThanhThongKeDocDe_(shDoc) {
  if (!shDoc || typeof shDoc.getDataRange !== 'function') return '';
  var bang = docBangDonVideo_(shDoc);
  if (bang.dau !== 2) return '';
  var dem = {choGiai: 0, choKb: 0, coKb: 0, dangDung: 0, coVideo: 0, loai: 0, loi: 0};
  bang.dong.forEach(function (r) {
    var tt = chuanHoaTrangThaiLoi_(r.trang_thai);
    if (tt === 'MOI' || tt === 'CHO_GIAI') dem.choGiai++;
    else if (tt === 'DA_GIAI' || tt === 'CHO_KICH_BAN') dem.choKb++;
    else if (tt === 'CO_KICH_BAN' || tt === 'CHO_DUNG') dem.coKb++;
    else if (tt === 'DANG_DUNG') dem.dangDung++;
    else if (tt === 'CO_VIDEO' || tt === 'CHO_KIEM_DUYET' || tt === 'DANG_KIEM_DUYET' || tt === 'CHO_DANG' || tt === 'DANG_DANG' || tt === 'DA_DANG') dem.coVideo++;
    else if (tt === 'LOAI' || tt === 'BO_KHONG_DAT' || tt === 'XOA') dem.loai++;
    else if (tt === 'LOI_CAN_XEM') dem.loi++;
  });
  var tong = '🎲  ĐỀ XÁC SUẤT & TOÁN THỰC TẾ   ·   Tổng ' + bang.dong.length + ' đề     🆕 ' + dem.choGiai + ' chờ giải     ✅ ' + dem.choKb +
    ' chờ kịch bản     🎬 ' + dem.coKb + ' có kịch bản     ⏳ ' + dem.dangDung + ' đang dựng     🎞 ' + dem.coVideo + ' có video     ❌ ' + dem.loai + ' loại     ⚠️ ' + dem.loi +
    ' lỗi          (cập nhật ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM HH:mm') + ' · giao diện v6)';
  shDoc.getRange(1, 1).setValue(tong);
  return tong;
}

function xuLyLoiDocDe_(tuyChon) {
  var opt = tuyChon || {};
  var chayTay = opt.chayTay !== false;
  var han = opt.han || Date.now() + GIOI_HAN_DON_VIDEO_MS_;
  var toiDaSua = opt.toiDaSua === undefined ? Infinity : Math.max(0, Number(opt.toiDaSua) || 0);
  var kq = {bp1: 0, bp2: 0, bp3: 0, xoa: 0, drive: 0, mp4: 0, baoVe: 0, trucTrac: false, hetGio: false};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shDoc = ss && ss.getSheetByName(BANG_DE);
  if (!shDoc || typeof shDoc.getDataRange !== 'function') return kq;
  var shHang = ss.getSheetByName(TEN_HANG_DOI);
  try {
    if (shHang && typeof shHang.getDataRange === 'function') damBaoCot_(shHang);
    var nguon = docNguonXuLyLoi_(ss, han);
    var theoMaHang = new Map();
    if (shHang && typeof shHang.getDataRange === 'function') {
      docHang_(shHang).forEach(function (rh) { if (rh.id) theoMaHang.set(String(rh.id).trim().toUpperCase(), rh); });
    }
    var daCo = new Set(nguon.chiMuc.dong.map(function (r) { return JSON.stringify([r.ma_bam, r.id]); }));
    var tabCache = Object.create(null), chiMuc = nguon.chiMuc.sh;
    var numCols = nguon.doc.cot ? nguon.doc.cot.length : 0;
    var cotTt = nguon.doc.cot ? nguon.doc.cot.indexOf('trang_thai') + 1 : 0;
    var cotGc = nguon.doc.cot ? nguon.doc.cot.indexOf('ghi_chu') + 1 : 0;
    var cotKb = nguon.doc.cot ? nguon.doc.cot.indexOf('file_kich_ban') + 1 : 0;
    var cotVid = nguon.doc.cot ? nguon.doc.cot.indexOf('file_video') + 1 : 0;
    var now = Date.now(), soDaSuaNhip = 0;

    for (var i = nguon.doc.dong.length - 1; i >= 0; i--) {
      var r = nguon.doc.dong[i];
      if (!laTrangThaiLoiCanXuLy_(r.trang_thai)) continue;
      kiemHanDonVideo_(han, 10000);
      if (nguon.tapIdBaoVe.has(r._ma)) { kq.baoVe++; continue; }
      var rHang = theoMaHang.get(r._ma) || null;
      var luc = thoiDiem_(r.cap_nhat || (rHang && rHang.cap_nhat));
      var quaHan48h = !!(luc && (now - luc.getTime() >= 48 * 3600 * 1000));
      var daSua = docSoLanTuSua_(r.ghi_chu);
      if (rHang) {
        daSua = Math.max(daSua, docSoLanTuSua_(rHang.ghi_chu));
        try { if (typeof docAiKT_ === 'function') daSua = Math.max(daSua, Number(docAiKT_(rHang).tu_sua_doc_de_lan) || 0); } catch (eAkt) {}
      }
      var infoKb = thongTinKichBanCotJ_(shDoc, r._row, numCols, nguon.doc.cot, rHang, han);
      var pl = phanLoaiLoiDong_(r.trang_thai, r.ghi_chu, daSua, {
        coKichBanJson: infoKb.coKichBanJson,
        quaHan48h: quaHan48h,
        bpLoi: rHang ? Number(rHang.bp_thu_lai) || 0 : 0
      });
      var rowFileIds = layDanhSachFileIdDriveTuDong_(shDoc, r._row, numCols);
      if (rHang) {
        [rHang.file_video, rHang.mp4_cho_xoa, rHang.anh_kt, rHang.anh_bia].map(idDriveVideo_).filter(Boolean).forEach(function (id) {
          if (rowFileIds.indexOf(id) < 0) rowFileIds.push(id);
        });
        var kbHangId = idTepKichBan_(rHang.file_kich_ban);
        if (kbHangId && rowFileIds.indexOf(kbHangId) < 0) rowFileIds.push(kbHangId);
      }

      try {
        if (pl.hanhDong === 'XOA_KHONG_SUA_DUOC') {
          var biBaoVe = false, coLoiDrive = false;
          for (var j = 0; j < rowFileIds.length; j++) {
            var fid = rowFileIds[j];
            var kqTep = duaTaiNguyenLoiVaoThungRac_(fid, han, kq, nguon.tapIdBaoVe, nguon.tapTepBaoVe);
            if (kqTep === null) { biBaoVe = true; break; }
            if (!kqTep) { coLoiDrive = true; break; }
          }
          if (biBaoVe) continue;
          if (coLoiDrive) { kq.trucTrac = true; continue; }
          if (rowFileIds.length && r._cotVideo) {
            r.file_video = '[Đã xóa file lỗi - ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM') + ']';
            shDoc.getRange(r._row, r._cotVideo).setValue(r.file_video);
          }
          chiMuc = chiMuc || luuTruSheet_();
          chuyenDongHotSheet_(ss, nguon.doc, r, 'LuuTru_Loi', chiMuc, daCo, tabCache, now, true, 'LOI_KHONG_SUA_DUOC');
          if (rHang && !laTrangThaiBaoVeDrive_(rHang._trang_thai_sheet || rHang.trang_thai, rHang.duyet)) {
            var dongHang = docHang_(shHang).filter(function (x) { return String(x.id).trim().toUpperCase() === r._ma; })[0];
            if (dongHang) shHang.deleteRow(dongHang._row);
            try { if (typeof xoaNhapKichBan_ === 'function') xoaNhapKichBan_(r.id); } catch (eN) {}
          }
          nguon.tapIdLoi.add(r._ma);
          kq.xoa++;
        } else {
          if (soDaSuaNhip >= toiDaSua) continue;
          // BAT_BUOC_SUA: chỉ xóa MP4 hỏng (giữ lại file JSON kịch bản nếu đẩy về CO_KICH_BAN)
          var daXoaMp4 = false;
          for (var k = 0; k < rowFileIds.length; k++) {
            var fidSua = rowFileIds[k];
            if (pl.trangThaiDich === 'CO_KICH_BAN' && infoKb.fileId && fidSua === infoKb.fileId) continue;
            if (nguon.tapTepBaoVe.has(fidSua)) { kq.baoVe++; continue; }
            var kqMp4 = duaMp4LoiVaoThungRac_(fidSua, han, kq, nguon.tapIdBaoVe);
            if (kqMp4 === true) daXoaMp4 = true;
          }
          var lanMoi = pl.soLanDaSua + 1;
          var ghiChuMoi = taoGhiChuTuSua_(lanMoi, pl.tranSua, r.ghi_chu);
          if (cotTt > 0) shDoc.getRange(r._row, cotTt).setValue(pl.trangThaiDich);
          if (cotGc > 0) shDoc.getRange(r._row, cotGc).setValue(ghiChuMoi);
          if (daXoaMp4 && cotVid > 0) shDoc.getRange(r._row, cotVid).setValue('');
          if (daXoaMp4 && cotKb > 0 && pl.trangThaiDich !== 'CO_KICH_BAN') {
            var txtJ = String(shDoc.getRange(r._row, cotKb).getValue() || '');
            if (/xem\s*video|mp4/i.test(txtJ)) shDoc.getRange(r._row, cotKb).setValue('');
          }
          if (rHang && !laTrangThaiBaoVeDrive_(rHang._trang_thai_sheet || rHang.trang_thai, rHang.duyet)) {
            var fHang = {
              trang_thai: pl.trangThaiDich, ghi_chu: ghiChuMoi,
              file_video: '', mp4_cho_xoa: '', anh_kt: '', anh_bia: '',
              duyet: '', tu_sua_cho: '', lan_giao: '', so_lan_loi: 0, so_lan_thu_lai: 0
            };
            if (pl.trangThaiDich === 'CHO_KICH_BAN') fHang.gop_y = ('Sửa lỗi cũ trên DOC_DE: ' + boTagTuSua_(r.ghi_chu)).slice(0, 1000);
            if (pl.trangThaiDich === 'CO_KICH_BAN' && !rHang.file_kich_ban && infoKb.fileId) fHang.file_kich_ban = TIEN_TO_DRIVE_JSON_ + infoKb.fileId;
            try {
              if (typeof docAiKT_ === 'function') {
                var oAkt = docAiKT_(rHang);
                oAkt.tu_sua_doc_de_lan = lanMoi;
                fHang.ai_kiem_tra = JSON.stringify(oAkt).slice(0, 1800);
              }
            } catch (eAkt2) {}
            ghi_(shHang, rHang._row, fHang, r.id);
          }
          nguon.tapIdBaoVe.add(r._ma);
          if (pl.trangThaiDich === 'CO_KICH_BAN' && infoKb.fileId) nguon.tapTepBaoVe.add(infoKb.fileId);
          nguon.tapIdLoi.delete(r._ma);
          if (pl.trangThaiDich === 'CHO_GIAI') kq.bp1++;
          else if (pl.trangThaiDich === 'CHO_KICH_BAN') kq.bp2++;
          else if (pl.trangThaiDich === 'CO_KICH_BAN') kq.bp3++;
          soDaSuaNhip++;
        }
      } catch (eDong) {
        if (eDong.message === HET_GIO_DON_VIDEO_) throw eDong;
        ghiLoiDonVideo_(kq, eDong, r.id);
      }
    }
    // Quét thêm thư mục Drive theo id lỗi đã xóa / LUU_TRU (trừ tapIdBaoVe) để không sót MP4 mồ côi
    if ((chayTay || kq.xoa > 0) && nguon.tapIdLoi.size > 0 && Date.now() + 15000 < han) {
      try {
        quetThuMucVideoLoi_(nguon, kq, han);
      } catch (eQuet) {
        if (eQuet.message === HET_GIO_DON_VIDEO_) kq.hetGio = true;
        else if (chayTay) ghiLoiDonVideo_(kq, eQuet, 'Quét thư mục Drive');
        else nhatKy_('XU_LY_LOI_DOC_DE', 'Bỏ qua quét thư mục Drive: ' + eQuet.message);
      }
    }
  } catch (e) {
    ghiLoiDonVideo_(kq, e, 'Xử lý lỗi DOC_DE');
  } finally {
    try { capNhatThanhThongKeDocDe_(shDoc); } catch (eTk) {}
  }
  return kq;
}

function tomTatXuLyLoi_(kq) {
  var tongSua = (kq.bp1 || 0) + (kq.bp2 || 0) + (kq.bp3 || 0);
  var dong = [
    'Đẩy sửa lại: ' + tongSua + ' bài (BP1: ' + (kq.bp1 || 0) + ', BP2: ' + (kq.bp2 || 0) + ', BP3: ' + (kq.bp3 || 0) + ')',
    'Đã xóa không sửa được: ' + (kq.xoa || 0) + ' bài',
    'Đã đưa vào Thùng rác Drive: ' + (kq.drive || 0) + ' file'
  ];
  if (kq.baoVe) dong.push('Đã bảo vệ: ' + kq.baoVe + ' mục trùng mã/file đang hoạt động');
  if (kq.trucTrac) dong.push('Có lỗi tạm khi thao tác Drive/Sheet (xem NHAT_KY).');
  if (kq.hetGio) dong.push('Đã dừng ở mốc an toàn 4.5 phút, hãy chạy thêm lượt 2 để xử lý tiếp.');
  return dong.join('\n');
}

function xuLyLoiTrenSheetNgay() {
  var han = Date.now() + GIOI_HAN_DON_VIDEO_MS_;
  var kq = voiKhoa_(5000, function () { return xuLyLoiDocDe_({chayTay: true, han: han}); });
  var tin = kq ? tomTatXuLyLoi_(kq) : 'Hệ thống đang bận, thử lại /xulyloi sau ít phút.';
  if (kq) nhatKy_('XU_LY_LOI_DOC_DE', tin.replace(/\n/g, ' | '));
  try { SpreadsheetApp.getActiveSpreadsheet().toast(tin, 'Video AI', 10); } catch (e) { Logger.log(tin); }
  return tin;
}

// Dọn: các đề DA_XONG + mọi đề không có đáp án chắc chắn (XOA, LOAI, đề mơ hồ chưa dựng video). Trả về số dòng đã dọn.
function donDaXong_(han) {
  han = han || Date.now() + GIOI_HAN_DON_VIDEO_MS_;
  var kqDon = voiKhoa_(15000, function () {
    try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(TEN_HANG_DOI);
    if (!sh) return 0;
    var gioLoi = Math.max(12, Number(cauHinh_('GIO_LUU_TRU_LOI')) || 48);
    var bayGio = Date.now();
    var tuoiGio = function (r) {
      var t = r.cap_nhat instanceof Date ? r.cap_nhat.getTime() : new Date(r.cap_nhat || 0).getTime();
      return isFinite(t) && t > 0 ? (bayGio - t) / 3600000 : 99999;
    };
    var xoa = docHang_(sh).filter(function (r) {
      if (r.tu_sua_cho || videoChoLuuTruLoi_(r)) return false;
      if (r.trang_thai === 'DA_XONG') return true;
      if (r.file_video || r.mp4_cho_xoa) return false;
      // đề không có đáp án chắc chắn: XOA (đã thử sửa mà không được), LOAI (lệch đáp án, kiểu cũ) -> xóa NGAY, không giữ lại
      if (r.trang_thai === 'XOA' || r.trang_thai === 'LOAI') return true;
      // đề cũ được làm theo "cách hiểu hợp lý" (DE_CO_VAN_DE) mà chưa dựng video: đáp án mơ hồ -> xóa (trừ đề người dùng tự gửi)
      if (/DE_CO_VAN_DE/.test(String(r.kiem_chung || '')) && !laUuTien_(r) && (r.trang_thai === 'DA_GIAI' || r.trang_thai === 'CO_KICH_BAN')) return true;
      if (/^(LOI|LOI_CAN_XEM)$/.test(r.trang_thai) && !laUuTien_(r) && tuoiGio(r) >= gioLoi) return true;
      return false;
    }).slice(0, 30);
    if (!xoa.length) return 0;

    // đề sản phẩm bị bỏ vì không đạt kiểm duyệt: sản phẩm sáng tác đề mới (NangCao.gs)
    xoa.forEach(function (r) { if (r.trang_thai === 'XOA' && typeof deMoiChoSanPhamBiBo_ === 'function') { try { deMoiChoSanPhamBiBo_(r); } catch (eSP) {} } });
    var lt = luuTruSheet_();
    var dong = xoa.map(function (r) {
      var nhanLt = r.trang_thai === 'DA_XONG' ? 'DA_LAM_VIDEO'
        : /^(LOI|LOI_CAN_XEM)$/.test(r.trang_thai) ? 'LOI_CU' : 'LOAI';
      return [r.ma_bam || bam_(r.de_bai), r.id, r.lop, String(r.de_bai).slice(0, 120), r.dap_an || '', nhanLt, new Date()];
    });
    lt.getRange(lt.getLastRow() + 1, 5, dong.length, 1).setNumberFormat('@');
    lt.getRange(lt.getLastRow() + 1, 1, dong.length, 7).setValues(dong);   // lưu mã băm TRƯỚC khi xóa

    xoa.forEach(function (r) {
      if (Date.now() + 10000 >= han) return;
      if (r.file_kich_ban) xuLyFileKichBan_(r.file_kich_ban, han);
      if (r.trang_thai === 'DA_XONG') xuLyFileVideo_(r.file_video, han);
      if (r.trang_thai === 'DA_XONG' || r.file_kich_ban) xoaKichBanKhoiSheet_(r.id);
      ['anh_kt', 'anh_bia'].forEach(function (cotAnh) {
        if (!r[cotAnh] || Date.now() + 10000 >= han) return;
        try {
          var anh = DriveApp.getFileById(String(r[cotAnh]));
          if (/^image\//i.test(anh.getMimeType()) && Date.now() < han) anh.setTrashed(true);
        } catch (eTr) {}
      });
    });
    xoa.map(function (r) { return r._row; }).sort(function (a, b) { return b - a; })
      .forEach(function (row) { sh.deleteRow(row); });   // xóa từ dưới lên để số dòng không bị lệch
    nhatKy_('DON_DEP', 'Đã dọn ' + xoa.length + ' đề (đã lưu mã vào ' + TEN_LUU_TRU + ')');
    return xoa.length;
    } catch (e) { Logger.log('DON_DEP: ' + e.message); return 0; }
  });
  return kqDon || 0;
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

  var n = 0, daDon = 0;
  var daLam = voiKhoa_(5000, function () {
    var q = ss.getSheetByName(TEN_HANG_DOI);
    docHang_(q).forEach(function (r) {
      if (ids[r.id] && (r.trang_thai === 'CO_VIDEO' || r.trang_thai === 'CO_KICH_BAN' || r.trang_thai === 'DA_DANG')) { ghi_(q, r._row, { trang_thai: 'DA_XONG' }); n++; }
    });
    daDon = donDaXong_();
    return true;
  });
  if (!daLam) { ui.alert('Hệ thống đang chạy, hãy thử lại sau ít phút.'); return; }
  dongBoBangDoc();
  ss.toast('Đã đánh dấu ' + n + ' đề (chỉ đề có trạng thái "Có kịch bản" mới đánh dấu được); đã dọn ' + daDon + ' dòng.', 'Video AI', 8);
}

// Menu: dọn ngay các đề đã mang trạng thái DA_XONG (ví dụ do Bộ phận 2 hoặc bạn gõ tay vào HANG_DOI).
function donNgay() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var n = donDaXong_();
  dongBoBangDoc();
  ss.toast('Đã dọn ' + n + ' dòng.', 'Video AI', 5);
}
function caiDatTriggerDon() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'chayDonDep') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('chayDonDep').timeBased().everyMinutes(15).create();
}

function chayDonDep() {
  var han = Date.now() + GIOI_HAN_DON_VIDEO_MS_;
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(5000)) return;   // đang có lần chạy chính thì bỏ qua
  _GIU_KHOA_++;
  var canVe = false, tinDon = '', chatDon = '';
  try {
    var p = PropertiesService.getScriptProperties();
    var dotDon = p.getProperty('DOT_DON_VIDEO_LOI');
    if (dotDon) {
      chatDon = JSON.parse(dotDon).chat;
      var kq = donVideoLoiVaLuuTru_(han, true);
      tinDon = tomTatDonVideoLoi_(kq);
      p.deleteProperty('DOT_DON_VIDEO_LOI');
      nhatKy_('DON_VIDEO_LOI', tinDon);
    } else {
      donDepHotSheetDinhKy(han);
      if (Date.now() + 15000 < han) {
        var can = p.getProperty('CAN_DONG_BO') === '1';
        if (donDaXong_(han) > 0 || can) { p.deleteProperty('CAN_DONG_BO'); canVe = true; }
        if (typeof kiemVaDonScriptProperties_ === 'function') kiemVaDonScriptProperties_();
      }
    }
  } finally { _GIU_KHOA_--; khoa.releaseLock(); }
  // Vẽ lại bảng DOC_DE / DOC_KICH_BAN bên ngoài khóa để không bao giờ chặn lệnh Zalo của người dùng
  if (tinDon && chatDon) guiZaloToi_(chatDon, tinDon);
  if (canVe && Date.now() + 15000 < han) dongBoBangDoc();
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
  if (s.indexOf('SO_CANH_VIDEO_DAI') === 0) return s;
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
  return /\[VIDEO_DAI_10P\]|DAI_10_PHUT|CHUYEN_DE_10P|\[10\s*PHÚT\]|-10P(?=\b|$|\s)/i.test(
    String(r.id || '') + ' ' + String(r.kiem_chung || '') + ' ' + String(r.chu_de || '') + ' ' + String(r.nguon || '')
  );
}

// Tự động kiểm tra và sinh mỗi ngày đúng 1 đề Video Dài 10 Phút để dựng và đăng lên YouTube
function tuDongSinhVideoDaiMoiNgay_(sh, bc) {
  if (String(cauHinh_('VIDEO_10P_MOI_NGAY') || 'BAT').toUpperCase() === 'TAT') return;
  if (!conDuGoiGemini_()) return;
  var ngay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var maNgay = ngay.slice(2); // yyMMdd
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('DA_SINH_10P_NGAY') === ngay) return;
  var hang = docHang_(sh);
  // Kiểm tra hôm nay đã sinh video 10 phút nào chưa, hoặc có video 10 phút nào đang nằm trong luồng sản xuất chưa
  var daCoHomNay = hang.some(function (r) {
    if (!laVideoDai_(r)) return false;
    if (String(r.id || '').indexOf(maNgay) >= 0) return true;
    return ['MOI', 'DA_GIAI', 'GITHUB', 'CO_KICH_BAN', 'DANG_DUNG'].indexOf(String(r.trang_thai || '')) >= 0;
  });
  if (daCoHomNay) {
    p.setProperty('DA_SINH_10P_NGAY', ngay);
    return;
  }
  var tb = taoDeVideoDai10Phut_('', '', true);
  var hangSau = docHang_(sh);
  var daTaoDuoc = hangSau.some(function (r) { return laVideoDai_(r) && String(r.id || '').indexOf(maNgay) >= 0; });
  if (!daTaoDuoc || /^⚠️/.test(String(tb || ''))) {
    nhatKy_('VIDEO_10P_LOI', 'Chưa tạo được chuyên đề 10 phút hôm nay: ' + String(tb).slice(0, 180));
    return;
  }
  p.setProperty('DA_SINH_10P_NGAY', ngay);
  if (bc) bc.moi = (bc.moi || 0) + 1;
  nhatKy_('VIDEO_10P', 'Đã tự động khởi tạo 1 chuyên đề Video Dài 10 Phút của ngày ' + ngay + ' cho YouTube');
}

// Tạo đề bài & yêu cầu sản xuất video bài giảng chuyên đề dài 10 phút (~540-660 giây, 42-50 cảnh) cho YouTube
function taoVideoDaiZalo_(chat, chu) {
  var yeuCau = String(chu || '').replace(/^\s*\/(videodai|10phut|youtube10p)\s*/i, '').trim();
  var kq = taoDeVideoDai10Phut_(yeuCau, chat, false);
  return kq;
}

function taoVideoDai10Phut() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tb = taoDeVideoDai10Phut_('', '', false);
  try { ss.toast(tb, 'Video AI 10 Phút', 8); } catch (e) {}
  Logger.log(tb);
  return tb;
}

function taoDeVideoDai10Phut_(goiYChuDe, chat, laTuDongNgay) {
  _bat_dau_chay_ = Date.now();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEN_HANG_DOI);
  if (!sh) return '⚠️ Không tìm thấy sheet HANG_DOI.';
  var p = PropertiesService.getScriptProperties();
  var dsLop = ['12', '11', '10'];
  var idxLop = Number(p.getProperty('LOP_10P_KE') || 0) % 3;
  var lop = dsLop[idxLop];
  p.setProperty('LOP_10P_KE', String(idxLop + 1));
  var mLop = /(?:lớp|toán)\s*(10|11|12)\b/i.exec(String(goiYChuDe || ''));
  if (mLop) lop = mLop[1];
  var hang = docHang_(sh);
  var daCo = hang.filter(laVideoDai_).slice(-20).map(function (r) { return '- ' + r.chu_de + ': ' + String(r.de_bai).slice(0, 90); }).join('\n');
  var ktLop = typeof yeuCauKienThucLop_ === 'function' ? yeuCauKienThucLop_(lop, 'THUC_TE') : '';
  var prompt = 'Bạn là giáo viên luyện thi Toán THPT xuất sắc tại Việt Nam. Hãy thiết kế MỘT BÀI TOÁN TRỌNG TÂM THỰC CHIẾN mức 8,5 - 9,5 điểm (lớp ' + lop + ') ' +
    (goiYChuDe ? 'theo chủ đề/yêu cầu: "' + goiYChuDe + '"' : 'thuộc dạng Toán thực tế tối ưu / chuyển động / hình học / xác suất vận dụng cao thường gặp trong đề thi giữa kỳ, cuối kỳ và THPT Quốc gia') +
    ' để làm hạt nhân cho VIDEO BÀI GIẢNG CHUYÊN ĐỀ DÀI 10 PHÚT trên YouTube.\n' +
    (ktLop ? ktLop + '\n' : '') +
    'YÊU CẦU:\n' +
    '- Đề bài rõ ràng, có bối cảnh thực tế hấp dẫn, số liệu khớp tuyệt đối và có ĐÚNG MỘT đáp số.\n' +
    (daCo ? '- Không trùng các chuyên đề đã làm:\n' + daCo + '\n' : '') +
    '- Trả JSON: {"lop":"' + lop + '","mon":"THUC_TE|XAC_SUAT|HINH_HOC","chu_de":"Chuyên đề 10 phút: <tên ngắn gọn>","de_bai":"toàn bộ đề bài gốc","dap_an":"con số hoặc phân số","yeu_to_tu_duy":"bản chất toán học và phương pháp nhận diện dạng bài","bay_thuong_gap":"sai lầm học sinh hay mắc phải trong phòng thi"}';
  var d = goiGemini_(prompt, 0.35, { suyNghi: 'low' });
  if (!d || !d.de_bai) return '⚠️ Chưa sinh được đề chuyên đề 10 phút, hãy thử lại.';
  var mb = bam_(d.de_bai);
  var daBam = docMaBamLuuTru_();
  hang.forEach(function (r) { if (r.ma_bam) daBam[r.ma_bam] = true; });
  if (daBam[mb]) return '⚠️ Đề chuyên đề vừa sinh bị trùng với bài đã có, hãy thử lại.';
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
    uu_tien: laTuDongNgay ? '' : 1,
    zalo_chat: chat || '',
    cap_nhat: new Date(),
    ma_bam: mb
  };
  voiKhoa_(10000, function () { themHang_(sh, obj); SpreadsheetApp.flush(); });
  if (!laTuDongNgay) {
    try { if (typeof henUuTien_ === 'function') henUuTien_(15); } catch (eH) {}
  }
  return '🎓 Đã tạo chuyên đề Video Dài 10 Phút YouTube (' + id + ' - Lớp ' + obj.lop + '):\n📌 Chủ đề: ' + obj.chu_de + '\n📖 Đề trọng tâm: ' + obj.de_bai.slice(0, 220) + '...\n⏳ Hệ thống đang giải kiểm chứng và viết kịch bản 5 chương (~45 cảnh, ~10 phút) để dựng video học tập và chỉ đăng lên YouTube.';
}

// Tự động đồng bộ toàn bộ 10 tệp .gs (bao gồm KhoKey.gs) và tệp kê khai appsscript.json (giữ nguyên mọi Dịch vụ/Thư viện như YouTube, YouTubeAnalytics) từ nhánh master trên GitHub thẳng vào dự án Google Apps Script hiện tại
var DANH_SACH_TEP_GS_ = ['BoPhan1', 'PromptKichBan', 'KiemTraHinh', 'HinhHoc', 'BoPhan2', 'NangCao', 'DangVideo', 'SanPham', 'ZaloDeBai', 'KhoKey', 'SanKhau', 'BoNaoDieuPhoi'];   // v96: + SanKhau.gs (lần đầu cần bấm đồng bộ 2 lần)
function capNhatMaAppsScriptTuGitHub() {
  Logger.log('🚀 [BƯỚC 1/4] Bắt đầu đồng bộ mã từ GitHub...');
  var p = PropertiesService.getScriptProperties();
  var repo = p.getProperty('GITHUB_REPO') || 'tpham9299-ui/Video-AI';
  var nhanh = String(cauHinh_('GITHUB_NHANH') || 'master').trim();
  if (!nhanh || nhanh === '-') nhanh = 'master';
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
    var source = res.getContentText();
    if (ten === 'PromptKichBan') {
      var pc = JSON.parse(UrlFetchApp.fetch(urlRaw.replace(/PromptKichBan\.gs$/, 'phong_cach.json'), {headers: headersGh}).getContentText());
      source = source.replace(/var TEN_THUONG_HIEU_;/, 'var TEN_THUONG_HIEU_ = ' + JSON.stringify(pc.thuongHieu.ten) + ';');
    }
    filesMoi.push({ name: ten, type: 'SERVER_JS', source: source });
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
      try {
        var shaRes = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/commits/' + encodeURIComponent(nhanh), { headers: headersGh, muteHttpExceptions: true });
        if (shaRes.getResponseCode() === 200) {
          var shaObj = JSON.parse(shaRes.getContentText() || '{}');
          if (shaObj && shaObj.sha) p.setProperty('GITHUB_SHA_DA_DONG_BO', String(shaObj.sha));
        }
      } catch (eSha) {}
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


/* ===================== ĐỒNG BỘ TỰ ĐỘNG & SINH ĐỀ TRÊN GITHUB (BO PHAN 0) ===================== */

// Kiểm tra commit mới trên GitHub tối đa 30 phút/lần: nếu có bản cập nhật mới và đã cấp quyền Script API thì tự đồng bộ ngầm.
function tuDongDongBoCodeTuGitHub_() {
  var c = CacheService.getScriptCache();
  if (c.get('KT_SHA_GITHUB')) return;
  try {
    var p = PropertiesService.getScriptProperties();
    var repo = p.getProperty('GITHUB_REPO') || 'tpham9299-ui/Video-AI';
    var nhanh = String(cauHinh_('GITHUB_NHANH') || 'master').trim();
    if (!nhanh || nhanh === '-') nhanh = 'master';
    if (/^claude\//i.test(nhanh)) nhanh = 'master';
    var tokenGh = p.getProperty('GITHUB_TOKEN') || '';
    var res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/commits/' + encodeURIComponent(nhanh), {
      headers: tokenGh ? { Authorization: 'Bearer ' + tokenGh, Accept: 'application/vnd.github+json' } : { Accept: 'application/vnd.github+json' },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      c.put('KT_SHA_GITHUB', '1', 180);
      return;
    }
    var d = JSON.parse(res.getContentText() || '{}');
    if (!d || !d.sha || d.sha === p.getProperty('GITHUB_SHA_DA_DONG_BO')) {
      c.put('KT_SHA_GITHUB', '1', 1800);
      return;
    }
    var kq = capNhatMaAppsScriptTuGitHub();
    if (typeof kq === 'string' && /THÀNH CÔNG/i.test(kq)) {
      p.setProperty('GITHUB_SHA_DA_DONG_BO', String(d.sha));
      c.put('KT_SHA_GITHUB', '1', 1800);
      nhatKy_('TU_DONG_CAP_NHAT', 'Đã tự đồng bộ mã mới (' + String(d.sha).slice(0, 7) + ') từ GitHub về Apps Script');
    } else {
      c.put('KT_SHA_GITHUB', '1', 300);
    }
  } catch (eSync) {
    c.put('KT_SHA_GITHUB', '1', 180);
  }
}

function chanNguonBoNao_(hang) {
  var homNay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var p = PropertiesService.getScriptProperties();
  var can10p = String(cauHinh_('VIDEO_10P_MOI_NGAY') || 'BAT').toUpperCase() !== 'TAT' && p.getProperty('DA_SINH_10P_NGAY') !== homNay;
  var dangCho = hang.filter(function (r) { return (r.trang_thai === 'MOI' && !!String(r.de_bai || '').trim()) || r.trang_thai === 'DA_GIAI' || r.trang_thai === 'GITHUB'; }).length;
  var chiTieuDat = Math.max(1, Number(cauHinh_('CHI_TIEU_VIDEO_DAT_NGAY')) || 3);
  var hsSX = typeof heSoSanXuat_ === 'function' ? heSoSanXuat_() : { he_so: 1 };
  var thieuCho = demVideoDatHomNay_(hang) < chiTieuDat && dangCho < Math.min(10, Math.round(Number(cauHinh_('NGUONG_HANG_DOI')) * hsSX.he_so));
  if (!can10p && !thieuCho) return 'đã đủ chỉ tiêu ngày hoặc đủ hàng nguồn';
  var choDung = hang.filter(function (r) { return r.trang_thai === 'CO_KICH_BAN' || r.trang_thai === 'DANG_DUNG'; }).length;
  var toiDaCho = Number(cauHinh_('TOI_DA_CHO_DUNG_VIDEO'));
  if (!can10p && toiDaCho > 0 && choDung >= toiDaCho) return 'đã đủ hàng chờ dựng (' + choDung + ')';

  return '';
}

// Giao BP0 sau khi bộ điều phối đã kiểm tra hạn mức và giữ chỗ.
function sinhDeQuaGitHub_(sh, bc) {
  if (String(cauHinh_('CHE_DO_NGUON') || '') === 'KHO_DE') return false;
  var hang = docHang_(sh);
  var p = PropertiesService.getScriptProperties();
  if (chanNguonBoNao_(hang)) return false;

  var ch = {};
  var chSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEN_CAU_HINH);
  if (chSh) chSh.getDataRange().getValues().slice(1).forEach(function (x) {
    var k = String(x[0] || '').trim();
    if (k && String(x[1]) !== '' && !/TOKEN|SECRET|KEY|MAT_KHAU|PASS|CLIENT/i.test(k)) ch[k] = String(x[1]).slice(0, 1000);
  });
  // v99.2: gửi ĐỦ mọi bộ đếm xoay vòng của BP0 (MON_KE_KHAC / HH_KE / KHUON_KE_* / NHOM_KE_* bị bỏ quên ở v99.1 -> không bao giờ ra HINH_HOC)
  var propsGui = {};
  var tatCaP = p.getProperties ? p.getProperties() : {};
  Object.keys(tatCaP).forEach(function (k) { if (laKhoaDemBP0_(k)) propsGui[k] = String(tatCaP[k]); });
  KHOA_DEM_BP0_.forEach(function (k) { if (propsGui[k] === undefined && p.getProperty(k) !== null) propsGui[k] = String(p.getProperty(k)); });
  var duLieu = JSON.stringify({
    lan_giao: p.getProperty('BP0_GIU_DEN'),
    cau_hinh: ch,
    props: propsGui,
    gan_day: hang.slice(-40).map(function (r) { return { id: r.id, trang_thai: r.trang_thai, chu_de: String(r.chu_de || '').slice(0, 60), de_bai: String(r.de_bai || '').slice(0, 120), ma_bam: r.ma_bam || '', mon: r.mon || '', nguon: String(r.nguon || '').slice(0, 60) }; }),
    ma_bam: Object.keys(docMaBamLuuTru_()).slice(-120).concat(hang.map(function (r) { return r.ma_bam; }).filter(Boolean).slice(-120))
  });
  if (duLieu.length <= 60000 && typeof guiWorkflowGitHub_ === 'function') {
    var gh = guiWorkflowGitHub_({ mon: ch.CHU_DE_VIDEO || 'XEN_KE', du_lieu: duLieu }, 'sinh-de.yml');
    if (gh && gh.ok) {
      nhatKy_('SINH_DE_GH', 'Đã giao Bộ phận 0 (sinh-de.yml) tìm/sáng tác đề mới trên GitHub');
      return true;
    }
  }
  throw new Error(gh ? gh.loi : 'Dữ liệu BP0 vượt giới hạn dispatch');
}

// Nhận đề mới từ sinh-de.yml (doPost loai = 'them_de'), lưu vào Sheet rồi đẩy ngay vào Bộ phận 1 (bo-phan-1.yml)
function nhanThemDeTuGitHub_(sh, d) {
  var props = PropertiesService.getScriptProperties();
  if (d.lan_giao && String(d.lan_giao) === props.getProperty('BP0_GIU_DEN'))
    props.setProperty('BP0_GIU_DEN', String(Date.now() + 60000));
  (d.nhat_ky || []).slice(-20).forEach(function (x) { nhatKy_(x[1], '[GitHub] ' + x[2]); });
  if (d.loi) nhatKy_('SINH_DE_GH_LOI', String(d.loi).slice(0, 200));
  var p = PropertiesService.getScriptProperties();
  if (d.lop_ke !== null && d.lop_ke !== undefined) p.setProperty('LOP_KE', String(d.lop_ke));
  if (d.mon_ke !== null && d.mon_ke !== undefined) p.setProperty('MON_KE', String(d.mon_ke));
  if (d.lop_10p !== null && d.lop_10p !== undefined) p.setProperty('LOP_10P_KE', String(d.lop_10p));
  // v99.2: ghi lại MỌI bộ đếm BP0 GitHub trả về (trừ DA_SINH_10P_NGAY: chỉ ghi khi thật sự nhận đề 10 phút, xem dưới)
  if (d.dem && typeof d.dem === 'object') Object.keys(d.dem).forEach(function (k) {
    if (k !== 'DA_SINH_10P_NGAY' && typeof laKhoaDemBP0_ === 'function' && laKhoaDemBP0_(k) && d.dem[k] !== null && d.dem[k] !== undefined) p.setProperty(k, String(d.dem[k]).slice(0, 40));
  });
  var dsDe = Array.isArray(d.de) ? d.de : [];
  if (!dsDe.length) return { ok: true, them: 0 };
  var daBam = docMaBamLuuTru_();
  var hangHien = docHang_(sh);
  hangHien.forEach(function (r) { if (r.ma_bam) daBam[r.ma_bam] = true; });
  var them = 0, them10p = false;
  dsDe.forEach(function (item) {
    if (!item || !item.de_bai) return;
    var mb = item.ma_bam || bam_(item.de_bai);
    if (daBam[mb]) return;
    daBam[mb] = true;
    item.ma_bam = mb;
    item.trang_thai = 'MOI';
    item.cap_nhat = new Date();
    themHang_(sh, item);
    if (laVideoDai_(item)) them10p = true;
    them++;
  });
  if (d.ngay_10p && them10p) p.setProperty('DA_SINH_10P_NGAY', String(d.ngay_10p));
  if (them > 0) {
    SpreadsheetApp.flush();
    nhatKy_('SINH_DE_GH', 'Đã nhận ' + them + ' đề mới từ Bộ phận 0 -> đẩy ngay sang Bộ phận 1 (bo-phan-1.yml)');

    p.setProperty('CAN_DONG_BO', '1');
  }
  return { ok: true, them: them };
}

/* ===================== v98: ĐỘNG CƠ LEGO — lời gọi có responseSchema + 1 vòng tự vá (Lớp 1 + Lớp 3) ===================== */
// schema chỉ dùng cho lời gọi riêng (đặc tả hình 3D); model không nhận responseSchema (400) -> nhớ 6 giờ, gọi lại không schema
// (Lớp 2 Python vẫn chặn mọi sai tên trường / kiểu dữ liệu).
function goiGeminiSchema_(prompt, nhiet, schema, opts) {
  var o = {};
  for (var k in (opts || {})) o[k] = opts[k];
  delete o.anh; delete o.anhs;
  o.schema = schema;
  var kq = goiGemini_(prompt, nhiet, o);
  return kq && kq.hinh_khong_gian && !Array.isArray(kq.doi_tuong) ? kq.hinh_khong_gian : kq;
}

function laLegoKb_(kb) {
  var h = kb && kb.hinh_khong_gian;
  return !!(h && typeof h === 'object' && (String(h.phien_ban) === '2' || Array.isArray(h.doi_tuong)));
}

// Tìm ĐÚNG mục JSON gây lỗi (điểm theo tên, khối theo id, mệnh đề / số đo theo loại) để gửi Gemini vá — không gửi lại cả kịch bản
function timMucLoiLego_(hkg, loi) {
  var ra = [], da = {};
  var them = function (nhom, khoa, muc) { var k = nhom + '|' + khoa; if (!da[k] && muc) { da[k] = 1; ra.push({nhom: nhom, khoa: khoa, muc: muc}); } };
  var co = function (s, tu) { return new RegExp('(^|[^A-Za-z0-9_])' + String(tu).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-z0-9_])').test(s); };
  (loi || []).forEach(function (x) {
    var s = String(x.chi_tiet || '') + ' ' + String(x.ma || '');
    (hkg.diem || []).forEach(function (d) { if (d && d.ten && (co(s, 'điểm ' + d.ten) || co(s, "'" + d.ten + "'"))) them('diem', d.ten, d); });
    (hkg.doi_tuong || []).forEach(function (o) { if (o && o.id && co(s, o.id)) them('doi_tuong', o.id, o); });
    if (/^KG_SAI_SO_DO/.test(x.ma)) (hkg.so_do || []).forEach(function (d, i) { if (d && s.indexOf(String(d.loai)) >= 0) them('so_do', String(i), d); });
    if (/^KG_MENH_DE_SAI/.test(x.ma)) (hkg.menh_de || []).forEach(function (d, i) { if (d && s.indexOf(String(d.loai)) >= 0 && (!d.diem || co(s, d.diem))) them('menh_de', String(i), d); });
  });
  return ra.slice(0, 6);
}

function schemaVaLego_() {
  return {type: 'OBJECT', properties: {sua: {type: 'ARRAY', items: {type: 'OBJECT', properties: {
    nhom: {type: 'STRING', enum: ['diem', 'doi_tuong', 'menh_de', 'so_do']}, khoa: {type: 'STRING'}, moi_json: {type: 'STRING'}}, required: ['nhom', 'khoa', 'moi_json']}}}, required: ['sua']};
}

// Lớp 3: gửi đúng các mục lỗi + thông báo ngắn -> Gemini trả bản thay thế từng mục (moi_json; "" = xóa) -> ghép vào đặc tả
function vaLego_(kb, r, sn, loi) {
  var hkg = kb.hinh_khong_gian;
  var muc = timMucLoiLego_(hkg, loi);
  var prompt = 'Máy kiểm chứng đặc tả hình 3D (động cơ Lego) của bài toán sau báo lỗi. Sửa ĐÚNG các mục JSON lỗi dưới đây, không đụng phần khác.\n' +
    'ĐỀ: ' + String((r && r.de_bai) || kb.de_bai || '') + '\nĐÁP ÁN: ' + String((r && r.dap_an) || kb.dap_an_cuoi || '') + '\n' +
    'LỖI:\n' + loi.slice(0, 6).map(function (x) { return '- ' + x.ma + ': ' + String(x.chi_tiet).slice(0, 220) + (x.goi_y ? ' (gợi ý: ' + String(x.goi_y).slice(0, 160) + ')' : ''); }).join('\n') + '\n' +
    'MỤC JSON LỖI (nhom | khoa | json):\n' + (muc.length ? muc.map(function (m) { return m.nhom + ' | ' + m.khoa + ' | ' + JSON.stringify(m.muc); }).join('\n') : '(không xác định được mục: kiểm lại so_do / menh_de)\n' +
      'so_do | * | ' + JSON.stringify(hkg.so_do || []) + '\nmenh_de | * | ' + JSON.stringify(hkg.menh_de || [])) + '\n' +
    'Tên điểm đã khai báo: ' + (hkg.diem || []).map(function (d) { return d && d.ten; }).filter(Boolean).join(', ') + '. Điểm suy diễn chỉ ghi QUAN HỆ (không tọa độ). ' +
    'Trả {"sua":[{"nhom","khoa","moi_json":"JSON của mục thay thế (giữ nguyên khóa ten / id)" hoặc "" để xóa mục}]}.';
  var kq = null;
  try { kq = goiGeminiSchema_(prompt, 0.2, schemaVaLego_(), sn); }
  catch (e) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(e.message))) throw e; return null; }
  if (!kq || !Array.isArray(kq.sua) || !kq.sua.length) return null;
  var moi = JSON.parse(JSON.stringify(hkg)), dem = 0;
  kq.sua.forEach(function (s) {
    var ds = moi[s.nhom];
    if (!Array.isArray(ds)) return;
    var i = -1;
    if (s.nhom === 'diem') ds.forEach(function (d, j) { if (d && d.ten === s.khoa) i = j; });
    else if (s.nhom === 'doi_tuong') ds.forEach(function (d, j) { if (d && d.id === s.khoa) i = j; });
    else if (/^\d+$/.test(String(s.khoa))) i = Number(s.khoa);
    var m = null;
    if (String(s.moi_json || '').trim()) { try { m = JSON.parse(s.moi_json); } catch (e) { return; } }
    if (i < 0 && m) { ds.push(m); dem++; return; }
    if (i < 0) return;
    if (m) ds[i] = m; else ds.splice(i, 1);
    dem++;
  });
  return dem ? moi : null;
}

// Lớp 3 dự phòng tất định (0 tốn API): ưu tiên gọi scripts/du_phong_t2.py qua duPhongT2May_; nếu chạy trên Apps Script thuần
// không có Python thì sinh khung Python kho_manh_svg tối giản chuẩn sandbox để chuanbi.py dựng thẳng.
function tuCuuTang2_(kb, r, lyDo) {
  if (!kb || typeof kb !== 'object') return false;
  r = r || {};
  if (!kb.khung4tang || typeof kb.khung4tang !== 'object') kb.khung4tang = {};
  if (!Array.isArray(kb.khung4tang.buoc) || kb.khung4tang.buoc.length < 3) {
    var dsCanh = Array.isArray(kb.canh) ? kb.canh : [];
    var nhanMd = ['PHÂN TÍCH ĐỀ', 'THIẾT LẬP', 'TÍNH TOÁN', 'KẾT LUẬN'];
    var soB = Math.max(3, Math.min(4, dsCanh.length || 3));
    kb.khung4tang.buoc = [];
    for (var bi = 0; bi < soB; bi++) {
      var cc = dsCanh[Math.min(bi, Math.max(0, dsCanh.length - 1))] || {};
      kb.khung4tang.buoc.push({
        nhan: nhanMd[bi] || ('BƯỚC ' + (bi + 1)),
        tieu_de: String(cc.tieu_de_canh || nhanMd[bi] || 'Lời giải').slice(0, 40),
        khi_noi: String(cc.loi_thoai || '').trim().split(/\s+/).slice(0, 4).join(' '),
        canh: Math.min(bi + 1, Math.max(1, dsCanh.length)),
        the: []
      });
    }
  }
  var kq = null;
  if (typeof duPhongT2May_ === 'function') {
    try { kq = duPhongT2May_(kb); } catch (eDp) { kq = null; }
  }
  if (!kq || !kq.ok || !kq.tu_sinh || !kq.tu_sinh.ma) {
    var maMau = typeof mauTuSinhToiGian_ === 'function' ? mauTuSinhToiGian_(kb, r) :
      'import kho_manh_svg as km\ndef ve():\n    return [{"buoc":0,"svg":km.nguoi_que_gai_dau(210,272,scale=1.24,nhan="Đọc đề"),"hieu_ung":"moc","nhom":"nv"},{"buoc":0,"svg":km.bieu_do_loi_nhuan(585,272,scale=1.26,nhan="Mô hình"),"hieu_ung":"moc","nhom":"mh"},{"buoc":1,"svg":km.nguoi_que_chi_bang(210,272,scale=1.24,nhan="Lập hướng"),"hieu_ung":"no","nhom":"nv"},{"buoc":1,"svg":km.bieu_do_loi_nhuan(585,272,scale=1.26,nhan="Phân tích",mau="la"),"hieu_ung":"ve","nhom":"mh"},{"buoc":2,"svg":km.nguoi_que_hoan_ho(210,272,scale=1.24,nhan="Chốt đáp án"),"hieu_ung":"sang","nhom":"nv"},{"buoc":2,"svg":km.bieu_do_loi_nhuan(585,272,scale=1.26,nhan="Kết quả",mau="ket"),"hieu_ung":"sang","nhom":"mh"}]\n';
    kq = {ok: true, tu_sinh: {ma: maMau, mo_ta: 'Tự cứu Tầng 2 tất định (kho_manh_svg)', tu_cuu_t2: true}, so_lop: 6, manh: 'kho_manh_svg', tu_cuu_t2: true};
  }
  kb.san_khau_dich = 'tu_sinh_svg';
  delete kb.khung4tang.canh_3d_vector;
  if (kb.khung4tang.san_khau && kb.khung4tang.san_khau.loai !== 'tu_sinh_svg') delete kb.khung4tang.san_khau;
  kb.khung4tang.tu_sinh = kq.tu_sinh;
  kb.khung4tang.tu_sinh.tu_cuu_t2 = true;
  kb.tu_cuu_t2 = true;
  kb.tu_sinh_da_thu = true;
  delete kb.tu_sinh_hong;
  nhatKy_('TU_CUU_T2', ((r && r.id) || kb.id || '') + ': tu_cuu_t2: true | nguồn=' + String(lyDo || 't2_trong') + ' | mảnh=' + String(kq.manh || '') + ' (' + String(kq.so_lop || 0) + ' lớp, 0 tốn API)');
  return true;
}

// v99.1: sân khấu tự sinh 2.5D: xin mã Python (lời gọi riêng, JSON) -> kiểm hộp cát (kiemTuSinhMay_) -> lỗi thì gửi lại ĐÚNG
// thông báo lỗi để Gemini sửa (opts.toiDaVa giới hạn số lần vá bổ sung, opts.mauNgan bơm khung mẫu kho_manh_svg < 15 dòng). Trả true nếu gắn được.
function lapTuSinh_(kb, r, sn, opts) {
  opts = opts || {};
  kb.tu_sinh_da_thu = true;
  var goi = function (p) {
    var schema = schemaGiaiBP1_('ma');
    schema.properties.mo_ta = {type: 'STRING'};
    var kq = goiGemini_(p, 0.35, {cheDo: 'nang', schema: schema});
    if (typeof kq === 'string') { try { kq = JSON.parse(String(kq).replace(/^```(?:json)?|```$/g, '')); } catch (e) { kq = null; } }
    return kq && typeof kq.ma === 'string' && kq.ma.trim() ? kq : null;
  };
  var mauNganStr = opts.mauNgan && typeof mauTuSinhToiGian_ === 'function'
    ? '\n\nKHUNG MẪU TỐI GIẢN (< 15 dòng, dùng sẵn kho_manh_svg — điền trúng cấu trúc, KHÔNG tự bịa path dài):\n```python\n' + mauTuSinhToiGian_(kb, r) + '\n```'
    : '';
  var ts = goi(huongDanTuSinh_(kb, r) + mauNganStr);
  if (!ts) { nhatKy_('TU_SINH_SVG', ((r && r.id) || '') + ': Gemini không trả mã'); return false; }
  kb.khung4tang.tu_sinh = {ma: ts.ma, mo_ta: String(ts.mo_ta || '').slice(0, 160)};
  var may = typeof kiemTuSinhMay_ === 'function' ? kiemTuSinhMay_ : null;
  var m = null;
  try { m = may ? may(kb) : null; } catch (e1) { m = null; }
  // v99.2: hợp đồng BP0 san_khau_dich = tu_sinh_svg -> mặc định vá tối đa 2 lần; khi gọi từ nhánh cứu KHUNG4TANG_3D_RONG/t2_trong -> opts.toiDaVa giới hạn số lần gọi AI (<= 1 lần sửa).
  var ep = kb.san_khau_dich === 'tu_sinh_svg' || (typeof thucTeNgan_ === 'function' && thucTeNgan_(kb, r));
  var soVa = typeof opts.toiDaVa === 'number' ? Math.max(0, opts.toiDaVa) : (ep ? 2 : 1), nhatKyLoi = [];
  for (var lanVa = 0; lanVa < soVa && m && !m.ok && conDuGoiGemini_(); lanVa++) {
    nhatKyLoi.push('lần ' + (lanVa + 1) + ': ' + String(m.loi || '').slice(0, 200));
    var maTruoc = kb.khung4tang.tu_sinh.ma;
    var sua = goi(huongDanTuSinh_(kb, r) + mauNganStr + '\n\nMÃ TRƯỚC BỊ MÁY TỪ CHỐI. NHẬT KÝ LỖI:\n' + nhatKyLoi.join('\n') + '\nMÃ TRƯỚC:\n' + String(maTruoc).slice(0, 12000) +
      '\nSửa đúng lỗi đó, giữ phần còn lại (ưu tiên dùng hàm kho_manh_svg hoặc ve25d có sẵn: nhan() tự tránh nét, chu() đủ cỡ, MAU[...] theo theme).');
    if (!sua) break;
    kb.khung4tang.tu_sinh = {ma: sua.ma, mo_ta: String(sua.mo_ta || ts.mo_ta || '').slice(0, 160)};
    try { m = may(kb); } catch (e2) { m = null; }
  }
  if (m && !m.ok) {
    if (!ep) delete kb.khung4tang.tu_sinh;   // hợp đồng tu_sinh_svg: giữ mã lỗi để chuanbi.py vá tiếp (hoặc tự cứu Lớp 3)
    var lyDoTs = 'mã vẫn lỗi sau ' + soVa + ' lần vá (' + String(m.loi || '').slice(0, 120) + ')';
    if (ep) {
      kb.tu_sinh_hong = lyDoTs;
      nhatKy_('TU_SINH_HONG', ((r && r.id) || '') + ': hợp đồng tu_sinh_svg nhưng ' + lyDoTs + ' -> chuyển lớp tự cứu Tầng 2');
    } else nhatKy_('TU_SINH_SVG', ((r && r.id) || '') + ': ' + lyDoTs + ' -> giữ sân khấu cũ');
    return false;
  }
  delete kb.tu_sinh_hong;
  nhatKy_('TU_SINH_SVG', ((r && r.id) || '') + ': gắn sân khấu tự sinh' + (m ? ' (' + m.so_lop + ' lớp)' : ' (chưa kiểm máy - chuanbi.py kiểm lại)'));
  return true;
}

// Lập đặc tả Lego cho kịch bản đã có lời (pass 2, schema) + Auto-fix + kiểm máy + vá tối đa 1 lần. Trả true nếu gắn được.
function lapLego_(kb, r, sn) {
  if (!kb || !Array.isArray(kb.canh) || kb.lego_da_thu || typeof schemaLego_ !== 'function') return false;
  kb.lego_da_thu = true;
  var hkg = null;
  try { hkg = goiGeminiSchema_(huongDanLego_(kb, r), 0.3, schemaLego_(), sn); }
  catch (e) { if (/^(HET_HAN_MUC|QUA_TAI|HET_GIO|KHO_GITHUB_KHONG_KHA_DUNG)$/.test(String(e.message))) throw e; hkg = null; }
  if (!hkg || !Array.isArray(hkg.doi_tuong) || !Array.isArray(hkg.buoc)) { nhatKy_('LEGO_3D', ((r && r.id) || '') + ': Gemini không trả đặc tả Lego hợp lệ'); return false; }
  hkg.phien_ban = 2;
  var cu = kb.hinh_khong_gian;
  kb.hinh_khong_gian = hkg;
  if (typeof tuSuaKhongGian_ === 'function') tuSuaKhongGian_(kb, r);
  var may = typeof kiemKhongGianMay_ === 'function' ? kiemKhongGianMay_ : null;
  var m = null;
  try { m = may ? may(kb) : null; } catch (e1) { m = null; }
  var laLoi = function (x) { return x && Array.isArray(x.loi) && x.loi.length; };
  if (laLoi(m) && conDuGoiGemini_()) {
    var va = vaLego_(kb, r, sn, m.loi);
    if (va) {
      va.phien_ban = 2;
      kb.hinh_khong_gian = va;
      if (typeof tuSuaKhongGian_ === 'function') tuSuaKhongGian_(kb, r);
      try { m = may ? may(kb) : null; } catch (e2) { m = null; }
      nhatKy_('LEGO_3D', ((r && r.id) || '') + ': đã tự vá 1 lần (' + (laLoi(m) ? 'còn ' + m.loi.length + ' lỗi' : 'hết lỗi') + ')');
    }
  }
  if (laLoi(m) && !(typeof laMonHinhHoc_ === 'function' && laMonHinhHoc_(r))) {
    // luồng thực tế: lõi Lego vẫn lỗi sau 1 lần vá -> bỏ Lego, giữ khung 4 tầng (khuôn / sân khấu 2D) để video không vỡ
    if (cu) kb.hinh_khong_gian = cu; else delete kb.hinh_khong_gian;
    nhatKy_('LEGO_3D', ((r && r.id) || '') + ': lõi Lego còn lỗi (' + m.loi.map(function (x) { return x.ma; }).join(', ') + ') -> giữ khung 4 tầng cũ');
    return false;
  }
  nhatKy_('LEGO_3D', ((r && r.id) || '') + ': gắn đặc tả Lego ' + hkg.doi_tuong.length + ' khối, ' + hkg.buoc.length + ' bước');
  return true;
}

/* ===================== v99.2: BỘ PHẬN 0 — XOAY VÒNG 4 MẢNG, CHẶN ĐỀ SGK, 6 NHÓM SÁNG TẠO, HỢP ĐỒNG HÌNH ===================== */
// Nguyên nhân v99.1 không bao giờ ra HINH_HOC: chonMon_ chọn THUC_TE/HINH_HOC theo MON_KE_KHAC, nhưng sinh-de.yml (GitHub) không
// nhận và không trả bộ đếm này -> mỗi lượt trên GitHub đều bắt đầu từ 0 = THUC_TE. v99.2 chọn mảng theo LỊCH SỬ THẬT của HANG_DOI
// (không phụ thuộc bộ đếm) và gửi / ghi lại đủ mọi bộ đếm BP0 (KHOA_DEM_BP0_).
var MANG_V992_ = ['THUC_TE', 'XAC_SUAT', 'HINH_PHANG', 'HINH_KHONG_GIAN'];
var KHOA_DEM_BP0_ = ['LOP_KE', 'MON_KE', 'MON_KE_KHAC', 'HH_KE', 'NHOM_KE_THUC_TE', 'NHOM_KE_XAC_SUAT', 'NHOM_KE_HINH_PHANG', 'NHOM_KE_HINH_KHONG_GIAN',
  'BOI_CANH_XS_KE', 'NHOM_TT_KE', 'DA_SINH_10P_NGAY', 'LOP_10P_KE', 'KD_THEO_NGAY'];
function laKhoaDemBP0_(k) { return KHOA_DEM_BP0_.indexOf(k) >= 0 || /^KHUON_KE_/.test(String(k)); }
function sangTaoV992Bat_() { return String((typeof cauHinh_ === 'function' && cauHinh_('SANG_TAO_V992')) || 'BAT').toUpperCase() !== 'TAT'; }

// Mảng của một dòng HANG_DOI (đề cũ không có nhãn mảng -> suy từ mon / mã / nguồn / chữ đề)
function mangCuaDong_(r) {
  r = r || {};
  var id = String(r.id || ''), mon = String(r.mon || '').toUpperCase(), ng = String(r.nguon || '');
  if (!mon) mon = /^H[HI]/.test(id) ? 'HINH_HOC' : /^T[TI]/.test(id) ? 'THUC_TE' : /^V[DT]|^XS/.test(id) ? 'XAC_SUAT' : '';
  if (mon === 'HINH_HOC') {
    if (/HINH_KHONG_GIAN/.test(ng)) return 'HINH_KHONG_GIAN';
    if (/HINH_PHANG/.test(ng)) return 'HINH_PHANG';
    return typeof laHinhKhongGian_ === 'function' && laHinhKhongGian_(r.de_bai) ? 'HINH_KHONG_GIAN' : 'HINH_PHANG';
  }
  return mon === 'THUC_TE' || mon === 'XAC_SUAT' ? mon : '';
}
// Tỷ lệ mục tiêu: TY_LE_MON "THUC_TE:30,XAC_SUAT:30,HINH_PHANG:20,HINH_KHONG_GIAN:20" (HINH_HOC:40 = chia đôi) thắng; không có ->
// 25 % đều, TY_LE_XAC_SUAT (nếu đã đặt) giữ phần xác suất; HINH_HOC_KHO = TAT -> bỏ 2 mảng hình. CHU_DE_VIDEO cố định -> chỉ mảng đó.
function tyLeMon_() {
  var cd = String(cauHinh_('CHU_DE_VIDEO') || 'XEN_KE').toUpperCase();
  var co = {THUC_TE: 25, XAC_SUAT: 25, HINH_PHANG: 25, HINH_KHONG_GIAN: 25};
  var tlm = String(cauHinh_('TY_LE_MON') || '').trim();
  if (tlm) {
    var moi = {}, tong = 0;
    tlm.split(/[,;]+/).forEach(function (x) {
      var m = /^\s*([A-Za-z_]+)\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*%?\s*$/.exec(x);
      if (!m) return;
      var k = m[1].toUpperCase(), v = Number(m[2].replace(',', '.'));
      if (k === 'HINH_HOC') { moi.HINH_PHANG = v / 2; moi.HINH_KHONG_GIAN = v / 2; tong += v; }
      else if (MANG_V992_.indexOf(k) >= 0) { moi[k] = v; tong += v; }
    });
    if (tong > 0) { co = {THUC_TE: 0, XAC_SUAT: 0, HINH_PHANG: 0, HINH_KHONG_GIAN: 0}; for (var k2 in moi) co[k2] = moi[k2]; }
  } else if (String(cauHinh_('TY_LE_XAC_SUAT') || '') !== '' && isFinite(Number(cauHinh_('TY_LE_XAC_SUAT')))) {
    var xs = Math.max(0, Math.min(100, Number(cauHinh_('TY_LE_XAC_SUAT'))));
    co = {THUC_TE: (100 - xs) / 3, XAC_SUAT: xs, HINH_PHANG: (100 - xs) / 3, HINH_KHONG_GIAN: (100 - xs) / 3};
  }
  if (typeof batHinhHoc_ === 'function' && !batHinhHoc_()) { co.HINH_PHANG = 0; co.HINH_KHONG_GIAN = 0; }
  if (cd === 'THUC_TE' || cd === 'XAC_SUAT') { var a = {}; MANG_V992_.forEach(function (m) { a[m] = m === cd ? 1 : 0; }); co = a; }
  if (cd === 'HINH_HOC') { co.THUC_TE = 0; co.XAC_SUAT = 0; if (!co.HINH_PHANG && !co.HINH_KHONG_GIAN) { co.HINH_PHANG = 1; co.HINH_KHONG_GIAN = 1; } }
  var s = 0;
  MANG_V992_.forEach(function (m) { s += Math.max(0, co[m] || 0); });
  if (!s) { co = {THUC_TE: 1, XAC_SUAT: 0, HINH_PHANG: 0, HINH_KHONG_GIAN: 0}; s = 1; }
  var ra = {};
  MANG_V992_.forEach(function (m) { ra[m] = Math.max(0, co[m] || 0) / s; });
  return ra;
}
// Chọn mảng THIẾU NHIỀU NHẤT so với tỷ lệ trên 20 đề gần nhất (bỏ đề 10 phút); hòa -> xoay theo số đề đã có (tất định).
function chonMang_(hang) {
  var tl = tyLeMon_();
  var gan = (hang || []).filter(function (r) { return r && String(r.de_bai || '').trim() && !(typeof laVideoDai_ === 'function' && laVideoDai_(r)); }).slice(-20);
  var dem = {THUC_TE: 0, XAC_SUAT: 0, HINH_PHANG: 0, HINH_KHONG_GIAN: 0};
  gan.forEach(function (r) { var m = mangCuaDong_(r); if (m) dem[m]++; });
  var n = gan.length + 1, best = null, bd = -1e9;
  for (var i = 0; i < MANG_V992_.length; i++) {
    var m = MANG_V992_[(i + gan.length) % MANG_V992_.length];
    if (!(tl[m] > 0)) continue;
    var thieu = tl[m] * n - dem[m];
    if (thieu > bd + 1e-9) { bd = thieu; best = m; }
  }
  return best || 'THUC_TE';
}
function monCuaMang_(mang) { return /^HINH_/.test(String(mang)) ? 'HINH_HOC' : String(mang); }

// ---- danh sách đen mô-típ SGK (CHỈ đề tự sinh / tìm internet; đề Zalo không đi qua hàm này)
var DE_SGK_DEN_ = [
  ['cat_goc_gap_hop', function (t) { return /cắt\s*(?:bỏ\s*|đi\s*)?(?:ở\s*)?(?:4|bốn)\s*góc|cắt\s*(?:bỏ\s*)?(?:4|bốn)\s*hình\s*vuông/.test(t) && /(gấp|gập|hộp|thùng)/.test(t); }],
  ['gia_ve_rap', function (t) { return /vé/.test(t) && /(rạp|xem phim|nhà hát|ca nhạc|buổi diễn|chiếu phim)/.test(t) && /(tăng|giảm|hạ)\s*(?:giá|thêm|đi|\d)/.test(t); }],
  ['rut_bi_don_gian', function (t) {
    return /(viên bi|quả bi|\bbi\b|quả cầu)/.test(t) && /(hộp|túi|bình|giỏ)/.test(t) && /(lấy|rút|bốc|chọn)/.test(t) && t.length < 260 &&
      !/(biết rằng|với điều kiện|lần lượt[^.]*đến khi|đổi|chuyển|bỏ lại|hai hộp|2 hộp|ba hộp|3 hộp|nghịch lý|bất ngờ|ít nhất bao nhiêu|trò chơi|cược)/.test(t);
  }],
  ['nang_suat_voi_nuoc', function (t) {
    return (/vòi/.test(t) && /(chảy|đầy bể|bể)/.test(t)) || /(làm chung|làm riêng|năng suất)[^.]{0,80}(công việc|xong việc|hoàn thành)/.test(t) ||
      /(hai|2|ba|3)\s*(đội|người|công nhân|máy)[^.]{0,60}(cùng làm|làm chung)[^.]{0,60}(ngày|giờ)/.test(t);
  }]
];
function laDeSgkNhamChan_(de) {
  var t = String(de || '').toLowerCase().replace(/\s+/g, ' ');
  for (var i = 0; i < DE_SGK_DEN_.length; i++) if (DE_SGK_DEN_[i][1](t)) return DE_SGK_DEN_[i][0];
  return '';
}

// ---- 6 nhóm sáng tạo (45-55 s) + sân khấu đích hợp lệ theo nhóm
var NHOM_SANG_TAC_ = [
  {id: 'fractal', ten: 'FRACTAL & LẶP HỮU HẠN / VÔ HẠN', vi_du: 'đảo bông tuyết Koch (hữu hạn đến lần thứ n HOẶC vô hạn - nói RÕ), tam giác Sierpinski, hình vuông / đường tròn lồng nhau, gấp giấy chạm Mặt Trăng',
    mang: ['THUC_TE'], san_khau: ['tu_sinh_svg'], luu_y: 'tổng VÔ HẠN (cấp số nhân lùi) chỉ từ lớp 11; lớp 10 chỉ hữu hạn, cộng dồn từng bước'},
  {id: 'nghich_ly_xs', ten: 'NGHỊCH LÝ & BẪY XÁC SUẤT ĐỜI THỰC', vi_du: 'Monty Hall biến thể, nghịch lý ngày sinh, bẫy xét nghiệm dương tính giả, hai người hẹn gặp trong một khoảng thời gian (xác suất hình học bằng tỉ số diện tích)',
    mang: ['XAC_SUAT'], san_khau: ['tu_sinh_svg', 'cay_bayes'], luu_y: 'Monty Hall / dương tính giả là xác suất có điều kiện -> CHỈ lớp 12; lớp 10-11 dùng nghịch lý ngày sinh (biến cố đối) hoặc đếm vét cạn; xác suất hình học giải bằng tỉ số diện tích, KHÔNG tích phân'},
  {id: 'kien_truc', ten: 'KIẾN TRÚC, KỸ THUẬT & TỐI ƯU LẠ MẮT', vi_du: 'cầu vòm parabol, kiến bò đường ngắn nhất trên mặt hộp / trụ (trải phẳng), thang trượt, góc nhìn lớn nhất, cắt vật liệu lạ',
    mang: ['THUC_TE'], san_khau: ['tu_sinh_svg'], luu_y: 'lớp 10-11 tối ưu bằng tam thức bậc 2 / Cauchy / trải phẳng + Pythago, không đạo hàm'},
  {id: 'cap_so', ten: 'CẤP SỐ & TĂNG TRƯỞNG GÂY BẤT NGỜ', vi_du: 'bàn cờ hạt thóc biến thể, chọn lương theo ngày (cộng đều vs nhân đôi), bèo phủ mặt hồ, lan truyền / phân rã',
    mang: ['THUC_TE'], san_khau: ['tu_sinh_svg'], luu_y: 'cấp số cộng / nhân từ lớp 11; lớp 10 chỉ cộng dồn bảng số nhỏ'},
  {id: 'hinh_truc_quan', ten: 'HÌNH HỌC TRỰC QUAN & OXYZ THỰC TẾ', vi_du: 'ghép hình tính diện tích phần tô màu lạ mắt (miền cong, cánh hoa), drone / radar / cáp treo / tia sáng trong không gian',
    mang: ['THUC_TE', 'HINH_PHANG', 'HINH_KHONG_GIAN'], san_khau: ['tu_sinh_svg', 'hinh_phang', 'khong_gian_3d'], luu_y: 'Oxyz CHỈ lớp 12'},
  {id: 'van_dung_cao', ten: 'VẬN DỤNG CAO THPT / ĐGNL CHỌN LỌC', vi_du: 'bối cảnh mới lạ, kết quả có cú "quay xe" trái trực giác',
    mang: ['THUC_TE', 'XAC_SUAT', 'HINH_PHANG', 'HINH_KHONG_GIAN'], san_khau: ['tu_sinh_svg', 'cay_bayes', 'hinh_phang', 'khong_gian_3d'], luu_y: ''}
];
var SAN_KHAU_DICH_ = ['tu_sinh_svg', 'cay_bayes', 'hinh_phang', 'khong_gian_3d'];
function chonNhomSangTac_(mang) {
  var ds = NHOM_SANG_TAC_.filter(function (g) { return g.mang.indexOf(mang) >= 0; });
  if (!ds.length) return null;
  var p = PropertiesService.getScriptProperties(), k = 'NHOM_KE_' + mang;
  var v = Number(p.getProperty(k) || 0);
  p.setProperty(k, String((v + 1) % 600));
  return ds[v % ds.length];
}
function sanKhauDichCuaMang_(mang, g) {
  if (mang === 'HINH_PHANG') return ['hinh_phang'];
  if (mang === 'HINH_KHONG_GIAN') return ['khong_gian_3d'];
  var ds = ((g && g.san_khau) || ['tu_sinh_svg']).filter(function (s) { return s !== 'hinh_phang' && s !== 'khong_gian_3d'; });
  if (mang === 'THUC_TE') ds = ds.filter(function (s) { return s !== 'cay_bayes'; });
  return ds.length ? ds : ['tu_sinh_svg'];
}
// Chỉ thị thêm vào prompt sáng tác / tìm đề: nhóm sáng tạo + danh sách đen + HỢP ĐỒNG HÌNH bắt buộc. -> {chu, nhom, ep, dich}
// Mảng hình học: luôn có nhóm 5/6 (chỉ để gợi ý bối cảnh), không xoay bộ đếm nhóm của mảng khác.
function yeuCauSangTaoV992_(mang, lop) {
  if (!sangTaoV992Bat_()) return {chu: '', nhom: null, ep: false, dich: []};
  var g = chonNhomSangTac_(mang);
  var dich = sanKhauDichCuaMang_(mang, g);
  var chu = '\n=== v99.2 ĐỀ SÁNG TẠO CHO SHORTS 45-55 GIÂY (BẮT BUỘC) ===\n';
  if (g) chu += 'NHÓM CHỦ ĐỀ LẦN NÀY: ' + g.ten + ' — ví dụ: ' + g.vi_du + '.' + (g.luu_y ? ' Lưu ý chương trình: ' + g.luu_y + ' (đề đang ra cho lớp ' + lop + ').' : '') + '\n';
  if (mang === 'HINH_PHANG') chu += 'MẢNG HÌNH PHẲNG CHUẨN (v94): CHỈ ra đề dựng được bằng PHÉP DỰNG điểm từ tam giác / tứ giác / đường tròn (trung điểm, giao điểm, chân đường vuông góc, tiếp tuyến...) và mệnh đề kiểm được trên tọa độ. KHÔNG ra miền cong tô màu, kiến bò, xác suất hình học (những bài đó thuộc mảng thực tế).\n';
  if (mang === 'HINH_KHONG_GIAN') chu += 'MẢNG HÌNH KHÔNG GIAN CHUẨN (v97/v98): CHỈ khối chóp / lăng trụ / hộp / tứ diện (đỉnh, đáy, chân đường cao, điểm trên cạnh, giao, thiết diện); bài Oxyz CHỈ lớp 12. KHÔNG ra trải phẳng hình hộp / drone ngoài đa diện chuẩn (thuộc mảng thực tế).\n';
  chu += 'CẤM mô-típ SGK cũ: cắt 4 góc tấm bìa gấp hộp, tăng / giảm giá vé rạp phim cơ bản, rút bi đơn giản không có yếu tố bất ngờ, năng suất / vòi nước chảy truyền thống.\n' +
    'Đề phải có MỘT nút thắt thông minh ("à ra thế") và một hình ảnh biến đổi được trong 3-4 bước. Không dùng năm sinh / khóa học / năm thi trong đề.\n' +
    (/^HINH_/.test(mang) ? '' : 'Đề có san_khau_dich "tu_sinh_svg" ghi "dang":"sang_tao" (chỉ thị v99.2 này THẮNG các mục TRÁNH / danh sách dạng ở trên cho riêng đề đó; vẫn đúng chương trình lớp).\n') +
    'HỢP ĐỒNG HÌNH (mỗi phần tử JSON BẮT BUỘC thêm): "san_khau_dich": ' + dich.map(function (x) { return '"' + x + '"'; }).join(' | ') +
    ', "kich_ban_hinh": ["(1) trạng thái gốc nhìn thấy được", "(2) thao tác cắt / trải / tô / phóng đúng nút thắt", "(3) ...", "(4) hình chốt đáp án (không ghi số đáp án)"], ' +
    '"nut_that": "1 câu nêu bước đột phá", "goi_y_hinh_anh": "1 câu: thứ sẽ chuyển động ở tầng 2".\n';
  return {chu: chu, nhom: g, ep: true, dich: dich};
}
// Hợp đồng hình lưu ở cuối cột sẵn có yeu_to_tu_duy: "... [hop_dong]{json}" (KHÔNG dùng mo_ta_hinh: cột đó bật luồng "đề có hình")
function hopDongTuDe_(d, mang, nhom) {
  if (!d) return null;
  var dich = String(d.san_khau_dich || '').trim();
  var hop = sanKhauDichCuaMang_(mang, nhom);
  if (hop.indexOf(dich) < 0) dich = hop[0];
  var kbh = Array.isArray(d.kich_ban_hinh) ? d.kich_ban_hinh : String(d.kich_ban_hinh || '').split(/\n|\s*\(\d\)\s*/);
  kbh = kbh.map(function (x) { return String(x || '').trim().slice(0, 140); }).filter(Boolean).slice(0, 4);
  return {san_khau_dich: dich, kich_ban_hinh: kbh, nut_that: String(d.nut_that || d.y_tuong_then_chot || '').slice(0, 160),
    goi_y_hinh_anh: String(d.goi_y_hinh_anh || '').slice(0, 160), mang: mang, nhom: nhom ? nhom.id : ''};
}
function boHopDong_(s) { return String(s || '').replace(/\s*\[hop_dong\]\{[\s\S]*\}\s*$/, ''); }
function ganHopDong_(yt, hd) {
  var goc = boHopDong_(yt);
  return hd ? (goc ? goc + ' ' : '') + '[hop_dong]' + JSON.stringify(hd) : goc;
}
function docHopDongHinh_(r) {
  var s = String((r && r.yeu_to_tu_duy) || ''), i = s.indexOf('[hop_dong]');
  if (i < 0) return null;
  try { var o = JSON.parse(s.slice(i + 10)); return o && typeof o === 'object' ? o : null; } catch (e) { return null; }
}
// Chỉ thị cho BP2 (viết kịch bản) theo hợp đồng hình của BP0
function huongDanHopDongV992_(r) {
  var hd = docHopDongHinh_(r);
  if (!hd) return '';
  return '\nHỢP ĐỒNG HÌNH TỪ BỘ PHẬN 0 (bắt buộc giữ): sân khấu đích "' + hd.san_khau_dich + '". Các bước hình: ' +
    (hd.kich_ban_hinh || []).map(function (x, i) { return (i + 1) + ') ' + x; }).join(' ') +
    (hd.nut_that ? ' Nút thắt: ' + hd.nut_that + ' (bước giải trọng tâm phải khớp đúng thao tác hình tương ứng).' : '') +
    (hd.goi_y_hinh_anh ? ' Tầng 2: ' + hd.goi_y_hinh_anh + '.' : '') +
    (hd.san_khau_dich === 'tu_sinh_svg' ? ' Mỗi bước khung4tang.buoc ứng với MỘT bước hình ở trên (cùng thứ tự).' : '') + '\n';
}
// Gắn hợp đồng vào kịch bản (BP2) để JS (SanKhau.gs) và Python (chuanbi / khung4tang_v96) cùng đọc kb.san_khau_dich
function apHopDongVaoKb_(kb, r) {
  var hd = docHopDongHinh_(r);
  if (!kb || !hd || SAN_KHAU_DICH_.indexOf(hd.san_khau_dich) < 0) return false;
  kb.san_khau_dich = hd.san_khau_dich;
  if (hd.kich_ban_hinh && hd.kich_ban_hinh.length) kb.kich_ban_hinh = hd.kich_ban_hinh;
  if (hd.nut_that && !kb.nut_that) kb.nut_that = hd.nut_that;
  return true;
}

/* ===================== v99.2: BỘ PHẬN 1 — KHÓA NGỘ NHẬN ĐỀ, KIỂM CHỨNG 2 CHIỀU, CHỌN CÁCH GỌN ===================== */
var YEU_CAU_HAI_CHIEU_ = 'KIỂM CHỨNG 2 CHIỀU (bắt buộc): đối tượng trả về có THÊM "mo_phong" = giá trị tính TRỰC TIẾP theo đúng quy luật của đề ' +
  '(cộng dồn từng bước k = 1..n, liệt kê / đếm vét cạn, mô phỏng từng kỳ - KHÔNG dùng công thức đóng) và "giai_tich" = giá trị theo công thức giải tích ' +
  '(tổng cấp số, công thức tổ hợp, đỉnh parabol...). Hai giá trị phải khớp nhau (sai lệch <= 1e-4); "gia_tri" / "tu,mau" là đáp số theo ĐÚNG đề ' +
  '(đề hữu hạn đến lần thứ n thì là tổng HỮU HẠN). ';
// -> null (mã không trả đủ 2 chiều) | {ok, lech, mo}
function kiemHaiChieu_(kq) {
  if (!kq || typeof kq !== 'object') return null;
  var mp = Number(kq.mo_phong), gt = Number(kq.giai_tich);
  if (kq.mo_phong === undefined || kq.giai_tich === undefined || kq.mo_phong === null || kq.giai_tich === null || !isFinite(mp) || !isFinite(gt)) return null;
  var lech = Math.abs(mp - gt);
  // ngưỡng TUYỆT ĐỐI 1e-4 (Koch 10 lần ≈ 138,551 tỷ vs vô hạn ≈ 138,564 tỷ chỉ lệch ~9e-5 TƯƠNG ĐỐI -> ngưỡng tương đối bỏ lọt);
  // số rất lớn (đơn vị đồng ~1e11) nới theo sai số làm tròn của số thực: 1e-9 · |giá trị|
  var tran = Math.max(1e-4, 1e-9 * Math.abs(gt));
  var n = Number(kq.n_mo_phong || (kq.kieu === 'mo_phong' ? kq.n : 0));
  if (n > 0 && gt >= 0 && gt <= 1) tran = Math.max(tran, 5 * Math.sqrt(gt * (1 - gt) / n) + 1e-4);   // mô phỏng ngẫu nhiên xác suất: 5 sigma
  var ok = lech <= tran;
  return {ok: ok, lech: lech, mo: 'mô phỏng ' + mp + ' vs giải tích ' + gt + ' (lệch ' + Number(lech.toPrecision(3)) + (ok ? ' <= ' : ' > ') + Number(tran.toPrecision(2)) + ')'};
}
// 4 bẫy ngộ nhận hay gặp của LLM: (a) hữu hạn n lần vs vô hạn, (b) đơn vị, (c) có / không hoàn lại, (d) điều kiện biên nghiệm tối ưu.
// Trả chỉ thị chèn vào ĐỀ của mọi lời gọi giải + mã kiểm chứng (nêu cụ thể điều đề đã nói, không đoán thay đề).
function khoaNgoNhanDe_(de, mon) {
  var t = String(de || '').toLowerCase();
  var dong = [];
  var huuHan = /lần\s*thứ\s*\d+|lần\s*thứ\s*(mười|chín|tám|bảy|sáu|năm|tư|ba|hai)|sau\s*\d+\s*(lần|bước|năm|ngày|tháng|tuần|kỳ|giờ)|đến\s*(bước|lần)\s*(thứ\s*)?\d+|bước\s*thứ\s*\d+|(\d+)\s*lần\s*(lặp|biến đổi|gấp|chia)/.exec(t);
  var voHan = /vô\s*hạn|mãi\s*mãi|vô\s*số\s*lần|cứ\s*tiếp\s*tục\s*(như\s*vậy\s*)?mãi|khi\s*n\s*(dần\s*)?(tới|ra)\s*vô\s*cùng|giới\s*hạn/.test(t);
  var lap = /koch|bông tuyết|sierpinski|fractal|lặp|cấp số|lồng nhau|gấp (đôi|giấy)|mỗi (bước|lần|ngày|năm|tháng)|nhân đôi|hạt thóc|bàn cờ|bèo|phân rã|lan truyền/.test(t);
  if (huuHan && !voHan) dong.push('(a) ĐỀ NÓI HỮU HẠN ("' + huuHan[0] + '"): chỉ tính đúng tới lần đó (cộng dồn từng bước), TUYỆT ĐỐI không dùng tổng vô hạn / giới hạn.');
  else if (voHan && !huuHan) dong.push('(a) ĐỀ NÓI VÔ HẠN: dùng tổng vô hạn / giới hạn, không dừng ở một số bước.');
  else if (lap) dong.push('(a) Bài có quá trình lặp: xác định CHÍNH XÁC đề hỏi hữu hạn (đến lần thứ n) hay vô hạn lần trước khi tính; đếm đúng bước 0 / bước 1.');
  var dv = (t.match(/\b(km|cm|mm|m²|m2|m³|m3|ha|lít|ml|kg|tấn|triệu|nghìn|ngàn|tỷ|tỉ|đồng|usd|giờ|phút|giây|ngày|tháng|năm|%)/g) || []);
  var dvKhac = dv.filter(function (x, i) { return dv.indexOf(x) === i; });
  if (dvKhac.length) dong.push('(b) ĐƠN VỊ trong đề: ' + dvKhac.slice(0, 8).join(', ') + ' -> đổi về cùng hệ trước khi tính; đáp số đúng đơn vị đề hỏi (vd diện tích m² x giá triệu/m² = triệu đồng, đổi ra tỷ nếu đề hỏi).');
  if (mon === 'XAC_SUAT' || /xác suất|ngẫu nhiên|rút|bốc|lấy ra/.test(t)) {
    if (/không\s*(hoàn|trả)\s*lại|không\s*bỏ\s*lại|lấy\s*(đồng\s*thời|cùng\s*lúc)/.test(t)) dong.push('(c) KHÔNG HOÀN LẠI (hoặc lấy đồng thời): không gian mẫu giảm sau mỗi lần lấy.');
    else if (/hoàn\s*lại|trả\s*lại|bỏ\s*lại\s*vào/.test(t)) dong.push('(c) CÓ HOÀN LẠI: mỗi lần lấy độc lập, không gian mẫu giữ nguyên.');
    else dong.push('(c) Xác định rõ có hoàn lại / không hoàn lại, có phân biệt thứ tự không, các vật giống hay khác nhau - theo đúng chữ của đề.');
  }
  if (/lớn\s*nhất|nhỏ\s*nhất|tối\s*đa|tối\s*thiểu|tối\s*ưu|ngắn\s*nhất|ít\s*nhất|nhiều\s*nhất|cực\s*(đại|tiểu)/.test(t)) {
    dong.push('(d) TỐI ƯU: nghiệm phải nằm TRONG miền xác định (độ dài > 0, số lượng nguyên không âm, giá không âm...); so sánh với giá trị ở BIÊN miền; đại lượng đếm được thì nghiệm nguyên.');
  }
  return dong.length ? '\n\nKHÓA CHỐNG NGỘ NHẬN ĐỀ (bắt buộc kiểm trước khi trả lời):\n' + dong.join('\n') : '';
}
// Cách giải gọn nhất cho Shorts trong các lời giải đúng: điểm = 2·do_gon + 3·(có nút thắt) - số bước
function chonCachGon_(ds) {
  var tot = null, bd = -1e9;
  (ds || []).forEach(function (c) {
    if (!c) return;
    var dg = Number(c.do_gon);
    var d = (isFinite(dg) ? 2 * dg : 0) + (String(c.nut_that || c.y_tuong || '').trim().length > 8 ? 3 : 0) - ((c.cac_buoc || []).length || 0);
    if (d > bd + 1e-9) { bd = d; tot = c; }
  });
  return tot;
}

/* ===================== v99.2b: CHẶN MODEL TRẢ HTTP 403 (MODEL_TU_CHOI) 12 GIỜ ===================== */
// Model bị từ chối quyền (preview / thử nghiệm: gemini-4-*, pro-latest, *-customtools...) trước đây bị thử lại MỖI lượt, mỗi key
// một lần -> tốn cả phút, DOC_DE dính BI_NGAT_QUA_6_PHUT. Nay 403 (không phải key hỏng) -> chặn TOÀN BỘ model 12 giờ trong Script
// Property MODEL_CHAN_403 = {model: hết hạn ms} (CacheService chỉ giữ tối đa 6 giờ); GitHub (chay_bp1.js) nhận / trả danh sách này.
var GIO_CHAN_MODEL_403_ = 12;
var _chan403_ = null;
function tenModelGoc_(m) { return String(m || '').replace(/\+.*$/, '').trim(); }
// 403 do KEY / dự án (key hỏng, API chưa bật, dịch vụ bị khóa, thanh toán) KHÔNG phải model từ chối -> không chặn model
var RE_403_LOI_KEY_ = /API_KEY_INVALID|API key not valid|API_KEY_EXPIRED|API key expired|SERVICE_DISABLED|has not been used in project|API_KEY_SERVICE_BLOCKED|API_KEY_HTTP_REFERRER_BLOCKED|billing/i;
function la403TuChoi_(code, raw) { return Number(code) === 403 && !RE_403_LOI_KEY_.test(String(raw || '')); }
function dsModelChan403_() {
  if (_chan403_ && _chan403_.luc > Date.now() - 30000) return _chan403_.ds;
  var o = {};
  try { o = JSON.parse(PropertiesService.getScriptProperties().getProperty('MODEL_CHAN_403') || '{}') || {}; } catch (e) { o = {}; }
  var bay = Date.now(), ds = {};
  Object.keys(o).forEach(function (m) { if (Number(o[m]) > bay) ds[m] = Number(o[m]); });
  _chan403_ = {luc: Date.now(), ds: ds};
  return ds;
}
function modelBiChan403_(model) { return !!dsModelChan403_()[tenModelGoc_(model)]; }
function luuModelChan403_(ds) {
  try { PropertiesService.getScriptProperties().setProperty('MODEL_CHAN_403', JSON.stringify(ds)); } catch (e) { /* bỏ qua */ }
  _chan403_ = {luc: Date.now(), ds: ds};
}
function chanModel403_(model, gio) {
  var m = tenModelGoc_(model);
  if (!m) return false;
  var ds = dsModelChan403_(), het = Date.now() + (Number(gio) || GIO_CHAN_MODEL_403_) * 3600000;
  if (ds[m] && ds[m] >= het - 600000) return false;
  ds[m] = het;
  luuModelChan403_(ds);
  return true;
}
// Gộp danh sách chặn GitHub trả về (lấy hạn xa hơn)
function ghiModelChan403_(moi) {
  if (!moi || typeof moi !== 'object') return 0;
  var ds = dsModelChan403_(), bay = Date.now(), n = 0;
  Object.keys(moi).forEach(function (m) {
    var h = Number(moi[m]), k = tenModelGoc_(m);
    if (k && h > bay && !(ds[k] >= h)) { ds[k] = Math.min(h, bay + 24 * 3600000); n++; }
  });
  if (n) luuModelChan403_(ds);
  return n;
}

// v99.2b: "bai_hoc_rut_ra" Gemini đôi khi trả CHUỖI thay vì mảng -> (kb.bai_hoc_rut_ra || []).map nổ "is not a function" (DangVideo.gs).
// Mảng -> giữ; chuỗi không rỗng -> [chuỗi]; còn lại -> [].
function mangBaiHoc_(x) {
  if (Array.isArray(x)) return x;
  if (typeof x === 'string' && x.trim()) return [x.trim()];
  return [];
}

// v99.2b: lỗi TẠM của Apps Script "Đã xảy ra lỗi với người môi giới" / "broker" làm rớt lệnh Zalo -> nghỉ 2 giây, thử lại tối đa 2 lần.
function laLoiBroker_(e) { return /người môi giới|broker/i.test(String((e && e.message) || e || '')); }
function thuLaiBroker_(fn, ten) {
  for (var lan = 0; ; lan++) {
    try { return fn(); } catch (e) {
      if (!laLoiBroker_(e) || lan >= 2) throw e;
      try { nhatKy_('ZALO_THU_LAI', (ten || 'Zalo') + ': lỗi tạm "' + String(e.message).slice(0, 80) + '" -> nghỉ 2 giây, thử lại lần ' + (lan + 1) + '/2'); } catch (e2) { /* bỏ */ }
      Utilities.sleep(2000);
    }
  }
}
