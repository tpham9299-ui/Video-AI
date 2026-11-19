import React, { useLayoutEffect, useRef } from 'react';
import * as T from 'three';
import { CanhProps, MoiTruong } from './types';

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
function route(scene: T.Scene, camera: T.PerspectiveCamera, c: CanhProps) {
  scene.background = new T.Color('#b7d9e7');
  scene.fog = new T.FogExp2('#d6e1d8', 0.02);
  box(scene, 0, -0.22, 0, 240, 0.32, 160, '#809161');
  mesh(scene, new T.BoxGeometry(170, 0.14, 7), surface(false), 0, -0.07, 0);
  for (const z of [-3.45, 3.45]) box(scene, 0, 0.01, z, 165, 0.015, 0.07, '#eee5d3');
  for (let x = -65; x < 70; x += 5) box(scene, x, 0.014, 0, 2.5, 0.018, 0.095, '#fff1c4');
  box(scene, 0, 0, -4.2, 150, 0.22, 1.4, '#c9bca8');
  const facades = ['#c68862', '#cbbd98', '#dfc9aa', '#a9b9b0'];
  for (let i = 0; i < 18; i++) {
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
) {
  scene.background = new T.Color('#bdc8b9');
  scene.fog = new T.Fog('#bbbcaa', 12, 34);
  mesh(scene, new T.BoxGeometry(42, 0.4, 22), surface(true), 0, -0.2, 0);
  box(scene, 0, 4, -10, 40, 8, 0.3, '#74897e');
  box(scene, -2, 3.2, -9.78, 8, 4.3, 0.13, '#e4ddd0');
  for (let i = 0; i < 3; i++) box(scene, i * 2.55 - 4.55, 3.2, -9.66, 2.4, 4, 0.12, '#accbd0');
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

export const CanhMoiTruong: React.FC<{ plan: MoiTruong; canh: CanhProps; time: number }> = ({
  plan,
  canh,
  time,
}) => {
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
    const animate = plan.loai === 'xe_duong' ? route(scene, camera, canh) : table(scene, camera, plan, canh);
    renderer.shadowMap.enabled = true;
    sun.castShadow = true;
    const extent = plan.loai === 'xe_duong' ? 20 : 9;
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
  }, [canh, plan]);
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
