import React from 'react';
import {useCurrentFrame} from 'remotion';
import {kep, popOut} from './sankhau/donghieu';
import {FONT_DAM} from './theme';

// Thanh các bước của bài giảng (như video mẫu "HÌNH TRÒN ✓ · MỘT ĐIỂM ✓ · ĐƯỜNG THẲNG"): bước đã qua xanh có dấu tích,
// bước hiện tại màu cam bật lên và phát sáng, bước sau còn mờ. Giúp người xem luôn biết bài đang ở đâu.
// QUY TRÌNH CỐ ĐỊNH 6 PHẦN cho MỌI video: đề bài -> mô phỏng -> lỗi sai -> giải -> thử lại -> chốt kiến thức
export const PHA: [RegExp, string][] = [
  [/mo_dau|hook|cau_hoi|de_bai/, 'ĐỀ BÀI'],
  [/mo_hinh|mo_phong|y_do|thu_nho|phan_tich|thuc_te|doi_song|van_dung/, 'MÔ PHỎNG'],
  [/bay|loi_sai/, 'LỖI SAI'],
  [/nhac_lai|kien_thuc|ly_thuyet|diem_chot|y_tuong|tinh|giai|dap_an|ket_qua/, 'GIẢI'],
  [/kiem_tra|thu_lai/, 'THỬ LẠI'],
  [/bai_hoc|ket_luan|chot|lien_he/, 'CHỐT'],
];
export const SAU_PHA = PHA.map((p) => p[1]);
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
  const gon = cacBuoc.length > 5; // nhiều bước: bước khác chỉ là vòng tròn ✓/số, bước hiện tại hiện đủ chữ
  return (
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'nowrap'}}>
      {cacBuoc.map((b, i) => {
        const xong = i < iNay;
        const nay = i === iNay;
        const tich = xong && moi && i === iNay - 1 ? kep((f - 4) / 8) : 1;
        const tron = gon && !nay;
        return (
          <React.Fragment key={b}>
            {i > 0 ? <div style={{width: gon ? 14 : 18, height: 3, borderRadius: 2, background: i <= iNay ? '#3BF29A' : 'rgba(255,255,255,0.18)'}} /> : null}
            <div style={{
              fontFamily: FONT_DAM, fontWeight: 900, fontSize: tron ? 22 : 25, letterSpacing: 0.5, whiteSpace: 'nowrap',
              width: tron ? 42 : undefined, height: tron ? 42 : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: tron ? 0 : '7px 16px', borderRadius: 30,
              background: nay ? 'linear-gradient(180deg, #FF9D52, #EA5B16)' : xong ? 'linear-gradient(180deg, #4AF7A5, #2ED983)' : 'rgba(255,255,255,0.08)',
              color: nay ? '#fff' : xong ? '#062019' : 'rgba(255,255,255,0.55)',
              border: nay ? '1.5px solid rgba(255,255,255,0.3)' : xong ? '1.5px solid rgba(255,255,255,0.22)' : '2px solid rgba(255,255,255,0.16)',
              boxShadow: nay ? '0 4px 0 #9a3a0c, inset 0 1px 0 rgba(255,255,255,0.38), 0 0 22px rgba(255,122,47,0.55)' : xong ? '0 3px 0 #0f7a52, inset 0 1px 0 rgba(255,255,255,0.32)' : 'none',
              transform: nay ? `scale(${1.06 * popOut(a, 2.2)})` : 'none',
            }}>
              {xong ? <span style={{display: 'inline-block', transform: `scale(${popOut(tich, 2.5)})`, marginRight: tron ? 0 : 5}}>✓</span> : null}
              {tron ? (xong ? '' : i + 1) : (gon ? `${i + 1} · ${b}` : b)}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
