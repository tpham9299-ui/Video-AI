# VIDEO-AI — HƯỚNG DẪN KIẾN TRÚC & QUY TẮC LÀM VIỆC (v94)

> **Lưu ý tiết kiệm token:** Tệp này chỉ chứa quy tắc bắt buộc, bản đồ tệp và kiến trúc hiện hành (v85). Toàn bộ lịch sử nâng cấp từ v1--v85 (đã gom từ các tệp `SUA_CODE_*.md` cũ) được lưu riêng trong `CHANGELOG.md` và chỉ đọc khi người dùng yêu cầu tra cứu lịch sử.

## 1. QUY TẮC BẮT BUỘC KHI LÀM VIỆC LOCAL (`e:\Video-AI`)

1. **Ngôn ngữ:** Luôn trao đổi, giải thích ngắn gọn bằng tiếng Việt.
2. **Không tự động đẩy Git:** **Tuyệt đối không** tự chạy `git add`, `git commit` hay `git push` trừ khi người dùng yêu cầu rõ. Người dùng sẽ tự kiểm tra thay đổi và đẩy lên nhánh `master` bằng Terminal.
3. **Cập nhật tài liệu tiết kiệm:** Chỉ cập nhật `CLAUDE.md` khi có thay đổi về kiến trúc, tên tệp hoặc quy tắc cốt lõi. Nhật ký sửa lỗi chi tiết (nếu cần) chỉ ghi thêm vài dòng ngắn vào cuối `CHANGELOG.md`.
4. **Cảnh báo đồng bộ Google Apps Script:** Nếu có chỉnh sửa bất kỳ tệp `*.gs` hoặc `appsscript.json` nào, cuối câu trả lời bắt buộc liệt kê rõ danh sách tệp `.gs` đã sửa để người dùng bấm **☁️ Tự cập nhật mã .gs từ GitHub vào Apps Script** (hoặc nhắn Zalo `/capnhatcode`, hoặc chờ tự đồng bộ mỗi 30 phút).
5. **Test nhanh tại chỗ, không render nặng:** Khi sửa `src/` hoặc `scripts/`, ưu tiên kiểm tra nhanh bằng kiểm tra kiểu TypeScript, xuất 1 khung ảnh tĩnh (`.png`) hoặc chạy kịch bản mẫu thay vì render toàn bộ video MP4.

## 2. TỔNG QUAN HỆ THỐNG (v85)

**Video-AI** là dây chuyền tự động sản xuất video toán học dọc 9:16 (ngắn + chuyên đề dài 10 phút `-10P`):
`Tự sinh / Zalo gửi đề -> Giải & kiểm chứng 2 cách + JS -> Viết kịch bản sư phạm 6 phần (Auto-fix lỗi hình thức) -> Lập cảnh (Khung 4 tầng + 3D Vector / Manim) & TTS -> Kiểm duyệt bố cục & AI nhìn hình -> Dựng song song -> Kiểm tra chuyển động MP4 + Mắt thần 3×3 & AI chấm cuối -> Tự đăng (Shorts, Reels, TikTok)`.

### Kiến trúc 2 tầng

1. **Tầng điều phối (Google Apps Script + Sheets + Drive + Zalo Bot):**
   * Bảng tính chính: `HANG_DOI`, `CAU_HINH`, `BANG_DOC`, `GOP_Y_HOC`, `QUY_TAC_HOC`, `SAN_PHAM`, `SERIES`, `SO_LIEU`, `NHAT_KY`, `KHO_KEY`.
   * Giao việc qua GitHub `workflow_dispatch`, nhận kết quả qua Webhook `doPost(e)`.
   * Chống nghẽn bằng cờ nhẹ `CacheService` và khóa tái nhập `voiKhoa_` (không giữ `LockService` dài phút). Các lệnh Zalo `/bo`, `/sua`, `/duyet`, `/huy`, `/key`, `/capnhatcode`, `/donvideoloi`, `/suavideocu` phản hồi tức thời.

2. **Tầng tính toán & dựng hình (GitHub Actions — 6 Workflow theo thứ tự):**
   * `sinh-de.yml` (**BP0**): Sinh/tìm đề mới & đề 10 phút (`scripts/bophan1/sinh_de_gh.js`).
   * `bo-phan-1.yml` (**BP1**): Giải đề & kiểm chứng `MOI -> DA_GIAI` (`scripts/bophan1/chay_bp1.js`).
   * `viet-kich-ban.yml` (**BP2**): Viết, tự sửa & duyệt kịch bản `DA_GIAI -> CO_KICH_BAN`, chạy song song 5 luồng (`chay_bp1.js`).
   * `dung-video.yml` (**BP3**): Chuẩn bị TTS + cảnh (mặc định Khung 4 tầng + 3D Vector trong Remotion, bỏ qua Blender; Blender chỉ khi kịch bản không có `khung4tang`, `bo_dung=blender` hoặc input `blender=1`), kiểm duyệt bố cục (trần 7 phút), dựng khúc song song, ghép MP4, kiểm tra chuyển động, **Mắt thần 3×3** & đẩy Drive.
   * `kiem-tra-video.yml` (**BP4**): AI xem lưới ảnh + kịch bản chấm điểm (`scripts/kiem_tra_video_gh.js`).
   * `dang-video.yml` (**BP5**): Gắn số tập/bìa và đăng đa nền tảng (`scripts/dang_video.py`).
   * *(Phụ trợ)* `kiem-tra-key.yml`: Kiểm tra sức khỏe kho `GEMINI_KEYS` (`scripts/kiem_tra_key.mjs`).

## 3. BẢN ĐỒ TỆP TRỌNG TÂM

| Nhóm | Tệp chính & Vai trò |
| :--- | :--- |
| **Apps Script (`/*.gs`)** | `BoPhan1.gs` (lõi hàng đợi, model động, GDPT 2018, tự đồng bộ GitHub), `PromptKichBan.gs` (prompt 6 phần, `cau_chuyen`, bản vẽ thực tế, bài 10 phút), `KiemTraHinh.gs` (tự sửa thuật toán, kiểm tra phép tính LaTeX & vật thật), `HinhHoc.gs` (tọa độ 2D/3D, chiếu Cavalier, phân loại `canh`/`khuat`/`phu`; v94: `huongDanHinhPhangChuan_`, `kiemHinhPhangChuan_`, `capLopHinhPhang_` lớp 8/9), `BoPhan2.gs` (giao dựng video & webhook `doPost`), `NangCao.gs` (tiêu chí duyệt, học từ góp ý, series/hook), `DangVideo.gs` (lịch đăng `chayLichDangDinhKy`, `kiemTraDangSauDuyet`, giữ chỗ 2 pha), `SanPham.gs` (lệnh Zalo tức thời & quảng cáo), `ZaloDeBai.gs` (nhận đề chữ/ảnh/PDF/Word/LaTeX), `KhoKey.gs` (quản lý key), `appsscript.json` (OAuth scopes & YouTube Advanced Services). |
| **Scripts (`/scripts/`)** | `bophan1/chay_bp1.js` (chạy `.gs` trong Node `vm`), `bophan1/goi_gemini.js` (xoay vòng key, tự né 404/429, tra `ListModels`), `chuanbi.py` (chuẩn hóa đọc toán, Gemini TTS `mot_lan` + cache + fallback `edge-tts`, mốc `mocCongThuc`, tạo `public/props.json`), `canh_3d.py`, `ve_blender.py`, `tao_mo_hinh.py`, `xe_3d.py` (lập kế hoạch & dựng cảnh Blender Cycles CPU RGBA + xuất tọa độ chiếu), `manim_hinh.py` (dựng bài `HINH_HOC` Manim `0.22.1`, vẽ từng nét theo mốc từ, ghi `manimNhatKy`), `kiem_hinh_hoc.py` (kiểm tra chéo bắt buộc luồng/cảnh/điểm/quan hệ/đồng bộ trước & sau Manim), **v94 hình phẳng chuẩn:** `giai_hinh_phang.py` (cửa vào Lớp 2) + `hinh_phang/` (`hinh.py` giải phép dựng, `bo_cuc.py` lấy mẫu 48 cấu hình / co 82% / đặt nhãn, `kiem_chung.py` mệnh đề trên tọa độ + khóa màu + đồng bộ cạnh, `gdpt2018.py`, `thoi_gian.py` mốc `khi_noi`), `manim/HinhPhangChuan.py` (Lớp 3, KHÔNG thêm `__init__.py` vào `scripts/manim/` kẻo che gói `manim`), `thu_hinh_phang.py` (dựng thử + 5 ảnh mốc), `manim_thuc_te.py` (vẽ nét toán & công thức trùng tọa độ chiếu từ Blender), `thu_vien_3d/` (đặc tả cảnh v87: `schema_dac_ta.json`, `danh_muc.json`, `vat.py`, `moi_truong.py`, `khop.py`, `xep_cho.py`, `phep_thu_nhieu.py` (xác suất nhiều vật -> Three.js), `sinh/` vật AI đã ghép), `kiem_bam_de.py` (kiểm đặc tả bám đề + AI nhìn ảnh), `nang_cap_dinh_dang.py`, `thu_dac_ta.py` (dựng thử cục bộ), `kiem_duyet.mjs` (đo DOM + AI nhìn hình trước dựng), `dung_khuc.mjs`, `ghep_khuc.mjs`, `anh_kiem_tra.py`, `mat_than_3x3.py` (v91: lưới 3×3 + Gemini Flash chặn đăng khi cắt chữ/chồng chữ/LaTeX thô/lộ đáp án; v92: đo điểm ảnh tầng 2 trống / hình đứng im + logo sai chuyên mục; v93: ô 1 = khung Intro móc câu ~1,8 s, AI chỉ bắt lỗi hiển thị ở ô này), `khung4tang_v93.py` (fallback Intro/Outro + suy & kiểm đối chiếu Hình ↔ Đồ thị, gọi từ `khung_4_tang`), `dang_video.py`. |
| **Remotion (`/src/`)** | `Root.tsx` (`Video` 1080x1920 30fps, `AnhBia`), `Video.tsx`, `Intro.tsx` (intro thương hiệu, cấu hình `phong_cach.json -> intro`, nội dung lùi `props.intro.lech` khung), `AnhBia.tsx`, `Canh.tsx`, `CanhBlender.tsx`, `CanhMoiTruong.tsx`, `NenChieuSau.tsx` (nền tối chiều sâu phần giải luồng thực tế), `UngDungThucTe.tsx` (thẻ minh họa cảnh ứng dụng), `CanhThucTe.tsx`, `BinhBi.tsx`, `NenCauChuyen.tsx`, `TheDeBai.tsx`, `DuKien.tsx`, `ManKet.tsx`, `PhuDeTikTok.tsx`, `KiemDuyet.tsx`, `chu.ts` (chuẩn hóa KaTeX/tiếng Việt), `sankhau/SanKhau.tsx`, `sankhau/dulieu.ts`, `sankhau/canhthat.ts`, `sankhau/vatthuc.tsx`, `sankhau/vat3d.tsx`, `sankhau/hinhhoc.tsx`, `sankhau/hinhtudo.tsx`, `sankhau/vat.tsx`, `khung4tang/` (Khung 4 tầng: `Khung4Tang.tsx`, `kieu.ts`, `vung.ts`, `chu_tron.ts` + `ChuTron.tsx` (v92: tiêu đề/nhãn thẻ trộn KaTeX), v93: `IntroMocCau.tsx`, `OutroTomTat.tsx`, `DoiChieu.tsx` + `doi_chieu.ts` (kiểm hợp lệ), `bo_cuc_v93.ts` (hằng số vùng)...), `3d-vector/` (động cơ 3D Vector: `dac_ta.ts`, `SanKhau3DVector.tsx`, `khuon/` (v92: 8 khuôn tham số)...). |

## 4. CÁC NGUYÊN TẮC KỸ THUẬT KHÔNG ĐƯỢC PHÁ VỠ (v85)

1. **Chuẩn chương trình GDPT 2018 (cấm giải vượt lớp):**
   * **Lớp 10:** Chỉ hình phẳng (`PHANG`), không dùng đạo hàm/nguyên hàm.
   * **Lớp 11:** Tối ưu bằng tam thức bậc 2 / Cauchy / lượng giác; hình không gian tổng hợp; xác suất cộng-nhân độc lập. Cấm bảng biến thiên/$y'=0$ tìm cực trị/GTLN-GTNN, cấm tích phân, cấm tọa độ $Oxyz$, cấm Bayes/xác suất có điều kiện.
   * **Mọi lớp:** Cấm tuyệt đối số phức. Lỗi vượt lớp bị đánh 0 điểm lời giải.

2. **Phân luồng dựng hình ảnh & đồ họa (v85):**
   * **Phông chữ (v89):** MỘT họ chữ `Be Vietnam Pro` cho mọi vai trò (tiêu đề, badge, hộp, phụ đề, nhãn, Manim), phân cấp bằng độ đậm + thang `CO_CHU` (`src/theme.ts`); KaTeX dùng chung Be Vietnam (`KieuToan`), hộp danh sách một cỡ chung (`HopVua`), phụ đề hiện số/ký hiệu tách khỏi văn đọc (`hien_phu_de`); công thức qua KaTeX (đổi chữ `x` giữa hai số thành dấu nhân $\times$, giữ nguyên biến $2x, x^2$).
   * **Khóa luồng (v86):** `kb.luong` = `hinh_hoc_thuan` | `thuc_te_xac_suat` do Apps Script quyết định một lần (`xacDinhLuong_`, HinhHoc.gs) và mọi tầng sau chỉ đọc trường này; luồng hình học thuần **cấm** Blender/Three.js/`canh_that`/`mo_hinh_3d`/phong cảnh (`khoaLuongHinhHoc_`, `canh_3d.py` từ chối, `kiem_hinh_hoc.py` chặn).
   * **Hình học phẳng chuẩn (v94, MẶC ĐỊNH bài hình PHẲNG):** 3 lớp chặn. Lớp 1: AI chỉ viết `kb.hinh_phang_chuan = {cap_lop: lop_8|lop_9|thpt, dieu_kien[], de_rut_gon[], phep_dung[{id, loai, khi_noi,...}], muc_tieu{tex, to_do, menh_de}, trang_chung_minh[{tieu_de, dong[{khi_noi, tex, menh_de[], hanh_dong_hinh[]}]}]}` - CẤM tọa độ và mã Manim (`huongDanHinhPhangChuan_`). Lớp 2: `giai_hinh_phang.py` giải tọa độ, chọn cấu hình có khoảng cách điểm nhỏ nhất lớn nhất, co 82% vùng hình (y 5,05..-0,75), nhãn danh sách trắng, tự bổ sung cạnh, khóa màu `\mvang \mdo \mngoc \mcam \mla` ↔ hình, kiểm MỌI mệnh đề (khai báo + đọc từ LaTeX) trên mọi cấu hình; lỗi cứng `HP_VUOT_CHUONG_TRINH|HP_MENH_DE_SAI|HP_DONG_DANG_SAI_THU_TU|HP_DUNG_LOI|HP_DIEM_KHONG_TON_TAI|HP_THIEU_DAC_TA` (kèm gợi ý; BP2 gọi qua `kiemHinhPhangMay_` của `chay_bp1.js`). GDPT 2018 THCS: lỗi cứng "cung chứa góc", "cùng nhìn cạnh dưới góc", vectơ/tích vô hướng, định lý sin/cosin, phương tích (bắt đúng cụm, không chặn sin/cos/tan của tỉ số lượng giác lớp 9); ⚠ góc tiếp tuyến–dây, góc đỉnh trong/ngoài, góc ngoài tứ giác chỉ cảnh báo. Bản JS `kiemGdpt2018_` (KiemTraHinh.gs) phải khớp `gdpt2018.py` (test so khớp). Lớp 3: `chuanbi.py` -> `props.boCuc='hinh_phang'` + `hinhPhang.moc` (bỏ intro thương hiệu), Manim vẽ header + đề + hình + trang (≤ 5 dòng, lật trang fade sạch) trên nền `#121214` của `Video.tsx NoiDungHinhPhang` (chỉ giọng/nhạc/màn kết). Lớp 8/9 không đổi `chuanLop_`; sinh đề lớp 9: CAU_HINH `LOP_HINH_PHANG=9`. Tắt: CAU_HINH / env `HINH_PHANG_CHUAN=TAT`. Hình KHÔNG GIAN và kịch bản cũ vẫn chạy `manim_hinh.py`. Không đụng `Khung4Tang` / `SanKhau3DVector`.
   * **Hình học (`HINH_HOC`):** Bắt buộc dựng bằng **Manim (`0.22.1`)** nền trong suốt phủ lên Remotion; bảo toàn quy tắc 3D (`canh` nét liền, `khuat` nét đứt, `phu` đường phụ); lỗi cài/dựng Manim hoặc `kiem_hinh_hoc.py` không đạt phải dừng workflow. Giọng đọc bài hình học dùng edge-tts `WordBoundary` (mốc từng từ thật); mỗi cảnh khai báo `buoc_ve: [{ve, khi_noi}]` để nét vẽ khớp đúng lời đọc.
   * **Thực tế & Xác suất (`THUC_TE`, `XAC_SUAT`):**
     * Xe chạy trên đường hoặc phép thử bi/xu/xúc xắc hỗ trợ $\rightarrow$ ghi `moiTruong` và dựng toàn khung bằng **Three.js** (SwiftShader trong Chromium).
     * Vật thể thực tế / `mo_hinh_3d.chi_tiet` / `khoi_tiet_dien.tang` / lưới tam giác tự do $\rightarrow$ **Blender Cycles CPU** (`canh_3d.py`) chỉ dựng phần mở đầu (pha `thuc`) $\rightarrow$ cảnh `de_bai` (pha `chuyen`) đẩy máy + nhòe ảnh thật để lấy nét sang hình 2D $\rightarrow$ pha `toan`: Remotion (sân khấu + KaTeX), riêng hình khối hộp/trụ/nón/cầu do **Manim (`manim_thuc_te.py`)** vẽ.
     * **Đặc tả cảnh (v87):** cảnh mở đầu dựng từ `kb.dac_ta_canh` (ngữ nghĩa, không tọa độ) -> `kiem_bam_de.py` -> `thu_vien_3d/xep_cho.py` -> Blender; vật mới qua `--tu-tao` (AI ghép bộ phận, lưu `sinh/`). Thêm mẫu vật/bối cảnh: sửa `danh_muc.json` + hàm dựng + `DANH_MUC_3D_` (PromptKichBan.gs). Blender ghim 5.3.0.
     * **Góc máy & hành động (v88):** `quay[]` từng cảnh -> `props.quay` (mốc `khi_noi`, `chuanbi.py`) -> mỗi cảnh mở đầu/đề một kế hoạch Blender riêng + `props.nhipQuay` (`CanhBlender.tsx` chạy hành động đúng mốc). Bài xác suất mà vật chính đều là đồ chơi xác suất -> `moiTruong {loai:'dac_ta'}` dựng toàn bộ bằng Three.js (`CanhMoiTruong.tsx`, nhiều vật + `boi_canh`), không cần Blender.
     * **Khung 4 tầng + 3D Vector (v91, MẶC ĐỊNH luồng thực tế & xác suất):** `PromptKichBan.gs` (`huongDanKhung4Tang_`, `dungKhung4Tang_`, CAU_HINH `BO_DUNG_MAC_DINH=3d_vector|blender`) dạy AI viết `kb.khung4tang` = `{de_ghim, buoc[{khi_noi, nhan, tieu_de, mau, du_kien, the}], canh_3d_vector}` (mốc theo lời `khi_noi`, không ghi giây) -> `tuSuaKhung4Tang_` (KiemTraHinh.gs) chuẩn hóa, ghi `kb.bo_dung` -> `chuanbi.py khung_4_tang` đổi `khi_noi` thành giây -> `props.boCuc='4tang'` + `props.khung4tang` -> `Video.tsx` (`NoiDung4Tang`) giữ vỏ chung (ảnh bìa, intro, giọng từng cảnh, nhạc, màn kết). Bài 10 phút và luồng hình học thuần không dùng (khóa luồng gỡ `khung4tang`/`canh_3d_vector`/`bo_dung`). Oxyz chỉ lớp 12.
     * **8 khuôn 3D tham số (v92, BẮT BUỘC):** `canh_3d_vector = {khuon, tham_so, pha[{ten, khi_noi}]}` với `khuon` ∈ `tam_bia_gap_hop | tru_non_toi_uu | luoi_the_bi_xac_suat | parabol_quy_dao | hai_mat_cau_oxyz | khung_day_cap | mat_phang_cat_khoi | chop_lang_tru` (`src/3d-vector/khuon/index.ts` dựng đối tượng + pha chuyển động; pha không mốc trải theo mốc các bước -> mỗi bước đều đổi hình). Đặc tả tự do (10 mảnh) chỉ giữ khi dựng được + đổi hình ở >= 3 bước; còn lại Auto-fix suy khuôn từ đề (`suyKhuon_` KiemTraHinh.gs, `suy_khuon` chuanbi.py), không suy được -> lỗi cứng `KHUNG4TANG_3D_RONG`. Khuôn theo lớp: `dsKhuonTheoLop_` (PromptKichBan.gs); tự sinh đề xoay vòng khuôn trước (`yeuCauKhuonSinhDe_`, BoPhan1.gs). Hành động mới: `dich`, `ve_dan`, `nang`.
     * **Mốc khung 4 tầng (v92):** `khi_noi` chỉ khớp TIẾN, trong đúng cảnh `canh` của bước, so phần chữ (bỏ số); bước 2+ không trước khi đọc xong đề; bước cuối >= ~6 s; thẻ có con trỏ riêng, thẻ không khớp lấy mốc cảnh có `noi_dung_man_hinh` trùng; bước thiếu thẻ / hở > 14 s lấy thẻ từ màn hình cảnh; bước cuối luôn có thẻ đáp số. Phụ đề khung 4 tầng TẮT (bật: env `PHU_DE_4TANG=BAT` + CAU_HINH `PHU_DE_4TANG=BAT`). Tiêu đề bước không chứa đáp số. Logo: bài Toán dùng `logo_toan.*` (Drive `thuong_hieu/`), không có thì vẽ logo chữ động; bài xác suất `logo_xac_suat.*` rồi `logo.*`.
     * **Intro móc câu / Outro tóm tắt / Đối chiếu (v93, chỉ khung 4 tầng):** kịch bản có thể ghi (tùy chọn) `nhan_thi`, `tieu_de_intro` (≤ 44 ký tự, 2 dòng), `phu_de_intro`, `cau_hook`, `cta`, `tom_tat_3_buoc[{chien_thuat, cong_thuc}]`, `buoc[].doi_chieu {ham, bien, ten_ham, mien, kieu, toi_uu?, nguong?, hinh, tham_so}`; thiếu -> `tuSuaMocCau_` (KiemTraHinh.gs) và `khung4tang_v93.py` tự sinh / cắt gọn / che số đáp án -> `props.khung4tang.mocCau|tomTat`. Có `mocCau` thì BỎ intro thương hiệu (`intro = null`, `lech = 0`): `IntroMocCau` phủ ~5 s đầu cùng giọng đọc, sân khấu 3D giữa màn hình (zoom-out + xoay mở) rồi trượt về T2 (`phong_cach.json intro.mocCau4Tang=false` để giữ intro cũ). `OutroTomTat` (≥ 6,5 s) thay màn kết khi có `tomTat`. Đối chiếu: T2 chia 2 cột (hình 2D theo biến | đồ thị + điểm sáng, đỏ `⚠ VƯỢT NGƯỠNG` / xanh `✓ ĐẠT CHUẨN`); máy tự tính điểm tối ưu, sai bất kỳ giá trị nào (hoặc hàm suy từ khuôn không khớp đáp án) -> giữ sân khấu 3D; trước cảnh đáp án chỉ ghi `x*`, `V_max` (`hien_so`).
     * Tránh dùng `filter: blur(...)` lặp theo phần tử hoặc `<feTurbulence>` toàn màn hình trong `src/` để giữ tốc độ render Chromium.

3. **Kịch bản, Model & Giọng đọc:**
   * Biên kịch (`MODEL_BIEN_KICH = gemini-2.5-pro`, `SUY_NGHI_BIEN_KICH = high`) viết lời dẫn xoay quanh một quyết định (`cau_chuyen`), duyệt từng cảnh thực tế/xác suất trước khi giao dựng.
   * Luôn dùng hệ thống **Model Động** (`DANH_SACH_MODEL`, bỏ qua model 404, tra `ListModels` khi cần, tách lỗi quyền theo cặp `key|model`).
   * Giọng đọc Gemini TTS mặc định chế độ `mot_lan` (hoặc theo chặng đồng nhất 100% âm sắc, không đổi cao độ `asetrate`), fallback `edge-tts` cùng giới tính.

4. **Kiểm duyệt & Lịch đăng:**
   * Cửa kiểm duyệt gồm: đo bố cục & AI nhìn hình (`kiem_duyet.mjs`), kiểm tra nhấp nháy/chuyển động trên MP4, **Mắt thần 3×3** (`mat_than_3x3.py`, v91) và AI chấm cuối (`kiem-tra-video.yml`). Chỉ trạng thái `DA_DUYET` mới được vào hàng đăng.
   * **Mắt thần 3×3 (v91):** lỗi nặng -> `kiem_tra_mp4.dat=false` + `mat_than` + `anh_3x3` về `doPost` -> giữ `CHO`, ghi `link_dang._mat_than_chan`, Zalo nhận ảnh lưới (`guiAnhZalo_`, bật chia sẻ link riêng ảnh đó) + danh sách lỗi; `DangVideo.gs matThanChan_` chặn tới khi bạn `/duyet` sau thời điểm chặn. Mắt thần không chạy được (thiếu key/hết hạn mức) thì không chặn. Tắt: GitHub Variable `MAT_THAN_3X3=TAT`.
   * **Auto-fix kịch bản (v91):** `tuSuaHinhThuc_` (TeX `\binom`/`C(n,k)`/`$`/ngoặc/dấu nhân, màu, nhãn thừa, tiêu đề, trường hook, đáp số lộ ở hook) chạy trong `chuanBiKichBan_`; `phanLoaiLoiCung_` chỉ giữ lỗi cứng (`LOI_CUNG_RE_`: rỗng cảnh/lời, đáp án, phép tính, vượt lớp, khóa luồng, dữ kiện Manim) - còn lại thành cảnh báo. Python: `kiem_dac_ta_tu_sua` (kiem_bam_de.py). Tắt: CAU_HINH `AUTO_FIX_KICH_BAN=TAT` / env `AUTO_FIX_KICH_BAN=0`.
   * Lịch đăng chạy qua `chayLichDangDinhKy` (15 phút/lần, giờ VN `11:30` & `19:30`) + trigger `kiemTraDangSauDuyet`, dùng cơ chế giữ chỗ 2 pha (`dang_cho`) và lưu kết quả theo từng nền tảng để phục hồi phần lỗi.
   * Video 10 phút (`-10P`) chỉ đăng duy nhất lên **YouTube** (nén $< 44\text{ MB}$ khi qua Apps Script YouTube API).

## 5. LỆNH KIỂM TRA NHANH KHI CHẠY LOCAL (WINDOWS)

```powershell
# Kiểm tra lỗi TypeScript toàn bộ dự án Remotion
npx tsc --noEmit

# Mở giao diện xem trước Remotion trực tiếp trên trình duyệt
npx remotion studio

# Chụp nhanh 1 khung hình tĩnh để AI tự kiểm tra bố cục (không render cả video)
npx remotion still Video out/preview.png --frame=60
npx remotion still AnhBia out/bia.png

# Chạy bộ kiểm duyệt bố cục DOM trên props hiện có
node scripts/kiem_duyet.mjs

# Chạy bộ kiểm thử nhanh cảnh 3D / lịch đăng / kịch bản
python scripts/test_canh_3d.py
python scripts/test_dac_ta_canh.py
python scripts/thu_dac_ta.py mau/kich_ban_trai_ca.json   # dựng thử đặc tả cảnh (~25 s)
node scripts/test_luong_hinh_hoc.cjs
node scripts/test_lich_dang.cjs
node scripts/test_kich_ban_canh.cjs
node scripts/test_auto_fix_kich_ban.cjs                 # v91/v92: Auto-fix + khung4tang + khuôn 3D + khóa luồng
node scripts/test_khuon_3d.mjs                          # v92: 8 khuôn 3D (mỗi pha đổi hình, trong sân khấu), chữ trộn toán
python scripts/test_moc_4tang.py                        # v92: mốc bước/thẻ, phụ đề, phát âm, logo theo chuyên mục
python scripts/chuanbi.py mau/loi_qua_dem/the_12.json --gia-lap --props-ra out/v92/the_12/props.json   # 3 bài lỗi qua đêm: the_12 / lon_512 / bia_12
python scripts/test_mat_than_3x3.py                     # v91/v92: lưới 3×3 + kiểm tầng 2 trống / đứng im (không gọi API)
python scripts/test_giai_hinh_phang.py                  # v94: bộ giải, bố cục, nhãn, mệnh đề, GDPT 2018 (+ so khớp JS), Mắt thần hình phẳng
node scripts/test_hinh_phang_gs.cjs                     # v94: prompt, Auto-fix, lỗi cứng HP_* phía Apps Script
python scripts/thu_hinh_phang.py mau/hinh_phang/am_vuong_de.json   # v94: giải -> chuanbi giả lập -> Manim 540x960 -> 5 ảnh mốc out/v94/ (~2-4 phút)
node scripts/test_doi_chieu.mjs                         # v93: đối chiếu Hình ↔ Đồ thị (tối ưu đúng, dữ liệu sai -> null), bố cục Intro/Outro
python scripts/chuanbi.py mau/kich_ban_v93_lon_nguong.json --gia-lap --props-ra out/v93/lon/props.json   # v93: đủ trường mới + ngưỡng
node scripts/chupKhung.mjs out/v93/lon/props.json out/v93/lon 36,114,1097,1116,1175,1758              # Intro / đối chiếu đỏ-xanh / Outro
python scripts/chuanbi.py mau/kich_ban_4tang_luc.json --gia-lap --props-ra out/thu_4tang/props.json   # in bảng thời gian từng khâu

# Test nhanh 1 khung hình cuối Manim chất lượng thấp
manim -ql -s scripts/manim_hinh.py <TenScene>
```
## Quy tắc BẮT BUỘC sử dụng Skills
Trước khi viết hoặc sửa code ở bất kỳ hạng mục nào dưới đây, BẮT BUỘC đọc và tuân thủ đầy đủ Skill tương ứng trong `.claude/skills/`, đồng thời ghi 1 dòng "Đã áp dụng skill: <tên>" ở đầu kế hoạch:
- Sửa UI, chuyển cảnh, font, phụ đề, Intro/Outro trong `src/` (Remotion) -> dùng `remotion-best-practices` và `frontend-design`.
- Sửa vẽ hình học, công thức, đồng bộ timestamp trong `scripts/manim_*.py` -> dùng `manim-toan-dep`.
- Sửa dựng cảnh 3D, ánh sáng, camera, thư viện vật thể trong `scripts/ve_blender.py`, `canh_3d.py`, `scripts/thu_vien_3d/` -> dùng `blender-canh-3d-dep` (chỉ áp dụng cho luồng Thực tế & Xác suất).
