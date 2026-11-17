import React from 'react';
import {AbsoluteFill, Img, interpolate, Loop, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {NenDong} from './NenDong';
import {NenLuoi} from './NenLuoi';
import {NenManim} from './NenManim';
import {NenNeon} from './NenNeon';
import {NenCucQuang} from './NenCucQuang';
import {NenToi} from './NenToi';
import {CanhProps, NenProps, PhongCach} from './types';

// Nền video.
// - Có nền của bạn (Drive VIDEO_XACSUAT/nen): dùng tối đa soNenToiDa nền trong một video, ĐỔI NỀN theo nhóm cảnh
//   (các cảnh "giu_san_khau" liền nhau giữ cùng nền), mỗi nền một kiểu chuyển động máy quay khác nhau (phóng to, thu nhỏ,
//   lia trái, lia phải), chuyển nền bằng hiệu ứng mờ dần + phóng nhẹ. Phủ lớp tối để chữ rõ và (tùy chọn) lớp lưới + đốm sáng neon.
// - Không có nền: nền động mặc định theo phong_cach.json.
const CHUYEN = 14; // số khung hình chuyển nền

const KIEU_MAY: ((p: number) => string)[] = [
  (p) => `scale(${1.04 + 0.1 * p})`,
  (p) => `scale(${1.16 - 0.1 * p})`,
  (p) => `scale(1.14) translateX(${3 - 6 * p}%)`,
  (p) => `scale(1.14) translateX(${-3 + 6 * p}%)`,
  (p) => `scale(1.12) translateY(${2.5 - 5 * p}%)`,
];

const MotNen: React.FC<{nen: NenProps; dai: number; kieu: number; vao: boolean}> = ({nen, dai, kieu, vao}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, dai], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const a = vao ? interpolate(f, [0, CHUYEN], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  const may = KIEU_MAY[kieu % KIEU_MAY.length](p);
  return (
    <AbsoluteFill style={{opacity: a, transform: vao ? `scale(${1.08 - 0.08 * a})` : undefined, filter: vao && a < 1 ? `blur(${(1 - a) * 10}px)` : undefined}}>
      {nen.loai === 'video' ? (
        <Loop durationInFrames={Math.max(1, nen.soFrame)}>
          <OffthreadVideo src={staticFile(nen.tep)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: may}} />
        </Loop>
      ) : (
        <Img src={staticFile(nen.tep)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: may}} />
      )}
    </AbsoluteFill>
  );
};

// nhóm cảnh hiện tại (đổi màu nền cực quang theo nhóm) và tiến độ chuyển màu
function nhomHienTai(canh: CanhProps[] | undefined, f: number) {
  if (!canh || !canh.length) return {nhom: 0, chuyen: 1};
  let nhom = -1;
  let bd = 0;
  canh.forEach((c, i) => {
    if (i === 0 || !c.giuSanKhau) {
      if (f >= c.batDau) { nhom++; bd = c.batDau; }
    }
  });
  return {nhom: Math.max(0, nhom), chuyen: Math.min(1, (f - bd) / 24)};
}

const CucQuang: React.FC<{canh?: CanhProps[]; chiLop?: boolean}> = ({canh, chiLop}) => {
  const f = useCurrentFrame();
  const {nhom, chuyen} = nhomHienTai(canh, f);
  return <NenCucQuang nhom={nhom} chuyen={chuyen} chiLop={chiLop} />;
};

export const Nen: React.FC<{nen: NenProps | null; dsNen?: NenProps[]; canh?: CanhProps[]; pc: PhongCach; tongFrame: number}> = ({nen, dsNen, canh, pc, tongFrame}) => {
  const ds = dsNen && dsNen.length ? dsNen : nen ? [nen] : [];
  if (!ds.length) return !pc.kieuNen || pc.kieuNen === 'toi' ? <NenToi /> : pc.kieuNen === 'cuc_quang' ? <CucQuang canh={canh} /> : pc.kieuNen === 'neon' ? <NenNeon /> : pc.kieuNen === 'gradient' ? <NenDong kyHieu={pc.kyHieuTroi} quangSang={pc.quangSang} /> : pc.kieuNen === 'luoi_phang' ? <NenManim /> : <NenLuoi />;

  // chia nhóm cảnh: cảnh giữ sân khấu thì giữ nền; mỗi nhóm mới chuyển sang nền kế tiếp
  const doan: {tu: number; den: number}[] = [];
  (canh && canh.length ? canh : [{batDau: 0, soFrame: tongFrame, giuSanKhau: false} as CanhProps]).forEach((c, i) => {
    if (i > 0 && c.giuSanKhau && doan.length) doan[doan.length - 1].den = c.batDau + c.soFrame;
    else doan.push({tu: c.batDau, den: c.batDau + c.soFrame});
  });
  doan[doan.length - 1].den = tongFrame;
  // ít nền hơn số nhóm: dùng lần lượt; chỉ có 1 nền thì vẫn đổi kiểu chuyển động máy quay giữa các nhóm
  const phu = Math.min(1, pc.doMoNen);
  return (
    <AbsoluteFill style={{background: '#0b1416'}}>
      {doan.map((d, i) => {
        const tu = Math.max(0, d.tu - (i ? CHUYEN : 0));
        return (
          <Sequence key={i} from={tu} durationInFrames={Math.max(1, d.den - tu)}>
            <MotNen nen={ds[i % ds.length]} dai={d.den - tu} kieu={i} vao={i > 0 && ds.length > 1} />
          </Sequence>
        );
      })}
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(6,16,16,${Math.min(1, phu + 0.15)}) 0%, rgba(6,16,16,${phu}) 40%, rgba(6,16,16,${Math.min(1, phu + 0.25)}) 100%)`}} />
      {/* làm tối thêm vùng giữa (sân khấu, công thức) để nền nhiều chi tiết không lấn át hình */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 45% at 50% 50%, rgba(4,12,12,0.45) 0%, rgba(4,12,12,0) 100%)'}} />
      {pc.lopNeonTrenNen === true ? <CucQuang canh={canh} chiLop /> : <NenToi chiLop />}
    </AbsoluteFill>
  );
};
