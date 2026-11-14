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

## 7. Ký hiệu toán (suy ra, tương đương, xấp xỉ, ≤ ≥ ≠, mũi tên...) cùng cỡ với chữ
- Phông chữ chính không có các ký hiệu này nên trình duyệt mượn phông khác, vẽ rất nhỏ và mảnh (⇒ chỉ bằng nửa chữ số).
- Thêm phông "VietKyHieu" CHỈ áp cho các ký tự toán (mũi tên phóng 135-140%, ký hiệu quan hệ 122-126%, nét đậm),
  dùng chung cho công thức, thẻ chữ, nhãn trên hình và phụ đề, nên mọi chỗ cùng một cỡ.
- Ký hiệu gõ thẳng (⇒ ≈ ≤) trong công thức được đổi sang lệnh TeX để có đúng khoảng cách hai bên.

## Cần dán lại vào Apps Script
`KiemTraHinh.gs`, `PromptKichBan.gs`, `BoPhan1.gs` (bản trong thư mục bàn giao), rồi Triển khai > Quản lý > Phiên bản mới.

## Còn lưu ý
- Trong GEMINI_KEYS có **3 key bị Google từ chối** ("API key not valid"): key thứ 2, 5, 7 (bắt đầu "AQ.Ab8…").
  Hệ thống tự bỏ qua, nhưng nên thay bằng key tạo ở Google AI Studio để đủ hạn mức (giải toán lần này mất 981 giây vì thiếu key).
