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
    <div style={{position: 'relative', width: 860, maxWidth: 'calc(100% - 60px)', margin: '0 auto', transform: `rotate(${-1.5 * a}deg) scale(${popOut(a, 1.8)})`, opacity: kep(a * 2)}}>
      <div style={{position: 'absolute', left: 30, top: -20, zIndex: 2, background: '#16181d', color: '#FFD54A', fontFamily: FONT_DAM, fontWeight: 900, fontSize: 28, letterSpacing: 1.5, padding: '4px 18px', borderRadius: 10, border: '2px solid #FFD54A', boxShadow: '0 0 14px rgba(255,213,74,0.5)'}}>
        MẸO NHỚ
      </div>
      <div style={{background: 'linear-gradient(160deg, rgba(40,32,8,0.95), rgba(14,12,4,0.95))', border: '3px solid rgba(255,213,74,0.75)', borderRadius: 22, padding: '34px 30px 22px', boxShadow: '0 0 26px rgba(255,213,74,0.28), 0 18px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
        {dong.map((d, i) => {
          const p = tien(t, bd + 0.35 + i * 0.4, 0.45);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 12, opacity: p, transform: `translateY(${(1 - p) * 14}px)`}}>
              {i > 0 ? <span style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: 36, color: '#FFD54A'}}>⇒</span> : null}
              <span className="the-kem">
                <Toan tex={d} size={i === 0 ? 44 : 42} color={i === 0 ? '#ffffff' : '#FFD54A'} maxWidth={740} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
