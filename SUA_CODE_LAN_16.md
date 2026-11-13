# Sửa code lần 16: chuyển bước tự nhiên, chạy trên nhánh mới, hẹn giờ đăng, nâng chất lượng

## 1. Chuyển giữa các bước tự nhiên hơn

| Trước | Bây giờ |
|---|---|
| Mỗi cảnh xoay vòng 4 kiểu chuyển (trượt, phóng, lướt ngang, lật 3D) bất kể nội dung | Chọn theo mạch bài: cùng một bước thì **hòa tan mềm**; sang bước mới thì trôi lên nhẹ; cái bẫy và đáp án mới phóng xuyên để tạo kịch tính |
| Cảnh cũ tắt hẳn rồi cảnh mới mới hiện (có khoảng trống) | Cảnh cũ ở lại 8 khung hình, **mờ dần trong lúc cảnh mới hiện lên** |
| Dải màu quét ngang màn hình ở mọi chỗ nối | Chỉ còn vòng sáng ở khoảnh khắc sang cái bẫy và đáp án (`phong_cach.json`: `"lopQuet": "luon"` để quét như cũ) |
| Tiếng "vút" ở mọi cảnh, tiếng "tách" dồn dập | Tiếng chuyển rất nhẹ và chỉ khi sang bước mới; tiếng "tách" nhỏ hơn và bỏ khi các dòng hiện quá sát nhau |
| Khoảng lặng cố định giữa mọi cảnh | Nghỉ theo ngữ cảnh: cảnh nối tiếp gần như liền mạch; trước cái bẫy/đáp án lặng thêm một nhịp; cuối video để đọng lại |
| Lời thoại "Bước một:", "Cái bẫy ở đây là..." | Lời nhắc bắt AI viết **câu nối** từ ý cảnh trước. Bộ kiểm tra từ chối kịch bản có từ 2 cảnh mở đầu máy móc, hoặc lặp một kiểu mở đầu từ 3 lần |
| Nhạc nền giảm/tăng nhanh (nghe phập phồng) | Giảm nhạc mềm hơn; ở quãng nghỉ nhạc dâng lên nối hai bước |

## 2. GitHub chạy đúng mã của nhánh mới

Trước đây Apps Script dùng `repository_dispatch`: GitHub luôn chạy mã của nhánh mặc định (master), nên video vẫn ra chất lượng cũ.
Bây giờ BoPhan2.gs gửi `workflow_dispatch` kèm **ref = nhánh trong CAU_HINH > `GITHUB_NHANH`**. Mặc định là `claude/apps-script-system-debug-59sl2w`, không cần thêm dòng này vào sheet.
Nếu token chưa đủ quyền, hệ thống tự lùi về cách cũ (vẫn dựng được) và báo Zalo một lần.

**Việc cần làm: cấp thêm quyền cho token GitHub.** Vào GitHub > Settings > Developer settings > Fine-grained tokens > chọn token đang dùng (`GITHUB_TOKEN` của Apps Script) > Repository permissions > **Actions: Read and write** > Update.

## 3. Hẹn giờ tự đăng YouTube, Facebook, TikTok

- Trigger `chayDangVideo` chạy 15 phút một lần. Đến khung giờ `GIO_DANG` (giờ Việt Nam), hệ thống lấy video "Có video" cũ nhất (đề Zalo ưu tiên trước) và đăng lên các nền tảng trong `NEN_TANG_DANG`.
- Muốn hẹn giờ riêng cho một video: gõ `20/11/2026 19:30` vào cột `lich_dang` của dòng đó trong HANG_DOI.
- **YouTube** đăng thẳng từ Apps Script. **Facebook và TikTok** do GitHub đăng; mã truy cập nằm trong GitHub Secrets.
- Đăng xong: trạng thái "🌐 Đã đăng", cột `link_dang` chứa link, Zalo báo cho bạn.
- Nền tảng lỗi được thử lại ở khung giờ sau (tối đa `SO_LAN_THU_DANG` lần); nền tảng đã đăng được thì không đăng lại. Nền tảng chưa cài đặt thì bỏ qua, không tính là lỗi.
- Tiêu đề lấy từ kịch bản (YouTube có thêm `#shorts`). Mô tả gồm câu móc, đề bài, phần ghi nhớ và hashtag. Mô tả **không lộ đáp án**.
- Menu 🎬 Video AI có thêm mục **📤 Đăng ngay video cũ nhất chờ đăng** (hoặc chạy hàm `dangNgay`).

### Cài đặt
1. Dán `DangVideo.gs` (tệp mới) và thay `BoPhan1.gs`, `BoPhan2.gs`, `PromptKichBan.gs`, `KiemTraHinh.gs`. `Zalo.gs` giữ nguyên.
2. **Triển khai > Quản lý các lượt triển khai > Chỉnh sửa > Phiên bản mới > Triển khai.** Bắt buộc, vì doPost và doGet đã đổi.
3. Chạy **`caiDatDangVideo`** một lần. Hàm này đặt trigger và thêm các dòng cấu hình vào sheet CAU_HINH:

   | khoa | gia_tri mặc định | ý nghĩa |
   |---|---|---|
   | DANG_TU_DONG | TAT | đổi thành **BAT** khi đã cài xong tài khoản |
   | GIO_DANG | 11:30,19:30 | các khung giờ đăng mỗi ngày |
   | NEN_TANG_DANG | youtube,facebook,tiktok | bỏ bớt nền tảng chưa dùng |
   | YOUTUBE_CHE_DO | public | public / unlisted / private |
   | YOUTUBE_CACH | apps_script | đổi thành `github` nếu video lớn hơn 48 MB (cần thêm YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN vào GitHub Secrets) |

**YouTube**
- Trong trình soạn thảo Apps Script, bấm **Dịch vụ (+) > YouTube Data API v3 > Thêm**.
- Chạy `dangNgay` một lần để cấp quyền; chọn đúng tài khoản Google sở hữu kênh.
- ⚠️ YouTube có thể khóa video đăng qua API ở chế độ **riêng tư** khi dự án API chưa được Google kiểm định (quy định từ 2020). Nếu video lên kênh mà bị khóa riêng tư, cần gửi biểu mẫu "YouTube API Services – Audit and Quota Extension". Trong lúc chờ, video vẫn lên kênh và bạn có thể bấm công khai bằng tay.

**Facebook (Trang)**
1. Vào developers.facebook.com, tạo ứng dụng loại "Doanh nghiệp". Bạn là quản trị viên nên đăng lên Trang của chính bạn không cần duyệt.
2. Mở **Graph API Explorer**, chọn ứng dụng, cấp các quyền `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, rồi lấy mã người dùng.
3. Vào **Access Token Debugger**, bấm "Extend Access Token" để đổi sang mã dài hạn.
4. Gọi `/me/accounts` để lấy `access_token` của Trang. Mã Trang lấy từ mã người dùng dài hạn sẽ không hết hạn.
5. Thêm GitHub Secrets **`FB_PAGE_ID`** (ID Trang) và **`FB_PAGE_TOKEN`**.

Video ngắn hơn hoặc bằng 90 giây đăng dạng Reels; dài hơn đăng thành video thường của Trang.

**TikTok**
1. Vào developers.tiktok.com, tạo ứng dụng, thêm **Login Kit** và **Content Posting API**.
2. Ở mục Redirect URI, thêm địa chỉ web app `/exec` (dòng WEB_APP_URL của CAU_HINH).
3. Thêm GitHub Secrets **`TIKTOK_CLIENT_KEY`** và **`TIKTOK_CLIENT_SECRET`**. Thêm cả 2 dòng cùng tên vào sheet CAU_HINH.
4. Chạy **`layLinkDangNhapTikTok`**, mở liên kết trong nhật ký, đăng nhập TikTok và bấm Đồng ý. Mã được lưu vào Drive `VIDEO_XACSUAT/bi_mat/tiktok_token.json` và GitHub tự đọc từ đó.

⚠️ Khi ứng dụng TikTok **chưa qua kiểm duyệt của TikTok**, video đăng qua API chỉ ở chế độ **riêng tư (chỉ mình tôi)**.
- Muốn công khai: gửi ứng dụng cho TikTok duyệt.
- Trong lúc chờ: đặt GitHub Variable **`TIKTOK_CHE_DO = nhap`**. Video vào hộp thư nháp của ứng dụng TikTok và bạn chỉ cần bấm Đăng.

## 4. Nâng chất lượng video
- **Giọng có sắc thái:**
  - Mỗi cảnh có `giong_doc` (ví dụ "hạ giọng, cảnh báo", "phấn khích, chậm lại ở đáp số"), gửi kèm cho Gemini TTS.
  - Không có thì máy tự chọn theo loại cảnh.
  - Phong cách chung được viết lại: nói như trò chuyện, có nụ cười trong giọng, ngừng ngắn trước con số quan trọng.
- **Nhạc theo diễn biến bài:** 4 bản cùng nhịp 120 BPM.
  - `nhe`: đề bài, kiến thức, bài học.
  - `chinh`: mở đầu, tính toán.
  - `cang`: cái bẫy, có nền trầm rung hồi hộp.
  - `bung`: đáp án.
  - Bản được đổi đúng ranh giới ô nhịp và hòa chéo, nên nghe như một bản nhạc có cao trào.
  - Nhạc riêng của bạn trên Drive (thư mục `nhac`) vẫn được ưu tiên.
  - Muốn tắt nhạc theo cảnh: GitHub Variable `NHAC_THEO_CANH = 0`.
- **Thẻ dữ kiện:** kịch bản có `du_kien` (2-4 dữ kiện như "V = 32 m³", "Không nắp"), hiện thành hàng thẻ nhỏ trên đầu màn hình suốt phần giải. Người xem lướt vào giữa video vẫn biết đề hỏi gì.
- **Kịch bản mẫu** (`mau/kich_ban_thuc_te.json`, `mau/kich_ban_mau.json`) đã viết lại theo cách nối mới.
