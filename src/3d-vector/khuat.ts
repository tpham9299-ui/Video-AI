// v90 — NÉT KHUẤT TỰ ĐỘNG bằng tia từ máy quay: một điểm bị che nếu tia máy -> điểm cắt một mặt/cầu của vật che
// TRƯỚC khi tới điểm. Áp dụng chung cho mọi khối (hộp hở/kín, chóp, trụ, nón, cầu, đa giác, cảnh lắp ghép).
import {Manh, ManhNet, V3, VatChe} from './kieu';
import {cham, cong, doDai, nhan, noi, tru, trungBinh} from './toan3d';

type CheChuan = {k: 'mat'; p2: [number, number][]; n: V3; p0: V3; truc: [number, number]} | {k: 'cau'; o: V3; r: number};

// Chiếu đa giác lên mặt phẳng tọa độ "rộng" nhất theo pháp tuyến, co nhẹ về trọng tâm (0,4%) để tia sượt mép không bị tính là che.
export function chuanBiChe(ds: VatChe[]): CheChuan[] {
  return ds.map((c): CheChuan => {
    if (c.k === 'cau') return c;
    const ax = Math.abs(c.n[0]), ay = Math.abs(c.n[1]), az = Math.abs(c.n[2]);
    const truc: [number, number] = az >= ax && az >= ay ? [0, 1] : ax >= ay ? [1, 2] : [0, 2];
    const g = trungBinh(c.p);
    const co = c.p.map((p) => noi(g, p, 0.996));
    return {k: 'mat', p2: co.map((p) => [p[truc[0]], p[truc[1]]] as [number, number]), n: c.n, p0: c.p[0], truc};
  });
}

function trong(x: number, y: number, ds: [number, number][]): boolean {
  let ok = false;
  for (let i = 0, j = ds.length - 1; i < ds.length; j = i++) {
    const [xi, yi] = ds[i], [xj, yj] = ds[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}

export function biChe(P: V3, C: V3, che: CheChuan[], eps: number): boolean {
  const D = tru(P, C);
  const L = doDai(D);
  if (L < 1e-9) return false;
  const sMax = 1 - eps / L;
  for (const o of che) {
    if (o.k === 'cau') {
      const f = tru(C, o.o);
      const a = cham(D, D), b = 2 * cham(D, f), c = cham(f, f) - o.r * o.r;
      if (c < 0) continue; // máy nằm trong cầu
      // điểm nằm TRÊN mặt cầu (lưới kinh/vĩ tuyến: trung điểm dây cung hơi lọt vào trong) -> xét phía nhìn theo pháp tuyến
      const op = tru(P, o.o);
      const lp = doDai(op);
      if (lp > o.r * 0.985 && lp < o.r * 1.02) {
        if (cham(op, tru(C, P)) < 0) return true;
        continue;
      }
      const disc = b * b - 4 * a * c;
      if (disc <= 0) continue;
      const s1 = (-b - Math.sqrt(disc)) / (2 * a);
      if (s1 > 1e-4 && s1 < sMax) return true;
    } else {
      const den = cham(o.n, D);
      if (Math.abs(den) < 1e-9) continue;
      const s = cham(o.n, tru(o.p0, C)) / den;
      if (s <= 1e-4 || s >= sMax) continue;
      const X = cong(C, nhan(D, s));
      if (trong(X[o.truc[0]], X[o.truc[1]], o.p2)) return true;
    }
  }
  return false;
}

// Chia nét "tu_dong" thành đoạn ngắn, thử che từng đoạn, rồi gộp các đoạn liền nhau cùng trạng thái (giảm số phần tử SVG).
export function xuLyKhuat(manh: Manh[], cheGoc: VatChe[], C: V3, R: number): Manh[] {
  const che = chuanBiChe(cheGoc);
  const eps = R * 0.004;
  const Lmax = R / 14;
  const ra: Manh[] = [];
  for (const m of manh) {
    if (m.k !== 'net' || m.net !== 'tu_dong') {
      ra.push(m);
      continue;
    }
    if (!che.length) {
      ra.push({...m, net: 'lien'});
      continue;
    }
    const L = doDai(tru(m.b, m.a));
    const n = Math.max(1, Math.ceil(L / Lmax));
    let dau = 0;
    let khuat = biChe(noi(m.a, m.b, 0.5 / n), C, che, eps);
    const day = (tu: number, den: number, kh: boolean, cuoi: boolean) => {
      const net: ManhNet = {...m, a: noi(m.a, m.b, tu / n), b: noi(m.a, m.b, den / n), net: kh ? 'dut' : 'lien', mui: m.mui && cuoi};
      ra.push(net);
    };
    for (let i = 1; i < n; i++) {
      const kh = biChe(noi(m.a, m.b, (i + 0.5) / n), C, che, eps);
      if (kh !== khuat) {
        day(dau, i, khuat, false);
        dau = i;
        khuat = kh;
      }
    }
    day(dau, n, khuat, true);
  }
  return ra;
}
