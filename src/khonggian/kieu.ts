// v97 — ĐỘNG CƠ HÌNH HỌC KHÔNG GIAN (chuẩn thẩm mỹ GeoGebra 3D) — kiểu dữ liệu.
// Tọa độ do scripts/giai_hinh_khong_gian.py tính (AI không đoán tọa độ); mốc xoay do chuanbi.py đổi từ `moc_xoay` (lời đọc).
// KHÔNG có trường nét đứt lưu cứng: nét liền / đứt tính giải tích lại ở MỌI khung hình từ góc máy tức thời (hlr.ts).
export type V3 = [number, number, number];

// v98 Lego: + truc (trục tọa độ) | truc_vach (vạch chia) | gion / gion_phu (đường gióng kích thước) | cong (đường cong lấy mẫu)
// | vector | luoi (lưới bề mặt cầu)
export type VaiDoan = 'khoi' | 'phu' | 'dich' | 'keo_dai' | 'giao_tuyen' | 'truc' | 'truc_vach' | 'gion' | 'gion_phu' | 'cong' | 'vector' | 'luoi';

// v98 — khối Lego (đa diện hoặc mặt cong xấp xỉ đa diện): `vien` = cạnh chỉ vẽ khi là ĐƯỜNG VIỀN (giữa mặt trước / mặt sau),
// tính lại mỗi khung -> trụ / nón / cầu có đường sinh biên đúng phối cảnh; `canh` = cạnh luôn vẽ (vành đáy, lưới)
export type KhoiLego = {id: string; loai: string; dinh: string[]; mat: string[][]; canh: [string, string][]; vien: [string, string, number, number][]; cong: boolean; mau: string; to: boolean};
export type NhanTu = {id: string; tex: string; p: V3; mau: string; co?: number; chu?: boolean; hien?: string};
export type BienHinh = {loai: 'tinh_tien' | 'doi_xung_mat' | 'quay'; t: number; d: number; cap: [string, string][]; truc?: {o: V3; v: V3; goc: number}};
export type ChuyenDong = {diem: string; duong: V3[]; moc: {t: number; u: number}[]; doc?: {ds: string[]; heSo: number; dv: string}};

export type DungKG = {
  diem: Record<string, V3>;
  khoi: {loai: string; dinh: string[]; mat: string[][]; canh: [string, string][]};
  doan: {id: string; a: string; b: string; vai: VaiDoan; mau?: string; mui?: 'cuoi' | 'hai'; dut?: boolean; nhom?: string}[];
  kinh: {id: string; ten: string; diem: string[]; da_giac: V3[]; bung: V3[] | null; mau?: string; san?: boolean}[];
  goc: {id: string; dinh: string; a: string; b: string; vuong: boolean; nhan: string}[];
  truot: {diem: string; tren?: string[]; khung: {u: number; diem: Record<string, V3>}[]} | null;
  nhan: string[];
  // v98 Lego (tùy chọn — vắng mặt = cảnh v97 một khối)
  lego?: boolean;
  khoiDs?: KhoiLego[];
  nhanTu?: NhanTu[];
  nhanTen?: Record<string, string>;
  mauDiem?: Record<string, string>;
  tiLe?: number;
  heTruc?: string;
};

// 5 chế độ camera sư phạm (AI chỉ chọn tên + đối tượng đích; máy tính góc cầu tối ưu)
// v98: + phang_2d (nhìn thẳng từ trên, gần như không phối cảnh) — cảnh dẫn 2D rồi xoay ra 3D liền mạch
export type CheDoMay = 'toan_canh' | 'truc_dien_mat' | 'ep_mep_mat' | 'nhin_day' | 'can_canh' | 'phang_2d';

export type XoayVao = {
  t: number; // giây bắt đầu xoay (= mốc lời - 0,15 s)
  d: number; // thời lượng xoay 0,9..1,2 s
  goc_nhin: CheDoMay;
  doi_tuong?: string[];
  moc?: number; // giây giọng đọc bắt đầu cụm moc_xoay
  khi_noi?: string;
};

export type KhongGianVao = {
  phienBan: 1 | 2;
  dung: DungKG;
  xoay: XoayVao[];
  hien?: Record<string, number>; // id -> giây bắt đầu hiện (thiếu = có từ đầu)
  nhanManh?: {t: number; ids: string[]; coLap?: boolean}[]; // coLap: nền mờ 80 % (chỉ sáng 2-3 đối tượng trọng tâm)
  hanhDong?: {loai: 'bung_mat'; id: string; t: number; d: number}[];
  truotGio?: {t: number; d: number}; // hiệu ứng điểm trượt (hook 2 s đầu)
  tongGiay?: number;
  bienHinh?: BienHinh[]; // v98: tinh_tien | doi_xung_mat | quay (ảnh chạy từ điểm gốc tới vị trí đích đúng mốc lời)
  chuyen?: ChuyenDong[]; // v98: truot_toi_uu + vật chuyển động theo đường
};

// Tư thế máy: hướng nhìn (từ tâm về máy) + tâm nhìn + tỉ lệ khung
// xa: hệ số khoảng cách máy (1 = phối cảnh SGK; lớn = gần trực giao, dùng cho phang_2d)
export type TuThe = {n: number; c: number; muc: V3; R: number; k: number; ox: number; oy: number; xa?: number};

export type MatVo = {ten: string[]; p: V3[]; n: V3; g: V3; khoi?: number; cong?: boolean}; // n: pháp tuyến hướng RA NGOÀI khối lồi; v98: khoi = chỉ số khối, cong = mặt xấp xỉ mặt cong
export type Kinh = {id: string; p: V3[]; n: V3; op: number; bung: boolean};
export type DoanVe = {id: string; a: V3; b: V3; vai: VaiDoan; tenA?: string; tenB?: string};
// mảnh nét sau phân tích khuất: khuat = bị mặt vỏ che (nét đứt), sauKinh = nằm sau mặt kính bán trong suốt
export type ManhNet = {id: string; vai: VaiDoan; a: V3; b: V3; khuat: boolean; sauKinh: boolean; u0: number; u1: number};
