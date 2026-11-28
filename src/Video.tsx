import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';
import {lamSachChu} from './chu';
import {FONT, TEN_THUONG_HIEU} from './theme';
import {Props} from './types';
import {KiemDuyet} from './KiemDuyet';
import {KhoaThuongHieu} from './khung4tang/KhoaThuongHieu';
import {Khung4Tang} from './khung4tang/Khung4Tang';
import {OutroTomTat} from './khung4tang/OutroTomTat';
import type {DongTomTat, Khung4TangVao} from './khung4tang/kieu';
import {KhungHinhHoc} from './hinhhoc/KhungHinhHoc';
import {chuanHoaCanh3DV} from './3d-vector/dac_ta';

// Màn kết tùy chỉnh bằng ảnh/video ngoài (khi outro.loai !== 'tu_tao'): hiện dần ở cuối video, phủ kín màn hình.
const ManKet: React.FC<{tep: string; loai: 'video' | 'anh'}> = ({tep, loai}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000', opacity: interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp'})}}>
      {loai === 'video' ? (
        <OffthreadVideo src={staticFile(tep)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      ) : (
        <Img src={staticFile(tep)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1 + f * 0.0004})`}} />
      )}
    </AbsoluteFill>
  );
};

// Nhạc nền tự giảm âm lượng khi có giọng đọc (auto-ducking -16..-18 dB) để lời giảng luôn rõ, nhích nhẹ lên ở các quãng nghỉ và Outro.
function taoAmLuongNhac(props: Props) {
  const {canh, tongFrame, fps, outro} = props;
  const goc = props.amLuongNhac ?? 0.16;
  const nt = props.nhacTron;
  const rawKhoang: [number, number][] = [];
  canh.forEach((c) => {
    if (!c.cau.length) return;
    for (const cau of c.cau) {
      const a = c.batDau + cau.bat * fps;
      const b = c.batDau + cau.ket * fps;
      if (b > a) rawKhoang.push([a, b]);
    }
  });
  rawKhoang.sort((x, y) => x[0] - y[0]);
  // Gộp các khoảng nói sát nhau (< 0.28 s) để nhạc không nhấp nháy giữa các câu nối liền
  const khoang: [number, number][] = [];
  const kheGop = Math.round(0.28 * fps);
  for (const [a, b] of rawKhoang) {
    const cuoi = khoang[khoang.length - 1];
    if (cuoi && a - cuoi[1] <= kheGop) cuoi[1] = Math.max(cuoi[1], b);
    else khoang.push([a, b]);
  }
  const outroBat = outro ? outro.batDau : tongFrame - 2 * fps;
  return (f: number) => {
    let gan = 1e9;
    for (const [a, b] of khoang) {
      if (f >= a && f <= b) { gan = 0; break; }
      gan = Math.min(gan, f < a ? a - f : f - b);
    }
    const dauCuoi = interpolate(f, [0, 20, tongFrame - 45, tongFrame], [0.5, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    if (nt) {
      const co = interpolate(gan, [0, 16], [nt.duoi, nt.nghi], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      const mucOutro = nt.outro ?? nt.dauCuoi;
      const nangIntro = f < 3 * fps ? Math.max(co, nt.dauCuoi) : co;
      const trongOutro = f >= outroBat && gan > 6 ? interpolate(gan, [6, 18], [co, Math.max(co, mucOutro)], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : nangIntro;
      const cuoi = f > tongFrame - 2 * fps ? Math.max(trongOutro, nt.dauCuoi) : trongOutro;
      return cuoi * dauCuoi;
    }
    const duck = interpolate(gan, [0, 16], [0.22, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return goc * duck * dauCuoi;
  };
}

// Danh sách SFX của khung 4 tầng (tất định từ props): mốc gần nhau < 0,3 s chỉ giữ tiếng ưu tiên cao hơn
type SuKienSfx = {t: number; tep: string; vol: number; dai: number; uu: number};
export function suKienSfx4Tang(k: NonNullable<Props['khung4tang']>, tHet: number): SuKienSfx[] {
  const ds: SuKienSfx[] = [];
  const buoc = [...(k.buoc || [])].sort((a, b) => a.t - b.t);
  const G = k.mocCau ? Math.max(3.6, Math.min(k.mocCau.giay || 5, 5, tHet * 0.4)) : 0;
  buoc.forEach((b, j) => {
    if (j > 0) ds.push({t: b.t, tep: 'swoosh', vol: 0.16, dai: 0.5, uu: 2});
    b.the.forEach((th, n) => {
      const t0 = Math.max(th.t ?? b.t + 0.35 + n * 0.7, b.t + (j > 0 ? 0.2 : 0));
      if (th.chot) ds.push({t: t0, tep: 'ting', vol: 0.24, dai: 1.0, uu: 4});
      else ds.push({t: t0, tep: 'pop', vol: 0.2, dai: 0.3, uu: 1});
    });
    const dc = b.doi_chieu;
    if (dc && typeof dc.t_giai === 'number') ds.push({t: dc.t_giai + 0.8, tep: 'ding', vol: 0.24, dai: 0.95, uu: 3});
  });
  const c3 = k.canh3dv as {pha?: {ten?: string; t?: number}[]} | null;
  for (const ph of c3?.pha || []) if (ph && /gap|gấp/.test(String(ph.ten || '')) && typeof ph.t === 'number') ds.push({t: ph.t + 0.25, tep: 'whoosh', vol: 0.18, dai: 0.6, uu: 2});
  for (const ph of k.sanKhau?.pha || []) {
    if (['thu', 'doi', 'ket'].includes(ph.ten) && ph.chon) ds.push({t: ph.t + 0.15, tep: 'whoosh', vol: 0.15, dai: 0.6, uu: 2});
    if (['thu', 'doi'].includes(ph.ten) && ph.bt) ds.push({t: ph.t + 1.25, tep: 'pop', vol: 0.2, dai: 0.3, uu: 1});
    if (ph.ten === 'ket') ds.push({t: ph.t + 1.6, tep: 'ding', vol: 0.22, dai: 0.95, uu: 3});
  }
  for (const x of k.khongGian?.xoay || []) if (x.d > 0) ds.push({t: x.t + 0.05, tep: 'whoosh', vol: 0.12, dai: 0.6, uu: 2});
  for (const h of k.khongGian?.hanhDong || []) ds.push({t: h.t + 0.1, tep: 'whoosh', vol: 0.15, dai: 0.6, uu: 2});
  const ra = ds.filter((e) => e.t >= G - 0.2 && e.t < tHet - 0.05).sort((a, b) => a.t - b.t);
  const giu: SuKienSfx[] = [];
  for (const e of ra) {
    const truoc = giu[giu.length - 1];
    if (truoc && e.t - truoc.t < 0.3) { if (e.uu > truoc.uu) giu[giu.length - 1] = e; continue; }
    giu.push(e);
  }
  return giu;
}

// Outro vào mượt 9 khung (scale 0.96 -> 1, trượt lên) bên trong Sequence có sẵn, không đổi mốc.
const VaoMuot: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  const v = spring({frame: f, fps: 30, durationInFrames: 9, config: {damping: 16, stiffness: 150, mass: 0.7}});
  const u = Math.min(1, v);
  return <AbsoluteFill style={{opacity: 1, transform: `translateY(${(1 - u) * 16}px) scale(${0.96 + 0.04 * u})`, transformOrigin: '50% 50%'}}>{children}</AbsoluteFill>;
};

// Dựng Khung4TangVao tối thiểu từ props nếu đầu vào thiếu khung4tang (khóa 100% không bao giờ rẽ về giao diện cũ).
function taoKhung4TangToiThieu(props: Props, ketThuc: number): Khung4TangVao {
  const fps = props.fps || 30;
  const laHH = props.luong === 'hinh_hoc_thuan' || /HINH_/i.test(props.mon || '');
  const laKG = laHH && (/HINH_KHONG_GIAN/i.test(props.mon || '') || /chóp|lăng trụ|tứ diện|hình hộp|lập phương|mặt cầu|mặt phẳng\s*\(|không gian|S\.[A-Z]{2,}/i.test(`${props.deGoc || ''} ${props.tieuDe || ''}`));
  const buoc = (props.canh || []).map((c, idx) => {
    const chot = /dap_an|ket_qua|ket_luan/i.test(c.loai || '');
    const dong = (c.noiDung || []).filter(Boolean);
    return {
      t: c.batDau / fps,
      nhan: chot ? 'Kết luận' : idx === 0 ? 'Phân tích' : 'Suy luận',
      tieu_de: c.tieuDeCanh || (chot ? 'Kết luận' : `Bước ${idx + 1}`),
      mau: (chot ? 'ngoc' : idx === 0 ? 'cyan' : 'vang') as 'cyan' | 'vang' | 'ngoc',
      the: dong.length
        ? [{loai: 'cong_thuc' as const, dong, t: c.batDau / fps, chot}]
        : [{loai: 'chu' as const, noi_dung: lamSachChu(c.cau?.[0]?.text || c.tieuDeCanh || props.tieuDe, 70), t: c.batDau / fps, chot}],
    };
  });
  const deGhim = [
    ...(props.deBai?.cho || []).slice(0, 3).map((x, i) => ({id: `c${i}`, nhan: x})),
    ...(props.deBai?.tim ? [{id: 'tim', nhan: props.deBai.tim}] : []),
  ];
  return {
    mon: laHH ? (laKG ? 'HINH_KHONG_GIAN' : 'HINH_PHANG') : props.mon,
    cheDo: laHH ? (laKG ? 'HINH_KHONG_GIAN' : 'HINH_PHANG') : undefined,
    tongFrame: Math.max(1, ketThuc),
    fps,
    thuongHieu: TEN_THUONG_HIEU,
    boCuc: {anToanTikTok: true, phuDe: 'gon'},
    deGhim,
    buoc,
    canh3dv: null,
    khongGian: null,
    mocCau: {
      nhan_thi: laKG ? 'HÌNH KHÔNG GIAN' : laHH ? 'HÌNH HỌC PHẲNG' : 'BÀI TOÁN HAY',
      tieu_de: lamSachChu(props.tieuDe || props.chuDe || 'Bài toán hôm nay', 42),
      phu_de: TEN_THUONG_HIEU,
      cau_hook: lamSachChu(props.hookChu || props.hook || 'Cùng phân tích nhanh!', 64),
      cta: 'Lưu lại ôn nhanh!',
      giay: 3.6,
    },
    tomTat: (props.baiHoc || []).slice(0, 3).map((b, i) => ({chien_thuat: `Ý ${i + 1}`, cong_thuc: b})),
  };
}

function damBaoTomTat(tomTat: DongTomTat[] | null | undefined, baiHoc: string[] | undefined, buoc: Khung4TangVao['buoc']): DongTomTat[] {
  if (tomTat && tomTat.length) return tomTat;
  if (baiHoc && baiHoc.length) return baiHoc.slice(0, 3).map((b, idx) => ({chien_thuat: `Ý ${idx + 1}`, cong_thuc: b}));
  return (buoc || []).slice(0, 3).map((b, idx) => {
    const th = b.the?.[0];
    const ct = th && th.loai === 'cong_thuc' ? th.dong[th.dong.length - 1] || '' : th && th.loai === 'chu' ? th.noi_dung : '';
    return {chien_thuat: lamSachChu(b.tieu_de || b.nhan || `Bước ${idx + 1}`, 24), cong_thuc: ct};
  });
}

// Tuyến dựng duy nhất 100% Khung 4 tầng cho cả 4 mảng:
// - HINH_KHONG_GIAN (cả Remotion SVG 3D lẫn Manim 3D T2) và HINH_PHANG -> KhungHinhHoc + OutroTomTat
// - THUC_TE và XAC_SUAT -> Khung4Tang + OutroTomTat
export const Video: React.FC<Props> = (props) => {
  // Remotion trộn defaultProps (mẫu "4 dây cáp" ở Root.tsx) dưới inputProps: bài thật thiếu khóa khung4tang
  // (vd hình phẳng) sẽ nhận nhầm T3/chip/phụ đề của mẫu -> gỡ khung4tang mẫu khi id không phải bài mẫu.
  const k4LaMau = !!(props.khung4tang as {laMau?: boolean} | null | undefined)?.laMau && props.id !== 'MAU-4TANG';
  const chuan: Props = {...props, khung4tang: k4LaMau ? undefined : props.khung4tang, thuongHieu: {...props.thuongHieu, ten: TEN_THUONG_HIEU, logo: null, handle: ''}};
  if (chuan.anhBiaDau) {
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <Sequence from={0} durationInFrames={1}>
          <Img src={staticFile(chuan.anhBiaDau)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Sequence>
        <Sequence from={1}>
          <NoiDungVideo {...chuan} anhBiaDau={null} tongFrame={chuan.tongFrame - 1} />
        </Sequence>
      </AbsoluteFill>
    );
  }
  return <NoiDungVideo {...chuan} />;
};

const NoiDungVideo: React.FC<Props> = (props) =>
  props.boCuc === 'hinh_phang' || (!!props.hinhPhang && !props.khung4tang) ? <NoiDungHinhPhang {...props} /> : <NoiDung4Tang {...props} />;

const NoiDung4Tang: React.FC<Props> = (props) => {
  const {canh, tongFrame, fps, nhac, thuongHieu, outro} = props;
  const ketThuc = outro ? outro.batDau : tongFrame;
  const k = React.useMemo(() => props.khung4tang || taoKhung4TangToiThieu(props, ketThuc), [props, ketThuc]);
  const la10P = props.kieu_video === 'DAI_10_PHUT' || /-10P$/i.test(props.id);
  const batBuocMinhHoa = props.mon === 'THUC_TE' && !la10P;
  const laHinhKhongGian =
    !la10P &&
    props.mon !== 'THUC_TE' &&
    props.mon !== 'XAC_SUAT' &&
    (!!k.khongGian ||
      k.cheDo === 'HINH_KHONG_GIAN' ||
      props.mon === 'HINH_KHONG_GIAN' ||
      (props.luong === 'hinh_hoc_thuan' && k.cheDo !== 'HINH_PHANG'));
  const laHinhPhangK4 = !laHinhKhongGian && !la10P && (k.cheDo === 'HINH_PHANG' || props.mon === 'HINH_PHANG');
  const laHinhHoc = laHinhKhongGian || laHinhPhangK4;
  const monHinhHoc = laHinhKhongGian ? 'HINH_KHONG_GIAN' : 'HINH_PHANG';
  const amNhac = React.useMemo(() => taoAmLuongNhac(props), [canh, tongFrame, fps, props.amLuongNhac]);
  const cau = React.useMemo(() => canh.flatMap((c) => c.cau.map((x) => ({text: x.text, bat: c.batDau / fps + x.bat, ket: c.batDau / fps + x.ket}))), [canh, fps]);
  const tomTatChuan = React.useMemo(() => damBaoTomTat(k.tomTat, props.baiHoc, k.buoc), [k.tomTat, props.baiHoc, k.buoc]);
  const canhCuoi = React.useMemo(() => (tomTatChuan.length ? chuanHoaCanh3DV(k.canh3dv, [...(k.buoc || [])].map((b) => b.t).sort((x, y) => x - y), Math.max(1, ketThuc) / fps).canh : null), [tomTatChuan, k.canh3dv, k.buoc, ketThuc, fps]);
  const sfx = React.useMemo(() => suKienSfx4Tang(k, Math.max(1, ketThuc) / fps), [k, ketThuc, fps]);
  return (
    <AbsoluteFill style={{fontFamily: FONT, background: laHinhKhongGian ? '#050C1B' : laHinhPhangK4 ? '#081A3A' : '#0E1014'}}>
      <Sequence from={0} durationInFrames={Math.max(1, ketThuc)}>
        {laHinhHoc ? (
          <KhungHinhHoc
            cheDo={monHinhHoc}
            mon={monHinhHoc}
            fps={fps}
            tongFrame={Math.max(1, ketThuc)}
            deBai={props.deBai}
            deGoc={props.deGoc}
            deGhim={k.deGhim}
            buoc={k.buoc}
            khongGian={k.khongGian}
            tCongBo={k.tCongBo ?? k.tChot}
            tOutro={outro ? Math.max(0, ketThuc / fps - 0.35) : undefined}
            dapAn={props.dapAn}
            mocCau={k.mocCau}
            cau={k.boCuc?.phuDe === 'gon' ? cau : k.cau}
            phuDe={k.boCuc?.phuDe}
          />
        ) : (
          <Khung4Tang {...k} mon={props.mon} dapAn={props.dapAn} batBuocMinhHoa={batBuocMinhHoa} fps={fps} tongFrame={Math.max(1, ketThuc)} thuongHieu={k.thuongHieu ?? thuongHieu?.ten} cau={k.boCuc?.phuDe === 'gon' ? cau : k.cau} />
        )}
      </Sequence>
      {nhac ? <Audio src={staticFile(nhac)} loop volume={amNhac} /> : null}
      {canh.map((c) =>
        c.audio ? (
          <Sequence key={`am${c.so}`} from={c.batDau + (c.leadFrame || 0)} durationInFrames={c.soFrame} layout="none">
            <Audio src={staticFile(c.audio)} volume={1} />
          </Sequence>
        ) : null
      )}
      {canh.map((c) =>
        /dap_an|ket_qua/i.test(c.loai) && c.batDau > 40 ? (
          <Sequence key={`riser${c.so}`} from={c.batDau - 36} durationInFrames={40} layout="none">
            <Audio src={staticFile('sfx/riser.wav')} volume={0.14} />
          </Sequence>
        ) : null
      )}
      {/* Bài hình học ghép lớp Manim 3D: giữ SFX click/ting theo sự kiện vẽ hình */}
      {props.manimLop && props.suKienManim
        ? props.suKienManim.slice(0, 80).map((e, i) => (
            <Sequence key={`sfxm${i}`} from={Math.max(0, e.f)} durationInFrames={e.kieu === 'khung' ? 70 : 20} layout="none">
              <Audio src={staticFile(e.kieu === 'khung' ? 'sfx/ting.wav' : 'sfx/click.wav')} volume={e.kieu === 'khung' ? 0.18 : 0.1} />
            </Sequence>
          ))
        : null}
      {/* SFX tinh tế theo sự kiện cho Khung4Tang (KhungHinhHoc dùng DongCoSfx với cooldown 3.5s) */}
      {!laHinhHoc ? sfx.map((e, i) => (
        <Sequence key={`sfx4t${i}`} from={Math.max(0, Math.round(e.t * fps))} durationInFrames={Math.round(e.dai * fps)} layout="none">
          <Audio src={staticFile(`sfx/${e.tep}.wav`)} volume={e.vol} />
        </Sequence>
      )) : null}
      {outro ? (
        <Sequence from={outro.batDau} durationInFrames={outro.soFrame}>
          <VaoMuot>
            {outro.loai === 'tu_tao' ? (
              <OutroTomTat mon={laHinhHoc ? monHinhHoc : props.mon} giuHinh={batBuocMinhHoa} dapAn={props.dapAn} tomTat={tomTatChuan} canh={k.tuSinh || k.sanKhau || k.khongGian ? null : canhCuoi} sanKhau={k.tuSinh?.lop?.length ? null : k.sanKhau || null} khongGian={k.khongGian || null} tCuoi={Math.max(1, ketThuc) / fps} thuongHieu={k.thuongHieu ?? thuongHieu?.ten} cta={k.cta} tuSinh={k.tuSinh || null} theme={k.theme} />
            ) : <><ManKet tep={outro.tep} loai={outro.loai} /><KhoaThuongHieu viTri="outro" mon={laHinhHoc ? monHinhHoc : props.mon} /></>}
          </VaoMuot>
        </Sequence>
      ) : null}
      {props.kiemDuyet ? <KiemDuyet kiemT2={batBuocMinhHoa} doXacSuat={props.mon === 'XAC_SUAT'} /> : null}
    </AbsoluteFill>
  );
};

// Hình phẳng chuẩn: KhungHinhHoc (nền blueprint, 4 tầng trong SAFE_ZONE_TIKTOK, T2 trong suốt ghép lớp Manim/SVG) + OutroTomTat.
const NoiDungHinhPhang: React.FC<Props> = (props) => {
  const {canh, tongFrame, fps, nhac, thuongHieu, outro} = props;
  const amNhac = React.useMemo(() => taoAmLuongNhac(props), [canh, tongFrame, fps, props.amLuongNhac]);
  const ketThuc = outro ? outro.batDau : tongFrame;
  const monHP = props.mon && /HINH_/i.test(props.mon) ? props.mon : 'HINH_PHANG';
  const k = props.khung4tang;
  const cauHP = React.useMemo(() => canh.flatMap((c) => c.cau.map((x) => ({text: x.text, bat: c.batDau / fps + x.bat, ket: c.batDau / fps + x.ket}))), [canh, fps]);
  const mocCongBoHP = React.useMemo(() => {
    if (k?.tCongBo !== undefined) return k.tCongBo;
    if (typeof props.hinhPhang?.moc_cong_bo === 'number') return props.hinhPhang.moc_cong_bo;
    const cChot = canh.find((c) => /dap_an|ket_qua/i.test(c.loai));
    return cChot ? cChot.batDau / fps : Math.max(1, ketThuc) / fps;
  }, [k?.tCongBo, props.hinhPhang?.moc_cong_bo, canh, ketThuc, fps]);
  const tomTatHP = React.useMemo(() => {
    if (k?.tomTat && k.tomTat.length) return k.tomTat;
    if (props.hinhPhang?.tomTat && props.hinhPhang.tomTat.length) return props.hinhPhang.tomTat;
    if (props.baiHoc && props.baiHoc.length) return props.baiHoc.slice(0, 3).map((b, idx) => ({chien_thuat: `Ý ${idx + 1}`, cong_thuc: b}));
    const dg = props.hinhPhang?.dong_giai || [];
    if (dg.length) {
      return dg.slice(0, 3).map((tr, idx) => ({
        chien_thuat: lamSachChu(tr.tieu_de || `Bước ${idx + 1}`, 26),
        cong_thuc: tr.dong?.[tr.dong.length - 1]?.tex || '',
      }));
    }
    return [];
  }, [k?.tomTat, props.hinhPhang?.tomTat, props.hinhPhang?.dong_giai, props.baiHoc]);
  return (
    <AbsoluteFill style={{fontFamily: FONT, background: '#081A3A'}}>
      <Sequence from={0} durationInFrames={Math.max(1, ketThuc)}>
        <KhungHinhHoc
          cheDo="HINH_PHANG"
          mon={monHP}
          fps={fps}
          tongFrame={Math.max(1, ketThuc)}
          deBai={props.deBai}
          deGoc={props.deGoc}
          deGhim={k?.deGhim}
          buoc={k?.buoc}
          dongGiaiHinhPhang={props.hinhPhang?.dong_giai}
          chipTrungGian={props.hinhPhang?.ket_qua_chip}
          hinh2d={!props.manimLop ? props.hinhPhang?.hinh2d : null}
          mocCau={k?.mocCau ?? props.hinhPhang?.mocCau}
          tCongBo={mocCongBoHP}
          tOutro={outro ? Math.max(0, ketThuc / fps - 0.35) : undefined}
          dapAn={props.ketQuaHinhPhang?.tex ?? props.dapAn}
          // N1 kiểm toán phiên 3: hình phẳng không có khung4tang -> phụ đề gọn dựng từ lời từng cảnh (trước đây T4 trống)
          cau={!k || k.boCuc?.phuDe === 'gon' ? cauHP : k.cau}
          phuDe={k ? k.boCuc?.phuDe : 'gon'}
        />
      </Sequence>
      {nhac ? <Audio src={staticFile(nhac)} loop volume={amNhac} /> : null}
      {canh.map((c) =>
        c.audio ? (
          <Sequence key={`am${c.so}`} from={c.batDau + (c.leadFrame || 0)} durationInFrames={c.soFrame} layout="none">
            <Audio src={staticFile(c.audio)} volume={1} />
          </Sequence>
        ) : null
      )}
      {(props.suKienManim || []).slice(0, 80).map((e, i) => (
        <Sequence key={`sfxhp${i}`} from={Math.max(0, e.f)} durationInFrames={e.kieu === 'khung' ? 70 : 20} layout="none">
          <Audio src={staticFile(e.kieu === 'khung' ? 'sfx/ting.wav' : 'sfx/click.wav')} volume={e.kieu === 'khung' ? 0.18 : 0.1} />
        </Sequence>
      ))}
      {outro ? (
        <Sequence from={outro.batDau} durationInFrames={outro.soFrame}>
          {outro.loai === 'tu_tao' ? (
            <OutroTomTat
              mon={monHP}
              theme="blueprint"
              nhanKetQua={props.ketQuaHinhPhang?.nhan}
              dapAn={props.ketQuaHinhPhang?.tex ?? props.dapAn}
              tomTat={tomTatHP}
              canh={null}
              sanKhau={null}
              khongGian={null}
              tCuoi={Math.max(1, ketThuc) / fps}
              thuongHieu={thuongHieu?.ten}
            />
          ) : <><ManKet tep={outro.tep} loai={outro.loai} /><KhoaThuongHieu viTri="outro" mon={monHP} /></>}
        </Sequence>
      ) : null}
      {props.kiemDuyet ? <KiemDuyet /> : null}
    </AbsoluteFill>
  );
};
