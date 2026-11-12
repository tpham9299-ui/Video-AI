# Cập nhật lần 2 (Code.gs, BoPhan2.gs và GitHub)

Làm theo thứ tự. Mỗi mục ghi rõ vấn đề nó sửa.

## 1. Zalo báo 7 lần (đã tìm ra nguyên nhân và sửa)
**Nguyên nhân:** workflow gọi lại Apps Script bằng `curl -L -X POST`. Apps Script xử lý yêu cầu xong rồi chuyển hướng (HTTP 302); riêng cờ `-X POST` làm curl **gửi POST lần nữa** tới địa chỉ chuyển hướng và nhận lỗi 405. Workflow tưởng thất bại nên thử lại đủ 7 lần, mà mỗi lần Apps Script đều đã chạy xong và gửi Zalo. (Đã dựng lại đúng tình huống này để xác nhận.)

**Đã sửa ở ba lớp:**
1. `.github/workflows/dung-video.yml`: bỏ `-X POST`; chỉ thử lại khi Apps Script trả "BAN"; phản hồi lạ thì thử tối đa 2 lần rồi dừng.
2. `BoPhan2.gs`: `doPost` chống xử lý lặp (cùng kết quả gửi lại thì chỉ trả `ok` mà không ghi, không báo) và có `guiZaloMotLan_` nhớ trong 6 giờ, nên dù bị gọi nghìn lần cũng chỉ một tin.
3. Kết quả kiểm thử giả lập: gọi lặp 7 lần cùng kết quả cho ra 0 tin Zalo thừa.

**Việc của bạn:** thay toàn bộ nội dung tệp `BoPhan2.gs` bằng bản mới trong gói, lưu, rồi **Deploy > Manage deployments > biểu tượng bút chì > Version: New version > Deploy** (không đổi địa chỉ). Đẩy workflow mới lên GitHub.

## 2. Kịch bản chi tiết và buộc có hình minh họa (điểm 2 và 3)
**Nguyên nhân videos "chỉ có chữ mô tả hình":** kịch bản không kèm dữ liệu để vẽ, nên bộ dựng chỉ còn cách in dòng mô tả. Giờ có hai lớp bảo đảm: lời nhắc mới yêu cầu AI mô tả chi tiết và đưa dữ liệu vẽ; bộ kiểm tra mới **từ chối kịch bản thiếu hình** và bắt Gemini viết lại (tối đa 3 lần, cơ chế sẵn có).

### 2a. Thêm tệp `KiemTraHinh.gs`
Tạo tệp mới trong dự án Apps Script, dán nội dung tệp `KiemTraHinh.gs` trong gói. Tệp này chứa hàm `hopLeKichBan_` mới nên **trong Code.gs phải xóa hàm `hopLeKichBan_` cũ** (từ `function hopLeKichBan_` tới dấu `}` đóng của nó). Nếu để cả hai, Apps Script sẽ dùng bản nằm sau và bộ kiểm tra hình không chạy.

Bộ kiểm tra bắt buộc: cảnh có hình thì `du_lieu` đúng dạng; `mo_ta` hình dài tối thiểu 40 ký tự; ít nhất một nửa số cảnh (tối thiểu 3) có hình.

### 2b. Thay lời nhắc kịch bản trong `xuLyKichBan_`
Trong hàm `xuLyKichBan_`, **xóa cả khối** từ dòng `var prompt =` cho tới dòng kết thúc bằng `"thoi_luong_giay":5}]}';` (ngay trước `var kb = goiGemini_(prompt, 0.6);`, giữ nguyên dòng này) và dán khối sau:

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
        'QUY TẮC LỜI THOẠI VÀ CÔNG THỨC:\n' +
        '- 5-8 cảnh, tổng ' + cauHinh_('GIAY_MUC_TIEU') + ' giây.\n' +
        '- "loi_thoai": câu ngắn (không quá 15 từ mỗi câu), mỗi cảnh không quá 35 từ, giọng nói tự nhiên, thân thiện. Chỉ đọc ý chính và kết quả quan trọng; KHÔNG đọc từng phép nhân nhỏ, phần chi tiết để hiện trên màn hình. Số và công thức phải viết thành LỜI (ví dụ "ba phần năm", "C tám hai"), KHÔNG chứa ký hiệu LaTeX, không chứa dấu / hay %.\n' +
        '- "noi_dung_man_hinh": mảng chuỗi LaTeX (không kèm dấu $), tối đa 3 dòng mỗi cảnh, mỗi dòng NGẮN (dưới 35 ký tự khi hiển thị; công thức dài hãy tách thành nhiều dòng); chữ tiếng Việt đặt trong \\text{}; chỉ dùng lệnh cơ bản (\\frac, \\times, \\cdot, \\binom, \\text, ^, _, \\cup, \\cap, \\Rightarrow), không dùng \\iff, \\implies, \\bullet.\n' +
        'QUY TẮC HÌNH MINH HỌA (rất quan trọng, thiếu hình là video bị loại):\n' +
        '- Ít nhất một nửa số cảnh (tối thiểu 3 cảnh) phải có hình; cảnh đề bài, cái bẫy, hướng giải, tính toán nên có hình. Chỉ cảnh thuần lời nói/chốt bài học mới để "khong".\n' +
        '- "minh_hoa.mo_ta": MÔ TẢ CHI TIẾT như một đạo diễn (ít nhất 40 ký tự): hình gồm những gì, đặt ở đâu, màu gì, hiện lần lượt theo thứ tự nào, phần nào sáng lên hoặc nhấp nháy khi lời thoại nói tới đâu, người xem cần hiểu điều gì từ hình.\n' +
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
        'Trả JSON: {"tieu_de":"tiêu đề đăng video dưới 60 ký tự, gây tò mò","hook":"câu mở đầu của cảnh 1","hashtag":["#toanhoc","#xacsuat"],"dap_an_cuoi":"' + r.dap_an +
        '","canh":[{"so":1,"loai":"mo_dau|de_bai|bay|huong_giai|tinh_toan|dap_an|bai_hoc","loi_thoai":"","noi_dung_man_hinh":[""],"minh_hoa":{"loai":"","mo_ta":"","du_lieu":null},"thoi_luong_giay":5}]}';
```

Lời nhắc mới thêm hình tự do (`phan_tu`: xúc xắc, thẻ bài, đồng xu, lưới, trục số, bi, hình học cơ bản, emoji đồ vật, mũi tên...) để AI minh họa được mọi dạng đề, không bị giới hạn ở sơ đồ cây, bảng, Venn, bi trong hộp.

## 3. Tràn công thức (điểm 4)
Đã sửa trong bộ dựng video (thư mục `src/`): mọi công thức và chữ trên màn hình được **đo bề rộng thật rồi tự vừa khung**: thu nhỏ nhẹ để giữ một dòng, dài hơn nữa thì xuống dòng ở dấu `=`/`+`, còn tràn nữa mới thu nhỏ thêm. Đồng thời sửa lỗi nhãn tiếng Việt ("Cùng đỏ") bị KaTeX nuốt dấu cách và in nghiêng: giờ chữ thường hiện bằng phông tiếng Việt, chỉ chuỗi có dấu hiệu công thức mới qua KaTeX. Kiểm thử bằng Chromium thật với KaTeX thật: công thức rất dài (đủ 3 dòng, có `\text{}`, phân số, `\approx`) không còn tràn.
Lời nhắc mới cũng bảo AI tách công thức dài thành nhiều dòng ngắn.

## 4. Nền video của bạn và phong cách (điểm 5): xem README, mục "Nền video và phong cách"
