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
import {TangTieuDe} from './TangTieuDe';
import {TangTheGiai} from './TangTheGiai';
import {ThanhDe} from './ThanhDe';
import {boCuc4Tang, Vung} from './vung';
import {BuocGiai, Khung4TangVao} from './kieu';
import {docDoiChieu} from './doi_chieu';
import {DoiChieu2Cot} from './DoiChieu';
import {giayIntro, INTRO_SAN, IntroMocCau, raIntro} from './IntroMocCau';
import {emRa, kep01} from '../3d-vector/toan3d';

const mauBuoc = (b: BuocGiai) => MAU_3DV[b.mau || 'cyan'] || MAU_3DV.cyan;

// v95: PHỤ ĐỀ GỌN 1 DÒNG (mặc định bật) trong dải 52 px giữa T3 và thanh ĐỀ (trên vùng an toàn 14 % đáy, không đè thanh đáy).
// Cỡ chữ tự co để luôn 1 dòng; cụm từ khóa (số, biến, thuật ngữ tối ưu) tô màu nhấn của bước.
const TU_KHOA = /^(\d[\d.,]*|[a-zA-Z]|thể|tích|đạo|hàm|cực|đại|tiểu|lớn|nhỏ|nhất|đổi|dấu|nghiệm|cắt|gập|đáy|cạnh|chiều|cao|xăng-ti-mét|khối)$/i;
const PhuDeMotDong: React.FC<{cau: {text: string; bat: number; ket: number}; t: number; y: number; mau: string}> = ({cau, t, y, mau}) => {
  const chu = cau.text.replace(/\s+/g, ' ').trim();
  const co = Math.max(24, Math.min(34, Math.floor(960 / (Math.max(1, chu.length) * 0.5))));
  const a = kep01((t - cau.bat) / 0.15) * (1 - kep01((t - (cau.ket - 0.1)) / 0.12));
  return (
    <div data-vung="phu_de" style={{position: 'absolute', left: 40, right: 40, top: y, height: 46, display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: a}}>
      <div style={{maxWidth: 1000, padding: '4px 18px 6px', borderRadius: 14, background: 'rgba(10,12,16,0.72)', border: '1px solid rgba(255,255,255,0.07)',
        fontFamily: FONT, fontWeight: 700, fontSize: co, lineHeight: 1.2, color: 'rgba(240,244,250,0.94)', whiteSpace: 'nowrap', overflow: 'hidden'}}>
        {chu.split(' ').map((w, k) => (
          <span key={k} style={TU_KHOA.test(w.replace(/[,.!?;:]/g, '')) ? {color: mau, fontWeight: 800} : undefined}>{(k ? ' ' : '') + w}</span>
        ))}
      </div>
    </div>
  );
};

const Tang: React.FC<{ten: string; v: Vung; children: React.ReactNode}> = ({ten, v, children}) => (
  <div data-vung={ten} style={{position: 'absolute', left: 0, width: 1080, top: v.y, height: v.h, overflow: 'hidden'}}>
    {children}
  </div>
);

export const Khung4Tang: React.FC<Khung4TangVao> = (p) => {
  const f = useCurrentFrame();
  const fps = p.fps || 30;
  const t = f / fps;
  const bc = boCuc4Tang(p.boCuc?.anToanTikTok !== false);
  const buoc = useMemo(() => [...(p.buoc || [])].sort((a, b) => a.t - b.t), [p.buoc]);
  // v92: khuôn tham số trải pha theo mốc các bước giải (mỗi bước có hình đổi); tongFrame = hết phần nội dung (sát Outro)
  const canh = useMemo(() => chuanHoaCanh3DV(p.canh3dv, buoc.map((b) => b.t), p.tongFrame / fps).canh, [p.canh3dv, buoc, p.tongFrame, fps]);
  let i = -1;
  buoc.forEach((b, j) => b.t <= t && (i = j));
  if (i < 0 && buoc.length) i = 0;
  const mauNhan = i >= 0 ? mauBuoc(buoc[i]) : MAU_3DV.cyan;
  const tong = p.tongFrame / fps;
  // v93: Intro móc câu phủ G giây đầu; sân khấu 3D nằm giữa màn hình (zoom-out + xoay mở) rồi trượt về T2, các tầng khác vào sau
  const G = giayIntro(p.mocCau, tong);
  const ra = raIntro(t, G);
  const lechMay = G > 0 && t < G ? {k: 1 + 0.35 * (1 - emRa(t / 1.6)), n: 32 * (1 - emRa(t / 2.2))} : undefined;
  const yT2 = G > 0 ? bc.t2.y + (INTRO_SAN.y - bc.t2.y) * (1 - ra) : bc.t2.y;
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
  const cauNay = gon ? (p.cau || []).find((c) => t >= c.bat && t < c.ket) : undefined;
  // v92: phụ đề MẶC ĐỊNH TẮT (chỉ bật khi boCuc.phuDe === 'gon'); phụ đề gọn có dải riêng 56 px lấy từ đáy T3 (không chồng lên thẻ giải)
  const t3: Vung = gon ? {y: bc.t3.y, h: bc.t3.h - 56} : bc.t3;

  return (
    <AbsoluteFill className="k4t" style={{fontFamily: FONT, background: '#0E1014'}}>
      <KieuToan />
      {/* bù nghiêng (italic correction) của KaTeX đo theo phông KaTeX, không hợp với Be Vietnam nghiêng -> "V  =" hở thừa */}
      <style>{'div, span { text-wrap: balance; } .katex, .katex * { text-wrap: nowrap; } .k4t .katex .mathnormal:not(:has(+ .msupsub)):not(:has(+ .msupsub) *) { margin-right: 0 !important; }'}</style>
      <NapPhongToan />
      <NenTramToanHoc t={t} mauNhan={mauNhan} tamSanKhau={bc.t2.y + bc.t2.h / 2} />
      {/* v95: thẻ kính tối bo góc viền sáng mảnh gom mắt vào sân khấu (không backdrop-filter: giữ tốc độ render) */}
      <div data-kd-bo="1" style={{position: 'absolute', left: 26, right: 26, top: yT2 + 6, height: bc.t2.h - 12, borderRadius: 34, opacity: 0.35 + 0.65 * ra,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015) 40%, rgba(255,255,255,0.025))',
        border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 60px rgba(0,0,0,0.35)'}} />
      {p.thuongHieu ? (
        <div data-kd-bo="1" style={{position: 'absolute', top: Math.max(24, bc.t1.y - 58), right: 44, fontFamily: FONT, fontWeight: 800, fontSize: 22, color: 'rgba(230,237,245,0.5)', letterSpacing: 0.4, opacity: ra}}>{p.thuongHieu}</div>
      ) : null}
      <div style={{opacity: ra}}>
        <Tang ten="t1" v={bc.t1}>
          <TangTieuDe buoc={buoc} i={i} t={t} mau={mauBuoc} />
        </Tang>
      </div>
      <Tang ten="t2" v={{y: yT2, h: bc.t2.h}}>
        {canh && a3D > 0 ? (
          <div style={{position: 'absolute', inset: 0, opacity: a3D}}>
            <SanKhau3DVector canh={canh} t={t3d} rong={1080} cao={bc.t2.h} tongGiay={tong} lechMay={lechMay} />
          </div>
        ) : null}
        {dc && aDc2 > 0 ? <DoiChieu2Cot d={dc} dt={t - tDau} dai={tCuoi - tDau} t={t} rong={1080} cao={bc.t2.h} hienSo={!!buoc[i].doi_chieu?.hien_so} a={aDc2} dtGiai={dtGiai} /> : null}
      </Tang>
      <div style={{opacity: ra}}>
        <Tang ten="t3" v={t3}>
          <TangTheGiai buoc={buoc} i={i} t={t} mau={mauBuoc} />
        </Tang>
        <Tang ten="t4" v={bc.t4}>
          <ThanhDe ds={p.deGhim || []} buoc={buoc} i={i} t={t} cao={bc.t4.h} />
        </Tang>
      </div>
      {G > 0 && t < G && p.mocCau ? <IntroMocCau m={p.mocCau} t={t} G={G} /> : null}
      {cauNay && ra > 0.5 ? <PhuDeMotDong cau={cauNay} t={t} y={t3.y + t3.h + 6} mau={mauNhan} /> : null}
    </AbsoluteFill>
  );
};
