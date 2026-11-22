// v93 — KIỂM HỢP LỆ cảnh đối chiếu "Hình động ↔ Đồ thị ngưỡng" (hàm thuần, chạy được trong Node test).
// Mọi giá trị (hàm số, miền, ngưỡng, điểm tối ưu) được kiểm TRƯỚC khi vẽ; chỉ một chỗ sai -> trả null và tầng 2
// giữ sân khấu 3D chuẩn (không bao giờ vẽ đồ thị rỗng / NaN). Điểm tối ưu do MÁY tính lại, không tin số AI ghi.
import {phanTichBieuThuc} from '../sankhau/bieuthuc';
import type {DoiChieuVao} from './kieu';

export type HinhDoiChieu = 'tam_bia' | 'mat_cat_tru' | 'tam_giac_luc' | 'thanh';
export type DoiChieu = {
  f: (x: number) => number;
  bien: string;
  tenHam: string;
  a: number;
  b: number;
  kieu: 'max' | 'min';
  xTot: number;
  yTot: number;
  yMin: number;
  yMax: number;
  mau: [number, number][]; // điểm đồ thị đã lấy mẫu (đều hữu hạn)
  nguong: {gia_tri: number; kieu: '<=' | '>='; nhan: string} | null;
  hinh: HinhDoiChieu;
  ts: Record<string, number>;
  donVi: string;
};

const SO_MAU = 160;
const laSo = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const so = (v: unknown): number => (laSo(v) ? v : typeof v === 'string' ? parseFloat(v.replace(',', '.')) : NaN);
const sach = (v: unknown, md: string, max = 12) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : md);

// đạt ngưỡng tại giá trị y
export const datNguong = (d: Pick<DoiChieu, 'nguong'>, y: number) =>
  !d.nguong || (d.nguong.kieu === '<=' ? y <= d.nguong.gia_tri + 1e-9 : y >= d.nguong.gia_tri - 1e-9);

export function docDoiChieu(raw: unknown): DoiChieu | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as DoiChieuVao & Record<string, unknown>;
  const bien = sach(r.bien, 'x', 3);
  if (!/^[a-zA-Zα-ω]$/.test(bien)) return null;
  if (typeof r.ham !== 'string' || !r.ham.trim() || r.ham.length > 120) return null;
  // đổi tên biến về x cho bộ phân tích biểu thức an toàn (không eval)
  const nguon = bien === 'x' ? r.ham : r.ham.replace(new RegExp(`(?<![a-z])${bien}(?![a-z])`, 'g'), 'x');
  const f = phanTichBieuThuc(nguon);
  if (!f) return null;
  if (!Array.isArray(r.mien) || r.mien.length !== 2) return null;
  const a = so(r.mien[0]), b = so(r.mien[1]);
  if (!laSo(a) || !laSo(b) || !(b - a > 1e-6) || Math.abs(a) > 1e6 || Math.abs(b) > 1e6) return null;
  const kieu: 'max' | 'min' = r.kieu === 'min' ? 'min' : 'max';

  // lấy mẫu bên TRONG miền (đầu mút miền mở như x = 0 của S(r) = 2πr² + 2V/r thường vô nghĩa)
  const ep = (b - a) * 1e-4;
  const mau: [number, number][] = [];
  for (let i = 0; i <= SO_MAU; i++) {
    const x = Math.min(b - ep, Math.max(a + ep, a + ((b - a) * i) / SO_MAU));
    let y: number;
    try { y = f(x); } catch { y = NaN; }
    if (Number.isFinite(y) && Math.abs(y) < 1e9) mau.push([x, y]);
  }
  if (mau.length < SO_MAU * 0.9) return null; // quá nhiều điểm không xác định -> đồ thị rỗng
  let k = 0;
  mau.forEach(([, y], i) => { if (kieu === 'max' ? y > mau[k][1] : y < mau[k][1]) k = i; });
  // tinh chỉnh quanh mẫu tốt nhất (tìm tam phân trên 2 ô lân cận)
  let lo = mau[Math.max(0, k - 1)][0], hi = mau[Math.min(mau.length - 1, k + 1)][0];
  const tot = (y1: number, y2: number) => (kieu === 'max' ? y1 > y2 : y1 < y2);
  for (let n = 0; n < 60; n++) {
    const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
    if (tot(f(m1), f(m2))) hi = m2; else lo = m1;
  }
  const xTot = (lo + hi) / 2, yTot = f(xTot);
  if (!Number.isFinite(xTot) || !Number.isFinite(yTot)) return null;
  // cắt bớt phần đồ thị vọt cao (S = 2V/r khi r -> 0) để điểm tối ưu không bị ép dẹt sát trục
  const ys = mau.map((p) => p[1]).sort((u, v) => u - v);
  const q = (p: number) => ys[Math.min(ys.length - 1, Math.max(0, Math.round(p * (ys.length - 1))))];
  let yMin = Math.min(q(0.0), yTot), yMax = Math.max(q(kieu === 'min' ? 0.85 : 1), yTot);
  if (!(yMax - yMin > 1e-9)) return null; // hàm hằng: không có gì để đối chiếu
  const pad = (yMax - yMin) * 0.08;
  yMin -= pad; yMax += pad;
  // AI có ghi điểm tối ưu -> phải khớp máy (lệch > 2% miền = dữ liệu mâu thuẫn -> không vẽ)
  if (r.toi_uu !== undefined && r.toi_uu !== null) {
    const x0 = so(r.toi_uu);
    if (!laSo(x0) || Math.abs(x0 - xTot) > 0.02 * (b - a)) return null;
  }
  // ngưỡng: số hữu hạn, đạt tại điểm tối ưu và bị VƯỢT ở ít nhất một điểm (nếu không thì cảnh báo vô nghĩa)
  let nguong: DoiChieu['nguong'] = null;
  if (r.nguong !== undefined && r.nguong !== null) {
    const g = r.nguong as unknown as Record<string, unknown>;
    const gv = so(g && g.gia_tri);
    const gk = g && (g.kieu === '>=' || g.kieu === '<=') ? (g.kieu as '<=' | '>=') : null;
    if (!laSo(gv) || !gk) return null;
    nguong = {gia_tri: gv, kieu: gk, nhan: sach(g.nhan, '', 18)};
    const d = {nguong};
    if (!datNguong(d, yTot) || mau.every(([, y]) => datNguong(d, y))) return null;
    yMin = Math.min(yMin, gv - pad); yMax = Math.max(yMax, gv + pad);
  }
  // hình bên trái: tham số phải dựng được, không thì về thanh đo chung
  const ts: Record<string, number> = {};
  if (r.tham_so && typeof r.tham_so === 'object') {
    for (const [kk, v] of Object.entries(r.tham_so)) { const x = so(v); if (laSo(x)) ts[kk] = x; }
  }
  let hinh: HinhDoiChieu = (['tam_bia', 'mat_cat_tru', 'tam_giac_luc', 'thanh'] as const).includes(r.hinh as HinhDoiChieu) ? (r.hinh as HinhDoiChieu) : 'thanh';
  if (hinh === 'tam_bia') {
    const A = ts.a, B = ts.b ?? ts.a;
    if (!(A > 0) || !(B > 0) || b > Math.min(A, B) / 2 + 1e-6 || a < 0) hinh = 'thanh';
    else { ts.a = A; ts.b = B; }
  } else if (hinh === 'mat_cat_tru') {
    if (!(ts.V > 0) || a < 0) hinh = 'thanh';
  } else if (hinh === 'tam_giac_luc') {
    if (a < 0 || b > 89) hinh = 'thanh';
  }
  return {f, bien, tenHam: sach(r.ten_ham, 'f', 4), a, b, kieu, xTot, yTot, yMin, yMax, mau, nguong, hinh, ts, donVi: sach(r.don_vi, '', 6)};
}

// Nhịp trong một bước dài `dai` giây (tính từ đầu bước): vào 0,5 s -> quét a..b -> lướt về điểm tối ưu -> đứng ở đó.
export function nhipDoiChieu(d: DoiChieu, dt: number, dai: number): {x: number; pha: 'quet' | 've' | 'dung'} {
  const vao = 0.6;
  const quet = Math.max(1.6, Math.min(4.2, 0.45 * dai));
  const ve = Math.max(0.8, Math.min(1.6, 0.18 * dai));
  const L = (u: number) => u * u * (3 - 2 * u);
  if (dt < vao) return {x: d.a, pha: 'quet'};
  if (dt < vao + quet) return {x: d.a + (d.b - d.a) * L((dt - vao) / quet), pha: 'quet'};
  if (dt < vao + quet + ve) return {x: d.b + (d.xTot - d.b) * L((dt - vao - quet) / ve), pha: 've'};
  return {x: d.xTot, pha: 'dung'};
}

// số kiểu Việt: 2.5 -> "2,5"; tối đa 2 chữ số thập phân
export const soViet = (x: number) => {
  const r = Math.round(x * 100) / 100;
  return (Object.is(r, -0) ? 0 : r).toLocaleString('vi-VN', {maximumFractionDigits: 2});
};
