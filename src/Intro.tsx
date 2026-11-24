import React from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {napPhong} from './phong';
import {easeInOut, easeOut, kep} from './sankhau/donghieu';
import {FONT, FONT_TIEU_DE} from './theme';
import {IntroProps, ThuongHieuProps} from './types';
import {TEN_KENH} from './ThuongHieu';
import {BAT_QUET_SANG_INTRO} from './khung4tang/cauHinhTinhChinh';

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

// v99.6: suy dạng bài từ chữ đề / chủ đề / loại sân khấu (không có -> TOÁN HỌC)
type DangBai = 'XÁC SUẤT' | 'PARABOL' | 'HÌNH HỌC' | 'ĐẠI SỐ' | 'TOÁN HỌC';
const suyDang = (s: string): DangBai => {
  const x = s.toLowerCase();
  if (/xác suất|xác xuất|tổ hợp|hoán vị|chỉnh hợp|rút (bi|thẻ|ngẫu nhiên)|biến cố|bayes|rut_mau|so_do_cay|luoi_bayes|cot_phan_phoi/.test(x)) return 'XÁC SUẤT';
  if (/parabol|bậc hai|bậc 2|đồ thị|kinh_te_do_thi/.test(x)) return 'PARABOL';
  if (/hình học|tam giác|đường tròn|tứ giác|hình chóp|lăng trụ|hình hộp|hình trụ|hình nón|hình cầu|khối|thiết diện/.test(x)) return 'HÌNH HỌC';
  if (/phương trình|bất phương trình|biểu thức|đại số|bất đẳng thức|giá trị lớn nhất|giá trị nhỏ nhất|tu_duy_dai_so/.test(x)) return 'ĐẠI SỐ';
  return 'TOÁN HỌC';
};

// v99.6: hình mồi vector mờ theo dạng bài (tâm 540, rộng ~760, cao ~560; vẽ dần theo p)
const HinhMoi: React.FC<{dang: DangBai; p: number; mau: string; phu: string}> = ({dang, p, mau, phu}) => {
  const n = (tong: number) => ({strokeDasharray: tong, strokeDashoffset: tong * (1 - p)});
  if (dang === 'PARABOL') {
    return (
      <g fill="none" strokeLinecap="round">
        <path d="M -330 0 H 330 M 0 -250 V 280" stroke="#fff" strokeWidth={4} style={n(1200)} />
        <path d="M 330 0 l -22 -9 M 330 0 l -22 9 M 0 -250 l -9 22 M 0 -250 l 9 22" stroke="#fff" strokeWidth={4} opacity={p} />
        <path d="M -250 -210 Q 0 560 250 -210" stroke={mau} strokeWidth={8} style={n(1100)} />
        <circle cx={0} cy={175} r={12 * p} fill={phu} stroke="none" />
        <text x={344} y={34} fill="#fff" fontSize={34} fontWeight={800} stroke="none" opacity={p}>x</text>
        <text x={18} y={-236} fill="#fff" fontSize={34} fontWeight={800} stroke="none" opacity={p}>y</text>
        <text x={-44} y={34} fill="#fff" fontSize={30} fontWeight={800} stroke="none" opacity={p}>O</text>
      </g>
    );
  }
  if (dang === 'XÁC SUẤT') {
    const nut: [number, number][] = [[0, -200], [-190, 0], [190, 0], [-290, 200], [-90, 200], [90, 200], [290, 200]];
    const canh: [number, number][] = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
    return (
      <g fill="none" strokeLinecap="round">
        {canh.map(([a, b], i) => <path key={i} d={`M ${nut[a][0]} ${nut[a][1]} C ${nut[a][0]} ${(nut[a][1] + nut[b][1]) / 2} ${nut[b][0]} ${(nut[a][1] + nut[b][1]) / 2} ${nut[b][0]} ${nut[b][1]}`} stroke={mau} strokeWidth={5} style={n(320)} />)}
        {nut.map(([x, y], i) => <rect key={i} x={x - 38} y={y - 26} width={76} height={52} rx={14} stroke={i === 0 ? phu : '#fff'} strokeWidth={4} opacity={Math.min(1, p * 2)} />)}
      </g>
    );
  }
  if (dang === 'HÌNH HỌC') {
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -300 200 L 40 -220 L 300 200 Z" fill={mau} fillOpacity={0.18 * p} stroke="#fff" strokeWidth={8} style={n(1500)} />
        <path d="M 40 -220 L 40 200" stroke={phu} strokeWidth={4} strokeDasharray="14 12" opacity={p} />
        <circle cx={0} cy={50} r={230} stroke={mau} strokeWidth={5} style={n(1450)} />
        <path d="M 40 160 h 40 v 40" stroke="#fff" strokeWidth={4} opacity={p} />
        {[[-300, 200], [40, -220], [300, 200]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={10 * p} fill={phu} stroke="none" />)}
      </g>
    );
  }
  if (dang === 'ĐẠI SỐ') {
    return (
      <g fill="none" strokeLinecap="round">
        <path d="M -330 0 H 330 M 0 -240 V 240" stroke="#fff" strokeWidth={4} style={n(1200)} />
        <path d="M -300 200 L 300 -200" stroke={mau} strokeWidth={8} style={n(800)} />
        <path d="M -300 -120 L 300 160" stroke={phu} strokeWidth={6} style={n(700)} />
        <circle cx={43} cy={-29} r={13 * p} fill="#fff" stroke="none" />
      </g>
    );
  }
  return (
    <g fill="none" strokeLinecap="round">
      {[110, 200, 290].map((r, i) => <circle key={r} cx={0} cy={0} r={r} stroke={i === 1 ? mau : '#fff'} strokeWidth={4} style={n(2 * Math.PI * r)} />)}
      <path d="M -300 0 H 300 M 0 -300 V 300" stroke="#fff" strokeWidth={3} opacity={p} />
    </g>
  );
};

export const Intro: React.FC<{it: IntroProps; th: ThuongHieuProps; goiY?: string}> = ({it, th, goiY = ''}) => {
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
  // v100.1: vào lệch tầng — huy hiệu (s(1.0)) -> khối tiêu đề (+3,5 khung) -> dòng khẩu hiệu (+7 khung)
  const f0 = s(1.0);
  const lxVao = {damping: 14, stiffness: 160};
  const pTieuDe = spring({frame: f - f0 - 3.5, fps, config: lxVao});
  const pKhau = spring({frame: f - f0 - 7, fps, config: lxVao});
  const pXung = 0.5 + 0.5 * Math.sin(f / 4.5);
  const pSheen = kep((f - 8) / 18);
  const xSheen = -25 + 150 * easeInOut(pSheen);
  const yTen = CY1 + R * tl + 70;
  // v99.6: huy hiệu dạng bài (viên thuốc) + hình mồi vector mờ phía sau khung tiêu đề
  const dang = suyDang(goiY);
  const pHuy = spring({frame: f - s(1.0), fps, config: {damping: 14, stiffness: 160}});
  const pMoi = easeOut(tien(0.2, 1.6));
  const troi = Math.sin(f / 38);

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

      {/* v99.6: hình mồi vector theo dạng bài, opacity 0,17, trôi / phóng cực nhẹ, nằm sau chữ (không blur) */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.3 * mo, overflow: 'visible'}}>
        <g transform={`translate(${CX + 10 * troi} ${1010 + 6 * Math.cos(f / 45)}) scale(${0.9 + 0.05 * kep(f / Math.max(1, it.soFrame))})`}>
          <HinhMoi dang={dang} p={pMoi} mau={nhan} phu={phu} />
        </g>
      </svg>

      <AbsoluteFill style={{transform: `scale(${day})`, transformOrigin: `${CX}px ${CY1}px`}}>
        {/* huy hiệu dạng bài */}
        <div style={{position: 'absolute', left: 0, right: 0, top: yTen - 66, display: 'flex', justifyContent: 'center', opacity: kep(pHuy * 1.5) * mo, transform: `scale(${0.7 + 0.3 * pHuy})`}}>
          <div style={{height: 44, padding: '0 24px', borderRadius: 22, display: 'flex', alignItems: 'center', border: `2px solid ${phu}`, background: `${phu}22`, color: phu, fontFamily: FONT, fontWeight: 900, fontSize: 24, letterSpacing: 1.6, whiteSpace: 'nowrap', gap: 12}}>
            <svg width={16} height={16} viewBox="0 0 16 16" style={{flexShrink: 0}}>
              <circle cx={8} cy={8} r={4 + 3 * pXung} fill={phu} opacity={0.25} />
              <circle cx={8} cy={8} r={4} fill={phu} opacity={0.65 + 0.35 * pXung} />
            </svg>
            {dang}
          </div>
        </div>
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
          <div style={{position: 'relative', opacity: kep(pTieuDe * 1.6), transform: `translateY(${(1 - pTieuDe) * 30}px)`}}>
            <div style={{display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap', fontFamily: FONT_TIEU_DE, fontWeight: 900, fontSize: coChu, lineHeight: 1.08, letterSpacing: `${gian}em`, textShadow: '0 6px 24px rgba(0,0,0,0.55)'}}>{chuTen}</div>
            {BAT_QUET_SANG_INTRO && f >= 8 && f <= 26 ? (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
                <defs>
                  <linearGradient id="introSheen" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fff" stopOpacity={0} />
                    <stop offset="50%" stopColor="#fff" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <polygon points={`${xSheen},0 ${xSheen + 14},0 ${xSheen + 8},100 ${xSheen - 6},100`} fill="url(#introSheen)" />
              </svg>
            ) : null}
          </div>
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
