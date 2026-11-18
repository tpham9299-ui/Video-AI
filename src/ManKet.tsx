import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {NenToi} from './NenToi';
import {expoOut} from './sankhau/chuyendong';
import {easeOut, kep, popOut} from './sankhau/donghieu';
import {LogoTron} from './ThuongHieu';
import {BONG_CHU, FONT, FONT_DAM, vienChu} from './theme';
import {Toan} from './Toan';
import {ThuongHieuProps} from './types';

// MÀN KẾT THÚC (tự tạo, ~6 giây), bố cục 2 tầng trên nền tối:
//  Tầng 1 - TÓM TẮT: chip "ĐÁP ÁN", tiêu đề "BÀI HỌC RÚT RA", thẻ có 2-3 ý đánh số hiện lần lượt kèm dấu tích.
//  Tầng 2 - KÊNH: logo trong vòng sáng, tên kênh + khẩu hiệu, hàng nút Thích / Lưu lại / Chia sẻ (ngón tay bấm "Thích";
//  chữ "Đăng ký kênh" (YouTube) / "Theo dõi" (TikTok, Facebook) in riêng lúc đăng), dòng hẹn "Video sau". Mọi thứ vào bằng chuyển động mượt (lướt + nhòe nhẹ), không chói mắt.
const XANH = '#3BF29A';
const CAM = '#FF8A3D';

const Vao: React.FC<{tu: number; children: React.ReactNode; dy?: number; style?: React.CSSProperties}> = ({tu, children, dy = 40, style}) => {
  const f = useCurrentFrame();
  const p = expoOut(kep((f - tu) / 14));
  return <div style={{...style, opacity: kep(p * 1.6), transform: `translateY(${(1 - p) * dy}px)`}}>{children}</div>;
};

const NutCTA: React.FC<{icon: React.ReactNode; chu: string; tu: number; chinh?: boolean; bam?: number}> = ({icon, chu, tu, chinh, bam = 0}) => {
  const f = useCurrentFrame();
  const a = kep((f - tu) / 10);
  const da = chinh && bam > 0.5;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: `scale(${popOut(a, 2) * (1 - 0.1 * Math.sin(Math.PI * kep(bam)))})`, opacity: kep(a * 2)}}>
      <div style={{width: chinh ? 128 : 104, height: chinh ? 128 : 104, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: chinh ? (da ? XANH : `linear-gradient(180deg, #FF9A4D, #F0601A)`) : 'rgba(255,255,255,0.07)', border: chinh ? 'none' : '2px solid rgba(255,255,255,0.16)',
        boxShadow: chinh ? `0 6px 0 ${da ? '#0f7a52' : '#9a3a0c'}, 0 0 30px ${da ? XANH : CAM}88` : 'none'}}>
        {da ? <span style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: 64, color: '#062019'}}>✓</span> : icon}
      </div>
      <div style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: chinh ? 30 : 26, color: chinh ? '#fff' : 'rgba(255,255,255,0.8)'}}>{da ? 'Đã thích' : chu}</div>
    </div>
  );
};

const IconCong = () => (
  // trái tim "Thích" (trung tính cho mọi nền tảng: chữ "Đăng ký kênh" / "Theo dõi" riêng từng nền tảng được in lúc đăng)
  <svg width={60} height={60} viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.1A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" fill="#fff" /></svg>
);
const IconLuu = () => (
  <svg width={48} height={48} viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinejoin="round" /></svg>
);
const IconChiaSe = () => (
  <svg width={50} height={50} viewBox="0 0 24 24"><path d="M14 5l7 7-7 7v-4c-6 0-9 2-11 5 1-6 4-10 11-11z" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinejoin="round" /></svg>
);
const NgonTay: React.FC<{p: number}> = ({p}) => (
  <div style={{position: 'absolute', left: 74, top: 70, transform: `translate(${(1 - easeOut(kep(p * 2))) * 140}px, ${(1 - easeOut(kep(p * 2))) * 120}px) scale(${1 - 0.12 * Math.sin(Math.PI * kep((p - 0.5) * 2))})`, opacity: p > 0 && p < 1.4 ? 1 : 0, fontSize: 72, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))'}}>👆</div>
);

export const ManKetChuyenNghiep: React.FC<{th: ThuongHieuProps; baiHoc: string[]; dapAn: string; tiepTheo: string}> = ({th, baiHoc, dapAn, tiepTheo}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const coBaiHoc = baiHoc.length > 0;
  const tuKenh = coBaiHoc ? Math.round(1.2 * fps + baiHoc.length * 0.45 * fps) : 6;
  const tuNut = tuKenh + 16;
  const tuBam = tuNut + 26;
  const bam = kep((f - tuBam - 10) / 8);
  const ten = th.ten || th.handle || '';
  return (
    <AbsoluteFill style={{opacity: kep(f / 6)}}>
      <NenToi />
      {/* đường kẻ trang trí vẽ dần (Manim Create) */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <path d="M80 1100 L1000 1100" stroke="rgba(255,255,255,0.12)" strokeWidth={2} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeOut(kep((f - tuKenh + 6) / 18))} />
      </svg>

      {coBaiHoc ? (
        <div style={{position: 'absolute', left: 60, right: 60, top: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22}}>
          {dapAn ? (
            <Vao tu={2}>
              <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '8px 24px', borderRadius: 30, border: `2.5px solid ${XANH}`, background: 'linear-gradient(135deg, rgba(59,242,154,0.18), rgba(16,185,129,0.08))', boxShadow: `0 0 22px ${XANH}44, inset 0 1px 0 rgba(255,255,255,0.2)`}}>
                <span style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: 26, color: XANH, letterSpacing: 1.2}}>ĐÁP ÁN</span>
                <Toan tex={dapAn.includes('/') ? `\\frac{${dapAn.split('/')[0]}}{${dapAn.split('/')[1]}}` : dapAn} size={40} color="#fff" />
              </div>
            </Vao>
          ) : null}
          <Vao tu={6}>
            <div style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: 76, color: '#fff', textAlign: 'center', lineHeight: 1.05, WebkitTextStroke: vienChu(76), paintOrder: 'stroke fill', textShadow: BONG_CHU}}>
              BÀI HỌC <span style={{color: CAM}}>RÚT RA</span>
            </div>
          </Vao>
          <div style={{width: '100%', marginTop: 8, borderRadius: 28, background: 'linear-gradient(165deg, rgba(17,28,36,0.88), rgba(9,16,22,0.94))', border: '1.5px solid rgba(148,163,184,0.24)', boxShadow: '0 22px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)', padding: '26px 26px 14px'}}>
            {baiHoc.slice(0, 3).map((b, i) => {
              const tu = Math.round(0.7 * fps + i * 0.45 * fps);
              const tich = kep((f - tu - 8) / 8);
              return (
                <Vao key={i} tu={tu} dy={30} style={{display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 18}}>
                  <div style={{flexShrink: 0, width: 62, height: 62, borderRadius: 18, background: tich > 0.5 ? XANH : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DAM, fontWeight: 900, fontSize: 34, color: tich > 0.5 ? '#062019' : '#fff', transform: `scale(${popOut(tich, 2.4)})`}}>
                    {tich > 0.5 ? '✓' : i + 1}
                  </div>
                  <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 38, lineHeight: 1.28, color: '#F3F6F8', paddingTop: 4}}>{b}</div>
                </Vao>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* tầng kênh */}
      <div style={{position: 'absolute', left: 0, right: 0, top: coBaiHoc ? 1135 : 620, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
        {!ten && !th.logo ? (
          <Vao tu={tuKenh} style={{textAlign: 'center', fontFamily: FONT_DAM, fontWeight: 900, fontSize: 54, lineHeight: 1.15, color: '#fff', WebkitTextStroke: vienChu(54), paintOrder: 'stroke fill', textShadow: BONG_CHU}}>
            HỌC MẸO TOÁN<br /><span style={{color: XANH}}>MỖI NGÀY CÙNG KÊNH</span>
          </Vao>
        ) : null}
        <Vao tu={tuKenh} style={{display: 'flex', alignItems: 'center', gap: 22}}>
          {th.logo || ten ? <LogoTron th={th} co={coBaiHoc ? 110 : 200} goc={f * 3} sang={0.6} /> : null}
          {ten ? (
            <div>
              <div style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: coBaiHoc ? 46 : 60, color: '#fff'}}>{ten}</div>
              {th.khauHieu ? <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 26, color: 'rgba(255,255,255,0.7)', marginTop: 4}}>{th.khauHieu}</div> : null}
            </div>
          ) : null}
        </Vao>
        <div style={{position: 'relative', display: 'flex', gap: 54, marginTop: 18, alignItems: 'flex-end'}}>
          <div style={{position: 'relative'}}>
            <NutCTA icon={<IconCong />} chu="Thích" tu={tuNut} chinh bam={bam} />
            <NgonTay p={(f - tuBam) / 18} />
          </div>
          <NutCTA icon={<IconLuu />} chu="Lưu lại" tu={tuNut + 4} />
          <NutCTA icon={<IconChiaSe />} chu="Chia sẻ" tu={tuNut + 8} />
        </div>
        {tiepTheo ? (
          <Vao tu={tuNut + 14} style={{marginTop: 26, maxWidth: 900, textAlign: 'center', padding: '10px 24px', borderRadius: 18, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,138,61,0.34)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)'}}>
            <span style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: 28, color: CAM}}>VIDEO SAU: </span>
            <span style={{fontFamily: FONT, fontWeight: 700, fontSize: 30, color: '#fff'}}>{tiepTheo}</span>
          </Vao>
        ) : null}
      </div>

      <Audio src={staticFile('sfx/swoosh.wav')} volume={0.25} />
      {baiHoc.slice(0, 3).map((_, i) => (
        <Sequence key={i} from={Math.round(0.7 * fps + i * 0.45 * fps) + 8} durationInFrames={20} layout="none">
          <Audio src={staticFile('sfx/pop.wav')} volume={0.3} />
        </Sequence>
      ))}
      <Sequence from={tuBam + 12} durationInFrames={30} layout="none">
        <Audio src={staticFile('sfx/ding.wav')} volume={0.35} />
      </Sequence>
    </AbsoluteFill>
  );
};
