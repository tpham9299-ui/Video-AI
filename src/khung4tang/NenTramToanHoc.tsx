// v90 / v99.3 — NỀN ĐEN THAN + hiệu ứng nền động nhẹ CPU theo useCurrentFrame() (vầng sáng gradient trôi chậm,
// lưới tọa độ trượt nhẹ parallax, hạt bokeh / ký hiệu toán mờ nổi chậm theo mảng Hình học vs Xác suất).
// Chỉ SVG nét mảnh + gradient (không blur, không feTurbulence) để render Chromium nhanh.
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {CAO, RONG} from '../theme';
import {LopNenDongV993} from './NenKhiQuyen';
import {MangNen} from './nen_v99';

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

const NenV95: React.FC<{t: number; mauNhan: string; tamSanKhau: number; mang?: MangNen}> = ({t, mauNhan, tamSanKhau, mang = 'hinh_hoc'}) => {
  const frame = useCurrentFrame();
  const vc = useVideoConfig();
  const fps = vc?.fps || 30;
  const frameDong = Math.max(frame, Math.round(t * fps));
  const tDong = Math.max(t, frame / fps);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0E1014 0%, #12141A 45%, #12141A 70%, #0E1014 100%)'}}>
      <LopNenDongV993 frame={frameDong} fps={fps} tamSanKhau={tamSanKhau} mauChinh={mauNhan} mauPhu="#7FB8FF" mauNet="#A9CCFF" mang={mang} />
      {/* v95: spotlight trắng cực dịu + quầng màu nhấn sau sân khấu 3D -> chiều sâu, hết mảng đen phẳng */}
      <div style={{position: 'absolute', left: 0, right: 0, top: tamSanKhau - 560, height: 1120, background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.018) 45%, transparent 78%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: tamSanKhau - 420, height: 840, background: `radial-gradient(ellipse 52% 46% at 50% 50%, ${mauNhan}1A 0%, ${mauNhan}0A 45%, transparent 75%)`}} />
      {/* v95: lưới chấm kỹ thuật phủ TOÀN khung (độ đục ~5 %), trôi rất chậm; viền chéo mờ dần ra mép */}
      <svg width={RONG} height={CAO} style={{position: 'absolute', inset: 0}}>
        <defs>
          <pattern id="luoi-cham" width={36} height={36} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${(tDong * 3) % 36})`}>
            <circle cx={18} cy={18} r={1.35} fill="#E6EDF5" />
          </pattern>
          <pattern id="luoi-o" width={144} height={144} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${(tDong * 3) % 144})`}>
            <path d="M144 0H0V144" fill="none" stroke="#E6EDF5" strokeWidth={1} />
          </pattern>
          <radialGradient id="phai-mep" cx="50%" cy="45%" r="75%">
            <stop offset="0" stopColor="#fff" stopOpacity={1} />
            <stop offset="1" stopColor="#fff" stopOpacity={0.35} />
          </radialGradient>
          <mask id="mask-mep"><rect width={RONG} height={CAO} fill="url(#phai-mep)" /></mask>
        </defs>
        <g mask="url(#mask-mep)">
          <rect width={RONG} height={CAO} fill="url(#luoi-cham)" opacity={0.055} />
          <rect width={RONG} height={CAO} fill="url(#luoi-o)" opacity={0.03} />
        </g>
      </svg>
      <svg width={RONG} height={CAO} style={{position: 'absolute', inset: 0}}>
        <Luoi tren t={tDong} />
        <Luoi tren={false} t={tDong} />
      </svg>
    </div>
  );
};

// v98.1 / v99.3 — NỀN CÓ CHIỀU SÂU ĐỘNG cho luồng 2D / Xác suất / Đại số / khuôn 3D
const NenV981: React.FC<{t: number; mauNhan: string; tamSanKhau: number; mang?: MangNen}> = ({t, mauNhan, tamSanKhau, mang = 'xac_suat'}) => {
  const frame = useCurrentFrame();
  const vc = useVideoConfig();
  const fps = vc?.fps || 30;
  const frameDong = Math.max(frame, Math.round(t * fps));
  const tDong = Math.max(t, frame / fps);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 80% at 50% 42%, #14171E 0%, #101218 55%, #0B0D11 100%)'}}>
      <LopNenDongV993 frame={frameDong} fps={fps} tamSanKhau={tamSanKhau} mauChinh={mauNhan} mauPhu="#38BDF8" mauNet="#E6EDF5" mang={mang} />
      <div style={{position: 'absolute', left: 0, right: 0, top: tamSanKhau - 620, height: 1240,
        background: 'radial-gradient(ellipse 58% 48% at 50% 50%, rgba(255,240,220,0.075) 0%, rgba(255,240,220,0.028) 42%, transparent 74%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: tamSanKhau - 360, height: 720,
        background: `radial-gradient(ellipse 44% 40% at 50% 50%, ${mauNhan}10 0%, transparent 70%)`}} />
      <svg width={RONG} height={CAO} style={{position: 'absolute', inset: 0}}>
        <defs>
          <pattern id="cham-v981" width={34} height={34} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${(tDong * 2.4) % 34})`}>
            <circle cx={17} cy={17} r={1.25} fill="#E6EDF5" />
          </pattern>
          <radialGradient id="phai-v981" cx="50%" cy="44%" r="62%">
            <stop offset="0" stopColor="#fff" stopOpacity={1} />
            <stop offset="0.55" stopColor="#fff" stopOpacity={0.55} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </radialGradient>
          <mask id="mask-v981"><rect width={RONG} height={CAO} fill="url(#phai-v981)" /></mask>
        </defs>
        <rect width={RONG} height={CAO} fill="url(#cham-v981)" opacity={0.07} mask="url(#mask-v981)" />
      </svg>
    </div>
  );
};

export const NenTramToanHoc: React.FC<{t: number; mauNhan: string; tamSanKhau: number; kieu?: 'v95' | 'v981'; mang?: MangNen}> = ({kieu = 'v981', ...p}) =>
  kieu === 'v95' ? <NenV95 {...p} /> : <NenV981 {...p} />;
