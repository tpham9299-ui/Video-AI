// v90 — ĐẶT NHÃN SAU KHI CHIẾU (2D): mỗi nhãn thử nhiều vị trí quanh điểm neo (xoay hướng đẩy × 3 khoảng cách) và chọn
// vị trí ít va chạm nhất với: nhãn đã đặt, các điểm (chấm), thân nét chính/mũi tên. Sau đó một lượt đẩy nhẹ các nhãn còn
// sát nhau theo khoảng cách 2D. Nhãn của đoạn/vector ưu tiên hướng VUÔNG GÓC với thân (không nằm đè lên mũi tên).
export type NhanVao = {x: number; y: number; ax: number; ay: number; tex: string; co: number; huong?: [number, number]};
export type NhanRa = {x: number; y: number; w?: number; h?: number};
export type VatCan = {cham: {x: number; y: number; r: number}[]; doan: {x1: number; y1: number; x2: number; y2: number; w: number}[]};

// bề rộng ước lượng của nhãn KaTeX (bỏ lệnh \vec, \alpha... đếm như một ký tự)
export const rongNhan = (tex: string, co: number) => {
  const s = tex.replace(/\\(vec|overrightarrow|mathrm|text|max|min)\b/g, (m) => (m === '\\max' || m === '\\min' ? 'aaa' : '')).replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}^_\s]/g, '');
  return Math.max(1, s.length) * co * 0.62 + 8;
};

type Hop = {x0: number; y0: number; x1: number; y1: number};
const hopCua = (x: number, y: number, w: number, h: number): Hop => ({x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2});
const chong = (a: Hop, b: Hop) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

// đoạn thẳng có đi qua hộp (nới thêm e) không: lấy mẫu dọc đoạn
function doanCatHop(d: VatCan['doan'][number], h: Hop, e: number): boolean {
  const L = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
  const n = Math.max(2, Math.min(24, Math.ceil(L / 10)));
  for (let i = 0; i <= n; i++) {
    const x = d.x1 + ((d.x2 - d.x1) * i) / n, y = d.y1 + ((d.y2 - d.y1) * i) / n;
    if (x > h.x0 - e && x < h.x1 + e && y > h.y0 - e && y < h.y1 + e) return true;
  }
  return false;
}

export function datNhan(ds: NhanVao[], W: number, H: number, vc: VatCan = {cham: [], doan: []}): NhanRa[] {
  const da: Hop[] = [];
  const LECH = [0, 30, -30, 60, -60, 95, -95, 135, -135, 180];
  const KHOANG = [1, 1.45, 2];
  const ra: (NhanRa & {w: number; h: number})[] = ds.map((n) => {
    let dx: number, dy: number;
    if (n.huong) [dx, dy] = n.huong;
    else {
      dx = n.x - n.ax;
      dy = n.y - n.ay;
    }
    const l = Math.hypot(dx, dy);
    if (l < 1e-3) { dx = 0; dy = -1; } else { dx /= l; dy /= l; }
    const w = rongNhan(n.tex, n.co), h = n.co * 1.25;
    let tot = {x: n.x, y: n.y, diem: Infinity};
    for (const k of KHOANG) {
      for (const g of LECH) {
        const r = (g * Math.PI) / 180;
        const ux = dx * Math.cos(r) - dy * Math.sin(r), uy = dx * Math.sin(r) + dy * Math.cos(r);
        // khoảng đẩy theo hướng: chữ rộng thì đẩy ngang xa hơn
        const xa = (n.co * 0.5 + 8 + (Math.abs(ux) * w) / 2) * k;
        const ya = (n.co * 0.5 + 8 + (Math.abs(uy) * h) / 2) * k;
        const x = Math.min(W - w / 2 - 6, Math.max(w / 2 + 6, n.x + ux * xa));
        const y = Math.min(H - h / 2 - 4, Math.max(h / 2 + 4, n.y + uy * ya));
        const hop = hopCua(x, y, w, h);
        let diem = (Math.abs(g) / 45) * 1.2 + (k - 1) * 3;
        for (const b of da) diem += (chong(hop, b) / (w * h)) * 400 + (chong(hop, b) > 0 ? 60 : 0);
        for (const c of vc.cham) {
          const qx = Math.max(hop.x0, Math.min(c.x, hop.x1)), qy = Math.max(hop.y0, Math.min(c.y, hop.y1));
          if (Math.hypot(c.x - qx, c.y - qy) < c.r + 3) diem += 25;
        }
        for (const d of vc.doan) if (doanCatHop(d, hop, d.w / 2 + 2)) diem += 9;
        if (diem < tot.diem) tot = {x, y, diem};
        if (diem < 0.01) break;
      }
      if (tot.diem < 2) break;
    }
    da.push(hopCua(tot.x, tot.y, w, h));
    return {x: tot.x, y: tot.y, w, h};
  });
  // lượt đẩy nhẹ: hai nhãn còn chồng nhau thì đẩy ra hai phía theo đường nối tâm
  for (let lap = 0; lap < 4; lap++) {
    for (let i = 0; i < ra.length; i++) for (let j = i + 1; j < ra.length; j++) {
      const a = ra[i], b = ra[j];
      const ox = (a.w + b.w) / 2 + 4 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 + 2 - Math.abs(a.y - b.y);
      if (ox <= 0 || oy <= 0) continue;
      if (ox < oy) {
        const s = (a.x <= b.x ? -1 : 1) * ox / 2;
        a.x += s; b.x -= s;
      } else {
        const s = (a.y <= b.y ? -1 : 1) * oy / 2;
        a.y += s; b.y -= s;
      }
    }
    for (const n of ra) {
      n.x = Math.min(W - n.w / 2 - 6, Math.max(n.w / 2 + 6, n.x));
      n.y = Math.min(H - n.h / 2 - 4, Math.max(n.h / 2 + 4, n.y));
    }
  }
  return ra.map(({x, y, w, h}) => ({x, y, w, h}));
}

// v92 SMART LEADER LINES: nhãn bị đẩy xa điểm neo (chỗ chật) -> nét dẫn mảnh từ điểm neo tới mép hộp nhãn.
export function netDan(n: {x: number; y: number; co: number}, r: NhanRa): {x1: number; y1: number; x2: number; y2: number} | null {
  const w = r.w ?? n.co, h = r.h ?? n.co * 1.25;
  const dx = r.x - n.x, dy = r.y - n.y;
  const L = Math.hypot(dx, dy);
  if (L < n.co * 0.9 + 30) return null;
  // điểm trên mép hộp nhãn theo hướng về điểm neo
  const t = Math.min(w / 2 / Math.max(1e-6, Math.abs(dx)), h / 2 / Math.max(1e-6, Math.abs(dy)));
  const ex = r.x - dx * Math.min(1, t) - (dx / L) * 4, ey = r.y - dy * Math.min(1, t) - (dy / L) * 4;
  return {x1: n.x + (dx / L) * 7, y1: n.y + (dy / L) * 7, x2: ex, y2: ey};
}
