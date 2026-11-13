import React from 'react';
import {kep} from './sankhau/donghieu';

// Viết tay như video mẫu: nội dung lộ dần từ trái sang phải, đầu bút chì chạy theo mép đang viết rồi nhấc lên biến mất.
export const ButChi: React.FC<{co?: number}> = ({co = 64}) => (
  <svg width={co} height={co} viewBox="0 0 64 64" style={{overflow: 'visible'}}>
    <g transform="rotate(-38 32 32)">
      <rect x={24} y={2} width={16} height={40} rx={3} fill="#FFC93C" stroke="#7a5200" strokeWidth={2} />
      <rect x={24} y={2} width={16} height={7} rx={2} fill="#FF8FA3" stroke="#7a5200" strokeWidth={2} />
      <path d="M24 42 L40 42 L32 60 Z" fill="#F5DEB3" stroke="#7a5200" strokeWidth={2} />
      <path d="M29.5 54 L34.5 54 L32 60 Z" fill="#333" />
    </g>
  </svg>
);

export const VietTay: React.FC<{p: number; children: React.ReactNode; but?: boolean; conTro?: string; tho?: number}> = ({p, children, but = true, conTro, tho}) => {
  const pc = tho ?? p; // tiến độ chưa kẹp (để con trỏ tắt hẳn sau khi viết xong)
  const w = kep(p) * 100;
  const nhac = kep((p - 1) / 0.25 + 1) >= 1 ? kep((p - 0.92) / 0.08) : 0; // bút nhấc lên cuối nét
  return (
    <span style={{position: 'relative', display: 'inline-block'}}>
      <span style={{display: 'inline-block', clipPath: p >= 1 ? undefined : `inset(-30% ${100 - w}% -30% -12%)`}}>{children}</span>
      {/* bộ hiệu ứng mới: con trỏ gõ phím màu nhấn chạy theo mép chữ (thay bút chì) */}
      {conTro && pc > 0 && pc < 1.4 ? (
        <span style={{position: 'absolute', left: `${Math.min(100, w)}%`, top: '8%', bottom: '8%', width: 6, marginLeft: 4, borderRadius: 3, background: conTro, boxShadow: `0 0 12px ${conTro}`, opacity: pc < 1 ? 1 : kep((1.4 - pc) / 0.4) * (Math.floor(pc * 8) % 2 ? 0.25 : 1)}} />
      ) : null}
      {but && !conTro && p > 0 && p < 1 ? (
        <span style={{position: 'absolute', left: `${w}%`, bottom: '-18%', transform: `translate(-18%, ${-nhac * 30}px)`, opacity: 1 - nhac, pointerEvents: 'none'}}>
          <ButChi />
        </span>
      ) : null}
    </span>
  );
};
