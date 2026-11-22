// v90 — TẦNG 1: viên thuốc "BƯỚC n · NHÃN" + tiêu đề lớn không chân. Đổi bước: chữ cũ mờ lên, chữ mới trượt vào.
import React from 'react';
import {CO_CHU, FONT} from '../theme';
import {chuanTieuDe, inHoaGiuToan} from '../chu';
import {emRa, kep01} from '../3d-vector/toan3d';
import {BuocGiai} from './kieu';
import {ChuTron} from './ChuTron';

const NOI = '#0E1014';

function Mot({b, so, mau, a, lech}: {b: BuocGiai; so: number; mau: string; a: number; lech: number}) {
  const tieuDe = chuanTieuDe(b.tieu_de || '');
  const co = tieuDe.length > 34 ? CO_CHU.tieuDe[2] : tieuDe.length > 24 ? CO_CHU.tieuDe[1] : CO_CHU.tieuDe[0];
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, opacity: a, transform: `translateY(${lech}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', height: 50, borderRadius: 25, border: `1.5px solid ${mau}`, background: `${mau}1A`, padding: '0 22px 0 6px', gap: 14, boxShadow: `0 0 22px ${mau}33`}}>
        <span data-kd-bo="1" style={{height: 38, padding: '0 14px', borderRadius: 19, background: mau, color: NOI, fontFamily: FONT, fontWeight: 900, fontSize: 24, display: 'flex', alignItems: 'center', letterSpacing: 0.5}}>BƯỚC {so}</span>
        <span style={{color: mau, fontFamily: FONT, fontWeight: 800, fontSize: 26, letterSpacing: 1.2, whiteSpace: 'nowrap'}}><ChuTron s={b.nhan || ''} co={26} mau={mau} hoa={inHoaGiuToan} /></span>
      </div>
      <div style={{color: '#F4F7FB', fontFamily: FONT, fontWeight: 900, fontSize: co, lineHeight: 1.08, textAlign: 'center', maxWidth: 980, letterSpacing: -0.5, textWrap: 'balance' as React.CSSProperties['textWrap']}}>
        <ChuTron s={tieuDe} co={co} mau="#F4F7FB" dam={900} />
      </div>
    </div>
  );
}

// Đổi bước NỐI TIẾP (không crossfade đè chữ): bước cũ mờ + trượt lên trong RA giây, rồi bước mới mới vào trong VAO giây.
export const RA_TIEU_DE = 6 / 30;
export const VAO_TIEU_DE = 8 / 30;

export const TangTieuDe: React.FC<{buoc: BuocGiai[]; i: number; t: number; mau: (b: BuocGiai) => string}> = ({buoc, i, t, mau}) => {
  if (i < 0) return null;
  const b = buoc[i];
  const truoc = i > 0 ? buoc[i - 1] : null;
  const dt = t - b.t;
  if (truoc && dt < RA_TIEU_DE) {
    const ra = kep01(dt / RA_TIEU_DE);
    return <Mot b={truoc} so={i} mau={mau(truoc)} a={1 - ra} lech={-16 * emRa(ra)} />;
  }
  const vao = i === 0 ? emRa(t / 0.4) : emRa((dt - RA_TIEU_DE) / VAO_TIEU_DE);
  return <Mot b={b} so={i + 1} mau={mau(b)} a={vao} lech={i === 0 ? 0 : 16 * (1 - vao)} />;
};
