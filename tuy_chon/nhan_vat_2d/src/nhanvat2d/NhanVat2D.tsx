import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {chonDang} from '../bocuc';
import {PhongCach} from '../types';
import {Emote} from './Emote';
import {CanhNV, tinhNV} from './timeline';

// Nhân vật 2D dẫn chuyện, đứng ở góc dưới bên phải cạnh phụ đề. Mỗi ảnh là một dáng (xem HUONG_DAN_NHAN_VAT_2D.md).
//  - nhảy bước vào/ra khỏi màn hình (bật nhảy, ép dẹp khi tiếp đất, nghiêng người),
//  - đổi dáng theo cảm xúc từng cảnh: chuyển mờ dần + nảy nhẹ + biểu tượng cảm xúc bay quanh đầu,
//  - nói: nhún theo độ lớn giọng, lắc đầu theo nhịp, đổi sang ảnh miệng mở (<dáng>_mo) nếu có,
//  - đứng yên: thở, đung đưa, chớp mắt (nếu có ảnh <dáng>_nham),
//  - chỉ tay: đổi sang dáng "chi_tay" (nếu có) khi lời giảng nhắc tới hình minh họa.
export const NhanVat2D: React.FC<{canh: CanhNV[]; tongFrame: number; ds: Record<string, string>; pc: PhongCach['nhanVat']}> = ({canh, tongFrame, ds, pc}) => {
  const frame = useCurrentFrame();
  const tt = tinhNV(canh, frame, tongFrame);
  const dangCam = tt.chi && ds['chi_tay'] ? 'chi_tay' : tt.cam;
  const dang = chonDang(dangCam, ds);
  const dangTruoc = chonDang(tt.camTruoc, ds);
  if (!dang) return null;

  const tep = (d: string, noi: boolean, nham: boolean) =>
    nham && ds[d + '_nham'] ? ds[d + '_nham'] : noi && ds[d + '_mo'] ? ds[d + '_mo'] : ds[d];
  const nham = (frame + 17) % 110 < 4 && tt.dang === 'dung';
  const noi = tt.bienDo > 0.35;
  const hienTai = tep(dang, noi, nham);
  const truoc = tt.doiDang && dangTruoc !== dang && tt.doi < 1 ? tep(dangTruoc, false, false) : null;

  const bd = tt.bienDo;
  const nhun = bd * bd;
  const tho = Math.sin(frame / 16);
  // cảnh 1 (hook): nhân vật to hơn rồi thu về cỡ thường khi sang cảnh 2
  const lonHook = pc.caoHook / pc.cao;
  const heSoCao = tt.i === 0 ? lonHook : tt.i === 1 ? interpolate(tt.local, [0, 14], [lonHook, 1], {extrapolateRight: 'clamp'}) : 1;
  const pop = tt.doiDang && tt.dang === 'dung' ? 1 + 0.09 * Math.sin(Math.PI * Math.min(1, tt.local / 10)) : 1;
  const bat = tt.i === 0 && tt.dang === 'dung' ? 1 + 0.05 * Math.sin(Math.PI * Math.min(1, Math.max(0, (frame - 40) / 14))) : 1;
  const sx = 1 + nhun * 0.025 + tt.chamDat * 0.07 * (tt.dang === 'dung' ? 0 : 1);
  const sy = 1 - nhun * 0.03 + tho * 0.012 - tt.chamDat * 0.08 * (tt.dang === 'dung' ? 0 : 1);
  const lac = Math.sin(frame * 0.9) * 1.3 * bd + Math.sin(frame / 27) * 1.2;
  const xemEmote = pc.emote && pc.emoteTat.indexOf(tt.cam) < 0 && tt.dang === 'dung' && !(tt.chi && ds['chi_tay']);

  const cao = pc.cao;
  const RONG = Math.round(cao * 1.05);
  return (
    <div style={{position: 'absolute', right: 8, bottom: 380, width: RONG, height: cao * 1.5, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: '50%', bottom: 0, width: 0, height: 0}}>
        {/* bóng đổ dưới chân: nhỏ lại khi nhảy lên */}
        <div style={{position: 'absolute', left: -cao * 0.28 + tt.x, bottom: -10, width: cao * 0.56, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', filter: 'blur(7px)', transform: `scaleX(${1 - Math.min(0.4, tt.hop / 120)})`}} />
        <div
          style={{
            position: 'absolute',
            left: -RONG / 2,
            bottom: 0,
            width: RONG,
            height: cao,
            transformOrigin: '50% 100%',
            transform: `translate(${tt.x}px, ${-tt.hop}px) rotate(${tt.nghieng + lac}deg) scale(${sx * heSoCao * pop * bat}, ${sy * heSoCao * pop * bat})`,
          }}
        >
          {truoc ? <Img src={staticFile('nhan_vat/' + truoc)} style={{position: 'absolute', left: 0, bottom: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom', opacity: 1 - tt.doi, filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.5))', transform: pc.lat ? 'scaleX(-1)' : undefined}} /> : null}
          <Img src={staticFile('nhan_vat/' + hienTai)} style={{position: 'absolute', left: 0, bottom: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom', opacity: truoc ? tt.doi : 1, filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.5))', transform: pc.lat ? 'scaleX(-1)' : undefined}} />
          {xemEmote ? <Emote cam={tt.cam} local={tt.local} /> : null}
        </div>
      </div>
    </div>
  );
};
