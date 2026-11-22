// v96 — BIỂU ĐỒ CỘT PHÂN PHỐI: cột xác suất từng giá trị (nhị thức, khoanh bừa trắc nghiệm, so sánh phương án) mọc lần lượt,
// cột đích nổi bật (các cột khác mờ), cộng dồn bằng ngoặc + tổng ở dải kết quả.
import React from 'react';
import {FONT, SO_DEU} from '../theme';
import type {CotPhanPhoiVao} from './kieu';
import {boCucCot, daQua, em, nhipNhan, tho, tienDo} from './chung';
import {CHU, DongKetQua, mau, MO, NhanTex, ThanhTienDo} from './GiaoDien';
import {ChuTron} from '../khung4tang/ChuTron';

export const CotPhanPhoi: React.FC<{sk: CotPhanPhoiVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const b = React.useMemo(() => boCucCot(sk, W, H), [sk, W, H]);
  const nh = nhipNhan(sk.nhip, sk.pha, t);
  const tTruc = sk.pha.find((p) => p.ten === 'truc')?.t ?? 0.3;
  const dCot = daQua(sk.pha, 'cot', t) > -Infinity ? daQua(sk.pha, 'cot', t) : t - tTruc - 0.4;
  const dDich = daQua(sk.pha, 'dich', t), dCong = daQua(sk.pha, 'cong', t), dKet = daQua(sk.pha, 'ket', t);
  const aT = em((t - tTruc) / 0.5);
  const aDich = sk.dich.length ? em(dDich / 0.5) : 0;
  const n = sk.cot.length;
  const VANG = mau('vang'), CYAN = mau('cyan');
  const dich = new Set(sk.dich);
  const cotDich = sk.dich.map((i) => b.cot[i]);
  const tex = dKet >= 0 && sk.p ? `P = ${sk.p}` : dCong >= 0 && sk.bt_tong ? sk.bt_tong : '';
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: aT}}>
        <line x1={b.truc.x} y1={b.truc.y + b.truc.h} x2={b.truc.x + b.truc.w * aT} y2={b.truc.y + b.truc.h} stroke={CHU} strokeWidth={2} />
        <line x1={b.truc.x} y1={b.truc.y + b.truc.h} x2={b.truc.x} y2={b.truc.y + b.truc.h - b.truc.h * aT} stroke={CHU} strokeWidth={2} />
        {[0.25, 0.5, 0.75].map((u) => <line key={u} x1={b.truc.x} x2={b.truc.x + b.truc.w} y1={b.truc.y + b.truc.h - (b.truc.h - 44) * u} y2={b.truc.y + b.truc.h - (b.truc.h - 44) * u} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />)}
      </svg>
      {sk.cot.map((c, i) => {
        const r = b.cot[i];
        const u = em((dCot - i * (1.2 / Math.max(1, n))) / 0.5);
        if (u <= 0) return null;
        const laDich = dich.has(i);
        const m = laDich && aDich > 0 ? VANG : CYAN;
        const mo = sk.dich.length ? (laDich ? 1 : 1 - 0.6 * aDich) : 1;
        const h = r.h * u * (laDich ? 1 + 0.02 * nh : 1);
        return (
          <React.Fragment key={i}>
            <div data-sk2d={`cot_${i}`} style={{position: 'absolute', left: r.x, top: r.y + r.h - h, width: r.w, height: h, borderRadius: '8px 8px 2px 2px', opacity: mo,
              background: `linear-gradient(180deg, ${m}, ${m}88)`, boxShadow: laDich && aDich > 0 ? `0 0 ${14 + 8 * tho(t)}px ${m}66` : 'none'}} />
            <NhanTex x={r.x + r.w / 2} y={r.y + r.h - h - 20} tex={c.p} mau={m} co={n > 8 ? 17 : 22} a={u * mo} />
            <div style={{position: 'absolute', left: r.x, width: r.w, top: b.truc.y + b.truc.h + 8, textAlign: 'center', color: laDich && aDich > 0 ? VANG : MO, fontFamily: FONT, ...SO_DEU, fontWeight: 800, fontSize: n > 8 ? 20 : 24, opacity: u}}>
              <ChuTron s={c.nhan} co={n > 8 ? 20 : 24} mau={laDich && aDich > 0 ? VANG : MO} />
            </div>
          </React.Fragment>
        );
      })}
      {/* ngoặc cộng dồn các cột đích */}
      {cotDich.length > 1 && dCong >= 0 ? (() => {
        const x0 = Math.min(...cotDich.map((r) => r.x)), x1 = Math.max(...cotDich.map((r) => r.x + r.w));
        const y0 = Math.min(...cotDich.map((r) => r.y)) - 46;
        const u = em(dCong / 0.5);
        return <svg width={W} height={H} style={{position: 'absolute', inset: 0}}><path d={`M${x0} ${y0 + 14} L${x0} ${y0} L${x0 + (x1 - x0) * u} ${y0} ${u >= 1 ? `L${x1} ${y0 + 14}` : ''}`} fill="none" stroke={VANG} strokeWidth={2.5} /></svg>;
      })() : null}
      {sk.nhan_x ? <div style={{position: 'absolute', right: 34, top: b.truc.y + b.truc.h + 40, color: MO, fontFamily: FONT, fontWeight: 700, fontSize: 20, opacity: aT}}><ChuTron s={sk.nhan_x} co={20} mau={MO} /></div> : null}
      <DongKetQua x={b.ketQua.x} y={b.ketQua.y} w={b.ketQua.w} h={b.ketQua.h} tex={tex} a={em((dKet >= 0 ? dKet : dCong) / 0.4)} mau={dKet >= 0 ? VANG : CHU} nhan={nh * 0.6} co={38} />
      <ThanhTienDo W={W} H={H} u={tienDo(sk.pha, t)} mau={mauNhan} />
    </div>
  );
};
