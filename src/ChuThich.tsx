import React from 'react';
import {tien, useGiay} from './manimKit';
import {popOut, kep} from './sankhau/donghieu';
import {FONT_DAM} from './theme';
import {Toan} from './Toan';

// Thẻ ghi nhớ màu kem như video mẫu ("Một câu cho cả dạng"): nhãn nhỏ "MẸO NHỚ" ở trên, thẻ bật lên hơi nghiêng,
// từng dòng hiện lần lượt kèm mũi tên "⇒", chữ đậm màu tối; từ khóa có thể tô màu bằng \textcolor trong kịch bản.
export const ChuThich: React.FC<{dong: string[]; bd: number}> = ({dong, bd}) => {
  const t = useGiay();
  const a = kep((t - bd) / 0.45);
  if (a <= 0) return <div style={{height: 70 + dong.length * 58}} />;
  return (
    <div style={{position: 'relative', width: 880, margin: '0 auto', transform: `rotate(${-1.5 * a}deg) scale(${popOut(a, 1.8)})`, opacity: kep(a * 2)}}>
      <div style={{position: 'absolute', left: 30, top: -20, zIndex: 2, background: '#16181d', color: '#FFD54A', fontFamily: FONT_DAM, fontWeight: 900, fontSize: 24, letterSpacing: 1.5, padding: '4px 16px', borderRadius: 10, border: '2px solid #FFD54A'}}>
        MẸO NHỚ
      </div>
      <div style={{background: 'linear-gradient(180deg, #FFF8E1, #FFEFC2)', borderRadius: 22, padding: '30px 30px 20px', boxShadow: '0 6px 0 #c9a23c, 0 18px 40px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
        {dong.map((d, i) => {
          const p = tien(t, bd + 0.35 + i * 0.4, 0.45);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 12, opacity: p, transform: `translateY(${(1 - p) * 14}px)`}}>
              {i > 0 ? <span style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: 36, color: '#E8590C'}}>⇒</span> : null}
              <span className="the-kem">
                <Toan tex={d} size={i === 0 ? 40 : 38} color={i === 0 ? '#16181d' : '#C2410C'} maxWidth={760} />
              </span>
            </div>
          );
        })}
      </div>
      <style>{`.the-kem .katex, .the-kem span { text-shadow: none !important; }`}</style>
    </div>
  );
};
