// v96 — mảnh giao diện dùng chung của sân khấu 2D (thẩm mỹ v95: nền lưới tối, thẻ kính bo góc, nét sắc, không blur).
import React from 'react';
import {FONT, SO_DEU} from '../theme';
import {Toan} from '../Toan';
import {MAU_3DV, TenMau} from '../3d-vector/kieu';
import {em, kep} from './chung';

export const NEN_THE = '#151A23';
export const VIEN = 'rgba(255,255,255,0.10)';
export const CHU = '#E6EDF5';
export const MO = 'rgba(230,237,245,0.45)';
export const mau = (m?: TenMau | string) => MAU_3DV[(m || 'cyan') as TenMau] || MAU_3DV.cyan;
export const DUNG = '#2EE6A8';
export const SAI = '#FF5A6E';

// nhãn KaTeX đặt tại (x, y) theo neo; viền tối bằng text-shadow (không filter)
export const NhanTex: React.FC<{x: number; y: number; tex: string; mau?: string; co?: number; neo?: 'giua' | 'trai' | 'phai'; a?: number; dam?: number}> = ({x, y, tex, mau: m = CHU, co = 28, neo = 'giua', a = 1, dam}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity: a, whiteSpace: 'nowrap', textShadow: '0 0 6px #0E1014, 0 0 3px #0E1014',
    transform: `translate(${neo === 'giua' ? '-50%' : neo === 'phai' ? '-100%' : '0'}, -50%)`}}>
    <Toan tex={tex} size={co} color={m} style={dam ? {fontWeight: dam} : undefined} />
  </div>
);

// viên thuốc chứa nhãn KaTeX (chú giải nhóm, xác suất trên nhánh)
export const VienTex: React.FC<{tex: string; mau: string; co?: number; nen?: boolean; style?: React.CSSProperties; cham?: boolean}> = ({tex, mau: m, co = 26, nen = true, style, cham}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, height: co + 20, padding: '0 14px', borderRadius: (co + 20) / 2, whiteSpace: 'nowrap',
    background: nen ? 'rgba(14,16,20,0.88)' : 'transparent', border: `1.5px solid ${m}`, boxShadow: `0 0 14px ${m}22`, ...style}}>
    {cham ? <span style={{width: 14, height: 14, borderRadius: 7, background: m, flexShrink: 0}} /> : null}
    <Toan tex={tex} size={co} color={m} />
  </div>
);

// dải kết quả ở đáy sân khấu: biểu thức kiểm chứng / n(Ω) / P(A) + dấu ✓ / ✕
export const DongKetQua: React.FC<{x: number; y: number; w: number; h: number; tex: string; a: number; mau?: string; dau?: boolean | null; nhan?: number; co?: number}> = ({x, y, w, h, tex, a, mau: m = CHU, dau = null, nhan = 0, co = 42}) => {
  if (a <= 0.001 || !tex) return null;
  const vien = dau === true ? DUNG : dau === false ? SAI : 'rgba(255,255,255,0.14)';
  return (
    <div data-sk2d="ket_qua" style={{position: 'absolute', left: x, top: y, width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: kep(a * 1.4)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18, maxWidth: w, padding: '8px 26px', borderRadius: 22, background: 'rgba(14,17,23,0.94)',
        border: `${dau === null ? 1 : 2}px solid ${vien}`, boxShadow: dau === null ? 'none' : `0 0 ${18 + 14 * nhan}px ${vien}44`,
        transform: `translateY(${(1 - em(a)) * 14}px) scale(${1 + 0.03 * nhan})`}}>
        <Toan tex={tex} size={co} color={m} maxWidth={w - (dau === null ? 60 : 130)} />
        {dau === null ? null : (
          <span style={{width: 50, height: 50, borderRadius: 25, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: vien, color: '#0E1014',
            fontFamily: FONT, fontWeight: 900, fontSize: 32, transform: `scale(${0.6 + 0.4 * em(a * 1.3)})`}}>{dau ? '✓' : '✕'}</span>
        )}
      </div>
    </div>
  );
};

// thanh tiến độ mảnh của pha (luôn chạy -> sân khấu không bao giờ đứng hình)
export const ThanhTienDo: React.FC<{W: number; H: number; u: number; mau: string}> = ({W, H, u, mau: m}) => (
  <div style={{position: 'absolute', left: 60, width: W - 120, top: H - 8, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden'}}>
    <div style={{width: `${kep(u) * 100}%`, height: '100%', background: m, opacity: 0.55}} />
  </div>
);

export const So: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <span style={{fontFamily: FONT, ...SO_DEU, ...style}}>{children}</span>
);
