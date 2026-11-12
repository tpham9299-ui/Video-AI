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

// Góc nhìn 3D của sân khấu tại thời điểm t: bắt đầu từ gocDau (hoặc nhìn thẳng), mỗi hành động goc_3d chuyển mượt
// sang góc mới trong 1,2 giây (nghiêng sàn + xoay quanh trục đứng).
export function tinhGoc3D(gocDau: {nghieng: number; xoay: number} | null, ds: HanhDong[], t: number, tb: (b: number) => number) {
  let nghieng = gocDau ? gocDau.nghieng : 0;
  let xoay = gocDau ? gocDau.xoay : 0;
  for (const h of ds) {
    if (h.kieu !== 'goc_3d') continue;
    const bd = tb(h.buoc);
    if (t < bd && h.buoc > 0) continue;
    const q = easeInOut(h.buoc <= 0 ? 1 : tienDo(t, bd, 1.2));
    nghieng = lerp(nghieng, h.nghieng, q);
    xoay = lerp(xoay, h.xoay, q);
  }
  return {nghieng, xoay};
}

// Ước lượng kích thước (px trên khung 960x760, chưa nhân co) của từng loại vật: dùng để tự xếp chống chồng lấn và nâng vật lên khỏi sàn 3D.
export function kichThuocVat(v: Vat): {w: number; h: number} {
  const n = v.soLuong;
  const cot = n <= 6 ? n : Math.ceil(n / 2);
  let w = 300;
  let h = 300;
  switch (v.loai) {
    case 'nguoi': { const o = Math.min(190, 900 / cot); w = o * cot; h = Math.ceil(n / cot) * o * 1.15 + (v.nhan ? 50 : 0); break; }
    case 'the': w = n === 1 ? 280 : Math.min(280 + 24, 920 / n) * n; h = 190 + (v.nhan ? 60 : 0); break;
    case 'the_bai': w = Math.max(n, v.ds.length || 1) * 192; h = 260; break;
    case 'xuc_xac': w = n * 216; h = 220; break;
    case 'dong_xu': w = n * 220; h = 250; break;
    case 'hop_bi': case 'tui': w = 400 + (v.loai === 'hop_bi' ? 140 : 80); h = 370; break;
    case 'hop_qua': w = 280; h = 320; break;
    case 'dong_ho': w = 320; h = 370; break;
    case 'dien_thoai': w = 360; h = 640; break;
    case 'bong_bay': w = 360; h = 420; break;
    case 'dong_ho_do': w = 480; h = 400; break;
    case 'bieu_do_cot': w = Math.min(900, 220 * Math.max(1, v.dsSo.length)); h = 500; break;
    case 'thanh': w = 760; h = 110; break;
    case 'vong_quay': w = 510; h = 560; break;
    case 'cua': w = n * (Math.min(230, 880 / n - 26) + 26); h = Math.min(230, 880 / n - 26) * 1.5 + 20; break;
    case 'banh': w = 460; h = 480; break;
    case 'nhan': w = Math.min(900, Math.max(4, v.noiDung.length) * 32 + 60); h = 90; break;
    case 'chu': w = Math.min(900, Math.max(3, v.noiDung.length) * 30); h = 80; break;
    case 'so_dem': w = v.kieu === 'vien' ? 380 : 320; h = v.kieu === 'vien' ? 120 : 260; break;
    case 'bieu_tuong': w = n * 154; h = 200; break;
    case 'luoi_o': { const c = v.soCot || Math.min(12, Math.ceil(Math.sqrt(n * 1.6))); const r = Math.ceil(n / c); const o = Math.min(860 / c, 560 / r); w = o * c; h = o * r + (v.nhan ? 50 : 0); break; }
    case 'danh_sach': w = 820; h = 100 + v.ds.length * 72; break;
    case 'mui_ten': w = 0; h = 0; break;
    default: break;
  }
  return {w: w * v.co, h: h * v.co};
}

// TỰ XẾP: đẩy các vật đang chồng lên nhau ra xa (theo trục chồng ít hơn), giữ trong khung; nếu tổng thể vẫn quá khung
// thì thu nhỏ đều. Giữ nguyên ý đồ bố cục của kịch bản khi không có chồng lấn.
export function tuXepSanKhau(dsVat: Vat[], W: number, H: number): Vat[] {
  const xs = dsVat.filter((v) => v.loai !== 'mui_ten');
  const hop = xs.map((v) => ({v, x: (v.x / 100) * W, y: (v.y / 100) * H, ...kichThuocVat(v)}));
  const PAD = 18;
  const kep2 = (b: (typeof hop)[number]) => {
    b.x = Math.min(W - Math.min(b.w, W) / 2, Math.max(Math.min(b.w, W) / 2, b.x));
    b.y = Math.min(H - Math.min(b.h, H) / 2, Math.max(Math.min(b.h, H) / 2, b.y));
  };
  for (let lan = 0; lan < 40; lan++) {
    let dich = false;
    for (let i = 0; i < hop.length; i++) {
      for (let j = i + 1; j < hop.length; j++) {
        const a = hop[i];
        const b = hop[j];
        const ox = (a.w + b.w) / 2 + PAD - Math.abs(a.x - b.x);
        const oy = (a.h + b.h) / 2 + PAD - Math.abs(a.y - b.y);
        if (ox <= 0 || oy <= 0) continue;
        dich = true;
        // nhãn/chữ nhỏ thì chỉ dời nhãn, vật lớn đứng yên
        const nhoA = a.v.loai === 'nhan' || a.v.loai === 'chu';
        const nhoB = b.v.loai === 'nhan' || b.v.loai === 'chu';
        const ka = nhoA && !nhoB ? 1 : nhoB && !nhoA ? 0 : 0.5;
        if (oy < ox) {
          const s = a.y <= b.y ? -1 : 1;
          a.y += s * oy * ka;
          b.y -= s * oy * (1 - ka);
        } else {
          const s = a.x <= b.x ? -1 : 1;
          a.x += s * ox * ka;
          b.x -= s * ox * (1 - ka);
        }
        kep2(a);
        kep2(b);
      }
    }
    if (!dich) break;
  }
  // vẫn tràn khung (quá nhiều vật lớn): thu nhỏ đều quanh tâm
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  hop.forEach((b) => { x0 = Math.min(x0, b.x - b.w / 2); x1 = Math.max(x1, b.x + b.w / 2); y0 = Math.min(y0, b.y - b.h / 2); y1 = Math.max(y1, b.y + b.h / 2); });
  const s = Math.min(1, W / Math.max(1, x1 - x0), H / Math.max(1, y1 - y0));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const thuNho = s < 0.999;
  const moi = new Map(hop.map((b) => [b.v.id, {x: ((thuNho ? W / 2 + (b.x - cx) * s : b.x) / W) * 100, y: ((thuNho ? H / 2 + (b.y - cy) * s : b.y) / H) * 100, co: b.v.co * s}]));
  return dsVat.map((v) => {
    const m = moi.get(v.id);
    if (!m) return v;
    // chỉ ghi đè khi có dời đáng kể hoặc phải thu nhỏ
    if (!thuNho && Math.abs(m.x - v.x) < 0.5 && Math.abs(m.y - v.y) < 0.5) return v;
    return {...v, x: m.x, y: m.y, co: m.co};
  });
}
