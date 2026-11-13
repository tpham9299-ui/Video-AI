# Lần 24: Góc máy 3D không gây chóng mặt + tự học cách edit mỗi ngày

## Góc máy 3D
- Bộ 6 góc: chéo trái, từ trên xuống, chéo phải, góc thấp chính diện, cao toàn cảnh, nghiêng nhẹ. Mỗi cảnh bắt đầu ở một góc khác.
- Máy **đứng yên** khi giảng; chỉ đổi góc ở các mốc lời giảng sang ý mới, cách nhau ít nhất 2,5 giây, mỗi lần ~0,8 giây
  (tăng tốc rồi hãm êm). Không còn xoay liên tục.
- Kịch bản có thể chọn góc: `"goc_nhin": ["thap_chinh_dien", "tren_xuong"]`.

## Tự học cách edit mỗi ngày (NangCao.gs)
- 2 giờ sáng (CAU_HINH `HOC_EDIT_GIO`), hệ thống xem tối đa 3 video (`HOC_EDIT_SO_VIDEO`) và rút ra kỹ thuật edit, lưu vào sheet **HOC_EDIT**
  (kỹ thuật gặp lại nhiều lần thì cộng dồn `so_lan`, điểm trung bình).
- Nguồn video:
  1. **Thư mục Drive `hoc_edit`** (tự tạo cạnh thư mục kịch bản): video bạn lưu từ TikTok (nút "Lưu video") hoặc bất kỳ đâu.
     Hệ thống không tự tải từ TikTok vì điều khoản TikTok cấm tải tự động.
  2. Zalo **`/hoc <link YouTube>`**.
  3. Tự tìm YouTube Shorts nổi bật trong 7 ngày theo `HOC_EDIT_TU_KHOA` (xoay vòng từ khóa mỗi ngày).
- Áp dụng: các kỹ thuật điểm ≥ 6 mà bộ dựng làm được được **đưa vào lời nhắc viết kịch bản** (mỗi video 4 kỹ thuật, xoay vòng).
  Tắt một kỹ thuật: cột `ap_dung` = `TAT`.
- Kỹ thuật **cần lập trình thêm** (bộ dựng chưa có) được báo qua Zalo để bạn nhờ Claude làm.
- Zalo báo mỗi sáng: số video đã xem, kỹ thuật mới áp dụng, kỹ thuật cần lập trình.

## Cần làm
1. Dán đè `BoPhan1.gs`, `NangCao.gs`, `SanPham.gs`, `PromptKichBan.gs` → Triển khai → Phiên bản mới.
2. Chạy `caiDatNangCao()` một lần (thêm trigger học edit + tạo thư mục `hoc_edit`).
3. Thử ngay: chạy `hocEditHangNgay()`.
