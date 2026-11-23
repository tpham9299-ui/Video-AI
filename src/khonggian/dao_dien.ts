// v97 — ĐẠO DIỄN CAMERA SƯ PHẠM: 5 chế độ tính từ toán học + bộ tối ưu né suy biến (quét ±8°) + lịch xoay theo mốc lời.
//  toan_canh          : góc 3/4 chuẩn SGK, tâm nhìn = trọng tâm khối
//  truc_dien_mat(ABC) : nhìn GẦN vuông góc mặt (lệch 20° giữ cảm giác khối), làm mờ ~68 % vật ngoài mặt
//  ep_mep_mat(MNP)    : nhìn song song mặt (edge-on): mặt thành một vệt thẳng; tối ưu chỉ xoay QUANH pháp tuyến (giữ edge-on)
//  nhin_day           : nâng máy chếch cao nhìn xuống đáy
//  can_canh(...)      : zoom vào đối tượng (đỉnh góc / đoạn / giao điểm) mà không cắt hình khỏi sân khấu
// Máy KHÔNG "thở": giữ nguyên góc cũ tới mốc xoay -> xoay êm 0,9-1,2 s -> khóa đứng yên. Chỉ khi giữ một góc > 6 s mới trôi rất
// chậm ±0,6° (chống đứng hình). Mọi thứ là hàm thuần của (props, t).
import {CheDoMay, KhongGianVao, TuThe, V3, XoayVao} from './kieu';
import {chieu, emXoay, gocTuHuong, heMay, huongNhin, noiTuThe} from './may';
import {cham, cheo, chuan, cong, doDai, kep01, nhan, RAD, tru, trungBinh} from '../3d-vector/toan3d';
import {matVo, matVoNhieu, NGUONG_SUOT, doTruoc} from './hlr';
import {khoaId, tachTen} from './canh';

export const GOC_TOAN_CANH = {n: 28, c: 22};
export const GOC_NHIN_DAY_C = 64;
export const LECH_TRUC_DIEN = 20; // độ
export const KC_DINH_MIN = 32; // px: mục tiêu tối ưu giữa hai đỉnh
export const KC_DINH_CANH_MIN = 18; // px: đỉnh tới cạnh không đi qua nó
export const KHUNG_RONG = 0.86, KHUNG_CAO = 0.8; // v97 tối giản: sân khấu tràn viền -> hình chiếm nhiều hơn

export type Moc = {t0: number; t1: number; A: TuThe; B: TuThe; che_do: CheDoMay; doi: string[]; tapMat: Set<string> | null};
export type LichMay = {moc: Moc[]; P0: TuThe; R: number; muc: V3};

const LUOI = [-8, -4, 0, 4, 8];

export type BoiCanh = {kg: KhongGianVao; W: number; H: number; R: number; muc: V3; vo: ReturnType<typeof matVo>};

// điểm cần tách bạch + đoạn để kiểm đè (dùng hình cuối cùng: mọi vật đã hiện tới thời điểm tMax)
export function vatThay(kg: KhongGianVao, tMax: number): {diem: [string, V3][]; doan: [string, string][]; khung: V3[]} {
  const d = kg.dung;
  const hien = kg.hien || {};
  const co = (id: string) => (hien[id] === undefined && hien[khoaId(id)] === undefined) || Math.min(hien[id] ?? Infinity, hien[khoaId(id)] ?? Infinity) <= tMax;
  const diem = d.nhan.filter((x) => d.diem[x] && co(x)).map((x) => [x, d.diem[x]] as [string, V3]);
  const doan = d.doan.filter((x) => co(x.id)).map((x) => [x.a, x.b] as [string, string]);
  const khung: V3[] = Object.values(d.diem).slice();
  for (const k of d.kinh) if (co(k.id)) khung.push(...k.da_giac, ...(k.bung || []));
  return {diem, doan, khung};
}

// khung tự động: tỉ lệ + gốc màn hình đưa toàn bộ điểm khung vào ~80 % x 76 % sân khấu
export function khungTuThe(n: number, c: number, bc: BoiCanh, khung: V3[], tamTheo?: V3[], phong = 1): TuThe {
  const m0: TuThe = {n, c, muc: bc.muc, R: bc.R, k: 1, ox: 0, oy: 0};
  const h = heMay(m0);
  const ps = khung.map((p) => chieu(p, m0, h));
  const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let k = Math.min((bc.W * KHUNG_RONG) / Math.max(1e-6, x1 - x0), (bc.H * KHUNG_CAO) / Math.max(1e-6, y1 - y0));
  let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (tamTheo && tamTheo.length && phong > 1) {
    // cận cảnh: tâm về đối tượng đích, phóng tới `phong` lần nhưng KHÔNG đẩy điểm nào ra khỏi 92 % sân khấu
    const q = tamTheo.map((p) => chieu(p, m0, h));
    const tx = q.reduce((s, p) => s + p.x, 0) / q.length, ty = q.reduce((s, p) => s + p.y, 0) / q.length;
    let kMax = k * phong;
    for (const p of ps) {
      const dx = Math.abs(p.x - tx), dy = Math.abs(p.y - ty);
      if (dx > 1e-6) kMax = Math.min(kMax, (bc.W * 0.46) / dx);
      if (dy > 1e-6) kMax = Math.min(kMax, (bc.H * 0.44) / dy);
    }
    if (kMax > k * 1.05) {
      const w = kep01((kMax / k - 1) / (phong - 1));
      k = kMax;
      cx = cx + (tx - cx) * Math.max(0.6, w);
      cy = cy + (ty - cy) * Math.max(0.6, w);
      // kéo tâm lại nếu làm điểm khác tràn
      const tran = (cxx: number, cyy: number) => ps.some((p) => Math.abs((p.x - cxx) * k) > bc.W * 0.47 || Math.abs((p.y - cyy) * k) > bc.H * 0.45);
      for (let i = 0; i < 10 && tran(cx, cy); i++) {
        cx = cx + ((x0 + x1) / 2 - cx) * 0.25;
        cy = cy + ((y0 + y1) / 2 - cy) * 0.25;
      }
    }
  }
  return {n, c, muc: bc.muc, R: bc.R, k, ox: bc.W / 2 - cx * k, oy: bc.H / 2 - cy * k};
}

// khoảng cách điểm (px) tới đoạn
const kcDiemDoan = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy;
  const u = L > 1e-9 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - ax - u * dx, py - ay - u * dy);
};

// điểm P có thật sự nằm trên đoạn AB trong 3D (thì không tính là "đè cạnh")
const tren3D = (P: V3, A: V3, B: V3) => {
  const L = doDai(tru(B, A));
  return doDai(cheo(tru(B, A), tru(P, A))) / Math.max(1e-9, L) < 1e-5 * (1 + L) && cham(tru(P, A), tru(P, B)) <= 1e-9;
};

export type DanhGia = {kcDinh: number; kcDinhCanh: number; suot: number; capDinh: [string, string] | null; diemDe: [string, string] | null};

// chấm điểm rõ ràng một tư thế: khoảng cách 2D nhỏ nhất giữa các đỉnh, đỉnh–cạnh không đi qua nó, mặt vỏ sượt tia nhìn
export function danhGia(m: TuThe, bc: BoiCanh, diem: [string, V3][], doan: [string, string][], mienPhang: Set<string> | null): DanhGia {
  const h = heMay(m);
  const P = bc.kg.dung.diem;
  const s = diem.map(([t, p]) => ({t, p, q: chieu(p, m, h)}));
  let kcDinh = Infinity, capDinh: [string, string] | null = null;
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
    if (mienPhang && mienPhang.has(s[i].t) && mienPhang.has(s[j].t)) continue;
    const d = Math.hypot(s[i].q.x - s[j].q.x, s[i].q.y - s[j].q.y);
    if (d < kcDinh) { kcDinh = d; capDinh = [s[i].t, s[j].t]; }
  }
  let kcDinhCanh = Infinity, diemDe: [string, string] | null = null;
  for (const x of s) for (const [a, b] of doan) {
    if (a === x.t || b === x.t || !P[a] || !P[b]) continue;
    if (tren3D(x.p, P[a], P[b])) continue;
    if (mienPhang && mienPhang.has(x.t) && mienPhang.has(a) && mienPhang.has(b)) continue;
    const qa = chieu(P[a], m, h), qb = chieu(P[b], m, h);
    const d = kcDiemDoan(x.q.x, x.q.y, qa.x, qa.y, qb.x, qb.y);
    if (d < kcDinhCanh) { kcDinhCanh = d; diemDe = [x.t, a + b]; }
  }
  let suot = 1;
  // v98: mặt xấp xỉ mặt cong (trụ / nón / cầu) LUÔN có mặt sượt ở đường viền -> không tính phạt sượt
  for (const f of bc.vo) if (!f.cong) suot = Math.min(suot, Math.abs(doTruoc(f, h.viTri)));
  return {kcDinh, kcDinhCanh, suot, capDinh, diemDe};
}

const diemPhat = (g: DanhGia, mienSuot: boolean) =>
  Math.max(0, KC_DINH_MIN - g.kcDinh) * 4 + Math.max(0, KC_DINH_CANH_MIN - g.kcDinhCanh) * 3 + (mienSuot ? 0 : Math.max(0, 0.07 - g.suot) * 900);

function phapMat(bc: BoiCanh, ten: string[]): {n: V3; g: V3; laVo: boolean} | null {
  const P = bc.kg.dung.diem;
  const ps = ten.map((t) => P[t]).filter(Boolean) as V3[];
  if (ps.length < 3) return null;
  let n = cheo(tru(ps[1], ps[0]), tru(ps[2], ps[0]));
  if (doDai(n) < 1e-9) return null;
  n = chuan(n);
  const g = trungBinh(ps);
  // mặt vỏ: dùng pháp tuyến NGOÀI (mặt đang xét là mặt trước, nét liền) — mặt trong khối: phía gần máy hiện tại
  const vo = bc.vo.find((f) => ten.every((t) => f.ten.includes(t)) || Math.abs(cham(f.n, tru(g, f.g))) < 1e-6 && Math.abs(Math.abs(cham(f.n, n)) - 1) < 1e-6);
  if (vo) return {n: vo.n, g, laVo: true};
  return {n, g, laVo: false};
}

// tập điểm thuộc mặt phẳng (để làm mờ phần ngoài mặt / miễn phạt thẳng hàng khi ép mép)
export function diemTrongMat(bc: BoiCanh, ten: string[]): Set<string> {
  const P = bc.kg.dung.diem;
  const pm = phapMat(bc, ten);
  const ra = new Set<string>();
  if (!pm) return ra;
  for (const [t, p] of Object.entries(P)) if (Math.abs(cham(pm.n, tru(p, pm.g))) < 1e-5 * bc.R) ra.add(t);
  return ra;
}

function diemDoi(bc: BoiCanh, doi: string[]): V3[] {
  const P = bc.kg.dung.diem;
  const ra: V3[] = [];
  for (const x of doi) {
    const g = bc.kg.dung.goc.find((y) => y.id === x);
    if (g) { ra.push(P[g.dinh]); continue; }
    for (const t of tachTen(x)) if (P[t]) ra.push(P[t]);
  }
  return ra;
}

// Tư thế lý tưởng + tối ưu cho một cú xoay (truoc: tư thế đang giữ trước cú xoay)
export function tinhTuThe(bc: BoiCanh, che: CheDoMay, doi: string[], truoc: TuThe | null, tMax: number): TuThe {
  const vt = vatThay(bc.kg, tMax);
  const veTruoc = truoc ? huongNhin(truoc.n, truoc.c) : huongNhin(GOC_TOAN_CANH.n, GOC_TOAN_CANH.c);
  const nTruoc = truoc ? truoc.n : GOC_TOAN_CANH.n;
  let ung: {n: number; c: number; lech: number}[] = [];
  let mien: Set<string> | null = null;
  let mienSuot = false;
  let tam: V3[] | undefined, phong = 1;
  const tuHuong = (v: V3, lech: number) => ({...gocTuHuong(v, nTruoc), lech});
  const luoiQuanh = (n: number, c: number) => {
    for (const a of LUOI) for (const b of LUOI) ung.push({n: n + a, c: Math.max(4, Math.min(80, c + b)), lech: Math.hypot(a, b)});
  };
  if (che === 'phang_2d') {
    // v98: nhìn thẳng từ trên (bản đồ 2D), gần trực giao (xa = 14) -> xoay ra 3D bằng nội suy cầu + mở phối cảnh
    const m = khungTuThe(0, 88.5, bc, vt.khung);
    const m2: TuThe = {...m, xa: 14};
    return khungTuThe2(m2, bc, vt.khung);
  } else if (che === 'toan_canh' || (che !== 'nhin_day' && che !== 'can_canh' && doi.length < 3)) {
    luoiQuanh(truoc && che !== 'toan_canh' ? truoc.n : GOC_TOAN_CANH.n, GOC_TOAN_CANH.c);
  } else if (che === 'nhin_day') {
    luoiQuanh(nTruoc, GOC_NHIN_DAY_C);
  } else if (che === 'truc_dien_mat') {
    const pm = phapMat(bc, doi)!;
    let n = pm.n;
    if (!pm.laVo && cham(n, veTruoc) < 0) n = nhan(n, -1);
    // lệch 20° khỏi pháp tuyến về phía hướng nhìn cũ (giữ chiều sâu, tránh đỉnh ngoài mặt chiếu chồng lên nhau)
    let w = tru(veTruoc, nhan(n, cham(veTruoc, n)));
    if (doDai(w) < 1e-3) w = tru([0, 0, 1], nhan(n, n[2]));
    w = chuan(w);
    let v = chuan(cong(nhan(n, Math.cos(LECH_TRUC_DIEN * RAD)), nhan(w, Math.sin(LECH_TRUC_DIEN * RAD))));
    if (v[2] < Math.sin(6 * RAD)) v = chuan([v[0], v[1], Math.sin(10 * RAD) * Math.hypot(v[0], v[1]) / Math.cos(10 * RAD)]);
    const g = tuHuong(v, 0);
    luoiQuanh(g.n, Math.max(6, Math.min(78, g.c)));
  } else if (che === 'ep_mep_mat') {
    const pm = phapMat(bc, doi)!;
    mien = diemTrongMat(bc, doi);
    mienSuot = pm.laVo;
    // hướng lý tưởng: trong mặt phẳng, gần nhất với góc ngang cũ ở độ cao ~20° (cạnh đứng không bị co ngắn như khi nhìn từ trên)
    const T = huongNhin(nTruoc, 20);
    let v: V3;
    const ngang0 = cheo(pm.n, [0, 0, 1]);
    if (doDai(ngang0) > 0.2) {
      // mặt nghiêng / đứng: trục ngang h của mặt (cùng phía máy cũ) + trục "lên" trong mặt -> độ cao 20°
      let h = chuan(ngang0);
      if (cham(h, T) < 0) h = nhan(h, -1);
      const len = chuan(tru([0, 0, 1], nhan(pm.n, pm.n[2])));
      v = cong(nhan(h, Math.cos(20 * RAD)), nhan(len, Math.sin(20 * RAD)));
    } else v = tru(T, nhan(pm.n, cham(T, pm.n))); // mặt nằm ngang: nhìn ngang tầm theo hướng máy cũ
    if (doDai(v) < 1e-3) v = tru(veTruoc, nhan(pm.n, cham(veTruoc, pm.n)));
    if (doDai(v) < 1e-3) v = cheo(pm.n, [0, 0, 1]);
    v = chuan(v);
    if (v[2] < 0) { // nhìn từ dưới lên: lấy hướng đối xứng trong mặt (vẫn edge-on) cho máy ở trên
      const u = chuan(cheo(pm.n, v));
      if (u[2] > v[2]) v = u;
    }
    // tối ưu CHỈ xoay quanh pháp tuyến (mọi ứng viên vẫn song song mặt -> mặt luôn là một vệt thẳng)
    const u = cheo(pm.n, v);
    for (let a = -16; a <= 16; a += 2) {
      const r = a * RAD;
      const vv = chuan(cong(nhan(v, Math.cos(r)), nhan(u, Math.sin(r))));
      if (vv[2] > Math.sin(80 * RAD) || vv[2] < -0.05) continue;
      ung.push(tuHuong(vv, Math.abs(a)));
    }
    if (!ung.length) ung.push(tuHuong(v, 0));
  } else if (che === 'can_canh') {
    tam = diemDoi(bc, doi);
    phong = 1.6;
    const P = bc.kg.dung.diem;
    // có góc vuông ở đối tượng -> hướng nhìn gần pháp tuyến của góc (ô vuông 3D đọc rõ), trộn 50 % với hướng cũ
    const g = bc.kg.dung.goc.find((x) => x.vuong && (doi.includes(x.id) || doi.includes(x.dinh)));
    let v = veTruoc;
    if (g) {
      let nn = chuan(cheo(tru(P[g.a], P[g.dinh]), tru(P[g.b], P[g.dinh])));
      if (cham(nn, veTruoc) < 0) nn = nhan(nn, -1);
      v = chuan(cong(nhan(nn, 0.5), nhan(veTruoc, 0.5)));
    }
    const gg = tuHuong(v, 0);
    luoiQuanh(gg.n, Math.max(8, Math.min(76, gg.c)));
  }
  let tot: {m: TuThe; diem: number} | null = null;
  for (const u of ung) {
    const m = khungTuThe(u.n, u.c, bc, vt.khung, tam, phong);
    const dg = danhGia(m, bc, vt.diem, vt.doan, mien);
    const diem = -diemPhat(dg, mienSuot) - u.lech * 0.12;
    if (!tot || diem > tot.diem + 1e-9) tot = {m, diem};
  }
  return tot!.m;
}

export function boiCanh(kg: KhongGianVao, W: number, H: number): BoiCanh {
  const d = kg.dung;
  const tat: V3[] = Object.values(d.diem);
  for (const k of d.kinh) tat.push(...k.da_giac, ...(k.bung || []));
  // v98 Lego: tâm nhìn = tâm hộp bao mọi vật (không có "khối gốc" duy nhất); vỏ = mặt của MỌI khối
  let muc: V3;
  if (d.lego || !d.khoi.dinh.length) {
    const lo = [0, 1, 2].map((i) => Math.min(...tat.map((p) => p[i]))), hi = [0, 1, 2].map((i) => Math.max(...tat.map((p) => p[i])));
    muc = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  } else muc = trungBinh(d.khoi.dinh.map((x) => d.diem[x]));
  const R = Math.max(1e-3, ...tat.map((p) => doDai(tru(p, muc))));
  const vo = d.khoiDs && d.khoiDs.length ? matVoNhieu(d.diem, d.khoiDs) : matVo(d.diem, d.khoi.mat);
  return {kg, W, H, R, muc, vo};
}

// v98: khung lại một tư thế có xa ≠ 1 (phối cảnh khác) cho vừa sân khấu
function khungTuThe2(m: TuThe, bc: BoiCanh, khung: V3[]): TuThe {
  const m0: TuThe = {...m, k: 1, ox: 0, oy: 0};
  const h = heMay(m0);
  const ps = khung.map((p) => chieu(p, m0, h));
  const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.min((bc.W * KHUNG_RONG) / Math.max(1e-6, x1 - x0), (bc.H * KHUNG_CAO) / Math.max(1e-6, y1 - y0));
  return {...m, k, ox: bc.W / 2 - ((x0 + x1) / 2) * k, oy: bc.H / 2 - ((y0 + y1) / 2) * k};
}

export function lapLich(kg: KhongGianVao, W: number, H: number): LichMay {
  const bc = boiCanh(kg, W, H);
  const xs: XoayVao[] = [...(kg.xoay || [])].filter((x) => x && typeof x.t === 'number').sort((a, b) => a.t - b.t);
  const tong = kg.tongGiay || (xs.length ? xs[xs.length - 1].t + 10 : 60);
  let i0 = 0;
  let P0: TuThe;
  const tMaxDoan = (k: number) => (k + 1 < xs.length ? xs[k + 1].t : tong);
  if (xs.length && xs[0].t <= 0.25) {
    P0 = tinhTuThe(bc, xs[0].goc_nhin, xs[0].doi_tuong || [], null, tMaxDoan(0));
    i0 = 1;
  } else P0 = tinhTuThe(bc, 'toan_canh', [], null, xs.length ? xs[0].t : tong);
  const moc: Moc[] = [];
  let cur = P0;
  for (let k = i0; k < xs.length; k++) {
    const x = xs[k];
    const B = tinhTuThe(bc, x.goc_nhin, x.doi_tuong || [], cur, tMaxDoan(k));
    moc.push({t0: x.t, t1: x.t + Math.max(0.3, x.d || 1.05), A: cur, B, che_do: x.goc_nhin, doi: x.doi_tuong || [],
      tapMat: x.goc_nhin === 'truc_dien_mat' ? diemTrongMat(bc, x.doi_tuong || []) : null});
    cur = B;
  }
  return {moc, P0, R: bc.R, muc: bc.muc};
}

export type MayTai = {m: TuThe; on: TuThe; u: number; i: number; tapMat: Set<string> | null; aMat: number; dangXoay: boolean};

// tư thế tại t + tư thế ỔN ĐỊNH (đích của cú xoay đang chạy, hoặc tư thế đang khóa) cho chống nhấp nháy
export function mayTai(l: LichMay, t: number, tong = Infinity): MayTai {
  let i = -1;
  l.moc.forEach((x, j) => x.t0 <= t && (i = j));
  if (i < 0) return {m: troi(l.P0, t, -Infinity, l.moc[0]?.t0 ?? tong), on: l.P0, u: 0, i, tapMat: null, aMat: 0, dangXoay: false};
  const x = l.moc[i];
  const u = emXoay((t - x.t0) / (x.t1 - x.t0));
  const dang = t < x.t1;
  const m = dang ? noiTuThe(x.A, x.B, u) : troi(x.B, t, x.t1, i + 1 < l.moc.length ? l.moc[i + 1].t0 : tong);
  // làm mờ phần ngoài mặt đang xét (truc_dien_mat) từ lúc xoay tới hết đoạn giữ góc
  const truocMat = i > 0 ? l.moc[i - 1].tapMat : null;
  const aMat = x.tapMat ? u : 0;
  return {m, on: x.B, u, i, tapMat: x.tapMat || (dang && truocMat ? truocMat : null), aMat: x.tapMat ? aMat : dang && truocMat ? 1 - u : 0, dangXoay: dang};
}

// trôi rất chậm ±0,6° khi giữ một góc lâu hơn 6 s (bắt đầu sau 2 s khóa, tắt dần 1 s trước cú xoay kế)
export function troi(m: TuThe, t: number, tKhoa: number, tKe: number): TuThe {
  if (!(tKe - tKhoa > 6) || !isFinite(tKhoa)) return m;
  const len = kep01((t - tKhoa - 2) / 1.5) * kep01((tKe - t - 0.5) / 1);
  if (len <= 0) return m;
  return {...m, n: m.n + 0.6 * len * Math.sin(((t - tKhoa) * 2 * Math.PI) / 8)};
}
