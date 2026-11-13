# Lần 26: Vật thể chuyển động sinh động + kịch bản tả chuyển động

## Các sửa ở lần 25 áp dụng cho MỌI đề (không riêng bài ống thép)
- Thử ngược đáp số + phát hiện đề có vấn đề: trong lời nhắc GIẢI của mọi đề.
- Máy tính lại mọi phép tính trên màn hình: chạy trên MỌI kịch bản trước khi lưu.
- Luật vẽ đúng hình đề (xếp chồng, hình có trong đề): áp cho mọi đề có hình.
- Cỡ chữ cố định, nhãn toán, chữ không tràn: ở bộ dựng, áp cho mọi video.

## Chuyển động mới (máy tự làm, không cần kịch bản viết)
| Hình | Hiệu ứng tự động |
|---|---|
| Chồng vật `xep_chong` | **Xếp từng tầng** từ dưới lên: mỗi tầng rơi xuống, nảy nhẹ khi chạm |
| Hình tô màu (đa giác, bông tuyết...) | Vẽ nét → tô màu → **mọc dày dần thành khối 3D** |
| Vật 3D (hộp, trụ, nhà...) | Mọc lên + **lơ lửng rất nhẹ**, mỗi vật một nhịp |

## Hành động mới kịch bản điều khiển (khớp từng ý lời thoại)
| Hành động | Dùng cho |
|---|---|
| `bien_hinh {chi_so, dx, dy, goc, ti_le}` | **Cắt ghép hình** (đưa mảnh sang chỗ khác), **lật đối xứng**, xoay mảnh, thu/phóng; không ghi chi_so = cả vật (vật thường: dời theo % sân khấu) |
| `tach {gia_tri}` / `ghep` | Các phần của hình **tách rời** cho thấy cấu tạo, rồi **ghép lại** |
| `dem_tang` | Chồng vật hiện **số vật từng tầng** lần lượt (3, 4, 5...) |
| (sẵn có) `dat_gia_tri`, `di_chuyen`, `chon`, `loai_bo`, `sang`, `rung` | nước dâng, fractal mọc, điểm chạy đồ thị, vật đi tới, làm nổi bật, gạch bỏ... |

## Kịch bản bắt buộc tả chuyển động
- Lời nhắc: mỗi cảnh có hình phải có **ít nhất 2 hành động** ở các bước khác nhau, khớp lời thoại; `mo_ta` phải tả rõ vật chuyển động thế nào.
- Bộ kiểm tra: cảnh có hình mà gần như đứng yên → Gemini phải thêm chuyển động.

## Cần làm
Dán đè `KiemTraHinh.gs`, `PromptKichBan.gs` → Triển khai → Phiên bản mới.
