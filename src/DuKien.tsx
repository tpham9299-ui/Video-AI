import React from 'react';
import {useCurrentFrame} from 'remotion';
import {expoOut} from './sankhau/chuyendong';
import {kep} from './sankhau/donghieu';
import {FONT_DAM} from './theme';
import {Toan} from './Toan';
import {texSangChu} from './chu';

const MAU_THE_DK = ['#38bdf8', '#fb7185', '#fbbf24', '#4ade80'];

// THẺ DỮ KIỆN TÓM TẮT (phong cách chip thông số của Anh Shiper Toán):
// Chỉ hiện ở phần mô hình / đầu phần giải để nhắc nhanh thông số chính với màu phân biệt từng đối tượng, không lặp lại suốt cuối video.
export const DuKien: React.FC<{ds: string[]; tu: number; den: number; hud?: string}> = ({ds, tu, den, hud}) => {
  const f = useCurrentFrame();
  if (!ds.length || f < tu - 2 || f > den + 12) return null;
  const mo = kep((den + 12 - f) / 12);
  if (hud) {
    return (
      <div style={{position: 'absolute', left: 40, right: 40, top: 208, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 14, rowGap: 6, opacity: mo * 0.96, pointerEvents: 'none'}}>
        {ds.slice(0, 3).map((d, i) => {
          const e = expoOut(kep((f - tu - i * 5) / 12));
          const mau = MAU_THE_DK[i % MAU_THE_DK.length];
          const laToan = /[\\^_=]/.test(d);
          const tex = laToan ? d.split(/\s+/).map((w) => (/[\\^_=0-9]/.test(w) || w.length <= 1 ? w : `\\text{${w}}`)).join('\\ ') : d;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 8, padding: '5px 15px', borderRadius: 12, background: 'rgba(15,23,42,0.88)', border: `1.5px solid ${mau}70`, boxShadow: '0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)', opacity: e, transform: `translateY(${(1 - e) * -8}px) scale(${0.92 + 0.08 * e})`, whiteSpace: 'nowrap'}}>
              <span style={{width: 7, height: 7, borderRadius: 4, background: mau, boxShadow: `0 0 8px ${mau}`}} />
              {laToan ? <Toan tex={tex} size={27} color={mau} maxWidth={920} /> : <span style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: 25, color: mau}}>{texSangChu(d)}</span>}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div style={{position: 'absolute', left: 30, right: 30, top: 172, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, opacity: mo, pointerEvents: 'none'}}>
      {ds.map((d, i) => {
        const e = expoOut(kep((f - tu - i * 4) / 12));
        const laToan = /[\\^_=]/.test(d);
        // chữ thường trong công thức (KaTeX bỏ dấu cách): bọc từng từ có chữ cái vào \text{} để giữ khoảng trắng
        const tex = laToan ? d.split(/\s+/).map((w) => (/[\\^_=0-9]/.test(w) || w.length <= 1 ? w : `\\text{${w}}`)).join('\\ ') : d;
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 6, padding: '4px 16px 4px 12px', borderRadius: 999, background: 'rgba(10,22,26,0.72)', border: '1.5px solid rgba(59,242,154,0.45)',
            boxShadow: `0 0 ${10 + 6 * Math.sin((f + i * 20) / 22)}px rgba(59,242,154,0.18)`, transform: `translateY(${(1 - e) * -14}px) scale(${0.85 + 0.15 * e})`, opacity: e, whiteSpace: 'nowrap'}}>
            <span style={{width: 8, height: 8, borderRadius: 4, background: '#3BF29A', boxShadow: '0 0 8px #3BF29A'}} />
            {laToan ? <Toan tex={tex} size={32} color="#EAF2F4" maxWidth={960} /> : <span style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: 30, color: '#EAF2F4'}}>{texSangChu(d)}</span>}
          </div>
        );
      })}
    </div>
  );
};
