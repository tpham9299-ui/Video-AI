// CẢNH THỰC TẾ TỰ DỰNG (vật "canh_that"): kịch bản KHÔNG phải tự tính tọa độ (AI hay tính sai). Nó chỉ mô tả theo NGHĨA:
// vật gì, cao bao nhiêu mét, đứng ở mét thứ mấy, đo cái gì (khoảng cách, chiều cao, tia nhìn + góc nâng, bóng nắng...).
// Máy tự đặt tỉ lệ, dựng đúng vật (thư viện vatthuc) và vẽ các đường đo kiểu bản vẽ kỹ thuật / Manim, rồi chuyển thành
// một hinh_tu_do bình thường (dùng lại toàn bộ hiệu ứng: vẽ dần, chọn, tách, lớp chú thích phẳng...).
//
// NHÌN NGANG (mặc định) - bài đo chiều cao, khoảng cách, góc nâng/hạ, bóng nắng, thang dựa tường:
//   {"loai":"canh_that","nhin":"ngang","don_vi":"m",
//    "vat":[{"ma":"A","ten":"nguoi","cao":1.6,"x":0},{"ma":"B","ten":"cot_co","cao":15.6,"x":20}],
//    "diem":[{"ma":"H","x":20,"cao":1.6}],
//    "do":[{"kieu":"khoang_cach","tu":"A","den":"B","nhan":"20 m"},{"kieu":"chieu_cao","vat":"B","nhan":"h = ?"},
//          {"kieu":"tia","tu":"A.mat","den":"B.dinh","goc":"35°"},{"kieu":"tam_giac","dinh":["A.mat","H","B.dinh"]},{"kieu":"vuong","tai":"H"}]}
//   Điểm neo: "A" = chân vật A, "A.dinh" đỉnh, "A.mat" mắt (người), "A.giua" giữa thân, hoặc mã một "diem".
//   Vật đứng trên vật khác: "tren":"B" (vd người đứng trên nóc tòa nhà).
// NHÌN TỪ TRÊN - bài mảnh vườn, hàng rào, ruộng, sân, hồ bơi, khoảng cách trên mặt đất:
//   {"loai":"canh_that","nhin":"tren","vung":[{"ma":"V","ten":"vuon","x":0,"y":0,"rong":20,"dai":15,"hang_rao":true,"canh":["20 m","15 m"],"nhan":"Vườn rau"}],
//    "vat":[{"ma":"N","ten":"nha","x":-6,"y":4,"cao":5}], "do":[{"kieu":"doan","tu":"V.tl","den":"V.br","nhan":"d = ?"}]}
//   Điểm neo vùng: V.tl V.tr V.bl V.br (góc trên-trái...), V.giua, V.tren V.duoi V.trai V.phai (trung điểm cạnh).
import {TI_LE_RONG} from './vatthuc';

type R = Record<string, unknown>;
type D = [number, number];
const so = (v: unknown, mac = 0) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(String(v).replace(',', '.')) : NaN;
  return isFinite(n) ? n : mac;
};
const chuoi = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const mang = (v: unknown): R[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') as R[] : []);
const W = 100, H = 80;
const nhanTex = (s: string) => s.replace(/(\d),(\d)/g, '$1{,}$2').replace(/°/g, '^\\circ').replace(/\s*m$/, '\\,m');

export function canhThatSangHinh(raw: R): R {
  const nhin = chuoi(raw.nhin) === 'tren' ? 'tren' : 'ngang';
  const hinh = nhin === 'tren' ? dungTren(raw) : dungNgang(raw);
  return {id: raw.id, loai: 'hinh_tu_do', x: raw.x ?? 50, y: raw.y ?? 50, co: raw.co, buoc: raw.buoc ?? 1, khung: [W, H], noi_dung: raw.noi_dung, tu_huong: raw.tu_huong, hinh};
}

/* ------------------------------ NHÌN NGANG ------------------------------ */
function dungNgang(raw: R): R[] {
  const vat = mang(raw.vat).slice(0, 10);
  const diem = mang(raw.diem).slice(0, 10);
  const doRaw = mang(raw.do).slice(0, 16);
  const trangTri = vat.filter((v) => ['mat_troi', 'may_bay', 'khinh_khi_cau'].includes(chuoi(v.ten)) && v.x === undefined);
  const chinh = vat.filter((v) => !trangTri.includes(v));
  // chiều cao thật (m) của từng vật, kể cả khi đứng trên vật khác
  const theoMa = new Map<string, R>();
  chinh.forEach((v) => theoMa.set(chuoi(v.ma), v));
  const nen = (v: R, sau = 0): number => {
    const t = theoMa.get(chuoi(v.tren));
    return t && sau < 4 ? nen(t, sau + 1) + so(t.cao, 1) : so(v.y_nen, 0);
  };
  const rongM = (v: R) => (v.rong !== undefined ? so(v.rong, 1) : so(v.cao, 1) * (TI_LE_RONG[chuoi(v.ten)] || 1));
  let x0 = Infinity, x1 = -Infinity, hMax = 0.001;
  const mo = (a: number, b: number) => { x0 = Math.min(x0, a); x1 = Math.max(x1, b); };
  chinh.forEach((v) => {
    const x = so(v.x);
    if (chuoi(v.ten) === 'thang' && v.dinh_x !== undefined) { mo(Math.min(x, so(v.dinh_x)), Math.max(x, so(v.dinh_x))); hMax = Math.max(hMax, so(v.dinh_cao)); return; }
    mo(x - rongM(v) / 2, x + rongM(v) / 2); hMax = Math.max(hMax, nen(v) + so(v.cao, 1));
  });
  diem.forEach((d) => { mo(so(d.x), so(d.x)); hMax = Math.max(hMax, so(d.cao)); });
  doRaw.forEach((d) => { if (chuoi(d.kieu) === 'bong') { const v = theoMa.get(chuoi(d.vat)); if (v) mo(so(v.x), so(v.x) + so(d.dai) * (so(d.huong, 1) < 0 ? -1 : 1)); } });
  if (!isFinite(x0)) { x0 = 0; x1 = 10; }
  const yDat = 68, rongCo = 84, caoCo = 52;
  const k = Math.min(rongCo / Math.max(0.001, x1 - x0), caoCo / hMax);
  const lechX = 8 + (rongCo - (x1 - x0) * k) / 2;
  const X = (xm: number) => lechX + (xm - x0) * k;
  const Y = (hm: number) => yDat - hm * k;
  // vật thấp quá (người 1,6 m cạnh tháp 100 m) vẫn vẽ đủ lớn để nhìn rõ; các điểm neo tính theo kích thước VẼ
  const caoVe = (v: R) => Math.max(so(v.cao, 1) * k, chuoi(v.ten) === 'nguoi' ? 7 : 4);
  const neo = new Map<string, D>();
  const huongMat = new Map<string, number>();
  chinh.forEach((v) => {
    const ma = chuoi(v.ma);
    const x = X(so(v.x));
    const t = theoMa.get(chuoi(v.tren));
    const yNen = t ? (neo.get(chuoi(t.ma) + '.dinh') || [x, Y(nen(v))])[1] : Y(nen(v));
    const c = caoVe(v);
    neo.set(ma, [x, yNen]);
    neo.set(ma + '.chan', [x, yNen]);
    neo.set(ma + '.dinh', [x, yNen - c * (chuoi(v.ten) === 'cot_co' ? 0.97 : 1)]);
    neo.set(ma + '.giua', [x, yNen - c / 2]);
    neo.set(ma + '.mat', [x + (v.lat === true ? -1 : 1) * c * 0.05, yNen - c * 0.93]);
    huongMat.set(ma, v.lat === true ? -1 : 1);
  });
  diem.forEach((d) => neo.set(chuoi(d.ma), [X(so(d.x)), Y(so(d.cao))]));
  // vật được đo chiều cao: nhãn đặt trên đường đo, không đặt cạnh vật nữa
  const coDoCao = new Set(doRaw.filter((d) => chuoi(d.kieu) === 'chieu_cao').map((d) => chuoi(d.vat)));
  const out: R[] = [{kieu: 'duong', diem: [[3, yDat], [97, yDat]], mau: 'xam', net: 3, buoc: 1}];
  trangTri.forEach((v, i) => out.push({kieu: 'vat', ten: chuoi(v.ten), goc: [14 + i * 70, 13], cao: 12, buoc: v.buoc ?? 1, mau: v.mau}));
  chinh.forEach((v) => {
    const ma = chuoi(v.ma);
    const [x, y] = neo.get(ma)!;
    if (chuoi(v.ten) === 'thang' && v.dinh_x !== undefined) {
      // THANG DỰA TƯỜNG: chân tại x, đầu thang chạm điểm (dinh_x, dinh_cao) -> vẽ đúng độ nghiêng
      const dinh: D = [X(so(v.dinh_x)), Y(so(v.dinh_cao))];
      neo.set(ma + '.dinh', dinh);
      neo.set(ma + '.giua', [(x + dinh[0]) / 2, (y + dinh[1]) / 2]);
      out.push({kieu: 'vat', ten: 'thang', diem: [[x, y], dinh], mau: v.mau, buoc: v.buoc ?? 1, nhan: v.nhan});
      return;
    }
    out.push({kieu: 'vat', ten: chuoi(v.ten), goc: [x, y], cao: caoVe(v), rong: v.rong !== undefined ? so(v.rong) * k : undefined, lat: v.lat === true,
      bien: v.bien, emoji: v.emoji, mau: v.mau, buoc: v.buoc ?? 1, nhan: coDoCao.has(ma) ? undefined : v.nhan});
  });
  const lay = (s: unknown): D | null => neo.get(chuoi(s)) || null;
  const soDoCao = new Map<string, number>();   // nhiều đường đo cùng một bên vật -> lùi dần ra ngoài, không chồng nhãn
  for (const d of doRaw) {
    const kieu = chuoi(d.kieu);
    const buoc = d.buoc ?? 2;
    const nhan = chuoi(d.nhan);
    const mau = d.mau || (kieu === 'tia' ? 'vang' : 'trang');
    if (kieu === 'khoang_cach') {
      const a = lay(d.tu), b = lay(d.den);
      if (!a || !b) continue;
      const y = Math.max(a[1], b[1]) + 5;
      out.push({kieu: 'duong', diem: [[a[0], y], [b[0], y]], mau, net: 2, buoc});
      out.push({kieu: 'duong', diem: [[a[0], y - 2], [a[0], y + 2]], mau, net: 2, buoc});
      out.push({kieu: 'duong', diem: [[b[0], y - 2], [b[0], y + 2]], mau, net: 2, buoc});
      if (nhan) out.push({kieu: 'chu', tam: [(a[0] + b[0]) / 2, y + 5], noi_dung: nhanTex(nhan), buoc});
    } else if (kieu === 'chieu_cao') {
      const ma = chuoi(d.vat);
      const v = theoMa.get(ma);
      const a = lay(d.tu || ma), b = lay(d.den || ma + '.dinh');
      if (!a || !b) continue;
      const ben = chuoi(d.ben) === 'trai' ? -1 : 1;
      const lech = v ? (rongM(v) * k) / 2 + 3 : 3;
      const thu = soDoCao.get(ma + ben) || 0;
      soDoCao.set(ma + ben, thu + 1);
      const x = a[0] + ben * (Math.max(3, Math.min(14, lech)) + thu * 11);
      out.push({kieu: 'duong', diem: [[x, a[1]], [x, b[1]]], mau, net: 2, buoc});
      out.push({kieu: 'duong', diem: [[x - 1.6, a[1]], [x + 1.6, a[1]]], mau, net: 2, buoc});
      out.push({kieu: 'duong', diem: [[x - 1.6, b[1]], [x + 1.6, b[1]]], mau, net: 2, buoc});
      if (nhan) out.push({kieu: 'chu', tam: [x + ben * 6, (a[1] + b[1]) / 2], noi_dung: nhanTex(nhan), buoc});
    } else if (kieu === 'tia' || kieu === 'doan') {
      const a = lay(d.tu), b = lay(d.den);
      if (!a || !b) continue;
      out.push({kieu: 'duong', diem: [a, b], mau, net: kieu === 'tia' ? 3 : 2.5, dut: kieu === 'tia' ? d.dut !== false : d.dut === true, buoc});
      if (kieu === 'tia' && chuoi(d.goc)) {
        // góc nâng / góc hạ: đường ngang tham chiếu từ điểm nhìn + cung góc + nhãn
        out.push({kieu: 'duong', diem: [a, [b[0], a[1]]], mau: 'trang', net: 1.6, dut: true, buoc});
        const theta = (Math.atan2(a[1] - b[1], Math.abs(b[0] - a[0])) * 180) / Math.PI; // >0 nhìn lên
        const phai = b[0] >= a[0];
        const goc0 = phai ? 0 : 180;
        const goc1 = phai ? -theta : 180 + theta;
        const r = 8;
        out.push({kieu: 'cung', tam: a, r, tu: Math.min(goc0, goc1), den: Math.max(goc0, goc1), mau: 'vang', net: 3, buoc});
        const g = (((goc0 + goc1) / 2) * Math.PI) / 180;
        out.push({kieu: 'chu', tam: [a[0] + Math.cos(g) * r * 1.9, a[1] + Math.sin(g) * r * 1.9], noi_dung: nhanTex(chuoi(d.goc)), buoc});
      }
      if (nhan) {
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        out.push({kieu: 'chu', tam: [mx - ((b[1] - a[1]) / L) * 5, my + ((b[0] - a[0]) / L) * 5], noi_dung: nhanTex(nhan), buoc});
      }
    } else if (kieu === 'bong') {
      const ma = chuoi(d.vat);
      const a = lay(ma), dinh = lay(ma + '.dinh');
      if (!a || !dinh) continue;
      const huong = so(d.huong, 1) < 0 ? -1 : 1;
      const xb = a[0] + huong * so(d.dai) * k;
      out.push({kieu: 'da_giac', diem: [[a[0], a[1] - 0.7], [xb, a[1] - 0.25], [xb, a[1] + 0.25], [a[0], a[1] + 0.7]], mau: 'xam', to: 'xam', do_to: 0.6, net: 1, buoc});
      out.push({kieu: 'duong', diem: [[dinh[0] - huong * (xb - a[0]) * 0.35, dinh[1] - (a[1] - dinh[1]) * 0.35], [xb, a[1]]], mau: 'vang', net: 2, dut: true, buoc});
      if (nhan) out.push({kieu: 'chu', tam: [(a[0] + xb) / 2, a[1] + 6], noi_dung: nhanTex(nhan), buoc});
    } else if (kieu === 'tam_giac') {
      const ds = (Array.isArray(d.dinh) ? d.dinh : []).map(lay).filter(Boolean) as D[];
      if (ds.length >= 3) out.push({kieu: 'da_giac', diem: ds.slice(0, 4), mau: d.mau || 'cam', to: d.mau || 'cam', do_to: 0.16, net: 2, buoc});
    } else if (kieu === 'vuong') {
      const p = lay(d.tai);
      if (!p) continue;
      const s = chuoi(d.huong) === 'phai' ? 1 : -1;
      out.push({kieu: 'duong', diem: [[p[0] + s * 2.6, p[1]], [p[0] + s * 2.6, p[1] - 2.6], [p[0], p[1] - 2.6]], mau: 'trang', net: 1.8, buoc});
    } else if (kieu === 'chu') {
      const p = lay(d.tai);
      if (p && nhan) out.push({kieu: 'chu', tam: [p[0], p[1] - 4], noi_dung: nhanTex(nhan), buoc});
    }
  }
  return out;
}

/* ------------------------------ NHÌN TỪ TRÊN ------------------------------ */
const MAU_VUNG: Record<string, [string, string]> = {
  vuon: ['xanh_la', 'xanh_la'], ruong: ['vang', 'vang'], san: ['xam', 'xam'], san_bong: ['xanh_la', 'xanh_la'], ho_boi: ['xanh_duong', 'xanh_duong'],
  ho: ['xanh_duong', 'xanh_duong'], dat: ['nau', 'nau'], nha: ['cam', 'cam'], song: ['xanh_duong', 'xanh_duong'], duong: ['xam', 'xam'], be: ['xanh_duong', 'xanh_duong'],
};
function dungTren(raw: R): R[] {
  const vung = mang(raw.vung).slice(0, 6);
  const vat = mang(raw.vat).slice(0, 10);
  const diem = mang(raw.diem).slice(0, 10);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const mo = (x: number, y: number) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  vung.forEach((v) => { mo(so(v.x), so(v.y)); mo(so(v.x) + so(v.rong, 10), so(v.y) + so(v.dai, 10)); });
  vat.forEach((v) => { const r = so(v.cao, 2) * 0.6; mo(so(v.x) - r, so(v.y) - r); mo(so(v.x) + r, so(v.y) + r); });
  diem.forEach((d) => mo(so(d.x), so(d.y)));
  if (!isFinite(x0)) { x0 = 0; x1 = 10; y0 = 0; y1 = 10; }
  const k = Math.min(78 / Math.max(0.001, x1 - x0), 62 / Math.max(0.001, y1 - y0));
  const lx = 11 + (78 - (x1 - x0) * k) / 2, ly = 9 + (62 - (y1 - y0) * k) / 2;
  const P = (x: number, y: number): D => [lx + (x - x0) * k, ly + (y - y0) * k];
  const neo = new Map<string, D>();
  const out: R[] = [];
  vung.forEach((v) => {
    const ma = chuoi(v.ma), ten = chuoi(v.ten) || 'dat';
    const [ax, ay] = P(so(v.x), so(v.y));
    const w = so(v.rong, 10) * k, h = so(v.dai, 10) * k;
    const [mau] = MAU_VUNG[ten] || ['xanh_la'];
    const buoc = v.buoc ?? 1;
    out.push({kieu: 'da_giac', diem: [[ax, ay], [ax + w, ay], [ax + w, ay + h], [ax, ay + h]], mau, to: mau, do_to: 0.22, net: 2.5, buoc});
    // hoa văn nhận ra loại vùng
    if (ten === 'vuon') {
      const nx = Math.max(2, Math.round(w / 7)), ny = Math.max(2, Math.round(h / 7));
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) out.push({kieu: 'tron', tam: [ax + ((i + 0.5) * w) / nx, ay + ((j + 0.5) * h) / ny], r: Math.min(w / nx, h / ny) * 0.22, mau: 'xanh_la', to: 'xanh_la', do_to: 0.5, net: 1, buoc});
    } else if (ten === 'ruong') {
      for (let i = 1; i < 6; i++) out.push({kieu: 'duong', diem: [[ax + 1, ay + (i * h) / 6], [ax + w - 1, ay + (i * h) / 6]], mau: 'vang', net: 1, buoc});
    } else if (ten === 'san_bong') {
      out.push({kieu: 'duong', diem: [[ax + w / 2, ay], [ax + w / 2, ay + h]], mau: 'trang', net: 1.5, buoc});
      out.push({kieu: 'tron', tam: [ax + w / 2, ay + h / 2], r: Math.min(w, h) * 0.15, mau: 'trang', net: 1.5, buoc});
    } else if (ten === 'ho_boi' || ten === 'be') {
      for (let i = 1; i < 5; i++) out.push({kieu: 'duong', diem: [[ax, ay + (i * h) / 5], [ax + w, ay + (i * h) / 5]], mau: 'trang', net: 1, dut: true, buoc});
    } else if (ten === 'song') {
      for (let i = 1; i < 3; i++) out.push({kieu: 'duong', diem: Array.from({length: 9}, (_, q) => [ax + (q * w) / 8, ay + (i * h) / 3 + Math.sin(q * 1.4) * 1]), mau: 'trang', net: 1, buoc});
    }
    if (v.hang_rao === true) {
      // HÀNG RÀO quanh vùng: viền nâu dày + cọc rào đều
      out.push({kieu: 'da_giac', diem: [[ax, ay], [ax + w, ay], [ax + w, ay + h], [ax, ay + h]], mau: 'nau', net: 4, buoc: (buoc as number) + 1});
      const chuVi = 2 * (w + h), n = Math.max(8, Math.round(chuVi / 5));
      for (let i = 0; i < n; i++) {
        let d = (i * chuVi) / n;
        let p: D;
        if (d < w) p = [ax + d, ay]; else if ((d -= w) < h) p = [ax + w, ay + d]; else if ((d -= h) < w) p = [ax + w - d, ay + h]; else p = [ax, ay + h - (d - w)];
        out.push({kieu: 'tron', tam: p, r: 0.9, mau: 'nau', to: 'nau', do_to: 1, net: 1, buoc: (buoc as number) + 1});
      }
    }
    const canh = Array.isArray(v.canh) ? v.canh.map(chuoi) : [];
    if (canh[0]) out.push({kieu: 'chu', tam: [ax + w / 2, ay - 4], noi_dung: nhanTex(canh[0]), buoc: (buoc as number) + 1});
    if (canh[1]) out.push({kieu: 'chu', tam: [ax + w + 7, ay + h / 2], noi_dung: nhanTex(canh[1]), buoc: (buoc as number) + 1});
    if (chuoi(v.nhan)) out.push({kieu: 'chu', tam: [ax + w / 2, ay + h / 2], noi_dung: nhanTex(chuoi(v.nhan)), buoc});
    const ds: [string, D][] = [['tl', [ax, ay]], ['tr', [ax + w, ay]], ['bl', [ax, ay + h]], ['br', [ax + w, ay + h]], ['giua', [ax + w / 2, ay + h / 2]],
      ['tren', [ax + w / 2, ay]], ['duoi', [ax + w / 2, ay + h]], ['trai', [ax, ay + h / 2]], ['phai', [ax + w, ay + h / 2]]];
    ds.forEach(([t, p]) => neo.set(ma + '.' + t, p));
    neo.set(ma, [ax + w / 2, ay + h / 2]);
  });
  vat.forEach((v) => {
    const ma = chuoi(v.ma);
    const [x, y] = P(so(v.x), so(v.y));
    const c = Math.max(5, so(v.cao, 3) * k);
    out.push({kieu: 'vat', ten: chuoi(v.ten), goc: [x, y + c / 2], cao: c, bien: v.bien, emoji: v.emoji, mau: v.mau, buoc: v.buoc ?? 1, nhan: v.nhan});
    neo.set(ma, [x, y]);
  });
  diem.forEach((d) => neo.set(chuoi(d.ma), P(so(d.x), so(d.y))));
  const lay = (s: unknown): D | null => neo.get(chuoi(s)) || null;
  for (const d of mang(raw.do).slice(0, 12)) {
    const a = lay(d.tu), b = lay(d.den);
    if (!a || !b) continue;
    const buoc = d.buoc ?? 2;
    out.push({kieu: 'duong', diem: [a, b], mau: d.mau || 'vang', net: 2.5, dut: d.dut === true || chuoi(d.kieu) === 'tia', buoc});
    if (chuoi(d.nhan)) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      out.push({kieu: 'chu', tam: [(a[0] + b[0]) / 2 - ((b[1] - a[1]) / L) * 4, (a[1] + b[1]) / 2 + ((b[0] - a[0]) / L) * 4], noi_dung: nhanTex(chuoi(d.nhan)), buoc});
    }
  }
  return out;
}
