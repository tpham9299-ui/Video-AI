import React from 'react';
import {useCurrentFrame} from 'remotion';
import {expoOut} from '../sankhau/chuyendong';
import {kep} from '../sankhau/donghieu';
import {DuLieuSanKhau, Vat} from '../sankhau/dulieu';

// KHÔNG GIAN 3D TỰ ĐỘNG (bộ hiệu ứng mới, học từ video "đếm tam giác" và "bí kíp Casio"):
//  - "nam": hình học/hình tự do NẰM trên một bàn kính có bề dày, máy quay nghiêng xuống và xoay quanh chậm;
//           hình tô màu được đùn nổi thành khối (bông tuyết thành hòn đảo có bề dày).
//  - "the": danh sách / biểu đồ / đồ thị / số đếm là tấm thẻ lơ lửng trong không gian: lật xoay vào, đung đưa nhẹ.
//  - "khong": cảnh đã tự dùng máy chiếu 3D của sân khấu (vật 3D, goc_3d) thì giữ nguyên.

export type Kieu3D = 'nam' | 'dung' | 'the' | 'khong';
const VAT_NAM = ['hinh_tu_do', 'hinh_hoc', 'luoi_o'];
const VAT_THE = ['danh_sach', 'bieu_do_cot', 'do_thi', 'so_dem', 'nhan', 'chu', 'thanh', 'dong_ho_do', 'mui_ten'];
const VAT_3D_RIENG = ['khoi_hop', 'tru', 'non', 'cau', 'toa_nha', 'xe', 'cay', 'thang'];
// vật cần đọc rõ: trên bàn 3D vẫn ĐỨNG THẲNG (dựng riêng, đặt đúng chỗ chiếu của nó trên bàn)
// (nhãn, chữ cũng là CHÚ THÍCH: luôn phẳng, quay về người xem, không nghiêng theo khối 3D)
export const VAT_DUNG = ['so_dem', 'danh_sach', 'bieu_do_cot', 'do_thi', 'nhan', 'chu'];

export function phanLoai3D(du: DuLieuSanKhau | null): Kieu3D {
  if (!du || !du.vat.length) return 'khong';
  if (du.gocDau || du.hanhDong.some((h) => h.kieu === 'goc_3d') || du.vat.some((v) => VAT_3D_RIENG.includes(v.loai))) return 'khong';
  // PHÂN BIỆT 3D / 2D: chỉ VẬT KHỐI THẬT mới cần chuyển động 3D.
  //  - chồng vật xếp tầng (ống, lon): dựng đứng, máy xoay trái/phải cho thấy chiều sâu
  if (du.vat.some((v) => v.loai === 'hinh_tu_do' && v.hinh.some((h) => h.kieu === 'xep_chong'))) return 'dung';
  //  - bản vẽ cảnh thực tế nhìn ngang (đo chiều cao, góc nâng...): PHẲNG như bản vẽ kỹ thuật, đường đo/góc phải đọc chính xác
  //  - mặt bằng nhìn từ trên (vườn, ruộng, hàng rào quanh đất): cũng PHẲNG như bản đồ - nghiêng 3D làm cạnh dài/ngắn
  //    trông sai tỉ lệ và nhãn số đo bị che/dẹt (người xem phải so được cạnh 60 m dài gấp đôi cạnh 30 m)
  if (du.vat.some((v) => v.loai === 'hinh_tu_do' && (v.kieu === 'canh_ngang' || v.kieu === 'canh_tren'))) return 'khong';
  //  - hình TÔ ĐẶC là mặt vật thật (mảnh đất, đảo...): nằm nghiêng 3D nhẹ
  const laMatVatThat = (v: Vat) => v.loai === 'hinh_tu_do' && (v.hinh.some((h) => !!h.to && (h.doTo || 0.28) >= 0.25 && ['da_giac', 'tron', 'da_giac_deu', 'koch', 'svg'].includes(h.kieu)));
  if (du.vat.some(laMatVatThat)) return 'nam';
  //  - hình học, đồ thị, hình chỉ có đường nét, sơ đồ: PHẲNG (xoay 3D làm méo góc, khó đọc số)
  if (du.vat.some((v) => VAT_NAM.includes(v.loai))) return 'khong';
  //  - hộp chữ / thẻ / danh sách / biểu đồ: thẻ nổi nhẹ (hiệu ứng thị giác của hộp chữ)
  if (du.vat.every((v) => VAT_THE.includes(v.loai))) return 'the';
  return 'khong';
}

// CỠ CHỮ TRÊN SÂN KHẤU cố định trên màn hình: sân khấu bị thu nhỏ (nhường chỗ cho công thức) thì chữ trên hình được bù lại,
// để mọi nhãn/chữ của mọi cảnh trông CÙNG MỘT CỠ (hết cảnh chữ to, cảnh chữ nhỏ).
export const CoChuSan = React.createContext(1);
// ngữ cảnh cho HinhTuDo: có đang nằm trên bàn 3D không (để đùn khối)
// huong: hướng đùn khối trên MẶT PHẲNG HÌNH (đơn vị) để bề dày luôn hiện đúng phía theo góc máy
export const KhongGian3D = React.createContext<{nam: boolean; doDay: number; xoay: number; huong?: [number, number]}>({nam: false, doDay: 0, xoay: 0});

export const toiMau = (hex: string, k: number) => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = (v: number) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`;
};

// GÓC MÁY cho cảnh "nam" - ĐA DẠNG nhưng KHÔNG GÂY CHÓNG MẶT (quy tắc của người quay phim):
//  - máy ĐỨNG YÊN phần lớn thời gian; chỉ đổi góc ở các mốc lời giảng sang ý mới (bước của sân khấu), cách nhau >= 2,5 giây;
//  - mỗi lần đổi chỉ ~0,8 giây, tăng tốc rồi hãm êm (không giật), thay đổi tối đa ~40 độ;
//  - không lật nghiêng liên tục; chỉ trôi rất nhẹ (<0,5 độ) để hình không "chết";
//  - bộ góc nhiều kiểu: nhìn từ trên xuống, chéo 3/4 trái/phải, góc thấp chính diện, nhìn cao toàn cảnh, nghiêng nhẹ.
export type GocNhin = {ten: string; nghieng: number; xoay: number; lat: number};
export const BO_GOC: GocNhin[] = [
  {ten: 'cheo_trai', nghieng: 34, xoay: -22, lat: 0},
  {ten: 'tren_xuong', nghieng: 8, xoay: 0, lat: 0},
  {ten: 'cheo_phai', nghieng: 30, xoay: 20, lat: 0},
  {ten: 'thap_chinh_dien', nghieng: 52, xoay: 0, lat: 0},
  {ten: 'cao_toan_canh', nghieng: 22, xoay: -8, lat: 0},
  {ten: 'nghieng_nhe', nghieng: 28, xoay: 10, lat: 7},
];
export const NGHIENG_NAM = 30;
const DOI = 24; // số khung hình của một lần đổi góc
const em = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export function chonGoc(ten: string | undefined, chiSo: number): GocNhin {
  const g = ten ? BO_GOC.find((x) => x.ten === ten) : undefined;
  return g || BO_GOC[((chiSo % BO_GOC.length) + BO_GOC.length) % BO_GOC.length];
}
// mocDoi: các khung hình (tính từ đầu cảnh) máy được phép đổi góc; dsGoc: góc kịch bản chọn (nếu có), không thì tự xoay vòng bộ góc
export function gocMayNam(f: number, soCanh: number, vaoMoi: boolean, kichTinh: boolean, mocDoi: number[] = [], dsGoc: string[] = []) {
  const e = vaoMoi ? expoOut(kep(f / 30)) : 1;
  // các mốc đổi góc cách nhau ít nhất 75 khung (2,5 giây)
  const moc: number[] = [];
  mocDoi.forEach((m) => { if (m > 20 && (!moc.length || m - moc[moc.length - 1] >= 75)) moc.push(m); });
  let i = 0;
  while (i < moc.length && f >= moc[i]) i++;
  const goc = (k: number) => chonGoc(dsGoc[k], soCanh * 2 + k);
  let A = goc(Math.max(0, i - 1)), B = goc(i);
  let m = 1;
  if (i > 0) { m = em(kep((f - moc[i - 1]) / DOI)); A = goc(i - 1); B = goc(i); } else { A = goc(0); B = goc(0); }
  const g = (k: 'nghieng' | 'xoay' | 'lat') => A[k] + (B[k] - A[k]) * m;
  const troi = 0.4 * Math.sin(f / 70);
  const nghieng = g('nghieng') + (kichTinh ? 26 : 16) * (1 - e) + troi;
  const xoay = g('xoay') + (kichTinh ? -30 : -14) * (1 - e) + troi;
  const lat = g('lat') * e;
  return {nghieng, xoay, lat, e};
}
// GÓC MÁY cho hình dựng đứng: xoay trái/phải quanh trục đứng + cúi/ngửa nhẹ; cùng quy tắc đứng yên - đổi góc êm ở mốc lời giảng
const BO_GOC_DUNG: [number, number][] = [[-26, 6], [22, -3], [-12, 12], [28, 4], [8, -6], [-20, -2]];
export function gocMayDung(f: number, soCanh: number, vaoMoi: boolean, mocDoi: number[] = []) {
  const e = vaoMoi ? expoOut(kep(f / 30)) : 1;
  const moc: number[] = [];
  mocDoi.forEach((m) => { if (m > 20 && (!moc.length || m - moc[moc.length - 1] >= 75)) moc.push(m); });
  let i = 0;
  while (i < moc.length && f >= moc[i]) i++;
  const g = (k: number) => BO_GOC_DUNG[((soCanh * 2 + k) % BO_GOC_DUNG.length + BO_GOC_DUNG.length) % BO_GOC_DUNG.length];
  const A = g(Math.max(0, i - 1)), B = g(i);
  const x = i > 0 ? kep((f - moc[i - 1]) / 24) : 1;
  const m = i > 0 ? (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2) : 1;
  const ry = (i > 0 ? A[0] + (B[0] - A[0]) * m : A[0]) - 40 * (1 - e) + 0.4 * Math.sin(f / 70);
  const rx = (i > 0 ? A[1] + (B[1] - A[1]) * m : A[1]) + 10 * (1 - e);
  // bề dày khối hiện về phía ngược hướng xoay (nhìn từ trái thấy mặt bên trái...)
  const sy = Math.sin((ry * Math.PI) / 180), sx = Math.sin((rx * Math.PI) / 180);
  const dai = Math.min(1, Math.hypot(sy, sx) + 0.35);
  const huong: [number, number] = [(-sy / (Math.hypot(sy, sx) || 1)) * dai, (sx / (Math.hypot(sy, sx) || 1)) * dai + 0.15];
  return {ry, rx, e, huong};
}
export const HinhDung3D: React.FC<{ry: number; rx: number; h: number; children: React.ReactNode}> = ({ry, rx, h, children}) => (
  <div style={{position: 'absolute', inset: 0, perspective: 1700}}>
    <div style={{position: 'absolute', left: '18%', right: '18%', top: h * 0.8, height: 60, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.5), rgba(0,0,0,0) 70%)'}} />
    <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateY(${ry}deg) rotateX(${rx}deg) scale(0.95)`}}>{children}</div>
  </div>
);

// vị trí trên màn hình (so với tâm sân khấu) của một điểm nằm trên mặt phẳng hình 3D: dùng để đặt lóe sáng / vật đứng đúng chỗ
// điểm trên mặt hình dựng đứng (HinhDung3D: rotateY(ry) rotateX(rx) scale(0.95), phối cảnh 1700 ở giữa) -> vị trí trên màn hình (so với tâm)
export function chieuDung(dx: number, dy: number, ry: number, rx: number) {
  const a = (rx * Math.PI) / 180, b = (ry * Math.PI) / 180;
  const x0 = dx * 0.95, y0 = dy * 0.95;
  const y1 = y0 * Math.cos(a), z1 = y0 * Math.sin(a);
  const x2 = x0 * Math.cos(b) + z1 * Math.sin(b), z2 = -x0 * Math.sin(b) + z1 * Math.cos(b);
  const k = 1700 / (1700 - z2);
  return {x: x2 * k, y: y1 * k};
}
export function chieuNam(dx: number, dy: number, w: number, h: number, nghieng: number, xoay: number, lat = 0) {
  const s = 0.93;
  const a = (xoay * Math.PI) / 180;
  const n = (nghieng * Math.PI) / 180;
  const r = (lat * Math.PI) / 180;
  // thứ tự CSS: scale -> rotateZ(xoay) -> rotateY(lat) -> rotateX(nghieng)
  const x1 = (dx * Math.cos(a) - dy * Math.sin(a)) * s;
  const y1 = (dx * Math.sin(a) + dy * Math.cos(a)) * s;
  const x2 = x1 * Math.cos(r);
  const z1 = -x1 * Math.sin(r);
  const y3 = y1 * Math.cos(n) - z1 * Math.sin(n);
  const z3 = y1 * Math.sin(n) + z1 * Math.cos(n);
  const d = 1900;
  const oy = 0.1 * h - h / 2; // gốc phối cảnh (perspectiveOrigin 50% 10%)
  const k = d / (d - z3);
  return {x: x2 * k, y: oy + (y3 - oy) * k};
}

// HÌNH 3D TỰ DO: không tấm nền, không khung. Chỉ có hình (đã đùn khối) xoay trong không gian + vòng quỹ đạo chấm mờ dưới chân.
export const BanKinh3D: React.FC<{w: number; h: number; mau: string; nghieng: number; xoay: number; lat?: number; children: React.ReactNode; nen?: React.ReactNode}> = ({h, nghieng, xoay, lat = 0, children, nen}) => (
  <div style={{position: 'absolute', inset: 0, perspective: 1900, perspectiveOrigin: '50% 10%'}}>
    <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateX(${nghieng}deg) rotateY(${lat}deg) rotateZ(${xoay}deg) scale(0.93)`}}>
      {nen ? <div style={{position: 'absolute', inset: 0, transform: 'translateZ(-2px)', opacity: 0.7}}>{nen}</div> : null}
      <div style={{position: 'absolute', inset: 0, transform: 'translateZ(2px)'}}>{children}</div>
    </div>
  </div>
);

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
