// v90 — KHUNG 4 TẦNG CỐ ĐỊNH: T1 nhãn bước + tiêu đề | T2 sân khấu 3D Vector sống | T3 thẻ giải | T4 thanh ghim ĐỀ.
// Mỗi tầng là một vùng cứng (overflow hidden, data-vung cho kiem_duyet.mjs) nên không thành phần nào lấn sang tầng khác.
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {KieuToan, NapPhongToan} from '../Toan';
import {SanKhau3DVector} from '../3d-vector/SanKhau3DVector';
import {chuanHoaCanh3DV} from '../3d-vector/dac_ta';
import {MAU_3DV} from '../3d-vector/kieu';
import {NenTramToanHoc} from './NenTramToanHoc';
import {NenKhiQuyen} from './NenKhiQuyen';
import {layTheme, xungNhip} from './nen_v99';
import {SanKhauTuSinh} from '../sankhau2d/SanKhauTuSinh';
import {TangTieuDe} from './TangTieuDe';
import {TangTheGiai} from './TangTheGiai';
import {ThanhDe} from './ThanhDe';
import {boCuc4Tang, LE_ND, RONG_ND, Vung} from './vung';
import {BuocGiai, Khung4TangVao, MocCau} from './kieu';
import {TEN_KENH} from '../ThuongHieu';
import {docDoiChieu} from './doi_chieu';
import {DoiChieu2Cot} from './DoiChieu';
import {giayIntro, INTRO_SAN, IntroMocCau, raIntro} from './IntroMocCau';
import {emRa, kep01} from '../3d-vector/toan3d';
import {SanKhau2D} from '../sankhau2d/SanKhau2D';
import {SanKhauKhongGian} from '../khonggian/SanKhauKhongGian';
import {KhoiCongThuc, TieuDeMotDong, VUNG_TOI_GIAN} from './ToiGianKhongGian';
import {mauBuocV981} from './mau_v981';

const mauBuoc = (b: BuocGiai) => MAU_3DV[b.mau || 'cyan'] || MAU_3DV.cyan;

// v95: PHỤ ĐỀ GỌN 1 DÒNG (mặc định bật) trong dải 52 px giữa T3 và thanh ĐỀ (trên vùng an toàn 14 % đáy, không đè thanh đáy).
// Cỡ chữ tự co để luôn 1 dòng; cụm từ khóa (số, biến, thuật ngữ tối ưu) tô màu nhấn của bước.
const TU_KHOA = /^(\d[\d.,]*|[a-zA-Z]|thể|tích|đạo|hàm|cực|đại|tiểu|lớn|nhỏ|nhất|đổi|dấu|nghiệm|cắt|gập|đáy|cạnh|chiều|cao|xăng-ti-mét|khối)$/i;
// v97: câu dài (lời hình không gian ~70 ký tự) chia thành các đoạn <= ~40 ký tự theo ranh giới từ, thời lượng tỉ lệ số ký tự
// -> phụ đề LUÔN 1 dòng (trước đây chữ co tới 28 px rồi vẫn tràn / xuống dòng vì span kế thừa text-wrap: balance)
export const chiaCauPhuDe = (c: {text: string; bat: number; ket: number}, toiDa = 40): {text: string; bat: number; ket: number}[] => {
  const chu = c.text.replace(/\s+/g, ' ').trim();
  if (chu.length <= toiDa + 2) return [c];
  const n = Math.ceil(chu.length / toiDa), muc = chu.length / n;
  const tu = chu.split(' ');
  const doan: string[] = [];
  let cur = '';
  for (const w of tu) {
    const thu = cur ? cur + ' ' + w : w;
    if (cur && thu.length > muc + 6 && doan.length < n - 1) { doan.push(cur); cur = w; } else cur = thu;
  }
  if (cur) doan.push(cur);
  const tong = doan.reduce((s, d) => s + d.length, 0);
  let t = c.bat;
  return doan.map((d) => {
    const dt = ((c.ket - c.bat) * d.length) / tong;
    const ra = {text: d, bat: t, ket: t + dt};
    t += dt;
    return ra;
  });
};

const PhuDeMotDong: React.FC<{cau: {text: string; bat: number; ket: number}; t: number; y: number; mau: string}> = ({cau, t, y, mau}) => {
  const chu = cau.text.replace(/\s+/g, ' ').trim();
  // v96: chữ to hơn (tới 42 px) + viền tối 4 hướng để đọc rõ trên điện thoại nhỏ; vẫn 1 dòng trong khung an toàn
  // v97: bề rộng trung bình Be Vietnam đậm 800 ~ 0,6 x cỡ chữ (0,52 cũ làm câu ~38 ký tự bị cắt chữ cuối ở 42 px)
  const co = Math.max(28, Math.min(42, Math.floor((RONG_ND - 40) / (Math.max(1, chu.length) * 0.6))));
  const a = kep01((t - cau.bat) / 0.15) * (1 - kep01((t - (cau.ket - 0.1)) / 0.12));
  return (
    <div data-vung="phu_de" style={{position: 'absolute', left: LE_ND, width: RONG_ND, top: y, height: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: a}}>
      <div style={{maxWidth: RONG_ND, padding: '2px 18px 4px', borderRadius: 14, background: 'rgba(8,10,14,0.80)', border: '1px solid rgba(255,255,255,0.08)',
        fontFamily: FONT, fontWeight: 800, fontSize: co, lineHeight: 1.16, color: '#FFFFFF', whiteSpace: 'nowrap', textWrap: 'nowrap' as React.CSSProperties['textWrap'], overflow: 'visible',
        textShadow: '0 2px 0 #000, 0 -1px 0 #000, 1.5px 0 0 #000, -1.5px 0 0 #000, 0 0 8px rgba(0,0,0,0.85)'}}>
        {(() => {
          // Karaoke: nội suy theo tỷ lệ số ký tự giữa bat..ket; từ đang đọc sáng vàng nhạt (đổi màu + bóng, không đổi cỡ/đậm)
          const p = kep01((t - cau.bat) / Math.max(0.2, cau.ket - cau.bat));
          const tong = Math.max(1, chu.length);
          let da = 0;
          return chu.split(' ').map((w, k) => {
            const dau = da / tong;
            da += w.length + 1;
            const cuoi = Math.min(1, da / tong);
            const dang = p >= dau && p < cuoi;
            const kk = TU_KHOA.test(w.replace(/[,.!?;:]/g, ''));
            return (
              <span key={k} style={{whiteSpace: 'pre', textWrap: 'nowrap' as React.CSSProperties['textWrap'], fontWeight: 800,
                color: dang ? '#FFE97A' : kk ? mau : '#FFFFFF',
                ...(dang ? {textShadow: '0 2px 0 #000, 0 -1px 0 #000, 1.5px 0 0 #000, -1.5px 0 0 #000, 0 0 10px rgba(255,233,122,0.55)'} : {})}}>{(k ? ' ' : '') + w}</span>
            );
          });
        })()}
      </div>
    </div>
  );
};

// v98: mỗi tầng đặt ĐỐI XỨNG: left bc.le (130), rộng bc.rong (820) -> tâm 540; vẫn tránh cột nút Tim/Bình luận/Lưu (phải 12 %)
const Tang: React.FC<{ten: string; v: Vung; rong?: number; le?: number; co?: number; children: React.ReactNode}> = ({ten, v, rong = 1080, le = 0, co = 1, children}) => (
  <div data-vung={ten} style={{position: 'absolute', left: le, width: rong, top: v.y, height: v.h, overflow: 'visible', ...(co !== 1 ? {transform: `scale(${co})`, transformOrigin: 'center center'} : {})}}>
    {children}
  </div>
);

// v99.1: xung nhịp chống đứng hình ở T2 (mỗi câu thoại trong khoảng > 6 s không đổi hình): một vệt sáng mảnh quét ngang
// + khung góc sáng lên rồi tắt trong 0,9 s - nhìn thấy được nhưng không che hình (mix-blend screen, độ đục <= 0,22)
const XungT2: React.FC<{u: number; rong: number; cao: number; mau: string}> = ({u, rong, cao, mau}) => {
  const a = Math.sin(Math.PI * u);
  return (
    <div data-xung-t2 style={{position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen'}}>
      <div style={{position: 'absolute', top: 0, bottom: 0, left: -160 + u * (rong + 320), width: 160, opacity: 0.22 * a,
        background: `linear-gradient(90deg, transparent, ${mau}, transparent)`}} />
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], k) => (
        <div key={k} style={{position: 'absolute', width: 34, height: 34, opacity: 0.55 * a, left: x ? rong - 46 : 12, top: y ? cao - 46 : 12,
          borderColor: mau, borderStyle: 'solid', borderWidth: `${y ? 0 : 2}px ${x ? 2 : 0}px ${y ? 2 : 0}px ${x ? 0 : 2}px`}} />
      ))}
    </div>
  );
};

export const Khung4Tang: React.FC<Khung4TangVao> = (p) => {
  const f = useCurrentFrame();
  const fps = p.fps || 30;
  const t = f / fps;
  // v97: hình KHÔNG GIAN -> bố cục tối giản (T1 một dòng, T2 tràn viền 16-62 %, T3 một khối công thức, ẩn thanh ĐỀ)
  const toiGian = !!p.khongGian;
  const bc0 = boCuc4Tang(p.boCuc?.anToanTikTok !== false);
  const bc = toiGian ? {...bc0, t1: VUNG_TOI_GIAN.t1, t2: VUNG_TOI_GIAN.t2, t3: VUNG_TOI_GIAN.t3} : bc0;
  const buoc = useMemo(() => [...(p.buoc || [])].sort((a, b) => a.t - b.t), [p.buoc]);
  // v92: khuôn tham số trải pha theo mốc các bước giải (mỗi bước có hình đổi); tongFrame = hết phần nội dung (sát Outro)
  const canh = useMemo(() => chuanHoaCanh3DV(p.canh3dv, buoc.map((b) => b.t), p.tongFrame / fps).canh, [p.canh3dv, buoc, p.tongFrame, fps]);
  // v96: sân khấu 2D (4 mô-đun Xác suất / 2D thực tế / sơ đồ tư duy) thay khuôn 3D khi chuanbi.py định tuyến ra
  const sk2 = p.tuSinh ? null : p.sanKhau || null;
  // v99.1: sân khấu tự sinh 2.5D (mã Python hộp cát) thắng sân khấu 2D / khuôn 3D; nền khí quyển theo theme; xung chống đứng hình
  const ts = !p.khongGian && p.tuSinh && p.tuSinh.lop?.length ? p.tuSinh : null;
  const th = !p.khongGian ? layTheme(p.theme) : null;
  // v97: hình học không gian (động cơ riêng src/khonggian: nét khuất giải tích từng khung + đạo diễn camera theo moc_xoay)
  const kg = p.khongGian || null;
  let i = -1;
  buoc.forEach((b, j) => b.t <= t && (i = j));
  if (i < 0 && buoc.length) i = 0;
  // v98.1: luồng 2D / Xác suất / Đại số / khuôn 3D -> tối đa 2 màu nhấn (cyan | hổ phách); hình không gian giữ màu bước v97
  const mauB = toiGian ? mauBuoc : mauBuocV981;
  const mauNhan = i >= 0 ? mauB(buoc[i]) : MAU_3DV.cyan;
  const tong = p.tongFrame / fps;
  // v93: Intro móc câu phủ G giây đầu; sân khấu 3D nằm giữa màn hình (zoom-out + xoay mở) rồi trượt về T2, các tầng khác vào sau
  // Không để mất Intro: kịch bản thiếu `mocCau` (vd. bài xác suất 12 thẻ) -> dựng Intro dự phòng từ bước 1 + câu thoại đầu
  const mocCau = useMemo<MocCau | null>(() => {
    if (p.mocCau || p.khongGian) return p.mocCau || null;
    const tieu = (buoc[0]?.tieu_de || '').replace(/\s+/g, ' ').trim();
    const hook = ((p.cau || [])[0]?.text || '').replace(/\s+/g, ' ').trim();
    return {nhan_thi: 'BÀI TOÁN HAY', tieu_de: tieu || 'Bài toán hôm nay', phu_de: TEN_KENH, cau_hook: hook || 'Bạn giải được không?', cta: 'Lưu bài để ôn'};
  }, [p.mocCau, p.khongGian, p.cau, buoc]);
  const G = giayIntro(mocCau, tong);
  const ra = raIntro(t, G);
  // v99.5: chuyển hồi mượt (CHỈ hiệu ứng hình trong khung có sẵn, không đổi mốc): Intro -> Thân bài = lò xo 10 khung (scale 0.96 -> 1 + trượt lên);
  // Thân bài -> Outro = 9 khung cuối thu nhẹ (scale 1 -> 0.97, trượt lên, mờ bớt) để Outro (tự vào mượt ở Video.tsx) tiếp nối.
  const khungG = Math.round(G * fps);
  const vaoThan = G > 0 ? spring({frame: Math.max(0, f - khungG + 3), fps, durationInFrames: 10, config: {damping: 16, stiffness: 150, mass: 0.7}}) : 1;
  const thoat = Math.min(1, Math.max(0, (f - (p.tongFrame - 9)) / 9));
  const thoatE = thoat * thoat * (3 - 2 * thoat);
  const chuyenHoi: React.CSSProperties = {
    transform: `translateY(${(1 - Math.min(1, vaoThan)) * 16 - 10 * thoatE}px) scale(${(0.96 + 0.04 * Math.min(1, vaoThan)) * (1 - 0.03 * thoatE)})`,
    transformOrigin: '50% 50%', opacity: ra * (1 - 0.65 * thoatE),
  };
  const lechMay = G > 0 && t < G ? {k: 1 + 0.35 * (1 - emRa(t / 1.6)), n: 32 * (1 - emRa(t / 2.2))} : undefined;
  // v97 tối giản: trong Intro sân khấu cao 883 px thu về đúng ô INTRO_SAN (scale 648/883, neo tâm) rồi giãn ra khi trượt về T2
  const yT2 = G > 0 ? (toiGian ? bc.t2.y + (INTRO_SAN.y + INTRO_SAN.h / 2 - bc.t2.h / 2 - bc.t2.y) * (1 - ra) : bc.t2.y + (INTRO_SAN.y - bc.t2.y) * (1 - ra)) : bc.t2.y;
  const coT2 = toiGian && G > 0 ? INTRO_SAN.h / bc.t2.h + (1 - INTRO_SAN.h / bc.t2.h) * ra : 1;
  // v93: đối chiếu Hình động ↔ Đồ thị (đã kiểm hợp lệ; sai -> null -> giữ sân khấu 3D chuẩn)
  const dsDoiChieu = useMemo(() => buoc.map((b) => (b.doi_chieu ? docDoiChieu(b.doi_chieu) : null)), [buoc]);
  const dc = i >= 0 ? dsDoiChieu[i] : null;
  const tDau = i >= 0 ? buoc[i].t : 0, tCuoi = i >= 0 && i + 1 < buoc.length ? buoc[i + 1].t : tong;
  const aDc = dc ? kep01((t - tDau) / 0.6) * (1 - kep01((t - (tCuoi - 0.6)) / 0.6)) : 0;
  // v95: chuyển cảnh SẠCH: sân khấu 3D tan hết trong nửa đầu rồi cảnh 2 cột mới hiện (không còn hình 3D đè mờ lên đồ thị)
  const a3D = 1 - kep01(aDc * 2), aDc2 = kep01(aDc * 2 - 1);
  const dcVao = i >= 0 ? buoc[i].doi_chieu : undefined;
  const dtGiai = dcVao && typeof dcVao.t_giai === 'number' ? dcVao.t_giai - tDau : undefined;
  // v95: Intro xem trước trạng thái ĐÃ ĐÁNH DẤU 4 góc cắt / nét gập (tò mò) thay cho tấm bìa trơn
  const tXemTruoc = useMemo(() => {
    if (!canh || !canh.doiTuong.some((d) => d.id === 'goc1')) return null;
    const b = canh.buoc.find((x) => x.hien.includes('goc1'));
    return b ? b.t + 1.5 : null;
  }, [canh]);
  const t3d = G > 0 && t < G - 0.6 && tXemTruoc !== null ? tXemTruoc + 0.05 * t : t;
  const gon = p.boCuc?.phuDe === 'gon';
  const dsCau = useMemo(() => (p.cau || []).flatMap((c) => chiaCauPhuDe(c)), [p.cau]);
  const cauNay = gon ? dsCau.find((c) => t >= c.bat && t < c.ket) : undefined;
  // v92: phụ đề MẶC ĐỊNH TẮT (chỉ bật khi boCuc.phuDe === 'gon'); phụ đề gọn có dải riêng 56 px lấy từ đáy T3 (không chồng lên thẻ giải)
  const t3: Vung = gon && !toiGian ? {y: bc.t3.y, h: bc.t3.h - 56} : bc.t3;
  const xung = xungNhip(t, p.nhipT2);

  // SFX dịu (tạo bằng scripts/tao_sfx.py): whoosh đầu bước 2+, pop khi thẻ hiện (lệch whoosh >= 4 frame), ding khi ô ĐỀ đổi đáp số
  const sfx = useMemo(() => {
    const fr = (s: number) => Math.max(0, Math.round(s * fps));
    const ds: {k: string; from: number; v: number; dai: number}[] = [];
    const tWhoosh = new Set<number>();
    buoc.forEach((b, j) => {
      if (j > 0) { const f = fr(b.t); tWhoosh.add(f); ds.push({k: `w${j}`, from: f, v: 0.12, dai: 8}); }
    });
    buoc.forEach((b, j) => (b.the || []).forEach((th, q) => {
      let f = fr(typeof th.t === 'number' ? th.t : b.t + 0.25);
      while ([...tWhoosh].some((w) => Math.abs(w - f) < 4)) f += 4;
      ds.push({k: `p${j}_${q}`, from: f, v: 0.10, dai: 4});
    }));
    const tDing = new Set<number>();
    (p.deGhim || []).forEach((g, j) => {
      if (g.doi && typeof g.doi.t === 'number') tDing.add(fr(g.doi.t));
    });
    [...tDing].forEach((f, j) => ds.push({k: `d${j}`, from: f, v: 0.16, dai: 12}));
    return ds;
  }, [buoc, p.deGhim, fps]);

  return (
    <AbsoluteFill className="k4t" style={{fontFamily: FONT, background: '#0E1014'}}>
      <KieuToan />
      {sfx.map((s) => (
        <Sequence key={s.k} from={s.from} durationInFrames={s.dai * 4} layout="none">
          <Audio src={staticFile(`sfx/${s.k[0] === 'w' ? 'whoosh' : s.k[0] === 'p' ? 'pop' : 'ding'}.wav`)} volume={s.v} />
        </Sequence>
      ))}
      {/* bù nghiêng (italic correction) của KaTeX đo theo phông KaTeX, không hợp với Be Vietnam nghiêng -> "V  =" hở thừa */}
      <style>{'div, span { text-wrap: balance; } .katex, .katex * { text-wrap: nowrap; } .k4t .katex .mathnormal:not(:has(+ .msupsub)):not(:has(+ .msupsub) *) { margin-right: 0 !important; }'}</style>
      <NapPhongToan />
      {th ? <NenKhiQuyen th={th} t={t} mocBuoc={buoc.map((b) => b.t)} tamSanKhau={bc.t2.y + bc.t2.h / 2} mauNhan={mauNhan} />
        : <NenTramToanHoc t={t} mauNhan={mauNhan} tamSanKhau={bc.t2.y + bc.t2.h / 2} kieu={toiGian ? 'v95' : 'v981'} />}
      {/* v98.1: T2 KHÔNG KHUNG — hình / sơ đồ thở trực tiếp trên nền (bỏ thẻ kính bao T2 của v95) */}
      {p.thuongHieu ? (
        <div data-kd-bo="1" style={{position: 'absolute', top: Math.max(24, bc.t1.y - 58), right: 44, fontFamily: FONT, fontWeight: 800, fontSize: 22, color: 'rgba(230,237,245,0.5)', letterSpacing: 0.4, opacity: ra}}>{p.thuongHieu}</div>
      ) : null}
      <div style={chuyenHoi}>
        <Tang ten="t1" v={bc.t1} rong={bc.rong} le={bc.le}>
          {toiGian ? <TieuDeMotDong buoc={buoc} i={i} t={t} mau={mauBuoc} /> : <TangTieuDe buoc={buoc} i={i} t={t} mau={mauB} />}
        </Tang>
      </div>
      <Tang ten="t2" v={{y: yT2, h: bc.t2.h}} rong={bc.rong} le={bc.le} co={coT2}>
        {sk2 && a3D > 0 ? (
          <div style={{position: 'absolute', inset: 0, opacity: a3D}}>
            <SanKhau2D sk={sk2} t={t} rong={bc.rong} cao={bc.t2.h} yTrenKhung={yT2} mauNhan={mauNhan} intro={G > 0 && t < G} />
          </div>
        ) : null}
        {kg ? (
          <div style={{position: 'absolute', inset: 0}}>
            <SanKhauKhongGian kg={kg} t={t} rong={bc.rong} cao={bc.t2.h} lechMay={G > 0 && t < G ? {k: 1 + 0.22 * (1 - emRa(t / 1.6)), n: 18 * (1 - emRa(t / 2.2))} : undefined} />
          </div>
        ) : null}
        {ts && a3D > 0 ? (
          <div style={{position: 'absolute', inset: 0, opacity: a3D}}>
            <SanKhauTuSinh ts={ts} t={t} fps={fps} rong={bc.rong} cao={bc.t2.h} xung={xung} />
          </div>
        ) : null}
        {!ts && xung >= 0 && !kg ? <XungT2 u={xung} rong={bc.rong} cao={bc.t2.h} mau={mauNhan} /> : null}
        {!kg && !sk2 && !ts && canh && a3D > 0 ? (
          <div style={{position: 'absolute', inset: 0, opacity: a3D}}>
            <SanKhau3DVector canh={canh} t={t3d} rong={bc.rong} cao={bc.t2.h} tongGiay={tong} lechMay={lechMay} />
          </div>
        ) : null}
        {dc && aDc2 > 0 ? <DoiChieu2Cot d={dc} dt={t - tDau} dai={tCuoi - tDau} t={t} rong={bc.rong} cao={bc.t2.h} hienSo={!!buoc[i].doi_chieu?.hien_so} a={aDc2} dtGiai={dtGiai} tHuyHieu={buoc[i].doi_chieu?.t_huy_hieu} /> : null}
      </Tang>
      <div style={chuyenHoi}>
        <Tang ten="t3" v={t3} rong={bc.rong} le={bc.le}>
          {toiGian ? <KhoiCongThuc buoc={buoc} i={i} t={t} mau={mauBuoc} /> : <TangTheGiai buoc={buoc} i={i} t={t} mau={mauB} />}
        </Tang>
        {toiGian ? null : (
          <Tang ten="t4" v={bc.t4} rong={bc.rong} le={bc.le}>
            <ThanhDe ds={p.deGhim || []} buoc={buoc} i={i} t={t} cao={bc.t4.h} />
          </Tang>
        )}
      </div>
      {G > 0 && t < G && mocCau ? <IntroMocCau m={mocCau} t={t} G={G} /> : null}
      {cauNay && ra > 0.5 ? <PhuDeMotDong cau={cauNay} t={t} y={toiGian ? VUNG_TOI_GIAN.phuDe : t3.y + t3.h + 6} mau={mauNhan} /> : null}
    </AbsoluteFill>
  );
};
