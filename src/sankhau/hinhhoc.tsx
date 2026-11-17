// HÌNH HỌC và ĐỒ THỊ cho toán thực tế, vẽ kiểu Manim: nét vẽ dần (Create), điểm bật lên, nhãn hiện sau nét,
// phần quan trọng sáng màu. Tọa độ hình học tính theo % của khung hình học (0-100, gốc trên trái, y xuống dưới).
import React from 'react';
import {FONT_DAM} from '../theme';
import {Toan} from '../Toan';
import {phanTichBieuThuc} from './bieuthuc';
import {easeOut, kep, neon, popOut} from './donghieu';
import {Vat} from './dulieu';
import {TrangThai} from './trangthai';

const TRANG = '#EAF2F4';
const CAM = '#FF8A3D';
export const soViet = (v: number, chuSo = 2) => {
  if (!isFinite(v)) return '';
  const r = Math.round(v * Math.pow(10, chuSo)) / Math.pow(10, chuSo);
  return String(r).replace('-', '−').replace('.', ',');
};
const veDan = (p: number) => ({pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - easeOut(kep(p))});

const NhanHH: React.FC<{x: number; y: number; chu: string; mau?: string; co?: number; mo: number}> = ({x, y, chu, mau = TRANG, co = 30, mo}) =>
  chu ? (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${popOut(mo, 1.6)})`, opacity: kep(mo * 2), background: 'rgba(6,14,18,0.82)', borderRadius: 10, padding: '2px 10px', border: `2px solid ${mau}55`, whiteSpace: 'nowrap'}}>
      <Toan tex={chu} size={co} color={mau} />
    </div>
  ) : null;

/* ---------------- HÌNH HỌC: điểm, cạnh có độ dài, góc, góc vuông, vùng tô ---------------- */
export const HinhHoc: React.FC<{v: Vat; st: TrangThai}> = ({v, st}) => {
  const W = 880 * v.co;
  const H = 600 * v.co;
  const P = (k: string) => {
    const d = v.diem[k];
    return {x: (d[0] / 100) * W, y: (d[1] / 100) * H};
  };
  const t = st.t - st.ta;
  const mauChinh = neon(v.mau, TRANG);
  const nhan: React.ReactNode[] = [];
  const cungCanh = (u1: string, v1: string, u2: string, v2: string) => (u1 === u2 && v1 === v2) || (u1 === v2 && v1 === u2);
  // Đảm bảo cạnh bị khuất (khuat) hoặc đường thẳng phụ (phu) không bao giờ bị vẽ đè thành nét liền trong canh
  const canhLien = v.canh.filter(([a, b]) => !v.khuat.some(([ka, kb]) => cungCanh(a, b, ka, kb)) && !v.phu.some(([pa, pb]) => cungCanh(a, b, pa, pb)));
  const nCanh = canhLien.length;
  const tCanh = (i: number) => 0.15 + i * Math.min(0.4, 2.2 / Math.max(1, nCanh));
  const tSau = tCanh(nCanh) + 0.2;
  const tamHinh = (() => {
    const ds = Object.keys(v.diem).map(P);
    return {x: ds.reduce((s0, p) => s0 + p.x, 0) / ds.length, y: ds.reduce((s0, p) => s0 + p.y, 0) / ds.length};
  })();
  return (
    <div style={{position: 'relative', width: W, height: H}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {/* vùng tô */}
        {v.to.map((ds, i) => {
          const mau = neon(['xanh_duong', 'cam', 'xanh_la', 'tim'][i % 4]);
          const sang = st.chonCa > 0 || st.sang > 0;
          return <polygon key={`to${i}`} points={ds.map((k) => `${P(k).x},${P(k).y}`).join(' ')} fill={mau} fillOpacity={0.18 * kep((t - tSau) / 0.6) + (sang ? 0.12 * st.sang : 0)} stroke="none" />;
        })}
        {/* cạnh nhìn thấy (nét liền): vẽ dần theo thứ tự; cạnh được chọn sáng cam và dày hơn */}
        {canhLien.map(([a, b, ten], i) => {
          const A = P(a);
          const B = P(b);
          const c = st.chon.get(i + 1);
          const l = st.loai.get(i + 1) || 0;
          const mau = c ? neon(c.mau, CAM) : mauChinh;
          const p = (t - tCanh(i)) / 0.5;
          const mx = (A.x + B.x) / 2;
          const my = (A.y + B.y) / 2;
          // nhãn độ dài đặt lệch ra phía ngoài hình (xa tâm)
          const L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
          let nx = -(B.y - A.y) / L;
          let ny = (B.x - A.x) / L;
          if ((mx + nx * 10 - tamHinh.x) * nx + (my + ny * 10 - tamHinh.y) * ny < 0) { nx = -nx; ny = -ny; }
          if (ten) nhan.push(<NhanHH key={`nc${i}`} x={mx + nx * 34} y={my + ny * 34} chu={ten} mau={c ? mau : '#9FE7FF'} mo={(t - tCanh(i) - 0.35) / 0.35} />);
          return (
            <line key={`c${i}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={mau} strokeWidth={(c ? 9 : 6) * Math.max(0.7, v.co)} strokeLinecap="round" opacity={1 - 0.6 * l}
              {...veDan(p)} style={{filter: c ? `drop-shadow(0 0 10px ${mau})` : `drop-shadow(0 0 4px ${mau}88)`}} />
          );
        })}
        {/* cạnh khuất của hình không gian: nét đứt mảnh, vẽ dần cùng các cạnh */}
        {v.khuat.map(([a, b], i) => {
          const A = P(a), B = P(b);
          const p = kep((t - tCanh(Math.min(nCanh, i))) / 0.5);
          if (p <= 0) return null;
          return <line key={`kh${i}`} x1={A.x} y1={A.y} x2={A.x + (B.x - A.x) * easeOut(p)} y2={A.y + (B.y - A.y) * easeOut(p)} stroke={mauChinh} strokeOpacity={0.75}
            strokeWidth={4 * Math.max(0.7, v.co)} strokeDasharray="14 11" strokeLinecap="round" />;
        })}
        {/* đường tròn: [tâm, điểm trên đường tròn] hoặc qua 3 điểm; vẽ dần sau các cạnh */}
        {v.tron.map((ds, i) => {
          let cx = 0, cy = 0, r = 0;
          if (ds.length === 2) { const O = P(ds[0]); const M = P(ds[1]); cx = O.x; cy = O.y; r = Math.hypot(M.x - O.x, M.y - O.y); }
          else {
            const [A, B, C] = ds.map(P);
            const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
            if (Math.abs(d) < 1e-6) return null;
            const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
            cx = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d;
            cy = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d;
            r = Math.hypot(A.x - cx, A.y - cy);
          }
          const mau = neon(['tim', 'xanh_duong', 'xanh_la', 'cam'][i % 4]);
          return <circle key={`tr${i}`} cx={cx} cy={cy} r={r} fill="none" stroke={mau} strokeWidth={5 * Math.max(0.7, v.co)} opacity={0.9} {...veDan((t - tCanh(nCanh) + 0.1 - i * 0.3) / 0.9)} style={{filter: `drop-shadow(0 0 6px ${mau}99)`}} />;
        })}
        {/* đường phụ (kẻ thêm): nét đứt màu vàng, hiện SAU hình chính - khoảnh khắc "ý tưởng then chốt" */}
        {v.phu.map(([a, b], i) => {
          const A = P(a), B = P(b);
          const p = (t - tSau - 0.5 - i * 0.35) / 0.6;
          if (p <= 0) return null;
          const L = Math.hypot(B.x - A.x, B.y - A.y);
          const k = easeOut(kep(p));
          return <line key={`ph${i}`} x1={A.x} y1={A.y} x2={A.x + (B.x - A.x) * k} y2={A.y + (B.y - A.y) * k} stroke="#FFD54A" strokeWidth={4.5 * Math.max(0.7, v.co)} strokeDasharray={`${Math.max(10, L / 30)} ${Math.max(8, L / 40)}`} strokeLinecap="round" style={{filter: 'drop-shadow(0 0 6px #FFD54A88)'}} />;
        })}
        {/* vạch đánh dấu cạnh bằng nhau */}
        {v.bang.map(([a, b, n], i) => {
          const A = P(a), B = P(b);
          const L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
          const ux = (B.x - A.x) / L, uy = (B.y - A.y) / L, nx = -uy, ny = ux;
          const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
          const p = kep((t - tSau - 0.2) / 0.4);
          return (
            <g key={`b${i}`} opacity={p}>
              {Array.from({length: n}, (_, k) => {
                const o = (k - (n - 1) / 2) * 12;
                const cx = mx + ux * o, cy = my + uy * o;
                return <line key={k} x1={cx - nx * 14} y1={cy - ny * 14} x2={cx + nx * 14} y2={cy + ny * 14} stroke={CAM} strokeWidth={4} strokeLinecap="round" />;
              })}
            </g>
          );
        })}
        {/* ký hiệu góc vuông */}
        {v.vuong.map(([a, o, b], i) => {
          const O = P(o);
          const A = P(a);
          const B = P(b);
          const u = (Q: {x: number; y: number}) => {
            const L = Math.hypot(Q.x - O.x, Q.y - O.y) || 1;
            return {x: (Q.x - O.x) / L, y: (Q.y - O.y) / L};
          };
          const ua = u(A);
          const ub = u(B);
          const k = 26 * v.co;
          const d = `M${O.x + ua.x * k} ${O.y + ua.y * k} L${O.x + (ua.x + ub.x) * k} ${O.y + (ua.y + ub.y) * k} L${O.x + ub.x * k} ${O.y + ub.y * k}`;
          return <path key={`v${i}`} d={d} fill="none" stroke={TRANG} strokeWidth={3} {...veDan((t - tSau) / 0.4)} />;
        })}
        {/* cung góc + nhãn góc */}
        {v.gocDanh.map(([a, o, b, ten], i) => {
          const O = P(o);
          const A = P(a);
          const B = P(b);
          const g1 = Math.atan2(A.y - O.y, A.x - O.x);
          let g2 = Math.atan2(B.y - O.y, B.x - O.x);
          let dg = g2 - g1;
          while (dg > Math.PI) dg -= 2 * Math.PI;
          while (dg < -Math.PI) dg += 2 * Math.PI;
          g2 = g1 + dg;
          const r = 56 * v.co;
          const lon = Math.abs(dg) > Math.PI ? 1 : 0;
          const d = `M${O.x + Math.cos(g1) * r} ${O.y + Math.sin(g1) * r} A${r} ${r} 0 ${lon} ${dg > 0 ? 1 : 0} ${O.x + Math.cos(g2) * r} ${O.y + Math.sin(g2) * r}`;
          const gm = g1 + dg / 2;
          const p = (t - tSau - 0.2 - i * 0.25) / 0.45;
          if (ten) nhan.push(<NhanHH key={`ng${i}`} x={O.x + Math.cos(gm) * (r + 34)} y={O.y + Math.sin(gm) * (r + 34)} chu={ten} mau={CAM} mo={p - 0.6} />);
          return <path key={`g${i}`} d={d} fill={`${CAM}22`} stroke={CAM} strokeWidth={4} {...veDan(p)} />;
        })}
      </svg>
      {/* điểm + tên điểm */}
      {Object.keys(v.diem).map((k, i) => {
        const p = P(k);
        const a = (t - 0.05 - i * 0.08) / 0.3;
        const lx = p.x - tamHinh.x;
        const ly = p.y - tamHinh.y;
        const L = Math.hypot(lx, ly) || 1;
        return (
          <React.Fragment key={`d${k}`}>
            <div style={{position: 'absolute', left: p.x - 9, top: p.y - 9, width: 18, height: 18, borderRadius: 9, background: TRANG, transform: `scale(${popOut(kep(a), 2.2)})`, boxShadow: `0 0 10px ${mauChinh}`}} />
            {k.length <= 3 ? (
              <div style={{position: 'absolute', left: p.x + (lx / L) * 34, top: p.y + (ly / L) * 34, transform: 'translate(-50%,-50%)', opacity: kep(a * 2), fontFamily: FONT_DAM, fontWeight: 900, fontStyle: 'italic', fontSize: 34 * Math.max(0.8, v.co), color: TRANG, textShadow: '0 2px 6px rgba(0,0,0,0.8)'}}>{k}</div>
            ) : null}
          </React.Fragment>
        );
      })}
      {nhan}
    </div>
  );
};

/* ---------------- ĐỒ THỊ HÀM SỐ: trục, đường cong vẽ dần, điểm chạy, đánh dấu cực trị ---------------- */
const buocDep = (khoang: number) => {
  const tho = khoang / 5;
  const mu = Math.pow(10, Math.floor(Math.log10(tho)));
  const t = tho / mu;
  return (t < 1.5 ? 1 : t < 3.5 ? 2 : t < 7.5 ? 5 : 10) * mu;
};

export const DoThi: React.FC<{v: Vat; st: TrangThai}> = ({v, st}) => {
  const f = React.useMemo(() => phanTichBieuThuc(v.ham, v.kieu === 'do'), [v.ham, v.kieu]);
  const W = 860 * v.co;
  const H = 560 * v.co;
  const pad = {l: 112, r: 44, t: 50, b: 70};
  const mau = neon(v.mau, CAM);
  const t = st.t - st.ta;
  const N = 220;
  const mau0 = React.useMemo(() => {
    const ds: {x: number; y: number}[] = [];
    if (!f) return ds;
    for (let i = 0; i <= N; i++) {
      const x = v.xTu + ((v.xDen - v.xTu) * i) / N;
      const y = f(x);
      ds.push({x, y});
    }
    return ds;
  }, [f, v.xTu, v.xDen]);
  if (!f) return <div style={{fontFamily: FONT_DAM, color: '#fff', fontSize: 32}}>y = {v.ham}</div>;
  // khoảng y: tự tính (bỏ giá trị vô hạn và đuôi quá lớn) nếu kịch bản không cho
  let yTu = v.yTu;
  let yDen = v.yDen;
  if (!(yDen > yTu)) {
    const ys = mau0.map((p) => p.y).filter((y) => isFinite(y)).sort((a, b) => a - b);
    if (!ys.length) return null;
    const lo = ys[Math.floor(ys.length * 0.03)];
    const hi = ys[Math.ceil(ys.length * 0.97) - 1];
    const du = (hi - lo || 1) * 0.12;
    yTu = Math.min(lo - du, v.danhDau.length ? Math.min(...v.danhDau.map((x) => f(x)).filter(isFinite)) - du : lo - du);
    yDen = hi + du;
    if (yTu > 0 && yTu < (yDen - yTu) * 0.6) yTu = 0;
  }
  const X = (x: number) => pad.l + ((x - v.xTu) / (v.xDen - v.xTu)) * (W - pad.l - pad.r);
  const Y = (y: number) => H - pad.b - ((y - yTu) / (yDen - yTu)) * (H - pad.t - pad.b);
  const trongKhung = (y: number) => isFinite(y) && y >= yTu - (yDen - yTu) * 0.05 && y <= yDen + (yDen - yTu) * 0.05;
  let d = '';
  let moi = true;
  mau0.forEach((p) => {
    if (!trongKhung(p.y)) { moi = true; return; }
    d += `${moi ? 'M' : 'L'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)} `;
    moi = false;
  });
  const bx = buocDep(v.xDen - v.xTu);
  const by = buocDep(yDen - yTu);
  const vachX: number[] = [];
  for (let x = Math.ceil(v.xTu / bx) * bx; x <= v.xDen + 1e-9; x += bx) vachX.push(x);
  const vachY: number[] = [];
  for (let y = Math.ceil(yTu / by) * by; y <= yDen + 1e-9; y += by) vachY.push(y);
  const y0 = Y(Math.min(Math.max(0, yTu), yDen));
  const x0 = X(Math.min(Math.max(0, v.xTu), v.xDen));
  const pTruc = (t - 0.05) / 0.5;
  const pCong = (t - 0.45) / 1.3;
  // điểm chạy (dat_gia_tri đổi x)
  const xc = isFinite(st.giaTri) ? Math.min(v.xDen, Math.max(v.xTu, st.giaTri)) : NaN;
  const yc = isFinite(xc) ? f(xc) : NaN;
  return (
    <div style={{position: 'relative', width: W, height: H, borderRadius: 24, background: 'rgba(6,14,18,0.6)', border: '2px solid rgba(255,255,255,0.08)'}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {vachY.map((y) => <line key={`gy${y}`} x1={pad.l} x2={W - pad.r} y1={Y(y)} y2={Y(y)} stroke="#fff" strokeOpacity={0.06 * kep(pTruc)} />)}
        <line x1={pad.l - 10} x2={W - pad.r + 14} y1={y0} y2={y0} stroke={TRANG} strokeWidth={3} {...veDan(pTruc)} />
        <line x1={x0} x2={x0} y1={H - pad.b + 10} y2={pad.t - 14} stroke={TRANG} strokeWidth={3} {...veDan(pTruc)} />
        <path d={`M${W - pad.r + 14} ${y0} l-14 -8 l0 16 Z M${x0} ${pad.t - 14} l-8 14 l16 0 Z`} fill={TRANG} opacity={kep(pTruc * 2 - 1)} />
        <path d={d} stroke={mau} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" {...veDan(pCong)} style={{filter: `drop-shadow(0 0 8px ${mau})`}} />
        {isFinite(yc) && trongKhung(yc) ? (
          <g opacity={kep((t - 1.6) / 0.3)}>
            <line x1={X(xc)} x2={X(xc)} y1={Y(yc)} y2={y0} stroke="#9FE7FF" strokeWidth={2.5} strokeDasharray="8 7" />
            <line x1={X(xc)} x2={x0} y1={Y(yc)} y2={Y(yc)} stroke="#9FE7FF" strokeWidth={2.5} strokeDasharray="8 7" />
            <circle cx={X(xc)} cy={Y(yc)} r={12} fill="#fff" stroke={mau} strokeWidth={5} />
          </g>
        ) : null}
        {v.danhDau.map((xd, i) => {
          const yd = f(xd);
          if (!trongKhung(yd)) return null;
          const p = (t - 1.8 - i * 0.3) / 0.4 + (st.chonCa > 0 ? 1 : 0);
          return (
            <g key={`dd${i}`} opacity={kep(p)}>
              <circle cx={X(xd)} cy={Y(yd)} r={20 * popOut(kep(p), 2)} fill="none" stroke="#3BF29A" strokeWidth={4} style={{filter: 'drop-shadow(0 0 8px #3BF29A)'}} />
              <circle cx={X(xd)} cy={Y(yd)} r={9} fill="#3BF29A" />
            </g>
          );
        })}
      </svg>
      {vachX.map((x) => (
        <div key={`vx${x}`} style={{position: 'absolute', left: X(x), top: y0 + 10, transform: 'translateX(-50%)', fontFamily: FONT_DAM, fontWeight: 800, fontSize: 33, color: 'rgba(255,255,255,0.75)', opacity: kep(pTruc)}}>{soViet(x)}</div>
      ))}
      {vachY.map((y) => (Math.abs(Y(y) - y0) < 6 ? null : (
        <div key={`vy${y}`} style={{position: 'absolute', left: x0 - 12, top: Y(y), transform: 'translate(-100%,-50%)', fontFamily: FONT_DAM, fontWeight: 800, fontSize: 33, color: 'rgba(255,255,255,0.75)', opacity: kep(pTruc)}}>{soViet(y)}</div>
      )))}
      <div style={{position: 'absolute', right: pad.r - 24, top: y0 - 40, fontFamily: FONT_DAM, fontWeight: 900, fontStyle: 'italic', fontSize: 38, color: TRANG}}>{v.nhanTruc[0] || 'x'}</div>
      <div style={{position: 'absolute', left: x0 + 14, top: pad.t - 30, fontFamily: FONT_DAM, fontWeight: 900, fontStyle: 'italic', fontSize: 38, color: TRANG}}>{v.nhanTruc[1] || 'y'}</div>
      {v.noiDung ? (
        // tiêu đề đồ thị nằm TRÊN khung đồ thị (trước đây nằm trong vùng vẽ -> đè lên số trên trục và đường cong)
        <div style={{position: 'absolute', left: 0, right: 0, top: -74, display: 'flex', justifyContent: 'center', opacity: kep((t - 1.2) / 0.4)}}>
          <div style={{background: 'rgba(4,14,16,0.82)', border: `2px solid ${mau}66`, borderRadius: 14, padding: '4px 18px'}}>
            <Toan tex={v.noiDung} size={42} color={mau} maxWidth={W - 60} />
          </div>
        </div>
      ) : null}
      {isFinite(yc) && trongKhung(yc) ? (
        <div style={{position: 'absolute', left: X(xc), top: Y(yc) - 34, transform: 'translate(-50%,-100%)', background: '#0b1418', border: `3px solid ${mau}`, borderRadius: 14, padding: '6px 16px', fontFamily: FONT_DAM, fontWeight: 900, fontSize: 32, color: '#fff', whiteSpace: 'nowrap', opacity: kep((t - 1.6) / 0.3)}}>
          {(v.nhanTruc[0] || 'x')} = {soViet(xc)} → {(v.nhanTruc[1] || 'y')} = {soViet(yc)}
        </div>
      ) : null}
      {v.danhDau.map((xd, i) => {
        const yd = f(xd);
        if (!trongKhung(yd)) return null;
        const p = (t - 2 - i * 0.3) / 0.4 + (st.chonCa > 0 ? 1 : 0);
        return (
          <div key={`nd${i}`} style={{position: 'absolute', left: X(xd), top: Y(yd) + 30, transform: `translateX(-50%) scale(${popOut(kep(p), 1.8)})`, opacity: kep(p), background: '#3BF29A', color: '#062019', borderRadius: 12, padding: '4px 14px', fontFamily: FONT_DAM, fontWeight: 900, fontSize: 30, whiteSpace: 'nowrap'}}>
            ({soViet(xd)}; {soViet(yd)})
          </div>
        );
      })}
    </div>
  );
};
