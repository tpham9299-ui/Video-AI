// v97 — ĐỘNG CƠ HÌNH HỌC KHÔNG GIAN (chuẩn thẩm mỹ GeoGebra 3D) — kiểu dữ liệu.
// Tọa độ do scripts/giai_hinh_khong_gian.py tính (AI không đoán tọa độ); mốc xoay do chuanbi.py đổi từ `moc_xoay` (lời đọc).
// KHÔNG có trường nét đứt lưu cứng: nét liền / đứt tính giải tích lại ở MỌI khung hình từ góc máy tức thời (hlr.ts).
export type V3 = [number, number, number];

export type VaiDoan = 'khoi' | 'phu' | 'dich' | 'keo_dai' | 'giao_tuyen';

export type DungKG = {
  diem: Record<string, V3>;
  khoi: {loai: string; dinh: string[]; mat: string[][]; canh: [string, string][]};
  doan: {id: string; a: string; b: string; vai: VaiDoan}[];
  kinh: {id: string; ten: string; diem: string[]; da_giac: V3[]; bung: V3[] | null; mau?: string}[];
  goc: {id: string; dinh: string; a: string; b: string; vuong: boolean; nhan: string}[];
  truot: {diem: string; tren?: string[]; khung: {u: number; diem: Record<string, V3>}[]} | null;
  nhan: string[];
};

// 5 chế độ camera sư phạm (AI chỉ chọn tên + đối tượng đích; máy tính góc cầu tối ưu)
export type CheDoMay = 'toan_canh' | 'truc_dien_mat' | 'ep_mep_mat' | 'nhin_day' | 'can_canh';

export type XoayVao = {
  t: number; // giây bắt đầu xoay (= mốc lời - 0,15 s)
  d: number; // thời lượng xoay 0,9..1,2 s
  goc_nhin: CheDoMay;
  doi_tuong?: string[];
  moc?: number; // giây giọng đọc bắt đầu cụm moc_xoay
  khi_noi?: string;
};

export type KhongGianVao = {
  phienBan: 1;
  dung: DungKG;
  xoay: XoayVao[];
  hien?: Record<string, number>; // id -> giây bắt đầu hiện (thiếu = có từ đầu)
  nhanManh?: {t: number; ids: string[]}[];
  hanhDong?: {loai: 'bung_mat'; id: string; t: number; d: number}[];
  truotGio?: {t: number; d: number}; // hiệu ứng điểm trượt (hook 2 s đầu)
  tongGiay?: number;
};

// Tư thế máy: hướng nhìn (từ tâm về máy) + tâm nhìn + tỉ lệ khung
export type TuThe = {n: number; c: number; muc: V3; R: number; k: number; ox: number; oy: number};

export type MatVo = {ten: string[]; p: V3[]; n: V3; g: V3}; // n: pháp tuyến hướng RA NGOÀI khối lồi
export type Kinh = {id: string; p: V3[]; n: V3; op: number; bung: boolean};
export type DoanVe = {id: string; a: V3; b: V3; vai: VaiDoan; tenA?: string; tenB?: string};
// mảnh nét sau phân tích khuất: khuat = bị mặt vỏ che (nét đứt), sauKinh = nằm sau mặt kính bán trong suốt
export type ManhNet = {id: string; vai: VaiDoan; a: V3; b: V3; khuat: boolean; sauKinh: boolean; u0: number; u1: number};
