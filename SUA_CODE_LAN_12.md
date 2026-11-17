# Cập nhật lần 12: nền tối gọn, màn kết chuyên nghiệp, bài giảng kỹ hơn

## 1. Nền tối (mặc định `kieuNen: "toi"`)
- Nền gần đen pha xanh than, lưới ô rất mờ như giấy kẻ (kiểu video dạy toán), quầng sáng rất nhẹ phía trên, tối dần ra bốn góc.
- Không có vật trôi, không mảng màu, để mắt người xem dồn vào nội dung.
- Dải chuyển cảnh đổi sang màu tối, chỉ có viền mảnh cam/xanh; vòng sáng và chớp sáng trước cảnh bẫy/đáp án được làm dịu.
- Nền riêng trên Drive: phủ lớp tối gọn thay cho lớp cực quang. Vẫn chọn được `"cuc_quang"` hoặc `"neon"` nếu muốn.

## 2. Màn kết thúc chuyên nghiệp (tự tạo, khoảng 6 giây)
Bố cục 2 tầng trên nền tối:
- **Tầng trên:** chip **ĐÁP ÁN**, tiêu đề lớn **BÀI HỌC RÚT RA**, thẻ có 3 ý (lấy từ `bai_hoc_rut_ra` của kịch bản). Mỗi ý hiện lần lượt, số thứ tự đổi thành dấu ✓ kèm tiếng "pop".
- **Tầng dưới:** logo trong vòng sáng, tên kênh và khẩu hiệu; hàng nút **Theo dõi / Lưu lại / Chia sẻ**. Ngón tay bấm "Theo dõi" thành "Đã theo dõi" kèm tiếng "ding". Dòng **VIDEO SAU:** hẹn bài kế tiếp (lấy từ `video_tiep_theo`).
- Chưa cấu hình tên kênh: tầng dưới hiện "THEO DÕI ĐỂ HỌC MẸO XÁC SUẤT MỖI NGÀY".
- Màn kết này được dùng **thay cho tệp outro cũ**. Muốn dùng lại tệp outro của bạn: thêm `"dungOutroRieng": true` vào mục `thuongHieu` trong `phong_cach.json`.

## 3. Bài giảng kỹ hơn, bài học chi tiết hơn
Lời nhắc kịch bản (`PromptKichBan.gs`) đổi sang **8-11 cảnh, 60-100 giây**, theo trình tự:
1. Hook.
2. **Đề cho gì, hỏi gì** (thẻ danh sách).
3. **Nhắc lại kiến thức** (định nghĩa/công thức, giải thích bằng lời thường, ví dụ nhỏ).
4. Ý đồ.
5. Cái bẫy và **vì sao sai**.
6. Mấu chốt.
7. **Tính từng bước**, mỗi bước nói rõ đang tính gì và vì sao.
8. **Kiểm tra** đáp án (trực giác, trường hợp đặc biệt, thử nhiều lần).
9. Đáp án.
10. **Bài học chi tiết:** 2-3 điều rút ra, dấu hiệu nhận ra dạng bài, chỗ dùng ngoài đời, một **câu hỏi biến thể** để người xem tự luyện ở bình luận.

Kịch bản trả thêm `bai_hoc_rut_ra` (3 quy tắc ngắn, hiện ở màn kết) và `video_tiep_theo`.

Bộ kiểm tra (`KiemTraHinh.gs`) yêu cầu:
- 6-12 cảnh;
- có `bai_hoc_rut_ra`;
- có cảnh `tinh_toan`;
- cảnh cuối là `bai_hoc`.

Thanh các bước có thêm bước **KIẾN THỨC**. Khi bài có nhiều bước, thanh chuyển sang dạng gọn: vòng tròn ✓ cho bước đã qua, số cho bước sau, chỉ bước hiện tại hiện đủ chữ.

Kịch bản mẫu Monty Hall được viết lại theo cấu trúc này: 12 cảnh, khoảng 85 giây cộng 6 giây màn kết.

## Việc cần làm trên Apps Script
1. Thay **3 tệp**: `BoPhan1.gs` (dán vào Code.gs), `PromptKichBan.gs`, `KiemTraHinh.gs`.
2. Sheet **CAU_HINH**: nếu đã có dòng `GIAY_MUC_TIEU` / `GIAY_TOI_DA` thì sửa thành `'60-100` và `130`. Có dấu nháy đơn ở đầu `'60-100` để Sheets không đổi thành ngày tháng. Nếu chưa có hai dòng này thì không cần làm gì.
3. Deploy > Manage deployments > Edit > Version: New version.
