// HÌNH TỰ DO: vẽ ĐÚNG hình của đề (không phải chọn vật gần giống). Kịch bản mô tả hình bằng các "nét" trong một khung tọa độ
// riêng (khung: [rộng, cao], gốc trên-trái, y hướng xuống): đa giác, đường gấp khúc, đường tròn, cung, mũi tên, chữ, đường SVG,
// đa giác đều, đường cong tham số, nhân bản (lặp) và các bộ SINH HÌNH cho dạng khó vẽ tay: bông tuyết Koch, tam giác Sierpinski.
// Vẽ kiểu Manim: từng nét vẽ dần (Create), tô màu hiện sau, nhãn bật lên. Bộ sinh hình có số lần lặp "biến hình" liên tục theo
// giá trị của vật (hành động dat_gia_tri: 0 -> 1 -> 2 -> 3), ví dụ bông tuyết mọc thêm gai ngay trước mắt người xem.
import React from 'react';
import {FONT_DAM} from '../theme';
import {Toan} from '../Toan';
import {phanTichBieuThuc} from './bieuthuc';
import {easeOut, kep, neon, popOut} from './donghieu';
import {PhanHinh, Vat} from './dulieu';
import {TrangThai} from './trangthai';
import {GIAO_DIEN, laMoi} from '../theme';
import {VongSong} from '../dong/DiemNhan';
import {KhongGian3D, toiMau} from '../dong/KhongGian';

type D = [number, number];
const CAM = '#FF8A3D';
const TRANG = '#EAF2F4';
const MAU_MAC = ['xanh_duong', 'xanh_la', 'cam', 'tim', 'hong', 'vang'];

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
type Net = {d: string; kin: boolean; tam: D; mo?: number; ds?: D[]}; // ds: các điểm của nét (để đặt đầu sao chổi)
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
  return (
    <div style={{position: 'relative', width: W, height: H}}>
      {v.noiDung ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: -58, textAlign: 'center', fontFamily: FONT_DAM, fontWeight: 900, fontSize: 40, color: TRANG, opacity: kep(t * 3), textShadow: '0 2px 8px rgba(0,0,0,0.7)'}}>{v.noiDung}</div>
      ) : null}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <marker id={`mt_${v.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={TRANG} />
          </marker>
        </defs>
        <g transform={`scale(${s})`}>
          {v.hinh.map((h, i) => {
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
              const vt = h.viTriNhan || nets[0]?.tam || h.tam;
              if (moi) nhan.push(<VongSong key={`vs${i}`} x={vt[0] * s} y={vt[1] * s} p={(t - bd - 0.5) / 0.9} mau={GIAO_DIEN.nhan} R={70} />);
              nhan.push(
                <div key={`n${i}`} style={{position: 'absolute', left: vt[0] * s, top: vt[1] * s, transform: `translate(-50%,-50%) scale(${popOut(kep((t - bd - 0.5) / 0.35), 1.6)})`, opacity: kep((t - bd - 0.5) * 3) * (1 - 0.6 * lb),
                  background: 'rgba(6,14,18,0.8)', border: `2px solid ${mau}66`, borderRadius: 10, padding: '2px 10px', whiteSpace: 'nowrap'}}>
                  <Toan tex={h.nhan} size={30 * h.coChu} color={c ? mau : TRANG} />
                </div>
              );
            }
            if (h.kieu === 'chu') return null;
            const moTo = kep((t - bd - 0.6) / 0.6) * (1 - 0.6 * lb);
            const khoi = kg.nam && (toMau ? moTo > 0.01 : p > 0) ? nets.flatMap((n, k) => (toMau && n.kin && n.mo === undefined ? Array.from({length: KHOI}, (_, j) => {
              const lop = KHOI - j; // vẽ từ lớp đáy lên
              // hướng đùn luôn là "xuống" trên màn hình dù bàn đang xoay (bù góc xoay của bàn)
              const d = (lop * 3.2) / s;
              const g = (kg.xoay * Math.PI) / 180;
              return <path key={`k${i}_${k}_${j}`} d={n.d} transform={`translate(${d * Math.sin(g)} ${d * Math.cos(g)})`} fill={toiMau(toMau, 0.32 + 0.25 * (j / KHOI))} fillOpacity={Math.min(0.95, 0.55 + (h.doTo || 0.28)) * moTo}
                stroke={j === 0 ? toiMau(mau, 0.5) : 'none'} strokeWidth={j === 0 ? day * 0.8 : 0} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />;
            }) : n.mo === undefined && !h.dut ? Array.from({length: 4}, (_, j) => {
              const d = ((4 - j) * 3.2) / s;
              const g = (kg.xoay * Math.PI) / 180;
              return <path key={`kn${i}_${k}_${j}`} d={n.d} transform={`translate(${d * Math.sin(g)} ${d * Math.cos(g)})`} fill="none" stroke={toiMau(mau, 0.3 + 0.08 * j)} strokeWidth={day} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={kep(p * 3)} />;
            }) : [])) : [];
            return (khoi as React.ReactNode[]).concat(nets.map((n, k) => (
              <path key={`${i}_${k}`} d={n.d} vectorEffect="non-scaling-stroke"
                fill={n.kin && toMau ? toMau : 'none'} fillOpacity={n.mo !== undefined ? 0 : (h.doTo || 0.28) * kep((t - bd - 0.6) / 0.6) * (1 - 0.6 * lb) + (c ? 0.15 * c.p : 0)}
                stroke={n.mo !== undefined ? '#FF5C61' : mau} strokeWidth={day} strokeLinejoin="round" strokeLinecap="round" opacity={(n.mo !== undefined ? n.mo : 1) * (1 - 0.65 * lb) * (h.moNet ?? 1)}
                strokeDasharray={h.dut ? '8 7' : n.mo !== undefined ? '6 5' : undefined}
                markerEnd={h.kieu === 'mui_ten' ? `url(#mt_${v.id})` : undefined}
                {...(h.dut || n.mo !== undefined ? {} : {pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - easeOut(kep(p))})}
                style={{filter: c || st.sang > 0 ? `drop-shadow(0 0 ${8 + 10 * st.sang}px ${mau})` : `drop-shadow(0 0 4px ${mau}88)`}} />
            )) as React.ReactNode[]).concat(moi && !h.dut ? nets.map((n, k) => (n.ds && n.mo === undefined ? <SaoChoi key={`sc${i}_${k}`} ds={n.ds} kin={n.kin} q={easeOut(kep(p))} s={s} mau={mau} /> : null)) : []);
          })}
        </g>
      </svg>
      {/* chữ rời (kieu "chu") */}
      {v.hinh.map((h, i) => {
        if (h.kieu !== 'chu') return null;
        const bd = (h.buoc > 0 && st.tb ? st.tb(h.buoc) - st.ta : 0.1 + i * 0.3) + (treChu.get(i) || 0);
        const a = kep((t - bd) / 0.35);
        const c = st.chon.get(i + 1);
        return (
          <React.Fragment key={`c${i}`}>
            {moi ? <VongSong x={h.tam[0] * s} y={h.tam[1] * s} p={(t - bd) / 0.9} mau={GIAO_DIEN.nhan} R={80} /> : null}
            <div style={{position: 'absolute', left: h.tam[0] * s, top: h.tam[1] * s, transform: `translate(-50%,-50%) scale(${popOut(a, 1.6)})`, opacity: kep(a * 2)}}>
              <Toan tex={h.noiDung} size={34 * h.coChu} color={c ? neon(c.mau, CAM) : h.mau ? neon(h.mau) : TRANG} />
            </div>
          </React.Fragment>
        );
      })}
      {nhan}
    </div>
  );
};
