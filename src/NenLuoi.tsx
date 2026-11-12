import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {MAU} from './theme';

// Nền như video mẫu: gần đen, lưới phối cảnh (sàn và trần) hội tụ về đường chân trời ở giữa; các đường ngang trôi rất chậm.
export const NenLuoi: React.FC = () => {
  const frame = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  const cx = W / 2;
  const cy = H * 0.44; // đường chân trời
  const dong: React.ReactNode[] = [];
  const troi = (frame * 0.012) % 1;
  // các đường ngang: khoảng cách tăng dần khi ra xa đường chân trời
  for (let i = 0; i < 14; i++) {
    const t = i + troi;
    const d = 14 * Math.pow(t + 0.6, 1.9);
    const op = Math.min(0.42, 0.08 + d / 1200);
    for (const dau of [-1, 1]) {
      const y = cy + dau * d;
      if (y < -4 || y > H + 4) continue;
      dong.push(<line key={`h${i}${dau}`} x1={0} x2={W} y1={y} y2={y} stroke="#fff" strokeOpacity={op} strokeWidth={1.4} />);
    }
  }
  // các đường hội tụ về điểm tụ
  for (let k = -9; k <= 9; k++) {
    const xb = cx + k * 190;
    for (const yb of [H + 40, -40]) {
      const t0 = 0.12;
      dong.push(<line key={`r${k}${yb}`} x1={cx + (xb - cx) * t0} y1={cy + (yb - cy) * t0} x2={xb} y2={yb} stroke="#fff" strokeOpacity={0.2} strokeWidth={1.4} />);
    }
  }
  return (
    <AbsoluteFill style={{background: MAU.nen1}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>{dong}</svg>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse 55% 30% at 50% 44%, ${MAU.nen1} 0%, rgba(17,17,17,0.55) 55%, rgba(17,17,17,0) 100%), radial-gradient(ellipse 95% 85% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)`}} />
    </AbsoluteFill>
  );
};
