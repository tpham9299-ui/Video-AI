// v99.1 — NỀN KHÍ QUYỂN ĐỘNG (5 theme) cho Khung 4 tầng không tối giản. Chỉ gradient + SVG nét mảnh (không blur /
// feTurbulence) để render Chromium nhanh. Quầng sáng dịch nhẹ theo nhịp bước, vệt sáng lướt chéo khi đổi bước.
import React, {useMemo} from 'react';
import {CAO, RONG} from '../theme';
import {diemTatDinh, ThemeV99, trangThaiNen} from './nen_v99';

const HoaTietSong: React.FC<{th: ThemeV99; t: number}> = ({th, t}) => {
  // lưới tọa độ uốn sóng trôi chậm (đại dương): 14 đường ngang uốn sin + đường dọc thưa
  const ngang = Array.from({length: 14}, (_, j) => {
    const y0 = 160 + j * 125;
    let d = '';
    for (let x = 0; x <= RONG; x += 40) {
      const y = y0 + 14 * Math.sin(x / 170 + t * 0.35 + j * 0.6);
      d += (x ? ' L' : 'M') + x + ' ' + y.toFixed(1);
    }
    return <path key={j} d={d} />;
  });
  const doc = Array.from({length: 10}, (_, k) => <line key={k} x1={54 + k * 108} y1={0} x2={54 + k * 108} y2={CAO} />);
  return (
    <g stroke={th.net} fill="none" strokeWidth={1.1}>
      <g strokeOpacity={0.07}>{ngang}</g>
      <g strokeOpacity={0.035}>{doc}</g>
    </g>
  );
};

const HoaTietTinhVan: React.FC<{th: ThemeV99; t: number}> = ({th, t}) => {
  const sao = useMemo(() => diemTatDinh(90, 7331), []);
  const goc = -28 + 8 * Math.sin(t * 0.08);
  return (
    <g>
      {sao.map((s, k) => <circle key={k} cx={s.x} cy={s.y} r={s.r} fill={th.net} opacity={0.08 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.9 + s.pha))} />)}
      {/* tia quét nhẹ: dải sáng xoay chậm quanh tâm trên */}
      <g transform={`rotate(${goc} 540 300)`}>
        <rect x={420} y={-400} width={240} height={2600} fill="url(#tia-v99)" />
      </g>
    </g>
  );
};

const HoaTietStudio: React.FC<{th: ThemeV99}> = ({th}) => (
  <g>
    {/* đường chân trời mờ của phông studio + 2 vạch phản chiếu */}
    <line x1={0} y1={1260} x2={RONG} y2={1260} stroke={th.net} strokeOpacity={0.06} strokeWidth={1.5} />
    <line x1={140} y1={1300} x2={940} y2={1300} stroke={th.net} strokeOpacity={0.035} strokeWidth={1} />
  </g>
);

const HoaTietPhan: React.FC<{th: ThemeV99; t: number}> = ({th, t}) => (
  <g stroke={th.net} fill="none">
    {/* bảng phấn hiện đại: vài vệt lau phấn rất mờ + dòng kẻ thưa */}
    {[420, 760, 1340].map((y, k) => (
      <path key={k} d={`M${-40 + 30 * k} ${y} C 300 ${y - 40 + 6 * Math.sin(t * 0.2 + k)}, 700 ${y + 50}, ${1120 - 20 * k} ${y - 10}`}
        strokeWidth={46} strokeOpacity={0.022} strokeLinecap="round" />
    ))}
    {Array.from({length: 18}, (_, j) => <line key={j} x1={0} y1={110 + j * 100} x2={RONG} y2={110 + j * 100} strokeWidth={1} strokeOpacity={0.025} />)}
  </g>
);

const HoaTietBanVe: React.FC<{th: ThemeV99; t: number}> = ({th, t}) => {
  const lech = (t * 4) % 24;
  return (
    <g stroke={th.net} fill="none">
      <defs>
        <pattern id="bv-nho" width={24} height={24} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${lech})`}>
          <path d="M24 0H0V24" strokeWidth={0.7} />
        </pattern>
        <pattern id="bv-lon" width={120} height={120} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${lech})`}>
          <path d="M120 0H0V120" strokeWidth={1.3} />
        </pattern>
      </defs>
      <rect width={RONG} height={CAO} fill="url(#bv-nho)" stroke="none" opacity={0.05} />
      <rect width={RONG} height={CAO} fill="url(#bv-lon)" stroke="none" opacity={0.08} />
      {/* dấu cắt góc bản vẽ */}
      {[[60, 120], [1020, 120], [60, 1800], [1020, 1800]].map(([x, y], k) => (
        <g key={k} strokeOpacity={0.22} strokeWidth={1.6}>
          <line x1={x - 22} y1={y} x2={x + 22} y2={y} />
          <line x1={x} y1={y - 22} x2={x} y2={y + 22} />
        </g>
      ))}
    </g>
  );
};

export const NenKhiQuyen: React.FC<{th: ThemeV99; t: number; mocBuoc: number[]; tamSanKhau: number; mauNhan: string}> = ({th, t, mocBuoc, tamSanKhau, mauNhan}) => {
  const n = trangThaiNen(t, mocBuoc);
  const a = Math.round(th.quangMo * 255).toString(16).padStart(2, '0');
  const a2 = Math.round(th.quangMo * 0.4 * 255).toString(16).padStart(2, '0');
  return (
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${th.tren} 0%, ${th.giua} 46%, ${th.duoi} 100%)`}}>
      {/* quầng sáng chính sau T2 - dịch theo nhịp bước */}
      <div style={{position: 'absolute', left: -200 + n.lechX, width: RONG + 400, top: tamSanKhau - 640 + n.lechY, height: 1280,
        background: `radial-gradient(ellipse 46% 44% at 50% 50%, ${th.quang}${a} 0%, ${th.quang}${a2} 40%, transparent 72%)`}} />
      {/* màu bước rất mảnh (giữ liên kết với màu nhấn) */}
      <div style={{position: 'absolute', left: 0, right: 0, top: tamSanKhau - 300, height: 600,
        background: `radial-gradient(ellipse 36% 36% at 50% 50%, ${mauNhan}0C 0%, transparent 70%)`}} />
      {th.vien ? (
        <>
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 260, background: `linear-gradient(90deg, ${th.vien}24, transparent)`}} />
          <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: 260, background: `linear-gradient(270deg, ${th.vien}24, transparent)`}} />
        </>
      ) : null}
      <svg width={RONG} height={CAO} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="tia-v99" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={th.quang} stopOpacity={0} />
            <stop offset="0.5" stopColor={th.quang} stopOpacity={0.05} />
            <stop offset="1" stopColor={th.quang} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="quet-v99" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity={0.07} />
            <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
          <radialGradient id="toi-goc-v99" cx="50%" cy="46%" r="75%">
            <stop offset="0.55" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.42} />
          </radialGradient>
        </defs>
        {th.hoaTiet === 'song' ? <HoaTietSong th={th} t={t} /> : th.hoaTiet === 'tinh_van' ? <HoaTietTinhVan th={th} t={t} />
          : th.hoaTiet === 'studio' ? <HoaTietStudio th={th} /> : th.hoaTiet === 'phan' ? <HoaTietPhan th={th} t={t} /> : <HoaTietBanVe th={th} t={t} />}
        {/* vệt sáng lướt chéo khi đổi bước */}
        {n.quet >= 0 ? (
          <g transform={`rotate(-18 540 960) translate(${-700 + n.quet * 2500} 0)`}>
            <rect x={0} y={-600} width={360} height={3200} fill="url(#quet-v99)" opacity={Math.sin(Math.PI * n.quet)} />
          </g>
        ) : null}
        <rect width={RONG} height={CAO} fill="url(#toi-goc-v99)" />
      </svg>
    </div>
  );
};
