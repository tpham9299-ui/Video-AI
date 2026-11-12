# Sửa Code.gs (Bộ phận 1) để nối với Bộ phận 2

Làm lần lượt từng bước bằng **Ctrl + H** (Tìm và thay thế) trong trình soạn thảo Apps Script. Với bước ghi "xóa cả khối" thì chọn bằng tay rồi dán đè.
Sau khi sửa xong: **Lưu** → tải lại trang Google Sheet.

> Mẹo: trước khi sửa, bấm **Tệp > Tạo bản sao** hoặc copy toàn bộ Code.gs ra một tệp văn bản để có bản dự phòng.

## PHẦN 1 – Sửa hai lỗi hiện có (bắt buộc)

### Bước A. Khôi phục lời nhắc "AI sáng tác đề" trong `sinhDeNeuCan_`
Nguyên nhân lỗi: lời nhắc viết kịch bản video ngắn (dùng biến `r.lop`, `r.de_bai`...) đã bị dán nhầm vào hàm sinh đề, nên khi không tìm được đề trên internet thì chạy sẽ báo `r is not defined`.

Trong hàm `sinhDeNeuCan_`, ngay sau khối `if (che === 'UU_TIEN_INTERNET' || che === 'CHI_INTERNET') { ... }`:
**Xóa cả khối** bắt đầu từ dòng `var prompt =` (dòng kế tiếp bắt đầu bằng `'Bạn là giáo viên Toán kiêm biên kịch video ngắn cho học sinh lớp ' + r.lop`) cho tới dòng kết thúc bằng `"thoi_luong_giay":5}]}';`.
**Giữ nguyên** dòng `var kq = goiGemini_(prompt, 0.9);` ngay sau đó. Dán khối này vào chỗ vừa xóa:

```js
  var prompt =
    'Bạn là giáo viên Toán giỏi, chuyên ra đề XÁC SUẤT CÓ YẾU TỐ TƯ DUY cho học sinh lớp ' + lop + ' (Việt Nam).\n' +
    'Phạm vi kiến thức: ' + CHUONG_TRINH[lop] + '.\n' +
    'Hãy SÁNG TÁC ' + n + ' bài toán xác suất mới, mỗi bài có yếu tố tư duy (chia trường hợp, đếm bù, đổi biến cố, bẫy thường gặp...), không phải bài chỉ thay số vào công thức.\n' +
    'YÊU CẦU:\n' +
    '- Đáp án là MỘT xác suất dạng phân số; đề đầy đủ dữ kiện, không phụ thuộc hình vẽ hay bảng không có trong chữ.\n' +
    '- Có thể kiểm chứng bằng đếm vét cạn hoặc mô phỏng máy tính (không quá nhiều đối tượng).\n' +
    '- Không trùng các đề đã có:\n' + (daCo || '(chưa có)') + '\n\n' +
    'Trả về MỘT mảng JSON, mỗi phần tử: {"chu_de":"","de_bai":"","diem_tu_duy":1-10,"yeu_to_tu_duy":"vì sao cần suy nghĩ","bay_thuong_gap":"học sinh hay sai ở đâu"}. Có thể dùng LaTeX trong $...$.';
```

### Bước B. Dùng lời nhắc kịch bản video ngắn (có dữ liệu để vẽ hình) trong `xuLyKichBan_`
Hiện hàm này vẫn dùng lời nhắc cũ (6-10 cảnh, 120-240 giây), trái với cấu hình `GIAY_MUC_TIEU = 60-90` và bộ kiểm tra `hopLeKichBan_` (4-9 cảnh, tối đa 120 giây).

Trong hàm `xuLyKichBan_`, **xóa cả khối** từ dòng `var prompt =` (dòng kế tiếp bắt đầu bằng `'Bạn là giáo viên Toán kiêm biên kịch video giáo dục cho học sinh lớp '`) cho tới dòng kết thúc bằng `"thoi_luong_giay":15}]}';`.
**Giữ nguyên** dòng `var kb = goiGemini_(prompt, 0.6);` ngay sau đó. Dán khối này vào chỗ vừa xóa:

```js
      var prompt =
        'Bạn là giáo viên Toán kiêm biên kịch video ngắn cho học sinh lớp ' + r.lop + '. Viết kịch bản video DỌC cho TikTok/YouTube Shorts giải thích TIẾN TRÌNH TƯ DUY giải bài toán xác suất sau. ' +
        'Người xem lướt điện thoại rất nhanh nên đây KHÔNG phải bài giảng trên lớp: phải gọn, có nhịp, cho thấy VÌ SAO nghĩ như vậy chứ không đọc từng phép tính.\n\n' +
        'ĐỀ: ' + r.de_bai + '\nĐÁP ÁN ĐÃ KIỂM CHỨNG (bắt buộc dùng đúng): ' + r.dap_an + '\n' +
        'Yếu tố cần suy nghĩ: ' + r.yeu_to_tu_duy + '\nBẫy học sinh hay sai: ' + r.bay_thuong_gap + '\n' +
        'Lời giải tham khảo (đã kiểm chứng): ' + r.cach_1 + '\n\n' +
        'CẤU TRÚC: (1) MÓC CÂU ở cảnh 1, 3-6 giây: nêu ngay câu hỏi gây tò mò hoặc cảnh báo cái bẫy, TUYỆT ĐỐI không chào hỏi, không nói "hôm nay chúng ta"; ' +
        '(2) đề bài rút gọn còn 1-2 câu dễ nhớ; (3) cái bẫy hay gặp; (4) hướng giải: vì sao nghĩ như vậy; (5) tính toán gọn, tối đa 3 cảnh; (6) đáp án; ' +
        '(7) chốt MỘT bài học và một câu mời bình luận hoặc xem tiếp (không chúc học tốt chung chung).\n' +
        'QUY TẮC:\n' +
        '- 5-8 cảnh, tổng ' + cauHinh_('GIAY_MUC_TIEU') + ' giây.\n' +
        '- "loi_thoai": câu ngắn (không quá 15 từ mỗi câu), mỗi cảnh không quá 35 từ, giọng nói tự nhiên, thân thiện. Chỉ đọc ý chính và kết quả quan trọng; KHÔNG đọc từng phép nhân nhỏ, phần chi tiết để hiện trên màn hình. Số và công thức phải viết thành LỜI (ví dụ "ba phần năm", "C tám hai"), KHÔNG chứa ký hiệu LaTeX, không chứa dấu / hay %.\n' +
        '- Nếu bài có nhiều trường hợp, gom thành MỘT cảnh dùng bảng hoặc sơ đồ cây: nêu cách chia nhóm, làm mẫu một trường hợp, rồi đọc tổng kết.\n' +
        '- "noi_dung_man_hinh": mảng chuỗi LaTeX (không kèm dấu $), tối đa 3 dòng mỗi cảnh, mỗi dòng ngắn (dưới 35 ký tự khi hiển thị); ưu tiên số và công thức, hạn chế chữ tiếng Việt trong \\text{}; chỉ dùng lệnh cơ bản (\\frac, \\times, \\cdot, \\binom, \\text, ^, _, \\cup, \\cap), không dùng \\iff, \\implies, \\bullet.\n' +
        '- "minh_hoa.loai" thuộc: khong, so_do_cay, bang, venn, bi_hop, xuc_xac, the_bai, luoi, day_so, khac; "mo_ta" mô tả ngắn hình cần vẽ.\n' +
        '- "minh_hoa.du_lieu": dữ liệu để bộ phận dựng video VẼ ĐÚNG hình (sai dạng thì hình bị thay bằng thẻ mô tả). Mọi chuỗi là LaTeX hoặc chữ ngắn, không kèm dấu $. Dạng theo loại: ' +
        'so_do_cay: {"goc":"tên phép thử","nhanh":[{"nhan":"biến cố","xs":"xác suất LaTeX","con":[{"nhan":"","xs":""}]}]} (tối đa 3 tầng, mỗi nút tối đa 4 con, tổng tối đa 8 lá; có thể bỏ "con"); ' +
        'bang: {"cot":["tiêu đề 1","tiêu đề 2"],"hang":[["ô","ô"]]} (tối đa 5 cột, 6 hàng, ô ngắn); ' +
        'venn: {"A":"tên A","B":"tên B","chiA":"nhãn vùng chỉ A","giao":"nhãn vùng giao","chiB":"nhãn vùng chỉ B","ngoai":"nhãn vùng ngoài","to":["giao"]} ("to" chọn trong chiA, giao, chiB, ngoai: vùng cần nhấn mạnh); ' +
        'bi_hop: {"nhom":[{"ten":"đỏ","so":5},{"ten":"xanh","so":3}]} (tối đa 4 nhóm); ' +
        'các loại khác và "khong": "du_lieu": null.\n' +
        'Trả JSON: {"tieu_de":"tiêu đề đăng video dưới 60 ký tự, gây tò mò","hook":"câu mở đầu của cảnh 1","hashtag":["#toanhoc","#xacsuat"],"dap_an_cuoi":"' + r.dap_an +
        '","canh":[{"so":1,"loai":"","loi_thoai":"","noi_dung_man_hinh":[""],"minh_hoa":{"loai":"","mo_ta":"","du_lieu":null},"thoi_luong_giay":5}]}';
```

### Bước C. Xóa bản trùng của `hopLeKichBan_`
Hàm `function hopLeKichBan_(kb, dapAn) { ... }` xuất hiện **hai lần** trong tệp. Xóa **bản thứ hai** (nằm ngay trước dòng `var TOC_DO_DOC = 4.1;`), từ `function hopLeKichBan_` đến dấu `}` đóng của nó. Giữ bản thứ nhất (nằm sau `xuLyKichBan_`).

## PHẦN 2 – Thêm trạng thái video (bắt buộc)

Thêm tệp mới **BoPhan2.gs** (dấu **+** cạnh "Tệp" > Tập lệnh) và dán nội dung tệp `BoPhan2.gs` vào. Sau đó sửa Code.gs:

| Bước | Tìm | Thay bằng |
|---|---|---|
| D1 | `'cap_nhat', 'ma_bam'];` | `'cap_nhat', 'ma_bam', 'file_video'];` |
| D2 | `ma_bam: 60 };` | `ma_bam: 60, file_video: 100 };` |
| H | `var choDung = hang.filter(function (r) { return r.trang_thai === 'CO_KICH_BAN'; }).length;` | `var choDung = hang.filter(function (r) { return r.trang_thai === 'CO_KICH_BAN' \|\| r.trang_thai === 'DANG_DUNG' \|\| r.trang_thai === 'CO_VIDEO'; }).length;` |
| I | `if (ids[r.id] && r.trang_thai === 'CO_KICH_BAN') {` | `if (ids[r.id] && (r.trang_thai === 'CO_VIDEO' \|\| r.trang_thai === 'CO_KICH_BAN')) {` |
| J | `xuLyFileKichBan_(r.file_kich_ban); xoaKichBanKhoiSheet_(r.id);` | `xuLyFileKichBan_(r.file_kich_ban); xuLyFileVideo_(r.file_video); xoaKichBanKhoiSheet_(r.id);` |
| K | `if (r.trang_thai !== 'CO_KICH_BAN' \|\| !r.file_kich_ban \|\| da[r.id]) return;` | `if (['CO_KICH_BAN', 'DANG_DUNG', 'CO_VIDEO'].indexOf(r.trang_thai) < 0 \|\| !r.file_kich_ban \|\| da[r.id]) return;` |

(Trong bảng, ký hiệu `\|\|` chỉ là cách viết hai dấu gạch đứng `||` trong bảng Markdown; khi gõ vào Apps Script hãy gõ `||`.)

Giải thích ngắn: D1/D2 thêm cột `file_video`; H làm cho việc "tạm dừng sinh đề khi đã có quá nhiều video chờ đăng" tính cả video đang dựng và đã dựng; I cho phép bấm "✅ Đánh dấu đã làm video" trên các dòng đã có video; J đưa file video vào thư mục `da_xong` khi dọn; K bảo đảm kịch bản vẫn được nạp vào sheet DOC_KICH_BAN dù đã chuyển sang đang dựng.

## PHẦN 3 – Hiển thị trong sheet (nên làm)

Chỉ để bảng DOC_DE hiện đúng trạng thái và có nút xem video. Bỏ qua cũng không hỏng gì, nhưng các dòng "đang dựng/có video" sẽ hiện nhãn thô.

**F.** Tìm dòng (trong `NHAN_TRANG_THAI`):
```js
  CO_KICH_BAN: ['🎬 Có kịch bản', '#d9f0e1', '#0b6b2c'],
```
và thêm **ngay sau nó** hai dòng:
```js
  DANG_DUNG: ['⏳ Đang dựng video', '#e8eaf6', '#3949ab'],
  CO_VIDEO: ['🎞 Có video', '#c8e6c9', '#1b5e20'],
```

**G.** Trong `capNhatDocDe_`, tìm đúng đoạn `' có kịch bản` (có dấu nháy đơn và dấu cách ở đầu, dừng ở chữ "bản") và thay bằng:
```js
' có kịch bản     ⏳ ' + (dem.DANG_DUNG || 0) + ' đang dựng     🎞 ' + (dem.CO_VIDEO || 0) + ' có video
```
(phần còn lại của dòng giữ nguyên).

**E.** Trong `capNhatDocDe_`, tìm ba dòng:
```js
    if (!r.file_kich_ban) return [rt.setText('').build()];
    var nhanLk = '▶ Mở file';
    return [rt.setText(nhanLk).setLinkUrl('https://drive.google.com/file/d/' + r.file_kich_ban + '/view')
```
và thay bằng:
```js
    var idLk = r.file_video || r.file_kich_ban;
    if (!idLk) return [rt.setText('').build()];
    var nhanLk = r.file_video ? '🎞 Xem video' : '▶ Mở file';
    return [rt.setText(nhanLk).setLinkUrl('https://drive.google.com/file/d/' + idLk + '/view')
```

## Sau khi sửa xong
1. Lưu, tải lại Google Sheet.
2. Đặt 3 bí mật trong Script Properties: `GITHUB_TOKEN`, `GITHUB_REPO`, `DUNG_VIDEO_SECRET` (xem README).
3. Chạy hàm `caiDatBoPhan2` (cấp quyền khi được hỏi), rồi `kiemTraKetNoiGitHub` (xem nhật ký phải ghi "Kết nối GitHub OK").
4. **Deploy > New deployment > Web app** (Execute as: **Me**; Who has access: **Anyone**) và chép địa chỉ `/exec` vào GitHub Secret `APPS_SCRIPT_URL`.
5. Menu **🎬 Video AI > ✨ Làm đẹp toàn bộ** một lần để cột `file_video` có độ rộng đúng.
