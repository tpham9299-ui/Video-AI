import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ngauNhien} from './sankhau/donghieu';

// Nền như video mẫu: xanh đen có lưới mờ, các đốm sáng (xanh lá + cam) trôi chậm và nhòe như bokeh,
// quầng sáng ấm ở dưới và tối dần ra bốn góc. Toàn bộ tính theo khung hình nên dựng lại luôn giống hệt.
const DOM = (() => {
  const r = ngauNhien(20251);
  return Array.from({length: 26}, (_, i) => ({
    x: r() * 1080,
    y: r() * 1920,
    rr: 6 + r() * 16,
    v: 0.25 + r() * 0.6,
    pha: r() * Math.PI * 2,
    cam: i % 3 === 0,
    mo: 0.25 + r() * 0.45,
    nhoe: r() < 0.5 ? 2 : 7,
  }));
})();

export const NenNeon: React.FC<{chiLop?: boolean}> = ({chiLop = false}) => {
  const frame = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  const o = 90;
  const troi = (frame * 0.25) % o;
  return (
    <AbsoluteFill style={{background: chiLop ? 'transparent' : 'linear-gradient(180deg, #0f2a27 0%, #0b1d1c 45%, #0a1414 100%)', overflow: 'hidden', opacity: chiLop ? 0.75 : 1}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {Array.from({length: Math.ceil(W / o) + 1}, (_, i) => (
          <line key={`c${i}`} x1={i * o} x2={i * o} y1={0} y2={H} stroke="#7fffd4" strokeOpacity={0.05} strokeWidth={1.5} />
        ))}
        {Array.from({length: Math.ceil(H / o) + 2}, (_, i) => (
          <line key={`h${i}`} x1={0} x2={W} y1={i * o - troi} y2={i * o - troi} stroke="#7fffd4" strokeOpacity={0.05} strokeWidth={1.5} />
        ))}
      </svg>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 30% at 50% 100%, rgba(255,122,47,0.16), rgba(0,0,0,0) 70%), radial-gradient(ellipse 60% 35% at 50% 8%, rgba(59,242,154,0.12), rgba(0,0,0,0) 70%)'}} />
      {DOM.map((d, i) => {
        const y = ((d.y - frame * d.v + H * 4) % (H + 80)) - 40;
        const x = d.x + Math.sin(frame / 60 + d.pha) * 18;
        const nhap = 0.6 + 0.4 * Math.sin(frame / 25 + d.pha);
        const mau = d.cam ? '255,122,47' : '59,242,154';
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, width: d.rr, height: d.rr, borderRadius: '50%', background: `rgba(${mau},${d.mo * nhap})`, boxShadow: `0 0 ${d.rr * 1.6}px rgba(${mau},${d.mo * nhap})`, filter: `blur(${d.nhoe}px)`}} />
        );
      })}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 85% 75% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)'}} />
    </AbsoluteFill>
  );
};
