# Sửa code lần 15: 3D toàn khung, toán thực tế, đề Zalo ưu tiên

## 1. Phần dựng video (GitHub, tự áp dụng khi đẩy lên)

| Yêu cầu | Đã làm |
|---|---|
| Cảnh bị vỡ (cánh cửa bị cắt ở 00:06) | Bỏ cách dựng 3D bằng các mặt phẳng CSS cắt nhau; thay bằng **máy chiếu 3D tự tính** (`src/sankhau/chieu3d.ts`). Mọi vật được chiếu phối cảnh rồi vẽ phẳng, xếp trước/sau theo độ sâu, nên không còn bị sàn hay bóng đổ cắt mất. |
| 3D cho cả khung hình | Sàn lưới 3D trải hết khung 1080×1920 (không còn khung chữ nhật cố định), mờ dần theo khoảng cách. Khung viền sân khấu tự ẩn khi camera nghiêng. |
| Vật cho toán thực tế (3D hòa với 2D) | `khoi_hop` (bể kính có nước dâng, nhãn kích thước), `tru`, `non`, `cau`, `toa_nha` (cửa sổ sáng), `xe`, `cay`, `thang`; `hinh_hoc` (điểm, cạnh có độ dài, góc, góc vuông, vùng tô, vẽ dần kiểu Manim); `do_thi` (đồ thị vẽ dần, điểm chạy dọc đường cong, đánh dấu cực trị). Bộ đọc biểu thức an toàn, không dùng eval. |
| Watermark | Logo trong vòng tròn kính nhỏ, đổi góc theo từng nhóm cảnh, có vệt sáng lướt qua, độ mờ 0,62, không còn nằm đè giữa nội dung. |
| Canh giữa chữ | Khối công thức, tiêu đề, thanh trên cùng (logo, lớp, chủ đề) đều canh giữa cân đối. |
| Mở đầu ấn tượng | Tia tốc độ và sóng xung kích ở khung hình đầu, chữ hook lật 3D từng từ, từ khóa có nền cam quét ngang, quầng sáng nhịp thở. |
| Nhãn cảnh mới | `mo_hinh_hoa` hiện "MÔ HÌNH HÓA" (bước "MÔ HÌNH" trên thanh tiến độ). |
| Workflow | Mỗi đề một nhóm `concurrency`, nên đề ưu tiên được dựng song song với video đang dựng. Chạy tay có lựa chọn kịch bản mẫu (mặc định `kich_ban_thuc_te`). |

Kịch bản mẫu toán thực tế: `mau/kich_ban_thuc_te.json` (bể nước 32 m³ tốn ít vật liệu nhất).

## 2. Apps Script: thay 4 tệp, thêm 1 tệp

Thay toàn bộ nội dung `BoPhan1.gs`, `BoPhan2.gs`, `PromptKichBan.gs`, `KiemTraHinh.gs`. Thêm tệp mới **`ZaloDeBai.gs`**.

### Có gì mới
- **Chủ đề video** (sheet CAU_HINH, khóa `CHU_DE_VIDEO`): `XEN_KE` (mặc định: luân phiên xác suất và toán thực tế) | `XAC_SUAT` | `THUC_TE`.
- **Chỉ lấy dạng bài dựng được**: khi tìm hoặc sáng tác, mỗi đề phải có `dang` nằm trong danh sách `DANG_DUNG_DUOC` (bể/hộp, lon/trụ, đo chiều cao, thang, đường đi ngắn nhất, hàm bậc hai, rào vườn, lãi suất, chuyển động, đu quay, bồn bể; với xác suất: bi-hộp, xúc xắc, chọn người...). Dạng lạ bị bỏ và ghi `BO_DANG_LA` vào nhật ký.
- **Toán thực tế**: đáp số là một con số (có thể thập phân). Hệ thống giải 2 cách, chạy mã tính số (vét lưới/Simpson) để kiểm chứng, so khớp với sai số 0,3% hoặc theo số chữ số làm tròn. Cột mới `dap_an_hien` lưu cách trình bày, ví dụ "x = 4 m; S = 48 m²".
- **Kịch bản toán thực tế** chi tiết hơn: cảnh thật 3D → mô hình hóa (hinh_hoc/do_thi) → tính → kiểm tra trên đồ thị → quay lại cảnh thật với kết quả. Bộ kiểm tra bắt buộc có ít nhất 2 cảnh vật 3D thật và 1 cảnh hình học hoặc đồ thị, kiểm tra biểu thức đồ thị và tên điểm.
- **Mở đầu**: khóa `KIEU_MO_DAU` = `hook` (vào thẳng câu móc, khuyên dùng) hoặc `chao_hook` (cho phép "Chào bạn!" cực ngắn rồi vào câu móc).
- **5 cột mới** nối vào cuối HANG_DOI: `mon, uu_tien, file_anh, zalo_chat, dap_an_hien`. Tiêu đề cột được tự thêm ở lần chạy đầu; dữ liệu cũ không bị lệch.

### Đề gửi qua Zalo được ưu tiên
1. Bạn gửi **ảnh chụp đề** (hoặc gõ đề) cho bot. Có thể kèm ghi chú như "câu 3, lớp 12".
2. Bot trả lời ngay, rồi sau ~20 giây hệ thống đọc ảnh bằng Gemini → giải 2 cách + kiểm chứng → viết kịch bản → gửi GitHub dựng. Mỗi bước bot đều nhắn cho bạn.
3. Trong lúc đó các đề khác **tạm dừng** (không sinh đề, không giải, không gửi dựng). Xong video, bot gửi link và hệ thống tự làm tiếp các đề khác.
4. Đề ưu tiên không bị bỏ ngay khi hai cách giải lệch nhau: hệ thống giải thêm lần thứ ba (suy nghĩ kỹ) và lấy đáp án có ít nhất 2 cách đồng ý. Nếu cả ba đều khác nhau, bot báo lại cho bạn.
5. Gemini quá tải (503): đề ưu tiên nghỉ 4 phút rồi thử lại (đề thường nghỉ 20 phút).
6. Đề đã từng có video: bot gửi lại link cũ, không làm lại.

Lệnh nhắn cho bot: `/id` (xem mã chat), `/tt` (tiến độ), `/huy` (hủy đề vừa gửi), `/giup`.

### Cài đặt (làm một lần)
1. Dán 5 tệp vào dự án Apps Script và lưu.
2. **Deploy > Manage deployments > Edit > Version: New version > Deploy** (web app: Execute as *Me*, Who has access *Anyone*). Địa chỉ `/exec` giữ nguyên nên không cần sửa GitHub Secret.
3. Thêm Script Property **`WEB_APP_URL`** = địa chỉ web app kết thúc bằng `/exec` (Triển khai > Quản lý các lượt triển khai > bản "Ứng dụng web" > sao chép URL; đây cũng là địa chỉ bạn đã dán vào GitHub Secret `APPS_SCRIPT_URL`). Khi chạy từ trình soạn thảo, Apps Script thường chỉ trả về địa chỉ thử nghiệm `/dev` mà Zalo không gọi được, nên cần bước này.
4. Chạy hàm **`caiDatZalo`** một lần, rồi xem *Nhật ký thực thi*:
   - "✅ Đã đăng ký webhook" là xong.
   - Nếu báo bot đang có webhook khác (bot dùng chung với hệ thống khác): tạo một bot Zalo riêng cho việc nhận đề, đặt token của bot đó vào Script Property `ZALO_BOT_TOKEN_DE`, rồi chạy lại `caiDatZalo`. Chỉ chạy `caiDatZaloGhiDe` nếu bạn chắc chắn muốn ghi đè webhook cũ.
5. Nhắn `/id` cho bot. Nếu mã chat chưa có trong `ZALO_CHAT_IDS`, thêm vào (cách nhau dấu phẩy).
6. Gửi thử ảnh một đề. Muốn thử mà không cần Zalo: chạy hàm `thuDeUuTien`.

`ZALO_WEBHOOK_SECRET` do `caiDatZalo` tự tạo; không cần nhập tay.
