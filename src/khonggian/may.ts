// v97 — Máy quay quỹ đạo phối cảnh (cùng quy ước src/3d-vector/camera.ts: z hướng lên, góc ngang n = 0 nhìn từ phía -y,
// góc cao c = 90 nhìn thẳng từ trên) + NỘI SUY CẦU (slerp hướng nhìn) giữa hai tư thế. Hàm thuần — render song song an toàn.
import {TuThe, V3} from './kieu';
import {cham, cheo, chuan, cong, nhan, RAD, tru} from '../3d-vector/toan3d';

export const KHOANG_MAY = 3.6; // D = R × 3,6 (phối cảnh nhẹ, giống SGK)

export const huongNhin = (n: number, c: number): V3 => [Math.sin(n * RAD) * Math.cos(c * RAD), -Math.cos(n * RAD) * Math.cos(c * RAD), Math.sin(c * RAD)];
export const gocTuHuong = (v: V3, nGoi = 0): {n: number; c: number} => {
  const c = Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD;
  const ngang = Math.hypot(v[0], v[1]);
  let n = ngang < 1e-4 ? nGoi : Math.atan2(v[0], -v[1]) / RAD;
  while (n - nGoi > 180) n -= 360;
  while (n - nGoi < -180) n += 360;
  return {n, c};
};

export type HeMay = {phai: V3; len: V3; ve: V3; viTri: V3; D: number};

// v102: KHÓA vector `up` theo trục thẳng đứng thế giới (+Z): trục `phai` luôn nằm ngang (z = 0) nên `len = phai × (-ve)` có z = cos(c) >= 0
// -> máy KHÔNG BAO GIỜ nghiêng roll; đường cao dạng SA ⊥ đáy luôn đứng thẳng trên màn hình ở mọi chế độ (kể cả cận cảnh / ép mép).
// Ngoại lệ duy nhất: phang_2d (c = 88,5° nhìn thẳng từ trên xuống) — bản đồ 2D, trục đứng thế giới trùng hướng nhìn nên chiếu thành +Y màn hình.
export const UP_THE_GIOI: V3 = [0, 0, 1];
export const GOC_CAO_MAX = 88.5;

export function heMay(m: TuThe): HeMay {
  const c = Math.min(GOC_CAO_MAX, Math.max(-60, m.c));
  const ve = huongNhin(m.n, c);
  const phai: V3 = [Math.cos(m.n * RAD), Math.sin(m.n * RAD), 0];
  const len = cheo(phai, nhan(ve, -1)); // luôn cùng nửa không gian với UP_THE_GIOI (len[2] = cos c > 0)
  const D = m.R * KHOANG_MAY * (m.xa && m.xa > 0 ? m.xa : 1);
  return {phai, len, ve, viTri: cong(m.muc, nhan(ve, D)), D};
}

export type Diem2 = {x: number; y: number; s: number; sau: number};

export function chieu(p: V3, m: TuThe, h: HeMay): Diem2 {
  const v = tru(p, m.muc);
  const x = cham(v, h.phai), y = cham(v, h.len), z = cham(v, h.ve);
  const s = h.D / Math.max(h.D * 0.15, h.D - z);
  return {x: m.ox + x * s * m.k, y: m.oy - y * s * m.k, s, sau: h.D - z};
}

// slerp hai hướng nhìn đơn vị
export function slerp(a: V3, b: V3, u: number): V3 {
  const d = Math.max(-1, Math.min(1, cham(a, b)));
  const w = Math.acos(d);
  if (w < 1e-6) return a;
  if (Math.PI - w < 1e-3) { // ngược hướng: đi vòng qua phía trên
    const giua = chuan(cong(nhan(cong(a, b), 0.5), [0, 0, 1]));
    return u < 0.5 ? slerp(a, giua, u * 2) : slerp(giua, b, u * 2 - 1);
  }
  const s = Math.sin(w);
  return cong(nhan(a, Math.sin((1 - u) * w) / s), nhan(b, Math.sin(u * w) / s));
}

export function noiTuThe(A: TuThe, B: TuThe, u: number): TuThe {
  if (u <= 0) return A;
  if (u >= 1) return B;
  const v = slerp(huongNhin(A.n, A.c), huongNhin(B.n, B.c), u);
  const nGoi = A.n + (B.n - A.n) * u;
  const g = gocTuHuong(v, nGoi);
  const L = (x: number, y: number) => x + (y - x) * u;
  const ra: TuThe = {n: g.n, c: g.c, muc: [L(A.muc[0], B.muc[0]), L(A.muc[1], B.muc[1]), L(A.muc[2], B.muc[2])], R: A.R,
    k: L(A.k, B.k), ox: L(A.ox, B.ox), oy: L(A.oy, B.oy)};
  // v98: phang_2d -> 3D: khoảng cách máy nội suy theo log (trực giao "mở" dần thành phối cảnh, không giật)
  if ((A.xa ?? 1) !== 1 || (B.xa ?? 1) !== 1) ra.xa = Math.exp(L(Math.log(A.xa ?? 1), Math.log(B.xa ?? 1)));
  return ra;
}

// nhịp xoay êm (ease in-out bậc 3 mềm đầu/cuối)
export const emXoay = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
