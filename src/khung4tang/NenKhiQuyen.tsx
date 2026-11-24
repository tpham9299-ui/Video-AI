// v99.1 / v99.3 — NỀN KHÍ QUYỂN ĐỘNG (5 theme) cho Khung 4 tầng. Chỉ gradient + SVG nét mảnh (không blur /
// feTurbulence) để render Chromium nhanh. Chuyển động mượt theo useCurrentFrame(): 3 vầng sáng gradient trôi chậm
// (opacity 0.18–0.28), lưới tọa độ trượt nhẹ (parallax), hạt bokeh / ký hiệu toán mờ nổi chậm theo mảng (Hình học vs Xác suất).
import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {CAO, FONT, RONG} from '../theme';
import {
  diemTatDinh,
  hatBokehToan,
  luoiParallax,
  MangNen,
  suyMangNen,
  ThemeV99,
  trangThaiNen,
  vangSangDong,
  viTriHat,
} from './nen_v99';

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

// v99.3: lớp nền động dùng chung cho mọi nền Khung 4 tầng (cả NenKhiQuyen và NenTramToanHoc):
//  - 3 vầng sáng radial-gradient trôi chậm theo useCurrentFrame() (opacity 0.18-0.28);
//  - lưới tọa độ 2 tầng trượt nhẹ (parallax);
//  - hạt bokeh / ký hiệu toán / hình khối mờ (Hình học) / biểu đồ cột mờ (Xác suất) nổi chậm.
export const LopNenDongV993: React.FC<{
  frame: number;
  fps: number;
  tamSanKhau: number;
  mauChinh: string;
  mauPhu: string;
  mauNet: string;
  mang: MangNen;
  lechBuocX?: number;
}> = ({frame, fps, tamSanKhau, mauChinh, mauPhu, mauNet, mang, lechBuocX = 0}) => {
  const vang = vangSangDong(frame, fps, tamSanKhau, mauChinh, mauPhu, lechBuocX);
  const pl = luoiParallax(frame, fps);
  const hat = useMemo(() => hatBokehToan(mang, 16), [mang]);
  const laHH = mang === 'hinh_hoc';
  const laXS = mang === 'xac_suat';
  return (
    <div data-nen-dong={mang} style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden'}}>
      {vang.map((v) => (
        <div
          key={v.id}
          data-vang-sang={v.id}
          style={{
            position: 'absolute',
            left: v.cx - v.rx,
            top: v.cy - v.ry,
            width: v.rx * 2,
            height: v.ry * 2,
            opacity: v.opacity,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${v.mauTrong} 0%, ${v.mauGiua} 48%, transparent 76%)`,
          }}
        />
      ))}
      <svg width={RONG} height={CAO} style={{position: 'absolute', inset: 0}}>
        <defs>
          <pattern id={`pl-xa-${mang}`} width={120} height={120} patternUnits="userSpaceOnUse" patternTransform={`translate(${pl.xaX} ${pl.xaY})`}>
            <path d="M120 0H0V120" fill="none" stroke={mauNet} strokeWidth={1.1} />
            {laHH ? <circle cx={0} cy={0} r={2.2} fill={mauNet} /> : null}
          </pattern>
          <pattern id={`pl-gan-${mang}`} width={40} height={40} patternUnits="userSpaceOnUse" patternTransform={`translate(${pl.ganX} ${pl.ganY})`}>
            {laHH ? (
              <path d="M40 0H0V40" fill="none" stroke={mauNet} strokeWidth={0.65} />
            ) : (
              <circle cx={20} cy={20} r={1.3} fill={mauNet} />
            )}
          </pattern>
          <radialGradient id={`pl-mask-grad-${mang}`} cx="50%" cy="46%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity={1} />
            <stop offset="65%" stopColor="#fff" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0.12} />
          </radialGradient>
          <mask id={`pl-mask-${mang}`}>
            <rect width={RONG} height={CAO} fill={`url(#pl-mask-grad-${mang})`} />
          </mask>
        </defs>
        <g mask={`url(#pl-mask-${mang})`}>
          <rect width={RONG} height={CAO} fill={`url(#pl-xa-${mang})`} opacity={laHH ? 0.055 : 0.038} />
          <rect width={RONG} height={CAO} fill={`url(#pl-gan-${mang})`} opacity={laHH ? 0.042 : 0.052} />
        </g>
        {hat.map((h, idx) => {
          const vt = viTriHat(h, frame, fps);
          if (h.kieu === 'ky_hieu') {
            return (
              <text
                key={idx}
                x={vt.x}
                y={vt.y}
                fill={mauNet}
                opacity={vt.opacity}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={Math.round(h.r * 1.15)}
                textAnchor="middle"
                transform={`rotate(${vt.xoay} ${vt.x} ${vt.y})`}
              >
                {h.kyHieu}
              </text>
            );
          }
          if (h.kieu === 'khoi_mo') {
            const r = h.r * 1.25;
            return (
              <g key={idx} transform={`translate(${vt.x} ${vt.y}) rotate(${vt.xoay})`} stroke={mauNet} fill="none" strokeWidth={1.3} opacity={vt.opacity}>
                <polygon points={`0,${-r} ${r * 0.9},${r * 0.7} ${-r * 0.9},${r * 0.7}`} />
                <line x1={0} y1={-r} x2={0} y2={r * 0.7} strokeDasharray="3 3" />
              </g>
            );
          }
          if (h.kieu === 'cot_mo' || laXS && idx % 5 === 0) {
            const w = h.r * 0.42;
            return (
              <g key={idx} transform={`translate(${vt.x} ${vt.y})`} fill={mauNet} opacity={vt.opacity * 0.85}>
                <rect x={-w * 1.6} y={-h.r * 0.45} width={w} height={h.r * 0.45} rx={2} />
                <rect x={-w * 0.3} y={-h.r * 0.85} width={w} height={h.r * 0.85} rx={2} />
                <rect x={w} y={-h.r * 0.62} width={w} height={h.r * 0.62} rx={2} />
              </g>
            );
          }
          return (
            <g key={idx} opacity={vt.opacity}>
              <circle cx={vt.x} cy={vt.y} r={h.r * 1.45} fill={idx % 2 === 0 ? mauChinh : mauNet} opacity={0.38} />
              <circle cx={vt.x} cy={vt.y} r={h.r * 0.72} fill={mauNet} opacity={0.72} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const NenKhiQuyen: React.FC<{th: ThemeV99; t: number; mocBuoc: number[]; tamSanKhau: number; mauNhan: string; mang?: MangNen}> = ({th, t, mocBuoc, tamSanKhau, mauNhan, mang}) => {
  const frame = useCurrentFrame();
  const vc = useVideoConfig();
  const fps = vc?.fps || 30;
  const tDong = Math.max(t, frame / fps);
  const frameDong = Math.max(frame, Math.round(t * fps));
  const mangNen = mang || suyMangNen({theme: th.ten});
  const n = trangThaiNen(tDong, mocBuoc);
  const a = Math.round(th.quangMo * 255).toString(16).padStart(2, '0');
  const a2 = Math.round(th.quangMo * 0.4 * 255).toString(16).padStart(2, '0');
  return (
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${th.tren} 0%, ${th.giua} 46%, ${th.duoi} 100%)`}}>
      <LopNenDongV993
        frame={frameDong}
        fps={fps}
        tamSanKhau={tamSanKhau}
        mauChinh={th.quang}
        mauPhu={mauNhan}
        mauNet={th.net}
        mang={mangNen}
        lechBuocX={n.lechX}
      />
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
        {th.hoaTiet === 'song' ? <HoaTietSong th={th} t={tDong} /> : th.hoaTiet === 'tinh_van' ? <HoaTietTinhVan th={th} t={tDong} />
          : th.hoaTiet === 'studio' ? <HoaTietStudio th={th} /> : th.hoaTiet === 'phan' ? <HoaTietPhan th={th} t={tDong} /> : <HoaTietBanVe th={th} t={tDong} />}
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
