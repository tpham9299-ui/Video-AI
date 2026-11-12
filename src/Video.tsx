import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Canh} from './Canh';
import {Nen} from './Nen';
import {FONT, FONT_SERIF, GIAO_DIEN, MAU} from './theme';
import {smooth} from './manim';
import {ThuongHieu} from './ThuongHieu';
import {ThanhTienDo} from './ThanhTienDo';
import {KieuToan, NapPhongToan} from './Toan';
import {Props} from './types';

// Chớp sáng ở khung hình đầu tiên: cắt ngang thói quen lướt của người xem.
const ChopSang: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{background: '#ffffff', opacity: interpolate(f, [0, 7], [0.6, 0], {extrapolateRight: 'clamp'})}} />;
};

// Màn kết (ảnh hoặc video của bạn): hiện dần ở cuối video, phủ kín màn hình.
const ManKet: React.FC<{tep: string; loai: 'video' | 'anh'}> = ({tep, loai}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000', opacity: interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp'})}}>
      {loai === 'video' ? (
        <OffthreadVideo src={staticFile(tep)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      ) : (
        <Img src={staticFile(tep)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1 + f * 0.0004})`}} />
      )}
    </AbsoluteFill>
  );
};

// Tiêu đề bài toán cố định ở đầu (vàng, phông LaTeX) từ cảnh 2 trở đi, như video mẫu.
const TieuDeCoDinh: React.FC<{chu: string; tu: number}> = ({chu, tu}) => {
  const f = useCurrentFrame();
  const e = smooth((f - tu) / 12);
  if (!chu || e <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 268, textAlign: 'center', fontFamily: FONT_SERIF, fontSize: Math.max(36, Math.min(52, 46 - Math.max(0, chu.length - 30) * 0.45)), lineHeight: 1.2, color: MAU.tieuDe, opacity: e, transform: `translateY(${(1 - e) * -14}px)`}}>{chu}</div>
  );
};

export const Video: React.FC<Props> = (props) => {
  const {canh, tongFrame, nhac, lop, tieuDe, nen, phongCach, hookChu, hookKieu, nhanManh, thuongHieu, outro} = props;
  Object.assign(MAU, phongCach.mau || {}); // ghi đè bảng màu theo phong_cach.json
  GIAO_DIEN.kieuToan = phongCach.kieuToan || 'latex';
  GIAO_DIEN.kieuHinh = phongCach.kieuHinh || 'manim';
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <KieuToan kieu={phongCach.kieuToan || 'latex'} />
      <NapPhongToan />
      <Nen nen={nen} pc={phongCach} tongFrame={tongFrame} />
      {nhac ? (
        <Audio
          src={staticFile(nhac)}
          loop
          volume={(f: number) =>
            interpolate(f, [0, 30, tongFrame - 45, tongFrame], [0, 0.09, 0.09, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      ) : null}
      {canh.map((c) => (
        <Sequence key={c.so} from={c.batDau} durationInFrames={c.soFrame}>
          <Canh canh={c} tieuDe={tieuDe} tongCanh={canh.length} hook={{chu: hookChu, kieu: hookKieu, nhanManh}} pc={phongCach} />
        </Sequence>
      ))}
      {hookChu ? (
        <Sequence from={0} durationInFrames={8} layout="none">
          <ChopSang />
          <Audio src={staticFile('sfx/sting.wav')} volume={0.55} />
        </Sequence>
      ) : null}
      <ThuongHieu th={thuongHieu} />
      {canh.length > 1 ? <TieuDeCoDinh chu={tieuDe} tu={canh[1].batDau} /> : null}
      {phongCach.thanhTienDo ? <ThanhTienDo tongFrame={tongFrame} lop={lop} /> : null}
      {outro ? (
        <Sequence from={outro.batDau} durationInFrames={outro.soFrame}>
          <ManKet tep={outro.tep} loai={outro.loai} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
