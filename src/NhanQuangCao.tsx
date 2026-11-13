import React from 'react';
import {useCurrentFrame} from 'remotion';
import {expoOut} from './sankhau/chuyendong';
import {kep} from './sankhau/donghieu';
import {FONT_DAM} from './theme';

// NHÃN MINH BẠCH cho video có sản phẩm do kênh bán: viên nhỏ "Có sản phẩm do kênh bán" nằm suốt video (không che nội dung),
// và ở 4 giây cuối hiện thêm một dòng tên sản phẩm. Gắn tự động từ kịch bản (san_pham), không phụ thuộc AI có nhớ viết hay không.
export const NhanQuangCao: React.FC<{ten: string; tongFrame: number}> = ({ten, tongFrame}) => {
  const f = useCurrentFrame();
  const vao = kep((f - 20) / 12);
  const cuoi = expoOut(kep((f - (tongFrame - 120)) / 14));
  return (
    <>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1418, display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity: vao * 0.9}}>
        <div style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: 21, color: '#FFE7C2', background: 'rgba(20,14,6,0.72)', border: '1.5px solid rgba(255,170,80,0.55)', borderRadius: 999, padding: '3px 14px', letterSpacing: 0.3}}>
          🛍 Có sản phẩm do kênh bán
        </div>
      </div>
      {cuoi > 0 ? (
        <div style={{position: 'absolute', left: 170, right: 170, top: 1340, display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity: cuoi, transform: `translateY(${(1 - cuoi) * 20}px)`}}>
          <div style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: 26, color: '#fff', background: 'rgba(10,22,26,0.85)', border: '2px solid rgba(255,170,80,0.7)', borderRadius: 16, padding: '8px 20px', textAlign: 'center', maxWidth: 900}}>
            Sản phẩm trong bài: <span style={{color: '#FFB25C'}}>{ten}</span>
          </div>
        </div>
      ) : null}
    </>
  );
};
