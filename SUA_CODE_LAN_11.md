# Cập nhật lần 11: học từ 4 video dạy toán mẫu (chữ, khung, viết tay, các bước)

| Video mẫu | Kỹ thuật | Đã đưa vào |
|---|---|---|
| Chia kẹo Euler (29education) | Công thức hiện như đang gõ/viết, biến tô màu theo đối tượng (x cam, y xanh, z đỏ) | **Viết tay bằng bút chì**: dòng công thức kiểu `xep` lộ dần từ trái sang phải, bút chì chạy theo mép chữ rồi nhấc lên |
| Bài toán cái thang (xuong.toan) | Đáp án đóng **khung neon xanh phát sáng, hơi nghiêng**; nhãn giá trị màu cam | Khung đáp án mới: viền xanh neon vẽ dần, phát sáng, nghiêng nhẹ, nền xanh mờ đổ vào |
| Ô tô qua cổng (Trạm Toán) | Tiêu đề **IN HOA** đậm, từ khóa vàng; thẻ kem "Một câu cho cả dạng" | Tiêu đề cảnh IN HOA; **thẻ MẸO NHỚ màu kem** (thay khung chú thích viền vàng cũ), có mũi tên ⇒ giữa các dòng |
| Bắc cầu parabol (Trạm Toán) | **Thanh các bước** "HÌNH TRÒN ✓ · MỘT ĐIỂM ✓ · ĐƯỜNG THẲNG"; hình đặt trong **khung viền** | **Thanh các bước** ĐỀ BÀI → PHÂN TÍCH → CÁI BẪY → MẤU CHỐT → TÍNH → ĐÁP ÁN → GHI NHỚ (bước qua có ✓ xanh, bước hiện tại cam bật lên); **khung kính mờ quanh sân khấu** có góc neon vẽ dần |

Tùy chọn trong `phong_cach.json` (mặc định đều bật):
- `"thanhBuoc": false`: dùng lại nhãn cam thay cho thanh các bước.
- `"tieuDeInHoa": false`: tiêu đề cảnh viết thường.
- `"khungSanKhau": false`: bỏ khung quanh sân khấu.
- `"butChi": false`: viết công thức không có bút chì.

**Việc cần làm trên Apps Script:** thay `PromptKichBan.gs`. Lời nhắc được bổ sung: dòng công thức ngắn dùng `xep` để hiện kiểu viết tay, và tô màu biến theo vật trên sân khấu.
