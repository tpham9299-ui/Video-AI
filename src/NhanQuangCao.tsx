import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {expoOut} from './sankhau/chuyendong';
import {kep} from './sankhau/donghieu';
import {FONT_DAM, GIAO_DIEN} from './theme';

// VIDEO CÓ SẢN PHẨM DO KÊNH BÁN (gắn tự động từ kịch bản san_pham, không phụ thuộc AI có nhớ viết hay không):
//  - viên nhỏ "Có sản phẩm do kênh bán" nằm suốt video (minh bạch, không che nội dung);
//  - 4,5 giây cuối (trước màn kết): THẺ SẢN PHẨM = ảnh thật + tên + giá kênh bán + "có tại kênh, link ở mô tả".
export type QuangCao = {ten: string; gia?: string; anh?: string; cta?: string};
export const NhanQuangCao: React.FC<{qc: QuangCao; tongFrame: number}> = ({qc, tongFrame}) => {
  const f = useCurrentFrame();
  const vao = kep((f - 20) / 12);
  const batDauThe = tongFrame - 135;
  const the = expoOut(kep((f - batDauThe) / 16));
  const nhan = GIAO_DIEN.nhan || '#FFB25C';
  return (
    <>
      {/* góc trên bên trái, ngay cạnh logo kênh (góc phải là nhãn TẬP N khi đăng): không đè lên hình/công thức của cảnh */}
      <div style={{position: 'absolute', left: 112, top: 48, display: 'flex', pointerEvents: 'none', opacity: vao * 0.9 * (1 - the)}}>
        <div style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: 26, color: '#FFE7C2', background: 'rgba(20,14,6,0.72)', border: '1.5px solid rgba(255,170,80,0.55)', borderRadius: 999, padding: '3px 14px', letterSpacing: 0.3}}>
          🛍 Có sản phẩm do kênh bán
        </div>
      </div>
      {the > 0 && f < tongFrame ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 1262, display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity: the, transform: `translateY(${(1 - the) * 60}px) scale(${0.92 + 0.08 * the})`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 26, width: 880, padding: '18px 26px', borderRadius: 30, background: 'linear-gradient(135deg, rgba(14,24,30,0.96), rgba(22,16,30,0.96))',
            border: `3px solid ${nhan}`, boxShadow: `0 0 30px ${nhan}66, 0 20px 40px rgba(0,0,0,0.5)`}}>
            <div style={{width: 176, height: 176, flex: '0 0 176px', borderRadius: 22, overflow: 'hidden', background: 'radial-gradient(circle at 50% 40%, #fff, #e3e8ec)', position: 'relative'}}>
              {qc.anh ? <Img src={staticFile(qc.anh)} style={{position: 'absolute', inset: 8, width: 160, height: 160, objectFit: 'contain'}} /> : <div style={{fontSize: 92, textAlign: 'center', lineHeight: '176px'}}>🛍</div>}
            </div>
            <div style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6}}>
              <div style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: 27, color: nhan, letterSpacing: 2}}>SẢN PHẨM TRONG BÀI</div>
              <div style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: 38, color: '#fff', lineHeight: 1.12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{qc.ten}</div>
              {qc.gia ? <div style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: 46, color: nhan, textShadow: `0 0 16px ${nhan}88`}}>{qc.gia}</div> : null}
              <div style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: 27, color: '#DDE6EA'}}>{qc.cta || '🛒 Có tại kênh · link ở mô tả'}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
