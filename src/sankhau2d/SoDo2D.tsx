// v96 — SƠ ĐỒ 2D CHUYỂN ĐỘNG / KHOẢNG CÁCH (nhánh 2d_thuc_te): 5 mẫu hình (qua sông rồi chạy bờ, kéo dây cáp giữa hai cột,
// hình chữ nhật dưới cổng parabol, rào sát tường, thang dựa tường). Điểm di động theo biến x (quét qua lại rồi về tối ưu),
// nhãn độ dài cập nhật theo thời gian thực; có hàm thì đồ thị mini bên phải đi cùng.
import React from 'react';
import {CYAN as CYAN_, HO_PHACH, XAM} from '../khung4tang/mau_v981';
import {Toan} from '../Toan';
import type {SoDo2DVao} from './kieu';
import {bienTheoPha, CAO_DONG_KQ, daQua, em, hamMotBien, kep, LE, nhipNhan, soVN, thangDoThi, tho, tienDo} from './chung';
import {CHU, DongKetQua, mau, MO, NhanTex, ThanhTienDo} from './GiaoDien';

type Net = {a: [number, number]; b: [number, number]; mau: string; nhan?: string; dut?: boolean; day?: number};
type Hinh = {net: Net[]; diem: {p: [number, number]; ten: string; mau: string}[]; vung?: {d: string; mau: string}[]};

const so = (ts: Record<string, number>, k: string, md: number) => (Number.isFinite(ts[k]) && ts[k] > 0 ? ts[k] : md);

// dựng hình của mẫu tại giá trị biến x, trong khung r (tọa độ màn hình); an = true -> nhãn số thay bằng ký hiệu
function dungHinh(sk: SoDo2DVao, x: number, r: {x: number; y: number; w: number; h: number}, an: boolean): Hinh {
  const ts = sk.tham_so, C = mau('cyan'), V = mau('vang'), H_ = CYAN_, N = HO_PHACH;   // v98.1: 2 màu nhấn
  const sv = (v: number) => (an ? '?' : soVN(v, 1));
  const dv = sk.don_vi ? `\\,\\text{${sk.don_vi}}` : '';
  if (sk.mau === 'song_bo') {
    const rong = so(ts, 'rong', 3), dai = so(ts, 'dai', 8);
    const s = r.w / (dai * 1.08);
    const yTren = r.y + r.h * 0.22, yDuoi = yTren + Math.min(r.h * 0.5, rong * s);
    const A: [number, number] = [r.x + 8, yDuoi], Ht: [number, number] = [r.x + 8, yTren], M: [number, number] = [r.x + 8 + x * s, yTren], B: [number, number] = [r.x + 8 + dai * s, yTren];
    return {vung: [{d: `M${r.x} ${yTren} L${r.x + r.w} ${yTren} L${r.x + r.w} ${yDuoi} L${r.x} ${yDuoi} Z`, mau: `${C}22`}],
      net: [{a: [r.x, yTren], b: [r.x + r.w, yTren], mau: MO}, {a: [r.x, yDuoi], b: [r.x + r.w, yDuoi], mau: MO},
        {a: A, b: Ht, mau: MO, dut: true, nhan: `${soVN(rong, 1)}${dv}`}, {a: A, b: M, mau: C, day: 3.4, nhan: `${sv(Math.hypot(rong, x))}${dv}`},
        {a: M, b: B, mau: V, day: 3.4, nhan: `${sv(Math.max(0, dai - x))}${dv}`}, {a: Ht, b: M, mau: H_, nhan: `${sk.bien} = ${sv(x)}`}],
      diem: [{p: A, ten: 'A', mau: CHU}, {p: M, ten: 'M', mau: H_}, {p: B, ten: 'B', mau: CHU}]};
  }
  if (sk.mau === 'day_cap') {
    const h1 = so(ts, 'h1', 6), h2 = so(ts, 'h2', 4), d = so(ts, 'd', 10);
    const s = Math.min(r.w / (d * 1.1), (r.h * 0.8) / Math.max(h1, h2));
    const y0 = r.y + r.h * 0.9, x0 = r.x + (r.w - d * s) / 2;
    const P: [number, number] = [x0, y0 - h1 * s], Q: [number, number] = [x0 + d * s, y0 - h2 * s], M: [number, number] = [x0 + x * s, y0];
    return {net: [{a: [r.x, y0], b: [r.x + r.w, y0], mau: MO}, {a: [x0, y0], b: P, mau: CHU, day: 5, nhan: `${soVN(h1, 1)}${dv}`}, {a: [x0 + d * s, y0], b: Q, mau: CHU, day: 5, nhan: `${soVN(h2, 1)}${dv}`},
      {a: P, b: M, mau: C, day: 3, nhan: sv(Math.hypot(h1, x))}, {a: M, b: Q, mau: V, day: 3, nhan: sv(Math.hypot(h2, d - x))}],
      diem: [{p: M, ten: 'M', mau: H_}]};
  }
  if (sk.mau === 'cong_parabol') {
    const w = so(ts, 'rong', 8), h = so(ts, 'cao', 6);
    const s = Math.min(r.w / (w * 1.1), (r.h * 0.85) / h);
    const y0 = r.y + r.h * 0.92, xm = r.x + r.w / 2;
    const cong = Array.from({length: 41}, (_, i) => { const u = -w / 2 + (w * i) / 40; return [xm + u * s, y0 - h * (1 - (2 * u / w) ** 2) * s] as [number, number]; });
    const cao = h * (1 - (2 * x / w) ** 2);
    const net: Net[] = cong.slice(1).map((p, i) => ({a: cong[i], b: p, mau: C, day: 3}));
    net.push({a: [r.x, y0], b: [r.x + r.w, y0], mau: MO});
    const L: [number, number] = [xm - x * s, y0], R: [number, number] = [xm + x * s, y0], LT: [number, number] = [xm - x * s, y0 - cao * s], RT: [number, number] = [xm + x * s, y0 - cao * s];
    net.push({a: L, b: LT, mau: V, day: 3, nhan: sv(cao)}, {a: LT, b: RT, mau: V, day: 3, nhan: `2${sk.bien} = ${sv(2 * x)}`}, {a: RT, b: R, mau: V, day: 3});
    return {vung: [{d: `M${L[0]} ${L[1]} L${LT[0]} ${LT[1]} L${RT[0]} ${RT[1]} L${R[0]} ${R[1]} Z`, mau: `${V}22`}], net, diem: []};
  }
  if (sk.mau === 'rao_tuong') {
    const L = so(ts, 'L', 40);
    const dai = Math.max(0, L - 2 * x);
    const s = Math.min(r.w / (L * 1.02), (r.h * 0.8) / (L / 2));
    const y0 = r.y + 24, xm = r.x + r.w / 2;
    const a: [number, number] = [xm - (dai * s) / 2, y0], b: [number, number] = [xm + (dai * s) / 2, y0];
    const c: [number, number] = [b[0], y0 + x * s], d: [number, number] = [a[0], y0 + x * s];
    return {vung: [{d: `M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]} L${d[0]} ${d[1]} Z`, mau: `${CYAN_}22`}],
      net: [{a: [r.x, y0], b: [r.x + r.w, y0], mau: CHU, day: 6, nhan: 'tường'}, {a: b, b: c, mau: V, day: 3, nhan: `${sk.bien} = ${sv(x)}`}, {a: c, b: d, mau: C, day: 3, nhan: sv(dai)}, {a: d, b: a, mau: V, day: 3}],
      diem: []};
  }
  const h = so(ts, 'h', 4);
  const s = Math.min(r.w / (Math.max(1, x) * 1.6 + 1), (r.h * 0.8) / h);
  const y0 = r.y + r.h * 0.9, xt = r.x + r.w * 0.75;
  const T: [number, number] = [xt, y0 - h * s], G: [number, number] = [xt - x * s, y0];
  return {net: [{a: [r.x, y0], b: [r.x + r.w, y0], mau: MO}, {a: [xt, y0], b: [xt, r.y], mau: CHU, day: 6}, {a: G, b: T, mau: V, day: 4, nhan: sv(Math.hypot(x, h))},
    {a: G, b: [xt, y0], mau: C, nhan: `${sk.bien} = ${sv(x)}`}], diem: [{p: G, ten: '', mau: N}]};
}

// v99.3: cổng chào / mái vòm / thanh giằng CỐ ĐỊNH (không có hàm tối ưu) -> hệ trục Oxy đầy đủ: Ox, Oy, O(0;0), hai chân A, B,
// đỉnh S, thanh giằng ngang hiện ở pha 'keo' (y = tham_so.y), pha 'toi_uu' đổi sang y mới (tham_so.y2) nếu có. Mẫu "hình chữ nhật
// nội tiếp co giãn" ở trên chỉ dùng khi đề tối ưu / cực trị (có ham + x_tot).
const OxyCong: React.FC<{sk: SoDo2DVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const ts = sk.tham_so, w = so(ts, 'rong', 8), h = so(ts, 'cao', 6);
  const r = {x: LE.trai + 30, y: LE.tren + 30, w: W - LE.trai - LE.phai - 60, h: H - LE.tren - LE.duoi - CAO_DONG_KQ - 70};
  const s = Math.min(r.w / (w * 1.25), (r.h * 0.8) / h), xm = r.x + r.w / 2, y0 = r.y + r.h * 0.9;
  const X = (u: number) => xm + u * s, Y = (v: number) => y0 - v * s;
  const nh = nhipNhan(sk.nhip, sk.pha, t);
  const aT = em((t - (sk.pha[0]?.t ?? 0.3)) / 0.5);
  const dK = daQua(sk.pha, 'keo', t), dT = daQua(sk.pha, 'toi_uu', t);
  const y1 = Math.min(h * 0.98, so(ts, 'y', h / 2)), y2 = Number.isFinite(ts.y2) && ts.y2 > 0 ? Math.min(h * 0.98, ts.y2) : y1;
  const y = dT >= 0 && y2 !== y1 ? y1 + (y2 - y1) * em(dT / 0.9) : y1;
  const aBar = em(dK / 0.5);
  const t0 = sk.pha[0]?.t ?? 0.3;
  const uOx = em((t - t0) / 0.6), uOy = em((t - t0 - 0.15) / 0.6), uCong = em((t - t0 - 0.35) / 0.9);
  // nhãn luôn nằm gọn trong khung vẽ (không cắt chữ ở mép)
  const kx = (v: number, bien = 120) => Math.min(W - LE.phai - bien, Math.max(LE.trai + bien, v));
  const u = (w / 2) * Math.sqrt(Math.max(0, 1 - y / h));
  const V = mau('vang'), C = mau('cyan');
  // v99.5: camera zoom/pan bằng viewBox — phóng 1,15x vào thanh giằng khi vào pha 'keo' / 'toi_uu' (smoothstep 0,9 s), thu về toàn cảnh cuối bước.
  // Biên an toàn: viewBox luôn chứa trọn khung O, A, B, S, M, N + nhãn (kz tự hạ nếu không đủ chỗ) và nằm trong [0,W] x [0,H].
  const tKeo = sk.pha.find((p) => p.ten === 'keo')?.t, tToiUu = sk.pha.find((p) => p.ten === 'toi_uu')?.t;
  const tVao = Math.min(tKeo ?? Infinity, tToiUu ?? Infinity);
  const phaSau = tToiUu !== undefined ? sk.pha.find((p) => p.t > tToiUu) : undefined;
  const tRa = phaSau ? phaSau.t : (Number.isFinite(tVao) ? Math.max(tToiUu ?? tVao, tVao) + 3.5 : 0);
  const muot = (x: number) => { const k = kep(x); return k * k * (3 - 2 * k); };
  const kzMuon = Number.isFinite(tVao) ? 1 + 0.15 * muot((t - tVao) / 0.9) * (1 - muot((t - (tRa - 0.9)) / 0.9)) : 1;
  const bx0 = Math.max(0, Math.min(r.x, X(-w / 2) - 90, X(-u) - 150)), bx1 = Math.min(W, Math.max(r.x + r.w + 10, X(w / 2) + 90, X(u) + 150));
  const by0 = Math.max(0, Y(h) - 60), by1 = Math.min(H, y0 + 80);
  const kz = Math.max(1, Math.min(kzMuon, W / Math.max(1, bx1 - bx0), H / Math.max(1, by1 - by0)));
  const vw = W / kz, vh = H / kz;
  const kep2 = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const vx = kep2(xm - vw / 2, Math.max(0, bx1 - vw), Math.min(W - vw, bx0));
  const vy = kep2(Y(y) - vh / 2, Math.max(0, by1 - vh), Math.min(H - vh, by0));
  const cong = Array.from({length: 61}, (_, i) => { const a = -w / 2 + (w * i) / 60; return `${i ? 'L' : 'M'}${X(a).toFixed(1)} ${Y(h * (1 - (2 * a / w) ** 2)).toFixed(1)}`; }).join(' ');
  const xa = r.x, xb = r.x + r.w, yt = Y(h) - 50;
  const f = (v: number) => soVN(v, 1);
  const dv = sk.don_vi ? `\\,\\text{${sk.don_vi}}` : '';
  return (
    <div style={{position: 'absolute', inset: 0, opacity: aT}}>
      <svg width={W} height={H} viewBox={`${vx.toFixed(2)} ${vy.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`} style={{position: 'absolute', inset: 0}}>
        <defs><marker id="mui-oxy" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill={CHU} /></marker></defs>
        {/* v99.5: vẽ nét động — pathLength=1 + strokeDashoffset theo frame (Ox, Oy, parabol), mũi tên chỉ hiện khi nét tới đích */}
        <line x1={xa} y1={y0} x2={xb} y2={y0} stroke={CHU} strokeWidth={2.4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - uOx} markerEnd={uOx > 0.97 ? 'url(#mui-oxy)' : undefined} />
        <line x1={xm} y1={y0 + 24} x2={xm} y2={yt} stroke={CHU} strokeWidth={2.4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - uOy} markerEnd={uOy > 0.97 ? 'url(#mui-oxy)' : undefined} />
        <path d={cong} fill="none" stroke={C} strokeWidth={3.4 + nh} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - uCong} />
        {aBar > 0 ? <>
          <line x1={X(-u)} y1={Y(y)} x2={X(-u) + 2 * u * s} y2={Y(y)} stroke={V} strokeWidth={3.6 + nh} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - aBar} />
          <line x1={xm - 12} y1={Y(y)} x2={xm + 12} y2={Y(y)} stroke={V} strokeOpacity={0.6 * aBar} strokeWidth={2} />
          {[-u, u].map((a, k) => <g key={k} opacity={aBar}>
            <circle cx={X(a)} cy={Y(y)} r={13 + 3 * nh} fill={V} opacity={0.25} />
            <circle cx={X(a)} cy={Y(y)} r={7} fill={V} stroke="#0E1014" strokeWidth={2} />
            <circle cx={X(a) - 2} cy={Y(y) - 2} r={2.2} fill="#FFFFFF" opacity={0.85} />
          </g>)}
        </> : null}
        {[[0, 0], [-w / 2, 0], [w / 2, 0], [0, h]].map(([a, b], k) => <circle key={k} cx={X(a)} cy={Y(b)} r={7} fill={k === 3 ? HO_PHACH : CHU} stroke="#0E1014" strokeWidth={2} opacity={k === 3 ? uCong : uOx} />)}
      </svg>
      <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `scale(${kz}) translate(${-vx}px, ${-vy}px)`}}>
      <NhanTex x={xb - 14} y={y0 + 22} tex="x" mau={CHU} co={24} />
      <NhanTex x={xm + 22} y={yt + 4} tex="y" mau={CHU} co={24} neo="trai" />
      <NhanTex x={xm - 36} y={y0 + 14} tex="O(0;0)" mau={CHU} co={22} />
      <div style={{opacity: uOx}}>
        <NhanTex x={kx(X(-w / 2), 90)} y={y0 + 40} tex={`A(-${f(w / 2)};0)`} mau={CHU} co={22} />
        <NhanTex x={kx(X(w / 2), 90)} y={y0 + 40} tex={`B(${f(w / 2)};0)`} mau={CHU} co={22} />
      </div>
      <div style={{opacity: uCong}}><NhanTex x={Math.min(xm + 20, W - LE.phai - 150)} y={Y(h) - 26} tex={`S(0;${f(h)})`} mau={HO_PHACH} co={22} neo="trai" /></div>
      {aBar > 0.6 ? <div style={{opacity: em((aBar - 0.6) / 0.4), transform: `scale(${1 + 0.05 * nh})`, transformOrigin: `${xm}px ${Y(y)}px`}}>
        <NhanTex x={kx(X(-u) - 14, 130)} y={Y(y) - 34} tex={`M(-${f(u)};${f(y)})`} mau={V} co={24} neo="phai" />
        <NhanTex x={kx(X(u) + 14, 130)} y={Y(y) - 34} tex={`N(${f(u)};${f(y)})`} mau={V} co={24} neo="trai" />
        <NhanTex x={xm} y={Y(y) + 14} tex={`MN = ${f(2 * u)}${dv}`} mau={V} co={26} />
      </div> : null}
      </div>
      <DongKetQua x={LE.trai} y={H - LE.duoi - CAO_DONG_KQ} w={W - LE.trai - LE.phai} h={CAO_DONG_KQ} tex={dK >= 0 ? `y =${f(h)}\\left(1-\\dfrac{4x^2}{${f(w * w)}}\\right)` : ''} a={em(dK / 0.4)} mau={C} nhan={nh * 0.6} co={34} />
      <ThanhTienDo W={W} H={H} u={tienDo(sk.pha, t)} mau={mauNhan} />
    </div>
  );
};

export const SoDo2D: React.FC<{sk: SoDo2DVao; t: number; W: number; H: number; mauNhan: string}> = (props) => (
  props.sk.mau === 'cong_parabol' && !props.sk.ham && props.sk.x_tot === undefined ? <OxyCong {...props} /> : <SoDo2DChung {...props} />
);

const SoDo2DChung: React.FC<{sk: SoDo2DVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const coDoThi = !!(sk.ham && sk.mien);
  const rH = {x: LE.trai + 10, y: LE.tren + 20, w: (coDoThi ? Math.round((W - LE.trai - LE.phai) * 0.6) : W - LE.trai - LE.phai) - 20, h: H - LE.tren - LE.duoi - CAO_DONG_KQ - 50};
  const rD = React.useMemo(() => ({x: LE.trai + Math.round((W - LE.trai - LE.phai) * 0.64), y: LE.tren + 60, w: W - LE.phai - (LE.trai + Math.round((W - LE.trai - LE.phai) * 0.64)) - 6, h: 260}), [W]);
  const f = React.useMemo(() => (sk.ham ? hamMotBien(sk.ham, sk.bien) : null), [sk.ham, sk.bien]);
  const [a, b] = sk.mien || [0, Math.max(1, sk.tham_so.dai || sk.tham_so.d || (sk.tham_so.rong || 8) / 2 || 10)];
  const th = React.useMemo(() => (f && coDoThi ? thangDoThi(f, a, b, rD) : null), [f, coDoThi, a, b, rD]);
  const nh = nhipNhan(sk.nhip, sk.pha, t);
  const aT = em((t - (sk.pha[0]?.t ?? 0.3)) / 0.5);
  const x = bienTheoPha(sk.pha, t, a, b, sk.x_tot);
  const dT = daQua(sk.pha, 'toi_uu', t), dK = daQua(sk.pha, 'ket', t);
  const an = dT > 1.1 && dK < 0;
  const hinh = dungHinh(sk, x, rH, an);
  const VANG = mau('vang'), NGOC = HO_PHACH;
  const tex = dK >= 0 && sk.x_tot !== undefined && sk.y_tot !== undefined
    ? `${sk.bien} = ${soVN(sk.x_tot)} \\Rightarrow ${sk.ten_ham}_{${sk.kieu || 'min'}} = ${soVN(sk.y_tot)}` : '';
  return (
    <div style={{position: 'absolute', inset: 0, opacity: aT}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {(hinh.vung || []).map((v, k) => <path key={k} d={v.d} fill={v.mau} />)}
        {hinh.net.map((n, k) => <line key={k} x1={n.a[0]} y1={n.a[1]} x2={n.b[0]} y2={n.b[1]} stroke={n.mau} strokeWidth={(n.day || 2) + (n.day && n.day >= 3 ? nh : 0)} strokeDasharray={n.dut ? '7 7' : undefined} strokeLinecap="round" />)}
        {hinh.diem.map((d, k) => <circle key={k} cx={d.p[0]} cy={d.p[1]} r={8 + (d.ten === 'M' ? 2 * tho(t, 1.4) : 0)} fill={d.mau} stroke="#0E1014" strokeWidth={2} />)}
      </svg>
      {hinh.net.filter((n) => n.nhan).map((n, k) => {
        const mx = (n.a[0] + n.b[0]) / 2, my = (n.a[1] + n.b[1]) / 2;
        const doc = Math.abs(n.a[0] - n.b[0]) < Math.abs(n.a[1] - n.b[1]);
        return n.nhan === 'tường' ? null : <NhanTex key={k} x={mx + (doc ? 14 : 0)} y={my + (doc ? 0 : -22)} tex={n.nhan!} mau={n.mau === MO ? CHU : n.mau} co={24} neo={doc ? 'trai' : 'giua'} />;
      })}
      {hinh.diem.filter((d) => d.ten).map((d, k) => <NhanTex key={k} x={d.p[0]} y={d.p[1] + 28} tex={d.ten} mau={d.mau} co={24} />)}
      {th && f ? (
        <div data-sk2d="do_thi_mini">
          <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
            <rect x={rD.x - 16} y={rD.y - 40} width={rD.w + 30} height={rD.h + 80} rx={18} fill="rgba(21,26,35,0.9)" stroke="rgba(255,255,255,0.1)" />
            <path d={th.mau.map(([u, v], i) => `${i ? 'L' : 'M'}${th.X(u).toFixed(1)} ${th.Y(v).toFixed(1)}`).join(' ')} fill="none" stroke={mau('cyan')} strokeWidth={2.6} />
            <circle cx={th.X(x)} cy={th.Y(f(x))} r={7 + 2 * nh} fill={an || dK >= 0 ? NGOC : VANG} />
          </svg>
          <div style={{position: 'absolute', left: rD.x, top: rD.y - 34}}><Toan tex={`${sk.ten_ham}(${sk.bien})`} size={24} color={mau('cyan')} /></div>
        </div>
      ) : null}
      <DongKetQua x={LE.trai} y={H - LE.duoi - CAO_DONG_KQ} w={W - LE.trai - LE.phai} h={CAO_DONG_KQ} tex={tex} a={em(dK / 0.4)} mau={VANG} nhan={nh * 0.6} co={38} />
      <ThanhTienDo W={W} H={H} u={tienDo(sk.pha, t)} mau={mauNhan} />
    </div>
  );
};
