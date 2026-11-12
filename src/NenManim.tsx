import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {MAU} from './theme';

// Nền kiểu Manim: gần đen, lưới tọa độ mờ trôi chậm, tối dần ở rìa.
export const NenManim: React.FC = () => {
  const frame = useCurrentFrame();
  const o = (frame * 0.22) % 80;
  return (
    <AbsoluteFill style={{background: MAU.nen1}}>
      <svg width="100%" height="100%" style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <pattern id="luoiNho" width={80} height={80} patternUnits="userSpaceOnUse" patternTransform={`translate(${o} ${o})`}>
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#58C4DD" strokeOpacity={0.1} strokeWidth={1.5} />
          </pattern>
          <pattern id="luoiLon" width={400} height={400} patternUnits="userSpaceOnUse" patternTransform={`translate(${o} ${o})`}>
            <path d="M 400 0 L 0 0 0 400" fill="none" stroke="#58C4DD" strokeOpacity={0.22} strokeWidth={2.5} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#luoiNho)" />
        <rect width="100%" height="100%" fill="url(#luoiLon)" />
      </svg>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 75% 60% at 50% 42%, rgba(88,196,221,0.07) 0%, rgba(0,0,0,0) 60%), radial-gradient(ellipse 90% 80% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)'}} />
    </AbsoluteFill>
  );
};
