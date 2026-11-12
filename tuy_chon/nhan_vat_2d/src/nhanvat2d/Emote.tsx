import React from 'react';
import {random, spring, useVideoConfig} from 'remotion';
import {FONT, MAU} from '../theme';

// Biểu tượng cảm xúc bay quanh đầu nhân vật (kiểu truyện tranh): dấu chấm than, dấu hỏi, bóng đèn, pháo giấy...
// Mọi chuyển động là hàm của số khung hình kể từ đầu cảnh nên mỗi lần dựng giống hệt nhau.
const nay = (local: number, fps: number, bd: number, cfg = {damping: 9, stiffness: 190}) =>
  local < bd ? 0 : spring({frame: local - bd, fps, config: cfg});

export const Emote: React.FC<{cam: string; local: number}> = ({cam, local}) => {
  const {fps} = useVideoConfig();
  const khung: React.CSSProperties = {position: 'absolute', left: '50%', bottom: '86%', width: 300, height: 220, transform: 'translateX(-50%)', pointerEvents: 'none'};
  const chu = (s: string, x: number, y: number, co: number, mau: string, e: number, xoay = 0): React.ReactNode => (
    <div style={{position: 'absolute', left: x, top: y, fontFamily: FONT, fontWeight: 800, fontSize: co, color: mau, transform: `translate(-50%, -50%) scale(${Math.min(1.15, e)}) rotate(${xoay}deg)`, opacity: Math.min(1, e * 2), textShadow: '0 4px 0 rgba(0,0,0,0.35), 0 0 18px rgba(255,255,255,0.25)'}}>{s}</div>
  );

  if (cam === 'ngac_nhien') {
    const e1 = nay(local, fps, 3);
    const e2 = nay(local, fps, 8);
    const rung = local < 18 ? Math.sin(local * 2.4) * (18 - local) * 0.35 : 0;
    const tia = [-50, -20, 10, 40].map((g, k) => {
      const t = Math.min(1, Math.max(0, (local - 2) / 8));
      const r1 = 70 + 18 * t;
      const r2 = 100 + 30 * t;
      const a = ((g - 90) * Math.PI) / 180;
      return <line key={k} x1={150 + Math.cos(a) * r1} y1={150 + Math.sin(a) * r1} x2={150 + Math.cos(a) * r2} y2={150 + Math.sin(a) * r2} stroke="#ffeb3b" strokeWidth={7} strokeLinecap="round" opacity={t < 1 ? 1 : Math.max(0, 1 - (local - 10) / 25)} />;
    });
    return (
      <div style={{...khung, transform: `translateX(calc(-50% + ${rung}px))`}}>
        <svg width={300} height={220} style={{position: 'absolute', left: 0, top: 0}}>{tia}</svg>
        {chu('!', 120, 110, 130, '#ff5252', e1, -10)}
        {chu('!', 185, 90, 100, '#ff9800', e2, 8)}
      </div>
    );
  }
  if (cam === 'boi_roi') {
    const g = (k: number) => Math.sin(local / 11 + k) * 5;
    const giot = Math.min(1, Math.max(0, (local - 8) / 40));
    return (
      <div style={khung}>
        {chu('?', 95, 120 + g(0), 96, MAU.vang, nay(local, fps, 3), -14)}
        {chu('?', 160, 80 + g(1), 118, MAU.hong, nay(local, fps, 8), 6)}
        {chu('?', 220, 125 + g(2), 80, MAU.lam, nay(local, fps, 13), 16)}
        <div style={{position: 'absolute', left: 250, top: 150 + giot * 55, fontSize: 56, opacity: nay(local, fps, 12) * (1 - giot * 0.6)}}>💧</div>
      </div>
    );
  }
  if (cam === 'y_tuong') {
    const e = nay(local, fps, 4, {damping: 8, stiffness: 170});
    const t = Math.min(1, Math.max(0, (local - 4) / 10));
    const tia = Array.from({length: 9}, (_, k) => {
      const a = ((k * 40 - 180) * Math.PI) / 180;
      const r1 = 62 + 4 * Math.sin(local / 3 + k);
      const r2 = 92 + 10 * Math.sin(local / 3 + k);
      return <line key={k} x1={150 + Math.cos(a) * r1} y1={120 + Math.sin(a) * r1} x2={150 + Math.cos(a) * r2} y2={120 + Math.sin(a) * r2} stroke="#ffeb3b" strokeWidth={6} strokeLinecap="round" opacity={t} />;
    });
    return (
      <div style={khung}>
        <svg width={300} height={220} style={{position: 'absolute', left: 0, top: 0}}>
          <circle cx={150} cy={120} r={70 * Math.min(1, e)} fill="rgba(255,235,59,0.28)" />
          {tia}
        </svg>
        <div style={{position: 'absolute', left: 150, top: 118, fontSize: 104, transform: `translate(-50%, -50%) scale(${Math.min(1.2, e)})`, filter: 'drop-shadow(0 0 24px rgba(255,235,59,0.9))'}}>💡</div>
      </div>
    );
  }
  if (cam === 'nghi') {
    const dot = (k: number) => Math.min(1, Math.max(0, (local - 10 - k * 7) / 5));
    return (
      <div style={khung}>
        <svg width={300} height={220} style={{position: 'absolute', left: 0, top: 0}}>
          <circle cx={92} cy={192} r={9 * nay(local, fps, 2)} fill="#ffffff" opacity={0.9} />
          <circle cx={112} cy={166} r={14 * nay(local, fps, 4)} fill="#ffffff" opacity={0.9} />
          <ellipse cx={182} cy={92} rx={92 * Math.min(1, nay(local, fps, 6))} ry={58 * Math.min(1, nay(local, fps, 6))} fill="#ffffff" opacity={0.95} />
          {[0, 1, 2].map((k) => (
            <circle key={k} cx={145 + k * 36} cy={94 + Math.sin(local / 7 + k) * 3} r={9 * dot(k)} fill="#37474f" />
          ))}
        </svg>
      </div>
    );
  }
  if (cam === 'thao_tac') {
    const ky = ['+', '×', '=', '÷', '−'];
    return (
      <div style={khung}>
        {ky.map((k, i) => {
          const a = local / 22 + (i * 2 * Math.PI) / ky.length;
          const e = nay(local, fps, 2 + i * 2);
          return <React.Fragment key={i}>{chu(k, 150 + Math.cos(a) * 95, 118 + Math.sin(a) * 38, 64, i % 2 ? MAU.vang : MAU.lam, e)}</React.Fragment>;
        })}
        {chu('✨', 232, 60 + Math.sin(local / 6) * 6, 52, '#fff', nay(local, fps, 6))}
      </div>
    );
  }
  if (cam === 'vui') {
    const mau = ['#ff5252', '#ffd54a', '#4dd0e1', '#7cf5a6', '#ff7eb6', '#ab47bc'];
    const hat = Array.from({length: 26}, (_, k) => {
      const t = local - 2;
      if (t < 0 || t > 55) return null;
      const g = (random(`g${k}`) - 0.5) * 2.2;
      const v = 7 + random(`v${k}`) * 7;
      const x = 150 + g * v * t * 0.9;
      const y = 150 - Math.abs(Math.cos(g)) * v * t * 1.1 + 0.5 * 0.55 * t * t;
      return <rect key={k} x={x} y={y} width={11} height={17} rx={2} fill={mau[k % mau.length]} transform={`rotate(${t * (6 + k * 3) % 360} ${x} ${y})`} opacity={Math.max(0, 1 - t / 55)} />;
    });
    return (
      <div style={khung}>
        <svg width={300} height={220} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{hat}</svg>
        {chu('⭐', 150, 90, 92, '#fff', nay(local, fps, 3), Math.sin(local / 5) * 8)}
      </div>
    );
  }
  if (cam === 'tu_tin') {
    return (
      <div style={khung}>
        {chu('✨', 95, 120, 70, '#fff', nay(local, fps, 5) * (0.8 + 0.2 * Math.sin(local / 4)))}
        {chu('✨', 215, 80, 56, '#fff', nay(local, fps, 11) * (0.8 + 0.2 * Math.sin(local / 5 + 1)))}
      </div>
    );
  }
  return null;
};
