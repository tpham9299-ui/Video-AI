// v99.1 — 5 bộ nền khí quyển động cho Khung 4 tầng (thay nền đen đồng màu). Hàm THUẦN (test được không cần Remotion).
// Chọn theme: chuanbi.py khung4tang_v99.chon_theme (dạng toán / hash mã đề) -> props.khung4tang.theme.
// Ràng buộc: chữ chính #E9EEF5 trên MỌI điểm sáng nhất của nền (kể cả quầng sáng) đạt tương phản >= 7:1 (test_v99_1.mjs).

export type TenTheme = 'deep_ocean' | 'cosmic_indigo' | 'emerald_studio' | 'warm_slate' | 'blueprint';
export type HoaTiet = 'song' | 'tinh_van' | 'studio' | 'phan' | 'ban_ve';

export type ThemeV99 = {
  ten: TenTheme;
  tren: string; // gradient nền: đỉnh
  giua: string; // giữa (vùng T2)
  duoi: string; // đáy
  quang: string; // màu quầng sáng chính (vẽ với độ đục quangMo)
  quangMo: number;
  vien: string | null; // ánh viền (hổ phách đêm: cam đồng trầm ở 2 mép)
  hoaTiet: HoaTiet;
  net: string; // màu nét họa tiết (vẽ với độ đục rất thấp)
  sangNhat: string; // màu sáng nhất có thể xuất hiện sau chữ (đã cộng quầng) - dùng để kiểm tương phản
};

export const CHU_CHINH = '#E9EEF5';

export const THEME_V99: Record<TenTheme, ThemeV99> = {
  deep_ocean: {ten: 'deep_ocean', tren: '#051427', giua: '#08263A', duoi: '#0A2E36', quang: '#3FD0E0', quangMo: 0.13, vien: null,
    hoaTiet: 'song', net: '#7FE3EE', sangNhat: '#0F3A4A'},
  cosmic_indigo: {ten: 'cosmic_indigo', tren: '#0F0A28', giua: '#141236', duoi: '#0A1840', quang: '#8E7CFF', quangMo: 0.14, vien: null,
    hoaTiet: 'tinh_van', net: '#C9C2FF', sangNhat: '#262055'},
  emerald_studio: {ten: 'emerald_studio', tren: '#041C17', giua: '#082822', duoi: '#0A2A26', quang: '#F2C14E', quangMo: 0.085, vien: null,
    hoaTiet: 'studio', net: '#9FE7CF', sangNhat: '#1E3A2C'},
  warm_slate: {ten: 'warm_slate', tren: '#161D22', giua: '#1A2227', duoi: '#1C2326', quang: '#FFD9B0', quangMo: 0.06, vien: '#C77B3E',
    hoaTiet: 'phan', net: '#E8E2D6', sangNhat: '#2A2C2C'},
  blueprint: {ten: 'blueprint', tren: '#081A3A', giua: '#0B2350', duoi: '#0C2856', quang: '#7FB8FF', quangMo: 0.12, vien: null,
    hoaTiet: 'ban_ve', net: '#A9CCFF', sangNhat: '#173A72'},
};

export const DS_THEME = Object.keys(THEME_V99) as TenTheme[];

export const layTheme = (ten?: string | null): ThemeV99 | null => (ten && ten in THEME_V99 ? THEME_V99[ten as TenTheme] : null);

// ---------- tương phản WCAG ----------
const kenh = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
export function doSang(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * kenh(r) + 0.7152 * kenh(g) + 0.0722 * kenh(b);
}
export function tuongPhan(a: string, b: string): number {
  const [l1, l2] = [doSang(a), doSang(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
// trộn màu (alpha của lớp trên) - để kiểm điểm sáng nhất khi quầng sáng đè lên nền
export function tron(nen: string, tren: string, alpha: number): string {
  const p = (h: string) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16));
  const a = p(nen), b = p(tren);
  return '#' + a.map((x, i) => Math.round(x + (b[i] - x) * alpha).toString(16).padStart(2, '0')).join('');
}

// ---------- chuyển động nền theo nhịp bước ----------
const em = (u: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);

// Quầng sáng dịch nhẹ sang trái / phải xen kẽ mỗi bước (lướt 1,4 s), vệt sáng quét chéo 0,9 s ngay khi đổi bước.
export function trangThaiNen(t: number, mocBuoc: number[]): {lechX: number; lechY: number; quet: number; i: number} {
  let i = -1;
  mocBuoc.forEach((m, j) => { if (m <= t) i = j; });
  const dich = (j: number) => (j < 0 ? 0 : j % 2 === 0 ? -70 : 70);
  const tDau = i >= 0 ? mocBuoc[i] : 0;
  const u = em((t - tDau) / 1.4);
  const lechX = dich(i - 1) + (dich(i) - dich(i - 1)) * u;
  const lechY = 18 * Math.sin(t * 0.21);
  const q = (t - tDau) / 0.9;
  const quet = i > 0 && q >= 0 && q <= 1 ? q : -1;
  return {lechX, lechY, quet, i};
}

// Xung nhịp chống đứng hình T2 (props.khung4tang.nhipT2): 0..1..0 trong 0,9 s sau mỗi mốc; -1 = không có xung.
export function xungNhip(t: number, nhip: number[] | undefined): number {
  if (!nhip || !nhip.length) return -1;
  let gan = -1;
  for (const m of nhip) if (m <= t && t - m < 0.9) gan = m;
  return gan < 0 ? -1 : (t - gan) / 0.9;
}

// Mốc T2 đổi hình thật (tính lại phía Remotion để test "không đứng > 6 s"): bước + nhịp + lớp tự sinh + pha sân khấu
export function mocDoiHinhV99(p: {buoc?: {t: number}[]; nhipT2?: number[]; tuSinh?: {lop: {t: number}[]} | null;
  sanKhau?: {pha?: {t: number}[]; nhip?: number[]} | null}): number[] {
  const m = [0, ...(p.buoc || []).map((b) => b.t), ...(p.nhipT2 || []), ...((p.tuSinh?.lop || []).map((l) => l.t)),
    ...((p.sanKhau?.pha || []).map((x) => x.t)), ...(p.sanKhau?.nhip || [])];
  return [...new Set(m.map((x) => Math.round(x * 1000) / 1000))].sort((a, b) => a - b);
}

// Điểm sao / đốm tinh vân tất định (không Math.random)
export function diemTatDinh(n: number, hat: number): {x: number; y: number; r: number; pha: number}[] {
  const ra: {x: number; y: number; r: number; pha: number}[] = [];
  let s = hat >>> 0 || 1;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let k = 0; k < n; k++) ra.push({x: rnd() * 1080, y: rnd() * 1920, r: 0.8 + rnd() * 1.8, pha: rnd() * Math.PI * 2});
  return ra;
}
