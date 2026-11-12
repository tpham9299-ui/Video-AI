// Hàm chuyển động dùng chung cho sân khấu (thuần, không phụ thuộc React).
import {MAU_TEN} from '../bocuc';

export const kep = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const tienDo = (t: number, bd: number, dur: number) => kep((t - bd) / Math.max(0.001, dur));
export const easeOut = (p: number) => 1 - Math.pow(1 - kep(p), 3);
export const easeInOut = (p: number) => {
  const x = kep(p);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
// bật lên có vượt nhẹ (back-out) như hiệu ứng "pop" trong video mẫu
export const popOut = (p: number, manh = 1.7) => {
  const x = kep(p);
  const c3 = manh + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + manh * Math.pow(x - 1, 2);
};
// dao động tắt dần (rung, nảy)
export const nay = (p: number, lan = 3) => Math.abs(Math.sin(kep(p) * Math.PI * lan)) * (1 - kep(p));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// Bảng màu neon (sáng hơn bảng Manim để nổi trên nền tối, giống video mẫu: xanh lá neon + cam).
export const NEON: Record<string, string> = {
  xanh_la: '#3BF29A', cam: '#FF8A3D', do: '#FF5C61', xanh_duong: '#4FC3F7', vang: '#FFD54A', tim: '#B79CFF',
  hong: '#FF7EB6', trang: '#F4F7F6', xam: '#8F9C9B', nau: '#D19A66', ngoc: '#45E3C8', den: '#2B3433',
};
export const neon = (ten: string, mac = NEON.xanh_la) => NEON[ten] || (MAU_TEN[ten] ? MAU_TEN[ten] : mac);
export const NEN_VAT = 'rgba(12,26,25,0.94)';
export const NEN_VAT_2 = 'rgba(22,40,38,0.96)';
export const VONG_MAU = ['xanh_la', 'cam', 'xanh_duong', 'vang', 'tim', 'do', 'ngoc', 'hong'];

export function ngauNhien(hat: number): () => number {
  let a = hat | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const bamChuoi = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
