import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ngauNhien} from './sankhau/donghieu';

// NỀN "CỰC QUANG" (mặc định): nền motion graphic nhiều lớp, có chiều sâu nhưng không lấn át nội dung.
//  1. Mảng màu cực quang lớn (xanh ngọc, tím, cam, lam) trôi theo quỹ đạo Lissajous, hòa sáng vào nhau; bảng màu đổi dần theo nhóm cảnh.
//  2. Sàn lưới phối cảnh 3D ở nửa dưới chạy về phía người xem (cảm giác chuyển động liên tục).
//  3. Ký hiệu toán/xác suất (π Σ ⅓ √ % ∞ ⚀...) trôi ở 3 tầng sâu: tầng xa nhỏ và mờ nhòe, tầng gần lớn hơn (parallax).
//  4. Vệt sáng chéo quét qua định kỳ, hạt mịn như phim, tối dần ra bốn góc.
const BANG_MAU: string[][] = [
  ['#13c2a3', '#7c3aed', '#ff7a2f', '#2563eb'],
  ['#0ea5e9', '#a855f7', '#22c55e', '#f43f5e'],
  ['#14b8a6', '#f97316', '#6366f1', '#eab308'],
];
const KY_HIEU = ['π', 'Σ', '⅓', '√', '%', '∞', '½', 'P(A)', '∩', '∪', '⚀', '⚄', '♦', '?', 'n!', '¾'];

const GLYPH = (() => {
  const r = ngauNhien(911);
  return Array.from({length: 22}, (_, i) => ({
    k: KY_HIEU[i % KY_HIEU.length],
    x: r() * 1080,
    y: r() * 1920,
    tang: i % 3, // 0 xa, 1 giữa, 2 gần
    v: 0.15 + r() * 0.35,
    xoay: (r() - 0.5) * 40,
    vx: (r() - 0.5) * 0.6,
    pha: r() * Math.PI * 2,
  }));
})();

const tron = (a: string, b: string, p: number) => {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const x = h(a);
  const y = h(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * p)).join(',')})`;
};

export const NenCucQuang: React.FC<{nhom?: number; chuyen?: number; chiLop?: boolean}> = ({nhom = 0, chuyen = 1, chiLop = false}) => {
  const f = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  const t = f / 30;
  const truoc = BANG_MAU[(nhom + BANG_MAU.length - 1) % BANG_MAU.length];
  const nay = BANG_MAU[nhom % BANG_MAU.length];
  const mau = nay.map((c, i) => tron(truoc[i], c, nhom === 0 ? 1 : chuyen));
  const blob = [
    {x: 0.25 + 0.18 * Math.sin(t * 0.21), y: 0.22 + 0.1 * Math.cos(t * 0.17), r: 620},
    {x: 0.78 + 0.15 * Math.cos(t * 0.19), y: 0.38 + 0.12 * Math.sin(t * 0.23), r: 560},
    {x: 0.5 + 0.22 * Math.sin(t * 0.13 + 1), y: 0.72 + 0.08 * Math.cos(t * 0.2), r: 680},
    {x: 0.18 + 0.12 * Math.cos(t * 0.27), y: 0.88 + 0.06 * Math.sin(t * 0.16), r: 480},
  ];
  // sàn lưới phối cảnh
  const chanTroi = H * 0.7;
  const duongSan: React.ReactNode[] = [];
  const troi = (f * 0.018) % 1;
  for (let i = 0; i < 12; i++) {
    const d = Math.pow((i + troi) / 12, 2.2);
    const y = chanTroi + d * (H - chanTroi + 200);
    duongSan.push(<line key={`n${i}`} x1={0} x2={W} y1={y} y2={y} stroke="#9ffcf0" strokeOpacity={0.03 + 0.14 * d} strokeWidth={1 + 2 * d} />);
  }
  for (let k = -10; k <= 10; k++) {
    duongSan.push(<line key={`d${k}`} x1={W / 2 + k * 40} y1={chanTroi} x2={W / 2 + k * 260} y2={H + 200} stroke="#9ffcf0" strokeOpacity={0.08} strokeWidth={1.5} />);
  }
  const quet = ((t % 7) / 7) * 1.8 - 0.4; // vệt sáng chéo
  return (
    <AbsoluteFill style={{background: chiLop ? 'transparent' : 'linear-gradient(180deg, #071318 0%, #0a1620 50%, #070d12 100%)', overflow: 'hidden', opacity: chiLop ? 0.7 : 1}}>
      {blob.map((b, i) => (
        <div key={i} style={{position: 'absolute', left: b.x * W - b.r, top: b.y * H - b.r, width: b.r * 2, height: b.r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${mau[i]} 0%, rgba(0,0,0,0) 68%)`, opacity: chiLop ? 0.24 : 0.36, mixBlendMode: 'screen'}} />
      ))}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="sanMo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity={1} />
            <stop offset="0.25" stopColor="#000" stopOpacity={0} />
          </linearGradient>
        </defs>
        {duongSan}
        <rect x={0} y={chanTroi - 2} width={W} height={160} fill="url(#sanMo)" opacity={0.6} />
        <line x1={0} x2={W} y1={chanTroi} y2={chanTroi} stroke={mau[0]} strokeOpacity={0.1} strokeWidth={10} />
        <line x1={0} x2={W} y1={chanTroi} y2={chanTroi} stroke={mau[0]} strokeOpacity={0.28} strokeWidth={2} />
      </svg>
      {GLYPH.map((g, i) => {
        const tocDo = [0.35, 0.7, 1.15][g.tang];
        const y = ((g.y - f * g.v * tocDo + H * 8) % (H + 200)) - 100;
        const x = g.x + Math.sin(t * 0.3 + g.pha) * 30 + f * g.vx * 0.3;
        const co = [46, 70, 104][g.tang];
        return (
          <div key={i} style={{position: 'absolute', left: ((x % W) + W) % W, top: y, fontFamily: '"VietDam", "DejaVu Sans", sans-serif', fontWeight: 900, fontSize: co, color: mau[i % 4], opacity: [0.07, 0.11, 0.16][g.tang], transform: `rotate(${g.xoay + Math.sin(t * 0.4 + g.pha) * 10}deg)`}}>
            {g.k}
          </div>
        );
      })}
      <div style={{position: 'absolute', top: -400, bottom: -400, width: 260, left: `${quet * 100}%`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', transform: 'rotate(18deg)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 75% at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.65) 100%)'}} />
    </AbsoluteFill>
  );
};
