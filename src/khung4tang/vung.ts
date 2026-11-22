// v90 — BỐ CỤC 4 TẦNG CỐ ĐỊNH (1080×1920). Bốn vùng cứng không bao giờ đè nhau; mỗi vùng tự cắt phần tràn.
// v96 — VÙNG AN TOÀN TIKTOK 4 CẠNH (SAFE_ZONE_TIKTOK): nội dung quan trọng (tiêu đề góc trên, thẻ rút mẫu, số liệu cuối nhánh,
// nhãn trục) nằm trong Top >= 11 % (dưới thanh tìm kiếm / LIVE), Right >= 12 % (tránh cột Tim / Bình luận / Lưu / Chia sẻ),
// Bottom >= 18 % (tránh caption + thanh nhạc đáy). Ngoài vùng này chỉ còn lưới nền / logo trang trí.
import {CAO, RONG} from '../theme';

export const SAFE_ZONE_TIKTOK = {tren: 0.11, phai: 0.12, duoi: 0.18, trai: 0.04} as const;
// tọa độ pixel của vùng an toàn (làm tròn lên phía trong)
export const AN_TOAN = {
  x0: Math.ceil(RONG * SAFE_ZONE_TIKTOK.trai), // 44
  x1: Math.floor(RONG * (1 - SAFE_ZONE_TIKTOK.phai)), // 950
  y0: Math.ceil(CAO * SAFE_ZONE_TIKTOK.tren), // 212
  y1: Math.floor(CAO * (1 - SAFE_ZONE_TIKTOK.duoi)), // 1574
} as const;
// bề rộng khung nội dung (từ mép trái tới ranh phải 12 %); các tầng đặt left 0, width RONG_ND -> phần tử neo `right` tự tránh cột nút
export const RONG_ND = AN_TOAN.x1;

export type Vung = {y: number; h: number};
export type BoCuc4Tang = {t1: Vung; t2: Vung; t3: Vung; t4: Vung; anToan: Vung; rong: number; le: number};

export function boCuc4Tang(anToanTikTok = true): BoCuc4Tang {
  const ranh = anToanTikTok
    ? [AN_TOAN.y0, 398, 1046, 1472, AN_TOAN.y1] // T1 186 | T2 648 | T3 426 | T4 102 — trọn trong [11 %, 82 %] chiều cao
    : [0, 269, 1017, 1690, 1882]; // 14 / 39 / 35 / 10 (sát đáy)
  const v = (a: number, b: number): Vung => ({y: a, h: b - a});
  return {t1: v(ranh[0], ranh[1]), t2: v(ranh[1], ranh[2]), t3: v(ranh[2], ranh[3]), t4: v(ranh[3], ranh[4]), anToan: v(ranh[4], CAO), rong: anToanTikTok ? RONG_ND : RONG, le: 44};
}

// kiểm một hình chữ nhật (tọa độ toàn khung) có nằm trọn trong vùng an toàn không (test_san_khau_2d.mjs, kiem_duyet)
export const trongAnToan = (x: number, y: number, w: number, h: number) =>
  x >= AN_TOAN.x0 - 0.5 && y >= AN_TOAN.y0 - 0.5 && x + w <= AN_TOAN.x1 + 0.5 && y + h <= AN_TOAN.y1 + 0.5;
