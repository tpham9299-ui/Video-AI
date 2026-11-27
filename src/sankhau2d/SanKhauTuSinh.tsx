// v99.1 — SÂN KHẤU TỰ SINH 2.5D (tầng 2). Lớp SVG do mã Python của BP2 sinh (chạy trong hộp cát scripts/tu_sinh_svg.py,
// đã kiểm thẻ / thuộc tính / tọa độ trong viewBox 0 0 800 540). Mỗi lớp có mốc `t` = mốc lời đọc của bước nó thuộc về.
// Hiệu ứng (spring, theo frame - không CSS transition): moc = mọc lên + hiện; no = nở từ tâm hình; ve = quét lộ trái -> phải;
// sang = hiện + sáng lên (chỉ brightness, không blur). Lớp mới nhất được nhấn sáng ~1,4 s rồi lắng xuống; lớp cũ dịu 82 % để mắt theo lớp đang giảng.
import React from 'react';
import {spring} from 'remotion';
import {texSangChu} from '../chu';
import {FONT} from '../theme';
import {BAT_DAU_BUT_VE, BAT_QUET_MAT_PHANG, BAT_XUNG_NHIP_DIEM} from '../khung4tang/cauHinhTinhChinh';

// v100.2: 2 vòng sonar đồng tâm nở +22 px, mờ 0,85 -> 0 trong ~18 frame rồi tắt (f = số frame kể từ lúc điểm xuất hiện)
export const XungSonar: React.FC<{cx: number; cy: number; f: number; mau?: string; r0?: number}> = ({cx, cy, f, mau = '#FBBF24', r0 = 12}) => {
  if (!BAT_XUNG_NHIP_DIEM || f < 0 || f >= 18 + 5) return null;
  return (
    <g data-sonar pointerEvents="none">
      {[0, 1].map((i) => {
        const q = (f - 5 * i) / 18;
        if (q < 0 || q >= 1) return null;
        return <circle key={i} cx={cx} cy={cy} r={r0 + 22 * q} fill="none" stroke={mau} strokeWidth={i ? 1.5 : 2} opacity={0.85 * (1 - q)} />;
      })}
    </g>
  );
};

// v100.2: đầu bút = vòng ngoài mờ + lõi trắng, chỉ hiện khi nét đang vẽ (0 < tiến độ < 1)
export const DauBut: React.FC<{x: number; y: number; u: number}> = ({x, y, u}) => {
  if (!BAT_DAU_BUT_VE || !(u > 0 && u < 1)) return null;
  return (
    <g data-dau-but pointerEvents="none">
      <circle cx={x} cy={y} r={9} fill="#FFFFFF" opacity={0.28} />
      <circle cx={x} cy={y} r={3.5} fill="#FFFFFF" />
    </g>
  );
};

// v100.2: dải sáng nghiêng lướt qua đa giác `d` 1 lần (~16 frame), bị cắt đúng theo đa giác
const QuetMat: React.FC<{id: string; d: string; f: number}> = ({id, d, f}) => {
  if (!BAT_QUET_MAT_PHANG || f < 0 || f >= 16) return null;
  const n = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
  if (!xs.length) return null;
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys) - 10, y1 = Math.max(...ys) + 10;
  const q = f / 16, bx = x0 - 70 + (x1 - x0 + 140) * q;
  return (
    <g data-quet-mat pointerEvents="none">
      <clipPath id={`ts-qm-${id}`}><path d={d} /></clipPath>
      <polygon clipPath={`url(#ts-qm-${id})`} points={`${bx},${y0} ${bx + 44},${y0} ${bx + 14},${y1} ${bx - 30},${y1}`} fill="#FEF3C7" opacity={0.28} />
    </g>
  );
};

export type LopTuSinh = {id: string; t: number; hienDeDen?: number; tNhan?: number; svg: string; hieu_ung: 'moc' | 'no' | 'sang' | 've'; buoc?: number; nhan?: string; nhom?: string};

// lớp cùng `nhom` thay nhau: khi lớp sau cùng nhóm đã tới mốc, lớp cũ mờ hẳn nhanh trong 5 khung hình (~0,17 s)
// rồi lớp mới mới bắt đầu hiện (không bao giờ đè 2 lớp chữ lên nhau).
export const KHUNG_RA_NHOM = 5;

export function heSoThay(l: LopTuSinh, ds: LopTuSinh[], t: number, fps = 30): number {
  if (!l.nhom) return 1;
  const sau = ds.filter((x) => x.nhom === l.nhom && x.t > l.t && x.t <= t);
  if (!sau.length) return 1;
  const tRa = KHUNG_RA_NHOM / Math.max(1, fps);
  return Math.max(0, 1 - (t - Math.min(...sau.map((x) => x.t))) / tRa);
}

// mốc vào thực tế của lớp: nếu cùng `nhom` đã có lớp trước đó -> chờ lớp cũ fade-out xong (5 khung) mới bắt đầu fade-in
export function mocVaoLop(l: LopTuSinh, ds: LopTuSinh[], fps = 30): number {
  if (!l.nhom) return l.t;
  const coTruoc = ds.some((x) => x.nhom === l.nhom && x.t < l.t);
  return coTruoc ? l.t + KHUNG_RA_NHOM / Math.max(1, fps) : l.t;
}
export type TuSinhVao = {chiLopKichBan?: boolean; viewBox?: string; lop: LopTuSinh[]; mo_ta?: string; de_bai?: string; buoc?: {t: number; text: string}[]};

const W = 800, H = 540;

// ───────── Bộ dựng hình TỔNG QUÁT (v99.8): suy hình từ chữ đề + chữ từng bước, không gắn riêng bài nào ─────────
const SUB: Record<string, string> = {'0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', n: 'ₙ', i: 'ᵢ'};
const SUP: Record<string, string> = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', n: 'ⁿ'};
export function chuanKyHieu(s: string): string {
  return s
    .replace(/\b([A-Za-z])_\{?([0-9ni])\}?/g, (_m, a, b) => a + (SUB[b] || b))
    .replace(/([A-Za-z0-9)])\^\{?([0-9n])\}?/g, (_m, a, b) => a + (SUP[b] || b))
    .replace(/\b(m|cm|km|dm|mm)2(?![0-9])/g, (_m, u) => u + '²')
    .replace(/\b(m|cm|km|dm|mm)3(?![0-9])/g, (_m, u) => u + '³');
}

// v99.10: bước nhắc tới mặt phẳng -> làm nổi mặt phẳng đang xét, dịu phần còn lại
export const RE_MAT_PHANG = /mặt phẳng|\bmp\b|\(\s*[A-Z]{3,4}\s*\)/i;
export function buocHienTai(bs: {t: number; text: string}[] | undefined, t: number): string {
  const ds = (bs || []).slice().sort((a, b) => a.t - b.t);
  let r = '';
  ds.forEach((b) => b.t <= t && (r = b.text));
  return r;
}

type TP = {id: string; t: number; loai: 'doan' | 'diem' | 'hinh' | 'nhan' | 'mat'; d?: string; x?: number; y?: number; ten?: string; x2?: number; y2?: number; nhanh?: boolean};

// giãn nhãn: đẩy cặp gần nhau ra xa, kẹp trong khung (chữ >= 22 px nên cần cách >= 30)
function gianNhan(ps: {x: number; y: number}[], cach = 32): void {
  for (let it = 0; it < 24; it++) {
    for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) {
      const dx = ps[b].x - ps[a].x, dy = ps[b].y - ps[a].y, d = Math.hypot(dx, dy) || 0.01;
      if (d < cach) {
        const k = (cach - d) / 2 / d;
        ps[a].x -= dx * k; ps[a].y -= dy * k; ps[b].x += dx * k; ps[b].y += dy * k;
      }
    }
    ps.forEach((p) => { p.x = Math.min(W - 28, Math.max(28, p.x)); p.y = Math.min(H - 34, Math.max(34, p.y)); });
  }
}

export function suyHinhTongQuat(de: string, buoc: {t: number; text: string}[]): TP[] {
  const dsB = [...buoc].sort((a, b) => a.t - b.t);
  const tat = chuanKyHieu([de, ...dsB.map((b) => b.text)].join(' . '));
  const tamGiac = tat.match(/tam giác\s+([A-Z])([A-Z])([A-Z])\b/i);
  const chuNhat = tat.match(/hình\s+(chữ nhật|vuông|bình hành|thang)\s+([A-Z])([A-Z])([A-Z])([A-Z])\b/i);
  const tron = /đường tròn|hình tròn|cung tròn|bán kính/i.test(tat);
  const dinh: Record<string, {x: number; y: number}> = {};
  let hinh: string[] = [];
  if (tamGiac) {
    hinh = [tamGiac[1], tamGiac[2], tamGiac[3]].map((c) => c.toUpperCase());
    const vuongTai = /vuông tại\s+([A-Z])/i.exec(tat)?.[1];
    const P = [{x: 400, y: 100}, {x: 160, y: 430}, {x: 640, y: 430}];
    if (vuongTai === hinh[1]) { P[0] = {x: 160, y: 110}; P[1] = {x: 160, y: 430}; P[2] = {x: 620, y: 430}; }
    else if (vuongTai === hinh[2]) { P[0] = {x: 640, y: 110}; P[2] = {x: 640, y: 430}; P[1] = {x: 180, y: 430}; }
    else if (vuongTai === hinh[0]) { P[0] = {x: 180, y: 110}; P[1] = {x: 180, y: 430}; P[2] = {x: 620, y: 110}; }
    hinh.forEach((c, i) => (dinh[c] = P[i]));
  } else if (chuNhat) {
    hinh = [2, 3, 4, 5].map((i) => chuNhat[i].toUpperCase());
    const vuong = /vuông/i.test(chuNhat[1]);
    const w = vuong ? 300 : 460, h = vuong ? 300 : 280, x0 = 400 - w / 2, y0 = 270 - h / 2;
    const P = /bình hành/i.test(chuNhat[1]) ? [{x: x0 + 70, y: y0}, {x: x0, y: y0 + h}, {x: x0 + w - 70, y: y0 + h}, {x: x0 + w, y: y0}]
      : [{x: x0, y: y0}, {x: x0, y: y0 + h}, {x: x0 + w, y: y0 + h}, {x: x0 + w, y: y0}];
    hinh.forEach((c, i) => (dinh[c] = P[i]));
  }
  const ra: TP[] = [];
  const t0 = dsB.length ? dsB[0].t : 0;
  const tBuoc = (i: number) => (dsB[i] ? dsB[i].t : t0);
  const hanBuoc = (i: number) => (dsB[i + 1] ? dsB[i + 1].t : tBuoc(i) + 6);
  const daCo = new Set<string>();
  if (hinh.length) {
    const tl = Math.max(0, tBuoc(0) - 0.0);
    ra.push({id: 'tq-hinh', t: tl, loai: 'hinh', d: hinh.map((c, i) => `${i ? 'L' : 'M'}${dinh[c].x} ${dinh[c].y}`).join(' ') + ' Z'});
    hinh.forEach((c, i) => {
      daCo.add(c + hinh[(i + 1) % hinh.length]); daCo.add(hinh[(i + 1) % hinh.length] + c);
      ra.push({id: `tq-d-${c}`, t: tl + 0.2 + 0.15 * i, loai: 'diem', x: dinh[c].x, y: dinh[c].y, ten: c});
    });
  } else if (tron) {
    ra.push({id: 'tq-tron', t: tBuoc(0), loai: 'hinh', d: 'M 250 270 a 150 150 0 1 0 300 0 a 150 150 0 1 0 -300 0'});
    ra.push({id: 'tq-o', t: tBuoc(0) + 0.3, loai: 'diem', x: 400, y: 270, ten: 'O'});
  }
  // mỗi bước: kẻ thêm đoạn nhắc tới (cả hai đầu đã biết) → điểm mới (trung điểm / thuộc) → nhãn đại lượng
  const toa = (c: string) => dinh[c];
  dsB.forEach((b, i) => {
    const txt = chuanKyHieu(b.text);
    let k = 0;
    const slot = () => Math.min(hanBuoc(i) - 0.4, tBuoc(i) + 0.3 + 0.55 * k++);
    for (const m of txt.matchAll(/trung điểm\s+([A-Z])\s+(?:của|của đoạn)\s+([A-Z])([A-Z])\b/gi)) {
      const [, p, a, c] = m;
      if (toa(a) && toa(c) && !toa(p)) {
        dinh[p] = {x: (toa(a).x + toa(c).x) / 2, y: (toa(a).y + toa(c).y) / 2};
        ra.push({id: `tq-m-${p}`, t: slot(), loai: 'diem', x: dinh[p].x, y: dinh[p].y, ten: p, nhanh: true});
      }
    }
    // mặt phẳng: "mặt phẳng (SAC)" / "mp(ABC)" khi mọi đỉnh đã biết -> đa giác tô sáng
    for (const m of txt.matchAll(/(?:mặt phẳng|\bmp)\s*\(?\s*([A-Z]{3,4})\s*\)?/gi)) {
      const vs = m[1].toUpperCase().split('');
      if (vs.every((c) => toa(c)) && new Set(vs).size === vs.length) {
        ra.push({id: `tq-mat-${i}-${m[1]}`, t: slot(), loai: 'mat', d: vs.map((c, j) => `${j ? 'L' : 'M'}${toa(c).x} ${toa(c).y}`).join(' ') + ' Z'});
      }
    }
    for (const m of txt.matchAll(/\b([A-Z])([A-Z])\b/g)) {
      const a = m[1], c = m[2], key = a + c;
      if (a === c || !toa(a) || !toa(c) || daCo.has(key)) continue;
      daCo.add(key); daCo.add(c + a);
      ra.push({id: `tq-s-${key}`, t: slot(), loai: 'doan', x: toa(a).x, y: toa(a).y, x2: toa(c).x, y2: toa(c).y, nhanh: true});
    }
    // đại lượng: "S₀ = 9 m²", "tỉ lệ 1:2", "bán kính 5 cm" → viên nhãn dưới hình
    const dq = [...txt.matchAll(/([A-Za-zΔ][₀-₉ₙᵢ]?|diện tích|chu vi|bán kính)\s*(?:=|bằng)\s*(\d+(?:[.,]\d+)?\s*(?:cm|m|km|dm|mm)?[²³]?)/gi)].slice(0, 1);
    dq.forEach((m) => ra.push({id: `tq-q-${i}`, t: slot(), loai: 'nhan', ten: `${m[1]} = ${m[2].trim()}`, x: 400, y: 500, nhanh: true}));
  });
  return ra;
}

const CYAN = '#5EEAD4', AMBER = '#FBBF24', XAM = '#9CA3AF', NEN = '#0B1220';

// ───────── v99.9: hình minh họa theo DẠNG bài khi đề không có đỉnh chữ cái (Koch / tự đồng dạng / cấp số theo bước) ─────────
type Pt = {x: number; y: number};
const RE_KOCH = /koch|bông tuyết|fractal|tự đồng dạng/i;
const poly = (ps: Pt[]) => ps.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ') + ' Z';

// 4 mức bông tuyết Koch từ tam giác đều cạnh 380, tâm (400, 270): poly[k] = đường viền mức k, bump[k] = các tam giác mới thêm ở mức k
export function taoKoch(L = 380, cx = 400, cy = 270): {poly: Pt[][]; bump: Pt[][][]} {
  const R = L / Math.sqrt(3);
  const p0: Pt[] = [-90, 30, 150].map((g) => ({x: cx + R * Math.cos((g * Math.PI) / 180), y: cy + R * Math.sin((g * Math.PI) / 180)}));
  const ps: Pt[][] = [p0], bs: Pt[][][] = [[]];
  for (let k = 1; k <= 3; k++) {
    const prev = ps[k - 1], nx: Pt[] = [], bm: Pt[][] = [];
    prev.forEach((a, i) => {
      const b = prev[(i + 1) % prev.length];
      const p1 = {x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3}, p2 = {x: a.x + (2 * (b.x - a.x)) / 3, y: a.y + (2 * (b.y - a.y)) / 3};
      const vx = p2.x - p1.x, vy = p2.y - p1.y, c = Math.cos(Math.PI / 3), sn = Math.sin(Math.PI / 3);
      const c1 = {x: p1.x + vx * c - vy * sn, y: p1.y + vx * sn + vy * c}, c2 = {x: p1.x + vx * c + vy * sn, y: p1.y - vx * sn + vy * c};
      const d = (q: Pt) => Math.hypot(q.x - cx, q.y - cy);
      const peak = d(c1) > d(c2) ? c1 : c2;
      nx.push(a, p1, peak, p2);
      bm.push([p1, peak, p2]);
    });
    ps.push(nx); bs.push(bm);
  }
  return {poly: ps, bump: bs};
}
const KOCH = taoKoch();

const Pill: React.FC<{x: number; y: number; ten: string; mau?: string; sp: number}> = ({x, y, ten, mau = AMBER, sp}) => {
  const w = Math.max(120, ten.length * 15 + 34);
  const cx = Math.min(W - 6 - w / 2, Math.max(6 + w / 2, x));
  return (
    <g opacity={Math.min(1, sp * 1.2)} transform={`translate(0 ${12 * (1 - Math.min(1, sp))})`}>
      <rect x={cx - w / 2} y={y - 22} width={w} height={44} rx={22} fill={NEN} stroke={mau} strokeWidth={2} />
      <text x={cx} y={y + 8} fontSize={24} fontWeight={700} fill={mau} textAnchor="middle">{texSangChu(ten)}</text>
    </g>
  );
};

// chỉ số bước đang giảng + tiến độ trong bước
function tienDo(bs: {t: number}[], t: number): {i: number; n: number; u: number; dt: number} {
  const n = bs.length;
  let i = -1;
  bs.forEach((b, j) => b.t <= t && (i = j));
  if (i < 0) return {i: 0, n, u: 0, dt: 0};
  const han = bs[i + 1] ? bs[i + 1].t - bs[i].t : 6;
  const dt = t - bs[i].t;
  return {i, n, u: Math.min(1, dt / Math.max(1.2, han * 0.7)), dt};
}

const LopKoch: React.FC<{de: string; bs: {t: number}[]; t: number; fps: number}> = ({de, bs, t, fps}) => {
  const b = bs.length >= 1 ? bs : [0, 5, 10, 15].map((x) => ({t: x}));
  const {i, n, u, dt} = tienDo(b, t);
  const muc = i <= 0 ? 0 : n >= 4 ? Math.min(3, i) : Math.min(3, Math.round((i * 3) / Math.max(1, n - 1)));
  const cuoi = n > 1 && i >= n - 1;
  const sp = spring({frame: Math.max(0, dt * fps), fps, config: {damping: 16, stiffness: 120, mass: 0.8}});
  const canh = (chuanKyHieu(de).match(/(\d+(?:[.,]\d+)?)\s*(km|cm|dm|mm|m)\b/i) || [])[0] || 'a';
  const so = KOCH.bump[muc] ? Math.ceil(u * KOCH.bump[muc].length) : 0;
  const nenMuc = Math.max(0, muc - 1);
  return (
    <g data-lop="koch">
      {muc === 0 ? (
        <path d={poly(KOCH.poly[0])} fill={CYAN} fillOpacity={0.12 * Math.min(1, dt / 1.1)} stroke={CYAN} strokeWidth={5} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, dt / 1.1)} />
      ) : (
        <>
          <path d={poly(KOCH.poly[nenMuc])} fill={CYAN} fillOpacity={cuoi ? 0.3 : 0.16} stroke={CYAN} strokeWidth={4} strokeLinejoin="round" />
          {KOCH.bump[muc].slice(0, so).map((tg, j) => (
            <path key={j} d={poly(tg)} fill={AMBER} fillOpacity={cuoi ? 0.32 : 0.55} stroke={AMBER} strokeWidth={muc === 3 ? 2 : 3} strokeLinejoin="round" />
          ))}
          {u >= 1 || cuoi ? <path d={poly(KOCH.poly[muc])} fill="none" stroke={CYAN} strokeWidth={muc === 3 ? 2.5 : 4} strokeLinejoin="round" /> : null}
        </>
      )}
      {muc === 0 ? (
        <g opacity={Math.min(1, sp * 1.2)}>
          <text x={400} y={298} fontSize={44} fontWeight={800} fill="#F8FAFC" textAnchor="middle" stroke={NEN} strokeWidth={6} paintOrder="stroke">S₀</text>
          <line x1={210} y1={412} x2={590} y2={412} stroke={AMBER} strokeWidth={3} />
          <line x1={210} y1={400} x2={210} y2={424} stroke={AMBER} strokeWidth={3} />
          <line x1={590} y1={400} x2={590} y2={424} stroke={AMBER} strokeWidth={3} />
          <Pill x={400} y={412} ten={canh} sp={sp} />
        </g>
      ) : null}
      {muc >= 1 ? <Pill x={110} y={150} ten="cạnh × 1/3" sp={sp} /> : null}
      {muc >= 2 ? <Pill x={690} y={150} ten="thêm × 4/9" sp={sp} /> : null}
      {cuoi ? <Pill x={100} y={400} ten="Σ cộng dồn" mau={CYAN} sp={sp} /> : null}
    </g>
  );
};

// dự phòng cuối: đề không nhận ra hình nào -> luôn có đồ họa tiến trình theo bước (cột tăng dần + nút bước đang giảng)
const LopTienTrinh: React.FC<{bs: {t: number}[]; t: number; fps: number}> = ({bs, t, fps}) => {
  const b = bs.length ? bs.slice(0, 6) : [0, 5, 10, 15].map((x) => ({t: x}));
  const {i, dt} = tienDo(b, t);
  const n = b.length, gap = 560 / Math.max(1, n - 1);
  return (
    <g data-lop="tien-trinh">
      {b.map((bb, j) => {
        const x = n === 1 ? 400 : 120 + gap * j;
        const sp = spring({frame: Math.max(0, (t - bb.t) * fps), fps, config: {damping: 16, stiffness: 120, mass: 0.8}});
        const hien = bb.t <= t;
        const h = (50 + 36 * j) * Math.min(1, sp);
        const hienTai = j === i;
        const mau = hienTai ? AMBER : hien ? CYAN : XAM;
        return (
          <g key={j} opacity={hien ? (hienTai ? 1 : 0.82) : 0.35}>
            {j > 0 ? <line x1={x - gap + 40} y1={330} x2={x - 40} y2={330} stroke={XAM} strokeWidth={3} /> : null}
            <rect x={x - 28} y={290 - h} width={56} height={h} rx={10} fill={mau} fillOpacity={0.35} stroke={mau} strokeWidth={3} />
            <circle cx={x} cy={330} r={30 + (hienTai ? 4 * Math.min(1, dt) : 0)} fill={NEN} stroke={mau} strokeWidth={4} />
            <text x={x} y={341} fontSize={30} fontWeight={800} fill="#F8FAFC" textAnchor="middle">{j + 1}</text>
          </g>
        );
      })}
    </g>
  );
};

const LopTongQuat: React.FC<{ps: TP[]; t: number; fps: number; cong: number; mp?: boolean}> = ({ps, t, fps, cong, mp = false}) => {
  const hien = ps.filter((p) => p.t <= t);
  if (!hien.length || cong <= 0.001) return null;
  const moiNhat = hien[hien.length - 1].id;
  const matMoi = [...hien].reverse().find((p) => p.loai === 'mat')?.id;
  const nhan = hien.filter((p) => p.loai === 'diem').map((p) => ({x: (p.x || 0) + (p.x! < 400 ? -28 : 28), y: (p.y || 0) + (p.y! < 270 ? -24 : 30)}));
  gianNhan(nhan);
  let vi = -1;
  // đoạn cùng một đường thẳng: tách bằng lệch ngang 8 px + màu xen kẽ + nút chặn đầu, để đối chiếu tỉ số / độ dài
  const doan = hien.filter((p) => p.loai === 'doan');
  const nhomThang: number[][] = [];
  const thuTu: Record<string, {g: number; k: number}> = {};
  doan.forEach((p) => {
    const dx = (p.x2 || 0) - (p.x || 0), dy = (p.y2 || 0) - (p.y || 0), len = Math.hypot(dx, dy) || 1;
    let g = nhomThang.findIndex((m) => {
      const q = doan[m[0]];
      const qx = (q.x2 || 0) - (q.x || 0), qy = (q.y2 || 0) - (q.y || 0), ql = Math.hypot(qx, qy) || 1;
      const song = Math.abs(dx * qy - dy * qx) / (len * ql) < 0.03;
      const cung = Math.abs(((p.x || 0) - (q.x || 0)) * qy - ((p.y || 0) - (q.y || 0)) * qx) / ql < 4;
      return song && cung;
    });
    if (g < 0) { nhomThang.push([]); g = nhomThang.length - 1; }
    thuTu[p.id] = {g, k: nhomThang[g].length};
    nhomThang[g].push(doan.indexOf(p));
  });
  return (
    <g data-lop="tong-quat" opacity={cong}>
      {hien.map((p) => {
        const sp = spring({frame: Math.max(0, (t - p.t) * fps), fps, config: {damping: 16, stiffness: 120, mass: 0.8}});
        const moi = p.id === moiNhat;
        const mau = p.nhanh ? AMBER : CYAN;
        // phân cấp: trọng tâm (mới, 1) > khung chính (0.9) > đường phụ cũ (0.5; khi đang giảng mặt phẳng còn 0.36)
        const lang = moi ? 1 : mp ? 0.36 : 0.5;
        if (p.loai === 'mat') {
          const dang = p.id === matMoi;
          const so = Math.min(1, sp * 1.2);
          return (
            <g key={p.id}>
              <path d={p.d} fill={AMBER} fillOpacity={(dang ? 0.3 : 0.07) * so} stroke={AMBER} strokeWidth={dang ? 4.5 : 1.5} strokeLinejoin="round" strokeOpacity={dang ? 1 : 0.45} />
              {dang ? <QuetMat id={p.id} d={p.d || ''} f={(t - p.t) * fps} /> : null}
            </g>
          );
        }
        if (p.loai === 'hinh') {
          return <path key={p.id} d={p.d} fill="none" stroke={CYAN} strokeWidth={4.5} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, (t - p.t) / 1.1)} opacity={mp ? 0.8 : 0.95} />;
        }
        if (p.loai === 'doan') {
          const tt = thuTu[p.id] || {g: 0, k: 0};
          const dx0 = (p.x2 || 0) - (p.x || 0), dy0 = (p.y2 || 0) - (p.y || 0), len = Math.hypot(dx0, dy0) || 1;
          const nhomLen = nhomThang[tt.g]?.length || 1;
          const off = nhomLen > 1 ? (tt.k % 2 ? 1 : -1) * 8 * Math.ceil(tt.k / 2 + 0.01) * (tt.k ? 1 : 0) : 0;
          const ox = (-dy0 / len) * off, oy = (dx0 / len) * off;
          const mauD = nhomLen > 1 && tt.k % 2 ? '#F8FAFC' : mau;
          const x1 = (p.x || 0) + ox, y1 = (p.y || 0) + oy;
          const dx = dx0 * Math.min(1, sp), dy = dy0 * Math.min(1, sp);
          const tx = (-dy0 / len) * 9, ty = (dx0 / len) * 9;
          return (
            <g key={p.id} opacity={lang}>
              <line x1={x1} y1={y1} x2={x1 + dx} y2={y1 + dy} stroke={mauD} strokeWidth={moi ? 6 : 2.5} strokeLinecap="round" />
              {moi || p.nhanh ? <DauBut x={x1 + dx} y={y1 + dy} u={sp} /> : null}
              {nhomLen > 1 && sp > 0.95 ? (
                <>
                  <line x1={x1 - tx} y1={y1 - ty} x2={x1 + tx} y2={y1 + ty} stroke={mauD} strokeWidth={3} />
                  <line x1={x1 + dx0 - tx} y1={y1 + dy0 - ty} x2={x1 + dx0 + tx} y2={y1 + dy0 + ty} stroke={mauD} strokeWidth={3} />
                </>
              ) : null}
            </g>
          );
        }
        if (p.loai === 'diem') {
          vi++;
          const np = nhan[vi];
          const so = Math.min(1, sp * 1.2);
          return (
            <g key={p.id} opacity={so}>
              {p.nhanh || moi || /^[SGMN]$/.test(p.ten || '') ? <XungSonar cx={p.x || 0} cy={p.y || 0} f={(t - p.t) * fps} mau={p.nhanh ? AMBER : CYAN} /> : null}
              {p.nhanh ? <circle cx={p.x} cy={p.y} r={(moi ? 19 : 15) * (0.6 + 0.4 * Math.min(1, sp))} fill="none" stroke={AMBER} strokeWidth={moi ? 3 : 2} strokeOpacity={moi ? 1 : 0.6} /> : null}
              <circle cx={p.x} cy={p.y} r={(p.nhanh ? 10 : 8) * (0.6 + 0.4 * Math.min(1, sp))} fill={mau} />
              <text x={np.x} y={np.y} fontSize={moi || p.nhanh ? 30 : 26} fontWeight={800} fill="#F8FAFC" textAnchor="middle" stroke={NEN} strokeWidth={6} paintOrder="stroke">{texSangChu(p.ten)}</text>
            </g>
          );
        }
        const w = Math.max(120, (p.ten || '').length * 17 + 36);
        return (
          <g key={p.id} opacity={Math.min(1, sp * 1.2) * lang} transform={`translate(0 ${14 * (1 - Math.min(1, sp))})`}>
            <rect x={(p.x || 400) - w / 2} y={(p.y || 500) - 24} width={w} height={44} rx={22} fill={NEN} stroke={XAM} strokeWidth={2} />
            <text x={p.x} y={(p.y || 500) + 8} fontSize={26} fontWeight={700} fill={AMBER} textAnchor="middle">{texSangChu(p.ten)}</text>
          </g>
        );
      })}
    </g>
  );
};

export function trangThaiLop(l: LopTuSinh, t: number, fps: number, moiNhat: boolean): {hien: number; s: number; dy: number; quet: number; sang: number} {
  const f = Math.max(0, (t - l.t) * fps);
  if (t < l.t) return {hien: 0, s: 1, dy: 0, quet: 0, sang: 0};
  const sp = spring({frame: f, fps, config: {damping: 16, stiffness: 120, mass: 0.8}});
  const dtt = t - l.t;
  const sang = moiNhat ? Math.max(0, 1 - Math.max(0, dtt - 0.5) / 0.9) : 0;
  const lang = moiNhat ? 1 : 0.82;
  switch (l.hieu_ung) {
    case 'no': return {hien: Math.min(1, sp * 1.2) * lang, s: 0.82 + 0.18 * sp, dy: 0, quet: 1, sang};
    // v99.5: nhấn chi tiết bằng lò xo (scale nảy nhẹ ~1,8 % khi lớp mới nhất vừa hiện); quét 1,1 s, độ dịu 82 %, hiện/ẩn giữ nguyên
    case 've': return {hien: lang, s: 1 + (moiNhat ? 0.018 * Math.sin(Math.PI * Math.min(1, sp)) : 0), dy: 0, quet: Math.min(1, dtt / 1.1), sang};
    case 'sang': return {hien: Math.min(1, sp * 1.3) * lang, s: 1 + (moiNhat ? 0.025 * Math.sin(Math.PI * Math.min(1, sp)) : 0), dy: 0, quet: 1, sang: Math.max(sang, moiNhat ? 0.35 : 0)};
    default: return {hien: Math.min(1, sp * 1.2) * lang, s: 0.97 + 0.03 * sp, dy: 14 * (1 - sp), quet: 1, sang};
  }
}

// Props lưu từ trước có thể chứa TeX. Chỉ thay các nút chữ, giữ nguyên tọa độ,
// thuộc tính và các tspan do Python đã căn sẵn.
function chuanNhanSvg(svg: string): string {
  if (!/[_^\\]/.test(svg)) return svg;
  const doc = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + svg + '</svg>', 'image/svg+xml');
  if (doc.querySelector('parsererror')) return svg;
  for (const el of Array.from(doc.querySelectorAll('text, tspan'))) {
    for (const node of Array.from(el.childNodes)) {
      const s = node.textContent || '';
      if (node.nodeType !== 3 || !/[_^\\]/.test(s)) continue;
      const fragment = doc.createDocumentFragment();
      const plain = (v: string) => {
        const clean = v.replace(/\S(?:[\s\S]*\S)?/, part => texSangChu(part));
        fragment.appendChild(doc.createTextNode(clean));
      };
      let end = 0;
      for (const match of s.matchAll(/([_^])(?:\{([^{}]{2,})\}|(\d{2,}))/g)) {
        plain(s.slice(end, match.index));
        const span = doc.createElementNS(el.namespaceURI, 'tspan');
        span.setAttribute('baseline-shift', match[1] === '_' ? 'sub' : 'super');
        span.setAttribute('font-size', '72%');
        const arg = match[2] ?? match[3];
        span.textContent = arg === 'them' ? 'thêm' : texSangChu(arg);
        fragment.appendChild(span);
        end = match.index! + match[0].length;
      }
      plain(s.slice(end));
      node.replaceWith(fragment);
    }
  }
  return doc.documentElement.innerHTML;
}

export const SanKhauTuSinh: React.FC<{ts: TuSinhVao; t: number; fps: number; rong: number; cao: number; xung?: number; heSoPhong?: number}> = ({ts, t, fps, rong, cao, xung = -1, heSoPhong = 1}) => {
  const lop = React.useMemo(() => (ts.lop || []).map(l => ({...l, svg: chuanNhanSvg(l.svg)})), [ts.lop]);
  const coLopHopLe = React.useMemo(() => lop.some((l) => Boolean(l.svg && l.svg.trim())), [lop]);
  const daHien = lop.filter((l) => mocVaoLop(l, lop, fps) <= t);
  const moiNhat = daHien.length ? daHien[daHien.length - 1].id : '';
  // hình vừa T2, giữ tỉ lệ 800:540, căn giữa; khi phóng nhẹ (~15% ở T2) vẫn khóa cách mép khung 1080 tối thiểu 48 px và không vượt chiều cao vùng chứa
  const kCoSo = Math.min(rong / W, cao / H);
  const k = Math.min(kCoSo * Math.max(1, heSoPhong), (1080 - 96) / W, cao / H);
  const mp = RE_MAT_PHANG.test(chuanKyHieu(buocHienTai(ts.buoc, t)));
  const zoom = xung >= 0 ? 1 + 0.018 * Math.sin(Math.PI * xung) : 1;
  // bộ dựng tổng quát / tiến trình dự phòng CHỈ dùng khi không có lớp tu_sinh_svg hợp lệ nào (tuyệt đối không vẽ đè lên sân khấu tự sinh)
  const tq = React.useMemo(() => (!coLopHopLe && (ts.de_bai || ts.buoc?.length) ? suyHinhTongQuat(ts.de_bai || '', ts.buoc || []) : []), [coLopHopLe, ts.de_bai, ts.buoc]);
  const dang: 'tq' | 'koch' | 'tt' = RE_KOCH.test(chuanKyHieu(ts.de_bai || '')) ? 'koch' : tq.length ? 'tq' : 'tt';
  const cong = ts.chiLopKichBan || coLopHopLe ? 0 : 1;
  const bsT = React.useMemo(() => (ts.buoc || []).slice().sort((a, b) => a.t - b.t), [ts.buoc]);
  return (
    <div data-tu-sinh style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <svg viewBox={ts.viewBox || '0 0 800 540'} width={W * k} height={H * k} style={{overflow: 'visible', scale: String(zoom), fontFamily: FONT}}>
        <style>{`.ts-de-som text{visibility:hidden}.ts-cu [stroke-dasharray]{stroke-opacity:.55}.ts-moi [stroke-dasharray]{stroke-opacity:.8}${mp ? '.ts-moi polygon{stroke-width:3.5px;stroke-linejoin:round;paint-order:stroke}.ts-cu polygon{fill-opacity:.06}' : ''}`}</style>
        <defs>
          {lop.map((l) => {
            const tVao = mocVaoLop(l, lop, fps);
            return (
              <clipPath key={l.id} id={`ts-quet-${l.id}`}>
                <rect x={-10} y={-10} width={(W + 20) * trangThaiLop({...l, t: tVao}, t, fps, l.id === moiNhat).quet} height={H + 20} />
              </clipPath>
            );
          })}
        </defs>
        {lop.map((l) => {
          const tVao = mocVaoLop(l, lop, fps);
          const s = trangThaiLop({...l, t: tVao}, t, fps, l.id === moiNhat);
          const thay = heSoThay(l, lop, t, fps);
          if (s.hien * thay <= 0.001) return null;
          // v99.10: lớp cũ dịu thêm (0,72 / 0,5 khi giảng mặt phẳng), lớp đang giảng giữ nguyên; nét đứt / khuất nhạt hơn nét liền
          const cu = l.id !== moiNhat;
          const dangDe = t < (l.hienDeDen ?? 0) && thay >= 0.99;
          const dim = cu ? (mp ? 0.5 : 0.72) : 1;
          return (
            <g key={l.id} data-lop={l.id} className={(cu ? 'ts-cu' : 'ts-moi') + (t < (l.tNhan ?? 0) ? ' ts-de-som' : '')} opacity={dangDe ? 1 : s.hien * thay * dim} clipPath={s.quet < 1 ? `url(#ts-quet-${l.id})` : undefined}
              style={{transformBox: 'view-box', transformOrigin: '400px 270px', scale: String(s.s), translate: `0px ${s.dy}px`,
                filter: s.sang > 0.01 ? `brightness(${1 + 0.32 * s.sang})` : undefined}}>
              <g dangerouslySetInnerHTML={{__html: l.svg}} />
            </g>
          );
        })}
        {cong > 0.001 ? (
          <g data-lop="minh-hoa" opacity={cong}>
            {dang === 'koch' ? <LopKoch de={ts.de_bai || ''} bs={bsT} t={t} fps={fps} /> : dang === 'tq' ? <LopTongQuat ps={tq} t={t} fps={fps} cong={1} mp={mp} /> : <LopTienTrinh bs={bsT} t={t} fps={fps} />}
          </g>
        ) : null}
      </svg>
    </div>
  );
};
