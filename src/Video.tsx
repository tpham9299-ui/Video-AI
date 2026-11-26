import {BoiCanh} from './NenCauChuyen';
import {NenChieuSau} from './NenChieuSau';
import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';
import {Canh, sanKhauCuaCanh} from './Canh';
import {LopQuet} from './LopQuet';
import {MoDau} from './MoDau';
import {Intro, lechIntro} from './Intro';
import {DuKien} from './DuKien';
import {NhanQuangCao} from './NhanQuangCao';
import {ManKetChuyenNghiep} from './ManKet';
import {phaCua, SAU_PHA} from './ThanhBuoc';
import {KiemDuyet} from './KiemDuyet';
import {NenTuTao} from './NenTuTao';
import {Nen} from './Nen';
import {FONT, FONT_DAM, BONG_CHU, vienChu, GIAO_DIEN, MAU, MAU_GOC, MAU_LOAI, chuTrenMau} from './theme';
import {DuongTienTrinh} from './dong/DiemNhan';
import {LuoiSan} from './dong/KhongGian';
import {smooth} from './manim';
import {LogoTron, ManKetTuTao, moHuyHieu, ThuongHieu} from './ThuongHieu';
import {ThanhTienDo} from './ThanhTienDo';
import {KieuToan, NapPhongToan} from './Toan';
import {Props, ThuongHieuProps} from './types';
import {Khung4Tang} from './khung4tang/Khung4Tang';
import {OutroTomTat} from './khung4tang/OutroTomTat';
import {chuanHoaCanh3DV} from './3d-vector/dac_ta';

// Chớp sáng ở khung hình đầu tiên: cắt ngang thói quen lướt của người xem.
const ChopSang: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{background: '#ffffff', opacity: interpolate(f, [0, 7], [0.6, 0], {extrapolateRight: 'clamp'})}} />;
};

// Màn kết (ảnh hoặc video của bạn): hiện dần ở cuối video, phủ kín màn hình.
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

// Dòng chủ đề nhỏ cố định ở góc trên (như "20 ĐÔ MUA AI NÀO?" của video mẫu): phần sau dấu ":" hoặc "?" tô cam.
const DauTrang: React.FC<{chu: string; lop: string; tu: number; lui: number; den: number; th: ThuongHieuProps; tap?: number; nhan?: string; haXuong?: boolean}> = ({chu, lop, tu, lui, den, th, tap, nhan, haXuong}) => {
  const f = useCurrentFrame();
  const e = smooth((f - tu) / 12);
  if (!chu || e <= 0 || f >= den) return null;
  const an = 0; // huy hiệu giữa video đã bỏ (từng đè lên thanh này)
  const s = chu.toUpperCase();
  const cat = s.search(/[:?!]/);
  const dau = cat > 0 ? s.slice(0, cat + 1) : s;
  const sau = cat > 0 ? s.slice(cat + 1) : '';
  // thanh đầu trang CANH GIỮA: [logo kênh] [LỚP] CHỦ ĐỀ — cân đối hai bên
  return (
    <div style={{position: 'absolute', left: 40, right: 40, top: haXuong ? 128 : 118, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, fontFamily: FONT_DAM, fontWeight: 900, fontSize: 30, color: '#fff', opacity: 0.95 * e * (1 - an), transform: `translateY(${(1 - e) * -20}px)`, whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(0,0,0,0.6)'}}>
      {lui ? <LogoTron th={th} co={52} goc={f * 2} sang={0.3} /> : null}
      {lop ? <span data-kd-bo="1" style={{background: nhan || '#3BF29A', color: nhan ? chuTrenMau(nhan) : '#062019', borderRadius: 8, padding: '1px 10px', fontSize: 24, textShadow: 'none'}}>LỚP {lop}</span> : null}
      {tap ? <span data-kd-bo="1" style={{background: '#FF8A3D', color: '#1a0d02', borderRadius: 8, padding: '1px 10px', fontSize: 24, textShadow: 'none'}}>TẬP {tap}</span> : null}
      <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>
        {dau}
        <span style={{color: nhan || '#FF8A3D'}}>{sau}</span>
      </span>
    </div>
  );
};

// Nền môi trường Blender của phần mở đầu (ảnh thật), tắt bằng nhòe + tối dần trong ~1,2 giây đầu cảnh chuyển.
const NenBlender: React.FC<{src: string; tat: number}> = ({src, tat}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [tat + 6, tat + 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (p >= 1) return null;
  return (
    <AbsoluteFill style={{backgroundColor: '#13202a', opacity: 1 - p}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', opacity: 0.82, transform: `scale(${1.03 + f * 0.0003 + p * 0.12})`, filter: p > 0 ? `blur(${p * 16}px)` : undefined}} />
      <AbsoluteFill style={{background: 'linear-gradient(to bottom, rgba(10,18,24,.55), transparent 30%, transparent 66%, rgba(10,18,24,.7))'}} />
    </AbsoluteFill>
  );
};

// Nhạc nền tự giảm âm lượng khi có giọng đọc (ducking) để lời giảng luôn rõ, tăng lên ở các quãng nghỉ.
function taoAmLuongNhac(props: Props) {
  const {canh, tongFrame, fps} = props;
  const goc = props.amLuongNhac ?? 0.16;
  const nt = props.nhacTron;
  const khoang: [number, number][] = [];
  canh.forEach((c) => {
    if (!c.cau.length) return;
    khoang.push([c.batDau + c.cau[0].bat * fps, c.batDau + c.cau[c.cau.length - 1].ket * fps]);
  });
  return (f: number) => {
    let gan = 1e9;
    for (const [a, b] of khoang) {
      if (f >= a && f <= b) { gan = 0; break; }
      gan = Math.min(gan, f < a ? a - f : f - b);
    }
    // giảm nhạc mềm (18 khung hình) để không nghe "phập phồng"; ở quãng nghỉ giữa hai cảnh nhạc dâng lên nối hai bước
    const dauCuoi = interpolate(f, [0, 20, tongFrame - 45, tongFrame], [0.5, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    if (nt) {
      // v95: mức tuyệt đối theo đo độ to thật: dưới giọng ~-16 dB (nghe rõ nhịp, không át lời), nghỉ +5 dB,
      // 3 s đầu (intro) và 2 s cuối (outro) nâng +4 dB
      const co = interpolate(gan, [0, 18], [nt.duoi, nt.nghi], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      const dau = f < 3 * fps || f > tongFrame - 2 * fps ? Math.max(co, nt.dauCuoi) : co;
      return dau * dauCuoi;
    }
    const duck = interpolate(gan, [0, 18], [0.42, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return goc * duck * dauCuoi;
  };
}

// Video có ảnh bìa ở khung hình đầu: khung 0 là ảnh bìa, toàn bộ nội dung lùi 1 khung (1/30 giây, mắt không nhận ra).
// v91: props có boCuc '4tang' + khung4tang -> phần nội dung là khung 4 tầng (sân khấu 3D Vector) nhưng VẪN giữ vỏ chung
// (ảnh bìa khung đầu, intro thương hiệu, giọng đọc từng cảnh, nhạc ducking, màn kết); còn lại giữ nguyên đường dựng cũ.
export const Video: React.FC<Props> = (props) => <VideoCu {...props} />;

const la4Tang = (p: Props) => p.boCuc === '4tang' && !!p.khung4tang;

// v95: danh sách SFX của khung 4 tầng (tất định từ props): mốc gần nhau < 0,3 s chỉ giữ tiếng ưu tiên cao hơn
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
  // v96: sân khấu 2D — thẻ bay vào khay (whoosh), dấu ✓/✕ kiểm chứng (pop), chốt kết quả (ding)
  for (const ph of k.sanKhau?.pha || []) {
    if (['thu', 'doi', 'ket'].includes(ph.ten) && ph.chon) ds.push({t: ph.t + 0.15, tep: 'whoosh', vol: 0.15, dai: 0.6, uu: 2});
    if (['thu', 'doi'].includes(ph.ten) && ph.bt) ds.push({t: ph.t + 1.25, tep: 'pop', vol: 0.2, dai: 0.3, uu: 1});
    if (ph.ten === 'ket') ds.push({t: ph.t + 1.6, tep: 'ding', vol: 0.22, dai: 0.95, uu: 3});
  }
  // v97: hình không gian — whoosh nhẹ mỗi cú xoay camera, whoosh bung mặt cắt
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

// Nội dung luồng 4 tầng: mốc `t` trong khung4tang tính bằng giây kể từ đầu phần nội dung (sau intro), do chuanbi.py đổi từ `khi_noi`.
// v99.5: Outro vào mượt 9 khung (scale 0.96 -> 1, trượt lên, mờ -> rõ); chỉ là hiệu ứng hình BÊN TRONG Sequence có sẵn, không đổi from/durationInFrames
const VaoMuot: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  const v = spring({frame: f, fps: 30, durationInFrames: 9, config: {damping: 16, stiffness: 150, mass: 0.7}});
  const u = Math.min(1, v);
  return <AbsoluteFill style={{opacity: 1 /* v102: độ đậm do OutroTomTat nối từ 35 % (khung cuối Khung4Tang), không nhân đôi -> hết nháy đen */, transform: `translateY(${(1 - u) * 16}px) scale(${0.96 + 0.04 * u})`, transformOrigin: '50% 50%'}}>{children}</AbsoluteFill>;
};

const NoiDung4Tang: React.FC<Props & {coIntro?: boolean}> = (props) => {
  const {canh, tongFrame, fps, nhac, thuongHieu, outro} = props;
  const k = props.khung4tang!;
  const batBuocMinhHoa = props.mon === 'THUC_TE' && props.kieu_video !== 'DAI_10_PHUT' && !/-10P$/i.test(props.id);
  const amNhac = React.useMemo(() => taoAmLuongNhac(props), [canh, tongFrame, fps, props.amLuongNhac]);
  const ketThuc = outro ? outro.batDau : tongFrame;
  // phụ đề gọn: câu của từng cảnh đổi sang giây toàn phần nội dung
  const cau = React.useMemo(() => canh.flatMap((c) => c.cau.map((x) => ({text: x.text, bat: c.batDau / fps + x.bat, ket: c.batDau / fps + x.ket}))), [canh, fps]);
  // v93: màn kết "tóm tắt 3 bước" (giữ mô hình 3D ở trạng thái cuối); không có tomTat -> màn kết v92
  const tomTat = k.tomTat && k.tomTat.length ? k.tomTat : null;
  const canhCuoi = React.useMemo(() => (tomTat ? chuanHoaCanh3DV(k.canh3dv, [...(k.buoc || [])].map((b) => b.t).sort((x, y) => x - y), Math.max(1, ketThuc) / fps).canh : null), [tomTat, k.canh3dv, k.buoc, ketThuc, fps]);
  const sfx = React.useMemo(() => suKienSfx4Tang(k, Math.max(1, ketThuc) / fps), [k, ketThuc, fps]);
  return (
    <AbsoluteFill style={{fontFamily: FONT, background: '#0E1014'}}>
      <Sequence from={0} durationInFrames={Math.max(1, ketThuc)}>
        <Khung4Tang {...k} batBuocMinhHoa={batBuocMinhHoa} fps={fps} tongFrame={Math.max(1, ketThuc)} thuongHieu={k.thuongHieu ?? thuongHieu?.ten} cau={k.boCuc?.phuDe === 'gon' ? cau : k.cau} />
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
      {/* v95: SFX tinh tế theo sự kiện (~ -14..-12 dB so với giọng): pop thẻ mới, whoosh đổi bước / gập hộp, ding chốt cực trị, chime thẻ đáp án */}
      {sfx.map((e, i) => (
        <Sequence key={`sfx4t${i}`} from={Math.max(0, Math.round(e.t * fps))} durationInFrames={Math.round(e.dai * fps)} layout="none">
          <Audio src={staticFile(`sfx/${e.tep}.wav`)} volume={e.vol} />
        </Sequence>
      ))}
      {outro ? (
        <Sequence from={outro.batDau} durationInFrames={outro.soFrame}>
          <VaoMuot>
          {outro.loai === 'tu_tao' && tomTat ? (
            <OutroTomTat giuHinh={batBuocMinhHoa} dapAn={props.dapAn} tomTat={tomTat} canh={k.tuSinh || k.sanKhau || k.khongGian ? null : canhCuoi} sanKhau={k.tuSinh?.lop?.length ? null : k.sanKhau || null} khongGian={k.khongGian || null} tCuoi={Math.max(1, ketThuc) / fps} thuongHieu={k.thuongHieu ?? thuongHieu?.ten} cta={k.cta} tuSinh={k.tuSinh || null} theme={k.theme} />
          ) : outro.loai === 'tu_tao' ? <ManKetChuyenNghiep th={thuongHieu} baiHoc={props.baiHoc || []} dapAn={props.dapAn} tiepTheo={props.tiepTheo || ''} /> : <ManKet tep={outro.tep} loai={outro.loai} />}
          </VaoMuot>
        </Sequence>
      ) : null}
      {props.kiemDuyet ? <KiemDuyet kiemT2={batBuocMinhHoa} /> : null}
    </AbsoluteFill>
  );
};

const VideoCu: React.FC<Props> = (props) => {
  if (props.anhBiaDau) {
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <Sequence from={0} durationInFrames={1}>
          <Img src={staticFile(props.anhBiaDau)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Sequence>
        <Sequence from={1}>
          <VoiIntro {...props} anhBiaDau={null} tongFrame={props.tongFrame - 1} />
        </Sequence>
      </AbsoluteFill>
    );
  }
  return <VoiIntro {...props} />;
};

// Intro thương hiệu (nếu có) chạy trước; nội dung lùi intro.lech khung và lộ ra qua mặt nạ tròn trong intro.chuyen khung cuối.
const VoiIntro: React.FC<Props> = (props) => {
  const it = props.intro;
  const lech = lechIntro(it);
  if (!it || !lech || !props.thuongHieu) return <NoiDungVideo {...props} intro={null} />;
  return (
    <AbsoluteFill style={{background: it.mauNen || '#071513'}}>
      <Sequence from={lech}>
        <NoiDungVideo {...props} intro={null} coIntro tongFrame={props.tongFrame - lech} />
      </Sequence>
      <Sequence from={0} durationInFrames={it.soFrame}>
        <Intro it={it} th={props.thuongHieu} goiY={[props.tieuDe, props.chuDe, props.deGoc, props.khung4tang?.sanKhau?.loai].filter(Boolean).join(' ')} />
      </Sequence>
    </AbsoluteFill>
  );
};

const NoiDungVideo: React.FC<Props & {coIntro?: boolean}> = (props) =>
  la4Tang(props) ? <NoiDung4Tang {...props} /> : props.boCuc === 'hinh_phang' && props.manimLop !== false ? <NoiDungHinhPhang {...props} /> : <NoiDungCu {...props} />;

// v94: hình phẳng chuẩn - Manim (scripts/manim/HinhPhangChuan.py) vẽ TOÀN BỘ phần nhìn (header, đề, hình, trang chứng minh)
// thành lớp trong suốt ghép đè sau; Remotion chỉ giữ nền #121214 + giọng từng cảnh + nhạc + tiếng hiệu ứng + màn kết.
// Không tiêu đề / thanh bước / phụ đề của vỏ cũ để không đè lên header và trang chứng minh của Manim.
const NoiDungHinhPhang: React.FC<Props & {coIntro?: boolean}> = (props) => {
  const {canh, tongFrame, fps, nhac, thuongHieu, outro} = props;
  const amNhac = React.useMemo(() => taoAmLuongNhac(props), [canh, tongFrame, fps, props.amLuongNhac]);
  return (
    <AbsoluteFill style={{fontFamily: FONT, backgroundColor: '#0a1725', backgroundImage: 'linear-gradient(#adcde30d 1px,transparent 1px),linear-gradient(90deg,#adcde30d 1px,transparent 1px),radial-gradient(ellipse at 50% 35%,#17364a,#0a1725 74%)', backgroundSize: '56px 56px,56px 56px,100% 100%'}}>
      <div style={{position: 'absolute', top: '10.8%', left: '4%', right: '4%', height: '7.5%', borderRadius: 20, border: '1px solid #41647c', background: '#102332bb'}}>
        <span style={{position: 'absolute', top: -13, left: 24, padding: '0 10px', background: '#12283a', color: '#a5dded', fontSize: 20, fontWeight: 700}}>Đề bài</span>
      </div>
      <div style={{position: 'absolute', inset: '55% 3% 12%', borderRadius: 24, border: '1px solid #48718a', background: '#102332bb'}} />
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
          <Audio src={staticFile(e.kieu === 'khung' ? 'sfx/ting.wav' : 'sfx/click.wav')} volume={e.kieu === 'khung' ? 0.4 : 0.1} />
        </Sequence>
      ))}
      {outro ? (
        <Sequence from={outro.batDau} durationInFrames={outro.soFrame}>
          {outro.loai === 'tu_tao' ? <ManKetChuyenNghiep th={thuongHieu} baiHoc={props.baiHoc || []} dapAn={props.ketQuaHinhPhang?.tex ?? props.dapAn} nhanHinh={props.ketQuaHinhPhang?.nhan} tiepTheo={props.tiepTheo || ''} /> : <ManKet tep={outro.tep} loai={outro.loai} />}
        </Sequence>
      ) : null}
      {props.kiemDuyet ? <KiemDuyet /> : null}
    </AbsoluteFill>
  );
};

const NoiDungCu: React.FC<Props & {coIntro?: boolean}> = (props) => {
  const {canh, tongFrame, fps, nhac, lop, tieuDe, nen, phongCach, hookChu, hookKieu, nhanManh, thuongHieu, outro} = props;
  Object.assign(MAU, MAU_GOC, phongCach.mau || {}); // đặt lại bảng màu gốc rồi ghi đè theo phong_cach.json
  GIAO_DIEN.kieuToan = phongCach.kieuToan || 'dam';
  GIAO_DIEN.kieuHinh = phongCach.kieuHinh || 'manim';
  // bộ hiệu ứng mới: một màu nhấn cho cả video = màu loại câu hỏi (đúng màu trên ảnh bìa)
  GIAO_DIEN.chuyenDong = phongCach.chuyenDong === 'moi' ? 'moi' : 'cu';
  GIAO_DIEN.nhan = MAU_LOAI[(props.bia && props.bia.loai) || ''] || '#3BF2D0';
  GIAO_DIEN.manimLop = !!props.manimLop;   // bài hình học: phần hình + công thức do Manim dựng, ghép đè sau
  const moi = GIAO_DIEN.chuyenDong === 'moi';
  const amNhac = React.useMemo(() => taoAmLuongNhac(props), [canh, tongFrame, fps, props.amLuongNhac]);
  const dsSanKhau = React.useMemo(() => canh.map((_, i) => sanKhauCuaCanh(canh, i)), [canh]);
  const ketThuc = outro ? outro.batDau : tongFrame;
  // quy trình cố định: luôn đủ 6 phần theo đúng thứ tự (người xem biết bài đang ở bước nào)
  const dsPha = SAU_PHA;
  // cảnh trước còn ở lại 8 khung hình để hòa vào cảnh sau (trừ khi cảnh sau diễn tiếp trên cùng sân khấu)
  const keoDai = (i: number) => {
    const next = canh[i + 1];
    if (!next || next.giuSanKhau || next.moiTruong || (next.chuoi3D?.nenDung && next.phaMinhHoa !== 'toan')) return 0;
    return 8;
  };
  // bài thực tế / xác suất có cảnh 3D (Blender hoặc Three.js) -> phần giải dùng nền tối chiều sâu
  const laThucTe = !props.manimLop && canh.some((c) => c.phaMinhHoa || c.moiTruong);
  const nenBlender = canh[0]?.phaMinhHoa && canh[0]?.chuoi3D?.nenDung;
  // nền Blender chỉ sống ở phần mở đầu; tới cảnh 'chuyen' nó nhòe + tối dần rồi nhường nền đồ họa của phần giải
  const iChuyen = canh.findIndex((c) => c.phaMinhHoa === 'chuyen');
  const tatNen = iChuyen >= 0 ? canh[iChuyen].batDau : canh.find((c) => c.phaMinhHoa === 'toan')?.batDau ?? tongFrame;
  const coThuongHieu = !!thuongHieu && !!(thuongHieu.ten || thuongHieu.logo || thuongHieu.handle);
  return (
    <BoiCanh.Provider value={props.phongCanh}><AbsoluteFill style={{fontFamily: FONT}}>
      <KieuToan kieu={phongCach.kieuToan || 'dam'} />
      {/* chữ xuống dòng CÂN BẰNG (các dòng dài gần bằng nhau, không còn một chữ lẻ loi ở dòng dưới), tránh ngắt ở cụm ngắn */}
      <style>{'div, span { text-wrap: balance; } .katex, .katex * { text-wrap: nowrap; }'}</style>
      <NapPhongToan />
      {/* nền tự tạo riêng cho từng video (mặc định); chỉ dùng nền ảnh của bạn khi đặt DUNG_NEN_DRIVE=1 */}
      {/* luồng Thực tế & Xác suất: nền tối có chiều sâu (không còn ảnh phối cảnh tĩnh của phong_canh giữ suốt bài) */}
      {props.phongCanh || laThucTe ? <NenChieuSau canh={canh} /> : props.nenTuTao ? <NenTuTao cfg={props.nenTuTao} nhan={GIAO_DIEN.nhan} /> : <Nen nen={nen} dsNen={props.dsNen} canh={canh} pc={phongCach} tongFrame={tongFrame} />}
      {nenBlender ? <Sequence from={0} durationInFrames={tatNen + 45} layout="none"><NenBlender src={nenBlender} tat={tatNen} /></Sequence> : null}
      {!props.phongCanh && !laThucTe && moi && (!props.nenTuTao || props.nenTuTao.kieu === 'luoi') ? <LuoiSan mau={GIAO_DIEN.nhan} /> : null}
      {nhac ? <Audio src={staticFile(nhac)} loop volume={amNhac} /> : null}
      {canh.map((c, i) => (
        <Sequence key={c.so} from={c.batDau} durationInFrames={c.soFrame + keoDai(i)}>
          <Canh truoc={canh[i-1]} deGoc={props.deGoc} canh={c} tieuDe={tieuDe} deBai={props.deBai || null} theDeGiu={canh.slice(0, i).some((x) => x.loai === 'de_bai')} coQuangCaoCuoi={!!(props.quangCao && props.quangCao.ten && c.batDau + c.soFrame > ketThuc - 135)} tongCanh={canh.length} hook={{chu: hookChu, kieu: hookKieu, nhanManh}} pc={phongCach}
            sanKhau={dsSanKhau[i]} cacBuoc={dsPha} phaTruoc={i > 0 ? phaCua(canh[i - 1].loai) : ''} giuTruoc={i > 0 && c.giuSanKhau && !!dsSanKhau[i - 1]} giuSau={!!canh[i + 1] && canh[i + 1].giuSanKhau && !!dsSanKhau[i]} keoDai={keoDai(i)} />
        </Sequence>
      ))}
      {/* chuyển cảnh motion graphic ở chỗ nối các cảnh (trừ cảnh nối tiếp sân khấu) */}
      {/* lớp quét chỉ ở khoảnh khắc kịch tính (sang cái bẫy / đáp án); các chỗ nối khác hòa mờ tự nhiên.
          phong_cach.json "lopQuet": "luon" để quét ở mọi chỗ nối như bản cũ, false để tắt hẳn. */}
      {(phongCach.lopQuet === true || phongCach.lopQuet === 'luon')
        ? canh.map((c, i) =>
            i > 0 && !c.giuSanKhau && (phongCach.lopQuet === 'luon' || (/dap_an|ket_qua|bay/i.test(c.loai) && phaCua(c.loai) !== phaCua(canh[i - 1].loai))) ? (
              <Sequence key={`quet${c.so}`} from={c.batDau - 7} durationInFrames={16} layout="none">
                <LopQuet kieu={/dap_an|ket_qua|bay/i.test(c.loai) ? 'vong' : 'cheo'} />
              </Sequence>
            ) : null
          )
        : null}
      {/* bài hình học dựng bằng Manim: tiếng "tách" khi Manim hiện dòng công thức, "ting" khi đóng khung kết quả */}
      {props.manimLop && props.suKienManim
        ? props.suKienManim.slice(0, 80).map((e, i) => (
            <Sequence key={`sfxm${i}`} from={Math.max(0, e.f)} durationInFrames={e.kieu === 'khung' ? 70 : 20} layout="none">
              <Audio src={staticFile(e.kieu === 'khung' ? 'sfx/ting.wav' : 'sfx/click.wav')} volume={e.kieu === 'khung' ? 0.4 : 0.1} />
            </Sequence>
          ))
        : null}
      {/* tiếng "vút lên" dồn nén ngay trước cảnh đáp án */}
      {canh.map((c) =>
        /dap_an|ket_qua/i.test(c.loai) && c.batDau > 40 ? (
          <Sequence key={`riser${c.so}`} from={c.batDau - 36} durationInFrames={40} layout="none">
            <Audio src={staticFile('sfx/riser.wav')} volume={0.2} />
          </Sequence>
        ) : null
      )}
      {hookChu ? (
        <Sequence from={0} durationInFrames={24} layout="none">
          <MoDau />
        </Sequence>
      ) : null}
      {hookChu && !props.coIntro ? (
        <Sequence from={0} durationInFrames={8} layout="none">
          <ChopSang />
          <Audio src={staticFile('sfx/sting.wav')} volume={0.55} />
        </Sequence>
      ) : null}
      {props.quangCao && props.quangCao.ten ? <NhanQuangCao qc={props.quangCao} tongFrame={ketThuc} /> : null}
      {/* thẻ dữ kiện tóm tắt (kiểu chip thông số Anh Shiper Toán): chỉ hiện ở phần mô hình hóa / phân tích đầu bài, không lặp suốt cả video */}
      {props.duKien && props.duKien.length && canh.length > 3 ? (() => {
        const iTu = canh.findIndex((c, i) => i > 0 && !/mo_dau|hook|de_bai/i.test(c.loai));
        if (iTu < 0) return null;
        const iDen = Math.min(canh.length - 1, iTu + 3);
        return <DuKien ds={props.duKien} tu={canh[iTu].batDau + 6} den={canh[iDen].batDau + canh[iDen].soFrame} hud={moi ? GIAO_DIEN.nhan : undefined} />;
      })() : null}
      {canh.length > 1 ? <DauTrang chu={props.chuDe || tieuDe} lop={lop} tu={canh[1].batDau} lui={coThuongHieu ? 1 : 0} den={ketThuc} th={thuongHieu} tap={props.series ? props.series.tap : 0} nhan={moi ? GIAO_DIEN.nhan : undefined} haXuong={!!phongCach.thanhTienDo} /> : null}
      {/* bộ hiệu ứng mới: đường tiến trình mảnh có chấm thay cho thanh các bước */}
      {moi && canh.length > 2 ? (() => {
        const moc: {pha: string; tu: number; den: number}[] = [];
        canh.forEach((c) => {
          const p = phaCua(c.loai);
          if (!p) return;
          const cuoi = moc[moc.length - 1];
          if (cuoi && cuoi.pha === p) cuoi.den = c.batDau + c.soFrame;
          else moc.push({pha: p, tu: c.batDau, den: c.batDau + c.soFrame});
        });
        return moc.length >= 2 ? <DuongTienTrinh cacPha={dsPha} mocPha={moc} mau={GIAO_DIEN.nhan} tu={canh[1].batDau} den={ketThuc - 6} /> : null;
      })() : null}
      <ThuongHieu th={thuongHieu} canh={canh} ketThuc={ketThuc} tuDau={canh.length > 1 ? canh[1].batDau : 1e9} boLoiMoi={phongCach.loiMoiGiuaVideo !== true} anDau={!!props.coIntro} />
      {phongCach.thanhTienDo ? <ThanhTienDo tongFrame={tongFrame} lop={lop} mon={props.bia?.loai}
        moc={la4Tang(props) && props.khung4tang?.buoc?.length ? props.khung4tang.buoc.map((b) => Math.round(b.t * fps)) : canh.map((c) => c.batDau)} /> : null}
      {outro ? (
        <Sequence from={outro.batDau} durationInFrames={outro.soFrame}>
          {outro.loai === 'tu_tao' ? <ManKetChuyenNghiep th={thuongHieu} baiHoc={props.baiHoc || []} dapAn={props.dapAn} tiepTheo={props.tiepTheo || ''} /> : <ManKet tep={outro.tep} loai={outro.loai} />}
        </Sequence>
      ) : null}
      {props.kiemDuyet ? <KiemDuyet /> : null}
    </AbsoluteFill></BoiCanh.Provider>
  );
};
