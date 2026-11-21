// v90 — Toán vector 3D thuần (không phụ thuộc React/Remotion để chạy được trong test Node).
import {V3} from './kieu';

export const cong = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const tru = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const nhan = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const cham = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cheo = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const doDai = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const chuan = (a: V3): V3 => {
  const l = doDai(a);
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
};
export const noi = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const trungBinh = (ds: V3[]): V3 => {
  const s: V3 = [0, 0, 0];
  for (const p of ds) {
    s[0] += p[0];
    s[1] += p[1];
    s[2] += p[2];
  }
  const n = Math.max(1, ds.length);
  return [s[0] / n, s[1] / n, s[2] / n];
};
export const laV3 = (v: unknown): v is V3 =>
  Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number' && isFinite(x));

export const RAD = Math.PI / 180;

// Quay điểm p quanh trục đi qua o, hướng k (đơn vị), góc a (rad) — công thức Rodrigues.
export function quayQuanhTruc(p: V3, o: V3, k: V3, a: number): V3 {
  const v = tru(p, o);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const kv = cheo(k, v);
  const kd = cham(k, v) * (1 - c);
  return cong(o, [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd]);
}

// Pháp tuyến đa giác (Newell) — bền với đa giác gần suy biến.
export function phapTuyen(ds: V3[]): V3 {
  const n: V3 = [0, 0, 0];
  for (let i = 0; i < ds.length; i++) {
    const a = ds[i];
    const b = ds[(i + 1) % ds.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return chuan(n);
}

// Hai vector đơn vị vuông góc với n (cơ sở của mặt phẳng nhận n làm pháp tuyến).
export function coSoMatPhang(n: V3): [V3, V3] {
  const k = chuan(n);
  const phu: V3 = Math.abs(k[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = chuan(cheo(phu, k));
  const v = cheo(k, u);
  return [u, v];
}

// Điểm theo tỉ lệ độ dài cung trên đường gấp khúc.
export function diemTheoDoDai(ds: V3[], t: number): V3 {
  if (ds.length === 0) return [0, 0, 0];
  if (ds.length === 1) return ds[0];
  const L: number[] = [0];
  for (let i = 1; i < ds.length; i++) L.push(L[i - 1] + doDai(tru(ds[i], ds[i - 1])));
  const muc = Math.min(1, Math.max(0, t)) * L[L.length - 1];
  for (let i = 1; i < ds.length; i++) {
    if (L[i] >= muc) {
      const seg = L[i] - L[i - 1];
      return noi(ds[i - 1], ds[i], seg > 1e-12 ? (muc - L[i - 1]) / seg : 0);
    }
  }
  return ds[ds.length - 1];
}

// Cắt đường gấp khúc tới tỉ lệ độ dài t (hoạt ảnh vẽ dần).
export function catDuong(ds: V3[], t: number): V3[] {
  if (t >= 1 || ds.length < 2) return ds;
  if (t <= 0) return [];
  const L: number[] = [0];
  for (let i = 1; i < ds.length; i++) L.push(L[i - 1] + doDai(tru(ds[i], ds[i - 1])));
  const muc = t * L[L.length - 1];
  const ra: V3[] = [ds[0]];
  for (let i = 1; i < ds.length; i++) {
    if (L[i] <= muc) ra.push(ds[i]);
    else {
      const seg = L[i] - L[i - 1];
      ra.push(noi(ds[i - 1], ds[i], seg > 1e-12 ? (muc - L[i - 1]) / seg : 0));
      break;
    }
  }
  return ra;
}

// Spline Catmull-Rom qua các điểm (đường cong mượt từ mảng điểm thưa).
export function catmullRom(ds: V3[], moiDoan = 12, kin = false): V3[] {
  if (ds.length < 3) return ds;
  const n = ds.length;
  const lay = (i: number): V3 => (kin ? ds[(i + n) % n] : ds[Math.min(n - 1, Math.max(0, i))]);
  const ra: V3[] = [];
  const soDoan = kin ? n : n - 1;
  for (let i = 0; i < soDoan; i++) {
    const p0 = lay(i - 1), p1 = lay(i), p2 = lay(i + 1), p3 = lay(i + 2);
    for (let j = 0; j < moiDoan; j++) {
      const t = j / moiDoan, t2 = t * t, t3 = t2 * t;
      const f = (k: 0 | 1 | 2) =>
        0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      ra.push([f(0), f(1), f(2)]);
    }
  }
  ra.push(kin ? ds[0] : ds[n - 1]);
  return ra;
}

// Nhịp chuyển động
export const kep01 = (x: number) => Math.min(1, Math.max(0, x));
export const emVaoRa = (x: number) => {
  const t = kep01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const emRa = (x: number) => 1 - Math.pow(1 - kep01(x), 3);
