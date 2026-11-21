import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, GIAO_DIEN} from './theme';
import {Cau} from './types';

// CẢNH "ỨNG DỤNG THỰC TẾ" của bài khối tròn xoay / khối hộp: thay cho bản vẽ Manim hai hình trụ nét mảnh dùng lại
// từ phần giải. Mỗi vật đời thật được lời đọc nhắc tới là một thẻ minh họa (SVG tô khối có sáng-tối), hiện đúng lúc
// giọng đọc nói tới nó; thẻ đang được nói sáng viền màu nhấn, thẻ đã qua dịu xuống.
type Mau = {id: string; ten: string; tu: RegExp; ve: (m: string) => React.ReactNode};

const Lon = (m: string) => (
  <g>
    <defs>
      <linearGradient id="udLon" x1="0" x2="1"><stop offset="0" stopColor="#7d1f1a" /><stop offset=".35" stopColor="#e2483b" /><stop offset=".55" stopColor="#ff8a78" /><stop offset="1" stopColor="#6a1713" /></linearGradient>
      <linearGradient id="udNhom" x1="0" x2="1"><stop offset="0" stopColor="#7c8790" /><stop offset=".45" stopColor="#eef3f6" /><stop offset="1" stopColor="#6b757d" /></linearGradient>
    </defs>
    <ellipse cx="100" cy="196" rx="54" ry="10" fill="#000" opacity=".35" />
    <path d="M52 52 Q52 40 64 36 L136 36 Q148 40 148 52 L148 172 Q148 184 136 188 L64 188 Q52 184 52 172 Z" fill="url(#udLon)" />
    <rect x="52" y="96" width="96" height="38" fill="#fff" opacity=".9" />
    <rect x="52" y="104" width="96" height="6" fill={m} />
    <ellipse cx="100" cy="36" rx="44" ry="9" fill="url(#udNhom)" />
    <ellipse cx="100" cy="36" rx="36" ry="6" fill="#9aa5ad" />
    <rect x="92" y="30" width="18" height="6" rx="3" fill="#cdd5da" />
  </g>
);

const Bon = (m: string) => (
  <g>
    <defs>
      <linearGradient id="udBon" x1="0" x2="1"><stop offset="0" stopColor="#5d6a73" /><stop offset=".4" stopColor="#e6ecef" /><stop offset=".62" stopColor="#c3ccd2" /><stop offset="1" stopColor="#4b565e" /></linearGradient>
    </defs>
    <ellipse cx="100" cy="196" rx="76" ry="10" fill="#000" opacity=".35" />
    <rect x="44" y="176" width="10" height="20" fill="#59646b" /><rect x="146" y="176" width="10" height="20" fill="#59646b" />
    <path d="M36 70 Q100 20 164 70 L164 172 Q100 186 36 172 Z" fill="url(#udBon)" />
    {[96, 136].map((y) => <path key={y} d={`M36 ${y} Q100 ${y + 12} 164 ${y}`} stroke="#7d8a93" strokeWidth="3" fill="none" />)}
    <rect x="88" y="34" width="24" height="12" rx="2" fill="#7d8a93" />
    <rect x="160" y="150" width="24" height="7" fill="#7d8a93" /><circle cx="188" cy="153" r="7" fill={m} />
    <path d="M150 76 L150 170" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeDasharray="6 6" />
  </g>
);

const Silo = (m: string) => (
  <g>
    <defs>
      <linearGradient id="udSilo" x1="0" x2="1"><stop offset="0" stopColor="#6e5a3c" /><stop offset=".45" stopColor="#efe2c4" /><stop offset="1" stopColor="#5e4c33" /></linearGradient>
    </defs>
    <ellipse cx="100" cy="196" rx="56" ry="9" fill="#000" opacity=".35" />
    <path d="M56 64 Q100 18 144 64 L144 188 L56 188 Z" fill="url(#udSilo)" />
    {[84, 108, 132, 156].map((y) => <line key={y} x1="56" x2="144" y1={y} y2={y} stroke="#8d7a58" strokeWidth="2" />)}
    <rect x="94" y="150" width="14" height="38" fill="#3e3424" />
    <path d="M56 64 Q100 18 144 64" stroke={m} strokeWidth="4" fill="none" />
  </g>
);

const Ong = (m: string) => (
  <g>
    <defs>
      <linearGradient id="udOng" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#53606a" /><stop offset=".4" stopColor="#dfe6ea" /><stop offset="1" stopColor="#47525a" /></linearGradient>
    </defs>
    <ellipse cx="104" cy="168" rx="80" ry="9" fill="#000" opacity=".35" />
    <rect x="34" y="96" width="140" height="56" fill="url(#udOng)" />
    <ellipse cx="174" cy="124" rx="12" ry="28" fill="#2b343a" />
    <ellipse cx="174" cy="124" rx="7" ry="20" fill="#11171b" />
    <ellipse cx="34" cy="124" rx="12" ry="28" fill="#a9b4ba" />
    <rect x="96" y="92" width="14" height="64" fill={m} opacity=".85" />
  </g>
);

const Coc = (m: string) => (
  <g>
    <ellipse cx="100" cy="190" rx="50" ry="9" fill="#000" opacity=".35" />
    <path d="M58 54 L142 54 L132 182 Q100 192 68 182 Z" fill="#dfeef3" opacity=".85" />
    <path d="M62 96 L138 96 L132 182 Q100 192 68 182 Z" fill={m} opacity=".55" />
    <ellipse cx="100" cy="54" rx="42" ry="8" fill="#f4fbfd" stroke="#9fb5bd" strokeWidth="2" />
  </g>
);

const MAU_VAT: Mau[] = [
  {id: 'lon', ten: 'Lon nước', tu: /\blon\b|vỏ lon|đồ hộp/i, ve: Lon},
  {id: 'bon', ten: 'Bồn chứa', tu: /bồn|téc|bể chứa|thùng phi/i, ve: Bon},
  {id: 'silo', ten: 'Silo', tu: /silo|tháp chứa|kho thóc/i, ve: Silo},
  {id: 'ong', ten: 'Ống dẫn', tu: /ống|cống|đường ống/i, ve: Ong},
  {id: 'coc', ten: 'Cốc, ly', tu: /cốc|\bly\b|chén/i, ve: Coc},
];

export function vatUngDung(cau: Cau[]): {mau: Mau; bat: number}[] {
  const out: {mau: Mau; bat: number}[] = [];
  MAU_VAT.forEach((m) => {
    const c = cau.find((x) => m.tu.test(x.text));
    if (c) out.push({mau: m, bat: c.bat});
  });
  return out.sort((a, b) => a.bat - b.bat).slice(0, 3);
}

export const UngDungThucTe: React.FC<{cau: Cau[]; cao: number}> = ({cau, cao}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const nhan = GIAO_DIEN.nhan;
  let ds = vatUngDung(cau);
  if (!ds.length) ds = [MAU_VAT[0], MAU_VAT[1], MAU_VAT[3]].map((m, i) => ({mau: m, bat: 0.3 + i * 0.9}));
  const n = ds.length;
  const rong = n === 1 ? 560 : n === 2 ? 440 : 320;
  const iHien = ds.reduce((k, d, i) => (t >= d.bat ? i : k), -1);
  return (
    <div style={{display: 'flex', gap: 28, alignItems: 'flex-end', justifyContent: 'center', height: Math.min(cao, 900)}}>
      {ds.map((d, i) => {
        const vao = spring({frame: frame - Math.round(d.bat * fps), fps, config: {damping: 15, stiffness: 120}});
        const dangNoi = i === iHien;
        const sang = dangNoi ? 1 : iHien > i ? 0.55 : 0;
        return (
          <div key={d.mau.id} style={{
            width: rong, padding: '26px 18px 30px', borderRadius: 34,
            background: 'linear-gradient(180deg, rgba(26,44,58,0.92), rgba(12,22,31,0.94))',
            border: `2px solid ${dangNoi ? nhan : 'rgba(190,220,240,0.16)'}`,
            boxShadow: dangNoi ? `0 0 0 6px ${nhan}22, 0 24px 60px rgba(0,0,0,0.5)` : '0 18px 44px rgba(0,0,0,0.45)',
            opacity: vao * (0.45 + 0.55 * Math.max(sang, dangNoi ? 1 : 0.5)),
            transform: `translateY(${interpolate(vao, [0, 1], [60, 0])}px) scale(${interpolate(vao, [0, 1], [0.9, dangNoi ? 1.04 : 1])})`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, fontFamily: FONT,
          }}>
            <svg viewBox="0 0 200 210" width={rong - 60} height={(rong - 60) * 1.05}>{d.mau.ve(nhan)}</svg>
            <div style={{fontWeight: 700, fontSize: n === 3 ? 40 : 46, color: '#f2f8fb', letterSpacing: 0}}>{d.mau.ten}</div>
            <div style={{width: 56, height: 5, borderRadius: 3, background: nhan, opacity: 0.3 + 0.7 * sang}} />
          </div>
        );
      })}
    </div>
  );
};
