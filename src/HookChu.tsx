import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {chuanTu, tuNhanManh} from './bocuc';
import {FONT, FONT_DAM, BONG_CHU, vienChu, MAU} from './theme';

// Câu hook 5 giây đầu: chữ rất lớn bật lên từng từ (kiểu "kinetic typography"), từ khóa vàng to hơn.
export const HookChu: React.FC<{chu: string; nhanManh: string[]; kieu: string; lead: number}> = ({chu, nhanManh, kieu, lead}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tu = chu.split(/\s+/).filter(Boolean);
  const nhan = tuNhanManh(nhanManh);
  const co = tu.length <= 5 ? 112 : tu.length <= 8 ? 92 : tu.length <= 11 ? 76 : 64;
  const buoc = Math.max(3, Math.min(7, Math.round((fps * 2.0) / Math.max(1, tu.length))));
  return (
    <div style={{position: 'relative', height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18}}>
      {/* quầng sáng nhịp đập phía sau câu hook */}
      <div style={{position: 'absolute', left: '10%', right: '10%', top: '15%', bottom: '15%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,138,61,0.22), rgba(255,138,61,0) 70%)', transform: `scale(${1 + 0.06 * Math.sin(frame / 6)})`, opacity: Math.min(1, frame / 10)}} />
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${co * 0.08}px ${co * 0.28}px`, fontFamily: FONT_DAM, fontWeight: 900, lineHeight: 1.08, textAlign: 'center', letterSpacing: -1, perspective: 900}}>
        {tu.map((w, i) => {
          const bd = lead + 3 + i * buoc;
          const t = Math.max(0, Math.min(1, (frame - bd) / Math.max(1, fps * 0.3)));
          const e = t * t * (3 - 2 * t);
          const manh = nhan.has(chuanTu(w));
          // từ khóa: ô cam quét ngang phía sau chữ (motion graphic) sau khi chữ đã đáp xuống
          const hop = manh ? Math.max(0, Math.min(1, (frame - bd - 6) / 7)) : 0;
          return (
            <span
              key={i}
              style={{
                position: 'relative',
                display: 'inline-block',
                fontSize: manh ? co * 1.14 : co,
                color: manh ? '#ffffff' : MAU.chu,
                transform: `translateY(${(1 - e) * 12}px)`,
                opacity: Math.min(1, e * 2),
                WebkitTextStroke: vienChu(co),
                paintOrder: 'stroke fill',
                textShadow: BONG_CHU,
              }}
            >
              {manh ? <span style={{position: 'absolute', left: -co * 0.1, right: -co * 0.1, top: '8%', bottom: '4%', background: 'linear-gradient(180deg, #FF9A4D, #F0601A)', borderRadius: co * 0.14, transformOrigin: '0 50%', transform: `scaleX(${hop})`, zIndex: -1, boxShadow: '0 6px 0 #9a3a0c'}} /> : null}
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
