import React from 'react';

// THƯ VIỆN VẬT THỰC TẾ (nét "vat" của hinh_tu_do): vẽ ĐÚNG vật của đề (cột cờ, ngân hàng, tòa nhà, cây, người quan sát,
// mặt trời, hải đăng...) thay vì thay bằng khối hộp/khối trụ vô nghĩa. Vật đặt theo ĐIỂM CHÂN (goc) và CHIỀU CAO (cao) trong
// cùng khung tọa độ với các nét hình học, nên đường đo chiều cao, tia nhìn, góc nâng... khớp đúng vào vật.
// Mỗi hàm vẽ trong hộp đơn vị: chân vật ở (0,0), chiều cao 100, trục y hướng LÊN là số âm. Có nhịp chuyển động nhẹ (cờ bay,
// tia sáng quét, khói, nước chảy) theo thời gian t (giây).

export const TEN_VAT_THUC = [
  'cot_co', 'nguoi', 'toa_nha', 'ngan_hang', 'nha', 'truong_hoc', 'cay', 'cay_thong', 'hai_dang', 'thap_nuoc', 'cot_dien', 'den_duong',
  'nui', 'mat_troi', 'xe_hoi', 'thuyen', 'may_bay', 'khinh_khi_cau', 'cau', 'song', 'thang', 'tien', 'heo_dat', 'dieu', 'tuong', 'ho_nuoc',
] as const;
export type TenVatThuc = (typeof TEN_VAT_THUC)[number];

// tỉ lệ rộng/cao của từng vật (để ước lượng chỗ đặt nhãn, né chữ); cau/song/ho_nuoc/tuong dùng "rong" riêng
export const TI_LE_RONG: Record<string, number> = {
  cot_co: 0.32, nguoi: 0.36, toa_nha: 0.5, ngan_hang: 1.05, nha: 1.05, truong_hoc: 1.5, cay: 0.75, cay_thong: 0.6, hai_dang: 0.4, thap_nuoc: 0.55,
  cot_dien: 0.5, den_duong: 0.45, nui: 1.8, mat_troi: 1, xe_hoi: 2.4, thuyen: 1.6, may_bay: 2.2, khinh_khi_cau: 0.75, cau: 3, song: 3, thang: 0.5,
  tien: 1.3, heo_dat: 1.35, dieu: 0.7, tuong: 1, ho_nuoc: 3,
};

type P = {mau: string; t: number; rong: number; nen: string};
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
  nguoi: ({mau, t}) => (
    <g stroke={mau} strokeWidth={3.2} strokeLinecap="round" fill="none">
      <circle cx={0} cy={-88} r={8} fill={`${mau}33`} />
      <circle cx={4.5} cy={-89} r={1.3} fill={mau} stroke="none" />
      <path d="M0 -79 L0 -42" />
      <path d={`M0 -70 L${9 + Math.sin(t * 2) * 1} -54 M0 -70 L-8 -55`} />
      <path d="M0 -42 L8 0 M0 -42 L-7 0" />
    </g>
  ),
  // TÒA NHÀ CAO TẦNG: lưới cửa sổ sáng tắt, ăng-ten đỉnh có đèn nhấp nháy
  toa_nha: ({mau, t}) => {
    const cs: React.ReactNode[] = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 4; c++) {
      const sang = ((r * 7 + c * 3) % 5) > 1;
      cs.push(<rect key={`${r}_${c}`} x={-19 + c * 10} y={-88 + r * 9.4} width={6} height={5.6} rx={0.8} fill={sang ? VANG : '#29424a'} opacity={sang ? 0.85 : 0.9} />);
    }
    return (
      <g>
        <rect x={-25} y={-94} width={50} height={94} rx={1.5} fill={`${mau}22`} stroke={mau} strokeWidth={1.6} />
        {cs}
        <line x1={0} y1={-94} x2={0} y2={-100} stroke={mau} strokeWidth={1.4} />
        <circle cx={0} cy={-100} r={1.6} fill={DO} opacity={0.4 + 0.6 * (Math.sin(t * 5) > 0 ? 1 : 0)} />
      </g>
    );
  },
  // NGÂN HÀNG: mặt tiền cổ điển (mái tam giác có biểu tượng tiền, 5 cột, bảng tên, bậc thềm)
  ngan_hang: ({mau}) => (
    <g>
      <rect x={-52} y={-7} width={104} height={7} fill={`${mau}33`} stroke={mau} strokeWidth={1.2} />
      <rect x={-48} y={-13} width={96} height={6} fill={`${mau}44`} stroke={mau} strokeWidth={1.2} />
      {[-38, -19, 0, 19, 38].map((x) => (
        <g key={x}>
          <rect x={x - 4.5} y={-62} width={9} height={49} fill={`${TRANG}22`} stroke={TRANG} strokeWidth={1} />
          <line x1={x - 1.5} y1={-60} x2={x - 1.5} y2={-15} stroke={TRANG} strokeWidth={0.5} opacity={0.6} />
          <line x1={x + 1.5} y1={-60} x2={x + 1.5} y2={-15} stroke={TRANG} strokeWidth={0.5} opacity={0.6} />
        </g>
      ))}
      <rect x={-50} y={-72} width={100} height={10} fill={`${mau}55`} stroke={mau} strokeWidth={1.2} />
      <text x={0} y={-64.3} textAnchor="middle" fontSize={7.2} fontWeight={900} fill={TRANG} fontFamily="Be Vietnam Pro, Liberation Sans, sans-serif" letterSpacing={1.5}>NGÂN HÀNG</text>
      <polygon points="-54,-72 0,-100 54,-72" fill={`${mau}33`} stroke={mau} strokeWidth={1.6} />
      <circle cx={0} cy={-82} r={7} fill={VANG} stroke="#a77b00" strokeWidth={1} />
      <text x={0} y={-79} textAnchor="middle" fontSize={9} fontWeight={900} fill="#5a3d00" fontFamily="Liberation Sans, sans-serif">₫</text>
    </g>
  ),
  nha: ({mau}) => (
    <g>
      <rect x={-40} y={-55} width={80} height={55} fill={`${mau}22`} stroke={mau} strokeWidth={1.6} />
      <polygon points="-50,-55 0,-100 50,-55" fill={`${DO}55`} stroke={DO} strokeWidth={1.6} />
      <rect x={-9} y={-30} width={18} height={30} fill={`${NAU}88`} stroke={NAU} strokeWidth={1.2} />
      <rect x={-32} y={-44} width={15} height={13} fill={`${VANG}aa`} stroke={TRANG} strokeWidth={1} />
      <rect x={17} y={-44} width={15} height={13} fill={`${VANG}aa`} stroke={TRANG} strokeWidth={1} />
      <rect x={22} y={-92} width={9} height={18} fill={`${mau}33`} stroke={mau} strokeWidth={1.2} />
    </g>
  ),
  truong_hoc: ({mau, t}) => (
    <g>
      <rect x={-75} y={-60} width={150} height={60} fill={`${mau}22`} stroke={mau} strokeWidth={1.6} />
      <polygon points="-82,-60 0,-80 82,-60" fill={`${DO}44`} stroke={DO} strokeWidth={1.4} />
      {[-60, -40, -20, 20, 40, 60].map((x) => <rect key={x} x={x - 6} y={-48} width={12} height={12} fill={`${VANG}99`} stroke={TRANG} strokeWidth={0.8} />)}
      <rect x={-10} y={-32} width={20} height={32} fill={`${NAU}88`} stroke={NAU} strokeWidth={1} />
      <line x1={0} y1={-80} x2={0} y2={-100} stroke={TRANG} strokeWidth={1.2} />
      <path d={`M0 -100 L${12 + Math.sin(t * 3) * 1.5} -97 L0 -93 Z`} fill={DO} />
    </g>
  ),
  cay: ({mau, t}) => {
    const l = Math.sin(t * 1.4) * 1.5;
    return (
      <g>
        <path d="M-5 0 L-3.5 -45 L3.5 -45 L5 0 Z" fill={`${NAU}cc`} stroke={NAU} strokeWidth={1} />
        <g transform={`translate(${l} 0)`}>
          <circle cx={0} cy={-68} r={27} fill={`${XANH_LA}44`} stroke={mau || XANH_LA} strokeWidth={1.6} />
          <circle cx={-17} cy={-55} r={17} fill={`${XANH_LA}55`} stroke={mau || XANH_LA} strokeWidth={1.4} />
          <circle cx={17} cy={-56} r={17} fill={`${XANH_LA}55`} stroke={mau || XANH_LA} strokeWidth={1.4} />
        </g>
      </g>
    );
  },
  cay_thong: ({mau}) => (
    <g>
      <rect x={-3.5} y={-16} width={7} height={16} fill={`${NAU}cc`} />
      {[0, 1, 2].map((k) => <polygon key={k} points={`${-30 + k * 6},${-14 - k * 25} 0,${-50 - k * 25} ${30 - k * 6},${-14 - k * 25}`} fill={`${XANH_LA}55`} stroke={mau || XANH_LA} strokeWidth={1.4} />)}
    </g>
  ),
  // HẢI ĐĂNG: thân thon sọc đỏ trắng, phòng đèn, chùm sáng quét
  hai_dang: ({mau, t}) => {
    const g = Math.sin(t * 1.6) * 35;
    return (
      <g>
        <polygon points={`0,-88 ${-60 * Math.cos((g * Math.PI) / 180)},${-88 - 12} ${-60 * Math.cos((g * Math.PI) / 180)},${-88 + 12}`} fill={VANG} opacity={0.34} />
        <polygon points={`0,-88 ${60 * Math.cos((g * Math.PI) / 180)},${-88 - 12} ${60 * Math.cos((g * Math.PI) / 180)},${-88 + 12}`} fill={VANG} opacity={0.34} />
        <polygon points="-16,0 16,0 10,-78 -10,-78" fill={TRANG} stroke={mau} strokeWidth={1.2} />
        {[0, 1, 2].map((k) => <polygon key={k} points={`${-15.2 + k * 1.6},${-10 - k * 24} ${15.2 - k * 1.6},${-10 - k * 24} ${14.4 - k * 1.6},${-20 - k * 24} ${-14.4 + k * 1.6},${-20 - k * 24}`} fill={DO} />)}
        <rect x={-12} y={-82} width={24} height={4} fill={mau} />
        <rect x={-8} y={-93} width={16} height={11} fill={`${VANG}cc`} stroke={mau} strokeWidth={1} />
        <polygon points="-10,-93 0,-100 10,-93" fill={DO} />
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
    const banh = (x: number) => (
      <g transform={`translate(${x} -16)`}>
        <circle r={15} fill="#1d2b30" stroke={TRANG} strokeWidth={2} />
        <g transform={`rotate(${q})`}><line x1={-11} y1={0} x2={11} y2={0} stroke={XAM} strokeWidth={2} /><line x1={0} y1={-11} x2={0} y2={11} stroke={XAM} strokeWidth={2} /></g>
      </g>
    );
    return (
      <g>
        <path d="M-118 -18 L-118 -50 Q-116 -58 -104 -60 L-70 -62 L-44 -94 Q-40 -98 -30 -98 L40 -98 Q50 -98 58 -88 L82 -62 L110 -58 Q120 -55 120 -44 L120 -18 Z" fill={`${mau}44`} stroke={mau} strokeWidth={2} />
        <path d="M-60 -64 L-38 -90 L-4 -90 L-4 -64 Z M4 -64 L4 -90 L38 -90 Q44 -90 50 -82 L66 -64 Z" fill={`${XANH}55`} stroke={TRANG} strokeWidth={1.2} />
        <circle cx={114} cy={-44} r={4} fill={VANG} />
        {banh(-72)}{banh(72)}
      </g>
    );
  },
  thuyen: ({mau, t}) => {
    const n = Math.sin(t * 2) * 2;
    return (
      <g transform={`translate(0 ${n}) rotate(${Math.sin(t * 1.5) * 2})`}>
        <path d="M-80 -30 L80 -30 L60 0 L-60 0 Z" fill={`${NAU}aa`} stroke={mau} strokeWidth={1.6} />
        <line x1={0} y1={-30} x2={0} y2={-100} stroke={TRANG} strokeWidth={2} />
        <polygon points="2,-98 2,-36 48,-36" fill={`${TRANG}cc`} stroke={mau} strokeWidth={1} />
        <polygon points="-2,-92 -2,-38 -38,-38" fill={`${mau}88`} />
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
  ho_nuoc: ({rong, t}) => (
    <g>
      <ellipse cx={0} cy={-50} rx={rong / 2} ry={50} fill={`${XANH}44`} stroke={XANH} strokeWidth={1.6} />
      {[0, 1, 2].map((k) => <ellipse key={k} cx={0} cy={-50} rx={(rong / 2) * ((t * 0.3 + k / 3) % 1)} ry={50 * ((t * 0.3 + k / 3) % 1)} fill="none" stroke={TRANG} strokeWidth={0.8} opacity={0.5 * (1 - ((t * 0.3 + k / 3) % 1))} />)}
    </g>
  ),
};

// Vẽ một vật thực tế: chân tại (x, y) khung, cao h khung đơn vị; lat = lật ngang; p = tiến độ xuất hiện (vật "mọc" từ chân lên)
export const VatThuc: React.FC<{ten: string; x: number; y: number; cao: number; rong?: number; lat?: boolean; mau: string; t: number; p: number}> = ({ten, x, y, cao, rong, lat, mau, t, p}) => {
  const ve = VE[ten as TenVatThuc];
  if (!ve) return null;
  const k = cao / 100;
  const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  const nay = p < 1 ? 1 + Math.sin(Math.min(1, p) * Math.PI) * 0.06 : 1;
  const rongDv = rong ? rong / k : 100 * (TI_LE_RONG[ten] || 1);
  return (
    <g transform={`translate(${x} ${y}) scale(${(lat ? -1 : 1) * k * nay} ${k * e})`} opacity={Math.min(1, p * 2.5)}>
      <defs>
        <linearGradient id="kimLoai" x1="0" x2="1">
          <stop offset="0%" stopColor="#7d8f93" /><stop offset="45%" stopColor="#f2f7f8" /><stop offset="100%" stopColor="#6b7b80" />
        </linearGradient>
      </defs>
      {ve({mau, t, rong: rongDv, nen: ''})}
    </g>
  );
};
