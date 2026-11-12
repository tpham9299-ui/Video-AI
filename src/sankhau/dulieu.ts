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
] as const;
export type LoaiVat = (typeof LOAI_VAT)[number];

export const KIEU_HANH_DONG = [
  'chon', 'loai_bo', 'sang', 'rung', 'quay', 'mo', 'lay_ra', 'dat_gia_tri', 'bung_ra', 'di_chuyen', 'phong_to', 'thu_nho', 'an', 'doi_chu',
] as const;
export type KieuHanhDong = (typeof KIEU_HANH_DONG)[number];

export type Nhom = {mau: string; so: number};

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
};

export type DuLieuSanKhau = {vat: Vat[]; hanhDong: HanhDong[]; soBuoc: number};

const MAU_HOP_LE = ['do', 'xanh_duong', 'xanh_la', 'vang', 'tim', 'cam', 'hong', 'trang', 'xam', 'nau', 'ngoc', 'den'];
const tenMau = (v: unknown): string => (typeof v === 'string' && MAU_HOP_LE.includes(v) ? v : '');
const toiDaSoLuong: Partial<Record<LoaiVat, number>> = {
  nguoi: 12, the: 8, the_bai: 6, xuc_xac: 3, dong_xu: 4, cua: 4, banh: 12, bieu_tuong: 10, luoi_o: 64,
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
    giaTri: so(raw.gia_tri, loai === 'so_dem' ? 10 : 0.5, 0, loai === 'so_dem' ? 1e6 : 1),
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
  };
  if ((loai === 'nhan' || loai === 'chu') && !v.noiDung) return null;
  if (loai === 'bieu_tuong' && !v.emoji) return null;
  if (loai === 'vong_quay' && v.ds.length < 2) v.ds = ['1', '2', '3', '4', '5', '6'];
  if (loai === 'bieu_do_cot' && !v.dsSo.length) return null;
  if (loai === 'danh_sach' && !v.ds.length) return null;
  if ((loai === 'hop_bi' || loai === 'tui') && !v.nhom.length) v.nhom = [{mau: 'do', so: 3}, {mau: 'xanh_duong', so: 2}];
  return v;
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
    giaTri: so(raw.gia_tri, NaN, 0, 1e6),
    giaTriChu: chu(raw.gia_tri_chu, 20),
    x: so(raw.x, 50, 0, 100),
    y: so(raw.y, 50, 0, 100),
    muc: so(raw.muc, 1.6, 1, 3),
    so: Math.round(so(raw.so, 1, 1, 6)),
    noiDung: chu(raw.noi_dung, 48),
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
  return {vat: ds, hanhDong: hd, soBuoc};
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
  return {vat: [...vatCu, ...vatMoi], hanhDong: [...khac, ...cam, ...nay.hanhDong], soBuoc: nay.soBuoc};
}

// Thời lượng tối thiểu (giây) để mọi bước kịp diễn ra.
export const giayToiThieuSanKhau = (d: DuLieuSanKhau): number => {
  const coQuay = d.hanhDong.some((h) => h.kieu === 'quay' && d.vat.some((v) => v.id === h.vat && v.loai === 'vong_quay'));
  return 1.0 + d.soBuoc * 0.9 + (coQuay ? 2.0 : 0.6);
};
