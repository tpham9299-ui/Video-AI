import React from 'react';
import {FONT, MAU} from './theme';
import {Cau} from './types';

// Phụ đề kiểu karaoke: từ đã đọc sáng trắng, từ đang đọc màu vàng, từ chưa đọc mờ.
export const PhuDe: React.FC<{cau: Cau[]; t: number; co?: number}> = ({cau, t, co = 46}) => {
  let idx = -1;
  for (let i = 0; i < cau.length; i++) if (t >= cau[i].bat) idx = i;
  if (idx < 0) return null;
  const c = cau[idx];
  const p = Math.max(0, Math.min(1, (t - c.bat) / Math.max(0.2, c.ket - c.bat)));
  const tu = c.text.split(/\s+/).filter(Boolean);
  const tong = Math.max(1, c.text.length);
  let da = 0;
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: co,
        lineHeight: 1.35,
        textAlign: 'center',
        padding: '6px 16px',
        textShadow: '0 3px 12px rgba(0,0,0,0.85)',
      }}
    >
      {tu.map((w, i) => {
        const dau = da / tong;
        da += w.length + 1;
        const cuoi = da / tong;
        const mau = p >= cuoi ? MAU.chu : p >= dau ? MAU.vang : 'rgba(255,255,255,0.4)';
        return (
          <span key={i} style={{color: mau}}>
            {w}{' '}
          </span>
        );
      })}
    </div>
  );
};
