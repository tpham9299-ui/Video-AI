import React from 'react';
import {DuLieuBiHop} from './bocuc';
import {PHAT_SANG_ID, PhatSang, tien, useGiayCan} from './manimKit';
import {MAU} from './theme';
import {Toan} from './Toan';

function mauBi(ten: string, i: number): string {
  const t = ten.toLowerCase();
  if (/xanh (lá|lục)|lục/.test(t)) return MAU.xanh;
  if (/xanh/.test(t) || /lam|dương/.test(t)) return MAU.lam;
  if (/đỏ/.test(t)) return MAU.hong;
  if (/vàng/.test(t)) return MAU.vang;
  if (/trắng/.test(t)) return '#ffffff';
  if (/đen/.test(t)) return '#7a7a7a';
  if (/tím/.test(t)) return MAU.tim;
  if (/cam/.test(t)) return '#F0AC5F';
  if (/hồng/.test(t)) return '#ff9ec7';
  return [MAU.hong, MAU.lam, MAU.xanh, MAU.vang][i % 4];
}

// Hộp đựng bi kiểu Manim: khung trắng vẽ dần, bi là hình tròn phẳng một màu rơi vào lần lượt; nếu có "chon" thì những viên được chọn
// bay ra khay bên dưới (cung bay mượt), sáng vàng, kèm ghi chú số cách chọn.
export const BiHop: React.FC<{du: DuLieuBiHop; giayAm: number}> = ({du, giayAm}) => {
  const nhom = du.nhom;
  const tong = nhom.reduce((a, g) => a + Math.min(g.so, 12), 0);
  const r = tong > 14 ? 28 : 34;
  const W = 900;
  const caoNhom = r * 2 + 34;
  const hHop = nhom.length * caoNhom + 40;
  const coChon = du.chon.length > 0;
  const yKhay = hHop + 50;
  const hKhay = r * 2 + 50;
  const H = coChon ? yKhay + hKhay + 70 : hHop + 10;
  const soBi = nhom.reduce((a, g) => a + Math.min(g.so, 12), 0);
  const soChon = du.chon.reduce((a, c) => a + c.so, 0);
  const t = useGiayCan(giayAm, 0.8 + soBi * 0.1 + 0.6 + (soChon ? 0.2 + soChon * 0.35 + 1.0 + (du.ghiChu ? 0.8 : 0) : 0.5));
  const khung = tien(t, 0, 0.7);

  // vị trí gốc từng viên và thời điểm rơi
  type Bi = {g: number; k: number; x: number; y: number; bd: number; mau: string};
  const bi: Bi[] = [];
  let dem = 0;
  nhom.forEach((g, gi) => {
    for (let k = 0; k < Math.min(g.so, 12); k++) {
      bi.push({g: gi, k, x: 240 + k * (r * 2 + 12) + r, y: 20 + gi * caoNhom + caoNhom / 2, bd: 0.8 + dem++ * 0.1, mau: mauBi(g.ten, gi)});
    }
  });
  const tRoi = 0.8 + dem * 0.1 + 0.6;
  // các viên được chọn: lấy những viên đầu tiên của nhóm cùng tên
  const chon: {bi: Bi; ti: number}[] = [];
  du.chon.forEach((c) => {
    const gi = nhom.findIndex((g) => g.ten === c.ten);
    if (gi < 0) return;
    bi.filter((b) => b.g === gi).slice(0, c.so).forEach((b) => chon.push({bi: b, ti: chon.length}));
  });
  const dichKhay = (i: number) => ({x: 240 + i * (r * 2 + 16) + r, y: yKhay + hKhay / 2});
  const eChon = (i: number) => tien(t, tRoi + 0.2 + i * 0.35, 0.9);

  return (
    <div style={{position: 'relative', width: W, height: H, margin: '0 auto'}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>{PhatSang}</defs>
        <rect x={2} y={2} width={W - 4} height={hHop} rx={18} fill="none" stroke="#ffffff" strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - khung} />
        {coChon ? (
          <rect x={2} y={yKhay} width={W - 4} height={hKhay} rx={18} fill="none" stroke={MAU.vang} strokeWidth={4} strokeDasharray="14 12" opacity={tien(t, tRoi, 0.5)} />
        ) : null}
        {bi.map((b, i) => {
          const e = tien(t, b.bd, 0.35);
          const ci = chon.findIndex((c) => c.bi === b);
          const ec = ci >= 0 ? eChon(ci) : 0;
          if (ci >= 0 && ec > 0) {
            const d = dichKhay(ci);
            const x = b.x + (d.x - b.x) * ec;
            const y = b.y + (d.y - b.y) * ec - 90 * Math.sin(Math.PI * ec);
            return (
              <g key={i}>
                <circle cx={b.x} cy={b.y} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} strokeDasharray="6 6" />
                <circle cx={x} cy={y} r={r + 8} fill={MAU.vang} opacity={0.5 * ec} filter={`url(#${PHAT_SANG_ID})`} />
                <circle cx={x} cy={y} r={r} fill={b.mau} stroke={ec > 0.9 ? MAU.vang : '#ffffff'} strokeWidth={ec > 0.9 ? 6 : 3} />
              </g>
            );
          }
          return <circle key={i} cx={b.x} cy={b.y - (1 - e) * 60} r={r * e} fill={b.mau} stroke="#ffffff" strokeWidth={3} opacity={Math.min(1, e * 3)} />;
        })}
      </svg>
      {nhom.map((g, gi) => (
        <div key={gi} style={{position: 'absolute', left: 36, top: 20 + gi * caoNhom + caoNhom / 2, transform: 'translateY(-50%)', opacity: tien(t, 0.6, 0.4), whiteSpace: 'nowrap'}}>
          <Toan tex={`${g.ten}: ${g.so}`} size={42} color={mauBi(g.ten, gi)} />
        </div>
      ))}
      {coChon ? (
        <>
          <div style={{position: 'absolute', left: 36, top: yKhay + hKhay / 2, transform: 'translateY(-50%)', opacity: tien(t, tRoi, 0.5)}}>
            <Toan tex="Lấy ra" size={40} color={MAU.vang} />
          </div>
          {du.ghiChu ? (
            <div style={{position: 'absolute', left: W / 2, top: yKhay + hKhay + 34, transform: 'translate(-50%, -50%)', opacity: tien(t, tRoi + 0.4 + chon.length * 0.35, 0.6)}}>
              <Toan tex={du.ghiChu} size={50} color={MAU.vang} maxWidth={W - 60} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
