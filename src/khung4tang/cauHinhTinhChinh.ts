// v99.7 — CẤU HÌNH TINH CHỈNH TẬP TRUNG: các thông số hay phải chỉnh sau khi xem video thật.
export const SFX_VOLUME = {whoosh: 0.12, pop: 0.10, ding: 0.16} as const;
// Độ phóng camera tối đa của SoDo2D (viewBox zoom vào thanh giằng).
export const CAMERA_ZOOM_MAX = 1.15;
// true: vẽ khung nét đứt mô phỏng vùng nút TikTok/Shorts để kiểm bố cục trong Remotion Studio. Render thật PHẢI để false.
export const HIEN_SAFE_ZONE_DEBUG = false;
// Vùng nút nền tảng (px, khung 1080x1920): cột nút mép phải nửa dưới, caption/thanh nhạc dưới đáy.
export const SAFE_DEBUG_PX = {phai: 140, duoi: 250} as const;
// v100.1: vệt sáng quét ngang qua khối tiêu đề Intro (frame 8-26, 1 lần).
export const BAT_QUET_SANG_INTRO = true;
// v100.1: thanh viền trái chạy dài dần theo tiến độ bước đang giảng + vệt sáng mở thẻ giải mới.
export const BAT_THANH_TIEN_DO_THE = true;
// v100.2: sân khấu 2D — 2 vòng xung nhịp (sonar) khi điểm trọng tâm vừa xuất hiện (~18 frame, 1 lần).
export const BAT_XUNG_NHIP_DIEM = true;
// v100.2: dải sáng nghiêng lướt qua mặt phẳng đang nhấn (clipPath theo đa giác, ~16 frame, 1 lần).
export const BAT_QUET_MAT_PHANG = true;
// v100.2: đầu bút phát sáng chạy theo đầu mút nét đang kẻ (0 < tiến độ < 1).
export const BAT_DAU_BUT_VE = true;
// v101.2: hình không gian — độ tô mặt phẳng đang giảng (0.22–0.26), độ mờ cạnh/mặt phụ ngoài trọng tâm (0.30–0.42), dải sáng quét mặt phẳng.
export const DO_TO_MAT_PHANG_KG = 0.24;
export const DO_MO_CANH_PHU_KG = 0.35;
export const BAT_QUET_MAT_PHANG_KG = true;
// v100.3: ThanhDe — ~1 giây trước mốc mở khóa đáp án: ô "?" nhấp sáng 1 nhịp + nhãn "Bạn ra mấy?" (biến mất đúng mốc mở khóa).
export const BAT_NHIP_HOI_HOP_DAP_AN = true;
// v100.3: OutroTomTat — thẻ nhắc Lưu/Chụp màn hình + thanh CTA viên thuốc chọn câu gợi bình luận theo dạng bài.
export const BAT_CTA_THONG_MINH_OUTRO = true;
