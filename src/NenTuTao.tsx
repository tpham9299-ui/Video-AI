import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

// NỀN TỰ TẠO - MỖI VIDEO MỘT NỀN KHÁC: kiểu nền + tông màu + vị trí hoa văn đều sinh từ mã video (hạt giống),
// nên hai video liền nhau gần như không bao giờ giống nhau. Nền tối, tương phản thấp, chuyển động chậm để chữ và hình luôn nổi.
export type NenTuTaoProps = {kieu: string; hue: number; hat: number};
export const KIEU_NEN_TU_TAO = ['cuc_quang', 'hat_sang', 'song', 'luc_giac', 'tia', 'ky_hieu', 'luoi'] as const;

function ngauNhien(hat: number) {
  let s = hat >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;

export const NenTuTao: React.FC<{cfg: NenTuTaoProps; nhan: string}> = ({cfg, nhan}) => {
  const f = useCurrentFrame();
  const r = ngauNhien(cfg.hat);
  const h = cfg.hue;
  const h2 = h + 40 + r() * 80;
  const nen = `radial-gradient(ellipse 120% 80% at ${30 + r() * 40}% ${20 + r() * 30}%, ${hsl(h, 45, 12)} 0%, ${hsl(h, 40, 6)} 55%, ${hsl(h2, 35, 4)} 100%)`;
  let lop: React.ReactNode = null;
  switch (cfg.kieu) {
    case 'cuc_quang': {
      // các dải cực quang mềm trôi chậm
      lop = Array.from({length: 4}, (_, i) => {
        const x = 20 + r() * 60, y = 15 + r() * 70, w = 500 + r() * 500, sp = 0.004 + r() * 0.006;
        return <div key={i} style={{position: 'absolute', left: `${x}%`, top: `${y}%`, width: w, height: w * 0.55, marginLeft: -w / 2, marginTop: -w * 0.27, borderRadius: '50%',
          background: `radial-gradient(ellipse, ${hsl(i % 2 ? h2 : h, 80, 50, 0.22)} 0%, transparent 70%)`, filter: 'blur(40px)',
          transform: `translate(${Math.sin(f * sp + i) * 90}px, ${Math.cos(f * sp * 0.8 + i) * 60}px) rotate(${Math.sin(f * sp + i * 2) * 20}deg)`}} />;
      });
      break;
    }
    case 'hat_sang': {
      // đốm sáng bokeh bay lên chậm
      lop = Array.from({length: 26}, (_, i) => {
        const x = r() * 1080, y0 = r() * 1920, s = 6 + r() * 26, v = 0.3 + r() * 0.8, mo = 0.08 + r() * 0.22;
        const y = ((y0 - f * v) % 2000 + 2000) % 2000 - 40;
        return <div key={i} style={{position: 'absolute', left: x + Math.sin(f / 60 + i) * 20, top: y, width: s, height: s, borderRadius: '50%', background: hsl(i % 3 ? h : h2, 85, 65, mo), boxShadow: `0 0 ${s * 1.5}px ${hsl(h, 85, 60, mo)}`}} />;
      });
      break;
    }
    case 'song': {
      // các đường sóng chảy ngang
      lop = (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {Array.from({length: 9}, (_, i) => {
            const y0 = 200 + i * 190 + r() * 60, A = 30 + r() * 50, k = 0.004 + r() * 0.004, sp = 0.02 + r() * 0.03;
            const d = Array.from({length: 28}, (_, j) => `${j ? 'L' : 'M'}${j * 40} ${(y0 + Math.sin(j * 40 * k + f * sp + i) * A).toFixed(1)}`).join(' ');
            return <path key={i} d={d} fill="none" stroke={hsl(i % 2 ? h : h2, 70, 60, 0.1 + 0.05 * (i % 3))} strokeWidth={2} />;
          })}
        </svg>
      );
      break;
    }
    case 'luc_giac': {
      // lưới lục giác mảnh, vài ô nhấp sáng lần lượt
      const R = 60, w = R * Math.sqrt(3);
      const o: React.ReactNode[] = [];
      for (let row = 0; row < 24; row++) for (let col = 0; col < 11; col++) {
        const cx = col * w + (row % 2 ? w / 2 : 0), cy = row * R * 1.5;
        const pha = (f / 40 + (row * 7 + col * 3) * 0.37) % 6;
        const sang = pha < 0.6 ? Math.sin((pha / 0.6) * Math.PI) : 0;
        const pts = Array.from({length: 6}, (_, k) => `${(cx + R * 0.92 * Math.cos(Math.PI / 6 + (k * Math.PI) / 3)).toFixed(1)},${(cy + R * 0.92 * Math.sin(Math.PI / 6 + (k * Math.PI) / 3)).toFixed(1)}`).join(' ');
        o.push(<polygon key={`${row}_${col}`} points={pts} fill={hsl(h, 80, 55, 0.05 * sang)} stroke={hsl(h, 60, 55, 0.07 + 0.2 * sang)} strokeWidth={1.4} />);
      }
      lop = <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>{o}</svg>;
      break;
    }
    case 'tia': {
      // chùm tia sáng xoay rất chậm từ một tâm
      const cx = 200 + r() * 680, cy = 300 + r() * 500;
      lop = (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(${cx} ${cy}) rotate(${f * 0.05})`}>
            {Array.from({length: 18}, (_, i) => {
              const a = (i / 18) * Math.PI * 2, b = a + 0.08;
              return <path key={i} d={`M0 0 L${Math.cos(a) * 2400} ${Math.sin(a) * 2400} L${Math.cos(b) * 2400} ${Math.sin(b) * 2400} Z`} fill={hsl(i % 2 ? h : h2, 70, 55, 0.045)} />;
            })}
          </g>
        </svg>
      );
      break;
    }
    case 'ky_hieu': {
      // ký hiệu toán mờ trôi chậm (π √ ∑ ∞ % ÷ ∫ Δ...)
      const kh = ['π', '√', '∑', '∞', '%', '÷', '∫', 'Δ', 'θ', '≈', 'x²', '±', 'α', '∠'];
      lop = Array.from({length: 22}, (_, i) => {
        const x = r() * 1000, y0 = r() * 1920, s = 40 + r() * 70, v = 0.15 + r() * 0.35;
        return <div key={i} style={{position: 'absolute', left: x, top: ((y0 - f * v) % 2000 + 2000) % 2000 - 80, fontSize: s, fontWeight: 800, fontFamily: 'Be Vietnam Pro, sans-serif',
          color: hsl(i % 2 ? h : h2, 60, 65, 0.07 + r() * 0.06), transform: `rotate(${Math.sin(f / 90 + i) * 15}deg)`}}>{kh[i % kh.length]}</div>;
      });
      break;
    }
    default: {
      // lưới sàn phối cảnh (kiểu cũ) theo tông màu riêng
      lop = (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {Array.from({length: 22}, (_, i) => {
            const t = i / 21, y = 1200 + Math.pow(t, 2) * 720;
            return <line key={`h${i}`} x1={0} y1={y} x2={1080} y2={y} stroke={hsl(h, 70, 60, 0.05 + 0.12 * t)} strokeWidth={1.5} />;
          })}
          {Array.from({length: 19}, (_, i) => <line key={`v${i}`} x1={540} y1={1150} x2={-1600 + i * 237} y2={1920} stroke={hsl(h, 70, 60, 0.1)} strokeWidth={1.5} />)}
        </svg>
      );
    }
  }
  return (
    <AbsoluteFill style={{background: nen, overflow: 'hidden'}}>
      {lop}
      {/* vầng sáng màu nhấn của loại câu hỏi + tối viền để mắt dồn vào giữa */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 40% at 50% 45%, ${nhan}14 0%, transparent 70%)`}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
    </AbsoluteFill>
  );
};
