import {Q, QDON, qNhan, qXoayVec, V3} from './quat';

// Bộ xương người chuẩn hóa của VRM (tư thế chữ T, mặt nhìn về +Z, tay TRÁI của nhân vật hướng về +X, +Y là lên).
// Chiều dài chỉ để kiểm tra tư thế bằng mô hình xương que; khi dựng thật dùng đúng xương của mô hình VRM.
export const XUONG = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
] as const;
export type TenXuong = (typeof XUONG)[number];

export const CHA: Record<TenXuong, TenXuong | null> = {
  hips: null, spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck',
  leftShoulder: 'chest', leftUpperArm: 'leftShoulder', leftLowerArm: 'leftUpperArm', leftHand: 'leftLowerArm',
  rightShoulder: 'chest', rightUpperArm: 'rightShoulder', rightLowerArm: 'rightUpperArm', rightHand: 'rightLowerArm',
  leftUpperLeg: 'hips', leftLowerLeg: 'leftUpperLeg', leftFoot: 'leftLowerLeg',
  rightUpperLeg: 'hips', rightLowerLeg: 'rightUpperLeg', rightFoot: 'rightLowerLeg',
};

export const DICH: Record<TenXuong, V3> = {
  hips: [0, 0.95, 0], spine: [0, 0.1, 0], chest: [0, 0.13, 0], neck: [0, 0.22, 0], head: [0, 0.08, 0],
  leftShoulder: [0.03, 0.17, 0], leftUpperArm: [0.1, 0, 0], leftLowerArm: [0.28, 0, 0], leftHand: [0.26, 0, 0],
  rightShoulder: [-0.03, 0.17, 0], rightUpperArm: [-0.1, 0, 0], rightLowerArm: [-0.28, 0, 0], rightHand: [-0.26, 0, 0],
  leftUpperLeg: [0.08, -0.05, 0], leftLowerLeg: [0, -0.4, 0], leftFoot: [0, -0.4, 0],
  rightUpperLeg: [-0.08, -0.05, 0], rightLowerLeg: [0, -0.4, 0], rightFoot: [0, -0.4, 0],
};

// Tính vị trí các khớp trong không gian (FK). hipsViTri: độ lệch thêm của hông so với tư thế chữ T.
export function fk(xoay: Partial<Record<TenXuong, Q>>, hipsLech: V3 = [0, 0, 0], goc: Q = QDON, viTriGoc: V3 = [0, 0, 0]): Record<TenXuong, V3> {
  const vt = {} as Record<TenXuong, V3>;
  const q = {} as Record<TenXuong, Q>;
  for (const x of XUONG) {
    const cha = CHA[x];
    const qx = xoay[x] || QDON;
    if (!cha) {
      q[x] = qNhan(goc, qx);
      const d = qXoayVec(goc, [DICH[x][0] + hipsLech[0], DICH[x][1] + hipsLech[1], DICH[x][2] + hipsLech[2]]);
      vt[x] = [viTriGoc[0] + d[0], viTriGoc[1] + d[1], viTriGoc[2] + d[2]];
    } else {
      q[x] = qNhan(q[cha], qx);
      const d = qXoayVec(q[cha], DICH[x]);
      vt[x] = [vt[cha][0] + d[0], vt[cha][1] + d[1], vt[cha][2] + d[2]];
    }
  }
  return vt;
}
