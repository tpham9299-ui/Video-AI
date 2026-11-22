// v97 — GHÉP MỘT KHUNG HÌNH (hàm thuần của props + t): máy tại t -> phân loại mặt vỏ (chống nhấp nháy theo tư thế ổn định)
// -> tách nét liền/đứt giải tích -> lớp vẽ theo chiều sâu: lưới sàn | nét khuất + nét sau kính | mặt kính | nét thấy |
// điểm + ký hiệu góc | nhãn. Component SanKhauKhongGian.tsx chỉ vẽ ra SVG; test Node dùng trực tiếp hàm này.
import {KhongGianVao, ManhNet, TuThe, V3, VaiDoan} from './kieu';
import {chieu, heMay, HeMay, noiTuThe} from './may';
import {diemKhuat, phanLoaiMat, tachDoan} from './hlr';
import {MatVo} from './kieu';
import {cungGoc3D, oVuong3D, trangThai, MO_NEN} from './canh';
import {boiCanh, BoiCanh, lapLich, LichMay, mayTai} from './dao_dien';
import {datNhanKG, DiemNhan, DoanCan, HopNhan, VungAn} from './nhan';
import {cham, cheo, doDai, kep01, noi, tru} from '../3d-vector/toan3d';

// khóa màu trực quan (GeoGebra 3D trên nền tối)
export const MAU_KG = {
  khoi: '#EEF2F7', // khối gốc trắng sáng
  phu: '#8CC8FF', // nét phụ xanh dương nhạt
  keo_dai: '#8CC8FF',
  dich: '#4ADE80', // đường đích xanh lá
  giao_tuyen: '#FACC15', // giao tuyến / mặt cắt vàng
  kinh: '#FACC15',
  diem: '#EEF2F7',
  diemDung: '#FDE68A',
  chot: '#4ADE80',
  goc: '#F472B6',
  vuong: '#FACC15',
  nen: '#0E1014',
};
// v97 tối giản: nét chính dày hơn ~28 % để đọc rõ trên điện thoại nhỏ
const W_NET: Record<VaiDoan, number> = {khoi: 4.0, phu: 2.9, dich: 4.5, keo_dai: 2.4, giao_tuyen: 3.6};

export type NetVe = {id: string; x1: number; y1: number; x2: number; y2: number; mau: string; w: number; dut: boolean; op: number; sang: number; lop: 0 | 1};
export type MatVe = {id: string; d: string; mau: string; op: number; bung: boolean};
export type ChamVe = {ten: string; x: number; y: number; r: number; mau: string; khuat: boolean; op: number; sang: number};
export type GocVe = {id: string; d: string; mau: string; op: number; vuong: boolean; nhan?: {x: number; y: number; tex: string}};
export type NhanVe = HopNhan & {op: number; mau: string; khuat: boolean};
export type KhungVe = {may: TuThe; luoi: {d: string; op: number}[]; net: NetVe[]; mat: MatVe[]; cham: ChamVe[]; goc: GocVe[]; nhan: NhanVe[]; manh: ManhNet[]; truoc: boolean[]};

export type ChuanBi = {bc: BoiCanh; lich: LichMay; vo: MatVo[]; quaDiem: Map<string, string[]>};

const tren3D = (P: V3, A: V3, B: V3) => {
  const L = doDai(tru(B, A));
  return doDai(cheo(tru(B, A), tru(P, A))) / Math.max(1e-9, L) < 1e-5 * (1 + L) && cham(tru(P, A), tru(P, B)) <= 1e-9;
};

export function chuanBi(kg: KhongGianVao, W: number, H: number): ChuanBi {
  const bc = boiCanh(kg, W, H);
  const d = kg.dung;
  // đoạn đi QUA điểm (M trên SC, E trên SD...) -> hai hướng cạnh tại điểm đó (cho thuật toán khe trống của nhãn)
  const quaDiem = new Map<string, string[]>();
  for (const ten of d.nhan) {
    const ds: string[] = [];
    for (const x of d.doan) if (x.a !== ten && x.b !== ten && d.diem[x.a] && d.diem[x.b] && tren3D(d.diem[ten], d.diem[x.a], d.diem[x.b])) ds.push(x.a + '|' + x.b);
    quaDiem.set(ten, ds);
  }
  return {bc, lich: lapLich(kg, W, H), vo: bc.vo, quaDiem};
}

export type Lech = {n?: number; k?: number};

function apLech(m: TuThe, l: Lech | undefined, W: number, H: number): TuThe {
  if (!l) return m;
  const k = l.k && l.k > 0 ? l.k : 1;
  return {...m, n: m.n + (l.n || 0), k: m.k * k, ox: W / 2 + (m.ox - W / 2) * k, oy: H / 2 + (m.oy - H / 2) * k};
}

// lưới sàn Oxy mờ dưới đáy (mắt cảm nhận hướng xoay)
function luoiSan(m: TuThe, h: HeMay, bc: BoiCanh): {d: string; op: number}[] {
  const d = bc.kg.dung;
  const zs = d.khoi.dinh.map((x) => d.diem[x][2]);
  const z = Math.min(...zs) - 0.002;
  const L = Math.ceil(bc.R * 1.35), buoc = Math.max(0.5, Math.round(bc.R / 4 * 2) / 2);
  const ra: {d: string; op: number}[] = [];
  for (let i = -L; i <= L + 1e-9; i += buoc) {
    for (const truc of [0, 1]) {
      const a: V3 = truc ? [bc.muc[0] + i, bc.muc[1] - L, z] : [bc.muc[0] - L, bc.muc[1] + i, z];
      const b: V3 = truc ? [bc.muc[0] + i, bc.muc[1] + L, z] : [bc.muc[0] + L, bc.muc[1] + i, z];
      const pa = chieu(a, m, h), pb = chieu(b, m, h);
      ra.push({d: `M${pa.x.toFixed(1)},${pa.y.toFixed(1)}L${pb.x.toFixed(1)},${pb.y.toFixed(1)}`, op: 0.11 * (1 - 0.55 * Math.abs(i) / (L + 1e-6))});
    }
  }
  return ra;
}

function nhanTaiTuThe(m: TuThe, tt: ReturnType<typeof trangThai>, cb: ChuanBi, vung: VungAn): Map<string, HopNhan> {
  const h = heMay(m);
  const P = tt.diem;
  const q = new Map<string, {x: number; y: number}>();
  for (const [t, p] of Object.entries(P)) q.set(t, chieu(p, m, h));
  const doan: DoanCan[] = [];
  for (const x of tt.doan) {
    if (x.alpha * x.ve < 0.3) continue;
    const a = chieu(x.a, m, h), b = chieu(noi(x.a, x.b, x.ve), m, h);
    doan.push({x1: a.x, y1: a.y, x2: b.x, y2: b.y, a: x.tenA, b: x.tenB});
  }
  const ds: DiemNhan[] = [];
  const cham2: {x: number; y: number; r: number}[] = [];
  for (const x of tt.diemVe) {
    if (x.alpha < 0.05) continue;
    const p = q.get(x.ten)!;
    cham2.push({x: p.x, y: p.y, r: 7});
    const huong: number[] = [];
    for (const d of tt.doan) {
      if (d.alpha * d.ve < 0.3 || !d.tenA) continue;
      if (d.tenA === x.ten || d.tenB === x.ten) {
        const o = q.get(d.tenA === x.ten ? d.tenB! : d.tenA)!;
        if (Math.hypot(o.x - p.x, o.y - p.y) > 2) huong.push(Math.atan2(o.y - p.y, o.x - p.x));
      }
    }
    for (const ab of cb.quaDiem.get(x.ten) || []) {
      const [a, b] = ab.split('|');
      if (!tt.doan.some((d) => d.tenA && ((d.tenA === a && d.tenB === b) || (d.tenA === b && d.tenB === a)) && d.alpha * d.ve >= 0.3)) continue;
      for (const o of [q.get(a)!, q.get(b)!]) if (Math.hypot(o.x - p.x, o.y - p.y) > 2) huong.push(Math.atan2(o.y - p.y, o.x - p.x));
    }
    ds.push({ten: x.ten, x: p.x, y: p.y, huongCanh: huong, uuTien: (cb.bc.kg.dung.khoi.dinh.includes(x.ten) ? 1 : 2) + x.sang});
  }
  const tam = chieu(cb.bc.muc, m, h);
  const ra = datNhanKG(ds, doan, cham2, vung, tam);
  return new Map(ra.map((x) => [x.ten, x]));
}

export function veKhung(kg: KhongGianVao, cb: ChuanBi, t: number, W: number, H: number, vung: VungAn, lech?: Lech): KhungVe {
  const tt = trangThai(kg, t);
  const mt = mayTai(cb.lich, t, kg.tongGiay);
  const m = apLech(mt.m, lech, W, H);
  const h = heMay(m);
  const C = h.viTri;
  const Con = heMay(mt.on).viTri;
  const R = cb.bc.R;
  const truoc = phanLoaiMat(cb.vo, C, Con);
  const kinhHLR = tt.kinh.map((k) => ({id: k.id, p: k.p, n: k.n, op: k.op, bung: k.bung}));
  const trongMat = (ten?: string) => !!ten && !!mt.tapMat && mt.tapMat.has(ten);
  const mo = (a?: string, b?: string) => (mt.tapMat && mt.aMat > 0 ? (trongMat(a) && (b === undefined || trongMat(b)) ? 1 : 1 + (MO_NEN - 1) * mt.aMat) : 1);
  // độ sâu để cạnh xa mảnh/dịu hơn nhẹ
  const sauTam = chieu(cb.bc.muc, m, h).sau;
  const net: NetVe[] = [];
  const manhAll: ManhNet[] = [];
  for (const x of tt.doan) {
    const a = x.alpha;
    if (a <= 0.001 || x.ve <= 0.001) continue;
    const b = x.ve < 1 ? noi(x.a, x.b, x.ve) : x.b;
    const manh = tachDoan({id: x.id, a: x.a, b, vai: x.vai}, C, cb.vo, truoc, kinhHLR, R);
    manhAll.push(...manh);
    const moMat = x.vai === 'giao_tuyen' ? mo() : mo(x.tenA, x.tenB);
    for (const p of manh) {
      const pa = chieu(p.a, m, h), pb = chieu(p.b, m, h);
      const xa = kep01(((pa.sau + pb.sau) / 2 - sauTam) / R * 0.5 + 0.5);
      const w = W_NET[x.vai] * (1.06 - 0.16 * xa) * (1 + 0.25 * x.sang);
      net.push({id: x.id, x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, mau: MAU_KG[x.vai], w: p.khuat ? Math.max(1.8, w * 0.5) : w, dut: p.khuat,
        op: a * x.nm * moMat * (p.khuat ? 0.66 : 1) * (x.vai === 'khoi' && !p.khuat ? 1 - 0.12 * xa : 1), sang: x.sang, lop: p.khuat || p.sauKinh ? 0 : 1});
    }
  }
  const mat: MatVe[] = tt.kinh.map((k) => {
    const ps = k.p.map((p) => chieu(p, m, h));
    return {id: k.id, d: 'M' + ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L') + 'Z', mau: MAU_KG.kinh, op: k.op * mo(), bung: k.bung};
  });
  const cham2: ChamVe[] = [];
  for (const x of tt.diemVe) {
    if (x.alpha <= 0.001) continue;
    const p = chieu(x.p, m, h);
    const kh = diemKhuat(x.p, C, cb.vo, truoc, R);
    const laDinh = kg.dung.khoi.dinh.includes(x.ten);
    cham2.push({ten: x.ten, x: p.x, y: p.y, r: laDinh ? 5.6 : 6.4, mau: x.sang > 0.5 && !laDinh ? MAU_KG.chot : laDinh ? MAU_KG.diem : MAU_KG.diemDung, khuat: kh,
      op: x.alpha * x.nm * mo(x.ten), sang: x.sang});
  }
  const goc: GocVe[] = [];
  for (const g of tt.goc) {
    if (g.alpha <= 0.001) continue;
    const op = g.alpha * mo(g.tenDinh) * (diemKhuat(g.dinh, C, cb.vo, truoc, R) ? 0.6 : 1);
    if (g.vuong) {
      // v97 tinh tế: ô vuông góc 3D nhỏ bằng 50 % bản đầu (mảnh, không lấn cạnh)
      const kich = 0.5 * Math.min(0.17 * R, 0.24 * Math.min(doDai(tru(g.a, g.dinh)), doDai(tru(g.b, g.dinh))));
      const [p1, p2, p3] = oVuong3D(g.dinh, g.a, g.b, kich).map((p) => chieu(p, m, h));
      goc.push({id: g.id, d: `M${p1.x.toFixed(1)},${p1.y.toFixed(1)}L${p2.x.toFixed(1)},${p2.y.toFixed(1)}L${p3.x.toFixed(1)},${p3.y.toFixed(1)}`, mau: MAU_KG.vuong, op, vuong: true});
    } else {
      const r = 0.5 * Math.min(0.24 * R, 0.3 * Math.min(doDai(tru(g.a, g.dinh)), doDai(tru(g.b, g.dinh)))); // cung góc 50 %
      const ps = cungGoc3D(g.dinh, g.a, g.b, r).map((p) => chieu(p, m, h));
      const giua = cungGoc3D(g.dinh, g.a, g.b, r * 2.3, 2)[1]; // nhãn ngay ngoài cung nhỏ
      const q = chieu(giua, m, h);
      goc.push({id: g.id, d: 'M' + ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L'), mau: MAU_KG.goc, op, vuong: false,
        nhan: g.nhan ? {x: q.x, y: q.y, tex: g.nhan} : undefined});
    }
  }
  // nhãn: nghiệm ở tư thế ổn định; đang xoay -> nội suy độ lệch giữa nghiệm ở tư thế đầu và tư thế đích (không giật chữ)
  let lechNhan: Map<string, HopNhan>;
  const x = mt.i >= 0 ? cb.lich.moc[mt.i] : null;
  if (mt.dangXoay && x) {
    const A = nhanTaiTuThe(apLech(x.A, lech, W, H), tt, cb, vung), B = nhanTaiTuThe(apLech(x.B, lech, W, H), tt, cb, vung);
    lechNhan = new Map();
    for (const [ten, a] of A) {
      const b = B.get(ten) || a;
      // nội suy theo GÓC + độ dài (đường vòng quanh điểm, không cắt ngang qua điểm)
      const ga = Math.atan2(a.dy, a.dx), gb = Math.atan2(b.dy, b.dx);
      let dg = gb - ga;
      while (dg > Math.PI) dg -= 2 * Math.PI;
      while (dg < -Math.PI) dg += 2 * Math.PI;
      const g = ga + dg * mt.u, L = Math.hypot(a.dx, a.dy) + (Math.hypot(b.dx, b.dy) - Math.hypot(a.dx, a.dy)) * mt.u;
      lechNhan.set(ten, {...a, dx: Math.cos(g) * L, dy: Math.sin(g) * L});
    }
  } else lechNhan = nhanTaiTuThe(apLech(mt.on, lech, W, H), tt, cb, vung);
  const nhan: NhanVe[] = [];
  for (const c of cham2) {
    const l = lechNhan.get(c.ten);
    if (!l) continue;
    nhan.push({...l, x: c.x + l.dx, y: c.y + l.dy, op: c.op, mau: c.mau === MAU_KG.chot ? MAU_KG.chot : '#F5F7FA', khuat: c.khuat});
  }
  return {may: m, luoi: luoiSan(m, h, cb.bc), net, mat, cham: cham2, goc, nhan, manh: manhAll, truoc};
}

export const noiMay = noiTuThe;
