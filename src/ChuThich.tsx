import React from 'react';
import {tien, useGiay} from './manimKit';
import {MAU} from './theme';
import {Toan} from './Toan';

// Khung chú thích viền vàng như video mẫu (SurroundingRectangle): viền vẽ dần rồi từng dòng được viết ra.
export const ChuThich: React.FC<{dong: string[]; bd: number}> = ({dong, bd}) => {
  const t = useGiay();
  const W = 900;
  const H = 36 + dong.length * 56;
  return (
    <div style={{position: 'relative', width: W, height: H, margin: '0 auto'}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <rect x={3} y={3} width={W - 6} height={H - 6} rx={12} fill="rgba(245,166,35,0.06)" stroke={MAU.vang} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tien(t, bd, 0.7)} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
        {dong.map((d, i) => (
          <div key={i} style={{opacity: tien(t, bd + 0.5 + i * 0.4, 0.5), transform: `translateY(${(1 - tien(t, bd + 0.5 + i * 0.4, 0.5)) * 10}px)`}}>
            <Toan tex={d} size={40} color="#ffffff" maxWidth={W - 50} />
          </div>
        ))}
      </div>
    </div>
  );
};
