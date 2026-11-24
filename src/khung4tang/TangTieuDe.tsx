// v90 — TẦNG 1: viên thuốc "BƯỚC n · NHÃN" + tiêu đề lớn không chân. Đổi bước: chữ cũ mờ lên, chữ mới trượt vào.
import React from 'react';
import {CO_CHU, FONT} from '../theme';
import {chuanTieuDe, inHoaGiuToan, texSangChu} from '../chu';
import {emRa, kep01} from '../3d-vector/toan3d';
import {BuocGiai} from './kieu';
import {ChuTron} from './ChuTron';
import {nhanPhuBuoc} from './nhan_buoc';
import {RONG_ND} from './vung';

const NOI = '#0E1014';

// v99.3: auto-fit cỡ chữ cho viên thuốc nhãn BƯỚC và tiêu đề bước theo độ dài hiển thị thực (đã quy đổi ký hiệu TeX -> chữ)
export function coNhanBuoc(nhan: string, rongToiDa = RONG_ND - 210): number {
  const n = Math.max(1, texSangChu(nhan || '').length);
  return Math.max(18, Math.min(26, Math.floor(rongToiDa / (n * 0.68))));
}

export function coTieuDeBuoc(tieuDe: string, rongToiDa = RONG_ND - 32): number {
  const n = Math.max(1, texSangChu(tieuDe || '').length);
  const max0 = Math.min(64, CO_CHU.tieuDe[0]);
  // <= 1 dòng hoặc tối đa 2 dòng cân đối trong T1 (cao 186 px, trừ viên thuốc 52 px + đệm an toàn)
  const motDong = Math.floor(rongToiDa / (n * 0.62));
  if (motDong >= 52) return Math.min(max0, motDong);
  const haiDong = Math.floor((rongToiDa * 1.82) / (n * 0.62));
  return Math.max(26, Math.min(52, haiDong));
}

function Mot({b, so, tong, mau, a, lech}: {b: BuocGiai; so: number; tong: number; mau: string; a: number; lech: number}) {
  const tieuDe = chuanTieuDe(b.tieu_de || '');
  // v99.2: nhãn phụ không lặp "BƯỚC n" của viên thuốc (kịch bản cũ ghi nhan = "Bước 1"); rỗng -> chỉ còn viên thuốc
  const nhan = nhanPhuBuoc(b.nhan, so - 1, tong);
  const coNhan = coNhanBuoc(nhan);
  const co = coTieuDeBuoc(tieuDe);
  return (
    <div style={{position: 'absolute', inset: 0, padding: '8px 16px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: a, transform: `translateY(${lech}px)`, overflow: 'visible'}}>
      <div style={{display: 'inline-flex', alignItems: 'center', minHeight: 50, maxWidth: RONG_ND - 16, borderRadius: 26, border: `1.5px solid ${mau}`, background: `${mau}1A`, padding: nhan ? '5px 24px 5px 8px' : '5px 10px', gap: 14, boxShadow: `0 0 22px ${mau}33`, overflow: 'visible'}}>
        <span data-kd-bo="1" style={{minHeight: 38, padding: '2px 16px', borderRadius: 19, background: mau, color: NOI, fontFamily: FONT, fontWeight: 900, fontSize: 23, display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap', letterSpacing: 0.5}}>BƯỚC {so}</span>
        {nhan ? <span style={{color: mau, fontFamily: FONT, fontWeight: 800, fontSize: coNhan, lineHeight: 1.18, padding: '0 4px', letterSpacing: 1.0, whiteSpace: 'nowrap', overflow: 'visible'}}><ChuTron s={nhan} co={coNhan} mau={mau} hoa={inHoaGiuToan} /></span> : null}
      </div>
      <div style={{color: '#F4F7FB', fontFamily: FONT, fontWeight: 900, fontSize: co, lineHeight: 1.12, padding: '2px 12px', textAlign: 'center', maxWidth: RONG_ND - 24, letterSpacing: -0.4, overflow: 'visible', textWrap: 'balance' as React.CSSProperties['textWrap']}}>
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
