import React from 'react';

// NHÂN VẬT CỬ ĐỘNG NHƯ NGƯỜI THẬT: có khớp vai - khuỷu tay - hông - đầu gối, mỗi động tác là một bộ góc khớp thay đổi theo
// thời gian (không phải hình que đứng đơ). Đứng yên vẫn thở nhẹ, đung đưa tay, chớp mắt.
// Toạ độ: chân chạm đất tại (0,0), đỉnh đầu ở y = -100 (trục y hướng LÊN là số âm), rộng khoảng ±25.
export type DongTac = 'dung' | 'di' | 'vay_tay' | 'chi' | 'suy_nghi' | 'vui' | 'nhin_len' | 'gio_tay' | 'chao';
export const DONG_TAC: DongTac[] = ['dung', 'di', 'vay_tay', 'chi', 'suy_nghi', 'vui', 'nhin_len', 'gio_tay', 'chao'];

type Goc = {tayT: [number, number]; tayP: [number, number]; chanT: [number, number]; chanP: [number, number]; dau: number; nhun: number; than: number};

// góc khớp (độ, 0 = thẳng xuống, dương = quay ngược chiều kim đồng hồ) cho từng động tác tại thời điểm t
function tuThe(dt: DongTac, t: number, gocChi: number, hat: number): Goc {
  const s = (k: number, ph = 0) => Math.sin(t * k + hat + ph);
  const tho = s(2.2) * 1.2;
  const base: Goc = {tayT: [8 + s(1.6) * 4, -6], tayP: [-8 - s(1.6, 1) * 4, 6], chanT: [3, 0], chanP: [-3, 0], dau: s(0.9) * 3, nhun: tho, than: 0};
  switch (dt) {
    case 'di': {
      const b = s(9);
      return {tayT: [-28 * b, -18 - 10 * Math.abs(b)], tayP: [28 * b, 18 + 10 * Math.abs(b)], chanT: [26 * b, 22 * Math.max(0, -b)], chanP: [-26 * b, 22 * Math.max(0, b)], dau: 2 * b, nhun: Math.abs(s(9)) * 3, than: -4};
    }
    case 'vay_tay':
      return {...base, tayP: [-150 + s(7) * 18, -25 + s(7) * 20], dau: -6 + s(1.5) * 3};
    case 'chi': {
      // tay phải chỉ thẳng theo hướng gocChi (độ, 0 = sang phải, âm = chếch lên)
      // góc khớp: 0 = thẳng xuống, quay NGƯỢC chiều kim đồng hồ là âm -> chỉ sang phải ngang = -90, chếch lên 30° = -120
      return {...base, tayP: [-(90 - gocChi) + s(2) * 2, 4], dau: Math.max(-25, Math.min(20, gocChi * 0.6)), than: -2};
    }
    case 'suy_nghi':
      // tay phải gập lên chống cằm, tay trái khoanh ngang bụng, đầu nghiêng
      return {...base, tayP: [20, 150], tayT: [-55, -70], dau: 10 + s(1.2) * 4};
    case 'vui': {
      const nhay = Math.max(0, s(6)) * 8;
      return {tayT: [150 + s(6) * 10, 10], tayP: [-150 - s(6) * 10, -10], chanT: [6, nhay * 2], chanP: [-6, nhay * 2], dau: s(6) * 5, nhun: -nhay, than: 0};
    }
    case 'nhin_len':
      return {...base, dau: -22 + s(1) * 2, tayP: [-100, 226]};   // ngửa đầu nhìn lên, tay đưa lên trán che nắng
    case 'gio_tay':
      return {...base, tayP: [-172 + s(3) * 4, -4], dau: -4};
    case 'chao':
      return {...base, tayP: [-120 + s(5) * 30, -40], than: 3 * s(5)};
    default:
      return base;
  }
}

const Chi: React.FC<{x: number; y: number; g1: number; g2: number; d1: number; d2: number; mau: string; day: number; dau?: React.ReactNode}> = ({x, y, g1, g2, d1, d2, mau, day, dau}) => (
  <g transform={`translate(${x} ${y}) rotate(${g1})`}>
    <line x1={0} y1={0} x2={0} y2={d1} stroke={mau} strokeWidth={day} strokeLinecap="round" />
    <g transform={`translate(0 ${d1}) rotate(${g2})`}>
      <line x1={0} y1={0} x2={0} y2={d2} stroke={mau} strokeWidth={day * 0.92} strokeLinecap="round" />
      {dau ? <g transform={`translate(0 ${d2})`}>{dau}</g> : null}
    </g>
  </g>
);

export const NguoiCuDong: React.FC<{dongTac?: DongTac | string; t: number; mauAo: string; gocChi?: number; hat?: number; toc?: string; sang?: number}> = ({dongTac = 'dung', t, mauAo, gocChi = -30, hat = 0, toc = '#2b1c12', sang = 0}) => {
  const dt = (DONG_TAC as string[]).includes(dongTac) ? (dongTac as DongTac) : 'dung';
  const g = tuThe(dt, t, gocChi, hat);
  const chop = (t * 0.7 + hat) % 4 < 0.12;   // chớp mắt
  const da = '#f4c99a', quan = '#2c4a6e', giay = '#1d1d1d';
  const y0 = -g.nhun;
  return (
    <g transform={`translate(0 ${y0})`}>
      {/* chân (sau thân) */}
      <Chi x={-6} y={-46} g1={g.chanT[0]} g2={g.chanT[1]} d1={23} d2={22} mau={quan} day={9} dau={<ellipse cx={3} cy={1} rx={6} ry={3.5} fill={giay} />} />
      <Chi x={6} y={-46} g1={g.chanP[0]} g2={g.chanP[1]} d1={23} d2={22} mau={quan} day={9} dau={<ellipse cx={3} cy={1} rx={6} ry={3.5} fill={giay} />} />
      <g transform={`rotate(${g.than} 0 -46)`}>
        {/* tay trái (sau thân) */}
        <Chi x={-12} y={-74} g1={g.tayT[0]} g2={g.tayT[1]} d1={16} d2={15} mau={mauAo} day={7} dau={<circle r={4} fill={da} />} />
        {/* thân áo */}
        <path d="M-13 -78 Q0 -83 13 -78 L14 -46 Q0 -42 -14 -46 Z" fill={mauAo} stroke={sang > 0.01 ? '#ffffff' : 'rgba(255,255,255,0.25)'} strokeWidth={sang > 0.01 ? 2 : 1} />
        <path d="M-5 -79 L0 -72 L5 -79" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1.5} />
        {/* đầu */}
        <g transform={`rotate(${g.dau} 0 -80)`}>
          <rect x={-3} y={-84} width={6} height={6} fill={da} />
          <circle cx={0} cy={-91} r={10} fill={da} />
          <path d="M-10 -92 Q-9 -103 0 -102 Q10 -102 10 -92 Q5 -97 -10 -92 Z" fill={toc} />
          {chop ? <path d="M-5 -91 L-2 -91 M2 -91 L5 -91" stroke="#1d1d1d" strokeWidth={1.2} /> : <><circle cx={-3.5} cy={-91} r={1.3} fill="#1d1d1d" /><circle cx={3.5} cy={-91} r={1.3} fill="#1d1d1d" /></>}
          {dt === 'vui' || dt === 'vay_tay' || dt === 'chao' ? <path d="M-4 -86 Q0 -82 4 -86" fill="#7a2a1a" stroke="#7a2a1a" strokeWidth={1} /> : dt === 'suy_nghi' ? <path d="M-3 -85 L3 -85.5" stroke="#7a3a1a" strokeWidth={1.2} /> : <path d="M-3 -85.5 Q0 -84 3 -85.5" fill="none" stroke="#7a3a1a" strokeWidth={1.2} />}
        </g>
        {/* tay phải (trước thân) */}
        <Chi x={12} y={-74} g1={g.tayP[0]} g2={g.tayP[1]} d1={16} d2={15} mau={mauAo} day={7} dau={<circle r={4} fill={da} />} />
      </g>
      {dt === 'suy_nghi' ? <text x={16} y={-104} fontSize={14} fontWeight={900} fill="#FFD54A" opacity={0.6 + 0.4 * Math.sin(t * 3)}>?</text> : null}
    </g>
  );
};
