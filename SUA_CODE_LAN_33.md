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

## 10. Kiểm duyệt chặt hơn để lời giải, hình, đáp án không sai
Các lỗi ở video mẫu hôm nay mình phát hiện bằng mắt, hệ thống tự động chưa bắt được. Nay bịt các lỗ hổng:
- **AI chấm video thấy MỌI CẢNH** (trước chỉ xem 7 khung, cảnh khác có thể lọt lỗi). Thêm tiêu chí: không vật vẽ lặp, mọi phép tính
  trên màn hình đúng và dẫn đúng tới đáp án, huy hiệu đáp án đọc rõ, dòng công thức cuối hiện đủ.
- **AI chấm lỗi KHÔNG còn cho qua**: trước đây AI không chấm được (hết key, mạng) thì video vẫn được gửi. Nay giữ lại, lượt sau chấm lại;
  6 lượt vẫn không chấm được thì giữ video (không gửi, không đăng) và báo Zalo "/xem" để bạn xem tay.
- **AI nhìn hình TRƯỚC KHI DỰNG xem mọi cảnh** (trước chỉ 2 cảnh) với danh sách kiểm tra: vật thật đúng đề, không vật lặp, số đo đúng chỗ,
  số và đáp án trên màn hình khớp đáp án đã kiểm chứng. Không chạy được thì ghi rõ trong nhật ký (trước đây bỏ qua trong im lặng).
- **Máy tự đọc chữ trên khung đáp án**: đáp số hiện trên màn hình (kể cả huy hiệu số lăn) phải đúng đáp án đã kiểm chứng; sai -> lỗi nặng, không dựng.
  Đã thử: cố tình cho huy hiệu hiện 36,9 thay vì 37,4 -> máy chặn đúng.
- **Kiểm phép tính lượng giác**: dòng "30 · tan(50°) ≈ 34,1" trước đây không kiểm được, nay máy tính thật và bắt lỗi.
- Nhận diện key hỏng bằng 6 ký tự đầu + 4 ký tự cuối (3 key hỏng hiện tại cùng bắt đầu "AQ.Ab8").

Chốt cuối vẫn là bạn: chế độ "duyệt trước khi đăng" đang BẬT, không video nào được đăng khi bạn chưa gõ /duyet.

## 11. Đề phải có đáp án chắc chắn, đề lệch/mơ hồ thì sửa hoặc xóa
- **Khi tạo đề** (AI sáng tác hoặc tìm trên internet): bắt buộc đề có ĐÚNG MỘT đáp án chính xác, dữ kiện không mâu thuẫn, câu hỏi chỉ hiểu
  một cách (nói rõ làm tròn, có hoàn lại không, có phân biệt thứ tự không...). Người ra đề phải TỰ GIẢI và ghi đáp án; đề internet chép đáp án của nguồn.
- **Khi giải**: đáp án phải được nhiều cách giải độc lập + mã máy tính thống nhất (trọng tài, như trước) VÀ khớp đáp án của người ra đề.
- **Đề không đạt** (các cách giải lệch nhau / đề mơ hồ / lệch đáp án người ra đề):
  1. Hệ thống nhờ AI VIẾT LẠI đề một lần (giữ bối cảnh, dạng bài, độ khó; sửa số liệu cho có một đáp án duy nhất) rồi giải lại TỪ ĐẦU qua đủ các bước kiểm chứng.
  2. Sửa rồi vẫn không đạt -> xóa hẳn khỏi sheet (mã băm lưu vào LUU_TRU để không sinh lại đúng đề đó).
  3. Đề bạn tự gửi qua Zalo: không tự đổi đề của bạn; không chắc chắn thì báo Zalo và xóa, bạn gửi lại đề rõ hơn.
- **Bỏ hẳn kiểu "làm theo cách hiểu hợp lý nhất"**: trước đây đề mơ hồ vẫn được làm video kèm ghi chú; nay không còn.
- **Dọn sheet**: các đề LOAI (lệch đáp án) đang có sẽ bị xóa ngay ở lần chạy tới (trước đây giữ 7 ngày), cùng các đề cũ bị đánh dấu
  "DE_CO_VAN_DE" mà chưa dựng video (trừ đề bạn tự gửi).

## 12. Kiểm tra key Gemini
- Workflow mới **"Kiểm tra key Gemini"** (GitHub > Actions > Kiểm tra key Gemini > Run workflow): thử từng key, báo dùng được /
  hết hạn mức ngày (giữ, chờ reset) / giới hạn phút (giữ) / LỖI THẬT (nên xóa, đồng thời bot Zalo báo). Nhật ký chỉ hiện 6 ký tự đầu + 4 ký tự cuối của key.
- AI nhìn hình trước khi dựng dùng đúng bộ model của hệ thống (gemini-2.5-flash đã bị Google ngừng nên trước đây luôn lỗi).

## 13. Số tập đánh đúng theo lớp, theo số bài đã có trên kênh
- Trước đây số tập cấp LÚC VIẾT KỊCH BẢN, theo 7 chủ đề (Tối ưu đời thường, Đo đạc thực tế...), kể cả video sau đó bị loại / xóa / không đăng,
  và thứ tự đăng khác thứ tự viết -> số nhảy lung tung.
- Nay: chuỗi theo LỚP ("Toán lớp 10/11/12"). Số tập đánh LÚC ĐĂNG:
  1. Đếm số bài của lớp đó đã có trên YouTube (Apps Script đếm bằng dịch vụ YouTube), Facebook, TikTok (GitHub đếm, nếu quyền truy cập cho phép)
     qua thẻ #toan10 / #toan11 / #toan12 (hệ thống luôn gắn khi đăng) hoặc chữ "lớp N"; cộng với sổ ghi của hệ thống.
  2. Số tập = số lớn nhất trong các nguồn + 1.
  3. In "TẬP N" lên góc phải trên của video (mọi khung hình), ghi "📚 Toán lớp N – Tập N" trong mô tả, rồi mới đăng.
  4. Một nền tảng đăng lỗi, hôm sau thử lại: giữ nguyên số tập đã cấp (không đếm lại).
- Video lúc dựng KHÔNG còn in số tập; lời thoại cũng không được nói số tập.
- YouTube đăng qua Apps Script (mặc định) dùng đúng bản video đã in số tập (GitHub tải bản đó lên Drive, thư mục VIDEO_XACSUAT/video/da_danh_so).
- Lưu ý: TikTok chỉ đếm được nếu ứng dụng TikTok có quyền "video.list"; không có thì dùng số của YouTube/Facebook/sổ hệ thống.

## 14. Giọng đọc: một người đọc xuyên suốt cả video
- Nguyên nhân giọng đổi liên tục: giọng Gemini được tạo RIÊNG TỪNG CẢNH (mỗi lần gọi AI "diễn" khác một chút, lại kèm sắc thái khác nhau)
  nên nghe như mỗi cảnh một người; khi hết hạn mức thì video chuyển sang giọng khác.
- Nay Gemini đọc TOÀN BỘ lời thoại của video trong MỘT lần gọi (một người kể một mạch), máy tự cắt theo cảnh ở các khoảng ngừng
  (kiểm tra vị trí cắt khớp độ dài chữ từng cảnh). Mỗi video chỉ tốn 1 lượt gọi thay vì 13-18, gần như không hết hạn mức.
  Đã chạy thật: video tòa nhà đọc một lần 79 giây, cắt đúng 13 cảnh.
- Không đọc được (hết key, cắt không chắc chắn) thì CẢ video dùng một giọng edge-tts; không bao giờ trộn hai giọng trong một video,
  không bao giờ dùng giọng Google dự phòng.
- CHỌN GIỌNG: workflow "Nghe thử giọng đọc" đã tạo 15 giọng mẫu trong Drive VIDEO_XACSUAT/giong_mau (13 giọng Gemini + 2 giọng edge,
  cùng một đoạn bài giảng). Chọn xong đặt biến GitHub GIONG_GEMINI = tên giọng (vd Charon). Muốn luôn dùng edge: MAY_GIONG = edge.

## 15. Tiêu đề hút người xem, kêu gọi đăng ký / theo dõi, số tập theo thứ tự duyệt
- **Tiêu đề riêng từng nền tảng** (Gemini viết lúc đăng): YouTube Shorts ≤ 70 ký tự (+ #shorts), câu mở đầu TikTok, câu mở đầu Facebook.
  Gây tò mò, có con số / vật thật, thách đố người xem; KHÔNG lộ đáp án (máy kiểm tra, lộ thì bỏ), KHÔNG giật tít sai sự thật.
  Tiêu đề được lưu lại nên lần đăng thử lại dùng đúng tiêu đề cũ.
- **Kêu gọi cuối video**:
  - Lời thoại cảnh cuối tự thêm một câu chung, ví dụ "Thấy hay thì đăng ký kênh hoặc bấm theo dõi để không bỏ lỡ tập sau nhé!" (4 câu xoay vòng).
  - Lúc đăng, mỗi nền tảng một bản: YouTube có dải đỏ "ĐĂNG KÝ KÊNH ĐỂ XEM TẬP SAU", TikTok/Facebook có dải cam "NHẤN THEO DÕI ĐỂ XEM TẬP SAU"
    ở 4 giây cuối (dưới phụ đề), cùng "TẬP N" góc phải trên.
  - Mô tả: YouTube "🔔 ĐĂNG KÝ KÊNH và bật chuông…", Facebook "👉 Nhấn THEO DÕI trang…", TikTok "👉 Theo dõi để không bỏ lỡ tập sau!".
  - Màn kết lúc dựng thành trung tính (nút "Thích", "HỌC MẸO TOÁN MỖI NGÀY CÙNG KÊNH"), không còn ghi cứng "theo dõi… xác suất".
- **Số tập theo thứ tự DUYỆT**: video chưa duyệt / bị bỏ không chiếm số; video đã duyệt được đăng đúng thứ tự bạn bấm /duyet
  (trước đây đề ưu tiên chen lên trước); bấm /duyet bot trả lời luôn số tập dự kiến; số chính thức chốt lúc đăng (đếm bài đã có trên các kênh).
- **Số thập phân kiểu Việt trên hình**: nhãn "3.46m" -> "3,46m" (thống nhất với công thức "10,8"). Huy hiệu "2′₀ triệu đồng" trong video
  bạn gửi là lỗi bánh số lăn với số thập phân, đã sửa ở mục 8 (video đó dựng trước khi có bản sửa).

## 16. Giọng nam Charon / giọng nữ Kore, đổi gió theo quy tắc
- Mỗi video MỘT giọng từ đầu đến cuối (Gemini đọc cả video một lần). Giọng của từng video chọn theo QUY TẮC trong CAU_HINH, không ngẫu nhiên:
  - QUY_TAC_GIONG = CHU_KY (mặc định), CHU_KY_GIONG = 3: cứ 3 video giọng nam (Charon) thì 1 video giọng nữ (Kore):
    nam, nam, nam, nữ, nam, nam, nam, nữ... -> kênh có giọng chủ đạo, đổi gió đều đặn. Đổi CHU_KY_GIONG = 2, 4... để đổi nhịp.
  - QUY_TAC_GIONG = THEO_MON: toán thực tế giọng nam, xác suất giọng nữ (mỗi chuyên mục một "người dẫn").
  - QUY_TAC_GIONG = CHI_NAM / CHI_NU: luôn một giọng.
  - GIONG_NAM = Charon, GIONG_NU = Kore (đổi tên giọng Gemini khác nếu muốn).
- Video đã được chọn giọng thì dựng lại vẫn giữ nguyên giọng đó.
- Gemini không đọc được: video giọng nam dùng edge NamMinh (nam), video giọng nữ dùng edge HoaiMy (nữ) -> không bao giờ đổi giới tính giọng.

## 17. Vật đè vật (người bị thẻ che, nhóm người đè lên thẻ chữ) và hình không liên quan đề
- **Nguyên nhân chồng hình**: bộ tự xếp sân khấu ép từng vật vào khung NGAY sau mỗi lần tách -> khi tổng kích thước lớn hơn khung,
  các vật bị đẩy chồng lại mãi; khung bao vẫn "vừa" nên không thu nhỏ -> vật đè vật.
- **Sửa**: tách các vật cho hết chồng TRƯỚC, rồi mới đưa cả cụm vào khung: thẻ chữ giữ cỡ (thu nhẹ tối đa còn ~80%), vật hình (người, đồ vật)
  thu nhỏ dần (tối thiểu ~60%), chật hơn nữa thì thu đều cả cụm. Kích thước ước lượng có thêm khoảng an toàn (viền, bóng, tên dưới chân).
- **Dãy thẻ nhiều hơn 6 lá**: xếp 2 hàng, mỗi lá rộng vừa khoảng cách -> không còn xòe chồng che mất số.
- **Tên dưới chân người** tự co cỡ chữ theo bề rộng mỗi người (không tràn sang người bên cạnh).
- **Kiểm duyệt mới VẬT ĐÈ VẬT**: đo khung bao thật của từng vật trên khung hình; hai vật chồng > 15% (ở >= 2 khung mẫu) = lỗi nặng ->
  không dựng, gửi về tự sửa. Đã thử: tắt bộ tự xếp thì máy bắt đúng "thẻ danh sách bị nhóm người đè" và "dãy thẻ che nhân vật An".
- **Bài có điểm trên mặt đất (đường ống / dây điện qua sông...)**: bản vẽ BẮT BUỘC nhìn từ trên, dải sông, mọi điểm của đề (A, A', B, P)
  có chấm + tên trên hình, mỗi số đo một nhãn riêng (không gộp "500m/1200m"). Máy kiểm tra: đề nhắc điểm nào mà bản vẽ thiếu -> vẽ lại.
  Nhãn trên hình tự né nhau và né vật (không còn chữ dính chữ). Tên điểm có dấu phẩy trên (A') hiện rõ.

## Cần dán lại vào Apps Script
`KiemTraHinh.gs`, `PromptKichBan.gs`, `BoPhan1.gs`, `BoPhan2.gs`, `NangCao.gs`, `DangVideo.gs`, `SanPham.gs` (tất cả bản mới nhất trong thư mục bàn giao), rồi Triển khai > Quản lý > Phiên bản mới.

## Còn lưu ý
- Trong GEMINI_KEYS có **3 key bị Google từ chối** ("API key not valid"): key thứ 2, 5, 7 (bắt đầu "AQ.Ab8…").
  Hệ thống tự bỏ qua, nhưng nên thay bằng key tạo ở Google AI Studio để đủ hạn mức (giải toán lần này mất 981 giây vì thiếu key).
