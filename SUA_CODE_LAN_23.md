# Lần 23: Bộ phận 1 (giải đề + viết kịch bản) chạy trên GitHub

## Vì sao trước đây chậm và hay bị ngắt
- Mỗi lần chạy Apps Script tối đa 6 phút: một lần gọi Gemini có "suy nghĩ" mất 60-150 giây nên mỗi lần chỉ giải được 1 đề **hoặc** viết 1 kịch bản; viết kịch bản kèm vòng sửa lỗi thường bị cắt giữa chừng.
- Lịch chạy 60 phút/lần: bị cắt là phải chờ gần 1 tiếng.
- Gmail thường chỉ được ~90 phút chạy tự động mỗi ngày.

## Bây giờ
- Apps Script chỉ **điều phối**: gửi đề sang GitHub (workflow `bo-phan-1.yml`), mỗi lần chạy chỉ vài giây.
- GitHub chạy **nguyên mã** giải + kiểm chứng + viết + chấm + tự sửa kịch bản (`scripts/bophan1/chay_bp1.js` nạp đúng các tệp .gs),
  không giới hạn thời gian, **3 đề song song** (đề Zalo ưu tiên luôn gửi ngay), rồi gửi kết quả về Apps Script.
- Apps Script nhận kết quả → lưu kịch bản lên Drive → **gửi dựng video ngay** → gửi đề kế tiếp sang GitHub (không chờ trigger).
- Dựng video: tối đa 2 video thường cùng lúc (`SO_VIDEO_CUNG_LUC`), đề ưu tiên thêm một chỗ.
- **Dự phòng**: không gửi được sang GitHub, GitHub báo lỗi, hoặc quá 35 phút không trả lời → đề đó tự làm tại Apps Script như cũ.
- Trên sheet có trạng thái mới **⚙️ Đang giải trên GitHub**.

## Bạn cần làm
1. **GitHub → Settings → Secrets and variables → Actions → New repository secret**: tên `GEMINI_KEYS`, giá trị là các key Gemini
   (mỗi dòng một key). Không có thì GitHub dùng `GEMINI_API_KEY` (một key, dễ bị giới hạn tốc độ hơn).
2. Dán đè `BoPhan1.gs`, `BoPhan2.gs` lên Apps Script → Triển khai → Phiên bản mới.
3. Sheet CAU_HINH: `CHU_KY_CHAY_PHUT` = `15` rồi chạy `caiDatTrigger()` một lần.
4. (Tùy chọn) Kiểm tra key: GitHub → Actions → "Bộ phận 1 - giải đề và viết kịch bản" → Run workflow (để trống) → giải thử một đề mẫu.

## Cấu hình mới (CAU_HINH)
| Khóa | Mặc định | Ý nghĩa |
|---|---|---|
| `GIAI_TREN_GITHUB` | `BAT` | `TAT` = quay về làm tại Apps Script |
| `SO_DE_GITHUB_CUNG_LUC` | `3` | số đề GitHub xử lý song song |
| `SO_VIDEO_CUNG_LUC` | `2` | số video thường dựng song song |
