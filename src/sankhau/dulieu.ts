// "Sân khấu": cách kịch bản mô tả một cảnh sinh động bằng VẬT THẬT (người, thẻ, xúc xắc, vòng quay, hộp quà, đồng hồ đo xác suất...)
// và HÀNH ĐỘNG theo từng bước lời giảng (xuất hiện, chọn, loại bỏ, quay, mở, lấy ra, phóng to...).
// Tệp này chỉ kiểm tra/chuẩn hóa dữ liệu (không phụ thuộc React). Quy tắc phải khớp với KiemTraHinh.gs (kiemTraSanKhau_).

const laDT = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const laMang = (v: unknown): v is unknown[] => Array.isArray(v);
const chu = (v: unknown, max = 40): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' && isFinite(v) ? String(v) : '';
const so = (v: unknown, mac: number, thap: number, cao: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return isFinite(n) ? Math.min(cao, Math.max(thap, n)) : mac;
};

export const LOAI_VAT = [
  'nguoi', 'the', 'the_bai', 'xuc_xac', 'dong_xu', 'hop_bi', 'tui', 'hop_qua', 'dong_ho', 'dien_thoai', 'bong_bay',
  'dong_ho_do', 'bieu_do_cot', 'thanh', 'vong_quay', 'cua', 'banh', 'nhan', 'chu', 'so_dem', 'mui_ten', 'bieu_tuong',
  'luoi_o', 'danh_sach',
  // toán thực tế: vật 3D + hình học + đồ thị
  'khoi_hop', 'tru', 'non', 'cau', 'toa_nha', 'xe', 'cay', 'thang', 'hinh_hoc', 'do_thi',
  // hình tự do: vẽ đúng hình của đề bằng các nét (đa giác, đường, tròn, cung, SVG, fractal, đường cong tham số, nhân bản)
  'hinh_tu_do',
] as const;
export type LoaiVat = (typeof LOAI_VAT)[number];

export const KIEU_HANH_DONG = [
  'chon', 'loai_bo', 'sang', 'rung', 'quay', 'mo', 'lay_ra', 'dat_gia_tri', 'bung_ra', 'di_chuyen', 'phong_to', 'thu_nho', 'an', 'doi_chu', 'goc_3d',
, 'bien_hinh', 'tach', 'ghep', 'dem_tang'] as const;
export type KieuHanhDong = (typeof KIEU_HANH_DONG)[number];

export type Nhom = {mau: string; so: number};

export const KIEU_NET = ['da_giac', 'duong', 'mui_ten', 'tron', 'cung', 'chu', 'svg', 'da_giac_deu', 'koch', 'sierpinski', 'tham_so', 'lap', 'xep_chong'] as const;
export type KieuNet = (typeof KIEU_NET)[number];
// Một nét của hình tự do (tọa độ theo khung của vật, gốc trên-trái, y hướng xuống).
export type PhanHinh = {
  kieu: KieuNet;
  diem: [number, number][];
  tam: [number, number];
  r: number;
  tu: number; den: number; // cung: góc bắt đầu/kết thúc (độ, 0 = hướng phải, chiều kim đồng hồ)
  soCanh: number; xoay: number; // đa giác đều / tam giác gốc của fractal
  lap: number; // fractal: số lần lặp tối đa (0-6)
  d: string; // svg: chuỗi đường dẫn
  bieuX: string; bieuY: string; tTu: number; tDen: number; // đường cong tham số
  con: PhanHinh | null; soLan: number; dich: [number, number]; tiLe: number; tamXoay: [number, number]; // nhân bản
  noiDung: string; // chữ
  hang: number[]; // xep_chong: số vật từng tầng từ trên xuống
  mau: string; to: string; doTo: number; net: number; dut: boolean; moNet: number;
  nhan: string; viTriNhan: [number, number] | null; coChu: number;
  buoc: number;
};

export type Vat = {
  id: string;
  loai: LoaiVat;
  buoc: number; // bước xuất hiện (0 = có sẵn từ đầu cảnh, dùng khi nối tiếp cảnh trước)
  x: number; // tâm, % bề rộng sân khấu
  y: number; // tâm, % bề cao sân khấu
  x2: number; // mũi tên: điểm cuối
  y2: number;
  tu: string; // mũi tên: id vật bắt đầu
  den: string; // mũi tên: id vật kết thúc
  co: number; // tỉ lệ kích thước (1 = chuẩn)
  mau: string; // tên màu
  nhan: string; // nhãn dưới vật
  noiDung: string; // chữ chính (thẻ, màn hình, nhãn, chữ...)
  tuKhoa: string; // phần chữ được tô màu nhấn (nhãn)
  soLuong: number;
  giaTri: number; // 0..1 cho đồng hồ đo, thanh, bóng bay; số đích cho so_dem
  giaTriChu: string; // giá trị hiển thị (ví dụ "13/28")
  ketQua: number[]; // mặt xúc xắc, chỉ số ô vòng quay (tính từ 1)...
  ds: string[]; // nhãn từng phần tử (tên người, ô vòng quay, cột biểu đồ, lá bài "A♥", mặt xu "S"/"N"...)
  dsSo: number[]; // số liệu từng cột biểu đồ
  nhom: Nhom[]; // hộp bi / túi: các nhóm bi theo màu
  emoji: string;
  xoay: number; // độ nghiêng (nhãn)
  tuHuong: string; // hướng bay vào: trai | phai | tren | duoi | '' (bật tại chỗ)
  soCot: number; // luoi_o: số cột
  kieu: string; // biến thể hiển thị (so_dem: 'vien' = viên thuốc vàng như huy hiệu)
  // --- toán thực tế ---
  kichThuoc: number[]; // khoi_hop [dài, rộng, cao]; tru/non [bán kính, cao]; cau [bán kính]; toa_nha [rộng, sâu, cao]
  nhanKT: string[]; // nhãn kích thước tương ứng ("3 m", "2 m"...)
  mucNuoc: number; // 0-1: mực nước/chất lỏng trong khoi_hop, tru, non
  diem: Record<string, [number, number]>; // hinh_hoc: điểm có tên -> [x%, y%] trong khung hình học
  canh: [string, string, string][]; // hinh_hoc: [điểm1, điểm2, nhãn độ dài]
  gocDanh: [string, string, string, string][]; // hinh_hoc: [đầu1, đỉnh, đầu2, nhãn góc]
  vuong: [string, string, string][]; // hinh_hoc: ký hiệu góc vuông tại đỉnh giữa
  to: string[][]; // hinh_hoc: các đa giác tô màu (danh sách tên điểm)
  ham: string; // do_thi: biểu thức theo x, ví dụ "3/sin(x)+3/cos(x)"
  xTu: number; xDen: number; yTu: number; yDen: number; // do_thi: khoảng vẽ (yTu = yDen = 0 thì tự tính)
  danhDau: number[]; // do_thi: các giá trị x cần đánh dấu (cực tiểu, nghiệm...)
  nhanTruc: string[]; // do_thi: tên trục ["x", "y"]
  gocNghieng: number; // thang: góc với mặt đất (độ)
  soTang: number; // toa_nha: số tầng
  khung: [number, number]; // hinh_tu_do: khung tọa độ [rộng, cao]
  hinh: PhanHinh[]; // hinh_tu_do: các nét
};

export type HanhDong = {
  buoc: number;
  vat: string;
  kieu: KieuHanhDong;
  chiSo: number[]; // phần tử thứ mấy (tính từ 1) trong nhóm
  mau: string;
  giaTri: number;
  giaTriChu: string;
  x: number;
  y: number;
  muc: number; // mức phóng to
  so: number; // số lượng lấy ra
  noiDung: string;
  nghieng: number; // goc_3d: độ nghiêng sàn (0 = nhìn thẳng, 60 = nhìn chéo xuống như bàn cờ)
  xoay: number; // goc_3d: xoay quanh sân khấu (độ, -60..60)
  dx: number; dy: number; goc: number; tiLe: number; // bien_hinh: dời (đơn vị khung của hình), xoay (độ), phóng (lần) các nét chi_so
};

export type GocNhin = {nghieng: number; xoay: number};
export type DuLieuSanKhau = {vat: Vat[]; hanhDong: HanhDong[]; soBuoc: number; gocDau: GocNhin | null};

const MAU_HOP_LE = ['do', 'xanh_duong', 'xanh_la', 'vang', 'tim', 'cam', 'hong', 'trang', 'xam', 'nau', 'ngoc', 'den'];
const tenMau = (v: unknown): string => (typeof v === 'string' && MAU_HOP_LE.includes(v) ? v : '');
const toiDaSoLuong: Partial<Record<LoaiVat, number>> = {
  nguoi: 12, the: 8, the_bai: 6, xuc_xac: 3, dong_xu: 4, cua: 4, banh: 12, bieu_tuong: 10, luoi_o: 64, cay: 6, xe: 3,
};

function vat(raw: Record<string, unknown>, i: number): Vat | null {
  const loai = LOAI_VAT.find((l) => l === raw.loai);
  if (!loai) return null;
  const ds = laMang(raw.ds) ? raw.ds.slice(0, 12).map((x) => chu(x, raw.loai === 'danh_sach' || raw.loai === 'dien_thoai' ? 52 : 24)) : [];
  const dsSo = laMang(raw.ds_so) ? raw.ds_so.slice(0, 8).map((x) => so(x, 0, 0, 1e6)) : [];
  const ketQua = (laMang(raw.ket_qua) ? raw.ket_qua : raw.ket_qua !== undefined ? [raw.ket_qua] : [])
    .slice(0, 6)
    .map((x) => Math.round(so(x, 1, 1, 12)));
  const nhom: Nhom[] = laMang(raw.nhom)
    ? raw.nhom
        .filter(laDT)
        .slice(0, 4)
        .map((n) => ({mau: tenMau(n.mau) || 'do', so: Math.round(so(n.so, 1, 1, 30))}))
    : [];
  const mac = toiDaSoLuong[loai] || 1;
  const v: Vat = {
    id: chu(raw.id, 24) || `v${i}`,
    loai,
    buoc: Math.round(so(raw.buoc, 1, 0, 8)),
    x: so(raw.x, 50, 0, 100),
    y: so(raw.y, 50, 0, 100),
    x2: so(raw.x2, 70, 0, 100),
    y2: so(raw.y2, 50, 0, 100),
    tu: chu(raw.tu, 24),
    den: chu(raw.den, 24),
    co: so(raw.co, 1, 0.4, 2.5),
    mau: tenMau(raw.mau),
    nhan: chu(raw.nhan, 36),
    noiDung: chu(raw.noi_dung, loai === 'chu' ? 60 : 48),
    tuKhoa: chu(raw.tu_khoa, 30),
    soLuong: Math.round(so(raw.so_luong, loai === 'cua' ? 3 : loai === 'banh' ? 8 : loai === 'luoi_o' ? 36 : ds.length || 1, 1, mac)),
    giaTri: loai === 'do_thi' ? so(raw.gia_tri, NaN, -1e6, 1e6) : so(raw.gia_tri, loai === 'so_dem' ? 10 : 0.5, 0, loai === 'so_dem' ? 1e6 : 1),
    giaTriChu: chu(raw.gia_tri_chu, 20),
    ketQua,
    ds,
    dsSo,
    nhom,
    emoji: chu(raw.emoji, 8),
    xoay: so(raw.xoay, 0, -20, 20),
    tuHuong: typeof raw.tu_huong === 'string' && ['trai', 'phai', 'tren', 'duoi'].includes(raw.tu_huong) ? raw.tu_huong : '',
    soCot: Math.round(so(raw.so_cot, 0, 0, 12)),
    kieu: chu(raw.kieu, 12),
    kichThuoc: laMang(raw.kich_thuoc) ? raw.kich_thuoc.slice(0, 3).map((x) => so(x, 1, 0.01, 1e6)) : [],
    nhanKT: laMang(raw.nhan_kich_thuoc) ? raw.nhan_kich_thuoc.slice(0, 3).map((x) => chu(x, 16)) : [],
    mucNuoc: so(raw.muc_nuoc, 0, 0, 1),
    diem: {},
    canh: [],
    gocDanh: [],
    vuong: [],
    to: [],
    ham: chu(raw.ham, 80),
    xTu: so(raw.x_tu, 0, -1e4, 1e4),
    xDen: so(raw.x_den, 10, -1e4, 1e4),
    yTu: so(raw.y_tu, 0, -1e6, 1e6),
    yDen: so(raw.y_den, 0, -1e6, 1e6),
    danhDau: laMang(raw.danh_dau) ? raw.danh_dau.slice(0, 4).map((x) => so(x, 0, -1e4, 1e4)) : [],
    nhanTruc: laMang(raw.nhan_truc) ? raw.nhan_truc.slice(0, 2).map((x) => chu(x, 12)) : ['x', 'y'],
    gocNghieng: so(raw.goc_nghieng, 55, 5, 85),
    soTang: Math.round(so(raw.so_tang, 6, 1, 30)),
    khung: [100, 100],
    hinh: [],
  };
  if (loai === 'hinh_tu_do') {
    const k = laMang(raw.khung) ? raw.khung : [];
    v.khung = [so(k[0], 100, 10, 2000), so(k[1], 100, 10, 2000)];
    const dem = {diem: 0};
    v.hinh = (laMang(raw.hinh) ? raw.hinh : []).filter(laDT).slice(0, 60).map((h) => netHinh(h, v.khung, dem, 0)).filter((h): h is PhanHinh => !!h);
    if (!v.hinh.length) return null;
    // mức lặp ban đầu của fractal = gia_tri nếu có, không thì lặp đủ (dat_gia_tri làm hình "mọc" từng bước)
    const lapMax = Math.max(0, ...v.hinh.map((h) => (h.kieu === 'koch' || h.kieu === 'sierpinski' ? h.lap : h.con && (h.con.kieu === 'koch' || h.con.kieu === 'sierpinski') ? h.con.lap : 0)));
    v.giaTri = so(raw.gia_tri, lapMax, 0, 6);
  }
  if (loai === 'hinh_hoc') {
    if (laDT(raw.diem)) {
      Object.entries(raw.diem).slice(0, 16).forEach(([k, xy]) => {
        if (laMang(xy) && xy.length >= 2) v.diem[chu(k, 6)] = [so(xy[0], 50, -20, 120), so(xy[1], 50, -20, 120)];
      });
    }
    const coDiem = (t: unknown) => typeof t === 'string' && !!v.diem[t];
    if (laMang(raw.canh)) raw.canh.slice(0, 16).forEach((c) => { if (laMang(c) && coDiem(c[0]) && coDiem(c[1])) v.canh.push([c[0] as string, c[1] as string, chu(c[2], 20)]); });
    if (laMang(raw.goc)) raw.goc.slice(0, 6).forEach((c) => { if (laMang(c) && coDiem(c[0]) && coDiem(c[1]) && coDiem(c[2])) v.gocDanh.push([c[0] as string, c[1] as string, c[2] as string, chu(c[3], 12)]); });
    if (laMang(raw.vuong)) raw.vuong.slice(0, 6).forEach((c) => { if (laMang(c) && coDiem(c[0]) && coDiem(c[1]) && coDiem(c[2])) v.vuong.push([c[0] as string, c[1] as string, c[2] as string]); });
    if (laMang(raw.to)) raw.to.slice(0, 4).forEach((c) => { if (laMang(c) && c.length >= 3 && c.every(coDiem)) v.to.push(c as string[]); });
    if (!Object.keys(v.diem).length) return null;
  }
  if (loai === 'do_thi' && (!v.ham || v.xDen <= v.xTu)) return null;
  // khối chứa nước: gia_tri chính là mực nước (dat_gia_tri làm nước dâng/rút)
  if ((loai === 'khoi_hop' || loai === 'tru' || loai === 'non') && raw.gia_tri === undefined) v.giaTri = v.mucNuoc;
  if ((loai === 'nhan' || loai === 'chu') && !v.noiDung) return null;
  if (loai === 'bieu_tuong' && !v.emoji) return null;
  if (loai === 'vong_quay' && v.ds.length < 2) v.ds = ['1', '2', '3', '4', '5', '6'];
  if (loai === 'bieu_do_cot' && !v.dsSo.length) return null;
  if (loai === 'danh_sach' && !v.ds.length) return null;
  if ((loai === 'hop_bi' || loai === 'tui') && !v.nhom.length) v.nhom = [{mau: 'do', so: 3}, {mau: 'xanh_duong', so: 2}];
  return v;
}

const SVG_HOP_LE = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s\-eE+]+$/;
function netHinh(raw: Record<string, unknown>, khung: [number, number], dem: {diem: number}, sau: number): PhanHinh | null {
  const kieu = KIEU_NET.find((k) => k === raw.kieu);
  if (!kieu) return null;
  const lo = -Math.max(khung[0], khung[1]);
  const hi = 2 * Math.max(khung[0], khung[1]);
  const xy = (v: unknown, mac: [number, number]): [number, number] => (laMang(v) && v.length >= 2 ? [so(v[0], mac[0], lo, hi), so(v[1], mac[1], lo, hi)] : mac);
  const giua: [number, number] = [khung[0] / 2, khung[1] / 2];
  const diem = laMang(raw.diem) ? raw.diem.slice(0, 400).filter((p) => laMang(p) && p.length >= 2).map((p) => xy(p, giua)) : [];
  dem.diem += diem.length;
  if (dem.diem > 2000) return null;
  const toRaw = raw.to;
  const h: PhanHinh = {
    kieu,
    diem,
    tam: xy(raw.tam, giua),
    r: so(raw.r, Math.min(khung[0], khung[1]) * 0.35, 0.1, hi),
    tu: so(raw.tu, 0, -720, 720),
    den: so(raw.den, 90, -720, 720),
    soCanh: Math.round(so(raw.so_canh, 6, 3, 24)),
    xoay: so(raw.xoay, 0, -360, 360),
    lap: so(raw.lap, 3, 0, 6),
    d: typeof raw.d === 'string' && raw.d.length <= 4000 && SVG_HOP_LE.test(raw.d) ? raw.d : '',
    bieuX: chu(raw.x, 80),
    bieuY: chu(raw.y, 80),
    tTu: so(raw.t_tu, 0, -1e4, 1e4),
    tDen: so(raw.t_den, 6.2832, -1e4, 1e4),
    con: null,
    soLan: Math.round(so(raw.so_lan, 3, 1, 40)),
    dich: xy(raw.dich, [0, 0]),
    tiLe: so(raw.ti_le, 1, 0.2, 3),
    tamXoay: xy(raw.tam_xoay, giua),
    noiDung: chu(raw.noi_dung, 40),
    mau: tenMau(raw.mau),
    to: toRaw === true ? 'co' : tenMau(toRaw),
    doTo: so(raw.do_to, 0.28, 0.05, 1),
    net: so(raw.net, 4, 1, 14),
    dut: raw.dut === true,
    moNet: so(raw.mo, 1, 0.1, 1),
    nhan: chu(raw.nhan, 24),
    viTriNhan: laMang(raw.vi_tri_nhan) ? xy(raw.vi_tri_nhan, giua) : null,
    coChu: so(raw.co_chu, 1, 0.85, 1.2), // mọi chữ trên hình gần như cùng cỡ (chống chữ lúc to lúc nhỏ)
    hang: (() => {
      if (laMang(raw.hang)) return raw.hang.slice(0, 60).map((x) => Math.round(so(x, 1, 1, 80)));
      const tren = Math.round(so(raw.tren, 0, 0, 80)), duoi = Math.round(so(raw.duoi, 0, 0, 80)), b = Math.max(1, Math.round(so(raw.buoc_tang, 1, 1, 10)));
      if (tren >= 1 && duoi >= tren) { const ds: number[] = []; for (let k = tren; k <= duoi && ds.length < 60; k += b) ds.push(k); return ds; }
      return kieu === 'xep_chong' ? [3, 4, 5, 6] : [];
    })(),
    buoc: Math.round(so(raw.buoc, 0, 0, 8)),
  };
  if (kieu === 'xep_chong' && !h.to) h.to = 'co'; // chồng vật luôn tô kín
  if (kieu === 'lap') {
    if (sau > 0 || !laDT(raw.hinh)) return null;
    h.con = netHinh(raw.hinh, khung, dem, sau + 1);
    if (!h.con || h.con.kieu === 'lap') return null;
  }
  if ((kieu === 'da_giac' && diem.length < 3) || ((kieu === 'duong' || kieu === 'mui_ten') && diem.length < 2)) return null;
  if (kieu === 'svg' && !h.d) return null;
  if (kieu === 'chu' && !h.noiDung) return null;
  if (kieu === 'tham_so' && (!h.bieuX || !h.bieuY || h.tDen <= h.tTu)) return null;
  return h;
}

function hanhDong(raw: Record<string, unknown>): HanhDong | null {
  const kieu = KIEU_HANH_DONG.find((k) => k === raw.kieu);
  if (!kieu) return null;
  const chiSo = (laMang(raw.chi_so) ? raw.chi_so : raw.chi_so !== undefined ? [raw.chi_so] : [])
    .slice(0, 12)
    .map((x) => Math.round(so(x, 1, 1, 30)));
  return {
    buoc: Math.round(so(raw.buoc, 1, 0, 8)),
    vat: chu(raw.vat, 24),
    kieu,
    chiSo,
    mau: tenMau(raw.mau),
    giaTri: so(raw.gia_tri, NaN, -1e6, 1e6),
    giaTriChu: chu(raw.gia_tri_chu, 20),
    x: so(raw.x, 50, 0, 100),
    y: so(raw.y, 50, 0, 100),
    muc: so(raw.muc, 1.6, 1, 3),
    so: Math.round(so(raw.so, 1, 1, 6)),
    noiDung: chu(raw.noi_dung, 48),
    nghieng: so(raw.nghieng, 50, 0, 68),
    xoay: so(raw.xoay, 0, -70, 70),
    dx: so(raw.dx, 0, -400, 400),
    dy: so(raw.dy, 0, -400, 400),
    goc: so(raw.goc, 0, -720, 720),
    tiLe: so(raw.ti_le, 1, 0.1, 5),
  };
}

export function hopLeSanKhau(d: unknown): DuLieuSanKhau | null {
  if (!laDT(d) || !laMang(d.vat)) return null;
  const ds: Vat[] = [];
  const daCo = new Set<string>();
  d.vat.slice(0, 16).forEach((x, i) => {
    if (!laDT(x)) return;
    const v = vat(x, i);
    if (!v || daCo.has(v.id)) return;
    daCo.add(v.id);
    ds.push(v);
  });
  if (!ds.length) return null;
  const hd: HanhDong[] = laMang(d.hanh_dong)
    ? d.hanh_dong
        .filter(laDT)
        .slice(0, 24)
        .map(hanhDong)
        .filter((h): h is HanhDong => h !== null) // có thể nhắm vào vật của cảnh trước (giu_san_khau)
    : [];
  const soBuoc = Math.max(1, ...ds.map((v) => v.buoc), ...hd.map((h) => h.buoc));
  // góc nhìn 3D ban đầu của cảnh: "goc_nhin": {"nghieng": 50, "xoay": -20} hoặc chuỗi "ban" (nhìn chéo như bàn cờ) | "phang"
  let gocDau: GocNhin | null = null;
  const g = d.goc_nhin;
  if (g === 'ban') gocDau = {nghieng: 52, xoay: -18};
  else if (laDT(g)) gocDau = {nghieng: so(g.nghieng, 50, 0, 68), xoay: so(g.xoay, 0, -70, 70)};
  return {vat: ds, hanhDong: hd, soBuoc, gocDau};
}

// Nối tiếp sân khấu của cảnh trước (giu_san_khau): vật và hành động cũ coi như đã xong từ đầu cảnh (bước 0),
// vật cùng id ở cảnh mới thay định nghĩa cũ nhưng vẫn đứng sẵn trên sân khấu (trừ khi cảnh mới đặt bước > 0 và vật chưa có).
export function noiTiepSanKhau(truoc: DuLieuSanKhau | null, nay: DuLieuSanKhau): DuLieuSanKhau {
  if (!truoc) return nay;
  const moi = new Map(nay.vat.map((v) => [v.id, v]));
  const vatCu = truoc.vat.map((v) => (moi.has(v.id) ? {...(moi.get(v.id) as Vat), buoc: 0} : {...v, buoc: 0}));
  const idCu = new Set(truoc.vat.map((v) => v.id));
  const vatMoi = nay.vat.filter((v) => !idCu.has(v.id));
  const hdCu = truoc.hanhDong.filter((h) => !moi.has(h.vat) || h.kieu === 'chon' || h.kieu === 'loai_bo').map((h) => ({...h, buoc: 0}));
  // camera: chỉ giữ lần phóng to cuối của cảnh trước
  const cam = hdCu.filter((h) => h.kieu === 'phong_to' || h.kieu === 'thu_nho').slice(-1);
  const khac = hdCu.filter((h) => h.kieu !== 'phong_to' && h.kieu !== 'thu_nho');
  // góc 3D: giữ góc cuối của cảnh trước làm góc đầu (camera không giật), trừ khi cảnh mới đặt góc riêng
  const goc3dCu = hdCu.filter((h) => h.kieu === 'goc_3d').slice(-1);
  const gocDau = nay.gocDau || (goc3dCu.length ? {nghieng: goc3dCu[0].nghieng, xoay: goc3dCu[0].xoay} : truoc.gocDau);
  return {vat: [...vatCu, ...vatMoi], hanhDong: [...khac.filter((h) => h.kieu !== 'goc_3d'), ...cam, ...nay.hanhDong], soBuoc: nay.soBuoc, gocDau};
}

// Thời lượng tối thiểu (giây) để mọi bước kịp diễn ra.
export const giayToiThieuSanKhau = (d: DuLieuSanKhau): number => {
  const coQuay = d.hanhDong.some((h) => h.kieu === 'quay' && d.vat.some((v) => v.id === h.vat && v.loai === 'vong_quay'));
  return 1.0 + d.soBuoc * 0.9 + (coQuay ? 2.0 : 0.6);
};
