import React from 'react';
import {Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {coChuCongThuc, laChuThuong, NHAN_HOOK, phanLoaiHinh} from './bocuc';
import {BienDoi} from './BienDoi';
import {ChuThich} from './ChuThich';
import {HookChu} from './HookChu';
import {coTheBienDoi, coTheCongDon, nhomHang} from './manim';
import {MinhHoa} from './MinhHoa';
import {PhuDe} from './PhuDe';
import {PhuDeTikTok} from './PhuDeTikTok';
import {kep} from './sankhau/donghieu';
import {KIEU_CHUYEN, NhoeHuong, trangThaiChuyen} from './sankhau/chuyendong';
import {DuLieuSanKhau, hopLeSanKhau, noiTiepSanKhau} from './sankhau/dulieu';
import {SanKhau, SK_H, SK_W} from './sankhau/SanKhau';
import {nhanCanh, TieuDeCanh} from './TieuDeCanh';
import {phaCua, ThanhBuoc} from './ThanhBuoc';
import {FONT, MAU} from './theme';
import {Toan} from './Toan';
import {VietTay} from './VietTay';
import {CanhProps, PhongCach} from './types';

export type HookThongTin = {chu: string; kieu: string; nhanManh: string[]};

// Dữ liệu sân khấu của một cảnh, đã nối tiếp các cảnh trước nếu cảnh đó "giu_san_khau".
export function sanKhauCuaCanh(ds: CanhProps[], i: number): DuLieuSanKhau | null {
  const c = ds[i];
  if (!c || c.minhHoa.loai !== 'san_khau') return null;
  const d = hopLeSanKhau(c.minhHoa.duLieu);
  if (!d) return null;
  return c.giuSanKhau && i > 0 ? noiTiepSanKhau(sanKhauCuaCanh(ds, i - 1), d) : d;
}

// Khung kính mờ quanh sân khấu (như khung viền trong video mẫu): nền tối trong suốt, viền mảnh,
// bốn góc có nét ngoặc neon vẽ dần khi cảnh vào.
const KhungSan: React.FC<{w: number; h: number; p: number}> = ({w, h, p}) => {
  const L = 46;
  const e = 1 - Math.pow(1 - p, 3);
  const goc = (x: number, y: number, sx: number, sy: number) => `M${x + sx * L} ${y} L${x} ${y} L${x} ${y + sy * L}`;
  return (
    <div style={{position: 'absolute', left: '50%', top: '50%', width: w, height: h, transform: 'translate(-50%, -50%)', borderRadius: 30, background: 'rgba(6,16,20,0.38)', border: '2px solid rgba(255,255,255,0.07)', boxShadow: 'inset 0 0 60px rgba(0,0,0,0.25)', opacity: e}}>
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {[goc(6, 6, 1, 1), goc(w - 6, 6, -1, 1), goc(6, h - 6, 1, -1), goc(w - 6, h - 6, -1, -1)].map((d, i) => (
          <path key={i} d={d} stroke={i % 2 ? '#FF8A3D' : '#3BF29A'} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - e} style={{filter: `drop-shadow(0 0 6px ${i % 2 ? '#FF8A3D' : '#3BF29A'})`}} />
        ))}
      </svg>
    </div>
  );
};

// Bố cục dọc 1080x1920 theo video mẫu:
//   [nhãn cam + tiêu đề cảnh]  ->  [SÂN KHẤU: vật thật chuyển động]  ->  [công thức]  ->  [phụ đề TikTok]
// Khoảng ~360px dưới cùng và ~150px trên cùng để trống cho giao diện TikTok/Shorts.
const Y_DAU = 196;
const Y_SAN = 470;
const Y_PHU_DE = 1452;

export const Canh: React.FC<{
  canh: CanhProps;
  tieuDe: string;
  tongCanh: number;
  hook: HookThongTin;
  pc: PhongCach;
  sanKhau: DuLieuSanKhau | null;
  giuTruoc: boolean; // sân khấu nối tiếp cảnh trước: không chạy hiệu ứng vào
  giuSau: boolean; // cảnh sau nối tiếp sân khấu: không làm mờ sân khấu khi kết thúc
  cacBuoc?: string[]; // các pha của bài (thanh các bước)
  phaTruoc?: string; // pha của cảnh trước
}> = ({canh, tieuDe, tongCanh, hook, pc, sanKhau, giuTruoc, giuSau, cacBuoc = [], phaTruoc = ''}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const vao = kep(frame / 9);
  const ra = interpolate(frame, [canh.soFrame - 6, canh.soFrame], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const nhoeVao = (1 - vao) * 12 + (1 - ra) * 10;

  const giayAm = canh.cau.length ? canh.cau[canh.cau.length - 1].ket : 3;
  const kieu = sanKhau ? 'sankhau' : phanLoaiHinh(canh.minhHoa.loai, canh.minhHoa.moTa, canh.minhHoa.duLieu);
  const laMoDau = canh.so === 1;
  const laCuoi = canh.so === tongCanh;
  const coHinh = kieu !== null;
  const coHook = laMoDau && !!hook.chu;

  // ----- công thức -----
  const nCau = canh.cau.length;
  const nDong = canh.noiDung.length;
  const batDong = canh.noiDung.map((_, i) => (nCau ? canh.cau[Math.min(nCau - 1, Math.floor((i * nCau) / nDong))].bat + 0.05 : 0.4 + i * 0.8));
  const hienCongThuc = nDong > 0 && !(coHook && coHinh && nDong > 1);
  const kieuTB = canh.trinhBay;
  const dungBienDoi = kieuTB === 'bien_doi' && coTheBienDoi(canh.noiDung);
  const dungCongDon = (kieuTB === 'cong_don' || kieuTB === 'bien_doi') && !dungBienDoi && coTheCongDon(canh.noiDung);
  const nhipDong = Math.max(1.1, Math.min(1.8, (giayAm - 0.3) / Math.max(1, nDong)));
  // có sân khấu thì công thức hiện sau khi hình đã dựng được một phần
  const treCT = coHinh ? Math.min(1.2, giayAm * 0.25) : 0.3;
  const thoiDiemDong = dungBienDoi || dungCongDon ? canh.noiDung.map((_, i) => treCT + i * nhipDong) : batDong.map((b) => Math.max(b, coHinh ? treCT : 0));
  const hang = dungCongDon ? nhomHang(canh.noiDung) : [];
  const khungCuoi = /dap_an|ket_qua/i.test(canh.loai);
  const coNote = canh.chuThich.length > 0;
  const nHang = !hienCongThuc ? 0 : dungBienDoi ? 1 : dungCongDon ? hang.length : nDong;

  // ----- phân chia chiều cao -----
  const dayVung = Y_PHU_DE - 30; // đáy vùng nội dung
  const coCTMax = coHinh ? 54 : 70;
  const caoCT = hienCongThuc ? Math.min(coHinh ? 380 : 700, 70 + nHang * coCTMax * 1.95) : 0;
  const caoNote = coNote ? 40 + canh.chuThich.length * 56 : 0;
  const yNoiDung = coHook ? Y_SAN + 20 : Y_SAN;
  const caoSan = Math.max(380, dayVung - yNoiDung - caoCT - caoNote - (caoCT ? 16 : 0) - (caoNote ? 16 : 0));
  const tiLe = Math.min(1.12, caoSan / SK_H, 1000 / SK_W);
  const lonHon = !coHinh;
  const coCT = Math.min(
    ...canh.noiDung.map((d) => coChuCongThuc(d, lonHon)),
    Math.floor((Math.max(120, caoCT) - 60) / Math.max(1, nHang) / 1.9)
  );

  // chuyển cảnh: mỗi cảnh một kiểu (lướt lên, phóng xuyên, lướt ngang...) hoặc theo "chuyen_canh" của kịch bản
  const kieuCC = canh.chuyenCanh && (KIEU_CHUYEN as readonly string[]).includes(canh.chuyenCanh) ? canh.chuyenCanh : KIEU_CHUYEN[(canh.so - 1) % 3];
  const ccSan = trangThaiChuyen(kieuCC, frame, canh.soFrame, giuTruoc, giuSau);
  const ccCT = trangThaiChuyen(kieuCC, frame - 4, canh.soFrame - 4);
  const tieuDeCanh = canh.tieuDeCanh;
  const nhan = coHook ? (NHAN_HOOK[hook.kieu] || '').replace(/^[^A-Za-zÀ-ỹ]+/, '') : nhanCanh(canh.loai, canh.nhan);

  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: FONT}}>
      {/* Đầu cảnh: nhãn + tiêu đề (hoặc câu hook ở cảnh 1) */}
      <div style={{position: 'absolute', left: 50, right: 50, top: Y_DAU, height: Y_SAN - Y_DAU - 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: ra, filter: nhoeVao > 0.3 ? `blur(${nhoeVao}px)` : undefined}}>
        {coHook ? (
          <>
            {nhan ? <TieuDeCanh nhan={nhan} chu="" tuKhoa="" /> : null}
            <HookChu chu={hook.chu} nhanManh={hook.nhanManh} kieu={hook.kieu} lead={canh.leadFrame} />
          </>
        ) : (
          <TieuDeCanh nhan={nhan} chu={tieuDeCanh || (laMoDau ? tieuDe : '')} tuKhoa={canh.tuKhoa} inHoa={pc.tieuDeInHoa !== false}
            dau={pc.thanhBuoc !== false && cacBuoc.length >= 3 && phaCua(canh.loai) ? <ThanhBuoc cacBuoc={cacBuoc} hienTai={phaCua(canh.loai)} moi={phaCua(canh.loai) !== phaTruoc} /> : undefined} />
        )}
      </div>

      {/* Sân khấu */}
      {coHinh ? (
        <NhoeHuong nx={ccSan.nx} ny={ccSan.ny} style={{position: 'absolute', left: 0, right: 0, top: yNoiDung, height: caoSan, display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: ccSan.mo, transform: `translate(${ccSan.x}px, ${ccSan.y}px) scale(${ccSan.s})`}}>
          {pc.khungSanKhau !== false ? <KhungSan w={Math.min(1040, SK_W * tiLe + 40)} h={Math.min(caoSan - 6, SK_H * tiLe + 24)} p={giuTruoc ? 1 : kep((frame - 3) / 14)} /> : null}
          <div style={{width: SK_W, height: SK_H, transform: `scale(${tiLe})`, flexShrink: 0}}>
            {sanKhau ? (
              <SanKhau du={sanKhau} giayAm={giayAm} />
            ) : kieu ? (
              <div style={{width: 960, height: 640, marginTop: (SK_H - 640) / 2}}>
                <MinhHoa kieu={kieu} mh={canh.minhHoa} giayAm={giayAm} />
              </div>
            ) : null}
          </div>
        </NhoeHuong>
      ) : null}

      {/* Chú thích + công thức */}
      <NhoeHuong nx={ccCT.nx} ny={ccCT.ny} style={{position: 'absolute', left: 50, right: 50, top: coHinh ? yNoiDung + caoSan + 16 : Y_SAN, bottom: 1920 - dayVung, display: 'flex', flexDirection: 'column', justifyContent: coHinh ? 'flex-start' : 'center', alignItems: 'center', gap: 16, opacity: frame < 4 ? 0 : ccCT.mo, transform: `translate(${ccCT.x}px, ${ccCT.y}px) scale(${ccCT.s})`}}>
        {coNote ? <ChuThich dong={canh.chuThich} bd={Math.max(0.6, giayAm * 0.45)} /> : null}
        {hienCongThuc ? (
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: coHinh ? '14px 26px' : 0, borderRadius: 24, background: coHinh ? 'rgba(4,14,13,0.55)' : 'transparent', border: coHinh ? '2px solid rgba(59,242,154,0.25)' : 'none', opacity: kep((t - treCT + 0.3) * 3)}}>
            {dungBienDoi ? (
              <BienDoi dong={canh.noiDung} batDong={thoiDiemDong} t={t} co={coCT} maxWidth={920} khungCuoi={khungCuoi} mauGoc={MAU.vang} mauNhay="#FFD27A" />
            ) : dungCongDon ? (
              hang.map((h, r) => (
                <BienDoi key={r} dong={h.dong} batDong={h.chiSo.map((i) => thoiDiemDong[i])} t={t} co={coCT} maxWidth={920} khungCuoi={khungCuoi && r === hang.length - 1} mauGoc={MAU.vang} mauNhay="#FFD27A" can="trai" />
              ))
            ) : (
              canh.noiDung.map((d, i) => {
                const bd = thoiDiemDong[i];
                // viết tay: thời gian viết theo độ dài dòng (0,5-1,3 giây), bút chì chạy theo mép chữ
                const dai = Math.min(1.3, Math.max(0.5, d.replace(/\\[a-zA-Z]+/g, 'x').length * 0.045));
                const p = t < bd ? 0 : kep((t - bd) / dai);
                return (
                  <div key={i} style={{opacity: p > 0 ? 1 : 0, maxWidth: 960, textAlign: 'center', padding: '2px 16px'}}>
                    <VietTay p={p} but={pc.butChi !== false}>
                      <Toan tex={d} size={Math.min(coCT * 1.08, coChuCongThuc(d, lonHon))} maxWidth={900} color={laChuThuong(d) ? '#ffffff' : MAU.vang} />
                    </VietTay>
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </NhoeHuong>

      {/* Phụ đề */}
      {pc.phuDe ? (
        <div style={{position: 'absolute', left: 60, right: 60, top: Y_PHU_DE, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {pc.kieuNen !== 'luoi' && pc.kieuNen !== 'luoi_phang' && pc.kieuNen !== 'gradient' ? <PhuDeTikTok cau={canh.cau} t={t} kieu={pc.kieuPhuDe} mauHop={pc.mauPhuDe} /> : <PhuDe cau={canh.cau} t={t} co={42} />}
        </div>
      ) : null}

      {/* Âm thanh của cảnh */}
      {!giuTruoc ? (
        <Sequence from={0} durationInFrames={30} layout="none">
          <Audio src={staticFile('sfx/whoosh.wav')} volume={laMoDau ? 0.18 : 0.28} />
        </Sequence>
      ) : null}
      {khungCuoi ? (
        <Sequence from={0} durationInFrames={60} layout="none">
          <Audio src={staticFile('sfx/boom.wav')} volume={0.35} />
        </Sequence>
      ) : null}
      {hienCongThuc
        ? canh.noiDung.map((_, i) => {
            const tai = Math.round(thoiDiemDong[i] * fps);
            const cuoi = (laCuoi || khungCuoi) && i === nDong - 1;
            return (
              <Sequence key={`sfx${i}`} from={tai} durationInFrames={cuoi ? 70 : 20} layout="none">
                <Audio src={staticFile(cuoi ? 'sfx/ting.wav' : 'sfx/click.wav')} volume={cuoi ? 0.5 : 0.22} />
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
