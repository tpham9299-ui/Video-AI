// v90 — KIỂU DỮ LIỆU của động cơ 3D Vector (đặc tả `canh_3d_vector` đã chuẩn hóa, dùng trong Remotion).
// AI viết đặc tả theo schema gọn (xem dac_ta.ts); chuẩn hóa xong mọi trường đều có giá trị mặc định an toàn.

export type V3 = [number, number, number];
export type TenMau = 'cyan' | 'vang' | 'hong' | 'ngoc' | 'trang' | 'xam';

// Bảng màu ngữ nghĩa (cố định): cyan = hình/đối tượng đề cho, vàng = đang xét/kết quả, hồng = ẩn số/cần tìm, ngọc = đúng/kiểm chứng.
export const MAU_3DV: Record<TenMau, string> = {
  cyan: '#38BDF8',
  vang: '#FACC15',
  hong: '#FB7185',
  ngoc: '#34D399',
  trang: '#E6EDF5',
  xam: '#7C8696',
};

// Tham chiếu điểm: tên điểm/đỉnh ("A", "khung.dinh[4]", "cau1.tam"), tọa độ, hoặc trục từ một điểm ("+z").
export type ThamChieu = string | V3;

export type LoaiKhoi =
  | 'diem' | 'doan_thang' | 'vector' | 'da_giac' | 'hinh_hop' | 'mat_cau'
  | 'hinh_tru' | 'hinh_non' | 'hinh_chop' | 'duong_cong' | 'goc' | 'nhom_lap';

export type KieuNet = 'tu_dong' | 'lien' | 'dut';

export type DoiTuong = {
  id: string;
  loai: LoaiKhoi;
  mau: TenMau;
  nhan: string; // nhãn KaTeX ('' = không nhãn)
  net: KieuNet; // tu_dong = tự tính nét khuất
  mo: number; // độ đục mặt (0..1)
  che: boolean; // mặt của vật có che nét phía sau không
  // diem
  toaDo?: V3;
  tren?: {duong: string; t: number};
  // doan_thang / vector
  tu?: ThamChieu;
  den?: ThamChieu;
  // da_giac
  diem?: ThamChieu[];
  nhanCanh?: number; // da_giac: đặt nhãn ở giữa cạnh thứ i, đẩy ra ngoài đa giác
  banLe?: [ThamChieu, ThamChieu];
  gocGap?: number; // độ gập ban đầu quanh bản lề
  // hinh_hop
  tam?: V3;
  kichThuoc?: V3;
  nap?: boolean;
  tenDinh?: string[];
  // mat_cau / tru / non
  banKinh?: number;
  luoi?: [number, number]; // [số kinh tuyến, số vĩ tuyến]
  day?: ThamChieu; // tâm đáy (trụ, nón)
  cao?: number;
  // hinh_chop
  dayDa?: ThamChieu[]; // đa giác đáy
  dinh?: ThamChieu; // đỉnh chóp
  // duong_cong
  ham?: {x: string; y: string; z: string; t: [number, number]};
  cung?: {tam: ThamChieu; banKinh: number; phap: V3; tu: number; den: number};
  kin?: boolean;
  muot?: boolean;
  // goc
  dinhGoc?: ThamChieu;
  canh?: [ThamChieu, ThamChieu];
  vuong?: boolean;
  // nhom_lap
  vat?: 'bi' | 'the' | 'khoi';
  so?: number;
  xep?: 'hang' | 'luoi' | 'vong';
  khoang?: number;
  nhanTung?: string[];
  mauTung?: TenMau[];
};

// v92: dich (tịnh tiến cả vật: mặt phẳng cắt trượt, nhấc vật), ve_dan (vẽ dần đồ thị/đường cong theo thời gian),
// nang (nhấc nổi + đổi màu + phát sáng các phần tử chọn của nhom_lap: thẻ/bi được chọn ở từng bước).
export type LoaiHanhDong = 'truot_diem' | 'tach_vector' | 'gap_mat' | 'dich' | 've_dan' | 'nang';

export type HanhDong = {
  loai: LoaiHanhDong;
  vat: string;
  t: number; // giây bắt đầu
  d: number; // thời lượng (giây)
  tu?: number; // truot_diem: tham số đầu (0..1); gap_mat: góc đầu (độ)
  den?: number;
  thanhPhan?: ('ngang' | 'dung')[]; // tach_vector
  vec?: V3; // dich: độ dời cuối (cộng dồn với các lần dịch trước)
  chiSo?: number[]; // nang: chỉ số phần tử (0-based) của nhom_lap
  mauNang?: TenMau; // nang: màu phần tử được chọn
  cao?: number; // nang: độ nhấc (đơn vị thế giới; mặc định 0,4 × khoảng)
  khiNoi?: string;
};

// [goc_ngang, goc_cao, zoom]: góc ngang 0 = nhìn chính diện từ phía -y; góc cao 90 = nhìn thẳng từ trên xuống.
export type Camera = [number, number, number];

export type Buoc3D = {
  t: number; // giây (chuanbi.py đổi từ khi_noi; mẫu thử ghi thẳng)
  camera: Camera | null;
  hien: string[];
  an: string[];
  nhanManh: string[];
  hanhDong: HanhDong[];
  khiNoi?: string;
};

export type Canh3DV = {
  phienBan: 1;
  doiTuong: DoiTuong[];
  buoc: Buoc3D[];
  quayNhe: boolean; // máy trôi nhẹ cho sân khấu "sống"
};

/* ---- Mảnh vẽ (đầu ra của dựng cảnh, trước khi chiếu) ---- */
export type ManhNet = {
  k: 'net'; a: V3; b: V3; mau: string; w: number; net: KieuNet; op: number; sang: number; mui?: boolean; nhom: string;
};
export type ManhMat = {k: 'mat'; p: V3[]; mau: string; op: number; vien: number; nhom: string};
export type ManhCham = {k: 'cham'; p: V3; mau: string; r: number; rTheGioi?: number; op: number; kieu: 'diem' | 'bi'; sang: number; nhom: string};
// doan: nhãn của đoạn/vector -> đặt vuông góc với thân; tam: đẩy nhãn ra xa điểm này (mặc định tâm cảnh)
export type ManhNhan = {k: 'nhan'; p: V3; tex: string; mau: string; op: number; co: number; nhom: string; tam?: V3; doan?: [V3, V3]};
export type Manh = ManhNet | ManhMat | ManhCham | ManhNhan;

// Vật che (để tính nét khuất bằng tia từ máy quay).
export type VatChe = {k: 'mat'; p: V3[]; n: V3} | {k: 'cau'; o: V3; r: number};
