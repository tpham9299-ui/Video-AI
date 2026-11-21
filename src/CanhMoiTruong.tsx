import {BoiCanh, datPhongCanh} from './NenCauChuyen';
import React, { useLayoutEffect, useRef } from 'react';
import * as T from 'three';
import { CanhProps, MoiTruong, PhongCanh, VatPhepThu } from './types';

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const material = (color: string, metalness = 0) =>
  new T.MeshStandardMaterial({ color, metalness, roughness: 0.54 });

function mesh(
  parent: T.Object3D,
  geo: T.BufferGeometry,
  mat: T.Material | T.Material[],
  x: number,
  y: number,
  z: number,
) {
  const obj = new T.Mesh(geo, mat);
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
}
function box(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
) {
  return mesh(parent, new T.BoxGeometry(w, h, d), material(color), x, y, z);
}
function texture(paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  paint(canvas.getContext('2d')!);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
function surface(wood: boolean) {
  const map = texture((ctx) => {
    ctx.fillStyle = wood ? '#ad8054' : '#595e61';
    ctx.fillRect(0, 0, 256, 256);
    let seed = 17;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = random() < 0.5 ? 'rgba(30,18,10,.14)' : 'rgba(255,250,230,.14)';
      ctx.fillRect(random() * 256, random() * 256, wood ? random() * 34 + 2 : 1.6, 1);
    }
  });
  map.wrapS = map.wrapT = T.MirroredRepeatWrapping;
  map.repeat.set(wood ? 4 : 24, 3);
  return new T.MeshStandardMaterial({ map, roughness: 0.86 });
}
function shadow(parent: T.Object3D, w: number, d: number) {
  const map = texture((ctx) => {
    const gradient = ctx.createRadialGradient(128, 128, 15, 128, 128, 124);
    gradient.addColorStop(0, 'rgba(21,16,13,.62)');
    gradient.addColorStop(1, 'rgba(21,16,13,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  });
  const obj = mesh(
    parent,
    new T.PlaneGeometry(w, d),
    new T.MeshBasicMaterial({ map, transparent: true, depthWrite: false }),
    0,
    0.014,
    0,
  );
  obj.rotation.x = -Math.PI / 2;
  return obj;
}
function route(scene: T.Scene, camera: T.PerspectiveCamera, c: CanhProps, set?: PhongCanh) {
  scene.background = new T.Color('#b7d9e7');
  scene.fog = new T.FogExp2('#d6e1d8', 0.02);
  box(scene, 0, -0.22, 0, 240, 0.32, 160, '#809161');
  mesh(scene, new T.BoxGeometry(170, 0.14, 7), surface(false), 0, -0.07, 0);
  for (const z of [-3.45, 3.45]) box(scene, 0, 0.01, z, 165, 0.015, 0.07, '#eee5d3');
  for (let x = -65; x < 70; x += 5) box(scene, x, 0.014, 0, 2.5, 0.018, 0.095, '#fff1c4');
  box(scene, 0, 0, -4.2, 150, 0.22, 1.4, '#c9bca8');
  const facades = ['#c68862', '#cbbd98', '#dfc9aa', '#a9b9b0'];
  for (let i = 0; !set && i < 18; i++) {
    const x = i * 6 - 46,
      h = 4 + ((i * 7) % 5) * 0.9,
      z = -11 - (i % 3);
    box(scene, x, h / 2, z, 5.3, h, 5, facades[i % 4]);
    box(scene, x, h, z, 5.55, 0.24, 5.24, '#7b7669');
    for (let level = 1; level < h - 0.45; level += 1.65) {
      for (const offset of [-1.6, 0, 1.6])
        box(scene, x + offset, level, z + 2.52, 0.98, 0.9, 0.08, '#45616a');
    }
    if (i % 2 === 0) {
      box(scene, x, 1.15, -5.4, 0.3, 2.3, 0.3, '#735541');
      for (const [dx, dy, r, tint] of [
        [0, 3.2, 1.35, '#526f45'],
        [-0.57, 3.05, 0.97, '#67854e'],
        [0.48, 3.83, 0.85, '#749054'],
      ] as const) {
        mesh(scene, new T.IcosahedronGeometry(r, 2), material(tint), x + dx, dy, -5.4);
      }
    }
  }
  if (set) datPhongCanh(scene,set);
  const car = new T.Group();
  scene.add(car);
  shadow(car, 5.3, 2.5);
  // Đùn biên dạng ngang để thân xe, nắp ca-pô và kính gặp nhau đúng mép.
  function profile(points: number[][], width: number, color: string) {
    const shape = new T.Shape(points.map(([x, y]) => new T.Vector2(x, y)));
    return mesh(
      car,
      new T.ExtrudeGeometry(shape, {
        depth: width,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.055,
        bevelThickness: 0.055,
      }),
      material(color, 0.28),
      0,
      0,
      -width / 2,
    );
  }
  profile(
    [
      [-2.05, 0.43],
      [-2.04, 0.86],
      [-1.68, 1.02],
      [0.84, 1.04],
      [1.88, 0.85],
      [2.09, 0.69],
      [2, 0.4],
      [-1.78, 0.37],
    ],
    1.65,
    '#bf4931',
  );
  profile(
    [
      [-1.34, 1.03],
      [-0.86, 1.52],
      [-0.55, 1.63],
      [0.3, 1.6],
      [0.98, 1.04],
    ],
    1.39,
    '#263f49',
  );
  // Dải phản chiếu trên kính và đường gân thân xe bắt sáng khi xe đi qua phố.
  for (const side of [-1, 1]) {
    const glass = mesh(
      car,
      new T.PlaneGeometry(0.6, 0.34),
      material('#58717a', 0.38),
      -0.76,
      1.3,
      side * 0.751,
    );
    glass.rotation.y = side < 0 ? Math.PI : 0;
    box(car, 0, 0.76, side * 0.88, 3.4, 0.027, 0.023, '#ce6c49');
  }
  box(car, -0.11, 1.62, 0, 0.94, 0.07, 1.44, '#ad4934');
  for (const side of [-1, 1]) {
    box(car, -0.38, 1.32, side * 0.735, 0.1, 0.59, 0.075, '#a04733');
    box(car, 0.27, 0.91, side * 0.886, 0.21, 0.045, 0.028, '#d3b8a0');
    box(car, 1.94, 0.73, side * 0.59, 0.17, 0.15, 0.34, '#fff1cb');
    box(car, -2, 0.75, side * 0.6, 0.1, 0.16, 0.31, '#861a15');
  }
  const wheels: T.Group[] = [];
  for (const x of [-1.3, 1.29])
    for (const side of [-1, 1]) {
      const hub = new T.Group();
      car.add(hub);
      hub.position.set(x, 0.42, side * 0.82);
      wheels.push(hub);
      const cyl = (r: number, depth: number, color: string, z: number) => {
        const m = mesh(hub, new T.CylinderGeometry(r, r, depth, 28), material(color), 0, 0, z);
        m.rotation.x = Math.PI / 2;
      };
      cyl(0.42, 0.25, '#252828', 0);
      cyl(0.265, 0.05, '#8f9290', side * 0.14);
      for (let j = 0; j < 5; j++) {
        const a = (j * 2 * Math.PI) / 5;
        const spoke = box(
          hub,
          0.11 * Math.sin(a),
          0.11 * Math.cos(a),
          side * 0.174,
          0.052,
          0.2,
          0.025,
          '#d4d5cb',
        );
        spoke.rotation.z = -a;
      }
    }
  return (time: number) => {
    const timeline = c.nhipXe!;
    const phase = timeline.moc.filter((m) => m.t <= time).slice(-1)[0];
    const dt = Math.min(time - phase.t, phase.chay ?? Infinity);
    const s = clamp(
      (phase.s + phase.v * dt + (phase.a * dt * dt) / 2 + ((phase.j ?? 0) * dt ** 3) / 6) / timeline.tong,
    );
    const x = s * 22 - 11;
    car.position.set(x, 0, 1.45);
    wheels.forEach((w) => (w.rotation.z = -x / 0.42));
    camera.position.set(x * 0.98 + 6.4, 3.0, 12.8);
    camera.lookAt(x * 0.98 + 0.05, 0.55, 0.8);
    return s;
  };
}
const colors: Record<string, string> = {
  do: '#cf4131',
  xanh_duong: '#2877b3',
  xanh_la: '#3f9357',
  vang: '#efbd44',
  trang: '#f1eadb',
  tim: '#8d5eb2',
  cam: '#e48639',
  den: '#303539',
};
function stampedFace(value: string | number) {
  const map = texture((ctx) => {
    ctx.fillStyle = typeof value === 'number' ? '#ece5d5' : '#d3a24e';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#302e2e';
    if (typeof value === 'string') {
      ctx.font = 'bold 138px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(128,128);
      ctx.rotate(Math.PI/2);
      ctx.fillText(value, 0, 2);
    } else {
      const points: number[][] = [];
      if (value % 2) points.push([128, 128]);
      if (value >= 2) points.push([65, 65], [191, 191]);
      if (value >= 4) points.push([191, 65], [65, 191]);
      if (value === 6) points.push([65, 128], [191, 128]);
      for (const [x, y] of points) {
        ctx.beginPath();
        ctx.arc(x, y, 17, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  return new T.MeshStandardMaterial({ map, roughness: 0.48 });
}
function table(
  scene: T.Scene,
  camera: T.PerspectiveCamera,
  plan: Extract<MoiTruong, { loai: 'phep_thu' }>,
  c: CanhProps,
  set?: PhongCanh,
) {
  scene.background = new T.Color('#bdc8b9');
  scene.fog = new T.Fog('#bbbcaa', 12, 34);
  mesh(scene, new T.BoxGeometry(42, 0.4, 22), surface(true), 0, -0.2, 0);
  if (set) datPhongCanh(scene,set);
  else {
  box(scene, 0, 4, -10, 40, 8, 0.3, '#74897e');
  box(scene, -2, 3.2, -9.78, 8, 4.3, 0.13, '#e4ddd0');
  for (let i = 0; i < 3; i++) box(scene, i * 2.55 - 4.55, 3.2, -9.66, 2.4, 4, 0.12, '#accbd0');
  }
  const group = new T.Group();
  scene.add(group);
  const count = plan.gia_tri.length,
    cols = Math.ceil(Math.sqrt(count));
  const radius = Math.hypot(cols - 1, Math.ceil(count / cols) - 1) * 0.5 + 0.63;
  const balls = plan.vat === 'hop_bi';
  const containerX = balls && plan.so_rut ? -1 : 0;
  if (balls) {
    const base = mesh(
      group,
      new T.CylinderGeometry(radius, radius, 0.13, 64),
      material('#687778', 0.5),
      containerX,
      0.07,
      0,
    );
    for (const y of [0.17, 1.04]) {
      const rim = mesh(
        group,
        new T.TorusGeometry(radius, 0.043, 8, 64),
        material('#a0b2b0', 0.5),
        base.position.x,
        y,
        0,
      );
      rim.rotation.x = Math.PI / 2;
    }
    const glass = mesh(
      group,
      new T.CylinderGeometry(radius, radius, 0.91, 64, 1, true),
      new T.MeshPhysicalMaterial({
        color: '#a8dee8',
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        roughness: 0.16,
        side: T.DoubleSide,
      }),
      containerX,
      0.6,
      0,
    );
    glass.renderOrder = 1;
  }
  let taken = 0;
  const update = plan.gia_tri.map((v, i) => {
    const x = balls ? containerX + ((i % cols) - (cols - 1) / 2) * 0.98 : (i - (count - 1) / 2) * 1.55;
    const z = balls ? (Math.floor(i / cols) - (Math.ceil(count / cols) - 1) / 2) * 0.98 : 0;
    const obj = new T.Group();
    group.add(obj);
    const y = balls ? 0.61 : plan.vat === 'dong_xu' ? 0.105 : 0.59;
    if (balls) mesh(obj, new T.SphereGeometry(0.45, 28, 20), material(colors[v]), 0, 0, 0);
    else if (plan.vat === 'dong_xu') {
      mesh(
        obj,
        new T.CylinderGeometry(0.66, 0.66, 0.18, 48),
        [material('#b68434'), stampedFace(v), stampedFace(v === 'N' ? 'S' : 'N')],
        0,
        0,
        0,
      );
    } else {
      const top = Number(v),
        other = [1, 2, 3].filter((n) => n !== Math.min(top, 7 - top));
      mesh(
        obj,
        new T.BoxGeometry(1.18, 1.18, 1.18),
        [other[0], 7 - other[0], top, 7 - top, other[1], 7 - other[1]].map(stampedFace),
        0,
        0,
        0,
      );
    }
    const ground = shadow(group, balls ? 1.25 : 1.75, balls ? 1.25 : 1.7);
    const target = balls && v === plan.mau_rut && taken < plan.so_rut ? taken++ : -1;
    return (p: number) => {
      const moving = target >= 0 || (!balls && plan.dong);
      const lift = moving ? Math.sin(p * Math.PI) * (balls ? 2.1 : 0.94) : 0;
      const destX = containerX + radius + 1 + (target % 3) * 1.02;
      obj.position.set(
        target < 0 ? x : x + (destX - x) * p,
        y + lift - (target >= 0 ? 0.16 * p : 0),
        target < 0 ? z : z + (Math.floor(target / 3) - z) * p,
      );
      ground.position.set(obj.position.x, 0.012, obj.position.z);
      if (!balls && plan.dong) obj.rotation.x = 2 * Math.PI * p;
    };
  });
  const halfWidth = balls ? radius + 1 + (plan.so_rut ? 1.35 : 0) : count * 0.79;
  const distance = Math.max(5.2, halfWidth * (balls ? 3.85 : 5.6));
  camera.position.set(0.08 * distance, 0.71 * distance, 0.76 * distance);
  camera.lookAt(0, 0.38, 0);
  const action = c.cau.find((cue) => /rút|lấy|gieo|tung|lắc/i.test(cue.text));
  return (time: number) => {
    const p = plan.giuCuoi ? 1 : clamp((time - (action?.bat ?? 0.25)) / 1.4);
    update.forEach((fn) => fn(p * p * (3 - 2 * p)));
    return p;
  };
}

// ---------- Giai đoạn D: phép thử nhiều vật theo đặc tả cảnh (boi_canh + thuc_the + quay[].hanh_dong) ----------
type DacTa = Extract<MoiTruong, {loai: 'dac_ta'}>;
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const MAU_TEN: Record<string, string> = {...colors, hong: '#e57fa6', nau: '#8a5a3b', xam: '#9aa0a3'};

// Bối cảnh từ boi_canh của đề: trong nhà (mặt bàn + tường theo loại phòng) hoặc ngoài trời (nền đất/cỏ + bàn gỗ + cây).
function boiCanhDacTa(scene: T.Scene, b: DacTa['boiCanh'], R: number) {
  const toi = b.thoiGian === 'toi';
  scene.background = new T.Color(toi ? '#2b3442' : b.troi);
  const W = Math.max(42, R * 9);
  if (b.ngoaiTroi) {
    scene.fog = new T.Fog(b.troi, 18 + R * 2, 60 + R * 4);
    box(scene, 0, -1.4, 0, 240, 0.3, 240, b.dat);
    mesh(scene, new T.BoxGeometry(R * 3.4 + 4, 0.4, R * 2.4 + 4), surface(true), 0, -0.2, 0);
    for (const x of [-1, 1]) for (const z of [-1, 1]) box(scene, x * (R * 1.5 + 1.6), -0.8, z * (R + 1.5), 0.3, 1.2, 0.3, '#6e4c33');
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 5.2 + ((i * 37) % 7) * 0.3, z = -14 - (i % 3) * 3;
      if (b.mau === 'san_truong' && i % 3 === 1) {
        box(scene, x, 2.6, z - 4, 8, 8, 4, '#e2d2b4');
        for (let f = 0; f < 3; f++) box(scene, x, 0.6 + f * 2.2, z - 1.95, 6.4, 0.9, 0.1, '#5b7a86');
        continue;
      }
      box(scene, x, 0.6, z, 0.35, 4, 0.35, '#6b4c35');
      mesh(scene, new T.IcosahedronGeometry(1.7 + (i % 3) * 0.4, 1), material(i % 2 ? '#56794a' : '#6b8f52'), x, 3.6, z);
    }
    return;
  }
  scene.fog = new T.Fog(toi ? '#2b3442' : b.troi, 14 + R * 2, 40 + R * 4);
  mesh(scene, new T.BoxGeometry(W, 0.4, Math.max(22, R * 5)), surface(true), 0, -0.2, 0);
  const wall = b.mau === 'lop_hoc' ? '#c9d3c2' : b.mau === 'cua_hang' ? '#e6dccb' : b.mau === 'bep' ? '#dfe3e0' : '#74897e';
  const zw = -Math.max(10, R * 2.6);
  box(scene, 0, 4, zw, W, 8 + R, 0.3, wall);
  if (b.mau === 'lop_hoc') box(scene, 0, 3.6, zw + 0.2, 9, 3.6, 0.12, '#2f5745');
  else if (b.mau === 'cua_hang') for (let k = 0; k < 3; k++) {
    box(scene, 0, 1.2 + k * 1.8, zw + 0.8, 14, 0.12, 1.2, '#a07a52');
    for (let j = 0; j < 9; j++) box(scene, -6 + j * 1.5, 1.6 + k * 1.8, zw + 0.8, 0.9, 0.7, 0.8, ['#c8563f', '#e0b24b', '#4b86b4'][(j + k) % 3]);
  } else if (b.mau === 'bep') for (let j = 0; j < 12; j++) box(scene, -11 + j * 2, 2.5, zw + 0.2, 1.9, 1.9, 0.08, j % 2 ? '#f1f1ec' : '#d6e2e4');
  else {
    box(scene, -2, 3.2, zw + 0.22, 8, 4.3, 0.13, '#e4ddd0');
    for (let i = 0; i < 3; i++) box(scene, i * 2.55 - 4.55, 3.2, zw + 0.34, 2.4, 4, 0.12, toi ? '#33435a' : '#accbd0');
  }
}

function matThe(nhan: string | undefined, mau: string) {
  const map = texture((ctx) => {
    ctx.fillStyle = '#fbf7ee';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = mau;
    ctx.lineWidth = 22;
    ctx.strokeRect(14, 14, 228, 228);
    if (nhan) {
      ctx.fillStyle = '#26303a';
      ctx.font = 'bold 150px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nhan, 128, 136);
    }
  });
  return new T.MeshStandardMaterial({map, roughness: 0.6});
}

type TrangThai = {d: T.Vector3; r: T.Euler; s: number; sang: number};

function dacTa(scene: T.Scene, camera: T.PerspectiveCamera, plan: DacTa, c: CanhProps) {
  const vat = plan.vat;
  const chua = vat.filter((v) => ['binh', 'coc', 'hop'].includes(v.kieu));
  const tu = vat.filter((v) => !['binh', 'coc', 'hop'].includes(v.kieu));
  const nho = tu.length > 14 ? 0.78 : 1;   // nhiều vật -> thu nhỏ để vừa khung dọc
  const co = (k: string) => nho * ({bi: 0.84, bong: 1.1, xuc_xac: 1.0, dong_xu: 1.2, the: 1.0}[k] ?? 1);
  const cao = (k: string) => nho * ({bi: 0.42, bong: 0.55, xuc_xac: 0.5, dong_xu: 0.07, the: 0.03}[k] ?? 0.4);
  const buoc = (k: string) => co(k) + 0.2 * nho;
  // 1) vật chứa xếp hàng ngang, bán kính theo số vật bên trong
  const viTri = new Map<string, T.Vector3>();
  const banKinh = new Map<string, number>();
  let x0 = 0;
  const xChua: number[] = [];
  chua.forEach((v) => {
    const n = tu.filter((t) => t.trong === v.id).length;
    const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
    const r = Math.max(0.85, (Math.hypot(cols - 1, Math.ceil(n / cols) - 1) * 0.5 + 0.62) * nho);
    banKinh.set(v.id, r);
    xChua.push(x0 + r);
    x0 += 2 * r + 1.1;
  });
  const lechX = chua.length ? (x0 - 1.1) / 2 : 0;
  chua.forEach((v, i) => viTri.set(v.id, new T.Vector3(xChua[i] - lechX, 0, 0)));
  // 2) vật trong vật chứa: lưới bên trong; vật rời: mỗi thực thể một hàng phía trước
  chua.forEach((v) => {
    const con = tu.filter((t) => t.trong === v.id);
    const cols = Math.max(1, Math.ceil(Math.sqrt(con.length)));
    const rows = Math.ceil(con.length / cols);
    const o = viTri.get(v.id)!;
    con.forEach((t, j) => viTri.set(t.id, new T.Vector3(o.x + ((j % cols) - (cols - 1) / 2) * buoc(t.kieu), cao(t.kieu) + 0.1,
      o.z + (Math.floor(j / cols) - (rows - 1) / 2) * buoc(t.kieu))));
  });
  const roi = new Map<string, VatPhepThu[]>();
  tu.filter((t) => !t.trong || !viTri.has(t.trong)).forEach((t) => roi.set(t.the, [...(roi.get(t.the) ?? []), t]));
  let z = chua.length ? Math.max(...chua.map((v) => banKinh.get(v.id)!)) + 1.4 : 0;
  [...roi.values()].forEach((nhom) => {
    const cols = Math.min(nhom.length, 8);
    nhom.forEach((t, j) => viTri.set(t.id, new T.Vector3(((j % cols) - (cols - 1) / 2) * buoc(t.kieu) * 1.25, cao(t.kieu),
      z + Math.floor(j / cols) * buoc(t.kieu) * 1.25)));
    z += Math.ceil(nhom.length / cols) * buoc(nhom[0].kieu) * 1.25 + 0.5;
  });
  // căn giữa theo z
  const zs = [...viTri.values()].map((p) => p.z);
  const zMid = (Math.min(...zs) + Math.max(...zs)) / 2;
  viTri.forEach((p) => (p.z -= zMid));
  const xs = [...viTri.values()].map((p) => p.x);
  const maxX = Math.max(...xs, ...chua.map((v) => viTri.get(v.id)!.x + banKinh.get(v.id)!));

  // 3) dựng hình
  const group = new T.Group();
  scene.add(group);
  const obj = new Map<string, T.Object3D>();
  const vatLieu = new Map<string, T.MeshStandardMaterial[]>();
  const hanh = plan.quay.hanhDong;
  const ketQua = new Map<string, string | number>();
  hanh.filter((a) => a.dongTu === 'tung').forEach((a) => {
    const kq = (a.thamSo?.ket_qua as (string | number)[] | undefined) ?? [];
    vat.filter((v) => v.id === a.vat || v.the === a.vat).forEach((v, j) => kq[j] !== undefined && ketQua.set(v.id, kq[j]));
  });
  const nap = new Map<string, T.Object3D>();
  vat.forEach((v) => {
    const g = new T.Group();
    group.add(g);
    obj.set(v.id, g);
    const mats: T.MeshStandardMaterial[] = [];
    const m = (color: string, metal = 0) => {
      const mm = material(color, metal);
      mats.push(mm);
      return mm;
    };
    if (v.kieu === 'bi' || v.kieu === 'bong') {
      mesh(g, new T.SphereGeometry(cao(v.kieu), 28, 20), m(v.mau), 0, 0, 0);
      if (v.kieu === 'bong') {
        const band = mesh(g, new T.TorusGeometry(cao(v.kieu) * 1.003, 0.05, 8, 40), m('#f6f2e8'), 0, 0, 0);
        band.rotation.x = Math.PI / 2.6;
      }
    } else if (v.kieu === 'xuc_xac') {
      const top = Number(ketQua.get(v.id) ?? ((v.ban - 1) % 6) + 1);
      const other = [1, 2, 3].filter((n) => n !== Math.min(top, 7 - top));
      const faces = [other[0], 7 - other[0], top, 7 - top, other[1], 7 - other[1]].map(stampedFace);
      mats.push(...faces);
      mesh(g, new T.BoxGeometry(co(v.kieu), co(v.kieu), co(v.kieu)), faces, 0, 0, 0);
    } else if (v.kieu === 'dong_xu') {
      const val = String(ketQua.get(v.id) ?? 'S');
      const faces = [m('#b68434', 0.4), stampedFace(val), stampedFace(val === 'N' ? 'S' : 'N')];
      mesh(g, new T.CylinderGeometry(co(v.kieu) / 2, co(v.kieu) / 2, 0.14 * nho, 40), faces, 0, 0, 0);
    } else if (v.kieu === 'the') {
      const face = matThe(v.nhan, v.mau);
      mats.push(face);
      const side = m(v.mau);
      mesh(g, new T.BoxGeometry(co(v.kieu) * 0.72, 0.05, co(v.kieu)), [side, side, face, side, side, side], 0, 0, 0);
    } else {
      const r = banKinh.get(v.id)!;
      if (v.kieu === 'binh') {
        mesh(g, new T.CylinderGeometry(r, r, 0.13, 56), m('#687778', 0.5), 0, 0.07, 0);
        for (const y of [0.17, 1.04]) {
          const rim = mesh(g, new T.TorusGeometry(r, 0.043, 8, 56), m('#a0b2b0', 0.5), 0, y, 0);
          rim.rotation.x = Math.PI / 2;
        }
        const glass = mesh(g, new T.CylinderGeometry(r, r, 0.91, 56, 1, true), new T.MeshPhysicalMaterial({
          color: '#a8dee8', transparent: true, opacity: 0.14, depthWrite: false, roughness: 0.16, side: T.DoubleSide}), 0, 0.6, 0);
        glass.renderOrder = 1;
      } else if (v.kieu === 'coc') {
        mesh(g, new T.CylinderGeometry(r, r * 0.8, 0.08, 48), m(v.mau), 0, 0.04, 0);
        mesh(g, new T.CylinderGeometry(r, r * 0.8, 1.1, 48, 1, true), new T.MeshStandardMaterial({color: v.mau, roughness: 0.5, side: T.DoubleSide}), 0, 0.55, 0);
      } else {
        const h = 0.95, t = 0.06;
        box(g, 0, t / 2, 0, 2 * r, t, 2 * r, v.mau);
        for (const s of [-1, 1]) {
          box(g, s * (r - t / 2), h / 2, 0, t, h, 2 * r, v.mau);
          box(g, 0, h / 2, s * (r - t / 2), 2 * r, h, t, v.mau);
        }
      }
      if (hanh.some((a) => (a.dongTu === 'mo' || a.dongTu === 'dong') && (a.vat === v.id || a.vat === v.the))) {
        const pivot = new T.Group();
        pivot.position.set(0, v.kieu === 'hop' ? 0.95 : 1.1, -r);
        g.add(pivot);
        const lid = v.kieu === 'hop' ? box(pivot, 0, 0.03, r, 2 * r + 0.06, 0.06, 2 * r + 0.06, v.mau)
          : mesh(pivot, new T.CylinderGeometry(r * 1.04, r * 1.04, 0.07, 48), material('#8a9a9b', 0.4), 0, 0.035, r);
        lid.castShadow = true;
        nap.set(v.id, pivot);
      }
    }
    vatLieu.set(v.id, mats);
    if (v.kieu !== 'binh' && v.kieu !== 'coc' && v.kieu !== 'hop') {
      const s = shadow(group, co(v.kieu) * 1.5, co(v.kieu) * 1.5);
      g.userData.bong = s;
    }
  });

  // 4) hành động -> hàm áp trạng thái; khay "lấy ra" bên phải cụm vật
  const chon = (ref: string, so?: number | null, mau?: unknown) => {
    let ds = vat.filter((v) => v.id === ref || v.the === ref);
    if (typeof mau === 'string' && ds.some((v) => v.mau === (MAU_TEN[mau] ?? mau))) ds = ds.filter((v) => v.mau === (MAU_TEN[mau] ?? mau));
    return so ? ds.slice(0, so) : ds;
  };
  let khay = 0;
  const kichBan = hanh.map((a) => {
    const ds = chon(a.vat, a.so, a.thamSo?.mau);
    const dich = new Map<string, T.Vector3>();
    if (a.dongTu === 'lay_ra' || a.dongTu === 'bo_vao') ds.forEach((v) => {
      const p = viTri.get(v.id)!;
      dich.set(v.id, new T.Vector3(maxX + 1.3 + (khay % 4) * buoc(v.kieu) - p.x, cao(v.kieu) - p.y, Math.floor(khay / 4) * buoc(v.kieu) - p.z));
      khay++;
    });
    const den = typeof a.thamSo?.den === 'string' ? chon(a.thamSo.den as string) : [];
    return {a, ds, dich, den};
  });
  const tinhR = () => {
    const pts = [...viTri.entries()].map(([id, p]) => p.clone().add(new T.Vector3(0, 0, 0)).setY(banKinh.get(id) ?? 0));
    kichBan.forEach((k) => k.dich.forEach((d, id) => pts.push(viTri.get(id)!.clone().add(d))));
    return pts;
  };
  const diem = tinhR();
  const tamCum = (ps: T.Vector3[]) => {
    const b = new T.Box3().setFromPoints(ps);
    return {c: b.getCenter(new T.Vector3()), r: Math.max(1.2, b.getSize(new T.Vector3()).length() / 2)};
  };
  const all = tamCum(diem);
  boiCanhDacTa(scene, plan.boiCanh, all.r);
  const tieu = plan.quay.tieuDiem.flatMap((r) => chon(r)).map((v) => viTri.get(v.id)!);
  // vật được lấy ra / bỏ vào luôn nằm trong khung (khay bên phải cụm vật)
  if (tieu.length) kichBan.forEach((k) => k.dich.forEach((d, id) => tieu.push(viTri.get(id)!.clone().add(d))));
  const q = plan.quay;
  const focus = ['trung', 'can', 'theo_vat'].includes(q.gocMay) && tieu.length ? tamCum(tieu) : all;
  const huong: Record<string, [number, number, number]> = {
    toan_canh: [0.08, 0.71, 0.76], trung: [0.1, 0.6, 0.8], can: [0.1, 0.5, 0.86],
    tu_tren: [0.02, 0.97, 0.25], ngang: [0.1, 0.24, 0.97], theo_vat: [0.1, 0.6, 0.8]};
  const dir = new T.Vector3(...(huong[q.gocMay] ?? huong.toan_canh)).normalize();
  const xa = Math.max(5.6, focus.r * ({trung: 3.6, can: 3.0}[q.gocMay] ?? 4.1));
  const duration = c.soFrame / 30;

  return (time: number) => {
    const st = new Map<string, TrangThai>();
    vat.forEach((v) => st.set(v.id, {d: new T.Vector3(), r: new T.Euler(), s: 1, sang: 0}));
    const napGoc = new Map<string, number>();
    kichBan.forEach(({a, ds, dich, den}) => {
      const x = a.xong ? 1 : eio(clamp((time - a.t) / Math.max(0.2, a.d)));
      ds.forEach((v, j) => {
        const s = st.get(v.id)!;
        const h = cao(v.kieu) * 2;
        switch (a.dongTu) {
          case 'lay_ra': case 'bo_vao': {
            const ra = a.dongTu === 'lay_ra';
            s.d.addScaledVector(dich.get(v.id)!, ra ? x : 1 - x).y += Math.sin(Math.PI * x) * 2.1;
            break;
          }
          case 'tung': s.d.y += Math.sin(Math.PI * x) * 2.4; s.r.x += 4 * Math.PI * (1 - x) * (j % 2 ? 1 : -1); s.r.z += 2 * Math.PI * (1 - x); break;
          case 'lan': s.d.x -= (1 - x) * 3.2; s.r.z += (1 - x) * 3.2 / Math.max(0.2, cao(v.kieu)); break;
          case 'quay': s.r.y += ((Number(a.thamSo?.goc) || 360) * Math.PI / 180) * x; break;
          case 'roi': s.d.y += (Number(a.thamSo?.do_cao) || 3) * (1 - x * x); break;
          case 'xep': s.d.x += Math.cos(j * 2.4) * 1.8 * (1 - x); s.d.z += Math.sin(j * 2.4) * 1.8 * (1 - x); s.d.y += Math.sin(Math.PI * x) * h; break;
          case 'di_chuyen': {
            const p = viTri.get(v.id)!;
            if (den.length) {
              const tgt = viTri.get(den[0].id)!;
              const d = tgt.clone().sub(p).setY(0);
              const L = d.length();
              s.d.addScaledVector(d.normalize(), Math.max(0, L - (banKinh.get(den[0].id) ?? 0.6) - co(v.kieu)) * x);
            } else s.d.x -= (1 - x) * 3;
            break;
          }
          case 'danh_dau_chon': s.d.y += 0.35 * x; s.s *= 1 + 0.15 * x; s.sang = Math.max(s.sang, x); break;
          case 'sang_len': s.sang = Math.max(s.sang, x); break;
          case 'mo': napGoc.set(v.id, 1.9 * x); break;
          case 'dong': napGoc.set(v.id, 1.9 * (1 - x)); break;
        }
      });
    });
    vat.forEach((v) => {
      const g = obj.get(v.id)!, s = st.get(v.id)!, p = viTri.get(v.id)!;
      g.position.copy(p).add(s.d);
      g.rotation.copy(s.r);
      g.scale.setScalar(s.s);
      vatLieu.get(v.id)!.forEach((m) => {
        m.emissive.set(v.mau);
        m.emissiveIntensity = 0.55 * s.sang;
      });
      const b = g.userData.bong as T.Object3D | undefined;
      if (b) {
        b.position.set(g.position.x, 0.012, g.position.z);
        b.scale.setScalar(1 / (1 + Math.max(0, s.d.y) * 0.35));
      }
      const lid = nap.get(v.id);
      if (lid) lid.rotation.x = -(napGoc.get(v.id) ?? (hanh.some((a) => a.dongTu === 'dong' && (a.vat === v.id || a.vat === v.the)) ? 1.9 : 0));
    });
    // máy quay: góc theo cảnh + chuyển máy suốt cảnh; theo_vat bám tâm vật tiêu điểm đang chuyển động
    const e = eio(clamp(time / Math.max(1, duration * 0.9)));
    let tam = focus.c.clone();
    if (q.gocMay === 'theo_vat' && tieu.length) {
      const ps = plan.quay.tieuDiem.flatMap((r) => chon(r)).map((v) => obj.get(v.id)!.position.clone());
      tam = tamCum(ps).c;
    }
    let d = dir.clone(), k = 1;
    const ngang = new T.Vector3(-dir.z, 0, dir.x).normalize();
    if (q.chuyenMay === 'xoay_quanh') d.applyAxisAngle(new T.Vector3(0, 1, 0), -0.6 * (1 - e));
    else if (q.chuyenMay === 'luot_vao') k = 1 + 0.25 * (1 - e);
    if (q.chuyenMay === 'luot_ngang') tam.addScaledVector(ngang, focus.r * 0.8 * (1 - e));
    camera.position.copy(tam).addScaledVector(d, xa * k);
    // nhìn hơi về phía trước cụm vật: vật dồn lên giữa khung dọc, hàng vật trước không bị phụ đề che
    camera.lookAt(tam.x, tam.y, tam.z + focus.r * 0.45);
    return time;
  };
}

export const CanhMoiTruong: React.FC<{ plan: MoiTruong; canh: CanhProps; time: number }> = ({
  plan,
  canh,
  time,
}) => {
  const set = React.useContext(BoiCanh);
  const host = useRef<HTMLDivElement>(null);
  const draw = useRef<(t: number) => void>();
  useLayoutEffect(() => {
    const renderer = new T.WebGLRenderer({

      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(720, 1280, false);
    Object.assign(renderer.domElement.style, {width: "100%", height: "100%", display: "block"});
    host.current!.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(44, 9 / 16, 0.06, 220);
    scene.add(new T.HemisphereLight('#e8f2ff', '#a39678', 1.45));
    const sun = new T.DirectionalLight('#fff0c9', 2.25);
    sun.position.set(-6, 10, 6);
    scene.add(sun);
    const animate = plan.loai === 'xe_duong' ? route(scene, camera, canh, set)
      : plan.loai === 'dac_ta' ? dacTa(scene, camera, plan, canh)   // bối cảnh lấy từ boi_canh của đặc tả (ưu tiên hơn phongCanh)
      : table(scene, camera, plan, canh, set);
    renderer.shadowMap.enabled = true;
    sun.castShadow = true;
    const extent = plan.loai === 'xe_duong' ? 20 : plan.loai === 'dac_ta' ? 14 : 9;
    Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, far: 70 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.normalBias = 0.023;
    scene.traverse((node) => {
      if (node instanceof T.Mesh && !Array.isArray(node.material) && !node.material.transparent) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    let previous = NaN;
    draw.current = (t) => {
      const position = animate(t);
      if (position !== previous) renderer.render(scene, camera);
      previous = position;
    };
    return () => {
      draw.current = undefined;
      const mats = new Set<T.Material>(),
        textures = new Set<T.Texture>();
      scene.traverse((node) => {
        if (node instanceof T.Mesh) {
          node.geometry.dispose();
          (Array.isArray(node.material) ? node.material : [node.material]).forEach((m) => mats.add(m));
        }
      });
      mats.forEach((m) => {
        const map = (m as T.MeshStandardMaterial).map;
        if (map) textures.add(map);
        m.dispose();
      });
      textures.forEach((tex) => tex.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [canh, plan, set]);
  useLayoutEffect(() => {
    draw.current?.(time);
  }, [time, canh, plan]);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={host} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom,rgba(16,27,32,.76),rgba(16,27,32,.38) 26%,transparent 39%,transparent 59%,rgba(14,22,26,.38) 73%,rgba(12,18,21,.82))',
        }}
      />
    </div>
  );
};
