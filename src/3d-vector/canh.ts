// v90 — NGỮ CẢNH CẢNH tại một thời điểm: trạng thái hiện/ẩn, nhấn mạnh, hành động (trượt điểm, gập mặt, tách vector)
// và bộ giải tham chiếu điểm ("A", "khung.dinh[4]", "cau1.tam", tọa độ). Hàm thuần của (đặc tả, t) -> chạy song song an toàn.
import {Canh3DV, DoiTuong, HanhDong, Manh, ThamChieu, V3, VatChe} from './kieu';
import {catmullRom, chuan, coSoMatPhang, cong, diemTheoDoDai, emRa, emVaoRa, kep01, nhan, quayQuanhTruc, RAD, tru, trungBinh} from './toan3d';
import {phanTichBieuThuc} from '../sankhau/bieuthuc';
import {dungKhoi} from './khoi';

const THOI_HIEN = 0.6; // giây: vật xuất hiện (vẽ dần)
const THOI_NHAN = 0.4; // giây: chuyển nhấn mạnh

export class NguCanh {
  readonly t: number;
  readonly camPos: V3 | null;
  readonly bo: boolean; // true = bỏ qua hiện/ẩn (dùng cho khung tự động)
  private dt = new Map<string, DoiTuong>();
  private ten = new Map<string, {id: string; i: number}>(); // tên đỉnh -> (vật, chỉ số)
  private memoDinh = new Map<string, V3[]>();
  private memoDiem = new Map<string, V3>();
  private dang = new Set<string>();
  private tHien = new Map<string, number>();
  private tAn = new Map<string, number>();
  private nhanTruoc = new Set<string>();
  private nhanNay = new Set<string>();
  private aNhan = 1;

  constructor(readonly canh: Canh3DV, t: number, camPos: V3 | null, boQuaHien = false) {
    this.t = t;
    this.camPos = camPos;
    this.bo = boQuaHien;
    for (const d of canh.doiTuong) {
      this.dt.set(d.id, d);
      (d.tenDinh || []).forEach((tn, i) => tn && !this.ten.has(tn) && this.ten.set(tn, {id: d.id, i}));
    }
    // thời điểm hiện / ẩn: vật không được bước nào "hien" thì có từ đầu
    const nhacHien = new Set<string>();
    for (const b of canh.buoc) for (const id of b.hien) nhacHien.add(this.ten.get(id)?.id ?? id);
    for (const d of canh.doiTuong) if (!nhacHien.has(d.id)) this.tHien.set(d.id, -1);
    for (const b of canh.buoc) {
      for (const id0 of b.hien) {
        const id = this.ten.get(id0)?.id ?? id0;
        if (!this.tHien.has(id)) this.tHien.set(id, b.t);
      }
      for (const id0 of b.an) {
        const id = this.ten.get(id0)?.id ?? id0;
        if ((this.tHien.get(id) ?? Infinity) <= b.t && !this.tAn.has(id)) this.tAn.set(id, b.t);
      }
    }
    // nhấn mạnh: bước hiện tại so với bước trước (chuyển mềm)
    let iNay = -1;
    canh.buoc.forEach((b, i) => b.t <= t && (iNay = i));
    const lay = (i: number) => new Set((i >= 0 ? canh.buoc[i].nhanManh : []).map((x) => this.ten.get(x)?.id ?? x));
    this.nhanNay = lay(iNay);
    this.nhanTruoc = lay(iNay - 1);
    this.aNhan = iNay >= 0 ? emVaoRa((t - canh.buoc[iNay].t) / THOI_NHAN) : 1;
  }

  doiTuong(id: string) {
    return this.dt.get(id);
  }

  // 0..1: vật đang hiện tới đâu (vẽ dần lúc vào, mờ dần lúc bị ẩn). tre: trễ thêm (giây) cho phần tử con.
  alpha(id: string, tre = 0): number {
    if (this.bo) return 1;
    const th = this.tHien.get(id);
    if (th === undefined) return 0;
    const vao = th < 0 ? 1 : emRa((this.t - th - tre) / THOI_HIEN);
    const ta = this.tAn.get(id);
    const ra = ta === undefined ? 1 : 1 - kep01((this.t - ta) / 0.4);
    return Math.max(0, Math.min(vao, ra));
  }

  // hệ số độ đục do nhấn mạnh (vật khác bị làm mờ) và mức sáng (vật được nhấn mạnh)
  private muc(tap: Set<string>, id: string) {
    if (!tap.size) return {op: 1, sang: 0};
    return tap.has(id) ? {op: 1, sang: 1} : {op: 0.32, sang: 0};
  }
  doDuc(id: string): number {
    if (this.bo) return 1;
    const a = this.muc(this.nhanTruoc, id), b = this.muc(this.nhanNay, id);
    return a.op + (b.op - a.op) * this.aNhan;
  }
  sang(id: string): number {
    if (this.bo) return 0;
    const a = this.muc(this.nhanTruoc, id), b = this.muc(this.nhanNay, id);
    return a.sang + (b.sang - a.sang) * this.aNhan;
  }

  /* ---- hành động ---- */
  private hanhDongCua(vat: string, loai: HanhDong['loai']): HanhDong[] {
    const ds: HanhDong[] = [];
    for (const b of this.canh.buoc) for (const h of b.hanhDong) if (h.vat === vat && h.loai === loai) ds.push(h);
    return ds.sort((a, b) => a.t - b.t);
  }
  // giá trị tham số theo chuỗi hành động nối tiếp (mỗi hành động đi từ `tu` — hoặc giá trị đang có — tới `den`)
  private giaTri(vat: string, loai: HanhDong['loai'], goc: number): number {
    let v = goc;
    for (const h of this.hanhDongCua(vat, loai)) {
      if (this.t < h.t) break;
      const tu = h.tu !== undefined && isFinite(h.tu) ? h.tu : v;
      const den = h.den ?? v;
      v = tu + (den - tu) * emVaoRa((this.t - h.t) / h.d);
    }
    return v;
  }
  thamSoTruot(id: string, goc: number) {
    return this.giaTri(id, 'truot_diem', goc);
  }
  gocGap(id: string, goc: number) {
    return this.giaTri(id, 'gap_mat', goc);
  }
  tienTach(id: string): number {
    const ds = this.hanhDongCua(id, 'tach_vector');
    if (!ds.length || this.t < ds[0].t) return 0;
    return emVaoRa((this.t - ds[0].t) / ds[0].d);
  }

  /* ---- giải tham chiếu ---- */
  giai(ref: ThamChieu | undefined): V3 {
    if (!ref) return [0, 0, 0];
    if (Array.isArray(ref)) return ref;
    const nho = this.memoDiem.get(ref);
    if (nho) return nho;
    if (this.dang.has(ref)) return [0, 0, 0]; // vòng tham chiếu -> bỏ
    this.dang.add(ref);
    const p = this.giaiMoi(ref);
    this.dang.delete(ref);
    this.memoDiem.set(ref, p);
    return p;
  }

  private giaiMoi(ref: string): V3 {
    const tn = this.ten.get(ref);
    if (tn) return this.dinhCua(tn.id)[tn.i] ?? [0, 0, 0];
    const m = /^([^.\s]+)\.(dinh|diem)\[(\d+)\]$/.exec(ref);
    if (m) return this.dinhCua(m[1])[Number(m[3])] ?? [0, 0, 0];
    const m2 = /^([^.\s]+)\.(tam|tam_tren|tam_day|dinh|cuoi|dau)$/.exec(ref);
    if (m2) return this.moc(m2[1], m2[2]);
    const d = this.dt.get(ref);
    if (d && d.loai === 'diem') {
      if (d.tren) {
        const duong = this.duongCua(d.tren.duong);
        return diemTheoDoDai(duong, this.thamSoTruot(d.id, d.tren.t));
      }
      return d.toaDo ?? [0, 0, 0];
    }
    if (d) return this.moc(d.id, 'tam');
    return [0, 0, 0];
  }

  private moc(id: string, loai: string): V3 {
    const d = this.dt.get(id);
    if (!d) return [0, 0, 0];
    const ds = this.dinhCua(id);
    if (d.loai === 'hinh_hop') {
      if (loai === 'tam_tren') return trungBinh(ds.slice(4, 8));
      if (loai === 'tam_day') return trungBinh(ds.slice(0, 4));
      return d.tam!;
    }
    if (d.loai === 'hinh_tru' || d.loai === 'hinh_non') {
      if (loai === 'tam_day') return ds[0];
      if (loai === 'tam_tren' || loai === 'dinh') return ds[1];
      return trungBinh(ds);
    }
    if (d.loai === 'hinh_chop') {
      if (loai === 'dinh') return ds[ds.length - 1];
      if (loai === 'tam_day') return trungBinh(ds.slice(0, -1));
      return trungBinh(ds);
    }
    if (d.loai === 'doan_thang' || d.loai === 'vector' || d.loai === 'duong_cong') {
      const l = this.duongCua(id);
      if (loai === 'dau') return l[0] ?? [0, 0, 0];
      if (loai === 'cuoi') return l[l.length - 1] ?? [0, 0, 0];
      return diemTheoDoDai(l, 0.5);
    }
    if (d.loai === 'mat_cau' || d.loai === 'nhom_lap') return d.tam!;
    if (d.loai === 'goc') return this.giai(d.dinhGoc);
    return trungBinh(ds.length ? ds : [[0, 0, 0]]);
  }

  // Các đỉnh của vật (sau hành động). Hộp: 0-3 đáy, 4-7 nắp. Trụ/nón: [tâm đáy, tâm trên/đỉnh]. Chóp: đáy..., đỉnh.
  dinhCua(id: string): V3[] {
    const nho = this.memoDinh.get(id);
    if (nho) return nho;
    const d = this.dt.get(id);
    let ds: V3[] = [];
    if (d) {
      this.memoDinh.set(id, []); // chặn vòng
      if (d.loai === 'hinh_hop') {
        const [cx, cy, cz] = d.tam!;
        const [a, b, c] = d.kichThuoc!.map((x) => x / 2);
        const goc: [number, number][] = [[-a, -b], [a, -b], [a, b], [-a, b]];
        ds = [...goc.map(([x, y]): V3 => [cx + x, cy + y, cz - c]), ...goc.map(([x, y]): V3 => [cx + x, cy + y, cz + c])];
      } else if (d.loai === 'hinh_tru' || d.loai === 'hinh_non') {
        const o = this.giai(d.day);
        ds = [o, cong(o, [0, 0, d.cao!])];
      } else if (d.loai === 'hinh_chop') {
        ds = [...d.dayDa!.map((p) => this.giai(p)), this.giai(d.dinh)];
      } else if (d.loai === 'da_giac') {
        ds = d.diem!.map((p) => this.giai(p));
        if (d.banLe) {
          const g = this.gocGap(d.id, d.gocGap ?? 0);
          if (Math.abs(g) > 1e-6) {
            const A = this.giai(d.banLe[0]);
            const k = chuan(tru(this.giai(d.banLe[1]), A));
            // chiều gập: phía làm trọng tâm mặt đi LÊN (gập tấm bìa thành hộp)
            const thu = trungBinh(ds.map((p) => quayQuanhTruc(p, A, k, 5 * RAD)));
            const dau = thu[2] >= trungBinh(ds)[2] ? 1 : -1;
            ds = ds.map((p) => quayQuanhTruc(p, A, k, dau * g * RAD));
          }
        }
      } else if (d.loai === 'diem') {
        ds = [this.giai(d.id)];
      } else if (d.loai === 'mat_cau') {
        ds = [d.tam!];
      } else {
        ds = this.duongCua(id);
      }
    }
    this.memoDinh.set(id, ds);
    return ds;
  }

  // Đường gấp khúc của vật (dùng cho trượt điểm "tren" và vẽ).
  duongCua(id: string): V3[] {
    const d = this.dt.get(id);
    if (!d) return [];
    if (d.loai === 'doan_thang' || d.loai === 'vector') return [this.giai(d.tu), this.giai(d.den)];
    if (d.loai === 'da_giac' || d.loai === 'hinh_chop') {
      const ds = d.loai === 'da_giac' ? this.dinhCua(id) : this.dinhCua(id).slice(0, -1);
      return [...ds, ds[0]];
    }
    if (d.loai === 'duong_cong') return duongCong(d, this);
    if (d.loai === 'mat_cau') {
      const r = d.banKinh!, o = d.tam!;
      return Array.from({length: 49}, (_, i): V3 => [o[0] + r * Math.cos((i / 48) * 2 * Math.PI), o[1] + r * Math.sin((i / 48) * 2 * Math.PI), o[2]]);
    }
    return [];
  }
}

function duongCong(d: DoiTuong, ctx: NguCanh): V3[] {
  if (d.diem) {
    const ds = d.diem.map((p) => ctx.giai(p));
    return d.muot && ds.length >= 3 ? catmullRom(ds, 12, !!d.kin) : d.kin ? [...ds, ds[0]] : ds;
  }
  if (d.ham) {
    // biến tham số t: đổi thành x để dùng bộ phân tích biểu thức an toàn sẵn có
    const doi = (s: string) => s.replace(/(?<![a-z])t(?![a-z])/gi, 'x');
    const fx = phanTichBieuThuc(doi(d.ham.x)), fy = phanTichBieuThuc(doi(d.ham.y)), fz = phanTichBieuThuc(doi(d.ham.z));
    if (!fx || !fy || !fz) return [];
    const [a, b] = d.ham.t;
    const ra: V3[] = [];
    for (let i = 0; i <= 96; i++) {
      const u = a + ((b - a) * i) / 96;
      const p: V3 = [fx(u), fy(u), fz(u)];
      if (p.every((x) => isFinite(x))) ra.push(p);
    }
    return ra;
  }
  if (d.cung) {
    const o = ctx.giai(d.cung.tam);
    const [u, v] = coSoMatPhang(d.cung.phap);
    const n = Math.max(8, Math.round(Math.abs(d.cung.den - d.cung.tu) / 5));
    return Array.from({length: n + 1}, (_, i) => {
      const a = (d.cung!.tu + ((d.cung!.den - d.cung!.tu) * i) / n) * RAD;
      return cong(o, cong(nhan(u, d.cung!.banKinh * Math.cos(a)), nhan(v, d.cung!.banKinh * Math.sin(a))));
    });
  }
  return [];
}

export type KetQuaCanh = {manh: Manh[]; che: VatChe[]};

// Dựng toàn bộ mảnh vẽ của cảnh tại thời điểm t (chưa chiếu). camPos dùng cho đường viền (bóng) cầu/trụ/nón.
export function dungCanh(canh: Canh3DV, t: number, camPos: V3 | null, boQuaHien = false): KetQuaCanh {
  const ctx = new NguCanh(canh, t, camPos, boQuaHien);
  const manh: Manh[] = [];
  const che: VatChe[] = [];
  for (const d of canh.doiTuong) {
    const a = ctx.alpha(d.id);
    if (a <= 0.001) continue;
    dungKhoi(d, ctx, a, manh, che);
  }
  return {manh, che};
}
