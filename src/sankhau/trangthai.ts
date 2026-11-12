// Trạng thái của một vật tại thời điểm t (tính từ danh sách hành động), dùng chung giữa bộ máy sân khấu và các hình vẽ.
import {easeInOut, easeOut, kep, lerp, tienDo} from './donghieu';
import {HanhDong, Vat} from './dulieu';

export type TrangThai = {
  t: number;
  ta: number; // lúc xuất hiện (giây)
  vao: number; // 0..1
  chon: Map<number, {p: number; mau: string}>;
  chonCa: number; // chọn cả vật (không ghi chi_so)
  mauChon: string;
  coChon: number; // mức chọn lớn nhất trong nhóm (để làm mờ các phần tử còn lại)
  loai: Map<number, number>;
  loaiCa: number;
  sang: number; // nhịp sáng 0..1
  rung: number; // độ lệch rung (px)
  quay: number; // tiến độ lần quay/mở gần nhất (0..1), -1 nếu chưa quay
  coQuay: boolean; // có hành động quay/mở trong cảnh không
  mo: Map<number, number>; // cửa thứ i mở bao nhiêu
  layRa: {p: number; so: number; mau: string; thu: number}[];
  bung: number;
  giaTri: number;
  giaTriChu: string;
  noiDung: string;
  dx: number;
  dy: number;
  an: number;
};

export const GIAY_QUAY: Record<string, number> = {
  xuc_xac: 1.3, dong_xu: 1.25, vong_quay: 2.8, dong_ho: 1.7, hop_qua: 0.9, the_bai: 0.6, cua: 0.7, bong_bay: 0.6,
};

export function tinhTrangThai(v: Vat, ds: HanhDong[], t: number, tb: (b: number) => number, W: number, H: number): TrangThai {
  const ta = tb(v.buoc);
  const st: TrangThai = {
    t, ta, vao: v.buoc <= 0 ? 1 : tienDo(t, ta, 0.5),
    chon: new Map(), chonCa: 0, mauChon: '', coChon: 0, loai: new Map(), loaiCa: 0, sang: 0, rung: 0,
    quay: -1, coQuay: false, mo: new Map(), layRa: [], bung: 0,
    giaTri: v.giaTri, giaTriChu: v.giaTriChu, noiDung: v.noiDung, dx: 0, dy: 0, an: 0,
  };
  let gtTruoc = v.loai === 'so_dem' ? 0 : v.giaTri;
  let x = (v.x / 100) * W;
  let y = (v.y / 100) * H;
  const x0 = x;
  const y0 = y;
  let thu = 0;
  for (const h of ds) {
    if (h.vat !== v.id) continue;
    const bd = tb(h.buoc);
    const p = h.buoc <= 0 ? 1 : tienDo(t, bd, 0.55);
    if (h.kieu === 'quay' || h.kieu === 'mo') st.coQuay = st.coQuay || h.kieu === 'quay' || v.loai === 'hop_qua';
    if (t < bd && h.buoc > 0) continue;
    switch (h.kieu) {
      case 'chon': {
        const mau = h.mau || 'xanh_la';
        st.mauChon = mau;
        if (h.chiSo.length) h.chiSo.forEach((i) => st.chon.set(i, {p: easeOut(p), mau}));
        else st.chonCa = easeOut(p);
        st.coChon = Math.max(st.coChon, easeOut(p));
        break;
      }
      case 'loai_bo':
        if (h.chiSo.length) h.chiSo.forEach((i) => st.loai.set(i, easeOut(p)));
        else st.loaiCa = easeOut(p);
        break;
      case 'sang': {
        const q = h.buoc <= 0 ? 1 : tienDo(t, bd, 1.4);
        st.sang = Math.max(st.sang, q < 1 ? Math.sin(q * Math.PI * 3) ** 2 : 0.35);
        break;
      }
      case 'rung': {
        const q = h.buoc <= 0 ? 1 : tienDo(t, bd, 0.7);
        st.rung = Math.sin(q * Math.PI * 9) * 16 * (1 - q);
        break;
      }
      case 'quay':
      case 'mo': {
        const dur = GIAY_QUAY[v.loai] || 0.8;
        const q = h.buoc <= 0 ? 1 : tienDo(t, bd, dur);
        if (v.loai === 'cua' || (h.kieu === 'mo' && h.chiSo.length)) {
          const dsCua = h.chiSo.length ? h.chiSo : Array.from({length: v.soLuong}, (_, i) => i + 1);
          dsCua.forEach((i) => st.mo.set(i, easeInOut(q)));
        } else st.quay = q;
        break;
      }
      case 'lay_ra':
        st.layRa.push({p: h.buoc <= 0 ? 1 : tienDo(t, bd, 0.9), so: h.so, mau: h.mau, thu: thu++});
        break;
      case 'dat_gia_tri': {
        const den = isFinite(h.giaTri) ? h.giaTri : gtTruoc;
        const q = easeInOut(h.buoc <= 0 ? 1 : tienDo(t, bd, 1.0));
        st.giaTri = lerp(gtTruoc, den, q);
        gtTruoc = den;
        if (h.giaTriChu && q > 0.5) st.giaTriChu = h.giaTriChu;
        break;
      }
      case 'bung_ra':
        st.bung = easeOut(h.buoc <= 0 ? 1 : tienDo(t, bd, 0.8));
        break;
      case 'di_chuyen': {
        const q = easeInOut(p);
        const nx = (h.x / 100) * W;
        const ny = (h.y / 100) * H;
        x = lerp(x, nx, q);
        y = lerp(y, ny, q);
        break;
      }
      case 'an':
        st.an = easeOut(p);
        break;
      case 'doi_chu':
        if (h.noiDung && p > 0.3) st.noiDung = h.noiDung;
        if (h.giaTriChu && p > 0.3) st.giaTriChu = h.giaTriChu;
        break;
      default:
        break;
    }
  }
  if (v.loai === 'so_dem' && !ds.some((h) => h.vat === v.id && h.kieu === 'dat_gia_tri')) {
    st.giaTri = v.giaTri * easeOut(tienDo(t, ta + 0.1, 1.1));
  }
  st.dx = x - x0;
  st.dy = y - y0;
  st.vao = kep(st.vao);
  return st;
}

// Camera: phóng to vào một vật/điểm rồi thu về, chuyển mượt giữa các trạng thái.
export function tinhCamera(ds: HanhDong[], vat: Vat[], t: number, tb: (b: number) => number, W: number, H: number) {
  let z = 1;
  let cx = W / 2;
  let cy = H / 2;
  for (const h of ds) {
    if (h.kieu !== 'phong_to' && h.kieu !== 'thu_nho') continue;
    const bd = tb(h.buoc);
    if (t < bd && h.buoc > 0) continue;
    const q = easeInOut(h.buoc <= 0 ? 1 : tienDo(t, bd, 0.9));
    let nz = 1;
    let nx = W / 2;
    let ny = H / 2;
    if (h.kieu === 'phong_to') {
      const v = vat.find((a) => a.id === h.vat);
      nz = h.muc;
      nx = v ? (v.x / 100) * W : (h.x / 100) * W;
      ny = v ? (v.y / 100) * H : (h.y / 100) * H;
      // không để khung hình lộ ra ngoài sân khấu
      nx = Math.min(W - W / (2 * nz), Math.max(W / (2 * nz), nx));
      ny = Math.min(H - H / (2 * nz), Math.max(H / (2 * nz), ny));
    }
    z = lerp(z, nz, q);
    cx = lerp(cx, nx, q);
    cy = lerp(cy, ny, q);
  }
  return {z, cx, cy};
}
