import React from 'react';
import {FONT, SO_DEU} from '../theme';
import {Toan} from '../Toan';
import {emRa, kep01} from '../3d-vector/toan3d';

// BẢNG BIẾN THIÊN CHUẨN SGK VIỆT NAM dùng trực tiếp trong TangTheGiai (không phụ thuộc sân khấu cũ).
export const W_BBT = 900;
const COT_NHAN = 150;
const H1 = 92, H2 = 92, H3 = 210;
export const H_BBT = H1 + H2 + H3;
const VIEN = 'rgba(226,242,255,0.75)';

export type BangBienThienVao = {
  moc: string[];
  dau: string[];
  giaTri: string[];
  ham?: string;
  bien?: string;
  mocDong?: number[];
  noiDung?: string;
  t: number;
  ta: number;
};

export const BangBienThien: React.FC<BangBienThienVao> = ({moc: bbtMoc, dau: bbtDau, giaTri: bbtGiaTri, ham, bien, mocDong = [], noiDung = '', t, ta}) => {
  const n = Math.max(2, bbtMoc.length);
  const moc = bbtMoc.length >= 2 ? bbtMoc : ['', ''];
  const dau = Array.from({length: n - 1}, (_, i) => (bbtDau[i] || '').trim());
  const gt = Array.from({length: n}, (_, i) => (bbtGiaTri[i] ?? '').trim());
  const t2 = mocDong[0] !== undefined ? Math.max(ta + 0.3, mocDong[0]) : ta + 0.8;
  const t3 = mocDong[1] !== undefined ? Math.max(t2 + 0.3, mocDong[1]) : t2 + 1.2;
  const aKhung = emRa(kep01((t - ta) / 0.5));
  const a2 = kep01((t - t2) / 0.4);
  const a3 = kep01((t - t3) / 0.4);

  const x0 = COT_NHAN + 46;
  const x1 = W_BBT - 46;
  const X = (i: number) => x0 + ((x1 - x0) * i) / (n - 1);
  const cao = (i: number) => {
    const trai = i > 0 ? dau[i - 1] : '';
    const phai = i < n - 1 ? dau[i] : '';
    if (trai === '+' && (phai === '-' || phai === '−' || !phai)) return true;
    if ((trai === '-' || trai === '−') && (phai === '+' || !phai)) return false;
    if (!trai) return !(phai === '+');
    return trai === '+';
  };
  const yTren = H1 + H2 + 42;
  const yDuoi = H1 + H2 + H3 - 42;
  const yGT = (i: number) => (cao(i) ? yTren : yDuoi);
  const mauDau = (d: string) => (d === '+' ? '#3BF29A' : d === '-' || d === '−' ? '#FF7A7A' : '#ffffff');
  const chuDau = (d: string) => (d === '-' ? '−' : d);

  const o: React.CSSProperties = {position: 'absolute', transform: 'translate(-50%, -50%)', fontFamily: FONT, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', ...SO_DEU};
  return (
    <div style={{position: 'relative', width: W_BBT, opacity: aKhung}}>
      {noiDung ? (
        <div style={{display: 'flex', justifyContent: 'center', marginBottom: 18}}>
          <div style={{background: 'rgba(4,14,16,0.82)', border: '2px solid rgba(59,242,154,0.45)', borderRadius: 14, padding: '4px 18px'}}>
            <Toan tex={noiDung} size={40} color="#3BF29A" maxWidth={W_BBT - 60} />
          </div>
        </div>
      ) : null}
      <div style={{position: 'relative', width: W_BBT, height: H_BBT, borderRadius: 20, background: 'rgba(6,16,22,0.88)', boxShadow: '0 18px 48px rgba(0,0,0,0.5)'}}>
        <svg width={W_BBT} height={H_BBT} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs>
            <marker id="bbtMui" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
              <path d="M0 0 L12 6 L0 12 Z" fill="#ffffff" />
            </marker>
          </defs>
          <rect x={1.5} y={1.5} width={W_BBT - 3} height={H_BBT - 3} rx={18} fill="none" stroke={VIEN} strokeWidth={3} />
          <line x1={0} x2={W_BBT} y1={H1} y2={H1} stroke={VIEN} strokeWidth={2.5} />
          <line x1={0} x2={W_BBT} y1={H1 + H2} y2={H1 + H2} stroke={VIEN} strokeWidth={2.5} />
          <line x1={COT_NHAN} x2={COT_NHAN} y1={0} y2={H_BBT} stroke={VIEN} strokeWidth={2.5} />
          {dau.map((_, i) => {
            const p = emRa(kep01((t - t3 - 0.25 - i * 0.35) / 0.55));
            if (p <= 0) return null;
            const xa = X(i) + 52, xb = X(i + 1) - 52;
            const ya = yGT(i) + (cao(i) ? 26 : -26), yb = yGT(i + 1) + (cao(i + 1) ? 26 : -26);
            const dai = Math.hypot(xb - xa, yb - ya);
            return <line key={`m${i}`} x1={xa} y1={ya} x2={xb} y2={yb} stroke="#ffffff" strokeWidth={3.5} strokeLinecap="round" markerEnd={p > 0.92 ? 'url(#bbtMui)' : undefined} strokeDasharray={dai} strokeDashoffset={dai * (1 - p)} />;
          })}
        </svg>
        <span style={{...o, left: COT_NHAN / 2, top: H1 / 2}}><Toan tex={bien || 'x'} size={42} /></span>
        <span style={{...o, left: COT_NHAN / 2, top: H1 + H2 / 2, opacity: a2}}><Toan tex={`${ham || 'f'}'(${bien || 'x'})`} size={40} /></span>
        <span style={{...o, left: COT_NHAN / 2, top: H1 + H2 + H3 / 2, opacity: a3}}><Toan tex={`${ham || 'f'}(${bien || 'x'})`} size={40} /></span>
        {moc.map((m, i) => (
          <span key={`x${i}`} style={{...o, left: X(i), top: H1 / 2, opacity: kep01((t - ta - 0.15 - i * 0.12) / 0.3)}}><Toan tex={m} size={38} /></span>
        ))}
        {dau.map((d, i) => (
          <span key={`d${i}`} style={{...o, left: (X(i) + X(i + 1)) / 2, top: H1 + H2 / 2, fontSize: 52, fontWeight: 800, color: mauDau(d), opacity: kep01((t - t2 - i * 0.15) / 0.3)}}>{chuDau(d)}</span>
        ))}
        {moc.map((_, i) => (i > 0 && i < n - 1 ? (
          <span key={`z${i}`} style={{...o, left: X(i), top: H1 + H2 / 2, fontSize: 40, opacity: a2}}>0</span>
        ) : null))}
        {gt.map((g, i) => (g ? (
          <span key={`g${i}`} style={{...o, left: X(i), top: yGT(i), opacity: kep01((t - t3 - i * 0.35) / 0.3)}}>
            {g === '?' ? <span style={{fontSize: 46, fontWeight: 900, color: '#FFD54A'}}>?</span> : <Toan tex={g} size={38} color={i > 0 && i < n - 1 ? '#FFD54A' : '#ffffff'} />}
          </span>
        ) : null))}
      </div>
    </div>
  );
};
