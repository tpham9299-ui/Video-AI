import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Canh, sanKhauCuaCanh} from './Canh';
import {Nen} from './Nen';
import {FONT, GIAO_DIEN, MAU} from './theme';
import {smooth} from './manim';
import {ManKetTuTao, moHuyHieu, ThuongHieu} from './ThuongHieu';
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

// Dòng chủ đề nhỏ cố định ở góc trên (như "20 ĐÔ MUA AI NÀO?" của video mẫu): phần sau dấu ":" hoặc "?" tô cam.
const DauTrang: React.FC<{chu: string; lop: string; tu: number; lui: number; den: number}> = ({chu, lop, tu, lui, den}) => {
  const f = useCurrentFrame();
  const e = smooth((f - tu) / 12);
  if (!chu || e <= 0 || f >= den) return null;
  const an = lui ? moHuyHieu(f / 30, den / 30).mo2 : 0;
  const s = chu.toUpperCase();
  const cat = s.search(/[:?!]/);
  const dau = cat > 0 ? s.slice(0, cat + 1) : s;
  const sau = cat > 0 ? s.slice(cat + 1) : '';
  return (
    <div style={{position: 'absolute', left: 54 + lui, right: 150, top: 130, fontFamily: FONT, fontWeight: 900, fontSize: 30, color: '#fff', opacity: 0.92 * e * (1 - an), transform: `translateX(${(1 - e) * -30 + an * 40}px)`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 2px 8px rgba(0,0,0,0.6)'}}>
      {lop ? <span style={{background: '#3BF29A', color: '#062019', borderRadius: 8, padding: '1px 10px', marginRight: 12, fontSize: 24}}>LỚP {lop}</span> : null}
      {dau}
      <span style={{color: '#FF8A3D'}}>{sau}</span>
    </div>
  );
};

// Nhạc nền tự giảm âm lượng khi có giọng đọc (ducking) để lời giảng luôn rõ, tăng lên ở các quãng nghỉ.
function taoAmLuongNhac(props: Props) {
  const {canh, tongFrame, fps} = props;
  const goc = props.amLuongNhac ?? 0.16;
  const khoang: [number, number][] = [];
  canh.forEach((c) => {
    if (!c.cau.length) return;
    khoang.push([c.batDau + c.cau[0].bat * fps, c.batDau + c.cau[c.cau.length - 1].ket * fps]);
  });
  return (f: number) => {
    let gan = 1e9;
    for (const [a, b] of khoang) {
      if (f >= a && f <= b) { gan = 0; break; }
      gan = Math.min(gan, f < a ? a - f : f - b);
    }
    const duck = interpolate(gan, [0, 10], [0.4, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const dauCuoi = interpolate(f, [0, 20, tongFrame - 45, tongFrame], [0.5, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return goc * duck * dauCuoi;
  };
}

export const Video: React.FC<Props> = (props) => {
  const {canh, tongFrame, nhac, lop, tieuDe, nen, phongCach, hookChu, hookKieu, nhanManh, thuongHieu, outro} = props;
  Object.assign(MAU, phongCach.mau || {}); // ghi đè bảng màu theo phong_cach.json
  GIAO_DIEN.kieuToan = phongCach.kieuToan || 'latex';
  GIAO_DIEN.kieuHinh = phongCach.kieuHinh || 'manim';
  const amNhac = taoAmLuongNhac(props);
  const ketThuc = outro ? outro.batDau : tongFrame;
  const coThuongHieu = !!thuongHieu && !!(thuongHieu.ten || thuongHieu.logo || thuongHieu.handle);
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <KieuToan kieu={phongCach.kieuToan || 'latex'} />
      <NapPhongToan />
      <Nen nen={nen} dsNen={props.dsNen} canh={canh} pc={phongCach} tongFrame={tongFrame} />
      {nhac ? <Audio src={staticFile(nhac)} loop volume={amNhac} /> : null}
      {canh.map((c, i) => (
        <Sequence key={c.so} from={c.batDau} durationInFrames={c.soFrame}>
          <Canh canh={c} tieuDe={tieuDe} tongCanh={canh.length} hook={{chu: hookChu, kieu: hookKieu, nhanManh}} pc={phongCach}
            sanKhau={sanKhauCuaCanh(canh, i)} giuTruoc={i > 0 && c.giuSanKhau && !!sanKhauCuaCanh(canh, i - 1)} giuSau={!!canh[i + 1] && canh[i + 1].giuSanKhau && !!sanKhauCuaCanh(canh, i)} />
        </Sequence>
      ))}
      {/* tiếng "vút lên" dồn nén ngay trước cảnh đáp án */}
      {canh.map((c) =>
        /dap_an|ket_qua/i.test(c.loai) && c.batDau > 40 ? (
          <Sequence key={`riser${c.so}`} from={c.batDau - 36} durationInFrames={40} layout="none">
            <Audio src={staticFile('sfx/riser.wav')} volume={0.3} />
          </Sequence>
        ) : null
      )}
      {hookChu ? (
        <Sequence from={0} durationInFrames={8} layout="none">
          <ChopSang />
          <Audio src={staticFile('sfx/sting.wav')} volume={0.55} />
        </Sequence>
      ) : null}
      {canh.length > 1 ? <DauTrang chu={props.chuDe || tieuDe} lop={lop} tu={canh[1].batDau} lui={coThuongHieu ? 96 : 0} den={ketThuc} /> : null}
      <ThuongHieu th={thuongHieu} canh={canh} ketThuc={ketThuc} />
      {phongCach.thanhTienDo ? <ThanhTienDo tongFrame={tongFrame} lop={lop} /> : null}
      {outro ? (
        <Sequence from={outro.batDau} durationInFrames={outro.soFrame}>
          {outro.loai === 'tu_tao' ? <ManKetTuTao th={thuongHieu} /> : <ManKet tep={outro.tep} loai={outro.loai} />}
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
