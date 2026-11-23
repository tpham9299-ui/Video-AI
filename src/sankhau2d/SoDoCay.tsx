// v96 — SƠ ĐỒ CÂY ĐỘNG: nhánh bung theo tầng đúng mốc lời đọc, xác suất ghi trên từng nhánh, đường thỏa mãn tô sáng
// (path highlight), tích xác suất cuối nhánh, cộng các đường ở dải kết quả. Dùng cho phép thử liên tiếp / độc lập (lớp 11) và
// xác suất toàn phần / có điều kiện (lớp 12).
import React from 'react';
import type {SoDoCayVao} from './kieu';
import {boCucCay, daQua, em, LE, nhipNhan, phaTai, tho, tienDo} from './chung';
import {CHU, DongKetQua, mau, MO, NhanTex, ThanhTienDo, VienTex} from './GiaoDien';
import {ChuTron} from '../khung4tang/ChuTron';

const MAU_TANG = ['cyan', 'hong', 'ngoc'] as const;

export const SoDoCay: React.FC<{sk: SoDoCayVao; t: number; W: number; H: number; mauNhan: string}> = ({sk, t, W, H, mauNhan}) => {
  const b = React.useMemo(() => boCucCay(sk, W, H), [sk, W, H]);
  const nh = nhipNhan(sk.nhip, sk.pha, t);
  const tGoc = sk.pha.find((p) => p.ten === 'goc')?.t ?? 0.3;
  const moTang = (k: number): number => {
    const d = daQua(sk.pha, `tang_${k}`, t);
    if (d > -Infinity) return d;
    // tầng không có pha riêng: bung nối tiếp tầng trước 0,9 s (bảo đảm hook: tầng 1 bung trong 2 s đầu)
    return k === 1 ? t - tGoc - 0.5 : moTang(k - 1) - 0.9;
  };
  const dDuong = daQua(sk.pha, 'duong', t), dTich = daQua(sk.pha, 'tich', t), dKet = daQua(sk.pha, 'ket', t);
  const coDuong = sk.nut.some((n) => n.sang);
  const sang = coDuong ? em(dDuong / 0.5) : 0;
  const pn = phaTai(sk.pha, t);
  const vt = (id: number) => (id < 0 ? b.goc : b.viTri.get(id)!);
  let tex = '', aKq = 0;
  if (dKet >= 0 && sk.p) {
    tex = sk.mau_so ? `P = \\dfrac{${sk.tong}}{${sk.mau_so}} = ${sk.p}` : sk.bt_tong ? sk.bt_tong : `P = ${sk.p}`;
    aKq = em(dKet / 0.4);
  } else if (dTich >= 0 && sk.bt_tong) {
    tex = sk.bt_tong; aKq = em((dTich - 0.9) / 0.4);
  }
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {/* nhãn tầng */}
      {sk.tang.map((s, k) => {
        const a = em(moTang(k + 1) / 0.4);
        return a > 0 ? <div key={k} style={{position: 'absolute', left: b.xTang(k + 1), top: 18, transform: 'translateX(-50%)', opacity: a, color: MO, fontWeight: 800, fontSize: 22, whiteSpace: 'nowrap'}}><ChuTron s={s} co={22} mau={MO} /></div> : null;
      })}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {sk.canh.map((c, k) => {
          const n = sk.nut.find((x) => x.id === c.den)!;
          const u = em((moTang(n.tang) - (n.duong[n.duong.length - 1] || 0) * 0.12) / 0.55);
          if (u <= 0) return null;
          const a = vt(c.tu), d = vt(c.den);
          const x1 = a.x + (c.tu < 0 ? 26 : 62), x2 = d.x - 62;
          const mx = x1 + (x2 - x1) * u, my = a.y + (d.y - a.y) * u;
          const m = n.sang ? mau('vang') : mau(MAU_TANG[(n.tang - 1) % 3]);
          const mo = coDuong ? (n.sang ? 1 : 1 - 0.65 * sang) : 1;
          return <line key={k} x1={x1} y1={a.y} x2={mx} y2={my} stroke={m} strokeWidth={n.sang ? 3 + 2 * sang + nh * 1.5 : 2.4} strokeOpacity={mo} strokeLinecap="round" />;
        })}
      </svg>
      {/* gốc */}
      {t >= tGoc ? <div style={{position: 'absolute', left: b.goc.x - 22, top: b.goc.y - 22, width: 44, height: 44, borderRadius: 22, background: '#151A23', border: `2px solid ${CHU}`,
        transform: `scale(${em((t - tGoc) / 0.35) * (1 + 0.06 * tho(t))})`}} /> : null}
      {/* nút + xác suất trên nhánh + tích cuối nhánh */}
      {sk.nut.map((n) => {
        const d = moTang(n.tang) - (n.duong[n.duong.length - 1] || 0) * 0.12;
        const a = em((d - 0.35) / 0.35);
        if (a <= 0) return null;
        const v = vt(n.id), c = vt(n.cha);
        const m = n.sang ? mau('vang') : mau(MAU_TANG[(n.tang - 1) % 3]);
        const mo = coDuong && !n.sang ? 1 - 0.6 * sang : 1;
        const xMid = (c.x + (n.cha < 0 ? 26 : 62) + v.x - 62) / 2, yMid = (c.y + v.y) / 2;
        const aTich = n.la && n.tich ? em((dTich - (n.sang ? 0 : 0.4)) / 0.4) : 0;
        return (
          <React.Fragment key={n.id}>
            <div data-sk2d={`nut_${n.id}`} style={{position: 'absolute', left: v.x - 62, top: v.y - 24, width: 124, height: 48, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#151A23', border: `2px solid ${m}`, opacity: a * mo, transform: `scale(${0.8 + 0.2 * a + (n.sang ? 0.05 * nh : 0)})`, boxShadow: n.sang && sang > 0 ? `0 0 ${16 * sang}px ${m}66` : 'none',
              color: m, fontWeight: 800, fontSize: 24, whiteSpace: 'nowrap', overflow: 'hidden'}}>
              <ChuTron s={n.nhan} co={n.nhan.length > 8 ? 19 : 24} mau={m} />
            </div>
            <NhanTex x={xMid} y={yMid - 16} tex={n.p} mau={m} co={22} a={a * mo} />
            {aTich > 0 ? <div data-sk2d={`tich_${n.id}`} style={{position: 'absolute', left: v.x + 76, top: v.y - 22, opacity: aTich * (coDuong && !n.sang ? 0.45 : 1)}}>
              <VienTex tex={`= ${n.tich}`} mau={n.sang ? mau('vang') : CHU} co={22} />
            </div> : null}
          </React.Fragment>
        );
      })}
      <DongKetQua x={LE.trai} y={H - 18 - 84} w={W - LE.trai - LE.phai} h={84} tex={tex} a={aKq} mau={pn.ten === 'ket' ? mau('vang') : CHU} nhan={nh * 0.6} co={38} />
      <ThanhTienDo W={W} H={H} u={tienDo(sk.pha, t)} mau={mauNhan} />
    </div>
  );
};
