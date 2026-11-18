import React from 'react';
import {FONT} from './theme';

// Các vật thật có chuyển động 3D (CSS 3D, dựng hoàn toàn theo số khung hình nên cho kết quả giống nhau mỗi lần).
// q: tiến độ của chuyển động, 0 = vừa xuất hiện, 1 = đã dừng hẳn.

const dungCham = (q: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, q)), 3);

const CHAM: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};
// Vị trí mỗi mặt của khối lập phương (mặt đối diện cộng lại bằng 7) và phép xoay đưa mặt đó về phía người xem.
const DAT_MAT: Record<number, string> = {
  1: 'rotateY(0deg)', 6: 'rotateY(180deg)', 3: 'rotateY(90deg)', 4: 'rotateY(-90deg)', 2: 'rotateX(90deg)', 5: 'rotateX(-90deg)',
};
const HUONG_MAT: Record<number, string> = {
  1: '', 6: 'rotateY(180deg)', 3: 'rotateY(-90deg)', 4: 'rotateY(90deg)', 2: 'rotateX(-90deg)', 5: 'rotateX(90deg)',
};

// Xúc xắc: tung lên, xoay nhiều vòng, nảy vài lần rồi dừng ở đúng mặt cần hiển thị.
export const Xuc3D: React.FC<{L: number; mat: number; q: number}> = ({L, mat, q}) => {
  const e = dungCham(q);
  const dy = q >= 1 ? 0 : -Math.abs(Math.sin(q * Math.PI * 3.2)) * (1 - q) * 150;
  const bong = 1 - Math.min(1, Math.abs(dy) / 220);
  const mat1 = Math.min(6, Math.max(1, Math.round(mat)));
  return (
    <div style={{width: L, height: L, position: 'relative'}}>
      <div
        style={{
          position: 'absolute',
          left: L * 0.05,
          top: L * 1.0,
          width: L * (0.55 + 0.5 * bong),
          height: L * 0.24,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 72%)',
          opacity: 0.45 + 0.5 * bong,
        }}
      />
      <div style={{perspective: 1100, width: L, height: L, transform: `translate(${(1 - e) * -120}px, ${dy}px)`}}>
        <div
          style={{
            width: L,
            height: L,
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${-24 + 720 * (1 - e)}deg) rotateY(${-30 + 540 * (1 - e)}deg) rotateZ(${180 * (1 - e)}deg) ${HUONG_MAT[mat1]}`,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              style={{
                position: 'absolute',
                inset: 0,
                transform: `${DAT_MAT[n]} translateZ(${L / 2}px)`,
                borderRadius: L * 0.17,
                background: 'linear-gradient(145deg, #ffffff 0%, #e3e9ee 100%)',
                boxShadow: 'inset 0 0 0 3px #cfd8dc, inset 0 -8px 16px rgba(0,0,0,0.12)',
                backfaceVisibility: 'hidden',
              }}
            >
              {CHAM[n].map((c, k) => (
                <div
                  key={k}
                  style={{
                    position: 'absolute',
                    width: L * 0.17,
                    height: L * 0.17,
                    borderRadius: '50%',
                    left: L * (0.2 + 0.3 * c[1]) - (L * 0.17) / 2 + L * 0.1,
                    top: L * (0.2 + 0.3 * c[0]) - (L * 0.17) / 2 + L * 0.1,
                    background: n === 1 ? 'radial-gradient(circle at 35% 30%, #ff8a80, #d32f2f)' : 'radial-gradient(circle at 35% 30%, #546e7a, #102027)',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Đồng xu: tung lên cao, xoay lật nhiều vòng rồi dừng ở mặt sấp (S) hoặc ngửa (N).
export const Xu3D: React.FC<{R: number; mat: 'S' | 'N'; q: number}> = ({R, mat, q}) => {
  const e = dungCham(q);
  const goc = (1 - e) * 1440 + (mat === 'N' ? 180 : 0);
  const dy = -Math.sin(Math.min(1, q) * Math.PI) * 190;
  const bong = 1 - Math.min(1, Math.abs(dy) / 240);
  const mat_ = (chu: string, lat: boolean) => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        backfaceVisibility: 'hidden',
        transform: lat ? 'rotateY(180deg)' : undefined,
        background: 'radial-gradient(circle at 32% 28%, #fff3b0 0%, #ffd54a 35%, #f9a825 75%, #b27a00 100%)',
        boxShadow: 'inset 0 0 0 6px #e0a100, inset 0 0 0 12px #ffe27a, inset 0 0 0 14px #c58b00, 0 6px 18px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: R * 1.05,
        color: '#8a5d00',
        textShadow: '0 2px 0 rgba(255,255,255,0.6)',
      }}
    >
      {chu}
    </div>
  );
  return (
    <div style={{width: R * 2, height: R * 2, position: 'relative'}}>
      <div
        style={{
          position: 'absolute',
          left: R * 0.15,
          top: R * 2.08,
          width: R * 1.7 * (0.55 + 0.5 * bong),
          height: R * 0.42,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 72%)',
          opacity: 0.35 + 0.6 * bong,
        }}
      />
      <div style={{perspective: 900, width: R * 2, height: R * 2, transform: `translateY(${dy}px)`}}>
        <div style={{width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transform: `rotateX(${14}deg) rotateY(${goc}deg)`}}>
          {mat_('S', false)}
          {mat_('N', true)}
        </div>
      </div>
    </div>
  );
};

const CHAT_BAI: Record<string, {k: string; c: string}> = {
  co: {k: '♥', c: '#e53935'}, ro: {k: '♦', c: '#e53935'}, chuong: {k: '♣', c: '#263238'}, bich: {k: '♠', c: '#263238'},
};

// Lá bài: trượt từ bộ bài ra, lật mặt lên.
export const Bai3D: React.FC<{W: number; giaTri: string; chat: string; q: number}> = ({W, giaTri, chat, q}) => {
  const e = dungCham(q);
  const H = W * 1.42;
  const ch = CHAT_BAI[chat] || CHAT_BAI.co;
  const lat = 180 * (1 - dungCham((q - 0.25) / 0.75));
  const mat = (nguoc: boolean) => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: W * 0.1,
        backfaceVisibility: 'hidden',
        transform: nguoc ? 'rotateY(180deg)' : undefined,
        boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
        ...(nguoc
          ? {background: 'repeating-linear-gradient(45deg, #1e3c9c 0 8px, #2a52c9 8px 16px)', border: `${W * 0.06}px solid #ffffff`}
          : {background: '#ffffff', border: '2px solid #cfd8dc'}),
      }}
    >
      {!nguoc ? (
        <>
          <div style={{position: 'absolute', left: W * 0.1, top: W * 0.05, fontFamily: FONT, fontWeight: 800, fontSize: W * 0.34, lineHeight: 1.1, color: ch.c, textAlign: 'center'}}>
            {giaTri}
            <div style={{fontSize: W * 0.26, marginTop: -W * 0.05}}>{ch.k}</div>
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: H * 0.3, textAlign: 'center', fontSize: W * 0.62, lineHeight: 1, color: ch.c}}>{ch.k}</div>
        </>
      ) : null}
    </div>
  );
  return (
    <div style={{width: W, height: H, perspective: 1000, transform: `translate(${(1 - e) * -140}px, ${(1 - e) * -40}px) rotate(${(1 - e) * -18}deg)`}}>
      <div style={{width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transform: `rotateY(${lat}deg)`}}>
        {mat(false)}
        {mat(true)}
      </div>
    </div>
  );
};
