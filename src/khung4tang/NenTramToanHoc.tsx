// v90 — NỀN ĐEN THAN + 2 lớp lưới phối cảnh siêu mờ (trần ở mép trên, sàn ở mép dưới), phai dần về giữa.
// Chỉ SVG nét mảnh + gradient (không blur, không feTurbulence) để render Chromium nhanh. Lưới trôi rất chậm về phía người xem.
import React from 'react';
import {CAO, RONG} from '../theme';

const NET = 'rgba(148,163,184,1)';

function Luoi({tren, t}: {tren: boolean; t: number}) {
  // điểm tụ nằm ngoài vùng lưới, phía giữa màn hình
  const vpY = tren ? 720 : 1200;
  const bien = tren ? 0 : CAO; // mép màn hình
  const den = tren ? 380 : 1540; // lưới phai hết tại đây
  const doc: React.ReactNode[] = [];
  for (let i = -9; i <= 9; i++) {
    const x = RONG / 2 + i * 150;
    // đường từ mép màn hình hướng về điểm tụ, dừng ở vạch phai
    const k = (den - bien) / (vpY - bien);
    doc.push(<line key={'d' + i} x1={x} y1={bien} x2={x + (RONG / 2 - x) * k} y2={den} />);
  }
  const ngang: React.ReactNode[] = [];
  const pha = (t * 0.12) % 1; // trôi chậm
  for (let j = 0; j < 9; j++) {
    const u = (j + pha) / 9; // 0 = sát mép, 1 = gần điểm tụ
    const y = bien + (den - bien) * (1 - Math.pow(1 - u, 2.2));
    ngang.push(<line key={'n' + j} x1={0} y1={y} x2={RONG} y2={y} strokeOpacity={0.75 * (1 - u)} />);
  }
  const id = tren ? 'phai-tren' : 'phai-duoi';
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1={bien} x2="0" y2={den} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id={id + '-m'}>
          <rect x={0} y={Math.min(bien, den)} width={RONG} height={Math.abs(den - bien)} fill={`url(#${id})`} />
        </mask>
      </defs>
      <g mask={`url(#${id}-m)`} stroke={NET} strokeOpacity={0.045} strokeWidth={1.2} fill="none">
        {doc}
        {ngang}
      </g>
    </g>
  );
}

export const NenTramToanHoc: React.FC<{t: number; mauNhan: string; tamSanKhau: number}> = ({t, mauNhan, tamSanKhau}) => (
  <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0E1014 0%, #12141A 45%, #12141A 70%, #0E1014 100%)'}}>
    {/* quầng màu nhấn rất nhẹ sau sân khấu 3D (gradient tĩnh, đổi sắc theo bước) */}
    <div style={{position: 'absolute', left: 0, right: 0, top: tamSanKhau - 420, height: 840, background: `radial-gradient(ellipse 52% 46% at 50% 50%, ${mauNhan}14 0%, ${mauNhan}08 45%, transparent 75%)`}} />
    <svg width={RONG} height={CAO} style={{position: 'absolute', inset: 0}}>
      <Luoi tren t={t} />
      <Luoi tren={false} t={t} />
    </svg>
  </div>
);
