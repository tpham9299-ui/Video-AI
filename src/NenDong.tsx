import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, MAU} from './theme';

const KY_HIEU = ['P(A)', '∪', '∩', 'Ω', '½', '∑', 'C', '%', '!', '¬A', '≥', '⅓', 'n(Ω)', '|'];

// Nền động dùng chung cho cả video: chuyển màu, hai quầng sáng thở nhẹ, ký hiệu xác suất trôi lên.
export const NenDong: React.FC<{coGradient?: boolean; kyHieu?: boolean; quangSang?: boolean}> = ({coGradient = true, kyHieu: hienKyHieu = true, quangSang = true}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const nhip = 0.5 + 0.5 * Math.sin(frame / 45);

  const dsKyHieu = Array.from({length: 18}, (_, i) => {
    const x = random(`x${i}`) * width;
    const y0 = random(`y${i}`) * height;
    const toc = 0.25 + random(`s${i}`) * 0.5;
    const y = (((y0 - frame * toc) % height) + height) % height;
    const co = 40 + random(`c${i}`) * 70;
    const nghieng = Math.sin(frame / 60 + i) * 8;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          fontSize: co,
          fontFamily: FONT,
          fontWeight: 800,
          color: '#ffffff',
          opacity: 0.05 + random(`o${i}`) * 0.05,
          transform: `rotate(${nghieng}deg)`,
        }}
      >
        {KY_HIEU[i % KY_HIEU.length]}
      </div>
    );
  });

  return (
    <AbsoluteFill style={{background: coGradient ? `linear-gradient(160deg, ${MAU.nen1} 0%, ${MAU.nen2} 100%)` : 'transparent'}}>
      {quangSang ? (<>
      <div
        style={{
          position: 'absolute',
          left: -250,
          top: -150,
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(77,208,225,${0.16 + 0.08 * nhip}) 0%, rgba(77,208,225,0) 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -300,
          bottom: -200,
          width: 1100,
          height: 1100,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,126,182,${0.14 + 0.08 * (1 - nhip)}) 0%, rgba(255,126,182,0) 70%)`,
        }}
      />
      </>) : null}
      {hienKyHieu ? dsKyHieu : null}
    </AbsoluteFill>
  );
};
