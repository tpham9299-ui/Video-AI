import {BoiCanh, NenCauChuyen} from './NenCauChuyen';
import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Canh, sanKhauCuaCanh} from './Canh';
import {LopQuet} from './LopQuet';
import {MoDau} from './MoDau';
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

// Nhạc nền tự giảm âm lượng khi có giọng đọc (ducking) để lời giảng luôn rõ, tăng lên ở các quãng nghỉ.
function taoAmLuongNhac(props: Props) {
  const {canh, tongFrame, fps} = props;
  const goc = props.amLuongNhac ?? 0.16;
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
    const duck = interpolate(gan, [0, 18], [0.42, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const dauCuoi = interpolate(f, [0, 20, tongFrame - 45, tongFrame], [0.5, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return goc * duck * dauCuoi;
  };
}

// Video có ảnh bìa ở khung hình đầu: khung 0 là ảnh bìa, toàn bộ nội dung lùi 1 khung (1/30 giây, mắt không nhận ra).
export const Video: React.FC<Props> = (props) => {
  if (props.anhBiaDau) {
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <Sequence from={0} durationInFrames={1}>
          <Img src={staticFile(props.anhBiaDau)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Sequence>
        <Sequence from={1}>
          <NoiDungVideo {...props} anhBiaDau={null} tongFrame={props.tongFrame - 1} />
        </Sequence>
      </AbsoluteFill>
    );
  }
  return <NoiDungVideo {...props} />;
};

const NoiDungVideo: React.FC<Props> = (props) => {
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
    if (!next || next.giuSanKhau || next.moiTruong || next.chuoi3D?.nenDung) return 0;
    return 8;
  };
  const nenBlender = canh[0]?.phaMinhHoa && canh[0]?.chuoi3D?.nenDung;
  const coThuongHieu = !!thuongHieu && !!(thuongHieu.ten || thuongHieu.logo || thuongHieu.handle);
  return (
    <BoiCanh.Provider value={props.phongCanh}><AbsoluteFill style={{fontFamily: FONT}}>
      <KieuToan kieu={phongCach.kieuToan || 'dam'} />
      {/* chữ xuống dòng CÂN BẰNG (các dòng dài gần bằng nhau, không còn một chữ lẻ loi ở dòng dưới), tránh ngắt ở cụm ngắn */}
      <style>{'div, span { text-wrap: balance; } .katex, .katex * { text-wrap: nowrap; }'}</style>
      <NapPhongToan />
      {/* nền tự tạo riêng cho từng video (mặc định); chỉ dùng nền ảnh của bạn khi đặt DUNG_NEN_DRIVE=1 */}
      {nenBlender ? <AbsoluteFill style={{backgroundColor:"#13202a"}}><Img src={staticFile(nenBlender)} style={{width:"100%",height:"100%",opacity:.52}} /></AbsoluteFill> : props.phongCanh ? <NenCauChuyen set={props.phongCanh} /> : props.nenTuTao ? <NenTuTao cfg={props.nenTuTao} nhan={GIAO_DIEN.nhan} /> : <Nen nen={nen} dsNen={props.dsNen} canh={canh} pc={phongCach} tongFrame={tongFrame} />}
      {!nenBlender && !props.phongCanh && moi && (!props.nenTuTao || props.nenTuTao.kieu === 'luoi') ? <LuoiSan mau={GIAO_DIEN.nhan} /> : null}
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
      {hookChu ? (
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
      <ThuongHieu th={thuongHieu} canh={canh} ketThuc={ketThuc} tuDau={canh.length > 1 ? canh[1].batDau : 1e9} boLoiMoi={phongCach.loiMoiGiuaVideo !== true} />
      {phongCach.thanhTienDo ? <ThanhTienDo tongFrame={tongFrame} lop={lop} mon={props.bia?.loai} /> : null}
      {outro ? (
        <Sequence from={outro.batDau} durationInFrames={outro.soFrame}>
          {outro.loai === 'tu_tao' ? <ManKetChuyenNghiep th={thuongHieu} baiHoc={props.baiHoc || []} dapAn={props.dapAn} tiepTheo={props.tiepTheo || ''} /> : <ManKet tep={outro.tep} loai={outro.loai} />}
        </Sequence>
      ) : null}
      {props.kiemDuyet ? <KiemDuyet /> : null}
    </AbsoluteFill></BoiCanh.Provider>
  );
};
