// v96 — Hàm thuần (không React) dùng chung cho sân khấu 2D: pha hiện tại theo thời gian, nhịp chống đứng hình, bố cục từng
// mô-đun (trả hình chữ nhật để test_san_khau_2d.mjs kiểm vùng an toàn TikTok: không phần tử nào vượt ranh phải 12 % / trên 11 % / đáy 18 %).
import {phanTichBieuThuc} from '../sankhau/bieuthuc';
import type {CotPhanPhoiVao, LuoiBayesVao, Pha2D, RutMauVao, SanKhau2DVao, SoDoCayVao} from './kieu';

export const kep = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const em = (x: number) => 1 - Math.pow(1 - kep(x), 3);
export const emVR = (x: number) => (kep(x) < 0.5 ? 4 * kep(x) ** 3 : 1 - Math.pow(-2 * kep(x) + 2, 3) / 2);
export const noi = (a: number, b: number, u: number) => a + (b - a) * u;

export type PhaNay = {i: number; ten: string; dt: number; pha: Pha2D | null; sau: number};
// pha đang chạy tại t (pha cuối có mốc <= t); dt = giây đã trôi trong pha; sau = mốc pha kế (hoặc +∞)
export function phaTai(pha: Pha2D[], t: number): PhaNay {
  let i = -1;
  pha.forEach((p, j) => p.t <= t && (i = j));
  return {i, ten: i >= 0 ? pha[i].ten : '', dt: i >= 0 ? t - pha[i].t : t, pha: i >= 0 ? pha[i] : null, sau: i + 1 < pha.length ? pha[i + 1].t : Infinity};
}
export const daQua = (pha: Pha2D[], ten: string, t: number) => {
  const p = pha.find((x) => x.ten === ten);
  return p ? t - p.t : -Infinity;
};
export const vaoPha = (pha: Pha2D[], ten: string, t: number, d = 0.5) => em(daQua(pha, ten, t) / d);

// CHỐNG ĐỨNG HÌNH (<= 4 s): nhịp nhấn tại mốc `nhip` (chuanbi.py chèn vào mọi khoảng > 4 s giữa hai pha) + thở nhẹ liên tục.
// Trả 0..1: cực đại ngay sau mốc nhịp, tắt trong 0,7 s.
export function nhipNhan(nhip: number[] | undefined, pha: Pha2D[], t: number): number {
  let m = 0;
  for (const x of [...(nhip || []), ...pha.map((p) => p.t)]) {
    const d = t - x;
    if (d >= 0 && d < 0.7) m = Math.max(m, Math.sin((d / 0.7) * Math.PI));
  }
  return m;
}
export const tho = (t: number, chuKy = 2.4) => 0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / chuKy);
// tiến độ trong pha hiện tại (0..1) cho thanh tiến độ mảnh dưới sân khấu
export function tienDo(pha: Pha2D[], t: number, tong?: number) {
  const p = phaTai(pha, t);
  if (p.i < 0) return 0;
  const sau = Number.isFinite(p.sau) ? p.sau : tong ?? pha[p.i].t + 6;
  return kep((t - pha[p.i].t) / Math.max(0.5, sau - pha[p.i].t));
}

export type Hop = {ten: string; x: number; y: number; w: number; h: number};
export const LE = {trai: 24, phai: 24, tren: 22, duoi: 18}; // v98: lề trong ĐỐI XỨNG (T2 đặt 130..950, rộng 820) -> nội dung 154..926, tâm 540
export const CAO_DONG_KQ = 96; // dải kết quả (biểu thức kiểm chứng / P(A)) ở đáy sân khấu

/* ---------------- rút mẫu ---------------- */
export function boCucRutMau(sk: RutMauVao, W: number, H: number) {
  const N = sk.phan_tu.length;
  const bi = sk.vat === 'bi';
  const cot = N <= 6 ? N : N <= 10 ? 5 : N <= 12 ? 6 : N <= 16 ? 8 : N <= 21 ? 7 : 10;
  const hang = Math.ceil(N / cot);
  const yLuoi = LE.tren + 72; // dưới hàng chú giải nhóm
  const yKhay = H - CAO_DONG_KQ - LE.duoi - 150;
  const rongLuoi = W - LE.trai - LE.phai;
  const caoLuoi = yKhay - 26 - yLuoi;
  const cach = 14;
  let w = Math.min(112, (rongLuoi - (cot - 1) * cach) / cot);
  let h = bi ? w : w * 1.28;
  if (hang * h + (hang - 1) * cach > caoLuoi) {
    h = (caoLuoi - (hang - 1) * cach) / hang;
    w = bi ? h : h / 1.28;
  }
  const x0 = LE.trai + (rongLuoi - (cot * w + (cot - 1) * cach)) / 2;
  const y0 = yLuoi + (caoLuoi - (hang * h + (hang - 1) * cach)) / 2;
  const o = Array.from({length: N}, (_, i): Hop => ({ten: `the_${i}`, x: x0 + (i % cot) * (w + cach), y: y0 + Math.floor(i / cot) * (h + cach), w, h}));
  const k = Math.max(1, Math.min(6, sk.k));
  const wk = Math.min(w * 1.12, 120), hk = bi ? wk : wk * 1.28;
  const rongKhay = k * wk + (k - 1) * 18 + 48;
  const khay: Hop = {ten: 'khay', x: LE.trai + (rongLuoi - rongKhay) / 2, y: yKhay, w: rongKhay, h: Math.min(150, hk + 30)};
  const oKhay = Array.from({length: k}, (_, j): Hop => ({ten: `khay_${j}`, x: khay.x + 24 + j * (wk + 18), y: khay.y + (khay.h - hk) / 2, w: wk, h: hk}));
  const chuGiai: Hop = {ten: 'chu_giai', x: LE.trai, y: LE.tren, w: rongLuoi, h: 56};
  const ketQua: Hop = {ten: 'ket_qua', x: LE.trai, y: H - LE.duoi - CAO_DONG_KQ, w: rongLuoi, h: CAO_DONG_KQ};
  return {o, oKhay, khay, chuGiai, ketQua, w, h};
}

/* ---------------- sơ đồ cây (ngang: gốc trái -> lá phải; tích xác suất cuối nhánh) ---------------- */
export function boCucCay(sk: SoDoCayVao, W: number, H: number) {
  const soTang = Math.max(1, ...sk.nut.map((n) => n.tang));
  const la = sk.nut.filter((n) => n.la);
  const yTren = LE.tren + (sk.tang.length ? 44 : 10), yDuoi = H - LE.duoi - CAO_DONG_KQ - 12;
  const rongTich = 150;
  const xGoc = LE.trai + 40;
  const xCuoi = W - LE.phai - rongTich - 70;
  const xTang = (k: number) => (k === 0 ? xGoc : noi(xGoc + 90, xCuoi, soTang === 1 ? 1 : (k - 1) / (soTang - 1)));
  const viTri = new Map<number, {x: number; y: number}>();
  const buocY = (yDuoi - yTren) / Math.max(1, la.length);
  la.forEach((n, j) => viTri.set(n.id, {x: xTang(n.tang), y: yTren + buocY * (j + 0.5)}));
  for (let k = soTang - 1; k >= 1; k--) {
    sk.nut.filter((n) => n.tang === k && !n.la).forEach((n) => {
      const con = sk.nut.filter((c) => c.cha === n.id).map((c) => viTri.get(c.id)!).filter(Boolean);
      viTri.set(n.id, {x: xTang(k), y: con.length ? con.reduce((s, c) => s + c.y, 0) / con.length : (yTren + yDuoi) / 2});
    });
  }
  const goc = {x: xGoc, y: (yTren + yDuoi) / 2};
  const hop: Hop[] = [{ten: 'goc', x: goc.x - 26, y: goc.y - 26, w: 52, h: 52}];
  sk.nut.forEach((n) => {
    const v = viTri.get(n.id)!;
    hop.push({ten: `nut_${n.id}`, x: v.x - 62, y: v.y - 24, w: 124, h: 48});
    if (n.la && n.tich) hop.push({ten: `tich_${n.id}`, x: v.x + 76, y: v.y - 22, w: rongTich, h: 44});
  });
  hop.push({ten: 'ket_qua', x: LE.trai, y: H - LE.duoi - CAO_DONG_KQ, w: W - LE.trai - LE.phai, h: CAO_DONG_KQ});
  return {viTri, goc, xTang, hop, yTren};
}

/* ---------------- lưới Bayes (hình vuông đơn vị) ---------------- */
export const MIN_COT_BAYES = 0.1; // cột A quá hẹp (vd 1 %) -> phóng lên 10 % bề rộng, có nhãn "phóng to"
export function boCucBayes(sk: LuoiBayesVao, W: number, H: number) {
  const S = Math.min(H - LE.tren - LE.duoi - CAO_DONG_KQ - 70, 400);
  const x = LE.trai + 16, y = LE.tren + 46;
  const ua = Math.max(MIN_COT_BAYES, Math.min(1 - MIN_COT_BAYES, sk.pa));
  const vuong: Hop = {ten: 'vuong', x, y, w: S, h: S};
  const bang: Hop = {ten: 'bang_cong_thuc', x: x + S + 34, y, w: W - LE.phai - (x + S + 34), h: S};
  const ketQua: Hop = {ten: 'ket_qua', x: LE.trai, y: H - LE.duoi - CAO_DONG_KQ, w: W - LE.trai - LE.phai, h: CAO_DONG_KQ};
  return {vuong, bang, ketQua, ua, phongTo: ua !== sk.pa, S, hop: [vuong, bang, ketQua]};
}

/* ---------------- cột phân phối ---------------- */
export function boCucCot(sk: CotPhanPhoiVao, W: number, H: number) {
  const n = sk.cot.length;
  const truc = {x: LE.trai + 56, y: LE.tren + 46, w: W - LE.trai - LE.phai - 70, h: H - LE.tren - LE.duoi - CAO_DONG_KQ - 46 - 64};
  const cach = Math.max(8, truc.w * 0.04);
  const w = (truc.w - cach * (n + 1)) / n;
  const max = Math.max(1e-9, ...sk.cot.map((c) => c.gia_tri));
  const cot = sk.cot.map((c, i): Hop => {
    const h = (c.gia_tri / max) * (truc.h - 44);
    return {ten: `cot_${i}`, x: truc.x + cach + i * (w + cach), y: truc.y + truc.h - h, w, h};
  });
  const ketQua: Hop = {ten: 'ket_qua', x: LE.trai, y: H - LE.duoi - CAO_DONG_KQ, w: W - LE.trai - LE.phai, h: CAO_DONG_KQ};
  return {truc, cot, w, ketQua, hop: [...cot.map((c) => ({...c, y: c.y - 40, h: c.h + 40 + 44})), ketQua]};
}

// mọi hình chữ nhật quan trọng của một sân khấu (tọa độ trong T2) — dùng cho test vùng an toàn
export function hopQuanTrong(sk: SanKhau2DVao, W: number, H: number): Hop[] {
  if (sk.loai === 'rut_mau') {
    const b = boCucRutMau(sk, W, H);
    return [...b.o, ...b.oKhay, b.khay, b.chuGiai, b.ketQua];
  }
  if (sk.loai === 'so_do_cay') return boCucCay(sk, W, H).hop;
  if (sk.loai === 'luoi_bayes') return boCucBayes(sk, W, H).hop;
  if (sk.loai === 'cot_phan_phoi') return boCucCot(sk, W, H).hop;
  return [{ten: 'khung', x: LE.trai, y: LE.tren, w: W - LE.trai - LE.phai, h: H - LE.tren - LE.duoi}];
}

/* ---------------- đồ thị một biến (dùng chung cho nhánh 2D thực tế) ---------------- */
export function hamMotBien(ham: string, bien: string) {
  const nguon = bien === 'x' ? ham : ham.replace(new RegExp(`(?<![a-z])${bien}(?![a-z])`, 'gi'), 'x');
  return phanTichBieuThuc(nguon);
}
export type Thang = {X: (u: number) => number; Y: (v: number) => number; yMin: number; yMax: number; mau: [number, number][]};
// lấy mẫu 120 điểm, bỏ điểm không hữu hạn, khung y có lề 8 % (luôn chứa 0 nếu gần)
export function thangDoThi(f: (x: number) => number, a: number, b: number, r: {x: number; y: number; w: number; h: number}, them: number[] = []): Thang | null {
  const mau: [number, number][] = [];
  for (let i = 0; i <= 120; i++) {
    const u = a + ((b - a) * i) / 120;
    const v = f(u);
    if (Number.isFinite(v)) mau.push([u, v]);
  }
  if (mau.length < 60) return null;
  let yMin = Math.min(...mau.map((p) => p[1]), ...them), yMax = Math.max(...mau.map((p) => p[1]), ...them);
  if (yMin > 0 && yMin < (yMax - yMin) * 0.6) yMin = 0;
  if (yMax - yMin < 1e-9) yMax = yMin + 1;
  const le = (yMax - yMin) * 0.08;
  yMin -= le; yMax += le;
  return {X: (u) => r.x + ((u - a) / (b - a)) * r.w, Y: (v) => r.y + r.h - ((v - yMin) / (yMax - yMin)) * r.h, yMin, yMax, mau};
}
export const soVN = (x: number, le = 2) => {
  const s = (Math.round(x * 10 ** le) / 10 ** le).toFixed(le).replace(/\.?0+$/, '');
  return s.replace('.', '{,}');
};
// biến chạy theo pha: 'keo' quét qua lại trong miền, 'toi_uu' trượt về điểm tối ưu và đứng đó (vẫn "thở" ±0,6 % miền)
export function bienTheoPha(pha: Pha2D[], t: number, a: number, b: number, xTot: number | undefined) {
  const nghi = a + (b - a) * 0.3;
  const quet = (d: number) => noi(nghi, a + (b - a) * (0.5 - 0.42 * Math.cos(d * 1.3)), em(d / 0.4));
  const pK = pha.find((p) => p.ten === 'keo'), pT = pha.find((p) => p.ten === 'toi_uu');
  const tho_ = (b - a) * 0.006 * Math.sin(t * 2.6);
  if (pT && t >= pT.t) {
    const x0 = pK && pK.t <= pT.t ? quet(pT.t - pK.t) : nghi;
    return noi(x0, xTot ?? (a + b) / 2, emVR((t - pT.t) / 1.1)) + tho_;
  }
  if (pK && t >= pK.t) return quet(t - pK.t);
  return nghi + tho_ * 3;
}

// khóa màu ẩn số (sơ đồ tư duy): mọi chữ ẩn đứng riêng (không thuộc lệnh TeX) tô cùng một màu ở MỌI bước
export function khoaMauAn(tex: string, an = 'x', m = '#FACC15') {
  return tex.replace(new RegExp(`(?<![A-Za-z\\\\])${an}(?![A-Za-z])`, 'g'), `{\\color{${m}}${an}}`);
}

/* ---------------- v98: CHỐNG ĐỨNG HÌNH THẬT (không chỉ "thở") ---------------- */
// Lỗi thực chiến: màn "10 tấm thẻ / x = ?" đứng yên tới hết phần đọc đề (nhịp `nhip` chỉ nhấn nhóm đích, mà nhóm chưa tô -> không gì đổi).
// (1) phần tử hiện dần THEO NHÓM (mỗi hàng / nhóm cách nhau <= 1 s); (2) mỗi mốc nhịp chạy MỘT SÓNG QUÉT nhìn thấy được
// (thẻ nhấc lần lượt / nút suy luận sáng lần lượt) -> giữa hai thay đổi hình học thật không bao giờ quá 4 s.
export const SONG_QUET = 1.3; // giây một sóng quét

// mốc hiện của phần tử i khi hiện theo nhóm cỡ `nhom`, bắt đầu t0, nhóm cách nhau `cach` giây
export const tHienNhom = (i: number, t0: number, nhom: number, cach = 0.8) => t0 + Math.floor(i / Math.max(1, nhom)) * cach + (i % Math.max(1, nhom)) * 0.06;

// tiến độ sóng quét (0..1) của mốc nhịp gần nhất đã qua (null = không có sóng đang chạy)
export function songQuet(nhip: number[] | undefined, t: number): number | null {
  let u: number | null = null;
  for (const x of nhip || []) {
    const d = t - x;
    if (d >= 0 && d < SONG_QUET) u = d / SONG_QUET;
  }
  return u;
}
// độ nhấc của phần tử thứ i/N trong sóng quét (bướu sin chạy từ trái sang phải)
export const nhacSong = (u: number | null, i: number, N: number) => {
  if (u === null) return 0;
  const vt = u * (N + 2) - 1 - i;
  return vt > 0 && vt < 1.6 ? Math.sin((vt / 1.6) * Math.PI) : 0;
};

// lịch sơ đồ tư duy: cảnh mở (đề lớn) tối đa 2,6 s -> dữ kiện hiện lần lượt -> KHUNG chuỗi suy luận (tiêu đề từng bước, mờ) hiện
// ngay ở Bước 1 -> mỗi nút bật công thức đúng mốc bước giải (pha nut_j). Trả các mốc để TuDuyDaiSo và test dùng chung.
export function lichTuDuy(sk: {du_kien: string[]; nut: {dong: string}[]; pha: Pha2D[]}) {
  const tNut1 = sk.pha.find((q) => q.ten === 'nut_1')?.t ?? 4.5;
  const coDe = !!(sk.du_kien[0] || sk.nut[0]?.dong);
  const tHeroRa = coDe ? Math.max(1.6, Math.min(tNut1 - 0.5, 2.6)) : 0;
  const tDK = sk.du_kien.map((_, k) => tHeroRa + 0.3 + k * 0.55);
  const t0Khung = (tDK.length ? tDK[tDK.length - 1] : tHeroRa) + 0.5;
  const tKhung = sk.nut.map((_, j) => t0Khung + j * 0.8);
  const tNut = sk.nut.map((_, j) => sk.pha.find((q) => q.ten === `nut_${j}`)?.t ?? tKhung[j] + 1.2);
  return {tHeroRa, tDK, tKhung, tNut};
}

// mọi mốc "đổi hình thật" của một sân khấu 2D (pha + hiện nhóm + sóng quét) -> test kiểm khoảng hở <= 4 s
export function mocDoiHinh(sk: SanKhau2DVao): number[] {
  const m: number[] = [...sk.pha.map((p) => p.t), ...(sk.nhip || [])];
  if (sk.loai === 'tu_duy_dai_so') {
    const l = lichTuDuy(sk);
    m.push(0.2, l.tHeroRa, ...l.tDK, ...l.tKhung, ...l.tNut);
  } else if (sk.loai === 'rut_mau') {
    const tHien = sk.pha.find((p) => p.ten === 'hien')?.t ?? 0.3;
    const nhom = Math.max(3, Math.ceil(sk.phan_tu.length / 3));
    sk.phan_tu.forEach((_, i) => m.push(tHienNhom(i, tHien, nhom)));
  }
  return [...new Set(m.map((x) => Math.round(x * 100) / 100))].sort((a, b) => a - b);
}
