// v97 — hàm thuần + hằng vùng của bố cục tối giản hình không gian (test Node đóng gói được, không React).
import {BuocGiai} from './kieu';
import {AN_TOAN, Vung} from './vung';

const RA_TIEU_DE = 6 / 30; // = TangTieuDe.RA_TIEU_DE (khối công thức của bước mới chờ tiêu đề cũ ra hết)
const CAO = 1920;
export const VUNG_TOI_GIAN = {
  t1: {y: AN_TOAN.y0, h: 86} as Vung, // 212..298
  t2: {y: Math.round(CAO * 0.16), h: Math.round(CAO * 0.62) - Math.round(CAO * 0.16)} as Vung, // 307..1190 (883 px)
  t3: {y: 1206, h: 290} as Vung, // 1206..1496
  phuDe: 1508, // dải phụ đề 50 px: 1508..1558 (< 1574 = Bottom 18 %)
};

// mốc HIỆN của thẻ = lúc dòng đầu tiên tới mốc (vỏ và nội dung vào cùng lúc -> không có thẻ trống)
export const tHienThe = (b: BuocGiai, j: number): number => {
  const th = b.the[j];
  const t0 = th.t !== undefined ? th.t : b.t + 0.35 + j * 0.7;
  const m0 = th.loai === 'cong_thuc' && th.moc && th.moc.length ? th.moc[0] : t0;
  return Math.max(t0, m0, b.t + RA_TIEU_DE);
};
// thẻ đang giảng tại t: thẻ cuối cùng đã hiện của bước (null = chưa có thẻ nào tới mốc)
export function theDangGiang(b: BuocGiai, t: number): {j: number; t0: number} | null {
  let ra: {j: number; t0: number} | null = null;
  b.the.forEach((_, j) => { const t0 = tHienThe(b, j); if (t >= t0 && (!ra || t0 >= ra.t0)) ra = {j, t0}; });
  return ra;
}

