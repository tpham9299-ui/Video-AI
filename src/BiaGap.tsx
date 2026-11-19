import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

const muot = (t: number) => {
  const p = Math.max(0, Math.min(1, t));
  return p * p * (3 - 2 * p);
};

// Chiếu song song lên màn hình. Bốn mép quay đúng quanh bản lề của đáy.
export const BiaGap: React.FC<{ungDung?: boolean; cao: number; dai: number; batCat: number; batGap: number; kienTruc: boolean}> = ({ungDung, cao, dai, batCat, batGap, kienTruc}) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const cat = ungDung ? 1 : muot((t - batCat) / Math.max(0.25, Math.min(1, batGap - batCat)));
  const g = Math.PI / 2 * (ungDung ? 1 : muot((t - batGap) / Math.max(0.4, Math.min(1.8, dai - batGap))));
  const diem = ([x,y,z]: number[]) => [390 + x + 0.46*y, 200 + 0.58*y - z].join(',');
  const mat = (p: number[][], mau: string) => <polygon points={p.map(diem).join(' ')} fill={mau} stroke="#5e4025" strokeWidth={2.4} strokeLinejoin="round"/>;
  const w = 155, h = 92, r = 52, a = r*Math.cos(g), z = r*Math.sin(g);
  return <svg width="100%" height={cao} viewBox="0 0 780 365" aria-label="Gấp tấm bìa thành hộp không nắp">
    <g transform={ungDung && kienTruc ? 'translate(-80 10) scale(.86)' : undefined}>
      {mat([[-w,-h,0],[-w,-h-a,z],[w,-h-a,z],[w,-h,0]], '#ca9b64')}
      {mat([[-w,-h,0],[w,-h,0],[w,h,0],[-w,h,0]], '#f2d4a3')}
      {[-1,1].map(s => <g key={s}>{mat([[s*w,-h,0],[s*(w+a),-h,z],[s*(w+a),h,z],[s*w,h,0]], s<0?'#d6ae78':'#b48755')}</g>)}
      {mat([[-w,h,0],[w,h,0],[w,h+a,z],[-w,h+a,z]], '#dfb886')}
      {[-1,1].flatMap(x => [-1,1].map(y => <g key={x+','+y} opacity={1-cat}>
        {mat([[0,0],[r,0],[r,r],[0,r]].map(([u,v])=>[x*(w+u+cat*22),y*(h+v+cat*22),0]), '#e7bd87')}
      </g>))}
    </g>
    {ungDung && kienTruc && <g transform="translate(480 110)" stroke="#9ecfe0" strokeWidth={3}>
      <path d="M0 55L105 12L190 45L82 92Z" fill="#94bccc"/><path d="M0 55L82 92V170L0 132Z" fill="#446879"/><path d="M82 92L190 45V123L82 170Z" fill="#285164"/>
      {[0,1,2,3].map(i=><path key={i} d={`M${98+i*22} ${96-i*9}v42`} strokeWidth={8}/>)}
    </g>}
  </svg>;
};
