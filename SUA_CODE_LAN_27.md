# Sửa code lần 27: hiểu dấu ba chấm + tách vật 3D với chú thích

## 1. Dấu ba chấm ("…", "⋮", "⋯") trong hình đề
Ba chấm có nghĩa là "còn nhiều phần giống quy luật bị lược đi". Nó không phải hình vẽ.
- **Đọc đề (ZaloDeBai.gs):** `mo_ta_hinh` phải ghi rõ ba chấm thay cho cái gì. Ví dụ: "⋮ ở giữa là các tầng 4 đến 18 bị lược, mỗi tầng hơn tầng trên 1 ống".
- **Kịch bản (PromptKichBan.gs):** cấm vẽ lại ba chấm. Phần bị lược phải dựng bằng nét có quy luật:
  - chồng tầng → `xep_chong`, có đủ `hang` và `ten_tang`;
  - dãy hình lặp → `lap`;
  - dãy số → `danh_sach` hoặc `so_dem` chạy số.
  Lời thoại phải nói rõ phần bị lược.
- **Kiểm tra (KiemTraHinh.gs):** thêm lỗi nặng `VE_LAI_BA_CHAM_CANH_n` khi kịch bản vẽ ba chấm bằng chữ hoặc bằng 3 chấm tròn nhỏ trở lên. Lỗi này buộc Gemini sửa kịch bản.
- **Hình ảnh (hinhtudo.tsx):** khoảng rút gọn của `xep_chong` có 3 phần:
  - 4 hàng ống mờ trôi xuống liên tục, cho cảm giác "còn rất nhiều tầng";
  - ngoặc nhọn tự vẽ ra, kèm nhãn "+15 tầng";
  - khi `dem_tang`, số ống chạy nhanh "5 → 19" ngay dưới nhãn.

## 2. Phân biệt vật thật (3D) và chú thích (phẳng)
- **Vật thật** (ống, khối, mảnh hình tô màu): dựng 3D có bề dày, xoay theo góc máy.
- **Chú thích** (nhãn số đo, "Tầng 1", số đếm, ngoặc, công thức, `nhan`, `chu`, `so_dem`, `danh_sach`): vẽ ở lớp riêng, luôn phẳng và quay mặt về người xem. Lớp này được đặt đúng điểm chiếu trên hình 3D, nên chữ không bị nghiêng hay méo.
- Áp dụng cho cả góc nhìn nằm (`chieuNam`) và dựng đứng (`chieuDung`, hàm mới).
- Prompt dặn rõ: vật thật thì tô màu, nét dày; chú thích thì dùng `chu`/`nhan`/`mui_ten`.

## Cần làm phía Apps Script
Dán lại các file **ZaloDeBai.gs**, **PromptKichBan.gs**, **KiemTraHinh.gs**, rồi chọn Triển khai → Quản lý → Phiên bản mới.
