// v90 — TẦNG 1: viên thuốc "BƯỚC n · NHÃN" + tiêu đề lớn không chân. Đổi bước: chữ cũ mờ lên, chữ mới trượt vào.
import React from 'react';
import {CO_CHU, FONT} from '../theme';
import {chuanTieuDe, inHoaGiuToan} from '../chu';
import {emRa, kep01} from '../3d-vector/toan3d';
import {BuocGiai} from './kieu';
import {ChuTron} from './ChuTron';
import {nhanPhuBuoc} from './nhan_buoc';

const NOI = '#0E1014';

function Mot({b, so, tong, mau, a, lech}: {b: BuocGiai; so: number; tong: number; mau: string; a: number; lech: number}) {
  const tieuDe = chuanTieuDe(b.tieu_de || '');
  // v99.2: nhãn phụ không lặp "BƯỚC n" của viên thuốc (kịch bản cũ ghi nhan = "Bước 1"); rỗng -> chỉ còn viên thuốc
  const nhan = nhanPhuBuoc(b.nhan, so - 1, tong);
  // Cố định căn từ trên xuống (flex-start + paddingTop cố định) để khoảng cách eyebrow Story Math -> pill BƯỚC n -> tiêu đề luôn >= 14 px,
  // tuyệt đối không bị đẩy tràn ngược lên trên khi tiêu đề bước dài hoặc xuống 2 dòng.
  const tranCo = tieuDe.length > 32 ? 40 : tieuDe.length > 22 ? 44 : Math.min(54, CO_CHU.tieuDe[0]);
  const co = Math.max(32, Math.min(tranCo, Math.floor(1360 / Math.max(1, tieuDe.length * 0.62))));
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 16, gap: 14, boxSizing: 'border-box', opacity: a, transform: `translateY(${lech}px)`}}>
      <div data-va-cham="pill_buoc" style={{display: 'flex', alignItems: 'center', height: 46, flexShrink: 0, borderRadius: 23, border: `1.5px solid ${mau}`, background: `linear-gradient(180deg, ${mau}2E, rgba(12,14,20,0.62))`, padding: nhan ? '0 20px 0 6px' : '0 6px', gap: 12,
        boxShadow: `0 0 22px ${mau}33, inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.45)`}}>
        <span data-kd-bo="1" style={{height: 36, padding: '0 14px', borderRadius: 18, background: mau, color: NOI, fontFamily: FONT, fontWeight: 900, fontSize: 23, display: 'flex', alignItems: 'center', letterSpacing: 0.5}}>BƯỚC {so}</span>
        {nhan ? <span style={{color: mau, fontFamily: FONT, fontWeight: 800, fontSize: 25, letterSpacing: 1.1, whiteSpace: 'nowrap'}}><ChuTron s={nhan} co={25} mau={mau} hoa={inHoaGiuToan} /></span> : null}
      </div>
      <div data-va-cham="tieu_de_buoc" style={{color: '#F4F7FB', fontFamily: FONT, fontWeight: 900, fontSize: co, lineHeight: 1.08, textAlign: 'center', maxWidth: 820, letterSpacing: -0.5, textWrap: 'balance' as React.CSSProperties['textWrap']}}>
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
    return <Mot b={truoc} so={i} tong={buoc.length} mau={mau(truoc)} a={1 - ra} lech={-16 * emRa(ra)} />;
  }
  const vao = i === 0 ? emRa(t / 0.4) : emRa((dt - RA_TIEU_DE) / VAO_TIEU_DE);
  return <Mot b={b} so={i + 1} tong={buoc.length} mau={mau(b)} a={vao} lech={i === 0 ? 0 : 16 * (1 - vao)} />;
};
