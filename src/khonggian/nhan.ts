// v97 — ĐẶT NHÃN 3 LỚP (sau khi chiếu 2D):
//  (1) tại mỗi đỉnh: góc của mọi cạnh 2D nối vào (hoặc đi qua) đỉnh -> đẩy nhãn ra PHÂN GIÁC khe trống lớn nhất,
//      ưu tiên hướng ra xa trọng tâm khối;
//  (2) khử va chạm lặp: hộp nhãn đụng nhãn khác / đụng cạnh / đụng chấm / chạm biên vùng an toàn -> thử khe trống kế tiếp
//      (và khoảng đẩy xa hơn), lặp tới khi sạch;
//  (3) giảm xóc: khi máy đang xoay, vị trí nhãn nội suy giữa nghiệm ở tư thế đầu và tư thế đích (ve.ts) -> không giật chữ.
export type DiemNhan = {ten: string; x: number; y: number; huongCanh: number[]; uuTien: number; chu?: string}; // v98 chu: nhãn hiển thị dài (Flycam)
export type HopNhan = {ten: string; x: number; y: number; w: number; h: number; dx: number; dy: number};
export type DoanCan = {x1: number; y1: number; x2: number; y2: number; a?: string; b?: string};

export const CO_NHAN = 34;
// hộp chữ của nhãn điểm (A, B', M_1...): chữ đậm Be Vietnam + viền tối
export const kichNhan = (ten: string, co = CO_NHAN) => {
  const chu = ten.replace(/_/g, '').length;
  return {w: Math.max(1, chu) * co * 0.6 + 10, h: co * 1.05};
};

type Hop = {x0: number; y0: number; x1: number; y1: number};
const hop = (x: number, y: number, w: number, h: number): Hop => ({x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2});
export const chongHop = (a: Hop, b: Hop) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

export function doanCatHop(d: DoanCan, h: Hop, e = 1): boolean {
  // Liang–Barsky
  let t0 = 0, t1 = 1;
  const dx = d.x2 - d.x1, dy = d.y2 - d.y1;
  const p = [-dx, dx, -dy, dy], q = [d.x1 - (h.x0 - e), h.x1 + e - d.x1, d.y1 - (h.y0 - e), h.y1 + e - d.y1];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-12) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
      if (t0 > t1) return false;
    }
  }
  return true;
}

// khe trống giữa các hướng cạnh (rad), sắp từ lớn tới nhỏ: [phân giác, độ rộng]
export function kheTrong(huong: number[]): [number, number][] {
  if (!huong.length) return [[-Math.PI / 2, 2 * Math.PI]];
  const a = [...huong].map((x) => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((x, y) => x - y);
  const ra: [number, number][] = [];
  for (let i = 0; i < a.length; i++) {
    const tu = a[i], den = i + 1 < a.length ? a[i + 1] : a[0] + 2 * Math.PI;
    ra.push([(tu + den) / 2, den - tu]);
  }
  return ra.sort((x, y) => y[1] - x[1]);
}

export type VungAn = {x0: number; y0: number; x1: number; y1: number};

export function datNhanKG(ds: DiemNhan[], doan: DoanCan[], cham: {x: number; y: number; r: number}[], vung: VungAn, tam: {x: number; y: number}, co = CO_NHAN): HopNhan[] {
  const da: (HopNhan & {b: Hop})[] = [];
  const thuTu = [...ds].sort((a, b) => b.uuTien - a.uuTien || b.huongCanh.length - a.huongCanh.length);
  for (const p of thuTu) {
    const {w, h} = kichNhan(p.chu || p.ten, p.chu && p.chu.length > 3 ? co * 0.72 : co);
    const ra = Math.atan2(p.y - tam.y, p.x - tam.x);
    const khe = kheTrong(p.huongCanh);
    // ứng viên: phân giác các khe (rộng trước) + lệch ±25° trong khe rộng; 3 khoảng đẩy
    const goc: {g: number; phat: number}[] = [];
    khe.forEach(([g, rong], k) => {
      const lechRa = Math.abs(Math.atan2(Math.sin(g - ra), Math.cos(g - ra)));
      goc.push({g, phat: k * 6 + lechRa * 2.2 + (rong < 0.6 ? 14 : 0)});
      if (rong > 1.4) for (const l of [-0.42, 0.42]) goc.push({g: g + l, phat: k * 6 + 3 + Math.abs(Math.atan2(Math.sin(g + l - ra), Math.cos(g + l - ra))) * 2.2});
    });
    let tot: {x: number; y: number; diem: number} | null = null;
    for (const kc of [1, 1.35, 1.8, 2.4]) {
      for (const c of goc) {
        const ux = Math.cos(c.g), uy = Math.sin(c.g);
        // khoảng từ tâm điểm tới tâm hộp theo hướng (u): đủ để hộp không chạm chấm điểm
        const r = (11 + Math.abs(ux) * w / 2 + Math.abs(uy) * h / 2) * kc;
        const x = p.x + ux * r, y = p.y + uy * r;
        const b = hop(x, y, w, h);
        let diem = c.phat + (kc - 1) * 9;
        if (b.x0 < vung.x0 || b.x1 > vung.x1 || b.y0 < vung.y0 || b.y1 > vung.y1) diem += 400;
        for (const o of da) if (chongHop(b, o.b) > 0) diem += 300 + chongHop(b, o.b) / 10;
        for (const d of doan) if (doanCatHop(d, b, 2)) diem += d.a === p.ten || d.b === p.ten ? 60 : 45;
        for (const q of cham) {
          const qx = Math.max(b.x0, Math.min(q.x, b.x1)), qy = Math.max(b.y0, Math.min(q.y, b.y1));
          if (Math.hypot(q.x - qx, q.y - qy) < q.r + 3) diem += 120;
        }
        if (!tot || diem < tot.diem) tot = {x, y, diem};
      }
      if (tot && tot.diem < 40) break;
    }
    const kq = tot!;
    da.push({ten: p.ten, x: kq.x, y: kq.y, w, h, dx: kq.x - p.x, dy: kq.y - p.y, b: hop(kq.x, kq.y, w, h)});
  }
  const theoTen = new Map(da.map((x) => [x.ten, x]));
  return ds.map((p) => {
    const x = theoTen.get(p.ten)!;
    return {ten: x.ten, x: x.x, y: x.y, w: x.w, h: x.h, dx: x.dx, dy: x.dy};
  });
}
