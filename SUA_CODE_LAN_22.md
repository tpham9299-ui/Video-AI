# Lần 22: Dựng song song trên nhiều máy GitHub

## Vì sao
Đo lần chạy #57: tổng ~12,5 phút, trong đó **~11 phút là bước dựng hình** (một máy GitHub chỉ dựng 2 khung hình cùng lúc).

## Cách làm mới (chỉ đổi phía GitHub, KHÔNG cần sửa Apps Script)
Workflow `dung-video.yml` chia thành 3 tầng:

| Tầng | Việc |
|---|---|
| `chuan_bi` | giọng đọc, nhạc, đóng gói Remotion, ảnh bìa, chia video thành khúc |
| `dung_khuc` (×4 máy cùng lúc) | mỗi máy dựng 1 khúc: hình H.264 + tiếng AAC căn khung (cơ chế Remotion Lambda dùng) |
| `ghep` | ghép các khúc **không mã hóa lại** (vài giây), ảnh kiểm tra, tải lên Drive, báo về Apps Script |

- Đã thử trên máy: ghép 3 khúc so với dựng 1 lần → tiếng ở chỗ nối **trùng từng mẫu**, hình chỉ lệch nhiễu mã hóa (0,08/255).
- Khung 0 vẫn là ảnh bìa (TikTok), ảnh kiểm tra 4 khung vẫn gửi cho AI chấm.
- Dựng lỗi ở bất kỳ máy nào thì máy ghép vẫn báo "lỗi + link nhật ký" về Apps Script như cũ.

## Tùy chỉnh (GitHub → Settings → Secrets and variables → Actions → Variables)
- `SO_MAY_DUNG` = số máy dựng cùng lúc (mặc định **4**, tối đa 10). Video ngắn tự chia ít khúc hơn (mỗi khúc ≥ 5 giây).
- `SO_MAY_DUNG = 1` → quay về dựng trên 1 máy.

## Lưu ý về số phút GitHub
Repo **công khai**: miễn phí không giới hạn. Repo **riêng tư**: gói miễn phí 2000 phút/tháng và mỗi máy tính tròn lên theo phút,
nên một video tốn khoảng 18–20 phút-máy (trước ~13) dù chờ ngắn hơn nhiều. Nếu sắp hết phút, đặt `SO_MAY_DUNG = 2`.

## Tệp mới / đổi
- `scripts/dung_khuc.mjs`: dựng một khúc.
- `scripts/ghep_khuc.mjs`: kiểm tra đủ khúc liền nhau rồi ghép.
- `scripts/anh_kiem_tra.py`: ghép ảnh bằng Pillow (máy ghép dùng ffmpeg rút gọn của Remotion, không cần cài ffmpeg).
- `.github/workflows/dung-video.yml`: 3 tầng; cài công cụ chạy song song; lưu sẵn trình duyệt dựng hình (cache).
