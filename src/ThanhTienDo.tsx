import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FONT, MAU} from './theme';

// Thanh tiến độ ở đầu video + nhãn nhỏ. Nằm trong vùng an toàn của TikTok/Shorts (cách mép trên ~70px).
// v99.4: `moc` (tùy chọn) = khung bắt đầu từng chặng -> chia thanh thành các đốt; không có -> thanh liền + điểm sáng ở đầu vạch.
export const ThanhTienDo: React.FC<{tongFrame: number; lop: string; mon?: string; moc?: number[]}> = ({tongFrame, lop, mon, moc}) => {
  const frame = useCurrentFrame();
  const p = Math.min(1, frame / Math.max(1, tongFrame - 1));
  const bien = moc && moc.length > 1
    ? [...moc].filter((m) => m >= 0 && m < tongFrame).sort((a, b) => a - b).concat(tongFrame)
    : null;
  const dot = bien && bien.length > 2 ? bien : null;
  const nhan = mon === 'Hình học' ? '📐 Tư duy hình học' : mon && mon !== 'Xác suất' ? `💡 ${mon}` : '🎲 Tư duy xác suất';
  return (
    <>
      {dot ? (
        <div style={{position: 'absolute', left: 60, right: 60, top: 68, height: 10, display: 'flex', gap: 4}}>
          {dot.slice(0, -1).map((b0, k) => {
            const b1 = dot[k + 1];
            const f = Math.max(0, Math.min(1, (frame - b0) / Math.max(1, b1 - b0)));
            const chay = frame >= b0 && frame < b1;
            return (
              <div key={k} style={{flex: b1 - b0, height: '100%', borderRadius: 5, background: MAU.the, position: 'relative', opacity: chay || f >= 1 ? 1 : 0.8}}>
                <div style={{width: `${f * 100}%`, height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${MAU.lam}, ${MAU.vang})`,
                  boxShadow: chay ? `0 0 12px ${MAU.vang}AA` : undefined, opacity: chay ? 1 : 0.7}} />
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{position: 'absolute', left: 60, right: 60, top: 68, height: 10, borderRadius: 5, background: MAU.the}}>
          <div
            style={{
              width: `${p * 100}%`,
              height: '100%',
              borderRadius: 5,
              background: `linear-gradient(90deg, ${MAU.lam}, ${MAU.vang})`,
            }}
          />
          {p > 0 && p < 1 ? <div style={{position: 'absolute', top: '50%', left: `${p * 100}%`, width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: 8,
            background: '#FFF6D6', boxShadow: `0 0 12px 3px ${MAU.vang}CC`}} /> : null}
        </div>
      )}
      <div
        data-kd-bo="1"
        style={{
          position: 'absolute',
          left: 60,
          top: 84,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 25,
          color: MAU.mo,
        }}
      >
        {nhan}{lop ? ` · Lớp ${lop}` : ''}
      </div>
    </>
  );
};
