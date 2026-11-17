# Cập nhật lần 8: sửa lỗi "vượt quá thời gian chạy" + video kiểu sân khấu neon + âm thanh mới

## A. Vì sao Bộ phận 1 ngừng giải đề và luôn báo "Exceeded maximum execution time"

Apps Script dừng cứng mọi lần chạy ở 6 phút. Bản cũ có 5 chỗ khiến nó vượt mốc và **kẹt lại mãi**:

| # | Nguyên nhân | Hậu quả |
|---|---|---|
| 1 | Số lần lỗi chỉ được ghi **sau khi** gọi Gemini xong. Bị Apps Script ngắt giữa chừng thì không ghi được gì | Lần chạy sau lại chọn **đúng đề đó**, lại bị ngắt, lặp vô hạn. Đây là lý do "chạy lại vẫn báo quá thời gian" |
| 2 | `goiGemini_` thử tối đa 3 vòng × 3 model, mỗi lần có thể mất 60-120 giây, không hề xem đồng hồ | Một lần viết kịch bản có thể kéo dài 10+ phút |
| 3 | Thời gian trung bình (`TB_GIAI_MS`, `TB_KICHBAN_MS`) bị **chặn trần** ở mức mặc định | Luôn đoán thiếu, bắt đầu việc không kịp làm xong |
| 4 | Mã kiểm chứng do AI viết (vét cạn tới 5 triệu vòng, có khi lặp vô hạn) chạy không giới hạn | Một đề "nặng" làm treo cả lần chạy |
| 5 | Cuối mỗi lần chạy vẽ lại bảng DOC_DE/DOC_KICH_BAN (30-90 giây) ngay cả khi đã ở phút thứ 5,6 | Vượt 6 phút dù việc chính đã xong |

Thêm vào đó Gemini 2.5/3 có chế độ "suy nghĩ" mặc định rất lâu với lời nhắc dài như lời nhắc viết kịch bản.

**Đã sửa trong `BoPhan1.gs`:** ghi "đang làm lần n" vào dòng **trước** khi gọi AI (bị ngắt vẫn tính 1 lần, quá `MAX_LAN_LOI` thì chuyển `LOI` kèm lý do `BI_NGAT_QUA_6_PHUT`); mọi lần gọi Gemini đều kiểm tra hạn chót và dừng gọn (`HET_GIO`, không tính lỗi cho đề); ước lượng theo số đo thật; mã kiểm chứng được chèn bộ đếm để tự dừng sau 25 giây (kể cả vòng lặp vô hạn); vẽ bảng chuyển sang trigger dọn dẹp 15 phút; viết kịch bản dùng mức suy nghĩ thấp (`MUC_SUY_NGHI_KICH_BAN`, tự bỏ tham số nếu model không nhận); đọc sheet `CAU_HINH` một lần mỗi lần chạy.

Đã chạy giả lập 6 lần liền (Gemini 20-120 giây/lần, kịch bản sai phải viết lại, mã kiểm chứng lặp vô hạn): **lần lâu nhất 240 giây**, không lần nào chạm 6 phút.

## B. Các bước cập nhật trên Apps Script (khoảng 10 phút)

1. **Code.gs**: xóa toàn bộ nội dung, dán nội dung tệp **`BoPhan1.gs`**. (Tệp chứa `khoGoi_`, `khoGoiSong_`, `khoDanhSachKey_` của bạn **giữ nguyên**, bản này vẫn gọi chúng như cũ.)
2. Tạo tệp mới **`PromptKichBan.gs`**, dán nội dung tệp cùng tên (lời nhắc viết kịch bản mới, tách riêng cho dễ chỉnh).
3. **KiemTraHinh.gs**: thay bằng bản mới (kiểm tra sân khấu, tiêu đề cảnh, tự sửa lỗi vặt).
4. `BoPhan2.gs` không đổi.
5. Chạy một lần theo thứ tự trong trình soạn thảo:
   - `cuuDongBiNgat()`: đưa các đề đang kẹt hoặc đã bị chuyển LOI vì quá giờ về hàng chờ.
   - `datLaiTb()`: xóa số đo thời gian cũ (bị chặn trần).
   - `caiDatTrigger()`: đặt lại trigger `chayBoPhan1` (mặc định 60 phút/lần) và trigger dọn dẹp 15 phút.
   - `thuGoiGemini()`: xem Gemini trả lời sau bao nhiêu giây. Nếu trên 60 giây, tăng `UOC_GOI_GEMINI_GIAY` trong sheet CAU_HINH cho khớp.
6. **Deploy > Manage deployments > Edit > Version: New version** (để `doPost` dùng mã mới).

Sheet `CAU_HINH` có thêm các khóa (tự dùng giá trị mặc định nếu bạn không thêm dòng): `CHU_KY_CHAY_PHUT` (60), `MUC_SUY_NGHI_KICH_BAN` (low), `MUC_SUY_NGHI_GIAI` (mac_dinh), `UOC_GOI_GEMINI_GIAY` (75). `GIAY_MUC_TIEU` đổi thành 45-70 và `GIAY_TOI_DA` thành 90 cho hợp TikTok/Shorts: nếu sheet của bạn còn dòng cũ (60-90, 120) thì sửa tay.

> Hạn mức: tài khoản Gmail thường được khoảng 90 phút chạy trigger mỗi ngày. Mỗi lần chạy giờ tối đa khoảng 5 phút, 60 phút/lần là an toàn. Đừng đặt 30 phút trừ khi dùng Google Workspace.

## C. Video kiểu "sân khấu" neon (Bộ phận 2, đã cập nhật trong repo)

Làm theo cách edit của 2 video mẫu (chỉ lấy kiểu chuyển động, không chép nội dung):
- **Nền** xanh đen có lưới mờ, đốm sáng xanh lá/cam trôi chậm như bokeh, quầng sáng ấm phía dưới.
- **Đầu mỗi cảnh**: nhãn cam dạng viên thuốc (ĐỀ BÀI, CÁI BẪY, MẤU CHỐT, ĐÁP ÁN...) và **tiêu đề lớn** chữ trắng đậm, từ khóa tô cam, bật vào kèm mờ nhòe chuyển động. Dòng chủ đề nhỏ cố định ở góc trên.
- **Sân khấu vật thật** (`minh_hoa.loai = "san_khau"`): 21 loại vật vẽ kiểu viền neon phát sáng: người, thẻ, lá bài, xúc xắc, đồng xu, hộp bi, túi bốc thăm, hộp quà, đồng hồ, điện thoại, bóng bay, đồng hồ đo xác suất, biểu đồ cột, thanh xác suất, vòng quay may mắn, cánh cửa, bánh chia phần, nhãn neon, chữ/công thức, bộ đếm số, mũi tên cong.
- **Hành động** theo từng câu thoại: chọn (sáng viền + dấu tích, phần còn lại tối và ngả xám như hàng thẻ trong video mẫu), loại bỏ (gạch chéo đỏ), rung, quay (xúc xắc lăn, xu lật, vòng quay quay, kim chạy), mở (cửa, hộp quà), lấy bi ra, đổi giá trị, thẻ bung tung tóe, camera phóng to, di chuyển, ẩn.
- **Giữ sân khấu qua nhiều cảnh** (`giu_san_khau: true`): các vật đứng yên, chỉ thêm hành động mới, liền mạch như video mẫu giữ nguyên hàng thẻ suốt video.
- **Phụ đề kiểu TikTok**: mỗi lần một cụm ngắn, chữ trắng viền đen, từ đang đọc phóng to màu xanh neon.
- Các mẫu cũ (sơ đồ cây, lưới màu, diện tích, Venn...) vẫn dùng được cho cảnh tính toán.

Xem thử: `mau/kich_ban_mau.json` (bài chọn 2 MC, đầy đủ 7 cảnh) và `mau/kich_ban_thu_vat.json` (trình diễn các vật). Chụp nhanh vài khung hình không cần dựng cả video: `node scripts/chupKhung.mjs public/props.json out/anh 40,300,600`.

## D. Âm thanh

- **Nhạc nền tự tạo** `public/nhac/nen.wav`: 120 BPM, có kick, clap, hi-hat, bass, arpeggio và pad "nhún" theo nhịp. Do máy sinh ra từ thuật toán (`scripts/taoAmThanh.py`), không lấy từ bài hát nào nên **không thể bị đánh bản quyền** trên TikTok hay YouTube.
- **Tự giảm nhạc khi có giọng đọc** (còn khoảng 40%), tăng lại ở quãng nghỉ.
- **19 hiệu ứng**: whoosh chuyển cảnh, pop khi vật xuất hiện, ding khi chọn đúng, tiếng "sai" khi rung/loại bỏ, xúc xắc lắc, đồng xu leng keng, vòng quay tách tách chậm dần, tiếng đồng hồ, mở quà lấp lánh, tiếng "vút lên" dồn nén trước cảnh đáp án, tiếng "bùm" khi hiện đáp án.
- **Muốn dùng nhạc khác**: bỏ tệp mp3 vào thư mục Drive `VIDEO_XACSUAT/nhac`, mỗi video tự chọn một bài (xoay vòng). Nguồn an toàn cho cả hai nền tảng: **YouTube Audio Library** (studio.youtube.com, mục Thư viện âm thanh, lọc "Không cần ghi công") và **Pixabay Music** (pixabay.com/music, giấy phép Pixabay Content License). Cách an toàn nhất trên TikTok vẫn là đăng video rồi chọn nhạc trong **Commercial Music Library** ngay trong ứng dụng; khi đó đặt biến GitHub `AM_LUONG_NHAC` = `0` để video không có nhạc nền.

---

# Bổ sung (lần 8b): Gemini quá tải 503, lồng tiếng, nền và thương hiệu kênh

## E. Lỗi "This model is currently experiencing high demand" (HTTP 503)
Đây là lỗi **phía máy chủ Google**: các model Gemini miễn phí đang quá tải, không phải lỗi mã hay key của bạn. Bản mới xử lý như sau:
- Thêm model dự phòng thứ 4 `MODEL_DU_PHONG_3` = `gemini-flash-lite-latest` (bản lite thường ít quá tải hơn).
- Model vừa báo 503 bị đẩy xuống cuối danh sách trong 10 phút.
- Thử lại tối đa 3 vòng, chờ tăng dần 8 giây rồi 20 giây.
- Nếu **mọi** model đều 503: dừng gọn, không tính lỗi cho đề, tạm nghỉ `PHUT_NGHI_QUA_TAI` phút (mặc định 20) rồi tự chạy lại, và chỉ báo Zalo tối đa 3 giờ một lần.
- `thuGoiGemini()` giờ thử **từng model** và in kết quả, để bạn biết model nào đang dùng được.

Việc bạn cần làm: dán lại `BoPhan1.gs` vào Code.gs. Nếu muốn, thêm 2 dòng vào sheet CAU_HINH: `MODEL_DU_PHONG_3` = `gemini-flash-lite-latest` và `PHUT_NGHI_QUA_TAI` = `20`. Không thêm thì hệ thống dùng đúng các giá trị này.

## F. Lồng tiếng
- Các lần dựng thật trên GitHub vẫn có giọng đọc (edge-tts, giọng `vi-VN-NamMinhNeural` theo biến `GIONG` của bạn). Video thử tôi gửi trước đó không có giọng thật vì máy của tôi bị chặn mạng tới dịch vụ giọng đọc.
- Thêm **giọng dự phòng Google TTS**: nếu edge-tts lỗi ở đoạn nào, đoạn đó tự đọc bằng giọng Google (được tăng tốc cho khớp nhịp). Nếu cả hai đều lỗi, lần dựng báo lỗi chứ không ra video câm.
- **Chuẩn hóa độ lớn giọng** (lọc tiếng ù, nén động, -15 LUFS như podcast/TikTok) để lời giảng luôn rõ hơn nhạc nền.
- Nhật ký bước "Tạo giọng đọc" in số đoạn dùng mỗi loại giọng.
- Đổi giọng: biến `GIONG` (`vi-VN-HoaiMyNeural` giọng nữ, `vi-VN-NamMinhNeural` giọng nam). Đổi tốc độ: biến `TOC_DO`, ví dụ `+15%`.

## G. Nền của bạn và thương hiệu kênh (vẫn giữ cơ chế cũ, nâng cấp thêm)
**Nền** (thư mục Drive `VIDEO_XACSUAT/nen`, như cũ):
- Mỗi video dùng tới `soNenToiDa` nền (mặc định 3), chọn và xáo theo mã video. Các video khác nhau dùng bộ nền và thứ tự khác nhau.
- **Đổi nền theo nhóm cảnh**; các cảnh nối tiếp nhau (`giu_san_khau`) giữ cùng một nền. Chuyển nền bằng hiệu ứng mờ dần kèm phóng nhẹ.
- Mỗi nền một kiểu chuyển động máy quay: phóng to, thu nhỏ, lia trái, lia phải, lia dọc. Video nền vẫn tự lặp và tắt tiếng.
- Lớp tối và lớp lưới + đốm sáng neon phủ lên nền để chữ và hình luôn rõ. Tắt lớp neon bằng `"lopNeonTrenNen": false`. Muốn luôn dùng một nền: `nen_co_dinh` (như cũ).

**Thương hiệu** (logo `VIDEO_XACSUAT/thuong_hieu/logo.png`; tên, khẩu hiệu, handle trong `phong_cach.json`, như cũ):
- **Huy hiệu động** góc trên trái: logo bật lên trong vòng sáng xoay hai màu, tên kênh và khẩu hiệu hiện ra kèm vệt sáng quét. Khoảng 3,5 giây sau thu gọn thành logo tròn; vòng sáng xoay chậm và cứ 9 giây phát một nhịp sóng. Không có ảnh logo thì tự vẽ chữ viết tắt của tên kênh.
- **Giữa video** huy hiệu mở lại khoảng 2 giây, hiện `@handle`.
- **Lời mời theo dõi** ở cảnh chốt bài: thẻ trượt vào kèm logo và câu `loiMoi`, chuông rung, nút "+" được bấm rồi thành dấu ✓, có tiếng "ding".
- **Logo chìm** lớn phía sau trôi và xoay nhẹ (`markNuoc`).
- **Màn kết**: có tệp `outro.png`/`outro.mp4` thì dùng như cũ. Không có thì tự tạo màn kết 2,5 giây: logo lớn trong vòng sáng, tia sáng bung ra, tên kênh chạy chữ, nút "Theo dõi" được bấm. Tắt bằng `"outroTuTao": false`.
