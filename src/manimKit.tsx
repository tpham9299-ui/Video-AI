import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {MAU_TEN} from './bocuc';
import {kep01, smooth} from './manim';

// Công cụ chung cho các hình kiểu Manim.
export const mauTen = (ten: string, mac = '#ffffff'): string => MAU_TEN[ten] || mac;
export const useGiay = (): number => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};
// Thời gian hoạt cảnh co giãn theo độ dài lời đọc: hoạt cảnh thiết kế dài "can" giây; nếu lời đọc ngắn hơn thì chạy nhanh hơn (tối đa 1,6 lần)
// để vẫn kịp hoàn tất trong cảnh.
export const useGiayCan = (giayAm: number, can: number): number => {
  const t = useGiay();
  const s = Math.min(1, Math.max(0.62, (giayAm + 0.9) / Math.max(0.1, can)));
  return t / s;
};
// tiến độ mượt (smooth của Manim) của một hoạt cảnh bắt đầu lúc bd (giây), kéo dài dur giây
export const tien = (t: number, bd: number, dur = 0.6): number => smooth(kep01((t - bd) / dur));
// bộ sinh số ngẫu nhiên có hạt giống: cùng hạt giống thì cùng dãy số (video dựng lại luôn giống hệt)
export function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const PHAT_SANG_ID = 'phatSang';
// hiệu ứng "phát sáng" cho nét được nhấn mạnh: đặt <defs>{PhatSang}</defs> trong <svg>
export const PhatSang = (
  <filter id={PHAT_SANG_ID} x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="6" />
  </filter>
);
