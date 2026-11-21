// v90 — Máy quay quỹ đạo phối cảnh + nội suy giữa các bước.
// Quy ước: trục z hướng lên. goc_ngang n = 0 nhìn chính diện từ phía -y (x sang phải); tăng n = máy vòng sang phải.
// goc_cao c = 0 ngang tầm, c = 90 nhìn thẳng từ trên xuống. Vector "phải" r = (cos n, sin n, 0) không phụ thuộc c
// nên nhìn từ trên xuống (c = 90) KHÔNG bị lật/suy biến như máy quay dùng vector "lên" cố định.
import {Buoc3D, Camera, V3} from './kieu';
import {cham, cheo, cong, emVaoRa, nhan, RAD, tru} from './toan3d';

export type MayQuay = {
  n: number; c: number; zoom: number;
  muc: V3; // điểm máy nhìn vào (tâm cảnh)
  D: number; // khoảng cách máy -> tâm (phối cảnh)
  k: number; // tỉ lệ px / đơn vị
  ox: number; oy: number; // gốc màn hình (px) của tâm cảnh sau khi khung tự động
};

export type HeTruc = {phai: V3; len: V3; ve: V3; viTri: V3};

export function heTruc(m: Pick<MayQuay, 'n' | 'c' | 'muc' | 'D'>): HeTruc {
  const n = m.n * RAD;
  const c = Math.min(90, Math.max(-89, m.c)) * RAD;
  const ve: V3 = [Math.sin(n) * Math.cos(c), -Math.cos(n) * Math.cos(c), Math.sin(c)]; // từ tâm hướng về máy
  const phai: V3 = [Math.cos(n), Math.sin(n), 0];
  const len = cheo(phai, nhan(ve, -1));
  return {phai, len, ve, viTri: cong(m.muc, nhan(ve, m.D))};
}

export type DiemMan = {x: number; y: number; s: number; sau: number}; // sau: càng lớn càng xa máy

// Chiếu với tỉ lệ k và gốc (ox, oy).
export function chieuDiem(p: V3, m: MayQuay, h: HeTruc): DiemMan {
  const v = tru(p, m.muc);
  const x = cham(v, h.phai);
  const y = cham(v, h.len);
  const z = cham(v, h.ve);
  const s = m.D / Math.max(m.D * 0.15, m.D - z);
  return {x: m.ox + x * s * m.k, y: m.oy - y * s * m.k, s, sau: m.D - z};
}

// Tên góc máy gọn cho AI.
export const GOC_TEN: Record<string, Partial<{n: number; c: number; zoom: number}>> = {
  nghieng: {n: 32, c: 24},
  nghieng_trai: {n: -32, c: 24},
  tu_tren: {c: 88},
  chinh_dien: {n: 0, c: 6},
  thap: {c: 10},
  cao: {c: 48},
};

export const CAMERA_MAC_DINH: Camera = [32, 24, 1];
export const THOI_CHUYEN_MAY = 1.2; // giây

export type MocMay = {t: number; n: number; c: number; zoom: number};

// Danh sách mốc máy (mỗi bước có camera là một mốc). Góc ngang nội suy theo đường ngắn nhất.
export function mocMay(buoc: Buoc3D[]): MocMay[] {
  const ds: MocMay[] = [];
  let cur = {n: CAMERA_MAC_DINH[0], c: CAMERA_MAC_DINH[1], zoom: CAMERA_MAC_DINH[2]};
  const sx = [...buoc].sort((a, b) => a.t - b.t);
  for (const b of sx) {
    if (!b.camera) continue;
    let n = b.camera[0];
    while (n - cur.n > 180) n -= 360;
    while (n - cur.n < -180) n += 360;
    cur = {n, c: b.camera[1], zoom: b.camera[2]};
    ds.push({t: b.t, ...cur});
  }
  if (!ds.length || ds[0].t > 0) ds.unshift({t: 0, ...(ds[0] ? {n: ds[0].n, c: ds[0].c, zoom: ds[0].zoom} : cur)});
  return ds;
}

// Vị trí giữa hai mốc: i = mốc trước, a = tiến độ chuyển (0..1, đã làm mềm).
export function viTriMoc(ds: MocMay[], t: number): {i: number; a: number} {
  let i = 0;
  for (let j = 0; j < ds.length; j++) if (ds[j].t <= t) i = j;
  if (i === 0 && t < ds[0].t) return {i: 0, a: 0};
  // mốc i đang chuyển từ mốc i-1 sang trong THOI_CHUYEN_MAY giây đầu
  if (i > 0 && t < ds[i].t + THOI_CHUYEN_MAY) return {i: i - 1, a: emVaoRa((t - ds[i].t) / THOI_CHUYEN_MAY)};
  return {i, a: 0};
}

export function gocTai(ds: MocMay[], t: number, quayNhe: boolean): {n: number; c: number; zoom: number} {
  const {i, a} = viTriMoc(ds, t);
  const A = ds[i];
  const B = ds[Math.min(ds.length - 1, i + 1)];
  const L = (x: number, y: number) => x + (y - x) * a;
  // trôi nhẹ quanh trục đứng (giảm dần khi nhìn từ trên xuống để không làm lệch hình chiếu bằng)
  const c = L(A.c, B.c);
  const troi = quayNhe ? 2.2 * Math.sin((t * 2 * Math.PI) / 10) * Math.max(0, 1 - c / 80) : 0;
  return {n: L(A.n, B.n) + troi, c, zoom: L(A.zoom, B.zoom)};
}
