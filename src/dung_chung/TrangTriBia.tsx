import React from 'react';
import {Img, staticFile} from 'remotion';
import {FONT_DAM, TEN_THUONG_HIEU} from '../theme';
import type {ThuongHieuProps} from '../types';

const XANH = '#3BF29A';
const CAM = '#FF8A3D';

const dongLogo = (ten: string): [string, string] => {
  const w = String(ten || '').trim().split(/\s+/);
  return w.length <= 2 ? [w[0] || '', w[1] || ''] : [w.slice(0, 2).join(' '), w.slice(2).join(' ')];
};

const chuCai = () => {
  const w = TEN_THUONG_HIEU.split(/\s+/).filter(Boolean);
  return (w.length >= 2 ? w[0][0] + w[w.length - 1][0] : TEN_THUONG_HIEU.slice(0, 2)).toUpperCase();
};

export const LogoTron: React.FC<{th: ThuongHieuProps; co: number; goc?: number; sang?: number}> = ({th, co, goc = 0, sang = 0}) => (
  <div style={{position: 'relative', width: co, height: co, flexShrink: 0}}>
    <div style={{position: 'absolute', inset: -co * 0.08, borderRadius: '50%', background: `conic-gradient(from ${goc}deg, ${XANH}, ${CAM}, ${XANH}, transparent 70%, ${XANH})`, opacity: 0.92}} />
    <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: '#071513', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 ${12 + 24 * sang}px ${XANH}`}}>
      {th.logo ? (
        <Img src={staticFile(th.logo)} style={{width: '86%', height: '86%', objectFit: 'contain'}} />
      ) : co >= 96 ? (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.02, textAlign: 'center', padding: '0 8%'}}>
          <span style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: co * 0.15, color: 'rgba(255,255,255,0.86)'}}>{dongLogo(TEN_THUONG_HIEU)[0]}</span>
          <span style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: co * (dongLogo(TEN_THUONG_HIEU)[1].length > 6 ? 0.17 : 0.22), color: XANH}}>{dongLogo(TEN_THUONG_HIEU)[1]}</span>
        </div>
      ) : (
        <span style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: co * 0.38, color: '#fff'}}>{chuCai()}</span>
      )}
    </div>
  </div>
);

const CHAM: Record<number, number[][]> = {
  1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

const MatXuc: React.FC<{mat: number; co: number; vien: string}> = ({mat, co, vien}) => (
  <svg width={co} height={co} viewBox="0 0 100 100">
    <rect x={4} y={4} width={92} height={92} rx={20} fill="#F7F7F2" stroke={vien} strokeWidth={5} />
    {(CHAM[mat] || CHAM[1]).map(([r, c], i) => (
      <circle key={i} cx={26 + c * 24} cy={26 + r * 24} r={9} fill={mat === 1 ? '#E0374A' : '#1b1b1b'} />
    ))}
  </svg>
);

const MAT_KHOI: [number, string][] = [
  [1, 'rotateY(0deg)'], [6, 'rotateY(180deg)'], [3, 'rotateY(90deg)'], [4, 'rotateY(-90deg)'], [2, 'rotateX(90deg)'], [5, 'rotateX(-90deg)'],
];

export const Xuc3D: React.FC<{co: number; rx: number; ry: number; vien: string}> = ({co, rx, ry, vien}) => (
  <div style={{width: co, height: co, perspective: co * 5}}>
    <div style={{position: 'relative', width: co, height: co, transformStyle: 'preserve-3d', transform: `rotateX(${rx}deg) rotateY(${ry}deg)`}}>
      {MAT_KHOI.map(([m, xoay]) => (
        <div key={m} style={{position: 'absolute', inset: 0, transform: `${xoay} translateZ(${co / 2}px)`, backfaceVisibility: 'hidden', borderRadius: co * 0.16, overflow: 'hidden', boxShadow: `inset 0 0 ${co * 0.12}px rgba(0,0,0,0.25), 0 0 ${co * 0.08}px ${vien}`}}>
          <MatXuc mat={m} co={co} vien={vien} />
        </div>
      ))}
    </div>
  </div>
);
