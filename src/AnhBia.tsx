import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {FONT_DAM, FONT_TIEU_DE, vienChu} from './theme';
import {LogoTron} from './ThuongHieu';
import {Props} from './types';
import {Video} from './Video';
import {Xuc3D} from './sankhau/vat';
import {AN_TOAN} from './khung4tang/vung';
import {layTheme} from './khung4tang/nen_v99';

// ẢNH BÌA (1080x1920, cùng khổ video dọc) dựng bằng Remotion "still":
//  - nền: chính video, đóng băng ở cảnh có hình minh họa rõ nhất, phóng to + làm mờ + tối;
//  - giữa: ô kính viền neon chứa hình minh họa thật của đề (bông tuyết, bể nước, đồ thị...);
//  - trên: logo kênh, LỚP, LOẠI CÂU HỎI (mỗi loại một màu), TẬP; tiêu đề chữ khối cực lớn, từ khóa nằm trên nền màu của loại;
//  - dưới: câu mời gọi theo loại câu hỏi + dấu "?" nổi bật.
// v101.1: gộp từ Thumbnail.tsx cũ - nền theo theme của bài (khung4tang.theme), huy hiệu dạng bài khi thiếu props.bia, dấu ? nổi,
// mọi nội dung chính nằm trong SAFE_ZONE_TIKTOK (AN_TOAN: x 130..950, y 212..1574), không blur. Props cũ giữ nguyên.
export {MAU_LOAI} from './theme';
import {MAU_LOAI} from './theme';
const LOI_MOI: Record<string, string> = {
  'Xác suất': 'BẠN ĐOÁN ĐÚNG KHÔNG?', 'Hình học': 'NHÌN HÌNH LÀ HIỂU', 'Tối ưu': 'CÁCH TIẾT KIỆM NHẤT?', 'Toán tiền bạc': 'TÍNH TIỀN CHO ĐÚNG', 'Đo đạc': 'ĐO MÀ KHÔNG CẦN THƯỚC',
  'Toán đi chợ': 'MUA SAO CHO LỜI?', 'Toán thực tế': 'GIẢI TRONG 60 GIÂY',
};

const Vien = ({co}: {co: number}) => ({WebkitTextStroke: vienChu(co), paintOrder: 'stroke fill' as const, textShadow: `0 ${co * 0.06}px 0 rgba(4,12,12,0.95), 0 ${co * 0.12}px ${co * 0.25}px rgba(0,0,0,0.6)`});

// huy hiệu dạng bài khi kịch bản chưa có props.bia (khớp khóa MAU_LOAI / LOI_MOI)
const nhanDang = (t: string): string => {
  const x = t.toLowerCase();
  if (/xác suất|bayes|tổ hợp/.test(x)) return 'Xác suất';
  if (/hình|tam giác|đường tròn|khối|chóp|lăng trụ/.test(x)) return 'Hình học';
  if (/tối ưu|lớn nhất|nhỏ nhất|parabol/.test(x)) return 'Tối ưu';
  return 'Toán thực tế';
};

export const AnhBia: React.FC<Props> = (props) => {
  const th = layTheme(props.khung4tang?.theme);
  const b = props.bia || {loai: nhanDang(`${props.tieuDe || ''} ${props.hookChu || ''}`), tieuDe: props.hookChu || props.tieuDe, khung: 60};
  const mau = MAU_LOAI[b.loai] || '#3BF2D0';
  const tu = String(b.tieuDe || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const nhan = (props.nhanManh || []).map((x) => x.toUpperCase()).filter((x) => x && tu.includes(x));
  const soKyTu = tu.length;
  const co = soKyTu > 42 ? 74 : soKyTu > 30 ? 88 : soKyTu > 20 ? 102 : 116;
  // tách tiêu đề thành các đoạn thường / đoạn nhấn mạnh
  const doan: {chu: string; nhan: boolean}[] = [];
  if (nhan.length) {
    const re = new RegExp('(' + nhan.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
    tu.split(re).filter(Boolean).forEach((p) => doan.push({chu: p, nhan: nhan.includes(p)}));
  } else doan.push({chu: tu, nhan: false});
  const coBrand = !!props.thuongHieu && !!(props.thuongHieu.ten || props.thuongHieu.logo);
  // ảnh bìa được chụp ĐÚNG khung hình b.khung (npx remotion still ... --frame=<khung>), nên video bên dưới tự ở đúng thời điểm
  const video = <Video {...props} anhBiaDau={null} intro={null} nhac={null} canh={props.canh.map((c) => ({...c, audio: ''}))} />;   // ảnh tĩnh: bỏ âm thanh và khung ảnh bìa đầu
  return (
    <AbsoluteFill style={{background: '#050b0d', fontFamily: FONT_DAM, overflow: 'hidden'}}>
      {/* nền studio nổi bật vùng giữa, không dựng lặp Video với blur toàn màn hình */}
      <AbsoluteFill style={{background: th ? `linear-gradient(180deg, ${th.tren} 0%, ${th.giua} 52%, ${th.duoi} 100%)` : '#050b0d'}} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 85% 58% at 50% 54%, ${mau}30 0%, ${th ? 'transparent' : '#09171b'} 55%, ${th ? 'transparent' : '#030709'} 100%)`}} />
      <AbsoluteFill style={{background: `radial-gradient(circle at 20% 18%, rgba(255,138,61,0.16), transparent 42%), radial-gradient(circle at 82% 84%, ${mau}22, transparent 44%)`}} />
      {/* ô kính chứa hình minh họa thật của đề (vùng sân khấu của video) */}
      <div style={{position: 'absolute', left: AN_TOAN.x0 - 70, right: 1080 - AN_TOAN.x1 - 70, top: 600, height: 800, borderRadius: 44, overflow: 'hidden', border: `5px solid ${mau}`,
        boxShadow: `0 0 60px ${mau}88, 0 0 0 10px rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.25)`, background: '#071113'}}>
        <div style={{position: 'absolute', left: -60, top: -470, width: 1080, height: 1920}}>{video}</div>
        {/* bài hình học dựng bằng Manim: hình đầy đủ (tô màu đại lượng) do Manim vẽ, đặt đúng vùng nội dung */}
        {props.manimLop && props.anhManimBia ? <Img src={staticFile(props.anhManimBia)} style={{position: 'absolute', left: -60, top: -330, width: 1080, height: 1920}} /> : null}
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,17,19,0) 75%, rgba(7,17,19,0.85) 100%)'}} />
      </div>
      {b.loai === 'Xác suất' ? <TrangTriXacSuat mau={mau} /> : null}
      {/* hàng nhãn trên cùng */}
      <div style={{position: 'absolute', top: AN_TOAN.y0, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18}}>
        {coBrand ? <LogoTron th={props.thuongHieu} co={84} sang={0.6} /> : null}
        {props.lop ? <span style={{background: '#3BF29A', color: '#062019', borderRadius: 14, padding: '6px 20px', fontSize: 44, fontWeight: 900}}>LỚP {props.lop}</span> : null}
        <span style={{background: mau, color: '#0a0a12', borderRadius: 14, padding: '6px 20px', fontSize: 44, fontWeight: 900, boxShadow: `0 0 30px ${mau}99`}}>{b.loai.toUpperCase()}</span>
        {props.series && props.series.tap ? <span style={{background: 'rgba(255,255,255,0.12)', color: '#fff', border: '3px solid rgba(255,255,255,0.5)', borderRadius: 14, padding: '3px 16px', fontSize: 40, fontWeight: 900}}>TẬP {props.series.tap}</span> : null}
      </div>
      {/* tiêu đề */}
      <div style={{position: 'absolute', top: 300, left: AN_TOAN.x0 - 40, right: 1080 - AN_TOAN.x1 - 40, height: 290, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
        <div style={{fontFamily: FONT_TIEU_DE, fontSize: co, fontWeight: 900, lineHeight: 1.12, color: '#fff', letterSpacing: -1, ...Vien({co})}}>
          {doan.map((d, i) =>
            d.nhan ? (
              <span key={i} style={{background: mau, color: '#0a0a12', borderRadius: co * 0.16, padding: `0 ${co * 0.14}px`, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', WebkitTextStroke: '0px', textShadow: 'none', boxShadow: `0 ${co * 0.07}px 0 rgba(0,0,0,0.55)`}}>{d.chu}</span>
            ) : (
              <span key={i}>{d.chu}</span>
            )
          )}
        </div>
      </div>
      {/* dấu ? nổi bật đè góc ô kính (thay dòng "ĐÁP ÁN: ???") */}
      <div style={{position: 'absolute', left: AN_TOAN.x1 - 190, top: 600 + 800 - 120, width: 170, height: 170, borderRadius: 85, background: mau, color: '#0a0a12', fontSize: 140, fontWeight: 900, lineHeight: '170px', textAlign: 'center',
        boxShadow: `0 0 0 12px ${mau}40, 0 14px 30px rgba(0,0,0,0.6)`}}>?</div>
      {/* lời mời gọi theo loại câu hỏi */}
      <div style={{position: 'absolute', top: 1432, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div style={{background: '#FF8A3D', color: '#1a0d02', fontSize: 54, fontWeight: 900, borderRadius: 22, padding: '8px 30px', transform: 'rotate(-2deg)', boxShadow: '0 8px 0 #a2470f, 0 14px 30px rgba(0,0,0,0.5)'}}>
          {LOI_MOI[b.loai] || 'GIẢI TRONG 60 GIÂY'}
        </div>
      </div>
      {props.thuongHieu && (props.thuongHieu.ten || props.thuongHieu.handle) ? (
        <div style={{position: 'absolute', top: 1522, left: 0, right: 0, textAlign: 'center', fontSize: 34, fontWeight: 800, color: 'rgba(255,255,255,0.85)'}}>
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
    <div style={{position: 'absolute', left: AN_TOAN.x0, top: 548, filter: `drop-shadow(0 18px 30px rgba(0,0,0,0.7)) drop-shadow(0 0 22px ${mau}66)`}}>
      <Xuc3D co={150} rx={-28} ry={38} vien={mau} />
    </div>
    <div style={{position: 'absolute', right: 1080 - AN_TOAN.x1, top: 1150, filter: 'drop-shadow(0 14px 24px rgba(0,0,0,0.7))', transform: 'rotate(14deg)'}}>
      <Xuc3D co={110} rx={-20} ry={-30} vien="#FF8A3D" />
    </div>
    <div style={{position: 'absolute', right: 1080 - AN_TOAN.x1, top: 470, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #F1E9FF 0%, ${mau} 55%, #7B5BE0 100%)`,
      border: '6px solid #ffffff', boxShadow: `0 0 40px ${mau}, 0 16px 30px rgba(0,0,0,0.6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(12deg)',
      fontSize: 50, fontWeight: 900, color: '#140a2a', fontStyle: 'italic'}}>P&nbsp;=&nbsp;?</div>
    {[0, 1, 2, 3].map((k) => (
      <div key={k} style={{position: 'absolute', left: AN_TOAN.x0 + 10 + k * 6, top: 1330 - k * 22, width: 120, height: 40, borderRadius: '50%', background: 'linear-gradient(180deg, #FFE27A, #E0A800)', border: '3px solid #8a6400', boxShadow: '0 6px 0 #8a6400'}} />
    ))}
    <div style={{position: 'absolute', left: AN_TOAN.x0 + 20, right: 1080 - AN_TOAN.x1 + 20, top: 1368, height: 26, borderRadius: 13, background: `linear-gradient(90deg, #FF5C61, #FFD54A, #3BF29A)`, boxShadow: '0 0 20px rgba(0,0,0,0.6)', border: '3px solid rgba(255,255,255,0.8)'}}>
      <div style={{position: 'absolute', left: '62%', top: -64, transform: 'translateX(-50%)', width: 70, height: 70, borderRadius: '50%', background: '#fff', color: '#140a2a', fontSize: 52, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 26px ${mau}`}}>?</div>
      <div style={{position: 'absolute', left: -6, top: 30, fontSize: 30, fontWeight: 900, color: '#fff'}}>0%</div>
      <div style={{position: 'absolute', right: -6, top: 30, fontSize: 30, fontWeight: 900, color: '#fff'}}>100%</div>
    </div>
  </>
);
