import {Q, QDON, qTron, qTuGoc} from './quat';
import {TenXuong, XUONG} from './skeleton';

// Tư thế của nhân vật tính hoàn toàn bằng công thức theo số khung hình (không dùng mô phỏng vật lý nên mỗi lần dựng cho kết quả giống hệt nhau).
// Mỗi xương là bộ ba góc (rx, ry, rz) tính bằng radian, hợp thành Q = Rz·Ry·Rx (xem quat.ts).
const D = Math.PI / 180;
export type Goc3 = [number, number, number];
export type TuThe = Partial<Record<TenXuong, Goc3>>;

// Cánh tay. ha: hạ xuống dưới phương ngang (0 = dang ngang kiểu chữ T, 90 = buông thõng, số âm = nâng lên trên phương ngang)
// tien: đưa ra trước (độ). khuyu: gập khuỷu về phía trước. trong: gập khuỷu vào phía thân người. xoay: xoắn cánh tay.
export type TayTT = {ha: number; tien?: number; khuyu?: number; trong?: number; xoay?: number};
export function tay(ben: 'trai' | 'phai', t: TayTT): TuThe {
  const s = ben === 'trai' ? 1 : -1;
  const p = ben === 'trai' ? 'left' : 'right';
  return {
    [p + 'UpperArm']: [s * (t.xoay || 0) * D, -s * (t.tien || 0) * D, -s * t.ha * D],
    [p + 'LowerArm']: [0, -s * (t.khuyu || 0) * D, -s * (t.trong || 0) * D],
  } as TuThe;
}

// Chân. tien: đưa đùi ra trước (độ), goi: gập gối (độ). Bàn chân tự giữ ngang.
export function chan(ben: 'trai' | 'phai', tien: number, goi: number): TuThe {
  const p = ben === 'trai' ? 'left' : 'right';
  return {
    [p + 'UpperLeg']: [-tien * D, 0, 0],
    [p + 'LowerLeg']: [goi * D, 0, 0],
    [p + 'Foot']: [(tien - goi) * D, 0, 0],
  } as TuThe;
}

// Thân và đầu. nghieng: cúi ra trước (độ, âm = ngửa ra sau), quay: xoay người sang trái nhân vật (độ), ngang: nghiêng sang bên (độ).
export function than(nghieng: number, quay = 0, ngang = 0): TuThe {
  return {
    spine: [nghieng * 0.4 * D, quay * 0.4 * D, ngang * 0.4 * D],
    chest: [nghieng * 0.6 * D, quay * 0.6 * D, ngang * 0.6 * D],
  };
}
export function dau(cui: number, quay = 0, nghieng = 0): TuThe {
  return {neck: [cui * 0.4 * D, quay * 0.4 * D, nghieng * 0.4 * D], head: [cui * 0.6 * D, quay * 0.6 * D, nghieng * 0.6 * D]};
}

const gop = (...ds: TuThe[]): TuThe => Object.assign({}, ...ds);
const dungTu = (ha = 80) => gop(tay('trai', {ha, tien: 4, khuyu: 8}), tay('phai', {ha, tien: 4, khuyu: 8}));

// Các thông số tay dưới đây được dò bằng máy (tìm góc để bàn tay chạm đúng chỗ: cằm, đỉnh đầu, hông, trước bụng...)
// rồi kiểm tra lại bằng mô hình xương que, nên tay không xuyên qua người.
const HONG = {ha: 34, tien: 0, khuyu: 0, trong: 96};
export const TU_THE: Record<string, TuThe> = {
  // đứng thả lỏng
  mac_dinh: gop(dungTu(), than(0), dau(0)),
  // hook: giật mình, hai tay nâng lên hai bên mặt, ngả người ra sau
  ngac_nhien: gop(tay('trai', {ha: -14, tien: 10, khuyu: 130, trong: 34}), tay('phai', {ha: -14, tien: 10, khuyu: 130, trong: 34}), than(-8), dau(-8)),
  // suy nghĩ: một tay chống cằm, tay kia đỡ khuỷu
  nghi: gop(tay('phai', {ha: 82, tien: 80, khuyu: 134, xoay: -20}), tay('trai', {ha: 90, tien: 6, khuyu: 130, trong: 2, xoay: 20}), than(3, -4), dau(4, -8, 8)),
  // bối rối: gãi đầu, hơi khom
  boi_roi: gop(tay('phai', {ha: -44, tien: -18, khuyu: 140, trong: 70, xoay: 20}), tay('trai', {ha: 78, tien: 5, khuyu: 10}), than(5), dau(4, 6, -10)),
  // nảy ra ý tưởng: giơ một ngón tay lên cao, tay kia chống hông
  y_tuong: gop(tay('phai', {ha: -86, tien: 4, khuyu: 2}), tay('trai', HONG), than(-3), dau(-6, 4, 4)),
  // đang thao tác: hai tay phía trước như đang đếm/lấy đồ, cúi nhìn xuống
  thao_tac: gop(tay('trai', {ha: 90, tien: 10, khuyu: 84, trong: 90}), tay('phai', {ha: 90, tien: 10, khuyu: 84, trong: 90}), than(7), dau(14)),
  // vui mừng: hai tay giơ cao
  vui: gop(tay('trai', {ha: -86, tien: 0, khuyu: 10, trong: 32}), tay('phai', {ha: -86, tien: 0, khuyu: 10, trong: 32}), than(-5), dau(-8)),
  // tự tin: hai tay chống hông, ngẩng cao đầu
  tu_tin: gop(tay('trai', HONG), tay('phai', HONG), than(-4), dau(-5, 0, 0)),
};

// Chỉ tay vào hình minh họa phía trên bên trái: tay phải (bên trái màn hình) duỗi ra, hơi chếch lên
export const CHI_TAY: TuThe = gop(tay('phai', {ha: -30, tien: 26, khuyu: 8}));

export const BIEU_CAM_CAM: Record<string, Record<string, number>> = {
  ngac_nhien: {surprised: 0.9}, nghi: {relaxed: 0.25}, boi_roi: {sad: 0.45}, y_tuong: {happy: 0.85},
  thao_tac: {relaxed: 0.2}, vui: {happy: 1}, tu_tin: {happy: 0.55}, mac_dinh: {},
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Goc3, b: Goc3, t: number): Goc3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const O: Goc3 = [0, 0, 0];

function pha(a: TuThe, b: TuThe, t: number): TuThe {
  const kq: TuThe = {};
  for (const x of XUONG) {
    if (a[x] || b[x]) kq[x] = lerp3(a[x] || O, b[x] || O, t);
  }
  return kq;
}

// Chuyển tư thế tự nhiên hơn: mỗi xương bắt đầu trễ một chút (vai trước, cẳng tay sau, bàn tay cuối cùng) và vọt nhẹ qua đích rồi quay lại,
// giống cử động thật (follow-through) thay vì cả cơ thể trượt đều như robot.
const TRE: Partial<Record<TenXuong, number>> = {
  chest: 1, neck: 2, head: 3, leftShoulder: 1, rightShoulder: 1, leftUpperArm: 1, rightUpperArm: 1,
  leftLowerArm: 3, rightLowerArm: 3, leftHand: 5, rightHand: 5,
};
const vot = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.25;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
function phaTre(a: TuThe, b: TuThe, local: number): TuThe {
  const kq: TuThe = {};
  for (const x of XUONG) {
    if (a[x] || b[x]) kq[x] = lerp3(a[x] || O, b[x] || O, vot((local - (TRE[x] || 0)) / 13));
  }
  return kq;
}

// ---- Bàn tay: ngón tay thả lỏng thay vì duỗi thẳng đơ ----
// Gập ngón về phía lòng bàn tay. Nếu trên mô hình của bạn ngón gập NGƯỢC ra phía mu bàn tay, đổi HUONG_CUON thành -1.
export const HUONG_CUON = 1;
const NGON = ['Index', 'Middle', 'Ring', 'Little'] as const;
const KHOP = ['Proximal', 'Intermediate', 'Distal'] as const;
type Cuon = Record<(typeof NGON)[number], [number, number, number]>;
const BAN_TAY: Record<string, Cuon> = {
  thu: {Index: [0.22, 0.32, 0.18], Middle: [0.32, 0.42, 0.22], Ring: [0.42, 0.48, 0.26], Little: [0.52, 0.52, 0.28]},
  mo: {Index: [0.05, 0.05, 0.03], Middle: [0.05, 0.05, 0.03], Ring: [0.08, 0.06, 0.03], Little: [0.1, 0.06, 0.03]},
  chi: {Index: [0, 0, 0], Middle: [1.15, 1.25, 0.8], Ring: [1.2, 1.3, 0.8], Little: [1.25, 1.3, 0.8]},
  nam: {Index: [0.9, 1.0, 0.6], Middle: [1.0, 1.1, 0.65], Ring: [1.05, 1.1, 0.65], Little: [1.1, 1.1, 0.65]},
};
const KIEU_TAY: Record<string, string> = {ngac_nhien: 'mo', vui: 'mo', tu_tin: 'nam', mac_dinh: 'thu'};
const kieuTay = (cam: string) => KIEU_TAY[cam] || 'thu';
function ngonTay(camA: string, camB: string, ht: number, chiPhai: number, nham: boolean): Partial<Record<string, Q>> {
  const kq: Partial<Record<string, Q>> = {};
  for (const ben of ['trai', 'phai'] as const) {
    const s = ben === 'trai' ? 1 : -1;
    const p = ben === 'trai' ? 'left' : 'right';
    for (const f of NGON) {
      for (let k = 0; k < 3; k++) {
        let c = lerp(BAN_TAY[kieuTay(camA)][f][k], BAN_TAY[kieuTay(camB)][f][k], ht);
        if (ben === 'phai') {
          const dichChi = camB === 'y_tuong' ? 1 : chiPhai;
          c = lerp(c, BAN_TAY.chi[f][k], Math.min(1, Math.max(dichChi, 0)));
        }
        if (nham) c *= 0.85;
        kq[p + f + KHOP[k]] = qTuGoc(0, 0, -s * HUONG_CUON * c);
      }
    }
  }
  return kq;
}
function thayThe(nen: TuThe, de: TuThe, t: number): TuThe {
  const kq: TuThe = {...nen};
  for (const x of XUONG) if (de[x]) kq[x] = lerp3(nen[x] || O, de[x] as Goc3, t);
  return kq;
}

// Tư thế đi bộ nhìn ngang (người quay sang bên). p là pha bước chân (radian).
export function diBo(p: number): TuThe {
  const s = Math.sin(p);
  const gT = 8 + 34 * Math.max(0, Math.sin(p + 1.0));
  const gP = 8 + 34 * Math.max(0, Math.sin(p + 1.0 + Math.PI));
  return gop(
    chan('trai', 30 * s, gT),
    chan('phai', -30 * s, gP),
    tay('trai', {ha: 80, tien: -26 * s, khuyu: 18 + 10 * Math.max(0, -s)}),
    tay('phai', {ha: 80, tien: 26 * s, khuyu: 18 + 10 * Math.max(0, s)}),
    than(3, -6 * s * 0.5),
    dau(0)
  );
}

export type DauVao = {
  frame: number;
  local: number; // số khung hình kể từ đầu cảnh hiện tại
  camA: string;
  camB: string;
  hoa: number; // 0..1 chuyển từ tư thế của cảnh trước sang cảnh này
  chi: number; // 0..1 mức chỉ tay vào hình
  dibo: number; // 0..1 mức đang đi bộ
  pha: number; // pha bước chân
  bienDo: number; // độ lớn giọng 0..1
  nhay: number; // 0..1 cú nhảy vui mừng/giật mình
};

export type KetQuaTuThe = {
  goc: Partial<Record<TenXuong, Q>>;
  hipsLech: [number, number, number]; // dịch chuyển hông so với tư thế chữ T (m)
  bieuCam: Record<string, number>; // trọng số biểu cảm VRM (0..1)
  ngon: Partial<Record<string, Q>>; // xương ngón tay (thả lỏng, chỉ, nắm)
};

const hoaMem = (t: number) => t * t * (3 - 2 * t);

export function tinhTuThe(v: DauVao): KetQuaTuThe {
  const A = TU_THE[v.camA] || TU_THE.mac_dinh;
  const B = TU_THE[v.camB] || TU_THE.mac_dinh;
  let p = phaTre(A, B, v.local);
  if (v.chi > 0) p = thayThe(p, CHI_TAY, hoaMem(Math.min(1, v.chi)));
  if (v.dibo > 0) p = thayThe(p, diBo(v.pha), Math.min(1, v.dibo));

  // cử động nhỏ khi đứng yên: thở, đung đưa, đầu hơi lắc; nói thì gật nhẹ theo giọng
  const f = v.frame;
  const dung = 1 - Math.min(1, v.dibo);
  const them = (x: TenXuong, g: Goc3) => {
    const c = p[x] || O;
    p[x] = [c[0] + g[0], c[1] + g[1], c[2] + g[2]];
  };
  them('chest', [0.012 * Math.sin(f / 22) * dung, 0, 0]);
  them('spine', [0, 0, 0.012 * Math.sin(f / 41) * dung]);
  them('head', [(0.03 * Math.sin(f / 37) + 0.05 * v.bienDo) * dung, 0.05 * Math.sin(f / 53) * dung, 0.02 * Math.sin(f / 61) * dung]);
  them('leftUpperArm', [0, 0, 0.015 * Math.sin(f / 29) * dung]);
  them('rightUpperArm', [0, 0, -0.015 * Math.sin(f / 31) * dung]);

  // nói đến đâu tay nhịp đến đó: cẳng tay nhích lên theo độ lớn giọng (trừ tay đang chỉ)
  const nhip = Math.min(1, v.bienDo * 1.2) * dung;
  them('leftLowerArm', [0, -0.16 * nhip, 0]);
  them('leftUpperArm', [0, -0.05 * nhip, 0]);
  if (v.chi < 0.3) {
    them('rightLowerArm', [0, 0.16 * nhip, 0]);
    them('rightUpperArm', [0, 0.05 * nhip, 0]);
  }
  them('chest', [0.01 * nhip, 0, 0]);
  // giật mình ở hook: đầu và ngực giật ngửa ra sau rồi trở lại
  if (v.camB === 'ngac_nhien') {
    const r = Math.max(0, 1 - v.local / 12);
    them('head', [-0.24 * r, 0, 0]);
    them('chest', [-0.1 * r, 0, 0]);
  }

  const goc: Partial<Record<TenXuong, Q>> = {};
  for (const x of XUONG) {
    const g = p[x];
    goc[x] = g ? qTuGoc(g[0], g[1], g[2]) : QDON;
  }

  // hông: nhấp nhô khi đi, nảy lên khi vui; bước chân đỡ nhún khi chân gập
  const bob = v.dibo * 0.022 * Math.cos(2 * v.pha);
  const nhay = 0.14 * Math.sin(Math.PI * Math.min(1, Math.max(0, v.nhay)));
  const nhun = -0.06 * v.dibo * 0 + 0.004 * Math.sin(f / 22) * dung;
  const hipsLech: [number, number, number] = [0, bob + nhay + nhun - 0.03 * v.dibo, 0];

  // biểu cảm khuôn mặt: pha giữa hai cảm xúc, chớp mắt, nhép miệng theo giọng
  const bc: Record<string, number> = {};
  const eA = BIEU_CAM_CAM[v.camA] || {};
  const eB = BIEU_CAM_CAM[v.camB] || {};
  const ht = hoaMem(Math.min(1, Math.max(0, v.hoa)));
  for (const k of new Set([...Object.keys(eA), ...Object.keys(eB)])) bc[k] = lerp(eA[k] || 0, eB[k] || 0, ht);
  const chop = (m: number, o: number) => {
    const k = (f + o) % m;
    return k < 5 ? 1 - Math.abs(k - 2) / 2.5 : 0;
  };
  bc.blink = Math.min(1, Math.max(chop(97, 13), chop(151, 61)));
  const noi = v.bienDo > 0.12 ? v.bienDo : 0;
  bc.aa = Math.min(1, noi * 0.95);
  const phu = ['ih', 'ou', 'ee', 'oh'][Math.floor(f / 3) % 4];
  bc[phu] = Math.min(1, noi * 0.55 * (0.5 + 0.5 * Math.sin(f * 1.3)));
  const ngon = ngonTay(v.camA, v.camB, ht, v.chi > 0.5 ? v.chi : 0, v.dibo > 0.5);
  return {goc, hipsLech, bieuCam: bc, ngon};
}
