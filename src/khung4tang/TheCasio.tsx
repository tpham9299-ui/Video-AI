// v90 — KHỐI BẤM MÁY TÍNH CASIO: các phím sáng lần lượt (phím đang bấm có viền màu nhấn) rồi màn hình hiện kết quả.
import React from 'react';
import {FONT, SO_DEU} from '../theme';
import {Toan} from '../Toan';
import {emRa, kep01} from '../3d-vector/toan3d';

const NHIP = 0.22; // giây mỗi phím

export const TheCasio: React.FC<{phim: string[]; ketQua: string; t: number; mau: string}> = ({phim, ketQua, t, mau}) => {
  const ds = phim.slice(0, 14);
  const tKq = ds.length * NHIP + 0.15;
  const aKq = emRa((t - tKq) / 0.35);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
        {ds.map((p, i) => {
          const a = kep01((t - i * NHIP) / 0.15);
          const dangBam = t >= i * NHIP && t < (i + 1) * NHIP + 0.08;
          return (
            <div key={i} style={{minWidth: 62, height: 58, padding: '0 14px', borderRadius: 12, background: dangBam ? `${mau}2A` : '#1A1F29',
              border: `1.5px solid ${dangBam ? mau : 'rgba(230,237,245,0.14)'}`, borderBottomWidth: dangBam ? 1.5 : 4, boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.25 + 0.75 * a, transform: `translateY(${dangBam ? 2 : 0}px)`}}>
              <Toan tex={p} size={28} color={dangBam ? mau : '#E6EDF5'} />
            </div>
          );
        })}
      </div>
      <div style={{alignSelf: 'stretch', height: 70, borderRadius: 12, background: '#0B1512', border: '1px solid rgba(52,211,153,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 22px', ...SO_DEU}}>
        <span style={{opacity: aKq, fontFamily: FONT}}>
          <Toan tex={ketQua} size={40} color="#34D399" maxWidth={820} />
        </span>
      </div>
    </div>
  );
};
