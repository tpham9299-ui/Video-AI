# VIDEO-AI — HƯỚNG DẪN KIẾN TRÚC & QUY TẮC LÀM VIỆC (v85)

> **Lưu ý tiết kiệm token:** Tệp này chỉ chứa quy tắc bắt buộc, bản đồ tệp và kiến trúc hiện hành (v85). Toàn bộ lịch sử nâng cấp từ v1--v85 (đã gom từ các tệp `SUA_CODE_*.md` cũ) được lưu riêng trong `CHANGELOG.md` và chỉ đọc khi người dùng yêu cầu tra cứu lịch sử.

## 1. QUY TẮC BẮT BUỘC KHI LÀM VIỆC LOCAL (`e:\Video-AI`)

1. **Ngôn ngữ:** Luôn trao đổi, giải thích ngắn gọn bằng tiếng Việt.
2. **Không tự động đẩy Git:** **Tuyệt đối không** tự chạy `git add`, `git commit` hay `git push` trừ khi người dùng yêu cầu rõ. Người dùng sẽ tự kiểm tra thay đổi và đẩy lên nhánh `master` bằng Terminal.
3. **Cập nhật tài liệu tiết kiệm:** Chỉ cập nhật `CLAUDE.md` khi có thay đổi về kiến trúc, tên tệp hoặc quy tắc cốt lõi. Nhật ký sửa lỗi chi tiết (nếu cần) chỉ ghi thêm vài dòng ngắn vào cuối `CHANGELOG.md`.
4. **Cảnh báo đồng bộ Google Apps Script:** Nếu có chỉnh sửa bất kỳ tệp `*.gs` hoặc `appsscript.json` nào, cuối câu trả lời bắt buộc liệt kê rõ danh sách tệp `.gs` đã sửa để người dùng bấm **☁️ Tự cập nhật mã .gs từ GitHub vào Apps Script** (hoặc nhắn Zalo `/capnhatcode`, hoặc chờ tự đồng bộ mỗi 30 phút).
5. **Test nhanh tại chỗ, không render nặng:** Khi sửa `src/` hoặc `scripts/`, ưu tiên kiểm tra nhanh bằng kiểm tra kiểu TypeScript, xuất 1 khung ảnh tĩnh (`.png`) hoặc chạy kịch bản mẫu thay vì render toàn bộ video MP4.

## 2. TỔNG QUAN HỆ THỐNG (v85)

**Video-AI** là dây chuyền tự động sản xuất video toán học dọc 9:16 (ngắn + chuyên đề dài 10 phút `-10P`):
`Tự sinh / Zalo gửi đề -> Giải & kiểm chứng 2 cách + JS -> Viết kịch bản sư phạm 6 phần -> Lập cảnh 3D/Manim/TTS -> Kiểm duyệt bố cục & AI nhìn hình -> Dựng song song -> Kiểm tra chuyển động MP4 & AI chấm cuối -> Tự đăng (Shorts, Reels, TikTok)`.

### Kiến trúc 2 tầng

1. **Tầng điều phối (Google Apps Script + Sheets + Drive + Zalo Bot):**
   * Bảng tính chính: `HANG_DOI`, `CAU_HINH`, `BANG_DOC`, `GOP_Y_HOC`, `QUY_TAC_HOC`, `SAN_PHAM`, `SERIES`, `SO_LIEU`, `NHAT_KY`, `KHO_KEY`.
   * Giao việc qua GitHub `workflow_dispatch`, nhận kết quả qua Webhook `doPost(e)`.
   * Chống nghẽn bằng cờ nhẹ `CacheService` và khóa tái nhập `voiKhoa_` (không giữ `LockService` dài phút). Các lệnh Zalo `/bo`, `/sua`, `/duyet`, `/huy`, `/key`, `/capnhatcode`, `/donvideoloi`, `/suavideocu` phản hồi tức thời.

2. **Tầng tính toán & dựng hình (GitHub Actions — 6 Workflow theo thứ tự):**
   * `sinh-de.yml` (**BP0**): Sinh/tìm đề mới & đề 10 phút (`scripts/bophan1/sinh_de_gh.js`).
   * `bo-phan-1.yml` (**BP1**): Giải đề & kiểm chứng `MOI -> DA_GIAI` (`scripts/bophan1/chay_bp1.js`).
   * `viet-kich-ban.yml` (**BP2**): Viết, tự sửa & duyệt kịch bản `DA_GIAI -> CO_KICH_BAN`, chạy song song 5 luồng (`chay_bp1.js`).
   * `dung-video.yml` (**BP3**): Chuẩn bị TTS + cảnh 3D/Manim, kiểm duyệt bố cục (trần 7 phút), dựng khúc song song, ghép MP4, kiểm tra chuyển động & đẩy Drive.
   * `kiem-tra-video.yml` (**BP4**): AI xem lưới ảnh + kịch bản chấm điểm (`scripts/kiem_tra_video_gh.js`).
   * `dang-video.yml` (**BP5**): Gắn số tập/bìa và đăng đa nền tảng (`scripts/dang_video.py`).
   * *(Phụ trợ)* `kiem-tra-key.yml`: Kiểm tra sức khỏe kho `GEMINI_KEYS` (`scripts/kiem_tra_key.mjs`).

## 3. BẢN ĐỒ TỆP TRỌNG TÂM

| Nhóm | Tệp chính & Vai trò |
| :--- | :--- |
| **Apps Script (`/*.gs`)** | `BoPhan1.gs` (lõi hàng đợi, model động, GDPT 2018, tự đồng bộ GitHub), `PromptKichBan.gs` (prompt 6 phần, `cau_chuyen`, bản vẽ thực tế, bài 10 phút), `KiemTraHinh.gs` (tự sửa thuật toán, kiểm tra phép tính LaTeX & vật thật), `HinhHoc.gs` (tọa độ 2D/3D, chiếu Cavalier, phân loại `canh`/`khuat`/`phu`), `BoPhan2.gs` (giao dựng video & webhook `doPost`), `NangCao.gs` (tiêu chí duyệt, học từ góp ý, series/hook), `DangVideo.gs` (lịch đăng `chayLichDangDinhKy`, `kiemTraDangSauDuyet`, giữ chỗ 2 pha), `SanPham.gs` (lệnh Zalo tức thời & quảng cáo), `ZaloDeBai.gs` (nhận đề chữ/ảnh/PDF/Word/LaTeX), `KhoKey.gs` (quản lý key), `appsscript.json` (OAuth scopes & YouTube Advanced Services). |
| **Scripts (`/scripts/`)** | `bophan1/chay_bp1.js` (chạy `.gs` trong Node `vm`), `bophan1/goi_gemini.js` (xoay vòng key, tự né 404/429, tra `ListModels`), `chuanbi.py` (chuẩn hóa đọc toán, Gemini TTS `mot_lan` + cache + fallback `edge-tts`, mốc `mocCongThuc`, tạo `public/props.json`), `canh_3d.py`, `ve_blender.py`, `tao_mo_hinh.py`, `xe_3d.py` (lập kế hoạch & dựng cảnh Blender Cycles CPU RGBA + xuất tọa độ chiếu), `manim_hinh.py` (dựng bài `HINH_HOC` Manim `0.22.1`, vẽ từng nét theo mốc từ, ghi `manimNhatKy`), `kiem_hinh_hoc.py` (kiểm tra chéo bắt buộc luồng/cảnh/điểm/quan hệ/đồng bộ trước & sau Manim), `manim_thuc_te.py` (vẽ nét toán & công thức trùng tọa độ chiếu từ Blender), `thu_vien_3d/` (đặc tả cảnh v87: `schema_dac_ta.json`, `danh_muc.json`, `vat.py`, `moi_truong.py`, `khop.py`, `xep_cho.py`, `phep_thu_nhieu.py` (xác suất nhiều vật -> Three.js), `sinh/` vật AI đã ghép), `kiem_bam_de.py` (kiểm đặc tả bám đề + AI nhìn ảnh), `nang_cap_dinh_dang.py`, `thu_dac_ta.py` (dựng thử cục bộ), `kiem_duyet.mjs` (đo DOM + AI nhìn hình trước dựng), `dung_khuc.mjs`, `ghep_khuc.mjs`, `anh_kiem_tra.py`, `dang_video.py`. |
| **Remotion (`/src/`)** | `Root.tsx` (`Video` 1080x1920 30fps, `AnhBia`), `Video.tsx`, `Intro.tsx` (intro thương hiệu, cấu hình `phong_cach.json -> intro`, nội dung lùi `props.intro.lech` khung), `AnhBia.tsx`, `Canh.tsx`, `CanhBlender.tsx`, `CanhMoiTruong.tsx`, `NenChieuSau.tsx` (nền tối chiều sâu phần giải luồng thực tế), `UngDungThucTe.tsx` (thẻ minh họa cảnh ứng dụng), `CanhThucTe.tsx`, `BinhBi.tsx`, `NenCauChuyen.tsx`, `TheDeBai.tsx`, `DuKien.tsx`, `ManKet.tsx`, `PhuDeTikTok.tsx`, `KiemDuyet.tsx`, `chu.ts` (chuẩn hóa KaTeX/tiếng Việt), `sankhau/SanKhau.tsx`, `sankhau/dulieu.ts`, `sankhau/canhthat.ts`, `sankhau/vatthuc.tsx`, `sankhau/vat3d.tsx`, `sankhau/hinhhoc.tsx`, `sankhau/hinhtudo.tsx`, `sankhau/vat.tsx`. |

## 4. CÁC NGUYÊN TẮC KỸ THUẬT KHÔNG ĐƯỢC PHÁ VỠ (v85)

1. **Chuẩn chương trình GDPT 2018 (cấm giải vượt lớp):**
   * **Lớp 10:** Chỉ hình phẳng (`PHANG`), không dùng đạo hàm/nguyên hàm.
   * **Lớp 11:** Tối ưu bằng tam thức bậc 2 / Cauchy / lượng giác; hình không gian tổng hợp; xác suất cộng-nhân độc lập. Cấm bảng biến thiên/$y'=0$ tìm cực trị/GTLN-GTNN, cấm tích phân, cấm tọa độ $Oxyz$, cấm Bayes/xác suất có điều kiện.
   * **Mọi lớp:** Cấm tuyệt đối số phức. Lỗi vượt lớp bị đánh 0 điểm lời giải.

2. **Phân luồng dựng hình ảnh & đồ họa (v85):**
   * **Phông chữ (v89):** MỘT họ chữ `Be Vietnam Pro` cho mọi vai trò (tiêu đề, badge, hộp, phụ đề, nhãn, Manim), phân cấp bằng độ đậm + thang `CO_CHU` (`src/theme.ts`); KaTeX dùng chung Be Vietnam (`KieuToan`), hộp danh sách một cỡ chung (`HopVua`), phụ đề hiện số/ký hiệu tách khỏi văn đọc (`hien_phu_de`); công thức qua KaTeX (đổi chữ `x` giữa hai số thành dấu nhân $\times$, giữ nguyên biến $2x, x^2$).
   * **Khóa luồng (v86):** `kb.luong` = `hinh_hoc_thuan` | `thuc_te_xac_suat` do Apps Script quyết định một lần (`xacDinhLuong_`, HinhHoc.gs) và mọi tầng sau chỉ đọc trường này; luồng hình học thuần **cấm** Blender/Three.js/`canh_that`/`mo_hinh_3d`/phong cảnh (`khoaLuongHinhHoc_`, `canh_3d.py` từ chối, `kiem_hinh_hoc.py` chặn).
   * **Hình học (`HINH_HOC`):** Bắt buộc dựng bằng **Manim (`0.22.1`)** nền trong suốt phủ lên Remotion; bảo toàn quy tắc 3D (`canh` nét liền, `khuat` nét đứt, `phu` đường phụ); lỗi cài/dựng Manim hoặc `kiem_hinh_hoc.py` không đạt phải dừng workflow. Giọng đọc bài hình học dùng edge-tts `WordBoundary` (mốc từng từ thật); mỗi cảnh khai báo `buoc_ve: [{ve, khi_noi}]` để nét vẽ khớp đúng lời đọc.
   * **Thực tế & Xác suất (`THUC_TE`, `XAC_SUAT`):**
     * Xe chạy trên đường hoặc phép thử bi/xu/xúc xắc hỗ trợ $\rightarrow$ ghi `moiTruong` và dựng toàn khung bằng **Three.js** (SwiftShader trong Chromium).
     * Vật thể thực tế / `mo_hinh_3d.chi_tiet` / `khoi_tiet_dien.tang` / lưới tam giác tự do $\rightarrow$ **Blender Cycles CPU** (`canh_3d.py`) chỉ dựng phần mở đầu (pha `thuc`) $\rightarrow$ cảnh `de_bai` (pha `chuyen`) đẩy máy + nhòe ảnh thật để lấy nét sang hình 2D $\rightarrow$ pha `toan`: Remotion (sân khấu + KaTeX), riêng hình khối hộp/trụ/nón/cầu do **Manim (`manim_thuc_te.py`)** vẽ.
     * **Đặc tả cảnh (v87):** cảnh mở đầu dựng từ `kb.dac_ta_canh` (ngữ nghĩa, không tọa độ) -> `kiem_bam_de.py` -> `thu_vien_3d/xep_cho.py` -> Blender; vật mới qua `--tu-tao` (AI ghép bộ phận, lưu `sinh/`). Thêm mẫu vật/bối cảnh: sửa `danh_muc.json` + hàm dựng + `DANH_MUC_3D_` (PromptKichBan.gs). Blender ghim 5.3.0.
     * **Góc máy & hành động (v88):** `quay[]` từng cảnh -> `props.quay` (mốc `khi_noi`, `chuanbi.py`) -> mỗi cảnh mở đầu/đề một kế hoạch Blender riêng + `props.nhipQuay` (`CanhBlender.tsx` chạy hành động đúng mốc). Bài xác suất mà vật chính đều là đồ chơi xác suất -> `moiTruong {loai:'dac_ta'}` dựng toàn bộ bằng Three.js (`CanhMoiTruong.tsx`, nhiều vật + `boi_canh`), không cần Blender.
     * Tránh dùng `filter: blur(...)` lặp theo phần tử hoặc `<feTurbulence>` toàn màn hình trong `src/` để giữ tốc độ render Chromium.

3. **Kịch bản, Model & Giọng đọc:**
   * Biên kịch (`MODEL_BIEN_KICH = gemini-2.5-pro`, `SUY_NGHI_BIEN_KICH = high`) viết lời dẫn xoay quanh một quyết định (`cau_chuyen`), duyệt từng cảnh thực tế/xác suất trước khi giao dựng.
   * Luôn dùng hệ thống **Model Động** (`DANH_SACH_MODEL`, bỏ qua model 404, tra `ListModels` khi cần, tách lỗi quyền theo cặp `key|model`).
   * Giọng đọc Gemini TTS mặc định chế độ `mot_lan` (hoặc theo chặng đồng nhất 100% âm sắc, không đổi cao độ `asetrate`), fallback `edge-tts` cùng giới tính.

4. **Kiểm duyệt & Lịch đăng:**
   * Cửa kiểm duyệt gồm: đo bố cục & AI nhìn hình (`kiem_duyet.mjs`), kiểm tra nhấp nháy/chuyển động trên MP4, và AI chấm cuối (`kiem-tra-video.yml`). Chỉ trạng thái `DA_DUYET` mới được vào hàng đăng.
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

# Test nhanh 1 khung hình cuối Manim chất lượng thấp
manim -ql -s scripts/manim_hinh.py <TenScene>
```
## Quy tắc BẮT BUỘC sử dụng Skills
Trước khi viết hoặc sửa code ở bất kỳ hạng mục nào dưới đây, BẮT BUỘC đọc và tuân thủ đầy đủ Skill tương ứng trong `.claude/skills/`, đồng thời ghi 1 dòng "Đã áp dụng skill: <tên>" ở đầu kế hoạch:
- Sửa UI, chuyển cảnh, font, phụ đề, Intro/Outro trong `src/` (Remotion) -> dùng `remotion-best-practices` và `frontend-design`.
- Sửa vẽ hình học, công thức, đồng bộ timestamp trong `scripts/manim_*.py` -> dùng `manim-toan-dep`.
- Sửa dựng cảnh 3D, ánh sáng, camera, thư viện vật thể trong `scripts/ve_blender.py`, `canh_3d.py`, `scripts/thu_vien_3d/` -> dùng `blender-canh-3d-dep` (chỉ áp dụng cho luồng Thực tế & Xác suất).
