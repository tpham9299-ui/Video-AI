# LỊCH SỬ CÁC LẦN CHỈNH SỬA HỆ THỐNG VIDEO-AI (v1 -- v85)

> Tài liệu tổng hợp toàn bộ lịch sử nâng cấp từ loạt tệp `SUA_CODE_BO_PHAN_1.md`, `SUA_CODE_LAN_2.md` -- `SUA_CODE_LAN_41.md` và các bản v44 -- v85 (tách từ `CLAUDE.md` để tiết kiệm token nền khi mở chat mới). Chỉ cần đọc tệp này khi cần tra cứu nguyên nhân thiết kế hoặc lịch sử sửa lỗi cũ.

---

## GIAI ĐOẠN 1: LẦN 1 ĐẾN LẦN 43 (GOM TỪ CÁC TỆP `SUA_CODE_*.md`)

### Lần 1 (`SUA_CODE_BO_PHAN_1.md`) -- Thiết lập Bộ phận 1 & Nền tảng Giải toán + Kịch bản
- Xây dựng tệp `BoPhan1.gs` đầu tiên quản lý bảng `HANG_DOI` và `CAU_HINH`.
- Thiết lập quy trình tự sinh đề toán xác suất THPT, giải bằng 2 cách độc lập và viết mã JavaScript `kiemChung()` chạy thử để đối chiếu đáp án trước khi viết kịch bản JSON.

### Lần 2 (`SUA_CODE_LAN_2.md`) -- Kiểm tra kịch bản & Kết nối Bộ phận 2
- Thêm tệp `KiemTraHinh.gs` để kiểm tra cấu trúc dữ liệu hình minh họa ngay khi Gemini vừa viết kịch bản.
- Thêm `BoPhan2.gs` gửi sự kiện `repository_dispatch` sang GitHub Actions để dựng video bằng Remotion và nhận kết quả qua `doPost(e)`.

### Lần 3 (`SUA_CODE_LAN_3.md`) -- Đa dạng hóa biểu đồ & Tự sửa kịch bản cơ bản
- Bổ sung các loại hình minh họa xác suất (`cay`, `bang_o`, `dien_tich`, `thuc_nghiem`, `phan_tu`).
- Thêm hàm `tuSuaKichBan_()` tự động sửa các lỗi định dạng nhỏ và `suaDapAn_()` đảm bảo cảnh đáp án luôn khớp kết quả đã kiểm chứng.

### Lần 4 (`SUA_CODE_LAN_4.md`) -- Sân khấu tương tác (`san_khau`) & Đạo cụ trực quan
- Nâng cấp hệ thống hình minh họa sang cơ chế `san_khau` gồm danh sách đạo cụ (`vat`: `nguoi`, `hop_bi`, `xuc_xac`, `dong_xu`, `the_bai`, `vong_quay`...) và các hành động (`hanh_dong`: `chon`, `loai_bo`, `sang`, `rung`, `quay`, `mo`, `lay_ra`).
- Hỗ trợ `giu_san_khau: true` để giữ nguyên các vật từ cảnh trước và diễn tiếp trên cùng sân khấu.

### Lần 5 (`SUA_CODE_LAN_5.md`) -- Mở rộng sang Toán Thực Tế (`THUC_TE`) & Vật thể 3D
- Mở rộng hệ thống từ chỉ làm toán Xác suất sang làm thêm **Toán thực tế** (tối ưu chi phí, thể tích, diện tích, chuyển động, đo đạc).
- Thêm các vật 3D (`khoi_hop`, `tru`, `non`, `cau`, `toa_nha`, `thang`, `xe`, `cay`), đồ thị hàm số (`do_thi`) và hình học (`hinh_hoc`) trong `src/sankhau/vat3d.tsx` và `src/sankhau/hinhhoc.tsx`.

### Lần 6 (`SUA_CODE_LAN_6.md`) -- Cải tiến Giọng đọc TTS, Phụ đề Karaoke & Bảng công thức LaTeX
- Nâng cấp `scripts/chuanbi.py` chuẩn hóa cách đọc ký hiệu toán học bằng tiếng Việt tự nhiên.
- Hiển thị công thức bằng KaTeX trong `src/Video.tsx` với các chế độ trình bày `cong_don`, `bien_doi`, `xep` và phụ đề highlight từng cụm từ.

### Lần 7 (`SUA_CODE_LAN_7.md`) -- Hệ thống nâng cao (`NangCao.gs`): Hook, Series & Tự học từ góp ý
- Thêm tệp `NangCao.gs`: quản lý 5 kiểu câu móc (`hook_kieu`) ở 5 giây đầu, quản lý chuỗi tập phim (`SERIES`), và cơ chế học từ nhận xét của người dùng.

### Lần 8 (`SUA_CODE_LAN_8.md`) -- Tự động đăng YouTube Shorts & Bảng dọc (`BANG_DOC`)
- Thêm tệp `DangVideo.gs` để AI tự viết tiêu đề, mô tả, hashtag và đăng video lên YouTube Shorts.
- Thêm trang `BANG_DOC` trình bày thông tin từng video theo chiều dọc dễ theo dõi trên điện thoại.

### Lần 9 (`SUA_CODE_LAN_9.md`) -- Hình vẽ tự do (`hinh_tu_do`) & Fractal / Xếp chồng
- Bổ sung đối tượng `hinh_tu_do` (`src/sankhau/hinhtudo.tsx`) hỗ trợ vẽ đa giác, đường, mũi tên, đường tròn, cung tròn, bông tuyết Koch (`koch`), tam giác Sierpinski (`sierpinski`), đường cong tham số (`tham_so`) và chồng vật (`xep_chong`).

### Lần 10 (`SUA_CODE_LAN_10.md`) -- Trọng tài giải toán (`trongTaiGiai_`) & Xử lý đề có vấn đề
- Khi Cách 1, Cách 2 và mã `kiemChung()` cho kết quả lệch nhau, gọi thêm bước Trọng tài suy luận sâu (`trongTaiGiai_`) để chốt đáp án đúng thay vì vứt bỏ đề ngay.
- Phát hiện đề toán thực tế có số liệu không vừa khít (ví dụ xếp tầng còn dư ống) để giải thích rõ phần nguyên và phần dư trong video.

### Lần 11 (`SUA_CODE_LAN_11.md`) -- Kiểm duyệt bố cục tự động trước khi dựng (`scripts/kiem_duyet.mjs`)
- Thêm bước chụp khung hình mẫu trước khi render toàn bộ video để phát hiện sớm lỗi chữ tràn mép (`TRAN_MEP`), chữ đè nhau (`CHU_DE`), chữ bị cắt (`CAT_CHU`), mã TeX thô (`TEX_THO`) hoặc KaTeX lỗi (`KATEX_LOI`).

### Lần 12 (`SUA_CODE_LAN_12.md`) -- Dựng video song song nhiều khúc trên GitHub Actions
- Chia quy trình `dung-video.yml` thành 3 job (`chuan_bi` $\rightarrow$ `dung_khuc` chạy song song trên 4--10 máy ảo $\rightarrow$ `ghep`), giảm thời gian dựng mỗi video từ ~13 phút xuống còn ~4--6 phút.

### Lần 13 (`SUA_CODE_LAN_13.md`) -- Tích hợp Zalo Bot & Quảng cáo sản phẩm (`SanPham.gs`)
- Kết nối Zalo Bot gửi thông báo kèm ảnh bìa, ảnh kiểm tra và link video về điện thoại.
- Thêm tệp `SanPham.gs` quản lý sản phẩm bán hàng (`SAN_PHAM`) và tự động lồng ghép khéo léo cảnh giới thiệu sản phẩm ở cuối video khi phù hợp.

### Lần 14 (`SUA_CODE_LAN_14.md`) -- Thiết kế Ảnh bìa (`AnhBia.tsx`) & Nhạc nền theo cảm xúc
- Tạo composition `AnhBia` riêng cho từng video và chèn làm khung hình 0 của video (giúp TikTok/Reels tự lấy làm thumbnail).
- Tự sinh nhạc nền đa âm sắc (`tinh_lang`, `nhe_nhang`, `tuoi_ang`, `kich_tinh`, `hoi_hop`) bằng numpy trong `scripts/chuanbi.py` và chọn nhạc theo nội dung bài toán (`chonNhacNen_`).

### Lần 15 (`SUA_CODE_LAN_15.md`) -- Tách `PromptKichBan.gs` & Quy trình sư phạm 6 phần
- Tách toàn bộ logic tạo prompt sang tệp `PromptKichBan.gs`.
- Chuẩn hóa cấu trúc kịch bản 6 phần bắt buộc: **ĐỀ BÀI $\rightarrow$ MÔ PHỎNG $\rightarrow$ LỖI SAI (BẪY) $\rightarrow$ GIẢI $\rightarrow$ THỬ LẠI $\rightarrow$ CHỐT (BÀI HỌC)**.

### Lần 16 (`SUA_CODE_LAN_16.md`) -- Đăng đa nền tảng: Facebook Reels, TikTok & YouTube (`scripts/dang_video.py`)
- Thêm job `dang` trong `dung-video.yml` và tệp `scripts/dang_video.py` để đăng video tự động lên cả Facebook Page Reels, TikTok (tự làm mới `refresh_token` lưu trên Drive) và YouTube Shorts.

### Lần 17 (`SUA_CODE_LAN_17.md`) -- Giọng đọc AI Gemini TTS & Lọc rè âm thanh
- Tích hợp giọng đọc `gemini-2.5-flash-preview-tts` (giọng nam `Charon` / giọng nữ `Kore`, `Aoede`...) đọc tự nhiên toàn bộ kịch bản trong một lần gọi rồi tách theo cảnh để giữ chất giọng đồng nhất xuyên suốt video.
- Thêm bộ đo phổ tần số phát hiện giọng bị rè/tạp âm (`giong_bi_re`) để tự động đọc lại hoặc chuyển sang `edge-tts` cùng giới tính.

### Lần 18 (`SUA_CODE_LAN_18.md`) -- Lệnh Zalo `/duyet`, `/bo`, `/sua` & AI tự học quy tắc (`QUY_TAC_HOC`)
- Cho phép người dùng nhắn trực tiếp `/duyet`, `/bo`, `/sua <mã> <góp ý>` trên Zalo.
- Khi người dùng gửi `/sua`, AI vừa sửa ngay video đó vừa rút ra quy tắc chung lưu vào trang `QUY_TAC_HOC` để không lặp lại lỗi ở các video sau.

### Lần 19 (`SUA_CODE_LAN_19.md`) -- Nhận đề bài qua Zalo (`ZaloDeBai.gs`) bằng Chữ, Ảnh, PDF, Word, LaTeX
- Thêm tệp `ZaloDeBai.gs`: người dùng gửi câu hỏi toán, chụp ảnh đề thi hoặc gửi file `.pdf`, `.docx`, `.tex` vào Zalo Bot $\rightarrow$ hệ thống tự đọc đề, tách từng bài, gắn `uu_tien = 1` và làm trước tiên.

### Lần 20 (`SUA_CODE_LAN_20.md`) -- Cảnh thực tế tự dựng (`canh_that`) & Thư viện vật thật SVG (`vatthuc.tsx`)
- Thêm cơ chế `canh_that` (`src/sankhau/canhthat.ts` + `src/sankhau/vatthuc.tsx`): AI chỉ cần mô tả theo nghĩa (người cao $1{,}6\text{ m}$ đứng tại $x=0$, cột cờ cao $15\text{ m}$ tại $x=20$, góc nâng $35^\circ$...), máy tự tính tỉ lệ bản vẽ kỹ thuật, dựng vật thật SVG và vẽ đường gióng, cung góc, bóng nắng.

### Lần 21 (`SUA_CODE_LAN_21.md`) -- Bản vẽ nhìn từ trên (`nhin: "tren"`) cho bài toán mảnh vườn, hàng rào, qua sông
- Mở rộng `canh_that` hỗ trợ góc nhìn mặt bằng từ trên xuống (`nhin: "tren"`), vẽ vùng (`vuon`, `ruong`, `ho_boi`, `san_bong`, `song`), bức tường gạch (`tuong`) và hàng rào theo từng cạnh (`hang_rao`).

### Lần 22 (`SUA_CODE_LAN_22.md`) -- Tự tạo Bản vẽ kỹ thuật chuẩn trước khi viết kịch bản (`taoBanVeThucTe_`)
- Trước khi viết kịch bản toán thực tế, AI lập riêng một bản vẽ chuẩn `kb.ban_ve` đúng số đo của đề và đáp án, sau đó kiểm tra đủ các điểm của đề (`kiemTraDiemDe_`) và đúng tổng chiều dài rào (`kiemTraSoDoVung_`, `tuSuaSoDoVung_`).

### Lần 23 (`SUA_CODE_LAN_23.md`) -- AI Nhìn Hình kiểm duyệt trước khi render (`aiNhinHinh`)
- Trong `scripts/kiem_duyet.mjs`, gửi ảnh chụp các cảnh thực tế cho Gemini Vision kiểm tra xem hình vẽ đã đúng vật thật trong đề chưa, số đo đặt đúng chỗ chưa; nếu sai thì chặn lại trả về Apps Script để tự sửa kịch bản trước khi tốn máy render.

### Lần 24 (`SUA_CODE_LAN_24.md`) -- Thư viện hàng nghìn biểu tượng Emoji (`TU_DIEN_EMOJI_`) & Chống vẽ khối hộp vô nghĩa
- Khi đề nhắc tới vật ngoài thư viện SVG vẽ sẵn (tàu hỏa, trực thăng, bệnh viện, hoa, con vật...), tự động ánh xạ sang biểu tượng đúng vật đó thay vì vẽ khối hộp/khối trụ vô nghĩa.
- Kiểm tra riêng bài toán tài chính/lãi suất (`kiemTraTaiChinh_`, `tuSuaTaiChinh_`) để gỡ bỏ các khối hình học không liên quan.

### Lần 25 (`SUA_CODE_LAN_25.md`) -- Máy tự tính lại mọi phép tính LaTeX trên màn hình (`texThanhSo_`, `kiemTraPhepTinh_`)
- Bộ phân tích biểu thức LaTeX trong `KiemTraHinh.gs` tự động tính giá trị số của các vế trong mọi dòng công thức $A = B = C$ (bao gồm phân số, căn bậc $n$, lũy thừa, $\sin, \cos, \tan, \cot$ theo độ) để bắt ngay mọi phép tính sai số học.

### Lần 26 (`SUA_CODE_LAN_26.md`) -- Chuyển Bộ phận 1 sang chạy trên GitHub Actions (`bo-phan-1.yml` & `chay_bp1.js`)
- Đưa toàn bộ quá trình giải đề + kiểm chứng + viết kịch bản + tự sửa sang chạy trên GitHub Actions (`scripts/bophan1/chay_bp1.js`), xóa bỏ hoàn toàn giới hạn 6 phút/lần chạy của Google Apps Script.

### Lần 27 (`SUA_CODE_LAN_27.md`) -- Kho Key Gemini nhiều tài khoản & Xoay vòng Key thông minh (`goi_gemini.js`)
- Hỗ trợ nhập hàng chục API Key trong `GEMINI_KEYS`, tự động xoay vòng khi một key chạm giới hạn theo phút hoặc hết hạn mức ngày (`429 PerDay`), và phát hiện key hỏng thật để báo qua Zalo.

### Lần 28 (`SUA_CODE_LAN_28.md`) -- Bố cục Bàn tròn (`ban_tron`) & Chống đè nhãn trên bản vẽ
- Thêm đạo cụ `ban_tron` cho các bài toán hoán vị vòng quanh bàn, tự động chuyển nhóm người xếp hàng ngang thành ngồi quanh bàn tròn khi đề bài yêu cầu (`tuSuaBoCucDe_`).
- Thuật toán đặt nhãn tránh đè lên vật và nhãn khác (`datNhan` trong `src/sankhau/canhthat.ts`).

### Lần 29 (`SUA_CODE_LAN_29.md`) -- Phân môn Hình học (`HINH_HOC`) & Dựng hình bằng tọa độ chính xác (`HinhHoc.gs`)
- Thêm tệp `HinhHoc.gs`: AI viết hàm JavaScript tính tọa độ các đỉnh, giao điểm, chân đường cao, tâm đường tròn ngoại tiếp/nội tiếp (`taoHinhChinhXac_`) để hình vẽ luôn vuông thật, tiếp xúc thật và thẳng hàng thật.

### Lần 30 (`SUA_CODE_LAN_30.md`) -- Tích hợp Manim Community dựng video Hình học (`scripts/manim_hinh.py`)
- Với bài toán `HINH_HOC`, sử dụng **Manim** (`scripts/manim_hinh.py`) dựng toàn bộ hình vẽ, ký hiệu góc vuông, cung góc, tô miền đa giác, hiệu ứng phóng/chớp sáng cạnh đang xét và viết công thức LaTeX thành lớp video trong suốt ghép đè lên khung Remotion.

### Lần 31 (`SUA_CODE_LAN_31.md`) -- Đánh vần tên điểm Hình học trong giọng đọc TTS
- Trong `scripts/chuanbi.py` (`DOC_CHU_CAI`), tự động đánh vần tên đỉnh, cạnh, tam giác, mặt phẳng trong bài hình học (ví dụ $SA \perp (ABC)$ đọc thành *"ét a vuông góc với mặt phẳng a bê xê"*) để giọng đọc chuẩn xác như giáo viên giảng bài.

### Lần 32 (`SUA_CODE_LAN_32.md`) -- Kiểm tra kịch bản Manim (`kiemTraKichBanManim_`) & Đồng bộ lời giảng -- hình vẽ
- Đảm bảo mọi điểm/cạnh nhắc trong lời thoại và công thức của từng cảnh đều được khai báo trong `manim.hien_diem`, `manim.hien_canh`, `manim.to_canh` để hình vẽ Manim sáng lên đúng nhịp giọng đọc.

### Lần 33 (`SUA_CODE_LAN_33.md`) -- Hình học không gian 3D bằng phép chiếu xiên Cavalier (`chieuHinhKhongGian_`)
- Hỗ trợ dựng hình chóp, lăng trụ, tứ diện, hình hộp bằng tọa độ 3D `[x, y, z]` rồi chiếu xuống mặt phẳng 2D theo góc chiếu sách giáo khoa Việt Nam ($\alpha = 45^\circ$, hệ số co $k = 0{,}45$).

### Lần 34 (`SUA_CODE_LAN_34.md`) -- Thêm vật thực tế mới (`ban`, `ghe`, `ti_vi`, `kim_tu_thap`, `thap`) & Bắt lỗi vẽ vật lạ mỗi cảnh
- Mở rộng thư viện `vatthuc.tsx` thêm cái bàn (có mặt bàn + 4 chân), ghế, tivi, kim tự tháp, tháp truyền hình.
- Thêm `kiemTraVatLaMoiCanh_()` và `tuSuaVatLa_()` ngăn việc đề nói "ngọn hải đăng" mà cảnh sau lại vẽ "tòa nhà" hay đề nói "cái bàn" mà lại vẽ "khối hộp".

### Lần 35 (`SUA_CODE_LAN_35.md`) -- Thẻ ĐỀ CHO / CẦN TÌM cố định & Kiểm tra phần Thử lại thật sự
- Hiển thị thẻ tóm tắt `de_cho` và `can_tim` rõ ràng ở đầu video (`the_de_bai` trong `scripts/chuanbi.py` và `TheDeBai` trong `src/Video.tsx`).
- Bắt buộc cảnh `kiem_tra` (Thử lại) phải có phép tính thử bằng số thật sự trên màn hình.

### Lần 36 (`SUA_CODE_LAN_36.md`) -- Chống vẽ lại dấu ba chấm (`kiemTraBaCham_`) & Cảnh liên hệ thực tế có vật thật (`suaLienHeThucTe_`)
- Ngăn AI vẽ lại nguyên xi dấu `...` hay $\vdots$ trong các bài dãy số / xếp chồng ống thép; buộc dựng bằng nét có quy luật (`xep_chong`, `lap`).
- Tự động bổ sung vật thật + người quan sát cho cảnh `lien_he_thuc_te`.

### Lần 37 (`SUA_CODE_LAN_37.md`) -- Gọi dự phòng song song (Hedged Requests) khi Gemini chậm
- Trong `scripts/bophan1/goi_gemini.js`, nếu sau `GIAY_GOI_DU_PHONG` giây model chính chưa trả lời, tự động bắn thêm yêu cầu song song sang model dự phòng bằng key khác và lấy kết quả nào về trước.

### Lần 38 (`SUA_CODE_LAN_38.md`) -- Kiểm tra sức khỏe toàn bộ Kho Key (`kiem-tra-key.yml` & `scripts/kiem_tra_key.mjs`)
- Thêm công cụ kiểm tra từng key trong `GEMINI_KEYS`, phân biệt rõ key hết hạn mức ngày (`HET_NGAY` -- giữ lại chờ hôm sau) với key hỏng thật (`LOI_THAT` -- báo Zalo để người dùng gỡ).

### Lần 39 (`SUA_CODE_LAN_39.md`) -- Xử lý Key dạng mới (`AQ.`) bị từ chối cục bộ theo từng Model
- Ghi nhận `TEP_TU_CHOI` theo từng cặp `model|key`; chỉ khi một key bị từ chối ở $\ge 2$ model khác nhau và chưa từng gọi thành công lần nào mới kết luận là key hỏng.

### Lần 40 (`SUA_CODE_LAN_40.md`) -- Gỡ các ràng buộc rườm rà của Remotion khỏi bài Hình học Manim
- Trong `danhGiaKichBan_()` (`KiemTraHinh.gs`), miễn trừ các lỗi chỉ dành cho sân khấu Remotion (`HINH_DUNG_YEN`, `THIEU_CANH_3D`, `THIEU_LIEN_HE_THUC_TE`...) đối với bài `HINH_HOC` dựng bằng Manim để lời giảng tập trung hoàn toàn vào chứng minh và tính toán hình học.

### Lần 41 -- 43 (`SUA_CODE_LAN_41.md`) -- Tối ưu tốc độ kiểm duyệt, đồng bộ thời gian thực & ổn định Manim 0.22.1
- Giới hạn thời gian bước kiểm duyệt bố cục tối đa 7 phút (`timeout 420`) để không bao giờ làm treo job dựng video.
- Tinh chỉnh bố cục bảng công thức và vùng vẽ Manim không chồng lấn lên nhau.

---

## GIAI ĐOẠN 2: v44 ĐẾN v63 (TỰ ĐỘNG HÓA, TÁCH WORKFLOW & TỐI ƯU HIỆU NĂNG)

### v44 -- Giải quyết triệt để 6 vấn đề cốt lõi & Thiết lập `CLAUDE.md`
1. **Triệt tiêu lỗi báo bận khi `/bo`, `/sua`, `/duyet`, `/huy`:** Thay khóa cứng 5 phút `LockService.getScriptLock()` bằng cờ nhẹ `CacheService`, tách `dongBoBangDoc()` chạy nền, thêm cờ `DA_BO_<id>` / `SUA_MOI_<id>` và bật `cancel-in-progress: true`.
2. **Tự sinh đề $\rightarrow$ AI tự kiểm tra $\rightarrow$ Tự đăng 2 video/ngày:** Cấu hình `DUYET_TRUOC_KHI_DANG = 'TAT'`, `DANG_TU_DONG = 'BAT'`, `SO_VIDEO_MOI_NGAY = '2'`, `GIO_DANG = '11:30,19:30'` kèm cơ chế đăng bù.
3. **Tự dò và nâng cấp video cũ trên Drive & Hàng đợi:** Thêm `doVaSuaVideoCuTrenDrive_()`, hỗ trợ kịch bản lớn $> 58\text{ KB}$ qua Drive và lệnh `/suavideocu`, `/dunglai`, `/nangcap`.
4. **Hình học Manim (`phu`, `canh`, `khuat`):** Thêm `phanLoaiCanhKhongGian3D_()` (bao lồi 2D + pháp tuyến mặt + kiểm tra che khuất 3D), `_bo_sung_diem_phu()` và `_chuan_hoa_khong_gian()`.
5. **Hình minh họa thực tế bám sát từng cảnh (`buoc: 1..4`):** Thêm `tuyChinhBanVeTheoCanh_()` và `tuSuaDaDangHinh_()`.
6. **Hệ thống Model Động (`DANH_SACH_MODEL`):** Né model `404`, gỡ `thinkingConfig` khi `400`, lưu `MODEL_TOT_NHAT`, tự tra `GET /v1beta/models`.

### v45 -- AI tự sửa theo góp ý, chuẩn `Anh Shiper Toán`, Chuyên đề 10 phút & `appsscript.json`
- Khi góp ý `/bo` lý do 1--6 hoặc học góp ý mới, giữ lại đề để AI tự sửa kịch bản thay vì bỏ.
- Thêm `capNhatMaAppsScriptTuGitHub()` + lệnh `/capnhatcode` và tệp `appsscript.json` khai báo đầy đủ `oauthScopes`.
- Nâng cấp `TheDeBai.tsx`, `DuKien.tsx`, `taoMocBuocLoi()` khóa bước hình theo câu đọc.
- Bổ sung chế độ bài giảng 10 phút (`DAI_10_PHUT`, 5 chương, có YouTube Chapters `00:00 ...`).
- Nâng cấp giọng đọc sư phạm (`Puck`, `Aoede`) và sửa lời thoại tự nhiên hơn.

### v46 -- Sửa lỗi heredoc `dung-video.yml`, Đồ họa 3D, Xoay 3D Manim, Auto-Healing & Cache TTS
- Sửa lỗi cú pháp heredoc trong `dung-video.yml` bằng lệnh `python3 -c` inline.
- Nâng cấp độ sâu 3D (`vat3d.tsx`, `vatthuc.tsx`, `canhthat.ts`), chuẩn hóa 5 bước sư phạm cho `XAC_SUAT`, thêm xoay 3D & tia sáng `ShowPassingFlash` trong `manim_hinh.py`.
- Thêm Deterministic Auto-Healing trong `KiemTraHinh.gs` (phiên âm sạch LaTeX trong lời thoại, đồng bộ đáp án và bài học rút ra).
- Nâng cấp shader/gradient SVG thực tế và điểm nút hạt ngọc 3D (`hinhhoc.tsx`).
- Triển khai Cache âm thanh TTS theo SHA-256 + tự động sinh Intro/Outro thương hiệu (`ManKetChuyenNghiep`).
- Rà soát vá 6 lỗi: sửa `radialGradient` chuẩn SVG, tắt `LoiMoi` tránh đè chữ, chỉnh vị trí bước cache TTS, chống nhiễm độc cache rè, rút mẫu kiểm duyệt còn 2 khung (`[0.55, 0.95]`), retry HTTP `422`/`5xx`.

### v47 -- Chống gửi trùng `bo-phan-1`, điều chỉnh ngưỡng chấm & mở rộng tự sửa
- Thêm khóa Cache `GUI_BP1_<id>` chống 2 trigger gửi trùng.
- Hạ ngưỡng chấm cực đoan từ `100`/`10` xuống `85`/`8` thực tế hơn.
- Thêm `suaCuPhapTex_()`, tự ghép hình cho cảnh đề bài và tinh chỉnh ngưỡng đo DOM ở `KiemDuyet.tsx`.

### v48 -- Chuẩn hóa 100% Hình học Manim, chống dính chữ/sai chính tả & đổi tên thương hiệu
- Mở rộng vùng vẽ Manim (`HINH_TREN = 4.45, HINH_DUOI = -1.60, HINH_RONG = 8.85`), bỏ mờ nền (`op = 1.0`), đồng bộ vẽ điểm/cạnh theo `cau`, quét 36 hướng $\times$ 4 bán kính tránh chồng nhãn điểm.
- Bọc tiếng Việt trong `\text{...}` ở `chuan_tex`/`bocChuViet` và thêm từ điển sửa chính tả tiếng Việt.
- Giải cứu các video bị kẹt do AI kiểm duyệt hết key và đổi tên thương hiệu Outro thành `"Tư duy Xác suất"` (`@tuduyxacsuat`).

### v49 -- Khôi phục `KhoKey.gs` & YouTube Services, báo cáo Key & nhấn nhá giọng đọc
- Đưa `KhoKey.gs` vào danh sách đồng bộ 10 tệp `.gs`, giữ nguyên `enabledAdvancedServices` (`YouTube`, `YouTubeAnalytics`) khi cập nhật từ GitHub.
- Thêm lệnh `/key` và báo cáo sức khỏe kho key từ `kiem-tra-key.yml`.
- Bổ sung `them_nhan_nha_doc()` và mở rộng dải động âm thanh (`LRA=13`).

### v50 -- Chuẩn hóa Không gian mẫu, Tấm thẻ, Bình bi Pha lê 3D & Đặt ẩn theo bước
- Chuyển lưới ô trống sang thẻ Quy tắc nhân + Bộ đếm công-tơ-mét (`so_dem`), hoặc điền đầy đủ nhãn kết quả thật cho phép thử nhỏ.
- Tự động sửa bài rút thẻ thành tấm thẻ đánh số 3D thay vì hộp bi; thiết kế lại `HopBi` thành bình pha lê 3D.
- Thay thế việc lạm dụng `hop_qua` ở cảnh `lien_he_thuc_te` bằng hình bám sát nội dung; không đặt ẩn sớm (`2x, x, h`) ở cảnh đề bài.

### v51 -- Tự sinh 1 Video Dài 10 Phút/ngày (chỉ YouTube) & Đồng nhất 100% giọng đọc
- Tự sinh mỗi ngày 1 chuyên đề `-10P` luân phiên lớp 12, 11, 10 và chỉ đăng duy nhất lên `youtube` (giới hạn $< 42\text{ MB}$).
- Đặt mặc định `CACH_DOC_GEMINI = "mot_lan"`, bỏ dịch cao độ `asetrate` để giữ đồng nhất 100% âm sắc giọng đọc xuyên suốt video.

### v52 -- Tách rời Luồng Giải đề (1A) và Luồng Xây kịch bản (1B)
- Tách `chay_bp1.js` theo pha `viec = 'giai'` và `viec = 'kich_ban'`, tách 2 hạn ngạch song song và 2 hàm/trigger riêng (`chayGiaiDe()`, `chayVietKichBan()`).
- Tăng tốc `xuLyKichBan_()` bằng cách chốt ngay khi hết lỗi nặng `dg.nang`.

### v53 -- Kiểm toán hệ thống, chống tranh chấp & siết chặt tiêu chí Chủ kênh
- Chống Apps Script chạy đè lên hàng đợi GitHub, tăng `GH_QUA_HAN_PHUT = 28`, gia cố cắt giảm payload `goiDeChoGitHub_()`.
- Siết cổng `xuLyAiXem_()`: không tự duyệt nếu tiêu chí cốt lõi $< 7$ điểm hoặc chưa chấm được ảnh (chuyển `'CHO'` báo Zalo).
- Sửa lỗi regex khoảng trắng TeX trong `manim_hinh.py`.

### v54 -- Sửa lỗi bỏ qua khung giờ đăng & ổn định job `dang`
- Triển khai giữ chỗ 2 pha (`dang_cho`) trong `DangVideo.gs`: chỉ chốt khung khi có ít nhất 1 nền tảng thành công, lỗi thì nhả khung để thử lại sau 15 phút.
- Tách nhịp đăng video 10 phút khỏi khung giờ video ngắn, thêm bước `failure()` báo ngược webhook và tính bitrate động dưới $44\text{ MB}$.

### v55 -- Tách riêng file Workflow & tăng tốc sinh kịch bản gấp ~2 lần
- Tạo workflow riêng `viet-kich-ban.yml`, nâng `SO_KICH_BAN_CUNG_LUC = 5`, giảm `hedgeGiay` xuống `35` giây, chuyển `aiDuyetKichBan_()` sang `suyNghi: 'low'`.

### v56 -- Phân bổ 6 công đoạn sang 6 Workflow độc lập & Tự đồng bộ mã Apps Script
- Tạo `sinh-de.yml` (BP0), `kiem-tra-video.yml` (BP4), `dang-video.yml` (BP5) tách khỏi Apps Script và `dung-video.yml`.
- Khóa `GITHUB_NHANH = 'master'` và thêm `tuDongDongBoCodeTuGitHub_()` tự kiểm tra commit mới mỗi 30 phút.

### v57 -- Sắp xếp lại tiến trình Workflow chuẩn BP0 $\rightarrow$ BP5
- Xóa `giai-de.yml` trùng lặp, chuẩn hóa thứ tự 6 workflow: `sinh-de.yml` (BP0), `bo-phan-1.yml` (BP1), `viet-kich-ban.yml` (BP2), `dung-video.yml` (BP3), `kiem-tra-video.yml` (BP4), `dang-video.yml` (BP5).

### v58 -- Sửa lỗi YAML dòng `Dựng video hình học bằng Manim`
- Khôi phục đúng cú pháp dòng bước dựng Manim và chuẩn hóa `run-name` trên toàn bộ workflow.

### v59 -- Giải cứu đề Zalo kẹt ở `MOI` do thiếu `de_bai`
- Chặn `doVaSuaVideoCuTrenDrive_()` chuyển nhầm dòng `LOI` chưa đọc được chữ sang `MOI`; tự động đưa các đề kẹt có `file_anh` về `CHO_DOC`.

### v60 -- Khắc phục sinh đề tự động ngừng chạy khi cạn đề
- Cho phép gọi `sinhDeQuaGitHub_()` song song kể cả khi có đề ưu tiên Zalo, bỏ `CO_VIDEO` khỏi biến đếm `choDung` và tự đảm bảo đủ 3 trigger chính.

### v61 -- Chuẩn hóa Chương trình theo Lớp (GDPT 2018) -- Cấm giải vượt lớp
- Xây dựng 4 tầng kiểm soát `CHUONG_TRINH_CHI_TIET_`, `yeuCauKienThucLop_()`, `kiemTraViPhamLop_()` tại Sinh đề, Giải đề/Trọng tài, Viết kịch bản/Kiểm tra tĩnh và 2 cửa AI kiểm duyệt.
- Cấm tuyệt đối dùng đạo hàm tìm cực trị/GTLN-GTNN, tích phân, $Oxyz$, xác suất có điều kiện/Bayes ở Lớp 11 và cấm số phức ở mọi lớp.

### v62 -- Tăng tốc dựng video (`chuan_bi`, `kiem_duyet`, Manim, Remotion) & nâng cấp giao diện
- Song song hóa Gemini TTS / `edge-tts` / lọc âm thanh (`ThreadPoolExecutor`, `Semaphore(6)`), vector hóa `do_tap_am()` bằng NumPy, chạy `silencedetect` 1 lần duy nhất.
- Cache pip/Manim/TeX (`/tmp/manim_tex_cache`), dọn tài nguyên thừa trước `remotion bundle`, tái sử dụng ảnh khung `0.95` cho `aiNhinHinh()`.
- Loại bỏ `<feTurbulence>` và `filter: blur(...)` lặp theo phần tử trong `src/*.tsx` để tăng tốc dựng khung Chromium.

### v63 -- Tổng rà soát, vá lỗi hệ thống & tránh kẹt hàng đợi
- Thêm output `chan` ở `chuan_bi`, đọc box MP4 $O(1)$ RAM trong `dang_video.py`, bọc timeout cho `execFileSync`.
- Bổ sung khóa tái nhập `voiKhoa_`, tự dò lại dòng `ghi_(..., expectId)`, tách `dang_cho_10p`/`dang_cho_khung`, tách `dangYouTube_` nặng ra trigger nền `chayDangYouTubeCho`.
- Sửa vòng đời `delayRender`/`continueRender`, cộng trùng `leadFrame`, tách chồng `ThanhTienDo` và chuẩn hóa phông đóng gói trong `src/`.

---

## GIAI ĐOẠN 3: v64 ĐẾN v85 (CHUẨN HÓA ĐỒ HỌA 3D BLENDER, THREE.JS & KIỂM CHỨNG THEO CẢNH)

### Lần 31 (v64) -- Theo dõi truyền Drive và giới hạn kiểm duyệt bố cục
- Yêu cầu `rclone` ghi thống kê truyền mỗi 30 giây vào log Actions; kiểm tra ID tệp trên Drive trước khi báo kết quả về Apps Script.
- Kiểm duyệt chụp lượt cuối cảnh trước, rồi đến lượt giữa cảnh; lưu báo cáo nguyên tử sau mỗi khung. Dừng mở khung mới sau 355 giây, giới hạn gọi Gemini tới giây 400, workflow gửi `TERM` ở giây 415 và `KILL` sau 5 giây.

### Lần 32 (v65) -- Làm rõ hình chiếu và chuyển từ cảnh thật sang mô hình toán
- Manim thử góc chính diện và các góc lệch $\pm 6^\circ$, $\pm 12^\circ$ cho hình không gian để tránh đỉnh đè cạnh hoặc cạnh co ngắn; cảnh thứ hai có thể xoay thêm $6^\circ$ rồi trở về.
- Remotion giảm biên độ rung ngang từ 16 xuống tối đa 3 pixel; vật minh họa/nền mặt bằng mờ dần trong 1,1 giây khi nét đo xuất hiện trên cùng hệ tọa độ.

### Lần 33 (v66) -- Dàn hình theo dữ kiện và lời giảng
- Chọn hành động gắn với phép toán (ghép cặp đối xứng, gom nhóm thẻ, giữ màu lượng nước khi chuyển mặt cắt).
- Hỗ trợ `moc_loi` trên từng dòng công thức: `chuanbi.py` khớp phụ đề tính ra `mocCongThuc` (giây từ đầu cảnh) dùng chung cho cả Remotion và Manim.

### Lần 34 (v67) -- Rút ngắn bước chuẩn bị trước khi chia khúc
- Với bài hình học, cài đặt gói Manim/LaTeX song song trong lúc tạo giọng đọc.
- `kiem_duyet.mjs` chụp tối đa 2 khung đồng thời trong cùng Chromium (rút thời gian kiểm duyệt mẫu 9 cảnh từ 33,7s xuống 25,3s).

### Lần 35 (v68) -- Chọn cách dàn hình theo lập luận
- Áp dụng 3 mẫu tham khảo (vật thể quay, suy biểu thức từ hình, so sánh xác suất trên cùng không gian mẫu) tùy theo phân môn và lời giải đã kiểm chứng.

### Lần 36 (v69) -- Giữ hình riêng của đề và giảm công việc dựng thừa
- Cho phép dựng đường bao riêng bằng đường dẫn, đa giác, cung và đường đo trong một hệ tọa độ.
- Ưu tiên cache npm, chỉ cài `rclone` khi có cấu hình Drive; khi kiểm duyệt chặn thì bỏ gửi gói và bỏ ma trận dựng.

### Lần 37 (v70) -- Chặn chuyên đề 10 phút thiếu nội dung và chỉ rõ lỗi API YouTube
- Viết riêng 3 chương mở rộng (thiếu chương hoặc lỗi thì dừng), kiểm tra ngân sách lời giảng 540--660 giây, timeline sau TTS và thời lượng MP4 ở bước đăng.
- Báo rõ đúng dự án Google Cloud cần bật YouTube Data API v3 khi bị tắt.

### Lần 38 (v71) -- Giảm lượt gọi Gemini và phân biệt quota với quyền dùng model
- Bộ phận 1 xử lý tối đa 3 yêu cầu mỗi tiến trình; mặc định chỉ gọi dự phòng sau lỗi; tách lỗi quyền theo cặp `key|model` và tra `ListModels` khi cần.
- Giữ lại key gặp lỗi quyền/billing để người vận hành kiểm tra thay vì đánh dấu hỏng ngay.

### Lần 39 (v72) -- Kiểm tra chuyển động trên MP4 và giữ bản chưa xác minh để duyệt tay
- So sánh các cụm khung liên tiếp trên MP4 phát hiện vùng hình đảo/nhấp nháy; giữ video thiếu báo cáo hoặc lỗi để duyệt tay, chỉ `DA_DUYET` mới vào hàng đăng.
- Bổ sung mô hình chiếu 3D bài cắt góc tấm bìa; Manim chia nét phụ tại biên che khuất và đặt nền viền tương phản cho nhãn điểm; cửa duyệt cuối đánh 0 điểm lời giải nếu vượt lớp.

### Lần 40 (v73) -- Đồng nhất chữ và minh họa bài chọn nhóm theo đề
- Đồng bộ họ chữ tiếng Việt; chuẩn hóa chữ `x` giữa hai số thành dấu nhân $\times$ trong khi giữ biến như $2x$ và $x^2$.
- Dựng đúng nhóm học sinh theo số lượng từng khối của đề; cảnh chia nhóm/ca trực dùng minh họa gắn phiếu lên bảng.

### Lần 41 (v74) -- Dọn video đã có kết luận lỗi trên Drive
- Thêm lệnh Zalo `/donvideoloi` dọn tối đa 15 MP4 lỗi mỗi lượt vào Thùng rác Drive theo kết quả kiểm duyệt trong `HANG_DOI`, lịch nền chạy tiếp nếu còn nhiều video.

### Lần 42 (v75) -- Hình học phẳng và không gian dùng chung quy tắc dựng
- Dừng workflow ngay khi cài đặt hoặc dựng Manim lỗi; mở rộng vùng hình học dọc, đưa thẻ đề chia từng dữ kiện xuống dưới hình.
- Tính chân đường cao theo tỷ lệ thật của 2 trục; bộ xếp nhãn đo kích thước thật của tên điểm và giữ góc nhìn hiện tại nếu xoay gây va chạm.

### Lần 43 (v76) -- Hai họ chữ và minh họa gắn với dữ kiện
- Tách 2 họ chữ mặc định: `Montserrat` cho tiêu đề (bìa, đầu cảnh, bài học) và `Be Vietnam Pro` cho nội dung, nhãn hình và phụ đề.
- Thêm sơ đồ cập bờ theo tỷ lệ $AH, HB$; bài cho thuê nhà vẽ đúng số căn; đồng bộ bình bi thân trụ trong suốt trên 2 định dạng kịch bản.

### Lần 44 (v77) -- Dựng bối cảnh thực tế bằng Blender
- Bảo toàn kích thước khu vườn, cạnh tường/rào và cho phép ghép vật mới qua `mo_hinh_3d.chi_tiet` có dẫn cụm từ từ đề (ví dụ bể nước gồm 1 đáy và 4 thành).
- Cài Blender khi có cảnh phù hợp để dựng ảnh mô hình rồi ghép trước sơ đồ.

### Lần 45 (v78) -- Chuyển từ vật thể sang hình toán ngay trên nền video
- Blender Cycles CPU dựng chuỗi RGBA không nền với máy quay xoay nhẹ một chiều rồi dừng, xuất tọa độ góc cuối cho `scripts/manim_thuc_te.py` vẽ nét toán trùng hình và dựng công thức phần giải.
- Kiểm tra tổng hàng rào, cấu tạo bể không nắp và thể tích lòng bể; bổ sung lấy mẫu ảnh vật thể chuyển từ 3D sang Manim trong bước kiểm duyệt.

### Lần 46 (v79) -- Minh họa 3D theo từng cảnh và dữ kiện mới
- Bổ sung thân thuyền, băng chuyền có con lăn, lăng trụ đùn từ đa giác lồi; hỗ trợ `mo_hinh_3d` riêng cho từng cảnh (cả phần giải, liên hệ thực tế và xác suất).
- Manim đặt đường đo tại tọa độ đã chiếu, đổi đơn vị trước khi đối chiếu độ dài với đề; vật thể hiện mờ làm mốc khi số đo xuất hiện.

### Lần 47 (v80) -- Dựng phép thử xác suất và vật chưa có mẫu
- Chuyển tự động sân khấu xác suất (bình bi, nhóm xu, xúc xắc) sang phép thử Blender và giữ trạng thái cuối.
- Hỗ trợ tạo vật chưa có mẫu bằng cách nối các tiết diện elip trong `khoi_tiet_dien.tang`; kiểm duyệt lấy khung đầu và khung cuối phép thử.

### Lần 48 (v81) -- Xe theo lời đọc, khung chứng minh và kiểm duyệt chuyển động
- Dựng xe tăng/giảm tốc, dừng và chạy tiếp bằng tích phân vận tốc đa thức bậc $\le 2$ hoặc gia tốc bậc $\le 1$ (đơn vị SI) theo mốc lời đọc.
- Hình học phẳng tự điều chỉnh vùng nhìn theo nét đang chứng minh; quy đổi thời điểm ảnh bìa khi đo bố cục; đối chiếu pixel lặp nhiều chu kỳ để phát hiện nhấp nháy.

### Lần 49 (v82) -- Bối cảnh 3D phủ khung video dọc
- Dùng **Three.js** (SwiftShader trong Chromium) dựng toàn khung phố cho xe chuyển động và mặt bàn thí nghiệm cho phép thử bi/xu/xúc xắc (ghi `moiTruong` vào cảnh).
- GitHub chỉ cài Blender và Manim cho các bản vẽ còn lại; Blender chụp riêng ảnh môi trường dọc (nhà xưởng/ngoài trời/trong phòng) và lớp vật thể RGBA.

### Lần 50 (v83) -- Câu chuyện toán học, phục hồi bước chọn cảnh và nhãn hình học
- Thêm mạch kể `cau_chuyen` (vai người kể, địa điểm, mục tiêu, bản thiết kế bối cảnh); đặt mặc định `MODEL_BIEN_KICH = gemini-2.5-pro`, `SUY_NGHI_BIEN_KICH = high`.
- Bản vẽ riêng lỗi tự phục hồi từ dữ kiện đề; chứng minh phẳng chọn cấu hình tối ưu theo độ tách cạnh, bỏ tên cạnh trùng hai đầu mút và dựng nét trước nhãn.

### Lần 51 (v84) -- Nối cảnh thực với mô hình toán và phục hồi lịch đăng
- Hòa mờ khung vật thể cuối của Blender sang hình Manim cùng tọa độ chiếu khi đọc đề, giữ góc nhìn ổn định ở phần giải.
- Tách trigger `kiemTraDangSauDuyet` khỏi lịch định kỳ `chayLichDangDinhKy` (15 phút/lần), hỗ trợ ô giờ dạng thời gian của Sheets và lưu kết quả theo từng nền tảng để thử lại nền tảng thiếu.

### Lần 52 (v85) -- Kiểm chứng kịch bản theo cảnh và sinh mô hình theo đề
- Duyệt đầy đủ từng cảnh thực tế/xác suất (lời thoại, hình, phép tính) trước khi giao dựng; giữ bản nháp khi chưa đạt và chuyển về Apps Script dùng `KhoKey` nhóm `VIDEO` nếu kho GitHub không phục vụ được.
- GitHub lập thử kế hoạch từ JSON trước TTS; khi thiếu mô hình có thể yêu cầu Gemini sinh bản vẽ riêng cho cảnh và đối chiếu lại.
- Bổ sung lưới tam giác tự do và phép dựng lăng trụ từ hai cạnh góc vuông + chiều cao; kiểm tra chỉ số mặt, tam giác suy biến, trích dẫn và độ dài đường đo.
### Lần 53 (v86) -- Ảnh thật -> lấy nét sang hình 2D, thống nhất phông, giọng tự nhiên
- Nền Blender chỉ ở phần mở đầu (`thuc`); cảnh `chuyen` đẩy máy + nhòe + tối ảnh thật để lộ hình 2D (`ChuyenLayNet`), không còn phủ cảnh tĩnh suốt video.
- Pha `toan` dựng bằng Remotion (sân khấu + KaTeX); chỉ hình khối (hộp/trụ/nón/cầu) dùng Manim (`khoi_tron`, nét đứt phía sau). Bỏ "nét chiếu" Blender vô nghĩa, bỏ ảnh công thức Manim lệch phông, chữ Manim dùng Be Vietnam Pro đậm.
- Cảnh mở đầu: hòa trộn 16 khung Blender + máy trôi chậm cho chuyển động mượt. Tiêu đề Title Case tự đổi về kiểu câu.
- Giọng đọc: chỉ dẫn kể chuyện tự nhiên, bỏ chèn "..." gây ngắt cụt.
- Hình học: tự bổ sung cạnh thiếu của khối/đa giác chính, báo điểm đề nêu mà hình thiếu (`manimCanhBao`).

### Lần 54 (v86) -- Nâng mô hình Blender cho cảnh mở đầu giống thật
- Máy quay phối cảnh 50 mm (bỏ trực giao), lượn 9° + đẩy vào 12%; khung tự vừa theo phối cảnh.
- Ánh sáng 3 điểm (chính ấm, phụ lạnh, viền), AgX, Cycles lấy mẫu thích ứng + khử nhiễu OIDN.
- Vật liệu PBR (nhám biến thiên, kim loại, sơn có lớp bóng, kính/nước truyền sáng); trụ/nón/cầu bo mượt, mép bo bắt sáng.
- Sàn hứng bóng (shadow catcher): vật có bóng đổ trên nền. Nền xóa phông dựng theo từng khung máy (`nen-i.jpg`) -> thị sai thật; cửa sổ phát sáng.
- Hình mới `lon` (lon nước có vành, cổ thắt, khoen) và `bon_vom` (bồn trụ + vòm bán cầu + chân đế); `tru` có trích dẫn "lon"/"bồn ... vòm" tự nâng cấp.

### Lần 55 (v86) -- Khóa luồng hình học thuần + kiểm tra chéo + đồng bộ hình-tiếng theo mốc từ thật
- Khóa luồng `kb.luong` = `hinh_hoc_thuan` | `thuc_te_xac_suat` (Apps Script `xacDinhLuong_` -> JSON -> `dung-video.yml`/`canh_3d.py`); mâu thuẫn `luong`/`mon` thì dừng. Bài hình học có prompt riêng `taoPromptHinhHocThuan_` (bỏ khung "toán thực tế 3D/Blender"), không lập bản vẽ cảnh thật, `khoaLuongHinhHoc_` gỡ mọi `canh_that`/`mo_hinh_3d`/phong cảnh. Zalo: hình không gian không còn bị xếp nhầm `THUC_TE` (`laDeHinhHocThuan_`).
- Kiểm tra chéo bắt buộc: `kiemTraKichBanManim_` có lỗi nặng (thiếu điểm của đề/lời thoại, `buoc_ve` không khớp nguyên văn); mã dựng hình trả `quan_he`, `chenToaDoHinh_` bỏ điểm AI tự đặt và ghi `kb.hinh_chuan`; `scripts/kiem_hinh_hoc.py --truoc/--sau` kiểm luồng, số cảnh, điểm, quan hệ (vuông góc/song song/trung điểm/thuộc/bằng/vuông góc mặt), nét khuất, mốc đồng bộ và độ lệch từng nét (≤ 0,25 s). Bỏ hình mẫu tọa độ cố định của Manim (thiếu tọa độ -> dừng).
- Đồng bộ cứng: bài hình học dùng edge-tts có `WordBoundary` (mốc từng từ thật, cắt đoạn theo mốc từ thay `silenceremove`), props có `tu`, `mocVe` (từ `buoc_ve.khi_noi`), `mocCongThuc` theo từ thật; Manim vẽ từng nét đúng mốc nói (bỏ ngưỡng 60%, không dồn trễ, xả xen kẽ với dòng công thức) và ghi `manimNhatKy`.
- Sửa kèm: "S.ABCD" không còn bị tách thành "S. ABCD" (tách câu/ngắt giọng sai); font Path của xelatex dùng "/" (chạy được Manim trên Windows). Đường phụ khai báo trong `buoc_ve` được vẽ đúng cảnh (trước đây chỉ xét 2 đoạn nhắc đầu tiên mỗi cảnh -> đường chéo AC bị dời sang cảnh sau); `--sau` chặn nét bị thiếu / dời cảnh. Manim lấy chiều sâu từ `hinh_chuan.diem_goc` (heuristic cũ vẽ SB nét đứt, AD/CD nét liền), không có 3D thì giữ nét khai báo; xoay 3D / làm nổi đầu cảnh / ô công thức không được lấn mốc lời đọc; điểm được nhắc trong cảnh (giao điểm O) luôn hiện; `--sau` đối chiếu nét liền/đứt thực vẽ với hình chuẩn. Test cục bộ mẫu S.ABCD: 6/6 cảnh, 22 nét/dòng, lệch lớn nhất 0,18 s. Test: `node scripts/test_luong_hinh_hoc.cjs`, mẫu `mau/kich_ban_hinh_dong_bo.json`.

### Lần 56 (v87) -- Đặc tả cảnh có cấu trúc cho luồng Thực tế & Xác suất (giai đoạn A–C)
- Kịch bản thực tế/xác suất có thêm `dac_ta_canh` v1 (`scripts/thu_vien_3d/schema_dac_ta.json`): bối cảnh, thực thể (loại, số lượng, màu, kích thước + nguồn `de`/`uoc_luong`, vai trò), quan hệ, số liệu, phép thử, `quay` theo cảnh. AI **không ghi tọa độ**; `thu_vien_3d/xep_cho.py` tự xếp chỗ theo kích thước thật và quan hệ (`xep_hang`, `luoi`, `tren`, `trong`, `canh`, `cach`), đoạn đo lấy từ hộp bao đúng số đo của đề.
- Thư viện tham số `thu_vien_3d/`: 33 mẫu vật (`vat.py`), 15 bối cảnh (`moi_truong.py`, có tự đặt mặt bàn cho vật nhỏ), danh mục tên tiếng Việt `danh_muc.json`, khớp theo danh từ chính (`khop.py`: "cái nêm chặn bánh xe" không thành ô tô). HDRI CC0 Poly Haven 1k trong `assets/hdri/`.
- Kiểm bám đề `scripts/kiem_bam_de.py` (JSON Schema + số lượng/màu/kích thước/trích dẫn/`khi_noi` đối chiếu đề và lời thoại, cảnh báo vật đề nhắc mà bỏ sót) chạy ở `canh_3d.py --kiem-kich-ban`; Apps Script có bản rút gọn `loiDacTaCanh_` (KiemTraHinh.gs) và hướng dẫn `huongDanDacTaCanh_` (PromptKichBan.gs). Sau dựng, AI nhìn ảnh ghép (`xem-truoc.png`) — thiếu thực thể chính hoặc sai bối cảnh thì dừng.
- Vật chưa có mẫu: `--tu-tao` nhờ Gemini ghép bộ phận trong khung chuẩn -> kiểm (khung, phủ, không mảnh lơ lửng) -> AI đối chiếu -> lưu `thu_vien_3d/sinh/` và gắn `bo_phan` vào kịch bản; không sinh được thì quay về đường dựng cũ. Kế hoạch cũ (`lap_ghep`, `vat`, `vuon`...) được gán bối cảnh theo `cau_chuyen.dia_diem` (`nang_cap_dinh_dang.py`).
- Có đặc tả thì cảnh mở đầu không còn bị đẩy sang "xe chạy trên đường" chỉ vì đề có chữ ô tô (chỉ giữ khi đề có luật chuyển động). Luồng hình học thuần gỡ/chặn `dac_ta_canh` (HinhHoc.gs, `kiem_hinh_hoc.py`).
- GitHub Actions ghim Blender chính thức 5.3.0 (cache) thay cho `apt` (4.0); cài `jsonschema pillow`; chạy `test_dac_ta_canh.py`.
- Dựng thử cục bộ: `python scripts/thu_dac_ta.py mau/kich_ban_trai_ca.json` (3 bể trụ hở có nước + cá, bác Ba, trại cá) và `mau/kich_ban_bai_xe.json` (4 xe đỏ + 3 xe trắng đỗ song song, bãi đỗ siêu thị), khoảng 25 s/đề ở chế độ xem trước. Bản cũ dừng ở đề trại cá và dựng nhầm đề bãi xe thành xe chạy. Chưa làm (giai đoạn D): hành động/góc máy theo từng cảnh trong Blender, phép thử nhiều vật trên Three.js.


### Lần 57 (v88) -- Giai đoạn D: góc máy & hành động theo từng cảnh, phép thử nhiều vật trên Three.js
- `chuanbi.py` thêm `props.canh[i].quay` từ `dac_ta_canh.quay[]` (góc máy, chuyển máy, tiêu điểm, hành động); mỗi hành động có mốc `t` = lúc giọng đọc bắt đầu cụm `khi_noi` (mốc từ thật, không có thì ước lượng theo câu), kéo dài cảnh đủ xem hành động cuối. Luồng hình học thuần trả `None` và `kiem_hinh_hoc.py` chặn `quay`/`nhipQuay`.
- `xep_cho.py` gắn `plan.quay` (lọc hành động trỏ vật không có); `canh_3d.py` dựng **mỗi cảnh mở đầu / cảnh đề có `quay` một kế hoạch Blender riêng** và ghi `props.nhipQuay` (mốc từng hành động); cảnh giải giữ góc cảnh 1 cho nét toán. Sửa kèm: cảnh mở đầu thứ 2 không còn rơi về đường dựng cũ ("thiếu mô hình"), báo lỗi ghi UTF-8.
- `ve_blender.py`: `goc_may` + `tieu_diem` vừa khung theo vật (`trung`/`can`/`theo_vat`), `chuyen_may` (`dung`, `luot_vao`, `luot_ngang`, `xoay_quanh`) với khung cuối luôn về góc chiếu; 16 + 6 khung/hành động (≤ 34); 12 động từ (`di_chuyen` tới vật, `roi`, `lay_ra`, `bo_vao`, `tung`, `lan`, `quay`, `rot_day` nước dâng, `mo`/`dong` nắp, `xep`, `danh_dau_chon`, `sang_len`). `VE_KHUNG=0,10,21` dựng thử vài khung.
- `CanhBlender.tsx`: `tienQuay` đặt khung Blender theo `nhipQuay` (đoạn đầu `dan` = 0,25 cho máy, mỗi hành động chạy đúng mốc `khi_noi`); cảnh đề có góc riêng chạy hết hành động rồi mới lấy nét sang 2D (`ChuyenLayNet`).
- Bài xác suất có đặc tả mà vật chính đều là đồ chơi xác suất -> `thu_vien_3d/phep_thu_nhieu.py` tạo `moiTruong {loai:'dac_ta'}`, **không cần Blender/Manim**; `CanhMoiTruong.tsx` dựng bối cảnh theo `boi_canh` (trong nhà theo loại phòng / ngoài trời) và nhiều vật cùng lúc (bình/hộp/cốc chứa theo quan hệ `trong`, bi, xúc xắc, xu, thẻ đánh số, bóng; đúng số lượng & màu từng bản sao), hành động theo mốc, trạng thái nối tiếp giữa các cảnh, máy quay theo góc/tiêu điểm.
- Mẫu & test: `mau/kich_ban_trai_ca_goc_may.json` (3 góc máy: lướt ngang + bác Ba đi tới bể, cận xoay quanh + nước dâng, trung đứng yên + bể sáng; ~43 s/cảnh với 3 khung), `mau/kich_ban_xac_suat_nhieu_vat.json` (hộp 3 đỏ + 2 xanh, xúc xắc, xu: lấy bi, gieo, tung, đánh dấu bi đỏ; chụp khung Remotion `--gl=swangle`). `thu_dac_ta.py --canh 1,2,3 --khung 0,10,21`; `test_dac_ta_canh.py` thêm 4 test giai đoạn D (25/25 đạt). Chưa dựng MP4 đầy đủ (chưa chạy Manim tại máy); `hien_so_lieu` của `quay` chưa hiển thị ở pha ảnh thật.

### Lần 58 -- Intro thương hiệu "nét vẽ hình học"
- `src/Intro.tsx` (mới): nét sáng vẽ đường tròn + tam giác nội tiếp kiểu Manim (đỉnh lóe màu phụ), thu nhỏ thành biểu tượng (có `logo.png` thì logo thay tam giác), tên kênh Montserrat hiện từng chữ bằng `spring` (nửa sau tô màu nhấn), gạch chân, khẩu hiệu Be Vietnam Pro; chuyển cảnh bằng mặt nạ tròn nở từ biểu tượng lộ cảnh đầu (dùng chung 2 luồng). Mặc định 2,8 s, sfx swoosh/click/ting.
- Cấu hình `phong_cach.json -> "intro"` (`bat`, `giay` 2–3,5, `chuyenGiay`, `mauNhan/mauPhu/mauNen`, `soTuNhan`, `dungLogo`, `amThanh`; `ten/khauHieu` trống = lấy theo `thuongHieu`). `chuanbi.py` (`tao_intro`) ghi `props.intro = {soFrame, chuyen, lech}` và cộng `lech` vào `tongFrame`; `Video.tsx` lùi nội dung `lech` khung, bỏ chớp trắng đầu và huy hiệu tên kênh đầu video khi có intro. Ảnh bìa (`AnhBia`) không dùng intro.
- Các tầng đọc mốc khung cộng thêm `intro.lech`: `kiem_duyet.mjs`, `anh_kiem_tra.py`, `kiem_tra_chuyen_dong.py`, lùi lớp Manim trong `dung-video.yml`; `manim_hinh.py` trừ `lech` khi đệm đuôi. Đã dựng thử 105 khung (`out/intro_thu.mp4`, `out/intro_moc.png`) trên bài mẫu; chưa chạy thử luồng Blender/Manim đầy đủ.

### Lần 59 (v89) -- Một hệ chữ, chống thụt dòng, phụ đề số & ký hiệu, chống lộ đáp án, bảng biến thiên
- Typography: toàn video chỉ dùng **Be Vietnam Pro** (`theme.ts`: `FONT`/`FONT_TIEU_DE`, thang `CO_CHU`, `SO_DEU` tabular-nums); DejaVu chỉ dự phòng ký hiệu. KaTeX: chữ số, dấu, chữ Việt = Be Vietnam 600 đứng, biến = Be Vietnam 700 nghiêng (`KieuToan` một kiểu duy nhất), dấu phẩy đạo hàm giữ KaTeX_Main.
- Chống thụt/cắt mép: `vua.ts` co bằng cỡ chữ thật (bỏ `scale` quanh tâm làm hộp tràn rồi bị cắt), `HopVua` tính MỘT cỡ chung cho cả hộp (`DanhSach`, `TheDeBai`), hàng danh sách flex căn trái, bề rộng cột chữ tính đúng (`boCucDanhSach.rongChu`). `Toan` tách công thức theo vế (`tachVe`) -> chỉ xuống dòng sau `=`/`⇒`, không ngắt giữa ngoặc hay `0 < x < 30`; dấu `:` sau chữ không còn khoảng trắng.
- Chữ & ký hiệu (`chu.ts`): `chuanDauCau` (bỏ `:`/`?` lẻ), `chuanTieuDe` ("V phẩy bằng zero" -> "V'(x) = 0", "mười cm" -> "10 cm"), khôi phục `\vdots`/`\frac`... bị JSON nuốt gạch chéo, `120\:\4` -> `120 ⋮ 4`, dấu `.` làm phép nhân -> `\cdot`, `29.50` -> `29,5`, `500,000 đồng` -> `500.000 đồng`, `inHoaGiuToan`. Intro: tên kênh khóa một dòng.
- Phụ đề tách khỏi văn đọc: `chuanbi.py` `hien_phu_de` đổi văn đọc về số/ký hiệu (`54π m³`, `1/4`, `x = 10`, `10 cm`), không cắt giữa cụm số, cụm toán nối bằng NBSP; `PhuDeTikTok` cỡ cố định, in hoa giữ ký hiệu toán, cảnh trước tắt phụ đề khi chồng chuyển cảnh. `chuan_hoa_doc` đọc đơn vị/`<`/`⋮`.
- Chống lộ đáp án: bỏ hook "nói trước kết quả" (`PromptKichBan.gs`, `HOOK_KIEU_`, `KIEU_HOOK_NC_`); `loHookDapAn_` + `tieuDePhienAm_` (KiemTraHinh.gs) chặn đáp số trong hook/tiêu đề/bìa và tiêu đề phiên âm. `moc_cong_thuc` khớp từng dòng (nội suy dòng thiếu), Canh không mốc thì bám câu đang đọc; `danh_sach.khi_noi_dong` -> `moc_dong`, `do_thi.khi_noi_diem` -> `moc_hien_diem` (cảnh đặt vấn đề hiện "?"), nhãn trục tung tách khỏi số vạch.
- Mới: vật `bang_bien_thien` (`src/sankhau/BangBienThien.tsx`, 3 hàng x / f'(x) / f(x), mũi tên SVG vẽ dần theo `khi_noi_dong`). Màn kết: có cảnh `bai_hoc` thì chỉ nhắc đáp án + kênh (3,2 s), không lặp gạch đầu dòng. `thuongHieu.tenTheoChuyenMuc` (phong_cach.json) đổi tên kênh theo chuyên mục.
- Kiểm chứng: `node scripts/thu_khung_v89.cjs` rồi `node scripts/chupKhung.mjs out/thu_v89/props.json out/thu_v89 120,300,460,610,790,950,1100` (dữ kiện đề, phân tích u·v, V'(x) = 0, đối chiếu miền, thẻ chia hết, bảng biến thiên, đồ thị "?"). Chưa xử lý: rác đồ họa cảnh xác suất bài 3 thẻ (cần JSON kịch bản), phụ đề bài hình học còn tên điểm đánh vần.
