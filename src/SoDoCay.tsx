import React, {useMemo} from 'react';
import {bocucCay, DuLieuCay} from './bocuc';
import {mauTen, PHAT_SANG_ID, PhatSang, tien, useGiay} from './manimKit';
import {MAU} from './theme';
import {Toan} from './Toan';

const W = 960;
const H = 620;
const RN = 460; // chừa chỗ cho nhãn gốc ở trái và nhãn lá + kết quả ở phải

// Sơ đồ cây xác suất kiểu Manim: mỗi nhánh một màu (cùng màu với sự kiện trong công thức), nhánh vẽ dần (Create), xác suất viết lên nhánh;
// sau đó các ĐƯỜNG ĐI được chọn ("to": true) sáng vàng lần lượt, kết quả ở lá (tích xác suất) bật lên.
export const SoDoCay: React.FC<{du: DuLieuCay; giayAm: number}> = ({du, giayAm}) => {
  const t = useGiay();
  const bc = useMemo(() => bocucCay(du, W, H, RN), [du]);
  const buoc = Math.min(0.85, Math.max(0.5, (giayAm * 0.4) / Math.max(1, bc.sauMax)));
  const tb = (sau: number) => 0.3 + (sau - 1) * buoc; // lúc nhánh tầng sau bắt đầu vẽ
  const tVe = tb(bc.sauMax) + 0.6 + 0.5; // vẽ xong toàn cây
  const nhip = Math.max(1.0, Math.min(1.6, (giayAm * 0.5) / Math.max(1, bc.soDuong)));
  const tHL = (k: number) => tVe + 0.2 + k * nhip;
  const dau = (c: {sau: number; thuTu: number}) => tHL(c.thuTu) + 0.25 * (c.sau - 1); // đường đi sáng dần từ gốc ra lá

  return (
    <div style={{position: 'relative', width: W, height: H}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>{PhatSang}</defs>
        {bc.canh.map((c, i) => {
          const a = bc.nut[c.tu];
          const b = bc.nut[c.den];
          const p = tien(t, tb(c.sau), 0.6);
          const x2 = a.x + (b.x - a.x) * p;
          const y2 = a.y + (b.y - a.y) * p;
          const hl = c.thuTu >= 0 ? tien(t, dau(c), 0.5) : 0;
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={x2} y2={y2} stroke={mauTen(c.mau)} strokeWidth={5} strokeLinecap="round" opacity={hl > 0 ? 0.55 : 1} />
              {hl > 0 ? (
                <>
                  <line x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * hl} y2={a.y + (b.y - a.y) * hl} stroke={MAU.vang} strokeWidth={14} strokeLinecap="round" opacity={0.5} filter={`url(#${PHAT_SANG_ID})`} />
                  <line x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * hl} y2={a.y + (b.y - a.y) * hl} stroke={MAU.vang} strokeWidth={7} strokeLinecap="round" />
                </>
              ) : null}
            </g>
          );
        })}
        {bc.nut.map((n) => {
          const e = n.sau === 0 ? tien(t, 0, 0.4) : tien(t, tb(n.sau) + 0.45, 0.25);
          const hl = n.thuTu >= 0 && n.sau > 0 ? tien(t, tHL(n.thuTu) + 0.25 * n.sau, 0.3) : n.sau === 0 && bc.soDuong ? tien(t, tVe + 0.2, 0.3) : 0;
          return <circle key={n.id} cx={n.x} cy={n.y} r={10 * e + 4 * hl} fill={hl > 0.5 ? MAU.vang : n.sau === 0 ? '#ffffff' : mauTen(n.mau)} stroke="#111" strokeWidth={3} />;
        })}
      </svg>
      {bc.canh.map((c, i) => {
        if (!c.xs) return null;
        const a = bc.nut[c.tu];
        const b = bc.nut[c.den];
        const e = tien(t, tb(c.sau) + 0.3, 0.4);
        const hl = c.thuTu >= 0 ? tien(t, dau(c), 0.4) : 0;
        return (
          <div key={`x${i}`} style={{position: 'absolute', left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 + (b.y < a.y - 4 ? -28 : b.y > a.y + 4 ? 28 : -28), transform: `translate(-50%, ${b.y > a.y + 4 ? '0' : '-100'}%) scale(${1 + 0.12 * Math.sin(Math.PI * hl)})`, opacity: e}}>
            <Toan tex={c.xs} size={40} color={hl > 0.5 ? MAU.vang : mauTen(c.mau, MAU.vang)} maxWidth={150} />
          </div>
        );
      })}
      {bc.nut.map((n) => {
        const goc = n.sau === 0;
        const e = goc ? tien(t, 0.1, 0.4) : tien(t, tb(n.sau) + 0.5, 0.4);
        const hl = n.thuTu >= 0 && n.la ? tien(t, tHL(n.thuTu) + 0.25 * n.sau + 0.2, 0.4) : 0;
        return (
          <React.Fragment key={`n${n.id}`}>
            <div style={{position: 'absolute', left: goc ? n.x - 26 : n.la ? n.x + 26 : n.x, top: goc || n.la ? n.y : n.y - 24, transform: goc ? 'translate(-100%, -50%)' : n.la ? 'translate(0, -50%)' : 'translate(-50%, -100%)', opacity: e}}>
              <Toan tex={n.nhan} size={42} color={goc ? '#ffffff' : mauTen(n.mau)} maxWidth={goc ? 200 : 130} />
            </div>
            {n.la && n.kq ? (
              <div style={{position: 'absolute', left: n.x + 150, top: n.y, transform: `translate(0, -50%) scale(${1 + 0.18 * Math.sin(Math.PI * hl)})`, transformOrigin: 'left center', opacity: tien(t, tb(n.sau) + 0.9, 0.5)}}>
                <Toan tex={n.kq} size={42} color={hl > 0.4 ? MAU.vang : MAU.mo} maxWidth={170} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};
