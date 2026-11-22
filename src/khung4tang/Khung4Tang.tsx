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
  const aDc = dc ? kep01((t - tDau) / 0.5) * (1 - kep01((t - (tCuoi - 0.45)) / 0.45)) : 0;
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
      {p.thuongHieu ? (
        <div data-kd-bo="1" style={{position: 'absolute', top: Math.max(24, bc.t1.y - 58), right: 44, fontFamily: FONT, fontWeight: 800, fontSize: 22, color: 'rgba(230,237,245,0.5)', letterSpacing: 0.4, opacity: ra}}>{p.thuongHieu}</div>
      ) : null}
      <div style={{opacity: ra}}>
        <Tang ten="t1" v={bc.t1}>
          <TangTieuDe buoc={buoc} i={i} t={t} mau={mauBuoc} />
        </Tang>
      </div>
      <Tang ten="t2" v={{y: yT2, h: bc.t2.h}}>
        {canh && aDc < 1 ? (
          <div style={{position: 'absolute', inset: 0, opacity: 1 - aDc}}>
            <SanKhau3DVector canh={canh} t={t} rong={1080} cao={bc.t2.h} tongGiay={tong} lechMay={lechMay} />
          </div>
        ) : null}
        {dc && aDc > 0 ? <DoiChieu2Cot d={dc} dt={t - tDau} dai={tCuoi - tDau} t={t} rong={1080} cao={bc.t2.h} hienSo={!!buoc[i].doi_chieu?.hien_so} a={aDc} /> : null}
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
      {cauNay ? (
        <div data-vung="phu_de" style={{position: 'absolute', left: 60, right: 60, top: t3.y + t3.h + 8, height: 44, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 30, color: 'rgba(230,237,245,0.82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
          {cauNay.text}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
