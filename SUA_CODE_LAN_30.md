# Sửa code lần 30: 6 góp ý bố cục

1. **Hình mở đầu phẳng 2D.** Phần ĐỀ BÀI (cảnh mở đầu và cảnh đọc đề) không xoay máy 3D nữa: hình đứng yên, vật bay vào và di chuyển trên mặt phẳng. Chỉ hộp chữ (thẻ đề, nhãn) giữ hiệu ứng. Từ phần mô phỏng trở đi mới dùng góc nhìn 3D.
2. **Phân số cân đối.** Mọi `\frac` được dựng thành `\dfrac`, nên tử và mẫu to bằng số thường (trước chỉ khoảng 70%).
3. **Hình minh họa to hơn.**
   - Phụ đề hạ thấp xuống; sân khấu hình luôn cao ít nhất 560px, chữ và công thức tự thu gọn để nhường chỗ.
   - Cảnh đề bài bỏ dòng tiêu đề (thẻ ĐỀ CHO / CẦN TÌM đã nói rõ), hình được đẩy lên cao và cao ít nhất 620px.
4. **Hộp chữ cân đối.**
   - Chữ xuống dòng kiểu cân bằng: các dòng dài gần bằng nhau, không còn một chữ lẻ loi ở dòng dưới.
   - Dòng chỉ dư một chút thì thu chữ nhẹ cho nằm gọn một dòng, nhưng không nhỏ hơn 40px.
5. **Chữ đè lên hình.**
   - Nguyên nhân: tiêu đề cảnh dài xuống 2–3 dòng, tràn khỏi khung tiêu đề và đè xuống hình. Thẻ đề bài nhiều dữ kiện và nhiều dòng công thức cũng tràn như vậy.
   - Cách sửa: thêm "khung tự vừa" đo kích thước thật của chữ, rồi thu nhỏ đều cho vừa vùng được chia, nên chữ không bao giờ tràn ra ngoài.
6. **Nền tự tạo, mỗi video một nền.**
   - Có 7 kiểu nền: cực quang, đốm sáng bay, sóng, lưới lục giác, tia sáng, ký hiệu toán trôi, lưới sàn. Kiểu nền và tông màu sinh từ mã video, nên các video khác nhau.
   - Nền ảnh trên Drive không dùng nữa. Muốn dùng lại thì đặt GitHub Variable `DUNG_NEN_DRIVE=1`.
   - Thư mục nền trên Drive của bạn tôi không xóa; bạn có thể tự xóa nếu không cần.

Không cần dán lại tệp .gs nào: toàn bộ thay đổi lần này nằm ở bộ dựng trên GitHub và có hiệu lực ngay.
