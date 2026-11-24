import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FONT, MAU} from './theme';

// Thanh tiến độ ở đầu video + nhãn nhỏ. Nằm trong vùng an toàn của TikTok/Shorts (cách mép trên ~70px).
export const ThanhTienDo: React.FC<{tongFrame: number; lop: string; mon?: string}> = ({tongFrame, lop, mon}) => {
  const frame = useCurrentFrame();
  const p = Math.min(1, frame / Math.max(1, tongFrame - 1));
  const nhan = mon === 'Hình học' ? '📐 Tư duy Xác suất' : mon && mon !== 'Xác suất' ? '💡 Tư duy Xác suất' : '🎲 Tư duy Xác suất';
  return (
    <>
      <div style={{position: 'absolute', left: 60, right: 60, top: 68, height: 10, borderRadius: 5, background: MAU.the}}>
        <div
          style={{
            width: `${p * 100}%`,
            height: '100%',
            borderRadius: 5,
            background: `linear-gradient(90deg, ${MAU.lam}, ${MAU.vang})`,
          }}
        />
      </div>
      <div
        data-kd-bo="1"
        style={{
          position: 'absolute',
          left: 60,
          top: 84,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 25,
          color: MAU.mo,
        }}
      >
        {nhan}{lop ? ` · Lớp ${lop}` : ''}
      </div>
    </>
  );
};
