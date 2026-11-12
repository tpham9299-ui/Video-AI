import React from 'react';
import {easeOut, kep, popOut} from './sankhau/donghieu';
import {FONT} from './theme';
import {Cau} from './types';

// Phụ đề kiểu TikTok, mỗi lần một cụm ngắn (tối đa ~5 từ):
//  - "hop" (mặc định, như video mẫu): chữ IN HOA đậm viền đen, từ đang đọc nằm trong ô màu bo góc; ô trượt mượt từ từ này sang từ kế.
//  - "mau": từ đang đọc phóng to và đổi màu xanh neon.
type Cum = {tu: string[]; bat: number; ket: number};

function chiaCum(cau: Cau[], toiDa: number): Cum[] {
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

export const PhuDeTikTok: React.FC<{cau: Cau[]; t: number; co?: number; kieu?: string; mauHop?: string}> = ({cau, t, co = 56, kieu = 'hop', mauHop = '#FF6B2C'}) => {
  const hop = kieu !== 'mau';
  const cum = chiaCum(cau, hop ? 5 : 6);
  let idx = -1;
  for (let i = 0; i < cum.length; i++) if (t >= cum[i].bat - 0.05) idx = i;
  if (idx < 0) return null;
  const c = cum[idx];
  if (t > c.ket + 0.6 && idx === cum.length - 1) return null;
  const vao = kep((t - c.bat + 0.05) / 0.16);
  const p = kep((t - c.bat) / Math.max(0.2, c.ket - c.bat));
  const tong = c.tu.reduce((s, w) => s + w.length + 1, 0);
  let da = 0;
  const coChu = hop ? co * 0.92 : co;
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${coChu * 0.12}px ${coChu * 0.18}px`, transform: `translateY(${(1 - easeOut(vao)) * 18}px) scale(${popOut(vao, 1.2)})`, opacity: kep(vao * 2), fontFamily: FONT, fontWeight: 900, fontSize: coChu, lineHeight: 1.2, textAlign: 'center', textTransform: hop ? 'uppercase' : 'none'}}>
      {c.tu.map((w, i) => {
        const dau = da / tong;
        da += w.length + 1;
        const cuoi = da / tong;
        const dang = p >= dau && p < cuoi + (i === c.tu.length - 1 ? 1 : 0);
        // mức hiện của ô màu: bật lên khi bắt đầu từ, mờ dần khi sang từ kế
        const oVao = kep((p - dau) / Math.max(0.01, (cuoi - dau) * 0.35));
        const o = dang ? oVao : 0;
        return (
          <span key={i} style={{position: 'relative', display: 'inline-block', padding: hop ? `0 ${coChu * 0.14}px` : 0, color: !hop && dang ? '#3BF29A' : '#ffffff', transform: `scale(${dang ? (hop ? 1 + 0.06 * popOut(o, 2) - 0.06 : 1.12) + (hop ? 0.06 : 0) : 1})`}}>
            {hop && o > 0 ? (
              <span style={{position: 'absolute', inset: `${coChu * 0.02}px 0`, borderRadius: coChu * 0.18, background: mauHop, transform: `scale(${0.6 + 0.4 * popOut(o, 2.2)})`, opacity: o, boxShadow: `0 6px 18px ${mauHop}66`}} />
            ) : null}
            <span style={{position: 'relative', WebkitTextStroke: hop && o > 0.5 ? '0px' : `${coChu * 0.09}px #000`, paintOrder: 'stroke fill', textShadow: '0 4px 10px rgba(0,0,0,0.55)'}}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};
