import React, {useMemo} from 'react';
import {DuLieuVenn, VungVenn} from './bocuc';
import {mauTen, mulberry32, PHAT_SANG_ID, PhatSang, tien, useGiayCan} from './manimKit';
import {MAU} from './theme';
import {Toan} from './Toan';

const W = 960;
const H = 620;
const R = 205;
const AX = 355;
const BX = 605;
const CY = 330;
const VUNG: VungVenn[] = ['chiA', 'giao', 'chiB', 'ngoai'];
const NHAN: Record<VungVenn, [number, number]> = {chiA: [AX - 100, CY], giao: [(AX + BX) / 2, CY], chiB: [BX + 100, CY], ngoai: [110, H - 66]};

// Biểu đồ Venn kiểu Manim: khung Ω và hai đường tròn (màu theo sự kiện) vẽ dần; mỗi PHẦN TỬ là một chấm rơi vào đúng vùng, bộ đếm chạy theo;
// cuối cùng các vùng được chọn ("to") sáng vàng và các chấm trong đó nhảy lên.
export const Venn: React.FC<{du: DuLieuVenn; giayAm: number}> = ({du, giayAm}) => {
  const t = useGiayCan(giayAm, 1.2 + 3 * 0.95 + 0.3 + 1.4 + Math.max(...VUNG.map((v) => du.dem[v])) * 0.08);
  const cA = mauTen(du.mauA, '#58C4DD');
  const cB = mauTen(du.mauB, '#FC6255');
  const coChấm = VUNG.some((v) => du.dem[v] > 0);

  const diem = useMemo(() => {
    const rng = mulberry32(21);
    const kq: Record<VungVenn, {x: number; y: number}[]> = {chiA: [], giao: [], chiB: [], ngoai: []};
    for (const v of VUNG) {
      let guard = 0;
      while (kq[v].length < du.dem[v] && guard++ < 6000) {
        const x = 50 + rng() * (W - 100);
        const y = 34 + rng() * (H - 80);
        const dA = Math.hypot(x - AX, y - CY);
        const dB = Math.hypot(x - BX, y - CY);
        const inA = dA < R - 22;
        const inB = dB < R - 22;
        const outA = dA > R + 22;
        const outB = dB > R + 22;
        const ok = v === 'chiA' ? inA && outB : v === 'giao' ? inA && inB : v === 'chiB' ? outA && inB : outA && outB;
        if (!ok) continue;
        if (Math.hypot(x - NHAN[v][0], y - NHAN[v][1]) < 56) continue;
        if (kq[v].some((p) => Math.hypot(p.x - x, p.y - y) < 40)) continue;
        kq[v].push({x, y});
      }
    }
    return kq;
  }, [JSON.stringify(du.dem)]);

  const tVung = (i: number) => 1.2 + i * 0.95;
  const tTo = 1.2 + 3 * 0.95 + 0.3 + Math.max(...VUNG.map((v) => du.dem[v])) * 0.08;
  const toVung = (v: VungVenn) => (du.to.indexOf(v) >= 0 ? tien(t, tTo, 0.6) * (0.85 + 0.15 * Math.sin(t * 7)) : 0);
  const pk = tien(t, 0, 0.7);
  const pa = tien(t, 0.3, 0.9);
  const pb = tien(t, 0.6, 0.9);
  const nhanText = (v: VungVenn) => (v === 'chiA' ? du.chiA : v === 'giao' ? du.giao : v === 'chiB' ? du.chiB : du.ngoai);

  return (
    <div style={{position: 'relative', width: W, height: H}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          {PhatSang}
          <clipPath id="cA"><circle cx={AX} cy={CY} r={R} /></clipPath>
          <mask id="mChiA" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}><rect width={W} height={H} fill="#000" /><circle cx={AX} cy={CY} r={R} fill="#fff" /><circle cx={BX} cy={CY} r={R} fill="#000" /></mask>
          <mask id="mChiB" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}><rect width={W} height={H} fill="#000" /><circle cx={BX} cy={CY} r={R} fill="#fff" /><circle cx={AX} cy={CY} r={R} fill="#000" /></mask>
          <mask id="mNgoai" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}><rect width={W} height={H} fill="#fff" /><circle cx={AX} cy={CY} r={R} fill="#000" /><circle cx={BX} cy={CY} r={R} fill="#000" /></mask>
        </defs>
        <rect x={20} y={8} width={W - 40} height={H - 24} rx={20} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pk} />
        <circle cx={AX} cy={CY} r={R} fill={cA} fillOpacity={0.14 * pa} />
        <circle cx={BX} cy={CY} r={R} fill={cB} fillOpacity={0.14 * pb} />
        <rect x={20} y={8} width={W - 40} height={H - 24} rx={20} fill={MAU.vang} opacity={toVung('ngoai') * 0.3} mask="url(#mNgoai)" />
        <circle cx={AX} cy={CY} r={R} fill={MAU.vang} opacity={toVung('chiA') * 0.4} mask="url(#mChiA)" />
        <circle cx={BX} cy={CY} r={R} fill={MAU.vang} opacity={toVung('chiB') * 0.4} mask="url(#mChiB)" />
        <circle cx={BX} cy={CY} r={R} fill={MAU.vang} opacity={toVung('giao') * 0.4} clipPath="url(#cA)" />
        <circle cx={AX} cy={CY} r={R} fill="none" stroke={cA} strokeWidth={7} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pa} />
        <circle cx={BX} cy={CY} r={R} fill="none" stroke={cB} strokeWidth={7} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pb} />
        {coChấm
          ? VUNG.map((v, i) =>
              diem[v].map((p, k) => {
                const e = tien(t, tVung(i) + 0.15 + k * 0.08, 0.35);
                if (e <= 0) return null;
                const sang = toVung(v);
                const nhay = sang > 0 ? 3 * Math.sin(t * 6 + k) : 0;
                return (
                  <g key={`${v}${k}`}>
                    {sang > 0.2 ? <circle cx={p.x} cy={p.y + nhay} r={14} fill={MAU.vang} opacity={0.5 * sang} filter={`url(#${PHAT_SANG_ID})`} /> : null}
                    <circle cx={p.x} cy={p.y - (1 - e) * 40 + nhay} r={10 * e} fill={sang > 0.2 ? MAU.vang : '#ffffff'} stroke="#111" strokeWidth={2.5} />
                  </g>
                );
              })
            )
          : null}
      </svg>
      <div style={{position: 'absolute', left: 38, top: 16, opacity: pk}}><Toan tex={'\\Omega'} size={42} color={MAU.mo} /></div>
      <div style={{position: 'absolute', left: AX - 90, top: CY - R - 20, transform: 'translate(-50%, -100%)', opacity: pa}}><Toan tex={du.A} size={46} color={cA} maxWidth={240} /></div>
      <div style={{position: 'absolute', left: BX + 90, top: CY - R - 20, transform: 'translate(-50%, -100%)', opacity: pb}}><Toan tex={du.B} size={46} color={cB} maxWidth={240} /></div>
      {VUNG.map((v, i) => {
        const n = du.dem[v];
        const hien = diem[v].filter((_, k) => t >= tVung(i) + 0.15 + k * 0.08).length;
        const sang = toVung(v);
        if (coChấm && n > 0) {
          return (
            <div key={v} style={{position: 'absolute', left: NHAN[v][0], top: NHAN[v][1], transform: `translate(-50%, -50%) scale(${1 + 0.15 * sang})`, opacity: tien(t, tVung(i), 0.3)}}>
              <Toan tex={String(hien)} size={64} color={sang > 0.3 ? MAU.vang : '#ffffff'} maxWidth={120} />
            </div>
          );
        }
        const tx = nhanText(v);
        return tx ? (
          <div key={v} style={{position: 'absolute', left: NHAN[v][0], top: NHAN[v][1], transform: 'translate(-50%, -50%)', opacity: tien(t, 1.0 + i * 0.2, 0.5)}}>
            <Toan tex={tx} size={48} color={sang > 0.3 ? MAU.vang : '#ffffff'} maxWidth={170} />
          </div>
        ) : null;
      })}
    </div>
  );
};
