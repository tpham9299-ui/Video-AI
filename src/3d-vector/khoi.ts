// v90 — 10 KHỐI CƠ BẢN (composable primitives): mỗi khối đổi đặc tả -> các mảnh vẽ 3D + mặt che (tính nét khuất).
import type {NguCanh} from './canh';
import {DoiTuong, KieuNet, Manh, MAU_3DV, TenMau, ThamChieu, V3, VatChe} from './kieu';
import {catDuong, cham, chuan, cheo, cong, doDai, kep01, nhan, noi, phapTuyen, tru, trungBinh} from './toan3d';

const W_CANH = 3;
const W_VECTOR = 4.5;
const W_LUOI = 1.3;
const SO_DOAN_TRON = 48;
const CO_NHAN = 36;

type Ra = {manh: Manh[]; che: VatChe[]};

const mau = (m: TenMau) => MAU_3DV[m] || MAU_3DV.cyan;

// Thêm đường gấp khúc (vẽ dần theo a) thành các nét.
function duong(ra: Ra, ds: V3[], o: {mau: string; w: number; net: KieuNet; op: number; sang: number; nhom: string; mui?: boolean}, a = 1) {
  const cat = catDuong(ds, a);
  for (let i = 1; i < cat.length; i++) {
    ra.manh.push({k: 'net', a: cat[i - 1], b: cat[i], mau: o.mau, w: o.w, net: o.net, op: o.op, sang: o.sang, nhom: o.nhom, mui: o.mui && i === cat.length - 1});
  }
}

function mat(ra: Ra, p: V3[], m: string, op: number, nhom: string, coChe: boolean) {
  if (op > 0.002) ra.manh.push({k: 'mat', p, mau: m, op, vien: 0, nhom});
  if (coChe && p.length >= 3) ra.che.push({k: 'mat', p, n: phapTuyen(p)});
}

const nhanVat = (ra: Ra, p: V3, tex: string, m: string, op: number, nhom: string, tam?: V3, co = CO_NHAN, doan?: [V3, V3]) => {
  if (tex && op > 0.05) ra.manh.push({k: 'nhan', p, tex, mau: m, op, co, nhom, tam, doan});
};

function tenDinh(ra: Ra, d: DoiTuong, ds: V3[], op: number, tam: V3) {
  (d.tenDinh || []).forEach((tn, i) => {
    if (!tn || !ds[i]) return;
    ra.manh.push({k: 'cham', p: ds[i], mau: MAU_3DV.trang, r: 4.5, op, kieu: 'diem', sang: 0, nhom: d.id});
    nhanVat(ra, ds[i], tn, MAU_3DV.trang, op, d.id, tam, 32);
  });
}

const vongTron = (o: V3, r: number, n = SO_DOAN_TRON): V3[] =>
  Array.from({length: n + 1}, (_, i): V3 => [o[0] + r * Math.cos((i / n) * 2 * Math.PI), o[1] + r * Math.sin((i / n) * 2 * Math.PI), o[2]]);

// Tìm các góc φ mà mặt bên đổi phía nhìn (đường sinh viền của trụ/nón).
function gocVien(f: (phi: number) => number): number[] {
  const N = 96;
  const ra: number[] = [];
  let truoc = f(0);
  for (let i = 1; i <= N; i++) {
    const phi = (i / N) * 2 * Math.PI;
    const v = f(phi);
    if ((truoc < 0) !== (v < 0)) {
      const phi0 = ((i - 1) / N) * 2 * Math.PI;
      ra.push(phi0 + ((phi - phi0) * truoc) / (truoc - v));
    }
    truoc = v;
  }
  return ra;
}

export function dungKhoi(d: DoiTuong, ctx: NguCanh, a: number, manh: Manh[], che: VatChe[]) {
  const ra: Ra = {manh, che};
  const op = a * ctx.doDuc(d.id);
  const sang = ctx.sang(d.id);
  const m = mau(d.mau);
  const nhom = d.id;
  const coChe = d.che && a > 0.5;
  const o = {mau: m, w: W_CANH, net: d.net, op, sang, nhom};
  switch (d.loai) {
    case 'diem': {
      const p = ctx.giai(d.id);
      manh.push({k: 'cham', p, mau: m, r: 7, op, kieu: 'diem', sang, nhom});
      nhanVat(ra, p, d.nhan, m, op, nhom);
      break;
    }
    case 'doan_thang':
    case 'vector': {
      const A = ctx.giai(d.tu), B = ctx.giai(d.den);
      const laVec = d.loai === 'vector';
      duong(ra, [A, B], {...o, w: laVec ? W_VECTOR : W_CANH, mui: laVec}, a);
      nhanVat(ra, laVec ? noi(A, B, 0.62) : noi(A, B, 0.5), d.nhan, m, op, nhom, undefined, CO_NHAN, [A, B]);
      // tách vector thành thành phần ngang (hồng) + đứng (ngọc) kèm nét gióng
      const p = laVec ? ctx.tienTach(d.id) : 0;
      if (p > 0.001) {
        const H: V3 = [B[0], B[1], A[2]];
        const Vd: V3 = [A[0], A[1], B[2]];
        const tp = (ctx.canh.buoc.flatMap((b) => b.hanhDong).find((h) => h.vat === d.id && h.loai === 'tach_vector')?.thanhPhan) || ['ngang', 'dung'];
        const opP = op * kep01(p * 3);
        if (tp.includes('ngang') && doDai(tru(H, A)) > 1e-6) {
          duong(ra, [A, noi(A, H, p)], {mau: MAU_3DV.hong, w: W_VECTOR - 0.5, net: 'tu_dong', op: opP, sang, nhom, mui: true});
          duong(ra, [B, H], {mau: MAU_3DV.xam, w: 2, net: 'dut', op: opP * 0.8, sang: 0, nhom}, p);
        }
        if (tp.includes('dung') && doDai(tru(Vd, A)) > 1e-6) {
          duong(ra, [A, noi(A, Vd, p)], {mau: MAU_3DV.ngoc, w: W_VECTOR - 0.5, net: 'tu_dong', op: opP, sang, nhom, mui: true});
          duong(ra, [B, Vd], {mau: MAU_3DV.xam, w: 2, net: 'dut', op: opP * 0.8, sang: 0, nhom}, p);
        }
      }
      break;
    }
    case 'da_giac': {
      const ds = ctx.dinhCua(d.id);
      mat(ra, ds, m, d.mo * op, nhom, coChe);
      duong(ra, [...ds, ds[0]], o, a);
      if (d.nhanCanh !== undefined) {
        const a0 = ds[d.nhanCanh], a1 = ds[(d.nhanCanh + 1) % ds.length];
        nhanVat(ra, noi(a0, a1, 0.5), d.nhan, m, op, nhom, trungBinh(ds), 32);
      } else nhanVat(ra, trungBinh(ds), d.nhan, m, op, nhom, undefined, 32);
      break;
    }
    case 'hinh_hop': {
      const v = ctx.dinhCua(d.id);
      const mats: number[][] = [[0, 3, 2, 1], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
      if (d.nap) mats.push([4, 5, 6, 7]);
      for (const f of mats) mat(ra, f.map((i) => v[i]), m, d.mo * op, nhom, coChe);
      const canh = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      for (const [i, j] of canh) duong(ra, [v[i], v[j]], o, a);
      tenDinh(ra, d, v, op, d.tam!);
      nhanVat(ra, trungBinh(v.slice(4)), d.nhan, m, op, nhom);
      break;
    }
    case 'mat_cau': {
      const O = d.tam!, r = d.banKinh!;
      const [nk, nv] = d.luoi!;
      const oLuoi = {...o, w: W_LUOI, op: op * 0.6};
      for (let i = 0; i < nk; i++) {
        const phi = (i / nk) * Math.PI; // mỗi kinh tuyến là một vòng tròn lớn qua hai cực
        const vong = Array.from({length: SO_DOAN_TRON + 1}, (_, j): V3 => {
          const th = (j / SO_DOAN_TRON) * 2 * Math.PI;
          return [O[0] + r * Math.cos(th) * Math.cos(phi), O[1] + r * Math.cos(th) * Math.sin(phi), O[2] + r * Math.sin(th)];
        });
        duong(ra, vong, oLuoi, a);
      }
      for (let j = 0; j < nv; j++) {
        const th = -Math.PI / 2 + ((j + 1) * Math.PI) / (nv + 1);
        duong(ra, vongTron([O[0], O[1], O[2] + r * Math.sin(th)], r * Math.cos(th)), oLuoi, a);
      }
      // đường viền (bóng) thật của cầu theo phối cảnh + đĩa mờ
      if (ctx.camPos) {
        const w = tru(ctx.camPos, O);
        const dd = doDai(w);
        if (dd > r * 1.01) {
          const k = chuan(w);
          const tam = cong(O, nhan(k, (r * r) / dd));
          const rv = r * Math.sqrt(1 - (r * r) / (dd * dd)) * 1.003;
          const phu: V3 = Math.abs(k[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
          const u = chuan(cheo(phu, k)), vv = cheo(k, u);
          const vien = Array.from({length: 73}, (_, i): V3 => {
            const g = (i / 72) * 2 * Math.PI;
            return cong(tam, cong(nhan(u, rv * Math.cos(g)), nhan(vv, rv * Math.sin(g))));
          });
          if (d.mo * op > 0.002) manh.push({k: 'mat', p: vien.slice(0, -1), mau: m, op: d.mo * op, vien: 0, nhom});
          duong(ra, vien, {...o, w: 3, net: 'tu_dong'}, a);
        }
      }
      if (coChe) che.push({k: 'cau', o: O, r});
      tenDinh(ra, d, [O], op, cong(O, [0, 0, -r]));
      nhanVat(ra, cong(O, [r * 0.62, -r * 0.62, r * 0.62]), d.nhan, m, op, nhom, O);
      break;
    }
    case 'hinh_tru':
    case 'hinh_non': {
      const [C, T] = ctx.dinhCua(d.id);
      const r = d.banKinh!;
      const day = vongTron(C, r);
      const tru_ = d.loai === 'hinh_tru';
      duong(ra, day, o, a);
      mat(ra, day.slice(0, -1), m, d.mo * op, nhom, coChe);
      if (tru_) {
        const tren = vongTron(T, r);
        duong(ra, tren, o, a);
        mat(ra, tren.slice(0, -1), m, d.mo * op, nhom, coChe);
        for (let i = 0; i < SO_DOAN_TRON; i++) if (coChe) che.push({k: 'mat', p: [day[i], day[i + 1], tren[i + 1], tren[i]], n: phapTuyen([day[i], day[i + 1], tren[i + 1], tren[i]])});
      } else {
        for (let i = 0; i < SO_DOAN_TRON; i++) if (coChe) che.push({k: 'mat', p: [day[i], day[i + 1], T], n: phapTuyen([day[i], day[i + 1], T])});
      }
      if (ctx.camPos) {
        const cam = ctx.camPos;
        const P = (phi: number, z: V3): V3 => [z[0] + r * Math.cos(phi), z[1] + r * Math.sin(phi), z[2]];
        const f = tru_
          ? (phi: number) => cham([Math.cos(phi), Math.sin(phi), 0], tru(cam, P(phi, noi(C, T, 0.5))))
          : (phi: number) => {
              const p = P(phi, C);
              let n = cheo([-Math.sin(phi), Math.cos(phi), 0], tru(T, p));
              if (cham(n, [Math.cos(phi), Math.sin(phi), 0]) < 0) n = nhan(n, -1);
              return cham(n, tru(cam, p));
            };
        for (const phi of gocVien(f)) duong(ra, [P(phi, C), tru_ ? P(phi, T) : T], {...o, net: 'tu_dong'}, a);
      }
      tenDinh(ra, d, [C, T], op, noi(C, T, 0.5));
      nhanVat(ra, cong(noi(C, T, 0.5), [r * 1.05, 0, 0]), d.nhan, m, op, nhom);
      break;
    }
    case 'hinh_chop': {
      const v = ctx.dinhCua(d.id);
      const S = v[v.length - 1];
      const day = v.slice(0, -1);
      mat(ra, day, m, d.mo * op, nhom, coChe);
      for (let i = 0; i < day.length; i++) mat(ra, [day[i], day[(i + 1) % day.length], S], m, d.mo * op * 0.7, nhom, coChe);
      duong(ra, [...day, day[0]], o, a);
      for (const p of day) duong(ra, [S, p], o, a);
      tenDinh(ra, d, v, op, trungBinh(v));
      nhanVat(ra, S, d.nhan, m, op, nhom);
      break;
    }
    case 'duong_cong': {
      const ds = ctx.duongCua(d.id);
      const tv = ctx.tienVe(d.id);
      if (tv <= 0.001) break;
      duong(ra, ds, {...o, w: 3.5}, a * tv);
      // đầu bút sáng khi đang vẽ dần (đồ thị chạy theo thời gian)
      if (tv < 0.999 && ds.length > 1) {
        const dau = catDuong(ds, a * tv);
        manh.push({k: 'cham', p: dau[dau.length - 1], mau: m, r: 6, op, kieu: 'diem', sang: 1, nhom});
      }
      if (ds.length) nhanVat(ra, ds[Math.floor(ds.length * 0.85)], d.nhan, m, op, nhom);
      break;
    }
    case 'goc': {
      const O = ctx.giai(d.dinhGoc);
      const tia = (c: ThamChieu): V3 => {
        if (typeof c === 'string') {
          const tr = /^([+-])([xyz])$/.exec(c);
          if (tr) {
            const v: V3 = [0, 0, 0];
            v['xyz'.indexOf(tr[2])] = tr[1] === '+' ? 1 : -1;
            return cong(O, v);
          }
        }
        return ctx.giai(c);
      };
      const A = tia(d.canh![0]), B = tia(d.canh![1]);
      const la = doDai(tru(A, O)), lb = doDai(tru(B, O));
      const u = chuan(tru(A, O)), v0 = chuan(tru(B, O));
      const r = d.banKinh && d.banKinh > 0 ? d.banKinh : 0.26 * Math.min(la, lb, ...[la, lb].filter((x) => x > 0));
      const oG = {...o, net: 'lien' as KieuNet, w: 2.6};
      if (d.vuong) {
        const s = r * 0.7;
        duong(ra, [cong(O, nhan(u, s)), cong(O, cong(nhan(u, s), nhan(v0, s))), cong(O, nhan(v0, s))], oG, a);
      } else {
        const th = Math.acos(Math.max(-1, Math.min(1, cham(u, v0))));
        const w = chuan(tru(v0, nhan(u, Math.cos(th))));
        const cung = Array.from({length: 25}, (_, i) => {
          const g = (th * i) / 24;
          return cong(O, cong(nhan(u, r * Math.cos(g)), nhan(w, r * Math.sin(g))));
        });
        if (op > 0) manh.push({k: 'mat', p: [O, ...cung], mau: m, op: 0.16 * op, vien: 0, nhom});
        duong(ra, cung, oG, a);
      }
      nhanVat(ra, cong(O, nhan(chuan(cong(u, v0)), r * 1.75)), d.nhan, m, op, nhom, O, 32);
      break;
    }
    case 'nhom_lap': {
      const n = d.so!, k = d.khoang!, T = d.tam!;
      const sang0 = sang;
      const vt: V3[] = [];
      if (d.xep === 'vong') {
        const R = Math.max(k, (k * n) / (2 * Math.PI));
        for (let i = 0; i < n; i++) vt.push([T[0] + R * Math.cos((i / n) * 2 * Math.PI - Math.PI / 2), T[1] + R * Math.sin((i / n) * 2 * Math.PI - Math.PI / 2), T[2]]);
      } else if (d.xep === 'luoi') {
        const cot = Math.ceil(Math.sqrt(n));
        const hang = Math.ceil(n / cot);
        for (let i = 0; i < n; i++) vt.push([T[0] + ((i % cot) - (cot - 1) / 2) * k, T[1] - (Math.floor(i / cot) - (hang - 1) / 2) * k, T[2]]);
      } else {
        for (let i = 0; i < n; i++) vt.push([T[0] + (i - (n - 1) / 2) * k, T[1], T[2]]);
      }
      vt.forEach((p0, i) => {
        const ai = ctx.alpha(d.id, i * 0.07);
        if (ai <= 0.001) return;
        // v92: phần tử được chọn nhấc nổi + đổi màu + sáng; phần còn lại hạ độ sáng khi đang có phần tử được nhấc
        const ng = ctx.nangPhanTu(d.id, i);
        const p = ng.h ? cong(p0, [0, 0, ng.h * k]) : p0;
        const coNang = d.vat !== undefined && ctx.canh.buoc.some((b) => b.hanhDong.some((h) => h.vat === d.id && h.loai === 'nang' && h.t <= ctx.t));
        const opi = ai * ctx.doDuc(d.id) * (coNang ? 0.42 + 0.58 * Math.max(ng.sang, 0) : 1);
        const sang = Math.max(sang0, ng.sang);
        const mi = ng.mau && ng.sang > 0.5 ? mau(ng.mau) : mau(d.mauTung?.[i] || d.mau);
        const nh = d.nhanTung?.[i] ?? (d.vat === 'the' ? String(i + 1) : '');
        if (d.vat === 'bi') {
          manh.push({k: 'cham', p: cong(p, [0, 0, k * 0.38]), mau: mi, r: 0, rTheGioi: k * 0.38, op: opi, kieu: 'bi', sang, nhom});
          nhanVat(ra, cong(p, [0, 0, k * 0.38]), nh, '#0E1014', opi, nhom, cong(p, [0, 0, k * 0.38]), 26);
        } else if (d.vat === 'the') {
          const w = k * 0.36, h = k * 0.46;
          const q: V3[] = [cong(p, [-w, -h, 0]), cong(p, [w, -h, 0]), cong(p, [w, h, 0]), cong(p, [-w, h, 0])];
          mat(ra, q, mi, 0.22 * opi, nhom, false);
          duong(ra, [...q, q[0]], {...o, mau: mi, op: opi, net: 'lien', w: 2.4});
          nhanVat(ra, p, nh, MAU_3DV.trang, opi, nhom, p, 30);
        } else {
          const s = k * 0.3;
          const v: V3[] = [[-s, -s, 0], [s, -s, 0], [s, s, 0], [-s, s, 0], [-s, -s, 2 * s], [s, -s, 2 * s], [s, s, 2 * s], [-s, s, 2 * s]].map((x) => cong(p, x as V3));
          for (const f of [[0, 3, 2, 1], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]]) mat(ra, f.map((j) => v[j]), mi, 0.14 * opi, nhom, coChe);
          for (const [x, y] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) duong(ra, [v[x], v[y]], {...o, mau: mi, op: opi, w: 2.2});
          nhanVat(ra, cong(p, [0, 0, 2 * s]), nh, MAU_3DV.trang, opi, nhom, p, 28);
        }
      });
      break;
    }
  }
}
