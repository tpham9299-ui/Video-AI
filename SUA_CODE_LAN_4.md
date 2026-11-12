# Cập nhật lần 4: kịch bản bám đáp án, dạy bằng suy luận, giọng nhanh, một kiểu chữ

Làm theo thứ tự. Các bước 1-3 sửa lỗi đáp án sai; bước 4-7 đổi cách chọn đề và cách dạy; bước 8-9 là cấu hình.

## 1. Thay tệp `KiemTraHinh.gs` bằng bản mới trong gói
Bản mới có thêm:
- `suaDapAn_`: **luôn ép cảnh đáp án ra đúng đáp án đã kiểm chứng** (cả dòng hiện trên màn hình và lời thoại, có đọc số thành chữ), dù AI viết gì. Nếu AI chèn câu như "hết hạn mức" vào cảnh đáp án thì cảnh được viết lại bằng bản chuẩn.
- `noiDungLa_`: từ chối kịch bản có câu thông báo của hệ thống/AI ở bất kỳ cảnh nào ("hết hạn mức", "xin lỗi", "là một mô hình ngôn ngữ"...).
- `kiemTraCachDay_`: bắt buộc có `y_tuong_chinh` (ý tưởng then chốt), có cảnh `y_do` hoặc `diem_chot`, và không cho mở cảnh giải bằng "áp dụng công thức...".
- Kiểm tra lần cuối: mọi phân số ở cảnh đáp án phải bằng đáp án đúng.

## 2. Gọi `suaDapAn_` trước khi kiểm tra kịch bản
Trong `xuLyKichBan_`, tìm đúng dòng (có dấu chấm phẩy ở cuối):
```js
xoaLoiChao_(kb);
```
và thay bằng:
```js
xoaLoiChao_(kb);
suaDapAn_(kb, r.dap_an);
```

## 3. Thay lời nhắc kịch bản trong `xuLyKichBan_` (dạy bằng suy luận, bám lời giải)
Xóa cả khối từ dòng `var prompt =` (nếu ngay phía trên có các dòng `var c1 = {}` thì xóa luôn từ đó) tới dòng kết thúc bằng `"thoi_luong_giay":5}]}';`, **giữ nguyên** dòng `var kb = goiGemini_(prompt, 0.6);` ngay sau, và dán khối này:

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
        'Trả JSON: {"tieu_de":"tiêu đề đăng video dưới 60 ký tự, gây tò mò","hook_ung_vien":["","",""],"hook":"câu hook được chọn (đúng lời thoại cảnh 1)","hook_chu":"","hook_kieu":"sai_lam|thach_thuc|bat_ngo|ket_qua_truoc|cau_hoi","nhan_manh":[""],"y_tuong_chinh":"","hashtag":["#toanhoc","#xacsuat"],"dap_an_cuoi":"' + r.dap_an +
        '","canh":[{"so":1,"cam_xuc":"ngac_nhien|nghi|boi_roi|y_tuong|thao_tac|vui|tu_tin","loai":"mo_dau|de_bai|y_do|bay|thu_nho|diem_chot|tinh_toan|dap_an|bai_hoc","loi_thoai":"","noi_dung_man_hinh":[""],"minh_hoa":{"loai":"","mo_ta":"","du_lieu":null},"thoi_luong_giay":5}]}';
```

Điểm mới:
- Dữ liệu đã kiểm chứng được tách rõ: đáp án cuối **không được đổi**; mọi số liệu chỉ lấy từ hai lời giải (lời giải suy luận và lời giải tính toán).
- Nguyên tắc dạy: nói **ý đồ** của bài trước, thử trường hợp nhỏ, tìm **điểm mấu chốt** và giải thích vì sao nó đúng; chỉ dùng công thức khi suy luận đã dẫn tới đó và phải nói lý do.
- Mỗi cảnh tối đa 45 từ (giọng nhanh nên không bị quá ngắn), 6-9 cảnh; các loại cảnh mới: `y_do`, `thu_nho`, `diem_chot`.

## 4. Thay lời nhắc của bước giải để có "lời giải suy luận"
Trong `giaiVaKiemChung_`, tìm phần tử thứ hai của danh sách `goiGeminiSong_([ ... ])`, bắt đầu bằng `{ nhiet: 0.4, prompt: 'Bạn là giáo viên Toán giỏi. Giải bài toán xác suất sau bằng một HƯỚNG KHÁC` và kết thúc bằng `+ dinhDang + de },`. Thay cả phần tử đó bằng:

```js
    { nhiet: 0.5, prompt: 'Bạn là giáo viên Toán giỏi, nổi tiếng vì dạy bằng SUY LUẬN. Giải bài toán xác suất sau bằng cách THÔNG MINH NHẤT, ít tính toán nhất: ưu tiên nhận ra cấu trúc của bài (đối xứng, đếm bù, biến cố đối, quy về bài đơn giản hơn, thử trường hợp nhỏ để tìm quy luật, đổi góc nhìn); CHỈ dùng công thức khi suy luận đã đưa tới đó. Mỗi bước phải nói rõ VÌ SAO làm vậy. Nếu bài không có cách thông minh hơn thì chia trường hợp thật rõ ràng. ' +
      'Đáp án cuối là MỘT xác suất dạng phân số với tử và mẫu là số nguyên dương. Trả JSON: {"y_tuong":"điều mấu chốt cần nhận ra, 1-2 câu","cac_buoc":["..."],"tu":0,"mau":0}\n\n' + de },
```

(Kết quả vẫn được so khớp với cách giải thứ nhất và với mã kiểm chứng như trước; chỉ là lời giải thứ hai giờ là lời giải bằng suy luận và có trường `y_tuong`.)

## 5. Thay lời nhắc AI sáng tác đề (ưu tiên đề tư duy cao)
Trong `sinhDeNeuCan_`, xóa khối từ `var prompt =` tới dòng kết thúc bằng `Có thể dùng LaTeX trong $...$.';` (giữ nguyên dòng `var kq = goiGemini_(prompt, 0.9);` ngay sau) và dán:

```js
  var prompt =
    'Bạn là giáo viên Toán giỏi, chuyên ra đề XÁC SUẤT ĐÒI HỎI TƯ DUY CAO cho học sinh lớp ' + lop + ' (Việt Nam).\n' +
    'Phạm vi kiến thức: ' + CHUONG_TRINH[lop] + '.\n' +
    'Hãy SÁNG TÁC ' + n + ' bài toán xác suất mới mà người giải phải NGHĨ chứ không chỉ áp dụng công thức.\n' +
    'THANG ĐIỂM "diem_tu_duy" (chấm khắt khe và thành thật): 10 = có một ý tưởng then chốt bất ngờ làm bài toán trở nên đơn giản (đối xứng, đếm bù, quy về bài nhỏ hơn, song ánh, đổi vai trò, nhìn từ góc khác); 8-9 = cần phân tích cấu trúc hoặc chia trường hợp khéo và có bẫy dễ nhầm; 6-7 = chỉ cần chọn đúng công thức; 1-5 = thay số vào công thức. CHỈ ra những đề đạt từ 8 điểm trở lên.\n' +
    'YÊU CẦU:\n' +
    '- Đáp án là MỘT xác suất dạng phân số; đề đầy đủ dữ kiện, không phụ thuộc hình vẽ hay bảng không có trong chữ.\n' +
    '- Có thể kiểm chứng bằng đếm vét cạn hoặc mô phỏng máy tính (không quá nhiều đối tượng).\n' +
    '- Đề phải khiến người giải phải tự hỏi "bài này thật sự muốn kiểm tra điều gì?"; tránh các bài chỉ cần "tính C(n,k) rồi chia".\n' +
    '- Mỗi đề kèm "y_tuong_then_chot": một câu nêu ý tưởng giúp giải bài thông minh (bạn phải tự biết cách giải thông minh đó trước khi ra đề).\n' +
    '- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Trả về MỘT mảng JSON, mỗi phần tử: {"chu_de":"","de_bai":"","diem_tu_duy":1-10,"y_tuong_then_chot":"","yeu_to_tu_duy":"vì sao cần suy nghĩ","bay_thuong_gap":"học sinh hay sai ở đâu"}. Có thể dùng LaTeX trong $...$.';
```

## 6. Thay lời nhắc tìm đề trên internet
Trong `timDeInternet_`, xóa khối từ `var prompt =` tới dòng kết thúc bằng `"nguon_url":""}';` (giữ nguyên dòng `var kq = goiGeminiTimKiem_(prompt);` ngay sau) và dán:

```js
  var prompt =
    'Hãy dùng Google Search để TÌM TRÊN INTERNET ' + (n + 2) + ' bài toán XÁC SUẤT CÓ THẬT (đã được đăng ở nơi khác, KHÔNG tự sáng tác) dành cho học sinh lớp ' + lop + ' (Việt Nam).\n' +
    'Phạm vi kiến thức: ' + CHUONG_TRINH[lop] + '.\n' +
    'ƯU TIÊN bài VẬN DỤNG CAO, đề học sinh giỏi, câu cuối của đề thi thử; các bài có "mẹo" suy luận. Nguồn: sách giáo khoa/sách bài tập hiện hành, đề minh họa và đề thi tốt nghiệp THPT của Bộ GD&ĐT, đề thi thử của các sở/trường, đề học sinh giỏi, và các trang như toanmath.com, thuvienhoclieu.com, vietjack.com, loigiaihay.vn.\n' +
    'THANG ĐIỂM "diem_tu_duy" (chấm khắt khe, thành thật): 10 = có một ý tưởng then chốt làm bài trở nên đơn giản (đối xứng, đếm bù, quy về bài nhỏ hơn, song ánh, đổi vai trò, góc nhìn khác); 8-9 = cần phân tích cấu trúc hoặc chia trường hợp khéo, có bẫy dễ nhầm; 6-7 = chỉ cần chọn đúng công thức; 1-5 = thay số vào công thức. CHỈ lấy bài từ 8 điểm trở lên; bài chỉ áp dụng công thức máy móc thì BỎ.\n' +
    'YÊU CẦU:\n' +
    '- Câu hỏi có đáp án là MỘT xác suất dạng phân số; nếu đề gốc là trắc nghiệm thì bỏ các phương án A, B, C, D, chỉ giữ phần dữ kiện và câu hỏi.\n' +
    '- Đề phải đầy đủ dữ kiện, không phụ thuộc hình vẽ hoặc bảng không có trong chữ; có thể kiểm chứng bằng đếm vét cạn hoặc mô phỏng.\n' +
    '- Giữ sát nguyên văn đề gốc (chỉ chỉnh nhẹ cho rõ ràng), KHÔNG chép lời giải hay đáp án.\n' +
    '- Mỗi đề phải kèm "nguon_url" là địa chỉ trang bạn thực sự tìm thấy đề đó. Không chắc chắn đề có thật thì BỎ QUA; không tìm được đề nào phù hợp thì trả mảng rỗng [].\n' +
    '- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Chỉ trả về MỘT mảng JSON, không thêm chữ nào khác. Có thể dùng LaTeX trong $...$; trong JSON phải viết dấu gạch chéo ngược kép, ví dụ \\\\frac. ' +
    'Mỗi phần tử: {"chu_de":"","de_bai":"","diem_tu_duy":1-10,"yeu_to_tu_duy":"vì sao cần suy nghĩ (ý tưởng then chốt)","bay_thuong_gap":"học sinh hay sai ở đâu","nguon_url":""}';
```

## 7. Đổi tốc độ đọc dùng để ước tính thời lượng
Tìm `var TOC_DO_DOC = 4.1;` và đổi thành:
```js
var TOC_DO_DOC = 5.3;
```

## 8. Nâng ngưỡng điểm tư duy
Mở sheet `CAU_HINH` (menu **Video AI > Hiện các sheet kỹ thuật**), đổi giá trị của `DIEM_TU_DUY_TOI_THIEU` thành **8** (đổi trong `MAC_DINH` của Code.gs không đủ vì sheet đã có giá trị cũ). Điểm 8 trở lên nghĩa là bài cần phân tích cấu trúc hoặc có ý tưởng then chốt, không phải chỉ thay số vào công thức.

## 9. Tốc độ giọng đọc (trên GitHub)
Mặc định mới là **+30%**, tức khoảng 5 từ mỗi giây, ngang người kể chuyện nhanh. Muốn chỉnh: GitHub > Settings > Secrets and variables > Actions > **Variables** > thêm `TOC_DO` (ví dụ `+25%` chậm hơn, `+40%` nhanh hơn). Nhật ký bước "Tạo giọng đọc" in tốc độ thực tế từng cảnh (từ/giây) để bạn đối chiếu.

## Lưu ý
- Kịch bản đã tạo trước đó không tự đổi: muốn làm lại, đưa trạng thái dòng đó (cột `trang_thai` trong HANG_DOI) về `DA_GIAI`.
- Đề đã nằm trong hàng đợi vẫn là đề cũ; đề mới sinh ra sẽ theo tiêu chuẩn tư duy mới.
