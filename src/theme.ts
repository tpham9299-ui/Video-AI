// Phông chữ ĐÓNG GÓI SẴN trong public/fonts (không tải từ Google Fonts nên không thể lỗi mạng/lỗi tên phông).
// Thứ tự ưu tiên: phông riêng của bạn (tuy_chon-*.ttf, nếu có) > Liberation Sans (chữ, số, biến) > DejaVu Sans (ký hiệu toán) > phông hệ thống.
// Be Vietnam Pro (OFL): phông thiết kế riêng cho tiếng Việt, nét đậm mạnh, hợp tiêu đề và phụ đề TikTok.
export const FONT = '"VietTuyChon", "VietNoi", "VietSans", "VietSym", "Liberation Sans", "DejaVu Sans", sans-serif';
// Tiêu đề và phụ đề dùng cùng họ chữ với nội dung; phân cấp bằng độ đậm.
export const FONT_DAM = FONT;
// Chữ kiểu "sticker" TikTok: viền tối dày + bóng đổ khối 3D để chữ nổi trên nền nhiều hình ảnh.
export const BONG_CHU = '0 3px 0 rgba(4,12,12,0.95), 0 6px 0 rgba(4,12,12,0.6), 0 10px 22px rgba(0,0,0,0.55)';
export const vienChu = (co: number) => `${Math.max(2, co * 0.07).toFixed(1)}px rgba(4,12,12,0.95)`;

export type KhaiBaoPhong = [family: string, tep: string, weight: string, style: string];
export const KHAI_BAO_PHONG: KhaiBaoPhong[] = [
  ['VietTuyChon', 'tuy_chon-dam.ttf', '900', 'normal'],
  ['VietNoi', 'BeVietnamPro-Medium.ttf', '400', 'normal'],
  ['VietNoi', 'BeVietnamPro-Medium.ttf', '500', 'normal'],
  ['VietNoi', 'BeVietnamPro-Bold.ttf', '600', 'normal'],
  ['VietNoi', 'BeVietnamPro-Bold.ttf', '700', 'normal'],
  ['VietNoi', 'BeVietnamPro-ExtraBold.ttf', '800', 'normal'],
  ['VietNoi', 'BeVietnamPro-Black.ttf', '900', 'normal'],
  ['VietNoi', 'BeVietnamPro-BoldItalic.ttf', '700', 'italic'],
  ['VietNoi', 'BeVietnamPro-BlackItalic.ttf', '900', 'italic'],
  ['VietSans', 'LiberationSans-Regular.ttf', '400', 'normal'],
  ['VietSans', 'LiberationSans-Bold.ttf', '700', 'normal'],
  ['VietSans', 'LiberationSans-Italic.ttf', '400', 'italic'],
  ['VietSans', 'LiberationSans-BoldItalic.ttf', '700', 'italic'],
  ['VietSerif', 'LiberationSerif-Regular.ttf', '400', 'normal'],
  ['VietSerif', 'LiberationSerif-Bold.ttf', '700', 'normal'],
  ['VietSerif', 'LiberationSerif-Italic.ttf', '400', 'italic'],
  ['VietSerif', 'LiberationSerif-BoldItalic.ttf', '700', 'italic'],
  ['VietSym', 'DejaVuSans.ttf', '400', 'normal'],
  ['VietSym', 'DejaVuSans-Bold.ttf', '700', 'normal'],
  ['VietSym', 'DejaVuSans-Oblique.ttf', '400', 'italic'],
  ['VietSym', 'DejaVuSans-BoldOblique.ttf', '700', 'italic'],
  // phông riêng (tùy chọn): lỗi/thiếu tệp thì bỏ qua, không làm hỏng video
  ['VietTuyChon', 'tuy_chon-regular.ttf', '400', 'normal'],
  ['VietTuyChon', 'tuy_chon-bold.ttf', '700', 'normal'],
  ['VietTuyChon', 'tuy_chon-italic.ttf', '400', 'italic'],
  ['VietTuyChon', 'tuy_chon-bolditalic.ttf', '700', 'italic'],
];

export const FONT_SERIF = '"VietSerif", "Liberation Serif", "DejaVu Serif", serif';

// Giao diện hiện hành (đặt từ phong_cach.json ở Video.tsx): kiểu công thức và kiểu hình.
export const GIAO_DIEN = {kieuToan: 'latex', kieuHinh: 'manim', chuyenDong: 'cu', nhan: '#3BF2D0', manimLop: false};
// màu của từng LOẠI CÂU HỎI (ảnh bìa + màu nhấn duy nhất của video ở bộ hiệu ứng mới)
export const MAU_LOAI: Record<string, string> = {
  'Xác suất': '#B79CFF', 'Hình học': '#4FC3F7', 'Tối ưu': '#3BF29A', 'Toán tiền bạc': '#FFD24A', 'Đo đạc': '#FF7EB6', 'Toán đi chợ': '#FF8A3D', 'Toán thực tế': '#3BF2D0',
};
export const laMoi = () => GIAO_DIEN.chuyenDong === 'moi';
// chữ trên nền màu nhấn: màu sáng -> chữ tối
export const chuTrenMau = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.55 ? '#06201C' : '#ffffff';
};

export const FPS = 30;
export const RONG = 1080;
export const CAO = 1920;

// Bảng màu theo video mẫu (Manim): nền đen, nét trắng, nhấn màu cam vàng.
export const MAU_GOC = {
  nen1: '#111111',
  nen2: '#161616',
  vang: '#F5A623', // cam vàng: mũi tên, công thức, nhấn mạnh
  tieuDe: '#F7C531', // vàng của từ khóa trong tiêu đề
  lam: '#58C4DD',
  hong: '#FC6255',
  xanh: '#83C167',
  vang2: '#F5A623',
  tim: '#9A72AC',
  chu: '#ffffff',
  mo: 'rgba(255,255,255,0.6)',
  the: 'rgba(255,255,255,0.06)',
  vien: 'rgba(255,255,255,0.22)',
};
export const MAU = {...MAU_GOC};
