import {hopLeSanKhau} from './sankhau/dulieu';
// Kiểm tra dữ liệu minh họa do AI sinh ra và tính bố cục hình. Không phụ thuộc React để dễ kiểm thử.
// Nguyên tắc: dữ liệu sai dạng thì bỏ qua (trả null) chứ không làm hỏng cả video.

const s = (v: unknown, max = 36): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' && isFinite(v) ? String(v) : '';
const laMang = (v: unknown): v is unknown[] => Array.isArray(v);
const laDoiTuong = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/* ---------------- Sơ đồ cây ---------------- */

export type Nut = {nhan: string; xs: string; con: Nut[]; mau: string; kq: string; to: boolean};
export type DuLieuCay = {goc: string; nhanh: Nut[]};

function nut(v: unknown, sau: number): Nut | null {
  if (!laDoiTuong(v)) return null;
  const nhan = s(v.nhan, 30);
  if (!nhan) return null;
  const con: Nut[] = [];
  if (sau < 3 && laMang(v.con)) {
    for (const c of v.con.slice(0, 4)) {
      const n = nut(c, sau + 1);
      if (n) con.push(n);
    }
  }
  return {nhan, xs: s(v.xs, 30), con, mau: tenMau(v.mau), kq: s(v.kq, 40), to: v.to === true};
}

function demLa(n: Nut): number {
  return n.con.length ? n.con.reduce((t, c) => t + demLa(c), 0) : 1;
}
function sauNhat(n: Nut): number {
  return n.con.length ? 1 + Math.max(...n.con.map(sauNhat)) : 0;
}

export function hopLeCay(d: unknown): DuLieuCay | null {
  if (!laDoiTuong(d) || !laMang(d.nhanh)) return null;
  let nhanh = d.nhanh
    .slice(0, 4)
    .map((x) => nut(x, 1))
    .filter((x): x is Nut => x !== null);
  if (!nhanh.length) return null;
  // Quá nhiều lá thì không đủ chỗ trên màn hình dọc: bỏ tầng sâu nhất.
  const goc: Nut = {nhan: '', xs: '', con: nhanh, mau: '', kq: '', to: false};
  if (demLa(goc) > 8) nhanh = nhanh.map((n) => ({...n, con: []}));
  return {goc: s(d.goc, 30) || 'Bắt đầu', nhanh};
}

export type NutVe = {id: number; x: number; y: number; sau: number; nhan: string; mau: string; kq: string; la: boolean; thuTu: number};
export type CanhVe = {tu: number; den: number; xs: string; sau: number; mau: string; thuTu: number};
export type CayBoCuc = {nut: NutVe[]; canh: CanhVe[]; sauMax: number; soDuong: number};

// Bố cục cây. Màu nhánh: của nút, nếu không có thì thừa hưởng từ nút cha. Nút có "to": true là ĐÍCH của một đường đi được tô sáng;
// thuTu = thứ tự tô sáng (0, 1, 2...) của đường đi đầu tiên đi qua nút/nhánh đó, -1 nếu không nằm trên đường nào.
export function bocucCay(d: DuLieuCay, W: number, H: number, rongNut = 150): CayBoCuc {
  const goc: Nut = {nhan: d.goc, xs: '', con: d.nhanh, mau: '', kq: '', to: false};
  const tongLa = demLa(goc);
  const sauMax = Math.max(1, sauNhat(goc));
  const nuts: NutVe[] = [];
  const canhs: CanhVe[] = [];
  let chiSoLa = 0;
  let dem = 0;

  const dat = (n: Nut, sau: number, cha: number, mauCha: string): {id: number; thuTu: number} => {
    const id = nuts.length;
    const mau = n.mau || mauCha;
    const ve: NutVe = {id, x: rongNut / 2 + (sau * (W - rongNut)) / sauMax, y: 0, sau, nhan: n.nhan, mau, kq: n.kq, la: !n.con.length, thuTu: -1};
    nuts.push(ve);
    let canhIdx = -1;
    if (cha >= 0) {
      canhIdx = canhs.length;
      canhs.push({tu: cha, den: id, xs: n.xs, sau, mau, thuTu: -1});
    }
    let thuTu = -1;
    if (n.to) thuTu = dem++;
    if (!n.con.length) {
      ve.y = ((chiSoLa + 0.5) / tongLa) * H;
      chiSoLa++;
    } else {
      const kq = n.con.map((c) => dat(c, sau + 1, id, mau));
      const ys = kq.map((k) => nuts[k.id].y);
      ve.y = (Math.min(...ys) + Math.max(...ys)) / 2;
      const co = kq.map((k) => k.thuTu).filter((x) => x >= 0);
      if (co.length) thuTu = thuTu >= 0 ? Math.min(thuTu, ...co) : Math.min(...co);
    }
    ve.thuTu = thuTu;
    if (canhIdx >= 0) canhs[canhIdx].thuTu = thuTu;
    return {id, thuTu};
  };
  dat(goc, 0, -1, '');
  return {nut: nuts, canh: canhs, sauMax, soDuong: dem};
}

/* ---------------- Bảng ---------------- */

export type DuLieuBang = {cot: string[]; hang: string[][]};

export function hopLeBang(d: unknown): DuLieuBang | null {
  if (!laDoiTuong(d) || !laMang(d.cot) || !laMang(d.hang)) return null;
  const cot = d.cot.slice(0, 5).map((x) => s(x, 28));
  if (!cot.length || cot.every((c) => !c)) return null;
  const hang = d.hang
    .slice(0, 6)
    .filter(laMang)
    .map((r) => cot.map((_, j) => s(r[j], 34)));
  if (!hang.length) return null;
  return {cot, hang};
}

/* ---------------- Venn ---------------- */

export type VungVenn = 'chiA' | 'giao' | 'chiB' | 'ngoai';
export type DuLieuVenn = {
  A: string;
  B: string;
  chiA: string;
  giao: string;
  chiB: string;
  ngoai: string;
  to: VungVenn[];
  mauA: string;
  mauB: string;
  dem: Record<VungVenn, number>; // số phần tử trong mỗi vùng: máy vẽ các chấm và đếm dần
};
const CAC_VUNG: VungVenn[] = ['chiA', 'giao', 'chiB', 'ngoai'];

export function hopLeVenn(d: unknown): DuLieuVenn | null {
  if (!laDoiTuong(d)) return null;
  const A = s(d.A, 24);
  const B = s(d.B, 24);
  if (!A || !B) return null;
  const to = laMang(d.to) ? d.to.filter((x): x is VungVenn => CAC_VUNG.indexOf(x as VungVenn) >= 0) : [];
  const dem: Record<VungVenn, number> = {chiA: 0, giao: 0, chiB: 0, ngoai: 0};
  if (laDoiTuong(d.dem)) for (const k of CAC_VUNG) dem[k] = Math.round(so(d.dem[k], 0, 0, 36));
  return {A, B, chiA: s(d.chiA, 20), giao: s(d.giao, 20), chiB: s(d.chiB, 20), ngoai: s(d.ngoai, 20), to, mauA: tenMau(d.mau_A) || 'xanh_duong', mauB: tenMau(d.mau_B) || 'do', dem};
}

/* ---------------- Bi trong hộp ---------------- */

export type NhomBi = {ten: string; so: number};
export type DuLieuBiHop = {nhom: NhomBi[]; chon: NhomBi[]; ghiChu: string};

const nhomBi = (v: unknown): NhomBi[] => {
  const ds: NhomBi[] = [];
  if (!laMang(v)) return ds;
  for (const g of v.slice(0, 4)) {
    if (!laDoiTuong(g)) continue;
    const ten = s(g.ten, 20);
    const so_ = Math.round(Number(g.so));
    if (ten && so_ >= 1 && so_ <= 60) ds.push({ten, so: so_});
  }
  return ds;
};

// nhom: các nhóm bi trong hộp; chon: (tùy chọn) những bi được lấy ra để minh họa một cách chọn; ghi_chu: LaTeX hiện dưới khay (ví dụ \\binom{5}{2}=10).
export function hopLeBiHop(d: unknown): DuLieuBiHop | null {
  if (!laDoiTuong(d)) return null;
  const nhom = nhomBi(d.nhom);
  if (!nhom.length) return null;
  return {nhom, chon: nhomBi(d.chon), ghiChu: s(d.ghi_chu, 50)};
}

/* ---------------- Không gian mẫu dạng lưới ---------------- */

export type SuKien = {ten: string; mau: string; o: number[][]; xs: string};
export type DuLieuLuoiMau = {hang: string[]; cot: string[]; tenHang: string; tenCot: string; cap: boolean; suKien: SuKien[]};

export function hopLeLuoiMau(d: unknown): DuLieuLuoiMau | null {
  if (!laDoiTuong(d) || !laMang(d.hang_nhan) || !laMang(d.cot_nhan)) return null;
  const hang = d.hang_nhan.slice(0, 8).map((x) => s(x, 8));
  const cot = d.cot_nhan.slice(0, 8).map((x) => s(x, 8));
  if (!hang.length || !cot.length || hang.some((x) => !x) || cot.some((x) => !x)) return null;
  const suKien: SuKien[] = [];
  if (laMang(d.su_kien)) {
    for (const e of d.su_kien.slice(0, 3)) {
      if (!laDoiTuong(e) || !laMang(e.o)) continue;
      const o: number[][] = [];
      for (const c of e.o.slice(0, 64)) {
        if (laMang(c) && c.length >= 2) {
          const r = Math.round(so(c[0], 0, 0, 99));
          const k = Math.round(so(c[1], 0, 0, 99));
          if (r >= 1 && r <= hang.length && k >= 1 && k <= cot.length) o.push([r, k]);
        }
      }
      const ten = s(e.ten, 24);
      if (ten && o.length) suKien.push({ten, mau: tenMau(e.mau) || 'vang', o, xs: s(e.xs, 30)});
    }
  }
  return {hang, cot, tenHang: s(d.ten_hang, 24), tenCot: s(d.ten_cot, 24), cap: d.cap === true, suKien};
}

/* ---------------- Mô hình diện tích (xác suất nhân, xác suất có điều kiện) ---------------- */

export type HangDT = {nhan: string; xs: string; gt: number; mau: string; kq: string; to: boolean};
export type CotDT = {nhan: string; xs: string; gt: number; mau: string; hang: HangDT[]};
export type DuLieuDienTich = {cot: CotDT[]; tenCot: string; tenHang: string; tong: string};

const chuanHoaTong = (ds: {gt: number}[]) => {
  const t = ds.reduce((a, x) => a + x.gt, 0) || 1;
  ds.forEach((x) => (x.gt = x.gt / t));
};

export function hopLeDienTich(d: unknown): DuLieuDienTich | null {
  if (!laDoiTuong(d) || !laMang(d.cot)) return null;
  const cot: CotDT[] = [];
  for (const c of d.cot.slice(0, 4)) {
    if (!laDoiTuong(c) || !laMang(c.hang)) continue;
    const nhan = s(c.nhan, 20);
    if (!nhan) continue;
    const hang: HangDT[] = [];
    for (const h of c.hang.slice(0, 4)) {
      if (!laDoiTuong(h)) continue;
      const hn = s(h.nhan, 20);
      if (!hn) continue;
      hang.push({nhan: hn, xs: s(h.xs, 24), gt: so(h.gia_tri, 1, 0.001, 1e6), mau: tenMau(h.mau), kq: s(h.kq, 30), to: h.to === true});
    }
    if (!hang.length) continue;
    chuanHoaTong(hang);
    cot.push({nhan, xs: s(c.xs, 24), gt: so(c.gia_tri, 1, 0.001, 1e6), mau: tenMau(c.mau), hang});
  }
  if (!cot.length) return null;
  chuanHoaTong(cot);
  return {cot, tenCot: s(d.ten_cot, 24), tenHang: s(d.ten_hang, 24), tong: s(d.tong, 50)};
}

/* ---------------- Thực nghiệm: tần suất hội tụ về xác suất ---------------- */

export type DuLieuThucNghiem = {p: number; pXs: string; n: number; ten: string; mau: string; seed: number};

export function hopLeThucNghiem(d: unknown): DuLieuThucNghiem | null {
  if (!laDoiTuong(d)) return null;
  const p = so(d.p, -1, 0, 1);
  if (p <= 0 || p >= 1) return null;
  return {p, pXs: s(d.p_xs, 30), n: Math.round(so(d.n, 200, 20, 1000)), ten: s(d.ten, 40), mau: tenMau(d.mau) || 'xanh_duong', seed: Math.round(so(d.seed, 7, 1, 9999))};
}

/* ---------------- Hình vẽ tự do (hinh_ve) ---------------- */
// AI mô tả hình bằng danh sách phần tử; tọa độ x,y tính theo phần trăm khung hình (0-100, gốc ở góc trên trái).

export const MAU_TEN: Record<string, string> = {
  do: '#FC6255', xanh_duong: '#58C4DD', xanh_la: '#83C167', vang: '#F5A623', tim: '#9A72AC',
  cam: '#F0AC5F', hong: '#ff9ec7', trang: '#ffffff', den: '#2b2b2b', xam: '#a8a8a8', nau: '#c9976b',
  ngoc: '#5CD0B3', vang_sang: '#FFE08A',
};
export const KIEU_HINH_VE = ['tron', 'chu_nhat', 'chu', 'mui_ten', 'duong', 'bi', 'xuc_xac', 'the_bai', 'dong_xu', 'bieu_tuong', 'luoi', 'truc_so'] as const;
export type KieuPhanTu = (typeof KIEU_HINH_VE)[number];

export type PhanTu = {
  kieu: KieuPhanTu;
  buoc: number;
  nhap: boolean;
  x: number; y: number; x2: number; y2: number;
  r: number; rong: number; cao: number;
  mau: string; nhan: string; noiDung: string; co: string;
  mat: number; giaTri: string; chat: string; emoji: string;
  hang: number; cot: number; to: number[][];
  tu: number; den: number; diem: {v: number; nhan: string; mau: string}[];
  netDut: boolean;
};
export type DuLieuHinhVe = {phanTu: PhanTu[]; soBuoc: number};

const so = (v: unknown, mac: number, thap: number, cao: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return isFinite(n) && v !== null && v !== '' ? Math.min(cao, Math.max(thap, n)) : mac;
};
const tenMau = (v: unknown): string => (typeof v === 'string' && MAU_TEN[v] ? v : '');

export function hopLeHinhVe(d: unknown): DuLieuHinhVe | null {
  if (!laDoiTuong(d) || !laMang(d.phan_tu)) return null;
  const ds: PhanTu[] = [];
  for (const raw of d.phan_tu.slice(0, 40)) {
    if (!laDoiTuong(raw)) continue;
    const kieu = KIEU_HINH_VE.find((k) => k === raw.kieu);
    if (!kieu) continue;
    const e: PhanTu = {
      kieu,
      buoc: Math.round(so(raw.buoc, 1, 1, 8)),
      nhap: raw.nhap === true,
      x: so(raw.x ?? raw.x1, 50, 0, 100), y: so(raw.y ?? raw.y1, 50, 0, 100),
      x2: so(raw.x2, 60, 0, 100), y2: so(raw.y2, 60, 0, 100),
      r: so(raw.r, 8, 2, 30), rong: so(raw.rong, 20, 3, 100), cao: so(raw.cao, 20, 3, 100),
      mau: tenMau(raw.mau), nhan: s(raw.nhan, 30), noiDung: s(raw.noi_dung, 60),
      co: typeof raw.co === 'string' ? raw.co : 'vua',
      mat: Math.round(so(raw.mat, 1, 1, 6)), giaTri: s(raw.gia_tri, 3) || 'A',
      chat: typeof raw.chat === 'string' ? raw.chat : 'co', emoji: s(raw.emoji, 8),
      hang: Math.round(so(raw.hang, 3, 1, 10)), cot: Math.round(so(raw.cot, 3, 1, 10)),
      to: [], tu: so(raw.tu, 0, -1000, 1000), den: so(raw.den, 10, -1000, 1000), diem: [],
      netDut: raw.net_dut === true,
    };
    if (e.kieu === 'dong_xu') e.giaTri = raw.mat === 'N' || raw.mat === 'n' ? 'N' : 'S';
    if (laMang(raw.to)) {
      for (const c of raw.to.slice(0, 60)) {
        if (laMang(c) && c.length >= 2) e.to.push([Math.round(so(c[0], 1, 1, 10)), Math.round(so(c[1], 1, 1, 10))]);
      }
    }
    if (laMang(raw.diem)) {
      for (const p of raw.diem.slice(0, 12)) {
        if (laDoiTuong(p)) e.diem.push({v: so(p.v, 0, -1000, 1000), nhan: s(p.nhan, 12), mau: tenMau(p.mau)});
      }
    }
    if (e.kieu === 'chu' && !e.noiDung) continue;
    if (e.kieu === 'bieu_tuong' && !e.emoji) continue;
    ds.push(e);
  }
  if (!ds.length) return null;
  return {phanTu: ds, soBuoc: Math.max(...ds.map((e) => e.buoc))};
}

// Chữ tiếng Việt/từ thường thì hiện như chữ; chỉ chuỗi có dấu hiệu công thức mới đưa qua KaTeX
// (nếu không, KaTeX sẽ nuốt dấu cách và in nghiêng chữ "Cùng đỏ").
export function laChuThuong(t: string): boolean {
  const x = String(t);
  if (/[\\^_{}]/.test(x)) return false;
  if (/[À-ỹ]/.test(x)) return true;
  return /[A-Za-z]{3,}/.test(x);
}

/* ---------------- Chọn kiểu hình ---------------- */

export type KieuHinh = 'sankhau' | 'cay' | 'bang' | 'venn' | 'bihop' | 'luoimau' | 'dientich' | 'thucnghiem' | 'hinhve' | 'khac';

export function phanLoaiHinh(loai: string, moTa: string | undefined, du: unknown): KieuHinh | null {
  const l = (loai || '').trim();
  if (!l || l === 'khong') return null;
  if (l === 'san_khau' && hopLeSanKhau(du)) return 'sankhau';
  if (l === 'so_do_cay' && hopLeCay(du)) return 'cay';
  if (l === 'bang' && hopLeBang(du)) return 'bang';
  if (l === 'venn' && hopLeVenn(du)) return 'venn';
  if (l === 'bi_hop' && hopLeBiHop(du)) return 'bihop';
  if (l === 'luoi_mau' && hopLeLuoiMau(du)) return 'luoimau';
  if (l === 'dien_tich' && hopLeDienTich(du)) return 'dientich';
  if (l === 'thuc_nghiem' && hopLeThucNghiem(du)) return 'thucnghiem';
  if (hopLeHinhVe(du)) return 'hinhve';   // mọi loại khác có danh sách phan_tu hợp lệ đều vẽ được
  return moTa && moTa.trim() ? 'khac' : null;
}

/* ---------------- Tiện ích hiển thị ---------------- */

// Cỡ chữ công thức theo độ dài (đếm gần đúng, mỗi lệnh LaTeX tính là một ký tự).
export function coChuCongThuc(tex: string, lon: boolean): number {
  const dai = String(tex).replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}]/g, '').length;
  const co = dai > 44 ? 38 : dai > 34 ? 44 : dai > 24 ? 52 : 60;
  return lon ? Math.round(co * 1.18) : co;
}

export function nhanLoaiCanh(loai: string): string {
  const l = (loai || '').toLowerCase();
  if (/mo_dau|hook|cau_hoi/.test(l)) return '🔥 Câu hỏi';
  if (/de_bai|de$/.test(l)) return '📝 Đề bài';
  if (/y_do/.test(l)) return '🧭 Ý đồ bài toán';
  if (/thu_nho/.test(l)) return '🔬 Thử nhỏ';
  if (/diem_chot/.test(l)) return '🔑 Điểm mấu chốt';
  if (/bay/.test(l)) return '⚠️ Cái bẫy';
  if (/huong|y_tuong|tu_duy|phan_tich/.test(l)) return '💡 Hướng giải';
  if (/tinh|giai|bien_doi/.test(l)) return '🧮 Tính toán';
  if (/dap_an|ket_qua/.test(l)) return '✅ Đáp án';
  if (/bai_hoc|ket_luan|chot|kiem_tra/.test(l)) return '🎯 Chốt lại';
  const sach = l.replace(/_/g, ' ').trim();
  return sach ? sach.charAt(0).toUpperCase() + sach.slice(1) : '';
}

/* ---------------- Nhân vật và hook ---------------- */

const THAY_DANG: Record<string, string[]> = {
  boi_roi: ['nghi'], thao_tac: ['nghi', 'mac_dinh'], tu_tin: ['vui'], ngac_nhien: ['boi_roi', 'nghi'],
  y_tuong: ['vui', 'nghi'], vui: ['tu_tin'], nghi: ['mac_dinh'],
};

// Chọn dáng nhân vật theo cảm xúc; thiếu ảnh cho cảm xúc đó thì lùi về dáng gần nghĩa, cuối cùng là dáng mặc định.
export function chonDang(cam: string, ds: Record<string, string>): string {
  const co = (k: string) => !!k && !!ds[k];
  if (co(cam)) return cam;
  for (const k of THAY_DANG[cam] || []) if (co(k)) return k;
  if (co('mac_dinh')) return 'mac_dinh';
  const ks = Object.keys(ds).filter((k) => !k.endsWith('_mo'));
  return ks.length ? ks[0] : '';
}

export const NHAN_HOOK: Record<string, string> = {
  sai_lam: '⚠️ RẤT DỄ SAI', thach_thuc: '⏱ THỬ THÁCH', bat_ngo: '😱 BẤT NGỜ',
  ket_qua_truoc: '🎯 ĐÁP ÁN TRƯỚC', cau_hoi: '🤔 BẠN CÓ BIẾT?',
};

const bo = (w: string) => w.toLowerCase().replace(/[.,!?…:;"“”()]/g, '');
// Từ nào trong hook được nhấn mạnh (khớp theo từng từ của các cụm trong nhanManh).
export function tuNhanManh(nhanManh: string[]): Set<string> {
  const st = new Set<string>();
  nhanManh.forEach((c) => String(c).split(/\s+/).forEach((w) => { const x = bo(w); if (x) st.add(x); }));
  return st;
}
export const chuanTu = bo;
