import React from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {napPhong} from './phong';
import {easeInOut, easeOut, kep} from './sankhau/donghieu';
import {FONT, FONT_TIEU_DE} from './theme';
import {IntroProps, ThuongHieuProps} from './types';
import {TEN_KENH} from './ThuongHieu';

// INTRO THƯƠNG HIỆU "NÉT VẼ HÌNH HỌC" (chèn TRƯỚC cảnh hook, cấu hình ở phong_cach.json -> "intro"):
//  1. Nét sáng tự vẽ đường tròn rồi tam giác nội tiếp (kiểu Manim), các đỉnh lóe màu phụ.
//  2. Hình thu nhỏ thành biểu tượng, tên kênh hiện theo từng chữ (spring, khoảng chữ co lại), gạch chân mở ra.
//  3. Khẩu hiệu trượt lên.
//  4. Chuyển cảnh: đường tròn biểu tượng nở thành mặt nạ tròn, lộ cảnh mở đầu của bài (dùng chung 2 luồng).
// Mọi mốc thời gian tính theo tỉ lệ của bản chuẩn 2,8 giây nên đổi "giay" không làm vỡ nhịp.

const CHUAN = 2.8; // giây của bản thiết kế gốc
const CX = 540;
const CY0 = 900; // tâm hình lúc vẽ
const CY1 = 770; // tâm biểu tượng sau khi thu nhỏ (cũng là tâm mặt nạ chuyển cảnh)
const R = 170;

// lệch khung của phần nội dung so với đầu video (ảnh bìa + intro); dùng chung cho mọi tầng đọc mốc khung hình
export const lechIntro = (it?: IntroProps | null) => (it && it.soFrame > 0 ? Math.max(0, it.lech) : 0);

const dinh = [-90, 30, 150].map((g) => [CX + R * Math.cos((g * Math.PI) / 180), R * Math.sin((g * Math.PI) / 180)] as const);

export const Intro: React.FC<{it: IntroProps; th: ThuongHieuProps}> = ({it, th}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const [cho] = React.useState(() => delayRender('Nạp phông intro'));
  React.useEffect(() => {
    napPhong().then(() => continueRender(cho));
  }, [cho]);

  const k = it.soFrame / (CHUAN * fps); // hệ số giãn nhịp
  const s = (giay: number) => giay * fps * k; // giây (bản chuẩn) -> khung
  const tien = (a: number, b: number) => kep((f - s(a)) / Math.max(1, s(b) - s(a)));
  const nhan = it.mauNhan || '#3BF29A';
  const phu = it.mauPhu || '#FF8A3D';
  const nen = it.mauNen || '#071513';
  const ten = TEN_KENH; // khóa cứng thương hiệu, không đổi theo mảng kiến thức
  const khau = (it.khauHieu ?? th.khauHieu ?? '').trim();

  // 1. vẽ hình
  const veTron = easeInOut(tien(0.12, 0.72));
  const veTamGiac = easeInOut(tien(0.5, 1.02));
  const chuVi = 2 * Math.PI * R;
  const canhTG = Math.sqrt(3) * R;
  // 2. thu về biểu tượng
  const thu = spring({frame: f - s(0.98), fps, config: {damping: 16, stiffness: 120, mass: 0.8}});
  const cy = CY0 + (CY1 - CY0) * thu;
  const tl = 1 - 0.38 * thu;
  // 4. chuyển cảnh: mặt nạ tròn nở từ tâm biểu tượng
  const batDauRa = it.soFrame - it.chuyen;
  const ra = easeInOut(kep((f - batDauRa) / Math.max(1, it.chuyen)));
  const lo = ra * 1450; // bán kính lỗ mặt nạ (đủ phủ góc khung 1080x1920)
  const day = 1 + 0.06 * ra; // máy đẩy nhẹ khi mở
  const mo = 1 - easeInOut(kep((f - batDauRa + 0.2 * fps * k) / (0.3 * fps * k))); // chữ tan TRƯỚC khi vòng mặt nạ quét qua
  // có logo riêng: tam giác nhường chỗ cho logo nằm trong vòng tròn sau khi thu nhỏ
  const coLogo = !!th.logo && it.dungLogo !== false;
  const logoVao = coLogo ? easeOut(kep((thu - 0.35) / 0.65)) : 0;

  // tên kênh: nửa sau tô màu nhấn ("Tư duy" + "Xác suất")
  const tu = ten.split(/\s+/).filter(Boolean);
  const soNhan = Math.max(0, Math.min(tu.length - 1, it.soTuNhan ?? Math.floor(tu.length / 2)));
  // v89: cỡ chữ tính cả giãn chữ lớn nhất (0,06em) để tên kênh luôn nằm MỘT dòng trong 960 px (trước đây "suất" rớt dòng)
  const coChu = Math.min(108, Math.floor(960 / Math.max(6, ten.length * (0.66 + 0.06))));
  let iChu = 0;
  const chuTen = tu.map((w, wi) => {
    const mau = wi >= tu.length - soNhan ? nhan : '#ffffff';
    const kyTu = Array.from(w).map((c) => {
      const p = spring({frame: f - s(1.12) - iChu * 1.1 * k, fps, config: {damping: 14, stiffness: 160, mass: 0.6}});
      iChu++;
      return (
        <span key={iChu} style={{display: 'inline-block', opacity: kep(p * 1.6), transform: `translateY(${(1 - p) * 46}px) scale(${0.86 + 0.14 * p})`, color: mau}}>
          {c}
        </span>
      );
    });
    return (
      <span key={wi} style={{display: 'inline-block', whiteSpace: 'nowrap', marginRight: wi < tu.length - 1 ? '0.26em' : 0}}>
        {kyTu}
      </span>
    );
  });
  const gian = interpolate(tien(1.12, 1.9), [0, 1], [0.06, 0.01]);
  const gach = easeOut(tien(1.45, 1.95));
  const pKhau = spring({frame: f - s(1.58), fps, config: {damping: 18, stiffness: 110}});
  const yTen = CY1 + R * tl + 70;

  const net = (dash: number, tong: number) => ({strokeDasharray: tong, strokeDashoffset: tong * (1 - dash)});
  const dsTG = `M ${dinh[0][0]} ${dinh[0][1]} L ${dinh[1][0]} ${dinh[1][1]} L ${dinh[2][0]} ${dinh[2][1]} Z`;
  const mask = ra > 0 ? `radial-gradient(circle at ${CX}px ${CY1}px, transparent ${lo}px, #000 ${lo + 1.5}px)` : undefined;

  return (
    <AbsoluteFill style={{WebkitMaskImage: mask, maskImage: mask, pointerEvents: 'none'}}>
      {/* nền tối thương hiệu + quầng sáng mềm sau biểu tượng + lưới chấm rất mờ (SVG pattern, không blur) */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse 75% 45% at 50% ${(cy / 1920) * 100}%, ${nhan}1f 0%, ${nen} 55%, #030807 100%)`}} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.5 + 0.5 * kep(f / 12)}}>
        <defs>
          <pattern id="introLuoi" width={54} height={54} patternUnits="userSpaceOnUse" patternTransform={`translate(${-f * 0.35} ${-f * 0.6})`}>
            <circle cx={2} cy={2} r={1.6} fill="#ffffff" opacity={0.09} />
          </pattern>
          <radialGradient id="introMo" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#fff" stopOpacity={1} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </radialGradient>
          <mask id="introVung">
            <rect width={1080} height={1920} fill="url(#introMo)" />
          </mask>
        </defs>
        <rect width={1080} height={1920} fill="url(#introLuoi)" mask="url(#introVung)" />
      </svg>

      <AbsoluteFill style={{transform: `scale(${day})`, transformOrigin: `${CX}px ${CY1}px`}}>
        {/* biểu tượng hình học */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <g transform={`translate(${CX} ${cy}) scale(${tl}) translate(${-CX} 0)`}>
            {/* quầng nét (nét rộng mờ thay cho blur) */}
            <circle cx={CX} cy={0} r={R} fill="none" stroke={nhan} strokeWidth={22} opacity={0.12} transform={`rotate(-90 ${CX} 0)`} style={net(veTron, chuVi)} />
            <circle cx={CX} cy={0} r={R} fill="none" stroke={nhan} strokeWidth={7} strokeLinecap="round" transform={`rotate(-90 ${CX} 0)`} style={net(veTron, chuVi)} />
            <g opacity={1 - logoVao}>
            {/* đường phụ: bán kính nét đứt tới đỉnh trên */}
            <line x1={CX} y1={0} x2={dinh[0][0]} y2={dinh[0][1]} stroke="#ffffff" strokeWidth={3} strokeDasharray="10 10" opacity={0.45 * kep((veTamGiac - 0.2) * 3) * (1 - thu * 0.6)} />
            <path d={dsTG} fill={`${nhan}14`} fillOpacity={kep((veTamGiac - 0.8) * 5)} stroke="#ffffff" strokeWidth={6} strokeLinejoin="round" style={net(veTamGiac, canhTG * 3)} />
            {dinh.map(([x, y], i) => {
              const p = spring({frame: f - s(0.5 + 0.17 * i), fps, config: {damping: 10, stiffness: 200}});
              const loe = kep(1 - (f - s(0.5 + 0.17 * i)) / s(0.35));
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={26 * (1 - loe) + 4} fill="none" stroke={phu} strokeWidth={3} opacity={loe * (f >= s(0.5 + 0.17 * i) ? 0.9 : 0)} />
                  <circle cx={x} cy={y} r={11 * p} fill={phu} />
                </g>
              );
            })}
            <circle cx={CX} cy={0} r={6 * kep((veTron - 0.5) * 3)} fill="#ffffff" />
            </g>
          </g>
          {/* vòng sáng viền mặt nạ khi chuyển cảnh */}
          {ra > 0 && ra < 1 ? <circle cx={CX} cy={CY1} r={lo + 4} fill="none" stroke={nhan} strokeWidth={10 * (1 - ra) + 2} opacity={1 - ra * 0.7} /> : null}
        </svg>
        {coLogo && th.logo ? (
          <Img src={staticFile(th.logo)} style={{position: 'absolute', left: CX - 78, top: CY1 - 78, width: 156, height: 156, objectFit: 'contain', opacity: logoVao * mo, transform: `scale(${0.8 + 0.2 * logoVao})`}} />
        ) : null}

        {/* tên kênh */}
        <div style={{position: 'absolute', left: 50, right: 50, top: yTen, textAlign: 'center', opacity: mo}}>
          <div style={{display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap', fontFamily: FONT_TIEU_DE, fontWeight: 900, fontSize: coChu, lineHeight: 1.08, letterSpacing: `${gian}em`, textShadow: '0 6px 24px rgba(0,0,0,0.55)'}}>{chuTen}</div>
          <div style={{margin: '26px auto 0', height: 5, width: 420 * gach, borderRadius: 3, background: `linear-gradient(90deg, transparent, ${nhan}, ${phu}, transparent)`}} />
          {khau ? (
            <div style={{marginTop: 30, fontFamily: FONT, fontWeight: 600, fontSize: 42, color: '#d3ebe4', letterSpacing: '0.02em', opacity: kep(pKhau * 1.4), transform: `translateY(${(1 - pKhau) * 34}px)`}}>
              {khau}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>

      {/* âm thanh: tiếng vút khi bắt đầu vẽ, tách nhẹ ở từng đỉnh, ting khi tên kênh hiện đủ */}
      {it.amThanh !== false ? (
        <>
          <Sequence from={Math.round(s(0.1))} durationInFrames={30} layout="none"><Audio src={staticFile('sfx/swoosh.wav')} volume={0.22} /></Sequence>
          {[0, 1, 2].map((i) => (
            <Sequence key={i} from={Math.round(s(0.5 + 0.17 * i))} durationInFrames={12} layout="none"><Audio src={staticFile('sfx/click.wav')} volume={0.12} /></Sequence>
          ))}
          <Sequence from={Math.round(s(1.5))} durationInFrames={50} layout="none"><Audio src={staticFile('sfx/ting.wav')} volume={0.28} /></Sequence>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
