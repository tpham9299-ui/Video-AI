import React from 'react';
import {useCurrentFrame} from 'remotion';
import {expoOut} from '../sankhau/chuyendong';
import {kep} from '../sankhau/donghieu';
import {DuLieuSanKhau} from '../sankhau/dulieu';

// KHÔNG GIAN 3D TỰ ĐỘNG (bộ hiệu ứng mới, học từ video "đếm tam giác" và "bí kíp Casio"):
//  - "nam": hình học/hình tự do NẰM trên một bàn kính có bề dày, máy quay nghiêng xuống và xoay quanh chậm;
//           hình tô màu được đùn nổi thành khối (bông tuyết thành hòn đảo có bề dày).
//  - "the": danh sách / biểu đồ / đồ thị / số đếm là tấm thẻ lơ lửng trong không gian: lật xoay vào, đung đưa nhẹ.
//  - "khong": cảnh đã tự dùng máy chiếu 3D của sân khấu (vật 3D, goc_3d) thì giữ nguyên.

export type Kieu3D = 'nam' | 'the' | 'khong';
const VAT_NAM = ['hinh_tu_do', 'hinh_hoc', 'luoi_o'];
const VAT_THE = ['danh_sach', 'bieu_do_cot', 'do_thi', 'so_dem', 'nhan', 'chu', 'thanh', 'dong_ho_do', 'mui_ten'];
const VAT_3D_RIENG = ['khoi_hop', 'tru', 'non', 'cau', 'toa_nha', 'xe', 'cay', 'thang'];
// vật cần đọc rõ: trên bàn 3D vẫn ĐỨNG THẲNG (dựng riêng, đặt đúng chỗ chiếu của nó trên bàn)
export const VAT_DUNG = ['so_dem', 'danh_sach', 'bieu_do_cot', 'do_thi'];

export function phanLoai3D(du: DuLieuSanKhau | null): Kieu3D {
  if (!du || !du.vat.length) return 'khong';
  if (du.gocDau || du.hanhDong.some((h) => h.kieu === 'goc_3d') || du.vat.some((v) => VAT_3D_RIENG.includes(v.loai))) return 'khong';
  if (du.vat.some((v) => VAT_NAM.includes(v.loai))) return 'nam';
  if (du.vat.every((v) => VAT_THE.includes(v.loai))) return 'the';
  return 'khong';
}

// ngữ cảnh cho HinhTuDo: có đang nằm trên bàn 3D không (để đùn khối)
export const KhongGian3D = React.createContext<{nam: boolean; doDay: number; xoay: number}>({nam: false, doDay: 0, xoay: 0});

export const toiMau = (hex: string, k: number) => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = (v: number) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`;
};

// góc máy cho cảnh "nam": vào từ góc cao + lệch rồi hạ dần, sau đó trôi xoay rất chậm (không bao giờ đứng im).
// Phần trôi tính theo khung hình TUYỆT ĐỐI của video, để hai cảnh nối tiếp cùng sân khấu không bị giật góc.
export const NGHIENG_NAM = 28;
export function gocMayNam(f: number, fTuyetDoi: number, vaoMoi: boolean, kichTinh: boolean) {
  const e = vaoMoi ? expoOut(kep(f / 34)) : 1;
  const nghieng = NGHIENG_NAM + (kichTinh ? 26 : 16) * (1 - e) + 1.8 * Math.sin(fTuyetDoi / 47);
  const xoay = (kichTinh ? -34 : -15) * (1 - e) + 7 * Math.sin(fTuyetDoi / 95);
  return {nghieng, xoay, e};
}
// vị trí trên màn hình (so với tâm sân khấu) của một điểm nằm trên bàn 3D: dùng để đặt lóe sáng đúng chỗ
export function chieuNam(dx: number, dy: number, w: number, h: number, nghieng: number, xoay: number) {
  const s = 0.93;
  const a = (xoay * Math.PI) / 180;
  const n = (nghieng * Math.PI) / 180;
  const x1 = (dx * Math.cos(a) - dy * Math.sin(a)) * s;
  const y1 = (dx * Math.sin(a) + dy * Math.cos(a)) * s;
  const y2 = y1 * Math.cos(n);
  const z2 = y1 * Math.sin(n);
  const d = 1900;
  const oy = 0.1 * h - h / 2; // gốc phối cảnh (perspectiveOrigin 50% 10%)
  const k = d / (d - z2);
  return {x: x1 * k, y: oy + (y2 - h * 0.03 - oy) * k};
}

export const BanKinh3D: React.FC<{w: number; h: number; mau: string; nghieng: number; xoay: number; doDay?: number; children: React.ReactNode; nen?: React.ReactNode}> = ({w, h, mau, nghieng, xoay, doDay = 30, children, nen}) => {
  const L = 34; // lề bàn quanh hình
  const canh = (style: React.CSSProperties) => <div style={{position: 'absolute', ...style}} />;
  return (
    <div style={{position: 'absolute', inset: 0, perspective: 1900, perspectiveOrigin: '50% 10%'}}>
      <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `translateY(${-h * 0.03}px) rotateX(${nghieng}deg) rotateZ(${xoay}deg) scale(0.93)`}}>
        {/* mặt bàn kính + lưới mờ */}
        {canh({left: -L, right: -L, top: -L, bottom: -L, borderRadius: 40, transform: 'translateZ(0px)',
          background: `radial-gradient(ellipse at 50% 45%, ${mau}1f 0%, rgba(10,24,28,0.55) 60%, rgba(6,14,16,0.75) 100%)`,
          border: `2px solid ${mau}55`, boxShadow: `0 0 60px ${mau}33, inset 0 0 50px ${mau}14`})}
        <svg width={w + 2 * L} height={h + 2 * L} style={{position: 'absolute', left: -L, top: -L, transform: 'translateZ(0.5px)', opacity: 0.32}}>
          {Array.from({length: 11}, (_, i) => <line key={`d${i}`} x1={((w + 2 * L) * (i + 0.5)) / 11} y1={8} x2={((w + 2 * L) * (i + 0.5)) / 11} y2={h + 2 * L - 8} stroke={mau} strokeWidth={1} strokeOpacity={0.35} />)}
          {Array.from({length: 9}, (_, i) => <line key={`n${i}`} x1={8} y1={((h + 2 * L) * (i + 0.5)) / 9} x2={w + 2 * L - 8} y2={((h + 2 * L) * (i + 0.5)) / 9} stroke={mau} strokeWidth={1} strokeOpacity={0.35} />)}
        </svg>
        {/* bốn cạnh bàn (bề dày) */}
        {canh({left: -L + 20, right: -L + 20, top: h + L - 1, height: doDay, transformOrigin: '50% 0', transform: 'rotateX(-90deg)', background: `linear-gradient(180deg, ${mau}99, ${toiMau(mau, 0.25)} 70%, #02080a)`, borderRadius: 4})}
        {canh({left: -L + 20, right: -L + 20, top: -L - doDay + 1, height: doDay, transformOrigin: '50% 100%', transform: 'rotateX(90deg)', background: `linear-gradient(0deg, ${mau}66, #02080a)`})}
        {canh({left: -L - doDay + 1, width: doDay, top: -L + 20, bottom: -L + 20, transformOrigin: '100% 50%', transform: 'rotateY(-90deg)', background: `linear-gradient(270deg, ${mau}88, #02080a)`})}
        {canh({left: w + L - 1, width: doDay, top: -L + 20, bottom: -L + 20, transformOrigin: '0 50%', transform: 'rotateY(90deg)', background: `linear-gradient(90deg, ${mau}88, #02080a)`})}
        {nen ? <div style={{position: 'absolute', inset: 0, transform: 'translateZ(1px)'}}>{nen}</div> : null}
        <div style={{position: 'absolute', inset: 0, transform: 'translateZ(3px)'}}>{children}</div>
      </div>
    </div>
  );
};

// tấm thẻ lơ lửng: lật xoay vào (vaoMoi), đung đưa nhẹ, bóng mờ dưới chân
export const The3D: React.FC<{f: number; vaoMoi: boolean; h: number; children: React.ReactNode}> = ({f, vaoMoi, h, children}) => {
  const e = vaoMoi ? expoOut(kep((f - 2) / 20)) : 1;
  const ry = -64 * (1 - e) + 7 * Math.sin(f / 38);
  const rx = 4 + 12 * (1 - e) + 2 * Math.sin(f / 53);
  const tz = -260 * (1 - e);
  return (
    <div style={{position: 'absolute', inset: 0, perspective: 1500}}>
      <div style={{position: 'absolute', left: '15%', right: '15%', top: h * 0.86, height: 70, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%)', transform: `scaleX(${0.8 + 0.2 * e})`, opacity: e}} />
      <div style={{position: 'absolute', inset: 0, transform: `translateZ(${tz}px) rotateY(${ry}deg) rotateX(${rx}deg)`, transformOrigin: '50% 50%'}}>{children}</div>
    </div>
  );
};

// LƯỚI SÀN PHỐI CẢNH ở nửa dưới màn hình (như hai video mẫu): đường hội tụ về chân trời, các vạch ngang trôi về phía người xem
export const LuoiSan: React.FC<{mau: string; tu?: number}> = ({mau, tu = 0}) => {
  const f = useCurrentFrame();
  const mo = kep((f - tu) / 20) * 0.75;
  if (mo <= 0) return null;
  const Y0 = 1180; // chân trời
  const VX = 540;
  const doc: React.ReactNode[] = [];
  for (let i = -12; i <= 12; i++) {
    const xd = VX + i * 150;
    doc.push(<line key={`d${i}`} x1={VX + i * 18} y1={Y0} x2={xd + i * 260} y2={1920} stroke={mau} strokeWidth={1.4} strokeOpacity={0.5} />);
  }
  const ngang: React.ReactNode[] = [];
  const troi = (f * 0.012) % 1;
  for (let k = 0; k < 14; k++) {
    const z = (k + 1 - troi) / 14; // 0 = chân trời, 1 = sát người xem
    const y = Y0 + (1920 - Y0) * Math.pow(z, 2.2);
    ngang.push(<line key={`n${k}`} x1={0} y1={y} x2={1080} y2={y} stroke={mau} strokeWidth={1 + 1.5 * z} strokeOpacity={0.15 + 0.5 * z} />);
  }
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: mo, pointerEvents: 'none'}}>
      <defs>
        <linearGradient id="mo_luoi" x1="0" y1={Y0} x2="0" y2={1920} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.35" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0.7} />
        </linearGradient>
        <mask id="mat_luoi">
          <rect x={0} y={Y0} width={1080} height={1920 - Y0} fill="url(#mo_luoi)" />
        </mask>
      </defs>
      <rect x={0} y={Y0 - 90} width={1080} height={180} fill={`url(#chan_troi)`} opacity={0.6} />
      <radialGradient id="chan_troi" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor={mau} stopOpacity={0.35} />
        <stop offset="1" stopColor={mau} stopOpacity={0} />
      </radialGradient>
      <g mask="url(#mat_luoi)">
        {doc}
        {ngang}
      </g>
    </svg>
  );
};
