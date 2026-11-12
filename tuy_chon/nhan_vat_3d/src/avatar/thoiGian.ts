import {DauVao} from './poses';

// Từ danh sách cảnh và số khung hình hiện tại, quyết định nhân vật đang ở đâu, quay hướng nào, đi/đứng/chỉ tay/nói.
export type CanhNhe = {batDau: number; soFrame: number; camXuc: string; coHinh: boolean; bienDo: number[]; leadFrame: number};

export type TrangThaiNV = {
  dauVao: DauVao;
  x: number; // vị trí ngang (m): 0 = giữa, dương = bên phải màn hình
  yaw: number; // hướng nhìn (radian): 0 = nhìn thẳng vào màn hình, âm = quay sang trái màn hình
  hienBongDen: boolean;
  dang: 'vao' | 'dung' | 'ra';
};

export const FRAME_VAO = 30;
export const FRAME_RA = 26;
export const X_NGOAI = 1.25; // ngoài mép canvas bên phải
const hoaMem = (t: number) => t * t * (3 - 2 * t);
const kep = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function tinhTrangThai(canh: CanhNhe[], frame: number, tongFrame: number): TrangThaiNV {
  let i = canh.findIndex((c) => frame >= c.batDau && frame < c.batDau + c.soFrame);
  if (i < 0) i = frame < 0 ? 0 : canh.length - 1;
  const c = canh[i];
  const local = frame - c.batDau;
  const camB = c.camXuc || 'nghi';
  const camA = i > 0 ? canh[i - 1].camXuc || 'nghi' : camB;

  let dang: TrangThaiNV['dang'] = 'dung';
  let x = 0;
  let yaw = -0.3;
  let dibo = 0;
  if (frame < FRAME_VAO) {
    dang = 'vao';
    const p = frame / FRAME_VAO;
    x = X_NGOAI * (1 - p);
    yaw = -Math.PI / 2;
    dibo = 1;
  } else if (frame < FRAME_VAO + 10) {
    yaw = -Math.PI / 2 + (Math.PI / 2 - 0.3) * hoaMem((frame - FRAME_VAO) / 10); // quay mặt về phía người xem
    dibo = 1 - hoaMem((frame - FRAME_VAO) / 10);
  }
  if (frame >= tongFrame - FRAME_RA) {
    dang = 'ra';
    const p = (frame - (tongFrame - FRAME_RA)) / FRAME_RA;
    x = X_NGOAI * p;
    yaw = -0.3 + (Math.PI / 2 + 0.3) * hoaMem(Math.min(1, p * 4));
    dibo = hoaMem(Math.min(1, p * 4));
  }

  const sauKhiVao = frame >= FRAME_VAO + 10 && dang !== 'ra';
  let chi = 0;
  if (c.coHinh && sauKhiVao) {
    const f = local / c.soFrame;
    chi = kep(Math.min((f - 0.2) / 0.1, (0.78 - f) / 0.1));
  }
  let nhay = 0;
  if (i === 0) nhay = kep((frame - (c.leadFrame + 6)) / 12);
  else if (camB === 'vui') nhay = kep((local - 4) / 12);
  if (nhay >= 1) nhay = 0;

  const bienDo = dibo > 0.5 ? 0 : c.bienDo && c.bienDo[local] ? c.bienDo[local] : 0;
  return {
    dauVao: {frame, local, camA, camB, hoa: kep(local / 10), chi, dibo, pha: frame * 0.26, bienDo, nhay},
    x,
    yaw,
    hienBongDen: camB === 'y_tuong' && local > 6 && local < 100 && dang === 'dung',
    dang,
  };
}

/* ===================== MÁY QUAY ===================== */
// Ba cỡ cảnh: rộng (toàn thân, lúc đi vào/đi ra), vừa (từ hông lên, mặc định khi nói), cận (mặt và vai, cú nhấn ở hook).
// dist: khoảng cách máy quay tới nhân vật (m); ty: độ cao điểm nhìn (m); cx: dịch ngang (m, âm = nhân vật lệch sang phải khung).
export type May = {dist: number; ty: number; cx: number};
export const MAY_RONG: May = {dist: 4.0, ty: 0.88, cx: 0};
export const MAY_VUA: May = {dist: 2.85, ty: 1.13, cx: 0};
export const MAY_CAN: May = {dist: 2.0, ty: 1.38, cx: 0};
export const MAY_TAY_CAO: May = {dist: 3.5, ty: 1.27, cx: 0};
const tronMay = (a: May, b: May, t: number): May => ({dist: a.dist + (b.dist - a.dist) * t, ty: a.ty + (b.ty - a.ty) * t, cx: a.cx + (b.cx - a.cx) * t});

export function tinhMay(canh: CanhNhe[], frame: number, tongFrame: number): May {
  const tt = tinhTrangThai(canh, frame, tongFrame);
  const c = canh.find((x) => frame >= x.batDau && frame < x.batDau + x.soFrame) || canh[canh.length - 1];
  const local = frame - c.batDau;
  let rong: number;
  if (tt.dang === 'vao') rong = 1;
  else if (tt.dang === 'ra') rong = hoaMem(kep((frame - (tongFrame - FRAME_RA)) / 12));
  else rong = 1 - hoaMem(kep((frame - (FRAME_VAO + 10)) / 24));
  // tay giơ cao (ý tưởng, mừng): lùi máy ra để không cắt mất bàn tay
  const cao = tt.dang === 'dung' && (c.camXuc === 'vui' || c.camXuc === 'y_tuong') ? hoaMem(kep(local / 12)) : 0;
  let m = tronMay(tronMay(MAY_VUA, MAY_TAY_CAO, cao), MAY_RONG, rong);
  // chỉ tay sang trái màn hình: dịch máy để cánh tay duỗi ra vẫn nằm trong khung
  m = {...m, cx: m.cx - 0.2 * tt.dauVao.chi};
  // hook: ống kính đẩy sát vào mặt đúng lúc giật mình rồi lùi dần
  if (c === canh[0] && tt.dang === 'dung') {
    const bd = c.leadFrame + 4;
    const q = hoaMem(kep((frame - bd) / 8)) * (1 - hoaMem(kep((frame - (bd + 34)) / 26)));
    m = tronMay(m, MAY_CAN, q);
  }
  // mừng: lùi ra một chút cho thấy cú nhảy; đang nói: tiến chậm vào nhân vật cho có sinh khí
  m = {...m, dist: m.dist + 0.4 * Math.sin(Math.PI * tt.dauVao.nhay) - (tt.dang === 'dung' ? 0.1 * (local / c.soFrame) : 0)};
  return m;
}
