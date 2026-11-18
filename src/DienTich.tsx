import React from 'react';
import {DuLieuDienTich} from './bocuc';
import {mauTen, PHAT_SANG_ID, PhatSang, tien, useGiayCan} from './manimKit';
import {MAU} from './theme';
import {Toan} from './Toan';

const W = 960;
const H = 640;
const S = 500;
const X0 = 90;
const Y0 = 150;

// Mô hình diện tích kiểu Manim cho xác suất nhân và xác suất có điều kiện: hình vuông đơn vị (diện tích = 1) chia theo chiều ngang
// theo xác suất lần 1, rồi chia mỗi cột theo xác suất lần 2: DIỆN TÍCH mỗi ô chính là xác suất của kết quả đó. Các ô được chọn sáng vàng, cộng lại thành đáp án.
export const DienTich: React.FC<{du: DuLieuDienTich; giayAm: number}> = ({du, giayAm}) => {
  const nc = du.cot.length;
  const nTo = du.cot.reduce((a, c) => a + c.hang.filter((h) => h.to).length, 0);
  const t = useGiayCan(giayAm, 1.0 + nc * 1.5 + 0.4 + nTo * 1.0 + 1.6);
  let x = 0;
  const cot = du.cot.map((c, i) => {
    const w = c.gt * S;
    const o = {c, i, x: x, w};
    x += w;
    return o;
  });
  const batDauCot = (i: number) => 1.0 + i * 1.5;
  const tXong = 1.0 + nc * 1.5 + 0.4;
  const dsTo: {c: number; r: number}[] = [];
  du.cot.forEach((c, i) => c.hang.forEach((h, r) => h.to && dsTo.push({c: i, r})));
  const tTo = (k: number) => tXong + 0.2 + k * 1.0;
  const tTong = tXong + 0.4 + dsTo.length * 1.0;

  const svg: React.ReactNode[] = [];
  const chu: React.ReactNode[] = [];
  const pk = tien(t, 0, 0.9);
  svg.push(<rect key="khung" x={X0} y={Y0} width={S} height={S} fill="none" stroke="#ffffff" strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pk} />);
  cot.forEach(({c, i, x: cx0, w}) => {
    const b = batDauCot(i);
    if (i > 0) {
      const p = tien(t, b - 0.3, 0.5);
      svg.push(<line key={`v${i}`} x1={X0 + cx0} y1={Y0} x2={X0 + cx0} y2={Y0 + S * p} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />);
    }
    chu.push(
      <div key={`lc${i}`} style={{position: 'absolute', left: X0 + cx0 + w / 2, top: Y0 - 86, transform: 'translate(-50%, -50%)', opacity: tien(t, b - 0.1, 0.4), textAlign: 'center'}}>
        <Toan tex={c.nhan} size={42} color={mauTen(c.mau, '#ffffff')} maxWidth={Math.max(60, w)} />
      </div>
    );
    if (c.xs)
      chu.push(
        <div key={`xc${i}`} style={{position: 'absolute', left: X0 + cx0 + w / 2, top: Y0 - 34, transform: 'translate(-50%, -50%)', opacity: tien(t, b + 0.1, 0.4)}}>
          <Toan tex={c.xs} size={34} color="#ffffff" maxWidth={Math.max(60, w)} />
        </div>
      );
    let y = 0;
    c.hang.forEach((h, r) => {
      const hh = h.gt * S;
      const bh = b + 0.35 + r * 0.25;
      const e = tien(t, bh, 0.5);
      const m = mauTen(h.mau || c.mau, '#58C4DD');
      const to = h.to ? tien(t, tTo(dsTo.findIndex((d) => d.c === i && d.r === r)), 0.5) : 0;
      if (r > 0) {
        const p = tien(t, bh - 0.2, 0.4);
        svg.push(<line key={`h${i}-${r}`} x1={X0 + cx0} y1={Y0 + y} x2={X0 + cx0 + w * p} y2={Y0 + y} stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />);
      }
      svg.push(<rect key={`f${i}-${r}`} x={X0 + cx0 + 3} y={Y0 + y + 3} width={Math.max(0, w - 6)} height={Math.max(0, hh - 6)} fill={m} fillOpacity={0.5 * e} />);
      if (to > 0) {
        svg.push(<rect key={`g${i}-${r}`} x={X0 + cx0 + 3} y={Y0 + y + 3} width={Math.max(0, w - 6)} height={Math.max(0, hh - 6)} fill="none" stroke={MAU.vang} strokeWidth={12} opacity={0.5 * to} filter={`url(#${PHAT_SANG_ID})`} />);
        svg.push(<rect key={`s${i}-${r}`} x={X0 + cx0 + 3} y={Y0 + y + 3} width={Math.max(0, w - 6)} height={Math.max(0, hh - 6)} fill={MAU.vang} fillOpacity={0.28 * to} stroke={MAU.vang} strokeWidth={6} opacity={to} />);
      }
      if (h.xs && w > 64 && hh > 46)
        chu.push(
          <div key={`hx${i}-${r}`} style={{position: 'absolute', left: X0 + cx0 + 10, top: Y0 + y + 8, opacity: e}}>
            <Toan tex={h.xs} size={Math.min(34, Math.max(25, hh * 0.22))} color="#ffffff" maxWidth={w - 18} />
          </div>
        );
      if (h.kq && w > 64 && hh > 46)
        chu.push(
          <div key={`kq${i}-${r}`} style={{position: 'absolute', left: X0 + cx0 + w / 2, top: Y0 + y + hh / 2 + 6, transform: `translate(-50%, -50%) scale(${1 + 0.15 * Math.sin(Math.PI * to)})`, opacity: tien(t, bh + 0.35, 0.5)}}>
            <Toan tex={h.kq} size={Math.min(44, Math.max(26, hh * 0.3))} color={to > 0.5 ? MAU.vang : '#ffffff'} maxWidth={w - 14} />
          </div>
        );
      y += hh;
    });
  });
  if (du.tenCot)
    chu.push(
      <div key="tc" style={{position: 'absolute', left: X0 + S / 2, top: Y0 + S + 36, transform: 'translate(-50%, -50%)', opacity: tien(t, 0.9, 0.5)}}>
        <Toan tex={du.tenCot} size={32} color={MAU.mo} maxWidth={S} />
      </div>
    );
  if (du.tenHang)
    chu.push(
      <div key="th" style={{position: 'absolute', left: X0 - 40, top: Y0 + S / 2, transform: 'translate(-50%, -50%) rotate(-90deg)', opacity: tien(t, 1.4, 0.5), whiteSpace: 'nowrap'}}>
        <Toan tex={du.tenHang} size={32} color={MAU.mo} maxWidth={S} />
      </div>
    );
  const eTong = tien(t, tTong, 0.7);
  return (
    <div style={{position: 'relative', width: W, height: H}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>{PhatSang}</defs>
        {svg}
      </svg>
      {chu}
      {du.tong ? (
        <div style={{position: 'absolute', left: X0 + S + 40, top: Y0 + S / 2, width: W - (X0 + S + 40) - 10, transform: `translateY(-50%) scale(${0.9 + 0.1 * eTong})`, opacity: eTong, textAlign: 'center'}}>
          <Toan tex={du.tong} size={52} color={MAU.vang} maxWidth={W - (X0 + S + 60)} />
        </div>
      ) : null}
    </div>
  );
};
