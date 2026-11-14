# Sửa code lần 29: vẽ ĐÚNG cảnh thực tế của đề (bản vẽ + tự dựng + AI nhìn hình)

## Vì sao các video cũ trên Drive vẽ sai
Các video cũ được làm khi AI viết kịch bản phải **tự tính tọa độ**. Thư viện hình lúc đó chỉ có vài khối 3D (hộp, trụ, tòa nhà, cây), nên AI thay cột cờ bằng khối trụ, thay ngân hàng bằng hộp.

Từ sáng 14/11, GitHub còn đang chặn mọi lần chạy, nên **chưa có video nào được làm bằng bản mới**.

## Cách làm mới (4 lớp bảo đảm)
1. **Bước LẬP BẢN VẼ riêng** (PromptKichBan.gs `lapBanVe_`):
   - Trước khi viết kịch bản, Gemini chỉ làm một việc: đọc đề (và ảnh đề), rồi lập bản vẽ: vật thật nào, cao bao nhiêu mét, đứng ở mét thứ mấy, đo cái gì.
   - Máy kiểm tra bản vẽ: tên vật có trong thư viện, mọi điểm đo trỏ tới vật có thật, đủ mọi vật của đề. Sai thì Gemini sửa một lần.
   - Gemini vẫn hỏng thì máy tự dựng **bản vẽ dự phòng** từ các vật nhận ra trong đề.
   - Kịch bản bắt buộc dùng đúng bản vẽ này. Nếu kịch bản không dùng, máy **tự chèn** bản vẽ vào cảnh mở đầu, đề bài và mô phỏng.
2. **Máy tự dựng hình kiểu bản vẽ kỹ thuật / Manim** (vật `canh_that`, `src/sankhau/canhthat.ts`):
   - AI không tính tọa độ nữa; máy tự đặt tỉ lệ theo số đo thật.
   - Máy tự vẽ đường đo khoảng cách (có vạch hai đầu), đường đo chiều cao, tia nhìn, đường ngang tham chiếu, cung góc nâng/hạ, bóng nắng, tam giác vuông tô mờ và dấu góc vuông.
   - Có 2 kiểu nhìn:
     - **nhìn ngang**: đo chiều cao, khoảng cách, góc, bóng, thang dựa tường;
     - **nhìn từ trên**: vườn, ruộng, sân, hồ bơi, **hàng rào quanh đất**.
3. **Thư viện 38 vật thực tế vẽ đúng hình**, có chuyển động nhẹ:
   - cột cờ (cờ đỏ sao vàng bay), người quan sát, tòa nhà, ngân hàng (mặt tiền cột, biển "NGÂN HÀNG"), nhà, trường học;
   - cây, cây thông, hải đăng (đèn quét), tháp nước, cột điện, đèn đường, núi, mặt trời;
   - ô tô, thuyền, máy bay, khinh khí cầu, cầu, sông, thang, tiền, heo đất, diều, tường, hồ nước;
   - **hàng rào**, **công trình có biển tên** (bưu điện, bệnh viện, nhà máy... ghi đúng tên trong đề), cửa hàng/chợ/siêu thị (có biển tên);
   - xe máy, xe đạp, xe buýt, con đường, quả bóng, rổ bóng rổ, giếng, cổng;
   - **biểu tượng emoji** cho vật chưa có (🐄 🚜 ⛽...).
   
   Không bao giờ thay vật thật bằng khối hộp hay khối trụ.
4. **Kiểm tra trước khi dựng**:
   - Bộ kiểm tra kịch bản bắt lỗi `VAT_THUC_TE_SAI` khi đề nói tới cột cờ, ngân hàng, hàng rào, bưu điện, xe máy, vườn... mà hình không có vật đó.
   - Trên GitHub, **AI NHÌN ẢNH cảnh đề bài và cảnh mô phỏng** đã dựng, đối chiếu với đề: vật thật đúng chưa, số đo đúng chỗ chưa. Sai thì chưa dựng, kịch bản được sửa trước.

   Bước AI nhìn ảnh cần Secret `GEMINI_KEYS` trong GitHub; chưa có thì bước này tự bỏ qua.

## Vì sao không dùng Manim (Python) trực tiếp
Bộ dựng hiện tại đã vẽ theo phong cách Manim (vẽ dần nét, chuyển hình, đường đo), và chạy chung với phụ đề, giọng đọc, hiệu ứng 3D. Thêm Manim Python sẽ phải cài LaTeX nặng, dựng chậm và không đồng bộ phong cách. Vì vậy phần "dựng theo góc độ toán học" được làm ngay trong bộ dựng: máy tính tỉ lệ, tọa độ, góc từ số đo.

## Cần làm
1. Dán lại **BoPhan1.gs, PromptKichBan.gs, KiemTraHinh.gs**, rồi Triển khai → Phiên bản mới. Nếu chưa dán bản lần 28 thì dán đủ 8 tệp.
2. Gỡ chặn GitHub: chuyển repo về Public, hoặc cập nhật thanh toán.
3. Thêm Secret `GEMINI_KEYS` (mỗi dòng một key) để giải đề trên GitHub và để AI nhìn hình trước khi dựng.
4. Gửi thử một đề có vật thật (cột cờ, ngân hàng, hàng rào...) qua Zalo để kiểm tra.
