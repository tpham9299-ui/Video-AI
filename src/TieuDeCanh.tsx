import React from 'react';
import {useCurrentFrame} from 'remotion';
import {easeOut, kep, popOut} from './sankhau/donghieu';
import {ChuNhanMau} from './sankhau/vat';
import {FONT} from './theme';

// Đầu mỗi cảnh (như video mẫu): nhãn cam dạng viên thuốc ("ĐỀ BÀI", "CÁI BẪY", "MẤU CHỐT"...) và một câu tiêu đề lớn
// chữ trắng đậm, cụm từ khóa tô cam. Vào bằng hiệu ứng bật + mờ nhòe chuyển động.
export const NHAN_CANH: [RegExp, string][] = [
  [/mo_dau|hook|cau_hoi/, 'CÂU HỎI'],
  [/de_bai/, 'ĐỀ BÀI'],
  [/y_do/, 'Ý ĐỒ'],
  [/thu_nho/, 'THỬ NHỎ'],
  [/diem_chot|y_tuong/, 'MẤU CHỐT'],
  [/bay/, 'CÁI BẪY'],
  [/thuc_te|doi_song/, 'NGOÀI ĐỜI'],
  [/tinh|giai/, 'TÍNH NHANH'],
  [/dap_an|ket_qua/, 'ĐÁP ÁN'],
  [/bai_hoc|ket_luan|chot/, 'GHI NHỚ'],
];
export const nhanCanh = (loai: string, nhan: string) => {
  if (nhan) return nhan.toUpperCase();
  const l = (loai || '').toLowerCase();
  for (const [re, s] of NHAN_CANH) if (re.test(l)) return s;
  return '';
};

export const TieuDeCanh: React.FC<{nhan: string; chu: string; tuKhoa: string; tre?: number}> = ({nhan, chu, tuKhoa, tre = 0}) => {
  const f = useCurrentFrame() - tre;
  const a = kep(f / 9);
  const b = kep((f - 4) / 11);
  const co = chu.length > 40 ? 54 : chu.length > 26 ? 62 : 70;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
      {nhan ? (
        <div style={{transform: `scale(${popOut(a, 2.2)})`, opacity: kep(a * 2), background: 'linear-gradient(180deg, #FF8A3D, #F0641E)', color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 30, letterSpacing: 1, padding: '6px 22px', borderRadius: 30, boxShadow: '0 0 18px rgba(255,122,47,0.55)'}}>
          {nhan}
        </div>
      ) : null}
      {chu ? (
        <div style={{maxWidth: 960, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: co, lineHeight: 1.15, color: '#fff', textShadow: '0 4px 18px rgba(0,0,0,0.7)', opacity: kep(b * 2), transform: `translateY(${(1 - easeOut(b)) * 26}px) scale(${0.92 + 0.08 * easeOut(b)})`, filter: b < 1 ? `blur(${(1 - b) * 10}px)` : undefined}}>
          <ChuNhanMau chu={chu} tuKhoa={tuKhoa} mau="#FF8A3D" />
        </div>
      ) : null}
    </div>
  );
};
