# Cập nhật lần 3: hook 5 giây đầu, vật 3D chuyển động, nhân vật dẫn chuyện

Làm theo thứ tự. (Đã gồm các bước của lần 2; nếu chưa làm lần 2 thì làm luôn bước 1-3 ở đây là đủ.)

## 1. Thay tệp `KiemTraHinh.gs` bằng bản mới trong gói
Bản mới thêm bộ kiểm tra **hook** và **cảm xúc nhân vật**, nên kịch bản bị từ chối và viết lại nếu:
- `hook_chu` ngoài 3-12 từ, `hook_kieu` sai, `nhan_manh` không nằm nguyên văn trong `hook_chu`;
- thiếu 3 phương án `hook_ung_vien`;
- lời thoại cảnh 1 quá 18 từ (không đọc nổi trong 5 giây);
- hook mở bằng "chào", "hôm nay", "các bạn", "mọi người";
- hook bịa số liệu thống kê kiểu "90% học sinh sai";
- cảnh nào thiếu `cam_xuc`.
Vẫn nhớ: trong `Code.gs` phải **xóa hàm `hopLeKichBan_` cũ** (nếu chưa xóa).

## 2. Thay lời nhắc kịch bản trong `xuLyKichBan_`
Xóa cả khối từ `var prompt =` tới dòng kết thúc bằng `"thoi_luong_giay":5}]}';` (giữ nguyên dòng `var kb = goiGemini_(prompt, 0.6);` ngay sau) và dán khối này:

```js
      var prompt =
        'Bạn là giáo viên Toán kiêm biên kịch và đạo diễn hình ảnh cho video ngắn học sinh lớp ' + r.lop + '. Viết kịch bản video DỌC cho TikTok/YouTube Shorts giải thích TIẾN TRÌNH TƯ DUY giải bài toán xác suất sau. ' +
        'Người xem lướt điện thoại rất nhanh nên đây KHÔNG phải bài giảng trên lớp: phải gọn, có nhịp, cho thấy VÌ SAO nghĩ như vậy chứ không đọc từng phép tính. ' +
        'Video được dựng TỰ ĐỘNG từ kịch bản này: chỉ những gì bạn mô tả bằng "du_lieu" mới được vẽ lên màn hình, nên hãy thiết kế hình ảnh thật cụ thể.\n\n' +
        'ĐỀ: ' + r.de_bai + '\nĐÁP ÁN ĐÃ KIỂM CHỨNG (bắt buộc dùng đúng): ' + r.dap_an + '\n' +
        'Yếu tố cần suy nghĩ: ' + r.yeu_to_tu_duy + '\nBẫy học sinh hay sai: ' + r.bay_thuong_gap + '\n' +
        'Lời giải tham khảo (đã kiểm chứng): ' + r.cach_1 + '\n\n' +
        'CẤU TRÚC: (1) MÓC CÂU ở cảnh 1, 3-6 giây: nêu ngay câu hỏi gây tò mò hoặc cảnh báo cái bẫy, TUYỆT ĐỐI không chào hỏi, không nói "hôm nay chúng ta"; ' +
        '(2) đề bài rút gọn còn 1-2 câu dễ nhớ, KÈM HÌNH tình huống; (3) cái bẫy hay gặp; (4) hướng giải: vì sao nghĩ như vậy; (5) tính toán gọn, tối đa 3 cảnh; (6) đáp án; ' +
        '(7) chốt MỘT bài học và một câu mời bình luận hoặc xem tiếp (không chúc học tốt chung chung).\n' +
        'HOOK (QUAN TRỌNG NHẤT: người xem quyết định ở 3 giây đầu có lướt đi hay không). Cảnh 1 dài tối đa 5 giây, "loi_thoai" cảnh 1 tối đa 16 từ. ' +
        'Trước khi viết, hãy nghĩ 3 phương án hook rồi chọn phương án mạnh nhất; ghi cả 3 vào "hook_ung_vien". Hook mạnh phải: (a) tạo khoảng trống tò mò hoặc mâu thuẫn, (b) có con số hoặc tình huống cụ thể, (c) nói thẳng với người xem ("bạn"), (d) KHÔNG chào hỏi, KHÔNG nói "hôm nay", "các bạn ơi", "mọi người". ' +
        'Chọn một "hook_kieu": sai_lam (rất nhiều bạn tính sai/thiếu chỗ nào đó), thach_thuc (thử thách có giới hạn, ví dụ "đoán nhanh trong 5 giây"), bat_ngo (kết quả trái với trực giác), ket_qua_truoc (nói đáp án đẹp trước rồi hỏi vì sao), cau_hoi (một câu hỏi lạ). ' +
        'Ví dụ tốt: "Rút ba thẻ trong bốn mươi thẻ, vì sao hay ra tổng chia hết cho ba?"; "Tung hai xúc xắc, bạn đoán nhanh tổng nào dễ ra nhất?"; "Câu xác suất này, rất nhiều bạn tính thiếu đúng một trường hợp." ' +
        'TUYỆT ĐỐI KHÔNG bịa số liệu thống kê (không viết "90% học sinh sai"); dùng "rất nhiều bạn", "dễ sai". ' +
        '"hook_chu": đúng câu hook viết ngắn gọn để in CHỮ LỚN lên màn hình (3-11 từ, có thể dùng chữ số như 1, 2, 40); "nhan_manh": 1-3 cụm từ nằm NGUYÊN VĂN trong hook_chu sẽ được tô vàng và rung khi hiện.\n' +
        'QUY TẮC LỜI THOẠI VÀ CÔNG THỨC:\n' +
        '- 5-8 cảnh, tổng ' + cauHinh_('GIAY_MUC_TIEU') + ' giây.\n' +
        '- "loi_thoai": câu ngắn (không quá 15 từ mỗi câu), mỗi cảnh không quá 35 từ, giọng nói tự nhiên, thân thiện. Chỉ đọc ý chính và kết quả quan trọng; KHÔNG đọc từng phép nhân nhỏ, phần chi tiết để hiện trên màn hình. Số và công thức phải viết thành LỜI (ví dụ "ba phần năm", "C tám hai"), KHÔNG chứa ký hiệu LaTeX, không chứa dấu / hay %.\n' +
        '- "noi_dung_man_hinh": mảng chuỗi LaTeX (không kèm dấu $), tối đa 3 dòng mỗi cảnh, mỗi dòng NGẮN (dưới 35 ký tự khi hiển thị; công thức dài hãy tách thành nhiều dòng); chữ tiếng Việt đặt trong \\text{}; chỉ dùng lệnh cơ bản (\\frac, \\times, \\cdot, \\binom, \\text, ^, _, \\cup, \\cap, \\Rightarrow), không dùng \\iff, \\implies, \\bullet.\n' +
        'QUY TẮC HÌNH MINH HỌA (rất quan trọng, thiếu hình là video bị loại):\n' +
        '- Ít nhất một nửa số cảnh (tối thiểu 3 cảnh) phải có hình; cảnh đề bài, cái bẫy, hướng giải, tính toán nên có hình. Chỉ cảnh thuần lời nói/chốt bài học mới để "khong".\n' +
        '- "minh_hoa.mo_ta": MÔ TẢ CHI TIẾT như một đạo diễn (ít nhất 40 ký tự): hình gồm những gì, đặt ở đâu, màu gì, hiện lần lượt theo thứ tự nào, phần nào sáng lên hoặc nhấp nháy khi lời thoại nói tới đâu, người xem cần hiểu điều gì từ hình.\n' +
        '- Mỗi cảnh có "cam_xuc" của nhân vật dẫn chuyện, chọn trong: ngac_nhien (hook, kết quả bất ngờ), nghi (đang đọc/suy nghĩ), boi_roi (nêu cái bẫy, chỗ dễ nhầm), y_tuong (nghĩ ra hướng giải), thao_tac (đang tính, đếm, lấy đồ vật), vui (ra đáp án), tu_tin (chốt bài học).\n' +
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
        'Trả JSON: {"tieu_de":"tiêu đề đăng video dưới 60 ký tự, gây tò mò","hook_ung_vien":["","",""],"hook":"câu hook được chọn (đúng lời thoại cảnh 1)","hook_chu":"","hook_kieu":"sai_lam|thach_thuc|bat_ngo|ket_qua_truoc|cau_hoi","nhan_manh":[""],"hashtag":["#toanhoc","#xacsuat"],"dap_an_cuoi":"' + r.dap_an +
        '","canh":[{"so":1,"cam_xuc":"ngac_nhien|nghi|boi_roi|y_tuong|thao_tac|vui|tu_tin","loai":"mo_dau|de_bai|bay|huong_giai|tinh_toan|dap_an|bai_hoc","loi_thoai":"","noi_dung_man_hinh":[""],"minh_hoa":{"loai":"","mo_ta":"","du_lieu":null},"thoi_luong_giay":5}]}';
```

Điểm mới của lời nhắc: AI phải nghĩ 3 phương án hook rồi chọn mạnh nhất; có `hook_chu` (chữ lớn), `nhan_manh` (từ khóa tô vàng), `hook_kieu`; mỗi cảnh có `cam_xuc` để nhân vật đổi dáng; yêu cầu dùng xúc xắc, đồng xu, quân bài, bi trong hộp thật thay vì hình tròn đơn giản.

## 3. Đẩy gói `video-xacsuat.zip` mới lên GitHub
Gồm: bộ dựng hook, vật 3D, nhân vật, chớp sáng và âm thanh "sting" ở khung hình đầu.

## 4. Nhân vật dẫn chuyện (cần bạn chuẩn bị ảnh)
Tạo thư mục Drive `VIDEO_XACSUAT/nhan_vat` (đổi bằng biến `DRIVE_NHAN_VAT`) và bỏ vào các ảnh **PNG hoặc WebP nền trong suốt** của nhân vật, đặt tên theo cảm xúc:

| Tên tệp | Dùng khi |
|---|---|
| `mac_dinh.png` | dáng dự phòng, bắt buộc nên có |
| `ngac_nhien.png` | hook, kết quả bất ngờ |
| `nghi.png` | đang đọc đề, suy nghĩ |
| `boi_roi.png` | nêu cái bẫy, chỗ dễ nhầm |
| `y_tuong.png` | nghĩ ra hướng giải (bóng đèn) |
| `thao_tac.png` | đang tính, đếm, lấy đồ vật |
| `vui.png` | ra đáp án |
| `tu_tin.png` | chốt bài học |

Thiếu dáng nào thì tự lùi về dáng gần nghĩa rồi `mac_dinh`. Thêm tệp `<dáng>_mo.png` (cùng dáng nhưng miệng mở) thì nhân vật **nhép miệng theo giọng đọc**. Không có thư mục này thì video không có nhân vật (vẫn chạy bình thường).
