// v99.1 — SÂN KHẤU TỰ SINH 2.5D (tầng 2). Lớp SVG do mã Python của BP2 sinh (chạy trong hộp cát scripts/tu_sinh_svg.py,
// đã kiểm thẻ / thuộc tính / tọa độ trong viewBox 0 0 800 540). Mỗi lớp có mốc `t` = mốc lời đọc của bước nó thuộc về.
// Hiệu ứng (spring, theo frame - không CSS transition): moc = mọc lên + hiện; no = nở từ tâm hình; ve = quét lộ trái -> phải;
// sang = hiện + sáng lên (chỉ brightness, không blur). Lớp mới nhất được nhấn sáng ~1,4 s rồi lắng xuống; lớp cũ dịu 82 % để mắt theo lớp đang giảng.
import React from 'react';
import {spring} from 'remotion';
import {FONT} from '../theme';

export type LopTuSinh = {id: string; t: number; svg: string; hieu_ung: 'moc' | 'no' | 'sang' | 've'; buoc?: number; nhan?: string; nhom?: string};

// lớp cùng `nhom` thay nhau: khi lớp sau cùng nhóm đã hiện, lớp trước mờ hẳn trong 0,4 s (không chồng nhãn)
export function heSoThay(l: LopTuSinh, ds: LopTuSinh[], t: number): number {
  if (!l.nhom) return 1;
  const sau = ds.filter((x) => x.nhom === l.nhom && x.t > l.t && x.t <= t);
  if (!sau.length) return 1;
  return Math.max(0, 1 - (t - Math.min(...sau.map((x) => x.t))) / 0.4);
}
export type TuSinhVao = {viewBox?: string; lop: LopTuSinh[]; mo_ta?: string; de_bai?: string; buoc?: {t: number; text: string}[]};

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

type TP = {id: string; t: number; loai: 'doan' | 'diem' | 'hinh' | 'nhan'; d?: string; x?: number; y?: number; ten?: string; x2?: number; y2?: number; nhanh?: boolean};

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

const LopTongQuat: React.FC<{ps: TP[]; t: number; fps: number; cong: number}> = ({ps, t, fps, cong}) => {
  const hien = ps.filter((p) => p.t <= t);
  if (!hien.length || cong <= 0.001) return null;
  const moiNhat = hien[hien.length - 1].id;
  const nhan = hien.filter((p) => p.loai === 'diem').map((p) => ({x: (p.x || 0) + (p.x! < 400 ? -26 : 26), y: (p.y || 0) + (p.y! < 270 ? -22 : 28)}));
  gianNhan(nhan);
  let vi = -1;
  return (
    <g data-lop="tong-quat" opacity={cong}>
      {hien.map((p) => {
        const sp = spring({frame: Math.max(0, (t - p.t) * fps), fps, config: {damping: 16, stiffness: 120, mass: 0.8}});
        const moi = p.id === moiNhat;
        const mau = p.nhanh ? AMBER : CYAN;
        const lang = moi ? 1 : 0.82;
        if (p.loai === 'hinh') {
          return <path key={p.id} d={p.d} fill="none" stroke={CYAN} strokeWidth={4} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, (t - p.t) / 1.1)} opacity={lang} />;
        }
        if (p.loai === 'doan') {
          const dx = ((p.x2 || 0) - (p.x || 0)) * Math.min(1, sp), dy = ((p.y2 || 0) - (p.y || 0)) * Math.min(1, sp);
          return <line key={p.id} x1={p.x} y1={p.y} x2={(p.x || 0) + dx} y2={(p.y || 0) + dy} stroke={mau} strokeWidth={moi ? 5 : 4} strokeLinecap="round" opacity={lang} />;
        }
        if (p.loai === 'diem') {
          vi++;
          const np = nhan[vi];
          return (
            <g key={p.id} opacity={Math.min(1, sp * 1.2) * lang}>
              <circle cx={p.x} cy={p.y} r={(moi ? 9 : 7) * (0.6 + 0.4 * Math.min(1, sp))} fill={mau} />
              <text x={np.x} y={np.y} fontSize={26} fontWeight={700} fill="#F8FAFC" textAnchor="middle" stroke={NEN} strokeWidth={5} paintOrder="stroke">{p.ten}</text>
            </g>
          );
        }
        const w = Math.max(120, (p.ten || '').length * 17 + 36);
        return (
          <g key={p.id} opacity={Math.min(1, sp * 1.2) * lang} transform={`translate(0 ${14 * (1 - Math.min(1, sp))})`}>
            <rect x={(p.x || 400) - w / 2} y={(p.y || 500) - 24} width={w} height={44} rx={22} fill={NEN} stroke={XAM} strokeWidth={2} />
            <text x={p.x} y={(p.y || 500) + 8} fontSize={26} fontWeight={700} fill={AMBER} textAnchor="middle">{p.ten}</text>
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

export const SanKhauTuSinh: React.FC<{ts: TuSinhVao; t: number; fps: number; rong: number; cao: number; xung?: number}> = ({ts, t, fps, rong, cao, xung = -1}) => {
  const lop = ts.lop || [];
  const daHien = lop.filter((l) => l.t <= t);
  const moiNhat = daHien.length ? daHien[daHien.length - 1].id : '';
  // hình vừa T2, giữ tỉ lệ 800:540, căn giữa; xung nhịp chống đứng hình = zoom rất nhẹ 1 -> 1,018 -> 1
  const k = Math.min(rong / W, cao / H) * 0.96;
  const zoom = xung >= 0 ? 1 + 0.018 * Math.sin(Math.PI * xung) : 1;
  // bộ dựng tổng quát chỉ lấp khoảng trống: khi lớp mới nhất đã đứng > 2,5 s mới hiện dần (không đè hợp đồng lớp / quét 1,1 s)
  const tq = React.useMemo(() => (ts.de_bai || ts.buoc?.length ? suyHinhTongQuat(ts.de_bai || '', ts.buoc || []) : []), [ts.de_bai, ts.buoc]);
  const tuoi = daHien.length ? t - daHien[daHien.length - 1].t : 0;
  const cong = tq.length ? Math.min(1, Math.max(0, (tuoi - 2.5) / 0.6)) : 0;
  return (
    <div data-tu-sinh style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <svg viewBox={ts.viewBox || '0 0 800 540'} width={W * k} height={H * k} style={{overflow: 'visible', scale: String(zoom), fontFamily: FONT}}>
        <defs>
          {lop.map((l) => (
            <clipPath key={l.id} id={`ts-quet-${l.id}`}>
              <rect x={-10} y={-10} width={(W + 20) * trangThaiLop(l, t, fps, l.id === moiNhat).quet} height={H + 20} />
            </clipPath>
          ))}
        </defs>
        {lop.map((l) => {
          const s = trangThaiLop(l, t, fps, l.id === moiNhat);
          const thay = heSoThay(l, lop, t);
          if (s.hien * thay <= 0.001) return null;
          return (
            <g key={l.id} data-lop={l.id} opacity={s.hien * thay} clipPath={s.quet < 1 ? `url(#ts-quet-${l.id})` : undefined}
              style={{transformBox: 'view-box', transformOrigin: '400px 270px', scale: String(s.s), translate: `0px ${s.dy}px`,
                filter: s.sang > 0.01 ? `brightness(${1 + 0.32 * s.sang})` : undefined}}>
              <g dangerouslySetInnerHTML={{__html: l.svg}} />
            </g>
          );
        })}
        {tq.length ? <LopTongQuat ps={tq} t={t} fps={fps} cong={cong} /> : null}
      </svg>
    </div>
  );
};
