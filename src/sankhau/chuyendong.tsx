// Nhòe chuyển động theo hướng (motion blur) và các kiểu chuyển cảnh như video mẫu:
// nội dung lướt vào thật nhanh rồi hãm mượt (speed ramp), trong lúc lướt bị nhòe theo đúng hướng chuyển động.
import React from 'react';
import {kep} from './donghieu';

// hãm kiểu "expo": đi rất nhanh lúc đầu, dừng êm
export const expoOut = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * kep(p)));
export const expoIn = (p: number) => (p <= 0 ? 0 : Math.pow(2, 10 * kep(p) - 10));

let dem = 0;
// Bọc nội dung bằng bộ lọc nhòe theo trục x/y (px). Không nhòe thì không tạo bộ lọc.
export const NhoeHuong: React.FC<{nx: number; ny: number; children: React.ReactNode; style?: React.CSSProperties}> = ({nx, ny, children, style}) => {
  const id = React.useMemo(() => `nh${++dem}`, []);
  const co = nx > 0.4 || ny > 0.4;
  return (
    <div style={{...style, filter: co ? `url(#${id})` : style?.filter}}>
      {co ? (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <filter id={id} x="-20%" y="-30%" width="140%" height="160%">
            <feGaussianBlur stdDeviation={`${nx.toFixed(1)} ${ny.toFixed(1)}`} />
          </filter>
        </svg>
      ) : null}
      {children}
    </div>
  );
};

export const KIEU_CHUYEN = ['mo', 'truot_len', 'phong', 'luot_ngang', 'truot_xuong', 'lat_3d', 'quet_sang', 'tron_mo', 'zoom_xuyen', 'nghieng', 'lat_ngang', 'day_ngang'] as const;
export type KieuChuyen = (typeof KIEU_CHUYEN)[number];

// Trạng thái chuyển cảnh của một khối nội dung: vào trong `vaoF` khung đầu, ra trong `raF` khung cuối.
export function trangThaiChuyen(kieu: string, f: number, tong: number, boVao = false, boRa = false, vaoF = 12, raF = 7) {
  const a = boVao ? 1 : expoOut(f / vaoF); // 0 -> 1
  const b = boRa ? 0 : expoIn((f - (tong - raF)) / raF); // 0 -> 1 lúc kết thúc
  const conVao = 1 - a;
  let x = 0;
  let y = 0;
  let s = 1;
  let nx = 0;
  let ny = 0;
  let ry = 0;
  let rx = 0;
  let rz = 0;
  let clip: string | undefined;
  switch (kieu) {
    case 'quet_sang': // màn quét: nội dung lộ dần từ trái sang theo một vệt sáng, ra thì trượt nhẹ sang trái
      clip = conVao > 0.001 ? `inset(0 ${(conVao * 100).toFixed(1)}% 0 0)` : undefined;
      x = -60 * b;
      nx = 10 * b;
      break;
    case 'tron_mo': // vòng tròn mở rộng từ tâm (như ống kính mở)
      clip = conVao > 0.001 ? `circle(${(a * 120).toFixed(1)}% at 50% 45%)` : undefined;
      s = 1 + 0.05 * conVao - 0.06 * b;
      nx = ny = 6 * b;
      break;
    case 'zoom_xuyen': // phóng xuyên qua: cảnh mới lao từ xa tới, cảnh cũ phóng to tan mất
      s = 1 - 0.35 * conVao + 0.3 * b;
      nx = ny = 14 * conVao + 12 * b;
      break;
    case 'nghieng': // nghiêng nhẹ vào khung + trôi lên (chuyển động có hồn, không giật)
      rz = -7 * conVao + 5 * b;
      y = 90 * conVao - 60 * b;
      s = 1 - 0.06 * conVao;
      ny = 10 * conVao + 8 * b;
      break;
    case 'lat_ngang': // lật quanh trục ngang
      rx = 70 * conVao - 55 * b;
      s = 1 - 0.06 * conVao;
      ny = 8 * conVao + 6 * b;
      break;
    case 'day_ngang': // đẩy ngang mạnh: cảnh cũ bị đẩy sang trái, cảnh mới vào từ phải
      x = 620 * conVao - 620 * b;
      nx = 30 * conVao + 30 * b;
      break;
    case 'lat_3d':
      ry = -75 * conVao + 60 * b;
      s = 1 - 0.08 * conVao;
      nx = 6 * conVao + 6 * b;
      break;
    case 'phong':
      s = 1 + 0.22 * conVao - 0.1 * b;
      nx = ny = 9 * conVao + 7 * b;
      break;
    case 'luot_ngang':
      x = 360 * conVao - 360 * b;
      nx = 26 * conVao + 26 * b;
      break;
    case 'truot_xuong':
      y = -260 * conVao + 260 * b;
      ny = 24 * conVao + 24 * b;
      break;
    case 'mo': // hòa tan mềm: hơi trôi lên + phóng rất nhẹ, dùng giữa hai cảnh cùng một mạch (không gây giật)
      y = 26 * conVao - 14 * b;
      s = 1 + 0.03 * conVao - 0.015 * b;
      ny = 3 * conVao + 3 * b;
      break;
    default: // truot_len
      y = 160 * conVao - 160 * b;
      ny = 14 * conVao + 14 * b;
  }
  return {x, y, s, nx, ny, ry, rx, rz, clip, mo: kep(a * 1.6) * (1 - b)};
}
