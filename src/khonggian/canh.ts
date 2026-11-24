// v97 — TRẠNG THÁI CẢNH tại thời điểm t (hàm thuần của props + t): vị trí điểm (kể cả điểm trượt ở hook), hiện dần,
// nhấn mạnh, bung mặt phẳng cắt (tam giác MNP -> thiết diện -> mặt phẳng cắt xuyên khối), cạnh giao tuyến của thiết diện.
import {ChuyenDong, DoanVe, DungKG, KhongGianVao, V3, VaiDoan} from './kieu';
import {cham, chuan, cheo, cong, emRa, kep01, nhan, noi, tru, trungBinh} from '../3d-vector/toan3d';
import {emXoay} from './may';
import {DO_MO_CANH_PHU_KG} from '../khung4tang/cauHinhTinhChinh';

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
export const MO_CO_LAP = 0.2; // v98 co_lap: dìm mờ 80 % nền, chỉ sáng 2-3 đối tượng trọng tâm

export type DoanTT = DoanVe & {key: string; alpha: number; ve: number; nm: number; sang: number; mau?: string; mui?: 'cuoi' | 'hai'; dut?: boolean; nhom?: string};
export type DiemTT = {ten: string; p: V3; alpha: number; nm: number; sang: number};
export type KinhTT = {id: string; p: V3[]; n: V3; op: number; bung: boolean; mau: string; san?: boolean; sang?: number};
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

// v98: vị trí trên đường gấp khúc theo tham số độ dài u ∈ [0, 1]
export function diemTrenDuong(ds: V3[], u: number): V3 {
  if (ds.length === 1) return ds[0];
  const L: number[] = [0];
  for (let i = 1; i < ds.length; i++) L.push(L[i - 1] + Math.hypot(ds[i][0] - ds[i - 1][0], ds[i][1] - ds[i - 1][1], ds[i][2] - ds[i - 1][2]));
  const s = kep01(u) * L[L.length - 1];
  let i = 1;
  while (i < L.length - 1 && L[i] < s) i++;
  const w = L[i] > L[i - 1] ? (s - L[i - 1]) / (L[i] - L[i - 1]) : 0;
  return noi(ds[i - 1], ds[i], kep01(w));
}

// tham số u của chuyển động tại t (khóa hình giữa các mốc, êm vào/ra)
export function uChuyen(c: ChuyenDong, t: number): number {
  const m = c.moc;
  if (!m.length) return 0;
  if (t <= m[0].t) return m[0].u;
  for (let i = 1; i < m.length; i++) if (t < m[i].t) return m[i - 1].u + (m[i].u - m[i - 1].u) * emXoay((t - m[i - 1].t) / Math.max(0.05, m[i].t - m[i - 1].t));
  return m[m.length - 1].u;
}

const quayQuanh = (p: V3, o: V3, v: V3, g: number): V3 => {
  const k = chuan(v), r = tru(p, o);
  const c = Math.cos(g), s = Math.sin(g);
  return cong(o, cong(cong(nhan(r, c), nhan(cheo(k, r), s)), nhan(k, cham(k, r) * (1 - c))));
};

// v98: điểm sau chuyển động (truot_toi_uu, vật bay) + phép biến hình (ảnh chạy từ gốc tới đích đúng mốc lời)
export function diemLego(kg: KhongGianVao, P0: Record<string, V3>, t: number): Record<string, V3> {
  if (!kg.chuyen?.length && !kg.bienHinh?.length) return P0;
  const P: Record<string, V3> = {...P0};
  for (const c of kg.chuyen || []) if (c.duong.length) P[c.diem] = diemTrenDuong(c.duong, uChuyen(c, t));
  for (const b of kg.bienHinh || []) {
    for (const [src, dst] of b.cap) {
      if (!P[src] || !P0[dst]) continue;
      if (t < b.t) { P[dst] = P[src]; continue; }
      if (t >= b.t + b.d) continue;
      const u = emXoay((t - b.t) / Math.max(0.1, b.d));
      P[dst] = b.loai === 'quay' && b.truc ? quayQuanh(P[src], b.truc.o, b.truc.v, b.truc.goc * u) : noi(P[src], P0[dst], u);
    }
  }
  return P;
}

export function tienDoBung(kg: KhongGianVao, id: string, t: number): number {
  const h = (kg.hanhDong || []).find((x) => x.loai === 'bung_mat' && x.id === id);
  if (!h) return 1;
  return emXoay((t - h.t) / Math.max(0.2, h.d));
}

// tập nhấn mạnh hiện tại + mức chuyển (mềm 0,4 s)
function nhanManhTai(kg: KhongGianVao, t: number): {nay: Set<string>; truoc: Set<string>; a: number; moNay: number; moTruoc: number} {
  const ds = [...(kg.nhanManh || [])].sort((x, y) => x.t - y.t);
  let i = -1;
  ds.forEach((x, j) => x.t <= t && (i = j));
  const lay = (j: number) => new Set((j >= 0 ? ds[j].ids : []).map(khoaId));
  const mo = (j: number) => (j >= 0 && ds[j].coLap ? MO_CO_LAP : DO_MO_CANH_PHU_KG);
  return {nay: lay(i), truoc: lay(i - 1), a: i >= 0 ? emRa((t - ds[i].t) / THOI_NHAN) : 1, moNay: mo(i), moTruoc: mo(i - 1)};
}

// v102: ĐIỂM dựng thêm (H, I, O, chân vuông góc, giao điểm phụ) không hiện sẵn từ giây 0 — nếu props không khai `hien[điểm]`,
// hiện đúng lúc đoạn / mặt / góc ĐẦU TIÊN chứa nó xuất hiện (cùng quy tắc scripts/hinh_khong_gian/thoi_gian.py). Đỉnh khối, điểm Lego,
// điểm trượt hook và điểm chuyển động giữ nguyên (hiện từ đầu / theo khối).
const BO_NHO_HIEN_PHU = new WeakMap<KhongGianVao, Record<string, number>>();
export function hienDiemPhu(kg: KhongGianVao): Record<string, number> {
  const co = BO_NHO_HIEN_PHU.get(kg);
  if (co) return co;
  const d = kg.dung, hien = kg.hien || {};
  const ra: Record<string, number> = {};
  const giu = new Set<string>(d.khoi.dinh);
  (d.khoiDs || []).forEach((k) => k.dinh.forEach((x) => giu.add(x)));
  if (d.truot?.diem) giu.add(d.truot.diem);
  (kg.chuyen || []).forEach((c) => giu.add(c.diem));
  (kg.bienHinh || []).forEach((b) => b.cap.forEach(([a, z]) => { giu.add(a); giu.add(z); }));
  for (const x of d.doan) if (x.vai === 'khoi') { giu.add(x.a); giu.add(x.b); }
  const lay = (id: string, ...them: string[]) => [id, ...them].map((k) => hien[k]).find((v) => v !== undefined);
  for (const ten of d.nhan) {
    if (giu.has(ten) || hien[ten] !== undefined || !d.diem[ten]) continue;
    const ts: number[] = [];
    for (const x of d.doan) if (x.a === ten || x.b === ten) { const v = lay(x.id, x.a + x.b, x.b + x.a, khoaDoan(x.a, x.b), x.nhom || ''); if (v !== undefined) ts.push(v); }
    for (const k of d.kinh) if (k.diem.includes(ten) && hien[k.id] !== undefined) ts.push(hien[k.id]);
    for (const g of d.goc) if ((g.dinh === ten || g.a === ten || g.b === ten) && hien[g.id] !== undefined) ts.push(hien[g.id]);
    if (ts.length && Math.min(...ts) > 0) ra[ten] = Math.min(...ts);
  }
  BO_NHO_HIEN_PHU.set(kg, ra);
  return ra;
}

export function trangThai(kg: KhongGianVao, t: number): TrangThai {
  const d: DungKG = kg.dung;
  const P = diemLego(kg, diemTai(kg, t), t);
  const hien = kg.hien || {};
  const hienKhoa: Record<string, number> = {};
  for (const [id, th] of Object.entries(hien)) hienKhoa[khoaId(id)] = th;
  // v98: tra mốc hiện theo khóa đoạn -> id -> nhóm khối (mảnh của trụ / đường dóng / vạch trục hiện cùng khối)
  const thHien = (key: string, id?: string, nhom?: string) => hienKhoa[key] ?? (id !== undefined ? hien[id] : undefined) ?? (nhom ? hien[nhom] : undefined);
  const alpha = (key: string, tre = 0, id?: string, nhom?: string) => {
    const th = thHien(key, id, nhom);
    return th === undefined ? 1 : emRa((t - th - tre) / THOI_HIEN);
  };
  const ve = (key: string, id?: string, nhom?: string, tre = 0) => {
    const th = thHien(key, id, nhom);
    return th === undefined ? 1 : emXoay((t - th - tre) / THOI_HIEN);
  };
  const nm = nhanManhTai(kg, t);
  const muc = (key: string) => {
    const f = (s: Set<string>, mo: number) => (!s.size ? {op: 1, sang: 0} : s.has(key) ? {op: 1, sang: 1} : {op: mo, sang: 0});
    const A = f(nm.truoc, nm.moTruoc), B = f(nm.nay, nm.moNay);
    return {op: A.op + (B.op - A.op) * nm.a, sang: A.sang + (B.sang - A.sang) * nm.a};
  };
  const doan: DoanTT[] = [];
  for (const x of d.doan) {
    const key = khoaDoan(x.a, x.b);
    if (!P[x.a] || !P[x.b]) continue;
    const m = muc(key);
    // đường cong lấy mẫu: vẽ dần nối tiếp từng đoạn (0,025 s / đoạn) khi khối hiện
    const j = x.vai === 'cong' ? Number(x.id.split('#')[1] || 0) : 0;
    const tre = x.vai === 'cong' ? j * 0.025 : 0;
    const nhom = x.nhom || (x.vai === 'cong' ? x.id.split('#')[0] : undefined);
    const mn = nhom && kg.nhanManh?.length && !m.sang ? muc(nhom) : m;
    doan.push({id: x.id, a: P[x.a], b: P[x.b], vai: x.vai, tenA: x.a, tenB: x.b, key, alpha: alpha(key, tre, x.id, nhom), ve: ve(key, x.id, nhom, tre),
      nm: Math.max(m.op, mn.op), sang: Math.max(m.sang, mn.sang), mau: x.mau, mui: x.mui, dut: x.dut, nhom});
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
    if (a1 > 0.01 && tam.length >= 3) kinh.push({id: k.id + '#tg', p: tam, n, op: 0.42 * a * a1 * m.op, bung: false, mau: k.mau || 'vang', sang: m.sang});
    if (k.san) { // v98: mặt sàn Oxy bán trong suốt (nhìn xuyên xuống miền z < 0), không bung
      kinh.push({id: k.id, p: k.da_giac, n: [0, 0, 1], op: 0.12 * a * m.op, bung: false, mau: k.mau || 'cyan', san: true});
      continue;
    }
    if (a2 > 0.01) {
      const s = 0.45 + 0.55 * emRa(a2);
      kinh.push({id: k.id, p: k.da_giac.map((p) => cong(g, nhan(tru(p, g), s))), n, op: 0.44 * a * a2 * m.op, bung: false, mau: k.mau || 'vang', sang: m.sang});
    }
    if (k.bung && a3 > 0.01) {
      const s = 0.72 + 0.28 * emRa(a3);
      kinh.push({id: k.id + '#bung', p: k.bung.map((p) => cong(g, nhan(tru(p, g), s))), n, op: 0.22 * a * a3 * m.op, bung: true, mau: k.mau || 'vang', sang: m.sang});
    }
    // giao tuyến (cạnh thiết diện) hiện cùng pha 2
    if (a2 > 0.01) {
      for (let i = 0; i < k.da_giac.length; i++) {
        const pa = k.da_giac[i], pb = k.da_giac[(i + 1) % k.da_giac.length];
        doan.push({id: k.id + '#gt' + i, a: pa, b: pb, vai: 'giao_tuyen' as VaiDoan, key: k.id, alpha: a * a2, ve: 1, nm: m.op, sang: m.sang});
      }
    }
  }
  const hienPhu = hienDiemPhu(kg);
  const diemVe: DiemTT[] = d.nhan.filter((x) => P[x]).map((ten) => {
    const m = muc(ten);
    const thPhu = hienPhu[ten];
    return {ten, p: P[ten], alpha: thPhu !== undefined ? emRa((t - thPhu) / THOI_HIEN) : alpha(ten), nm: m.op, sang: m.sang};
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
