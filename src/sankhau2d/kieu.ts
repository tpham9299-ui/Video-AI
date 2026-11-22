// v96 — KIỂU DỮ LIỆU sân khấu 2D (props.khung4tang.sanKhau). Mọi con số đã được chuanbi.py (khung4tang_v96.py) TÍNH SẴN và
// đối chiếu đáp án; Remotion chỉ dựng hình theo mốc `pha[].t` (giây, đổi từ `khi_noi`) và nhấn nhá ở `nhip[]`.
import type {TenMau} from '../3d-vector/kieu';

export type Pha2D = {ten: string; t: number; chon?: number[]; thoa?: boolean | null; bt?: string; kl?: string; muc_tieu?: 'A' | 'doi'};
type Chung = {pha: Pha2D[]; nhip?: number[]; nguon?: string; chi_dao?: string};

export type PhanTuRut = {nhan: string; gia_tri: number | null; nhom: number};
export type RutMauVao = Chung & {
  loai: 'rut_mau'; vat: 'the' | 'bi' | 'xuc_xac'; k: number; co_hoan_lai?: boolean;
  phan_tu: PhanTuRut[]; nhom: {nhan: string; mau: TenMau}[];
  n_omega: number; n_a?: number; n_doi?: number; p?: string; bien_co: string; omega_tex?: string;
};
export type NutCay = {id: number; nhan: string; tang: number; cha: number; duong: number[]; p: string; tich: string | null; la: boolean; sang: boolean};
export type SoDoCayVao = Chung & {loai: 'so_do_cay'; tang: string[]; nut: NutCay[]; canh: {tu: number; den: number}[]; tong?: string; bt_tong?: string; p?: string; mau_so?: string};
export type LuoiBayesVao = Chung & {
  loai: 'luoi_bayes'; nhan_a: string; nhan_b: string; pa: number; pba: number; pbna: number; hoi?: 'B';
  tex: {pa: string; pna: string; pba: string; pbna: string; pab: string; pnab: string; pb: string}; p?: string;
};
export type CotPhanPhoiVao = Chung & {loai: 'cot_phan_phoi'; cot: {nhan: string; p: string; gia_tri: number}[]; dich: number[]; truc_x?: string; nhan_x?: string; p?: string; bt_tong?: string};
export type KinhTeVao = Chung & {
  loai: 'kinh_te_do_thi'; ham: string; bien: string; mien: [number, number]; kieu: 'max' | 'min'; ten_ham: string;
  nhan_bien: string; nhan_ham: string; don_vi: string; phu: {ten: string; ham: string; don_vi: string}[]; x_tot: number; y_tot: number;
};
export type SoDo2DVao = Chung & {
  loai: 'so_do_2d'; mau: 'song_bo' | 'day_cap' | 'cong_parabol' | 'rao_tuong' | 'thang_tuong'; tham_so: Record<string, number>; bien: string;
  nhan: Record<string, string>; ten_ham: string; don_vi: string; ham?: string; mien?: [number, number]; x_tot?: number; y_tot?: number; kieu?: 'max' | 'min';
};
export type TangTruongVao = Chung & {loai: 'tang_truong'; ham: string; bien: string; mien: [number, number]; ten_ham: string; don_vi: string; nhan_bien: string; moc: {x: number; y: number}[]; nguong?: number};
export type TuDuyVao = Chung & {loai: 'tu_duy_dai_so'; du_kien: string[]; nut: {nhan: string; tieu_de: string; dong: string; mau: TenMau}[]; do_thi?: {ham: string; ten: string}};

export type SanKhau2DVao = RutMauVao | SoDoCayVao | LuoiBayesVao | CotPhanPhoiVao | KinhTeVao | SoDo2DVao | TangTruongVao | TuDuyVao;
