// Toán quaternion tối thiểu (thuần, không phụ thuộc three) để tính tư thế xương và kiểm tra bằng mô hình xương que.
export type Q = [number, number, number, number]; // x, y, z, w
export type V3 = [number, number, number];

export const QDON: Q = [0, 0, 0, 1];

export const qNhan = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];

const qTruc = (x: number, y: number, z: number, g: number): Q => {
  const s = Math.sin(g / 2);
  return [x * s, y * s, z * s, Math.cos(g / 2)];
};

// Quy ước của dự án: Q = Rz(rz) · Ry(ry) · Rx(rx), tức xoay quanh X trước, rồi Y, rồi Z (trong hệ của xương cha).
export const qTuGoc = (rx: number, ry: number, rz: number): Q =>
  qNhan(qNhan(qTruc(0, 0, 1, rz), qTruc(0, 1, 0, ry)), qTruc(1, 0, 0, rx));

export const qXoayY = (g: number): Q => qTruc(0, 1, 0, g);

export const qXoayVec = (q: Q, v: V3): V3 => {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
};

export const qTron = (a: Q, b: Q, t: number): Q => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const bb: Q = d < 0 ? [-b[0], -b[1], -b[2], -b[3]] : b;
  d = Math.abs(d);
  let ka: number;
  let kb: number;
  if (d > 0.9995) {
    ka = 1 - t;
    kb = t;
  } else {
    const th = Math.acos(d);
    const s = Math.sin(th);
    ka = Math.sin((1 - t) * th) / s;
    kb = Math.sin(t * th) / s;
  }
  const r: Q = [ka * a[0] + kb * bb[0], ka * a[1] + kb * bb[1], ka * a[2] + kb * bb[2], ka * a[3] + kb * bb[3]];
  const n = Math.hypot(r[0], r[1], r[2], r[3]) || 1;
  return [r[0] / n, r[1] / n, r[2] / n, r[3] / n];
};
