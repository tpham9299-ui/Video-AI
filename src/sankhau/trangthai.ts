import {texSangChu} from '../chu';
import {kichThuocHinhTuDo} from './hinhtudo';
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
  nghiengDi: number; // vật đang di chuyển: nghiêng người theo hướng đi (độ), như có quán tính
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
  tb?: (b: number) => number; // mốc thời gian của từng bước (cho nét có "buoc" riêng của hình tự do)
  bienNet: Map<number, {dx: number; dy: number; goc: number; s: number}>; // bien_hinh: dời/xoay/phóng từng nét (0 = cả hình)
  tach: number; // tach/ghep: 0 = liền, 1 = các nét tách xa nhau (hình "nổ" ra cho thấy cấu tạo)
  demTang: number; // dem_tang: số giây từ lúc bắt đầu đếm (-1 = chưa đếm)
};

export const GIAY_QUAY: Record<string, number> = {
  xuc_xac: 1.3, dong_xu: 1.25, vong_quay: 2.8, dong_ho: 1.7, hop_qua: 0.9, the_bai: 0.6, cua: 0.7, bong_bay: 0.6, ban_tron: 1.6,
};

export function tinhTrangThai(v: Vat, ds: HanhDong[], t: number, tb: (b: number) => number, W: number, H: number): TrangThai {
  const ta = tb(v.buoc);
  const st: TrangThai = {
    t, ta, vao: v.buoc <= 0 ? 1 : tienDo(t, ta, 0.5),
    chon: new Map(), chonCa: 0, mauChon: '', coChon: 0, loai: new Map(), loaiCa: 0, sang: 0, nghiengDi: 0,
    quay: -1, coQuay: false, mo: new Map(), layRa: [], bung: 0,
    giaTri: isFinite(v.giaTri) ? v.giaTri : v.loai === 'do_thi' ? NaN : 0.5, giaTriChu: v.giaTriChu, noiDung: v.noiDung, dx: 0, dy: 0, an: 0, tb,
    bienNet: new Map(), tach: 0, demTang: -1,
  };
  const gtDau = isFinite(v.giaTri) ? v.giaTri : v.loai === 'do_thi' ? v.xTu : 0.5;
  let gtTruoc = v.loai === 'so_dem' ? 0 : gtDau;
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
        st.sang = Math.max(st.sang, Math.sin(q * Math.PI) ** 2);
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
        // ĐI THEO ĐƯỜNG CONG có quán tính: thời gian theo quãng đường, vồng lên một cung mềm, về đích hơi vượt rồi nảy lại,
        // thân vật nghiêng theo hướng đi rồi đứng thẳng khi dừng (không còn trượt thẳng đều như máy)
        const nx = (h.x / 100) * W;
        const ny = (h.y / 100) * H;
        const L = Math.hypot(nx - x, ny - y);
        const dur = Math.max(0.7, Math.min(1.4, 0.6 + L / 900));
        const pr = h.buoc <= 0 ? 1 : tienDo(t, bd, dur);
        const c1 = 1.25, c3 = c1 + 1;
        const q = pr < 1 ? 1 + c3 * Math.pow(pr - 1, 3) + c1 * Math.pow(pr - 1, 2) : 1;   // easeOutBack
        const vong = Math.min(140, L * 0.28) * Math.sin(Math.PI * Math.min(1, pr));
        const ux = L ? (nx - x) / L : 0, uy = L ? (ny - y) / L : 0;
        const x0 = x, y0 = y;
        x = lerp(x0, nx, q) + uy * vong * (ux >= 0 ? -1 : 1) * 0.2;
        y = lerp(y0, ny, q) - Math.abs(ux) * vong;
        st.nghiengDi = pr < 1 ? Math.sin(Math.PI * pr) * ux * 12 : 0;
        break;
      }
      case 'an':
        st.an = easeOut(p);
        break;
      case 'bien_hinh': {
        // dời / xoay / phóng các nét (cắt ghép hình, lật đối xứng, đưa mảnh vào chỗ) - chuyển động êm 0,9 giây
        const q = easeInOut(h.buoc <= 0 ? 1 : tienDo(t, bd, 0.9));
        (h.chiSo.length ? h.chiSo : [0]).forEach((i) => {
          const cu = st.bienNet.get(i) || {dx: 0, dy: 0, goc: 0, s: 1};
          st.bienNet.set(i, {dx: lerp(cu.dx, h.dx, q), dy: lerp(cu.dy, h.dy, q), goc: lerp(cu.goc, h.goc, q), s: lerp(cu.s, h.tiLe, q)});
        });
        break;
      }
      case 'tach':
      case 'ghep': {
        const q = easeInOut(h.buoc <= 0 ? 1 : tienDo(t, bd, 0.8));
        st.tach = lerp(st.tach, h.kieu === 'tach' ? (isFinite(h.giaTri) ? kep(h.giaTri, 0.2, 2) : 1) : 0, q);
        break;
      }
      case 'dem_tang':
        st.demTang = t - bd;
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
// BỐ CỤC THẺ DANH SÁCH (dùng chung cho vẽ + tự xếp chống chồng lấn): cỡ chữ đủ to, dòng dài tự xuống dòng (tối đa 3 dòng)
export function boCucDanhSach(v: Vat, k0 = 1) {
  // sân khấu chật (bộ tự xếp hạ v.co xuống < 1): thẻ thu nhẹ theo, tối đa còn 78% (chữ vẫn to, đọc rõ)
  const cs = Math.min(1, Math.max(0.78, v.co));
  const k = k0 * cs;
  const W = Math.min(920, 880 * Math.max(0.78, Math.min(1.05, v.co)));
  const pad = 30 * cs;
  const huy = 56 * k; // huy hiệu số thứ tự
  // bề rộng THẬT của cột chữ: đệm hàng 14·2 + 2 khoảng gap 18 + cột dấu tích 44 (trước đây trừ thiếu -> chữ tràn, bị cắt mép)
  const rongChu = W - pad * 2 - huy - 28 - 36 - 44;
  const dai = (s: string) => texSangChu(s).length;
  const daiNhat = Math.max(1, ...v.ds.map(dai));
  let co = 46 * k;
  const soDong = (fs: number, s: string) => Math.max(1, Math.ceil((dai(s) * 0.55 * fs) / rongChu));
  while (co > 34 * k && v.ds.some((s) => soDong(co, s) > 2)) co -= 2;
  // dòng chỉ dư chút xíu: thu chữ nhẹ (≤ 18%) cho nằm gọn MỘT dòng thay vì ngắt giữa chừng
  const coMotDong = rongChu / (0.55 * daiNhat);
  if (v.ds.some((s) => soDong(co, s) > 1) && coMotDong >= Math.max(co * 0.82, 40 * k)) co = Math.floor(coMotDong);
  if (daiNhat * 0.55 * co <= rongChu * 0.55 && v.ds.length <= 3) co = Math.min(52 * k, co * 1.1);
  const dong = v.ds.map((s) => Math.min(3, soDong(co, s)));
  const coTieuDe = 40 * k;
  const h = pad * 2 + (v.noiDung ? coTieuDe * 1.5 + 8 : 0) + dong.reduce((a, n) => a + n * co * 1.22 + 24 + 8, 0);
  return {W, pad, huy, co, coTieuDe, dong, h, rongChu};
}

// THẺ (the): thẻ có chữ tự RỘNG RA theo nội dung (không thu chữ nhỏ xíu trong thẻ hẹp); dài quá thì xuống tối đa 2 dòng
export const cotThe = (n: number) => (n > 6 ? Math.ceil(n / 2) : n);
// BÀN TRÒN: mỗi người một ô o; vòng ghế vừa đủ chứa n người (không chồng nhau); mặt bàn ở trong vòng ghế
export function kichBanTron(n: number, co: number) {
  const o = (n <= 8 ? 120 : 104) * Math.max(0.6, co);
  const Rg = Math.max((n * o * 1.1) / (2 * Math.PI), 150 * Math.max(0.6, co));
  return {o, Rg, Rb: Math.max(70, Rg - o * 0.66)};
}
export function kichThe(v: Vat, k = 1) {
  const n = v.soLuong;
  const chuDai = Math.max(0, ...Array.from({length: n}, (_, i) => texSangChu(v.ds[i] || (n === 1 ? v.noiDung : '')).length));
  const co = Math.max(36 * k, Math.min(52 * k, 54 * v.co * k));
  if (!chuDai) return {w: 280 * v.co, h: 190 * v.co, co, dong: 1};
  // nhiều hơn 6 thẻ: xếp 2 hàng (không xòe chồng lên nhau che mất số); mỗi thẻ rộng vừa khoảng cách để không đè thẻ bên cạnh
  const cot = cotThe(n);
  const rongToiDa = n === 1 ? 860 : Math.max(120, 940 / cot - 26);
  const can = chuDai * 0.58 * co + 56;
  const dong = can > rongToiDa ? 2 : 1;
  const coThat = dong === 2 ? Math.max(32 * k, Math.min(co, (rongToiDa * 2 - 80) / (chuDai * 0.58))) : co;
  const w = n === 1 ? Math.max(260 * Math.min(1, v.co), Math.min(rongToiDa, dong === 2 ? rongToiDa : can)) : Math.min(rongToiDa, Math.max(150, dong === 2 ? rongToiDa : can));
  const h = Math.max(150 * Math.min(1, v.co), dong * coThat * 1.2 + 70 + (n === 1 && v.giaTriChu ? 60 : 0));
  return {w, h, co: coThat, dong};
}

export function kichThuocVat(v: Vat, k = 1): {w: number; h: number} {
  const n = v.soLuong;
  const cot = n <= 6 ? n : Math.ceil(n / 2);
  let w = 300;
  let h = 300;
  switch (v.loai) {
    case 'nguoi': { const o = Math.min(190, 900 / cot); w = o * cot; h = Math.ceil(n / cot) * (o * 1.35 + (v.ds && v.ds.length ? 44 : 0)) + (v.nhan ? 56 : 0); break; }
    case 'the': { const b = kichThe(v, k); const c = cotThe(n); w = n === 1 ? b.w : (b.w + 26) * c; h = Math.ceil(n / c) * (b.h + 26) + (v.nhan ? 70 : 10); break; }
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
    case 'nhan': {
      // khớp NhanSan/NhanNeon: cỡ 46*k (dài > 18 ký tự thì 0,86 lần và xuống dòng trong 760px)
      const dai = Math.max(4, texSangChu(v.noiDung).length);
      const co = Math.max(34, 46 * Math.max(0.85, Math.min(1.2, v.co)) * (dai > 18 ? 0.86 : 1)) * k;
      const rong = dai * 0.64 * co + co * 0.9 + 8;
      const dong = dai > 18 ? Math.ceil(rong / 760) : 1;
      w = Math.min(dai > 18 ? 800 : 940, rong); h = dong * co * 1.18 + co * 0.36 + 10; break;
    }
    case 'chu': { const co = 52 * Math.max(0.85, Math.min(1.2, v.co)) * k; const dai = Math.max(3, texSangChu(v.noiDung).length); w = Math.min(900, dai * 0.56 * co); h = co * 1.5 * Math.ceil((dai * 0.56 * co) / 900); break; }
    case 'so_dem': w = v.kieu === 'vien' ? 380 : 320; h = v.kieu === 'vien' ? 120 : 260; break;
    case 'bieu_tuong': w = n * 154; h = 200; break;
    case 'luoi_o': { const c = v.soCot || Math.min(12, Math.ceil(Math.sqrt(n * 1.6))); const r = Math.ceil(n / c); const o = Math.min(860 / c, 560 / r); w = o * c; h = o * r + (v.nhan ? 50 : 0); break; }
    case 'danh_sach': { const b = boCucDanhSach(v, k); w = b.W; h = b.h; break; }
    case 'ban_tron': { const b = kichBanTron(Math.max(3, Math.min(16, n || v.ds.length || 6)), v.co); w = h = (b.Rg + b.o) * 2 + 30 + (v.nhan ? 60 : 0); break; }
    case 'anh_that': w = 440; h = 440 + (v.nhan ? 64 : 0); break;
    case 'mui_ten': w = 0; h = 0; break;
    case 'khoi_hop': { const k = v.kichThuoc.length ? v.kichThuoc : [3, 2, 1.5]; const m = Math.max(...k); w = (330 * (k[0] / m) + 330 * ((k[1] || k[0]) / m) * 0.9 + 80); h = 330 * ((k[2] || k[0]) / m) + 200; break; }
    case 'tru': case 'non': w = 420; h = 420; break;
    case 'cau': w = 340; h = 340; break;
    case 'toa_nha': w = 300; h = Math.min(560, v.soTang * 44) + 140; break;
    case 'xe': w = n * 360; h = 230; break;
    case 'cay': w = n * 180; h = 250; break;
    case 'thang': { const g = (v.gocNghieng * Math.PI) / 180; w = 460 * Math.cos(g) + 60; h = 460 * Math.sin(g) + 60; break; }
    case 'hinh_hoc': w = 880; h = 600; break;
    case 'bang_bien_thien': w = 900; h = 394 + (v.noiDung ? 70 : 0); break;
    case 'do_thi': w = 860; h = 560 + (v.noiDung ? 150 : 0); break;   // chừa chỗ tiêu đề phía trên (tâm vật giữ nguyên nên cộng cả hai phía)
    case 'hinh_tu_do': ({w, h} = kichThuocHinhTuDo(v)); break;
    default: break;
  }
  // NHÃN DƯỚI VẬT (Nhan: chữ 42*k): cộng vào kích thước để tự xếp không cho nhãn đè lên vật bên dưới / bên cạnh
  const NHAN_DUOI = ['hop_bi', 'tui', 'hop_qua', 'dong_ho', 'bieu_do_cot', 'vong_quay', 'cua', 'banh', 'bieu_tuong', 'xuc_xac', 'dong_xu', 'the_bai', 'so_dem', 'bong_bay'];
  const chuNhan = texSangChu(v.loai === 'banh' || v.loai === 'luoi_o' ? `${v.nhan} ${v.giaTriChu}`.trim() : v.nhan);
  if (chuNhan && (NHAN_DUOI.includes(v.loai) || v.loai === 'luoi_o')) {
    const coN = 42 * k;
    const rongN = Math.min(860, chuNhan.length * 0.6 * coN + 50);
    h += (v.loai === 'luoi_o' ? 30 : 70) * k * (rongN >= 860 ? 2 : 1);
    w = Math.max(w, rongN / Math.max(0.4, v.co));
  }
  return {w: w * v.co, h: h * v.co};
}

// TỰ XẾP: đẩy các vật đang chồng lên nhau ra xa (theo trục chồng ít hơn), giữ trong khung; nếu tổng thể vẫn quá khung
// thì thu nhỏ đều. Giữ nguyên ý đồ bố cục của kịch bản khi không có chồng lấn.
// doThat: KÍCH THƯỚC ĐO THẬT trên trang (SanKhau đo sau lần vẽ đầu) -> xếp theo số đo thật thay cho ước lượng (không còn vật đè vật
// vì ước lượng sai). Kích thước tỉ lệ theo co: số đo lúc co = m.co -> quy về co của vật.
export type DoThat = Map<string, {w: number; h: number; co: number}>;
export function tuXepSanKhau(dsVat: Vat[], W: number, H: number, k = 1, doThat?: DoThat | null, coKhay?: Set<string>): Vat[] {
  const xs = dsVat.filter((v) => v.loai !== 'mui_ten');
  // kích thước vẽ thật thường lớn hơn ước lượng (viền sáng, bóng, nhãn dưới chân) -> cộng khoảng an toàn
  const AN_TOAN: Record<string, [number, number]> = {danh_sach: [1.06, 1.22], nguoi: [1.08, 1.2], the: [1.06, 1.14]};
  // THẺ CHỮ giữ nguyên cỡ (chữ phải đọc được); chỉ VẬT HÌNH (người, đồ vật...) được thu nhỏ khi sân khấu chật
  const CO_DINH = new Set(['nhan', 'chu']);
  // khi PHÓNG TO (f > 1): chỉ vật hình được to lên; số đếm, thẻ, danh sách, biểu đồ giữ cỡ (chữ số đã đủ to, phóng thêm dễ lấn vật bên cạnh)
  const KHONG_PHONG = new Set(['hop_bi', 'tui', 'so_dem', 'the', 'danh_sach', 'bieu_do_cot', 'luoi_o', 'dong_ho_do', 'thanh']);
  const heSo = (loai: string, f: number) => (CO_DINH.has(loai) ? 1 : f > 1 && KHONG_PHONG.has(loai) ? 1 : loai === 'danh_sach' ? Math.max(0.8, f) : f);
  const goc = xs.map((v) => {
    if (v.loai === 'hop_bi' || v.loai === 'tui') {
      // Khay bi xuất hiện sau khi lấy. Giữ chỗ từ đầu, kể cả lúc DOM chưa có khay.
      const kt = kichThuocVat(v, k);
      const giuKhay = !coKhay || coKhay.has(v.id);
      return {v, w: Math.max(giuKhay ? 840 * v.co : 380 * v.co, v.nhan ? kt.w : 0),
        h: Math.max(giuKhay ? 450 * v.co : 300 * v.co, kt.h), coDinh: false};
    }
    const m = doThat && doThat.get(v.id);
    if (m && m.w > 4 && m.h > 4) { const r = v.co / (m.co || 1); return {v, w: m.w * r * 1.03, h: m.h * r * 1.03, coDinh: CO_DINH.has(v.loai)}; }
    const kt = kichThuocVat(v, k); const [aw, ah] = AN_TOAN[v.loai] || [1.04, 1.08];
    return {v, w: kt.w * aw, h: kt.h * ah, coDinh: CO_DINH.has(v.loai)};
  });
  const PAD = 26;
  const LE_X = 40, LE_Y = 18;
  const tach = (f: number) => {
    const hop = goc.map((g) => ({v: g.v, x: (g.v.x / 100) * W, y: (g.v.y / 100) * H, w: g.w * heSo(g.v.loai, f), h: g.h * heSo(g.v.loai, f)}));
    for (let lan = 0; lan < 60; lan++) {
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
          // KHÔNG ép vào khung ở đây (ép sau mỗi lần tách làm vật bị đẩy chồng lại mãi) - tách xong mới đưa cả cụm vào khung
        }
      }
      if (!dich) break;
    }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    hop.forEach((b) => { x0 = Math.min(x0, b.x - b.w / 2); x1 = Math.max(x1, b.x + b.w / 2); y0 = Math.min(y0, b.y - b.h / 2); y1 = Math.max(y1, b.y + b.h / 2); });
    // chừa LỀ quanh sân khấu (mép sân khấu thường trùng mép màn hình): vật không bao giờ dính sát / bị cắt ở mép
    return {hop, x0, y0, x1, y1, tiLe: Math.min((W - 2 * LE_X) / Math.max(1, x1 - x0), (H - 2 * LE_Y) / Math.max(1, y1 - y0))};
  };
  // thu nhỏ dần CHỈ các vật hình cho tới khi cả cụm (đã tách rời, không đè nhau) vừa khung
  let f = 1;
  let kq = tach(f);
  for (let lan = 0; lan < 6 && kq.tiLe < 0.999 && f > 0.6; lan++) {
    f = Math.max(0.6, f * kq.tiLe * 0.97);   // vật hình nhỏ hơn 60% thì khó nhìn: phần còn lại thu đều cả cụm (kể cả thẻ chữ)
    kq = tach(f);
  }
  // HÌNH QUÁ NHỎ so với sân khấu (cụm vật chiếm chưa tới ~65% khung): PHÓNG TO các vật hình (chữ giữ cỡ) cho tới khi gần kín khung,
  // tối đa 1,45 lần; phóng xong vẫn phải tách rời, không đè nhau và vừa khung (không thì giữ cỡ cũ).
  if (f === 1 && kq.tiLe > 1.12 && goc.some((g) => !g.coDinh && !KHONG_PHONG.has(g.v.loai))) {
    // cho phép phóng hình tới 1,6 lần; nếu cụm hơi tràn thì cả cụm thu lại đều tối đa 7% (chữ vẫn đủ to)
    for (let g = Math.min(1.6, kq.tiLe * 1.15); g > 1.05; g -= 0.08) {
      const kq2 = tach(g);
      if (kq2.tiLe >= 0.93) { f = g; kq = kq2; break; }
    }
  }
  const {hop, x0, y0, x1, y1} = kq;
  // vẫn tràn (thẻ chữ quá to): thu đều cả cụm quanh tâm; vừa rồi thì chỉ dời cả cụm vào trong khung
  const s = Math.min(1, kq.tiLe);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const thuNho = s < 0.999;
  const dx = thuNho ? 0 : x0 < LE_X ? LE_X - x0 : x1 > W - LE_X ? W - LE_X - x1 : 0;
  const dy = thuNho ? 0 : y0 < LE_Y ? LE_Y - y0 : y1 > H - LE_Y ? H - LE_Y - y1 : 0;
  const moi = new Map(hop.map((b, i) => [b.v.id, {
    x: ((thuNho ? W / 2 + (b.x - cx) * s : b.x + dx) / W) * 100,
    y: ((thuNho ? H / 2 + (b.y - cy) * s : b.y + dy) / H) * 100,
    co: b.v.co * heSo(goc[i].v.loai, f) * s,
  }]));
  return dsVat.map((v) => {
    const m = moi.get(v.id);
    if (!m) return v;
    // chỉ ghi đè khi có dời đáng kể hoặc phải thu nhỏ
    if (Math.abs(m.co - v.co) < 0.005 && Math.abs(m.x - v.x) < 0.5 && Math.abs(m.y - v.y) < 0.5) return v;
    return {...v, x: m.x, y: m.y, co: m.co};
  });
}
