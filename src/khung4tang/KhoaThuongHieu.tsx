import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, TEN_THUONG_HIEU} from '../theme';

export function chuyenMuc(mon?: string) {
  if (/XAC_SUAT|xác suất/i.test(mon || '')) return 'Tư duy Xác suất';
  if (/HINH_KHONG_GIAN|không gian/i.test(mon || '')) return 'Hình học Không gian';
  if (/HINH_|hình học/i.test(mon || '')) return 'Tư duy Hình học';
  return 'Toán Thực tế';
}

export const KhoaThuongHieu: React.FC<{viTri: 'dau' | 'nuoc' | 'the' | 'outro'; mon?: string}> = ({viTri, mon}) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const nuoc = viTri === 'nuoc', the = viTri === 'the';
  const style: React.CSSProperties = nuoc ? {
    position: 'absolute', left: 540 + 223 * Math.sin(t * 0.27), top: 720 + 164 * Math.cos(t * 0.32),
    transform: 'translate(-50%, -50%) rotate(-12deg)', fontSize: 34, fontWeight: 600, opacity: 0.10,
  } : the ? {
    position: 'absolute', right: 16, bottom: 2, fontSize: 13, opacity: 0.5,
  } : {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: viTri === 'outro' ? 218 : 0,
    fontSize: viTri === 'outro' ? 30 : 19, fontWeight: 700,
  };
  return <span data-thuong-hieu={viTri} data-va-cham={viTri === 'dau' ? 'eyebrow' : undefined} data-kd-bo="1" style={{...style, fontFamily: FONT, color: '#E6EDF5', whiteSpace: 'nowrap', pointerEvents: 'none'}}>
    {TEN_THUONG_HIEU}{nuoc || the ? '' : ' • ' + chuyenMuc(mon)}
  </span>;
};
