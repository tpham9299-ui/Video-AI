# Nhân vật 3D (hướng B): tạo nhân vật, đưa vào hệ thống, kiểm tra

## 1. Nhân vật làm gì trong video
- **Đi vào** từ mép phải màn hình ở đầu video (bước chân, tay vung, gối gập), quay mặt về phía người xem rồi đứng nói.
- **Đổi tư thế theo cảm xúc từng cảnh** (AI chọn trong kịch bản): giật mình, chống cằm suy nghĩ, gãi đầu bối rối, giơ ngón tay lên khi có ý tưởng (kèm bóng đèn 💡), hai tay trước bụng khi tính toán, giơ tay mừng khi ra đáp án (có nhảy lên), chống hông tự tin khi chốt bài.
- **Chỉ tay vào hình minh họa** ở giữa mỗi cảnh có hình.
- **Nhép miệng theo giọng đọc** (các nguyên âm a, i, u, e, o theo độ lớn tiếng), **chớp mắt**, thở, đung đưa nhẹ, gật đầu theo lời.
- **Biểu cảm khuôn mặt** theo cảm xúc (vui, bất ngờ, buồn nhẹ...).
- **Đi ra** khỏi màn hình ở cuối video.

## 2. Tạo nhân vật bằng VRoid Studio (miễn phí)
1. Tải **VRoid Studio** tại vroid.com/en/studio (Windows/macOS).
2. Tạo nhân vật theo ý bạn (ví dụ giống cậu bé hiện tại: tóc nâu đỏ, áo thun đen, quần tối). Kiểu tóc, mặt, quần áo chỉnh trong các tab của VRoid.
3. Xuất tệp: **Camera/Capture > Export > VRM**.
   - Nếu có lựa chọn, ưu tiên **VRM 1.0**; VRM 0.x cũng chạy được.
   - Trong tùy chọn xuất, **giảm kích thước ảnh (texture) xuống 1024** và bật giảm số đa giác để tệp **dưới khoảng 20 MB** (nhanh hơn, ít lỗi hơn).
   - Mục giấy phép: cho phép sử dụng thương mại và đăng tải video.
4. Đặt tên **`nhan_vat.vrm`** và bỏ vào thư mục Drive **`VIDEO_XACSUAT/nhan_vat3d`**. (Đổi thư mục bằng biến `DRIVE_NHAN_VAT_3D` trên GitHub.)
   - Mô hình VRoid mặc định đã có sẵn biểu cảm chớp mắt, nhép miệng và vui/buồn/giận.

## 3. Kiểm tra trước khi dựng video thật
Vào GitHub > **Actions > "Thử nhân vật 3D" > Run workflow**. Sau vài phút tải về tệp `thu_nhan_vat.mp4` ở mục *Artifacts*: nhân vật đi vào, làm lần lượt 8 tư thế, nói, chỉ tay, rồi đi ra. Bạn xem có tay xuyên người, mặt quay sai hướng, nhân vật bị cắt mép hay quá nhỏ/quá to không. (Hoặc chạy `npm run studio` trên máy rồi chọn bản dựng **ThuNhanVat**.)

Nếu có lỗi hoặc chưa ưng, gửi tôi tệp clip thử hoặc ảnh chụp màn hình và nhật ký lỗi, tôi chỉnh tiếp. Các hằng số hay cần chỉnh:
- Khung nhìn và các cỡ cảnh: `MAY_RONG`, `MAY_VUA`, `MAY_CAN`, `MAY_TAY_CAO` trong `src/avatar/thoiGian.ts`; kích thước khung 3D: `RONG_NV`, `CAO_NV`, ánh sáng, `TI_LE_DAU` trong `src/avatar/Avatar3D.tsx`.
- Tư thế từng cảm xúc: `TU_THE` trong `src/avatar/poses.ts` (góc tính bằng độ: `ha` hạ tay, `tien` đưa ra trước, `khuyu` gập khuỷu).
- Đi vào/ra, chỉ tay, nhảy: `src/avatar/thoiGian.ts`.

## 4. Nếu không có tệp .vrm hoặc tải lỗi
Hệ thống tự quay về **nhân vật ảnh 2D** (thư mục `nhan_vat`); không có luôn thì video không có nhân vật. Video không bao giờ dừng vì lỗi nhân vật.

## 5. Để nhân vật bớt "nhựa" và cuốn hút hơn (phiên bản 2)
Đã làm trong mã:
- **Khung hình điện ảnh**: đi vào bằng cảnh rộng toàn thân, rồi **máy quay tiến lại** cận từ hông lên để thấy mặt và tay; ở hook máy đẩy sát vào mặt đúng lúc giật mình; cảnh mừng và giơ tay thì lùi ra để không cắt mất bàn tay; khi chỉ tay máy dịch để cánh tay duỗi ra vẫn nằm trong khung.
- **Đầu to hơn 25%** (hằng số `TI_LE_DAU` trong `Avatar3D.tsx`) để khuôn mặt và biểu cảm dễ thấy trên màn hình điện thoại.
- **Ánh sáng kiểu hoạt hình**: bớt sáng đều (áo trắng không còn cháy), có đèn chính ấm, đèn viền lạnh phía sau, và **hào quang** nhấp nháy theo giọng sau lưng nhân vật.
- **Chuyển tư thế có quán tính**: vai đi trước, cẳng tay và bàn tay đến sau, vọt nhẹ qua đích rồi quay lại (không còn trượt đều kiểu robot); giật mình ở hook thật sự ngửa người ra sau.
- **Bàn tay thả lỏng** (ngón cong nhẹ), chỉ bằng một ngón khi chỉ tay và khi nảy ý tưởng, nắm khi chống hông; **tay nhịp theo lời nói**.
- Nếu ngón tay của mô hình bạn **gập ngược ra phía mu bàn tay**, đổi `HUONG_CUON` từ `1` thành `-1` trong `src/avatar/poses.ts`.

Còn phụ thuộc vào mô hình của bạn (làm trong VRoid Studio):
- Chọn **trang phục không xắn tay áo** hoặc giảm độ dày nét viền: vệt viền đen ở cổ tay áo trong clip thử là do phần tay áo xắn.
- Chọn màu có độ tương phản (áo màu thay vì trắng hoàn toàn), tóc và mắt có màu nổi; chỉnh mắt to và biểu cảm rõ.
- Đừng dùng bản mẫu mặc định nếu muốn nhân vật có cá tính: nhân vật riêng, có đặc điểm nhận dạng (tóc, phụ kiện, màu áo) hấp dẫn hơn nhiều.

## 6. Giới hạn cần biết
- Tóc và quần áo **không có mô phỏng vật lý** (nên tóc đứng yên theo xương, chưa bay theo cử động) (đứng yên theo xương). Cố ý như vậy: Remotion dựng các khung hình song song nên mô phỏng theo thời gian sẽ làm các khung hình không khớp nhau.
- Dựng 3D trên máy GitHub không có card đồ họa nên chậm hơn: dự kiến mỗi video thêm vài phút. Có thể phải tăng thời gian chờ nếu video dài.
- Ngón tay giữ nguyên tư thế mặc định của mô hình (không nắm/chỉ từng ngón); tư thế "giơ một ngón" là giơ cả bàn tay.
