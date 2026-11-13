# Sửa code lần 17: hình minh họa khớp đề

**Vấn đề:** đề "hòn đảo hình bông tuyết Koch" nhưng video vẽ một cái bể kính, vì bộ dựng chỉ có danh sách vật cố định (bể, trụ, tòa nhà, tam giác...). Gặp hình ngoài danh sách, AI phải chọn vật "gần giống".

## 1. Vật mới "hinh_tu_do": vẽ được mọi hình của đề
- **Nét cơ bản:** đa giác, đường gấp khúc, mũi tên, đường tròn, cung tròn, chữ/LaTeX, đường SVG tự do (bờ biển, sông, hình cong lạ).
- **Bộ sinh hình:** đa giác đều, **bông tuyết Koch**, **tam giác Sierpinski**, đường cong tham số (xoắn ốc, hình tim, quỹ đạo), nhân bản hình (hàng cây, bậc thang, hoa văn).
- **Hiệu ứng:** từng nét vẽ dần kiểu Manim. Fractal **mọc mượt từng bước lặp** (tam giác → ngôi sao → bông tuyết) bằng hành động `dat_gia_tri`. Hành động `chon` làm sáng một nét, `loai_bo` làm mờ nét bị bỏ.

## 2. AI viết kịch bản nhìn thấy ảnh đề
- Đề gửi qua Zalo: Gemini đọc ảnh và ghi thêm **mô tả hình chi tiết** (cột mới `mo_ta_hinh`). Khi viết kịch bản, Gemini **được xem chính ảnh đề** và nhận mô tả đó, để vẽ lại đúng số hình, hình dạng, màu, nhãn.
- Lời nhắc thêm mục **"Hình minh họa phải khớp đề gần như 100%"**: vẽ đúng mọi đối tượng của đề, cấm thay bằng vật gần giống, cho người xem thấy quy luật lặp chạy từng bước.

## 3. Bộ kiểm tra
- Đề có hình (ảnh kèm, mô tả hình, hoặc nhắc tới hình dạng cụ thể như tam giác, bông tuyết, parabol...): ít nhất một trong 3 cảnh đầu phải vẽ hình đó bằng `hinh_tu_do`, `hinh_hoc` hoặc `do_thi`. Vật 3D chỉ được tính khi đề nhắc đúng loại vật đó (đề nói bể/hộp thì vẽ bể được). Sai thì kịch bản bị trả về để AI viết lại.
- Kiểm tra dữ liệu từng nét: đủ tọa độ, svg hợp lệ, biểu thức tham số đọc được.

## Kịch bản mẫu
`mau/kich_ban_koch.json`: chính đề Koch bạn gửi, dựng lại đúng hình. Chạy thử: Actions > Dựng video > Run workflow > chọn `kich_ban_koch`.

## Cài đặt
Thay `BoPhan1.gs`, `PromptKichBan.gs`, `KiemTraHinh.gs`, và dán `ZaloDeBai.gs` đè lên tệp `Zalo.gs`. Sau đó **Triển khai > Phiên bản mới**. Cột mới `mo_ta_hinh` tự được thêm vào HANG_DOI.
