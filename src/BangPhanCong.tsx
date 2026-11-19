import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from './theme';
import {NguoiCuDong} from './sankhau/NguoiCuDong';

// Một phiếu đi từ tay người điều phối lên bảng. Đây là minh họa thao tác,
// nên không gán tên, số lượng nhân sự hay kết quả bốc thăm ngoài đề bài.
export const BangPhanCong: React.FC<{caTruc: boolean; cao: number; moc: number}> = ({caTruc, cao, moc}) => {
  const {fps} = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const u = Math.min(1, Math.max(0, (t - moc) / 1.4));
  const p = u * u * (3 - 2 * u);
  return <svg width="94%" height={cao} viewBox="0 0 850 460" fontFamily={FONT}>
    <ellipse cx="420" cy="414" rx="340" ry="16" fill="#102022" opacity=".55"/>
    <path d="M365 321l-25 84h13l28-84m277 0 28 84h14l-26-84" fill="#996848"/>
    <rect x="265" y="48" width="475" height="286" rx="12" fill="#966849"/>
    <rect x="276" y="59" width="453" height="264" rx="6" fill="#e4c89e"/>
    <path d="M299 130h405" stroke="#a47852" strokeWidth="3"/>
    <text x="500" y="111" textAnchor="middle" fill="#423128" fontSize="38" fontWeight="800">{caTruc ? 'Bảng trực' : 'Bảng phân nhóm'}</text>
    <g transform="translate(195 407) scale(2.55)"><NguoiCuDong t={t} mauAo="#507d96" dongTac="chi"/></g>
    <g transform={`translate(${242 + p*167} ${242 - p*86}) rotate(${-9+7*p})`}>
      <rect x="4" y="7" width="210" height="121" rx="4" fill="#594731" opacity=".24"/>
      <rect width="210" height="121" rx="4" fill="#fffaf0"/>
      <circle cx="105" cy="10" r="7" fill="#bd573c" opacity={p}/>
      <circle cx="39" cy="54" r="12" fill="#4f817e"/><path d="M20 86q1-31 19-31t20 31" fill="#4f817e"/>
      <text x="76" y="66" fontSize="24" fill="#254448" fontWeight="700">Thành viên</text>
      <path d="M76 81h98" stroke="#b5c6bc" strokeWidth="3"/>
    </g>
  </svg>;
};
