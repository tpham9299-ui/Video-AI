import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {FONT_DAM, vienChu} from './theme';
import {LogoTron} from './ThuongHieu';
import {Props} from './types';
import {Video} from './Video';
import {Xuc3D} from './sankhau/vat';

// ẢNH BÌA (1080x1920, cùng khổ video dọc) dựng bằng Remotion "still":
//  - nền: chính video, đóng băng ở cảnh có hình minh họa rõ nhất, phóng to + làm mờ + tối;
//  - giữa: ô kính viền neon chứa hình minh họa thật của đề (bông tuyết, bể nước, đồ thị...);
//  - trên: logo kênh, LỚP, LOẠI CÂU HỎI (mỗi loại một màu), TẬP; tiêu đề chữ khối cực lớn, từ khóa nằm trên nền màu của loại;
//  - dưới: câu mời gọi theo loại câu hỏi + "ĐÁP ÁN: ?".
export {MAU_LOAI} from './theme';
import {MAU_LOAI} from './theme';
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
        {/* bài hình học dựng bằng Manim: hình đầy đủ (tô màu đại lượng) do Manim vẽ, đặt đúng vùng nội dung */}
        {props.manimLop && props.anhManimBia ? <Img src={staticFile(props.anhManimBia)} style={{position: 'absolute', left: -60, top: -330, width: 1080, height: 1920}} /> : null}
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,17,19,0) 75%, rgba(7,17,19,0.85) 100%)'}} />
      </div>
      {b.loai === 'Xác suất' ? <TrangTriXacSuat mau={mau} /> : null}
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

// ẢNH BÌA XÁC SUẤT: thêm xúc xắc 3D nổi ở góc khung, chồng xu, nhãn tròn "P = ?" nghiêng và thanh đo 0%-100% có dấu hỏi
// (người xem nhận ra ngay đây là bài xác suất, khung hình bớt trống, có điểm nhìn).
const TrangTriXacSuat: React.FC<{mau: string}> = ({mau}) => (
  <>
    <div style={{position: 'absolute', left: 18, top: 548, filter: `drop-shadow(0 18px 30px rgba(0,0,0,0.7)) drop-shadow(0 0 22px ${mau}66)`}}>
      <Xuc3D co={150} rx={-28} ry={38} vien={mau} />
    </div>
    <div style={{position: 'absolute', right: 70, top: 1250, filter: 'drop-shadow(0 14px 24px rgba(0,0,0,0.7))', transform: 'rotate(14deg)'}}>
      <Xuc3D co={110} rx={-20} ry={-30} vien="#FF8A3D" />
    </div>
    <div style={{position: 'absolute', right: 34, top: 520, width: 210, height: 210, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #F1E9FF 0%, ${mau} 55%, #7B5BE0 100%)`,
      border: '6px solid #ffffff', boxShadow: `0 0 40px ${mau}, 0 16px 30px rgba(0,0,0,0.6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(12deg)',
      fontSize: 70, fontWeight: 900, color: '#140a2a', fontStyle: 'italic'}}>P&nbsp;=&nbsp;?</div>
    {[0, 1, 2, 3].map((k) => (
      <div key={k} style={{position: 'absolute', left: 80 + k * 6, top: 1400 - k * 22, width: 120, height: 40, borderRadius: '50%', background: 'linear-gradient(180deg, #FFE27A, #E0A800)', border: '3px solid #8a6400', boxShadow: '0 6px 0 #8a6400'}} />
    ))}
    <div style={{position: 'absolute', left: 110, right: 110, top: 1452, height: 26, borderRadius: 13, background: `linear-gradient(90deg, #FF5C61, #FFD54A, #3BF29A)`, boxShadow: '0 0 20px rgba(0,0,0,0.6)', border: '3px solid rgba(255,255,255,0.8)'}}>
      <div style={{position: 'absolute', left: '62%', top: -64, transform: 'translateX(-50%)', width: 70, height: 70, borderRadius: '50%', background: '#fff', color: '#140a2a', fontSize: 52, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 26px ${mau}`}}>?</div>
      <div style={{position: 'absolute', left: -6, top: 30, fontSize: 30, fontWeight: 900, color: '#fff'}}>0%</div>
      <div style={{position: 'absolute', right: -6, top: 30, fontSize: 30, fontWeight: 900, color: '#fff'}}>100%</div>
    </div>
  </>
);
