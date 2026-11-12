import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {chuanTu, tuNhanManh} from './bocuc';
import {FONT, MAU} from './theme';

// Câu hook 5 giây đầu: chữ rất lớn bật lên từng từ (kiểu "kinetic typography"), từ khóa vàng to hơn và rung nhẹ khi xuất hiện.
export const HookChu: React.FC<{chu: string; nhanManh: string[]; kieu: string; lead: number}> = ({chu, nhanManh, kieu, lead}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tu = chu.split(/\s+/).filter(Boolean);
  const nhan = tuNhanManh(nhanManh);
  const co = tu.length <= 5 ? 112 : tu.length <= 8 ? 92 : tu.length <= 11 ? 76 : 64;
  const buoc = Math.max(3, Math.min(7, Math.round((fps * 2.0) / Math.max(1, tu.length))));
  return (
    <div style={{height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${co * 0.08}px ${co * 0.28}px`, fontFamily: FONT, fontWeight: 800, lineHeight: 1.1, textAlign: 'center'}}>
        {tu.map((w, i) => {
          const bd = lead + 3 + i * buoc;
          const e = frame < bd ? 0 : spring({frame: frame - bd, fps, config: {damping: 9, stiffness: 190}});
          const manh = nhan.has(chuanTu(w));
          const rung = manh && frame >= bd && frame < bd + 8 ? Math.sin(frame * 4) * (8 - (frame - bd)) * 0.9 : 0;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                fontSize: manh ? co * 1.14 : co,
                color: manh ? MAU.tieuDe : MAU.chu,
                transform: `translate(${rung}px, ${(1 - Math.min(1, e)) * 50}px) scale(${0.4 + 0.6 * e}) rotate(${manh ? -3 * Math.min(1, e) : 0}deg)`,
                opacity: Math.min(1, e * 2),
                textShadow: '0 4px 14px rgba(0,0,0,0.6)',
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
