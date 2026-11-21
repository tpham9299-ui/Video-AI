import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {expoOut} from './sankhau/chuyendong';
import {kep, popOut} from './sankhau/donghieu';
import {FONT_DAM, GIAO_DIEN} from './theme';
import {HopVua, Toan} from './Toan';
import {chuanDauCau, coTex, texSangChu} from './chu';

// THẺ ĐỀ BÀI PHONG CÁCH TRỰC QUAN (lấy cảm hứng từ phong cách thiết kế Anh Shiper Toán):
// - Khung kính tối tinh tế (frosted dark slate), các câu dữ kiện nối tiếp nhau xuất hiện ĐÚNG NHỊP GIỌNG ĐỌC (moc[i]).
// - Tự động tô màu nhấn (vàng #fbbf24, xanh lam #38bdf8, hồng san hô #fb7185, xanh lá #4ade80, tím #c084fc) cho các con số,
//   đơn vị, mốc giờ và đối tượng hình học/thực tế đồng bộ với màu trên hình minh họa phía trên.
// - Câu hỏi "CẦN TÌM" hiện ra ở câu cuối trong thanh callout viền vàng nổi bật.
export type DeBai = {cho: string[]; tim: string};

export const coTheDe = (d: DeBai | null | undefined) => !!d && (d.cho.length > 0 || !!d.tim);

const BANG_MAU_NHAN = ['#fbbf24', '#38bdf8', '#fb7185', '#4ade80', '#c084fc'];

// Tự động tô màu các cụm số đo, mốc giờ, góc, đơn vị tiền và từ khóa quan trọng trong câu đề bài
function toMauCumTuDe(s: string, chiSoCau: number): React.ReactNode {
  const mauChinh = BANG_MAU_NHAN[chiSoCau % BANG_MAU_NHAN.length];
  const mauPhu = BANG_MAU_NHAN[(chiSoCau + 1) % BANG_MAU_NHAN.length];
  const re = /(\d+h\d*|\d+(?:[.,\s]\d+)*\s*(?:km\/h|m\/s|đ\/m²|đồng\/m²|triệu|nghìn|đồng|đ|km|cm|mm|m³|m²|m|lít|°|%)|(?<![\p{L}\p{N}])(?:lục giác đều|hình chữ nhật|hình vuông|hình tròn|đường tròn|tam giác đều|tam giác vuông|hình chóp|lăng trụ|sà lan|ô tô|bể cá|trồng hoa|trồng cỏ|gần nhau nhất|nhỏ nhất|lớn nhất|ngắn nhất|ít nhất)(?![\p{L}\p{N}]))/giu;
  const phan = s.split(re);
  let dem = 0;
  return phan.map((p, k) => {
    if (!p) return null;
    if (re.test(p)) {
      re.lastIndex = 0;
      const m = dem++ % 2 === 0 ? mauChinh : mauPhu;
      return (
        <span key={k} style={{color: m, fontWeight: 900, textShadow: `0 0 12px ${m}33`}}>
          {p}
        </span>
      );
    }
    return <React.Fragment key={k}>{p}</React.Fragment>;
  });
}

// cỡ chữ + chiều cao ước tính (Canh dùng để chừa chỗ cho thẻ, sân khấu thu gọn tương ứng)
export function boCucTheDe(d: DeBai, rong = 960, caoToiDa = 640) {
  const dong = (s: string, co: number) => Math.max(1, Math.ceil((texSangChu(s).length * 0.54 * co) / (rong - 110)));
  const caoVoi = (co: number) => 78 + d.cho.reduce((a, s) => a + dong(s, co) * co * 1.32 + 8, 0) + (d.tim ? 28 + dong(d.tim, co) * co * 1.3 + 32 : 0) + 24;
  let co = 40;
  while (co > 28 && caoVoi(co) > caoToiDa) co -= 2;
  return {co, cao: Math.min(caoToiDa, caoVoi(co))};
}

// v89: dòng TeX và dòng chữ thường CÙNG một cỡ (--k chung của HopVua), căn trái, không co riêng từng dòng.
const Dong: React.FC<{s: string; co: number; mau: string; mx: number; idx: number; giua?: boolean}> = ({s, co, mau, mx, idx, giua}) =>
  coTex(s) ? <Toan tex={s} size={co} color={mau} maxWidth={mx} can={giua ? 'giua' : 'trai'} /> : <span style={{fontSize: `calc(${co}px * var(--k, 1))`, color: mau, fontWeight: 600, fontVariantNumeric: 'tabular-nums'}}>{toMauCumTuDe(chuanDauCau(s), idx)}</span>;

export const TheDeBai: React.FC<{de: DeBai; moc: number[]; giuNguyen?: boolean; rong?: number; caoToiDa?: number}> = ({de, moc, giuNguyen, rong = 960, caoToiDa = 640}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const {co} = boCucTheDe(de, rong, caoToiDa);
  const hien = (i: number) => (giuNguyen ? 1 : expoOut(kep((t - (moc[i] ?? 0.25 + i * 0.75)) / 0.4)));
  const aThe = giuNguyen ? 1 : expoOut(kep((t - 0.1) / 0.35));
  const iTim = de.cho.length;
  const aTim = hien(iTim);
  return (
    <div style={{width: rong, boxSizing: 'border-box', borderRadius: 26, padding: '20px 30px 24px', background: 'linear-gradient(165deg, rgba(16,24,39,0.94), rgba(8,13,24,0.97))',
      border: '1.5px solid rgba(148,163,184,0.28)', boxShadow: '0 20px 50px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.1)', fontFamily: FONT_DAM, fontWeight: 700, color: '#f1f5f9', opacity: aThe,
      transform: `translateY(${(1 - aThe) * 22}px) scale(${0.97 + 0.03 * aThe})`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12}}>
        <span style={{width: 10, height: 10, borderRadius: 5, background: '#38bdf8', boxShadow: '0 0 10px #38bdf8'}} />
        <span data-kd-bo="1" style={{fontSize: 25, fontWeight: 900, letterSpacing: 1.5, color: '#94a3b8'}}>DỮ KIỆN ĐỀ BÀI</span>
        <div style={{flex: 1, height: 1.5, background: 'linear-gradient(90deg, rgba(148,163,184,0.35), transparent)'}} />
      </div>
      <HopVua khoa={de.cho.join('|')} style={{display: 'flex', flexDirection: 'column', gap: 8}}>
        {de.cho.map((s, i) => {
          const a = hien(i);
          // v89: dòng chưa tới lượt vẫn giữ chỗ (ẩn) để cỡ chữ chung của cả hộp không đổi khi dòng dài xuất hiện sau
          const dangDoc = !giuNguyen && t >= (moc[i] ?? 0) && t < (moc[i + 1] ?? 999);
          const mauDot = BANG_MAU_NHAN[i % BANG_MAU_NHAN.length];
          return (
            <div key={i} style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 12, opacity: kep(a * 1.5), visibility: a <= 0.01 ? 'hidden' : 'visible', transform: `translateY(${(1 - a) * 14}px)`,
              lineHeight: 1.36, textAlign: 'left', padding: '4px 10px', borderRadius: 12,
              borderLeft: dangDoc ? `4px solid ${mauDot}` : '4px solid transparent',
              background: dangDoc ? 'rgba(255,255,255,0.06)' : 'transparent'}}>
              <span style={{flexShrink: 0, marginTop: co * 0.5, width: 10, height: 10, borderRadius: 5, background: mauDot, boxShadow: `0 0 8px ${mauDot}`}} />
              <div style={{flex: 1, minWidth: 0, textAlign: 'left'}}>
                <Dong s={s} co={co} mau="#f1f5f9" mx={rong - 106} idx={i} />
              </div>
            </div>
          );
        })}
      </HopVua>
      {de.tim && aTim > 0.01 ? (
        <div style={{marginTop: 14, borderRadius: 18, padding: '12px 20px', background: 'linear-gradient(90deg, rgba(251,191,36,0.16), rgba(245,158,11,0.08))',
          border: '1.8px solid rgba(251,191,36,0.68)', opacity: kep(aTim * 1.6),
          transform: `scale(${popOut(aTim, 1.35)})`, boxShadow: '0 8px 24px rgba(251,191,36,0.18), inset 0 1px 0 rgba(255,255,255,0.12)', textAlign: 'center'}}>
          <Dong s={de.tim} co={Math.round(co * 1.02)} mau="#fde68a" mx={rong - 90} idx={0} giua />
        </div>
      ) : null}
    </div>
  );
};
