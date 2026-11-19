import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from './theme';
import {VatThuc} from './sankhau/vatthuc';

export type DuLieuThucTe =
  | {loai: 'cap_bo'; ah: number; hb: number}
  | {loai: 'can_ho'; tong: number; trong: number | null};

export const CanhThucTe: React.FC<{du: DuLieuThucTe; cao: number}> = ({du, cao}) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const ve = Math.min(1, Math.max(0, (t - 0.5) / 2));
  if (du.loai === 'cap_bo') {
    const tile = Math.min(650 / du.hb, 230 / du.ah);
    const h = (900 - du.hb * tile) / 2;
    const b = 900 - h;
    const y = 340 - du.ah * tile;
    const m = h + 0.46 * (b - h);
    return <svg width="94%" height={cao} viewBox="0 0 900 470" fontFamily={FONT} fontSize="29" fontWeight="700">
      <rect width="900" height="455" rx="25" fill="#afc6a3"/>
      <path d="M25 0h850q25 0 25 25v315H0V25Q0 0 25 0" fill="#194a61"/>
      {[65,145,225].map(row => <path key={row} d={`M38 ${row}q18 -9 36 0t36 0m550 20q18 -9 36 0t36 0`} fill="none" stroke="#77c6cc" strokeWidth="3" opacity=".5"/>)}
      <path d="M0 340h900" stroke="#efddad" strokeWidth="12"/>
      <path d={`M${h} ${y}V340h15v-15h-15`} fill="none" stroke="#bde3ef" strokeDasharray="7 5" strokeWidth="3"/>
      <path d={`M${m} 340H${b}`} stroke="#705c41" strokeWidth="12" fill="none"/>
      <path d={`M${h} ${y}L${m} 340H${b}`} pathLength="1" strokeDasharray="1" strokeDashoffset={1-ve} fill="none" stroke="#ffc66c" strokeWidth="8" strokeLinejoin="round"/>
      <VatThuc ten="thuyen" x={h} y={y-5} cao={66} mau="#fff" t={t} p={1}/>
      <g fill="#f4fbfc"><text x={h+45} y={y-10}>A</text><text x={h+10} y={(y+340)/2+12}>{du.ah.toLocaleString('vi')} km</text></g>
      {[h,m,b].map((x,i)=><circle key={i} cx={x} cy="340" r="8" fill="#182d32" stroke="#fff1bb" strokeWidth="3"/>)}
      <g fill="#132c30" textAnchor="middle"><text x={h} y="381">H</text><text x={m} y="381">Điểm cập bờ</text><text x={b} y="381">B</text>
        <path d={`M${h} 405v9H${b}v-9`} stroke="#365650" strokeWidth="2" fill="none"/>
        <text x={(h+b)/2} y="447">HB = {du.hb.toLocaleString('vi')} km</text></g>
    </svg>;
  }
  const cot = Math.ceil(Math.sqrt(du.tong * 1.5));
  const hang = Math.ceil(du.tong / cot);
  const o = Math.min(64, 690 / cot, 255 / hang);
  const w = cot * o;
  const l = (900-w)/2;
  const y = 340 - hang*o;
  return <svg width="94%" height={cao} viewBox="0 0 900 455" fontFamily={FONT} fontSize="30" fontWeight="700">
    <rect width="900" height="455" rx="24" fill="#203746"/>
    <path d="M0 357h900" stroke="#a6bab4" strokeWidth="8"/>
    <path d={`M${l-14} ${y-12}l30 -22h${w+28}l-30 22Z`} fill="#97afb4"/>
    <path d={`M${l+w+14} ${y-12}l30 -22v${352-y}l-30 32Z`} fill="#496473"/>
    <rect x={l-14} y={y-12} width={w+28} height={358-y} fill="#728c91"/>
    {Array.from({length:du.tong},(_,i)=>{
      const x=l+(i%cot)*o, top=y+Math.floor(i/cot)*o;
      const trong=du.trong !== null && i >= du.tong-du.trong;
      return <g key={i}><rect x={x+o*.12} y={top+o*.12} width={o*.76} height={o*.70} rx={2} fill={trong?'#1a3240':du.trong===null?'#b6d9de':'#ffd581'}/>
        <path d={`M${x+o*.5} ${top+o*.12}v${o*.70}m${-o*.42} 0h${o*.84}`} stroke="#445e65" strokeWidth={o*.06}/></g>;
    })}
    <text x="450" y="414" textAnchor="middle" fill="#f8ebce">{du.trong===null ? `${du.tong} căn hộ` : `${du.tong-du.trong} căn đã thuê · ${du.trong} căn trống`}</text>
  </svg>;
};
