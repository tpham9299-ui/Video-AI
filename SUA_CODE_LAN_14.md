# Cập nhật lần 14: bỏ phần chèn vào cuối video

- Video **kết thúc ngay sau cảnh bài học**: không còn chèn màn kết tự tạo, cũng không dùng tệp `outro.png` / `outro.mp4` trên Drive. Nhạc nền vẫn mờ dần ở 1,5 giây cuối cho êm.
- Thẻ "Theo dõi" giữa video cũng tắt theo mặc định, vì nó đè lên vùng chữ mô tả của TikTok.
- Phần "bài học rút ra" của kịch bản giờ được dùng ngay trong cảnh bài học cuối video (thẻ danh sách 3 điều cần nhớ).
- Huy hiệu logo và tên kênh ở góc trên vẫn giữ nguyên.

Muốn bật lại (trong `phong_cach.json`):
- `"thuongHieu": {"coManKet": true}`: chèn màn kết tự tạo. Thêm `"dungOutroRieng": true` để dùng tệp outro của bạn.
- `"loiMoiGiuaVideo": true`: hiện thẻ "Theo dõi" giữa video.

Apps Script: thay `PromptKichBan.gs` (chỉ đổi một câu mô tả). Không bắt buộc.
