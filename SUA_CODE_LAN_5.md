# Cập nhật lần 5: hiệu ứng biến hình kiểu Manim, sửa lỗi phông, CPU, tốc độ giọng

## A. Sửa trên GitHub (đã nằm trong gói `video-xacsuat.zip`, chỉ cần đẩy lên)
1. **CPU:** lệnh dựng đổi từ `--concurrency=4` thành `--concurrency=2` (máy chạy Actions của repo private chỉ có 2 CPU; chạy 4 luồng làm tranh nhau tài nguyên và dễ lỗi).
2. **Phông chữ:** hệ thống **không còn tải phông từ Google Fonts** (nguyên nhân lỗi "không gọi được font"). Phông được đóng gói sẵn trong `public/fonts`: Liberation Sans cho chữ, số, biến và DejaVu Sans cho ký hiệu toán (∪ ∩ ⇒ ≈ ≥ ∈ Ω...). Nạp phông có xử lý lỗi nên thiếu phông nào cũng chỉ lùi về phông hệ thống chứ không làm hỏng video. Muốn dùng phông riêng: đặt `tuy_chon-regular.ttf`, `tuy_chon-bold.ttf`, `tuy_chon-italic.ttf`, `tuy_chon-bolditalic.ttf` vào thư mục Drive `VIDEO_XACSUAT/font` (phông phải hỗ trợ tiếng Việt).
3. **Tốc độ giọng đọc:** mặc định **+15%**. Nếu trước đây bạn đã tạo biến `TOC_DO` trong GitHub (Settings > Secrets and variables > Actions > Variables), hãy **xóa hoặc đổi thành `+15%`** vì biến đó được ưu tiên hơn giá trị mặc định.

## B. Sửa trong Apps Script
### B1. Thay tệp `KiemTraHinh.gs` bằng bản mới trong gói
Thay đổi: không còn bắt buộc `cam_xuc` (đã bỏ nhân vật); kiểm tra thêm `trinh_bay`; dòng CUỐI của cảnh đáp án mới là dòng phải ra đáp án đúng (các dòng trước là bước biến đổi nên được tự do).

### B2. Thay lời nhắc kịch bản trong `xuLyKichBan_`
Xóa cả khối từ `var c1 = {}, c2 = {};` (hoặc từ `var prompt =` nếu không thấy dòng đó) tới dòng kết thúc bằng `"thoi_luong_giay":5}]}';`, **giữ nguyên** dòng `var kb = goiGemini_(prompt, 0.6);` ngay sau, và dán khối này:

```js
      var c1 = {}, c2 = {};
      try { c1 = JSON.parse(r.cach_1); } catch (e1) {}
      try { c2 = JSON.parse(r.cach_2); } catch (e2) {}
      var buocC1 = (c1.cac_buoc || []).map(function (b, i) { return (i + 1) + '. ' + b; }).join('\n');
      var buocC2 = (c2.cac_buoc || []).map(function (b, i) { return (i + 1) + '. ' + b; }).join('\n');
      var prompt =
        'Bạn là giáo viên Toán kiêm biên kịch và đạo diễn hình ảnh cho video ngắn học sinh lớp ' + r.lop + '. Viết kịch bản video DỌC cho TikTok/YouTube Shorts giải thích TIẾN TRÌNH TƯ DUY giải bài toán xác suất sau. ' +
        'Người xem lướt điện thoại rất nhanh nên đây KHÔNG phải bài giảng trên lớp: phải gọn, có nhịp, cho thấy VÌ SAO nghĩ như vậy chứ không đọc từng phép tính. ' +
        'Video được dựng TỰ ĐỘNG từ kịch bản này: chỉ những gì bạn mô tả bằng "du_lieu" mới được vẽ lên màn hình, nên hãy thiết kế hình ảnh thật cụ thể.\n\n' +
        'DỮ LIỆU ĐÃ KIỂM CHỨNG (nguồn sự thật duy nhất):\n' +
        'ĐỀ: ' + r.de_bai + '\nĐÁP ÁN CUỐI CÙNG (đã kiểm chứng bằng máy, KHÔNG được đổi, không được tự tính lại): ' + r.dap_an + '\n' +
        'Yếu tố cần suy nghĩ: ' + r.yeu_to_tu_duy + '\nBẫy học sinh hay sai: ' + r.bay_thuong_gap + '\n' +
        'LỜI GIẢI BẰNG SUY LUẬN (ưu tiên dùng để dạy): ' + (c2.y_tuong ? 'Ý tưởng then chốt: ' + c2.y_tuong + '\n' : '\n') + buocC2 + '\n' +
        'LỜI GIẢI TÍNH TOÁN (để đối chiếu số liệu): ' + buocC1 + '\n\n' +
        'NGUYÊN TẮC VỀ SỐ LIỆU: mọi con số trong cảnh tính toán và đáp án CHỈ lấy từ hai lời giải trên; tuyệt đối không tự tính ra kết quả mới hay đổi kết quả; cảnh đáp án phải ra ĐÚNG ' + r.dap_an + '. Không viết bất kỳ câu thông báo nào của hệ thống (hạn mức, xin lỗi, "là một mô hình ngôn ngữ"...) vào nội dung video.\n' +
        'NGUYÊN TẮC DẠY (quan trọng nhất sau hook): video phải giúp người xem HIỂU Ý ĐỒ của bài toán và TỰ SUY RA hướng giải, không phải đọc lại công thức rập khuôn. Hãy dẫn dắt theo mạch: ' +
        '(a) cảnh "y_do": bài này THẬT SỰ đang hỏi điều gì, thử thách nằm ở đâu, trước khi chạm tới con số; ' +
        '(b) cảnh "thu_nho" (nếu hợp): thử một trường hợp nhỏ hoặc hình dung cụ thể để thấy quy luật; ' +
        '(c) cảnh "diem_chot": một ý tưởng then chốt (đối xứng, đếm bù, đổi góc nhìn, quy về bài đơn giản hơn...) và giải thích VÌ SAO nó đúng bằng lời thường; ' +
        '(d) chỉ khi suy luận đã đưa tới đó mới dùng công thức, và nói rõ lý do ("đến đây cần đếm số cách nên mới dùng tổ hợp"). TUYỆT ĐỐI không mở cảnh bằng "áp dụng công thức..." mà không giải thích vì sao. ' +
        'Ghi ý tưởng then chốt vào "y_tuong_chinh" (một câu, ít nhất 30 ký tự).\n' +
        'CẤU TRÚC: (1) MÓC CÂU ở cảnh 1; (2) đề bài rút gọn 1-2 câu, KÈM HÌNH tình huống; (3) y_do; (4) cái bẫy hay gặp (bay); (5) thu_nho hoặc diem_chot; (6) tính toán gọn, tối đa 2 cảnh; (7) dap_an; (8) bai_hoc: MỘT bài học về cách nghĩ và một câu mời bình luận (không chúc học tốt chung chung).\n' +
        'HOOK (QUAN TRỌNG NHẤT: người xem quyết định ở 3 giây đầu có lướt đi hay không). Cảnh 1 dài tối đa 5 giây, "loi_thoai" cảnh 1 tối đa 16 từ. ' +
        'Trước khi viết, hãy nghĩ 3 phương án hook rồi chọn phương án mạnh nhất; ghi cả 3 vào "hook_ung_vien". Hook mạnh phải: (a) tạo khoảng trống tò mò hoặc mâu thuẫn, (b) có con số hoặc tình huống cụ thể, (c) nói thẳng với người xem ("bạn"), (d) KHÔNG chào hỏi, KHÔNG nói "hôm nay", "các bạn ơi", "mọi người". ' +
        'Chọn một "hook_kieu": sai_lam (rất nhiều bạn tính sai/thiếu chỗ nào đó), thach_thuc (thử thách có giới hạn, ví dụ "đoán nhanh trong 5 giây"), bat_ngo (kết quả trái với trực giác), ket_qua_truoc (nói đáp án đẹp trước rồi hỏi vì sao), cau_hoi (một câu hỏi lạ). ' +
        'Ví dụ tốt: "Rút ba thẻ trong bốn mươi thẻ, vì sao hay ra tổng chia hết cho ba?"; "Tung hai xúc xắc, bạn đoán nhanh tổng nào dễ ra nhất?"; "Câu xác suất này, rất nhiều bạn tính thiếu đúng một trường hợp." ' +
        'TUYỆT ĐỐI KHÔNG bịa số liệu thống kê (không viết "90% học sinh sai"); dùng "rất nhiều bạn", "dễ sai". ' +
        '"hook_chu": đúng câu hook viết ngắn gọn để in CHỮ LỚN lên màn hình (3-11 từ, có thể dùng chữ số như 1, 2, 40); "nhan_manh": 1-3 cụm từ nằm NGUYÊN VĂN trong hook_chu sẽ được tô vàng và rung khi hiện.\n' +
        'QUY TẮC LỜI THOẠI VÀ CÔNG THỨC:\n' +
        '- 6-9 cảnh, tổng ' + cauHinh_('GIAY_MUC_TIEU') + ' giây (giọng đọc nhanh khoảng 5 từ mỗi giây).\n' +
        '- "loi_thoai": câu ngắn (không quá 18 từ mỗi câu), mỗi cảnh không quá 45 từ, giọng nói tự nhiên như người thật đang kể cho bạn nghe, có "vì sao", "thử nghĩ xem", "để ý nhé". Không đọc từng phép nhân nhỏ, phần chi tiết để hiện trên màn hình. Số và công thức phải viết thành LỜI (ví dụ "ba phần năm", "C tám hai"), KHÔNG chứa ký hiệu LaTeX, không chứa dấu / hay %.\n' +
        '- "noi_dung_man_hinh": mảng chuỗi LaTeX (không kèm dấu $), tối đa 3 dòng mỗi cảnh (riêng "bien_doi" tối đa 4 dòng), mỗi dòng NGẮN (dưới 35 ký tự khi hiển thị; công thức dài hãy tách thành nhiều dòng); chữ tiếng Việt đặt trong \\text{}; chỉ dùng lệnh cơ bản (\\frac, \\times, \\cdot, \\binom, \\text, ^, _, \\cup, \\cap, \\Rightarrow), không dùng \\iff, \\implies, \\bullet.\n' +
        '- "trinh_bay" (mỗi cảnh): "bien_doi" khi các dòng "noi_dung_man_hinh" là PHÉP BIẾN ĐỔI NỐI TIẾP trên cùng một chỗ (dòng sau suy ra từ dòng trước; 2-4 dòng; thường dùng cho cảnh tính toán và đáp án). Máy sẽ làm hiệu ứng biến hình mượt kiểu Manim, nên hãy GIỮ NGUYÊN cách viết LaTeX của các thành phần không đổi, ví dụ dòng 1 "P=\\frac{10}{28}+\\frac{3}{28}", dòng 2 "P=\\frac{10+3}{28}", dòng 3 "P=\\frac{13}{28}"; mỗi dòng tối đa khoảng 60 ký tự hiển thị. Dùng "xep" cho các dòng độc lập (xếp chồng). Dòng CUỐI của cảnh đáp án phải là đáp án đúng.\n' +
        'QUY TẮC HÌNH MINH HỌA (rất quan trọng, thiếu hình là video bị loại):\n' +
        '- Ít nhất một nửa số cảnh (tối thiểu 3 cảnh) phải có hình; cảnh đề bài, cái bẫy, hướng giải, tính toán nên có hình. Chỉ cảnh thuần lời nói/chốt bài học mới để "khong".\n' +
        '- "minh_hoa.mo_ta": MÔ TẢ CHI TIẾT như một đạo diễn (ít nhất 40 ký tự): hình gồm những gì, đặt ở đâu, màu gì, hiện lần lượt theo thứ tự nào, phần nào sáng lên hoặc nhấp nháy khi lời thoại nói tới đâu, người xem cần hiểu điều gì từ hình.\n' +
        '- Hình càng giống THẬT càng tốt: xuc_xac tự lăn, nảy rồi dừng đúng mặt; dong_xu tự tung và lật; the_bai tự chia và lật mặt; bi_hop có hộp thật và bi rơi vào. Hãy dùng đúng các phần tử này khi đề nói tới xúc xắc, đồng xu, quân bài, bi trong hộp, thay vì vẽ hình tròn đơn giản. Dùng "bieu_tuong" với emoji đồ vật thật (🎒📚🏀⚽🍎🎁) để thể hiện bối cảnh.\n' +
        '- "minh_hoa.loai" thuộc: khong, so_do_cay, bang, venn, bi_hop, xuc_xac, the_bai, luoi, day_so, khac.\n' +
        '- "minh_hoa.du_lieu" là dữ liệu để máy VẼ ĐÚNG hình (sai dạng thì cả kịch bản bị từ chối). Mọi chuỗi là LaTeX hoặc chữ ngắn, không kèm dấu $. Dạng theo loại:\n' +
        '  * so_do_cay: {"goc":"tên phép thử","nhanh":[{"nhan":"biến cố","xs":"xác suất LaTeX","con":[{"nhan":"","xs":""}]}]} (tối đa 3 tầng, mỗi nút tối đa 4 con, tổng tối đa 8 lá; có thể bỏ "con").\n' +
        '  * bang: {"cot":["tiêu đề 1","tiêu đề 2"],"hang":[["ô","ô"]]} (tối đa 5 cột, 6 hàng, ô ngắn).\n' +
        '  * venn: {"A":"tên A","B":"tên B","chiA":"nhãn vùng chỉ A","giao":"nhãn vùng giao","chiB":"nhãn vùng chỉ B","ngoai":"nhãn vùng ngoài","to":["giao"]} ("to" chọn trong chiA, giao, chiB, ngoai: vùng cần nhấn mạnh).\n' +
        '  * bi_hop: {"nhom":[{"ten":"đỏ","so":5},{"ten":"xanh","so":3}]} (tối đa 4 nhóm; máy tự vẽ chiếc hộp và các viên bi).\n' +
        '  * xuc_xac, the_bai, luoi, day_so, khac (và mọi hình tự do khác): {"phan_tu":[ ... ]} là danh sách phần tử vẽ trên khung 100x100 (x,y là PHẦN TRĂM, gốc (0,0) ở góc trên trái, x sang phải, y xuống dưới; hình thật chiếm khoảng x 5-95, y 5-95). Mỗi phần tử có "kieu" và "buoc" (số nguyên 1-8: thứ tự xuất hiện, các phần tử cùng buoc hiện cùng lúc; buoc nhỏ hiện trước, rải đều theo lời đọc) và tùy chọn "nhap":true (nhấp nháy để nhấn mạnh). Các "kieu":\n' +
        '      "tron" {x,y,r(3-30, % bề rộng),mau,nhan}; "chu_nhat" {x,y,rong,cao,mau,nhan} (x,y là tâm); "chu" {x,y,noi_dung(LaTeX hoặc chữ ngắn),co:"nho"|"vua"|"lon",mau}; ' +
        '"mui_ten" {x1,y1,x2,y2,mau,nhan}; "duong" {x1,y1,x2,y2,mau,net_dut:true|false}; "bi" {x,y,mau,nhan}; "xuc_xac" {x,y,mat(1-6),nhan}; ' +
        '"the_bai" {x,y,gia_tri:"A"|"K"|"7"...,chat:"co"|"ro"|"chuong"|"bich"}; "dong_xu" {x,y,mat:"S"|"N"}; "bieu_tuong" {x,y,emoji,co,nhan} (dùng emoji để minh họa đồ vật: 🎒📚🧑‍🎓🏀⚽🍎🎁🎡...); ' +
        '"luoi" {x,y (góc trên trái),rong,cao,hang,cot,to:[[hàng,cột],...] (tính từ 1: ô cần tô sáng),mau}; "truc_so" {x,y,rong,tu,den,diem:[{"v":số,"nhan":"","mau":""}]}.\n' +
        '      "mau" thuộc: do, xanh_duong, xanh_la, vang, tim, cam, hong, trang, den, xam, nau. Tối đa 40 phần tử, không để các phần tử chồng lên nhau, chừa chỗ cho nhãn.\n' +
        '  * "khong": "du_lieu": null.\n' +
        'Trả JSON: {"tieu_de":"tiêu đề đăng video dưới 60 ký tự, gây tò mò","hook_ung_vien":["","",""],"hook":"câu hook được chọn (đúng lời thoại cảnh 1)","hook_chu":"","hook_kieu":"sai_lam|thach_thuc|bat_ngo|ket_qua_truoc|cau_hoi","nhan_manh":[""],"y_tuong_chinh":"","hashtag":["#toanhoc","#xacsuat"],"dap_an_cuoi":"' + r.dap_an +
        '","canh":[{"so":1,"loai":"mo_dau|de_bai|y_do|bay|thu_nho|diem_chot|tinh_toan|dap_an|bai_hoc","loi_thoai":"","noi_dung_man_hinh":[""],"trinh_bay":"bien_doi|xep","minh_hoa":{"loai":"","mo_ta":"","du_lieu":null},"thoi_luong_giay":5}]}';
```
Điểm mới: bỏ phần nhân vật; mỗi cảnh có `trinh_bay`. Với cảnh tính toán và đáp án, AI viết các dòng công thức là **phép biến đổi nối tiếp** (dòng sau suy ra từ dòng trước, giữ nguyên cách viết các thành phần không đổi) để bộ dựng làm hiệu ứng biến hình mượt.

### B3. Đổi tốc độ đọc dùng để ước tính thời lượng
Tìm `var TOC_DO_DOC = 5.3;` (hoặc `4.1`) và đổi thành:
```js
var TOC_DO_DOC = 4.7;
```
(Giọng +15% đọc khoảng 4,7 từ mỗi giây.)

## Lưu ý
- Các bước 5-6-7-8 của "Cập nhật lần 4" (lời nhắc sinh đề, tìm đề, lời giải suy luận, ngưỡng điểm tư duy) **vẫn giữ nguyên**, không phải làm lại.
- Kịch bản đã tạo trước đó không có `trinh_bay`: bộ dựng tự nhận: cảnh tính toán/đáp án/điểm mấu chốt có từ 2 dòng thì dùng biến hình, còn lại xếp chồng như cũ.
