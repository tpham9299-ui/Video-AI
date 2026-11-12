import React from 'react';
import {useCurrentFrame} from 'remotion';
import {easeOut, kep, popOut} from './sankhau/donghieu';
import {expoOut} from './sankhau/chuyendong';
import {BONG_CHU, FONT_DAM, vienChu} from './theme';

// Đầu mỗi cảnh: nhãn cam dạng viên thuốc ("ĐỀ BÀI", "CÁI BẪY"...) + tiêu đề rất đậm (Montserrat Black, kiểu sticker:
// viền tối + bóng khối). Từng từ lướt lên kèm nhòe chuyển động (motion graphic), sau đó một nét bút kiểu Manim
// (Create/Underline) vẽ gạch chân lượn sóng dưới cụm từ khóa và một vệt sáng quét qua.
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

const CAM = '#FF8A3D';

// nhãn viên thuốc: bật lên + vệt sáng quét ngang
export const VienThuoc: React.FC<{chu: string; f: number}> = ({chu, f}) => {
  const a = kep(f / 9);
  const quet = kep((f - 8) / 14);
  return (
    <div style={{position: 'relative', overflow: 'hidden', transform: `scale(${popOut(a, 2.2)}) rotate(${(1 - a) * -6}deg)`, opacity: kep(a * 2), background: 'linear-gradient(180deg, #FF9A4D, #F0601A)', color: '#fff', fontFamily: FONT_DAM, fontWeight: 900, fontSize: 32, letterSpacing: 1.5, padding: '6px 24px', borderRadius: 30, boxShadow: '0 4px 0 #9a3a0c, 0 0 22px rgba(255,122,47,0.55)'}}>
      {chu}
      <span style={{position: 'absolute', top: 0, bottom: 0, width: 40, left: `${-20 + quet * 130}%`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)', transform: 'skewX(-20deg)', opacity: quet < 1 ? 1 : 0}} />
    </div>
  );
};

export const TieuDeCanh: React.FC<{nhan: string; chu: string; tuKhoa: string; tre?: number; inHoa?: boolean; dau?: React.ReactNode}> = ({nhan, chu, tuKhoa, tre = 0, inHoa = false, dau}) => {
  const f = useCurrentFrame() - tre;
  const co = (chu.length > 40 ? 58 : chu.length > 26 ? 66 : 76) * (inHoa ? 0.86 : 1);
  // vị trí cụm từ khóa trong câu để tô cam đúng các từ đó
  const iKhoa = tuKhoa ? chu.toLowerCase().indexOf(tuKhoa.toLowerCase()) : -1;
  const tu = chu.split(/(\s+)/);
  let viTri = 0;
  const dsTu = tu.map((w) => {
    const bd = viTri;
    viTri += w.length;
    return {w, khoa: iKhoa >= 0 && bd < iKhoa + tuKhoa.length && bd + w.length > iKhoa && w.trim() !== ''};
  });
  let thuTu = 0;
  const gach = kep((f - 14 - dsTu.filter((x) => x.w.trim()).length * 2) / 14);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
      {dau ? dau : nhan ? <VienThuoc chu={nhan} f={f} /> : null}
      {chu ? (
        <div style={{maxWidth: 980, textAlign: 'center', fontFamily: FONT_DAM, fontWeight: 900, fontSize: co, lineHeight: 1.12, color: '#fff', letterSpacing: inHoa ? 0 : -0.5, textTransform: inHoa ? 'uppercase' : 'none'}}>
          {dsTu.map((x, i) => {
            if (!x.w.trim()) return <span key={i}> </span>;
            const k = thuTu++;
            const p = expoOut(kep((f - 3 - k * 2) / 12));
            return (
              <span key={i} style={{position: 'relative', display: 'inline-block', color: x.khoa ? CAM : '#fff', WebkitTextStroke: vienChu(co), paintOrder: 'stroke fill', textShadow: BONG_CHU,
                opacity: kep(p * 2), transform: `translateY(${(1 - p) * 70}px) scale(${0.85 + 0.15 * p})`, filter: p < 0.98 ? `blur(${(1 - p) * 8}px)` : undefined}}>
                {x.w}
                {x.khoa ? (
                  <svg style={{position: 'absolute', left: -6, right: -6, bottom: -co * 0.2, width: 'calc(100% + 12px)', height: co * 0.32, overflow: 'visible'}} viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M2 12 C 20 4, 35 18, 52 10 S 85 4, 98 11" stroke={CAM} strokeWidth={5} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeOut(gach)} vectorEffect="non-scaling-stroke" style={{filter: `drop-shadow(0 0 6px ${CAM})`}} />
                  </svg>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
