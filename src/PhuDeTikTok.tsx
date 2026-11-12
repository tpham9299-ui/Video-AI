import React from 'react';
import {kep, popOut} from './sankhau/donghieu';
import {FONT} from './theme';
import {Cau} from './types';

// Phụ đề kiểu TikTok: mỗi lần chỉ hiện một cụm ngắn (tối đa ~6 từ), chữ trắng đậm viền đen,
// từ đang đọc phóng to và đổi màu xanh neon, cụm mới bật lên.
type Cum = {tu: string[]; bat: number; ket: number};

function chiaCum(cau: Cau[], toiDa = 6): Cum[] {
  const kq: Cum[] = [];
  cau.forEach((c) => {
    const tu = c.text.split(/\s+/).filter(Boolean);
    if (!tu.length) return;
    const soCum = Math.ceil(tu.length / toiDa);
    const moiCum = Math.ceil(tu.length / soCum);
    const tong = c.text.length || 1;
    let t = c.bat;
    for (let i = 0; i < tu.length; i += moiCum) {
      const phan = tu.slice(i, i + moiCum);
      const dai = ((phan.join(' ').length + 1) / tong) * (c.ket - c.bat);
      kq.push({tu: phan, bat: t, ket: t + dai});
      t += dai;
    }
  });
  return kq;
}

export const PhuDeTikTok: React.FC<{cau: Cau[]; t: number; co?: number}> = ({cau, t, co = 56}) => {
  const cum = chiaCum(cau);
  let idx = -1;
  for (let i = 0; i < cum.length; i++) if (t >= cum[i].bat - 0.05) idx = i;
  if (idx < 0) return null;
  const c = cum[idx];
  if (t > c.ket + 0.6 && idx === cum.length - 1) return null;
  const vao = kep((t - c.bat + 0.05) / 0.16);
  const p = kep((t - c.bat) / Math.max(0.2, c.ket - c.bat));
  const tong = c.tu.reduce((s, w) => s + w.length + 1, 0);
  let da = 0;
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `0 ${co * 0.28}px`, transform: `scale(${popOut(vao, 1.4)})`, opacity: kep(vao * 2), fontFamily: FONT, fontWeight: 900, fontSize: co, lineHeight: 1.25, textAlign: 'center'}}>
      {c.tu.map((w, i) => {
        const dau = da / tong;
        da += w.length + 1;
        const cuoi = da / tong;
        const dang = p >= dau && p < cuoi;
        return (
          <span key={i} style={{display: 'inline-block', color: dang ? '#3BF29A' : '#ffffff', transform: `scale(${dang ? 1.12 : 1})`, WebkitTextStroke: `${co * 0.09}px #000`, paintOrder: 'stroke fill', textShadow: '0 4px 10px rgba(0,0,0,0.7)'}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};
