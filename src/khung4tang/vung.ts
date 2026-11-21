// v90 — BỐ CỤC 4 TẦNG CỐ ĐỊNH (1080×1920). Bốn vùng cứng không bao giờ đè nhau; mỗi vùng tự cắt phần tràn.
// anToanTikTok (mặc định bật): chừa 14% đáy cho chữ mô tả/nút của TikTok (vùng này chỉ có lưới nền).
import {CAO, RONG} from '../theme';

export type Vung = {y: number; h: number};
export type BoCuc4Tang = {t1: Vung; t2: Vung; t3: Vung; t4: Vung; anToan: Vung; rong: number; le: number};

export function boCuc4Tang(anToanTikTok = true): BoCuc4Tang {
  const ranh = anToanTikTok
    ? [96, 288, 1036, 1536, 1650] // lề trên 5% | T1 10% | T2 39% | T3 26% | T4 6% | an toàn 14%
    : [0, 269, 1017, 1690, 1882]; // 14 / 39 / 35 / 10 (sát đáy)
  const v = (a: number, b: number): Vung => ({y: a, h: b - a});
  return {t1: v(ranh[0], ranh[1]), t2: v(ranh[1], ranh[2]), t3: v(ranh[2], ranh[3]), t4: v(ranh[3], ranh[4]), anToan: v(ranh[4], CAO), rong: RONG, le: 44};
}
