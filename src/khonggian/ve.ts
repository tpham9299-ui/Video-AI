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
import {BAT_QUET_MAT_PHANG_KG, BAT_XUNG_NHIP_DIEM, DO_MO_CANH_PHU_KG} from '../khung4tang/cauHinhTinhChinh';

// v101.2: phân cấp 3 tầng nét — trọng tâm (hổ phách, dày) | khung khối (trắng xanh dịu) | khuất + đường phụ (mảnh, mờ)
const MAU_TAM = '#FBBF24';
const MAU_KHUNG = '#D6E6F7';
const NET_PHU = new Set<string>(['phu', 'keo_dai', 'gion', 'gion_phu']);

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
  // v98 Lego
  truc: '#A3ADBD',
  truc_vach: '#6B7585',
  gion: '#FACC15',
  gion_phu: '#FACC15',
  cong: '#34D399',
  vector: '#38BDF8',
  luoi: '#8CC8FF',
};
// v97 tối giản: nét chính dày hơn ~28 % để đọc rõ trên điện thoại nhỏ
const W_NET: Record<VaiDoan, number> = {khoi: 4.0, phu: 2.9, dich: 4.5, keo_dai: 2.4, giao_tuyen: 3.6, truc: 2.2, truc_vach: 1.8, gion: 2.2, gion_phu: 1.3, cong: 3.4, vector: 3.8, luoi: 1.5};

export type NetVe = {id: string; x1: number; y1: number; x2: number; y2: number; mau: string; w: number; dut: boolean; op: number; sang: number; lop: 0 | 1};
// v101.2: act = độ "đang giảng" 0..1 (nhấn mạnh / mới bung); quet = tiến độ dải sáng 0..1 (-1: tắt); bb = hộp bao cho dải sáng
export type MatVe = {id: string; d: string; mau: string; op: number; bung: boolean; act?: number; quet?: number; bb?: [number, number, number, number]};
export type ChamVe = {ten: string; x: number; y: number; r: number; mau: string; khuat: boolean; op: number; sang: number; song?: number};
export type GocVe = {id: string; d: string; mau: string; op: number; vuong: boolean; nhan?: {x: number; y: number; tex: string}};
export type NhanVe = HopNhan & {op: number; mau: string; khuat: boolean};
// v98: mũi tên (vector / trục / đường gióng), nhãn tự do (số đo, tên trục, hướng), số đọc trực tiếp khi trượt tối ưu, mặt khối tô
export type MuiVe = {x: number; y: number; goc: number; mau: string; op: number; co: number};
export type NhanTuVe = {id: string; x: number; y: number; tex: string; mau: string; op: number; co: number; chu: boolean};
export type KhungVe = {may: TuThe; luoi: {d: string; op: number}[]; net: NetVe[]; mat: MatVe[]; cham: ChamVe[]; goc: GocVe[]; nhan: NhanVe[]; manh: ManhNet[]; truoc: boolean[];
  mui: MuiVe[]; nhanTu: NhanTuVe[]; to: MatVe[]};

export type ChuanBi = {bc: BoiCanh; lich: LichMay; vo: MatVo[]; quaDiem: Map<string, string[]>; batDauMat: number[]};

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
  // chỉ số mặt đầu tiên của từng khối Lego trong bc.vo (đường viền: so mặt trước/sau theo chỉ số cục bộ)
  const batDauMat: number[] = [];
  if (d.khoiDs) {
    let k = 0;
    d.khoiDs.forEach((x) => {
      const ok = x.mat.length > 0 && x.mat.every((f) => f.every((tn) => d.diem[tn]));
      batDauMat.push(ok ? k : -1);
      if (ok) k += x.mat.length;
    });
  }
  return {bc, lich: lapLich(kg, W, H), vo: bc.vo, quaDiem, batDauMat};
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
  if (d.lego && d.kinh.some((k) => k.san)) return []; // v98: đã có mặt sàn Oxy bán trong suốt
  const zs = (d.khoi.dinh.length ? d.khoi.dinh : Object.keys(d.diem)).map((x) => d.diem[x][2]);
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
    ds.push({ten: x.ten, x: p.x, y: p.y, huongCanh: huong, uuTien: (cb.bc.kg.dung.khoi.dinh.includes(x.ten) ? 1 : 2) + x.sang, chu: cb.bc.kg.dung.nhanTen?.[x.ten]});
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
  const mui: MuiVe[] = [];
  const dsDoan = [...tt.doan];
  // v101.2: độ "đang giảng" của từng mặt phẳng (nhấn mạnh hoặc mới hiện ~1,5 s) -> dịu cạnh phụ + dải sáng quét
  const hienKG = kg.hien || {};
  const actMat = tt.kinh.map((k) => {
    if (k.san) return {act: 0, quet: -1};
    const th = hienKG[k.id] ?? hienKG[k.id.split('#')[0]];
    const moi = th !== undefined && t >= th ? 1 - kep01((t - th - 0.9) / 0.6) : 0;
    const q = th !== undefined && BAT_QUET_MAT_PHANG_KG ? (t - th - 0.3) / (16 / 30) : -1;
    return {act: Math.max(k.sang || 0, moi), quet: q > 0 && q < 1 ? q : -1};
  });
  const actMax = actMat.reduce((s2, x) => Math.max(s2, x.act), 0);
  // v98: đường viền khối cong (đường sinh biên của trụ / nón, viền cầu): cạnh giữa mặt trước và mặt sau, tính lại mỗi khung
  const d0 = kg.dung;
  if (d0.khoiDs) {
    d0.khoiDs.forEach((k, ki) => {
      const off = cb.batDauMat[ki];
      if (off < 0 || !k.vien.length) return;
      const thk = (kg.hien || {})[k.id];
      const a = thk === undefined ? 1 : kep01((t - thk) / 0.6);
      if (a <= 0.001) return;
      const nmK = tt.doan.find((x) => x.id.startsWith(k.id + ':'))?.nm ?? 1;
      for (const [ta, tb, fi, fj] of k.vien) {
        if (truoc[off + fi] === truoc[off + fj] || !tt.diem[ta] || !tt.diem[tb]) continue;
        dsDoan.push({id: k.id + ':v', a: tt.diem[ta], b: tt.diem[tb], vai: 'khoi', tenA: ta, tenB: tb, key: k.id, alpha: a, ve: 1, nm: nmK, sang: 0, mau: k.mau});
      }
    });
  }
  for (const x of dsDoan) {
    const a = x.alpha;
    if (a <= 0.001 || x.ve <= 0.001) continue;
    const b = x.ve < 1 ? noi(x.a, x.b, x.ve) : x.b;
    const manh = tachDoan({id: x.id, a: x.a, b, vai: x.vai}, C, cb.vo, truoc, kinhHLR, R);
    manhAll.push(...manh);
    const moMat = x.vai === 'giao_tuyen' ? mo() : mo(x.tenA, x.tenB);
    const tamN = x.vai === 'giao_tuyen' || x.sang > 0.5; // tầng trọng tâm
    const phuN = NET_PHU.has(x.vai) && !tamN;
    const mauNet = x.mau || (tamN && (x.vai === 'khoi' || x.vai === 'phu' || x.vai === 'keo_dai') ? MAU_TAM : x.vai === 'khoi' ? MAU_KHUNG : MAU_KG[x.vai] || MAU_KG.phu);
    const lego = !!kg.dung.lego;
    // dịu cạnh phụ / khung khi có mặt phẳng đang giảng; đường phụ đã xong ở bước trước còn ~0,25
    const diu = tamN ? 1 : phuN ? 1 - (1 - DO_MO_CANH_PHU_KG) * actMax : x.vai === 'khoi' ? 1 - (1 - DO_MO_CANH_PHU_KG) * 0.5 * actMax : 1;
    const phuCu = phuN && x.nm < 0.99 ? 0.72 : 1;
    for (const p of manh) {
      const pa = chieu(p.a, m, h), pb = chieu(p.b, m, h);
      const xa = kep01(((pa.sau + pb.sau) / 2 - sauTam) / R * 0.5 + 0.5);
      const ds = 1.03 - 0.1 * xa;
      const w = tamN ? (3.6 + 0.8 * Math.max(x.sang, x.vai === 'giao_tuyen' ? 1 : 0)) * ds
        : x.vai === 'khoi' ? 2.5 * ds : phuN ? 1.5 : W_NET[x.vai] * (1.06 - 0.16 * xa) * (1 + 0.25 * x.sang);
      const dut = p.khuat || !!x.dut;
      // v98: phần nằm DƯỚI sàn Oxy (sau mặt sàn bán trong suốt) dịu đi -> mắt thấy rõ miền z < 0
      const sauSan = lego && p.sauKinh ? 0.62 : 1;
      net.push({id: x.id, x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, mau: mauNet, w: p.khuat ? 1.5 : x.dut && !tamN ? Math.min(w * 0.7, phuN ? 1.5 : w) : w, dut,
        op: a * x.nm * moMat * sauSan * (p.khuat ? 0.42 : 1) * diu * phuCu * (x.vai === 'khoi' && !p.khuat ? 1 - 0.12 * xa : 1), sang: x.sang, lop: p.khuat || p.sauKinh ? 0 : 1});
    }
    // mũi tên ở đầu mút (đoạn vẽ xong mới có mũi)
    if (x.mui && x.ve > 0.96 && manh.length) {
      const pa = chieu(x.a, m, h), pb = chieu(b, m, h);
      const goc2 = Math.atan2(pb.y - pa.y, pb.x - pa.x);
      const co = x.vai === 'truc' ? 15 : x.vai === 'gion' ? 11 : 17;
      mui.push({x: pb.x, y: pb.y, goc: goc2, mau: mauNet, op: a * x.nm * (manh[manh.length - 1].khuat ? 0.6 : 1), co});
      if (x.mui === 'hai') mui.push({x: pa.x, y: pa.y, goc: goc2 + Math.PI, mau: mauNet, op: a * x.nm * (manh[0].khuat ? 0.6 : 1), co});
    }
  }
  const mat: MatVe[] = tt.kinh.map((k, ki) => {
    const ps = k.p.map((p) => chieu(p, m, h));
    const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
    return {id: k.id, d: 'M' + ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L') + 'Z', mau: /^#/.test(k.mau) ? k.mau : MAU_KG.kinh, op: k.op * mo(), bung: k.bung,
      act: actMat[ki].act, quet: actMat[ki].quet, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]};
  });
  // v98: mặt trước của khối Lego tô rất nhẹ theo ánh sáng (đặc khối; vẽ dưới lớp nét nên không che nét khuất)
  const to: MatVe[] = [];
  if (d0.khoiDs) {
    const Lg: V3 = [0.35, -0.55, 0.76];
    d0.khoiDs.forEach((k, ki) => {
      const off = cb.batDauMat[ki];
      if (off < 0 || !k.to) return;
      const thk = (kg.hien || {})[k.id];
      const a = thk === undefined ? 1 : kep01((t - thk) / 0.6);
      if (a <= 0.001) return;
      const nmK = tt.doan.find((x) => x.id.startsWith(k.id + ':'))?.nm ?? 1;
      for (let i = 0; i < k.mat.length; i++) {
        if (!truoc[off + i]) continue;
        const f = cb.vo[off + i];
        const sang = Math.max(0, cham(f.n, Lg));
        const ps = f.p.map((p) => chieu(p, m, h));
        to.push({id: k.id + '#' + i, d: 'M' + ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L') + 'Z', mau: k.mau, op: a * nmK * (0.05 + 0.13 * sang), bung: false});
      }
    });
  }
  const cham2: ChamVe[] = [];
  // v101.2: điểm mới hiện ở bước này phát 1 nhịp vòng sóng (~18 frame = 0,6 s) rồi tắt
  const songDiem = (ten: string) => {
    const th = hienKG[ten];
    if (!BAT_XUNG_NHIP_DIEM || th === undefined) return -1;
    const q = (t - th - 0.15) / 0.6;
    return q > 0 && q < 1 ? q : -1;
  };
  for (const x of tt.diemVe) {
    if (x.alpha <= 0.001) continue;
    const p = chieu(x.p, m, h);
    const kh = diemKhuat(x.p, C, cb.vo, truoc, R);
    const laDinh = kg.dung.khoi.dinh.includes(x.ten);
    const mauRieng = kg.dung.mauDiem?.[x.ten];
    cham2.push({ten: x.ten, x: p.x, y: p.y, r: laDinh ? 5.6 : 6.4, mau: x.sang > 0.5 && !laDinh ? MAU_KG.chot : mauRieng || (laDinh ? MAU_KG.diem : MAU_KG.diemDung), khuat: kh,
      op: x.alpha * x.nm * mo(x.ten), sang: x.sang, song: songDiem(x.ten)});
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
  // v98: nhãn tự do (số đo đường gióng, tên trục, hướng) + số đọc trực tiếp khi trượt điểm tối ưu
  const nhanTu: NhanTuVe[] = [];
  const hienD = kg.hien || {};
  for (const x of kg.dung.nhanTu || []) {
    const th = x.hien !== undefined ? hienD[x.hien] : hienD[x.id];
    const a = th === undefined ? 1 : kep01((t - th - 0.25) / 0.5);
    if (a <= 0.001) continue;
    const p = chieu(x.p, m, h);
    const nmX = x.hien && kg.nhanManh?.length ? (tt.doan.find((d) => d.id === x.hien || d.nhom === x.hien)?.nm ?? 1) : 1;
    nhanTu.push({id: x.id, x: p.x, y: p.y, tex: x.tex, mau: x.mau, op: a * nmX * mo(), co: x.co || 26, chu: !!x.chu});
  }
  for (const c of kg.chuyen || []) {
    if (!c.doc || !c.moc.length || !tt.diem[c.diem]) continue;
    const t0 = c.moc[0].t, t1 = c.moc[c.moc.length - 1].t;
    const a = kep01((t - t0) / 0.3) * (1 - kep01((t - t1 - 3.5) / 0.5));
    if (a <= 0.001) continue;
    const v = c.doc.ds.reduce((s2, x) => s2 + (tt.diem[x] ? doDai(tru(tt.diem[x], tt.diem[c.diem])) : 0), 0) * c.doc.heSo;
    const so = (v >= 100 ? v.toFixed(0) : v.toFixed(2)).replace('.', '{,}');
    // số đọc đặt cố định ở đáy sân khấu (không đè nhãn điểm trượt)
    const ten = c.doc.ds.map((x, i) => (i === 0 ? x + c.diem : c.diem + x)).join(' + ');
    nhanTu.push({id: 'doc_' + c.diem, x: W / 2, y: H - 40, tex: ten + ' = ' + so + (c.doc.dv ? '\\,\\text{' + c.doc.dv + '}' : ''),
      mau: '#FACC15', op: a, co: 30, chu: false});
  }
  return {may: m, luoi: luoiSan(m, h, cb.bc), net, mat, cham: cham2, goc, nhan, manh: manhAll, truoc, mui, nhanTu, to};
}

export const noiMay = noiTuThe;
