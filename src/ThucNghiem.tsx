import React, {useMemo} from 'react';
import {DuLieuThucNghiem} from './bocuc';
import {mauTen, mulberry32, PHAT_SANG_ID, PhatSang, tien, useGiay} from './manimKit';
import {smooth, kep01} from './manim';
import {MAU} from './theme';
import {Toan} from './Toan';

const W = 960;
const H = 620;
const X0 = 110;
const X1 = 900;
const Y0 = 120; // y của giá trị 1
const Y1 = 520; // y của giá trị 0

// Đồ thị thực nghiệm kiểu Manim: trục tọa độ, đường nét đứt cam là xác suất lý thuyết p, đường cong là TẦN SUẤT sau mỗi lần thử
// (mô phỏng cố định theo hạt giống nên dựng lại luôn giống nhau). Số lần thử và tần suất cập nhật trực tiếp; tần suất hội tụ về p.
export const ThucNghiem: React.FC<{du: DuLieuThucNghiem; giayAm: number}> = ({du, giayAm}) => {
  const t = useGiay();
  const m = mauTen(du.mau, '#58C4DD');
  const f = useMemo(() => {
    const rng = mulberry32(du.seed);
    const kq: number[] = [];
    let thanhCong = 0;
    for (let k = 1; k <= du.n; k++) {
      if (rng() < du.p) thanhCong++;
      kq.push(thanhCong / k);
    }
    return kq;
  }, [du.p, du.n, du.seed]);

  const tBat = 1.4;
  const tDai = Math.min(7, Math.max(3.5, giayAm * 0.75));
  const tien_ = smooth(kep01((t - tBat) / tDai));
  const k = Math.max(1, Math.round(tien_ * du.n));
  const xv = (i: number) => X0 + (i / du.n) * (X1 - X0);
  const yv = (v: number) => Y1 - v * (Y1 - Y0);
  const buocVe = Math.max(1, Math.floor(du.n / 260));
  let d = '';
  for (let i = 1; i <= k; i += buocVe) d += `${d ? ' L' : 'M'} ${xv(i)} ${yv(f[i - 1])}`;
  if ((k - 1) % buocVe !== 0 || k === 1) d += `${d ? ' L' : 'M'} ${xv(k)} ${yv(f[k - 1])}`;
  const cur = f[k - 1];
  const truc = tien(t, 0, 0.8);
  const pp = tien(t, 0.9, 0.6);
  return (
    <div style={{position: 'relative', width: W, height: H}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>{PhatSang}</defs>
        <line x1={X0} y1={Y1} x2={X0 + (X1 + 20 - X0) * truc} y2={Y1} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
        <line x1={X0} y1={Y1} x2={X0} y2={Y1 - (Y1 - Y0 + 30) * truc} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
        {truc > 0.95 ? (
          <>
            <polygon points={`${X1 + 36},${Y1} ${X1 + 18},${Y1 - 9} ${X1 + 18},${Y1 + 9}`} fill="#fff" />
            <polygon points={`${X0},${Y0 - 46} ${X0 - 9},${Y0 - 28} ${X0 + 9},${Y0 - 28}`} fill="#fff" />
          </>
        ) : null}
        {[0, 0.5, 1].map((v) => <line key={v} x1={X0 - 9} y1={yv(v)} x2={X0 + 9} y2={yv(v)} stroke="#fff" strokeWidth={3} opacity={truc} />)}
        <line x1={X0} y1={yv(du.p)} x2={X0 + (X1 - X0) * pp} y2={yv(du.p)} stroke={MAU.vang} strokeWidth={4} strokeDasharray="14 10" />
        <path d={d} fill="none" stroke={m} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
        {t > tBat ? (
          <>
            <circle cx={xv(k)} cy={yv(cur)} r={16} fill={m} opacity={0.6} filter={`url(#${PHAT_SANG_ID})`} />
            <circle cx={xv(k)} cy={yv(cur)} r={9} fill="#ffffff" />
          </>
        ) : null}
      </svg>
      {[0, 0.5, 1].map((v) => (
        <div key={v} style={{position: 'absolute', left: X0 - 20, top: yv(v), transform: 'translate(-100%, -50%)', opacity: truc}}>
          <Toan tex={v === 0.5 ? '0{,}5' : String(v)} size={32} color={MAU.mo} />
        </div>
      ))}
      <div style={{position: 'absolute', left: X1 - 30, top: Y1 + 26, opacity: truc}}><Toan tex={'\\text{số lần thử}'} size={30} color={MAU.mo} /></div>
      <div style={{position: 'absolute', left: X0 + 20, top: Y0 - 44, opacity: truc}}><Toan tex={'\\text{tần suất}'} size={30} color={MAU.mo} /></div>
      {du.pXs ? (
        <div style={{position: 'absolute', left: X1 - 20, top: yv(du.p) - 34, transform: 'translate(-100%, -100%)', opacity: pp}}>
          <Toan tex={`p=${du.pXs}`} size={44} color={MAU.vang} />
        </div>
      ) : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: 4, textAlign: 'center', opacity: tien(t, 0.3, 0.5)}}>
        <Toan tex={du.ten || ' '} size={36} color="#ffffff" maxWidth={W - 40} />
      </div>
      <div style={{position: 'absolute', left: X0 + 40, top: Y0 + 10, opacity: tien(t, tBat, 0.4), textAlign: 'left'}}>
        <div><Toan tex={`n=${k}`} size={44} color="#ffffff" /></div>
        <div style={{marginTop: 6}}><Toan tex={`f=${cur.toFixed(3).replace('.', '{,}')}`} size={44} color={m} /></div>
      </div>
    </div>
  );
};
