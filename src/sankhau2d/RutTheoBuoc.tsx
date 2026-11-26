import React from 'react';
import {interpolate, Easing} from 'remotion';
import type {RutMauVao, Pha2D} from './kieu';

const ink = '#ECF4FB', red = '#F07174', blue = '#44BFE2', gold = '#F5C451', slate = '#23394A';
const mix = (t: number, a: number, b: number) => interpolate(t, [0, .65], [a, b],
  {easing: Easing.inOut(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const center = (i: number, n: number, gap: number) => 410 + (i - (n - 1) / 2) * gap;

function layout(sk: RutMauVao, ph: Pha2D, cycle: number) {
  const n = sk.phan_tu.length, people = sk.mode === 'phan_bu', turns = sk.mode === 'lan_luot';
  const columns = Math.ceil(n / 2), gap = Math.min(114, 680 / columns);
  const slots = turns ? n : sk.k;
  const selected = [...(ph.chon || [])];
  // Luân phiên trong nhóm để giữ đúng số bi từng màu.
  if (people && ph.ten === 'loai' && cycle === 0) selected.length = 0;
  if (ph.ten === 'hien' && cycle > 0) selected.splice(0,selected.length,...Array.from({length: sk.k},(_,i)=>i));
  if (!turns && ph.ten !== 'dieu_kien') {
    const split = people ? 2 : sk.do || n;
    selected.forEach((v, j) => {
      const start = v < split ? 0 : split, size = v < split ? split : n-split;
      selected[j] = start + (v-start+cycle) % size;
    });
  } else if (selected.length > 1 && cycle % 2 && !(turns && ph.ten === 'dieu_kien')) {
    const other = turns ? Math.max(1, sk.k-2) : 1;
    [selected[0], selected[other]] = [selected[other], selected[0]];
  }
  if (turns && ph.ten === 'dieu_kien' && cycle % 2 && sk.k > 1) {
    [selected[sk.k-1], selected[sk.k-2]] = [selected[sk.k-2], selected[sk.k-1]];
  }
  return sk.phan_tu.map((_, i) => {
    const slot = selected.indexOf(i), exclude = people && ['loai','dem'].includes(ph.ten) && i < 2;
    const home = (ph.ten === 'hien' && cycle === 0) || slot < 0;
    const x = home ? center(i % columns, columns, gap) + (exclude ? -17 : 0) : center(slot, slots, Math.min(96, 710/slots));
    const y = home ? 186 + Math.floor(i/columns)*98 : 444;
    const dim = ph.ten === 'loai' ? exclude : home && ph.ten !== 'hien' && !turns;
    return {x, y, opacity: dim ? .28 : 1, exclude};
  });
}

export const RutTheoBuoc: React.FC<{sk: RutMauVao; t: number; W: number; H: number; final?: boolean}> = ({sk,t,W,H,final}) => {
  const index = Math.max(0, sk.pha.filter(p => p.t <= t).length-1);
  const ph = sk.pha[index], dt = Math.max(0,t-ph.t), period = 2.6;
  const cycle = Math.floor(dt/period), local = dt % period;
  const previous = sk.pha[Math.max(0,index-1)];
  const from = cycle ? layout(sk, ph, cycle-1) : layout(sk, previous, Math.max(0, Math.floor((ph.t-previous.t-.001)/period)));
  const to = layout(sk, ph, cycle);
  const n = sk.phan_tu.length, turns = sk.mode === 'lan_luot', people = sk.mode === 'phan_bu';
  const chart = final || ph.ten === 'ti_le';
  const slots = turns ? n : sk.k, pitch = Math.min(96,710/slots);
  const reveal = final || t >= (sk.cong_bo || 0);
  const ratio = (sk.n_a || 0)/sk.n_omega;
  const fractionWidth = 650*ratio*mix(final ? 1 : dt,0,1);
  const condition = turns && ph.ten === 'dieu_kien', lock = turns && ph.ten === 'khoa';
  const warning = condition && cycle % 2 === 1;
  const tray = ph.ten !== 'hien' || cycle > 0;
  const heading = chart ? 'Tỉ lệ trong không gian mẫu' : people ? 'Nhóm học sinh' : turns ? 'Rút lần lượt' : 'Hộp bi';
  const note = warning ? 'Dừng quá sớm' : lock ? 'L'+sk.k+' = đỏ thứ '+sk.do : ph.kl || (ph.ten === 'dieu_kien' && !turns ? 'Đổi thứ tự vẫn cùng một nhóm' : turns ? 'Các lượt rút' : 'Chọn '+sk.k+' / '+n);
  return <svg data-xs-stage={chart ? 'ti_le' : ph.ten} width={W} height={H} viewBox="0 0 820 648" fill={ink} textAnchor="middle" fontSize={30} fontWeight={700}>
    <text x={410} y={88} fontSize={38}>{heading}</text>
    {chart ? <g opacity={final ? 1 : mix(dt,.15,1)}>
      <text x={410} y={215}>n(Ω) = {sk.n_omega}</text>
      <rect x={85} y={262} width={650} height={84} rx={10} fill={slate}/>
      <rect data-xs-object="A" x={85} y={262} width={fractionWidth} height={84} rx={10} fill={gold}/>
      {people && <g>
        <defs><pattern id="phan-loai" width={16} height={16} patternUnits="userSpaceOnUse"><path d="M-4 4L4 -4M0 16L16 0M12 20L20 12" stroke={ink} opacity={.17} strokeWidth={3}/></pattern></defs>
        <rect x={85+fractionWidth} y={262} width={650-fractionWidth} height={84} fill="url(#phan-loai)"/>
        <text x={85+(650+fractionWidth)/2} y={314}>{reveal ? sk.p_doi : 'Ā'}</text>
      </g>}
      <text x={85+fractionWidth/2} y={314} fill="#15212A">{reveal ? sk.p : 'A'}</text>
      <text x={410} y={442}>n(A) = {sk.n_a}</text>
      {reveal && <text x={410} y={524} fill={gold}>P(A) = {sk.n_a} / {sk.n_omega} = {sk.p}</text>}
    </g> : <g>
      <rect x={42} y={125} width={736} height={226} rx={34} fill={slate} stroke="#587789" strokeWidth={3}/>
      {tray && <g>
        {Array.from({length: slots}, (_, j) => <g key={j}>
          <rect x={center(j,slots,pitch)-pitch*.45} y={398} width={pitch*.9} height={91} rx={12}
            fill={slate} stroke={lock && j === sk.k-1 ? gold : '#587789'} strokeWidth={lock && j === sk.k-1 ? 6 : 2}/>
          {turns && <text x={center(j,slots,pitch)} y={525} fontSize={24}>{'L'+(j+1)}</text>}
        </g>)}
        {lock && <g fill="none" stroke={gold} strokeWidth={3}>
          <rect x={center(0,slots,pitch)-pitch*.49} y={389} width={pitch*(sk.k-1)} height={110} rx={15}/>
          <path d={`M ${center(sk.k-1,slots,pitch)-8} 381 v-9 a8 8 0 0 1 16 0 v9`}/>
          <rect x={center(sk.k-1,slots,pitch)-13} y={378} width={26} height={18} rx={4} fill={gold}/>
        </g>}
      </g>}
      {to.map((v,i) => {
        const item = sk.phan_tu[i], a = from[i];
        const lag = turns && ph.ten === 'mau' && cycle === 0 ? .18 * Math.max(0,(ph.chon || []).indexOf(i)) : 0;
        const x = mix(local-lag,a.x,v.x);
        const returning = ph.ten === 'truong_hop' && previous.ten === 'truong_hop' && !cycle && a.y === 444 && v.y === 444;
        const lift = returning ? 85*Math.sin(Math.PI*mix(local,0,1)) : 0;
        const y = mix(local-lag,a.y,v.y) - lift;
        const size = Math.min(37, 305/Math.ceil(n/2), pitch*.36);
        const color = people ? (i<2 ? gold : blue) : item.nhom ? blue : red;
        return <g key={i} data-xs-object={i} transform={`translate(${x} ${y})`} opacity={mix(local,a.opacity,v.opacity)}>
          {ph.ten === 'mau' && i === (ph.chon || [])[Math.floor(dt*2)%sk.k] && <circle r={size+5} fill="none" stroke={gold} strokeWidth={3}/>}
          {people ? <><rect x={-size} y={-size} width={2*size} height={2*size} rx={12} fill={color}/>
            <text y={8} fontSize={Math.min(25,size*.72)} fill="#102431">{item.nhan}</text>
            {v.exclude && <path d={`M ${-size} ${-size} l ${2*size} ${2*size}`} stroke={ink} strokeWidth={5}/>}</> :
            <><circle r={size} fill={color}/><circle cx={-size*.29} cy={-size*.32} r={size*.16} fill="#FFFFFF" opacity={.65}/>
            <text y={7} fontSize={18} fill="#132530">{i+1}</text></>}
        </g>;
      })}
      {tray && <text x={410} y={574} fill={warning ? red : gold}>{note}</text>}
      {people && ph.ten === 'loai' && <g><rect x={110} y={599} width={600} height={16} fill={slate}/><rect data-xs-object="phan-bu" x={110} y={599} width={600*ratio*mix(dt,0,1)} height={16} fill={blue}/></g>}
      {ph.ten === 'mau' && <text x={410} y={618} fontSize={25}>n(Ω) = {sk.n_omega}</text>}
      {lock && <text x={410} y={618} fontSize={25}>C({sk.k-1},{(sk.do || 1)-1}) = {sk.n_a}</text>}
    </g>}
  </svg>;
};
