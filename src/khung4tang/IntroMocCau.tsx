// v93 — INTRO "3 GIÂY MÓC CÂU" của khung 4 tầng: phủ lên những giây đầu phần nội dung, CÙNG LÚC giọng đọc cảnh mở đầu
// (không còn intro thương hiệu im lặng phía trước). Mô hình 3D chính KHÔNG vẽ ở đây: Khung4Tang giữ đúng một sân khấu
// 3D Vector, đặt nó giữa màn hình (zoom-out + xoay mở) rồi trượt về tầng 2 khi intro tan -> một hình liền mạch.
// Bố cục cố định (chữ không bao giờ đè mô hình): viên thuốc nhan_thi | tiêu đề vàng ánh kim tối đa 2 dòng | dòng phụ cyan
// | [vùng mô hình INTRO_SAN] | câu hook | nút CTA san hô. Cỡ chữ tự co theo độ dài (ước lượng tất định, không đo DOM).
import React from 'react';
import {AbsoluteFill, Audio, random, Sequence, spring, staticFile, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {emRa, kep01} from '../3d-vector/toan3d';
import type {MocCau} from './kieu';
import {coTieuDeIntro, coVua, haiDong, INTRO_SAN, RONG_CHU, raIntro} from './bo_cuc_v93';

export {giayIntro, INTRO_SAN, raIntro} from './bo_cuc_v93';

const VANG_SANG = '#FFF1B8', VANG = '#F5C542', VANG_DAM = '#D99A1E';
const CYAN = '#3FD8F2';
const SAN_HO = '#FF5A5F';

const HatSang: React.FC<{t: number; a: number}> = ({t, a}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: a}}>
    {Array.from({length: 36}, (_, i) => {
      const x = random(`hx${i}`) * 1080;
      const v = 14 + random(`hv${i}`) * 26; // px/giây trôi lên
      const y = ((random(`hy${i}`) * 1500 + 300 - t * v) % 1500 + 1500) % 1500 + 260;
      const r = 1.4 + random(`hr${i}`) * 2.6;
      const nhay = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1.3 + random(`hf${i}`) * 1.6) + i));
      const mau = i % 3 === 0 ? CYAN : VANG_SANG;
      return (
        <g key={i} opacity={0.5 * nhay}>
          <circle cx={x} cy={y} r={r * 3.2} fill={mau} opacity={0.12} />
          <circle cx={x} cy={y} r={r} fill={mau} />
        </g>
      );
    })}
  </svg>
);

export const IntroMocCau: React.FC<{m: MocCau; t: number; G: number}> = ({m, t, G}) => {
  const {fps} = useVideoConfig();
  const f = Math.round(t * fps);
  const ra = raIntro(t, G);
  const con = 1 - ra;
  if (con <= 0.001) return null;
  const tHook = G * 0.6, tCta = G * 0.66;
  const lo = (tu: number, d = 0.35) => emRa((t - tu) / d);
  const lo_lo = (tu: number) => spring({frame: f - Math.round(tu * fps), fps, config: {damping: 14, stiffness: 150, mass: 0.7}});

  const dongTD = haiDong(m.tieu_de);
  const coTD = coTieuDeIntro(dongTD);
  const coPhu = coVua(m.phu_de, 40, 26, RONG_CHU, 0.62);
  const dongHook = haiDong(m.cau_hook, 22);
  const coHook = Math.min(60, coVua(dongHook.reduce((a, b) => (b.length > a.length ? b : a), ''), 60, 38, RONG_CHU, 0.66));
  const coCta = coVua(m.cta, 40, 28, 640, 0.66);

  const aPill = lo(0, 0.25);
  const sTD = lo_lo(0.12);
  const aPhu = lo(0.45, 0.4);
  const sHook = lo_lo(tHook);
  const sCta = lo_lo(tCta);
  const nhun = t > tCta + 0.4 ? 1 + 0.045 * Math.max(0, Math.sin(((t - tCta - 0.4) * 2 * Math.PI) / 0.9)) : 1;
  const tamSan = INTRO_SAN.y + INTRO_SAN.h / 2;
  const tho = 0.85 + 0.15 * Math.sin((t * 2 * Math.PI) / 2.6);

  return (
    <AbsoluteFill data-vung="intro" style={{pointerEvents: 'none', fontFamily: FONT}}>
      {/* nền phủ tối nhẹ che lưới tầng (khung 4 tầng chưa vào) + quầng sáng dịu sau mô hình */}
      <AbsoluteFill style={{opacity: con, background: `radial-gradient(ellipse 560px 430px at 540px ${tamSan}px, rgba(63,216,242,${0.16 * tho}) 0%, rgba(245,197,66,0.07) 45%, rgba(14,16,20,0) 75%)`}} />
      <HatSang t={t} a={con} />

      {/* 1. viên thuốc ngữ cảnh thi */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center', opacity: aPill * con, transform: `translateY(${(1 - aPill) * -14 - ra * 30}px)`}}>
        <div style={{height: 54, padding: '0 28px', borderRadius: 27, display: 'flex', alignItems: 'center', background: 'rgba(245,197,66,0.12)', border: `1.5px solid ${VANG}`,
          color: VANG_SANG, fontWeight: 800, fontSize: coVua(m.nhan_thi, 28, 20, 900, 0.64), letterSpacing: 1.4, whiteSpace: 'nowrap', boxShadow: '0 0 24px rgba(245,197,66,0.18)'}}>
          {m.nhan_thi}
        </div>
      </div>

      {/* 2. tiêu đề vàng ánh kim (lớp glow phía sau + lớp gradient phía trước) */}
      <div style={{position: 'absolute', left: 64, right: 64, top: 236, height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        opacity: kep01(sTD * 1.4) * con, transform: `scale(${0.9 + 0.1 * sTD}) translateY(${-ra * 40}px)`}}>
        {dongTD.map((d, i) => (
          <div key={i} style={{position: 'relative', fontWeight: 900, fontSize: coTD, lineHeight: 1.04, letterSpacing: -0.5, whiteSpace: 'nowrap'}}>
            <span style={{position: 'absolute', inset: 0, color: VANG, textShadow: `0 0 18px rgba(245,197,66,0.55), 0 0 42px rgba(245,197,66,0.25), 0 4px 0 #5A3D06`}}>{d}</span>
            <span style={{position: 'relative', background: `linear-gradient(180deg, ${VANG_SANG} 8%, ${VANG} 52%, ${VANG_DAM} 96%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{d}</span>
          </div>
        ))}
      </div>

      {/* 3. dòng phụ chuyên đề */}
      <div style={{position: 'absolute', left: 64, right: 64, top: 470, textAlign: 'center', color: CYAN, fontWeight: 800, fontSize: coPhu, letterSpacing: 2, whiteSpace: 'nowrap',
        opacity: aPhu * con, transform: `translateY(${(1 - aPhu) * 12 - ra * 30}px)`, textShadow: '0 0 16px rgba(63,216,242,0.35)'}}>
        {m.phu_de}
      </div>

      {/* 4. câu hook tâm lý (giây ~3) */}
      {t >= tHook - 0.05 ? (
        <div style={{position: 'absolute', left: 64, right: 64, top: INTRO_SAN.y + INTRO_SAN.h + 24, height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          opacity: kep01(sHook * 1.5) * con, transform: `scale(${0.86 + 0.14 * sHook}) translateY(${ra * 30}px)`}}>
          {dongHook.map((d, i) => (
            <div key={i} style={{color: '#FFFFFF', fontWeight: 900, fontSize: coHook, lineHeight: 1.1, whiteSpace: 'nowrap', textShadow: '0 3px 0 rgba(0,0,0,0.6), 0 0 22px rgba(255,90,95,0.3)'}}>{d}</div>
          ))}
        </div>
      ) : null}

      {/* 5. nút CTA san hô, nhịp nhún spring */}
      {t >= tCta - 0.05 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: INTRO_SAN.y + INTRO_SAN.h + 182, display: 'flex', justifyContent: 'center', opacity: kep01(sCta * 2) * con, transform: `translateY(${ra * 40}px)`}}>
          <div style={{height: 92, minWidth: 420, padding: '0 44px', borderRadius: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            background: `linear-gradient(180deg, #FF7A7E, ${SAN_HO} 55%, #E2393F)`, boxShadow: `0 7px 0 #9E1F25, 0 0 34px rgba(255,90,95,0.45)`,
            transform: `scale(${(0.6 + 0.4 * sCta) * nhun})`, color: '#FFFFFF', fontWeight: 900, fontSize: coCta, letterSpacing: 0.8, whiteSpace: 'nowrap'}}>
            <svg width={34} height={34} viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z" fill="#fff" /></svg>
            {m.cta}
          </div>
        </div>
      ) : null}

      <Sequence from={Math.round(tCta * fps)} durationInFrames={20} layout="none">
        <Audio src={staticFile('sfx/pop.wav')} volume={0.35} />
      </Sequence>
      <Sequence from={Math.round(tHook * fps)} durationInFrames={20} layout="none">
        <Audio src={staticFile('sfx/swoosh.wav')} volume={0.25} />
      </Sequence>
    </AbsoluteFill>
  );
};
