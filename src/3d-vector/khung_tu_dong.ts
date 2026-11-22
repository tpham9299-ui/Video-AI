// v90 — AUTO-FRAMING: tính tâm cảnh, bán kính, và cho MỖI mốc máy một tỉ lệ + gốc màn hình sao cho toàn bộ hình
// (mọi vật, kể cả vật hiện sau, và mọi trạng thái hành động trong đoạn của mốc đó) nằm gọn ~75% sân khấu.
// Giữa hai mốc, tỉ lệ/gốc nội suy cùng nhịp với góc máy -> hình không bao giờ trôi khỏi khung, không giật zoom.
import {Canh3DV, Manh, V3} from './kieu';
import {chieuDiem, gocTai, heTruc, MayQuay, mocMay, MocMay, THOI_CHUYEN_MAY, viTriMoc} from './camera';
import {dungCanh} from './canh';
import {doDai, tru} from './toan3d';

export const TI_LE_KHUNG = 0.75; // theo bề ngang
export const TI_LE_KHUNG_DOC = 0.78; // theo bề cao (sân khấu dọc 39%: cho hình cao hơn một chút)

export type KhungMoc = {k: number; ox: number; oy: number};
export type KhungCanh = {muc: V3; R: number; D: number; moc: MocMay[]; khung: KhungMoc[]};

function diemCua(manh: Manh[]): V3[] {
  const ds: V3[] = [];
  for (const m of manh) {
    if (m.k === 'net') ds.push(m.a, m.b);
    else if (m.k === 'mat') ds.push(...m.p);
    else ds.push(m.p);
  }
  return ds;
}

// điểm cần tách bạch trên màn hình: chấm điểm + điểm neo nhãn (tên đỉnh), lấy ở giữa đoạn mốc
function diemNeo(canh: Canh3DV, a: number, b: number): V3[] {
  const {manh} = dungCanh(canh, (a + b) / 2, null);
  return manh.filter((m) => m.k === 'cham' || m.k === 'nhan').map((m) => (m as {p: V3}).p);
}
export function suyBien(ps: V3[], g: {n: number; c: number; muc: V3; D: number}, R: number): boolean {
  const may: MayQuay = {...g, zoom: 1, k: 1, ox: 0, oy: 0};
  const h = heTruc(may);
  const s = ps.map((p) => chieuDiem(p, may, h));
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    if (doDai(tru(ps[i], ps[j])) < 0.12 * R) continue;
    if (Math.hypot(s[i].x - s[j].x, s[i].y - s[j].y) < 0.035 * R) return true;
  }
  return false;
}

export function tinhKhung(canh: Canh3DV, W: number, H: number, tongGiay: number): KhungCanh {
  const moc = mocMay(canh.buoc);
  // các thời điểm lấy mẫu: đầu/cuối mỗi đoạn mốc + trong khi hành động chạy
  const tMoc = moc.map((m, i) => [m.t, i + 1 < moc.length ? moc[i + 1].t : Math.max(m.t + 0.5, tongGiay)] as [number, number]);
  const mau = (a: number, b: number) => [0, 0.34, 0.67, 1].map((x) => a + (b - a) * x);
  const diemDoan: V3[][] = tMoc.map(([a, b]) => mau(a, b).flatMap((t) => diemCua(dungCanh(canh, t, null, true).manh)));
  const tatCa = diemDoan.flat();
  if (!tatCa.length) return {muc: [0, 0, 0], R: 1, D: 3.6, moc, khung: moc.map(() => ({k: 100, ox: W / 2, oy: H / 2}))};
  const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of tatCa) for (let i = 0; i < 3; i++) {
    lo[i] = Math.min(lo[i], p[i]);
    hi[i] = Math.max(hi[i], p[i]);
  }
  const muc: V3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const R = Math.max(1e-3, ...tatCa.map((p) => doDai(tru(p, muc))));
  const D = R * 3.6;
  // v92 AUTO-CAMERA DEGENERACY GUARD: góc máy làm hai đỉnh/điểm có nhãn khác nhau chiếu trùng nhau (nhìn thẳng cạnh hộp,
  // đỉnh chóp rơi đúng tâm đáy...) -> xoay lệch thêm 9° (tối đa 3 lần). Cảnh phẳng nhìn chính diện/từ trên giữ nguyên.
  moc.forEach((m, i) => {
    const neo = diemNeo(canh, tMoc[i][0], tMoc[i][1]);
    if (neo.length < 2) return;
    for (let lan = 0; lan < 3 && suyBien(neo, {n: m.n, c: m.c, muc, D}, R); lan++) {
      m.n += 9;
      if (m.c < 12) m.c += 5;
    }
  });
  const khung = moc.map((m, i): KhungMoc => {
    const may: MayQuay = {n: m.n, c: m.c, zoom: m.zoom, muc, D, k: 1, ox: 0, oy: 0};
    const h = heTruc(may);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of diemDoan[i]) {
      const s = chieuDiem(p, may, h);
      x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x);
      y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y);
    }
    const bw = Math.max(1e-6, x1 - x0), bh = Math.max(1e-6, y1 - y0);
    const k = Math.min((TI_LE_KHUNG * W) / bw, (TI_LE_KHUNG_DOC * H) / bh) * m.zoom;
    return {k, ox: W / 2 - k * (x0 + x1) / 2, oy: H / 2 - k * (y0 + y1) / 2};
  });
  return {muc, R, D, moc, khung};
}

// Máy quay đầy đủ tại thời điểm t.
export function mayTai(kc: KhungCanh, t: number, quayNhe: boolean): MayQuay {
  const g = gocTai(kc.moc, t, quayNhe);
  const {i, a} = viTriMoc(kc.moc, t);
  const A = kc.khung[i], B = kc.khung[Math.min(kc.khung.length - 1, i + 1)];
  const L = (x: number, y: number) => x + (y - x) * a;
  // zoom của người dùng đã nằm trong k của từng mốc
  // giữa hai góc máy, hình chiếu có thể phình hơn cả hai đầu mốc -> lùi máy nhẹ (tối đa 9%) trong lúc chuyển
  const lui = A === B ? 1 : 1 - 0.09 * Math.sin(Math.PI * a);
  // (ox, oy) là ảnh của tâm cảnh nên co k quanh đó = lùi máy quanh tâm hình
  return {n: g.n, c: g.c, zoom: g.zoom, muc: kc.muc, D: kc.D, k: L(A.k, B.k) * lui, ox: L(A.ox, B.ox), oy: L(A.oy, B.oy)};
}

export {THOI_CHUYEN_MAY};
