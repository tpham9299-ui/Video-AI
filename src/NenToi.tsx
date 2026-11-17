import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

// NỀN TỐI (mặc định): gần đen pha xanh than, lưới ô rất mờ như giấy kẻ (kiểu video dạy toán 29education, Trạm Toán),
// một quầng sáng rất nhẹ phía trên và tối dần ra bốn góc. Không có vật trôi, không màu mè: mắt người xem dồn vào nội dung.
export const NenToi: React.FC<{chiLop?: boolean}> = ({chiLop = false}) => {
  const f = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  const o = 72;
  const troi = (f * 0.08) % o; // lưới trôi rất chậm, gần như đứng yên
  return (
    <AbsoluteFill style={{background: chiLop ? 'transparent' : 'linear-gradient(180deg, #0d131a 0%, #0a0e14 55%, #080b10 100%)', overflow: 'hidden'}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {Array.from({length: Math.ceil(W / o) + 1}, (_, i) => (
          <line key={`c${i}`} x1={i * o + 18} x2={i * o + 18} y1={0} y2={H} stroke="#ffffff" strokeOpacity={i % 4 === 0 ? 0.05 : 0.025} strokeWidth={1.2} />
        ))}
        {Array.from({length: Math.ceil(H / o) + 2}, (_, i) => (
          <line key={`h${i}`} x1={0} x2={W} y1={i * o - troi} y2={i * o - troi} stroke="#ffffff" strokeOpacity={i % 4 === 0 ? 0.05 : 0.025} strokeWidth={1.2} />
        ))}
      </svg>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 28% at 50% 0%, rgba(80,140,200,0.10), rgba(0,0,0,0) 70%)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 85% 75% at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.6) 100%)'}} />
    </AbsoluteFill>
  );
};
