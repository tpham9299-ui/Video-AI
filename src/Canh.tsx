import React from 'react';
import {Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {coChuCongThuc, laChuThuong, phanLoaiHinh} from './bocuc';
import {BienDoi} from './BienDoi';
import {ChuThich} from './ChuThich';
import {HookChu} from './HookChu';
import {coTheBienDoi, coTheCongDon, nhomHang, smooth} from './manim';
import {MinhHoa} from './MinhHoa';
import {PhuDe} from './PhuDe';
import {FONT, MAU} from './theme';
import {Toan} from './Toan';
import {CanhProps, PhongCach} from './types';

export type HookThongTin = {chu: string; kieu: string; nhanManh: string[]};

// Bố cục dọc 1080x1920 như video mẫu (Manim):
//   [đầu video: thương hiệu] -> [tiêu đề (cảnh hook)] -> [sân khấu: hình vẽ nét trắng] -> [công thức cam vàng] -> [phụ đề]
// Nửa dưới màn hình (từ ~y 1590) để trống cho giao diện TikTok/Shorts.
export const Canh: React.FC<{
  canh: CanhProps;
  tieuDe: string;
  tongCanh: number;
  hook: HookThongTin;
  pc: PhongCach;
}> = ({canh, tieuDe, tongCanh, hook, pc}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const vao = smooth(frame / 10); // cảnh hiện ra mượt kiểu Manim (rate_func smooth)
  const ra = interpolate(frame, [canh.soFrame - 6, canh.soFrame], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const giayAm = canh.cau.length ? canh.cau[canh.cau.length - 1].ket : 3;
  const kieu = phanLoaiHinh(canh.minhHoa.loai, canh.minhHoa.moTa, canh.minhHoa.duLieu);
  const laMoDau = canh.so === 1;
  const laCuoi = canh.so === tongCanh;
  const coHinh = kieu !== null;
  const coHook = laMoDau && !!hook.chu;
  const hienTieuDe = laMoDau && !coHook && !!tieuDe;

  // Dòng công thức thứ i hiện cùng lúc với câu thoại thứ floor(i * số câu / số dòng).
  const nCau = canh.cau.length;
  const nDong = canh.noiDung.length;
  const batDong = canh.noiDung.map((_, i) => (nCau ? canh.cau[Math.min(nCau - 1, Math.floor((i * nCau) / nDong))].bat + 0.05 : 0.4 + i * 0.8));
  const hienCongThuc = !(coHook && coHinh && nDong > 1);

  const kieuTB = canh.trinhBay;
  const dungBienDoi = kieuTB === 'bien_doi' && coTheBienDoi(canh.noiDung);
  const dungCongDon = (kieuTB === 'cong_don' || kieuTB === 'bien_doi') && !dungBienDoi && coTheCongDon(canh.noiDung);
  const nhipDong = Math.max(1.1, Math.min(1.8, (giayAm - 0.3) / Math.max(1, nDong)));
  const thoiDiemDong = dungBienDoi || dungCongDon ? canh.noiDung.map((_, i) => 0.3 + i * nhipDong) : batDong;
  const hang = dungCongDon ? nhomHang(canh.noiDung) : [];
  const khungCuoi = /dap_an|ket_qua/i.test(canh.loai);

  const coNote = canh.chuThich.length > 0;
  const cao = coHook ? 560 : coNote ? 560 : 640;
  const heSo = Math.min(1.1, cao / 640);
  const lonHon = !coHinh && !hienTieuDe && !coHook;
  const caoCT = coNote ? 220 : coHinh ? 260 : 520;
  const nHang = dungCongDon ? hang.length : 1;
  const coCT = Math.min(
    ...canh.noiDung.map((d) => coChuCongThuc(d, lonHon)),
    Math.floor((caoCT - 30) / Math.max(1, nHang) / 1.5)
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: laMoDau ? 270 : 372,
        bottom: 330,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        fontFamily: FONT,
        opacity: vao * ra,
        transform: `translateY(${(1 - vao) * 36}px) scale(${0.97 + 0.03 * vao})`,
      }}
    >
      {/* Tiêu đề (cảnh hook) */}
      {coHook ? <HookChu chu={hook.chu} nhanManh={hook.nhanManh} kieu={hook.kieu} lead={canh.leadFrame} /> : null}
      {hienTieuDe && !coHinh ? (
        <div style={{height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: 800, fontSize: 80, lineHeight: 1.2, color: MAU.tieuDe}}>{tieuDe}</div>
      ) : null}

      {/* Sân khấu: hình vẽ */}
      {coHinh && kieu !== null ? (
        <div style={{height: cao, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: 960, height: 640, transform: `scale(${heSo})`, transformOrigin: 'center center', flexShrink: 0}}>
            <MinhHoa kieu={kieu} mh={canh.minhHoa} giayAm={giayAm} />
          </div>
        </div>
      ) : null}

      {/* Khung chú thích viền vàng */}
      {coNote ? <ChuThich dong={canh.chuThich} bd={Math.max(0.6, giayAm * 0.45)} /> : null}

      {/* Công thức */}
      <div style={{flex: 1, minHeight: caoCT, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 10}}>
        {hienCongThuc && dungBienDoi ? (
          <BienDoi dong={canh.noiDung} batDong={thoiDiemDong} t={t} co={coCT} maxWidth={940} khungCuoi={khungCuoi} mauGoc={MAU.vang} mauNhay="#FFD27A" />
        ) : hienCongThuc && dungCongDon ? (
          hang.map((h, r) => (
            <BienDoi
              key={r}
              dong={h.dong}
              batDong={h.chiSo.map((i) => thoiDiemDong[i])}
              t={t}
              co={coCT}
              maxWidth={940}
              khungCuoi={khungCuoi && r === hang.length - 1}
              mauGoc={MAU.vang}
              mauNhay="#FFD27A"
              can="trai"
            />
          ))
        ) : hienCongThuc ? (
          canh.noiDung.map((d, i) => {
            const bd = thoiDiemDong[i];
            const p = t < bd ? 0 : Math.min(1, spring({frame: frame - Math.round(bd * fps), fps, config: {damping: 16}}));
            return (
              <div key={i} style={{opacity: p, transform: `translateY(${(1 - p) * 30}px)`, maxWidth: 960, textAlign: 'center', padding: '4px 20px'}}>
                <Toan tex={d} size={coChuCongThuc(d, lonHon)} maxWidth={920} color={laChuThuong(d) ? '#ffffff' : MAU.vang} />
              </div>
            );
          })
        ) : null}
      </div>

      {/* Phụ đề */}
      {pc.phuDe ? (
        <div style={{height: 150, display: 'flex', alignItems: 'center'}}>
          <div style={{width: '100%'}}>
            <PhuDe cau={canh.cau} t={t} co={42} />
          </div>
        </div>
      ) : null}

      {/* Âm thanh của cảnh */}
      <Sequence from={0} durationInFrames={30} layout="none">
        <Audio src={staticFile('sfx/whoosh.wav')} volume={laMoDau ? 0.2 : 0.3} />
      </Sequence>
      {hienCongThuc
        ? canh.noiDung.map((_, i) => {
            const tai = Math.round(thoiDiemDong[i] * fps);
            const cuoi = laCuoi && i === nDong - 1;
            return (
              <Sequence key={`sfx${i}`} from={tai} durationInFrames={cuoi ? 70 : 20} layout="none">
                <Audio src={staticFile(cuoi ? 'sfx/ting.wav' : 'sfx/pop.wav')} volume={cuoi ? 0.5 : 0.25} />
              </Sequence>
            );
          })
        : null}
      {canh.audio ? (
        <Sequence from={canh.leadFrame} layout="none">
          <Audio src={staticFile(canh.audio)} volume={1} />
        </Sequence>
      ) : null}
    </div>
  );
};
