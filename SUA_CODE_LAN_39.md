# SỬA CODE LẦN 39: /bo xóa hẳn video; hình học khó gồm cả hình KHÔNG GIAN và chứng minh khó

## 1. /bo = xóa hẳn (SanPham.gs)
- Video bị bỏ:
  - **không đăng**;
  - **xóa dòng khỏi sheet** HANG_DOI và khối kịch bản ở DOC_KICH_BAN;
  - **xóa các tệp trên Drive**: video gốc, bản đã in số tập, ảnh bìa đăng, ảnh bìa, ảnh kiểm tra, kịch bản. Tệp vào thùng rác Drive, tự mất sau 30 ngày; cần thì lấy lại trong 30 ngày đó.
- Mã băm đề lưu ở LUU_TRU để hệ thống không sinh hay tìm lại đúng đề đó.
- Bỏ được cả video **đã duyệt nhưng chưa đăng**.
- Bộ học vẫn hiểu vì sao bạn bỏ: đề + tóm tắt kịch bản được lưu trước khi xóa.

## 2. Hình học khó: phẳng + KHÔNG GIAN + chứng minh khó (HinhHoc.gs)
- **Nguyên nhân chưa thấy đề hình học**: môn hình học nằm trong tệp mới **HinhHoc.gs**; thiếu tệp này thì hệ thống chỉ sinh xác suất. Đã thử:
  - có tệp: vòng sinh đề là xác suất -> thực tế -> hình học;
  - thiếu tệp: báo cáo ngày cảnh báo.
- **Hình học KHÔNG GIAN** (lớp 11, 12):
  - hình chóp, lăng trụ, hình hộp, tứ diện;
  - khoảng cách, góc, thể tích, mặt cầu;
  - chứng minh vuông góc / song song / đồng phẳng.
  - Xen kẽ phẳng / không gian (lớp 10 chủ yếu hình phẳng).
- **Ưu tiên bài chứng minh khó** (đề chuyên, học sinh giỏi, vận dụng cao), cần một ý tưởng then chốt.
- **Kiểm chứng bằng máy**: mã dựng hình bằng tọa độ Oxyz (tích có hướng, mặt phẳng, hình chiếu, khoảng cách, thể tích...).
  - Mệnh đề phải đúng ở nhiều cấu hình ngẫu nhiên.
  - Hai cách chứng minh độc lập đều phải chứng minh được.
- **Vẽ hình kiểu sách giáo khoa**: chiếu song song (trục sâu chéo 35°, thu 0,5), **cạnh khuất nét đứt**, tô mặt phẳng đang xét, đường cao / hình chiếu là đường phụ vàng.
  - Tọa độ lấy từ mã đã kiểm chứng, nên hình đúng tỉ lệ.
- **Lệnh mới `/hinhhoc [phang|khonggian] [10|11|12] [chungminh|tinh]`**: sáng tác NGAY một đề hình học khó và làm video ưu tiên.
  - Ví dụ: `/hinhhoc khonggian 12 chungminh`.
- Đã thử bài "Hình chóp S.ABCD đáy vuông, SA ⊥ đáy, chứng minh BD ⊥ (SAC)": máy xác nhận ở 8 cấu hình, hình vẽ đúng.

## Cần dán vào Apps Script
- **Thêm tệp mới `HinhHoc.gs`** (nếu chưa có).
- Dán lại `SanPham.gs`, `KiemTraHinh.gs`, `NangCao.gs`, `ZaloDeBai.gs`.
- Rồi Triển khai > Quản lý > Phiên bản mới.
- Phần dựng video (GitHub) đã tự cập nhật.
