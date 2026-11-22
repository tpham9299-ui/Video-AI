// v97 — TRẠNG THÁI CẢNH tại thời điểm t (hàm thuần của props + t): vị trí điểm (kể cả điểm trượt ở hook), hiện dần,
// nhấn mạnh, bung mặt phẳng cắt (tam giác MNP -> thiết diện -> mặt phẳng cắt xuyên khối), cạnh giao tuyến của thiết diện.
import {DoanVe, DungKG, KhongGianVao, V3, VaiDoan} from './kieu';
import {cham, chuan, cheo, cong, emRa, kep01, nhan, noi, tru, trungBinh} from '../3d-vector/toan3d';
import {emXoay} from './may';

const TEN_DIEM = /[A-Z](?:_?\d)?'*/g;
export const tachTen = (s: string): string[] => s.replace(/[()\s]/g, '').match(TEN_DIEM) || [];
// khóa so khớp đoạn không phụ thuộc thứ tự ("SD" = "DS")
export const khoaDoan = (a: string, b: string) => [a, b].sort().join('|');
export const khoaId = (id: string): string => {
  if (id.startsWith('(') || id.startsWith('goc')) return id;
  const t = tachTen(id);
  return t.length === 2 && t.join('') === id.replace(/\s/g, '') ? khoaDoan(t[0], t[1]) : id;
};

export const THOI_HIEN = 0.6;
export const THOI_NHAN = 0.4;
export const MO_NEN = 0.32; // vật ngoài trọng tâm (nhấn mạnh / mặt đang xét) còn ~32 % độ đục (làm mờ ~68 %)

export type DoanTT = DoanVe & {key: string; alpha: number; ve: number; nm: number; sang: number};
export type DiemTT = {ten: string; p: V3; alpha: number; nm: number; sang: number};
export type KinhTT = {id: string; p: V3[]; n: V3; op: number; bung: boolean; mau: string};
export type GocTT = {id: string; dinh: V3; a: V3; b: V3; vuong: boolean; nhan: string; alpha: number; sang: number; tenDinh: string};
export type TrangThai = {diem: Record<string, V3>; doan: DoanTT[]; diemVe: DiemTT[]; kinh: KinhTT[]; goc: GocTT[]; bung: Record<string, number>};

// điểm theo hiệu ứng trượt (nội suy tuyến tính giữa các khung lấy mẫu của bộ giải)
export function diemTai(kg: KhongGianVao, t: number): Record<string, V3> {
  const d = kg.dung;
  const tr = d.truot, g = kg.truotGio;
  if (!tr || !g || !tr.khung.length || t >= g.t + g.d) return d.diem;
  const u = emXoay((t - g.t) / Math.max(0.05, g.d));
  const k = tr.khung;
  let i = 0;
  while (i + 1 < k.length - 1 && k[i + 1].u <= u) i++;
  const A = k[i], B = k[Math.min(k.length - 1, i + 1)];
  const w = B.u > A.u ? kep01((u - A.u) / (B.u - A.u)) : 0;
  const ra: Record<string, V3> = {...d.diem};
  for (const ten of Object.keys(A.diem)) if (B.diem[ten]) ra[ten] = noi(A.diem[ten], B.diem[ten], w);
  return ra;
}

export function tienDoBung(kg: KhongGianVao, id: string, t: number): number {
  const h = (kg.hanhDong || []).find((x) => x.loai === 'bung_mat' && x.id === id);
  if (!h) return 1;
  return emXoay((t - h.t) / Math.max(0.2, h.d));
}

// tập nhấn mạnh hiện tại + mức chuyển (mềm 0,4 s)
function nhanManhTai(kg: KhongGianVao, t: number): {nay: Set<string>; truoc: Set<string>; a: number} {
  const ds = [...(kg.nhanManh || [])].sort((x, y) => x.t - y.t);
  let i = -1;
  ds.forEach((x, j) => x.t <= t && (i = j));
  const lay = (j: number) => new Set((j >= 0 ? ds[j].ids : []).map(khoaId));
  return {nay: lay(i), truoc: lay(i - 1), a: i >= 0 ? emRa((t - ds[i].t) / THOI_NHAN) : 1};
}

export function trangThai(kg: KhongGianVao, t: number): TrangThai {
  const d: DungKG = kg.dung;
  const P = diemTai(kg, t);
  const hien = kg.hien || {};
  const hienKhoa: Record<string, number> = {};
  for (const [id, th] of Object.entries(hien)) hienKhoa[khoaId(id)] = th;
  const alpha = (key: string, tre = 0) => {
    const th = hienKhoa[key];
    return th === undefined ? 1 : emRa((t - th - tre) / THOI_HIEN);
  };
  const ve = (key: string) => {
    const th = hienKhoa[key];
    return th === undefined ? 1 : emXoay((t - th) / THOI_HIEN);
  };
  const nm = nhanManhTai(kg, t);
  const muc = (key: string) => {
    const f = (s: Set<string>) => (!s.size ? {op: 1, sang: 0} : s.has(key) ? {op: 1, sang: 1} : {op: 0.45, sang: 0});
    const A = f(nm.truoc), B = f(nm.nay);
    return {op: A.op + (B.op - A.op) * nm.a, sang: A.sang + (B.sang - A.sang) * nm.a};
  };
  const doan: DoanTT[] = [];
  for (const x of d.doan) {
    const key = khoaDoan(x.a, x.b);
    if (!P[x.a] || !P[x.b]) continue;
    const m = muc(key);
    doan.push({id: x.id, a: P[x.a], b: P[x.b], vai: x.vai, tenA: x.a, tenB: x.b, key, alpha: alpha(key), ve: ve(key), nm: m.op, sang: m.sang});
  }
  const kinh: KinhTT[] = [];
  const bung: Record<string, number> = {};
  for (const k of d.kinh) {
    const a = alpha(k.id);
    if (a <= 0.001) continue;
    const b = tienDoBung(kg, k.id, t);
    bung[k.id] = b;
    const m = muc(k.id);
    const tam = k.diem.map((x) => P[x]).filter(Boolean) as V3[];
    const n = tam.length >= 3 ? chuan(cheo(tru(tam[1], tam[0]), tru(tam[2], tam[0]))) : [0, 0, 1] as V3;
    const g = trungBinh(k.da_giac);
    // pha 1: tam giác 3 điểm xác định mặt (MNP) -> pha 2: thiết diện bung từ tâm -> pha 3: mặt phẳng cắt xuyên khối
    const a1 = 1 - kep01(b / 0.4), a2 = kep01((b - 0.05) / 0.45), a3 = kep01((b - 0.5) / 0.5);
    if (a1 > 0.01 && tam.length >= 3) kinh.push({id: k.id + '#tg', p: tam, n, op: 0.42 * a * a1 * m.op, bung: false, mau: k.mau || 'vang'});
    if (a2 > 0.01) {
      const s = 0.45 + 0.55 * emRa(a2);
      kinh.push({id: k.id, p: k.da_giac.map((p) => cong(g, nhan(tru(p, g), s))), n, op: 0.44 * a * a2 * m.op, bung: false, mau: k.mau || 'vang'});
    }
    if (k.bung && a3 > 0.01) {
      const s = 0.72 + 0.28 * emRa(a3);
      kinh.push({id: k.id + '#bung', p: k.bung.map((p) => cong(g, nhan(tru(p, g), s))), n, op: 0.22 * a * a3 * m.op, bung: true, mau: k.mau || 'vang'});
    }
    // giao tuyến (cạnh thiết diện) hiện cùng pha 2
    if (a2 > 0.01) {
      for (let i = 0; i < k.da_giac.length; i++) {
        const pa = k.da_giac[i], pb = k.da_giac[(i + 1) % k.da_giac.length];
        doan.push({id: k.id + '#gt' + i, a: pa, b: pb, vai: 'giao_tuyen' as VaiDoan, key: k.id, alpha: a * a2, ve: 1, nm: m.op, sang: m.sang});
      }
    }
  }
  const diemVe: DiemTT[] = d.nhan.filter((x) => P[x]).map((ten) => {
    const m = muc(ten);
    return {ten, p: P[ten], alpha: alpha(ten), nm: m.op, sang: m.sang};
  });
  const goc: GocTT[] = d.goc.filter((g) => P[g.dinh] && P[g.a] && P[g.b]).map((g) => {
    const m = muc(g.id);
    return {id: g.id, dinh: P[g.dinh], a: P[g.a], b: P[g.b], vuong: g.vuong, nhan: g.nhan, alpha: alpha(g.id), sang: m.sang, tenDinh: g.dinh};
  });
  return {diem: P, doan, diemVe, kinh, goc, bung};
}

// ký hiệu góc vuông 3D dựng theo PHỐI CẢNH THẬT từ 2 vector trực giao u, v tại đỉnh (3 điểm của ô vuông nhỏ)
export function oVuong3D(dinh: V3, a: V3, b: V3, kich: number): [V3, V3, V3] {
  const u = chuan(tru(a, dinh));
  let v = tru(b, dinh);
  v = chuan(tru(v, nhan(u, cham(v, u)))); // trực giao hóa (ổn định khi góc lệch 90° rất nhỏ do làm tròn)
  return [cong(dinh, nhan(u, kich)), cong(dinh, cong(nhan(u, kich), nhan(v, kich))), cong(dinh, nhan(v, kich))];
}

// cung đo góc 3D (đa tuyến trên mặt phẳng của góc)
export function cungGoc3D(dinh: V3, a: V3, b: V3, r: number, n = 18): V3[] {
  const u = chuan(tru(a, dinh));
  const w0 = tru(b, dinh);
  const goc = Math.acos(Math.max(-1, Math.min(1, cham(u, chuan(w0)))));
  const w = chuan(tru(w0, nhan(u, cham(w0, u))));
  const ra: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const th = (goc * i) / n;
    ra.push(cong(dinh, cong(nhan(u, r * Math.cos(th)), nhan(w, r * Math.sin(th)))));
  }
  return ra;
}
