// v90 — Kiểm & chuẩn hóa đặc tả `canh_3d_vector` do AI sinh (schema gọn, snake_case).
// Nguyên tắc như bocuc.ts: phần tử sai dạng thì BỎ (kèm ghi lỗi), không bao giờ làm hỏng cả video.
//
// Schema (rút gọn):
// { "phien_ban": 1, "quay_nhe": true,
//   "doi_tuong": [ {"id","loai","mau","nhan","net","mo","che", ...trường riêng từng loại} ],
//   "buoc": [ {"t" | "khi_noi", "camera": [ngang, cao, zoom] | "nghieng" | "tu_tren" | ..., "hien", "an", "nhan_manh",
//              "hanh_dong": [{"loai": "truot_diem"|"tach_vector"|"gap_mat", "vat", "t", "d", "tu", "den", "thanh_phan"}] } ] }
import {Buoc3D, Camera, Canh3DV, DoiTuong, HanhDong, KieuNet, LoaiKhoi, TenMau, ThamChieu, V3} from './kieu';
import {CAMERA_MAC_DINH, GOC_TEN} from './camera';
import {laV3} from './toan3d';
import {dungKhuon} from './khuon';

const LOAI: LoaiKhoi[] = ['diem', 'doan_thang', 'vector', 'da_giac', 'hinh_hop', 'mat_cau', 'hinh_tru', 'hinh_non', 'hinh_chop', 'duong_cong', 'goc', 'nhom_lap'];
const MAU: TenMau[] = ['cyan', 'vang', 'hong', 'ngoc', 'trang', 'xam'];
const BIET_DANH_MAU: Record<string, TenMau> = {xanh: 'cyan', lam: 'cyan', xanh_duong: 'cyan', do: 'hong', tim: 'hong', hong_tim: 'hong', xanh_ngoc: 'ngoc', xanh_la: 'ngoc', luc: 'ngoc', trang: 'trang', xam: 'xam', cam: 'vang'};

type R = Record<string, unknown>;
const laDT = (v: unknown): v is R => typeof v === 'object' && v !== null && !Array.isArray(v);
const so = (v: unknown, md: number, min = -1e6, max = 1e6) => (typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : md);
const chuoi = (v: unknown, max = 48) => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' && isFinite(v) ? String(v) : '');
// tên đỉnh giữ đúng vị trí ("" = đỉnh không đặt tên)
const dsTen = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n).map((x) => chuoi(x, 8)) : []);
const dsChuoi = (v: unknown) => (Array.isArray(v) ? v.map((x) => chuoi(x)).filter(Boolean) : typeof v === 'string' && v ? [chuoi(v)] : []);

export const tenMau = (v: unknown, md: TenMau = 'cyan'): TenMau => {
  const s = chuoi(v).toLowerCase().replace(/\s+/g, '_');
  if ((MAU as string[]).includes(s)) return s as TenMau;
  return BIET_DANH_MAU[s] || md;
};

const thamChieu = (v: unknown): ThamChieu | null => (laV3(v) ? [v[0], v[1], v[2]] : typeof v === 'string' && v.trim() ? v.trim() : null);
const v3 = (v: unknown): V3 | undefined => (laV3(v) ? [v[0], v[1], v[2]] : undefined);

export function docCamera(v: unknown): Camera | null {
  if (Array.isArray(v) && v.length >= 2 && v.every((x) => typeof x === 'number' && isFinite(x))) {
    return [v[0], Math.min(90, Math.max(-60, v[1])), Math.min(3, Math.max(0.4, typeof v[2] === 'number' ? v[2] : 1))];
  }
  if (typeof v === 'string' && GOC_TEN[v.trim()]) {
    const g = GOC_TEN[v.trim()];
    // tên góc chỉ đặt phần được nêu; phần còn lại giữ của bước trước (NaN = giữ, xử lý ở chuanHoa)
    return [g.n ?? NaN, g.c ?? NaN, g.zoom ?? NaN];
  }
  return null;
}

function docDoiTuong(r: R, loi: string[]): DoiTuong | null {
  const id = chuoi(r.id, 32);
  const loai = chuoi(r.loai) as LoaiKhoi;
  if (!id) return loi.push('đối tượng thiếu id'), null;
  if (!LOAI.includes(loai)) return loi.push(`${id}: loại "${loai}" không hỗ trợ`), null;
  const netRaw = chuoi(r.net);
  const net: KieuNet = netRaw === 'lien' || netRaw === 'dut' ? netRaw : 'tu_dong';
  const d: DoiTuong = {
    id, loai, mau: tenMau(r.mau, loai === 'vector' ? 'vang' : 'cyan'), nhan: chuoi(r.nhan, 40), net,
    mo: so(r.mo, loai === 'mat_cau' ? 0.1 : 0.08, 0, 0.9), che: r.che !== false,
  };
  const can = (dk: boolean, ten: string) => (dk ? true : (loi.push(`${id}: thiếu/sai ${ten}`), false));
  switch (loai) {
    case 'diem': {
      d.toaDo = v3(r.toa_do);
      if (laDT(r.tren) && chuoi(r.tren.duong)) d.tren = {duong: chuoi(r.tren.duong), t: so(r.tren.t, 0, 0, 1)};
      if (!can(!!d.toaDo || !!d.tren, 'toa_do/tren')) return null;
      break;
    }
    case 'doan_thang':
    case 'vector': {
      d.tu = thamChieu(r.tu) ?? undefined;
      d.den = thamChieu(r.den) ?? undefined;
      if (!can(!!d.tu && !!d.den, 'tu/den')) return null;
      break;
    }
    case 'da_giac': {
      // v92: prompt cũ dạy "dinh" -> nhận cả hai tên (trước đây vạt bìa bị bỏ âm thầm)
      const nguon = Array.isArray(r.diem) ? r.diem : Array.isArray(r.dinh) ? r.dinh : [];
      const ds = nguon.map(thamChieu).filter((x): x is ThamChieu => !!x);
      if (!can(ds.length >= 3, 'diem (>= 3 điểm)')) return null;
      d.diem = ds.slice(0, 24);
      if (Array.isArray(r.ban_le) && r.ban_le.length === 2) {
        const a = thamChieu(r.ban_le[0]), b = thamChieu(r.ban_le[1]);
        if (a && b) d.banLe = [a, b];
      }
      d.gocGap = so(r.goc_gap, 0, -180, 180);
      if (typeof r.nhan_canh === 'number' && r.nhan_canh >= 0 && r.nhan_canh < ds.length) d.nhanCanh = Math.floor(r.nhan_canh);
      break;
    }
    case 'hinh_hop': {
      d.tam = v3(r.tam) ?? [0, 0, 0];
      d.kichThuoc = v3(r.kich_thuoc);
      if (!can(!!d.kichThuoc && d.kichThuoc.every((x) => x > 0), 'kich_thuoc')) return null;
      d.nap = r.nap !== false;
      d.tenDinh = dsTen(r.ten_dinh, 8);
      break;
    }
    case 'mat_cau': {
      d.tam = v3(r.tam) ?? [0, 0, 0];
      d.banKinh = so(r.ban_kinh, 0);
      if (!can(d.banKinh > 0, 'ban_kinh')) return null;
      const l = Array.isArray(r.luoi) ? r.luoi : [];
      d.luoi = [Math.round(so(l[0], 12, 0, 24)), Math.round(so(l[1], 7, 0, 16))];
      d.tenDinh = dsTen(r.ten_dinh, 1);
      break;
    }
    case 'hinh_tru':
    case 'hinh_non': {
      d.day = thamChieu(r.day) ?? thamChieu(r.tam_day) ?? thamChieu(r.tam) ?? [0, 0, 0];
      d.banKinh = so(r.ban_kinh ?? r.r, 0);
      d.cao = so(r.cao ?? r.h, 0);
      if (!can(d.banKinh > 0 && d.cao !== 0, 'ban_kinh/cao')) return null;
      d.tenDinh = dsTen(r.ten_dinh, 2);
      break;
    }
    case 'hinh_chop': {
      const day = Array.isArray(r.day) && !laV3(r.day) ? r.day.map(thamChieu).filter((x): x is ThamChieu => !!x) : [];
      d.dayDa = day;
      d.dinh = thamChieu(r.dinh) ?? undefined;
      if (!can(day.length >= 3 && !!d.dinh, 'day (>= 3 điểm)/dinh')) return null;
      d.tenDinh = dsTen(r.ten_dinh, day.length + 1);
      break;
    }
    case 'duong_cong': {
      const ds = Array.isArray(r.diem) ? r.diem.map(thamChieu).filter((x): x is ThamChieu => !!x) : [];
      if (ds.length >= 2) d.diem = ds.slice(0, 64);
      if (laDT(r.ham) && Array.isArray(r.ham.t) && r.ham.t.length === 2) {
        d.ham = {x: chuoi(r.ham.x, 80), y: chuoi(r.ham.y, 80), z: chuoi(r.ham.z, 80) || '0', t: [so(r.ham.t[0], 0), so(r.ham.t[1], 1)]};
      }
      if (laDT(r.cung)) {
        const tam = thamChieu(r.cung.tam);
        const bk = so(r.cung.ban_kinh, 0);
        if (tam && bk > 0) d.cung = {tam, banKinh: bk, phap: v3(r.cung.phap) ?? [0, 0, 1], tu: so(r.cung.tu, 0), den: so(r.cung.den, 360)};
      }
      if (!can(!!d.diem || !!d.ham || !!d.cung, 'diem/ham/cung')) return null;
      d.kin = r.kin === true;
      d.muot = r.muot !== false;
      break;
    }
    case 'goc': {
      d.dinhGoc = thamChieu(r.dinh) ?? undefined;
      const c = Array.isArray(r.canh) ? r.canh.map(thamChieu) : [];
      if (!can(!!d.dinhGoc && c.length === 2 && !!c[0] && !!c[1], 'dinh/canh')) return null;
      d.canh = [c[0]!, c[1]!];
      d.vuong = r.vuong === true;
      d.banKinh = so(r.ban_kinh, 0, 0);
      if (!r.mau) d.mau = 'vang';
      break;
    }
    case 'nhom_lap': {
      const vat = chuoi(r.vat);
      d.vat = vat === 'the' || vat === 'khoi' ? vat : 'bi';
      // v92: prompt cũ dạy {ds:[...]} -> số phần tử = độ dài ds, nhãn/màu từng phần tử lấy từ ds
      const dsP = Array.isArray(r.ds) ? r.ds.slice(0, 40) : [];
      d.so = Math.round(so(r.so ?? r.N ?? (dsP.length || undefined), 0, 0, 40));
      if (!can(d.so > 0, 'so')) return null;
      const x = chuoi(r.xep);
      d.xep = x === 'luoi' || x === 'vong' ? x : 'hang';
      d.tam = v3(r.tam) ?? [0, 0, 0];
      d.khoang = so(r.khoang, 1, 0.05, 100);
      d.nhanTung = dsChuoi(r.nhan_tung).slice(0, 40);
      d.mauTung = Array.isArray(r.mau_tung) ? r.mau_tung.map((m) => tenMau(m, d.mau)).slice(0, 40) : [];
      if (dsP.length) {
        if (!d.nhanTung.length) d.nhanTung = dsP.map((x) => (laDT(x) ? chuoi(x.nhan ?? x.so, 6) : chuoi(x, 6)));
        if (!d.mauTung.length) d.mauTung = dsP.map((x) => tenMau(laDT(x) ? x.mau : undefined, d.mau));
        if (!chuoi(r.vat) && dsP.some((x) => laDT(x) && /bi/.test(chuoi(x.loai)))) d.vat = 'bi';
      }
      if (!chuoi(r.xep)) d.xep = d.so > 6 ? 'luoi' : 'hang';
      break;
    }
  }
  return d;
}

function hanhDong(r: R, tBuoc: number, ids: Set<string>, loi: string[]): HanhDong | null {
  const loai = chuoi(r.loai);
  const vat = chuoi(r.vat, 32);
  if (!['truot_diem', 'tach_vector', 'gap_mat', 'dich', 've_dan', 'nang'].includes(loai)) return loi.push(`hành động "${loai}" không hỗ trợ`), null;
  if (!ids.has(vat)) return loi.push(`hành động ${loai}: không có vật "${vat}"`), null;
  const h: HanhDong = {loai: loai as HanhDong['loai'], vat, t: so(r.t, tBuoc, 0), d: so(r.d, loai === 'gap_mat' ? 1.6 : 1.2, 0.1, 30), khiNoi: chuoi(r.khi_noi, 80) || undefined};
  if (loai === 'dich') {
    h.vec = v3(r.vec) ?? [0, 0, 0];
  } else if (loai === 've_dan') {
    h.tu = so(r.tu, 0, 0, 1);
    h.den = so(r.den, 1, 0, 1);
  } else if (loai === 'nang') {
    h.chiSo = Array.isArray(r.chi_so) ? r.chi_so.filter((x): x is number => typeof x === 'number' && isFinite(x)).map((x) => Math.round(x)).slice(0, 40) : [];
    if (r.mau !== undefined) h.mauNang = tenMau(r.mau, 'vang');
    h.cao = so(r.cao, 0.4, 0, 3);
  } else if (loai === 'truot_diem') {
    h.tu = so(r.tu, NaN, 0, 1);
    h.den = so(r.den, 1, 0, 1);
  } else if (loai === 'gap_mat') {
    h.tu = so(r.tu, NaN, -180, 180);
    h.den = so(r.den, 90, -180, 180);
  } else {
    const tp = dsChuoi(r.thanh_phan).filter((x) => x === 'ngang' || x === 'dung') as ('ngang' | 'dung')[];
    h.thanhPhan = tp.length ? tp : ['ngang', 'dung'];
  }
  return h;
}

export type KetQuaDacTa = {canh: Canh3DV | null; loi: string[]};

// v92: mocBuoc/tong = mốc các bước của khung 4 tầng (giây) để trải pha của khuôn tham số; khuon_du_phong = khuôn Auto-fix
// suy từ đề, dùng khi đặc tả tự do không còn đối tượng hợp lệ (KHÔNG BAO GIỜ để tầng sân khấu trống).
export function chuanHoaCanh3DV(raw0: unknown, mocBuoc: number[] = [], tong = 0): KetQuaDacTa {
  const loi: string[] = [];
  let raw = raw0;
  if (laDT(raw) && raw.khuon !== undefined && !Array.isArray(raw.doi_tuong)) {
    const k = dungKhuon(raw, mocBuoc, tong);
    if (k) raw = k;
    else loi.push(`khuôn "${String(raw.khuon)}" không có`);
  }
  if (!laDT(raw) || !Array.isArray(raw.doi_tuong)) {
    const du = laDT(raw0) ? dungKhuon(raw0.khuon_du_phong, mocBuoc, tong) : null;
    if (du) return chuanHoaCanh3DV(du, mocBuoc, tong);
    return {canh: null, loi: [...loi, 'thiếu doi_tuong']};
  }
  const doiTuong: DoiTuong[] = [];
  const ids = new Set<string>();
  for (const x of raw.doi_tuong.slice(0, 80)) {
    if (!laDT(x)) continue;
    const d = docDoiTuong(x, loi);
    if (!d) continue;
    if (ids.has(d.id)) {
      loi.push(`id trùng: ${d.id}`);
      continue;
    }
    ids.add(d.id);
    doiTuong.push(d);
  }
  if (!doiTuong.length) {
    const du = laDT(raw0) ? dungKhuon(raw0.khuon_du_phong, mocBuoc, tong) : null;
    if (du) return {canh: chuanHoaCanh3DV(du, mocBuoc, tong).canh, loi: [...loi, 'không còn đối tượng hợp lệ -> dùng khuôn dự phòng']};
    return {canh: null, loi: [...loi, 'không còn đối tượng hợp lệ']};
  }
  // tên đỉnh cũng là id hợp lệ để hiện/nhấn mạnh và tham chiếu
  const tenHopLe = new Set(ids);
  for (const d of doiTuong) for (const t of d.tenDinh || []) tenHopLe.add(t);
  const loc = (ds: string[], vaiTro: string) =>
    ds.filter((id) => {
      if (tenHopLe.has(id)) return true;
      loi.push(`${vaiTro}: không có "${id}"`);
      return false;
    });
  const buoc: Buoc3D[] = [];
  let cam: Camera = [...CAMERA_MAC_DINH];
  const rawBuoc = Array.isArray(raw.buoc) ? raw.buoc.slice(0, 40) : [];
  rawBuoc.forEach((b, i) => {
    if (!laDT(b)) return;
    const t = so(b.t, i === 0 ? 0 : NaN, 0);
    if (!isFinite(t)) return void loi.push(`bước ${i + 1}: thiếu t (chưa đổi khi_noi thành giây)`);
    let camera = docCamera(b.camera);
    if (camera) {
      camera = [isNaN(camera[0]) ? cam[0] : camera[0], isNaN(camera[1]) ? cam[1] : camera[1], isNaN(camera[2]) ? cam[2] : camera[2]];
      cam = camera;
    }
    const hd = Array.isArray(b.hanh_dong) ? b.hanh_dong.filter(laDT).map((h) => hanhDong(h, t, ids, loi)).filter((h): h is HanhDong => !!h) : [];
    buoc.push({t, camera, hien: loc(dsChuoi(b.hien), 'hien'), an: loc(dsChuoi(b.an), 'an'), nhanManh: loc(dsChuoi(b.nhan_manh), 'nhan_manh'), hanhDong: hd, khiNoi: chuoi(b.khi_noi, 80) || undefined});
  });
  buoc.sort((a, b) => a.t - b.t);
  return {canh: {phienBan: 1, doiTuong, buoc, quayNhe: raw.quay_nhe !== false}, loi};
}
