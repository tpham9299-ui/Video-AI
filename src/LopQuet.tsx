import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {expoIn, expoOut} from './sankhau/chuyendong';
import {kep} from './sankhau/donghieu';

// Chuyển cảnh motion graphic phủ lên chỗ nối hai cảnh (16 khung hình, giữa là điểm cắt):
//  - 'cheo': 3 dải màu (cam, xanh neon, tối) nghiêng lao qua màn hình nối đuôi nhau, che đúng khoảnh khắc đổi cảnh.
//  - 'vong': các vòng sáng nở bung từ tâm + chớp sáng nhẹ (kiểu Manim Flash).
export const LopQuet: React.FC<{kieu: string}> = ({kieu}) => {
  const f = useCurrentFrame();
  if (kieu === 'vong') {
    return (
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        {['#3BF29A'].map((m, i) => {
          const p = expoOut(kep((f - i * 2) / 12));
          const r = 60 + p * 1500;
          return <div key={i} style={{position: 'absolute', left: 540 - r, top: 900 - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `${(1 - p) * 26 + 3}px solid ${m}`, opacity: (1 - p) * 0.7, boxShadow: `0 0 40px ${m}`}} />;
        })}

      </AbsoluteFill>
    );
  }
  const dai = [
    {m: 'linear-gradient(90deg, #1a2330, #222c3a)', tre: 0, vien: '#FF8A3D'},
    {m: 'linear-gradient(90deg, #121a24, #18212d)', tre: 2, vien: '#3BF29A'},
    {m: 'linear-gradient(90deg, #0a0e14, #0d131a)', tre: 4, vien: 'rgba(255,255,255,0.25)'},
  ];
  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      {dai.map((d, i) => {
        const q = kep((f - d.tre) / 11);
        // vào nhanh (expoOut) rồi đi tiếp ra khỏi khung (expoIn) cho cảm giác "vút" qua
        const x = q < 0.5 ? -2200 + expoOut(q * 2) * 1700 : -500 + expoIn((q - 0.5) * 2) * 2700;
        return <div key={i} style={{position: 'absolute', top: -500, bottom: -500, left: x, width: 1500 - i * 250, background: d.m, transform: 'skewX(-22deg)', borderRight: `6px solid ${d.vien}`, boxShadow: '0 0 60px rgba(0,0,0,0.5)'}} />;
      })}
    </AbsoluteFill>
  );
};
