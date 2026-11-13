import React from 'react';
import {useCurrentFrame} from 'remotion';
import {expoOut} from './sankhau/chuyendong';
import {kep} from './sankhau/donghieu';
import {FONT_DAM} from './theme';
import {Toan} from './Toan';

// THẺ DỮ KIỆN: 2-4 dữ kiện then chốt của đề ("V = 32 m³", "Không nắp"...) nằm thành hàng thẻ kính nhỏ ngay dưới thanh chủ đề
// suốt phần giải, để người xem lướt vào giữa video vẫn biết đề đang hỏi gì. Thẻ bật lên lần lượt, thở nhẹ; ẩn ở cảnh bài học.
export const DuKien: React.FC<{ds: string[]; tu: number; den: number}> = ({ds, tu, den}) => {
  const f = useCurrentFrame();
  if (!ds.length || f < tu - 2 || f > den + 12) return null;
  const mo = kep((den + 12 - f) / 12);
  return (
    <div style={{position: 'absolute', left: 30, right: 30, top: 172, display: 'flex', justifyContent: 'center', gap: 12, opacity: mo, pointerEvents: 'none'}}>
      {ds.map((d, i) => {
        const e = expoOut(kep((f - tu - i * 4) / 12));
        const laToan = /[\\^_=]/.test(d);
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 6, padding: '4px 16px 4px 12px', borderRadius: 999, background: 'rgba(10,22,26,0.72)', border: '1.5px solid rgba(59,242,154,0.45)',
            boxShadow: `0 0 ${10 + 6 * Math.sin((f + i * 20) / 22)}px rgba(59,242,154,0.18)`, transform: `translateY(${(1 - e) * -14}px) scale(${0.85 + 0.15 * e})`, opacity: e, whiteSpace: 'nowrap'}}>
            <span style={{width: 8, height: 8, borderRadius: 4, background: '#3BF29A', boxShadow: '0 0 8px #3BF29A'}} />
            {laToan ? <Toan tex={d} size={28} color="#EAF2F4" /> : <span style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: 26, color: '#EAF2F4'}}>{d}</span>}
          </div>
        );
      })}
    </div>
  );
};
