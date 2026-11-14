import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {expoOut} from './sankhau/chuyendong';
import {kep, popOut} from './sankhau/donghieu';
import {FONT_DAM, GIAO_DIEN} from './theme';
import {Toan} from './Toan';
import {coTex, texSangChu} from './chu';

// THẺ ĐỀ BÀI (cố định ở phần đầu MỌI video): người xem phải biết rõ đề cho gì và cần tìm gì trước khi vào mô phỏng.
// "ĐỀ CHO" hiện từng dữ kiện theo nhịp lời đọc, "CẦN TÌM" bật ra cuối cùng trong khung màu nhấn và thở nhẹ.
export type DeBai = {cho: string[]; tim: string};

export const coTheDe = (d: DeBai | null | undefined) => !!d && (d.cho.length > 0 || !!d.tim);

// cỡ chữ + chiều cao ước tính (Canh dùng để chừa chỗ cho thẻ, sân khấu thu gọn tương ứng)
export function boCucTheDe(d: DeBai, rong = 960, caoToiDa = 640) {
  // cỡ chữ lớn nhất mà thẻ vẫn VỪA chỗ trống (không tràn xuống phụ đề); dòng dài tự xuống dòng
  const dong = (s: string, co: number) => Math.max(1, Math.ceil((texSangChu(s).length * 0.56 * co) / (rong - 140)));
  const caoVoi = (co: number) => 46 + 24 + d.cho.reduce((a, s) => a + dong(s, co) * co * 1.25 + 10, 0) + (d.tim ? 34 + dong(d.tim, co * 1.05) * co * 1.05 * 1.3 + 40 : 0) + 30;
  let co = 48;
  while (co > 30 && caoVoi(co) > caoToiDa) co -= 2;
  return {co, cao: Math.min(caoToiDa, caoVoi(co))};
}

const Dong: React.FC<{s: string; co: number; mau: string; mx: number}> = ({s, co, mau, mx}) =>
  coTex(s) ? <Toan tex={s} size={co} color={mau} maxWidth={mx} /> : <span style={{fontSize: co, color: mau}}>{s}</span>;

export const TheDeBai: React.FC<{de: DeBai; moc: number[]; giuNguyen?: boolean; rong?: number; caoToiDa?: number}> = ({de, moc, giuNguyen, rong = 960, caoToiDa = 640}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const nhan = GIAO_DIEN.nhan || '#3BF29A';
  const {co} = boCucTheDe(de, rong, caoToiDa);
  const hien = (i: number) => (giuNguyen ? 1 : expoOut(kep((t - (moc[i] ?? 0.3 + i * 0.7)) / 0.45)));
  const aThe = giuNguyen ? 1 : expoOut(kep((t - 0.15) / 0.4));
  const iTim = de.cho.length;
  const aTim = hien(iTim);
  return (
    <div style={{width: rong, boxSizing: 'border-box', borderRadius: 30, padding: '24px 34px 26px', background: 'linear-gradient(160deg, rgba(14,36,40,0.95), rgba(5,14,18,0.95))',
      border: `3px solid ${nhan}99`, boxShadow: `0 0 30px ${nhan}33, 0 20px 50px rgba(0,0,0,0.5)`, fontFamily: FONT_DAM, fontWeight: 800, color: '#fff', opacity: aThe,
      transform: `translateY(${(1 - aThe) * 30}px) scale(${0.96 + 0.04 * aThe})`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12}}>
        <span style={{fontWeight: 900, fontSize: 30, letterSpacing: 3, color: '#06231a', background: nhan, borderRadius: 10, padding: '2px 16px', boxShadow: `0 0 14px ${nhan}`}}>ĐỀ CHO</span>
        <span style={{flex: 1, height: 2, background: `linear-gradient(90deg, ${nhan}aa, transparent)`}} />
      </div>
      {de.cho.map((s, i) => {
        const a = hien(i);
        return (
          <div key={i} style={{display: 'flex', alignItems: 'flex-start', gap: 16, margin: '6px 0', opacity: kep(a * 1.6), transform: `translateX(${(1 - a) * -50}px)`, filter: a < 0.98 ? `blur(${(1 - a) * 6}px)` : undefined, lineHeight: 1.25}}>
            <span style={{flexShrink: 0, marginTop: co * 0.42, width: 14, height: 14, borderRadius: 7, background: nhan, boxShadow: `0 0 10px ${nhan}`}} />
            <Dong s={s} co={co} mau="#ffffff" mx={rong - 130} />
          </div>
        );
      })}
      {de.tim ? (
        <div style={{marginTop: 18, borderRadius: 20, padding: '14px 22px', background: 'rgba(255,213,74,0.12)', border: '3px solid #FFD54A', opacity: kep(aTim * 1.6),
          transform: `scale(${popOut(aTim, 1.6) * (1 + 0.012 * Math.sin(f / 9) * aTim)})`, boxShadow: `0 0 ${18 + 8 * Math.sin(f / 9)}px rgba(255,213,74,0.35)`}}>
          <div style={{fontWeight: 900, fontSize: 28, letterSpacing: 3, color: '#FFD54A', marginBottom: 4}}>CẦN TÌM</div>
          <Dong s={de.tim} co={co * 1.05} mau="#FFE58A" mx={rong - 120} />
        </div>
      ) : null}
    </div>
  );
};
