import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Avatar3D} from './avatar/Avatar3D';
import {CanhNhe, tinhTrangThai} from './avatar/thoiGian';
import {FONT, MAU} from './theme';

const DANH_SACH = ['ngac_nhien', 'nghi', 'boi_roi', 'y_tuong', 'thao_tac', 'vui', 'tu_tin', 'mac_dinh'];
const MOI = 75;

// Cảnh thử riêng cho nhân vật 3D: đi vào, lần lượt làm từng tư thế, nói (miệng nhép giả lập), chỉ tay, rồi đi ra.
// Dùng để kiểm tra mô hình VRM của bạn trước khi dựng video thật (Remotion Studio hoặc workflow "Thử nhân vật 3D").
export const ThuNhanVat: React.FC<{url: string}> = ({url}) => {
  const frame = useCurrentFrame();
  const canh: CanhNhe[] = DANH_SACH.map((c, i) => ({
    batDau: i * MOI, soFrame: MOI, camXuc: c, coHinh: i % 2 === 1, leadFrame: 10,
    bienDo: Array.from({length: MOI}, (_, k) => (k > 10 ? Math.abs(Math.sin(k / 3)) * 0.9 : 0)),
  }));
  const tong = MOI * DANH_SACH.length;
  const tt = tinhTrangThai(canh, frame, tong);
  return (
    <AbsoluteFill style={{background: `linear-gradient(160deg, ${MAU.nen1}, ${MAU.nen2})`, fontFamily: FONT}}>
      <div style={{position: 'absolute', left: 60, top: 200, color: '#fff', fontSize: 54, fontWeight: 800}}>
        {tt.dang === 'dung' ? tt.dauVao.camB : tt.dang === 'vao' ? 'đi vào' : 'đi ra'}
        {tt.dauVao.chi > 0.5 ? ' + chỉ tay' : ''}
      </div>
      <Avatar3D url={url} canh={canh} tongFrame={tong} onLoi={() => undefined} hienBongDen={tt.hienBongDen} />
    </AbsoluteFill>
  );
};
export const TONG_FRAME_THU = MOI * DANH_SACH.length;
