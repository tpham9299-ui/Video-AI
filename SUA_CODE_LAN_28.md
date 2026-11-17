# Sửa code lần 28: quy trình 6 phần, kiểm duyệt trước khi gửi, vật thực tế, chữ to đẹp, Zalo gọn

## ⚠️ Việc gấp: GitHub đang chặn mọi lần chạy
Từ 07:46 ngày 14/11, mọi lần chạy GitHub (giải đề và dựng video) đều bị từ chối với thông báo
"recent account payments have failed or your spending limit needs to be increased".

Nguyên nhân: repo **Video-AI đang để Private**. Repo private bị tính phút chạy theo gói, và hạn mức đã hết.

Cách sửa nhanh nhất là chuyển repo về **Public**: GitHub, mở repo, vào Settings → General → Danger Zone → Change visibility → Public.
- Repo public chạy Actions miễn phí, không giới hạn phút.
- Secrets (key Gemini, token...) vẫn an toàn và không bị lộ.

Cách khác: vào Settings → Billing and plans để cập nhật thanh toán.

Từ bản này, khi GitHub chặn như vậy, hệ thống tự phát hiện và nhắn bạn qua Zalo, mỗi ngày 1 lần.

## 1. Quy trình cố định 6 phần cho MỌI video
ĐỀ BÀI → MÔ PHỎNG → LỖI SAI → GIẢI → THỬ LẠI → CHỐT KIẾN THỨC

- **ĐỀ BÀI**
  - Câu móc ≤ 5 giây, chính là câu hỏi của đề.
  - Cảnh `de_bai` đọc ĐỦ mọi dữ kiện và con số.
  - Máy tự hiện **thẻ ĐỀ BÀI**: phần "ĐỀ CHO" hiện từng dữ kiện theo lời đọc, phần "CẦN TÌM" khung vàng hiện cuối.
- **MÔ PHỎNG**: dựng hình, mô phỏng lại tình huống, hình chuyển động theo lời.
- **LỖI SAI**: cách làm sai hay gặp và vì sao sai.
- **GIẢI**: kiến thức cần dùng, ý then chốt, tính từng bước, đáp án.
- **THỬ LẠI**: thế ngược đáp án vào đề (hoặc mô phỏng) để chứng minh đáp án đúng.
- **CHỐT**: điều rút ra, dấu hiệu nhận dạng, bài tự luyện.
- Thanh tiến trình trên đầu luôn hiện đủ 6 bước; bước hiện tại là một viên màu nhấn.
- **Bộ kiểm tra kịch bản**: thiếu phần, sai thứ tự, thiếu `de_cho`/`can_tim` hoặc thẻ đề thiếu số của đề đều tính là lỗi nặng, và Gemini phải sửa trước khi dựng.

## 2 + 3. Chữ to đẹp, không lộ mã TeX, không đè, không tràn mép; xác suất đẹp hơn
- **Hộp danh sách**: trước là hộp trắng chữ nhỏ, nay là thẻ kính tối viền neon, chữ 46px, tự xuống dòng.
- **Cỡ chữ trong hình**: nhãn biểu đồ cột, biểu đồ tròn, vòng quay, đồng hồ, thanh và thẻ đều to hơn, có cỡ tối thiểu. Thẻ chữ tự rộng ra theo nội dung, không thu chữ nhỏ xíu.
- **Mã TeX** (`src/chu.ts`):
  - Tự sửa các lỗi AI hay mắc: `$...$`, `\\frac`.
  - Chỗ chỉ hiện được chữ thường thì đổi TeX sang chữ đọc được: `\frac{1}{3}` → 1/3, `u_1` → u₁.
  - Công thức sai cú pháp hiện dạng chữ đọc được, không bao giờ hiện mã đỏ.
- **Thẻ mẹo nhớ** đổi sang tối. **Dòng dữ kiện** trên đầu to hơn và tự xuống dòng.
- **Logo kênh** đứng yên ở góc trên-trái, không còn chạy qua đè chữ. **Con dấu "BẪY!"** tan sau 1,5 giây.
- **Ảnh bìa xác suất**: thêm xúc xắc 3D, chồng xu, nhãn "P = ?" và thanh đo 0%–100% có dấu hỏi.
- **Prompt xác suất**:
  - Ít nhất 4 loại vật chính khác nhau; cảnh nào cũng có hành động (bốc, quay, mở, chạy số).
  - Cảnh thử lại mô phỏng nhiều lần chơi.

## Vật thực tế vẽ đúng đề (cột cờ, ngân hàng...)
- **Thư viện 26 vật** (`src/sankhau/vatthuc.tsx`):
  - cột cờ đỏ sao vàng bay, người quan sát, tòa nhà, ngân hàng, nhà, trường học;
  - cây, cây thông, hải đăng (đèn quét), tháp nước, cột điện, đèn đường, núi, mặt trời;
  - ô tô (bánh quay), thuyền, máy bay, khinh khí cầu, cầu, sông, thang, tiền, heo đất, diều, tường, hồ nước.
- **Cách dùng trong kịch bản**: nét `{"kieu":"vat","ten":"cot_co","goc":[x,y],"cao":...}`. Vật nằm cùng hệ tọa độ với tia nhìn, góc và số đo, nên đường đo chạm đúng đỉnh cột.
- **Bộ kiểm tra**: đề nói tới cột cờ, tòa nhà, ngân hàng, cây, người quan sát... mà hình không vẽ đúng vật đó thì tính là lỗi nặng (`VAT_THUC_TE_SAI`), và Gemini phải sửa.
- **Mảng tô mờ** (ví dụ tam giác vuông đánh dấu) giữ phẳng và trong suốt, không đùn khối che vật thật.
- **Mẫu mới**: `mau/kich_ban_cot_co.json` (đo cột cờ).

## 4. Kiểm duyệt video trước khi gửi bạn
1. **Kiểm duyệt bố cục tự động** trên GitHub, trước khi dựng:
   - Chụp 3 khung mỗi cảnh và đo trực tiếp: chữ tràn mép, chữ đè chữ, chữ bị cắt, mã TeX thô, công thức lỗi, chữ quá nhỏ.
   - Có lỗi nặng thì **không dựng**. Báo cáo theo từng cảnh được gửi về Apps Script, và Gemini **tự sửa kịch bản** rồi dựng lại.
   - Sau 2 lần sửa vẫn còn lỗi thì vẫn dựng, rồi chuyển sang bước 2.
2. **AI chấm video** theo tiêu chí bắt buộc của bạn:
   - đề bài nêu rõ ở đầu;
   - không chữ đè, tràn hay nhỏ;
   - không mã TeX;
   - hình đúng đề;
   - đáp án đúng.
   
   Chấm trên lưới khung hình (mỗi phần một khung), cần ≥ 8/10. Chưa đạt thì tự sửa và dựng lại, tối đa 2 lần.
3. Vẫn chưa đạt thì video bị **giữ lại**: không gửi bạn, không đăng. Bạn nhận một tin ngắn kèm lý do; nhắn `/xem <mã>` nếu vẫn muốn xem.

Video chưa qua kiểm duyệt **không bao giờ được đăng**, kể cả khi tắt duyệt tay.

## 5. Zalo: chỉ một bot (bot đề bài), chỉ báo việc quan trọng
- **Kênh gửi**: mọi thông báo đi qua **bot đề bài** (`ZALO_BOT_TOKEN_DE`). Người nhận là những người đã nhắn bot đề bài.
- **Lần đầu**: nhắn `/id` cho bot đề bài một lần để hệ thống nhớ bạn.
- **CAU_HINH `ZALO_THONG_BAO`** (mặc định `IT`):
  - `IT`: chỉ báo video đã đạt kiểm duyệt, video bị giữ, báo cáo ngày (1 tin/ngày), lỗi cần bạn ra tay (GitHub bị chặn, token hết hạn, đề không đọc được...).
  - `VUA`: thêm tin đăng video thành công và tin hết hạn mức.
  - `DAY_DU`: báo mọi tiến độ như trước.
- **Đã bỏ khỏi chế độ IT**:
  - báo cáo Bộ phận 1 sau mỗi lần chạy (mỗi 15 phút);
  - tin quá tải tạm thời;
  - các tin tiến độ "đã giải", "kịch bản xong", "dựng lại";
  - tin đề máy tự sinh bị loại;
  - tin học edit.

  Tất cả vẫn được ghi trong NHAT_KY và gộp vào báo cáo ngày.

## Cần làm phía Apps Script
1. Dán lại: **BoPhan1.gs, BoPhan2.gs, KiemTraHinh.gs, PromptKichBan.gs, ZaloDeBai.gs, NangCao.gs, SanPham.gs, DangVideo.gs**.
2. Triển khai → Quản lý các lượt triển khai → Chỉnh sửa → Phiên bản mới.
3. Sheet CAU_HINH:
   - nếu có dòng `DIEM_HINH_TOI_THIEU` = 7 thì sửa thành **8**;
   - có thể thêm `ZALO_THONG_BAO` (IT / VUA / DAY_DU) và `SO_LAN_TU_SUA_VIDEO` (mặc định 2).
4. Nhắn `/id` cho bot đề bài.
