# Lần 25: Đề đúng, hình đúng, chữ thống nhất + bộ hiệu ứng mới là mặc định

## Lỗi trong video ZL261113-221631-30 (xếp 260 ống thép)
1. **Đáp số sai**: video ghi S₂₀ = 20·(3+22)/2 = 260, thật ra = 250. Đề này không có đáp án tròn (20 tầng = 250 ống, 21 tầng = 273 ống).
2. **Hình sai**: vẽ một khối trụ thay cho chồng ống (bộ kiểm tra cũ coi chữ "ống" khớp với hình trụ).
3. **Chữ lúc to lúc nhỏ**: nhãn dài bị thu nhỏ, ký hiệu "S_n" hiện thô, cỡ chữ trên hình đổi theo cỡ sân khấu của từng cảnh.

## Đã sửa (cho mọi đề)
| Vấn đề | Cách sửa |
|---|---|
| Đáp số không khớp đề | Người giải **bắt buộc thử ngược** đáp số vào mọi dữ kiện; đề không có đáp số khớp → ghi `de_co_van_de`, chọn cách hiểu hợp lý nhất (vd "20 tầng trọn vẹn, dư 10 ống"), **báo Zalo** cho người gửi, kịch bản phải nói thật điều đó như một phát hiện thú vị |
| Phép tính sai trên màn hình | **Máy tính lại mọi dòng** `A = B = C` (cả `≈`): vế số lệch là lỗi nặng, Gemini phải sửa ngay |
| Trọng tài | Chỉ chốt khi một đáp án **thắng rõ** (đáp án khác cao nhì < 3 phiếu hoặc kém ≥ 2 phiếu) |
| Đề xếp chồng (ống, lon, gạch...) | Bắt buộc vẽ **chồng vật xếp tầng** bằng nét mới `xep_chong`; không dùng khối trụ |
| Nét `xep_chong` | Vẽ như hình sách giáo khoa: tầng đông thì rút gọn (2 tầng trên, ⋮, 3 tầng dưới, tầng dưới tối đa 10 vật); dựng **đứng** trong 3D, ống nổi khối, máy xoay trái/phải |
| Chữ trên hình | **Cùng một cỡ** ở mọi cảnh (bù theo cỡ sân khấu), cỡ chữ nhãn bị giới hạn trong 0,85–1,2, nhãn toán hiện công thức thật, chữ dài **xuống dòng** thay vì thu nhỏ, không tràn ra mép |
| Nhãn quá dài | Bộ kiểm tra nhắc rút gọn (tối đa ~22 ký tự) |
| Công thức có phân số | Không còn tràn xuống phụ đề |
| Phong cách | `phong_cach.json` → `"chuyenDong": "moi"`: **mọi video** dùng bộ hiệu ứng mới (chữ 3 tầng, hình 3D đổi góc theo lời, vòng sóng, dấu BẪY, lóe sáng đáp án) |

Chạy thử tay: Actions → Dựng video → `kich_ban_ong_thep` (Drive: `ZL-mau-ong-thep.mp4`).

## Cần làm
Dán đè `BoPhan1.gs`, `KiemTraHinh.gs`, `PromptKichBan.gs` → Triển khai → Phiên bản mới. Phần dựng video tự cập nhật trên GitHub.
