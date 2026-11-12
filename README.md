# Bộ phận 2 – Dựng video giải toán xác suất

Từ kịch bản JSON của Bộ phận 1 → **một video dọc 1080×1920 hoàn chỉnh** (giọng đọc tiếng Việt, phụ đề karaoke, công thức, sơ đồ cây/bảng/Venn/bi trong hộp có hoạt họa, âm thanh chuyển cảnh, nhạc nền) → tải lên Google Drive → báo Zalo.
Toàn bộ miễn phí: **GitHub Actions** (máy dựng) + **Remotion** (hiệu ứng) + **edge-tts** (giọng đọc) + **ffmpeg** + **rclone** (đưa video về Drive).

```
Apps Script (BoPhan2.gs)  ──repository_dispatch + kịch bản JSON──►  GitHub Actions
   trạng thái DANG_DUNG                                              1. scripts/chuanbi.py : giọng đọc + mốc thời gian
        ▲                                                            2. Remotion           : dựng video (src/)
        └──── doPost(): CO_VIDEO + link Drive + báo Zalo ◄────────── 3. rclone             : tải MP4 lên Drive
```

## Cài đặt (làm một lần, khoảng 30–45 phút)

### 1. Đưa mã lên GitHub
1. Tạo repo **private** mới (private có 2000 phút Actions/tháng, mỗi video khoảng 6–10 phút, đủ cho hàng trăm video; repo public thì không giới hạn nhưng bản sao video 3 ngày trên Actions ai cũng tải được).
2. Giải nén thư mục này và đẩy lên repo.
3. (Khuyên dùng) trên máy có Node 20: chạy `npm install` rồi commit thêm `package-lock.json` để phiên bản thư viện cố định, tránh lỗi do thư viện tự cập nhật.

### 2. Cho GitHub quyền ghi vào Google Drive (rclone)
Trên máy của bạn (một lần):
1. Cài rclone (https://rclone.org/install/), chạy `rclone config`.
2. `n` (remote mới) → tên **`gdrive`** (đúng tên này) → loại **`drive`** (Google Drive) → bỏ trống client_id/secret → scope chọn **`1` (Full access)** → các mục sau để mặc định → đăng nhập bằng trình duyệt khi được hỏi.
   *Phải chọn full access vì thư mục `VIDEO_XACSUAT` do Apps Script tạo; quyền hẹp hơn sẽ khiến rclone không thấy thư mục đó và tạo thư mục trùng tên.*
3. Chạy `rclone config file` để biết đường dẫn tệp cấu hình, mở tệp, **copy toàn bộ nội dung**.

### 3. GitHub Secrets (Settings > Secrets and variables > Actions)
| Tên | Giá trị |
|---|---|
| `RCLONE_CONF` | nội dung tệp cấu hình rclone ở bước 2 |
| `DUNG_VIDEO_SECRET` | một chuỗi bí mật tự đặt, ≥ 24 ký tự (dùng cùng giá trị trong Apps Script) |
| `APPS_SCRIPT_URL` | địa chỉ `/exec` của web app (lấy ở bước 4) |

Tùy chọn (tab **Variables**): `DRIVE_THU_MUC` (mặc định `VIDEO_XACSUAT/video`), `GIONG` (mặc định `vi-VN-HoaiMyNeural`, giọng nam: `vi-VN-NamMinhNeural`), `TOC_DO` (mặc định `+8%`).

### 4. Apps Script
1. Tạo **fine-grained token** tại GitHub > Settings > Developer settings > Personal access tokens: chỉ chọn repo này, quyền **Contents: Read and write**.
2. Script Properties (Project Settings) thêm: `GITHUB_TOKEN`, `GITHUB_REPO` (dạng `tai-khoan/ten-repo`), `DUNG_VIDEO_SECRET` (cùng giá trị với GitHub).
3. Thêm tệp `BoPhan2.gs` và **sửa Code.gs theo `SUA_CODE_BO_PHAN_1.md`** (sửa 2 lỗi + thêm trạng thái video).
4. Chạy `caiDatBoPhan2()` rồi `kiemTraKetNoiGitHub()`.
5. **Deploy > New deployment > Web app**: Execute as **Me**, Who has access **Anyone** → chép địa chỉ `/exec` vào GitHub Secret `APPS_SCRIPT_URL`.

### 5. Chạy thử
- **Thử dựng không cần Apps Script:** GitHub > Actions > "Dựng video" > Run workflow. Nó dựng kịch bản mẫu `mau/kich_ban_mau.json` và để video ở mục *Artifacts* (và trên Drive nếu đã cấu hình rclone).
- **Thử trọn vòng:** chờ Bộ phận 1 ra kịch bản (hoặc đặt tay một dòng sang `CO_KICH_BAN`); sau tối đa 10 phút nó chuyển `DANG_DUNG`, vài phút sau thành `CO_VIDEO` kèm link và tin Zalo.

## Xem và chỉnh giao diện trên máy
```
npm install
npm run studio              # mở Remotion Studio, xem trước kịch bản mẫu, chỉnh code là thấy ngay
npm run dung:mau            # dựng thử ra out/mau.mp4 (giọng giả bằng tiếng bíp, không cần mạng)
pip install edge-tts
python3 scripts/chuanbi.py mau/kich_ban_mau.json     # giọng thật
npx remotion render src/index.ts Video out/mau.mp4 --props=public/props.json
```
| Muốn đổi | Sửa ở |
|---|---|
| Màu, danh sách phông | `src/theme.ts` |
| Bố cục một cảnh, cỡ chữ, vị trí phụ đề | `src/Canh.tsx` |
| Nền động | `src/NenDong.tsx` |
| Nhạc nền, tiếng chuyển cảnh | thay `public/nhac/nen.wav`, `public/sfx/*.wav` bằng tệp cùng tên (hoặc chạy lại `scripts/taoAmThanh.py`) |
| Tốc độ/giọng đọc | biến `TOC_DO`, `GIONG` trên GitHub, hoặc tham số `--toc-do`, `--giong` |

## Hook và vật thật chuyển động
- **Hook 5 giây đầu:** cảnh 1 có chớp sáng + tiếng "sting" ở khung hình đầu, nhãn kiểu hook (⚠️ RẤT DỄ SAI, ⏱ THỬ THÁCH...), câu hook bằng chữ rất lớn bật lên từng từ, từ khóa vàng to và rung nhẹ khi xuất hiện, kèm hình tình huống bên dưới.
- **Vật thật chuyển động 3D:** xúc xắc tung lên, xoay, nảy rồi dừng đúng mặt có đổ bóng; đồng xu tung và lật nhiều vòng rồi dừng ở S/N; lá bài trượt ra và lật mặt; bi rơi vào hộp. Tất cả dựng theo số khung hình nên mỗi lần dựng cho kết quả giống nhau.

## Giọng đọc, kiểu chữ, kịch bản (cập nhật lần 4)
- **Giọng đọc nhanh như người thật:** mặc định +15% (khoảng 4,7 từ/giây), cắt khoảng lặng đầu/cuối từng câu và rút ngắn quãng nghỉ giữa câu. Chỉnh bằng biến `TOC_DO` trên GitHub.
- **Một kiểu chữ cho tất cả:** công thức toán và văn bản dùng cùng một họ phông, **đóng gói sẵn trong `public/fonts`** (Liberation Sans, ký hiệu toán từ DejaVu Sans), không tải từ mạng nên không thể lỗi phông. Chỉ dấu ngoặc lớn, đường phân số, căn thức do KaTeX vẽ.
- **Đáp án luôn đúng:** cảnh đáp án bị ép khớp đáp án đã kiểm chứng (màn hình và lời thoại), kịch bản chứa câu lạ của hệ thống ("hết hạn mức"...) bị từ chối.
- **Dạy bằng suy luận:** kịch bản mở bằng ý đồ của bài, thử trường hợp nhỏ, điểm mấu chốt; công thức chỉ xuất hiện khi suy luận đã dẫn tới và có lý do; đề được chọn từ 8/10 điểm tư duy trở lên.

## Giao diện kiểu video mẫu (Manim)
Giao diện được làm theo video mẫu bạn gửi:
- **Nền đen có lưới phối cảnh** (sàn và trần hội tụ về đường chân trời), thay được bằng ảnh/video nền của bạn.
- **Thương hiệu:** logo, tên trung tâm, khẩu hiệu ở đầu; logo mờ lớn phía sau; tên kênh ở góc dưới; **màn kết** (ảnh hoặc video) ở cuối. Xem `HUONG_DAN_THUONG_HIEU.md`.
- **Tiêu đề** chữ trắng đậm, từ khóa màu vàng.
- **Hình vẽ nét phẳng kiểu Manim:** nét trắng vẽ dần (Create), nhấn mạnh màu cam vàng; sơ đồ cây, bảng, Venn, hộp bi, trục số, lưới, xúc xắc/xu/bài phẳng đều theo phong cách này. Hình được xây từng bước ăn khớp lời giảng.
- **Công thức màu cam vàng, phông LaTeX có chân** như Manim, ở dưới hình. Kiểu `cong_don`: dòng công thức **lớn dần sang phải** (phần đầu đứng yên, phần mới được "viết" thêm vào) giống thầy viết lên bảng; kiểu `bien_doi`: các dòng biến hình thay nhau (thành phần giống hệt trượt về chỗ mới, thành phần khác chuyển hóa). Dòng cuối cảnh đáp án được vẽ khung quanh.
- **Chuyển động mượt** bằng đúng hàm `smooth` của Manim. Phụ đề chữ trơn bên dưới (tắt được).
- Công thức và chữ **không cùng một phông** như video mẫu (công thức phông LaTeX, chữ phông không chân). Nếu bạn muốn cùng một phông cho tất cả, đặt `"kieuToan": "dong_nhat"`.
- Nhân vật (2D và 3D) đã thử và cất trong `tuy_chon/` (không dùng trong bản chính).

## Bộ hình Manim cho xác suất
Học từ các video Manim mẫu: **mỗi đại lượng một màu dùng thống nhất ở hình và công thức**, hình **dựng dần từng bước**, **số liệu cập nhật trực tiếp**, đường hoặc vùng quan trọng **sáng vàng**, khung chú thích viền vàng.

| Loại hình | Dùng cho | Hoạt cảnh |
|---|---|---|
| `so_do_cay` | phép thử nhiều bước, có/không hoàn lại | nhánh màu theo sự kiện vẽ dần, xác suất viết lên nhánh; các đường đi cần cộng sáng vàng lần lượt, tích xác suất bật lên ở lá |
| `luoi_mau` | không gian mẫu dạng bảng (hai xúc xắc, hai đồng xu...) | lưới vẽ dần, tiêu đề là mặt xúc xắc, từng ô của sự kiện được tô, bộ đếm n(A) chạy theo, cuối cùng hiện P(A) |
| `dien_tich` | quy tắc nhân, xác suất có điều kiện, toàn phần, Bayes | hình vuông đơn vị chia theo lần 1 rồi lần 2, **diện tích ô = xác suất**, ô được chọn sáng vàng, tổng hiện bên phải |
| `venn` | hợp, giao, phần bù, đếm phần tử | hai đường tròn màu vẽ dần, mỗi phần tử là một chấm rơi vào đúng vùng, bộ đếm chạy; vùng được chọn sáng vàng |
| `bi_hop` | lấy bi, chọn đồ vật | hộp vẽ dần, bi rơi vào; viên được chọn bay sang khay, sáng vàng, kèm số cách chọn |
| `thuc_nghiem` | xác suất thực nghiệm, ý nghĩa của xác suất | trục tọa độ, đường tần suất sau mỗi lần thử hội tụ về đường nét đứt p, số lần thử và tần suất cập nhật trực tiếp |
| `bang`, `phan_tu` | bảng, hình vẽ tự do | nét vẽ dần như trước |

Thêm: **tiêu đề bài toán** cố định màu vàng ở đầu (từ cảnh 2), **khung chú thích** viền vàng (`chu_thich`), và **công thức tô màu theo sự kiện** (`\\textcolor{{#FC6255}}{{...}}`). Thời lượng hoạt cảnh tự co giãn theo độ dài lời đọc của cảnh; cảnh có hình phức tạp được kéo dài tối thiểu đủ để hoạt cảnh chạy hết.

## Nền video và phong cách
**Dùng nền của bạn từ Google Drive:** tạo thư mục `VIDEO_XACSUAT/nen` trên Drive và bỏ vào đó các ảnh (jpg, png, webp) hoặc video nền (mp4, mov, webm). Mỗi lần dựng, workflow chép thư mục này về và chọn một nền theo mã video (cùng video thì luôn ra cùng nền, các video khác nhau xoay vòng). Video nền được lặp lại và tắt tiếng; ảnh nền có hiệu ứng phóng to chậm. Nền được phủ một lớp tối nhẹ để chữ rõ. Không có thư mục thì dùng nền động mặc định. Đổi thư mục bằng biến `DRIVE_NEN` trên GitHub.
**Chỉnh phong cách không cần sửa mã:** tệp `phong_cach.json` (độ tối phủ nền `doMoNen`, bật/tắt ký hiệu trôi và quầng sáng, ghi đè màu, `nen_co_dinh` để luôn dùng một nền).
**Bắt chước video mẫu của bạn:** hệ thống chưa tự xem được video mẫu trên Drive của bạn, và tôi cũng không truy cập được Drive đó. Muốn bám sát phong cách, hãy tải 2-3 video mẫu (hoặc ảnh chụp màn hình các khung tiêu biểu) trực tiếp vào cuộc trò chuyện với tôi, tôi sẽ xem, rút ra bố cục, bảng màu, kiểu chuyển cảnh, cách hiện chữ, rồi thiết kế lại các mẫu hình trong `src/` cho giống hoặc đẹp hơn.

## Hình minh họa: cách hoạt động và giới hạn
Kịch bản (Bộ phận 1, sau khi sửa lời nhắc) có thêm `minh_hoa.du_lieu` có cấu trúc để Remotion **vẽ đúng số liệu** thay vì nhờ AI vẽ ảnh:
- `so_do_cay`: sơ đồ cây xác suất (tối đa 3 tầng, 8 lá), nhánh được vẽ dần.
- `bang`: bảng, từng hàng trượt vào.
- `venn`: hai tập hợp có khung Ω, tô sáng vùng cần nhấn mạnh.
- `bi_hop`: bi theo màu nảy lên lần lượt.
- `phan_tu` (hình vẽ tự do) cho mọi dạng còn lại: xúc xắc, thẻ bài, đồng xu, lưới ô, trục số, bi, hình tròn/chữ nhật, mũi tên, đường thẳng, chữ/công thức, emoji đồ vật. AI đặt từng phần tử theo tọa độ phần trăm và thứ tự xuất hiện (`buoc`), có thể nhấp nháy để nhấn mạnh.
- Cảnh không có hình: biểu tượng lớn theo loại cảnh (💡, ⚠️, ✅...) để phần trên màn hình không bị trống.
- Dữ liệu hình sai dạng: hiện thẻ mô tả dự phòng; nhưng từ bản này Bộ phận 1 đã từ chối kịch bản như vậy nên gần như không xảy ra. Muốn thêm kiểu hình mới: thêm bộ kiểm tra trong `src/bocuc.ts`, một nhánh trong `src/HinhVe.tsx` (hoặc thành phần riêng nối vào `src/MinhHoa.tsx`), và cập nhật `KiemTraHinh.gs`.

## Đã kiểm thử và chưa kiểm thử (nói thẳng)
**Đã chạy thử trong môi trường soạn mã này:** hiển thị thật các cảnh trong Chromium với KaTeX thật (hook, sơ đồ cây, bảng, Venn, bi, xúc xắc, đồng xu, bài, lưới, trục số, **biến hình công thức từng khung hình**, khung bao đáp án), kiểm tra không phần tử nào tràn khung; phần chuẩn bị giọng đọc với giọng giả (chia câu, cắt lặng, ghép, mốc thời gian); bộ tách và ghép thành phần công thức; kiểm tra kiểu TypeScript; cú pháp YAML; logic của `BoPhan2.gs` và bộ kiểm tra kịch bản (đáp án, câu lạ của hệ thống, cách dạy, hook, hình).
**Chưa chạy được vì môi trường này không có mạng:** Remotion dựng thật, giọng edge-tts thật, GitHub Actions, rclone, kết nối Apps Script với GitHub thật.

## Xử lý sự cố
| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| Dòng kẹt ở `DANG_DUNG` rồi quay lại `CO_KICH_BAN` | Workflow lỗi hoặc không gọi lại được Apps Script; xem tab Actions. Sau 75 phút hệ thống tự thử lại, quá `MAX_LAN_LOI` lần thì chuyển `LOI` kèm link nhật ký |
| `GITHUB_401` / `GITHUB_404` trong cột ghi chú | Token sai/hết hạn, hoặc tên repo trong `GITHUB_REPO` sai |
| Actions báo `SAI_TOKEN` khi gọi lại | `DUNG_VIDEO_SECRET` hai bên khác nhau |
| Video xong trên Drive nhưng sheet không đổi | Web app chưa deploy bản mới sau khi sửa mã (Deploy > Manage deployments > Edit > New version), hoặc quyền truy cập chưa là Anyone |
| Công thức hiện nguyên chữ LaTeX | AI viết lệnh KaTeX không hỗ trợ; xem tin nhắn lỗi trong console của Remotion Studio |
| Giọng đọc đọc sai một số ký hiệu | thêm quy tắc thay thế trong `chuan_hoa_doc()` ở `scripts/chuanbi.py` |
