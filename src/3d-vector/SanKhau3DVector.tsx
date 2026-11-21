// v90 — SÂN KHẤU 3D VECTOR: chiếu cảnh 3D -> SVG 2D trong Remotion (phối cảnh, Painter theo độ sâu, nét khuất tự động,
// phát sáng bằng NÉT KÉP thay cho filter blur (giữ tốc độ render), auto-framing ~75% vùng sân khấu, nhãn KaTeX né nét).
import React, {useMemo} from 'react';
import {Canh3DV, Manh, MAU_3DV} from './kieu';
import {chieuDiem, heTruc} from './camera';
import {dungCanh} from './canh';
import {xuLyKhuat} from './khuat';
import {mayTai, tinhKhung} from './khung_tu_dong';
import {datNhan, NhanVao, VatCan} from './nhan';
import {Toan} from '../Toan';

type Ve =
  | {k: 'net'; x1: number; y1: number; x2: number; y2: number; mau: string; w: number; dut: boolean; op: number; sang: number; mui: boolean; sau: number}
  | {k: 'mat'; d: string; mau: string; op: number; sau: number}
  | {k: 'cham'; x: number; y: number; r: number; mau: string; op: number; bi: boolean; sang: number; sau: number};

const NEN = '#0E1014';

export const SanKhau3DVector: React.FC<{canh: Canh3DV; t: number; rong: number; cao: number; tongGiay: number}> = ({canh, t, rong, cao, tongGiay}) => {
  const kc = useMemo(() => tinhKhung(canh, rong, cao, tongGiay), [canh, rong, cao, tongGiay]);
  const may = mayTai(kc, t, canh.quayNhe);
  const h = heTruc(may);
  const {manh, che} = dungCanh(canh, t, h.viTri);
  const ds: Manh[] = xuLyKhuat(manh, che, h.viTri, kc.R);
  const tamMan = chieuDiem(kc.muc, may, h);

  const ve: Ve[] = [];
  const nhan: (NhanVao & {mau: string; op: number})[] = [];
  for (const m of ds) {
    if (m.k === 'net') {
      const a = chieuDiem(m.a, may, h), b = chieuDiem(m.b, may, h);
      ve.push({k: 'net', x1: a.x, y1: a.y, x2: b.x, y2: b.y, mau: m.mau, w: m.w, dut: m.net === 'dut', op: m.op, sang: m.sang, mui: !!m.mui, sau: (a.sau + b.sau) / 2});
    } else if (m.k === 'mat') {
      const ps = m.p.map((p) => chieuDiem(p, may, h));
      ve.push({k: 'mat', d: 'M' + ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L') + 'Z', mau: m.mau, op: m.op, sau: ps.reduce((s, p) => s + p.sau, 0) / ps.length + kc.R * 0.02});
    } else if (m.k === 'cham') {
      const p = chieuDiem(m.p, may, h);
      const r = m.kieu === 'bi' && m.rTheGioi ? m.rTheGioi * p.s * may.k : m.r;
      ve.push({k: 'cham', x: p.x, y: p.y, r, mau: m.mau, op: m.op, bi: m.kieu === 'bi', sang: m.sang, sau: p.sau - kc.R * 0.01});
    } else {
      const p = chieuDiem(m.p, may, h);
      const a = m.tam ? chieuDiem(m.tam, may, h) : tamMan;
      let huong: [number, number] | undefined;
      if (m.doan) {
        // vuông góc với thân trên màn hình, về phía xa tâm cảnh
        const d0 = chieuDiem(m.doan[0], may, h), d1 = chieuDiem(m.doan[1], may, h);
        const L = Math.hypot(d1.x - d0.x, d1.y - d0.y);
        if (L > 4) {
          let nx = -(d1.y - d0.y) / L, ny = (d1.x - d0.x) / L;
          if (nx * (p.x - tamMan.x) + ny * (p.y - tamMan.y) < 0) { nx = -nx; ny = -ny; }
          huong = [nx, ny];
        }
      }
      nhan.push({x: p.x, y: p.y, ax: a.x, ay: a.y, tex: m.tex, co: m.co, mau: m.mau, op: m.op, huong});
    }
  }
  ve.sort((a, b) => b.sau - a.sau);
  // vật cản cho nhãn: chấm điểm + nét chính (bỏ lưới mảnh của mặt cầu)
  const vatCan: VatCan = {cham: [], doan: []};
  for (const v of ve) {
    if (v.k === 'cham' && !v.bi && v.op > 0.2) vatCan.cham.push({x: v.x, y: v.y, r: v.r * 2});
    else if (v.k === 'net' && v.w >= 2.5 && v.op > 0.2) vatCan.doan.push({x1: v.x1, y1: v.y1, x2: v.x2, y2: v.y2, w: v.w * (v.mui ? 2.5 : 1.2)});
  }
  const viTriNhan = datNhan(nhan, rong, cao, vatCan);

  return (
    <div style={{position: 'absolute', inset: 0}}>
      <svg width={rong} height={cao} viewBox={`0 0 ${rong} ${cao}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          {Object.entries(MAU_3DV).map(([ten, m]) => (
            <radialGradient key={ten} id={`bi-${ten}`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
              <stop offset="28%" stopColor={m} />
              <stop offset="100%" stopColor={m} stopOpacity={0.55} />
            </radialGradient>
          ))}
        </defs>
        {ve.map((v, i) => {
          if (v.k === 'mat') return <path key={i} d={v.d} fill={v.mau} fillOpacity={v.op} />;
          if (v.k === 'cham') {
            if (v.bi) {
              const ten = Object.entries(MAU_3DV).find(([, m]) => m === v.mau)?.[0] || 'cyan';
              return (
                <g key={i} opacity={v.op}>
                  <circle cx={v.x} cy={v.y} r={v.r * 1.35} fill={v.mau} opacity={0.12 + 0.2 * v.sang} />
                  <circle cx={v.x} cy={v.y} r={v.r} fill={`url(#bi-${ten})`} />
                </g>
              );
            }
            return (
              <g key={i} opacity={v.op}>
                <circle cx={v.x} cy={v.y} r={v.r * (2.6 + v.sang)} fill={v.mau} opacity={0.2} />
                <circle cx={v.x} cy={v.y} r={v.r} fill={v.mau} />
                <circle cx={v.x} cy={v.y} r={v.r * 0.42} fill="#ffffff" opacity={0.85} />
              </g>
            );
          }
          // nét: lõi + quầng (nét rộng mờ phía dưới) — quầng mạnh hơn khi được nhấn mạnh
          const w = v.w * (1 + 0.35 * v.sang);
          const dx = v.x2 - v.x1, dy = v.y2 - v.y1;
          const L = Math.hypot(dx, dy) || 1;
          const ux = dx / L, uy = dy / L;
          const dau = v.mui ? Math.min(L * 0.6, 15 + w * 2.4) : 0;
          const x2 = v.x2 - ux * dau * 0.8, y2 = v.y2 - uy * dau * 0.8;
          const op = v.dut ? v.op * 0.55 : v.op;
          return (
            <g key={i} opacity={op}>
              {!v.dut && v.w >= 2.5 ? <line x1={v.x1} y1={v.y1} x2={x2} y2={y2} stroke={v.mau} strokeWidth={w * (3 + 1.5 * v.sang)} strokeOpacity={0.1 + 0.18 * v.sang} strokeLinecap="round" /> : null}
              <line x1={v.x1} y1={v.y1} x2={x2} y2={y2} stroke={v.mau} strokeWidth={v.dut ? Math.max(1.2, w * 0.75) : w} strokeLinecap={v.dut ? 'butt' : 'round'}
                strokeDasharray={v.dut ? `${(w * 2.8).toFixed(1)} ${(w * 2.4).toFixed(1)}` : undefined} />
              {v.mui && dau > 0 ? (
                <path d={`M${v.x2},${v.y2} L${v.x2 - ux * dau - uy * dau * 0.5},${v.y2 - uy * dau + ux * dau * 0.5} L${v.x2 - ux * dau + uy * dau * 0.5},${v.y2 - uy * dau - ux * dau * 0.5} Z`} fill={v.mau} />
              ) : null}
            </g>
          );
        })}
      </svg>
      {nhan.map((n, i) => (
        <div key={i} data-nhan-3d style={{position: 'absolute', left: viTriNhan[i].x, top: viTriNhan[i].y, transform: 'translate(-50%, -50%)', opacity: n.op, textShadow: `0 0 6px ${NEN}, 0 0 3px ${NEN}, 0 0 1px ${NEN}`}}>
          <Toan tex={n.tex} size={n.co} color={n.mau} />
        </div>
      ))}
    </div>
  );
};
