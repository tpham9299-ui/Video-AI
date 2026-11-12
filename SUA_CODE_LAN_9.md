# Cập nhật lần 9: edit theo 4 video mẫu mới, phông chữ, giọng đọc tự nhiên, kịch bản mẫu mới

## Học được gì từ 4 video mẫu (chỉ lấy kỹ thuật edit, không chép nội dung)
| Video mẫu | Kỹ thuật | Đã đưa vào hệ thống |
|---|---|---|
| Thẻ giao diện nổi, nền giấy tím nhạt | Phụ đề IN HOA, từ đang đọc nằm trong **ô màu**; huy hiệu vàng **số chạy** (38 → 68 → 75); lưới ô **lấp đầy từng ô** rồi hiện nội dung; thẻ danh sách có dòng **tô vàng** | Phụ đề kiểu `hop`; `so_dem` số lăn kiểu công-tơ-mét + biến thể `kieu:"vien"`; vật mới `luoi_o`, `danh_sach` |
| "Kho skill" nền trắng | Tiêu đề hai dòng đậm nghiêng; khối nội dung **lướt vào rất nhanh, nhòe theo hướng chuyển động** rồi hãm êm | 4 kiểu chuyển cảnh `truot_len`, `phong`, `luot_ngang`, `truot_xuong` có nhòe theo hướng + tăng tốc/hãm kiểu expo; vật bay vào (`tu_huong`) cũng nhòe theo hướng |
| Bản đồ | Đường viền **vẽ dần**, vùng tô màu lan ra, nhãn bật lên, camera **phóng vào** chi tiết | Đã có sẵn (vẽ dần, `phong_to`); nay dùng chuyển cảnh `phong` cho cảnh bẫy và đáp án |
| Màn hình + người nói | Nhịp đổi hình rất dày, thẻ neon, số đếm lớn | Lời nhắc kịch bản yêu cầu cứ 2-3 giây phải có thay đổi trên màn hình |

## Phông chữ: Be Vietnam Pro
Phông thiết kế riêng cho tiếng Việt, dấu đẹp, có nét Black rất đậm cho tiêu đề và phụ đề. Phông được đóng gói sẵn trong `public/fonts`, không tải từ mạng nên không bao giờ lỗi. Giấy phép OFL: dùng miễn phí, kể cả cho mục đích thương mại. Công thức toán vẫn dùng phông LaTeX như cũ. Muốn dùng phông riêng: bỏ `tuy_chon-bold.ttf`… vào Drive `VIDEO_XACSUAT/font` (như cũ).

## Giọng đọc tự nhiên hơn: Gemini TTS
edge-tts chỉ có 2 giọng tiếng Việt và đọc khá "máy". Bản này thêm **Gemini TTS** của Google: giọng AI thế hệ mới, có ngữ điệu và cảm xúc, đọc liền mạch cả cảnh, được nhắc đọc "như thầy giáo trẻ làm TikTok: hào hứng, nhấn vào con số". Hệ thống dùng chính key Gemini bạn đang dùng ở Apps Script.

**Bật (2 phút):** GitHub repo > Settings > Secrets and variables > Actions > **New repository secret**: tên `GEMINI_API_KEY`, giá trị là key Gemini của bạn. Có secret này là tự dùng Gemini; không có thì dùng edge-tts như cũ.

Tùy chọn (tab Variables):
| Biến | Mặc định | Ghi chú |
|---|---|---|
| `GIONG_GEMINI` | `Puck` | Giọng nam trẻ, sôi nổi. Thử thêm: `Sadachbia` (nam, sống động), `Achird` (nam, thân thiện), `Laomedeia` (nữ, sôi nổi), `Aoede` (nữ, nhẹ nhàng), `Zephyr` (nữ, trong sáng), `Kore` (nữ, chắc giọng) |
| `TOC_DO_GEMINI` | `1.08` | Tốc độ đọc (1.0 = bình thường) |
| `TTS_MODEL` | `gemini-2.5-flash-preview-tts` | Đổi khi Google ra model TTS mới |
| `MAY_GIONG` | tự chọn | Đặt `edge` để quay về edge-tts |

An toàn: nếu Gemini lỗi hoặc hết hạn mức ở bất kỳ cảnh nào, **cả video** tự chuyển sang edge-tts, không trộn hai giọng khác nhau. Gói miễn phí của Gemini TTS có giới hạn số lần gọi mỗi ngày; mỗi video tốn khoảng 8 lần gọi (mỗi cảnh một lần).

## Kịch bản mẫu mới: Monty Hall ("Đổi cửa thì thắng gấp đôi?")
Bài kinh điển có kết quả trái trực giác, hợp làm hook. Kịch bản gồm 8 cảnh:
1. Ba cánh cửa và nhãn "50/50?" rung lên.
2. Bạn chọn cửa 1, người dẫn mở cửa dê.
3. Hai thanh xác suất 50%.
4. Cái bẫy: thẻ danh sách luật của người dẫn.
5. Chiếc bánh 1/3 - 2/3, mũi tên dồn sang cửa kia.
6. Lưới 30 lượt chơi, 20 ô thắng sáng lên, huy hiệu số lăn.
7. Đồng hồ đo dừng ở 2/3.
8. Bình chọn trên điện thoại.

## Lời nhắc kịch bản (PromptKichBan.gs) và bộ kiểm tra (KiemTraHinh.gs)
- **Thêm quy tắc giữ chân người xem:**
  - cứ 2-3 giây phải có thay đổi trên màn hình;
  - có vòng lặp tò mò, chỉ giải đáp ở cảnh đáp án;
  - có khoảnh khắc mời người xem đoán trước;
  - ưu tiên tình huống trái trực giác hoặc gây tranh cãi.
- **Thêm vật mới** `luoi_o`, `danh_sach`, `so_dem` kiểu `vien`, và trường `chuyen_canh` cho từng cảnh.

**Việc cần làm trên Apps Script:** thay hai tệp `PromptKichBan.gs` và `KiemTraHinh.gs` bằng bản mới. `BoPhan1.gs` không đổi so với lần 8b.
