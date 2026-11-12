# Thương hiệu và màn kết (giống video mẫu)

Video mẫu có: logo + tên trung tâm + khẩu hiệu ở đầu, logo mờ lớn phía sau nội dung, tên kênh nhỏ ở góc dưới, và một màn kết quảng bá ở cuối. Tất cả đều **tùy chọn**: không cấu hình thì không hiện gì.

## 1. Tệp trên Google Drive
Tạo thư mục **`VIDEO_XACSUAT/thuong_hieu`** (đổi bằng biến `DRIVE_THUONG_HIEU` trên GitHub) và bỏ vào:
- `logo.png` (nền trong suốt, nên là logo màu trắng hoặc sáng vì nền video tối). Dùng cho phần đầu video và hình mờ phía sau.
- `outro.png` hoặc `outro.mp4`: màn kết phủ kín màn hình 1080×1920 (ảnh hoặc video; video dài 2 đến 12 giây, tắt tiếng). Mẫu: màn "Lộ trình ... / Đăng ký học thử qua link bio".

## 2. Chữ trong `phong_cach.json`
```json
"thuongHieu": {
  "ten": "TRUNG TÂM LUYỆN THI ...",
  "khauHieu": "Vững nền tảng - Chắc tư duy",
  "handle": "@ten_kenh",
  "markNuoc": true,
  "outroGiay": 5
}
```
`ten` và `khauHieu` hiện cạnh logo ở góc trên bên trái; `handle` ở góc dưới bên phải; `markNuoc` bật/tắt logo mờ lớn; `outroGiay` là thời lượng màn kết nếu là ảnh.

## 3. Các tùy chỉnh giao diện khác
| Khóa | Giá trị | Ý nghĩa |
|---|---|---|
| `kieuNen` | `luoi` (mặc định), `luoi_phang`, `gradient` | nền lưới phối cảnh như video mẫu / lưới phẳng / nền chuyển màu |
| `kieuToan` | `latex` (mặc định), `dong_nhat` | công thức phông LaTeX có chân như Manim / cùng phông không chân với chữ |
| `kieuHinh` | `manim` (mặc định), `that` | hình nét phẳng vẽ dần / xúc xắc, xu, bài 3D |
| `phuDe` | `true`, `false` | bật tắt phụ đề chạy theo giọng |
| `thanhTienDo` | `true`, `false` | thanh tiến độ ở đầu video |
