// v97 — NÉT LIỀN / NÉT ĐỨT GIẢI TÍCH (Analytical Hidden-Line Removal), tính lại ở MỌI khung hình từ vị trí máy tức thời.
// Khối luôn LỒI (chóp, lăng trụ, hộp, tứ diện đáy lồi) nên:
//  - mặt vỏ "trước" = pháp tuyến ngoài hướng về máy; chỉ mặt trước mới che được;
//  - mỗi đoạn PQ tách tại MỌI tham số có thể đổi trạng thái: (1) giao với mặt phẳng (máy, cạnh mặt trước) = chỗ hình chiếu
//    của PQ cắt hình chiếu cạnh đó (CHÍNH XÁC trong phối cảnh, không lấy mẫu), (2) chỗ PQ đâm xuyên mặt vỏ (giao 3D),
//    (3) giao với mặt kính bán trong suốt và cạnh của nó (tách lớp trước / sau kính);
//  - trung điểm mỗi đoạn con: điểm nằm trên mặt vỏ -> theo phân loại mặt chứa nó; còn lại bắn tia máy -> điểm thử va
//    chạm tia–đa giác với các mặt trước (ε = 1e-4 theo tham số tia: cạnh nằm trên mặt không tự che chính nó).
// CHỐNG NHẤP NHÁY (không trạng thái): mặt gần song song tia nhìn (|n·v| < 0,035) KHÔNG lấy dấu tức thời mà lấy dấu ở tư thế
// ỔN ĐỊNH do đường cong máy quyết định theo t (dau_on_dinh, xem dao_dien.ts) -> cùng t luôn cùng kết quả ở mọi luồng render.
import {Kinh, ManhNet, MatVo, DoanVe, V3} from './kieu';
import {cham, cheo, chuan, cong, doDai, nhan, noi, tru, trungBinh} from '../3d-vector/toan3d';

export const NGUONG_SUOT = 0.035;
const EPS_TIA = 1e-4;

// Mặt vỏ của khối lồi với pháp tuyến hướng ra ngoài (so với trọng tâm khối)
export function matVo(diem: Record<string, V3>, mat: string[][]): MatVo[] {
  const G = trungBinh([...new Set(mat.flat())].map((t) => diem[t]));
  return mat.map((ds) => {
    const p = ds.map((t) => diem[t]);
    const g = trungBinh(p);
    let n = chuan(cheo(tru(p[1], p[0]), tru(p[2], p[0])));
    if (cham(n, tru(g, G)) < 0) n = nhan(n, -1);
    return {ten: ds, p, n, g};
  });
}

// v98: mặt vỏ của NHIỀU khối lồi (Lego: tháp trụ, nón, cầu, hộp...) — pháp tuyến ngoài so với trọng tâm TỪNG khối
export function matVoNhieu(diem: Record<string, V3>, khoi: {mat: string[][]; cong?: boolean}[]): MatVo[] {
  const ra: MatVo[] = [];
  khoi.forEach((k, i) => {
    if (!k.mat.length || !k.mat.every((f) => f.every((t) => diem[t]))) return;
    for (const f of matVo(diem, k.mat)) ra.push({...f, khoi: i, cong: !!k.cong});
  });
  return ra;
}

// dấu "trước" tức thời của mặt so với vị trí máy C: s = n · (C - g)/|C - g|
export const doTruoc = (m: MatVo, C: V3) => {
  const v = tru(C, m.g);
  return cham(m.n, v) / Math.max(1e-12, doDai(v));
};

// Phân loại mặt trước/sau có ổn định: |s| >= ngưỡng -> dấu tức thời; sát ngưỡng -> dấu ở tư thế ổn định (truyền vào)
export function phanLoaiMat(ds: MatVo[], C: V3, CMoc: V3 | null): boolean[] {
  return ds.map((m) => {
    const s = doTruoc(m, C);
    if (Math.abs(s) >= NGUONG_SUOT || !CMoc) return s > 0;
    const s2 = doTruoc(m, CMoc);
    return Math.abs(s2) >= NGUONG_SUOT ? s2 > 0 : false; // tư thế ổn định cũng sượt: coi là mặt sau (không che)
  });
}

// điểm X nằm trong đa giác lồi p (cùng mặt phẳng n), nới e
function trongDaGiac(X: V3, p: V3[], n: V3, e: number): boolean {
  let dau = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const s = cham(cheo(tru(b, a), tru(X, a)), n) / Math.max(1e-12, doDai(tru(b, a)));
    if (s < -e) {
      if (dau > 0) return false;
      dau = -1;
    } else if (s > e) {
      if (dau < 0) return false;
      dau = 1;
    }
  }
  return true;
}

// tia C -> X cắt đa giác (mặt phẳng n) tại tham số s trong (ε, 1 - ε)?
function tiaCat(C: V3, X: V3, p: V3[], n: V3): boolean {
  const D = tru(X, C);
  const den = cham(n, D);
  if (Math.abs(den) < 1e-12) return false;
  const s = cham(n, tru(p[0], C)) / den;
  if (s <= EPS_TIA || s >= 1 - EPS_TIA) return false;
  return trongDaGiac(cong(C, nhan(D, s)), p, n, 1e-9 * (1 + doDai(D)));
}

const tren = (X: V3, m: {p: V3[]; n: V3}, R: number) => Math.abs(cham(m.n, tru(X, m.p[0]))) < 1e-6 * R && trongDaGiac(X, m.p, m.n, 1e-6 * R);

// Một điểm có bị mặt vỏ che không (dùng chung cho nét và chấm điểm)
export function diemKhuat(X: V3, C: V3, vo: MatVo[], truoc: boolean[], R: number): boolean {
  // điểm nằm trên mặt vỏ: thấy được khi có ít nhất một mặt chứa nó là mặt trước (cạnh khối = giao 2 mặt)
  let trenMat = false, thay = false;
  for (let i = 0; i < vo.length; i++) {
    if (tren(X, vo[i], R)) {
      trenMat = true;
      if (truoc[i]) thay = true;
    }
  }
  if (trenMat && !thay) return true;
  // v98 nhiều khối: điểm trên mặt trước của khối này vẫn có thể bị KHỐI KHÁC che -> luôn bắn tia tới mặt trước còn lại
  // (một khối lồi không tự che mặt trước của nó, và tia bỏ qua mặt chứa X nhờ ε -> kết quả một khối giữ nguyên như v97)
  for (let i = 0; i < vo.length; i++) if (truoc[i] && tiaCat(C, X, vo[i].p, vo[i].n)) return true;
  return false;
}

function sauKinh(X: V3, C: V3, ks: Kinh[]): boolean {
  for (const k of ks) if (k.op > 0.02 && tiaCat(C, X, k.p, k.n)) return true;
  return false;
}

// tham số t trên PQ mà P + t(Q-P) nằm trên mặt phẳng (n, o)
function tMat(P: V3, Q: V3, n: V3, o: V3): number | null {
  const d = tru(Q, P);
  const den = cham(n, d);
  if (Math.abs(den) < 1e-12) return null;
  const t = cham(n, tru(o, P)) / den;
  return t > 1e-7 && t < 1 - 1e-7 ? t : null;
}

// tham số chỗ hình chiếu PQ cắt hình chiếu đoạn AB = giao PQ với mặt phẳng (C, A, B), kèm kiểm X thật sự chiếu lên trong AB
function tCanh(P: V3, Q: V3, A: V3, B: V3, C: V3): number | null {
  const n0 = cheo(tru(A, C), tru(B, C));
  if (doDai(n0) < 1e-12) return null;
  const n = chuan(n0);
  const t = tMat(P, Q, n, C);
  if (t === null) return null;
  const X = noi(P, Q, t);
  // X nằm trong góc (CA, CB): hai tích chéo cùng hướng với n
  const a = cham(cheo(tru(A, C), tru(X, C)), n), b = cham(cheo(tru(X, C), tru(B, C)), n);
  return a >= -1e-12 && b >= -1e-12 ? t : null;
}

export function tachDoan(d: DoanVe, C: V3, vo: MatVo[], truoc: boolean[], ks: Kinh[], R: number): ManhNet[] {
  const {a: P, b: Q} = d;
  const ts = [0, 1];
  vo.forEach((m, i) => {
    const t = tMat(P, Q, m.n, m.p[0]); // đâm xuyên mặt vỏ (hoặc đi qua mặt phẳng chứa mặt)
    if (t !== null) ts.push(t);
    if (!truoc[i]) return;
    for (let j = 0; j < m.p.length; j++) {
      const t2 = tCanh(P, Q, m.p[j], m.p[(j + 1) % m.p.length], C);
      if (t2 !== null) ts.push(t2);
    }
  });
  for (const k of ks) {
    if (k.op <= 0.02) continue;
    const t = tMat(P, Q, k.n, k.p[0]);
    if (t !== null) ts.push(t);
    for (let j = 0; j < k.p.length; j++) {
      const t2 = tCanh(P, Q, k.p[j], k.p[(j + 1) % k.p.length], C);
      if (t2 !== null) ts.push(t2);
    }
  }
  ts.sort((x, y) => x - y);
  const ra: ManhNet[] = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    const u0 = ts[i], u1 = ts[i + 1];
    if (u1 - u0 < 1e-6) continue;
    const X = noi(P, Q, (u0 + u1) / 2);
    const khuat = diemKhuat(X, C, vo, truoc, R);
    const sk = !khuat && sauKinh(X, C, ks);
    const truocDo = ra[ra.length - 1];
    if (truocDo && truocDo.khuat === khuat && truocDo.sauKinh === sk) {
      truocDo.u1 = u1;
      truocDo.b = noi(P, Q, u1);
    } else ra.push({id: d.id, vai: d.vai, a: noi(P, Q, u0), b: noi(P, Q, u1), khuat, sauKinh: sk, u0, u1});
  }
  return ra;
}

// Chân lý đối chứng (test): lấy mẫu dày + bắn tia tới MỌI mặt (không phân loại trước/sau) -> tỉ lệ khuất theo tham số
export function khuatMauDay(P: V3, Q: V3, C: V3, vo: MatVo[], n = 600): boolean[] {
  const ra: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const X = noi(P, Q, (i + 0.5) / n);
    let k = false;
    for (const m of vo) if (tiaCat(C, X, m.p, m.n)) { k = true; break; }
    ra.push(k);
  }
  return ra;
}
