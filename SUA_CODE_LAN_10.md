# Cập nhật lần 10: nền cực quang, motion graphic kết hợp Manim, chữ đậm

Phần này chỉ thay đổi bộ dựng video trên GitHub. **Không cần sửa gì trên Apps Script.**

## 1. Nền mới "cực quang" (mặc định, `kieuNen: "cuc_quang"`)
- Mảng màu lớn (xanh ngọc, tím, cam, lam) trôi chậm theo quỹ đạo cong và hòa sáng vào nhau. **Mỗi nhóm cảnh đổi sang một bảng màu khác**, chuyển màu từ từ.
- Sàn lưới phối cảnh 3D ở nửa dưới chạy về phía người xem.
- Ký hiệu toán/xác suất (π, Σ, ⅓, √, %, ∞, P(A), mặt xúc xắc…) trôi ở 3 tầng sâu: tầng xa nhỏ và nhòe, tầng gần lớn và rõ.
- Vệt sáng chéo quét qua định kỳ, lớp hạt mịn như phim, tối dần ra bốn góc.
- Nếu bạn có nền riêng trên Drive, lớp cực quang được phủ mờ lên nền đó (tắt bằng `"lopNeonTrenNen": false`). Muốn quay về nền cũ: `"kieuNen": "neon"`.

## 2. Motion graphic kết hợp Manim
| Hiệu ứng | Kiểu | Ở đâu |
|---|---|---|
| Dải màu chéo cam, xanh, tối lao vút qua đúng lúc cắt cảnh | Motion graphic | giữa các cảnh |
| Vòng sáng nở bung + chớp nhẹ | Manim Flash | trước cảnh bẫy và cảnh đáp án |
| Từng từ của tiêu đề lướt lên kèm nhòe chuyển động | Kinetic typography | tiêu đề mỗi cảnh |
| Bút vẽ gạch chân lượn sóng dưới từ khóa | Manim Create / Underline | tiêu đề mỗi cảnh |
| Vệt sáng quét qua nhãn cam | Motion graphic | nhãn ĐỀ BÀI, CÁI BẪY… |
| Tia sáng ngắn bắn ra từ tâm vật vừa xuất hiện | Manim Flash | mọi vật thật |
| Viền thẻ vẽ dần trước, nội dung hiện sau | Manim DrawBorderThenFill | thẻ (`the`) |
| Khối nội dung lướt vào nhòe theo hướng, hãm êm | Motion graphic | đã có từ lần 9 |
| Công thức biến hình, viết thêm lên bảng | Manim TransformMatchingTex | đã có |

Tắt dải màu chuyển cảnh: `"lopQuet": false` trong `phong_cach.json`.

## 3. Chữ dày, nổi hơn
- **Montserrat Black** (có đủ dấu tiếng Việt, giấy phép OFL) cho tiêu đề, câu hook, phụ đề, nhãn, con số lớn, huy hiệu kênh. Nét rất đậm và bè ngang.
- Chữ kiểu **sticker TikTok**: viền tối dày quanh chữ và bóng đổ khối 3D, nên chữ luôn nổi trên nền nhiều màu.
- **Công thức đậm** (`kieuToan: "dam"`, mặc định): công thức dùng Montserrat đậm có bóng, đường phân số dày hơn, thay cho phông LaTeX nét mảnh. Muốn quay lại kiểu Manim cổ điển: `"kieuToan": "latex"`.
- Phụ đề to hơn (60px) và đậm hơn; chữ thường trong thẻ vẫn dùng Be Vietnam Pro cho dễ đọc.
- Muốn dùng phông đậm riêng: bỏ tệp `tuy_chon-dam.ttf` vào Drive `VIDEO_XACSUAT/font`.
