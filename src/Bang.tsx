import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {DuLieuBang} from './bocuc';
import {smooth, kep01} from './manim';
import {MAU} from './theme';
import {Toan} from './Toan';

// Bảng kiểu Manim: khung và các đường kẻ trắng được vẽ dần, tiêu đề cam vàng, từng hàng hiện lần lượt.
export const Bang: React.FC<{du: DuLieuBang; giayAm: number}> = ({du, giayAm}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const n = du.cot.length;
  const soHang = du.hang.length + 1;
  const W = 900;
  const rongCot = W / n;
  const caoHang = 84;
  const H = soHang * caoHang;
  const co = n >= 4 ? 34 : 40;
  const buoc = Math.min(1.0, Math.max(0.45, (giayAm * 0.6) / Math.max(1, du.hang.length)));
  const duong = (x1: number, y1: number, x2: number, y2: number, bd: number, k: string) => {
    const p = smooth(kep01((t - bd) / 0.6));
    return <line key={k} x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />;
  };
  const ls: React.ReactNode[] = [];
  for (let r = 0; r <= soHang; r++) ls.push(duong(0, r * caoHang, W, r * caoHang, 0.1 + r * 0.1, `h${r}`));
  for (let c = 0; c <= n; c++) ls.push(duong(c * rongCot, 0, c * rongCot, H, 0.2 + c * 0.1, `v${c}`));
  return (
    <div style={{position: 'relative', width: W, height: H, margin: '0 auto'}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{ls}</svg>
      {du.cot.map((c, j) => (
        <div key={`c${j}`} style={{position: 'absolute', left: j * rongCot, top: 0, width: rongCot, height: caoHang, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: smooth(kep01((t - 0.5) / 0.5))}}>
          <Toan tex={c} size={co} color={MAU.vang} maxWidth={rongCot - 30} />
        </div>
      ))}
      {du.hang.map((r, i) =>
        r.map((v, j) => (
          <div key={`${i}-${j}`} style={{position: 'absolute', left: j * rongCot, top: (i + 1) * caoHang, width: rongCot, height: caoHang, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: smooth(kep01((t - 0.9 - i * buoc) / 0.5)), transform: `translateY(${(1 - smooth(kep01((t - 0.9 - i * buoc) / 0.5))) * 12}px)`}}>
            <Toan tex={v} size={co} maxWidth={rongCot - 30} />
          </div>
        ))
      )}
    </div>
  );
};
