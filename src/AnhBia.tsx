import {TEN_THUONG_HIEU} from './theme';
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {FONT_DAM, FONT_TIEU_DE, vienChu} from './theme';
import {LogoTron, Xuc3D} from './dung_chung/TrangTriBia';
import {Props} from './types';
import {Video} from './Video';
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

// Lưới dọc ảnh bìa trong SAFE_ZONE_TIKTOK (y 212..1574): huy hiệu 212..296 | tiêu đề 318..614 | ô kính 640..1320 | lời mời 1378..1460 | tên kênh 1478..1520.
const TIEU_DE_TREN = 318, TIEU_DE_CAO = 296;
const VIDEO_Y = 398 - 16;             // T2 video bắt đầu y 398, chừa 16px trong ô kính
const KINH_TREN = 640, KINH_CAO = 680; // 648px T2 + 2 x 16px đệm

export const chonCoTieuDe = (tu: string): number => {
  const n = Math.max(1, tu.length);
  for (const co of [116, 102, 90, 80, 72, 64]) {
    const kyTuMoiDong = Math.max(6, Math.floor(820 / (co * 0.6)));
    const soDong = Math.ceil(n / kyTuMoiDong);
    if (soDong <= 3 && soDong * co * 1.12 <= TIEU_DE_CAO) return co;
  }
  return 60;
};

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
  // Cỡ tiêu đề theo SỐ DÒNG ước lượng (rộng 820 = SAFE_ZONE, ~0,6 em/ký tự chữ khối): tối đa 3 dòng và vừa hộp cao TIEU_DE_CAO,
  // không tràn lên hàng huy hiệu hay xuống ô kính (lỗi N2 kiểm toán phiên 3).
  const co = chonCoTieuDe(tu);
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
      {/* ô kính chứa ĐÚNG vùng T2 của video (y 398..1046) trong SAFE_ZONE x 130..950: không lộ thẻ T3/T4 (N3, T10) */}
      <div style={{position: 'absolute', left: AN_TOAN.x0, right: 1080 - AN_TOAN.x1, top: KINH_TREN, height: KINH_CAO, borderRadius: 40, overflow: 'hidden', border: `5px solid ${mau}`,
        boxShadow: `0 0 60px ${mau}88, 0 0 0 10px rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.25)`, background: th ? th.giua : '#071113'}}>
        {/* thu 92% quanh tâm T2 (540, 722): nhãn sát mép sân khấu (vd "A (kiến)") vẫn nằm trọn trong ô kính */}
        <div style={{position: 'absolute', inset: 0, transform: 'scale(0.92)', transformOrigin: `${540 - AN_TOAN.x0}px ${722 - VIDEO_Y}px`,
          clipPath: `inset(${398 - VIDEO_Y}px -60px ${KINH_CAO - (1046 - VIDEO_Y)}px -60px)`}}>
          <div style={{position: 'absolute', left: -AN_TOAN.x0, top: -VIDEO_Y, width: 1080, height: 1920}}>{video}</div>
          {/* bài hình học dựng bằng Manim: lớp hình 1080x1920 ghép đè 0:0 như khi dựng thật -> cùng độ lệch với video */}
          {props.manimLop && props.anhManimBia ? <Img src={staticFile(props.anhManimBia)} style={{position: 'absolute', left: -AN_TOAN.x0, top: -VIDEO_Y, width: 1080, height: 1920}} /> : null}
        </div>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,17,19,0) 78%, rgba(7,17,19,0.85) 100%)'}} />
      </div>
      {b.loai === 'Xác suất' ? <TrangTriXacSuat mau={mau} /> : null}
      {/* hàng nhãn trên cùng */}
      <div style={{position: 'absolute', top: AN_TOAN.y0, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18}}>
        {coBrand ? <LogoTron th={{...props.thuongHieu, ten: TEN_THUONG_HIEU, logo: null}} co={84} sang={0.6} /> : null}
        {props.lop ? <span style={{background: '#3BF29A', color: '#062019', borderRadius: 14, padding: '6px 20px', fontSize: 44, fontWeight: 900}}>LỚP {props.lop}</span> : null}
        <span style={{background: mau, color: '#0a0a12', borderRadius: 14, padding: '6px 20px', fontSize: 44, fontWeight: 900, boxShadow: `0 0 30px ${mau}99`}}>{b.loai.toUpperCase()}</span>
        {props.series && props.series.tap ? <span style={{background: 'rgba(255,255,255,0.12)', color: '#fff', border: '3px solid rgba(255,255,255,0.5)', borderRadius: 14, padding: '3px 16px', fontSize: 40, fontWeight: 900}}>TẬP {props.series.tap}</span> : null}
      </div>
      {/* tiêu đề */}
      <div style={{position: 'absolute', top: TIEU_DE_TREN, left: AN_TOAN.x0, right: 1080 - AN_TOAN.x1, height: TIEU_DE_CAO, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
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
      <div style={{position: 'absolute', left: AN_TOAN.x1 - 168, top: KINH_TREN + KINH_CAO - 118, width: 150, height: 150, borderRadius: 75, background: mau, color: '#0a0a12', fontSize: 124, fontWeight: 900, lineHeight: '150px', textAlign: 'center',
        boxShadow: `0 0 0 12px ${mau}40, 0 14px 30px rgba(0,0,0,0.6)`}}>?</div>
      {/* lời mời gọi theo loại câu hỏi */}
      <div style={{position: 'absolute', top: KINH_TREN + KINH_CAO + 58, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div style={{background: '#FF8A3D', color: '#1a0d02', fontSize: 54, fontWeight: 900, borderRadius: 22, padding: '8px 30px', transform: 'rotate(-2deg)', boxShadow: '0 8px 0 #a2470f, 0 14px 30px rgba(0,0,0,0.5)'}}>
          {LOI_MOI[b.loai] || 'GIẢI TRONG 60 GIÂY'}
        </div>
      </div>
      {props.thuongHieu && (props.thuongHieu.ten || props.thuongHieu.handle) ? (
        <div style={{position: 'absolute', top: KINH_TREN + KINH_CAO + 158, left: 0, right: 0, textAlign: 'center', fontSize: 34, fontWeight: 800, color: 'rgba(255,255,255,0.85)'}}>
          {TEN_THUONG_HIEU}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ẢNH BÌA XÁC SUẤT: thêm xúc xắc 3D nổi ở góc khung, chồng xu, nhãn tròn "P = ?" nghiêng và thanh đo 0%-100% có dấu hỏi
// (người xem nhận ra ngay đây là bài xác suất, khung hình bớt trống, có điểm nhìn).
const TrangTriXacSuat: React.FC<{mau: string}> = ({mau}) => (
  <>
    {/* N5: chỉ 2 điểm nhấn ở góc ô kính, không chạm vùng tiêu đề (y < 640) và không che sân khấu: xúc xắc góc dưới trái, nhãn P = ? góc trên phải */}
    <div style={{position: 'absolute', left: AN_TOAN.x0 + 6, top: KINH_TREN + KINH_CAO - 132, filter: `drop-shadow(0 18px 30px rgba(0,0,0,0.7)) drop-shadow(0 0 22px ${mau}66)`}}>
      <Xuc3D co={124} rx={-28} ry={38} vien={mau} />
    </div>
    <div style={{position: 'absolute', right: 1080 - AN_TOAN.x1 + 16, top: KINH_TREN + 18, width: 128, height: 128, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #F1E9FF 0%, ${mau} 55%, #7B5BE0 100%)`,
      border: '5px solid #ffffff', boxShadow: `0 0 34px ${mau}, 0 14px 26px rgba(0,0,0,0.6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(12deg)',
      fontSize: 42, fontWeight: 900, color: '#140a2a', fontStyle: 'italic'}}>P&nbsp;=&nbsp;?</div>
  </>
);
