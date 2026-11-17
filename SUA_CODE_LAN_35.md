# SỬA CODE LẦN 35: Học từ góp ý, vẽ đúng vật + chỉ nhận 10/10, hình học khó, tăng tốc, đa dạng phong cách

## 1. Liên tục học từ góp ý của bạn (NangCao.gs, SanPham.gs)
- Mỗi góp ý qua Zalo được ghi vào sheet **HOC_GOP_Y**:
  - `/sua <mã> <góp ý>` (sửa video đó như cũ, và học thêm);
  - `/bo <mã> <lý do>`;
  - `/gopy <góp ý chung>` (lệnh mới, góp ý không gắn video nào).
- Khoảng 1 phút sau, Gemini đọc góp ý cùng kịch bản của video đó để **hiểu ý đồ thật sự** của bạn, rồi rút thành **quy tắc chung** cho mọi video sau (sheet **QUY_TAC_HOC**).
  Quy tắc trùng ý được gộp và đếm số lần bạn nhắc.
- Bot nhắn lại: "🧠 Đã hiểu: <ý đồ> 📌 Quy tắc: ..." để bạn kiểm tra.
  Hiểu sai: `/xoaquytac <số>`; xem tất cả: `/quytac`.
- Áp dụng ở 2 nơi:
  - lời nhắc viết kịch bản (bắt buộc làm theo);
  - Bộ phận kiểm duyệt chấm thêm tiêu chí **quy_tac_hoc** (bắt buộc 10/10).

## 2. Vẽ đúng vật + chỉ nhận video 10/10
- **Vật mới**: `ban` (cái bàn: mặt bàn + chân), `ghe`, `ti_vi`, `kim_tu_thap`, `thap` (tháp thép/truyền hình, khác tòa nhà).
- **Kiểm tra MỌI cảnh** (trước chỉ 3 cảnh đầu):
  - cảnh vẽ công trình mà đề không có (đề "hải đăng" mà vẽ tòa nhà) -> lỗi nặng `VAT_LA_CANH_n`;
  - đề "cái bàn" mà vẽ khối hộp -> lỗi nặng `BAN_VE_THANH_HOP_CANH_n`.
- **Máy tự sửa** trước khi nhờ Gemini: đề có đúng một công trình chính thì đổi vật lạ thành vật của đề, giữ nguyên số đo.
- Cảnh mất hết vật hợp lệ: dùng bản vẽ cảnh thực tế của đề thay vì để cảnh chỉ còn chữ.
- **Ngưỡng 10/10**:
  - mọi tiêu chí của Bộ phận kiểm duyệt (cả cửa kịch bản lẫn cửa video) phải đạt đúng 10 điểm;
  - AI được dặn chỉ cho 10 khi hoàn hảo tuyệt đối;
  - cửa kịch bản sửa tối đa 3 lần, cửa video 2 lần; vẫn chưa 10/10 -> bỏ video + xóa đề, làm đề mới.
  - Cấu hình: `DIEM_MOI_TIEU_CHI` (10), `MUC_DAP_UNG_TOI_THIEU` (100), `SO_LAN_SUA_KICH_BAN_YC` (3), `SO_LAN_SUA_YEU_CAU` (2).

## 3. Hình học khó: giải + chứng minh (tệp mới HinhHoc.gs)
- Môn mới **HINH_HOC**, xen kẽ: xác suất -> thực tế -> hình học (tắt: `HINH_HOC_KHO` = TAT).
- Đề gửi qua Zalo có câu chứng minh hình học cũng được nhận.
- Hai loại đề: **tính** (độ dài, góc, diện tích, tỉ số) và **chứng minh** (bằng nhau, vuông góc, thẳng hàng, đồng quy, 4 điểm cùng đường tròn...).
- **Kiểm chứng bằng máy**: Gemini viết mã dựng hình bằng tọa độ trực tiếp từ đề.
  - Bài chứng minh: máy thử mệnh đề ở ≥ 4 (thường 6-8) cấu hình ngẫu nhiên, sai số phải gần 0, và hai cách chứng minh độc lập (tổng hợp + tọa độ/véc tơ/lượng giác) đều phải chứng minh được. Thiếu một điều kiện là sửa hoặc xóa đề.
  - Bài tính: như toán thực tế (2 lời giải + mã tính số, trọng tài khi lệch).
- **Hình đúng tỉ lệ**: tọa độ lấy từ chính mã dựng hình đã kiểm chứng, máy tự thay vào mọi hình `hinh_hoc` của kịch bản.
- Hình học có thêm: đường tròn (`tron`), đường kẻ thêm nét đứt vàng hiện sau (`phu`), vạch cạnh bằng nhau (`bang`).
- Thử: bài "B, C, E, F cùng thuộc một đường tròn" được xác nhận (8 cấu hình, sai số 2e-16). Cố tình làm mệnh đề sai thì bị loại, dù cả hai "lời chứng minh" của AI nhận là đúng.

## 4. Tăng tốc
- Nhật ký GitHub cho thấy chậm nhất là bước **giải đề** (8-12 phút: model chính quá tải, chờ ~5 phút mỗi lượt). Bước viết kịch bản chỉ ~1 phút.
- **Gọi dự phòng song song**: model chính chưa trả lời sau 80 giây thì gọi thêm model dự phòng bằng key khác, lấy kết quả về trước.
  Cấu hình: `GIAY_GOI_DU_PHONG` (80), `GOI_DU_PHONG_SONG_SONG` (BAT).
- **Nhớ key hết hạn mức ngày** giữa các lần chạy GitHub (Apps Script lưu đến hết ngày giờ Thái Bình Dương), lần sau bỏ qua ngay.

## 5. Đa dạng câu nối + phong cách edit
- **6 phong cách lời** luân phiên theo quy tắc: kể chuyện, thách đố, thám tử, bạn thân, mẹo nhanh, thầy giáo vui tính. Cùng một video sửa lại thì giữ phong cách cũ.
- Hệ thống nhớ câu mở đầu cảnh của các video gần đây.
  - Prompt yêu cầu không dùng lại.
  - Máy báo `CAU_NOI_LAP` / `CAU_NOI_CU` để Gemini viết lại.
- **4 gói edit** luân phiên: năng động, tối giản, điện ảnh, sổ tay. Mỗi gói đổi nền, chuyển cảnh, kiểu phụ đề, phông công thức. Không đổi bố cục/cỡ chữ nên các lỗi tràn, đè không quay lại.
  Đã chạy kiểm duyệt bố cục cả 4 gói: 0 lỗi nặng.

## Cần dán vào Apps Script
- **Tệp mới**: `HinhHoc.gs`.
- **Dán lại**: `BoPhan1.gs`, `NangCao.gs`, `KiemTraHinh.gs`, `PromptKichBan.gs`, `SanPham.gs`, `ZaloDeBai.gs`, `DangVideo.gs`.
- Rồi Triển khai > Quản lý > Phiên bản mới.
