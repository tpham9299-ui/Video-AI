// v93 — HẰNG SỐ BỐ CỤC Intro móc câu / Outro tóm tắt (thuần TS, không React -> test Node đọc được).
// Mọi vùng có tọa độ cố định nên chữ không bao giờ đè vùng mô hình 3D; cỡ chữ tự co theo độ dài (ước lượng tất định).
import {emRa} from '../3d-vector/toan3d';
import type {MocCau} from './kieu';

export const INTRO_SAN = {y: 540, h: 748}; // vùng mô hình 3D lúc intro (cùng cao T2 -> trượt về T2 không đổi tỉ lệ)
export const GIAY_INTRO_MD = 5;
// thời lượng intro: trong [3,6 ; 5] giây và không quá 40% phần nội dung
export const giayIntro = (m: MocCau | null | undefined, tong: number) =>
  m ? Math.max(3.6, Math.min(m.giay || GIAY_INTRO_MD, GIAY_INTRO_MD, tong * 0.4)) : 0;
// mức "ra" của intro (0 -> 1) trong 0,6 s cuối: chữ tan, sân khấu về tầng 2, các tầng khác hiện vào
export const raIntro = (t: number, G: number) => (G > 0 ? emRa((t - (G - 0.6)) / 0.6) : 1);

export const RONG_CHU = 1080 - 2 * 64;
// Be Vietnam Pro 900 IN HOA: bề rộng trung bình ~0,68 em/ký tự (kể cả khoảng trắng) -> cỡ chữ vừa một dòng
export const coVua = (s: string, max: number, min: number, rong = RONG_CHU, he = 0.68) =>
  Math.max(min, Math.min(max, Math.floor(rong / (Math.max(1, s.length) * he))));

// tách tối đa 2 dòng, cắt ở khoảng trắng gần giữa nhất
export function haiDong(s: string, motDong = 16): string[] {
  const x = s.replace(/\s+/g, ' ').trim();
  if (x.length <= motDong || !x.includes(' ')) return [x];
  let tot = -1;
  for (let i = 0; i < x.length; i++) if (x[i] === ' ' && (tot < 0 || Math.abs(i - x.length / 2) < Math.abs(tot - x.length / 2))) tot = i;
  return [x.slice(0, tot), x.slice(tot + 1)];
}
export const coTieuDeIntro = (dong: string[]) => coVua(dong.reduce((a, b) => (b.length > a.length ? b : a), ''), 104, 56);

// Outro: đáp án | mô hình 3D | 3 dòng tóm tắt | nút lưu (đáy nút <= 1650: chừa 14% đáy cho TikTok)
export const VUNG_OUTRO = {dapAn: {y: 150, h: 230}, san: {y: 400, h: 600}, dong: {y: 1030, h: 120, cach: 16}, nut: {y: 1470}};
