// v90 — SÂN KHẤU 3D VECTOR: chiếu cảnh 3D -> SVG 2D trong Remotion (phối cảnh, Painter theo độ sâu, nét khuất tự động,
// phát sáng bằng NÉT KÉP thay cho filter blur (giữ tốc độ render), auto-framing ~75% vùng sân khấu, nhãn KaTeX né nét).
import React, {useMemo} from 'react';
import {Canh3DV, Manh, MAU_3DV} from './kieu';
import {chieuDiem, heTruc} from './camera';
import {dungCanh} from './canh';
import {xuLyKhuat} from './khuat';
import {mayTai, tinhKhung} from './khung_tu_dong';
import {datNhan, netDan, NhanVao, VatCan} from './nhan';
import {Toan} from '../Toan';

type Ve =
  | {k: 'net'; x1: number; y1: number; x2: number; y2: number; mau: string; w: number; dut: boolean; op: number; sang: number; mui: boolean; sau: number}
  | {k: 'mat'; d: string; mau: string; op: number; sau: number}
  | {k: 'cham'; x: number; y: number; r: number; mau: string; op: number; bi: boolean; sang: number; sau: number};

const NEN = '#0E1014';

// v93: lechMay (tùy chọn) = máy xoay thêm n độ quanh trục đứng và phóng k lần quanh tâm hình (intro zoom-out / xoay mở, outro thở)
// v95: thoNhe (mặc định bật) = chuyển động vi mô liên tục: máy lắc ±2,5° (sin chu kỳ 7 s) + co giãn 1,2 % (chu kỳ 5,3 s),
// c (độ ngẩng) ±1,2° -> sân khấu không bao giờ đứng như ảnh tĩnh giữa hai pha. Tất định theo t (render song song an toàn).
export const thoNheMay = (t: number) => ({n: 2.5 * Math.sin((t * 2 * Math.PI) / 7), c: 1.2 * Math.sin((t * 2 * Math.PI) / 9.4 + 1.1), k: 1 + 0.012 * Math.sin((t * 2 * Math.PI) / 5.3)});

export const SanKhau3DVector: React.FC<{canh: Canh3DV; t: number; rong: number; cao: number; tongGiay: number; lechMay?: {n?: number; k?: number}; thoNhe?: boolean}> = ({canh, t, rong, cao, tongGiay, lechMay, thoNhe = true}) => {
  const kc = useMemo(() => tinhKhung(canh, rong, cao, tongGiay), [canh, rong, cao, tongGiay]);
  const may0 = mayTai(kc, t, canh.quayNhe);
  const tho = thoNhe ? thoNheMay(t) : {n: 0, c: 0, k: 1};
  const may = {...may0, n: may0.n + (lechMay?.n || 0) + tho.n, c: may0.c + tho.c, k: may0.k * (lechMay?.k && lechMay.k > 0 ? lechMay.k : 1) * tho.k};
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
    // v95: nét đứt (cạnh khuất, góc cắt) cũng là vật cản -> nhãn không đè lên nét đứt
    else if (v.k === 'net' && (v.w >= 2.5 || v.dut) && v.op > 0.15) vatCan.doan.push({x1: v.x1, y1: v.y1, x2: v.x2, y2: v.y2, w: Math.max(4, v.w * (v.mui ? 2.5 : 1.2))});
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
          // v95: mặt tô rõ hơn 15 % + viền trong mảnh cùng màu -> mảng màu có mép sắc, không loang
          if (v.k === 'mat') return <path key={i} d={v.d} fill={v.mau} fillOpacity={Math.min(0.6, v.op * 1.15)} stroke={v.mau} strokeOpacity={Math.min(0.35, v.op * 0.9)} strokeWidth={0.8} strokeLinejoin="round" />;
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
          // v95 NÉT LÕI SẮC: bỏ quầng rộng (w×3..×4,8 làm cạnh nhòe "out-focus"); nét chính dày hơn ~18 % trên một viền tối
          // mỏng tách nét khỏi nền/mặt tô; chỉ nét đang giảng có quầng HẸP (w×1,9) nhịp nhẹ. Nét khuất rõ hơn (50-85 %).
          const nhip = v.sang * (0.82 + 0.18 * Math.sin((t * 2 * Math.PI) / 1.8));
          const goc = v.mui ? 3.1 : v.w >= 2.5 ? 1.9 : v.w;
          const dinh = v.mui ? 4.9 : v.w >= 2.5 ? 3.5 : v.w * 1.4;
          const w = goc + (dinh - goc) * v.sang;
          const dx = v.x2 - v.x1, dy = v.y2 - v.y1;
          const L = Math.hypot(dx, dy) || 1;
          const ux = dx / L, uy = dy / L;
          const dau = v.mui ? Math.min(L * 0.6, 15 + w * 2.4) : 0;
          const x2 = v.x2 - ux * dau * 0.8, y2 = v.y2 - uy * dau * 0.8;
          const op = v.dut ? v.op * (0.5 + 0.35 * v.sang) : v.op;
          return (
            <g key={i} opacity={op}>
              {!v.dut && v.w >= 2.5 ? <line x1={v.x1} y1={v.y1} x2={x2} y2={y2} stroke={NEN} strokeWidth={w + 3} strokeOpacity={0.55} strokeLinecap="round" /> : null}
              {!v.dut && v.w >= 2.5 && nhip > 0.02 ? <line x1={v.x1} y1={v.y1} x2={x2} y2={y2} stroke={v.mau} strokeWidth={w * 1.9} strokeOpacity={0.16 * nhip} strokeLinecap="round" /> : null}
              <line x1={v.x1} y1={v.y1} x2={x2} y2={y2} stroke={v.mau} strokeWidth={v.dut ? 1.3 + 0.6 * v.sang : w} strokeLinecap={v.dut ? 'butt' : 'round'}
                strokeDasharray={v.dut ? '8 6' : undefined} />
              {v.mui && dau > 0 ? (
                <path d={`M${v.x2},${v.y2} L${v.x2 - ux * dau - uy * dau * 0.5},${v.y2 - uy * dau + ux * dau * 0.5} L${v.x2 - ux * dau + uy * dau * 0.5},${v.y2 - uy * dau - ux * dau * 0.5} Z`} fill={v.mau} />
              ) : null}
            </g>
          );
        })}
      </svg>
      <svg width={rong} height={cao} style={{position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none'}}>
        {nhan.map((n, i) => {
          const d = netDan(n, viTriNhan[i]);
          return d ? <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={n.mau} strokeWidth={1.1} strokeOpacity={0.7 * n.op} /> : null;
        })}
      </svg>
      {nhan.map((n, i) => (
        // v95: nhãn trên viên thuốc tối bán trong suốt + viền mảnh cùng màu -> sắc, không chìm xám, không lẫn với nét
        <div key={i} data-nhan-3d style={{position: 'absolute', left: viTriNhan[i].x, top: viTriNhan[i].y, transform: 'translate(-50%, -50%)', opacity: n.op,
          background: 'rgba(14,16,20,0.78)', border: `1px solid ${n.mau}55`, borderRadius: 999, padding: '1px 10px 3px', lineHeight: 1.15, whiteSpace: 'nowrap'}}>
          <Toan tex={n.tex} size={n.co} color={n.mau} style={{fontWeight: 700}} />
        </div>
      ))}
    </div>
  );
};
