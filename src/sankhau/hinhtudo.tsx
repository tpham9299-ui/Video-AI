// HÌNH TỰ DO: vẽ ĐÚNG hình của đề (không phải chọn vật gần giống). Kịch bản mô tả hình bằng các "nét" trong một khung tọa độ
// riêng (khung: [rộng, cao], gốc trên-trái, y hướng xuống): đa giác, đường gấp khúc, đường tròn, cung, mũi tên, chữ, đường SVG,
// đa giác đều, đường cong tham số, nhân bản (lặp) và các bộ SINH HÌNH cho dạng khó vẽ tay: bông tuyết Koch, tam giác Sierpinski.
// Vẽ kiểu Manim: từng nét vẽ dần (Create), tô màu hiện sau, nhãn bật lên. Bộ sinh hình có số lần lặp "biến hình" liên tục theo
// giá trị của vật (hành động dat_gia_tri: 0 -> 1 -> 2 -> 3), ví dụ bông tuyết mọc thêm gai ngay trước mắt người xem.
import {TI_LE_RONG, VatThuc} from './vatthuc';
import React from 'react';
import {FONT_DAM} from '../theme';
import {Toan} from '../Toan';
import {phanTichBieuThuc} from './bieuthuc';
import {easeOut, kep, neon, popOut} from './donghieu';
import {PhanHinh, Vat} from './dulieu';
import {TrangThai} from './trangthai';
import {GIAO_DIEN, laMoi} from '../theme';
import {VongSong} from '../dong/DiemNhan';
import {CoChuSan, KhongGian3D, toiMau} from '../dong/KhongGian';

type D = [number, number];
const CAM = '#FF8A3D';
const TRANG = '#EAF2F4';
const MAU_MAC = ['xanh_duong', 'xanh_la', 'cam', 'tim', 'hong', 'vang'];

// biến hình một nhóm nét (bien_hinh): dời, rồi xoay + phóng quanh tâm c
const bienTf = (b: {dx: number; dy: number; goc: number; s: number} | undefined, c: D) =>
  b ? `translate(${b.dx.toFixed(2)} ${b.dy.toFixed(2)}) translate(${c[0]} ${c[1]}) rotate(${b.goc.toFixed(2)}) scale(${b.s.toFixed(3)}) translate(${-c[0]} ${-c[1]})` : undefined;
// rơi xuống rồi nảy nhẹ khi chạm (0 -> 1)
const nayXuong = (p: number) => {
  const x = kep(p);
  if (x < 0.62) return Math.pow(x / 0.62, 2);
  const u = (x - 0.62) / 0.38;
  return 1 - 0.07 * Math.sin(u * Math.PI) * (1 - u);
};

// điểm nằm ở tỉ lệ q (0..1) chiều dài của đường gấp khúc (khép kín thì tính cả cạnh cuối)
function diemTheoTiLe(ds: D[], kin: boolean, q: number): D | null {
  const pts = kin && ds.length > 2 ? [...ds, ds[0]] : ds;
  if (pts.length < 2) return null;
  let tong = 0;
  const dai: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    dai.push(l);
    tong += l;
  }
  let con = kep(q) * tong;
  for (let i = 0; i < dai.length; i++) {
    if (con <= dai[i] || i === dai.length - 1) {
      const u = dai[i] ? Math.min(1, con / dai[i]) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u];
    }
    con -= dai[i];
  }
  return null;
}

// ĐẦU SAO CHỔI (bộ hiệu ứng mới): chấm sáng chạy ở mép nét đang vẽ, kéo theo đuôi mờ dần
const SaoChoi: React.FC<{ds: D[]; kin: boolean; q: number; s: number; mau: string}> = ({ds, kin, q, s, mau}) => {
  if (q <= 0.002 || q >= 0.995) return null;
  const dau = diemTheoTiLe(ds, kin, q);
  if (!dau) return null;
  const mo = kep((1 - q) / 0.06);
  const duoi = [0.012, 0.026, 0.044].map((d) => diemTheoTiLe(ds, kin, Math.max(0, q - d)));
  return (
    <g opacity={mo}>
      {duoi.map((p, i) => (p ? <circle key={i} cx={p[0]} cy={p[1]} r={(7 - i * 1.8) / s} fill={mau} opacity={0.55 - i * 0.15} /> : null))}
      <circle cx={dau[0]} cy={dau[1]} r={14 / s} fill={mau} opacity={0.35} style={{filter: `blur(${4 / s}px)`}} />
      <circle cx={dau[0]} cy={dau[1]} r={6.5 / s} fill="#ffffff" style={{filter: `drop-shadow(0 0 ${6 / s}px ${mau})`}} />
    </g>
  );
};

export const KHUNG_HTD = {rong: 860, caoToiDa: 700};
export function kichThuocHinhTuDo(v: Vat): {w: number; h: number} {
  const [kw, kh] = v.khung;
  const s = Math.min(KHUNG_HTD.rong / kw, KHUNG_HTD.caoToiDa / kh);
  return {w: kw * s * v.co, h: kh * s * v.co};
}

/* ---------- bộ sinh hình ---------- */
// Một bước Koch trên đa giác khép kín (gai hướng ra ngoài). f (0..1) = độ nhô của gai: 0 phẳng, 1 tam giác đều đủ.
function bucKoch(ds: D[], f: number): D[] {
  // hướng ra ngoài: theo chiều quay của đa giác (diện tích có dấu)
  let dt = 0;
  for (let i = 0; i < ds.length; i++) {
    const a = ds[i];
    const b = ds[(i + 1) % ds.length];
    dt += a[0] * b[1] - b[0] * a[1];
  }
  const dau = dt > 0 ? 1 : -1; // đã kiểm: tam giác đỉnh trên, đi theo chiều kim đồng hồ trên màn hình (dt > 0) -> gai ra ngoài
  const ra: D[] = [];
  for (let i = 0; i < ds.length; i++) {
    const a = ds[i];
    const b = ds[(i + 1) % ds.length];
    const dx = (b[0] - a[0]) / 3;
    const dy = (b[1] - a[1]) / 3;
    const p1: D = [a[0] + dx, a[1] + dy];
    const p2: D = [a[0] + 2 * dx, a[1] + 2 * dy];
    const h = (Math.sqrt(3) / 2) * f;
    const dinh: D = [(p1[0] + p2[0]) / 2 + dau * dy * h, (p1[1] + p2[1]) / 2 - dau * dx * h];
    ra.push(a, p1, dinh, p2);
  }
  return ra;
}
export function koch(goc: D[], muc: number): D[] {
  let ds = goc;
  const n = Math.floor(kep(muc, 0, 6));
  for (let k = 0; k < n; k++) ds = bucKoch(ds, 1);
  const du = kep(muc, 0, 6) - n;
  return du > 0.001 ? bucKoch(ds, easeOut(du)) : ds;
}
// Sierpinski: danh sách tam giác còn lại sau "muc" lần khoét (phần lẻ: tam giác giữa mờ dần thay vì biến mất đột ngột).
export function sierpinski(goc: D[], muc: number): {tg: D[][]; khoet: D[][]; mo: number} {
  let tg: D[][] = [goc.slice(0, 3)];
  const n = Math.floor(kep(muc, 0, 6));
  const giua = (a: D, b: D): D => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const tach = (ds: D[][]) => {
    const moi: D[][] = [];
    const khoet: D[][] = [];
    ds.forEach(([a, b, c]) => {
      const ab = giua(a, b);
      const bc = giua(b, c);
      const ca = giua(c, a);
      moi.push([a, ab, ca], [ab, b, bc], [ca, bc, c]);
      khoet.push([ab, bc, ca]);
    });
    return {moi, khoet};
  };
  for (let k = 0; k < n; k++) tg = tach(tg).moi;
  const du = kep(muc, 0, 6) - n;
  return du > 0.001 ? {tg, khoet: tach(tg).khoet, mo: easeOut(du)} : {tg, khoet: [], mo: 0};
}

const xoayDiem = (p: D, tam: D, g: number, s = 1): D => {
  const c = Math.cos((g * Math.PI) / 180);
  const sn = Math.sin((g * Math.PI) / 180);
  const x = (p[0] - tam[0]) * s;
  const y = (p[1] - tam[1]) * s;
  return [tam[0] + x * c - y * sn, tam[1] + x * sn + y * c];
};
const daGiacDeu = (tam: D, r: number, n: number, xoay: number): D[] =>
  Array.from({length: n}, (_, i) => {
    const g = ((xoay - 90 + (360 * i) / n) * Math.PI) / 180;
    return [tam[0] + r * Math.cos(g), tam[1] + r * Math.sin(g)] as D;
  });

// Chuyển một nét thành danh sách hình SVG đơn giản (đường dẫn d + có khép kín không), theo mức lặp hiện tại.
type An = {yTren: number; yDuoi: number; demTren: number; demDuoi: number; rc: number; soAn: number; tu: number; den: number};
type Net = {d: string; kin: boolean; tam: D; mo?: number; ds?: D[]; dem?: number; xPhai?: number; an?: An};
// LỚP CHÚ THÍCH: trong không gian 3D, phần HÌNH KHỐI (ống, mảnh đất...) dựng 3D, còn CHÚ THÍCH (nhãn, số đo, số đếm, ngoặc "còn n tầng")
// nằm PHẲNG luôn quay về người xem như lớp đồ họa (HUD). Bản 3D vẽ hình bỏ chữ (boChu); bản phẳng chỉ vẽ chữ (chiChu), đặt đúng điểm
// chiếu của nó trên hình 3D (chieu: tọa độ sân khấu -> tọa độ sân khấu sau khi chiếu).
export const LopHinh = React.createContext<{boChu?: boolean; chiChu?: boolean; chieu?: (x: number, y: number) => [number, number]; skW?: number; skH?: number}>({});
// Net.ds: các điểm (đầu sao chổi); dem/xPhai: số vật + mép phải của một tầng (xep_chong); an: phần giữa bị lược (dấu ⋮ của đề)
function dungNet(h: PhanHinh, muc: number): Net[] {
  const dd = (ds: D[], kin: boolean): string => (ds.length ? 'M' + ds.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('L') + (kin ? 'Z' : '') : '');
  const tamCua = (ds: D[]): D => (ds.length ? [ds.reduce((s, p) => s + p[0], 0) / ds.length, ds.reduce((s, p) => s + p[1], 0) / ds.length] : h.tam);
  switch (h.kieu) {
    case 'da_giac':
      return [{d: dd(h.diem, true), kin: true, tam: tamCua(h.diem), ds: h.diem}];
    case 'duong':
    case 'mui_ten':
      return [{d: dd(h.diem, false), kin: false, tam: tamCua(h.diem), ds: h.diem}];
    case 'tron': {
      const [x, y] = h.tam;
      const r = h.r;
      // điểm vòng tròn theo đúng chiều vẽ của cung SVG (bắt đầu bên trái, đi ngược kim đồng hồ trên màn hình)
      const ds = Array.from({length: 73}, (_, i) => [x - r * Math.cos((i / 72) * Math.PI * 2), y + r * Math.sin((i / 72) * Math.PI * 2)] as D);
      return [{d: `M${x - r} ${y}A${r} ${r} 0 1 0 ${x + r} ${y}A${r} ${r} 0 1 0 ${x - r} ${y}Z`, kin: true, tam: h.tam, ds}];
    }
    case 'cung': {
      const [x, y] = h.tam;
      const a = (h.tu * Math.PI) / 180;
      const b = (h.den * Math.PI) / 180;
      const lon = Math.abs(h.den - h.tu) > 180 ? 1 : 0;
      return [{d: `M${x + h.r * Math.cos(a)} ${y + h.r * Math.sin(a)}A${h.r} ${h.r} 0 ${lon} ${h.den > h.tu ? 1 : 0} ${x + h.r * Math.cos(b)} ${y + h.r * Math.sin(b)}`, kin: false, tam: h.tam}];
    }
    case 'svg':
      return [{d: h.d, kin: /z\s*$/i.test(h.d), tam: h.tam}];
    case 'da_giac_deu': {
      const ds = daGiacDeu(h.tam, h.r, h.soCanh, h.xoay);
      return [{d: dd(ds, true), kin: true, tam: h.tam, ds}];
    }
    case 'koch': {
      const goc = h.diem.length >= 3 ? h.diem : daGiacDeu(h.tam, h.r, 3, h.xoay);
      const ds = koch(goc, Math.min(muc, h.lap));
      return [{d: dd(ds, true), kin: true, tam: tamCua(goc), ds}];
    }
    case 'sierpinski': {
      const goc = h.diem.length >= 3 ? h.diem : daGiacDeu(h.tam, h.r, 3, h.xoay);
      const s = sierpinski(goc, Math.min(muc, h.lap));
      return [
        {d: s.tg.map((t) => dd(t, true)).join(''), kin: true, tam: tamCua(goc)},
        ...(s.khoet.length ? [{d: s.khoet.map((t) => dd(t, true)).join(''), kin: true, tam: tamCua(goc), mo: s.mo}] : []),
      ];
    }
    case 'tham_so': {
      const fx = phanTichBieuThuc(h.bieuX.replace(/(?<![a-z])t(?![a-z])/g, 'x'));
      const fy = phanTichBieuThuc(h.bieuY.replace(/(?<![a-z])t(?![a-z])/g, 'x'));
      if (!fx || !fy) return [];
      const ds: D[] = [];
      for (let i = 0; i <= 240; i++) {
        const t = h.tTu + ((h.tDen - h.tTu) * i) / 240;
        const x = fx(t);
        const y = fy(t);
        if (isFinite(x) && isFinite(y)) ds.push([x, y]);
      }
      return [{d: dd(ds, false), kin: false, tam: tamCua(ds), ds}];
    }
    case 'vat':
      return [{d: '', kin: false, tam: [h.tam[0], h.tam[1] - h.cao * 0.5]}];
    case 'xep_chong': {
      // CHỒNG VẬT XẾP TẦNG (ống, lon, khúc gỗ...): các tầng nằm ngang, vật trên nằm trong khe hai vật dưới (xếp tổ ong);
      // nhiều tầng thì rút gọn như sách giáo khoa: 2 tầng trên cùng, dấu chấm dọc, 3 tầng dưới cùng.
      const hang = h.hang.length ? h.hang : [3, 4, 5, 6];
      const n = hang.length;
      const hien: (number | null)[] = n > 7 ? [0, 1, null, n - 3, n - 2, n - 1] : hang.map((_, i) => i);
      // tầng quá đông (vd 22 ống) thì vẽ RÚT GỌN như hình sách giáo khoa: tầng dưới cùng tối đa 10 vật, giữ đúng chênh lệch giữa các tầng
      const veDem = (i: number) => {
        const cuoi = hang[n - 1];
        if (cuoi <= 10) return hang[i];
        if (n > 7 && i <= 1) return Math.min(hang[i], 6);
        return Math.max(1, 10 - (cuoi - hang[i]));
      };
      const maxDem = Math.max(...hien.filter((i): i is number => i !== null).map(veDem));
      const rc = h.r / Math.max(1, maxDem);
      const dy = rc * 1.732;
      const khe = rc * 3.8; // phần giữa bị lược: chỗ cho các tầng ẩn trôi qua
      const cao = hien.reduce<number>((t, i, k) => (k === 0 ? 0 : t + (i === null || hien[k - 1] === null ? khe / 2 + dy / 2 : dy)), 0);
      let y = h.tam[1] - cao / 2;
      const ra: Net[] = [];
      const vong = (cx: number, cy: number, r: number) => `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0Z`;
      hien.forEach((i, k) => {
        if (k > 0) y += i === null || hien[k - 1] === null ? khe / 2 + dy / 2 : dy;
        if (i === null) {
          // DẤU ⋮ CỦA ĐỀ = "còn nhiều tầng ở giữa": không vẽ ba chấm chết mà để các tầng ẩn trôi qua + ngoặc "+n tầng" (vẽ ở lớp chú thích)
          const nua = khe / 2 + dy / 2;
          ra.push({d: '', kin: true, tam: [h.tam[0], y], dem: -1, xPhai: h.tam[0] + rc * veDem(n - 3),
            an: {yTren: y - nua + rc, yDuoi: y + nua - rc, demTren: veDem(1), demDuoi: veDem(n - 3), rc, soAn: n - 5, tu: hang[2], den: hang[n - 4]}});
          return;
        }
        const dem = veDem(i);
        const x0 = h.tam[0] - (dem - 1) * rc;
        ra.push({d: Array.from({length: dem}, (_, j) => vong(x0 + 2 * rc * j, y, rc * 0.94)).join(''), kin: true, tam: [h.tam[0], y], dem: hang[i], xPhai: x0 + 2 * rc * (dem - 1) + rc});
      });
      return ra;
    }
    case 'lap': {
      if (!h.con) return [];
      const ra: Net[] = [];
      for (let k = 0; k < h.soLan; k++) {
        const ti = Math.pow(h.tiLe, k);
        const bien = (p: D): D => {
          const q = xoayDiem(p, h.tamXoay, h.xoay * k, ti);
          return [q[0] + h.dich[0] * k, q[1] + h.dich[1] * k];
        };
        // nhân bản ở cấp NÉT: dời/xoay/thu phóng các điểm, tâm và bán kính rồi dựng lại
        const con: PhanHinh = {...h.con, diem: h.con.diem.map(bien), tam: bien(h.con.tam), r: h.con.r * ti, xoay: h.con.xoay + h.xoay * k};
        dungNet(con, muc).forEach((n) => {
          const d = con.kieu === 'svg' ? n.d.replace(/([ML])\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g, (_m, c, x, y) => {
            const q = bien([Number(x), Number(y)]);
            return `${c}${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
          }) : n.d;
          ra.push({d, kin: n.kin, tam: n.tam, mo: n.mo, ds: n.ds ? n.ds.map(bien) : undefined});
        });
      }
      return ra;
    }
    default:
      return [];
  }
}

export const HinhTuDo: React.FC<{v: Vat; st: TrangThai}> = ({v, st}) => {
  const {w: W, h: H} = kichThuocHinhTuDo(v);
  const s = W / v.khung[0];
  const t = st.t - st.ta;
  const muc = isFinite(st.giaTri) ? st.giaTri : 99;
  const nhan: React.ReactNode[] = [];
  const nNet = v.hinh.length;
  const moi = laMoi();
  const kg = React.useContext(KhongGian3D);
  const kc = React.useContext(CoChuSan);
  const lop = React.useContext(LopHinh);
  // điểm (px trong hình) -> chỗ hiện của nó trên hình 3D (chỉ dùng ở lớp chú thích phẳng)
  const dich = (x: number, y: number): [number, number] => {
    if (!lop.chieu || !lop.skW || !lop.skH) return [x, y];
    const sx = (v.x / 100) * lop.skW + st.dx + (x - W / 2);
    const sy = (v.y / 100) * lop.skH + st.dy + (y - H / 2);
    const [px, py] = lop.chieu(sx, sy);
    return [x + px - sx, y + py - sy];
  };
  // giữ nhãn/chữ nằm trong khung hình (không tràn mép, không bị cắt): ước lượng bề rộng theo số ký tự
  const trongKhung = (x: number, chuoi: string, co: number) => {
    const rong = Math.min(W, chuoi.replace(/\\[a-zA-Z]+|[{}_^$]/g, '').length * co * 0.56 + 24);
    return Math.max(rong / 2 - 10, Math.min(W - rong / 2 + 10, x));
  };
  // giới hạn sân khấu (960px) tính trong tọa độ của hình: chữ đặt ngoài hình vẫn không được vượt mép sân khấu (= mép màn hình)
  const goc0 = (v.x / 100) * 960 + st.dx - W / 2;
  const bienTrai = -goc0 + 14, bienPhai = 960 - goc0 - 14;
  // hộp các chữ rời (kieu "chu") để số đếm tầng né ra, không đè lên
  const hopChu = v.hinh.filter((h) => h.kieu === 'chu').map((h) => {
    const coC = 34 * h.coChu * kc, rong = h.noiDung.replace(/\\[a-zA-Z]+|[{}_^$]/g, '').length * coC * 0.56 + 24;
    const x = trongKhung(h.tam[0] * s, h.noiDung, coC);
    return {x0: x - rong / 2, x1: x + rong / 2, y0: h.tam[1] * s - coC * 0.7, y1: h.tam[1] * s + coC * 0.7};
  });
  const coVatThuc = v.hinh.some((h) => h.kieu === 'vat');   // cảnh thật (cột cờ, nhà...): hình học vẽ thêm là chú thích phẳng
  const KHOI = 10; // số lớp đùn khối (hình tô màu nằm trên bàn 3D -> nổi thành khối có bề dày)
  // bộ hiệu ứng mới: nhiều chữ rời cùng một bước thì bật LẦN LƯỢT (0,3 giây/chữ) kèm vòng sóng, như các ga tàu hiện dần
  const treChu = new Map<number, number>();
  if (moi) {
    const dem = new Map<number, number>();
    v.hinh.forEach((h, i) => {
      if (h.kieu !== 'chu') return;
      const k = dem.get(h.buoc) || 0;
      treChu.set(i, k * 0.3);
      dem.set(h.buoc, k + 1);
    });
  }
  const hinhSvg = v.hinh.map((h, i) => {
            // thời điểm vẽ: theo "buoc" riêng của nét, nếu không thì lần lượt từng nét sau khi vật xuất hiện
            const bd = h.buoc > 0 && st.tb ? st.tb(h.buoc) - st.ta : 0.1 + i * Math.min(0.45, 2.4 / Math.max(1, nNet));
            const p = (t - bd) / 0.9;
            if (p <= 0) return null;
            const c = st.chon.get(i + 1);
            const lb = st.loai.get(i + 1) || 0;
            const mau = c ? neon(c.mau, CAM) : neon(h.mau || MAU_MAC[i % MAU_MAC.length]);
            const day = (h.net || 4) * (c ? 1.6 : 1);
            const toMau = h.to ? neon(h.to === 'co' ? h.mau || MAU_MAC[i % MAU_MAC.length] : h.to) : '';
            const nets = dungNet(h, muc);
            if (h.nhan) {
              // vật thực tế: nhãn mặc định bên phải vật, ngang giữa thân (vd "h = ?" cạnh cột cờ)
              const vt = h.viTriNhan || (h.kieu === 'vat' ? [h.tam[0] + (h.rong || h.cao * (TI_LE_RONG[h.ten] || 1)) / 2 + 3, h.tam[1] - h.cao * 0.55] as D : nets[0]?.tam || h.tam);
              const coN = 30 * h.coChu * kc;
              const [xN, yN] = dich(trongKhung(vt[0] * s, h.nhan, coN), vt[1] * s);
              if (moi) nhan.push(<VongSong key={`vs${i}`} x={xN} y={yN} p={(t - bd - 0.5) / 0.9} mau={GIAO_DIEN.nhan} R={70} />);
              nhan.push(
                <div key={`n${i}`} style={{position: 'absolute', left: xN, top: yN, transform: `translate(-50%,-50%) scale(${popOut(kep((t - bd - 0.5) / 0.35), 1.6)})`, opacity: kep((t - bd - 0.5) * 3) * (1 - 0.6 * lb),
                  background: 'rgba(6,14,18,0.8)', border: `2px solid ${mau}66`, borderRadius: 10, padding: '2px 10px', whiteSpace: 'nowrap'}}>
                  <Toan tex={h.nhan} size={coN} color={c ? mau : TRANG} />
                </div>
              );
            }
            if (h.kieu === 'chu') return null;
            if (h.kieu === 'vat') {
              // vật thực tế: mọc từ chân lên, có nhịp chuyển động riêng (cờ bay, đèn quét...); nghiêng theo "xoay" (thang dựa tường)
              return (
                <g key={i} transform={h.xoay ? `rotate(${h.xoay} ${h.tam[0]} ${h.tam[1]})` : undefined} opacity={1 - 0.6 * lb} style={c ? {filter: `drop-shadow(0 0 ${2 + 3 * c.p}px ${mau})`} : undefined}>
                  <VatThuc ten={h.ten} x={h.tam[0]} y={h.tam[1]} cao={h.cao} rong={h.rong || undefined} lat={h.lat} mau={mau} t={st.t} p={(t - bd) / 0.8} bien={h.bien} emoji={h.emoji} />
                </g>
              );
            }
            const xep = h.kieu === 'xep_chong';
            const moTo = (xep ? 1 : kep((t - bd - 0.6) / 0.6)) * (1 - 0.6 * lb);
            // KHỐI MỌC LÊN: hình tô xong thì bề dày đùn tăng dần (hình phẳng nở thành khối), không hiện ra cứng đơ
            const moc = easeOut(kep((t - bd - 0.5) / 0.8));
            const g3 = (kg.xoay * Math.PI) / 180;
            const hx = kg.huong ? kg.huong[0] : Math.sin(g3), hy = kg.huong ? kg.huong[1] : Math.cos(g3);
            const tamKhung: D = [v.khung[0] / 2, v.khung[1] / 2];
            return (
              <g key={`g${i}`} transform={bienTf(st.bienNet.get(0), tamKhung)}>
                <g transform={bienTf(st.bienNet.get(i + 1), h.tam)}>
                  {nets.map((n, k) => {
                    let tf = '';
                    let moT = 1;
                    let mocNet = moc;
                    if (xep) {
                      // XẾP TỪNG TẦNG: tầng rơi xuống lần lượt TỪ DƯỚI LÊN, nảy nhẹ khi chạm (như người thợ xếp ống thật)
                      const thuTu = nets.length - 1 - k;
                      const pr = kep((t - bd - thuTu * 0.26) / 0.55);
                      if (pr <= 0) return null;
                      tf = `translate(0 ${(-h.r * 0.9 * (1 - nayXuong(pr))).toFixed(2)})`;
                      moT = kep(pr * 4);
                      mocNet = nayXuong(pr);
                    }
                    if (st.tach > 0.001) {
                      // TÁCH RỜI: các phần dạt ra xa tâm hình (cho thấy hình gồm những mảnh nào), "ghep" để liền lại
                      const tam0 = xep ? h.tam : tamKhung;
                      const ox = (n.tam[0] - tam0[0]) * 0.45 * st.tach;
                      const oy = (n.tam[1] - tam0[1]) * 0.45 * st.tach + (xep ? (k - (nets.length - 1) / 2) * h.r * 0.14 * st.tach : 0);
                      tf += ` translate(${ox.toFixed(2)} ${oy.toFixed(2)})`;
                    }
                    if (n.an) {
                      // CÁC TẦNG ẨN TRÔI QUA: 4 tầng mờ, dẹt dần, trôi chậm từ trên xuống dưới trong khoảng bị lược (chu kỳ ~2,5 giây),
                      // số vật mỗi tầng tăng dần từ tầng trên xuống tầng dưới - người xem hiểu ngay "ở giữa còn rất nhiều tầng"
                      const A = n.an;
                      const pha = (Math.max(0, t - bd) * 0.4) % 1;
                      return (
                        <g key={`${i}_${k}`} transform={tf || undefined} opacity={moT}>
                          {[0, 1, 2, 3].map((j) => {
                            const u = (j + pha) / 4;
                            const yy = A.yTren + u * (A.yDuoi - A.yTren);
                            const dem = Math.max(1, Math.round(A.demTren + (A.demDuoi - A.demTren) * u));
                            const x0 = n.tam[0] - (dem - 1) * A.rc;
                            return (
                              <g key={j} opacity={(0.12 + 0.5 * Math.sin(Math.PI * u)) * (1 - 0.6 * lb)}>
                                {Array.from({length: dem}, (_, q) => (
                                  <ellipse key={q} cx={x0 + 2 * A.rc * q} cy={yy} rx={A.rc * 0.9} ry={A.rc * (0.28 + 0.2 * Math.sin(Math.PI * u))} fill={toMau || mau} stroke={mau} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                                ))}
                              </g>
                            );
                          })}
                        </g>
                      );
                    }
                    // CHỈ mặt VẬT THẬT mới đùn thành khối (tô do_to ≥ 0,25). Mảng tô mờ (tam giác vuông đánh dấu, vùng tô nhạt)
                    // là CHÚ THÍCH: giữ phẳng, trong suốt, không che vật thật (cột cờ, người) phía sau.
                    const tron = !!(n.kin && toMau && n.mo === undefined) && (h.doTo || 0.28) >= 0.25 && !coVatThuc;
                    const laKhoi = tron || (h.kieu !== 'mui_ten' && (h.net || 4) >= 6);
                    const khoi = kg.nam && laKhoi && n.mo === undefined && !h.dut && (tron ? moTo > 0.01 && mocNet > 0.02 : p > 0)
                      ? Array.from({length: tron ? KHOI : 4}, (_, j) => {
                        const L = tron ? KHOI : 4;
                        const d = (((L - j) * 3.2) / s) * (tron ? mocNet : kep(p * 3));
                        return tron ? (
                          <path key={`k${j}`} d={n.d} transform={`translate(${(d * hx).toFixed(3)} ${(d * hy).toFixed(3)})`} fill={toiMau(toMau, 0.32 + 0.25 * (j / L))} fillOpacity={Math.min(0.95, 0.55 + (h.doTo || 0.28)) * moTo}
                            stroke={j === 0 ? toiMau(mau, 0.5) : 'none'} strokeWidth={j === 0 ? day * 0.8 : 0} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                        ) : (
                          <path key={`k${j}`} d={n.d} transform={`translate(${(d * hx).toFixed(3)} ${(d * hy).toFixed(3)})`} fill="none" stroke={toiMau(mau, 0.3 + 0.08 * j)} strokeWidth={day} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={kep(p * 3)} />
                        );
                      })
                      : null;
                    return (
                      <g key={`${i}_${k}`} transform={tf || undefined} opacity={moT}>
                        {khoi}
                        <path d={n.d} vectorEffect="non-scaling-stroke"
                          fill={n.kin && toMau ? toMau : 'none'} fillOpacity={n.mo !== undefined ? 0 : (h.doTo || 0.28) * (xep ? Math.max(1, 2.2) : 1) * moTo + (c ? 0.15 * c.p : 0)}
                          stroke={n.mo !== undefined ? '#FF5C61' : mau} strokeWidth={day} strokeLinejoin="round" strokeLinecap="round" opacity={(n.mo !== undefined ? n.mo : 1) * (1 - 0.65 * lb) * (h.moNet ?? 1)}
                          strokeDasharray={h.dut ? '8 7' : n.mo !== undefined ? '6 5' : undefined}
                          markerEnd={h.kieu === 'mui_ten' ? `url(#mt_${v.id})` : undefined}
                          {...(h.dut || n.mo !== undefined || xep ? {} : {pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - easeOut(kep(p))})}
                          style={{filter: c || st.sang > 0 ? `drop-shadow(0 0 ${8 + 10 * st.sang}px ${mau})` : `drop-shadow(0 0 4px ${mau}88)`}} />
                        {moi && !h.dut && !xep && n.ds && n.mo === undefined ? <SaoChoi ds={n.ds} kin={n.kin} q={easeOut(kep(p))} s={s} mau={mau} /> : null}
                      </g>
                    );
                  })}
                </g>
              </g>
            );
          });
  return (
    <div style={{position: 'relative', width: W, height: H}}>
      {v.noiDung && !lop.boChu ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: -58, textAlign: 'center', fontFamily: FONT_DAM, fontWeight: 900, fontSize: 40, color: TRANG, opacity: kep(t * 3), textShadow: '0 2px 8px rgba(0,0,0,0.7)'}}>{v.noiDung}</div>
      ) : null}
      {lop.chiChu ? null : <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <marker id={`mt_${v.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={TRANG} />
          </marker>
        </defs>
        <g transform={`scale(${s})`}>
          {hinhSvg}
        </g>
      </svg>}
      {/* ĐẾM TỪNG TẦNG (dem_tang): số vật của mỗi tầng bật ra bên phải lần lượt từ trên xuống, kèm vòng sóng */}
      {st.demTang >= 0 && !lop.boChu
        ? v.hinh.map((h, i) => {
            if (h.kieu !== 'xep_chong') return null;
            const co = 40 * kc;
            return dungNet(h, muc).map((n, k) => {
              if (n.dem === undefined || n.an) return null;   // phần bị lược: số chạy nằm trong nhãn ngoặc (bên dưới)
              const a = kep((st.demTang - k * 0.38) / 0.3);
              if (a <= 0) return null;
              let xd = Math.min(Math.max(W - 20, bienPhai - co), (n.xPhai || 0) * s + co * 1.1);
              const yd = n.tam[1] * s, nua = String(n.dem).length * co * 0.32 + 6;
              // né chữ rời (vd nhãn "Tầng 1" cạnh hàng dưới cùng): dời số sang phải chữ đó, hết chỗ thì sang trái
              for (const b of hopChu) {
                if (xd + nua > b.x0 && xd - nua < b.x1 && yd + co * 0.55 > b.y0 && yd - co * 0.55 < b.y1) xd = b.x1 + nua + 8 <= bienPhai ? b.x1 + nua + 8 : b.x0 - nua - 8;
              }
              const [x, y] = dich(xd, yd);
              return (
                <React.Fragment key={`dt${i}_${k}`}>
                  {moi && n.dem > 0 ? <VongSong x={x} y={y} p={(st.demTang - k * 0.38) / 0.8} mau={GIAO_DIEN.nhan} R={44} soVong={1} /> : null}
                  <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${popOut(a, 1.8)})`, opacity: kep(a * 2), fontFamily: FONT_DAM, fontWeight: 900, fontSize: co, color: GIAO_DIEN.nhan, textShadow: '0 2px 8px rgba(0,0,0,0.8)', whiteSpace: 'nowrap'}}>
                    {n.dem > 0 ? n.dem : '⋮'}
                  </div>
                </React.Fragment>
              );
            });
          })
        : null}
      {/* chữ rời (kieu "chu") */}
      {lop.boChu ? null : v.hinh.map((h, i) => {
        if (h.kieu !== 'chu') return null;
        const bd = (h.buoc > 0 && st.tb ? st.tb(h.buoc) - st.ta : 0.1 + i * 0.3) + (treChu.get(i) || 0);
        const a = kep((t - bd) / 0.35);
        const c = st.chon.get(i + 1);
        const coC = 34 * h.coChu * kc;
        const [xC, yC] = dich(trongKhung(h.tam[0] * s, h.noiDung, coC), h.tam[1] * s);
        return (
          <React.Fragment key={`c${i}`}>
            {moi ? <VongSong x={xC} y={yC} p={(t - bd) / 0.9} mau={GIAO_DIEN.nhan} R={80} /> : null}
            <div style={{position: 'absolute', left: xC, top: yC, transform: `translate(-50%,-50%) scale(${popOut(a, 1.6)})`, opacity: kep(a * 2), whiteSpace: 'nowrap'}}>
              <Toan tex={h.noiDung} size={coC} color={c ? neon(c.mau, CAM) : h.mau ? neon(h.mau) : TRANG} />
            </div>
          </React.Fragment>
        );
      })}
      {lop.boChu ? null : nhan}
      {/* PHẦN BỊ LƯỢC (dấu ⋮ của đề): ngoặc nhọn ôm khoảng trống + nhãn "+15 tầng", ở lớp chú thích */}
      {lop.boChu ? null : v.hinh.map((h, i) => {
        if (h.kieu !== 'xep_chong') return null;
        const bd = h.buoc > 0 && st.tb ? st.tb(h.buoc) - st.ta : 0.1 + i * Math.min(0.45, 2.4 / Math.max(1, nNet));
        const nets = dungNet(h, muc);
        return nets.map((n, k) => {
          if (!n.an) return null;
          const a = easeOut(kep((t - bd - (nets.length - 1 - k) * 0.26 - 0.35) / 0.6));
          if (a <= 0) return null;
          const co = 30 * kc;
          const xNgoac = (h.tam[0] + n.an.rc * (n.an.demDuoi + 1.2)) * s;
          const [x1, y1] = dich(xNgoac, n.an.yTren * s);
          const [x2, y2] = dich(xNgoac, n.an.yDuoi * s);
          const cao = Math.max(12, y2 - y1), rong = co * 0.55;
          // nhãn "+15 tầng" không vượt mép sân khấu: thiếu chỗ thì thu nhỏ chữ cho vừa
          const rongNhan = (`+${n.an.soAn} ${h.tenTang}`.length * 0.62 + 0.4) * co;
          const choTrong = bienPhai - (xNgoac + rong + 10);
          const coNhan = choTrong < rongNhan ? Math.max(22, co * (choTrong / rongNhan)) : co;
          const ngoac = `M0 0 C${rong * 0.6} 0 ${rong * 0.2} ${cao * 0.5 - 6} ${rong} ${cao * 0.5} C${rong * 0.2} ${cao * 0.5 + 6} ${rong * 0.6} ${cao} 0 ${cao}`;
          return (
            <React.Fragment key={`an${i}_${k}`}>
              <svg width={rong + 4} height={cao + 4} style={{position: 'absolute', left: x1, top: y1, overflow: 'visible', opacity: a}}>
                <path d={ngoac} fill="none" stroke={GIAO_DIEN.nhan} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - a} style={{filter: `drop-shadow(0 0 5px ${GIAO_DIEN.nhan})`}} />
              </svg>
              <div style={{position: 'absolute', left: x1 + rong + 10, top: (y1 + y2) / 2, transform: `translateY(-50%) scale(${popOut(a, 1.5)})`, transformOrigin: '0 50%', opacity: a, whiteSpace: 'nowrap',
                fontFamily: FONT_DAM, fontWeight: 900, fontSize: coNhan, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.85)', lineHeight: 1.1}}>
                +{n.an.soAn} <span style={{color: GIAO_DIEN.nhan}}>{h.tenTang}</span>
                {/* đang dem_tang: số vật CHẠY NHANH qua các tầng bị lược (5 → 19) cho người xem cảm nhận "còn rất nhiều tầng" */}
                {st.demTang >= 0 && kep((st.demTang - k * 0.38) / 0.3) > 0 ? (
                  <div style={{fontSize: coNhan * 0.8, color: GIAO_DIEN.nhan, opacity: kep((st.demTang - k * 0.38) / 0.3)}}>
                    {n.an.tu} → {Math.round(n.an.tu + (n.an.den - n.an.tu) * easeOut(kep((st.demTang - k * 0.38) / 1.3)))}
                  </div>
                ) : null}
              </div>
            </React.Fragment>
          );
        });
      })}
    </div>
  );
};
