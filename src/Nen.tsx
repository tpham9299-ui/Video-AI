import React from 'react';
import {AbsoluteFill, Img, interpolate, Loop, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {NenDong} from './NenDong';
import {NenLuoi} from './NenLuoi';
import {NenManim} from './NenManim';
import {NenProps, PhongCach} from './types';

// Nền video: dùng ảnh/video nền của bạn (chọn sẵn trong props.nen) phủ một lớp tối nhẹ để chữ rõ;
// không có nền thì dùng nền động mặc định.
export const Nen: React.FC<{nen: NenProps | null; pc: PhongCach; tongFrame: number}> = ({nen, pc, tongFrame}) => {
  const frame = useCurrentFrame();
  if (!nen) return pc.kieuNen === 'gradient' ? <NenDong kyHieu={pc.kyHieuTroi} quangSang={pc.quangSang} /> : pc.kieuNen === 'luoi_phang' ? <NenManim /> : <NenLuoi />;
  const phu = (
    <AbsoluteFill
      style={{background: `linear-gradient(180deg, rgba(8,14,40,${Math.min(1, pc.doMoNen + 0.12)}) 0%, rgba(8,14,40,${pc.doMoNen}) 45%, rgba(8,14,40,${Math.min(1, pc.doMoNen + 0.2)}) 100%)`}}
    />
  );
  return (
    <AbsoluteFill style={{background: '#0b1437'}}>
      {nen.loai === 'video' ? (
        <Loop durationInFrames={Math.max(1, nen.soFrame)}>
          <OffthreadVideo src={staticFile(nen.tep)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Loop>
      ) : (
        <Img
          src={staticFile(nen.tep)}
          style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${interpolate(frame, [0, tongFrame], [1, 1.1])})`}}
        />
      )}
      {phu}
      {pc.kyHieuTroi ? <NenDong coGradient={false} quangSang={false} /> : null}
    </AbsoluteFill>
  );
};
