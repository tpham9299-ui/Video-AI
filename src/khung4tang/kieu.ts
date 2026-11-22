// v90 — Dữ liệu của khung 4 tầng (props của composition `Khung4Tang`; sau này chuanbi.py sinh ra từ kịch bản).
import {TenMau} from '../3d-vector/kieu';

export type TheGiai =
  | {loai: 'cong_thuc'; dong: string[]; moc?: number[]; t?: number; nhan?: string}
  | {loai: 'casio'; phim: string[]; ket_qua: string; t?: number; nhan?: string}
  | {loai: 'bang_bien_thien'; moc_x: string[]; dau: string[]; gia_tri: string[]; ham?: string; bien?: string; t?: number; nhan?: string}
  | {loai: 'chu'; noi_dung: string; t?: number; nhan?: string};

export type BuocGiai = {
  t: number; // giây bắt đầu bước
  nhan: string; // phần sau "BƯỚC n · "
  tieu_de: string;
  mau?: TenMau; // màu nhấn của bước
  du_kien?: string[]; // id dữ kiện trên thanh ĐỀ được dùng ở bước này
  the: TheGiai[];
  // v93: đối chiếu "Hình động ↔ Đồ thị ngưỡng" (bài tối ưu); thiếu / sai -> tầng 2 giữ sân khấu 3D chuẩn
  doi_chieu?: DoiChieuVao;
};

// v93: dữ liệu thô của cảnh đối chiếu (chuanbi.py suy từ khuôn hoặc AI ghi); kiểm hợp lệ ở doi_chieu.ts trước khi vẽ
export type DoiChieuVao = {
  ham: string; // biểu thức một biến (biến tên `bien`), ví dụ "x*(12-2*x)^2"
  bien?: string;
  ten_ham?: string;
  mien: [number, number];
  kieu?: 'max' | 'min';
  toi_uu?: number; // AI ghi (tùy chọn) -> phải trùng điểm tối ưu máy tính lại
  nguong?: {gia_tri: number; kieu: '<=' | '>='; nhan?: string};
  hinh?: 'tam_bia' | 'mat_cat_tru' | 'tam_giac_luc' | 'thanh';
  tham_so?: Record<string, number>;
  don_vi?: string;
  hien_so?: boolean; // true khi bước nằm từ cảnh đáp án trở đi -> được ghi số x*, f* (chống lộ đáp án)
};

// v93: Intro "3 giây móc câu" + Outro "tóm tắt 3 bước" (chuanbi.py luôn điền đủ; thiếu -> giữ intro/màn kết v92)
export type MocCau = {nhan_thi: string; tieu_de: string; phu_de: string; cau_hook: string; cta: string; giay?: number};
export type DongTomTat = {chien_thuat: string; cong_thuc: string; mau?: TenMau};

export type DuKienGhim = {id: string; nhan: string; mau?: TenMau};

export type Khung4TangVao = {
  tongFrame: number;
  fps?: number;
  thuongHieu?: string;
  boCuc?: {anToanTikTok?: boolean; phuDe?: 'tat' | 'gon'};
  deGhim: DuKienGhim[];
  buoc: BuocGiai[];
  canh3dv: unknown; // đặc tả thô `canh_3d_vector` (chuẩn hóa trong component)
  cau?: {text: string; bat: number; ket: number}[]; // phụ đề gọn (tùy chọn)
  mocCau?: MocCau | null; // v93: có -> Intro móc câu phủ những giây đầu, 3 tầng chữ/thẻ vào sau
  tomTat?: DongTomTat[] | null; // v93: 3 dòng tóm tắt cho OutroTomTat
};
