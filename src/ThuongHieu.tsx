import React from 'react';
import {Img, staticFile} from 'remotion';
import {FONT} from './theme';
import {ThuongHieuProps} from './types';

// Đầu video: logo + tên trung tâm + khẩu hiệu (góc trên bên trái); hình mờ lớn sau nội dung; tên kênh nhỏ ở góc dưới. Không cấu hình thì không hiện gì.
export const ThuongHieu: React.FC<{th: ThuongHieuProps}> = ({th}) => {
  if (!th || (!th.ten && !th.logo && !th.handle)) return null;
  return (
    <>
      {th.logo && th.markNuoc ? (
        <Img src={staticFile(th.logo)} style={{position: 'absolute', left: 140, top: 640, width: 800, opacity: 0.1, objectFit: 'contain'}} />
      ) : null}
      <div style={{position: 'absolute', left: 90, top: 112, display: 'flex', alignItems: 'center', gap: 18}}>
        {th.logo ? <Img src={staticFile(th.logo)} style={{height: 84, width: 'auto', objectFit: 'contain'}} /> : null}
        <div>
          {th.ten ? <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 36, color: '#fff', letterSpacing: 0.5}}>{th.ten}</div> : null}
          {th.khauHieu ? <div style={{fontFamily: '"Liberation Serif", "DejaVu Serif", serif', fontStyle: 'italic', fontSize: 28, color: 'rgba(255,255,255,0.85)', marginTop: 2}}>{th.khauHieu}</div> : null}
        </div>
      </div>
      {th.handle ? <div style={{position: 'absolute', right: 70, bottom: 330, fontFamily: FONT, fontWeight: 700, fontSize: 30, color: 'rgba(255,255,255,0.75)'}}>{th.handle}</div> : null}
    </>
  );
};
