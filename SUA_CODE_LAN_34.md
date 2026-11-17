# SỬA CODE LẦN 34: Bộ phận kiểm duyệt yêu cầu + Video giới thiệu sản phẩm bằng bài toán

## 1. Bộ phận kiểm duyệt yêu cầu (NangCao.gs + BoPhan1.gs)
Mọi yêu cầu bạn đã đặt ra được gom thành **một bảng tiêu chí có trọng số**:

| Tiêu chí | Trọng số | Bắt buộc |
|---|---|---|
| de_bai: mở đầu nêu rõ đề (cho gì, tìm gì) | 1,5 | ✔ |
| bam_de: hình bám sát ngữ cảnh đề (đúng vật, số lượng, cách xếp như bàn tròn, số đo) | 3 | ✔ |
| loi_giai: mọi phép tính, công thức trên màn hình đúng | 3 | ✔ |
| dap_an: đáp án đúng, hiện rõ | 2 | ✔ |
| thu_lai: thử lại thật bằng số (hoặc lý do "khong_thu_lai" hợp lý) | 1,5 | ✔ |
| nhieu_canh: mỗi bước có hình riêng, không cảnh trống trải | 1,5 | |
| bo_cuc: không đè, không tràn, không TeX thô, chữ đủ to (chỉ chấm ở video) | 2 | ✔ |
| tham_my (chỉ chấm ở video) | 1 | |
| san_pham: đề xoay quanh sản phẩm, ảnh thật rõ, quảng cáo hợp lý (chỉ video sản phẩm) | 2 | ✔ |

- AI chấm từng tiêu chí 0-10, **máy tự tính MỨC ĐÁP ỨNG %**; tiêu chí bắt buộc dưới 7 = không đạt.
- **Cửa 1 - KỊCH BẢN (trước khi dựng)**: chấm sau khi kịch bản qua các bước kiểm tra máy. Chưa đạt -> Gemini sửa theo nhận xét
  từng cảnh, tối đa 2 lần; vẫn thấp -> **xóa đề** (không tốn công dựng video).
- **Cửa 2 - VIDEO (sau khi dựng)**: AI nhìn mọi cảnh. Đạt (≥ 85% và đủ tiêu chí bắt buộc) mới gửi bạn duyệt.
  Chưa đạt -> tự viết lại kịch bản và dựng lại, tối đa 2 lần; vẫn thấp -> **bỏ video + xóa đề** (video vào thùng rác Drive),
  hệ thống tự làm đề mới.
- Kịch bản sửa nhiều lần vẫn lỗi (KICH_BAN_KHONG_HOP_LE) giờ cũng bị xóa luôn thay vì nằm chờ ở trạng thái LOI.
- Đề bạn tự gửi qua Zalo: bị bỏ thì bot báo một tin kèm lý do. Đề máy sinh: chỉ ghi nhật ký (BO_DE_KHONG_DAT).
- AI chưa chấm được (hết key/mạng) KHÔNG bị coi là không đạt: giữ lại, chấm lại sau (như cũ).
- Cấu hình (sheet CAU_HINH, tùy chọn): `MUC_DAP_UNG_TOI_THIEU` (85), `SO_LAN_SUA_YEU_CAU` (2), `AI_DUYET_KICH_BAN` (BAT/TAT).

## 2. Video giới thiệu sản phẩm bằng bài toán (SanPham.gs, PromptKichBan.gs, KiemTraHinh.gs, DangVideo.gs, bộ dựng)
- **Ảnh thật**: `/sanpham <tên hoặc link>` gửi kèm ảnh; gửi thêm ảnh bằng chú thích `/anhsp [mã]` (tối đa 6 ảnh).
  Ảnh lưu ngay vào Drive `VIDEO_XACSUAT/san_pham/<mã>/`. Có link mà không có ảnh: thử lấy ảnh đại diện của trang bán.
  AI xem từng ảnh (góc chụp, chữ trên bao bì, ảnh nào hợp làm ảnh lớn mở đầu).
- **Đề hợp thức hóa sản phẩm**: bài toán sinh ra từ chính cách mua và dùng sản phẩm (chi phí mỗi ngày, bao lâu hoàn vốn,
  dung tích, mua combo...), dùng giá và thông số đã xác minh, đáp số duy nhất. Kèm một câu kết nối kết quả với giá trị sản phẩm.
- **Trong video**:
  - vật mới `anh_that` (ảnh thật trong khung sáng, nổi nhẹ, có thể dán nhãn giá) ở mở đầu, đề bài, lời giải, đáp án;
  - cuối video có **thẻ sản phẩm** (ảnh + tên + giá + "Có tại kênh · link ở mô tả");
  - nhãn minh bạch "Có sản phẩm do kênh bán" chuyển lên góc trên trái, cạnh logo (không đè hình nữa).
- **Kiểm tra máy**: có ảnh mà không dùng -> lỗi nặng; số ảnh sai -> lỗi nặng; ảnh chỉ ở 1 cảnh -> lưu ý; kịch bản không nhắc sản phẩm -> lỗi nặng;
  lời quá đà ("tốt nhất", "mua ngay", "nhanh tay", "kẻo hết"...) hoặc nhắc đối thủ -> lỗi nặng.
- Đề sản phẩm không đạt kiểm duyệt -> tự sáng tác đề mới cho sản phẩm (tối đa 6 đề), không phải gửi lại.
- **Mô tả bài đăng**: thêm dòng "🛒 Sản phẩm trong video: tên – giá" + link sản phẩm (nếu có); TikTok thêm dòng "có tại kênh".
- Số tiền giờ hiện đúng kiểu Việt: "249.000đ" (trước bị đổi thành "249,000"), số lăn từ 10.000 trở lên có dấu chấm ngăn nghìn ("12.000").
- Kịch bản mẫu `mau/kich_ban_san_pham.json` (ảnh giả lập ở `public/sp/SPMAU/`), dựng thử trên GitHub: Actions > Dựng video > mẫu `kich_ban_san_pham`.

## Cần dán lại vào Apps Script
`NangCao.gs`, `BoPhan1.gs`, `SanPham.gs`, `PromptKichBan.gs`, `KiemTraHinh.gs`, `DangVideo.gs` rồi Triển khai > Quản lý > Phiên bản mới.
