// v90 — KHUNG 4 TẦNG CỐ ĐỊNH: T1 nhãn bước + tiêu đề | T2 sân khấu 3D Vector sống | T3 thẻ giải | T4 thanh ghim ĐỀ.
// Mỗi tầng là một vùng cứng (overflow hidden, data-vung cho kiem_duyet.mjs) nên không thành phần nào lấn sang tầng khác.
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {KieuToan, NapPhongToan} from '../Toan';
import {SanKhau3DVector} from '../3d-vector/SanKhau3DVector';
import {chuanHoaCanh3DV} from '../3d-vector/dac_ta';
import {MAU_3DV} from '../3d-vector/kieu';
import {NenTramToanHoc} from './NenTramToanHoc';
import {NenKhiQuyen} from './NenKhiQuyen';
import {layTheme, suyMangNen, xungNhip} from './nen_v99';
import {SanKhauTuSinh} from '../sankhau2d/SanKhauTuSinh';
import {TangTieuDe} from './TangTieuDe';
import {TangTheGiai} from './TangTheGiai';
import {ThanhDe} from './ThanhDe';
import {boCuc4Tang, LE_ND, RONG_ND, Vung, vungAnToanT3PhuDe} from './vung';
import {BuocGiai, Khung4TangVao} from './kieu';
import {docDoiChieu} from './doi_chieu';
import {DoiChieu2Cot} from './DoiChieu';
import {giayIntro, INTRO_SAN, IntroMocCau, raIntro} from './IntroMocCau';
import {emRa, kep01} from '../3d-vector/toan3d';
import {SanKhau2D} from '../sankhau2d/SanKhau2D';
import {SanKhauKhongGian} from '../khonggian/SanKhauKhongGian';
import {KhoiCongThuc, TieuDeMotDong, VUNG_TOI_GIAN} from './ToiGianKhongGian';
import {mauBuocV981} from './mau_v981';
import {chuanThuongHieu} from '../ThuongHieu';

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
  // v96/v99.3: auto-fit cỡ chữ tới 22..42 px + tăng đệm ngang an toàn + gỡ overflow:hidden để phụ đề 1 dòng không bao giờ cụt chữ
  const co = Math.max(22, Math.min(42, Math.floor((RONG_ND - 48) / (Math.max(1, chu.length) * 0.62))));
  const a = kep01((t - cau.bat) / 0.15) * (1 - kep01((t - (cau.ket - 0.1)) / 0.12));
  return (
    <div data-vung="phu_de" style={{position: 'absolute', left: LE_ND, width: RONG_ND, top: y, height: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: a, overflow: 'visible'}}>
      <div style={{maxWidth: RONG_ND, padding: '4px 22px 6px', borderRadius: 14, background: 'rgba(8,10,14,0.82)', border: '1px solid rgba(255,255,255,0.08)',
        fontFamily: FONT, fontWeight: 800, fontSize: co, lineHeight: 1.18, color: '#FFFFFF', whiteSpace: 'nowrap', textWrap: 'nowrap' as React.CSSProperties['textWrap'], overflow: 'visible',
        textShadow: '0 2px 0 #000, 0 -1px 0 #000, 1.5px 0 0 #000, -1.5px 0 0 #000, 0 0 8px rgba(0,0,0,0.85)'}}>
        {chu.split(' ').map((w, k) => (
          <span key={k} style={{whiteSpace: 'pre', textWrap: 'nowrap' as React.CSSProperties['textWrap'], ...(TU_KHOA.test(w.replace(/[,.!?;:]/g, '')) ? {color: mau, fontWeight: 800} : {})}}>{(k ? ' ' : '') + w}</span>
        ))}
      </div>
    </div>
  );
};

// v98: mỗi tầng đặt ĐỐI XỨNG: left bc.le (130), rộng bc.rong (820) -> tâm 540; v99.3: gỡ overflow:hidden để không cụt chữ ở T1/T3/T4
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
  const G = giayIntro(p.mocCau, tong);
  const ra = raIntro(t, G);
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
  // v99.3: vùng an toàn tách rõ khu hình minh họa T2, khung công thức T3, vùng phụ đề và thanh ĐỀ T4
  const vungT3 = vungAnToanT3PhuDe(bc, gon);
  const t3: Vung = toiGian ? bc.t3 : vungT3.t3;
  const xung = xungNhip(t, p.nhipT2);
  const mangNen = suyMangNen({theme: p.theme, khongGian: p.khongGian, sanKhau: sk2, canh3dv: p.canh3dv});
  const nhanThuongHieu = chuanThuongHieu(p.thuongHieu);

  return (
    <AbsoluteFill className="k4t" style={{fontFamily: FONT, background: '#0E1014'}}>
      <KieuToan />
      {/* bù nghiêng (italic correction) của KaTeX đo theo phông KaTeX, không hợp với Be Vietnam nghiêng -> "V  =" hở thừa */}
      <style>{'div, span { text-wrap: balance; } .katex, .katex * { text-wrap: nowrap; } .k4t .katex .mathnormal:not(:has(+ .msupsub)):not(:has(+ .msupsub) *) { margin-right: 0 !important; }'}</style>
      <NapPhongToan />
      {th ? <NenKhiQuyen th={th} t={t} mocBuoc={buoc.map((b) => b.t)} tamSanKhau={bc.t2.y + bc.t2.h / 2} mauNhan={mauNhan} mang={mangNen} />
        : <NenTramToanHoc t={t} mauNhan={mauNhan} tamSanKhau={bc.t2.y + bc.t2.h / 2} kieu={toiGian ? 'v95' : 'v981'} mang={mangNen} />}
      {/* v99.3: thương hiệu góc trên phải khóa cứng 'Tư duy Xác suất' cho mọi mảng */}
      <div data-kd-bo="1" data-thuong-hieu="goc-tren-phai" style={{position: 'absolute', top: Math.max(36, bc.t1.y - 58), right: 44, fontFamily: FONT, fontWeight: 800, fontSize: 22, color: 'rgba(230,237,245,0.5)', letterSpacing: 0.4, opacity: ra}}>{nhanThuongHieu}</div>
      <div style={{opacity: ra}}>
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
      <div style={{opacity: ra}}>
        <Tang ten="t3" v={t3} rong={bc.rong} le={bc.le}>
          {toiGian ? <KhoiCongThuc buoc={buoc} i={i} t={t} mau={mauBuoc} /> : <TangTheGiai buoc={buoc} i={i} t={t} mau={mauB} caoToiDa={vungT3.caoTheToiDa} />}
        </Tang>
        {toiGian ? null : (
          <Tang ten="t4" v={bc.t4} rong={bc.rong} le={bc.le}>
            <ThanhDe ds={p.deGhim || []} buoc={buoc} i={i} t={t} cao={bc.t4.h} />
          </Tang>
        )}
      </div>
      {G > 0 && t < G && p.mocCau ? <IntroMocCau m={p.mocCau} t={t} G={G} /> : null}
      {cauNay && ra > 0.5 ? <PhuDeMotDong cau={cauNay} t={t} y={toiGian ? VUNG_TOI_GIAN.phuDe : vungT3.yPhuDe} mau={mauNhan} /> : null}
    </AbsoluteFill>
  );
};
