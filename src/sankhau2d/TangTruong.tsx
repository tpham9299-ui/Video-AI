// v96 — TĂNG TRƯỞNG / LÃI SUẤT / HÀM MŨ – LOGARIT (nhánh 2d_thuc_te): đường cong vẽ dần theo t, mốc đầu – mốc đích bật thẻ
// giá trị, pha so sánh nối hai mốc bằng ngoặc "gấp k lần"; ngưỡng (nếu có) là đường ngang nét đứt.
import React from 'react';
import {FONT} from '../theme';
import type {TangTruongVao} from './kieu';
import {CAO_DONG_KQ, daQua, em, hamMotBien, LE, nhipNhan, soVN, thangDoThi, tho, tienDo} from './chung';
import {CHU, DongKetQua, mau, MO, NhanTex, ThanhTienDo, VienTex} from './GiaoDien';
import {ChuTron} from '../khung4tang/ChuTron';

export const TangTruong: React.FC<{sk: TangTruongVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const [a, b] = sk.mien;
  const r = React.useMemo(() => ({x: LE.trai + 70, y: LE.tren + 50, w: W - LE.trai - LE.phai - 110, h: H - LE.tren - LE.duoi - CAO_DONG_KQ - 120}), [W, H]);
  const f = React.useMemo(() => hamMotBien(sk.ham, sk.bien), [sk.ham, sk.bien]);
  const th = React.useMemo(() => (f ? thangDoThi(f, a, b, r, sk.nguong !== undefined ? [sk.nguong] : []) : null), [f, a, b, r, sk.nguong]);
  if (!f || !th) return null;
  const nh = nhipNhan(sk.nhip, sk.pha, t);
  const aT = em((t - (sk.pha[0]?.t ?? 0.3)) / 0.5);
  const dVe = daQua(sk.pha, 've', t);
  const uVe = em((dVe > -Infinity ? dVe : t - 0.6) / 1.6);
  const dMoc = daQua(sk.pha, 'moc', t), dSS = daQua(sk.pha, 'so_sanh', t), dK = daQua(sk.pha, 'ket', t);
  const n = Math.max(2, Math.round(th.mau.length * uVe));
  const duong = th.mau.slice(0, n).map(([u, v], i) => `${i ? 'L' : 'M'}${th.X(u).toFixed(1)} ${th.Y(v).toFixed(1)}`).join(' ');
  const dau = th.mau[n - 1];
  const VANG = mau('vang'), CYAN = mau('cyan'), HONG = mau('hong');
  const m0 = sk.moc[0], m1 = sk.moc[sk.moc.length - 1];
  const tiLe = m0 && m1 && Math.abs(m0.y) > 1e-9 ? m1.y / m0.y : null;
  const dv = sk.don_vi ? `\\ \\text{${sk.don_vi}}` : '';
  const tex = dK >= 0 && m1 ? `${sk.ten_ham}(${soVN(m1.x)}) = ${soVN(m1.y)}${dv}` : '';
  return (
    <div style={{position: 'absolute', inset: 0, opacity: aT}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <line x1={r.x} y1={r.y + r.h} x2={r.x + r.w} y2={r.y + r.h} stroke={CHU} strokeWidth={2} />
        <line x1={r.x} y1={r.y + r.h} x2={r.x} y2={r.y - 10} stroke={CHU} strokeWidth={2} />
        {sk.nguong !== undefined ? <line x1={r.x} x2={r.x + r.w} y1={th.Y(sk.nguong)} y2={th.Y(sk.nguong)} stroke={HONG} strokeDasharray="9 7" strokeWidth={2} /> : null}
        <path d={`${duong} L${th.X(dau[0]).toFixed(1)} ${r.y + r.h} L${r.x} ${r.y + r.h} Z`} fill={`${CYAN}14`} />
        {uVe < 1 ? <path d={th.mau.slice(0, Math.max(2, Math.round(th.mau.length * em((t - 0.3) / 1.4)))).map(([u, v], i) => `${i ? 'L' : 'M'}${th.X(u).toFixed(1)} ${th.Y(v).toFixed(1)}`).join(' ')} fill="none" stroke={CYAN} strokeOpacity={0.22 + 0.1 * nh} strokeWidth={2.4} strokeDasharray="10 8" strokeDashoffset={-t * 20} />  : null}
        <path d={duong} fill="none" stroke={CYAN} strokeWidth={3.4} strokeLinecap="round" />
        {uVe < 1 ? <circle cx={th.X(dau[0])} cy={th.Y(dau[1])} r={8 + 3 * tho(t, 0.8)} fill={VANG} /> : null}
        {sk.moc.map((m, k) => {
          const u = em((dMoc - k * 0.5) / 0.4);
          return u > 0 ? <g key={k} opacity={u}><line x1={th.X(m.x)} x2={th.X(m.x)} y1={r.y + r.h} y2={th.Y(m.y)} stroke={VANG} strokeDasharray="6 6" strokeWidth={1.6} />
            <circle cx={th.X(m.x)} cy={th.Y(m.y)} r={9 + (k === sk.moc.length - 1 ? 2 * nh : 0)} fill={VANG} stroke="#0E1014" strokeWidth={2} /></g> : null;
        })}
      </svg>
      {sk.moc.map((m, k) => {
        const u = em((dMoc - k * 0.5 - 0.2) / 0.4);
        const x = Math.min(th.X(m.x), r.x + r.w - 120);
        return u > 0 ? <div key={k} data-sk2d={`moc_${k}`} style={{position: 'absolute', left: x - 60, top: th.Y(m.y) - 66, opacity: u, transform: `scale(${0.8 + 0.2 * u})`}}>
          <VienTex tex={`${soVN(m.y, 1)}${dv}`} mau={VANG} co={22} />
        </div> : null;
      })}
      {tiLe !== null && dSS >= 0 ? <div data-sk2d="so_sanh" style={{position: 'absolute', left: r.x + 20, top: r.y - 4, opacity: em(dSS / 0.4)}}>
        <VienTex tex={`\\times ${soVN(tiLe, 2)}\\ \\text{lần}`} mau={HONG} co={26} />
      </div> : null}
      <NhanTex x={r.x + 8} y={r.y - 30} tex={`${sk.ten_ham}(${sk.bien})`} mau={CYAN} co={24} neo="trai" />
      <div style={{position: 'absolute', left: r.x, width: r.w, top: r.y + r.h + 10, display: 'flex', justifyContent: 'space-between', color: MO, fontFamily: FONT, fontWeight: 700, fontSize: 20}}>
        <span>{soVN(a)}</span><span style={{whiteSpace: 'nowrap'}}><ChuTron s={sk.nhan_bien} co={20} mau={MO} /> = {soVN(b)}</span>
      </div>
      <DongKetQua x={LE.trai} y={H - LE.duoi - CAO_DONG_KQ} w={W - LE.trai - LE.phai} h={CAO_DONG_KQ} tex={tex} a={em(dK / 0.4)} mau={VANG} nhan={nh * 0.6} co={38} />
      <ThanhTienDo W={W} H={H} u={tienDo(sk.pha, t)} mau={mauNhan} />
    </div>
  );
};
