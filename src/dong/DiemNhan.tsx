import React from 'react';
import {useCurrentFrame} from 'remotion';
import {expoOut} from '../sankhau/chuyendong';
import {easeOut, kep} from '../sankhau/donghieu';
import {FONT_DAM, chuTrenMau} from '../theme';

// CÁC ĐIỂM NHẤN CHUYỂN ĐỘNG của bộ hiệu ứng mới (phongCach.chuyenDong = "moi"). Tất cả là nét/vòng/chữ vector
// nên dựng rất nhẹ (không làm mờ toàn màn hình).

/* ---------- vòng sóng lan (đánh dấu một điểm / nhãn vừa xuất hiện) ---------- */
export const VongSong: React.FC<{x: number; y: number; p: number; mau: string; R?: number; soVong?: number}> = ({x, y, p, mau, R = 90, soVong = 2}) => {
  if (p <= 0 || p >= 1.6) return null;
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: x, top: y, overflow: 'visible', pointerEvents: 'none'}}>
      {Array.from({length: soVong}, (_, k) => {
        const q = kep((p - k * 0.22) / 1);
        if (q <= 0 || q >= 1) return null;
        const e = easeOut(q);
        return <circle key={k} r={R * (0.25 + 0.95 * e)} fill="none" stroke={mau} strokeWidth={5 * (1 - e) + 1} opacity={(1 - q) * 0.95} style={{filter: `drop-shadow(0 0 6px ${mau})`}} />;
      })}
      <circle r={9 * (1 - kep(p - 0.5))} fill={mau} opacity={1 - kep(p - 0.6)} style={{filter: `drop-shadow(0 0 10px ${mau})`}} />
    </svg>
  );
};

/* ---------- con dấu "BẪY!" đóng xuống (cái bẫy) ---------- */
export const DauBay: React.FC<{f: number; chu?: string}> = ({f, chu = 'BẪY!'}) => {
  if (f < 0 || f > 62) return null;
  const a = expoOut(kep(f / 7));
  const do_ = '#FF4D4F';
  // con dấu chỉ đóng ~1,5 giây rồi tan (không che chữ của cảnh suốt thời gian còn lại)
  return (
    <div data-kd-bo="1" style={{position: 'absolute', transform: `translate(-50%, -50%) rotate(-12deg) scale(${2.6 - 1.6 * a})`, opacity: kep(f / 3) * kep((62 - f) / 14) * 0.96, pointerEvents: 'none'}}>
      <div style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: 96, letterSpacing: 6, color: do_, padding: '6px 34px', border: `9px solid ${do_}`, borderRadius: 18, outline: `3px solid ${do_}`, outlineOffset: 6,
        textShadow: `0 0 18px ${do_}88`, boxShadow: `0 0 40px ${do_}55, inset 0 0 30px ${do_}33`, background: 'rgba(30,6,8,0.35)', whiteSpace: 'nowrap'}}>
        {chu}
      </div>
    </div>
  );
};

// nét gạch đỏ viết tay (đè lên lời giải sai), vẽ dần theo p
export const GachTay: React.FC<{w: number; h: number; p: number; mau?: string}> = ({w, h, p, mau = '#FF4D4F'}) => (
  <svg width={w || '100%'} height={h || '100%'} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}} viewBox="0 0 100 20" preserveAspectRatio="none">
    <path d="M1 13 C 18 6, 30 15, 48 9 S 78 5, 99 8" stroke={mau} strokeWidth={6} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeOut(kep(p))} vectorEffect="non-scaling-stroke" style={{filter: `drop-shadow(0 0 4px ${mau})`}} />
    <path d="M3 15 C 25 10, 55 16, 97 11" stroke={mau} strokeWidth={4} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeOut(kep(p * 1.4 - 0.4))} vectorEffect="non-scaling-stroke" opacity={0.8} />
  </svg>
);

/* ---------- lóe sáng đáp án: chớp + tia tỏa + vòng xung kích ---------- */
export const LoeSang: React.FC<{f: number; x: number; y: number; mau: string}> = ({f, x, y, mau}) => {
  if (f < 0 || f > 40) return null;
  const e = easeOut(kep(f / 26));
  const tia = 28;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.75), ${mau}55 22%, transparent 60%)`, opacity: 0.9 * (1 - kep(f / 10)), pointerEvents: 'none'}} />
      <svg width={1} height={1} style={{position: 'absolute', left: x, top: y, overflow: 'visible', pointerEvents: 'none'}}>
        {Array.from({length: tia}, (_, i) => {
          const g = (i / tia) * Math.PI * 2 + (i % 2) * 0.06;
          const dai = i % 3 === 0 ? 1 : 0.62;
          const r1 = 60 + 380 * e * dai;
          const r2 = r1 + (160 * (1 - e) + 30) * dai;
          return <line key={i} x1={Math.cos(g) * r1} y1={Math.sin(g) * r1} x2={Math.cos(g) * r2} y2={Math.sin(g) * r2} stroke={i % 2 ? '#FFF6D6' : mau} strokeWidth={(i % 3 === 0 ? 7 : 4) * (1 - e) + 1} strokeLinecap="round" opacity={1 - e} style={{filter: `drop-shadow(0 0 8px ${mau})`}} />;
        })}
        <circle r={80 + 900 * easeOut(kep(f / 34))} fill="none" stroke={mau} strokeWidth={10 * (1 - kep(f / 34)) + 1} opacity={0.8 * (1 - kep(f / 34))} />
        <circle r={60 + 600 * easeOut(kep((f - 4) / 30))} fill="none" stroke="#fff" strokeWidth={4 * (1 - kep((f - 4) / 30))} opacity={0.6 * (1 - kep((f - 4) / 30))} />
      </svg>
    </>
  );
};

/* ---------- vòng quỹ đạo chấm chấm quay chậm quanh hình chính ---------- */
export const QuyDao: React.FC<{cx: number; cy: number; R: number; mau: string; mo: number}> = ({cx, cy, R, mau, mo}) => {
  const f = useCurrentFrame();
  if (mo <= 0.01) return null;
  const vong = [
    {r: R, goc: f * 0.14, dash: '2 14', w: 3, o: 0.22},
    {r: R * 1.13, goc: -f * 0.09 + 40, dash: '1 22', w: 4, o: 0.14},
  ];
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: cx, top: cy, overflow: 'visible', opacity: mo, pointerEvents: 'none'}}>
      {vong.map((v, i) => (
        <g key={i} transform={`rotate(${v.goc})`}>
          <circle r={v.r} fill="none" stroke={mau} strokeWidth={v.w} strokeDasharray={v.dash} strokeLinecap="round" opacity={v.o} />
          <circle cx={v.r} cy={0} r={6} fill={mau} opacity={0.7} style={{filter: `drop-shadow(0 0 8px ${mau})`}} />
        </g>
      ))}
    </svg>
  );
};

/* ---------- đường tiến trình (thay thanh các bước): đường mảnh có chấm, đốm sáng chạy dọc ---------- */
export const DuongTienTrinh: React.FC<{cacPha: string[]; mocPha: {pha: string; tu: number; den: number}[]; mau: string; tu: number; den: number}> = ({cacPha, mocPha, mau, tu, den}) => {
  const f = useCurrentFrame();
  if (f < tu || f > den || cacPha.length < 2) return null;
  const mo = kep((f - tu) / 12) * kep((den - f) / 10);
  const X0 = 150, X1 = 930, Y = 186;
  const n = cacPha.length;
  const xCua = (i: number) => X0 + ((X1 - X0) * i) / (n - 1);
  const m = mocPha.find((x) => f >= x.tu && f < x.den) || mocPha[mocPha.length - 1];
  const iHien = Math.max(0, cacPha.indexOf(m.pha));
  const tienDo = kep((f - m.tu) / Math.max(1, m.den - m.tu));
  const xSang = xCua(iHien) + (iHien < n - 1 ? (xCua(iHien + 1) - xCua(iHien)) * tienDo * 0.92 : 0);
  const doiLuc = f - m.tu;
  const vaoNhan = expoOut(kep(doiLuc / 10));
  return (
    <div data-kd-bo="1" style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 260, opacity: mo, pointerEvents: 'none'}}>
      <svg width={1080} height={260} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <line x1={X0} y1={Y} x2={X1} y2={Y} stroke="rgba(255,255,255,0.16)" strokeWidth={2} />
        <line x1={X0} y1={Y} x2={xSang} y2={Y} stroke={mau} strokeWidth={3} opacity={0.85} style={{filter: `drop-shadow(0 0 6px ${mau})`}} />
        {cacPha.map((_, i) => {
          const qua = i < iHien;
          const nay = i === iHien;
          return (
            <g key={i}>
              {nay ? <circle cx={xCua(i)} cy={Y} r={11 + 5 * Math.sin(f / 7)} fill="none" stroke={mau} strokeWidth={2} opacity={0.5} /> : null}
              <circle cx={xCua(i)} cy={Y} r={nay ? 8 : 5} fill={qua || nay ? (nay ? mau : 'rgba(255,255,255,0.85)') : 'rgba(10,18,20,1)'} stroke={qua || nay ? 'none' : 'rgba(255,255,255,0.35)'} strokeWidth={2} />
            </g>
          );
        })}
        <circle cx={xSang} cy={Y} r={5} fill="#fff" style={{filter: `drop-shadow(0 0 8px ${mau}) drop-shadow(0 0 3px #fff)`}} />
      </svg>
      {/* tên bước hiện tại: viên thuốc màu nhấn nằm NGAY TRÊN đường (không đè chip tiêu đề phía trên, không đè dòng dữ kiện phía dưới) */}
      <div style={{position: 'absolute', left: Math.max(90, Math.min(990, xCua(iHien))), top: Y, transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * vaoNhan})`, opacity: vaoNhan, fontFamily: FONT_DAM, fontWeight: 900, fontSize: 22, letterSpacing: 2, color: chuTrenMau(mau), background: mau, borderRadius: 999, padding: '3px 14px', whiteSpace: 'nowrap', boxShadow: `0 0 14px ${mau}`}}>
        {m.pha}
      </div>
    </div>
  );
};

/* ---------- máy quay: trôi chậm + "đập zoom" + rung + lùi ra ---------- */
export type SuKienMay = {f: number; kieu: 'dap' | 'rung'; manh?: number};
export function mayQuay(f: number, ketThuc: number, suKien: SuKienMay[], luiRa: boolean) {
  let s = 1 + 0.018 * kep(f / Math.max(1, ketThuc));
  let x = 0, y = 0;
  for (const k of suKien) {
    const d = f - k.f;
    if (d < 0 || d > 40) continue;
    const m = k.manh ?? 1;
    if (k.kieu === 'dap') s += 0.022 * m * Math.sin(Math.PI * Math.min(d / 24, 1)) ** 2;
    else {
      const g = Math.sin(Math.PI * Math.min(d / 20, 1)) ** 2;
      x += Math.sin(d * 0.30) * 2 * m * g;
      y += Math.sin(d * 0.22) * 1.5 * m * g;
    }
  }
  if (luiRa) s *= 1 + 0.07 * (1 - easeOut(kep(f / 45)));
  return {s, x, y};
}

/* ---------- cửa tròn (iris): đĩa tối viền sáng nở từ giữa màn hình che cảnh cũ, cảnh mới hiện trên đó ---------- */
export function cuaTron(f: number) {
  return {p: kep(f / 13) < 1 ? 1 - Math.pow(1 - kep(f / 13), 3) : 1};
}
export const DiaCuaTron: React.FC<{f: number}> = ({f}) => {
  const p = cuaTron(f).p;
  const mo = 1 - kep((f - 14) / 10);
  if (mo <= 0) return null;
  const r = p * 0.62 * Math.hypot(1080, 1920);
  return <div style={{position: 'absolute', left: 540 - r, top: 1920 * 0.52 - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: 'radial-gradient(circle, #040a0c 0%, #040a0c 70%, #071316 100%)', opacity: mo, pointerEvents: 'none'}} />;
};
export const VienCuaTron: React.FC<{p: number; mau: string}> = ({p, mau}) => {
  if (p <= 0 || p >= 1) return null;
  const r = p * 0.62 * Math.hypot(1080, 1920);
  return <div style={{position: 'absolute', left: 540 - r, top: 1920 * 0.52 - r, width: 2 * r, height: 2 * r, borderRadius: '50%', border: `${10 * (1 - p) + 2}px solid ${mau}`, boxShadow: `0 0 40px ${mau}`, opacity: 1 - p, pointerEvents: 'none'}} />;
};
