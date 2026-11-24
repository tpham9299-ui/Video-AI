// v99.1 — SÂN KHẤU TỰ SINH 2.5D (tầng 2). Lớp SVG do mã Python của BP2 sinh (chạy trong hộp cát scripts/tu_sinh_svg.py,
// đã kiểm thẻ / thuộc tính / tọa độ trong viewBox 0 0 800 540). Mỗi lớp có mốc `t` = mốc lời đọc của bước nó thuộc về.
// Hiệu ứng (spring, theo frame - không CSS transition): moc = mọc lên + hiện; no = nở từ tâm hình; ve = quét lộ trái -> phải;
// sang = hiện + sáng lên (chỉ brightness, không blur). Lớp mới nhất được nhấn sáng ~1,4 s rồi lắng xuống; lớp cũ dịu 82 % để mắt theo lớp đang giảng.
import React from 'react';
import {spring} from 'remotion';
import {FONT} from '../theme';

export type LopTuSinh = {id: string; t: number; svg: string; hieu_ung: 'moc' | 'no' | 'sang' | 've'; buoc?: number; nhan?: string; nhom?: string};

// lớp cùng `nhom` thay nhau: khi lớp sau cùng nhóm đã hiện, lớp trước mờ hẳn trong 0,4 s (không chồng nhãn)
export function heSoThay(l: LopTuSinh, ds: LopTuSinh[], t: number): number {
  if (!l.nhom) return 1;
  const sau = ds.filter((x) => x.nhom === l.nhom && x.t > l.t && x.t <= t);
  if (!sau.length) return 1;
  return Math.max(0, 1 - (t - Math.min(...sau.map((x) => x.t))) / 0.4);
}
export type TuSinhVao = {viewBox?: string; lop: LopTuSinh[]; mo_ta?: string};

const W = 800, H = 540;

export function trangThaiLop(l: LopTuSinh, t: number, fps: number, moiNhat: boolean): {hien: number; s: number; dy: number; quet: number; sang: number} {
  const f = Math.max(0, (t - l.t) * fps);
  if (t < l.t) return {hien: 0, s: 1, dy: 0, quet: 0, sang: 0};
  const sp = spring({frame: f, fps, config: {damping: 16, stiffness: 120, mass: 0.8}});
  const dtt = t - l.t;
  const sang = moiNhat ? Math.max(0, 1 - Math.max(0, dtt - 0.5) / 0.9) : 0;
  const lang = moiNhat ? 1 : 0.82;
  switch (l.hieu_ung) {
    case 'no': return {hien: Math.min(1, sp * 1.2) * lang, s: 0.82 + 0.18 * sp, dy: 0, quet: 1, sang};
    // v99.5: nhấn chi tiết bằng lò xo (scale nảy nhẹ ~1,8 % khi lớp mới nhất vừa hiện); quét 1,1 s, độ dịu 82 %, hiện/ẩn giữ nguyên
    case 've': return {hien: lang, s: 1 + (moiNhat ? 0.018 * Math.sin(Math.PI * Math.min(1, sp)) : 0), dy: 0, quet: Math.min(1, dtt / 1.1), sang};
    case 'sang': return {hien: Math.min(1, sp * 1.3) * lang, s: 1 + (moiNhat ? 0.025 * Math.sin(Math.PI * Math.min(1, sp)) : 0), dy: 0, quet: 1, sang: Math.max(sang, moiNhat ? 0.35 : 0)};
    default: return {hien: Math.min(1, sp * 1.2) * lang, s: 0.97 + 0.03 * sp, dy: 14 * (1 - sp), quet: 1, sang};
  }
}

export const SanKhauTuSinh: React.FC<{ts: TuSinhVao; t: number; fps: number; rong: number; cao: number; xung?: number}> = ({ts, t, fps, rong, cao, xung = -1}) => {
  const lop = ts.lop || [];
  const daHien = lop.filter((l) => l.t <= t);
  const moiNhat = daHien.length ? daHien[daHien.length - 1].id : '';
  // hình vừa T2, giữ tỉ lệ 800:540, căn giữa; xung nhịp chống đứng hình = zoom rất nhẹ 1 -> 1,018 -> 1
  const k = Math.min(rong / W, cao / H) * 0.96;
  const zoom = xung >= 0 ? 1 + 0.018 * Math.sin(Math.PI * xung) : 1;
  return (
    <div data-tu-sinh style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <svg viewBox={ts.viewBox || '0 0 800 540'} width={W * k} height={H * k} style={{overflow: 'visible', scale: String(zoom), fontFamily: FONT}}>
        <defs>
          {lop.map((l) => (
            <clipPath key={l.id} id={`ts-quet-${l.id}`}>
              <rect x={-10} y={-10} width={(W + 20) * trangThaiLop(l, t, fps, l.id === moiNhat).quet} height={H + 20} />
            </clipPath>
          ))}
        </defs>
        {lop.map((l) => {
          const s = trangThaiLop(l, t, fps, l.id === moiNhat);
          const thay = heSoThay(l, lop, t);
          if (s.hien * thay <= 0.001) return null;
          return (
            <g key={l.id} data-lop={l.id} opacity={s.hien * thay} clipPath={s.quet < 1 ? `url(#ts-quet-${l.id})` : undefined}
              style={{transformBox: 'view-box', transformOrigin: '400px 270px', scale: String(s.s), translate: `0px ${s.dy}px`,
                filter: s.sang > 0.01 ? `brightness(${1 + 0.32 * s.sang})` : undefined}}>
              <g dangerouslySetInnerHTML={{__html: l.svg}} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
