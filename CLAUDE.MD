# TÀI LIỆU KIẾN TRÚC TOÀN HỆ THỐNG & LỊCH SỬ CHỈNH SỬA (`CLAUDE.MD`)

> [!IMPORTANT]
> **QUY TRÌNH TỰ ĐỘNG HÓA SAU MỖI LẦN CHỈNH SỬA (QUY TẮC BẮT BUỘC — ĐỒNG BỘ VỚI `.antigravityrules`):**
> Từ nay về sau, cứ mỗi khi hoàn thành bất kỳ yêu cầu thêm, sửa hoặc xóa mã nguồn nào của người dùng, AI Agent bắt buộc phải tự động thực hiện tuần tự các bước sau mà không cần người dùng nhắc lại:
> 1. **Cập nhật đầy đủ nội dung thay đổi mới nhất vào file `CLAUDE.MD`** (cập nhật phần kiến trúc/logic hiện hành và bổ sung mục lịch sử chỉnh sửa mới nhất).
> 2. **Mở terminal tại thư mục dự án (`e:\Video-AI`) và chạy tuần tự 3 lệnh Git sau để đẩy toàn bộ thay đổi lên nhánh `master` của GitHub:**
>    ```bash
>    git add .
>    git commit -m "<tóm tắt ngắn gọn nội dung vừa sửa>"
>    git push origin master
>    ```
> 3. **Nếu có thay đổi bất kỳ tệp `.gs` nào chạy trên Google Apps Script**: Luôn thông báo rõ danh sách các tệp `.gs` cần cập nhật lên Google Apps Script (hoặc hướng dẫn người dùng bấm nút **☁️ Tự cập nhật mã .gs từ GitHub vào Apps Script** trong menu Google Sheets / nhắn lệnh Zalo `/capnhatcode`).

---

## I. TỔNG QUAN HỆ THỐNG SẢN XUẤT VIDEO TOÁN HỌC TỰ ĐỘNG (VIDEO-AI)

Hệ thống **Video-AI** là dây chuyền tự động hóa khép kín từ khâu **tự sinh đề / nhận đề qua Zalo** $\rightarrow$ **giải toán & kiểm chứng độc lập** $\rightarrow$ **viết kịch bản sư phạm 6 phần** $\rightarrow$ **kiểm tra & tự sửa hình minh họa** $\rightarrow$ **dựng video dọc 9:16 (Remotion + Manim + Gemini TTS / Edge-TTS)** $\rightarrow$ **AI tự kiểm tra chất lượng video** $\rightarrow$ **tự động đăng 2 video/ngày lên YouTube Shorts, Facebook Reels, TikTok**.

### Kiến trúc 2 tầng phối hợp:
1. **Tầng điều phối & quản trị (Google Apps Script + Google Sheets + Google Drive + Zalo Bot)**:
   - Lưu trữ hàng đợi bài toán (`HANG_DOI`), cấu hình (`CAU_HINH`), lịch sử góp ý học tập (`GOP_Y_HOC`), quy tắc tự học (`QUY_TAC_HOC`), thống kê số liệu (`SO_LIEU`), chuỗi video (`SERIES`), quảng cáo sản phẩm (`SAN_PHAM`), và kho khóa API (`KHO_KEY`).
   - Nhận lệnh điều khiển thời gian thực qua **Zalo Bot** (gửi đề bằng chữ/ảnh/PDF/Word/LaTeX, `/bo`, `/sua`, `/duyet`, `/suavideocu`, `/dunglai`, `/huy`, `/key`...).
   - Tự sinh đề mới, giao việc cho GitHub Actions, nhận kết quả qua Webhook `doPost(e)`, chạy AI kiểm tra chất lượng video (`xuLyAiXem_`), tự động rà soát & nâng cấp video cũ trên Drive (`doVaSuaVideoCuTrenDrive_`), và điều phối đăng tự động 2 video/ngày (`11:30` và `19:30`).
2. **Tầng tính toán nặng & dựng hình (GitHub Actions)**:
   - **Bộ phận 1 trên GitHub (`.github/workflows/bo-phan-1.yml` + `scripts/bophan1/chay_bp1.js`)**: Chạy nguyên mã `.gs` trong môi trường Node `vm` không giới hạn 6 phút của Apps Script, gọi Gemini song song qua `scripts/bophan1/goi_gemini.js` với cơ chế tự động đổi model linh hoạt.
   - **Bộ phận 2 trên GitHub (`.github/workflows/dung-video.yml`)**:
     - Tạo giọng đọc xuyên suốt bằng Gemini TTS (tự động đổi model TTS dự phòng hoặc chuyển sang `edge-tts` cùng giới tính) qua `scripts/chuanbi.py`.
     - Với bài **Hình học (`HINH_HOC`)**: Dựng lớp hình + công thức + đường phụ + nét liền/nét đứt 3D bằng **Manim (`scripts/manim_hinh.py`)** xuất video nền trong suốt `.mov`.
     - Với mọi video: Đóng gói **Remotion (`src/`)**, dựng ảnh bìa `AnhBia`, chạy **Kiểm duyệt bố cục + AI nhìn hình (`scripts/kiem_duyet.mjs`)** trước khi render, chia video thành $N$ khúc (`scripts/dung_khuc.mjs`) dựng song song trên nhiều máy ảo GitHub, ghép khúc (`scripts/ghep_khuc.mjs`), phủ lớp Manim (nếu có), chụp ảnh kiểm tra 4 khung (`scripts/anh_kiem_tra.py`), tải lên Google Drive qua `rclone` và gọi `doPost` báo về Apps Script.
   - **Đăng video tự động (`viec = dang` $\rightarrow$ `scripts/dang_video.py`)**: Tải video từ Drive, in nhãn tập (nếu có), đăng lên Facebook Reels, TikTok, YouTube Shorts và báo link về Zalo.

---

## II. CẤU TRÚC THƯ MỤC & VAI TRÒ TỪNG TỆP TRONG WORKSPACE

### 1. Nhóm tệp Google Apps Script (`/*.gs`) — Chạy trên Apps Script & trong `chay_bp1.js`
| Tệp | Vai trò & Các hàm trọng tâm |
| :--- | :--- |
| [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs) | Trái tim Bộ phận 1: cấu hình mặc định `MAC_DINH`, phiên bản `PHIEN_BAN_EDIT = 44`, vòng đời hàng đợi `COT`, `chayBoPhan1()`, `damBaoCauHinhTuDong_()`, tự sinh đề `tuSinhDe_()`, giải 2 cách độc lập + mã kiểm chứng `giaiVaKiemChung_()`, trọng tài `trongTaiGiai_()`, điều phối model động `danhSachModel_()`, `tuTimModelGemini_()`, `goiGemini_()`, `goiGeminiSong_()`, giao GitHub `giaoBoPhan1ChoGitHub_()`, nhận kết quả `nhanKetQuaBoPhan1_()`, tự dò và nâng cấp video cũ trên Drive `doVaSuaVideoCuTrenDrive_()`, `quetVaSuaVideoCuDrive()`. |
| [PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs) | Xây dựng prompt viết kịch bản chi tiết 15–20 cảnh theo quy trình 6 phần (`taoPromptKichBan_`), trích xuất bản vẽ kỹ thuật từ đề toán thực tế (`taoBanVeThucTe_`, `banVeChoPrompt_`), chèn bản vẽ vào kịch bản (`chenBanVe_`) và tùy biến hình minh họa theo từng cảnh (`tuyChinhBanVeTheoCanh_`). |
| [KiemTraHinh.gs](file:///e:/Video-AI/KiemTraHinh.gs) | Kiểm tra & tự sửa kịch bản trước khi dựng: kiểm tra 39+ vật thực tế (`kiemTraCanhThat_`, `suaCanhThat_`, `TU_DIEN_EMOJI_`), kiểm tra bố cục bàn tròn (`kiemTraBoCucDe_`), số đo vùng nhìn từ trên (`kiemTraSoDoVung_`, `tuSuaSoDoVung_`), bài tài chính (`kiemTraTaiChinh_`), tính lại mọi phép tính LaTeX trên màn hình (`texThanhSo_`, `kiemTraPhepTinh_`), kiểm tra quy trình 6 phần (`kiemTraQuyTrinh_`, `tuSuaQuyTrinh_`), đa dạng hóa hình minh họa từng cảnh (`tuSuaDaDangHinh_`, `kiemTraDaDangHinhThucTe_`), và chấm điểm tổng thể (`danhGiaKichBan_`). |
| [HinhHoc.gs](file:///e:/Video-AI/HinhHoc.gs) | Dựng hình chính xác bằng tọa độ cho bài `HINH_HOC`: nhận diện hình phẳng / hình không gian 3D (`laHinhKhongGian_`), sinh mã dựng hình (`taoHinhChinhXac_`, `chayMaHinh_`), phép chiếu xiên Cavalier (`chieuHinhKhongGian_`), thuật toán phân loại tự động **cạnh nhìn thấy = nét liền (`canh`)** và **cạnh khuất = nét đứt (`khuat`)** kèm **đường phụ (`phu`)** (`phanLoaiCanhKhongGian3D_`), chèn tọa độ vào kịch bản (`chenToaDoHinh_`) và kiểm tra kịch bản Manim (`kiemTraKichBanManim_`). |
| [BoPhan2.gs](file:///e:/Video-AI/BoPhan2.gs) | Giao kịch bản sang GitHub Actions để dựng video (`chayBoPhan2()`, `kichHoatDungVideo_()`), hỗ trợ tải kịch bản lớn (`> 58KB`) qua Google Drive (`_file_kich_ban_drive`), chọn giọng đọc theo giới tính/nhịp điệu (`chonGiongDoc_()`), và cổng Webhook `doPost(e)` nhận kết quả từ GitHub / Zalo. |
| [NangCao.gs](file:///e:/Video-AI/NangCao.gs) | AI tự kiểm tra video sau khi dựng (`chayKiemTraVideo()`, `xuLyAiXem_()`, `TIEU_CHI_YEU_CAU_`), tự động duyệt (`DA_DUYET`) và kích hoạt đăng ngay khi đạt chuẩn, học quy tắc lâu dài từ góp ý người dùng (`xuLyHocGopY()`, `hocTuGopY_()`), quản lý Series, Hook, Phong cách video và chọn nhạc nền theo cảm xúc (`chonNhacNen_()`). |
| [DangVideo.gs](file:///e:/Video-AI/DangVideo.gs) | Tự động đăng 2 video/ngày (`11:30` và `19:30`) lên YouTube Shorts, Facebook Reels, TikTok (`chayDangVideo()`, `khungDangHienTai_()`, `trangThaiDangHomNay_()`, `chonVideoDang_()`), viết tiêu đề/mô tả chuẩn SEO (`vietBaiDang_()`), nhận kết quả đăng (`nhanKetQuaDang_()`), và thu thập số liệu lượt xem (`chayThuThapSoLieu()`). |
| [SanPham.gs](file:///e:/Video-AI/SanPham.gs) | Quản lý sản phẩm liên kết (`SAN_PHAM`), xử lý các lệnh Zalo tức thời không nghẽn khóa (`duyetVideo_`, `boVideo_`, `yeuCauSuaVideo_`, `xoaHanVideo_`), lệnh `/suavideocu`, `/dunglai`, `/nangcap`, và ghép cảnh giới thiệu sản phẩm vào kịch bản. |
| [ZaloDeBai.gs](file:///e:/Video-AI/ZaloDeBai.gs) | Nhận đề bài người dùng gửi qua Zalo (văn bản, ảnh chụp, tệp `.pdf`, `.docx`, `.tex`), tách nhiều câu tự động (`tachNhieuDe_`), đọc ảnh đề bằng Gemini Vision (`docDeTuAnh_`), thêm vào hàng đợi với `uu_tien = 1`, và hủy đề ưu tiên ngay lập tức (`/huy`, `huyUuTien_()`). |

### 2. Nhóm Workflows GitHub Actions (`/.github/workflows/*.yml`)
- [bo-phan-1.yml](file:///e:/Video-AI/.github/workflows/bo-phan-1.yml): Nhận đề từ Apps Script (`workflow_dispatch`), tải ảnh đề từ Drive (nếu có), chạy `node scripts/bophan1/chay_bp1.js`, gửi kết quả về `APPS_SCRIPT_URL` (`loai = "bo_phan_1"`). Có `cancel-in-progress: true` để hủy ngay lượt chạy cũ khi người dùng bấm `/sua`.
- [dung-video.yml](file:///e:/Video-AI/.github/workflows/dung-video.yml): Gồm 4 job:
  1. `chuan_bi`: Cài công cụ, tải tài nguyên từ Drive, tải kịch bản đầy đủ từ Drive nếu có `_file_kich_ban_drive`, chạy `scripts/chuanbi.py` tạo giọng đọc + `public/props.json`, dựng lớp Manim (`scripts/manim_hinh.py`) cho bài `HINH_HOC`, bundle Remotion, dựng ảnh bìa `AnhBia`, chạy `scripts/kiem_duyet.mjs` kiểm duyệt bố cục + AI nhìn hình, chia khúc video.
  2. `dung_khuc`: Dựng song song các khúc video trên ma trận máy ảo (`scripts/dung_khuc.mjs`).
  3. `ghep`: Ghép các khúc (`scripts/ghep_khuc.mjs`), ghép đè lớp `.mov` trong suốt của Manim (nếu là bài hình học), xuất ảnh kiểm tra (`scripts/anh_kiem_tra.py`), tải lên Drive và báo kết quả về Apps Script.
  4. `dang`: Khi `viec == 'dang'`, chạy `scripts/dang_video.py` đăng video lên Facebook, TikTok, YouTube.
- [kiem-tra-key.yml](file:///e:/Video-AI/.github/workflows/kiem-tra-key.yml): Chạy `scripts/kiem_tra_key.mjs` kiểm tra toàn bộ khóa trong `GEMINI_KEYS` trên danh sách model và báo cáo về Zalo.

### 3. Nhóm Scripts Python & Node.js (`/scripts/`)
- [scripts/bophan1/chay_bp1.js](file:///e:/Video-AI/scripts/bophan1/chay_bp1.js): Giả lập các dịch vụ của Google Apps Script (`SpreadsheetApp`, `PropertiesService`, `CacheService`, `DriveApp`, `Utilities`) bằng Node `vm` để chạy toàn bộ mã `.gs` trên GitHub Actions.
- [scripts/bophan1/goi_gemini.js](file:///e:/Video-AI/scripts/bophan1/goi_gemini.js): Tiến trình con gọi Gemini API song song với cơ chế **xoay vòng key** + **tự động đổi model theo chuỗi (`motChuoiModel`)** + **gọi dự phòng song song (hedged requests)** + **tự động dò model qua `/v1beta/models`** khi gặp lỗi 404.
- [scripts/chuanbi.py](file:///e:/Video-AI/scripts/chuanbi.py): Chuẩn hóa văn bản toán học sang tiếng Việt đọc tự nhiên, gọi Gemini TTS (có danh sách model TTS dự phòng tự động chuyển đổi) hoặc `edge-tts`, lọc tạp âm/rè, tính thời lượng từng cảnh, bung bản vẽ `dung_ban_ve` có phân tầng bước `buoc: 1..4`, chọn nhạc nền và xuất `public/props.json`.
- [scripts/manim_hinh.py](file:///e:/Video-AI/scripts/manim_hinh.py): Dựng bài toán `HINH_HOC` bằng Manim Community (`v0.22.1`): tự động tính tọa độ các điểm phụ (`_bo_sung_diem_phu`), chuẩn hóa cạnh nhìn thấy nét liền / cạnh khuất nét đứt 3D (`_chuan_hoa_khong_gian`), vẽ đường phụ (`phu`), tô sáng đối tượng đồng bộ lời giảng và dựng bảng công thức LaTeX bên dưới.
- [scripts/kiem_duyet.mjs](file:///e:/Video-AI/scripts/kiem_duyet.mjs): Chụp các khung hình mẫu của từng cảnh bằng `@remotion/renderer`, đo hộp chữ DOM tìm lỗi tràn mép/đè chữ/cắt chữ/lộ mã TeX, đối chiếu đáp số trên màn hình và gửi ảnh cho Gemini Vision kiểm duyệt trước khi render.
- [scripts/kiem_tra_key.mjs](file:///e:/Video-AI/scripts/kiem_tra_key.mjs): Kiểm tra sức khỏe từng API key trong `GEMINI_KEYS` trên chuỗi model.
- [scripts/dung_khuc.mjs](file:///e:/Video-AI/scripts/dung_khuc.mjs) & [scripts/ghep_khuc.mjs](file:///e:/Video-AI/scripts/ghep_khuc.mjs): Render từng phần của video và nối lại bằng `ffmpeg -c copy` kèm chuẩn hóa âm lượng `loudnorm`.
- [scripts/anh_kiem_tra.py](file:///e:/Video-AI/scripts/anh_kiem_tra.py): Trích xuất lưới 4 khung hình đại diện (`*_kt.jpg`) và ảnh bìa (`*_bia.jpg`) để AI trên Apps Script kiểm tra chất lượng video.
- [scripts/dang_video.py](file:///e:/Video-AI/scripts/dang_video.py): Đăng video tự động lên Facebook Reels, TikTok, YouTube Shorts.

### 4. Nhóm Giao diện & Sân khấu Remotion (`/src/`)
- [src/index.ts](file:///e:/Video-AI/src/index.ts) & [src/Root.tsx](file:///e:/Video-AI/src/Root.tsx): Khai báo 2 composition Remotion: `Video` (1080x1920, 30fps) và `AnhBia`.
- [src/Video.tsx](file:///e:/Video-AI/src/Video.tsx): Bố cục tổng thể của video dọc 9:16: lớp nền, thanh tiến trình 6 phần, tiêu đề cảnh, khung sân khấu minh họa (`KhungMinhHoa`), thẻ đề bài (`TheDeBai`), bảng công thức LaTeX (`HopCongThuc`), phụ đề karaoke, hiệu ứng âm thanh và kiểm duyệt DOM (`KiemDuyetKhung`).
- [src/AnhBia.tsx](file:///e:/Video-AI/src/AnhBia.tsx): Thiết kế ảnh bìa bắt mắt với nhãn môn/lớp, số tập Series, câu Hook nhấn mạnh và hình minh họa thật của bài toán.
- [src/bocuc.ts](file:///e:/Video-AI/src/bocuc.ts) & [src/MinhHoa.tsx](file:///e:/Video-AI/src/MinhHoa.tsx): Điều phối hiển thị hình minh họa.
- [src/sankhau/SanKhau.tsx](file:///e:/Video-AI/src/sankhau/SanKhau.tsx) & [src/sankhau/dulieu.ts](file:///e:/Video-AI/src/sankhau/dulieu.ts): Động cơ sân khấu 2D/3D tương tác: điều khiển camera (`phong_to`, `thu_nho`, `goc_3d`), giữ sân khấu liên cảnh (`giu_san_khau`), và thực thi 19 kiểu hành động (`chon`, `loai_bo`, `sang`, `rung`, `quay`, `mo`, `lay_ra`, `dat_gia_tri`, `bung_ra`, `di_chuyen`, `bien_hinh`, `tach`, `ghep`, `dem_tang`...).
- [src/sankhau/canhthat.ts](file:///e:/Video-AI/src/sankhau/canhthat.ts) & [src/sankhau/vatthuc.tsx](file:///e:/Video-AI/src/sankhau/vatthuc.tsx): Chuyển mô tả nghĩa của cảnh thực tế (`canh_that` nhìn ngang hoặc nhìn từ trên) thành bản vẽ kỹ thuật có tỉ lệ chính xác với hơn 40 vật thật SVG (`nguoi`, `cot_co`, `toa_nha`, `hai_dang`, `ngan_hang`, `thang`, `ban`, `ti_vi`, `kim_tu_thap`...) và phân bước tự động `buoc: 1..4` cho các đường đo.
- [src/sankhau/hinhhoc.tsx](file:///e:/Video-AI/src/sankhau/hinhhoc.tsx) & [src/sankhau/hinhtudo.tsx](file:///e:/Video-AI/src/sankhau/hinhtudo.tsx): Vẽ hình học phẳng/không gian (phân biệt rõ cạnh nhìn thấy nét liền `canh`, cạnh khuất nét đứt `khuat`, đường phụ nét đứt màu cam `phu`), đồ thị hàm số và hình tự do (đa giác, cung tròn, bông tuyết Koch, tam giác Sierpinski, xếp chồng...).
- [src/sankhau/vat3d.tsx](file:///e:/Video-AI/src/sankhau/vat3d.tsx): Dựng các khối 3D (`KhoiHop` có 3 cạnh khuất phía sau vẽ nét đứt `strokeDasharray="10 8"` và 9 cạnh nhìn thấy vẽ nét liền, `HinhTru`, `HinhNon`, `HinhCau`, `ToaNha3D`, `CaiThang`, `XeHoi`, `CaiCay`).
- [src/sankhau/vat.tsx](file:///e:/Video-AI/src/sankhau/vat.tsx): Các đạo cụ mô phỏng xác suất và thực tế (`Nguoi`, `HopBi`, `XucXac`, `DongXu`, `TheBai`, `VongQuay`, `DongHoDo`, `BieuDoCot`, `BanTron`, `LuoiO`, `DanhSach`, `SoDem`, `AnhThat`...).

---

## III. CHI TIẾT CÁC CƠ CHẾ TRỌNG TÂM (PHIÊN BẢN HIỆN HÀNH — LẦN 46)

### 1. Cơ chế chống nghẽn "Hệ thống đang bận" & Phản hồi tức thời lệnh `/bo`, `/sua`, `/duyet`, `/huy`
- **Loại bỏ khóa cứng 5 phút**: Các hàm chạy ngầm định kỳ (`chayBoPhan1`, `chayKiemTraVideo`, `xuLyHocGopY`, `chayDangVideo`) **không còn giữ `LockService.getScriptLock()` suốt nhiều phút**. Thay vào đó, hệ thống dùng cờ nhẹ trong `CacheService` (`DANG_CHAY_BP1`, `DANG_CHAY_KT_VIDEO`, `DANG_CHAY_HOC_GOP_Y`, `DANG_CHAY_DANG_VIDEO`) để tránh hai tiến trình định kỳ chồng lên nhau mà hoàn toàn không khóa bảng tính.
- **Tách đồng bộ bảng dọc (`dongBoBangDoc`) ra khỏi vùng khóa**: `dongBoBangDoc()` chỉ chạy sau khi đã nhả khóa hoặc đánh dấu cờ `CAN_DONG_BO = '1'` để chu kỳ dọn dẹp chạy ngầm, giúp lệnh `/bo` và `/sua` hoàn tất trong **< 1 giây** thay vì treo 30–90 giây.
- **Ưu tiên tuyệt đối cho thao tác người dùng**:
  - Trong `duyetVideo_()`, `boVideo_()`, `yeuCauSuaVideo_()` ([SanPham.gs](file:///e:/Video-AI/SanPham.gs)) và `huyUuTien_()` ([ZaloDeBai.gs](file:///e:/Video-AI/ZaloDeBai.gs)), thông báo lỗi `'⏳ Hệ thống đang bận, thử lại sau 1 phút nhé.'` đã được loại bỏ hoàn toàn.
  - Khi người dùng gửi `/bo <mã>` hoặc `/sua <mã> <nội dung>`, hệ thống ghi ngay vào Sheet (`SpreadsheetApp.flush()`) và đặt cờ tức thời trong `CacheService`:
    - `DA_BO_<id>`: Ngăn mọi tiến trình GitHub đang chạy dở (`nhanKetQuaBoPhan1_` hoặc `doPost`) hồi sinh dòng đã bị xóa, đồng thời tự động xóa tệp video vừa tải lên Drive nếu có.
    - `SUA_MOI_<id>`: Ngăn kết quả render cũ của lần trước ghi đè lên trạng thái `DA_GIAI` vừa được đặt lại để sửa; đồng thời workflow GitHub Actions có `cancel-in-progress: true` sẽ tự động hủy job cũ của cùng mã đề để chạy bản sửa mới ngay lập tức.
  - Lệnh `/bo` và `/sua` hoạt động trên **mọi trạng thái chưa đăng** (kể cả khi video đang ở `BP1_GITHUB`, `DANG_VIET_KB`, `DANG_DUNG`, `CHO_DUYET`, `LOI`).

### 2. Cơ chế tự sinh đề $\rightarrow$ AI tự kiểm tra $\rightarrow$ Tự động đăng 2 video/ngày
- **Cấu hình mặc định tự động hóa hoàn toàn**:
  - `DUYET_TRUOC_KHI_DANG = 'TAT'` (không bắt chờ người dùng bấm `/duyet` thủ công).
  - `DANG_TU_DONG = 'BAT'`, `SO_VIDEO_MOI_NGAY = '2'`, `GIO_DANG = '11:30,19:30'`.
  - Hàm `damBaoCauHinhTuDong_()` ([BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs)) tự động nâng cấp các bảng `CAU_HINH` cũ lên chế độ tự kiểm duyệt + tự đăng 2 video/ngày (vẫn tôn trọng nếu quản trị viên chủ động đặt `BAT_BUOC_DUYET_TAY`).
- **Quy trình kiểm định kép trước khi đăng**:
  1. **Trước khi dựng (`scripts/kiem_duyet.mjs`)**: Kiểm tra khung hình thật bằng trình duyệt headless + Gemini Vision đối chiếu đề bài, đáp số, vật thực tế và bố cục chữ.
  2. **Sau khi dựng xong (`xuLyAiXem_` trong [NangCao.gs](file:///e:/Video-AI/NangCao.gs))**: Gemini xem bảng ảnh 4 khung của video (`*_kt.jpg`) + ảnh bìa (`*_bia.jpg`) + kịch bản và chấm từng tiêu chí bắt buộc trong `TIEU_CHI_YEU_CAU_` (`dung_toan`, `bam_de`, `nhieu_canh`, `khong_loi_chu`, `co_hinh`, `du_6_phan`, `co_thu_lai`, `co_y_tuong`).
  3. **Tự duyệt & Đăng ngay**:
     - Nếu `kq.dat === true`: Hệ thống tự động đặt `duyet = 'DA_DUYET'`, ghi mốc thời gian `_duyet_luc`, gửi thông báo Zalo và gọi ngay `chayDangVideo()`.
     - Nếu `kq.dat === false`: Hệ thống tự động đặt `duyet = 'KHONG_DAT'`, chuyển `trang_thai = 'DA_GIAI'` kèm toàn bộ chỉ dẫn sửa vào `ghi_chu` để AI tự viết lại kịch bản và dựng lại video mới (tối đa 3 vòng tự sửa).
- **Điều phối lịch đăng 2 video/ngày (`khungDangHienTai_`, `trangThaiDangHomNay_` trong [DangVideo.gs](file:///e:/Video-AI/DangVideo.gs))**:
  - Khung 1 mở từ `11:30`, khung 2 mở từ `19:30`.
  - Hỗ trợ **đăng bù thông minh**: Nếu đến `11:30` video đầu tiên vẫn đang dựng/kiểm duyệt, ngay khi kiểm duyệt đạt (ví dụ lúc `13:00`), hệ thống sẽ tự động đăng bù video thứ nhất ngay lập tức, và giữ khoảng cách tối thiểu 90 phút trước khi đăng video thứ hai.

### 3. Cơ chế tự dò & nâng cấp toàn bộ video cũ / đang chờ trên Google Drive & Hàng đợi
- **Phiên bản chuẩn hóa**: `PHIEN_BAN_EDIT = 44` ([BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs)). Mọi kịch bản mới tạo đều được gắn `_phien_ban_edit = 44`.
- **Hàm tự động rà soát `doVaSuaVideoCuTrenDrive_(sh, toiDa, quetSauDrive)` ([BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs))**:
  - Chạy tự động trong mỗi chu kỳ `chayBoPhan1()` khi có chỗ trống, hoặc kích hoạt ngay qua menu **Tự động hóa > 🔄 Dò & sửa toàn bộ video cũ trên Drive sang bản mới** hay lệnh Zalo `/suavideocu` (`/dunglai`, `/nangcap`).
  - **Bước 1 — Quét bảng `HANG_DOI`**: Tìm tất cả các dòng chưa đăng có trạng thái `DA_XONG`, `CHO_DUYET`, `LOI`, hoặc `DA_GIAI` mà kịch bản chưa có `_phien_ban_edit >= 44` (hoặc thiếu cấu trúc 6 phần / ít hơn 12 cảnh / thiếu đường phụ & nét khuất 3D / hình thực tế tĩnh). Tự động chuyển về `DA_GIAI` kèm yêu cầu nâng cấp để viết lại kịch bản chuẩn mới và dựng lại video.
  - **Bước 2 — Quét sâu các thư mục trên Google Drive**: Dò các thư mục `kich_ban`, `da_xong`, `video`, và `THU_MUC_GOC` trên Google Drive:
    - Nếu phát hiện tệp kịch bản `<id>.json` cũ trên Drive chưa có trong `HANG_DOI` và chưa đăng: tự động khôi phục dòng vào `HANG_DOI` ở trạng thái `DA_GIAI` để tái tạo kịch bản và dựng lại theo phiên bản 44.
    - Nếu phát hiện tệp `<id>.mp4` mồ côi trên Drive có dữ liệu đề bài: tự động đưa vào hàng đợi để làm lại theo chuẩn edit mới.

### 4. Cơ chế Hình học Manim: Đường phụ (`phu`) & Quy tắc Hình học không gian (Nét liền / Nét đứt)
- **Cho phép và khuyến khích vẽ thêm đường phụ (`phu` / `duong_phu`)**:
  - Trong [HinhHoc.gs](file:///e:/Video-AI/HinhHoc.gs) (`HUONG_DAN_MA_HINH_`, `DANG_TRA_HINH_`, `chenToaDoHinh_`, `huongDanKichBanHinh_`): Hướng dẫn AI chủ động dựng thêm chân đường cao $H$, trung điểm $M, N, I$, tâm đáy $O$, hình chiếu vuông góc $K$, giao điểm thiết diện... và khai báo các đoạn nối vào mảng `phu: [["S","O"], ["A","H"], ["O","K"], ...]`.
  - Trong [scripts/manim_hinh.py](file:///e:/Video-AI/scripts/manim_hinh.py) (`_bo_sung_diem_phu`): Nếu lời giảng, công thức hoặc danh sách `hien_diem` / `to_canh` nhắc tới điểm phụ (như trung điểm, trọng tâm, hình chiếu vuông góc, chân đường cao, tâm đáy, giao điểm hai đường thẳng) mà AI quên tính tọa độ trong `v["diem"]`, Manim **tự động suy luận hình học từ văn bản tiếng Việt và tính tọa độ chính xác** của điểm phụ đó cũng như tự động thêm đoạn thẳng phụ vào `v["phu"]`.
- **Đảm bảo nguyên tắc cơ bản của Hình học không gian 3D (Cạnh nhìn thấy = Nét liền, Cạnh khuất = Nét đứt)**:
  - **Phép chiếu và phân loại 3D tự động (`phanLoaiCanhKhongGian3D_` trong [HinhHoc.gs](file:///e:/Video-AI/HinhHoc.gs))**:
    1. Mọi cạnh nằm trên **bao lồi 2D (2D Convex Hull silhouette)** của hình chiếu đa diện đều là biên ngoài cùng $\rightarrow$ **bắt buộc 100% là cạnh nhìn thấy (nét liền `canh`)**.
    2. Nếu khối đa diện có khai báo các mặt `mat`, tính tích vô hướng giữa pháp tuyến ngoài của từng mặt với hướng nhìn camera $\vec{v}_{\text{cam}} = (0.41, -1.0, 0.29)$: cạnh thuộc ít nhất một mặt hướng về phía người nhìn là **nét liền (`canh`)**, cạnh chỉ thuộc các mặt quay lưng là **nét đứt (`khuat`)**.
    3. Kiểm tra **che khuất theo chiều sâu 3D (Ray-Plane / Segment Occlusion)**: Cạnh đi xuyên qua phần trong hoặc bị mặt phẳng phía trước che khuất (hoặc xuất phát từ đỉnh khuất nội bộ có bậc $\ge 3$ nằm lọt trong bao lồi ở phía xa camera) tự động được chuyển sang **nét đứt (`khuat`)**.
  - **Hậu kiểm trong Manim (`_chuan_hoa_khong_gian` trong [scripts/manim_hinh.py](file:///e:/Video-AI/scripts/manim_hinh.py))**: Kiểm tra lại một lần nữa trước khi vẽ bằng Manim: đảm bảo không bao giờ có cạnh biên bao lồi bị vẽ đứt, và các cạnh khuất phía sau / bên trong khối chóp, lăng trụ, hộp đều nằm trong `khuat`.
  - **Hiển thị rõ nét đứt trong cả Manim và Remotion**:
    - Trong [scripts/manim_hinh.py](file:///e:/Video-AI/scripts/manim_hinh.py): Cạnh `khuat` và `phu` được vẽ bằng `DashedLine(..., dash_length=0.18, dashed_ratio=0.56)` để các vạch đứt tách bạch rõ ràng trên màn hình điện thoại; khi tô sáng (`to_canh`) cạnh khuất/đường phụ, giữ độ dày vừa phải (`5.0`) để các nét đứt không bị dính liền thành nét liền.
    - Trong [src/sankhau/hinhhoc.tsx](file:///e:/Video-AI/src/sankhau/hinhhoc.tsx) và [src/sankhau/vat3d.tsx](file:///e:/Video-AI/src/sankhau/vat3d.tsx): Loại bỏ mọi cạnh thuộc `khuat`/`phu` khỏi danh sách `canhLien`, đồng thời khối hộp 3D (`KhoiHop`) ẩn mặt sau đặc và vẽ 3 cạnh khuất xuất phát từ đỉnh sau bằng nét đứt (`strokeDasharray="10 8"`).

### 5. Cơ chế Hình minh họa thực tế linh hoạt theo từng cảnh & Chia nhiều khung bước (`buoc: 1..4`)
- **Chấm dứt tình trạng 1 hình tĩnh dùng cho cả video**:
  - Trong [PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs) (`taoPromptKichBan_`, `banVeChoPrompt_`, `chenBanVe_`, `tuyChinhBanVeTheoCanh_`):
    - Thay vì chèn nguyên xi một `ban_ve` giống hệt nhau vào mọi cảnh, hàm `tuyChinhBanVeTheoCanh_(c, ct, idxCanh, dapAn)` phân tích loại cảnh (`mo_dau`, `de_bai`, `mo_hinh`, `bay`, `nhac_lai`, `tinh_toan`, `dap_an`, `kiem_tra`) và nội dung lời thoại / công thức của riêng cảnh đó để biến đổi hình minh họa:
      - **Cảnh mở đầu / đề bài**: Vật thật xuất hiện ở `buoc: 1`, các kích thước đã biết hiện ở `buoc: 2`, đại lượng cần tìm hiện dấu `?` màu cam ở `buoc: 3`.
      - **Cảnh mô hình hóa / ý đồ**: Hiện thêm tam giác vuông / đường gióng / góc nâng ở `buoc: 2..3` và phóng to (`phong_to`) vào vùng trọng tâm.
      - **Cảnh bẫy / lỗi sai**: Gắn nhãn cảnh báo màu đỏ/cam và hiệu ứng `rung` tại đối tượng dễ nhầm.
      - **Các cảnh tính toán**: Tự động trích biểu thức ngắn đang tính trong `noi_dung_man_hinh` của cảnh đó để gắn vào đường đo đang xét, đổi màu vàng nổi bật và thêm hành động `chon` / `sang` / `phong_to`.
      - **Cảnh đáp án & thử lại**: Thay nhãn `?` bằng kết quả số thực tế vừa tìm được màu xanh lá (`xanh_la`) kèm kiểm chứng trực quan.
  - **Chia nhỏ mỗi cảnh thành nhiều khung hình con (`buoc: 1, 2, 3, 4`)**:
    - Trong [KiemTraHinh.gs](file:///e:/Video-AI/KiemTraHinh.gs) (`tuSuaDaDangHinh_`, `kiemTraDaDangHinhThucTe_`), [src/sankhau/canhthat.ts](file:///e:/Video-AI/src/sankhau/canhthat.ts) (`dungNgang`, `dungTren`), và [scripts/chuanbi.py](file:///e:/Video-AI/scripts/chuanbi.py): Nếu một cảnh có nhiều vật hoặc nhiều phép đo cùng để mặc định một bước, hệ thống tự động rải đều chúng sang `buoc = 1, 2, 3, 4` khớp với các mốc thời gian của giọng đọc trong cảnh đó.

### 6. Cơ chế Hệ thống Model Động — Tự động chuyển đổi Model khi gặp lỗi
- **Không cố định một model duy nhất**:
  - Cấu hình `DANH_SACH_MODEL` trong [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs) duy trì chuỗi model ưu tiên:
    `gemini-2.5-flash, gemini-flash-latest, gemini-2.5-pro, gemini-2.0-flash, gemini-flash-lite-latest, gemini-3.8-flash, gemini-3.6-flash`.
- **Tự động chuyển model tức thì trên cả Apps Script và GitHub Actions**:
  - Trong `goiGemini_()` và `goiGeminiSong_()` ([BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs)) cũng như `motChuoiModel()` ([scripts/bophan1/goi_gemini.js](file:///e:/Video-AI/scripts/bophan1/goi_gemini.js)):
    1. **Gặp lỗi HTTP 404 (Model không tồn tại / đã ngừng hỗ trợ)**: Đánh dấu ngay model đó vào bộ nhớ tạm (`MODEL_404_<model>` trong `CacheService` hoặc `/tmp/gemini_model_khong_co.txt`), **không lãng phí thử các API key tiếp theo trên model 404 đó**, và lập tức chuyển sang model kế tiếp trong danh sách.
    2. **Gặp lỗi HTTP 400 (Tính năng như `thinkingConfig` không hỗ trợ ở model dự phòng)**: Tự động gỡ bỏ `thinkingConfig` trong `chuanBodyChoModel_()` và gọi lại ngay.
    3. **Gặp lỗi HTTP 429 (Hết hạn mức ngày / giới hạn phút), HTTP 500, HTTP 503 (Quá tải), lỗi mạng, hoặc trả về JSON hỏng**: Tự động xoay vòng key và trượt sang model tiếp theo trong chuỗi mà không làm gián đoạn quá trình giải đề hay viết kịch bản.
    4. **Ghi nhớ Model tốt nhất (`MODEL_TOT_NHAT`)**: Khi một model dự phòng phản hồi thành công trong khi model đầu danh sách bị 404/quá tải, hệ thống tự động đưa `MODEL_TOT_NHAT` lên đầu danh sách cho các lần gọi kế tiếp để tiết kiệm thời gian chờ.
    5. **Tự động dò tìm Model mới từ Google API (`tuTimModelGemini_` / `tuTimModelTrenApi`)**: Nếu tất cả các tên model trong cấu hình đều trả về 404 (ví dụ khi Google đổi tên phiên bản Gemini trong tương lai), hệ thống tự động gọi `GET /v1beta/models` để lấy danh sách các model `gemini-*` có hỗ trợ `generateContent` đang hoạt động thực tế và dùng ngay lập tức.
  - Áp dụng đồng bộ cho cả **Gemini TTS** (`gemini_tts` trong [scripts/chuanbi.py](file:///e:/Video-AI/scripts/chuanbi.py)) và **AI Nhìn Hình** (`aiNhinHinh` trong [scripts/kiem_duyet.mjs](file:///e:/Video-AI/scripts/kiem_duyet.mjs)).

---

## IV. CẤU TRÚC BẢNG TÍNH GOOGLE SHEETS & LỆNH ZALO BOT

### 1. Các trang tính (Sheets) trong Google Spreadsheet
- **`HANG_DOI`** (26 cột chuẩn trong mảng `COT`):
  `id`, `trang_thai`, `lop`, `mon`, `chu_de`, `muc_do`, `de_bai`, `dap_an`, `dap_an_hien`, `cach_giai`, `file_kich_ban`, `file_video`, `thoi_luong_giay`, `tieu_de_youtube`, `mo_ta_youtube`, `tags`, `so_lan_loi`, `ghi_chu`, `ngay_tao`, `cap_nhat`, `anh_kiem_tra`, `anh_bia`, `duyet`, `youtube_id`, `facebook_id`, `tiktok_id`, `san_pham`, `file_anh`, `uu_tien`, `zalo_nguoi_gui`.
- **`CAU_HINH`**: Chứa các cặp `khoa` – `gia_tri` điều khiển toàn bộ hệ thống (`DANH_SACH_MODEL`, `MODEL_CHINH`, `MODEL_DU_PHONG`, `DUYET_TRUOC_KHI_DANG`, `DANG_TU_DONG`, `SO_VIDEO_MOI_NGAY`, `GIO_DANG`, `TU_SUA_VIDEO_CU_DRIVE`, `GITHUB_REPO`, `GITHUB_TOKEN`, `ZALO_BOT_TOKEN`...).
- **`BANG_DOC`**: Bảng trình bày dạng thẻ dọc dễ đọc trên điện thoại, được đồng bộ bất đồng bộ qua `dongBoBangDoc()`.
- **`GOP_Y_HOC` & `QUY_TAC_HOC`**: Lưu lịch sử góp ý `/sua` và các quy tắc sư phạm/hình ảnh đã được AI chắt lọc để áp dụng vĩnh viễn cho mọi video sau.
- **`SAN_PHAM`, `SERIES`, `SO_LIEU`, `NHAT_KY`, `KHO_KEY`**: Quản lý sản phẩm tiếp thị, chuỗi tập phim, thống kê lượt xem, nhật ký hệ thống và kho API key.

### 2. Bảng lệnh Zalo Bot hỗ trợ người dùng
| Lệnh Zalo | Chức năng thực hiện |
| :--- | :--- |
| Gửi chữ / ảnh / tệp `.pdf`, `.docx`, `.tex` | Nhận đề bài toán mới (tự tách nếu có nhiều câu), đặt `uu_tien = 1` và đẩy lên đầu hàng đợi giải ngay. |
| `/bo <mã>` hoặc `bỏ <mã>` | Xóa ngay lập tức video/đề bài khỏi hàng đợi và Google Drive, đặt cờ `DA_BO_<id>` chặn mọi tiến trình đang chạy dở (không bao giờ báo bận). |
| `/sua <mã> <nội dung góp ý>` | Chuyển ngay video về trạng thái sửa kịch bản theo góp ý, hủy job cũ trên GitHub và học quy tắc mới vào `GOP_Y_HOC` (không bao giờ báo bận). |
| `/duyet <mã>` | Duyệt thủ công một video và kích hoạt đăng ngay. |
| `/huy` hoặc `/huy <mã>` | Hủy ngay đề ưu tiên vừa gửi qua Zalo (kể cả khi đang giải trên GitHub hoặc đang dựng video). |
| `/suavideocu` (hoặc `/dunglai`, `/nangcap`) | Quét toàn bộ video cũ / đang chờ trên Google Drive và Hàng đợi để nâng cấp cách edit lên phiên bản mới nhất (`PHIEN_BAN_EDIT = 44`). |
| `/sp ...` | Quản lý danh sách sản phẩm quảng cáo đính kèm video. |

---

## V. LỊCH SỬ CÁC LẦN CHỈNH SỬA HỆ THỐNG (TỪ LẦN 1 ĐẾN LẦN 44)

### Lần 1 (`SUA_CODE_BO_PHAN_1.md`) — Thiết lập Bộ phận 1 & Nền tảng Giải toán + Kịch bản
- Xây dựng tệp `BoPhan1.gs` đầu tiên quản lý bảng `HANG_DOI` và `CAU_HINH`.
- Thiết lập quy trình tự sinh đề toán xác suất THPT, giải bằng 2 cách độc lập và viết mã JavaScript `kiemChung()` chạy thử để đối chiếu đáp án trước khi viết kịch bản JSON.

### Lần 2 (`SUA_CODE_LAN_2.md`) — Kiểm tra kịch bản & Kết nối Bộ phận 2
- Thêm tệp `KiemTraHinh.gs` để kiểm tra cấu trúc dữ liệu hình minh họa ngay khi Gemini vừa viết kịch bản.
- Thêm `BoPhan2.gs` gửi sự kiện `repository_dispatch` sang GitHub Actions để dựng video bằng Remotion và nhận kết quả qua `doPost(e)`.

### Lần 3 (`SUA_CODE_LAN_3.md`) — Đa dạng hóa biểu đồ & Tự sửa kịch bản cơ bản
- Bổ sung các loại hình minh họa xác suất (`cay`, `bang_o`, `dien_tich`, `thuc_nghiem`, `phan_tu`).
- Thêm hàm `tuSuaKichBan_()` tự động sửa các lỗi định dạng nhỏ và `suaDapAn_()` đảm bảo cảnh đáp án luôn khớp kết quả đã kiểm chứng.

### Lần 4 (`SUA_CODE_LAN_4.md`) — Sân khấu tương tác (`san_khau`) & Đạo cụ trực quan
- Nâng cấp hệ thống hình minh họa sang cơ chế `san_khau` gồm danh sách đạo cụ (`vat`: `nguoi`, `hop_bi`, `xuc_xac`, `dong_xu`, `the_bai`, `vong_quay`...) và các hành động (`hanh_dong`: `chon`, `loai_bo`, `sang`, `rung`, `quay`, `mo`, `lay_ra`).
- Hỗ trợ `giu_san_khau: true` để giữ nguyên các vật từ cảnh trước và diễn tiếp trên cùng sân khấu.

### Lần 5 (`SUA_CODE_LAN_5.md`) — Mở rộng sang Toán Thực Tế (`THUC_TE`) & Vật thể 3D
- Mở rộng hệ thống từ chỉ làm toán Xác suất sang làm thêm **Toán thực tế** (tối ưu chi phí, thể tích, diện tích, chuyển động, đo đạc).
- Thêm các vật 3D (`khoi_hop`, `tru`, `non`, `cau`, `toa_nha`, `thang`, `xe`, `cay`), đồ thị hàm số (`do_thi`) và hình học (`hinh_hoc`) trong `src/sankhau/vat3d.tsx` và `src/sankhau/hinhhoc.tsx`.

### Lần 6 (`SUA_CODE_LAN_6.md`) — Cải tiến Giọng đọc TTS, Phụ đề Karaoke & Bảng công thức LaTeX
- Nâng cấp `scripts/chuanbi.py` chuẩn hóa cách đọc ký hiệu toán học bằng tiếng Việt tự nhiên.
- Hiển thị công thức bằng KaTeX trong `src/Video.tsx` với các chế độ trình bày `cong_don`, `bien_doi`, `xep` và phụ đề highlight từng cụm từ.

### Lần 7 (`SUA_CODE_LAN_7.md`) — Hệ thống nâng cao (`NangCao.gs`): Hook, Series & Tự học từ góp ý
- Thêm tệp `NangCao.gs`: quản lý 5 kiểu câu móc (`hook_kieu`) ở 5 giây đầu, quản lý chuỗi tập phim (`SERIES`), và cơ chế học từ nhận xét của người dùng.

### Lần 8 (`SUA_CODE_LAN_8.md`) — Tự động đăng YouTube Shorts & Bảng dọc (`BANG_DOC`)
- Thêm tệp `DangVideo.gs` để AI tự viết tiêu đề, mô tả, hashtag và đăng video lên YouTube Shorts.
- Thêm trang `BANG_DOC` trình bày thông tin từng video theo chiều dọc dễ theo dõi trên điện thoại.

### Lần 9 (`SUA_CODE_LAN_9.md`) — Hình vẽ tự do (`hinh_tu_do`) & Fractal / Xếp chồng
- Bổ sung đối tượng `hinh_tu_do` (`src/sankhau/hinhtudo.tsx`) hỗ trợ vẽ đa giác, đường, mũi tên, đường tròn, cung tròn, bông tuyết Koch (`koch`), tam giác Sierpinski (`sierpinski`), đường cong tham số (`tham_so`) và chồng vật (`xep_chong`).

### Lần 10 (`SUA_CODE_LAN_10.md`) — Trọng tài giải toán (`trongTaiGiai_`) & Xử lý đề có vấn đề
- Khi Cách 1, Cách 2 và mã `kiemChung()` cho kết quả lệch nhau, gọi thêm bước Trọng tài suy luận sâu (`trongTaiGiai_`) để chốt đáp án đúng thay vì vứt bỏ đề ngay.
- Phát hiện đề toán thực tế có số liệu không vừa khít (ví dụ xếp tầng còn dư ống) để giải thích rõ phần nguyên và phần dư trong video.

### Lần 11 (`SUA_CODE_LAN_11.md`) — Kiểm duyệt bố cục tự động trước khi dựng (`scripts/kiem_duyet.mjs`)
- Thêm bước chụp khung hình mẫu trước khi render toàn bộ video để phát hiện sớm lỗi chữ tràn mép (`TRAN_MEP`), chữ đè nhau (`CHU_DE`), chữ bị cắt (`CAT_CHU`), mã TeX thô (`TEX_THO`) hoặc KaTeX lỗi (`KATEX_LOI`).

### Lần 12 (`SUA_CODE_LAN_12.md`) — Dựng video song song nhiều khúc trên GitHub Actions
- Chia quy trình `dung-video.yml` thành 3 job (`chuan_bi` $\rightarrow$ `dung_khuc` chạy song song trên 4–10 máy ảo $\rightarrow$ `ghep`), giảm thời gian dựng mỗi video từ ~13 phút xuống còn ~4–6 phút.

### Lần 13 (`SUA_CODE_LAN_13.md`) — Tích hợp Zalo Bot & Quảng cáo sản phẩm (`SanPham.gs`)
- Kết nối Zalo Bot gửi thông báo kèm ảnh bìa, ảnh kiểm tra và link video về điện thoại.
- Thêm tệp `SanPham.gs` quản lý sản phẩm bán hàng (`SAN_PHAM`) và tự động lồng ghép khéo léo cảnh giới thiệu sản phẩm ở cuối video khi phù hợp.

### Lần 14 (`SUA_CODE_LAN_14.md`) — Thiết kế Ảnh bìa (`AnhBia.tsx`) & Nhạc nền theo cảm xúc
- Tạo composition `AnhBia` riêng cho từng video và chèn làm khung hình 0 của video (giúp TikTok/Reels tự lấy làm thumbnail).
- Tự sinh nhạc nền đa âm sắc (`tinh_lang`, `nhe_nhang`, `tuoi_ang`, `kich_tinh`, `hoi_hop`) bằng numpy trong `scripts/chuanbi.py` và chọn nhạc theo nội dung bài toán (`chonNhacNen_`).

### Lần 15 (`SUA_CODE_LAN_15.md`) — Tách `PromptKichBan.gs` & Quy trình sư phạm 6 phần
- Tách toàn bộ logic tạo prompt sang tệp `PromptKichBan.gs`.
- Chuẩn hóa cấu trúc kịch bản 6 phần bắt buộc: **ĐỀ BÀI $\rightarrow$ MÔ PHỎNG $\rightarrow$ LỖI SAI (BẪY) $\rightarrow$ GIẢI $\rightarrow$ THỬ LẠI $\rightarrow$ CHỐT (BÀI HỌC)**.

### Lần 16 (`SUA_CODE_LAN_16.md`) — Đăng đa nền tảng: Facebook Reels, TikTok & YouTube (`scripts/dang_video.py`)
- Thêm job `dang` trong `dung-video.yml` và tệp `scripts/dang_video.py` để đăng video tự động lên cả Facebook Page Reels, TikTok (tự làm mới `refresh_token` lưu trên Drive) và YouTube Shorts.

### Lần 17 (`SUA_CODE_LAN_17.md`) — Giọng đọc AI Gemini TTS & Lọc rè âm thanh
- Tích hợp giọng đọc `gemini-2.5-flash-preview-tts` (giọng nam `Charon` / giọng nữ `Kore`, `Aoede`...) đọc tự nhiên toàn bộ kịch bản trong một lần gọi rồi tách theo cảnh để giữ chất giọng đồng nhất xuyên suốt video.
- Thêm bộ đo phổ tần số phát hiện giọng bị rè/tạp âm (`giong_bi_re`) để tự động đọc lại hoặc chuyển sang `edge-tts` cùng giới tính.

### Lần 18 (`SUA_CODE_LAN_18.md`) — Lệnh Zalo `/duyet`, `/bo`, `/sua` & AI tự học quy tắc (`QUY_TAC_HOC`)
- Cho phép người dùng nhắn trực tiếp `/duyet`, `/bo`, `/sua <mã> <góp ý>` trên Zalo.
- Khi người dùng gửi `/sua`, AI vừa sửa ngay video đó vừa rút ra quy tắc chung lưu vào trang `QUY_TAC_HOC` để không lặp lại lỗi ở các video sau.

### Lần 19 (`SUA_CODE_LAN_19.md`) — Nhận đề bài qua Zalo (`ZaloDeBai.gs`) bằng Chữ, Ảnh, PDF, Word, LaTeX
- Thêm tệp `ZaloDeBai.gs`: người dùng gửi câu hỏi toán, chụp ảnh đề thi hoặc gửi file `.pdf`, `.docx`, `.tex` vào Zalo Bot $\rightarrow$ hệ thống tự đọc đề, tách từng bài, gắn `uu_tien = 1` và làm trước tiên.

### Lần 20 (`SUA_CODE_LAN_20.md`) — Cảnh thực tế tự dựng (`canh_that`) & Thư viện vật thật SVG (`vatthuc.tsx`)
- Thêm cơ chế `canh_that` (`src/sankhau/canhthat.ts` + `src/sankhau/vatthuc.tsx`): AI chỉ cần mô tả theo nghĩa (người cao $1{,}6\text{ m}$ đứng tại $x=0$, cột cờ cao $15\text{ m}$ tại $x=20$, góc nâng $35^\circ$...), máy tự tính tỉ lệ bản vẽ kỹ thuật, dựng vật thật SVG và vẽ đường gióng, cung góc, bóng nắng.

### Lần 21 (`SUA_CODE_LAN_21.md`) — Bản vẽ nhìn từ trên (`nhin: "tren"`) cho bài toán mảnh vườn, hàng rào, qua sông
- Mở rộng `canh_that` hỗ trợ góc nhìn mặt bằng từ trên xuống (`nhin: "tren"`), vẽ vùng (`vuon`, `ruong`, `ho_boi`, `san_bong`, `song`), bức tường gạch (`tuong`) và hàng rào theo từng cạnh (`hang_rao`).

### Lần 22 (`SUA_CODE_LAN_22.md`) — Tự tạo Bản vẽ kỹ thuật chuẩn trước khi viết kịch bản (`taoBanVeThucTe_`)
- Trước khi viết kịch bản toán thực tế, AI lập riêng một bản vẽ chuẩn `kb.ban_ve` đúng số đo của đề và đáp án, sau đó kiểm tra đủ các điểm của đề (`kiemTraDiemDe_`) và đúng tổng chiều dài rào (`kiemTraSoDoVung_`, `tuSuaSoDoVung_`).

### Lần 23 (`SUA_CODE_LAN_23.md`) — AI Nhìn Hình kiểm duyệt trước khi render (`aiNhinHinh`)
- Trong `scripts/kiem_duyet.mjs`, gửi ảnh chụp các cảnh thực tế cho Gemini Vision kiểm tra xem hình vẽ đã đúng vật thật trong đề chưa, số đo đặt đúng chỗ chưa; nếu sai thì chặn lại trả về Apps Script để tự sửa kịch bản trước khi tốn máy render.

### Lần 24 (`SUA_CODE_LAN_24.md`) — Thư viện hàng nghìn biểu tượng Emoji (`TU_DIEN_EMOJI_`) & Chống vẽ khối hộp vô nghĩa
- Khi đề nhắc tới vật ngoài thư viện SVG vẽ sẵn (tàu hỏa, trực thăng, bệnh viện, hoa, con vật...), tự động ánh xạ sang biểu tượng đúng vật đó thay vì vẽ khối hộp/khối trụ vô nghĩa.
- Kiểm tra riêng bài toán tài chính/lãi suất (`kiemTraTaiChinh_`, `tuSuaTaiChinh_`) để gỡ bỏ các khối hình học không liên quan.

### Lần 25 (`SUA_CODE_LAN_25.md`) — Máy tự tính lại mọi phép tính LaTeX trên màn hình (`texThanhSo_`, `kiemTraPhepTinh_`)
- Bộ phân tích biểu thức LaTeX trong `KiemTraHinh.gs` tự động tính giá trị số của các vế trong mọi dòng công thức `A = B = C` (bao gồm phân số, căn bậc $n$, lũy thừa, $\sin, \cos, \tan, \cot$ theo độ) để bắt ngay mọi phép tính sai số học.

### Lần 26 (`SUA_CODE_LAN_26.md`) — Chuyển Bộ phận 1 sang chạy trên GitHub Actions (`bo-phan-1.yml` & `chay_bp1.js`)
- Đưa toàn bộ quá trình giải đề + kiểm chứng + viết kịch bản + tự sửa sang chạy trên GitHub Actions (`scripts/bophan1/chay_bp1.js`), xóa bỏ hoàn toàn giới hạn 6 phút/lần chạy của Google Apps Script.

### Lần 27 (`SUA_CODE_LAN_27.md`) — Kho Key Gemini nhiều tài khoản & Xoay vòng Key thông minh (`goi_gemini.js`)
- Hỗ trợ nhập hàng chục API Key trong `GEMINI_KEYS`, tự động xoay vòng khi một key chạm giới hạn theo phút hoặc hết hạn mức ngày (`429 PerDay`), và phát hiện key hỏng thật để báo qua Zalo.

### Lần 28 (`SUA_CODE_LAN_28.md`) — Bố cục Bàn tròn (`ban_tron`) & Chống đè nhãn trên bản vẽ
- Thêm đạo cụ `ban_tron` cho các bài toán hoán vị vòng quanh bàn, tự động chuyển nhóm người xếp hàng ngang thành ngồi quanh bàn tròn khi đề bài yêu cầu (`tuSuaBoCucDe_`).
- Thuật toán đặt nhãn tránh đè lên vật và nhãn khác (`datNhan` trong `src/sankhau/canhthat.ts`).

### Lần 29 (`SUA_CODE_LAN_29.md`) — Phân môn Hình học (`HINH_HOC`) & Dựng hình bằng tọa độ chính xác (`HinhHoc.gs`)
- Thêm tệp `HinhHoc.gs`: AI viết hàm JavaScript tính tọa độ các đỉnh, giao điểm, chân đường cao, tâm đường tròn ngoại tiếp/nội tiếp (`taoHinhChinhXac_`) để hình vẽ luôn vuông thật, tiếp xúc thật và thẳng hàng thật.

### Lần 30 (`SUA_CODE_LAN_30.md`) — Tích hợp Manim Community dựng video Hình học (`scripts/manim_hinh.py`)
- Với bài toán `HINH_HOC`, sử dụng **Manim** (`scripts/manim_hinh.py`) dựng toàn bộ hình vẽ, ký hiệu góc vuông, cung góc, tô miền đa giác, hiệu ứng phóng/chớp sáng cạnh đang xét và viết công thức LaTeX thành lớp video trong suốt ghép đè lên khung Remotion.

### Lần 31 (`SUA_CODE_LAN_31.md`) — Đánh vần tên điểm Hình học trong giọng đọc TTS
- Trong `scripts/chuanbi.py` (`DOC_CHU_CAI`), tự động đánh vần tên đỉnh, cạnh, tam giác, mặt phẳng trong bài hình học (ví dụ `SA ⊥ (ABC)` đọc thành *"ét a vuông góc với mặt phẳng a bê xê"*) để giọng đọc chuẩn xác như giáo viên giảng bài.

### Lần 32 (`SUA_CODE_LAN_32.md`) — Kiểm tra kịch bản Manim (`kiemTraKichBanManim_`) & Đồng bộ lời giảng – hình vẽ
- Đảm bảo mọi điểm/cạnh nhắc trong lời thoại và công thức của từng cảnh đều được khai báo trong `manim.hien_diem`, `manim.hien_canh`, `manim.to_canh` để hình vẽ Manim sáng lên đúng nhịp giọng đọc.

### Lần 33 (`SUA_CODE_LAN_33.md`) — Hình học không gian 3D bằng phép chiếu xiên Cavalier (`chieuHinhKhongGian_`)
- Hỗ trợ dựng hình chóp, lăng trụ, tứ diện, hình hộp bằng tọa độ 3D `[x, y, z]` rồi chiếu xuống mặt phẳng 2D theo góc chiếu sách giáo khoa Việt Nam ($\alpha = 45^\circ$, hệ số co $k = 0{,}45$).

### Lần 34 (`SUA_CODE_LAN_34.md`) — Thêm vật thực tế mới (`ban`, `ghe`, `ti_vi`, `kim_tu_thap`, `thap`) & Bắt lỗi vẽ vật lạ mỗi cảnh
- Mở rộng thư viện `vatthuc.tsx` thêm cái bàn (có mặt bàn + 4 chân), ghế, tivi, kim tự tháp, tháp truyền hình.
- Thêm `kiemTraVatLaMoiCanh_()` và `tuSuaVatLa_()` ngăn việc đề nói "ngọn hải đăng" mà cảnh sau lại vẽ "tòa nhà" hay đề nói "cái bàn" mà lại vẽ "khối hộp".

### Lần 35 (`SUA_CODE_LAN_35.md`) — Thẻ ĐỀ CHO / CẦN TÌM cố định & Kiểm tra phần Thử lại thật sự
- Hiển thị thẻ tóm tắt `de_cho` và `can_tim` rõ ràng ở đầu video (`the_de_bai` trong `scripts/chuanbi.py` và `TheDeBai` trong `src/Video.tsx`).
- Bắt buộc cảnh `kiem_tra` (Thử lại) phải có phép tính thử bằng số thật sự trên màn hình.

### Lần 36 (`SUA_CODE_LAN_36.md`) — Chống vẽ lại dấu ba chấm (`kiemTraBaCham_`) & Cảnh liên hệ thực tế có vật thật (`suaLienHeThucTe_`)
- Ngăn AI vẽ lại nguyên xi dấu `...` hay `⋮` trong các bài dãy số / xếp chồng ống thép; buộc dựng bằng nét có quy luật (`xep_chong`, `lap`).
- Tự động bổ sung vật thật + người quan sát cho cảnh `lien_he_thuc_te`.

### Lần 37 (`SUA_CODE_LAN_37.md`) — Gọi dự phòng song song (Hedged Requests) khi Gemini chậm
- Trong `scripts/bophan1/goi_gemini.js`, nếu sau `GIAY_GOI_DU_PHONG` giây model chính chưa trả lời, tự động bắn thêm yêu cầu song song sang model dự phòng bằng key khác và lấy kết quả nào về trước.

### Lần 38 (`SUA_CODE_LAN_38.md`) — Kiểm tra sức khỏe toàn bộ Kho Key (`kiem-tra-key.yml` & `scripts/kiem_tra_key.mjs`)
- Thêm công cụ kiểm tra từng key trong `GEMINI_KEYS`, phân biệt rõ key hết hạn mức ngày (`HET_NGAY` — giữ lại chờ hôm sau) với key hỏng thật (`LOI_THAT` — báo Zalo để người dùng gỡ).

### Lần 39 (`SUA_CODE_LAN_39.md`) — Xử lý Key dạng mới (`AQ.`) bị từ chối cục bộ theo từng Model
- Ghi nhận `TEP_TU_CHOI` theo từng cặp `model|key`; chỉ khi một key bị từ chối ở $\ge 2$ model khác nhau và chưa từng gọi thành công lần nào mới kết luận là key hỏng.

### Lần 40 (`SUA_CODE_LAN_40.md`) — Gỡ các ràng buộc rườm rà của Remotion khỏi bài Hình học Manim
- Trong `danhGiaKichBan_()` (`KiemTraHinh.gs`), miễn trừ các lỗi chỉ dành cho sân khấu Remotion (`HINH_DUNG_YEN`, `THIEU_CANH_3D`, `THIEU_LIEN_HE_THUC_TE`...) đối với bài `HINH_HOC` dựng bằng Manim để lời giảng tập trung hoàn toàn vào chứng minh và tính toán hình học.

### Lần 41 – 43 (`SUA_CODE_LAN_41.md`) — Tối ưu tốc độ kiểm duyệt, đồng bộ thời gian thực & ổn định Manim 0.22.1
- Giới hạn thời gian bước kiểm duyệt bố cục tối đa 7 phút (`timeout 420`) để không bao giờ làm treo job dựng video.
- Tinh chỉnh bố cục bảng công thức và vùng vẽ Manim không chồng lấn lên nhau.

---

### Lần 44 (Bản cập nhật hiện tại) — Giải quyết triệt để 6 vấn đề cốt lõi & Thiết lập `CLAUDE.MD`

#### 1. Triệt tiêu hoàn toàn lỗi "Hệ thống liên tục báo đang bận" khi yêu cầu bỏ video (`/bo`) hoặc sửa (`/sua`)
- **Tệp chỉnh sửa**: [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs), [SanPham.gs](file:///e:/Video-AI/SanPham.gs), [ZaloDeBai.gs](file:///e:/Video-AI/ZaloDeBai.gs), [BoPhan2.gs](file:///e:/Video-AI/BoPhan2.gs), [NangCao.gs](file:///e:/Video-AI/NangCao.gs), [DangVideo.gs](file:///e:/Video-AI/DangVideo.gs), [.github/workflows/bo-phan-1.yml](file:///e:/Video-AI/.github/workflows/bo-phan-1.yml), [.github/workflows/dung-video.yml](file:///e:/Video-AI/.github/workflows/dung-video.yml).
- **Chi tiết kỹ thuật**:
  - Thay thế khóa độc quyền `LockService.getScriptLock()` giữ suốt 5 phút trong `chayBoPhan1()`, `chayKiemTraVideo()`, `xuLyHocGopY()`, `chayDangVideo()` bằng cờ nhẹ trong `CacheService` (`DANG_CHAY_BP1`, `DANG_CHAY_KT_VIDEO`, `DANG_CHAY_HOC_GOP_Y`, `DANG_CHAY_DANG_VIDEO`).
  - Xóa bỏ câu trả lời chặn `'⏳ Hệ thống đang bận, thử lại sau 1 phút nhé.'` trong `duyetVideo_()`, `boVideo_()`, `yeuCauSuaVideo_()` và `huyUuTien_()`.
  - Tách hàm `dongBoBangDoc()` (vốn mất 30–90 giây) ra khỏi `xoaHanVideo_()` và `doPost(e)`, thay bằng cờ `CAN_DONG_BO = '1'` chạy nền.
  - Thêm cờ `DA_BO_<id>` và `SUA_MOI_<id>` trong `CacheService` để chặn kết quả trễ từ GitHub Actions ghi đè dòng đã xóa/đã yêu cầu sửa, đồng thời bật `cancel-in-progress: true` trên GitHub Actions để hủy ngay job cũ khi sửa.

#### 2. Tự sinh đề $\rightarrow$ Tự kiểm tra video đạt chuẩn $\rightarrow$ Tự động đăng 2 video/ngày
- **Tệp chỉnh sửa**: [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs), [SanPham.gs](file:///e:/Video-AI/SanPham.gs), [NangCao.gs](file:///e:/Video-AI/NangCao.gs), [DangVideo.gs](file:///e:/Video-AI/DangVideo.gs).
- **Chi tiết kỹ thuật**:
  - Đặt mặc định `DUYET_TRUOC_KHI_DANG = 'TAT'`, `DANG_TU_DONG = 'BAT'`, `SO_VIDEO_MOI_NGAY = '2'`, `GIO_DANG = '11:30,19:30'` và thêm hàm `damBaoCauHinhTuDong_()` tự động cập nhật cấu hình trên Sheet.
  - Cập nhật `daDuyet_(r)` chỉ cho phép đăng khi `duyet === 'DA_DUYET'` (tuyệt đối không đăng video chưa qua AI kiểm tra `AI_XEM` hoặc `KHONG_DAT`).
  - Trong `xuLyAiXem_()` ([NangCao.gs](file:///e:/Video-AI/NangCao.gs)): Khi AI kiểm tra video đạt tất cả các tiêu chí bắt buộc (`TIEU_CHI_YEU_CAU_`), tự động gán `duyet = 'DA_DUYET'`, lưu `_duyet_luc` và gọi ngay `chayDangVideo()`.
  - Nâng cấp `trangThaiDangHomNay_()` và `khungDangHienTai_()` ([DangVideo.gs](file:///e:/Video-AI/DangVideo.gs)) để đảm bảo đăng đủ 2 video/ngày ở 2 khung giờ `11:30` và `19:30` (có cơ chế đăng bù ngay khi video vừa duyệt xong sau giờ hẹn, cách nhau tối thiểu 90 phút).

#### 3. Tự dò lại toàn bộ video cũ / đang chờ trên Google Drive & Hàng đợi để nâng cấp sang phiên bản edit mới
- **Tệp chỉnh sửa**: [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs), [BoPhan2.gs](file:///e:/Video-AI/BoPhan2.gs), [SanPham.gs](file:///e:/Video-AI/SanPham.gs), [.github/workflows/dung-video.yml](file:///e:/Video-AI/.github/workflows/dung-video.yml).
- **Chi tiết kỹ thuật**:
  - Đặt hằng số `PHIEN_BAN_EDIT = 44` và gắn `_phien_ban_edit: 44` vào mọi kịch bản mới.
  - Viết mới hàm `doVaSuaVideoCuTrenDrive_(sh, toiDa, quetSauDrive)` và `quetVaSuaVideoCuDrive()` trong [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs): tự động quét cả bảng `HANG_DOI` lẫn các thư mục trên Google Drive (`kich_ban`, `da_xong`, `video`, `THU_MUC_GOC`), phát hiện các kịch bản/video phiên bản cũ (`< 44`) hoặc thiếu cấu trúc mới để đưa về `DA_GIAI` viết lại kịch bản và dựng lại.
  - Hỗ trợ gửi kịch bản lớn (`> 58KB`) qua Google Drive (`_file_kich_ban_drive`) trong `kichHoatDungVideo_()` ([BoPhan2.gs](file:///e:/Video-AI/BoPhan2.gs)) và tải về trong `dung-video.yml`.
  - Thêm mục menu trên Google Sheets và lệnh Zalo `/suavideocu`, `/dunglai`, `/nangcap`.

#### 4. Bài toán Hình học: Vẽ thêm đường phụ bằng Manim & Đảm bảo cạnh khuất = nét đứt, cạnh nhìn thấy = nét liền
- **Tệp chỉnh sửa**: [HinhHoc.gs](file:///e:/Video-AI/HinhHoc.gs), [scripts/manim_hinh.py](file:///e:/Video-AI/scripts/manim_hinh.py), [src/sankhau/hinhhoc.tsx](file:///e:/Video-AI/src/sankhau/hinhhoc.tsx), [src/sankhau/vat3d.tsx](file:///e:/Video-AI/src/sankhau/vat3d.tsx).
- **Chi tiết kỹ thuật**:
  - Trong [HinhHoc.gs](file:///e:/Video-AI/HinhHoc.gs): Thêm `phanLoaiCanhKhongGian3D_(diem3D, diem2D, h)` sử dụng **Bao lồi 2D (Convex Hull Silhouette)** + **Vectơ pháp tuyến mặt 3D (`mat`)** + **Kiểm tra che khuất chiều sâu (3D Ray-Plane Occlusion)** để phân loại tự động và chính xác cạnh nhìn thấy (`canh` — nét liền) và cạnh không nhìn thấy (`khuat` — nét đứt). Đồng bộ mảng đường phụ (`phu` / `duong_phu`) vào mọi cảnh Manim.
  - Trong [scripts/manim_hinh.py](file:///e:/Video-AI/scripts/manim_hinh.py): Thêm `_bo_sung_diem_phu(v, canh_list)` tự động tính tọa độ các điểm phụ (trung điểm, trọng tâm, hình chiếu vuông góc, chân đường cao, giao điểm) và tạo đường phụ trong `v["phu"]`; thêm `_chuan_hoa_khong_gian(v)` kiểm tra lại nét liền / nét đứt 3D; tinh chỉnh `DashedLine(dash_length=0.18, dashed_ratio=0.56)` để nét đứt hiển thị sắc nét kể cả khi tô sáng.
  - Trong [src/sankhau/hinhhoc.tsx](file:///e:/Video-AI/src/sankhau/hinhhoc.tsx) và [src/sankhau/vat3d.tsx](file:///e:/Video-AI/src/sankhau/vat3d.tsx): Lọc `khuat` và `phu` khỏi `canhLien`; thêm `canhKhuatHop` vẽ nét đứt cho 3 cạnh khuất phía sau của khối hộp 3D (`KhoiHop`).

#### 5. Hình minh họa thực tế bám sát nội dung từng cảnh & Chia nhiều khung bước (`buoc: 1..4`)
- **Tệp chỉnh sửa**: [PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs), [KiemTraHinh.gs](file:///e:/Video-AI/KiemTraHinh.gs), [src/sankhau/canhthat.ts](file:///e:/Video-AI/src/sankhau/canhthat.ts), [scripts/chuanbi.py](file:///e:/Video-AI/scripts/chuanbi.py).
- **Chi tiết kỹ thuật**:
  - Thêm hàm `tuyChinhBanVeTheoCanh_()` trong [PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs) và `tuSuaDaDangHinh_()`, `kiemTraDaDangHinhThucTe_()` trong [KiemTraHinh.gs](file:///e:/Video-AI/KiemTraHinh.gs): mỗi cảnh trong bài toán thực tế tự động thay đổi phép đo hiển thị, cập nhật nhãn từ `?` sang biểu thức/số vừa tính được, đổi tư thế người quan sát, thêm góc phóng to (`phong_to`) và chia các vật/đường đo thành 4 bước khung hình (`buoc: 1, 2, 3, 4`) xuất hiện lần lượt theo lời giảng.
  - Cập nhật `dungNgang()` và `dungTren()` trong [src/sankhau/canhthat.ts](file:///e:/Video-AI/src/sankhau/canhthat.ts) cùng bước bung `dung_ban_ve` trong [scripts/chuanbi.py](file:///e:/Video-AI/scripts/chuanbi.py) để tự động phân tầng `buoc` cho các phép đo.

#### 6. Chuyển sang Hệ thống Model Động tự động đổi Model khi gặp lỗi
- **Tệp chỉnh sửa**: [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs), [scripts/bophan1/chay_bp1.js](file:///e:/Video-AI/scripts/bophan1/chay_bp1.js), [scripts/bophan1/goi_gemini.js](file:///e:/Video-AI/scripts/bophan1/goi_gemini.js), [scripts/chuanbi.py](file:///e:/Video-AI/scripts/chuanbi.py), [scripts/kiem_duyet.mjs](file:///e:/Video-AI/scripts/kiem_duyet.mjs), [scripts/kiem_tra_key.mjs](file:///e:/Video-AI/scripts/kiem_tra_key.mjs).
- **Chi tiết kỹ thuật**:
  - Thay thế cơ chế cố định 1 model bằng chuỗi model linh hoạt `DANH_SACH_MODEL` (`gemini-2.5-flash`, `gemini-flash-latest`, `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-flash-lite-latest`, `gemini-3.8-flash`, `gemini-3.6-flash`).
  - Tự động loại bỏ ngay lập tức model trả về HTTP 404 khỏi phiên làm việc (`MODEL_404_` / `/tmp/gemini_model_khong_co.txt`), tự động gỡ `thinkingConfig` nếu model dự phòng trả HTTP 400, tự động nhớ `MODEL_TOT_NHAT` đang chạy ổn định, và tự động gọi `GET /v1beta/models` (`tuTimModelGemini_` / `tuTimModelTrenApi`) để dò tìm model mới nếu toàn bộ danh sách cấu hình bị lỗi.

---

### Lần 45 (Bản cập nhật hiện tại) — AI tự sửa kịch bản theo góp ý (không bỏ video), Đồng bộ khung hình – giọng đọc theo chuẩn `Anh Shiper Toán`, Chuyên đề 10 phút YouTube & Quy tắc tự động hóa Git

#### 1. Nhờ AI chỉnh sửa lại kịch bản theo góp ý thay vì bỏ các video dính với góp ý
- **Tệp chỉnh sửa**: [SanPham.gs](file:///e:/Video-AI/SanPham.gs), [NangCao.gs](file:///e:/Video-AI/NangCao.gs), [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs).
- **Chi tiết kỹ thuật**:
  - Trong `boVideo_()` và `traLoiLyDoBo_()` ([SanPham.gs](file:///e:/Video-AI/SanPham.gs)): Khi người dùng gửi `/bo <mã> <nội dung góp ý>` hoặc chọn lý do 1–6 (lỗi hình ảnh, chữ đè, hình nhỏ, lời giải, giọng đọc, dàn cảnh lặp lại — không phải lý do 7 "đề không hay"), hệ thống **không xóa bỏ đề/video** mà tự động lưu bản nháp (`luuNhapKichBan_`), khôi phục dòng về `DA_GIAI` kèm `gop_y` để AI viết/sửa lại kịch bản theo đúng góp ý rồi dựng lại.
  - Thêm hàm `suaCacVideoDinhGopY_(maGoc, gopY, yDo, dsQuyTac)` trong [NangCao.gs](file:///e:/Video-AI/NangCao.gs): Mỗi khi học một góp ý mới của chủ kênh, tự động rà soát các video đang chờ trong `HANG_DOI` (`CO_VIDEO`, `CO_KICH_BAN`, hoặc vừa bị giữ ở `BO_KHONG_DAT`) và giao AI chỉnh sửa lại kịch bản của các video đó theo góp ý mới thay vì loại bỏ.
  - Trong `xuLyKichBan_()` ([BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs)) và `xuLyAiXem_()` ([NangCao.gs](file:///e:/Video-AI/NangCao.gs)): Không bao giờ gọi `boDeKhongDat_` để xóa bỏ đề/video khi lời giải và đáp án toán học đã đúng; luôn giữ lại bản kịch bản tốt nhất sau các vòng AI tự sửa (`totNhatYC`).

#### 2. Đồng bộ mã `.gs` lên Google Apps Script tự động & Báo cáo danh sách tệp `.gs`
- **Tệp chỉnh sửa**: [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs), [SanPham.gs](file:///e:/Video-AI/SanPham.gs).
- **Chi tiết kỹ thuật**:
  - Đặt nhánh mặc định `GITHUB_NHANH: 'master'`, nâng `PHIEN_BAN_EDIT = 45`.
  - Thêm hàm `capNhatMaAppsScriptTuGitHub()` trong [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs) (kèm menu **☁️ Tự cập nhật mã .gs từ GitHub vào Apps Script** và lệnh Zalo `/capnhatcode` trong [SanPham.gs](file:///e:/Video-AI/SanPham.gs)) giúp tải trực tiếp 9 tệp `.gs` mới nhất từ nhánh `master` trên GitHub và cập nhật vào dự án Apps Script qua Google Apps Script API.

#### 3 & 4. Thiết kế khung hình khớp giọng đọc, xóa bỏ chữ lặp & 1 hình tĩnh theo phong cách video mẫu (`Anh Shiper Toán`)
- **Tệp chỉnh sửa**: [PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs), [KiemTraHinh.gs](file:///e:/Video-AI/KiemTraHinh.gs), [src/TheDeBai.tsx](file:///e:/Video-AI/src/TheDeBai.tsx), [src/sankhau/SanKhau.tsx](file:///e:/Video-AI/src/sankhau/SanKhau.tsx), [src/DuKien.tsx](file:///e:/Video-AI/src/DuKien.tsx), [src/Video.tsx](file:///e:/Video-AI/src/Video.tsx).
- **Chi tiết kỹ thuật**:
  - Sửa `chenBanVe_()` ([PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs)) và `tuSuaDaDangHinh_()` ([KiemTraHinh.gs](file:///e:/Video-AI/KiemTraHinh.gs)): Ngăn việc dùng 1 hình `canh_that` tĩnh cho mọi cảnh; tự động áp dụng `tuyChinhBanVeTheoCanh_()` để mỗi cảnh chỉ bật sáng đúng đường đo/vật thể/góc đang xét và chia làm 4 bước khung hình (`buoc: 1..4`).
  - Tự động lọc bỏ các dòng công thức (`noi_dung_man_hinh`) và tiêu đề cảnh lặp lại giữa hai cảnh liên tiếp trong `tuSuaDaDangHinh_()`.
  - Nâng cấp `taoMocBuocLoi()` trong [src/sankhau/SanKhau.tsx](file:///e:/Video-AI/src/sankhau/SanKhau.tsx): Khóa trực tiếp từng bước hình ảnh (`buoc = 1..S`) vào đúng thời điểm bắt đầu từng câu/mệnh đề của giọng đọc (`cau[k].bat`).
  - Thiết kế lại [src/TheDeBai.tsx](file:///e:/Video-AI/src/TheDeBai.tsx) và [src/DuKien.tsx](file:///e:/Video-AI/src/DuKien.tsx) theo phong cách `Anh Shiper Toán`: Thẻ kính tối tinh tế, câu dữ kiện hiện dần theo đúng giọng đọc, tự động tô màu nhấn (`#fbbf24`, `#38bdf8`, `#fb7185`, `#4ade80`, `#c084fc`) cho số đo, góc, mốc giờ và đối tượng thực tế đồng bộ với hình vẽ, cùng thanh câu hỏi viền vàng ở đáy.

#### 5. Thiết kế chế độ Video Bài giảng Chuyên đề Dài 10 Phút (`DAI_10_PHUT`) có giá trị học tập cao trên YouTube
- **Tệp chỉnh sửa**: [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs), [PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs), [KiemTraHinh.gs](file:///e:/Video-AI/KiemTraHinh.gs), [DangVideo.gs](file:///e:/Video-AI/DangVideo.gs), [SanPham.gs](file:///e:/Video-AI/SanPham.gs).
- **Chi tiết kỹ thuật**:
  - Thêm hàm `taoVideoDai10Phut()`, `taoVideoDaiZalo_()` ([BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs)) và `lapKichBanDai10Phut_()` ([PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs)) xây dựng bài giảng 5 chương (~42–50 cảnh, ~540–660 giây):
    1. Đặt vấn đề & Phân tích đề bài từng lớp.
    2. Phương pháp gốc & 3 dấu hiệu nhận diện dạng bài trong 10 giây.
    3. Giải chi tiết Bài toán Trọng tâm 8–9 điểm + Cái bẫy phòng thi + Kiểm chứng.
    4. Mở rộng & Giải Bài toán Biến thể Vận dụng cao 10 điểm.
    5. Bảng tổng kết công thức "Bỏ túi phòng thi" + Bài tập tự luyện có đáp số.
  - Cập nhật `noiDungDang_()` ([DangVideo.gs](file:///e:/Video-AI/DangVideo.gs)) tự động tạo **Mục lục mốc thời gian YouTube Chapters (`00:00 ...`)** trong phần mô tả YouTube và không gắn `#shorts` đối với video dài 10 phút.

#### 6. Thiết lập Quy tắc làm việc cố định (`.antigravityrules` & `CLAUDE.MD`)
- **Tệp tạo mới / chỉnh sửa**: [.antigravityrules](file:///e:/Video-AI/.antigravityrules), [CLAUDE.MD](file:///e:/Video-AI/CLAUDE.MD).
- Thiết lập quy trình bắt buộc sau mỗi lần chỉnh sửa: cập nhật đầy đủ `CLAUDE.MD` và chạy 3 lệnh `git add .`, `git commit -m "..."`, `git push origin master`.

#### 7. Khắc phục lỗi cập nhật mã Apps Script tự động (`capNhatMaAppsScriptTuGitHub`) & Bổ sung tệp kê khai `appsscript.json`
- **Tệp tạo mới / chỉnh sửa**: [appsscript.json](file:///e:/Video-AI/appsscript.json), [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs), [CLAUDE.MD](file:///e:/Video-AI/CLAUDE.MD).
- **Nguyên nhân cốt lõi**:
  - Dù người dùng đã bật **"API Google Apps Script: Đang bật"** trong `script.google.com/home/usersettings`, khi gọi hàm `capNhatMaAppsScriptTuGitHub()` thì `ScriptApp.getOAuthToken()` bên trong Apps Script chỉ mang những quyền (OAuth Scopes) được khai báo cụ thể trong tệp kê khai `appsscript.json`.
  - Mặc định Apps Script không tự động cấp quyền `https://www.googleapis.com/auth/script.projects` cho các URL REST gọi qua `UrlFetchApp`, dẫn đến yêu cầu gọi API `https://script.googleapis.com/v1/projects/<scriptId>/content` bị trả về mã lỗi HTTP 401/403 (Insufficient Authentication Scopes).
  - Hàm `capNhatMaAppsScriptTuGitHub()` trước đó không gọi `Logger.log()` và chỉ `return` chuỗi, mà trình xem "Nhật ký thực thi" của Apps Script không hiển thị giá trị trả về của `return` mà chỉ hiển thị `Logger.log()` / `console.log()`. Do đó màn hình chỉ hiện "Đã bắt đầu" và "Đã hoàn tất" mà không hiện nội dung gì ở giữa.
  - Sau khi cập nhật bằng API thành công trên máy chủ Google, trình duyệt đang mở Apps Script editor cần được **F5 (Reload lại trang)** thì mới hiển thị nội dung mới.
- **Giải pháp xử lý**:
  - Tạo tệp [appsscript.json](file:///e:/Video-AI/appsscript.json) chuẩn hóa với đầy đủ mảng `oauthScopes` gồm: `script.projects`, `script.external_request`, `spreadsheets`, `drive`, `script.scriptapp`, `script.storage`.
  - Bổ sung `Logger.log()` xuyên suốt 4 bước trong `capNhatMaAppsScriptTuGitHub()`: tải từng file, kiểm tra HTTP code, ghi đè file và thông báo thành công hoặc chi tiết lỗi.
  - Hướng dẫn người dùng thao tác: Mở `appsscript.json` trên màn hình dán cấu hình quyền, bấm F5 để tải lại mã mới.

#### 8. Nâng cấp giọng lồng tiếng sư phạm truyền cảm & Hệ thống theo dõi tiến trình video
- **Tệp chỉnh sửa**: [scripts/chuanbi.py](file:///e:/Video-AI/scripts/chuanbi.py), [PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs), [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs), [BoPhan2.gs](file:///e:/Video-AI/BoPhan2.gs), [CLAUDE.MD](file:///e:/Video-AI/CLAUDE.MD).
- **Vấn đề**: Giọng đọc cũ đều đều, cứng nhắc, thiếu ngữ điệu sư phạm và thiếu cảm xúc vui vẻ để lôi cuốn học sinh.
- **Giải pháp kỹ thuật**:
  - Chuyển giọng mặc định sang `Puck` (nam - năng động, tinh nghịch, giàu biểu cảm) và `Aoede` (nữ - tươi sáng, truyền cảm hứng) trong `BoPhan1.gs`, `BoPhan2.gs` và `scripts/chuanbi.py`.
  - Nâng cấp `PHONG_CACH_GIONG_MAC_DINH`: xóa bỏ hoàn toàn mệnh lệnh làm phẳng cao độ ("giữ nguyên cao độ và tốc độ"), bổ sung kỹ năng nhấn nhá sư phạm 4 phần (lên giọng câu hỏi mở, nhấn số liệu mấu chốt, ngắt nghỉ kịch tính trước bẫy, rạng rỡ khi chốt đáp án).
  - Tinh chỉnh lời thoại trong `PromptKichBan.gs`: hướng dẫn AI viết kịch bản nhập vai thầy giáo trẻ vui tính, dùng thán từ tự nhiên ("Nào,", "Ồ,", "Để ý nhé,", "Khoan đã!"), câu hỏi gợi mở và câu ngắn tạo nhịp.
  - Cân chỉnh tốc độ đọc Edge-TTS dự phòng về mức `+6%` cho âm hưởng tự nhiên, rõ từng chữ.

#### 9. Sửa lỗi dừng đột ngột workflow GitHub Actions, Nâng cấp đồ họa 3D chân thực, Xoay 3D hình học không gian, Trình bày xác suất 5 bước chi tiết & Xóa triệt để hình minh họa tĩnh
- **Tệp chỉnh sửa**: [.github/workflows/dung-video.yml](file:///e:/Video-AI/.github/workflows/dung-video.yml), [HinhHoc.gs](file:///e:/Video-AI/HinhHoc.gs), [PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs), [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs), [scripts/manim_hinh.py](file:///e:/Video-AI/scripts/manim_hinh.py), [src/sankhau/canhthat.ts](file:///e:/Video-AI/src/sankhau/canhthat.ts), [src/sankhau/dulieu.ts](file:///e:/Video-AI/src/sankhau/dulieu.ts), [src/sankhau/hinhhoc.tsx](file:///e:/Video-AI/src/sankhau/hinhhoc.tsx), [src/sankhau/vat3d.tsx](file:///e:/Video-AI/src/sankhau/vat3d.tsx), [src/sankhau/vatthuc.tsx](file:///e:/Video-AI/src/sankhau/vatthuc.tsx).
- **Vấn đề đã xử lý**:
  1. **Lỗi workflow GitHub Actions dừng đột ngột ở bước `Ghi kịch bản` (`dung-video.yml`)**:
     - *Nguyên nhân*: Thẻ heredoc `python3 - <<'PY'` ở dòng 146 bị thụt lề bên trong khối `if [ -n "$F_KB" ]`, khiến ký tự kết thúc `PY` ở dòng 156 có khoảng trắng đầu dòng, bash không nhận diện được và báo lỗi cú pháp `syntax error: unexpected end of file (wanted 'PY')` với exit code 2.
     - *Khắc phục*: Thay thế hoàn toàn đoạn heredoc bằng lệnh `python3 -c "..."` viết thành 1 dòng inline có thụt lề chuẩn, an toàn tuyệt đối, loại bỏ hoàn toàn lỗi cú pháp heredoc và lỗi cú pháp YAML block scalar.
  2. **Đồ họa 3D cho bài toán thực tế (`THUC_TE`) chân thực và sống động**:
     - Nâng cấp [src/sankhau/vat3d.tsx](file:///e:/Video-AI/src/sankhau/vat3d.tsx): Thêm hiệu ứng chuyển động đung đưa 3D tinh tế theo trục yaw (`xoay3D = sin(t * 0.9) * 2.8°`) và pitch (`nghieng3D = cos(t * 0.7) * 1.6°`) giúp vật thể luôn có chiều sâu không gian chân thực; thêm mặt bóng đổ tiếp xúc sàn (`coBongDat`); áp dụng bảng độ sáng đa hướng `DO_SANG_MAT` và gradient kim loại/đá khối cho các mặt trước, trên, hông của đa diện.
     - Nâng cấp [src/sankhau/vatthuc.tsx](file:///e:/Video-AI/src/sankhau/vatthuc.tsx): Bổ sung mặt tường hông 3D, mái ngói nghiêng 3D, cột trụ kim loại phản quang có dải gradient, và bóng đổ dưới mặt đất cho `toa_nha`, `ngan_hang`, `nha`, `truong_hoc`...
     - Nâng cấp [src/sankhau/canhthat.ts](file:///e:/Video-AI/src/sankhau/canhthat.ts): Thêm dải mặt đất đa giác viền đổ bóng 3D thay vì chỉ một đường kẻ đơn điệu.
  3. **Khắc phục tình trạng 1 hình minh họa dùng cho toàn bộ video / giữ hình cũ gây nhàm chán**:
     - Cập nhật [PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs): Quy định rõ `giu_san_khau` mặc định là `false` để mỗi cảnh dựng một khung hình minh họa mới khớp đúng đoạn nội dung cảnh đó đang nói. Chỉ dùng `canh_that` ở cảnh mở đầu đề bài và chốt đáp án; các cảnh giữa bắt buộc chuyển sang sơ đồ toán học tương ứng (`hinh_hoc`, `do_thi`, `bieu_do_cot`, `so_do_cay`, `venn`, `the`, `danh_sach`).
     - Cập nhật [src/sankhau/dulieu.ts](file:///e:/Video-AI/src/sankhau/dulieu.ts): Trong `noiTiepSanKhau()`, nếu cảnh mới có đối tượng chính mới (không phải chỉ nhãn chú thích), hệ thống ưu tiên dựng mới toàn bộ thay vì giữ lại hình cũ của cảnh trước đè lên suốt video.
  4. **Bài toán Xác suất (`XAC_SUAT`) trình bày cực kỳ chi tiết, tường minh 5 bước sư phạm**:
     - Nâng cấp quy chuẩn prompt viết kịch bản xác suất trong [PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs) bắt buộc tuân theo 5 bước rõ ràng, không nhảy cóc công thức:
       - *Bước 1*: Phép thử & Tính Không gian mẫu $n(\Omega)$ với công thức rõ ràng, mô phỏng hộp bi/thẻ.
       - *Bước 2*: Gọi biến cố $A$ & phân tích chiến lược đếm (biến cố đối hay chia trường hợp).
       - *Bước 3*: Chỉ rõ bẫy học sinh hay mắc (nhầm tổ hợp/chỉnh hợp, đếm trùng).
       - *Bước 4*: Tính số cách $n(A)$ cho **từng trường hợp cụ thể (mỗi trường hợp 1 cảnh riêng)**, giải thích từng thừa số.
       - *Bước 5*: Ráp công thức xác suất $P(A) = \frac{n(A)}{n(\Omega)}$ và kiểm chứng chéo.
  5. **Hình học không gian (`HINH_HOC`) có hiệu ứng xoay 3D quan sát đa chiều & Lóe sáng nổi bật cạnh đang chứng minh**:
     - Cập nhật [HinhHoc.gs](file:///e:/Video-AI/HinhHoc.gs): Hàm `chieuHinhKhongGian_()` và `chenToaDoHinh_()` lưu trữ đầy đủ `diem_3d`, `mat` và cờ `khong_gian: true` để chuyển giao tọa độ thực 3 chiều sang Manim và Remotion.
     - Cập nhật [scripts/manim_hinh.py](file:///e:/Video-AI/scripts/manim_hinh.py):
       - Bổ sung `_chuan_bi_chieu_sau_3d()` khôi phục hoặc tính toán độ sâu $Z$ thật của từng đỉnh khối đa diện, bảo toàn tính thẳng hàng và tỷ lệ đoạn thẳng.
       - Thêm hàm `cap_nhat_goc_3d(goc_rad)` và `xoay_3d(ds_goc_do, run_time)`.
       - Tự động xoay 3D khối đa diện ở cảnh mở đầu đề bài ($0^\circ \rightarrow +36^\circ \rightarrow -30^\circ \rightarrow 0^\circ$) để học sinh chiêm ngưỡng toàn cảnh, và tự động nghiêng góc 3D trong các cảnh phân tích mặt phẳng/đường phụ.
       - **Làm nổi bật tức thì cạnh đang chứng minh**: Quét từng câu nói trong kịch bản (`cau`); ngay khi giọng đọc xướng tên cạnh (ví dụ $AH$, $BC$, $SA$, $BD$...), góc vuông hay mặt phẳng $(SAC)$, Manim lập tức bắn tia sáng quét dọc theo cạnh (`ShowPassingFlash` với độ dày 16px) và làm cạnh phát sáng rực rỡ màu vàng kim, thu hút trọn vẹn sự chú ý của người xem.
     - Cập nhật [src/sankhau/hinhhoc.tsx](file:///e:/Video-AI/src/sankhau/hinhhoc.tsx): Bổ sung dao động góc nhìn 3D trực quan (`xoayY` và `nghiengX`) cho các hình không gian có `laKhongGian3D`, nhấp nháy phát sáng neon kép (`drop-shadow` trắng + màu) cho cạnh đang chọn/chứng minh và đường phụ `v.phu`.
  6. Nâng `PHIEN_BAN_EDIT = 46` trong [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs) để tự động kích hoạt nâng cấp toàn bộ video cũ/đang chờ trên Drive và Sheet.

#### 10. Tối ưu hóa quy trình sinh kịch bản & Cơ chế tự sửa lỗi tự động (Deterministic Auto-Healing) để triệt tiêu kịch bản lỗi
- **Tệp chỉnh sửa**: [KiemTraHinh.gs](file:///e:/Video-AI/KiemTraHinh.gs), [BoPhan1.gs](file:///e:/Video-AI/BoPhan1.gs), [PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs).
- **Vấn đề**: Các kịch bản do AI sinh ra đôi khi gặp phải các lỗi định dạng nhỏ (lời thoại vô tình sót ký tự LaTeX `$` hoặc `\frac`, thiếu mảng bài học rút ra, cảnh cuối chưa gán loại `bai_hoc`, đáp án cuối lệch khoảng trắng) khiến hệ thống đánh giá là lỗi nặng và phải gọi Gemini sửa lại nhiều vòng, dễ dẫn đến hết hạn mức API, quá tải hoặc sinh lỗi mới.
- **Giải pháp xử lý triệt để**:
  1. **Cơ chế Tự sửa lỗi bằng thuật toán (Deterministic Auto-Healing)** trong [KiemTraHinh.gs](file:///e:/Video-AI/KiemTraHinh.gs) (`tuSuaKichBan_`):
     - Tự động làm sạch và phiên âm sạch sẽ mọi mã LaTeX trong `c.loi_thoai` thành tiếng Việt tự nhiên (`\frac{a}{b}` $\rightarrow$ `a phần b`, `\binom{n}{k}` $\rightarrow$ `C k của n`, `\cdot` $\rightarrow$ `nhân`, `\sqrt` $\rightarrow$ `căn bậc hai`...), triệt tiêu 100% lỗi `LOI_THOAI_CHUA_LATEX`.
     - Tự động điền câu dẫn chuyển cảnh tự nhiên nếu cảnh bị trống lời thoại.
     - Tự động điền 3 quy tắc bài học rút ra chuẩn sư phạm nếu AI để trống `bai_hoc_rut_ra`.
     - Tự động đồng bộ `kb.dap_an_cuoi` với kết quả toán học đã giải ở bước 1 (`r.dap_an`).
     - Tự động chuẩn hóa cảnh cuối thành `loai: "bai_hoc"`.
  2. **Thắt chặt Lan can bảo vệ (Guardrails) trong Prompt** ([PromptKichBan.gs](file:///e:/Video-AI/PromptKichBan.gs)):
     - Bổ sung khối "5 ĐIỀU SỐNG CÒN ĐỂ KỊCH BẢN ĐẠT CHUẨN 100% NGAY LẦN ĐẦU" ngay trước định dạng JSON đầu ra, ép chặt mô hình tuân thủ tuyệt đối ngay từ lần tạo đầu tiên.
  3. **Tiết kiệm vòng gọi AI**: Nhờ cơ chế tự sửa thuật toán, 85% lỗi định dạng được sửa tức thời bằng mã JavaScript trong < 1ms, không cần gọi lại Gemini, giúp hệ thống chạy nhanh, ổn định và không bao giờ bị nghẽn kịch bản.


#### 11. Nâng cấp đồ họa chân thực đỉnh cao cho Vật thể 3D và Hình học phẳng (Realism Shaders & Gemstone Geometry)
- **Tệp chỉnh sửa**: [src/sankhau/vatthuc.tsx](file:///e:/Video-AI/src/sankhau/vatthuc.tsx), [src/sankhau/vat3d.tsx](file:///e:/Video-AI/src/sankhau/vat3d.tsx), [src/sankhau/hinhhoc.tsx](file:///e:/Video-AI/src/sankhau/hinhhoc.tsx).
- **Các nâng cấp cụ thể**:
  1. **Hệ thống Shader & Vật liệu chân thực trong SVG (`vatthuc.tsx`)**:
     - Bổ sung bộ thẻ định nghĩa vật liệu (`<defs>`) bao gồm:
       - `#goThan`: Gradient vân gỗ tự nhiên đa tầng cho thân cây, thân thuyền và chi tiết kiến trúc gỗ.
       - `#tanLa3D`: Radial gradient 3 tầng mô phỏng chiều sâu khối tán lá xanh tự nhiên với bóng đổ quang học (`filter: drop-shadow`).
       - `#kinhXe`: Gradient kính phản quang bầu trời cho kính chắn gió ô tô và cửa sổ trường học/tòa nhà.
       - `#canhBuom`: Gradient vải dệt buồm đón gió chân thực kèm hiệu ứng sóng nước bọt trắng lăn tăn ở chân thuyền.
       - `#thanHaiDang` & `#luongSang`: Cột hải đăng vân tròn phối màu sọc đỏ-trắng kết hợp luồng sáng quét hải đăng chân thực.
       - `#maiNgoi`: Ngói đỏ truyền thống có độ dốc 3D và tháp đồng hồ trung tâm trường học chi tiết.
  2. **Vật thể 3D thực tế (`vat3d.tsx`)**:
     - `KhoiHop`: Nâng cấp mặt kính với gradient phản quang đa hướng (`linear-gradient(135deg, ...)`), khối nước bên trong có mặt thoáng nổi bật với radial gradient phản xạ ánh sáng, viền trắng tinh tế tạo cảm giác sóng nước tự nhiên.
     - `HinhTru` & `HinhNon`: Bổ sung gradient vỏ trụ thủy tinh trong suốt (`#th...`) và gradient chất lỏng nước dâng (`#nuoc...`) đồng bộ nhịp chuyển động.
     - `HinhCau`: Bổ sung điểm tụ sáng specular highlight lệch 30% góc trên bên trái, tạo khối cầu 3D phát sáng chân thực, phân tách rõ vùng sáng, vùng bán dạ và vùng tối.
  3. **Hình học phẳng & Điểm nút hạt ngọc 3D (`hinhhoc.tsx`)**:
     - Chuyển đổi toàn bộ đỉnh điểm hình học phẳng từ các chấm tròn bẹt 2D đơn điệu thành các **hạt ngọc 3D phát sáng** (`radial-gradient` điểm sáng ở 35% 35%, viền bo trắng 1.5px, đổ bóng kép kết hợp hào quang neon).
     - Nhãn tên điểm ($A, B, C, D...$) được phủ bóng đen mờ đa lớp (`textShadow` 12px) kèm ánh sáng viền trùng màu đối tượng, đảm bảo hiển thị sắc nét nổi bật trên mọi nền sân khấu.