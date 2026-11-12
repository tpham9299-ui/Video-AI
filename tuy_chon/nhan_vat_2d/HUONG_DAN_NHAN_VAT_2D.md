# Nhân vật 2D dẫn chuyện

Nhân vật là cậu bé hoạt hình của bạn (các ảnh PNG nền trong suốt). Hệ thống lo phần **chuyển động và hiệu ứng**, bạn chỉ cần chuẩn bị bộ ảnh các dáng.

## 1. Nhân vật làm gì trong video
- **Nhảy bước vào** từ mép phải ở đầu video (bật nhảy, ép dẹp người khi chạm đất, nghiêng người), rồi **nhảy bước ra** ở cuối.
- **Đổi dáng theo cảm xúc từng cảnh** (AI chọn trong kịch bản), chuyển mờ dần kèm một nhịp nảy.
- **Biểu tượng cảm xúc bay quanh đầu** (tự vẽ bằng mã, bạn không cần vẽ):

| Cảm xúc | Hiệu ứng |
|---|---|
| `ngac_nhien` (hook, kết quả bất ngờ) | hai dấu `!` bật lên + tia giật mình + rung |
| `nghi` (đang suy nghĩ) | bong bóng suy nghĩ hiện ba dấu chấm lần lượt |
| `boi_roi` (cái bẫy, chỗ dễ nhầm) | ba dấu `?` lắc lư + giọt mồ hôi chảy |
| `y_tuong` (nghĩ ra hướng giải) | bóng đèn 💡 bật sáng có tia |
| `thao_tac` (đang tính, đếm) | các ký hiệu + × = ÷ quay quanh đầu |
| `vui` (ra đáp án) | pháo giấy nổ + ngôi sao |
| `tu_tin` (chốt bài học) | lấp lánh |

- **Khi nói:** nhún theo độ lớn giọng, lắc đầu theo nhịp; có ảnh miệng mở thì **nhép miệng**.
- **Khi đứng yên:** thở, đung đưa; có ảnh nhắm mắt thì **chớp mắt**.
- **Chỉ tay:** khi lời giảng nhắc tới hình minh họa, đổi sang dáng `chi_tay` (nếu bạn có ảnh này).
- Cảnh hook nhân vật **to hơn** (380 px) rồi thu về 300 px; nhân vật đứng cạnh phụ đề ở góc dưới bên phải, không chiếm khung hình bài giảng.

## 2. Bộ ảnh cần chuẩn bị
Đặt vào thư mục Drive **`VIDEO_XACSUAT/nhan_vat`** (đổi bằng biến `DRIVE_NHAN_VAT` trên GitHub). Tên tệp đúng như bảng (chữ thường, không dấu):

| Tên tệp | Dáng của nhân vật |
|---|---|
| `mac_dinh.png` | **bắt buộc**: đứng thả lỏng, mỉm cười nhẹ, nhìn thẳng (dáng dự phòng) |
| `ngac_nhien.png` | mắt mở to, miệng chữ O, hai tay giơ lên ngang mặt |
| `nghi.png` | một tay chống cằm, mắt nhìn lên, hơi nghiêng đầu |
| `boi_roi.png` | một tay gãi đầu, lông mày nhíu, miệng méo |
| `y_tuong.png` | mắt sáng, cười tươi, một ngón tay giơ lên |
| `thao_tac.png` | hai tay phía trước như đang đếm hoặc cầm thẻ, cúi nhìn xuống |
| `vui.png` | hai tay giơ cao, cười toe |
| `tu_tin.png` | hai tay chống hông, ngẩng cằm, cười tự tin |
| `chi_tay.png` | (tùy chọn) một tay duỗi chỉ sang trái, về phía nội dung |
| `mac_dinh_mo.png`, `nghi_mo.png`... | (tùy chọn) cùng dáng đó nhưng **miệng mở** để nhép miệng |
| `mac_dinh_nham.png`... | (tùy chọn) cùng dáng đó nhưng **nhắm mắt** để chớp mắt |

Thiếu dáng nào thì tự lùi về dáng gần nghĩa rồi `mac_dinh`. Bạn có thể bắt đầu chỉ với `mac_dinh.png` rồi bổ sung dần.

### Yêu cầu kỹ thuật cho ảnh
- **PNG hoặc WebP nền trong suốt.**
- **Mọi ảnh cùng kích thước** (ví dụ 1024×1024) và nhân vật **căn đáy, căn giữa, cùng tỉ lệ** để đổi dáng không bị nhảy vị trí.
- Nhân vật nên **nhìn sang trái** (về phía nội dung). Nếu ảnh của bạn nhìn sang phải, đặt `"lat": true` trong `phong_cach.json`.
- **Đừng vẽ sẵn** bóng đèn, dấu hỏi, dấu chấm than, mồ hôi, pháo giấy vào ảnh: mã sẽ vẽ và làm chuyển động chúng. Nếu ảnh đã có sẵn thì thêm tên cảm xúc vào `"emoteTat"` (ví dụ `["y_tuong", "boi_roi"]`) để khỏi bị đôi.

### Cách làm bộ ảnh nhất quán (công cụ tạo ảnh AI)
Dùng ảnh gốc cậu bé làm tham chiếu và nhờ công cụ tạo ảnh của bạn, mỗi dáng một lần, với câu lệnh dạng:

> Giữ nguyên nhân vật cậu bé này (tóc nâu đỏ, áo thun đen, cùng phong cách vẽ). Dáng: **[mô tả dáng ở bảng trên]**. Toàn thân hoặc từ đầu gối trở lên, nhìn sang trái, nền xanh lá đơn sắc, không có chữ, không có biểu tượng bay quanh đầu.

Sau đó tách nền (Canva "Xóa nền", remove.bg, Photoshop hoặc công cụ tương tự) để có PNG trong suốt, rồi chỉnh các ảnh về cùng kích thước.

## 3. Chỉnh trong `phong_cach.json`
```json
"nhanVat": { "cao": 300, "caoHook": 380, "lat": false, "emote": true, "emoteTat": [] }
```
`cao`/`caoHook`: chiều cao nhân vật (px) ở cảnh thường/cảnh hook. `lat`: lật ngang. `emote`: bật/tắt biểu tượng cảm xúc. `emoteTat`: các cảm xúc không cần biểu tượng.

## 4. Xem thử trước khi dựng thật
Trên máy: đặt ảnh vào `public/nhan_vat/`, chạy
```
python3 scripts/chuanbi.py mau/kich_ban_mau.json --gia-lap
npx remotion studio src/index.ts --props=public/props.json
```
để xem cả video mẫu có nhân vật của bạn trong Remotion Studio (giọng giả bằng tiếng bíp, chỉ để xem chuyển động). Hoặc đẩy lên GitHub và chạy workflow "Dựng video" (Run workflow) để dựng bản mẫu thật.

Nhân vật 3D đã thử và cất ở thư mục `tuy_chon/nhan_vat_3d` (không dùng trong bản chính).
