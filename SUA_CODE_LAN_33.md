# SỬA CODE LẦN 33 — Kiểm thử thật với Gemini và sửa các chỗ chặn kịch bản

Chạy thử thật Bộ phận 1 (Gemini) với đề "Bác Minh có 120 m lưới thép rào vườn hình chữ nhật, một cạnh tựa bức tường gạch...".
Lần đầu kịch bản bị kẹt mãi ở 2 lỗi nặng. Lần này đã sửa và chạy lại thì ra kịch bản dùng được (đáp án đúng 60 m × 30 m, 1800 m²).

## 1. Máy kiểm tra hiểu sai bản vẽ nhìn từ trên (KiemTraHinh.gs)
- Tường gạch và hàng rào trong bản vẽ nhìn từ trên được ghi trong vùng (`"tuong": "trai"`, `"hang_rao": ["tren","phai","duoi"]`).
  Trước đây máy chỉ đếm hàng rào dạng `true`, không đếm tường, nên báo sai `VAT_THUC_TE_SAI` ("đề có bức tường mà không vẽ") mãi không hết.
- Xét 6 cảnh đầu thay vì 4 cảnh đầu (video nay có 15-20 cảnh).

## 2. Nhận ra cảnh giải thích công thức dù AI đặt tên khác
- Hàm mới `laCanhGiaiThichCongThuc_`: tính các loại `nhac_lai`, `kien_thuc`, `ly_thuyet`, `cong_thuc`, `giai_thich`, `nguon_goc`, `y_nghia`, `dinh_ly`...
  và cả cảnh mà lời thoại nói về công thức kèm "từ đâu / ý nghĩa / đại lượng / áp dụng".

## 3. Bản vẽ phải khớp số đo của đề
- Lỗi thấy trong lần chạy thật: Gemini đặt tường lên **cạnh ngắn** 30 m, nên 3 cạnh rào cộng lại 150 m (đề cho 120 m), nhãn x/y ngược với lời giải.
- `kiemTraSoDoVung_`: tổng các cạnh có rào phải bằng tổng lưới/rào của đề, sai thì báo `BAN_VE_SAI_SO_DO`.
- `tuSuaSoDoVung_`: nếu chỉ cần đổi cạnh dài/ngắn là khớp thì **máy tự đổi** (kèm đổi nhãn cạnh). Nhãn là số ("30 m") thì tự gắn đúng cạnh có độ dài đó.
- Bước lập bản vẽ nay được biết **đáp án đã giải** để vẽ đúng tỉ lệ, và có quy tắc rõ: "rong" là cạnh ngang, "dai" là cạnh dọc, tường nằm trên cạnh song song tường.

## 4. Bước riêng: bổ sung cảnh giải thích công thức
Theo yêu cầu "phải có cảnh giải thích công thức áp dụng như thế nào, từ đâu có, các đại lượng ra sao, sau này vận dụng thế nào".
Gemini viết kịch bản chính thường chỉ có 0-1 cảnh. Nay khi thiếu (dưới 2 cảnh), hệ thống gọi Gemini **một lần riêng** để viết đúng 3 cảnh:
1. **TỪ ĐÂU RA**: vì sao công thức đúng (thử số, hằng đẳng thức, hình vẽ).
2. **Ý NGHĨA**: mỗi chữ trong công thức là gì trong bài này (vẽ lại cảnh thực tế của đề, gắn tên đại lượng lên đúng cạnh).
3. **KHI NÀO DÙNG**: dấu hiệu nhận ra, điều kiện, dấu "=" xảy ra khi nào.

Gemini chỉ viết lời giảng, dòng công thức và chọn mẫu hình (thẻ ghi nhớ / bản vẽ thực tế / đồ thị). Máy tự dựng phần hình nên luôn hợp lệ.
Nếu chèn vào mà sinh lỗi nặng mới thì bỏ, giữ kịch bản cũ.

## 5. Sửa thêm
- Cảnh "giữ sân khấu" (giu_san_khau) chỉ thêm hành động trên vật cũ, không thêm vật mới: không còn bị báo lỗi `HINH_CANH_n`.
- Đáp án hiển thị không còn bị cắt giữa số ("Diện tích tối đa: 18" thay vì 1800 m²).
- Kịch bản mẫu mới `mau/kich_ban_rao_vuon.json` (18 cảnh) để dựng thử trên GitHub: chọn mau = kich_ban_rao_vuon.

## 6. Sửa sau khi xem video dựng thật (18 cảnh, 108 giây, kiểm duyệt 54/54 khung: 0 lỗi nặng)
- **Mặt bằng nhìn từ trên (vườn, ruộng) luôn PHẲNG 2D** như bản đồ. Trước đây có cảnh phẳng, có cảnh nghiêng 3D:
  nhãn cạnh bị che và cạnh 60 m trông không còn dài gấp đôi cạnh 30 m. 3D chỉ còn cho vật khối thật (ống xếp chồng, mặt tô đặc).
- **Cảnh liên hệ thực tế chỉ có hộp chữ** -> máy tự vẽ vật thật được nhắc trong lời thoại (chuồng trại -> hàng rào,
  sân bóng -> quả bóng, xây nhà -> ngôi nhà, gửi tiết kiệm -> ngân hàng...) cạnh một người, đúng tỉ lệ nhìn được.
- **Chỉ số nhiều chữ**: "S_max" trước hiện thành "Sₘax" (chỉ hạ chữ m). Nay hạ cả cụm "max". Mũi tên gõ tay "->", "=>" hiện thành mũi tên thật.
- **Một giọng cho cả video**: edge-tts đôi khi không đọc được một câu cụ thể, trước đây câu đó chuyển sang giọng Google (giọng khác hẳn).
  Nay thử đọc lại với chữ hơi khác (thêm dấu chấm, "À,") trước. Gemini TTS hết hạn mức ngày thì chuyển ngay, không chờ 4 phút.
- Số trên trục đồ thị và nhãn "MẸO NHỚ" to hơn (trước 23-25 px, dưới ngưỡng dễ đọc).

## 7. Ký hiệu toán: ĐÃ TRẢ VỀ BẢN CŨ
Bản phóng to ký hiệu (⇒ ≈ ≤...) không hợp, đã hoàn tác: ký hiệu hiển thị như trước. Các sửa khác vẫn giữ (đơn vị chữ đứng, S_max, mũi tên "->").

## 8. Sửa sau khi xem video tòa nhà (đề mới, Gemini viết thật: 13 cảnh, đáp án đúng 37,4 m)
- **Vật bị vẽ 2 lần**: cảnh có bản vẽ thực tế mà "giữ sân khấu" thì khối nhà 3D của cảnh trước vẫn còn, thành 2 tòa nhà, 2 người.
  Nay cảnh có bản vẽ thực tế luôn dựng lại từ đầu. Cảnh mở đầu cũng dùng bản vẽ đã duyệt thay cho khối hộp 3D.
- **Cảnh tính toán chỉ có người + một dòng chữ** (chữ còn đè lên người): nay tự đổi sang bản vẽ có số đo, tam giác vuông,
  để người xem thấy đang tính cạnh nào trên hình.
- **Huy hiệu đáp án số thập phân**: 37,4 trước hiện thành "3⁄" (bánh số dừng lưng chừng). Nay lăn đúng và có dấu phẩy.
- **Đơn vị** "30 m" trước bị vẽ nghiêng như chữ "п". Nay viết chữ đứng.
- **Dòng công thức cuối hiện quá muộn** (vừa viết xong thì hết cảnh): nay dòng cuối luôn xong trước khi hết cảnh ít nhất 1,2 giây.

## 9. Xoay vòng key Gemini và báo key hỏng
- **Hết hạn mức NGÀY** (lỗi 429 "per day"): hệ thống ghi nhớ key đó đã hết cho model này và chuyển ngay sang key kế, không gọi lại.
  Mọi key đều hết hạn mức ngày thì đổi sang model dự phòng. Hết cả model thì tạm nghỉ 60 phút rồi tự chạy lại, như trước.
- **Giới hạn THEO PHÚT** (429 khác): thử key khác. Mọi key cùng bận thì chờ đúng thời gian Google yêu cầu (tối đa 60 giây) rồi thử lại, tối đa 4 vòng.
- **Key LỖI THẬT** (sai key, hết hiệu lực, bị khóa, chưa bật API, lỗi thanh toán): hệ thống bỏ qua key đó và **bot Zalo đề bài báo bạn**:
  key thứ mấy trong GEMINI_KEYS, mấy ký tự đầu, lý do. Mỗi key chỉ báo 1 lần mỗi ngày. Bạn gỡ key đó khỏi Secret GEMINI_KEYS.
- Áp dụng cho: giải toán + viết kịch bản (GitHub), giọng đọc Gemini và AI nhìn hình (bước dựng video).
  Kho key riêng của Apps Script (KhoKey.gs của bạn) không nằm trong mã nguồn nên chưa đổi.

## Cần dán lại vào Apps Script
`KiemTraHinh.gs`, `PromptKichBan.gs`, `BoPhan1.gs`, `BoPhan2.gs` (bản trong thư mục bàn giao; BoPhan2.gs mới thêm ở mục 9 để báo key hỏng), rồi Triển khai > Quản lý > Phiên bản mới.

## Còn lưu ý
- Trong GEMINI_KEYS có **3 key bị Google từ chối** ("API key not valid"): key thứ 2, 5, 7 (bắt đầu "AQ.Ab8…").
  Hệ thống tự bỏ qua, nhưng nên thay bằng key tạo ở Google AI Studio để đủ hạn mức (giải toán lần này mất 981 giây vì thiếu key).
