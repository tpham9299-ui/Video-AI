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
};

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
};
