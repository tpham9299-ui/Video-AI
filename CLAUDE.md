# VIDEO-AI — HƯỚNG DẪN KIẾN TRÚC & QUY TẮC LÀM VIỆC (v101.6)

> **Lưu ý tiết kiệm token:** Tệp này chỉ chứa quy tắc bắt buộc, bản đồ tệp và kiến trúc hiện hành (v101.6). Toàn bộ lịch sử nâng cấp (v1–v99.2, gồm bản đồ tệp & nguyên tắc chi tiết đã lưu trữ) được lưu riêng trong `CHANGELOG.md` và chỉ đọc khi người dùng yêu cầu tra cứu lịch sử.

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
   * `sinh-de.yml` (**BP0**): Sinh/tìm đề mới & đề 10 phút (`scripts/bophan1/sinh_de_gh.js`; v99.2: xoay 4 mảng theo lịch sử thật `chonMang_`, gửi-trả ĐỦ bộ đếm `KHOA_DEM_BP0_`, nạp `SanKhau.gs`).
   * `bo-phan-1.yml` (**BP1**): Giải đề & kiểm chứng `MOI -> DA_GIAI` (`scripts/bophan1/chay_bp1.js`).
   * `viet-kich-ban.yml` (**BP2**): Viết, tự sửa & duyệt kịch bản `DA_GIAI -> CO_KICH_BAN`, chạy song song 5 luồng (`chay_bp1.js`).
   * `dung-video.yml` (**BP3**): Chuẩn bị TTS + cảnh (v99.1: luồng thực tế & xác suất LUÔN dựng bằng Khung 4 tầng trong Remotion - đường dựng Blender đã gỡ, bài ngắn thiếu `khung4tang` dừng workflow; video `-10P` vẫn dùng giao diện cảnh `NoiDungCu`), kiểm duyệt bố cục (trần 7 phút), dựng khúc song song, ghép MP4, kiểm tra chuyển động, **Mắt thần 3×3** & đẩy Drive.
   * `kiem-tra-video.yml` (**BP4**): AI xem lưới ảnh + kịch bản chấm điểm (`scripts/kiem_tra_video_gh.js`).
   * `dang-video.yml` (**BP5**): Gắn số tập/bìa và đăng đa nền tảng (`scripts/dang_video.py`) - đường đăng DUY NHẤT (v99.1 gỡ job `dang` trùng trong `dung-video.yml` và nhánh dự phòng 404 ở `DangVideo.gs`).
   * *(Phụ trợ)* `kiem-tra-key.yml`: Kiểm tra sức khỏe kho `GEMINI_KEYS` (`scripts/kiem_tra_key.mjs`).

## 3. BẢN ĐỒ TỆP TRỌNG TÂM (v101.6)

> Chi tiết từng hàm/tệp v85–v99.2 đã chuyển xuống cuối `CHANGELOG.md` (mục "Lưu trữ từ CLAUDE.md v99.2").

| Nhóm | Tệp chính & Vai trò |
| :--- | :--- |
| **Apps Script (`/*.gs`)** | `BoPhan1.gs` (lõi hàng đợi, Model Động, GDPT 2018, `chonMang_` BP0, `lapLego_`/`lapTuSinh_`, tự đồng bộ GitHub), `PromptKichBan.gs` (prompt kịch bản, Khung 4 tầng, hợp đồng hình), `KiemTraHinh.gs` (Auto-fix, lỗi cứng, Evergreen `veSinhKb_`), `HinhHoc.gs` (khóa luồng, hình phẳng chuẩn), `SanKhau.gs` (định tuyến sân khấu `chonSanKhau_`, `dungTuSinh_`), `BoPhan2.gs` (giao dựng + webhook `doPost`), `NangCao.gs` (tiêu chí duyệt, học góp ý, Auto-Heal `xuLyTuSuaMatThan_`, **`donRacScriptProperties`**: dọn khóa `HE_yt_*` = "loi" khỏi Script Properties), `DangVideo.gs` (lịch đăng, giữ chỗ 2 pha), `SanPham.gs`, `ZaloDeBai.gs` (nhận đề + thẻ `[chidao: ...]`), `KhoKey.gs` (kho key 2 tầng: tầng 1 **`GEMINI_KEYS_GITHUB`** ưu tiên, tầng 2 kho cũ; 404 theo cặp model/key), `appsscript.json`. |
| **Scripts (`/scripts/`)** | `bophan1/chay_bp1.js` (chạy `.gs` trong Node `vm`), `bophan1/goi_gemini.js` + `model_gemini.cjs` (xoay key, ListModels, 404/429), `chuanbi.py` (TTS, mốc, `props.json`), `khung4tang_v93/v95/v96/v98/v99.py` (suy & kiểm thẻ, mốc, sân khấu 2D, che đáp án, đồng bộ Hình ↔ Tiếng), `tu_sinh_svg.py` + `ve25d.py` (hộp cát sân khấu tự sinh), `evergreen.py`, `giai_hinh_phang.py` + `hinh_phang/` (hình phẳng chuẩn), `giai_hinh_khong_gian.py` + `hinh_khong_gian/` (không gian + Lego), `manim_hinh.py` + `manim/HinhPhangChuan.py` (Manim 0.22.1; KHÔNG thêm `__init__.py` vào `scripts/manim/`), `nhac_nen_v98.py`, `kiem_duyet.mjs`, `dung_khuc.mjs`, `ghep_khuc.mjs`, `mat_than_3x3.py`, `kiem_tra_video_gh.js`, `dang_video.py`, `kiem_tra_key.mjs`. |
| **Remotion (`/src/`)** | `Root.tsx` (`Video` 1080x1920 30fps, `AnhBia`, `Khung4Tang`), `Video.tsx`, `Intro.tsx`, **`AnhBia.tsx` (ảnh bìa DUY NHẤT, v101.1 gộp từ `Thumbnail.tsx`)**, `Canh.tsx` + `NenChieuSau.tsx` + `CanhThucTe.tsx` (giao diện `NoiDungCu`, chỉ cho `-10P` / hình không gian cũ), `chu.ts`, `theme.ts`, `khung4tang/` (`Khung4Tang.tsx`, `kieu.ts`, `vung.ts` `SAFE_ZONE_TIKTOK`/`AN_TOAN`, `nen_v99.ts` + `NenKhiQuyen.tsx` 5 theme, `IntroMocCau`, `OutroTomTat`, `DoiChieu`, `ThanhDe`, `ToiGianKhongGian`, `mau_v981.ts`, **`cauHinhTinhChinh.ts`** (v99.7+: công tắc hiệu ứng `BAT_*`, `SFX_VOLUME`, `CAMERA_ZOOM_MAX`, `HIEN_SAFE_ZONE_DEBUG` — render thật PHẢI `false`), **`LopSafeZoneDebug.tsx`** (khung nét đứt vùng nút TikTok/Shorts, chỉ hiện khi bật debug trong Studio)), `3d-vector/` (8 khuôn 3D), `sankhau2d/` (`SanKhau2D`, `SanKhauTuSinh`, `SoDoCay`...), `khonggian/` (hình không gian + Lego, nét liền/đứt giải tích). |

## 4. NGUYÊN TẮC KỸ THUẬT ĐANG ÁP DỤNG (v101.6)

1. **GDPT 2018 (cấm giải vượt lớp):** Lớp 10 chỉ hình phẳng, không đạo/nguyên hàm. Lớp 11: tam thức bậc 2 / Cauchy / lượng giác, cấm bảng biến thiên, tích phân, Oxyz, Bayes. Oxyz chỉ lớp 12. Mọi lớp cấm số phức. Vượt lớp = 0 điểm lời giải. Bản JS `kiemGdpt2018_` phải khớp `gdpt2018.py`.

2. **3 trụ cột dựng hình (khóa luồng `kb.luong` do `xacDinhLuong_` quyết định MỘT lần):**
   * **Hình phẳng chuẩn (v94, mặc định bài hình PHẲNG):** AI chỉ viết `kb.hinh_phang_chuan` (cấm tọa độ / mã Manim) → `giai_hinh_phang.py` giải tọa độ, kiểm mọi mệnh đề (lỗi cứng `HP_*`) → Manim vẽ trên nền `#121214` (`NoiDungHinhPhang`). Tắt: `HINH_PHANG_CHUAN=TAT`.
   * **Hình không gian chuẩn + Lego (v97/v98, mặc định bài hình KHÔNG GIAN):** AI chỉ viết `kb.hinh_khong_gian` (cấm tọa độ) → `giai_hinh_khong_gian.py` / `lego.py` tính + kiểm (`KG_*`, `CAM_*`) → tầng 2 = `SanKhauKhongGian` trong Khung 4 tầng, nét liền/đứt tính giải tích mỗi khung. Lego 6 khối khóa 3 lớp (schema enum → máy kiểm → vá đúng mục lỗi 1 lần). Tắt: `HINH_KHONG_GIAN_CHUAN=TAT` / `LEGO_3D=TAT`. Luồng hình học thuần CẤM Three.js/`canh_that`/phong cảnh.
   * **Thực tế & Xác suất (v91→v99.1):** LUÔN dựng bằng Khung 4 tầng trong Remotion (đường Blender/Three.js cũ đã gỡ; thiếu `khung4tang` ở bài ngắn = lỗi cứng `KHUNG4TANG_BAT_BUOC`). Sân khấu chọn một lần bởi `chonSanKhau_` ↔ `chon_san_khau`: 8 khuôn 3D / sân khấu 2D (`rut_mau`, `so_do_cay`, `luoi_bayes` lớp 12, `cot_phan_phoi`, `kinh_te_do_thi`, `so_do_2d`, `tang_truong`, `tu_duy_dai_so`) / `lego_3d` / `tu_sinh_svg` (hộp cát AST + kiểm thẩm mỹ, vá tối đa 2 lần, hỏng → `tuSinhHong`, không rơi ngầm về hộp chữ). Máy tính MỌI con số (xác suất vét cạn/lấy mẫu, lệch đáp án → `XS_SAI_DAP_SO`).
   * `HINH_HOC` Manim cũ (`manim_hinh.py`) chỉ còn cho kịch bản cũ; lỗi cài/dựng/`kiem_hinh_hoc.py` → dừng workflow.

3. **Khung 4 tầng (mọi luồng ngắn, 45–55 s):** `kb.khung4tang = {de_ghim, buoc[{khi_noi, nhan, tieu_de, mau, du_kien, the}], san_khau | canh_3d_vector, theme}`; `khi_noi` là mốc theo LỜI (không ghi giây), `chuanbi.py` đổi sang giây; mọi bước gắn một cảnh lời đọc (Hình ↔ Tiếng 1-1); `moc_cong_bo`/`khoa_dap_an` khóa mọi kết quả ≥ lúc giọng đọc ra đáp số; ô ghim không lộ nghiệm (`che_dap_an_ghim`). Intro móc câu + Outro tóm tắt (CTA thông minh) + Đối chiếu Hình ↔ Đồ thị. Vùng an toàn TikTok `SAFE_ZONE_TIKTOK`: Top ≥ 11 % (y ≥ 212), Right ≥ 12 % (x ≤ 950), Bottom ≥ 18 % (y ≤ 1574), trái = phải = 12 % (x ≥ 130); T1 212-398 | T2 398-1046 | T3 1046-1472 | T4 1472-1574, rộng 820, tâm 540. Phông MỘT họ `Be Vietnam Pro` (`theme.ts`, KaTeX dùng chung). Nền theme `deep_ocean | cosmic_indigo | emerald_studio | warm_slate | blueprint` (`chon_theme`). Âm thanh: nhạc 3 preset tự tổng hợp (`nhac_nen_v98.py`, -19 dB dưới giọng), giọng Gemini `mot_lan` + fallback `edge-tts`. Tránh `filter: blur(...)` lặp theo phần tử và `<feTurbulence>` toàn màn hình trong `src/`. Hiệu ứng v100.x bật/tắt tại `cauHinhTinhChinh.ts`.

4. **Ảnh bìa (v101.1):** MỘT composition `AnhBia` (`<Composition>`, chụp `npx remotion still AnhBia out/bia.png --frame=<props.bia.khung>`; BP5 và `dang_video.py` đọc `out/ID_bia.*`). Nhận theme bài (`khung4tang.theme`), huy hiệu dạng bài, dấu `?` nổi bật, nội dung chính trong `SAFE_ZONE_TIKTOK`, không blur nặng; props cũ giữ nguyên (tương thích ngược).

5. **Model Động v98.2 — KHÔNG ghi cứng tên model:** `ListModels` lọc model văn bản → bỏ trùng snapshot → xếp hạng chế độ `nang` (pro mới nhất → flash → *-latest → flash-lite; giải toán / kịch bản / Lego) | `nhe` (flash trước; kiểm duyệt, sửa nhanh). Node `model_gemini.cjs` ↔ Apps Script `danhSachModel_` / `layModelSong_` phải khớp (`test_model_gemini.cjs`). ListModels lỗi → `MODEL_CHUAN_DU_PHONG_`. 404 nhớ theo cặp (model, key) tới hết ngày PT; 403 chặn model 12 giờ; kho key `GEMINI_KEYS_GITHUB` ưu tiên. Biên kịch: `MODEL_BIEN_KICH` trống = pro mới nhất, `SUY_NGHI_BIEN_KICH = high`.

6. **BP0 → BP1 → BP2 sáng tạo & chống sai:** `chonMang_` chọn mảng THIẾU NHẤT trong 20 đề gần nhất (`THUC_TE | XAC_SUAT | HINH_PHANG | HINH_KHONG_GIAN`; `TY_LE_MON` thắng), chặn đề SGK (`laDeSgkNhamChan_`, đề Zalo không qua), hợp đồng hình lưu `[hop_dong]{json}` trong `yeu_to_tu_duy`. BP1 `khoaNgoNhanDe_` + kiểm hai chiều `kiemHaiChieu_` (ngưỡng tuyệt đối). Evergreen: `veSinhKb_` ↔ `evergreen.py` gỡ năm sinh / năm thi. Auto-fix hình thức `tuSuaHinhThuc_` (tắt `AUTO_FIX_KICH_BAN=TAT`); `phanLoaiLoiCung_` chỉ giữ lỗi cứng.

7. **Kiểm duyệt, Auto-Heal & Lịch đăng:** Cửa kiểm duyệt: đo bố cục + AI nhìn hình (`kiem_duyet.mjs`) → kiểm MP4 → **Mắt thần 3×3** (`mat_than_3x3.py`; tắt `MAT_THAN_3X3=TAT`; không chạy được thì không chặn) → AI chấm cuối (`kiem-tra-video.yml`). Chỉ `DA_DUYET` mới vào hàng đăng. **Auto-Heal** (`xuLyTuSuaMatThan_`): CHỈ lỗi cứng `LOI_TU_SUA_` (`cat_chu chong_chu latex_tho ma_tho so_cat lo_dap_an t2_trong hinh_dung_im lech_pha tu_sinh_hong`) → `traVeSuaKichBan_` → BP2 sửa → BP3 dựng lại; trần `TRAN_TU_SUA_ = 2` chung với `xuLyKiemDuyetBoCuc_`; hết lượt → giữ CHO + ảnh lưới Zalo, `/duyet` để mở. Tắt: `TU_SUA_MAT_THAN=TAT`. Lịch đăng `chayLichDangDinhKy` (15 phút/lần, giờ VN 11:30 & 19:30) + `kiemTraDangSauDuyet`, giữ chỗ 2 pha (`dang_cho`), lưu kết quả theo nền tảng. BP5 (`dang-video.yml`) là đường đăng DUY NHẤT. Video `-10P` chỉ đăng **YouTube** (nén < 44 MB).

## 4b. NÂNG CẤP v101.2–v101.6 (tóm tắt)

* `src/khonggian/`: phân cấp nét (liền/đứt/phụ) và làm nổi mặt phẳng trong động cơ không gian.
* `ve25d.py`: mở rộng bộ hàm vẽ cho mọi dạng đề, chặn dựng MP4 nhúng trong hình.
* BP2: Hợp đồng hình cũng áp dụng cho đề Zalo.
* `tuSinhHong` chặn sớm, trước `bundle` / `dung_khuc` (không đổi thứ tự bước).
* Shorts `THUC_TE`: BP2 kiểm dữ liệu sân khấu, Python kiểm nét SVG và dừng trước bundle khi dựng hình hỏng. DOM đo hình nhìn thấy trong T2 ở các khung giải. Mắt thần và BP4 phải xác nhận hình trên ảnh. Lỗi `t2_trong` trả về Auto-Heal, hết lượt giữ CHO. Đường lui `tu_duy_dai_so` chỉ áp dụng ngoài luồng này.
* Auto-Heal tách hạn mức `bo_cuc` và `mat_than` (không dùng chung trần).
* CI: cache npm/pip/Chromium Remotion (khóa theo phiên bản + `package-lock.json`); `.gitattributes` ép `eol=lf`.
* `npm run kiem-tra` gộp tsc + test Node + `python -X utf8` test_v99_1 / test_v99_2.

## 5. LỆNH KIỂM TRA NHANH KHI CHẠY LOCAL (WINDOWS)

```powershell
# Chạy gộp 7 bước kiểm tra nhanh (tsc + 6 test) - v101.1
npm run kiem-tra
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
node scripts/test_v95_gs.cjs                            # v95: chuẩn Toán, câu rào, thứ tự thẻ, CTA, prompt gọn (ghi out/v95/*/kb_sua.json)
python scripts/test_v95.py                              # v95: phiên âm TTS, thẻ, ô ghim, Outro cùng giọng, 2 bài mẫu 55-70 s, nhạc lo-fi
node scripts/chupKhung.mjs out/v95/hop/props.json out/v95/hop 45,600,1150,1290,1660   # v95: Intro / gập hộp / đồ thị chốt / đáp án / Outro
python scripts/tao_mau_v96.py                           # v96: sinh 4 mẫu mau/v96/ (thẻ 1..10 tái hiện VD261122-153504-0, Bayes, lợi nhuận, đại số + chỉ đạo)
node scripts/test_v96_gs.cjs                            # v96: định tuyến + chỉ đạo, rút mẫu theo giá trị, trần vét cạn, đọc lặp / cụt, lỗi cứng, prompt, tỷ trọng, so khớp Python (ghi out/v96/vd_153504/kb_sua.json)
python scripts/test_v96.py                              # v96: lõi Python 8 sân khấu, bộ mẫu theo biến cố, nhịp, 4 mẫu --gia-lap 55-70 s
python scripts/test_tts_toan.py                         # v96: phiên âm Tổ hợp – Xác suất + giữ v95
python scripts/test_giai_hinh_khong_gian.py             # v97: bộ giải không gian (tỷ lệ vàng, mệnh đề mọi cấu hình, số đo, thiết diện, trượt, lỗi KG_*)
node scripts/test_hlr_khong_gian.mjs                    # v97: nét liền/đứt giải tích = bắn tia dày (24x6 góc), xuyên khối, sau kính, tất định, chống nhấp nháy
python scripts/test_dong_bo_camera.py                   # v97: moc_xoay khớp lời (<= 0,2 s), không rơi / không xoay sớm, CAM_MAT_MOC / CAM_DE_GIO
node scripts/test_hinh_3d_chat_luong.mjs                # v97: mọi góc dừng: đỉnh >= 26 px, nhãn không chồng, SAFE_ZONE, nét = bắn tia, giữ góc không chớp
node scripts/test_v97_gs.cjs                            # v97: prompt hinh_khong_gian, Auto-fix, lỗi cứng, so khớp JS <-> Python
python scripts/chuanbi.py mau/v97/giao_diem_mnp.json --gia-lap --props-ra out/v97/giao_diem_mnp/props.json   # mẫu 1 (mẫu 2: vuong_goc_sa)
node scripts/chup_xoay_v97.mjs out/v97/giao_diem_mnp/props.json out/v97/xoay_frame 2 && python scripts/ghep_xoay_v97.py out/v97/xoay_frame
node scripts/test_v98.mjs                               # v98: căn giữa đối xứng, chiều cao phân số, chống đứng hình thật <= 4 s, không lộ đáp án
python scripts/test_v98.py                              # v98: che ô ghim lộ nghiệm (cả bản làm tròn / nghiệm máy tính)
python scripts/test_nhac_v98.py                         # v98: 3 preset nhạc (BPM, 16 ô nhịp, nối vòng, nhịp phách, chọn theo luồng, -19 dB)
python scripts/test_lego_v98.py                         # v98: bộ giải Lego 6 khối (quan hệ, số đo, KG_*, trang_tri, khớp màu)
node scripts/test_lego_v98.mjs                          # v98: nét khuất nhiều khối = bắn tia, viền trụ, phang_2d, 5 động tác, co_lap, số đọc
node scripts/test_model_gemini.cjs                       # v98.2: lọc ListModels, xếp hạng nang/nhe, snapshot, cache 1 lần/key, 404 theo ngày + gợi ý, so khớp .gs <-> Node (máy chủ giả)
node scripts/test_v98_gs.cjs                            # v98: responseSchema enum + bỏ schema khi 400, tự vá đúng mục lỗi 1 lần, định tuyến, Auto-fix
python scripts/test_v98_3.py                            # v98.3: phiên âm TTS (phụ đề giữ nguyên), cắt lặng + đo lại mốc, nghỉ quanh cảnh, đơn vị cây + bi
node scripts/test_v98_3.mjs                             # v98.3: cây 2/3/4 hộp không chồng nhãn / nút / nhánh
node scripts/test_v98_3_gs.cjs                          # v98.3: prompt 45-55 s + Auto-fix khóa đuôi sau đáp án
python scripts/test_v99_2.py                             # v99.2: ve25d, kiểm thẩm mỹ (chữ / màu / nhãn đè / chồng chữ), theme, vá 2 lần + tuSinhHong, lệch pha, Mắt thần, Evergreen, 2 mẫu
node scripts/test_v99_2.mjs                             # v99.2: nhãn phụ bước không lặp "BƯỚC n" (TS = JS = Python), Intro / Outro mẫu v99_2 không cụt
node scripts/test_v99_2b_gs.cjs                         # v99.2b: chặn model 403 12 giờ (Apps Script + goi_gemini.js máy chủ giả), DOC_DE Flash + trần 3,5 phút + báo đúng nguyên nhân, bai_hoc_rut_ra chuỗi, thử lại lỗi broker
node scripts/test_v99_2_gs.cjs                          # v99.2: 40 lượt BP0 ra đủ 4 mảng, chặn SGK (Zalo không), hợp đồng hình, Koch 10 lần vs vô hạn, Monty Hall, Evergreen JS<->Python, Auto-Heal 1/2/3, lapTuSinh_ 2 lần
python scripts/tao_mau_v99_2.py && python scripts/chuanbi.py mau/v99_2/gap_nhau_xs.json --gia-lap --props-ra out/v99_2/gap_nhau_xs/props.json && python scripts/nghiem_thu_v98.py out/v99_2/gap_nhau_xs/props.json   # v99.2 (mẫu 2: kien_bo_hop)
python scripts/test_v99_1.py                             # v99.1: phiên âm -> ký hiệu, chống lặp số, mốc gắn cảnh, khóa mốc đáp án, nhịp <= 6 s, Outro, hộp cát tự sinh, 2 mẫu
node scripts/test_v99_1.mjs                             # v99.1: 5 theme tương phản >= 7:1, nền theo nhịp bước, xung T2, lớp tự sinh (nhóm thay nhau)
node scripts/test_v99_1_gs.cjs                          # v99.1: bienTheDocSo_ / tuSuaCutCongThuc_, dungTuSinh_, lapTuSinh_ vá 1 lần, gỡ Blender
python scripts/tao_mau_v99_1.py && python scripts/chuanbi.py mau/v99_1/koch_dao.json --gia-lap --props-ra out/v99_1/koch_dao/props.json && python scripts/nghiem_thu_v98.py out/v99_1/koch_dao/props.json   # v99.1 (mẫu 2: gia_ve_parabol)
python scripts/tu_sinh_svg.py mau/v99_1/koch_dao.json   # chạy riêng hộp cát mã tự sinh
python scripts/chuanbi.py mau/v98_3/cay_bayes_3hop.json --gia-lap --props-ra out/v98_3/cay_bayes_3hop/props.json && python scripts/nghiem_thu_v98.py out/v98_3/cay_bayes_3hop/props.json   # v98.3: cây 3 hộp
python scripts/chuanbi.py mau/v98/thap_flycam_oxyz.json --gia-lap --props-ra out/v98/oxyz_thap/props.json   # mẫu Oxyz thực tế 3D (2 tháp + flycam)
python scripts/nghiem_thu_v98.py out/v98/oxyz_thap/props.json   # lưới ảnh nghiệm thu có vạch trục giữa 540 / lề 130-950
python scripts/chuanbi.py mau/v98_1/cay_bayes.json --gia-lap --props-ra out/v98_1/cay_bayes/props.json   # v98.1: cây Bayes dòng chảy (H1/H2 -> 2 đỏ, P = 9/11)
python scripts/nghiem_thu_v98.py out/v98_1/cay_bayes/props.json out/v98_1/bayes_luoi/props.json out/v98_1/thuc_te_2d/props.json out/v98_1/dai_so/props.json   # v98.1: lưới nghiệm thu 4 mẫu
node scripts/test_san_khau_2d.mjs                       # v96: vùng an toàn TikTok 4 cạnh, hook 2 s, chống đứng hình <= 4 s, khóa màu
node scripts/chupKhung.mjs out/v96/vd_153504/props.json out/v96/vd_153504 45,270,330,720,1370,1430,1700 && python scripts/luoi_anh_v96.py out/v96/vd_153504
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
