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

// ---------- v99.3: NỀN ĐỘNG NHẸ CPU THEO useCurrentFrame() ----------
//  1. 2-3 vầng sáng radial-gradient trôi chậm (opacity trong [0.18 ; 0.28], màu đủ trầm để tương phản chữ >= 7:1 và luma T2 < 68).
//  2. Lưới tọa độ 2 tầng trượt nhẹ (parallax gần / xa).
//  3. Hạt bokeh + ký hiệu toán / hình mờ nổi chậm, phân biệt sắc thái Hình học (lưới tọa độ + hình khối mờ) vs Xác suất (bokeh + biểu đồ cột mờ).
export type MangNen = 'hinh_hoc' | 'xac_suat' | 'ham_so';

export function suyMangNen(p?: {
  mang?: MangNen | null;
  theme?: string | null;
  khongGian?: unknown;
  sanKhau?: unknown;
  canh3dv?: unknown;
}): MangNen {
  if (!p) return 'xac_suat';
  if (p.mang) return p.mang;
  if (p.khongGian || p.theme === 'blueprint') return 'hinh_hoc';
  const skObj = p.sanKhau && typeof p.sanKhau === 'object' ? (p.sanKhau as {loai?: string}) : null;
  const c3Obj = p.canh3dv && typeof p.canh3dv === 'object' ? (p.canh3dv as {khuon?: string}) : null;
  const sk = skObj?.loai || '';
  const khuon = c3Obj?.khuon || '';
  if (p.theme === 'cosmic_indigo' || /^(rut_mau|so_do_cay|luoi_bayes|cot_phan_phoi)$/.test(sk) || khuon === 'luoi_the_bi_xac_suat') {
    return 'xac_suat';
  }
  if (/^(chop_lang_tru|mat_phang_cat_khoi|hai_mat_cau_oxyz)$/.test(khuon)) return 'hinh_hoc';
  return 'ham_so';
}

export type VangSangDong = {
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  mauTrong: string;
  mauGiua: string;
  opacity: number;
};

// 3 vầng sáng gradient trôi chậm theo frame, opacity luôn nằm trong [0.18, 0.28]
export function vangSangDong(
  frame: number,
  fps = 30,
  tamSanKhau = 720,
  mauChinh = '#3FD0E0',
  mauPhu = '#8E7CFF',
  lechBuocX = 0,
): VangSangDong[] {
  const t = frame / Math.max(1, fps);
  const m1 = tron('#0A1828', mauChinh, 0.38);
  const m2 = tron('#0B1526', mauPhu, 0.34);
  const m3 = tron('#091A24', mauChinh, 0.30);
  return [
    {
      id: 'vang_chinh',
      cx: 540 + lechBuocX * 0.75 + 92 * Math.sin(t * 0.16),
      cy: tamSanKhau - 30 + 64 * Math.cos(t * 0.12),
      rx: 460,
      ry: 390,
      mauTrong: m1,
      mauGiua: tron('#081018', mauChinh, 0.16),
      opacity: Number((0.23 + 0.04 * Math.sin(t * 0.31)).toFixed(4)), // 0.19 .. 0.27
    },
    {
      id: 'vang_tren',
      cx: 280 + 115 * Math.cos(t * 0.11 + 1.1),
      cy: 340 + 58 * Math.sin(t * 0.15 + 0.6),
      rx: 390,
      ry: 320,
      mauTrong: m2,
      mauGiua: tron('#081018', mauPhu, 0.14),
      opacity: Number((0.21 + 0.03 * Math.cos(t * 0.27 + 0.8)).toFixed(4)), // 0.18 .. 0.24
    },
    {
      id: 'vang_duoi',
      cx: 790 + 105 * Math.sin(t * 0.13 + 2.4),
      cy: 1360 + 70 * Math.cos(t * 0.10 + 1.7),
      rx: 420,
      ry: 340,
      mauTrong: m3,
      mauGiua: tron('#081018', mauChinh, 0.13),
      opacity: Number((0.22 + 0.035 * Math.sin(t * 0.23 + 1.9)).toFixed(4)), // 0.185 .. 0.255
    },
  ];
}

// Lưới tọa độ 2 lớp trượt nhẹ (parallax): lớp xa ô lớn trượt chậm, lớp gần ô nhỏ trượt nhanh hơn
export function luoiParallax(frame: number, fps = 30): {ganX: number; ganY: number; xaX: number; xaY: number} {
  const t = frame / Math.max(1, fps);
  return {
    ganX: Number(((-t * 6.5) % 40).toFixed(2)),
    ganY: Number(((t * 10.5) % 40).toFixed(2)),
    xaX: Number(((-t * 2.8) % 120).toFixed(2)),
    xaY: Number(((t * 4.5) % 120).toFixed(2)),
  };
}

export type HatBokehToan = {
  x0: number;
  y0: number;
  r: number;
  vx: number;
  vy: number;
  pha: number;
  kieu: 'bokeh' | 'ky_hieu' | 'khoi_mo' | 'cot_mo';
  kyHieu: string;
};

const KY_HIEU_THEO_MANG: Record<MangNen, string[]> = {
  hinh_hoc: ['△', '⊥', '∠', 'π', '∥', 'Oxyz', 'R', 'α'],
  xac_suat: ['Ω', 'P(A)', '∩', '∪', '∑', 'Cₙᵏ', 'Ā', '%'],
  ham_so: ['f(x)', '∫', 'Δ', '√', 'π', 'y′', '∞', 'x*'],
};

export function hatBokehToan(mang: MangNen, soHat = 16, hatGiong = 9931): HatBokehToan[] {
  let s = (hatGiong ^ (mang === 'hinh_hoc' ? 0x174 : mang === 'xac_suat' ? 0x593 : 0x331)) >>> 0 || 1;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const dsKH = KY_HIEU_THEO_MANG[mang];
  const ra: HatBokehToan[] = [];
  for (let i = 0; i < soHat; i++) {
    let kieu: HatBokehToan['kieu'] = 'bokeh';
    if (i % 3 === 1) kieu = 'ky_hieu';
    else if (i % 4 === 2) kieu = mang === 'hinh_hoc' ? 'khoi_mo' : mang === 'xac_suat' ? 'cot_mo' : 'bokeh';
    ra.push({
      x0: 70 + rnd() * 940,
      y0: 120 + rnd() * 1680,
      r: kieu === 'bokeh' ? 10 + rnd() * 20 : 16 + rnd() * 12,
      vx: 8 + rnd() * 14,
      vy: 10 + rnd() * 16,
      pha: rnd() * Math.PI * 2,
      kieu,
      kyHieu: dsKH[i % dsKH.length],
    });
  }
  return ra;
}

export function viTriHat(h: HatBokehToan, frame: number, fps = 30): {x: number; y: number; opacity: number; xoay: number} {
  const t = frame / Math.max(1, fps);
  const x = h.x0 + Math.sin(t * 0.35 + h.pha) * h.vx;
  const cao = 1760;
  const y = ((((h.y0 - t * h.vy - 80) % cao) + cao) % cao) + 80;
  const nhip = 0.5 + 0.5 * Math.sin(t * 0.55 + h.pha);
  const opacity = h.kieu === 'bokeh' ? 0.045 + 0.04 * nhip : 0.055 + 0.045 * nhip;
  const xoay = Math.sin(t * 0.22 + h.pha) * 14;
  return {x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), opacity: Number(opacity.toFixed(4)), xoay: Number(xoay.toFixed(1))};
}
