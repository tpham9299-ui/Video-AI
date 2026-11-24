import React from 'react';
import {CAO, RONG} from '../theme';
import {HIEN_SAFE_ZONE_DEBUG, SAFE_DEBUG_PX} from './cauHinhTinhChinh';

// v99.7: lớp khung nét đứt bán trong suốt (chỉ khi HIEN_SAFE_ZONE_DEBUG = true; mặc định không vẽ gì).
export const LopSafeZoneDebug: React.FC = () => {
  if (!HIEN_SAFE_ZONE_DEBUG) return null;
  const nen = 'rgba(255,60,60,0.12)', vien = '2px dashed rgba(255,90,90,0.8)';
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9999}}>
      <div style={{position: 'absolute', right: 0, top: CAO / 2, width: SAFE_DEBUG_PX.phai, height: CAO / 2 - SAFE_DEBUG_PX.duoi, background: nen, border: vien, boxSizing: 'border-box'}} />
      <div style={{position: 'absolute', left: 0, bottom: 0, width: RONG, height: SAFE_DEBUG_PX.duoi, background: nen, border: vien, boxSizing: 'border-box'}} />
    </div>
  );
};
