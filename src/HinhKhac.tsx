import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {kep01, smooth} from './manim';
import {FONT, MAU} from './theme';

// Dự phòng khi hình thiếu dữ liệu: dòng mô tả nét trắng trong khung vẽ dần (hiếm khi cần vì kịch bản thiếu hình bị từ chối).
export const HinhKhac: React.FC<{loai: string; moTa: string}> = ({moTa}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = smooth(kep01(frame / fps / 0.8));
  return (
    <div style={{position: 'relative', width: 880, padding: '40px 44px', textAlign: 'center'}}>
      <svg width="100%" height="100%" style={{position: 'absolute', left: 0, top: 0}} preserveAspectRatio="none">
        <rect x={3} y={3} width="calc(100% - 6px)" height="calc(100% - 6px)" rx={18} fill="none" stroke={MAU.vang} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      </svg>
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 40, lineHeight: 1.4, color: '#fff', opacity: p}}>{moTa}</div>
    </div>
  );
};
