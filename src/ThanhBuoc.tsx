import React from 'react';
import {useCurrentFrame} from 'remotion';
import {kep, popOut} from './sankhau/donghieu';
import {FONT_DAM} from './theme';

// Thanh các bước của bài giảng (như video mẫu "HÌNH TRÒN ✓ · MỘT ĐIỂM ✓ · ĐƯỜNG THẲNG"): bước đã qua xanh có dấu tích,
// bước hiện tại màu cam bật lên và phát sáng, bước sau còn mờ. Giúp người xem luôn biết bài đang ở đâu.
export const PHA: [RegExp, string][] = [
  [/mo_dau|hook|cau_hoi|de_bai/, 'ĐỀ BÀI'],
  [/y_do|thu_nho|phan_tich/, 'PHÂN TÍCH'],
  [/bay/, 'CÁI BẪY'],
  [/diem_chot|y_tuong/, 'MẤU CHỐT'],
  [/tinh|giai/, 'TÍNH'],
  [/dap_an|ket_qua/, 'ĐÁP ÁN'],
  [/bai_hoc|ket_luan|chot/, 'GHI NHỚ'],
];
export const phaCua = (loai: string) => {
  const l = (loai || '').toLowerCase();
  for (const [re, s] of PHA) if (re.test(l)) return s;
  return '';
};
// danh sách các pha có trong video, theo thứ tự xuất hiện
export const cacPha = (dsLoai: string[]) => {
  const kq: string[] = [];
  dsLoai.forEach((l) => {
    const p = phaCua(l);
    if (p && !kq.includes(p)) kq.push(p);
  });
  return kq;
};

export const ThanhBuoc: React.FC<{cacBuoc: string[]; hienTai: string; moi: boolean}> = ({cacBuoc, hienTai, moi}) => {
  const f = useCurrentFrame();
  const iNay = cacBuoc.indexOf(hienTai);
  const a = moi ? kep(f / 10) : 1; // bước mới bắt đầu thì bật lên
  const nhieu = cacBuoc.length > 5;
  return (
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: nhieu ? 4 : 10, flexWrap: 'nowrap'}}>
      {cacBuoc.map((b, i) => {
        const xong = i < iNay;
        const nay = i === iNay;
        const tich = xong && moi && i === iNay - 1 ? kep((f - 4) / 8) : 1;
        return (
          <React.Fragment key={b}>
            {i > 0 ? <div style={{width: nhieu ? 6 : 18, height: 3, borderRadius: 2, background: i <= iNay ? '#3BF29A' : 'rgba(255,255,255,0.18)'}} /> : null}
            <div style={{
              fontFamily: FONT_DAM, fontWeight: 900, fontSize: nhieu ? 21 : 25, letterSpacing: 0.5, whiteSpace: 'nowrap',
              padding: nhieu ? '6px 9px' : '7px 15px', borderRadius: 30,
              background: nay ? 'linear-gradient(180deg, #FF9A4D, #F0601A)' : xong ? '#3BF29A' : 'rgba(255,255,255,0.08)',
              color: nay ? '#fff' : xong ? '#062019' : 'rgba(255,255,255,0.45)',
              border: nay || xong ? 'none' : '2px solid rgba(255,255,255,0.14)',
              boxShadow: nay ? '0 4px 0 #9a3a0c, 0 0 22px rgba(255,122,47,0.6)' : xong ? '0 3px 0 #0f7a52' : 'none',
              transform: nay ? `scale(${1.08 * popOut(a, 2.2)})` : 'none',
            }}>
              {xong ? <span style={{display: 'inline-block', transform: `scale(${popOut(tich, 2.5)})`, marginRight: 5}}>✓</span> : null}
              {b}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
