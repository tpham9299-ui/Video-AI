import React from 'react';
import {DuLieuLuoiMau} from './bocuc';
import {mauTen, tien, useGiayCan} from './manimKit';
import {MAU} from './theme';
import {Toan} from './Toan';

const W = 960;
const H = 640;
const CHAM: Record<number, number[][]> = {
  1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};
// mặt xúc xắc nhỏ làm tiêu đề hàng/cột
const MatXX: React.FC<{n: number; cx: number; cy: number; l: number; e: number}> = ({n, cx, cy, l, e}) => (
  <g opacity={e} transform={`translate(${cx} ${cy}) scale(${0.7 + 0.3 * e})`}>
    <rect x={-l / 2} y={-l / 2} width={l} height={l} rx={l * 0.2} fill="rgba(255,255,255,0.05)" stroke="#ffffff" strokeWidth={3} />
    {(CHAM[n] || []).map((c, k) => (
      <circle key={k} cx={-l / 3 + (c[1] * l) / 3} cy={-l / 3 + (c[0] * l) / 3} r={l * 0.075} fill={MAU.vang} />
    ))}
  </g>
);

// Không gian mẫu dạng lưới kiểu Manim (ví dụ hai xúc xắc 6x6): lưới vẽ dần, tiêu đề là mặt xúc xắc, rồi từng SỰ KIỆN được tô màu
// từng ô một, bộ đếm n(A) chạy theo, cuối cùng hiện P(A) = ... màu sự kiện.
export const LuoiMau: React.FC<{du: DuLieuLuoiMau; giayAm: number}> = ({du, giayAm}) => {
  const can = 1.9 + du.suKien.reduce((a, e) => a + 0.25 + 0.07 * e.o.length + 1.4, 0) + 0.6;
  const t = useGiayCan(giayAm, can);
  const R = du.hang.length;
  const C = du.cot.length;
  const cs = Math.min(84, Math.floor(500 / Math.max(R, C)));
  const gx = 92;
  const gy = 120;
  const GW = C * cs;
  const GH = R * cs;
  const xx = (a: string[]) => a.every((x) => /^[1-6]$/.test(x)) && a.length <= 6;
  const dauXX = xx(du.hang) && xx(du.cot);
  const xPanel = gx + GW + 50;

  const ls: React.ReactNode[] = [];
  for (let r = 0; r <= R; r++) {
    const p = tien(t, 0.1 + r * 0.06, 0.6);
    ls.push(<line key={`h${r}`} x1={gx} y1={gy + r * cs} x2={gx + GW * p} y2={gy + r * cs} stroke="#ffffff" strokeOpacity={0.85} strokeWidth={3} strokeLinecap="round" />);
  }
  for (let c = 0; c <= C; c++) {
    const p = tien(t, 0.3 + c * 0.06, 0.6);
    ls.push(<line key={`v${c}`} x1={gx + c * cs} y1={gy} x2={gx + c * cs} y2={gy + GH * p} stroke="#ffffff" strokeOpacity={0.85} strokeWidth={3} strokeLinecap="round" />);
  }

  // thời điểm bắt đầu tô của từng sự kiện
  const bd: number[] = [];
  let tt = 1.9;
  du.suKien.forEach((e) => {
    bd.push(tt);
    tt += 0.25 + 0.07 * e.o.length + 1.4;
  });
  const o = (k: number, c: number) => bd[k] + 0.2 + 0.07 * c; // giây ô thứ c của sự kiện k được tô
  const dem = (k: number) => du.suKien[k].o.filter((_, c) => t >= o(k, c)).length;

  const to: React.ReactNode[] = [];
  du.suKien.forEach((e, k) => {
    e.o.forEach(([r, c], i) => {
      const p = tien(t, o(k, i), 0.35);
      if (p <= 0) return;
      to.push(
        <rect key={`o${k}-${i}`} x={gx + (c - 1) * cs + 4} y={gy + (r - 1) * cs + 4} width={cs - 8} height={cs - 8} rx={8}
          fill={mauTen(e.mau)} fillOpacity={0.55 * p} stroke={mauTen(e.mau)} strokeWidth={3} strokeOpacity={p}
          transform={`translate(${gx + (c - 0.5) * cs} ${gy + (r - 0.5) * cs}) scale(${0.6 + 0.4 * p}) translate(${-(gx + (c - 0.5) * cs)} ${-(gy + (r - 0.5) * cs)})`} />
      );
    });
  });

  return (
    <div style={{position: 'relative', width: W, height: H}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {ls}
        {to}
        {dauXX
          ? du.cot.map((x, j) => <MatXX key={`c${j}`} n={Number(x)} cx={gx + (j + 0.5) * cs} cy={gy - 38} l={Math.min(46, cs - 24)} e={tien(t, 0.7 + j * 0.07, 0.4)} />)
          : null}
        {dauXX
          ? du.hang.map((x, i) => <MatXX key={`r${i}`} n={Number(x)} cx={gx - 38} cy={gy + (i + 0.5) * cs} l={Math.min(46, cs - 24)} e={tien(t, 0.7 + i * 0.07, 0.4)} />)
          : null}
      </svg>
      {!dauXX
        ? du.cot.map((x, j) => (
            <div key={`c${j}`} style={{position: 'absolute', left: gx + (j + 0.5) * cs, top: gy - 38, transform: 'translate(-50%, -50%)', opacity: tien(t, 0.7 + j * 0.07, 0.4)}}>
              <Toan tex={x} size={40} maxWidth={cs - 8} />
            </div>
          ))
        : null}
      {!dauXX
        ? du.hang.map((x, i) => (
            <div key={`r${i}`} style={{position: 'absolute', left: gx - 38, top: gy + (i + 0.5) * cs, transform: 'translate(-50%, -50%)', opacity: tien(t, 0.7 + i * 0.07, 0.4)}}>
              <Toan tex={x} size={40} maxWidth={60} />
            </div>
          ))
        : null}
      {du.tenCot ? (
        <div style={{position: 'absolute', left: gx + GW / 2, top: gy - 92, transform: 'translate(-50%, -50%)', opacity: tien(t, 0.9, 0.5)}}>
          <Toan tex={du.tenCot} size={32} color={MAU.mo} maxWidth={GW} />
        </div>
      ) : null}
      {du.tenHang ? (
        <div style={{position: 'absolute', left: gx - 92, top: gy + GH / 2, transform: 'translate(-50%, -50%) rotate(-90deg)', opacity: tien(t, 0.9, 0.5), whiteSpace: 'nowrap'}}>
          <Toan tex={du.tenHang} size={32} color={MAU.mo} maxWidth={GH} />
        </div>
      ) : null}
      {du.cap
        ? du.hang.map((h, i) =>
            du.cot.map((c, j) => (
              <div key={`t${i}-${j}`} data-kd-bo="1" style={{position: 'absolute', left: gx + (j + 0.5) * cs, top: gy + (i + 0.5) * cs, transform: 'translate(-50%, -50%)', opacity: 0.5 * tien(t, 1.2 + (i + j) * 0.03, 0.4)}}>
                <Toan tex={`${h},${c}`} size={Math.max(18, cs * 0.3)} color="#ffffff" maxWidth={cs - 8} />
              </div>
            ))
          )
        : null}
      {du.suKien.map((e, k) => {
        const n = dem(k);
        const xong = t >= o(k, e.o.length - 1) + 0.4;
        const ap = tien(t, bd[k], 0.4);
        return (
          <div key={`s${k}`} style={{position: 'absolute', left: xPanel, top: 130 + k * 160, width: W - xPanel - 10, opacity: ap}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
              <div style={{width: 22, height: 22, borderRadius: 6, background: mauTen(e.mau), flexShrink: 0}} />
              <Toan tex={`n(${e.ten})=${n}`} size={46} color={mauTen(e.mau)} />
            </div>
            {e.xs ? (
              <div style={{marginTop: 10, marginLeft: 36, opacity: tien(t, o(k, e.o.length - 1) + 0.5, 0.5)}}>
                <Toan tex={`P(${e.ten})=${e.xs}`} size={46} color={xong ? '#ffffff' : MAU.mo} maxWidth={W - xPanel - 60} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
