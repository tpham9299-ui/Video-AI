// Kiểu dữ liệu chung. File props.json do scripts/chuanbi.py sinh ra có đúng dạng "Props" này.

export type Cau = {text: string; bat: number; ket: number}; // bat/ket: giây tính từ đầu cảnh

export type MinhHoa = {loai: string; moTa?: string; duLieu?: unknown};

// Hành động của vật theo mốc lời đọc (giai đoạn D, từ dac_ta_canh.quay[].hanh_dong).
export type HanhDong3D = {
  vat: string; dongTu: string; so?: number | null; thamSo?: Record<string, unknown>;
  t: number; d: number; khiNoi?: string; xong?: boolean; // xong: đã làm ở cảnh trước -> giữ trạng thái cuối
};
export type VatPhepThu = {id: string; the: string; ban: number; kieu: 'binh' | 'coc' | 'hop' | 'bi' | 'xuc_xac' | 'dong_xu' | 'the' | 'bong'; mau: string; nhan?: string; trong?: string};

export type MoiTruong = {loai: 'xe_duong'} | {
  loai: 'phep_thu'; vat: 'hop_bi' | 'dong_xu' | 'xuc_xac'; gia_tri: (string | number)[];
  dong: boolean; so_rut: number; mau_rut: string | null; giuCuoi?: boolean;
} | {
  loai: 'dac_ta'; vat: VatPhepThu[]; boQua?: string[];
  boiCanh: {mau: string; ngoaiTroi: boolean; troi: string; dat: string; thoiGian?: string};
  quay: {gocMay: string; chuyenMay: string; tieuDiem: string[]; hanhDong: HanhDong3D[]};
};

// Mốc hành động cho khung Blender: [0, dan] máy vào cảnh, rồi mỗi hành động một đoạn khung bằng nhau (ve_blender.DAN).
export type NhipQuay = {dan: number; gocMay?: string; chuyenMay?: string; moc: {t: number; d: number; dongTu?: string; vat?: string}[]};

export type CanhProps = {
  so: number;
  loai: string;
  mocCongThuc?: number[];
  noiDung: string[]; // các dòng LaTeX hiện trên màn hình
  minhHoa: MinhHoa;
  anhCanh3D?: string;
  moiTruong?: MoiTruong;
  nhipQuay?: NhipQuay;
  quay?: {gocMay: string; chuyenMay: string; tieuDiem: string[]; hienSoLieu?: string[]; hanhDong: {i: number; vat: string; dongTu: string; t: number | null; khop: boolean}[]};
  nhipXe?: {tong:number; moc:{t:number;s:number;v:number;a:number;j?:number;chay?:number}[]};
  phaMinhHoa?: "thuc" | "chuyen" | "toan";
  chuoi3D?: {khungThat?: number; hinhGiai?: string;nenDung?: string; nenKhung?: number; thuMuc: string; netCuoi: number; xeDuong?: [number,number]; coThuoc?: boolean; giuVatCuoi?: boolean; phepThu?: boolean; giuNet?: boolean};
  nhanNet?: string;
  mocNhanNet?: number;
  congThucManim?: string[];
  audio: string | null; // đường dẫn trong thư mục public/, ví dụ "giong/VT2610-xx_c1.mp3"
  batDau: number; // khung hình bắt đầu của cảnh trong cả video
  soFrame: number; // số khung hình của cảnh
  leadFrame: number; // số khung hình im lặng trước khi bắt đầu đọc
  cau: Cau[]; // các câu/đoạn lời thoại kèm mốc thời gian
  chuThich: string[]; // khung chú thích viền vàng (ý tưởng then chốt)
  trinhBay: string; // 'bien_doi' = các dòng công thức biến hình nối tiếp kiểu Manim; 'xep' = xếp chồng
  tieuDeCanh: string; // câu tiêu đề lớn của cảnh (chữ trắng đậm)
  tuKhoa: string; // cụm từ trong tiêu đề được tô cam
  nhan: string; // nhãn viên thuốc màu cam (để trống = tự đặt theo loại cảnh)
  giuSanKhau: boolean;
  gocNhin?: string[]; // 3D: các góc máy lần lượt (cheo_trai | tren_xuong | cheo_phai | thap_chinh_dien | cao_toan_canh | nghieng_nhe)
  chuyenCanh?: string; // mo | truot_len | phong | luot_ngang | truot_xuong | lat_3d (để trống = tự chọn theo mạch bài) // giữ nguyên sân khấu của cảnh trước rồi diễn tiếp (liền mạch như video mẫu)
};

// v92: chuyenMuc ('xac_suat' | 'toan') do chuanbi.py đặt; logo là tệp đúng chuyên mục (logo_toan.png...) hoặc null -> vẽ chữ động.
export type ThuongHieuProps = {ten: string; khauHieu: string; handle: string; markNuoc: boolean; logo: string | null; loiMoi?: string; chuyenMuc?: string};
// Intro thương hiệu chèn trước cảnh hook (chuanbi.py tạo từ phong_cach.json -> "intro"). lech = số khung nội dung bị lùi.
export type IntroProps = {soFrame: number; chuyen: number; lech: number; ten?: string; khauHieu?: string; mauNhan?: string; mauPhu?: string; mauNen?: string; soTuNhan?: number; dungLogo?: boolean; amThanh?: boolean};
export type OutroProps = {tep: string; loai: 'video' | 'anh' | 'tu_tao'; soFrame: number; batDau: number};

export type NenProps = {tep: string; loai: 'video' | 'anh'; soFrame: number};

// Tham số phong cách (đọc từ phong_cach.json): đổi giao diện mà không cần sửa mã.
export type PhongCach = {
  doMoNen: number; // 0-1: độ tối phủ lên nền của bạn để chữ dễ đọc
  kyHieuTroi: boolean; // ký hiệu xác suất trôi lên trên nền
  quangSang: boolean; // quầng sáng màu khi dùng nền gradient mặc định
  kieuNen: string; // 'neon' = nền xanh đen có lưới mờ và đốm sáng trôi như video mẫu (mặc định); 'luoi' = lưới phối cảnh như video mẫu (mặc định); 'luoi_phang' = lưới phẳng; 'gradient' = nền chuyển màu
  kieuToan: string; // 'latex' = công thức phông LaTeX có chân như Manim (mặc định); 'dong_nhat' = công thức cùng phông không chân với chữ
  kieuHinh: string; // 'manim' = hình nét phẳng như video mẫu (mặc định); 'that' = vật 3D (xúc xắc, xu, bài)
  thanhTienDo: boolean;
  loiMoiGiuaVideo?: boolean; // thẻ "Theo dõi" trượt vào giữa video (mặc định tắt vì đè lên chữ mô tả của TikTok)
  khungSanKhau?: boolean; // khung kính mờ + góc neon quanh sân khấu
  butChi?: boolean; // bút chì chạy theo khi viết công thức (kiểu xep)
  thanhBuoc?: boolean; // thanh các bước bài giải ở đầu cảnh (thay nhãn cam)
  tieuDeInHoa?: boolean; // tiêu đề cảnh viết IN HOA như video mẫu
  lopQuet?: boolean | 'luon'; // lớp quét chuyển cảnh: mặc định chỉ ở cái bẫy/đáp án; 'luon' = mọi chỗ nối; false = tắt
  kieuPhuDe?: string; // 'hop' (ô màu sau từ đang đọc, mặc định) | 'mau'
  mauPhuDe?: string; // màu ô phụ đề
  soNenToiDa?: number; // số nền tối đa dùng trong một video (đổi theo nhóm cảnh)
  lopNeonTrenNen?: boolean; // phủ lưới mờ + đốm sáng neon lên nền của bạn cho đồng bộ phong cách
  phuDe: boolean;
  chuyenDong?: string; // 'moi' = bộ hiệu ứng mới (chữ 3 tầng, máy quay sống, vòng sóng, dấu BẪY, lóe sáng đáp án) | 'cu'
  mau: Record<string, string>; // ghi đè bảng màu (vang, lam, hong, xanh, nen1, nen2)
};

export type HinhPhangDongGiai = {
  tieu_de: string;
  dong: {tex: string; can_cu?: string; t: number}[];
  ket_qua_chip?: string;
};

export type HinhPhangProps = {
  loai_yeu_cau?: 'tinh' | 'chung_minh';
  tom_tat_gia_thiet?: string[];
  yeu_cau_ngan?: string;
  dong_giai?: HinhPhangDongGiai[];
  ket_qua_chip?: {id: string; tex: string; t: number}[];
  moc_cong_bo?: number;
  video?: string;
  moc?: Record<string, unknown>;
  header?: Record<string, string>;
  capLop?: string;
  boCuc?: Record<string, unknown>;
};

export type PhongCanh = {
  troi: string; dat: string; vat: {ten: string; hinh: 'hop'|'tru'|'cau'|'non'; mau: string;
    tam: [number,number,number]; co: [number,number,number]}[];
};

export type Props = {
  mon?: string;
  kieu_video?: string;
  // v90: bố cục 4 tầng + sân khấu 3D Vector (chuanbi.py sẽ sinh ở giai đoạn sau); không có = đường dựng cũ
  boCuc?: string;
  khung4tang?: import('./khung4tang/kieu').Khung4TangVao;
  hinhPhang?: HinhPhangProps;
  phongCanh?: PhongCanh;
  id: string;
  tieuDe: string;
  hook: string;
  ketQuaHinhPhang?: {nhan: string; tex: string};
  dapAn: string;
  lop: string;
  fps: number;
  tongFrame: number;
  hookChu: string; // dòng chữ hook lớn ở 5 giây đầu
  hookKieu: string;
  nhanManh: string[]; // từ khóa trong hook được nhấn mạnh
  nhac: string | null;
  amLuongNhac: number; // âm lượng nhạc nền khi không có giọng đọc (khi có giọng tự giảm còn ~40%)
  // v95: mức nhạc đo theo độ to thật (chuanbi.py muc_tron_nhac): duoi = lúc có giọng (~-16 dB dưới giọng), nghi = quãng nghỉ, dauCuoi = 3 s đầu / 2 s cuối
  nhacTron?: {duoi: number; nghi: number; dauCuoi: number} | null;
  baiHoc?: string[]; // 2-3 bài học rút ra (hiện ở màn kết)
  bia?: {loai: string; tieuDe: string; khung: number} | null;
  kiemDuyet?: boolean; // chế độ kiểm duyệt bố cục (máy dựng chụp khung mẫu, đo chữ tràn/đè/TeX thô)
  // BÀI HÌNH HỌC DỰNG BẰNG MANIM: Remotion chỉ dựng phần "vỏ" chung (nền, tiêu đề, thanh bước, phụ đề, nhạc, hiệu ứng âm thanh);
  // hình + công thức do Manim dựng (scripts/manim_hinh.py) rồi ghép đè lên. suKienManim: lúc Manim hiện dòng / đóng khung (tiếng "tách", "ting").
  manimLop?: boolean;
  suKienManim?: {f: number; kieu: string}[];
  anhManimBia?: string | null; // public/manim/bia.png: hình Manim cho ô hình của ảnh bìa
  intro?: IntroProps | null; // intro thương hiệu (tùy chọn): phần nội dung lùi intro.lech khung
  anhBiaDau?: string | null; // ảnh bìa đặt ở khung hình đầu tiên (1/30 giây) để TikTok lấy làm ảnh bìa; cả video lùi 1 khung // ảnh bìa: loại câu hỏi, tiêu đề ngắn, khung hình lấy hình minh họa
  series?: {ten: string; tap: number} | null; // series video (hiện "TẬP n" trên thanh đầu)
  quangCao?: {ten: string; gia?: string; anh?: string; cta?: string} | null; // video có sản phẩm do kênh bán: nhãn minh bạch + thẻ sản phẩm cuối video
  deGoc?: string;
  deBai?: {cho: string[]; tim: string} | null; // thẻ ĐỀ BÀI (đề cho gì, cần tìm gì) ở cảnh de_bai
  duKien?: string[]; // 2-4 dữ kiện then chốt của đề (thẻ nhỏ trên đầu màn hình suốt phần giải)
  tiepTheo?: string; // câu hẹn video sau (màn kết)
  chuDe: string; // chủ đề ngắn hiện ở góc trên (ví dụ "Hai bi cùng màu")
  nen: NenProps | null;
  nenTuTao?: {kieu: string; hue: number; hat: number} | null; // nền tự tạo riêng cho video này
  dsNen?: NenProps[]; // nhiều nền của bạn: đổi nền theo nhóm cảnh
  thuongHieu: ThuongHieuProps;
  outro: OutroProps | null;
  phongCach: PhongCach;
  canh: CanhProps[];
};
