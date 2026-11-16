# SỬA CODE LẦN 41: Video hình học dựng 100% bằng Manim

## Yêu cầu
1. Video hình học dựng hoàn toàn bằng Manim, không dùng Remotion giả Manim.
2. Làm giống các video hình học mẫu.
3. Hướng dẫn chứng minh thật chi tiết, làm nổi đúng chỗ đang chứng minh để người xem chỉ chú ý vào đó.

## Phong cách lấy từ 4 video mẫu
- Nền đen #111, tiêu đề vàng chữ có chân ở trên cùng; hình ở nửa trên, công thức ở dưới.
- **Mỗi đại lượng một màu**:
  - đoạn thẳng, góc, tam giác, mặt phẳng được nhắc tới đều có màu riêng, giữ suốt video;
  - trong công thức, đúng đại lượng đó cũng mang màu ấy (nhìn công thức là biết nó nằm ở đâu trên hình).
- Vẽ dần cạnh → điểm → nhãn; đường kẻ thêm là nét đứt.
- Công thức biến đổi từng bước (dòng sau biến hình ra từ dòng trước), dòng cũ mờ đi.
- Kết quả cuối đóng khung vàng.
- Hai tam giác so sánh được tách ra đặt cạnh nhau, tô màu.

## Làm nổi chỗ đang chứng minh
- Mỗi bước, máy tự đọc lời thoại + công thức để biết bước đó nói về **cạnh / góc / tam giác / mặt phẳng / đường tròn** nào:
  - phần được nhắc tới sáng lên, dày hơn, mang màu riêng; tam giác được nhắc tới tô màu;
  - phần còn lại của hình mờ đi.
- Mỗi dòng công thức hiện ra **đúng lúc giọng đọc câu tương ứng**; khi dòng hiện, các cạnh trong dòng đó lóe sáng vàng chạy dọc theo cạnh.
- `\hl{...}` trong công thức: khung vàng quanh đúng phần đang xét (vd `\hl{\angle AEB} = 90^\circ`).
- Hai góc là một trên hình (vd ∠EAB và ∠FAC khi E thuộc AC, F thuộc AB): máy nhận ra là cùng một góc, cùng màu.
- Góc vuông đã có ký hiệu thì tô màu ký hiệu, không vẽ thêm cung.
- Đoạn nằm trên một cạnh (vd MB là nửa BC) hiện thành đoạn màu đè lên cạnh, không kẻ thêm nét đứt.

## Kịch bản chi tiết hơn (HinhHoc.gs + KiemTraHinh.gs)
Lời nhắc viết kịch bản bài hình học có thêm:
- **Quy ước viết công thức** để máy tô màu đúng:
  - đoạn: `ME`; góc: `\angle ABC`; tam giác: `\triangle ABC`; mặt phẳng: `(SAC)`;
  - `\hl{...}` cho phần đang xét; `\dpcm` cho dòng kết luận.
- Trường mới cho mỗi cảnh:
  - `nhan_manh_hinh`: phần hình cần làm nổi;
  - `tach`: hai tam giác cần tách ra đặt cạnh nhau.
- **Mỗi cảnh một bước**:
  - tiêu đề cảnh nêu đúng điều đang chứng minh;
  - 1-3 dòng công thức (khẳng định + lý do);
  - lời thoại chỉ thẳng vào hình và nói VÌ SAO;
  - bài chứng minh tối thiểu 4 cảnh giải.

Kiểm tra mới (kiemTraKichBanManim_), lỗi nhẹ, AI tự sửa:
- chứng minh quá gọn;
- bước thiếu công thức hoặc thiếu lý do;
- công thức không nhắc cạnh / góc nào trên hình;
- viết "góc" / "tam giác" bằng chữ trong công thức.

## Thống nhất phong cách với video xác suất / thực tế (yêu cầu bổ sung)
Mỗi video hình học gồm hai lớp:
- **Lớp vỏ chung (Remotion)**, giống hệt mọi video khác:
  - nền tự tạo, thanh tiêu đề (LỚP, tên bài), thanh các bước (ĐỀ BÀI → GIẢI → ...), tiêu đề bước chữ to;
  - phụ đề karaoke, giọng đọc, nhạc nền tự giảm khi có giọng;
  - tiếng hiệu ứng: chuyển bước, "tách" khi hiện dòng, "ting" khi đóng khung kết quả;
  - ảnh bìa cùng kiểu.
- **Lớp toán (Manim, nền trong suốt)**, nằm đúng vùng nội dung giữa tiêu đề bước và phụ đề:
  - hình, công thức, mọi chuyển động và hiệu ứng thị giác;
  - thẻ ĐỀ BÀI và khung công thức cùng kiểu thẻ của các video khác.

**Một phông chữ cho cả video**:
- Montserrat ExtraBold (phông chữ đậm của mọi video) cho tiêu đề, thẻ đề, phụ đề, công thức (cả chữ số, dấu = + · °), tên điểm, số đo.
- Dòng dẫn nhỏ trên tiêu đề bước trước là chữ nghiêng có chân, nay cũng đổi sang Montserrat (áp dụng cho mọi video).
- Gói edit "dong_nhat" dùng Be Vietnam Pro Bold.

**Ít ô chữ, giảng bằng giọng + thể hiện trên hình** (như video mẫu):
- Không còn ô KIẾN THỨC.
- Trường `kien_thuc` vẫn có trong kịch bản, nhưng để **giọng đọc giảng**: dùng định lý / tính chất gì, vì sao áp dụng được.
- Màn hình thể hiện bằng hình:
  - phần đang xét sáng lên, phần khác mờ;
  - cạnh / góc / tam giác tô màu riêng;
  - **số đo ghi ngay cạnh góc / đoạn** (vd công thức có "\angle ABC = 60^\circ" thì "60°" hiện cạnh góc B; "AB = 5" thì "5" hiện cạnh đoạn AB) và giữ lại trên hình;
  - hai tam giác đồng dạng được nhấc ra phóng to, đặt cạnh nhau ngay trên vùng hình.
- Thiếu `kien_thuc` hoặc lời thoại không nêu lý do thì kiểm tra kịch bản bắt sửa.
- Tiêu đề bước không ghi "Bước 1:" (thanh bước đã có); `tu_khoa` là cụm được phóng to.

## Chạy ở đâu (GitHub, workflow dung-video.yml)
1. Sau bước tạo giọng đọc, nếu kịch bản là `HINH_HOC`:
   - cài LaTeX (xelatex) + Manim;
   - chạy `scripts/manim_hinh.py`, ra:
     - `out/<ID>_manim.mov` (lớp trong suốt);
     - `public/manim/bia.png` (hình cho ảnh bìa);
     - đánh dấu `manimLop` trong props.
2. Remotion dựng phần vỏ như mọi video (chia khúc dựng song song), bỏ qua bước kiểm duyệt bố cục của Remotion vì phần hình không còn do Remotion vẽ.
3. Máy ghép đè lớp Manim lên video (lùi 1 khung vì khung 0 là ảnh bìa), tải lên Drive và báo về Apps Script như cũ.
4. Manim lỗi → video dựng hoàn toàn bằng Remotion như cũ (video vẫn ra).

Tắt Manim: GitHub → Settings → Variables → `MANIM_HINH = TAT`.

Dựng thử tay: Actions → Dựng video → chọn mẫu:
- `kich_ban_hinh_manim`: bài "AE·AC = AF·AB", 8 bước;
- `kich_ban_hinh_hoc`;
- `kich_ban_hinh_khong_gian`.

## Cần dán lại trên Apps Script
- **HinhHoc.gs** (lời nhắc Manim, trường kien_thuc, kiểm tra mới). Nếu chưa có tệp này thì tạo mới: bài hình học chỉ được sinh khi có tệp này.
- **KiemTraHinh.gs** (gọi kiểm tra mới).

## Đã thử
- Dựng trên máy 3 bài mẫu (hình phẳng, hình không gian, chứng minh 8 bước):
  - 1080x1920, 30 khung/giây, khớp đúng độ dài giọng đọc;
  - 28-38 giây video dựng mất 15-33 giây.
- Kiểm bằng ảnh chụp từng giây: màu khớp giữa hình và công thức, phần đang xét sáng, phần khác mờ, khung vàng ở kết luận, tam giác tách đôi có nhãn.
