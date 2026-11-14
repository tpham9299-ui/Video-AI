import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {easeInOut, easeOut, kep, ngauNhien, popOut} from './sankhau/donghieu';
import {FONT, FONT_DAM, BONG_CHU, vienChu} from './theme';
import {CanhProps, ThuongHieuProps} from './types';

// THƯƠNG HIỆU KÊNH ĐỘNG (thay cho logo + chữ đứng yên):
//  1. Huy hiệu góc trên trái: logo bật lên trong vòng sáng xoay, tên kênh chạy chữ ra kèm vệt sáng quét, sau ~3,5 giây thu gọn
//     thành logo tròn; vòng sáng xoay chậm và thỉnh thoảng phát "nhịp sóng".
//  2. Giữa video huy hiệu mở ra lần nữa, hiện @tên_kênh rồi thu lại.
//  3. Lời mời theo dõi: thẻ trượt vào ở cảnh chốt bài (hoặc ~65% video), chuông rung, nút "+" bấm xong biến thành dấu tích.
//  4. Logo chìm lớn phía sau trôi nhẹ (markNuoc).
//  5. Màn kết tự tạo khi bạn không có tệp outro (xem ManKetTuTao).
const XANH = '#3BF29A';
const CAM = '#FF8A3D';

const chuCai = (th: ThuongHieuProps) => {
  const s = (th.ten || th.handle || '').replace(/^@/, '').trim();
  const w = s.split(/\s+/).filter(Boolean);
  return (w.length >= 2 ? w[0][0] + w[w.length - 1][0] : s.slice(0, 2)).toUpperCase();
};

export const LogoTron: React.FC<{th: ThuongHieuProps; co: number; goc?: number; sang?: number}> = ({th, co, goc = 0, sang = 0}) => (
  <div style={{position: 'relative', width: co, height: co, flexShrink: 0}}>
    <div style={{position: 'absolute', inset: -co * 0.08, borderRadius: '50%', background: `conic-gradient(from ${goc}deg, ${XANH}, ${CAM}, ${XANH}, transparent 70%, ${XANH})`, filter: `blur(${1 + sang * 3}px)`, opacity: 0.95}} />
    <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: '#071513', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 ${12 + 24 * sang}px ${XANH}`}}>
      {th.logo ? (
        <Img src={staticFile(th.logo)} style={{width: '86%', height: '86%', objectFit: 'contain'}} />
      ) : (
        <span style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: co * 0.38, color: '#fff'}}>{chuCai(th)}</span>
      )}
    </div>
  </div>
);

// huy hiệu: mo = độ mở phần chữ (0 = chỉ còn logo)
const HuyHieu: React.FC<{th: ThuongHieuProps; vao: number; mo: number; dong2: string; sang: number; goc: number}> = ({th, vao, mo, dong2, sang, goc}) => {
  const ten = th.ten || th.handle;
  const vetSang = ((goc * 2) % 360) / 360;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 14, transform: `scale(${popOut(vao, 2)})`, transformOrigin: '32px 50%', opacity: kep(vao * 3)}}>
      <LogoTron th={th} co={66} goc={goc} sang={sang} />
      {ten ? (
        <div style={{maxWidth: 560 * mo, overflow: 'hidden', whiteSpace: 'nowrap', opacity: kep(mo * 2), background: 'rgba(6,18,16,0.7)', borderRadius: 14, padding: mo > 0.05 ? '4px 14px' : 0}}>
          <div style={{position: 'relative', fontFamily: FONT_DAM, fontWeight: 900, fontSize: 34, color: '#fff', lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.7)'}}>
            {ten}
            <span style={{position: 'absolute', inset: 0, background: `linear-gradient(100deg, transparent ${vetSang * 140 - 30}%, rgba(255,255,255,0.75) ${vetSang * 140 - 15}%, transparent ${vetSang * 140}%)`, mixBlendMode: 'overlay'}} />
          </div>
          {dong2 ? <div style={{fontFamily: FONT_DAM, fontWeight: 800, fontSize: 22, color: XANH, marginTop: 2}}>{dong2}</div> : null}
        </div>
      ) : null}
    </div>
  );
};

const Chuong: React.FC<{f: number}> = ({f}) => (
  <svg width={46} height={46} viewBox="0 0 24 24" style={{transform: `rotate(${Math.sin(f / 2.2) * 18 * Math.max(0, 1 - f / 40)}deg)`, transformOrigin: '50% 10%'}}>
    <path d="M12 2a6 6 0 0 0-6 6v4l-2 3h16l-2-3V8a6 6 0 0 0-6-6zm0 20a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3z" fill="#FFD54A" />
  </svg>
);

const LoiMoi: React.FC<{th: ThuongHieuProps}> = ({th}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dai = 3.4 * fps;
  const a = easeOut(kep(f / 12));
  const r = easeInOut(kep((f - (dai - 12)) / 12));
  const bam = kep((f - 1.5 * fps) / 8);
  return (
    <div style={{position: 'absolute', right: 40, top: 1585, transform: `translateX(${(1 - a) * 700 + r * 700}px)`, display: 'flex', alignItems: 'center', gap: 16, padding: '12px 18px 12px 12px', borderRadius: 50, background: 'rgba(6,18,16,0.92)', border: `3px solid ${XANH}`, boxShadow: `0 0 22px ${XANH}88`}}>
      <LogoTron th={th} co={64} goc={f * 4} />
      <div style={{fontFamily: FONT, color: '#fff'}}>
        <div style={{fontWeight: 900, fontSize: 32}}>{th.handle || th.ten}</div>
        <div style={{fontWeight: 700, fontSize: 22, color: '#cfe'}}>{th.loiMoi || 'Theo dõi để học mẹo xác suất'}</div>
      </div>
      <Chuong f={f} />
      <div style={{width: 58, height: 58, borderRadius: 29, background: bam > 0.5 ? XANH : CAM, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + 0.25 * Math.sin(bam * Math.PI)})`, fontFamily: FONT_DAM, fontWeight: 900, fontSize: 40, color: '#062019'}}>
        {bam > 0.5 ? '✓' : '+'}
      </div>
    </div>
  );
};

// độ mở của huy hiệu tại giây t (dùng chung để dòng chủ đề ẩn đi khi huy hiệu mở ra)
export function moHuyHieu(t: number, ketThucGiay: number) {
  const giua = ketThucGiay * 0.45;
  const mo1 = easeOut(kep((t - 0.5) / 0.5)) * (1 - easeInOut(kep((t - 3.6) / 0.5)));
  const mo2 = easeOut(kep((t - giua) / 0.4)) * (1 - easeInOut(kep((t - giua - 2.2) / 0.4)));
  return {mo1, mo2};
}

// WATERMARK ĐỘNG: logo nhỏ trong vòng kính ở GÓC sân khấu (không nằm sau nội dung), mỗi nhóm cảnh trượt sang góc khác,
// vệt sáng quét qua định kỳ, nhịp sáng nhẹ. Vừa giữ thương hiệu vừa không che nội dung.
// (cũ: chạy qua 4 góc sân khấu -> đè lên thẻ chữ/công thức) nay ĐỨNG YÊN ở góc trên-trái, ngoài vùng nội dung
const GOC_WM: [number, number][] = [[70, 70]];
const WatermarkDong: React.FC<{th: ThuongHieuProps; canh: CanhProps[]; tu: number}> = ({th, canh, tu}) => {
  const f = useCurrentFrame();
  if (f < tu) return null;
  // nhóm cảnh hiện tại (các cảnh nối tiếp sân khấu tính là một nhóm)
  let nhom = 0;
  let bdNhom = 0;
  canh.forEach((c, i) => {
    if (i > 0 && !c.giuSanKhau && f >= c.batDau) { nhom++; bdNhom = c.batDau; }
  });
  const [x1, y1] = GOC_WM[(nhom + GOC_WM.length - 1) % GOC_WM.length];
  const [x2, y2] = GOC_WM[nhom % GOC_WM.length];
  const p = nhom === 0 ? 1 : easeInOut(kep((f - bdNhom) / 18));
  const x = x1 + (x2 - x1) * p;
  const y = y1 + (y2 - y1) * p;
  const quet = ((f - tu) % 150) / 150; // vệt sáng mỗi 5 giây
  const nhip = 0.5 + 0.5 * Math.sin(f / 22);
  const vao = kep((f - tu) / 15);
  return (
    <div data-kd-bo="1" style={{position: 'absolute', left: x - 44, top: y - 44, width: 88, height: 88, opacity: 0.55 * vao, transform: `scale(${0.72 + 0.04 * nhip})`}}>
      <div style={{position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', boxShadow: `0 0 ${10 + 10 * nhip}px rgba(59,242,154,0.45)`}} />
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: 'rgba(8,16,20,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        {th.logo ? <Img src={staticFile(th.logo)} style={{width: '82%', height: '82%', objectFit: 'contain'}} /> : <span style={{fontFamily: FONT_DAM, fontWeight: 900, fontSize: 30, color: '#fff'}}>{chuCai(th)}</span>}
        <span style={{position: 'absolute', top: -20, bottom: -20, width: 26, left: `${-30 + quet * 160}%`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)', transform: 'skewX(-20deg)', opacity: quet < 0.6 ? 1 : 0}} />
      </div>
    </div>
  );
};

export const ThuongHieu: React.FC<{th: ThuongHieuProps; canh: CanhProps[]; ketThuc: number; boLoiMoi?: boolean; tuDau?: number}> = ({th, canh, ketThuc, boLoiMoi = false, tuDau = 1e9}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!th || (!th.ten && !th.logo && !th.handle)) return null;
  if (f >= ketThuc) return null;
  const t = f / fps;
  const vao = kep((t - 0.25) / 0.45);
  // mở lần 1 (0,5-3,6 giây) và lần 2 (giữa video, 2 giây)
  const {mo1, mo2} = moHuyHieu(t, ketThuc / fps);
  const mo = Math.max(mo1, mo2);
  const dong2 = mo2 > mo1 ? (th.ten && th.handle ? th.handle : th.khauHieu) : th.khauHieu;
  const chuKy = (t % 9) / 9;
  const song = t > 4 && chuKy < 0.12 ? chuKy / 0.12 : 0;
  // thời điểm lời mời theo dõi
  const chot = canh.find((c) => /bai_hoc|ket_luan|chot/i.test(c.loai));
  const tuMoi = chot ? chot.batDau + Math.round(0.8 * fps) : Math.round(ketThuc * 0.65);
  const r = ngauNhien(7);
  return (
    <>
      {th.markNuoc ? <WatermarkDong th={th} canh={canh} tu={tuDau} /> : null}
      {/* huy hiệu canh giữa: mở ở đầu video và giữa video; khi thanh đầu trang (có logo) đã hiện thì ẩn huy hiệu */}
      {/* chỉ hiện ở đầu video (trước khi thanh đầu trang hiện); bỏ lần hiện giữa video vì đè lên thanh chủ đề */}
      <div data-kd-bo="1" style={{position: 'absolute', left: 0, right: 0, top: 112, display: 'flex', justifyContent: 'center', opacity: f < tuDau ? 1 : 0}}>
        <div style={{position: 'relative'}}>
        {song > 0 ? <div style={{position: 'absolute', left: 33 - 33 * (1 + song), top: 33 - 33 * (1 + song), width: 66 * (1 + song), height: 66 * (1 + song), borderRadius: '50%', border: `3px solid ${XANH}`, opacity: 1 - song}} /> : null}
        <HuyHieu th={th} vao={vao} mo={mo} dong2={dong2} sang={Math.max(mo, song)} goc={t * 70 + r() * 360} />
        </div>
      </div>
      {(th.handle || th.ten) && !boLoiMoi ? (
        <Sequence from={tuMoi} durationInFrames={Math.round(3.4 * fps)} layout="none">
          <LoiMoi th={th} />
          <Sequence from={Math.round(1.5 * fps)} durationInFrames={30} layout="none">
            <Audio src={staticFile('sfx/ding.wav')} volume={0.3} />
          </Sequence>
          <Audio src={staticFile('sfx/swoosh.wav')} volume={0.3} />
        </Sequence>
      ) : null}
    </>
  );
};

// Màn kết tự tạo (khi không có tệp outro): logo lớn trong vòng sáng xoay + tia sáng, tên kênh chạy chữ, nút "Theo dõi" được bấm.
export const ManKetTuTao: React.FC<{th: ThuongHieuProps}> = ({th}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = kep(f / 12);
  const ten = th.ten || th.handle;
  const soChu = Math.round(kep((f - 8) / 18) * ten.length);
  const bam = kep((f - 1.4 * fps) / 8);
  const r = ngauNhien(3);
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, #12332e 0%, #08100f 70%)', alignItems: 'center', justifyContent: 'center', opacity: kep(f / 6)}}>
      {Array.from({length: 18}, (_, i) => {
        const g = (i / 18) * Math.PI * 2 + r();
        const d = easeOut(kep(f / 30)) * (260 + r() * 200);
        return <div key={i} style={{position: 'absolute', left: 540 + Math.cos(g) * d, top: 800 + Math.sin(g) * d, width: 12, height: 12, borderRadius: 6, background: i % 2 ? CAM : XANH, opacity: 1 - kep(f / 45), boxShadow: `0 0 14px ${i % 2 ? CAM : XANH}`}} />;
      })}
      <div style={{position: 'absolute', top: 640, transform: `scale(${popOut(a, 2)})`}}>
        <LogoTron th={th} co={240} goc={f * 5} sang={1} />
      </div>
      <div style={{position: 'absolute', top: 930, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_DAM, fontWeight: 900, fontSize: 64, color: '#fff', textShadow: `0 0 20px ${XANH}`}}>{ten.slice(0, soChu)}</div>
      {th.khauHieu ? <div style={{position: 'absolute', top: 1020, left: 60, right: 60, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 34, color: '#cfe', opacity: kep((f - 20) / 10)}}>{th.khauHieu}</div> : null}
      <div style={{position: 'absolute', top: 1110, padding: '16px 46px', borderRadius: 40, background: bam > 0.5 ? XANH : CAM, fontFamily: FONT_DAM, fontWeight: 900, fontSize: 40, color: '#062019', transform: `scale(${popOut(kep((f - 16) / 10)) * (1 - 0.12 * Math.sin(bam * Math.PI))})`, boxShadow: `0 0 26px ${bam > 0.5 ? XANH : CAM}`}}>
        {bam > 0.5 ? '✓ Đã theo dõi' : '+ Theo dõi'}
      </div>
      <Audio src={staticFile('sfx/boom.wav')} volume={0.3} />
      <Sequence from={Math.round(1.4 * fps)} layout="none">
        <Audio src={staticFile('sfx/ding.wav')} volume={0.35} />
      </Sequence>
    </AbsoluteFill>
  );
};
