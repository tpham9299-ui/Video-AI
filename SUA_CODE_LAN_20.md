# Sửa code lần 20: 6 nâng cấp

## 1. AI tự xem video trước khi gửi bạn duyệt
- Dựng xong, GitHub chụp **4 khung hình** (giữa cảnh 1, 2, 3 và cảnh đáp án), ghép thành một ảnh và lưu vào Drive (`video/anh`).
- Gemini xem ảnh đó cùng **ảnh đề gốc** (nếu có), đề bài, mô tả hình và đáp án, rồi chấm 0-10 theo 4 tiêu chí:
  - hình đúng đối tượng của đề;
  - số liệu, nhãn đúng;
  - trình bày (chữ đè, chữ bị cắt, khung trống);
  - đáp án hiện đúng.
- Kết quả:
  - **Đạt** (≥ `DIEM_HINH_TOI_THIEU`, mặc định 7): bot gửi bạn duyệt kèm điểm và lưu ý của AI.
  - **Chưa đạt:** tự viết lại kịch bản theo nhận xét của AI, dựng lại, chấm lần nữa (tự sửa tối đa 1 lần), rồi gửi bạn duyệt.

## 2. Học từ số liệu xem thật (YouTube)
- Mỗi video đăng YouTube được ghi vào sheet **THONG_KE** kèm đặc điểm: kiểu mở đầu, câu móc, chủ đề, series, độ dài.
- 6 giờ sáng hằng ngày cập nhật lượt xem, thích, bình luận. Nếu bật dịch vụ **YouTube Analytics API**, có thêm **tỉ lệ xem trung bình**.
- Khi có ≥ 6 video có số liệu: lời nhắc viết kịch bản có thêm mục "Bài học từ số liệu" (kiểu mở đầu, độ dài, chủ đề nào giữ chân tốt; câu móc của video tốt nhất).
- TikTok chưa lấy được số liệu cho tới khi ứng dụng TikTok được duyệt.

## 3. Luân phiên kiểu mở đầu
- Mỗi video thử một kiểu hook (sai lầm, thách thức, bất ngờ, kết quả trước, câu hỏi).
- Đủ 10 video có số liệu: khoảng 70% dùng kiểu hiệu quả nhất, 30% thử kiểu ít dùng.
- Không dựng 2 bản cho một đề: làm vậy tốn gấp đôi thời gian GitHub, và đăng video gần trùng nhau dễ bị nền tảng hạ lượt hiển thị.

## 4. Ảnh bìa
- **YouTube:** ảnh bìa là khung hình lúc câu móc hiện đầy đủ. Đặt được qua API khi kênh đã **xác minh số điện thoại** (youtube.com/verify); chưa xác minh thì bỏ qua, không lỗi.
- **TikTok:** dùng cùng khung hình đó làm ảnh bìa.

## 5. Series
- Mỗi video thuộc một series theo nội dung: Toán đi chợ, Hình học kỳ diệu, Toán và tiền bạc, Tối ưu đời thường, Đo đạc thực tế, Xác suất không như bạn nghĩ, Toán quanh ta.
- Có số tập (hiện "TẬP n" trên thanh đầu video); kịch bản biết tên tập trước để nối ý; mô tả ghi series.
- Video YouTube tự vào **danh sách phát** cùng tên (tự tạo nếu chưa có).

## 6. Báo cáo hằng ngày qua Zalo (mặc định 21 giờ)
Gồm: việc đã làm hôm nay; số lần AI xem, tự sửa; hàng đợi (nhấn mạnh số video **chờ bạn duyệt**); Gemini quá tải hoặc hết hạn mức; hạn token GitHub; các lỗi chính; video nổi bật 7 ngày.

## Cài đặt
1. Thêm tệp mới **NangCao.gs**.
2. Thay toàn bộ các tệp: `BoPhan1.gs`, `BoPhan2.gs`, `PromptKichBan.gs`, `DangVideo.gs`.
3. **Triển khai > Phiên bản mới.**
4. Chạy **`caiDatNangCao`** một lần. Hàm này đặt trigger số liệu và báo cáo, thêm cấu hình mặc định vào CAU_HINH.
5. (Nên làm) Dịch vụ + > **YouTube Analytics API**; xác minh kênh YouTube bằng số điện thoại để đặt được ảnh bìa.

Cấu hình (CAU_HINH): `TU_KIEM_TRA_VIDEO` BAT|TAT, `DIEM_HINH_TOI_THIEU` 7, `THU_HOOK` BAT|TAT, `SERIES` BAT|TAT, `BAO_CAO_GIO` 21.
