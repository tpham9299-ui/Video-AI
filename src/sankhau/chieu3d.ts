// MÁY CHIẾU 3D tự tính (thay cho CSS preserve-3d): mọi vật nằm trên một "sàn" (mặt phẳng sân khấu), camera nghiêng
// (nghieng) và xoay quanh trục đứng (xoay). Mỗi vật được chiếu phối cảnh thành vị trí + tỉ lệ trên màn hình rồi vẽ phẳng,
// xếp trước/sau theo độ sâu, nên không bao giờ bị mặt sàn hay bóng đổ cắt mất như khi dùng các mặt phẳng CSS cắt nhau.
import React from 'react';

export type Cam3D = {n: number; r: number; d: number; cx: number; cy: number};
export type DiemChieu = {sx: number; sy: number; s: number; z: number};

const RAD = Math.PI / 180;

// X, Y: tọa độ trên sàn (px của sân khấu); H: độ cao so với sàn (px, hướng lên).
export function chieu(cam: Cam3D, X: number, Y: number, H = 0): DiemChieu {
  const x = X - cam.cx;
  const y = Y - cam.cy;
  const cr = Math.cos(cam.r * RAD);
  const sr = Math.sin(cam.r * RAD);
  const xr = x * cr - y * sr;
  const yr = x * sr + y * cr;
  const cn = Math.cos(cam.n * RAD);
  const sn = Math.sin(cam.n * RAD);
  const yp = yr * cn - H * sn;
  const zp = yr * sn + H * cn;
  const s = cam.d / Math.max(cam.d * 0.2, cam.d - zp);
  return {sx: cam.cx + xr * s, sy: cam.cy + yp * s, s, z: zp};
}

// Góc nhìn hiện tại, để các vật 3D thật (xúc xắc, khối hộp, tòa nhà...) xoay mặt theo đúng camera.
export const Goc3D = React.createContext<{n: number; r: number}>({n: 0, r: 0});
