import React from 'react';
import {AbsoluteFill, interpolate, interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';
import {phaCua} from './ThanhBuoc';

// NỀN TỐI CÓ CHIỀU SÂU cho phần giải của luồng Thực tế & Xác suất (thay ảnh phối cảnh tĩnh NenCauChuyen cũ,
// vốn giữ khối 3D AI tự xếp đứng im giữa khung suốt bài). Ba lớp, chỉ dùng gradient + một SVG lưới (không blur/feTurbulence):
//  1) gradient xanh than rất tối, 2) lưới toán siêu mờ trôi chậm theo đường chéo, 3) quầng sáng lớn đổi sắc thái theo chương.
// Sắc thái quầng: mỗi chương một màu dịu, chuyển êm 1 giây quanh ranh giới chương -> người xem cảm nhận bài đang sang phần mới
// mà chữ, thẻ số, công thức vẫn luôn là thứ sáng nhất trên khung.
const MAU_CHUONG: Record<string, string> = {
  'ĐỀ BÀI': '#3fb8c9',
  'MÔ PHỎNG': '#4a7fd6',
  'LỖI SAI': '#d0794a',
  'GIẢI': '#38c79a',
  'THỬ LẠI': '#8a6fd8',
  'CHỐT': '#d6b24a',
};

type CanhNen = {batDau: number; soFrame: number; loai: string};

export const NenChieuSau: React.FC<{canh: CanhNen[]}> = ({canh}) => {
  const f = useCurrentFrame();
  const {width: W, height: H, fps} = useVideoConfig();
  // mốc đổi màu: đầu mỗi cảnh mà chương khác cảnh trước
  const moc = React.useMemo(() => {
    const ds: {f: number; mau: string}[] = [];
    canh.forEach((c) => {
      const mau = MAU_CHUONG[phaCua(c.loai)];
      if (mau && (!ds.length || ds[ds.length - 1].mau !== mau)) ds.push({f: c.batDau, mau});
    });
    return ds.length ? ds : [{f: 0, mau: MAU_CHUONG['ĐỀ BÀI']}];
  }, [canh]);
  let i = 0;
  while (i + 1 < moc.length && moc[i + 1].f <= f + fps / 2) i++;
  const truoc = moc[Math.max(0, i - 1)].mau;
  const p = i === 0 ? 1 : interpolate(f, [moc[i].f - fps / 2, moc[i].f + fps / 2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const mau = interpolateColors(p, [0, 1], [truoc, moc[i].mau]);
  // quầng sáng "thở" rất chậm (chu kỳ ~12 s) và trôi nhẹ để nền không chết đứng
  const t = f / fps;
  const qx = 50 + Math.sin(t * 0.21) * 6;
  const qy = 34 + Math.cos(t * 0.17) * 4;
  const o = 96;
  const troi = (f * 0.12) % o;
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #0b1620 0%, #08111a 52%, #060b11 100%)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse 78% 42% at ${qx}% ${qy}%, ${mau}2e, ${mau}10 45%, rgba(0,0,0,0) 72%)`}} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(${troi * 0.6} ${-troi})`}>
          {Array.from({length: Math.ceil(W / o) + 3}, (_, k) => (
            <line key={`d${k}`} x1={(k - 1) * o} x2={(k - 1) * o} y1={-o} y2={H + o} stroke="#cfe6ff" strokeOpacity={k % 4 === 0 ? 0.045 : 0.022} strokeWidth={1.2} />
          ))}
          {Array.from({length: Math.ceil(H / o) + 3}, (_, k) => (
            <line key={`n${k}`} x1={-o} x2={W + o} y1={(k - 1) * o} y2={(k - 1) * o} stroke="#cfe6ff" strokeOpacity={k % 4 === 0 ? 0.045 : 0.022} strokeWidth={1.2} />
          ))}
        </g>
      </svg>
      {/* tối dần ra bốn góc: chiều sâu, dồn mắt vào vùng nội dung giữa khung */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 70% at 50% 46%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 100%)'}} />
    </AbsoluteFill>
  );
};
