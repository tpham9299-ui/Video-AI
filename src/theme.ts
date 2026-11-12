// Phông chữ ĐÓNG GÓI SẴN trong public/fonts (không tải từ Google Fonts nên không thể lỗi mạng/lỗi tên phông).
// Thứ tự ưu tiên: phông riêng của bạn (tuy_chon-*.ttf, nếu có) > Liberation Sans (chữ, số, biến) > DejaVu Sans (ký hiệu toán) > phông hệ thống.
export const FONT = '"VietTuyChon", "VietSans", "VietSym", "Liberation Sans", "DejaVu Sans", sans-serif';

export type KhaiBaoPhong = [family: string, tep: string, weight: string, style: string];
export const KHAI_BAO_PHONG: KhaiBaoPhong[] = [
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
export const GIAO_DIEN = {kieuToan: 'latex', kieuHinh: 'manim'};

export const FPS = 30;
export const RONG = 1080;
export const CAO = 1920;

// Bảng màu theo video mẫu (Manim): nền đen, nét trắng, nhấn màu cam vàng.
export const MAU = {
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
