import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {expoOut} from './sankhau/chuyendong';
import {kep} from './sankhau/donghieu';

// MỞ ĐẦU ẤN TƯỢNG (0,8 giây đầu, phủ lên cảnh hook): sóng xung kích nở từ tâm, chùm tia tốc độ bắn ra như truyện tranh,
// một chớp sáng nhẹ. Cắt ngang thói quen lướt ngay khung hình đầu mà không che câu hook.
export const MoDau: React.FC = () => {
  const f = useCurrentFrame();
  const p = expoOut(kep(f / 18));
  const tia = Array.from({length: 28}, (_, i) => {
    const g = (i / 28) * Math.PI * 2 + (i % 2) * 0.05;
    const r1 = 160 + p * 520;
    const r2 = r1 + 260 * (1 - p) + 40;
    return <line key={i} x1={540 + Math.cos(g) * r1} y1={760 + Math.sin(g) * r1} x2={540 + Math.cos(g) * r2} y2={760 + Math.sin(g) * r2} stroke={i % 3 === 0 ? '#FF8A3D' : '#ffffff'} strokeWidth={(i % 2 ? 6 : 10) * (1 - p)} strokeLinecap="round" opacity={1 - p} />;
  });
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {tia}
        <circle cx={540} cy={760} r={80 + p * 900} fill="none" stroke="#FF8A3D" strokeWidth={40 * (1 - p) + 2} opacity={0.8 * (1 - p)} />
        <circle cx={540} cy={760} r={40 + p * 620} fill="none" stroke="#3BF29A" strokeWidth={18 * (1 - p) + 1} opacity={0.6 * (1 - p)} />
      </svg>
    </AbsoluteFill>
  );
};
