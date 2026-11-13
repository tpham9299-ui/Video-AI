import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONT_DAM, vienChu} from './theme';
import {LogoTron} from './ThuongHieu';
import {Props} from './types';
import {Video} from './Video';

// ẢNH BÌA (1080x1920, cùng khổ video dọc) dựng bằng Remotion "still":
//  - nền: chính video, đóng băng ở cảnh có hình minh họa rõ nhất, phóng to + làm mờ + tối;
//  - giữa: ô kính viền neon chứa hình minh họa thật của đề (bông tuyết, bể nước, đồ thị...);
//  - trên: logo kênh, LỚP, LOẠI CÂU HỎI (mỗi loại một màu), TẬP; tiêu đề chữ khối cực lớn, từ khóa nằm trên nền màu của loại;
//  - dưới: câu mời gọi theo loại câu hỏi + "ĐÁP ÁN: ?".
export const MAU_LOAI: Record<string, string> = {
  'Xác suất': '#B79CFF', 'Hình học': '#4FC3F7', 'Tối ưu': '#3BF29A', 'Toán tiền bạc': '#FFD24A', 'Đo đạc': '#FF7EB6', 'Toán đi chợ': '#FF8A3D', 'Toán thực tế': '#3BF2D0',
};
const LOI_MOI: Record<string, string> = {
  'Xác suất': 'BẠN ĐOÁN ĐÚNG KHÔNG?', 'Hình học': 'NHÌN HÌNH LÀ HIỂU', 'Tối ưu': 'CÁCH TIẾT KIỆM NHẤT?', 'Toán tiền bạc': 'TÍNH TIỀN CHO ĐÚNG', 'Đo đạc': 'ĐO MÀ KHÔNG CẦN THƯỚC',
  'Toán đi chợ': 'MUA SAO CHO LỜI?', 'Toán thực tế': 'GIẢI TRONG 60 GIÂY',
};

const Vien = ({co}: {co: number}) => ({WebkitTextStroke: vienChu(co), paintOrder: 'stroke fill' as const, textShadow: `0 ${co * 0.06}px 0 rgba(4,12,12,0.95), 0 ${co * 0.12}px ${co * 0.25}px rgba(0,0,0,0.6)`});

export const AnhBia: React.FC<Props> = (props) => {
  const b = props.bia || {loai: 'Toán thực tế', tieuDe: props.hookChu || props.tieuDe, khung: 60};
  const mau = MAU_LOAI[b.loai] || '#3BF2D0';
  const tu = String(b.tieuDe || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const nhan = (props.nhanManh || []).map((x) => x.toUpperCase()).filter((x) => x && tu.includes(x));
  const soKyTu = tu.length;
  const co = soKyTu > 42 ? 82 : soKyTu > 30 ? 96 : soKyTu > 20 ? 112 : 128;
  // tách tiêu đề thành các đoạn thường / đoạn nhấn mạnh
  const doan: {chu: string; nhan: boolean}[] = [];
  if (nhan.length) {
    const re = new RegExp('(' + nhan.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
    tu.split(re).filter(Boolean).forEach((p) => doan.push({chu: p, nhan: nhan.includes(p)}));
  } else doan.push({chu: tu, nhan: false});
  const coBrand = !!props.thuongHieu && !!(props.thuongHieu.ten || props.thuongHieu.logo);
  // ảnh bìa được chụp ĐÚNG khung hình b.khung (npx remotion still ... --frame=<khung>), nên video bên dưới tự ở đúng thời điểm
  const video = <Video {...props} nhac={null} canh={props.canh.map((c) => ({...c, audio: ''}))} />;   // ảnh tĩnh: bỏ âm thanh
  return (
    <AbsoluteFill style={{background: '#050b0d', fontFamily: FONT_DAM, overflow: 'hidden'}}>
      {/* nền: chính khung hình đó, phóng to, mờ, tối */}
      <AbsoluteFill style={{transform: 'scale(1.35)', filter: 'blur(26px) brightness(0.45) saturate(1.3)'}}>{video}</AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 55%, ${mau}33 0%, transparent 55%), linear-gradient(180deg, rgba(3,8,10,0.92) 0%, rgba(3,8,10,0.35) 32%, rgba(3,8,10,0.35) 70%, rgba(3,8,10,0.95) 100%)`}} />
      {/* ô kính chứa hình minh họa thật của đề (vùng sân khấu của video) */}
      <div style={{position: 'absolute', left: 60, right: 60, top: 625, height: 860, borderRadius: 44, overflow: 'hidden', border: `5px solid ${mau}`,
        boxShadow: `0 0 60px ${mau}88, 0 0 0 10px rgba(255,255,255,0.05), 0 30px 80px rgba(0,0,0,0.7)`, background: '#071113'}}>
        <div style={{position: 'absolute', left: -60, top: -540, width: 1080, height: 1920}}>{video}</div>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,17,19,0) 75%, rgba(7,17,19,0.85) 100%)'}} />
      </div>
      {/* hàng nhãn trên cùng */}
      <div style={{position: 'absolute', top: 110, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18}}>
        {coBrand ? <LogoTron th={props.thuongHieu} co={84} sang={0.6} /> : null}
        {props.lop ? <span style={{background: '#3BF29A', color: '#062019', borderRadius: 14, padding: '6px 20px', fontSize: 44, fontWeight: 900}}>LỚP {props.lop}</span> : null}
        <span style={{background: mau, color: '#0a0a12', borderRadius: 14, padding: '6px 20px', fontSize: 44, fontWeight: 900, boxShadow: `0 0 30px ${mau}99`}}>{b.loai.toUpperCase()}</span>
        {props.series && props.series.tap ? <span style={{background: 'rgba(255,255,255,0.12)', color: '#fff', border: '3px solid rgba(255,255,255,0.5)', borderRadius: 14, padding: '3px 16px', fontSize: 40, fontWeight: 900}}>TẬP {props.series.tap}</span> : null}
      </div>
      {/* tiêu đề */}
      <div style={{position: 'absolute', top: 230, left: 50, right: 50, height: 390, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
        <div style={{fontSize: co, fontWeight: 900, lineHeight: 1.12, color: '#fff', letterSpacing: -1, ...Vien({co})}}>
          {doan.map((d, i) =>
            d.nhan ? (
              <span key={i} style={{background: mau, color: '#0a0a12', borderRadius: co * 0.16, padding: `0 ${co * 0.14}px`, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', WebkitTextStroke: '0px', textShadow: 'none', boxShadow: `0 ${co * 0.07}px 0 rgba(0,0,0,0.55)`}}>{d.chu}</span>
            ) : (
              <span key={i}>{d.chu}</span>
            )
          )}
        </div>
      </div>
      {/* lời mời gọi + đáp án ? */}
      <div style={{position: 'absolute', top: 1535, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22}}>
        <div style={{background: '#FF8A3D', color: '#1a0d02', fontSize: 62, fontWeight: 900, borderRadius: 22, padding: '10px 34px', transform: 'rotate(-2deg)', boxShadow: '0 10px 0 #a2470f, 0 18px 40px rgba(0,0,0,0.5)'}}>
          {LOI_MOI[b.loai] || 'GIẢI TRONG 60 GIÂY'}
        </div>
        <div style={{fontSize: 54, fontWeight: 900, color: '#fff', ...Vien({co: 54})}}>
          ĐÁP ÁN: <span style={{color: mau}}>???</span>
        </div>
      </div>
      {props.thuongHieu && (props.thuongHieu.ten || props.thuongHieu.handle) ? (
        <div style={{position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center', fontSize: 36, fontWeight: 800, color: 'rgba(255,255,255,0.85)'}}>
          {props.thuongHieu.ten || ''} {props.thuongHieu.handle ? '· ' + props.thuongHieu.handle : ''}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
