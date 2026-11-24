// v99.7 — CẤU HÌNH TINH CHỈNH TẬP TRUNG: các thông số hay phải chỉnh sau khi xem video thật.
export const SFX_VOLUME = {whoosh: 0.12, pop: 0.10, ding: 0.16} as const;
// Độ phóng camera tối đa của SoDo2D (viewBox zoom vào thanh giằng).
export const CAMERA_ZOOM_MAX = 1.15;
// true: vẽ khung nét đứt mô phỏng vùng nút TikTok/Shorts để kiểm bố cục trong Remotion Studio. Render thật PHẢI để false.
export const HIEN_SAFE_ZONE_DEBUG = false;
// Vùng nút nền tảng (px, khung 1080x1920): cột nút mép phải nửa dưới, caption/thanh nhạc dưới đáy.
export const SAFE_DEBUG_PX = {phai: 140, duoi: 250} as const;
