import {FONT_DAM} from '../theme';
import {NguoiCuDong} from './NguoiCuDong';
import React from 'react';

// THƯ VIỆN VẬT THỰC TẾ (nét "vat" của hinh_tu_do): vẽ ĐÚNG vật của đề (cột cờ, ngân hàng, tòa nhà, cây, người quan sát,
// mặt trời, hải đăng...) thay vì thay bằng khối hộp/khối trụ vô nghĩa. Vật đặt theo ĐIỂM CHÂN (goc) và CHIỀU CAO (cao) trong
// cùng khung tọa độ với các nét hình học, nên đường đo chiều cao, tia nhìn, góc nâng... khớp đúng vào vật.
// Mỗi hàm vẽ trong hộp đơn vị: chân vật ở (0,0), chiều cao 100, trục y hướng LÊN là số âm. Có nhịp chuyển động nhẹ (cờ bay,
// tia sáng quét, khói, nước chảy) theo thời gian t (giây).

export const TEN_VAT_THUC = [
  'cot_co', 'nguoi', 'toa_nha', 'ngan_hang', 'nha', 'truong_hoc', 'cay', 'cay_thong', 'hai_dang', 'thap_nuoc', 'cot_dien', 'den_duong',
  'nui', 'mat_troi', 'xe_hoi', 'thuyen', 'may_bay', 'khinh_khi_cau', 'cau', 'song', 'thang', 'tien', 'heo_dat', 'dieu', 'tuong', 'ho_nuoc',
  'hang_rao', 'cong_trinh', 'cua_hang', 'xe_may', 'xe_dap', 'xe_buyt', 'con_duong', 'qua_bong', 'ro_bong_ro', 'gieng', 'cong', 'bieu_tuong',
  'ban', 'ghe', 'ti_vi', 'kim_tu_thap', 'thap',
] as const;
export type TenVatThuc = (typeof TEN_VAT_THUC)[number];

// tỉ lệ rộng/cao của từng vật (để ước lượng chỗ đặt nhãn, né chữ); cau/song/ho_nuoc/tuong dùng "rong" riêng
export const TI_LE_RONG: Record<string, number> = {
  cot_co: 0.32, nguoi: 0.36, toa_nha: 0.5, ngan_hang: 1.05, nha: 1.05, truong_hoc: 1.5, cay: 0.75, cay_thong: 0.6, hai_dang: 0.4, thap_nuoc: 0.55,
  cot_dien: 0.5, den_duong: 0.45, nui: 1.8, mat_troi: 1, xe_hoi: 2.4, thuyen: 1.6, may_bay: 2.2, khinh_khi_cau: 0.75, cau: 3, song: 3, thang: 0.5,
  tien: 1.3, heo_dat: 1.35, dieu: 0.7, tuong: 1, ho_nuoc: 3,
  hang_rao: 3, cong_trinh: 0.9, cua_hang: 1.1, xe_may: 1.9, xe_dap: 1.7, xe_buyt: 3, con_duong: 4, qua_bong: 1, ro_bong_ro: 0.45, gieng: 0.9, cong: 1.2, bieu_tuong: 1,
  ban: 1.7, ghe: 0.55, ti_vi: 1.6, kim_tu_thap: 1.6, thap: 0.42,
};

type P = {mau: string; t: number; rong: number; nen: string; bien: string; emoji: string; dongTac?: string; gocChi?: number};
const VANG = '#FFD54A', DO = '#FF4D5E', TRANG = '#EAF6F4', XAM = '#9FB3B0', XANH_LA = '#3BF29A', XANH = '#4FC3F7', NAU = '#C08552';

const sao5 = (cx: number, cy: number, r: number) =>
  Array.from({length: 10}, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    return `${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`;
  }).join(' ');

const VE: Record<TenVatThuc, (p: P) => React.ReactNode> = {
  // CỘT CỜ: bệ 2 bậc, cột mảnh, quả cầu đỉnh, lá cờ đỏ sao vàng bay phấp phới
  cot_co: ({mau, t}) => {
    const s = (k: number) => Math.sin(t * 3.2 + k) * 2.2;
    const co = `M1.8 -95 C 8 ${-97 + s(0)}, 14 ${-93 + s(1)}, 20 ${-95 + s(2)} S 30 ${-96 + s(3)}, 32 ${-95 + s(3)} L 32 ${-80 + s(3)} C 26 ${-81 + s(2)}, 20 ${-78 + s(2)}, 14 ${-80 + s(1)} S 6 ${-81 + s(0)}, 1.8 -80 Z`;
    return (
      <g>
        <rect x={-15} y={-6} width={30} height={6} rx={1} fill={`${mau}33`} stroke={mau} strokeWidth={1.2} />
        <rect x={-10} y={-11} width={20} height={5} rx={1} fill={`${mau}44`} stroke={mau} strokeWidth={1.2} />
        <rect x={-1.8} y={-96} width={3.6} height={85} fill={`url(#kimLoai)`} stroke={TRANG} strokeWidth={0.6} />
        <circle cx={0} cy={-97.5} r={2.8} fill={VANG} />
        <path d={co} fill={DO} stroke="#ffb3b9" strokeWidth={0.5} />
        <polygon points={sao5(16.5, -87.5 + s(1.5) * 0.6, 4)} fill={VANG} />
        <line x1={2.2} y1={-95} x2={2.2} y2={-10} stroke={TRANG} strokeWidth={0.4} opacity={0.5} />
      </g>
    );
  },
  // NGƯỜI QUAN SÁT (nhìn nghiêng, mặt hướng phải): mắt ở 93% chiều cao
  // NGƯỜI có khớp tay chân, cử động theo động tác (đứng thở, đi bộ, chỉ tay theo tia nhìn, ngước nhìn, vẫy tay...)
  nguoi: ({mau, t, dongTac, gocChi}) => <NguoiCuDong dongTac={dongTac || 'dung'} t={t} mauAo={mau || '#FF8A3D'} gocChi={gocChi} />,
  // TÒA NHÀ CAO TẦNG 3D: mặt chính + mặt bên 3D phối cảnh + mái 3D + lưới cửa sổ sáng đèn + ăng-ten đỉnh
  toa_nha: ({mau, t}) => {
    const cs: React.ReactNode[] = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 4; c++) {
      const sang = ((r * 7 + c * 3) % 5) > 1;
      cs.push(<rect key={`${r}_${c}`} x={-21 + c * 9.5} y={-88 + r * 9.4} width={5.8} height={5.6} rx={0.8} fill={sang ? VANG : '#1e323b'} opacity={sang ? 0.92 : 0.85} />);
    }
    const csBen: React.ReactNode[] = [];
    for (let r = 0; r < 9; r++) {
      const sang = (r * 3) % 4 > 0;
      csBen.push(<polygon key={`b_${r}`} points={`20,${-87 + r * 9.4} 31,${-92 + r * 9.4} 31,${-86.5 + r * 9.4} 20,${-81.5 + r * 9.4}`} fill={sang ? '#d4a82a' : '#132026'} opacity={0.85} />);
    }
    return (
      <g>
        {/* Mặt bên 3D (chiều sâu khối) */}
        <polygon points="18,-94 34,-101 34,-7 18,0" fill="#162836" stroke={mau} strokeWidth={1.2} />
        {/* Mái 3D */}
        <polygon points="-24,-94 -8,-101 34,-101 18,-94" fill={`${mau}66`} stroke={mau} strokeWidth={1.2} />
        {/* Mặt tiền chính */}
        <rect x={-24} y={-94} width={42} height={94} rx={1} fill="url(#khoi3DTruoc)" stroke={mau} strokeWidth={1.8} />
        {cs}
        {csBen}
        <line x1={3} y1={-97} x2={3} y2={-105} stroke={TRANG} strokeWidth={1.6} />
        <circle cx={3} cy={-105} r={2} fill={DO} opacity={0.4 + 0.6 * (Math.sin(t * 5) > 0 ? 1 : 0)} />
      </g>
    );
  },
  // NGÂN HÀNG 3D: mặt tiền cổ điển + khối bên 3D + bậc thềm 3D + cột trụ nổi khối
  ngan_hang: ({mau}) => (
    <g>
      <polygon points="48,-72 64,-80 64,-6 48,0" fill="#182a38" stroke={mau} strokeWidth={1.1} />
      <polygon points="0,-100 16,-107 64,-80 48,-72" fill={`${mau}55`} stroke={mau} strokeWidth={1.2} />
      <rect x={-52} y={-7} width={104} height={7} fill={`${mau}55`} stroke={mau} strokeWidth={1.2} />
      <rect x={-48} y={-13} width={96} height={6} fill={`${mau}77`} stroke={mau} strokeWidth={1.2} />
      <rect x={-46} y={-62} width={92} height={49} fill="#0f202c" opacity={0.85} />
      {[-38, -19, 0, 19, 38].map((x) => (
        <g key={x}>
          <rect x={x - 4.5} y={-62} width={9} height={49} fill="url(#kimLoai)" stroke={TRANG} strokeWidth={0.9} />
          <line x1={x - 1.5} y1={-60} x2={x - 1.5} y2={-15} stroke="#445" strokeWidth={0.6} opacity={0.6} />
        </g>
      ))}
      <rect x={-54} y={-75} width={108} height={14} fill={mau} stroke={TRANG} strokeWidth={1.2} />
      <text data-kd-bo="1" x={0} y={-64} textAnchor="middle" fontSize={11.5} fontWeight={900} fill="#0b0b18" fontFamily={FONT_DAM} letterSpacing={0.5}>NGÂN HÀNG</text>
      <polygon points="-54,-72 0,-100 54,-72" fill="url(#khoi3DTruoc)" stroke={mau} strokeWidth={1.6} />
      <circle cx={0} cy={-84} r={7.5} fill={VANG} stroke="#a77b00" strokeWidth={1.2} />
      <text data-kd-bo="1" x={0} y={-81} textAnchor="middle" fontSize={9.5} fontWeight={900} fill="#5a3d00" fontFamily={FONT_DAM}>₫</text>
    </g>
  ),
  nha: ({mau}) => (
    <g>
      {/* Tường bên hông 3D */}
      <polygon points="34,-55 54,-65 54,-8 34,0" fill="#1d2f3a" stroke={mau} strokeWidth={1.3} />
      {/* Mái ngói nghiêng 3D */}
      <polygon points="0,-100 22,-108 60,-63 42,-55" fill="#b83240" stroke={DO} strokeWidth={1.3} />
      {/* Tường mặt tiền */}
      <rect x={-38} y={-55} width={72} height={55} fill="url(#khoi3DTruoc)" stroke={mau} strokeWidth={1.6} />
      <polygon points="-46,-55 0,-100 42,-55" fill={`${DO}cc`} stroke={DO} strokeWidth={1.6} />
      <rect x={-10} y={-32} width={18} height={32} fill={`${NAU}cc`} stroke={TRANG} strokeWidth={1.1} />
      <rect x={-31} y={-44} width={15} height={14} fill={`${VANG}dd`} stroke={TRANG} strokeWidth={1.1} />
      <rect x={14} y={-44} width={15} height={14} fill={`${VANG}dd`} stroke={TRANG} strokeWidth={1.1} />
    </g>
  ),
  truong_hoc: ({mau, t}) => (
    <g>
      {/* Tường bên hông 3D */}
      <polygon points="75,-60 95,-70 95,-8 75,0" fill="#1b2a36" stroke={mau} strokeWidth={1.2} />
      <polygon points="0,-86 20,-96 95,-70 75,-60" fill="url(#maiNgoi)" stroke={DO} strokeWidth={1.2} />
      {/* Mặt tiền trường học */}
      <rect x={-75} y={-60} width={150} height={60} fill="url(#khoi3DTruoc)" stroke={mau} strokeWidth={1.6} />
      <polygon points="-80,-60 0,-86 75,-60" fill="url(#maiNgoi)" stroke={DO} strokeWidth={1.4} />
      {/* Tháp đồng hồ trung tâm */}
      <rect x={-14} y={-95} width={28} height={20} fill="#182c38" stroke={mau} strokeWidth={1} />
      <circle cx={0} cy={-85} r={7} fill="#ffffff" stroke="#334155" strokeWidth={1.2} />
      <line x1={0} y1={-85} x2={0} y2={-89} stroke="#0f172a" strokeWidth={1.2} strokeLinecap="round" />
      <line x1={0} y1={-85} x2={3} y2={-85} stroke="#0f172a" strokeWidth={1.2} strokeLinecap="round" />
      {/* Lưới cửa sổ kính phản quang */}
      {[-62, -44, -26, 26, 44, 62].map((x) => (
        <g key={x}>
          <rect x={x - 6} y={-52} width={12} height={12} rx={1} fill="url(#kinhXe)" stroke={TRANG} strokeWidth={0.8} />
          <line x1={x} y1={-52} x2={x} y2={-40} stroke="#ffffff" strokeWidth={0.5} opacity={0.6} />
          <rect x={x - 6} y={-32} width={12} height={12} rx={1} fill="url(#kinhXe)" stroke={TRANG} strokeWidth={0.8} />
          <line x1={x} y1={-32} x2={x} y2={-20} stroke="#ffffff" strokeWidth={0.5} opacity={0.6} />
        </g>
      ))}
      {/* Sảnh chính & Bậc tam cấp */}
      <rect x={-16} y={-6} width={32} height={6} fill="#334155" stroke="#64748b" strokeWidth={1} />
      <rect x={-12} y={-28} width={24} height={28} rx={2} fill={`${NAU}dd`} stroke={TRANG} strokeWidth={1.1} />
      {/* Cột cờ trường học */}
      <line x1={0} y1={-95} x2={0} y2={-112} stroke="url(#kimLoai)" strokeWidth={1.5} />
      <path d={`M0 -112 L${12 + Math.sin(t * 3.5) * 1.5} -109 L0 -106 Z`} fill={DO} />
    </g>
  ),
  cay: ({mau, t}) => {
    const l = Math.sin(t * 1.4) * 2.2;
    return (
      <g>
        {/* Thân cây gỗ vân tự nhiên có chia nhánh */}
        <path d="M-6 0 C -5 -25, -7 -45, -4 -60 L -1 -60 C -2 -40, 1 -20, 6 0 Z" fill="url(#goThan)" stroke="#38200d" strokeWidth={1.1} />
        <path d="M-4 -45 C -12 -54, -18 -60, -22 -62 L -20 -64 C -16 -62, -10 -55, -2 -48 Z" fill="url(#goThan)" />
        <path d="M-2 -40 C 6 -48, 14 -52, 20 -55 L 19 -57 C 13 -54, 5 -50, -1 -43 Z" fill="url(#goThan)" />
        {/* Tán lá đa tầng 3D đổ bóng */}
        <g transform={`translate(${l} 0)`}>
          <circle cx={-18} cy={-62} r={22} fill="url(#tanLa3D)" stroke={mau || '#1e8a4a'} strokeWidth={1.4} style={{filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.35))'}} />
          <circle cx={20} cy={-64} r={23} fill="url(#tanLa3D)" stroke={mau || '#1e8a4a'} strokeWidth={1.4} style={{filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.35))'}} />
          <circle cx={0} cy={-82} r={28} fill="url(#tanLa3D)" stroke={mau || '#1e8a4a'} strokeWidth={1.6} style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'}} />
          <circle cx={-6} cy={-90} r={8} fill="#ffffff" opacity={0.16} />
        </g>
      </g>
    );
  },
  cay_thong: ({mau, t}) => {
    const l = Math.sin(t * 1.2) * 1.5;
    return (
      <g>
        <rect x={-4} y={-18} width={8} height={18} fill="url(#goThan)" stroke="#2b1708" strokeWidth={1} />
        <g transform={`translate(${l} 0)`}>
          {/* 3 tầng lá thông hình nón kim tự tháp xếp lớp */}
          <polygon points="-36,-16 0,-48 36,-16" fill="#134e4a" stroke={mau || '#2dd4bf'} strokeWidth={1.3} style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />
          <polygon points="-28,-40 0,-70 28,-40" fill="#115e59" stroke={mau || '#2dd4bf'} strokeWidth={1.3} style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />
          <polygon points="-20,-62 0,-92 20,-62" fill="#0f766e" stroke={mau || '#5eead4'} strokeWidth={1.4} style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />
          <polygon points="-16,-62 0,-92 0,-62" fill="#ffffff" opacity={0.14} />
        </g>
      </g>
    );
  },
  // HẢI ĐĂNG: thân thon sọc đỏ trắng đổ bóng trụ tròn 3D, phòng đèn kính, luồng sáng quét volumetric
  hai_dang: ({mau, t}) => {
    const g = Math.sin(t * 1.6) * 35;
    const gocRad = (g * Math.PI) / 180;
    return (
      <g>
        {/* Luồng sáng quét đa hướng ban đêm */}
        <polygon points={`0,-88 ${-90 * Math.cos(gocRad)},${-88 - 24} ${-90 * Math.cos(gocRad)},${-88 + 24}`} fill="url(#luongSang)" opacity={0.42} />
        <polygon points={`0,-88 ${90 * Math.cos(gocRad)},${-88 - 24} ${90 * Math.cos(gocRad)},${-88 + 24}`} fill="url(#luongSang)" opacity={0.42} />
        {/* Thân tháp hải đăng đổ bóng trụ tròn 3D */}
        <polygon points="-18,0 18,0 11,-78 -11,-78" fill="url(#thanHaiDang)" stroke="#475569" strokeWidth={1.2} />
        {/* Các dải sọc đỏ nhận diện hàng hải */}
        <polygon points="-17.2,-10 17.2,-10 15.6,-26 -15.6,-26" fill="url(#maiNgoi)" />
        <polygon points="-14.8,-42 14.8,-42 13.2,-58 -13.2,-58" fill="url(#maiNgoi)" />
        {/* Lan can ban công quan sát */}
        <rect x={-15} y={-81} width={30} height={4} rx={1} fill="url(#kimLoai)" stroke="#1e293b" strokeWidth={1} />
        <line x1={-13} y1={-85} x2={13} y2={-85} stroke="#cbd5e1" strokeWidth={1.2} />
        {/* Phòng đèn kính trong suốt */}
        <rect x={-9} y={-93} width={18} height={12} rx={1} fill="url(#kinhXe)" stroke="#0f172a" strokeWidth={1.1} />
        <circle cx={0} cy={-87} r={4.5} fill={VANG} style={{filter: 'drop-shadow(0 0 8px #FFD54A)'}} />
        {/* Mái vòm nóc hải đăng */}
        <polygon points="-12,-93 0,-102 12,-93" fill="url(#maiNgoi)" stroke="#991b1b" strokeWidth={1} />
        <circle cx={0} cy={-102.5} r={1.8} fill={VANG} />
      </g>
    );
  },
  thap_nuoc: ({mau}) => (
    <g stroke={mau} strokeWidth={1.4}>
      <path d="M-20 0 L-12 -62 M20 0 L12 -62 M-17 -20 L17 -40 M17 -20 L-17 -40" fill="none" />
      <rect x={-26} y={-92} width={52} height={30} rx={6} fill={`${XANH}44`} />
      <polygon points="-28,-92 0,-100 28,-92" fill={`${mau}55`} />
    </g>
  ),
  cot_dien: ({mau}) => (
    <g stroke={mau} strokeWidth={1.4} fill="none">
      <rect x={-2.5} y={-100} width={5} height={100} fill={`${XAM}88`} />
      <path d="M-22 -90 L22 -90 M-16 -78 L16 -78" strokeWidth={2.2} />
      {[-20, -8, 8, 20].map((x) => <circle key={x} cx={x} cy={-93} r={1.8} fill={TRANG} />)}
      <path d="M-22 -90 Q -60 -82 -100 -90 M22 -90 Q 60 -82 100 -90" strokeWidth={0.8} opacity={0.6} />
    </g>
  ),
  den_duong: ({mau, t}) => (
    <g>
      <polygon points="18,-92 4,0 34,0" fill={VANG} opacity={0.24 + 0.05 * Math.sin(t * 6)} />
      <rect x={-2} y={-96} width={4} height={96} fill={`${XAM}aa`} stroke={mau} strokeWidth={0.8} />
      <path d="M0 -96 Q 0 -100 8 -100 L 22 -100" stroke={mau} strokeWidth={2.4} fill="none" />
      <path d="M12 -100 L 26 -100 L 22 -93 L 14 -93 Z" fill={VANG} stroke={mau} strokeWidth={0.8} />
    </g>
  ),
  nui: ({mau}) => (
    <g>
      <polygon points="-90,0 -30,-100 30,0" fill={`${mau}33`} stroke={mau} strokeWidth={1.6} />
      <polygon points="-20,0 40,-70 95,0" fill={`${mau}22`} stroke={mau} strokeWidth={1.4} />
      <polygon points="-42,-80 -30,-100 -18,-80 -26,-84 -33,-78" fill={TRANG} opacity={0.9} />
    </g>
  ),
  // MẶT TRỜI: chân = TÂM (đặt goc tại tâm mặt trời), cao = đường kính
  mat_troi: ({t}) => (
    <g transform="translate(0 0)">
      <g transform={`rotate(${t * 12})`}>
        {Array.from({length: 12}, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <line key={i} x1={Math.cos(a) * 36} y1={Math.sin(a) * 36} x2={Math.cos(a) * 50} y2={Math.sin(a) * 50} stroke={VANG} strokeWidth={4} strokeLinecap="round" />;
        })}
      </g>
      <circle r={30 + Math.sin(t * 2) * 1} fill={VANG} />
      <circle r={30} fill="none" stroke="#fff3c4" strokeWidth={2} opacity={0.7} />
    </g>
  ),
  xe_hoi: ({mau, t}) => {
    const q = t * 240;
    const rungXe = Math.sin(t * 14) * 0.6;
    const banh = (x: number) => (
      <g transform={`translate(${x} -16)`}>
        {/* Lốp cao su rãnh chống trượt */}
        <circle r={16} fill="#0f172a" stroke="#334155" strokeWidth={2.4} />
        {/* Mâm đúc hợp kim nhôm sáng bóng quay tròn */}
        <g transform={`rotate(${q})`}>
          <circle r={10} fill="url(#kimLoai)" stroke="#64748b" strokeWidth={0.8} />
          {[0, 72, 144, 216, 288].map((a) => (
            <line key={a} x1={0} y1={0} x2={Math.cos((a * Math.PI) / 180) * 9.5} y2={Math.sin((a * Math.PI) / 180) * 9.5} stroke="#334155" strokeWidth={2.2} strokeLinecap="round" />
          ))}
          <circle r={3} fill="#0f172a" />
        </g>
      </g>
    );
    return (
      <g transform={`translate(0 ${rungXe})`}>
        {/* Luồng sáng đèn pha chiếu mặt đường ban đêm */}
        <polygon points="120,-38 180,-24 175,-6 116,-28" fill="url(#luongSang)" opacity={0.35} />
        {/* Khói ống xả nhè nhẹ */}
        <circle cx={-124 + Math.sin(t * 6) * 4} cy={-22 - Math.sin(t * 7) * 4} r={3.5} fill="#94a3b8" opacity={0.35} />
        <circle cx={-132 + Math.sin(t * 6) * 5} cy={-26 - Math.sin(t * 7) * 6} r={5} fill="#94a3b8" opacity={0.2} />
        {/* Khung thân xe hơi dập nổi khí động học */}
        <path d="M-118 -18 L-118 -50 Q-116 -58 -104 -60 L-70 -62 L-44 -94 Q-40 -98 -30 -98 L40 -98 Q50 -98 58 -88 L82 -62 L110 -58 Q120 -55 120 -44 L120 -18 Z" fill={mau || '#0284c7'} stroke="#0f172a" strokeWidth={2.2} style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.45))'}} />
        {/* Kính chắn gió phản chiếu ánh trời */}
        <path d="M-60 -64 L-38 -90 L-4 -90 L-4 -64 Z M4 -64 L4 -90 L38 -90 Q44 -90 50 -82 L66 -64 Z" fill="url(#kinhXe)" stroke="#e2e8f0" strokeWidth={1.2} />
        {/* Đèn pha phía trước */}
        <circle cx={116} cy={-42} r={5} fill={VANG} style={{filter: 'drop-shadow(0 0 6px #FFD54A)'}} />
        {/* Đèn hậu đỏ phía sau */}
        <rect x={-119} y={-48} width={4} height={10} rx={1} fill={DO} />
        {banh(-72)}{banh(72)}
      </g>
    );
  },
  thuyen: ({mau, t}) => {
    const n = Math.sin(t * 2) * 2.8;
    const gocNghieng = Math.sin(t * 1.5) * 2.6;
    return (
      <g transform={`translate(0 ${n}) rotate(${gocNghieng})`}>
        {/* Bọt nước trắng lăn tăn ở mũi và đuôi thuyền */}
        <ellipse cx={-62} cy={2} rx={14} ry={2.5} fill="#ffffff" opacity={0.5 + 0.3 * Math.sin(t * 5)} />
        <ellipse cx={66} cy={2} rx={18} ry={3} fill="#ffffff" opacity={0.6 + 0.3 * Math.sin(t * 4.5)} />
        {/* Thân thuyền gỗ phủ véc-ni */}
        <path d="M-82 -32 L84 -32 L64 0 L-62 0 Z" fill="url(#goThan)" stroke="#2b1708" strokeWidth={1.8} style={{filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))'}} />
        <line x1={-80} y1={-26} x2={82} y2={-26} stroke={VANG} strokeWidth={1.4} opacity={0.8} />
        {/* Cột buồm kim loại */}
        <line x1={4} y1={-30} x2={4} y2={-102} stroke="url(#kimLoai)" strokeWidth={2.4} />
        {/* Cờ đuôi nheo đỏ trên đỉnh cột */}
        <polygon points="4,-102 4,-94 18,-98" fill={DO} />
        {/* Cánh buồm chính căng gió vải dệt */}
        <polygon points="6,-98 6,-36 54,-36" fill="url(#canhBuom)" stroke="#94a3b8" strokeWidth={1.2} style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))'}} />
        {/* Cánh buồm phụ phía sau */}
        <polygon points="2,-92 2,-38 -42,-38" fill="url(#canhBuom)" stroke="#94a3b8" strokeWidth={1} opacity={0.88} />
      </g>
    );
  },
  // MÁY BAY: chân = TÂM thân máy bay
  may_bay: ({mau}) => (
    <g>
      <path d="M-100 0 Q-100 -14 -80 -16 L80 -16 Q104 -14 110 0 Q104 14 80 16 L-80 16 Q-100 14 -100 0 Z" fill={`${TRANG}cc`} stroke={mau} strokeWidth={1.6} />
      <path d="M-20 0 L-50 60 L-30 60 L20 0 Z M-20 0 L-50 -60 L-30 -60 L20 0 Z" fill={`${mau}88`} stroke={mau} strokeWidth={1.2} />
      <path d="M-80 -10 L-98 -48 L-84 -48 L-62 -12 Z" fill={`${mau}aa`} />
      {[-40, -20, 0, 20, 40, 60].map((x) => <circle key={x} cx={x} cy={-4} r={3.5} fill={XANH} />)}
    </g>
  ),
  // KHINH KHÍ CẦU: chân = đáy giỏ
  khinh_khi_cau: ({mau, t}) => (
    <g transform={`translate(0 ${Math.sin(t * 1.2) * 2})`}>
      <path d="M0 -100 C 40 -100, 40 -50, 10 -32 L -10 -32 C -40 -50, -40 -100, 0 -100 Z" fill={`${DO}88`} stroke={mau} strokeWidth={1.6} />
      <path d="M0 -100 C 14 -90, 14 -50, 4 -32 M0 -100 C -14 -90, -14 -50, -4 -32" stroke={VANG} strokeWidth={2} fill="none" />
      <path d="M-8 -32 L-7 -14 M8 -32 L7 -14" stroke={TRANG} strokeWidth={1} />
      <rect x={-9} y={-14} width={18} height={14} rx={2} fill={`${NAU}cc`} stroke={NAU} />
    </g>
  ),
  // CẦU: rong = nhịp cầu, cao = độ cao vòm
  cau: ({mau, rong}) => {
    const L = rong / 2;
    return (
      <g stroke={mau} fill="none">
        <rect x={-L} y={-100} width={rong} height={8} fill={`${mau}44`} strokeWidth={1.6} />
        <path d={`M${-L} 0 Q 0 -190 ${L} 0`} strokeWidth={3} />
        {Array.from({length: 9}, (_, i) => {
          const x = -L + (rong * (i + 1)) / 10;
          const yv = -((1 - (x / L) ** 2) * 95);
          return <line key={i} x1={x} y1={-92} x2={x} y2={Math.max(-92, yv)} strokeWidth={1} opacity={0.7} />;
        })}
      </g>
    );
  },
  // SÔNG: rong = bề ngang, cao = bề rộng dòng sông (nhìn từ trên xuống), sóng trôi
  song: ({rong, t}) => {
    const L = rong / 2;
    const song: React.ReactNode[] = [];
    for (let k = 0; k < 3; k++) {
      const y = -20 - k * 30;
      const d = Array.from({length: 13}, (_, i) => {
        const x = -L + (rong * i) / 12;
        return `${i ? 'L' : 'M'}${x.toFixed(1)} ${(y + Math.sin(i * 1.3 + t * 2 + k) * 3).toFixed(1)}`;
      }).join(' ');
      song.push(<path key={k} d={d} stroke={TRANG} strokeWidth={1.2} fill="none" opacity={0.5} />);
    }
    return (
      <g>
        <rect x={-L} y={-100} width={rong} height={100} fill={`${XANH}44`} stroke={XANH} strokeWidth={1.4} />
        {song}
      </g>
    );
  },
  thang: ({mau}) => (
    <g stroke={mau} strokeWidth={2.4} strokeLinecap="round">
      <line x1={-10} y1={0} x2={-10} y2={-100} />
      <line x1={10} y1={0} x2={10} y2={-100} />
      {Array.from({length: 8}, (_, i) => <line key={i} x1={-10} y1={-8 - i * 12} x2={10} y2={-8 - i * 12} strokeWidth={1.8} />)}
    </g>
  ),
  // TIỀN: chồng tiền giấy + đồng xu (bài lãi suất, gửi tiết kiệm)
  tien: ({mau, t}) => (
    <g>
      {[0, 1, 2, 3, 4].map((k) => <rect key={k} x={-60 + k * 2} y={-14 - k * 11} width={80} height={12} rx={2} fill={`${XANH_LA}66`} stroke={XANH_LA} strokeWidth={1} />)}
      <rect x={-52} y={-68} width={80} height={14} rx={2} fill={`${XANH_LA}99`} stroke={XANH_LA} strokeWidth={1.2} />
      <text x={-12} y={-57.5} textAnchor="middle" fontSize={10} fontWeight={900} fill="#06231a" fontFamily="Liberation Sans, sans-serif">₫</text>
      {[0, 1, 2, 3].map((k) => <ellipse key={k} cx={45} cy={-6 - k * 8} rx={18} ry={6} fill={VANG} stroke="#a77b00" strokeWidth={1} />)}
      <g transform={`translate(45 ${-48 - Math.abs(Math.sin(t * 2.4)) * 10})`}><ellipse rx={18} ry={6} fill={VANG} stroke="#a77b00" strokeWidth={1} /></g>
      {mau ? null : null}
    </g>
  ),
  heo_dat: ({mau, t}) => (
    <g>
      <ellipse cx={0} cy={-45} rx={62} ry={42} fill="#ff9fc0aa" stroke={mau || '#ff9fc0'} strokeWidth={2} />
      <ellipse cx={60} cy={-48} rx={12} ry={14} fill="#ffb3cf" stroke={mau || '#ff9fc0'} strokeWidth={1.6} />
      <circle cx={57} cy={-50} r={2} fill="#7a2a45" /><circle cx={64} cy={-46} r={2} fill="#7a2a45" />
      <circle cx={35} cy={-62} r={3} fill="#1d1d1d" />
      <polygon points="18,-84 28,-100 34,-80" fill="#ffb3cf" stroke={mau || '#ff9fc0'} strokeWidth={1.4} />
      <rect x={-12} y={-90} width={24} height={4} rx={2} fill="#7a2a45" />
      <g transform={`translate(0 ${-100 + ((t * 40) % 20)})`} opacity={1 - ((t * 40) % 20) / 20}><ellipse rx={10} ry={4} fill={VANG} /></g>
      {[-38, -14, 14, 38].map((x) => <rect key={x} x={x - 6} y={-10} width={12} height={10} rx={2} fill="#ff9fc0" />)}
    </g>
  ),
  // DIỀU: chân = người cầm dây (gốc dây), diều ở trên-phải
  dieu: ({mau, t}) => {
    const x = 50 + Math.sin(t * 1.3) * 4, y = -88 + Math.cos(t * 1.7) * 3;
    return (
      <g>
        <path d={`M0 0 Q ${x * 0.4} ${y * 0.3} ${x} ${y + 12}`} stroke={TRANG} strokeWidth={0.8} fill="none" />
        <polygon points={`${x},${y - 12} ${x + 10},${y} ${x},${y + 12} ${x - 10},${y}`} fill={`${DO}cc`} stroke={mau || VANG} strokeWidth={1.2} />
        <path d={`M${x} ${y + 12} q 4 6 0 12 q -4 6 0 12`} stroke={VANG} strokeWidth={1} fill="none" />
      </g>
    );
  },
  tuong: ({mau, rong}) => {
    const L = rong / 2;
    const gach: React.ReactNode[] = [];
    for (let r = 0; r < 10; r++) for (let x = -L + (r % 2 ? 0 : -6); x < L; x += 12) gach.push(<rect key={`${r}_${x}`} x={Math.max(-L, x)} y={-100 + r * 10} width={Math.min(12, L - Math.max(-L, x))} height={10} fill="none" stroke={mau} strokeWidth={0.5} opacity={0.5} />);
    return <g><rect x={-L} y={-100} width={rong} height={100} fill={`${NAU}55`} stroke={mau} strokeWidth={1.4} />{gach}</g>;
  },
  // HÀNG RÀO (nhìn ngang): cọc đều + 2 thanh ngang, rong = chiều dài, cao = chiều cao rào
  hang_rao: ({mau, rong}) => {
    const L = rong / 2, n = Math.max(3, Math.round(rong / 22));
    return (
      <g stroke={mau || NAU} strokeWidth={2.2} strokeLinecap="round">
        <line x1={-L} y1={-70} x2={L} y2={-70} strokeWidth={4} />
        <line x1={-L} y1={-30} x2={L} y2={-30} strokeWidth={4} />
        {Array.from({length: n + 1}, (_, i) => {
          const x = -L + (rong * i) / n;
          return <path key={i} d={`M${x - 5} 0 L${x - 5} -88 L${x} -100 L${x + 5} -88 L${x + 5} 0 Z`} fill={`${NAU}cc`} stroke={mau || '#e8b77d'} strokeWidth={1.4} />;
        })}
      </g>
    );
  },
  // CÔNG TRÌNH CÓ BIỂN TÊN (bưu điện, bệnh viện, nhà máy, siêu thị, ủy ban...): toà nhà + BIỂN ghi đúng tên trong đề
  cong_trinh: ({mau, bien}) => (
    <g>
      <rect x={-44} y={-82} width={88} height={82} fill={`${mau}22`} stroke={mau} strokeWidth={1.6} />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={-36 + c * 19} y={-62 + r * 17} width={11} height={10} fill={`${VANG}99`} stroke={TRANG} strokeWidth={0.5} />))}
      <rect x={-10} y={-18} width={20} height={18} fill={`${XANH}66`} stroke={TRANG} strokeWidth={1} />
      <rect x={-54} y={-104} width={108} height={24} rx={3} fill={mau} stroke={TRANG} strokeWidth={1} />
      <text data-kd-bo="1" x={0} y={-87} textAnchor="middle" fontSize={Math.min(15, 175 / Math.max(6, (bien || 'CÔNG TRÌNH').length))} fontWeight={900} fill="#06161a" fontFamily={FONT_DAM}>{(bien || 'CÔNG TRÌNH').toUpperCase()}</text>
    </g>
  ),
  // CỬA HÀNG / CHỢ / SIÊU THỊ: mái hiên sọc, quầy, biển tên
  cua_hang: ({mau, bien}) => (
    <g>
      <rect x={-50} y={-70} width={100} height={70} fill={`${mau}22`} stroke={mau} strokeWidth={1.6} />
      {Array.from({length: 8}, (_, i) => <path key={i} d={`M${-55 + i * 13.75} -70 L${-55 + (i + 1) * 13.75} -70 L${-55 + (i + 1) * 13.75} -60 Q${-55 + (i + 0.5) * 13.75} -52 ${-55 + i * 13.75} -60 Z`} fill={i % 2 ? TRANG : DO} />)}
      <rect x={-40} y={-48} width={50} height={30} fill={`${XANH}55`} stroke={TRANG} strokeWidth={1} />
      <rect x={18} y={-48} width={22} height={48} fill={`${NAU}99`} stroke={TRANG} strokeWidth={1} />
      <rect x={-54} y={-96} width={108} height={24} rx={3} fill={VANG} />
      <text data-kd-bo="1" x={0} y={-79} textAnchor="middle" fontSize={Math.min(15, 175 / Math.max(6, (bien || 'CỬA HÀNG').length))} fontWeight={900} fill="#3a2600" fontFamily={FONT_DAM}>{(bien || 'CỬA HÀNG').toUpperCase()}</text>
    </g>
  ),
  xe_may: ({mau, t}) => {
    const b = (x: number) => <g transform={`translate(${x} -22) rotate(${t * 300})`}><circle r={21} fill="#1d2b30" stroke={TRANG} strokeWidth={3} /><line x1={-15} y1={0} x2={15} y2={0} stroke={XAM} strokeWidth={2} /><line x1={0} y1={-15} x2={0} y2={15} stroke={XAM} strokeWidth={2} /></g>;
    return (
      <g>
        <path d="M-60 -40 Q-40 -66 -5 -62 L30 -62 L58 -42 L70 -40" fill="none" stroke={mau} strokeWidth={6} strokeLinecap="round" />
        <path d="M-30 -62 Q-10 -78 18 -70 L18 -62 Z" fill={`${mau}aa`} stroke={mau} strokeWidth={1.4} />
        <path d="M52 -44 L62 -90 L74 -92" stroke={TRANG} strokeWidth={4} fill="none" strokeLinecap="round" />
        <circle cx={66} cy={-80} r={4} fill={VANG} />
        {b(-62)}{b(62)}
      </g>
    );
  },
  xe_dap: ({mau, t}) => {
    const b = (x: number) => <g transform={`translate(${x} -30) rotate(${t * 260})`}><circle r={28} fill="none" stroke={TRANG} strokeWidth={3} />{[0, 45, 90, 135].map((a) => <line key={a} x1={-28 * Math.cos((a * Math.PI) / 180)} y1={-28 * Math.sin((a * Math.PI) / 180)} x2={28 * Math.cos((a * Math.PI) / 180)} y2={28 * Math.sin((a * Math.PI) / 180)} stroke={XAM} strokeWidth={0.8} />)}</g>;
    return (
      <g stroke={mau} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {b(-55)}{b(55)}
        <path d="M-55 -30 L-15 -30 L20 -70 L-28 -70 Z M-15 -30 L-28 -78 M55 -30 L20 -70 L18 -88 L32 -92 M-34 -80 L-20 -80" />
      </g>
    );
  },
  xe_buyt: ({mau, t}) => {
    const b = (x: number) => <g transform={`translate(${x} -14) rotate(${t * 240})`}><circle r={13} fill="#1d2b30" stroke={TRANG} strokeWidth={2} /><line x1={-9} y1={0} x2={9} y2={0} stroke={XAM} strokeWidth={2} /></g>;
    return (
      <g>
        <rect x={-148} y={-100} width={296} height={86} rx={12} fill={`${VANG}cc`} stroke={mau} strokeWidth={2} />
        {Array.from({length: 7}, (_, i) => <rect key={i} x={-136 + i * 38} y={-88} width={30} height={28} rx={3} fill={`${XANH}aa`} stroke={TRANG} strokeWidth={1} />)}
        <rect x={-148} y={-48} width={296} height={8} fill={DO} />
        {b(-100)}{b(100)}
      </g>
    );
  },
  // CON ĐƯỜNG (nhìn ngang, rong = chiều dài): mặt đường + vạch kẻ trôi
  con_duong: ({rong, t}) => {
    const L = rong / 2;
    return (
      <g>
        <rect x={-L} y={-100} width={rong} height={100} fill="#2a3338" stroke={XAM} strokeWidth={1.4} />
        {Array.from({length: Math.ceil(rong / 40) + 1}, (_, i) => <rect key={i} x={-L + ((i * 40 + t * 30) % (rong + 40)) - 20} y={-54} width={22} height={8} fill={TRANG} opacity={0.8} />)}
      </g>
    );
  },
  // QUẢ BÓNG: chân = TÂM quả bóng, cao = đường kính
  qua_bong: ({t}) => (
    <g transform={`rotate(${t * 90})`}>
      <circle r={50} fill={TRANG} stroke="#1d1d1d" strokeWidth={3} />
      <polygon points={sao5(0, 0, 18).split(' ').filter((_, i) => i % 2 === 0).join(' ')} fill="#1d1d1d" />
      {[0, 72, 144, 216, 288].map((a) => <line key={a} x1={Math.cos((a - 90) * Math.PI / 180) * 18} y1={Math.sin((a - 90) * Math.PI / 180) * 18} x2={Math.cos((a - 90) * Math.PI / 180) * 50} y2={Math.sin((a - 90) * Math.PI / 180) * 50} stroke="#1d1d1d" strokeWidth={2.5} />)}
    </g>
  ),
  ro_bong_ro: ({mau}) => (
    <g>
      <rect x={-3} y={-100} width={6} height={100} fill={`${XAM}cc`} />
      <rect x={-2} y={-100} width={30} height={22} fill={`${TRANG}cc`} stroke={mau} strokeWidth={1.2} />
      <ellipse cx={32} cy={-80} rx={10} ry={2.5} fill="none" stroke={DO} strokeWidth={2} />
      <path d="M22 -80 L25 -68 L32 -66 L39 -68 L42 -80" stroke={TRANG} strokeWidth={0.8} fill="none" />
    </g>
  ),
  gieng: ({mau}) => (
    <g>
      <rect x={-40} y={-40} width={80} height={40} fill="#6b7b80" stroke={mau} strokeWidth={1.6} />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={-40 + c * 20 + (r % 2) * 10} y={-40 + r * 13.3} width={20} height={13.3} fill="none" stroke={TRANG} strokeWidth={0.4} opacity={0.5} />))}
      <path d="M-34 -40 L-34 -92 M34 -40 L34 -92 M-44 -92 L0 -104 L44 -92" stroke={NAU} strokeWidth={4} fill="none" />
      <line x1={0} y1={-90} x2={0} y2={-55} stroke={TRANG} strokeWidth={1} />
      <rect x={-7} y={-56} width={14} height={11} fill={`${NAU}cc`} />
    </g>
  ),
  cong: ({mau}) => (
    <g stroke={mau} strokeWidth={2}>
      <rect x={-60} y={-100} width={14} height={100} fill={`${mau}44`} />
      <rect x={46} y={-100} width={14} height={100} fill={`${mau}44`} />
      {Array.from({length: 9}, (_, i) => <line key={i} x1={-42 + i * 10.5} y1={-82} x2={-42 + i * 10.5} y2={0} strokeWidth={1.6} />)}
      <line x1={-46} y1={-82} x2={46} y2={-82} strokeWidth={3} /><line x1={-46} y1={-40} x2={46} y2={-40} strokeWidth={3} />
    </g>
  ),
  // BIỂU TƯỢNG DỰ PHÒNG: vật chưa có trong thư viện -> emoji màu đúng vật (🏥 bệnh viện, 🚜 máy cày, 🐄 bò...), chân ở đáy
  // BÀN (nhìn ngang): mặt bàn gỗ dày + 4 chân (2 chân sau mờ hơn), chân = mặt sàn, cao = chiều cao mặt bàn
  ban: ({mau, rong}) => {
    const L = Math.max(60, rong) / 2;
    return (
      <g>
        <rect x={-L + 10} y={-92} width={7} height={92} fill={`${NAU}88`} />
        <rect x={L - 17} y={-92} width={7} height={92} fill={`${NAU}88`} />
        <rect x={-L + 2} y={-92} width={9} height={92} rx={2} fill={NAU} stroke={mau} strokeWidth={0.8} />
        <rect x={L - 11} y={-92} width={9} height={92} rx={2} fill={NAU} stroke={mau} strokeWidth={0.8} />
        <rect x={-L + 6} y={-90} width={2 * L - 12} height={6} fill={`${NAU}aa`} />
        <rect x={-L - 6} y={-100} width={2 * L + 12} height={10} rx={3} fill="#d9a066" stroke={mau} strokeWidth={1.4} />
        <rect x={-L - 6} y={-100} width={2 * L + 12} height={3} rx={2} fill="#f1c890" />
      </g>
    );
  },
  // GHẾ (nhìn ngang): tựa lưng cao, mặt ghế ở nửa chiều cao
  ghe: ({mau}) => (
    <g>
      <rect x={-24} y={-100} width={8} height={100} rx={2} fill={NAU} stroke={mau} strokeWidth={0.8} />
      <rect x={-20} y={-96} width={4} height={40} fill="#d9a066" />
      <rect x={-26} y={-54} width={54} height={8} rx={2} fill="#d9a066" stroke={mau} strokeWidth={1.2} />
      <rect x={20} y={-48} width={7} height={48} rx={2} fill={NAU} />
      <rect x={-20} y={-48} width={6} height={48} fill={`${NAU}88`} />
    </g>
  ),
  // TI VI: màn hình 16:9 trên chân đế, màn hình có ánh sáng chạy nhẹ
  ti_vi: ({mau, t}) => (
    <g>
      <rect x={-80} y={-100} width={160} height={90} rx={6} fill="#10181c" stroke={mau} strokeWidth={2.4} />
      <rect x={-74} y={-94} width={148} height={78} rx={3} fill={`${XANH}44`} />
      <rect x={-74 + ((t * 40) % 148)} y={-94} width={18} height={78} fill="#ffffff22" />
      <rect x={-6} y={-10} width={12} height={6} fill={XAM} />
      <rect x={-34} y={-4} width={68} height={4} rx={2} fill={XAM} />
    </g>
  ),
  // KIM TỰ THÁP: tam giác cân có các bậc đá
  kim_tu_thap: ({mau}) => (
    <g>
      <polygon points="-80,0 80,0 0,-100" fill="#e2b866" stroke={mau} strokeWidth={1.6} />
      <polygon points="0,-100 80,0 22,0" fill="#b88a3e" opacity={0.7} />
      {[1, 2, 3, 4, 5, 6, 7].map((k) => <line key={k} x1={-80 + k * 11.4} y1={-k * 14.2} x2={80 - k * 11.4} y2={-k * 14.2} stroke="#8a6326" strokeWidth={0.8} opacity={0.6} />)}
    </g>
  ),
  // THÁP (tháp truyền hình / tháp thép dạng lưới, khác tòa nhà): thân thon dần + các thanh chéo + đèn đỏ ở đỉnh
  thap: ({mau, t}) => (
    <g stroke={mau || XAM} strokeWidth={1.4} fill="none">
      <polyline points="-22,0 -4,-92 4,-92 22,0" strokeWidth={2.4} />
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const y1 = -k * 15, y2 = -(k + 1) * 15, w1 = 22 - k * 3, w2 = 22 - (k + 1) * 3;
        return <g key={k}><line x1={-w1} y1={y1} x2={w2} y2={y2} /><line x1={w1} y1={y1} x2={-w2} y2={y2} /><line x1={-w2} y1={y2} x2={w2} y2={y2} /></g>;
      })}
      <line x1={0} y1={-92} x2={0} y2={-100} strokeWidth={2} />
      <circle cx={0} cy={-100} r={2.6} fill={DO} stroke="none" opacity={0.5 + 0.5 * Math.abs(Math.sin(t * 3))} />
    </g>
  ),
  bieu_tuong: ({emoji}) => (
    <text x={0} y={-8} textAnchor="middle" fontSize={92} fontFamily="Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif">{emoji || '❓'}</text>
  ),
  ho_nuoc: ({rong, t}) => (
    <g>
      <ellipse cx={0} cy={-50} rx={rong / 2} ry={50} fill={`${XANH}44`} stroke={XANH} strokeWidth={1.6} />
      {[0, 1, 2].map((k) => <ellipse key={k} cx={0} cy={-50} rx={(rong / 2) * ((t * 0.3 + k / 3) % 1)} ry={50 * ((t * 0.3 + k / 3) % 1)} fill="none" stroke={TRANG} strokeWidth={0.8} opacity={0.5 * (1 - ((t * 0.3 + k / 3) % 1))} />)}
    </g>
  ),
};

// Vẽ một vật thực tế: chân tại (x, y) khung, cao h khung đơn vị; lat = lật ngang; p = tiến độ xuất hiện (vật "mọc" từ chân lên)
export const VatThuc: React.FC<{ten: string; x: number; y: number; cao: number; rong?: number; lat?: boolean; mau: string; t: number; p: number; bien?: string; emoji?: string; dongTac?: string; gocChi?: number}> = ({ten, x, y, cao, rong, lat, mau, t, p, bien = '', emoji = '', dongTac, gocChi}) => {
  const ve = VE[ten as TenVatThuc];
  if (!ve) return null;
  const k = cao / 100;
  const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  const nay = p < 1 ? 1 + Math.sin(Math.min(1, p) * Math.PI) * 0.06 : 1;
  const rongDv = rong ? rong / k : 100 * (TI_LE_RONG[ten] || 1);
  const coBongDat = !['mat_troi', 'may_bay', 'khinh_khi_cau', 'dieu', 'song', 'ho_nuoc'].includes(ten);
  return (
    <g transform={`translate(${x} ${y}) scale(${(lat ? -1 : 1) * k * nay} ${k * e})`} opacity={Math.min(1, p * 2.5)}>
      <defs>
        <linearGradient id="kimLoai" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7d8f93" /><stop offset="45%" stopColor="#f2f7f8" /><stop offset="100%" stopColor="#6b7b80" />
        </linearGradient>
        <linearGradient id="khoi3DTruoc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#264658" /><stop offset="50%" stopColor="#1b3444" /><stop offset="100%" stopColor="#11222d" />
        </linearGradient>
        <linearGradient id="goThan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4a2e16" /><stop offset="35%" stopColor="#7c4e28" /><stop offset="100%" stopColor="#38200d" />
        </linearGradient>
        <radialGradient id="tanLa3D" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#52e88a" /><stop offset="55%" stopColor="#1e8a4a" /><stop offset="100%" stopColor="#0c4a24" />
        </radialGradient>
        <linearGradient id="kinhXe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" /><stop offset="30%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#0f2b48" />
        </linearGradient>
        <linearGradient id="canhBuom" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" /><stop offset="65%" stopColor="#f1f5f9" /><stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="thanHaiDang" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94a3b8" /><stop offset="35%" stopColor="#ffffff" /><stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="maiNgoi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f87171" /><stop offset="55%" stopColor="#dc2626" /><stop offset="100%" stopColor="#881337" />
        </linearGradient>
        <linearGradient id="luongSang" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fef08a" stopOpacity={0.7} /><stop offset="100%" stopColor="#fef08a" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {coBongDat ? <ellipse cx={4} cy={2} rx={Math.min(72, Math.max(18, rongDv * 0.52))} ry={6} fill="rgba(0,0,0,0.48)" /> : null}
      {ve({mau, t, rong: rongDv, nen: '', bien, emoji, dongTac, gocChi})}
    </g>
  );
};
